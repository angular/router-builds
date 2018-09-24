/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NgModuleRef, NgZone, isDevMode, ɵConsole as Console } from '@angular/core';
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
        this.isNgZoneEnabled = false;
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
        this.console = injector.get(Console);
        const ngZone = injector.get(NgZone);
        this.isNgZoneEnabled = ngZone instanceof NgZone;
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
    triggerEvent(event) { this.events.next(event); }
    /**
     * Resets the configuration used for navigation and generating links.
     *
     * @usageNotes
     *
     * ### Example
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
     * @usageNotes
     *
     * ### Example
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
     * @usageNotes
     *
     * ### Example
     *
     * ```
     * router.navigateByUrl("/team/33/user/11");
     *
     * // Navigate without updating the URL
     * router.navigateByUrl("/team/33/user/11", { skipLocationChange: true });
     * ```
     *
     * Since `navigateByUrl()` takes an absolute URL as the first parameter,
     * it will not apply any delta to the current URL and ignores any properties
     * in the second parameter (the `NavigationExtras`) that would change the
     * provided URL.
     */
    navigateByUrl(url, extras = { skipLocationChange: false }) {
        if (isDevMode() && this.isNgZoneEnabled && !NgZone.isInAngularZone()) {
            this.console.warn(`Navigation triggered outside Angular zone, did you forget to call 'ngZone.run()'?`);
        }
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
     * @usageNotes
     *
     * ### Example
     *
     * ```
     * router.navigate(['team', 33, 'user', 11], {relativeTo: route});
     *
     * // Navigate without updating the URL
     * router.navigate(['team', 33, 'user', 11], {relativeTo: route, skipLocationChange: true});
     * ```
     *
     * The first parameter of `navigate()` is a delta to be applied to the current URL
     * or the one provided in the `relativeTo` property of the second parameter (the
     * `NavigationExtras`).
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
                    context.attachRef = null;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUE0QyxXQUFXLEVBQUUsTUFBTSxFQUFrQixTQUFTLEVBQUUsUUFBUSxJQUFJLE9BQU8sRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUM3SSxPQUFPLEVBQUMsZUFBZSxFQUFjLE9BQU8sRUFBZ0IsRUFBRSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQzdFLE9BQU8sRUFBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRXhELE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRCxPQUFPLEVBQXlELGlCQUFpQixFQUFFLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNuSCxPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUN4RCxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDaEQsT0FBTyxFQUFDLGFBQWEsRUFBRSxrQkFBa0IsRUFBUyxjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQXFCLFVBQVUsRUFBRSxZQUFZLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDaFIsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxhQUFhLENBQUM7QUFDdEMsT0FBTyxFQUFDLHlCQUF5QixFQUFrRCxNQUFNLHdCQUF3QixDQUFDO0FBQ2xILE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBRTFELE9BQU8s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SSxDQUFDO0tBQzNDO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFrQjtJQUMxQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUN4QyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsR0FBRyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUM3RTtLQUNGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7Q29tcGlsZXIsIEluamVjdG9yLCBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIE5nTW9kdWxlUmVmLCBOZ1pvbmUsIE9wdGlvbmFsLCBUeXBlLCBpc0Rldk1vZGUsIMm1Q29uc29sZSBhcyBDb25zb2xlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7QmVoYXZpb3JTdWJqZWN0LCBPYnNlcnZhYmxlLCBTdWJqZWN0LCBTdWJzY3JpcHRpb24sIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NvbmNhdE1hcCwgbWFwLCBtZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge2FwcGx5UmVkaXJlY3RzfSBmcm9tICcuL2FwcGx5X3JlZGlyZWN0cyc7XG5pbXBvcnQge0xvYWRlZFJvdXRlckNvbmZpZywgUXVlcnlQYXJhbXNIYW5kbGluZywgUm91dGUsIFJvdXRlcywgc3RhbmRhcmRpemVDb25maWcsIHZhbGlkYXRlQ29uZmlnfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge2NyZWF0ZVJvdXRlclN0YXRlfSBmcm9tICcuL2NyZWF0ZV9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtjcmVhdGVVcmxUcmVlfSBmcm9tICcuL2NyZWF0ZV91cmxfdHJlZSc7XG5pbXBvcnQge0FjdGl2YXRpb25FbmQsIENoaWxkQWN0aXZhdGlvbkVuZCwgRXZlbnQsIEd1YXJkc0NoZWNrRW5kLCBHdWFyZHNDaGVja1N0YXJ0LCBOYXZpZ2F0aW9uQ2FuY2VsLCBOYXZpZ2F0aW9uRW5kLCBOYXZpZ2F0aW9uRXJyb3IsIE5hdmlnYXRpb25TdGFydCwgTmF2aWdhdGlvblRyaWdnZXIsIFJlc29sdmVFbmQsIFJlc29sdmVTdGFydCwgUm91dGVDb25maWdMb2FkRW5kLCBSb3V0ZUNvbmZpZ0xvYWRTdGFydCwgUm91dGVzUmVjb2duaXplZH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtQcmVBY3RpdmF0aW9ufSBmcm9tICcuL3ByZV9hY3RpdmF0aW9uJztcbmltcG9ydCB7cmVjb2duaXplfSBmcm9tICcuL3JlY29nbml6ZSc7XG5pbXBvcnQge0RlZmF1bHRSb3V0ZVJldXNlU3RyYXRlZ3ksIERldGFjaGVkUm91dGVIYW5kbGVJbnRlcm5hbCwgUm91dGVSZXVzZVN0cmF0ZWd5fSBmcm9tICcuL3JvdXRlX3JldXNlX3N0cmF0ZWd5JztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0c30gZnJvbSAnLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZSwgQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgUm91dGVyU3RhdGUsIFJvdXRlclN0YXRlU25hcHNob3QsIGFkdmFuY2VBY3RpdmF0ZWRSb3V0ZSwgY3JlYXRlRW1wdHlTdGF0ZSwgaW5oZXJpdGVkUGFyYW1zRGF0YVJlc29sdmV9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UGFyYW1zLCBpc05hdmlnYXRpb25DYW5jZWxpbmdFcnJvcn0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtEZWZhdWx0VXJsSGFuZGxpbmdTdHJhdGVneSwgVXJsSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi91cmxfaGFuZGxpbmdfc3RyYXRlZ3knO1xuaW1wb3J0IHtVcmxTZXJpYWxpemVyLCBVcmxUcmVlLCBjb250YWluc1RyZWUsIGNyZWF0ZUVtcHR5VXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge2ZvckVhY2h9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge1RyZWVOb2RlLCBub2RlQ2hpbGRyZW5Bc01hcH0gZnJvbSAnLi91dGlscy90cmVlJztcblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIGV4dHJhIG9wdGlvbnMgdXNlZCBkdXJpbmcgbmF2aWdhdGlvbi5cbiAqXG4gKlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5hdmlnYXRpb25FeHRyYXMge1xuICAvKipcbiAgICogRW5hYmxlcyByZWxhdGl2ZSBuYXZpZ2F0aW9uIGZyb20gdGhlIGN1cnJlbnQgQWN0aXZhdGVkUm91dGUuXG4gICAqXG4gICAqIENvbmZpZ3VyYXRpb246XG4gICAqXG4gICAqIGBgYFxuICAgKiBbe1xuICAqICAgcGF0aDogJ3BhcmVudCcsXG4gICogICBjb21wb25lbnQ6IFBhcmVudENvbXBvbmVudCxcbiAgKiAgIGNoaWxkcmVuOiBbe1xuICAqICAgICBwYXRoOiAnbGlzdCcsXG4gICogICAgIGNvbXBvbmVudDogTGlzdENvbXBvbmVudFxuICAqICAgfSx7XG4gICogICAgIHBhdGg6ICdjaGlsZCcsXG4gICogICAgIGNvbXBvbmVudDogQ2hpbGRDb21wb25lbnRcbiAgKiAgIH1dXG4gICogfV1cbiAgICogYGBgXG4gICAqXG4gICAqIE5hdmlnYXRlIHRvIGxpc3Qgcm91dGUgZnJvbSBjaGlsZCByb3V0ZTpcbiAgICpcbiAgICogYGBgXG4gICAqICBAQ29tcG9uZW50KHsuLi59KVxuICAgKiAgY2xhc3MgQ2hpbGRDb21wb25lbnQge1xuICAqICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsIHByaXZhdGUgcm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7fVxuICAqXG4gICogICAgZ28oKSB7XG4gICogICAgICB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy4uL2xpc3QnXSwgeyByZWxhdGl2ZVRvOiB0aGlzLnJvdXRlIH0pO1xuICAqICAgIH1cbiAgKiAgfVxuICAgKiBgYGBcbiAgICovXG4gIHJlbGF0aXZlVG8/OiBBY3RpdmF0ZWRSb3V0ZXxudWxsO1xuXG4gIC8qKlxuICAgKiBTZXRzIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gdGhlIFVSTC5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHRvIC9yZXN1bHRzP3BhZ2U9MVxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy9yZXN1bHRzJ10sIHsgcXVlcnlQYXJhbXM6IHsgcGFnZTogMSB9IH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHF1ZXJ5UGFyYW1zPzogUGFyYW1zfG51bGw7XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGhhc2ggZnJhZ21lbnQgZm9yIHRoZSBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvcmVzdWx0cyN0b3BcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvcmVzdWx0cyddLCB7IGZyYWdtZW50OiAndG9wJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudD86IHN0cmluZztcblxuICAvKipcbiAgICogUHJlc2VydmVzIHRoZSBxdWVyeSBwYXJhbWV0ZXJzIGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBkZXByZWNhdGVkLCB1c2UgYHF1ZXJ5UGFyYW1zSGFuZGxpbmdgIGluc3RlYWRcbiAgICpcbiAgICogYGBgXG4gICAqIC8vIFByZXNlcnZlIHF1ZXJ5IHBhcmFtcyBmcm9tIC9yZXN1bHRzP3BhZ2U9MSB0byAvdmlldz9wYWdlPTFcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHByZXNlcnZlUXVlcnlQYXJhbXM6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBzaW5jZSB2NFxuICAgKi9cbiAgcHJlc2VydmVRdWVyeVBhcmFtcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqICBjb25maWcgc3RyYXRlZ3kgdG8gaGFuZGxlIHRoZSBxdWVyeSBwYXJhbWV0ZXJzIGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gZnJvbSAvcmVzdWx0cz9wYWdlPTEgdG8gL3ZpZXc/cGFnZT0xJnBhZ2U9MlxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgcXVlcnlQYXJhbXM6IHsgcGFnZTogMiB9LCAgcXVlcnlQYXJhbXNIYW5kbGluZzogXCJtZXJnZVwiIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHF1ZXJ5UGFyYW1zSGFuZGxpbmc/OiBRdWVyeVBhcmFtc0hhbmRsaW5nfG51bGw7XG4gIC8qKlxuICAgKiBQcmVzZXJ2ZXMgdGhlIGZyYWdtZW50IGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBQcmVzZXJ2ZSBmcmFnbWVudCBmcm9tIC9yZXN1bHRzI3RvcCB0byAvdmlldyN0b3BcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHByZXNlcnZlRnJhZ21lbnQ6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcHJlc2VydmVGcmFnbWVudD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBOYXZpZ2F0ZXMgd2l0aG91dCBwdXNoaW5nIGEgbmV3IHN0YXRlIGludG8gaGlzdG9yeS5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHNpbGVudGx5IHRvIC92aWV3XG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgc2tpcExvY2F0aW9uQ2hhbmdlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIE5hdmlnYXRlcyB3aGlsZSByZXBsYWNpbmcgdGhlIGN1cnJlbnQgc3RhdGUgaW4gaGlzdG9yeS5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHRvIC92aWV3XG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyByZXBsYWNlVXJsOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHJlcGxhY2VVcmw/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEVycm9yIGhhbmRsZXIgdGhhdCBpcyBpbnZva2VkIHdoZW4gYSBuYXZpZ2F0aW9uIGVycm9ycy5cbiAqXG4gKiBJZiB0aGUgaGFuZGxlciByZXR1cm5zIGEgdmFsdWUsIHRoZSBuYXZpZ2F0aW9uIHByb21pc2Ugd2lsbCBiZSByZXNvbHZlZCB3aXRoIHRoaXMgdmFsdWUuXG4gKiBJZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLCB0aGUgbmF2aWdhdGlvbiBwcm9taXNlIHdpbGwgYmUgcmVqZWN0ZWQgd2l0aFxuICogdGhlIGV4Y2VwdGlvbi5cbiAqXG4gKlxuICovXG5leHBvcnQgdHlwZSBFcnJvckhhbmRsZXIgPSAoZXJyb3I6IGFueSkgPT4gYW55O1xuXG5mdW5jdGlvbiBkZWZhdWx0RXJyb3JIYW5kbGVyKGVycm9yOiBhbnkpOiBhbnkge1xuICB0aHJvdyBlcnJvcjtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdE1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcihcbiAgICBlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gIHJldHVybiB1cmxTZXJpYWxpemVyLnBhcnNlKCcvJyk7XG59XG5cbnR5cGUgTmF2U3RyZWFtVmFsdWUgPVxuICAgIGJvb2xlYW4gfCB7YXBwbGllZFVybDogVXJsVHJlZSwgc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QsIHNob3VsZEFjdGl2YXRlPzogYm9vbGVhbn07XG5cbnR5cGUgTmF2aWdhdGlvblBhcmFtcyA9IHtcbiAgaWQ6IG51bWJlcixcbiAgcmF3VXJsOiBVcmxUcmVlLFxuICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMsXG4gIHJlc29sdmU6IGFueSxcbiAgcmVqZWN0OiBhbnksXG4gIHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj4sXG4gIHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIsXG4gIHN0YXRlOiB7bmF2aWdhdGlvbklkOiBudW1iZXJ9IHwgbnVsbFxufTtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IHR5cGUgUm91dGVySG9vayA9IChzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCwgcnVuRXh0cmFzOiB7XG4gIGFwcGxpZWRVcmxUcmVlOiBVcmxUcmVlLFxuICByYXdVcmxUcmVlOiBVcmxUcmVlLFxuICBza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW4sXG4gIHJlcGxhY2VVcmw6IGJvb2xlYW4sXG4gIG5hdmlnYXRpb25JZDogbnVtYmVyXG59KSA9PiBPYnNlcnZhYmxlPHZvaWQ+O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBkZWZhdWx0Um91dGVySG9vayhzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCwgcnVuRXh0cmFzOiB7XG4gIGFwcGxpZWRVcmxUcmVlOiBVcmxUcmVlLFxuICByYXdVcmxUcmVlOiBVcmxUcmVlLFxuICBza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW4sXG4gIHJlcGxhY2VVcmw6IGJvb2xlYW4sXG4gIG5hdmlnYXRpb25JZDogbnVtYmVyXG59KTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gIHJldHVybiBvZiAobnVsbCkgYXMgYW55O1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIHRoZSBuYXZpZ2F0aW9uIGFuZCB1cmwgbWFuaXB1bGF0aW9uIGNhcGFiaWxpdGllcy5cbiAqXG4gKiBTZWUgYFJvdXRlc2AgZm9yIG1vcmUgZGV0YWlscyBhbmQgZXhhbXBsZXMuXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZXIge1xuICBwcml2YXRlIGN1cnJlbnRVcmxUcmVlOiBVcmxUcmVlO1xuICBwcml2YXRlIHJhd1VybFRyZWU6IFVybFRyZWU7XG4gIHByaXZhdGUgbmF2aWdhdGlvbnMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PE5hdmlnYXRpb25QYXJhbXM+KG51bGwgISk7XG5cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgbG9jYXRpb25TdWJzY3JpcHRpb24gITogU3Vic2NyaXB0aW9uO1xuICBwcml2YXRlIG5hdmlnYXRpb25JZDogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBjb25maWdMb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcjtcbiAgcHJpdmF0ZSBuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55PjtcbiAgcHJpdmF0ZSBjb25zb2xlOiBDb25zb2xlO1xuICBwcml2YXRlIGlzTmdab25lRW5hYmxlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIHB1YmxpYyByZWFkb25seSBldmVudHM6IE9ic2VydmFibGU8RXZlbnQ+ID0gbmV3IFN1YmplY3Q8RXZlbnQ+KCk7XG4gIHB1YmxpYyByZWFkb25seSByb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGU7XG5cbiAgLyoqXG4gICAqIEVycm9yIGhhbmRsZXIgdGhhdCBpcyBpbnZva2VkIHdoZW4gYSBuYXZpZ2F0aW9uIGVycm9ycy5cbiAgICpcbiAgICogU2VlIGBFcnJvckhhbmRsZXJgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICAgKi9cbiAgZXJyb3JIYW5kbGVyOiBFcnJvckhhbmRsZXIgPSBkZWZhdWx0RXJyb3JIYW5kbGVyO1xuXG4gIC8qKlxuICAgKiBNYWxmb3JtZWQgdXJpIGVycm9yIGhhbmRsZXIgaXMgaW52b2tlZCB3aGVuIGBSb3V0ZXIucGFyc2VVcmwodXJsKWAgdGhyb3dzIGFuXG4gICAqIGVycm9yIGR1ZSB0byBjb250YWluaW5nIGFuIGludmFsaWQgY2hhcmFjdGVyLiBUaGUgbW9zdCBjb21tb24gY2FzZSB3b3VsZCBiZSBhIGAlYCBzaWduXG4gICAqIHRoYXQncyBub3QgZW5jb2RlZCBhbmQgaXMgbm90IHBhcnQgb2YgYSBwZXJjZW50IGVuY29kZWQgc2VxdWVuY2UuXG4gICAqL1xuICBtYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI6XG4gICAgICAoZXJyb3I6IFVSSUVycm9yLCB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgICAgIHVybDogc3RyaW5nKSA9PiBVcmxUcmVlID0gZGVmYXVsdE1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcjtcblxuICAvKipcbiAgICogSW5kaWNhdGVzIGlmIGF0IGxlYXN0IG9uZSBuYXZpZ2F0aW9uIGhhcHBlbmVkLlxuICAgKi9cbiAgbmF2aWdhdGVkOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgbGFzdFN1Y2Nlc3NmdWxJZDogbnVtYmVyID0gLTE7XG5cbiAgLyoqXG4gICAqIFVzZWQgYnkgUm91dGVyTW9kdWxlLiBUaGlzIGFsbG93cyB1cyB0b1xuICAgKiBwYXVzZSB0aGUgbmF2aWdhdGlvbiBlaXRoZXIgYmVmb3JlIHByZWFjdGl2YXRpb24gb3IgYWZ0ZXIgaXQuXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgaG9va3M6IHtiZWZvcmVQcmVhY3RpdmF0aW9uOiBSb3V0ZXJIb29rLCBhZnRlclByZWFjdGl2YXRpb246IFJvdXRlckhvb2t9ID0ge1xuICAgIGJlZm9yZVByZWFjdGl2YXRpb246IGRlZmF1bHRSb3V0ZXJIb29rLFxuICAgIGFmdGVyUHJlYWN0aXZhdGlvbjogZGVmYXVsdFJvdXRlckhvb2tcbiAgfTtcblxuICAvKipcbiAgICogRXh0cmFjdHMgYW5kIG1lcmdlcyBVUkxzLiBVc2VkIGZvciBBbmd1bGFySlMgdG8gQW5ndWxhciBtaWdyYXRpb25zLlxuICAgKi9cbiAgdXJsSGFuZGxpbmdTdHJhdGVneTogVXJsSGFuZGxpbmdTdHJhdGVneSA9IG5ldyBEZWZhdWx0VXJsSGFuZGxpbmdTdHJhdGVneSgpO1xuXG4gIHJvdXRlUmV1c2VTdHJhdGVneTogUm91dGVSZXVzZVN0cmF0ZWd5ID0gbmV3IERlZmF1bHRSb3V0ZVJldXNlU3RyYXRlZ3koKTtcblxuICAvKipcbiAgICogRGVmaW5lIHdoYXQgdGhlIHJvdXRlciBzaG91bGQgZG8gaWYgaXQgcmVjZWl2ZXMgYSBuYXZpZ2F0aW9uIHJlcXVlc3QgdG8gdGhlIGN1cnJlbnQgVVJMLlxuICAgKiBCeSBkZWZhdWx0LCB0aGUgcm91dGVyIHdpbGwgaWdub3JlIHRoaXMgbmF2aWdhdGlvbi4gSG93ZXZlciwgdGhpcyBwcmV2ZW50cyBmZWF0dXJlcyBzdWNoXG4gICAqIGFzIGEgXCJyZWZyZXNoXCIgYnV0dG9uLiBVc2UgdGhpcyBvcHRpb24gdG8gY29uZmlndXJlIHRoZSBiZWhhdmlvciB3aGVuIG5hdmlnYXRpbmcgdG8gdGhlXG4gICAqIGN1cnJlbnQgVVJMLiBEZWZhdWx0IGlzICdpZ25vcmUnLlxuICAgKi9cbiAgb25TYW1lVXJsTmF2aWdhdGlvbjogJ3JlbG9hZCd8J2lnbm9yZScgPSAnaWdub3JlJztcblxuICAvKipcbiAgICogRGVmaW5lcyBob3cgdGhlIHJvdXRlciBtZXJnZXMgcGFyYW1zLCBkYXRhIGFuZCByZXNvbHZlZCBkYXRhIGZyb20gcGFyZW50IHRvIGNoaWxkXG4gICAqIHJvdXRlcy4gQXZhaWxhYmxlIG9wdGlvbnMgYXJlOlxuICAgKlxuICAgKiAtIGAnZW1wdHlPbmx5J2AsIHRoZSBkZWZhdWx0LCBvbmx5IGluaGVyaXRzIHBhcmVudCBwYXJhbXMgZm9yIHBhdGgtbGVzcyBvciBjb21wb25lbnQtbGVzc1xuICAgKiAgIHJvdXRlcy5cbiAgICogLSBgJ2Fsd2F5cydgLCBlbmFibGVzIHVuY29uZGl0aW9uYWwgaW5oZXJpdGFuY2Ugb2YgcGFyZW50IHBhcmFtcy5cbiAgICovXG4gIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6ICdlbXB0eU9ubHknfCdhbHdheXMnID0gJ2VtcHR5T25seSc7XG5cbiAgLyoqXG4gICAqIERlZmluZXMgd2hlbiB0aGUgcm91dGVyIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMLiBUaGUgZGVmYXVsdCBiZWhhdmlvciBpcyB0byB1cGRhdGUgYWZ0ZXJcbiAgICogc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uLiBIb3dldmVyLCBzb21lIGFwcGxpY2F0aW9ucyBtYXkgcHJlZmVyIGEgbW9kZSB3aGVyZSB0aGUgVVJMIGdldHNcbiAgICogdXBkYXRlZCBhdCB0aGUgYmVnaW5uaW5nIG9mIG5hdmlnYXRpb24uIFRoZSBtb3N0IGNvbW1vbiB1c2UgY2FzZSB3b3VsZCBiZSB1cGRhdGluZyB0aGVcbiAgICogVVJMIGVhcmx5IHNvIGlmIG5hdmlnYXRpb24gZmFpbHMsIHlvdSBjYW4gc2hvdyBhbiBlcnJvciBtZXNzYWdlIHdpdGggdGhlIFVSTCB0aGF0IGZhaWxlZC5cbiAgICogQXZhaWxhYmxlIG9wdGlvbnMgYXJlOlxuICAgKlxuICAgKiAtIGAnZGVmZXJyZWQnYCwgdGhlIGRlZmF1bHQsIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMIGFmdGVyIG5hdmlnYXRpb24gaGFzIGZpbmlzaGVkLlxuICAgKiAtIGAnZWFnZXInYCwgdXBkYXRlcyBicm93c2VyIFVSTCBhdCB0aGUgYmVnaW5uaW5nIG9mIG5hdmlnYXRpb24uXG4gICAqL1xuICB1cmxVcGRhdGVTdHJhdGVneTogJ2RlZmVycmVkJ3wnZWFnZXInID0gJ2RlZmVycmVkJztcblxuICAvKipcbiAgICogU2VlIHtAbGluayBSb3V0ZXJNb2R1bGV9IGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICAgKi9cbiAgcmVsYXRpdmVMaW5rUmVzb2x1dGlvbjogJ2xlZ2FjeSd8J2NvcnJlY3RlZCcgPSAnbGVnYWN5JztcblxuICAvKipcbiAgICogQ3JlYXRlcyB0aGUgcm91dGVyIHNlcnZpY2UuXG4gICAqL1xuICAvLyBUT0RPOiB2c2F2a2luIG1ha2UgaW50ZXJuYWwgYWZ0ZXIgdGhlIGZpbmFsIGlzIG91dC5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT58bnVsbCwgcHJpdmF0ZSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgICAgcHJpdmF0ZSByb290Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIHByaXZhdGUgbG9jYXRpb246IExvY2F0aW9uLCBpbmplY3RvcjogSW5qZWN0b3IsXG4gICAgICBsb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLCBwdWJsaWMgY29uZmlnOiBSb3V0ZXMpIHtcbiAgICBjb25zdCBvbkxvYWRTdGFydCA9IChyOiBSb3V0ZSkgPT4gdGhpcy50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZFN0YXJ0KHIpKTtcbiAgICBjb25zdCBvbkxvYWRFbmQgPSAocjogUm91dGUpID0+IHRoaXMudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRFbmQocikpO1xuXG4gICAgdGhpcy5uZ01vZHVsZSA9IGluamVjdG9yLmdldChOZ01vZHVsZVJlZik7XG4gICAgdGhpcy5jb25zb2xlID0gaW5qZWN0b3IuZ2V0KENvbnNvbGUpO1xuICAgIGNvbnN0IG5nWm9uZSA9IGluamVjdG9yLmdldChOZ1pvbmUpO1xuICAgIHRoaXMuaXNOZ1pvbmVFbmFibGVkID0gbmdab25lIGluc3RhbmNlb2YgTmdab25lO1xuXG4gICAgdGhpcy5yZXNldENvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSBjcmVhdGVFbXB0eVVybFRyZWUoKTtcbiAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLmN1cnJlbnRVcmxUcmVlO1xuXG4gICAgdGhpcy5jb25maWdMb2FkZXIgPSBuZXcgUm91dGVyQ29uZmlnTG9hZGVyKGxvYWRlciwgY29tcGlsZXIsIG9uTG9hZFN0YXJ0LCBvbkxvYWRFbmQpO1xuICAgIHRoaXMucm91dGVyU3RhdGUgPSBjcmVhdGVFbXB0eVN0YXRlKHRoaXMuY3VycmVudFVybFRyZWUsIHRoaXMucm9vdENvbXBvbmVudFR5cGUpO1xuICAgIHRoaXMucHJvY2Vzc05hdmlnYXRpb25zKCk7XG4gIH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIFRPRE86IHRoaXMgc2hvdWxkIGJlIHJlbW92ZWQgb25jZSB0aGUgY29uc3RydWN0b3Igb2YgdGhlIHJvdXRlciBtYWRlIGludGVybmFsXG4gICAqL1xuICByZXNldFJvb3RDb21wb25lbnRUeXBlKHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT4pOiB2b2lkIHtcbiAgICB0aGlzLnJvb3RDb21wb25lbnRUeXBlID0gcm9vdENvbXBvbmVudFR5cGU7XG4gICAgLy8gVE9ETzogdnNhdmtpbiByb3V0ZXIgNC4wIHNob3VsZCBtYWtlIHRoZSByb290IGNvbXBvbmVudCBzZXQgdG8gbnVsbFxuICAgIC8vIHRoaXMgd2lsbCBzaW1wbGlmeSB0aGUgbGlmZWN5Y2xlIG9mIHRoZSByb3V0ZXIuXG4gICAgdGhpcy5yb3V0ZXJTdGF0ZS5yb290LmNvbXBvbmVudCA9IHRoaXMucm9vdENvbXBvbmVudFR5cGU7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyIGFuZCBwZXJmb3JtcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaW5pdGlhbE5hdmlnYXRpb24oKTogdm9pZCB7XG4gICAgdGhpcy5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICBpZiAodGhpcy5uYXZpZ2F0aW9uSWQgPT09IDApIHtcbiAgICAgIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmxvY2F0aW9uLnBhdGgodHJ1ZSksIHtyZXBsYWNlVXJsOiB0cnVlfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdXAgdGhlIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lci5cbiAgICovXG4gIHNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpOiB2b2lkIHtcbiAgICAvLyBEb24ndCBuZWVkIHRvIHVzZSBab25lLndyYXAgYW55IG1vcmUsIGJlY2F1c2Ugem9uZS5qc1xuICAgIC8vIGFscmVhZHkgcGF0Y2ggb25Qb3BTdGF0ZSwgc28gbG9jYXRpb24gY2hhbmdlIGNhbGxiYWNrIHdpbGxcbiAgICAvLyBydW4gaW50byBuZ1pvbmVcbiAgICBpZiAoIXRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24gPSA8YW55PnRoaXMubG9jYXRpb24uc3Vic2NyaWJlKChjaGFuZ2U6IGFueSkgPT4ge1xuICAgICAgICBsZXQgcmF3VXJsVHJlZSA9IHRoaXMucGFyc2VVcmwoY2hhbmdlWyd1cmwnXSk7XG4gICAgICAgIGNvbnN0IHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIgPSBjaGFuZ2VbJ3R5cGUnXSA9PT0gJ3BvcHN0YXRlJyA/ICdwb3BzdGF0ZScgOiAnaGFzaGNoYW5nZSc7XG4gICAgICAgIGNvbnN0IHN0YXRlID0gY2hhbmdlLnN0YXRlICYmIGNoYW5nZS5zdGF0ZS5uYXZpZ2F0aW9uSWQgP1xuICAgICAgICAgICAge25hdmlnYXRpb25JZDogY2hhbmdlLnN0YXRlLm5hdmlnYXRpb25JZH0gOlxuICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgc2V0VGltZW91dChcbiAgICAgICAgICAgICgpID0+IHsgdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24ocmF3VXJsVHJlZSwgc291cmNlLCBzdGF0ZSwge3JlcGxhY2VVcmw6IHRydWV9KTsgfSwgMCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKiogVGhlIGN1cnJlbnQgdXJsICovXG4gIGdldCB1cmwoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuc2VyaWFsaXplVXJsKHRoaXMuY3VycmVudFVybFRyZWUpOyB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICB0cmlnZ2VyRXZlbnQoZXZlbnQ6IEV2ZW50KTogdm9pZCB7ICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PikubmV4dChldmVudCk7IH1cblxuICAvKipcbiAgICogUmVzZXRzIHRoZSBjb25maWd1cmF0aW9uIHVzZWQgZm9yIG5hdmlnYXRpb24gYW5kIGdlbmVyYXRpbmcgbGlua3MuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqICMjIyBFeGFtcGxlXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIucmVzZXRDb25maWcoW1xuICAgKiAgeyBwYXRoOiAndGVhbS86aWQnLCBjb21wb25lbnQ6IFRlYW1DbXAsIGNoaWxkcmVuOiBbXG4gICAqICAgIHsgcGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wIH0sXG4gICAqICAgIHsgcGF0aDogJ3VzZXIvOm5hbWUnLCBjb21wb25lbnQ6IFVzZXJDbXAgfVxuICAgKiAgXX1cbiAgICogXSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcmVzZXRDb25maWcoY29uZmlnOiBSb3V0ZXMpOiB2b2lkIHtcbiAgICB2YWxpZGF0ZUNvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gICAgdGhpcy5uYXZpZ2F0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSAtMTtcbiAgfVxuXG4gIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gIG5nT25EZXN0cm95KCk6IHZvaWQgeyB0aGlzLmRpc3Bvc2UoKTsgfVxuXG4gIC8qKiBEaXNwb3NlcyBvZiB0aGUgcm91dGVyICovXG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24gPSBudWxsICE7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFwcGxpZXMgYW4gYXJyYXkgb2YgY29tbWFuZHMgdG8gdGhlIGN1cnJlbnQgdXJsIHRyZWUgYW5kIGNyZWF0ZXMgYSBuZXcgdXJsIHRyZWUuXG4gICAqXG4gICAqIFdoZW4gZ2l2ZW4gYW4gYWN0aXZhdGUgcm91dGUsIGFwcGxpZXMgdGhlIGdpdmVuIGNvbW1hbmRzIHN0YXJ0aW5nIGZyb20gdGhlIHJvdXRlLlxuICAgKiBXaGVuIG5vdCBnaXZlbiBhIHJvdXRlLCBhcHBsaWVzIHRoZSBnaXZlbiBjb21tYW5kIHN0YXJ0aW5nIGZyb20gdGhlIHJvb3QuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqICMjIyBFeGFtcGxlXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvdXNlci8xMVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzO2V4cGFuZD10cnVlL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7ZXhwYW5kOiB0cnVlfSwgJ3VzZXInLCAxMV0pO1xuICAgKlxuICAgKiAvLyB5b3UgY2FuIGNvbGxhcHNlIHN0YXRpYyBzZWdtZW50cyBsaWtlIHRoaXMgKHRoaXMgd29ya3Mgb25seSB3aXRoIHRoZSBmaXJzdCBwYXNzZWQtaW4gdmFsdWUpOlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtLzMzL3VzZXInLCB1c2VySWRdKTtcbiAgICpcbiAgICogLy8gSWYgdGhlIGZpcnN0IHNlZ21lbnQgY2FuIGNvbnRhaW4gc2xhc2hlcywgYW5kIHlvdSBkbyBub3Qgd2FudCB0aGUgcm91dGVyIHRvIHNwbGl0IGl0LCB5b3VcbiAgICogLy8gY2FuIGRvIHRoZSBmb2xsb3dpbmc6XG4gICAqXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFt7c2VnbWVudFBhdGg6ICcvb25lL3R3byd9XSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMy8odXNlci8xMS8vcmlnaHQ6Y2hhdClcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6ICdjaGF0J319XSk7XG4gICAqXG4gICAqIC8vIHJlbW92ZSB0aGUgcmlnaHQgc2Vjb25kYXJ5IG5vZGVcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6IG51bGx9fV0pO1xuICAgKlxuICAgKiAvLyBhc3N1bWluZyB0aGUgY3VycmVudCB1cmwgaXMgYC90ZWFtLzMzL3VzZXIvMTFgIGFuZCB0aGUgcm91dGUgcG9pbnRzIHRvIGB1c2VyLzExYFxuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzExL2RldGFpbHNcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWydkZXRhaWxzJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzQ0L3VzZXIvMjJcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycuLi8uLi90ZWFtLzQ0L3VzZXIvMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgY3JlYXRlVXJsVHJlZShjb21tYW5kczogYW55W10sIG5hdmlnYXRpb25FeHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7fSk6IFVybFRyZWUge1xuICAgIGNvbnN0IHtyZWxhdGl2ZVRvLCAgICAgICAgICBxdWVyeVBhcmFtcywgICAgICAgICBmcmFnbWVudCxcbiAgICAgICAgICAgcHJlc2VydmVRdWVyeVBhcmFtcywgcXVlcnlQYXJhbXNIYW5kbGluZywgcHJlc2VydmVGcmFnbWVudH0gPSBuYXZpZ2F0aW9uRXh0cmFzO1xuICAgIGlmIChpc0Rldk1vZGUoKSAmJiBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zICYmIDxhbnk+Y29uc29sZSAmJiA8YW55PmNvbnNvbGUud2Fybikge1xuICAgICAgY29uc29sZS53YXJuKCdwcmVzZXJ2ZVF1ZXJ5UGFyYW1zIGlzIGRlcHJlY2F0ZWQsIHVzZSBxdWVyeVBhcmFtc0hhbmRsaW5nIGluc3RlYWQuJyk7XG4gICAgfVxuICAgIGNvbnN0IGEgPSByZWxhdGl2ZVRvIHx8IHRoaXMucm91dGVyU3RhdGUucm9vdDtcbiAgICBjb25zdCBmID0gcHJlc2VydmVGcmFnbWVudCA/IHRoaXMuY3VycmVudFVybFRyZWUuZnJhZ21lbnQgOiBmcmFnbWVudDtcbiAgICBsZXQgcTogUGFyYW1zfG51bGwgPSBudWxsO1xuICAgIGlmIChxdWVyeVBhcmFtc0hhbmRsaW5nKSB7XG4gICAgICBzd2l0Y2ggKHF1ZXJ5UGFyYW1zSGFuZGxpbmcpIHtcbiAgICAgICAgY2FzZSAnbWVyZ2UnOlxuICAgICAgICAgIHEgPSB7Li4udGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcywgLi4ucXVlcnlQYXJhbXN9O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdwcmVzZXJ2ZSc6XG4gICAgICAgICAgcSA9IHRoaXMuY3VycmVudFVybFRyZWUucXVlcnlQYXJhbXM7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcSA9IHF1ZXJ5UGFyYW1zIHx8IG51bGw7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHEgPSBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zID8gdGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcyA6IHF1ZXJ5UGFyYW1zIHx8IG51bGw7XG4gICAgfVxuICAgIGlmIChxICE9PSBudWxsKSB7XG4gICAgICBxID0gdGhpcy5yZW1vdmVFbXB0eVByb3BzKHEpO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlVXJsVHJlZShhLCB0aGlzLmN1cnJlbnRVcmxUcmVlLCBjb21tYW5kcywgcSAhLCBmICEpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIGJhc2VkIG9uIHRoZSBwcm92aWRlZCB1cmwuIFRoaXMgbmF2aWdhdGlvbiBpcyBhbHdheXMgYWJzb2x1dGUuXG4gICAqXG4gICAqIFJldHVybnMgYSBwcm9taXNlIHRoYXQ6XG4gICAqIC0gcmVzb2x2ZXMgdG8gJ3RydWUnIHdoZW4gbmF2aWdhdGlvbiBzdWNjZWVkcyxcbiAgICogLSByZXNvbHZlcyB0byAnZmFsc2UnIHdoZW4gbmF2aWdhdGlvbiBmYWlscyxcbiAgICogLSBpcyByZWplY3RlZCB3aGVuIGFuIGVycm9yIGhhcHBlbnMuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqICMjIyBFeGFtcGxlXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIubmF2aWdhdGVCeVVybChcIi90ZWFtLzMzL3VzZXIvMTFcIik7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTFxuICAgKiByb3V0ZXIubmF2aWdhdGVCeVVybChcIi90ZWFtLzMzL3VzZXIvMTFcIiwgeyBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBTaW5jZSBgbmF2aWdhdGVCeVVybCgpYCB0YWtlcyBhbiBhYnNvbHV0ZSBVUkwgYXMgdGhlIGZpcnN0IHBhcmFtZXRlcixcbiAgICogaXQgd2lsbCBub3QgYXBwbHkgYW55IGRlbHRhIHRvIHRoZSBjdXJyZW50IFVSTCBhbmQgaWdub3JlcyBhbnkgcHJvcGVydGllc1xuICAgKiBpbiB0aGUgc2Vjb25kIHBhcmFtZXRlciAodGhlIGBOYXZpZ2F0aW9uRXh0cmFzYCkgdGhhdCB3b3VsZCBjaGFuZ2UgdGhlXG4gICAqIHByb3ZpZGVkIFVSTC5cbiAgICovXG4gIG5hdmlnYXRlQnlVcmwodXJsOiBzdHJpbmd8VXJsVHJlZSwgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3NraXBMb2NhdGlvbkNoYW5nZTogZmFsc2V9KTpcbiAgICAgIFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmIChpc0Rldk1vZGUoKSAmJiB0aGlzLmlzTmdab25lRW5hYmxlZCAmJiAhTmdab25lLmlzSW5Bbmd1bGFyWm9uZSgpKSB7XG4gICAgICB0aGlzLmNvbnNvbGUud2FybihcbiAgICAgICAgICBgTmF2aWdhdGlvbiB0cmlnZ2VyZWQgb3V0c2lkZSBBbmd1bGFyIHpvbmUsIGRpZCB5b3UgZm9yZ2V0IHRvIGNhbGwgJ25nWm9uZS5ydW4oKSc/YCk7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IHVybCBpbnN0YW5jZW9mIFVybFRyZWUgPyB1cmwgOiB0aGlzLnBhcnNlVXJsKHVybCk7XG4gICAgY29uc3QgbWVyZ2VkVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh1cmxUcmVlLCB0aGlzLnJhd1VybFRyZWUpO1xuXG4gICAgcmV0dXJuIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKG1lcmdlZFRyZWUsICdpbXBlcmF0aXZlJywgbnVsbCwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZSBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgYXJyYXkgb2YgY29tbWFuZHMgYW5kIGEgc3RhcnRpbmcgcG9pbnQuXG4gICAqIElmIG5vIHN0YXJ0aW5nIHJvdXRlIGlzIHByb3ZpZGVkLCB0aGUgbmF2aWdhdGlvbiBpcyBhYnNvbHV0ZS5cbiAgICpcbiAgICogUmV0dXJucyBhIHByb21pc2UgdGhhdDpcbiAgICogLSByZXNvbHZlcyB0byAndHJ1ZScgd2hlbiBuYXZpZ2F0aW9uIHN1Y2NlZWRzLFxuICAgKiAtIHJlc29sdmVzIHRvICdmYWxzZScgd2hlbiBuYXZpZ2F0aW9uIGZhaWxzLFxuICAgKiAtIGlzIHJlamVjdGVkIHdoZW4gYW4gZXJyb3IgaGFwcGVucy5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogIyMjIEV4YW1wbGVcbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZShbJ3RlYW0nLCAzMywgJ3VzZXInLCAxMV0sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBOYXZpZ2F0ZSB3aXRob3V0IHVwZGF0aW5nIHRoZSBVUkxcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlLCBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWV9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIFRoZSBmaXJzdCBwYXJhbWV0ZXIgb2YgYG5hdmlnYXRlKClgIGlzIGEgZGVsdGEgdG8gYmUgYXBwbGllZCB0byB0aGUgY3VycmVudCBVUkxcbiAgICogb3IgdGhlIG9uZSBwcm92aWRlZCBpbiB0aGUgYHJlbGF0aXZlVG9gIHByb3BlcnR5IG9mIHRoZSBzZWNvbmQgcGFyYW1ldGVyICh0aGVcbiAgICogYE5hdmlnYXRpb25FeHRyYXNgKS5cbiAgICovXG4gIG5hdmlnYXRlKGNvbW1hbmRzOiBhbnlbXSwgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3NraXBMb2NhdGlvbkNoYW5nZTogZmFsc2V9KTpcbiAgICAgIFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHMpO1xuICAgIHJldHVybiB0aGlzLm5hdmlnYXRlQnlVcmwodGhpcy5jcmVhdGVVcmxUcmVlKGNvbW1hbmRzLCBleHRyYXMpLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqIFNlcmlhbGl6ZXMgYSBgVXJsVHJlZWAgaW50byBhIHN0cmluZyAqL1xuICBzZXJpYWxpemVVcmwodXJsOiBVcmxUcmVlKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodXJsKTsgfVxuXG4gIC8qKiBQYXJzZXMgYSBzdHJpbmcgaW50byBhIGBVcmxUcmVlYCAqL1xuICBwYXJzZVVybCh1cmw6IHN0cmluZyk6IFVybFRyZWUge1xuICAgIGxldCB1cmxUcmVlOiBVcmxUcmVlO1xuICAgIHRyeSB7XG4gICAgICB1cmxUcmVlID0gdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKHVybCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdXJsVHJlZSA9IHRoaXMubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyKGUsIHRoaXMudXJsU2VyaWFsaXplciwgdXJsKTtcbiAgICB9XG4gICAgcmV0dXJuIHVybFRyZWU7XG4gIH1cblxuICAvKiogUmV0dXJucyB3aGV0aGVyIHRoZSB1cmwgaXMgYWN0aXZhdGVkICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIGV4YWN0OiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgaWYgKHVybCBpbnN0YW5jZW9mIFVybFRyZWUpIHtcbiAgICAgIHJldHVybiBjb250YWluc1RyZWUodGhpcy5jdXJyZW50VXJsVHJlZSwgdXJsLCBleGFjdCk7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybFRyZWUsIGV4YWN0KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVtb3ZlRW1wdHlQcm9wcyhwYXJhbXM6IFBhcmFtcyk6IFBhcmFtcyB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHBhcmFtcykucmVkdWNlKChyZXN1bHQ6IFBhcmFtcywga2V5OiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlOiBhbnkgPSBwYXJhbXNba2V5XTtcbiAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sIHt9KTtcbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc05hdmlnYXRpb25zKCk6IHZvaWQge1xuICAgIHRoaXMubmF2aWdhdGlvbnNcbiAgICAgICAgLnBpcGUoY29uY2F0TWFwKChuYXY6IE5hdmlnYXRpb25QYXJhbXMpID0+IHtcbiAgICAgICAgICBpZiAobmF2KSB7XG4gICAgICAgICAgICB0aGlzLmV4ZWN1dGVTY2hlZHVsZWROYXZpZ2F0aW9uKG5hdik7XG4gICAgICAgICAgICAvLyBhIGZhaWxlZCBuYXZpZ2F0aW9uIHNob3VsZCBub3Qgc3RvcCB0aGUgcm91dGVyIGZyb20gcHJvY2Vzc2luZ1xuICAgICAgICAgICAgLy8gZnVydGhlciBuYXZpZ2F0aW9ucyA9PiB0aGUgY2F0Y2hcbiAgICAgICAgICAgIHJldHVybiBuYXYucHJvbWlzZS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiA8YW55Pm9mIChudWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pKVxuICAgICAgICAuc3Vic2NyaWJlKCgpID0+IHt9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2NoZWR1bGVOYXZpZ2F0aW9uKFxuICAgICAgcmF3VXJsOiBVcmxUcmVlLCBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLCBzdGF0ZToge25hdmlnYXRpb25JZDogbnVtYmVyfXxudWxsLFxuICAgICAgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgbGFzdE5hdmlnYXRpb24gPSB0aGlzLm5hdmlnYXRpb25zLnZhbHVlO1xuICAgIC8vIElmIHRoZSB1c2VyIHRyaWdnZXJzIGEgbmF2aWdhdGlvbiBpbXBlcmF0aXZlbHkgKGUuZy4sIGJ5IHVzaW5nIG5hdmlnYXRlQnlVcmwpLFxuICAgIC8vIGFuZCB0aGF0IG5hdmlnYXRpb24gcmVzdWx0cyBpbiAncmVwbGFjZVN0YXRlJyB0aGF0IGxlYWRzIHRvIHRoZSBzYW1lIFVSTCxcbiAgICAvLyB3ZSBzaG91bGQgc2tpcCB0aG9zZS5cbiAgICBpZiAobGFzdE5hdmlnYXRpb24gJiYgc291cmNlICE9PSAnaW1wZXJhdGl2ZScgJiYgbGFzdE5hdmlnYXRpb24uc291cmNlID09PSAnaW1wZXJhdGl2ZScgJiZcbiAgICAgICAgbGFzdE5hdmlnYXRpb24ucmF3VXJsLnRvU3RyaW5nKCkgPT09IHJhd1VybC50b1N0cmluZygpKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpOyAgLy8gcmV0dXJuIHZhbHVlIGlzIG5vdCB1c2VkXG4gICAgfVxuXG4gICAgLy8gQmVjYXVzZSBvZiBhIGJ1ZyBpbiBJRSBhbmQgRWRnZSwgdGhlIGxvY2F0aW9uIGNsYXNzIGZpcmVzIHR3byBldmVudHMgKHBvcHN0YXRlIGFuZFxuICAgIC8vIGhhc2hjaGFuZ2UpIGV2ZXJ5IHNpbmdsZSB0aW1lLiBUaGUgc2Vjb25kIG9uZSBzaG91bGQgYmUgaWdub3JlZC4gT3RoZXJ3aXNlLCB0aGUgVVJMIHdpbGxcbiAgICAvLyBmbGlja2VyLiBIYW5kbGVzIHRoZSBjYXNlIHdoZW4gYSBwb3BzdGF0ZSB3YXMgZW1pdHRlZCBmaXJzdC5cbiAgICBpZiAobGFzdE5hdmlnYXRpb24gJiYgc291cmNlID09ICdoYXNoY2hhbmdlJyAmJiBsYXN0TmF2aWdhdGlvbi5zb3VyY2UgPT09ICdwb3BzdGF0ZScgJiZcbiAgICAgICAgbGFzdE5hdmlnYXRpb24ucmF3VXJsLnRvU3RyaW5nKCkgPT09IHJhd1VybC50b1N0cmluZygpKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpOyAgLy8gcmV0dXJuIHZhbHVlIGlzIG5vdCB1c2VkXG4gICAgfVxuICAgIC8vIEJlY2F1c2Ugb2YgYSBidWcgaW4gSUUgYW5kIEVkZ2UsIHRoZSBsb2NhdGlvbiBjbGFzcyBmaXJlcyB0d28gZXZlbnRzIChwb3BzdGF0ZSBhbmRcbiAgICAvLyBoYXNoY2hhbmdlKSBldmVyeSBzaW5nbGUgdGltZS4gVGhlIHNlY29uZCBvbmUgc2hvdWxkIGJlIGlnbm9yZWQuIE90aGVyd2lzZSwgdGhlIFVSTCB3aWxsXG4gICAgLy8gZmxpY2tlci4gSGFuZGxlcyB0aGUgY2FzZSB3aGVuIGEgaGFzaGNoYW5nZSB3YXMgZW1pdHRlZCBmaXJzdC5cbiAgICBpZiAobGFzdE5hdmlnYXRpb24gJiYgc291cmNlID09ICdwb3BzdGF0ZScgJiYgbGFzdE5hdmlnYXRpb24uc291cmNlID09PSAnaGFzaGNoYW5nZScgJiZcbiAgICAgICAgbGFzdE5hdmlnYXRpb24ucmF3VXJsLnRvU3RyaW5nKCkgPT09IHJhd1VybC50b1N0cmluZygpKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpOyAgLy8gcmV0dXJuIHZhbHVlIGlzIG5vdCB1c2VkXG4gICAgfVxuXG4gICAgbGV0IHJlc29sdmU6IGFueSA9IG51bGw7XG4gICAgbGV0IHJlamVjdDogYW55ID0gbnVsbDtcblxuICAgIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzLCByZWopID0+IHtcbiAgICAgIHJlc29sdmUgPSByZXM7XG4gICAgICByZWplY3QgPSByZWo7XG4gICAgfSk7XG5cbiAgICBjb25zdCBpZCA9ICsrdGhpcy5uYXZpZ2F0aW9uSWQ7XG4gICAgdGhpcy5uYXZpZ2F0aW9ucy5uZXh0KHtpZCwgc291cmNlLCBzdGF0ZSwgcmF3VXJsLCBleHRyYXMsIHJlc29sdmUsIHJlamVjdCwgcHJvbWlzZX0pO1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoYXQgdGhlIGVycm9yIGlzIHByb3BhZ2F0ZWQgZXZlbiB0aG91Z2ggYHByb2Nlc3NOYXZpZ2F0aW9uc2AgY2F0Y2hcbiAgICAvLyBoYW5kbGVyIGRvZXMgbm90IHJldGhyb3dcbiAgICByZXR1cm4gcHJvbWlzZS5jYXRjaCgoZTogYW55KSA9PiBQcm9taXNlLnJlamVjdChlKSk7XG4gIH1cblxuICBwcml2YXRlIGV4ZWN1dGVTY2hlZHVsZWROYXZpZ2F0aW9uKHtpZCwgcmF3VXJsLCBleHRyYXMsIHJlc29sdmUsIHJlamVjdCwgc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZX06IE5hdmlnYXRpb25QYXJhbXMpOiB2b2lkIHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuZXh0cmFjdChyYXdVcmwpO1xuICAgIGNvbnN0IHVybFRyYW5zaXRpb24gPSAhdGhpcy5uYXZpZ2F0ZWQgfHwgdXJsLnRvU3RyaW5nKCkgIT09IHRoaXMuY3VycmVudFVybFRyZWUudG9TdHJpbmcoKTtcblxuICAgIGlmICgodGhpcy5vblNhbWVVcmxOYXZpZ2F0aW9uID09PSAncmVsb2FkJyA/IHRydWUgOiB1cmxUcmFuc2l0aW9uKSAmJlxuICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybChyYXdVcmwpKSB7XG4gICAgICBpZiAodGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJyAmJiAhZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICB0aGlzLnNldEJyb3dzZXJVcmwocmF3VXJsLCAhIWV4dHJhcy5yZXBsYWNlVXJsLCBpZCk7XG4gICAgICB9XG4gICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25TdGFydChpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgc291cmNlLCBzdGF0ZSkpO1xuICAgICAgUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgKF8pID0+IHRoaXMucnVuTmF2aWdhdGUoXG4gICAgICAgICAgICAgICAgICB1cmwsIHJhd1VybCwgISFleHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlLCAhIWV4dHJhcy5yZXBsYWNlVXJsLCBpZCwgbnVsbCkpXG4gICAgICAgICAgLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcblxuICAgICAgLy8gd2UgY2Fubm90IHByb2Nlc3MgdGhlIGN1cnJlbnQgVVJMLCBidXQgd2UgY291bGQgcHJvY2VzcyB0aGUgcHJldmlvdXMgb25lID0+XG4gICAgICAvLyB3ZSBuZWVkIHRvIGRvIHNvbWUgY2xlYW51cFxuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHVybFRyYW5zaXRpb24gJiYgdGhpcy5yYXdVcmxUcmVlICYmXG4gICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5zaG91bGRQcm9jZXNzVXJsKHRoaXMucmF3VXJsVHJlZSkpIHtcbiAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAubmV4dChuZXcgTmF2aWdhdGlvblN0YXJ0KGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCBzb3VyY2UsIHN0YXRlKSk7XG4gICAgICBQcm9taXNlLnJlc29sdmUoKVxuICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAoXykgPT4gdGhpcy5ydW5OYXZpZ2F0ZShcbiAgICAgICAgICAgICAgICAgIHVybCwgcmF3VXJsLCBmYWxzZSwgZmFsc2UsIGlkLFxuICAgICAgICAgICAgICAgICAgY3JlYXRlRW1wdHlTdGF0ZSh1cmwsIHRoaXMucm9vdENvbXBvbmVudFR5cGUpLnNuYXBzaG90KSlcbiAgICAgICAgICAudGhlbihyZXNvbHZlLCByZWplY3QpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucmF3VXJsVHJlZSA9IHJhd1VybDtcbiAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBydW5OYXZpZ2F0ZShcbiAgICAgIHVybDogVXJsVHJlZSwgcmF3VXJsOiBVcmxUcmVlLCBza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW4sIHJlcGxhY2VVcmw6IGJvb2xlYW4sIGlkOiBudW1iZXIsXG4gICAgICBwcmVjcmVhdGVkU3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3R8bnVsbCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmIChpZCAhPT0gdGhpcy5uYXZpZ2F0aW9uSWQpIHtcbiAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAubmV4dChuZXcgTmF2aWdhdGlvbkNhbmNlbChcbiAgICAgICAgICAgICAgaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksXG4gICAgICAgICAgICAgIGBOYXZpZ2F0aW9uIElEICR7aWR9IGlzIG5vdCBlcXVhbCB0byB0aGUgY3VycmVudCBuYXZpZ2F0aW9uIGlkICR7dGhpcy5uYXZpZ2F0aW9uSWR9YCkpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShmYWxzZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlUHJvbWlzZSwgcmVqZWN0UHJvbWlzZSkgPT4ge1xuICAgICAgLy8gY3JlYXRlIGFuIG9ic2VydmFibGUgb2YgdGhlIHVybCBhbmQgcm91dGUgc3RhdGUgc25hcHNob3RcbiAgICAgIC8vIHRoaXMgb3BlcmF0aW9uIGRvIG5vdCByZXN1bHQgaW4gYW55IHNpZGUgZWZmZWN0c1xuICAgICAgbGV0IHVybEFuZFNuYXBzaG90JDogT2JzZXJ2YWJsZTxOYXZTdHJlYW1WYWx1ZT47XG4gICAgICBpZiAoIXByZWNyZWF0ZWRTdGF0ZSkge1xuICAgICAgICBjb25zdCBtb2R1bGVJbmplY3RvciA9IHRoaXMubmdNb2R1bGUuaW5qZWN0b3I7XG4gICAgICAgIGNvbnN0IHJlZGlyZWN0c0FwcGxpZWQkID1cbiAgICAgICAgICAgIGFwcGx5UmVkaXJlY3RzKG1vZHVsZUluamVjdG9yLCB0aGlzLmNvbmZpZ0xvYWRlciwgdGhpcy51cmxTZXJpYWxpemVyLCB1cmwsIHRoaXMuY29uZmlnKTtcblxuICAgICAgICB1cmxBbmRTbmFwc2hvdCQgPSByZWRpcmVjdHNBcHBsaWVkJC5waXBlKG1lcmdlTWFwKChhcHBsaWVkVXJsOiBVcmxUcmVlKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHJlY29nbml6ZShcbiAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9vdENvbXBvbmVudFR5cGUsIHRoaXMuY29uZmlnLCBhcHBsaWVkVXJsLCB0aGlzLnNlcmlhbGl6ZVVybChhcHBsaWVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSwgdGhpcy5yZWxhdGl2ZUxpbmtSZXNvbHV0aW9uKVxuICAgICAgICAgICAgICAucGlwZShtYXAoKHNuYXBzaG90OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgICAgICAgICAgIC5uZXh0KG5ldyBSb3V0ZXNSZWNvZ25pemVkKFxuICAgICAgICAgICAgICAgICAgICAgICAgaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksIHRoaXMuc2VyaWFsaXplVXJsKGFwcGxpZWRVcmwpLCBzbmFwc2hvdCkpO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHthcHBsaWVkVXJsLCBzbmFwc2hvdH07XG4gICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdXJsQW5kU25hcHNob3QkID0gb2YgKHthcHBsaWVkVXJsOiB1cmwsIHNuYXBzaG90OiBwcmVjcmVhdGVkU3RhdGV9KTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYmVmb3JlUHJlYWN0aXZhdGlvbkRvbmUkID1cbiAgICAgICAgICB1cmxBbmRTbmFwc2hvdCQucGlwZShtZXJnZU1hcCgocCk6IE9ic2VydmFibGU8TmF2U3RyZWFtVmFsdWU+ID0+IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcCA9PT0gJ2Jvb2xlYW4nKSByZXR1cm4gb2YgKHApO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaG9va3NcbiAgICAgICAgICAgICAgICAuYmVmb3JlUHJlYWN0aXZhdGlvbihwLnNuYXBzaG90LCB7XG4gICAgICAgICAgICAgICAgICBuYXZpZ2F0aW9uSWQ6IGlkLFxuICAgICAgICAgICAgICAgICAgYXBwbGllZFVybFRyZWU6IHVybCxcbiAgICAgICAgICAgICAgICAgIHJhd1VybFRyZWU6IHJhd1VybCwgc2tpcExvY2F0aW9uQ2hhbmdlLCByZXBsYWNlVXJsLFxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnBpcGUobWFwKCgpID0+IHApKTtcbiAgICAgICAgICB9KSk7XG5cbiAgICAgIC8vIHJ1biBwcmVhY3RpdmF0aW9uOiBndWFyZHMgYW5kIGRhdGEgcmVzb2x2ZXJzXG4gICAgICBsZXQgcHJlQWN0aXZhdGlvbjogUHJlQWN0aXZhdGlvbjtcblxuICAgICAgY29uc3QgcHJlYWN0aXZhdGlvblNldHVwJCA9IGJlZm9yZVByZWFjdGl2YXRpb25Eb25lJC5waXBlKG1hcCgocCk6IE5hdlN0cmVhbVZhbHVlID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBwID09PSAnYm9vbGVhbicpIHJldHVybiBwO1xuICAgICAgICBjb25zdCB7YXBwbGllZFVybCwgc25hcHNob3R9ID0gcDtcbiAgICAgICAgY29uc3QgbW9kdWxlSW5qZWN0b3IgPSB0aGlzLm5nTW9kdWxlLmluamVjdG9yO1xuICAgICAgICBwcmVBY3RpdmF0aW9uID0gbmV3IFByZUFjdGl2YXRpb24oXG4gICAgICAgICAgICBzbmFwc2hvdCwgdGhpcy5yb3V0ZXJTdGF0ZS5zbmFwc2hvdCwgbW9kdWxlSW5qZWN0b3IsXG4gICAgICAgICAgICAoZXZ0OiBFdmVudCkgPT4gdGhpcy50cmlnZ2VyRXZlbnQoZXZ0KSk7XG4gICAgICAgIHByZUFjdGl2YXRpb24uaW5pdGlhbGl6ZSh0aGlzLnJvb3RDb250ZXh0cyk7XG4gICAgICAgIHJldHVybiB7YXBwbGllZFVybCwgc25hcHNob3R9O1xuICAgICAgfSkpO1xuXG4gICAgICBjb25zdCBwcmVhY3RpdmF0aW9uQ2hlY2tHdWFyZHMkID1cbiAgICAgICAgICBwcmVhY3RpdmF0aW9uU2V0dXAkLnBpcGUobWVyZ2VNYXAoKHApOiBPYnNlcnZhYmxlPE5hdlN0cmVhbVZhbHVlPiA9PiB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHAgPT09ICdib29sZWFuJyB8fCB0aGlzLm5hdmlnYXRpb25JZCAhPT0gaWQpIHJldHVybiBvZiAoZmFsc2UpO1xuICAgICAgICAgICAgY29uc3Qge2FwcGxpZWRVcmwsIHNuYXBzaG90fSA9IHA7XG5cbiAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KG5ldyBHdWFyZHNDaGVja1N0YXJ0KFxuICAgICAgICAgICAgICAgIGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCB0aGlzLnNlcmlhbGl6ZVVybChhcHBsaWVkVXJsKSwgc25hcHNob3QpKTtcblxuICAgICAgICAgICAgcmV0dXJuIHByZUFjdGl2YXRpb24uY2hlY2tHdWFyZHMoKS5waXBlKG1hcCgoc2hvdWxkQWN0aXZhdGU6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQobmV3IEd1YXJkc0NoZWNrRW5kKFxuICAgICAgICAgICAgICAgICAgaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksIHRoaXMuc2VyaWFsaXplVXJsKGFwcGxpZWRVcmwpLCBzbmFwc2hvdCxcbiAgICAgICAgICAgICAgICAgIHNob3VsZEFjdGl2YXRlKSk7XG4gICAgICAgICAgICAgIHJldHVybiB7YXBwbGllZFVybDogYXBwbGllZFVybCwgc25hcHNob3Q6IHNuYXBzaG90LCBzaG91bGRBY3RpdmF0ZTogc2hvdWxkQWN0aXZhdGV9O1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgIH0pKTtcblxuICAgICAgY29uc3QgcHJlYWN0aXZhdGlvblJlc29sdmVEYXRhJCA9XG4gICAgICAgICAgcHJlYWN0aXZhdGlvbkNoZWNrR3VhcmRzJC5waXBlKG1lcmdlTWFwKChwKTogT2JzZXJ2YWJsZTxOYXZTdHJlYW1WYWx1ZT4gPT4ge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwID09PSAnYm9vbGVhbicgfHwgdGhpcy5uYXZpZ2F0aW9uSWQgIT09IGlkKSByZXR1cm4gb2YgKGZhbHNlKTtcblxuICAgICAgICAgICAgaWYgKHAuc2hvdWxkQWN0aXZhdGUgJiYgcHJlQWN0aXZhdGlvbi5pc0FjdGl2YXRpbmcoKSkge1xuICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChuZXcgUmVzb2x2ZVN0YXJ0KFxuICAgICAgICAgICAgICAgICAgaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksIHRoaXMuc2VyaWFsaXplVXJsKHAuYXBwbGllZFVybCksIHAuc25hcHNob3QpKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHByZUFjdGl2YXRpb24ucmVzb2x2ZURhdGEodGhpcy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5KS5waXBlKG1hcCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQobmV3IFJlc29sdmVFbmQoXG4gICAgICAgICAgICAgICAgICAgIGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCB0aGlzLnNlcmlhbGl6ZVVybChwLmFwcGxpZWRVcmwpLCBwLnNuYXBzaG90KSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHA7XG4gICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBvZiAocCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuXG4gICAgICBjb25zdCBwcmVhY3RpdmF0aW9uRG9uZSQgPVxuICAgICAgICAgIHByZWFjdGl2YXRpb25SZXNvbHZlRGF0YSQucGlwZShtZXJnZU1hcCgocCk6IE9ic2VydmFibGU8TmF2U3RyZWFtVmFsdWU+ID0+IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcCA9PT0gJ2Jvb2xlYW4nIHx8IHRoaXMubmF2aWdhdGlvbklkICE9PSBpZCkgcmV0dXJuIG9mIChmYWxzZSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ob29rc1xuICAgICAgICAgICAgICAgIC5hZnRlclByZWFjdGl2YXRpb24ocC5zbmFwc2hvdCwge1xuICAgICAgICAgICAgICAgICAgbmF2aWdhdGlvbklkOiBpZCxcbiAgICAgICAgICAgICAgICAgIGFwcGxpZWRVcmxUcmVlOiB1cmwsXG4gICAgICAgICAgICAgICAgICByYXdVcmxUcmVlOiByYXdVcmwsIHNraXBMb2NhdGlvbkNoYW5nZSwgcmVwbGFjZVVybCxcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5waXBlKG1hcCgoKSA9PiBwKSk7XG4gICAgICAgICAgfSkpO1xuXG5cbiAgICAgIC8vIGNyZWF0ZSByb3V0ZXIgc3RhdGVcbiAgICAgIC8vIHRoaXMgb3BlcmF0aW9uIGhhcyBzaWRlIGVmZmVjdHMgPT4gcm91dGUgc3RhdGUgaXMgYmVpbmcgYWZmZWN0ZWRcbiAgICAgIGNvbnN0IHJvdXRlclN0YXRlJCA9IHByZWFjdGl2YXRpb25Eb25lJC5waXBlKG1hcCgocCkgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHAgPT09ICdib29sZWFuJyB8fCB0aGlzLm5hdmlnYXRpb25JZCAhPT0gaWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgY29uc3Qge2FwcGxpZWRVcmwsIHNuYXBzaG90LCBzaG91bGRBY3RpdmF0ZX0gPSBwO1xuICAgICAgICBpZiAoc2hvdWxkQWN0aXZhdGUpIHtcbiAgICAgICAgICBjb25zdCBzdGF0ZSA9IGNyZWF0ZVJvdXRlclN0YXRlKHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LCBzbmFwc2hvdCwgdGhpcy5yb3V0ZXJTdGF0ZSk7XG4gICAgICAgICAgcmV0dXJuIHthcHBsaWVkVXJsLCBzdGF0ZSwgc2hvdWxkQWN0aXZhdGV9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB7YXBwbGllZFVybCwgc3RhdGU6IG51bGwsIHNob3VsZEFjdGl2YXRlfTtcbiAgICAgICAgfVxuICAgICAgfSkpO1xuXG5cbiAgICAgIHRoaXMuYWN0aXZhdGVSb3V0ZXMoXG4gICAgICAgICAgcm91dGVyU3RhdGUkLCB0aGlzLnJvdXRlclN0YXRlLCB0aGlzLmN1cnJlbnRVcmxUcmVlLCBpZCwgdXJsLCByYXdVcmwsIHNraXBMb2NhdGlvbkNoYW5nZSxcbiAgICAgICAgICByZXBsYWNlVXJsLCByZXNvbHZlUHJvbWlzZSwgcmVqZWN0UHJvbWlzZSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybXMgdGhlIGxvZ2ljIG9mIGFjdGl2YXRpbmcgcm91dGVzLiBUaGlzIGlzIGEgc3luY2hyb25vdXMgcHJvY2VzcyBieSBkZWZhdWx0LiBXaGlsZSB0aGlzXG4gICAqIGlzIGEgcHJpdmF0ZSBtZXRob2QsIGl0IGNvdWxkIGJlIG92ZXJyaWRkZW4gdG8gbWFrZSBhY3RpdmF0aW9uIGFzeW5jaHJvbm91cy5cbiAgICovXG4gIHByaXZhdGUgYWN0aXZhdGVSb3V0ZXMoXG4gICAgICBzdGF0ZTogT2JzZXJ2YWJsZTxmYWxzZXxcbiAgICAgICAgICAgICAgICAgICAgICAgIHthcHBsaWVkVXJsOiBVcmxUcmVlLCBzdGF0ZTogUm91dGVyU3RhdGV8bnVsbCwgc2hvdWxkQWN0aXZhdGU/OiBib29sZWFufT4sXG4gICAgICBzdG9yZWRTdGF0ZTogUm91dGVyU3RhdGUsIHN0b3JlZFVybDogVXJsVHJlZSwgaWQ6IG51bWJlciwgdXJsOiBVcmxUcmVlLCByYXdVcmw6IFVybFRyZWUsXG4gICAgICBza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW4sIHJlcGxhY2VVcmw6IGJvb2xlYW4sIHJlc29sdmVQcm9taXNlOiBhbnksIHJlamVjdFByb21pc2U6IGFueSkge1xuICAgIC8vIGFwcGxpZWQgdGhlIG5ldyByb3V0ZXIgc3RhdGVcbiAgICAvLyB0aGlzIG9wZXJhdGlvbiBoYXMgc2lkZSBlZmZlY3RzXG4gICAgbGV0IG5hdmlnYXRpb25Jc1N1Y2Nlc3NmdWw6IGJvb2xlYW47XG5cbiAgICBzdGF0ZVxuICAgICAgICAuZm9yRWFjaCgocCkgPT4ge1xuICAgICAgICAgIGlmICh0eXBlb2YgcCA9PT0gJ2Jvb2xlYW4nIHx8ICFwLnNob3VsZEFjdGl2YXRlIHx8IGlkICE9PSB0aGlzLm5hdmlnYXRpb25JZCB8fCAhcC5zdGF0ZSkge1xuICAgICAgICAgICAgbmF2aWdhdGlvbklzU3VjY2Vzc2Z1bCA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCB7YXBwbGllZFVybCwgc3RhdGV9ID0gcDtcbiAgICAgICAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gYXBwbGllZFVybDtcbiAgICAgICAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodGhpcy5jdXJyZW50VXJsVHJlZSwgcmF3VXJsKTtcblxuICAgICAgICAgICh0aGlzIGFze3JvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZX0pLnJvdXRlclN0YXRlID0gc3RhdGU7XG5cbiAgICAgICAgICBpZiAodGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2RlZmVycmVkJyAmJiAhc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgICAgICB0aGlzLnNldEJyb3dzZXJVcmwodGhpcy5yYXdVcmxUcmVlLCByZXBsYWNlVXJsLCBpZCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbmV3IEFjdGl2YXRlUm91dGVzKFxuICAgICAgICAgICAgICB0aGlzLnJvdXRlUmV1c2VTdHJhdGVneSwgc3RhdGUsIHN0b3JlZFN0YXRlLCAoZXZ0OiBFdmVudCkgPT4gdGhpcy50cmlnZ2VyRXZlbnQoZXZ0KSlcbiAgICAgICAgICAgICAgLmFjdGl2YXRlKHRoaXMucm9vdENvbnRleHRzKTtcblxuICAgICAgICAgIG5hdmlnYXRpb25Jc1N1Y2Nlc3NmdWwgPSB0cnVlO1xuICAgICAgICB9KVxuICAgICAgICAudGhlbihcbiAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgaWYgKG5hdmlnYXRpb25Jc1N1Y2Nlc3NmdWwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm5hdmlnYXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bElkID0gaWQ7XG4gICAgICAgICAgICAgICAgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KVxuICAgICAgICAgICAgICAgICAgICAubmV4dChuZXcgTmF2aWdhdGlvbkVuZChcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCB0aGlzLnNlcmlhbGl6ZVVybCh0aGlzLmN1cnJlbnRVcmxUcmVlKSkpO1xuICAgICAgICAgICAgICAgIHJlc29sdmVQcm9taXNlKHRydWUpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gICAgICAgICAgICAgICAgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KVxuICAgICAgICAgICAgICAgICAgICAubmV4dChuZXcgTmF2aWdhdGlvbkNhbmNlbChpZCwgdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgJycpKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlUHJvbWlzZShmYWxzZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAoZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgIGlmIChpc05hdmlnYXRpb25DYW5jZWxpbmdFcnJvcihlKSkge1xuICAgICAgICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc2V0U3RhdGVBbmRVcmwoc3RvcmVkU3RhdGUsIHN0b3JlZFVybCwgcmF3VXJsKTtcbiAgICAgICAgICAgICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgICAgICAgICAgIC5uZXh0KG5ldyBOYXZpZ2F0aW9uQ2FuY2VsKGlkLCB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCBlLm1lc3NhZ2UpKTtcblxuICAgICAgICAgICAgICAgIHJlc29sdmVQcm9taXNlKGZhbHNlKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc2V0U3RhdGVBbmRVcmwoc3RvcmVkU3RhdGUsIHN0b3JlZFVybCwgcmF3VXJsKTtcbiAgICAgICAgICAgICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgICAgICAgICAgIC5uZXh0KG5ldyBOYXZpZ2F0aW9uRXJyb3IoaWQsIHRoaXMuc2VyaWFsaXplVXJsKHVybCksIGUpKTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgcmVzb2x2ZVByb21pc2UodGhpcy5lcnJvckhhbmRsZXIoZSkpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVlKSB7XG4gICAgICAgICAgICAgICAgICByZWplY3RQcm9taXNlKGVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXRCcm93c2VyVXJsKHVybDogVXJsVHJlZSwgcmVwbGFjZVVybDogYm9vbGVhbiwgaWQ6IG51bWJlcikge1xuICAgIGNvbnN0IHBhdGggPSB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHVybCk7XG4gICAgaWYgKHRoaXMubG9jYXRpb24uaXNDdXJyZW50UGF0aEVxdWFsVG8ocGF0aCkgfHwgcmVwbGFjZVVybCkge1xuICAgICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUocGF0aCwgJycsIHtuYXZpZ2F0aW9uSWQ6IGlkfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubG9jYXRpb24uZ28ocGF0aCwgJycsIHtuYXZpZ2F0aW9uSWQ6IGlkfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZXNldFN0YXRlQW5kVXJsKHN0b3JlZFN0YXRlOiBSb3V0ZXJTdGF0ZSwgc3RvcmVkVXJsOiBVcmxUcmVlLCByYXdVcmw6IFVybFRyZWUpOiB2b2lkIHtcbiAgICAodGhpcyBhc3tyb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGV9KS5yb3V0ZXJTdGF0ZSA9IHN0b3JlZFN0YXRlO1xuICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSBzdG9yZWRVcmw7XG4gICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHRoaXMuY3VycmVudFVybFRyZWUsIHJhd1VybCk7XG4gICAgdGhpcy5yZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk6IHZvaWQge1xuICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKFxuICAgICAgICB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHRoaXMucmF3VXJsVHJlZSksICcnLCB7bmF2aWdhdGlvbklkOiB0aGlzLmxhc3RTdWNjZXNzZnVsSWR9KTtcbiAgfVxufVxuXG5jbGFzcyBBY3RpdmF0ZVJvdXRlcyB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZVJldXNlU3RyYXRlZ3k6IFJvdXRlUmV1c2VTdHJhdGVneSwgcHJpdmF0ZSBmdXR1cmVTdGF0ZTogUm91dGVyU3RhdGUsXG4gICAgICBwcml2YXRlIGN1cnJTdGF0ZTogUm91dGVyU3RhdGUsIHByaXZhdGUgZm9yd2FyZEV2ZW50OiAoZXZ0OiBFdmVudCkgPT4gdm9pZCkge31cblxuICBhY3RpdmF0ZShwYXJlbnRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk6IHZvaWQge1xuICAgIGNvbnN0IGZ1dHVyZVJvb3QgPSB0aGlzLmZ1dHVyZVN0YXRlLl9yb290O1xuICAgIGNvbnN0IGN1cnJSb290ID0gdGhpcy5jdXJyU3RhdGUgPyB0aGlzLmN1cnJTdGF0ZS5fcm9vdCA6IG51bGw7XG5cbiAgICB0aGlzLmRlYWN0aXZhdGVDaGlsZFJvdXRlcyhmdXR1cmVSb290LCBjdXJyUm9vdCwgcGFyZW50Q29udGV4dHMpO1xuICAgIGFkdmFuY2VBY3RpdmF0ZWRSb3V0ZSh0aGlzLmZ1dHVyZVN0YXRlLnJvb3QpO1xuICAgIHRoaXMuYWN0aXZhdGVDaGlsZFJvdXRlcyhmdXR1cmVSb290LCBjdXJyUm9vdCwgcGFyZW50Q29udGV4dHMpO1xuICB9XG5cbiAgLy8gRGUtYWN0aXZhdGUgdGhlIGNoaWxkIHJvdXRlIHRoYXQgYXJlIG5vdCByZS11c2VkIGZvciB0aGUgZnV0dXJlIHN0YXRlXG4gIHByaXZhdGUgZGVhY3RpdmF0ZUNoaWxkUm91dGVzKFxuICAgICAgZnV0dXJlTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LCBjdXJyTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+fG51bGwsXG4gICAgICBjb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk6IHZvaWQge1xuICAgIGNvbnN0IGNoaWxkcmVuOiB7W291dGxldE5hbWU6IHN0cmluZ106IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPn0gPSBub2RlQ2hpbGRyZW5Bc01hcChjdXJyTm9kZSk7XG5cbiAgICAvLyBSZWN1cnNlIG9uIHRoZSByb3V0ZXMgYWN0aXZlIGluIHRoZSBmdXR1cmUgc3RhdGUgdG8gZGUtYWN0aXZhdGUgZGVlcGVyIGNoaWxkcmVuXG4gICAgZnV0dXJlTm9kZS5jaGlsZHJlbi5mb3JFYWNoKGZ1dHVyZUNoaWxkID0+IHtcbiAgICAgIGNvbnN0IGNoaWxkT3V0bGV0TmFtZSA9IGZ1dHVyZUNoaWxkLnZhbHVlLm91dGxldDtcbiAgICAgIHRoaXMuZGVhY3RpdmF0ZVJvdXRlcyhmdXR1cmVDaGlsZCwgY2hpbGRyZW5bY2hpbGRPdXRsZXROYW1lXSwgY29udGV4dHMpO1xuICAgICAgZGVsZXRlIGNoaWxkcmVuW2NoaWxkT3V0bGV0TmFtZV07XG4gICAgfSk7XG5cbiAgICAvLyBEZS1hY3RpdmF0ZSB0aGUgcm91dGVzIHRoYXQgd2lsbCBub3QgYmUgcmUtdXNlZFxuICAgIGZvckVhY2goY2hpbGRyZW4sICh2OiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sIGNoaWxkTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICB0aGlzLmRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKHYsIGNvbnRleHRzKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZGVhY3RpdmF0ZVJvdXRlcyhcbiAgICAgIGZ1dHVyZU5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPiwgY3Vyck5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPixcbiAgICAgIHBhcmVudENvbnRleHQ6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICBjb25zdCBmdXR1cmUgPSBmdXR1cmVOb2RlLnZhbHVlO1xuICAgIGNvbnN0IGN1cnIgPSBjdXJyTm9kZSA/IGN1cnJOb2RlLnZhbHVlIDogbnVsbDtcblxuICAgIGlmIChmdXR1cmUgPT09IGN1cnIpIHtcbiAgICAgIC8vIFJldXNpbmcgdGhlIG5vZGUsIGNoZWNrIHRvIHNlZSBpZiB0aGUgY2hpbGRyZW4gbmVlZCB0byBiZSBkZS1hY3RpdmF0ZWRcbiAgICAgIGlmIChmdXR1cmUuY29tcG9uZW50KSB7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgYSBub3JtYWwgcm91dGUsIHdlIG5lZWQgdG8gZ28gdGhyb3VnaCBhbiBvdXRsZXQuXG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBwYXJlbnRDb250ZXh0LmdldENvbnRleHQoZnV0dXJlLm91dGxldCk7XG4gICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgdGhpcy5kZWFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlTm9kZSwgY3Vyck5vZGUsIGNvbnRleHQuY2hpbGRyZW4pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgY29tcG9uZW50bGVzcyByb3V0ZSwgd2UgcmVjdXJzZSBidXQga2VlcCB0aGUgc2FtZSBvdXRsZXQgbWFwLlxuICAgICAgICB0aGlzLmRlYWN0aXZhdGVDaGlsZFJvdXRlcyhmdXR1cmVOb2RlLCBjdXJyTm9kZSwgcGFyZW50Q29udGV4dCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChjdXJyKSB7XG4gICAgICAgIC8vIERlYWN0aXZhdGUgdGhlIGN1cnJlbnQgcm91dGUgd2hpY2ggd2lsbCBub3QgYmUgcmUtdXNlZFxuICAgICAgICB0aGlzLmRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKGN1cnJOb2RlLCBwYXJlbnRDb250ZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKFxuICAgICAgcm91dGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPiwgcGFyZW50Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3kuc2hvdWxkRGV0YWNoKHJvdXRlLnZhbHVlLnNuYXBzaG90KSkge1xuICAgICAgdGhpcy5kZXRhY2hBbmRTdG9yZVJvdXRlU3VidHJlZShyb3V0ZSwgcGFyZW50Q29udGV4dHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRlYWN0aXZhdGVSb3V0ZUFuZE91dGxldChyb3V0ZSwgcGFyZW50Q29udGV4dHMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZGV0YWNoQW5kU3RvcmVSb3V0ZVN1YnRyZWUoXG4gICAgICByb3V0ZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LCBwYXJlbnRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk6IHZvaWQge1xuICAgIGNvbnN0IGNvbnRleHQgPSBwYXJlbnRDb250ZXh0cy5nZXRDb250ZXh0KHJvdXRlLnZhbHVlLm91dGxldCk7XG4gICAgaWYgKGNvbnRleHQgJiYgY29udGV4dC5vdXRsZXQpIHtcbiAgICAgIGNvbnN0IGNvbXBvbmVudFJlZiA9IGNvbnRleHQub3V0bGV0LmRldGFjaCgpO1xuICAgICAgY29uc3QgY29udGV4dHMgPSBjb250ZXh0LmNoaWxkcmVuLm9uT3V0bGV0RGVhY3RpdmF0ZWQoKTtcbiAgICAgIHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LnN0b3JlKHJvdXRlLnZhbHVlLnNuYXBzaG90LCB7Y29tcG9uZW50UmVmLCByb3V0ZSwgY29udGV4dHN9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGRlYWN0aXZhdGVSb3V0ZUFuZE91dGxldChcbiAgICAgIHJvdXRlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sIHBhcmVudENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzKTogdm9pZCB7XG4gICAgY29uc3QgY29udGV4dCA9IHBhcmVudENvbnRleHRzLmdldENvbnRleHQocm91dGUudmFsdWUub3V0bGV0KTtcblxuICAgIGlmIChjb250ZXh0KSB7XG4gICAgICBjb25zdCBjaGlsZHJlbjoge1tvdXRsZXROYW1lOiBzdHJpbmddOiBhbnl9ID0gbm9kZUNoaWxkcmVuQXNNYXAocm91dGUpO1xuICAgICAgY29uc3QgY29udGV4dHMgPSByb3V0ZS52YWx1ZS5jb21wb25lbnQgPyBjb250ZXh0LmNoaWxkcmVuIDogcGFyZW50Q29udGV4dHM7XG5cbiAgICAgIGZvckVhY2goY2hpbGRyZW4sICh2OiBhbnksIGs6IHN0cmluZykgPT4gdGhpcy5kZWFjdGl2YXRlUm91dGVBbmRJdHNDaGlsZHJlbih2LCBjb250ZXh0cykpO1xuXG4gICAgICBpZiAoY29udGV4dC5vdXRsZXQpIHtcbiAgICAgICAgLy8gRGVzdHJveSB0aGUgY29tcG9uZW50XG4gICAgICAgIGNvbnRleHQub3V0bGV0LmRlYWN0aXZhdGUoKTtcbiAgICAgICAgLy8gRGVzdHJveSB0aGUgY29udGV4dHMgZm9yIGFsbCB0aGUgb3V0bGV0cyB0aGF0IHdlcmUgaW4gdGhlIGNvbXBvbmVudFxuICAgICAgICBjb250ZXh0LmNoaWxkcmVuLm9uT3V0bGV0RGVhY3RpdmF0ZWQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFjdGl2YXRlQ2hpbGRSb3V0ZXMoXG4gICAgICBmdXR1cmVOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sIGN1cnJOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT58bnVsbCxcbiAgICAgIGNvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzKTogdm9pZCB7XG4gICAgY29uc3QgY2hpbGRyZW46IHtbb3V0bGV0OiBzdHJpbmddOiBhbnl9ID0gbm9kZUNoaWxkcmVuQXNNYXAoY3Vyck5vZGUpO1xuICAgIGZ1dHVyZU5vZGUuY2hpbGRyZW4uZm9yRWFjaChjID0+IHtcbiAgICAgIHRoaXMuYWN0aXZhdGVSb3V0ZXMoYywgY2hpbGRyZW5bYy52YWx1ZS5vdXRsZXRdLCBjb250ZXh0cyk7XG4gICAgICB0aGlzLmZvcndhcmRFdmVudChuZXcgQWN0aXZhdGlvbkVuZChjLnZhbHVlLnNuYXBzaG90KSk7XG4gICAgfSk7XG4gICAgaWYgKGZ1dHVyZU5vZGUuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICB0aGlzLmZvcndhcmRFdmVudChuZXcgQ2hpbGRBY3RpdmF0aW9uRW5kKGZ1dHVyZU5vZGUudmFsdWUuc25hcHNob3QpKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFjdGl2YXRlUm91dGVzKFxuICAgICAgZnV0dXJlTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LCBjdXJyTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LFxuICAgICAgcGFyZW50Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICBjb25zdCBmdXR1cmUgPSBmdXR1cmVOb2RlLnZhbHVlO1xuICAgIGNvbnN0IGN1cnIgPSBjdXJyTm9kZSA/IGN1cnJOb2RlLnZhbHVlIDogbnVsbDtcblxuICAgIGFkdmFuY2VBY3RpdmF0ZWRSb3V0ZShmdXR1cmUpO1xuXG4gICAgLy8gcmV1c2luZyB0aGUgbm9kZVxuICAgIGlmIChmdXR1cmUgPT09IGN1cnIpIHtcbiAgICAgIGlmIChmdXR1cmUuY29tcG9uZW50KSB7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgYSBub3JtYWwgcm91dGUsIHdlIG5lZWQgdG8gZ28gdGhyb3VnaCBhbiBvdXRsZXQuXG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBwYXJlbnRDb250ZXh0cy5nZXRPckNyZWF0ZUNvbnRleHQoZnV0dXJlLm91dGxldCk7XG4gICAgICAgIHRoaXMuYWN0aXZhdGVDaGlsZFJvdXRlcyhmdXR1cmVOb2RlLCBjdXJyTm9kZSwgY29udGV4dC5jaGlsZHJlbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgY29tcG9uZW50bGVzcyByb3V0ZSwgd2UgcmVjdXJzZSBidXQga2VlcCB0aGUgc2FtZSBvdXRsZXQgbWFwLlxuICAgICAgICB0aGlzLmFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlTm9kZSwgY3Vyck5vZGUsIHBhcmVudENvbnRleHRzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGZ1dHVyZS5jb21wb25lbnQpIHtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIG5vcm1hbCByb3V0ZSwgd2UgbmVlZCB0byBwbGFjZSB0aGUgY29tcG9uZW50IGludG8gdGhlIG91dGxldCBhbmQgcmVjdXJzZS5cbiAgICAgICAgY29uc3QgY29udGV4dCA9IHBhcmVudENvbnRleHRzLmdldE9yQ3JlYXRlQ29udGV4dChmdXR1cmUub3V0bGV0KTtcblxuICAgICAgICBpZiAodGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3kuc2hvdWxkQXR0YWNoKGZ1dHVyZS5zbmFwc2hvdCkpIHtcbiAgICAgICAgICBjb25zdCBzdG9yZWQgPVxuICAgICAgICAgICAgICAoPERldGFjaGVkUm91dGVIYW5kbGVJbnRlcm5hbD50aGlzLnJvdXRlUmV1c2VTdHJhdGVneS5yZXRyaWV2ZShmdXR1cmUuc25hcHNob3QpKTtcbiAgICAgICAgICB0aGlzLnJvdXRlUmV1c2VTdHJhdGVneS5zdG9yZShmdXR1cmUuc25hcHNob3QsIG51bGwpO1xuICAgICAgICAgIGNvbnRleHQuY2hpbGRyZW4ub25PdXRsZXRSZUF0dGFjaGVkKHN0b3JlZC5jb250ZXh0cyk7XG4gICAgICAgICAgY29udGV4dC5hdHRhY2hSZWYgPSBzdG9yZWQuY29tcG9uZW50UmVmO1xuICAgICAgICAgIGNvbnRleHQucm91dGUgPSBzdG9yZWQucm91dGUudmFsdWU7XG4gICAgICAgICAgaWYgKGNvbnRleHQub3V0bGV0KSB7XG4gICAgICAgICAgICAvLyBBdHRhY2ggcmlnaHQgYXdheSB3aGVuIHRoZSBvdXRsZXQgaGFzIGFscmVhZHkgYmVlbiBpbnN0YW50aWF0ZWRcbiAgICAgICAgICAgIC8vIE90aGVyd2lzZSBhdHRhY2ggZnJvbSBgUm91dGVyT3V0bGV0Lm5nT25Jbml0YCB3aGVuIGl0IGlzIGluc3RhbnRpYXRlZFxuICAgICAgICAgICAgY29udGV4dC5vdXRsZXQuYXR0YWNoKHN0b3JlZC5jb21wb25lbnRSZWYsIHN0b3JlZC5yb3V0ZS52YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGFkdmFuY2VBY3RpdmF0ZWRSb3V0ZU5vZGVBbmRJdHNDaGlsZHJlbihzdG9yZWQucm91dGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGNvbmZpZyA9IHBhcmVudExvYWRlZENvbmZpZyhmdXR1cmUuc25hcHNob3QpO1xuICAgICAgICAgIGNvbnN0IGNtcEZhY3RvcnlSZXNvbHZlciA9IGNvbmZpZyA/IGNvbmZpZy5tb2R1bGUuY29tcG9uZW50RmFjdG9yeVJlc29sdmVyIDogbnVsbDtcblxuICAgICAgICAgIGNvbnRleHQuYXR0YWNoUmVmID0gbnVsbDtcbiAgICAgICAgICBjb250ZXh0LnJvdXRlID0gZnV0dXJlO1xuICAgICAgICAgIGNvbnRleHQucmVzb2x2ZXIgPSBjbXBGYWN0b3J5UmVzb2x2ZXI7XG4gICAgICAgICAgaWYgKGNvbnRleHQub3V0bGV0KSB7XG4gICAgICAgICAgICAvLyBBY3RpdmF0ZSB0aGUgb3V0bGV0IHdoZW4gaXQgaGFzIGFscmVhZHkgYmVlbiBpbnN0YW50aWF0ZWRcbiAgICAgICAgICAgIC8vIE90aGVyd2lzZSBpdCB3aWxsIGdldCBhY3RpdmF0ZWQgZnJvbSBpdHMgYG5nT25Jbml0YCB3aGVuIGluc3RhbnRpYXRlZFxuICAgICAgICAgICAgY29udGV4dC5vdXRsZXQuYWN0aXZhdGVXaXRoKGZ1dHVyZSwgY21wRmFjdG9yeVJlc29sdmVyKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLmFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlTm9kZSwgbnVsbCwgY29udGV4dC5jaGlsZHJlbik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSBjb21wb25lbnRsZXNzIHJvdXRlLCB3ZSByZWN1cnNlIGJ1dCBrZWVwIHRoZSBzYW1lIG91dGxldCBtYXAuXG4gICAgICAgIHRoaXMuYWN0aXZhdGVDaGlsZFJvdXRlcyhmdXR1cmVOb2RlLCBudWxsLCBwYXJlbnRDb250ZXh0cyk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFkdmFuY2VBY3RpdmF0ZWRSb3V0ZU5vZGVBbmRJdHNDaGlsZHJlbihub2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4pOiB2b2lkIHtcbiAgYWR2YW5jZUFjdGl2YXRlZFJvdXRlKG5vZGUudmFsdWUpO1xuICBub2RlLmNoaWxkcmVuLmZvckVhY2goYWR2YW5jZUFjdGl2YXRlZFJvdXRlTm9kZUFuZEl0c0NoaWxkcmVuKTtcbn1cblxuZnVuY3Rpb24gcGFyZW50TG9hZGVkQ29uZmlnKHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogTG9hZGVkUm91dGVyQ29uZmlnfG51bGwge1xuICBmb3IgKGxldCBzID0gc25hcHNob3QucGFyZW50OyBzOyBzID0gcy5wYXJlbnQpIHtcbiAgICBjb25zdCByb3V0ZSA9IHMucm91dGVDb25maWc7XG4gICAgaWYgKHJvdXRlICYmIHJvdXRlLl9sb2FkZWRDb25maWcpIHJldHVybiByb3V0ZS5fbG9hZGVkQ29uZmlnO1xuICAgIGlmIChyb3V0ZSAmJiByb3V0ZS5jb21wb25lbnQpIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHM6IHN0cmluZ1tdKTogdm9pZCB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29tbWFuZHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjbWQgPSBjb21tYW5kc1tpXTtcbiAgICBpZiAoY21kID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIHJlcXVlc3RlZCBwYXRoIGNvbnRhaW5zICR7Y21kfSBzZWdtZW50IGF0IGluZGV4ICR7aX1gKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==