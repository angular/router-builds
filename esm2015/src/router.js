/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
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
function NavigationExtras_tsickle_Closure_declarations() {
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
}
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
/**
 * \@internal
 * @param {?} snapshot
 * @return {?}
 */
function defaultRouterHook(snapshot) {
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
        const /** @type {?} */ onLoadStart = (r) => this.triggerEvent(new RouteConfigLoadStart(r));
        const /** @type {?} */ onLoadEnd = (r) => this.triggerEvent(new RouteConfigLoadEnd(r));
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
                let /** @type {?} */ rawUrlTree = this.parseUrl(change['url']);
                const /** @type {?} */ source = change['type'] === 'popstate' ? 'popstate' : 'hashchange';
                const /** @type {?} */ state = change.state && change.state.navigationId ?
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
        const /** @type {?} */ a = relativeTo || this.routerState.root;
        const /** @type {?} */ f = preserveFragment ? this.currentUrlTree.fragment : fragment;
        let /** @type {?} */ q = null;
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
        const /** @type {?} */ urlTree = url instanceof UrlTree ? url : this.parseUrl(url);
        const /** @type {?} */ mergedTree = this.urlHandlingStrategy.merge(urlTree, this.rawUrlTree);
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
        let /** @type {?} */ urlTree;
        try {
            urlTree = this.urlSerializer.parse(url);
        }
        catch (/** @type {?} */ e) {
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
        const /** @type {?} */ urlTree = this.parseUrl(url);
        return containsTree(this.currentUrlTree, urlTree, exact);
    }
    /**
     * @param {?} params
     * @return {?}
     */
    removeEmptyProps(params) {
        return Object.keys(params).reduce((result, key) => {
            const /** @type {?} */ value = params[key];
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
        const /** @type {?} */ lastNavigation = this.navigations.value;
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
        let /** @type {?} */ resolve = null;
        let /** @type {?} */ reject = null;
        const /** @type {?} */ promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        const /** @type {?} */ id = ++this.navigationId;
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
        const /** @type {?} */ url = this.urlHandlingStrategy.extract(rawUrl);
        const /** @type {?} */ urlTransition = !this.navigated || url.toString() !== this.currentUrlTree.toString();
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
            // create an observable of the url and route state snapshot
            // this operation do not result in any side effects
            let /** @type {?} */ urlAndSnapshot$;
            if (!precreatedState) {
                const /** @type {?} */ moduleInjector = this.ngModule.injector;
                const /** @type {?} */ redirectsApplied$ = applyRedirects(moduleInjector, this.configLoader, this.urlSerializer, url, this.config);
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
            const /** @type {?} */ beforePreactivationDone$ = urlAndSnapshot$.pipe(mergeMap((p) => {
                if (typeof p === 'boolean')
                    return of(p);
                return this.hooks.beforePreactivation(p.snapshot).pipe(map(() => p));
            }));
            // run preactivation: guards and data resolvers
            let /** @type {?} */ preActivation;
            const /** @type {?} */ preactivationSetup$ = beforePreactivationDone$.pipe(map((p) => {
                if (typeof p === 'boolean')
                    return p;
                const { appliedUrl, snapshot } = p;
                const /** @type {?} */ moduleInjector = this.ngModule.injector;
                preActivation = new PreActivation(snapshot, this.routerState.snapshot, moduleInjector, (evt) => this.triggerEvent(evt));
                preActivation.initialize(this.rootContexts);
                return { appliedUrl, snapshot };
            }));
            const /** @type {?} */ preactivationCheckGuards$ = preactivationSetup$.pipe(mergeMap((p) => {
                if (typeof p === 'boolean' || this.navigationId !== id)
                    return of(false);
                const { appliedUrl, snapshot } = p;
                this.triggerEvent(new GuardsCheckStart(id, this.serializeUrl(url), this.serializeUrl(appliedUrl), snapshot));
                return preActivation.checkGuards().pipe(map((shouldActivate) => {
                    this.triggerEvent(new GuardsCheckEnd(id, this.serializeUrl(url), this.serializeUrl(appliedUrl), snapshot, shouldActivate));
                    return { appliedUrl: appliedUrl, snapshot: snapshot, shouldActivate: shouldActivate };
                }));
            }));
            const /** @type {?} */ preactivationResolveData$ = preactivationCheckGuards$.pipe(mergeMap((p) => {
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
            const /** @type {?} */ preactivationDone$ = preactivationResolveData$.pipe(mergeMap((p) => {
                if (typeof p === 'boolean' || this.navigationId !== id)
                    return of(false);
                return this.hooks.afterPreactivation(p.snapshot).pipe(map(() => p));
            }));
            // create router state
            // this operation has side effects => route state is being affected
            const /** @type {?} */ routerState$ = preactivationDone$.pipe(map((p) => {
                if (typeof p === 'boolean' || this.navigationId !== id)
                    return false;
                const { appliedUrl, snapshot, shouldActivate } = p;
                if (shouldActivate) {
                    const /** @type {?} */ state = createRouterState(this.routeReuseStrategy, snapshot, this.routerState);
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
        // applied the new router state
        // this operation has side effects
        let /** @type {?} */ navigationIsSuccessful;
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
                const /** @type {?} */ path = this.urlSerializer.serialize(this.rawUrlTree);
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
                catch (/** @type {?} */ ee) {
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
function Router_tsickle_Closure_declarations() {
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
        const /** @type {?} */ futureRoot = this.futureState._root;
        const /** @type {?} */ currRoot = this.currState ? this.currState._root : null;
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
        const /** @type {?} */ children = nodeChildrenAsMap(currNode);
        // Recurse on the routes active in the future state to de-activate deeper children
        futureNode.children.forEach(futureChild => {
            const /** @type {?} */ childOutletName = futureChild.value.outlet;
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
        const /** @type {?} */ future = futureNode.value;
        const /** @type {?} */ curr = currNode ? currNode.value : null;
        if (future === curr) {
            // Reusing the node, check to see if the children need to be de-activated
            if (future.component) {
                // If we have a normal route, we need to go through an outlet.
                const /** @type {?} */ context = parentContext.getContext(future.outlet);
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
        const /** @type {?} */ context = parentContexts.getContext(route.value.outlet);
        if (context && context.outlet) {
            const /** @type {?} */ componentRef = context.outlet.detach();
            const /** @type {?} */ contexts = context.children.onOutletDeactivated();
            this.routeReuseStrategy.store(route.value.snapshot, { componentRef, route, contexts });
        }
    }
    /**
     * @param {?} route
     * @param {?} parentContexts
     * @return {?}
     */
    deactivateRouteAndOutlet(route, parentContexts) {
        const /** @type {?} */ context = parentContexts.getContext(route.value.outlet);
        if (context) {
            const /** @type {?} */ children = nodeChildrenAsMap(route);
            const /** @type {?} */ contexts = route.value.component ? context.children : parentContexts;
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
        const /** @type {?} */ children = nodeChildrenAsMap(currNode);
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
        const /** @type {?} */ future = futureNode.value;
        const /** @type {?} */ curr = currNode ? currNode.value : null;
        advanceActivatedRoute(future);
        // reusing the node
        if (future === curr) {
            if (future.component) {
                // If we have a normal route, we need to go through an outlet.
                const /** @type {?} */ context = parentContexts.getOrCreateContext(future.outlet);
                this.activateChildRoutes(futureNode, currNode, context.children);
            }
            else {
                // if we have a componentless route, we recurse but keep the same outlet map.
                this.activateChildRoutes(futureNode, currNode, parentContexts);
            }
        }
        else {
            if (future.component) {
                // if we have a normal route, we need to place the component into the outlet and recurse.
                const /** @type {?} */ context = parentContexts.getOrCreateContext(future.outlet);
                if (this.routeReuseStrategy.shouldAttach(future.snapshot)) {
                    const /** @type {?} */ stored = (/** @type {?} */ (this.routeReuseStrategy.retrieve(future.snapshot)));
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
                    const /** @type {?} */ config = parentLoadedConfig(future.snapshot);
                    const /** @type {?} */ cmpFactoryResolver = config ? config.module.componentFactoryResolver : null;
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
function ActivateRoutes_tsickle_Closure_declarations() {
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
    for (let /** @type {?} */ s = snapshot.parent; s; s = s.parent) {
        const /** @type {?} */ route = s.routeConfig;
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
    for (let /** @type {?} */ i = 0; i < commands.length; i++) {
        const /** @type {?} */ cmd = commands[i];
        if (cmd == null) {
            throw new Error(`The requested path contains ${cmd} segment at index ${i}`);
        }
    }
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFTQSxPQUFPLEVBQTRDLFdBQVcsRUFBUSxTQUFTLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdEcsT0FBTyxFQUFDLGVBQWUsRUFBYyxPQUFPLEVBQWdCLEVBQUUsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUM3RSxPQUFPLEVBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUV4RCxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDakQsT0FBTyxFQUF5RCxpQkFBaUIsRUFBRSxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDbkgsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDeEQsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ2hELE9BQU8sRUFBQyxhQUFhLEVBQUUsa0JBQWtCLEVBQVMsY0FBYyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFxQixVQUFVLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ2hSLE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUMvQyxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ3RDLE9BQU8sRUFBQyx5QkFBeUIsRUFBa0QsTUFBTSx3QkFBd0IsQ0FBQztBQUNsSCxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUUxRCxPQUFPLEVBQTJFLHFCQUFxQixFQUFFLGdCQUFnQixFQUE2QixNQUFNLGdCQUFnQixDQUFDO0FBQzdLLE9BQU8sRUFBUywwQkFBMEIsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM1RCxPQUFPLEVBQUMsMEJBQTBCLEVBQXNCLE1BQU0seUJBQXlCLENBQUM7QUFDeEYsT0FBTyxFQUFnQixPQUFPLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ3BGLE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUMzQyxPQUFPLEVBQVcsaUJBQWlCLEVBQUMsTUFBTSxjQUFjLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrSXpELDZCQUE2QixLQUFVO0lBQ3JDLE1BQU0sS0FBSyxDQUFDO0NBQ2I7Ozs7Ozs7QUFFRCx5Q0FDSSxLQUFlLEVBQUUsYUFBNEIsRUFBRSxHQUFXO0lBQzVELE1BQU0sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0NBQ2pDOzs7Ozs7QUF3QkQsMkJBQTJCLFFBQTZCO0lBQ3RELE1BQU0sbUJBQUMsRUFBRSxDQUFFLElBQUksQ0FBUSxFQUFDO0NBQ3pCOzs7Ozs7Ozs7Ozs7QUFhRCxNQUFNOzs7Ozs7Ozs7Ozs7SUEwRUosWUFDWSxtQkFBMkMsYUFBNEIsRUFDdkUsY0FBOEMsUUFBa0IsRUFBRSxRQUFrQixFQUM1RixNQUE2QixFQUFFLFFBQWtCLEVBQVMsTUFBYztRQUZoRSxzQkFBaUIsR0FBakIsaUJBQWlCO1FBQTBCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3ZFLGlCQUFZLEdBQVosWUFBWTtRQUFrQyxhQUFRLEdBQVIsUUFBUSxDQUFVO1FBQ2QsV0FBTSxHQUFOLE1BQU0sQ0FBUTsyQkExRXRELElBQUksZUFBZSxvQkFBbUIsSUFBSSxHQUFHOzRCQUdwQyxDQUFDO3NCQUlZLElBQUksT0FBTyxFQUFTOzs7Ozs7NEJBUW5DLG1CQUFtQjs7Ozs7O3dDQVNqQiwrQkFBK0I7Ozs7eUJBS3pDLEtBQUs7Z0NBQ1MsQ0FBQyxDQUFDOzs7Ozs7cUJBT3NDO1lBQ3pFLG1CQUFtQixFQUFFLGlCQUFpQjtZQUN0QyxrQkFBa0IsRUFBRSxpQkFBaUI7U0FDdEM7Ozs7bUNBSzBDLElBQUksMEJBQTBCLEVBQUU7a0NBRWxDLElBQUkseUJBQXlCLEVBQUU7Ozs7Ozs7bUNBUS9CLFFBQVE7Ozs7Ozs7Ozt5Q0FVQyxXQUFXO1FBVTNELHVCQUFNLFdBQVcsR0FBRyxDQUFDLENBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakYsdUJBQU0sU0FBUyxHQUFHLENBQUMsQ0FBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU3RSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFMUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6QixJQUFJLENBQUMsY0FBYyxHQUFHLGtCQUFrQixFQUFFLENBQUM7UUFDM0MsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDO1FBRXRDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNyRixJQUFJLENBQUMsV0FBVyxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDakYsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7S0FDM0I7Ozs7Ozs7SUFNRCxzQkFBc0IsQ0FBQyxpQkFBNEI7UUFDakQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDOzs7UUFHM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztLQUMxRDs7Ozs7SUFLRCxpQkFBaUI7UUFDZixJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztRQUNuQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1NBQ2xFO0tBQ0Y7Ozs7O0lBS0QsMkJBQTJCOzs7O1FBSXpCLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLENBQUMsb0JBQW9CLHFCQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBVyxFQUFFLEVBQUU7Z0JBQ3ZFLHFCQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUM5Qyx1QkFBTSxNQUFNLEdBQXNCLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO2dCQUM1Rix1QkFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO29CQUNyRCxFQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBQyxDQUFDLENBQUM7b0JBQzNDLElBQUksQ0FBQztnQkFDVCxVQUFVLENBQ04sR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUMsVUFBVSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQzNGLENBQUMsQ0FBQSxDQUFDO1NBQ0o7S0FDRjs7Ozs7SUFHRCxJQUFJLEdBQUcsS0FBYSxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRTs7Ozs7O0lBR3BFLFlBQVksQ0FBQyxDQUFRLElBQVUsbUJBQUMsSUFBSSxDQUFDLE1BQXdCLEVBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFnQnpFLFdBQVcsQ0FBQyxNQUFjO1FBQ3hCLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN2QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDNUI7Ozs7O0lBR0QsV0FBVyxLQUFXLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFOzs7OztJQUd2QyxPQUFPO1FBQ0wsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztZQUM5QixJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLG9CQUFvQixzQkFBRyxJQUFJLEVBQUUsQ0FBQztTQUNwQztLQUNGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUEyQ0QsYUFBYSxDQUFDLFFBQWUsRUFBRSxtQkFBcUMsRUFBRTtRQUNwRSxNQUFNLEVBQUMsVUFBVSxFQUFXLFdBQVcsRUFBVSxRQUFRLEVBQ2xELG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLGdCQUFnQixFQUFDLEdBQUcsZ0JBQWdCLENBQUM7UUFDdEYsRUFBRSxDQUFDLENBQUMsU0FBUyxFQUFFLElBQUksbUJBQW1CLHNCQUFTLE9BQU8sQ0FBQSxzQkFBUyxPQUFPLENBQUMsSUFBSSxDQUFBLENBQUMsQ0FBQyxDQUFDO1lBQzVFLE9BQU8sQ0FBQyxJQUFJLENBQUMscUVBQXFFLENBQUMsQ0FBQztTQUNyRjtRQUNELHVCQUFNLENBQUMsR0FBRyxVQUFVLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7UUFDOUMsdUJBQU0sQ0FBQyxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1FBQ3JFLHFCQUFJLENBQUMsR0FBZ0IsSUFBSSxDQUFDO1FBQzFCLEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7Z0JBQzVCLEtBQUssT0FBTztvQkFDVixDQUFDLHFCQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxFQUFLLFdBQVcsQ0FBQyxDQUFDO29CQUN6RCxLQUFLLENBQUM7Z0JBQ1IsS0FBSyxVQUFVO29CQUNiLENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQztvQkFDcEMsS0FBSyxDQUFDO2dCQUNSO29CQUNFLENBQUMsR0FBRyxXQUFXLElBQUksSUFBSSxDQUFDO2FBQzNCO1NBQ0Y7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLENBQUMsR0FBRyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUM7U0FDakY7UUFDRCxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNmLENBQUMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDOUI7UUFDRCxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLFFBQVEscUJBQUUsQ0FBQyx1QkFBSSxDQUFDLEdBQUcsQ0FBQztLQUNsRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBc0JELGFBQWEsQ0FBQyxHQUFtQixFQUFFLFNBQTJCLEVBQUMsa0JBQWtCLEVBQUUsS0FBSyxFQUFDO1FBRXZGLHVCQUFNLE9BQU8sR0FBRyxHQUFHLFlBQVksT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbEUsdUJBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUU1RSxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0tBQ3hFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBdUJELFFBQVEsQ0FBQyxRQUFlLEVBQUUsU0FBMkIsRUFBQyxrQkFBa0IsRUFBRSxLQUFLLEVBQUM7UUFFOUUsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0IsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7S0FDekU7Ozs7OztJQUdELFlBQVksQ0FBQyxHQUFZLElBQVksTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7Ozs7OztJQUdoRixRQUFRLENBQUMsR0FBVztRQUNsQixxQkFBSSxPQUFnQixDQUFDO1FBQ3JCLElBQUksQ0FBQztZQUNILE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN6QztRQUFDLEtBQUssQ0FBQyxDQUFDLGlCQUFBLENBQUMsRUFBRSxDQUFDO1lBQ1gsT0FBTyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUNyRTtRQUNELE1BQU0sQ0FBQyxPQUFPLENBQUM7S0FDaEI7Ozs7Ozs7SUFHRCxRQUFRLENBQUMsR0FBbUIsRUFBRSxLQUFjO1FBQzFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsWUFBWSxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzNCLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDdEQ7UUFFRCx1QkFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQzFEOzs7OztJQUVPLGdCQUFnQixDQUFDLE1BQWM7UUFDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBYyxFQUFFLEdBQVcsRUFBRSxFQUFFO1lBQ2hFLHVCQUFNLEtBQUssR0FBUSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0IsRUFBRSxDQUFDLENBQUMsS0FBSyxLQUFLLElBQUksSUFBSSxLQUFLLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDMUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQzthQUNyQjtZQUNELE1BQU0sQ0FBQyxNQUFNLENBQUM7U0FDZixFQUFFLEVBQUUsQ0FBQyxDQUFDOzs7OztJQUdELGtCQUFrQjtRQUN4QixJQUFJLENBQUMsV0FBVzthQUNYLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFxQixFQUFFLEVBQUU7WUFDeEMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDUixJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLENBQUM7OztnQkFHckMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFHLENBQUMsQ0FBQzthQUNwQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNOLE1BQU0sbUJBQU0sRUFBRSxDQUFFLElBQUksQ0FBQyxFQUFDO2FBQ3ZCO1NBQ0YsQ0FBQyxDQUFDO2FBQ0YsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFHLENBQUMsQ0FBQzs7Ozs7Ozs7O0lBR25CLGtCQUFrQixDQUN0QixNQUFlLEVBQUUsTUFBeUIsRUFBRSxLQUFrQyxFQUM5RSxNQUF3QjtRQUMxQix1QkFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUM7Ozs7UUFLOUMsRUFBRSxDQUFDLENBQUMsY0FBYyxJQUFJLE1BQU0sS0FBSyxZQUFZLElBQUksY0FBYyxDQUFDLE1BQU0sS0FBSyxZQUFZO1lBQ25GLGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEtBQUssTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMzRCxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUM5Qjs7OztRQUtELEVBQUUsQ0FBQyxDQUFDLGNBQWMsSUFBSSxNQUFNLElBQUksWUFBWSxJQUFJLGNBQWMsQ0FBQyxNQUFNLEtBQUssVUFBVTtZQUNoRixjQUFjLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDM0QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDOUI7Ozs7UUFJRCxFQUFFLENBQUMsQ0FBQyxjQUFjLElBQUksTUFBTSxJQUFJLFVBQVUsSUFBSSxjQUFjLENBQUMsTUFBTSxLQUFLLFlBQVk7WUFDaEYsY0FBYyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsS0FBSyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzNELE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzlCO1FBRUQscUJBQUksT0FBTyxHQUFRLElBQUksQ0FBQztRQUN4QixxQkFBSSxNQUFNLEdBQVEsSUFBSSxDQUFDO1FBRXZCLHVCQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBVSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUNoRCxPQUFPLEdBQUcsR0FBRyxDQUFDO1lBQ2QsTUFBTSxHQUFHLEdBQUcsQ0FBQztTQUNkLENBQUMsQ0FBQztRQUVILHVCQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUM7UUFDL0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFDLENBQUMsQ0FBQzs7O1FBSXJGLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Ozs7OztJQUc5QywwQkFBMEIsQ0FBQyxFQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUMzQyxLQUFLLEVBQW1CO1FBQzFELHVCQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JELHVCQUFNLGFBQWEsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUM7UUFFM0YsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQztZQUM5RCxJQUFJLENBQUMsbUJBQW1CLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RELG1CQUFDLElBQUksQ0FBQyxNQUF3QixFQUFDO2lCQUMxQixJQUFJLENBQUMsSUFBSSxlQUFlLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDMUUsT0FBTyxDQUFDLE9BQU8sRUFBRTtpQkFDWixJQUFJLENBQ0QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQ25CLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7aUJBQ2hGLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7OztTQUk1QjtRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FDTixhQUFhLElBQUksSUFBSSxDQUFDLFVBQVU7WUFDaEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0QsbUJBQUMsSUFBSSxDQUFDLE1BQXdCLEVBQUM7aUJBQzFCLElBQUksQ0FBQyxJQUFJLGVBQWUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUMxRSxPQUFPLENBQUMsT0FBTyxFQUFFO2lCQUNaLElBQUksQ0FDRCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FDbkIsR0FBRyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFDN0IsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUMvRCxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBRTVCO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTixJQUFJLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQztZQUN6QixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDZjs7Ozs7Ozs7Ozs7SUFHSyxXQUFXLENBQ2YsR0FBWSxFQUFFLE1BQWUsRUFBRSxrQkFBMkIsRUFBRSxVQUFtQixFQUFFLEVBQVUsRUFDM0YsZUFBeUM7UUFDM0MsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1lBQzdCLG1CQUFDLElBQUksQ0FBQyxNQUF3QixFQUFDO2lCQUMxQixJQUFJLENBQUMsSUFBSSxnQkFBZ0IsQ0FDdEIsRUFBRSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQzFCLGlCQUFpQixFQUFFLDhDQUE4QyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9GLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQy9CO1FBRUQsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsY0FBYyxFQUFFLGFBQWEsRUFBRSxFQUFFOzs7WUFHbkQscUJBQUksZUFBMkMsQ0FBQztZQUNoRCxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JCLHVCQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztnQkFDOUMsdUJBQU0saUJBQWlCLEdBQ25CLGNBQWMsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBRTVGLGVBQWUsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsVUFBbUIsRUFBRSxFQUFFO29CQUN4RSxNQUFNLENBQUMsU0FBUyxDQUNMLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxFQUM5RSxJQUFJLENBQUMseUJBQXlCLENBQUM7eUJBQ3JDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFhLEVBQUUsRUFBRTt3QkFDMUIsbUJBQUMsSUFBSSxDQUFDLE1BQXdCLEVBQUM7NkJBQzFCLElBQUksQ0FBQyxJQUFJLGdCQUFnQixDQUN0QixFQUFFLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7d0JBRTlFLE1BQU0sQ0FBQyxFQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUMsQ0FBQztxQkFDL0IsQ0FBQyxDQUFDLENBQUM7aUJBQ1QsQ0FBQyxDQUFDLENBQUM7YUFDTDtZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNOLGVBQWUsR0FBRyxFQUFFLENBQUUsRUFBQyxVQUFVLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUMsQ0FBQyxDQUFDO2FBQ3JFO1lBRUQsdUJBQU0sd0JBQXdCLEdBQzFCLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUE4QixFQUFFO2dCQUM5RCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxTQUFTLENBQUM7b0JBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBRSxDQUFDLENBQUMsQ0FBQztnQkFDMUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUN0RSxDQUFDLENBQUMsQ0FBQzs7WUFHUixxQkFBSSxhQUE0QixDQUFDO1lBRWpDLHVCQUFNLG1CQUFtQixHQUFHLHdCQUF3QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQWtCLEVBQUU7Z0JBQ2xGLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLFNBQVMsQ0FBQztvQkFBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUNyQyxNQUFNLEVBQUMsVUFBVSxFQUFFLFFBQVEsRUFBQyxHQUFHLENBQUMsQ0FBQztnQkFDakMsdUJBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO2dCQUM5QyxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQzdCLFFBQVEsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxjQUFjLEVBQ25ELENBQUMsR0FBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzVDLGFBQWEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsRUFBQyxVQUFVLEVBQUUsUUFBUSxFQUFDLENBQUM7YUFDL0IsQ0FBQyxDQUFDLENBQUM7WUFFSix1QkFBTSx5QkFBeUIsR0FDM0IsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBOEIsRUFBRTtnQkFDbEUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssRUFBRSxDQUFDO29CQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQzFFLE1BQU0sRUFBQyxVQUFVLEVBQUUsUUFBUSxFQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUVqQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksZ0JBQWdCLENBQ2xDLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFFMUUsTUFBTSxDQUFDLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsY0FBdUIsRUFBRSxFQUFFO29CQUN0RSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksY0FBYyxDQUNoQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsRUFDbkUsY0FBYyxDQUFDLENBQUMsQ0FBQztvQkFDckIsTUFBTSxDQUFDLEVBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUMsQ0FBQztpQkFDckYsQ0FBQyxDQUFDLENBQUM7YUFDTCxDQUFDLENBQUMsQ0FBQztZQUVSLHVCQUFNLHlCQUF5QixHQUMzQix5QkFBeUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUE4QixFQUFFO2dCQUN4RSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxFQUFFLENBQUM7b0JBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBRSxLQUFLLENBQUMsQ0FBQztnQkFFMUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsSUFBSSxhQUFhLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNyRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksWUFBWSxDQUM5QixFQUFFLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztvQkFDOUUsTUFBTSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7d0JBQzdFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxVQUFVLENBQzVCLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO3dCQUM5RSxNQUFNLENBQUMsQ0FBQyxDQUFDO3FCQUNWLENBQUMsQ0FBQyxDQUFDO2lCQUNMO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNOLE1BQU0sQ0FBQyxFQUFFLENBQUUsQ0FBQyxDQUFDLENBQUM7aUJBQ2Y7YUFDRixDQUFDLENBQUMsQ0FBQztZQUVSLHVCQUFNLGtCQUFrQixHQUNwQix5QkFBeUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUE4QixFQUFFO2dCQUN4RSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxFQUFFLENBQUM7b0JBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBRSxLQUFLLENBQUMsQ0FBQztnQkFDMUUsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNyRSxDQUFDLENBQUMsQ0FBQzs7O1lBS1IsdUJBQU0sWUFBWSxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDckQsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssRUFBRSxDQUFDO29CQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7Z0JBQ3JFLE1BQU0sRUFBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBQyxHQUFHLENBQUMsQ0FBQztnQkFDakQsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztvQkFDbkIsdUJBQU0sS0FBSyxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUNyRixNQUFNLENBQUMsRUFBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBQyxDQUFDO2lCQUM1QztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDTixNQUFNLENBQUMsRUFBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUMsQ0FBQztpQkFDbEQ7YUFDRixDQUFDLENBQUMsQ0FBQztZQUdKLElBQUksQ0FBQyxjQUFjLENBQ2YsWUFBWSxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsRUFDeEYsVUFBVSxFQUFFLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQztTQUNoRCxDQUFDLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBT0csY0FBYyxDQUNsQixLQUMyRixFQUMzRixXQUF3QixFQUFFLFNBQWtCLEVBQUUsRUFBVSxFQUFFLEdBQVksRUFBRSxNQUFlLEVBQ3ZGLGtCQUEyQixFQUFFLFVBQW1CLEVBQUUsY0FBbUIsRUFBRSxhQUFrQjs7O1FBRzNGLHFCQUFJLHNCQUErQixDQUFDO1FBRXBDLEtBQUs7YUFDQSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNiLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLFNBQVMsSUFBSSxDQUFDLENBQUMsQ0FBQyxjQUFjLElBQUksRUFBRSxLQUFLLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDeEYsc0JBQXNCLEdBQUcsS0FBSyxDQUFDO2dCQUMvQixNQUFNLENBQUM7YUFDUjtZQUNELE1BQU0sRUFBQyxVQUFVLEVBQUUsS0FBSyxFQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzlCLElBQUksQ0FBQyxjQUFjLEdBQUcsVUFBVSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRTlFLG1CQUFDLElBQWlDLEVBQUMsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1lBRXhELEVBQUUsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO2dCQUN4Qix1QkFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUMzRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUM7b0JBQzNELElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBQyxZQUFZLEVBQUUsRUFBRSxFQUFDLENBQUMsQ0FBQztpQkFDMUQ7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ04sSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFDLFlBQVksRUFBRSxFQUFFLEVBQUMsQ0FBQyxDQUFDO2lCQUNoRDthQUNGO1lBRUQsSUFBSSxjQUFjLENBQ2QsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsQ0FBQyxHQUFVLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ25GLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFakMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDO1NBQy9CLENBQUM7YUFDRCxJQUFJLENBQ0QsR0FBRyxFQUFFO1lBQ0gsRUFBRSxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO2dCQUMzQixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztnQkFDdEIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEVBQUUsQ0FBQztnQkFDM0IsbUJBQUMsSUFBSSxDQUFDLE1BQXdCLEVBQUM7cUJBQzFCLElBQUksQ0FBQyxJQUFJLGFBQWEsQ0FDbkIsRUFBRSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM3RSxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdEI7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDTixJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztnQkFDaEMsbUJBQUMsSUFBSSxDQUFDLE1BQXdCLEVBQUM7cUJBQzFCLElBQUksQ0FBQyxJQUFJLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hFLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUN2QjtTQUNGLEVBQ0QsQ0FBQyxDQUFNLEVBQUUsRUFBRTtZQUNULEVBQUUsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7Z0JBQ3RCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN0RCxtQkFBQyxJQUFJLENBQUMsTUFBd0IsRUFBQztxQkFDMUIsSUFBSSxDQUFDLElBQUksZ0JBQWdCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBRXZFLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUN2QjtZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNOLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN0RCxtQkFBQyxJQUFJLENBQUMsTUFBd0IsRUFBQztxQkFDMUIsSUFBSSxDQUFDLElBQUksZUFBZSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlELElBQUksQ0FBQztvQkFDSCxjQUFjLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUN0QztnQkFBQyxLQUFLLENBQUMsQ0FBQyxpQkFBQSxFQUFFLEVBQUUsQ0FBQztvQkFDWixhQUFhLENBQUMsRUFBRSxDQUFDLENBQUM7aUJBQ25CO2FBQ0Y7U0FDRixDQUFDLENBQUM7Ozs7Ozs7O0lBR0wsZ0JBQWdCLENBQUMsV0FBd0IsRUFBRSxTQUFrQixFQUFFLE1BQWU7UUFDcEYsbUJBQUMsSUFBaUMsRUFBQyxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDOUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxTQUFTLENBQUM7UUFDaEMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDOUUsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7Ozs7O0lBRzFCLHdCQUF3QjtRQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FDdEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUMsQ0FBQyxDQUFDOztDQUVqRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUQ7Ozs7Ozs7SUFDRSxZQUNZLG9CQUFnRCxXQUF3QixFQUN4RSxXQUFnQyxZQUFrQztRQURsRSx1QkFBa0IsR0FBbEIsa0JBQWtCO1FBQThCLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ3hFLGNBQVMsR0FBVCxTQUFTO1FBQXVCLGlCQUFZLEdBQVosWUFBWSxDQUFzQjtLQUFJOzs7OztJQUVsRixRQUFRLENBQUMsY0FBc0M7UUFDN0MsdUJBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO1FBQzFDLHVCQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBRTlELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2pFLHFCQUFxQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUM7S0FDaEU7Ozs7Ozs7SUFHTyxxQkFBcUIsQ0FDekIsVUFBb0MsRUFBRSxRQUF1QyxFQUM3RSxRQUFnQztRQUNsQyx1QkFBTSxRQUFRLEdBQXFELGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDOztRQUcvRixVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUN4Qyx1QkFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDakQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsZUFBZSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDeEUsT0FBTyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7U0FDbEMsQ0FBQyxDQUFDOztRQUdILE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUEyQixFQUFFLFNBQWlCLEVBQUUsRUFBRTtZQUNuRSxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ2pELENBQUMsQ0FBQzs7Ozs7Ozs7SUFHRyxnQkFBZ0IsQ0FDcEIsVUFBb0MsRUFBRSxRQUFrQyxFQUN4RSxhQUFxQztRQUN2Qyx1QkFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQztRQUNoQyx1QkFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFFOUMsRUFBRSxDQUFDLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7O1lBRXBCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDOztnQkFFckIsdUJBQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN4RCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUNaLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDcEU7YUFDRjtZQUFDLElBQUksQ0FBQyxDQUFDOztnQkFFTixJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQzthQUNqRTtTQUNGO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOztnQkFFVCxJQUFJLENBQUMsNkJBQTZCLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFDO2FBQzdEO1NBQ0Y7Ozs7Ozs7SUFHSyw2QkFBNkIsQ0FDakMsS0FBK0IsRUFBRSxjQUFzQztRQUN6RSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9ELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUM7U0FDeEQ7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUM7U0FDdEQ7Ozs7Ozs7SUFHSywwQkFBMEIsQ0FDOUIsS0FBK0IsRUFBRSxjQUFzQztRQUN6RSx1QkFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlELEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUM5Qix1QkFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM3Qyx1QkFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQ3hELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBQyxZQUFZLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBQyxDQUFDLENBQUM7U0FDdEY7Ozs7Ozs7SUFHSyx3QkFBd0IsQ0FDNUIsS0FBK0IsRUFBRSxjQUFzQztRQUN6RSx1QkFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTlELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDWix1QkFBTSxRQUFRLEdBQWdDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3ZFLHVCQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDO1lBRTNFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFFMUYsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7O2dCQUVuQixPQUFPLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDOztnQkFFNUIsT0FBTyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2FBQ3hDO1NBQ0Y7Ozs7Ozs7O0lBR0ssbUJBQW1CLENBQ3ZCLFVBQW9DLEVBQUUsUUFBdUMsRUFDN0UsUUFBZ0M7UUFDbEMsdUJBQU0sUUFBUSxHQUE0QixpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RSxVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUM5QixJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUMzRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztTQUN4RCxDQUFDLENBQUM7UUFDSCxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztTQUN0RTs7Ozs7Ozs7SUFHSyxjQUFjLENBQ2xCLFVBQW9DLEVBQUUsUUFBa0MsRUFDeEUsY0FBc0M7UUFDeEMsdUJBQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUM7UUFDaEMsdUJBQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBRTlDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDOztRQUc5QixFQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNwQixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzs7Z0JBRXJCLHVCQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNqRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDbEU7WUFBQyxJQUFJLENBQUMsQ0FBQzs7Z0JBRU4sSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUM7YUFDaEU7U0FDRjtRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7O2dCQUVyQix1QkFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFFakUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUMxRCx1QkFBTSxNQUFNLEdBQ1IsbUJBQThCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFDLENBQUM7b0JBQ3JGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDckQsT0FBTyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3JELE9BQU8sQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQztvQkFDeEMsT0FBTyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztvQkFDbkMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Ozt3QkFHbkIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO3FCQUNoRTtvQkFDRCx1Q0FBdUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ3ZEO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNOLHVCQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ25ELHVCQUFNLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUVsRixPQUFPLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQztvQkFDdkIsT0FBTyxDQUFDLFFBQVEsR0FBRyxrQkFBa0IsQ0FBQztvQkFDdEMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Ozt3QkFHbkIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDLENBQUM7cUJBQ3pEO29CQUVELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDOUQ7YUFDRjtZQUFDLElBQUksQ0FBQyxDQUFDOztnQkFFTixJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQzthQUM1RDtTQUNGOztDQUVKOzs7Ozs7Ozs7Ozs7Ozs7QUFFRCxpREFBaUQsSUFBOEI7SUFDN0UscUJBQXFCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7Q0FDaEU7Ozs7O0FBRUQsNEJBQTRCLFFBQWdDO0lBQzFELEdBQUcsQ0FBQyxDQUFDLHFCQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzlDLHVCQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDO1FBQzVCLEVBQUUsQ0FBQyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDO1lBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUM7UUFDN0QsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUM7WUFBQyxNQUFNLENBQUMsSUFBSSxDQUFDO0tBQzNDO0lBRUQsTUFBTSxDQUFDLElBQUksQ0FBQztDQUNiOzs7OztBQUVELDBCQUEwQixRQUFrQjtJQUMxQyxHQUFHLENBQUMsQ0FBQyxxQkFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDekMsdUJBQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixHQUFHLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQzdFO0tBQ0Y7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7Q29tcGlsZXIsIEluamVjdG9yLCBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIE5nTW9kdWxlUmVmLCBUeXBlLCBpc0Rldk1vZGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtCZWhhdmlvclN1YmplY3QsIE9ic2VydmFibGUsIFN1YmplY3QsIFN1YnNjcmlwdGlvbiwgb2YgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y29uY2F0TWFwLCBtYXAsIG1lcmdlTWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7YXBwbHlSZWRpcmVjdHN9IGZyb20gJy4vYXBwbHlfcmVkaXJlY3RzJztcbmltcG9ydCB7TG9hZGVkUm91dGVyQ29uZmlnLCBRdWVyeVBhcmFtc0hhbmRsaW5nLCBSb3V0ZSwgUm91dGVzLCBzdGFuZGFyZGl6ZUNvbmZpZywgdmFsaWRhdGVDb25maWd9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7Y3JlYXRlUm91dGVyU3RhdGV9IGZyb20gJy4vY3JlYXRlX3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge2NyZWF0ZVVybFRyZWV9IGZyb20gJy4vY3JlYXRlX3VybF90cmVlJztcbmltcG9ydCB7QWN0aXZhdGlvbkVuZCwgQ2hpbGRBY3RpdmF0aW9uRW5kLCBFdmVudCwgR3VhcmRzQ2hlY2tFbmQsIEd1YXJkc0NoZWNrU3RhcnQsIE5hdmlnYXRpb25DYW5jZWwsIE5hdmlnYXRpb25FbmQsIE5hdmlnYXRpb25FcnJvciwgTmF2aWdhdGlvblN0YXJ0LCBOYXZpZ2F0aW9uVHJpZ2dlciwgUmVzb2x2ZUVuZCwgUmVzb2x2ZVN0YXJ0LCBSb3V0ZUNvbmZpZ0xvYWRFbmQsIFJvdXRlQ29uZmlnTG9hZFN0YXJ0LCBSb3V0ZXNSZWNvZ25pemVkfSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge1ByZUFjdGl2YXRpb259IGZyb20gJy4vcHJlX2FjdGl2YXRpb24nO1xuaW1wb3J0IHtyZWNvZ25pemV9IGZyb20gJy4vcmVjb2duaXplJztcbmltcG9ydCB7RGVmYXVsdFJvdXRlUmV1c2VTdHJhdGVneSwgRGV0YWNoZWRSb3V0ZUhhbmRsZUludGVybmFsLCBSb3V0ZVJldXNlU3RyYXRlZ3l9IGZyb20gJy4vcm91dGVfcmV1c2Vfc3RyYXRlZ3knO1xuaW1wb3J0IHtSb3V0ZXJDb25maWdMb2FkZXJ9IGZyb20gJy4vcm91dGVyX2NvbmZpZ19sb2FkZXInO1xuaW1wb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzfSBmcm9tICcuL3JvdXRlcl9vdXRsZXRfY29udGV4dCc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlLCBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBSb3V0ZXJTdGF0ZSwgUm91dGVyU3RhdGVTbmFwc2hvdCwgYWR2YW5jZUFjdGl2YXRlZFJvdXRlLCBjcmVhdGVFbXB0eVN0YXRlLCBpbmhlcml0ZWRQYXJhbXNEYXRhUmVzb2x2ZX0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQYXJhbXMsIGlzTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge0RlZmF1bHRVcmxIYW5kbGluZ1N0cmF0ZWd5LCBVcmxIYW5kbGluZ1N0cmF0ZWd5fSBmcm9tICcuL3VybF9oYW5kbGluZ19zdHJhdGVneSc7XG5pbXBvcnQge1VybFNlcmlhbGl6ZXIsIFVybFRyZWUsIGNvbnRhaW5zVHJlZSwgY3JlYXRlRW1wdHlVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcbmltcG9ydCB7Zm9yRWFjaH0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcbmltcG9ydCB7VHJlZU5vZGUsIG5vZGVDaGlsZHJlbkFzTWFwfSBmcm9tICcuL3V0aWxzL3RyZWUnO1xuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgZXh0cmEgb3B0aW9ucyB1c2VkIGR1cmluZyBuYXZpZ2F0aW9uLlxuICpcbiAqXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmF2aWdhdGlvbkV4dHJhcyB7XG4gIC8qKlxuICAgKiBFbmFibGVzIHJlbGF0aXZlIG5hdmlnYXRpb24gZnJvbSB0aGUgY3VycmVudCBBY3RpdmF0ZWRSb3V0ZS5cbiAgICpcbiAgICogQ29uZmlndXJhdGlvbjpcbiAgICpcbiAgICogYGBgXG4gICAqIFt7XG4gICogICBwYXRoOiAncGFyZW50JyxcbiAgKiAgIGNvbXBvbmVudDogUGFyZW50Q29tcG9uZW50LFxuICAqICAgY2hpbGRyZW46IFt7XG4gICogICAgIHBhdGg6ICdsaXN0JyxcbiAgKiAgICAgY29tcG9uZW50OiBMaXN0Q29tcG9uZW50XG4gICogICB9LHtcbiAgKiAgICAgcGF0aDogJ2NoaWxkJyxcbiAgKiAgICAgY29tcG9uZW50OiBDaGlsZENvbXBvbmVudFxuICAqICAgfV1cbiAgKiB9XVxuICAgKiBgYGBcbiAgICpcbiAgICogTmF2aWdhdGUgdG8gbGlzdCByb3V0ZSBmcm9tIGNoaWxkIHJvdXRlOlxuICAgKlxuICAgKiBgYGBcbiAgICogIEBDb21wb25lbnQoey4uLn0pXG4gICAqICBjbGFzcyBDaGlsZENvbXBvbmVudCB7XG4gICogICAgY29uc3RydWN0b3IocHJpdmF0ZSByb3V0ZXI6IFJvdXRlciwgcHJpdmF0ZSByb3V0ZTogQWN0aXZhdGVkUm91dGUpIHt9XG4gICpcbiAgKiAgICBnbygpIHtcbiAgKiAgICAgIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnLi4vbGlzdCddLCB7IHJlbGF0aXZlVG86IHRoaXMucm91dGUgfSk7XG4gICogICAgfVxuICAqICB9XG4gICAqIGBgYFxuICAgKi9cbiAgcmVsYXRpdmVUbz86IEFjdGl2YXRlZFJvdXRlfG51bGw7XG5cbiAgLyoqXG4gICAqIFNldHMgcXVlcnkgcGFyYW1ldGVycyB0byB0aGUgVVJMLlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgdG8gL3Jlc3VsdHM/cGFnZT0xXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3Jlc3VsdHMnXSwgeyBxdWVyeVBhcmFtczogeyBwYWdlOiAxIH0gfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcXVlcnlQYXJhbXM/OiBQYXJhbXN8bnVsbDtcblxuICAvKipcbiAgICogU2V0cyB0aGUgaGFzaCBmcmFnbWVudCBmb3IgdGhlIFVSTC5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHRvIC9yZXN1bHRzI3RvcFxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy9yZXN1bHRzJ10sIHsgZnJhZ21lbnQ6ICd0b3AnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGZyYWdtZW50Pzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBQcmVzZXJ2ZXMgdGhlIHF1ZXJ5IHBhcmFtZXRlcnMgZm9yIHRoZSBuZXh0IG5hdmlnYXRpb24uXG4gICAqXG4gICAqIGRlcHJlY2F0ZWQsIHVzZSBgcXVlcnlQYXJhbXNIYW5kbGluZ2AgaW5zdGVhZFxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gUHJlc2VydmUgcXVlcnkgcGFyYW1zIGZyb20gL3Jlc3VsdHM/cGFnZT0xIHRvIC92aWV3P3BhZ2U9MVxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgcHJlc2VydmVRdWVyeVBhcmFtczogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIHNpbmNlIHY0XG4gICAqL1xuICBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogIGNvbmZpZyBzdHJhdGVneSB0byBoYW5kbGUgdGhlIHF1ZXJ5IHBhcmFtZXRlcnMgZm9yIHRoZSBuZXh0IG5hdmlnYXRpb24uXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBmcm9tIC9yZXN1bHRzP3BhZ2U9MSB0byAvdmlldz9wYWdlPTEmcGFnZT0yXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBxdWVyeVBhcmFtczogeyBwYWdlOiAyIH0sICBxdWVyeVBhcmFtc0hhbmRsaW5nOiBcIm1lcmdlXCIgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcXVlcnlQYXJhbXNIYW5kbGluZz86IFF1ZXJ5UGFyYW1zSGFuZGxpbmd8bnVsbDtcbiAgLyoqXG4gICAqIFByZXNlcnZlcyB0aGUgZnJhZ21lbnQgZm9yIHRoZSBuZXh0IG5hdmlnYXRpb25cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIFByZXNlcnZlIGZyYWdtZW50IGZyb20gL3Jlc3VsdHMjdG9wIHRvIC92aWV3I3RvcFxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgcHJlc2VydmVGcmFnbWVudDogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqL1xuICBwcmVzZXJ2ZUZyYWdtZW50PzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIE5hdmlnYXRlcyB3aXRob3V0IHB1c2hpbmcgYSBuZXcgc3RhdGUgaW50byBoaXN0b3J5LlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgc2lsZW50bHkgdG8gL3ZpZXdcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqL1xuICBza2lwTG9jYXRpb25DaGFuZ2U/OiBib29sZWFuO1xuICAvKipcbiAgICogTmF2aWdhdGVzIHdoaWxlIHJlcGxhY2luZyB0aGUgY3VycmVudCBzdGF0ZSBpbiBoaXN0b3J5LlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgdG8gL3ZpZXdcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHJlcGxhY2VVcmw6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcmVwbGFjZVVybD86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogRXJyb3IgaGFuZGxlciB0aGF0IGlzIGludm9rZWQgd2hlbiBhIG5hdmlnYXRpb24gZXJyb3JzLlxuICpcbiAqIElmIHRoZSBoYW5kbGVyIHJldHVybnMgYSB2YWx1ZSwgdGhlIG5hdmlnYXRpb24gcHJvbWlzZSB3aWxsIGJlIHJlc29sdmVkIHdpdGggdGhpcyB2YWx1ZS5cbiAqIElmIHRoZSBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb24sIHRoZSBuYXZpZ2F0aW9uIHByb21pc2Ugd2lsbCBiZSByZWplY3RlZCB3aXRoXG4gKiB0aGUgZXhjZXB0aW9uLlxuICpcbiAqXG4gKi9cbmV4cG9ydCB0eXBlIEVycm9ySGFuZGxlciA9IChlcnJvcjogYW55KSA9PiBhbnk7XG5cbmZ1bmN0aW9uIGRlZmF1bHRFcnJvckhhbmRsZXIoZXJyb3I6IGFueSk6IGFueSB7XG4gIHRocm93IGVycm9yO1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0TWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyKFxuICAgIGVycm9yOiBVUklFcnJvciwgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgdXJsOiBzdHJpbmcpOiBVcmxUcmVlIHtcbiAgcmV0dXJuIHVybFNlcmlhbGl6ZXIucGFyc2UoJy8nKTtcbn1cblxudHlwZSBOYXZTdHJlYW1WYWx1ZSA9XG4gICAgYm9vbGVhbiB8IHthcHBsaWVkVXJsOiBVcmxUcmVlLCBzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCwgc2hvdWxkQWN0aXZhdGU/OiBib29sZWFufTtcblxudHlwZSBOYXZpZ2F0aW9uUGFyYW1zID0ge1xuICBpZDogbnVtYmVyLFxuICByYXdVcmw6IFVybFRyZWUsXG4gIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyxcbiAgcmVzb2x2ZTogYW55LFxuICByZWplY3Q6IGFueSxcbiAgcHJvbWlzZTogUHJvbWlzZTxib29sZWFuPixcbiAgc291cmNlOiBOYXZpZ2F0aW9uVHJpZ2dlcixcbiAgc3RhdGU6IHtuYXZpZ2F0aW9uSWQ6IG51bWJlcn0gfCBudWxsXG59O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgdHlwZSBSb3V0ZXJIb29rID0gKHNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90KSA9PiBPYnNlcnZhYmxlPHZvaWQ+O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBkZWZhdWx0Um91dGVySG9vayhzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCk6IE9ic2VydmFibGU8dm9pZD4ge1xuICByZXR1cm4gb2YgKG51bGwpIGFzIGFueTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBQcm92aWRlcyB0aGUgbmF2aWdhdGlvbiBhbmQgdXJsIG1hbmlwdWxhdGlvbiBjYXBhYmlsaXRpZXMuXG4gKlxuICogU2VlIGBSb3V0ZXNgIGZvciBtb3JlIGRldGFpbHMgYW5kIGV4YW1wbGVzLlxuICpcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKlxuICovXG5leHBvcnQgY2xhc3MgUm91dGVyIHtcbiAgcHJpdmF0ZSBjdXJyZW50VXJsVHJlZTogVXJsVHJlZTtcbiAgcHJpdmF0ZSByYXdVcmxUcmVlOiBVcmxUcmVlO1xuICBwcml2YXRlIG5hdmlnYXRpb25zID0gbmV3IEJlaGF2aW9yU3ViamVjdDxOYXZpZ2F0aW9uUGFyYW1zPihudWxsICEpO1xuXG4gIHByaXZhdGUgbG9jYXRpb25TdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvbjtcbiAgcHJpdmF0ZSBuYXZpZ2F0aW9uSWQ6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgY29uZmlnTG9hZGVyOiBSb3V0ZXJDb25maWdMb2FkZXI7XG4gIHByaXZhdGUgbmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT47XG5cbiAgcHVibGljIHJlYWRvbmx5IGV2ZW50czogT2JzZXJ2YWJsZTxFdmVudD4gPSBuZXcgU3ViamVjdDxFdmVudD4oKTtcbiAgcHVibGljIHJlYWRvbmx5IHJvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZTtcblxuICAvKipcbiAgICogRXJyb3IgaGFuZGxlciB0aGF0IGlzIGludm9rZWQgd2hlbiBhIG5hdmlnYXRpb24gZXJyb3JzLlxuICAgKlxuICAgKiBTZWUgYEVycm9ySGFuZGxlcmAgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gICAqL1xuICBlcnJvckhhbmRsZXI6IEVycm9ySGFuZGxlciA9IGRlZmF1bHRFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIE1hbGZvcm1lZCB1cmkgZXJyb3IgaGFuZGxlciBpcyBpbnZva2VkIHdoZW4gYFJvdXRlci5wYXJzZVVybCh1cmwpYCB0aHJvd3MgYW5cbiAgICogZXJyb3IgZHVlIHRvIGNvbnRhaW5pbmcgYW4gaW52YWxpZCBjaGFyYWN0ZXIuIFRoZSBtb3N0IGNvbW1vbiBjYXNlIHdvdWxkIGJlIGEgYCVgIHNpZ25cbiAgICogdGhhdCdzIG5vdCBlbmNvZGVkIGFuZCBpcyBub3QgcGFydCBvZiBhIHBlcmNlbnQgZW5jb2RlZCBzZXF1ZW5jZS5cbiAgICovXG4gIG1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcjpcbiAgICAgIChlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgICAgdXJsOiBzdHJpbmcpID0+IFVybFRyZWUgPSBkZWZhdWx0TWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyO1xuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgaWYgYXQgbGVhc3Qgb25lIG5hdmlnYXRpb24gaGFwcGVuZWQuXG4gICAqL1xuICBuYXZpZ2F0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSBsYXN0U3VjY2Vzc2Z1bElkOiBudW1iZXIgPSAtMTtcblxuICAvKipcbiAgICogVXNlZCBieSBSb3V0ZXJNb2R1bGUuIFRoaXMgYWxsb3dzIHVzIHRvXG4gICAqIHBhdXNlIHRoZSBuYXZpZ2F0aW9uIGVpdGhlciBiZWZvcmUgcHJlYWN0aXZhdGlvbiBvciBhZnRlciBpdC5cbiAgICogQGludGVybmFsXG4gICAqL1xuICBob29rczoge2JlZm9yZVByZWFjdGl2YXRpb246IFJvdXRlckhvb2ssIGFmdGVyUHJlYWN0aXZhdGlvbjogUm91dGVySG9va30gPSB7XG4gICAgYmVmb3JlUHJlYWN0aXZhdGlvbjogZGVmYXVsdFJvdXRlckhvb2ssXG4gICAgYWZ0ZXJQcmVhY3RpdmF0aW9uOiBkZWZhdWx0Um91dGVySG9va1xuICB9O1xuXG4gIC8qKlxuICAgKiBFeHRyYWN0cyBhbmQgbWVyZ2VzIFVSTHMuIFVzZWQgZm9yIEFuZ3VsYXJKUyB0byBBbmd1bGFyIG1pZ3JhdGlvbnMuXG4gICAqL1xuICB1cmxIYW5kbGluZ1N0cmF0ZWd5OiBVcmxIYW5kbGluZ1N0cmF0ZWd5ID0gbmV3IERlZmF1bHRVcmxIYW5kbGluZ1N0cmF0ZWd5KCk7XG5cbiAgcm91dGVSZXVzZVN0cmF0ZWd5OiBSb3V0ZVJldXNlU3RyYXRlZ3kgPSBuZXcgRGVmYXVsdFJvdXRlUmV1c2VTdHJhdGVneSgpO1xuXG4gIC8qKlxuICAgKiBEZWZpbmUgd2hhdCB0aGUgcm91dGVyIHNob3VsZCBkbyBpZiBpdCByZWNlaXZlcyBhIG5hdmlnYXRpb24gcmVxdWVzdCB0byB0aGUgY3VycmVudCBVUkwuXG4gICAqIEJ5IGRlZmF1bHQsIHRoZSByb3V0ZXIgd2lsbCBpZ25vcmUgdGhpcyBuYXZpZ2F0aW9uLiBIb3dldmVyLCB0aGlzIHByZXZlbnRzIGZlYXR1cmVzIHN1Y2hcbiAgICogYXMgYSBcInJlZnJlc2hcIiBidXR0b24uIFVzZSB0aGlzIG9wdGlvbiB0byBjb25maWd1cmUgdGhlIGJlaGF2aW9yIHdoZW4gbmF2aWdhdGluZyB0byB0aGVcbiAgICogY3VycmVudCBVUkwuIERlZmF1bHQgaXMgJ2lnbm9yZScuXG4gICAqL1xuICBvblNhbWVVcmxOYXZpZ2F0aW9uOiAncmVsb2FkJ3wnaWdub3JlJyA9ICdpZ25vcmUnO1xuXG4gIC8qKlxuICAgKiBEZWZpbmVzIGhvdyB0aGUgcm91dGVyIG1lcmdlcyBwYXJhbXMsIGRhdGEgYW5kIHJlc29sdmVkIGRhdGEgZnJvbSBwYXJlbnQgdG8gY2hpbGRcbiAgICogcm91dGVzLiBBdmFpbGFibGUgb3B0aW9ucyBhcmU6XG4gICAqXG4gICAqIC0gYCdlbXB0eU9ubHknYCwgdGhlIGRlZmF1bHQsIG9ubHkgaW5oZXJpdHMgcGFyZW50IHBhcmFtcyBmb3IgcGF0aC1sZXNzIG9yIGNvbXBvbmVudC1sZXNzXG4gICAqICAgcm91dGVzLlxuICAgKiAtIGAnYWx3YXlzJ2AsIGVuYWJsZXMgdW5jb25kaXRpb25hbCBpbmhlcml0YW5jZSBvZiBwYXJlbnQgcGFyYW1zLlxuICAgKi9cbiAgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogJ2VtcHR5T25seSd8J2Fsd2F5cycgPSAnZW1wdHlPbmx5JztcblxuICAvKipcbiAgICogQ3JlYXRlcyB0aGUgcm91dGVyIHNlcnZpY2UuXG4gICAqL1xuICAvLyBUT0RPOiB2c2F2a2luIG1ha2UgaW50ZXJuYWwgYWZ0ZXIgdGhlIGZpbmFsIGlzIG91dC5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT58bnVsbCwgcHJpdmF0ZSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgICAgcHJpdmF0ZSByb290Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIHByaXZhdGUgbG9jYXRpb246IExvY2F0aW9uLCBpbmplY3RvcjogSW5qZWN0b3IsXG4gICAgICBsb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLCBwdWJsaWMgY29uZmlnOiBSb3V0ZXMpIHtcbiAgICBjb25zdCBvbkxvYWRTdGFydCA9IChyOiBSb3V0ZSkgPT4gdGhpcy50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZFN0YXJ0KHIpKTtcbiAgICBjb25zdCBvbkxvYWRFbmQgPSAocjogUm91dGUpID0+IHRoaXMudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRFbmQocikpO1xuXG4gICAgdGhpcy5uZ01vZHVsZSA9IGluamVjdG9yLmdldChOZ01vZHVsZVJlZik7XG5cbiAgICB0aGlzLnJlc2V0Q29uZmlnKGNvbmZpZyk7XG4gICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IGNyZWF0ZUVtcHR5VXJsVHJlZSgpO1xuICAgIHRoaXMucmF3VXJsVHJlZSA9IHRoaXMuY3VycmVudFVybFRyZWU7XG5cbiAgICB0aGlzLmNvbmZpZ0xvYWRlciA9IG5ldyBSb3V0ZXJDb25maWdMb2FkZXIobG9hZGVyLCBjb21waWxlciwgb25Mb2FkU3RhcnQsIG9uTG9hZEVuZCk7XG4gICAgdGhpcy5yb3V0ZXJTdGF0ZSA9IGNyZWF0ZUVtcHR5U3RhdGUodGhpcy5jdXJyZW50VXJsVHJlZSwgdGhpcy5yb290Q29tcG9uZW50VHlwZSk7XG4gICAgdGhpcy5wcm9jZXNzTmF2aWdhdGlvbnMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICogVE9ETzogdGhpcyBzaG91bGQgYmUgcmVtb3ZlZCBvbmNlIHRoZSBjb25zdHJ1Y3RvciBvZiB0aGUgcm91dGVyIG1hZGUgaW50ZXJuYWxcbiAgICovXG4gIHJlc2V0Um9vdENvbXBvbmVudFR5cGUocm9vdENvbXBvbmVudFR5cGU6IFR5cGU8YW55Pik6IHZvaWQge1xuICAgIHRoaXMucm9vdENvbXBvbmVudFR5cGUgPSByb290Q29tcG9uZW50VHlwZTtcbiAgICAvLyBUT0RPOiB2c2F2a2luIHJvdXRlciA0LjAgc2hvdWxkIG1ha2UgdGhlIHJvb3QgY29tcG9uZW50IHNldCB0byBudWxsXG4gICAgLy8gdGhpcyB3aWxsIHNpbXBsaWZ5IHRoZSBsaWZlY3ljbGUgb2YgdGhlIHJvdXRlci5cbiAgICB0aGlzLnJvdXRlclN0YXRlLnJvb3QuY29tcG9uZW50ID0gdGhpcy5yb290Q29tcG9uZW50VHlwZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHVwIHRoZSBsb2NhdGlvbiBjaGFuZ2UgbGlzdGVuZXIgYW5kIHBlcmZvcm1zIHRoZSBpbml0aWFsIG5hdmlnYXRpb24uXG4gICAqL1xuICBpbml0aWFsTmF2aWdhdGlvbigpOiB2b2lkIHtcbiAgICB0aGlzLnNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpO1xuICAgIGlmICh0aGlzLm5hdmlnYXRpb25JZCA9PT0gMCkge1xuICAgICAgdGhpcy5uYXZpZ2F0ZUJ5VXJsKHRoaXMubG9jYXRpb24ucGF0aCh0cnVlKSwge3JlcGxhY2VVcmw6IHRydWV9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyLlxuICAgKi9cbiAgc2V0VXBMb2NhdGlvbkNoYW5nZUxpc3RlbmVyKCk6IHZvaWQge1xuICAgIC8vIERvbid0IG5lZWQgdG8gdXNlIFpvbmUud3JhcCBhbnkgbW9yZSwgYmVjYXVzZSB6b25lLmpzXG4gICAgLy8gYWxyZWFkeSBwYXRjaCBvblBvcFN0YXRlLCBzbyBsb2NhdGlvbiBjaGFuZ2UgY2FsbGJhY2sgd2lsbFxuICAgIC8vIHJ1biBpbnRvIG5nWm9uZVxuICAgIGlmICghdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbiA9IDxhbnk+dGhpcy5sb2NhdGlvbi5zdWJzY3JpYmUoKGNoYW5nZTogYW55KSA9PiB7XG4gICAgICAgIGxldCByYXdVcmxUcmVlID0gdGhpcy5wYXJzZVVybChjaGFuZ2VbJ3VybCddKTtcbiAgICAgICAgY29uc3Qgc291cmNlOiBOYXZpZ2F0aW9uVHJpZ2dlciA9IGNoYW5nZVsndHlwZSddID09PSAncG9wc3RhdGUnID8gJ3BvcHN0YXRlJyA6ICdoYXNoY2hhbmdlJztcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBjaGFuZ2Uuc3RhdGUgJiYgY2hhbmdlLnN0YXRlLm5hdmlnYXRpb25JZCA/XG4gICAgICAgICAgICB7bmF2aWdhdGlvbklkOiBjaGFuZ2Uuc3RhdGUubmF2aWdhdGlvbklkfSA6XG4gICAgICAgICAgICBudWxsO1xuICAgICAgICBzZXRUaW1lb3V0KFxuICAgICAgICAgICAgKCkgPT4geyB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbihyYXdVcmxUcmVlLCBzb3VyY2UsIHN0YXRlLCB7cmVwbGFjZVVybDogdHJ1ZX0pOyB9LCAwKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBUaGUgY3VycmVudCB1cmwgKi9cbiAgZ2V0IHVybCgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5zZXJpYWxpemVVcmwodGhpcy5jdXJyZW50VXJsVHJlZSk7IH1cblxuICAvKiogQGludGVybmFsICovXG4gIHRyaWdnZXJFdmVudChlOiBFdmVudCk6IHZvaWQgeyAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pLm5leHQoZSk7IH1cblxuICAvKipcbiAgICogUmVzZXRzIHRoZSBjb25maWd1cmF0aW9uIHVzZWQgZm9yIG5hdmlnYXRpb24gYW5kIGdlbmVyYXRpbmcgbGlua3MuXG4gICAqXG4gICAqICMjIyBVc2FnZVxuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLnJlc2V0Q29uZmlnKFtcbiAgICogIHsgcGF0aDogJ3RlYW0vOmlkJywgY29tcG9uZW50OiBUZWFtQ21wLCBjaGlsZHJlbjogW1xuICAgKiAgICB7IHBhdGg6ICdzaW1wbGUnLCBjb21wb25lbnQ6IFNpbXBsZUNtcCB9LFxuICAgKiAgICB7IHBhdGg6ICd1c2VyLzpuYW1lJywgY29tcG9uZW50OiBVc2VyQ21wIH1cbiAgICogIF19XG4gICAqIF0pO1xuICAgKiBgYGBcbiAgICovXG4gIHJlc2V0Q29uZmlnKGNvbmZpZzogUm91dGVzKTogdm9pZCB7XG4gICAgdmFsaWRhdGVDb25maWcoY29uZmlnKTtcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZy5tYXAoc3RhbmRhcmRpemVDb25maWcpO1xuICAgIHRoaXMubmF2aWdhdGVkID0gZmFsc2U7XG4gICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bElkID0gLTE7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICBuZ09uRGVzdHJveSgpOiB2b2lkIHsgdGhpcy5kaXNwb3NlKCk7IH1cblxuICAvKiogRGlzcG9zZXMgb2YgdGhlIHJvdXRlciAqL1xuICBkaXNwb3NlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICB0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uID0gbnVsbCAhO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBsaWVzIGFuIGFycmF5IG9mIGNvbW1hbmRzIHRvIHRoZSBjdXJyZW50IHVybCB0cmVlIGFuZCBjcmVhdGVzIGEgbmV3IHVybCB0cmVlLlxuICAgKlxuICAgKiBXaGVuIGdpdmVuIGFuIGFjdGl2YXRlIHJvdXRlLCBhcHBsaWVzIHRoZSBnaXZlbiBjb21tYW5kcyBzdGFydGluZyBmcm9tIHRoZSByb3V0ZS5cbiAgICogV2hlbiBub3QgZ2l2ZW4gYSByb3V0ZSwgYXBwbGllcyB0aGUgZ2l2ZW4gY29tbWFuZCBzdGFydGluZyBmcm9tIHRoZSByb290LlxuICAgKlxuICAgKiAjIyMgVXNhZ2VcbiAgICpcbiAgICogYGBgXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMy91c2VyLzExXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywgJ3VzZXInLCAxMV0pO1xuICAgKlxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzM7ZXhwYW5kPXRydWUvdXNlci8xMVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtleHBhbmQ6IHRydWV9LCAndXNlcicsIDExXSk7XG4gICAqXG4gICAqIC8vIHlvdSBjYW4gY29sbGFwc2Ugc3RhdGljIHNlZ21lbnRzIGxpa2UgdGhpcyAodGhpcyB3b3JrcyBvbmx5IHdpdGggdGhlIGZpcnN0IHBhc3NlZC1pbiB2YWx1ZSk6XG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0vMzMvdXNlcicsIHVzZXJJZF0pO1xuICAgKlxuICAgKiAvLyBJZiB0aGUgZmlyc3Qgc2VnbWVudCBjYW4gY29udGFpbiBzbGFzaGVzLCBhbmQgeW91IGRvIG5vdCB3YW50IHRoZSByb3V0ZXIgdG8gc3BsaXQgaXQsIHlvdVxuICAgKiAvLyBjYW4gZG8gdGhlIGZvbGxvd2luZzpcbiAgICpcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoW3tzZWdtZW50UGF0aDogJy9vbmUvdHdvJ31dKTtcbiAgICpcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzLyh1c2VyLzExLy9yaWdodDpjaGF0KVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDogJ2NoYXQnfX1dKTtcbiAgICpcbiAgICogLy8gcmVtb3ZlIHRoZSByaWdodCBzZWNvbmRhcnkgbm9kZVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDogbnVsbH19XSk7XG4gICAqXG4gICAqIC8vIGFzc3VtaW5nIHRoZSBjdXJyZW50IHVybCBpcyBgL3RlYW0vMzMvdXNlci8xMWAgYW5kIHRoZSByb3V0ZSBwb2ludHMgdG8gYHVzZXIvMTFgXG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzMzL3VzZXIvMTEvZGV0YWlsc1xuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJ2RldGFpbHMnXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzMzL3VzZXIvMjJcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycuLi8yMiddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vNDQvdXNlci8yMlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy4uLy4uL3RlYW0vNDQvdXNlci8yMiddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICogYGBgXG4gICAqL1xuICBjcmVhdGVVcmxUcmVlKGNvbW1hbmRzOiBhbnlbXSwgbmF2aWdhdGlvbkV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHt9KTogVXJsVHJlZSB7XG4gICAgY29uc3Qge3JlbGF0aXZlVG8sICAgICAgICAgIHF1ZXJ5UGFyYW1zLCAgICAgICAgIGZyYWdtZW50LFxuICAgICAgICAgICBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zLCBxdWVyeVBhcmFtc0hhbmRsaW5nLCBwcmVzZXJ2ZUZyYWdtZW50fSA9IG5hdmlnYXRpb25FeHRyYXM7XG4gICAgaWYgKGlzRGV2TW9kZSgpICYmIHByZXNlcnZlUXVlcnlQYXJhbXMgJiYgPGFueT5jb25zb2xlICYmIDxhbnk+Y29uc29sZS53YXJuKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ3ByZXNlcnZlUXVlcnlQYXJhbXMgaXMgZGVwcmVjYXRlZCwgdXNlIHF1ZXJ5UGFyYW1zSGFuZGxpbmcgaW5zdGVhZC4nKTtcbiAgICB9XG4gICAgY29uc3QgYSA9IHJlbGF0aXZlVG8gfHwgdGhpcy5yb3V0ZXJTdGF0ZS5yb290O1xuICAgIGNvbnN0IGYgPSBwcmVzZXJ2ZUZyYWdtZW50ID8gdGhpcy5jdXJyZW50VXJsVHJlZS5mcmFnbWVudCA6IGZyYWdtZW50O1xuICAgIGxldCBxOiBQYXJhbXN8bnVsbCA9IG51bGw7XG4gICAgaWYgKHF1ZXJ5UGFyYW1zSGFuZGxpbmcpIHtcbiAgICAgIHN3aXRjaCAocXVlcnlQYXJhbXNIYW5kbGluZykge1xuICAgICAgICBjYXNlICdtZXJnZSc6XG4gICAgICAgICAgcSA9IHsuLi50aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zLCAuLi5xdWVyeVBhcmFtc307XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3ByZXNlcnZlJzpcbiAgICAgICAgICBxID0gdGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBxID0gcXVlcnlQYXJhbXMgfHwgbnVsbDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcSA9IHByZXNlcnZlUXVlcnlQYXJhbXMgPyB0aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zIDogcXVlcnlQYXJhbXMgfHwgbnVsbDtcbiAgICB9XG4gICAgaWYgKHEgIT09IG51bGwpIHtcbiAgICAgIHEgPSB0aGlzLnJlbW92ZUVtcHR5UHJvcHMocSk7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVVcmxUcmVlKGEsIHRoaXMuY3VycmVudFVybFRyZWUsIGNvbW1hbmRzLCBxICEsIGYgISk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGUgYmFzZWQgb24gdGhlIHByb3ZpZGVkIHVybC4gVGhpcyBuYXZpZ2F0aW9uIGlzIGFsd2F5cyBhYnNvbHV0ZS5cbiAgICpcbiAgICogUmV0dXJucyBhIHByb21pc2UgdGhhdDpcbiAgICogLSByZXNvbHZlcyB0byAndHJ1ZScgd2hlbiBuYXZpZ2F0aW9uIHN1Y2NlZWRzLFxuICAgKiAtIHJlc29sdmVzIHRvICdmYWxzZScgd2hlbiBuYXZpZ2F0aW9uIGZhaWxzLFxuICAgKiAtIGlzIHJlamVjdGVkIHdoZW4gYW4gZXJyb3IgaGFwcGVucy5cbiAgICpcbiAgICogIyMjIFVzYWdlXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIubmF2aWdhdGVCeVVybChcIi90ZWFtLzMzL3VzZXIvMTFcIik7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTFxuICAgKiByb3V0ZXIubmF2aWdhdGVCeVVybChcIi90ZWFtLzMzL3VzZXIvMTFcIiwgeyBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBJbiBvcHBvc2l0ZSB0byBgbmF2aWdhdGVgLCBgbmF2aWdhdGVCeVVybGAgdGFrZXMgYSB3aG9sZSBVUkxcbiAgICogYW5kIGRvZXMgbm90IGFwcGx5IGFueSBkZWx0YSB0byB0aGUgY3VycmVudCBvbmUuXG4gICAqL1xuICBuYXZpZ2F0ZUJ5VXJsKHVybDogc3RyaW5nfFVybFRyZWUsIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHtza2lwTG9jYXRpb25DaGFuZ2U6IGZhbHNlfSk6XG4gICAgICBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCB1cmxUcmVlID0gdXJsIGluc3RhbmNlb2YgVXJsVHJlZSA/IHVybCA6IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICBjb25zdCBtZXJnZWRUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHVybFRyZWUsIHRoaXMucmF3VXJsVHJlZSk7XG5cbiAgICByZXR1cm4gdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24obWVyZ2VkVHJlZSwgJ2ltcGVyYXRpdmUnLCBudWxsLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBhcnJheSBvZiBjb21tYW5kcyBhbmQgYSBzdGFydGluZyBwb2ludC5cbiAgICogSWYgbm8gc3RhcnRpbmcgcm91dGUgaXMgcHJvdmlkZWQsIHRoZSBuYXZpZ2F0aW9uIGlzIGFic29sdXRlLlxuICAgKlxuICAgKiBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0OlxuICAgKiAtIHJlc29sdmVzIHRvICd0cnVlJyB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsXG4gICAqIC0gcmVzb2x2ZXMgdG8gJ2ZhbHNlJyB3aGVuIG5hdmlnYXRpb24gZmFpbHMsXG4gICAqIC0gaXMgcmVqZWN0ZWQgd2hlbiBhbiBlcnJvciBoYXBwZW5zLlxuICAgKlxuICAgKiAjIyMgVXNhZ2VcbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZShbJ3RlYW0nLCAzMywgJ3VzZXInLCAxMV0sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBOYXZpZ2F0ZSB3aXRob3V0IHVwZGF0aW5nIHRoZSBVUkxcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlLCBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWV9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIEluIG9wcG9zaXRlIHRvIGBuYXZpZ2F0ZUJ5VXJsYCwgYG5hdmlnYXRlYCBhbHdheXMgdGFrZXMgYSBkZWx0YSB0aGF0IGlzIGFwcGxpZWQgdG8gdGhlIGN1cnJlbnRcbiAgICogVVJMLlxuICAgKi9cbiAgbmF2aWdhdGUoY29tbWFuZHM6IGFueVtdLCBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7c2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZX0pOlxuICAgICAgUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdmFsaWRhdGVDb21tYW5kcyhjb21tYW5kcyk7XG4gICAgcmV0dXJuIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmNyZWF0ZVVybFRyZWUoY29tbWFuZHMsIGV4dHJhcyksIGV4dHJhcyk7XG4gIH1cblxuICAvKiogU2VyaWFsaXplcyBhIGBVcmxUcmVlYCBpbnRvIGEgc3RyaW5nICovXG4gIHNlcmlhbGl6ZVVybCh1cmw6IFVybFRyZWUpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpOyB9XG5cbiAgLyoqIFBhcnNlcyBhIHN0cmluZyBpbnRvIGEgYFVybFRyZWVgICovXG4gIHBhcnNlVXJsKHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gICAgbGV0IHVybFRyZWU6IFVybFRyZWU7XG4gICAgdHJ5IHtcbiAgICAgIHVybFRyZWUgPSB0aGlzLnVybFNlcmlhbGl6ZXIucGFyc2UodXJsKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB1cmxUcmVlID0gdGhpcy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIoZSwgdGhpcy51cmxTZXJpYWxpemVyLCB1cmwpO1xuICAgIH1cbiAgICByZXR1cm4gdXJsVHJlZTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIHdoZXRoZXIgdGhlIHVybCBpcyBhY3RpdmF0ZWQgKi9cbiAgaXNBY3RpdmUodXJsOiBzdHJpbmd8VXJsVHJlZSwgZXhhY3Q6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBpZiAodXJsIGluc3RhbmNlb2YgVXJsVHJlZSkge1xuICAgICAgcmV0dXJuIGNvbnRhaW5zVHJlZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB1cmwsIGV4YWN0KTtcbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIHJldHVybiBjb250YWluc1RyZWUodGhpcy5jdXJyZW50VXJsVHJlZSwgdXJsVHJlZSwgZXhhY3QpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVFbXB0eVByb3BzKHBhcmFtczogUGFyYW1zKTogUGFyYW1zIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMocGFyYW1zKS5yZWR1Y2UoKHJlc3VsdDogUGFyYW1zLCBrZXk6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgdmFsdWU6IGFueSA9IHBhcmFtc1trZXldO1xuICAgICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSwge30pO1xuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzTmF2aWdhdGlvbnMoKTogdm9pZCB7XG4gICAgdGhpcy5uYXZpZ2F0aW9uc1xuICAgICAgICAucGlwZShjb25jYXRNYXAoKG5hdjogTmF2aWdhdGlvblBhcmFtcykgPT4ge1xuICAgICAgICAgIGlmIChuYXYpIHtcbiAgICAgICAgICAgIHRoaXMuZXhlY3V0ZVNjaGVkdWxlZE5hdmlnYXRpb24obmF2KTtcbiAgICAgICAgICAgIC8vIGEgZmFpbGVkIG5hdmlnYXRpb24gc2hvdWxkIG5vdCBzdG9wIHRoZSByb3V0ZXIgZnJvbSBwcm9jZXNzaW5nXG4gICAgICAgICAgICAvLyBmdXJ0aGVyIG5hdmlnYXRpb25zID0+IHRoZSBjYXRjaFxuICAgICAgICAgICAgcmV0dXJuIG5hdi5wcm9taXNlLmNhdGNoKCgpID0+IHt9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDxhbnk+b2YgKG51bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkpXG4gICAgICAgIC5zdWJzY3JpYmUoKCkgPT4ge30pO1xuICB9XG5cbiAgcHJpdmF0ZSBzY2hlZHVsZU5hdmlnYXRpb24oXG4gICAgICByYXdVcmw6IFVybFRyZWUsIHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIsIHN0YXRlOiB7bmF2aWdhdGlvbklkOiBudW1iZXJ9fG51bGwsXG4gICAgICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBsYXN0TmF2aWdhdGlvbiA9IHRoaXMubmF2aWdhdGlvbnMudmFsdWU7XG5cbiAgICAvLyBJZiB0aGUgdXNlciB0cmlnZ2VycyBhIG5hdmlnYXRpb24gaW1wZXJhdGl2ZWx5IChlLmcuLCBieSB1c2luZyBuYXZpZ2F0ZUJ5VXJsKSxcbiAgICAvLyBhbmQgdGhhdCBuYXZpZ2F0aW9uIHJlc3VsdHMgaW4gJ3JlcGxhY2VTdGF0ZScgdGhhdCBsZWFkcyB0byB0aGUgc2FtZSBVUkwsXG4gICAgLy8gd2Ugc2hvdWxkIHNraXAgdGhvc2UuXG4gICAgaWYgKGxhc3ROYXZpZ2F0aW9uICYmIHNvdXJjZSAhPT0gJ2ltcGVyYXRpdmUnICYmIGxhc3ROYXZpZ2F0aW9uLnNvdXJjZSA9PT0gJ2ltcGVyYXRpdmUnICYmXG4gICAgICAgIGxhc3ROYXZpZ2F0aW9uLnJhd1VybC50b1N0cmluZygpID09PSByYXdVcmwudG9TdHJpbmcoKSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKTsgIC8vIHJldHVybiB2YWx1ZSBpcyBub3QgdXNlZFxuICAgIH1cblxuICAgIC8vIEJlY2F1c2Ugb2YgYSBidWcgaW4gSUUgYW5kIEVkZ2UsIHRoZSBsb2NhdGlvbiBjbGFzcyBmaXJlcyB0d28gZXZlbnRzIChwb3BzdGF0ZSBhbmRcbiAgICAvLyBoYXNoY2hhbmdlKSBldmVyeSBzaW5nbGUgdGltZS4gVGhlIHNlY29uZCBvbmUgc2hvdWxkIGJlIGlnbm9yZWQuIE90aGVyd2lzZSwgdGhlIFVSTCB3aWxsXG4gICAgLy8gZmxpY2tlci4gSGFuZGxlcyB0aGUgY2FzZSB3aGVuIGEgcG9wc3RhdGUgd2FzIGVtaXR0ZWQgZmlyc3QuXG4gICAgaWYgKGxhc3ROYXZpZ2F0aW9uICYmIHNvdXJjZSA9PSAnaGFzaGNoYW5nZScgJiYgbGFzdE5hdmlnYXRpb24uc291cmNlID09PSAncG9wc3RhdGUnICYmXG4gICAgICAgIGxhc3ROYXZpZ2F0aW9uLnJhd1VybC50b1N0cmluZygpID09PSByYXdVcmwudG9TdHJpbmcoKSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKTsgIC8vIHJldHVybiB2YWx1ZSBpcyBub3QgdXNlZFxuICAgIH1cbiAgICAvLyBCZWNhdXNlIG9mIGEgYnVnIGluIElFIGFuZCBFZGdlLCB0aGUgbG9jYXRpb24gY2xhc3MgZmlyZXMgdHdvIGV2ZW50cyAocG9wc3RhdGUgYW5kXG4gICAgLy8gaGFzaGNoYW5nZSkgZXZlcnkgc2luZ2xlIHRpbWUuIFRoZSBzZWNvbmQgb25lIHNob3VsZCBiZSBpZ25vcmVkLiBPdGhlcndpc2UsIHRoZSBVUkwgd2lsbFxuICAgIC8vIGZsaWNrZXIuIEhhbmRsZXMgdGhlIGNhc2Ugd2hlbiBhIGhhc2hjaGFuZ2Ugd2FzIGVtaXR0ZWQgZmlyc3QuXG4gICAgaWYgKGxhc3ROYXZpZ2F0aW9uICYmIHNvdXJjZSA9PSAncG9wc3RhdGUnICYmIGxhc3ROYXZpZ2F0aW9uLnNvdXJjZSA9PT0gJ2hhc2hjaGFuZ2UnICYmXG4gICAgICAgIGxhc3ROYXZpZ2F0aW9uLnJhd1VybC50b1N0cmluZygpID09PSByYXdVcmwudG9TdHJpbmcoKSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKTsgIC8vIHJldHVybiB2YWx1ZSBpcyBub3QgdXNlZFxuICAgIH1cblxuICAgIGxldCByZXNvbHZlOiBhbnkgPSBudWxsO1xuICAgIGxldCByZWplY3Q6IGFueSA9IG51bGw7XG5cbiAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlcywgcmVqKSA9PiB7XG4gICAgICByZXNvbHZlID0gcmVzO1xuICAgICAgcmVqZWN0ID0gcmVqO1xuICAgIH0pO1xuXG4gICAgY29uc3QgaWQgPSArK3RoaXMubmF2aWdhdGlvbklkO1xuICAgIHRoaXMubmF2aWdhdGlvbnMubmV4dCh7aWQsIHNvdXJjZSwgc3RhdGUsIHJhd1VybCwgZXh0cmFzLCByZXNvbHZlLCByZWplY3QsIHByb21pc2V9KTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBlcnJvciBpcyBwcm9wYWdhdGVkIGV2ZW4gdGhvdWdoIGBwcm9jZXNzTmF2aWdhdGlvbnNgIGNhdGNoXG4gICAgLy8gaGFuZGxlciBkb2VzIG5vdCByZXRocm93XG4gICAgcmV0dXJuIHByb21pc2UuY2F0Y2goKGU6IGFueSkgPT4gUHJvbWlzZS5yZWplY3QoZSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBleGVjdXRlU2NoZWR1bGVkTmF2aWdhdGlvbih7aWQsIHJhd1VybCwgZXh0cmFzLCByZXNvbHZlLCByZWplY3QsIHNvdXJjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGV9OiBOYXZpZ2F0aW9uUGFyYW1zKTogdm9pZCB7XG4gICAgY29uc3QgdXJsID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QocmF3VXJsKTtcbiAgICBjb25zdCB1cmxUcmFuc2l0aW9uID0gIXRoaXMubmF2aWdhdGVkIHx8IHVybC50b1N0cmluZygpICE9PSB0aGlzLmN1cnJlbnRVcmxUcmVlLnRvU3RyaW5nKCk7XG5cbiAgICBpZiAoKHRoaXMub25TYW1lVXJsTmF2aWdhdGlvbiA9PT0gJ3JlbG9hZCcgPyB0cnVlIDogdXJsVHJhbnNpdGlvbikgJiZcbiAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LnNob3VsZFByb2Nlc3NVcmwocmF3VXJsKSkge1xuICAgICAgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KVxuICAgICAgICAgIC5uZXh0KG5ldyBOYXZpZ2F0aW9uU3RhcnQoaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksIHNvdXJjZSwgc3RhdGUpKTtcbiAgICAgIFByb21pc2UucmVzb2x2ZSgpXG4gICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgIChfKSA9PiB0aGlzLnJ1bk5hdmlnYXRlKFxuICAgICAgICAgICAgICAgICAgdXJsLCByYXdVcmwsICEhZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSwgISFleHRyYXMucmVwbGFjZVVybCwgaWQsIG51bGwpKVxuICAgICAgICAgIC50aGVuKHJlc29sdmUsIHJlamVjdCk7XG5cbiAgICAgIC8vIHdlIGNhbm5vdCBwcm9jZXNzIHRoZSBjdXJyZW50IFVSTCwgYnV0IHdlIGNvdWxkIHByb2Nlc3MgdGhlIHByZXZpb3VzIG9uZSA9PlxuICAgICAgLy8gd2UgbmVlZCB0byBkbyBzb21lIGNsZWFudXBcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICB1cmxUcmFuc2l0aW9uICYmIHRoaXMucmF3VXJsVHJlZSAmJlxuICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybCh0aGlzLnJhd1VybFRyZWUpKSB7XG4gICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25TdGFydChpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgc291cmNlLCBzdGF0ZSkpO1xuICAgICAgUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgKF8pID0+IHRoaXMucnVuTmF2aWdhdGUoXG4gICAgICAgICAgICAgICAgICB1cmwsIHJhd1VybCwgZmFsc2UsIGZhbHNlLCBpZCxcbiAgICAgICAgICAgICAgICAgIGNyZWF0ZUVtcHR5U3RhdGUodXJsLCB0aGlzLnJvb3RDb21wb25lbnRUeXBlKS5zbmFwc2hvdCkpXG4gICAgICAgICAgLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcblxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJhd1VybFRyZWUgPSByYXdVcmw7XG4gICAgICByZXNvbHZlKG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcnVuTmF2aWdhdGUoXG4gICAgICB1cmw6IFVybFRyZWUsIHJhd1VybDogVXJsVHJlZSwgc2tpcExvY2F0aW9uQ2hhbmdlOiBib29sZWFuLCByZXBsYWNlVXJsOiBib29sZWFuLCBpZDogbnVtYmVyLFxuICAgICAgcHJlY3JlYXRlZFN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90fG51bGwpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoaWQgIT09IHRoaXMubmF2aWdhdGlvbklkKSB7XG4gICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25DYW5jZWwoXG4gICAgICAgICAgICAgIGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLFxuICAgICAgICAgICAgICBgTmF2aWdhdGlvbiBJRCAke2lkfSBpcyBub3QgZXF1YWwgdG8gdGhlIGN1cnJlbnQgbmF2aWdhdGlvbiBpZCAke3RoaXMubmF2aWdhdGlvbklkfWApKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZmFsc2UpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZVByb21pc2UsIHJlamVjdFByb21pc2UpID0+IHtcbiAgICAgIC8vIGNyZWF0ZSBhbiBvYnNlcnZhYmxlIG9mIHRoZSB1cmwgYW5kIHJvdXRlIHN0YXRlIHNuYXBzaG90XG4gICAgICAvLyB0aGlzIG9wZXJhdGlvbiBkbyBub3QgcmVzdWx0IGluIGFueSBzaWRlIGVmZmVjdHNcbiAgICAgIGxldCB1cmxBbmRTbmFwc2hvdCQ6IE9ic2VydmFibGU8TmF2U3RyZWFtVmFsdWU+O1xuICAgICAgaWYgKCFwcmVjcmVhdGVkU3RhdGUpIHtcbiAgICAgICAgY29uc3QgbW9kdWxlSW5qZWN0b3IgPSB0aGlzLm5nTW9kdWxlLmluamVjdG9yO1xuICAgICAgICBjb25zdCByZWRpcmVjdHNBcHBsaWVkJCA9XG4gICAgICAgICAgICBhcHBseVJlZGlyZWN0cyhtb2R1bGVJbmplY3RvciwgdGhpcy5jb25maWdMb2FkZXIsIHRoaXMudXJsU2VyaWFsaXplciwgdXJsLCB0aGlzLmNvbmZpZyk7XG5cbiAgICAgICAgdXJsQW5kU25hcHNob3QkID0gcmVkaXJlY3RzQXBwbGllZCQucGlwZShtZXJnZU1hcCgoYXBwbGllZFVybDogVXJsVHJlZSkgPT4ge1xuICAgICAgICAgIHJldHVybiByZWNvZ25pemUoXG4gICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb3RDb21wb25lbnRUeXBlLCB0aGlzLmNvbmZpZywgYXBwbGllZFVybCwgdGhpcy5zZXJpYWxpemVVcmwoYXBwbGllZFVybCksXG4gICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kpXG4gICAgICAgICAgICAgIC5waXBlKG1hcCgoc25hcHNob3Q6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAgICAgICAgICAgLm5leHQobmV3IFJvdXRlc1JlY29nbml6ZWQoXG4gICAgICAgICAgICAgICAgICAgICAgICBpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgdGhpcy5zZXJpYWxpemVVcmwoYXBwbGllZFVybCksIHNuYXBzaG90KSk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4ge2FwcGxpZWRVcmwsIHNuYXBzaG90fTtcbiAgICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1cmxBbmRTbmFwc2hvdCQgPSBvZiAoe2FwcGxpZWRVcmw6IHVybCwgc25hcHNob3Q6IHByZWNyZWF0ZWRTdGF0ZX0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBiZWZvcmVQcmVhY3RpdmF0aW9uRG9uZSQgPVxuICAgICAgICAgIHVybEFuZFNuYXBzaG90JC5waXBlKG1lcmdlTWFwKChwKTogT2JzZXJ2YWJsZTxOYXZTdHJlYW1WYWx1ZT4gPT4ge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwID09PSAnYm9vbGVhbicpIHJldHVybiBvZiAocCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ob29rcy5iZWZvcmVQcmVhY3RpdmF0aW9uKHAuc25hcHNob3QpLnBpcGUobWFwKCgpID0+IHApKTtcbiAgICAgICAgICB9KSk7XG5cbiAgICAgIC8vIHJ1biBwcmVhY3RpdmF0aW9uOiBndWFyZHMgYW5kIGRhdGEgcmVzb2x2ZXJzXG4gICAgICBsZXQgcHJlQWN0aXZhdGlvbjogUHJlQWN0aXZhdGlvbjtcblxuICAgICAgY29uc3QgcHJlYWN0aXZhdGlvblNldHVwJCA9IGJlZm9yZVByZWFjdGl2YXRpb25Eb25lJC5waXBlKG1hcCgocCk6IE5hdlN0cmVhbVZhbHVlID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBwID09PSAnYm9vbGVhbicpIHJldHVybiBwO1xuICAgICAgICBjb25zdCB7YXBwbGllZFVybCwgc25hcHNob3R9ID0gcDtcbiAgICAgICAgY29uc3QgbW9kdWxlSW5qZWN0b3IgPSB0aGlzLm5nTW9kdWxlLmluamVjdG9yO1xuICAgICAgICBwcmVBY3RpdmF0aW9uID0gbmV3IFByZUFjdGl2YXRpb24oXG4gICAgICAgICAgICBzbmFwc2hvdCwgdGhpcy5yb3V0ZXJTdGF0ZS5zbmFwc2hvdCwgbW9kdWxlSW5qZWN0b3IsXG4gICAgICAgICAgICAoZXZ0OiBFdmVudCkgPT4gdGhpcy50cmlnZ2VyRXZlbnQoZXZ0KSk7XG4gICAgICAgIHByZUFjdGl2YXRpb24uaW5pdGlhbGl6ZSh0aGlzLnJvb3RDb250ZXh0cyk7XG4gICAgICAgIHJldHVybiB7YXBwbGllZFVybCwgc25hcHNob3R9O1xuICAgICAgfSkpO1xuXG4gICAgICBjb25zdCBwcmVhY3RpdmF0aW9uQ2hlY2tHdWFyZHMkID1cbiAgICAgICAgICBwcmVhY3RpdmF0aW9uU2V0dXAkLnBpcGUobWVyZ2VNYXAoKHApOiBPYnNlcnZhYmxlPE5hdlN0cmVhbVZhbHVlPiA9PiB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHAgPT09ICdib29sZWFuJyB8fCB0aGlzLm5hdmlnYXRpb25JZCAhPT0gaWQpIHJldHVybiBvZiAoZmFsc2UpO1xuICAgICAgICAgICAgY29uc3Qge2FwcGxpZWRVcmwsIHNuYXBzaG90fSA9IHA7XG5cbiAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KG5ldyBHdWFyZHNDaGVja1N0YXJ0KFxuICAgICAgICAgICAgICAgIGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCB0aGlzLnNlcmlhbGl6ZVVybChhcHBsaWVkVXJsKSwgc25hcHNob3QpKTtcblxuICAgICAgICAgICAgcmV0dXJuIHByZUFjdGl2YXRpb24uY2hlY2tHdWFyZHMoKS5waXBlKG1hcCgoc2hvdWxkQWN0aXZhdGU6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQobmV3IEd1YXJkc0NoZWNrRW5kKFxuICAgICAgICAgICAgICAgICAgaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksIHRoaXMuc2VyaWFsaXplVXJsKGFwcGxpZWRVcmwpLCBzbmFwc2hvdCxcbiAgICAgICAgICAgICAgICAgIHNob3VsZEFjdGl2YXRlKSk7XG4gICAgICAgICAgICAgIHJldHVybiB7YXBwbGllZFVybDogYXBwbGllZFVybCwgc25hcHNob3Q6IHNuYXBzaG90LCBzaG91bGRBY3RpdmF0ZTogc2hvdWxkQWN0aXZhdGV9O1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgIH0pKTtcblxuICAgICAgY29uc3QgcHJlYWN0aXZhdGlvblJlc29sdmVEYXRhJCA9XG4gICAgICAgICAgcHJlYWN0aXZhdGlvbkNoZWNrR3VhcmRzJC5waXBlKG1lcmdlTWFwKChwKTogT2JzZXJ2YWJsZTxOYXZTdHJlYW1WYWx1ZT4gPT4ge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwID09PSAnYm9vbGVhbicgfHwgdGhpcy5uYXZpZ2F0aW9uSWQgIT09IGlkKSByZXR1cm4gb2YgKGZhbHNlKTtcblxuICAgICAgICAgICAgaWYgKHAuc2hvdWxkQWN0aXZhdGUgJiYgcHJlQWN0aXZhdGlvbi5pc0FjdGl2YXRpbmcoKSkge1xuICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChuZXcgUmVzb2x2ZVN0YXJ0KFxuICAgICAgICAgICAgICAgICAgaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksIHRoaXMuc2VyaWFsaXplVXJsKHAuYXBwbGllZFVybCksIHAuc25hcHNob3QpKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHByZUFjdGl2YXRpb24ucmVzb2x2ZURhdGEodGhpcy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5KS5waXBlKG1hcCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQobmV3IFJlc29sdmVFbmQoXG4gICAgICAgICAgICAgICAgICAgIGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCB0aGlzLnNlcmlhbGl6ZVVybChwLmFwcGxpZWRVcmwpLCBwLnNuYXBzaG90KSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHA7XG4gICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBvZiAocCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuXG4gICAgICBjb25zdCBwcmVhY3RpdmF0aW9uRG9uZSQgPVxuICAgICAgICAgIHByZWFjdGl2YXRpb25SZXNvbHZlRGF0YSQucGlwZShtZXJnZU1hcCgocCk6IE9ic2VydmFibGU8TmF2U3RyZWFtVmFsdWU+ID0+IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcCA9PT0gJ2Jvb2xlYW4nIHx8IHRoaXMubmF2aWdhdGlvbklkICE9PSBpZCkgcmV0dXJuIG9mIChmYWxzZSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ob29rcy5hZnRlclByZWFjdGl2YXRpb24ocC5zbmFwc2hvdCkucGlwZShtYXAoKCkgPT4gcCkpO1xuICAgICAgICAgIH0pKTtcblxuXG4gICAgICAvLyBjcmVhdGUgcm91dGVyIHN0YXRlXG4gICAgICAvLyB0aGlzIG9wZXJhdGlvbiBoYXMgc2lkZSBlZmZlY3RzID0+IHJvdXRlIHN0YXRlIGlzIGJlaW5nIGFmZmVjdGVkXG4gICAgICBjb25zdCByb3V0ZXJTdGF0ZSQgPSBwcmVhY3RpdmF0aW9uRG9uZSQucGlwZShtYXAoKHApID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBwID09PSAnYm9vbGVhbicgfHwgdGhpcy5uYXZpZ2F0aW9uSWQgIT09IGlkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGNvbnN0IHthcHBsaWVkVXJsLCBzbmFwc2hvdCwgc2hvdWxkQWN0aXZhdGV9ID0gcDtcbiAgICAgICAgaWYgKHNob3VsZEFjdGl2YXRlKSB7XG4gICAgICAgICAgY29uc3Qgc3RhdGUgPSBjcmVhdGVSb3V0ZXJTdGF0ZSh0aGlzLnJvdXRlUmV1c2VTdHJhdGVneSwgc25hcHNob3QsIHRoaXMucm91dGVyU3RhdGUpO1xuICAgICAgICAgIHJldHVybiB7YXBwbGllZFVybCwgc3RhdGUsIHNob3VsZEFjdGl2YXRlfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4ge2FwcGxpZWRVcmwsIHN0YXRlOiBudWxsLCBzaG91bGRBY3RpdmF0ZX07XG4gICAgICAgIH1cbiAgICAgIH0pKTtcblxuXG4gICAgICB0aGlzLmFjdGl2YXRlUm91dGVzKFxuICAgICAgICAgIHJvdXRlclN0YXRlJCwgdGhpcy5yb3V0ZXJTdGF0ZSwgdGhpcy5jdXJyZW50VXJsVHJlZSwgaWQsIHVybCwgcmF3VXJsLCBza2lwTG9jYXRpb25DaGFuZ2UsXG4gICAgICAgICAgcmVwbGFjZVVybCwgcmVzb2x2ZVByb21pc2UsIHJlamVjdFByb21pc2UpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFBlcmZvcm1zIHRoZSBsb2dpYyBvZiBhY3RpdmF0aW5nIHJvdXRlcy4gVGhpcyBpcyBhIHN5bmNocm9ub3VzIHByb2Nlc3MgYnkgZGVmYXVsdC4gV2hpbGUgdGhpc1xuICAgKiBpcyBhIHByaXZhdGUgbWV0aG9kLCBpdCBjb3VsZCBiZSBvdmVycmlkZGVuIHRvIG1ha2UgYWN0aXZhdGlvbiBhc3luY2hyb25vdXMuXG4gICAqL1xuICBwcml2YXRlIGFjdGl2YXRlUm91dGVzKFxuICAgICAgc3RhdGU6IE9ic2VydmFibGU8ZmFsc2V8XG4gICAgICAgICAgICAgICAgICAgICAgICB7YXBwbGllZFVybDogVXJsVHJlZSwgc3RhdGU6IFJvdXRlclN0YXRlfG51bGwsIHNob3VsZEFjdGl2YXRlPzogYm9vbGVhbn0+LFxuICAgICAgc3RvcmVkU3RhdGU6IFJvdXRlclN0YXRlLCBzdG9yZWRVcmw6IFVybFRyZWUsIGlkOiBudW1iZXIsIHVybDogVXJsVHJlZSwgcmF3VXJsOiBVcmxUcmVlLFxuICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiBib29sZWFuLCByZXBsYWNlVXJsOiBib29sZWFuLCByZXNvbHZlUHJvbWlzZTogYW55LCByZWplY3RQcm9taXNlOiBhbnkpIHtcbiAgICAvLyBhcHBsaWVkIHRoZSBuZXcgcm91dGVyIHN0YXRlXG4gICAgLy8gdGhpcyBvcGVyYXRpb24gaGFzIHNpZGUgZWZmZWN0c1xuICAgIGxldCBuYXZpZ2F0aW9uSXNTdWNjZXNzZnVsOiBib29sZWFuO1xuXG4gICAgc3RhdGVcbiAgICAgICAgLmZvckVhY2goKHApID0+IHtcbiAgICAgICAgICBpZiAodHlwZW9mIHAgPT09ICdib29sZWFuJyB8fCAhcC5zaG91bGRBY3RpdmF0ZSB8fCBpZCAhPT0gdGhpcy5uYXZpZ2F0aW9uSWQgfHwgIXAuc3RhdGUpIHtcbiAgICAgICAgICAgIG5hdmlnYXRpb25Jc1N1Y2Nlc3NmdWwgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3Qge2FwcGxpZWRVcmwsIHN0YXRlfSA9IHA7XG4gICAgICAgICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IGFwcGxpZWRVcmw7XG4gICAgICAgICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHRoaXMuY3VycmVudFVybFRyZWUsIHJhd1VybCk7XG5cbiAgICAgICAgICAodGhpcyBhc3tyb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGV9KS5yb3V0ZXJTdGF0ZSA9IHN0YXRlO1xuXG4gICAgICAgICAgaWYgKCFza2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHRoaXMucmF3VXJsVHJlZSk7XG4gICAgICAgICAgICBpZiAodGhpcy5sb2NhdGlvbi5pc0N1cnJlbnRQYXRoRXF1YWxUbyhwYXRoKSB8fCByZXBsYWNlVXJsKSB7XG4gICAgICAgICAgICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKHBhdGgsICcnLCB7bmF2aWdhdGlvbklkOiBpZH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhpcy5sb2NhdGlvbi5nbyhwYXRoLCAnJywge25hdmlnYXRpb25JZDogaWR9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBuZXcgQWN0aXZhdGVSb3V0ZXMoXG4gICAgICAgICAgICAgIHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LCBzdGF0ZSwgc3RvcmVkU3RhdGUsIChldnQ6IEV2ZW50KSA9PiB0aGlzLnRyaWdnZXJFdmVudChldnQpKVxuICAgICAgICAgICAgICAuYWN0aXZhdGUodGhpcy5yb290Q29udGV4dHMpO1xuXG4gICAgICAgICAgbmF2aWdhdGlvbklzU3VjY2Vzc2Z1bCA9IHRydWU7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKFxuICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICBpZiAobmF2aWdhdGlvbklzU3VjY2Vzc2Z1bCkge1xuICAgICAgICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSBpZDtcbiAgICAgICAgICAgICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgICAgICAgICAgIC5uZXh0KG5ldyBOYXZpZ2F0aW9uRW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAgaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksIHRoaXMuc2VyaWFsaXplVXJsKHRoaXMuY3VycmVudFVybFRyZWUpKSk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZVByb21pc2UodHJ1ZSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTtcbiAgICAgICAgICAgICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgICAgICAgICAgIC5uZXh0KG5ldyBOYXZpZ2F0aW9uQ2FuY2VsKGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCAnJykpO1xuICAgICAgICAgICAgICAgIHJlc29sdmVQcm9taXNlKGZhbHNlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIChlOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgaWYgKGlzTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yKGUpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5uYXZpZ2F0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMucmVzZXRTdGF0ZUFuZFVybChzdG9yZWRTdGF0ZSwgc3RvcmVkVXJsLCByYXdVcmwpO1xuICAgICAgICAgICAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAgICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25DYW5jZWwoaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksIGUubWVzc2FnZSkpO1xuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZVByb21pc2UoZmFsc2UpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzZXRTdGF0ZUFuZFVybChzdG9yZWRTdGF0ZSwgc3RvcmVkVXJsLCByYXdVcmwpO1xuICAgICAgICAgICAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAgICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25FcnJvcihpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgZSkpO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICByZXNvbHZlUHJvbWlzZSh0aGlzLmVycm9ySGFuZGxlcihlKSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZWUpIHtcbiAgICAgICAgICAgICAgICAgIHJlamVjdFByb21pc2UoZWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlc2V0U3RhdGVBbmRVcmwoc3RvcmVkU3RhdGU6IFJvdXRlclN0YXRlLCBzdG9yZWRVcmw6IFVybFRyZWUsIHJhd1VybDogVXJsVHJlZSk6IHZvaWQge1xuICAgICh0aGlzIGFze3JvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZX0pLnJvdXRlclN0YXRlID0gc3RvcmVkU3RhdGU7XG4gICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IHN0b3JlZFVybDtcbiAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodGhpcy5jdXJyZW50VXJsVHJlZSwgcmF3VXJsKTtcbiAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTogdm9pZCB7XG4gICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUoXG4gICAgICAgIHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodGhpcy5yYXdVcmxUcmVlKSwgJycsIHtuYXZpZ2F0aW9uSWQ6IHRoaXMubGFzdFN1Y2Nlc3NmdWxJZH0pO1xuICB9XG59XG5cbmNsYXNzIEFjdGl2YXRlUm91dGVzIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlUmV1c2VTdHJhdGVneTogUm91dGVSZXVzZVN0cmF0ZWd5LCBwcml2YXRlIGZ1dHVyZVN0YXRlOiBSb3V0ZXJTdGF0ZSxcbiAgICAgIHByaXZhdGUgY3VyclN0YXRlOiBSb3V0ZXJTdGF0ZSwgcHJpdmF0ZSBmb3J3YXJkRXZlbnQ6IChldnQ6IEV2ZW50KSA9PiB2b2lkKSB7fVxuXG4gIGFjdGl2YXRlKHBhcmVudENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzKTogdm9pZCB7XG4gICAgY29uc3QgZnV0dXJlUm9vdCA9IHRoaXMuZnV0dXJlU3RhdGUuX3Jvb3Q7XG4gICAgY29uc3QgY3VyclJvb3QgPSB0aGlzLmN1cnJTdGF0ZSA/IHRoaXMuY3VyclN0YXRlLl9yb290IDogbnVsbDtcblxuICAgIHRoaXMuZGVhY3RpdmF0ZUNoaWxkUm91dGVzKGZ1dHVyZVJvb3QsIGN1cnJSb290LCBwYXJlbnRDb250ZXh0cyk7XG4gICAgYWR2YW5jZUFjdGl2YXRlZFJvdXRlKHRoaXMuZnV0dXJlU3RhdGUucm9vdCk7XG4gICAgdGhpcy5hY3RpdmF0ZUNoaWxkUm91dGVzKGZ1dHVyZVJvb3QsIGN1cnJSb290LCBwYXJlbnRDb250ZXh0cyk7XG4gIH1cblxuICAvLyBEZS1hY3RpdmF0ZSB0aGUgY2hpbGQgcm91dGUgdGhhdCBhcmUgbm90IHJlLXVzZWQgZm9yIHRoZSBmdXR1cmUgc3RhdGVcbiAgcHJpdmF0ZSBkZWFjdGl2YXRlQ2hpbGRSb3V0ZXMoXG4gICAgICBmdXR1cmVOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sIGN1cnJOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT58bnVsbCxcbiAgICAgIGNvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzKTogdm9pZCB7XG4gICAgY29uc3QgY2hpbGRyZW46IHtbb3V0bGV0TmFtZTogc3RyaW5nXTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+fSA9IG5vZGVDaGlsZHJlbkFzTWFwKGN1cnJOb2RlKTtcblxuICAgIC8vIFJlY3Vyc2Ugb24gdGhlIHJvdXRlcyBhY3RpdmUgaW4gdGhlIGZ1dHVyZSBzdGF0ZSB0byBkZS1hY3RpdmF0ZSBkZWVwZXIgY2hpbGRyZW5cbiAgICBmdXR1cmVOb2RlLmNoaWxkcmVuLmZvckVhY2goZnV0dXJlQ2hpbGQgPT4ge1xuICAgICAgY29uc3QgY2hpbGRPdXRsZXROYW1lID0gZnV0dXJlQ2hpbGQudmFsdWUub3V0bGV0O1xuICAgICAgdGhpcy5kZWFjdGl2YXRlUm91dGVzKGZ1dHVyZUNoaWxkLCBjaGlsZHJlbltjaGlsZE91dGxldE5hbWVdLCBjb250ZXh0cyk7XG4gICAgICBkZWxldGUgY2hpbGRyZW5bY2hpbGRPdXRsZXROYW1lXTtcbiAgICB9KTtcblxuICAgIC8vIERlLWFjdGl2YXRlIHRoZSByb3V0ZXMgdGhhdCB3aWxsIG5vdCBiZSByZS11c2VkXG4gICAgZm9yRWFjaChjaGlsZHJlbiwgKHY6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPiwgY2hpbGROYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgIHRoaXMuZGVhY3RpdmF0ZVJvdXRlQW5kSXRzQ2hpbGRyZW4odiwgY29udGV4dHMpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBkZWFjdGl2YXRlUm91dGVzKFxuICAgICAgZnV0dXJlTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LCBjdXJyTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LFxuICAgICAgcGFyZW50Q29udGV4dDogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk6IHZvaWQge1xuICAgIGNvbnN0IGZ1dHVyZSA9IGZ1dHVyZU5vZGUudmFsdWU7XG4gICAgY29uc3QgY3VyciA9IGN1cnJOb2RlID8gY3Vyck5vZGUudmFsdWUgOiBudWxsO1xuXG4gICAgaWYgKGZ1dHVyZSA9PT0gY3Vycikge1xuICAgICAgLy8gUmV1c2luZyB0aGUgbm9kZSwgY2hlY2sgdG8gc2VlIGlmIHRoZSBjaGlsZHJlbiBuZWVkIHRvIGJlIGRlLWFjdGl2YXRlZFxuICAgICAgaWYgKGZ1dHVyZS5jb21wb25lbnQpIHtcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIG5vcm1hbCByb3V0ZSwgd2UgbmVlZCB0byBnbyB0aHJvdWdoIGFuIG91dGxldC5cbiAgICAgICAgY29uc3QgY29udGV4dCA9IHBhcmVudENvbnRleHQuZ2V0Q29udGV4dChmdXR1cmUub3V0bGV0KTtcbiAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICB0aGlzLmRlYWN0aXZhdGVDaGlsZFJvdXRlcyhmdXR1cmVOb2RlLCBjdXJyTm9kZSwgY29udGV4dC5jaGlsZHJlbik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSBjb21wb25lbnRsZXNzIHJvdXRlLCB3ZSByZWN1cnNlIGJ1dCBrZWVwIHRoZSBzYW1lIG91dGxldCBtYXAuXG4gICAgICAgIHRoaXMuZGVhY3RpdmF0ZUNoaWxkUm91dGVzKGZ1dHVyZU5vZGUsIGN1cnJOb2RlLCBwYXJlbnRDb250ZXh0KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGN1cnIpIHtcbiAgICAgICAgLy8gRGVhY3RpdmF0ZSB0aGUgY3VycmVudCByb3V0ZSB3aGljaCB3aWxsIG5vdCBiZSByZS11c2VkXG4gICAgICAgIHRoaXMuZGVhY3RpdmF0ZVJvdXRlQW5kSXRzQ2hpbGRyZW4oY3Vyck5vZGUsIHBhcmVudENvbnRleHQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZGVhY3RpdmF0ZVJvdXRlQW5kSXRzQ2hpbGRyZW4oXG4gICAgICByb3V0ZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LCBwYXJlbnRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk6IHZvaWQge1xuICAgIGlmICh0aGlzLnJvdXRlUmV1c2VTdHJhdGVneS5zaG91bGREZXRhY2gocm91dGUudmFsdWUuc25hcHNob3QpKSB7XG4gICAgICB0aGlzLmRldGFjaEFuZFN0b3JlUm91dGVTdWJ0cmVlKHJvdXRlLCBwYXJlbnRDb250ZXh0cyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZGVhY3RpdmF0ZVJvdXRlQW5kT3V0bGV0KHJvdXRlLCBwYXJlbnRDb250ZXh0cyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBkZXRhY2hBbmRTdG9yZVJvdXRlU3VidHJlZShcbiAgICAgIHJvdXRlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sIHBhcmVudENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzKTogdm9pZCB7XG4gICAgY29uc3QgY29udGV4dCA9IHBhcmVudENvbnRleHRzLmdldENvbnRleHQocm91dGUudmFsdWUub3V0bGV0KTtcbiAgICBpZiAoY29udGV4dCAmJiBjb250ZXh0Lm91dGxldCkge1xuICAgICAgY29uc3QgY29tcG9uZW50UmVmID0gY29udGV4dC5vdXRsZXQuZGV0YWNoKCk7XG4gICAgICBjb25zdCBjb250ZXh0cyA9IGNvbnRleHQuY2hpbGRyZW4ub25PdXRsZXREZWFjdGl2YXRlZCgpO1xuICAgICAgdGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3kuc3RvcmUocm91dGUudmFsdWUuc25hcHNob3QsIHtjb21wb25lbnRSZWYsIHJvdXRlLCBjb250ZXh0c30pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZGVhY3RpdmF0ZVJvdXRlQW5kT3V0bGV0KFxuICAgICAgcm91dGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPiwgcGFyZW50Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICBjb25zdCBjb250ZXh0ID0gcGFyZW50Q29udGV4dHMuZ2V0Q29udGV4dChyb3V0ZS52YWx1ZS5vdXRsZXQpO1xuXG4gICAgaWYgKGNvbnRleHQpIHtcbiAgICAgIGNvbnN0IGNoaWxkcmVuOiB7W291dGxldE5hbWU6IHN0cmluZ106IGFueX0gPSBub2RlQ2hpbGRyZW5Bc01hcChyb3V0ZSk7XG4gICAgICBjb25zdCBjb250ZXh0cyA9IHJvdXRlLnZhbHVlLmNvbXBvbmVudCA/IGNvbnRleHQuY2hpbGRyZW4gOiBwYXJlbnRDb250ZXh0cztcblxuICAgICAgZm9yRWFjaChjaGlsZHJlbiwgKHY6IGFueSwgazogc3RyaW5nKSA9PiB0aGlzLmRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKHYsIGNvbnRleHRzKSk7XG5cbiAgICAgIGlmIChjb250ZXh0Lm91dGxldCkge1xuICAgICAgICAvLyBEZXN0cm95IHRoZSBjb21wb25lbnRcbiAgICAgICAgY29udGV4dC5vdXRsZXQuZGVhY3RpdmF0ZSgpO1xuICAgICAgICAvLyBEZXN0cm95IHRoZSBjb250ZXh0cyBmb3IgYWxsIHRoZSBvdXRsZXRzIHRoYXQgd2VyZSBpbiB0aGUgY29tcG9uZW50XG4gICAgICAgIGNvbnRleHQuY2hpbGRyZW4ub25PdXRsZXREZWFjdGl2YXRlZCgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYWN0aXZhdGVDaGlsZFJvdXRlcyhcbiAgICAgIGZ1dHVyZU5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPiwgY3Vyck5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPnxudWxsLFxuICAgICAgY29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICBjb25zdCBjaGlsZHJlbjoge1tvdXRsZXQ6IHN0cmluZ106IGFueX0gPSBub2RlQ2hpbGRyZW5Bc01hcChjdXJyTm9kZSk7XG4gICAgZnV0dXJlTm9kZS5jaGlsZHJlbi5mb3JFYWNoKGMgPT4ge1xuICAgICAgdGhpcy5hY3RpdmF0ZVJvdXRlcyhjLCBjaGlsZHJlbltjLnZhbHVlLm91dGxldF0sIGNvbnRleHRzKTtcbiAgICAgIHRoaXMuZm9yd2FyZEV2ZW50KG5ldyBBY3RpdmF0aW9uRW5kKGMudmFsdWUuc25hcHNob3QpKTtcbiAgICB9KTtcbiAgICBpZiAoZnV0dXJlTm9kZS5jaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgIHRoaXMuZm9yd2FyZEV2ZW50KG5ldyBDaGlsZEFjdGl2YXRpb25FbmQoZnV0dXJlTm9kZS52YWx1ZS5zbmFwc2hvdCkpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYWN0aXZhdGVSb3V0ZXMoXG4gICAgICBmdXR1cmVOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sIGN1cnJOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sXG4gICAgICBwYXJlbnRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk6IHZvaWQge1xuICAgIGNvbnN0IGZ1dHVyZSA9IGZ1dHVyZU5vZGUudmFsdWU7XG4gICAgY29uc3QgY3VyciA9IGN1cnJOb2RlID8gY3Vyck5vZGUudmFsdWUgOiBudWxsO1xuXG4gICAgYWR2YW5jZUFjdGl2YXRlZFJvdXRlKGZ1dHVyZSk7XG5cbiAgICAvLyByZXVzaW5nIHRoZSBub2RlXG4gICAgaWYgKGZ1dHVyZSA9PT0gY3Vycikge1xuICAgICAgaWYgKGZ1dHVyZS5jb21wb25lbnQpIHtcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIG5vcm1hbCByb3V0ZSwgd2UgbmVlZCB0byBnbyB0aHJvdWdoIGFuIG91dGxldC5cbiAgICAgICAgY29uc3QgY29udGV4dCA9IHBhcmVudENvbnRleHRzLmdldE9yQ3JlYXRlQ29udGV4dChmdXR1cmUub3V0bGV0KTtcbiAgICAgICAgdGhpcy5hY3RpdmF0ZUNoaWxkUm91dGVzKGZ1dHVyZU5vZGUsIGN1cnJOb2RlLCBjb250ZXh0LmNoaWxkcmVuKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSBjb21wb25lbnRsZXNzIHJvdXRlLCB3ZSByZWN1cnNlIGJ1dCBrZWVwIHRoZSBzYW1lIG91dGxldCBtYXAuXG4gICAgICAgIHRoaXMuYWN0aXZhdGVDaGlsZFJvdXRlcyhmdXR1cmVOb2RlLCBjdXJyTm9kZSwgcGFyZW50Q29udGV4dHMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZnV0dXJlLmNvbXBvbmVudCkge1xuICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgbm9ybWFsIHJvdXRlLCB3ZSBuZWVkIHRvIHBsYWNlIHRoZSBjb21wb25lbnQgaW50byB0aGUgb3V0bGV0IGFuZCByZWN1cnNlLlxuICAgICAgICBjb25zdCBjb250ZXh0ID0gcGFyZW50Q29udGV4dHMuZ2V0T3JDcmVhdGVDb250ZXh0KGZ1dHVyZS5vdXRsZXQpO1xuXG4gICAgICAgIGlmICh0aGlzLnJvdXRlUmV1c2VTdHJhdGVneS5zaG91bGRBdHRhY2goZnV0dXJlLnNuYXBzaG90KSkge1xuICAgICAgICAgIGNvbnN0IHN0b3JlZCA9XG4gICAgICAgICAgICAgICg8RGV0YWNoZWRSb3V0ZUhhbmRsZUludGVybmFsPnRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LnJldHJpZXZlKGZ1dHVyZS5zbmFwc2hvdCkpO1xuICAgICAgICAgIHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LnN0b3JlKGZ1dHVyZS5zbmFwc2hvdCwgbnVsbCk7XG4gICAgICAgICAgY29udGV4dC5jaGlsZHJlbi5vbk91dGxldFJlQXR0YWNoZWQoc3RvcmVkLmNvbnRleHRzKTtcbiAgICAgICAgICBjb250ZXh0LmF0dGFjaFJlZiA9IHN0b3JlZC5jb21wb25lbnRSZWY7XG4gICAgICAgICAgY29udGV4dC5yb3V0ZSA9IHN0b3JlZC5yb3V0ZS52YWx1ZTtcbiAgICAgICAgICBpZiAoY29udGV4dC5vdXRsZXQpIHtcbiAgICAgICAgICAgIC8vIEF0dGFjaCByaWdodCBhd2F5IHdoZW4gdGhlIG91dGxldCBoYXMgYWxyZWFkeSBiZWVuIGluc3RhbnRpYXRlZFxuICAgICAgICAgICAgLy8gT3RoZXJ3aXNlIGF0dGFjaCBmcm9tIGBSb3V0ZXJPdXRsZXQubmdPbkluaXRgIHdoZW4gaXQgaXMgaW5zdGFudGlhdGVkXG4gICAgICAgICAgICBjb250ZXh0Lm91dGxldC5hdHRhY2goc3RvcmVkLmNvbXBvbmVudFJlZiwgc3RvcmVkLnJvdXRlLnZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYWR2YW5jZUFjdGl2YXRlZFJvdXRlTm9kZUFuZEl0c0NoaWxkcmVuKHN0b3JlZC5yb3V0ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgY29uZmlnID0gcGFyZW50TG9hZGVkQ29uZmlnKGZ1dHVyZS5zbmFwc2hvdCk7XG4gICAgICAgICAgY29uc3QgY21wRmFjdG9yeVJlc29sdmVyID0gY29uZmlnID8gY29uZmlnLm1vZHVsZS5jb21wb25lbnRGYWN0b3J5UmVzb2x2ZXIgOiBudWxsO1xuXG4gICAgICAgICAgY29udGV4dC5yb3V0ZSA9IGZ1dHVyZTtcbiAgICAgICAgICBjb250ZXh0LnJlc29sdmVyID0gY21wRmFjdG9yeVJlc29sdmVyO1xuICAgICAgICAgIGlmIChjb250ZXh0Lm91dGxldCkge1xuICAgICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIG91dGxldCB3aGVuIGl0IGhhcyBhbHJlYWR5IGJlZW4gaW5zdGFudGlhdGVkXG4gICAgICAgICAgICAvLyBPdGhlcndpc2UgaXQgd2lsbCBnZXQgYWN0aXZhdGVkIGZyb20gaXRzIGBuZ09uSW5pdGAgd2hlbiBpbnN0YW50aWF0ZWRcbiAgICAgICAgICAgIGNvbnRleHQub3V0bGV0LmFjdGl2YXRlV2l0aChmdXR1cmUsIGNtcEZhY3RvcnlSZXNvbHZlcik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5hY3RpdmF0ZUNoaWxkUm91dGVzKGZ1dHVyZU5vZGUsIG51bGwsIGNvbnRleHQuY2hpbGRyZW4pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgY29tcG9uZW50bGVzcyByb3V0ZSwgd2UgcmVjdXJzZSBidXQga2VlcCB0aGUgc2FtZSBvdXRsZXQgbWFwLlxuICAgICAgICB0aGlzLmFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlTm9kZSwgbnVsbCwgcGFyZW50Q29udGV4dHMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhZHZhbmNlQWN0aXZhdGVkUm91dGVOb2RlQW5kSXRzQ2hpbGRyZW4obm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+KTogdm9pZCB7XG4gIGFkdmFuY2VBY3RpdmF0ZWRSb3V0ZShub2RlLnZhbHVlKTtcbiAgbm9kZS5jaGlsZHJlbi5mb3JFYWNoKGFkdmFuY2VBY3RpdmF0ZWRSb3V0ZU5vZGVBbmRJdHNDaGlsZHJlbik7XG59XG5cbmZ1bmN0aW9uIHBhcmVudExvYWRlZENvbmZpZyhzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IExvYWRlZFJvdXRlckNvbmZpZ3xudWxsIHtcbiAgZm9yIChsZXQgcyA9IHNuYXBzaG90LnBhcmVudDsgczsgcyA9IHMucGFyZW50KSB7XG4gICAgY29uc3Qgcm91dGUgPSBzLnJvdXRlQ29uZmlnO1xuICAgIGlmIChyb3V0ZSAmJiByb3V0ZS5fbG9hZGVkQ29uZmlnKSByZXR1cm4gcm91dGUuX2xvYWRlZENvbmZpZztcbiAgICBpZiAocm91dGUgJiYgcm91dGUuY29tcG9uZW50KSByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUNvbW1hbmRzKGNvbW1hbmRzOiBzdHJpbmdbXSk6IHZvaWQge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbW1hbmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY21kID0gY29tbWFuZHNbaV07XG4gICAgaWYgKGNtZCA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSByZXF1ZXN0ZWQgcGF0aCBjb250YWlucyAke2NtZH0gc2VnbWVudCBhdCBpbmRleCAke2l9YCk7XG4gICAgfVxuICB9XG59XG4iXX0=