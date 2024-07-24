/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { inject, Injectable, ɵConsole as Console, ɵPendingTasks as PendingTasks, ɵRuntimeError as RuntimeError, } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { createSegmentGroupFromRoute, createUrlTreeFromSegmentGroup } from './create_url_tree';
import { INPUT_BINDER } from './directives/router_outlet';
import { BeforeActivateRoutes, IMPERATIVE_NAVIGATION, NavigationCancel, NavigationCancellationCode, NavigationEnd, RedirectRequest, } from './events';
import { isBrowserTriggeredNavigation, NavigationTransitions, } from './navigation_transition';
import { RouteReuseStrategy } from './route_reuse_strategy';
import { ROUTER_CONFIGURATION } from './router_config';
import { ROUTES } from './router_config_loader';
import { StateManager } from './statemanager/state_manager';
import { UrlHandlingStrategy } from './url_handling_strategy';
import { containsTree, isUrlTree, UrlSerializer, } from './url_tree';
import { validateConfig } from './utils/config';
import { afterNextNavigation } from './utils/navigations';
import { standardizeConfig } from './components/empty_outlet';
import * as i0 from "@angular/core";
function defaultErrorHandler(error) {
    throw error;
}
/**
 * The equivalent `IsActiveMatchOptions` options for `Router.isActive` is called with `true`
 * (exact = true).
 */
export const exactMatchOptions = {
    paths: 'exact',
    fragment: 'ignored',
    matrixParams: 'ignored',
    queryParams: 'exact',
};
/**
 * The equivalent `IsActiveMatchOptions` options for `Router.isActive` is called with `false`
 * (exact = false).
 */
export const subsetMatchOptions = {
    paths: 'subset',
    fragment: 'ignored',
    matrixParams: 'ignored',
    queryParams: 'subset',
};
/**
 * @description
 *
 * A service that facilitates navigation among views and URL manipulation capabilities.
 * This service is provided in the root scope and configured with [provideRouter](api/router/provideRouter).
 *
 * @see {@link Route}
 * @see {@link provideRouter}
 * @see [Routing and Navigation Guide](guide/routing/common-router-tasks).
 *
 * @ngModule RouterModule
 *
 * @publicApi
 */
export class Router {
    get currentUrlTree() {
        return this.stateManager.getCurrentUrlTree();
    }
    get rawUrlTree() {
        return this.stateManager.getRawUrlTree();
    }
    /**
     * An event stream for routing events.
     */
    get events() {
        // TODO(atscott): This _should_ be events.asObservable(). However, this change requires internal
        // cleanup: tests are doing `(route.events as Subject<Event>).next(...)`. This isn't
        // allowed/supported but we still have to fix these or file bugs against the teams before making
        // the change.
        return this._events;
    }
    /**
     * The current state of routing in this NgModule.
     */
    get routerState() {
        return this.stateManager.getRouterState();
    }
    constructor() {
        this.disposed = false;
        this.console = inject(Console);
        this.stateManager = inject(StateManager);
        this.options = inject(ROUTER_CONFIGURATION, { optional: true }) || {};
        this.pendingTasks = inject(PendingTasks);
        this.urlUpdateStrategy = this.options.urlUpdateStrategy || 'deferred';
        this.navigationTransitions = inject(NavigationTransitions);
        this.urlSerializer = inject(UrlSerializer);
        this.location = inject(Location);
        this.urlHandlingStrategy = inject(UrlHandlingStrategy);
        /**
         * The private `Subject` type for the public events exposed in the getter. This is used internally
         * to push events to. The separate field allows us to expose separate types in the public API
         * (i.e., an Observable rather than the Subject).
         */
        this._events = new Subject();
        /**
         * A handler for navigation errors in this NgModule.
         *
         * @deprecated Subscribe to the `Router` events and watch for `NavigationError` instead.
         *   `provideRouter` has the `withNavigationErrorHandler` feature to make this easier.
         * @see {@link withNavigationErrorHandler}
         */
        this.errorHandler = this.options.errorHandler || defaultErrorHandler;
        /**
         * True if at least one navigation event has occurred,
         * false otherwise.
         */
        this.navigated = false;
        /**
         * A strategy for re-using routes.
         *
         * @deprecated Configure using `providers` instead:
         *   `{provide: RouteReuseStrategy, useClass: MyStrategy}`.
         */
        this.routeReuseStrategy = inject(RouteReuseStrategy);
        /**
         * How to handle a navigation request to the current URL.
         *
         *
         * @deprecated Configure this through `provideRouter` or `RouterModule.forRoot` instead.
         * @see {@link withRouterConfig}
         * @see {@link provideRouter}
         * @see {@link RouterModule}
         */
        this.onSameUrlNavigation = this.options.onSameUrlNavigation || 'ignore';
        this.config = inject(ROUTES, { optional: true })?.flat() ?? [];
        /**
         * Indicates whether the application has opted in to binding Router data to component inputs.
         *
         * This option is enabled by the `withComponentInputBinding` feature of `provideRouter` or
         * `bindToComponentInputs` in the `ExtraOptions` of `RouterModule.forRoot`.
         */
        this.componentInputBindingEnabled = !!inject(INPUT_BINDER, { optional: true });
        this.eventsSubscription = new Subscription();
        this.resetConfig(this.config);
        this.navigationTransitions
            .setupNavigations(this, this.currentUrlTree, this.routerState)
            .subscribe({
            error: (e) => {
                this.console.warn(ngDevMode ? `Unhandled Navigation Error: ${e}` : e);
            },
        });
        this.subscribeToNavigationEvents();
    }
    subscribeToNavigationEvents() {
        const subscription = this.navigationTransitions.events.subscribe((e) => {
            try {
                const currentTransition = this.navigationTransitions.currentTransition;
                const currentNavigation = this.navigationTransitions.currentNavigation;
                if (currentTransition !== null && currentNavigation !== null) {
                    this.stateManager.handleRouterEvent(e, currentNavigation);
                    if (e instanceof NavigationCancel &&
                        e.code !== NavigationCancellationCode.Redirect &&
                        e.code !== NavigationCancellationCode.SupersededByNewNavigation) {
                        // It seems weird that `navigated` is set to `true` when the navigation is rejected,
                        // however it's how things were written initially. Investigation would need to be done
                        // to determine if this can be removed.
                        this.navigated = true;
                    }
                    else if (e instanceof NavigationEnd) {
                        this.navigated = true;
                    }
                    else if (e instanceof RedirectRequest) {
                        const opts = e.navigationBehaviorOptions;
                        const mergedTree = this.urlHandlingStrategy.merge(e.url, currentTransition.currentRawUrl);
                        const extras = {
                            browserUrl: currentTransition.extras.browserUrl,
                            info: currentTransition.extras.info,
                            skipLocationChange: currentTransition.extras.skipLocationChange,
                            // The URL is already updated at this point if we have 'eager' URL
                            // updates or if the navigation was triggered by the browser (back
                            // button, URL bar, etc). We want to replace that item in history
                            // if the navigation is rejected.
                            replaceUrl: currentTransition.extras.replaceUrl ||
                                this.urlUpdateStrategy === 'eager' ||
                                isBrowserTriggeredNavigation(currentTransition.source),
                            // allow developer to override default options with RedirectCommand
                            ...opts,
                        };
                        this.scheduleNavigation(mergedTree, IMPERATIVE_NAVIGATION, null, extras, {
                            resolve: currentTransition.resolve,
                            reject: currentTransition.reject,
                            promise: currentTransition.promise,
                        });
                    }
                }
                // Note that it's important to have the Router process the events _before_ the event is
                // pushed through the public observable. This ensures the correct router state is in place
                // before applications observe the events.
                if (isPublicRouterEvent(e)) {
                    this._events.next(e);
                }
            }
            catch (e) {
                this.navigationTransitions.transitionAbortSubject.next(e);
            }
        });
        this.eventsSubscription.add(subscription);
    }
    /** @internal */
    resetRootComponentType(rootComponentType) {
        // TODO: vsavkin router 4.0 should make the root component set to null
        // this will simplify the lifecycle of the router.
        this.routerState.root.component = rootComponentType;
        this.navigationTransitions.rootComponentType = rootComponentType;
    }
    /**
     * Sets up the location change listener and performs the initial navigation.
     */
    initialNavigation() {
        this.setUpLocationChangeListener();
        if (!this.navigationTransitions.hasRequestedNavigation) {
            this.navigateToSyncWithBrowser(this.location.path(true), IMPERATIVE_NAVIGATION, this.stateManager.restoredState());
        }
    }
    /**
     * Sets up the location change listener. This listener detects navigations triggered from outside
     * the Router (the browser back/forward buttons, for example) and schedules a corresponding Router
     * navigation so that the correct events, guards, etc. are triggered.
     */
    setUpLocationChangeListener() {
        // Don't need to use Zone.wrap any more, because zone.js
        // already patch onPopState, so location change callback will
        // run into ngZone
        this.nonRouterCurrentEntryChangeSubscription ??=
            this.stateManager.registerNonRouterCurrentEntryChangeListener((url, state) => {
                // The `setTimeout` was added in #12160 and is likely to support Angular/AngularJS
                // hybrid apps.
                setTimeout(() => {
                    this.navigateToSyncWithBrowser(url, 'popstate', state);
                }, 0);
            });
    }
    /**
     * Schedules a router navigation to synchronize Router state with the browser state.
     *
     * This is done as a response to a popstate event and the initial navigation. These
     * two scenarios represent times when the browser URL/state has been updated and
     * the Router needs to respond to ensure its internal state matches.
     */
    navigateToSyncWithBrowser(url, source, state) {
        const extras = { replaceUrl: true };
        // TODO: restoredState should always include the entire state, regardless
        // of navigationId. This requires a breaking change to update the type on
        // NavigationStart’s restoredState, which currently requires navigationId
        // to always be present. The Router used to only restore history state if
        // a navigationId was present.
        // The stored navigationId is used by the RouterScroller to retrieve the scroll
        // position for the page.
        const restoredState = state?.navigationId ? state : null;
        // Separate to NavigationStart.restoredState, we must also restore the state to
        // history.state and generate a new navigationId, since it will be overwritten
        if (state) {
            const stateCopy = { ...state };
            delete stateCopy.navigationId;
            delete stateCopy.ɵrouterPageId;
            if (Object.keys(stateCopy).length !== 0) {
                extras.state = stateCopy;
            }
        }
        const urlTree = this.parseUrl(url);
        this.scheduleNavigation(urlTree, source, restoredState, extras);
    }
    /** The current URL. */
    get url() {
        return this.serializeUrl(this.currentUrlTree);
    }
    /**
     * Returns the current `Navigation` object when the router is navigating,
     * and `null` when idle.
     */
    getCurrentNavigation() {
        return this.navigationTransitions.currentNavigation;
    }
    /**
     * The `Navigation` object of the most recent navigation to succeed and `null` if there
     *     has not been a successful navigation yet.
     */
    get lastSuccessfulNavigation() {
        return this.navigationTransitions.lastSuccessfulNavigation;
    }
    /**
     * Resets the route configuration used for navigation and generating links.
     *
     * @param config The route array for the new configuration.
     *
     * @usageNotes
     *
     * ```
     * router.resetConfig([
     *  { path: 'team/:id', component: TeamCmp, children: [
     *    { path: 'simple', component: SimpleCmp },
     *    { path: 'user/:name', component: UserCmp }
     *  ]}
     * ]);
     * ```
     */
    resetConfig(config) {
        (typeof ngDevMode === 'undefined' || ngDevMode) && validateConfig(config);
        this.config = config.map(standardizeConfig);
        this.navigated = false;
    }
    /** @nodoc */
    ngOnDestroy() {
        this.dispose();
    }
    /** Disposes of the router. */
    dispose() {
        this.navigationTransitions.complete();
        if (this.nonRouterCurrentEntryChangeSubscription) {
            this.nonRouterCurrentEntryChangeSubscription.unsubscribe();
            this.nonRouterCurrentEntryChangeSubscription = undefined;
        }
        this.disposed = true;
        this.eventsSubscription.unsubscribe();
    }
    /**
     * Appends URL segments to the current URL tree to create a new URL tree.
     *
     * @param commands An array of URL fragments with which to construct the new URL tree.
     * If the path is static, can be the literal URL string. For a dynamic path, pass an array of path
     * segments, followed by the parameters for each segment.
     * The fragments are applied to the current URL tree or the one provided  in the `relativeTo`
     * property of the options object, if supplied.
     * @param navigationExtras Options that control the navigation strategy.
     * @returns The new URL tree.
     *
     * @usageNotes
     *
     * ```
     * // create /team/33/user/11
     * router.createUrlTree(['/team', 33, 'user', 11]);
     *
     * // create /team/33;expand=true/user/11
     * router.createUrlTree(['/team', 33, {expand: true}, 'user', 11]);
     *
     * // you can collapse static segments like this (this works only with the first passed-in value):
     * router.createUrlTree(['/team/33/user', userId]);
     *
     * // If the first segment can contain slashes, and you do not want the router to split it,
     * // you can do the following:
     * router.createUrlTree([{segmentPath: '/one/two'}]);
     *
     * // create /team/33/(user/11//right:chat)
     * router.createUrlTree(['/team', 33, {outlets: {primary: 'user/11', right: 'chat'}}]);
     *
     * // remove the right secondary node
     * router.createUrlTree(['/team', 33, {outlets: {primary: 'user/11', right: null}}]);
     *
     * // assuming the current url is `/team/33/user/11` and the route points to `user/11`
     *
     * // navigate to /team/33/user/11/details
     * router.createUrlTree(['details'], {relativeTo: route});
     *
     * // navigate to /team/33/user/22
     * router.createUrlTree(['../22'], {relativeTo: route});
     *
     * // navigate to /team/44/user/22
     * router.createUrlTree(['../../team/44/user/22'], {relativeTo: route});
     *
     * Note that a value of `null` or `undefined` for `relativeTo` indicates that the
     * tree should be created relative to the root.
     * ```
     */
    createUrlTree(commands, navigationExtras = {}) {
        const { relativeTo, queryParams, fragment, queryParamsHandling, preserveFragment } = navigationExtras;
        const f = preserveFragment ? this.currentUrlTree.fragment : fragment;
        let q = null;
        switch (queryParamsHandling) {
            case 'merge':
                q = { ...this.currentUrlTree.queryParams, ...queryParams };
                break;
            case 'preserve':
                q = this.currentUrlTree.queryParams;
                break;
            default:
                q = queryParams || null;
        }
        if (q !== null) {
            q = this.removeEmptyProps(q);
        }
        let relativeToUrlSegmentGroup;
        try {
            const relativeToSnapshot = relativeTo ? relativeTo.snapshot : this.routerState.snapshot.root;
            relativeToUrlSegmentGroup = createSegmentGroupFromRoute(relativeToSnapshot);
        }
        catch (e) {
            // This is strictly for backwards compatibility with tests that create
            // invalid `ActivatedRoute` mocks.
            // Note: the difference between having this fallback for invalid `ActivatedRoute` setups and
            // just throwing is ~500 test failures. Fixing all of those tests by hand is not feasible at
            // the moment.
            if (typeof commands[0] !== 'string' || commands[0][0] !== '/') {
                // Navigations that were absolute in the old way of creating UrlTrees
                // would still work because they wouldn't attempt to match the
                // segments in the `ActivatedRoute` to the `currentUrlTree` but
                // instead just replace the root segment with the navigation result.
                // Non-absolute navigations would fail to apply the commands because
                // the logic could not find the segment to replace (so they'd act like there were no
                // commands).
                commands = [];
            }
            relativeToUrlSegmentGroup = this.currentUrlTree.root;
        }
        return createUrlTreeFromSegmentGroup(relativeToUrlSegmentGroup, commands, q, f ?? null);
    }
    /**
     * Navigates to a view using an absolute route path.
     *
     * @param url An absolute path for a defined route. The function does not apply any delta to the
     *     current URL.
     * @param extras An object containing properties that modify the navigation strategy.
     *
     * @returns A Promise that resolves to 'true' when navigation succeeds,
     * to 'false' when navigation fails, or is rejected on error.
     *
     * @usageNotes
     *
     * The following calls request navigation to an absolute path.
     *
     * ```
     * router.navigateByUrl("/team/33/user/11");
     *
     * // Navigate without updating the URL
     * router.navigateByUrl("/team/33/user/11", { skipLocationChange: true });
     * ```
     *
     * @see [Routing and Navigation guide](guide/routing/common-router-tasks)
     *
     */
    navigateByUrl(url, extras = {
        skipLocationChange: false,
    }) {
        const urlTree = isUrlTree(url) ? url : this.parseUrl(url);
        const mergedTree = this.urlHandlingStrategy.merge(urlTree, this.rawUrlTree);
        return this.scheduleNavigation(mergedTree, IMPERATIVE_NAVIGATION, null, extras);
    }
    /**
     * Navigate based on the provided array of commands and a starting point.
     * If no starting route is provided, the navigation is absolute.
     *
     * @param commands An array of URL fragments with which to construct the target URL.
     * If the path is static, can be the literal URL string. For a dynamic path, pass an array of path
     * segments, followed by the parameters for each segment.
     * The fragments are applied to the current URL or the one provided  in the `relativeTo` property
     * of the options object, if supplied.
     * @param extras An options object that determines how the URL should be constructed or
     *     interpreted.
     *
     * @returns A Promise that resolves to `true` when navigation succeeds, or `false` when navigation
     *     fails. The Promise is rejected when an error occurs if `resolveNavigationPromiseOnError` is
     * not `true`.
     *
     * @usageNotes
     *
     * The following calls request navigation to a dynamic route path relative to the current URL.
     *
     * ```
     * router.navigate(['team', 33, 'user', 11], {relativeTo: route});
     *
     * // Navigate without updating the URL, overriding the default behavior
     * router.navigate(['team', 33, 'user', 11], {relativeTo: route, skipLocationChange: true});
     * ```
     *
     * @see [Routing and Navigation guide](guide/routing/common-router-tasks)
     *
     */
    navigate(commands, extras = { skipLocationChange: false }) {
        validateCommands(commands);
        return this.navigateByUrl(this.createUrlTree(commands, extras), extras);
    }
    /** Serializes a `UrlTree` into a string */
    serializeUrl(url) {
        return this.urlSerializer.serialize(url);
    }
    /** Parses a string into a `UrlTree` */
    parseUrl(url) {
        try {
            return this.urlSerializer.parse(url);
        }
        catch {
            return this.urlSerializer.parse('/');
        }
    }
    isActive(url, matchOptions) {
        let options;
        if (matchOptions === true) {
            options = { ...exactMatchOptions };
        }
        else if (matchOptions === false) {
            options = { ...subsetMatchOptions };
        }
        else {
            options = matchOptions;
        }
        if (isUrlTree(url)) {
            return containsTree(this.currentUrlTree, url, options);
        }
        const urlTree = this.parseUrl(url);
        return containsTree(this.currentUrlTree, urlTree, options);
    }
    removeEmptyProps(params) {
        return Object.entries(params).reduce((result, [key, value]) => {
            if (value !== null && value !== undefined) {
                result[key] = value;
            }
            return result;
        }, {});
    }
    scheduleNavigation(rawUrl, source, restoredState, extras, priorPromise) {
        if (this.disposed) {
            return Promise.resolve(false);
        }
        let resolve;
        let reject;
        let promise;
        if (priorPromise) {
            resolve = priorPromise.resolve;
            reject = priorPromise.reject;
            promise = priorPromise.promise;
        }
        else {
            promise = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });
        }
        // Indicate that the navigation is happening.
        const taskId = this.pendingTasks.add();
        afterNextNavigation(this, () => {
            // Remove pending task in a microtask to allow for cancelled
            // initial navigations and redirects within the same task.
            queueMicrotask(() => this.pendingTasks.remove(taskId));
        });
        this.navigationTransitions.handleNavigationRequest({
            source,
            restoredState,
            currentUrlTree: this.currentUrlTree,
            currentRawUrl: this.currentUrlTree,
            rawUrl,
            extras,
            resolve: resolve,
            reject: reject,
            promise,
            currentSnapshot: this.routerState.snapshot,
            currentRouterState: this.routerState,
        });
        // Make sure that the error is propagated even though `processNavigations` catch
        // handler does not rethrow
        return promise.catch((e) => {
            return Promise.reject(e);
        });
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.0-next.1+sha-c2779eb", ngImport: i0, type: Router, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.2.0-next.1+sha-c2779eb", ngImport: i0, type: Router, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.0-next.1+sha-c2779eb", ngImport: i0, type: Router, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: () => [] });
function validateCommands(commands) {
    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        if (cmd == null) {
            throw new RuntimeError(4008 /* RuntimeErrorCode.NULLISH_COMMAND */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
                `The requested path contains ${cmd} segment at index ${i}`);
        }
    }
}
function isPublicRouterEvent(e) {
    return !(e instanceof BeforeActivateRoutes) && !(e instanceof RedirectRequest);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFDTCxNQUFNLEVBQ04sVUFBVSxFQUVWLFFBQVEsSUFBSSxPQUFPLEVBQ25CLGFBQWEsSUFBSSxZQUFZLEVBQzdCLGFBQWEsSUFBSSxZQUFZLEdBQzlCLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBYSxPQUFPLEVBQUUsWUFBWSxFQUFtQixNQUFNLE1BQU0sQ0FBQztBQUV6RSxPQUFPLEVBQUMsMkJBQTJCLEVBQUUsNkJBQTZCLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUM3RixPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFFeEQsT0FBTyxFQUNMLG9CQUFvQixFQUVwQixxQkFBcUIsRUFDckIsZ0JBQWdCLEVBQ2hCLDBCQUEwQixFQUMxQixhQUFhLEVBR2IsZUFBZSxHQUNoQixNQUFNLFVBQVUsQ0FBQztBQUVsQixPQUFPLEVBQ0wsNEJBQTRCLEVBRzVCLHFCQUFxQixHQUd0QixNQUFNLHlCQUF5QixDQUFDO0FBQ2pDLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBQzFELE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3JELE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUU5QyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sOEJBQThCLENBQUM7QUFDMUQsT0FBTyxFQUFDLG1CQUFtQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDNUQsT0FBTyxFQUNMLFlBQVksRUFFWixTQUFTLEVBRVQsYUFBYSxHQUVkLE1BQU0sWUFBWSxDQUFD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RUFBRSxFQUFFLENBQUM7UUFDekMsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxZQUFZLDhDQUVwQixDQUFDLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTLENBQUM7Z0JBQzdDLCtCQUErQixHQUFHLHFCQUFxQixDQUFDLEVBQUUsQ0FDN0QsQ0FBQztRQUNKLENBQUM7SUFDSCxDQUFDO0FBQ0gsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsQ0FBOEI7SUFDekQsT0FBTyxDQUFDLENBQUMsQ0FBQyxZQUFZLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxlQUFlLENBQUMsQ0FBQztBQUNqRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge1xuICBpbmplY3QsXG4gIEluamVjdGFibGUsXG4gIFR5cGUsXG4gIMm1Q29uc29sZSBhcyBDb25zb2xlLFxuICDJtVBlbmRpbmdUYXNrcyBhcyBQZW5kaW5nVGFza3MsXG4gIMm1UnVudGltZUVycm9yIGFzIFJ1bnRpbWVFcnJvcixcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge09ic2VydmFibGUsIFN1YmplY3QsIFN1YnNjcmlwdGlvbiwgU3Vic2NyaXB0aW9uTGlrZX0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7Y3JlYXRlU2VnbWVudEdyb3VwRnJvbVJvdXRlLCBjcmVhdGVVcmxUcmVlRnJvbVNlZ21lbnRHcm91cH0gZnJvbSAnLi9jcmVhdGVfdXJsX3RyZWUnO1xuaW1wb3J0IHtJTlBVVF9CSU5ERVJ9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0JztcbmltcG9ydCB7UnVudGltZUVycm9yQ29kZX0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IHtcbiAgQmVmb3JlQWN0aXZhdGVSb3V0ZXMsXG4gIEV2ZW50LFxuICBJTVBFUkFUSVZFX05BVklHQVRJT04sXG4gIE5hdmlnYXRpb25DYW5jZWwsXG4gIE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLFxuICBOYXZpZ2F0aW9uRW5kLFxuICBOYXZpZ2F0aW9uVHJpZ2dlcixcbiAgUHJpdmF0ZVJvdXRlckV2ZW50cyxcbiAgUmVkaXJlY3RSZXF1ZXN0LFxufSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge05hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMsIE9uU2FtZVVybE5hdmlnYXRpb24sIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtcbiAgaXNCcm93c2VyVHJpZ2dlcmVkTmF2aWdhdGlvbixcbiAgTmF2aWdhdGlvbixcbiAgTmF2aWdhdGlvbkV4dHJhcyxcbiAgTmF2aWdhdGlvblRyYW5zaXRpb25zLFxuICBSZXN0b3JlZFN0YXRlLFxuICBVcmxDcmVhdGlvbk9wdGlvbnMsXG59IGZyb20gJy4vbmF2aWdhdGlvbl90cmFuc2l0aW9uJztcbmltcG9ydCB7Um91dGVSZXVzZVN0cmF0ZWd5fSBmcm9tICcuL3JvdXRlX3JldXNlX3N0cmF0ZWd5JztcbmltcG9ydCB7Uk9VVEVSX0NPTkZJR1VSQVRJT059IGZyb20gJy4vcm91dGVyX2NvbmZpZyc7XG5pbXBvcnQge1JPVVRFU30gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge1BhcmFtc30gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtTdGF0ZU1hbmFnZXJ9IGZyb20gJy4vc3RhdGVtYW5hZ2VyL3N0YXRlX21hbmFnZXInO1xuaW1wb3J0IHtVcmxIYW5kbGluZ1N0cmF0ZWd5fSBmcm9tICcuL3VybF9oYW5kbGluZ19zdHJhdGVneSc7XG5pbXBvcnQge1xuICBjb250YWluc1RyZWUsXG4gIElzQWN0aXZlTWF0Y2hPcHRpb25zLFxuICBpc1VybFRyZWUsXG4gIFVybFNlZ21lbnRHcm91cCxcbiAgVXJsU2VyaWFsaXplcixcbiAgVXJsVHJlZSxcbn0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge3ZhbGlkYXRlQ29uZmlnfSBmcm9tICcuL3V0aWxzL2NvbmZpZyc7XG5pbXBvcnQge2FmdGVyTmV4dE5hdmlnYXRpb259IGZyb20gJy4vdXRpbHMvbmF2aWdhdGlvbnMnO1xuaW1wb3J0IHtzdGFuZGFyZGl6ZUNvbmZpZ30gZnJvbSAnLi9jb21wb25lbnRzL2VtcHR5X291dGxldCc7XG5cbmZ1bmN0aW9uIGRlZmF1bHRFcnJvckhhbmRsZXIoZXJyb3I6IGFueSk6IG5ldmVyIHtcbiAgdGhyb3cgZXJyb3I7XG59XG5cbi8qKlxuICogVGhlIGVxdWl2YWxlbnQgYElzQWN0aXZlTWF0Y2hPcHRpb25zYCBvcHRpb25zIGZvciBgUm91dGVyLmlzQWN0aXZlYCBpcyBjYWxsZWQgd2l0aCBgdHJ1ZWBcbiAqIChleGFjdCA9IHRydWUpLlxuICovXG5leHBvcnQgY29uc3QgZXhhY3RNYXRjaE9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zID0ge1xuICBwYXRoczogJ2V4YWN0JyxcbiAgZnJhZ21lbnQ6ICdpZ25vcmVkJyxcbiAgbWF0cml4UGFyYW1zOiAnaWdub3JlZCcsXG4gIHF1ZXJ5UGFyYW1zOiAnZXhhY3QnLFxufTtcblxuLyoqXG4gKiBUaGUgZXF1aXZhbGVudCBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIG9wdGlvbnMgZm9yIGBSb3V0ZXIuaXNBY3RpdmVgIGlzIGNhbGxlZCB3aXRoIGBmYWxzZWBcbiAqIChleGFjdCA9IGZhbHNlKS5cbiAqL1xuZXhwb3J0IGNvbnN0IHN1YnNldE1hdGNoT3B0aW9uczogSXNBY3RpdmVNYXRjaE9wdGlvbnMgPSB7XG4gIHBhdGhzOiAnc3Vic2V0JyxcbiAgZnJhZ21lbnQ6ICdpZ25vcmVkJyxcbiAgbWF0cml4UGFyYW1zOiAnaWdub3JlZCcsXG4gIHF1ZXJ5UGFyYW1zOiAnc3Vic2V0Jyxcbn07XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQSBzZXJ2aWNlIHRoYXQgZmFjaWxpdGF0ZXMgbmF2aWdhdGlvbiBhbW9uZyB2aWV3cyBhbmQgVVJMIG1hbmlwdWxhdGlvbiBjYXBhYmlsaXRpZXMuXG4gKiBUaGlzIHNlcnZpY2UgaXMgcHJvdmlkZWQgaW4gdGhlIHJvb3Qgc2NvcGUgYW5kIGNvbmZpZ3VyZWQgd2l0aCBbcHJvdmlkZVJvdXRlcl0oYXBpL3JvdXRlci9wcm92aWRlUm91dGVyKS5cbiAqXG4gKiBAc2VlIHtAbGluayBSb3V0ZX1cbiAqIEBzZWUge0BsaW5rIHByb3ZpZGVSb3V0ZXJ9XG4gKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIEd1aWRlXShndWlkZS9yb3V0aW5nL2NvbW1vbi1yb3V0ZXItdGFza3MpLlxuICpcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCd9KVxuZXhwb3J0IGNsYXNzIFJvdXRlciB7XG4gIHByaXZhdGUgZ2V0IGN1cnJlbnRVcmxUcmVlKCkge1xuICAgIHJldHVybiB0aGlzLnN0YXRlTWFuYWdlci5nZXRDdXJyZW50VXJsVHJlZSgpO1xuICB9XG4gIHByaXZhdGUgZ2V0IHJhd1VybFRyZWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVNYW5hZ2VyLmdldFJhd1VybFRyZWUoKTtcbiAgfVxuICBwcml2YXRlIGRpc3Bvc2VkID0gZmFsc2U7XG4gIHByaXZhdGUgbm9uUm91dGVyQ3VycmVudEVudHJ5Q2hhbmdlU3Vic2NyaXB0aW9uPzogU3Vic2NyaXB0aW9uTGlrZTtcblxuICBwcml2YXRlIHJlYWRvbmx5IGNvbnNvbGUgPSBpbmplY3QoQ29uc29sZSk7XG4gIHByaXZhdGUgcmVhZG9ubHkgc3RhdGVNYW5hZ2VyID0gaW5qZWN0KFN0YXRlTWFuYWdlcik7XG4gIHByaXZhdGUgcmVhZG9ubHkgb3B0aW9ucyA9IGluamVjdChST1VURVJfQ09ORklHVVJBVElPTiwge29wdGlvbmFsOiB0cnVlfSkgfHwge307XG4gIHByaXZhdGUgcmVhZG9ubHkgcGVuZGluZ1Rhc2tzID0gaW5qZWN0KFBlbmRpbmdUYXNrcyk7XG4gIHByaXZhdGUgcmVhZG9ubHkgdXJsVXBkYXRlU3RyYXRlZ3kgPSB0aGlzLm9wdGlvbnMudXJsVXBkYXRlU3RyYXRlZ3kgfHwgJ2RlZmVycmVkJztcbiAgcHJpdmF0ZSByZWFkb25seSBuYXZpZ2F0aW9uVHJhbnNpdGlvbnMgPSBpbmplY3QoTmF2aWdhdGlvblRyYW5zaXRpb25zKTtcbiAgcHJpdmF0ZSByZWFkb25seSB1cmxTZXJpYWxpemVyID0gaW5qZWN0KFVybFNlcmlhbGl6ZXIpO1xuICBwcml2YXRlIHJlYWRvbmx5IGxvY2F0aW9uID0gaW5qZWN0KExvY2F0aW9uKTtcbiAgcHJpdmF0ZSByZWFkb25seSB1cmxIYW5kbGluZ1N0cmF0ZWd5ID0gaW5qZWN0KFVybEhhbmRsaW5nU3RyYXRlZ3kpO1xuXG4gIC8qKlxuICAgKiBUaGUgcHJpdmF0ZSBgU3ViamVjdGAgdHlwZSBmb3IgdGhlIHB1YmxpYyBldmVudHMgZXhwb3NlZCBpbiB0aGUgZ2V0dGVyLiBUaGlzIGlzIHVzZWQgaW50ZXJuYWxseVxuICAgKiB0byBwdXNoIGV2ZW50cyB0by4gVGhlIHNlcGFyYXRlIGZpZWxkIGFsbG93cyB1cyB0byBleHBvc2Ugc2VwYXJhdGUgdHlwZXMgaW4gdGhlIHB1YmxpYyBBUElcbiAgICogKGkuZS4sIGFuIE9ic2VydmFibGUgcmF0aGVyIHRoYW4gdGhlIFN1YmplY3QpLlxuICAgKi9cbiAgcHJpdmF0ZSBfZXZlbnRzID0gbmV3IFN1YmplY3Q8RXZlbnQ+KCk7XG4gIC8qKlxuICAgKiBBbiBldmVudCBzdHJlYW0gZm9yIHJvdXRpbmcgZXZlbnRzLlxuICAgKi9cbiAgcHVibGljIGdldCBldmVudHMoKTogT2JzZXJ2YWJsZTxFdmVudD4ge1xuICAgIC8vIFRPRE8oYXRzY290dCk6IFRoaXMgX3Nob3VsZF8gYmUgZXZlbnRzLmFzT2JzZXJ2YWJsZSgpLiBIb3dldmVyLCB0aGlzIGNoYW5nZSByZXF1aXJlcyBpbnRlcm5hbFxuICAgIC8vIGNsZWFudXA6IHRlc3RzIGFyZSBkb2luZyBgKHJvdXRlLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PikubmV4dCguLi4pYC4gVGhpcyBpc24ndFxuICAgIC8vIGFsbG93ZWQvc3VwcG9ydGVkIGJ1dCB3ZSBzdGlsbCBoYXZlIHRvIGZpeCB0aGVzZSBvciBmaWxlIGJ1Z3MgYWdhaW5zdCB0aGUgdGVhbXMgYmVmb3JlIG1ha2luZ1xuICAgIC8vIHRoZSBjaGFuZ2UuXG4gICAgcmV0dXJuIHRoaXMuX2V2ZW50cztcbiAgfVxuICAvKipcbiAgICogVGhlIGN1cnJlbnQgc3RhdGUgb2Ygcm91dGluZyBpbiB0aGlzIE5nTW9kdWxlLlxuICAgKi9cbiAgZ2V0IHJvdXRlclN0YXRlKCkge1xuICAgIHJldHVybiB0aGlzLnN0YXRlTWFuYWdlci5nZXRSb3V0ZXJTdGF0ZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgaGFuZGxlciBmb3IgbmF2aWdhdGlvbiBlcnJvcnMgaW4gdGhpcyBOZ01vZHVsZS5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgU3Vic2NyaWJlIHRvIHRoZSBgUm91dGVyYCBldmVudHMgYW5kIHdhdGNoIGZvciBgTmF2aWdhdGlvbkVycm9yYCBpbnN0ZWFkLlxuICAgKiAgIGBwcm92aWRlUm91dGVyYCBoYXMgdGhlIGB3aXRoTmF2aWdhdGlvbkVycm9ySGFuZGxlcmAgZmVhdHVyZSB0byBtYWtlIHRoaXMgZWFzaWVyLlxuICAgKiBAc2VlIHtAbGluayB3aXRoTmF2aWdhdGlvbkVycm9ySGFuZGxlcn1cbiAgICovXG4gIGVycm9ySGFuZGxlcjogKGVycm9yOiBhbnkpID0+IGFueSA9IHRoaXMub3B0aW9ucy5lcnJvckhhbmRsZXIgfHwgZGVmYXVsdEVycm9ySGFuZGxlcjtcblxuICAvKipcbiAgICogVHJ1ZSBpZiBhdCBsZWFzdCBvbmUgbmF2aWdhdGlvbiBldmVudCBoYXMgb2NjdXJyZWQsXG4gICAqIGZhbHNlIG90aGVyd2lzZS5cbiAgICovXG4gIG5hdmlnYXRlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBBIHN0cmF0ZWd5IGZvciByZS11c2luZyByb3V0ZXMuXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIENvbmZpZ3VyZSB1c2luZyBgcHJvdmlkZXJzYCBpbnN0ZWFkOlxuICAgKiAgIGB7cHJvdmlkZTogUm91dGVSZXVzZVN0cmF0ZWd5LCB1c2VDbGFzczogTXlTdHJhdGVneX1gLlxuICAgKi9cbiAgcm91dGVSZXVzZVN0cmF0ZWd5OiBSb3V0ZVJldXNlU3RyYXRlZ3kgPSBpbmplY3QoUm91dGVSZXVzZVN0cmF0ZWd5KTtcblxuICAvKipcbiAgICogSG93IHRvIGhhbmRsZSBhIG5hdmlnYXRpb24gcmVxdWVzdCB0byB0aGUgY3VycmVudCBVUkwuXG4gICAqXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIENvbmZpZ3VyZSB0aGlzIHRocm91Z2ggYHByb3ZpZGVSb3V0ZXJgIG9yIGBSb3V0ZXJNb2R1bGUuZm9yUm9vdGAgaW5zdGVhZC5cbiAgICogQHNlZSB7QGxpbmsgd2l0aFJvdXRlckNvbmZpZ31cbiAgICogQHNlZSB7QGxpbmsgcHJvdmlkZVJvdXRlcn1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyTW9kdWxlfVxuICAgKi9cbiAgb25TYW1lVXJsTmF2aWdhdGlvbjogT25TYW1lVXJsTmF2aWdhdGlvbiA9IHRoaXMub3B0aW9ucy5vblNhbWVVcmxOYXZpZ2F0aW9uIHx8ICdpZ25vcmUnO1xuXG4gIGNvbmZpZzogUm91dGVzID0gaW5qZWN0KFJPVVRFUywge29wdGlvbmFsOiB0cnVlfSk/LmZsYXQoKSA/PyBbXTtcblxuICAvKipcbiAgICogSW5kaWNhdGVzIHdoZXRoZXIgdGhlIGFwcGxpY2F0aW9uIGhhcyBvcHRlZCBpbiB0byBiaW5kaW5nIFJvdXRlciBkYXRhIHRvIGNvbXBvbmVudCBpbnB1dHMuXG4gICAqXG4gICAqIFRoaXMgb3B0aW9uIGlzIGVuYWJsZWQgYnkgdGhlIGB3aXRoQ29tcG9uZW50SW5wdXRCaW5kaW5nYCBmZWF0dXJlIG9mIGBwcm92aWRlUm91dGVyYCBvclxuICAgKiBgYmluZFRvQ29tcG9uZW50SW5wdXRzYCBpbiB0aGUgYEV4dHJhT3B0aW9uc2Agb2YgYFJvdXRlck1vZHVsZS5mb3JSb290YC5cbiAgICovXG4gIHJlYWRvbmx5IGNvbXBvbmVudElucHV0QmluZGluZ0VuYWJsZWQ6IGJvb2xlYW4gPSAhIWluamVjdChJTlBVVF9CSU5ERVIsIHtvcHRpb25hbDogdHJ1ZX0pO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMucmVzZXRDb25maWcodGhpcy5jb25maWcpO1xuXG4gICAgdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnNcbiAgICAgIC5zZXR1cE5hdmlnYXRpb25zKHRoaXMsIHRoaXMuY3VycmVudFVybFRyZWUsIHRoaXMucm91dGVyU3RhdGUpXG4gICAgICAuc3Vic2NyaWJlKHtcbiAgICAgICAgZXJyb3I6IChlKSA9PiB7XG4gICAgICAgICAgdGhpcy5jb25zb2xlLndhcm4obmdEZXZNb2RlID8gYFVuaGFuZGxlZCBOYXZpZ2F0aW9uIEVycm9yOiAke2V9YCA6IGUpO1xuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgdGhpcy5zdWJzY3JpYmVUb05hdmlnYXRpb25FdmVudHMoKTtcbiAgfVxuXG4gIHByaXZhdGUgZXZlbnRzU3Vic2NyaXB0aW9uID0gbmV3IFN1YnNjcmlwdGlvbigpO1xuICBwcml2YXRlIHN1YnNjcmliZVRvTmF2aWdhdGlvbkV2ZW50cygpIHtcbiAgICBjb25zdCBzdWJzY3JpcHRpb24gPSB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5ldmVudHMuc3Vic2NyaWJlKChlKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBjdXJyZW50VHJhbnNpdGlvbiA9IHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmN1cnJlbnRUcmFuc2l0aW9uO1xuICAgICAgICBjb25zdCBjdXJyZW50TmF2aWdhdGlvbiA9IHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmN1cnJlbnROYXZpZ2F0aW9uO1xuICAgICAgICBpZiAoY3VycmVudFRyYW5zaXRpb24gIT09IG51bGwgJiYgY3VycmVudE5hdmlnYXRpb24gIT09IG51bGwpIHtcbiAgICAgICAgICB0aGlzLnN0YXRlTWFuYWdlci5oYW5kbGVSb3V0ZXJFdmVudChlLCBjdXJyZW50TmF2aWdhdGlvbik7XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25DYW5jZWwgJiZcbiAgICAgICAgICAgIGUuY29kZSAhPT0gTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuUmVkaXJlY3QgJiZcbiAgICAgICAgICAgIGUuY29kZSAhPT0gTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuU3VwZXJzZWRlZEJ5TmV3TmF2aWdhdGlvblxuICAgICAgICAgICkge1xuICAgICAgICAgICAgLy8gSXQgc2VlbXMgd2VpcmQgdGhhdCBgbmF2aWdhdGVkYCBpcyBzZXQgdG8gYHRydWVgIHdoZW4gdGhlIG5hdmlnYXRpb24gaXMgcmVqZWN0ZWQsXG4gICAgICAgICAgICAvLyBob3dldmVyIGl0J3MgaG93IHRoaW5ncyB3ZXJlIHdyaXR0ZW4gaW5pdGlhbGx5LiBJbnZlc3RpZ2F0aW9uIHdvdWxkIG5lZWQgdG8gYmUgZG9uZVxuICAgICAgICAgICAgLy8gdG8gZGV0ZXJtaW5lIGlmIHRoaXMgY2FuIGJlIHJlbW92ZWQuXG4gICAgICAgICAgICB0aGlzLm5hdmlnYXRlZCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCkge1xuICAgICAgICAgICAgdGhpcy5uYXZpZ2F0ZWQgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIFJlZGlyZWN0UmVxdWVzdCkge1xuICAgICAgICAgICAgY29uc3Qgb3B0cyA9IGUubmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucztcbiAgICAgICAgICAgIGNvbnN0IG1lcmdlZFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UoXG4gICAgICAgICAgICAgIGUudXJsLFxuICAgICAgICAgICAgICBjdXJyZW50VHJhbnNpdGlvbi5jdXJyZW50UmF3VXJsLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGNvbnN0IGV4dHJhcyA9IHtcbiAgICAgICAgICAgICAgYnJvd3NlclVybDogY3VycmVudFRyYW5zaXRpb24uZXh0cmFzLmJyb3dzZXJVcmwsXG4gICAgICAgICAgICAgIGluZm86IGN1cnJlbnRUcmFuc2l0aW9uLmV4dHJhcy5pbmZvLFxuICAgICAgICAgICAgICBza2lwTG9jYXRpb25DaGFuZ2U6IGN1cnJlbnRUcmFuc2l0aW9uLmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UsXG4gICAgICAgICAgICAgIC8vIFRoZSBVUkwgaXMgYWxyZWFkeSB1cGRhdGVkIGF0IHRoaXMgcG9pbnQgaWYgd2UgaGF2ZSAnZWFnZXInIFVSTFxuICAgICAgICAgICAgICAvLyB1cGRhdGVzIG9yIGlmIHRoZSBuYXZpZ2F0aW9uIHdhcyB0cmlnZ2VyZWQgYnkgdGhlIGJyb3dzZXIgKGJhY2tcbiAgICAgICAgICAgICAgLy8gYnV0dG9uLCBVUkwgYmFyLCBldGMpLiBXZSB3YW50IHRvIHJlcGxhY2UgdGhhdCBpdGVtIGluIGhpc3RvcnlcbiAgICAgICAgICAgICAgLy8gaWYgdGhlIG5hdmlnYXRpb24gaXMgcmVqZWN0ZWQuXG4gICAgICAgICAgICAgIHJlcGxhY2VVcmw6XG4gICAgICAgICAgICAgICAgY3VycmVudFRyYW5zaXRpb24uZXh0cmFzLnJlcGxhY2VVcmwgfHxcbiAgICAgICAgICAgICAgICB0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZWFnZXInIHx8XG4gICAgICAgICAgICAgICAgaXNCcm93c2VyVHJpZ2dlcmVkTmF2aWdhdGlvbihjdXJyZW50VHJhbnNpdGlvbi5zb3VyY2UpLFxuICAgICAgICAgICAgICAvLyBhbGxvdyBkZXZlbG9wZXIgdG8gb3ZlcnJpZGUgZGVmYXVsdCBvcHRpb25zIHdpdGggUmVkaXJlY3RDb21tYW5kXG4gICAgICAgICAgICAgIC4uLm9wdHMsXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbihtZXJnZWRUcmVlLCBJTVBFUkFUSVZFX05BVklHQVRJT04sIG51bGwsIGV4dHJhcywge1xuICAgICAgICAgICAgICByZXNvbHZlOiBjdXJyZW50VHJhbnNpdGlvbi5yZXNvbHZlLFxuICAgICAgICAgICAgICByZWplY3Q6IGN1cnJlbnRUcmFuc2l0aW9uLnJlamVjdCxcbiAgICAgICAgICAgICAgcHJvbWlzZTogY3VycmVudFRyYW5zaXRpb24ucHJvbWlzZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBOb3RlIHRoYXQgaXQncyBpbXBvcnRhbnQgdG8gaGF2ZSB0aGUgUm91dGVyIHByb2Nlc3MgdGhlIGV2ZW50cyBfYmVmb3JlXyB0aGUgZXZlbnQgaXNcbiAgICAgICAgLy8gcHVzaGVkIHRocm91Z2ggdGhlIHB1YmxpYyBvYnNlcnZhYmxlLiBUaGlzIGVuc3VyZXMgdGhlIGNvcnJlY3Qgcm91dGVyIHN0YXRlIGlzIGluIHBsYWNlXG4gICAgICAgIC8vIGJlZm9yZSBhcHBsaWNhdGlvbnMgb2JzZXJ2ZSB0aGUgZXZlbnRzLlxuICAgICAgICBpZiAoaXNQdWJsaWNSb3V0ZXJFdmVudChlKSkge1xuICAgICAgICAgIHRoaXMuX2V2ZW50cy5uZXh0KGUpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlOiB1bmtub3duKSB7XG4gICAgICAgIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLnRyYW5zaXRpb25BYm9ydFN1YmplY3QubmV4dChlIGFzIEVycm9yKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmV2ZW50c1N1YnNjcmlwdGlvbi5hZGQoc3Vic2NyaXB0aW9uKTtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcmVzZXRSb290Q29tcG9uZW50VHlwZShyb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+KTogdm9pZCB7XG4gICAgLy8gVE9ETzogdnNhdmtpbiByb3V0ZXIgNC4wIHNob3VsZCBtYWtlIHRoZSByb290IGNvbXBvbmVudCBzZXQgdG8gbnVsbFxuICAgIC8vIHRoaXMgd2lsbCBzaW1wbGlmeSB0aGUgbGlmZWN5Y2xlIG9mIHRoZSByb3V0ZXIuXG4gICAgdGhpcy5yb3V0ZXJTdGF0ZS5yb290LmNvbXBvbmVudCA9IHJvb3RDb21wb25lbnRUeXBlO1xuICAgIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLnJvb3RDb21wb25lbnRUeXBlID0gcm9vdENvbXBvbmVudFR5cGU7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyIGFuZCBwZXJmb3JtcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaW5pdGlhbE5hdmlnYXRpb24oKTogdm9pZCB7XG4gICAgdGhpcy5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICBpZiAoIXRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmhhc1JlcXVlc3RlZE5hdmlnYXRpb24pIHtcbiAgICAgIHRoaXMubmF2aWdhdGVUb1N5bmNXaXRoQnJvd3NlcihcbiAgICAgICAgdGhpcy5sb2NhdGlvbi5wYXRoKHRydWUpLFxuICAgICAgICBJTVBFUkFUSVZFX05BVklHQVRJT04sXG4gICAgICAgIHRoaXMuc3RhdGVNYW5hZ2VyLnJlc3RvcmVkU3RhdGUoKSxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdXAgdGhlIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lci4gVGhpcyBsaXN0ZW5lciBkZXRlY3RzIG5hdmlnYXRpb25zIHRyaWdnZXJlZCBmcm9tIG91dHNpZGVcbiAgICogdGhlIFJvdXRlciAodGhlIGJyb3dzZXIgYmFjay9mb3J3YXJkIGJ1dHRvbnMsIGZvciBleGFtcGxlKSBhbmQgc2NoZWR1bGVzIGEgY29ycmVzcG9uZGluZyBSb3V0ZXJcbiAgICogbmF2aWdhdGlvbiBzbyB0aGF0IHRoZSBjb3JyZWN0IGV2ZW50cywgZ3VhcmRzLCBldGMuIGFyZSB0cmlnZ2VyZWQuXG4gICAqL1xuICBzZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTogdm9pZCB7XG4gICAgLy8gRG9uJ3QgbmVlZCB0byB1c2UgWm9uZS53cmFwIGFueSBtb3JlLCBiZWNhdXNlIHpvbmUuanNcbiAgICAvLyBhbHJlYWR5IHBhdGNoIG9uUG9wU3RhdGUsIHNvIGxvY2F0aW9uIGNoYW5nZSBjYWxsYmFjayB3aWxsXG4gICAgLy8gcnVuIGludG8gbmdab25lXG4gICAgdGhpcy5ub25Sb3V0ZXJDdXJyZW50RW50cnlDaGFuZ2VTdWJzY3JpcHRpb24gPz89XG4gICAgICB0aGlzLnN0YXRlTWFuYWdlci5yZWdpc3Rlck5vblJvdXRlckN1cnJlbnRFbnRyeUNoYW5nZUxpc3RlbmVyKCh1cmwsIHN0YXRlKSA9PiB7XG4gICAgICAgIC8vIFRoZSBgc2V0VGltZW91dGAgd2FzIGFkZGVkIGluICMxMjE2MCBhbmQgaXMgbGlrZWx5IHRvIHN1cHBvcnQgQW5ndWxhci9Bbmd1bGFySlNcbiAgICAgICAgLy8gaHlicmlkIGFwcHMuXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMubmF2aWdhdGVUb1N5bmNXaXRoQnJvd3Nlcih1cmwsICdwb3BzdGF0ZScsIHN0YXRlKTtcbiAgICAgICAgfSwgMCk7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTY2hlZHVsZXMgYSByb3V0ZXIgbmF2aWdhdGlvbiB0byBzeW5jaHJvbml6ZSBSb3V0ZXIgc3RhdGUgd2l0aCB0aGUgYnJvd3NlciBzdGF0ZS5cbiAgICpcbiAgICogVGhpcyBpcyBkb25lIGFzIGEgcmVzcG9uc2UgdG8gYSBwb3BzdGF0ZSBldmVudCBhbmQgdGhlIGluaXRpYWwgbmF2aWdhdGlvbi4gVGhlc2VcbiAgICogdHdvIHNjZW5hcmlvcyByZXByZXNlbnQgdGltZXMgd2hlbiB0aGUgYnJvd3NlciBVUkwvc3RhdGUgaGFzIGJlZW4gdXBkYXRlZCBhbmRcbiAgICogdGhlIFJvdXRlciBuZWVkcyB0byByZXNwb25kIHRvIGVuc3VyZSBpdHMgaW50ZXJuYWwgc3RhdGUgbWF0Y2hlcy5cbiAgICovXG4gIHByaXZhdGUgbmF2aWdhdGVUb1N5bmNXaXRoQnJvd3NlcihcbiAgICB1cmw6IHN0cmluZyxcbiAgICBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLFxuICAgIHN0YXRlOiBSZXN0b3JlZFN0YXRlIHwgbnVsbCB8IHVuZGVmaW5lZCxcbiAgKSB7XG4gICAgY29uc3QgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3JlcGxhY2VVcmw6IHRydWV9O1xuXG4gICAgLy8gVE9ETzogcmVzdG9yZWRTdGF0ZSBzaG91bGQgYWx3YXlzIGluY2x1ZGUgdGhlIGVudGlyZSBzdGF0ZSwgcmVnYXJkbGVzc1xuICAgIC8vIG9mIG5hdmlnYXRpb25JZC4gVGhpcyByZXF1aXJlcyBhIGJyZWFraW5nIGNoYW5nZSB0byB1cGRhdGUgdGhlIHR5cGUgb25cbiAgICAvLyBOYXZpZ2F0aW9uU3RhcnTigJlzIHJlc3RvcmVkU3RhdGUsIHdoaWNoIGN1cnJlbnRseSByZXF1aXJlcyBuYXZpZ2F0aW9uSWRcbiAgICAvLyB0byBhbHdheXMgYmUgcHJlc2VudC4gVGhlIFJvdXRlciB1c2VkIHRvIG9ubHkgcmVzdG9yZSBoaXN0b3J5IHN0YXRlIGlmXG4gICAgLy8gYSBuYXZpZ2F0aW9uSWQgd2FzIHByZXNlbnQuXG5cbiAgICAvLyBUaGUgc3RvcmVkIG5hdmlnYXRpb25JZCBpcyB1c2VkIGJ5IHRoZSBSb3V0ZXJTY3JvbGxlciB0byByZXRyaWV2ZSB0aGUgc2Nyb2xsXG4gICAgLy8gcG9zaXRpb24gZm9yIHRoZSBwYWdlLlxuICAgIGNvbnN0IHJlc3RvcmVkU3RhdGUgPSBzdGF0ZT8ubmF2aWdhdGlvbklkID8gc3RhdGUgOiBudWxsO1xuXG4gICAgLy8gU2VwYXJhdGUgdG8gTmF2aWdhdGlvblN0YXJ0LnJlc3RvcmVkU3RhdGUsIHdlIG11c3QgYWxzbyByZXN0b3JlIHRoZSBzdGF0ZSB0b1xuICAgIC8vIGhpc3Rvcnkuc3RhdGUgYW5kIGdlbmVyYXRlIGEgbmV3IG5hdmlnYXRpb25JZCwgc2luY2UgaXQgd2lsbCBiZSBvdmVyd3JpdHRlblxuICAgIGlmIChzdGF0ZSkge1xuICAgICAgY29uc3Qgc3RhdGVDb3B5ID0gey4uLnN0YXRlfSBhcyBQYXJ0aWFsPFJlc3RvcmVkU3RhdGU+O1xuICAgICAgZGVsZXRlIHN0YXRlQ29weS5uYXZpZ2F0aW9uSWQ7XG4gICAgICBkZWxldGUgc3RhdGVDb3B5Lsm1cm91dGVyUGFnZUlkO1xuICAgICAgaWYgKE9iamVjdC5rZXlzKHN0YXRlQ29weSkubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgIGV4dHJhcy5zdGF0ZSA9IHN0YXRlQ29weTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKHVybFRyZWUsIHNvdXJjZSwgcmVzdG9yZWRTdGF0ZSwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKiBUaGUgY3VycmVudCBVUkwuICovXG4gIGdldCB1cmwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5zZXJpYWxpemVVcmwodGhpcy5jdXJyZW50VXJsVHJlZSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgY3VycmVudCBgTmF2aWdhdGlvbmAgb2JqZWN0IHdoZW4gdGhlIHJvdXRlciBpcyBuYXZpZ2F0aW5nLFxuICAgKiBhbmQgYG51bGxgIHdoZW4gaWRsZS5cbiAgICovXG4gIGdldEN1cnJlbnROYXZpZ2F0aW9uKCk6IE5hdmlnYXRpb24gfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuY3VycmVudE5hdmlnYXRpb247XG4gIH1cblxuICAvKipcbiAgICogVGhlIGBOYXZpZ2F0aW9uYCBvYmplY3Qgb2YgdGhlIG1vc3QgcmVjZW50IG5hdmlnYXRpb24gdG8gc3VjY2VlZCBhbmQgYG51bGxgIGlmIHRoZXJlXG4gICAqICAgICBoYXMgbm90IGJlZW4gYSBzdWNjZXNzZnVsIG5hdmlnYXRpb24geWV0LlxuICAgKi9cbiAgZ2V0IGxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbigpOiBOYXZpZ2F0aW9uIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNldHMgdGhlIHJvdXRlIGNvbmZpZ3VyYXRpb24gdXNlZCBmb3IgbmF2aWdhdGlvbiBhbmQgZ2VuZXJhdGluZyBsaW5rcy5cbiAgICpcbiAgICogQHBhcmFtIGNvbmZpZyBUaGUgcm91dGUgYXJyYXkgZm9yIHRoZSBuZXcgY29uZmlndXJhdGlvbi5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5yZXNldENvbmZpZyhbXG4gICAqICB7IHBhdGg6ICd0ZWFtLzppZCcsIGNvbXBvbmVudDogVGVhbUNtcCwgY2hpbGRyZW46IFtcbiAgICogICAgeyBwYXRoOiAnc2ltcGxlJywgY29tcG9uZW50OiBTaW1wbGVDbXAgfSxcbiAgICogICAgeyBwYXRoOiAndXNlci86bmFtZScsIGNvbXBvbmVudDogVXNlckNtcCB9XG4gICAqICBdfVxuICAgKiBdKTtcbiAgICogYGBgXG4gICAqL1xuICByZXNldENvbmZpZyhjb25maWc6IFJvdXRlcyk6IHZvaWQge1xuICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmIHZhbGlkYXRlQ29uZmlnKGNvbmZpZyk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWcubWFwKHN0YW5kYXJkaXplQ29uZmlnKTtcbiAgICB0aGlzLm5hdmlnYXRlZCA9IGZhbHNlO1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLmRpc3Bvc2UoKTtcbiAgfVxuXG4gIC8qKiBEaXNwb3NlcyBvZiB0aGUgcm91dGVyLiAqL1xuICBkaXNwb3NlKCk6IHZvaWQge1xuICAgIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmNvbXBsZXRlKCk7XG4gICAgaWYgKHRoaXMubm9uUm91dGVyQ3VycmVudEVudHJ5Q2hhbmdlU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLm5vblJvdXRlckN1cnJlbnRFbnRyeUNoYW5nZVN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgdGhpcy5ub25Sb3V0ZXJDdXJyZW50RW50cnlDaGFuZ2VTdWJzY3JpcHRpb24gPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHRoaXMuZGlzcG9zZWQgPSB0cnVlO1xuICAgIHRoaXMuZXZlbnRzU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICAvKipcbiAgICogQXBwZW5kcyBVUkwgc2VnbWVudHMgdG8gdGhlIGN1cnJlbnQgVVJMIHRyZWUgdG8gY3JlYXRlIGEgbmV3IFVSTCB0cmVlLlxuICAgKlxuICAgKiBAcGFyYW0gY29tbWFuZHMgQW4gYXJyYXkgb2YgVVJMIGZyYWdtZW50cyB3aXRoIHdoaWNoIHRvIGNvbnN0cnVjdCB0aGUgbmV3IFVSTCB0cmVlLlxuICAgKiBJZiB0aGUgcGF0aCBpcyBzdGF0aWMsIGNhbiBiZSB0aGUgbGl0ZXJhbCBVUkwgc3RyaW5nLiBGb3IgYSBkeW5hbWljIHBhdGgsIHBhc3MgYW4gYXJyYXkgb2YgcGF0aFxuICAgKiBzZWdtZW50cywgZm9sbG93ZWQgYnkgdGhlIHBhcmFtZXRlcnMgZm9yIGVhY2ggc2VnbWVudC5cbiAgICogVGhlIGZyYWdtZW50cyBhcmUgYXBwbGllZCB0byB0aGUgY3VycmVudCBVUkwgdHJlZSBvciB0aGUgb25lIHByb3ZpZGVkICBpbiB0aGUgYHJlbGF0aXZlVG9gXG4gICAqIHByb3BlcnR5IG9mIHRoZSBvcHRpb25zIG9iamVjdCwgaWYgc3VwcGxpZWQuXG4gICAqIEBwYXJhbSBuYXZpZ2F0aW9uRXh0cmFzIE9wdGlvbnMgdGhhdCBjb250cm9sIHRoZSBuYXZpZ2F0aW9uIHN0cmF0ZWd5LlxuICAgKiBAcmV0dXJucyBUaGUgbmV3IFVSTCB0cmVlLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBgYGBcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCAndXNlcicsIDExXSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMztleHBhbmQ9dHJ1ZS91c2VyLzExXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge2V4cGFuZDogdHJ1ZX0sICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8geW91IGNhbiBjb2xsYXBzZSBzdGF0aWMgc2VnbWVudHMgbGlrZSB0aGlzICh0aGlzIHdvcmtzIG9ubHkgd2l0aCB0aGUgZmlyc3QgcGFzc2VkLWluIHZhbHVlKTpcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbS8zMy91c2VyJywgdXNlcklkXSk7XG4gICAqXG4gICAqIC8vIElmIHRoZSBmaXJzdCBzZWdtZW50IGNhbiBjb250YWluIHNsYXNoZXMsIGFuZCB5b3UgZG8gbm90IHdhbnQgdGhlIHJvdXRlciB0byBzcGxpdCBpdCxcbiAgICogLy8geW91IGNhbiBkbyB0aGUgZm9sbG93aW5nOlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbe3NlZ21lbnRQYXRoOiAnL29uZS90d28nfV0pO1xuICAgKlxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvKHVzZXIvMTEvL3JpZ2h0OmNoYXQpXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiAnY2hhdCd9fV0pO1xuICAgKlxuICAgKiAvLyByZW1vdmUgdGhlIHJpZ2h0IHNlY29uZGFyeSBub2RlXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiBudWxsfX1dKTtcbiAgICpcbiAgICogLy8gYXNzdW1pbmcgdGhlIGN1cnJlbnQgdXJsIGlzIGAvdGVhbS8zMy91c2VyLzExYCBhbmQgdGhlIHJvdXRlIHBvaW50cyB0byBgdXNlci8xMWBcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8xMS9kZXRhaWxzXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnZGV0YWlscyddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8yMlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy4uLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS80NC91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vLi4vdGVhbS80NC91c2VyLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiBOb3RlIHRoYXQgYSB2YWx1ZSBvZiBgbnVsbGAgb3IgYHVuZGVmaW5lZGAgZm9yIGByZWxhdGl2ZVRvYCBpbmRpY2F0ZXMgdGhhdCB0aGVcbiAgICogdHJlZSBzaG91bGQgYmUgY3JlYXRlZCByZWxhdGl2ZSB0byB0aGUgcm9vdC5cbiAgICogYGBgXG4gICAqL1xuICBjcmVhdGVVcmxUcmVlKGNvbW1hbmRzOiBhbnlbXSwgbmF2aWdhdGlvbkV4dHJhczogVXJsQ3JlYXRpb25PcHRpb25zID0ge30pOiBVcmxUcmVlIHtcbiAgICBjb25zdCB7cmVsYXRpdmVUbywgcXVlcnlQYXJhbXMsIGZyYWdtZW50LCBxdWVyeVBhcmFtc0hhbmRsaW5nLCBwcmVzZXJ2ZUZyYWdtZW50fSA9XG4gICAgICBuYXZpZ2F0aW9uRXh0cmFzO1xuICAgIGNvbnN0IGYgPSBwcmVzZXJ2ZUZyYWdtZW50ID8gdGhpcy5jdXJyZW50VXJsVHJlZS5mcmFnbWVudCA6IGZyYWdtZW50O1xuICAgIGxldCBxOiBQYXJhbXMgfCBudWxsID0gbnVsbDtcbiAgICBzd2l0Y2ggKHF1ZXJ5UGFyYW1zSGFuZGxpbmcpIHtcbiAgICAgIGNhc2UgJ21lcmdlJzpcbiAgICAgICAgcSA9IHsuLi50aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zLCAuLi5xdWVyeVBhcmFtc307XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncHJlc2VydmUnOlxuICAgICAgICBxID0gdGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcztcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBxID0gcXVlcnlQYXJhbXMgfHwgbnVsbDtcbiAgICB9XG4gICAgaWYgKHEgIT09IG51bGwpIHtcbiAgICAgIHEgPSB0aGlzLnJlbW92ZUVtcHR5UHJvcHMocSk7XG4gICAgfVxuXG4gICAgbGV0IHJlbGF0aXZlVG9VcmxTZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVsYXRpdmVUb1NuYXBzaG90ID0gcmVsYXRpdmVUbyA/IHJlbGF0aXZlVG8uc25hcHNob3QgOiB0aGlzLnJvdXRlclN0YXRlLnNuYXBzaG90LnJvb3Q7XG4gICAgICByZWxhdGl2ZVRvVXJsU2VnbWVudEdyb3VwID0gY3JlYXRlU2VnbWVudEdyb3VwRnJvbVJvdXRlKHJlbGF0aXZlVG9TbmFwc2hvdCk7XG4gICAgfSBjYXRjaCAoZTogdW5rbm93bikge1xuICAgICAgLy8gVGhpcyBpcyBzdHJpY3RseSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgd2l0aCB0ZXN0cyB0aGF0IGNyZWF0ZVxuICAgICAgLy8gaW52YWxpZCBgQWN0aXZhdGVkUm91dGVgIG1vY2tzLlxuICAgICAgLy8gTm90ZTogdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiBoYXZpbmcgdGhpcyBmYWxsYmFjayBmb3IgaW52YWxpZCBgQWN0aXZhdGVkUm91dGVgIHNldHVwcyBhbmRcbiAgICAgIC8vIGp1c3QgdGhyb3dpbmcgaXMgfjUwMCB0ZXN0IGZhaWx1cmVzLiBGaXhpbmcgYWxsIG9mIHRob3NlIHRlc3RzIGJ5IGhhbmQgaXMgbm90IGZlYXNpYmxlIGF0XG4gICAgICAvLyB0aGUgbW9tZW50LlxuICAgICAgaWYgKHR5cGVvZiBjb21tYW5kc1swXSAhPT0gJ3N0cmluZycgfHwgY29tbWFuZHNbMF1bMF0gIT09ICcvJykge1xuICAgICAgICAvLyBOYXZpZ2F0aW9ucyB0aGF0IHdlcmUgYWJzb2x1dGUgaW4gdGhlIG9sZCB3YXkgb2YgY3JlYXRpbmcgVXJsVHJlZXNcbiAgICAgICAgLy8gd291bGQgc3RpbGwgd29yayBiZWNhdXNlIHRoZXkgd291bGRuJ3QgYXR0ZW1wdCB0byBtYXRjaCB0aGVcbiAgICAgICAgLy8gc2VnbWVudHMgaW4gdGhlIGBBY3RpdmF0ZWRSb3V0ZWAgdG8gdGhlIGBjdXJyZW50VXJsVHJlZWAgYnV0XG4gICAgICAgIC8vIGluc3RlYWQganVzdCByZXBsYWNlIHRoZSByb290IHNlZ21lbnQgd2l0aCB0aGUgbmF2aWdhdGlvbiByZXN1bHQuXG4gICAgICAgIC8vIE5vbi1hYnNvbHV0ZSBuYXZpZ2F0aW9ucyB3b3VsZCBmYWlsIHRvIGFwcGx5IHRoZSBjb21tYW5kcyBiZWNhdXNlXG4gICAgICAgIC8vIHRoZSBsb2dpYyBjb3VsZCBub3QgZmluZCB0aGUgc2VnbWVudCB0byByZXBsYWNlIChzbyB0aGV5J2QgYWN0IGxpa2UgdGhlcmUgd2VyZSBub1xuICAgICAgICAvLyBjb21tYW5kcykuXG4gICAgICAgIGNvbW1hbmRzID0gW107XG4gICAgICB9XG4gICAgICByZWxhdGl2ZVRvVXJsU2VnbWVudEdyb3VwID0gdGhpcy5jdXJyZW50VXJsVHJlZS5yb290O1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlVXJsVHJlZUZyb21TZWdtZW50R3JvdXAocmVsYXRpdmVUb1VybFNlZ21lbnRHcm91cCwgY29tbWFuZHMsIHEsIGYgPz8gbnVsbCk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGVzIHRvIGEgdmlldyB1c2luZyBhbiBhYnNvbHV0ZSByb3V0ZSBwYXRoLlxuICAgKlxuICAgKiBAcGFyYW0gdXJsIEFuIGFic29sdXRlIHBhdGggZm9yIGEgZGVmaW5lZCByb3V0ZS4gVGhlIGZ1bmN0aW9uIGRvZXMgbm90IGFwcGx5IGFueSBkZWx0YSB0byB0aGVcbiAgICogICAgIGN1cnJlbnQgVVJMLlxuICAgKiBAcGFyYW0gZXh0cmFzIEFuIG9iamVjdCBjb250YWluaW5nIHByb3BlcnRpZXMgdGhhdCBtb2RpZnkgdGhlIG5hdmlnYXRpb24gc3RyYXRlZ3kuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvICd0cnVlJyB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsXG4gICAqIHRvICdmYWxzZScgd2hlbiBuYXZpZ2F0aW9uIGZhaWxzLCBvciBpcyByZWplY3RlZCBvbiBlcnJvci5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBjYWxscyByZXF1ZXN0IG5hdmlnYXRpb24gdG8gYW4gYWJzb2x1dGUgcGF0aC5cbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiKTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiLCB7IHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRpbmcvY29tbW9uLXJvdXRlci10YXNrcylcbiAgICpcbiAgICovXG4gIG5hdmlnYXRlQnlVcmwoXG4gICAgdXJsOiBzdHJpbmcgfCBVcmxUcmVlLFxuICAgIGV4dHJhczogTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyA9IHtcbiAgICAgIHNraXBMb2NhdGlvbkNoYW5nZTogZmFsc2UsXG4gICAgfSxcbiAgKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgdXJsVHJlZSA9IGlzVXJsVHJlZSh1cmwpID8gdXJsIDogdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIGNvbnN0IG1lcmdlZFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodXJsVHJlZSwgdGhpcy5yYXdVcmxUcmVlKTtcblxuICAgIHJldHVybiB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbihtZXJnZWRUcmVlLCBJTVBFUkFUSVZFX05BVklHQVRJT04sIG51bGwsIGV4dHJhcyk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGUgYmFzZWQgb24gdGhlIHByb3ZpZGVkIGFycmF5IG9mIGNvbW1hbmRzIGFuZCBhIHN0YXJ0aW5nIHBvaW50LlxuICAgKiBJZiBubyBzdGFydGluZyByb3V0ZSBpcyBwcm92aWRlZCwgdGhlIG5hdmlnYXRpb24gaXMgYWJzb2x1dGUuXG4gICAqXG4gICAqIEBwYXJhbSBjb21tYW5kcyBBbiBhcnJheSBvZiBVUkwgZnJhZ21lbnRzIHdpdGggd2hpY2ggdG8gY29uc3RydWN0IHRoZSB0YXJnZXQgVVJMLlxuICAgKiBJZiB0aGUgcGF0aCBpcyBzdGF0aWMsIGNhbiBiZSB0aGUgbGl0ZXJhbCBVUkwgc3RyaW5nLiBGb3IgYSBkeW5hbWljIHBhdGgsIHBhc3MgYW4gYXJyYXkgb2YgcGF0aFxuICAgKiBzZWdtZW50cywgZm9sbG93ZWQgYnkgdGhlIHBhcmFtZXRlcnMgZm9yIGVhY2ggc2VnbWVudC5cbiAgICogVGhlIGZyYWdtZW50cyBhcmUgYXBwbGllZCB0byB0aGUgY3VycmVudCBVUkwgb3IgdGhlIG9uZSBwcm92aWRlZCAgaW4gdGhlIGByZWxhdGl2ZVRvYCBwcm9wZXJ0eVxuICAgKiBvZiB0aGUgb3B0aW9ucyBvYmplY3QsIGlmIHN1cHBsaWVkLlxuICAgKiBAcGFyYW0gZXh0cmFzIEFuIG9wdGlvbnMgb2JqZWN0IHRoYXQgZGV0ZXJtaW5lcyBob3cgdGhlIFVSTCBzaG91bGQgYmUgY29uc3RydWN0ZWQgb3JcbiAgICogICAgIGludGVycHJldGVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBBIFByb21pc2UgdGhhdCByZXNvbHZlcyB0byBgdHJ1ZWAgd2hlbiBuYXZpZ2F0aW9uIHN1Y2NlZWRzLCBvciBgZmFsc2VgIHdoZW4gbmF2aWdhdGlvblxuICAgKiAgICAgZmFpbHMuIFRoZSBQcm9taXNlIGlzIHJlamVjdGVkIHdoZW4gYW4gZXJyb3Igb2NjdXJzIGlmIGByZXNvbHZlTmF2aWdhdGlvblByb21pc2VPbkVycm9yYCBpc1xuICAgKiBub3QgYHRydWVgLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBUaGUgZm9sbG93aW5nIGNhbGxzIHJlcXVlc3QgbmF2aWdhdGlvbiB0byBhIGR5bmFtaWMgcm91dGUgcGF0aCByZWxhdGl2ZSB0byB0aGUgY3VycmVudCBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIubmF2aWdhdGUoWyd0ZWFtJywgMzMsICd1c2VyJywgMTFdLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMLCBvdmVycmlkaW5nIHRoZSBkZWZhdWx0IGJlaGF2aW9yXG4gICAqIHJvdXRlci5uYXZpZ2F0ZShbJ3RlYW0nLCAzMywgJ3VzZXInLCAxMV0sIHtyZWxhdGl2ZVRvOiByb3V0ZSwgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0aW5nL2NvbW1vbi1yb3V0ZXItdGFza3MpXG4gICAqXG4gICAqL1xuICBuYXZpZ2F0ZShcbiAgICBjb21tYW5kczogYW55W10sXG4gICAgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3NraXBMb2NhdGlvbkNoYW5nZTogZmFsc2V9LFxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB2YWxpZGF0ZUNvbW1hbmRzKGNvbW1hbmRzKTtcbiAgICByZXR1cm4gdGhpcy5uYXZpZ2F0ZUJ5VXJsKHRoaXMuY3JlYXRlVXJsVHJlZShjb21tYW5kcywgZXh0cmFzKSwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKiBTZXJpYWxpemVzIGEgYFVybFRyZWVgIGludG8gYSBzdHJpbmcgKi9cbiAgc2VyaWFsaXplVXJsKHVybDogVXJsVHJlZSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodXJsKTtcbiAgfVxuXG4gIC8qKiBQYXJzZXMgYSBzdHJpbmcgaW50byBhIGBVcmxUcmVlYCAqL1xuICBwYXJzZVVybCh1cmw6IHN0cmluZyk6IFVybFRyZWUge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKHVybCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKCcvJyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciB0aGUgdXJsIGlzIGFjdGl2YXRlZC5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWRcbiAgICogVXNlIGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2AgaW5zdGVhZC5cbiAgICpcbiAgICogLSBUaGUgZXF1aXZhbGVudCBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIGZvciBgdHJ1ZWAgaXNcbiAgICogYHtwYXRoczogJ2V4YWN0JywgcXVlcnlQYXJhbXM6ICdleGFjdCcsIGZyYWdtZW50OiAnaWdub3JlZCcsIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnfWAuXG4gICAqIC0gVGhlIGVxdWl2YWxlbnQgZm9yIGBmYWxzZWAgaXNcbiAgICogYHtwYXRoczogJ3N1YnNldCcsIHF1ZXJ5UGFyYW1zOiAnc3Vic2V0JywgZnJhZ21lbnQ6ICdpZ25vcmVkJywgbWF0cml4UGFyYW1zOiAnaWdub3JlZCd9YC5cbiAgICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nIHwgVXJsVHJlZSwgZXhhY3Q6IGJvb2xlYW4pOiBib29sZWFuO1xuICAvKipcbiAgICogUmV0dXJucyB3aGV0aGVyIHRoZSB1cmwgaXMgYWN0aXZhdGVkLlxuICAgKi9cbiAgaXNBY3RpdmUodXJsOiBzdHJpbmcgfCBVcmxUcmVlLCBtYXRjaE9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zKTogYm9vbGVhbjtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZyB8IFVybFRyZWUsIG1hdGNoT3B0aW9uczogYm9vbGVhbiB8IElzQWN0aXZlTWF0Y2hPcHRpb25zKTogYm9vbGVhbjtcbiAgaXNBY3RpdmUodXJsOiBzdHJpbmcgfCBVcmxUcmVlLCBtYXRjaE9wdGlvbnM6IGJvb2xlYW4gfCBJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IGJvb2xlYW4ge1xuICAgIGxldCBvcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucztcbiAgICBpZiAobWF0Y2hPcHRpb25zID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zID0gey4uLmV4YWN0TWF0Y2hPcHRpb25zfTtcbiAgICB9IGVsc2UgaWYgKG1hdGNoT3B0aW9ucyA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMgPSB7Li4uc3Vic2V0TWF0Y2hPcHRpb25zfTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucyA9IG1hdGNoT3B0aW9ucztcbiAgICB9XG4gICAgaWYgKGlzVXJsVHJlZSh1cmwpKSB7XG4gICAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybCwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybFRyZWUsIG9wdGlvbnMpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVFbXB0eVByb3BzKHBhcmFtczogUGFyYW1zKTogUGFyYW1zIHtcbiAgICByZXR1cm4gT2JqZWN0LmVudHJpZXMocGFyYW1zKS5yZWR1Y2UoKHJlc3VsdDogUGFyYW1zLCBba2V5LCB2YWx1ZV06IFtzdHJpbmcsIGFueV0pID0+IHtcbiAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sIHt9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2NoZWR1bGVOYXZpZ2F0aW9uKFxuICAgIHJhd1VybDogVXJsVHJlZSxcbiAgICBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLFxuICAgIHJlc3RvcmVkU3RhdGU6IFJlc3RvcmVkU3RhdGUgfCBudWxsLFxuICAgIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyxcbiAgICBwcmlvclByb21pc2U/OiB7XG4gICAgICByZXNvbHZlOiAocmVzdWx0OiBib29sZWFuIHwgUHJvbWlzZUxpa2U8Ym9vbGVhbj4pID0+IHZvaWQ7XG4gICAgICByZWplY3Q6IChyZWFzb24/OiBhbnkpID0+IHZvaWQ7XG4gICAgICBwcm9taXNlOiBQcm9taXNlPGJvb2xlYW4+O1xuICAgIH0sXG4gICk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICh0aGlzLmRpc3Bvc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGZhbHNlKTtcbiAgICB9XG5cbiAgICBsZXQgcmVzb2x2ZTogKHJlc3VsdDogYm9vbGVhbiB8IFByb21pc2VMaWtlPGJvb2xlYW4+KSA9PiB2b2lkO1xuICAgIGxldCByZWplY3Q6IChyZWFzb24/OiBhbnkpID0+IHZvaWQ7XG4gICAgbGV0IHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj47XG4gICAgaWYgKHByaW9yUHJvbWlzZSkge1xuICAgICAgcmVzb2x2ZSA9IHByaW9yUHJvbWlzZS5yZXNvbHZlO1xuICAgICAgcmVqZWN0ID0gcHJpb3JQcm9taXNlLnJlamVjdDtcbiAgICAgIHByb21pc2UgPSBwcmlvclByb21pc2UucHJvbWlzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXMsIHJlaikgPT4ge1xuICAgICAgICByZXNvbHZlID0gcmVzO1xuICAgICAgICByZWplY3QgPSByZWo7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBJbmRpY2F0ZSB0aGF0IHRoZSBuYXZpZ2F0aW9uIGlzIGhhcHBlbmluZy5cbiAgICBjb25zdCB0YXNrSWQgPSB0aGlzLnBlbmRpbmdUYXNrcy5hZGQoKTtcbiAgICBhZnRlck5leHROYXZpZ2F0aW9uKHRoaXMsICgpID0+IHtcbiAgICAgIC8vIFJlbW92ZSBwZW5kaW5nIHRhc2sgaW4gYSBtaWNyb3Rhc2sgdG8gYWxsb3cgZm9yIGNhbmNlbGxlZFxuICAgICAgLy8gaW5pdGlhbCBuYXZpZ2F0aW9ucyBhbmQgcmVkaXJlY3RzIHdpdGhpbiB0aGUgc2FtZSB0YXNrLlxuICAgICAgcXVldWVNaWNyb3Rhc2soKCkgPT4gdGhpcy5wZW5kaW5nVGFza3MucmVtb3ZlKHRhc2tJZCkpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuaGFuZGxlTmF2aWdhdGlvblJlcXVlc3Qoe1xuICAgICAgc291cmNlLFxuICAgICAgcmVzdG9yZWRTdGF0ZSxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgY3VycmVudFJhd1VybDogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIHJhd1VybCxcbiAgICAgIGV4dHJhcyxcbiAgICAgIHJlc29sdmU6IHJlc29sdmUhLFxuICAgICAgcmVqZWN0OiByZWplY3QhLFxuICAgICAgcHJvbWlzZSxcbiAgICAgIGN1cnJlbnRTbmFwc2hvdDogdGhpcy5yb3V0ZXJTdGF0ZS5zbmFwc2hvdCxcbiAgICAgIGN1cnJlbnRSb3V0ZXJTdGF0ZTogdGhpcy5yb3V0ZXJTdGF0ZSxcbiAgICB9KTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBlcnJvciBpcyBwcm9wYWdhdGVkIGV2ZW4gdGhvdWdoIGBwcm9jZXNzTmF2aWdhdGlvbnNgIGNhdGNoXG4gICAgLy8gaGFuZGxlciBkb2VzIG5vdCByZXRocm93XG4gICAgcmV0dXJuIHByb21pc2UuY2F0Y2goKGU6IGFueSkgPT4ge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHM6IHN0cmluZ1tdKTogdm9pZCB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29tbWFuZHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjbWQgPSBjb21tYW5kc1tpXTtcbiAgICBpZiAoY21kID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuTlVMTElTSF9DT01NQU5ELFxuICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICAgIGBUaGUgcmVxdWVzdGVkIHBhdGggY29udGFpbnMgJHtjbWR9IHNlZ21lbnQgYXQgaW5kZXggJHtpfWAsXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpc1B1YmxpY1JvdXRlckV2ZW50KGU6IEV2ZW50IHwgUHJpdmF0ZVJvdXRlckV2ZW50cyk6IGUgaXMgRXZlbnQge1xuICByZXR1cm4gIShlIGluc3RhbmNlb2YgQmVmb3JlQWN0aXZhdGVSb3V0ZXMpICYmICEoZSBpbnN0YW5jZW9mIFJlZGlyZWN0UmVxdWVzdCk7XG59XG4iXX0=