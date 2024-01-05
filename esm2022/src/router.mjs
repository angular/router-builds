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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.0.8+sha-15a973f", ngImport: i0, type: Router, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.0.8+sha-15a973f", ngImport: i0, type: Router, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.0.8+sha-15a973f", ngImport: i0, type: Router, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBUSxRQUFRLElBQUksT0FBTyxFQUFFLGFBQWEsSUFBSSxZQUFZLEVBQUUsYUFBYSxJQUFJLFlBQVksRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNsSixPQUFPLEVBQWEsT0FBTyxFQUFFLFlBQVksRUFBbUIsTUFBTSxNQUFNLENBQUM7QUFFekUsT0FBTyxFQUFDLDJCQUEyQixFQUFFLDZCQUE2QixFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDN0YsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLDRCQUE0QixDQUFDO0FBRXhELE9BQU8sRUFBQyxvQkFBb0IsRUFBUyxxQkFBcUIsRUFBRSxnQkFBZ0IsRUFBOEIsYUFBYSxFQUEwQyxlQUFlLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFFbE0sT0FBTyxFQUFDLDRCQUE0QixFQUFnQyxxQkFBcUIsRUFBb0MsTUFBTSx5QkFBeUIsQ0FBQztBQUM3SixPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUMxRCxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUNyRCxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFFOUMsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLDhCQUE4QixDQUFDO0FBQzFELE9BQU8sRUFBQyxtQkFBbUIsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQzVELE9BQU8sRUFBQyxZQUFZLEVBQXdCLFNBQVMsRUFBbUIsYUFBYSxFQUFVLE1BQU0sWUFBWSxDQUFDO0FBQ2xI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LG1CQUFtQixDQUFDLENBQTRCO0lBQ3ZELE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxlQUFlLENBQUMsQ0FBQyxDQUFDO0FBQ25GLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7aW5qZWN0LCBJbmplY3RhYmxlLCBOZ1pvbmUsIFR5cGUsIMm1Q29uc29sZSBhcyBDb25zb2xlLCDJtVBlbmRpbmdUYXNrcyBhcyBQZW5kaW5nVGFza3MsIMm1UnVudGltZUVycm9yIGFzIFJ1bnRpbWVFcnJvcn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge09ic2VydmFibGUsIFN1YmplY3QsIFN1YnNjcmlwdGlvbiwgU3Vic2NyaXB0aW9uTGlrZX0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7Y3JlYXRlU2VnbWVudEdyb3VwRnJvbVJvdXRlLCBjcmVhdGVVcmxUcmVlRnJvbVNlZ21lbnRHcm91cH0gZnJvbSAnLi9jcmVhdGVfdXJsX3RyZWUnO1xuaW1wb3J0IHtJTlBVVF9CSU5ERVJ9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0JztcbmltcG9ydCB7UnVudGltZUVycm9yQ29kZX0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IHtCZWZvcmVBY3RpdmF0ZVJvdXRlcywgRXZlbnQsIElNUEVSQVRJVkVfTkFWSUdBVElPTiwgTmF2aWdhdGlvbkNhbmNlbCwgTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUsIE5hdmlnYXRpb25FbmQsIE5hdmlnYXRpb25UcmlnZ2VyLCBQcml2YXRlUm91dGVyRXZlbnRzLCBSZWRpcmVjdFJlcXVlc3R9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7TmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucywgT25TYW1lVXJsTmF2aWdhdGlvbiwgUm91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge2lzQnJvd3NlclRyaWdnZXJlZE5hdmlnYXRpb24sIE5hdmlnYXRpb24sIE5hdmlnYXRpb25FeHRyYXMsIE5hdmlnYXRpb25UcmFuc2l0aW9ucywgUmVzdG9yZWRTdGF0ZSwgVXJsQ3JlYXRpb25PcHRpb25zfSBmcm9tICcuL25hdmlnYXRpb25fdHJhbnNpdGlvbic7XG5pbXBvcnQge1JvdXRlUmV1c2VTdHJhdGVneX0gZnJvbSAnLi9yb3V0ZV9yZXVzZV9zdHJhdGVneSc7XG5pbXBvcnQge1JPVVRFUl9DT05GSUdVUkFUSU9OfSBmcm9tICcuL3JvdXRlcl9jb25maWcnO1xuaW1wb3J0IHtST1VURVN9IGZyb20gJy4vcm91dGVyX2NvbmZpZ19sb2FkZXInO1xuaW1wb3J0IHtQYXJhbXN9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7U3RhdGVNYW5hZ2VyfSBmcm9tICcuL3N0YXRlbWFuYWdlci9zdGF0ZV9tYW5hZ2VyJztcbmltcG9ydCB7VXJsSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi91cmxfaGFuZGxpbmdfc3RyYXRlZ3knO1xuaW1wb3J0IHtjb250YWluc1RyZWUsIElzQWN0aXZlTWF0Y2hPcHRpb25zLCBpc1VybFRyZWUsIFVybFNlZ21lbnRHcm91cCwgVXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge3N0YW5kYXJkaXplQ29uZmlnLCB2YWxpZGF0ZUNvbmZpZ30gZnJvbSAnLi91dGlscy9jb25maWcnO1xuaW1wb3J0IHthZnRlck5leHROYXZpZ2F0aW9ufSBmcm9tICcuL3V0aWxzL25hdmlnYXRpb25zJztcblxuXG5cbmZ1bmN0aW9uIGRlZmF1bHRFcnJvckhhbmRsZXIoZXJyb3I6IGFueSk6IG5ldmVyIHtcbiAgdGhyb3cgZXJyb3I7XG59XG5cbi8qKlxuICogVGhlIGVxdWl2YWxlbnQgYElzQWN0aXZlTWF0Y2hPcHRpb25zYCBvcHRpb25zIGZvciBgUm91dGVyLmlzQWN0aXZlYCBpcyBjYWxsZWQgd2l0aCBgdHJ1ZWBcbiAqIChleGFjdCA9IHRydWUpLlxuICovXG5leHBvcnQgY29uc3QgZXhhY3RNYXRjaE9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zID0ge1xuICBwYXRoczogJ2V4YWN0JyxcbiAgZnJhZ21lbnQ6ICdpZ25vcmVkJyxcbiAgbWF0cml4UGFyYW1zOiAnaWdub3JlZCcsXG4gIHF1ZXJ5UGFyYW1zOiAnZXhhY3QnXG59O1xuXG4vKipcbiAqIFRoZSBlcXVpdmFsZW50IGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2Agb3B0aW9ucyBmb3IgYFJvdXRlci5pc0FjdGl2ZWAgaXMgY2FsbGVkIHdpdGggYGZhbHNlYFxuICogKGV4YWN0ID0gZmFsc2UpLlxuICovXG5leHBvcnQgY29uc3Qgc3Vic2V0TWF0Y2hPcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucyA9IHtcbiAgcGF0aHM6ICdzdWJzZXQnLFxuICBmcmFnbWVudDogJ2lnbm9yZWQnLFxuICBtYXRyaXhQYXJhbXM6ICdpZ25vcmVkJyxcbiAgcXVlcnlQYXJhbXM6ICdzdWJzZXQnXG59O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEEgc2VydmljZSB0aGF0IHByb3ZpZGVzIG5hdmlnYXRpb24gYW1vbmcgdmlld3MgYW5kIFVSTCBtYW5pcHVsYXRpb24gY2FwYWJpbGl0aWVzLlxuICpcbiAqIEBzZWUge0BsaW5rIFJvdXRlfVxuICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBHdWlkZV0oZ3VpZGUvcm91dGVyKS5cbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnfSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXIge1xuICBwcml2YXRlIGdldCBjdXJyZW50VXJsVHJlZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZU1hbmFnZXIuZ2V0Q3VycmVudFVybFRyZWUoKTtcbiAgfVxuICBwcml2YXRlIGdldCByYXdVcmxUcmVlKCkge1xuICAgIHJldHVybiB0aGlzLnN0YXRlTWFuYWdlci5nZXRSYXdVcmxUcmVlKCk7XG4gIH1cbiAgcHJpdmF0ZSBkaXNwb3NlZCA9IGZhbHNlO1xuICBwcml2YXRlIG5vblJvdXRlckN1cnJlbnRFbnRyeUNoYW5nZVN1YnNjcmlwdGlvbj86IFN1YnNjcmlwdGlvbkxpa2U7XG4gIHByaXZhdGUgaXNOZ1pvbmVFbmFibGVkID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBjb25zb2xlID0gaW5qZWN0KENvbnNvbGUpO1xuICBwcml2YXRlIHJlYWRvbmx5IHN0YXRlTWFuYWdlciA9IGluamVjdChTdGF0ZU1hbmFnZXIpO1xuICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnMgPSBpbmplY3QoUk9VVEVSX0NPTkZJR1VSQVRJT04sIHtvcHRpb25hbDogdHJ1ZX0pIHx8IHt9O1xuICBwcml2YXRlIHJlYWRvbmx5IHBlbmRpbmdUYXNrcyA9IGluamVjdChQZW5kaW5nVGFza3MpO1xuICBwcml2YXRlIHJlYWRvbmx5IHVybFVwZGF0ZVN0cmF0ZWd5ID0gdGhpcy5vcHRpb25zLnVybFVwZGF0ZVN0cmF0ZWd5IHx8ICdkZWZlcnJlZCc7XG4gIHByaXZhdGUgcmVhZG9ubHkgbmF2aWdhdGlvblRyYW5zaXRpb25zID0gaW5qZWN0KE5hdmlnYXRpb25UcmFuc2l0aW9ucyk7XG4gIHByaXZhdGUgcmVhZG9ubHkgdXJsU2VyaWFsaXplciA9IGluamVjdChVcmxTZXJpYWxpemVyKTtcbiAgcHJpdmF0ZSByZWFkb25seSBsb2NhdGlvbiA9IGluamVjdChMb2NhdGlvbik7XG4gIHByaXZhdGUgcmVhZG9ubHkgdXJsSGFuZGxpbmdTdHJhdGVneSA9IGluamVjdChVcmxIYW5kbGluZ1N0cmF0ZWd5KTtcblxuICAvKipcbiAgICogVGhlIHByaXZhdGUgYFN1YmplY3RgIHR5cGUgZm9yIHRoZSBwdWJsaWMgZXZlbnRzIGV4cG9zZWQgaW4gdGhlIGdldHRlci4gVGhpcyBpcyB1c2VkIGludGVybmFsbHlcbiAgICogdG8gcHVzaCBldmVudHMgdG8uIFRoZSBzZXBhcmF0ZSBmaWVsZCBhbGxvd3MgdXMgdG8gZXhwb3NlIHNlcGFyYXRlIHR5cGVzIGluIHRoZSBwdWJsaWMgQVBJXG4gICAqIChpLmUuLCBhbiBPYnNlcnZhYmxlIHJhdGhlciB0aGFuIHRoZSBTdWJqZWN0KS5cbiAgICovXG4gIHByaXZhdGUgX2V2ZW50cyA9IG5ldyBTdWJqZWN0PEV2ZW50PigpO1xuICAvKipcbiAgICogQW4gZXZlbnQgc3RyZWFtIGZvciByb3V0aW5nIGV2ZW50cy5cbiAgICovXG4gIHB1YmxpYyBnZXQgZXZlbnRzKCk6IE9ic2VydmFibGU8RXZlbnQ+IHtcbiAgICAvLyBUT0RPKGF0c2NvdHQpOiBUaGlzIF9zaG91bGRfIGJlIGV2ZW50cy5hc09ic2VydmFibGUoKS4gSG93ZXZlciwgdGhpcyBjaGFuZ2UgcmVxdWlyZXMgaW50ZXJuYWxcbiAgICAvLyBjbGVhbnVwOiB0ZXN0cyBhcmUgZG9pbmcgYChyb3V0ZS5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pLm5leHQoLi4uKWAuIFRoaXMgaXNuJ3RcbiAgICAvLyBhbGxvd2VkL3N1cHBvcnRlZCBidXQgd2Ugc3RpbGwgaGF2ZSB0byBmaXggdGhlc2Ugb3IgZmlsZSBidWdzIGFnYWluc3QgdGhlIHRlYW1zIGJlZm9yZSBtYWtpbmdcbiAgICAvLyB0aGUgY2hhbmdlLlxuICAgIHJldHVybiB0aGlzLl9ldmVudHM7XG4gIH1cbiAgLyoqXG4gICAqIFRoZSBjdXJyZW50IHN0YXRlIG9mIHJvdXRpbmcgaW4gdGhpcyBOZ01vZHVsZS5cbiAgICovXG4gIGdldCByb3V0ZXJTdGF0ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZU1hbmFnZXIuZ2V0Um91dGVyU3RhdGUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIGhhbmRsZXIgZm9yIG5hdmlnYXRpb24gZXJyb3JzIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIFN1YnNjcmliZSB0byB0aGUgYFJvdXRlcmAgZXZlbnRzIGFuZCB3YXRjaCBmb3IgYE5hdmlnYXRpb25FcnJvcmAgaW5zdGVhZC5cbiAgICogICBgcHJvdmlkZVJvdXRlcmAgaGFzIHRoZSBgd2l0aE5hdmlnYXRpb25FcnJvckhhbmRsZXJgIGZlYXR1cmUgdG8gbWFrZSB0aGlzIGVhc2llci5cbiAgICogQHNlZSB7QGxpbmsgd2l0aE5hdmlnYXRpb25FcnJvckhhbmRsZXJ9XG4gICAqL1xuICBlcnJvckhhbmRsZXI6IChlcnJvcjogYW55KSA9PiBhbnkgPSB0aGlzLm9wdGlvbnMuZXJyb3JIYW5kbGVyIHx8IGRlZmF1bHRFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIFRydWUgaWYgYXQgbGVhc3Qgb25lIG5hdmlnYXRpb24gZXZlbnQgaGFzIG9jY3VycmVkLFxuICAgKiBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuICBuYXZpZ2F0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAvKipcbiAgICogQSBzdHJhdGVneSBmb3IgcmUtdXNpbmcgcm91dGVzLlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBDb25maWd1cmUgdXNpbmcgYHByb3ZpZGVyc2AgaW5zdGVhZDpcbiAgICogICBge3Byb3ZpZGU6IFJvdXRlUmV1c2VTdHJhdGVneSwgdXNlQ2xhc3M6IE15U3RyYXRlZ3l9YC5cbiAgICovXG4gIHJvdXRlUmV1c2VTdHJhdGVneTogUm91dGVSZXVzZVN0cmF0ZWd5ID0gaW5qZWN0KFJvdXRlUmV1c2VTdHJhdGVneSk7XG5cbiAgLyoqXG4gICAqIEhvdyB0byBoYW5kbGUgYSBuYXZpZ2F0aW9uIHJlcXVlc3QgdG8gdGhlIGN1cnJlbnQgVVJMLlxuICAgKlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBDb25maWd1cmUgdGhpcyB0aHJvdWdoIGBwcm92aWRlUm91dGVyYCBvciBgUm91dGVyTW9kdWxlLmZvclJvb3RgIGluc3RlYWQuXG4gICAqIEBzZWUge0BsaW5rIHdpdGhSb3V0ZXJDb25maWd9XG4gICAqIEBzZWUge0BsaW5rIHByb3ZpZGVSb3V0ZXJ9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlck1vZHVsZX1cbiAgICovXG4gIG9uU2FtZVVybE5hdmlnYXRpb246IE9uU2FtZVVybE5hdmlnYXRpb24gPSB0aGlzLm9wdGlvbnMub25TYW1lVXJsTmF2aWdhdGlvbiB8fCAnaWdub3JlJztcblxuICBjb25maWc6IFJvdXRlcyA9IGluamVjdChST1VURVMsIHtvcHRpb25hbDogdHJ1ZX0pPy5mbGF0KCkgPz8gW107XG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyB3aGV0aGVyIHRoZSBhcHBsaWNhdGlvbiBoYXMgb3B0ZWQgaW4gdG8gYmluZGluZyBSb3V0ZXIgZGF0YSB0byBjb21wb25lbnQgaW5wdXRzLlxuICAgKlxuICAgKiBUaGlzIG9wdGlvbiBpcyBlbmFibGVkIGJ5IHRoZSBgd2l0aENvbXBvbmVudElucHV0QmluZGluZ2AgZmVhdHVyZSBvZiBgcHJvdmlkZVJvdXRlcmAgb3JcbiAgICogYGJpbmRUb0NvbXBvbmVudElucHV0c2AgaW4gdGhlIGBFeHRyYU9wdGlvbnNgIG9mIGBSb3V0ZXJNb2R1bGUuZm9yUm9vdGAuXG4gICAqL1xuICByZWFkb25seSBjb21wb25lbnRJbnB1dEJpbmRpbmdFbmFibGVkOiBib29sZWFuID0gISFpbmplY3QoSU5QVVRfQklOREVSLCB7b3B0aW9uYWw6IHRydWV9KTtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmlzTmdab25lRW5hYmxlZCA9IGluamVjdChOZ1pvbmUpIGluc3RhbmNlb2YgTmdab25lICYmIE5nWm9uZS5pc0luQW5ndWxhclpvbmUoKTtcblxuICAgIHRoaXMucmVzZXRDb25maWcodGhpcy5jb25maWcpO1xuXG4gICAgdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuc2V0dXBOYXZpZ2F0aW9ucyh0aGlzLCB0aGlzLmN1cnJlbnRVcmxUcmVlLCB0aGlzLnJvdXRlclN0YXRlKVxuICAgICAgICAuc3Vic2NyaWJlKHtcbiAgICAgICAgICBlcnJvcjogKGUpID0+IHtcbiAgICAgICAgICAgIHRoaXMuY29uc29sZS53YXJuKG5nRGV2TW9kZSA/IGBVbmhhbmRsZWQgTmF2aWdhdGlvbiBFcnJvcjogJHtlfWAgOiBlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIHRoaXMuc3Vic2NyaWJlVG9OYXZpZ2F0aW9uRXZlbnRzKCk7XG4gIH1cblxuXG4gIHByaXZhdGUgZXZlbnRzU3Vic2NyaXB0aW9uID0gbmV3IFN1YnNjcmlwdGlvbigpO1xuICBwcml2YXRlIHN1YnNjcmliZVRvTmF2aWdhdGlvbkV2ZW50cygpIHtcbiAgICBjb25zdCBzdWJzY3JpcHRpb24gPSB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5ldmVudHMuc3Vic2NyaWJlKGUgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgY3VycmVudFRyYW5zaXRpb24gPSB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5jdXJyZW50VHJhbnNpdGlvbjtcbiAgICAgICAgY29uc3QgY3VycmVudE5hdmlnYXRpb24gPSB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5jdXJyZW50TmF2aWdhdGlvbjtcbiAgICAgICAgaWYgKGN1cnJlbnRUcmFuc2l0aW9uICE9PSBudWxsICYmIGN1cnJlbnROYXZpZ2F0aW9uICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhpcy5zdGF0ZU1hbmFnZXIuaGFuZGxlUm91dGVyRXZlbnQoZSwgY3VycmVudE5hdmlnYXRpb24pO1xuICAgICAgICAgIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkNhbmNlbCAmJiBlLmNvZGUgIT09IE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLlJlZGlyZWN0ICYmXG4gICAgICAgICAgICAgIGUuY29kZSAhPT0gTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuU3VwZXJzZWRlZEJ5TmV3TmF2aWdhdGlvbikge1xuICAgICAgICAgICAgLy8gSXQgc2VlbXMgd2VpcmQgdGhhdCBgbmF2aWdhdGVkYCBpcyBzZXQgdG8gYHRydWVgIHdoZW4gdGhlIG5hdmlnYXRpb24gaXMgcmVqZWN0ZWQsXG4gICAgICAgICAgICAvLyBob3dldmVyIGl0J3MgaG93IHRoaW5ncyB3ZXJlIHdyaXR0ZW4gaW5pdGlhbGx5LiBJbnZlc3RpZ2F0aW9uIHdvdWxkIG5lZWQgdG8gYmUgZG9uZVxuICAgICAgICAgICAgLy8gdG8gZGV0ZXJtaW5lIGlmIHRoaXMgY2FuIGJlIHJlbW92ZWQuXG4gICAgICAgICAgICB0aGlzLm5hdmlnYXRlZCA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCkge1xuICAgICAgICAgICAgdGhpcy5uYXZpZ2F0ZWQgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIFJlZGlyZWN0UmVxdWVzdCkge1xuICAgICAgICAgICAgY29uc3QgbWVyZ2VkVHJlZSA9XG4gICAgICAgICAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKGUudXJsLCBjdXJyZW50VHJhbnNpdGlvbi5jdXJyZW50UmF3VXJsKTtcbiAgICAgICAgICAgIGNvbnN0IGV4dHJhcyA9IHtcbiAgICAgICAgICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiBjdXJyZW50VHJhbnNpdGlvbi5leHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlLFxuICAgICAgICAgICAgICAvLyBUaGUgVVJMIGlzIGFscmVhZHkgdXBkYXRlZCBhdCB0aGlzIHBvaW50IGlmIHdlIGhhdmUgJ2VhZ2VyJyBVUkxcbiAgICAgICAgICAgICAgLy8gdXBkYXRlcyBvciBpZiB0aGUgbmF2aWdhdGlvbiB3YXMgdHJpZ2dlcmVkIGJ5IHRoZSBicm93c2VyIChiYWNrXG4gICAgICAgICAgICAgIC8vIGJ1dHRvbiwgVVJMIGJhciwgZXRjKS4gV2Ugd2FudCB0byByZXBsYWNlIHRoYXQgaXRlbSBpbiBoaXN0b3J5XG4gICAgICAgICAgICAgIC8vIGlmIHRoZSBuYXZpZ2F0aW9uIGlzIHJlamVjdGVkLlxuICAgICAgICAgICAgICByZXBsYWNlVXJsOiB0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZWFnZXInIHx8XG4gICAgICAgICAgICAgICAgICBpc0Jyb3dzZXJUcmlnZ2VyZWROYXZpZ2F0aW9uKGN1cnJlbnRUcmFuc2l0aW9uLnNvdXJjZSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKG1lcmdlZFRyZWUsIElNUEVSQVRJVkVfTkFWSUdBVElPTiwgbnVsbCwgZXh0cmFzLCB7XG4gICAgICAgICAgICAgIHJlc29sdmU6IGN1cnJlbnRUcmFuc2l0aW9uLnJlc29sdmUsXG4gICAgICAgICAgICAgIHJlamVjdDogY3VycmVudFRyYW5zaXRpb24ucmVqZWN0LFxuICAgICAgICAgICAgICBwcm9taXNlOiBjdXJyZW50VHJhbnNpdGlvbi5wcm9taXNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gTm90ZSB0aGF0IGl0J3MgaW1wb3J0YW50IHRvIGhhdmUgdGhlIFJvdXRlciBwcm9jZXNzIHRoZSBldmVudHMgX2JlZm9yZV8gdGhlIGV2ZW50IGlzXG4gICAgICAgIC8vIHB1c2hlZCB0aHJvdWdoIHRoZSBwdWJsaWMgb2JzZXJ2YWJsZS4gVGhpcyBlbnN1cmVzIHRoZSBjb3JyZWN0IHJvdXRlciBzdGF0ZSBpcyBpbiBwbGFjZVxuICAgICAgICAvLyBiZWZvcmUgYXBwbGljYXRpb25zIG9ic2VydmUgdGhlIGV2ZW50cy5cbiAgICAgICAgaWYgKGlzUHVibGljUm91dGVyRXZlbnQoZSkpIHtcbiAgICAgICAgICB0aGlzLl9ldmVudHMubmV4dChlKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZTogdW5rbm93bikge1xuICAgICAgICB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy50cmFuc2l0aW9uQWJvcnRTdWJqZWN0Lm5leHQoZSBhcyBFcnJvcik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5ldmVudHNTdWJzY3JpcHRpb24uYWRkKHN1YnNjcmlwdGlvbik7XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIHJlc2V0Um9vdENvbXBvbmVudFR5cGUocm9vdENvbXBvbmVudFR5cGU6IFR5cGU8YW55Pik6IHZvaWQge1xuICAgIC8vIFRPRE86IHZzYXZraW4gcm91dGVyIDQuMCBzaG91bGQgbWFrZSB0aGUgcm9vdCBjb21wb25lbnQgc2V0IHRvIG51bGxcbiAgICAvLyB0aGlzIHdpbGwgc2ltcGxpZnkgdGhlIGxpZmVjeWNsZSBvZiB0aGUgcm91dGVyLlxuICAgIHRoaXMucm91dGVyU3RhdGUucm9vdC5jb21wb25lbnQgPSByb290Q29tcG9uZW50VHlwZTtcbiAgICB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5yb290Q29tcG9uZW50VHlwZSA9IHJvb3RDb21wb25lbnRUeXBlO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdXAgdGhlIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lciBhbmQgcGVyZm9ybXMgdGhlIGluaXRpYWwgbmF2aWdhdGlvbi5cbiAgICovXG4gIGluaXRpYWxOYXZpZ2F0aW9uKCk6IHZvaWQge1xuICAgIHRoaXMuc2V0VXBMb2NhdGlvbkNoYW5nZUxpc3RlbmVyKCk7XG4gICAgaWYgKCF0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5oYXNSZXF1ZXN0ZWROYXZpZ2F0aW9uKSB7XG4gICAgICB0aGlzLm5hdmlnYXRlVG9TeW5jV2l0aEJyb3dzZXIoXG4gICAgICAgICAgdGhpcy5sb2NhdGlvbi5wYXRoKHRydWUpLCBJTVBFUkFUSVZFX05BVklHQVRJT04sIHRoaXMuc3RhdGVNYW5hZ2VyLnJlc3RvcmVkU3RhdGUoKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdXAgdGhlIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lci4gVGhpcyBsaXN0ZW5lciBkZXRlY3RzIG5hdmlnYXRpb25zIHRyaWdnZXJlZCBmcm9tIG91dHNpZGVcbiAgICogdGhlIFJvdXRlciAodGhlIGJyb3dzZXIgYmFjay9mb3J3YXJkIGJ1dHRvbnMsIGZvciBleGFtcGxlKSBhbmQgc2NoZWR1bGVzIGEgY29ycmVzcG9uZGluZyBSb3V0ZXJcbiAgICogbmF2aWdhdGlvbiBzbyB0aGF0IHRoZSBjb3JyZWN0IGV2ZW50cywgZ3VhcmRzLCBldGMuIGFyZSB0cmlnZ2VyZWQuXG4gICAqL1xuICBzZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTogdm9pZCB7XG4gICAgLy8gRG9uJ3QgbmVlZCB0byB1c2UgWm9uZS53cmFwIGFueSBtb3JlLCBiZWNhdXNlIHpvbmUuanNcbiAgICAvLyBhbHJlYWR5IHBhdGNoIG9uUG9wU3RhdGUsIHNvIGxvY2F0aW9uIGNoYW5nZSBjYWxsYmFjayB3aWxsXG4gICAgLy8gcnVuIGludG8gbmdab25lXG4gICAgaWYgKCF0aGlzLm5vblJvdXRlckN1cnJlbnRFbnRyeUNoYW5nZVN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5ub25Sb3V0ZXJDdXJyZW50RW50cnlDaGFuZ2VTdWJzY3JpcHRpb24gPVxuICAgICAgICAgIHRoaXMuc3RhdGVNYW5hZ2VyLnJlZ2lzdGVyTm9uUm91dGVyQ3VycmVudEVudHJ5Q2hhbmdlTGlzdGVuZXIoKHVybCwgc3RhdGUpID0+IHtcbiAgICAgICAgICAgIC8vIFRoZSBgc2V0VGltZW91dGAgd2FzIGFkZGVkIGluICMxMjE2MCBhbmQgaXMgbGlrZWx5IHRvIHN1cHBvcnQgQW5ndWxhci9Bbmd1bGFySlNcbiAgICAgICAgICAgIC8vIGh5YnJpZCBhcHBzLlxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIHRoaXMubmF2aWdhdGVUb1N5bmNXaXRoQnJvd3Nlcih1cmwsICdwb3BzdGF0ZScsIHN0YXRlKTtcbiAgICAgICAgICAgIH0sIDApO1xuICAgICAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTY2hlZHVsZXMgYSByb3V0ZXIgbmF2aWdhdGlvbiB0byBzeW5jaHJvbml6ZSBSb3V0ZXIgc3RhdGUgd2l0aCB0aGUgYnJvd3NlciBzdGF0ZS5cbiAgICpcbiAgICogVGhpcyBpcyBkb25lIGFzIGEgcmVzcG9uc2UgdG8gYSBwb3BzdGF0ZSBldmVudCBhbmQgdGhlIGluaXRpYWwgbmF2aWdhdGlvbi4gVGhlc2VcbiAgICogdHdvIHNjZW5hcmlvcyByZXByZXNlbnQgdGltZXMgd2hlbiB0aGUgYnJvd3NlciBVUkwvc3RhdGUgaGFzIGJlZW4gdXBkYXRlZCBhbmRcbiAgICogdGhlIFJvdXRlciBuZWVkcyB0byByZXNwb25kIHRvIGVuc3VyZSBpdHMgaW50ZXJuYWwgc3RhdGUgbWF0Y2hlcy5cbiAgICovXG4gIHByaXZhdGUgbmF2aWdhdGVUb1N5bmNXaXRoQnJvd3NlcihcbiAgICAgIHVybDogc3RyaW5nLCBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLCBzdGF0ZTogUmVzdG9yZWRTdGF0ZXxudWxsfHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHtyZXBsYWNlVXJsOiB0cnVlfTtcblxuICAgIC8vIFRPRE86IHJlc3RvcmVkU3RhdGUgc2hvdWxkIGFsd2F5cyBpbmNsdWRlIHRoZSBlbnRpcmUgc3RhdGUsIHJlZ2FyZGxlc3NcbiAgICAvLyBvZiBuYXZpZ2F0aW9uSWQuIFRoaXMgcmVxdWlyZXMgYSBicmVha2luZyBjaGFuZ2UgdG8gdXBkYXRlIHRoZSB0eXBlIG9uXG4gICAgLy8gTmF2aWdhdGlvblN0YXJ04oCZcyByZXN0b3JlZFN0YXRlLCB3aGljaCBjdXJyZW50bHkgcmVxdWlyZXMgbmF2aWdhdGlvbklkXG4gICAgLy8gdG8gYWx3YXlzIGJlIHByZXNlbnQuIFRoZSBSb3V0ZXIgdXNlZCB0byBvbmx5IHJlc3RvcmUgaGlzdG9yeSBzdGF0ZSBpZlxuICAgIC8vIGEgbmF2aWdhdGlvbklkIHdhcyBwcmVzZW50LlxuXG4gICAgLy8gVGhlIHN0b3JlZCBuYXZpZ2F0aW9uSWQgaXMgdXNlZCBieSB0aGUgUm91dGVyU2Nyb2xsZXIgdG8gcmV0cmlldmUgdGhlIHNjcm9sbFxuICAgIC8vIHBvc2l0aW9uIGZvciB0aGUgcGFnZS5cbiAgICBjb25zdCByZXN0b3JlZFN0YXRlID0gc3RhdGU/Lm5hdmlnYXRpb25JZCA/IHN0YXRlIDogbnVsbDtcblxuICAgIC8vIFNlcGFyYXRlIHRvIE5hdmlnYXRpb25TdGFydC5yZXN0b3JlZFN0YXRlLCB3ZSBtdXN0IGFsc28gcmVzdG9yZSB0aGUgc3RhdGUgdG9cbiAgICAvLyBoaXN0b3J5LnN0YXRlIGFuZCBnZW5lcmF0ZSBhIG5ldyBuYXZpZ2F0aW9uSWQsIHNpbmNlIGl0IHdpbGwgYmUgb3ZlcndyaXR0ZW5cbiAgICBpZiAoc3RhdGUpIHtcbiAgICAgIGNvbnN0IHN0YXRlQ29weSA9IHsuLi5zdGF0ZX0gYXMgUGFydGlhbDxSZXN0b3JlZFN0YXRlPjtcbiAgICAgIGRlbGV0ZSBzdGF0ZUNvcHkubmF2aWdhdGlvbklkO1xuICAgICAgZGVsZXRlIHN0YXRlQ29weS7JtXJvdXRlclBhZ2VJZDtcbiAgICAgIGlmIChPYmplY3Qua2V5cyhzdGF0ZUNvcHkpLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICBleHRyYXMuc3RhdGUgPSBzdGF0ZUNvcHk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbih1cmxUcmVlLCBzb3VyY2UsIHJlc3RvcmVkU3RhdGUsIGV4dHJhcyk7XG4gIH1cblxuICAvKiogVGhlIGN1cnJlbnQgVVJMLiAqL1xuICBnZXQgdXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuc2VyaWFsaXplVXJsKHRoaXMuY3VycmVudFVybFRyZWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGN1cnJlbnQgYE5hdmlnYXRpb25gIG9iamVjdCB3aGVuIHRoZSByb3V0ZXIgaXMgbmF2aWdhdGluZyxcbiAgICogYW5kIGBudWxsYCB3aGVuIGlkbGUuXG4gICAqL1xuICBnZXRDdXJyZW50TmF2aWdhdGlvbigpOiBOYXZpZ2F0aW9ufG51bGwge1xuICAgIHJldHVybiB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5jdXJyZW50TmF2aWdhdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgYE5hdmlnYXRpb25gIG9iamVjdCBvZiB0aGUgbW9zdCByZWNlbnQgbmF2aWdhdGlvbiB0byBzdWNjZWVkIGFuZCBgbnVsbGAgaWYgdGhlcmVcbiAgICogICAgIGhhcyBub3QgYmVlbiBhIHN1Y2Nlc3NmdWwgbmF2aWdhdGlvbiB5ZXQuXG4gICAqL1xuICBnZXQgbGFzdFN1Y2Nlc3NmdWxOYXZpZ2F0aW9uKCk6IE5hdmlnYXRpb258bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNldHMgdGhlIHJvdXRlIGNvbmZpZ3VyYXRpb24gdXNlZCBmb3IgbmF2aWdhdGlvbiBhbmQgZ2VuZXJhdGluZyBsaW5rcy5cbiAgICpcbiAgICogQHBhcmFtIGNvbmZpZyBUaGUgcm91dGUgYXJyYXkgZm9yIHRoZSBuZXcgY29uZmlndXJhdGlvbi5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5yZXNldENvbmZpZyhbXG4gICAqICB7IHBhdGg6ICd0ZWFtLzppZCcsIGNvbXBvbmVudDogVGVhbUNtcCwgY2hpbGRyZW46IFtcbiAgICogICAgeyBwYXRoOiAnc2ltcGxlJywgY29tcG9uZW50OiBTaW1wbGVDbXAgfSxcbiAgICogICAgeyBwYXRoOiAndXNlci86bmFtZScsIGNvbXBvbmVudDogVXNlckNtcCB9XG4gICAqICBdfVxuICAgKiBdKTtcbiAgICogYGBgXG4gICAqL1xuICByZXNldENvbmZpZyhjb25maWc6IFJvdXRlcyk6IHZvaWQge1xuICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmIHZhbGlkYXRlQ29uZmlnKGNvbmZpZyk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWcubWFwKHN0YW5kYXJkaXplQ29uZmlnKTtcbiAgICB0aGlzLm5hdmlnYXRlZCA9IGZhbHNlO1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLmRpc3Bvc2UoKTtcbiAgfVxuXG4gIC8qKiBEaXNwb3NlcyBvZiB0aGUgcm91dGVyLiAqL1xuICBkaXNwb3NlKCk6IHZvaWQge1xuICAgIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmNvbXBsZXRlKCk7XG4gICAgaWYgKHRoaXMubm9uUm91dGVyQ3VycmVudEVudHJ5Q2hhbmdlU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLm5vblJvdXRlckN1cnJlbnRFbnRyeUNoYW5nZVN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgdGhpcy5ub25Sb3V0ZXJDdXJyZW50RW50cnlDaGFuZ2VTdWJzY3JpcHRpb24gPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHRoaXMuZGlzcG9zZWQgPSB0cnVlO1xuICAgIHRoaXMuZXZlbnRzU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICAvKipcbiAgICogQXBwZW5kcyBVUkwgc2VnbWVudHMgdG8gdGhlIGN1cnJlbnQgVVJMIHRyZWUgdG8gY3JlYXRlIGEgbmV3IFVSTCB0cmVlLlxuICAgKlxuICAgKiBAcGFyYW0gY29tbWFuZHMgQW4gYXJyYXkgb2YgVVJMIGZyYWdtZW50cyB3aXRoIHdoaWNoIHRvIGNvbnN0cnVjdCB0aGUgbmV3IFVSTCB0cmVlLlxuICAgKiBJZiB0aGUgcGF0aCBpcyBzdGF0aWMsIGNhbiBiZSB0aGUgbGl0ZXJhbCBVUkwgc3RyaW5nLiBGb3IgYSBkeW5hbWljIHBhdGgsIHBhc3MgYW4gYXJyYXkgb2YgcGF0aFxuICAgKiBzZWdtZW50cywgZm9sbG93ZWQgYnkgdGhlIHBhcmFtZXRlcnMgZm9yIGVhY2ggc2VnbWVudC5cbiAgICogVGhlIGZyYWdtZW50cyBhcmUgYXBwbGllZCB0byB0aGUgY3VycmVudCBVUkwgdHJlZSBvciB0aGUgb25lIHByb3ZpZGVkICBpbiB0aGUgYHJlbGF0aXZlVG9gXG4gICAqIHByb3BlcnR5IG9mIHRoZSBvcHRpb25zIG9iamVjdCwgaWYgc3VwcGxpZWQuXG4gICAqIEBwYXJhbSBuYXZpZ2F0aW9uRXh0cmFzIE9wdGlvbnMgdGhhdCBjb250cm9sIHRoZSBuYXZpZ2F0aW9uIHN0cmF0ZWd5LlxuICAgKiBAcmV0dXJucyBUaGUgbmV3IFVSTCB0cmVlLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBgYGBcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCAndXNlcicsIDExXSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMztleHBhbmQ9dHJ1ZS91c2VyLzExXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge2V4cGFuZDogdHJ1ZX0sICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8geW91IGNhbiBjb2xsYXBzZSBzdGF0aWMgc2VnbWVudHMgbGlrZSB0aGlzICh0aGlzIHdvcmtzIG9ubHkgd2l0aCB0aGUgZmlyc3QgcGFzc2VkLWluIHZhbHVlKTpcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbS8zMy91c2VyJywgdXNlcklkXSk7XG4gICAqXG4gICAqIC8vIElmIHRoZSBmaXJzdCBzZWdtZW50IGNhbiBjb250YWluIHNsYXNoZXMsIGFuZCB5b3UgZG8gbm90IHdhbnQgdGhlIHJvdXRlciB0byBzcGxpdCBpdCxcbiAgICogLy8geW91IGNhbiBkbyB0aGUgZm9sbG93aW5nOlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbe3NlZ21lbnRQYXRoOiAnL29uZS90d28nfV0pO1xuICAgKlxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvKHVzZXIvMTEvL3JpZ2h0OmNoYXQpXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiAnY2hhdCd9fV0pO1xuICAgKlxuICAgKiAvLyByZW1vdmUgdGhlIHJpZ2h0IHNlY29uZGFyeSBub2RlXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiBudWxsfX1dKTtcbiAgICpcbiAgICogLy8gYXNzdW1pbmcgdGhlIGN1cnJlbnQgdXJsIGlzIGAvdGVhbS8zMy91c2VyLzExYCBhbmQgdGhlIHJvdXRlIHBvaW50cyB0byBgdXNlci8xMWBcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8xMS9kZXRhaWxzXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnZGV0YWlscyddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8yMlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy4uLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS80NC91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vLi4vdGVhbS80NC91c2VyLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiBOb3RlIHRoYXQgYSB2YWx1ZSBvZiBgbnVsbGAgb3IgYHVuZGVmaW5lZGAgZm9yIGByZWxhdGl2ZVRvYCBpbmRpY2F0ZXMgdGhhdCB0aGVcbiAgICogdHJlZSBzaG91bGQgYmUgY3JlYXRlZCByZWxhdGl2ZSB0byB0aGUgcm9vdC5cbiAgICogYGBgXG4gICAqL1xuICBjcmVhdGVVcmxUcmVlKGNvbW1hbmRzOiBhbnlbXSwgbmF2aWdhdGlvbkV4dHJhczogVXJsQ3JlYXRpb25PcHRpb25zID0ge30pOiBVcmxUcmVlIHtcbiAgICBjb25zdCB7cmVsYXRpdmVUbywgcXVlcnlQYXJhbXMsIGZyYWdtZW50LCBxdWVyeVBhcmFtc0hhbmRsaW5nLCBwcmVzZXJ2ZUZyYWdtZW50fSA9XG4gICAgICAgIG5hdmlnYXRpb25FeHRyYXM7XG4gICAgY29uc3QgZiA9IHByZXNlcnZlRnJhZ21lbnQgPyB0aGlzLmN1cnJlbnRVcmxUcmVlLmZyYWdtZW50IDogZnJhZ21lbnQ7XG4gICAgbGV0IHE6IFBhcmFtc3xudWxsID0gbnVsbDtcbiAgICBzd2l0Y2ggKHF1ZXJ5UGFyYW1zSGFuZGxpbmcpIHtcbiAgICAgIGNhc2UgJ21lcmdlJzpcbiAgICAgICAgcSA9IHsuLi50aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zLCAuLi5xdWVyeVBhcmFtc307XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncHJlc2VydmUnOlxuICAgICAgICBxID0gdGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcztcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBxID0gcXVlcnlQYXJhbXMgfHwgbnVsbDtcbiAgICB9XG4gICAgaWYgKHEgIT09IG51bGwpIHtcbiAgICAgIHEgPSB0aGlzLnJlbW92ZUVtcHR5UHJvcHMocSk7XG4gICAgfVxuXG4gICAgbGV0IHJlbGF0aXZlVG9VcmxTZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cHx1bmRlZmluZWQ7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlbGF0aXZlVG9TbmFwc2hvdCA9IHJlbGF0aXZlVG8gPyByZWxhdGl2ZVRvLnNuYXBzaG90IDogdGhpcy5yb3V0ZXJTdGF0ZS5zbmFwc2hvdC5yb290O1xuICAgICAgcmVsYXRpdmVUb1VybFNlZ21lbnRHcm91cCA9IGNyZWF0ZVNlZ21lbnRHcm91cEZyb21Sb3V0ZShyZWxhdGl2ZVRvU25hcHNob3QpO1xuICAgIH0gY2F0Y2ggKGU6IHVua25vd24pIHtcbiAgICAgIC8vIFRoaXMgaXMgc3RyaWN0bHkgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IHdpdGggdGVzdHMgdGhhdCBjcmVhdGVcbiAgICAgIC8vIGludmFsaWQgYEFjdGl2YXRlZFJvdXRlYCBtb2Nrcy5cbiAgICAgIC8vIE5vdGU6IHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gaGF2aW5nIHRoaXMgZmFsbGJhY2sgZm9yIGludmFsaWQgYEFjdGl2YXRlZFJvdXRlYCBzZXR1cHMgYW5kXG4gICAgICAvLyBqdXN0IHRocm93aW5nIGlzIH41MDAgdGVzdCBmYWlsdXJlcy4gRml4aW5nIGFsbCBvZiB0aG9zZSB0ZXN0cyBieSBoYW5kIGlzIG5vdCBmZWFzaWJsZSBhdFxuICAgICAgLy8gdGhlIG1vbWVudC5cbiAgICAgIGlmICh0eXBlb2YgY29tbWFuZHNbMF0gIT09ICdzdHJpbmcnIHx8ICFjb21tYW5kc1swXS5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAgICAgLy8gTmF2aWdhdGlvbnMgdGhhdCB3ZXJlIGFic29sdXRlIGluIHRoZSBvbGQgd2F5IG9mIGNyZWF0aW5nIFVybFRyZWVzXG4gICAgICAgIC8vIHdvdWxkIHN0aWxsIHdvcmsgYmVjYXVzZSB0aGV5IHdvdWxkbid0IGF0dGVtcHQgdG8gbWF0Y2ggdGhlXG4gICAgICAgIC8vIHNlZ21lbnRzIGluIHRoZSBgQWN0aXZhdGVkUm91dGVgIHRvIHRoZSBgY3VycmVudFVybFRyZWVgIGJ1dFxuICAgICAgICAvLyBpbnN0ZWFkIGp1c3QgcmVwbGFjZSB0aGUgcm9vdCBzZWdtZW50IHdpdGggdGhlIG5hdmlnYXRpb24gcmVzdWx0LlxuICAgICAgICAvLyBOb24tYWJzb2x1dGUgbmF2aWdhdGlvbnMgd291bGQgZmFpbCB0byBhcHBseSB0aGUgY29tbWFuZHMgYmVjYXVzZVxuICAgICAgICAvLyB0aGUgbG9naWMgY291bGQgbm90IGZpbmQgdGhlIHNlZ21lbnQgdG8gcmVwbGFjZSAoc28gdGhleSdkIGFjdCBsaWtlIHRoZXJlIHdlcmUgbm9cbiAgICAgICAgLy8gY29tbWFuZHMpLlxuICAgICAgICBjb21tYW5kcyA9IFtdO1xuICAgICAgfVxuICAgICAgcmVsYXRpdmVUb1VybFNlZ21lbnRHcm91cCA9IHRoaXMuY3VycmVudFVybFRyZWUucm9vdDtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZVVybFRyZWVGcm9tU2VnbWVudEdyb3VwKHJlbGF0aXZlVG9VcmxTZWdtZW50R3JvdXAsIGNvbW1hbmRzLCBxLCBmID8/IG51bGwpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlcyB0byBhIHZpZXcgdXNpbmcgYW4gYWJzb2x1dGUgcm91dGUgcGF0aC5cbiAgICpcbiAgICogQHBhcmFtIHVybCBBbiBhYnNvbHV0ZSBwYXRoIGZvciBhIGRlZmluZWQgcm91dGUuIFRoZSBmdW5jdGlvbiBkb2VzIG5vdCBhcHBseSBhbnkgZGVsdGEgdG8gdGhlXG4gICAqICAgICBjdXJyZW50IFVSTC5cbiAgICogQHBhcmFtIGV4dHJhcyBBbiBvYmplY3QgY29udGFpbmluZyBwcm9wZXJ0aWVzIHRoYXQgbW9kaWZ5IHRoZSBuYXZpZ2F0aW9uIHN0cmF0ZWd5LlxuICAgKlxuICAgKiBAcmV0dXJucyBBIFByb21pc2UgdGhhdCByZXNvbHZlcyB0byAndHJ1ZScgd2hlbiBuYXZpZ2F0aW9uIHN1Y2NlZWRzLFxuICAgKiB0byAnZmFsc2UnIHdoZW4gbmF2aWdhdGlvbiBmYWlscywgb3IgaXMgcmVqZWN0ZWQgb24gZXJyb3IuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIFRoZSBmb2xsb3dpbmcgY2FsbHMgcmVxdWVzdCBuYXZpZ2F0aW9uIHRvIGFuIGFic29sdXRlIHBhdGguXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIubmF2aWdhdGVCeVVybChcIi90ZWFtLzMzL3VzZXIvMTFcIik7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTFxuICAgKiByb3V0ZXIubmF2aWdhdGVCeVVybChcIi90ZWFtLzMzL3VzZXIvMTFcIiwgeyBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpXG4gICAqXG4gICAqL1xuICBuYXZpZ2F0ZUJ5VXJsKHVybDogc3RyaW5nfFVybFRyZWUsIGV4dHJhczogTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyA9IHtcbiAgICBza2lwTG9jYXRpb25DaGFuZ2U6IGZhbHNlXG4gIH0pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSB7XG4gICAgICBpZiAodGhpcy5pc05nWm9uZUVuYWJsZWQgJiYgIU5nWm9uZS5pc0luQW5ndWxhclpvbmUoKSkge1xuICAgICAgICB0aGlzLmNvbnNvbGUud2FybihcbiAgICAgICAgICAgIGBOYXZpZ2F0aW9uIHRyaWdnZXJlZCBvdXRzaWRlIEFuZ3VsYXIgem9uZSwgZGlkIHlvdSBmb3JnZXQgdG8gY2FsbCAnbmdab25lLnJ1bigpJz9gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gaXNVcmxUcmVlKHVybCkgPyB1cmwgOiB0aGlzLnBhcnNlVXJsKHVybCk7XG4gICAgY29uc3QgbWVyZ2VkVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh1cmxUcmVlLCB0aGlzLnJhd1VybFRyZWUpO1xuXG4gICAgcmV0dXJuIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKG1lcmdlZFRyZWUsIElNUEVSQVRJVkVfTkFWSUdBVElPTiwgbnVsbCwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZSBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgYXJyYXkgb2YgY29tbWFuZHMgYW5kIGEgc3RhcnRpbmcgcG9pbnQuXG4gICAqIElmIG5vIHN0YXJ0aW5nIHJvdXRlIGlzIHByb3ZpZGVkLCB0aGUgbmF2aWdhdGlvbiBpcyBhYnNvbHV0ZS5cbiAgICpcbiAgICogQHBhcmFtIGNvbW1hbmRzIEFuIGFycmF5IG9mIFVSTCBmcmFnbWVudHMgd2l0aCB3aGljaCB0byBjb25zdHJ1Y3QgdGhlIHRhcmdldCBVUkwuXG4gICAqIElmIHRoZSBwYXRoIGlzIHN0YXRpYywgY2FuIGJlIHRoZSBsaXRlcmFsIFVSTCBzdHJpbmcuIEZvciBhIGR5bmFtaWMgcGF0aCwgcGFzcyBhbiBhcnJheSBvZiBwYXRoXG4gICAqIHNlZ21lbnRzLCBmb2xsb3dlZCBieSB0aGUgcGFyYW1ldGVycyBmb3IgZWFjaCBzZWdtZW50LlxuICAgKiBUaGUgZnJhZ21lbnRzIGFyZSBhcHBsaWVkIHRvIHRoZSBjdXJyZW50IFVSTCBvciB0aGUgb25lIHByb3ZpZGVkICBpbiB0aGUgYHJlbGF0aXZlVG9gIHByb3BlcnR5XG4gICAqIG9mIHRoZSBvcHRpb25zIG9iamVjdCwgaWYgc3VwcGxpZWQuXG4gICAqIEBwYXJhbSBleHRyYXMgQW4gb3B0aW9ucyBvYmplY3QgdGhhdCBkZXRlcm1pbmVzIGhvdyB0aGUgVVJMIHNob3VsZCBiZSBjb25zdHJ1Y3RlZCBvclxuICAgKiAgICAgaW50ZXJwcmV0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGB0cnVlYCB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsIHRvIGBmYWxzZWAgd2hlbiBuYXZpZ2F0aW9uXG4gICAqICAgICBmYWlscyxcbiAgICogb3IgaXMgcmVqZWN0ZWQgb24gZXJyb3IuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIFRoZSBmb2xsb3dpbmcgY2FsbHMgcmVxdWVzdCBuYXZpZ2F0aW9uIHRvIGEgZHluYW1pYyByb3V0ZSBwYXRoIHJlbGF0aXZlIHRvIHRoZSBjdXJyZW50IFVSTC5cbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZShbJ3RlYW0nLCAzMywgJ3VzZXInLCAxMV0sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBOYXZpZ2F0ZSB3aXRob3V0IHVwZGF0aW5nIHRoZSBVUkwsIG92ZXJyaWRpbmcgdGhlIGRlZmF1bHQgYmVoYXZpb3JcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlLCBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWV9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRlcilcbiAgICpcbiAgICovXG4gIG5hdmlnYXRlKGNvbW1hbmRzOiBhbnlbXSwgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3NraXBMb2NhdGlvbkNoYW5nZTogZmFsc2V9KTpcbiAgICAgIFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHMpO1xuICAgIHJldHVybiB0aGlzLm5hdmlnYXRlQnlVcmwodGhpcy5jcmVhdGVVcmxUcmVlKGNvbW1hbmRzLCBleHRyYXMpLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqIFNlcmlhbGl6ZXMgYSBgVXJsVHJlZWAgaW50byBhIHN0cmluZyAqL1xuICBzZXJpYWxpemVVcmwodXJsOiBVcmxUcmVlKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICB9XG5cbiAgLyoqIFBhcnNlcyBhIHN0cmluZyBpbnRvIGEgYFVybFRyZWVgICovXG4gIHBhcnNlVXJsKHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiB0aGlzLnVybFNlcmlhbGl6ZXIucGFyc2UodXJsKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiB0aGlzLnVybFNlcmlhbGl6ZXIucGFyc2UoJy8nKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB3aGV0aGVyIHRoZSB1cmwgaXMgYWN0aXZhdGVkLlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZFxuICAgKiBVc2UgYElzQWN0aXZlTWF0Y2hPcHRpb25zYCBpbnN0ZWFkLlxuICAgKlxuICAgKiAtIFRoZSBlcXVpdmFsZW50IGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2AgZm9yIGB0cnVlYCBpc1xuICAgKiBge3BhdGhzOiAnZXhhY3QnLCBxdWVyeVBhcmFtczogJ2V4YWN0JywgZnJhZ21lbnQ6ICdpZ25vcmVkJywgbWF0cml4UGFyYW1zOiAnaWdub3JlZCd9YC5cbiAgICogLSBUaGUgZXF1aXZhbGVudCBmb3IgYGZhbHNlYCBpc1xuICAgKiBge3BhdGhzOiAnc3Vic2V0JywgcXVlcnlQYXJhbXM6ICdzdWJzZXQnLCBmcmFnbWVudDogJ2lnbm9yZWQnLCBtYXRyaXhQYXJhbXM6ICdpZ25vcmVkJ31gLlxuICAgKi9cbiAgaXNBY3RpdmUodXJsOiBzdHJpbmd8VXJsVHJlZSwgZXhhY3Q6IGJvb2xlYW4pOiBib29sZWFuO1xuICAvKipcbiAgICogUmV0dXJucyB3aGV0aGVyIHRoZSB1cmwgaXMgYWN0aXZhdGVkLlxuICAgKi9cbiAgaXNBY3RpdmUodXJsOiBzdHJpbmd8VXJsVHJlZSwgbWF0Y2hPcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IGJvb2xlYW47XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgaXNBY3RpdmUodXJsOiBzdHJpbmd8VXJsVHJlZSwgbWF0Y2hPcHRpb25zOiBib29sZWFufElzQWN0aXZlTWF0Y2hPcHRpb25zKTogYm9vbGVhbjtcbiAgaXNBY3RpdmUodXJsOiBzdHJpbmd8VXJsVHJlZSwgbWF0Y2hPcHRpb25zOiBib29sZWFufElzQWN0aXZlTWF0Y2hPcHRpb25zKTogYm9vbGVhbiB7XG4gICAgbGV0IG9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zO1xuICAgIGlmIChtYXRjaE9wdGlvbnMgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMgPSB7Li4uZXhhY3RNYXRjaE9wdGlvbnN9O1xuICAgIH0gZWxzZSBpZiAobWF0Y2hPcHRpb25zID09PSBmYWxzZSkge1xuICAgICAgb3B0aW9ucyA9IHsuLi5zdWJzZXRNYXRjaE9wdGlvbnN9O1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zID0gbWF0Y2hPcHRpb25zO1xuICAgIH1cbiAgICBpZiAoaXNVcmxUcmVlKHVybCkpIHtcbiAgICAgIHJldHVybiBjb250YWluc1RyZWUodGhpcy5jdXJyZW50VXJsVHJlZSwgdXJsLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIHJldHVybiBjb250YWluc1RyZWUodGhpcy5jdXJyZW50VXJsVHJlZSwgdXJsVHJlZSwgb3B0aW9ucyk7XG4gIH1cblxuICBwcml2YXRlIHJlbW92ZUVtcHR5UHJvcHMocGFyYW1zOiBQYXJhbXMpOiBQYXJhbXMge1xuICAgIHJldHVybiBPYmplY3QuZW50cmllcyhwYXJhbXMpLnJlZHVjZSgocmVzdWx0OiBQYXJhbXMsIFtrZXksIHZhbHVlXTogW3N0cmluZywgYW55XSkgPT4ge1xuICAgICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSwge30pO1xuICB9XG5cbiAgcHJpdmF0ZSBzY2hlZHVsZU5hdmlnYXRpb24oXG4gICAgICByYXdVcmw6IFVybFRyZWUsIHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIsIHJlc3RvcmVkU3RhdGU6IFJlc3RvcmVkU3RhdGV8bnVsbCxcbiAgICAgIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyxcbiAgICAgIHByaW9yUHJvbWlzZT86IHtyZXNvbHZlOiBhbnksIHJlamVjdDogYW55LCBwcm9taXNlOiBQcm9taXNlPGJvb2xlYW4+fSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICh0aGlzLmRpc3Bvc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGZhbHNlKTtcbiAgICB9XG5cbiAgICBsZXQgcmVzb2x2ZTogYW55O1xuICAgIGxldCByZWplY3Q6IGFueTtcbiAgICBsZXQgcHJvbWlzZTogUHJvbWlzZTxib29sZWFuPjtcbiAgICBpZiAocHJpb3JQcm9taXNlKSB7XG4gICAgICByZXNvbHZlID0gcHJpb3JQcm9taXNlLnJlc29sdmU7XG4gICAgICByZWplY3QgPSBwcmlvclByb21pc2UucmVqZWN0O1xuICAgICAgcHJvbWlzZSA9IHByaW9yUHJvbWlzZS5wcm9taXNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBwcm9taXNlID0gbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlcywgcmVqKSA9PiB7XG4gICAgICAgIHJlc29sdmUgPSByZXM7XG4gICAgICAgIHJlamVjdCA9IHJlajtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEluZGljYXRlIHRoYXQgdGhlIG5hdmlnYXRpb24gaXMgaGFwcGVuaW5nLlxuICAgIGNvbnN0IHRhc2tJZCA9IHRoaXMucGVuZGluZ1Rhc2tzLmFkZCgpO1xuICAgIGFmdGVyTmV4dE5hdmlnYXRpb24odGhpcywgKCkgPT4ge1xuICAgICAgLy8gUmVtb3ZlIHBlbmRpbmcgdGFzayBpbiBhIG1pY3JvdGFzayB0byBhbGxvdyBmb3IgY2FuY2VsbGVkXG4gICAgICAvLyBpbml0aWFsIG5hdmlnYXRpb25zIGFuZCByZWRpcmVjdHMgd2l0aGluIHRoZSBzYW1lIHRhc2suXG4gICAgICBxdWV1ZU1pY3JvdGFzaygoKSA9PiB0aGlzLnBlbmRpbmdUYXNrcy5yZW1vdmUodGFza0lkKSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5oYW5kbGVOYXZpZ2F0aW9uUmVxdWVzdCh7XG4gICAgICBzb3VyY2UsXG4gICAgICByZXN0b3JlZFN0YXRlLFxuICAgICAgY3VycmVudFVybFRyZWU6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBjdXJyZW50UmF3VXJsOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgcmF3VXJsLFxuICAgICAgZXh0cmFzLFxuICAgICAgcmVzb2x2ZSxcbiAgICAgIHJlamVjdCxcbiAgICAgIHByb21pc2UsXG4gICAgICBjdXJyZW50U25hcHNob3Q6IHRoaXMucm91dGVyU3RhdGUuc25hcHNob3QsXG4gICAgICBjdXJyZW50Um91dGVyU3RhdGU6IHRoaXMucm91dGVyU3RhdGVcbiAgICB9KTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBlcnJvciBpcyBwcm9wYWdhdGVkIGV2ZW4gdGhvdWdoIGBwcm9jZXNzTmF2aWdhdGlvbnNgIGNhdGNoXG4gICAgLy8gaGFuZGxlciBkb2VzIG5vdCByZXRocm93XG4gICAgcmV0dXJuIHByb21pc2UuY2F0Y2goKGU6IGFueSkgPT4ge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHM6IHN0cmluZ1tdKTogdm9pZCB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29tbWFuZHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjbWQgPSBjb21tYW5kc1tpXTtcbiAgICBpZiAoY21kID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5OVUxMSVNIX0NPTU1BTkQsXG4gICAgICAgICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiZcbiAgICAgICAgICAgICAgYFRoZSByZXF1ZXN0ZWQgcGF0aCBjb250YWlucyAke2NtZH0gc2VnbWVudCBhdCBpbmRleCAke2l9YCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGlzUHVibGljUm91dGVyRXZlbnQoZTogRXZlbnR8UHJpdmF0ZVJvdXRlckV2ZW50cyk6IGUgaXMgRXZlbnQge1xuICByZXR1cm4gKCEoZSBpbnN0YW5jZW9mIEJlZm9yZUFjdGl2YXRlUm91dGVzKSAmJiAhKGUgaW5zdGFuY2VvZiBSZWRpcmVjdFJlcXVlc3QpKTtcbn1cbiJdfQ==