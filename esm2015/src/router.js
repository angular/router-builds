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
function defaultErrorHandler(error) {
    throw error;
}
function defaultMalformedUriErrorHandler(error, urlSerializer, url) {
    return urlSerializer.parse('/');
}
/**
 * @internal
 */
function defaultRouterHook(snapshot, runExtras) {
    return of(null);
}
/**
 * @description
 *
 * Provides the navigation and url manipulation capabilities.
 *
 * See `Routes` for more details and examples.
 *
 * @ngModule RouterModule
 *
 *
 */
export class Router {
    /**
     * Creates the router service.
     */
    // TODO: vsavkin make internal after the final is out.
    constructor(rootComponentType, urlSerializer, rootContexts, location, injector, loader, compiler, config) {
        this.rootComponentType = rootComponentType;
        this.urlSerializer = urlSerializer;
        this.rootContexts = rootContexts;
        this.location = location;
        this.config = config;
        this.navigations = new BehaviorSubject(null);
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
         * @internal
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
        /**
         * See {@link RouterModule} for more information.
         */
        this.relativeLinkResolution = 'legacy';
        const onLoadStart = (r) => this.triggerEvent(new RouteConfigLoadStart(r));
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
        if (this.navigationId === 0) {
            this.navigateByUrl(this.location.path(true), { replaceUrl: true });
        }
    }
    /**
     * Sets up the location change listener.
     */
    setUpLocationChangeListener() {
        // Don't need to use Zone.wrap any more, because zone.js
        // already patch onPopState, so location change callback will
        // run into ngZone
        if (!this.locationSubscription) {
            this.locationSubscription = this.location.subscribe((change) => {
                let rawUrlTree = this.parseUrl(change['url']);
                const source = change['type'] === 'popstate' ? 'popstate' : 'hashchange';
                const state = change.state && change.state.navigationId ?
                    { navigationId: change.state.navigationId } :
                    null;
                setTimeout(() => { this.scheduleNavigation(rawUrlTree, source, state, { replaceUrl: true }); }, 0);
            });
        }
    }
    /** The current url */
    get url() { return this.serializeUrl(this.currentUrlTree); }
    /** @internal */
    triggerEvent(e) { this.events.next(e); }
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
     */
    resetConfig(config) {
        validateConfig(config);
        this.config = config.map(standardizeConfig);
        this.navigated = false;
        this.lastSuccessfulId = -1;
    }
    /** @docsNotRequired */
    ngOnDestroy() { this.dispose(); }
    /** Disposes of the router */
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
     */
    createUrlTree(commands, navigationExtras = {}) {
        const { relativeTo, queryParams, fragment, preserveQueryParams, queryParamsHandling, preserveFragment } = navigationExtras;
        if (isDevMode() && preserveQueryParams && console && console.warn) {
            console.warn('preserveQueryParams is deprecated, use queryParamsHandling instead.');
        }
        const a = relativeTo || this.routerState.root;
        const f = preserveFragment ? this.currentUrlTree.fragment : fragment;
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
     */
    navigateByUrl(url, extras = { skipLocationChange: false }) {
        const urlTree = url instanceof UrlTree ? url : this.parseUrl(url);
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
     */
    navigate(commands, extras = { skipLocationChange: false }) {
        validateCommands(commands);
        return this.navigateByUrl(this.createUrlTree(commands, extras), extras);
    }
    /** Serializes a `UrlTree` into a string */
    serializeUrl(url) { return this.urlSerializer.serialize(url); }
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
    /** Returns whether the url is activated */
    isActive(url, exact) {
        if (url instanceof UrlTree) {
            return containsTree(this.currentUrlTree, url, exact);
        }
        const urlTree = this.parseUrl(url);
        return containsTree(this.currentUrlTree, urlTree, exact);
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
                return of(null);
            }
        }))
            .subscribe(() => { });
    }
    scheduleNavigation(rawUrl, source, state, extras) {
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
        let resolve = null;
        let reject = null;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        const id = ++this.navigationId;
        this.navigations.next({ id, source, state, rawUrl, extras, resolve, reject, promise });
        // Make sure that the error is propagated even though `processNavigations` catch
        // handler does not rethrow
        return promise.catch((e) => Promise.reject(e));
    }
    executeScheduledNavigation({ id, rawUrl, extras, resolve, reject, source, state }) {
        const url = this.urlHandlingStrategy.extract(rawUrl);
        const urlTransition = !this.navigated || url.toString() !== this.currentUrlTree.toString();
        if ((this.onSameUrlNavigation === 'reload' ? true : urlTransition) &&
            this.urlHandlingStrategy.shouldProcessUrl(rawUrl)) {
            if (this.urlUpdateStrategy === 'eager' && !extras.skipLocationChange) {
                this.setBrowserUrl(rawUrl, !!extras.replaceUrl, id);
            }
            this.events
                .next(new NavigationStart(id, this.serializeUrl(url), source, state));
            Promise.resolve()
                .then((_) => this.runNavigate(url, rawUrl, !!extras.skipLocationChange, !!extras.replaceUrl, id, null))
                .then(resolve, reject);
            // we cannot process the current URL, but we could process the previous one =>
            // we need to do some cleanup
        }
        else if (urlTransition && this.rawUrlTree &&
            this.urlHandlingStrategy.shouldProcessUrl(this.rawUrlTree)) {
            this.events
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
    runNavigate(url, rawUrl, skipLocationChange, replaceUrl, id, precreatedState) {
        if (id !== this.navigationId) {
            this.events
                .next(new NavigationCancel(id, this.serializeUrl(url), `Navigation ID ${id} is not equal to the current navigation id ${this.navigationId}`));
            return Promise.resolve(false);
        }
        return new Promise((resolvePromise, rejectPromise) => {
            // create an observable of the url and route state snapshot
            // this operation do not result in any side effects
            let urlAndSnapshot$;
            if (!precreatedState) {
                const moduleInjector = this.ngModule.injector;
                const redirectsApplied$ = applyRedirects(moduleInjector, this.configLoader, this.urlSerializer, url, this.config);
                urlAndSnapshot$ = redirectsApplied$.pipe(mergeMap((appliedUrl) => {
                    return recognize(this.rootComponentType, this.config, appliedUrl, this.serializeUrl(appliedUrl), this.paramsInheritanceStrategy, this.relativeLinkResolution)
                        .pipe(map((snapshot) => {
                        this.events
                            .next(new RoutesRecognized(id, this.serializeUrl(url), this.serializeUrl(appliedUrl), snapshot));
                        return { appliedUrl, snapshot };
                    }));
                }));
            }
            else {
                urlAndSnapshot$ = of({ appliedUrl: url, snapshot: precreatedState });
            }
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
            // run preactivation: guards and data resolvers
            let preActivation;
            const preactivationSetup$ = beforePreactivationDone$.pipe(map((p) => {
                if (typeof p === 'boolean')
                    return p;
                const { appliedUrl, snapshot } = p;
                const moduleInjector = this.ngModule.injector;
                preActivation = new PreActivation(snapshot, this.routerState.snapshot, moduleInjector, (evt) => this.triggerEvent(evt));
                preActivation.initialize(this.rootContexts);
                return { appliedUrl, snapshot };
            }));
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
            // create router state
            // this operation has side effects => route state is being affected
            const routerState$ = preactivationDone$.pipe(map((p) => {
                if (typeof p === 'boolean' || this.navigationId !== id)
                    return false;
                const { appliedUrl, snapshot, shouldActivate } = p;
                if (shouldActivate) {
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
     */
    activateRoutes(state, storedState, storedUrl, id, url, rawUrl, skipLocationChange, replaceUrl, resolvePromise, rejectPromise) {
        // applied the new router state
        // this operation has side effects
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
            this.routerState = state;
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
                this.events
                    .next(new NavigationEnd(id, this.serializeUrl(url), this.serializeUrl(this.currentUrlTree)));
                resolvePromise(true);
            }
            else {
                this.resetUrlToCurrentUrlTree();
                this.events
                    .next(new NavigationCancel(id, this.serializeUrl(url), ''));
                resolvePromise(false);
            }
        }, (e) => {
            if (isNavigationCancelingError(e)) {
                this.navigated = true;
                this.resetStateAndUrl(storedState, storedUrl, rawUrl);
                this.events
                    .next(new NavigationCancel(id, this.serializeUrl(url), e.message));
                resolvePromise(false);
            }
            else {
                this.resetStateAndUrl(storedState, storedUrl, rawUrl);
                this.events
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
    setBrowserUrl(url, replaceUrl, id) {
        const path = this.urlSerializer.serialize(url);
        if (this.location.isCurrentPathEqualTo(path) || replaceUrl) {
            this.location.replaceState(path, '', { navigationId: id });
        }
        else {
            this.location.go(path, '', { navigationId: id });
        }
    }
    resetStateAndUrl(storedState, storedUrl, rawUrl) {
        this.routerState = storedState;
        this.currentUrlTree = storedUrl;
        this.rawUrlTree = this.urlHandlingStrategy.merge(this.currentUrlTree, rawUrl);
        this.resetUrlToCurrentUrlTree();
    }
    resetUrlToCurrentUrlTree() {
        this.location.replaceState(this.urlSerializer.serialize(this.rawUrlTree), '', { navigationId: this.lastSuccessfulId });
    }
}
class ActivateRoutes {
    constructor(routeReuseStrategy, futureState, currState, forwardEvent) {
        this.routeReuseStrategy = routeReuseStrategy;
        this.futureState = futureState;
        this.currState = currState;
        this.forwardEvent = forwardEvent;
    }
    activate(parentContexts) {
        const futureRoot = this.futureState._root;
        const currRoot = this.currState ? this.currState._root : null;
        this.deactivateChildRoutes(futureRoot, currRoot, parentContexts);
        advanceActivatedRoute(this.futureState.root);
        this.activateChildRoutes(futureRoot, currRoot, parentContexts);
    }
    // De-activate the child route that are not re-used for the future state
    deactivateChildRoutes(futureNode, currNode, contexts) {
        const children = nodeChildrenAsMap(currNode);
        // Recurse on the routes active in the future state to de-activate deeper children
        futureNode.children.forEach(futureChild => {
            const childOutletName = futureChild.value.outlet;
            this.deactivateRoutes(futureChild, children[childOutletName], contexts);
            delete children[childOutletName];
        });
        // De-activate the routes that will not be re-used
        forEach(children, (v, childName) => {
            this.deactivateRouteAndItsChildren(v, contexts);
        });
    }
    deactivateRoutes(futureNode, currNode, parentContext) {
        const future = futureNode.value;
        const curr = currNode ? currNode.value : null;
        if (future === curr) {
            // Reusing the node, check to see if the children need to be de-activated
            if (future.component) {
                // If we have a normal route, we need to go through an outlet.
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
    deactivateRouteAndItsChildren(route, parentContexts) {
        if (this.routeReuseStrategy.shouldDetach(route.value.snapshot)) {
            this.detachAndStoreRouteSubtree(route, parentContexts);
        }
        else {
            this.deactivateRouteAndOutlet(route, parentContexts);
        }
    }
    detachAndStoreRouteSubtree(route, parentContexts) {
        const context = parentContexts.getContext(route.value.outlet);
        if (context && context.outlet) {
            const componentRef = context.outlet.detach();
            const contexts = context.children.onOutletDeactivated();
            this.routeReuseStrategy.store(route.value.snapshot, { componentRef, route, contexts });
        }
    }
    deactivateRouteAndOutlet(route, parentContexts) {
        const context = parentContexts.getContext(route.value.outlet);
        if (context) {
            const children = nodeChildrenAsMap(route);
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
    activateChildRoutes(futureNode, currNode, contexts) {
        const children = nodeChildrenAsMap(currNode);
        futureNode.children.forEach(c => {
            this.activateRoutes(c, children[c.value.outlet], contexts);
            this.forwardEvent(new ActivationEnd(c.value.snapshot));
        });
        if (futureNode.children.length) {
            this.forwardEvent(new ChildActivationEnd(futureNode.value.snapshot));
        }
    }
    activateRoutes(futureNode, currNode, parentContexts) {
        const future = futureNode.value;
        const curr = currNode ? currNode.value : null;
        advanceActivatedRoute(future);
        // reusing the node
        if (future === curr) {
            if (future.component) {
                // If we have a normal route, we need to go through an outlet.
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
                // if we have a normal route, we need to place the component into the outlet and recurse.
                const context = parentContexts.getOrCreateContext(future.outlet);
                if (this.routeReuseStrategy.shouldAttach(future.snapshot)) {
                    const stored = this.routeReuseStrategy.retrieve(future.snapshot);
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
                    const config = parentLoadedConfig(future.snapshot);
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
function advanceActivatedRouteNodeAndItsChildren(node) {
    advanceActivatedRoute(node.value);
    node.children.forEach(advanceActivatedRouteNodeAndItsChildren);
}
function parentLoadedConfig(snapshot) {
    for (let s = snapshot.parent; s; s = s.parent) {
        const route = s.routeConfig;
        if (route && route._loadedConfig)
            return route._loadedConfig;
        if (route && route.component)
            return null;
    }
    return null;
}
function validateCommands(commands) {
    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        if (cmd == null) {
            throw new Error(`The requested path contains ${cmd} segment at index ${i}`);
        }
    }
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUE0QyxXQUFXLEVBQVEsU0FBUyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3RHLE9BQU8sRUFBQyxlQUFlLEVBQWMsT0FBTyxFQUFnQixFQUFFLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDN0UsT0FBTyxFQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFeEQsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ2pELE9BQU8sRUFBeUQsaUJBQWlCLEVBQUUsY0FBYyxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ25ILE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQ3hELE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRCxPQUFPLEVBQUMsYUFBYSxFQUFFLGtCQUFrQixFQUFTLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBcUIsVUFBVSxFQUFFLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNoUixPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDL0MsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGFBQWEsQ0FBQztBQUN0QyxPQUFPLEVBQUMseUJBQXlCLEVBQWtELE1BQU0sd0JBQXdCLENBQUM7QUFDbEgsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFFMUQsT0FBTyxFQUEyRSxxQkFBcUIsRUFBRSxnQkFBZ0IsRUFBNkIsTUFBTSxnQkFBZ0IsQ0FBQztBQUM3SyxPQUFPLEVBQVMsMEJBQTBCLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDNUQsT0FBTyxFQUFDLDBCQUEwQixFQUFzQixNQUFNLHlCQUF5QixDQUFDO0FBQ3hGLE9BQU8sRUFBZ0IsT0FBTyxFQUFFLFlBQVksRUFBRSxrQkFBa0IsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUNwRixPQUFPLEVBQUMsT0FBTyxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDM0MsT0FBTyxFQUFXLGlCQUFpQixFQUFDLE1BQU0sY0FBYyxDQUFDO0FBa0l6RCw2QkFBNkIsS0FBVTtJQUNyQyxNQUFNLEtBQUssQ0FBQztBQUNkLENBQUM7QUFFRCx5Q0FDSSxLQUFlLEVBQUUsYUFBNEIsRUFBRSxHQUFXO0lBQzVELE9BQU8sYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNsQyxDQUFDO0FBMkJEOztHQUVHO0FBQ0gsMkJBQTJCLFFBQTZCLEVBQUUsU0FNekQ7SUFDQyxPQUFPLEVBQUUsQ0FBRSxJQUFJLENBQVEsQ0FBQztBQUMxQixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7R0FVRztBQUNILE1BQU07SUF3Rko7O09BRUc7SUFDSCxzREFBc0Q7SUFDdEQsWUFDWSxpQkFBaUMsRUFBVSxhQUE0QixFQUN2RSxZQUFvQyxFQUFVLFFBQWtCLEVBQUUsUUFBa0IsRUFDNUYsTUFBNkIsRUFBRSxRQUFrQixFQUFTLE1BQWM7UUFGaEUsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFnQjtRQUFVLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3ZFLGlCQUFZLEdBQVosWUFBWSxDQUF3QjtRQUFVLGFBQVEsR0FBUixRQUFRLENBQVU7UUFDZCxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBNUZwRSxnQkFBVyxHQUFHLElBQUksZUFBZSxDQUFtQixJQUFNLENBQUMsQ0FBQztRQUk1RCxpQkFBWSxHQUFXLENBQUMsQ0FBQztRQUlqQixXQUFNLEdBQXNCLElBQUksT0FBTyxFQUFTLENBQUM7UUFHakU7Ozs7V0FJRztRQUNILGlCQUFZLEdBQWlCLG1CQUFtQixDQUFDO1FBRWpEOzs7O1dBSUc7UUFDSCw2QkFBd0IsR0FFTywrQkFBK0IsQ0FBQztRQUUvRDs7V0FFRztRQUNILGNBQVMsR0FBWSxLQUFLLENBQUM7UUFDbkIscUJBQWdCLEdBQVcsQ0FBQyxDQUFDLENBQUM7UUFFdEM7Ozs7V0FJRztRQUNILFVBQUssR0FBc0U7WUFDekUsbUJBQW1CLEVBQUUsaUJBQWlCO1lBQ3RDLGtCQUFrQixFQUFFLGlCQUFpQjtTQUN0QyxDQUFDO1FBRUY7O1dBRUc7UUFDSCx3QkFBbUIsR0FBd0IsSUFBSSwwQkFBMEIsRUFBRSxDQUFDO1FBRTVFLHVCQUFrQixHQUF1QixJQUFJLHlCQUF5QixFQUFFLENBQUM7UUFFekU7Ozs7O1dBS0c7UUFDSCx3QkFBbUIsR0FBc0IsUUFBUSxDQUFDO1FBRWxEOzs7Ozs7O1dBT0c7UUFDSCw4QkFBeUIsR0FBeUIsV0FBVyxDQUFDO1FBRTlEOzs7Ozs7Ozs7V0FTRztRQUNILHNCQUFpQixHQUF1QixVQUFVLENBQUM7UUFFbkQ7O1dBRUc7UUFDSCwyQkFBc0IsR0FBeUIsUUFBUSxDQUFDO1FBVXRELE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRixNQUFNLFNBQVMsR0FBRyxDQUFDLENBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFN0UsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRTFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLGNBQWMsR0FBRyxrQkFBa0IsRUFBRSxDQUFDO1FBQzNDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUV0QyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksa0JBQWtCLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckYsSUFBSSxDQUFDLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2pGLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFRDs7O09BR0c7SUFDSCxzQkFBc0IsQ0FBQyxpQkFBNEI7UUFDakQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDO1FBQzNDLHNFQUFzRTtRQUN0RSxrREFBa0Q7UUFDbEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztJQUMzRCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxpQkFBaUI7UUFDZixJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztRQUNuQyxJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssQ0FBQyxFQUFFO1lBQzNCLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBQyxVQUFVLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztTQUNsRTtJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILDJCQUEyQjtRQUN6Qix3REFBd0Q7UUFDeEQsNkRBQTZEO1FBQzdELGtCQUFrQjtRQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFO1lBQzlCLElBQUksQ0FBQyxvQkFBb0IsR0FBUSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQVcsRUFBRSxFQUFFO2dCQUN2RSxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUM5QyxNQUFNLE1BQU0sR0FBc0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUM7Z0JBQzVGLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztvQkFDckQsRUFBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUMsQ0FBQyxDQUFDO29CQUMzQyxJQUFJLENBQUM7Z0JBQ1QsVUFBVSxDQUNOLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVGLENBQUMsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDO0lBRUQsc0JBQXNCO0lBQ3RCLElBQUksR0FBRyxLQUFhLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXBFLGdCQUFnQjtJQUNoQixZQUFZLENBQUMsQ0FBUSxJQUFXLElBQUksQ0FBQyxNQUF5QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFekU7Ozs7Ozs7Ozs7Ozs7T0FhRztJQUNILFdBQVcsQ0FBQyxNQUFjO1FBQ3hCLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN2QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVELHVCQUF1QjtJQUN2QixXQUFXLEtBQVcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUV2Qyw2QkFBNkI7SUFDN0IsT0FBTztRQUNMLElBQUksSUFBSSxDQUFDLG9CQUFvQixFQUFFO1lBQzdCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBTSxDQUFDO1NBQ3BDO0lBQ0gsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Bd0NHO0lBQ0gsYUFBYSxDQUFDLFFBQWUsRUFBRSxtQkFBcUMsRUFBRTtRQUNwRSxNQUFNLEVBQUMsVUFBVSxFQUFXLFdBQVcsRUFBVSxRQUFRLEVBQ2xELG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLGdCQUFnQixFQUFDLEdBQUcsZ0JBQWdCLENBQUM7UUFDdEYsSUFBSSxTQUFTLEVBQUUsSUFBSSxtQkFBbUIsSUFBUyxPQUFPLElBQVMsT0FBTyxDQUFDLElBQUksRUFBRTtZQUMzRSxPQUFPLENBQUMsSUFBSSxDQUFDLHFFQUFxRSxDQUFDLENBQUM7U0FDckY7UUFDRCxNQUFNLENBQUMsR0FBRyxVQUFVLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7UUFDOUMsTUFBTSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDckUsSUFBSSxDQUFDLEdBQWdCLElBQUksQ0FBQztRQUMxQixJQUFJLG1CQUFtQixFQUFFO1lBQ3ZCLFFBQVEsbUJBQW1CLEVBQUU7Z0JBQzNCLEtBQUssT0FBTztvQkFDVixDQUFDLHFCQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxFQUFLLFdBQVcsQ0FBQyxDQUFDO29CQUN6RCxNQUFNO2dCQUNSLEtBQUssVUFBVTtvQkFDYixDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUM7b0JBQ3BDLE1BQU07Z0JBQ1I7b0JBQ0UsQ0FBQyxHQUFHLFdBQVcsSUFBSSxJQUFJLENBQUM7YUFDM0I7U0FDRjthQUFNO1lBQ0wsQ0FBQyxHQUFHLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQztTQUNqRjtRQUNELElBQUksQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNkLENBQUMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDOUI7UUFDRCxPQUFPLGFBQWEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxRQUFRLEVBQUUsQ0FBRyxFQUFFLENBQUcsQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQW1CRztJQUNILGFBQWEsQ0FBQyxHQUFtQixFQUFFLFNBQTJCLEVBQUMsa0JBQWtCLEVBQUUsS0FBSyxFQUFDO1FBRXZGLE1BQU0sT0FBTyxHQUFHLEdBQUcsWUFBWSxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFNUUsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDekUsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQW9CRztJQUNILFFBQVEsQ0FBQyxRQUFlLEVBQUUsU0FBMkIsRUFBQyxrQkFBa0IsRUFBRSxLQUFLLEVBQUM7UUFFOUUsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0IsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFRCwyQ0FBMkM7SUFDM0MsWUFBWSxDQUFDLEdBQVksSUFBWSxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVoRix1Q0FBdUM7SUFDdkMsUUFBUSxDQUFDLEdBQVc7UUFDbEIsSUFBSSxPQUFnQixDQUFDO1FBQ3JCLElBQUk7WUFDRixPQUFPLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDekM7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLE9BQU8sR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDckU7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0lBRUQsMkNBQTJDO0lBQzNDLFFBQVEsQ0FBQyxHQUFtQixFQUFFLEtBQWM7UUFDMUMsSUFBSSxHQUFHLFlBQVksT0FBTyxFQUFFO1lBQzFCLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3REO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQyxPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsTUFBYztRQUNyQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBYyxFQUFFLEdBQVcsRUFBRSxFQUFFO1lBQ2hFLE1BQU0sS0FBSyxHQUFRLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMvQixJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRTtnQkFDekMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQzthQUNyQjtZQUNELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNULENBQUM7SUFFTyxrQkFBa0I7UUFDeEIsSUFBSSxDQUFDLFdBQVc7YUFDWCxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBcUIsRUFBRSxFQUFFO1lBQ3hDLElBQUksR0FBRyxFQUFFO2dCQUNQLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDckMsaUVBQWlFO2dCQUNqRSxtQ0FBbUM7Z0JBQ25DLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUM7YUFDcEM7aUJBQU07Z0JBQ0wsT0FBWSxFQUFFLENBQUUsSUFBSSxDQUFDLENBQUM7YUFDdkI7UUFDSCxDQUFDLENBQUMsQ0FBQzthQUNGLFNBQVMsQ0FBQyxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBRU8sa0JBQWtCLENBQ3RCLE1BQWUsRUFBRSxNQUF5QixFQUFFLEtBQWtDLEVBQzlFLE1BQXdCO1FBQzFCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO1FBQzlDLGlGQUFpRjtRQUNqRiw0RUFBNEU7UUFDNUUsd0JBQXdCO1FBQ3hCLElBQUksY0FBYyxJQUFJLE1BQU0sS0FBSyxZQUFZLElBQUksY0FBYyxDQUFDLE1BQU0sS0FBSyxZQUFZO1lBQ25GLGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEtBQUssTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQzFELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFFLDJCQUEyQjtTQUMzRDtRQUVELHFGQUFxRjtRQUNyRiwyRkFBMkY7UUFDM0YsK0RBQStEO1FBQy9ELElBQUksY0FBYyxJQUFJLE1BQU0sSUFBSSxZQUFZLElBQUksY0FBYyxDQUFDLE1BQU0sS0FBSyxVQUFVO1lBQ2hGLGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEtBQUssTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQzFELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFFLDJCQUEyQjtTQUMzRDtRQUNELHFGQUFxRjtRQUNyRiwyRkFBMkY7UUFDM0YsaUVBQWlFO1FBQ2pFLElBQUksY0FBYyxJQUFJLE1BQU0sSUFBSSxVQUFVLElBQUksY0FBYyxDQUFDLE1BQU0sS0FBSyxZQUFZO1lBQ2hGLGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEtBQUssTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQzFELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFFLDJCQUEyQjtTQUMzRDtRQUVELElBQUksT0FBTyxHQUFRLElBQUksQ0FBQztRQUN4QixJQUFJLE1BQU0sR0FBUSxJQUFJLENBQUM7UUFFdkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQVUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDaEQsT0FBTyxHQUFHLEdBQUcsQ0FBQztZQUNkLE1BQU0sR0FBRyxHQUFHLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQztRQUMvQixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUMsQ0FBQyxDQUFDO1FBRXJGLGdGQUFnRjtRQUNoRiwyQkFBMkI7UUFDM0IsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVPLDBCQUEwQixDQUFDLEVBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQzNDLEtBQUssRUFBbUI7UUFDMUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyRCxNQUFNLGFBQWEsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUM7UUFFM0YsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDO1lBQzlELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNyRCxJQUFJLElBQUksQ0FBQyxpQkFBaUIsS0FBSyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUU7Z0JBQ3BFLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQ3JEO1lBQ0EsSUFBSSxDQUFDLE1BQXlCO2lCQUMxQixJQUFJLENBQUMsSUFBSSxlQUFlLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDMUUsT0FBTyxDQUFDLE9BQU8sRUFBRTtpQkFDWixJQUFJLENBQ0QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQ25CLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7aUJBQ2hGLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFM0IsOEVBQThFO1lBQzlFLDZCQUE2QjtTQUM5QjthQUFNLElBQ0gsYUFBYSxJQUFJLElBQUksQ0FBQyxVQUFVO1lBQ2hDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDN0QsSUFBSSxDQUFDLE1BQXlCO2lCQUMxQixJQUFJLENBQUMsSUFBSSxlQUFlLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDMUUsT0FBTyxDQUFDLE9BQU8sRUFBRTtpQkFDWixJQUFJLENBQ0QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQ25CLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQzdCLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDL0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztTQUU1QjthQUFNO1lBQ0wsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUM7WUFDekIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2Y7SUFDSCxDQUFDO0lBRU8sV0FBVyxDQUNmLEdBQVksRUFBRSxNQUFlLEVBQUUsa0JBQTJCLEVBQUUsVUFBbUIsRUFBRSxFQUFVLEVBQzNGLGVBQXlDO1FBQzNDLElBQUksRUFBRSxLQUFLLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDM0IsSUFBSSxDQUFDLE1BQXlCO2lCQUMxQixJQUFJLENBQUMsSUFBSSxnQkFBZ0IsQ0FDdEIsRUFBRSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQzFCLGlCQUFpQixFQUFFLDhDQUE4QyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9GLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUMvQjtRQUVELE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxjQUFjLEVBQUUsYUFBYSxFQUFFLEVBQUU7WUFDbkQsMkRBQTJEO1lBQzNELG1EQUFtRDtZQUNuRCxJQUFJLGVBQTJDLENBQUM7WUFDaEQsSUFBSSxDQUFDLGVBQWUsRUFBRTtnQkFDcEIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7Z0JBQzlDLE1BQU0saUJBQWlCLEdBQ25CLGNBQWMsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBRTVGLGVBQWUsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsVUFBbUIsRUFBRSxFQUFFO29CQUN4RSxPQUFPLFNBQVMsQ0FDTCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsRUFDOUUsSUFBSSxDQUFDLHlCQUF5QixFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQzt5QkFDbEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQWEsRUFBRSxFQUFFO3dCQUN6QixJQUFJLENBQUMsTUFBeUI7NkJBQzFCLElBQUksQ0FBQyxJQUFJLGdCQUFnQixDQUN0QixFQUFFLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7d0JBRTlFLE9BQU8sRUFBQyxVQUFVLEVBQUUsUUFBUSxFQUFDLENBQUM7b0JBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNMO2lCQUFNO2dCQUNMLGVBQWUsR0FBRyxFQUFFLENBQUUsRUFBQyxVQUFVLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUMsQ0FBQyxDQUFDO2FBQ3JFO1lBRUQsTUFBTSx3QkFBd0IsR0FDMUIsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQThCLEVBQUU7Z0JBQzlELElBQUksT0FBTyxDQUFDLEtBQUssU0FBUztvQkFBRSxPQUFPLEVBQUUsQ0FBRSxDQUFDLENBQUMsQ0FBQztnQkFDMUMsT0FBTyxJQUFJLENBQUMsS0FBSztxQkFDWixtQkFBbUIsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFO29CQUMvQixZQUFZLEVBQUUsRUFBRTtvQkFDaEIsY0FBYyxFQUFFLEdBQUc7b0JBQ25CLFVBQVUsRUFBRSxNQUFNLEVBQUUsa0JBQWtCLEVBQUUsVUFBVTtpQkFDbkQsQ0FBQztxQkFDRCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVSLCtDQUErQztZQUMvQyxJQUFJLGFBQTRCLENBQUM7WUFFakMsTUFBTSxtQkFBbUIsR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFrQixFQUFFO2dCQUNsRixJQUFJLE9BQU8sQ0FBQyxLQUFLLFNBQVM7b0JBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ3JDLE1BQU0sRUFBQyxVQUFVLEVBQUUsUUFBUSxFQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNqQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztnQkFDOUMsYUFBYSxHQUFHLElBQUksYUFBYSxDQUM3QixRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsY0FBYyxFQUNuRCxDQUFDLEdBQVUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUM1QyxhQUFhLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDNUMsT0FBTyxFQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUMsQ0FBQztZQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRUosTUFBTSx5QkFBeUIsR0FDM0IsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBOEIsRUFBRTtnQkFDbEUsSUFBSSxPQUFPLENBQUMsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxFQUFFO29CQUFFLE9BQU8sRUFBRSxDQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUMxRSxNQUFNLEVBQUMsVUFBVSxFQUFFLFFBQVEsRUFBQyxHQUFHLENBQUMsQ0FBQztnQkFFakMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLGdCQUFnQixDQUNsQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBRTFFLE9BQU8sYUFBYSxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxjQUF1QixFQUFFLEVBQUU7b0JBQ3RFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxjQUFjLENBQ2hDLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEVBQUUsUUFBUSxFQUNuRSxjQUFjLENBQUMsQ0FBQyxDQUFDO29CQUNyQixPQUFPLEVBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUMsQ0FBQztnQkFDdEYsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNOLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFUixNQUFNLHlCQUF5QixHQUMzQix5QkFBeUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUE4QixFQUFFO2dCQUN4RSxJQUFJLE9BQU8sQ0FBQyxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLEVBQUU7b0JBQUUsT0FBTyxFQUFFLENBQUUsS0FBSyxDQUFDLENBQUM7Z0JBRTFFLElBQUksQ0FBQyxDQUFDLGNBQWMsSUFBSSxhQUFhLENBQUMsWUFBWSxFQUFFLEVBQUU7b0JBQ3BELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxZQUFZLENBQzlCLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO29CQUM5RSxPQUFPLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7d0JBQzdFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxVQUFVLENBQzVCLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO3dCQUM5RSxPQUFPLENBQUMsQ0FBQztvQkFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUNMO3FCQUFNO29CQUNMLE9BQU8sRUFBRSxDQUFFLENBQUMsQ0FBQyxDQUFDO2lCQUNmO1lBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVSLE1BQU0sa0JBQWtCLEdBQ3BCLHlCQUF5QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQThCLEVBQUU7Z0JBQ3hFLElBQUksT0FBTyxDQUFDLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssRUFBRTtvQkFBRSxPQUFPLEVBQUUsQ0FBRSxLQUFLLENBQUMsQ0FBQztnQkFDMUUsT0FBTyxJQUFJLENBQUMsS0FBSztxQkFDWixrQkFBa0IsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFO29CQUM5QixZQUFZLEVBQUUsRUFBRTtvQkFDaEIsY0FBYyxFQUFFLEdBQUc7b0JBQ25CLFVBQVUsRUFBRSxNQUFNLEVBQUUsa0JBQWtCLEVBQUUsVUFBVTtpQkFDbkQsQ0FBQztxQkFDRCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUdSLHNCQUFzQjtZQUN0QixtRUFBbUU7WUFDbkUsTUFBTSxZQUFZLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNyRCxJQUFJLE9BQU8sQ0FBQyxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLEVBQUU7b0JBQUUsT0FBTyxLQUFLLENBQUM7Z0JBQ3JFLE1BQU0sRUFBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBQyxHQUFHLENBQUMsQ0FBQztnQkFDakQsSUFBSSxjQUFjLEVBQUU7b0JBQ2xCLE1BQU0sS0FBSyxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUNyRixPQUFPLEVBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUMsQ0FBQztpQkFDNUM7cUJBQU07b0JBQ0wsT0FBTyxFQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBQyxDQUFDO2lCQUNsRDtZQUNILENBQUMsQ0FBQyxDQUFDLENBQUM7WUFHSixJQUFJLENBQUMsY0FBYyxDQUNmLFlBQVksRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsa0JBQWtCLEVBQ3hGLFVBQVUsRUFBRSxjQUFjLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDakQsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ssY0FBYyxDQUNsQixLQUMyRixFQUMzRixXQUF3QixFQUFFLFNBQWtCLEVBQUUsRUFBVSxFQUFFLEdBQVksRUFBRSxNQUFlLEVBQ3ZGLGtCQUEyQixFQUFFLFVBQW1CLEVBQUUsY0FBbUIsRUFBRSxhQUFrQjtRQUMzRiwrQkFBK0I7UUFDL0Isa0NBQWtDO1FBQ2xDLElBQUksc0JBQStCLENBQUM7UUFFcEMsS0FBSzthQUNBLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2IsSUFBSSxPQUFPLENBQUMsS0FBSyxTQUFTLElBQUksQ0FBQyxDQUFDLENBQUMsY0FBYyxJQUFJLEVBQUUsS0FBSyxJQUFJLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRTtnQkFDdkYsc0JBQXNCLEdBQUcsS0FBSyxDQUFDO2dCQUMvQixPQUFPO2FBQ1I7WUFDRCxNQUFNLEVBQUMsVUFBVSxFQUFFLEtBQUssRUFBQyxHQUFHLENBQUMsQ0FBQztZQUM5QixJQUFJLENBQUMsY0FBYyxHQUFHLFVBQVUsQ0FBQztZQUNqQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUU3RSxJQUFrQyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7WUFFeEQsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssVUFBVSxJQUFJLENBQUMsa0JBQWtCLEVBQUU7Z0JBQ2hFLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDckQ7WUFFRCxJQUFJLGNBQWMsQ0FDZCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQVUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDbkYsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUVqQyxzQkFBc0IsR0FBRyxJQUFJLENBQUM7UUFDaEMsQ0FBQyxDQUFDO2FBQ0QsSUFBSSxDQUNELEdBQUcsRUFBRTtZQUNILElBQUksc0JBQXNCLEVBQUU7Z0JBQzFCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO2dCQUN0QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsRUFBRSxDQUFDO2dCQUMxQixJQUFJLENBQUMsTUFBeUI7cUJBQzFCLElBQUksQ0FBQyxJQUFJLGFBQWEsQ0FDbkIsRUFBRSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM3RSxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdEI7aUJBQU07Z0JBQ0wsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxNQUF5QjtxQkFDMUIsSUFBSSxDQUFDLElBQUksZ0JBQWdCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDaEUsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3ZCO1FBQ0gsQ0FBQyxFQUNELENBQUMsQ0FBTSxFQUFFLEVBQUU7WUFDVCxJQUFJLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNqQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztnQkFDdEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3JELElBQUksQ0FBQyxNQUF5QjtxQkFDMUIsSUFBSSxDQUFDLElBQUksZ0JBQWdCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBRXZFLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUN2QjtpQkFBTTtnQkFDTCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDckQsSUFBSSxDQUFDLE1BQXlCO3FCQUMxQixJQUFJLENBQUMsSUFBSSxlQUFlLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUQsSUFBSTtvQkFDRixjQUFjLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUN0QztnQkFBQyxPQUFPLEVBQUUsRUFBRTtvQkFDWCxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUM7aUJBQ25CO2FBQ0Y7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNiLENBQUM7SUFFTyxhQUFhLENBQUMsR0FBWSxFQUFFLFVBQW1CLEVBQUUsRUFBVTtRQUNqRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMvQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLElBQUksVUFBVSxFQUFFO1lBQzFELElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBQyxZQUFZLEVBQUUsRUFBRSxFQUFDLENBQUMsQ0FBQztTQUMxRDthQUFNO1lBQ0wsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFDLFlBQVksRUFBRSxFQUFFLEVBQUMsQ0FBQyxDQUFDO1NBQ2hEO0lBQ0gsQ0FBQztJQUVPLGdCQUFnQixDQUFDLFdBQXdCLEVBQUUsU0FBa0IsRUFBRSxNQUFlO1FBQ25GLElBQWtDLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUM5RCxJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQztRQUNoQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM5RSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRU8sd0JBQXdCO1FBQzlCLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUN0QixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBQyxDQUFDLENBQUM7SUFDaEcsQ0FBQztDQUNGO0FBRUQ7SUFDRSxZQUNZLGtCQUFzQyxFQUFVLFdBQXdCLEVBQ3hFLFNBQXNCLEVBQVUsWUFBa0M7UUFEbEUsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUFVLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ3hFLGNBQVMsR0FBVCxTQUFTLENBQWE7UUFBVSxpQkFBWSxHQUFaLFlBQVksQ0FBc0I7SUFBRyxDQUFDO0lBRWxGLFFBQVEsQ0FBQyxjQUFzQztRQUM3QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQztRQUMxQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBRTlELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2pFLHFCQUFxQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUVELHdFQUF3RTtJQUNoRSxxQkFBcUIsQ0FDekIsVUFBb0MsRUFBRSxRQUF1QyxFQUM3RSxRQUFnQztRQUNsQyxNQUFNLFFBQVEsR0FBcUQsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFL0Ysa0ZBQWtGO1FBQ2xGLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQ3hDLE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1lBQ2pELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3hFLE9BQU8sUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ25DLENBQUMsQ0FBQyxDQUFDO1FBRUgsa0RBQWtEO1FBQ2xELE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUEyQixFQUFFLFNBQWlCLEVBQUUsRUFBRTtZQUNuRSxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2xELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGdCQUFnQixDQUNwQixVQUFvQyxFQUFFLFFBQWtDLEVBQ3hFLGFBQXFDO1FBQ3ZDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUM7UUFDaEMsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFFOUMsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO1lBQ25CLHlFQUF5RTtZQUN6RSxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUU7Z0JBQ3BCLDhEQUE4RDtnQkFDOUQsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3hELElBQUksT0FBTyxFQUFFO29CQUNYLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDcEU7YUFDRjtpQkFBTTtnQkFDTCw2RUFBNkU7Z0JBQzdFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFDO2FBQ2pFO1NBQ0Y7YUFBTTtZQUNMLElBQUksSUFBSSxFQUFFO2dCQUNSLHlEQUF5RDtnQkFDekQsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQzthQUM3RDtTQUNGO0lBQ0gsQ0FBQztJQUVPLDZCQUE2QixDQUNqQyxLQUErQixFQUFFLGNBQXNDO1FBQ3pFLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzlELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUM7U0FDeEQ7YUFBTTtZQUNMLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUM7U0FDdEQ7SUFDSCxDQUFDO0lBRU8sMEJBQTBCLENBQzlCLEtBQStCLEVBQUUsY0FBc0M7UUFDekUsTUFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlELElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDN0IsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM3QyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDeEQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFDLFlBQVksRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFDLENBQUMsQ0FBQztTQUN0RjtJQUNILENBQUM7SUFFTyx3QkFBd0IsQ0FDNUIsS0FBK0IsRUFBRSxjQUFzQztRQUN6RSxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFOUQsSUFBSSxPQUFPLEVBQUU7WUFDWCxNQUFNLFFBQVEsR0FBZ0MsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkUsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQztZQUUzRSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQVMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBRTFGLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtnQkFDbEIsd0JBQXdCO2dCQUN4QixPQUFPLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUM1QixzRUFBc0U7Z0JBQ3RFLE9BQU8sQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsQ0FBQzthQUN4QztTQUNGO0lBQ0gsQ0FBQztJQUVPLG1CQUFtQixDQUN2QixVQUFvQyxFQUFFLFFBQXVDLEVBQzdFLFFBQWdDO1FBQ2xDLE1BQU0sUUFBUSxHQUE0QixpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RSxVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUM5QixJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUMzRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN6RCxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7WUFDOUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztTQUN0RTtJQUNILENBQUM7SUFFTyxjQUFjLENBQ2xCLFVBQW9DLEVBQUUsUUFBa0MsRUFDeEUsY0FBc0M7UUFDeEMsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQztRQUNoQyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUU5QyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUU5QixtQkFBbUI7UUFDbkIsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO1lBQ25CLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRTtnQkFDcEIsOERBQThEO2dCQUM5RCxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNqRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDbEU7aUJBQU07Z0JBQ0wsNkVBQTZFO2dCQUM3RSxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQzthQUNoRTtTQUNGO2FBQU07WUFDTCxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUU7Z0JBQ3BCLHlGQUF5RjtnQkFDekYsTUFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFFakUsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRTtvQkFDekQsTUFBTSxNQUFNLEdBQ3NCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBRSxDQUFDO29CQUNyRixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ3JELE9BQU8sQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUNyRCxPQUFPLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUM7b0JBQ3hDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7b0JBQ25DLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTt3QkFDbEIsa0VBQWtFO3dCQUNsRSx3RUFBd0U7d0JBQ3hFLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztxQkFDaEU7b0JBQ0QsdUNBQXVDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUN2RDtxQkFBTTtvQkFDTCxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ25ELE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7b0JBRWxGLE9BQU8sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO29CQUN2QixPQUFPLENBQUMsUUFBUSxHQUFHLGtCQUFrQixDQUFDO29CQUN0QyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUU7d0JBQ2xCLDREQUE0RDt3QkFDNUQsd0VBQXdFO3dCQUN4RSxPQUFPLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztxQkFDekQ7b0JBRUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUM5RDthQUNGO2lCQUFNO2dCQUNMLDZFQUE2RTtnQkFDN0UsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7YUFDNUQ7U0FDRjtJQUNILENBQUM7Q0FDRjtBQUVELGlEQUFpRCxJQUE4QjtJQUM3RSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsdUNBQXVDLENBQUMsQ0FBQztBQUNqRSxDQUFDO0FBRUQsNEJBQTRCLFFBQWdDO0lBQzFELEtBQUssSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUU7UUFDN0MsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQztRQUM1QixJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsYUFBYTtZQUFFLE9BQU8sS0FBSyxDQUFDLGFBQWEsQ0FBQztRQUM3RCxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsU0FBUztZQUFFLE9BQU8sSUFBSSxDQUFDO0tBQzNDO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsMEJBQTBCLFFBQWtCO0lBQzFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ3hDLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDZixNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixHQUFHLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQzdFO0tBQ0Y7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtDb21waWxlciwgSW5qZWN0b3IsIE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgTmdNb2R1bGVSZWYsIFR5cGUsIGlzRGV2TW9kZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0JlaGF2aW9yU3ViamVjdCwgT2JzZXJ2YWJsZSwgU3ViamVjdCwgU3Vic2NyaXB0aW9uLCBvZiB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjb25jYXRNYXAsIG1hcCwgbWVyZ2VNYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHthcHBseVJlZGlyZWN0c30gZnJvbSAnLi9hcHBseV9yZWRpcmVjdHMnO1xuaW1wb3J0IHtMb2FkZWRSb3V0ZXJDb25maWcsIFF1ZXJ5UGFyYW1zSGFuZGxpbmcsIFJvdXRlLCBSb3V0ZXMsIHN0YW5kYXJkaXplQ29uZmlnLCB2YWxpZGF0ZUNvbmZpZ30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtjcmVhdGVSb3V0ZXJTdGF0ZX0gZnJvbSAnLi9jcmVhdGVfcm91dGVyX3N0YXRlJztcbmltcG9ydCB7Y3JlYXRlVXJsVHJlZX0gZnJvbSAnLi9jcmVhdGVfdXJsX3RyZWUnO1xuaW1wb3J0IHtBY3RpdmF0aW9uRW5kLCBDaGlsZEFjdGl2YXRpb25FbmQsIEV2ZW50LCBHdWFyZHNDaGVja0VuZCwgR3VhcmRzQ2hlY2tTdGFydCwgTmF2aWdhdGlvbkNhbmNlbCwgTmF2aWdhdGlvbkVuZCwgTmF2aWdhdGlvbkVycm9yLCBOYXZpZ2F0aW9uU3RhcnQsIE5hdmlnYXRpb25UcmlnZ2VyLCBSZXNvbHZlRW5kLCBSZXNvbHZlU3RhcnQsIFJvdXRlQ29uZmlnTG9hZEVuZCwgUm91dGVDb25maWdMb2FkU3RhcnQsIFJvdXRlc1JlY29nbml6ZWR9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7UHJlQWN0aXZhdGlvbn0gZnJvbSAnLi9wcmVfYWN0aXZhdGlvbic7XG5pbXBvcnQge3JlY29nbml6ZX0gZnJvbSAnLi9yZWNvZ25pemUnO1xuaW1wb3J0IHtEZWZhdWx0Um91dGVSZXVzZVN0cmF0ZWd5LCBEZXRhY2hlZFJvdXRlSGFuZGxlSW50ZXJuYWwsIFJvdXRlUmV1c2VTdHJhdGVneX0gZnJvbSAnLi9yb3V0ZV9yZXVzZV9zdHJhdGVneSc7XG5pbXBvcnQge1JvdXRlckNvbmZpZ0xvYWRlcn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge0NoaWxkcmVuT3V0bGV0Q29udGV4dHN9IGZyb20gJy4vcm91dGVyX291dGxldF9jb250ZXh0JztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGUsIEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIFJvdXRlclN0YXRlLCBSb3V0ZXJTdGF0ZVNuYXBzaG90LCBhZHZhbmNlQWN0aXZhdGVkUm91dGUsIGNyZWF0ZUVtcHR5U3RhdGUsIGluaGVyaXRlZFBhcmFtc0RhdGFSZXNvbHZlfSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BhcmFtcywgaXNOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3J9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7RGVmYXVsdFVybEhhbmRsaW5nU3RyYXRlZ3ksIFVybEhhbmRsaW5nU3RyYXRlZ3l9IGZyb20gJy4vdXJsX2hhbmRsaW5nX3N0cmF0ZWd5JztcbmltcG9ydCB7VXJsU2VyaWFsaXplciwgVXJsVHJlZSwgY29udGFpbnNUcmVlLCBjcmVhdGVFbXB0eVVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtmb3JFYWNofSBmcm9tICcuL3V0aWxzL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtUcmVlTm9kZSwgbm9kZUNoaWxkcmVuQXNNYXB9IGZyb20gJy4vdXRpbHMvdHJlZSc7XG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIHRoZSBleHRyYSBvcHRpb25zIHVzZWQgZHVyaW5nIG5hdmlnYXRpb24uXG4gKlxuICpcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOYXZpZ2F0aW9uRXh0cmFzIHtcbiAgLyoqXG4gICAqIEVuYWJsZXMgcmVsYXRpdmUgbmF2aWdhdGlvbiBmcm9tIHRoZSBjdXJyZW50IEFjdGl2YXRlZFJvdXRlLlxuICAgKlxuICAgKiBDb25maWd1cmF0aW9uOlxuICAgKlxuICAgKiBgYGBcbiAgICogW3tcbiAgKiAgIHBhdGg6ICdwYXJlbnQnLFxuICAqICAgY29tcG9uZW50OiBQYXJlbnRDb21wb25lbnQsXG4gICogICBjaGlsZHJlbjogW3tcbiAgKiAgICAgcGF0aDogJ2xpc3QnLFxuICAqICAgICBjb21wb25lbnQ6IExpc3RDb21wb25lbnRcbiAgKiAgIH0se1xuICAqICAgICBwYXRoOiAnY2hpbGQnLFxuICAqICAgICBjb21wb25lbnQ6IENoaWxkQ29tcG9uZW50XG4gICogICB9XVxuICAqIH1dXG4gICAqIGBgYFxuICAgKlxuICAgKiBOYXZpZ2F0ZSB0byBsaXN0IHJvdXRlIGZyb20gY2hpbGQgcm91dGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiAgQENvbXBvbmVudCh7Li4ufSlcbiAgICogIGNsYXNzIENoaWxkQ29tcG9uZW50IHtcbiAgKiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJvdXRlcjogUm91dGVyLCBwcml2YXRlIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSkge31cbiAgKlxuICAqICAgIGdvKCkge1xuICAqICAgICAgdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycuLi9saXN0J10sIHsgcmVsYXRpdmVUbzogdGhpcy5yb3V0ZSB9KTtcbiAgKiAgICB9XG4gICogIH1cbiAgICogYGBgXG4gICAqL1xuICByZWxhdGl2ZVRvPzogQWN0aXZhdGVkUm91dGV8bnVsbDtcblxuICAvKipcbiAgICogU2V0cyBxdWVyeSBwYXJhbWV0ZXJzIHRvIHRoZSBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvcmVzdWx0cz9wYWdlPTFcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvcmVzdWx0cyddLCB7IHF1ZXJ5UGFyYW1zOiB7IHBhZ2U6IDEgfSB9KTtcbiAgICogYGBgXG4gICAqL1xuICBxdWVyeVBhcmFtcz86IFBhcmFtc3xudWxsO1xuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBoYXNoIGZyYWdtZW50IGZvciB0aGUgVVJMLlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgdG8gL3Jlc3VsdHMjdG9wXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3Jlc3VsdHMnXSwgeyBmcmFnbWVudDogJ3RvcCcgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnQ/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFByZXNlcnZlcyB0aGUgcXVlcnkgcGFyYW1ldGVycyBmb3IgdGhlIG5leHQgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogZGVwcmVjYXRlZCwgdXNlIGBxdWVyeVBhcmFtc0hhbmRsaW5nYCBpbnN0ZWFkXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBQcmVzZXJ2ZSBxdWVyeSBwYXJhbXMgZnJvbSAvcmVzdWx0cz9wYWdlPTEgdG8gL3ZpZXc/cGFnZT0xXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgc2luY2UgdjRcbiAgICovXG4gIHByZXNlcnZlUXVlcnlQYXJhbXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiAgY29uZmlnIHN0cmF0ZWd5IHRvIGhhbmRsZSB0aGUgcXVlcnkgcGFyYW1ldGVycyBmb3IgdGhlIG5leHQgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIGZyb20gL3Jlc3VsdHM/cGFnZT0xIHRvIC92aWV3P3BhZ2U9MSZwYWdlPTJcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHF1ZXJ5UGFyYW1zOiB7IHBhZ2U6IDIgfSwgIHF1ZXJ5UGFyYW1zSGFuZGxpbmc6IFwibWVyZ2VcIiB9KTtcbiAgICogYGBgXG4gICAqL1xuICBxdWVyeVBhcmFtc0hhbmRsaW5nPzogUXVlcnlQYXJhbXNIYW5kbGluZ3xudWxsO1xuICAvKipcbiAgICogUHJlc2VydmVzIHRoZSBmcmFnbWVudCBmb3IgdGhlIG5leHQgbmF2aWdhdGlvblxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gUHJlc2VydmUgZnJhZ21lbnQgZnJvbSAvcmVzdWx0cyN0b3AgdG8gL3ZpZXcjdG9wXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBwcmVzZXJ2ZUZyYWdtZW50OiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHByZXNlcnZlRnJhZ21lbnQ/OiBib29sZWFuO1xuICAvKipcbiAgICogTmF2aWdhdGVzIHdpdGhvdXQgcHVzaGluZyBhIG5ldyBzdGF0ZSBpbnRvIGhpc3RvcnkuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSBzaWxlbnRseSB0byAvdmlld1xuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHNraXBMb2NhdGlvbkNoYW5nZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBOYXZpZ2F0ZXMgd2hpbGUgcmVwbGFjaW5nIHRoZSBjdXJyZW50IHN0YXRlIGluIGhpc3RvcnkuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvdmlld1xuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgcmVwbGFjZVVybDogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqL1xuICByZXBsYWNlVXJsPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBFcnJvciBoYW5kbGVyIHRoYXQgaXMgaW52b2tlZCB3aGVuIGEgbmF2aWdhdGlvbiBlcnJvcnMuXG4gKlxuICogSWYgdGhlIGhhbmRsZXIgcmV0dXJucyBhIHZhbHVlLCB0aGUgbmF2aWdhdGlvbiBwcm9taXNlIHdpbGwgYmUgcmVzb2x2ZWQgd2l0aCB0aGlzIHZhbHVlLlxuICogSWYgdGhlIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbiwgdGhlIG5hdmlnYXRpb24gcHJvbWlzZSB3aWxsIGJlIHJlamVjdGVkIHdpdGhcbiAqIHRoZSBleGNlcHRpb24uXG4gKlxuICpcbiAqL1xuZXhwb3J0IHR5cGUgRXJyb3JIYW5kbGVyID0gKGVycm9yOiBhbnkpID0+IGFueTtcblxuZnVuY3Rpb24gZGVmYXVsdEVycm9ySGFuZGxlcihlcnJvcjogYW55KTogYW55IHtcbiAgdGhyb3cgZXJyb3I7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRNYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIoXG4gICAgZXJyb3I6IFVSSUVycm9yLCB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLCB1cmw6IHN0cmluZyk6IFVybFRyZWUge1xuICByZXR1cm4gdXJsU2VyaWFsaXplci5wYXJzZSgnLycpO1xufVxuXG50eXBlIE5hdlN0cmVhbVZhbHVlID1cbiAgICBib29sZWFuIHwge2FwcGxpZWRVcmw6IFVybFRyZWUsIHNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90LCBzaG91bGRBY3RpdmF0ZT86IGJvb2xlYW59O1xuXG50eXBlIE5hdmlnYXRpb25QYXJhbXMgPSB7XG4gIGlkOiBudW1iZXIsXG4gIHJhd1VybDogVXJsVHJlZSxcbiAgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzLFxuICByZXNvbHZlOiBhbnksXG4gIHJlamVjdDogYW55LFxuICBwcm9taXNlOiBQcm9taXNlPGJvb2xlYW4+LFxuICBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLFxuICBzdGF0ZToge25hdmlnYXRpb25JZDogbnVtYmVyfSB8IG51bGxcbn07XG5cbi8qKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCB0eXBlIFJvdXRlckhvb2sgPSAoc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QsIHJ1bkV4dHJhczoge1xuICBhcHBsaWVkVXJsVHJlZTogVXJsVHJlZSxcbiAgcmF3VXJsVHJlZTogVXJsVHJlZSxcbiAgc2tpcExvY2F0aW9uQ2hhbmdlOiBib29sZWFuLFxuICByZXBsYWNlVXJsOiBib29sZWFuLFxuICBuYXZpZ2F0aW9uSWQ6IG51bWJlclxufSkgPT4gT2JzZXJ2YWJsZTx2b2lkPjtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gZGVmYXVsdFJvdXRlckhvb2soc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QsIHJ1bkV4dHJhczoge1xuICBhcHBsaWVkVXJsVHJlZTogVXJsVHJlZSxcbiAgcmF3VXJsVHJlZTogVXJsVHJlZSxcbiAgc2tpcExvY2F0aW9uQ2hhbmdlOiBib29sZWFuLFxuICByZXBsYWNlVXJsOiBib29sZWFuLFxuICBuYXZpZ2F0aW9uSWQ6IG51bWJlclxufSk6IE9ic2VydmFibGU8dm9pZD4ge1xuICByZXR1cm4gb2YgKG51bGwpIGFzIGFueTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBQcm92aWRlcyB0aGUgbmF2aWdhdGlvbiBhbmQgdXJsIG1hbmlwdWxhdGlvbiBjYXBhYmlsaXRpZXMuXG4gKlxuICogU2VlIGBSb3V0ZXNgIGZvciBtb3JlIGRldGFpbHMgYW5kIGV4YW1wbGVzLlxuICpcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKlxuICovXG5leHBvcnQgY2xhc3MgUm91dGVyIHtcbiAgcHJpdmF0ZSBjdXJyZW50VXJsVHJlZTogVXJsVHJlZTtcbiAgcHJpdmF0ZSByYXdVcmxUcmVlOiBVcmxUcmVlO1xuICBwcml2YXRlIG5hdmlnYXRpb25zID0gbmV3IEJlaGF2aW9yU3ViamVjdDxOYXZpZ2F0aW9uUGFyYW1zPihudWxsICEpO1xuXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIGxvY2F0aW9uU3Vic2NyaXB0aW9uICE6IFN1YnNjcmlwdGlvbjtcbiAgcHJpdmF0ZSBuYXZpZ2F0aW9uSWQ6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgY29uZmlnTG9hZGVyOiBSb3V0ZXJDb25maWdMb2FkZXI7XG4gIHByaXZhdGUgbmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT47XG5cbiAgcHVibGljIHJlYWRvbmx5IGV2ZW50czogT2JzZXJ2YWJsZTxFdmVudD4gPSBuZXcgU3ViamVjdDxFdmVudD4oKTtcbiAgcHVibGljIHJlYWRvbmx5IHJvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZTtcblxuICAvKipcbiAgICogRXJyb3IgaGFuZGxlciB0aGF0IGlzIGludm9rZWQgd2hlbiBhIG5hdmlnYXRpb24gZXJyb3JzLlxuICAgKlxuICAgKiBTZWUgYEVycm9ySGFuZGxlcmAgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gICAqL1xuICBlcnJvckhhbmRsZXI6IEVycm9ySGFuZGxlciA9IGRlZmF1bHRFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIE1hbGZvcm1lZCB1cmkgZXJyb3IgaGFuZGxlciBpcyBpbnZva2VkIHdoZW4gYFJvdXRlci5wYXJzZVVybCh1cmwpYCB0aHJvd3MgYW5cbiAgICogZXJyb3IgZHVlIHRvIGNvbnRhaW5pbmcgYW4gaW52YWxpZCBjaGFyYWN0ZXIuIFRoZSBtb3N0IGNvbW1vbiBjYXNlIHdvdWxkIGJlIGEgYCVgIHNpZ25cbiAgICogdGhhdCdzIG5vdCBlbmNvZGVkIGFuZCBpcyBub3QgcGFydCBvZiBhIHBlcmNlbnQgZW5jb2RlZCBzZXF1ZW5jZS5cbiAgICovXG4gIG1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcjpcbiAgICAgIChlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgICAgdXJsOiBzdHJpbmcpID0+IFVybFRyZWUgPSBkZWZhdWx0TWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyO1xuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgaWYgYXQgbGVhc3Qgb25lIG5hdmlnYXRpb24gaGFwcGVuZWQuXG4gICAqL1xuICBuYXZpZ2F0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSBsYXN0U3VjY2Vzc2Z1bElkOiBudW1iZXIgPSAtMTtcblxuICAvKipcbiAgICogVXNlZCBieSBSb3V0ZXJNb2R1bGUuIFRoaXMgYWxsb3dzIHVzIHRvXG4gICAqIHBhdXNlIHRoZSBuYXZpZ2F0aW9uIGVpdGhlciBiZWZvcmUgcHJlYWN0aXZhdGlvbiBvciBhZnRlciBpdC5cbiAgICogQGludGVybmFsXG4gICAqL1xuICBob29rczoge2JlZm9yZVByZWFjdGl2YXRpb246IFJvdXRlckhvb2ssIGFmdGVyUHJlYWN0aXZhdGlvbjogUm91dGVySG9va30gPSB7XG4gICAgYmVmb3JlUHJlYWN0aXZhdGlvbjogZGVmYXVsdFJvdXRlckhvb2ssXG4gICAgYWZ0ZXJQcmVhY3RpdmF0aW9uOiBkZWZhdWx0Um91dGVySG9va1xuICB9O1xuXG4gIC8qKlxuICAgKiBFeHRyYWN0cyBhbmQgbWVyZ2VzIFVSTHMuIFVzZWQgZm9yIEFuZ3VsYXJKUyB0byBBbmd1bGFyIG1pZ3JhdGlvbnMuXG4gICAqL1xuICB1cmxIYW5kbGluZ1N0cmF0ZWd5OiBVcmxIYW5kbGluZ1N0cmF0ZWd5ID0gbmV3IERlZmF1bHRVcmxIYW5kbGluZ1N0cmF0ZWd5KCk7XG5cbiAgcm91dGVSZXVzZVN0cmF0ZWd5OiBSb3V0ZVJldXNlU3RyYXRlZ3kgPSBuZXcgRGVmYXVsdFJvdXRlUmV1c2VTdHJhdGVneSgpO1xuXG4gIC8qKlxuICAgKiBEZWZpbmUgd2hhdCB0aGUgcm91dGVyIHNob3VsZCBkbyBpZiBpdCByZWNlaXZlcyBhIG5hdmlnYXRpb24gcmVxdWVzdCB0byB0aGUgY3VycmVudCBVUkwuXG4gICAqIEJ5IGRlZmF1bHQsIHRoZSByb3V0ZXIgd2lsbCBpZ25vcmUgdGhpcyBuYXZpZ2F0aW9uLiBIb3dldmVyLCB0aGlzIHByZXZlbnRzIGZlYXR1cmVzIHN1Y2hcbiAgICogYXMgYSBcInJlZnJlc2hcIiBidXR0b24uIFVzZSB0aGlzIG9wdGlvbiB0byBjb25maWd1cmUgdGhlIGJlaGF2aW9yIHdoZW4gbmF2aWdhdGluZyB0byB0aGVcbiAgICogY3VycmVudCBVUkwuIERlZmF1bHQgaXMgJ2lnbm9yZScuXG4gICAqL1xuICBvblNhbWVVcmxOYXZpZ2F0aW9uOiAncmVsb2FkJ3wnaWdub3JlJyA9ICdpZ25vcmUnO1xuXG4gIC8qKlxuICAgKiBEZWZpbmVzIGhvdyB0aGUgcm91dGVyIG1lcmdlcyBwYXJhbXMsIGRhdGEgYW5kIHJlc29sdmVkIGRhdGEgZnJvbSBwYXJlbnQgdG8gY2hpbGRcbiAgICogcm91dGVzLiBBdmFpbGFibGUgb3B0aW9ucyBhcmU6XG4gICAqXG4gICAqIC0gYCdlbXB0eU9ubHknYCwgdGhlIGRlZmF1bHQsIG9ubHkgaW5oZXJpdHMgcGFyZW50IHBhcmFtcyBmb3IgcGF0aC1sZXNzIG9yIGNvbXBvbmVudC1sZXNzXG4gICAqICAgcm91dGVzLlxuICAgKiAtIGAnYWx3YXlzJ2AsIGVuYWJsZXMgdW5jb25kaXRpb25hbCBpbmhlcml0YW5jZSBvZiBwYXJlbnQgcGFyYW1zLlxuICAgKi9cbiAgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogJ2VtcHR5T25seSd8J2Fsd2F5cycgPSAnZW1wdHlPbmx5JztcblxuICAvKipcbiAgICogRGVmaW5lcyB3aGVuIHRoZSByb3V0ZXIgdXBkYXRlcyB0aGUgYnJvd3NlciBVUkwuIFRoZSBkZWZhdWx0IGJlaGF2aW9yIGlzIHRvIHVwZGF0ZSBhZnRlclxuICAgKiBzdWNjZXNzZnVsIG5hdmlnYXRpb24uIEhvd2V2ZXIsIHNvbWUgYXBwbGljYXRpb25zIG1heSBwcmVmZXIgYSBtb2RlIHdoZXJlIHRoZSBVUkwgZ2V0c1xuICAgKiB1cGRhdGVkIGF0IHRoZSBiZWdpbm5pbmcgb2YgbmF2aWdhdGlvbi4gVGhlIG1vc3QgY29tbW9uIHVzZSBjYXNlIHdvdWxkIGJlIHVwZGF0aW5nIHRoZVxuICAgKiBVUkwgZWFybHkgc28gaWYgbmF2aWdhdGlvbiBmYWlscywgeW91IGNhbiBzaG93IGFuIGVycm9yIG1lc3NhZ2Ugd2l0aCB0aGUgVVJMIHRoYXQgZmFpbGVkLlxuICAgKiBBdmFpbGFibGUgb3B0aW9ucyBhcmU6XG4gICAqXG4gICAqIC0gYCdkZWZlcnJlZCdgLCB0aGUgZGVmYXVsdCwgdXBkYXRlcyB0aGUgYnJvd3NlciBVUkwgYWZ0ZXIgbmF2aWdhdGlvbiBoYXMgZmluaXNoZWQuXG4gICAqIC0gYCdlYWdlcidgLCB1cGRhdGVzIGJyb3dzZXIgVVJMIGF0IHRoZSBiZWdpbm5pbmcgb2YgbmF2aWdhdGlvbi5cbiAgICovXG4gIHVybFVwZGF0ZVN0cmF0ZWd5OiAnZGVmZXJyZWQnfCdlYWdlcicgPSAnZGVmZXJyZWQnO1xuXG4gIC8qKlxuICAgKiBTZWUge0BsaW5rIFJvdXRlck1vZHVsZX0gZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gICAqL1xuICByZWxhdGl2ZUxpbmtSZXNvbHV0aW9uOiAnbGVnYWN5J3wnY29ycmVjdGVkJyA9ICdsZWdhY3knO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIHRoZSByb3V0ZXIgc2VydmljZS5cbiAgICovXG4gIC8vIFRPRE86IHZzYXZraW4gbWFrZSBpbnRlcm5hbCBhZnRlciB0aGUgZmluYWwgaXMgb3V0LlxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm9vdENvbXBvbmVudFR5cGU6IFR5cGU8YW55PnxudWxsLCBwcml2YXRlIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgICBwcml2YXRlIHJvb3RDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cywgcHJpdmF0ZSBsb2NhdGlvbjogTG9jYXRpb24sIGluamVjdG9yOiBJbmplY3RvcixcbiAgICAgIGxvYWRlcjogTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBjb21waWxlcjogQ29tcGlsZXIsIHB1YmxpYyBjb25maWc6IFJvdXRlcykge1xuICAgIGNvbnN0IG9uTG9hZFN0YXJ0ID0gKHI6IFJvdXRlKSA9PiB0aGlzLnRyaWdnZXJFdmVudChuZXcgUm91dGVDb25maWdMb2FkU3RhcnQocikpO1xuICAgIGNvbnN0IG9uTG9hZEVuZCA9IChyOiBSb3V0ZSkgPT4gdGhpcy50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZEVuZChyKSk7XG5cbiAgICB0aGlzLm5nTW9kdWxlID0gaW5qZWN0b3IuZ2V0KE5nTW9kdWxlUmVmKTtcblxuICAgIHRoaXMucmVzZXRDb25maWcoY29uZmlnKTtcbiAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gY3JlYXRlRW1wdHlVcmxUcmVlKCk7XG4gICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy5jdXJyZW50VXJsVHJlZTtcblxuICAgIHRoaXMuY29uZmlnTG9hZGVyID0gbmV3IFJvdXRlckNvbmZpZ0xvYWRlcihsb2FkZXIsIGNvbXBpbGVyLCBvbkxvYWRTdGFydCwgb25Mb2FkRW5kKTtcbiAgICB0aGlzLnJvdXRlclN0YXRlID0gY3JlYXRlRW1wdHlTdGF0ZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB0aGlzLnJvb3RDb21wb25lbnRUeXBlKTtcbiAgICB0aGlzLnByb2Nlc3NOYXZpZ2F0aW9ucygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBpbnRlcm5hbFxuICAgKiBUT0RPOiB0aGlzIHNob3VsZCBiZSByZW1vdmVkIG9uY2UgdGhlIGNvbnN0cnVjdG9yIG9mIHRoZSByb3V0ZXIgbWFkZSBpbnRlcm5hbFxuICAgKi9cbiAgcmVzZXRSb290Q29tcG9uZW50VHlwZShyb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+KTogdm9pZCB7XG4gICAgdGhpcy5yb290Q29tcG9uZW50VHlwZSA9IHJvb3RDb21wb25lbnRUeXBlO1xuICAgIC8vIFRPRE86IHZzYXZraW4gcm91dGVyIDQuMCBzaG91bGQgbWFrZSB0aGUgcm9vdCBjb21wb25lbnQgc2V0IHRvIG51bGxcbiAgICAvLyB0aGlzIHdpbGwgc2ltcGxpZnkgdGhlIGxpZmVjeWNsZSBvZiB0aGUgcm91dGVyLlxuICAgIHRoaXMucm91dGVyU3RhdGUucm9vdC5jb21wb25lbnQgPSB0aGlzLnJvb3RDb21wb25lbnRUeXBlO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdXAgdGhlIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lciBhbmQgcGVyZm9ybXMgdGhlIGluaXRpYWwgbmF2aWdhdGlvbi5cbiAgICovXG4gIGluaXRpYWxOYXZpZ2F0aW9uKCk6IHZvaWQge1xuICAgIHRoaXMuc2V0VXBMb2NhdGlvbkNoYW5nZUxpc3RlbmVyKCk7XG4gICAgaWYgKHRoaXMubmF2aWdhdGlvbklkID09PSAwKSB7XG4gICAgICB0aGlzLm5hdmlnYXRlQnlVcmwodGhpcy5sb2NhdGlvbi5wYXRoKHRydWUpLCB7cmVwbGFjZVVybDogdHJ1ZX0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHVwIHRoZSBsb2NhdGlvbiBjaGFuZ2UgbGlzdGVuZXIuXG4gICAqL1xuICBzZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTogdm9pZCB7XG4gICAgLy8gRG9uJ3QgbmVlZCB0byB1c2UgWm9uZS53cmFwIGFueSBtb3JlLCBiZWNhdXNlIHpvbmUuanNcbiAgICAvLyBhbHJlYWR5IHBhdGNoIG9uUG9wU3RhdGUsIHNvIGxvY2F0aW9uIGNoYW5nZSBjYWxsYmFjayB3aWxsXG4gICAgLy8gcnVuIGludG8gbmdab25lXG4gICAgaWYgKCF0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uID0gPGFueT50aGlzLmxvY2F0aW9uLnN1YnNjcmliZSgoY2hhbmdlOiBhbnkpID0+IHtcbiAgICAgICAgbGV0IHJhd1VybFRyZWUgPSB0aGlzLnBhcnNlVXJsKGNoYW5nZVsndXJsJ10pO1xuICAgICAgICBjb25zdCBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyID0gY2hhbmdlWyd0eXBlJ10gPT09ICdwb3BzdGF0ZScgPyAncG9wc3RhdGUnIDogJ2hhc2hjaGFuZ2UnO1xuICAgICAgICBjb25zdCBzdGF0ZSA9IGNoYW5nZS5zdGF0ZSAmJiBjaGFuZ2Uuc3RhdGUubmF2aWdhdGlvbklkID9cbiAgICAgICAgICAgIHtuYXZpZ2F0aW9uSWQ6IGNoYW5nZS5zdGF0ZS5uYXZpZ2F0aW9uSWR9IDpcbiAgICAgICAgICAgIG51bGw7XG4gICAgICAgIHNldFRpbWVvdXQoXG4gICAgICAgICAgICAoKSA9PiB7IHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKHJhd1VybFRyZWUsIHNvdXJjZSwgc3RhdGUsIHtyZXBsYWNlVXJsOiB0cnVlfSk7IH0sIDApO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIFRoZSBjdXJyZW50IHVybCAqL1xuICBnZXQgdXJsKCk6IHN0cmluZyB7IHJldHVybiB0aGlzLnNlcmlhbGl6ZVVybCh0aGlzLmN1cnJlbnRVcmxUcmVlKTsgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgdHJpZ2dlckV2ZW50KGU6IEV2ZW50KTogdm9pZCB7ICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PikubmV4dChlKTsgfVxuXG4gIC8qKlxuICAgKiBSZXNldHMgdGhlIGNvbmZpZ3VyYXRpb24gdXNlZCBmb3IgbmF2aWdhdGlvbiBhbmQgZ2VuZXJhdGluZyBsaW5rcy5cbiAgICpcbiAgICogIyMjIFVzYWdlXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIucmVzZXRDb25maWcoW1xuICAgKiAgeyBwYXRoOiAndGVhbS86aWQnLCBjb21wb25lbnQ6IFRlYW1DbXAsIGNoaWxkcmVuOiBbXG4gICAqICAgIHsgcGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wIH0sXG4gICAqICAgIHsgcGF0aDogJ3VzZXIvOm5hbWUnLCBjb21wb25lbnQ6IFVzZXJDbXAgfVxuICAgKiAgXX1cbiAgICogXSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcmVzZXRDb25maWcoY29uZmlnOiBSb3V0ZXMpOiB2b2lkIHtcbiAgICB2YWxpZGF0ZUNvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gICAgdGhpcy5uYXZpZ2F0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSAtMTtcbiAgfVxuXG4gIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gIG5nT25EZXN0cm95KCk6IHZvaWQgeyB0aGlzLmRpc3Bvc2UoKTsgfVxuXG4gIC8qKiBEaXNwb3NlcyBvZiB0aGUgcm91dGVyICovXG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24gPSBudWxsICE7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFwcGxpZXMgYW4gYXJyYXkgb2YgY29tbWFuZHMgdG8gdGhlIGN1cnJlbnQgdXJsIHRyZWUgYW5kIGNyZWF0ZXMgYSBuZXcgdXJsIHRyZWUuXG4gICAqXG4gICAqIFdoZW4gZ2l2ZW4gYW4gYWN0aXZhdGUgcm91dGUsIGFwcGxpZXMgdGhlIGdpdmVuIGNvbW1hbmRzIHN0YXJ0aW5nIGZyb20gdGhlIHJvdXRlLlxuICAgKiBXaGVuIG5vdCBnaXZlbiBhIHJvdXRlLCBhcHBsaWVzIHRoZSBnaXZlbiBjb21tYW5kIHN0YXJ0aW5nIGZyb20gdGhlIHJvb3QuXG4gICAqXG4gICAqICMjIyBVc2FnZVxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCAndXNlcicsIDExXSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMztleHBhbmQ9dHJ1ZS91c2VyLzExXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge2V4cGFuZDogdHJ1ZX0sICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8geW91IGNhbiBjb2xsYXBzZSBzdGF0aWMgc2VnbWVudHMgbGlrZSB0aGlzICh0aGlzIHdvcmtzIG9ubHkgd2l0aCB0aGUgZmlyc3QgcGFzc2VkLWluIHZhbHVlKTpcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbS8zMy91c2VyJywgdXNlcklkXSk7XG4gICAqXG4gICAqIC8vIElmIHRoZSBmaXJzdCBzZWdtZW50IGNhbiBjb250YWluIHNsYXNoZXMsIGFuZCB5b3UgZG8gbm90IHdhbnQgdGhlIHJvdXRlciB0byBzcGxpdCBpdCwgeW91XG4gICAqIC8vIGNhbiBkbyB0aGUgZm9sbG93aW5nOlxuICAgKlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbe3NlZ21lbnRQYXRoOiAnL29uZS90d28nfV0pO1xuICAgKlxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvKHVzZXIvMTEvL3JpZ2h0OmNoYXQpXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiAnY2hhdCd9fV0pO1xuICAgKlxuICAgKiAvLyByZW1vdmUgdGhlIHJpZ2h0IHNlY29uZGFyeSBub2RlXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiBudWxsfX1dKTtcbiAgICpcbiAgICogLy8gYXNzdW1pbmcgdGhlIGN1cnJlbnQgdXJsIGlzIGAvdGVhbS8zMy91c2VyLzExYCBhbmQgdGhlIHJvdXRlIHBvaW50cyB0byBgdXNlci8xMWBcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8xMS9kZXRhaWxzXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnZGV0YWlscyddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8yMlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy4uLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS80NC91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vLi4vdGVhbS80NC91c2VyLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKiBgYGBcbiAgICovXG4gIGNyZWF0ZVVybFRyZWUoY29tbWFuZHM6IGFueVtdLCBuYXZpZ2F0aW9uRXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge30pOiBVcmxUcmVlIHtcbiAgICBjb25zdCB7cmVsYXRpdmVUbywgICAgICAgICAgcXVlcnlQYXJhbXMsICAgICAgICAgZnJhZ21lbnQsXG4gICAgICAgICAgIHByZXNlcnZlUXVlcnlQYXJhbXMsIHF1ZXJ5UGFyYW1zSGFuZGxpbmcsIHByZXNlcnZlRnJhZ21lbnR9ID0gbmF2aWdhdGlvbkV4dHJhcztcbiAgICBpZiAoaXNEZXZNb2RlKCkgJiYgcHJlc2VydmVRdWVyeVBhcmFtcyAmJiA8YW55PmNvbnNvbGUgJiYgPGFueT5jb25zb2xlLndhcm4pIHtcbiAgICAgIGNvbnNvbGUud2FybigncHJlc2VydmVRdWVyeVBhcmFtcyBpcyBkZXByZWNhdGVkLCB1c2UgcXVlcnlQYXJhbXNIYW5kbGluZyBpbnN0ZWFkLicpO1xuICAgIH1cbiAgICBjb25zdCBhID0gcmVsYXRpdmVUbyB8fCB0aGlzLnJvdXRlclN0YXRlLnJvb3Q7XG4gICAgY29uc3QgZiA9IHByZXNlcnZlRnJhZ21lbnQgPyB0aGlzLmN1cnJlbnRVcmxUcmVlLmZyYWdtZW50IDogZnJhZ21lbnQ7XG4gICAgbGV0IHE6IFBhcmFtc3xudWxsID0gbnVsbDtcbiAgICBpZiAocXVlcnlQYXJhbXNIYW5kbGluZykge1xuICAgICAgc3dpdGNoIChxdWVyeVBhcmFtc0hhbmRsaW5nKSB7XG4gICAgICAgIGNhc2UgJ21lcmdlJzpcbiAgICAgICAgICBxID0gey4uLnRoaXMuY3VycmVudFVybFRyZWUucXVlcnlQYXJhbXMsIC4uLnF1ZXJ5UGFyYW1zfTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncHJlc2VydmUnOlxuICAgICAgICAgIHEgPSB0aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHEgPSBxdWVyeVBhcmFtcyB8fCBudWxsO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBxID0gcHJlc2VydmVRdWVyeVBhcmFtcyA/IHRoaXMuY3VycmVudFVybFRyZWUucXVlcnlQYXJhbXMgOiBxdWVyeVBhcmFtcyB8fCBudWxsO1xuICAgIH1cbiAgICBpZiAocSAhPT0gbnVsbCkge1xuICAgICAgcSA9IHRoaXMucmVtb3ZlRW1wdHlQcm9wcyhxKTtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZVVybFRyZWUoYSwgdGhpcy5jdXJyZW50VXJsVHJlZSwgY29tbWFuZHMsIHEgISwgZiAhKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZSBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgdXJsLiBUaGlzIG5hdmlnYXRpb24gaXMgYWx3YXlzIGFic29sdXRlLlxuICAgKlxuICAgKiBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0OlxuICAgKiAtIHJlc29sdmVzIHRvICd0cnVlJyB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsXG4gICAqIC0gcmVzb2x2ZXMgdG8gJ2ZhbHNlJyB3aGVuIG5hdmlnYXRpb24gZmFpbHMsXG4gICAqIC0gaXMgcmVqZWN0ZWQgd2hlbiBhbiBlcnJvciBoYXBwZW5zLlxuICAgKlxuICAgKiAjIyMgVXNhZ2VcbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiKTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiLCB7IHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIEluIG9wcG9zaXRlIHRvIGBuYXZpZ2F0ZWAsIGBuYXZpZ2F0ZUJ5VXJsYCB0YWtlcyBhIHdob2xlIFVSTFxuICAgKiBhbmQgZG9lcyBub3QgYXBwbHkgYW55IGRlbHRhIHRvIHRoZSBjdXJyZW50IG9uZS5cbiAgICovXG4gIG5hdmlnYXRlQnlVcmwodXJsOiBzdHJpbmd8VXJsVHJlZSwgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3NraXBMb2NhdGlvbkNoYW5nZTogZmFsc2V9KTpcbiAgICAgIFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IHVybFRyZWUgPSB1cmwgaW5zdGFuY2VvZiBVcmxUcmVlID8gdXJsIDogdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIGNvbnN0IG1lcmdlZFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodXJsVHJlZSwgdGhpcy5yYXdVcmxUcmVlKTtcblxuICAgIHJldHVybiB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbihtZXJnZWRUcmVlLCAnaW1wZXJhdGl2ZScsIG51bGwsIGV4dHJhcyk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGUgYmFzZWQgb24gdGhlIHByb3ZpZGVkIGFycmF5IG9mIGNvbW1hbmRzIGFuZCBhIHN0YXJ0aW5nIHBvaW50LlxuICAgKiBJZiBubyBzdGFydGluZyByb3V0ZSBpcyBwcm92aWRlZCwgdGhlIG5hdmlnYXRpb24gaXMgYWJzb2x1dGUuXG4gICAqXG4gICAqIFJldHVybnMgYSBwcm9taXNlIHRoYXQ6XG4gICAqIC0gcmVzb2x2ZXMgdG8gJ3RydWUnIHdoZW4gbmF2aWdhdGlvbiBzdWNjZWVkcyxcbiAgICogLSByZXNvbHZlcyB0byAnZmFsc2UnIHdoZW4gbmF2aWdhdGlvbiBmYWlscyxcbiAgICogLSBpcyByZWplY3RlZCB3aGVuIGFuIGVycm9yIGhhcHBlbnMuXG4gICAqXG4gICAqICMjIyBVc2FnZVxuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTFxuICAgKiByb3V0ZXIubmF2aWdhdGUoWyd0ZWFtJywgMzMsICd1c2VyJywgMTFdLCB7cmVsYXRpdmVUbzogcm91dGUsIHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZX0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogSW4gb3Bwb3NpdGUgdG8gYG5hdmlnYXRlQnlVcmxgLCBgbmF2aWdhdGVgIGFsd2F5cyB0YWtlcyBhIGRlbHRhIHRoYXQgaXMgYXBwbGllZCB0byB0aGUgY3VycmVudFxuICAgKiBVUkwuXG4gICAqL1xuICBuYXZpZ2F0ZShjb21tYW5kczogYW55W10sIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHtza2lwTG9jYXRpb25DaGFuZ2U6IGZhbHNlfSk6XG4gICAgICBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB2YWxpZGF0ZUNvbW1hbmRzKGNvbW1hbmRzKTtcbiAgICByZXR1cm4gdGhpcy5uYXZpZ2F0ZUJ5VXJsKHRoaXMuY3JlYXRlVXJsVHJlZShjb21tYW5kcywgZXh0cmFzKSwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKiBTZXJpYWxpemVzIGEgYFVybFRyZWVgIGludG8gYSBzdHJpbmcgKi9cbiAgc2VyaWFsaXplVXJsKHVybDogVXJsVHJlZSk6IHN0cmluZyB7IHJldHVybiB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHVybCk7IH1cblxuICAvKiogUGFyc2VzIGEgc3RyaW5nIGludG8gYSBgVXJsVHJlZWAgKi9cbiAgcGFyc2VVcmwodXJsOiBzdHJpbmcpOiBVcmxUcmVlIHtcbiAgICBsZXQgdXJsVHJlZTogVXJsVHJlZTtcbiAgICB0cnkge1xuICAgICAgdXJsVHJlZSA9IHRoaXMudXJsU2VyaWFsaXplci5wYXJzZSh1cmwpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHVybFRyZWUgPSB0aGlzLm1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcihlLCB0aGlzLnVybFNlcmlhbGl6ZXIsIHVybCk7XG4gICAgfVxuICAgIHJldHVybiB1cmxUcmVlO1xuICB9XG5cbiAgLyoqIFJldHVybnMgd2hldGhlciB0aGUgdXJsIGlzIGFjdGl2YXRlZCAqL1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBleGFjdDogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgIGlmICh1cmwgaW5zdGFuY2VvZiBVcmxUcmVlKSB7XG4gICAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybCwgZXhhY3QpO1xuICAgIH1cblxuICAgIGNvbnN0IHVybFRyZWUgPSB0aGlzLnBhcnNlVXJsKHVybCk7XG4gICAgcmV0dXJuIGNvbnRhaW5zVHJlZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB1cmxUcmVlLCBleGFjdCk7XG4gIH1cblxuICBwcml2YXRlIHJlbW92ZUVtcHR5UHJvcHMocGFyYW1zOiBQYXJhbXMpOiBQYXJhbXMge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhwYXJhbXMpLnJlZHVjZSgocmVzdWx0OiBQYXJhbXMsIGtleTogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZTogYW55ID0gcGFyYW1zW2tleV07XG4gICAgICBpZiAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXN1bHRba2V5XSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LCB7fSk7XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NOYXZpZ2F0aW9ucygpOiB2b2lkIHtcbiAgICB0aGlzLm5hdmlnYXRpb25zXG4gICAgICAgIC5waXBlKGNvbmNhdE1hcCgobmF2OiBOYXZpZ2F0aW9uUGFyYW1zKSA9PiB7XG4gICAgICAgICAgaWYgKG5hdikge1xuICAgICAgICAgICAgdGhpcy5leGVjdXRlU2NoZWR1bGVkTmF2aWdhdGlvbihuYXYpO1xuICAgICAgICAgICAgLy8gYSBmYWlsZWQgbmF2aWdhdGlvbiBzaG91bGQgbm90IHN0b3AgdGhlIHJvdXRlciBmcm9tIHByb2Nlc3NpbmdcbiAgICAgICAgICAgIC8vIGZ1cnRoZXIgbmF2aWdhdGlvbnMgPT4gdGhlIGNhdGNoXG4gICAgICAgICAgICByZXR1cm4gbmF2LnByb21pc2UuY2F0Y2goKCkgPT4ge30pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gPGFueT5vZiAobnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KSlcbiAgICAgICAgLnN1YnNjcmliZSgoKSA9PiB7fSk7XG4gIH1cblxuICBwcml2YXRlIHNjaGVkdWxlTmF2aWdhdGlvbihcbiAgICAgIHJhd1VybDogVXJsVHJlZSwgc291cmNlOiBOYXZpZ2F0aW9uVHJpZ2dlciwgc3RhdGU6IHtuYXZpZ2F0aW9uSWQ6IG51bWJlcn18bnVsbCxcbiAgICAgIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IGxhc3ROYXZpZ2F0aW9uID0gdGhpcy5uYXZpZ2F0aW9ucy52YWx1ZTtcbiAgICAvLyBJZiB0aGUgdXNlciB0cmlnZ2VycyBhIG5hdmlnYXRpb24gaW1wZXJhdGl2ZWx5IChlLmcuLCBieSB1c2luZyBuYXZpZ2F0ZUJ5VXJsKSxcbiAgICAvLyBhbmQgdGhhdCBuYXZpZ2F0aW9uIHJlc3VsdHMgaW4gJ3JlcGxhY2VTdGF0ZScgdGhhdCBsZWFkcyB0byB0aGUgc2FtZSBVUkwsXG4gICAgLy8gd2Ugc2hvdWxkIHNraXAgdGhvc2UuXG4gICAgaWYgKGxhc3ROYXZpZ2F0aW9uICYmIHNvdXJjZSAhPT0gJ2ltcGVyYXRpdmUnICYmIGxhc3ROYXZpZ2F0aW9uLnNvdXJjZSA9PT0gJ2ltcGVyYXRpdmUnICYmXG4gICAgICAgIGxhc3ROYXZpZ2F0aW9uLnJhd1VybC50b1N0cmluZygpID09PSByYXdVcmwudG9TdHJpbmcoKSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKTsgIC8vIHJldHVybiB2YWx1ZSBpcyBub3QgdXNlZFxuICAgIH1cblxuICAgIC8vIEJlY2F1c2Ugb2YgYSBidWcgaW4gSUUgYW5kIEVkZ2UsIHRoZSBsb2NhdGlvbiBjbGFzcyBmaXJlcyB0d28gZXZlbnRzIChwb3BzdGF0ZSBhbmRcbiAgICAvLyBoYXNoY2hhbmdlKSBldmVyeSBzaW5nbGUgdGltZS4gVGhlIHNlY29uZCBvbmUgc2hvdWxkIGJlIGlnbm9yZWQuIE90aGVyd2lzZSwgdGhlIFVSTCB3aWxsXG4gICAgLy8gZmxpY2tlci4gSGFuZGxlcyB0aGUgY2FzZSB3aGVuIGEgcG9wc3RhdGUgd2FzIGVtaXR0ZWQgZmlyc3QuXG4gICAgaWYgKGxhc3ROYXZpZ2F0aW9uICYmIHNvdXJjZSA9PSAnaGFzaGNoYW5nZScgJiYgbGFzdE5hdmlnYXRpb24uc291cmNlID09PSAncG9wc3RhdGUnICYmXG4gICAgICAgIGxhc3ROYXZpZ2F0aW9uLnJhd1VybC50b1N0cmluZygpID09PSByYXdVcmwudG9TdHJpbmcoKSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKTsgIC8vIHJldHVybiB2YWx1ZSBpcyBub3QgdXNlZFxuICAgIH1cbiAgICAvLyBCZWNhdXNlIG9mIGEgYnVnIGluIElFIGFuZCBFZGdlLCB0aGUgbG9jYXRpb24gY2xhc3MgZmlyZXMgdHdvIGV2ZW50cyAocG9wc3RhdGUgYW5kXG4gICAgLy8gaGFzaGNoYW5nZSkgZXZlcnkgc2luZ2xlIHRpbWUuIFRoZSBzZWNvbmQgb25lIHNob3VsZCBiZSBpZ25vcmVkLiBPdGhlcndpc2UsIHRoZSBVUkwgd2lsbFxuICAgIC8vIGZsaWNrZXIuIEhhbmRsZXMgdGhlIGNhc2Ugd2hlbiBhIGhhc2hjaGFuZ2Ugd2FzIGVtaXR0ZWQgZmlyc3QuXG4gICAgaWYgKGxhc3ROYXZpZ2F0aW9uICYmIHNvdXJjZSA9PSAncG9wc3RhdGUnICYmIGxhc3ROYXZpZ2F0aW9uLnNvdXJjZSA9PT0gJ2hhc2hjaGFuZ2UnICYmXG4gICAgICAgIGxhc3ROYXZpZ2F0aW9uLnJhd1VybC50b1N0cmluZygpID09PSByYXdVcmwudG9TdHJpbmcoKSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKTsgIC8vIHJldHVybiB2YWx1ZSBpcyBub3QgdXNlZFxuICAgIH1cblxuICAgIGxldCByZXNvbHZlOiBhbnkgPSBudWxsO1xuICAgIGxldCByZWplY3Q6IGFueSA9IG51bGw7XG5cbiAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlcywgcmVqKSA9PiB7XG4gICAgICByZXNvbHZlID0gcmVzO1xuICAgICAgcmVqZWN0ID0gcmVqO1xuICAgIH0pO1xuXG4gICAgY29uc3QgaWQgPSArK3RoaXMubmF2aWdhdGlvbklkO1xuICAgIHRoaXMubmF2aWdhdGlvbnMubmV4dCh7aWQsIHNvdXJjZSwgc3RhdGUsIHJhd1VybCwgZXh0cmFzLCByZXNvbHZlLCByZWplY3QsIHByb21pc2V9KTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBlcnJvciBpcyBwcm9wYWdhdGVkIGV2ZW4gdGhvdWdoIGBwcm9jZXNzTmF2aWdhdGlvbnNgIGNhdGNoXG4gICAgLy8gaGFuZGxlciBkb2VzIG5vdCByZXRocm93XG4gICAgcmV0dXJuIHByb21pc2UuY2F0Y2goKGU6IGFueSkgPT4gUHJvbWlzZS5yZWplY3QoZSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBleGVjdXRlU2NoZWR1bGVkTmF2aWdhdGlvbih7aWQsIHJhd1VybCwgZXh0cmFzLCByZXNvbHZlLCByZWplY3QsIHNvdXJjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGV9OiBOYXZpZ2F0aW9uUGFyYW1zKTogdm9pZCB7XG4gICAgY29uc3QgdXJsID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QocmF3VXJsKTtcbiAgICBjb25zdCB1cmxUcmFuc2l0aW9uID0gIXRoaXMubmF2aWdhdGVkIHx8IHVybC50b1N0cmluZygpICE9PSB0aGlzLmN1cnJlbnRVcmxUcmVlLnRvU3RyaW5nKCk7XG5cbiAgICBpZiAoKHRoaXMub25TYW1lVXJsTmF2aWdhdGlvbiA9PT0gJ3JlbG9hZCcgPyB0cnVlIDogdXJsVHJhbnNpdGlvbikgJiZcbiAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LnNob3VsZFByb2Nlc3NVcmwocmF3VXJsKSkge1xuICAgICAgaWYgKHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcicgJiYgIWV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHJhd1VybCwgISFleHRyYXMucmVwbGFjZVVybCwgaWQpO1xuICAgICAgfVxuICAgICAgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KVxuICAgICAgICAgIC5uZXh0KG5ldyBOYXZpZ2F0aW9uU3RhcnQoaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksIHNvdXJjZSwgc3RhdGUpKTtcbiAgICAgIFByb21pc2UucmVzb2x2ZSgpXG4gICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgIChfKSA9PiB0aGlzLnJ1bk5hdmlnYXRlKFxuICAgICAgICAgICAgICAgICAgdXJsLCByYXdVcmwsICEhZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSwgISFleHRyYXMucmVwbGFjZVVybCwgaWQsIG51bGwpKVxuICAgICAgICAgIC50aGVuKHJlc29sdmUsIHJlamVjdCk7XG5cbiAgICAgIC8vIHdlIGNhbm5vdCBwcm9jZXNzIHRoZSBjdXJyZW50IFVSTCwgYnV0IHdlIGNvdWxkIHByb2Nlc3MgdGhlIHByZXZpb3VzIG9uZSA9PlxuICAgICAgLy8gd2UgbmVlZCB0byBkbyBzb21lIGNsZWFudXBcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICB1cmxUcmFuc2l0aW9uICYmIHRoaXMucmF3VXJsVHJlZSAmJlxuICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybCh0aGlzLnJhd1VybFRyZWUpKSB7XG4gICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25TdGFydChpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgc291cmNlLCBzdGF0ZSkpO1xuICAgICAgUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgKF8pID0+IHRoaXMucnVuTmF2aWdhdGUoXG4gICAgICAgICAgICAgICAgICB1cmwsIHJhd1VybCwgZmFsc2UsIGZhbHNlLCBpZCxcbiAgICAgICAgICAgICAgICAgIGNyZWF0ZUVtcHR5U3RhdGUodXJsLCB0aGlzLnJvb3RDb21wb25lbnRUeXBlKS5zbmFwc2hvdCkpXG4gICAgICAgICAgLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcblxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJhd1VybFRyZWUgPSByYXdVcmw7XG4gICAgICByZXNvbHZlKG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcnVuTmF2aWdhdGUoXG4gICAgICB1cmw6IFVybFRyZWUsIHJhd1VybDogVXJsVHJlZSwgc2tpcExvY2F0aW9uQ2hhbmdlOiBib29sZWFuLCByZXBsYWNlVXJsOiBib29sZWFuLCBpZDogbnVtYmVyLFxuICAgICAgcHJlY3JlYXRlZFN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90fG51bGwpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoaWQgIT09IHRoaXMubmF2aWdhdGlvbklkKSB7XG4gICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25DYW5jZWwoXG4gICAgICAgICAgICAgIGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLFxuICAgICAgICAgICAgICBgTmF2aWdhdGlvbiBJRCAke2lkfSBpcyBub3QgZXF1YWwgdG8gdGhlIGN1cnJlbnQgbmF2aWdhdGlvbiBpZCAke3RoaXMubmF2aWdhdGlvbklkfWApKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZmFsc2UpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZVByb21pc2UsIHJlamVjdFByb21pc2UpID0+IHtcbiAgICAgIC8vIGNyZWF0ZSBhbiBvYnNlcnZhYmxlIG9mIHRoZSB1cmwgYW5kIHJvdXRlIHN0YXRlIHNuYXBzaG90XG4gICAgICAvLyB0aGlzIG9wZXJhdGlvbiBkbyBub3QgcmVzdWx0IGluIGFueSBzaWRlIGVmZmVjdHNcbiAgICAgIGxldCB1cmxBbmRTbmFwc2hvdCQ6IE9ic2VydmFibGU8TmF2U3RyZWFtVmFsdWU+O1xuICAgICAgaWYgKCFwcmVjcmVhdGVkU3RhdGUpIHtcbiAgICAgICAgY29uc3QgbW9kdWxlSW5qZWN0b3IgPSB0aGlzLm5nTW9kdWxlLmluamVjdG9yO1xuICAgICAgICBjb25zdCByZWRpcmVjdHNBcHBsaWVkJCA9XG4gICAgICAgICAgICBhcHBseVJlZGlyZWN0cyhtb2R1bGVJbmplY3RvciwgdGhpcy5jb25maWdMb2FkZXIsIHRoaXMudXJsU2VyaWFsaXplciwgdXJsLCB0aGlzLmNvbmZpZyk7XG5cbiAgICAgICAgdXJsQW5kU25hcHNob3QkID0gcmVkaXJlY3RzQXBwbGllZCQucGlwZShtZXJnZU1hcCgoYXBwbGllZFVybDogVXJsVHJlZSkgPT4ge1xuICAgICAgICAgIHJldHVybiByZWNvZ25pemUoXG4gICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb3RDb21wb25lbnRUeXBlLCB0aGlzLmNvbmZpZywgYXBwbGllZFVybCwgdGhpcy5zZXJpYWxpemVVcmwoYXBwbGllZFVybCksXG4gICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3ksIHRoaXMucmVsYXRpdmVMaW5rUmVzb2x1dGlvbilcbiAgICAgICAgICAgICAgLnBpcGUobWFwKChzbmFwc2hvdDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KVxuICAgICAgICAgICAgICAgICAgICAubmV4dChuZXcgUm91dGVzUmVjb2duaXplZChcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCB0aGlzLnNlcmlhbGl6ZVVybChhcHBsaWVkVXJsKSwgc25hcHNob3QpKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB7YXBwbGllZFVybCwgc25hcHNob3R9O1xuICAgICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHVybEFuZFNuYXBzaG90JCA9IG9mICh7YXBwbGllZFVybDogdXJsLCBzbmFwc2hvdDogcHJlY3JlYXRlZFN0YXRlfSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGJlZm9yZVByZWFjdGl2YXRpb25Eb25lJCA9XG4gICAgICAgICAgdXJsQW5kU25hcHNob3QkLnBpcGUobWVyZ2VNYXAoKHApOiBPYnNlcnZhYmxlPE5hdlN0cmVhbVZhbHVlPiA9PiB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHAgPT09ICdib29sZWFuJykgcmV0dXJuIG9mIChwKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhvb2tzXG4gICAgICAgICAgICAgICAgLmJlZm9yZVByZWFjdGl2YXRpb24ocC5zbmFwc2hvdCwge1xuICAgICAgICAgICAgICAgICAgbmF2aWdhdGlvbklkOiBpZCxcbiAgICAgICAgICAgICAgICAgIGFwcGxpZWRVcmxUcmVlOiB1cmwsXG4gICAgICAgICAgICAgICAgICByYXdVcmxUcmVlOiByYXdVcmwsIHNraXBMb2NhdGlvbkNoYW5nZSwgcmVwbGFjZVVybCxcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5waXBlKG1hcCgoKSA9PiBwKSk7XG4gICAgICAgICAgfSkpO1xuXG4gICAgICAvLyBydW4gcHJlYWN0aXZhdGlvbjogZ3VhcmRzIGFuZCBkYXRhIHJlc29sdmVyc1xuICAgICAgbGV0IHByZUFjdGl2YXRpb246IFByZUFjdGl2YXRpb247XG5cbiAgICAgIGNvbnN0IHByZWFjdGl2YXRpb25TZXR1cCQgPSBiZWZvcmVQcmVhY3RpdmF0aW9uRG9uZSQucGlwZShtYXAoKHApOiBOYXZTdHJlYW1WYWx1ZSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgcCA9PT0gJ2Jvb2xlYW4nKSByZXR1cm4gcDtcbiAgICAgICAgY29uc3Qge2FwcGxpZWRVcmwsIHNuYXBzaG90fSA9IHA7XG4gICAgICAgIGNvbnN0IG1vZHVsZUluamVjdG9yID0gdGhpcy5uZ01vZHVsZS5pbmplY3RvcjtcbiAgICAgICAgcHJlQWN0aXZhdGlvbiA9IG5ldyBQcmVBY3RpdmF0aW9uKFxuICAgICAgICAgICAgc25hcHNob3QsIHRoaXMucm91dGVyU3RhdGUuc25hcHNob3QsIG1vZHVsZUluamVjdG9yLFxuICAgICAgICAgICAgKGV2dDogRXZlbnQpID0+IHRoaXMudHJpZ2dlckV2ZW50KGV2dCkpO1xuICAgICAgICBwcmVBY3RpdmF0aW9uLmluaXRpYWxpemUodGhpcy5yb290Q29udGV4dHMpO1xuICAgICAgICByZXR1cm4ge2FwcGxpZWRVcmwsIHNuYXBzaG90fTtcbiAgICAgIH0pKTtcblxuICAgICAgY29uc3QgcHJlYWN0aXZhdGlvbkNoZWNrR3VhcmRzJCA9XG4gICAgICAgICAgcHJlYWN0aXZhdGlvblNldHVwJC5waXBlKG1lcmdlTWFwKChwKTogT2JzZXJ2YWJsZTxOYXZTdHJlYW1WYWx1ZT4gPT4ge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwID09PSAnYm9vbGVhbicgfHwgdGhpcy5uYXZpZ2F0aW9uSWQgIT09IGlkKSByZXR1cm4gb2YgKGZhbHNlKTtcbiAgICAgICAgICAgIGNvbnN0IHthcHBsaWVkVXJsLCBzbmFwc2hvdH0gPSBwO1xuXG4gICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChuZXcgR3VhcmRzQ2hlY2tTdGFydChcbiAgICAgICAgICAgICAgICBpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgdGhpcy5zZXJpYWxpemVVcmwoYXBwbGllZFVybCksIHNuYXBzaG90KSk7XG5cbiAgICAgICAgICAgIHJldHVybiBwcmVBY3RpdmF0aW9uLmNoZWNrR3VhcmRzKCkucGlwZShtYXAoKHNob3VsZEFjdGl2YXRlOiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KG5ldyBHdWFyZHNDaGVja0VuZChcbiAgICAgICAgICAgICAgICAgIGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCB0aGlzLnNlcmlhbGl6ZVVybChhcHBsaWVkVXJsKSwgc25hcHNob3QsXG4gICAgICAgICAgICAgICAgICBzaG91bGRBY3RpdmF0ZSkpO1xuICAgICAgICAgICAgICByZXR1cm4ge2FwcGxpZWRVcmw6IGFwcGxpZWRVcmwsIHNuYXBzaG90OiBzbmFwc2hvdCwgc2hvdWxkQWN0aXZhdGU6IHNob3VsZEFjdGl2YXRlfTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICB9KSk7XG5cbiAgICAgIGNvbnN0IHByZWFjdGl2YXRpb25SZXNvbHZlRGF0YSQgPVxuICAgICAgICAgIHByZWFjdGl2YXRpb25DaGVja0d1YXJkcyQucGlwZShtZXJnZU1hcCgocCk6IE9ic2VydmFibGU8TmF2U3RyZWFtVmFsdWU+ID0+IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcCA9PT0gJ2Jvb2xlYW4nIHx8IHRoaXMubmF2aWdhdGlvbklkICE9PSBpZCkgcmV0dXJuIG9mIChmYWxzZSk7XG5cbiAgICAgICAgICAgIGlmIChwLnNob3VsZEFjdGl2YXRlICYmIHByZUFjdGl2YXRpb24uaXNBY3RpdmF0aW5nKCkpIHtcbiAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQobmV3IFJlc29sdmVTdGFydChcbiAgICAgICAgICAgICAgICAgIGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCB0aGlzLnNlcmlhbGl6ZVVybChwLmFwcGxpZWRVcmwpLCBwLnNuYXBzaG90KSk7XG4gICAgICAgICAgICAgIHJldHVybiBwcmVBY3RpdmF0aW9uLnJlc29sdmVEYXRhKHRoaXMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSkucGlwZShtYXAoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KG5ldyBSZXNvbHZlRW5kKFxuICAgICAgICAgICAgICAgICAgICBpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgdGhpcy5zZXJpYWxpemVVcmwocC5hcHBsaWVkVXJsKSwgcC5zbmFwc2hvdCkpO1xuICAgICAgICAgICAgICAgIHJldHVybiBwO1xuICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gb2YgKHApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pKTtcblxuICAgICAgY29uc3QgcHJlYWN0aXZhdGlvbkRvbmUkID1cbiAgICAgICAgICBwcmVhY3RpdmF0aW9uUmVzb2x2ZURhdGEkLnBpcGUobWVyZ2VNYXAoKHApOiBPYnNlcnZhYmxlPE5hdlN0cmVhbVZhbHVlPiA9PiB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHAgPT09ICdib29sZWFuJyB8fCB0aGlzLm5hdmlnYXRpb25JZCAhPT0gaWQpIHJldHVybiBvZiAoZmFsc2UpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaG9va3NcbiAgICAgICAgICAgICAgICAuYWZ0ZXJQcmVhY3RpdmF0aW9uKHAuc25hcHNob3QsIHtcbiAgICAgICAgICAgICAgICAgIG5hdmlnYXRpb25JZDogaWQsXG4gICAgICAgICAgICAgICAgICBhcHBsaWVkVXJsVHJlZTogdXJsLFxuICAgICAgICAgICAgICAgICAgcmF3VXJsVHJlZTogcmF3VXJsLCBza2lwTG9jYXRpb25DaGFuZ2UsIHJlcGxhY2VVcmwsXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAucGlwZShtYXAoKCkgPT4gcCkpO1xuICAgICAgICAgIH0pKTtcblxuXG4gICAgICAvLyBjcmVhdGUgcm91dGVyIHN0YXRlXG4gICAgICAvLyB0aGlzIG9wZXJhdGlvbiBoYXMgc2lkZSBlZmZlY3RzID0+IHJvdXRlIHN0YXRlIGlzIGJlaW5nIGFmZmVjdGVkXG4gICAgICBjb25zdCByb3V0ZXJTdGF0ZSQgPSBwcmVhY3RpdmF0aW9uRG9uZSQucGlwZShtYXAoKHApID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBwID09PSAnYm9vbGVhbicgfHwgdGhpcy5uYXZpZ2F0aW9uSWQgIT09IGlkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGNvbnN0IHthcHBsaWVkVXJsLCBzbmFwc2hvdCwgc2hvdWxkQWN0aXZhdGV9ID0gcDtcbiAgICAgICAgaWYgKHNob3VsZEFjdGl2YXRlKSB7XG4gICAgICAgICAgY29uc3Qgc3RhdGUgPSBjcmVhdGVSb3V0ZXJTdGF0ZSh0aGlzLnJvdXRlUmV1c2VTdHJhdGVneSwgc25hcHNob3QsIHRoaXMucm91dGVyU3RhdGUpO1xuICAgICAgICAgIHJldHVybiB7YXBwbGllZFVybCwgc3RhdGUsIHNob3VsZEFjdGl2YXRlfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4ge2FwcGxpZWRVcmwsIHN0YXRlOiBudWxsLCBzaG91bGRBY3RpdmF0ZX07XG4gICAgICAgIH1cbiAgICAgIH0pKTtcblxuXG4gICAgICB0aGlzLmFjdGl2YXRlUm91dGVzKFxuICAgICAgICAgIHJvdXRlclN0YXRlJCwgdGhpcy5yb3V0ZXJTdGF0ZSwgdGhpcy5jdXJyZW50VXJsVHJlZSwgaWQsIHVybCwgcmF3VXJsLCBza2lwTG9jYXRpb25DaGFuZ2UsXG4gICAgICAgICAgcmVwbGFjZVVybCwgcmVzb2x2ZVByb21pc2UsIHJlamVjdFByb21pc2UpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFBlcmZvcm1zIHRoZSBsb2dpYyBvZiBhY3RpdmF0aW5nIHJvdXRlcy4gVGhpcyBpcyBhIHN5bmNocm9ub3VzIHByb2Nlc3MgYnkgZGVmYXVsdC4gV2hpbGUgdGhpc1xuICAgKiBpcyBhIHByaXZhdGUgbWV0aG9kLCBpdCBjb3VsZCBiZSBvdmVycmlkZGVuIHRvIG1ha2UgYWN0aXZhdGlvbiBhc3luY2hyb25vdXMuXG4gICAqL1xuICBwcml2YXRlIGFjdGl2YXRlUm91dGVzKFxuICAgICAgc3RhdGU6IE9ic2VydmFibGU8ZmFsc2V8XG4gICAgICAgICAgICAgICAgICAgICAgICB7YXBwbGllZFVybDogVXJsVHJlZSwgc3RhdGU6IFJvdXRlclN0YXRlfG51bGwsIHNob3VsZEFjdGl2YXRlPzogYm9vbGVhbn0+LFxuICAgICAgc3RvcmVkU3RhdGU6IFJvdXRlclN0YXRlLCBzdG9yZWRVcmw6IFVybFRyZWUsIGlkOiBudW1iZXIsIHVybDogVXJsVHJlZSwgcmF3VXJsOiBVcmxUcmVlLFxuICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiBib29sZWFuLCByZXBsYWNlVXJsOiBib29sZWFuLCByZXNvbHZlUHJvbWlzZTogYW55LCByZWplY3RQcm9taXNlOiBhbnkpIHtcbiAgICAvLyBhcHBsaWVkIHRoZSBuZXcgcm91dGVyIHN0YXRlXG4gICAgLy8gdGhpcyBvcGVyYXRpb24gaGFzIHNpZGUgZWZmZWN0c1xuICAgIGxldCBuYXZpZ2F0aW9uSXNTdWNjZXNzZnVsOiBib29sZWFuO1xuXG4gICAgc3RhdGVcbiAgICAgICAgLmZvckVhY2goKHApID0+IHtcbiAgICAgICAgICBpZiAodHlwZW9mIHAgPT09ICdib29sZWFuJyB8fCAhcC5zaG91bGRBY3RpdmF0ZSB8fCBpZCAhPT0gdGhpcy5uYXZpZ2F0aW9uSWQgfHwgIXAuc3RhdGUpIHtcbiAgICAgICAgICAgIG5hdmlnYXRpb25Jc1N1Y2Nlc3NmdWwgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3Qge2FwcGxpZWRVcmwsIHN0YXRlfSA9IHA7XG4gICAgICAgICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IGFwcGxpZWRVcmw7XG4gICAgICAgICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHRoaXMuY3VycmVudFVybFRyZWUsIHJhd1VybCk7XG5cbiAgICAgICAgICAodGhpcyBhc3tyb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGV9KS5yb3V0ZXJTdGF0ZSA9IHN0YXRlO1xuXG4gICAgICAgICAgaWYgKHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdkZWZlcnJlZCcgJiYgIXNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHRoaXMucmF3VXJsVHJlZSwgcmVwbGFjZVVybCwgaWQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIG5ldyBBY3RpdmF0ZVJvdXRlcyhcbiAgICAgICAgICAgICAgdGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3ksIHN0YXRlLCBzdG9yZWRTdGF0ZSwgKGV2dDogRXZlbnQpID0+IHRoaXMudHJpZ2dlckV2ZW50KGV2dCkpXG4gICAgICAgICAgICAgIC5hY3RpdmF0ZSh0aGlzLnJvb3RDb250ZXh0cyk7XG5cbiAgICAgICAgICBuYXZpZ2F0aW9uSXNTdWNjZXNzZnVsID0gdHJ1ZTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChuYXZpZ2F0aW9uSXNTdWNjZXNzZnVsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5uYXZpZ2F0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCA9IGlkO1xuICAgICAgICAgICAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAgICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25FbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICBpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgdGhpcy5zZXJpYWxpemVVcmwodGhpcy5jdXJyZW50VXJsVHJlZSkpKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlUHJvbWlzZSh0cnVlKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgICAgICAgICAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAgICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25DYW5jZWwoaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksICcnKSk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZVByb21pc2UoZmFsc2UpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgKGU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICBpZiAoaXNOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoZSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5hdmlnYXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldFN0YXRlQW5kVXJsKHN0b3JlZFN0YXRlLCBzdG9yZWRVcmwsIHJhd1VybCk7XG4gICAgICAgICAgICAgICAgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KVxuICAgICAgICAgICAgICAgICAgICAubmV4dChuZXcgTmF2aWdhdGlvbkNhbmNlbChpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgZS5tZXNzYWdlKSk7XG5cbiAgICAgICAgICAgICAgICByZXNvbHZlUHJvbWlzZShmYWxzZSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldFN0YXRlQW5kVXJsKHN0b3JlZFN0YXRlLCBzdG9yZWRVcmwsIHJhd1VybCk7XG4gICAgICAgICAgICAgICAgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KVxuICAgICAgICAgICAgICAgICAgICAubmV4dChuZXcgTmF2aWdhdGlvbkVycm9yKGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCBlKSk7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIHJlc29sdmVQcm9taXNlKHRoaXMuZXJyb3JIYW5kbGVyKGUpKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlZSkge1xuICAgICAgICAgICAgICAgICAgcmVqZWN0UHJvbWlzZShlZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0QnJvd3NlclVybCh1cmw6IFVybFRyZWUsIHJlcGxhY2VVcmw6IGJvb2xlYW4sIGlkOiBudW1iZXIpIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICAgIGlmICh0aGlzLmxvY2F0aW9uLmlzQ3VycmVudFBhdGhFcXVhbFRvKHBhdGgpIHx8IHJlcGxhY2VVcmwpIHtcbiAgICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKHBhdGgsICcnLCB7bmF2aWdhdGlvbklkOiBpZH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxvY2F0aW9uLmdvKHBhdGgsICcnLCB7bmF2aWdhdGlvbklkOiBpZH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRTdGF0ZUFuZFVybChzdG9yZWRTdGF0ZTogUm91dGVyU3RhdGUsIHN0b3JlZFVybDogVXJsVHJlZSwgcmF3VXJsOiBVcmxUcmVlKTogdm9pZCB7XG4gICAgKHRoaXMgYXN7cm91dGVyU3RhdGU6IFJvdXRlclN0YXRlfSkucm91dGVyU3RhdGUgPSBzdG9yZWRTdGF0ZTtcbiAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gc3RvcmVkVXJsO1xuICAgIHRoaXMucmF3VXJsVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCByYXdVcmwpO1xuICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gIH1cblxuICBwcml2YXRlIHJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpOiB2b2lkIHtcbiAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShcbiAgICAgICAgdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh0aGlzLnJhd1VybFRyZWUpLCAnJywge25hdmlnYXRpb25JZDogdGhpcy5sYXN0U3VjY2Vzc2Z1bElkfSk7XG4gIH1cbn1cblxuY2xhc3MgQWN0aXZhdGVSb3V0ZXMge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm91dGVSZXVzZVN0cmF0ZWd5OiBSb3V0ZVJldXNlU3RyYXRlZ3ksIHByaXZhdGUgZnV0dXJlU3RhdGU6IFJvdXRlclN0YXRlLFxuICAgICAgcHJpdmF0ZSBjdXJyU3RhdGU6IFJvdXRlclN0YXRlLCBwcml2YXRlIGZvcndhcmRFdmVudDogKGV2dDogRXZlbnQpID0+IHZvaWQpIHt9XG5cbiAgYWN0aXZhdGUocGFyZW50Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICBjb25zdCBmdXR1cmVSb290ID0gdGhpcy5mdXR1cmVTdGF0ZS5fcm9vdDtcbiAgICBjb25zdCBjdXJyUm9vdCA9IHRoaXMuY3VyclN0YXRlID8gdGhpcy5jdXJyU3RhdGUuX3Jvb3QgOiBudWxsO1xuXG4gICAgdGhpcy5kZWFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlUm9vdCwgY3VyclJvb3QsIHBhcmVudENvbnRleHRzKTtcbiAgICBhZHZhbmNlQWN0aXZhdGVkUm91dGUodGhpcy5mdXR1cmVTdGF0ZS5yb290KTtcbiAgICB0aGlzLmFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlUm9vdCwgY3VyclJvb3QsIHBhcmVudENvbnRleHRzKTtcbiAgfVxuXG4gIC8vIERlLWFjdGl2YXRlIHRoZSBjaGlsZCByb3V0ZSB0aGF0IGFyZSBub3QgcmUtdXNlZCBmb3IgdGhlIGZ1dHVyZSBzdGF0ZVxuICBwcml2YXRlIGRlYWN0aXZhdGVDaGlsZFJvdXRlcyhcbiAgICAgIGZ1dHVyZU5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPiwgY3Vyck5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPnxudWxsLFxuICAgICAgY29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICBjb25zdCBjaGlsZHJlbjoge1tvdXRsZXROYW1lOiBzdHJpbmddOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT59ID0gbm9kZUNoaWxkcmVuQXNNYXAoY3Vyck5vZGUpO1xuXG4gICAgLy8gUmVjdXJzZSBvbiB0aGUgcm91dGVzIGFjdGl2ZSBpbiB0aGUgZnV0dXJlIHN0YXRlIHRvIGRlLWFjdGl2YXRlIGRlZXBlciBjaGlsZHJlblxuICAgIGZ1dHVyZU5vZGUuY2hpbGRyZW4uZm9yRWFjaChmdXR1cmVDaGlsZCA9PiB7XG4gICAgICBjb25zdCBjaGlsZE91dGxldE5hbWUgPSBmdXR1cmVDaGlsZC52YWx1ZS5vdXRsZXQ7XG4gICAgICB0aGlzLmRlYWN0aXZhdGVSb3V0ZXMoZnV0dXJlQ2hpbGQsIGNoaWxkcmVuW2NoaWxkT3V0bGV0TmFtZV0sIGNvbnRleHRzKTtcbiAgICAgIGRlbGV0ZSBjaGlsZHJlbltjaGlsZE91dGxldE5hbWVdO1xuICAgIH0pO1xuXG4gICAgLy8gRGUtYWN0aXZhdGUgdGhlIHJvdXRlcyB0aGF0IHdpbGwgbm90IGJlIHJlLXVzZWRcbiAgICBmb3JFYWNoKGNoaWxkcmVuLCAodjogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LCBjaGlsZE5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgdGhpcy5kZWFjdGl2YXRlUm91dGVBbmRJdHNDaGlsZHJlbih2LCBjb250ZXh0cyk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGRlYWN0aXZhdGVSb3V0ZXMoXG4gICAgICBmdXR1cmVOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sIGN1cnJOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sXG4gICAgICBwYXJlbnRDb250ZXh0OiBDaGlsZHJlbk91dGxldENvbnRleHRzKTogdm9pZCB7XG4gICAgY29uc3QgZnV0dXJlID0gZnV0dXJlTm9kZS52YWx1ZTtcbiAgICBjb25zdCBjdXJyID0gY3Vyck5vZGUgPyBjdXJyTm9kZS52YWx1ZSA6IG51bGw7XG5cbiAgICBpZiAoZnV0dXJlID09PSBjdXJyKSB7XG4gICAgICAvLyBSZXVzaW5nIHRoZSBub2RlLCBjaGVjayB0byBzZWUgaWYgdGhlIGNoaWxkcmVuIG5lZWQgdG8gYmUgZGUtYWN0aXZhdGVkXG4gICAgICBpZiAoZnV0dXJlLmNvbXBvbmVudCkge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbm9ybWFsIHJvdXRlLCB3ZSBuZWVkIHRvIGdvIHRocm91Z2ggYW4gb3V0bGV0LlxuICAgICAgICBjb25zdCBjb250ZXh0ID0gcGFyZW50Q29udGV4dC5nZXRDb250ZXh0KGZ1dHVyZS5vdXRsZXQpO1xuICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgIHRoaXMuZGVhY3RpdmF0ZUNoaWxkUm91dGVzKGZ1dHVyZU5vZGUsIGN1cnJOb2RlLCBjb250ZXh0LmNoaWxkcmVuKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIGNvbXBvbmVudGxlc3Mgcm91dGUsIHdlIHJlY3Vyc2UgYnV0IGtlZXAgdGhlIHNhbWUgb3V0bGV0IG1hcC5cbiAgICAgICAgdGhpcy5kZWFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlTm9kZSwgY3Vyck5vZGUsIHBhcmVudENvbnRleHQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoY3Vycikge1xuICAgICAgICAvLyBEZWFjdGl2YXRlIHRoZSBjdXJyZW50IHJvdXRlIHdoaWNoIHdpbGwgbm90IGJlIHJlLXVzZWRcbiAgICAgICAgdGhpcy5kZWFjdGl2YXRlUm91dGVBbmRJdHNDaGlsZHJlbihjdXJyTm9kZSwgcGFyZW50Q29udGV4dCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBkZWFjdGl2YXRlUm91dGVBbmRJdHNDaGlsZHJlbihcbiAgICAgIHJvdXRlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sIHBhcmVudENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LnNob3VsZERldGFjaChyb3V0ZS52YWx1ZS5zbmFwc2hvdCkpIHtcbiAgICAgIHRoaXMuZGV0YWNoQW5kU3RvcmVSb3V0ZVN1YnRyZWUocm91dGUsIHBhcmVudENvbnRleHRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kZWFjdGl2YXRlUm91dGVBbmRPdXRsZXQocm91dGUsIHBhcmVudENvbnRleHRzKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGRldGFjaEFuZFN0b3JlUm91dGVTdWJ0cmVlKFxuICAgICAgcm91dGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPiwgcGFyZW50Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICBjb25zdCBjb250ZXh0ID0gcGFyZW50Q29udGV4dHMuZ2V0Q29udGV4dChyb3V0ZS52YWx1ZS5vdXRsZXQpO1xuICAgIGlmIChjb250ZXh0ICYmIGNvbnRleHQub3V0bGV0KSB7XG4gICAgICBjb25zdCBjb21wb25lbnRSZWYgPSBjb250ZXh0Lm91dGxldC5kZXRhY2goKTtcbiAgICAgIGNvbnN0IGNvbnRleHRzID0gY29udGV4dC5jaGlsZHJlbi5vbk91dGxldERlYWN0aXZhdGVkKCk7XG4gICAgICB0aGlzLnJvdXRlUmV1c2VTdHJhdGVneS5zdG9yZShyb3V0ZS52YWx1ZS5zbmFwc2hvdCwge2NvbXBvbmVudFJlZiwgcm91dGUsIGNvbnRleHRzfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBkZWFjdGl2YXRlUm91dGVBbmRPdXRsZXQoXG4gICAgICByb3V0ZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LCBwYXJlbnRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk6IHZvaWQge1xuICAgIGNvbnN0IGNvbnRleHQgPSBwYXJlbnRDb250ZXh0cy5nZXRDb250ZXh0KHJvdXRlLnZhbHVlLm91dGxldCk7XG5cbiAgICBpZiAoY29udGV4dCkge1xuICAgICAgY29uc3QgY2hpbGRyZW46IHtbb3V0bGV0TmFtZTogc3RyaW5nXTogYW55fSA9IG5vZGVDaGlsZHJlbkFzTWFwKHJvdXRlKTtcbiAgICAgIGNvbnN0IGNvbnRleHRzID0gcm91dGUudmFsdWUuY29tcG9uZW50ID8gY29udGV4dC5jaGlsZHJlbiA6IHBhcmVudENvbnRleHRzO1xuXG4gICAgICBmb3JFYWNoKGNoaWxkcmVuLCAodjogYW55LCBrOiBzdHJpbmcpID0+IHRoaXMuZGVhY3RpdmF0ZVJvdXRlQW5kSXRzQ2hpbGRyZW4odiwgY29udGV4dHMpKTtcblxuICAgICAgaWYgKGNvbnRleHQub3V0bGV0KSB7XG4gICAgICAgIC8vIERlc3Ryb3kgdGhlIGNvbXBvbmVudFxuICAgICAgICBjb250ZXh0Lm91dGxldC5kZWFjdGl2YXRlKCk7XG4gICAgICAgIC8vIERlc3Ryb3kgdGhlIGNvbnRleHRzIGZvciBhbGwgdGhlIG91dGxldHMgdGhhdCB3ZXJlIGluIHRoZSBjb21wb25lbnRcbiAgICAgICAgY29udGV4dC5jaGlsZHJlbi5vbk91dGxldERlYWN0aXZhdGVkKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhY3RpdmF0ZUNoaWxkUm91dGVzKFxuICAgICAgZnV0dXJlTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LCBjdXJyTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+fG51bGwsXG4gICAgICBjb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk6IHZvaWQge1xuICAgIGNvbnN0IGNoaWxkcmVuOiB7W291dGxldDogc3RyaW5nXTogYW55fSA9IG5vZGVDaGlsZHJlbkFzTWFwKGN1cnJOb2RlKTtcbiAgICBmdXR1cmVOb2RlLmNoaWxkcmVuLmZvckVhY2goYyA9PiB7XG4gICAgICB0aGlzLmFjdGl2YXRlUm91dGVzKGMsIGNoaWxkcmVuW2MudmFsdWUub3V0bGV0XSwgY29udGV4dHMpO1xuICAgICAgdGhpcy5mb3J3YXJkRXZlbnQobmV3IEFjdGl2YXRpb25FbmQoYy52YWx1ZS5zbmFwc2hvdCkpO1xuICAgIH0pO1xuICAgIGlmIChmdXR1cmVOb2RlLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgdGhpcy5mb3J3YXJkRXZlbnQobmV3IENoaWxkQWN0aXZhdGlvbkVuZChmdXR1cmVOb2RlLnZhbHVlLnNuYXBzaG90KSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhY3RpdmF0ZVJvdXRlcyhcbiAgICAgIGZ1dHVyZU5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPiwgY3Vyck5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPixcbiAgICAgIHBhcmVudENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzKTogdm9pZCB7XG4gICAgY29uc3QgZnV0dXJlID0gZnV0dXJlTm9kZS52YWx1ZTtcbiAgICBjb25zdCBjdXJyID0gY3Vyck5vZGUgPyBjdXJyTm9kZS52YWx1ZSA6IG51bGw7XG5cbiAgICBhZHZhbmNlQWN0aXZhdGVkUm91dGUoZnV0dXJlKTtcblxuICAgIC8vIHJldXNpbmcgdGhlIG5vZGVcbiAgICBpZiAoZnV0dXJlID09PSBjdXJyKSB7XG4gICAgICBpZiAoZnV0dXJlLmNvbXBvbmVudCkge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbm9ybWFsIHJvdXRlLCB3ZSBuZWVkIHRvIGdvIHRocm91Z2ggYW4gb3V0bGV0LlxuICAgICAgICBjb25zdCBjb250ZXh0ID0gcGFyZW50Q29udGV4dHMuZ2V0T3JDcmVhdGVDb250ZXh0KGZ1dHVyZS5vdXRsZXQpO1xuICAgICAgICB0aGlzLmFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlTm9kZSwgY3Vyck5vZGUsIGNvbnRleHQuY2hpbGRyZW4pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIGNvbXBvbmVudGxlc3Mgcm91dGUsIHdlIHJlY3Vyc2UgYnV0IGtlZXAgdGhlIHNhbWUgb3V0bGV0IG1hcC5cbiAgICAgICAgdGhpcy5hY3RpdmF0ZUNoaWxkUm91dGVzKGZ1dHVyZU5vZGUsIGN1cnJOb2RlLCBwYXJlbnRDb250ZXh0cyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChmdXR1cmUuY29tcG9uZW50KSB7XG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSBub3JtYWwgcm91dGUsIHdlIG5lZWQgdG8gcGxhY2UgdGhlIGNvbXBvbmVudCBpbnRvIHRoZSBvdXRsZXQgYW5kIHJlY3Vyc2UuXG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBwYXJlbnRDb250ZXh0cy5nZXRPckNyZWF0ZUNvbnRleHQoZnV0dXJlLm91dGxldCk7XG5cbiAgICAgICAgaWYgKHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LnNob3VsZEF0dGFjaChmdXR1cmUuc25hcHNob3QpKSB7XG4gICAgICAgICAgY29uc3Qgc3RvcmVkID1cbiAgICAgICAgICAgICAgKDxEZXRhY2hlZFJvdXRlSGFuZGxlSW50ZXJuYWw+dGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3kucmV0cmlldmUoZnV0dXJlLnNuYXBzaG90KSk7XG4gICAgICAgICAgdGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3kuc3RvcmUoZnV0dXJlLnNuYXBzaG90LCBudWxsKTtcbiAgICAgICAgICBjb250ZXh0LmNoaWxkcmVuLm9uT3V0bGV0UmVBdHRhY2hlZChzdG9yZWQuY29udGV4dHMpO1xuICAgICAgICAgIGNvbnRleHQuYXR0YWNoUmVmID0gc3RvcmVkLmNvbXBvbmVudFJlZjtcbiAgICAgICAgICBjb250ZXh0LnJvdXRlID0gc3RvcmVkLnJvdXRlLnZhbHVlO1xuICAgICAgICAgIGlmIChjb250ZXh0Lm91dGxldCkge1xuICAgICAgICAgICAgLy8gQXR0YWNoIHJpZ2h0IGF3YXkgd2hlbiB0aGUgb3V0bGV0IGhhcyBhbHJlYWR5IGJlZW4gaW5zdGFudGlhdGVkXG4gICAgICAgICAgICAvLyBPdGhlcndpc2UgYXR0YWNoIGZyb20gYFJvdXRlck91dGxldC5uZ09uSW5pdGAgd2hlbiBpdCBpcyBpbnN0YW50aWF0ZWRcbiAgICAgICAgICAgIGNvbnRleHQub3V0bGV0LmF0dGFjaChzdG9yZWQuY29tcG9uZW50UmVmLCBzdG9yZWQucm91dGUudmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhZHZhbmNlQWN0aXZhdGVkUm91dGVOb2RlQW5kSXRzQ2hpbGRyZW4oc3RvcmVkLnJvdXRlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBjb25maWcgPSBwYXJlbnRMb2FkZWRDb25maWcoZnV0dXJlLnNuYXBzaG90KTtcbiAgICAgICAgICBjb25zdCBjbXBGYWN0b3J5UmVzb2x2ZXIgPSBjb25maWcgPyBjb25maWcubW9kdWxlLmNvbXBvbmVudEZhY3RvcnlSZXNvbHZlciA6IG51bGw7XG5cbiAgICAgICAgICBjb250ZXh0LnJvdXRlID0gZnV0dXJlO1xuICAgICAgICAgIGNvbnRleHQucmVzb2x2ZXIgPSBjbXBGYWN0b3J5UmVzb2x2ZXI7XG4gICAgICAgICAgaWYgKGNvbnRleHQub3V0bGV0KSB7XG4gICAgICAgICAgICAvLyBBY3RpdmF0ZSB0aGUgb3V0bGV0IHdoZW4gaXQgaGFzIGFscmVhZHkgYmVlbiBpbnN0YW50aWF0ZWRcbiAgICAgICAgICAgIC8vIE90aGVyd2lzZSBpdCB3aWxsIGdldCBhY3RpdmF0ZWQgZnJvbSBpdHMgYG5nT25Jbml0YCB3aGVuIGluc3RhbnRpYXRlZFxuICAgICAgICAgICAgY29udGV4dC5vdXRsZXQuYWN0aXZhdGVXaXRoKGZ1dHVyZSwgY21wRmFjdG9yeVJlc29sdmVyKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLmFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlTm9kZSwgbnVsbCwgY29udGV4dC5jaGlsZHJlbik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSBjb21wb25lbnRsZXNzIHJvdXRlLCB3ZSByZWN1cnNlIGJ1dCBrZWVwIHRoZSBzYW1lIG91dGxldCBtYXAuXG4gICAgICAgIHRoaXMuYWN0aXZhdGVDaGlsZFJvdXRlcyhmdXR1cmVOb2RlLCBudWxsLCBwYXJlbnRDb250ZXh0cyk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFkdmFuY2VBY3RpdmF0ZWRSb3V0ZU5vZGVBbmRJdHNDaGlsZHJlbihub2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4pOiB2b2lkIHtcbiAgYWR2YW5jZUFjdGl2YXRlZFJvdXRlKG5vZGUudmFsdWUpO1xuICBub2RlLmNoaWxkcmVuLmZvckVhY2goYWR2YW5jZUFjdGl2YXRlZFJvdXRlTm9kZUFuZEl0c0NoaWxkcmVuKTtcbn1cblxuZnVuY3Rpb24gcGFyZW50TG9hZGVkQ29uZmlnKHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogTG9hZGVkUm91dGVyQ29uZmlnfG51bGwge1xuICBmb3IgKGxldCBzID0gc25hcHNob3QucGFyZW50OyBzOyBzID0gcy5wYXJlbnQpIHtcbiAgICBjb25zdCByb3V0ZSA9IHMucm91dGVDb25maWc7XG4gICAgaWYgKHJvdXRlICYmIHJvdXRlLl9sb2FkZWRDb25maWcpIHJldHVybiByb3V0ZS5fbG9hZGVkQ29uZmlnO1xuICAgIGlmIChyb3V0ZSAmJiByb3V0ZS5jb21wb25lbnQpIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHM6IHN0cmluZ1tdKTogdm9pZCB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29tbWFuZHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjbWQgPSBjb21tYW5kc1tpXTtcbiAgICBpZiAoY21kID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIHJlcXVlc3RlZCBwYXRoIGNvbnRhaW5zICR7Y21kfSBzZWdtZW50IGF0IGluZGV4ICR7aX1gKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==