/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { Compiler, inject, Injectable, Injector, NgZone, ɵConsole as Console, ɵRuntimeError as RuntimeError } from '@angular/core';
import { of } from 'rxjs';
import { createUrlTree } from './create_url_tree';
import { NavigationTransitions } from './navigation_transition';
import { TitleStrategy } from './page_title_strategy';
import { RouteReuseStrategy } from './route_reuse_strategy';
import { ROUTER_CONFIGURATION } from './router_config';
import { ROUTES } from './router_config_loader';
import { ChildrenOutletContexts } from './router_outlet_context';
import { createEmptyState } from './router_state';
import { UrlHandlingStrategy } from './url_handling_strategy';
import { containsTree, isUrlTree, UrlSerializer, UrlTree } from './url_tree';
import { flatten } from './utils/collection';
import { standardizeConfig, validateConfig } from './utils/config';
import * as i0 from "@angular/core";
import * as i1 from "./url_tree";
import * as i2 from "./router_outlet_context";
import * as i3 from "@angular/common";
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
export function assignExtraOptionsToRouter(opts, router) {
    if (opts.errorHandler) {
        router.errorHandler = opts.errorHandler;
    }
    if (opts.malformedUriErrorHandler) {
        router.malformedUriErrorHandler = opts.malformedUriErrorHandler;
    }
    if (opts.onSameUrlNavigation) {
        router.onSameUrlNavigation = opts.onSameUrlNavigation;
    }
    if (opts.paramsInheritanceStrategy) {
        router.paramsInheritanceStrategy = opts.paramsInheritanceStrategy;
    }
    if (opts.urlUpdateStrategy) {
        router.urlUpdateStrategy = opts.urlUpdateStrategy;
    }
    if (opts.canceledNavigationResolution) {
        router.canceledNavigationResolution = opts.canceledNavigationResolution;
    }
}
export function setupRouter() {
    const urlSerializer = inject(UrlSerializer);
    const contexts = inject(ChildrenOutletContexts);
    const location = inject(Location);
    const injector = inject(Injector);
    const compiler = inject(Compiler);
    const config = inject(ROUTES, { optional: true }) ?? [];
    const opts = inject(ROUTER_CONFIGURATION, { optional: true }) ?? {};
    const router = new Router(null, urlSerializer, contexts, location, injector, compiler, flatten(config));
    assignExtraOptionsToRouter(opts, router);
    return router;
}
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
    /**
     * Creates the router service.
     */
    // TODO: vsavkin make internal after the final is out.
    constructor(
    /** @internal */
    rootComponentType, urlSerializer, rootContexts, location, injector, compiler, config) {
        this.rootComponentType = rootComponentType;
        this.urlSerializer = urlSerializer;
        this.rootContexts = rootContexts;
        this.location = location;
        this.config = config;
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
        this.isNgZoneEnabled = false;
        /**
         * A handler for navigation errors in this NgModule.
         */
        this.errorHandler = defaultErrorHandler;
        /**
         * A handler for errors thrown by `Router.parseUrl(url)`
         * when `url` contains an invalid character.
         * The most common case is a `%` sign
         * that's not encoded and is not part of a percent encoded sequence.
         */
        this.malformedUriErrorHandler = defaultMalformedUriErrorHandler;
        /**
         * True if at least one navigation event has occurred,
         * false otherwise.
         */
        this.navigated = false;
        this.lastSuccessfulId = -1;
        /**
         * Hook that enables you to pause navigation after the preactivation phase.
         * Used by `RouterModule`.
         *
         * @internal
         */
        this.afterPreactivation = () => of(void 0);
        /**
         * A strategy for extracting and merging URLs.
         * Used for AngularJS to Angular migrations.
         */
        this.urlHandlingStrategy = inject(UrlHandlingStrategy);
        /**
         * A strategy for re-using routes.
         */
        this.routeReuseStrategy = inject(RouteReuseStrategy);
        /**
         * A strategy for setting the title based on the `routerState`.
         */
        this.titleStrategy = inject(TitleStrategy);
        /**
         * How to handle a navigation request to the current URL. One of:
         *
         * - `'ignore'` :  The router ignores the request.
         * - `'reload'` : The router reloads the URL. Use to implement a "refresh" feature.
         *
         * Note that this only configures whether the Route reprocesses the URL and triggers related
         * action and events like redirects, guards, and resolvers. By default, the router re-uses a
         * component instance when it re-navigates to the same component type without visiting a different
         * component first. This behavior is configured by the `RouteReuseStrategy`. In order to reload
         * routed components on same url navigation, you need to set `onSameUrlNavigation` to `'reload'`
         * _and_ provide a `RouteReuseStrategy` which returns `false` for `shouldReuseRoute`.
         */
        this.onSameUrlNavigation = 'ignore';
        /**
         * How to merge parameters, data, resolved data, and title from parent to child
         * routes. One of:
         *
         * - `'emptyOnly'` : Inherit parent parameters, data, and resolved data
         * for path-less or component-less routes.
         * - `'always'` : Inherit parent parameters, data, and resolved data
         * for all child routes.
         */
        this.paramsInheritanceStrategy = 'emptyOnly';
        /**
         * Determines when the router updates the browser URL.
         * By default (`"deferred"`), updates the browser URL after navigation has finished.
         * Set to `'eager'` to update the browser URL at the beginning of navigation.
         * You can choose to update early so that, if navigation fails,
         * you can show an error message with the URL that failed.
         */
        this.urlUpdateStrategy = 'deferred';
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
         */
        this.canceledNavigationResolution = 'replace';
        this.navigationTransitions = inject(NavigationTransitions);
        this.console = injector.get(Console);
        const ngZone = injector.get(NgZone);
        this.isNgZoneEnabled = ngZone instanceof NgZone && NgZone.isInAngularZone();
        this.resetConfig(config);
        this.currentUrlTree = new UrlTree();
        this.rawUrlTree = this.currentUrlTree;
        this.browserUrlTree = this.currentUrlTree;
        this.routerState = createEmptyState(this.currentUrlTree, this.rootComponentType);
        this.navigationTransitions.setupNavigations(this).subscribe(t => {
            this.lastSuccessfulId = t.id;
            this.currentPageId = t.targetPageId;
        }, e => {
            this.console.warn(`Unhandled Navigation Error: ${e}`);
        });
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
    /**
     * @internal
     * TODO: this should be removed once the constructor of the router made internal
     */
    resetRootComponentType(rootComponentType) {
        this.rootComponentType = rootComponentType;
        // TODO: vsavkin router 4.0 should make the root component set to null
        // this will simplify the lifecycle of the router.
        this.routerState.root.component = this.rootComponentType;
    }
    /**
     * Sets up the location change listener and performs the initial navigation.
     */
    initialNavigation() {
        this.setUpLocationChangeListener();
        if (!this.navigationTransitions.hasRequestedNavigation) {
            this.navigateByUrl(this.location.path(true), { replaceUrl: true });
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
                        const extras = { replaceUrl: true };
                        // TODO: restoredState should always include the entire state, regardless
                        // of navigationId. This requires a breaking change to update the type on
                        // NavigationStart’s restoredState, which currently requires navigationId
                        // to always be present. The Router used to only restore history state if
                        // a navigationId was present.
                        // The stored navigationId is used by the RouterScroller to retrieve the scroll
                        // position for the page.
                        const restoredState = event.state?.navigationId ? event.state : null;
                        // Separate to NavigationStart.restoredState, we must also restore the state to
                        // history.state and generate a new navigationId, since it will be overwritten
                        if (event.state) {
                            const stateCopy = { ...event.state };
                            delete stateCopy.navigationId;
                            delete stateCopy.ɵrouterPageId;
                            if (Object.keys(stateCopy).length !== 0) {
                                extras.state = stateCopy;
                            }
                        }
                        const urlTree = this.parseUrl(event['url']);
                        this.scheduleNavigation(urlTree, source, restoredState, extras);
                    }, 0);
                }
            });
        }
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
        const a = relativeTo || this.routerState.root;
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
        return createUrlTree(a, this.currentUrlTree, commands, q, f ?? null);
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
        return this.scheduleNavigation(mergedTree, 'imperative', null, extras);
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
            const isInitialPage = this.currentPageId === 0;
            if (isInitialPage) {
                restoredState = this.location.getState();
            }
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
Router.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.0.1+sha-6eb2f76", ngImport: i0, type: Router, deps: "invalid", target: i0.ɵɵFactoryTarget.Injectable });
Router.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.0.1+sha-6eb2f76", ngImport: i0, type: Router, providedIn: 'root', useFactory: setupRouter });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.0.1+sha-6eb2f76", ngImport: i0, type: Router, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                    useFactory: setupRouter,
                }]
        }], ctorParameters: function () { return [{ type: i0.Type }, { type: i1.UrlSerializer }, { type: i2.ChildrenOutletContexts }, { type: i3.Location }, { type: i0.Injector }, { type: i0.Compiler }, { type: undefined }]; } });
function validateCommands(commands) {
    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        if (cmd == null) {
            throw new RuntimeError(4008 /* RuntimeErrorCode.NULLISH_COMMAND */, NG_DEV_MODE && `The requested path contains ${cmd} segment at index ${i}`);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFRLFFBQVEsSUFBSSxPQUFPLEVBQUUsYUFBYSxJQUFJLFlBQVksRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2SSxPQUFPLEVBQThCLEVBQUUsRUFBbUIsTUFBTSxNQUFNLENBQUM7QUFFdkUsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBSWhELE9BQU8sRUFBcUQscUJBQXFCLEVBQW9DLE1BQU0seUJBQXlCLENBQUM7QUFDckosT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQ3BELE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBQzFELE9BQU8sRUFBNkIsb0JBQW9CLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUNqRixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDOUMsT0FBTyxFQUFDLHNCQUFzQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDL0QsT0FBTyxFQUFDLGdCQUFnQixFQUFjLE1BQU0sZ0JBQWdCLENBQUM7QUFFN0QsT0FBTyxFQUFDLG1CQUFtQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDNUQsT0FBTyxFQUFDLFlBQVksRUFBd0IsU0FBUyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDakcsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQzNDLE9BQU8sRUFBQyxpQkFBaUIsRUFBRSxj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VUFBVSxFQUFFLFdBQVc7aUJBQ3hCOztBQTZzQkQsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFrQjtJQUMxQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUN4QyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ2YsTUFBTSxJQUFJLFlBQVksOENBRWxCLFdBQVcsSUFBSSwrQkFBK0IsR0FBRyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNoRjtLQUNGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtDb21waWxlciwgaW5qZWN0LCBJbmplY3RhYmxlLCBJbmplY3RvciwgTmdab25lLCBUeXBlLCDJtUNvbnNvbGUgYXMgQ29uc29sZSwgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7QmVoYXZpb3JTdWJqZWN0LCBPYnNlcnZhYmxlLCBvZiwgU3Vic2NyaXB0aW9uTGlrZX0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7Y3JlYXRlVXJsVHJlZX0gZnJvbSAnLi9jcmVhdGVfdXJsX3RyZWUnO1xuaW1wb3J0IHtSdW50aW1lRXJyb3JDb2RlfSBmcm9tICcuL2Vycm9ycyc7XG5pbXBvcnQge0V2ZW50LCBOYXZpZ2F0aW9uVHJpZ2dlcn0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zLCBSb3V0ZXN9IGZyb20gJy4vbW9kZWxzJztcbmltcG9ydCB7TmF2aWdhdGlvbiwgTmF2aWdhdGlvbkV4dHJhcywgTmF2aWdhdGlvblRyYW5zaXRpb24sIE5hdmlnYXRpb25UcmFuc2l0aW9ucywgUmVzdG9yZWRTdGF0ZSwgVXJsQ3JlYXRpb25PcHRpb25zfSBmcm9tICcuL25hdmlnYXRpb25fdHJhbnNpdGlvbic7XG5pbXBvcnQge1RpdGxlU3RyYXRlZ3l9IGZyb20gJy4vcGFnZV90aXRsZV9zdHJhdGVneSc7XG5pbXBvcnQge1JvdXRlUmV1c2VTdHJhdGVneX0gZnJvbSAnLi9yb3V0ZV9yZXVzZV9zdHJhdGVneSc7XG5pbXBvcnQge0Vycm9ySGFuZGxlciwgRXh0cmFPcHRpb25zLCBST1VURVJfQ09ORklHVVJBVElPTn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnJztcbmltcG9ydCB7Uk9VVEVTfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0c30gZnJvbSAnLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtjcmVhdGVFbXB0eVN0YXRlLCBSb3V0ZXJTdGF0ZX0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQYXJhbXN9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7VXJsSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi91cmxfaGFuZGxpbmdfc3RyYXRlZ3knO1xuaW1wb3J0IHtjb250YWluc1RyZWUsIElzQWN0aXZlTWF0Y2hPcHRpb25zLCBpc1VybFRyZWUsIFVybFNlcmlhbGl6ZXIsIFVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtmbGF0dGVufSBmcm9tICcuL3V0aWxzL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtzdGFuZGFyZGl6ZUNvbmZpZywgdmFsaWRhdGVDb25maWd9IGZyb20gJy4vdXRpbHMvY29uZmlnJztcblxuXG5jb25zdCBOR19ERVZfTU9ERSA9IHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8ICEhbmdEZXZNb2RlO1xuXG5mdW5jdGlvbiBkZWZhdWx0RXJyb3JIYW5kbGVyKGVycm9yOiBhbnkpOiBhbnkge1xuICB0aHJvdyBlcnJvcjtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdE1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcihcbiAgICBlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gIHJldHVybiB1cmxTZXJpYWxpemVyLnBhcnNlKCcvJyk7XG59XG5cbi8qKlxuICogVGhlIGVxdWl2YWxlbnQgYElzQWN0aXZlTWF0Y2hPcHRpb25zYCBvcHRpb25zIGZvciBgUm91dGVyLmlzQWN0aXZlYCBpcyBjYWxsZWQgd2l0aCBgdHJ1ZWBcbiAqIChleGFjdCA9IHRydWUpLlxuICovXG5leHBvcnQgY29uc3QgZXhhY3RNYXRjaE9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zID0ge1xuICBwYXRoczogJ2V4YWN0JyxcbiAgZnJhZ21lbnQ6ICdpZ25vcmVkJyxcbiAgbWF0cml4UGFyYW1zOiAnaWdub3JlZCcsXG4gIHF1ZXJ5UGFyYW1zOiAnZXhhY3QnXG59O1xuXG4vKipcbiAqIFRoZSBlcXVpdmFsZW50IGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2Agb3B0aW9ucyBmb3IgYFJvdXRlci5pc0FjdGl2ZWAgaXMgY2FsbGVkIHdpdGggYGZhbHNlYFxuICogKGV4YWN0ID0gZmFsc2UpLlxuICovXG5leHBvcnQgY29uc3Qgc3Vic2V0TWF0Y2hPcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucyA9IHtcbiAgcGF0aHM6ICdzdWJzZXQnLFxuICBmcmFnbWVudDogJ2lnbm9yZWQnLFxuICBtYXRyaXhQYXJhbXM6ICdpZ25vcmVkJyxcbiAgcXVlcnlQYXJhbXM6ICdzdWJzZXQnXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gYXNzaWduRXh0cmFPcHRpb25zVG9Sb3V0ZXIob3B0czogRXh0cmFPcHRpb25zLCByb3V0ZXI6IFJvdXRlcik6IHZvaWQge1xuICBpZiAob3B0cy5lcnJvckhhbmRsZXIpIHtcbiAgICByb3V0ZXIuZXJyb3JIYW5kbGVyID0gb3B0cy5lcnJvckhhbmRsZXI7XG4gIH1cblxuICBpZiAob3B0cy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIpIHtcbiAgICByb3V0ZXIubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyID0gb3B0cy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI7XG4gIH1cblxuICBpZiAob3B0cy5vblNhbWVVcmxOYXZpZ2F0aW9uKSB7XG4gICAgcm91dGVyLm9uU2FtZVVybE5hdmlnYXRpb24gPSBvcHRzLm9uU2FtZVVybE5hdmlnYXRpb247XG4gIH1cblxuICBpZiAob3B0cy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5KSB7XG4gICAgcm91dGVyLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kgPSBvcHRzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k7XG4gIH1cblxuICBpZiAob3B0cy51cmxVcGRhdGVTdHJhdGVneSkge1xuICAgIHJvdXRlci51cmxVcGRhdGVTdHJhdGVneSA9IG9wdHMudXJsVXBkYXRlU3RyYXRlZ3k7XG4gIH1cblxuICBpZiAob3B0cy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uKSB7XG4gICAgcm91dGVyLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPSBvcHRzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb247XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwUm91dGVyKCkge1xuICBjb25zdCB1cmxTZXJpYWxpemVyID0gaW5qZWN0KFVybFNlcmlhbGl6ZXIpO1xuICBjb25zdCBjb250ZXh0cyA9IGluamVjdChDaGlsZHJlbk91dGxldENvbnRleHRzKTtcbiAgY29uc3QgbG9jYXRpb24gPSBpbmplY3QoTG9jYXRpb24pO1xuICBjb25zdCBpbmplY3RvciA9IGluamVjdChJbmplY3Rvcik7XG4gIGNvbnN0IGNvbXBpbGVyID0gaW5qZWN0KENvbXBpbGVyKTtcbiAgY29uc3QgY29uZmlnID0gaW5qZWN0KFJPVVRFUywge29wdGlvbmFsOiB0cnVlfSkgPz8gW107XG4gIGNvbnN0IG9wdHMgPSBpbmplY3QoUk9VVEVSX0NPTkZJR1VSQVRJT04sIHtvcHRpb25hbDogdHJ1ZX0pID8/IHt9O1xuICBjb25zdCByb3V0ZXIgPVxuICAgICAgbmV3IFJvdXRlcihudWxsLCB1cmxTZXJpYWxpemVyLCBjb250ZXh0cywgbG9jYXRpb24sIGluamVjdG9yLCBjb21waWxlciwgZmxhdHRlbihjb25maWcpKTtcblxuICBhc3NpZ25FeHRyYU9wdGlvbnNUb1JvdXRlcihvcHRzLCByb3V0ZXIpO1xuXG4gIHJldHVybiByb3V0ZXI7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQSBzZXJ2aWNlIHRoYXQgcHJvdmlkZXMgbmF2aWdhdGlvbiBhbW9uZyB2aWV3cyBhbmQgVVJMIG1hbmlwdWxhdGlvbiBjYXBhYmlsaXRpZXMuXG4gKlxuICogQHNlZSBgUm91dGVgLlxuICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBHdWlkZV0oZ3VpZGUvcm91dGVyKS5cbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSh7XG4gIHByb3ZpZGVkSW46ICdyb290JyxcbiAgdXNlRmFjdG9yeTogc2V0dXBSb3V0ZXIsXG59KVxuZXhwb3J0IGNsYXNzIFJvdXRlciB7XG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIHRoZSBhY3RpdmF0ZWQgYFVybFRyZWVgIHRoYXQgdGhlIGBSb3V0ZXJgIGlzIGNvbmZpZ3VyZWQgdG8gaGFuZGxlICh0aHJvdWdoXG4gICAqIGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCkuIFRoYXQgaXMsIGFmdGVyIHdlIGZpbmQgdGhlIHJvdXRlIGNvbmZpZyB0cmVlIHRoYXQgd2UncmUgZ29pbmcgdG9cbiAgICogYWN0aXZhdGUsIHJ1biBndWFyZHMsIGFuZCBhcmUganVzdCBhYm91dCB0byBhY3RpdmF0ZSB0aGUgcm91dGUsIHdlIHNldCB0aGUgY3VycmVudFVybFRyZWUuXG4gICAqXG4gICAqIFRoaXMgc2hvdWxkIG1hdGNoIHRoZSBgYnJvd3NlclVybFRyZWVgIHdoZW4gYSBuYXZpZ2F0aW9uIHN1Y2NlZWRzLiBJZiB0aGVcbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybGAgaXMgYGZhbHNlYCwgb25seSB0aGUgYGJyb3dzZXJVcmxUcmVlYCBpcyB1cGRhdGVkLlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGN1cnJlbnRVcmxUcmVlOiBVcmxUcmVlO1xuICAvKipcbiAgICogTWVhbnQgdG8gcmVwcmVzZW50IHRoZSBlbnRpcmUgYnJvd3NlciB1cmwgYWZ0ZXIgYSBzdWNjZXNzZnVsIG5hdmlnYXRpb24uIEluIHRoZSBsaWZlIG9mIGFcbiAgICogbmF2aWdhdGlvbiB0cmFuc2l0aW9uOlxuICAgKiAxLiBUaGUgcmF3VXJsIHJlcHJlc2VudHMgdGhlIGZ1bGwgVVJMIHRoYXQncyBiZWluZyBuYXZpZ2F0ZWQgdG9cbiAgICogMi4gV2UgYXBwbHkgcmVkaXJlY3RzLCB3aGljaCBtaWdodCBvbmx5IGFwcGx5IHRvIF9wYXJ0XyBvZiB0aGUgVVJMIChkdWUgdG9cbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3lgKS5cbiAgICogMy4gUmlnaHQgYmVmb3JlIGFjdGl2YXRpb24gKGJlY2F1c2Ugd2UgYXNzdW1lIGFjdGl2YXRpb24gd2lsbCBzdWNjZWVkKSwgd2UgdXBkYXRlIHRoZVxuICAgKiByYXdVcmxUcmVlIHRvIGJlIGEgY29tYmluYXRpb24gb2YgdGhlIHVybEFmdGVyUmVkaXJlY3RzIChhZ2FpbiwgdGhpcyBtaWdodCBvbmx5IGFwcGx5IHRvIHBhcnRcbiAgICogb2YgdGhlIGluaXRpYWwgdXJsKSBhbmQgdGhlIHJhd1VybCBvZiB0aGUgdHJhbnNpdGlvbiAod2hpY2ggd2FzIHRoZSBvcmlnaW5hbCBuYXZpZ2F0aW9uIHVybCBpblxuICAgKiBpdHMgZnVsbCBmb3JtKS5cbiAgICogQGludGVybmFsXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGlzIGlzIF9vbmx5XyBoZXJlIHRvIHN1cHBvcnQgYFVybEhhbmRsaW5nU3RyYXRlZ3kuZXh0cmFjdGAgYW5kXG4gICAqIGBVcmxIYW5kbGluZ1N0cmF0ZWd5LnNob3VsZFByb2Nlc3NVcmxgLiBJZiB0aG9zZSBkaWRuJ3QgZXhpc3QsIHdlIGNvdWxkIGdldCBieSB3aXRoXG4gICAqIGBjdXJyZW50VXJsVHJlZWAgYWxvbmUuIElmIGEgbmV3IFJvdXRlciB3ZXJlIHRvIGJlIHByb3ZpZGVkIChpLmUuIG9uZSB0aGF0IHdvcmtzIHdpdGggdGhlXG4gICAqIGJyb3dzZXIgbmF2aWdhdGlvbiBBUEkpLCB3ZSBzaG91bGQgdGhpbmsgYWJvdXQgd2hldGhlciB0aGlzIGNvbXBsZXhpdHkgc2hvdWxkIGJlIGNhcnJpZWQgb3Zlci5cbiAgICpcbiAgICogLSBleHRyYWN0OiBgcmF3VXJsVHJlZWAgaXMgbmVlZGVkIGJlY2F1c2UgYGV4dHJhY3RgIG1heSBvbmx5IHJldHVybiBwYXJ0XG4gICAqIG9mIHRoZSBuYXZpZ2F0aW9uIFVSTC4gVGh1cywgYGN1cnJlbnRVcmxUcmVlYCBtYXkgb25seSByZXByZXNlbnQgX3BhcnRfIG9mIHRoZSBicm93c2VyIFVSTC5cbiAgICogV2hlbiBhIG5hdmlnYXRpb24gZ2V0cyBjYW5jZWxsZWQgYW5kIHdlIG5lZWQgdG8gcmVzZXQgdGhlIFVSTCBvciBhIG5ldyBuYXZpZ2F0aW9uIG9jY3Vycywgd2VcbiAgICogbmVlZCB0byBrbm93IHRoZSBfd2hvbGVfIGJyb3dzZXIgVVJMLCBub3QganVzdCB0aGUgcGFydCBoYW5kbGVkIGJ5IFVybEhhbmRsaW5nU3RyYXRlZ3kuXG4gICAqIC0gc2hvdWxkUHJvY2Vzc1VybDogV2hlbiB0aGlzIHJldHVybnMgYGZhbHNlYCwgdGhlIHJvdXRlciBqdXN0IGlnbm9yZXMgdGhlIG5hdmlnYXRpb24gYnV0IHN0aWxsXG4gICAqIHVwZGF0ZXMgdGhlIGByYXdVcmxUcmVlYCB3aXRoIHRoZSBhc3N1bXB0aW9uIHRoYXQgdGhlIG5hdmlnYXRpb24gd2FzIGNhdXNlZCBieSB0aGUgbG9jYXRpb25cbiAgICogY2hhbmdlIGxpc3RlbmVyIGR1ZSB0byBhIFVSTCB1cGRhdGUgYnkgdGhlIEFuZ3VsYXJKUyByb3V0ZXIuIEluIHRoaXMgY2FzZSwgd2Ugc3RpbGwgbmVlZCB0b1xuICAgKiBrbm93IHdoYXQgdGhlIGJyb3dzZXIncyBVUkwgaXMgZm9yIGZ1dHVyZSBuYXZpZ2F0aW9ucy5cbiAgICpcbiAgICovXG4gIHJhd1VybFRyZWU6IFVybFRyZWU7XG4gIC8qKlxuICAgKiBNZWFudCB0byByZXByZXNlbnQgdGhlIHBhcnQgb2YgdGhlIGJyb3dzZXIgdXJsIHRoYXQgdGhlIGBSb3V0ZXJgIGlzIHNldCB1cCB0byBoYW5kbGUgKHZpYSB0aGVcbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3lgKS4gVGhpcyB2YWx1ZSBpcyB1cGRhdGVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBicm93c2VyIHVybCBpcyB1cGRhdGVkIChvclxuICAgKiB0aGUgYnJvd3NlciB1cmwgdXBkYXRlIGlzIHNraXBwZWQgdmlhIGBza2lwTG9jYXRpb25DaGFuZ2VgKS4gV2l0aCB0aGF0LCBub3RlIHRoYXRcbiAgICogYGJyb3dzZXJVcmxUcmVlYCBfbWF5IG5vdF8gcmVmbGVjdCB0aGUgYWN0dWFsIGJyb3dzZXIgVVJMIGZvciB0d28gcmVhc29uczpcbiAgICpcbiAgICogMS4gYFVybEhhbmRsaW5nU3RyYXRlZ3lgIG9ubHkgaGFuZGxlcyBwYXJ0IG9mIHRoZSBVUkxcbiAgICogMi4gYHNraXBMb2NhdGlvbkNoYW5nZWAgZG9lcyBub3QgdXBkYXRlIHRoZSBicm93c2VyIHVybC5cbiAgICpcbiAgICogU28gdG8gcmVpdGVyYXRlLCBgYnJvd3NlclVybFRyZWVgIG9ubHkgcmVwcmVzZW50cyB0aGUgUm91dGVyJ3MgaW50ZXJuYWwgdW5kZXJzdGFuZGluZyBvZiB0aGVcbiAgICogY3VycmVudCByb3V0ZSwgZWl0aGVyIGJlZm9yZSBndWFyZHMgd2l0aCBgdXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcidgIG9yIHJpZ2h0IGJlZm9yZVxuICAgKiBhY3RpdmF0aW9uIHdpdGggYCdkZWZlcnJlZCdgLlxuICAgKlxuICAgKiBUaGlzIHNob3VsZCBtYXRjaCB0aGUgYGN1cnJlbnRVcmxUcmVlYCB3aGVuIHRoZSBuYXZpZ2F0aW9uIHN1Y2NlZWRzLlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGJyb3dzZXJVcmxUcmVlOiBVcmxUcmVlO1xuICBwcml2YXRlIGRpc3Bvc2VkID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBsb2NhdGlvblN1YnNjcmlwdGlvbj86IFN1YnNjcmlwdGlvbkxpa2U7XG5cbiAgLyoqXG4gICAqIFRoZSBpZCBvZiB0aGUgY3VycmVudGx5IGFjdGl2ZSBwYWdlIGluIHRoZSByb3V0ZXIuXG4gICAqIFVwZGF0ZWQgdG8gdGhlIHRyYW5zaXRpb24ncyB0YXJnZXQgaWQgb24gYSBzdWNjZXNzZnVsIG5hdmlnYXRpb24uXG4gICAqXG4gICAqIFRoaXMgaXMgdXNlZCB0byB0cmFjayB3aGF0IHBhZ2UgdGhlIHJvdXRlciBsYXN0IGFjdGl2YXRlZC4gV2hlbiBhbiBhdHRlbXB0ZWQgbmF2aWdhdGlvbiBmYWlscyxcbiAgICogdGhlIHJvdXRlciBjYW4gdGhlbiB1c2UgdGhpcyB0byBjb21wdXRlIGhvdyB0byByZXN0b3JlIHRoZSBzdGF0ZSBiYWNrIHRvIHRoZSBwcmV2aW91c2x5IGFjdGl2ZVxuICAgKiBwYWdlLlxuICAgKi9cbiAgcHJpdmF0ZSBjdXJyZW50UGFnZUlkOiBudW1iZXIgPSAwO1xuICAvKipcbiAgICogVGhlIMm1cm91dGVyUGFnZUlkIG9mIHdoYXRldmVyIHBhZ2UgaXMgY3VycmVudGx5IGFjdGl2ZSBpbiB0aGUgYnJvd3NlciBoaXN0b3J5LiBUaGlzIGlzXG4gICAqIGltcG9ydGFudCBmb3IgY29tcHV0aW5nIHRoZSB0YXJnZXQgcGFnZSBpZCBmb3IgbmV3IG5hdmlnYXRpb25zIGJlY2F1c2Ugd2UgbmVlZCB0byBlbnN1cmUgZWFjaFxuICAgKiBwYWdlIGlkIGluIHRoZSBicm93c2VyIGhpc3RvcnkgaXMgMSBtb3JlIHRoYW4gdGhlIHByZXZpb3VzIGVudHJ5LlxuICAgKi9cbiAgcHJpdmF0ZSBnZXQgYnJvd3NlclBhZ2VJZCgpOiBudW1iZXJ8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gKHRoaXMubG9jYXRpb24uZ2V0U3RhdGUoKSBhcyBSZXN0b3JlZFN0YXRlIHwgbnVsbCk/Lsm1cm91dGVyUGFnZUlkO1xuICB9XG4gIHByaXZhdGUgY29uc29sZTogQ29uc29sZTtcbiAgcHJpdmF0ZSBpc05nWm9uZUVuYWJsZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAvKipcbiAgICogQW4gZXZlbnQgc3RyZWFtIGZvciByb3V0aW5nIGV2ZW50cy5cbiAgICovXG4gIHB1YmxpYyBnZXQgZXZlbnRzKCk6IE9ic2VydmFibGU8RXZlbnQ+IHtcbiAgICAvLyBUT0RPKGF0c2NvdHQpOiBUaGlzIF9zaG91bGRfIGJlIGV2ZW50cy5hc09ic2VydmFibGUoKS4gSG93ZXZlciwgdGhpcyBjaGFuZ2UgcmVxdWlyZXMgaW50ZXJuYWxcbiAgICAvLyBjbGVhbnVwOiB0ZXN0cyBhcmUgZG9pbmcgYChyb3V0ZS5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pLm5leHQoLi4uKWAuIFRoaXMgaXNuJ3RcbiAgICAvLyBhbGxvd2VkL3N1cHBvcnRlZCBidXQgd2Ugc3RpbGwgaGF2ZSB0byBmaXggdGhlc2Ugb3IgZmlsZSBidWdzIGFnYWluc3QgdGhlIHRlYW1zIGJlZm9yZSBtYWtpbmdcbiAgICAvLyB0aGUgY2hhbmdlLlxuICAgIHJldHVybiB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5ldmVudHM7XG4gIH1cbiAgLyoqXG4gICAqIFRoZSBjdXJyZW50IHN0YXRlIG9mIHJvdXRpbmcgaW4gdGhpcyBOZ01vZHVsZS5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSByb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGU7XG5cbiAgLyoqXG4gICAqIEEgaGFuZGxlciBmb3IgbmF2aWdhdGlvbiBlcnJvcnMgaW4gdGhpcyBOZ01vZHVsZS5cbiAgICovXG4gIGVycm9ySGFuZGxlcjogRXJyb3JIYW5kbGVyID0gZGVmYXVsdEVycm9ySGFuZGxlcjtcblxuICAvKipcbiAgICogQSBoYW5kbGVyIGZvciBlcnJvcnMgdGhyb3duIGJ5IGBSb3V0ZXIucGFyc2VVcmwodXJsKWBcbiAgICogd2hlbiBgdXJsYCBjb250YWlucyBhbiBpbnZhbGlkIGNoYXJhY3Rlci5cbiAgICogVGhlIG1vc3QgY29tbW9uIGNhc2UgaXMgYSBgJWAgc2lnblxuICAgKiB0aGF0J3Mgbm90IGVuY29kZWQgYW5kIGlzIG5vdCBwYXJ0IG9mIGEgcGVyY2VudCBlbmNvZGVkIHNlcXVlbmNlLlxuICAgKi9cbiAgbWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyOlxuICAgICAgKGVycm9yOiBVUklFcnJvciwgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICAgICB1cmw6IHN0cmluZykgPT4gVXJsVHJlZSA9IGRlZmF1bHRNYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIFRydWUgaWYgYXQgbGVhc3Qgb25lIG5hdmlnYXRpb24gZXZlbnQgaGFzIG9jY3VycmVkLFxuICAgKiBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuICBuYXZpZ2F0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSBsYXN0U3VjY2Vzc2Z1bElkOiBudW1iZXIgPSAtMTtcblxuICAvKipcbiAgICogSG9vayB0aGF0IGVuYWJsZXMgeW91IHRvIHBhdXNlIG5hdmlnYXRpb24gYWZ0ZXIgdGhlIHByZWFjdGl2YXRpb24gcGhhc2UuXG4gICAqIFVzZWQgYnkgYFJvdXRlck1vZHVsZWAuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgYWZ0ZXJQcmVhY3RpdmF0aW9uOiAoKSA9PiBPYnNlcnZhYmxlPHZvaWQ+ID0gKCkgPT4gb2Yodm9pZCAwKTtcblxuICAvKipcbiAgICogQSBzdHJhdGVneSBmb3IgZXh0cmFjdGluZyBhbmQgbWVyZ2luZyBVUkxzLlxuICAgKiBVc2VkIGZvciBBbmd1bGFySlMgdG8gQW5ndWxhciBtaWdyYXRpb25zLlxuICAgKi9cbiAgdXJsSGFuZGxpbmdTdHJhdGVneSA9IGluamVjdChVcmxIYW5kbGluZ1N0cmF0ZWd5KTtcblxuICAvKipcbiAgICogQSBzdHJhdGVneSBmb3IgcmUtdXNpbmcgcm91dGVzLlxuICAgKi9cbiAgcm91dGVSZXVzZVN0cmF0ZWd5ID0gaW5qZWN0KFJvdXRlUmV1c2VTdHJhdGVneSk7XG5cbiAgLyoqXG4gICAqIEEgc3RyYXRlZ3kgZm9yIHNldHRpbmcgdGhlIHRpdGxlIGJhc2VkIG9uIHRoZSBgcm91dGVyU3RhdGVgLlxuICAgKi9cbiAgdGl0bGVTdHJhdGVneT86IFRpdGxlU3RyYXRlZ3kgPSBpbmplY3QoVGl0bGVTdHJhdGVneSk7XG5cbiAgLyoqXG4gICAqIEhvdyB0byBoYW5kbGUgYSBuYXZpZ2F0aW9uIHJlcXVlc3QgdG8gdGhlIGN1cnJlbnQgVVJMLiBPbmUgb2Y6XG4gICAqXG4gICAqIC0gYCdpZ25vcmUnYCA6ICBUaGUgcm91dGVyIGlnbm9yZXMgdGhlIHJlcXVlc3QuXG4gICAqIC0gYCdyZWxvYWQnYCA6IFRoZSByb3V0ZXIgcmVsb2FkcyB0aGUgVVJMLiBVc2UgdG8gaW1wbGVtZW50IGEgXCJyZWZyZXNoXCIgZmVhdHVyZS5cbiAgICpcbiAgICogTm90ZSB0aGF0IHRoaXMgb25seSBjb25maWd1cmVzIHdoZXRoZXIgdGhlIFJvdXRlIHJlcHJvY2Vzc2VzIHRoZSBVUkwgYW5kIHRyaWdnZXJzIHJlbGF0ZWRcbiAgICogYWN0aW9uIGFuZCBldmVudHMgbGlrZSByZWRpcmVjdHMsIGd1YXJkcywgYW5kIHJlc29sdmVycy4gQnkgZGVmYXVsdCwgdGhlIHJvdXRlciByZS11c2VzIGFcbiAgICogY29tcG9uZW50IGluc3RhbmNlIHdoZW4gaXQgcmUtbmF2aWdhdGVzIHRvIHRoZSBzYW1lIGNvbXBvbmVudCB0eXBlIHdpdGhvdXQgdmlzaXRpbmcgYSBkaWZmZXJlbnRcbiAgICogY29tcG9uZW50IGZpcnN0LiBUaGlzIGJlaGF2aW9yIGlzIGNvbmZpZ3VyZWQgYnkgdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgLiBJbiBvcmRlciB0byByZWxvYWRcbiAgICogcm91dGVkIGNvbXBvbmVudHMgb24gc2FtZSB1cmwgbmF2aWdhdGlvbiwgeW91IG5lZWQgdG8gc2V0IGBvblNhbWVVcmxOYXZpZ2F0aW9uYCB0byBgJ3JlbG9hZCdgXG4gICAqIF9hbmRfIHByb3ZpZGUgYSBgUm91dGVSZXVzZVN0cmF0ZWd5YCB3aGljaCByZXR1cm5zIGBmYWxzZWAgZm9yIGBzaG91bGRSZXVzZVJvdXRlYC5cbiAgICovXG4gIG9uU2FtZVVybE5hdmlnYXRpb246ICdyZWxvYWQnfCdpZ25vcmUnID0gJ2lnbm9yZSc7XG5cbiAgLyoqXG4gICAqIEhvdyB0byBtZXJnZSBwYXJhbWV0ZXJzLCBkYXRhLCByZXNvbHZlZCBkYXRhLCBhbmQgdGl0bGUgZnJvbSBwYXJlbnQgdG8gY2hpbGRcbiAgICogcm91dGVzLiBPbmUgb2Y6XG4gICAqXG4gICAqIC0gYCdlbXB0eU9ubHknYCA6IEluaGVyaXQgcGFyZW50IHBhcmFtZXRlcnMsIGRhdGEsIGFuZCByZXNvbHZlZCBkYXRhXG4gICAqIGZvciBwYXRoLWxlc3Mgb3IgY29tcG9uZW50LWxlc3Mgcm91dGVzLlxuICAgKiAtIGAnYWx3YXlzJ2AgOiBJbmhlcml0IHBhcmVudCBwYXJhbWV0ZXJzLCBkYXRhLCBhbmQgcmVzb2x2ZWQgZGF0YVxuICAgKiBmb3IgYWxsIGNoaWxkIHJvdXRlcy5cbiAgICovXG4gIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6ICdlbXB0eU9ubHknfCdhbHdheXMnID0gJ2VtcHR5T25seSc7XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hlbiB0aGUgcm91dGVyIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMLlxuICAgKiBCeSBkZWZhdWx0IChgXCJkZWZlcnJlZFwiYCksIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMIGFmdGVyIG5hdmlnYXRpb24gaGFzIGZpbmlzaGVkLlxuICAgKiBTZXQgdG8gYCdlYWdlcidgIHRvIHVwZGF0ZSB0aGUgYnJvd3NlciBVUkwgYXQgdGhlIGJlZ2lubmluZyBvZiBuYXZpZ2F0aW9uLlxuICAgKiBZb3UgY2FuIGNob29zZSB0byB1cGRhdGUgZWFybHkgc28gdGhhdCwgaWYgbmF2aWdhdGlvbiBmYWlscyxcbiAgICogeW91IGNhbiBzaG93IGFuIGVycm9yIG1lc3NhZ2Ugd2l0aCB0aGUgVVJMIHRoYXQgZmFpbGVkLlxuICAgKi9cbiAgdXJsVXBkYXRlU3RyYXRlZ3k6ICdkZWZlcnJlZCd8J2VhZ2VyJyA9ICdkZWZlcnJlZCc7XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgaG93IHRoZSBSb3V0ZXIgYXR0ZW1wdHMgdG8gcmVzdG9yZSBzdGF0ZSB3aGVuIGEgbmF2aWdhdGlvbiBpcyBjYW5jZWxsZWQuXG4gICAqXG4gICAqICdyZXBsYWNlJyAtIEFsd2F5cyB1c2VzIGBsb2NhdGlvbi5yZXBsYWNlU3RhdGVgIHRvIHNldCB0aGUgYnJvd3NlciBzdGF0ZSB0byB0aGUgc3RhdGUgb2YgdGhlXG4gICAqIHJvdXRlciBiZWZvcmUgdGhlIG5hdmlnYXRpb24gc3RhcnRlZC4gVGhpcyBtZWFucyB0aGF0IGlmIHRoZSBVUkwgb2YgdGhlIGJyb3dzZXIgaXMgdXBkYXRlZFxuICAgKiBfYmVmb3JlXyB0aGUgbmF2aWdhdGlvbiBpcyBjYW5jZWxlZCwgdGhlIFJvdXRlciB3aWxsIHNpbXBseSByZXBsYWNlIHRoZSBpdGVtIGluIGhpc3RvcnkgcmF0aGVyXG4gICAqIHRoYW4gdHJ5aW5nIHRvIHJlc3RvcmUgdG8gdGhlIHByZXZpb3VzIGxvY2F0aW9uIGluIHRoZSBzZXNzaW9uIGhpc3RvcnkuIFRoaXMgaGFwcGVucyBtb3N0XG4gICAqIGZyZXF1ZW50bHkgd2l0aCBgdXJsVXBkYXRlU3RyYXRlZ3k6ICdlYWdlcidgIGFuZCBuYXZpZ2F0aW9ucyB3aXRoIHRoZSBicm93c2VyIGJhY2svZm9yd2FyZFxuICAgKiBidXR0b25zLlxuICAgKlxuICAgKiAnY29tcHV0ZWQnIC0gV2lsbCBhdHRlbXB0IHRvIHJldHVybiB0byB0aGUgc2FtZSBpbmRleCBpbiB0aGUgc2Vzc2lvbiBoaXN0b3J5IHRoYXQgY29ycmVzcG9uZHNcbiAgICogdG8gdGhlIEFuZ3VsYXIgcm91dGUgd2hlbiB0aGUgbmF2aWdhdGlvbiBnZXRzIGNhbmNlbGxlZC4gRm9yIGV4YW1wbGUsIGlmIHRoZSBicm93c2VyIGJhY2tcbiAgICogYnV0dG9uIGlzIGNsaWNrZWQgYW5kIHRoZSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGxlZCwgdGhlIFJvdXRlciB3aWxsIHRyaWdnZXIgYSBmb3J3YXJkIG5hdmlnYXRpb25cbiAgICogYW5kIHZpY2UgdmVyc2EuXG4gICAqXG4gICAqIE5vdGU6IHRoZSAnY29tcHV0ZWQnIG9wdGlvbiBpcyBpbmNvbXBhdGlibGUgd2l0aCBhbnkgYFVybEhhbmRsaW5nU3RyYXRlZ3lgIHdoaWNoIG9ubHlcbiAgICogaGFuZGxlcyBhIHBvcnRpb24gb2YgdGhlIFVSTCBiZWNhdXNlIHRoZSBoaXN0b3J5IHJlc3RvcmF0aW9uIG5hdmlnYXRlcyB0byB0aGUgcHJldmlvdXMgcGxhY2UgaW5cbiAgICogdGhlIGJyb3dzZXIgaGlzdG9yeSByYXRoZXIgdGhhbiBzaW1wbHkgcmVzZXR0aW5nIGEgcG9ydGlvbiBvZiB0aGUgVVJMLlxuICAgKlxuICAgKiBUaGUgZGVmYXVsdCB2YWx1ZSBpcyBgcmVwbGFjZWAuXG4gICAqXG4gICAqL1xuICBjYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uOiAncmVwbGFjZSd8J2NvbXB1dGVkJyA9ICdyZXBsYWNlJztcblxuICBwcml2YXRlIHJlYWRvbmx5IG5hdmlnYXRpb25UcmFuc2l0aW9ucyA9IGluamVjdChOYXZpZ2F0aW9uVHJhbnNpdGlvbnMpO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIHRoZSByb3V0ZXIgc2VydmljZS5cbiAgICovXG4gIC8vIFRPRE86IHZzYXZraW4gbWFrZSBpbnRlcm5hbCBhZnRlciB0aGUgZmluYWwgaXMgb3V0LlxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICAgIHB1YmxpYyByb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+fG51bGwsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHJvb3RDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgbG9jYXRpb246IExvY2F0aW9uLFxuICAgICAgaW5qZWN0b3I6IEluamVjdG9yLFxuICAgICAgY29tcGlsZXI6IENvbXBpbGVyLFxuICAgICAgcHVibGljIGNvbmZpZzogUm91dGVzLFxuICApIHtcbiAgICB0aGlzLmNvbnNvbGUgPSBpbmplY3Rvci5nZXQoQ29uc29sZSk7XG4gICAgY29uc3Qgbmdab25lID0gaW5qZWN0b3IuZ2V0KE5nWm9uZSk7XG4gICAgdGhpcy5pc05nWm9uZUVuYWJsZWQgPSBuZ1pvbmUgaW5zdGFuY2VvZiBOZ1pvbmUgJiYgTmdab25lLmlzSW5Bbmd1bGFyWm9uZSgpO1xuXG4gICAgdGhpcy5yZXNldENvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSBuZXcgVXJsVHJlZSgpO1xuICAgIHRoaXMucmF3VXJsVHJlZSA9IHRoaXMuY3VycmVudFVybFRyZWU7XG4gICAgdGhpcy5icm93c2VyVXJsVHJlZSA9IHRoaXMuY3VycmVudFVybFRyZWU7XG5cbiAgICB0aGlzLnJvdXRlclN0YXRlID0gY3JlYXRlRW1wdHlTdGF0ZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB0aGlzLnJvb3RDb21wb25lbnRUeXBlKTtcblxuICAgIHRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLnNldHVwTmF2aWdhdGlvbnModGhpcykuc3Vic2NyaWJlKFxuICAgICAgICB0ID0+IHtcbiAgICAgICAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSB0LmlkO1xuICAgICAgICAgIHRoaXMuY3VycmVudFBhZ2VJZCA9IHQudGFyZ2V0UGFnZUlkO1xuICAgICAgICB9LFxuICAgICAgICBlID0+IHtcbiAgICAgICAgICB0aGlzLmNvbnNvbGUud2FybihgVW5oYW5kbGVkIE5hdmlnYXRpb24gRXJyb3I6ICR7ZX1gKTtcbiAgICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIFRPRE86IHRoaXMgc2hvdWxkIGJlIHJlbW92ZWQgb25jZSB0aGUgY29uc3RydWN0b3Igb2YgdGhlIHJvdXRlciBtYWRlIGludGVybmFsXG4gICAqL1xuICByZXNldFJvb3RDb21wb25lbnRUeXBlKHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT4pOiB2b2lkIHtcbiAgICB0aGlzLnJvb3RDb21wb25lbnRUeXBlID0gcm9vdENvbXBvbmVudFR5cGU7XG4gICAgLy8gVE9ETzogdnNhdmtpbiByb3V0ZXIgNC4wIHNob3VsZCBtYWtlIHRoZSByb290IGNvbXBvbmVudCBzZXQgdG8gbnVsbFxuICAgIC8vIHRoaXMgd2lsbCBzaW1wbGlmeSB0aGUgbGlmZWN5Y2xlIG9mIHRoZSByb3V0ZXIuXG4gICAgdGhpcy5yb3V0ZXJTdGF0ZS5yb290LmNvbXBvbmVudCA9IHRoaXMucm9vdENvbXBvbmVudFR5cGU7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyIGFuZCBwZXJmb3JtcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaW5pdGlhbE5hdmlnYXRpb24oKTogdm9pZCB7XG4gICAgdGhpcy5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICBpZiAoIXRoaXMubmF2aWdhdGlvblRyYW5zaXRpb25zLmhhc1JlcXVlc3RlZE5hdmlnYXRpb24pIHtcbiAgICAgIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmxvY2F0aW9uLnBhdGgodHJ1ZSksIHtyZXBsYWNlVXJsOiB0cnVlfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdXAgdGhlIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lci4gVGhpcyBsaXN0ZW5lciBkZXRlY3RzIG5hdmlnYXRpb25zIHRyaWdnZXJlZCBmcm9tIG91dHNpZGVcbiAgICogdGhlIFJvdXRlciAodGhlIGJyb3dzZXIgYmFjay9mb3J3YXJkIGJ1dHRvbnMsIGZvciBleGFtcGxlKSBhbmQgc2NoZWR1bGVzIGEgY29ycmVzcG9uZGluZyBSb3V0ZXJcbiAgICogbmF2aWdhdGlvbiBzbyB0aGF0IHRoZSBjb3JyZWN0IGV2ZW50cywgZ3VhcmRzLCBldGMuIGFyZSB0cmlnZ2VyZWQuXG4gICAqL1xuICBzZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTogdm9pZCB7XG4gICAgLy8gRG9uJ3QgbmVlZCB0byB1c2UgWm9uZS53cmFwIGFueSBtb3JlLCBiZWNhdXNlIHpvbmUuanNcbiAgICAvLyBhbHJlYWR5IHBhdGNoIG9uUG9wU3RhdGUsIHNvIGxvY2F0aW9uIGNoYW5nZSBjYWxsYmFjayB3aWxsXG4gICAgLy8gcnVuIGludG8gbmdab25lXG4gICAgaWYgKCF0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uID0gdGhpcy5sb2NhdGlvbi5zdWJzY3JpYmUoZXZlbnQgPT4ge1xuICAgICAgICBjb25zdCBzb3VyY2UgPSBldmVudFsndHlwZSddID09PSAncG9wc3RhdGUnID8gJ3BvcHN0YXRlJyA6ICdoYXNoY2hhbmdlJztcbiAgICAgICAgaWYgKHNvdXJjZSA9PT0gJ3BvcHN0YXRlJykge1xuICAgICAgICAgIC8vIFRoZSBgc2V0VGltZW91dGAgd2FzIGFkZGVkIGluICMxMjE2MCBhbmQgaXMgbGlrZWx5IHRvIHN1cHBvcnQgQW5ndWxhci9Bbmd1bGFySlNcbiAgICAgICAgICAvLyBoeWJyaWQgYXBwcy5cbiAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHtyZXBsYWNlVXJsOiB0cnVlfTtcblxuICAgICAgICAgICAgLy8gVE9ETzogcmVzdG9yZWRTdGF0ZSBzaG91bGQgYWx3YXlzIGluY2x1ZGUgdGhlIGVudGlyZSBzdGF0ZSwgcmVnYXJkbGVzc1xuICAgICAgICAgICAgLy8gb2YgbmF2aWdhdGlvbklkLiBUaGlzIHJlcXVpcmVzIGEgYnJlYWtpbmcgY2hhbmdlIHRvIHVwZGF0ZSB0aGUgdHlwZSBvblxuICAgICAgICAgICAgLy8gTmF2aWdhdGlvblN0YXJ04oCZcyByZXN0b3JlZFN0YXRlLCB3aGljaCBjdXJyZW50bHkgcmVxdWlyZXMgbmF2aWdhdGlvbklkXG4gICAgICAgICAgICAvLyB0byBhbHdheXMgYmUgcHJlc2VudC4gVGhlIFJvdXRlciB1c2VkIHRvIG9ubHkgcmVzdG9yZSBoaXN0b3J5IHN0YXRlIGlmXG4gICAgICAgICAgICAvLyBhIG5hdmlnYXRpb25JZCB3YXMgcHJlc2VudC5cblxuICAgICAgICAgICAgLy8gVGhlIHN0b3JlZCBuYXZpZ2F0aW9uSWQgaXMgdXNlZCBieSB0aGUgUm91dGVyU2Nyb2xsZXIgdG8gcmV0cmlldmUgdGhlIHNjcm9sbFxuICAgICAgICAgICAgLy8gcG9zaXRpb24gZm9yIHRoZSBwYWdlLlxuICAgICAgICAgICAgY29uc3QgcmVzdG9yZWRTdGF0ZSA9IGV2ZW50LnN0YXRlPy5uYXZpZ2F0aW9uSWQgPyBldmVudC5zdGF0ZSA6IG51bGw7XG5cbiAgICAgICAgICAgIC8vIFNlcGFyYXRlIHRvIE5hdmlnYXRpb25TdGFydC5yZXN0b3JlZFN0YXRlLCB3ZSBtdXN0IGFsc28gcmVzdG9yZSB0aGUgc3RhdGUgdG9cbiAgICAgICAgICAgIC8vIGhpc3Rvcnkuc3RhdGUgYW5kIGdlbmVyYXRlIGEgbmV3IG5hdmlnYXRpb25JZCwgc2luY2UgaXQgd2lsbCBiZSBvdmVyd3JpdHRlblxuICAgICAgICAgICAgaWYgKGV2ZW50LnN0YXRlKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHN0YXRlQ29weSA9IHsuLi5ldmVudC5zdGF0ZX0gYXMgUGFydGlhbDxSZXN0b3JlZFN0YXRlPjtcbiAgICAgICAgICAgICAgZGVsZXRlIHN0YXRlQ29weS5uYXZpZ2F0aW9uSWQ7XG4gICAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZUNvcHkuybVyb3V0ZXJQYWdlSWQ7XG4gICAgICAgICAgICAgIGlmIChPYmplY3Qua2V5cyhzdGF0ZUNvcHkpLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGV4dHJhcy5zdGF0ZSA9IHN0YXRlQ29weTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB1cmxUcmVlID0gdGhpcy5wYXJzZVVybChldmVudFsndXJsJ10hKTtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKHVybFRyZWUsIHNvdXJjZSwgcmVzdG9yZWRTdGF0ZSwgZXh0cmFzKTtcbiAgICAgICAgICB9LCAwKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIFRoZSBjdXJyZW50IFVSTC4gKi9cbiAgZ2V0IHVybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnNlcmlhbGl6ZVVybCh0aGlzLmN1cnJlbnRVcmxUcmVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IGBOYXZpZ2F0aW9uYCBvYmplY3Qgd2hlbiB0aGUgcm91dGVyIGlzIG5hdmlnYXRpbmcsXG4gICAqIGFuZCBgbnVsbGAgd2hlbiBpZGxlLlxuICAgKi9cbiAgZ2V0Q3VycmVudE5hdmlnYXRpb24oKTogTmF2aWdhdGlvbnxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5uYXZpZ2F0aW9uVHJhbnNpdGlvbnMuY3VycmVudE5hdmlnYXRpb247XG4gIH1cblxuICAvKipcbiAgICogUmVzZXRzIHRoZSByb3V0ZSBjb25maWd1cmF0aW9uIHVzZWQgZm9yIG5hdmlnYXRpb24gYW5kIGdlbmVyYXRpbmcgbGlua3MuXG4gICAqXG4gICAqIEBwYXJhbSBjb25maWcgVGhlIHJvdXRlIGFycmF5IGZvciB0aGUgbmV3IGNvbmZpZ3VyYXRpb24uXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIucmVzZXRDb25maWcoW1xuICAgKiAgeyBwYXRoOiAndGVhbS86aWQnLCBjb21wb25lbnQ6IFRlYW1DbXAsIGNoaWxkcmVuOiBbXG4gICAqICAgIHsgcGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wIH0sXG4gICAqICAgIHsgcGF0aDogJ3VzZXIvOm5hbWUnLCBjb21wb25lbnQ6IFVzZXJDbXAgfVxuICAgKiAgXX1cbiAgICogXSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcmVzZXRDb25maWcoY29uZmlnOiBSb3V0ZXMpOiB2b2lkIHtcbiAgICBOR19ERVZfTU9ERSAmJiB2YWxpZGF0ZUNvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gICAgdGhpcy5uYXZpZ2F0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSAtMTtcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5kaXNwb3NlKCk7XG4gIH1cblxuICAvKiogRGlzcG9zZXMgb2YgdGhlIHJvdXRlci4gKi9cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5jb21wbGV0ZSgpO1xuICAgIGlmICh0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICB0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB0aGlzLmRpc3Bvc2VkID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBlbmRzIFVSTCBzZWdtZW50cyB0byB0aGUgY3VycmVudCBVUkwgdHJlZSB0byBjcmVhdGUgYSBuZXcgVVJMIHRyZWUuXG4gICAqXG4gICAqIEBwYXJhbSBjb21tYW5kcyBBbiBhcnJheSBvZiBVUkwgZnJhZ21lbnRzIHdpdGggd2hpY2ggdG8gY29uc3RydWN0IHRoZSBuZXcgVVJMIHRyZWUuXG4gICAqIElmIHRoZSBwYXRoIGlzIHN0YXRpYywgY2FuIGJlIHRoZSBsaXRlcmFsIFVSTCBzdHJpbmcuIEZvciBhIGR5bmFtaWMgcGF0aCwgcGFzcyBhbiBhcnJheSBvZiBwYXRoXG4gICAqIHNlZ21lbnRzLCBmb2xsb3dlZCBieSB0aGUgcGFyYW1ldGVycyBmb3IgZWFjaCBzZWdtZW50LlxuICAgKiBUaGUgZnJhZ21lbnRzIGFyZSBhcHBsaWVkIHRvIHRoZSBjdXJyZW50IFVSTCB0cmVlIG9yIHRoZSBvbmUgcHJvdmlkZWQgIGluIHRoZSBgcmVsYXRpdmVUb2BcbiAgICogcHJvcGVydHkgb2YgdGhlIG9wdGlvbnMgb2JqZWN0LCBpZiBzdXBwbGllZC5cbiAgICogQHBhcmFtIG5hdmlnYXRpb25FeHRyYXMgT3B0aW9ucyB0aGF0IGNvbnRyb2wgdGhlIG5hdmlnYXRpb24gc3RyYXRlZ3kuXG4gICAqIEByZXR1cm5zIFRoZSBuZXcgVVJMIHRyZWUuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvdXNlci8xMVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzO2V4cGFuZD10cnVlL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7ZXhwYW5kOiB0cnVlfSwgJ3VzZXInLCAxMV0pO1xuICAgKlxuICAgKiAvLyB5b3UgY2FuIGNvbGxhcHNlIHN0YXRpYyBzZWdtZW50cyBsaWtlIHRoaXMgKHRoaXMgd29ya3Mgb25seSB3aXRoIHRoZSBmaXJzdCBwYXNzZWQtaW4gdmFsdWUpOlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtLzMzL3VzZXInLCB1c2VySWRdKTtcbiAgICpcbiAgICogLy8gSWYgdGhlIGZpcnN0IHNlZ21lbnQgY2FuIGNvbnRhaW4gc2xhc2hlcywgYW5kIHlvdSBkbyBub3Qgd2FudCB0aGUgcm91dGVyIHRvIHNwbGl0IGl0LFxuICAgKiAvLyB5b3UgY2FuIGRvIHRoZSBmb2xsb3dpbmc6XG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFt7c2VnbWVudFBhdGg6ICcvb25lL3R3byd9XSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMy8odXNlci8xMS8vcmlnaHQ6Y2hhdClcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6ICdjaGF0J319XSk7XG4gICAqXG4gICAqIC8vIHJlbW92ZSB0aGUgcmlnaHQgc2Vjb25kYXJ5IG5vZGVcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6IG51bGx9fV0pO1xuICAgKlxuICAgKiAvLyBhc3N1bWluZyB0aGUgY3VycmVudCB1cmwgaXMgYC90ZWFtLzMzL3VzZXIvMTFgIGFuZCB0aGUgcm91dGUgcG9pbnRzIHRvIGB1c2VyLzExYFxuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzExL2RldGFpbHNcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWydkZXRhaWxzJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzQ0L3VzZXIvMjJcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycuLi8uLi90ZWFtLzQ0L3VzZXIvMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIE5vdGUgdGhhdCBhIHZhbHVlIG9mIGBudWxsYCBvciBgdW5kZWZpbmVkYCBmb3IgYHJlbGF0aXZlVG9gIGluZGljYXRlcyB0aGF0IHRoZVxuICAgKiB0cmVlIHNob3VsZCBiZSBjcmVhdGVkIHJlbGF0aXZlIHRvIHRoZSByb290LlxuICAgKiBgYGBcbiAgICovXG4gIGNyZWF0ZVVybFRyZWUoY29tbWFuZHM6IGFueVtdLCBuYXZpZ2F0aW9uRXh0cmFzOiBVcmxDcmVhdGlvbk9wdGlvbnMgPSB7fSk6IFVybFRyZWUge1xuICAgIGNvbnN0IHtyZWxhdGl2ZVRvLCBxdWVyeVBhcmFtcywgZnJhZ21lbnQsIHF1ZXJ5UGFyYW1zSGFuZGxpbmcsIHByZXNlcnZlRnJhZ21lbnR9ID1cbiAgICAgICAgbmF2aWdhdGlvbkV4dHJhcztcbiAgICBjb25zdCBhID0gcmVsYXRpdmVUbyB8fCB0aGlzLnJvdXRlclN0YXRlLnJvb3Q7XG4gICAgY29uc3QgZiA9IHByZXNlcnZlRnJhZ21lbnQgPyB0aGlzLmN1cnJlbnRVcmxUcmVlLmZyYWdtZW50IDogZnJhZ21lbnQ7XG4gICAgbGV0IHE6IFBhcmFtc3xudWxsID0gbnVsbDtcbiAgICBzd2l0Y2ggKHF1ZXJ5UGFyYW1zSGFuZGxpbmcpIHtcbiAgICAgIGNhc2UgJ21lcmdlJzpcbiAgICAgICAgcSA9IHsuLi50aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zLCAuLi5xdWVyeVBhcmFtc307XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncHJlc2VydmUnOlxuICAgICAgICBxID0gdGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcztcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBxID0gcXVlcnlQYXJhbXMgfHwgbnVsbDtcbiAgICB9XG4gICAgaWYgKHEgIT09IG51bGwpIHtcbiAgICAgIHEgPSB0aGlzLnJlbW92ZUVtcHR5UHJvcHMocSk7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVVcmxUcmVlKGEsIHRoaXMuY3VycmVudFVybFRyZWUsIGNvbW1hbmRzLCBxLCBmID8/IG51bGwpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlcyB0byBhIHZpZXcgdXNpbmcgYW4gYWJzb2x1dGUgcm91dGUgcGF0aC5cbiAgICpcbiAgICogQHBhcmFtIHVybCBBbiBhYnNvbHV0ZSBwYXRoIGZvciBhIGRlZmluZWQgcm91dGUuIFRoZSBmdW5jdGlvbiBkb2VzIG5vdCBhcHBseSBhbnkgZGVsdGEgdG8gdGhlXG4gICAqICAgICBjdXJyZW50IFVSTC5cbiAgICogQHBhcmFtIGV4dHJhcyBBbiBvYmplY3QgY29udGFpbmluZyBwcm9wZXJ0aWVzIHRoYXQgbW9kaWZ5IHRoZSBuYXZpZ2F0aW9uIHN0cmF0ZWd5LlxuICAgKlxuICAgKiBAcmV0dXJucyBBIFByb21pc2UgdGhhdCByZXNvbHZlcyB0byAndHJ1ZScgd2hlbiBuYXZpZ2F0aW9uIHN1Y2NlZWRzLFxuICAgKiB0byAnZmFsc2UnIHdoZW4gbmF2aWdhdGlvbiBmYWlscywgb3IgaXMgcmVqZWN0ZWQgb24gZXJyb3IuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIFRoZSBmb2xsb3dpbmcgY2FsbHMgcmVxdWVzdCBuYXZpZ2F0aW9uIHRvIGFuIGFic29sdXRlIHBhdGguXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIubmF2aWdhdGVCeVVybChcIi90ZWFtLzMzL3VzZXIvMTFcIik7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTFxuICAgKiByb3V0ZXIubmF2aWdhdGVCeVVybChcIi90ZWFtLzMzL3VzZXIvMTFcIiwgeyBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpXG4gICAqXG4gICAqL1xuICBuYXZpZ2F0ZUJ5VXJsKHVybDogc3RyaW5nfFVybFRyZWUsIGV4dHJhczogTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyA9IHtcbiAgICBza2lwTG9jYXRpb25DaGFuZ2U6IGZhbHNlXG4gIH0pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHxcbiAgICAgICAgbmdEZXZNb2RlICYmIHRoaXMuaXNOZ1pvbmVFbmFibGVkICYmICFOZ1pvbmUuaXNJbkFuZ3VsYXJab25lKCkpIHtcbiAgICAgIHRoaXMuY29uc29sZS53YXJuKFxuICAgICAgICAgIGBOYXZpZ2F0aW9uIHRyaWdnZXJlZCBvdXRzaWRlIEFuZ3VsYXIgem9uZSwgZGlkIHlvdSBmb3JnZXQgdG8gY2FsbCAnbmdab25lLnJ1bigpJz9gKTtcbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gaXNVcmxUcmVlKHVybCkgPyB1cmwgOiB0aGlzLnBhcnNlVXJsKHVybCk7XG4gICAgY29uc3QgbWVyZ2VkVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh1cmxUcmVlLCB0aGlzLnJhd1VybFRyZWUpO1xuXG4gICAgcmV0dXJuIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKG1lcmdlZFRyZWUsICdpbXBlcmF0aXZlJywgbnVsbCwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZSBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgYXJyYXkgb2YgY29tbWFuZHMgYW5kIGEgc3RhcnRpbmcgcG9pbnQuXG4gICAqIElmIG5vIHN0YXJ0aW5nIHJvdXRlIGlzIHByb3ZpZGVkLCB0aGUgbmF2aWdhdGlvbiBpcyBhYnNvbHV0ZS5cbiAgICpcbiAgICogQHBhcmFtIGNvbW1hbmRzIEFuIGFycmF5IG9mIFVSTCBmcmFnbWVudHMgd2l0aCB3aGljaCB0byBjb25zdHJ1Y3QgdGhlIHRhcmdldCBVUkwuXG4gICAqIElmIHRoZSBwYXRoIGlzIHN0YXRpYywgY2FuIGJlIHRoZSBsaXRlcmFsIFVSTCBzdHJpbmcuIEZvciBhIGR5bmFtaWMgcGF0aCwgcGFzcyBhbiBhcnJheSBvZiBwYXRoXG4gICAqIHNlZ21lbnRzLCBmb2xsb3dlZCBieSB0aGUgcGFyYW1ldGVycyBmb3IgZWFjaCBzZWdtZW50LlxuICAgKiBUaGUgZnJhZ21lbnRzIGFyZSBhcHBsaWVkIHRvIHRoZSBjdXJyZW50IFVSTCBvciB0aGUgb25lIHByb3ZpZGVkICBpbiB0aGUgYHJlbGF0aXZlVG9gIHByb3BlcnR5XG4gICAqIG9mIHRoZSBvcHRpb25zIG9iamVjdCwgaWYgc3VwcGxpZWQuXG4gICAqIEBwYXJhbSBleHRyYXMgQW4gb3B0aW9ucyBvYmplY3QgdGhhdCBkZXRlcm1pbmVzIGhvdyB0aGUgVVJMIHNob3VsZCBiZSBjb25zdHJ1Y3RlZCBvclxuICAgKiAgICAgaW50ZXJwcmV0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGB0cnVlYCB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsIHRvIGBmYWxzZWAgd2hlbiBuYXZpZ2F0aW9uXG4gICAqICAgICBmYWlscyxcbiAgICogb3IgaXMgcmVqZWN0ZWQgb24gZXJyb3IuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIFRoZSBmb2xsb3dpbmcgY2FsbHMgcmVxdWVzdCBuYXZpZ2F0aW9uIHRvIGEgZHluYW1pYyByb3V0ZSBwYXRoIHJlbGF0aXZlIHRvIHRoZSBjdXJyZW50IFVSTC5cbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZShbJ3RlYW0nLCAzMywgJ3VzZXInLCAxMV0sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBOYXZpZ2F0ZSB3aXRob3V0IHVwZGF0aW5nIHRoZSBVUkwsIG92ZXJyaWRpbmcgdGhlIGRlZmF1bHQgYmVoYXZpb3JcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlLCBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWV9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRlcilcbiAgICpcbiAgICovXG4gIG5hdmlnYXRlKGNvbW1hbmRzOiBhbnlbXSwgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3NraXBMb2NhdGlvbkNoYW5nZTogZmFsc2V9KTpcbiAgICAgIFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHMpO1xuICAgIHJldHVybiB0aGlzLm5hdmlnYXRlQnlVcmwodGhpcy5jcmVhdGVVcmxUcmVlKGNvbW1hbmRzLCBleHRyYXMpLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqIFNlcmlhbGl6ZXMgYSBgVXJsVHJlZWAgaW50byBhIHN0cmluZyAqL1xuICBzZXJpYWxpemVVcmwodXJsOiBVcmxUcmVlKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICB9XG5cbiAgLyoqIFBhcnNlcyBhIHN0cmluZyBpbnRvIGEgYFVybFRyZWVgICovXG4gIHBhcnNlVXJsKHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gICAgbGV0IHVybFRyZWU6IFVybFRyZWU7XG4gICAgdHJ5IHtcbiAgICAgIHVybFRyZWUgPSB0aGlzLnVybFNlcmlhbGl6ZXIucGFyc2UodXJsKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB1cmxUcmVlID0gdGhpcy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIoZSBhcyBVUklFcnJvciwgdGhpcy51cmxTZXJpYWxpemVyLCB1cmwpO1xuICAgIH1cbiAgICByZXR1cm4gdXJsVHJlZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHdoZXRoZXIgdGhlIHVybCBpcyBhY3RpdmF0ZWQuXG4gICAqXG4gICAqIEBkZXByZWNhdGVkXG4gICAqIFVzZSBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIGluc3RlYWQuXG4gICAqXG4gICAqIC0gVGhlIGVxdWl2YWxlbnQgYElzQWN0aXZlTWF0Y2hPcHRpb25zYCBmb3IgYHRydWVgIGlzXG4gICAqIGB7cGF0aHM6ICdleGFjdCcsIHF1ZXJ5UGFyYW1zOiAnZXhhY3QnLCBmcmFnbWVudDogJ2lnbm9yZWQnLCBtYXRyaXhQYXJhbXM6ICdpZ25vcmVkJ31gLlxuICAgKiAtIFRoZSBlcXVpdmFsZW50IGZvciBgZmFsc2VgIGlzXG4gICAqIGB7cGF0aHM6ICdzdWJzZXQnLCBxdWVyeVBhcmFtczogJ3N1YnNldCcsIGZyYWdtZW50OiAnaWdub3JlZCcsIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnfWAuXG4gICAqL1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBleGFjdDogYm9vbGVhbik6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBSZXR1cm5zIHdoZXRoZXIgdGhlIHVybCBpcyBhY3RpdmF0ZWQuXG4gICAqL1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBtYXRjaE9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zKTogYm9vbGVhbjtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBtYXRjaE9wdGlvbnM6IGJvb2xlYW58SXNBY3RpdmVNYXRjaE9wdGlvbnMpOiBib29sZWFuO1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBtYXRjaE9wdGlvbnM6IGJvb2xlYW58SXNBY3RpdmVNYXRjaE9wdGlvbnMpOiBib29sZWFuIHtcbiAgICBsZXQgb3B0aW9uczogSXNBY3RpdmVNYXRjaE9wdGlvbnM7XG4gICAgaWYgKG1hdGNoT3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucyA9IHsuLi5leGFjdE1hdGNoT3B0aW9uc307XG4gICAgfSBlbHNlIGlmIChtYXRjaE9wdGlvbnMgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zID0gey4uLnN1YnNldE1hdGNoT3B0aW9uc307XG4gICAgfSBlbHNlIHtcbiAgICAgIG9wdGlvbnMgPSBtYXRjaE9wdGlvbnM7XG4gICAgfVxuICAgIGlmIChpc1VybFRyZWUodXJsKSkge1xuICAgICAgcmV0dXJuIGNvbnRhaW5zVHJlZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB1cmwsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGNvbnN0IHVybFRyZWUgPSB0aGlzLnBhcnNlVXJsKHVybCk7XG4gICAgcmV0dXJuIGNvbnRhaW5zVHJlZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB1cmxUcmVlLCBvcHRpb25zKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVtb3ZlRW1wdHlQcm9wcyhwYXJhbXM6IFBhcmFtcyk6IFBhcmFtcyB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHBhcmFtcykucmVkdWNlKChyZXN1bHQ6IFBhcmFtcywga2V5OiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlOiBhbnkgPSBwYXJhbXNba2V5XTtcbiAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sIHt9KTtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgc2NoZWR1bGVOYXZpZ2F0aW9uKFxuICAgICAgcmF3VXJsOiBVcmxUcmVlLCBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLCByZXN0b3JlZFN0YXRlOiBSZXN0b3JlZFN0YXRlfG51bGwsXG4gICAgICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMsXG4gICAgICBwcmlvclByb21pc2U/OiB7cmVzb2x2ZTogYW55LCByZWplY3Q6IGFueSwgcHJvbWlzZTogUHJvbWlzZTxib29sZWFuPn0pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShmYWxzZSk7XG4gICAgfVxuXG4gICAgbGV0IHJlc29sdmU6IGFueTtcbiAgICBsZXQgcmVqZWN0OiBhbnk7XG4gICAgbGV0IHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj47XG4gICAgaWYgKHByaW9yUHJvbWlzZSkge1xuICAgICAgcmVzb2x2ZSA9IHByaW9yUHJvbWlzZS5yZXNvbHZlO1xuICAgICAgcmVqZWN0ID0gcHJpb3JQcm9taXNlLnJlamVjdDtcbiAgICAgIHByb21pc2UgPSBwcmlvclByb21pc2UucHJvbWlzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXMsIHJlaikgPT4ge1xuICAgICAgICByZXNvbHZlID0gcmVzO1xuICAgICAgICByZWplY3QgPSByZWo7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBsZXQgdGFyZ2V0UGFnZUlkOiBudW1iZXI7XG4gICAgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ2NvbXB1dGVkJykge1xuICAgICAgY29uc3QgaXNJbml0aWFsUGFnZSA9IHRoaXMuY3VycmVudFBhZ2VJZCA9PT0gMDtcbiAgICAgIGlmIChpc0luaXRpYWxQYWdlKSB7XG4gICAgICAgIHJlc3RvcmVkU3RhdGUgPSB0aGlzLmxvY2F0aW9uLmdldFN0YXRlKCkgYXMgUmVzdG9yZWRTdGF0ZSB8IG51bGw7XG4gICAgICB9XG4gICAgICAvLyBJZiB0aGUgYMm1cm91dGVyUGFnZUlkYCBleGlzdCBpbiB0aGUgc3RhdGUgdGhlbiBgdGFyZ2V0cGFnZUlkYCBzaG91bGQgaGF2ZSB0aGUgdmFsdWUgb2ZcbiAgICAgIC8vIGDJtXJvdXRlclBhZ2VJZGAuIFRoaXMgaXMgdGhlIGNhc2UgZm9yIHNvbWV0aGluZyBsaWtlIGEgcGFnZSByZWZyZXNoIHdoZXJlIHdlIGFzc2lnbiB0aGVcbiAgICAgIC8vIHRhcmdldCBpZCB0byB0aGUgcHJldmlvdXNseSBzZXQgdmFsdWUgZm9yIHRoYXQgcGFnZS5cbiAgICAgIGlmIChyZXN0b3JlZFN0YXRlICYmIHJlc3RvcmVkU3RhdGUuybVyb3V0ZXJQYWdlSWQpIHtcbiAgICAgICAgdGFyZ2V0UGFnZUlkID0gcmVzdG9yZWRTdGF0ZS7JtXJvdXRlclBhZ2VJZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHdlJ3JlIHJlcGxhY2luZyB0aGUgVVJMIG9yIGRvaW5nIGEgc2lsZW50IG5hdmlnYXRpb24sIHdlIGRvIG5vdCB3YW50IHRvIGluY3JlbWVudCB0aGVcbiAgICAgICAgLy8gcGFnZSBpZCBiZWNhdXNlIHdlIGFyZW4ndCBwdXNoaW5nIGEgbmV3IGVudHJ5IHRvIGhpc3RvcnkuXG4gICAgICAgIGlmIChleHRyYXMucmVwbGFjZVVybCB8fCBleHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgICAgdGFyZ2V0UGFnZUlkID0gdGhpcy5icm93c2VyUGFnZUlkID8/IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGFyZ2V0UGFnZUlkID0gKHRoaXMuYnJvd3NlclBhZ2VJZCA/PyAwKSArIDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhpcyBpcyB1bnVzZWQgd2hlbiBgY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbmAgaXMgbm90IGNvbXB1dGVkLlxuICAgICAgdGFyZ2V0UGFnZUlkID0gMDtcbiAgICB9XG5cbiAgICB0aGlzLm5hdmlnYXRpb25UcmFuc2l0aW9ucy5oYW5kbGVOYXZpZ2F0aW9uUmVxdWVzdCh7XG4gICAgICB0YXJnZXRQYWdlSWQsXG4gICAgICBzb3VyY2UsXG4gICAgICByZXN0b3JlZFN0YXRlLFxuICAgICAgY3VycmVudFVybFRyZWU6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBjdXJyZW50UmF3VXJsOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgcmF3VXJsLFxuICAgICAgZXh0cmFzLFxuICAgICAgcmVzb2x2ZSxcbiAgICAgIHJlamVjdCxcbiAgICAgIHByb21pc2UsXG4gICAgICBjdXJyZW50U25hcHNob3Q6IHRoaXMucm91dGVyU3RhdGUuc25hcHNob3QsXG4gICAgICBjdXJyZW50Um91dGVyU3RhdGU6IHRoaXMucm91dGVyU3RhdGVcbiAgICB9KTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBlcnJvciBpcyBwcm9wYWdhdGVkIGV2ZW4gdGhvdWdoIGBwcm9jZXNzTmF2aWdhdGlvbnNgIGNhdGNoXG4gICAgLy8gaGFuZGxlciBkb2VzIG5vdCByZXRocm93XG4gICAgcmV0dXJuIHByb21pc2UuY2F0Y2goKGU6IGFueSkgPT4ge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBzZXRCcm93c2VyVXJsKHVybDogVXJsVHJlZSwgdHJhbnNpdGlvbjogTmF2aWdhdGlvblRyYW5zaXRpb24pIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICAgIGNvbnN0IHN0YXRlID0ge1xuICAgICAgLi4udHJhbnNpdGlvbi5leHRyYXMuc3RhdGUsXG4gICAgICAuLi50aGlzLmdlbmVyYXRlTmdSb3V0ZXJTdGF0ZSh0cmFuc2l0aW9uLmlkLCB0cmFuc2l0aW9uLnRhcmdldFBhZ2VJZClcbiAgICB9O1xuICAgIGlmICh0aGlzLmxvY2F0aW9uLmlzQ3VycmVudFBhdGhFcXVhbFRvKHBhdGgpIHx8ICEhdHJhbnNpdGlvbi5leHRyYXMucmVwbGFjZVVybCkge1xuICAgICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUocGF0aCwgJycsIHN0YXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5sb2NhdGlvbi5nbyhwYXRoLCAnJywgc3RhdGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtcyB0aGUgbmVjZXNzYXJ5IHJvbGxiYWNrIGFjdGlvbiB0byByZXN0b3JlIHRoZSBicm93c2VyIFVSTCB0byB0aGVcbiAgICogc3RhdGUgYmVmb3JlIHRoZSB0cmFuc2l0aW9uLlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHJlc3RvcmVIaXN0b3J5KHRyYW5zaXRpb246IE5hdmlnYXRpb25UcmFuc2l0aW9uLCByZXN0b3JpbmdGcm9tQ2F1Z2h0RXJyb3IgPSBmYWxzZSkge1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdjb21wdXRlZCcpIHtcbiAgICAgIGNvbnN0IHRhcmdldFBhZ2VQb3NpdGlvbiA9IHRoaXMuY3VycmVudFBhZ2VJZCAtIHRyYW5zaXRpb24udGFyZ2V0UGFnZUlkO1xuICAgICAgLy8gVGhlIG5hdmlnYXRvciBjaGFuZ2UgdGhlIGxvY2F0aW9uIGJlZm9yZSB0cmlnZ2VyZWQgdGhlIGJyb3dzZXIgZXZlbnQsXG4gICAgICAvLyBzbyB3ZSBuZWVkIHRvIGdvIGJhY2sgdG8gdGhlIGN1cnJlbnQgdXJsIGlmIHRoZSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGVkLlxuICAgICAgLy8gQWxzbywgd2hlbiBuYXZpZ2F0aW9uIGdldHMgY2FuY2VsbGVkIHdoaWxlIHVzaW5nIHVybCB1cGRhdGUgc3RyYXRlZ3kgZWFnZXIsIHRoZW4gd2UgbmVlZCB0b1xuICAgICAgLy8gZ28gYmFjay4gQmVjYXVzZSwgd2hlbiBgdXJsVXBkYXRlU3RyYXRlZ3lgIGlzIGBlYWdlcmA7IGBzZXRCcm93c2VyVXJsYCBtZXRob2QgaXMgY2FsbGVkXG4gICAgICAvLyBiZWZvcmUgYW55IHZlcmlmaWNhdGlvbi5cbiAgICAgIGNvbnN0IGJyb3dzZXJVcmxVcGRhdGVPY2N1cnJlZCA9XG4gICAgICAgICAgKHRyYW5zaXRpb24uc291cmNlID09PSAncG9wc3RhdGUnIHx8IHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcicgfHxcbiAgICAgICAgICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9PT0gdGhpcy5nZXRDdXJyZW50TmF2aWdhdGlvbigpPy5maW5hbFVybCk7XG4gICAgICBpZiAoYnJvd3NlclVybFVwZGF0ZU9jY3VycmVkICYmIHRhcmdldFBhZ2VQb3NpdGlvbiAhPT0gMCkge1xuICAgICAgICB0aGlzLmxvY2F0aW9uLmhpc3RvcnlHbyh0YXJnZXRQYWdlUG9zaXRpb24pO1xuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID09PSB0aGlzLmdldEN1cnJlbnROYXZpZ2F0aW9uKCk/LmZpbmFsVXJsICYmXG4gICAgICAgICAgdGFyZ2V0UGFnZVBvc2l0aW9uID09PSAwKSB7XG4gICAgICAgIC8vIFdlIGdvdCB0byB0aGUgYWN0aXZhdGlvbiBzdGFnZSAod2hlcmUgY3VycmVudFVybFRyZWUgaXMgc2V0IHRvIHRoZSBuYXZpZ2F0aW9uJ3NcbiAgICAgICAgLy8gZmluYWxVcmwpLCBidXQgd2Ugd2VyZW4ndCBtb3ZpbmcgYW55d2hlcmUgaW4gaGlzdG9yeSAoc2tpcExvY2F0aW9uQ2hhbmdlIG9yIHJlcGxhY2VVcmwpLlxuICAgICAgICAvLyBXZSBzdGlsbCBuZWVkIHRvIHJlc2V0IHRoZSByb3V0ZXIgc3RhdGUgYmFjayB0byB3aGF0IGl0IHdhcyB3aGVuIHRoZSBuYXZpZ2F0aW9uIHN0YXJ0ZWQuXG4gICAgICAgIHRoaXMucmVzZXRTdGF0ZSh0cmFuc2l0aW9uKTtcbiAgICAgICAgLy8gVE9ETyhhdHNjb3R0KTogcmVzZXR0aW5nIHRoZSBgYnJvd3NlclVybFRyZWVgIHNob3VsZCByZWFsbHkgYmUgZG9uZSBpbiBgcmVzZXRTdGF0ZWAuXG4gICAgICAgIC8vIEludmVzdGlnYXRlIGlmIHRoaXMgY2FuIGJlIGRvbmUgYnkgcnVubmluZyBUR1AuXG4gICAgICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0cmFuc2l0aW9uLmN1cnJlbnRVcmxUcmVlO1xuICAgICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhlIGJyb3dzZXIgVVJMIGFuZCByb3V0ZXIgc3RhdGUgd2FzIG5vdCB1cGRhdGVkIGJlZm9yZSB0aGUgbmF2aWdhdGlvbiBjYW5jZWxsZWQgc29cbiAgICAgICAgLy8gdGhlcmUncyBubyByZXN0b3JhdGlvbiBuZWVkZWQuXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdyZXBsYWNlJykge1xuICAgICAgLy8gVE9ETyhhdHNjb3R0KTogSXQgc2VlbXMgbGlrZSB3ZSBzaG91bGQgX2Fsd2F5c18gcmVzZXQgdGhlIHN0YXRlIGhlcmUuIEl0IHdvdWxkIGJlIGEgbm8tb3BcbiAgICAgIC8vIGZvciBgZGVmZXJyZWRgIG5hdmlnYXRpb25zIHRoYXQgaGF2ZW4ndCBjaGFuZ2UgdGhlIGludGVybmFsIHN0YXRlIHlldCBiZWNhdXNlIGd1YXJkc1xuICAgICAgLy8gcmVqZWN0LiBGb3IgJ2VhZ2VyJyBuYXZpZ2F0aW9ucywgaXQgc2VlbXMgbGlrZSB3ZSBhbHNvIHJlYWxseSBzaG91bGQgcmVzZXQgdGhlIHN0YXRlXG4gICAgICAvLyBiZWNhdXNlIHRoZSBuYXZpZ2F0aW9uIHdhcyBjYW5jZWxsZWQuIEludmVzdGlnYXRlIGlmIHRoaXMgY2FuIGJlIGRvbmUgYnkgcnVubmluZyBUR1AuXG4gICAgICBpZiAocmVzdG9yaW5nRnJvbUNhdWdodEVycm9yKSB7XG4gICAgICAgIHRoaXMucmVzZXRTdGF0ZSh0cmFuc2l0aW9uKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZXNldFN0YXRlKHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uKTogdm9pZCB7XG4gICAgKHRoaXMgYXMge3JvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZX0pLnJvdXRlclN0YXRlID0gdC5jdXJyZW50Um91dGVyU3RhdGU7XG4gICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IHQuY3VycmVudFVybFRyZWU7XG4gICAgLy8gTm90ZSBoZXJlIHRoYXQgd2UgdXNlIHRoZSB1cmxIYW5kbGluZ1N0cmF0ZWd5IHRvIGdldCB0aGUgcmVzZXQgYHJhd1VybFRyZWVgIGJlY2F1c2UgaXQgbWF5IGJlXG4gICAgLy8gY29uZmlndXJlZCB0byBoYW5kbGUgb25seSBwYXJ0IG9mIHRoZSBuYXZpZ2F0aW9uIFVSTC4gVGhpcyBtZWFucyB3ZSB3b3VsZCBvbmx5IHdhbnQgdG8gcmVzZXRcbiAgICAvLyB0aGUgcGFydCBvZiB0aGUgbmF2aWdhdGlvbiBoYW5kbGVkIGJ5IHRoZSBBbmd1bGFyIHJvdXRlciByYXRoZXIgdGhhbiB0aGUgd2hvbGUgVVJMLiBJblxuICAgIC8vIGFkZGl0aW9uLCB0aGUgVVJMSGFuZGxpbmdTdHJhdGVneSBtYXkgYmUgY29uZmlndXJlZCB0byBzcGVjaWZpY2FsbHkgcHJlc2VydmUgcGFydHMgb2YgdGhlIFVSTFxuICAgIC8vIHdoZW4gbWVyZ2luZywgc3VjaCBhcyB0aGUgcXVlcnkgcGFyYW1zIHNvIHRoZXkgYXJlIG5vdCBsb3N0IG9uIGEgcmVmcmVzaC5cbiAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodGhpcy5jdXJyZW50VXJsVHJlZSwgdC5yYXdVcmwpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTogdm9pZCB7XG4gICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUoXG4gICAgICAgIHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodGhpcy5yYXdVcmxUcmVlKSwgJycsXG4gICAgICAgIHRoaXMuZ2VuZXJhdGVOZ1JvdXRlclN0YXRlKHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCwgdGhpcy5jdXJyZW50UGFnZUlkKSk7XG4gIH1cblxuICBwcml2YXRlIGdlbmVyYXRlTmdSb3V0ZXJTdGF0ZShuYXZpZ2F0aW9uSWQ6IG51bWJlciwgcm91dGVyUGFnZUlkPzogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ2NvbXB1dGVkJykge1xuICAgICAgcmV0dXJuIHtuYXZpZ2F0aW9uSWQsIMm1cm91dGVyUGFnZUlkOiByb3V0ZXJQYWdlSWR9O1xuICAgIH1cbiAgICByZXR1cm4ge25hdmlnYXRpb25JZH07XG4gIH1cbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVDb21tYW5kcyhjb21tYW5kczogc3RyaW5nW10pOiB2b2lkIHtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb21tYW5kcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNtZCA9IGNvbW1hbmRzW2ldO1xuICAgIGlmIChjbWQgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLk5VTExJU0hfQ09NTUFORCxcbiAgICAgICAgICBOR19ERVZfTU9ERSAmJiBgVGhlIHJlcXVlc3RlZCBwYXRoIGNvbnRhaW5zICR7Y21kfSBzZWdtZW50IGF0IGluZGV4ICR7aX1gKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==