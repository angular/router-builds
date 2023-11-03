/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { inject, Injectable, NgZone, ɵConsole as Console, ɵInitialRenderPendingTasks as InitialRenderPendingTasks, ɵRuntimeError as RuntimeError } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { createSegmentGroupFromRoute, createUrlTreeFromSegmentGroup } from './create_url_tree';
import { INPUT_BINDER } from './directives/router_outlet';
import { BeforeActivateRoutes, IMPERATIVE_NAVIGATION, NavigationCancel, NavigationEnd, RedirectRequest } from './events';
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
        this.pendingTasks = inject(InitialRenderPendingTasks);
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
                    if (e instanceof NavigationCancel && e.code !== 0 /* NavigationCancellationCode.Redirect */ &&
                        e.code !== 1 /* NavigationCancellationCode.SupersededByNewNavigation */) {
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
        if (!this.nonRouterCurrentEntryChangeSubscription) {
            this.nonRouterCurrentEntryChangeSubscription =
                this.stateManager.registerNonRouterCurrentEntryChangeListener((url, state) => {
                    // The `setTimeout` was added in #12160 and is likely to support Angular/AngularJS
                    // hybrid apps.
                    setTimeout(() => {
                        this.navigateToSyncWithBrowser(url, 'popstate', state);
                    }, 0);
                });
        }
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
     * @returns A Promise that resolves to `true` when navigation succeeds, to `false` when navigation
     *     fails,
     * or is rejected on error.
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
        return Object.keys(params).reduce((result, key) => {
            const value = params[key];
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.0.0-rc.2+sha-a2ba548", ngImport: i0, type: Router, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.0.0-rc.2+sha-a2ba548", ngImport: i0, type: Router, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.0.0-rc.2+sha-a2ba548", ngImport: i0, type: Router, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBUSxRQUFRLElBQUksT0FBTyxFQUFFLDBCQUEwQixJQUFJLHlCQUF5QixFQUFFLGFBQWEsSUFBSSxZQUFZLEVBQXdCLE1BQU0sZUFBZSxDQUFDO0FBQ25NLE9BQU8sRUFBYSxPQUFPLEVBQUUsWUFBWSxFQUFtQixNQUFNLE1BQU0sQ0FBQztBQUV6RSxPQUFPLEVBQUMsMkJBQTJCLEVBQUUsNkJBQTZCLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUM3RixPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFFeEQsT0FBTyxFQUFDLG9CQUFvQixFQUFTLHFCQUFxQixFQUFFLGdCQUFnQixFQUE4QixhQUFhLEVBQTBDLGVBQWUsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUVsTSxPQUFPLEVBQUMsNEJBQTRCLEVBQWdDLHFCQUFxQixFQUFvQyxNQUFNLHlCQUF5QixDQUFDO0FBQzdKLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBQzFELE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3JELE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUU5QyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sOEJBQThCLENBQUM7QUFDMUQsT0FBTyxFQUFDLG1CQUFtQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDNUQsT0FBTyxFQUFDLFlBQVksRUFBd0IsU0FBUyxFQUFtQixhQUFhLEVBQVUsTUFBTSxZQUFZLENBQUM7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QztTQUNyRTtLQUNGO0FBQ0gsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsQ0FBNEI7SUFDdkQsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxZQUFZLGVBQWUsQ0FBQyxDQUFDLENBQUM7QUFDbkYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtpbmplY3QsIEluamVjdGFibGUsIE5nWm9uZSwgVHlwZSwgybVDb25zb2xlIGFzIENvbnNvbGUsIMm1SW5pdGlhbFJlbmRlclBlbmRpbmdUYXNrcyBhcyBJbml0aWFsUmVuZGVyUGVuZGluZ1Rhc2tzLCDJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3IsIMm1V3JpdGFibGUgYXMgV3JpdGFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBTdWJqZWN0LCBTdWJzY3JpcHRpb24sIFN1YnNjcmlwdGlvbkxpa2V9IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge2NyZWF0ZVNlZ21lbnRHcm91cEZyb21Sb3V0ZSwgY3JlYXRlVXJsVHJlZUZyb21TZWdtZW50R3JvdXB9IGZyb20gJy4vY3JlYXRlX3VybF90cmVlJztcbmltcG9ydCB7SU5QVVRfQklOREVSfSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX291dGxldCc7XG5pbXBvcnQge1J1bnRpbWVFcnJvckNvZGV9IGZyb20gJy4vZXJyb3JzJztcbmltcG9ydCB7QmVmb3JlQWN0aXZhdGVSb3V0ZXMsIEV2ZW50LCBJTVBFUkFUSVZFX05BVklHQVRJT04sIE5hdmlnYXRpb25DYW5jZWwsIE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLCBOYXZpZ2F0aW9uRW5kLCBOYXZpZ2F0aW9uVHJpZ2dlciwgUHJpdmF0ZVJvdXRlckV2ZW50cywgUmVkaXJlY3RSZXF1ZXN0fSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge05hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMsIE9uU2FtZVVybE5hdmlnYXRpb24sIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtpc0Jyb3dzZXJUcmlnZ2VyZWROYXZpZ2F0aW9uLCBOYXZpZ2F0aW9uLCBOYXZpZ2F0aW9uRXh0cmFzLCBOYXZpZ2F0aW9uVHJhbnNpdGlvbnMsIFJlc3RvcmVkU3RhdGUsIFVybENyZWF0aW9uT3B0aW9uc30gZnJvbSAnLi9uYXZpZ2F0aW9uX3RyYW5zaXRpb24nO1xuaW1wb3J0IHtSb3V0ZVJldXNlU3RyYXRlZ3l9IGZyb20gJy4vcm91dGVfcmV1c2Vfc3RyYXRlZ3knO1xuaW1wb3J0IHtST1VURVJfQ09ORklHVVJBVElPTn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnJztcbmltcG9ydCB7Uk9VVEVTfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7UGFyYW1zfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge1N0YXRlTWFuYWdlcn0gZnJvbSAnLi9zdGF0ZW1hbmFnZXIvc3RhdGVfbWFuYWdlcic7XG5pbXBvcnQge1VybEhhbmRsaW5nU3RyYXRlZ3l9IGZyb20gJy4vdXJsX2hhbmRsaW5nX3N0cmF0ZWd5JztcbmltcG9ydCB7Y29udGFpbnNUcmVlLCBJc0FjdGl2ZU1hdGNoT3B0aW9ucywgaXNVcmxUcmVlLCBVcmxTZWdtZW50R3JvdXAsIFVybFNlcmlhbGl6ZXIsIFVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtzdGFuZGFyZGl6ZUNvbmZpZywgdmFsaWRhdGVDb25maWd9IGZyb20gJy4vdXRpbHMvY29uZmlnJztcbmltcG9ydCB7YWZ0ZXJOZXh0TmF2aWdhdGlvbn0gZnJvbSAnLi91dGlscy9uYXZpZ2F0aW9ucyc7XG5cblxuXG5mdW5jdGlvbiBkZWZhdWx0RXJyb3JIYW5kbGVyKGVycm9yOiBhbnkpOiBuZXZlciB7XG4gIHRocm93IGVycm9yO1xufVxuXG4vKipcbiAqIFRoZSBlcXVpdmFsZW50IGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2Agb3B0aW9ucyBmb3IgYFJvdXRlci5pc0FjdGl2ZWAgaXMgY2FsbGVkIHdpdGggYHRydWVgXG4gKiAoZXhhY3QgPSB0cnVlKS5cbiAqL1xuZXhwb3J0IGNvbnN0IGV4YWN0TWF0Y2hPcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucyA9IHtcbiAgcGF0aHM6ICdleGFjdCcsXG4gIGZyYWdtZW50OiAnaWdub3JlZCcsXG4gIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnLFxuICBxdWVyeVBhcmFtczogJ2V4YWN0J1xufTtcblxuLyoqXG4gKiBUaGUgZXF1aXZhbGVudCBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIG9wdGlvbnMgZm9yIGBSb3V0ZXIuaXNBY3RpdmVgIGlzIGNhbGxlZCB3aXRoIGBmYWxzZWBcbiAqIChleGFjdCA9IGZhbHNlKS5cbiAqL1xuZXhwb3J0IGNvbnN0IHN1YnNldE1hdGNoT3B0aW9uczogSXNBY3RpdmVNYXRjaE9wdGlvbnMgPSB7XG4gIHBhdGhzOiAnc3Vic2V0JyxcbiAgZnJhZ21lbnQ6ICdpZ25vcmVkJyxcbiAgbWF0cml4UGFyYW1zOiAnaWdub3JlZCcsXG4gIHF1ZXJ5UGFyYW1zOiAnc3Vic2V0J1xufTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBBIHNlcnZpY2UgdGhhdCBwcm92aWRlcyBuYXZpZ2F0aW9uIGFtb25nIHZpZXdzIGFuZCBVUkwgbWFuaXB1bGF0aW9uIGNhcGFiaWxpdGllcy5cbiAqXG4gKiBAc2VlIHtAbGluayBSb3V0ZX1cbiAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gR3VpZGVdKGd1aWRlL3JvdXRlcikuXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgUm91dGVyIHtcbiAgcHJpdmF0ZSBnZXQgY3VycmVudFVybFRyZWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVNYW5hZ2VyLmdldEN1cnJlbnRVcmxUcmVlKCk7XG4gIH1cbiAgcHJpdmF0ZSBnZXQgcmF3VXJsVHJlZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZU1hbmFnZXIuZ2V0UmF3VXJsVHJlZSgpO1xuICB9XG4gIHByaXZhdGUgZGlzcG9zZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBub25Sb3V0ZXJDdXJyZW50RW50cnlDaGFuZ2VTdWJzY3JpcHRpb24/OiBTdWJzY3JpcHRpb25MaWtlO1xuICBwcml2YXRlIGlzTmdab25lRW5hYmxlZCA9IGZhbHNlO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgY29uc29sZSA9IGluamVjdChDb25zb2xlKTtcbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0ZU1hbmFnZXIgPSBpbmplY3QoU3RhdGVNYW5hZ2VyKTtcbiAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zID0gaW5qZWN0KFJPVVRFUl9DT05GSUdVUkFUSU9OLCB7b3B0aW9uYWw6IHRydWV9KSB8fCB7fTtcbiAgcHJpdmF0ZSByZWFkb25seSBwZW5kaW5nVGFza3MgPSBpbmplY3QoSW5pdGlhbFJlbmRlclBlbmRpbmdUYXNrcyk7XG4gIHByaXZhdGUgcmVhZG9ubHkgdXJsVXBkYXRlU3RyYXRlZ3kgPSB0aGlzLm9wdGlvbnMudXJsVXBkYXRlU3RyYXRlZ3kgfHwgJ2RlZmVycmVkJztcbiAgcHJpdmF0ZSByZWFkb25seSBuYXZpZ2F0aW9uVHJhbnNpdGlvbnMgPSBpbmplY3QoTmF2aWdhdGlvblRyYW5zaXRpb25zKTtcbiAgcHJpdmF0ZSByZWFkb25seSB1cmxTZXJpYWxpemVyID0gaW5qZWN0KFVybFNlcmlhbGl6ZXIpO1xuICBwcml2YXRlIHJlYWRvbmx5IGxvY2F0aW9uID0gaW5qZWN0KExvY2F0aW9uKTtcbiAgcHJpdmF0ZSByZWFkb25seSB1cmxIYW5kbGluZ1N0cmF0ZWd5ID0gaW5qZWN0KFVybEhhbmRsaW5nU3RyYXRlZ3kpO1xuXG4gIC8qKlxuICAgKiBUaGUgcHJpdmF0ZSBgU3ViamVjdGAgdHlwZSBmb3IgdGhlIHB1YmxpYyBldmVudHMgZXhwb3NlZCBpbiB0aGUgZ2V0dGVyLiBUaGlzIGlzIHVzZWQgaW50ZXJuYWxseVxuICAgKiB0byBwdXNoIGV2ZW50cyB0by4gVGhlIHNlcGFyYXRlIGZpZWxkIGFsbG93cyB1cyB0byBleHBvc2Ugc2VwYXJhdGUgdHlwZXMgaW4gdGhlIHB1YmxpYyBBUElcbiAgICogKGkuZS4sIGFuIE9ic2VydmFibGUgcmF0aGVyIHRoYW4gdGhlIFN1YmplY3QpLlxuICAgKi9cbiAgcHJpdmF0ZSBfZXZlbnRzID0gbmV3IFN1YmplY3Q8RXZlbnQ+KCk7XG4gIC8qKlxuICAgKiBBbiBldmVudCBzdHJlYW0gZm9yIHJvdXRpbmcgZXZlbnRzLlxuICAgKi9cbiAgcHVibGljIGdldCBldmVudHMoKTogT2JzZXJ2YWJsZTxFdmVudD4ge1xuICAgIC8vIFRPRE8oYXRzY290dCk6IFRoaXMgX3Nob3VsZF8gYmUgZXZlbnRzLmFzT2JzZXJ2YWJsZSgpLiBIb3dldmVyLCB0aGlzIGNoYW5nZSByZXF1aXJlcyBpbnRlcm5hbFxuICAgIC8vIGNsZWFudXA6IHRlc3RzIGFyZSBkb2luZyBgKHJvdXRlLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PikubmV4dCguLi4pYC4gVGhpcyBpc24ndFxuICAgIC8vIGFsbG93ZWQvc3VwcG9ydGVkIGJ1dCB3ZSBzdGlsbCBoYXZlIHRvIGZpeCB0aGVzZSBvciBmaWxlIGJ1Z3MgYWdhaW5zdCB0aGUgdGVhbXMgYmVmb3JlIG1ha2luZ1xuICAgIC8vIHRoZSBjaGFuZ2UuXG4gICAgcmV0dXJuIHRoaXMuX2V2ZW50cztcbiAgfVxuICAvKipcbiAgICogVGhlIGN1cnJlbnQgc3RhdGUgb2Ygcm91dGluZyBpbiB0aGlzIE5nTW9kdWxlLlxuICAgKi9cbiAgZ2V0IHJvdXRlclN0YXRlKCkge1xuICAgIHJldHVybiB0aGlzLnN0YXRlTWFuYWdlci5nZXRSb3V0ZXJTdGF0ZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgaGFuZGxlciBmb3IgbmF2aWdhdGlvbiBlcnJvcnMgaW4gdGhpcyBOZ01vZHVsZS5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgU3Vic2NyaWJlIHRvIHRoZSBgUm91dGVyYCBldmVudHMgYW5kIHdhdGNoIGZvciBgTmF2aWdhdGlvbkVycm9yYCBpbnN0ZWFkLlxuICAgKiAgIGBwcm92aWRlUm91dGVyYCBoYXMgdGhlIGB3aXRoTmF2aWdhdGlvbkVycm9ySGFuZGxlcmAgZmVhdHVyZSB0byBtYWtlIHRoaXMgZWFzaWVyLlxuICAgKiBAc2VlIHtAbGluayB3aXRoTmF2aWdhdGlvbkVycm9ySGFuZGxlcn1cbiAgICovXG4gIGVycm9ySGFuZGxlcjogKGVycm9yOiBhbnkpID0+IGFueSA9IHRoaXMub3B0aW9ucy5lcnJvckhhbmRsZXIgfHwgZGVmYXVsdEVycm9ySGFuZGxlcjtcblxuICAvKipcbiAgICogVHJ1ZSBpZiBhdCBsZWFzdCBvbmUgbmF2aWdhdGlvbiBldmVudCBoYXMgb2NjdXJyZWQsXG4gICAqIGZhbHNlIG90aGVyd2lzZS5cbiAgICovXG4gIG5hdmlnYXRlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBBIHN0cmF0ZWd5IGZvciByZS11c2luZyByb3V0ZXMuXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIENvbmZpZ3VyZSB1c2luZyBgcHJvdmlkZXJzYCBpbnN0ZWFkOlxuICAgKiAgIGB7cHJvdmlkZTogUm91dGVSZXVzZVN0cmF0ZWd5LCB1c2VDbGFzczogTXlTdHJhdGVneX1gLlxuICAgKi9cbiAgcm91dGVSZXVzZVN0cmF0ZWd5OiBSb3V0ZVJldXNlU3RyYXRlZ3kgPSBpbmplY3QoUm91dGVSZXVzZVN0cmF0ZWd5KTtcblxuICAvKipcbiAgICogSG93IHRvIGhhbmRsZSBhIG5hdmlnYXRpb24gcmVxdWVzdCB0byB0aGUgY3VycmVudCBVUkwuXG4gICAqXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIENvbmZpZ3VyZSB0aGlzIHRocm91Z2ggYHByb3ZpZGVSb3V0ZXJgIG9yIGBSb3V0ZXJNb2R1bGUuZm9yUm9vdGAgaW5zdGVhZC5cbiAgICogQHNlZSB7QGxpbmsgd2l0aFJvdXRlckNvbmZpZ31cbiAgICogQHNlZSB7QGxpbmsgcHJvdmlkZVJvdXRlcn1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyTW9kdWxlfVxuICAgKi9cbiAgb25TYW1lVXJsTmF2aWdhdGlvbjogT25TYW1lVXJsTmF2aWdhdGlvbiA9IHRoaXMub3B0aW9ucy5vblNhbWVVcmxOYXZpZ2F0aW9uIHx8ICdpZ25vcmUnO1xuXG4gIGNvbmZpZzogUm91dGVzID0gaW5qZWN0KFJPVVRFUywge29wdGlvbmFsOiB0cnVlfSk/LmZsYXQoKSA/PyBbXTtcblxuICAvKipcbiAgICogSW5kaWNhdGVzIHdoZXRoZXIgdGhlIGFwcGxpY2F0aW9uIGhhcyBvcHRlZCBpbiB0byBiaW5kaW5nIFJvdXRlciBkYXRhIHRvIGNvbXBvbmVudCBpbnB1dHMuXG4gICAqXG4gICAqIFRoaXMgb3B0aW9uIGlzIGVuYWJsZWQgYnkgdGhlIGB3aXRoQ29tcG9uZW50SW5wdXRCaW5kaW5nYCBmZWF0dXJlIG9mIGBwcm92aWRlUm91dGVyYCBvclxuICAgKiBgYmluZFRvQ29tcG9uZW50SW5wdXRzYCBpbiB0aGUgYEV4dHJhT3B0aW9uc2Agb2YgYFJvdXRlck1vZHVsZS5mb3JSb290YC5cbiAgICovXG4gIHJlYWRvbmx5IGNvbXBvbmVudElucHV0QmluZGluZ0VuYWJsZWQ6IGJvb2xlYW4gPSAhIWluamVjdChJTlBVVF9CSU5ERVIsIHtvcHRpb25hbDogdHJ1ZX0pO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuaXNOZ1pvbmVFbmFibGVkID0gaW5qZWN0KE5nWm9uZSkgaW5zdGFuY2VvZiBOZ1pvbmUgJiYgTmdab25lLmlzSW5Bbmd1bGFyWm9uZSgpO1xuXG4gICAgdGhpcy5yZXNldENvbmZpZyh0aGlzLmNvbmZpZyk7XG5cbiAgICB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5zZXR1cE5hdmlnYXRpb25zKHRoaXMsIHRoaXMuY3VycmVudFVybFRyZWUsIHRoaXMucm91dGVyU3RhdGUpXG4gICAgICAgIC5zdWJzY3JpYmUoe1xuICAgICAgICAgIGVycm9yOiAoZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5jb25zb2xlLndhcm4obmdEZXZNb2RlID8gYFVuaGFuZGxlZCBOYXZpZ2F0aW9uIEVycm9yOiAke2V9YCA6IGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgdGhpcy5zdWJzY3JpYmVUb05hdmlnYXRpb25FdmVudHMoKTtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBldmVudHNTdWJzY3JpcHRpb24gPSBuZXcgU3Vic2NyaXB0aW9uKCk7XG4gIHByaXZhdGUgc3Vic2NyaWJlVG9OYXZpZ2F0aW9uRXZlbnRzKCkge1xuICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmV2ZW50cy5zdWJzY3JpYmUoZSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBjdXJyZW50VHJhbnNpdGlvbiA9IHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmN1cnJlbnRUcmFuc2l0aW9uO1xuICAgICAgICBjb25zdCBjdXJyZW50TmF2aWdhdGlvbiA9IHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmN1cnJlbnROYXZpZ2F0aW9uO1xuICAgICAgICBpZiAoY3VycmVudFRyYW5zaXRpb24gIT09IG51bGwgJiYgY3VycmVudE5hdmlnYXRpb24gIT09IG51bGwpIHtcbiAgICAgICAgICB0aGlzLnN0YXRlTWFuYWdlci5oYW5kbGVSb3V0ZXJFdmVudChlLCBjdXJyZW50TmF2aWdhdGlvbik7XG4gICAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uQ2FuY2VsICYmIGUuY29kZSAhPT0gTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuUmVkaXJlY3QgJiZcbiAgICAgICAgICAgICAgZS5jb2RlICE9PSBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZS5TdXBlcnNlZGVkQnlOZXdOYXZpZ2F0aW9uKSB7XG4gICAgICAgICAgICAvLyBJdCBzZWVtcyB3ZWlyZCB0aGF0IGBuYXZpZ2F0ZWRgIGlzIHNldCB0byBgdHJ1ZWAgd2hlbiB0aGUgbmF2aWdhdGlvbiBpcyByZWplY3RlZCxcbiAgICAgICAgICAgIC8vIGhvd2V2ZXIgaXQncyBob3cgdGhpbmdzIHdlcmUgd3JpdHRlbiBpbml0aWFsbHkuIEludmVzdGlnYXRpb24gd291bGQgbmVlZCB0byBiZSBkb25lXG4gICAgICAgICAgICAvLyB0byBkZXRlcm1pbmUgaWYgdGhpcyBjYW4gYmUgcmVtb3ZlZC5cbiAgICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICAgICAgICB0aGlzLm5hdmlnYXRlZCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgUmVkaXJlY3RSZXF1ZXN0KSB7XG4gICAgICAgICAgICBjb25zdCBtZXJnZWRUcmVlID1cbiAgICAgICAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UoZS51cmwsIGN1cnJlbnRUcmFuc2l0aW9uLmN1cnJlbnRSYXdVcmwpO1xuICAgICAgICAgICAgY29uc3QgZXh0cmFzID0ge1xuICAgICAgICAgICAgICBza2lwTG9jYXRpb25DaGFuZ2U6IGN1cnJlbnRUcmFuc2l0aW9uLmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UsXG4gICAgICAgICAgICAgIC8vIFRoZSBVUkwgaXMgYWxyZWFkeSB1cGRhdGVkIGF0IHRoaXMgcG9pbnQgaWYgd2UgaGF2ZSAnZWFnZXInIFVSTFxuICAgICAgICAgICAgICAvLyB1cGRhdGVzIG9yIGlmIHRoZSBuYXZpZ2F0aW9uIHdhcyB0cmlnZ2VyZWQgYnkgdGhlIGJyb3dzZXIgKGJhY2tcbiAgICAgICAgICAgICAgLy8gYnV0dG9uLCBVUkwgYmFyLCBldGMpLiBXZSB3YW50IHRvIHJlcGxhY2UgdGhhdCBpdGVtIGluIGhpc3RvcnlcbiAgICAgICAgICAgICAgLy8gaWYgdGhlIG5hdmlnYXRpb24gaXMgcmVqZWN0ZWQuXG4gICAgICAgICAgICAgIHJlcGxhY2VVcmw6IHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcicgfHxcbiAgICAgICAgICAgICAgICAgIGlzQnJvd3NlclRyaWdnZXJlZE5hdmlnYXRpb24oY3VycmVudFRyYW5zaXRpb24uc291cmNlKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24obWVyZ2VkVHJlZSwgSU1QRVJBVElWRV9OQVZJR0FUSU9OLCBudWxsLCBleHRyYXMsIHtcbiAgICAgICAgICAgICAgcmVzb2x2ZTogY3VycmVudFRyYW5zaXRpb24ucmVzb2x2ZSxcbiAgICAgICAgICAgICAgcmVqZWN0OiBjdXJyZW50VHJhbnNpdGlvbi5yZWplY3QsXG4gICAgICAgICAgICAgIHByb21pc2U6IGN1cnJlbnRUcmFuc2l0aW9uLnByb21pc2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBOb3RlIHRoYXQgaXQncyBpbXBvcnRhbnQgdG8gaGF2ZSB0aGUgUm91dGVyIHByb2Nlc3MgdGhlIGV2ZW50cyBfYmVmb3JlXyB0aGUgZXZlbnQgaXNcbiAgICAgICAgLy8gcHVzaGVkIHRocm91Z2ggdGhlIHB1YmxpYyBvYnNlcnZhYmxlLiBUaGlzIGVuc3VyZXMgdGhlIGNvcnJlY3Qgcm91dGVyIHN0YXRlIGlzIGluIHBsYWNlXG4gICAgICAgIC8vIGJlZm9yZSBhcHBsaWNhdGlvbnMgb2JzZXJ2ZSB0aGUgZXZlbnRzLlxuICAgICAgICBpZiAoaXNQdWJsaWNSb3V0ZXJFdmVudChlKSkge1xuICAgICAgICAgIHRoaXMuX2V2ZW50cy5uZXh0KGUpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlOiB1bmtub3duKSB7XG4gICAgICAgIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLnRyYW5zaXRpb25BYm9ydFN1YmplY3QubmV4dChlIGFzIEVycm9yKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmV2ZW50c1N1YnNjcmlwdGlvbi5hZGQoc3Vic2NyaXB0aW9uKTtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcmVzZXRSb290Q29tcG9uZW50VHlwZShyb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+KTogdm9pZCB7XG4gICAgLy8gVE9ETzogdnNhdmtpbiByb3V0ZXIgNC4wIHNob3VsZCBtYWtlIHRoZSByb290IGNvbXBvbmVudCBzZXQgdG8gbnVsbFxuICAgIC8vIHRoaXMgd2lsbCBzaW1wbGlmeSB0aGUgbGlmZWN5Y2xlIG9mIHRoZSByb3V0ZXIuXG4gICAgdGhpcy5yb3V0ZXJTdGF0ZS5yb290LmNvbXBvbmVudCA9IHJvb3RDb21wb25lbnRUeXBlO1xuICAgIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLnJvb3RDb21wb25lbnRUeXBlID0gcm9vdENvbXBvbmVudFR5cGU7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyIGFuZCBwZXJmb3JtcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaW5pdGlhbE5hdmlnYXRpb24oKTogdm9pZCB7XG4gICAgdGhpcy5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICBpZiAoIXRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmhhc1JlcXVlc3RlZE5hdmlnYXRpb24pIHtcbiAgICAgIHRoaXMubmF2aWdhdGVUb1N5bmNXaXRoQnJvd3NlcihcbiAgICAgICAgICB0aGlzLmxvY2F0aW9uLnBhdGgodHJ1ZSksIElNUEVSQVRJVkVfTkFWSUdBVElPTiwgdGhpcy5zdGF0ZU1hbmFnZXIucmVzdG9yZWRTdGF0ZSgpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyLiBUaGlzIGxpc3RlbmVyIGRldGVjdHMgbmF2aWdhdGlvbnMgdHJpZ2dlcmVkIGZyb20gb3V0c2lkZVxuICAgKiB0aGUgUm91dGVyICh0aGUgYnJvd3NlciBiYWNrL2ZvcndhcmQgYnV0dG9ucywgZm9yIGV4YW1wbGUpIGFuZCBzY2hlZHVsZXMgYSBjb3JyZXNwb25kaW5nIFJvdXRlclxuICAgKiBuYXZpZ2F0aW9uIHNvIHRoYXQgdGhlIGNvcnJlY3QgZXZlbnRzLCBndWFyZHMsIGV0Yy4gYXJlIHRyaWdnZXJlZC5cbiAgICovXG4gIHNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpOiB2b2lkIHtcbiAgICAvLyBEb24ndCBuZWVkIHRvIHVzZSBab25lLndyYXAgYW55IG1vcmUsIGJlY2F1c2Ugem9uZS5qc1xuICAgIC8vIGFscmVhZHkgcGF0Y2ggb25Qb3BTdGF0ZSwgc28gbG9jYXRpb24gY2hhbmdlIGNhbGxiYWNrIHdpbGxcbiAgICAvLyBydW4gaW50byBuZ1pvbmVcbiAgICBpZiAoIXRoaXMubm9uUm91dGVyQ3VycmVudEVudHJ5Q2hhbmdlU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLm5vblJvdXRlckN1cnJlbnRFbnRyeUNoYW5nZVN1YnNjcmlwdGlvbiA9XG4gICAgICAgICAgdGhpcy5zdGF0ZU1hbmFnZXIucmVnaXN0ZXJOb25Sb3V0ZXJDdXJyZW50RW50cnlDaGFuZ2VMaXN0ZW5lcigodXJsLCBzdGF0ZSkgPT4ge1xuICAgICAgICAgICAgLy8gVGhlIGBzZXRUaW1lb3V0YCB3YXMgYWRkZWQgaW4gIzEyMTYwIGFuZCBpcyBsaWtlbHkgdG8gc3VwcG9ydCBBbmd1bGFyL0FuZ3VsYXJKU1xuICAgICAgICAgICAgLy8gaHlicmlkIGFwcHMuXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgdGhpcy5uYXZpZ2F0ZVRvU3luY1dpdGhCcm93c2VyKHVybCwgJ3BvcHN0YXRlJywgc3RhdGUpO1xuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNjaGVkdWxlcyBhIHJvdXRlciBuYXZpZ2F0aW9uIHRvIHN5bmNocm9uaXplIFJvdXRlciBzdGF0ZSB3aXRoIHRoZSBicm93c2VyIHN0YXRlLlxuICAgKlxuICAgKiBUaGlzIGlzIGRvbmUgYXMgYSByZXNwb25zZSB0byBhIHBvcHN0YXRlIGV2ZW50IGFuZCB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLiBUaGVzZVxuICAgKiB0d28gc2NlbmFyaW9zIHJlcHJlc2VudCB0aW1lcyB3aGVuIHRoZSBicm93c2VyIFVSTC9zdGF0ZSBoYXMgYmVlbiB1cGRhdGVkIGFuZFxuICAgKiB0aGUgUm91dGVyIG5lZWRzIHRvIHJlc3BvbmQgdG8gZW5zdXJlIGl0cyBpbnRlcm5hbCBzdGF0ZSBtYXRjaGVzLlxuICAgKi9cbiAgcHJpdmF0ZSBuYXZpZ2F0ZVRvU3luY1dpdGhCcm93c2VyKFxuICAgICAgdXJsOiBzdHJpbmcsIHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIsIHN0YXRlOiBSZXN0b3JlZFN0YXRlfG51bGx8dW5kZWZpbmVkKSB7XG4gICAgY29uc3QgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3JlcGxhY2VVcmw6IHRydWV9O1xuXG4gICAgLy8gVE9ETzogcmVzdG9yZWRTdGF0ZSBzaG91bGQgYWx3YXlzIGluY2x1ZGUgdGhlIGVudGlyZSBzdGF0ZSwgcmVnYXJkbGVzc1xuICAgIC8vIG9mIG5hdmlnYXRpb25JZC4gVGhpcyByZXF1aXJlcyBhIGJyZWFraW5nIGNoYW5nZSB0byB1cGRhdGUgdGhlIHR5cGUgb25cbiAgICAvLyBOYXZpZ2F0aW9uU3RhcnTigJlzIHJlc3RvcmVkU3RhdGUsIHdoaWNoIGN1cnJlbnRseSByZXF1aXJlcyBuYXZpZ2F0aW9uSWRcbiAgICAvLyB0byBhbHdheXMgYmUgcHJlc2VudC4gVGhlIFJvdXRlciB1c2VkIHRvIG9ubHkgcmVzdG9yZSBoaXN0b3J5IHN0YXRlIGlmXG4gICAgLy8gYSBuYXZpZ2F0aW9uSWQgd2FzIHByZXNlbnQuXG5cbiAgICAvLyBUaGUgc3RvcmVkIG5hdmlnYXRpb25JZCBpcyB1c2VkIGJ5IHRoZSBSb3V0ZXJTY3JvbGxlciB0byByZXRyaWV2ZSB0aGUgc2Nyb2xsXG4gICAgLy8gcG9zaXRpb24gZm9yIHRoZSBwYWdlLlxuICAgIGNvbnN0IHJlc3RvcmVkU3RhdGUgPSBzdGF0ZT8ubmF2aWdhdGlvbklkID8gc3RhdGUgOiBudWxsO1xuXG4gICAgLy8gU2VwYXJhdGUgdG8gTmF2aWdhdGlvblN0YXJ0LnJlc3RvcmVkU3RhdGUsIHdlIG11c3QgYWxzbyByZXN0b3JlIHRoZSBzdGF0ZSB0b1xuICAgIC8vIGhpc3Rvcnkuc3RhdGUgYW5kIGdlbmVyYXRlIGEgbmV3IG5hdmlnYXRpb25JZCwgc2luY2UgaXQgd2lsbCBiZSBvdmVyd3JpdHRlblxuICAgIGlmIChzdGF0ZSkge1xuICAgICAgY29uc3Qgc3RhdGVDb3B5ID0gey4uLnN0YXRlfSBhcyBQYXJ0aWFsPFJlc3RvcmVkU3RhdGU+O1xuICAgICAgZGVsZXRlIHN0YXRlQ29weS5uYXZpZ2F0aW9uSWQ7XG4gICAgICBkZWxldGUgc3RhdGVDb3B5Lsm1cm91dGVyUGFnZUlkO1xuICAgICAgaWYgKE9iamVjdC5rZXlzKHN0YXRlQ29weSkubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgIGV4dHJhcy5zdGF0ZSA9IHN0YXRlQ29weTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKHVybFRyZWUsIHNvdXJjZSwgcmVzdG9yZWRTdGF0ZSwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKiBUaGUgY3VycmVudCBVUkwuICovXG4gIGdldCB1cmwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5zZXJpYWxpemVVcmwodGhpcy5jdXJyZW50VXJsVHJlZSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgY3VycmVudCBgTmF2aWdhdGlvbmAgb2JqZWN0IHdoZW4gdGhlIHJvdXRlciBpcyBuYXZpZ2F0aW5nLFxuICAgKiBhbmQgYG51bGxgIHdoZW4gaWRsZS5cbiAgICovXG4gIGdldEN1cnJlbnROYXZpZ2F0aW9uKCk6IE5hdmlnYXRpb258bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmN1cnJlbnROYXZpZ2F0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBgTmF2aWdhdGlvbmAgb2JqZWN0IG9mIHRoZSBtb3N0IHJlY2VudCBuYXZpZ2F0aW9uIHRvIHN1Y2NlZWQgYW5kIGBudWxsYCBpZiB0aGVyZVxuICAgKiAgICAgaGFzIG5vdCBiZWVuIGEgc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uIHlldC5cbiAgICovXG4gIGdldCBsYXN0U3VjY2Vzc2Z1bE5hdmlnYXRpb24oKTogTmF2aWdhdGlvbnxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMubGFzdFN1Y2Nlc3NmdWxOYXZpZ2F0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0cyB0aGUgcm91dGUgY29uZmlndXJhdGlvbiB1c2VkIGZvciBuYXZpZ2F0aW9uIGFuZCBnZW5lcmF0aW5nIGxpbmtzLlxuICAgKlxuICAgKiBAcGFyYW0gY29uZmlnIFRoZSByb3V0ZSBhcnJheSBmb3IgdGhlIG5ldyBjb25maWd1cmF0aW9uLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLnJlc2V0Q29uZmlnKFtcbiAgICogIHsgcGF0aDogJ3RlYW0vOmlkJywgY29tcG9uZW50OiBUZWFtQ21wLCBjaGlsZHJlbjogW1xuICAgKiAgICB7IHBhdGg6ICdzaW1wbGUnLCBjb21wb25lbnQ6IFNpbXBsZUNtcCB9LFxuICAgKiAgICB7IHBhdGg6ICd1c2VyLzpuYW1lJywgY29tcG9uZW50OiBVc2VyQ21wIH1cbiAgICogIF19XG4gICAqIF0pO1xuICAgKiBgYGBcbiAgICovXG4gIHJlc2V0Q29uZmlnKGNvbmZpZzogUm91dGVzKTogdm9pZCB7XG4gICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiYgdmFsaWRhdGVDb25maWcoY29uZmlnKTtcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZy5tYXAoc3RhbmRhcmRpemVDb25maWcpO1xuICAgIHRoaXMubmF2aWdhdGVkID0gZmFsc2U7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuZGlzcG9zZSgpO1xuICB9XG5cbiAgLyoqIERpc3Bvc2VzIG9mIHRoZSByb3V0ZXIuICovXG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuY29tcGxldGUoKTtcbiAgICBpZiAodGhpcy5ub25Sb3V0ZXJDdXJyZW50RW50cnlDaGFuZ2VTdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMubm9uUm91dGVyQ3VycmVudEVudHJ5Q2hhbmdlU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICB0aGlzLm5vblJvdXRlckN1cnJlbnRFbnRyeUNoYW5nZVN1YnNjcmlwdGlvbiA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdGhpcy5kaXNwb3NlZCA9IHRydWU7XG4gICAgdGhpcy5ldmVudHNTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBlbmRzIFVSTCBzZWdtZW50cyB0byB0aGUgY3VycmVudCBVUkwgdHJlZSB0byBjcmVhdGUgYSBuZXcgVVJMIHRyZWUuXG4gICAqXG4gICAqIEBwYXJhbSBjb21tYW5kcyBBbiBhcnJheSBvZiBVUkwgZnJhZ21lbnRzIHdpdGggd2hpY2ggdG8gY29uc3RydWN0IHRoZSBuZXcgVVJMIHRyZWUuXG4gICAqIElmIHRoZSBwYXRoIGlzIHN0YXRpYywgY2FuIGJlIHRoZSBsaXRlcmFsIFVSTCBzdHJpbmcuIEZvciBhIGR5bmFtaWMgcGF0aCwgcGFzcyBhbiBhcnJheSBvZiBwYXRoXG4gICAqIHNlZ21lbnRzLCBmb2xsb3dlZCBieSB0aGUgcGFyYW1ldGVycyBmb3IgZWFjaCBzZWdtZW50LlxuICAgKiBUaGUgZnJhZ21lbnRzIGFyZSBhcHBsaWVkIHRvIHRoZSBjdXJyZW50IFVSTCB0cmVlIG9yIHRoZSBvbmUgcHJvdmlkZWQgIGluIHRoZSBgcmVsYXRpdmVUb2BcbiAgICogcHJvcGVydHkgb2YgdGhlIG9wdGlvbnMgb2JqZWN0LCBpZiBzdXBwbGllZC5cbiAgICogQHBhcmFtIG5hdmlnYXRpb25FeHRyYXMgT3B0aW9ucyB0aGF0IGNvbnRyb2wgdGhlIG5hdmlnYXRpb24gc3RyYXRlZ3kuXG4gICAqIEByZXR1cm5zIFRoZSBuZXcgVVJMIHRyZWUuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvdXNlci8xMVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzO2V4cGFuZD10cnVlL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7ZXhwYW5kOiB0cnVlfSwgJ3VzZXInLCAxMV0pO1xuICAgKlxuICAgKiAvLyB5b3UgY2FuIGNvbGxhcHNlIHN0YXRpYyBzZWdtZW50cyBsaWtlIHRoaXMgKHRoaXMgd29ya3Mgb25seSB3aXRoIHRoZSBmaXJzdCBwYXNzZWQtaW4gdmFsdWUpOlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtLzMzL3VzZXInLCB1c2VySWRdKTtcbiAgICpcbiAgICogLy8gSWYgdGhlIGZpcnN0IHNlZ21lbnQgY2FuIGNvbnRhaW4gc2xhc2hlcywgYW5kIHlvdSBkbyBub3Qgd2FudCB0aGUgcm91dGVyIHRvIHNwbGl0IGl0LFxuICAgKiAvLyB5b3UgY2FuIGRvIHRoZSBmb2xsb3dpbmc6XG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFt7c2VnbWVudFBhdGg6ICcvb25lL3R3byd9XSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMy8odXNlci8xMS8vcmlnaHQ6Y2hhdClcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6ICdjaGF0J319XSk7XG4gICAqXG4gICAqIC8vIHJlbW92ZSB0aGUgcmlnaHQgc2Vjb25kYXJ5IG5vZGVcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6IG51bGx9fV0pO1xuICAgKlxuICAgKiAvLyBhc3N1bWluZyB0aGUgY3VycmVudCB1cmwgaXMgYC90ZWFtLzMzL3VzZXIvMTFgIGFuZCB0aGUgcm91dGUgcG9pbnRzIHRvIGB1c2VyLzExYFxuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzExL2RldGFpbHNcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWydkZXRhaWxzJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzQ0L3VzZXIvMjJcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycuLi8uLi90ZWFtLzQ0L3VzZXIvMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIE5vdGUgdGhhdCBhIHZhbHVlIG9mIGBudWxsYCBvciBgdW5kZWZpbmVkYCBmb3IgYHJlbGF0aXZlVG9gIGluZGljYXRlcyB0aGF0IHRoZVxuICAgKiB0cmVlIHNob3VsZCBiZSBjcmVhdGVkIHJlbGF0aXZlIHRvIHRoZSByb290LlxuICAgKiBgYGBcbiAgICovXG4gIGNyZWF0ZVVybFRyZWUoY29tbWFuZHM6IGFueVtdLCBuYXZpZ2F0aW9uRXh0cmFzOiBVcmxDcmVhdGlvbk9wdGlvbnMgPSB7fSk6IFVybFRyZWUge1xuICAgIGNvbnN0IHtyZWxhdGl2ZVRvLCBxdWVyeVBhcmFtcywgZnJhZ21lbnQsIHF1ZXJ5UGFyYW1zSGFuZGxpbmcsIHByZXNlcnZlRnJhZ21lbnR9ID1cbiAgICAgICAgbmF2aWdhdGlvbkV4dHJhcztcbiAgICBjb25zdCBmID0gcHJlc2VydmVGcmFnbWVudCA/IHRoaXMuY3VycmVudFVybFRyZWUuZnJhZ21lbnQgOiBmcmFnbWVudDtcbiAgICBsZXQgcTogUGFyYW1zfG51bGwgPSBudWxsO1xuICAgIHN3aXRjaCAocXVlcnlQYXJhbXNIYW5kbGluZykge1xuICAgICAgY2FzZSAnbWVyZ2UnOlxuICAgICAgICBxID0gey4uLnRoaXMuY3VycmVudFVybFRyZWUucXVlcnlQYXJhbXMsIC4uLnF1ZXJ5UGFyYW1zfTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdwcmVzZXJ2ZSc6XG4gICAgICAgIHEgPSB0aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHEgPSBxdWVyeVBhcmFtcyB8fCBudWxsO1xuICAgIH1cbiAgICBpZiAocSAhPT0gbnVsbCkge1xuICAgICAgcSA9IHRoaXMucmVtb3ZlRW1wdHlQcm9wcyhxKTtcbiAgICB9XG5cbiAgICBsZXQgcmVsYXRpdmVUb1VybFNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwfHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVsYXRpdmVUb1NuYXBzaG90ID0gcmVsYXRpdmVUbyA/IHJlbGF0aXZlVG8uc25hcHNob3QgOiB0aGlzLnJvdXRlclN0YXRlLnNuYXBzaG90LnJvb3Q7XG4gICAgICByZWxhdGl2ZVRvVXJsU2VnbWVudEdyb3VwID0gY3JlYXRlU2VnbWVudEdyb3VwRnJvbVJvdXRlKHJlbGF0aXZlVG9TbmFwc2hvdCk7XG4gICAgfSBjYXRjaCAoZTogdW5rbm93bikge1xuICAgICAgLy8gVGhpcyBpcyBzdHJpY3RseSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgd2l0aCB0ZXN0cyB0aGF0IGNyZWF0ZVxuICAgICAgLy8gaW52YWxpZCBgQWN0aXZhdGVkUm91dGVgIG1vY2tzLlxuICAgICAgLy8gTm90ZTogdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiBoYXZpbmcgdGhpcyBmYWxsYmFjayBmb3IgaW52YWxpZCBgQWN0aXZhdGVkUm91dGVgIHNldHVwcyBhbmRcbiAgICAgIC8vIGp1c3QgdGhyb3dpbmcgaXMgfjUwMCB0ZXN0IGZhaWx1cmVzLiBGaXhpbmcgYWxsIG9mIHRob3NlIHRlc3RzIGJ5IGhhbmQgaXMgbm90IGZlYXNpYmxlIGF0XG4gICAgICAvLyB0aGUgbW9tZW50LlxuICAgICAgaWYgKHR5cGVvZiBjb21tYW5kc1swXSAhPT0gJ3N0cmluZycgfHwgIWNvbW1hbmRzWzBdLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgICAvLyBOYXZpZ2F0aW9ucyB0aGF0IHdlcmUgYWJzb2x1dGUgaW4gdGhlIG9sZCB3YXkgb2YgY3JlYXRpbmcgVXJsVHJlZXNcbiAgICAgICAgLy8gd291bGQgc3RpbGwgd29yayBiZWNhdXNlIHRoZXkgd291bGRuJ3QgYXR0ZW1wdCB0byBtYXRjaCB0aGVcbiAgICAgICAgLy8gc2VnbWVudHMgaW4gdGhlIGBBY3RpdmF0ZWRSb3V0ZWAgdG8gdGhlIGBjdXJyZW50VXJsVHJlZWAgYnV0XG4gICAgICAgIC8vIGluc3RlYWQganVzdCByZXBsYWNlIHRoZSByb290IHNlZ21lbnQgd2l0aCB0aGUgbmF2aWdhdGlvbiByZXN1bHQuXG4gICAgICAgIC8vIE5vbi1hYnNvbHV0ZSBuYXZpZ2F0aW9ucyB3b3VsZCBmYWlsIHRvIGFwcGx5IHRoZSBjb21tYW5kcyBiZWNhdXNlXG4gICAgICAgIC8vIHRoZSBsb2dpYyBjb3VsZCBub3QgZmluZCB0aGUgc2VnbWVudCB0byByZXBsYWNlIChzbyB0aGV5J2QgYWN0IGxpa2UgdGhlcmUgd2VyZSBub1xuICAgICAgICAvLyBjb21tYW5kcykuXG4gICAgICAgIGNvbW1hbmRzID0gW107XG4gICAgICB9XG4gICAgICByZWxhdGl2ZVRvVXJsU2VnbWVudEdyb3VwID0gdGhpcy5jdXJyZW50VXJsVHJlZS5yb290O1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlVXJsVHJlZUZyb21TZWdtZW50R3JvdXAocmVsYXRpdmVUb1VybFNlZ21lbnRHcm91cCwgY29tbWFuZHMsIHEsIGYgPz8gbnVsbCk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGVzIHRvIGEgdmlldyB1c2luZyBhbiBhYnNvbHV0ZSByb3V0ZSBwYXRoLlxuICAgKlxuICAgKiBAcGFyYW0gdXJsIEFuIGFic29sdXRlIHBhdGggZm9yIGEgZGVmaW5lZCByb3V0ZS4gVGhlIGZ1bmN0aW9uIGRvZXMgbm90IGFwcGx5IGFueSBkZWx0YSB0byB0aGVcbiAgICogICAgIGN1cnJlbnQgVVJMLlxuICAgKiBAcGFyYW0gZXh0cmFzIEFuIG9iamVjdCBjb250YWluaW5nIHByb3BlcnRpZXMgdGhhdCBtb2RpZnkgdGhlIG5hdmlnYXRpb24gc3RyYXRlZ3kuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvICd0cnVlJyB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsXG4gICAqIHRvICdmYWxzZScgd2hlbiBuYXZpZ2F0aW9uIGZhaWxzLCBvciBpcyByZWplY3RlZCBvbiBlcnJvci5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBjYWxscyByZXF1ZXN0IG5hdmlnYXRpb24gdG8gYW4gYWJzb2x1dGUgcGF0aC5cbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiKTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiLCB7IHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRlcilcbiAgICpcbiAgICovXG4gIG5hdmlnYXRlQnlVcmwodXJsOiBzdHJpbmd8VXJsVHJlZSwgZXh0cmFzOiBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zID0ge1xuICAgIHNraXBMb2NhdGlvbkNoYW5nZTogZmFsc2VcbiAgfSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpIHtcbiAgICAgIGlmICh0aGlzLmlzTmdab25lRW5hYmxlZCAmJiAhTmdab25lLmlzSW5Bbmd1bGFyWm9uZSgpKSB7XG4gICAgICAgIHRoaXMuY29uc29sZS53YXJuKFxuICAgICAgICAgICAgYE5hdmlnYXRpb24gdHJpZ2dlcmVkIG91dHNpZGUgQW5ndWxhciB6b25lLCBkaWQgeW91IGZvcmdldCB0byBjYWxsICduZ1pvbmUucnVuKCknP2ApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHVybFRyZWUgPSBpc1VybFRyZWUodXJsKSA/IHVybCA6IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICBjb25zdCBtZXJnZWRUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHVybFRyZWUsIHRoaXMucmF3VXJsVHJlZSk7XG5cbiAgICByZXR1cm4gdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24obWVyZ2VkVHJlZSwgSU1QRVJBVElWRV9OQVZJR0FUSU9OLCBudWxsLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBhcnJheSBvZiBjb21tYW5kcyBhbmQgYSBzdGFydGluZyBwb2ludC5cbiAgICogSWYgbm8gc3RhcnRpbmcgcm91dGUgaXMgcHJvdmlkZWQsIHRoZSBuYXZpZ2F0aW9uIGlzIGFic29sdXRlLlxuICAgKlxuICAgKiBAcGFyYW0gY29tbWFuZHMgQW4gYXJyYXkgb2YgVVJMIGZyYWdtZW50cyB3aXRoIHdoaWNoIHRvIGNvbnN0cnVjdCB0aGUgdGFyZ2V0IFVSTC5cbiAgICogSWYgdGhlIHBhdGggaXMgc3RhdGljLCBjYW4gYmUgdGhlIGxpdGVyYWwgVVJMIHN0cmluZy4gRm9yIGEgZHluYW1pYyBwYXRoLCBwYXNzIGFuIGFycmF5IG9mIHBhdGhcbiAgICogc2VnbWVudHMsIGZvbGxvd2VkIGJ5IHRoZSBwYXJhbWV0ZXJzIGZvciBlYWNoIHNlZ21lbnQuXG4gICAqIFRoZSBmcmFnbWVudHMgYXJlIGFwcGxpZWQgdG8gdGhlIGN1cnJlbnQgVVJMIG9yIHRoZSBvbmUgcHJvdmlkZWQgIGluIHRoZSBgcmVsYXRpdmVUb2AgcHJvcGVydHlcbiAgICogb2YgdGhlIG9wdGlvbnMgb2JqZWN0LCBpZiBzdXBwbGllZC5cbiAgICogQHBhcmFtIGV4dHJhcyBBbiBvcHRpb25zIG9iamVjdCB0aGF0IGRldGVybWluZXMgaG93IHRoZSBVUkwgc2hvdWxkIGJlIGNvbnN0cnVjdGVkIG9yXG4gICAqICAgICBpbnRlcnByZXRlZC5cbiAgICpcbiAgICogQHJldHVybnMgQSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gYHRydWVgIHdoZW4gbmF2aWdhdGlvbiBzdWNjZWVkcywgdG8gYGZhbHNlYCB3aGVuIG5hdmlnYXRpb25cbiAgICogICAgIGZhaWxzLFxuICAgKiBvciBpcyByZWplY3RlZCBvbiBlcnJvci5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBjYWxscyByZXF1ZXN0IG5hdmlnYXRpb24gdG8gYSBkeW5hbWljIHJvdXRlIHBhdGggcmVsYXRpdmUgdG8gdGhlIGN1cnJlbnQgVVJMLlxuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTCwgb3ZlcnJpZGluZyB0aGUgZGVmYXVsdCBiZWhhdmlvclxuICAgKiByb3V0ZXIubmF2aWdhdGUoWyd0ZWFtJywgMzMsICd1c2VyJywgMTFdLCB7cmVsYXRpdmVUbzogcm91dGUsIHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZX0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKVxuICAgKlxuICAgKi9cbiAgbmF2aWdhdGUoY29tbWFuZHM6IGFueVtdLCBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7c2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZX0pOlxuICAgICAgUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdmFsaWRhdGVDb21tYW5kcyhjb21tYW5kcyk7XG4gICAgcmV0dXJuIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmNyZWF0ZVVybFRyZWUoY29tbWFuZHMsIGV4dHJhcyksIGV4dHJhcyk7XG4gIH1cblxuICAvKiogU2VyaWFsaXplcyBhIGBVcmxUcmVlYCBpbnRvIGEgc3RyaW5nICovXG4gIHNlcmlhbGl6ZVVybCh1cmw6IFVybFRyZWUpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHVybCk7XG4gIH1cblxuICAvKiogUGFyc2VzIGEgc3RyaW5nIGludG8gYSBgVXJsVHJlZWAgKi9cbiAgcGFyc2VVcmwodXJsOiBzdHJpbmcpOiBVcmxUcmVlIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIHRoaXMudXJsU2VyaWFsaXplci5wYXJzZSh1cmwpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIHRoaXMudXJsU2VyaWFsaXplci5wYXJzZSgnLycpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHdoZXRoZXIgdGhlIHVybCBpcyBhY3RpdmF0ZWQuXG4gICAqXG4gICAqIEBkZXByZWNhdGVkXG4gICAqIFVzZSBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIGluc3RlYWQuXG4gICAqXG4gICAqIC0gVGhlIGVxdWl2YWxlbnQgYElzQWN0aXZlTWF0Y2hPcHRpb25zYCBmb3IgYHRydWVgIGlzXG4gICAqIGB7cGF0aHM6ICdleGFjdCcsIHF1ZXJ5UGFyYW1zOiAnZXhhY3QnLCBmcmFnbWVudDogJ2lnbm9yZWQnLCBtYXRyaXhQYXJhbXM6ICdpZ25vcmVkJ31gLlxuICAgKiAtIFRoZSBlcXVpdmFsZW50IGZvciBgZmFsc2VgIGlzXG4gICAqIGB7cGF0aHM6ICdzdWJzZXQnLCBxdWVyeVBhcmFtczogJ3N1YnNldCcsIGZyYWdtZW50OiAnaWdub3JlZCcsIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnfWAuXG4gICAqL1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBleGFjdDogYm9vbGVhbik6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBSZXR1cm5zIHdoZXRoZXIgdGhlIHVybCBpcyBhY3RpdmF0ZWQuXG4gICAqL1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBtYXRjaE9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zKTogYm9vbGVhbjtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBtYXRjaE9wdGlvbnM6IGJvb2xlYW58SXNBY3RpdmVNYXRjaE9wdGlvbnMpOiBib29sZWFuO1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBtYXRjaE9wdGlvbnM6IGJvb2xlYW58SXNBY3RpdmVNYXRjaE9wdGlvbnMpOiBib29sZWFuIHtcbiAgICBsZXQgb3B0aW9uczogSXNBY3RpdmVNYXRjaE9wdGlvbnM7XG4gICAgaWYgKG1hdGNoT3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucyA9IHsuLi5leGFjdE1hdGNoT3B0aW9uc307XG4gICAgfSBlbHNlIGlmIChtYXRjaE9wdGlvbnMgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zID0gey4uLnN1YnNldE1hdGNoT3B0aW9uc307XG4gICAgfSBlbHNlIHtcbiAgICAgIG9wdGlvbnMgPSBtYXRjaE9wdGlvbnM7XG4gICAgfVxuICAgIGlmIChpc1VybFRyZWUodXJsKSkge1xuICAgICAgcmV0dXJuIGNvbnRhaW5zVHJlZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB1cmwsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGNvbnN0IHVybFRyZWUgPSB0aGlzLnBhcnNlVXJsKHVybCk7XG4gICAgcmV0dXJuIGNvbnRhaW5zVHJlZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB1cmxUcmVlLCBvcHRpb25zKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVtb3ZlRW1wdHlQcm9wcyhwYXJhbXM6IFBhcmFtcyk6IFBhcmFtcyB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHBhcmFtcykucmVkdWNlKChyZXN1bHQ6IFBhcmFtcywga2V5OiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlOiBhbnkgPSBwYXJhbXNba2V5XTtcbiAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sIHt9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2NoZWR1bGVOYXZpZ2F0aW9uKFxuICAgICAgcmF3VXJsOiBVcmxUcmVlLCBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLCByZXN0b3JlZFN0YXRlOiBSZXN0b3JlZFN0YXRlfG51bGwsXG4gICAgICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMsXG4gICAgICBwcmlvclByb21pc2U/OiB7cmVzb2x2ZTogYW55LCByZWplY3Q6IGFueSwgcHJvbWlzZTogUHJvbWlzZTxib29sZWFuPn0pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShmYWxzZSk7XG4gICAgfVxuXG4gICAgbGV0IHJlc29sdmU6IGFueTtcbiAgICBsZXQgcmVqZWN0OiBhbnk7XG4gICAgbGV0IHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj47XG4gICAgaWYgKHByaW9yUHJvbWlzZSkge1xuICAgICAgcmVzb2x2ZSA9IHByaW9yUHJvbWlzZS5yZXNvbHZlO1xuICAgICAgcmVqZWN0ID0gcHJpb3JQcm9taXNlLnJlamVjdDtcbiAgICAgIHByb21pc2UgPSBwcmlvclByb21pc2UucHJvbWlzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXMsIHJlaikgPT4ge1xuICAgICAgICByZXNvbHZlID0gcmVzO1xuICAgICAgICByZWplY3QgPSByZWo7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBJbmRpY2F0ZSB0aGF0IHRoZSBuYXZpZ2F0aW9uIGlzIGhhcHBlbmluZy5cbiAgICBjb25zdCB0YXNrSWQgPSB0aGlzLnBlbmRpbmdUYXNrcy5hZGQoKTtcbiAgICBhZnRlck5leHROYXZpZ2F0aW9uKHRoaXMsICgpID0+IHtcbiAgICAgIC8vIFJlbW92ZSBwZW5kaW5nIHRhc2sgaW4gYSBtaWNyb3Rhc2sgdG8gYWxsb3cgZm9yIGNhbmNlbGxlZFxuICAgICAgLy8gaW5pdGlhbCBuYXZpZ2F0aW9ucyBhbmQgcmVkaXJlY3RzIHdpdGhpbiB0aGUgc2FtZSB0YXNrLlxuICAgICAgcXVldWVNaWNyb3Rhc2soKCkgPT4gdGhpcy5wZW5kaW5nVGFza3MucmVtb3ZlKHRhc2tJZCkpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuaGFuZGxlTmF2aWdhdGlvblJlcXVlc3Qoe1xuICAgICAgc291cmNlLFxuICAgICAgcmVzdG9yZWRTdGF0ZSxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgY3VycmVudFJhd1VybDogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIHJhd1VybCxcbiAgICAgIGV4dHJhcyxcbiAgICAgIHJlc29sdmUsXG4gICAgICByZWplY3QsXG4gICAgICBwcm9taXNlLFxuICAgICAgY3VycmVudFNuYXBzaG90OiB0aGlzLnJvdXRlclN0YXRlLnNuYXBzaG90LFxuICAgICAgY3VycmVudFJvdXRlclN0YXRlOiB0aGlzLnJvdXRlclN0YXRlXG4gICAgfSk7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhhdCB0aGUgZXJyb3IgaXMgcHJvcGFnYXRlZCBldmVuIHRob3VnaCBgcHJvY2Vzc05hdmlnYXRpb25zYCBjYXRjaFxuICAgIC8vIGhhbmRsZXIgZG9lcyBub3QgcmV0aHJvd1xuICAgIHJldHVybiBwcm9taXNlLmNhdGNoKChlOiBhbnkpID0+IHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlKTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUNvbW1hbmRzKGNvbW1hbmRzOiBzdHJpbmdbXSk6IHZvaWQge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbW1hbmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY21kID0gY29tbWFuZHNbaV07XG4gICAgaWYgKGNtZCA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuTlVMTElTSF9DT01NQU5ELFxuICAgICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmXG4gICAgICAgICAgICAgIGBUaGUgcmVxdWVzdGVkIHBhdGggY29udGFpbnMgJHtjbWR9IHNlZ21lbnQgYXQgaW5kZXggJHtpfWApO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpc1B1YmxpY1JvdXRlckV2ZW50KGU6IEV2ZW50fFByaXZhdGVSb3V0ZXJFdmVudHMpOiBlIGlzIEV2ZW50IHtcbiAgcmV0dXJuICghKGUgaW5zdGFuY2VvZiBCZWZvcmVBY3RpdmF0ZVJvdXRlcykgJiYgIShlIGluc3RhbmNlb2YgUmVkaXJlY3RSZXF1ZXN0KSk7XG59XG4iXX0=