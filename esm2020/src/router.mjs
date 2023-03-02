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
class Router {
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
         *   `provideRouter` has the `withNavigationErrorHandler` feature to make this easier.
         * @see `withNavigationErrorHandler`
         */
        this.errorHandler = this.options.errorHandler || defaultErrorHandler;
        /**
         * A handler for errors thrown by `Router.parseUrl(url)`
         * when `url` contains an invalid character.
         * The most common case is a `%` sign
         * that's not encoded and is not part of a percent encoded sequence.
         *
         * @deprecated URI parsing errors should be handled in the `UrlSerializer`.
         *
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
        this.config = inject(ROUTES, { optional: true })?.flat() ?? [];
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
        if (NG_DEV_MODE) {
            if (this.isNgZoneEnabled && !NgZone.isInAngularZone()) {
                this.console.warn(`Navigation triggered outside Angular zone, did you forget to call 'ngZone.run()'?`);
            }
            if (url instanceof UrlTree && url._warnIfUsedForNavigation) {
                this.console.warn(url._warnIfUsedForNavigation);
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
Router.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.1+sha-cc34d5b", ngImport: i0, type: Router, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
Router.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.0.0-next.1+sha-cc34d5b", ngImport: i0, type: Router, providedIn: 'root' });
export { Router };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.1+sha-cc34d5b", ngImport: i0, type: Router, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBUSxRQUFRLElBQUksT0FBTyxFQUFFLGFBQWEsSUFBSSxZQUFZLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFHbkgsT0FBTyxFQUFDLHFCQUFxQixFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFFakUsT0FBTyxFQUFRLHFCQUFxQixFQUFvQixNQUFNLFVBQVUsQ0FBQztBQUV6RSxPQUFPLEVBQXFELHFCQUFxQixFQUFvQyxNQUFNLHlCQUF5QixDQUFDO0FBQ3JKLE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUNwRCxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUMxRCxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUNyRCxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDOUMsT0FBTyxFQUFDLGdCQUFnQixFQUFjLE1BQU0sZ0JBQWdCLENBQUM7QUFFN0QsT0FBTyxFQUFDLG1CQUFtQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDNUQsT0FBTyxFQUFDLFlBQVksRUFBd0IsU0FBUyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDakcsT0FBTyxFQUFDLGlCQUFpQixFQUFFLGNBQWMsRUFBQyxNQUFNLGdCQUFnQixDQUFDOztBQUdqRSxNQUFNLFdBQVcsR0FBRyxPQUFPLFNBQVMsS0FBSyxXQUFXLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUVwRSxTQUFTLG1C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LENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ3hDLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDZixNQUFNLElBQUksWUFBWSw4Q0FFbEIsV0FBVyxJQUFJLCtCQUErQixHQUFHLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2hGO0tBQ0Y7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge2luamVjdCwgSW5qZWN0YWJsZSwgTmdab25lLCBUeXBlLCDJtUNvbnNvbGUgYXMgQ29uc29sZSwgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgb2YsIFN1YnNjcmlwdGlvbkxpa2V9IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge0NyZWF0ZVVybFRyZWVTdHJhdGVneX0gZnJvbSAnLi9jcmVhdGVfdXJsX3RyZWVfc3RyYXRlZ3knO1xuaW1wb3J0IHtSdW50aW1lRXJyb3JDb2RlfSBmcm9tICcuL2Vycm9ycyc7XG5pbXBvcnQge0V2ZW50LCBJTVBFUkFUSVZFX05BVklHQVRJT04sIE5hdmlnYXRpb25UcmlnZ2VyfSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge05hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMsIE9uU2FtZVVybE5hdmlnYXRpb24sIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtOYXZpZ2F0aW9uLCBOYXZpZ2F0aW9uRXh0cmFzLCBOYXZpZ2F0aW9uVHJhbnNpdGlvbiwgTmF2aWdhdGlvblRyYW5zaXRpb25zLCBSZXN0b3JlZFN0YXRlLCBVcmxDcmVhdGlvbk9wdGlvbnN9IGZyb20gJy4vbmF2aWdhdGlvbl90cmFuc2l0aW9uJztcbmltcG9ydCB7VGl0bGVTdHJhdGVneX0gZnJvbSAnLi9wYWdlX3RpdGxlX3N0cmF0ZWd5JztcbmltcG9ydCB7Um91dGVSZXVzZVN0cmF0ZWd5fSBmcm9tICcuL3JvdXRlX3JldXNlX3N0cmF0ZWd5JztcbmltcG9ydCB7Uk9VVEVSX0NPTkZJR1VSQVRJT059IGZyb20gJy4vcm91dGVyX2NvbmZpZyc7XG5pbXBvcnQge1JPVVRFU30gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge2NyZWF0ZUVtcHR5U3RhdGUsIFJvdXRlclN0YXRlfSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BhcmFtc30gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtVcmxIYW5kbGluZ1N0cmF0ZWd5fSBmcm9tICcuL3VybF9oYW5kbGluZ19zdHJhdGVneSc7XG5pbXBvcnQge2NvbnRhaW5zVHJlZSwgSXNBY3RpdmVNYXRjaE9wdGlvbnMsIGlzVXJsVHJlZSwgVXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge3N0YW5kYXJkaXplQ29uZmlnLCB2YWxpZGF0ZUNvbmZpZ30gZnJvbSAnLi91dGlscy9jb25maWcnO1xuXG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgISFuZ0Rldk1vZGU7XG5cbmZ1bmN0aW9uIGRlZmF1bHRFcnJvckhhbmRsZXIoZXJyb3I6IGFueSk6IGFueSB7XG4gIHRocm93IGVycm9yO1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0TWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyKFxuICAgIGVycm9yOiBVUklFcnJvciwgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgdXJsOiBzdHJpbmcpOiBVcmxUcmVlIHtcbiAgcmV0dXJuIHVybFNlcmlhbGl6ZXIucGFyc2UoJy8nKTtcbn1cblxuLyoqXG4gKiBUaGUgZXF1aXZhbGVudCBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIG9wdGlvbnMgZm9yIGBSb3V0ZXIuaXNBY3RpdmVgIGlzIGNhbGxlZCB3aXRoIGB0cnVlYFxuICogKGV4YWN0ID0gdHJ1ZSkuXG4gKi9cbmV4cG9ydCBjb25zdCBleGFjdE1hdGNoT3B0aW9uczogSXNBY3RpdmVNYXRjaE9wdGlvbnMgPSB7XG4gIHBhdGhzOiAnZXhhY3QnLFxuICBmcmFnbWVudDogJ2lnbm9yZWQnLFxuICBtYXRyaXhQYXJhbXM6ICdpZ25vcmVkJyxcbiAgcXVlcnlQYXJhbXM6ICdleGFjdCdcbn07XG5cbi8qKlxuICogVGhlIGVxdWl2YWxlbnQgYElzQWN0aXZlTWF0Y2hPcHRpb25zYCBvcHRpb25zIGZvciBgUm91dGVyLmlzQWN0aXZlYCBpcyBjYWxsZWQgd2l0aCBgZmFsc2VgXG4gKiAoZXhhY3QgPSBmYWxzZSkuXG4gKi9cbmV4cG9ydCBjb25zdCBzdWJzZXRNYXRjaE9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zID0ge1xuICBwYXRoczogJ3N1YnNldCcsXG4gIGZyYWdtZW50OiAnaWdub3JlZCcsXG4gIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnLFxuICBxdWVyeVBhcmFtczogJ3N1YnNldCdcbn07XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQSBzZXJ2aWNlIHRoYXQgcHJvdmlkZXMgbmF2aWdhdGlvbiBhbW9uZyB2aWV3cyBhbmQgVVJMIG1hbmlwdWxhdGlvbiBjYXBhYmlsaXRpZXMuXG4gKlxuICogQHNlZSBgUm91dGVgLlxuICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBHdWlkZV0oZ3VpZGUvcm91dGVyKS5cbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnfSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXIge1xuICAvKipcbiAgICogUmVwcmVzZW50cyB0aGUgYWN0aXZhdGVkIGBVcmxUcmVlYCB0aGF0IHRoZSBgUm91dGVyYCBpcyBjb25maWd1cmVkIHRvIGhhbmRsZSAodGhyb3VnaFxuICAgKiBgVXJsSGFuZGxpbmdTdHJhdGVneWApLiBUaGF0IGlzLCBhZnRlciB3ZSBmaW5kIHRoZSByb3V0ZSBjb25maWcgdHJlZSB0aGF0IHdlJ3JlIGdvaW5nIHRvXG4gICAqIGFjdGl2YXRlLCBydW4gZ3VhcmRzLCBhbmQgYXJlIGp1c3QgYWJvdXQgdG8gYWN0aXZhdGUgdGhlIHJvdXRlLCB3ZSBzZXQgdGhlIGN1cnJlbnRVcmxUcmVlLlxuICAgKlxuICAgKiBUaGlzIHNob3VsZCBtYXRjaCB0aGUgYGJyb3dzZXJVcmxUcmVlYCB3aGVuIGEgbmF2aWdhdGlvbiBzdWNjZWVkcy4gSWYgdGhlXG4gICAqIGBVcmxIYW5kbGluZ1N0cmF0ZWd5LnNob3VsZFByb2Nlc3NVcmxgIGlzIGBmYWxzZWAsIG9ubHkgdGhlIGBicm93c2VyVXJsVHJlZWAgaXMgdXBkYXRlZC5cbiAgICogQGludGVybmFsXG4gICAqL1xuICBjdXJyZW50VXJsVHJlZTogVXJsVHJlZTtcbiAgLyoqXG4gICAqIE1lYW50IHRvIHJlcHJlc2VudCB0aGUgZW50aXJlIGJyb3dzZXIgdXJsIGFmdGVyIGEgc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uLiBJbiB0aGUgbGlmZSBvZiBhXG4gICAqIG5hdmlnYXRpb24gdHJhbnNpdGlvbjpcbiAgICogMS4gVGhlIHJhd1VybCByZXByZXNlbnRzIHRoZSBmdWxsIFVSTCB0aGF0J3MgYmVpbmcgbmF2aWdhdGVkIHRvXG4gICAqIDIuIFdlIGFwcGx5IHJlZGlyZWN0cywgd2hpY2ggbWlnaHQgb25seSBhcHBseSB0byBfcGFydF8gb2YgdGhlIFVSTCAoZHVlIHRvXG4gICAqIGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCkuXG4gICAqIDMuIFJpZ2h0IGJlZm9yZSBhY3RpdmF0aW9uIChiZWNhdXNlIHdlIGFzc3VtZSBhY3RpdmF0aW9uIHdpbGwgc3VjY2VlZCksIHdlIHVwZGF0ZSB0aGVcbiAgICogcmF3VXJsVHJlZSB0byBiZSBhIGNvbWJpbmF0aW9uIG9mIHRoZSB1cmxBZnRlclJlZGlyZWN0cyAoYWdhaW4sIHRoaXMgbWlnaHQgb25seSBhcHBseSB0byBwYXJ0XG4gICAqIG9mIHRoZSBpbml0aWFsIHVybCkgYW5kIHRoZSByYXdVcmwgb2YgdGhlIHRyYW5zaXRpb24gKHdoaWNoIHdhcyB0aGUgb3JpZ2luYWwgbmF2aWdhdGlvbiB1cmwgaW5cbiAgICogaXRzIGZ1bGwgZm9ybSkuXG4gICAqIEBpbnRlcm5hbFxuICAgKlxuICAgKiBOb3RlIHRoYXQgdGhpcyBpcyBfb25seV8gaGVyZSB0byBzdXBwb3J0IGBVcmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3RgIGFuZFxuICAgKiBgVXJsSGFuZGxpbmdTdHJhdGVneS5zaG91bGRQcm9jZXNzVXJsYC4gSWYgdGhvc2UgZGlkbid0IGV4aXN0LCB3ZSBjb3VsZCBnZXQgYnkgd2l0aFxuICAgKiBgY3VycmVudFVybFRyZWVgIGFsb25lLiBJZiBhIG5ldyBSb3V0ZXIgd2VyZSB0byBiZSBwcm92aWRlZCAoaS5lLiBvbmUgdGhhdCB3b3JrcyB3aXRoIHRoZVxuICAgKiBicm93c2VyIG5hdmlnYXRpb24gQVBJKSwgd2Ugc2hvdWxkIHRoaW5rIGFib3V0IHdoZXRoZXIgdGhpcyBjb21wbGV4aXR5IHNob3VsZCBiZSBjYXJyaWVkIG92ZXIuXG4gICAqXG4gICAqIC0gZXh0cmFjdDogYHJhd1VybFRyZWVgIGlzIG5lZWRlZCBiZWNhdXNlIGBleHRyYWN0YCBtYXkgb25seSByZXR1cm4gcGFydFxuICAgKiBvZiB0aGUgbmF2aWdhdGlvbiBVUkwuIFRodXMsIGBjdXJyZW50VXJsVHJlZWAgbWF5IG9ubHkgcmVwcmVzZW50IF9wYXJ0XyBvZiB0aGUgYnJvd3NlciBVUkwuXG4gICAqIFdoZW4gYSBuYXZpZ2F0aW9uIGdldHMgY2FuY2VsbGVkIGFuZCB3ZSBuZWVkIHRvIHJlc2V0IHRoZSBVUkwgb3IgYSBuZXcgbmF2aWdhdGlvbiBvY2N1cnMsIHdlXG4gICAqIG5lZWQgdG8ga25vdyB0aGUgX3dob2xlXyBicm93c2VyIFVSTCwgbm90IGp1c3QgdGhlIHBhcnQgaGFuZGxlZCBieSBVcmxIYW5kbGluZ1N0cmF0ZWd5LlxuICAgKiAtIHNob3VsZFByb2Nlc3NVcmw6IFdoZW4gdGhpcyByZXR1cm5zIGBmYWxzZWAsIHRoZSByb3V0ZXIganVzdCBpZ25vcmVzIHRoZSBuYXZpZ2F0aW9uIGJ1dCBzdGlsbFxuICAgKiB1cGRhdGVzIHRoZSBgcmF3VXJsVHJlZWAgd2l0aCB0aGUgYXNzdW1wdGlvbiB0aGF0IHRoZSBuYXZpZ2F0aW9uIHdhcyBjYXVzZWQgYnkgdGhlIGxvY2F0aW9uXG4gICAqIGNoYW5nZSBsaXN0ZW5lciBkdWUgdG8gYSBVUkwgdXBkYXRlIGJ5IHRoZSBBbmd1bGFySlMgcm91dGVyLiBJbiB0aGlzIGNhc2UsIHdlIHN0aWxsIG5lZWQgdG9cbiAgICoga25vdyB3aGF0IHRoZSBicm93c2VyJ3MgVVJMIGlzIGZvciBmdXR1cmUgbmF2aWdhdGlvbnMuXG4gICAqXG4gICAqL1xuICByYXdVcmxUcmVlOiBVcmxUcmVlO1xuICAvKipcbiAgICogTWVhbnQgdG8gcmVwcmVzZW50IHRoZSBwYXJ0IG9mIHRoZSBicm93c2VyIHVybCB0aGF0IHRoZSBgUm91dGVyYCBpcyBzZXQgdXAgdG8gaGFuZGxlICh2aWEgdGhlXG4gICAqIGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCkuIFRoaXMgdmFsdWUgaXMgdXBkYXRlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgYnJvd3NlciB1cmwgaXMgdXBkYXRlZCAob3JcbiAgICogdGhlIGJyb3dzZXIgdXJsIHVwZGF0ZSBpcyBza2lwcGVkIHZpYSBgc2tpcExvY2F0aW9uQ2hhbmdlYCkuIFdpdGggdGhhdCwgbm90ZSB0aGF0XG4gICAqIGBicm93c2VyVXJsVHJlZWAgX21heSBub3RfIHJlZmxlY3QgdGhlIGFjdHVhbCBicm93c2VyIFVSTCBmb3IgdHdvIHJlYXNvbnM6XG4gICAqXG4gICAqIDEuIGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCBvbmx5IGhhbmRsZXMgcGFydCBvZiB0aGUgVVJMXG4gICAqIDIuIGBza2lwTG9jYXRpb25DaGFuZ2VgIGRvZXMgbm90IHVwZGF0ZSB0aGUgYnJvd3NlciB1cmwuXG4gICAqXG4gICAqIFNvIHRvIHJlaXRlcmF0ZSwgYGJyb3dzZXJVcmxUcmVlYCBvbmx5IHJlcHJlc2VudHMgdGhlIFJvdXRlcidzIGludGVybmFsIHVuZGVyc3RhbmRpbmcgb2YgdGhlXG4gICAqIGN1cnJlbnQgcm91dGUsIGVpdGhlciBiZWZvcmUgZ3VhcmRzIHdpdGggYHVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZWFnZXInYCBvciByaWdodCBiZWZvcmVcbiAgICogYWN0aXZhdGlvbiB3aXRoIGAnZGVmZXJyZWQnYC5cbiAgICpcbiAgICogVGhpcyBzaG91bGQgbWF0Y2ggdGhlIGBjdXJyZW50VXJsVHJlZWAgd2hlbiB0aGUgbmF2aWdhdGlvbiBzdWNjZWVkcy5cbiAgICogQGludGVybmFsXG4gICAqL1xuICBicm93c2VyVXJsVHJlZTogVXJsVHJlZTtcbiAgcHJpdmF0ZSBkaXNwb3NlZCA9IGZhbHNlO1xuXG4gIHByaXZhdGUgbG9jYXRpb25TdWJzY3JpcHRpb24/OiBTdWJzY3JpcHRpb25MaWtlO1xuICAvLyBUT0RPKGIvMjYwNzQ3MDgzKTogVGhpcyBzaG91bGQgbm90IGV4aXN0IGFuZCBuYXZpZ2F0aW9uSWQgc2hvdWxkIGJlIHByaXZhdGUgaW5cbiAgLy8gYE5hdmlnYXRpb25UcmFuc2l0aW9uc2BcbiAgcHJpdmF0ZSBnZXQgbmF2aWdhdGlvbklkKCkge1xuICAgIHJldHVybiB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5uYXZpZ2F0aW9uSWQ7XG4gIH1cblxuICAvKipcbiAgICogVGhlIGlkIG9mIHRoZSBjdXJyZW50bHkgYWN0aXZlIHBhZ2UgaW4gdGhlIHJvdXRlci5cbiAgICogVXBkYXRlZCB0byB0aGUgdHJhbnNpdGlvbidzIHRhcmdldCBpZCBvbiBhIHN1Y2Nlc3NmdWwgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogVGhpcyBpcyB1c2VkIHRvIHRyYWNrIHdoYXQgcGFnZSB0aGUgcm91dGVyIGxhc3QgYWN0aXZhdGVkLiBXaGVuIGFuIGF0dGVtcHRlZCBuYXZpZ2F0aW9uIGZhaWxzLFxuICAgKiB0aGUgcm91dGVyIGNhbiB0aGVuIHVzZSB0aGlzIHRvIGNvbXB1dGUgaG93IHRvIHJlc3RvcmUgdGhlIHN0YXRlIGJhY2sgdG8gdGhlIHByZXZpb3VzbHkgYWN0aXZlXG4gICAqIHBhZ2UuXG4gICAqL1xuICBwcml2YXRlIGN1cnJlbnRQYWdlSWQ6IG51bWJlciA9IDA7XG4gIC8qKlxuICAgKiBUaGUgybVyb3V0ZXJQYWdlSWQgb2Ygd2hhdGV2ZXIgcGFnZSBpcyBjdXJyZW50bHkgYWN0aXZlIGluIHRoZSBicm93c2VyIGhpc3RvcnkuIFRoaXMgaXNcbiAgICogaW1wb3J0YW50IGZvciBjb21wdXRpbmcgdGhlIHRhcmdldCBwYWdlIGlkIGZvciBuZXcgbmF2aWdhdGlvbnMgYmVjYXVzZSB3ZSBuZWVkIHRvIGVuc3VyZSBlYWNoXG4gICAqIHBhZ2UgaWQgaW4gdGhlIGJyb3dzZXIgaGlzdG9yeSBpcyAxIG1vcmUgdGhhbiB0aGUgcHJldmlvdXMgZW50cnkuXG4gICAqL1xuICBwcml2YXRlIGdldCBicm93c2VyUGFnZUlkKCk6IG51bWJlcnx1bmRlZmluZWQge1xuICAgIHJldHVybiAodGhpcy5sb2NhdGlvbi5nZXRTdGF0ZSgpIGFzIFJlc3RvcmVkU3RhdGUgfCBudWxsKT8uybVyb3V0ZXJQYWdlSWQ7XG4gIH1cbiAgcHJpdmF0ZSBjb25zb2xlID0gaW5qZWN0KENvbnNvbGUpO1xuICBwcml2YXRlIGlzTmdab25lRW5hYmxlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBBbiBldmVudCBzdHJlYW0gZm9yIHJvdXRpbmcgZXZlbnRzLlxuICAgKi9cbiAgcHVibGljIGdldCBldmVudHMoKTogT2JzZXJ2YWJsZTxFdmVudD4ge1xuICAgIC8vIFRPRE8oYXRzY290dCk6IFRoaXMgX3Nob3VsZF8gYmUgZXZlbnRzLmFzT2JzZXJ2YWJsZSgpLiBIb3dldmVyLCB0aGlzIGNoYW5nZSByZXF1aXJlcyBpbnRlcm5hbFxuICAgIC8vIGNsZWFudXA6IHRlc3RzIGFyZSBkb2luZyBgKHJvdXRlLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PikubmV4dCguLi4pYC4gVGhpcyBpc24ndFxuICAgIC8vIGFsbG93ZWQvc3VwcG9ydGVkIGJ1dCB3ZSBzdGlsbCBoYXZlIHRvIGZpeCB0aGVzZSBvciBmaWxlIGJ1Z3MgYWdhaW5zdCB0aGUgdGVhbXMgYmVmb3JlIG1ha2luZ1xuICAgIC8vIHRoZSBjaGFuZ2UuXG4gICAgcmV0dXJuIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmV2ZW50cztcbiAgfVxuICAvKipcbiAgICogVGhlIGN1cnJlbnQgc3RhdGUgb2Ygcm91dGluZyBpbiB0aGlzIE5nTW9kdWxlLlxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHJvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZTtcblxuICBwcml2YXRlIG9wdGlvbnMgPSBpbmplY3QoUk9VVEVSX0NPTkZJR1VSQVRJT04sIHtvcHRpb25hbDogdHJ1ZX0pIHx8IHt9O1xuXG4gIC8qKlxuICAgKiBBIGhhbmRsZXIgZm9yIG5hdmlnYXRpb24gZXJyb3JzIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIFN1YnNjcmliZSB0byB0aGUgYFJvdXRlcmAgZXZlbnRzIGFuZCB3YXRjaCBmb3IgYE5hdmlnYXRpb25FcnJvcmAgaW5zdGVhZC5cbiAgICogICBgcHJvdmlkZVJvdXRlcmAgaGFzIHRoZSBgd2l0aE5hdmlnYXRpb25FcnJvckhhbmRsZXJgIGZlYXR1cmUgdG8gbWFrZSB0aGlzIGVhc2llci5cbiAgICogQHNlZSBgd2l0aE5hdmlnYXRpb25FcnJvckhhbmRsZXJgXG4gICAqL1xuICBlcnJvckhhbmRsZXIgPSB0aGlzLm9wdGlvbnMuZXJyb3JIYW5kbGVyIHx8IGRlZmF1bHRFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIEEgaGFuZGxlciBmb3IgZXJyb3JzIHRocm93biBieSBgUm91dGVyLnBhcnNlVXJsKHVybClgXG4gICAqIHdoZW4gYHVybGAgY29udGFpbnMgYW4gaW52YWxpZCBjaGFyYWN0ZXIuXG4gICAqIFRoZSBtb3N0IGNvbW1vbiBjYXNlIGlzIGEgYCVgIHNpZ25cbiAgICogdGhhdCdzIG5vdCBlbmNvZGVkIGFuZCBpcyBub3QgcGFydCBvZiBhIHBlcmNlbnQgZW5jb2RlZCBzZXF1ZW5jZS5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgVVJJIHBhcnNpbmcgZXJyb3JzIHNob3VsZCBiZSBoYW5kbGVkIGluIHRoZSBgVXJsU2VyaWFsaXplcmAuXG4gICAqXG4gICAqIEBzZWUgYFJvdXRlck1vZHVsZWBcbiAgICovXG4gIG1hbGZvcm1lZFVyaUVycm9ySGFuZGxlciA9XG4gICAgICB0aGlzLm9wdGlvbnMubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyIHx8IGRlZmF1bHRNYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIFRydWUgaWYgYXQgbGVhc3Qgb25lIG5hdmlnYXRpb24gZXZlbnQgaGFzIG9jY3VycmVkLFxuICAgKiBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuICBuYXZpZ2F0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSBsYXN0U3VjY2Vzc2Z1bElkOiBudW1iZXIgPSAtMTtcblxuICAvKipcbiAgICogQSBzdHJhdGVneSBmb3IgZXh0cmFjdGluZyBhbmQgbWVyZ2luZyBVUkxzLlxuICAgKiBVc2VkIGZvciBBbmd1bGFySlMgdG8gQW5ndWxhciBtaWdyYXRpb25zLlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBDb25maWd1cmUgdXNpbmcgYHByb3ZpZGVyc2AgaW5zdGVhZDpcbiAgICogICBge3Byb3ZpZGU6IFVybEhhbmRsaW5nU3RyYXRlZ3ksIHVzZUNsYXNzOiBNeVN0cmF0ZWd5fWAuXG4gICAqL1xuICB1cmxIYW5kbGluZ1N0cmF0ZWd5ID0gaW5qZWN0KFVybEhhbmRsaW5nU3RyYXRlZ3kpO1xuXG4gIC8qKlxuICAgKiBBIHN0cmF0ZWd5IGZvciByZS11c2luZyByb3V0ZXMuXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIENvbmZpZ3VyZSB1c2luZyBgcHJvdmlkZXJzYCBpbnN0ZWFkOlxuICAgKiAgIGB7cHJvdmlkZTogUm91dGVSZXVzZVN0cmF0ZWd5LCB1c2VDbGFzczogTXlTdHJhdGVneX1gLlxuICAgKi9cbiAgcm91dGVSZXVzZVN0cmF0ZWd5ID0gaW5qZWN0KFJvdXRlUmV1c2VTdHJhdGVneSk7XG5cbiAgLyoqIFN0cmF0ZWd5IHVzZWQgdG8gY3JlYXRlIGEgVXJsVHJlZS4gKi9cbiAgcHJpdmF0ZSByZWFkb25seSB1cmxDcmVhdGlvblN0cmF0ZWd5ID0gaW5qZWN0KENyZWF0ZVVybFRyZWVTdHJhdGVneSk7XG5cbiAgLyoqXG4gICAqIEEgc3RyYXRlZ3kgZm9yIHNldHRpbmcgdGhlIHRpdGxlIGJhc2VkIG9uIHRoZSBgcm91dGVyU3RhdGVgLlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBDb25maWd1cmUgdXNpbmcgYHByb3ZpZGVyc2AgaW5zdGVhZDpcbiAgICogICBge3Byb3ZpZGU6IFRpdGxlU3RyYXRlZ3ksIHVzZUNsYXNzOiBNeVN0cmF0ZWd5fWAuXG4gICAqL1xuICB0aXRsZVN0cmF0ZWd5PzogVGl0bGVTdHJhdGVneSA9IGluamVjdChUaXRsZVN0cmF0ZWd5KTtcblxuICAvKipcbiAgICogSG93IHRvIGhhbmRsZSBhIG5hdmlnYXRpb24gcmVxdWVzdCB0byB0aGUgY3VycmVudCBVUkwuXG4gICAqXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIENvbmZpZ3VyZSB0aGlzIHRocm91Z2ggYHByb3ZpZGVSb3V0ZXJgIG9yIGBSb3V0ZXJNb2R1bGUuZm9yUm9vdGAgaW5zdGVhZC5cbiAgICogQHNlZSBgd2l0aFJvdXRlckNvbmZpZ2BcbiAgICogQHNlZSBgcHJvdmlkZVJvdXRlcmBcbiAgICogQHNlZSBgUm91dGVyTW9kdWxlYFxuICAgKi9cbiAgb25TYW1lVXJsTmF2aWdhdGlvbjogT25TYW1lVXJsTmF2aWdhdGlvbiA9IHRoaXMub3B0aW9ucy5vblNhbWVVcmxOYXZpZ2F0aW9uIHx8ICdpZ25vcmUnO1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gbWVyZ2UgcGFyYW1ldGVycywgZGF0YSwgcmVzb2x2ZWQgZGF0YSwgYW5kIHRpdGxlIGZyb20gcGFyZW50IHRvIGNoaWxkXG4gICAqIHJvdXRlcy4gT25lIG9mOlxuICAgKlxuICAgKiAtIGAnZW1wdHlPbmx5J2AgOiBJbmhlcml0IHBhcmVudCBwYXJhbWV0ZXJzLCBkYXRhLCBhbmQgcmVzb2x2ZWQgZGF0YVxuICAgKiBmb3IgcGF0aC1sZXNzIG9yIGNvbXBvbmVudC1sZXNzIHJvdXRlcy5cbiAgICogLSBgJ2Fsd2F5cydgIDogSW5oZXJpdCBwYXJlbnQgcGFyYW1ldGVycywgZGF0YSwgYW5kIHJlc29sdmVkIGRhdGFcbiAgICogZm9yIGFsbCBjaGlsZCByb3V0ZXMuXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIENvbmZpZ3VyZSB0aGlzIHRocm91Z2ggYHByb3ZpZGVSb3V0ZXJgIG9yIGBSb3V0ZXJNb2R1bGUuZm9yUm9vdGAgaW5zdGVhZC5cbiAgICogQHNlZSBgd2l0aFJvdXRlckNvbmZpZ2BcbiAgICogQHNlZSBgcHJvdmlkZVJvdXRlcmBcbiAgICogQHNlZSBgUm91dGVyTW9kdWxlYFxuICAgKi9cbiAgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogJ2VtcHR5T25seSd8J2Fsd2F5cycgPVxuICAgICAgdGhpcy5vcHRpb25zLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kgfHwgJ2VtcHR5T25seSc7XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hlbiB0aGUgcm91dGVyIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMLlxuICAgKiBCeSBkZWZhdWx0IChgXCJkZWZlcnJlZFwiYCksIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMIGFmdGVyIG5hdmlnYXRpb24gaGFzIGZpbmlzaGVkLlxuICAgKiBTZXQgdG8gYCdlYWdlcidgIHRvIHVwZGF0ZSB0aGUgYnJvd3NlciBVUkwgYXQgdGhlIGJlZ2lubmluZyBvZiBuYXZpZ2F0aW9uLlxuICAgKiBZb3UgY2FuIGNob29zZSB0byB1cGRhdGUgZWFybHkgc28gdGhhdCwgaWYgbmF2aWdhdGlvbiBmYWlscyxcbiAgICogeW91IGNhbiBzaG93IGFuIGVycm9yIG1lc3NhZ2Ugd2l0aCB0aGUgVVJMIHRoYXQgZmFpbGVkLlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBDb25maWd1cmUgdGhpcyB0aHJvdWdoIGBwcm92aWRlUm91dGVyYCBvciBgUm91dGVyTW9kdWxlLmZvclJvb3RgIGluc3RlYWQuXG4gICAqIEBzZWUgYHdpdGhSb3V0ZXJDb25maWdgXG4gICAqIEBzZWUgYHByb3ZpZGVSb3V0ZXJgXG4gICAqIEBzZWUgYFJvdXRlck1vZHVsZWBcbiAgICovXG4gIHVybFVwZGF0ZVN0cmF0ZWd5OiAnZGVmZXJyZWQnfCdlYWdlcicgPSB0aGlzLm9wdGlvbnMudXJsVXBkYXRlU3RyYXRlZ3kgfHwgJ2RlZmVycmVkJztcblxuICAvKipcbiAgICogQ29uZmlndXJlcyBob3cgdGhlIFJvdXRlciBhdHRlbXB0cyB0byByZXN0b3JlIHN0YXRlIHdoZW4gYSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGxlZC5cbiAgICpcbiAgICogJ3JlcGxhY2UnIC0gQWx3YXlzIHVzZXMgYGxvY2F0aW9uLnJlcGxhY2VTdGF0ZWAgdG8gc2V0IHRoZSBicm93c2VyIHN0YXRlIHRvIHRoZSBzdGF0ZSBvZiB0aGVcbiAgICogcm91dGVyIGJlZm9yZSB0aGUgbmF2aWdhdGlvbiBzdGFydGVkLiBUaGlzIG1lYW5zIHRoYXQgaWYgdGhlIFVSTCBvZiB0aGUgYnJvd3NlciBpcyB1cGRhdGVkXG4gICAqIF9iZWZvcmVfIHRoZSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGVkLCB0aGUgUm91dGVyIHdpbGwgc2ltcGx5IHJlcGxhY2UgdGhlIGl0ZW0gaW4gaGlzdG9yeSByYXRoZXJcbiAgICogdGhhbiB0cnlpbmcgdG8gcmVzdG9yZSB0byB0aGUgcHJldmlvdXMgbG9jYXRpb24gaW4gdGhlIHNlc3Npb24gaGlzdG9yeS4gVGhpcyBoYXBwZW5zIG1vc3RcbiAgICogZnJlcXVlbnRseSB3aXRoIGB1cmxVcGRhdGVTdHJhdGVneTogJ2VhZ2VyJ2AgYW5kIG5hdmlnYXRpb25zIHdpdGggdGhlIGJyb3dzZXIgYmFjay9mb3J3YXJkXG4gICAqIGJ1dHRvbnMuXG4gICAqXG4gICAqICdjb21wdXRlZCcgLSBXaWxsIGF0dGVtcHQgdG8gcmV0dXJuIHRvIHRoZSBzYW1lIGluZGV4IGluIHRoZSBzZXNzaW9uIGhpc3RvcnkgdGhhdCBjb3JyZXNwb25kc1xuICAgKiB0byB0aGUgQW5ndWxhciByb3V0ZSB3aGVuIHRoZSBuYXZpZ2F0aW9uIGdldHMgY2FuY2VsbGVkLiBGb3IgZXhhbXBsZSwgaWYgdGhlIGJyb3dzZXIgYmFja1xuICAgKiBidXR0b24gaXMgY2xpY2tlZCBhbmQgdGhlIG5hdmlnYXRpb24gaXMgY2FuY2VsbGVkLCB0aGUgUm91dGVyIHdpbGwgdHJpZ2dlciBhIGZvcndhcmQgbmF2aWdhdGlvblxuICAgKiBhbmQgdmljZSB2ZXJzYS5cbiAgICpcbiAgICogTm90ZTogdGhlICdjb21wdXRlZCcgb3B0aW9uIGlzIGluY29tcGF0aWJsZSB3aXRoIGFueSBgVXJsSGFuZGxpbmdTdHJhdGVneWAgd2hpY2ggb25seVxuICAgKiBoYW5kbGVzIGEgcG9ydGlvbiBvZiB0aGUgVVJMIGJlY2F1c2UgdGhlIGhpc3RvcnkgcmVzdG9yYXRpb24gbmF2aWdhdGVzIHRvIHRoZSBwcmV2aW91cyBwbGFjZSBpblxuICAgKiB0aGUgYnJvd3NlciBoaXN0b3J5IHJhdGhlciB0aGFuIHNpbXBseSByZXNldHRpbmcgYSBwb3J0aW9uIG9mIHRoZSBVUkwuXG4gICAqXG4gICAqIFRoZSBkZWZhdWx0IHZhbHVlIGlzIGByZXBsYWNlYC5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgQ29uZmlndXJlIHRoaXMgdGhyb3VnaCBgcHJvdmlkZVJvdXRlcmAgb3IgYFJvdXRlck1vZHVsZS5mb3JSb290YCBpbnN0ZWFkLlxuICAgKiBAc2VlIGB3aXRoUm91dGVyQ29uZmlnYFxuICAgKiBAc2VlIGBwcm92aWRlUm91dGVyYFxuICAgKiBAc2VlIGBSb3V0ZXJNb2R1bGVgXG4gICAqL1xuICBjYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uOiAncmVwbGFjZSd8J2NvbXB1dGVkJyA9XG4gICAgICB0aGlzLm9wdGlvbnMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiB8fCAncmVwbGFjZSc7XG5cbiAgY29uZmlnOiBSb3V0ZXMgPSBpbmplY3QoUk9VVEVTLCB7b3B0aW9uYWw6IHRydWV9KT8uZmxhdCgpID8/IFtdO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgbmF2aWdhdGlvblRyYW5zaXRpb25zID0gaW5qZWN0KE5hdmlnYXRpb25UcmFuc2l0aW9ucyk7XG4gIHByaXZhdGUgcmVhZG9ubHkgdXJsU2VyaWFsaXplciA9IGluamVjdChVcmxTZXJpYWxpemVyKTtcbiAgcHJpdmF0ZSByZWFkb25seSBsb2NhdGlvbiA9IGluamVjdChMb2NhdGlvbik7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5pc05nWm9uZUVuYWJsZWQgPSBpbmplY3QoTmdab25lKSBpbnN0YW5jZW9mIE5nWm9uZSAmJiBOZ1pvbmUuaXNJbkFuZ3VsYXJab25lKCk7XG5cbiAgICB0aGlzLnJlc2V0Q29uZmlnKHRoaXMuY29uZmlnKTtcbiAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gbmV3IFVybFRyZWUoKTtcbiAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLmN1cnJlbnRVcmxUcmVlO1xuICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0aGlzLmN1cnJlbnRVcmxUcmVlO1xuXG4gICAgdGhpcy5yb3V0ZXJTdGF0ZSA9IGNyZWF0ZUVtcHR5U3RhdGUodGhpcy5jdXJyZW50VXJsVHJlZSwgbnVsbCk7XG5cbiAgICB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5zZXR1cE5hdmlnYXRpb25zKHRoaXMpLnN1YnNjcmliZShcbiAgICAgICAgdCA9PiB7XG4gICAgICAgICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bElkID0gdC5pZDtcbiAgICAgICAgICB0aGlzLmN1cnJlbnRQYWdlSWQgPSB0LnRhcmdldFBhZ2VJZDtcbiAgICAgICAgfSxcbiAgICAgICAgZSA9PiB7XG4gICAgICAgICAgdGhpcy5jb25zb2xlLndhcm4oYFVuaGFuZGxlZCBOYXZpZ2F0aW9uIEVycm9yOiAke2V9YCk7XG4gICAgICAgIH0pO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICByZXNldFJvb3RDb21wb25lbnRUeXBlKHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT4pOiB2b2lkIHtcbiAgICAvLyBUT0RPOiB2c2F2a2luIHJvdXRlciA0LjAgc2hvdWxkIG1ha2UgdGhlIHJvb3QgY29tcG9uZW50IHNldCB0byBudWxsXG4gICAgLy8gdGhpcyB3aWxsIHNpbXBsaWZ5IHRoZSBsaWZlY3ljbGUgb2YgdGhlIHJvdXRlci5cbiAgICB0aGlzLnJvdXRlclN0YXRlLnJvb3QuY29tcG9uZW50ID0gcm9vdENvbXBvbmVudFR5cGU7XG4gICAgdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMucm9vdENvbXBvbmVudFR5cGUgPSByb290Q29tcG9uZW50VHlwZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHVwIHRoZSBsb2NhdGlvbiBjaGFuZ2UgbGlzdGVuZXIgYW5kIHBlcmZvcm1zIHRoZSBpbml0aWFsIG5hdmlnYXRpb24uXG4gICAqL1xuICBpbml0aWFsTmF2aWdhdGlvbigpOiB2b2lkIHtcbiAgICB0aGlzLnNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpO1xuICAgIGlmICghdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuaGFzUmVxdWVzdGVkTmF2aWdhdGlvbikge1xuICAgICAgY29uc3Qgc3RhdGUgPSB0aGlzLmxvY2F0aW9uLmdldFN0YXRlKCkgYXMgUmVzdG9yZWRTdGF0ZTtcbiAgICAgIHRoaXMubmF2aWdhdGVUb1N5bmNXaXRoQnJvd3Nlcih0aGlzLmxvY2F0aW9uLnBhdGgodHJ1ZSksIElNUEVSQVRJVkVfTkFWSUdBVElPTiwgc3RhdGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHVwIHRoZSBsb2NhdGlvbiBjaGFuZ2UgbGlzdGVuZXIuIFRoaXMgbGlzdGVuZXIgZGV0ZWN0cyBuYXZpZ2F0aW9ucyB0cmlnZ2VyZWQgZnJvbSBvdXRzaWRlXG4gICAqIHRoZSBSb3V0ZXIgKHRoZSBicm93c2VyIGJhY2svZm9yd2FyZCBidXR0b25zLCBmb3IgZXhhbXBsZSkgYW5kIHNjaGVkdWxlcyBhIGNvcnJlc3BvbmRpbmcgUm91dGVyXG4gICAqIG5hdmlnYXRpb24gc28gdGhhdCB0aGUgY29ycmVjdCBldmVudHMsIGd1YXJkcywgZXRjLiBhcmUgdHJpZ2dlcmVkLlxuICAgKi9cbiAgc2V0VXBMb2NhdGlvbkNoYW5nZUxpc3RlbmVyKCk6IHZvaWQge1xuICAgIC8vIERvbid0IG5lZWQgdG8gdXNlIFpvbmUud3JhcCBhbnkgbW9yZSwgYmVjYXVzZSB6b25lLmpzXG4gICAgLy8gYWxyZWFkeSBwYXRjaCBvblBvcFN0YXRlLCBzbyBsb2NhdGlvbiBjaGFuZ2UgY2FsbGJhY2sgd2lsbFxuICAgIC8vIHJ1biBpbnRvIG5nWm9uZVxuICAgIGlmICghdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbiA9IHRoaXMubG9jYXRpb24uc3Vic2NyaWJlKGV2ZW50ID0+IHtcbiAgICAgICAgY29uc3Qgc291cmNlID0gZXZlbnRbJ3R5cGUnXSA9PT0gJ3BvcHN0YXRlJyA/ICdwb3BzdGF0ZScgOiAnaGFzaGNoYW5nZSc7XG4gICAgICAgIGlmIChzb3VyY2UgPT09ICdwb3BzdGF0ZScpIHtcbiAgICAgICAgICAvLyBUaGUgYHNldFRpbWVvdXRgIHdhcyBhZGRlZCBpbiAjMTIxNjAgYW5kIGlzIGxpa2VseSB0byBzdXBwb3J0IEFuZ3VsYXIvQW5ndWxhckpTXG4gICAgICAgICAgLy8gaHlicmlkIGFwcHMuXG4gICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLm5hdmlnYXRlVG9TeW5jV2l0aEJyb3dzZXIoZXZlbnRbJ3VybCddISwgc291cmNlLCBldmVudC5zdGF0ZSk7XG4gICAgICAgICAgfSwgMCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTY2hlZHVsZXMgYSByb3V0ZXIgbmF2aWdhdGlvbiB0byBzeW5jaHJvbml6ZSBSb3V0ZXIgc3RhdGUgd2l0aCB0aGUgYnJvd3NlciBzdGF0ZS5cbiAgICpcbiAgICogVGhpcyBpcyBkb25lIGFzIGEgcmVzcG9uc2UgdG8gYSBwb3BzdGF0ZSBldmVudCBhbmQgdGhlIGluaXRpYWwgbmF2aWdhdGlvbi4gVGhlc2VcbiAgICogdHdvIHNjZW5hcmlvcyByZXByZXNlbnQgdGltZXMgd2hlbiB0aGUgYnJvd3NlciBVUkwvc3RhdGUgaGFzIGJlZW4gdXBkYXRlZCBhbmRcbiAgICogdGhlIFJvdXRlciBuZWVkcyB0byByZXNwb25kIHRvIGVuc3VyZSBpdHMgaW50ZXJuYWwgc3RhdGUgbWF0Y2hlcy5cbiAgICovXG4gIHByaXZhdGUgbmF2aWdhdGVUb1N5bmNXaXRoQnJvd3NlcihcbiAgICAgIHVybDogc3RyaW5nLCBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLCBzdGF0ZTogUmVzdG9yZWRTdGF0ZXx1bmRlZmluZWQpIHtcbiAgICBjb25zdCBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7cmVwbGFjZVVybDogdHJ1ZX07XG5cbiAgICAvLyBUT0RPOiByZXN0b3JlZFN0YXRlIHNob3VsZCBhbHdheXMgaW5jbHVkZSB0aGUgZW50aXJlIHN0YXRlLCByZWdhcmRsZXNzXG4gICAgLy8gb2YgbmF2aWdhdGlvbklkLiBUaGlzIHJlcXVpcmVzIGEgYnJlYWtpbmcgY2hhbmdlIHRvIHVwZGF0ZSB0aGUgdHlwZSBvblxuICAgIC8vIE5hdmlnYXRpb25TdGFydOKAmXMgcmVzdG9yZWRTdGF0ZSwgd2hpY2ggY3VycmVudGx5IHJlcXVpcmVzIG5hdmlnYXRpb25JZFxuICAgIC8vIHRvIGFsd2F5cyBiZSBwcmVzZW50LiBUaGUgUm91dGVyIHVzZWQgdG8gb25seSByZXN0b3JlIGhpc3Rvcnkgc3RhdGUgaWZcbiAgICAvLyBhIG5hdmlnYXRpb25JZCB3YXMgcHJlc2VudC5cblxuICAgIC8vIFRoZSBzdG9yZWQgbmF2aWdhdGlvbklkIGlzIHVzZWQgYnkgdGhlIFJvdXRlclNjcm9sbGVyIHRvIHJldHJpZXZlIHRoZSBzY3JvbGxcbiAgICAvLyBwb3NpdGlvbiBmb3IgdGhlIHBhZ2UuXG4gICAgY29uc3QgcmVzdG9yZWRTdGF0ZSA9IHN0YXRlPy5uYXZpZ2F0aW9uSWQgPyBzdGF0ZSA6IG51bGw7XG5cbiAgICAvLyBTZXBhcmF0ZSB0byBOYXZpZ2F0aW9uU3RhcnQucmVzdG9yZWRTdGF0ZSwgd2UgbXVzdCBhbHNvIHJlc3RvcmUgdGhlIHN0YXRlIHRvXG4gICAgLy8gaGlzdG9yeS5zdGF0ZSBhbmQgZ2VuZXJhdGUgYSBuZXcgbmF2aWdhdGlvbklkLCBzaW5jZSBpdCB3aWxsIGJlIG92ZXJ3cml0dGVuXG4gICAgaWYgKHN0YXRlKSB7XG4gICAgICBjb25zdCBzdGF0ZUNvcHkgPSB7Li4uc3RhdGV9IGFzIFBhcnRpYWw8UmVzdG9yZWRTdGF0ZT47XG4gICAgICBkZWxldGUgc3RhdGVDb3B5Lm5hdmlnYXRpb25JZDtcbiAgICAgIGRlbGV0ZSBzdGF0ZUNvcHkuybVyb3V0ZXJQYWdlSWQ7XG4gICAgICBpZiAoT2JqZWN0LmtleXMoc3RhdGVDb3B5KS5sZW5ndGggIT09IDApIHtcbiAgICAgICAgZXh0cmFzLnN0YXRlID0gc3RhdGVDb3B5O1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHVybFRyZWUgPSB0aGlzLnBhcnNlVXJsKHVybCk7XG4gICAgdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24odXJsVHJlZSwgc291cmNlLCByZXN0b3JlZFN0YXRlLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqIFRoZSBjdXJyZW50IFVSTC4gKi9cbiAgZ2V0IHVybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnNlcmlhbGl6ZVVybCh0aGlzLmN1cnJlbnRVcmxUcmVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IGBOYXZpZ2F0aW9uYCBvYmplY3Qgd2hlbiB0aGUgcm91dGVyIGlzIG5hdmlnYXRpbmcsXG4gICAqIGFuZCBgbnVsbGAgd2hlbiBpZGxlLlxuICAgKi9cbiAgZ2V0Q3VycmVudE5hdmlnYXRpb24oKTogTmF2aWdhdGlvbnxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuY3VycmVudE5hdmlnYXRpb247XG4gIH1cblxuICAvKipcbiAgICogUmVzZXRzIHRoZSByb3V0ZSBjb25maWd1cmF0aW9uIHVzZWQgZm9yIG5hdmlnYXRpb24gYW5kIGdlbmVyYXRpbmcgbGlua3MuXG4gICAqXG4gICAqIEBwYXJhbSBjb25maWcgVGhlIHJvdXRlIGFycmF5IGZvciB0aGUgbmV3IGNvbmZpZ3VyYXRpb24uXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIucmVzZXRDb25maWcoW1xuICAgKiAgeyBwYXRoOiAndGVhbS86aWQnLCBjb21wb25lbnQ6IFRlYW1DbXAsIGNoaWxkcmVuOiBbXG4gICAqICAgIHsgcGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wIH0sXG4gICAqICAgIHsgcGF0aDogJ3VzZXIvOm5hbWUnLCBjb21wb25lbnQ6IFVzZXJDbXAgfVxuICAgKiAgXX1cbiAgICogXSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcmVzZXRDb25maWcoY29uZmlnOiBSb3V0ZXMpOiB2b2lkIHtcbiAgICBOR19ERVZfTU9ERSAmJiB2YWxpZGF0ZUNvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gICAgdGhpcy5uYXZpZ2F0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSAtMTtcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5kaXNwb3NlKCk7XG4gIH1cblxuICAvKiogRGlzcG9zZXMgb2YgdGhlIHJvdXRlci4gKi9cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5jb21wbGV0ZSgpO1xuICAgIGlmICh0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICB0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB0aGlzLmRpc3Bvc2VkID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBlbmRzIFVSTCBzZWdtZW50cyB0byB0aGUgY3VycmVudCBVUkwgdHJlZSB0byBjcmVhdGUgYSBuZXcgVVJMIHRyZWUuXG4gICAqXG4gICAqIEBwYXJhbSBjb21tYW5kcyBBbiBhcnJheSBvZiBVUkwgZnJhZ21lbnRzIHdpdGggd2hpY2ggdG8gY29uc3RydWN0IHRoZSBuZXcgVVJMIHRyZWUuXG4gICAqIElmIHRoZSBwYXRoIGlzIHN0YXRpYywgY2FuIGJlIHRoZSBsaXRlcmFsIFVSTCBzdHJpbmcuIEZvciBhIGR5bmFtaWMgcGF0aCwgcGFzcyBhbiBhcnJheSBvZiBwYXRoXG4gICAqIHNlZ21lbnRzLCBmb2xsb3dlZCBieSB0aGUgcGFyYW1ldGVycyBmb3IgZWFjaCBzZWdtZW50LlxuICAgKiBUaGUgZnJhZ21lbnRzIGFyZSBhcHBsaWVkIHRvIHRoZSBjdXJyZW50IFVSTCB0cmVlIG9yIHRoZSBvbmUgcHJvdmlkZWQgIGluIHRoZSBgcmVsYXRpdmVUb2BcbiAgICogcHJvcGVydHkgb2YgdGhlIG9wdGlvbnMgb2JqZWN0LCBpZiBzdXBwbGllZC5cbiAgICogQHBhcmFtIG5hdmlnYXRpb25FeHRyYXMgT3B0aW9ucyB0aGF0IGNvbnRyb2wgdGhlIG5hdmlnYXRpb24gc3RyYXRlZ3kuXG4gICAqIEByZXR1cm5zIFRoZSBuZXcgVVJMIHRyZWUuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvdXNlci8xMVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzO2V4cGFuZD10cnVlL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7ZXhwYW5kOiB0cnVlfSwgJ3VzZXInLCAxMV0pO1xuICAgKlxuICAgKiAvLyB5b3UgY2FuIGNvbGxhcHNlIHN0YXRpYyBzZWdtZW50cyBsaWtlIHRoaXMgKHRoaXMgd29ya3Mgb25seSB3aXRoIHRoZSBmaXJzdCBwYXNzZWQtaW4gdmFsdWUpOlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtLzMzL3VzZXInLCB1c2VySWRdKTtcbiAgICpcbiAgICogLy8gSWYgdGhlIGZpcnN0IHNlZ21lbnQgY2FuIGNvbnRhaW4gc2xhc2hlcywgYW5kIHlvdSBkbyBub3Qgd2FudCB0aGUgcm91dGVyIHRvIHNwbGl0IGl0LFxuICAgKiAvLyB5b3UgY2FuIGRvIHRoZSBmb2xsb3dpbmc6XG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFt7c2VnbWVudFBhdGg6ICcvb25lL3R3byd9XSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMy8odXNlci8xMS8vcmlnaHQ6Y2hhdClcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6ICdjaGF0J319XSk7XG4gICAqXG4gICAqIC8vIHJlbW92ZSB0aGUgcmlnaHQgc2Vjb25kYXJ5IG5vZGVcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6IG51bGx9fV0pO1xuICAgKlxuICAgKiAvLyBhc3N1bWluZyB0aGUgY3VycmVudCB1cmwgaXMgYC90ZWFtLzMzL3VzZXIvMTFgIGFuZCB0aGUgcm91dGUgcG9pbnRzIHRvIGB1c2VyLzExYFxuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzExL2RldGFpbHNcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWydkZXRhaWxzJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzQ0L3VzZXIvMjJcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycuLi8uLi90ZWFtLzQ0L3VzZXIvMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIE5vdGUgdGhhdCBhIHZhbHVlIG9mIGBudWxsYCBvciBgdW5kZWZpbmVkYCBmb3IgYHJlbGF0aXZlVG9gIGluZGljYXRlcyB0aGF0IHRoZVxuICAgKiB0cmVlIHNob3VsZCBiZSBjcmVhdGVkIHJlbGF0aXZlIHRvIHRoZSByb290LlxuICAgKiBgYGBcbiAgICovXG4gIGNyZWF0ZVVybFRyZWUoY29tbWFuZHM6IGFueVtdLCBuYXZpZ2F0aW9uRXh0cmFzOiBVcmxDcmVhdGlvbk9wdGlvbnMgPSB7fSk6IFVybFRyZWUge1xuICAgIGNvbnN0IHtyZWxhdGl2ZVRvLCBxdWVyeVBhcmFtcywgZnJhZ21lbnQsIHF1ZXJ5UGFyYW1zSGFuZGxpbmcsIHByZXNlcnZlRnJhZ21lbnR9ID1cbiAgICAgICAgbmF2aWdhdGlvbkV4dHJhcztcbiAgICBjb25zdCBmID0gcHJlc2VydmVGcmFnbWVudCA/IHRoaXMuY3VycmVudFVybFRyZWUuZnJhZ21lbnQgOiBmcmFnbWVudDtcbiAgICBsZXQgcTogUGFyYW1zfG51bGwgPSBudWxsO1xuICAgIHN3aXRjaCAocXVlcnlQYXJhbXNIYW5kbGluZykge1xuICAgICAgY2FzZSAnbWVyZ2UnOlxuICAgICAgICBxID0gey4uLnRoaXMuY3VycmVudFVybFRyZWUucXVlcnlQYXJhbXMsIC4uLnF1ZXJ5UGFyYW1zfTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdwcmVzZXJ2ZSc6XG4gICAgICAgIHEgPSB0aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHEgPSBxdWVyeVBhcmFtcyB8fCBudWxsO1xuICAgIH1cbiAgICBpZiAocSAhPT0gbnVsbCkge1xuICAgICAgcSA9IHRoaXMucmVtb3ZlRW1wdHlQcm9wcyhxKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudXJsQ3JlYXRpb25TdHJhdGVneS5jcmVhdGVVcmxUcmVlKFxuICAgICAgICByZWxhdGl2ZVRvLCB0aGlzLnJvdXRlclN0YXRlLCB0aGlzLmN1cnJlbnRVcmxUcmVlLCBjb21tYW5kcywgcSwgZiA/PyBudWxsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZXMgdG8gYSB2aWV3IHVzaW5nIGFuIGFic29sdXRlIHJvdXRlIHBhdGguXG4gICAqXG4gICAqIEBwYXJhbSB1cmwgQW4gYWJzb2x1dGUgcGF0aCBmb3IgYSBkZWZpbmVkIHJvdXRlLiBUaGUgZnVuY3Rpb24gZG9lcyBub3QgYXBwbHkgYW55IGRlbHRhIHRvIHRoZVxuICAgKiAgICAgY3VycmVudCBVUkwuXG4gICAqIEBwYXJhbSBleHRyYXMgQW4gb2JqZWN0IGNvbnRhaW5pbmcgcHJvcGVydGllcyB0aGF0IG1vZGlmeSB0aGUgbmF2aWdhdGlvbiBzdHJhdGVneS5cbiAgICpcbiAgICogQHJldHVybnMgQSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gJ3RydWUnIHdoZW4gbmF2aWdhdGlvbiBzdWNjZWVkcyxcbiAgICogdG8gJ2ZhbHNlJyB3aGVuIG5hdmlnYXRpb24gZmFpbHMsIG9yIGlzIHJlamVjdGVkIG9uIGVycm9yLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBUaGUgZm9sbG93aW5nIGNhbGxzIHJlcXVlc3QgbmF2aWdhdGlvbiB0byBhbiBhYnNvbHV0ZSBwYXRoLlxuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLm5hdmlnYXRlQnlVcmwoXCIvdGVhbS8zMy91c2VyLzExXCIpO1xuICAgKlxuICAgKiAvLyBOYXZpZ2F0ZSB3aXRob3V0IHVwZGF0aW5nIHRoZSBVUkxcbiAgICogcm91dGVyLm5hdmlnYXRlQnlVcmwoXCIvdGVhbS8zMy91c2VyLzExXCIsIHsgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKVxuICAgKlxuICAgKi9cbiAgbmF2aWdhdGVCeVVybCh1cmw6IHN0cmluZ3xVcmxUcmVlLCBleHRyYXM6IE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMgPSB7XG4gICAgc2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZVxuICB9KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKE5HX0RFVl9NT0RFKSB7XG4gICAgICBpZiAodGhpcy5pc05nWm9uZUVuYWJsZWQgJiYgIU5nWm9uZS5pc0luQW5ndWxhclpvbmUoKSkge1xuICAgICAgICB0aGlzLmNvbnNvbGUud2FybihcbiAgICAgICAgICAgIGBOYXZpZ2F0aW9uIHRyaWdnZXJlZCBvdXRzaWRlIEFuZ3VsYXIgem9uZSwgZGlkIHlvdSBmb3JnZXQgdG8gY2FsbCAnbmdab25lLnJ1bigpJz9gKTtcbiAgICAgIH1cbiAgICAgIGlmICh1cmwgaW5zdGFuY2VvZiBVcmxUcmVlICYmIHVybC5fd2FybklmVXNlZEZvck5hdmlnYXRpb24pIHtcbiAgICAgICAgdGhpcy5jb25zb2xlLndhcm4odXJsLl93YXJuSWZVc2VkRm9yTmF2aWdhdGlvbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IGlzVXJsVHJlZSh1cmwpID8gdXJsIDogdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIGNvbnN0IG1lcmdlZFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodXJsVHJlZSwgdGhpcy5yYXdVcmxUcmVlKTtcblxuICAgIHJldHVybiB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbihtZXJnZWRUcmVlLCBJTVBFUkFUSVZFX05BVklHQVRJT04sIG51bGwsIGV4dHJhcyk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGUgYmFzZWQgb24gdGhlIHByb3ZpZGVkIGFycmF5IG9mIGNvbW1hbmRzIGFuZCBhIHN0YXJ0aW5nIHBvaW50LlxuICAgKiBJZiBubyBzdGFydGluZyByb3V0ZSBpcyBwcm92aWRlZCwgdGhlIG5hdmlnYXRpb24gaXMgYWJzb2x1dGUuXG4gICAqXG4gICAqIEBwYXJhbSBjb21tYW5kcyBBbiBhcnJheSBvZiBVUkwgZnJhZ21lbnRzIHdpdGggd2hpY2ggdG8gY29uc3RydWN0IHRoZSB0YXJnZXQgVVJMLlxuICAgKiBJZiB0aGUgcGF0aCBpcyBzdGF0aWMsIGNhbiBiZSB0aGUgbGl0ZXJhbCBVUkwgc3RyaW5nLiBGb3IgYSBkeW5hbWljIHBhdGgsIHBhc3MgYW4gYXJyYXkgb2YgcGF0aFxuICAgKiBzZWdtZW50cywgZm9sbG93ZWQgYnkgdGhlIHBhcmFtZXRlcnMgZm9yIGVhY2ggc2VnbWVudC5cbiAgICogVGhlIGZyYWdtZW50cyBhcmUgYXBwbGllZCB0byB0aGUgY3VycmVudCBVUkwgb3IgdGhlIG9uZSBwcm92aWRlZCAgaW4gdGhlIGByZWxhdGl2ZVRvYCBwcm9wZXJ0eVxuICAgKiBvZiB0aGUgb3B0aW9ucyBvYmplY3QsIGlmIHN1cHBsaWVkLlxuICAgKiBAcGFyYW0gZXh0cmFzIEFuIG9wdGlvbnMgb2JqZWN0IHRoYXQgZGV0ZXJtaW5lcyBob3cgdGhlIFVSTCBzaG91bGQgYmUgY29uc3RydWN0ZWQgb3JcbiAgICogICAgIGludGVycHJldGVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBBIFByb21pc2UgdGhhdCByZXNvbHZlcyB0byBgdHJ1ZWAgd2hlbiBuYXZpZ2F0aW9uIHN1Y2NlZWRzLCB0byBgZmFsc2VgIHdoZW4gbmF2aWdhdGlvblxuICAgKiAgICAgZmFpbHMsXG4gICAqIG9yIGlzIHJlamVjdGVkIG9uIGVycm9yLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBUaGUgZm9sbG93aW5nIGNhbGxzIHJlcXVlc3QgbmF2aWdhdGlvbiB0byBhIGR5bmFtaWMgcm91dGUgcGF0aCByZWxhdGl2ZSB0byB0aGUgY3VycmVudCBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIubmF2aWdhdGUoWyd0ZWFtJywgMzMsICd1c2VyJywgMTFdLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMLCBvdmVycmlkaW5nIHRoZSBkZWZhdWx0IGJlaGF2aW9yXG4gICAqIHJvdXRlci5uYXZpZ2F0ZShbJ3RlYW0nLCAzMywgJ3VzZXInLCAxMV0sIHtyZWxhdGl2ZVRvOiByb3V0ZSwgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpXG4gICAqXG4gICAqL1xuICBuYXZpZ2F0ZShjb21tYW5kczogYW55W10sIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHtza2lwTG9jYXRpb25DaGFuZ2U6IGZhbHNlfSk6XG4gICAgICBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB2YWxpZGF0ZUNvbW1hbmRzKGNvbW1hbmRzKTtcbiAgICByZXR1cm4gdGhpcy5uYXZpZ2F0ZUJ5VXJsKHRoaXMuY3JlYXRlVXJsVHJlZShjb21tYW5kcywgZXh0cmFzKSwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKiBTZXJpYWxpemVzIGEgYFVybFRyZWVgIGludG8gYSBzdHJpbmcgKi9cbiAgc2VyaWFsaXplVXJsKHVybDogVXJsVHJlZSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodXJsKTtcbiAgfVxuXG4gIC8qKiBQYXJzZXMgYSBzdHJpbmcgaW50byBhIGBVcmxUcmVlYCAqL1xuICBwYXJzZVVybCh1cmw6IHN0cmluZyk6IFVybFRyZWUge1xuICAgIGxldCB1cmxUcmVlOiBVcmxUcmVlO1xuICAgIHRyeSB7XG4gICAgICB1cmxUcmVlID0gdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKHVybCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdXJsVHJlZSA9IHRoaXMubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyKGUgYXMgVVJJRXJyb3IsIHRoaXMudXJsU2VyaWFsaXplciwgdXJsKTtcbiAgICB9XG4gICAgcmV0dXJuIHVybFRyZWU7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB3aGV0aGVyIHRoZSB1cmwgaXMgYWN0aXZhdGVkLlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZFxuICAgKiBVc2UgYElzQWN0aXZlTWF0Y2hPcHRpb25zYCBpbnN0ZWFkLlxuICAgKlxuICAgKiAtIFRoZSBlcXVpdmFsZW50IGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2AgZm9yIGB0cnVlYCBpc1xuICAgKiBge3BhdGhzOiAnZXhhY3QnLCBxdWVyeVBhcmFtczogJ2V4YWN0JywgZnJhZ21lbnQ6ICdpZ25vcmVkJywgbWF0cml4UGFyYW1zOiAnaWdub3JlZCd9YC5cbiAgICogLSBUaGUgZXF1aXZhbGVudCBmb3IgYGZhbHNlYCBpc1xuICAgKiBge3BhdGhzOiAnc3Vic2V0JywgcXVlcnlQYXJhbXM6ICdzdWJzZXQnLCBmcmFnbWVudDogJ2lnbm9yZWQnLCBtYXRyaXhQYXJhbXM6ICdpZ25vcmVkJ31gLlxuICAgKi9cbiAgaXNBY3RpdmUodXJsOiBzdHJpbmd8VXJsVHJlZSwgZXhhY3Q6IGJvb2xlYW4pOiBib29sZWFuO1xuICAvKipcbiAgICogUmV0dXJucyB3aGV0aGVyIHRoZSB1cmwgaXMgYWN0aXZhdGVkLlxuICAgKi9cbiAgaXNBY3RpdmUodXJsOiBzdHJpbmd8VXJsVHJlZSwgbWF0Y2hPcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IGJvb2xlYW47XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgaXNBY3RpdmUodXJsOiBzdHJpbmd8VXJsVHJlZSwgbWF0Y2hPcHRpb25zOiBib29sZWFufElzQWN0aXZlTWF0Y2hPcHRpb25zKTogYm9vbGVhbjtcbiAgaXNBY3RpdmUodXJsOiBzdHJpbmd8VXJsVHJlZSwgbWF0Y2hPcHRpb25zOiBib29sZWFufElzQWN0aXZlTWF0Y2hPcHRpb25zKTogYm9vbGVhbiB7XG4gICAgbGV0IG9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zO1xuICAgIGlmIChtYXRjaE9wdGlvbnMgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMgPSB7Li4uZXhhY3RNYXRjaE9wdGlvbnN9O1xuICAgIH0gZWxzZSBpZiAobWF0Y2hPcHRpb25zID09PSBmYWxzZSkge1xuICAgICAgb3B0aW9ucyA9IHsuLi5zdWJzZXRNYXRjaE9wdGlvbnN9O1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zID0gbWF0Y2hPcHRpb25zO1xuICAgIH1cbiAgICBpZiAoaXNVcmxUcmVlKHVybCkpIHtcbiAgICAgIHJldHVybiBjb250YWluc1RyZWUodGhpcy5jdXJyZW50VXJsVHJlZSwgdXJsLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIHJldHVybiBjb250YWluc1RyZWUodGhpcy5jdXJyZW50VXJsVHJlZSwgdXJsVHJlZSwgb3B0aW9ucyk7XG4gIH1cblxuICBwcml2YXRlIHJlbW92ZUVtcHR5UHJvcHMocGFyYW1zOiBQYXJhbXMpOiBQYXJhbXMge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhwYXJhbXMpLnJlZHVjZSgocmVzdWx0OiBQYXJhbXMsIGtleTogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZTogYW55ID0gcGFyYW1zW2tleV07XG4gICAgICBpZiAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXN1bHRba2V5XSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LCB7fSk7XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIHNjaGVkdWxlTmF2aWdhdGlvbihcbiAgICAgIHJhd1VybDogVXJsVHJlZSwgc291cmNlOiBOYXZpZ2F0aW9uVHJpZ2dlciwgcmVzdG9yZWRTdGF0ZTogUmVzdG9yZWRTdGF0ZXxudWxsLFxuICAgICAgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzLFxuICAgICAgcHJpb3JQcm9taXNlPzoge3Jlc29sdmU6IGFueSwgcmVqZWN0OiBhbnksIHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj59KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKHRoaXMuZGlzcG9zZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZmFsc2UpO1xuICAgIH1cblxuICAgIGxldCByZXNvbHZlOiBhbnk7XG4gICAgbGV0IHJlamVjdDogYW55O1xuICAgIGxldCBwcm9taXNlOiBQcm9taXNlPGJvb2xlYW4+O1xuICAgIGlmIChwcmlvclByb21pc2UpIHtcbiAgICAgIHJlc29sdmUgPSBwcmlvclByb21pc2UucmVzb2x2ZTtcbiAgICAgIHJlamVjdCA9IHByaW9yUHJvbWlzZS5yZWplY3Q7XG4gICAgICBwcm9taXNlID0gcHJpb3JQcm9taXNlLnByb21pc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHByb21pc2UgPSBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzLCByZWopID0+IHtcbiAgICAgICAgcmVzb2x2ZSA9IHJlcztcbiAgICAgICAgcmVqZWN0ID0gcmVqO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgbGV0IHRhcmdldFBhZ2VJZDogbnVtYmVyO1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdjb21wdXRlZCcpIHtcbiAgICAgIC8vIElmIHRoZSBgybVyb3V0ZXJQYWdlSWRgIGV4aXN0IGluIHRoZSBzdGF0ZSB0aGVuIGB0YXJnZXRwYWdlSWRgIHNob3VsZCBoYXZlIHRoZSB2YWx1ZSBvZlxuICAgICAgLy8gYMm1cm91dGVyUGFnZUlkYC4gVGhpcyBpcyB0aGUgY2FzZSBmb3Igc29tZXRoaW5nIGxpa2UgYSBwYWdlIHJlZnJlc2ggd2hlcmUgd2UgYXNzaWduIHRoZVxuICAgICAgLy8gdGFyZ2V0IGlkIHRvIHRoZSBwcmV2aW91c2x5IHNldCB2YWx1ZSBmb3IgdGhhdCBwYWdlLlxuICAgICAgaWYgKHJlc3RvcmVkU3RhdGUgJiYgcmVzdG9yZWRTdGF0ZS7JtXJvdXRlclBhZ2VJZCkge1xuICAgICAgICB0YXJnZXRQYWdlSWQgPSByZXN0b3JlZFN0YXRlLsm1cm91dGVyUGFnZUlkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgd2UncmUgcmVwbGFjaW5nIHRoZSBVUkwgb3IgZG9pbmcgYSBzaWxlbnQgbmF2aWdhdGlvbiwgd2UgZG8gbm90IHdhbnQgdG8gaW5jcmVtZW50IHRoZVxuICAgICAgICAvLyBwYWdlIGlkIGJlY2F1c2Ugd2UgYXJlbid0IHB1c2hpbmcgYSBuZXcgZW50cnkgdG8gaGlzdG9yeS5cbiAgICAgICAgaWYgKGV4dHJhcy5yZXBsYWNlVXJsIHx8IGV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgICB0YXJnZXRQYWdlSWQgPSB0aGlzLmJyb3dzZXJQYWdlSWQgPz8gMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0YXJnZXRQYWdlSWQgPSAodGhpcy5icm93c2VyUGFnZUlkID8/IDApICsgMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGlzIGlzIHVudXNlZCB3aGVuIGBjYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uYCBpcyBub3QgY29tcHV0ZWQuXG4gICAgICB0YXJnZXRQYWdlSWQgPSAwO1xuICAgIH1cblxuICAgIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmhhbmRsZU5hdmlnYXRpb25SZXF1ZXN0KHtcbiAgICAgIHRhcmdldFBhZ2VJZCxcbiAgICAgIHNvdXJjZSxcbiAgICAgIHJlc3RvcmVkU3RhdGUsXG4gICAgICBjdXJyZW50VXJsVHJlZTogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIGN1cnJlbnRSYXdVcmw6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICByYXdVcmwsXG4gICAgICBleHRyYXMsXG4gICAgICByZXNvbHZlLFxuICAgICAgcmVqZWN0LFxuICAgICAgcHJvbWlzZSxcbiAgICAgIGN1cnJlbnRTbmFwc2hvdDogdGhpcy5yb3V0ZXJTdGF0ZS5zbmFwc2hvdCxcbiAgICAgIGN1cnJlbnRSb3V0ZXJTdGF0ZTogdGhpcy5yb3V0ZXJTdGF0ZVxuICAgIH0pO1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoYXQgdGhlIGVycm9yIGlzIHByb3BhZ2F0ZWQgZXZlbiB0aG91Z2ggYHByb2Nlc3NOYXZpZ2F0aW9uc2AgY2F0Y2hcbiAgICAvLyBoYW5kbGVyIGRvZXMgbm90IHJldGhyb3dcbiAgICByZXR1cm4gcHJvbWlzZS5jYXRjaCgoZTogYW55KSA9PiB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZSk7XG4gICAgfSk7XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIHNldEJyb3dzZXJVcmwodXJsOiBVcmxUcmVlLCB0cmFuc2l0aW9uOiBOYXZpZ2F0aW9uVHJhbnNpdGlvbikge1xuICAgIGNvbnN0IHBhdGggPSB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHVybCk7XG4gICAgY29uc3Qgc3RhdGUgPSB7XG4gICAgICAuLi50cmFuc2l0aW9uLmV4dHJhcy5zdGF0ZSxcbiAgICAgIC4uLnRoaXMuZ2VuZXJhdGVOZ1JvdXRlclN0YXRlKHRyYW5zaXRpb24uaWQsIHRyYW5zaXRpb24udGFyZ2V0UGFnZUlkKVxuICAgIH07XG4gICAgaWYgKHRoaXMubG9jYXRpb24uaXNDdXJyZW50UGF0aEVxdWFsVG8ocGF0aCkgfHwgISF0cmFuc2l0aW9uLmV4dHJhcy5yZXBsYWNlVXJsKSB7XG4gICAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShwYXRoLCAnJywgc3RhdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxvY2F0aW9uLmdvKHBhdGgsICcnLCBzdGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBlcmZvcm1zIHRoZSBuZWNlc3Nhcnkgcm9sbGJhY2sgYWN0aW9uIHRvIHJlc3RvcmUgdGhlIGJyb3dzZXIgVVJMIHRvIHRoZVxuICAgKiBzdGF0ZSBiZWZvcmUgdGhlIHRyYW5zaXRpb24uXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgcmVzdG9yZUhpc3RvcnkodHJhbnNpdGlvbjogTmF2aWdhdGlvblRyYW5zaXRpb24sIHJlc3RvcmluZ0Zyb21DYXVnaHRFcnJvciA9IGZhbHNlKSB7XG4gICAgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ2NvbXB1dGVkJykge1xuICAgICAgY29uc3QgdGFyZ2V0UGFnZVBvc2l0aW9uID0gdGhpcy5jdXJyZW50UGFnZUlkIC0gdHJhbnNpdGlvbi50YXJnZXRQYWdlSWQ7XG4gICAgICAvLyBUaGUgbmF2aWdhdG9yIGNoYW5nZSB0aGUgbG9jYXRpb24gYmVmb3JlIHRyaWdnZXJlZCB0aGUgYnJvd3NlciBldmVudCxcbiAgICAgIC8vIHNvIHdlIG5lZWQgdG8gZ28gYmFjayB0byB0aGUgY3VycmVudCB1cmwgaWYgdGhlIG5hdmlnYXRpb24gaXMgY2FuY2VsZWQuXG4gICAgICAvLyBBbHNvLCB3aGVuIG5hdmlnYXRpb24gZ2V0cyBjYW5jZWxsZWQgd2hpbGUgdXNpbmcgdXJsIHVwZGF0ZSBzdHJhdGVneSBlYWdlciwgdGhlbiB3ZSBuZWVkIHRvXG4gICAgICAvLyBnbyBiYWNrLiBCZWNhdXNlLCB3aGVuIGB1cmxVcGRhdGVTdHJhdGVneWAgaXMgYGVhZ2VyYDsgYHNldEJyb3dzZXJVcmxgIG1ldGhvZCBpcyBjYWxsZWRcbiAgICAgIC8vIGJlZm9yZSBhbnkgdmVyaWZpY2F0aW9uLlxuICAgICAgY29uc3QgYnJvd3NlclVybFVwZGF0ZU9jY3VycmVkID1cbiAgICAgICAgICAodHJhbnNpdGlvbi5zb3VyY2UgPT09ICdwb3BzdGF0ZScgfHwgdGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJyB8fFxuICAgICAgICAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID09PSB0aGlzLmdldEN1cnJlbnROYXZpZ2F0aW9uKCk/LmZpbmFsVXJsKTtcbiAgICAgIGlmIChicm93c2VyVXJsVXBkYXRlT2NjdXJyZWQgJiYgdGFyZ2V0UGFnZVBvc2l0aW9uICE9PSAwKSB7XG4gICAgICAgIHRoaXMubG9jYXRpb24uaGlzdG9yeUdvKHRhcmdldFBhZ2VQb3NpdGlvbik7XG4gICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgIHRoaXMuY3VycmVudFVybFRyZWUgPT09IHRoaXMuZ2V0Q3VycmVudE5hdmlnYXRpb24oKT8uZmluYWxVcmwgJiZcbiAgICAgICAgICB0YXJnZXRQYWdlUG9zaXRpb24gPT09IDApIHtcbiAgICAgICAgLy8gV2UgZ290IHRvIHRoZSBhY3RpdmF0aW9uIHN0YWdlICh3aGVyZSBjdXJyZW50VXJsVHJlZSBpcyBzZXQgdG8gdGhlIG5hdmlnYXRpb24nc1xuICAgICAgICAvLyBmaW5hbFVybCksIGJ1dCB3ZSB3ZXJlbid0IG1vdmluZyBhbnl3aGVyZSBpbiBoaXN0b3J5IChza2lwTG9jYXRpb25DaGFuZ2Ugb3IgcmVwbGFjZVVybCkuXG4gICAgICAgIC8vIFdlIHN0aWxsIG5lZWQgdG8gcmVzZXQgdGhlIHJvdXRlciBzdGF0ZSBiYWNrIHRvIHdoYXQgaXQgd2FzIHdoZW4gdGhlIG5hdmlnYXRpb24gc3RhcnRlZC5cbiAgICAgICAgdGhpcy5yZXNldFN0YXRlKHRyYW5zaXRpb24pO1xuICAgICAgICAvLyBUT0RPKGF0c2NvdHQpOiByZXNldHRpbmcgdGhlIGBicm93c2VyVXJsVHJlZWAgc2hvdWxkIHJlYWxseSBiZSBkb25lIGluIGByZXNldFN0YXRlYC5cbiAgICAgICAgLy8gSW52ZXN0aWdhdGUgaWYgdGhpcyBjYW4gYmUgZG9uZSBieSBydW5uaW5nIFRHUC5cbiAgICAgICAgdGhpcy5icm93c2VyVXJsVHJlZSA9IHRyYW5zaXRpb24uY3VycmVudFVybFRyZWU7XG4gICAgICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBUaGUgYnJvd3NlciBVUkwgYW5kIHJvdXRlciBzdGF0ZSB3YXMgbm90IHVwZGF0ZWQgYmVmb3JlIHRoZSBuYXZpZ2F0aW9uIGNhbmNlbGxlZCBzb1xuICAgICAgICAvLyB0aGVyZSdzIG5vIHJlc3RvcmF0aW9uIG5lZWRlZC5cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ3JlcGxhY2UnKSB7XG4gICAgICAvLyBUT0RPKGF0c2NvdHQpOiBJdCBzZWVtcyBsaWtlIHdlIHNob3VsZCBfYWx3YXlzXyByZXNldCB0aGUgc3RhdGUgaGVyZS4gSXQgd291bGQgYmUgYSBuby1vcFxuICAgICAgLy8gZm9yIGBkZWZlcnJlZGAgbmF2aWdhdGlvbnMgdGhhdCBoYXZlbid0IGNoYW5nZSB0aGUgaW50ZXJuYWwgc3RhdGUgeWV0IGJlY2F1c2UgZ3VhcmRzXG4gICAgICAvLyByZWplY3QuIEZvciAnZWFnZXInIG5hdmlnYXRpb25zLCBpdCBzZWVtcyBsaWtlIHdlIGFsc28gcmVhbGx5IHNob3VsZCByZXNldCB0aGUgc3RhdGVcbiAgICAgIC8vIGJlY2F1c2UgdGhlIG5hdmlnYXRpb24gd2FzIGNhbmNlbGxlZC4gSW52ZXN0aWdhdGUgaWYgdGhpcyBjYW4gYmUgZG9uZSBieSBydW5uaW5nIFRHUC5cbiAgICAgIGlmIChyZXN0b3JpbmdGcm9tQ2F1Z2h0RXJyb3IpIHtcbiAgICAgICAgdGhpcy5yZXNldFN0YXRlKHRyYW5zaXRpb24pO1xuICAgICAgfVxuICAgICAgdGhpcy5yZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlc2V0U3RhdGUodDogTmF2aWdhdGlvblRyYW5zaXRpb24pOiB2b2lkIHtcbiAgICAodGhpcyBhcyB7cm91dGVyU3RhdGU6IFJvdXRlclN0YXRlfSkucm91dGVyU3RhdGUgPSB0LmN1cnJlbnRSb3V0ZXJTdGF0ZTtcbiAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gdC5jdXJyZW50VXJsVHJlZTtcbiAgICAvLyBOb3RlIGhlcmUgdGhhdCB3ZSB1c2UgdGhlIHVybEhhbmRsaW5nU3RyYXRlZ3kgdG8gZ2V0IHRoZSByZXNldCBgcmF3VXJsVHJlZWAgYmVjYXVzZSBpdCBtYXkgYmVcbiAgICAvLyBjb25maWd1cmVkIHRvIGhhbmRsZSBvbmx5IHBhcnQgb2YgdGhlIG5hdmlnYXRpb24gVVJMLiBUaGlzIG1lYW5zIHdlIHdvdWxkIG9ubHkgd2FudCB0byByZXNldFxuICAgIC8vIHRoZSBwYXJ0IG9mIHRoZSBuYXZpZ2F0aW9uIGhhbmRsZWQgYnkgdGhlIEFuZ3VsYXIgcm91dGVyIHJhdGhlciB0aGFuIHRoZSB3aG9sZSBVUkwuIEluXG4gICAgLy8gYWRkaXRpb24sIHRoZSBVUkxIYW5kbGluZ1N0cmF0ZWd5IG1heSBiZSBjb25maWd1cmVkIHRvIHNwZWNpZmljYWxseSBwcmVzZXJ2ZSBwYXJ0cyBvZiB0aGUgVVJMXG4gICAgLy8gd2hlbiBtZXJnaW5nLCBzdWNoIGFzIHRoZSBxdWVyeSBwYXJhbXMgc28gdGhleSBhcmUgbm90IGxvc3Qgb24gYSByZWZyZXNoLlxuICAgIHRoaXMucmF3VXJsVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB0LnJhd1VybCk7XG4gIH1cblxuICBwcml2YXRlIHJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpOiB2b2lkIHtcbiAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShcbiAgICAgICAgdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh0aGlzLnJhd1VybFRyZWUpLCAnJyxcbiAgICAgICAgdGhpcy5nZW5lcmF0ZU5nUm91dGVyU3RhdGUodGhpcy5sYXN0U3VjY2Vzc2Z1bElkLCB0aGlzLmN1cnJlbnRQYWdlSWQpKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2VuZXJhdGVOZ1JvdXRlclN0YXRlKG5hdmlnYXRpb25JZDogbnVtYmVyLCByb3V0ZXJQYWdlSWQ/OiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAnY29tcHV0ZWQnKSB7XG4gICAgICByZXR1cm4ge25hdmlnYXRpb25JZCwgybVyb3V0ZXJQYWdlSWQ6IHJvdXRlclBhZ2VJZH07XG4gICAgfVxuICAgIHJldHVybiB7bmF2aWdhdGlvbklkfTtcbiAgfVxufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUNvbW1hbmRzKGNvbW1hbmRzOiBzdHJpbmdbXSk6IHZvaWQge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbW1hbmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY21kID0gY29tbWFuZHNbaV07XG4gICAgaWYgKGNtZCA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuTlVMTElTSF9DT01NQU5ELFxuICAgICAgICAgIE5HX0RFVl9NT0RFICYmIGBUaGUgcmVxdWVzdGVkIHBhdGggY29udGFpbnMgJHtjbWR9IHNlZ21lbnQgYXQgaW5kZXggJHtpfWApO1xuICAgIH1cbiAgfVxufVxuIl19