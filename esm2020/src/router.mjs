/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { inject, Injectable, NgZone, ɵConsole as Console, ɵRuntimeError as RuntimeError } from '@angular/core';
import { CreateUrlTreeStrategy } from './create_url_tree_strategy';
import { IMPERATIVE_NAVIGATION } from './events';
import { NavigationTransitions } from './navigation_transition';
import { TitleStrategy } from './page_title_strategy';
import { RouteReuseStrategy } from './route_reuse_strategy';
import { ROUTER_CONFIGURATION } from './router_config';
import { ROUTES } from './router_config_loader';
import { createEmptyState } from './router_state';
import { UrlHandlingStrategy } from './url_handling_strategy';
import { containsTree, isUrlTree, UrlSerializer, UrlTree } from './url_tree';
import { flatten } from './utils/collection';
import { standardizeConfig, validateConfig } from './utils/config';
import * as i0 from "@angular/core";
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || !!ngDevMode;
function defaultErrorHandler(error) {
    throw error;
}
function defaultMalformedUriErrorHandler(error, urlSerializer, url) {
    return urlSerializer.parse('/');
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
 * @see `Route`.
 * @see [Routing and Navigation Guide](guide/router).
 *
 * @ngModule RouterModule
 *
 * @publicApi
 */
export class Router {
    // TODO(b/260747083): This should not exist and navigationId should be private in
    // `NavigationTransitions`
    get navigationId() {
        return this.navigationTransitions.navigationId;
    }
    /**
     * The ɵrouterPageId of whatever page is currently active in the browser history. This is
     * important for computing the target page id for new navigations because we need to ensure each
     * page id in the browser history is 1 more than the previous entry.
     */
    get browserPageId() {
        return this.location.getState()?.ɵrouterPageId;
    }
    /**
     * An event stream for routing events.
     */
    get events() {
        // TODO(atscott): This _should_ be events.asObservable(). However, this change requires internal
        // cleanup: tests are doing `(route.events as Subject<Event>).next(...)`. This isn't
        // allowed/supported but we still have to fix these or file bugs against the teams before making
        // the change.
        return this.navigationTransitions.events;
    }
    constructor() {
        this.disposed = false;
        /**
         * The id of the currently active page in the router.
         * Updated to the transition's target id on a successful navigation.
         *
         * This is used to track what page the router last activated. When an attempted navigation fails,
         * the router can then use this to compute how to restore the state back to the previously active
         * page.
         */
        this.currentPageId = 0;
        this.console = inject(Console);
        this.isNgZoneEnabled = false;
        this.options = inject(ROUTER_CONFIGURATION, { optional: true }) || {};
        /**
         * A handler for navigation errors in this NgModule.
         *
         * @deprecated Subscribe to the `Router` events and watch for `NavigationError` instead.
         */
        this.errorHandler = this.options.errorHandler || defaultErrorHandler;
        /**
         * A handler for errors thrown by `Router.parseUrl(url)`
         * when `url` contains an invalid character.
         * The most common case is a `%` sign
         * that's not encoded and is not part of a percent encoded sequence.
         *
         * @deprecated Configure this through `RouterModule.forRoot` instead:
         *   `RouterModule.forRoot(routes, {malformedUriErrorHandler: myHandler})`
         * @see `RouterModule`
         */
        this.malformedUriErrorHandler = this.options.malformedUriErrorHandler || defaultMalformedUriErrorHandler;
        /**
         * True if at least one navigation event has occurred,
         * false otherwise.
         */
        this.navigated = false;
        this.lastSuccessfulId = -1;
        /**
         * A strategy for extracting and merging URLs.
         * Used for AngularJS to Angular migrations.
         *
         * @deprecated Configure using `providers` instead:
         *   `{provide: UrlHandlingStrategy, useClass: MyStrategy}`.
         */
        this.urlHandlingStrategy = inject(UrlHandlingStrategy);
        /**
         * A strategy for re-using routes.
         *
         * @deprecated Configure using `providers` instead:
         *   `{provide: RouteReuseStrategy, useClass: MyStrategy}`.
         */
        this.routeReuseStrategy = inject(RouteReuseStrategy);
        /** Strategy used to create a UrlTree. */
        this.urlCreationStrategy = inject(CreateUrlTreeStrategy);
        /**
         * A strategy for setting the title based on the `routerState`.
         *
         * @deprecated Configure using `providers` instead:
         *   `{provide: TitleStrategy, useClass: MyStrategy}`.
         */
        this.titleStrategy = inject(TitleStrategy);
        /**
         * How to handle a navigation request to the current URL.
         *
         *
         * @deprecated Configure this through `provideRouter` or `RouterModule.forRoot` instead.
         * @see `withRouterConfig`
         * @see `provideRouter`
         * @see `RouterModule`
         */
        this.onSameUrlNavigation = this.options.onSameUrlNavigation || 'ignore';
        /**
         * How to merge parameters, data, resolved data, and title from parent to child
         * routes. One of:
         *
         * - `'emptyOnly'` : Inherit parent parameters, data, and resolved data
         * for path-less or component-less routes.
         * - `'always'` : Inherit parent parameters, data, and resolved data
         * for all child routes.
         *
         * @deprecated Configure this through `provideRouter` or `RouterModule.forRoot` instead.
         * @see `withRouterConfig`
         * @see `provideRouter`
         * @see `RouterModule`
         */
        this.paramsInheritanceStrategy = this.options.paramsInheritanceStrategy || 'emptyOnly';
        /**
         * Determines when the router updates the browser URL.
         * By default (`"deferred"`), updates the browser URL after navigation has finished.
         * Set to `'eager'` to update the browser URL at the beginning of navigation.
         * You can choose to update early so that, if navigation fails,
         * you can show an error message with the URL that failed.
         *
         * @deprecated Configure this through `provideRouter` or `RouterModule.forRoot` instead.
         * @see `withRouterConfig`
         * @see `provideRouter`
         * @see `RouterModule`
         */
        this.urlUpdateStrategy = this.options.urlUpdateStrategy || 'deferred';
        /**
         * Configures how the Router attempts to restore state when a navigation is cancelled.
         *
         * 'replace' - Always uses `location.replaceState` to set the browser state to the state of the
         * router before the navigation started. This means that if the URL of the browser is updated
         * _before_ the navigation is canceled, the Router will simply replace the item in history rather
         * than trying to restore to the previous location in the session history. This happens most
         * frequently with `urlUpdateStrategy: 'eager'` and navigations with the browser back/forward
         * buttons.
         *
         * 'computed' - Will attempt to return to the same index in the session history that corresponds
         * to the Angular route when the navigation gets cancelled. For example, if the browser back
         * button is clicked and the navigation is cancelled, the Router will trigger a forward navigation
         * and vice versa.
         *
         * Note: the 'computed' option is incompatible with any `UrlHandlingStrategy` which only
         * handles a portion of the URL because the history restoration navigates to the previous place in
         * the browser history rather than simply resetting a portion of the URL.
         *
         * The default value is `replace`.
         *
         * @deprecated Configure this through `provideRouter` or `RouterModule.forRoot` instead.
         * @see `withRouterConfig`
         * @see `provideRouter`
         * @see `RouterModule`
         */
        this.canceledNavigationResolution = this.options.canceledNavigationResolution || 'replace';
        this.config = flatten(inject(ROUTES, { optional: true }) ?? []);
        this.navigationTransitions = inject(NavigationTransitions);
        this.urlSerializer = inject(UrlSerializer);
        this.location = inject(Location);
        this.isNgZoneEnabled = inject(NgZone) instanceof NgZone && NgZone.isInAngularZone();
        this.resetConfig(this.config);
        this.currentUrlTree = new UrlTree();
        this.rawUrlTree = this.currentUrlTree;
        this.browserUrlTree = this.currentUrlTree;
        this.routerState = createEmptyState(this.currentUrlTree, null);
        this.navigationTransitions.setupNavigations(this).subscribe(t => {
            this.lastSuccessfulId = t.id;
            this.currentPageId = t.targetPageId;
        }, e => {
            this.console.warn(`Unhandled Navigation Error: ${e}`);
        });
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
            const state = this.location.getState();
            this.navigateToSyncWithBrowser(this.location.path(true), IMPERATIVE_NAVIGATION, state);
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
        if (!this.locationSubscription) {
            this.locationSubscription = this.location.subscribe(event => {
                const source = event['type'] === 'popstate' ? 'popstate' : 'hashchange';
                if (source === 'popstate') {
                    // The `setTimeout` was added in #12160 and is likely to support Angular/AngularJS
                    // hybrid apps.
                    setTimeout(() => {
                        this.navigateToSyncWithBrowser(event['url'], source, event.state);
                    }, 0);
                }
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
        NG_DEV_MODE && validateConfig(config);
        this.config = config.map(standardizeConfig);
        this.navigated = false;
        this.lastSuccessfulId = -1;
    }
    /** @nodoc */
    ngOnDestroy() {
        this.dispose();
    }
    /** Disposes of the router. */
    dispose() {
        this.navigationTransitions.complete();
        if (this.locationSubscription) {
            this.locationSubscription.unsubscribe();
            this.locationSubscription = undefined;
        }
        this.disposed = true;
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
        return this.urlCreationStrategy.createUrlTree(relativeTo, this.routerState, this.currentUrlTree, commands, q, f ?? null);
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
        if (typeof ngDevMode === 'undefined' ||
            ngDevMode && this.isNgZoneEnabled && !NgZone.isInAngularZone()) {
            this.console.warn(`Navigation triggered outside Angular zone, did you forget to call 'ngZone.run()'?`);
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
        let urlTree;
        try {
            urlTree = this.urlSerializer.parse(url);
        }
        catch (e) {
            urlTree = this.malformedUriErrorHandler(e, this.urlSerializer, url);
        }
        return urlTree;
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
    /** @internal */
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
        let targetPageId;
        if (this.canceledNavigationResolution === 'computed') {
            // If the `ɵrouterPageId` exist in the state then `targetpageId` should have the value of
            // `ɵrouterPageId`. This is the case for something like a page refresh where we assign the
            // target id to the previously set value for that page.
            if (restoredState && restoredState.ɵrouterPageId) {
                targetPageId = restoredState.ɵrouterPageId;
            }
            else {
                // If we're replacing the URL or doing a silent navigation, we do not want to increment the
                // page id because we aren't pushing a new entry to history.
                if (extras.replaceUrl || extras.skipLocationChange) {
                    targetPageId = this.browserPageId ?? 0;
                }
                else {
                    targetPageId = (this.browserPageId ?? 0) + 1;
                }
            }
        }
        else {
            // This is unused when `canceledNavigationResolution` is not computed.
            targetPageId = 0;
        }
        this.navigationTransitions.handleNavigationRequest({
            targetPageId,
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
    /** @internal */
    setBrowserUrl(url, transition) {
        const path = this.urlSerializer.serialize(url);
        const state = {
            ...transition.extras.state,
            ...this.generateNgRouterState(transition.id, transition.targetPageId)
        };
        if (this.location.isCurrentPathEqualTo(path) || !!transition.extras.replaceUrl) {
            this.location.replaceState(path, '', state);
        }
        else {
            this.location.go(path, '', state);
        }
    }
    /**
     * Performs the necessary rollback action to restore the browser URL to the
     * state before the transition.
     * @internal
     */
    restoreHistory(transition, restoringFromCaughtError = false) {
        if (this.canceledNavigationResolution === 'computed') {
            const targetPagePosition = this.currentPageId - transition.targetPageId;
            // The navigator change the location before triggered the browser event,
            // so we need to go back to the current url if the navigation is canceled.
            // Also, when navigation gets cancelled while using url update strategy eager, then we need to
            // go back. Because, when `urlUpdateStrategy` is `eager`; `setBrowserUrl` method is called
            // before any verification.
            const browserUrlUpdateOccurred = (transition.source === 'popstate' || this.urlUpdateStrategy === 'eager' ||
                this.currentUrlTree === this.getCurrentNavigation()?.finalUrl);
            if (browserUrlUpdateOccurred && targetPagePosition !== 0) {
                this.location.historyGo(targetPagePosition);
            }
            else if (this.currentUrlTree === this.getCurrentNavigation()?.finalUrl &&
                targetPagePosition === 0) {
                // We got to the activation stage (where currentUrlTree is set to the navigation's
                // finalUrl), but we weren't moving anywhere in history (skipLocationChange or replaceUrl).
                // We still need to reset the router state back to what it was when the navigation started.
                this.resetState(transition);
                // TODO(atscott): resetting the `browserUrlTree` should really be done in `resetState`.
                // Investigate if this can be done by running TGP.
                this.browserUrlTree = transition.currentUrlTree;
                this.resetUrlToCurrentUrlTree();
            }
            else {
                // The browser URL and router state was not updated before the navigation cancelled so
                // there's no restoration needed.
            }
        }
        else if (this.canceledNavigationResolution === 'replace') {
            // TODO(atscott): It seems like we should _always_ reset the state here. It would be a no-op
            // for `deferred` navigations that haven't change the internal state yet because guards
            // reject. For 'eager' navigations, it seems like we also really should reset the state
            // because the navigation was cancelled. Investigate if this can be done by running TGP.
            if (restoringFromCaughtError) {
                this.resetState(transition);
            }
            this.resetUrlToCurrentUrlTree();
        }
    }
    resetState(t) {
        this.routerState = t.currentRouterState;
        this.currentUrlTree = t.currentUrlTree;
        // Note here that we use the urlHandlingStrategy to get the reset `rawUrlTree` because it may be
        // configured to handle only part of the navigation URL. This means we would only want to reset
        // the part of the navigation handled by the Angular router rather than the whole URL. In
        // addition, the URLHandlingStrategy may be configured to specifically preserve parts of the URL
        // when merging, such as the query params so they are not lost on a refresh.
        this.rawUrlTree = this.urlHandlingStrategy.merge(this.currentUrlTree, t.rawUrl);
    }
    resetUrlToCurrentUrlTree() {
        this.location.replaceState(this.urlSerializer.serialize(this.rawUrlTree), '', this.generateNgRouterState(this.lastSuccessfulId, this.currentPageId));
    }
    generateNgRouterState(navigationId, routerPageId) {
        if (this.canceledNavigationResolution === 'computed') {
            return { navigationId, ɵrouterPageId: routerPageId };
        }
        return { navigationId };
    }
}
Router.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0+sha-68ce4f6", ngImport: i0, type: Router, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
Router.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0+sha-68ce4f6", ngImport: i0, type: Router, providedIn: 'root' });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0+sha-68ce4f6", ngImport: i0, type: Router, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: function () { return []; } });
function validateCommands(commands) {
    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        if (cmd == null) {
            throw new RuntimeError(4008 /* RuntimeErrorCode.NULLISH_COMMAND */, NG_DEV_MODE && `The requested path contains ${cmd} segment at index ${i}`);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFBVyxNQUFNLEVBQUUsVUFBVSxFQUFZLE1BQU0sRUFBUSxRQUFRLElBQUksT0FBTyxFQUFFLGFBQWEsSUFBSSxZQUFZLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFHdkksT0FBTyxFQUFDLHFCQUFxQixFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFFakUsT0FBTyxFQUFRLHFCQUFxQixFQUFvQixNQUFNLFVBQVUsQ0FBQztBQUV6RSxPQUFPLEVBQXFELHFCQUFxQixFQUFvQyxNQUFNLHlCQUF5QixDQUFDO0FBQ3JKLE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUNwRCxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUMxRCxPQUFPLEVBQTZCLG9CQUFvQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDakYsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBRTlDLE9BQU8sRUFBQyxnQkFBZ0IsRUFBYyxNQUFNLGdCQUFnQixDQUFDO0FBRTdELE9BQU8sRUFBQyxtQkFBbUIsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQzVELE9BQU8sRUFBQyxZQUFZLEVBQXdCLFNBQVMsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ2pHLE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUMzQyxPQUFPLEVBQUMsaUJBQWlCLEVBQUUsY0FBYyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7O0FBR2pFLE1BQU0sV0FBVyxHQUFHLE9BQU8sU0FBUyxLQUFL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QztRQUN4QixJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDZixNQUFNLElBQUksWUFBWSw4Q0FFbEIsV0FBVyxJQUFJLCtCQUErQixHQUFHLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2hGO0tBQ0Y7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0NvbXBpbGVyLCBpbmplY3QsIEluamVjdGFibGUsIEluamVjdG9yLCBOZ1pvbmUsIFR5cGUsIMm1Q29uc29sZSBhcyBDb25zb2xlLCDJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtCZWhhdmlvclN1YmplY3QsIE9ic2VydmFibGUsIG9mLCBTdWJzY3JpcHRpb25MaWtlfSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtDcmVhdGVVcmxUcmVlU3RyYXRlZ3l9IGZyb20gJy4vY3JlYXRlX3VybF90cmVlX3N0cmF0ZWd5JztcbmltcG9ydCB7UnVudGltZUVycm9yQ29kZX0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IHtFdmVudCwgSU1QRVJBVElWRV9OQVZJR0FUSU9OLCBOYXZpZ2F0aW9uVHJpZ2dlcn0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zLCBPblNhbWVVcmxOYXZpZ2F0aW9uLCBSb3V0ZXN9IGZyb20gJy4vbW9kZWxzJztcbmltcG9ydCB7TmF2aWdhdGlvbiwgTmF2aWdhdGlvbkV4dHJhcywgTmF2aWdhdGlvblRyYW5zaXRpb24sIE5hdmlnYXRpb25UcmFuc2l0aW9ucywgUmVzdG9yZWRTdGF0ZSwgVXJsQ3JlYXRpb25PcHRpb25zfSBmcm9tICcuL25hdmlnYXRpb25fdHJhbnNpdGlvbic7XG5pbXBvcnQge1RpdGxlU3RyYXRlZ3l9IGZyb20gJy4vcGFnZV90aXRsZV9zdHJhdGVneSc7XG5pbXBvcnQge1JvdXRlUmV1c2VTdHJhdGVneX0gZnJvbSAnLi9yb3V0ZV9yZXVzZV9zdHJhdGVneSc7XG5pbXBvcnQge0Vycm9ySGFuZGxlciwgRXh0cmFPcHRpb25zLCBST1VURVJfQ09ORklHVVJBVElPTn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnJztcbmltcG9ydCB7Uk9VVEVTfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0c30gZnJvbSAnLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtjcmVhdGVFbXB0eVN0YXRlLCBSb3V0ZXJTdGF0ZX0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQYXJhbXN9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7VXJsSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi91cmxfaGFuZGxpbmdfc3RyYXRlZ3knO1xuaW1wb3J0IHtjb250YWluc1RyZWUsIElzQWN0aXZlTWF0Y2hPcHRpb25zLCBpc1VybFRyZWUsIFVybFNlcmlhbGl6ZXIsIFVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtmbGF0dGVufSBmcm9tICcuL3V0aWxzL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtzdGFuZGFyZGl6ZUNvbmZpZywgdmFsaWRhdGVDb25maWd9IGZyb20gJy4vdXRpbHMvY29uZmlnJztcblxuXG5jb25zdCBOR19ERVZfTU9ERSA9IHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8ICEhbmdEZXZNb2RlO1xuXG5mdW5jdGlvbiBkZWZhdWx0RXJyb3JIYW5kbGVyKGVycm9yOiBhbnkpOiBhbnkge1xuICB0aHJvdyBlcnJvcjtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdE1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcihcbiAgICBlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gIHJldHVybiB1cmxTZXJpYWxpemVyLnBhcnNlKCcvJyk7XG59XG5cbi8qKlxuICogVGhlIGVxdWl2YWxlbnQgYElzQWN0aXZlTWF0Y2hPcHRpb25zYCBvcHRpb25zIGZvciBgUm91dGVyLmlzQWN0aXZlYCBpcyBjYWxsZWQgd2l0aCBgdHJ1ZWBcbiAqIChleGFjdCA9IHRydWUpLlxuICovXG5leHBvcnQgY29uc3QgZXhhY3RNYXRjaE9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zID0ge1xuICBwYXRoczogJ2V4YWN0JyxcbiAgZnJhZ21lbnQ6ICdpZ25vcmVkJyxcbiAgbWF0cml4UGFyYW1zOiAnaWdub3JlZCcsXG4gIHF1ZXJ5UGFyYW1zOiAnZXhhY3QnXG59O1xuXG4vKipcbiAqIFRoZSBlcXVpdmFsZW50IGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2Agb3B0aW9ucyBmb3IgYFJvdXRlci5pc0FjdGl2ZWAgaXMgY2FsbGVkIHdpdGggYGZhbHNlYFxuICogKGV4YWN0ID0gZmFsc2UpLlxuICovXG5leHBvcnQgY29uc3Qgc3Vic2V0TWF0Y2hPcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucyA9IHtcbiAgcGF0aHM6ICdzdWJzZXQnLFxuICBmcmFnbWVudDogJ2lnbm9yZWQnLFxuICBtYXRyaXhQYXJhbXM6ICdpZ25vcmVkJyxcbiAgcXVlcnlQYXJhbXM6ICdzdWJzZXQnXG59O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEEgc2VydmljZSB0aGF0IHByb3ZpZGVzIG5hdmlnYXRpb24gYW1vbmcgdmlld3MgYW5kIFVSTCBtYW5pcHVsYXRpb24gY2FwYWJpbGl0aWVzLlxuICpcbiAqIEBzZWUgYFJvdXRlYC5cbiAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gR3VpZGVdKGd1aWRlL3JvdXRlcikuXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgUm91dGVyIHtcbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgdGhlIGFjdGl2YXRlZCBgVXJsVHJlZWAgdGhhdCB0aGUgYFJvdXRlcmAgaXMgY29uZmlndXJlZCB0byBoYW5kbGUgKHRocm91Z2hcbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3lgKS4gVGhhdCBpcywgYWZ0ZXIgd2UgZmluZCB0aGUgcm91dGUgY29uZmlnIHRyZWUgdGhhdCB3ZSdyZSBnb2luZyB0b1xuICAgKiBhY3RpdmF0ZSwgcnVuIGd1YXJkcywgYW5kIGFyZSBqdXN0IGFib3V0IHRvIGFjdGl2YXRlIHRoZSByb3V0ZSwgd2Ugc2V0IHRoZSBjdXJyZW50VXJsVHJlZS5cbiAgICpcbiAgICogVGhpcyBzaG91bGQgbWF0Y2ggdGhlIGBicm93c2VyVXJsVHJlZWAgd2hlbiBhIG5hdmlnYXRpb24gc3VjY2VlZHMuIElmIHRoZVxuICAgKiBgVXJsSGFuZGxpbmdTdHJhdGVneS5zaG91bGRQcm9jZXNzVXJsYCBpcyBgZmFsc2VgLCBvbmx5IHRoZSBgYnJvd3NlclVybFRyZWVgIGlzIHVwZGF0ZWQuXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgY3VycmVudFVybFRyZWU6IFVybFRyZWU7XG4gIC8qKlxuICAgKiBNZWFudCB0byByZXByZXNlbnQgdGhlIGVudGlyZSBicm93c2VyIHVybCBhZnRlciBhIHN1Y2Nlc3NmdWwgbmF2aWdhdGlvbi4gSW4gdGhlIGxpZmUgb2YgYVxuICAgKiBuYXZpZ2F0aW9uIHRyYW5zaXRpb246XG4gICAqIDEuIFRoZSByYXdVcmwgcmVwcmVzZW50cyB0aGUgZnVsbCBVUkwgdGhhdCdzIGJlaW5nIG5hdmlnYXRlZCB0b1xuICAgKiAyLiBXZSBhcHBseSByZWRpcmVjdHMsIHdoaWNoIG1pZ2h0IG9ubHkgYXBwbHkgdG8gX3BhcnRfIG9mIHRoZSBVUkwgKGR1ZSB0b1xuICAgKiBgVXJsSGFuZGxpbmdTdHJhdGVneWApLlxuICAgKiAzLiBSaWdodCBiZWZvcmUgYWN0aXZhdGlvbiAoYmVjYXVzZSB3ZSBhc3N1bWUgYWN0aXZhdGlvbiB3aWxsIHN1Y2NlZWQpLCB3ZSB1cGRhdGUgdGhlXG4gICAqIHJhd1VybFRyZWUgdG8gYmUgYSBjb21iaW5hdGlvbiBvZiB0aGUgdXJsQWZ0ZXJSZWRpcmVjdHMgKGFnYWluLCB0aGlzIG1pZ2h0IG9ubHkgYXBwbHkgdG8gcGFydFxuICAgKiBvZiB0aGUgaW5pdGlhbCB1cmwpIGFuZCB0aGUgcmF3VXJsIG9mIHRoZSB0cmFuc2l0aW9uICh3aGljaCB3YXMgdGhlIG9yaWdpbmFsIG5hdmlnYXRpb24gdXJsIGluXG4gICAqIGl0cyBmdWxsIGZvcm0pLlxuICAgKiBAaW50ZXJuYWxcbiAgICpcbiAgICogTm90ZSB0aGF0IHRoaXMgaXMgX29ubHlfIGhlcmUgdG8gc3VwcG9ydCBgVXJsSGFuZGxpbmdTdHJhdGVneS5leHRyYWN0YCBhbmRcbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybGAuIElmIHRob3NlIGRpZG4ndCBleGlzdCwgd2UgY291bGQgZ2V0IGJ5IHdpdGhcbiAgICogYGN1cnJlbnRVcmxUcmVlYCBhbG9uZS4gSWYgYSBuZXcgUm91dGVyIHdlcmUgdG8gYmUgcHJvdmlkZWQgKGkuZS4gb25lIHRoYXQgd29ya3Mgd2l0aCB0aGVcbiAgICogYnJvd3NlciBuYXZpZ2F0aW9uIEFQSSksIHdlIHNob3VsZCB0aGluayBhYm91dCB3aGV0aGVyIHRoaXMgY29tcGxleGl0eSBzaG91bGQgYmUgY2FycmllZCBvdmVyLlxuICAgKlxuICAgKiAtIGV4dHJhY3Q6IGByYXdVcmxUcmVlYCBpcyBuZWVkZWQgYmVjYXVzZSBgZXh0cmFjdGAgbWF5IG9ubHkgcmV0dXJuIHBhcnRcbiAgICogb2YgdGhlIG5hdmlnYXRpb24gVVJMLiBUaHVzLCBgY3VycmVudFVybFRyZWVgIG1heSBvbmx5IHJlcHJlc2VudCBfcGFydF8gb2YgdGhlIGJyb3dzZXIgVVJMLlxuICAgKiBXaGVuIGEgbmF2aWdhdGlvbiBnZXRzIGNhbmNlbGxlZCBhbmQgd2UgbmVlZCB0byByZXNldCB0aGUgVVJMIG9yIGEgbmV3IG5hdmlnYXRpb24gb2NjdXJzLCB3ZVxuICAgKiBuZWVkIHRvIGtub3cgdGhlIF93aG9sZV8gYnJvd3NlciBVUkwsIG5vdCBqdXN0IHRoZSBwYXJ0IGhhbmRsZWQgYnkgVXJsSGFuZGxpbmdTdHJhdGVneS5cbiAgICogLSBzaG91bGRQcm9jZXNzVXJsOiBXaGVuIHRoaXMgcmV0dXJucyBgZmFsc2VgLCB0aGUgcm91dGVyIGp1c3QgaWdub3JlcyB0aGUgbmF2aWdhdGlvbiBidXQgc3RpbGxcbiAgICogdXBkYXRlcyB0aGUgYHJhd1VybFRyZWVgIHdpdGggdGhlIGFzc3VtcHRpb24gdGhhdCB0aGUgbmF2aWdhdGlvbiB3YXMgY2F1c2VkIGJ5IHRoZSBsb2NhdGlvblxuICAgKiBjaGFuZ2UgbGlzdGVuZXIgZHVlIHRvIGEgVVJMIHVwZGF0ZSBieSB0aGUgQW5ndWxhckpTIHJvdXRlci4gSW4gdGhpcyBjYXNlLCB3ZSBzdGlsbCBuZWVkIHRvXG4gICAqIGtub3cgd2hhdCB0aGUgYnJvd3NlcidzIFVSTCBpcyBmb3IgZnV0dXJlIG5hdmlnYXRpb25zLlxuICAgKlxuICAgKi9cbiAgcmF3VXJsVHJlZTogVXJsVHJlZTtcbiAgLyoqXG4gICAqIE1lYW50IHRvIHJlcHJlc2VudCB0aGUgcGFydCBvZiB0aGUgYnJvd3NlciB1cmwgdGhhdCB0aGUgYFJvdXRlcmAgaXMgc2V0IHVwIHRvIGhhbmRsZSAodmlhIHRoZVxuICAgKiBgVXJsSGFuZGxpbmdTdHJhdGVneWApLiBUaGlzIHZhbHVlIGlzIHVwZGF0ZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIGJyb3dzZXIgdXJsIGlzIHVwZGF0ZWQgKG9yXG4gICAqIHRoZSBicm93c2VyIHVybCB1cGRhdGUgaXMgc2tpcHBlZCB2aWEgYHNraXBMb2NhdGlvbkNoYW5nZWApLiBXaXRoIHRoYXQsIG5vdGUgdGhhdFxuICAgKiBgYnJvd3NlclVybFRyZWVgIF9tYXkgbm90XyByZWZsZWN0IHRoZSBhY3R1YWwgYnJvd3NlciBVUkwgZm9yIHR3byByZWFzb25zOlxuICAgKlxuICAgKiAxLiBgVXJsSGFuZGxpbmdTdHJhdGVneWAgb25seSBoYW5kbGVzIHBhcnQgb2YgdGhlIFVSTFxuICAgKiAyLiBgc2tpcExvY2F0aW9uQ2hhbmdlYCBkb2VzIG5vdCB1cGRhdGUgdGhlIGJyb3dzZXIgdXJsLlxuICAgKlxuICAgKiBTbyB0byByZWl0ZXJhdGUsIGBicm93c2VyVXJsVHJlZWAgb25seSByZXByZXNlbnRzIHRoZSBSb3V0ZXIncyBpbnRlcm5hbCB1bmRlcnN0YW5kaW5nIG9mIHRoZVxuICAgKiBjdXJyZW50IHJvdXRlLCBlaXRoZXIgYmVmb3JlIGd1YXJkcyB3aXRoIGB1cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJ2Agb3IgcmlnaHQgYmVmb3JlXG4gICAqIGFjdGl2YXRpb24gd2l0aCBgJ2RlZmVycmVkJ2AuXG4gICAqXG4gICAqIFRoaXMgc2hvdWxkIG1hdGNoIHRoZSBgY3VycmVudFVybFRyZWVgIHdoZW4gdGhlIG5hdmlnYXRpb24gc3VjY2VlZHMuXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgYnJvd3NlclVybFRyZWU6IFVybFRyZWU7XG4gIHByaXZhdGUgZGlzcG9zZWQgPSBmYWxzZTtcblxuICBwcml2YXRlIGxvY2F0aW9uU3Vic2NyaXB0aW9uPzogU3Vic2NyaXB0aW9uTGlrZTtcbiAgLy8gVE9ETyhiLzI2MDc0NzA4Myk6IFRoaXMgc2hvdWxkIG5vdCBleGlzdCBhbmQgbmF2aWdhdGlvbklkIHNob3VsZCBiZSBwcml2YXRlIGluXG4gIC8vIGBOYXZpZ2F0aW9uVHJhbnNpdGlvbnNgXG4gIHByaXZhdGUgZ2V0IG5hdmlnYXRpb25JZCgpIHtcbiAgICByZXR1cm4gdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMubmF2aWdhdGlvbklkO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBpZCBvZiB0aGUgY3VycmVudGx5IGFjdGl2ZSBwYWdlIGluIHRoZSByb3V0ZXIuXG4gICAqIFVwZGF0ZWQgdG8gdGhlIHRyYW5zaXRpb24ncyB0YXJnZXQgaWQgb24gYSBzdWNjZXNzZnVsIG5hdmlnYXRpb24uXG4gICAqXG4gICAqIFRoaXMgaXMgdXNlZCB0byB0cmFjayB3aGF0IHBhZ2UgdGhlIHJvdXRlciBsYXN0IGFjdGl2YXRlZC4gV2hlbiBhbiBhdHRlbXB0ZWQgbmF2aWdhdGlvbiBmYWlscyxcbiAgICogdGhlIHJvdXRlciBjYW4gdGhlbiB1c2UgdGhpcyB0byBjb21wdXRlIGhvdyB0byByZXN0b3JlIHRoZSBzdGF0ZSBiYWNrIHRvIHRoZSBwcmV2aW91c2x5IGFjdGl2ZVxuICAgKiBwYWdlLlxuICAgKi9cbiAgcHJpdmF0ZSBjdXJyZW50UGFnZUlkOiBudW1iZXIgPSAwO1xuICAvKipcbiAgICogVGhlIMm1cm91dGVyUGFnZUlkIG9mIHdoYXRldmVyIHBhZ2UgaXMgY3VycmVudGx5IGFjdGl2ZSBpbiB0aGUgYnJvd3NlciBoaXN0b3J5LiBUaGlzIGlzXG4gICAqIGltcG9ydGFudCBmb3IgY29tcHV0aW5nIHRoZSB0YXJnZXQgcGFnZSBpZCBmb3IgbmV3IG5hdmlnYXRpb25zIGJlY2F1c2Ugd2UgbmVlZCB0byBlbnN1cmUgZWFjaFxuICAgKiBwYWdlIGlkIGluIHRoZSBicm93c2VyIGhpc3RvcnkgaXMgMSBtb3JlIHRoYW4gdGhlIHByZXZpb3VzIGVudHJ5LlxuICAgKi9cbiAgcHJpdmF0ZSBnZXQgYnJvd3NlclBhZ2VJZCgpOiBudW1iZXJ8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gKHRoaXMubG9jYXRpb24uZ2V0U3RhdGUoKSBhcyBSZXN0b3JlZFN0YXRlIHwgbnVsbCk/Lsm1cm91dGVyUGFnZUlkO1xuICB9XG4gIHByaXZhdGUgY29uc29sZSA9IGluamVjdChDb25zb2xlKTtcbiAgcHJpdmF0ZSBpc05nWm9uZUVuYWJsZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAvKipcbiAgICogQW4gZXZlbnQgc3RyZWFtIGZvciByb3V0aW5nIGV2ZW50cy5cbiAgICovXG4gIHB1YmxpYyBnZXQgZXZlbnRzKCk6IE9ic2VydmFibGU8RXZlbnQ+IHtcbiAgICAvLyBUT0RPKGF0c2NvdHQpOiBUaGlzIF9zaG91bGRfIGJlIGV2ZW50cy5hc09ic2VydmFibGUoKS4gSG93ZXZlciwgdGhpcyBjaGFuZ2UgcmVxdWlyZXMgaW50ZXJuYWxcbiAgICAvLyBjbGVhbnVwOiB0ZXN0cyBhcmUgZG9pbmcgYChyb3V0ZS5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pLm5leHQoLi4uKWAuIFRoaXMgaXNuJ3RcbiAgICAvLyBhbGxvd2VkL3N1cHBvcnRlZCBidXQgd2Ugc3RpbGwgaGF2ZSB0byBmaXggdGhlc2Ugb3IgZmlsZSBidWdzIGFnYWluc3QgdGhlIHRlYW1zIGJlZm9yZSBtYWtpbmdcbiAgICAvLyB0aGUgY2hhbmdlLlxuICAgIHJldHVybiB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5ldmVudHM7XG4gIH1cbiAgLyoqXG4gICAqIFRoZSBjdXJyZW50IHN0YXRlIG9mIHJvdXRpbmcgaW4gdGhpcyBOZ01vZHVsZS5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSByb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGU7XG5cbiAgcHJpdmF0ZSBvcHRpb25zID0gaW5qZWN0KFJPVVRFUl9DT05GSUdVUkFUSU9OLCB7b3B0aW9uYWw6IHRydWV9KSB8fCB7fTtcblxuICAvKipcbiAgICogQSBoYW5kbGVyIGZvciBuYXZpZ2F0aW9uIGVycm9ycyBpbiB0aGlzIE5nTW9kdWxlLlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBTdWJzY3JpYmUgdG8gdGhlIGBSb3V0ZXJgIGV2ZW50cyBhbmQgd2F0Y2ggZm9yIGBOYXZpZ2F0aW9uRXJyb3JgIGluc3RlYWQuXG4gICAqL1xuICBlcnJvckhhbmRsZXIgPSB0aGlzLm9wdGlvbnMuZXJyb3JIYW5kbGVyIHx8IGRlZmF1bHRFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIEEgaGFuZGxlciBmb3IgZXJyb3JzIHRocm93biBieSBgUm91dGVyLnBhcnNlVXJsKHVybClgXG4gICAqIHdoZW4gYHVybGAgY29udGFpbnMgYW4gaW52YWxpZCBjaGFyYWN0ZXIuXG4gICAqIFRoZSBtb3N0IGNvbW1vbiBjYXNlIGlzIGEgYCVgIHNpZ25cbiAgICogdGhhdCdzIG5vdCBlbmNvZGVkIGFuZCBpcyBub3QgcGFydCBvZiBhIHBlcmNlbnQgZW5jb2RlZCBzZXF1ZW5jZS5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgQ29uZmlndXJlIHRoaXMgdGhyb3VnaCBgUm91dGVyTW9kdWxlLmZvclJvb3RgIGluc3RlYWQ6XG4gICAqICAgYFJvdXRlck1vZHVsZS5mb3JSb290KHJvdXRlcywge21hbGZvcm1lZFVyaUVycm9ySGFuZGxlcjogbXlIYW5kbGVyfSlgXG4gICAqIEBzZWUgYFJvdXRlck1vZHVsZWBcbiAgICovXG4gIG1hbGZvcm1lZFVyaUVycm9ySGFuZGxlciA9XG4gICAgICB0aGlzLm9wdGlvbnMubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyIHx8IGRlZmF1bHRNYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIFRydWUgaWYgYXQgbGVhc3Qgb25lIG5hdmlnYXRpb24gZXZlbnQgaGFzIG9jY3VycmVkLFxuICAgKiBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuICBuYXZpZ2F0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSBsYXN0U3VjY2Vzc2Z1bElkOiBudW1iZXIgPSAtMTtcblxuICAvKipcbiAgICogQSBzdHJhdGVneSBmb3IgZXh0cmFjdGluZyBhbmQgbWVyZ2luZyBVUkxzLlxuICAgKiBVc2VkIGZvciBBbmd1bGFySlMgdG8gQW5ndWxhciBtaWdyYXRpb25zLlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBDb25maWd1cmUgdXNpbmcgYHByb3ZpZGVyc2AgaW5zdGVhZDpcbiAgICogICBge3Byb3ZpZGU6IFVybEhhbmRsaW5nU3RyYXRlZ3ksIHVzZUNsYXNzOiBNeVN0cmF0ZWd5fWAuXG4gICAqL1xuICB1cmxIYW5kbGluZ1N0cmF0ZWd5ID0gaW5qZWN0KFVybEhhbmRsaW5nU3RyYXRlZ3kpO1xuXG4gIC8qKlxuICAgKiBBIHN0cmF0ZWd5IGZvciByZS11c2luZyByb3V0ZXMuXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIENvbmZpZ3VyZSB1c2luZyBgcHJvdmlkZXJzYCBpbnN0ZWFkOlxuICAgKiAgIGB7cHJvdmlkZTogUm91dGVSZXVzZVN0cmF0ZWd5LCB1c2VDbGFzczogTXlTdHJhdGVneX1gLlxuICAgKi9cbiAgcm91dGVSZXVzZVN0cmF0ZWd5ID0gaW5qZWN0KFJvdXRlUmV1c2VTdHJhdGVneSk7XG5cbiAgLyoqIFN0cmF0ZWd5IHVzZWQgdG8gY3JlYXRlIGEgVXJsVHJlZS4gKi9cbiAgcHJpdmF0ZSByZWFkb25seSB1cmxDcmVhdGlvblN0cmF0ZWd5ID0gaW5qZWN0KENyZWF0ZVVybFRyZWVTdHJhdGVneSk7XG5cbiAgLyoqXG4gICAqIEEgc3RyYXRlZ3kgZm9yIHNldHRpbmcgdGhlIHRpdGxlIGJhc2VkIG9uIHRoZSBgcm91dGVyU3RhdGVgLlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBDb25maWd1cmUgdXNpbmcgYHByb3ZpZGVyc2AgaW5zdGVhZDpcbiAgICogICBge3Byb3ZpZGU6IFRpdGxlU3RyYXRlZ3ksIHVzZUNsYXNzOiBNeVN0cmF0ZWd5fWAuXG4gICAqL1xuICB0aXRsZVN0cmF0ZWd5PzogVGl0bGVTdHJhdGVneSA9IGluamVjdChUaXRsZVN0cmF0ZWd5KTtcblxuICAvKipcbiAgICogSG93IHRvIGhhbmRsZSBhIG5hdmlnYXRpb24gcmVxdWVzdCB0byB0aGUgY3VycmVudCBVUkwuXG4gICAqXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIENvbmZpZ3VyZSB0aGlzIHRocm91Z2ggYHByb3ZpZGVSb3V0ZXJgIG9yIGBSb3V0ZXJNb2R1bGUuZm9yUm9vdGAgaW5zdGVhZC5cbiAgICogQHNlZSBgd2l0aFJvdXRlckNvbmZpZ2BcbiAgICogQHNlZSBgcHJvdmlkZVJvdXRlcmBcbiAgICogQHNlZSBgUm91dGVyTW9kdWxlYFxuICAgKi9cbiAgb25TYW1lVXJsTmF2aWdhdGlvbjogT25TYW1lVXJsTmF2aWdhdGlvbiA9IHRoaXMub3B0aW9ucy5vblNhbWVVcmxOYXZpZ2F0aW9uIHx8ICdpZ25vcmUnO1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gbWVyZ2UgcGFyYW1ldGVycywgZGF0YSwgcmVzb2x2ZWQgZGF0YSwgYW5kIHRpdGxlIGZyb20gcGFyZW50IHRvIGNoaWxkXG4gICAqIHJvdXRlcy4gT25lIG9mOlxuICAgKlxuICAgKiAtIGAnZW1wdHlPbmx5J2AgOiBJbmhlcml0IHBhcmVudCBwYXJhbWV0ZXJzLCBkYXRhLCBhbmQgcmVzb2x2ZWQgZGF0YVxuICAgKiBmb3IgcGF0aC1sZXNzIG9yIGNvbXBvbmVudC1sZXNzIHJvdXRlcy5cbiAgICogLSBgJ2Fsd2F5cydgIDogSW5oZXJpdCBwYXJlbnQgcGFyYW1ldGVycywgZGF0YSwgYW5kIHJlc29sdmVkIGRhdGFcbiAgICogZm9yIGFsbCBjaGlsZCByb3V0ZXMuXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIENvbmZpZ3VyZSB0aGlzIHRocm91Z2ggYHByb3ZpZGVSb3V0ZXJgIG9yIGBSb3V0ZXJNb2R1bGUuZm9yUm9vdGAgaW5zdGVhZC5cbiAgICogQHNlZSBgd2l0aFJvdXRlckNvbmZpZ2BcbiAgICogQHNlZSBgcHJvdmlkZVJvdXRlcmBcbiAgICogQHNlZSBgUm91dGVyTW9kdWxlYFxuICAgKi9cbiAgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogJ2VtcHR5T25seSd8J2Fsd2F5cycgPVxuICAgICAgdGhpcy5vcHRpb25zLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kgfHwgJ2VtcHR5T25seSc7XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hlbiB0aGUgcm91dGVyIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMLlxuICAgKiBCeSBkZWZhdWx0IChgXCJkZWZlcnJlZFwiYCksIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMIGFmdGVyIG5hdmlnYXRpb24gaGFzIGZpbmlzaGVkLlxuICAgKiBTZXQgdG8gYCdlYWdlcidgIHRvIHVwZGF0ZSB0aGUgYnJvd3NlciBVUkwgYXQgdGhlIGJlZ2lubmluZyBvZiBuYXZpZ2F0aW9uLlxuICAgKiBZb3UgY2FuIGNob29zZSB0byB1cGRhdGUgZWFybHkgc28gdGhhdCwgaWYgbmF2aWdhdGlvbiBmYWlscyxcbiAgICogeW91IGNhbiBzaG93IGFuIGVycm9yIG1lc3NhZ2Ugd2l0aCB0aGUgVVJMIHRoYXQgZmFpbGVkLlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBDb25maWd1cmUgdGhpcyB0aHJvdWdoIGBwcm92aWRlUm91dGVyYCBvciBgUm91dGVyTW9kdWxlLmZvclJvb3RgIGluc3RlYWQuXG4gICAqIEBzZWUgYHdpdGhSb3V0ZXJDb25maWdgXG4gICAqIEBzZWUgYHByb3ZpZGVSb3V0ZXJgXG4gICAqIEBzZWUgYFJvdXRlck1vZHVsZWBcbiAgICovXG4gIHVybFVwZGF0ZVN0cmF0ZWd5OiAnZGVmZXJyZWQnfCdlYWdlcicgPSB0aGlzLm9wdGlvbnMudXJsVXBkYXRlU3RyYXRlZ3kgfHwgJ2RlZmVycmVkJztcblxuICAvKipcbiAgICogQ29uZmlndXJlcyBob3cgdGhlIFJvdXRlciBhdHRlbXB0cyB0byByZXN0b3JlIHN0YXRlIHdoZW4gYSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGxlZC5cbiAgICpcbiAgICogJ3JlcGxhY2UnIC0gQWx3YXlzIHVzZXMgYGxvY2F0aW9uLnJlcGxhY2VTdGF0ZWAgdG8gc2V0IHRoZSBicm93c2VyIHN0YXRlIHRvIHRoZSBzdGF0ZSBvZiB0aGVcbiAgICogcm91dGVyIGJlZm9yZSB0aGUgbmF2aWdhdGlvbiBzdGFydGVkLiBUaGlzIG1lYW5zIHRoYXQgaWYgdGhlIFVSTCBvZiB0aGUgYnJvd3NlciBpcyB1cGRhdGVkXG4gICAqIF9iZWZvcmVfIHRoZSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGVkLCB0aGUgUm91dGVyIHdpbGwgc2ltcGx5IHJlcGxhY2UgdGhlIGl0ZW0gaW4gaGlzdG9yeSByYXRoZXJcbiAgICogdGhhbiB0cnlpbmcgdG8gcmVzdG9yZSB0byB0aGUgcHJldmlvdXMgbG9jYXRpb24gaW4gdGhlIHNlc3Npb24gaGlzdG9yeS4gVGhpcyBoYXBwZW5zIG1vc3RcbiAgICogZnJlcXVlbnRseSB3aXRoIGB1cmxVcGRhdGVTdHJhdGVneTogJ2VhZ2VyJ2AgYW5kIG5hdmlnYXRpb25zIHdpdGggdGhlIGJyb3dzZXIgYmFjay9mb3J3YXJkXG4gICAqIGJ1dHRvbnMuXG4gICAqXG4gICAqICdjb21wdXRlZCcgLSBXaWxsIGF0dGVtcHQgdG8gcmV0dXJuIHRvIHRoZSBzYW1lIGluZGV4IGluIHRoZSBzZXNzaW9uIGhpc3RvcnkgdGhhdCBjb3JyZXNwb25kc1xuICAgKiB0byB0aGUgQW5ndWxhciByb3V0ZSB3aGVuIHRoZSBuYXZpZ2F0aW9uIGdldHMgY2FuY2VsbGVkLiBGb3IgZXhhbXBsZSwgaWYgdGhlIGJyb3dzZXIgYmFja1xuICAgKiBidXR0b24gaXMgY2xpY2tlZCBhbmQgdGhlIG5hdmlnYXRpb24gaXMgY2FuY2VsbGVkLCB0aGUgUm91dGVyIHdpbGwgdHJpZ2dlciBhIGZvcndhcmQgbmF2aWdhdGlvblxuICAgKiBhbmQgdmljZSB2ZXJzYS5cbiAgICpcbiAgICogTm90ZTogdGhlICdjb21wdXRlZCcgb3B0aW9uIGlzIGluY29tcGF0aWJsZSB3aXRoIGFueSBgVXJsSGFuZGxpbmdTdHJhdGVneWAgd2hpY2ggb25seVxuICAgKiBoYW5kbGVzIGEgcG9ydGlvbiBvZiB0aGUgVVJMIGJlY2F1c2UgdGhlIGhpc3RvcnkgcmVzdG9yYXRpb24gbmF2aWdhdGVzIHRvIHRoZSBwcmV2aW91cyBwbGFjZSBpblxuICAgKiB0aGUgYnJvd3NlciBoaXN0b3J5IHJhdGhlciB0aGFuIHNpbXBseSByZXNldHRpbmcgYSBwb3J0aW9uIG9mIHRoZSBVUkwuXG4gICAqXG4gICAqIFRoZSBkZWZhdWx0IHZhbHVlIGlzIGByZXBsYWNlYC5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgQ29uZmlndXJlIHRoaXMgdGhyb3VnaCBgcHJvdmlkZVJvdXRlcmAgb3IgYFJvdXRlck1vZHVsZS5mb3JSb290YCBpbnN0ZWFkLlxuICAgKiBAc2VlIGB3aXRoUm91dGVyQ29uZmlnYFxuICAgKiBAc2VlIGBwcm92aWRlUm91dGVyYFxuICAgKiBAc2VlIGBSb3V0ZXJNb2R1bGVgXG4gICAqL1xuICBjYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uOiAncmVwbGFjZSd8J2NvbXB1dGVkJyA9XG4gICAgICB0aGlzLm9wdGlvbnMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiB8fCAncmVwbGFjZSc7XG5cbiAgY29uZmlnOiBSb3V0ZXMgPSBmbGF0dGVuKGluamVjdChST1VURVMsIHtvcHRpb25hbDogdHJ1ZX0pID8/IFtdKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IG5hdmlnYXRpb25UcmFuc2l0aW9ucyA9IGluamVjdChOYXZpZ2F0aW9uVHJhbnNpdGlvbnMpO1xuICBwcml2YXRlIHJlYWRvbmx5IHVybFNlcmlhbGl6ZXIgPSBpbmplY3QoVXJsU2VyaWFsaXplcik7XG4gIHByaXZhdGUgcmVhZG9ubHkgbG9jYXRpb24gPSBpbmplY3QoTG9jYXRpb24pO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuaXNOZ1pvbmVFbmFibGVkID0gaW5qZWN0KE5nWm9uZSkgaW5zdGFuY2VvZiBOZ1pvbmUgJiYgTmdab25lLmlzSW5Bbmd1bGFyWm9uZSgpO1xuXG4gICAgdGhpcy5yZXNldENvbmZpZyh0aGlzLmNvbmZpZyk7XG4gICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IG5ldyBVcmxUcmVlKCk7XG4gICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy5jdXJyZW50VXJsVHJlZTtcbiAgICB0aGlzLmJyb3dzZXJVcmxUcmVlID0gdGhpcy5jdXJyZW50VXJsVHJlZTtcblxuICAgIHRoaXMucm91dGVyU3RhdGUgPSBjcmVhdGVFbXB0eVN0YXRlKHRoaXMuY3VycmVudFVybFRyZWUsIG51bGwpO1xuXG4gICAgdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuc2V0dXBOYXZpZ2F0aW9ucyh0aGlzKS5zdWJzY3JpYmUoXG4gICAgICAgIHQgPT4ge1xuICAgICAgICAgIHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCA9IHQuaWQ7XG4gICAgICAgICAgdGhpcy5jdXJyZW50UGFnZUlkID0gdC50YXJnZXRQYWdlSWQ7XG4gICAgICAgIH0sXG4gICAgICAgIGUgPT4ge1xuICAgICAgICAgIHRoaXMuY29uc29sZS53YXJuKGBVbmhhbmRsZWQgTmF2aWdhdGlvbiBFcnJvcjogJHtlfWApO1xuICAgICAgICB9KTtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcmVzZXRSb290Q29tcG9uZW50VHlwZShyb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+KTogdm9pZCB7XG4gICAgLy8gVE9ETzogdnNhdmtpbiByb3V0ZXIgNC4wIHNob3VsZCBtYWtlIHRoZSByb290IGNvbXBvbmVudCBzZXQgdG8gbnVsbFxuICAgIC8vIHRoaXMgd2lsbCBzaW1wbGlmeSB0aGUgbGlmZWN5Y2xlIG9mIHRoZSByb3V0ZXIuXG4gICAgdGhpcy5yb3V0ZXJTdGF0ZS5yb290LmNvbXBvbmVudCA9IHJvb3RDb21wb25lbnRUeXBlO1xuICAgIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLnJvb3RDb21wb25lbnRUeXBlID0gcm9vdENvbXBvbmVudFR5cGU7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyIGFuZCBwZXJmb3JtcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaW5pdGlhbE5hdmlnYXRpb24oKTogdm9pZCB7XG4gICAgdGhpcy5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICBpZiAoIXRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmhhc1JlcXVlc3RlZE5hdmlnYXRpb24pIHtcbiAgICAgIGNvbnN0IHN0YXRlID0gdGhpcy5sb2NhdGlvbi5nZXRTdGF0ZSgpIGFzIFJlc3RvcmVkU3RhdGU7XG4gICAgICB0aGlzLm5hdmlnYXRlVG9TeW5jV2l0aEJyb3dzZXIodGhpcy5sb2NhdGlvbi5wYXRoKHRydWUpLCBJTVBFUkFUSVZFX05BVklHQVRJT04sIHN0YXRlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyLiBUaGlzIGxpc3RlbmVyIGRldGVjdHMgbmF2aWdhdGlvbnMgdHJpZ2dlcmVkIGZyb20gb3V0c2lkZVxuICAgKiB0aGUgUm91dGVyICh0aGUgYnJvd3NlciBiYWNrL2ZvcndhcmQgYnV0dG9ucywgZm9yIGV4YW1wbGUpIGFuZCBzY2hlZHVsZXMgYSBjb3JyZXNwb25kaW5nIFJvdXRlclxuICAgKiBuYXZpZ2F0aW9uIHNvIHRoYXQgdGhlIGNvcnJlY3QgZXZlbnRzLCBndWFyZHMsIGV0Yy4gYXJlIHRyaWdnZXJlZC5cbiAgICovXG4gIHNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpOiB2b2lkIHtcbiAgICAvLyBEb24ndCBuZWVkIHRvIHVzZSBab25lLndyYXAgYW55IG1vcmUsIGJlY2F1c2Ugem9uZS5qc1xuICAgIC8vIGFscmVhZHkgcGF0Y2ggb25Qb3BTdGF0ZSwgc28gbG9jYXRpb24gY2hhbmdlIGNhbGxiYWNrIHdpbGxcbiAgICAvLyBydW4gaW50byBuZ1pvbmVcbiAgICBpZiAoIXRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24gPSB0aGlzLmxvY2F0aW9uLnN1YnNjcmliZShldmVudCA9PiB7XG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IGV2ZW50Wyd0eXBlJ10gPT09ICdwb3BzdGF0ZScgPyAncG9wc3RhdGUnIDogJ2hhc2hjaGFuZ2UnO1xuICAgICAgICBpZiAoc291cmNlID09PSAncG9wc3RhdGUnKSB7XG4gICAgICAgICAgLy8gVGhlIGBzZXRUaW1lb3V0YCB3YXMgYWRkZWQgaW4gIzEyMTYwIGFuZCBpcyBsaWtlbHkgdG8gc3VwcG9ydCBBbmd1bGFyL0FuZ3VsYXJKU1xuICAgICAgICAgIC8vIGh5YnJpZCBhcHBzLlxuICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5uYXZpZ2F0ZVRvU3luY1dpdGhCcm93c2VyKGV2ZW50Wyd1cmwnXSEsIHNvdXJjZSwgZXZlbnQuc3RhdGUpO1xuICAgICAgICAgIH0sIDApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2NoZWR1bGVzIGEgcm91dGVyIG5hdmlnYXRpb24gdG8gc3luY2hyb25pemUgUm91dGVyIHN0YXRlIHdpdGggdGhlIGJyb3dzZXIgc3RhdGUuXG4gICAqXG4gICAqIFRoaXMgaXMgZG9uZSBhcyBhIHJlc3BvbnNlIHRvIGEgcG9wc3RhdGUgZXZlbnQgYW5kIHRoZSBpbml0aWFsIG5hdmlnYXRpb24uIFRoZXNlXG4gICAqIHR3byBzY2VuYXJpb3MgcmVwcmVzZW50IHRpbWVzIHdoZW4gdGhlIGJyb3dzZXIgVVJML3N0YXRlIGhhcyBiZWVuIHVwZGF0ZWQgYW5kXG4gICAqIHRoZSBSb3V0ZXIgbmVlZHMgdG8gcmVzcG9uZCB0byBlbnN1cmUgaXRzIGludGVybmFsIHN0YXRlIG1hdGNoZXMuXG4gICAqL1xuICBwcml2YXRlIG5hdmlnYXRlVG9TeW5jV2l0aEJyb3dzZXIoXG4gICAgICB1cmw6IHN0cmluZywgc291cmNlOiBOYXZpZ2F0aW9uVHJpZ2dlciwgc3RhdGU6IFJlc3RvcmVkU3RhdGV8dW5kZWZpbmVkKSB7XG4gICAgY29uc3QgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3JlcGxhY2VVcmw6IHRydWV9O1xuXG4gICAgLy8gVE9ETzogcmVzdG9yZWRTdGF0ZSBzaG91bGQgYWx3YXlzIGluY2x1ZGUgdGhlIGVudGlyZSBzdGF0ZSwgcmVnYXJkbGVzc1xuICAgIC8vIG9mIG5hdmlnYXRpb25JZC4gVGhpcyByZXF1aXJlcyBhIGJyZWFraW5nIGNoYW5nZSB0byB1cGRhdGUgdGhlIHR5cGUgb25cbiAgICAvLyBOYXZpZ2F0aW9uU3RhcnTigJlzIHJlc3RvcmVkU3RhdGUsIHdoaWNoIGN1cnJlbnRseSByZXF1aXJlcyBuYXZpZ2F0aW9uSWRcbiAgICAvLyB0byBhbHdheXMgYmUgcHJlc2VudC4gVGhlIFJvdXRlciB1c2VkIHRvIG9ubHkgcmVzdG9yZSBoaXN0b3J5IHN0YXRlIGlmXG4gICAgLy8gYSBuYXZpZ2F0aW9uSWQgd2FzIHByZXNlbnQuXG5cbiAgICAvLyBUaGUgc3RvcmVkIG5hdmlnYXRpb25JZCBpcyB1c2VkIGJ5IHRoZSBSb3V0ZXJTY3JvbGxlciB0byByZXRyaWV2ZSB0aGUgc2Nyb2xsXG4gICAgLy8gcG9zaXRpb24gZm9yIHRoZSBwYWdlLlxuICAgIGNvbnN0IHJlc3RvcmVkU3RhdGUgPSBzdGF0ZT8ubmF2aWdhdGlvbklkID8gc3RhdGUgOiBudWxsO1xuXG4gICAgLy8gU2VwYXJhdGUgdG8gTmF2aWdhdGlvblN0YXJ0LnJlc3RvcmVkU3RhdGUsIHdlIG11c3QgYWxzbyByZXN0b3JlIHRoZSBzdGF0ZSB0b1xuICAgIC8vIGhpc3Rvcnkuc3RhdGUgYW5kIGdlbmVyYXRlIGEgbmV3IG5hdmlnYXRpb25JZCwgc2luY2UgaXQgd2lsbCBiZSBvdmVyd3JpdHRlblxuICAgIGlmIChzdGF0ZSkge1xuICAgICAgY29uc3Qgc3RhdGVDb3B5ID0gey4uLnN0YXRlfSBhcyBQYXJ0aWFsPFJlc3RvcmVkU3RhdGU+O1xuICAgICAgZGVsZXRlIHN0YXRlQ29weS5uYXZpZ2F0aW9uSWQ7XG4gICAgICBkZWxldGUgc3RhdGVDb3B5Lsm1cm91dGVyUGFnZUlkO1xuICAgICAgaWYgKE9iamVjdC5rZXlzKHN0YXRlQ29weSkubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgIGV4dHJhcy5zdGF0ZSA9IHN0YXRlQ29weTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKHVybFRyZWUsIHNvdXJjZSwgcmVzdG9yZWRTdGF0ZSwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKiBUaGUgY3VycmVudCBVUkwuICovXG4gIGdldCB1cmwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5zZXJpYWxpemVVcmwodGhpcy5jdXJyZW50VXJsVHJlZSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgY3VycmVudCBgTmF2aWdhdGlvbmAgb2JqZWN0IHdoZW4gdGhlIHJvdXRlciBpcyBuYXZpZ2F0aW5nLFxuICAgKiBhbmQgYG51bGxgIHdoZW4gaWRsZS5cbiAgICovXG4gIGdldEN1cnJlbnROYXZpZ2F0aW9uKCk6IE5hdmlnYXRpb258bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmN1cnJlbnROYXZpZ2F0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0cyB0aGUgcm91dGUgY29uZmlndXJhdGlvbiB1c2VkIGZvciBuYXZpZ2F0aW9uIGFuZCBnZW5lcmF0aW5nIGxpbmtzLlxuICAgKlxuICAgKiBAcGFyYW0gY29uZmlnIFRoZSByb3V0ZSBhcnJheSBmb3IgdGhlIG5ldyBjb25maWd1cmF0aW9uLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLnJlc2V0Q29uZmlnKFtcbiAgICogIHsgcGF0aDogJ3RlYW0vOmlkJywgY29tcG9uZW50OiBUZWFtQ21wLCBjaGlsZHJlbjogW1xuICAgKiAgICB7IHBhdGg6ICdzaW1wbGUnLCBjb21wb25lbnQ6IFNpbXBsZUNtcCB9LFxuICAgKiAgICB7IHBhdGg6ICd1c2VyLzpuYW1lJywgY29tcG9uZW50OiBVc2VyQ21wIH1cbiAgICogIF19XG4gICAqIF0pO1xuICAgKiBgYGBcbiAgICovXG4gIHJlc2V0Q29uZmlnKGNvbmZpZzogUm91dGVzKTogdm9pZCB7XG4gICAgTkdfREVWX01PREUgJiYgdmFsaWRhdGVDb25maWcoY29uZmlnKTtcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZy5tYXAoc3RhbmRhcmRpemVDb25maWcpO1xuICAgIHRoaXMubmF2aWdhdGVkID0gZmFsc2U7XG4gICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bElkID0gLTE7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuZGlzcG9zZSgpO1xuICB9XG5cbiAgLyoqIERpc3Bvc2VzIG9mIHRoZSByb3V0ZXIuICovXG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuY29tcGxldGUoKTtcbiAgICBpZiAodGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbiA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdGhpcy5kaXNwb3NlZCA9IHRydWU7XG4gIH1cblxuICAvKipcbiAgICogQXBwZW5kcyBVUkwgc2VnbWVudHMgdG8gdGhlIGN1cnJlbnQgVVJMIHRyZWUgdG8gY3JlYXRlIGEgbmV3IFVSTCB0cmVlLlxuICAgKlxuICAgKiBAcGFyYW0gY29tbWFuZHMgQW4gYXJyYXkgb2YgVVJMIGZyYWdtZW50cyB3aXRoIHdoaWNoIHRvIGNvbnN0cnVjdCB0aGUgbmV3IFVSTCB0cmVlLlxuICAgKiBJZiB0aGUgcGF0aCBpcyBzdGF0aWMsIGNhbiBiZSB0aGUgbGl0ZXJhbCBVUkwgc3RyaW5nLiBGb3IgYSBkeW5hbWljIHBhdGgsIHBhc3MgYW4gYXJyYXkgb2YgcGF0aFxuICAgKiBzZWdtZW50cywgZm9sbG93ZWQgYnkgdGhlIHBhcmFtZXRlcnMgZm9yIGVhY2ggc2VnbWVudC5cbiAgICogVGhlIGZyYWdtZW50cyBhcmUgYXBwbGllZCB0byB0aGUgY3VycmVudCBVUkwgdHJlZSBvciB0aGUgb25lIHByb3ZpZGVkICBpbiB0aGUgYHJlbGF0aXZlVG9gXG4gICAqIHByb3BlcnR5IG9mIHRoZSBvcHRpb25zIG9iamVjdCwgaWYgc3VwcGxpZWQuXG4gICAqIEBwYXJhbSBuYXZpZ2F0aW9uRXh0cmFzIE9wdGlvbnMgdGhhdCBjb250cm9sIHRoZSBuYXZpZ2F0aW9uIHN0cmF0ZWd5LlxuICAgKiBAcmV0dXJucyBUaGUgbmV3IFVSTCB0cmVlLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBgYGBcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCAndXNlcicsIDExXSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMztleHBhbmQ9dHJ1ZS91c2VyLzExXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge2V4cGFuZDogdHJ1ZX0sICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8geW91IGNhbiBjb2xsYXBzZSBzdGF0aWMgc2VnbWVudHMgbGlrZSB0aGlzICh0aGlzIHdvcmtzIG9ubHkgd2l0aCB0aGUgZmlyc3QgcGFzc2VkLWluIHZhbHVlKTpcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbS8zMy91c2VyJywgdXNlcklkXSk7XG4gICAqXG4gICAqIC8vIElmIHRoZSBmaXJzdCBzZWdtZW50IGNhbiBjb250YWluIHNsYXNoZXMsIGFuZCB5b3UgZG8gbm90IHdhbnQgdGhlIHJvdXRlciB0byBzcGxpdCBpdCxcbiAgICogLy8geW91IGNhbiBkbyB0aGUgZm9sbG93aW5nOlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbe3NlZ21lbnRQYXRoOiAnL29uZS90d28nfV0pO1xuICAgKlxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvKHVzZXIvMTEvL3JpZ2h0OmNoYXQpXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiAnY2hhdCd9fV0pO1xuICAgKlxuICAgKiAvLyByZW1vdmUgdGhlIHJpZ2h0IHNlY29uZGFyeSBub2RlXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiBudWxsfX1dKTtcbiAgICpcbiAgICogLy8gYXNzdW1pbmcgdGhlIGN1cnJlbnQgdXJsIGlzIGAvdGVhbS8zMy91c2VyLzExYCBhbmQgdGhlIHJvdXRlIHBvaW50cyB0byBgdXNlci8xMWBcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8xMS9kZXRhaWxzXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnZGV0YWlscyddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8yMlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy4uLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS80NC91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vLi4vdGVhbS80NC91c2VyLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiBOb3RlIHRoYXQgYSB2YWx1ZSBvZiBgbnVsbGAgb3IgYHVuZGVmaW5lZGAgZm9yIGByZWxhdGl2ZVRvYCBpbmRpY2F0ZXMgdGhhdCB0aGVcbiAgICogdHJlZSBzaG91bGQgYmUgY3JlYXRlZCByZWxhdGl2ZSB0byB0aGUgcm9vdC5cbiAgICogYGBgXG4gICAqL1xuICBjcmVhdGVVcmxUcmVlKGNvbW1hbmRzOiBhbnlbXSwgbmF2aWdhdGlvbkV4dHJhczogVXJsQ3JlYXRpb25PcHRpb25zID0ge30pOiBVcmxUcmVlIHtcbiAgICBjb25zdCB7cmVsYXRpdmVUbywgcXVlcnlQYXJhbXMsIGZyYWdtZW50LCBxdWVyeVBhcmFtc0hhbmRsaW5nLCBwcmVzZXJ2ZUZyYWdtZW50fSA9XG4gICAgICAgIG5hdmlnYXRpb25FeHRyYXM7XG4gICAgY29uc3QgZiA9IHByZXNlcnZlRnJhZ21lbnQgPyB0aGlzLmN1cnJlbnRVcmxUcmVlLmZyYWdtZW50IDogZnJhZ21lbnQ7XG4gICAgbGV0IHE6IFBhcmFtc3xudWxsID0gbnVsbDtcbiAgICBzd2l0Y2ggKHF1ZXJ5UGFyYW1zSGFuZGxpbmcpIHtcbiAgICAgIGNhc2UgJ21lcmdlJzpcbiAgICAgICAgcSA9IHsuLi50aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zLCAuLi5xdWVyeVBhcmFtc307XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncHJlc2VydmUnOlxuICAgICAgICBxID0gdGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcztcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBxID0gcXVlcnlQYXJhbXMgfHwgbnVsbDtcbiAgICB9XG4gICAgaWYgKHEgIT09IG51bGwpIHtcbiAgICAgIHEgPSB0aGlzLnJlbW92ZUVtcHR5UHJvcHMocSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnVybENyZWF0aW9uU3RyYXRlZ3kuY3JlYXRlVXJsVHJlZShcbiAgICAgICAgcmVsYXRpdmVUbywgdGhpcy5yb3V0ZXJTdGF0ZSwgdGhpcy5jdXJyZW50VXJsVHJlZSwgY29tbWFuZHMsIHEsIGYgPz8gbnVsbCk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGVzIHRvIGEgdmlldyB1c2luZyBhbiBhYnNvbHV0ZSByb3V0ZSBwYXRoLlxuICAgKlxuICAgKiBAcGFyYW0gdXJsIEFuIGFic29sdXRlIHBhdGggZm9yIGEgZGVmaW5lZCByb3V0ZS4gVGhlIGZ1bmN0aW9uIGRvZXMgbm90IGFwcGx5IGFueSBkZWx0YSB0byB0aGVcbiAgICogICAgIGN1cnJlbnQgVVJMLlxuICAgKiBAcGFyYW0gZXh0cmFzIEFuIG9iamVjdCBjb250YWluaW5nIHByb3BlcnRpZXMgdGhhdCBtb2RpZnkgdGhlIG5hdmlnYXRpb24gc3RyYXRlZ3kuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvICd0cnVlJyB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsXG4gICAqIHRvICdmYWxzZScgd2hlbiBuYXZpZ2F0aW9uIGZhaWxzLCBvciBpcyByZWplY3RlZCBvbiBlcnJvci5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBjYWxscyByZXF1ZXN0IG5hdmlnYXRpb24gdG8gYW4gYWJzb2x1dGUgcGF0aC5cbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiKTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiLCB7IHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRlcilcbiAgICpcbiAgICovXG4gIG5hdmlnYXRlQnlVcmwodXJsOiBzdHJpbmd8VXJsVHJlZSwgZXh0cmFzOiBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zID0ge1xuICAgIHNraXBMb2NhdGlvbkNoYW5nZTogZmFsc2VcbiAgfSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fFxuICAgICAgICBuZ0Rldk1vZGUgJiYgdGhpcy5pc05nWm9uZUVuYWJsZWQgJiYgIU5nWm9uZS5pc0luQW5ndWxhclpvbmUoKSkge1xuICAgICAgdGhpcy5jb25zb2xlLndhcm4oXG4gICAgICAgICAgYE5hdmlnYXRpb24gdHJpZ2dlcmVkIG91dHNpZGUgQW5ndWxhciB6b25lLCBkaWQgeW91IGZvcmdldCB0byBjYWxsICduZ1pvbmUucnVuKCknP2ApO1xuICAgIH1cblxuICAgIGNvbnN0IHVybFRyZWUgPSBpc1VybFRyZWUodXJsKSA/IHVybCA6IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICBjb25zdCBtZXJnZWRUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHVybFRyZWUsIHRoaXMucmF3VXJsVHJlZSk7XG5cbiAgICByZXR1cm4gdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24obWVyZ2VkVHJlZSwgSU1QRVJBVElWRV9OQVZJR0FUSU9OLCBudWxsLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBhcnJheSBvZiBjb21tYW5kcyBhbmQgYSBzdGFydGluZyBwb2ludC5cbiAgICogSWYgbm8gc3RhcnRpbmcgcm91dGUgaXMgcHJvdmlkZWQsIHRoZSBuYXZpZ2F0aW9uIGlzIGFic29sdXRlLlxuICAgKlxuICAgKiBAcGFyYW0gY29tbWFuZHMgQW4gYXJyYXkgb2YgVVJMIGZyYWdtZW50cyB3aXRoIHdoaWNoIHRvIGNvbnN0cnVjdCB0aGUgdGFyZ2V0IFVSTC5cbiAgICogSWYgdGhlIHBhdGggaXMgc3RhdGljLCBjYW4gYmUgdGhlIGxpdGVyYWwgVVJMIHN0cmluZy4gRm9yIGEgZHluYW1pYyBwYXRoLCBwYXNzIGFuIGFycmF5IG9mIHBhdGhcbiAgICogc2VnbWVudHMsIGZvbGxvd2VkIGJ5IHRoZSBwYXJhbWV0ZXJzIGZvciBlYWNoIHNlZ21lbnQuXG4gICAqIFRoZSBmcmFnbWVudHMgYXJlIGFwcGxpZWQgdG8gdGhlIGN1cnJlbnQgVVJMIG9yIHRoZSBvbmUgcHJvdmlkZWQgIGluIHRoZSBgcmVsYXRpdmVUb2AgcHJvcGVydHlcbiAgICogb2YgdGhlIG9wdGlvbnMgb2JqZWN0LCBpZiBzdXBwbGllZC5cbiAgICogQHBhcmFtIGV4dHJhcyBBbiBvcHRpb25zIG9iamVjdCB0aGF0IGRldGVybWluZXMgaG93IHRoZSBVUkwgc2hvdWxkIGJlIGNvbnN0cnVjdGVkIG9yXG4gICAqICAgICBpbnRlcnByZXRlZC5cbiAgICpcbiAgICogQHJldHVybnMgQSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gYHRydWVgIHdoZW4gbmF2aWdhdGlvbiBzdWNjZWVkcywgdG8gYGZhbHNlYCB3aGVuIG5hdmlnYXRpb25cbiAgICogICAgIGZhaWxzLFxuICAgKiBvciBpcyByZWplY3RlZCBvbiBlcnJvci5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBjYWxscyByZXF1ZXN0IG5hdmlnYXRpb24gdG8gYSBkeW5hbWljIHJvdXRlIHBhdGggcmVsYXRpdmUgdG8gdGhlIGN1cnJlbnQgVVJMLlxuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTCwgb3ZlcnJpZGluZyB0aGUgZGVmYXVsdCBiZWhhdmlvclxuICAgKiByb3V0ZXIubmF2aWdhdGUoWyd0ZWFtJywgMzMsICd1c2VyJywgMTFdLCB7cmVsYXRpdmVUbzogcm91dGUsIHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZX0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKVxuICAgKlxuICAgKi9cbiAgbmF2aWdhdGUoY29tbWFuZHM6IGFueVtdLCBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7c2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZX0pOlxuICAgICAgUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdmFsaWRhdGVDb21tYW5kcyhjb21tYW5kcyk7XG4gICAgcmV0dXJuIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmNyZWF0ZVVybFRyZWUoY29tbWFuZHMsIGV4dHJhcyksIGV4dHJhcyk7XG4gIH1cblxuICAvKiogU2VyaWFsaXplcyBhIGBVcmxUcmVlYCBpbnRvIGEgc3RyaW5nICovXG4gIHNlcmlhbGl6ZVVybCh1cmw6IFVybFRyZWUpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHVybCk7XG4gIH1cblxuICAvKiogUGFyc2VzIGEgc3RyaW5nIGludG8gYSBgVXJsVHJlZWAgKi9cbiAgcGFyc2VVcmwodXJsOiBzdHJpbmcpOiBVcmxUcmVlIHtcbiAgICBsZXQgdXJsVHJlZTogVXJsVHJlZTtcbiAgICB0cnkge1xuICAgICAgdXJsVHJlZSA9IHRoaXMudXJsU2VyaWFsaXplci5wYXJzZSh1cmwpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHVybFRyZWUgPSB0aGlzLm1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcihlIGFzIFVSSUVycm9yLCB0aGlzLnVybFNlcmlhbGl6ZXIsIHVybCk7XG4gICAgfVxuICAgIHJldHVybiB1cmxUcmVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciB0aGUgdXJsIGlzIGFjdGl2YXRlZC5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWRcbiAgICogVXNlIGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2AgaW5zdGVhZC5cbiAgICpcbiAgICogLSBUaGUgZXF1aXZhbGVudCBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIGZvciBgdHJ1ZWAgaXNcbiAgICogYHtwYXRoczogJ2V4YWN0JywgcXVlcnlQYXJhbXM6ICdleGFjdCcsIGZyYWdtZW50OiAnaWdub3JlZCcsIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnfWAuXG4gICAqIC0gVGhlIGVxdWl2YWxlbnQgZm9yIGBmYWxzZWAgaXNcbiAgICogYHtwYXRoczogJ3N1YnNldCcsIHF1ZXJ5UGFyYW1zOiAnc3Vic2V0JywgZnJhZ21lbnQ6ICdpZ25vcmVkJywgbWF0cml4UGFyYW1zOiAnaWdub3JlZCd9YC5cbiAgICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIGV4YWN0OiBib29sZWFuKTogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciB0aGUgdXJsIGlzIGFjdGl2YXRlZC5cbiAgICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIG1hdGNoT3B0aW9uczogSXNBY3RpdmVNYXRjaE9wdGlvbnMpOiBib29sZWFuO1xuICAvKiogQGludGVybmFsICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIG1hdGNoT3B0aW9uczogYm9vbGVhbnxJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IGJvb2xlYW47XG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIG1hdGNoT3B0aW9uczogYm9vbGVhbnxJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IGJvb2xlYW4ge1xuICAgIGxldCBvcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucztcbiAgICBpZiAobWF0Y2hPcHRpb25zID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zID0gey4uLmV4YWN0TWF0Y2hPcHRpb25zfTtcbiAgICB9IGVsc2UgaWYgKG1hdGNoT3B0aW9ucyA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMgPSB7Li4uc3Vic2V0TWF0Y2hPcHRpb25zfTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucyA9IG1hdGNoT3B0aW9ucztcbiAgICB9XG4gICAgaWYgKGlzVXJsVHJlZSh1cmwpKSB7XG4gICAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybCwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybFRyZWUsIG9wdGlvbnMpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVFbXB0eVByb3BzKHBhcmFtczogUGFyYW1zKTogUGFyYW1zIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMocGFyYW1zKS5yZWR1Y2UoKHJlc3VsdDogUGFyYW1zLCBrZXk6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgdmFsdWU6IGFueSA9IHBhcmFtc1trZXldO1xuICAgICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSwge30pO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBzY2hlZHVsZU5hdmlnYXRpb24oXG4gICAgICByYXdVcmw6IFVybFRyZWUsIHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIsIHJlc3RvcmVkU3RhdGU6IFJlc3RvcmVkU3RhdGV8bnVsbCxcbiAgICAgIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyxcbiAgICAgIHByaW9yUHJvbWlzZT86IHtyZXNvbHZlOiBhbnksIHJlamVjdDogYW55LCBwcm9taXNlOiBQcm9taXNlPGJvb2xlYW4+fSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICh0aGlzLmRpc3Bvc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGZhbHNlKTtcbiAgICB9XG5cbiAgICBsZXQgcmVzb2x2ZTogYW55O1xuICAgIGxldCByZWplY3Q6IGFueTtcbiAgICBsZXQgcHJvbWlzZTogUHJvbWlzZTxib29sZWFuPjtcbiAgICBpZiAocHJpb3JQcm9taXNlKSB7XG4gICAgICByZXNvbHZlID0gcHJpb3JQcm9taXNlLnJlc29sdmU7XG4gICAgICByZWplY3QgPSBwcmlvclByb21pc2UucmVqZWN0O1xuICAgICAgcHJvbWlzZSA9IHByaW9yUHJvbWlzZS5wcm9taXNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBwcm9taXNlID0gbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlcywgcmVqKSA9PiB7XG4gICAgICAgIHJlc29sdmUgPSByZXM7XG4gICAgICAgIHJlamVjdCA9IHJlajtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGxldCB0YXJnZXRQYWdlSWQ6IG51bWJlcjtcbiAgICBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAnY29tcHV0ZWQnKSB7XG4gICAgICAvLyBJZiB0aGUgYMm1cm91dGVyUGFnZUlkYCBleGlzdCBpbiB0aGUgc3RhdGUgdGhlbiBgdGFyZ2V0cGFnZUlkYCBzaG91bGQgaGF2ZSB0aGUgdmFsdWUgb2ZcbiAgICAgIC8vIGDJtXJvdXRlclBhZ2VJZGAuIFRoaXMgaXMgdGhlIGNhc2UgZm9yIHNvbWV0aGluZyBsaWtlIGEgcGFnZSByZWZyZXNoIHdoZXJlIHdlIGFzc2lnbiB0aGVcbiAgICAgIC8vIHRhcmdldCBpZCB0byB0aGUgcHJldmlvdXNseSBzZXQgdmFsdWUgZm9yIHRoYXQgcGFnZS5cbiAgICAgIGlmIChyZXN0b3JlZFN0YXRlICYmIHJlc3RvcmVkU3RhdGUuybVyb3V0ZXJQYWdlSWQpIHtcbiAgICAgICAgdGFyZ2V0UGFnZUlkID0gcmVzdG9yZWRTdGF0ZS7JtXJvdXRlclBhZ2VJZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHdlJ3JlIHJlcGxhY2luZyB0aGUgVVJMIG9yIGRvaW5nIGEgc2lsZW50IG5hdmlnYXRpb24sIHdlIGRvIG5vdCB3YW50IHRvIGluY3JlbWVudCB0aGVcbiAgICAgICAgLy8gcGFnZSBpZCBiZWNhdXNlIHdlIGFyZW4ndCBwdXNoaW5nIGEgbmV3IGVudHJ5IHRvIGhpc3RvcnkuXG4gICAgICAgIGlmIChleHRyYXMucmVwbGFjZVVybCB8fCBleHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgICAgdGFyZ2V0UGFnZUlkID0gdGhpcy5icm93c2VyUGFnZUlkID8/IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGFyZ2V0UGFnZUlkID0gKHRoaXMuYnJvd3NlclBhZ2VJZCA/PyAwKSArIDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhpcyBpcyB1bnVzZWQgd2hlbiBgY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbmAgaXMgbm90IGNvbXB1dGVkLlxuICAgICAgdGFyZ2V0UGFnZUlkID0gMDtcbiAgICB9XG5cbiAgICB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5oYW5kbGVOYXZpZ2F0aW9uUmVxdWVzdCh7XG4gICAgICB0YXJnZXRQYWdlSWQsXG4gICAgICBzb3VyY2UsXG4gICAgICByZXN0b3JlZFN0YXRlLFxuICAgICAgY3VycmVudFVybFRyZWU6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBjdXJyZW50UmF3VXJsOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgcmF3VXJsLFxuICAgICAgZXh0cmFzLFxuICAgICAgcmVzb2x2ZSxcbiAgICAgIHJlamVjdCxcbiAgICAgIHByb21pc2UsXG4gICAgICBjdXJyZW50U25hcHNob3Q6IHRoaXMucm91dGVyU3RhdGUuc25hcHNob3QsXG4gICAgICBjdXJyZW50Um91dGVyU3RhdGU6IHRoaXMucm91dGVyU3RhdGVcbiAgICB9KTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBlcnJvciBpcyBwcm9wYWdhdGVkIGV2ZW4gdGhvdWdoIGBwcm9jZXNzTmF2aWdhdGlvbnNgIGNhdGNoXG4gICAgLy8gaGFuZGxlciBkb2VzIG5vdCByZXRocm93XG4gICAgcmV0dXJuIHByb21pc2UuY2F0Y2goKGU6IGFueSkgPT4ge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBzZXRCcm93c2VyVXJsKHVybDogVXJsVHJlZSwgdHJhbnNpdGlvbjogTmF2aWdhdGlvblRyYW5zaXRpb24pIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICAgIGNvbnN0IHN0YXRlID0ge1xuICAgICAgLi4udHJhbnNpdGlvbi5leHRyYXMuc3RhdGUsXG4gICAgICAuLi50aGlzLmdlbmVyYXRlTmdSb3V0ZXJTdGF0ZSh0cmFuc2l0aW9uLmlkLCB0cmFuc2l0aW9uLnRhcmdldFBhZ2VJZClcbiAgICB9O1xuICAgIGlmICh0aGlzLmxvY2F0aW9uLmlzQ3VycmVudFBhdGhFcXVhbFRvKHBhdGgpIHx8ICEhdHJhbnNpdGlvbi5leHRyYXMucmVwbGFjZVVybCkge1xuICAgICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUocGF0aCwgJycsIHN0YXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5sb2NhdGlvbi5nbyhwYXRoLCAnJywgc3RhdGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtcyB0aGUgbmVjZXNzYXJ5IHJvbGxiYWNrIGFjdGlvbiB0byByZXN0b3JlIHRoZSBicm93c2VyIFVSTCB0byB0aGVcbiAgICogc3RhdGUgYmVmb3JlIHRoZSB0cmFuc2l0aW9uLlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHJlc3RvcmVIaXN0b3J5KHRyYW5zaXRpb246IE5hdmlnYXRpb25UcmFuc2l0aW9uLCByZXN0b3JpbmdGcm9tQ2F1Z2h0RXJyb3IgPSBmYWxzZSkge1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdjb21wdXRlZCcpIHtcbiAgICAgIGNvbnN0IHRhcmdldFBhZ2VQb3NpdGlvbiA9IHRoaXMuY3VycmVudFBhZ2VJZCAtIHRyYW5zaXRpb24udGFyZ2V0UGFnZUlkO1xuICAgICAgLy8gVGhlIG5hdmlnYXRvciBjaGFuZ2UgdGhlIGxvY2F0aW9uIGJlZm9yZSB0cmlnZ2VyZWQgdGhlIGJyb3dzZXIgZXZlbnQsXG4gICAgICAvLyBzbyB3ZSBuZWVkIHRvIGdvIGJhY2sgdG8gdGhlIGN1cnJlbnQgdXJsIGlmIHRoZSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGVkLlxuICAgICAgLy8gQWxzbywgd2hlbiBuYXZpZ2F0aW9uIGdldHMgY2FuY2VsbGVkIHdoaWxlIHVzaW5nIHVybCB1cGRhdGUgc3RyYXRlZ3kgZWFnZXIsIHRoZW4gd2UgbmVlZCB0b1xuICAgICAgLy8gZ28gYmFjay4gQmVjYXVzZSwgd2hlbiBgdXJsVXBkYXRlU3RyYXRlZ3lgIGlzIGBlYWdlcmA7IGBzZXRCcm93c2VyVXJsYCBtZXRob2QgaXMgY2FsbGVkXG4gICAgICAvLyBiZWZvcmUgYW55IHZlcmlmaWNhdGlvbi5cbiAgICAgIGNvbnN0IGJyb3dzZXJVcmxVcGRhdGVPY2N1cnJlZCA9XG4gICAgICAgICAgKHRyYW5zaXRpb24uc291cmNlID09PSAncG9wc3RhdGUnIHx8IHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcicgfHxcbiAgICAgICAgICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9PT0gdGhpcy5nZXRDdXJyZW50TmF2aWdhdGlvbigpPy5maW5hbFVybCk7XG4gICAgICBpZiAoYnJvd3NlclVybFVwZGF0ZU9jY3VycmVkICYmIHRhcmdldFBhZ2VQb3NpdGlvbiAhPT0gMCkge1xuICAgICAgICB0aGlzLmxvY2F0aW9uLmhpc3RvcnlHbyh0YXJnZXRQYWdlUG9zaXRpb24pO1xuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID09PSB0aGlzLmdldEN1cnJlbnROYXZpZ2F0aW9uKCk/LmZpbmFsVXJsICYmXG4gICAgICAgICAgdGFyZ2V0UGFnZVBvc2l0aW9uID09PSAwKSB7XG4gICAgICAgIC8vIFdlIGdvdCB0byB0aGUgYWN0aXZhdGlvbiBzdGFnZSAod2hlcmUgY3VycmVudFVybFRyZWUgaXMgc2V0IHRvIHRoZSBuYXZpZ2F0aW9uJ3NcbiAgICAgICAgLy8gZmluYWxVcmwpLCBidXQgd2Ugd2VyZW4ndCBtb3ZpbmcgYW55d2hlcmUgaW4gaGlzdG9yeSAoc2tpcExvY2F0aW9uQ2hhbmdlIG9yIHJlcGxhY2VVcmwpLlxuICAgICAgICAvLyBXZSBzdGlsbCBuZWVkIHRvIHJlc2V0IHRoZSByb3V0ZXIgc3RhdGUgYmFjayB0byB3aGF0IGl0IHdhcyB3aGVuIHRoZSBuYXZpZ2F0aW9uIHN0YXJ0ZWQuXG4gICAgICAgIHRoaXMucmVzZXRTdGF0ZSh0cmFuc2l0aW9uKTtcbiAgICAgICAgLy8gVE9ETyhhdHNjb3R0KTogcmVzZXR0aW5nIHRoZSBgYnJvd3NlclVybFRyZWVgIHNob3VsZCByZWFsbHkgYmUgZG9uZSBpbiBgcmVzZXRTdGF0ZWAuXG4gICAgICAgIC8vIEludmVzdGlnYXRlIGlmIHRoaXMgY2FuIGJlIGRvbmUgYnkgcnVubmluZyBUR1AuXG4gICAgICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0cmFuc2l0aW9uLmN1cnJlbnRVcmxUcmVlO1xuICAgICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhlIGJyb3dzZXIgVVJMIGFuZCByb3V0ZXIgc3RhdGUgd2FzIG5vdCB1cGRhdGVkIGJlZm9yZSB0aGUgbmF2aWdhdGlvbiBjYW5jZWxsZWQgc29cbiAgICAgICAgLy8gdGhlcmUncyBubyByZXN0b3JhdGlvbiBuZWVkZWQuXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdyZXBsYWNlJykge1xuICAgICAgLy8gVE9ETyhhdHNjb3R0KTogSXQgc2VlbXMgbGlrZSB3ZSBzaG91bGQgX2Fsd2F5c18gcmVzZXQgdGhlIHN0YXRlIGhlcmUuIEl0IHdvdWxkIGJlIGEgbm8tb3BcbiAgICAgIC8vIGZvciBgZGVmZXJyZWRgIG5hdmlnYXRpb25zIHRoYXQgaGF2ZW4ndCBjaGFuZ2UgdGhlIGludGVybmFsIHN0YXRlIHlldCBiZWNhdXNlIGd1YXJkc1xuICAgICAgLy8gcmVqZWN0LiBGb3IgJ2VhZ2VyJyBuYXZpZ2F0aW9ucywgaXQgc2VlbXMgbGlrZSB3ZSBhbHNvIHJlYWxseSBzaG91bGQgcmVzZXQgdGhlIHN0YXRlXG4gICAgICAvLyBiZWNhdXNlIHRoZSBuYXZpZ2F0aW9uIHdhcyBjYW5jZWxsZWQuIEludmVzdGlnYXRlIGlmIHRoaXMgY2FuIGJlIGRvbmUgYnkgcnVubmluZyBUR1AuXG4gICAgICBpZiAocmVzdG9yaW5nRnJvbUNhdWdodEVycm9yKSB7XG4gICAgICAgIHRoaXMucmVzZXRTdGF0ZSh0cmFuc2l0aW9uKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZXNldFN0YXRlKHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uKTogdm9pZCB7XG4gICAgKHRoaXMgYXMge3JvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZX0pLnJvdXRlclN0YXRlID0gdC5jdXJyZW50Um91dGVyU3RhdGU7XG4gICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IHQuY3VycmVudFVybFRyZWU7XG4gICAgLy8gTm90ZSBoZXJlIHRoYXQgd2UgdXNlIHRoZSB1cmxIYW5kbGluZ1N0cmF0ZWd5IHRvIGdldCB0aGUgcmVzZXQgYHJhd1VybFRyZWVgIGJlY2F1c2UgaXQgbWF5IGJlXG4gICAgLy8gY29uZmlndXJlZCB0byBoYW5kbGUgb25seSBwYXJ0IG9mIHRoZSBuYXZpZ2F0aW9uIFVSTC4gVGhpcyBtZWFucyB3ZSB3b3VsZCBvbmx5IHdhbnQgdG8gcmVzZXRcbiAgICAvLyB0aGUgcGFydCBvZiB0aGUgbmF2aWdhdGlvbiBoYW5kbGVkIGJ5IHRoZSBBbmd1bGFyIHJvdXRlciByYXRoZXIgdGhhbiB0aGUgd2hvbGUgVVJMLiBJblxuICAgIC8vIGFkZGl0aW9uLCB0aGUgVVJMSGFuZGxpbmdTdHJhdGVneSBtYXkgYmUgY29uZmlndXJlZCB0byBzcGVjaWZpY2FsbHkgcHJlc2VydmUgcGFydHMgb2YgdGhlIFVSTFxuICAgIC8vIHdoZW4gbWVyZ2luZywgc3VjaCBhcyB0aGUgcXVlcnkgcGFyYW1zIHNvIHRoZXkgYXJlIG5vdCBsb3N0IG9uIGEgcmVmcmVzaC5cbiAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodGhpcy5jdXJyZW50VXJsVHJlZSwgdC5yYXdVcmwpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTogdm9pZCB7XG4gICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUoXG4gICAgICAgIHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodGhpcy5yYXdVcmxUcmVlKSwgJycsXG4gICAgICAgIHRoaXMuZ2VuZXJhdGVOZ1JvdXRlclN0YXRlKHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCwgdGhpcy5jdXJyZW50UGFnZUlkKSk7XG4gIH1cblxuICBwcml2YXRlIGdlbmVyYXRlTmdSb3V0ZXJTdGF0ZShuYXZpZ2F0aW9uSWQ6IG51bWJlciwgcm91dGVyUGFnZUlkPzogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ2NvbXB1dGVkJykge1xuICAgICAgcmV0dXJuIHtuYXZpZ2F0aW9uSWQsIMm1cm91dGVyUGFnZUlkOiByb3V0ZXJQYWdlSWR9O1xuICAgIH1cbiAgICByZXR1cm4ge25hdmlnYXRpb25JZH07XG4gIH1cbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVDb21tYW5kcyhjb21tYW5kczogc3RyaW5nW10pOiB2b2lkIHtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb21tYW5kcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNtZCA9IGNvbW1hbmRzW2ldO1xuICAgIGlmIChjbWQgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLk5VTExJU0hfQ09NTUFORCxcbiAgICAgICAgICBOR19ERVZfTU9ERSAmJiBgVGhlIHJlcXVlc3RlZCBwYXRoIGNvbnRhaW5zICR7Y21kfSBzZWdtZW50IGF0IGluZGV4ICR7aX1gKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==