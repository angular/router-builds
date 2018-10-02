/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NgModuleRef, NgZone, isDevMode, ɵConsole as Console } from '@angular/core';
import { BehaviorSubject, EMPTY, Subject, of } from 'rxjs';
import { catchError, filter, finalize, map, switchMap, tap } from 'rxjs/operators';
import { standardizeConfig, validateConfig } from './config';
import { createRouterState } from './create_router_state';
import { createUrlTree } from './create_url_tree';
import { GuardsCheckEnd, GuardsCheckStart, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, ResolveEnd, ResolveStart, RouteConfigLoadEnd, RouteConfigLoadStart, RoutesRecognized } from './events';
import { activateRoutes } from './operators/activate_routes';
import { applyRedirects } from './operators/apply_redirects';
import { checkGuards } from './operators/check_guards';
import { recognize } from './operators/recognize';
import { resolveData } from './operators/resolve_data';
import { switchTap } from './operators/switch_tap';
import { PreActivation } from './pre_activation';
import { DefaultRouteReuseStrategy } from './route_reuse_strategy';
import { RouterConfigLoader } from './router_config_loader';
import { createEmptyState } from './router_state';
import { isNavigationCancelingError } from './shared';
import { DefaultUrlHandlingStrategy } from './url_handling_strategy';
import { UrlTree, containsTree, createEmptyUrlTree } from './url_tree';
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
        this.transitions = new BehaviorSubject({
            id: 0,
            currentUrlTree: this.currentUrlTree,
            currentRawUrl: this.currentUrlTree,
            extractedUrl: this.urlHandlingStrategy.extract(this.currentUrlTree),
            urlAfterRedirects: this.urlHandlingStrategy.extract(this.currentUrlTree),
            rawUrl: this.currentUrlTree,
            extras: {},
            resolve: null,
            reject: null,
            promise: Promise.resolve(true),
            source: 'imperative',
            state: null,
            currentSnapshot: this.routerState.snapshot,
            targetSnapshot: null,
            currentRouterState: this.routerState,
            targetRouterState: null,
            guardsResult: null,
            preActivation: null
        });
        this.navigations = this.setupNavigations(this.transitions);
        this.processNavigations();
    }
    setupNavigations(transitions) {
        const eventsSubject = this.events;
        return transitions.pipe(filter(t => t.id !== 0), 
        // Extract URL
        map(t => (Object.assign({}, t, { extractedUrl: this.urlHandlingStrategy.extract(t.rawUrl) }))), 
        // Using switchMap so we cancel executing navigations when a new one comes in
        switchMap(t => {
            let completed = false;
            let errored = false;
            return of(t).pipe(switchMap(t => {
                const urlTransition = !this.navigated || t.extractedUrl.toString() !== this.currentUrlTree.toString();
                const processCurrentUrl = (this.onSameUrlNavigation === 'reload' ? true : urlTransition) &&
                    this.urlHandlingStrategy.shouldProcessUrl(t.rawUrl);
                if (processCurrentUrl) {
                    return of(t).pipe(
                    // Update URL if in `eager` update mode
                    tap(t => this.urlUpdateStrategy === 'eager' && !t.extras.skipLocationChange &&
                        this.setBrowserUrl(t.rawUrl, !!t.extras.replaceUrl, t.id)), 
                    // Fire NavigationStart event
                    switchMap(t => {
                        const transition = this.transitions.getValue();
                        eventsSubject.next(new NavigationStart(t.id, this.serializeUrl(t.extractedUrl), t.source, t.state));
                        if (transition !== this.transitions.getValue()) {
                            return EMPTY;
                        }
                        return [t];
                    }), 
                    // This delay is required to match old behavior that forced navigation to
                    // always be async
                    switchMap(t => Promise.resolve(t)), 
                    // ApplyRedirects
                    applyRedirects(this.ngModule.injector, this.configLoader, this.urlSerializer, this.config), 
                    // Recognize
                    recognize(this.rootComponentType, this.config, (url) => this.serializeUrl(url), this.paramsInheritanceStrategy), 
                    // Fire RoutesRecognized
                    tap(t => {
                        const routesRecognized = new RoutesRecognized(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(t.urlAfterRedirects), t.targetSnapshot);
                        eventsSubject.next(routesRecognized);
                    }));
                }
                else {
                    const processPreviousUrl = urlTransition && this.rawUrlTree &&
                        this.urlHandlingStrategy.shouldProcessUrl(this.rawUrlTree);
                    /* When the current URL shouldn't be processed, but the previous one was, we
                     * handle this "error condition" by navigating to the previously successful URL,
                     * but leaving the URL intact.*/
                    if (processPreviousUrl) {
                        const { id, extractedUrl, source, state, extras } = t;
                        const navStart = new NavigationStart(id, this.serializeUrl(extractedUrl), source, state);
                        eventsSubject.next(navStart);
                        const targetSnapshot = createEmptyState(extractedUrl, this.rootComponentType).snapshot;
                        return of(Object.assign({}, t, { targetSnapshot, urlAfterRedirects: extractedUrl, extras: Object.assign({}, extras, { skipLocationChange: false, replaceUrl: false }) }));
                    }
                    else {
                        /* When neither the current or previous URL can be processed, do nothing other
                         * than update router's internal reference to the current "settled" URL. This
                         * way the next navigation will be coming from the current URL in the browser.
                         */
                        this.rawUrlTree = t.rawUrl;
                        t.resolve(null);
                        return EMPTY;
                    }
                }
            }), 
            // Before Preactivation
            switchTap(t => {
                const { targetSnapshot, id: navigationId, extractedUrl: appliedUrlTree, rawUrl: rawUrlTree, extras: { skipLocationChange, replaceUrl } } = t;
                return this.hooks.beforePreactivation(targetSnapshot, {
                    navigationId,
                    appliedUrlTree,
                    rawUrlTree,
                    skipLocationChange: !!skipLocationChange,
                    replaceUrl: !!replaceUrl,
                });
            }), 
            // --- GUARDS ---
            tap(t => {
                const guardsStart = new GuardsCheckStart(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(t.urlAfterRedirects), t.targetSnapshot);
                this.triggerEvent(guardsStart);
            }), map(t => {
                const preActivation = new PreActivation(t.targetSnapshot, t.currentSnapshot, this.ngModule.injector, (evt) => this.triggerEvent(evt));
                preActivation.initialize(this.rootContexts);
                return Object.assign({}, t, { preActivation });
            }), checkGuards(), tap(t => {
                const guardsEnd = new GuardsCheckEnd(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(t.urlAfterRedirects), t.targetSnapshot, !!t.guardsResult);
                this.triggerEvent(guardsEnd);
            }), filter(t => {
                if (!t.guardsResult) {
                    this.resetUrlToCurrentUrlTree();
                    const navCancel = new NavigationCancel(t.id, this.serializeUrl(t.extractedUrl), '');
                    eventsSubject.next(navCancel);
                    t.resolve(false);
                    return false;
                }
                return true;
            }), 
            // --- RESOLVE ---
            switchTap(t => {
                if (t.preActivation.isActivating()) {
                    return of(t).pipe(tap(t => {
                        const resolveStart = new ResolveStart(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(t.urlAfterRedirects), t.targetSnapshot);
                        this.triggerEvent(resolveStart);
                    }), resolveData(this.paramsInheritanceStrategy), //
                    tap(t => {
                        const resolveEnd = new ResolveEnd(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(t.urlAfterRedirects), t.targetSnapshot);
                        this.triggerEvent(resolveEnd);
                    }));
                }
                return undefined;
            }), 
            // --- AFTER PREACTIVATION ---
            switchTap(t => {
                const { targetSnapshot, id: navigationId, extractedUrl: appliedUrlTree, rawUrl: rawUrlTree, extras: { skipLocationChange, replaceUrl } } = t;
                return this.hooks.afterPreactivation(targetSnapshot, {
                    navigationId,
                    appliedUrlTree,
                    rawUrlTree,
                    skipLocationChange: !!skipLocationChange,
                    replaceUrl: !!replaceUrl,
                });
            }), map(t => {
                const targetRouterState = createRouterState(this.routeReuseStrategy, t.targetSnapshot, t.currentRouterState);
                return (Object.assign({}, t, { targetRouterState }));
            }), 
            /* Once here, we are about to activate syncronously. The assumption is this will
               succeed, and user code may read from the Router service. Therefore before
               activation, we need to update router properties storing the current URL and the
               RouterState, as well as updated the browser URL. All this should happen *before*
               activating. */
            tap(t => {
                this.currentUrlTree = t.urlAfterRedirects;
                this.rawUrlTree = this.urlHandlingStrategy.merge(this.currentUrlTree, t.rawUrl);
                this.routerState = t.targetRouterState;
                if (this.urlUpdateStrategy === 'deferred' && !t.extras.skipLocationChange) {
                    this.setBrowserUrl(this.rawUrlTree, !!t.extras.replaceUrl, t.id);
                }
            }), activateRoutes(this.rootContexts, this.routeReuseStrategy, (evt) => this.triggerEvent(evt)), tap({ next() { completed = true; }, complete() { completed = true; } }), finalize(() => {
                /* When the navigation stream finishes either through error or success, we set the
                 * `completed` or `errored` flag. However, there are some situations where we could
                 * get here without either of those being set. For instance, a redirect during
                 * NavigationStart. Therefore, this is a catch-all to make sure the NavigationCancel
                 * event is fired when a navigation gets cancelled but not caught by other means. */
                if (!completed && !errored) {
                    // Must reset to current URL tree here to ensure history.state is set. On a fresh
                    // page load, if a new navigation comes in before a successful navigation
                    // completes, there will be nothing in history.state.navigationId. This can cause
                    // sync problems with AngularJS sync code which looks for a value here in order
                    // to determine whether or not to handle a given popstate event or to leave it
                    // to the Angualr router.
                    this.resetUrlToCurrentUrlTree();
                    const navCancel = new NavigationCancel(t.id, this.serializeUrl(t.extractedUrl), `Navigation ID ${t.id} is not equal to the current navigation id ${this.navigationId}`);
                    eventsSubject.next(navCancel);
                    t.resolve(false);
                }
            }), catchError((e) => {
                errored = true;
                /* This error type is issued during Redirect, and is handled as a cancellation
                 * rather than an error. */
                if (isNavigationCancelingError(e)) {
                    this.navigated = true;
                    this.resetStateAndUrl(t.currentRouterState, t.currentUrlTree, t.rawUrl);
                    const navCancel = new NavigationCancel(t.id, this.serializeUrl(t.extractedUrl), e.message);
                    eventsSubject.next(navCancel);
                    /* All other errors should reset to the router's internal URL reference to the
                     * pre-error state. */
                }
                else {
                    this.resetStateAndUrl(t.currentRouterState, t.currentUrlTree, t.rawUrl);
                    const navError = new NavigationError(t.id, this.serializeUrl(t.extractedUrl), e);
                    eventsSubject.next(navError);
                    try {
                        t.resolve(this.errorHandler(e));
                    }
                    catch (ee) {
                        t.reject(ee);
                    }
                }
                return EMPTY;
            }));
            // TODO(jasonaden): remove cast once g3 is on updated TypeScript
        }));
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
    getTransition() { return this.transitions.value; }
    setTransition(t) {
        this.transitions.next(Object.assign({}, this.getTransition(), t));
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
        this.navigations.subscribe(t => {
            this.navigated = true;
            this.lastSuccessfulId = t.id;
            this.events
                .next(new NavigationEnd(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(this.currentUrlTree)));
            t.resolve(true);
        }, e => { this.console.warn(`Unhandled Navigation Error: `); });
    }
    scheduleNavigation(rawUrl, source, state, extras) {
        const lastNavigation = this.getTransition();
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
        this.setTransition({
            id,
            source,
            state,
            currentUrlTree: this.currentUrlTree,
            currentRawUrl: this.rawUrlTree, rawUrl, extras, resolve, reject, promise,
            currentSnapshot: this.routerState.snapshot,
            currentRouterState: this.routerState
        });
        // Make sure that the error is propagated even though `processNavigations` catch
        // handler does not rethrow
        return promise.catch((e) => { return Promise.reject(e); });
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
function validateCommands(commands) {
    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        if (cmd == null) {
            throw new Error(`The requested path contains ${cmd} segment at index ${i}`);
        }
    }
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUE0QyxXQUFXLEVBQUUsTUFBTSxFQUFRLFNBQVMsRUFBRSxRQUFRLElBQUksT0FBTyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ25JLE9BQU8sRUFBQyxlQUFlLEVBQUUsS0FBSyxFQUFjLE9BQU8sRUFBZ0IsRUFBRSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ3BGLE9BQU8sRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRWpGLE9BQU8sRUFBcUMsaUJBQWlCLEVBQUUsY0FBYyxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQy9GLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQ3hELE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRCxPQUFPLEVBQVEsY0FBYyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFxQixVQUFVLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzdPLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQ3JELE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUNoRCxPQUFPLEVBQUMsV0FBVyxFQUFDLE1BQU0sMEJBQTBCLENB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Q25GLElBQWtDLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUM5RCxJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQztRQUNoQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM5RSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRU8sd0JBQXdCO1FBQzlCLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUN0QixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBQyxDQUFDLENBQUM7SUFDaEcsQ0FBQztDQUNGO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFrQjtJQUMxQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUN4QyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsR0FBRyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUM3RTtLQUNGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7Q29tcGlsZXIsIEluamVjdG9yLCBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIE5nTW9kdWxlUmVmLCBOZ1pvbmUsIFR5cGUsIGlzRGV2TW9kZSwgybVDb25zb2xlIGFzIENvbnNvbGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtCZWhhdmlvclN1YmplY3QsIEVNUFRZLCBPYnNlcnZhYmxlLCBTdWJqZWN0LCBTdWJzY3JpcHRpb24sIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NhdGNoRXJyb3IsIGZpbHRlciwgZmluYWxpemUsIG1hcCwgc3dpdGNoTWFwLCB0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtRdWVyeVBhcmFtc0hhbmRsaW5nLCBSb3V0ZSwgUm91dGVzLCBzdGFuZGFyZGl6ZUNvbmZpZywgdmFsaWRhdGVDb25maWd9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7Y3JlYXRlUm91dGVyU3RhdGV9IGZyb20gJy4vY3JlYXRlX3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge2NyZWF0ZVVybFRyZWV9IGZyb20gJy4vY3JlYXRlX3VybF90cmVlJztcbmltcG9ydCB7RXZlbnQsIEd1YXJkc0NoZWNrRW5kLCBHdWFyZHNDaGVja1N0YXJ0LCBOYXZpZ2F0aW9uQ2FuY2VsLCBOYXZpZ2F0aW9uRW5kLCBOYXZpZ2F0aW9uRXJyb3IsIE5hdmlnYXRpb25TdGFydCwgTmF2aWdhdGlvblRyaWdnZXIsIFJlc29sdmVFbmQsIFJlc29sdmVTdGFydCwgUm91dGVDb25maWdMb2FkRW5kLCBSb3V0ZUNvbmZpZ0xvYWRTdGFydCwgUm91dGVzUmVjb2duaXplZH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHthY3RpdmF0ZVJvdXRlc30gZnJvbSAnLi9vcGVyYXRvcnMvYWN0aXZhdGVfcm91dGVzJztcbmltcG9ydCB7YXBwbHlSZWRpcmVjdHN9IGZyb20gJy4vb3BlcmF0b3JzL2FwcGx5X3JlZGlyZWN0cyc7XG5pbXBvcnQge2NoZWNrR3VhcmRzfSBmcm9tICcuL29wZXJhdG9ycy9jaGVja19ndWFyZHMnO1xuaW1wb3J0IHtyZWNvZ25pemV9IGZyb20gJy4vb3BlcmF0b3JzL3JlY29nbml6ZSc7XG5pbXBvcnQge3Jlc29sdmVEYXRhfSBmcm9tICcuL29wZXJhdG9ycy9yZXNvbHZlX2RhdGEnO1xuaW1wb3J0IHtzd2l0Y2hUYXB9IGZyb20gJy4vb3BlcmF0b3JzL3N3aXRjaF90YXAnO1xuaW1wb3J0IHtQcmVBY3RpdmF0aW9ufSBmcm9tICcuL3ByZV9hY3RpdmF0aW9uJztcbmltcG9ydCB7RGVmYXVsdFJvdXRlUmV1c2VTdHJhdGVneSwgUm91dGVSZXVzZVN0cmF0ZWd5fSBmcm9tICcuL3JvdXRlX3JldXNlX3N0cmF0ZWd5JztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0c30gZnJvbSAnLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZSwgUm91dGVyU3RhdGUsIFJvdXRlclN0YXRlU25hcHNob3QsIGNyZWF0ZUVtcHR5U3RhdGV9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UGFyYW1zLCBpc05hdmlnYXRpb25DYW5jZWxpbmdFcnJvcn0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtEZWZhdWx0VXJsSGFuZGxpbmdTdHJhdGVneSwgVXJsSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi91cmxfaGFuZGxpbmdfc3RyYXRlZ3knO1xuaW1wb3J0IHtVcmxTZXJpYWxpemVyLCBVcmxUcmVlLCBjb250YWluc1RyZWUsIGNyZWF0ZUVtcHR5VXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIHRoZSBleHRyYSBvcHRpb25zIHVzZWQgZHVyaW5nIG5hdmlnYXRpb24uXG4gKlxuICpcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOYXZpZ2F0aW9uRXh0cmFzIHtcbiAgLyoqXG4gICAqIEVuYWJsZXMgcmVsYXRpdmUgbmF2aWdhdGlvbiBmcm9tIHRoZSBjdXJyZW50IEFjdGl2YXRlZFJvdXRlLlxuICAgKlxuICAgKiBDb25maWd1cmF0aW9uOlxuICAgKlxuICAgKiBgYGBcbiAgICogW3tcbiAgKiAgIHBhdGg6ICdwYXJlbnQnLFxuICAqICAgY29tcG9uZW50OiBQYXJlbnRDb21wb25lbnQsXG4gICogICBjaGlsZHJlbjogW3tcbiAgKiAgICAgcGF0aDogJ2xpc3QnLFxuICAqICAgICBjb21wb25lbnQ6IExpc3RDb21wb25lbnRcbiAgKiAgIH0se1xuICAqICAgICBwYXRoOiAnY2hpbGQnLFxuICAqICAgICBjb21wb25lbnQ6IENoaWxkQ29tcG9uZW50XG4gICogICB9XVxuICAqIH1dXG4gICAqIGBgYFxuICAgKlxuICAgKiBOYXZpZ2F0ZSB0byBsaXN0IHJvdXRlIGZyb20gY2hpbGQgcm91dGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiAgQENvbXBvbmVudCh7Li4ufSlcbiAgICogIGNsYXNzIENoaWxkQ29tcG9uZW50IHtcbiAgKiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJvdXRlcjogUm91dGVyLCBwcml2YXRlIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSkge31cbiAgKlxuICAqICAgIGdvKCkge1xuICAqICAgICAgdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycuLi9saXN0J10sIHsgcmVsYXRpdmVUbzogdGhpcy5yb3V0ZSB9KTtcbiAgKiAgICB9XG4gICogIH1cbiAgICogYGBgXG4gICAqL1xuICByZWxhdGl2ZVRvPzogQWN0aXZhdGVkUm91dGV8bnVsbDtcblxuICAvKipcbiAgICogU2V0cyBxdWVyeSBwYXJhbWV0ZXJzIHRvIHRoZSBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvcmVzdWx0cz9wYWdlPTFcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvcmVzdWx0cyddLCB7IHF1ZXJ5UGFyYW1zOiB7IHBhZ2U6IDEgfSB9KTtcbiAgICogYGBgXG4gICAqL1xuICBxdWVyeVBhcmFtcz86IFBhcmFtc3xudWxsO1xuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBoYXNoIGZyYWdtZW50IGZvciB0aGUgVVJMLlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgdG8gL3Jlc3VsdHMjdG9wXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3Jlc3VsdHMnXSwgeyBmcmFnbWVudDogJ3RvcCcgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnQ/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFByZXNlcnZlcyB0aGUgcXVlcnkgcGFyYW1ldGVycyBmb3IgdGhlIG5leHQgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogZGVwcmVjYXRlZCwgdXNlIGBxdWVyeVBhcmFtc0hhbmRsaW5nYCBpbnN0ZWFkXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBQcmVzZXJ2ZSBxdWVyeSBwYXJhbXMgZnJvbSAvcmVzdWx0cz9wYWdlPTEgdG8gL3ZpZXc/cGFnZT0xXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgc2luY2UgdjRcbiAgICovXG4gIHByZXNlcnZlUXVlcnlQYXJhbXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiAgY29uZmlnIHN0cmF0ZWd5IHRvIGhhbmRsZSB0aGUgcXVlcnkgcGFyYW1ldGVycyBmb3IgdGhlIG5leHQgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIGZyb20gL3Jlc3VsdHM/cGFnZT0xIHRvIC92aWV3P3BhZ2U9MSZwYWdlPTJcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHF1ZXJ5UGFyYW1zOiB7IHBhZ2U6IDIgfSwgIHF1ZXJ5UGFyYW1zSGFuZGxpbmc6IFwibWVyZ2VcIiB9KTtcbiAgICogYGBgXG4gICAqL1xuICBxdWVyeVBhcmFtc0hhbmRsaW5nPzogUXVlcnlQYXJhbXNIYW5kbGluZ3xudWxsO1xuICAvKipcbiAgICogUHJlc2VydmVzIHRoZSBmcmFnbWVudCBmb3IgdGhlIG5leHQgbmF2aWdhdGlvblxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gUHJlc2VydmUgZnJhZ21lbnQgZnJvbSAvcmVzdWx0cyN0b3AgdG8gL3ZpZXcjdG9wXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBwcmVzZXJ2ZUZyYWdtZW50OiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHByZXNlcnZlRnJhZ21lbnQ/OiBib29sZWFuO1xuICAvKipcbiAgICogTmF2aWdhdGVzIHdpdGhvdXQgcHVzaGluZyBhIG5ldyBzdGF0ZSBpbnRvIGhpc3RvcnkuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSBzaWxlbnRseSB0byAvdmlld1xuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHNraXBMb2NhdGlvbkNoYW5nZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBOYXZpZ2F0ZXMgd2hpbGUgcmVwbGFjaW5nIHRoZSBjdXJyZW50IHN0YXRlIGluIGhpc3RvcnkuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvdmlld1xuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgcmVwbGFjZVVybDogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqL1xuICByZXBsYWNlVXJsPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBFcnJvciBoYW5kbGVyIHRoYXQgaXMgaW52b2tlZCB3aGVuIGEgbmF2aWdhdGlvbiBlcnJvcnMuXG4gKlxuICogSWYgdGhlIGhhbmRsZXIgcmV0dXJucyBhIHZhbHVlLCB0aGUgbmF2aWdhdGlvbiBwcm9taXNlIHdpbGwgYmUgcmVzb2x2ZWQgd2l0aCB0aGlzIHZhbHVlLlxuICogSWYgdGhlIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbiwgdGhlIG5hdmlnYXRpb24gcHJvbWlzZSB3aWxsIGJlIHJlamVjdGVkIHdpdGhcbiAqIHRoZSBleGNlcHRpb24uXG4gKlxuICpcbiAqL1xuZXhwb3J0IHR5cGUgRXJyb3JIYW5kbGVyID0gKGVycm9yOiBhbnkpID0+IGFueTtcblxuZnVuY3Rpb24gZGVmYXVsdEVycm9ySGFuZGxlcihlcnJvcjogYW55KTogYW55IHtcbiAgdGhyb3cgZXJyb3I7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRNYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIoXG4gICAgZXJyb3I6IFVSSUVycm9yLCB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLCB1cmw6IHN0cmluZyk6IFVybFRyZWUge1xuICByZXR1cm4gdXJsU2VyaWFsaXplci5wYXJzZSgnLycpO1xufVxuXG50eXBlIE5hdlN0cmVhbVZhbHVlID1cbiAgICBib29sZWFuIHwge2FwcGxpZWRVcmw6IFVybFRyZWUsIHNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90LCBzaG91bGRBY3RpdmF0ZT86IGJvb2xlYW59O1xuXG5leHBvcnQgdHlwZSBOYXZpZ2F0aW9uVHJhbnNpdGlvbiA9IHtcbiAgaWQ6IG51bWJlcixcbiAgY3VycmVudFVybFRyZWU6IFVybFRyZWUsXG4gIGN1cnJlbnRSYXdVcmw6IFVybFRyZWUsXG4gIGV4dHJhY3RlZFVybDogVXJsVHJlZSxcbiAgdXJsQWZ0ZXJSZWRpcmVjdHM6IFVybFRyZWUsXG4gIHJhd1VybDogVXJsVHJlZSxcbiAgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzLFxuICByZXNvbHZlOiBhbnksXG4gIHJlamVjdDogYW55LFxuICBwcm9taXNlOiBQcm9taXNlPGJvb2xlYW4+LFxuICBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLFxuICBzdGF0ZToge25hdmlnYXRpb25JZDogbnVtYmVyfSB8IG51bGwsXG4gIGN1cnJlbnRTbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCxcbiAgdGFyZ2V0U25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QgfCBudWxsLFxuICBjdXJyZW50Um91dGVyU3RhdGU6IFJvdXRlclN0YXRlLFxuICB0YXJnZXRSb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGUgfCBudWxsLFxuICBndWFyZHNSZXN1bHQ6IGJvb2xlYW4gfCBudWxsLFxuICBwcmVBY3RpdmF0aW9uOiBQcmVBY3RpdmF0aW9uIHwgbnVsbFxufTtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IHR5cGUgUm91dGVySG9vayA9IChzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCwgcnVuRXh0cmFzOiB7XG4gIGFwcGxpZWRVcmxUcmVlOiBVcmxUcmVlLFxuICByYXdVcmxUcmVlOiBVcmxUcmVlLFxuICBza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW4sXG4gIHJlcGxhY2VVcmw6IGJvb2xlYW4sXG4gIG5hdmlnYXRpb25JZDogbnVtYmVyXG59KSA9PiBPYnNlcnZhYmxlPHZvaWQ+O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBkZWZhdWx0Um91dGVySG9vayhzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCwgcnVuRXh0cmFzOiB7XG4gIGFwcGxpZWRVcmxUcmVlOiBVcmxUcmVlLFxuICByYXdVcmxUcmVlOiBVcmxUcmVlLFxuICBza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW4sXG4gIHJlcGxhY2VVcmw6IGJvb2xlYW4sXG4gIG5hdmlnYXRpb25JZDogbnVtYmVyXG59KTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gIHJldHVybiBvZiAobnVsbCkgYXMgYW55O1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIHRoZSBuYXZpZ2F0aW9uIGFuZCB1cmwgbWFuaXB1bGF0aW9uIGNhcGFiaWxpdGllcy5cbiAqXG4gKiBTZWUgYFJvdXRlc2AgZm9yIG1vcmUgZGV0YWlscyBhbmQgZXhhbXBsZXMuXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZXIge1xuICBwcml2YXRlIGN1cnJlbnRVcmxUcmVlOiBVcmxUcmVlO1xuICBwcml2YXRlIHJhd1VybFRyZWU6IFVybFRyZWU7XG4gIHByaXZhdGUgcmVhZG9ubHkgdHJhbnNpdGlvbnM6IEJlaGF2aW9yU3ViamVjdDxOYXZpZ2F0aW9uVHJhbnNpdGlvbj47XG4gIHByaXZhdGUgbmF2aWdhdGlvbnM6IE9ic2VydmFibGU8TmF2aWdhdGlvblRyYW5zaXRpb24+O1xuXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIGxvY2F0aW9uU3Vic2NyaXB0aW9uICE6IFN1YnNjcmlwdGlvbjtcbiAgcHJpdmF0ZSBuYXZpZ2F0aW9uSWQ6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgY29uZmlnTG9hZGVyOiBSb3V0ZXJDb25maWdMb2FkZXI7XG4gIHByaXZhdGUgbmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT47XG4gIHByaXZhdGUgY29uc29sZTogQ29uc29sZTtcbiAgcHJpdmF0ZSBpc05nWm9uZUVuYWJsZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBwdWJsaWMgcmVhZG9ubHkgZXZlbnRzOiBPYnNlcnZhYmxlPEV2ZW50PiA9IG5ldyBTdWJqZWN0PEV2ZW50PigpO1xuICBwdWJsaWMgcmVhZG9ubHkgcm91dGVyU3RhdGU6IFJvdXRlclN0YXRlO1xuXG4gIC8qKlxuICAgKiBFcnJvciBoYW5kbGVyIHRoYXQgaXMgaW52b2tlZCB3aGVuIGEgbmF2aWdhdGlvbiBlcnJvcnMuXG4gICAqXG4gICAqIFNlZSBgRXJyb3JIYW5kbGVyYCBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICovXG4gIGVycm9ySGFuZGxlcjogRXJyb3JIYW5kbGVyID0gZGVmYXVsdEVycm9ySGFuZGxlcjtcblxuICAvKipcbiAgICogTWFsZm9ybWVkIHVyaSBlcnJvciBoYW5kbGVyIGlzIGludm9rZWQgd2hlbiBgUm91dGVyLnBhcnNlVXJsKHVybClgIHRocm93cyBhblxuICAgKiBlcnJvciBkdWUgdG8gY29udGFpbmluZyBhbiBpbnZhbGlkIGNoYXJhY3Rlci4gVGhlIG1vc3QgY29tbW9uIGNhc2Ugd291bGQgYmUgYSBgJWAgc2lnblxuICAgKiB0aGF0J3Mgbm90IGVuY29kZWQgYW5kIGlzIG5vdCBwYXJ0IG9mIGEgcGVyY2VudCBlbmNvZGVkIHNlcXVlbmNlLlxuICAgKi9cbiAgbWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyOlxuICAgICAgKGVycm9yOiBVUklFcnJvciwgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICAgICB1cmw6IHN0cmluZykgPT4gVXJsVHJlZSA9IGRlZmF1bHRNYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyBpZiBhdCBsZWFzdCBvbmUgbmF2aWdhdGlvbiBoYXBwZW5lZC5cbiAgICovXG4gIG5hdmlnYXRlZDogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIGxhc3RTdWNjZXNzZnVsSWQ6IG51bWJlciA9IC0xO1xuXG4gIC8qKlxuICAgKiBVc2VkIGJ5IFJvdXRlck1vZHVsZS4gVGhpcyBhbGxvd3MgdXMgdG9cbiAgICogcGF1c2UgdGhlIG5hdmlnYXRpb24gZWl0aGVyIGJlZm9yZSBwcmVhY3RpdmF0aW9uIG9yIGFmdGVyIGl0LlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGhvb2tzOiB7YmVmb3JlUHJlYWN0aXZhdGlvbjogUm91dGVySG9vaywgYWZ0ZXJQcmVhY3RpdmF0aW9uOiBSb3V0ZXJIb29rfSA9IHtcbiAgICBiZWZvcmVQcmVhY3RpdmF0aW9uOiBkZWZhdWx0Um91dGVySG9vayxcbiAgICBhZnRlclByZWFjdGl2YXRpb246IGRlZmF1bHRSb3V0ZXJIb29rXG4gIH07XG5cbiAgLyoqXG4gICAqIEV4dHJhY3RzIGFuZCBtZXJnZXMgVVJMcy4gVXNlZCBmb3IgQW5ndWxhckpTIHRvIEFuZ3VsYXIgbWlncmF0aW9ucy5cbiAgICovXG4gIHVybEhhbmRsaW5nU3RyYXRlZ3k6IFVybEhhbmRsaW5nU3RyYXRlZ3kgPSBuZXcgRGVmYXVsdFVybEhhbmRsaW5nU3RyYXRlZ3koKTtcblxuICByb3V0ZVJldXNlU3RyYXRlZ3k6IFJvdXRlUmV1c2VTdHJhdGVneSA9IG5ldyBEZWZhdWx0Um91dGVSZXVzZVN0cmF0ZWd5KCk7XG5cbiAgLyoqXG4gICAqIERlZmluZSB3aGF0IHRoZSByb3V0ZXIgc2hvdWxkIGRvIGlmIGl0IHJlY2VpdmVzIGEgbmF2aWdhdGlvbiByZXF1ZXN0IHRvIHRoZSBjdXJyZW50IFVSTC5cbiAgICogQnkgZGVmYXVsdCwgdGhlIHJvdXRlciB3aWxsIGlnbm9yZSB0aGlzIG5hdmlnYXRpb24uIEhvd2V2ZXIsIHRoaXMgcHJldmVudHMgZmVhdHVyZXMgc3VjaFxuICAgKiBhcyBhIFwicmVmcmVzaFwiIGJ1dHRvbi4gVXNlIHRoaXMgb3B0aW9uIHRvIGNvbmZpZ3VyZSB0aGUgYmVoYXZpb3Igd2hlbiBuYXZpZ2F0aW5nIHRvIHRoZVxuICAgKiBjdXJyZW50IFVSTC4gRGVmYXVsdCBpcyAnaWdub3JlJy5cbiAgICovXG4gIG9uU2FtZVVybE5hdmlnYXRpb246ICdyZWxvYWQnfCdpZ25vcmUnID0gJ2lnbm9yZSc7XG5cbiAgLyoqXG4gICAqIERlZmluZXMgaG93IHRoZSByb3V0ZXIgbWVyZ2VzIHBhcmFtcywgZGF0YSBhbmQgcmVzb2x2ZWQgZGF0YSBmcm9tIHBhcmVudCB0byBjaGlsZFxuICAgKiByb3V0ZXMuIEF2YWlsYWJsZSBvcHRpb25zIGFyZTpcbiAgICpcbiAgICogLSBgJ2VtcHR5T25seSdgLCB0aGUgZGVmYXVsdCwgb25seSBpbmhlcml0cyBwYXJlbnQgcGFyYW1zIGZvciBwYXRoLWxlc3Mgb3IgY29tcG9uZW50LWxlc3NcbiAgICogICByb3V0ZXMuXG4gICAqIC0gYCdhbHdheXMnYCwgZW5hYmxlcyB1bmNvbmRpdGlvbmFsIGluaGVyaXRhbmNlIG9mIHBhcmVudCBwYXJhbXMuXG4gICAqL1xuICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiAnZW1wdHlPbmx5J3wnYWx3YXlzJyA9ICdlbXB0eU9ubHknO1xuXG4gIC8qKlxuICAgKiBEZWZpbmVzIHdoZW4gdGhlIHJvdXRlciB1cGRhdGVzIHRoZSBicm93c2VyIFVSTC4gVGhlIGRlZmF1bHQgYmVoYXZpb3IgaXMgdG8gdXBkYXRlIGFmdGVyXG4gICAqIHN1Y2Nlc3NmdWwgbmF2aWdhdGlvbi4gSG93ZXZlciwgc29tZSBhcHBsaWNhdGlvbnMgbWF5IHByZWZlciBhIG1vZGUgd2hlcmUgdGhlIFVSTCBnZXRzXG4gICAqIHVwZGF0ZWQgYXQgdGhlIGJlZ2lubmluZyBvZiBuYXZpZ2F0aW9uLiBUaGUgbW9zdCBjb21tb24gdXNlIGNhc2Ugd291bGQgYmUgdXBkYXRpbmcgdGhlXG4gICAqIFVSTCBlYXJseSBzbyBpZiBuYXZpZ2F0aW9uIGZhaWxzLCB5b3UgY2FuIHNob3cgYW4gZXJyb3IgbWVzc2FnZSB3aXRoIHRoZSBVUkwgdGhhdCBmYWlsZWQuXG4gICAqIEF2YWlsYWJsZSBvcHRpb25zIGFyZTpcbiAgICpcbiAgICogLSBgJ2RlZmVycmVkJ2AsIHRoZSBkZWZhdWx0LCB1cGRhdGVzIHRoZSBicm93c2VyIFVSTCBhZnRlciBuYXZpZ2F0aW9uIGhhcyBmaW5pc2hlZC5cbiAgICogLSBgJ2VhZ2VyJ2AsIHVwZGF0ZXMgYnJvd3NlciBVUkwgYXQgdGhlIGJlZ2lubmluZyBvZiBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgdXJsVXBkYXRlU3RyYXRlZ3k6ICdkZWZlcnJlZCd8J2VhZ2VyJyA9ICdkZWZlcnJlZCc7XG5cbiAgLyoqXG4gICAqIFNlZSB7QGxpbmsgUm91dGVyTW9kdWxlfSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICovXG4gIHJlbGF0aXZlTGlua1Jlc29sdXRpb246ICdsZWdhY3knfCdjb3JyZWN0ZWQnID0gJ2xlZ2FjeSc7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgdGhlIHJvdXRlciBzZXJ2aWNlLlxuICAgKi9cbiAgLy8gVE9ETzogdnNhdmtpbiBtYWtlIGludGVybmFsIGFmdGVyIHRoZSBmaW5hbCBpcyBvdXQuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+fG51bGwsIHByaXZhdGUgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICAgIHByaXZhdGUgcm9vdENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLCBwcml2YXRlIGxvY2F0aW9uOiBMb2NhdGlvbiwgaW5qZWN0b3I6IEluamVjdG9yLFxuICAgICAgbG9hZGVyOiBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIGNvbXBpbGVyOiBDb21waWxlciwgcHVibGljIGNvbmZpZzogUm91dGVzKSB7XG4gICAgY29uc3Qgb25Mb2FkU3RhcnQgPSAocjogUm91dGUpID0+IHRoaXMudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRTdGFydChyKSk7XG4gICAgY29uc3Qgb25Mb2FkRW5kID0gKHI6IFJvdXRlKSA9PiB0aGlzLnRyaWdnZXJFdmVudChuZXcgUm91dGVDb25maWdMb2FkRW5kKHIpKTtcblxuICAgIHRoaXMubmdNb2R1bGUgPSBpbmplY3Rvci5nZXQoTmdNb2R1bGVSZWYpO1xuICAgIHRoaXMuY29uc29sZSA9IGluamVjdG9yLmdldChDb25zb2xlKTtcbiAgICBjb25zdCBuZ1pvbmUgPSBpbmplY3Rvci5nZXQoTmdab25lKTtcbiAgICB0aGlzLmlzTmdab25lRW5hYmxlZCA9IG5nWm9uZSBpbnN0YW5jZW9mIE5nWm9uZTtcblxuICAgIHRoaXMucmVzZXRDb25maWcoY29uZmlnKTtcbiAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gY3JlYXRlRW1wdHlVcmxUcmVlKCk7XG4gICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy5jdXJyZW50VXJsVHJlZTtcblxuICAgIHRoaXMuY29uZmlnTG9hZGVyID0gbmV3IFJvdXRlckNvbmZpZ0xvYWRlcihsb2FkZXIsIGNvbXBpbGVyLCBvbkxvYWRTdGFydCwgb25Mb2FkRW5kKTtcbiAgICB0aGlzLnJvdXRlclN0YXRlID0gY3JlYXRlRW1wdHlTdGF0ZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB0aGlzLnJvb3RDb21wb25lbnRUeXBlKTtcblxuICAgIHRoaXMudHJhbnNpdGlvbnMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PE5hdmlnYXRpb25UcmFuc2l0aW9uPih7XG4gICAgICBpZDogMCxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgY3VycmVudFJhd1VybDogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIGV4dHJhY3RlZFVybDogdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QodGhpcy5jdXJyZW50VXJsVHJlZSksXG4gICAgICB1cmxBZnRlclJlZGlyZWN0czogdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QodGhpcy5jdXJyZW50VXJsVHJlZSksXG4gICAgICByYXdVcmw6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBleHRyYXM6IHt9LFxuICAgICAgcmVzb2x2ZTogbnVsbCxcbiAgICAgIHJlamVjdDogbnVsbCxcbiAgICAgIHByb21pc2U6IFByb21pc2UucmVzb2x2ZSh0cnVlKSxcbiAgICAgIHNvdXJjZTogJ2ltcGVyYXRpdmUnLFxuICAgICAgc3RhdGU6IG51bGwsXG4gICAgICBjdXJyZW50U25hcHNob3Q6IHRoaXMucm91dGVyU3RhdGUuc25hcHNob3QsXG4gICAgICB0YXJnZXRTbmFwc2hvdDogbnVsbCxcbiAgICAgIGN1cnJlbnRSb3V0ZXJTdGF0ZTogdGhpcy5yb3V0ZXJTdGF0ZSxcbiAgICAgIHRhcmdldFJvdXRlclN0YXRlOiBudWxsLFxuICAgICAgZ3VhcmRzUmVzdWx0OiBudWxsLFxuICAgICAgcHJlQWN0aXZhdGlvbjogbnVsbFxuICAgIH0pO1xuICAgIHRoaXMubmF2aWdhdGlvbnMgPSB0aGlzLnNldHVwTmF2aWdhdGlvbnModGhpcy50cmFuc2l0aW9ucyk7XG5cbiAgICB0aGlzLnByb2Nlc3NOYXZpZ2F0aW9ucygpO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXR1cE5hdmlnYXRpb25zKHRyYW5zaXRpb25zOiBPYnNlcnZhYmxlPE5hdmlnYXRpb25UcmFuc2l0aW9uPik6XG4gICAgICBPYnNlcnZhYmxlPE5hdmlnYXRpb25UcmFuc2l0aW9uPiB7XG4gICAgY29uc3QgZXZlbnRzU3ViamVjdCA9ICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50Pik7XG4gICAgcmV0dXJuIHRyYW5zaXRpb25zLnBpcGUoXG4gICAgICAgIGZpbHRlcih0ID0+IHQuaWQgIT09IDApLFxuXG4gICAgICAgIC8vIEV4dHJhY3QgVVJMXG4gICAgICAgIG1hcCh0ID0+ICh7XG4gICAgICAgICAgICAgIC4uLnQsIGV4dHJhY3RlZFVybDogdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QodC5yYXdVcmwpXG4gICAgICAgICAgICB9IGFzIE5hdmlnYXRpb25UcmFuc2l0aW9uKSksXG5cbiAgICAgICAgLy8gVXNpbmcgc3dpdGNoTWFwIHNvIHdlIGNhbmNlbCBleGVjdXRpbmcgbmF2aWdhdGlvbnMgd2hlbiBhIG5ldyBvbmUgY29tZXMgaW5cbiAgICAgICAgc3dpdGNoTWFwKHQgPT4ge1xuICAgICAgICAgIGxldCBjb21wbGV0ZWQgPSBmYWxzZTtcbiAgICAgICAgICBsZXQgZXJyb3JlZCA9IGZhbHNlO1xuICAgICAgICAgIHJldHVybiBvZiAodCkucGlwZShcbiAgICAgICAgICAgICAgc3dpdGNoTWFwKHQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVybFRyYW5zaXRpb24gPVxuICAgICAgICAgICAgICAgICAgICAhdGhpcy5uYXZpZ2F0ZWQgfHwgdC5leHRyYWN0ZWRVcmwudG9TdHJpbmcoKSAhPT0gdGhpcy5jdXJyZW50VXJsVHJlZS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NDdXJyZW50VXJsID1cbiAgICAgICAgICAgICAgICAgICAgKHRoaXMub25TYW1lVXJsTmF2aWdhdGlvbiA9PT0gJ3JlbG9hZCcgPyB0cnVlIDogdXJsVHJhbnNpdGlvbikgJiZcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LnNob3VsZFByb2Nlc3NVcmwodC5yYXdVcmwpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHByb2Nlc3NDdXJyZW50VXJsKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gb2YgKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIFVSTCBpZiBpbiBgZWFnZXJgIHVwZGF0ZSBtb2RlXG4gICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4gdGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJyAmJiAhdC5leHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEJyb3dzZXJVcmwodC5yYXdVcmwsICEhdC5leHRyYXMucmVwbGFjZVVybCwgdC5pZCkpLFxuICAgICAgICAgICAgICAgICAgICAgIC8vIEZpcmUgTmF2aWdhdGlvblN0YXJ0IGV2ZW50XG4gICAgICAgICAgICAgICAgICAgICAgc3dpdGNoTWFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IHRoaXMudHJhbnNpdGlvbnMuZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuZXcgTmF2aWdhdGlvblN0YXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgdC5zb3VyY2UsIHQuc3RhdGUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0cmFuc2l0aW9uICE9PSB0aGlzLnRyYW5zaXRpb25zLmdldFZhbHVlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt0XTtcbiAgICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgZGVsYXkgaXMgcmVxdWlyZWQgdG8gbWF0Y2ggb2xkIGJlaGF2aW9yIHRoYXQgZm9yY2VkIG5hdmlnYXRpb24gdG9cbiAgICAgICAgICAgICAgICAgICAgICAvLyBhbHdheXMgYmUgYXN5bmNcbiAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2hNYXAodCA9PiBQcm9taXNlLnJlc29sdmUodCkpLFxuXG4gICAgICAgICAgICAgICAgICAgICAgLy8gQXBwbHlSZWRpcmVjdHNcbiAgICAgICAgICAgICAgICAgICAgICBhcHBseVJlZGlyZWN0cyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZ01vZHVsZS5pbmplY3RvciwgdGhpcy5jb25maWdMb2FkZXIsIHRoaXMudXJsU2VyaWFsaXplcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcpLFxuICAgICAgICAgICAgICAgICAgICAgIC8vIFJlY29nbml6ZVxuICAgICAgICAgICAgICAgICAgICAgIHJlY29nbml6ZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb290Q29tcG9uZW50VHlwZSwgdGhpcy5jb25maWcsICh1cmwpID0+IHRoaXMuc2VyaWFsaXplVXJsKHVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSksXG5cbiAgICAgICAgICAgICAgICAgICAgICAvLyBGaXJlIFJvdXRlc1JlY29nbml6ZWRcbiAgICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByb3V0ZXNSZWNvZ25pemVkID0gbmV3IFJvdXRlc1JlY29nbml6ZWQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ICEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KHJvdXRlc1JlY29nbml6ZWQpO1xuICAgICAgICAgICAgICAgICAgICAgIH0pLCApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBjb25zdCBwcm9jZXNzUHJldmlvdXNVcmwgPSB1cmxUcmFuc2l0aW9uICYmIHRoaXMucmF3VXJsVHJlZSAmJlxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5zaG91bGRQcm9jZXNzVXJsKHRoaXMucmF3VXJsVHJlZSk7XG4gICAgICAgICAgICAgICAgICAvKiBXaGVuIHRoZSBjdXJyZW50IFVSTCBzaG91bGRuJ3QgYmUgcHJvY2Vzc2VkLCBidXQgdGhlIHByZXZpb3VzIG9uZSB3YXMsIHdlXG4gICAgICAgICAgICAgICAgICAgKiBoYW5kbGUgdGhpcyBcImVycm9yIGNvbmRpdGlvblwiIGJ5IG5hdmlnYXRpbmcgdG8gdGhlIHByZXZpb3VzbHkgc3VjY2Vzc2Z1bCBVUkwsXG4gICAgICAgICAgICAgICAgICAgKiBidXQgbGVhdmluZyB0aGUgVVJMIGludGFjdC4qL1xuICAgICAgICAgICAgICAgICAgaWYgKHByb2Nlc3NQcmV2aW91c1VybCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7aWQsIGV4dHJhY3RlZFVybCwgc291cmNlLCBzdGF0ZSwgZXh0cmFzfSA9IHQ7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdlN0YXJ0ID1cbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOYXZpZ2F0aW9uU3RhcnQoaWQsIHRoaXMuc2VyaWFsaXplVXJsKGV4dHJhY3RlZFVybCksIHNvdXJjZSwgc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2U3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRTbmFwc2hvdCA9XG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVFbXB0eVN0YXRlKGV4dHJhY3RlZFVybCwgdGhpcy5yb290Q29tcG9uZW50VHlwZSkuc25hcHNob3Q7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mICh7XG4gICAgICAgICAgICAgICAgICAgICAgLi4udCxcbiAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRTbmFwc2hvdCxcbiAgICAgICAgICAgICAgICAgICAgICB1cmxBZnRlclJlZGlyZWN0czogZXh0cmFjdGVkVXJsLFxuICAgICAgICAgICAgICAgICAgICAgIGV4dHJhczogey4uLmV4dHJhcywgc2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZSwgcmVwbGFjZVVybDogZmFsc2V9LFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8qIFdoZW4gbmVpdGhlciB0aGUgY3VycmVudCBvciBwcmV2aW91cyBVUkwgY2FuIGJlIHByb2Nlc3NlZCwgZG8gbm90aGluZyBvdGhlclxuICAgICAgICAgICAgICAgICAgICAgKiB0aGFuIHVwZGF0ZSByb3V0ZXIncyBpbnRlcm5hbCByZWZlcmVuY2UgdG8gdGhlIGN1cnJlbnQgXCJzZXR0bGVkXCIgVVJMLiBUaGlzXG4gICAgICAgICAgICAgICAgICAgICAqIHdheSB0aGUgbmV4dCBuYXZpZ2F0aW9uIHdpbGwgYmUgY29taW5nIGZyb20gdGhlIGN1cnJlbnQgVVJMIGluIHRoZSBicm93c2VyLlxuICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yYXdVcmxUcmVlID0gdC5yYXdVcmw7XG4gICAgICAgICAgICAgICAgICAgIHQucmVzb2x2ZShudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgLy8gQmVmb3JlIFByZWFjdGl2YXRpb25cbiAgICAgICAgICAgICAgc3dpdGNoVGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgICAgICAgIHRhcmdldFNuYXBzaG90LFxuICAgICAgICAgICAgICAgICAgaWQ6IG5hdmlnYXRpb25JZCxcbiAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZFVybDogYXBwbGllZFVybFRyZWUsXG4gICAgICAgICAgICAgICAgICByYXdVcmw6IHJhd1VybFRyZWUsXG4gICAgICAgICAgICAgICAgICBleHRyYXM6IHtza2lwTG9jYXRpb25DaGFuZ2UsIHJlcGxhY2VVcmx9XG4gICAgICAgICAgICAgICAgfSA9IHQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaG9va3MuYmVmb3JlUHJlYWN0aXZhdGlvbih0YXJnZXRTbmFwc2hvdCAhLCB7XG4gICAgICAgICAgICAgICAgICBuYXZpZ2F0aW9uSWQsXG4gICAgICAgICAgICAgICAgICBhcHBsaWVkVXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgIHJhd1VybFRyZWUsXG4gICAgICAgICAgICAgICAgICBza2lwTG9jYXRpb25DaGFuZ2U6ICEhc2tpcExvY2F0aW9uQ2hhbmdlLFxuICAgICAgICAgICAgICAgICAgcmVwbGFjZVVybDogISFyZXBsYWNlVXJsLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAvLyAtLS0gR1VBUkRTIC0tLVxuICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZ3VhcmRzU3RhcnQgPSBuZXcgR3VhcmRzQ2hlY2tTdGFydChcbiAgICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzKSxcbiAgICAgICAgICAgICAgICAgICAgdC50YXJnZXRTbmFwc2hvdCAhKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChndWFyZHNTdGFydCk7XG4gICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICBtYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJlQWN0aXZhdGlvbiA9IG5ldyBQcmVBY3RpdmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICB0LnRhcmdldFNuYXBzaG90ICEsIHQuY3VycmVudFNuYXBzaG90LCB0aGlzLm5nTW9kdWxlLmluamVjdG9yLFxuICAgICAgICAgICAgICAgICAgICAoZXZ0OiBFdmVudCkgPT4gdGhpcy50cmlnZ2VyRXZlbnQoZXZ0KSk7XG4gICAgICAgICAgICAgICAgcHJlQWN0aXZhdGlvbi5pbml0aWFsaXplKHRoaXMucm9vdENvbnRleHRzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gey4uLnQsIHByZUFjdGl2YXRpb259O1xuICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICBjaGVja0d1YXJkcygpLFxuXG4gICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBndWFyZHNFbmQgPSBuZXcgR3VhcmRzQ2hlY2tFbmQoXG4gICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgdGhpcy5zZXJpYWxpemVVcmwodC51cmxBZnRlclJlZGlyZWN0cyksXG4gICAgICAgICAgICAgICAgICAgIHQudGFyZ2V0U25hcHNob3QgISwgISF0Lmd1YXJkc1Jlc3VsdCk7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQoZ3VhcmRzRW5kKTtcbiAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgZmlsdGVyKHQgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghdC5ndWFyZHNSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gICAgICAgICAgICAgICAgICBjb25zdCBuYXZDYW5jZWwgPVxuICAgICAgICAgICAgICAgICAgICAgIG5ldyBOYXZpZ2F0aW9uQ2FuY2VsKHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgJycpO1xuICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdkNhbmNlbCk7XG4gICAgICAgICAgICAgICAgICB0LnJlc29sdmUoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgLy8gLS0tIFJFU09MVkUgLS0tXG4gICAgICAgICAgICAgIHN3aXRjaFRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodC5wcmVBY3RpdmF0aW9uICEuaXNBY3RpdmF0aW5nKCkpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBvZiAodCkucGlwZShcbiAgICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlU3RhcnQgPSBuZXcgUmVzb2x2ZVN0YXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzKSwgdC50YXJnZXRTbmFwc2hvdCAhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KHJlc29sdmVTdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZURhdGEodGhpcy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5KSwgIC8vXG4gICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZUVuZCA9IG5ldyBSZXNvbHZlRW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzKSwgdC50YXJnZXRTbmFwc2hvdCAhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KHJlc29sdmVFbmQpO1xuICAgICAgICAgICAgICAgICAgICAgIH0pLCApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAvLyAtLS0gQUZURVIgUFJFQUNUSVZBVElPTiAtLS1cbiAgICAgICAgICAgICAgc3dpdGNoVGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgICAgICAgIHRhcmdldFNuYXBzaG90LFxuICAgICAgICAgICAgICAgICAgaWQ6IG5hdmlnYXRpb25JZCxcbiAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZFVybDogYXBwbGllZFVybFRyZWUsXG4gICAgICAgICAgICAgICAgICByYXdVcmw6IHJhd1VybFRyZWUsXG4gICAgICAgICAgICAgICAgICBleHRyYXM6IHtza2lwTG9jYXRpb25DaGFuZ2UsIHJlcGxhY2VVcmx9XG4gICAgICAgICAgICAgICAgfSA9IHQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaG9va3MuYWZ0ZXJQcmVhY3RpdmF0aW9uKHRhcmdldFNuYXBzaG90ICEsIHtcbiAgICAgICAgICAgICAgICAgIG5hdmlnYXRpb25JZCxcbiAgICAgICAgICAgICAgICAgIGFwcGxpZWRVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgcmF3VXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgIHNraXBMb2NhdGlvbkNoYW5nZTogISFza2lwTG9jYXRpb25DaGFuZ2UsXG4gICAgICAgICAgICAgICAgICByZXBsYWNlVXJsOiAhIXJlcGxhY2VVcmwsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgIG1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRSb3V0ZXJTdGF0ZSA9IGNyZWF0ZVJvdXRlclN0YXRlKFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJvdXRlUmV1c2VTdHJhdGVneSwgdC50YXJnZXRTbmFwc2hvdCAhLCB0LmN1cnJlbnRSb3V0ZXJTdGF0ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICh7Li4udCwgdGFyZ2V0Um91dGVyU3RhdGV9KTtcbiAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgLyogT25jZSBoZXJlLCB3ZSBhcmUgYWJvdXQgdG8gYWN0aXZhdGUgc3luY3Jvbm91c2x5LiBUaGUgYXNzdW1wdGlvbiBpcyB0aGlzIHdpbGxcbiAgICAgICAgICAgICAgICAgc3VjY2VlZCwgYW5kIHVzZXIgY29kZSBtYXkgcmVhZCBmcm9tIHRoZSBSb3V0ZXIgc2VydmljZS4gVGhlcmVmb3JlIGJlZm9yZVxuICAgICAgICAgICAgICAgICBhY3RpdmF0aW9uLCB3ZSBuZWVkIHRvIHVwZGF0ZSByb3V0ZXIgcHJvcGVydGllcyBzdG9yaW5nIHRoZSBjdXJyZW50IFVSTCBhbmQgdGhlXG4gICAgICAgICAgICAgICAgIFJvdXRlclN0YXRlLCBhcyB3ZWxsIGFzIHVwZGF0ZWQgdGhlIGJyb3dzZXIgVVJMLiBBbGwgdGhpcyBzaG91bGQgaGFwcGVuICpiZWZvcmUqXG4gICAgICAgICAgICAgICAgIGFjdGl2YXRpbmcuICovXG4gICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gdC51cmxBZnRlclJlZGlyZWN0cztcbiAgICAgICAgICAgICAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodGhpcy5jdXJyZW50VXJsVHJlZSwgdC5yYXdVcmwpO1xuXG4gICAgICAgICAgICAgICAgKHRoaXMgYXN7cm91dGVyU3RhdGU6IFJvdXRlclN0YXRlfSkucm91dGVyU3RhdGUgPSB0LnRhcmdldFJvdXRlclN0YXRlICE7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2RlZmVycmVkJyAmJiAhdC5leHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLnNldEJyb3dzZXJVcmwodGhpcy5yYXdVcmxUcmVlLCAhIXQuZXh0cmFzLnJlcGxhY2VVcmwsIHQuaWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgYWN0aXZhdGVSb3V0ZXMoXG4gICAgICAgICAgICAgICAgICB0aGlzLnJvb3RDb250ZXh0cywgdGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3ksXG4gICAgICAgICAgICAgICAgICAoZXZ0OiBFdmVudCkgPT4gdGhpcy50cmlnZ2VyRXZlbnQoZXZ0KSksXG5cbiAgICAgICAgICAgICAgdGFwKHtuZXh0KCkgeyBjb21wbGV0ZWQgPSB0cnVlOyB9LCBjb21wbGV0ZSgpIHsgY29tcGxldGVkID0gdHJ1ZTsgfX0pLFxuICAgICAgICAgICAgICBmaW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgLyogV2hlbiB0aGUgbmF2aWdhdGlvbiBzdHJlYW0gZmluaXNoZXMgZWl0aGVyIHRocm91Z2ggZXJyb3Igb3Igc3VjY2Vzcywgd2Ugc2V0IHRoZVxuICAgICAgICAgICAgICAgICAqIGBjb21wbGV0ZWRgIG9yIGBlcnJvcmVkYCBmbGFnLiBIb3dldmVyLCB0aGVyZSBhcmUgc29tZSBzaXR1YXRpb25zIHdoZXJlIHdlIGNvdWxkXG4gICAgICAgICAgICAgICAgICogZ2V0IGhlcmUgd2l0aG91dCBlaXRoZXIgb2YgdGhvc2UgYmVpbmcgc2V0LiBGb3IgaW5zdGFuY2UsIGEgcmVkaXJlY3QgZHVyaW5nXG4gICAgICAgICAgICAgICAgICogTmF2aWdhdGlvblN0YXJ0LiBUaGVyZWZvcmUsIHRoaXMgaXMgYSBjYXRjaC1hbGwgdG8gbWFrZSBzdXJlIHRoZSBOYXZpZ2F0aW9uQ2FuY2VsXG4gICAgICAgICAgICAgICAgICogZXZlbnQgaXMgZmlyZWQgd2hlbiBhIG5hdmlnYXRpb24gZ2V0cyBjYW5jZWxsZWQgYnV0IG5vdCBjYXVnaHQgYnkgb3RoZXIgbWVhbnMuICovXG4gICAgICAgICAgICAgICAgaWYgKCFjb21wbGV0ZWQgJiYgIWVycm9yZWQpIHtcbiAgICAgICAgICAgICAgICAgIC8vIE11c3QgcmVzZXQgdG8gY3VycmVudCBVUkwgdHJlZSBoZXJlIHRvIGVuc3VyZSBoaXN0b3J5LnN0YXRlIGlzIHNldC4gT24gYSBmcmVzaFxuICAgICAgICAgICAgICAgICAgLy8gcGFnZSBsb2FkLCBpZiBhIG5ldyBuYXZpZ2F0aW9uIGNvbWVzIGluIGJlZm9yZSBhIHN1Y2Nlc3NmdWwgbmF2aWdhdGlvblxuICAgICAgICAgICAgICAgICAgLy8gY29tcGxldGVzLCB0aGVyZSB3aWxsIGJlIG5vdGhpbmcgaW4gaGlzdG9yeS5zdGF0ZS5uYXZpZ2F0aW9uSWQuIFRoaXMgY2FuIGNhdXNlXG4gICAgICAgICAgICAgICAgICAvLyBzeW5jIHByb2JsZW1zIHdpdGggQW5ndWxhckpTIHN5bmMgY29kZSB3aGljaCBsb29rcyBmb3IgYSB2YWx1ZSBoZXJlIGluIG9yZGVyXG4gICAgICAgICAgICAgICAgICAvLyB0byBkZXRlcm1pbmUgd2hldGhlciBvciBub3QgdG8gaGFuZGxlIGEgZ2l2ZW4gcG9wc3RhdGUgZXZlbnQgb3IgdG8gbGVhdmUgaXRcbiAgICAgICAgICAgICAgICAgIC8vIHRvIHRoZSBBbmd1YWxyIHJvdXRlci5cbiAgICAgICAgICAgICAgICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gICAgICAgICAgICAgICAgICBjb25zdCBuYXZDYW5jZWwgPSBuZXcgTmF2aWdhdGlvbkNhbmNlbChcbiAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgYE5hdmlnYXRpb24gSUQgJHt0LmlkfSBpcyBub3QgZXF1YWwgdG8gdGhlIGN1cnJlbnQgbmF2aWdhdGlvbiBpZCAke3RoaXMubmF2aWdhdGlvbklkfWApO1xuICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdkNhbmNlbCk7XG4gICAgICAgICAgICAgICAgICB0LnJlc29sdmUoZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgIGNhdGNoRXJyb3IoKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlcnJvcmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAvKiBUaGlzIGVycm9yIHR5cGUgaXMgaXNzdWVkIGR1cmluZyBSZWRpcmVjdCwgYW5kIGlzIGhhbmRsZWQgYXMgYSBjYW5jZWxsYXRpb25cbiAgICAgICAgICAgICAgICAgKiByYXRoZXIgdGhhbiBhbiBlcnJvci4gKi9cbiAgICAgICAgICAgICAgICBpZiAoaXNOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoZSkpIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIHRoaXMucmVzZXRTdGF0ZUFuZFVybCh0LmN1cnJlbnRSb3V0ZXJTdGF0ZSwgdC5jdXJyZW50VXJsVHJlZSwgdC5yYXdVcmwpO1xuICAgICAgICAgICAgICAgICAgY29uc3QgbmF2Q2FuY2VsID1cbiAgICAgICAgICAgICAgICAgICAgICBuZXcgTmF2aWdhdGlvbkNhbmNlbCh0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIGUubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2Q2FuY2VsKTtcbiAgICAgICAgICAgICAgICAgIC8qIEFsbCBvdGhlciBlcnJvcnMgc2hvdWxkIHJlc2V0IHRvIHRoZSByb3V0ZXIncyBpbnRlcm5hbCBVUkwgcmVmZXJlbmNlIHRvIHRoZVxuICAgICAgICAgICAgICAgICAgICogcHJlLWVycm9yIHN0YXRlLiAqL1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLnJlc2V0U3RhdGVBbmRVcmwodC5jdXJyZW50Um91dGVyU3RhdGUsIHQuY3VycmVudFVybFRyZWUsIHQucmF3VXJsKTtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdkVycm9yID0gbmV3IE5hdmlnYXRpb25FcnJvcih0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIGUpO1xuICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdkVycm9yKTtcbiAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHQucmVzb2x2ZSh0aGlzLmVycm9ySGFuZGxlcihlKSk7XG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChlZSkge1xuICAgICAgICAgICAgICAgICAgICB0LnJlamVjdChlZSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgICAgICAgICAgfSksICk7XG4gICAgICAgICAgLy8gVE9ETyhqYXNvbmFkZW4pOiByZW1vdmUgY2FzdCBvbmNlIGczIGlzIG9uIHVwZGF0ZWQgVHlwZVNjcmlwdFxuICAgICAgICB9KSkgYXMgYW55IGFzIE9ic2VydmFibGU8TmF2aWdhdGlvblRyYW5zaXRpb24+O1xuICB9XG5cbiAgLyoqXG4gICAqIEBpbnRlcm5hbFxuICAgKiBUT0RPOiB0aGlzIHNob3VsZCBiZSByZW1vdmVkIG9uY2UgdGhlIGNvbnN0cnVjdG9yIG9mIHRoZSByb3V0ZXIgbWFkZSBpbnRlcm5hbFxuICAgKi9cbiAgcmVzZXRSb290Q29tcG9uZW50VHlwZShyb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+KTogdm9pZCB7XG4gICAgdGhpcy5yb290Q29tcG9uZW50VHlwZSA9IHJvb3RDb21wb25lbnRUeXBlO1xuICAgIC8vIFRPRE86IHZzYXZraW4gcm91dGVyIDQuMCBzaG91bGQgbWFrZSB0aGUgcm9vdCBjb21wb25lbnQgc2V0IHRvIG51bGxcbiAgICAvLyB0aGlzIHdpbGwgc2ltcGxpZnkgdGhlIGxpZmVjeWNsZSBvZiB0aGUgcm91dGVyLlxuICAgIHRoaXMucm91dGVyU3RhdGUucm9vdC5jb21wb25lbnQgPSB0aGlzLnJvb3RDb21wb25lbnRUeXBlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUcmFuc2l0aW9uKCk6IE5hdmlnYXRpb25UcmFuc2l0aW9uIHsgcmV0dXJuIHRoaXMudHJhbnNpdGlvbnMudmFsdWU7IH1cblxuICBwcml2YXRlIHNldFRyYW5zaXRpb24odDogUGFydGlhbDxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4pOiB2b2lkIHtcbiAgICB0aGlzLnRyYW5zaXRpb25zLm5leHQoey4uLnRoaXMuZ2V0VHJhbnNpdGlvbigpLCAuLi50fSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyIGFuZCBwZXJmb3JtcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaW5pdGlhbE5hdmlnYXRpb24oKTogdm9pZCB7XG4gICAgdGhpcy5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICBpZiAodGhpcy5uYXZpZ2F0aW9uSWQgPT09IDApIHtcbiAgICAgIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmxvY2F0aW9uLnBhdGgodHJ1ZSksIHtyZXBsYWNlVXJsOiB0cnVlfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdXAgdGhlIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lci5cbiAgICovXG4gIHNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpOiB2b2lkIHtcbiAgICAvLyBEb24ndCBuZWVkIHRvIHVzZSBab25lLndyYXAgYW55IG1vcmUsIGJlY2F1c2Ugem9uZS5qc1xuICAgIC8vIGFscmVhZHkgcGF0Y2ggb25Qb3BTdGF0ZSwgc28gbG9jYXRpb24gY2hhbmdlIGNhbGxiYWNrIHdpbGxcbiAgICAvLyBydW4gaW50byBuZ1pvbmVcbiAgICBpZiAoIXRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24gPSA8YW55PnRoaXMubG9jYXRpb24uc3Vic2NyaWJlKChjaGFuZ2U6IGFueSkgPT4ge1xuICAgICAgICBsZXQgcmF3VXJsVHJlZSA9IHRoaXMucGFyc2VVcmwoY2hhbmdlWyd1cmwnXSk7XG4gICAgICAgIGNvbnN0IHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIgPSBjaGFuZ2VbJ3R5cGUnXSA9PT0gJ3BvcHN0YXRlJyA/ICdwb3BzdGF0ZScgOiAnaGFzaGNoYW5nZSc7XG4gICAgICAgIGNvbnN0IHN0YXRlID0gY2hhbmdlLnN0YXRlICYmIGNoYW5nZS5zdGF0ZS5uYXZpZ2F0aW9uSWQgP1xuICAgICAgICAgICAge25hdmlnYXRpb25JZDogY2hhbmdlLnN0YXRlLm5hdmlnYXRpb25JZH0gOlxuICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgc2V0VGltZW91dChcbiAgICAgICAgICAgICgpID0+IHsgdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24ocmF3VXJsVHJlZSwgc291cmNlLCBzdGF0ZSwge3JlcGxhY2VVcmw6IHRydWV9KTsgfSwgMCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKiogVGhlIGN1cnJlbnQgdXJsICovXG4gIGdldCB1cmwoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuc2VyaWFsaXplVXJsKHRoaXMuY3VycmVudFVybFRyZWUpOyB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICB0cmlnZ2VyRXZlbnQoZXZlbnQ6IEV2ZW50KTogdm9pZCB7ICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PikubmV4dChldmVudCk7IH1cblxuICAvKipcbiAgICogUmVzZXRzIHRoZSBjb25maWd1cmF0aW9uIHVzZWQgZm9yIG5hdmlnYXRpb24gYW5kIGdlbmVyYXRpbmcgbGlua3MuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqICMjIyBFeGFtcGxlXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIucmVzZXRDb25maWcoW1xuICAgKiAgeyBwYXRoOiAndGVhbS86aWQnLCBjb21wb25lbnQ6IFRlYW1DbXAsIGNoaWxkcmVuOiBbXG4gICAqICAgIHsgcGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wIH0sXG4gICAqICAgIHsgcGF0aDogJ3VzZXIvOm5hbWUnLCBjb21wb25lbnQ6IFVzZXJDbXAgfVxuICAgKiAgXX1cbiAgICogXSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcmVzZXRDb25maWcoY29uZmlnOiBSb3V0ZXMpOiB2b2lkIHtcbiAgICB2YWxpZGF0ZUNvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gICAgdGhpcy5uYXZpZ2F0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSAtMTtcbiAgfVxuXG4gIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gIG5nT25EZXN0cm95KCk6IHZvaWQgeyB0aGlzLmRpc3Bvc2UoKTsgfVxuXG4gIC8qKiBEaXNwb3NlcyBvZiB0aGUgcm91dGVyICovXG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24gPSBudWxsICE7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFwcGxpZXMgYW4gYXJyYXkgb2YgY29tbWFuZHMgdG8gdGhlIGN1cnJlbnQgdXJsIHRyZWUgYW5kIGNyZWF0ZXMgYSBuZXcgdXJsIHRyZWUuXG4gICAqXG4gICAqIFdoZW4gZ2l2ZW4gYW4gYWN0aXZhdGUgcm91dGUsIGFwcGxpZXMgdGhlIGdpdmVuIGNvbW1hbmRzIHN0YXJ0aW5nIGZyb20gdGhlIHJvdXRlLlxuICAgKiBXaGVuIG5vdCBnaXZlbiBhIHJvdXRlLCBhcHBsaWVzIHRoZSBnaXZlbiBjb21tYW5kIHN0YXJ0aW5nIGZyb20gdGhlIHJvb3QuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqICMjIyBFeGFtcGxlXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvdXNlci8xMVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzO2V4cGFuZD10cnVlL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7ZXhwYW5kOiB0cnVlfSwgJ3VzZXInLCAxMV0pO1xuICAgKlxuICAgKiAvLyB5b3UgY2FuIGNvbGxhcHNlIHN0YXRpYyBzZWdtZW50cyBsaWtlIHRoaXMgKHRoaXMgd29ya3Mgb25seSB3aXRoIHRoZSBmaXJzdCBwYXNzZWQtaW4gdmFsdWUpOlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtLzMzL3VzZXInLCB1c2VySWRdKTtcbiAgICpcbiAgICogLy8gSWYgdGhlIGZpcnN0IHNlZ21lbnQgY2FuIGNvbnRhaW4gc2xhc2hlcywgYW5kIHlvdSBkbyBub3Qgd2FudCB0aGUgcm91dGVyIHRvIHNwbGl0IGl0LCB5b3VcbiAgICogLy8gY2FuIGRvIHRoZSBmb2xsb3dpbmc6XG4gICAqXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFt7c2VnbWVudFBhdGg6ICcvb25lL3R3byd9XSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMy8odXNlci8xMS8vcmlnaHQ6Y2hhdClcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6ICdjaGF0J319XSk7XG4gICAqXG4gICAqIC8vIHJlbW92ZSB0aGUgcmlnaHQgc2Vjb25kYXJ5IG5vZGVcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6IG51bGx9fV0pO1xuICAgKlxuICAgKiAvLyBhc3N1bWluZyB0aGUgY3VycmVudCB1cmwgaXMgYC90ZWFtLzMzL3VzZXIvMTFgIGFuZCB0aGUgcm91dGUgcG9pbnRzIHRvIGB1c2VyLzExYFxuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzExL2RldGFpbHNcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWydkZXRhaWxzJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzQ0L3VzZXIvMjJcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycuLi8uLi90ZWFtLzQ0L3VzZXIvMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgY3JlYXRlVXJsVHJlZShjb21tYW5kczogYW55W10sIG5hdmlnYXRpb25FeHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7fSk6IFVybFRyZWUge1xuICAgIGNvbnN0IHtyZWxhdGl2ZVRvLCAgICAgICAgICBxdWVyeVBhcmFtcywgICAgICAgICBmcmFnbWVudCxcbiAgICAgICAgICAgcHJlc2VydmVRdWVyeVBhcmFtcywgcXVlcnlQYXJhbXNIYW5kbGluZywgcHJlc2VydmVGcmFnbWVudH0gPSBuYXZpZ2F0aW9uRXh0cmFzO1xuICAgIGlmIChpc0Rldk1vZGUoKSAmJiBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zICYmIDxhbnk+Y29uc29sZSAmJiA8YW55PmNvbnNvbGUud2Fybikge1xuICAgICAgY29uc29sZS53YXJuKCdwcmVzZXJ2ZVF1ZXJ5UGFyYW1zIGlzIGRlcHJlY2F0ZWQsIHVzZSBxdWVyeVBhcmFtc0hhbmRsaW5nIGluc3RlYWQuJyk7XG4gICAgfVxuICAgIGNvbnN0IGEgPSByZWxhdGl2ZVRvIHx8IHRoaXMucm91dGVyU3RhdGUucm9vdDtcbiAgICBjb25zdCBmID0gcHJlc2VydmVGcmFnbWVudCA/IHRoaXMuY3VycmVudFVybFRyZWUuZnJhZ21lbnQgOiBmcmFnbWVudDtcbiAgICBsZXQgcTogUGFyYW1zfG51bGwgPSBudWxsO1xuICAgIGlmIChxdWVyeVBhcmFtc0hhbmRsaW5nKSB7XG4gICAgICBzd2l0Y2ggKHF1ZXJ5UGFyYW1zSGFuZGxpbmcpIHtcbiAgICAgICAgY2FzZSAnbWVyZ2UnOlxuICAgICAgICAgIHEgPSB7Li4udGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcywgLi4ucXVlcnlQYXJhbXN9O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdwcmVzZXJ2ZSc6XG4gICAgICAgICAgcSA9IHRoaXMuY3VycmVudFVybFRyZWUucXVlcnlQYXJhbXM7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcSA9IHF1ZXJ5UGFyYW1zIHx8IG51bGw7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHEgPSBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zID8gdGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcyA6IHF1ZXJ5UGFyYW1zIHx8IG51bGw7XG4gICAgfVxuICAgIGlmIChxICE9PSBudWxsKSB7XG4gICAgICBxID0gdGhpcy5yZW1vdmVFbXB0eVByb3BzKHEpO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlVXJsVHJlZShhLCB0aGlzLmN1cnJlbnRVcmxUcmVlLCBjb21tYW5kcywgcSAhLCBmICEpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIGJhc2VkIG9uIHRoZSBwcm92aWRlZCB1cmwuIFRoaXMgbmF2aWdhdGlvbiBpcyBhbHdheXMgYWJzb2x1dGUuXG4gICAqXG4gICAqIFJldHVybnMgYSBwcm9taXNlIHRoYXQ6XG4gICAqIC0gcmVzb2x2ZXMgdG8gJ3RydWUnIHdoZW4gbmF2aWdhdGlvbiBzdWNjZWVkcyxcbiAgICogLSByZXNvbHZlcyB0byAnZmFsc2UnIHdoZW4gbmF2aWdhdGlvbiBmYWlscyxcbiAgICogLSBpcyByZWplY3RlZCB3aGVuIGFuIGVycm9yIGhhcHBlbnMuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqICMjIyBFeGFtcGxlXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIubmF2aWdhdGVCeVVybChcIi90ZWFtLzMzL3VzZXIvMTFcIik7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTFxuICAgKiByb3V0ZXIubmF2aWdhdGVCeVVybChcIi90ZWFtLzMzL3VzZXIvMTFcIiwgeyBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBTaW5jZSBgbmF2aWdhdGVCeVVybCgpYCB0YWtlcyBhbiBhYnNvbHV0ZSBVUkwgYXMgdGhlIGZpcnN0IHBhcmFtZXRlcixcbiAgICogaXQgd2lsbCBub3QgYXBwbHkgYW55IGRlbHRhIHRvIHRoZSBjdXJyZW50IFVSTCBhbmQgaWdub3JlcyBhbnkgcHJvcGVydGllc1xuICAgKiBpbiB0aGUgc2Vjb25kIHBhcmFtZXRlciAodGhlIGBOYXZpZ2F0aW9uRXh0cmFzYCkgdGhhdCB3b3VsZCBjaGFuZ2UgdGhlXG4gICAqIHByb3ZpZGVkIFVSTC5cbiAgICovXG4gIG5hdmlnYXRlQnlVcmwodXJsOiBzdHJpbmd8VXJsVHJlZSwgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3NraXBMb2NhdGlvbkNoYW5nZTogZmFsc2V9KTpcbiAgICAgIFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmIChpc0Rldk1vZGUoKSAmJiB0aGlzLmlzTmdab25lRW5hYmxlZCAmJiAhTmdab25lLmlzSW5Bbmd1bGFyWm9uZSgpKSB7XG4gICAgICB0aGlzLmNvbnNvbGUud2FybihcbiAgICAgICAgICBgTmF2aWdhdGlvbiB0cmlnZ2VyZWQgb3V0c2lkZSBBbmd1bGFyIHpvbmUsIGRpZCB5b3UgZm9yZ2V0IHRvIGNhbGwgJ25nWm9uZS5ydW4oKSc/YCk7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IHVybCBpbnN0YW5jZW9mIFVybFRyZWUgPyB1cmwgOiB0aGlzLnBhcnNlVXJsKHVybCk7XG4gICAgY29uc3QgbWVyZ2VkVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh1cmxUcmVlLCB0aGlzLnJhd1VybFRyZWUpO1xuXG4gICAgcmV0dXJuIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKG1lcmdlZFRyZWUsICdpbXBlcmF0aXZlJywgbnVsbCwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZSBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgYXJyYXkgb2YgY29tbWFuZHMgYW5kIGEgc3RhcnRpbmcgcG9pbnQuXG4gICAqIElmIG5vIHN0YXJ0aW5nIHJvdXRlIGlzIHByb3ZpZGVkLCB0aGUgbmF2aWdhdGlvbiBpcyBhYnNvbHV0ZS5cbiAgICpcbiAgICogUmV0dXJucyBhIHByb21pc2UgdGhhdDpcbiAgICogLSByZXNvbHZlcyB0byAndHJ1ZScgd2hlbiBuYXZpZ2F0aW9uIHN1Y2NlZWRzLFxuICAgKiAtIHJlc29sdmVzIHRvICdmYWxzZScgd2hlbiBuYXZpZ2F0aW9uIGZhaWxzLFxuICAgKiAtIGlzIHJlamVjdGVkIHdoZW4gYW4gZXJyb3IgaGFwcGVucy5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogIyMjIEV4YW1wbGVcbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZShbJ3RlYW0nLCAzMywgJ3VzZXInLCAxMV0sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBOYXZpZ2F0ZSB3aXRob3V0IHVwZGF0aW5nIHRoZSBVUkxcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlLCBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWV9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIFRoZSBmaXJzdCBwYXJhbWV0ZXIgb2YgYG5hdmlnYXRlKClgIGlzIGEgZGVsdGEgdG8gYmUgYXBwbGllZCB0byB0aGUgY3VycmVudCBVUkxcbiAgICogb3IgdGhlIG9uZSBwcm92aWRlZCBpbiB0aGUgYHJlbGF0aXZlVG9gIHByb3BlcnR5IG9mIHRoZSBzZWNvbmQgcGFyYW1ldGVyICh0aGVcbiAgICogYE5hdmlnYXRpb25FeHRyYXNgKS5cbiAgICovXG4gIG5hdmlnYXRlKGNvbW1hbmRzOiBhbnlbXSwgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3NraXBMb2NhdGlvbkNoYW5nZTogZmFsc2V9KTpcbiAgICAgIFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHMpO1xuICAgIHJldHVybiB0aGlzLm5hdmlnYXRlQnlVcmwodGhpcy5jcmVhdGVVcmxUcmVlKGNvbW1hbmRzLCBleHRyYXMpLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqIFNlcmlhbGl6ZXMgYSBgVXJsVHJlZWAgaW50byBhIHN0cmluZyAqL1xuICBzZXJpYWxpemVVcmwodXJsOiBVcmxUcmVlKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodXJsKTsgfVxuXG4gIC8qKiBQYXJzZXMgYSBzdHJpbmcgaW50byBhIGBVcmxUcmVlYCAqL1xuICBwYXJzZVVybCh1cmw6IHN0cmluZyk6IFVybFRyZWUge1xuICAgIGxldCB1cmxUcmVlOiBVcmxUcmVlO1xuICAgIHRyeSB7XG4gICAgICB1cmxUcmVlID0gdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKHVybCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdXJsVHJlZSA9IHRoaXMubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyKGUsIHRoaXMudXJsU2VyaWFsaXplciwgdXJsKTtcbiAgICB9XG4gICAgcmV0dXJuIHVybFRyZWU7XG4gIH1cblxuICAvKiogUmV0dXJucyB3aGV0aGVyIHRoZSB1cmwgaXMgYWN0aXZhdGVkICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIGV4YWN0OiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgaWYgKHVybCBpbnN0YW5jZW9mIFVybFRyZWUpIHtcbiAgICAgIHJldHVybiBjb250YWluc1RyZWUodGhpcy5jdXJyZW50VXJsVHJlZSwgdXJsLCBleGFjdCk7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybFRyZWUsIGV4YWN0KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVtb3ZlRW1wdHlQcm9wcyhwYXJhbXM6IFBhcmFtcyk6IFBhcmFtcyB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHBhcmFtcykucmVkdWNlKChyZXN1bHQ6IFBhcmFtcywga2V5OiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlOiBhbnkgPSBwYXJhbXNba2V5XTtcbiAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sIHt9KTtcbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc05hdmlnYXRpb25zKCk6IHZvaWQge1xuICAgIHRoaXMubmF2aWdhdGlvbnMuc3Vic2NyaWJlKFxuICAgICAgICB0ID0+IHtcbiAgICAgICAgICB0aGlzLm5hdmlnYXRlZCA9IHRydWU7XG4gICAgICAgICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bElkID0gdC5pZDtcbiAgICAgICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgICAgIC5uZXh0KG5ldyBOYXZpZ2F0aW9uRW5kKFxuICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCB0aGlzLnNlcmlhbGl6ZVVybCh0aGlzLmN1cnJlbnRVcmxUcmVlKSkpO1xuICAgICAgICAgIHQucmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgfSxcbiAgICAgICAgZSA9PiB7IHRoaXMuY29uc29sZS53YXJuKGBVbmhhbmRsZWQgTmF2aWdhdGlvbiBFcnJvcjogYCk7IH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzY2hlZHVsZU5hdmlnYXRpb24oXG4gICAgICByYXdVcmw6IFVybFRyZWUsIHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIsIHN0YXRlOiB7bmF2aWdhdGlvbklkOiBudW1iZXJ9fG51bGwsXG4gICAgICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBsYXN0TmF2aWdhdGlvbiA9IHRoaXMuZ2V0VHJhbnNpdGlvbigpO1xuICAgIC8vIElmIHRoZSB1c2VyIHRyaWdnZXJzIGEgbmF2aWdhdGlvbiBpbXBlcmF0aXZlbHkgKGUuZy4sIGJ5IHVzaW5nIG5hdmlnYXRlQnlVcmwpLFxuICAgIC8vIGFuZCB0aGF0IG5hdmlnYXRpb24gcmVzdWx0cyBpbiAncmVwbGFjZVN0YXRlJyB0aGF0IGxlYWRzIHRvIHRoZSBzYW1lIFVSTCxcbiAgICAvLyB3ZSBzaG91bGQgc2tpcCB0aG9zZS5cbiAgICBpZiAobGFzdE5hdmlnYXRpb24gJiYgc291cmNlICE9PSAnaW1wZXJhdGl2ZScgJiYgbGFzdE5hdmlnYXRpb24uc291cmNlID09PSAnaW1wZXJhdGl2ZScgJiZcbiAgICAgICAgbGFzdE5hdmlnYXRpb24ucmF3VXJsLnRvU3RyaW5nKCkgPT09IHJhd1VybC50b1N0cmluZygpKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpOyAgLy8gcmV0dXJuIHZhbHVlIGlzIG5vdCB1c2VkXG4gICAgfVxuXG4gICAgLy8gQmVjYXVzZSBvZiBhIGJ1ZyBpbiBJRSBhbmQgRWRnZSwgdGhlIGxvY2F0aW9uIGNsYXNzIGZpcmVzIHR3byBldmVudHMgKHBvcHN0YXRlIGFuZFxuICAgIC8vIGhhc2hjaGFuZ2UpIGV2ZXJ5IHNpbmdsZSB0aW1lLiBUaGUgc2Vjb25kIG9uZSBzaG91bGQgYmUgaWdub3JlZC4gT3RoZXJ3aXNlLCB0aGUgVVJMIHdpbGxcbiAgICAvLyBmbGlja2VyLiBIYW5kbGVzIHRoZSBjYXNlIHdoZW4gYSBwb3BzdGF0ZSB3YXMgZW1pdHRlZCBmaXJzdC5cbiAgICBpZiAobGFzdE5hdmlnYXRpb24gJiYgc291cmNlID09ICdoYXNoY2hhbmdlJyAmJiBsYXN0TmF2aWdhdGlvbi5zb3VyY2UgPT09ICdwb3BzdGF0ZScgJiZcbiAgICAgICAgbGFzdE5hdmlnYXRpb24ucmF3VXJsLnRvU3RyaW5nKCkgPT09IHJhd1VybC50b1N0cmluZygpKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpOyAgLy8gcmV0dXJuIHZhbHVlIGlzIG5vdCB1c2VkXG4gICAgfVxuICAgIC8vIEJlY2F1c2Ugb2YgYSBidWcgaW4gSUUgYW5kIEVkZ2UsIHRoZSBsb2NhdGlvbiBjbGFzcyBmaXJlcyB0d28gZXZlbnRzIChwb3BzdGF0ZSBhbmRcbiAgICAvLyBoYXNoY2hhbmdlKSBldmVyeSBzaW5nbGUgdGltZS4gVGhlIHNlY29uZCBvbmUgc2hvdWxkIGJlIGlnbm9yZWQuIE90aGVyd2lzZSwgdGhlIFVSTCB3aWxsXG4gICAgLy8gZmxpY2tlci4gSGFuZGxlcyB0aGUgY2FzZSB3aGVuIGEgaGFzaGNoYW5nZSB3YXMgZW1pdHRlZCBmaXJzdC5cbiAgICBpZiAobGFzdE5hdmlnYXRpb24gJiYgc291cmNlID09ICdwb3BzdGF0ZScgJiYgbGFzdE5hdmlnYXRpb24uc291cmNlID09PSAnaGFzaGNoYW5nZScgJiZcbiAgICAgICAgbGFzdE5hdmlnYXRpb24ucmF3VXJsLnRvU3RyaW5nKCkgPT09IHJhd1VybC50b1N0cmluZygpKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpOyAgLy8gcmV0dXJuIHZhbHVlIGlzIG5vdCB1c2VkXG4gICAgfVxuXG4gICAgbGV0IHJlc29sdmU6IGFueSA9IG51bGw7XG4gICAgbGV0IHJlamVjdDogYW55ID0gbnVsbDtcblxuICAgIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzLCByZWopID0+IHtcbiAgICAgIHJlc29sdmUgPSByZXM7XG4gICAgICByZWplY3QgPSByZWo7XG4gICAgfSk7XG5cbiAgICBjb25zdCBpZCA9ICsrdGhpcy5uYXZpZ2F0aW9uSWQ7XG4gICAgdGhpcy5zZXRUcmFuc2l0aW9uKHtcbiAgICAgIGlkLFxuICAgICAgc291cmNlLFxuICAgICAgc3RhdGUsXG4gICAgICBjdXJyZW50VXJsVHJlZTogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIGN1cnJlbnRSYXdVcmw6IHRoaXMucmF3VXJsVHJlZSwgcmF3VXJsLCBleHRyYXMsIHJlc29sdmUsIHJlamVjdCwgcHJvbWlzZSxcbiAgICAgIGN1cnJlbnRTbmFwc2hvdDogdGhpcy5yb3V0ZXJTdGF0ZS5zbmFwc2hvdCxcbiAgICAgIGN1cnJlbnRSb3V0ZXJTdGF0ZTogdGhpcy5yb3V0ZXJTdGF0ZVxuICAgIH0pO1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoYXQgdGhlIGVycm9yIGlzIHByb3BhZ2F0ZWQgZXZlbiB0aG91Z2ggYHByb2Nlc3NOYXZpZ2F0aW9uc2AgY2F0Y2hcbiAgICAvLyBoYW5kbGVyIGRvZXMgbm90IHJldGhyb3dcbiAgICByZXR1cm4gcHJvbWlzZS5jYXRjaCgoZTogYW55KSA9PiB7IHJldHVybiBQcm9taXNlLnJlamVjdChlKTsgfSk7XG4gIH1cblxuICBwcml2YXRlIHNldEJyb3dzZXJVcmwodXJsOiBVcmxUcmVlLCByZXBsYWNlVXJsOiBib29sZWFuLCBpZDogbnVtYmVyKSB7XG4gICAgY29uc3QgcGF0aCA9IHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodXJsKTtcbiAgICBpZiAodGhpcy5sb2NhdGlvbi5pc0N1cnJlbnRQYXRoRXF1YWxUbyhwYXRoKSB8fCByZXBsYWNlVXJsKSB7XG4gICAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShwYXRoLCAnJywge25hdmlnYXRpb25JZDogaWR9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5sb2NhdGlvbi5nbyhwYXRoLCAnJywge25hdmlnYXRpb25JZDogaWR9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlc2V0U3RhdGVBbmRVcmwoc3RvcmVkU3RhdGU6IFJvdXRlclN0YXRlLCBzdG9yZWRVcmw6IFVybFRyZWUsIHJhd1VybDogVXJsVHJlZSk6IHZvaWQge1xuICAgICh0aGlzIGFze3JvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZX0pLnJvdXRlclN0YXRlID0gc3RvcmVkU3RhdGU7XG4gICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IHN0b3JlZFVybDtcbiAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodGhpcy5jdXJyZW50VXJsVHJlZSwgcmF3VXJsKTtcbiAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTogdm9pZCB7XG4gICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUoXG4gICAgICAgIHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodGhpcy5yYXdVcmxUcmVlKSwgJycsIHtuYXZpZ2F0aW9uSWQ6IHRoaXMubGFzdFN1Y2Nlc3NmdWxJZH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHM6IHN0cmluZ1tdKTogdm9pZCB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29tbWFuZHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjbWQgPSBjb21tYW5kc1tpXTtcbiAgICBpZiAoY21kID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIHJlcXVlc3RlZCBwYXRoIGNvbnRhaW5zICR7Y21kfSBzZWdtZW50IGF0IGluZGV4ICR7aX1gKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==