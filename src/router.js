/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ComponentFactoryResolver, ReflectiveInjector } from '@angular/core/index';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subject } from 'rxjs/Subject';
import { from } from 'rxjs/observable/from';
import { of } from 'rxjs/observable/of';
import { concatMap } from 'rxjs/operator/concatMap';
import { every } from 'rxjs/operator/every';
import { first } from 'rxjs/operator/first';
import { map } from 'rxjs/operator/map';
import { mergeMap } from 'rxjs/operator/mergeMap';
import { reduce } from 'rxjs/operator/reduce';
import { applyRedirects } from './apply_redirects';
import { validateConfig } from './config';
import { createRouterState } from './create_router_state';
import { createUrlTree } from './create_url_tree';
import { recognize } from './recognize';
import { RouterConfigLoader } from './router_config_loader';
import { RouterOutletMap } from './router_outlet_map';
import { ActivatedRoute, advanceActivatedRoute, createEmptyState, equalParamsAndUrlSegments, inheritedParamsDataResolve } from './router_state';
import { NavigationCancelingError, PRIMARY_OUTLET } from './shared';
import { DefaultUrlHandlingStrategy } from './url_handling_strategy';
import { UrlTree, containsTree, createEmptyUrlTree } from './url_tree';
import { andObservables, forEach, merge, waitForMap, wrapIntoObservable } from './utils/collection';
/**
 * \@whatItDoes Represents an event triggered when a navigation starts.
 *
 * \@stable
 */
export class NavigationStart {
    /**
     * @param {?} id
     * @param {?} url
     */
    constructor(id, url) {
        this.id = id;
        this.url = url;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    toString() { return `NavigationStart(id: ${this.id}, url: '${this.url}')`; }
}
function NavigationStart_tsickle_Closure_declarations() {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationStart.prototype.id;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationStart.prototype.url;
}
/**
 * \@whatItDoes Represents an event triggered when a navigation ends successfully.
 *
 * \@stable
 */
export class NavigationEnd {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     */
    constructor(id, url, urlAfterRedirects) {
        this.id = id;
        this.url = url;
        this.urlAfterRedirects = urlAfterRedirects;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    toString() {
        return `NavigationEnd(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}')`;
    }
}
function NavigationEnd_tsickle_Closure_declarations() {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationEnd.prototype.id;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationEnd.prototype.url;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationEnd.prototype.urlAfterRedirects;
}
/**
 * \@whatItDoes Represents an event triggered when a navigation is canceled.
 *
 * \@stable
 */
export class NavigationCancel {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} reason
     */
    constructor(id, url, reason) {
        this.id = id;
        this.url = url;
        this.reason = reason;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    toString() { return `NavigationCancel(id: ${this.id}, url: '${this.url}')`; }
}
function NavigationCancel_tsickle_Closure_declarations() {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationCancel.prototype.id;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationCancel.prototype.url;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationCancel.prototype.reason;
}
/**
 * \@whatItDoes Represents an event triggered when a navigation fails due to an unexpected error.
 *
 * \@stable
 */
export class NavigationError {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} error
     */
    constructor(id, url, error) {
        this.id = id;
        this.url = url;
        this.error = error;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    toString() {
        return `NavigationError(id: ${this.id}, url: '${this.url}', error: ${this.error})`;
    }
}
function NavigationError_tsickle_Closure_declarations() {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationError.prototype.id;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationError.prototype.url;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationError.prototype.error;
}
/**
 * \@whatItDoes Represents an event triggered when routes are recognized.
 *
 * \@stable
 */
export class RoutesRecognized {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     * @param {?} state
     */
    constructor(id, url, urlAfterRedirects, state) {
        this.id = id;
        this.url = url;
        this.urlAfterRedirects = urlAfterRedirects;
        this.state = state;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    toString() {
        return `RoutesRecognized(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`;
    }
}
function RoutesRecognized_tsickle_Closure_declarations() {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    RoutesRecognized.prototype.id;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    RoutesRecognized.prototype.url;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    RoutesRecognized.prototype.urlAfterRedirects;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    RoutesRecognized.prototype.state;
}
/**
 * @param {?} error
 * @return {?}
 */
function defaultErrorHandler(error) {
    throw error;
}
/**
 * Does not detach any subtrees. Reuses routes as long as their route config is the same.
 */
export class DefaultRouteReuseStrategy {
    /**
     * @param {?} route
     * @return {?}
     */
    shouldDetach(route) { return false; }
    /**
     * @param {?} route
     * @param {?} detachedTree
     * @return {?}
     */
    store(route, detachedTree) { }
    /**
     * @param {?} route
     * @return {?}
     */
    shouldAttach(route) { return false; }
    /**
     * @param {?} route
     * @return {?}
     */
    retrieve(route) { return null; }
    /**
     * @param {?} future
     * @param {?} curr
     * @return {?}
     */
    shouldReuseRoute(future, curr) {
        return future.routeConfig === curr.routeConfig;
    }
}
/**
 * \@whatItDoes Provides the navigation and url manipulation capabilities.
 *
 * See {\@link Routes} for more details and examples.
 *
 * \@ngModule RouterModule
 *
 * \@stable
 */
export class Router {
    /**
     * @param {?} rootComponentType
     * @param {?} urlSerializer
     * @param {?} outletMap
     * @param {?} location
     * @param {?} injector
     * @param {?} loader
     * @param {?} compiler
     * @param {?} config
     */
    constructor(rootComponentType, urlSerializer, outletMap, location, injector, loader, compiler, config) {
        this.rootComponentType = rootComponentType;
        this.urlSerializer = urlSerializer;
        this.outletMap = outletMap;
        this.location = location;
        this.injector = injector;
        this.config = config;
        this.navigations = new BehaviorSubject(null);
        this.routerEvents = new Subject();
        this.navigationId = 0;
        /**
         * Error handler that is invoked when a navigation errors.
         *
         * See {@link ErrorHandler} for more information.
         */
        this.errorHandler = defaultErrorHandler;
        /**
         * Indicates if at least one navigation happened.
         */
        this.navigated = false;
        /**
         * Extracts and merges URLs. Used for Angular 1 to Angular 2 migrations.
         */
        this.urlHandlingStrategy = new DefaultUrlHandlingStrategy();
        this.routeReuseStrategy = new DefaultRouteReuseStrategy();
        this.resetConfig(config);
        this.currentUrlTree = createEmptyUrlTree();
        this.rawUrlTree = this.currentUrlTree;
        this.configLoader = new RouterConfigLoader(loader, compiler);
        this.currentRouterState = createEmptyState(this.currentUrlTree, this.rootComponentType);
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
        this.currentRouterState.root.component = this.rootComponentType;
    }
    /**
     * Sets up the location change listener and performs the initial navigation.
     * @return {?}
     */
    initialNavigation() {
        this.setUpLocationChangeListener();
        this.navigateByUrl(this.location.path(true), { replaceUrl: true });
    }
    /**
     * Sets up the location change listener.
     * @return {?}
     */
    setUpLocationChangeListener() {
        // Zone.current.wrap is needed because of the issue with RxJS scheduler,
        // which does not work properly with zone.js in IE and Safari
        if (!this.locationSubscription) {
            this.locationSubscription = (this.location.subscribe(Zone.current.wrap((change) => {
                const /** @type {?} */ rawUrlTree = this.urlSerializer.parse(change['url']);
                const /** @type {?} */ source = change['type'] === 'popstate' ? 'popstate' : 'hashchange';
                setTimeout(() => { this.scheduleNavigation(rawUrlTree, source, { replaceUrl: true }); }, 0);
            })));
        }
    }
    /**
     * The current route state
     * @return {?}
     */
    get routerState() { return this.currentRouterState; }
    /**
     * The current url
     * @return {?}
     */
    get url() { return this.serializeUrl(this.currentUrlTree); }
    /**
     * An observable of router events
     * @return {?}
     */
    get events() { return this.routerEvents; }
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
        this.config = config;
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
            this.locationSubscription = null;
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
     * @param {?=} __1
     * @return {?}
     */
    createUrlTree(commands, { relativeTo, queryParams, fragment, preserveQueryParams, preserveFragment } = {}) {
        const /** @type {?} */ a = relativeTo || this.routerState.root;
        const /** @type {?} */ q = preserveQueryParams ? this.currentUrlTree.queryParams : queryParams;
        const /** @type {?} */ f = preserveFragment ? this.currentUrlTree.fragment : fragment;
        return createUrlTree(a, this.currentUrlTree, commands, q, f);
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
        if (url instanceof UrlTree) {
            return this.scheduleNavigation(this.urlHandlingStrategy.merge(url, this.rawUrlTree), 'imperative', extras);
        }
        const /** @type {?} */ urlTree = this.urlSerializer.parse(url);
        return this.scheduleNavigation(this.urlHandlingStrategy.merge(urlTree, this.rawUrlTree), 'imperative', extras);
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
        if (typeof extras.queryParams === 'object' && extras.queryParams !== null) {
            extras.queryParams = this.removeEmptyProps(extras.queryParams);
        }
        return this.navigateByUrl(this.createUrlTree(commands, extras), extras);
    }
    /**
     * Serializes a {\@link UrlTree} into a string
     * @param {?} url
     * @return {?}
     */
    serializeUrl(url) { return this.urlSerializer.serialize(url); }
    /**
     * Parses a string into a {\@link UrlTree}
     * @param {?} url
     * @return {?}
     */
    parseUrl(url) { return this.urlSerializer.parse(url); }
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
        else {
            const /** @type {?} */ urlTree = this.urlSerializer.parse(url);
            return containsTree(this.currentUrlTree, urlTree, exact);
        }
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
        concatMap
            .call(this.navigations, (nav) => {
            if (nav) {
                this.executeScheduledNavigation(nav);
                // a failed navigation should not stop the router from processing
                // further navigations => the catch
                return nav.promise.catch(() => { });
            }
            else {
                return (of(null));
            }
        })
            .subscribe(() => { });
    }
    /**
     * @param {?} rawUrl
     * @param {?} source
     * @param {?} extras
     * @return {?}
     */
    scheduleNavigation(rawUrl, source, extras) {
        const /** @type {?} */ lastNavigation = this.navigations.value;
        // If the user triggers a navigation imperatively (e.g., by using navigateByUrl),
        // and that navigation results in 'replaceState' that leads to the same URL,
        // we should skip those.
        if (lastNavigation && source !== 'imperative' && lastNavigation.source === 'imperative' &&
            lastNavigation.rawUrl.toString() === rawUrl.toString()) {
            return null; // return value is not used
        }
        // Because of a bug in IE and Edge, the location class fires two events (popstate and
        // hashchange)
        // every single time. The second one should be ignored. Otherwise, the URL will flicker.
        if (lastNavigation && source == 'hashchange' && lastNavigation.source === 'popstate' &&
            lastNavigation.rawUrl.toString() === rawUrl.toString()) {
            return null; // return value is not used
        }
        let /** @type {?} */ resolve = null;
        let /** @type {?} */ reject = null;
        const /** @type {?} */ promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        const /** @type {?} */ id = ++this.navigationId;
        this.navigations.next({ id, source, rawUrl, extras, resolve, reject, promise });
        // Make sure that the error is propagated even though `processNavigations` catch
        // handler does not rethrow
        return promise.catch((e) => Promise.reject(e));
    }
    /**
     * @param {?} __0
     * @return {?}
     */
    executeScheduledNavigation({ id, rawUrl, extras, resolve, reject }) {
        const /** @type {?} */ url = this.urlHandlingStrategy.extract(rawUrl);
        const /** @type {?} */ urlTransition = !this.navigated || url.toString() !== this.currentUrlTree.toString();
        if (urlTransition && this.urlHandlingStrategy.shouldProcessUrl(rawUrl)) {
            this.routerEvents.next(new NavigationStart(id, this.serializeUrl(url)));
            Promise.resolve()
                .then((_) => this.runNavigate(url, rawUrl, extras.skipLocationChange, extras.replaceUrl, id, null))
                .then(resolve, reject);
        }
        else if (urlTransition && this.rawUrlTree &&
            this.urlHandlingStrategy.shouldProcessUrl(this.rawUrlTree)) {
            this.routerEvents.next(new NavigationStart(id, this.serializeUrl(url)));
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
     * @param {?} shouldPreventPushState
     * @param {?} shouldReplaceUrl
     * @param {?} id
     * @param {?} precreatedState
     * @return {?}
     */
    runNavigate(url, rawUrl, shouldPreventPushState, shouldReplaceUrl, id, precreatedState) {
        if (id !== this.navigationId) {
            this.location.go(this.urlSerializer.serialize(this.currentUrlTree));
            this.routerEvents.next(new NavigationCancel(id, this.serializeUrl(url), `Navigation ID ${id} is not equal to the current navigation id ${this.navigationId}`));
            return Promise.resolve(false);
        }
        return new Promise((resolvePromise, rejectPromise) => {
            // create an observable of the url and route state snapshot
            // this operation do not result in any side effects
            let /** @type {?} */ urlAndSnapshot$;
            if (!precreatedState) {
                const /** @type {?} */ redirectsApplied$ = applyRedirects(this.injector, this.configLoader, this.urlSerializer, url, this.config);
                urlAndSnapshot$ = mergeMap.call(redirectsApplied$, (appliedUrl) => {
                    return map.call(recognize(this.rootComponentType, this.config, appliedUrl, this.serializeUrl(appliedUrl)), (snapshot) => {
                        this.routerEvents.next(new RoutesRecognized(id, this.serializeUrl(url), this.serializeUrl(appliedUrl), snapshot));
                        return { appliedUrl, snapshot };
                    });
                });
            }
            else {
                urlAndSnapshot$ = of({ appliedUrl: url, snapshot: precreatedState });
            }
            // run preactivation: guards and data resolvers
            let /** @type {?} */ preActivation;
            const /** @type {?} */ preactivationTraverse$ = map.call(urlAndSnapshot$, ({ appliedUrl, snapshot }) => {
                preActivation =
                    new PreActivation(snapshot, this.currentRouterState.snapshot, this.injector);
                preActivation.traverse(this.outletMap);
                return { appliedUrl, snapshot };
            });
            const /** @type {?} */ preactivationCheckGuards = mergeMap.call(preactivationTraverse$, ({ appliedUrl, snapshot }) => {
                if (this.navigationId !== id)
                    return of(false);
                return map.call(preActivation.checkGuards(), (shouldActivate) => {
                    return { appliedUrl: appliedUrl, snapshot: snapshot, shouldActivate: shouldActivate };
                });
            });
            const /** @type {?} */ preactivationResolveData$ = mergeMap.call(preactivationCheckGuards, (p) => {
                if (this.navigationId !== id)
                    return of(false);
                if (p.shouldActivate) {
                    return map.call(preActivation.resolveData(), () => p);
                }
                else {
                    return of(p);
                }
            });
            // create router state
            // this operation has side effects => route state is being affected
            const /** @type {?} */ routerState$ = map.call(preactivationResolveData$, ({ appliedUrl, snapshot, shouldActivate }) => {
                if (shouldActivate) {
                    const /** @type {?} */ state = createRouterState(this.routeReuseStrategy, snapshot, this.currentRouterState);
                    return { appliedUrl, state, shouldActivate };
                }
                else {
                    return { appliedUrl, state: null, shouldActivate };
                }
            });
            // applied the new router state
            // this operation has side effects
            let /** @type {?} */ navigationIsSuccessful;
            const /** @type {?} */ storedState = this.currentRouterState;
            const /** @type {?} */ storedUrl = this.currentUrlTree;
            routerState$
                .forEach(({ appliedUrl, state, shouldActivate }) => {
                if (!shouldActivate || id !== this.navigationId) {
                    navigationIsSuccessful = false;
                    return;
                }
                this.currentUrlTree = appliedUrl;
                this.rawUrlTree = this.urlHandlingStrategy.merge(this.currentUrlTree, rawUrl);
                this.currentRouterState = state;
                if (!shouldPreventPushState) {
                    const /** @type {?} */ path = this.urlSerializer.serialize(this.rawUrlTree);
                    if (this.location.isCurrentPathEqualTo(path) || shouldReplaceUrl) {
                        this.location.replaceState(path);
                    }
                    else {
                        this.location.go(path);
                    }
                }
                new ActivateRoutes(this.routeReuseStrategy, state, storedState)
                    .activate(this.outletMap);
                navigationIsSuccessful = true;
            })
                .then(() => {
                this.navigated = true;
                if (navigationIsSuccessful) {
                    this.routerEvents.next(new NavigationEnd(id, this.serializeUrl(url), this.serializeUrl(this.currentUrlTree)));
                    resolvePromise(true);
                }
                else {
                    this.resetUrlToCurrentUrlTree();
                    this.routerEvents.next(new NavigationCancel(id, this.serializeUrl(url), ''));
                    resolvePromise(false);
                }
            }, (e) => {
                if (e instanceof NavigationCancelingError) {
                    this.resetUrlToCurrentUrlTree();
                    this.navigated = true;
                    this.routerEvents.next(new NavigationCancel(id, this.serializeUrl(url), e.message));
                    resolvePromise(false);
                }
                else {
                    this.routerEvents.next(new NavigationError(id, this.serializeUrl(url), e));
                    try {
                        resolvePromise(this.errorHandler(e));
                    }
                    catch (ee) {
                        rejectPromise(ee);
                    }
                }
                this.currentRouterState = storedState;
                this.currentUrlTree = storedUrl;
                this.rawUrlTree = this.urlHandlingStrategy.merge(this.currentUrlTree, rawUrl);
                this.location.replaceState(this.serializeUrl(this.rawUrlTree));
            });
        });
    }
    /**
     * @return {?}
     */
    resetUrlToCurrentUrlTree() {
        const /** @type {?} */ path = this.urlSerializer.serialize(this.rawUrlTree);
        this.location.replaceState(path);
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
    Router.prototype.routerEvents;
    /** @type {?} */
    Router.prototype.currentRouterState;
    /** @type {?} */
    Router.prototype.locationSubscription;
    /** @type {?} */
    Router.prototype.navigationId;
    /** @type {?} */
    Router.prototype.configLoader;
    /**
     * Error handler that is invoked when a navigation errors.
     *
     * See {\@link ErrorHandler} for more information.
     * @type {?}
     */
    Router.prototype.errorHandler;
    /**
     * Indicates if at least one navigation happened.
     * @type {?}
     */
    Router.prototype.navigated;
    /**
     * Extracts and merges URLs. Used for Angular 1 to Angular 2 migrations.
     * @type {?}
     */
    Router.prototype.urlHandlingStrategy;
    /** @type {?} */
    Router.prototype.routeReuseStrategy;
    /** @type {?} */
    Router.prototype.rootComponentType;
    /** @type {?} */
    Router.prototype.urlSerializer;
    /** @type {?} */
    Router.prototype.outletMap;
    /** @type {?} */
    Router.prototype.location;
    /** @type {?} */
    Router.prototype.injector;
    /** @type {?} */
    Router.prototype.config;
}
class CanActivate {
    /**
     * @param {?} path
     */
    constructor(path) {
        this.path = path;
    }
    /**
     * @return {?}
     */
    get route() { return this.path[this.path.length - 1]; }
}
function CanActivate_tsickle_Closure_declarations() {
    /** @type {?} */
    CanActivate.prototype.path;
}
class CanDeactivate {
    /**
     * @param {?} component
     * @param {?} route
     */
    constructor(component, route) {
        this.component = component;
        this.route = route;
    }
}
function CanDeactivate_tsickle_Closure_declarations() {
    /** @type {?} */
    CanDeactivate.prototype.component;
    /** @type {?} */
    CanDeactivate.prototype.route;
}
export class PreActivation {
    /**
     * @param {?} future
     * @param {?} curr
     * @param {?} injector
     */
    constructor(future, curr, injector) {
        this.future = future;
        this.curr = curr;
        this.injector = injector;
        this.checks = [];
    }
    /**
     * @param {?} parentOutletMap
     * @return {?}
     */
    traverse(parentOutletMap) {
        const /** @type {?} */ futureRoot = this.future._root;
        const /** @type {?} */ currRoot = this.curr ? this.curr._root : null;
        this.traverseChildRoutes(futureRoot, currRoot, parentOutletMap, [futureRoot.value]);
    }
    /**
     * @return {?}
     */
    checkGuards() {
        if (this.checks.length === 0)
            return of(true);
        const /** @type {?} */ checks$ = from(this.checks);
        const /** @type {?} */ runningChecks$ = mergeMap.call(checks$, (s) => {
            if (s instanceof CanActivate) {
                return andObservables(from([this.runCanActivateChild(s.path), this.runCanActivate(s.route)]));
            }
            else if (s instanceof CanDeactivate) {
                // workaround https://github.com/Microsoft/TypeScript/issues/7271
                const /** @type {?} */ s2 = (s);
                return this.runCanDeactivate(s2.component, s2.route);
            }
            else {
                throw new Error('Cannot be reached');
            }
        });
        return every.call(runningChecks$, (result) => result === true);
    }
    /**
     * @return {?}
     */
    resolveData() {
        if (this.checks.length === 0)
            return of(null);
        const /** @type {?} */ checks$ = from(this.checks);
        const /** @type {?} */ runningChecks$ = concatMap.call(checks$, (s) => {
            if (s instanceof CanActivate) {
                return this.runResolve(s.route);
            }
            else {
                return of(null);
            }
        });
        return reduce.call(runningChecks$, (_, __) => _);
    }
    /**
     * @param {?} futureNode
     * @param {?} currNode
     * @param {?} outletMap
     * @param {?} futurePath
     * @return {?}
     */
    traverseChildRoutes(futureNode, currNode, outletMap, futurePath) {
        const /** @type {?} */ prevChildren = nodeChildrenAsMap(currNode);
        futureNode.children.forEach(c => {
            this.traverseRoutes(c, prevChildren[c.value.outlet], outletMap, futurePath.concat([c.value]));
            delete prevChildren[c.value.outlet];
        });
        forEach(prevChildren, (v, k) => this.deactiveRouteAndItsChildren(v, outletMap._outlets[k]));
    }
    /**
     * @param {?} futureNode
     * @param {?} currNode
     * @param {?} parentOutletMap
     * @param {?} futurePath
     * @return {?}
     */
    traverseRoutes(futureNode, currNode, parentOutletMap, futurePath) {
        const /** @type {?} */ future = futureNode.value;
        const /** @type {?} */ curr = currNode ? currNode.value : null;
        const /** @type {?} */ outlet = parentOutletMap ? parentOutletMap._outlets[futureNode.value.outlet] : null;
        // reusing the node
        if (curr && future._routeConfig === curr._routeConfig) {
            if (!equalParamsAndUrlSegments(future, curr)) {
                this.checks.push(new CanDeactivate(outlet.component, curr), new CanActivate(futurePath));
            }
            else {
                // we need to set the data
                future.data = curr.data;
                future._resolvedData = curr._resolvedData;
            }
            // If we have a component, we need to go through an outlet.
            if (future.component) {
                this.traverseChildRoutes(futureNode, currNode, outlet ? outlet.outletMap : null, futurePath);
            }
            else {
                this.traverseChildRoutes(futureNode, currNode, parentOutletMap, futurePath);
            }
        }
        else {
            if (curr) {
                this.deactiveRouteAndItsChildren(currNode, outlet);
            }
            this.checks.push(new CanActivate(futurePath));
            // If we have a component, we need to go through an outlet.
            if (future.component) {
                this.traverseChildRoutes(futureNode, null, outlet ? outlet.outletMap : null, futurePath);
            }
            else {
                this.traverseChildRoutes(futureNode, null, parentOutletMap, futurePath);
            }
        }
    }
    /**
     * @param {?} route
     * @param {?} outlet
     * @return {?}
     */
    deactiveRouteAndItsChildren(route, outlet) {
        const /** @type {?} */ prevChildren = nodeChildrenAsMap(route);
        const /** @type {?} */ r = route.value;
        forEach(prevChildren, (v, k) => {
            if (!r.component) {
                this.deactiveRouteAndItsChildren(v, outlet);
            }
            else if (!!outlet) {
                this.deactiveRouteAndItsChildren(v, outlet.outletMap._outlets[k]);
            }
            else {
                this.deactiveRouteAndItsChildren(v, null);
            }
        });
        if (!r.component) {
            this.checks.push(new CanDeactivate(null, r));
        }
        else if (outlet && outlet.isActivated) {
            this.checks.push(new CanDeactivate(outlet.component, r));
        }
        else {
            this.checks.push(new CanDeactivate(null, r));
        }
    }
    /**
     * @param {?} future
     * @return {?}
     */
    runCanActivate(future) {
        const /** @type {?} */ canActivate = future._routeConfig ? future._routeConfig.canActivate : null;
        if (!canActivate || canActivate.length === 0)
            return of(true);
        const /** @type {?} */ obs = map.call(from(canActivate), (c) => {
            const /** @type {?} */ guard = this.getToken(c, future);
            let /** @type {?} */ observable;
            if (guard.canActivate) {
                observable = wrapIntoObservable(guard.canActivate(future, this.future));
            }
            else {
                observable = wrapIntoObservable(guard(future, this.future));
            }
            return first.call(observable);
        });
        return andObservables(obs);
    }
    /**
     * @param {?} path
     * @return {?}
     */
    runCanActivateChild(path) {
        const /** @type {?} */ future = path[path.length - 1];
        const /** @type {?} */ canActivateChildGuards = path.slice(0, path.length - 1)
            .reverse()
            .map(p => this.extractCanActivateChild(p))
            .filter(_ => _ !== null);
        return andObservables(map.call(from(canActivateChildGuards), (d) => {
            const /** @type {?} */ obs = map.call(from(d.guards), (c) => {
                const /** @type {?} */ guard = this.getToken(c, c.node);
                let /** @type {?} */ observable;
                if (guard.canActivateChild) {
                    observable = wrapIntoObservable(guard.canActivateChild(future, this.future));
                }
                else {
                    observable = wrapIntoObservable(guard(future, this.future));
                }
                return first.call(observable);
            });
            return andObservables(obs);
        }));
    }
    /**
     * @param {?} p
     * @return {?}
     */
    extractCanActivateChild(p) {
        const /** @type {?} */ canActivateChild = p._routeConfig ? p._routeConfig.canActivateChild : null;
        if (!canActivateChild || canActivateChild.length === 0)
            return null;
        return { node: p, guards: canActivateChild };
    }
    /**
     * @param {?} component
     * @param {?} curr
     * @return {?}
     */
    runCanDeactivate(component, curr) {
        const /** @type {?} */ canDeactivate = curr && curr._routeConfig ? curr._routeConfig.canDeactivate : null;
        if (!canDeactivate || canDeactivate.length === 0)
            return of(true);
        const /** @type {?} */ canDeactivate$ = mergeMap.call(from(canDeactivate), (c) => {
            const /** @type {?} */ guard = this.getToken(c, curr);
            let /** @type {?} */ observable;
            if (guard.canDeactivate) {
                observable =
                    wrapIntoObservable(guard.canDeactivate(component, curr, this.curr, this.future));
            }
            else {
                observable = wrapIntoObservable(guard(component, curr, this.curr, this.future));
            }
            return first.call(observable);
        });
        return every.call(canDeactivate$, (result) => result === true);
    }
    /**
     * @param {?} future
     * @return {?}
     */
    runResolve(future) {
        const /** @type {?} */ resolve = future._resolve;
        return map.call(this.resolveNode(resolve, future), (resolvedData) => {
            future._resolvedData = resolvedData;
            future.data = merge(future.data, inheritedParamsDataResolve(future).resolve);
            return null;
        });
    }
    /**
     * @param {?} resolve
     * @param {?} future
     * @return {?}
     */
    resolveNode(resolve, future) {
        return waitForMap(resolve, (k, v) => {
            const /** @type {?} */ resolver = this.getToken(v, future);
            return resolver.resolve ? wrapIntoObservable(resolver.resolve(future, this.future)) :
                wrapIntoObservable(resolver(future, this.future));
        });
    }
    /**
     * @param {?} token
     * @param {?} snapshot
     * @return {?}
     */
    getToken(token, snapshot) {
        const /** @type {?} */ config = closestLoadedConfig(snapshot);
        const /** @type {?} */ injector = config ? config.injector : this.injector;
        return injector.get(token);
    }
}
function PreActivation_tsickle_Closure_declarations() {
    /** @type {?} */
    PreActivation.prototype.checks;
    /** @type {?} */
    PreActivation.prototype.future;
    /** @type {?} */
    PreActivation.prototype.curr;
    /** @type {?} */
    PreActivation.prototype.injector;
}
class ActivateRoutes {
    /**
     * @param {?} routeReuseStrategy
     * @param {?} futureState
     * @param {?} currState
     */
    constructor(routeReuseStrategy, futureState, currState) {
        this.routeReuseStrategy = routeReuseStrategy;
        this.futureState = futureState;
        this.currState = currState;
    }
    /**
     * @param {?} parentOutletMap
     * @return {?}
     */
    activate(parentOutletMap) {
        const /** @type {?} */ futureRoot = this.futureState._root;
        const /** @type {?} */ currRoot = this.currState ? this.currState._root : null;
        this.deactivateChildRoutes(futureRoot, currRoot, parentOutletMap);
        advanceActivatedRoute(this.futureState.root);
        this.activateChildRoutes(futureRoot, currRoot, parentOutletMap);
    }
    /**
     * @param {?} futureNode
     * @param {?} currNode
     * @param {?} outletMap
     * @return {?}
     */
    deactivateChildRoutes(futureNode, currNode, outletMap) {
        const /** @type {?} */ prevChildren = nodeChildrenAsMap(currNode);
        futureNode.children.forEach(c => {
            this.deactivateRoutes(c, prevChildren[c.value.outlet], outletMap);
            delete prevChildren[c.value.outlet];
        });
        forEach(prevChildren, (v, k) => this.deactiveRouteAndItsChildren(v, outletMap));
    }
    /**
     * @param {?} futureNode
     * @param {?} currNode
     * @param {?} outletMap
     * @return {?}
     */
    activateChildRoutes(futureNode, currNode, outletMap) {
        const /** @type {?} */ prevChildren = nodeChildrenAsMap(currNode);
        futureNode.children.forEach(c => { this.activateRoutes(c, prevChildren[c.value.outlet], outletMap); });
    }
    /**
     * @param {?} futureNode
     * @param {?} currNode
     * @param {?} parentOutletMap
     * @return {?}
     */
    deactivateRoutes(futureNode, currNode, parentOutletMap) {
        const /** @type {?} */ future = futureNode.value;
        const /** @type {?} */ curr = currNode ? currNode.value : null;
        // reusing the node
        if (future === curr) {
            // If we have a normal route, we need to go through an outlet.
            if (future.component) {
                const /** @type {?} */ outlet = getOutlet(parentOutletMap, future);
                this.deactivateChildRoutes(futureNode, currNode, outlet.outletMap);
            }
            else {
                this.deactivateChildRoutes(futureNode, currNode, parentOutletMap);
            }
        }
        else {
            if (curr) {
                this.deactiveRouteAndItsChildren(currNode, parentOutletMap);
            }
        }
    }
    /**
     * @param {?} futureNode
     * @param {?} currNode
     * @param {?} parentOutletMap
     * @return {?}
     */
    activateRoutes(futureNode, currNode, parentOutletMap) {
        const /** @type {?} */ future = futureNode.value;
        const /** @type {?} */ curr = currNode ? currNode.value : null;
        // reusing the node
        if (future === curr) {
            // advance the route to push the parameters
            advanceActivatedRoute(future);
            // If we have a normal route, we need to go through an outlet.
            if (future.component) {
                const /** @type {?} */ outlet = getOutlet(parentOutletMap, future);
                this.activateChildRoutes(futureNode, currNode, outlet.outletMap);
            }
            else {
                this.activateChildRoutes(futureNode, currNode, parentOutletMap);
            }
        }
        else {
            // if we have a normal route, we need to advance the route
            // and place the component into the outlet. After that recurse.
            if (future.component) {
                advanceActivatedRoute(future);
                const /** @type {?} */ outlet = getOutlet(parentOutletMap, futureNode.value);
                if (this.routeReuseStrategy.shouldAttach(future.snapshot)) {
                    const /** @type {?} */ stored = ((this.routeReuseStrategy.retrieve(future.snapshot)));
                    this.routeReuseStrategy.store(future.snapshot, null);
                    outlet.attach(stored.componentRef, stored.route.value);
                    advanceActivatedRouteNodeAndItsChildren(stored.route);
                }
                else {
                    const /** @type {?} */ outletMap = new RouterOutletMap();
                    this.placeComponentIntoOutlet(outletMap, future, outlet);
                    this.activateChildRoutes(futureNode, null, outletMap);
                }
            }
            else {
                advanceActivatedRoute(future);
                this.activateChildRoutes(futureNode, null, parentOutletMap);
            }
        }
    }
    /**
     * @param {?} outletMap
     * @param {?} future
     * @param {?} outlet
     * @return {?}
     */
    placeComponentIntoOutlet(outletMap, future, outlet) {
        const /** @type {?} */ resolved = ([{ provide: ActivatedRoute, useValue: future }, {
                provide: RouterOutletMap,
                useValue: outletMap
            }]);
        const /** @type {?} */ config = parentLoadedConfig(future.snapshot);
        let /** @type {?} */ resolver = null;
        let /** @type {?} */ injector = null;
        if (config) {
            injector = config.injectorFactory(outlet.locationInjector);
            resolver = config.factoryResolver;
            resolved.push({ provide: ComponentFactoryResolver, useValue: resolver });
        }
        else {
            injector = outlet.locationInjector;
            resolver = outlet.locationFactoryResolver;
        }
        outlet.activate(future, resolver, injector, ReflectiveInjector.resolve(resolved), outletMap);
    }
    /**
     * @param {?} route
     * @param {?} parentOutletMap
     * @return {?}
     */
    deactiveRouteAndItsChildren(route, parentOutletMap) {
        if (this.routeReuseStrategy.shouldDetach(route.value.snapshot)) {
            this.detachAndStoreRouteSubtree(route, parentOutletMap);
        }
        else {
            this.deactiveRouteAndOutlet(route, parentOutletMap);
        }
    }
    /**
     * @param {?} route
     * @param {?} parentOutletMap
     * @return {?}
     */
    detachAndStoreRouteSubtree(route, parentOutletMap) {
        const /** @type {?} */ outlet = getOutlet(parentOutletMap, route.value);
        const /** @type {?} */ componentRef = outlet.detach();
        this.routeReuseStrategy.store(route.value.snapshot, { componentRef, route });
    }
    /**
     * @param {?} route
     * @param {?} parentOutletMap
     * @return {?}
     */
    deactiveRouteAndOutlet(route, parentOutletMap) {
        const /** @type {?} */ prevChildren = nodeChildrenAsMap(route);
        let /** @type {?} */ outlet = null;
        // getOutlet throws when cannot find the right outlet,
        // which can happen if an outlet was in an NgIf and was removed
        try {
            outlet = getOutlet(parentOutletMap, route.value);
        }
        catch (e) {
            return;
        }
        const /** @type {?} */ childOutletMap = outlet.outletMap;
        forEach(prevChildren, (v, k) => {
            if (route.value.component) {
                this.deactiveRouteAndItsChildren(v, childOutletMap);
            }
            else {
                this.deactiveRouteAndItsChildren(v, parentOutletMap);
            }
        });
        if (outlet && outlet.isActivated) {
            outlet.deactivate();
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
    let /** @type {?} */ s = snapshot.parent;
    while (s) {
        const /** @type {?} */ c = s._routeConfig;
        if (c && c._loadedConfig)
            return c._loadedConfig;
        if (c && c.component)
            return null;
        s = s.parent;
    }
    return null;
}
/**
 * @param {?} snapshot
 * @return {?}
 */
function closestLoadedConfig(snapshot) {
    if (!snapshot)
        return null;
    let /** @type {?} */ s = snapshot.parent;
    while (s) {
        const /** @type {?} */ c = s._routeConfig;
        if (c && c._loadedConfig)
            return c._loadedConfig;
        s = s.parent;
    }
    return null;
}
/**
 * @param {?} node
 * @return {?}
 */
function nodeChildrenAsMap(node) {
    return node ? node.children.reduce((m, c) => {
        m[c.value.outlet] = c;
        return m;
    }, {}) : {};
}
/**
 * @param {?} outletMap
 * @param {?} route
 * @return {?}
 */
function getOutlet(outletMap, route) {
    const /** @type {?} */ outlet = outletMap._outlets[route.outlet];
    if (!outlet) {
        const /** @type {?} */ componentName = ((route.component)).name;
        if (route.outlet === PRIMARY_OUTLET) {
            throw new Error(`Cannot find primary outlet to load '${componentName}'`);
        }
        else {
            throw new Error(`Cannot find the outlet ${route.outlet} to load '${componentName}'`);
        }
    }
    return outlet;
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
//# sourceMappingURL=router.js.map