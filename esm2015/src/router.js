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
        /**
         * Defines when the router updates the browser URL. The default behavior is to update after
         * successful navigation. However, some applications may prefer a mode where the URL gets
         * updated at the beginning of navigation. The most common use case would be updating the
         * URL early so if navigation fails, you can show an error message with the URL that failed.
         * Available options are:
         *
         * - `'deferred'`, the default, updates the browser URL after navigation has finished.
         * - `'eager'`, updates browser URL at the beginning of navigation.
         */
        this.urlUpdateStrategy = 'deferred';
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
            if (this.urlUpdateStrategy === 'eager' && !extras.skipLocationChange) {
                this.setBrowserUrl(rawUrl, !!extras.replaceUrl, id);
            }
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
            if (this.urlUpdateStrategy === 'deferred' && !skipLocationChange) {
                this.setBrowserUrl(this.rawUrlTree, replaceUrl, id);
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
     * @param {?} url
     * @param {?} replaceUrl
     * @param {?} id
     * @return {?}
     */
    setBrowserUrl(url, replaceUrl, id) {
        /** @type {?} */
        const path = this.urlSerializer.serialize(url);
        if (this.location.isCurrentPathEqualTo(path) || replaceUrl) {
            this.location.replaceState(path, '', { navigationId: id });
        }
        else {
            this.location.go(path, '', { navigationId: id });
        }
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
    /**
     * Defines when the router updates the browser URL. The default behavior is to update after
     * successful navigation. However, some applications may prefer a mode where the URL gets
     * updated at the beginning of navigation. The most common use case would be updating the
     * URL early so if navigation fails, you can show an error message with the URL that failed.
     * Available options are:
     *
     * - `'deferred'`, the default, updates the browser URL after navigation has finished.
     * - `'eager'`, updates browser URL at the beginning of navigation.
     * @type {?}
     */
    Router.prototype.urlUpdateStrategy;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFTQSxPQUFPLEVBQTRDLFdBQVcsRUFBUSxTQUFTLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdEcsT0FBTyxFQUFDLGVBQWUsRUFBYyxPQUFPLEVBQWdCLEVBQUUsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUM3RSxPQUFPLEVBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUV4RCxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDakQsT0FBTyxFQUF5RCxpQkFBaUIsRUFBRSxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDbkgsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDeEQsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ2hELE9BQU8sRUFBQyxhQUFhLEVBQUUsa0JBQWtCLEVBQVMsY0FBYyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFxQixVQUFVLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ2hSLE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUMvQyxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ3RDLE9BQU8sRUFBQyx5QkFBeUIsRUFBa0QsTUFBTSx3QkFBd0IsQ0FBQztBQUNsSCxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUUxRCxPQUFPLEVBQTJFLHFCQUFxQixFQUFFLGdCQUFnQixFQUE2QixNQUFN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QUNGOztDQUVKOzs7Ozs7Ozs7Ozs7Ozs7QUFFRCxpREFBaUQsSUFBOEI7SUFDN0UscUJBQXFCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7Q0FDaEU7Ozs7O0FBRUQsNEJBQTRCLFFBQWdDO0lBQzFELEtBQUssSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUU7O1FBQzdDLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUM7UUFDNUIsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLGFBQWE7WUFBRSxPQUFPLEtBQUssQ0FBQyxhQUFhLENBQUM7UUFDN0QsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLFNBQVM7WUFBRSxPQUFPLElBQUksQ0FBQztLQUMzQztJQUVELE9BQU8sSUFBSSxDQUFDO0NBQ2I7Ozs7O0FBRUQsMEJBQTBCLFFBQWtCO0lBQzFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFOztRQUN4QyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsR0FBRyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUM3RTtLQUNGO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0NvbXBpbGVyLCBJbmplY3RvciwgTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBOZ01vZHVsZVJlZiwgVHlwZSwgaXNEZXZNb2RlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7QmVoYXZpb3JTdWJqZWN0LCBPYnNlcnZhYmxlLCBTdWJqZWN0LCBTdWJzY3JpcHRpb24sIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NvbmNhdE1hcCwgbWFwLCBtZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge2FwcGx5UmVkaXJlY3RzfSBmcm9tICcuL2FwcGx5X3JlZGlyZWN0cyc7XG5pbXBvcnQge0xvYWRlZFJvdXRlckNvbmZpZywgUXVlcnlQYXJhbXNIYW5kbGluZywgUm91dGUsIFJvdXRlcywgc3RhbmRhcmRpemVDb25maWcsIHZhbGlkYXRlQ29uZmlnfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge2NyZWF0ZVJvdXRlclN0YXRlfSBmcm9tICcuL2NyZWF0ZV9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtjcmVhdGVVcmxUcmVlfSBmcm9tICcuL2NyZWF0ZV91cmxfdHJlZSc7XG5pbXBvcnQge0FjdGl2YXRpb25FbmQsIENoaWxkQWN0aXZhdGlvbkVuZCwgRXZlbnQsIEd1YXJkc0NoZWNrRW5kLCBHdWFyZHNDaGVja1N0YXJ0LCBOYXZpZ2F0aW9uQ2FuY2VsLCBOYXZpZ2F0aW9uRW5kLCBOYXZpZ2F0aW9uRXJyb3IsIE5hdmlnYXRpb25TdGFydCwgTmF2aWdhdGlvblRyaWdnZXIsIFJlc29sdmVFbmQsIFJlc29sdmVTdGFydCwgUm91dGVDb25maWdMb2FkRW5kLCBSb3V0ZUNvbmZpZ0xvYWRTdGFydCwgUm91dGVzUmVjb2duaXplZH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtQcmVBY3RpdmF0aW9ufSBmcm9tICcuL3ByZV9hY3RpdmF0aW9uJztcbmltcG9ydCB7cmVjb2duaXplfSBmcm9tICcuL3JlY29nbml6ZSc7XG5pbXBvcnQge0RlZmF1bHRSb3V0ZVJldXNlU3RyYXRlZ3ksIERldGFjaGVkUm91dGVIYW5kbGVJbnRlcm5hbCwgUm91dGVSZXVzZVN0cmF0ZWd5fSBmcm9tICcuL3JvdXRlX3JldXNlX3N0cmF0ZWd5JztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0c30gZnJvbSAnLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZSwgQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgUm91dGVyU3RhdGUsIFJvdXRlclN0YXRlU25hcHNob3QsIGFkdmFuY2VBY3RpdmF0ZWRSb3V0ZSwgY3JlYXRlRW1wdHlTdGF0ZSwgaW5oZXJpdGVkUGFyYW1zRGF0YVJlc29sdmV9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UGFyYW1zLCBpc05hdmlnYXRpb25DYW5jZWxpbmdFcnJvcn0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtEZWZhdWx0VXJsSGFuZGxpbmdTdHJhdGVneSwgVXJsSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi91cmxfaGFuZGxpbmdfc3RyYXRlZ3knO1xuaW1wb3J0IHtVcmxTZXJpYWxpemVyLCBVcmxUcmVlLCBjb250YWluc1RyZWUsIGNyZWF0ZUVtcHR5VXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge2ZvckVhY2h9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge1RyZWVOb2RlLCBub2RlQ2hpbGRyZW5Bc01hcH0gZnJvbSAnLi91dGlscy90cmVlJztcblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIGV4dHJhIG9wdGlvbnMgdXNlZCBkdXJpbmcgbmF2aWdhdGlvbi5cbiAqXG4gKlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5hdmlnYXRpb25FeHRyYXMge1xuICAvKipcbiAgICogRW5hYmxlcyByZWxhdGl2ZSBuYXZpZ2F0aW9uIGZyb20gdGhlIGN1cnJlbnQgQWN0aXZhdGVkUm91dGUuXG4gICAqXG4gICAqIENvbmZpZ3VyYXRpb246XG4gICAqXG4gICAqIGBgYFxuICAgKiBbe1xuICAqICAgcGF0aDogJ3BhcmVudCcsXG4gICogICBjb21wb25lbnQ6IFBhcmVudENvbXBvbmVudCxcbiAgKiAgIGNoaWxkcmVuOiBbe1xuICAqICAgICBwYXRoOiAnbGlzdCcsXG4gICogICAgIGNvbXBvbmVudDogTGlzdENvbXBvbmVudFxuICAqICAgfSx7XG4gICogICAgIHBhdGg6ICdjaGlsZCcsXG4gICogICAgIGNvbXBvbmVudDogQ2hpbGRDb21wb25lbnRcbiAgKiAgIH1dXG4gICogfV1cbiAgICogYGBgXG4gICAqXG4gICAqIE5hdmlnYXRlIHRvIGxpc3Qgcm91dGUgZnJvbSBjaGlsZCByb3V0ZTpcbiAgICpcbiAgICogYGBgXG4gICAqICBAQ29tcG9uZW50KHsuLi59KVxuICAgKiAgY2xhc3MgQ2hpbGRDb21wb25lbnQge1xuICAqICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsIHByaXZhdGUgcm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7fVxuICAqXG4gICogICAgZ28oKSB7XG4gICogICAgICB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy4uL2xpc3QnXSwgeyByZWxhdGl2ZVRvOiB0aGlzLnJvdXRlIH0pO1xuICAqICAgIH1cbiAgKiAgfVxuICAgKiBgYGBcbiAgICovXG4gIHJlbGF0aXZlVG8/OiBBY3RpdmF0ZWRSb3V0ZXxudWxsO1xuXG4gIC8qKlxuICAgKiBTZXRzIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gdGhlIFVSTC5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHRvIC9yZXN1bHRzP3BhZ2U9MVxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy9yZXN1bHRzJ10sIHsgcXVlcnlQYXJhbXM6IHsgcGFnZTogMSB9IH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHF1ZXJ5UGFyYW1zPzogUGFyYW1zfG51bGw7XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGhhc2ggZnJhZ21lbnQgZm9yIHRoZSBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvcmVzdWx0cyN0b3BcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvcmVzdWx0cyddLCB7IGZyYWdtZW50OiAndG9wJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudD86IHN0cmluZztcblxuICAvKipcbiAgICogUHJlc2VydmVzIHRoZSBxdWVyeSBwYXJhbWV0ZXJzIGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBkZXByZWNhdGVkLCB1c2UgYHF1ZXJ5UGFyYW1zSGFuZGxpbmdgIGluc3RlYWRcbiAgICpcbiAgICogYGBgXG4gICAqIC8vIFByZXNlcnZlIHF1ZXJ5IHBhcmFtcyBmcm9tIC9yZXN1bHRzP3BhZ2U9MSB0byAvdmlldz9wYWdlPTFcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHByZXNlcnZlUXVlcnlQYXJhbXM6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBzaW5jZSB2NFxuICAgKi9cbiAgcHJlc2VydmVRdWVyeVBhcmFtcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqICBjb25maWcgc3RyYXRlZ3kgdG8gaGFuZGxlIHRoZSBxdWVyeSBwYXJhbWV0ZXJzIGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gZnJvbSAvcmVzdWx0cz9wYWdlPTEgdG8gL3ZpZXc/cGFnZT0xJnBhZ2U9MlxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgcXVlcnlQYXJhbXM6IHsgcGFnZTogMiB9LCAgcXVlcnlQYXJhbXNIYW5kbGluZzogXCJtZXJnZVwiIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHF1ZXJ5UGFyYW1zSGFuZGxpbmc/OiBRdWVyeVBhcmFtc0hhbmRsaW5nfG51bGw7XG4gIC8qKlxuICAgKiBQcmVzZXJ2ZXMgdGhlIGZyYWdtZW50IGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBQcmVzZXJ2ZSBmcmFnbWVudCBmcm9tIC9yZXN1bHRzI3RvcCB0byAvdmlldyN0b3BcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHByZXNlcnZlRnJhZ21lbnQ6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcHJlc2VydmVGcmFnbWVudD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBOYXZpZ2F0ZXMgd2l0aG91dCBwdXNoaW5nIGEgbmV3IHN0YXRlIGludG8gaGlzdG9yeS5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHNpbGVudGx5IHRvIC92aWV3XG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgc2tpcExvY2F0aW9uQ2hhbmdlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIE5hdmlnYXRlcyB3aGlsZSByZXBsYWNpbmcgdGhlIGN1cnJlbnQgc3RhdGUgaW4gaGlzdG9yeS5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHRvIC92aWV3XG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyByZXBsYWNlVXJsOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHJlcGxhY2VVcmw/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEVycm9yIGhhbmRsZXIgdGhhdCBpcyBpbnZva2VkIHdoZW4gYSBuYXZpZ2F0aW9uIGVycm9ycy5cbiAqXG4gKiBJZiB0aGUgaGFuZGxlciByZXR1cm5zIGEgdmFsdWUsIHRoZSBuYXZpZ2F0aW9uIHByb21pc2Ugd2lsbCBiZSByZXNvbHZlZCB3aXRoIHRoaXMgdmFsdWUuXG4gKiBJZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLCB0aGUgbmF2aWdhdGlvbiBwcm9taXNlIHdpbGwgYmUgcmVqZWN0ZWQgd2l0aFxuICogdGhlIGV4Y2VwdGlvbi5cbiAqXG4gKlxuICovXG5leHBvcnQgdHlwZSBFcnJvckhhbmRsZXIgPSAoZXJyb3I6IGFueSkgPT4gYW55O1xuXG5mdW5jdGlvbiBkZWZhdWx0RXJyb3JIYW5kbGVyKGVycm9yOiBhbnkpOiBhbnkge1xuICB0aHJvdyBlcnJvcjtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdE1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcihcbiAgICBlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gIHJldHVybiB1cmxTZXJpYWxpemVyLnBhcnNlKCcvJyk7XG59XG5cbnR5cGUgTmF2U3RyZWFtVmFsdWUgPVxuICAgIGJvb2xlYW4gfCB7YXBwbGllZFVybDogVXJsVHJlZSwgc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QsIHNob3VsZEFjdGl2YXRlPzogYm9vbGVhbn07XG5cbnR5cGUgTmF2aWdhdGlvblBhcmFtcyA9IHtcbiAgaWQ6IG51bWJlcixcbiAgcmF3VXJsOiBVcmxUcmVlLFxuICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMsXG4gIHJlc29sdmU6IGFueSxcbiAgcmVqZWN0OiBhbnksXG4gIHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj4sXG4gIHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIsXG4gIHN0YXRlOiB7bmF2aWdhdGlvbklkOiBudW1iZXJ9IHwgbnVsbFxufTtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IHR5cGUgUm91dGVySG9vayA9IChzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCwgcnVuRXh0cmFzOiB7XG4gIGFwcGxpZWRVcmxUcmVlOiBVcmxUcmVlLFxuICByYXdVcmxUcmVlOiBVcmxUcmVlLFxuICBza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW4sXG4gIHJlcGxhY2VVcmw6IGJvb2xlYW4sXG4gIG5hdmlnYXRpb25JZDogbnVtYmVyXG59KSA9PiBPYnNlcnZhYmxlPHZvaWQ+O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBkZWZhdWx0Um91dGVySG9vayhzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCwgcnVuRXh0cmFzOiB7XG4gIGFwcGxpZWRVcmxUcmVlOiBVcmxUcmVlLFxuICByYXdVcmxUcmVlOiBVcmxUcmVlLFxuICBza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW4sXG4gIHJlcGxhY2VVcmw6IGJvb2xlYW4sXG4gIG5hdmlnYXRpb25JZDogbnVtYmVyXG59KTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gIHJldHVybiBvZiAobnVsbCkgYXMgYW55O1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIHRoZSBuYXZpZ2F0aW9uIGFuZCB1cmwgbWFuaXB1bGF0aW9uIGNhcGFiaWxpdGllcy5cbiAqXG4gKiBTZWUgYFJvdXRlc2AgZm9yIG1vcmUgZGV0YWlscyBhbmQgZXhhbXBsZXMuXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZXIge1xuICBwcml2YXRlIGN1cnJlbnRVcmxUcmVlOiBVcmxUcmVlO1xuICBwcml2YXRlIHJhd1VybFRyZWU6IFVybFRyZWU7XG4gIHByaXZhdGUgbmF2aWdhdGlvbnMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PE5hdmlnYXRpb25QYXJhbXM+KG51bGwgISk7XG5cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgbG9jYXRpb25TdWJzY3JpcHRpb24gITogU3Vic2NyaXB0aW9uO1xuICBwcml2YXRlIG5hdmlnYXRpb25JZDogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBjb25maWdMb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcjtcbiAgcHJpdmF0ZSBuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55PjtcblxuICBwdWJsaWMgcmVhZG9ubHkgZXZlbnRzOiBPYnNlcnZhYmxlPEV2ZW50PiA9IG5ldyBTdWJqZWN0PEV2ZW50PigpO1xuICBwdWJsaWMgcmVhZG9ubHkgcm91dGVyU3RhdGU6IFJvdXRlclN0YXRlO1xuXG4gIC8qKlxuICAgKiBFcnJvciBoYW5kbGVyIHRoYXQgaXMgaW52b2tlZCB3aGVuIGEgbmF2aWdhdGlvbiBlcnJvcnMuXG4gICAqXG4gICAqIFNlZSBgRXJyb3JIYW5kbGVyYCBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICovXG4gIGVycm9ySGFuZGxlcjogRXJyb3JIYW5kbGVyID0gZGVmYXVsdEVycm9ySGFuZGxlcjtcblxuICAvKipcbiAgICogTWFsZm9ybWVkIHVyaSBlcnJvciBoYW5kbGVyIGlzIGludm9rZWQgd2hlbiBgUm91dGVyLnBhcnNlVXJsKHVybClgIHRocm93cyBhblxuICAgKiBlcnJvciBkdWUgdG8gY29udGFpbmluZyBhbiBpbnZhbGlkIGNoYXJhY3Rlci4gVGhlIG1vc3QgY29tbW9uIGNhc2Ugd291bGQgYmUgYSBgJWAgc2lnblxuICAgKiB0aGF0J3Mgbm90IGVuY29kZWQgYW5kIGlzIG5vdCBwYXJ0IG9mIGEgcGVyY2VudCBlbmNvZGVkIHNlcXVlbmNlLlxuICAgKi9cbiAgbWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyOlxuICAgICAgKGVycm9yOiBVUklFcnJvciwgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICAgICB1cmw6IHN0cmluZykgPT4gVXJsVHJlZSA9IGRlZmF1bHRNYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyBpZiBhdCBsZWFzdCBvbmUgbmF2aWdhdGlvbiBoYXBwZW5lZC5cbiAgICovXG4gIG5hdmlnYXRlZDogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIGxhc3RTdWNjZXNzZnVsSWQ6IG51bWJlciA9IC0xO1xuXG4gIC8qKlxuICAgKiBVc2VkIGJ5IFJvdXRlck1vZHVsZS4gVGhpcyBhbGxvd3MgdXMgdG9cbiAgICogcGF1c2UgdGhlIG5hdmlnYXRpb24gZWl0aGVyIGJlZm9yZSBwcmVhY3RpdmF0aW9uIG9yIGFmdGVyIGl0LlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGhvb2tzOiB7YmVmb3JlUHJlYWN0aXZhdGlvbjogUm91dGVySG9vaywgYWZ0ZXJQcmVhY3RpdmF0aW9uOiBSb3V0ZXJIb29rfSA9IHtcbiAgICBiZWZvcmVQcmVhY3RpdmF0aW9uOiBkZWZhdWx0Um91dGVySG9vayxcbiAgICBhZnRlclByZWFjdGl2YXRpb246IGRlZmF1bHRSb3V0ZXJIb29rXG4gIH07XG5cbiAgLyoqXG4gICAqIEV4dHJhY3RzIGFuZCBtZXJnZXMgVVJMcy4gVXNlZCBmb3IgQW5ndWxhckpTIHRvIEFuZ3VsYXIgbWlncmF0aW9ucy5cbiAgICovXG4gIHVybEhhbmRsaW5nU3RyYXRlZ3k6IFVybEhhbmRsaW5nU3RyYXRlZ3kgPSBuZXcgRGVmYXVsdFVybEhhbmRsaW5nU3RyYXRlZ3koKTtcblxuICByb3V0ZVJldXNlU3RyYXRlZ3k6IFJvdXRlUmV1c2VTdHJhdGVneSA9IG5ldyBEZWZhdWx0Um91dGVSZXVzZVN0cmF0ZWd5KCk7XG5cbiAgLyoqXG4gICAqIERlZmluZSB3aGF0IHRoZSByb3V0ZXIgc2hvdWxkIGRvIGlmIGl0IHJlY2VpdmVzIGEgbmF2aWdhdGlvbiByZXF1ZXN0IHRvIHRoZSBjdXJyZW50IFVSTC5cbiAgICogQnkgZGVmYXVsdCwgdGhlIHJvdXRlciB3aWxsIGlnbm9yZSB0aGlzIG5hdmlnYXRpb24uIEhvd2V2ZXIsIHRoaXMgcHJldmVudHMgZmVhdHVyZXMgc3VjaFxuICAgKiBhcyBhIFwicmVmcmVzaFwiIGJ1dHRvbi4gVXNlIHRoaXMgb3B0aW9uIHRvIGNvbmZpZ3VyZSB0aGUgYmVoYXZpb3Igd2hlbiBuYXZpZ2F0aW5nIHRvIHRoZVxuICAgKiBjdXJyZW50IFVSTC4gRGVmYXVsdCBpcyAnaWdub3JlJy5cbiAgICovXG4gIG9uU2FtZVVybE5hdmlnYXRpb246ICdyZWxvYWQnfCdpZ25vcmUnID0gJ2lnbm9yZSc7XG5cbiAgLyoqXG4gICAqIERlZmluZXMgaG93IHRoZSByb3V0ZXIgbWVyZ2VzIHBhcmFtcywgZGF0YSBhbmQgcmVzb2x2ZWQgZGF0YSBmcm9tIHBhcmVudCB0byBjaGlsZFxuICAgKiByb3V0ZXMuIEF2YWlsYWJsZSBvcHRpb25zIGFyZTpcbiAgICpcbiAgICogLSBgJ2VtcHR5T25seSdgLCB0aGUgZGVmYXVsdCwgb25seSBpbmhlcml0cyBwYXJlbnQgcGFyYW1zIGZvciBwYXRoLWxlc3Mgb3IgY29tcG9uZW50LWxlc3NcbiAgICogICByb3V0ZXMuXG4gICAqIC0gYCdhbHdheXMnYCwgZW5hYmxlcyB1bmNvbmRpdGlvbmFsIGluaGVyaXRhbmNlIG9mIHBhcmVudCBwYXJhbXMuXG4gICAqL1xuICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiAnZW1wdHlPbmx5J3wnYWx3YXlzJyA9ICdlbXB0eU9ubHknO1xuXG4gIC8qKlxuICAgKiBEZWZpbmVzIHdoZW4gdGhlIHJvdXRlciB1cGRhdGVzIHRoZSBicm93c2VyIFVSTC4gVGhlIGRlZmF1bHQgYmVoYXZpb3IgaXMgdG8gdXBkYXRlIGFmdGVyXG4gICAqIHN1Y2Nlc3NmdWwgbmF2aWdhdGlvbi4gSG93ZXZlciwgc29tZSBhcHBsaWNhdGlvbnMgbWF5IHByZWZlciBhIG1vZGUgd2hlcmUgdGhlIFVSTCBnZXRzXG4gICAqIHVwZGF0ZWQgYXQgdGhlIGJlZ2lubmluZyBvZiBuYXZpZ2F0aW9uLiBUaGUgbW9zdCBjb21tb24gdXNlIGNhc2Ugd291bGQgYmUgdXBkYXRpbmcgdGhlXG4gICAqIFVSTCBlYXJseSBzbyBpZiBuYXZpZ2F0aW9uIGZhaWxzLCB5b3UgY2FuIHNob3cgYW4gZXJyb3IgbWVzc2FnZSB3aXRoIHRoZSBVUkwgdGhhdCBmYWlsZWQuXG4gICAqIEF2YWlsYWJsZSBvcHRpb25zIGFyZTpcbiAgICpcbiAgICogLSBgJ2RlZmVycmVkJ2AsIHRoZSBkZWZhdWx0LCB1cGRhdGVzIHRoZSBicm93c2VyIFVSTCBhZnRlciBuYXZpZ2F0aW9uIGhhcyBmaW5pc2hlZC5cbiAgICogLSBgJ2VhZ2VyJ2AsIHVwZGF0ZXMgYnJvd3NlciBVUkwgYXQgdGhlIGJlZ2lubmluZyBvZiBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgdXJsVXBkYXRlU3RyYXRlZ3k6ICdkZWZlcnJlZCd8J2VhZ2VyJyA9ICdkZWZlcnJlZCc7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgdGhlIHJvdXRlciBzZXJ2aWNlLlxuICAgKi9cbiAgLy8gVE9ETzogdnNhdmtpbiBtYWtlIGludGVybmFsIGFmdGVyIHRoZSBmaW5hbCBpcyBvdXQuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+fG51bGwsIHByaXZhdGUgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICAgIHByaXZhdGUgcm9vdENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLCBwcml2YXRlIGxvY2F0aW9uOiBMb2NhdGlvbiwgaW5qZWN0b3I6IEluamVjdG9yLFxuICAgICAgbG9hZGVyOiBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIGNvbXBpbGVyOiBDb21waWxlciwgcHVibGljIGNvbmZpZzogUm91dGVzKSB7XG4gICAgY29uc3Qgb25Mb2FkU3RhcnQgPSAocjogUm91dGUpID0+IHRoaXMudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRTdGFydChyKSk7XG4gICAgY29uc3Qgb25Mb2FkRW5kID0gKHI6IFJvdXRlKSA9PiB0aGlzLnRyaWdnZXJFdmVudChuZXcgUm91dGVDb25maWdMb2FkRW5kKHIpKTtcblxuICAgIHRoaXMubmdNb2R1bGUgPSBpbmplY3Rvci5nZXQoTmdNb2R1bGVSZWYpO1xuXG4gICAgdGhpcy5yZXNldENvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSBjcmVhdGVFbXB0eVVybFRyZWUoKTtcbiAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLmN1cnJlbnRVcmxUcmVlO1xuXG4gICAgdGhpcy5jb25maWdMb2FkZXIgPSBuZXcgUm91dGVyQ29uZmlnTG9hZGVyKGxvYWRlciwgY29tcGlsZXIsIG9uTG9hZFN0YXJ0LCBvbkxvYWRFbmQpO1xuICAgIHRoaXMucm91dGVyU3RhdGUgPSBjcmVhdGVFbXB0eVN0YXRlKHRoaXMuY3VycmVudFVybFRyZWUsIHRoaXMucm9vdENvbXBvbmVudFR5cGUpO1xuICAgIHRoaXMucHJvY2Vzc05hdmlnYXRpb25zKCk7XG4gIH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIFRPRE86IHRoaXMgc2hvdWxkIGJlIHJlbW92ZWQgb25jZSB0aGUgY29uc3RydWN0b3Igb2YgdGhlIHJvdXRlciBtYWRlIGludGVybmFsXG4gICAqL1xuICByZXNldFJvb3RDb21wb25lbnRUeXBlKHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT4pOiB2b2lkIHtcbiAgICB0aGlzLnJvb3RDb21wb25lbnRUeXBlID0gcm9vdENvbXBvbmVudFR5cGU7XG4gICAgLy8gVE9ETzogdnNhdmtpbiByb3V0ZXIgNC4wIHNob3VsZCBtYWtlIHRoZSByb290IGNvbXBvbmVudCBzZXQgdG8gbnVsbFxuICAgIC8vIHRoaXMgd2lsbCBzaW1wbGlmeSB0aGUgbGlmZWN5Y2xlIG9mIHRoZSByb3V0ZXIuXG4gICAgdGhpcy5yb3V0ZXJTdGF0ZS5yb290LmNvbXBvbmVudCA9IHRoaXMucm9vdENvbXBvbmVudFR5cGU7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyIGFuZCBwZXJmb3JtcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaW5pdGlhbE5hdmlnYXRpb24oKTogdm9pZCB7XG4gICAgdGhpcy5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICBpZiAodGhpcy5uYXZpZ2F0aW9uSWQgPT09IDApIHtcbiAgICAgIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmxvY2F0aW9uLnBhdGgodHJ1ZSksIHtyZXBsYWNlVXJsOiB0cnVlfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdXAgdGhlIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lci5cbiAgICovXG4gIHNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpOiB2b2lkIHtcbiAgICAvLyBEb24ndCBuZWVkIHRvIHVzZSBab25lLndyYXAgYW55IG1vcmUsIGJlY2F1c2Ugem9uZS5qc1xuICAgIC8vIGFscmVhZHkgcGF0Y2ggb25Qb3BTdGF0ZSwgc28gbG9jYXRpb24gY2hhbmdlIGNhbGxiYWNrIHdpbGxcbiAgICAvLyBydW4gaW50byBuZ1pvbmVcbiAgICBpZiAoIXRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24gPSA8YW55PnRoaXMubG9jYXRpb24uc3Vic2NyaWJlKChjaGFuZ2U6IGFueSkgPT4ge1xuICAgICAgICBsZXQgcmF3VXJsVHJlZSA9IHRoaXMucGFyc2VVcmwoY2hhbmdlWyd1cmwnXSk7XG4gICAgICAgIGNvbnN0IHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIgPSBjaGFuZ2VbJ3R5cGUnXSA9PT0gJ3BvcHN0YXRlJyA/ICdwb3BzdGF0ZScgOiAnaGFzaGNoYW5nZSc7XG4gICAgICAgIGNvbnN0IHN0YXRlID0gY2hhbmdlLnN0YXRlICYmIGNoYW5nZS5zdGF0ZS5uYXZpZ2F0aW9uSWQgP1xuICAgICAgICAgICAge25hdmlnYXRpb25JZDogY2hhbmdlLnN0YXRlLm5hdmlnYXRpb25JZH0gOlxuICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgc2V0VGltZW91dChcbiAgICAgICAgICAgICgpID0+IHsgdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24ocmF3VXJsVHJlZSwgc291cmNlLCBzdGF0ZSwge3JlcGxhY2VVcmw6IHRydWV9KTsgfSwgMCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKiogVGhlIGN1cnJlbnQgdXJsICovXG4gIGdldCB1cmwoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuc2VyaWFsaXplVXJsKHRoaXMuY3VycmVudFVybFRyZWUpOyB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICB0cmlnZ2VyRXZlbnQoZTogRXZlbnQpOiB2b2lkIHsgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KS5uZXh0KGUpOyB9XG5cbiAgLyoqXG4gICAqIFJlc2V0cyB0aGUgY29uZmlndXJhdGlvbiB1c2VkIGZvciBuYXZpZ2F0aW9uIGFuZCBnZW5lcmF0aW5nIGxpbmtzLlxuICAgKlxuICAgKiAjIyMgVXNhZ2VcbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5yZXNldENvbmZpZyhbXG4gICAqICB7IHBhdGg6ICd0ZWFtLzppZCcsIGNvbXBvbmVudDogVGVhbUNtcCwgY2hpbGRyZW46IFtcbiAgICogICAgeyBwYXRoOiAnc2ltcGxlJywgY29tcG9uZW50OiBTaW1wbGVDbXAgfSxcbiAgICogICAgeyBwYXRoOiAndXNlci86bmFtZScsIGNvbXBvbmVudDogVXNlckNtcCB9XG4gICAqICBdfVxuICAgKiBdKTtcbiAgICogYGBgXG4gICAqL1xuICByZXNldENvbmZpZyhjb25maWc6IFJvdXRlcyk6IHZvaWQge1xuICAgIHZhbGlkYXRlQ29uZmlnKGNvbmZpZyk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWcubWFwKHN0YW5kYXJkaXplQ29uZmlnKTtcbiAgICB0aGlzLm5hdmlnYXRlZCA9IGZhbHNlO1xuICAgIHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCA9IC0xO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7IHRoaXMuZGlzcG9zZSgpOyB9XG5cbiAgLyoqIERpc3Bvc2VzIG9mIHRoZSByb3V0ZXIgKi9cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbiA9IG51bGwgITtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQXBwbGllcyBhbiBhcnJheSBvZiBjb21tYW5kcyB0byB0aGUgY3VycmVudCB1cmwgdHJlZSBhbmQgY3JlYXRlcyBhIG5ldyB1cmwgdHJlZS5cbiAgICpcbiAgICogV2hlbiBnaXZlbiBhbiBhY3RpdmF0ZSByb3V0ZSwgYXBwbGllcyB0aGUgZ2l2ZW4gY29tbWFuZHMgc3RhcnRpbmcgZnJvbSB0aGUgcm91dGUuXG4gICAqIFdoZW4gbm90IGdpdmVuIGEgcm91dGUsIGFwcGxpZXMgdGhlIGdpdmVuIGNvbW1hbmQgc3RhcnRpbmcgZnJvbSB0aGUgcm9vdC5cbiAgICpcbiAgICogIyMjIFVzYWdlXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvdXNlci8xMVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzO2V4cGFuZD10cnVlL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7ZXhwYW5kOiB0cnVlfSwgJ3VzZXInLCAxMV0pO1xuICAgKlxuICAgKiAvLyB5b3UgY2FuIGNvbGxhcHNlIHN0YXRpYyBzZWdtZW50cyBsaWtlIHRoaXMgKHRoaXMgd29ya3Mgb25seSB3aXRoIHRoZSBmaXJzdCBwYXNzZWQtaW4gdmFsdWUpOlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtLzMzL3VzZXInLCB1c2VySWRdKTtcbiAgICpcbiAgICogLy8gSWYgdGhlIGZpcnN0IHNlZ21lbnQgY2FuIGNvbnRhaW4gc2xhc2hlcywgYW5kIHlvdSBkbyBub3Qgd2FudCB0aGUgcm91dGVyIHRvIHNwbGl0IGl0LCB5b3VcbiAgICogLy8gY2FuIGRvIHRoZSBmb2xsb3dpbmc6XG4gICAqXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFt7c2VnbWVudFBhdGg6ICcvb25lL3R3byd9XSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMy8odXNlci8xMS8vcmlnaHQ6Y2hhdClcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6ICdjaGF0J319XSk7XG4gICAqXG4gICAqIC8vIHJlbW92ZSB0aGUgcmlnaHQgc2Vjb25kYXJ5IG5vZGVcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6IG51bGx9fV0pO1xuICAgKlxuICAgKiAvLyBhc3N1bWluZyB0aGUgY3VycmVudCB1cmwgaXMgYC90ZWFtLzMzL3VzZXIvMTFgIGFuZCB0aGUgcm91dGUgcG9pbnRzIHRvIGB1c2VyLzExYFxuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzExL2RldGFpbHNcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWydkZXRhaWxzJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzQ0L3VzZXIvMjJcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycuLi8uLi90ZWFtLzQ0L3VzZXIvMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgY3JlYXRlVXJsVHJlZShjb21tYW5kczogYW55W10sIG5hdmlnYXRpb25FeHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7fSk6IFVybFRyZWUge1xuICAgIGNvbnN0IHtyZWxhdGl2ZVRvLCAgICAgICAgICBxdWVyeVBhcmFtcywgICAgICAgICBmcmFnbWVudCxcbiAgICAgICAgICAgcHJlc2VydmVRdWVyeVBhcmFtcywgcXVlcnlQYXJhbXNIYW5kbGluZywgcHJlc2VydmVGcmFnbWVudH0gPSBuYXZpZ2F0aW9uRXh0cmFzO1xuICAgIGlmIChpc0Rldk1vZGUoKSAmJiBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zICYmIDxhbnk+Y29uc29sZSAmJiA8YW55PmNvbnNvbGUud2Fybikge1xuICAgICAgY29uc29sZS53YXJuKCdwcmVzZXJ2ZVF1ZXJ5UGFyYW1zIGlzIGRlcHJlY2F0ZWQsIHVzZSBxdWVyeVBhcmFtc0hhbmRsaW5nIGluc3RlYWQuJyk7XG4gICAgfVxuICAgIGNvbnN0IGEgPSByZWxhdGl2ZVRvIHx8IHRoaXMucm91dGVyU3RhdGUucm9vdDtcbiAgICBjb25zdCBmID0gcHJlc2VydmVGcmFnbWVudCA/IHRoaXMuY3VycmVudFVybFRyZWUuZnJhZ21lbnQgOiBmcmFnbWVudDtcbiAgICBsZXQgcTogUGFyYW1zfG51bGwgPSBudWxsO1xuICAgIGlmIChxdWVyeVBhcmFtc0hhbmRsaW5nKSB7XG4gICAgICBzd2l0Y2ggKHF1ZXJ5UGFyYW1zSGFuZGxpbmcpIHtcbiAgICAgICAgY2FzZSAnbWVyZ2UnOlxuICAgICAgICAgIHEgPSB7Li4udGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcywgLi4ucXVlcnlQYXJhbXN9O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdwcmVzZXJ2ZSc6XG4gICAgICAgICAgcSA9IHRoaXMuY3VycmVudFVybFRyZWUucXVlcnlQYXJhbXM7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcSA9IHF1ZXJ5UGFyYW1zIHx8IG51bGw7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHEgPSBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zID8gdGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcyA6IHF1ZXJ5UGFyYW1zIHx8IG51bGw7XG4gICAgfVxuICAgIGlmIChxICE9PSBudWxsKSB7XG4gICAgICBxID0gdGhpcy5yZW1vdmVFbXB0eVByb3BzKHEpO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlVXJsVHJlZShhLCB0aGlzLmN1cnJlbnRVcmxUcmVlLCBjb21tYW5kcywgcSAhLCBmICEpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIGJhc2VkIG9uIHRoZSBwcm92aWRlZCB1cmwuIFRoaXMgbmF2aWdhdGlvbiBpcyBhbHdheXMgYWJzb2x1dGUuXG4gICAqXG4gICAqIFJldHVybnMgYSBwcm9taXNlIHRoYXQ6XG4gICAqIC0gcmVzb2x2ZXMgdG8gJ3RydWUnIHdoZW4gbmF2aWdhdGlvbiBzdWNjZWVkcyxcbiAgICogLSByZXNvbHZlcyB0byAnZmFsc2UnIHdoZW4gbmF2aWdhdGlvbiBmYWlscyxcbiAgICogLSBpcyByZWplY3RlZCB3aGVuIGFuIGVycm9yIGhhcHBlbnMuXG4gICAqXG4gICAqICMjIyBVc2FnZVxuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLm5hdmlnYXRlQnlVcmwoXCIvdGVhbS8zMy91c2VyLzExXCIpO1xuICAgKlxuICAgKiAvLyBOYXZpZ2F0ZSB3aXRob3V0IHVwZGF0aW5nIHRoZSBVUkxcbiAgICogcm91dGVyLm5hdmlnYXRlQnlVcmwoXCIvdGVhbS8zMy91c2VyLzExXCIsIHsgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogSW4gb3Bwb3NpdGUgdG8gYG5hdmlnYXRlYCwgYG5hdmlnYXRlQnlVcmxgIHRha2VzIGEgd2hvbGUgVVJMXG4gICAqIGFuZCBkb2VzIG5vdCBhcHBseSBhbnkgZGVsdGEgdG8gdGhlIGN1cnJlbnQgb25lLlxuICAgKi9cbiAgbmF2aWdhdGVCeVVybCh1cmw6IHN0cmluZ3xVcmxUcmVlLCBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7c2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZX0pOlxuICAgICAgUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgdXJsVHJlZSA9IHVybCBpbnN0YW5jZW9mIFVybFRyZWUgPyB1cmwgOiB0aGlzLnBhcnNlVXJsKHVybCk7XG4gICAgY29uc3QgbWVyZ2VkVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh1cmxUcmVlLCB0aGlzLnJhd1VybFRyZWUpO1xuXG4gICAgcmV0dXJuIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKG1lcmdlZFRyZWUsICdpbXBlcmF0aXZlJywgbnVsbCwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZSBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgYXJyYXkgb2YgY29tbWFuZHMgYW5kIGEgc3RhcnRpbmcgcG9pbnQuXG4gICAqIElmIG5vIHN0YXJ0aW5nIHJvdXRlIGlzIHByb3ZpZGVkLCB0aGUgbmF2aWdhdGlvbiBpcyBhYnNvbHV0ZS5cbiAgICpcbiAgICogUmV0dXJucyBhIHByb21pc2UgdGhhdDpcbiAgICogLSByZXNvbHZlcyB0byAndHJ1ZScgd2hlbiBuYXZpZ2F0aW9uIHN1Y2NlZWRzLFxuICAgKiAtIHJlc29sdmVzIHRvICdmYWxzZScgd2hlbiBuYXZpZ2F0aW9uIGZhaWxzLFxuICAgKiAtIGlzIHJlamVjdGVkIHdoZW4gYW4gZXJyb3IgaGFwcGVucy5cbiAgICpcbiAgICogIyMjIFVzYWdlXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIubmF2aWdhdGUoWyd0ZWFtJywgMzMsICd1c2VyJywgMTFdLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMXG4gICAqIHJvdXRlci5uYXZpZ2F0ZShbJ3RlYW0nLCAzMywgJ3VzZXInLCAxMV0sIHtyZWxhdGl2ZVRvOiByb3V0ZSwgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBJbiBvcHBvc2l0ZSB0byBgbmF2aWdhdGVCeVVybGAsIGBuYXZpZ2F0ZWAgYWx3YXlzIHRha2VzIGEgZGVsdGEgdGhhdCBpcyBhcHBsaWVkIHRvIHRoZSBjdXJyZW50XG4gICAqIFVSTC5cbiAgICovXG4gIG5hdmlnYXRlKGNvbW1hbmRzOiBhbnlbXSwgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3NraXBMb2NhdGlvbkNoYW5nZTogZmFsc2V9KTpcbiAgICAgIFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHMpO1xuICAgIHJldHVybiB0aGlzLm5hdmlnYXRlQnlVcmwodGhpcy5jcmVhdGVVcmxUcmVlKGNvbW1hbmRzLCBleHRyYXMpLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqIFNlcmlhbGl6ZXMgYSBgVXJsVHJlZWAgaW50byBhIHN0cmluZyAqL1xuICBzZXJpYWxpemVVcmwodXJsOiBVcmxUcmVlKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodXJsKTsgfVxuXG4gIC8qKiBQYXJzZXMgYSBzdHJpbmcgaW50byBhIGBVcmxUcmVlYCAqL1xuICBwYXJzZVVybCh1cmw6IHN0cmluZyk6IFVybFRyZWUge1xuICAgIGxldCB1cmxUcmVlOiBVcmxUcmVlO1xuICAgIHRyeSB7XG4gICAgICB1cmxUcmVlID0gdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKHVybCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdXJsVHJlZSA9IHRoaXMubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyKGUsIHRoaXMudXJsU2VyaWFsaXplciwgdXJsKTtcbiAgICB9XG4gICAgcmV0dXJuIHVybFRyZWU7XG4gIH1cblxuICAvKiogUmV0dXJucyB3aGV0aGVyIHRoZSB1cmwgaXMgYWN0aXZhdGVkICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIGV4YWN0OiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgaWYgKHVybCBpbnN0YW5jZW9mIFVybFRyZWUpIHtcbiAgICAgIHJldHVybiBjb250YWluc1RyZWUodGhpcy5jdXJyZW50VXJsVHJlZSwgdXJsLCBleGFjdCk7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybFRyZWUsIGV4YWN0KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVtb3ZlRW1wdHlQcm9wcyhwYXJhbXM6IFBhcmFtcyk6IFBhcmFtcyB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHBhcmFtcykucmVkdWNlKChyZXN1bHQ6IFBhcmFtcywga2V5OiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlOiBhbnkgPSBwYXJhbXNba2V5XTtcbiAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sIHt9KTtcbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc05hdmlnYXRpb25zKCk6IHZvaWQge1xuICAgIHRoaXMubmF2aWdhdGlvbnNcbiAgICAgICAgLnBpcGUoY29uY2F0TWFwKChuYXY6IE5hdmlnYXRpb25QYXJhbXMpID0+IHtcbiAgICAgICAgICBpZiAobmF2KSB7XG4gICAgICAgICAgICB0aGlzLmV4ZWN1dGVTY2hlZHVsZWROYXZpZ2F0aW9uKG5hdik7XG4gICAgICAgICAgICAvLyBhIGZhaWxlZCBuYXZpZ2F0aW9uIHNob3VsZCBub3Qgc3RvcCB0aGUgcm91dGVyIGZyb20gcHJvY2Vzc2luZ1xuICAgICAgICAgICAgLy8gZnVydGhlciBuYXZpZ2F0aW9ucyA9PiB0aGUgY2F0Y2hcbiAgICAgICAgICAgIHJldHVybiBuYXYucHJvbWlzZS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiA8YW55Pm9mIChudWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pKVxuICAgICAgICAuc3Vic2NyaWJlKCgpID0+IHt9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2NoZWR1bGVOYXZpZ2F0aW9uKFxuICAgICAgcmF3VXJsOiBVcmxUcmVlLCBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLCBzdGF0ZToge25hdmlnYXRpb25JZDogbnVtYmVyfXxudWxsLFxuICAgICAgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgbGFzdE5hdmlnYXRpb24gPSB0aGlzLm5hdmlnYXRpb25zLnZhbHVlO1xuICAgIC8vIElmIHRoZSB1c2VyIHRyaWdnZXJzIGEgbmF2aWdhdGlvbiBpbXBlcmF0aXZlbHkgKGUuZy4sIGJ5IHVzaW5nIG5hdmlnYXRlQnlVcmwpLFxuICAgIC8vIGFuZCB0aGF0IG5hdmlnYXRpb24gcmVzdWx0cyBpbiAncmVwbGFjZVN0YXRlJyB0aGF0IGxlYWRzIHRvIHRoZSBzYW1lIFVSTCxcbiAgICAvLyB3ZSBzaG91bGQgc2tpcCB0aG9zZS5cbiAgICBpZiAobGFzdE5hdmlnYXRpb24gJiYgc291cmNlICE9PSAnaW1wZXJhdGl2ZScgJiYgbGFzdE5hdmlnYXRpb24uc291cmNlID09PSAnaW1wZXJhdGl2ZScgJiZcbiAgICAgICAgbGFzdE5hdmlnYXRpb24ucmF3VXJsLnRvU3RyaW5nKCkgPT09IHJhd1VybC50b1N0cmluZygpKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpOyAgLy8gcmV0dXJuIHZhbHVlIGlzIG5vdCB1c2VkXG4gICAgfVxuXG4gICAgLy8gQmVjYXVzZSBvZiBhIGJ1ZyBpbiBJRSBhbmQgRWRnZSwgdGhlIGxvY2F0aW9uIGNsYXNzIGZpcmVzIHR3byBldmVudHMgKHBvcHN0YXRlIGFuZFxuICAgIC8vIGhhc2hjaGFuZ2UpIGV2ZXJ5IHNpbmdsZSB0aW1lLiBUaGUgc2Vjb25kIG9uZSBzaG91bGQgYmUgaWdub3JlZC4gT3RoZXJ3aXNlLCB0aGUgVVJMIHdpbGxcbiAgICAvLyBmbGlja2VyLiBIYW5kbGVzIHRoZSBjYXNlIHdoZW4gYSBwb3BzdGF0ZSB3YXMgZW1pdHRlZCBmaXJzdC5cbiAgICBpZiAobGFzdE5hdmlnYXRpb24gJiYgc291cmNlID09ICdoYXNoY2hhbmdlJyAmJiBsYXN0TmF2aWdhdGlvbi5zb3VyY2UgPT09ICdwb3BzdGF0ZScgJiZcbiAgICAgICAgbGFzdE5hdmlnYXRpb24ucmF3VXJsLnRvU3RyaW5nKCkgPT09IHJhd1VybC50b1N0cmluZygpKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpOyAgLy8gcmV0dXJuIHZhbHVlIGlzIG5vdCB1c2VkXG4gICAgfVxuICAgIC8vIEJlY2F1c2Ugb2YgYSBidWcgaW4gSUUgYW5kIEVkZ2UsIHRoZSBsb2NhdGlvbiBjbGFzcyBmaXJlcyB0d28gZXZlbnRzIChwb3BzdGF0ZSBhbmRcbiAgICAvLyBoYXNoY2hhbmdlKSBldmVyeSBzaW5nbGUgdGltZS4gVGhlIHNlY29uZCBvbmUgc2hvdWxkIGJlIGlnbm9yZWQuIE90aGVyd2lzZSwgdGhlIFVSTCB3aWxsXG4gICAgLy8gZmxpY2tlci4gSGFuZGxlcyB0aGUgY2FzZSB3aGVuIGEgaGFzaGNoYW5nZSB3YXMgZW1pdHRlZCBmaXJzdC5cbiAgICBpZiAobGFzdE5hdmlnYXRpb24gJiYgc291cmNlID09ICdwb3BzdGF0ZScgJiYgbGFzdE5hdmlnYXRpb24uc291cmNlID09PSAnaGFzaGNoYW5nZScgJiZcbiAgICAgICAgbGFzdE5hdmlnYXRpb24ucmF3VXJsLnRvU3RyaW5nKCkgPT09IHJhd1VybC50b1N0cmluZygpKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpOyAgLy8gcmV0dXJuIHZhbHVlIGlzIG5vdCB1c2VkXG4gICAgfVxuXG4gICAgbGV0IHJlc29sdmU6IGFueSA9IG51bGw7XG4gICAgbGV0IHJlamVjdDogYW55ID0gbnVsbDtcblxuICAgIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzLCByZWopID0+IHtcbiAgICAgIHJlc29sdmUgPSByZXM7XG4gICAgICByZWplY3QgPSByZWo7XG4gICAgfSk7XG5cbiAgICBjb25zdCBpZCA9ICsrdGhpcy5uYXZpZ2F0aW9uSWQ7XG4gICAgdGhpcy5uYXZpZ2F0aW9ucy5uZXh0KHtpZCwgc291cmNlLCBzdGF0ZSwgcmF3VXJsLCBleHRyYXMsIHJlc29sdmUsIHJlamVjdCwgcHJvbWlzZX0pO1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoYXQgdGhlIGVycm9yIGlzIHByb3BhZ2F0ZWQgZXZlbiB0aG91Z2ggYHByb2Nlc3NOYXZpZ2F0aW9uc2AgY2F0Y2hcbiAgICAvLyBoYW5kbGVyIGRvZXMgbm90IHJldGhyb3dcbiAgICByZXR1cm4gcHJvbWlzZS5jYXRjaCgoZTogYW55KSA9PiBQcm9taXNlLnJlamVjdChlKSk7XG4gIH1cblxuICBwcml2YXRlIGV4ZWN1dGVTY2hlZHVsZWROYXZpZ2F0aW9uKHtpZCwgcmF3VXJsLCBleHRyYXMsIHJlc29sdmUsIHJlamVjdCwgc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZX06IE5hdmlnYXRpb25QYXJhbXMpOiB2b2lkIHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuZXh0cmFjdChyYXdVcmwpO1xuICAgIGNvbnN0IHVybFRyYW5zaXRpb24gPSAhdGhpcy5uYXZpZ2F0ZWQgfHwgdXJsLnRvU3RyaW5nKCkgIT09IHRoaXMuY3VycmVudFVybFRyZWUudG9TdHJpbmcoKTtcblxuICAgIGlmICgodGhpcy5vblNhbWVVcmxOYXZpZ2F0aW9uID09PSAncmVsb2FkJyA/IHRydWUgOiB1cmxUcmFuc2l0aW9uKSAmJlxuICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybChyYXdVcmwpKSB7XG4gICAgICBpZiAodGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJyAmJiAhZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICB0aGlzLnNldEJyb3dzZXJVcmwocmF3VXJsLCAhIWV4dHJhcy5yZXBsYWNlVXJsLCBpZCk7XG4gICAgICB9XG4gICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25TdGFydChpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgc291cmNlLCBzdGF0ZSkpO1xuICAgICAgUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgKF8pID0+IHRoaXMucnVuTmF2aWdhdGUoXG4gICAgICAgICAgICAgICAgICB1cmwsIHJhd1VybCwgISFleHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlLCAhIWV4dHJhcy5yZXBsYWNlVXJsLCBpZCwgbnVsbCkpXG4gICAgICAgICAgLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcblxuICAgICAgLy8gd2UgY2Fubm90IHByb2Nlc3MgdGhlIGN1cnJlbnQgVVJMLCBidXQgd2UgY291bGQgcHJvY2VzcyB0aGUgcHJldmlvdXMgb25lID0+XG4gICAgICAvLyB3ZSBuZWVkIHRvIGRvIHNvbWUgY2xlYW51cFxuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHVybFRyYW5zaXRpb24gJiYgdGhpcy5yYXdVcmxUcmVlICYmXG4gICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5zaG91bGRQcm9jZXNzVXJsKHRoaXMucmF3VXJsVHJlZSkpIHtcbiAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAubmV4dChuZXcgTmF2aWdhdGlvblN0YXJ0KGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCBzb3VyY2UsIHN0YXRlKSk7XG4gICAgICBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAoXykgPT4gdGhpcy5ydW5OYXZpZ2F0ZShcbiAgICAgICAgICAgICAgICAgIHVybCwgcmF3VXJsLCBmYWxzZSwgZmFsc2UsIGlkLFxuICAgICAgICAgICAgICAgICAgY3JlYXRlRW1wdHlTdGF0ZSh1cmwsIHRoaXMucm9vdENvbXBvbmVudFR5cGUpLnNuYXBzaG90KSlcbiAgICAgICAgICAudGhlbihyZXNvbHZlLCByZWplY3QpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucmF3VXJsVHJlZSA9IHJhd1VybDtcbiAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBydW5OYXZpZ2F0ZShcbiAgICAgIHVybDogVXJsVHJlZSwgcmF3VXJsOiBVcmxUcmVlLCBza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW4sIHJlcGxhY2VVcmw6IGJvb2xlYW4sIGlkOiBudW1iZXIsXG4gICAgICBwcmVjcmVhdGVkU3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3R8bnVsbCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmIChpZCAhPT0gdGhpcy5uYXZpZ2F0aW9uSWQpIHtcbiAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAubmV4dChuZXcgTmF2aWdhdGlvbkNhbmNlbChcbiAgICAgICAgICAgICAgaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksXG4gICAgICAgICAgICAgIGBOYXZpZ2F0aW9uIElEICR7aWR9IGlzIG5vdCBlcXVhbCB0byB0aGUgY3VycmVudCBuYXZpZ2F0aW9uIGlkICR7dGhpcy5uYXZpZ2F0aW9uSWR9YCkpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShmYWxzZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlUHJvbWlzZSwgcmVqZWN0UHJvbWlzZSkgPT4ge1xuICAgICAgLy8gY3JlYXRlIGFuIG9ic2VydmFibGUgb2YgdGhlIHVybCBhbmQgcm91dGUgc3RhdGUgc25hcHNob3RcbiAgICAgIC8vIHRoaXMgb3BlcmF0aW9uIGRvIG5vdCByZXN1bHQgaW4gYW55IHNpZGUgZWZmZWN0c1xuICAgICAgbGV0IHVybEFuZFNuYXBzaG90JDogT2JzZXJ2YWJsZTxOYXZTdHJlYW1WYWx1ZT47XG4gICAgICBpZiAoIXByZWNyZWF0ZWRTdGF0ZSkge1xuICAgICAgICBjb25zdCBtb2R1bGVJbmplY3RvciA9IHRoaXMubmdNb2R1bGUuaW5qZWN0b3I7XG4gICAgICAgIGNvbnN0IHJlZGlyZWN0c0FwcGxpZWQkID1cbiAgICAgICAgICAgIGFwcGx5UmVkaXJlY3RzKG1vZHVsZUluamVjdG9yLCB0aGlzLmNvbmZpZ0xvYWRlciwgdGhpcy51cmxTZXJpYWxpemVyLCB1cmwsIHRoaXMuY29uZmlnKTtcblxuICAgICAgICB1cmxBbmRTbmFwc2hvdCQgPSByZWRpcmVjdHNBcHBsaWVkJC5waXBlKG1lcmdlTWFwKChhcHBsaWVkVXJsOiBVcmxUcmVlKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHJlY29nbml6ZShcbiAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9vdENvbXBvbmVudFR5cGUsIHRoaXMuY29uZmlnLCBhcHBsaWVkVXJsLCB0aGlzLnNlcmlhbGl6ZVVybChhcHBsaWVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSlcbiAgICAgICAgICAgICAgLnBpcGUobWFwKChzbmFwc2hvdDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KVxuICAgICAgICAgICAgICAgICAgICAubmV4dChuZXcgUm91dGVzUmVjb2duaXplZChcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCB0aGlzLnNlcmlhbGl6ZVVybChhcHBsaWVkVXJsKSwgc25hcHNob3QpKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB7YXBwbGllZFVybCwgc25hcHNob3R9O1xuICAgICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHVybEFuZFNuYXBzaG90JCA9IG9mICh7YXBwbGllZFVybDogdXJsLCBzbmFwc2hvdDogcHJlY3JlYXRlZFN0YXRlfSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGJlZm9yZVByZWFjdGl2YXRpb25Eb25lJCA9XG4gICAgICAgICAgdXJsQW5kU25hcHNob3QkLnBpcGUobWVyZ2VNYXAoKHApOiBPYnNlcnZhYmxlPE5hdlN0cmVhbVZhbHVlPiA9PiB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHAgPT09ICdib29sZWFuJykgcmV0dXJuIG9mIChwKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhvb2tzXG4gICAgICAgICAgICAgICAgLmJlZm9yZVByZWFjdGl2YXRpb24ocC5zbmFwc2hvdCwge1xuICAgICAgICAgICAgICAgICAgbmF2aWdhdGlvbklkOiBpZCxcbiAgICAgICAgICAgICAgICAgIGFwcGxpZWRVcmxUcmVlOiB1cmwsXG4gICAgICAgICAgICAgICAgICByYXdVcmxUcmVlOiByYXdVcmwsIHNraXBMb2NhdGlvbkNoYW5nZSwgcmVwbGFjZVVybCxcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5waXBlKG1hcCgoKSA9PiBwKSk7XG4gICAgICAgICAgfSkpO1xuXG4gICAgICAvLyBydW4gcHJlYWN0aXZhdGlvbjogZ3VhcmRzIGFuZCBkYXRhIHJlc29sdmVyc1xuICAgICAgbGV0IHByZUFjdGl2YXRpb246IFByZUFjdGl2YXRpb247XG5cbiAgICAgIGNvbnN0IHByZWFjdGl2YXRpb25TZXR1cCQgPSBiZWZvcmVQcmVhY3RpdmF0aW9uRG9uZSQucGlwZShtYXAoKHApOiBOYXZTdHJlYW1WYWx1ZSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgcCA9PT0gJ2Jvb2xlYW4nKSByZXR1cm4gcDtcbiAgICAgICAgY29uc3Qge2FwcGxpZWRVcmwsIHNuYXBzaG90fSA9IHA7XG4gICAgICAgIGNvbnN0IG1vZHVsZUluamVjdG9yID0gdGhpcy5uZ01vZHVsZS5pbmplY3RvcjtcbiAgICAgICAgcHJlQWN0aXZhdGlvbiA9IG5ldyBQcmVBY3RpdmF0aW9uKFxuICAgICAgICAgICAgc25hcHNob3QsIHRoaXMucm91dGVyU3RhdGUuc25hcHNob3QsIG1vZHVsZUluamVjdG9yLFxuICAgICAgICAgICAgKGV2dDogRXZlbnQpID0+IHRoaXMudHJpZ2dlckV2ZW50KGV2dCkpO1xuICAgICAgICBwcmVBY3RpdmF0aW9uLmluaXRpYWxpemUodGhpcy5yb290Q29udGV4dHMpO1xuICAgICAgICByZXR1cm4ge2FwcGxpZWRVcmwsIHNuYXBzaG90fTtcbiAgICAgIH0pKTtcblxuICAgICAgY29uc3QgcHJlYWN0aXZhdGlvbkNoZWNrR3VhcmRzJCA9XG4gICAgICAgICAgcHJlYWN0aXZhdGlvblNldHVwJC5waXBlKG1lcmdlTWFwKChwKTogT2JzZXJ2YWJsZTxOYXZTdHJlYW1WYWx1ZT4gPT4ge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwID09PSAnYm9vbGVhbicgfHwgdGhpcy5uYXZpZ2F0aW9uSWQgIT09IGlkKSByZXR1cm4gb2YgKGZhbHNlKTtcbiAgICAgICAgICAgIGNvbnN0IHthcHBsaWVkVXJsLCBzbmFwc2hvdH0gPSBwO1xuXG4gICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChuZXcgR3VhcmRzQ2hlY2tTdGFydChcbiAgICAgICAgICAgICAgICBpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgdGhpcy5zZXJpYWxpemVVcmwoYXBwbGllZFVybCksIHNuYXBzaG90KSk7XG5cbiAgICAgICAgICAgIHJldHVybiBwcmVBY3RpdmF0aW9uLmNoZWNrR3VhcmRzKCkucGlwZShtYXAoKHNob3VsZEFjdGl2YXRlOiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KG5ldyBHdWFyZHNDaGVja0VuZChcbiAgICAgICAgICAgICAgICAgIGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCB0aGlzLnNlcmlhbGl6ZVVybChhcHBsaWVkVXJsKSwgc25hcHNob3QsXG4gICAgICAgICAgICAgICAgICBzaG91bGRBY3RpdmF0ZSkpO1xuICAgICAgICAgICAgICByZXR1cm4ge2FwcGxpZWRVcmw6IGFwcGxpZWRVcmwsIHNuYXBzaG90OiBzbmFwc2hvdCwgc2hvdWxkQWN0aXZhdGU6IHNob3VsZEFjdGl2YXRlfTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICB9KSk7XG5cbiAgICAgIGNvbnN0IHByZWFjdGl2YXRpb25SZXNvbHZlRGF0YSQgPVxuICAgICAgICAgIHByZWFjdGl2YXRpb25DaGVja0d1YXJkcyQucGlwZShtZXJnZU1hcCgocCk6IE9ic2VydmFibGU8TmF2U3RyZWFtVmFsdWU+ID0+IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcCA9PT0gJ2Jvb2xlYW4nIHx8IHRoaXMubmF2aWdhdGlvbklkICE9PSBpZCkgcmV0dXJuIG9mIChmYWxzZSk7XG5cbiAgICAgICAgICAgIGlmIChwLnNob3VsZEFjdGl2YXRlICYmIHByZUFjdGl2YXRpb24uaXNBY3RpdmF0aW5nKCkpIHtcbiAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQobmV3IFJlc29sdmVTdGFydChcbiAgICAgICAgICAgICAgICAgIGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCB0aGlzLnNlcmlhbGl6ZVVybChwLmFwcGxpZWRVcmwpLCBwLnNuYXBzaG90KSk7XG4gICAgICAgICAgICAgIHJldHVybiBwcmVBY3RpdmF0aW9uLnJlc29sdmVEYXRhKHRoaXMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSkucGlwZShtYXAoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KG5ldyBSZXNvbHZlRW5kKFxuICAgICAgICAgICAgICAgICAgICBpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgdGhpcy5zZXJpYWxpemVVcmwocC5hcHBsaWVkVXJsKSwgcC5zbmFwc2hvdCkpO1xuICAgICAgICAgICAgICAgIHJldHVybiBwO1xuICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gb2YgKHApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pKTtcblxuICAgICAgY29uc3QgcHJlYWN0aXZhdGlvbkRvbmUkID1cbiAgICAgICAgICBwcmVhY3RpdmF0aW9uUmVzb2x2ZURhdGEkLnBpcGUobWVyZ2VNYXAoKHApOiBPYnNlcnZhYmxlPE5hdlN0cmVhbVZhbHVlPiA9PiB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHAgPT09ICdib29sZWFuJyB8fCB0aGlzLm5hdmlnYXRpb25JZCAhPT0gaWQpIHJldHVybiBvZiAoZmFsc2UpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaG9va3NcbiAgICAgICAgICAgICAgICAuYWZ0ZXJQcmVhY3RpdmF0aW9uKHAuc25hcHNob3QsIHtcbiAgICAgICAgICAgICAgICAgIG5hdmlnYXRpb25JZDogaWQsXG4gICAgICAgICAgICAgICAgICBhcHBsaWVkVXJsVHJlZTogdXJsLFxuICAgICAgICAgICAgICAgICAgcmF3VXJsVHJlZTogcmF3VXJsLCBza2lwTG9jYXRpb25DaGFuZ2UsIHJlcGxhY2VVcmwsXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAucGlwZShtYXAoKCkgPT4gcCkpO1xuICAgICAgICAgIH0pKTtcblxuXG4gICAgICAvLyBjcmVhdGUgcm91dGVyIHN0YXRlXG4gICAgICAvLyB0aGlzIG9wZXJhdGlvbiBoYXMgc2lkZSBlZmZlY3RzID0+IHJvdXRlIHN0YXRlIGlzIGJlaW5nIGFmZmVjdGVkXG4gICAgICBjb25zdCByb3V0ZXJTdGF0ZSQgPSBwcmVhY3RpdmF0aW9uRG9uZSQucGlwZShtYXAoKHApID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBwID09PSAnYm9vbGVhbicgfHwgdGhpcy5uYXZpZ2F0aW9uSWQgIT09IGlkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGNvbnN0IHthcHBsaWVkVXJsLCBzbmFwc2hvdCwgc2hvdWxkQWN0aXZhdGV9ID0gcDtcbiAgICAgICAgaWYgKHNob3VsZEFjdGl2YXRlKSB7XG4gICAgICAgICAgY29uc3Qgc3RhdGUgPSBjcmVhdGVSb3V0ZXJTdGF0ZSh0aGlzLnJvdXRlUmV1c2VTdHJhdGVneSwgc25hcHNob3QsIHRoaXMucm91dGVyU3RhdGUpO1xuICAgICAgICAgIHJldHVybiB7YXBwbGllZFVybCwgc3RhdGUsIHNob3VsZEFjdGl2YXRlfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4ge2FwcGxpZWRVcmwsIHN0YXRlOiBudWxsLCBzaG91bGRBY3RpdmF0ZX07XG4gICAgICAgIH1cbiAgICAgIH0pKTtcblxuXG4gICAgICB0aGlzLmFjdGl2YXRlUm91dGVzKFxuICAgICAgICAgIHJvdXRlclN0YXRlJCwgdGhpcy5yb3V0ZXJTdGF0ZSwgdGhpcy5jdXJyZW50VXJsVHJlZSwgaWQsIHVybCwgcmF3VXJsLCBza2lwTG9jYXRpb25DaGFuZ2UsXG4gICAgICAgICAgcmVwbGFjZVVybCwgcmVzb2x2ZVByb21pc2UsIHJlamVjdFByb21pc2UpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFBlcmZvcm1zIHRoZSBsb2dpYyBvZiBhY3RpdmF0aW5nIHJvdXRlcy4gVGhpcyBpcyBhIHN5bmNocm9ub3VzIHByb2Nlc3MgYnkgZGVmYXVsdC4gV2hpbGUgdGhpc1xuICAgKiBpcyBhIHByaXZhdGUgbWV0aG9kLCBpdCBjb3VsZCBiZSBvdmVycmlkZGVuIHRvIG1ha2UgYWN0aXZhdGlvbiBhc3luY2hyb25vdXMuXG4gICAqL1xuICBwcml2YXRlIGFjdGl2YXRlUm91dGVzKFxuICAgICAgc3RhdGU6IE9ic2VydmFibGU8ZmFsc2V8XG4gICAgICAgICAgICAgICAgICAgICAgICB7YXBwbGllZFVybDogVXJsVHJlZSwgc3RhdGU6IFJvdXRlclN0YXRlfG51bGwsIHNob3VsZEFjdGl2YXRlPzogYm9vbGVhbn0+LFxuICAgICAgc3RvcmVkU3RhdGU6IFJvdXRlclN0YXRlLCBzdG9yZWRVcmw6IFVybFRyZWUsIGlkOiBudW1iZXIsIHVybDogVXJsVHJlZSwgcmF3VXJsOiBVcmxUcmVlLFxuICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiBib29sZWFuLCByZXBsYWNlVXJsOiBib29sZWFuLCByZXNvbHZlUHJvbWlzZTogYW55LCByZWplY3RQcm9taXNlOiBhbnkpIHtcbiAgICAvLyBhcHBsaWVkIHRoZSBuZXcgcm91dGVyIHN0YXRlXG4gICAgLy8gdGhpcyBvcGVyYXRpb24gaGFzIHNpZGUgZWZmZWN0c1xuICAgIGxldCBuYXZpZ2F0aW9uSXNTdWNjZXNzZnVsOiBib29sZWFuO1xuXG4gICAgc3RhdGVcbiAgICAgICAgLmZvckVhY2goKHApID0+IHtcbiAgICAgICAgICBpZiAodHlwZW9mIHAgPT09ICdib29sZWFuJyB8fCAhcC5zaG91bGRBY3RpdmF0ZSB8fCBpZCAhPT0gdGhpcy5uYXZpZ2F0aW9uSWQgfHwgIXAuc3RhdGUpIHtcbiAgICAgICAgICAgIG5hdmlnYXRpb25Jc1N1Y2Nlc3NmdWwgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3Qge2FwcGxpZWRVcmwsIHN0YXRlfSA9IHA7XG4gICAgICAgICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IGFwcGxpZWRVcmw7XG4gICAgICAgICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHRoaXMuY3VycmVudFVybFRyZWUsIHJhd1VybCk7XG5cbiAgICAgICAgICAodGhpcyBhc3tyb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGV9KS5yb3V0ZXJTdGF0ZSA9IHN0YXRlO1xuXG4gICAgICAgICAgaWYgKHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdkZWZlcnJlZCcgJiYgIXNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHRoaXMucmF3VXJsVHJlZSwgcmVwbGFjZVVybCwgaWQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIG5ldyBBY3RpdmF0ZVJvdXRlcyhcbiAgICAgICAgICAgICAgdGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3ksIHN0YXRlLCBzdG9yZWRTdGF0ZSwgKGV2dDogRXZlbnQpID0+IHRoaXMudHJpZ2dlckV2ZW50KGV2dCkpXG4gICAgICAgICAgICAgIC5hY3RpdmF0ZSh0aGlzLnJvb3RDb250ZXh0cyk7XG5cbiAgICAgICAgICBuYXZpZ2F0aW9uSXNTdWNjZXNzZnVsID0gdHJ1ZTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChuYXZpZ2F0aW9uSXNTdWNjZXNzZnVsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5uYXZpZ2F0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCA9IGlkO1xuICAgICAgICAgICAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAgICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25FbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICBpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgdGhpcy5zZXJpYWxpemVVcmwodGhpcy5jdXJyZW50VXJsVHJlZSkpKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlUHJvbWlzZSh0cnVlKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgICAgICAgICAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAgICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25DYW5jZWwoaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksICcnKSk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZVByb21pc2UoZmFsc2UpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgKGU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICBpZiAoaXNOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoZSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5hdmlnYXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldFN0YXRlQW5kVXJsKHN0b3JlZFN0YXRlLCBzdG9yZWRVcmwsIHJhd1VybCk7XG4gICAgICAgICAgICAgICAgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KVxuICAgICAgICAgICAgICAgICAgICAubmV4dChuZXcgTmF2aWdhdGlvbkNhbmNlbChpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgZS5tZXNzYWdlKSk7XG5cbiAgICAgICAgICAgICAgICByZXNvbHZlUHJvbWlzZShmYWxzZSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldFN0YXRlQW5kVXJsKHN0b3JlZFN0YXRlLCBzdG9yZWRVcmwsIHJhd1VybCk7XG4gICAgICAgICAgICAgICAgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KVxuICAgICAgICAgICAgICAgICAgICAubmV4dChuZXcgTmF2aWdhdGlvbkVycm9yKGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCBlKSk7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIHJlc29sdmVQcm9taXNlKHRoaXMuZXJyb3JIYW5kbGVyKGUpKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlZSkge1xuICAgICAgICAgICAgICAgICAgcmVqZWN0UHJvbWlzZShlZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0QnJvd3NlclVybCh1cmw6IFVybFRyZWUsIHJlcGxhY2VVcmw6IGJvb2xlYW4sIGlkOiBudW1iZXIpIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICAgIGlmICh0aGlzLmxvY2F0aW9uLmlzQ3VycmVudFBhdGhFcXVhbFRvKHBhdGgpIHx8IHJlcGxhY2VVcmwpIHtcbiAgICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKHBhdGgsICcnLCB7bmF2aWdhdGlvbklkOiBpZH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxvY2F0aW9uLmdvKHBhdGgsICcnLCB7bmF2aWdhdGlvbklkOiBpZH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRTdGF0ZUFuZFVybChzdG9yZWRTdGF0ZTogUm91dGVyU3RhdGUsIHN0b3JlZFVybDogVXJsVHJlZSwgcmF3VXJsOiBVcmxUcmVlKTogdm9pZCB7XG4gICAgKHRoaXMgYXN7cm91dGVyU3RhdGU6IFJvdXRlclN0YXRlfSkucm91dGVyU3RhdGUgPSBzdG9yZWRTdGF0ZTtcbiAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gc3RvcmVkVXJsO1xuICAgIHRoaXMucmF3VXJsVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCByYXdVcmwpO1xuICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gIH1cblxuICBwcml2YXRlIHJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpOiB2b2lkIHtcbiAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShcbiAgICAgICAgdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh0aGlzLnJhd1VybFRyZWUpLCAnJywge25hdmlnYXRpb25JZDogdGhpcy5sYXN0U3VjY2Vzc2Z1bElkfSk7XG4gIH1cbn1cblxuY2xhc3MgQWN0aXZhdGVSb3V0ZXMge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm91dGVSZXVzZVN0cmF0ZWd5OiBSb3V0ZVJldXNlU3RyYXRlZ3ksIHByaXZhdGUgZnV0dXJlU3RhdGU6IFJvdXRlclN0YXRlLFxuICAgICAgcHJpdmF0ZSBjdXJyU3RhdGU6IFJvdXRlclN0YXRlLCBwcml2YXRlIGZvcndhcmRFdmVudDogKGV2dDogRXZlbnQpID0+IHZvaWQpIHt9XG5cbiAgYWN0aXZhdGUocGFyZW50Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICBjb25zdCBmdXR1cmVSb290ID0gdGhpcy5mdXR1cmVTdGF0ZS5fcm9vdDtcbiAgICBjb25zdCBjdXJyUm9vdCA9IHRoaXMuY3VyclN0YXRlID8gdGhpcy5jdXJyU3RhdGUuX3Jvb3QgOiBudWxsO1xuXG4gICAgdGhpcy5kZWFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlUm9vdCwgY3VyclJvb3QsIHBhcmVudENvbnRleHRzKTtcbiAgICBhZHZhbmNlQWN0aXZhdGVkUm91dGUodGhpcy5mdXR1cmVTdGF0ZS5yb290KTtcbiAgICB0aGlzLmFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlUm9vdCwgY3VyclJvb3QsIHBhcmVudENvbnRleHRzKTtcbiAgfVxuXG4gIC8vIERlLWFjdGl2YXRlIHRoZSBjaGlsZCByb3V0ZSB0aGF0IGFyZSBub3QgcmUtdXNlZCBmb3IgdGhlIGZ1dHVyZSBzdGF0ZVxuICBwcml2YXRlIGRlYWN0aXZhdGVDaGlsZFJvdXRlcyhcbiAgICAgIGZ1dHVyZU5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPiwgY3Vyck5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPnxudWxsLFxuICAgICAgY29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICBjb25zdCBjaGlsZHJlbjoge1tvdXRsZXROYW1lOiBzdHJpbmddOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT59ID0gbm9kZUNoaWxkcmVuQXNNYXAoY3Vyck5vZGUpO1xuXG4gICAgLy8gUmVjdXJzZSBvbiB0aGUgcm91dGVzIGFjdGl2ZSBpbiB0aGUgZnV0dXJlIHN0YXRlIHRvIGRlLWFjdGl2YXRlIGRlZXBlciBjaGlsZHJlblxuICAgIGZ1dHVyZU5vZGUuY2hpbGRyZW4uZm9yRWFjaChmdXR1cmVDaGlsZCA9PiB7XG4gICAgICBjb25zdCBjaGlsZE91dGxldE5hbWUgPSBmdXR1cmVDaGlsZC52YWx1ZS5vdXRsZXQ7XG4gICAgICB0aGlzLmRlYWN0aXZhdGVSb3V0ZXMoZnV0dXJlQ2hpbGQsIGNoaWxkcmVuW2NoaWxkT3V0bGV0TmFtZV0sIGNvbnRleHRzKTtcbiAgICAgIGRlbGV0ZSBjaGlsZHJlbltjaGlsZE91dGxldE5hbWVdO1xuICAgIH0pO1xuXG4gICAgLy8gRGUtYWN0aXZhdGUgdGhlIHJvdXRlcyB0aGF0IHdpbGwgbm90IGJlIHJlLXVzZWRcbiAgICBmb3JFYWNoKGNoaWxkcmVuLCAodjogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LCBjaGlsZE5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgdGhpcy5kZWFjdGl2YXRlUm91dGVBbmRJdHNDaGlsZHJlbih2LCBjb250ZXh0cyk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGRlYWN0aXZhdGVSb3V0ZXMoXG4gICAgICBmdXR1cmVOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sIGN1cnJOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sXG4gICAgICBwYXJlbnRDb250ZXh0OiBDaGlsZHJlbk91dGxldENvbnRleHRzKTogdm9pZCB7XG4gICAgY29uc3QgZnV0dXJlID0gZnV0dXJlTm9kZS52YWx1ZTtcbiAgICBjb25zdCBjdXJyID0gY3Vyck5vZGUgPyBjdXJyTm9kZS52YWx1ZSA6IG51bGw7XG5cbiAgICBpZiAoZnV0dXJlID09PSBjdXJyKSB7XG4gICAgICAvLyBSZXVzaW5nIHRoZSBub2RlLCBjaGVjayB0byBzZWUgaWYgdGhlIGNoaWxkcmVuIG5lZWQgdG8gYmUgZGUtYWN0aXZhdGVkXG4gICAgICBpZiAoZnV0dXJlLmNvbXBvbmVudCkge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbm9ybWFsIHJvdXRlLCB3ZSBuZWVkIHRvIGdvIHRocm91Z2ggYW4gb3V0bGV0LlxuICAgICAgICBjb25zdCBjb250ZXh0ID0gcGFyZW50Q29udGV4dC5nZXRDb250ZXh0KGZ1dHVyZS5vdXRsZXQpO1xuICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgIHRoaXMuZGVhY3RpdmF0ZUNoaWxkUm91dGVzKGZ1dHVyZU5vZGUsIGN1cnJOb2RlLCBjb250ZXh0LmNoaWxkcmVuKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIGNvbXBvbmVudGxlc3Mgcm91dGUsIHdlIHJlY3Vyc2UgYnV0IGtlZXAgdGhlIHNhbWUgb3V0bGV0IG1hcC5cbiAgICAgICAgdGhpcy5kZWFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlTm9kZSwgY3Vyck5vZGUsIHBhcmVudENvbnRleHQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoY3Vycikge1xuICAgICAgICAvLyBEZWFjdGl2YXRlIHRoZSBjdXJyZW50IHJvdXRlIHdoaWNoIHdpbGwgbm90IGJlIHJlLXVzZWRcbiAgICAgICAgdGhpcy5kZWFjdGl2YXRlUm91dGVBbmRJdHNDaGlsZHJlbihjdXJyTm9kZSwgcGFyZW50Q29udGV4dCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBkZWFjdGl2YXRlUm91dGVBbmRJdHNDaGlsZHJlbihcbiAgICAgIHJvdXRlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sIHBhcmVudENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LnNob3VsZERldGFjaChyb3V0ZS52YWx1ZS5zbmFwc2hvdCkpIHtcbiAgICAgIHRoaXMuZGV0YWNoQW5kU3RvcmVSb3V0ZVN1YnRyZWUocm91dGUsIHBhcmVudENvbnRleHRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kZWFjdGl2YXRlUm91dGVBbmRPdXRsZXQocm91dGUsIHBhcmVudENvbnRleHRzKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGRldGFjaEFuZFN0b3JlUm91dGVTdWJ0cmVlKFxuICAgICAgcm91dGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPiwgcGFyZW50Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICBjb25zdCBjb250ZXh0ID0gcGFyZW50Q29udGV4dHMuZ2V0Q29udGV4dChyb3V0ZS52YWx1ZS5vdXRsZXQpO1xuICAgIGlmIChjb250ZXh0ICYmIGNvbnRleHQub3V0bGV0KSB7XG4gICAgICBjb25zdCBjb21wb25lbnRSZWYgPSBjb250ZXh0Lm91dGxldC5kZXRhY2goKTtcbiAgICAgIGNvbnN0IGNvbnRleHRzID0gY29udGV4dC5jaGlsZHJlbi5vbk91dGxldERlYWN0aXZhdGVkKCk7XG4gICAgICB0aGlzLnJvdXRlUmV1c2VTdHJhdGVneS5zdG9yZShyb3V0ZS52YWx1ZS5zbmFwc2hvdCwge2NvbXBvbmVudFJlZiwgcm91dGUsIGNvbnRleHRzfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBkZWFjdGl2YXRlUm91dGVBbmRPdXRsZXQoXG4gICAgICByb3V0ZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LCBwYXJlbnRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk6IHZvaWQge1xuICAgIGNvbnN0IGNvbnRleHQgPSBwYXJlbnRDb250ZXh0cy5nZXRDb250ZXh0KHJvdXRlLnZhbHVlLm91dGxldCk7XG5cbiAgICBpZiAoY29udGV4dCkge1xuICAgICAgY29uc3QgY2hpbGRyZW46IHtbb3V0bGV0TmFtZTogc3RyaW5nXTogYW55fSA9IG5vZGVDaGlsZHJlbkFzTWFwKHJvdXRlKTtcbiAgICAgIGNvbnN0IGNvbnRleHRzID0gcm91dGUudmFsdWUuY29tcG9uZW50ID8gY29udGV4dC5jaGlsZHJlbiA6IHBhcmVudENvbnRleHRzO1xuXG4gICAgICBmb3JFYWNoKGNoaWxkcmVuLCAodjogYW55LCBrOiBzdHJpbmcpID0+IHRoaXMuZGVhY3RpdmF0ZVJvdXRlQW5kSXRzQ2hpbGRyZW4odiwgY29udGV4dHMpKTtcblxuICAgICAgaWYgKGNvbnRleHQub3V0bGV0KSB7XG4gICAgICAgIC8vIERlc3Ryb3kgdGhlIGNvbXBvbmVudFxuICAgICAgICBjb250ZXh0Lm91dGxldC5kZWFjdGl2YXRlKCk7XG4gICAgICAgIC8vIERlc3Ryb3kgdGhlIGNvbnRleHRzIGZvciBhbGwgdGhlIG91dGxldHMgdGhhdCB3ZXJlIGluIHRoZSBjb21wb25lbnRcbiAgICAgICAgY29udGV4dC5jaGlsZHJlbi5vbk91dGxldERlYWN0aXZhdGVkKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhY3RpdmF0ZUNoaWxkUm91dGVzKFxuICAgICAgZnV0dXJlTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LCBjdXJyTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+fG51bGwsXG4gICAgICBjb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk6IHZvaWQge1xuICAgIGNvbnN0IGNoaWxkcmVuOiB7W291dGxldDogc3RyaW5nXTogYW55fSA9IG5vZGVDaGlsZHJlbkFzTWFwKGN1cnJOb2RlKTtcbiAgICBmdXR1cmVOb2RlLmNoaWxkcmVuLmZvckVhY2goYyA9PiB7XG4gICAgICB0aGlzLmFjdGl2YXRlUm91dGVzKGMsIGNoaWxkcmVuW2MudmFsdWUub3V0bGV0XSwgY29udGV4dHMpO1xuICAgICAgdGhpcy5mb3J3YXJkRXZlbnQobmV3IEFjdGl2YXRpb25FbmQoYy52YWx1ZS5zbmFwc2hvdCkpO1xuICAgIH0pO1xuICAgIGlmIChmdXR1cmVOb2RlLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgdGhpcy5mb3J3YXJkRXZlbnQobmV3IENoaWxkQWN0aXZhdGlvbkVuZChmdXR1cmVOb2RlLnZhbHVlLnNuYXBzaG90KSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhY3RpdmF0ZVJvdXRlcyhcbiAgICAgIGZ1dHVyZU5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPiwgY3Vyck5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPixcbiAgICAgIHBhcmVudENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzKTogdm9pZCB7XG4gICAgY29uc3QgZnV0dXJlID0gZnV0dXJlTm9kZS52YWx1ZTtcbiAgICBjb25zdCBjdXJyID0gY3Vyck5vZGUgPyBjdXJyTm9kZS52YWx1ZSA6IG51bGw7XG5cbiAgICBhZHZhbmNlQWN0aXZhdGVkUm91dGUoZnV0dXJlKTtcblxuICAgIC8vIHJldXNpbmcgdGhlIG5vZGVcbiAgICBpZiAoZnV0dXJlID09PSBjdXJyKSB7XG4gICAgICBpZiAoZnV0dXJlLmNvbXBvbmVudCkge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbm9ybWFsIHJvdXRlLCB3ZSBuZWVkIHRvIGdvIHRocm91Z2ggYW4gb3V0bGV0LlxuICAgICAgICBjb25zdCBjb250ZXh0ID0gcGFyZW50Q29udGV4dHMuZ2V0T3JDcmVhdGVDb250ZXh0KGZ1dHVyZS5vdXRsZXQpO1xuICAgICAgICB0aGlzLmFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlTm9kZSwgY3Vyck5vZGUsIGNvbnRleHQuY2hpbGRyZW4pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIGNvbXBvbmVudGxlc3Mgcm91dGUsIHdlIHJlY3Vyc2UgYnV0IGtlZXAgdGhlIHNhbWUgb3V0bGV0IG1hcC5cbiAgICAgICAgdGhpcy5hY3RpdmF0ZUNoaWxkUm91dGVzKGZ1dHVyZU5vZGUsIGN1cnJOb2RlLCBwYXJlbnRDb250ZXh0cyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChmdXR1cmUuY29tcG9uZW50KSB7XG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSBub3JtYWwgcm91dGUsIHdlIG5lZWQgdG8gcGxhY2UgdGhlIGNvbXBvbmVudCBpbnRvIHRoZSBvdXRsZXQgYW5kIHJlY3Vyc2UuXG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBwYXJlbnRDb250ZXh0cy5nZXRPckNyZWF0ZUNvbnRleHQoZnV0dXJlLm91dGxldCk7XG5cbiAgICAgICAgaWYgKHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LnNob3VsZEF0dGFjaChmdXR1cmUuc25hcHNob3QpKSB7XG4gICAgICAgICAgY29uc3Qgc3RvcmVkID1cbiAgICAgICAgICAgICAgKDxEZXRhY2hlZFJvdXRlSGFuZGxlSW50ZXJuYWw+dGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3kucmV0cmlldmUoZnV0dXJlLnNuYXBzaG90KSk7XG4gICAgICAgICAgdGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3kuc3RvcmUoZnV0dXJlLnNuYXBzaG90LCBudWxsKTtcbiAgICAgICAgICBjb250ZXh0LmNoaWxkcmVuLm9uT3V0bGV0UmVBdHRhY2hlZChzdG9yZWQuY29udGV4dHMpO1xuICAgICAgICAgIGNvbnRleHQuYXR0YWNoUmVmID0gc3RvcmVkLmNvbXBvbmVudFJlZjtcbiAgICAgICAgICBjb250ZXh0LnJvdXRlID0gc3RvcmVkLnJvdXRlLnZhbHVlO1xuICAgICAgICAgIGlmIChjb250ZXh0Lm91dGxldCkge1xuICAgICAgICAgICAgLy8gQXR0YWNoIHJpZ2h0IGF3YXkgd2hlbiB0aGUgb3V0bGV0IGhhcyBhbHJlYWR5IGJlZW4gaW5zdGFudGlhdGVkXG4gICAgICAgICAgICAvLyBPdGhlcndpc2UgYXR0YWNoIGZyb20gYFJvdXRlck91dGxldC5uZ09uSW5pdGAgd2hlbiBpdCBpcyBpbnN0YW50aWF0ZWRcbiAgICAgICAgICAgIGNvbnRleHQub3V0bGV0LmF0dGFjaChzdG9yZWQuY29tcG9uZW50UmVmLCBzdG9yZWQucm91dGUudmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhZHZhbmNlQWN0aXZhdGVkUm91dGVOb2RlQW5kSXRzQ2hpbGRyZW4oc3RvcmVkLnJvdXRlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBjb25maWcgPSBwYXJlbnRMb2FkZWRDb25maWcoZnV0dXJlLnNuYXBzaG90KTtcbiAgICAgICAgICBjb25zdCBjbXBGYWN0b3J5UmVzb2x2ZXIgPSBjb25maWcgPyBjb25maWcubW9kdWxlLmNvbXBvbmVudEZhY3RvcnlSZXNvbHZlciA6IG51bGw7XG5cbiAgICAgICAgICBjb250ZXh0LnJvdXRlID0gZnV0dXJlO1xuICAgICAgICAgIGNvbnRleHQucmVzb2x2ZXIgPSBjbXBGYWN0b3J5UmVzb2x2ZXI7XG4gICAgICAgICAgaWYgKGNvbnRleHQub3V0bGV0KSB7XG4gICAgICAgICAgICAvLyBBY3RpdmF0ZSB0aGUgb3V0bGV0IHdoZW4gaXQgaGFzIGFscmVhZHkgYmVlbiBpbnN0YW50aWF0ZWRcbiAgICAgICAgICAgIC8vIE90aGVyd2lzZSBpdCB3aWxsIGdldCBhY3RpdmF0ZWQgZnJvbSBpdHMgYG5nT25Jbml0YCB3aGVuIGluc3RhbnRpYXRlZFxuICAgICAgICAgICAgY29udGV4dC5vdXRsZXQuYWN0aXZhdGVXaXRoKGZ1dHVyZSwgY21wRmFjdG9yeVJlc29sdmVyKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLmFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlTm9kZSwgbnVsbCwgY29udGV4dC5jaGlsZHJlbik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSBjb21wb25lbnRsZXNzIHJvdXRlLCB3ZSByZWN1cnNlIGJ1dCBrZWVwIHRoZSBzYW1lIG91dGxldCBtYXAuXG4gICAgICAgIHRoaXMuYWN0aXZhdGVDaGlsZFJvdXRlcyhmdXR1cmVOb2RlLCBudWxsLCBwYXJlbnRDb250ZXh0cyk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFkdmFuY2VBY3RpdmF0ZWRSb3V0ZU5vZGVBbmRJdHNDaGlsZHJlbihub2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4pOiB2b2lkIHtcbiAgYWR2YW5jZUFjdGl2YXRlZFJvdXRlKG5vZGUudmFsdWUpO1xuICBub2RlLmNoaWxkcmVuLmZvckVhY2goYWR2YW5jZUFjdGl2YXRlZFJvdXRlTm9kZUFuZEl0c0NoaWxkcmVuKTtcbn1cblxuZnVuY3Rpb24gcGFyZW50TG9hZGVkQ29uZmlnKHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogTG9hZGVkUm91dGVyQ29uZmlnfG51bGwge1xuICBmb3IgKGxldCBzID0gc25hcHNob3QucGFyZW50OyBzOyBzID0gcy5wYXJlbnQpIHtcbiAgICBjb25zdCByb3V0ZSA9IHMucm91dGVDb25maWc7XG4gICAgaWYgKHJvdXRlICYmIHJvdXRlLl9sb2FkZWRDb25maWcpIHJldHVybiByb3V0ZS5fbG9hZGVkQ29uZmlnO1xuICAgIGlmIChyb3V0ZSAmJiByb3V0ZS5jb21wb25lbnQpIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHM6IHN0cmluZ1tdKTogdm9pZCB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29tbWFuZHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjbWQgPSBjb21tYW5kc1tpXTtcbiAgICBpZiAoY21kID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIHJlcXVlc3RlZCBwYXRoIGNvbnRhaW5zICR7Y21kfSBzZWdtZW50IGF0IGluZGV4ICR7aX1gKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==