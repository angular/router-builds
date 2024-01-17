/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { inject, Injectable, NgZone, ɵConsole as Console, ɵPendingTasks as PendingTasks, ɵRuntimeError as RuntimeError } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { createSegmentGroupFromRoute, createUrlTreeFromSegmentGroup } from './create_url_tree';
import { INPUT_BINDER } from './directives/router_outlet';
import { BeforeActivateRoutes, IMPERATIVE_NAVIGATION, NavigationCancel, NavigationCancellationCode, NavigationEnd, RedirectRequest } from './events';
import { isBrowserTriggeredNavigation, NavigationTransitions } from './navigation_transition';
import { RouteReuseStrategy } from './route_reuse_strategy';
import { ROUTER_CONFIGURATION } from './router_config';
import { ROUTES } from './router_config_loader';
import { StateManager } from './statemanager/state_manager';
import { UrlHandlingStrategy } from './url_handling_strategy';
import { containsTree, isUrlTree, UrlSerializer } from './url_tree';
import { standardizeConfig, validateConfig } from './utils/config';
import { afterNextNavigation } from './utils/navigations';
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
    queryParams: 'exact'
};
/**
 * The equivalent `IsActiveMatchOptions` options for `Router.isActive` is called with `false`
 * (exact = false).
 */
export const subsetMatchOptions = {
    paths: 'subset',
    fragment: 'ignored',
    matrixParams: 'ignored',
    queryParams: 'subset'
};
/**
 * @description
 *
 * A service that provides navigation among views and URL manipulation capabilities.
 *
 * @see {@link Route}
 * @see [Routing and Navigation Guide](guide/router).
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
        this.isNgZoneEnabled = false;
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
        this.isNgZoneEnabled = inject(NgZone) instanceof NgZone && NgZone.isInAngularZone();
        this.resetConfig(this.config);
        this.navigationTransitions.setupNavigations(this, this.currentUrlTree, this.routerState)
            .subscribe({
            error: (e) => {
                this.console.warn(ngDevMode ? `Unhandled Navigation Error: ${e}` : e);
            }
        });
        this.subscribeToNavigationEvents();
    }
    subscribeToNavigationEvents() {
        const subscription = this.navigationTransitions.events.subscribe(e => {
            try {
                const currentTransition = this.navigationTransitions.currentTransition;
                const currentNavigation = this.navigationTransitions.currentNavigation;
                if (currentTransition !== null && currentNavigation !== null) {
                    this.stateManager.handleRouterEvent(e, currentNavigation);
                    if (e instanceof NavigationCancel && e.code !== NavigationCancellationCode.Redirect &&
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
                        const mergedTree = this.urlHandlingStrategy.merge(e.url, currentTransition.currentRawUrl);
                        const extras = {
                            // Persist transient navigation info from the original navigation request.
                            info: currentTransition.extras.info,
                            skipLocationChange: currentTransition.extras.skipLocationChange,
                            // The URL is already updated at this point if we have 'eager' URL
                            // updates or if the navigation was triggered by the browser (back
                            // button, URL bar, etc). We want to replace that item in history
                            // if the navigation is rejected.
                            replaceUrl: this.urlUpdateStrategy === 'eager' ||
                                isBrowserTriggeredNavigation(currentTransition.source)
                        };
                        this.scheduleNavigation(mergedTree, IMPERATIVE_NAVIGATION, null, extras, {
                            resolve: currentTransition.resolve,
                            reject: currentTransition.reject,
                            promise: currentTransition.promise
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
            if (typeof commands[0] !== 'string' || !commands[0].startsWith('/')) {
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
     * @see [Routing and Navigation guide](guide/router)
     *
     */
    navigateByUrl(url, extras = {
        skipLocationChange: false
    }) {
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
            if (this.isNgZoneEnabled && !NgZone.isInAngularZone()) {
                this.console.warn(`Navigation triggered outside Angular zone, did you forget to call 'ngZone.run()'?`);
            }
        }
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
     * @see [Routing and Navigation guide](guide/router)
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
            resolve,
            reject,
            promise,
            currentSnapshot: this.routerState.snapshot,
            currentRouterState: this.routerState
        });
        // Make sure that the error is propagated even though `processNavigations` catch
        // handler does not rethrow
        return promise.catch((e) => {
            return Promise.reject(e);
        });
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.2.0-next.0+sha-b4c7167", ngImport: i0, type: Router, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.2.0-next.0+sha-b4c7167", ngImport: i0, type: Router, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.2.0-next.0+sha-b4c7167", ngImport: i0, type: Router, decorators: [{
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
    return (!(e instanceof BeforeActivateRoutes) && !(e instanceof RedirectRequest));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBUSxRQUFRLElBQUksT0FBTyxFQUFFLGFBQWEsSUFBSSxZQUFZLEVBQUUsYUFBYSxJQUFJLFlBQVksRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNsSixPQUFPLEVBQWEsT0FBTyxFQUFFLFlBQVksRUFBbUIsTUFBTSxNQUFNLENBQUM7QUFFekUsT0FBTyxFQUFDLDJCQUEyQixFQUFFLDZCQUE2QixFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDN0YsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLDRCQUE0QixDQUFDO0FBRXhELE9BQU8sRUFBQyxvQkFBb0IsRUFBUyxxQkFBcUIsRUFBRSxnQkFBZ0IsRUFBRSwwQkFBMEIsRUFBRSxhQUFhLEVBQTBDLGVBQWUsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUVsTSxPQUFPLEVBQUMsNEJBQTRCLEVBQWdDLHFCQUFxQixFQUFvQyxNQUFNLHlCQUF5QixDQUFDO0FBQzdKLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBQzFELE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3JELE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUU5QyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sOEJBQThCLENBQUM7QUFDMUQsT0FBTyxFQUFDLG1CQUFtQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDNUQsT0FBTyxFQUFDLFlBQVksRUFBd0IsU0FBUyxFQUFtQixhQUFhLEVBQVUsTUFBTSxZQUFZLENBQUM7QUFDbEgsT0FBTyxFQUFDLGlCQUFpQixFQUFFLGNBQWMsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ2pFLE9BQU8sRUFBQyxtQkFBbUIsRUFBQyxNQUFNLHFCQUFxQixDQUFDOztBQUl4RCxTQUFTLG1CQUFtQixDQUFDLEtBQVU7SUFDckMsTUFBTSxLQUFLLENBQUM7QUFDZCxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQXlCO0lBQ3JELEtBQUssRUFBRSxPQUFPO0lBQ2QsUUFBUSxFQUFFLFNBQVM7SUFDbkIsWUFBWSxFQUFFLFNBQVM7SUFDdkIsV0FBVyxFQUFFLE9BQU87Q0FDckIsQ0FBQztBQUVGOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUF5QjtJQUN0RCxLQUFLLEVBQUUsUUFBUTtJQUNmLFFBQVEsRUFBRSxTQUFTO0lBQ25CLFlBQVksRUFBRSxTQUFTO0lBQ3ZCLFdBQVcsRUFBRSxRQUFRO0NBQ3RCLENBQUM7QUFFRjs7Ozs7Ozs7Ozs7R0FXRztBQUVILE1BQU0sT0FBTyxNQUFNO0lBQ2pCLElBQVksY0FBYztRQUN4QixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMvQyxDQUFDO0lBQ0QsSUFBWSxVQUFVO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUMzQyxDQUFDO0lBcUJEOztPQUVHO0lBQ0gsSUFBVyxNQUFNO1FBQ2YsZ0dBQWdHO1FBQ2hHLG9GQUFvRjtRQUNwRixnR0FBZ0c7UUFDaEcsY0FBYztRQUNkLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUN0QixDQUFDO0lBQ0Q7O09BRUc7SUFDSCxJQUFJLFdBQVc7UUFDYixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDNUMsQ0FBQztJQThDRDtRQWpGUSxhQUFRLEdBQUcsS0FBSyxDQUFDO1FBRWpCLG9CQUFlLEdBQUcsS0FBSyxDQUFDO1FBRWYsWUFBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMxQixpQkFBWSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNwQyxZQUFPLEdBQUcsTUFBTSxDQUFDLG9CQUFvQixFQUFFLEVBQUMsUUFBUSxFQUFFLElBQUksRUFBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQy9ELGlCQUFZLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3BDLHNCQUFpQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLElBQUksVUFBVSxDQUFDO1FBQ2pFLDBCQUFxQixHQUFHLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3RELGtCQUFhLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3RDLGFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUIsd0JBQW1CLEdBQUcsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFbkU7Ozs7V0FJRztRQUNLLFlBQU8sR0FBRyxJQUFJLE9BQU8sRUFBUyxDQUFDO1FBa0J2Qzs7Ozs7O1dBTUc7UUFDSCxpQkFBWSxHQUF3QixJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksSUFBSSxtQkFBbUIsQ0FBQztRQUVyRjs7O1dBR0c7UUFDSCxjQUFTLEdBQVksS0FBSyxDQUFDO1FBRTNCOzs7OztXQUtHO1FBQ0gsdUJBQWtCLEdBQXVCLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBRXBFOzs7Ozs7OztXQVFHO1FBQ0gsd0JBQW1CLEdBQXdCLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLElBQUksUUFBUSxDQUFDO1FBRXhGLFdBQU0sR0FBVyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUMsUUFBUSxFQUFFLElBQUksRUFBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDO1FBRWhFOzs7OztXQUtHO1FBQ00saUNBQTRCLEdBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsRUFBQyxRQUFRLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQWlCbEYsdUJBQWtCLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQWQ5QyxJQUFJLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxNQUFNLElBQUksTUFBTSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBRXBGLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTlCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDO2FBQ25GLFNBQVMsQ0FBQztZQUNULEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNYLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsK0JBQStCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4RSxDQUFDO1NBQ0YsQ0FBQyxDQUFDO1FBQ1AsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUM7SUFDckMsQ0FBQztJQUlPLDJCQUEyQjtRQUNqQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNuRSxJQUFJLENBQUM7Z0JBQ0gsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLENBQUM7Z0JBQ3ZFLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixDQUFDO2dCQUN2RSxJQUFJLGlCQUFpQixLQUFLLElBQUksSUFBSSxpQkFBaUIsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDN0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztvQkFDMUQsSUFBSSxDQUFDLFlBQVksZ0JBQWdCLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSywwQkFBMEIsQ0FBQyxRQUFRO3dCQUMvRSxDQUFDLENBQUMsSUFBSSxLQUFLLDBCQUEwQixDQUFDLHlCQUF5QixFQUFFLENBQUM7d0JBQ3BFLG9GQUFvRjt3QkFDcEYsc0ZBQXNGO3dCQUN0Rix1Q0FBdUM7d0JBQ3ZDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO29CQUN4QixDQUFDO3lCQUFNLElBQUksQ0FBQyxZQUFZLGFBQWEsRUFBRSxDQUFDO3dCQUN0QyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztvQkFDeEIsQ0FBQzt5QkFBTSxJQUFJLENBQUMsWUFBWSxlQUFlLEVBQUUsQ0FBQzt3QkFDeEMsTUFBTSxVQUFVLEdBQ1osSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxDQUFDO3dCQUMzRSxNQUFNLE1BQU0sR0FBRzs0QkFDYiwwRUFBMEU7NEJBQzFFLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsSUFBSTs0QkFDbkMsa0JBQWtCLEVBQUUsaUJBQWlCLENBQUMsTUFBTSxDQUFDLGtCQUFrQjs0QkFDL0Qsa0VBQWtFOzRCQUNsRSxrRUFBa0U7NEJBQ2xFLGlFQUFpRTs0QkFDakUsaUNBQWlDOzRCQUNqQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixLQUFLLE9BQU87Z0NBQzFDLDRCQUE0QixDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQzt5QkFDM0QsQ0FBQzt3QkFFRixJQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxFQUFFLHFCQUFxQixFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7NEJBQ3ZFLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxPQUFPOzRCQUNsQyxNQUFNLEVBQUUsaUJBQWlCLENBQUMsTUFBTTs0QkFDaEMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLE9BQU87eUJBQ25DLENBQUMsQ0FBQztvQkFDTCxDQUFDO2dCQUNILENBQUM7Z0JBQ0QsdUZBQXVGO2dCQUN2RiwwRkFBMEY7Z0JBQzFGLDBDQUEwQztnQkFDMUMsSUFBSSxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdkIsQ0FBQztZQUNILENBQUM7WUFBQyxPQUFPLENBQVUsRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMscUJBQXFCLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQVUsQ0FBQyxDQUFDO1lBQ3JFLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELGdCQUFnQjtJQUNoQixzQkFBc0IsQ0FBQyxpQkFBNEI7UUFDakQsc0VBQXNFO1FBQ3RFLGtEQUFrRDtRQUNsRCxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQWlCLENBQUM7UUFDcEQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDO0lBQ25FLENBQUM7SUFFRDs7T0FFRztJQUNILGlCQUFpQjtRQUNmLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUN2RCxJQUFJLENBQUMseUJBQXlCLENBQzFCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLHFCQUFxQixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztRQUMxRixDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCwyQkFBMkI7UUFDekIsd0RBQXdEO1FBQ3hELDZEQUE2RDtRQUM3RCxrQkFBa0I7UUFDbEIsSUFBSSxDQUFDLHVDQUF1QztZQUN4QyxJQUFJLENBQUMsWUFBWSxDQUFDLDJDQUEyQyxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUMzRSxrRkFBa0Y7Z0JBQ2xGLGVBQWU7Z0JBQ2YsVUFBVSxDQUFDLEdBQUcsRUFBRTtvQkFDZCxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDekQsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ1IsQ0FBQyxDQUFDLENBQUM7SUFDVCxDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0sseUJBQXlCLENBQzdCLEdBQVcsRUFBRSxNQUF5QixFQUFFLEtBQW1DO1FBQzdFLE1BQU0sTUFBTSxHQUFxQixFQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUMsQ0FBQztRQUVwRCx5RUFBeUU7UUFDekUseUVBQXlFO1FBQ3pFLHlFQUF5RTtRQUN6RSx5RUFBeUU7UUFDekUsOEJBQThCO1FBRTlCLCtFQUErRTtRQUMvRSx5QkFBeUI7UUFDekIsTUFBTSxhQUFhLEdBQUcsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFFekQsK0VBQStFO1FBQy9FLDhFQUE4RTtRQUM5RSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1YsTUFBTSxTQUFTLEdBQUcsRUFBQyxHQUFHLEtBQUssRUFBMkIsQ0FBQztZQUN2RCxPQUFPLFNBQVMsQ0FBQyxZQUFZLENBQUM7WUFDOUIsT0FBTyxTQUFTLENBQUMsYUFBYSxDQUFDO1lBQy9CLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3hDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO1lBQzNCLENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVELHVCQUF1QjtJQUN2QixJQUFJLEdBQUc7UUFDTCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFRDs7O09BR0c7SUFDSCxvQkFBb0I7UUFDbEIsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLENBQUM7SUFDdEQsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQUksd0JBQXdCO1FBQzFCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDO0lBQzdELENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7O09BZUc7SUFDSCxXQUFXLENBQUMsTUFBYztRQUN4QixDQUFDLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTLENBQUMsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7SUFDekIsQ0FBQztJQUVELGFBQWE7SUFDYixXQUFXO1FBQ1QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7SUFFRCw4QkFBOEI7SUFDOUIsT0FBTztRQUNMLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN0QyxJQUFJLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxDQUFDO1lBQ2pELElBQUksQ0FBQyx1Q0FBdUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUMzRCxJQUFJLENBQUMsdUNBQXVDLEdBQUcsU0FBUyxDQUFDO1FBQzNELENBQUM7UUFDRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztRQUNyQixJQUFJLENBQUMsa0JBQWtCLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDeEMsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQStDRztJQUNILGFBQWEsQ0FBQyxRQUFlLEVBQUUsbUJBQXVDLEVBQUU7UUFDdEUsTUFBTSxFQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLG1CQUFtQixFQUFFLGdCQUFnQixFQUFDLEdBQzVFLGdCQUFnQixDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1FBQ3JFLElBQUksQ0FBQyxHQUFnQixJQUFJLENBQUM7UUFDMUIsUUFBUSxtQkFBbUIsRUFBRSxDQUFDO1lBQzVCLEtBQUssT0FBTztnQkFDVixDQUFDLEdBQUcsRUFBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxFQUFFLEdBQUcsV0FBVyxFQUFDLENBQUM7Z0JBQ3pELE1BQU07WUFDUixLQUFLLFVBQVU7Z0JBQ2IsQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDO2dCQUNwQyxNQUFNO1lBQ1I7Z0JBQ0UsQ0FBQyxHQUFHLFdBQVcsSUFBSSxJQUFJLENBQUM7UUFDNUIsQ0FBQztRQUNELElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ2YsQ0FBQyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvQixDQUFDO1FBRUQsSUFBSSx5QkFBb0QsQ0FBQztRQUN6RCxJQUFJLENBQUM7WUFDSCxNQUFNLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1lBQzdGLHlCQUF5QixHQUFHLDJCQUEyQixDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDOUUsQ0FBQztRQUFDLE9BQU8sQ0FBVSxFQUFFLENBQUM7WUFDcEIsc0VBQXNFO1lBQ3RFLGtDQUFrQztZQUNsQyw0RkFBNEY7WUFDNUYsNEZBQTRGO1lBQzVGLGNBQWM7WUFDZCxJQUFJLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDcEUscUVBQXFFO2dCQUNyRSw4REFBOEQ7Z0JBQzlELCtEQUErRDtnQkFDL0Qsb0VBQW9FO2dCQUNwRSxvRUFBb0U7Z0JBQ3BFLG9GQUFvRjtnQkFDcEYsYUFBYTtnQkFDYixRQUFRLEdBQUcsRUFBRSxDQUFDO1lBQ2hCLENBQUM7WUFDRCx5QkFBeUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQztRQUN2RCxDQUFDO1FBQ0QsT0FBTyw2QkFBNkIsQ0FBQyx5QkFBeUIsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09BdUJHO0lBQ0gsYUFBYSxDQUFDLEdBQW1CLEVBQUUsU0FBb0M7UUFDckUsa0JBQWtCLEVBQUUsS0FBSztLQUMxQjtRQUNDLElBQUksT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2xELElBQUksSUFBSSxDQUFDLGVBQWUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDO2dCQUN0RCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDYixtRkFBbUYsQ0FBQyxDQUFDO1lBQzNGLENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRTVFLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxxQkFBcUIsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDbEYsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQTZCRztJQUNILFFBQVEsQ0FBQyxRQUFlLEVBQUUsU0FBMkIsRUFBQyxrQkFBa0IsRUFBRSxLQUFLLEVBQUM7UUFFOUUsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0IsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFRCwyQ0FBMkM7SUFDM0MsWUFBWSxDQUFDLEdBQVk7UUFDdkIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQsdUNBQXVDO0lBQ3ZDLFFBQVEsQ0FBQyxHQUFXO1FBQ2xCLElBQUksQ0FBQztZQUNILE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUNQLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkMsQ0FBQztJQUNILENBQUM7SUFvQkQsUUFBUSxDQUFDLEdBQW1CLEVBQUUsWUFBMEM7UUFDdEUsSUFBSSxPQUE2QixDQUFDO1FBQ2xDLElBQUksWUFBWSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzFCLE9BQU8sR0FBRyxFQUFDLEdBQUcsaUJBQWlCLEVBQUMsQ0FBQztRQUNuQyxDQUFDO2FBQU0sSUFBSSxZQUFZLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDbEMsT0FBTyxHQUFHLEVBQUMsR0FBRyxrQkFBa0IsRUFBQyxDQUFDO1FBQ3BDLENBQUM7YUFBTSxDQUFDO1lBQ04sT0FBTyxHQUFHLFlBQVksQ0FBQztRQUN6QixDQUFDO1FBQ0QsSUFBSSxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNuQixPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQyxPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsTUFBYztRQUNyQyxPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBYyxFQUFFLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBZ0IsRUFBRSxFQUFFO1lBQ25GLElBQUksS0FBSyxLQUFLLElBQUksSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7WUFDdEIsQ0FBQztZQUNELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNULENBQUM7SUFFTyxrQkFBa0IsQ0FDdEIsTUFBZSxFQUFFLE1BQXlCLEVBQUUsYUFBaUMsRUFDN0UsTUFBd0IsRUFDeEIsWUFBcUU7UUFDdkUsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbEIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFFRCxJQUFJLE9BQVksQ0FBQztRQUNqQixJQUFJLE1BQVcsQ0FBQztRQUNoQixJQUFJLE9BQXlCLENBQUM7UUFDOUIsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNqQixPQUFPLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQztZQUMvQixNQUFNLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQztZQUM3QixPQUFPLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQztRQUNqQyxDQUFDO2FBQU0sQ0FBQztZQUNOLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBVSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDMUMsT0FBTyxHQUFHLEdBQUcsQ0FBQztnQkFDZCxNQUFNLEdBQUcsR0FBRyxDQUFDO1lBQ2YsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsNkNBQTZDO1FBQzdDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDdkMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtZQUM3Qiw0REFBNEQ7WUFDNUQsMERBQTBEO1lBQzFELGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3pELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHVCQUF1QixDQUFDO1lBQ2pELE1BQU07WUFDTixhQUFhO1lBQ2IsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjO1lBQ25DLGFBQWEsRUFBRSxJQUFJLENBQUMsY0FBYztZQUNsQyxNQUFNO1lBQ04sTUFBTTtZQUNOLE9BQU87WUFDUCxNQUFNO1lBQ04sT0FBTztZQUNQLGVBQWUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVE7WUFDMUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFdBQVc7U0FDckMsQ0FBQyxDQUFDO1FBRUgsZ0ZBQWdGO1FBQ2hGLDJCQUEyQjtRQUMzQixPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRTtZQUM5QixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO3lIQWxqQlUsTUFBTTs2SEFBTixNQUFNLGNBRE0sTUFBTTs7c0dBQ2xCLE1BQU07a0JBRGxCLFVBQVU7bUJBQUMsRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFDOztBQXNqQmhDLFNBQVMsZ0JBQWdCLENBQUMsUUFBa0I7SUFDMUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN6QyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7WUFDaEIsTUFBTSxJQUFJLFlBQVksOENBRWxCLENBQUMsT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLFNBQVMsQ0FBQztnQkFDM0MsK0JBQStCLEdBQUcscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdEUsQ0FBQztJQUNILENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxDQUE0QjtJQUN2RCxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksZUFBZSxDQUFDLENBQUMsQ0FBQztBQUNuRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge2luamVjdCwgSW5qZWN0YWJsZSwgTmdab25lLCBUeXBlLCDJtUNvbnNvbGUgYXMgQ29uc29sZSwgybVQZW5kaW5nVGFza3MgYXMgUGVuZGluZ1Rhc2tzLCDJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBTdWJqZWN0LCBTdWJzY3JpcHRpb24sIFN1YnNjcmlwdGlvbkxpa2V9IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge2NyZWF0ZVNlZ21lbnRHcm91cEZyb21Sb3V0ZSwgY3JlYXRlVXJsVHJlZUZyb21TZWdtZW50R3JvdXB9IGZyb20gJy4vY3JlYXRlX3VybF90cmVlJztcbmltcG9ydCB7SU5QVVRfQklOREVSfSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX291dGxldCc7XG5pbXBvcnQge1J1bnRpbWVFcnJvckNvZGV9IGZyb20gJy4vZXJyb3JzJztcbmltcG9ydCB7QmVmb3JlQWN0aXZhdGVSb3V0ZXMsIEV2ZW50LCBJTVBFUkFUSVZFX05BVklHQVRJT04sIE5hdmlnYXRpb25DYW5jZWwsIE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLCBOYXZpZ2F0aW9uRW5kLCBOYXZpZ2F0aW9uVHJpZ2dlciwgUHJpdmF0ZVJvdXRlckV2ZW50cywgUmVkaXJlY3RSZXF1ZXN0fSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge05hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMsIE9uU2FtZVVybE5hdmlnYXRpb24sIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtpc0Jyb3dzZXJUcmlnZ2VyZWROYXZpZ2F0aW9uLCBOYXZpZ2F0aW9uLCBOYXZpZ2F0aW9uRXh0cmFzLCBOYXZpZ2F0aW9uVHJhbnNpdGlvbnMsIFJlc3RvcmVkU3RhdGUsIFVybENyZWF0aW9uT3B0aW9uc30gZnJvbSAnLi9uYXZpZ2F0aW9uX3RyYW5zaXRpb24nO1xuaW1wb3J0IHtSb3V0ZVJldXNlU3RyYXRlZ3l9IGZyb20gJy4vcm91dGVfcmV1c2Vfc3RyYXRlZ3knO1xuaW1wb3J0IHtST1VURVJfQ09ORklHVVJBVElPTn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnJztcbmltcG9ydCB7Uk9VVEVTfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7UGFyYW1zfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge1N0YXRlTWFuYWdlcn0gZnJvbSAnLi9zdGF0ZW1hbmFnZXIvc3RhdGVfbWFuYWdlcic7XG5pbXBvcnQge1VybEhhbmRsaW5nU3RyYXRlZ3l9IGZyb20gJy4vdXJsX2hhbmRsaW5nX3N0cmF0ZWd5JztcbmltcG9ydCB7Y29udGFpbnNUcmVlLCBJc0FjdGl2ZU1hdGNoT3B0aW9ucywgaXNVcmxUcmVlLCBVcmxTZWdtZW50R3JvdXAsIFVybFNlcmlhbGl6ZXIsIFVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtzdGFuZGFyZGl6ZUNvbmZpZywgdmFsaWRhdGVDb25maWd9IGZyb20gJy4vdXRpbHMvY29uZmlnJztcbmltcG9ydCB7YWZ0ZXJOZXh0TmF2aWdhdGlvbn0gZnJvbSAnLi91dGlscy9uYXZpZ2F0aW9ucyc7XG5cblxuXG5mdW5jdGlvbiBkZWZhdWx0RXJyb3JIYW5kbGVyKGVycm9yOiBhbnkpOiBuZXZlciB7XG4gIHRocm93IGVycm9yO1xufVxuXG4vKipcbiAqIFRoZSBlcXVpdmFsZW50IGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2Agb3B0aW9ucyBmb3IgYFJvdXRlci5pc0FjdGl2ZWAgaXMgY2FsbGVkIHdpdGggYHRydWVgXG4gKiAoZXhhY3QgPSB0cnVlKS5cbiAqL1xuZXhwb3J0IGNvbnN0IGV4YWN0TWF0Y2hPcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucyA9IHtcbiAgcGF0aHM6ICdleGFjdCcsXG4gIGZyYWdtZW50OiAnaWdub3JlZCcsXG4gIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnLFxuICBxdWVyeVBhcmFtczogJ2V4YWN0J1xufTtcblxuLyoqXG4gKiBUaGUgZXF1aXZhbGVudCBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIG9wdGlvbnMgZm9yIGBSb3V0ZXIuaXNBY3RpdmVgIGlzIGNhbGxlZCB3aXRoIGBmYWxzZWBcbiAqIChleGFjdCA9IGZhbHNlKS5cbiAqL1xuZXhwb3J0IGNvbnN0IHN1YnNldE1hdGNoT3B0aW9uczogSXNBY3RpdmVNYXRjaE9wdGlvbnMgPSB7XG4gIHBhdGhzOiAnc3Vic2V0JyxcbiAgZnJhZ21lbnQ6ICdpZ25vcmVkJyxcbiAgbWF0cml4UGFyYW1zOiAnaWdub3JlZCcsXG4gIHF1ZXJ5UGFyYW1zOiAnc3Vic2V0J1xufTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBBIHNlcnZpY2UgdGhhdCBwcm92aWRlcyBuYXZpZ2F0aW9uIGFtb25nIHZpZXdzIGFuZCBVUkwgbWFuaXB1bGF0aW9uIGNhcGFiaWxpdGllcy5cbiAqXG4gKiBAc2VlIHtAbGluayBSb3V0ZX1cbiAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gR3VpZGVdKGd1aWRlL3JvdXRlcikuXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgUm91dGVyIHtcbiAgcHJpdmF0ZSBnZXQgY3VycmVudFVybFRyZWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVNYW5hZ2VyLmdldEN1cnJlbnRVcmxUcmVlKCk7XG4gIH1cbiAgcHJpdmF0ZSBnZXQgcmF3VXJsVHJlZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZU1hbmFnZXIuZ2V0UmF3VXJsVHJlZSgpO1xuICB9XG4gIHByaXZhdGUgZGlzcG9zZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBub25Sb3V0ZXJDdXJyZW50RW50cnlDaGFuZ2VTdWJzY3JpcHRpb24/OiBTdWJzY3JpcHRpb25MaWtlO1xuICBwcml2YXRlIGlzTmdab25lRW5hYmxlZCA9IGZhbHNlO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgY29uc29sZSA9IGluamVjdChDb25zb2xlKTtcbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0ZU1hbmFnZXIgPSBpbmplY3QoU3RhdGVNYW5hZ2VyKTtcbiAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zID0gaW5qZWN0KFJPVVRFUl9DT05GSUdVUkFUSU9OLCB7b3B0aW9uYWw6IHRydWV9KSB8fCB7fTtcbiAgcHJpdmF0ZSByZWFkb25seSBwZW5kaW5nVGFza3MgPSBpbmplY3QoUGVuZGluZ1Rhc2tzKTtcbiAgcHJpdmF0ZSByZWFkb25seSB1cmxVcGRhdGVTdHJhdGVneSA9IHRoaXMub3B0aW9ucy51cmxVcGRhdGVTdHJhdGVneSB8fCAnZGVmZXJyZWQnO1xuICBwcml2YXRlIHJlYWRvbmx5IG5hdmlnYXRpb25UcmFuc2l0aW9ucyA9IGluamVjdChOYXZpZ2F0aW9uVHJhbnNpdGlvbnMpO1xuICBwcml2YXRlIHJlYWRvbmx5IHVybFNlcmlhbGl6ZXIgPSBpbmplY3QoVXJsU2VyaWFsaXplcik7XG4gIHByaXZhdGUgcmVhZG9ubHkgbG9jYXRpb24gPSBpbmplY3QoTG9jYXRpb24pO1xuICBwcml2YXRlIHJlYWRvbmx5IHVybEhhbmRsaW5nU3RyYXRlZ3kgPSBpbmplY3QoVXJsSGFuZGxpbmdTdHJhdGVneSk7XG5cbiAgLyoqXG4gICAqIFRoZSBwcml2YXRlIGBTdWJqZWN0YCB0eXBlIGZvciB0aGUgcHVibGljIGV2ZW50cyBleHBvc2VkIGluIHRoZSBnZXR0ZXIuIFRoaXMgaXMgdXNlZCBpbnRlcm5hbGx5XG4gICAqIHRvIHB1c2ggZXZlbnRzIHRvLiBUaGUgc2VwYXJhdGUgZmllbGQgYWxsb3dzIHVzIHRvIGV4cG9zZSBzZXBhcmF0ZSB0eXBlcyBpbiB0aGUgcHVibGljIEFQSVxuICAgKiAoaS5lLiwgYW4gT2JzZXJ2YWJsZSByYXRoZXIgdGhhbiB0aGUgU3ViamVjdCkuXG4gICAqL1xuICBwcml2YXRlIF9ldmVudHMgPSBuZXcgU3ViamVjdDxFdmVudD4oKTtcbiAgLyoqXG4gICAqIEFuIGV2ZW50IHN0cmVhbSBmb3Igcm91dGluZyBldmVudHMuXG4gICAqL1xuICBwdWJsaWMgZ2V0IGV2ZW50cygpOiBPYnNlcnZhYmxlPEV2ZW50PiB7XG4gICAgLy8gVE9ETyhhdHNjb3R0KTogVGhpcyBfc2hvdWxkXyBiZSBldmVudHMuYXNPYnNlcnZhYmxlKCkuIEhvd2V2ZXIsIHRoaXMgY2hhbmdlIHJlcXVpcmVzIGludGVybmFsXG4gICAgLy8gY2xlYW51cDogdGVzdHMgYXJlIGRvaW5nIGAocm91dGUuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KS5uZXh0KC4uLilgLiBUaGlzIGlzbid0XG4gICAgLy8gYWxsb3dlZC9zdXBwb3J0ZWQgYnV0IHdlIHN0aWxsIGhhdmUgdG8gZml4IHRoZXNlIG9yIGZpbGUgYnVncyBhZ2FpbnN0IHRoZSB0ZWFtcyBiZWZvcmUgbWFraW5nXG4gICAgLy8gdGhlIGNoYW5nZS5cbiAgICByZXR1cm4gdGhpcy5fZXZlbnRzO1xuICB9XG4gIC8qKlxuICAgKiBUaGUgY3VycmVudCBzdGF0ZSBvZiByb3V0aW5nIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqL1xuICBnZXQgcm91dGVyU3RhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVNYW5hZ2VyLmdldFJvdXRlclN0YXRlKCk7XG4gIH1cblxuICAvKipcbiAgICogQSBoYW5kbGVyIGZvciBuYXZpZ2F0aW9uIGVycm9ycyBpbiB0aGlzIE5nTW9kdWxlLlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBTdWJzY3JpYmUgdG8gdGhlIGBSb3V0ZXJgIGV2ZW50cyBhbmQgd2F0Y2ggZm9yIGBOYXZpZ2F0aW9uRXJyb3JgIGluc3RlYWQuXG4gICAqICAgYHByb3ZpZGVSb3V0ZXJgIGhhcyB0aGUgYHdpdGhOYXZpZ2F0aW9uRXJyb3JIYW5kbGVyYCBmZWF0dXJlIHRvIG1ha2UgdGhpcyBlYXNpZXIuXG4gICAqIEBzZWUge0BsaW5rIHdpdGhOYXZpZ2F0aW9uRXJyb3JIYW5kbGVyfVxuICAgKi9cbiAgZXJyb3JIYW5kbGVyOiAoZXJyb3I6IGFueSkgPT4gYW55ID0gdGhpcy5vcHRpb25zLmVycm9ySGFuZGxlciB8fCBkZWZhdWx0RXJyb3JIYW5kbGVyO1xuXG4gIC8qKlxuICAgKiBUcnVlIGlmIGF0IGxlYXN0IG9uZSBuYXZpZ2F0aW9uIGV2ZW50IGhhcyBvY2N1cnJlZCxcbiAgICogZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgbmF2aWdhdGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEEgc3RyYXRlZ3kgZm9yIHJlLXVzaW5nIHJvdXRlcy5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgQ29uZmlndXJlIHVzaW5nIGBwcm92aWRlcnNgIGluc3RlYWQ6XG4gICAqICAgYHtwcm92aWRlOiBSb3V0ZVJldXNlU3RyYXRlZ3ksIHVzZUNsYXNzOiBNeVN0cmF0ZWd5fWAuXG4gICAqL1xuICByb3V0ZVJldXNlU3RyYXRlZ3k6IFJvdXRlUmV1c2VTdHJhdGVneSA9IGluamVjdChSb3V0ZVJldXNlU3RyYXRlZ3kpO1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gaGFuZGxlIGEgbmF2aWdhdGlvbiByZXF1ZXN0IHRvIHRoZSBjdXJyZW50IFVSTC5cbiAgICpcbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgQ29uZmlndXJlIHRoaXMgdGhyb3VnaCBgcHJvdmlkZVJvdXRlcmAgb3IgYFJvdXRlck1vZHVsZS5mb3JSb290YCBpbnN0ZWFkLlxuICAgKiBAc2VlIHtAbGluayB3aXRoUm91dGVyQ29uZmlnfVxuICAgKiBAc2VlIHtAbGluayBwcm92aWRlUm91dGVyfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXJNb2R1bGV9XG4gICAqL1xuICBvblNhbWVVcmxOYXZpZ2F0aW9uOiBPblNhbWVVcmxOYXZpZ2F0aW9uID0gdGhpcy5vcHRpb25zLm9uU2FtZVVybE5hdmlnYXRpb24gfHwgJ2lnbm9yZSc7XG5cbiAgY29uZmlnOiBSb3V0ZXMgPSBpbmplY3QoUk9VVEVTLCB7b3B0aW9uYWw6IHRydWV9KT8uZmxhdCgpID8/IFtdO1xuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgd2hldGhlciB0aGUgYXBwbGljYXRpb24gaGFzIG9wdGVkIGluIHRvIGJpbmRpbmcgUm91dGVyIGRhdGEgdG8gY29tcG9uZW50IGlucHV0cy5cbiAgICpcbiAgICogVGhpcyBvcHRpb24gaXMgZW5hYmxlZCBieSB0aGUgYHdpdGhDb21wb25lbnRJbnB1dEJpbmRpbmdgIGZlYXR1cmUgb2YgYHByb3ZpZGVSb3V0ZXJgIG9yXG4gICAqIGBiaW5kVG9Db21wb25lbnRJbnB1dHNgIGluIHRoZSBgRXh0cmFPcHRpb25zYCBvZiBgUm91dGVyTW9kdWxlLmZvclJvb3RgLlxuICAgKi9cbiAgcmVhZG9ubHkgY29tcG9uZW50SW5wdXRCaW5kaW5nRW5hYmxlZDogYm9vbGVhbiA9ICEhaW5qZWN0KElOUFVUX0JJTkRFUiwge29wdGlvbmFsOiB0cnVlfSk7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5pc05nWm9uZUVuYWJsZWQgPSBpbmplY3QoTmdab25lKSBpbnN0YW5jZW9mIE5nWm9uZSAmJiBOZ1pvbmUuaXNJbkFuZ3VsYXJab25lKCk7XG5cbiAgICB0aGlzLnJlc2V0Q29uZmlnKHRoaXMuY29uZmlnKTtcblxuICAgIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLnNldHVwTmF2aWdhdGlvbnModGhpcywgdGhpcy5jdXJyZW50VXJsVHJlZSwgdGhpcy5yb3V0ZXJTdGF0ZSlcbiAgICAgICAgLnN1YnNjcmliZSh7XG4gICAgICAgICAgZXJyb3I6IChlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNvbnNvbGUud2FybihuZ0Rldk1vZGUgPyBgVW5oYW5kbGVkIE5hdmlnYXRpb24gRXJyb3I6ICR7ZX1gIDogZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB0aGlzLnN1YnNjcmliZVRvTmF2aWdhdGlvbkV2ZW50cygpO1xuICB9XG5cblxuICBwcml2YXRlIGV2ZW50c1N1YnNjcmlwdGlvbiA9IG5ldyBTdWJzY3JpcHRpb24oKTtcbiAgcHJpdmF0ZSBzdWJzY3JpYmVUb05hdmlnYXRpb25FdmVudHMoKSB7XG4gICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuZXZlbnRzLnN1YnNjcmliZShlID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRUcmFuc2l0aW9uID0gdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuY3VycmVudFRyYW5zaXRpb247XG4gICAgICAgIGNvbnN0IGN1cnJlbnROYXZpZ2F0aW9uID0gdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuY3VycmVudE5hdmlnYXRpb247XG4gICAgICAgIGlmIChjdXJyZW50VHJhbnNpdGlvbiAhPT0gbnVsbCAmJiBjdXJyZW50TmF2aWdhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgICAgIHRoaXMuc3RhdGVNYW5hZ2VyLmhhbmRsZVJvdXRlckV2ZW50KGUsIGN1cnJlbnROYXZpZ2F0aW9uKTtcbiAgICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25DYW5jZWwgJiYgZS5jb2RlICE9PSBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZS5SZWRpcmVjdCAmJlxuICAgICAgICAgICAgICBlLmNvZGUgIT09IE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLlN1cGVyc2VkZWRCeU5ld05hdmlnYXRpb24pIHtcbiAgICAgICAgICAgIC8vIEl0IHNlZW1zIHdlaXJkIHRoYXQgYG5hdmlnYXRlZGAgaXMgc2V0IHRvIGB0cnVlYCB3aGVuIHRoZSBuYXZpZ2F0aW9uIGlzIHJlamVjdGVkLFxuICAgICAgICAgICAgLy8gaG93ZXZlciBpdCdzIGhvdyB0aGluZ3Mgd2VyZSB3cml0dGVuIGluaXRpYWxseS4gSW52ZXN0aWdhdGlvbiB3b3VsZCBuZWVkIHRvIGJlIGRvbmVcbiAgICAgICAgICAgIC8vIHRvIGRldGVybWluZSBpZiB0aGlzIGNhbiBiZSByZW1vdmVkLlxuICAgICAgICAgICAgdGhpcy5uYXZpZ2F0ZWQgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpIHtcbiAgICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGUgaW5zdGFuY2VvZiBSZWRpcmVjdFJlcXVlc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IG1lcmdlZFRyZWUgPVxuICAgICAgICAgICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZShlLnVybCwgY3VycmVudFRyYW5zaXRpb24uY3VycmVudFJhd1VybCk7XG4gICAgICAgICAgICBjb25zdCBleHRyYXMgPSB7XG4gICAgICAgICAgICAgIC8vIFBlcnNpc3QgdHJhbnNpZW50IG5hdmlnYXRpb24gaW5mbyBmcm9tIHRoZSBvcmlnaW5hbCBuYXZpZ2F0aW9uIHJlcXVlc3QuXG4gICAgICAgICAgICAgIGluZm86IGN1cnJlbnRUcmFuc2l0aW9uLmV4dHJhcy5pbmZvLFxuICAgICAgICAgICAgICBza2lwTG9jYXRpb25DaGFuZ2U6IGN1cnJlbnRUcmFuc2l0aW9uLmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UsXG4gICAgICAgICAgICAgIC8vIFRoZSBVUkwgaXMgYWxyZWFkeSB1cGRhdGVkIGF0IHRoaXMgcG9pbnQgaWYgd2UgaGF2ZSAnZWFnZXInIFVSTFxuICAgICAgICAgICAgICAvLyB1cGRhdGVzIG9yIGlmIHRoZSBuYXZpZ2F0aW9uIHdhcyB0cmlnZ2VyZWQgYnkgdGhlIGJyb3dzZXIgKGJhY2tcbiAgICAgICAgICAgICAgLy8gYnV0dG9uLCBVUkwgYmFyLCBldGMpLiBXZSB3YW50IHRvIHJlcGxhY2UgdGhhdCBpdGVtIGluIGhpc3RvcnlcbiAgICAgICAgICAgICAgLy8gaWYgdGhlIG5hdmlnYXRpb24gaXMgcmVqZWN0ZWQuXG4gICAgICAgICAgICAgIHJlcGxhY2VVcmw6IHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcicgfHxcbiAgICAgICAgICAgICAgICAgIGlzQnJvd3NlclRyaWdnZXJlZE5hdmlnYXRpb24oY3VycmVudFRyYW5zaXRpb24uc291cmNlKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24obWVyZ2VkVHJlZSwgSU1QRVJBVElWRV9OQVZJR0FUSU9OLCBudWxsLCBleHRyYXMsIHtcbiAgICAgICAgICAgICAgcmVzb2x2ZTogY3VycmVudFRyYW5zaXRpb24ucmVzb2x2ZSxcbiAgICAgICAgICAgICAgcmVqZWN0OiBjdXJyZW50VHJhbnNpdGlvbi5yZWplY3QsXG4gICAgICAgICAgICAgIHByb21pc2U6IGN1cnJlbnRUcmFuc2l0aW9uLnByb21pc2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBOb3RlIHRoYXQgaXQncyBpbXBvcnRhbnQgdG8gaGF2ZSB0aGUgUm91dGVyIHByb2Nlc3MgdGhlIGV2ZW50cyBfYmVmb3JlXyB0aGUgZXZlbnQgaXNcbiAgICAgICAgLy8gcHVzaGVkIHRocm91Z2ggdGhlIHB1YmxpYyBvYnNlcnZhYmxlLiBUaGlzIGVuc3VyZXMgdGhlIGNvcnJlY3Qgcm91dGVyIHN0YXRlIGlzIGluIHBsYWNlXG4gICAgICAgIC8vIGJlZm9yZSBhcHBsaWNhdGlvbnMgb2JzZXJ2ZSB0aGUgZXZlbnRzLlxuICAgICAgICBpZiAoaXNQdWJsaWNSb3V0ZXJFdmVudChlKSkge1xuICAgICAgICAgIHRoaXMuX2V2ZW50cy5uZXh0KGUpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlOiB1bmtub3duKSB7XG4gICAgICAgIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLnRyYW5zaXRpb25BYm9ydFN1YmplY3QubmV4dChlIGFzIEVycm9yKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmV2ZW50c1N1YnNjcmlwdGlvbi5hZGQoc3Vic2NyaXB0aW9uKTtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcmVzZXRSb290Q29tcG9uZW50VHlwZShyb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+KTogdm9pZCB7XG4gICAgLy8gVE9ETzogdnNhdmtpbiByb3V0ZXIgNC4wIHNob3VsZCBtYWtlIHRoZSByb290IGNvbXBvbmVudCBzZXQgdG8gbnVsbFxuICAgIC8vIHRoaXMgd2lsbCBzaW1wbGlmeSB0aGUgbGlmZWN5Y2xlIG9mIHRoZSByb3V0ZXIuXG4gICAgdGhpcy5yb3V0ZXJTdGF0ZS5yb290LmNvbXBvbmVudCA9IHJvb3RDb21wb25lbnRUeXBlO1xuICAgIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLnJvb3RDb21wb25lbnRUeXBlID0gcm9vdENvbXBvbmVudFR5cGU7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyIGFuZCBwZXJmb3JtcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaW5pdGlhbE5hdmlnYXRpb24oKTogdm9pZCB7XG4gICAgdGhpcy5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICBpZiAoIXRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmhhc1JlcXVlc3RlZE5hdmlnYXRpb24pIHtcbiAgICAgIHRoaXMubmF2aWdhdGVUb1N5bmNXaXRoQnJvd3NlcihcbiAgICAgICAgICB0aGlzLmxvY2F0aW9uLnBhdGgodHJ1ZSksIElNUEVSQVRJVkVfTkFWSUdBVElPTiwgdGhpcy5zdGF0ZU1hbmFnZXIucmVzdG9yZWRTdGF0ZSgpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyLiBUaGlzIGxpc3RlbmVyIGRldGVjdHMgbmF2aWdhdGlvbnMgdHJpZ2dlcmVkIGZyb20gb3V0c2lkZVxuICAgKiB0aGUgUm91dGVyICh0aGUgYnJvd3NlciBiYWNrL2ZvcndhcmQgYnV0dG9ucywgZm9yIGV4YW1wbGUpIGFuZCBzY2hlZHVsZXMgYSBjb3JyZXNwb25kaW5nIFJvdXRlclxuICAgKiBuYXZpZ2F0aW9uIHNvIHRoYXQgdGhlIGNvcnJlY3QgZXZlbnRzLCBndWFyZHMsIGV0Yy4gYXJlIHRyaWdnZXJlZC5cbiAgICovXG4gIHNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpOiB2b2lkIHtcbiAgICAvLyBEb24ndCBuZWVkIHRvIHVzZSBab25lLndyYXAgYW55IG1vcmUsIGJlY2F1c2Ugem9uZS5qc1xuICAgIC8vIGFscmVhZHkgcGF0Y2ggb25Qb3BTdGF0ZSwgc28gbG9jYXRpb24gY2hhbmdlIGNhbGxiYWNrIHdpbGxcbiAgICAvLyBydW4gaW50byBuZ1pvbmVcbiAgICB0aGlzLm5vblJvdXRlckN1cnJlbnRFbnRyeUNoYW5nZVN1YnNjcmlwdGlvbiA/Pz1cbiAgICAgICAgdGhpcy5zdGF0ZU1hbmFnZXIucmVnaXN0ZXJOb25Sb3V0ZXJDdXJyZW50RW50cnlDaGFuZ2VMaXN0ZW5lcigodXJsLCBzdGF0ZSkgPT4ge1xuICAgICAgICAgIC8vIFRoZSBgc2V0VGltZW91dGAgd2FzIGFkZGVkIGluICMxMjE2MCBhbmQgaXMgbGlrZWx5IHRvIHN1cHBvcnQgQW5ndWxhci9Bbmd1bGFySlNcbiAgICAgICAgICAvLyBoeWJyaWQgYXBwcy5cbiAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMubmF2aWdhdGVUb1N5bmNXaXRoQnJvd3Nlcih1cmwsICdwb3BzdGF0ZScsIHN0YXRlKTtcbiAgICAgICAgICB9LCAwKTtcbiAgICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2NoZWR1bGVzIGEgcm91dGVyIG5hdmlnYXRpb24gdG8gc3luY2hyb25pemUgUm91dGVyIHN0YXRlIHdpdGggdGhlIGJyb3dzZXIgc3RhdGUuXG4gICAqXG4gICAqIFRoaXMgaXMgZG9uZSBhcyBhIHJlc3BvbnNlIHRvIGEgcG9wc3RhdGUgZXZlbnQgYW5kIHRoZSBpbml0aWFsIG5hdmlnYXRpb24uIFRoZXNlXG4gICAqIHR3byBzY2VuYXJpb3MgcmVwcmVzZW50IHRpbWVzIHdoZW4gdGhlIGJyb3dzZXIgVVJML3N0YXRlIGhhcyBiZWVuIHVwZGF0ZWQgYW5kXG4gICAqIHRoZSBSb3V0ZXIgbmVlZHMgdG8gcmVzcG9uZCB0byBlbnN1cmUgaXRzIGludGVybmFsIHN0YXRlIG1hdGNoZXMuXG4gICAqL1xuICBwcml2YXRlIG5hdmlnYXRlVG9TeW5jV2l0aEJyb3dzZXIoXG4gICAgICB1cmw6IHN0cmluZywgc291cmNlOiBOYXZpZ2F0aW9uVHJpZ2dlciwgc3RhdGU6IFJlc3RvcmVkU3RhdGV8bnVsbHx1bmRlZmluZWQpIHtcbiAgICBjb25zdCBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7cmVwbGFjZVVybDogdHJ1ZX07XG5cbiAgICAvLyBUT0RPOiByZXN0b3JlZFN0YXRlIHNob3VsZCBhbHdheXMgaW5jbHVkZSB0aGUgZW50aXJlIHN0YXRlLCByZWdhcmRsZXNzXG4gICAgLy8gb2YgbmF2aWdhdGlvbklkLiBUaGlzIHJlcXVpcmVzIGEgYnJlYWtpbmcgY2hhbmdlIHRvIHVwZGF0ZSB0aGUgdHlwZSBvblxuICAgIC8vIE5hdmlnYXRpb25TdGFydOKAmXMgcmVzdG9yZWRTdGF0ZSwgd2hpY2ggY3VycmVudGx5IHJlcXVpcmVzIG5hdmlnYXRpb25JZFxuICAgIC8vIHRvIGFsd2F5cyBiZSBwcmVzZW50LiBUaGUgUm91dGVyIHVzZWQgdG8gb25seSByZXN0b3JlIGhpc3Rvcnkgc3RhdGUgaWZcbiAgICAvLyBhIG5hdmlnYXRpb25JZCB3YXMgcHJlc2VudC5cblxuICAgIC8vIFRoZSBzdG9yZWQgbmF2aWdhdGlvbklkIGlzIHVzZWQgYnkgdGhlIFJvdXRlclNjcm9sbGVyIHRvIHJldHJpZXZlIHRoZSBzY3JvbGxcbiAgICAvLyBwb3NpdGlvbiBmb3IgdGhlIHBhZ2UuXG4gICAgY29uc3QgcmVzdG9yZWRTdGF0ZSA9IHN0YXRlPy5uYXZpZ2F0aW9uSWQgPyBzdGF0ZSA6IG51bGw7XG5cbiAgICAvLyBTZXBhcmF0ZSB0byBOYXZpZ2F0aW9uU3RhcnQucmVzdG9yZWRTdGF0ZSwgd2UgbXVzdCBhbHNvIHJlc3RvcmUgdGhlIHN0YXRlIHRvXG4gICAgLy8gaGlzdG9yeS5zdGF0ZSBhbmQgZ2VuZXJhdGUgYSBuZXcgbmF2aWdhdGlvbklkLCBzaW5jZSBpdCB3aWxsIGJlIG92ZXJ3cml0dGVuXG4gICAgaWYgKHN0YXRlKSB7XG4gICAgICBjb25zdCBzdGF0ZUNvcHkgPSB7Li4uc3RhdGV9IGFzIFBhcnRpYWw8UmVzdG9yZWRTdGF0ZT47XG4gICAgICBkZWxldGUgc3RhdGVDb3B5Lm5hdmlnYXRpb25JZDtcbiAgICAgIGRlbGV0ZSBzdGF0ZUNvcHkuybVyb3V0ZXJQYWdlSWQ7XG4gICAgICBpZiAoT2JqZWN0LmtleXMoc3RhdGVDb3B5KS5sZW5ndGggIT09IDApIHtcbiAgICAgICAgZXh0cmFzLnN0YXRlID0gc3RhdGVDb3B5O1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHVybFRyZWUgPSB0aGlzLnBhcnNlVXJsKHVybCk7XG4gICAgdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24odXJsVHJlZSwgc291cmNlLCByZXN0b3JlZFN0YXRlLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqIFRoZSBjdXJyZW50IFVSTC4gKi9cbiAgZ2V0IHVybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnNlcmlhbGl6ZVVybCh0aGlzLmN1cnJlbnRVcmxUcmVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IGBOYXZpZ2F0aW9uYCBvYmplY3Qgd2hlbiB0aGUgcm91dGVyIGlzIG5hdmlnYXRpbmcsXG4gICAqIGFuZCBgbnVsbGAgd2hlbiBpZGxlLlxuICAgKi9cbiAgZ2V0Q3VycmVudE5hdmlnYXRpb24oKTogTmF2aWdhdGlvbnxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuY3VycmVudE5hdmlnYXRpb247XG4gIH1cblxuICAvKipcbiAgICogVGhlIGBOYXZpZ2F0aW9uYCBvYmplY3Qgb2YgdGhlIG1vc3QgcmVjZW50IG5hdmlnYXRpb24gdG8gc3VjY2VlZCBhbmQgYG51bGxgIGlmIHRoZXJlXG4gICAqICAgICBoYXMgbm90IGJlZW4gYSBzdWNjZXNzZnVsIG5hdmlnYXRpb24geWV0LlxuICAgKi9cbiAgZ2V0IGxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbigpOiBOYXZpZ2F0aW9ufG51bGwge1xuICAgIHJldHVybiB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5sYXN0U3VjY2Vzc2Z1bE5hdmlnYXRpb247XG4gIH1cblxuICAvKipcbiAgICogUmVzZXRzIHRoZSByb3V0ZSBjb25maWd1cmF0aW9uIHVzZWQgZm9yIG5hdmlnYXRpb24gYW5kIGdlbmVyYXRpbmcgbGlua3MuXG4gICAqXG4gICAqIEBwYXJhbSBjb25maWcgVGhlIHJvdXRlIGFycmF5IGZvciB0aGUgbmV3IGNvbmZpZ3VyYXRpb24uXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIucmVzZXRDb25maWcoW1xuICAgKiAgeyBwYXRoOiAndGVhbS86aWQnLCBjb21wb25lbnQ6IFRlYW1DbXAsIGNoaWxkcmVuOiBbXG4gICAqICAgIHsgcGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wIH0sXG4gICAqICAgIHsgcGF0aDogJ3VzZXIvOm5hbWUnLCBjb21wb25lbnQ6IFVzZXJDbXAgfVxuICAgKiAgXX1cbiAgICogXSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcmVzZXRDb25maWcoY29uZmlnOiBSb3V0ZXMpOiB2b2lkIHtcbiAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJiB2YWxpZGF0ZUNvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gICAgdGhpcy5uYXZpZ2F0ZWQgPSBmYWxzZTtcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5kaXNwb3NlKCk7XG4gIH1cblxuICAvKiogRGlzcG9zZXMgb2YgdGhlIHJvdXRlci4gKi9cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5jb21wbGV0ZSgpO1xuICAgIGlmICh0aGlzLm5vblJvdXRlckN1cnJlbnRFbnRyeUNoYW5nZVN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5ub25Sb3V0ZXJDdXJyZW50RW50cnlDaGFuZ2VTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgIHRoaXMubm9uUm91dGVyQ3VycmVudEVudHJ5Q2hhbmdlU3Vic2NyaXB0aW9uID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB0aGlzLmRpc3Bvc2VkID0gdHJ1ZTtcbiAgICB0aGlzLmV2ZW50c1N1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFwcGVuZHMgVVJMIHNlZ21lbnRzIHRvIHRoZSBjdXJyZW50IFVSTCB0cmVlIHRvIGNyZWF0ZSBhIG5ldyBVUkwgdHJlZS5cbiAgICpcbiAgICogQHBhcmFtIGNvbW1hbmRzIEFuIGFycmF5IG9mIFVSTCBmcmFnbWVudHMgd2l0aCB3aGljaCB0byBjb25zdHJ1Y3QgdGhlIG5ldyBVUkwgdHJlZS5cbiAgICogSWYgdGhlIHBhdGggaXMgc3RhdGljLCBjYW4gYmUgdGhlIGxpdGVyYWwgVVJMIHN0cmluZy4gRm9yIGEgZHluYW1pYyBwYXRoLCBwYXNzIGFuIGFycmF5IG9mIHBhdGhcbiAgICogc2VnbWVudHMsIGZvbGxvd2VkIGJ5IHRoZSBwYXJhbWV0ZXJzIGZvciBlYWNoIHNlZ21lbnQuXG4gICAqIFRoZSBmcmFnbWVudHMgYXJlIGFwcGxpZWQgdG8gdGhlIGN1cnJlbnQgVVJMIHRyZWUgb3IgdGhlIG9uZSBwcm92aWRlZCAgaW4gdGhlIGByZWxhdGl2ZVRvYFxuICAgKiBwcm9wZXJ0eSBvZiB0aGUgb3B0aW9ucyBvYmplY3QsIGlmIHN1cHBsaWVkLlxuICAgKiBAcGFyYW0gbmF2aWdhdGlvbkV4dHJhcyBPcHRpb25zIHRoYXQgY29udHJvbCB0aGUgbmF2aWdhdGlvbiBzdHJhdGVneS5cbiAgICogQHJldHVybnMgVGhlIG5ldyBVUkwgdHJlZS5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogYGBgXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMy91c2VyLzExXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywgJ3VzZXInLCAxMV0pO1xuICAgKlxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzM7ZXhwYW5kPXRydWUvdXNlci8xMVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtleHBhbmQ6IHRydWV9LCAndXNlcicsIDExXSk7XG4gICAqXG4gICAqIC8vIHlvdSBjYW4gY29sbGFwc2Ugc3RhdGljIHNlZ21lbnRzIGxpa2UgdGhpcyAodGhpcyB3b3JrcyBvbmx5IHdpdGggdGhlIGZpcnN0IHBhc3NlZC1pbiB2YWx1ZSk6XG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0vMzMvdXNlcicsIHVzZXJJZF0pO1xuICAgKlxuICAgKiAvLyBJZiB0aGUgZmlyc3Qgc2VnbWVudCBjYW4gY29udGFpbiBzbGFzaGVzLCBhbmQgeW91IGRvIG5vdCB3YW50IHRoZSByb3V0ZXIgdG8gc3BsaXQgaXQsXG4gICAqIC8vIHlvdSBjYW4gZG8gdGhlIGZvbGxvd2luZzpcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoW3tzZWdtZW50UGF0aDogJy9vbmUvdHdvJ31dKTtcbiAgICpcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzLyh1c2VyLzExLy9yaWdodDpjaGF0KVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDogJ2NoYXQnfX1dKTtcbiAgICpcbiAgICogLy8gcmVtb3ZlIHRoZSByaWdodCBzZWNvbmRhcnkgbm9kZVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDogbnVsbH19XSk7XG4gICAqXG4gICAqIC8vIGFzc3VtaW5nIHRoZSBjdXJyZW50IHVybCBpcyBgL3RlYW0vMzMvdXNlci8xMWAgYW5kIHRoZSByb3V0ZSBwb2ludHMgdG8gYHVzZXIvMTFgXG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzMzL3VzZXIvMTEvZGV0YWlsc1xuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJ2RldGFpbHMnXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzMzL3VzZXIvMjJcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycuLi8yMiddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vNDQvdXNlci8yMlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy4uLy4uL3RlYW0vNDQvdXNlci8yMiddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogTm90ZSB0aGF0IGEgdmFsdWUgb2YgYG51bGxgIG9yIGB1bmRlZmluZWRgIGZvciBgcmVsYXRpdmVUb2AgaW5kaWNhdGVzIHRoYXQgdGhlXG4gICAqIHRyZWUgc2hvdWxkIGJlIGNyZWF0ZWQgcmVsYXRpdmUgdG8gdGhlIHJvb3QuXG4gICAqIGBgYFxuICAgKi9cbiAgY3JlYXRlVXJsVHJlZShjb21tYW5kczogYW55W10sIG5hdmlnYXRpb25FeHRyYXM6IFVybENyZWF0aW9uT3B0aW9ucyA9IHt9KTogVXJsVHJlZSB7XG4gICAgY29uc3Qge3JlbGF0aXZlVG8sIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCwgcXVlcnlQYXJhbXNIYW5kbGluZywgcHJlc2VydmVGcmFnbWVudH0gPVxuICAgICAgICBuYXZpZ2F0aW9uRXh0cmFzO1xuICAgIGNvbnN0IGYgPSBwcmVzZXJ2ZUZyYWdtZW50ID8gdGhpcy5jdXJyZW50VXJsVHJlZS5mcmFnbWVudCA6IGZyYWdtZW50O1xuICAgIGxldCBxOiBQYXJhbXN8bnVsbCA9IG51bGw7XG4gICAgc3dpdGNoIChxdWVyeVBhcmFtc0hhbmRsaW5nKSB7XG4gICAgICBjYXNlICdtZXJnZSc6XG4gICAgICAgIHEgPSB7Li4udGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcywgLi4ucXVlcnlQYXJhbXN9O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3ByZXNlcnZlJzpcbiAgICAgICAgcSA9IHRoaXMuY3VycmVudFVybFRyZWUucXVlcnlQYXJhbXM7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcSA9IHF1ZXJ5UGFyYW1zIHx8IG51bGw7XG4gICAgfVxuICAgIGlmIChxICE9PSBudWxsKSB7XG4gICAgICBxID0gdGhpcy5yZW1vdmVFbXB0eVByb3BzKHEpO1xuICAgIH1cblxuICAgIGxldCByZWxhdGl2ZVRvVXJsU2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXB8dW5kZWZpbmVkO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZWxhdGl2ZVRvU25hcHNob3QgPSByZWxhdGl2ZVRvID8gcmVsYXRpdmVUby5zbmFwc2hvdCA6IHRoaXMucm91dGVyU3RhdGUuc25hcHNob3Qucm9vdDtcbiAgICAgIHJlbGF0aXZlVG9VcmxTZWdtZW50R3JvdXAgPSBjcmVhdGVTZWdtZW50R3JvdXBGcm9tUm91dGUocmVsYXRpdmVUb1NuYXBzaG90KTtcbiAgICB9IGNhdGNoIChlOiB1bmtub3duKSB7XG4gICAgICAvLyBUaGlzIGlzIHN0cmljdGx5IGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSB3aXRoIHRlc3RzIHRoYXQgY3JlYXRlXG4gICAgICAvLyBpbnZhbGlkIGBBY3RpdmF0ZWRSb3V0ZWAgbW9ja3MuXG4gICAgICAvLyBOb3RlOiB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIGhhdmluZyB0aGlzIGZhbGxiYWNrIGZvciBpbnZhbGlkIGBBY3RpdmF0ZWRSb3V0ZWAgc2V0dXBzIGFuZFxuICAgICAgLy8ganVzdCB0aHJvd2luZyBpcyB+NTAwIHRlc3QgZmFpbHVyZXMuIEZpeGluZyBhbGwgb2YgdGhvc2UgdGVzdHMgYnkgaGFuZCBpcyBub3QgZmVhc2libGUgYXRcbiAgICAgIC8vIHRoZSBtb21lbnQuXG4gICAgICBpZiAodHlwZW9mIGNvbW1hbmRzWzBdICE9PSAnc3RyaW5nJyB8fCAhY29tbWFuZHNbMF0uc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICAgIC8vIE5hdmlnYXRpb25zIHRoYXQgd2VyZSBhYnNvbHV0ZSBpbiB0aGUgb2xkIHdheSBvZiBjcmVhdGluZyBVcmxUcmVlc1xuICAgICAgICAvLyB3b3VsZCBzdGlsbCB3b3JrIGJlY2F1c2UgdGhleSB3b3VsZG4ndCBhdHRlbXB0IHRvIG1hdGNoIHRoZVxuICAgICAgICAvLyBzZWdtZW50cyBpbiB0aGUgYEFjdGl2YXRlZFJvdXRlYCB0byB0aGUgYGN1cnJlbnRVcmxUcmVlYCBidXRcbiAgICAgICAgLy8gaW5zdGVhZCBqdXN0IHJlcGxhY2UgdGhlIHJvb3Qgc2VnbWVudCB3aXRoIHRoZSBuYXZpZ2F0aW9uIHJlc3VsdC5cbiAgICAgICAgLy8gTm9uLWFic29sdXRlIG5hdmlnYXRpb25zIHdvdWxkIGZhaWwgdG8gYXBwbHkgdGhlIGNvbW1hbmRzIGJlY2F1c2VcbiAgICAgICAgLy8gdGhlIGxvZ2ljIGNvdWxkIG5vdCBmaW5kIHRoZSBzZWdtZW50IHRvIHJlcGxhY2UgKHNvIHRoZXknZCBhY3QgbGlrZSB0aGVyZSB3ZXJlIG5vXG4gICAgICAgIC8vIGNvbW1hbmRzKS5cbiAgICAgICAgY29tbWFuZHMgPSBbXTtcbiAgICAgIH1cbiAgICAgIHJlbGF0aXZlVG9VcmxTZWdtZW50R3JvdXAgPSB0aGlzLmN1cnJlbnRVcmxUcmVlLnJvb3Q7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVVcmxUcmVlRnJvbVNlZ21lbnRHcm91cChyZWxhdGl2ZVRvVXJsU2VnbWVudEdyb3VwLCBjb21tYW5kcywgcSwgZiA/PyBudWxsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZXMgdG8gYSB2aWV3IHVzaW5nIGFuIGFic29sdXRlIHJvdXRlIHBhdGguXG4gICAqXG4gICAqIEBwYXJhbSB1cmwgQW4gYWJzb2x1dGUgcGF0aCBmb3IgYSBkZWZpbmVkIHJvdXRlLiBUaGUgZnVuY3Rpb24gZG9lcyBub3QgYXBwbHkgYW55IGRlbHRhIHRvIHRoZVxuICAgKiAgICAgY3VycmVudCBVUkwuXG4gICAqIEBwYXJhbSBleHRyYXMgQW4gb2JqZWN0IGNvbnRhaW5pbmcgcHJvcGVydGllcyB0aGF0IG1vZGlmeSB0aGUgbmF2aWdhdGlvbiBzdHJhdGVneS5cbiAgICpcbiAgICogQHJldHVybnMgQSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gJ3RydWUnIHdoZW4gbmF2aWdhdGlvbiBzdWNjZWVkcyxcbiAgICogdG8gJ2ZhbHNlJyB3aGVuIG5hdmlnYXRpb24gZmFpbHMsIG9yIGlzIHJlamVjdGVkIG9uIGVycm9yLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBUaGUgZm9sbG93aW5nIGNhbGxzIHJlcXVlc3QgbmF2aWdhdGlvbiB0byBhbiBhYnNvbHV0ZSBwYXRoLlxuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLm5hdmlnYXRlQnlVcmwoXCIvdGVhbS8zMy91c2VyLzExXCIpO1xuICAgKlxuICAgKiAvLyBOYXZpZ2F0ZSB3aXRob3V0IHVwZGF0aW5nIHRoZSBVUkxcbiAgICogcm91dGVyLm5hdmlnYXRlQnlVcmwoXCIvdGVhbS8zMy91c2VyLzExXCIsIHsgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKVxuICAgKlxuICAgKi9cbiAgbmF2aWdhdGVCeVVybCh1cmw6IHN0cmluZ3xVcmxUcmVlLCBleHRyYXM6IE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMgPSB7XG4gICAgc2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZVxuICB9KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkge1xuICAgICAgaWYgKHRoaXMuaXNOZ1pvbmVFbmFibGVkICYmICFOZ1pvbmUuaXNJbkFuZ3VsYXJab25lKCkpIHtcbiAgICAgICAgdGhpcy5jb25zb2xlLndhcm4oXG4gICAgICAgICAgICBgTmF2aWdhdGlvbiB0cmlnZ2VyZWQgb3V0c2lkZSBBbmd1bGFyIHpvbmUsIGRpZCB5b3UgZm9yZ2V0IHRvIGNhbGwgJ25nWm9uZS5ydW4oKSc/YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IGlzVXJsVHJlZSh1cmwpID8gdXJsIDogdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIGNvbnN0IG1lcmdlZFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodXJsVHJlZSwgdGhpcy5yYXdVcmxUcmVlKTtcblxuICAgIHJldHVybiB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbihtZXJnZWRUcmVlLCBJTVBFUkFUSVZFX05BVklHQVRJT04sIG51bGwsIGV4dHJhcyk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGUgYmFzZWQgb24gdGhlIHByb3ZpZGVkIGFycmF5IG9mIGNvbW1hbmRzIGFuZCBhIHN0YXJ0aW5nIHBvaW50LlxuICAgKiBJZiBubyBzdGFydGluZyByb3V0ZSBpcyBwcm92aWRlZCwgdGhlIG5hdmlnYXRpb24gaXMgYWJzb2x1dGUuXG4gICAqXG4gICAqIEBwYXJhbSBjb21tYW5kcyBBbiBhcnJheSBvZiBVUkwgZnJhZ21lbnRzIHdpdGggd2hpY2ggdG8gY29uc3RydWN0IHRoZSB0YXJnZXQgVVJMLlxuICAgKiBJZiB0aGUgcGF0aCBpcyBzdGF0aWMsIGNhbiBiZSB0aGUgbGl0ZXJhbCBVUkwgc3RyaW5nLiBGb3IgYSBkeW5hbWljIHBhdGgsIHBhc3MgYW4gYXJyYXkgb2YgcGF0aFxuICAgKiBzZWdtZW50cywgZm9sbG93ZWQgYnkgdGhlIHBhcmFtZXRlcnMgZm9yIGVhY2ggc2VnbWVudC5cbiAgICogVGhlIGZyYWdtZW50cyBhcmUgYXBwbGllZCB0byB0aGUgY3VycmVudCBVUkwgb3IgdGhlIG9uZSBwcm92aWRlZCAgaW4gdGhlIGByZWxhdGl2ZVRvYCBwcm9wZXJ0eVxuICAgKiBvZiB0aGUgb3B0aW9ucyBvYmplY3QsIGlmIHN1cHBsaWVkLlxuICAgKiBAcGFyYW0gZXh0cmFzIEFuIG9wdGlvbnMgb2JqZWN0IHRoYXQgZGV0ZXJtaW5lcyBob3cgdGhlIFVSTCBzaG91bGQgYmUgY29uc3RydWN0ZWQgb3JcbiAgICogICAgIGludGVycHJldGVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBBIFByb21pc2UgdGhhdCByZXNvbHZlcyB0byBgdHJ1ZWAgd2hlbiBuYXZpZ2F0aW9uIHN1Y2NlZWRzLCBvciBgZmFsc2VgIHdoZW4gbmF2aWdhdGlvblxuICAgKiAgICAgZmFpbHMuIFRoZSBQcm9taXNlIGlzIHJlamVjdGVkIHdoZW4gYW4gZXJyb3Igb2NjdXJzIGlmIGByZXNvbHZlTmF2aWdhdGlvblByb21pc2VPbkVycm9yYCBpc1xuICAgKiBub3QgYHRydWVgLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBUaGUgZm9sbG93aW5nIGNhbGxzIHJlcXVlc3QgbmF2aWdhdGlvbiB0byBhIGR5bmFtaWMgcm91dGUgcGF0aCByZWxhdGl2ZSB0byB0aGUgY3VycmVudCBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIubmF2aWdhdGUoWyd0ZWFtJywgMzMsICd1c2VyJywgMTFdLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMLCBvdmVycmlkaW5nIHRoZSBkZWZhdWx0IGJlaGF2aW9yXG4gICAqIHJvdXRlci5uYXZpZ2F0ZShbJ3RlYW0nLCAzMywgJ3VzZXInLCAxMV0sIHtyZWxhdGl2ZVRvOiByb3V0ZSwgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpXG4gICAqXG4gICAqL1xuICBuYXZpZ2F0ZShjb21tYW5kczogYW55W10sIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHtza2lwTG9jYXRpb25DaGFuZ2U6IGZhbHNlfSk6XG4gICAgICBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB2YWxpZGF0ZUNvbW1hbmRzKGNvbW1hbmRzKTtcbiAgICByZXR1cm4gdGhpcy5uYXZpZ2F0ZUJ5VXJsKHRoaXMuY3JlYXRlVXJsVHJlZShjb21tYW5kcywgZXh0cmFzKSwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKiBTZXJpYWxpemVzIGEgYFVybFRyZWVgIGludG8gYSBzdHJpbmcgKi9cbiAgc2VyaWFsaXplVXJsKHVybDogVXJsVHJlZSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodXJsKTtcbiAgfVxuXG4gIC8qKiBQYXJzZXMgYSBzdHJpbmcgaW50byBhIGBVcmxUcmVlYCAqL1xuICBwYXJzZVVybCh1cmw6IHN0cmluZyk6IFVybFRyZWUge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKHVybCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKCcvJyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciB0aGUgdXJsIGlzIGFjdGl2YXRlZC5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWRcbiAgICogVXNlIGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2AgaW5zdGVhZC5cbiAgICpcbiAgICogLSBUaGUgZXF1aXZhbGVudCBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIGZvciBgdHJ1ZWAgaXNcbiAgICogYHtwYXRoczogJ2V4YWN0JywgcXVlcnlQYXJhbXM6ICdleGFjdCcsIGZyYWdtZW50OiAnaWdub3JlZCcsIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnfWAuXG4gICAqIC0gVGhlIGVxdWl2YWxlbnQgZm9yIGBmYWxzZWAgaXNcbiAgICogYHtwYXRoczogJ3N1YnNldCcsIHF1ZXJ5UGFyYW1zOiAnc3Vic2V0JywgZnJhZ21lbnQ6ICdpZ25vcmVkJywgbWF0cml4UGFyYW1zOiAnaWdub3JlZCd9YC5cbiAgICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIGV4YWN0OiBib29sZWFuKTogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciB0aGUgdXJsIGlzIGFjdGl2YXRlZC5cbiAgICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIG1hdGNoT3B0aW9uczogSXNBY3RpdmVNYXRjaE9wdGlvbnMpOiBib29sZWFuO1xuICAvKiogQGludGVybmFsICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIG1hdGNoT3B0aW9uczogYm9vbGVhbnxJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IGJvb2xlYW47XG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIG1hdGNoT3B0aW9uczogYm9vbGVhbnxJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IGJvb2xlYW4ge1xuICAgIGxldCBvcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucztcbiAgICBpZiAobWF0Y2hPcHRpb25zID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zID0gey4uLmV4YWN0TWF0Y2hPcHRpb25zfTtcbiAgICB9IGVsc2UgaWYgKG1hdGNoT3B0aW9ucyA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMgPSB7Li4uc3Vic2V0TWF0Y2hPcHRpb25zfTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucyA9IG1hdGNoT3B0aW9ucztcbiAgICB9XG4gICAgaWYgKGlzVXJsVHJlZSh1cmwpKSB7XG4gICAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybCwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybFRyZWUsIG9wdGlvbnMpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVFbXB0eVByb3BzKHBhcmFtczogUGFyYW1zKTogUGFyYW1zIHtcbiAgICByZXR1cm4gT2JqZWN0LmVudHJpZXMocGFyYW1zKS5yZWR1Y2UoKHJlc3VsdDogUGFyYW1zLCBba2V5LCB2YWx1ZV06IFtzdHJpbmcsIGFueV0pID0+IHtcbiAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sIHt9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2NoZWR1bGVOYXZpZ2F0aW9uKFxuICAgICAgcmF3VXJsOiBVcmxUcmVlLCBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLCByZXN0b3JlZFN0YXRlOiBSZXN0b3JlZFN0YXRlfG51bGwsXG4gICAgICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMsXG4gICAgICBwcmlvclByb21pc2U/OiB7cmVzb2x2ZTogYW55LCByZWplY3Q6IGFueSwgcHJvbWlzZTogUHJvbWlzZTxib29sZWFuPn0pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShmYWxzZSk7XG4gICAgfVxuXG4gICAgbGV0IHJlc29sdmU6IGFueTtcbiAgICBsZXQgcmVqZWN0OiBhbnk7XG4gICAgbGV0IHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj47XG4gICAgaWYgKHByaW9yUHJvbWlzZSkge1xuICAgICAgcmVzb2x2ZSA9IHByaW9yUHJvbWlzZS5yZXNvbHZlO1xuICAgICAgcmVqZWN0ID0gcHJpb3JQcm9taXNlLnJlamVjdDtcbiAgICAgIHByb21pc2UgPSBwcmlvclByb21pc2UucHJvbWlzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXMsIHJlaikgPT4ge1xuICAgICAgICByZXNvbHZlID0gcmVzO1xuICAgICAgICByZWplY3QgPSByZWo7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBJbmRpY2F0ZSB0aGF0IHRoZSBuYXZpZ2F0aW9uIGlzIGhhcHBlbmluZy5cbiAgICBjb25zdCB0YXNrSWQgPSB0aGlzLnBlbmRpbmdUYXNrcy5hZGQoKTtcbiAgICBhZnRlck5leHROYXZpZ2F0aW9uKHRoaXMsICgpID0+IHtcbiAgICAgIC8vIFJlbW92ZSBwZW5kaW5nIHRhc2sgaW4gYSBtaWNyb3Rhc2sgdG8gYWxsb3cgZm9yIGNhbmNlbGxlZFxuICAgICAgLy8gaW5pdGlhbCBuYXZpZ2F0aW9ucyBhbmQgcmVkaXJlY3RzIHdpdGhpbiB0aGUgc2FtZSB0YXNrLlxuICAgICAgcXVldWVNaWNyb3Rhc2soKCkgPT4gdGhpcy5wZW5kaW5nVGFza3MucmVtb3ZlKHRhc2tJZCkpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuaGFuZGxlTmF2aWdhdGlvblJlcXVlc3Qoe1xuICAgICAgc291cmNlLFxuICAgICAgcmVzdG9yZWRTdGF0ZSxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgY3VycmVudFJhd1VybDogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIHJhd1VybCxcbiAgICAgIGV4dHJhcyxcbiAgICAgIHJlc29sdmUsXG4gICAgICByZWplY3QsXG4gICAgICBwcm9taXNlLFxuICAgICAgY3VycmVudFNuYXBzaG90OiB0aGlzLnJvdXRlclN0YXRlLnNuYXBzaG90LFxuICAgICAgY3VycmVudFJvdXRlclN0YXRlOiB0aGlzLnJvdXRlclN0YXRlXG4gICAgfSk7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhhdCB0aGUgZXJyb3IgaXMgcHJvcGFnYXRlZCBldmVuIHRob3VnaCBgcHJvY2Vzc05hdmlnYXRpb25zYCBjYXRjaFxuICAgIC8vIGhhbmRsZXIgZG9lcyBub3QgcmV0aHJvd1xuICAgIHJldHVybiBwcm9taXNlLmNhdGNoKChlOiBhbnkpID0+IHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlKTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUNvbW1hbmRzKGNvbW1hbmRzOiBzdHJpbmdbXSk6IHZvaWQge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbW1hbmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY21kID0gY29tbWFuZHNbaV07XG4gICAgaWYgKGNtZCA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuTlVMTElTSF9DT01NQU5ELFxuICAgICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmXG4gICAgICAgICAgICAgIGBUaGUgcmVxdWVzdGVkIHBhdGggY29udGFpbnMgJHtjbWR9IHNlZ21lbnQgYXQgaW5kZXggJHtpfWApO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpc1B1YmxpY1JvdXRlckV2ZW50KGU6IEV2ZW50fFByaXZhdGVSb3V0ZXJFdmVudHMpOiBlIGlzIEV2ZW50IHtcbiAgcmV0dXJuICghKGUgaW5zdGFuY2VvZiBCZWZvcmVBY3RpdmF0ZVJvdXRlcykgJiYgIShlIGluc3RhbmNlb2YgUmVkaXJlY3RSZXF1ZXN0KSk7XG59XG4iXX0=