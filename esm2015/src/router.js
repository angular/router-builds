/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NgModuleRef, isDevMode } from '@angular/core';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { concatMap, map, mergeMap } from 'rxjs/operators';
import { applyRedirects } from './apply_redirects';
import { standardizeConfig, validateConfig } from './config';
import { createRouterState } from './create_router_state';
import { createUrlTree } from './create_url_tree';
import { ActivationEnd, ChildActivationEnd, GuardsCheckEnd, GuardsCheckStart, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, ResolveEnd, ResolveStart, RouteConfigLoadEnd, RouteConfigLoadStart, RoutesRecognized } from './events';
import { PreActivation } from './pre_activation';
import { recognize } from './recognize';
import { DefaultRouteReuseStrategy } from './route_reuse_strategy';
import { RouterConfigLoader } from './router_config_loader';
import { advanceActivatedRoute, createEmptyState } from './router_state';
import { isNavigationCancelingError } from './shared';
import { DefaultUrlHandlingStrategy } from './url_handling_strategy';
import { UrlTree, containsTree, createEmptyUrlTree } from './url_tree';
import { forEach } from './utils/collection';
import { nodeChildrenAsMap } from './utils/tree';
/**
 * \@description
 *
 * Represents the extra options used during navigation.
 *
 *
 * @record
 */
export function NavigationExtras() { }
/**
 * Enables relative navigation from the current ActivatedRoute.
 *
 * Configuration:
 *
 * ```
 * [{
 *   path: 'parent',
 *   component: ParentComponent,
 *   children: [{
 *     path: 'list',
 *     component: ListComponent
 *   },{
 *     path: 'child',
 *     component: ChildComponent
 *   }]
 * }]
 * ```
 *
 * Navigate to list route from child route:
 *
 * ```
 * \@Component({...})
 *  class ChildComponent {
 *    constructor(private router: Router, private route: ActivatedRoute) {}
 *
 *    go() {
 *      this.router.navigate(['../list'], { relativeTo: this.route });
 *    }
 *  }
 * ```
 * @type {?|undefined}
 */
NavigationExtras.prototype.relativeTo;
/**
 * Sets query parameters to the URL.
 *
 * ```
 * // Navigate to /results?page=1
 * this.router.navigate(['/results'], { queryParams: { page: 1 } });
 * ```
 * @type {?|undefined}
 */
NavigationExtras.prototype.queryParams;
/**
 * Sets the hash fragment for the URL.
 *
 * ```
 * // Navigate to /results#top
 * this.router.navigate(['/results'], { fragment: 'top' });
 * ```
 * @type {?|undefined}
 */
NavigationExtras.prototype.fragment;
/**
 * Preserves the query parameters for the next navigation.
 *
 * deprecated, use `queryParamsHandling` instead
 *
 * ```
 * // Preserve query params from /results?page=1 to /view?page=1
 * this.router.navigate(['/view'], { preserveQueryParams: true });
 * ```
 *
 * @deprecated since v4
 * @type {?|undefined}
 */
NavigationExtras.prototype.preserveQueryParams;
/**
 *  config strategy to handle the query parameters for the next navigation.
 *
 * ```
 * // from /results?page=1 to /view?page=1&page=2
 * this.router.navigate(['/view'], { queryParams: { page: 2 },  queryParamsHandling: "merge" });
 * ```
 * @type {?|undefined}
 */
NavigationExtras.prototype.queryParamsHandling;
/**
 * Preserves the fragment for the next navigation
 *
 * ```
 * // Preserve fragment from /results#top to /view#top
 * this.router.navigate(['/view'], { preserveFragment: true });
 * ```
 * @type {?|undefined}
 */
NavigationExtras.prototype.preserveFragment;
/**
 * Navigates without pushing a new state into history.
 *
 * ```
 * // Navigate silently to /view
 * this.router.navigate(['/view'], { skipLocationChange: true });
 * ```
 * @type {?|undefined}
 */
NavigationExtras.prototype.skipLocationChange;
/**
 * Navigates while replacing the current state in history.
 *
 * ```
 * // Navigate to /view
 * this.router.navigate(['/view'], { replaceUrl: true });
 * ```
 * @type {?|undefined}
 */
NavigationExtras.prototype.replaceUrl;
/** @typedef {?} */
var ErrorHandler;
export { ErrorHandler };
/**
 * @param {?} error
 * @return {?}
 */
function defaultErrorHandler(error) {
    throw error;
}
/**
 * @param {?} error
 * @param {?} urlSerializer
 * @param {?} url
 * @return {?}
 */
function defaultMalformedUriErrorHandler(error, urlSerializer, url) {
    return urlSerializer.parse('/');
}
/** @typedef {?} */
var NavStreamValue;
/** @typedef {?} */
var NavigationParams;
/** @typedef {?} */
var RouterHook;
export { RouterHook };
/**
 * \@internal
 * @param {?} snapshot
 * @param {?} runExtras
 * @return {?}
 */
function defaultRouterHook(snapshot, runExtras) {
    return /** @type {?} */ (of(null));
}
/**
 * \@description
 *
 * Provides the navigation and url manipulation capabilities.
 *
 * See `Routes` for more details and examples.
 *
 * \@ngModule RouterModule
 *
 *
 */
export class Router {
    /**
     * Creates the router service.
     * @param {?} rootComponentType
     * @param {?} urlSerializer
     * @param {?} rootContexts
     * @param {?} location
     * @param {?} injector
     * @param {?} loader
     * @param {?} compiler
     * @param {?} config
     */
    constructor(rootComponentType, urlSerializer, rootContexts, location, injector, loader, compiler, config) {
        this.rootComponentType = rootComponentType;
        this.urlSerializer = urlSerializer;
        this.rootContexts = rootContexts;
        this.location = location;
        this.config = config;
        this.navigations = new BehaviorSubject(/** @type {?} */ ((null)));
        this.navigationId = 0;
        this.events = new Subject();
        /**
         * Error handler that is invoked when a navigation errors.
         *
         * See `ErrorHandler` for more information.
         */
        this.errorHandler = defaultErrorHandler;
        /**
         * Malformed uri error handler is invoked when `Router.parseUrl(url)` throws an
         * error due to containing an invalid character. The most common case would be a `%` sign
         * that's not encoded and is not part of a percent encoded sequence.
         */
        this.malformedUriErrorHandler = defaultMalformedUriErrorHandler;
        /**
         * Indicates if at least one navigation happened.
         */
        this.navigated = false;
        this.lastSuccessfulId = -1;
        /**
         * Used by RouterModule. This allows us to
         * pause the navigation either before preactivation or after it.
         * \@internal
         */
        this.hooks = {
            beforePreactivation: defaultRouterHook,
            afterPreactivation: defaultRouterHook
        };
        /**
         * Extracts and merges URLs. Used for AngularJS to Angular migrations.
         */
        this.urlHandlingStrategy = new DefaultUrlHandlingStrategy();
        this.routeReuseStrategy = new DefaultRouteReuseStrategy();
        /**
         * Define what the router should do if it receives a navigation request to the current URL.
         * By default, the router will ignore this navigation. However, this prevents features such
         * as a "refresh" button. Use this option to configure the behavior when navigating to the
         * current URL. Default is 'ignore'.
         */
        this.onSameUrlNavigation = 'ignore';
        /**
         * Defines how the router merges params, data and resolved data from parent to child
         * routes. Available options are:
         *
         * - `'emptyOnly'`, the default, only inherits parent params for path-less or component-less
         *   routes.
         * - `'always'`, enables unconditional inheritance of parent params.
         */
        this.paramsInheritanceStrategy = 'emptyOnly';
        /** @type {?} */
        const onLoadStart = (r) => this.triggerEvent(new RouteConfigLoadStart(r));
        /** @type {?} */
        const onLoadEnd = (r) => this.triggerEvent(new RouteConfigLoadEnd(r));
        this.ngModule = injector.get(NgModuleRef);
        this.resetConfig(config);
        this.currentUrlTree = createEmptyUrlTree();
        this.rawUrlTree = this.currentUrlTree;
        this.configLoader = new RouterConfigLoader(loader, compiler, onLoadStart, onLoadEnd);
        this.routerState = createEmptyState(this.currentUrlTree, this.rootComponentType);
        this.processNavigations();
    }
    /**
     * \@internal
     * TODO: this should be removed once the constructor of the router made internal
     * @param {?} rootComponentType
     * @return {?}
     */
    resetRootComponentType(rootComponentType) {
        this.rootComponentType = rootComponentType;
        // TODO: vsavkin router 4.0 should make the root component set to null
        // this will simplify the lifecycle of the router.
        this.routerState.root.component = this.rootComponentType;
    }
    /**
     * Sets up the location change listener and performs the initial navigation.
     * @return {?}
     */
    initialNavigation() {
        this.setUpLocationChangeListener();
        if (this.navigationId === 0) {
            this.navigateByUrl(this.location.path(true), { replaceUrl: true });
        }
    }
    /**
     * Sets up the location change listener.
     * @return {?}
     */
    setUpLocationChangeListener() {
        // Don't need to use Zone.wrap any more, because zone.js
        // already patch onPopState, so location change callback will
        // run into ngZone
        if (!this.locationSubscription) {
            this.locationSubscription = /** @type {?} */ (this.location.subscribe((change) => {
                /** @type {?} */
                let rawUrlTree = this.parseUrl(change['url']);
                /** @type {?} */
                const source = change['type'] === 'popstate' ? 'popstate' : 'hashchange';
                /** @type {?} */
                const state = change.state && change.state.navigationId ?
                    { navigationId: change.state.navigationId } :
                    null;
                setTimeout(() => { this.scheduleNavigation(rawUrlTree, source, state, { replaceUrl: true }); }, 0);
            }));
        }
    }
    /**
     * The current url
     * @return {?}
     */
    get url() { return this.serializeUrl(this.currentUrlTree); }
    /**
     * \@internal
     * @param {?} e
     * @return {?}
     */
    triggerEvent(e) { (/** @type {?} */ (this.events)).next(e); }
    /**
     * Resets the configuration used for navigation and generating links.
     *
     * ### Usage
     *
     * ```
     * router.resetConfig([
     *  { path: 'team/:id', component: TeamCmp, children: [
     *    { path: 'simple', component: SimpleCmp },
     *    { path: 'user/:name', component: UserCmp }
     *  ]}
     * ]);
     * ```
     * @param {?} config
     * @return {?}
     */
    resetConfig(config) {
        validateConfig(config);
        this.config = config.map(standardizeConfig);
        this.navigated = false;
        this.lastSuccessfulId = -1;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    ngOnDestroy() { this.dispose(); }
    /**
     * Disposes of the router
     * @return {?}
     */
    dispose() {
        if (this.locationSubscription) {
            this.locationSubscription.unsubscribe();
            this.locationSubscription = /** @type {?} */ ((null));
        }
    }
    /**
     * Applies an array of commands to the current url tree and creates a new url tree.
     *
     * When given an activate route, applies the given commands starting from the route.
     * When not given a route, applies the given command starting from the root.
     *
     * ### Usage
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
     * // If the first segment can contain slashes, and you do not want the router to split it, you
     * // can do the following:
     *
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
     * ```
     * @param {?} commands
     * @param {?=} navigationExtras
     * @return {?}
     */
    createUrlTree(commands, navigationExtras = {}) {
        const { relativeTo, queryParams, fragment, preserveQueryParams, queryParamsHandling, preserveFragment } = navigationExtras;
        if (isDevMode() && preserveQueryParams && /** @type {?} */ (console) && /** @type {?} */ (console.warn)) {
            console.warn('preserveQueryParams is deprecated, use queryParamsHandling instead.');
        }
        /** @type {?} */
        const a = relativeTo || this.routerState.root;
        /** @type {?} */
        const f = preserveFragment ? this.currentUrlTree.fragment : fragment;
        /** @type {?} */
        let q = null;
        if (queryParamsHandling) {
            switch (queryParamsHandling) {
                case 'merge':
                    q = Object.assign({}, this.currentUrlTree.queryParams, queryParams);
                    break;
                case 'preserve':
                    q = this.currentUrlTree.queryParams;
                    break;
                default:
                    q = queryParams || null;
            }
        }
        else {
            q = preserveQueryParams ? this.currentUrlTree.queryParams : queryParams || null;
        }
        if (q !== null) {
            q = this.removeEmptyProps(q);
        }
        return createUrlTree(a, this.currentUrlTree, commands, /** @type {?} */ ((q)), /** @type {?} */ ((f)));
    }
    /**
     * Navigate based on the provided url. This navigation is always absolute.
     *
     * Returns a promise that:
     * - resolves to 'true' when navigation succeeds,
     * - resolves to 'false' when navigation fails,
     * - is rejected when an error happens.
     *
     * ### Usage
     *
     * ```
     * router.navigateByUrl("/team/33/user/11");
     *
     * // Navigate without updating the URL
     * router.navigateByUrl("/team/33/user/11", { skipLocationChange: true });
     * ```
     *
     * In opposite to `navigate`, `navigateByUrl` takes a whole URL
     * and does not apply any delta to the current one.
     * @param {?} url
     * @param {?=} extras
     * @return {?}
     */
    navigateByUrl(url, extras = { skipLocationChange: false }) {
        /** @type {?} */
        const urlTree = url instanceof UrlTree ? url : this.parseUrl(url);
        /** @type {?} */
        const mergedTree = this.urlHandlingStrategy.merge(urlTree, this.rawUrlTree);
        return this.scheduleNavigation(mergedTree, 'imperative', null, extras);
    }
    /**
     * Navigate based on the provided array of commands and a starting point.
     * If no starting route is provided, the navigation is absolute.
     *
     * Returns a promise that:
     * - resolves to 'true' when navigation succeeds,
     * - resolves to 'false' when navigation fails,
     * - is rejected when an error happens.
     *
     * ### Usage
     *
     * ```
     * router.navigate(['team', 33, 'user', 11], {relativeTo: route});
     *
     * // Navigate without updating the URL
     * router.navigate(['team', 33, 'user', 11], {relativeTo: route, skipLocationChange: true});
     * ```
     *
     * In opposite to `navigateByUrl`, `navigate` always takes a delta that is applied to the current
     * URL.
     * @param {?} commands
     * @param {?=} extras
     * @return {?}
     */
    navigate(commands, extras = { skipLocationChange: false }) {
        validateCommands(commands);
        return this.navigateByUrl(this.createUrlTree(commands, extras), extras);
    }
    /**
     * Serializes a `UrlTree` into a string
     * @param {?} url
     * @return {?}
     */
    serializeUrl(url) { return this.urlSerializer.serialize(url); }
    /**
     * Parses a string into a `UrlTree`
     * @param {?} url
     * @return {?}
     */
    parseUrl(url) {
        /** @type {?} */
        let urlTree;
        try {
            urlTree = this.urlSerializer.parse(url);
        }
        catch (e) {
            urlTree = this.malformedUriErrorHandler(e, this.urlSerializer, url);
        }
        return urlTree;
    }
    /**
     * Returns whether the url is activated
     * @param {?} url
     * @param {?} exact
     * @return {?}
     */
    isActive(url, exact) {
        if (url instanceof UrlTree) {
            return containsTree(this.currentUrlTree, url, exact);
        }
        /** @type {?} */
        const urlTree = this.parseUrl(url);
        return containsTree(this.currentUrlTree, urlTree, exact);
    }
    /**
     * @param {?} params
     * @return {?}
     */
    removeEmptyProps(params) {
        return Object.keys(params).reduce((result, key) => {
            /** @type {?} */
            const value = params[key];
            if (value !== null && value !== undefined) {
                result[key] = value;
            }
            return result;
        }, {});
    }
    /**
     * @return {?}
     */
    processNavigations() {
        this.navigations
            .pipe(concatMap((nav) => {
            if (nav) {
                this.executeScheduledNavigation(nav);
                // a failed navigation should not stop the router from processing
                // further navigations => the catch
                return nav.promise.catch(() => { });
            }
            else {
                return /** @type {?} */ (of(null));
            }
        }))
            .subscribe(() => { });
    }
    /**
     * @param {?} rawUrl
     * @param {?} source
     * @param {?} state
     * @param {?} extras
     * @return {?}
     */
    scheduleNavigation(rawUrl, source, state, extras) {
        /** @type {?} */
        const lastNavigation = this.navigations.value;
        // If the user triggers a navigation imperatively (e.g., by using navigateByUrl),
        // and that navigation results in 'replaceState' that leads to the same URL,
        // we should skip those.
        if (lastNavigation && source !== 'imperative' && lastNavigation.source === 'imperative' &&
            lastNavigation.rawUrl.toString() === rawUrl.toString()) {
            return Promise.resolve(true); // return value is not used
        }
        // Because of a bug in IE and Edge, the location class fires two events (popstate and
        // hashchange) every single time. The second one should be ignored. Otherwise, the URL will
        // flicker. Handles the case when a popstate was emitted first.
        if (lastNavigation && source == 'hashchange' && lastNavigation.source === 'popstate' &&
            lastNavigation.rawUrl.toString() === rawUrl.toString()) {
            return Promise.resolve(true); // return value is not used
        }
        // Because of a bug in IE and Edge, the location class fires two events (popstate and
        // hashchange) every single time. The second one should be ignored. Otherwise, the URL will
        // flicker. Handles the case when a hashchange was emitted first.
        if (lastNavigation && source == 'popstate' && lastNavigation.source === 'hashchange' &&
            lastNavigation.rawUrl.toString() === rawUrl.toString()) {
            return Promise.resolve(true); // return value is not used
        }
        /** @type {?} */
        let resolve = null;
        /** @type {?} */
        let reject = null;
        /** @type {?} */
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        /** @type {?} */
        const id = ++this.navigationId;
        this.navigations.next({ id, source, state, rawUrl, extras, resolve, reject, promise });
        // Make sure that the error is propagated even though `processNavigations` catch
        // handler does not rethrow
        return promise.catch((e) => Promise.reject(e));
    }
    /**
     * @param {?} __0
     * @return {?}
     */
    executeScheduledNavigation({ id, rawUrl, extras, resolve, reject, source, state }) {
        /** @type {?} */
        const url = this.urlHandlingStrategy.extract(rawUrl);
        /** @type {?} */
        const urlTransition = !this.navigated || url.toString() !== this.currentUrlTree.toString();
        if ((this.onSameUrlNavigation === 'reload' ? true : urlTransition) &&
            this.urlHandlingStrategy.shouldProcessUrl(rawUrl)) {
            (/** @type {?} */ (this.events))
                .next(new NavigationStart(id, this.serializeUrl(url), source, state));
            Promise.resolve()
                .then((_) => this.runNavigate(url, rawUrl, !!extras.skipLocationChange, !!extras.replaceUrl, id, null))
                .then(resolve, reject);
            // we cannot process the current URL, but we could process the previous one =>
            // we need to do some cleanup
        }
        else if (urlTransition && this.rawUrlTree &&
            this.urlHandlingStrategy.shouldProcessUrl(this.rawUrlTree)) {
            (/** @type {?} */ (this.events))
                .next(new NavigationStart(id, this.serializeUrl(url), source, state));
            Promise.resolve()
                .then((_) => this.runNavigate(url, rawUrl, false, false, id, createEmptyState(url, this.rootComponentType).snapshot))
                .then(resolve, reject);
        }
        else {
            this.rawUrlTree = rawUrl;
            resolve(null);
        }
    }
    /**
     * @param {?} url
     * @param {?} rawUrl
     * @param {?} skipLocationChange
     * @param {?} replaceUrl
     * @param {?} id
     * @param {?} precreatedState
     * @return {?}
     */
    runNavigate(url, rawUrl, skipLocationChange, replaceUrl, id, precreatedState) {
        if (id !== this.navigationId) {
            (/** @type {?} */ (this.events))
                .next(new NavigationCancel(id, this.serializeUrl(url), `Navigation ID ${id} is not equal to the current navigation id ${this.navigationId}`));
            return Promise.resolve(false);
        }
        return new Promise((resolvePromise, rejectPromise) => {
            /** @type {?} */
            let urlAndSnapshot$;
            if (!precreatedState) {
                /** @type {?} */
                const moduleInjector = this.ngModule.injector;
                /** @type {?} */
                const redirectsApplied$ = applyRedirects(moduleInjector, this.configLoader, this.urlSerializer, url, this.config);
                urlAndSnapshot$ = redirectsApplied$.pipe(mergeMap((appliedUrl) => {
                    return recognize(this.rootComponentType, this.config, appliedUrl, this.serializeUrl(appliedUrl), this.paramsInheritanceStrategy)
                        .pipe(map((snapshot) => {
                        (/** @type {?} */ (this.events))
                            .next(new RoutesRecognized(id, this.serializeUrl(url), this.serializeUrl(appliedUrl), snapshot));
                        return { appliedUrl, snapshot };
                    }));
                }));
            }
            else {
                urlAndSnapshot$ = of({ appliedUrl: url, snapshot: precreatedState });
            }
            /** @type {?} */
            const beforePreactivationDone$ = urlAndSnapshot$.pipe(mergeMap((p) => {
                if (typeof p === 'boolean')
                    return of(p);
                return this.hooks
                    .beforePreactivation(p.snapshot, {
                    navigationId: id,
                    appliedUrlTree: url,
                    rawUrlTree: rawUrl, skipLocationChange, replaceUrl,
                })
                    .pipe(map(() => p));
            }));
            /** @type {?} */
            let preActivation;
            /** @type {?} */
            const preactivationSetup$ = beforePreactivationDone$.pipe(map((p) => {
                if (typeof p === 'boolean')
                    return p;
                const { appliedUrl, snapshot } = p;
                /** @type {?} */
                const moduleInjector = this.ngModule.injector;
                preActivation = new PreActivation(snapshot, this.routerState.snapshot, moduleInjector, (evt) => this.triggerEvent(evt));
                preActivation.initialize(this.rootContexts);
                return { appliedUrl, snapshot };
            }));
            /** @type {?} */
            const preactivationCheckGuards$ = preactivationSetup$.pipe(mergeMap((p) => {
                if (typeof p === 'boolean' || this.navigationId !== id)
                    return of(false);
                const { appliedUrl, snapshot } = p;
                this.triggerEvent(new GuardsCheckStart(id, this.serializeUrl(url), this.serializeUrl(appliedUrl), snapshot));
                return preActivation.checkGuards().pipe(map((shouldActivate) => {
                    this.triggerEvent(new GuardsCheckEnd(id, this.serializeUrl(url), this.serializeUrl(appliedUrl), snapshot, shouldActivate));
                    return { appliedUrl: appliedUrl, snapshot: snapshot, shouldActivate: shouldActivate };
                }));
            }));
            /** @type {?} */
            const preactivationResolveData$ = preactivationCheckGuards$.pipe(mergeMap((p) => {
                if (typeof p === 'boolean' || this.navigationId !== id)
                    return of(false);
                if (p.shouldActivate && preActivation.isActivating()) {
                    this.triggerEvent(new ResolveStart(id, this.serializeUrl(url), this.serializeUrl(p.appliedUrl), p.snapshot));
                    return preActivation.resolveData(this.paramsInheritanceStrategy).pipe(map(() => {
                        this.triggerEvent(new ResolveEnd(id, this.serializeUrl(url), this.serializeUrl(p.appliedUrl), p.snapshot));
                        return p;
                    }));
                }
                else {
                    return of(p);
                }
            }));
            /** @type {?} */
            const preactivationDone$ = preactivationResolveData$.pipe(mergeMap((p) => {
                if (typeof p === 'boolean' || this.navigationId !== id)
                    return of(false);
                return this.hooks
                    .afterPreactivation(p.snapshot, {
                    navigationId: id,
                    appliedUrlTree: url,
                    rawUrlTree: rawUrl, skipLocationChange, replaceUrl,
                })
                    .pipe(map(() => p));
            }));
            /** @type {?} */
            const routerState$ = preactivationDone$.pipe(map((p) => {
                if (typeof p === 'boolean' || this.navigationId !== id)
                    return false;
                const { appliedUrl, snapshot, shouldActivate } = p;
                if (shouldActivate) {
                    /** @type {?} */
                    const state = createRouterState(this.routeReuseStrategy, snapshot, this.routerState);
                    return { appliedUrl, state, shouldActivate };
                }
                else {
                    return { appliedUrl, state: null, shouldActivate };
                }
            }));
            this.activateRoutes(routerState$, this.routerState, this.currentUrlTree, id, url, rawUrl, skipLocationChange, replaceUrl, resolvePromise, rejectPromise);
        });
    }
    /**
     * Performs the logic of activating routes. This is a synchronous process by default. While this
     * is a private method, it could be overridden to make activation asynchronous.
     * @param {?} state
     * @param {?} storedState
     * @param {?} storedUrl
     * @param {?} id
     * @param {?} url
     * @param {?} rawUrl
     * @param {?} skipLocationChange
     * @param {?} replaceUrl
     * @param {?} resolvePromise
     * @param {?} rejectPromise
     * @return {?}
     */
    activateRoutes(state, storedState, storedUrl, id, url, rawUrl, skipLocationChange, replaceUrl, resolvePromise, rejectPromise) {
        /** @type {?} */
        let navigationIsSuccessful;
        state
            .forEach((p) => {
            if (typeof p === 'boolean' || !p.shouldActivate || id !== this.navigationId || !p.state) {
                navigationIsSuccessful = false;
                return;
            }
            const { appliedUrl, state } = p;
            this.currentUrlTree = appliedUrl;
            this.rawUrlTree = this.urlHandlingStrategy.merge(this.currentUrlTree, rawUrl);
            (/** @type {?} */ (this)).routerState = state;
            if (!skipLocationChange) {
                /** @type {?} */
                const path = this.urlSerializer.serialize(this.rawUrlTree);
                if (this.location.isCurrentPathEqualTo(path) || replaceUrl) {
                    this.location.replaceState(path, '', { navigationId: id });
                }
                else {
                    this.location.go(path, '', { navigationId: id });
                }
            }
            new ActivateRoutes(this.routeReuseStrategy, state, storedState, (evt) => this.triggerEvent(evt))
                .activate(this.rootContexts);
            navigationIsSuccessful = true;
        })
            .then(() => {
            if (navigationIsSuccessful) {
                this.navigated = true;
                this.lastSuccessfulId = id;
                (/** @type {?} */ (this.events))
                    .next(new NavigationEnd(id, this.serializeUrl(url), this.serializeUrl(this.currentUrlTree)));
                resolvePromise(true);
            }
            else {
                this.resetUrlToCurrentUrlTree();
                (/** @type {?} */ (this.events))
                    .next(new NavigationCancel(id, this.serializeUrl(url), ''));
                resolvePromise(false);
            }
        }, (e) => {
            if (isNavigationCancelingError(e)) {
                this.navigated = true;
                this.resetStateAndUrl(storedState, storedUrl, rawUrl);
                (/** @type {?} */ (this.events))
                    .next(new NavigationCancel(id, this.serializeUrl(url), e.message));
                resolvePromise(false);
            }
            else {
                this.resetStateAndUrl(storedState, storedUrl, rawUrl);
                (/** @type {?} */ (this.events))
                    .next(new NavigationError(id, this.serializeUrl(url), e));
                try {
                    resolvePromise(this.errorHandler(e));
                }
                catch (ee) {
                    rejectPromise(ee);
                }
            }
        });
    }
    /**
     * @param {?} storedState
     * @param {?} storedUrl
     * @param {?} rawUrl
     * @return {?}
     */
    resetStateAndUrl(storedState, storedUrl, rawUrl) {
        (/** @type {?} */ (this)).routerState = storedState;
        this.currentUrlTree = storedUrl;
        this.rawUrlTree = this.urlHandlingStrategy.merge(this.currentUrlTree, rawUrl);
        this.resetUrlToCurrentUrlTree();
    }
    /**
     * @return {?}
     */
    resetUrlToCurrentUrlTree() {
        this.location.replaceState(this.urlSerializer.serialize(this.rawUrlTree), '', { navigationId: this.lastSuccessfulId });
    }
}
if (false) {
    /** @type {?} */
    Router.prototype.currentUrlTree;
    /** @type {?} */
    Router.prototype.rawUrlTree;
    /** @type {?} */
    Router.prototype.navigations;
    /** @type {?} */
    Router.prototype.locationSubscription;
    /** @type {?} */
    Router.prototype.navigationId;
    /** @type {?} */
    Router.prototype.configLoader;
    /** @type {?} */
    Router.prototype.ngModule;
    /** @type {?} */
    Router.prototype.events;
    /** @type {?} */
    Router.prototype.routerState;
    /**
     * Error handler that is invoked when a navigation errors.
     *
     * See `ErrorHandler` for more information.
     * @type {?}
     */
    Router.prototype.errorHandler;
    /**
     * Malformed uri error handler is invoked when `Router.parseUrl(url)` throws an
     * error due to containing an invalid character. The most common case would be a `%` sign
     * that's not encoded and is not part of a percent encoded sequence.
     * @type {?}
     */
    Router.prototype.malformedUriErrorHandler;
    /**
     * Indicates if at least one navigation happened.
     * @type {?}
     */
    Router.prototype.navigated;
    /** @type {?} */
    Router.prototype.lastSuccessfulId;
    /**
     * Used by RouterModule. This allows us to
     * pause the navigation either before preactivation or after it.
     * \@internal
     * @type {?}
     */
    Router.prototype.hooks;
    /**
     * Extracts and merges URLs. Used for AngularJS to Angular migrations.
     * @type {?}
     */
    Router.prototype.urlHandlingStrategy;
    /** @type {?} */
    Router.prototype.routeReuseStrategy;
    /**
     * Define what the router should do if it receives a navigation request to the current URL.
     * By default, the router will ignore this navigation. However, this prevents features such
     * as a "refresh" button. Use this option to configure the behavior when navigating to the
     * current URL. Default is 'ignore'.
     * @type {?}
     */
    Router.prototype.onSameUrlNavigation;
    /**
     * Defines how the router merges params, data and resolved data from parent to child
     * routes. Available options are:
     *
     * - `'emptyOnly'`, the default, only inherits parent params for path-less or component-less
     *   routes.
     * - `'always'`, enables unconditional inheritance of parent params.
     * @type {?}
     */
    Router.prototype.paramsInheritanceStrategy;
    /** @type {?} */
    Router.prototype.rootComponentType;
    /** @type {?} */
    Router.prototype.urlSerializer;
    /** @type {?} */
    Router.prototype.rootContexts;
    /** @type {?} */
    Router.prototype.location;
    /** @type {?} */
    Router.prototype.config;
}
class ActivateRoutes {
    /**
     * @param {?} routeReuseStrategy
     * @param {?} futureState
     * @param {?} currState
     * @param {?} forwardEvent
     */
    constructor(routeReuseStrategy, futureState, currState, forwardEvent) {
        this.routeReuseStrategy = routeReuseStrategy;
        this.futureState = futureState;
        this.currState = currState;
        this.forwardEvent = forwardEvent;
    }
    /**
     * @param {?} parentContexts
     * @return {?}
     */
    activate(parentContexts) {
        /** @type {?} */
        const futureRoot = this.futureState._root;
        /** @type {?} */
        const currRoot = this.currState ? this.currState._root : null;
        this.deactivateChildRoutes(futureRoot, currRoot, parentContexts);
        advanceActivatedRoute(this.futureState.root);
        this.activateChildRoutes(futureRoot, currRoot, parentContexts);
    }
    /**
     * @param {?} futureNode
     * @param {?} currNode
     * @param {?} contexts
     * @return {?}
     */
    deactivateChildRoutes(futureNode, currNode, contexts) {
        /** @type {?} */
        const children = nodeChildrenAsMap(currNode);
        // Recurse on the routes active in the future state to de-activate deeper children
        futureNode.children.forEach(futureChild => {
            /** @type {?} */
            const childOutletName = futureChild.value.outlet;
            this.deactivateRoutes(futureChild, children[childOutletName], contexts);
            delete children[childOutletName];
        });
        // De-activate the routes that will not be re-used
        forEach(children, (v, childName) => {
            this.deactivateRouteAndItsChildren(v, contexts);
        });
    }
    /**
     * @param {?} futureNode
     * @param {?} currNode
     * @param {?} parentContext
     * @return {?}
     */
    deactivateRoutes(futureNode, currNode, parentContext) {
        /** @type {?} */
        const future = futureNode.value;
        /** @type {?} */
        const curr = currNode ? currNode.value : null;
        if (future === curr) {
            // Reusing the node, check to see if the children need to be de-activated
            if (future.component) {
                /** @type {?} */
                const context = parentContext.getContext(future.outlet);
                if (context) {
                    this.deactivateChildRoutes(futureNode, currNode, context.children);
                }
            }
            else {
                // if we have a componentless route, we recurse but keep the same outlet map.
                this.deactivateChildRoutes(futureNode, currNode, parentContext);
            }
        }
        else {
            if (curr) {
                // Deactivate the current route which will not be re-used
                this.deactivateRouteAndItsChildren(currNode, parentContext);
            }
        }
    }
    /**
     * @param {?} route
     * @param {?} parentContexts
     * @return {?}
     */
    deactivateRouteAndItsChildren(route, parentContexts) {
        if (this.routeReuseStrategy.shouldDetach(route.value.snapshot)) {
            this.detachAndStoreRouteSubtree(route, parentContexts);
        }
        else {
            this.deactivateRouteAndOutlet(route, parentContexts);
        }
    }
    /**
     * @param {?} route
     * @param {?} parentContexts
     * @return {?}
     */
    detachAndStoreRouteSubtree(route, parentContexts) {
        /** @type {?} */
        const context = parentContexts.getContext(route.value.outlet);
        if (context && context.outlet) {
            /** @type {?} */
            const componentRef = context.outlet.detach();
            /** @type {?} */
            const contexts = context.children.onOutletDeactivated();
            this.routeReuseStrategy.store(route.value.snapshot, { componentRef, route, contexts });
        }
    }
    /**
     * @param {?} route
     * @param {?} parentContexts
     * @return {?}
     */
    deactivateRouteAndOutlet(route, parentContexts) {
        /** @type {?} */
        const context = parentContexts.getContext(route.value.outlet);
        if (context) {
            /** @type {?} */
            const children = nodeChildrenAsMap(route);
            /** @type {?} */
            const contexts = route.value.component ? context.children : parentContexts;
            forEach(children, (v, k) => this.deactivateRouteAndItsChildren(v, contexts));
            if (context.outlet) {
                // Destroy the component
                context.outlet.deactivate();
                // Destroy the contexts for all the outlets that were in the component
                context.children.onOutletDeactivated();
            }
        }
    }
    /**
     * @param {?} futureNode
     * @param {?} currNode
     * @param {?} contexts
     * @return {?}
     */
    activateChildRoutes(futureNode, currNode, contexts) {
        /** @type {?} */
        const children = nodeChildrenAsMap(currNode);
        futureNode.children.forEach(c => {
            this.activateRoutes(c, children[c.value.outlet], contexts);
            this.forwardEvent(new ActivationEnd(c.value.snapshot));
        });
        if (futureNode.children.length) {
            this.forwardEvent(new ChildActivationEnd(futureNode.value.snapshot));
        }
    }
    /**
     * @param {?} futureNode
     * @param {?} currNode
     * @param {?} parentContexts
     * @return {?}
     */
    activateRoutes(futureNode, currNode, parentContexts) {
        /** @type {?} */
        const future = futureNode.value;
        /** @type {?} */
        const curr = currNode ? currNode.value : null;
        advanceActivatedRoute(future);
        // reusing the node
        if (future === curr) {
            if (future.component) {
                /** @type {?} */
                const context = parentContexts.getOrCreateContext(future.outlet);
                this.activateChildRoutes(futureNode, currNode, context.children);
            }
            else {
                // if we have a componentless route, we recurse but keep the same outlet map.
                this.activateChildRoutes(futureNode, currNode, parentContexts);
            }
        }
        else {
            if (future.component) {
                /** @type {?} */
                const context = parentContexts.getOrCreateContext(future.outlet);
                if (this.routeReuseStrategy.shouldAttach(future.snapshot)) {
                    /** @type {?} */
                    const stored = (/** @type {?} */ (this.routeReuseStrategy.retrieve(future.snapshot)));
                    this.routeReuseStrategy.store(future.snapshot, null);
                    context.children.onOutletReAttached(stored.contexts);
                    context.attachRef = stored.componentRef;
                    context.route = stored.route.value;
                    if (context.outlet) {
                        // Attach right away when the outlet has already been instantiated
                        // Otherwise attach from `RouterOutlet.ngOnInit` when it is instantiated
                        context.outlet.attach(stored.componentRef, stored.route.value);
                    }
                    advanceActivatedRouteNodeAndItsChildren(stored.route);
                }
                else {
                    /** @type {?} */
                    const config = parentLoadedConfig(future.snapshot);
                    /** @type {?} */
                    const cmpFactoryResolver = config ? config.module.componentFactoryResolver : null;
                    context.route = future;
                    context.resolver = cmpFactoryResolver;
                    if (context.outlet) {
                        // Activate the outlet when it has already been instantiated
                        // Otherwise it will get activated from its `ngOnInit` when instantiated
                        context.outlet.activateWith(future, cmpFactoryResolver);
                    }
                    this.activateChildRoutes(futureNode, null, context.children);
                }
            }
            else {
                // if we have a componentless route, we recurse but keep the same outlet map.
                this.activateChildRoutes(futureNode, null, parentContexts);
            }
        }
    }
}
if (false) {
    /** @type {?} */
    ActivateRoutes.prototype.routeReuseStrategy;
    /** @type {?} */
    ActivateRoutes.prototype.futureState;
    /** @type {?} */
    ActivateRoutes.prototype.currState;
    /** @type {?} */
    ActivateRoutes.prototype.forwardEvent;
}
/**
 * @param {?} node
 * @return {?}
 */
function advanceActivatedRouteNodeAndItsChildren(node) {
    advanceActivatedRoute(node.value);
    node.children.forEach(advanceActivatedRouteNodeAndItsChildren);
}
/**
 * @param {?} snapshot
 * @return {?}
 */
function parentLoadedConfig(snapshot) {
    for (let s = snapshot.parent; s; s = s.parent) {
        /** @type {?} */
        const route = s.routeConfig;
        if (route && route._loadedConfig)
            return route._loadedConfig;
        if (route && route.component)
            return null;
    }
    return null;
}
/**
 * @param {?} commands
 * @return {?}
 */
function validateCommands(commands) {
    for (let i = 0; i < commands.length; i++) {
        /** @type {?} */
        const cmd = commands[i];
        if (cmd == null) {
            throw new Error(`The requested path contains ${cmd} segment at index ${i}`);
        }
    }
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFTQSxPQUFPLEVBQTRDLFdBQVcsRUFBUSxTQUFTLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdEcsT0FBTyxFQUFDLGVBQWUsRUFBYyxPQUFPLEVBQWdCLEVBQUUsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUM3RSxPQUFPLEVBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUV4RCxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDakQsT0FBTyxFQUF5RCxpQkFBaUIsRUFBRSxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDbkgsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDeEQsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ2hELE9BQU8sRUFBQyxhQUFhLEVBQUUsa0JBQWtCLEVBQVMsY0FBYyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFxQixVQUFVLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ2hSLE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUMvQyxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ3RDLE9BQU8sRUFBQyx5QkFBeUIsRUFBa0QsTUFBTSx3QkFBd0IsQ0FBQztBQUNsSCxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUUxRCxPQUFPLEVBQTJFLHFCQUFxQixFQUFFLGdCQUFnQixFQUE2QixNQUFN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QWE7WUFBRSxPQUFPLEtBQUssQ0FBQyxhQUFhLENBQUM7UUFDN0QsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLFNBQVM7WUFBRSxPQUFPLElBQUksQ0FBQztLQUMzQztJQUVELE9BQU8sSUFBSSxDQUFDO0NBQ2I7Ozs7O0FBRUQsMEJBQTBCLFFBQWtCO0lBQzFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFOztRQUN4QyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsR0FBRyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUM3RTtLQUNGO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0NvbXBpbGVyLCBJbmplY3RvciwgTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBOZ01vZHVsZVJlZiwgVHlwZSwgaXNEZXZNb2RlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7QmVoYXZpb3JTdWJqZWN0LCBPYnNlcnZhYmxlLCBTdWJqZWN0LCBTdWJzY3JpcHRpb24sIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NvbmNhdE1hcCwgbWFwLCBtZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge2FwcGx5UmVkaXJlY3RzfSBmcm9tICcuL2FwcGx5X3JlZGlyZWN0cyc7XG5pbXBvcnQge0xvYWRlZFJvdXRlckNvbmZpZywgUXVlcnlQYXJhbXNIYW5kbGluZywgUm91dGUsIFJvdXRlcywgc3RhbmRhcmRpemVDb25maWcsIHZhbGlkYXRlQ29uZmlnfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge2NyZWF0ZVJvdXRlclN0YXRlfSBmcm9tICcuL2NyZWF0ZV9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtjcmVhdGVVcmxUcmVlfSBmcm9tICcuL2NyZWF0ZV91cmxfdHJlZSc7XG5pbXBvcnQge0FjdGl2YXRpb25FbmQsIENoaWxkQWN0aXZhdGlvbkVuZCwgRXZlbnQsIEd1YXJkc0NoZWNrRW5kLCBHdWFyZHNDaGVja1N0YXJ0LCBOYXZpZ2F0aW9uQ2FuY2VsLCBOYXZpZ2F0aW9uRW5kLCBOYXZpZ2F0aW9uRXJyb3IsIE5hdmlnYXRpb25TdGFydCwgTmF2aWdhdGlvblRyaWdnZXIsIFJlc29sdmVFbmQsIFJlc29sdmVTdGFydCwgUm91dGVDb25maWdMb2FkRW5kLCBSb3V0ZUNvbmZpZ0xvYWRTdGFydCwgUm91dGVzUmVjb2duaXplZH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtQcmVBY3RpdmF0aW9ufSBmcm9tICcuL3ByZV9hY3RpdmF0aW9uJztcbmltcG9ydCB7cmVjb2duaXplfSBmcm9tICcuL3JlY29nbml6ZSc7XG5pbXBvcnQge0RlZmF1bHRSb3V0ZVJldXNlU3RyYXRlZ3ksIERldGFjaGVkUm91dGVIYW5kbGVJbnRlcm5hbCwgUm91dGVSZXVzZVN0cmF0ZWd5fSBmcm9tICcuL3JvdXRlX3JldXNlX3N0cmF0ZWd5JztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0c30gZnJvbSAnLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZSwgQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgUm91dGVyU3RhdGUsIFJvdXRlclN0YXRlU25hcHNob3QsIGFkdmFuY2VBY3RpdmF0ZWRSb3V0ZSwgY3JlYXRlRW1wdHlTdGF0ZSwgaW5oZXJpdGVkUGFyYW1zRGF0YVJlc29sdmV9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UGFyYW1zLCBpc05hdmlnYXRpb25DYW5jZWxpbmdFcnJvcn0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtEZWZhdWx0VXJsSGFuZGxpbmdTdHJhdGVneSwgVXJsSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi91cmxfaGFuZGxpbmdfc3RyYXRlZ3knO1xuaW1wb3J0IHtVcmxTZXJpYWxpemVyLCBVcmxUcmVlLCBjb250YWluc1RyZWUsIGNyZWF0ZUVtcHR5VXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge2ZvckVhY2h9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge1RyZWVOb2RlLCBub2RlQ2hpbGRyZW5Bc01hcH0gZnJvbSAnLi91dGlscy90cmVlJztcblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIGV4dHJhIG9wdGlvbnMgdXNlZCBkdXJpbmcgbmF2aWdhdGlvbi5cbiAqXG4gKlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5hdmlnYXRpb25FeHRyYXMge1xuICAvKipcbiAgICogRW5hYmxlcyByZWxhdGl2ZSBuYXZpZ2F0aW9uIGZyb20gdGhlIGN1cnJlbnQgQWN0aXZhdGVkUm91dGUuXG4gICAqXG4gICAqIENvbmZpZ3VyYXRpb246XG4gICAqXG4gICAqIGBgYFxuICAgKiBbe1xuICAqICAgcGF0aDogJ3BhcmVudCcsXG4gICogICBjb21wb25lbnQ6IFBhcmVudENvbXBvbmVudCxcbiAgKiAgIGNoaWxkcmVuOiBbe1xuICAqICAgICBwYXRoOiAnbGlzdCcsXG4gICogICAgIGNvbXBvbmVudDogTGlzdENvbXBvbmVudFxuICAqICAgfSx7XG4gICogICAgIHBhdGg6ICdjaGlsZCcsXG4gICogICAgIGNvbXBvbmVudDogQ2hpbGRDb21wb25lbnRcbiAgKiAgIH1dXG4gICogfV1cbiAgICogYGBgXG4gICAqXG4gICAqIE5hdmlnYXRlIHRvIGxpc3Qgcm91dGUgZnJvbSBjaGlsZCByb3V0ZTpcbiAgICpcbiAgICogYGBgXG4gICAqICBAQ29tcG9uZW50KHsuLi59KVxuICAgKiAgY2xhc3MgQ2hpbGRDb21wb25lbnQge1xuICAqICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsIHByaXZhdGUgcm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7fVxuICAqXG4gICogICAgZ28oKSB7XG4gICogICAgICB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy4uL2xpc3QnXSwgeyByZWxhdGl2ZVRvOiB0aGlzLnJvdXRlIH0pO1xuICAqICAgIH1cbiAgKiAgfVxuICAgKiBgYGBcbiAgICovXG4gIHJlbGF0aXZlVG8/OiBBY3RpdmF0ZWRSb3V0ZXxudWxsO1xuXG4gIC8qKlxuICAgKiBTZXRzIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gdGhlIFVSTC5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHRvIC9yZXN1bHRzP3BhZ2U9MVxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy9yZXN1bHRzJ10sIHsgcXVlcnlQYXJhbXM6IHsgcGFnZTogMSB9IH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHF1ZXJ5UGFyYW1zPzogUGFyYW1zfG51bGw7XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGhhc2ggZnJhZ21lbnQgZm9yIHRoZSBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvcmVzdWx0cyN0b3BcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvcmVzdWx0cyddLCB7IGZyYWdtZW50OiAndG9wJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudD86IHN0cmluZztcblxuICAvKipcbiAgICogUHJlc2VydmVzIHRoZSBxdWVyeSBwYXJhbWV0ZXJzIGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBkZXByZWNhdGVkLCB1c2UgYHF1ZXJ5UGFyYW1zSGFuZGxpbmdgIGluc3RlYWRcbiAgICpcbiAgICogYGBgXG4gICAqIC8vIFByZXNlcnZlIHF1ZXJ5IHBhcmFtcyBmcm9tIC9yZXN1bHRzP3BhZ2U9MSB0byAvdmlldz9wYWdlPTFcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHByZXNlcnZlUXVlcnlQYXJhbXM6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBzaW5jZSB2NFxuICAgKi9cbiAgcHJlc2VydmVRdWVyeVBhcmFtcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqICBjb25maWcgc3RyYXRlZ3kgdG8gaGFuZGxlIHRoZSBxdWVyeSBwYXJhbWV0ZXJzIGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gZnJvbSAvcmVzdWx0cz9wYWdlPTEgdG8gL3ZpZXc/cGFnZT0xJnBhZ2U9MlxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgcXVlcnlQYXJhbXM6IHsgcGFnZTogMiB9LCAgcXVlcnlQYXJhbXNIYW5kbGluZzogXCJtZXJnZVwiIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHF1ZXJ5UGFyYW1zSGFuZGxpbmc/OiBRdWVyeVBhcmFtc0hhbmRsaW5nfG51bGw7XG4gIC8qKlxuICAgKiBQcmVzZXJ2ZXMgdGhlIGZyYWdtZW50IGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBQcmVzZXJ2ZSBmcmFnbWVudCBmcm9tIC9yZXN1bHRzI3RvcCB0byAvdmlldyN0b3BcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHByZXNlcnZlRnJhZ21lbnQ6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcHJlc2VydmVGcmFnbWVudD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBOYXZpZ2F0ZXMgd2l0aG91dCBwdXNoaW5nIGEgbmV3IHN0YXRlIGludG8gaGlzdG9yeS5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHNpbGVudGx5IHRvIC92aWV3XG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgc2tpcExvY2F0aW9uQ2hhbmdlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIE5hdmlnYXRlcyB3aGlsZSByZXBsYWNpbmcgdGhlIGN1cnJlbnQgc3RhdGUgaW4gaGlzdG9yeS5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHRvIC92aWV3XG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyByZXBsYWNlVXJsOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHJlcGxhY2VVcmw/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEVycm9yIGhhbmRsZXIgdGhhdCBpcyBpbnZva2VkIHdoZW4gYSBuYXZpZ2F0aW9uIGVycm9ycy5cbiAqXG4gKiBJZiB0aGUgaGFuZGxlciByZXR1cm5zIGEgdmFsdWUsIHRoZSBuYXZpZ2F0aW9uIHByb21pc2Ugd2lsbCBiZSByZXNvbHZlZCB3aXRoIHRoaXMgdmFsdWUuXG4gKiBJZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLCB0aGUgbmF2aWdhdGlvbiBwcm9taXNlIHdpbGwgYmUgcmVqZWN0ZWQgd2l0aFxuICogdGhlIGV4Y2VwdGlvbi5cbiAqXG4gKlxuICovXG5leHBvcnQgdHlwZSBFcnJvckhhbmRsZXIgPSAoZXJyb3I6IGFueSkgPT4gYW55O1xuXG5mdW5jdGlvbiBkZWZhdWx0RXJyb3JIYW5kbGVyKGVycm9yOiBhbnkpOiBhbnkge1xuICB0aHJvdyBlcnJvcjtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdE1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcihcbiAgICBlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gIHJldHVybiB1cmxTZXJpYWxpemVyLnBhcnNlKCcvJyk7XG59XG5cbnR5cGUgTmF2U3RyZWFtVmFsdWUgPVxuICAgIGJvb2xlYW4gfCB7YXBwbGllZFVybDogVXJsVHJlZSwgc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QsIHNob3VsZEFjdGl2YXRlPzogYm9vbGVhbn07XG5cbnR5cGUgTmF2aWdhdGlvblBhcmFtcyA9IHtcbiAgaWQ6IG51bWJlcixcbiAgcmF3VXJsOiBVcmxUcmVlLFxuICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMsXG4gIHJlc29sdmU6IGFueSxcbiAgcmVqZWN0OiBhbnksXG4gIHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj4sXG4gIHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIsXG4gIHN0YXRlOiB7bmF2aWdhdGlvbklkOiBudW1iZXJ9IHwgbnVsbFxufTtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IHR5cGUgUm91dGVySG9vayA9IChzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCwgcnVuRXh0cmFzOiB7XG4gIGFwcGxpZWRVcmxUcmVlOiBVcmxUcmVlLFxuICByYXdVcmxUcmVlOiBVcmxUcmVlLFxuICBza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW4sXG4gIHJlcGxhY2VVcmw6IGJvb2xlYW4sXG4gIG5hdmlnYXRpb25JZDogbnVtYmVyXG59KSA9PiBPYnNlcnZhYmxlPHZvaWQ+O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBkZWZhdWx0Um91dGVySG9vayhzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCwgcnVuRXh0cmFzOiB7XG4gIGFwcGxpZWRVcmxUcmVlOiBVcmxUcmVlLFxuICByYXdVcmxUcmVlOiBVcmxUcmVlLFxuICBza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW4sXG4gIHJlcGxhY2VVcmw6IGJvb2xlYW4sXG4gIG5hdmlnYXRpb25JZDogbnVtYmVyXG59KTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gIHJldHVybiBvZiAobnVsbCkgYXMgYW55O1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIHRoZSBuYXZpZ2F0aW9uIGFuZCB1cmwgbWFuaXB1bGF0aW9uIGNhcGFiaWxpdGllcy5cbiAqXG4gKiBTZWUgYFJvdXRlc2AgZm9yIG1vcmUgZGV0YWlscyBhbmQgZXhhbXBsZXMuXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZXIge1xuICBwcml2YXRlIGN1cnJlbnRVcmxUcmVlOiBVcmxUcmVlO1xuICBwcml2YXRlIHJhd1VybFRyZWU6IFVybFRyZWU7XG4gIHByaXZhdGUgbmF2aWdhdGlvbnMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PE5hdmlnYXRpb25QYXJhbXM+KG51bGwgISk7XG5cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgbG9jYXRpb25TdWJzY3JpcHRpb24gITogU3Vic2NyaXB0aW9uO1xuICBwcml2YXRlIG5hdmlnYXRpb25JZDogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBjb25maWdMb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcjtcbiAgcHJpdmF0ZSBuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55PjtcblxuICBwdWJsaWMgcmVhZG9ubHkgZXZlbnRzOiBPYnNlcnZhYmxlPEV2ZW50PiA9IG5ldyBTdWJqZWN0PEV2ZW50PigpO1xuICBwdWJsaWMgcmVhZG9ubHkgcm91dGVyU3RhdGU6IFJvdXRlclN0YXRlO1xuXG4gIC8qKlxuICAgKiBFcnJvciBoYW5kbGVyIHRoYXQgaXMgaW52b2tlZCB3aGVuIGEgbmF2aWdhdGlvbiBlcnJvcnMuXG4gICAqXG4gICAqIFNlZSBgRXJyb3JIYW5kbGVyYCBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICovXG4gIGVycm9ySGFuZGxlcjogRXJyb3JIYW5kbGVyID0gZGVmYXVsdEVycm9ySGFuZGxlcjtcblxuICAvKipcbiAgICogTWFsZm9ybWVkIHVyaSBlcnJvciBoYW5kbGVyIGlzIGludm9rZWQgd2hlbiBgUm91dGVyLnBhcnNlVXJsKHVybClgIHRocm93cyBhblxuICAgKiBlcnJvciBkdWUgdG8gY29udGFpbmluZyBhbiBpbnZhbGlkIGNoYXJhY3Rlci4gVGhlIG1vc3QgY29tbW9uIGNhc2Ugd291bGQgYmUgYSBgJWAgc2lnblxuICAgKiB0aGF0J3Mgbm90IGVuY29kZWQgYW5kIGlzIG5vdCBwYXJ0IG9mIGEgcGVyY2VudCBlbmNvZGVkIHNlcXVlbmNlLlxuICAgKi9cbiAgbWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyOlxuICAgICAgKGVycm9yOiBVUklFcnJvciwgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICAgICB1cmw6IHN0cmluZykgPT4gVXJsVHJlZSA9IGRlZmF1bHRNYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyBpZiBhdCBsZWFzdCBvbmUgbmF2aWdhdGlvbiBoYXBwZW5lZC5cbiAgICovXG4gIG5hdmlnYXRlZDogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIGxhc3RTdWNjZXNzZnVsSWQ6IG51bWJlciA9IC0xO1xuXG4gIC8qKlxuICAgKiBVc2VkIGJ5IFJvdXRlck1vZHVsZS4gVGhpcyBhbGxvd3MgdXMgdG9cbiAgICogcGF1c2UgdGhlIG5hdmlnYXRpb24gZWl0aGVyIGJlZm9yZSBwcmVhY3RpdmF0aW9uIG9yIGFmdGVyIGl0LlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGhvb2tzOiB7YmVmb3JlUHJlYWN0aXZhdGlvbjogUm91dGVySG9vaywgYWZ0ZXJQcmVhY3RpdmF0aW9uOiBSb3V0ZXJIb29rfSA9IHtcbiAgICBiZWZvcmVQcmVhY3RpdmF0aW9uOiBkZWZhdWx0Um91dGVySG9vayxcbiAgICBhZnRlclByZWFjdGl2YXRpb246IGRlZmF1bHRSb3V0ZXJIb29rXG4gIH07XG5cbiAgLyoqXG4gICAqIEV4dHJhY3RzIGFuZCBtZXJnZXMgVVJMcy4gVXNlZCBmb3IgQW5ndWxhckpTIHRvIEFuZ3VsYXIgbWlncmF0aW9ucy5cbiAgICovXG4gIHVybEhhbmRsaW5nU3RyYXRlZ3k6IFVybEhhbmRsaW5nU3RyYXRlZ3kgPSBuZXcgRGVmYXVsdFVybEhhbmRsaW5nU3RyYXRlZ3koKTtcblxuICByb3V0ZVJldXNlU3RyYXRlZ3k6IFJvdXRlUmV1c2VTdHJhdGVneSA9IG5ldyBEZWZhdWx0Um91dGVSZXVzZVN0cmF0ZWd5KCk7XG5cbiAgLyoqXG4gICAqIERlZmluZSB3aGF0IHRoZSByb3V0ZXIgc2hvdWxkIGRvIGlmIGl0IHJlY2VpdmVzIGEgbmF2aWdhdGlvbiByZXF1ZXN0IHRvIHRoZSBjdXJyZW50IFVSTC5cbiAgICogQnkgZGVmYXVsdCwgdGhlIHJvdXRlciB3aWxsIGlnbm9yZSB0aGlzIG5hdmlnYXRpb24uIEhvd2V2ZXIsIHRoaXMgcHJldmVudHMgZmVhdHVyZXMgc3VjaFxuICAgKiBhcyBhIFwicmVmcmVzaFwiIGJ1dHRvbi4gVXNlIHRoaXMgb3B0aW9uIHRvIGNvbmZpZ3VyZSB0aGUgYmVoYXZpb3Igd2hlbiBuYXZpZ2F0aW5nIHRvIHRoZVxuICAgKiBjdXJyZW50IFVSTC4gRGVmYXVsdCBpcyAnaWdub3JlJy5cbiAgICovXG4gIG9uU2FtZVVybE5hdmlnYXRpb246ICdyZWxvYWQnfCdpZ25vcmUnID0gJ2lnbm9yZSc7XG5cbiAgLyoqXG4gICAqIERlZmluZXMgaG93IHRoZSByb3V0ZXIgbWVyZ2VzIHBhcmFtcywgZGF0YSBhbmQgcmVzb2x2ZWQgZGF0YSBmcm9tIHBhcmVudCB0byBjaGlsZFxuICAgKiByb3V0ZXMuIEF2YWlsYWJsZSBvcHRpb25zIGFyZTpcbiAgICpcbiAgICogLSBgJ2VtcHR5T25seSdgLCB0aGUgZGVmYXVsdCwgb25seSBpbmhlcml0cyBwYXJlbnQgcGFyYW1zIGZvciBwYXRoLWxlc3Mgb3IgY29tcG9uZW50LWxlc3NcbiAgICogICByb3V0ZXMuXG4gICAqIC0gYCdhbHdheXMnYCwgZW5hYmxlcyB1bmNvbmRpdGlvbmFsIGluaGVyaXRhbmNlIG9mIHBhcmVudCBwYXJhbXMuXG4gICAqL1xuICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiAnZW1wdHlPbmx5J3wnYWx3YXlzJyA9ICdlbXB0eU9ubHknO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIHRoZSByb3V0ZXIgc2VydmljZS5cbiAgICovXG4gIC8vIFRPRE86IHZzYXZraW4gbWFrZSBpbnRlcm5hbCBhZnRlciB0aGUgZmluYWwgaXMgb3V0LlxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm9vdENvbXBvbmVudFR5cGU6IFR5cGU8YW55PnxudWxsLCBwcml2YXRlIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgICBwcml2YXRlIHJvb3RDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cywgcHJpdmF0ZSBsb2NhdGlvbjogTG9jYXRpb24sIGluamVjdG9yOiBJbmplY3RvcixcbiAgICAgIGxvYWRlcjogTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBjb21waWxlcjogQ29tcGlsZXIsIHB1YmxpYyBjb25maWc6IFJvdXRlcykge1xuICAgIGNvbnN0IG9uTG9hZFN0YXJ0ID0gKHI6IFJvdXRlKSA9PiB0aGlzLnRyaWdnZXJFdmVudChuZXcgUm91dGVDb25maWdMb2FkU3RhcnQocikpO1xuICAgIGNvbnN0IG9uTG9hZEVuZCA9IChyOiBSb3V0ZSkgPT4gdGhpcy50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZEVuZChyKSk7XG5cbiAgICB0aGlzLm5nTW9kdWxlID0gaW5qZWN0b3IuZ2V0KE5nTW9kdWxlUmVmKTtcblxuICAgIHRoaXMucmVzZXRDb25maWcoY29uZmlnKTtcbiAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gY3JlYXRlRW1wdHlVcmxUcmVlKCk7XG4gICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy5jdXJyZW50VXJsVHJlZTtcblxuICAgIHRoaXMuY29uZmlnTG9hZGVyID0gbmV3IFJvdXRlckNvbmZpZ0xvYWRlcihsb2FkZXIsIGNvbXBpbGVyLCBvbkxvYWRTdGFydCwgb25Mb2FkRW5kKTtcbiAgICB0aGlzLnJvdXRlclN0YXRlID0gY3JlYXRlRW1wdHlTdGF0ZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB0aGlzLnJvb3RDb21wb25lbnRUeXBlKTtcbiAgICB0aGlzLnByb2Nlc3NOYXZpZ2F0aW9ucygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBpbnRlcm5hbFxuICAgKiBUT0RPOiB0aGlzIHNob3VsZCBiZSByZW1vdmVkIG9uY2UgdGhlIGNvbnN0cnVjdG9yIG9mIHRoZSByb3V0ZXIgbWFkZSBpbnRlcm5hbFxuICAgKi9cbiAgcmVzZXRSb290Q29tcG9uZW50VHlwZShyb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+KTogdm9pZCB7XG4gICAgdGhpcy5yb290Q29tcG9uZW50VHlwZSA9IHJvb3RDb21wb25lbnRUeXBlO1xuICAgIC8vIFRPRE86IHZzYXZraW4gcm91dGVyIDQuMCBzaG91bGQgbWFrZSB0aGUgcm9vdCBjb21wb25lbnQgc2V0IHRvIG51bGxcbiAgICAvLyB0aGlzIHdpbGwgc2ltcGxpZnkgdGhlIGxpZmVjeWNsZSBvZiB0aGUgcm91dGVyLlxuICAgIHRoaXMucm91dGVyU3RhdGUucm9vdC5jb21wb25lbnQgPSB0aGlzLnJvb3RDb21wb25lbnRUeXBlO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdXAgdGhlIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lciBhbmQgcGVyZm9ybXMgdGhlIGluaXRpYWwgbmF2aWdhdGlvbi5cbiAgICovXG4gIGluaXRpYWxOYXZpZ2F0aW9uKCk6IHZvaWQge1xuICAgIHRoaXMuc2V0VXBMb2NhdGlvbkNoYW5nZUxpc3RlbmVyKCk7XG4gICAgaWYgKHRoaXMubmF2aWdhdGlvbklkID09PSAwKSB7XG4gICAgICB0aGlzLm5hdmlnYXRlQnlVcmwodGhpcy5sb2NhdGlvbi5wYXRoKHRydWUpLCB7cmVwbGFjZVVybDogdHJ1ZX0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHVwIHRoZSBsb2NhdGlvbiBjaGFuZ2UgbGlzdGVuZXIuXG4gICAqL1xuICBzZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTogdm9pZCB7XG4gICAgLy8gRG9uJ3QgbmVlZCB0byB1c2UgWm9uZS53cmFwIGFueSBtb3JlLCBiZWNhdXNlIHpvbmUuanNcbiAgICAvLyBhbHJlYWR5IHBhdGNoIG9uUG9wU3RhdGUsIHNvIGxvY2F0aW9uIGNoYW5nZSBjYWxsYmFjayB3aWxsXG4gICAgLy8gcnVuIGludG8gbmdab25lXG4gICAgaWYgKCF0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uID0gPGFueT50aGlzLmxvY2F0aW9uLnN1YnNjcmliZSgoY2hhbmdlOiBhbnkpID0+IHtcbiAgICAgICAgbGV0IHJhd1VybFRyZWUgPSB0aGlzLnBhcnNlVXJsKGNoYW5nZVsndXJsJ10pO1xuICAgICAgICBjb25zdCBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyID0gY2hhbmdlWyd0eXBlJ10gPT09ICdwb3BzdGF0ZScgPyAncG9wc3RhdGUnIDogJ2hhc2hjaGFuZ2UnO1xuICAgICAgICBjb25zdCBzdGF0ZSA9IGNoYW5nZS5zdGF0ZSAmJiBjaGFuZ2Uuc3RhdGUubmF2aWdhdGlvbklkID9cbiAgICAgICAgICAgIHtuYXZpZ2F0aW9uSWQ6IGNoYW5nZS5zdGF0ZS5uYXZpZ2F0aW9uSWR9IDpcbiAgICAgICAgICAgIG51bGw7XG4gICAgICAgIHNldFRpbWVvdXQoXG4gICAgICAgICAgICAoKSA9PiB7IHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKHJhd1VybFRyZWUsIHNvdXJjZSwgc3RhdGUsIHtyZXBsYWNlVXJsOiB0cnVlfSk7IH0sIDApO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIFRoZSBjdXJyZW50IHVybCAqL1xuICBnZXQgdXJsKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLnNlcmlhbGl6ZVVybCh0aGlzLmN1cnJlbnRVcmxUcmVlKTsgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgdHJpZ2dlckV2ZW50KGU6IEV2ZW50KTogdm9pZCB7ICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PikubmV4dChlKTsgfVxuXG4gIC8qKlxuICAgKiBSZXNldHMgdGhlIGNvbmZpZ3VyYXRpb24gdXNlZCBmb3IgbmF2aWdhdGlvbiBhbmQgZ2VuZXJhdGluZyBsaW5rcy5cbiAgICpcbiAgICogIyMjIFVzYWdlXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIucmVzZXRDb25maWcoW1xuICAgKiAgeyBwYXRoOiAndGVhbS86aWQnLCBjb21wb25lbnQ6IFRlYW1DbXAsIGNoaWxkcmVuOiBbXG4gICAqICAgIHsgcGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wIH0sXG4gICAqICAgIHsgcGF0aDogJ3VzZXIvOm5hbWUnLCBjb21wb25lbnQ6IFVzZXJDbXAgfVxuICAgKiAgXX1cbiAgICogXSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcmVzZXRDb25maWcoY29uZmlnOiBSb3V0ZXMpOiB2b2lkIHtcbiAgICB2YWxpZGF0ZUNvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gICAgdGhpcy5uYXZpZ2F0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSAtMTtcbiAgfVxuXG4gIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gIG5nT25EZXN0cm95KCk6IHZvaWQgeyB0aGlzLmRpc3Bvc2UoKTsgfVxuXG4gIC8qKiBEaXNwb3NlcyBvZiB0aGUgcm91dGVyICovXG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24gPSBudWxsICE7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFwcGxpZXMgYW4gYXJyYXkgb2YgY29tbWFuZHMgdG8gdGhlIGN1cnJlbnQgdXJsIHRyZWUgYW5kIGNyZWF0ZXMgYSBuZXcgdXJsIHRyZWUuXG4gICAqXG4gICAqIFdoZW4gZ2l2ZW4gYW4gYWN0aXZhdGUgcm91dGUsIGFwcGxpZXMgdGhlIGdpdmVuIGNvbW1hbmRzIHN0YXJ0aW5nIGZyb20gdGhlIHJvdXRlLlxuICAgKiBXaGVuIG5vdCBnaXZlbiBhIHJvdXRlLCBhcHBsaWVzIHRoZSBnaXZlbiBjb21tYW5kIHN0YXJ0aW5nIGZyb20gdGhlIHJvb3QuXG4gICAqXG4gICAqICMjIyBVc2FnZVxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCAndXNlcicsIDExXSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMztleHBhbmQ9dHJ1ZS91c2VyLzExXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge2V4cGFuZDogdHJ1ZX0sICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8geW91IGNhbiBjb2xsYXBzZSBzdGF0aWMgc2VnbWVudHMgbGlrZSB0aGlzICh0aGlzIHdvcmtzIG9ubHkgd2l0aCB0aGUgZmlyc3QgcGFzc2VkLWluIHZhbHVlKTpcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbS8zMy91c2VyJywgdXNlcklkXSk7XG4gICAqXG4gICAqIC8vIElmIHRoZSBmaXJzdCBzZWdtZW50IGNhbiBjb250YWluIHNsYXNoZXMsIGFuZCB5b3UgZG8gbm90IHdhbnQgdGhlIHJvdXRlciB0byBzcGxpdCBpdCwgeW91XG4gICAqIC8vIGNhbiBkbyB0aGUgZm9sbG93aW5nOlxuICAgKlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbe3NlZ21lbnRQYXRoOiAnL29uZS90d28nfV0pO1xuICAgKlxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvKHVzZXIvMTEvL3JpZ2h0OmNoYXQpXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiAnY2hhdCd9fV0pO1xuICAgKlxuICAgKiAvLyByZW1vdmUgdGhlIHJpZ2h0IHNlY29uZGFyeSBub2RlXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiBudWxsfX1dKTtcbiAgICpcbiAgICogLy8gYXNzdW1pbmcgdGhlIGN1cnJlbnQgdXJsIGlzIGAvdGVhbS8zMy91c2VyLzExYCBhbmQgdGhlIHJvdXRlIHBvaW50cyB0byBgdXNlci8xMWBcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8xMS9kZXRhaWxzXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnZGV0YWlscyddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8yMlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy4uLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS80NC91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vLi4vdGVhbS80NC91c2VyLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKiBgYGBcbiAgICovXG4gIGNyZWF0ZVVybFRyZWUoY29tbWFuZHM6IGFueVtdLCBuYXZpZ2F0aW9uRXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge30pOiBVcmxUcmVlIHtcbiAgICBjb25zdCB7cmVsYXRpdmVUbywgICAgICAgICAgcXVlcnlQYXJhbXMsICAgICAgICAgZnJhZ21lbnQsXG4gICAgICAgICAgIHByZXNlcnZlUXVlcnlQYXJhbXMsIHF1ZXJ5UGFyYW1zSGFuZGxpbmcsIHByZXNlcnZlRnJhZ21lbnR9ID0gbmF2aWdhdGlvbkV4dHJhcztcbiAgICBpZiAoaXNEZXZNb2RlKCkgJiYgcHJlc2VydmVRdWVyeVBhcmFtcyAmJiA8YW55PmNvbnNvbGUgJiYgPGFueT5jb25zb2xlLndhcm4pIHtcbiAgICAgIGNvbnNvbGUud2FybigncHJlc2VydmVRdWVyeVBhcmFtcyBpcyBkZXByZWNhdGVkLCB1c2UgcXVlcnlQYXJhbXNIYW5kbGluZyBpbnN0ZWFkLicpO1xuICAgIH1cbiAgICBjb25zdCBhID0gcmVsYXRpdmVUbyB8fCB0aGlzLnJvdXRlclN0YXRlLnJvb3Q7XG4gICAgY29uc3QgZiA9IHByZXNlcnZlRnJhZ21lbnQgPyB0aGlzLmN1cnJlbnRVcmxUcmVlLmZyYWdtZW50IDogZnJhZ21lbnQ7XG4gICAgbGV0IHE6IFBhcmFtc3xudWxsID0gbnVsbDtcbiAgICBpZiAocXVlcnlQYXJhbXNIYW5kbGluZykge1xuICAgICAgc3dpdGNoIChxdWVyeVBhcmFtc0hhbmRsaW5nKSB7XG4gICAgICAgIGNhc2UgJ21lcmdlJzpcbiAgICAgICAgICBxID0gey4uLnRoaXMuY3VycmVudFVybFRyZWUucXVlcnlQYXJhbXMsIC4uLnF1ZXJ5UGFyYW1zfTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncHJlc2VydmUnOlxuICAgICAgICAgIHEgPSB0aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHEgPSBxdWVyeVBhcmFtcyB8fCBudWxsO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBxID0gcHJlc2VydmVRdWVyeVBhcmFtcyA/IHRoaXMuY3VycmVudFVybFRyZWUucXVlcnlQYXJhbXMgOiBxdWVyeVBhcmFtcyB8fCBudWxsO1xuICAgIH1cbiAgICBpZiAocSAhPT0gbnVsbCkge1xuICAgICAgcSA9IHRoaXMucmVtb3ZlRW1wdHlQcm9wcyhxKTtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZVVybFRyZWUoYSwgdGhpcy5jdXJyZW50VXJsVHJlZSwgY29tbWFuZHMsIHEgISwgZiAhKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZSBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgdXJsLiBUaGlzIG5hdmlnYXRpb24gaXMgYWx3YXlzIGFic29sdXRlLlxuICAgKlxuICAgKiBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0OlxuICAgKiAtIHJlc29sdmVzIHRvICd0cnVlJyB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsXG4gICAqIC0gcmVzb2x2ZXMgdG8gJ2ZhbHNlJyB3aGVuIG5hdmlnYXRpb24gZmFpbHMsXG4gICAqIC0gaXMgcmVqZWN0ZWQgd2hlbiBhbiBlcnJvciBoYXBwZW5zLlxuICAgKlxuICAgKiAjIyMgVXNhZ2VcbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiKTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiLCB7IHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIEluIG9wcG9zaXRlIHRvIGBuYXZpZ2F0ZWAsIGBuYXZpZ2F0ZUJ5VXJsYCB0YWtlcyBhIHdob2xlIFVSTFxuICAgKiBhbmQgZG9lcyBub3QgYXBwbHkgYW55IGRlbHRhIHRvIHRoZSBjdXJyZW50IG9uZS5cbiAgICovXG4gIG5hdmlnYXRlQnlVcmwodXJsOiBzdHJpbmd8VXJsVHJlZSwgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3NraXBMb2NhdGlvbkNoYW5nZTogZmFsc2V9KTpcbiAgICAgIFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IHVybFRyZWUgPSB1cmwgaW5zdGFuY2VvZiBVcmxUcmVlID8gdXJsIDogdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIGNvbnN0IG1lcmdlZFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodXJsVHJlZSwgdGhpcy5yYXdVcmxUcmVlKTtcblxuICAgIHJldHVybiB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbihtZXJnZWRUcmVlLCAnaW1wZXJhdGl2ZScsIG51bGwsIGV4dHJhcyk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGUgYmFzZWQgb24gdGhlIHByb3ZpZGVkIGFycmF5IG9mIGNvbW1hbmRzIGFuZCBhIHN0YXJ0aW5nIHBvaW50LlxuICAgKiBJZiBubyBzdGFydGluZyByb3V0ZSBpcyBwcm92aWRlZCwgdGhlIG5hdmlnYXRpb24gaXMgYWJzb2x1dGUuXG4gICAqXG4gICAqIFJldHVybnMgYSBwcm9taXNlIHRoYXQ6XG4gICAqIC0gcmVzb2x2ZXMgdG8gJ3RydWUnIHdoZW4gbmF2aWdhdGlvbiBzdWNjZWVkcyxcbiAgICogLSByZXNvbHZlcyB0byAnZmFsc2UnIHdoZW4gbmF2aWdhdGlvbiBmYWlscyxcbiAgICogLSBpcyByZWplY3RlZCB3aGVuIGFuIGVycm9yIGhhcHBlbnMuXG4gICAqXG4gICAqICMjIyBVc2FnZVxuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTFxuICAgKiByb3V0ZXIubmF2aWdhdGUoWyd0ZWFtJywgMzMsICd1c2VyJywgMTFdLCB7cmVsYXRpdmVUbzogcm91dGUsIHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZX0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogSW4gb3Bwb3NpdGUgdG8gYG5hdmlnYXRlQnlVcmxgLCBgbmF2aWdhdGVgIGFsd2F5cyB0YWtlcyBhIGRlbHRhIHRoYXQgaXMgYXBwbGllZCB0byB0aGUgY3VycmVudFxuICAgKiBVUkwuXG4gICAqL1xuICBuYXZpZ2F0ZShjb21tYW5kczogYW55W10sIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHtza2lwTG9jYXRpb25DaGFuZ2U6IGZhbHNlfSk6XG4gICAgICBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB2YWxpZGF0ZUNvbW1hbmRzKGNvbW1hbmRzKTtcbiAgICByZXR1cm4gdGhpcy5uYXZpZ2F0ZUJ5VXJsKHRoaXMuY3JlYXRlVXJsVHJlZShjb21tYW5kcywgZXh0cmFzKSwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKiBTZXJpYWxpemVzIGEgYFVybFRyZWVgIGludG8gYSBzdHJpbmcgKi9cbiAgc2VyaWFsaXplVXJsKHVybDogVXJsVHJlZSk6IHN0cmluZyB7IHJldHVybiB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHVybCk7IH1cblxuICAvKiogUGFyc2VzIGEgc3RyaW5nIGludG8gYSBgVXJsVHJlZWAgKi9cbiAgcGFyc2VVcmwodXJsOiBzdHJpbmcpOiBVcmxUcmVlIHtcbiAgICBsZXQgdXJsVHJlZTogVXJsVHJlZTtcbiAgICB0cnkge1xuICAgICAgdXJsVHJlZSA9IHRoaXMudXJsU2VyaWFsaXplci5wYXJzZSh1cmwpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHVybFRyZWUgPSB0aGlzLm1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcihlLCB0aGlzLnVybFNlcmlhbGl6ZXIsIHVybCk7XG4gICAgfVxuICAgIHJldHVybiB1cmxUcmVlO1xuICB9XG5cbiAgLyoqIFJldHVybnMgd2hldGhlciB0aGUgdXJsIGlzIGFjdGl2YXRlZCAqL1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBleGFjdDogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgIGlmICh1cmwgaW5zdGFuY2VvZiBVcmxUcmVlKSB7XG4gICAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybCwgZXhhY3QpO1xuICAgIH1cblxuICAgIGNvbnN0IHVybFRyZWUgPSB0aGlzLnBhcnNlVXJsKHVybCk7XG4gICAgcmV0dXJuIGNvbnRhaW5zVHJlZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB1cmxUcmVlLCBleGFjdCk7XG4gIH1cblxuICBwcml2YXRlIHJlbW92ZUVtcHR5UHJvcHMocGFyYW1zOiBQYXJhbXMpOiBQYXJhbXMge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhwYXJhbXMpLnJlZHVjZSgocmVzdWx0OiBQYXJhbXMsIGtleTogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZTogYW55ID0gcGFyYW1zW2tleV07XG4gICAgICBpZiAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXN1bHRba2V5XSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LCB7fSk7XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NOYXZpZ2F0aW9ucygpOiB2b2lkIHtcbiAgICB0aGlzLm5hdmlnYXRpb25zXG4gICAgICAgIC5waXBlKGNvbmNhdE1hcCgobmF2OiBOYXZpZ2F0aW9uUGFyYW1zKSA9PiB7XG4gICAgICAgICAgaWYgKG5hdikge1xuICAgICAgICAgICAgdGhpcy5leGVjdXRlU2NoZWR1bGVkTmF2aWdhdGlvbihuYXYpO1xuICAgICAgICAgICAgLy8gYSBmYWlsZWQgbmF2aWdhdGlvbiBzaG91bGQgbm90IHN0b3AgdGhlIHJvdXRlciBmcm9tIHByb2Nlc3NpbmdcbiAgICAgICAgICAgIC8vIGZ1cnRoZXIgbmF2aWdhdGlvbnMgPT4gdGhlIGNhdGNoXG4gICAgICAgICAgICByZXR1cm4gbmF2LnByb21pc2UuY2F0Y2goKCkgPT4ge30pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gPGFueT5vZiAobnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KSlcbiAgICAgICAgLnN1YnNjcmliZSgoKSA9PiB7fSk7XG4gIH1cblxuICBwcml2YXRlIHNjaGVkdWxlTmF2aWdhdGlvbihcbiAgICAgIHJhd1VybDogVXJsVHJlZSwgc291cmNlOiBOYXZpZ2F0aW9uVHJpZ2dlciwgc3RhdGU6IHtuYXZpZ2F0aW9uSWQ6IG51bWJlcn18bnVsbCxcbiAgICAgIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IGxhc3ROYXZpZ2F0aW9uID0gdGhpcy5uYXZpZ2F0aW9ucy52YWx1ZTtcbiAgICAvLyBJZiB0aGUgdXNlciB0cmlnZ2VycyBhIG5hdmlnYXRpb24gaW1wZXJhdGl2ZWx5IChlLmcuLCBieSB1c2luZyBuYXZpZ2F0ZUJ5VXJsKSxcbiAgICAvLyBhbmQgdGhhdCBuYXZpZ2F0aW9uIHJlc3VsdHMgaW4gJ3JlcGxhY2VTdGF0ZScgdGhhdCBsZWFkcyB0byB0aGUgc2FtZSBVUkwsXG4gICAgLy8gd2Ugc2hvdWxkIHNraXAgdGhvc2UuXG4gICAgaWYgKGxhc3ROYXZpZ2F0aW9uICYmIHNvdXJjZSAhPT0gJ2ltcGVyYXRpdmUnICYmIGxhc3ROYXZpZ2F0aW9uLnNvdXJjZSA9PT0gJ2ltcGVyYXRpdmUnICYmXG4gICAgICAgIGxhc3ROYXZpZ2F0aW9uLnJhd1VybC50b1N0cmluZygpID09PSByYXdVcmwudG9TdHJpbmcoKSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKTsgIC8vIHJldHVybiB2YWx1ZSBpcyBub3QgdXNlZFxuICAgIH1cblxuICAgIC8vIEJlY2F1c2Ugb2YgYSBidWcgaW4gSUUgYW5kIEVkZ2UsIHRoZSBsb2NhdGlvbiBjbGFzcyBmaXJlcyB0d28gZXZlbnRzIChwb3BzdGF0ZSBhbmRcbiAgICAvLyBoYXNoY2hhbmdlKSBldmVyeSBzaW5nbGUgdGltZS4gVGhlIHNlY29uZCBvbmUgc2hvdWxkIGJlIGlnbm9yZWQuIE90aGVyd2lzZSwgdGhlIFVSTCB3aWxsXG4gICAgLy8gZmxpY2tlci4gSGFuZGxlcyB0aGUgY2FzZSB3aGVuIGEgcG9wc3RhdGUgd2FzIGVtaXR0ZWQgZmlyc3QuXG4gICAgaWYgKGxhc3ROYXZpZ2F0aW9uICYmIHNvdXJjZSA9PSAnaGFzaGNoYW5nZScgJiYgbGFzdE5hdmlnYXRpb24uc291cmNlID09PSAncG9wc3RhdGUnICYmXG4gICAgICAgIGxhc3ROYXZpZ2F0aW9uLnJhd1VybC50b1N0cmluZygpID09PSByYXdVcmwudG9TdHJpbmcoKSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKTsgIC8vIHJldHVybiB2YWx1ZSBpcyBub3QgdXNlZFxuICAgIH1cbiAgICAvLyBCZWNhdXNlIG9mIGEgYnVnIGluIElFIGFuZCBFZGdlLCB0aGUgbG9jYXRpb24gY2xhc3MgZmlyZXMgdHdvIGV2ZW50cyAocG9wc3RhdGUgYW5kXG4gICAgLy8gaGFzaGNoYW5nZSkgZXZlcnkgc2luZ2xlIHRpbWUuIFRoZSBzZWNvbmQgb25lIHNob3VsZCBiZSBpZ25vcmVkLiBPdGhlcndpc2UsIHRoZSBVUkwgd2lsbFxuICAgIC8vIGZsaWNrZXIuIEhhbmRsZXMgdGhlIGNhc2Ugd2hlbiBhIGhhc2hjaGFuZ2Ugd2FzIGVtaXR0ZWQgZmlyc3QuXG4gICAgaWYgKGxhc3ROYXZpZ2F0aW9uICYmIHNvdXJjZSA9PSAncG9wc3RhdGUnICYmIGxhc3ROYXZpZ2F0aW9uLnNvdXJjZSA9PT0gJ2hhc2hjaGFuZ2UnICYmXG4gICAgICAgIGxhc3ROYXZpZ2F0aW9uLnJhd1VybC50b1N0cmluZygpID09PSByYXdVcmwudG9TdHJpbmcoKSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKTsgIC8vIHJldHVybiB2YWx1ZSBpcyBub3QgdXNlZFxuICAgIH1cblxuICAgIGxldCByZXNvbHZlOiBhbnkgPSBudWxsO1xuICAgIGxldCByZWplY3Q6IGFueSA9IG51bGw7XG5cbiAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlcywgcmVqKSA9PiB7XG4gICAgICByZXNvbHZlID0gcmVzO1xuICAgICAgcmVqZWN0ID0gcmVqO1xuICAgIH0pO1xuXG4gICAgY29uc3QgaWQgPSArK3RoaXMubmF2aWdhdGlvbklkO1xuICAgIHRoaXMubmF2aWdhdGlvbnMubmV4dCh7aWQsIHNvdXJjZSwgc3RhdGUsIHJhd1VybCwgZXh0cmFzLCByZXNvbHZlLCByZWplY3QsIHByb21pc2V9KTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBlcnJvciBpcyBwcm9wYWdhdGVkIGV2ZW4gdGhvdWdoIGBwcm9jZXNzTmF2aWdhdGlvbnNgIGNhdGNoXG4gICAgLy8gaGFuZGxlciBkb2VzIG5vdCByZXRocm93XG4gICAgcmV0dXJuIHByb21pc2UuY2F0Y2goKGU6IGFueSkgPT4gUHJvbWlzZS5yZWplY3QoZSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBleGVjdXRlU2NoZWR1bGVkTmF2aWdhdGlvbih7aWQsIHJhd1VybCwgZXh0cmFzLCByZXNvbHZlLCByZWplY3QsIHNvdXJjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGV9OiBOYXZpZ2F0aW9uUGFyYW1zKTogdm9pZCB7XG4gICAgY29uc3QgdXJsID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QocmF3VXJsKTtcbiAgICBjb25zdCB1cmxUcmFuc2l0aW9uID0gIXRoaXMubmF2aWdhdGVkIHx8IHVybC50b1N0cmluZygpICE9PSB0aGlzLmN1cnJlbnRVcmxUcmVlLnRvU3RyaW5nKCk7XG5cbiAgICBpZiAoKHRoaXMub25TYW1lVXJsTmF2aWdhdGlvbiA9PT0gJ3JlbG9hZCcgPyB0cnVlIDogdXJsVHJhbnNpdGlvbikgJiZcbiAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LnNob3VsZFByb2Nlc3NVcmwocmF3VXJsKSkge1xuICAgICAgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KVxuICAgICAgICAgIC5uZXh0KG5ldyBOYXZpZ2F0aW9uU3RhcnQoaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksIHNvdXJjZSwgc3RhdGUpKTtcbiAgICAgIFByb21pc2UucmVzb2x2ZSgpXG4gICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgIChfKSA9PiB0aGlzLnJ1bk5hdmlnYXRlKFxuICAgICAgICAgICAgICAgICAgdXJsLCByYXdVcmwsICEhZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSwgISFleHRyYXMucmVwbGFjZVVybCwgaWQsIG51bGwpKVxuICAgICAgICAgIC50aGVuKHJlc29sdmUsIHJlamVjdCk7XG5cbiAgICAgIC8vIHdlIGNhbm5vdCBwcm9jZXNzIHRoZSBjdXJyZW50IFVSTCwgYnV0IHdlIGNvdWxkIHByb2Nlc3MgdGhlIHByZXZpb3VzIG9uZSA9PlxuICAgICAgLy8gd2UgbmVlZCB0byBkbyBzb21lIGNsZWFudXBcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICB1cmxUcmFuc2l0aW9uICYmIHRoaXMucmF3VXJsVHJlZSAmJlxuICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybCh0aGlzLnJhd1VybFRyZWUpKSB7XG4gICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25TdGFydChpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgc291cmNlLCBzdGF0ZSkpO1xuICAgICAgUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgKF8pID0+IHRoaXMucnVuTmF2aWdhdGUoXG4gICAgICAgICAgICAgICAgICB1cmwsIHJhd1VybCwgZmFsc2UsIGZhbHNlLCBpZCxcbiAgICAgICAgICAgICAgICAgIGNyZWF0ZUVtcHR5U3RhdGUodXJsLCB0aGlzLnJvb3RDb21wb25lbnRUeXBlKS5zbmFwc2hvdCkpXG4gICAgICAgICAgLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcblxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJhd1VybFRyZWUgPSByYXdVcmw7XG4gICAgICByZXNvbHZlKG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcnVuTmF2aWdhdGUoXG4gICAgICB1cmw6IFVybFRyZWUsIHJhd1VybDogVXJsVHJlZSwgc2tpcExvY2F0aW9uQ2hhbmdlOiBib29sZWFuLCByZXBsYWNlVXJsOiBib29sZWFuLCBpZDogbnVtYmVyLFxuICAgICAgcHJlY3JlYXRlZFN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90fG51bGwpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoaWQgIT09IHRoaXMubmF2aWdhdGlvbklkKSB7XG4gICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25DYW5jZWwoXG4gICAgICAgICAgICAgIGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLFxuICAgICAgICAgICAgICBgTmF2aWdhdGlvbiBJRCAke2lkfSBpcyBub3QgZXF1YWwgdG8gdGhlIGN1cnJlbnQgbmF2aWdhdGlvbiBpZCAke3RoaXMubmF2aWdhdGlvbklkfWApKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZmFsc2UpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZVByb21pc2UsIHJlamVjdFByb21pc2UpID0+IHtcbiAgICAgIC8vIGNyZWF0ZSBhbiBvYnNlcnZhYmxlIG9mIHRoZSB1cmwgYW5kIHJvdXRlIHN0YXRlIHNuYXBzaG90XG4gICAgICAvLyB0aGlzIG9wZXJhdGlvbiBkbyBub3QgcmVzdWx0IGluIGFueSBzaWRlIGVmZmVjdHNcbiAgICAgIGxldCB1cmxBbmRTbmFwc2hvdCQ6IE9ic2VydmFibGU8TmF2U3RyZWFtVmFsdWU+O1xuICAgICAgaWYgKCFwcmVjcmVhdGVkU3RhdGUpIHtcbiAgICAgICAgY29uc3QgbW9kdWxlSW5qZWN0b3IgPSB0aGlzLm5nTW9kdWxlLmluamVjdG9yO1xuICAgICAgICBjb25zdCByZWRpcmVjdHNBcHBsaWVkJCA9XG4gICAgICAgICAgICBhcHBseVJlZGlyZWN0cyhtb2R1bGVJbmplY3RvciwgdGhpcy5jb25maWdMb2FkZXIsIHRoaXMudXJsU2VyaWFsaXplciwgdXJsLCB0aGlzLmNvbmZpZyk7XG5cbiAgICAgICAgdXJsQW5kU25hcHNob3QkID0gcmVkaXJlY3RzQXBwbGllZCQucGlwZShtZXJnZU1hcCgoYXBwbGllZFVybDogVXJsVHJlZSkgPT4ge1xuICAgICAgICAgIHJldHVybiByZWNvZ25pemUoXG4gICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb3RDb21wb25lbnRUeXBlLCB0aGlzLmNvbmZpZywgYXBwbGllZFVybCwgdGhpcy5zZXJpYWxpemVVcmwoYXBwbGllZFVybCksXG4gICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kpXG4gICAgICAgICAgICAgIC5waXBlKG1hcCgoc25hcHNob3Q6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAgICAgICAgICAgLm5leHQobmV3IFJvdXRlc1JlY29nbml6ZWQoXG4gICAgICAgICAgICAgICAgICAgICAgICBpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgdGhpcy5zZXJpYWxpemVVcmwoYXBwbGllZFVybCksIHNuYXBzaG90KSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4ge2FwcGxpZWRVcmwsIHNuYXBzaG90fTtcbiAgICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1cmxBbmRTbmFwc2hvdCQgPSBvZiAoe2FwcGxpZWRVcmw6IHVybCwgc25hcHNob3Q6IHByZWNyZWF0ZWRTdGF0ZX0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBiZWZvcmVQcmVhY3RpdmF0aW9uRG9uZSQgPVxuICAgICAgICAgIHVybEFuZFNuYXBzaG90JC5waXBlKG1lcmdlTWFwKChwKTogT2JzZXJ2YWJsZTxOYXZTdHJlYW1WYWx1ZT4gPT4ge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwID09PSAnYm9vbGVhbicpIHJldHVybiBvZiAocCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ob29rc1xuICAgICAgICAgICAgICAgIC5iZWZvcmVQcmVhY3RpdmF0aW9uKHAuc25hcHNob3QsIHtcbiAgICAgICAgICAgICAgICAgIG5hdmlnYXRpb25JZDogaWQsXG4gICAgICAgICAgICAgICAgICBhcHBsaWVkVXJsVHJlZTogdXJsLFxuICAgICAgICAgICAgICAgICAgcmF3VXJsVHJlZTogcmF3VXJsLCBza2lwTG9jYXRpb25DaGFuZ2UsIHJlcGxhY2VVcmwsXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAucGlwZShtYXAoKCkgPT4gcCkpO1xuICAgICAgICAgIH0pKTtcblxuICAgICAgLy8gcnVuIHByZWFjdGl2YXRpb246IGd1YXJkcyBhbmQgZGF0YSByZXNvbHZlcnNcbiAgICAgIGxldCBwcmVBY3RpdmF0aW9uOiBQcmVBY3RpdmF0aW9uO1xuXG4gICAgICBjb25zdCBwcmVhY3RpdmF0aW9uU2V0dXAkID0gYmVmb3JlUHJlYWN0aXZhdGlvbkRvbmUkLnBpcGUobWFwKChwKTogTmF2U3RyZWFtVmFsdWUgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHAgPT09ICdib29sZWFuJykgcmV0dXJuIHA7XG4gICAgICAgIGNvbnN0IHthcHBsaWVkVXJsLCBzbmFwc2hvdH0gPSBwO1xuICAgICAgICBjb25zdCBtb2R1bGVJbmplY3RvciA9IHRoaXMubmdNb2R1bGUuaW5qZWN0b3I7XG4gICAgICAgIHByZUFjdGl2YXRpb24gPSBuZXcgUHJlQWN0aXZhdGlvbihcbiAgICAgICAgICAgIHNuYXBzaG90LCB0aGlzLnJvdXRlclN0YXRlLnNuYXBzaG90LCBtb2R1bGVJbmplY3RvcixcbiAgICAgICAgICAgIChldnQ6IEV2ZW50KSA9PiB0aGlzLnRyaWdnZXJFdmVudChldnQpKTtcbiAgICAgICAgcHJlQWN0aXZhdGlvbi5pbml0aWFsaXplKHRoaXMucm9vdENvbnRleHRzKTtcbiAgICAgICAgcmV0dXJuIHthcHBsaWVkVXJsLCBzbmFwc2hvdH07XG4gICAgICB9KSk7XG5cbiAgICAgIGNvbnN0IHByZWFjdGl2YXRpb25DaGVja0d1YXJkcyQgPVxuICAgICAgICAgIHByZWFjdGl2YXRpb25TZXR1cCQucGlwZShtZXJnZU1hcCgocCk6IE9ic2VydmFibGU8TmF2U3RyZWFtVmFsdWU+ID0+IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcCA9PT0gJ2Jvb2xlYW4nIHx8IHRoaXMubmF2aWdhdGlvbklkICE9PSBpZCkgcmV0dXJuIG9mIChmYWxzZSk7XG4gICAgICAgICAgICBjb25zdCB7YXBwbGllZFVybCwgc25hcHNob3R9ID0gcDtcblxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQobmV3IEd1YXJkc0NoZWNrU3RhcnQoXG4gICAgICAgICAgICAgICAgaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksIHRoaXMuc2VyaWFsaXplVXJsKGFwcGxpZWRVcmwpLCBzbmFwc2hvdCkpO1xuXG4gICAgICAgICAgICByZXR1cm4gcHJlQWN0aXZhdGlvbi5jaGVja0d1YXJkcygpLnBpcGUobWFwKChzaG91bGRBY3RpdmF0ZTogYm9vbGVhbikgPT4ge1xuICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChuZXcgR3VhcmRzQ2hlY2tFbmQoXG4gICAgICAgICAgICAgICAgICBpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgdGhpcy5zZXJpYWxpemVVcmwoYXBwbGllZFVybCksIHNuYXBzaG90LFxuICAgICAgICAgICAgICAgICAgc2hvdWxkQWN0aXZhdGUpKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHthcHBsaWVkVXJsOiBhcHBsaWVkVXJsLCBzbmFwc2hvdDogc25hcHNob3QsIHNob3VsZEFjdGl2YXRlOiBzaG91bGRBY3RpdmF0ZX07XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgfSkpO1xuXG4gICAgICBjb25zdCBwcmVhY3RpdmF0aW9uUmVzb2x2ZURhdGEkID1cbiAgICAgICAgICBwcmVhY3RpdmF0aW9uQ2hlY2tHdWFyZHMkLnBpcGUobWVyZ2VNYXAoKHApOiBPYnNlcnZhYmxlPE5hdlN0cmVhbVZhbHVlPiA9PiB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHAgPT09ICdib29sZWFuJyB8fCB0aGlzLm5hdmlnYXRpb25JZCAhPT0gaWQpIHJldHVybiBvZiAoZmFsc2UpO1xuXG4gICAgICAgICAgICBpZiAocC5zaG91bGRBY3RpdmF0ZSAmJiBwcmVBY3RpdmF0aW9uLmlzQWN0aXZhdGluZygpKSB7XG4gICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KG5ldyBSZXNvbHZlU3RhcnQoXG4gICAgICAgICAgICAgICAgICBpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgdGhpcy5zZXJpYWxpemVVcmwocC5hcHBsaWVkVXJsKSwgcC5zbmFwc2hvdCkpO1xuICAgICAgICAgICAgICByZXR1cm4gcHJlQWN0aXZhdGlvbi5yZXNvbHZlRGF0YSh0aGlzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kpLnBpcGUobWFwKCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChuZXcgUmVzb2x2ZUVuZChcbiAgICAgICAgICAgICAgICAgICAgaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksIHRoaXMuc2VyaWFsaXplVXJsKHAuYXBwbGllZFVybCksIHAuc25hcHNob3QpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcDtcbiAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9mIChwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KSk7XG5cbiAgICAgIGNvbnN0IHByZWFjdGl2YXRpb25Eb25lJCA9XG4gICAgICAgICAgcHJlYWN0aXZhdGlvblJlc29sdmVEYXRhJC5waXBlKG1lcmdlTWFwKChwKTogT2JzZXJ2YWJsZTxOYXZTdHJlYW1WYWx1ZT4gPT4ge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwID09PSAnYm9vbGVhbicgfHwgdGhpcy5uYXZpZ2F0aW9uSWQgIT09IGlkKSByZXR1cm4gb2YgKGZhbHNlKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhvb2tzXG4gICAgICAgICAgICAgICAgLmFmdGVyUHJlYWN0aXZhdGlvbihwLnNuYXBzaG90LCB7XG4gICAgICAgICAgICAgICAgICBuYXZpZ2F0aW9uSWQ6IGlkLFxuICAgICAgICAgICAgICAgICAgYXBwbGllZFVybFRyZWU6IHVybCxcbiAgICAgICAgICAgICAgICAgIHJhd1VybFRyZWU6IHJhd1VybCwgc2tpcExvY2F0aW9uQ2hhbmdlLCByZXBsYWNlVXJsLFxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnBpcGUobWFwKCgpID0+IHApKTtcbiAgICAgICAgICB9KSk7XG5cblxuICAgICAgLy8gY3JlYXRlIHJvdXRlciBzdGF0ZVxuICAgICAgLy8gdGhpcyBvcGVyYXRpb24gaGFzIHNpZGUgZWZmZWN0cyA9PiByb3V0ZSBzdGF0ZSBpcyBiZWluZyBhZmZlY3RlZFxuICAgICAgY29uc3Qgcm91dGVyU3RhdGUkID0gcHJlYWN0aXZhdGlvbkRvbmUkLnBpcGUobWFwKChwKSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgcCA9PT0gJ2Jvb2xlYW4nIHx8IHRoaXMubmF2aWdhdGlvbklkICE9PSBpZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBjb25zdCB7YXBwbGllZFVybCwgc25hcHNob3QsIHNob3VsZEFjdGl2YXRlfSA9IHA7XG4gICAgICAgIGlmIChzaG91bGRBY3RpdmF0ZSkge1xuICAgICAgICAgIGNvbnN0IHN0YXRlID0gY3JlYXRlUm91dGVyU3RhdGUodGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3ksIHNuYXBzaG90LCB0aGlzLnJvdXRlclN0YXRlKTtcbiAgICAgICAgICByZXR1cm4ge2FwcGxpZWRVcmwsIHN0YXRlLCBzaG91bGRBY3RpdmF0ZX07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHthcHBsaWVkVXJsLCBzdGF0ZTogbnVsbCwgc2hvdWxkQWN0aXZhdGV9O1xuICAgICAgICB9XG4gICAgICB9KSk7XG5cblxuICAgICAgdGhpcy5hY3RpdmF0ZVJvdXRlcyhcbiAgICAgICAgICByb3V0ZXJTdGF0ZSQsIHRoaXMucm91dGVyU3RhdGUsIHRoaXMuY3VycmVudFVybFRyZWUsIGlkLCB1cmwsIHJhd1VybCwgc2tpcExvY2F0aW9uQ2hhbmdlLFxuICAgICAgICAgIHJlcGxhY2VVcmwsIHJlc29sdmVQcm9taXNlLCByZWplY3RQcm9taXNlKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtcyB0aGUgbG9naWMgb2YgYWN0aXZhdGluZyByb3V0ZXMuIFRoaXMgaXMgYSBzeW5jaHJvbm91cyBwcm9jZXNzIGJ5IGRlZmF1bHQuIFdoaWxlIHRoaXNcbiAgICogaXMgYSBwcml2YXRlIG1ldGhvZCwgaXQgY291bGQgYmUgb3ZlcnJpZGRlbiB0byBtYWtlIGFjdGl2YXRpb24gYXN5bmNocm9ub3VzLlxuICAgKi9cbiAgcHJpdmF0ZSBhY3RpdmF0ZVJvdXRlcyhcbiAgICAgIHN0YXRlOiBPYnNlcnZhYmxlPGZhbHNlfFxuICAgICAgICAgICAgICAgICAgICAgICAge2FwcGxpZWRVcmw6IFVybFRyZWUsIHN0YXRlOiBSb3V0ZXJTdGF0ZXxudWxsLCBzaG91bGRBY3RpdmF0ZT86IGJvb2xlYW59PixcbiAgICAgIHN0b3JlZFN0YXRlOiBSb3V0ZXJTdGF0ZSwgc3RvcmVkVXJsOiBVcmxUcmVlLCBpZDogbnVtYmVyLCB1cmw6IFVybFRyZWUsIHJhd1VybDogVXJsVHJlZSxcbiAgICAgIHNraXBMb2NhdGlvbkNoYW5nZTogYm9vbGVhbiwgcmVwbGFjZVVybDogYm9vbGVhbiwgcmVzb2x2ZVByb21pc2U6IGFueSwgcmVqZWN0UHJvbWlzZTogYW55KSB7XG4gICAgLy8gYXBwbGllZCB0aGUgbmV3IHJvdXRlciBzdGF0ZVxuICAgIC8vIHRoaXMgb3BlcmF0aW9uIGhhcyBzaWRlIGVmZmVjdHNcbiAgICBsZXQgbmF2aWdhdGlvbklzU3VjY2Vzc2Z1bDogYm9vbGVhbjtcblxuICAgIHN0YXRlXG4gICAgICAgIC5mb3JFYWNoKChwKSA9PiB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBwID09PSAnYm9vbGVhbicgfHwgIXAuc2hvdWxkQWN0aXZhdGUgfHwgaWQgIT09IHRoaXMubmF2aWdhdGlvbklkIHx8ICFwLnN0YXRlKSB7XG4gICAgICAgICAgICBuYXZpZ2F0aW9uSXNTdWNjZXNzZnVsID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHthcHBsaWVkVXJsLCBzdGF0ZX0gPSBwO1xuICAgICAgICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSBhcHBsaWVkVXJsO1xuICAgICAgICAgIHRoaXMucmF3VXJsVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCByYXdVcmwpO1xuXG4gICAgICAgICAgKHRoaXMgYXN7cm91dGVyU3RhdGU6IFJvdXRlclN0YXRlfSkucm91dGVyU3RhdGUgPSBzdGF0ZTtcblxuICAgICAgICAgIGlmICghc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgICAgICBjb25zdCBwYXRoID0gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh0aGlzLnJhd1VybFRyZWUpO1xuICAgICAgICAgICAgaWYgKHRoaXMubG9jYXRpb24uaXNDdXJyZW50UGF0aEVxdWFsVG8ocGF0aCkgfHwgcmVwbGFjZVVybCkge1xuICAgICAgICAgICAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShwYXRoLCAnJywge25hdmlnYXRpb25JZDogaWR9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMubG9jYXRpb24uZ28ocGF0aCwgJycsIHtuYXZpZ2F0aW9uSWQ6IGlkfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbmV3IEFjdGl2YXRlUm91dGVzKFxuICAgICAgICAgICAgICB0aGlzLnJvdXRlUmV1c2VTdHJhdGVneSwgc3RhdGUsIHN0b3JlZFN0YXRlLCAoZXZ0OiBFdmVudCkgPT4gdGhpcy50cmlnZ2VyRXZlbnQoZXZ0KSlcbiAgICAgICAgICAgICAgLmFjdGl2YXRlKHRoaXMucm9vdENvbnRleHRzKTtcblxuICAgICAgICAgIG5hdmlnYXRpb25Jc1N1Y2Nlc3NmdWwgPSB0cnVlO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbihcbiAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgaWYgKG5hdmlnYXRpb25Jc1N1Y2Nlc3NmdWwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5hdmlnYXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bElkID0gaWQ7XG4gICAgICAgICAgICAgICAgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KVxuICAgICAgICAgICAgICAgICAgICAubmV4dChuZXcgTmF2aWdhdGlvbkVuZChcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCB0aGlzLnNlcmlhbGl6ZVVybCh0aGlzLmN1cnJlbnRVcmxUcmVlKSkpO1xuICAgICAgICAgICAgICAgIHJlc29sdmVQcm9taXNlKHRydWUpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gICAgICAgICAgICAgICAgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KVxuICAgICAgICAgICAgICAgICAgICAubmV4dChuZXcgTmF2aWdhdGlvbkNhbmNlbChpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgJycpKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlUHJvbWlzZShmYWxzZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAoZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgIGlmIChpc05hdmlnYXRpb25DYW5jZWxpbmdFcnJvcihlKSkge1xuICAgICAgICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc2V0U3RhdGVBbmRVcmwoc3RvcmVkU3RhdGUsIHN0b3JlZFVybCwgcmF3VXJsKTtcbiAgICAgICAgICAgICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgICAgICAgICAgIC5uZXh0KG5ldyBOYXZpZ2F0aW9uQ2FuY2VsKGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCBlLm1lc3NhZ2UpKTtcblxuICAgICAgICAgICAgICAgIHJlc29sdmVQcm9taXNlKGZhbHNlKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc2V0U3RhdGVBbmRVcmwoc3RvcmVkU3RhdGUsIHN0b3JlZFVybCwgcmF3VXJsKTtcbiAgICAgICAgICAgICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgICAgICAgICAgIC5uZXh0KG5ldyBOYXZpZ2F0aW9uRXJyb3IoaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksIGUpKTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgcmVzb2x2ZVByb21pc2UodGhpcy5lcnJvckhhbmRsZXIoZSkpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVlKSB7XG4gICAgICAgICAgICAgICAgICByZWplY3RQcm9taXNlKGVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNldFN0YXRlQW5kVXJsKHN0b3JlZFN0YXRlOiBSb3V0ZXJTdGF0ZSwgc3RvcmVkVXJsOiBVcmxUcmVlLCByYXdVcmw6IFVybFRyZWUpOiB2b2lkIHtcbiAgICAodGhpcyBhc3tyb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGV9KS5yb3V0ZXJTdGF0ZSA9IHN0b3JlZFN0YXRlO1xuICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSBzdG9yZWRVcmw7XG4gICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHRoaXMuY3VycmVudFVybFRyZWUsIHJhd1VybCk7XG4gICAgdGhpcy5yZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk6IHZvaWQge1xuICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKFxuICAgICAgICB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHRoaXMucmF3VXJsVHJlZSksICcnLCB7bmF2aWdhdGlvbklkOiB0aGlzLmxhc3RTdWNjZXNzZnVsSWR9KTtcbiAgfVxufVxuXG5jbGFzcyBBY3RpdmF0ZVJvdXRlcyB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZVJldXNlU3RyYXRlZ3k6IFJvdXRlUmV1c2VTdHJhdGVneSwgcHJpdmF0ZSBmdXR1cmVTdGF0ZTogUm91dGVyU3RhdGUsXG4gICAgICBwcml2YXRlIGN1cnJTdGF0ZTogUm91dGVyU3RhdGUsIHByaXZhdGUgZm9yd2FyZEV2ZW50OiAoZXZ0OiBFdmVudCkgPT4gdm9pZCkge31cblxuICBhY3RpdmF0ZShwYXJlbnRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk6IHZvaWQge1xuICAgIGNvbnN0IGZ1dHVyZVJvb3QgPSB0aGlzLmZ1dHVyZVN0YXRlLl9yb290O1xuICAgIGNvbnN0IGN1cnJSb290ID0gdGhpcy5jdXJyU3RhdGUgPyB0aGlzLmN1cnJTdGF0ZS5fcm9vdCA6IG51bGw7XG5cbiAgICB0aGlzLmRlYWN0aXZhdGVDaGlsZFJvdXRlcyhmdXR1cmVSb290LCBjdXJyUm9vdCwgcGFyZW50Q29udGV4dHMpO1xuICAgIGFkdmFuY2VBY3RpdmF0ZWRSb3V0ZSh0aGlzLmZ1dHVyZVN0YXRlLnJvb3QpO1xuICAgIHRoaXMuYWN0aXZhdGVDaGlsZFJvdXRlcyhmdXR1cmVSb290LCBjdXJyUm9vdCwgcGFyZW50Q29udGV4dHMpO1xuICB9XG5cbiAgLy8gRGUtYWN0aXZhdGUgdGhlIGNoaWxkIHJvdXRlIHRoYXQgYXJlIG5vdCByZS11c2VkIGZvciB0aGUgZnV0dXJlIHN0YXRlXG4gIHByaXZhdGUgZGVhY3RpdmF0ZUNoaWxkUm91dGVzKFxuICAgICAgZnV0dXJlTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LCBjdXJyTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+fG51bGwsXG4gICAgICBjb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk6IHZvaWQge1xuICAgIGNvbnN0IGNoaWxkcmVuOiB7W291dGxldE5hbWU6IHN0cmluZ106IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPn0gPSBub2RlQ2hpbGRyZW5Bc01hcChjdXJyTm9kZSk7XG5cbiAgICAvLyBSZWN1cnNlIG9uIHRoZSByb3V0ZXMgYWN0aXZlIGluIHRoZSBmdXR1cmUgc3RhdGUgdG8gZGUtYWN0aXZhdGUgZGVlcGVyIGNoaWxkcmVuXG4gICAgZnV0dXJlTm9kZS5jaGlsZHJlbi5mb3JFYWNoKGZ1dHVyZUNoaWxkID0+IHtcbiAgICAgIGNvbnN0IGNoaWxkT3V0bGV0TmFtZSA9IGZ1dHVyZUNoaWxkLnZhbHVlLm91dGxldDtcbiAgICAgIHRoaXMuZGVhY3RpdmF0ZVJvdXRlcyhmdXR1cmVDaGlsZCwgY2hpbGRyZW5bY2hpbGRPdXRsZXROYW1lXSwgY29udGV4dHMpO1xuICAgICAgZGVsZXRlIGNoaWxkcmVuW2NoaWxkT3V0bGV0TmFtZV07XG4gICAgfSk7XG5cbiAgICAvLyBEZS1hY3RpdmF0ZSB0aGUgcm91dGVzIHRoYXQgd2lsbCBub3QgYmUgcmUtdXNlZFxuICAgIGZvckVhY2goY2hpbGRyZW4sICh2OiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sIGNoaWxkTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICB0aGlzLmRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKHYsIGNvbnRleHRzKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZGVhY3RpdmF0ZVJvdXRlcyhcbiAgICAgIGZ1dHVyZU5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPiwgY3Vyck5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPixcbiAgICAgIHBhcmVudENvbnRleHQ6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICBjb25zdCBmdXR1cmUgPSBmdXR1cmVOb2RlLnZhbHVlO1xuICAgIGNvbnN0IGN1cnIgPSBjdXJyTm9kZSA/IGN1cnJOb2RlLnZhbHVlIDogbnVsbDtcblxuICAgIGlmIChmdXR1cmUgPT09IGN1cnIpIHtcbiAgICAgIC8vIFJldXNpbmcgdGhlIG5vZGUsIGNoZWNrIHRvIHNlZSBpZiB0aGUgY2hpbGRyZW4gbmVlZCB0byBiZSBkZS1hY3RpdmF0ZWRcbiAgICAgIGlmIChmdXR1cmUuY29tcG9uZW50KSB7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgYSBub3JtYWwgcm91dGUsIHdlIG5lZWQgdG8gZ28gdGhyb3VnaCBhbiBvdXRsZXQuXG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBwYXJlbnRDb250ZXh0LmdldENvbnRleHQoZnV0dXJlLm91dGxldCk7XG4gICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgdGhpcy5kZWFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlTm9kZSwgY3Vyck5vZGUsIGNvbnRleHQuY2hpbGRyZW4pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgY29tcG9uZW50bGVzcyByb3V0ZSwgd2UgcmVjdXJzZSBidXQga2VlcCB0aGUgc2FtZSBvdXRsZXQgbWFwLlxuICAgICAgICB0aGlzLmRlYWN0aXZhdGVDaGlsZFJvdXRlcyhmdXR1cmVOb2RlLCBjdXJyTm9kZSwgcGFyZW50Q29udGV4dCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChjdXJyKSB7XG4gICAgICAgIC8vIERlYWN0aXZhdGUgdGhlIGN1cnJlbnQgcm91dGUgd2hpY2ggd2lsbCBub3QgYmUgcmUtdXNlZFxuICAgICAgICB0aGlzLmRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKGN1cnJOb2RlLCBwYXJlbnRDb250ZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKFxuICAgICAgcm91dGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPiwgcGFyZW50Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3kuc2hvdWxkRGV0YWNoKHJvdXRlLnZhbHVlLnNuYXBzaG90KSkge1xuICAgICAgdGhpcy5kZXRhY2hBbmRTdG9yZVJvdXRlU3VidHJlZShyb3V0ZSwgcGFyZW50Q29udGV4dHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRlYWN0aXZhdGVSb3V0ZUFuZE91dGxldChyb3V0ZSwgcGFyZW50Q29udGV4dHMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZGV0YWNoQW5kU3RvcmVSb3V0ZVN1YnRyZWUoXG4gICAgICByb3V0ZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LCBwYXJlbnRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk6IHZvaWQge1xuICAgIGNvbnN0IGNvbnRleHQgPSBwYXJlbnRDb250ZXh0cy5nZXRDb250ZXh0KHJvdXRlLnZhbHVlLm91dGxldCk7XG4gICAgaWYgKGNvbnRleHQgJiYgY29udGV4dC5vdXRsZXQpIHtcbiAgICAgIGNvbnN0IGNvbXBvbmVudFJlZiA9IGNvbnRleHQub3V0bGV0LmRldGFjaCgpO1xuICAgICAgY29uc3QgY29udGV4dHMgPSBjb250ZXh0LmNoaWxkcmVuLm9uT3V0bGV0RGVhY3RpdmF0ZWQoKTtcbiAgICAgIHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LnN0b3JlKHJvdXRlLnZhbHVlLnNuYXBzaG90LCB7Y29tcG9uZW50UmVmLCByb3V0ZSwgY29udGV4dHN9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGRlYWN0aXZhdGVSb3V0ZUFuZE91dGxldChcbiAgICAgIHJvdXRlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sIHBhcmVudENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzKTogdm9pZCB7XG4gICAgY29uc3QgY29udGV4dCA9IHBhcmVudENvbnRleHRzLmdldENvbnRleHQocm91dGUudmFsdWUub3V0bGV0KTtcblxuICAgIGlmIChjb250ZXh0KSB7XG4gICAgICBjb25zdCBjaGlsZHJlbjoge1tvdXRsZXROYW1lOiBzdHJpbmddOiBhbnl9ID0gbm9kZUNoaWxkcmVuQXNNYXAocm91dGUpO1xuICAgICAgY29uc3QgY29udGV4dHMgPSByb3V0ZS52YWx1ZS5jb21wb25lbnQgPyBjb250ZXh0LmNoaWxkcmVuIDogcGFyZW50Q29udGV4dHM7XG5cbiAgICAgIGZvckVhY2goY2hpbGRyZW4sICh2OiBhbnksIGs6IHN0cmluZykgPT4gdGhpcy5kZWFjdGl2YXRlUm91dGVBbmRJdHNDaGlsZHJlbih2LCBjb250ZXh0cykpO1xuXG4gICAgICBpZiAoY29udGV4dC5vdXRsZXQpIHtcbiAgICAgICAgLy8gRGVzdHJveSB0aGUgY29tcG9uZW50XG4gICAgICAgIGNvbnRleHQub3V0bGV0LmRlYWN0aXZhdGUoKTtcbiAgICAgICAgLy8gRGVzdHJveSB0aGUgY29udGV4dHMgZm9yIGFsbCB0aGUgb3V0bGV0cyB0aGF0IHdlcmUgaW4gdGhlIGNvbXBvbmVudFxuICAgICAgICBjb250ZXh0LmNoaWxkcmVuLm9uT3V0bGV0RGVhY3RpdmF0ZWQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFjdGl2YXRlQ2hpbGRSb3V0ZXMoXG4gICAgICBmdXR1cmVOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sIGN1cnJOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT58bnVsbCxcbiAgICAgIGNvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzKTogdm9pZCB7XG4gICAgY29uc3QgY2hpbGRyZW46IHtbb3V0bGV0OiBzdHJpbmddOiBhbnl9ID0gbm9kZUNoaWxkcmVuQXNNYXAoY3Vyck5vZGUpO1xuICAgIGZ1dHVyZU5vZGUuY2hpbGRyZW4uZm9yRWFjaChjID0+IHtcbiAgICAgIHRoaXMuYWN0aXZhdGVSb3V0ZXMoYywgY2hpbGRyZW5bYy52YWx1ZS5vdXRsZXRdLCBjb250ZXh0cyk7XG4gICAgICB0aGlzLmZvcndhcmRFdmVudChuZXcgQWN0aXZhdGlvbkVuZChjLnZhbHVlLnNuYXBzaG90KSk7XG4gICAgfSk7XG4gICAgaWYgKGZ1dHVyZU5vZGUuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICB0aGlzLmZvcndhcmRFdmVudChuZXcgQ2hpbGRBY3RpdmF0aW9uRW5kKGZ1dHVyZU5vZGUudmFsdWUuc25hcHNob3QpKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFjdGl2YXRlUm91dGVzKFxuICAgICAgZnV0dXJlTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LCBjdXJyTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LFxuICAgICAgcGFyZW50Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICBjb25zdCBmdXR1cmUgPSBmdXR1cmVOb2RlLnZhbHVlO1xuICAgIGNvbnN0IGN1cnIgPSBjdXJyTm9kZSA/IGN1cnJOb2RlLnZhbHVlIDogbnVsbDtcblxuICAgIGFkdmFuY2VBY3RpdmF0ZWRSb3V0ZShmdXR1cmUpO1xuXG4gICAgLy8gcmV1c2luZyB0aGUgbm9kZVxuICAgIGlmIChmdXR1cmUgPT09IGN1cnIpIHtcbiAgICAgIGlmIChmdXR1cmUuY29tcG9uZW50KSB7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgYSBub3JtYWwgcm91dGUsIHdlIG5lZWQgdG8gZ28gdGhyb3VnaCBhbiBvdXRsZXQuXG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBwYXJlbnRDb250ZXh0cy5nZXRPckNyZWF0ZUNvbnRleHQoZnV0dXJlLm91dGxldCk7XG4gICAgICAgIHRoaXMuYWN0aXZhdGVDaGlsZFJvdXRlcyhmdXR1cmVOb2RlLCBjdXJyTm9kZSwgY29udGV4dC5jaGlsZHJlbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgY29tcG9uZW50bGVzcyByb3V0ZSwgd2UgcmVjdXJzZSBidXQga2VlcCB0aGUgc2FtZSBvdXRsZXQgbWFwLlxuICAgICAgICB0aGlzLmFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlTm9kZSwgY3Vyck5vZGUsIHBhcmVudENvbnRleHRzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGZ1dHVyZS5jb21wb25lbnQpIHtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIG5vcm1hbCByb3V0ZSwgd2UgbmVlZCB0byBwbGFjZSB0aGUgY29tcG9uZW50IGludG8gdGhlIG91dGxldCBhbmQgcmVjdXJzZS5cbiAgICAgICAgY29uc3QgY29udGV4dCA9IHBhcmVudENvbnRleHRzLmdldE9yQ3JlYXRlQ29udGV4dChmdXR1cmUub3V0bGV0KTtcblxuICAgICAgICBpZiAodGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3kuc2hvdWxkQXR0YWNoKGZ1dHVyZS5zbmFwc2hvdCkpIHtcbiAgICAgICAgICBjb25zdCBzdG9yZWQgPVxuICAgICAgICAgICAgICAoPERldGFjaGVkUm91dGVIYW5kbGVJbnRlcm5hbD50aGlzLnJvdXRlUmV1c2VTdHJhdGVneS5yZXRyaWV2ZShmdXR1cmUuc25hcHNob3QpKTtcbiAgICAgICAgICB0aGlzLnJvdXRlUmV1c2VTdHJhdGVneS5zdG9yZShmdXR1cmUuc25hcHNob3QsIG51bGwpO1xuICAgICAgICAgIGNvbnRleHQuY2hpbGRyZW4ub25PdXRsZXRSZUF0dGFjaGVkKHN0b3JlZC5jb250ZXh0cyk7XG4gICAgICAgICAgY29udGV4dC5hdHRhY2hSZWYgPSBzdG9yZWQuY29tcG9uZW50UmVmO1xuICAgICAgICAgIGNvbnRleHQucm91dGUgPSBzdG9yZWQucm91dGUudmFsdWU7XG4gICAgICAgICAgaWYgKGNvbnRleHQub3V0bGV0KSB7XG4gICAgICAgICAgICAvLyBBdHRhY2ggcmlnaHQgYXdheSB3aGVuIHRoZSBvdXRsZXQgaGFzIGFscmVhZHkgYmVlbiBpbnN0YW50aWF0ZWRcbiAgICAgICAgICAgIC8vIE90aGVyd2lzZSBhdHRhY2ggZnJvbSBgUm91dGVyT3V0bGV0Lm5nT25Jbml0YCB3aGVuIGl0IGlzIGluc3RhbnRpYXRlZFxuICAgICAgICAgICAgY29udGV4dC5vdXRsZXQuYXR0YWNoKHN0b3JlZC5jb21wb25lbnRSZWYsIHN0b3JlZC5yb3V0ZS52YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGFkdmFuY2VBY3RpdmF0ZWRSb3V0ZU5vZGVBbmRJdHNDaGlsZHJlbihzdG9yZWQucm91dGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGNvbmZpZyA9IHBhcmVudExvYWRlZENvbmZpZyhmdXR1cmUuc25hcHNob3QpO1xuICAgICAgICAgIGNvbnN0IGNtcEZhY3RvcnlSZXNvbHZlciA9IGNvbmZpZyA/IGNvbmZpZy5tb2R1bGUuY29tcG9uZW50RmFjdG9yeVJlc29sdmVyIDogbnVsbDtcblxuICAgICAgICAgIGNvbnRleHQucm91dGUgPSBmdXR1cmU7XG4gICAgICAgICAgY29udGV4dC5yZXNvbHZlciA9IGNtcEZhY3RvcnlSZXNvbHZlcjtcbiAgICAgICAgICBpZiAoY29udGV4dC5vdXRsZXQpIHtcbiAgICAgICAgICAgIC8vIEFjdGl2YXRlIHRoZSBvdXRsZXQgd2hlbiBpdCBoYXMgYWxyZWFkeSBiZWVuIGluc3RhbnRpYXRlZFxuICAgICAgICAgICAgLy8gT3RoZXJ3aXNlIGl0IHdpbGwgZ2V0IGFjdGl2YXRlZCBmcm9tIGl0cyBgbmdPbkluaXRgIHdoZW4gaW5zdGFudGlhdGVkXG4gICAgICAgICAgICBjb250ZXh0Lm91dGxldC5hY3RpdmF0ZVdpdGgoZnV0dXJlLCBjbXBGYWN0b3J5UmVzb2x2ZXIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuYWN0aXZhdGVDaGlsZFJvdXRlcyhmdXR1cmVOb2RlLCBudWxsLCBjb250ZXh0LmNoaWxkcmVuKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIGNvbXBvbmVudGxlc3Mgcm91dGUsIHdlIHJlY3Vyc2UgYnV0IGtlZXAgdGhlIHNhbWUgb3V0bGV0IG1hcC5cbiAgICAgICAgdGhpcy5hY3RpdmF0ZUNoaWxkUm91dGVzKGZ1dHVyZU5vZGUsIG51bGwsIHBhcmVudENvbnRleHRzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYWR2YW5jZUFjdGl2YXRlZFJvdXRlTm9kZUFuZEl0c0NoaWxkcmVuKG5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPik6IHZvaWQge1xuICBhZHZhbmNlQWN0aXZhdGVkUm91dGUobm9kZS52YWx1ZSk7XG4gIG5vZGUuY2hpbGRyZW4uZm9yRWFjaChhZHZhbmNlQWN0aXZhdGVkUm91dGVOb2RlQW5kSXRzQ2hpbGRyZW4pO1xufVxuXG5mdW5jdGlvbiBwYXJlbnRMb2FkZWRDb25maWcoc25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBMb2FkZWRSb3V0ZXJDb25maWd8bnVsbCB7XG4gIGZvciAobGV0IHMgPSBzbmFwc2hvdC5wYXJlbnQ7IHM7IHMgPSBzLnBhcmVudCkge1xuICAgIGNvbnN0IHJvdXRlID0gcy5yb3V0ZUNvbmZpZztcbiAgICBpZiAocm91dGUgJiYgcm91dGUuX2xvYWRlZENvbmZpZykgcmV0dXJuIHJvdXRlLl9sb2FkZWRDb25maWc7XG4gICAgaWYgKHJvdXRlICYmIHJvdXRlLmNvbXBvbmVudCkgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVDb21tYW5kcyhjb21tYW5kczogc3RyaW5nW10pOiB2b2lkIHtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb21tYW5kcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNtZCA9IGNvbW1hbmRzW2ldO1xuICAgIGlmIChjbWQgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgcmVxdWVzdGVkIHBhdGggY29udGFpbnMgJHtjbWR9IHNlZ21lbnQgYXQgaW5kZXggJHtpfWApO1xuICAgIH1cbiAgfVxufVxuIl19