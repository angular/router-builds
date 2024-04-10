/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { inject, Injectable, NgZone, ɵConsole as Console, ɵPendingTasks as PendingTasks, ɵRuntimeError as RuntimeError, } from '@angular/core';
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
 * A service that provides navigation among views and URL manipulation capabilities.
 *
 * @see {@link Route}
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
                            // Persist transient navigation info from the original navigation request.
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.0-next.3+sha-66e8cd2", ngImport: i0, type: Router, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.0.0-next.3+sha-66e8cd2", ngImport: i0, type: Router, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.0-next.3+sha-66e8cd2", ngImport: i0, type: Router, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFDTCxNQUFNLEVBQ04sVUFBVSxFQUNWLE1BQU0sRUFFTixRQUFRLElBQUksT0FBTyxFQUNuQixhQUFhLElBQUksWUFBWSxFQUM3QixhQUFhLElBQUksWUFBWSxHQUM5QixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQWEsT0FBTyxFQUFFLFlBQVksRUFBbUIsTUFBTSxNQUFNLENBQUM7QUFFekUsT0FBTyxFQUFDLDJCQUEyQixFQUFFLDZCQUE2QixFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDN0YsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLDRCQUE0QixDQUFDO0FBRXhELE9BQU8sRUFDTCxvQkFBb0IsRUFFcEIscUJBQXFCLEVBQ3JCLGdCQUFnQixFQUNoQiwwQkFBMEIsRUFDMUIsYUFBYSxFQUdiLGVBQWUsR0FDaEIsTUFBTSxVQUFVLENBQUM7QUFFbEIsT0FBTyxFQUNMLDRCQUE0QixFQUc1QixxQkFBcUIsR0FHdEIsTUFBTSx5QkFBeUIsQ0FBQztBQUNqQyxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUMxRCxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUNyRCxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFFOUMsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLDhCQUE4QixDQUFDO0FBQzFELE9BQU8sRUFBQyxtQkFBbUIsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQzVELE9BQU8sRUFDTCxZQUFZLEVBRVosU0FBUyxFQUVULGFBQWEsR0FFZCxNQUFN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LE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7eUhBL2tCVSxNQUFNOzZIQUFOLE1BQU0sY0FETSxNQUFNOztzR0FDbEIsTUFBTTtrQkFEbEIsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUM7O0FBbWxCaEMsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFrQjtJQUMxQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ3pDLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksWUFBWSw4Q0FFcEIsQ0FBQyxPQUFPLFNBQVMsS0FBSyxXQUFXLElBQUksU0FBUyxDQUFDO2dCQUM3QywrQkFBK0IsR0FBRyxxQkFBcUIsQ0FBQyxFQUFFLENBQzdELENBQUM7UUFDSixDQUFDO0lBQ0gsQ0FBQztBQUNILENBQUM7QUFFRCxTQUFTLG1CQUFtQixDQUFDLENBQThCO0lBQ3pELE9BQU8sQ0FBQyxDQUFDLENBQUMsWUFBWSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksZUFBZSxDQUFDLENBQUM7QUFDakYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtcbiAgaW5qZWN0LFxuICBJbmplY3RhYmxlLFxuICBOZ1pvbmUsXG4gIFR5cGUsXG4gIMm1Q29uc29sZSBhcyBDb25zb2xlLFxuICDJtVBlbmRpbmdUYXNrcyBhcyBQZW5kaW5nVGFza3MsXG4gIMm1UnVudGltZUVycm9yIGFzIFJ1bnRpbWVFcnJvcixcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge09ic2VydmFibGUsIFN1YmplY3QsIFN1YnNjcmlwdGlvbiwgU3Vic2NyaXB0aW9uTGlrZX0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7Y3JlYXRlU2VnbWVudEdyb3VwRnJvbVJvdXRlLCBjcmVhdGVVcmxUcmVlRnJvbVNlZ21lbnRHcm91cH0gZnJvbSAnLi9jcmVhdGVfdXJsX3RyZWUnO1xuaW1wb3J0IHtJTlBVVF9CSU5ERVJ9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0JztcbmltcG9ydCB7UnVudGltZUVycm9yQ29kZX0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IHtcbiAgQmVmb3JlQWN0aXZhdGVSb3V0ZXMsXG4gIEV2ZW50LFxuICBJTVBFUkFUSVZFX05BVklHQVRJT04sXG4gIE5hdmlnYXRpb25DYW5jZWwsXG4gIE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLFxuICBOYXZpZ2F0aW9uRW5kLFxuICBOYXZpZ2F0aW9uVHJpZ2dlcixcbiAgUHJpdmF0ZVJvdXRlckV2ZW50cyxcbiAgUmVkaXJlY3RSZXF1ZXN0LFxufSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge05hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMsIE9uU2FtZVVybE5hdmlnYXRpb24sIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtcbiAgaXNCcm93c2VyVHJpZ2dlcmVkTmF2aWdhdGlvbixcbiAgTmF2aWdhdGlvbixcbiAgTmF2aWdhdGlvbkV4dHJhcyxcbiAgTmF2aWdhdGlvblRyYW5zaXRpb25zLFxuICBSZXN0b3JlZFN0YXRlLFxuICBVcmxDcmVhdGlvbk9wdGlvbnMsXG59IGZyb20gJy4vbmF2aWdhdGlvbl90cmFuc2l0aW9uJztcbmltcG9ydCB7Um91dGVSZXVzZVN0cmF0ZWd5fSBmcm9tICcuL3JvdXRlX3JldXNlX3N0cmF0ZWd5JztcbmltcG9ydCB7Uk9VVEVSX0NPTkZJR1VSQVRJT059IGZyb20gJy4vcm91dGVyX2NvbmZpZyc7XG5pbXBvcnQge1JPVVRFU30gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge1BhcmFtc30gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtTdGF0ZU1hbmFnZXJ9IGZyb20gJy4vc3RhdGVtYW5hZ2VyL3N0YXRlX21hbmFnZXInO1xuaW1wb3J0IHtVcmxIYW5kbGluZ1N0cmF0ZWd5fSBmcm9tICcuL3VybF9oYW5kbGluZ19zdHJhdGVneSc7XG5pbXBvcnQge1xuICBjb250YWluc1RyZWUsXG4gIElzQWN0aXZlTWF0Y2hPcHRpb25zLFxuICBpc1VybFRyZWUsXG4gIFVybFNlZ21lbnRHcm91cCxcbiAgVXJsU2VyaWFsaXplcixcbiAgVXJsVHJlZSxcbn0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge3N0YW5kYXJkaXplQ29uZmlnLCB2YWxpZGF0ZUNvbmZpZ30gZnJvbSAnLi91dGlscy9jb25maWcnO1xuaW1wb3J0IHthZnRlck5leHROYXZpZ2F0aW9ufSBmcm9tICcuL3V0aWxzL25hdmlnYXRpb25zJztcblxuZnVuY3Rpb24gZGVmYXVsdEVycm9ySGFuZGxlcihlcnJvcjogYW55KTogbmV2ZXIge1xuICB0aHJvdyBlcnJvcjtcbn1cblxuLyoqXG4gKiBUaGUgZXF1aXZhbGVudCBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIG9wdGlvbnMgZm9yIGBSb3V0ZXIuaXNBY3RpdmVgIGlzIGNhbGxlZCB3aXRoIGB0cnVlYFxuICogKGV4YWN0ID0gdHJ1ZSkuXG4gKi9cbmV4cG9ydCBjb25zdCBleGFjdE1hdGNoT3B0aW9uczogSXNBY3RpdmVNYXRjaE9wdGlvbnMgPSB7XG4gIHBhdGhzOiAnZXhhY3QnLFxuICBmcmFnbWVudDogJ2lnbm9yZWQnLFxuICBtYXRyaXhQYXJhbXM6ICdpZ25vcmVkJyxcbiAgcXVlcnlQYXJhbXM6ICdleGFjdCcsXG59O1xuXG4vKipcbiAqIFRoZSBlcXVpdmFsZW50IGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2Agb3B0aW9ucyBmb3IgYFJvdXRlci5pc0FjdGl2ZWAgaXMgY2FsbGVkIHdpdGggYGZhbHNlYFxuICogKGV4YWN0ID0gZmFsc2UpLlxuICovXG5leHBvcnQgY29uc3Qgc3Vic2V0TWF0Y2hPcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucyA9IHtcbiAgcGF0aHM6ICdzdWJzZXQnLFxuICBmcmFnbWVudDogJ2lnbm9yZWQnLFxuICBtYXRyaXhQYXJhbXM6ICdpZ25vcmVkJyxcbiAgcXVlcnlQYXJhbXM6ICdzdWJzZXQnLFxufTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBBIHNlcnZpY2UgdGhhdCBwcm92aWRlcyBuYXZpZ2F0aW9uIGFtb25nIHZpZXdzIGFuZCBVUkwgbWFuaXB1bGF0aW9uIGNhcGFiaWxpdGllcy5cbiAqXG4gKiBAc2VlIHtAbGluayBSb3V0ZX1cbiAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gR3VpZGVdKGd1aWRlL3JvdXRpbmcvY29tbW9uLXJvdXRlci10YXNrcykuXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgUm91dGVyIHtcbiAgcHJpdmF0ZSBnZXQgY3VycmVudFVybFRyZWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVNYW5hZ2VyLmdldEN1cnJlbnRVcmxUcmVlKCk7XG4gIH1cbiAgcHJpdmF0ZSBnZXQgcmF3VXJsVHJlZSgpIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZU1hbmFnZXIuZ2V0UmF3VXJsVHJlZSgpO1xuICB9XG4gIHByaXZhdGUgZGlzcG9zZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBub25Sb3V0ZXJDdXJyZW50RW50cnlDaGFuZ2VTdWJzY3JpcHRpb24/OiBTdWJzY3JpcHRpb25MaWtlO1xuICBwcml2YXRlIGlzTmdab25lRW5hYmxlZCA9IGZhbHNlO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgY29uc29sZSA9IGluamVjdChDb25zb2xlKTtcbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0ZU1hbmFnZXIgPSBpbmplY3QoU3RhdGVNYW5hZ2VyKTtcbiAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zID0gaW5qZWN0KFJPVVRFUl9DT05GSUdVUkFUSU9OLCB7b3B0aW9uYWw6IHRydWV9KSB8fCB7fTtcbiAgcHJpdmF0ZSByZWFkb25seSBwZW5kaW5nVGFza3MgPSBpbmplY3QoUGVuZGluZ1Rhc2tzKTtcbiAgcHJpdmF0ZSByZWFkb25seSB1cmxVcGRhdGVTdHJhdGVneSA9IHRoaXMub3B0aW9ucy51cmxVcGRhdGVTdHJhdGVneSB8fCAnZGVmZXJyZWQnO1xuICBwcml2YXRlIHJlYWRvbmx5IG5hdmlnYXRpb25UcmFuc2l0aW9ucyA9IGluamVjdChOYXZpZ2F0aW9uVHJhbnNpdGlvbnMpO1xuICBwcml2YXRlIHJlYWRvbmx5IHVybFNlcmlhbGl6ZXIgPSBpbmplY3QoVXJsU2VyaWFsaXplcik7XG4gIHByaXZhdGUgcmVhZG9ubHkgbG9jYXRpb24gPSBpbmplY3QoTG9jYXRpb24pO1xuICBwcml2YXRlIHJlYWRvbmx5IHVybEhhbmRsaW5nU3RyYXRlZ3kgPSBpbmplY3QoVXJsSGFuZGxpbmdTdHJhdGVneSk7XG5cbiAgLyoqXG4gICAqIFRoZSBwcml2YXRlIGBTdWJqZWN0YCB0eXBlIGZvciB0aGUgcHVibGljIGV2ZW50cyBleHBvc2VkIGluIHRoZSBnZXR0ZXIuIFRoaXMgaXMgdXNlZCBpbnRlcm5hbGx5XG4gICAqIHRvIHB1c2ggZXZlbnRzIHRvLiBUaGUgc2VwYXJhdGUgZmllbGQgYWxsb3dzIHVzIHRvIGV4cG9zZSBzZXBhcmF0ZSB0eXBlcyBpbiB0aGUgcHVibGljIEFQSVxuICAgKiAoaS5lLiwgYW4gT2JzZXJ2YWJsZSByYXRoZXIgdGhhbiB0aGUgU3ViamVjdCkuXG4gICAqL1xuICBwcml2YXRlIF9ldmVudHMgPSBuZXcgU3ViamVjdDxFdmVudD4oKTtcbiAgLyoqXG4gICAqIEFuIGV2ZW50IHN0cmVhbSBmb3Igcm91dGluZyBldmVudHMuXG4gICAqL1xuICBwdWJsaWMgZ2V0IGV2ZW50cygpOiBPYnNlcnZhYmxlPEV2ZW50PiB7XG4gICAgLy8gVE9ETyhhdHNjb3R0KTogVGhpcyBfc2hvdWxkXyBiZSBldmVudHMuYXNPYnNlcnZhYmxlKCkuIEhvd2V2ZXIsIHRoaXMgY2hhbmdlIHJlcXVpcmVzIGludGVybmFsXG4gICAgLy8gY2xlYW51cDogdGVzdHMgYXJlIGRvaW5nIGAocm91dGUuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KS5uZXh0KC4uLilgLiBUaGlzIGlzbid0XG4gICAgLy8gYWxsb3dlZC9zdXBwb3J0ZWQgYnV0IHdlIHN0aWxsIGhhdmUgdG8gZml4IHRoZXNlIG9yIGZpbGUgYnVncyBhZ2FpbnN0IHRoZSB0ZWFtcyBiZWZvcmUgbWFraW5nXG4gICAgLy8gdGhlIGNoYW5nZS5cbiAgICByZXR1cm4gdGhpcy5fZXZlbnRzO1xuICB9XG4gIC8qKlxuICAgKiBUaGUgY3VycmVudCBzdGF0ZSBvZiByb3V0aW5nIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqL1xuICBnZXQgcm91dGVyU3RhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGVNYW5hZ2VyLmdldFJvdXRlclN0YXRlKCk7XG4gIH1cblxuICAvKipcbiAgICogQSBoYW5kbGVyIGZvciBuYXZpZ2F0aW9uIGVycm9ycyBpbiB0aGlzIE5nTW9kdWxlLlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBTdWJzY3JpYmUgdG8gdGhlIGBSb3V0ZXJgIGV2ZW50cyBhbmQgd2F0Y2ggZm9yIGBOYXZpZ2F0aW9uRXJyb3JgIGluc3RlYWQuXG4gICAqICAgYHByb3ZpZGVSb3V0ZXJgIGhhcyB0aGUgYHdpdGhOYXZpZ2F0aW9uRXJyb3JIYW5kbGVyYCBmZWF0dXJlIHRvIG1ha2UgdGhpcyBlYXNpZXIuXG4gICAqIEBzZWUge0BsaW5rIHdpdGhOYXZpZ2F0aW9uRXJyb3JIYW5kbGVyfVxuICAgKi9cbiAgZXJyb3JIYW5kbGVyOiAoZXJyb3I6IGFueSkgPT4gYW55ID0gdGhpcy5vcHRpb25zLmVycm9ySGFuZGxlciB8fCBkZWZhdWx0RXJyb3JIYW5kbGVyO1xuXG4gIC8qKlxuICAgKiBUcnVlIGlmIGF0IGxlYXN0IG9uZSBuYXZpZ2F0aW9uIGV2ZW50IGhhcyBvY2N1cnJlZCxcbiAgICogZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgbmF2aWdhdGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEEgc3RyYXRlZ3kgZm9yIHJlLXVzaW5nIHJvdXRlcy5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgQ29uZmlndXJlIHVzaW5nIGBwcm92aWRlcnNgIGluc3RlYWQ6XG4gICAqICAgYHtwcm92aWRlOiBSb3V0ZVJldXNlU3RyYXRlZ3ksIHVzZUNsYXNzOiBNeVN0cmF0ZWd5fWAuXG4gICAqL1xuICByb3V0ZVJldXNlU3RyYXRlZ3k6IFJvdXRlUmV1c2VTdHJhdGVneSA9IGluamVjdChSb3V0ZVJldXNlU3RyYXRlZ3kpO1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gaGFuZGxlIGEgbmF2aWdhdGlvbiByZXF1ZXN0IHRvIHRoZSBjdXJyZW50IFVSTC5cbiAgICpcbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgQ29uZmlndXJlIHRoaXMgdGhyb3VnaCBgcHJvdmlkZVJvdXRlcmAgb3IgYFJvdXRlck1vZHVsZS5mb3JSb290YCBpbnN0ZWFkLlxuICAgKiBAc2VlIHtAbGluayB3aXRoUm91dGVyQ29uZmlnfVxuICAgKiBAc2VlIHtAbGluayBwcm92aWRlUm91dGVyfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXJNb2R1bGV9XG4gICAqL1xuICBvblNhbWVVcmxOYXZpZ2F0aW9uOiBPblNhbWVVcmxOYXZpZ2F0aW9uID0gdGhpcy5vcHRpb25zLm9uU2FtZVVybE5hdmlnYXRpb24gfHwgJ2lnbm9yZSc7XG5cbiAgY29uZmlnOiBSb3V0ZXMgPSBpbmplY3QoUk9VVEVTLCB7b3B0aW9uYWw6IHRydWV9KT8uZmxhdCgpID8/IFtdO1xuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgd2hldGhlciB0aGUgYXBwbGljYXRpb24gaGFzIG9wdGVkIGluIHRvIGJpbmRpbmcgUm91dGVyIGRhdGEgdG8gY29tcG9uZW50IGlucHV0cy5cbiAgICpcbiAgICogVGhpcyBvcHRpb24gaXMgZW5hYmxlZCBieSB0aGUgYHdpdGhDb21wb25lbnRJbnB1dEJpbmRpbmdgIGZlYXR1cmUgb2YgYHByb3ZpZGVSb3V0ZXJgIG9yXG4gICAqIGBiaW5kVG9Db21wb25lbnRJbnB1dHNgIGluIHRoZSBgRXh0cmFPcHRpb25zYCBvZiBgUm91dGVyTW9kdWxlLmZvclJvb3RgLlxuICAgKi9cbiAgcmVhZG9ubHkgY29tcG9uZW50SW5wdXRCaW5kaW5nRW5hYmxlZDogYm9vbGVhbiA9ICEhaW5qZWN0KElOUFVUX0JJTkRFUiwge29wdGlvbmFsOiB0cnVlfSk7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5pc05nWm9uZUVuYWJsZWQgPSBpbmplY3QoTmdab25lKSBpbnN0YW5jZW9mIE5nWm9uZSAmJiBOZ1pvbmUuaXNJbkFuZ3VsYXJab25lKCk7XG5cbiAgICB0aGlzLnJlc2V0Q29uZmlnKHRoaXMuY29uZmlnKTtcblxuICAgIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zXG4gICAgICAuc2V0dXBOYXZpZ2F0aW9ucyh0aGlzLCB0aGlzLmN1cnJlbnRVcmxUcmVlLCB0aGlzLnJvdXRlclN0YXRlKVxuICAgICAgLnN1YnNjcmliZSh7XG4gICAgICAgIGVycm9yOiAoZSkgPT4ge1xuICAgICAgICAgIHRoaXMuY29uc29sZS53YXJuKG5nRGV2TW9kZSA/IGBVbmhhbmRsZWQgTmF2aWdhdGlvbiBFcnJvcjogJHtlfWAgOiBlKTtcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIHRoaXMuc3Vic2NyaWJlVG9OYXZpZ2F0aW9uRXZlbnRzKCk7XG4gIH1cblxuICBwcml2YXRlIGV2ZW50c1N1YnNjcmlwdGlvbiA9IG5ldyBTdWJzY3JpcHRpb24oKTtcbiAgcHJpdmF0ZSBzdWJzY3JpYmVUb05hdmlnYXRpb25FdmVudHMoKSB7XG4gICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuZXZlbnRzLnN1YnNjcmliZSgoZSkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgY3VycmVudFRyYW5zaXRpb24gPSB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5jdXJyZW50VHJhbnNpdGlvbjtcbiAgICAgICAgY29uc3QgY3VycmVudE5hdmlnYXRpb24gPSB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5jdXJyZW50TmF2aWdhdGlvbjtcbiAgICAgICAgaWYgKGN1cnJlbnRUcmFuc2l0aW9uICE9PSBudWxsICYmIGN1cnJlbnROYXZpZ2F0aW9uICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhpcy5zdGF0ZU1hbmFnZXIuaGFuZGxlUm91dGVyRXZlbnQoZSwgY3VycmVudE5hdmlnYXRpb24pO1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uQ2FuY2VsICYmXG4gICAgICAgICAgICBlLmNvZGUgIT09IE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLlJlZGlyZWN0ICYmXG4gICAgICAgICAgICBlLmNvZGUgIT09IE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLlN1cGVyc2VkZWRCeU5ld05hdmlnYXRpb25cbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIC8vIEl0IHNlZW1zIHdlaXJkIHRoYXQgYG5hdmlnYXRlZGAgaXMgc2V0IHRvIGB0cnVlYCB3aGVuIHRoZSBuYXZpZ2F0aW9uIGlzIHJlamVjdGVkLFxuICAgICAgICAgICAgLy8gaG93ZXZlciBpdCdzIGhvdyB0aGluZ3Mgd2VyZSB3cml0dGVuIGluaXRpYWxseS4gSW52ZXN0aWdhdGlvbiB3b3VsZCBuZWVkIHRvIGJlIGRvbmVcbiAgICAgICAgICAgIC8vIHRvIGRldGVybWluZSBpZiB0aGlzIGNhbiBiZSByZW1vdmVkLlxuICAgICAgICAgICAgdGhpcy5uYXZpZ2F0ZWQgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpIHtcbiAgICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGUgaW5zdGFuY2VvZiBSZWRpcmVjdFJlcXVlc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wdHMgPSBlLm5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnM7XG4gICAgICAgICAgICBjb25zdCBtZXJnZWRUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKFxuICAgICAgICAgICAgICBlLnVybCxcbiAgICAgICAgICAgICAgY3VycmVudFRyYW5zaXRpb24uY3VycmVudFJhd1VybCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBleHRyYXMgPSB7XG4gICAgICAgICAgICAgIC8vIFBlcnNpc3QgdHJhbnNpZW50IG5hdmlnYXRpb24gaW5mbyBmcm9tIHRoZSBvcmlnaW5hbCBuYXZpZ2F0aW9uIHJlcXVlc3QuXG4gICAgICAgICAgICAgIGluZm86IGN1cnJlbnRUcmFuc2l0aW9uLmV4dHJhcy5pbmZvLFxuICAgICAgICAgICAgICBza2lwTG9jYXRpb25DaGFuZ2U6IGN1cnJlbnRUcmFuc2l0aW9uLmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UsXG4gICAgICAgICAgICAgIC8vIFRoZSBVUkwgaXMgYWxyZWFkeSB1cGRhdGVkIGF0IHRoaXMgcG9pbnQgaWYgd2UgaGF2ZSAnZWFnZXInIFVSTFxuICAgICAgICAgICAgICAvLyB1cGRhdGVzIG9yIGlmIHRoZSBuYXZpZ2F0aW9uIHdhcyB0cmlnZ2VyZWQgYnkgdGhlIGJyb3dzZXIgKGJhY2tcbiAgICAgICAgICAgICAgLy8gYnV0dG9uLCBVUkwgYmFyLCBldGMpLiBXZSB3YW50IHRvIHJlcGxhY2UgdGhhdCBpdGVtIGluIGhpc3RvcnlcbiAgICAgICAgICAgICAgLy8gaWYgdGhlIG5hdmlnYXRpb24gaXMgcmVqZWN0ZWQuXG4gICAgICAgICAgICAgIHJlcGxhY2VVcmw6XG4gICAgICAgICAgICAgICAgY3VycmVudFRyYW5zaXRpb24uZXh0cmFzLnJlcGxhY2VVcmwgfHxcbiAgICAgICAgICAgICAgICB0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZWFnZXInIHx8XG4gICAgICAgICAgICAgICAgaXNCcm93c2VyVHJpZ2dlcmVkTmF2aWdhdGlvbihjdXJyZW50VHJhbnNpdGlvbi5zb3VyY2UpLFxuICAgICAgICAgICAgICAvLyBhbGxvdyBkZXZlbG9wZXIgdG8gb3ZlcnJpZGUgZGVmYXVsdCBvcHRpb25zIHdpdGggUmVkaXJlY3RDb21tYW5kXG4gICAgICAgICAgICAgIC4uLm9wdHMsXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbihtZXJnZWRUcmVlLCBJTVBFUkFUSVZFX05BVklHQVRJT04sIG51bGwsIGV4dHJhcywge1xuICAgICAgICAgICAgICByZXNvbHZlOiBjdXJyZW50VHJhbnNpdGlvbi5yZXNvbHZlLFxuICAgICAgICAgICAgICByZWplY3Q6IGN1cnJlbnRUcmFuc2l0aW9uLnJlamVjdCxcbiAgICAgICAgICAgICAgcHJvbWlzZTogY3VycmVudFRyYW5zaXRpb24ucHJvbWlzZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBOb3RlIHRoYXQgaXQncyBpbXBvcnRhbnQgdG8gaGF2ZSB0aGUgUm91dGVyIHByb2Nlc3MgdGhlIGV2ZW50cyBfYmVmb3JlXyB0aGUgZXZlbnQgaXNcbiAgICAgICAgLy8gcHVzaGVkIHRocm91Z2ggdGhlIHB1YmxpYyBvYnNlcnZhYmxlLiBUaGlzIGVuc3VyZXMgdGhlIGNvcnJlY3Qgcm91dGVyIHN0YXRlIGlzIGluIHBsYWNlXG4gICAgICAgIC8vIGJlZm9yZSBhcHBsaWNhdGlvbnMgb2JzZXJ2ZSB0aGUgZXZlbnRzLlxuICAgICAgICBpZiAoaXNQdWJsaWNSb3V0ZXJFdmVudChlKSkge1xuICAgICAgICAgIHRoaXMuX2V2ZW50cy5uZXh0KGUpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlOiB1bmtub3duKSB7XG4gICAgICAgIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLnRyYW5zaXRpb25BYm9ydFN1YmplY3QubmV4dChlIGFzIEVycm9yKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmV2ZW50c1N1YnNjcmlwdGlvbi5hZGQoc3Vic2NyaXB0aW9uKTtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcmVzZXRSb290Q29tcG9uZW50VHlwZShyb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+KTogdm9pZCB7XG4gICAgLy8gVE9ETzogdnNhdmtpbiByb3V0ZXIgNC4wIHNob3VsZCBtYWtlIHRoZSByb290IGNvbXBvbmVudCBzZXQgdG8gbnVsbFxuICAgIC8vIHRoaXMgd2lsbCBzaW1wbGlmeSB0aGUgbGlmZWN5Y2xlIG9mIHRoZSByb3V0ZXIuXG4gICAgdGhpcy5yb3V0ZXJTdGF0ZS5yb290LmNvbXBvbmVudCA9IHJvb3RDb21wb25lbnRUeXBlO1xuICAgIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLnJvb3RDb21wb25lbnRUeXBlID0gcm9vdENvbXBvbmVudFR5cGU7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyIGFuZCBwZXJmb3JtcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaW5pdGlhbE5hdmlnYXRpb24oKTogdm9pZCB7XG4gICAgdGhpcy5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICBpZiAoIXRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmhhc1JlcXVlc3RlZE5hdmlnYXRpb24pIHtcbiAgICAgIHRoaXMubmF2aWdhdGVUb1N5bmNXaXRoQnJvd3NlcihcbiAgICAgICAgdGhpcy5sb2NhdGlvbi5wYXRoKHRydWUpLFxuICAgICAgICBJTVBFUkFUSVZFX05BVklHQVRJT04sXG4gICAgICAgIHRoaXMuc3RhdGVNYW5hZ2VyLnJlc3RvcmVkU3RhdGUoKSxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdXAgdGhlIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lci4gVGhpcyBsaXN0ZW5lciBkZXRlY3RzIG5hdmlnYXRpb25zIHRyaWdnZXJlZCBmcm9tIG91dHNpZGVcbiAgICogdGhlIFJvdXRlciAodGhlIGJyb3dzZXIgYmFjay9mb3J3YXJkIGJ1dHRvbnMsIGZvciBleGFtcGxlKSBhbmQgc2NoZWR1bGVzIGEgY29ycmVzcG9uZGluZyBSb3V0ZXJcbiAgICogbmF2aWdhdGlvbiBzbyB0aGF0IHRoZSBjb3JyZWN0IGV2ZW50cywgZ3VhcmRzLCBldGMuIGFyZSB0cmlnZ2VyZWQuXG4gICAqL1xuICBzZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTogdm9pZCB7XG4gICAgLy8gRG9uJ3QgbmVlZCB0byB1c2UgWm9uZS53cmFwIGFueSBtb3JlLCBiZWNhdXNlIHpvbmUuanNcbiAgICAvLyBhbHJlYWR5IHBhdGNoIG9uUG9wU3RhdGUsIHNvIGxvY2F0aW9uIGNoYW5nZSBjYWxsYmFjayB3aWxsXG4gICAgLy8gcnVuIGludG8gbmdab25lXG4gICAgdGhpcy5ub25Sb3V0ZXJDdXJyZW50RW50cnlDaGFuZ2VTdWJzY3JpcHRpb24gPz89XG4gICAgICB0aGlzLnN0YXRlTWFuYWdlci5yZWdpc3Rlck5vblJvdXRlckN1cnJlbnRFbnRyeUNoYW5nZUxpc3RlbmVyKCh1cmwsIHN0YXRlKSA9PiB7XG4gICAgICAgIC8vIFRoZSBgc2V0VGltZW91dGAgd2FzIGFkZGVkIGluICMxMjE2MCBhbmQgaXMgbGlrZWx5IHRvIHN1cHBvcnQgQW5ndWxhci9Bbmd1bGFySlNcbiAgICAgICAgLy8gaHlicmlkIGFwcHMuXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMubmF2aWdhdGVUb1N5bmNXaXRoQnJvd3Nlcih1cmwsICdwb3BzdGF0ZScsIHN0YXRlKTtcbiAgICAgICAgfSwgMCk7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTY2hlZHVsZXMgYSByb3V0ZXIgbmF2aWdhdGlvbiB0byBzeW5jaHJvbml6ZSBSb3V0ZXIgc3RhdGUgd2l0aCB0aGUgYnJvd3NlciBzdGF0ZS5cbiAgICpcbiAgICogVGhpcyBpcyBkb25lIGFzIGEgcmVzcG9uc2UgdG8gYSBwb3BzdGF0ZSBldmVudCBhbmQgdGhlIGluaXRpYWwgbmF2aWdhdGlvbi4gVGhlc2VcbiAgICogdHdvIHNjZW5hcmlvcyByZXByZXNlbnQgdGltZXMgd2hlbiB0aGUgYnJvd3NlciBVUkwvc3RhdGUgaGFzIGJlZW4gdXBkYXRlZCBhbmRcbiAgICogdGhlIFJvdXRlciBuZWVkcyB0byByZXNwb25kIHRvIGVuc3VyZSBpdHMgaW50ZXJuYWwgc3RhdGUgbWF0Y2hlcy5cbiAgICovXG4gIHByaXZhdGUgbmF2aWdhdGVUb1N5bmNXaXRoQnJvd3NlcihcbiAgICB1cmw6IHN0cmluZyxcbiAgICBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLFxuICAgIHN0YXRlOiBSZXN0b3JlZFN0YXRlIHwgbnVsbCB8IHVuZGVmaW5lZCxcbiAgKSB7XG4gICAgY29uc3QgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3JlcGxhY2VVcmw6IHRydWV9O1xuXG4gICAgLy8gVE9ETzogcmVzdG9yZWRTdGF0ZSBzaG91bGQgYWx3YXlzIGluY2x1ZGUgdGhlIGVudGlyZSBzdGF0ZSwgcmVnYXJkbGVzc1xuICAgIC8vIG9mIG5hdmlnYXRpb25JZC4gVGhpcyByZXF1aXJlcyBhIGJyZWFraW5nIGNoYW5nZSB0byB1cGRhdGUgdGhlIHR5cGUgb25cbiAgICAvLyBOYXZpZ2F0aW9uU3RhcnTigJlzIHJlc3RvcmVkU3RhdGUsIHdoaWNoIGN1cnJlbnRseSByZXF1aXJlcyBuYXZpZ2F0aW9uSWRcbiAgICAvLyB0byBhbHdheXMgYmUgcHJlc2VudC4gVGhlIFJvdXRlciB1c2VkIHRvIG9ubHkgcmVzdG9yZSBoaXN0b3J5IHN0YXRlIGlmXG4gICAgLy8gYSBuYXZpZ2F0aW9uSWQgd2FzIHByZXNlbnQuXG5cbiAgICAvLyBUaGUgc3RvcmVkIG5hdmlnYXRpb25JZCBpcyB1c2VkIGJ5IHRoZSBSb3V0ZXJTY3JvbGxlciB0byByZXRyaWV2ZSB0aGUgc2Nyb2xsXG4gICAgLy8gcG9zaXRpb24gZm9yIHRoZSBwYWdlLlxuICAgIGNvbnN0IHJlc3RvcmVkU3RhdGUgPSBzdGF0ZT8ubmF2aWdhdGlvbklkID8gc3RhdGUgOiBudWxsO1xuXG4gICAgLy8gU2VwYXJhdGUgdG8gTmF2aWdhdGlvblN0YXJ0LnJlc3RvcmVkU3RhdGUsIHdlIG11c3QgYWxzbyByZXN0b3JlIHRoZSBzdGF0ZSB0b1xuICAgIC8vIGhpc3Rvcnkuc3RhdGUgYW5kIGdlbmVyYXRlIGEgbmV3IG5hdmlnYXRpb25JZCwgc2luY2UgaXQgd2lsbCBiZSBvdmVyd3JpdHRlblxuICAgIGlmIChzdGF0ZSkge1xuICAgICAgY29uc3Qgc3RhdGVDb3B5ID0gey4uLnN0YXRlfSBhcyBQYXJ0aWFsPFJlc3RvcmVkU3RhdGU+O1xuICAgICAgZGVsZXRlIHN0YXRlQ29weS5uYXZpZ2F0aW9uSWQ7XG4gICAgICBkZWxldGUgc3RhdGVDb3B5Lsm1cm91dGVyUGFnZUlkO1xuICAgICAgaWYgKE9iamVjdC5rZXlzKHN0YXRlQ29weSkubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgIGV4dHJhcy5zdGF0ZSA9IHN0YXRlQ29weTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKHVybFRyZWUsIHNvdXJjZSwgcmVzdG9yZWRTdGF0ZSwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKiBUaGUgY3VycmVudCBVUkwuICovXG4gIGdldCB1cmwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5zZXJpYWxpemVVcmwodGhpcy5jdXJyZW50VXJsVHJlZSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgY3VycmVudCBgTmF2aWdhdGlvbmAgb2JqZWN0IHdoZW4gdGhlIHJvdXRlciBpcyBuYXZpZ2F0aW5nLFxuICAgKiBhbmQgYG51bGxgIHdoZW4gaWRsZS5cbiAgICovXG4gIGdldEN1cnJlbnROYXZpZ2F0aW9uKCk6IE5hdmlnYXRpb24gfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuY3VycmVudE5hdmlnYXRpb247XG4gIH1cblxuICAvKipcbiAgICogVGhlIGBOYXZpZ2F0aW9uYCBvYmplY3Qgb2YgdGhlIG1vc3QgcmVjZW50IG5hdmlnYXRpb24gdG8gc3VjY2VlZCBhbmQgYG51bGxgIGlmIHRoZXJlXG4gICAqICAgICBoYXMgbm90IGJlZW4gYSBzdWNjZXNzZnVsIG5hdmlnYXRpb24geWV0LlxuICAgKi9cbiAgZ2V0IGxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbigpOiBOYXZpZ2F0aW9uIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNldHMgdGhlIHJvdXRlIGNvbmZpZ3VyYXRpb24gdXNlZCBmb3IgbmF2aWdhdGlvbiBhbmQgZ2VuZXJhdGluZyBsaW5rcy5cbiAgICpcbiAgICogQHBhcmFtIGNvbmZpZyBUaGUgcm91dGUgYXJyYXkgZm9yIHRoZSBuZXcgY29uZmlndXJhdGlvbi5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5yZXNldENvbmZpZyhbXG4gICAqICB7IHBhdGg6ICd0ZWFtLzppZCcsIGNvbXBvbmVudDogVGVhbUNtcCwgY2hpbGRyZW46IFtcbiAgICogICAgeyBwYXRoOiAnc2ltcGxlJywgY29tcG9uZW50OiBTaW1wbGVDbXAgfSxcbiAgICogICAgeyBwYXRoOiAndXNlci86bmFtZScsIGNvbXBvbmVudDogVXNlckNtcCB9XG4gICAqICBdfVxuICAgKiBdKTtcbiAgICogYGBgXG4gICAqL1xuICByZXNldENvbmZpZyhjb25maWc6IFJvdXRlcyk6IHZvaWQge1xuICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmIHZhbGlkYXRlQ29uZmlnKGNvbmZpZyk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWcubWFwKHN0YW5kYXJkaXplQ29uZmlnKTtcbiAgICB0aGlzLm5hdmlnYXRlZCA9IGZhbHNlO1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLmRpc3Bvc2UoKTtcbiAgfVxuXG4gIC8qKiBEaXNwb3NlcyBvZiB0aGUgcm91dGVyLiAqL1xuICBkaXNwb3NlKCk6IHZvaWQge1xuICAgIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmNvbXBsZXRlKCk7XG4gICAgaWYgKHRoaXMubm9uUm91dGVyQ3VycmVudEVudHJ5Q2hhbmdlU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLm5vblJvdXRlckN1cnJlbnRFbnRyeUNoYW5nZVN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgdGhpcy5ub25Sb3V0ZXJDdXJyZW50RW50cnlDaGFuZ2VTdWJzY3JpcHRpb24gPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHRoaXMuZGlzcG9zZWQgPSB0cnVlO1xuICAgIHRoaXMuZXZlbnRzU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICAvKipcbiAgICogQXBwZW5kcyBVUkwgc2VnbWVudHMgdG8gdGhlIGN1cnJlbnQgVVJMIHRyZWUgdG8gY3JlYXRlIGEgbmV3IFVSTCB0cmVlLlxuICAgKlxuICAgKiBAcGFyYW0gY29tbWFuZHMgQW4gYXJyYXkgb2YgVVJMIGZyYWdtZW50cyB3aXRoIHdoaWNoIHRvIGNvbnN0cnVjdCB0aGUgbmV3IFVSTCB0cmVlLlxuICAgKiBJZiB0aGUgcGF0aCBpcyBzdGF0aWMsIGNhbiBiZSB0aGUgbGl0ZXJhbCBVUkwgc3RyaW5nLiBGb3IgYSBkeW5hbWljIHBhdGgsIHBhc3MgYW4gYXJyYXkgb2YgcGF0aFxuICAgKiBzZWdtZW50cywgZm9sbG93ZWQgYnkgdGhlIHBhcmFtZXRlcnMgZm9yIGVhY2ggc2VnbWVudC5cbiAgICogVGhlIGZyYWdtZW50cyBhcmUgYXBwbGllZCB0byB0aGUgY3VycmVudCBVUkwgdHJlZSBvciB0aGUgb25lIHByb3ZpZGVkICBpbiB0aGUgYHJlbGF0aXZlVG9gXG4gICAqIHByb3BlcnR5IG9mIHRoZSBvcHRpb25zIG9iamVjdCwgaWYgc3VwcGxpZWQuXG4gICAqIEBwYXJhbSBuYXZpZ2F0aW9uRXh0cmFzIE9wdGlvbnMgdGhhdCBjb250cm9sIHRoZSBuYXZpZ2F0aW9uIHN0cmF0ZWd5LlxuICAgKiBAcmV0dXJucyBUaGUgbmV3IFVSTCB0cmVlLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBgYGBcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCAndXNlcicsIDExXSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMztleHBhbmQ9dHJ1ZS91c2VyLzExXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge2V4cGFuZDogdHJ1ZX0sICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8geW91IGNhbiBjb2xsYXBzZSBzdGF0aWMgc2VnbWVudHMgbGlrZSB0aGlzICh0aGlzIHdvcmtzIG9ubHkgd2l0aCB0aGUgZmlyc3QgcGFzc2VkLWluIHZhbHVlKTpcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbS8zMy91c2VyJywgdXNlcklkXSk7XG4gICAqXG4gICAqIC8vIElmIHRoZSBmaXJzdCBzZWdtZW50IGNhbiBjb250YWluIHNsYXNoZXMsIGFuZCB5b3UgZG8gbm90IHdhbnQgdGhlIHJvdXRlciB0byBzcGxpdCBpdCxcbiAgICogLy8geW91IGNhbiBkbyB0aGUgZm9sbG93aW5nOlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbe3NlZ21lbnRQYXRoOiAnL29uZS90d28nfV0pO1xuICAgKlxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvKHVzZXIvMTEvL3JpZ2h0OmNoYXQpXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiAnY2hhdCd9fV0pO1xuICAgKlxuICAgKiAvLyByZW1vdmUgdGhlIHJpZ2h0IHNlY29uZGFyeSBub2RlXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiBudWxsfX1dKTtcbiAgICpcbiAgICogLy8gYXNzdW1pbmcgdGhlIGN1cnJlbnQgdXJsIGlzIGAvdGVhbS8zMy91c2VyLzExYCBhbmQgdGhlIHJvdXRlIHBvaW50cyB0byBgdXNlci8xMWBcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8xMS9kZXRhaWxzXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnZGV0YWlscyddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8yMlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy4uLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS80NC91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vLi4vdGVhbS80NC91c2VyLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiBOb3RlIHRoYXQgYSB2YWx1ZSBvZiBgbnVsbGAgb3IgYHVuZGVmaW5lZGAgZm9yIGByZWxhdGl2ZVRvYCBpbmRpY2F0ZXMgdGhhdCB0aGVcbiAgICogdHJlZSBzaG91bGQgYmUgY3JlYXRlZCByZWxhdGl2ZSB0byB0aGUgcm9vdC5cbiAgICogYGBgXG4gICAqL1xuICBjcmVhdGVVcmxUcmVlKGNvbW1hbmRzOiBhbnlbXSwgbmF2aWdhdGlvbkV4dHJhczogVXJsQ3JlYXRpb25PcHRpb25zID0ge30pOiBVcmxUcmVlIHtcbiAgICBjb25zdCB7cmVsYXRpdmVUbywgcXVlcnlQYXJhbXMsIGZyYWdtZW50LCBxdWVyeVBhcmFtc0hhbmRsaW5nLCBwcmVzZXJ2ZUZyYWdtZW50fSA9XG4gICAgICBuYXZpZ2F0aW9uRXh0cmFzO1xuICAgIGNvbnN0IGYgPSBwcmVzZXJ2ZUZyYWdtZW50ID8gdGhpcy5jdXJyZW50VXJsVHJlZS5mcmFnbWVudCA6IGZyYWdtZW50O1xuICAgIGxldCBxOiBQYXJhbXMgfCBudWxsID0gbnVsbDtcbiAgICBzd2l0Y2ggKHF1ZXJ5UGFyYW1zSGFuZGxpbmcpIHtcbiAgICAgIGNhc2UgJ21lcmdlJzpcbiAgICAgICAgcSA9IHsuLi50aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zLCAuLi5xdWVyeVBhcmFtc307XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncHJlc2VydmUnOlxuICAgICAgICBxID0gdGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcztcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBxID0gcXVlcnlQYXJhbXMgfHwgbnVsbDtcbiAgICB9XG4gICAgaWYgKHEgIT09IG51bGwpIHtcbiAgICAgIHEgPSB0aGlzLnJlbW92ZUVtcHR5UHJvcHMocSk7XG4gICAgfVxuXG4gICAgbGV0IHJlbGF0aXZlVG9VcmxTZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVsYXRpdmVUb1NuYXBzaG90ID0gcmVsYXRpdmVUbyA/IHJlbGF0aXZlVG8uc25hcHNob3QgOiB0aGlzLnJvdXRlclN0YXRlLnNuYXBzaG90LnJvb3Q7XG4gICAgICByZWxhdGl2ZVRvVXJsU2VnbWVudEdyb3VwID0gY3JlYXRlU2VnbWVudEdyb3VwRnJvbVJvdXRlKHJlbGF0aXZlVG9TbmFwc2hvdCk7XG4gICAgfSBjYXRjaCAoZTogdW5rbm93bikge1xuICAgICAgLy8gVGhpcyBpcyBzdHJpY3RseSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgd2l0aCB0ZXN0cyB0aGF0IGNyZWF0ZVxuICAgICAgLy8gaW52YWxpZCBgQWN0aXZhdGVkUm91dGVgIG1vY2tzLlxuICAgICAgLy8gTm90ZTogdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiBoYXZpbmcgdGhpcyBmYWxsYmFjayBmb3IgaW52YWxpZCBgQWN0aXZhdGVkUm91dGVgIHNldHVwcyBhbmRcbiAgICAgIC8vIGp1c3QgdGhyb3dpbmcgaXMgfjUwMCB0ZXN0IGZhaWx1cmVzLiBGaXhpbmcgYWxsIG9mIHRob3NlIHRlc3RzIGJ5IGhhbmQgaXMgbm90IGZlYXNpYmxlIGF0XG4gICAgICAvLyB0aGUgbW9tZW50LlxuICAgICAgaWYgKHR5cGVvZiBjb21tYW5kc1swXSAhPT0gJ3N0cmluZycgfHwgY29tbWFuZHNbMF1bMF0gIT09ICcvJykge1xuICAgICAgICAvLyBOYXZpZ2F0aW9ucyB0aGF0IHdlcmUgYWJzb2x1dGUgaW4gdGhlIG9sZCB3YXkgb2YgY3JlYXRpbmcgVXJsVHJlZXNcbiAgICAgICAgLy8gd291bGQgc3RpbGwgd29yayBiZWNhdXNlIHRoZXkgd291bGRuJ3QgYXR0ZW1wdCB0byBtYXRjaCB0aGVcbiAgICAgICAgLy8gc2VnbWVudHMgaW4gdGhlIGBBY3RpdmF0ZWRSb3V0ZWAgdG8gdGhlIGBjdXJyZW50VXJsVHJlZWAgYnV0XG4gICAgICAgIC8vIGluc3RlYWQganVzdCByZXBsYWNlIHRoZSByb290IHNlZ21lbnQgd2l0aCB0aGUgbmF2aWdhdGlvbiByZXN1bHQuXG4gICAgICAgIC8vIE5vbi1hYnNvbHV0ZSBuYXZpZ2F0aW9ucyB3b3VsZCBmYWlsIHRvIGFwcGx5IHRoZSBjb21tYW5kcyBiZWNhdXNlXG4gICAgICAgIC8vIHRoZSBsb2dpYyBjb3VsZCBub3QgZmluZCB0aGUgc2VnbWVudCB0byByZXBsYWNlIChzbyB0aGV5J2QgYWN0IGxpa2UgdGhlcmUgd2VyZSBub1xuICAgICAgICAvLyBjb21tYW5kcykuXG4gICAgICAgIGNvbW1hbmRzID0gW107XG4gICAgICB9XG4gICAgICByZWxhdGl2ZVRvVXJsU2VnbWVudEdyb3VwID0gdGhpcy5jdXJyZW50VXJsVHJlZS5yb290O1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlVXJsVHJlZUZyb21TZWdtZW50R3JvdXAocmVsYXRpdmVUb1VybFNlZ21lbnRHcm91cCwgY29tbWFuZHMsIHEsIGYgPz8gbnVsbCk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGVzIHRvIGEgdmlldyB1c2luZyBhbiBhYnNvbHV0ZSByb3V0ZSBwYXRoLlxuICAgKlxuICAgKiBAcGFyYW0gdXJsIEFuIGFic29sdXRlIHBhdGggZm9yIGEgZGVmaW5lZCByb3V0ZS4gVGhlIGZ1bmN0aW9uIGRvZXMgbm90IGFwcGx5IGFueSBkZWx0YSB0byB0aGVcbiAgICogICAgIGN1cnJlbnQgVVJMLlxuICAgKiBAcGFyYW0gZXh0cmFzIEFuIG9iamVjdCBjb250YWluaW5nIHByb3BlcnRpZXMgdGhhdCBtb2RpZnkgdGhlIG5hdmlnYXRpb24gc3RyYXRlZ3kuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvICd0cnVlJyB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsXG4gICAqIHRvICdmYWxzZScgd2hlbiBuYXZpZ2F0aW9uIGZhaWxzLCBvciBpcyByZWplY3RlZCBvbiBlcnJvci5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBjYWxscyByZXF1ZXN0IG5hdmlnYXRpb24gdG8gYW4gYWJzb2x1dGUgcGF0aC5cbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiKTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiLCB7IHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRpbmcvY29tbW9uLXJvdXRlci10YXNrcylcbiAgICpcbiAgICovXG4gIG5hdmlnYXRlQnlVcmwoXG4gICAgdXJsOiBzdHJpbmcgfCBVcmxUcmVlLFxuICAgIGV4dHJhczogTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyA9IHtcbiAgICAgIHNraXBMb2NhdGlvbkNoYW5nZTogZmFsc2UsXG4gICAgfSxcbiAgKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkge1xuICAgICAgaWYgKHRoaXMuaXNOZ1pvbmVFbmFibGVkICYmICFOZ1pvbmUuaXNJbkFuZ3VsYXJab25lKCkpIHtcbiAgICAgICAgdGhpcy5jb25zb2xlLndhcm4oXG4gICAgICAgICAgYE5hdmlnYXRpb24gdHJpZ2dlcmVkIG91dHNpZGUgQW5ndWxhciB6b25lLCBkaWQgeW91IGZvcmdldCB0byBjYWxsICduZ1pvbmUucnVuKCknP2AsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IGlzVXJsVHJlZSh1cmwpID8gdXJsIDogdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIGNvbnN0IG1lcmdlZFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodXJsVHJlZSwgdGhpcy5yYXdVcmxUcmVlKTtcblxuICAgIHJldHVybiB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbihtZXJnZWRUcmVlLCBJTVBFUkFUSVZFX05BVklHQVRJT04sIG51bGwsIGV4dHJhcyk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGUgYmFzZWQgb24gdGhlIHByb3ZpZGVkIGFycmF5IG9mIGNvbW1hbmRzIGFuZCBhIHN0YXJ0aW5nIHBvaW50LlxuICAgKiBJZiBubyBzdGFydGluZyByb3V0ZSBpcyBwcm92aWRlZCwgdGhlIG5hdmlnYXRpb24gaXMgYWJzb2x1dGUuXG4gICAqXG4gICAqIEBwYXJhbSBjb21tYW5kcyBBbiBhcnJheSBvZiBVUkwgZnJhZ21lbnRzIHdpdGggd2hpY2ggdG8gY29uc3RydWN0IHRoZSB0YXJnZXQgVVJMLlxuICAgKiBJZiB0aGUgcGF0aCBpcyBzdGF0aWMsIGNhbiBiZSB0aGUgbGl0ZXJhbCBVUkwgc3RyaW5nLiBGb3IgYSBkeW5hbWljIHBhdGgsIHBhc3MgYW4gYXJyYXkgb2YgcGF0aFxuICAgKiBzZWdtZW50cywgZm9sbG93ZWQgYnkgdGhlIHBhcmFtZXRlcnMgZm9yIGVhY2ggc2VnbWVudC5cbiAgICogVGhlIGZyYWdtZW50cyBhcmUgYXBwbGllZCB0byB0aGUgY3VycmVudCBVUkwgb3IgdGhlIG9uZSBwcm92aWRlZCAgaW4gdGhlIGByZWxhdGl2ZVRvYCBwcm9wZXJ0eVxuICAgKiBvZiB0aGUgb3B0aW9ucyBvYmplY3QsIGlmIHN1cHBsaWVkLlxuICAgKiBAcGFyYW0gZXh0cmFzIEFuIG9wdGlvbnMgb2JqZWN0IHRoYXQgZGV0ZXJtaW5lcyBob3cgdGhlIFVSTCBzaG91bGQgYmUgY29uc3RydWN0ZWQgb3JcbiAgICogICAgIGludGVycHJldGVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBBIFByb21pc2UgdGhhdCByZXNvbHZlcyB0byBgdHJ1ZWAgd2hlbiBuYXZpZ2F0aW9uIHN1Y2NlZWRzLCBvciBgZmFsc2VgIHdoZW4gbmF2aWdhdGlvblxuICAgKiAgICAgZmFpbHMuIFRoZSBQcm9taXNlIGlzIHJlamVjdGVkIHdoZW4gYW4gZXJyb3Igb2NjdXJzIGlmIGByZXNvbHZlTmF2aWdhdGlvblByb21pc2VPbkVycm9yYCBpc1xuICAgKiBub3QgYHRydWVgLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBUaGUgZm9sbG93aW5nIGNhbGxzIHJlcXVlc3QgbmF2aWdhdGlvbiB0byBhIGR5bmFtaWMgcm91dGUgcGF0aCByZWxhdGl2ZSB0byB0aGUgY3VycmVudCBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIubmF2aWdhdGUoWyd0ZWFtJywgMzMsICd1c2VyJywgMTFdLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMLCBvdmVycmlkaW5nIHRoZSBkZWZhdWx0IGJlaGF2aW9yXG4gICAqIHJvdXRlci5uYXZpZ2F0ZShbJ3RlYW0nLCAzMywgJ3VzZXInLCAxMV0sIHtyZWxhdGl2ZVRvOiByb3V0ZSwgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0aW5nL2NvbW1vbi1yb3V0ZXItdGFza3MpXG4gICAqXG4gICAqL1xuICBuYXZpZ2F0ZShcbiAgICBjb21tYW5kczogYW55W10sXG4gICAgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3NraXBMb2NhdGlvbkNoYW5nZTogZmFsc2V9LFxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB2YWxpZGF0ZUNvbW1hbmRzKGNvbW1hbmRzKTtcbiAgICByZXR1cm4gdGhpcy5uYXZpZ2F0ZUJ5VXJsKHRoaXMuY3JlYXRlVXJsVHJlZShjb21tYW5kcywgZXh0cmFzKSwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKiBTZXJpYWxpemVzIGEgYFVybFRyZWVgIGludG8gYSBzdHJpbmcgKi9cbiAgc2VyaWFsaXplVXJsKHVybDogVXJsVHJlZSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodXJsKTtcbiAgfVxuXG4gIC8qKiBQYXJzZXMgYSBzdHJpbmcgaW50byBhIGBVcmxUcmVlYCAqL1xuICBwYXJzZVVybCh1cmw6IHN0cmluZyk6IFVybFRyZWUge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKHVybCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKCcvJyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciB0aGUgdXJsIGlzIGFjdGl2YXRlZC5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWRcbiAgICogVXNlIGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2AgaW5zdGVhZC5cbiAgICpcbiAgICogLSBUaGUgZXF1aXZhbGVudCBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIGZvciBgdHJ1ZWAgaXNcbiAgICogYHtwYXRoczogJ2V4YWN0JywgcXVlcnlQYXJhbXM6ICdleGFjdCcsIGZyYWdtZW50OiAnaWdub3JlZCcsIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnfWAuXG4gICAqIC0gVGhlIGVxdWl2YWxlbnQgZm9yIGBmYWxzZWAgaXNcbiAgICogYHtwYXRoczogJ3N1YnNldCcsIHF1ZXJ5UGFyYW1zOiAnc3Vic2V0JywgZnJhZ21lbnQ6ICdpZ25vcmVkJywgbWF0cml4UGFyYW1zOiAnaWdub3JlZCd9YC5cbiAgICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nIHwgVXJsVHJlZSwgZXhhY3Q6IGJvb2xlYW4pOiBib29sZWFuO1xuICAvKipcbiAgICogUmV0dXJucyB3aGV0aGVyIHRoZSB1cmwgaXMgYWN0aXZhdGVkLlxuICAgKi9cbiAgaXNBY3RpdmUodXJsOiBzdHJpbmcgfCBVcmxUcmVlLCBtYXRjaE9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zKTogYm9vbGVhbjtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZyB8IFVybFRyZWUsIG1hdGNoT3B0aW9uczogYm9vbGVhbiB8IElzQWN0aXZlTWF0Y2hPcHRpb25zKTogYm9vbGVhbjtcbiAgaXNBY3RpdmUodXJsOiBzdHJpbmcgfCBVcmxUcmVlLCBtYXRjaE9wdGlvbnM6IGJvb2xlYW4gfCBJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IGJvb2xlYW4ge1xuICAgIGxldCBvcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucztcbiAgICBpZiAobWF0Y2hPcHRpb25zID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zID0gey4uLmV4YWN0TWF0Y2hPcHRpb25zfTtcbiAgICB9IGVsc2UgaWYgKG1hdGNoT3B0aW9ucyA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMgPSB7Li4uc3Vic2V0TWF0Y2hPcHRpb25zfTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucyA9IG1hdGNoT3B0aW9ucztcbiAgICB9XG4gICAgaWYgKGlzVXJsVHJlZSh1cmwpKSB7XG4gICAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybCwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybFRyZWUsIG9wdGlvbnMpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVFbXB0eVByb3BzKHBhcmFtczogUGFyYW1zKTogUGFyYW1zIHtcbiAgICByZXR1cm4gT2JqZWN0LmVudHJpZXMocGFyYW1zKS5yZWR1Y2UoKHJlc3VsdDogUGFyYW1zLCBba2V5LCB2YWx1ZV06IFtzdHJpbmcsIGFueV0pID0+IHtcbiAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sIHt9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2NoZWR1bGVOYXZpZ2F0aW9uKFxuICAgIHJhd1VybDogVXJsVHJlZSxcbiAgICBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLFxuICAgIHJlc3RvcmVkU3RhdGU6IFJlc3RvcmVkU3RhdGUgfCBudWxsLFxuICAgIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyxcbiAgICBwcmlvclByb21pc2U/OiB7XG4gICAgICByZXNvbHZlOiAocmVzdWx0OiBib29sZWFuIHwgUHJvbWlzZUxpa2U8Ym9vbGVhbj4pID0+IHZvaWQ7XG4gICAgICByZWplY3Q6IChyZWFzb24/OiBhbnkpID0+IHZvaWQ7XG4gICAgICBwcm9taXNlOiBQcm9taXNlPGJvb2xlYW4+O1xuICAgIH0sXG4gICk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICh0aGlzLmRpc3Bvc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGZhbHNlKTtcbiAgICB9XG5cbiAgICBsZXQgcmVzb2x2ZTogKHJlc3VsdDogYm9vbGVhbiB8IFByb21pc2VMaWtlPGJvb2xlYW4+KSA9PiB2b2lkO1xuICAgIGxldCByZWplY3Q6IChyZWFzb24/OiBhbnkpID0+IHZvaWQ7XG4gICAgbGV0IHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj47XG4gICAgaWYgKHByaW9yUHJvbWlzZSkge1xuICAgICAgcmVzb2x2ZSA9IHByaW9yUHJvbWlzZS5yZXNvbHZlO1xuICAgICAgcmVqZWN0ID0gcHJpb3JQcm9taXNlLnJlamVjdDtcbiAgICAgIHByb21pc2UgPSBwcmlvclByb21pc2UucHJvbWlzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXMsIHJlaikgPT4ge1xuICAgICAgICByZXNvbHZlID0gcmVzO1xuICAgICAgICByZWplY3QgPSByZWo7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBJbmRpY2F0ZSB0aGF0IHRoZSBuYXZpZ2F0aW9uIGlzIGhhcHBlbmluZy5cbiAgICBjb25zdCB0YXNrSWQgPSB0aGlzLnBlbmRpbmdUYXNrcy5hZGQoKTtcbiAgICBhZnRlck5leHROYXZpZ2F0aW9uKHRoaXMsICgpID0+IHtcbiAgICAgIC8vIFJlbW92ZSBwZW5kaW5nIHRhc2sgaW4gYSBtaWNyb3Rhc2sgdG8gYWxsb3cgZm9yIGNhbmNlbGxlZFxuICAgICAgLy8gaW5pdGlhbCBuYXZpZ2F0aW9ucyBhbmQgcmVkaXJlY3RzIHdpdGhpbiB0aGUgc2FtZSB0YXNrLlxuICAgICAgcXVldWVNaWNyb3Rhc2soKCkgPT4gdGhpcy5wZW5kaW5nVGFza3MucmVtb3ZlKHRhc2tJZCkpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuaGFuZGxlTmF2aWdhdGlvblJlcXVlc3Qoe1xuICAgICAgc291cmNlLFxuICAgICAgcmVzdG9yZWRTdGF0ZSxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgY3VycmVudFJhd1VybDogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIHJhd1VybCxcbiAgICAgIGV4dHJhcyxcbiAgICAgIHJlc29sdmU6IHJlc29sdmUhLFxuICAgICAgcmVqZWN0OiByZWplY3QhLFxuICAgICAgcHJvbWlzZSxcbiAgICAgIGN1cnJlbnRTbmFwc2hvdDogdGhpcy5yb3V0ZXJTdGF0ZS5zbmFwc2hvdCxcbiAgICAgIGN1cnJlbnRSb3V0ZXJTdGF0ZTogdGhpcy5yb3V0ZXJTdGF0ZSxcbiAgICB9KTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBlcnJvciBpcyBwcm9wYWdhdGVkIGV2ZW4gdGhvdWdoIGBwcm9jZXNzTmF2aWdhdGlvbnNgIGNhdGNoXG4gICAgLy8gaGFuZGxlciBkb2VzIG5vdCByZXRocm93XG4gICAgcmV0dXJuIHByb21pc2UuY2F0Y2goKGU6IGFueSkgPT4ge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHM6IHN0cmluZ1tdKTogdm9pZCB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29tbWFuZHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjbWQgPSBjb21tYW5kc1tpXTtcbiAgICBpZiAoY21kID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuTlVMTElTSF9DT01NQU5ELFxuICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICAgIGBUaGUgcmVxdWVzdGVkIHBhdGggY29udGFpbnMgJHtjbWR9IHNlZ21lbnQgYXQgaW5kZXggJHtpfWAsXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpc1B1YmxpY1JvdXRlckV2ZW50KGU6IEV2ZW50IHwgUHJpdmF0ZVJvdXRlckV2ZW50cyk6IGUgaXMgRXZlbnQge1xuICByZXR1cm4gIShlIGluc3RhbmNlb2YgQmVmb3JlQWN0aXZhdGVSb3V0ZXMpICYmICEoZSBpbnN0YW5jZW9mIFJlZGlyZWN0UmVxdWVzdCk7XG59XG4iXX0=