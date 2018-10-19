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
import { DefaultRouteReuseStrategy } from './route_reuse_strategy';
import { RouterConfigLoader } from './router_config_loader';
import { createEmptyState } from './router_state';
import { isNavigationCancelingError } from './shared';
import { DefaultUrlHandlingStrategy } from './url_handling_strategy';
import { UrlTree, containsTree, createEmptyUrlTree } from './url_tree';
import { getAllRouteGuards } from './utils/preactivation';
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
 * @publicApi
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
            guards: { canActivateChecks: [], canDeactivateChecks: [] },
            guardsResult: null,
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
            }), map(t => (Object.assign({}, t, { guards: getAllRouteGuards(t.targetSnapshot, t.currentSnapshot, this.rootContexts) }))), checkGuards(this.ngModule.injector, (evt) => this.triggerEvent(evt)), tap(t => {
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
                if (t.guards.canActivateChecks.length) {
                    return of(t).pipe(tap(t => {
                        const resolveStart = new ResolveStart(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(t.urlAfterRedirects), t.targetSnapshot);
                        this.triggerEvent(resolveStart);
                    }), resolveData(this.paramsInheritanceStrategy, this.ngModule.injector), //
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
                    t.resolve(false);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUE0QyxXQUFXLEVBQUUsTUFBTSxFQUFRLFNBQVMsRUFBRSxRQUFRLElBQUksT0FBTyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ25JLE9BQU8sRUFBQyxlQUFlLEVBQUUsS0FBSyxFQUFjLE9BQU8sRUFBZ0IsRUFBRSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ3BGLE9BQU8sRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRWpGLE9BQU8sRUFBcUMsaUJBQWlCLEVBQUUsY0FBYyxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQy9GLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQ3hELE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRCxPQUFPLEVBQVEsY0FBYyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFxQixVQUFVLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzdPLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQ3JELE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUNoRCxPQUFPLEVBQUMsV0FBVyxFQUFDLE1BQU0sMEJBQTBCLENB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O0lBQ0gsQ0FBQztJQUVPLGdCQUFnQixDQUFDLFdBQXdCLEVBQUUsU0FBa0IsRUFBRSxNQUFlO1FBQ25GLElBQWtDLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUM5RCxJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQztRQUNoQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM5RSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRU8sd0JBQXdCO1FBQzlCLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUN0QixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBQyxDQUFDLENBQUM7SUFDaEcsQ0FBQztDQUNGO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFrQjtJQUMxQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUN4QyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsR0FBRyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUM3RTtLQUNGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7Q29tcGlsZXIsIEluamVjdG9yLCBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIE5nTW9kdWxlUmVmLCBOZ1pvbmUsIFR5cGUsIGlzRGV2TW9kZSwgybVDb25zb2xlIGFzIENvbnNvbGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtCZWhhdmlvclN1YmplY3QsIEVNUFRZLCBPYnNlcnZhYmxlLCBTdWJqZWN0LCBTdWJzY3JpcHRpb24sIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NhdGNoRXJyb3IsIGZpbHRlciwgZmluYWxpemUsIG1hcCwgc3dpdGNoTWFwLCB0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtRdWVyeVBhcmFtc0hhbmRsaW5nLCBSb3V0ZSwgUm91dGVzLCBzdGFuZGFyZGl6ZUNvbmZpZywgdmFsaWRhdGVDb25maWd9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7Y3JlYXRlUm91dGVyU3RhdGV9IGZyb20gJy4vY3JlYXRlX3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge2NyZWF0ZVVybFRyZWV9IGZyb20gJy4vY3JlYXRlX3VybF90cmVlJztcbmltcG9ydCB7RXZlbnQsIEd1YXJkc0NoZWNrRW5kLCBHdWFyZHNDaGVja1N0YXJ0LCBOYXZpZ2F0aW9uQ2FuY2VsLCBOYXZpZ2F0aW9uRW5kLCBOYXZpZ2F0aW9uRXJyb3IsIE5hdmlnYXRpb25TdGFydCwgTmF2aWdhdGlvblRyaWdnZXIsIFJlc29sdmVFbmQsIFJlc29sdmVTdGFydCwgUm91dGVDb25maWdMb2FkRW5kLCBSb3V0ZUNvbmZpZ0xvYWRTdGFydCwgUm91dGVzUmVjb2duaXplZH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHthY3RpdmF0ZVJvdXRlc30gZnJvbSAnLi9vcGVyYXRvcnMvYWN0aXZhdGVfcm91dGVzJztcbmltcG9ydCB7YXBwbHlSZWRpcmVjdHN9IGZyb20gJy4vb3BlcmF0b3JzL2FwcGx5X3JlZGlyZWN0cyc7XG5pbXBvcnQge2NoZWNrR3VhcmRzfSBmcm9tICcuL29wZXJhdG9ycy9jaGVja19ndWFyZHMnO1xuaW1wb3J0IHtyZWNvZ25pemV9IGZyb20gJy4vb3BlcmF0b3JzL3JlY29nbml6ZSc7XG5pbXBvcnQge3Jlc29sdmVEYXRhfSBmcm9tICcuL29wZXJhdG9ycy9yZXNvbHZlX2RhdGEnO1xuaW1wb3J0IHtzd2l0Y2hUYXB9IGZyb20gJy4vb3BlcmF0b3JzL3N3aXRjaF90YXAnO1xuaW1wb3J0IHtEZWZhdWx0Um91dGVSZXVzZVN0cmF0ZWd5LCBSb3V0ZVJldXNlU3RyYXRlZ3l9IGZyb20gJy4vcm91dGVfcmV1c2Vfc3RyYXRlZ3knO1xuaW1wb3J0IHtSb3V0ZXJDb25maWdMb2FkZXJ9IGZyb20gJy4vcm91dGVyX2NvbmZpZ19sb2FkZXInO1xuaW1wb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzfSBmcm9tICcuL3JvdXRlcl9vdXRsZXRfY29udGV4dCc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlLCBSb3V0ZXJTdGF0ZSwgUm91dGVyU3RhdGVTbmFwc2hvdCwgY3JlYXRlRW1wdHlTdGF0ZX0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQYXJhbXMsIGlzTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge0RlZmF1bHRVcmxIYW5kbGluZ1N0cmF0ZWd5LCBVcmxIYW5kbGluZ1N0cmF0ZWd5fSBmcm9tICcuL3VybF9oYW5kbGluZ19zdHJhdGVneSc7XG5pbXBvcnQge1VybFNlcmlhbGl6ZXIsIFVybFRyZWUsIGNvbnRhaW5zVHJlZSwgY3JlYXRlRW1wdHlVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcbmltcG9ydCB7Q2hlY2tzLCBnZXRBbGxSb3V0ZUd1YXJkc30gZnJvbSAnLi91dGlscy9wcmVhY3RpdmF0aW9uJztcblxuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgZXh0cmEgb3B0aW9ucyB1c2VkIGR1cmluZyBuYXZpZ2F0aW9uLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOYXZpZ2F0aW9uRXh0cmFzIHtcbiAgLyoqXG4gICAqIEVuYWJsZXMgcmVsYXRpdmUgbmF2aWdhdGlvbiBmcm9tIHRoZSBjdXJyZW50IEFjdGl2YXRlZFJvdXRlLlxuICAgKlxuICAgKiBDb25maWd1cmF0aW9uOlxuICAgKlxuICAgKiBgYGBcbiAgICogW3tcbiAgKiAgIHBhdGg6ICdwYXJlbnQnLFxuICAqICAgY29tcG9uZW50OiBQYXJlbnRDb21wb25lbnQsXG4gICogICBjaGlsZHJlbjogW3tcbiAgKiAgICAgcGF0aDogJ2xpc3QnLFxuICAqICAgICBjb21wb25lbnQ6IExpc3RDb21wb25lbnRcbiAgKiAgIH0se1xuICAqICAgICBwYXRoOiAnY2hpbGQnLFxuICAqICAgICBjb21wb25lbnQ6IENoaWxkQ29tcG9uZW50XG4gICogICB9XVxuICAqIH1dXG4gICAqIGBgYFxuICAgKlxuICAgKiBOYXZpZ2F0ZSB0byBsaXN0IHJvdXRlIGZyb20gY2hpbGQgcm91dGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiAgQENvbXBvbmVudCh7Li4ufSlcbiAgICogIGNsYXNzIENoaWxkQ29tcG9uZW50IHtcbiAgKiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJvdXRlcjogUm91dGVyLCBwcml2YXRlIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSkge31cbiAgKlxuICAqICAgIGdvKCkge1xuICAqICAgICAgdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycuLi9saXN0J10sIHsgcmVsYXRpdmVUbzogdGhpcy5yb3V0ZSB9KTtcbiAgKiAgICB9XG4gICogIH1cbiAgICogYGBgXG4gICAqL1xuICByZWxhdGl2ZVRvPzogQWN0aXZhdGVkUm91dGV8bnVsbDtcblxuICAvKipcbiAgICogU2V0cyBxdWVyeSBwYXJhbWV0ZXJzIHRvIHRoZSBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvcmVzdWx0cz9wYWdlPTFcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvcmVzdWx0cyddLCB7IHF1ZXJ5UGFyYW1zOiB7IHBhZ2U6IDEgfSB9KTtcbiAgICogYGBgXG4gICAqL1xuICBxdWVyeVBhcmFtcz86IFBhcmFtc3xudWxsO1xuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBoYXNoIGZyYWdtZW50IGZvciB0aGUgVVJMLlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgdG8gL3Jlc3VsdHMjdG9wXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3Jlc3VsdHMnXSwgeyBmcmFnbWVudDogJ3RvcCcgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnQ/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFByZXNlcnZlcyB0aGUgcXVlcnkgcGFyYW1ldGVycyBmb3IgdGhlIG5leHQgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogZGVwcmVjYXRlZCwgdXNlIGBxdWVyeVBhcmFtc0hhbmRsaW5nYCBpbnN0ZWFkXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBQcmVzZXJ2ZSBxdWVyeSBwYXJhbXMgZnJvbSAvcmVzdWx0cz9wYWdlPTEgdG8gL3ZpZXc/cGFnZT0xXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgc2luY2UgdjRcbiAgICovXG4gIHByZXNlcnZlUXVlcnlQYXJhbXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiAgY29uZmlnIHN0cmF0ZWd5IHRvIGhhbmRsZSB0aGUgcXVlcnkgcGFyYW1ldGVycyBmb3IgdGhlIG5leHQgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIGZyb20gL3Jlc3VsdHM/cGFnZT0xIHRvIC92aWV3P3BhZ2U9MSZwYWdlPTJcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHF1ZXJ5UGFyYW1zOiB7IHBhZ2U6IDIgfSwgIHF1ZXJ5UGFyYW1zSGFuZGxpbmc6IFwibWVyZ2VcIiB9KTtcbiAgICogYGBgXG4gICAqL1xuICBxdWVyeVBhcmFtc0hhbmRsaW5nPzogUXVlcnlQYXJhbXNIYW5kbGluZ3xudWxsO1xuICAvKipcbiAgICogUHJlc2VydmVzIHRoZSBmcmFnbWVudCBmb3IgdGhlIG5leHQgbmF2aWdhdGlvblxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gUHJlc2VydmUgZnJhZ21lbnQgZnJvbSAvcmVzdWx0cyN0b3AgdG8gL3ZpZXcjdG9wXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBwcmVzZXJ2ZUZyYWdtZW50OiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHByZXNlcnZlRnJhZ21lbnQ/OiBib29sZWFuO1xuICAvKipcbiAgICogTmF2aWdhdGVzIHdpdGhvdXQgcHVzaGluZyBhIG5ldyBzdGF0ZSBpbnRvIGhpc3RvcnkuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSBzaWxlbnRseSB0byAvdmlld1xuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHNraXBMb2NhdGlvbkNoYW5nZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBOYXZpZ2F0ZXMgd2hpbGUgcmVwbGFjaW5nIHRoZSBjdXJyZW50IHN0YXRlIGluIGhpc3RvcnkuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvdmlld1xuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgcmVwbGFjZVVybDogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqL1xuICByZXBsYWNlVXJsPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBFcnJvciBoYW5kbGVyIHRoYXQgaXMgaW52b2tlZCB3aGVuIGEgbmF2aWdhdGlvbiBlcnJvcnMuXG4gKlxuICogSWYgdGhlIGhhbmRsZXIgcmV0dXJucyBhIHZhbHVlLCB0aGUgbmF2aWdhdGlvbiBwcm9taXNlIHdpbGwgYmUgcmVzb2x2ZWQgd2l0aCB0aGlzIHZhbHVlLlxuICogSWYgdGhlIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbiwgdGhlIG5hdmlnYXRpb24gcHJvbWlzZSB3aWxsIGJlIHJlamVjdGVkIHdpdGhcbiAqIHRoZSBleGNlcHRpb24uXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBFcnJvckhhbmRsZXIgPSAoZXJyb3I6IGFueSkgPT4gYW55O1xuXG5mdW5jdGlvbiBkZWZhdWx0RXJyb3JIYW5kbGVyKGVycm9yOiBhbnkpOiBhbnkge1xuICB0aHJvdyBlcnJvcjtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdE1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcihcbiAgICBlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gIHJldHVybiB1cmxTZXJpYWxpemVyLnBhcnNlKCcvJyk7XG59XG5cbmV4cG9ydCB0eXBlIE5hdmlnYXRpb25UcmFuc2l0aW9uID0ge1xuICBpZDogbnVtYmVyLFxuICBjdXJyZW50VXJsVHJlZTogVXJsVHJlZSxcbiAgY3VycmVudFJhd1VybDogVXJsVHJlZSxcbiAgZXh0cmFjdGVkVXJsOiBVcmxUcmVlLFxuICB1cmxBZnRlclJlZGlyZWN0czogVXJsVHJlZSxcbiAgcmF3VXJsOiBVcmxUcmVlLFxuICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMsXG4gIHJlc29sdmU6IGFueSxcbiAgcmVqZWN0OiBhbnksXG4gIHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj4sXG4gIHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIsXG4gIHN0YXRlOiB7bmF2aWdhdGlvbklkOiBudW1iZXJ9IHwgbnVsbCxcbiAgY3VycmVudFNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxuICB0YXJnZXRTbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCB8IG51bGwsXG4gIGN1cnJlbnRSb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGUsXG4gIHRhcmdldFJvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZSB8IG51bGwsXG4gIGd1YXJkczogQ2hlY2tzLFxuICBndWFyZHNSZXN1bHQ6IGJvb2xlYW4gfCBudWxsLFxufTtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IHR5cGUgUm91dGVySG9vayA9IChzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCwgcnVuRXh0cmFzOiB7XG4gIGFwcGxpZWRVcmxUcmVlOiBVcmxUcmVlLFxuICByYXdVcmxUcmVlOiBVcmxUcmVlLFxuICBza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW4sXG4gIHJlcGxhY2VVcmw6IGJvb2xlYW4sXG4gIG5hdmlnYXRpb25JZDogbnVtYmVyXG59KSA9PiBPYnNlcnZhYmxlPHZvaWQ+O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBkZWZhdWx0Um91dGVySG9vayhzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCwgcnVuRXh0cmFzOiB7XG4gIGFwcGxpZWRVcmxUcmVlOiBVcmxUcmVlLFxuICByYXdVcmxUcmVlOiBVcmxUcmVlLFxuICBza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW4sXG4gIHJlcGxhY2VVcmw6IGJvb2xlYW4sXG4gIG5hdmlnYXRpb25JZDogbnVtYmVyXG59KTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gIHJldHVybiBvZiAobnVsbCkgYXMgYW55O1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIHRoZSBuYXZpZ2F0aW9uIGFuZCB1cmwgbWFuaXB1bGF0aW9uIGNhcGFiaWxpdGllcy5cbiAqXG4gKiBTZWUgYFJvdXRlc2AgZm9yIG1vcmUgZGV0YWlscyBhbmQgZXhhbXBsZXMuXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlciB7XG4gIHByaXZhdGUgY3VycmVudFVybFRyZWU6IFVybFRyZWU7XG4gIHByaXZhdGUgcmF3VXJsVHJlZTogVXJsVHJlZTtcbiAgcHJpdmF0ZSByZWFkb25seSB0cmFuc2l0aW9uczogQmVoYXZpb3JTdWJqZWN0PE5hdmlnYXRpb25UcmFuc2l0aW9uPjtcbiAgcHJpdmF0ZSBuYXZpZ2F0aW9uczogT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj47XG5cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgbG9jYXRpb25TdWJzY3JpcHRpb24gITogU3Vic2NyaXB0aW9uO1xuICBwcml2YXRlIG5hdmlnYXRpb25JZDogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBjb25maWdMb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcjtcbiAgcHJpdmF0ZSBuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55PjtcbiAgcHJpdmF0ZSBjb25zb2xlOiBDb25zb2xlO1xuICBwcml2YXRlIGlzTmdab25lRW5hYmxlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIHB1YmxpYyByZWFkb25seSBldmVudHM6IE9ic2VydmFibGU8RXZlbnQ+ID0gbmV3IFN1YmplY3Q8RXZlbnQ+KCk7XG4gIHB1YmxpYyByZWFkb25seSByb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGU7XG5cbiAgLyoqXG4gICAqIEVycm9yIGhhbmRsZXIgdGhhdCBpcyBpbnZva2VkIHdoZW4gYSBuYXZpZ2F0aW9uIGVycm9ycy5cbiAgICpcbiAgICogU2VlIGBFcnJvckhhbmRsZXJgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICAgKi9cbiAgZXJyb3JIYW5kbGVyOiBFcnJvckhhbmRsZXIgPSBkZWZhdWx0RXJyb3JIYW5kbGVyO1xuXG4gIC8qKlxuICAgKiBNYWxmb3JtZWQgdXJpIGVycm9yIGhhbmRsZXIgaXMgaW52b2tlZCB3aGVuIGBSb3V0ZXIucGFyc2VVcmwodXJsKWAgdGhyb3dzIGFuXG4gICAqIGVycm9yIGR1ZSB0byBjb250YWluaW5nIGFuIGludmFsaWQgY2hhcmFjdGVyLiBUaGUgbW9zdCBjb21tb24gY2FzZSB3b3VsZCBiZSBhIGAlYCBzaWduXG4gICAqIHRoYXQncyBub3QgZW5jb2RlZCBhbmQgaXMgbm90IHBhcnQgb2YgYSBwZXJjZW50IGVuY29kZWQgc2VxdWVuY2UuXG4gICAqL1xuICBtYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI6XG4gICAgICAoZXJyb3I6IFVSSUVycm9yLCB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgICAgIHVybDogc3RyaW5nKSA9PiBVcmxUcmVlID0gZGVmYXVsdE1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcjtcblxuICAvKipcbiAgICogSW5kaWNhdGVzIGlmIGF0IGxlYXN0IG9uZSBuYXZpZ2F0aW9uIGhhcHBlbmVkLlxuICAgKi9cbiAgbmF2aWdhdGVkOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgbGFzdFN1Y2Nlc3NmdWxJZDogbnVtYmVyID0gLTE7XG5cbiAgLyoqXG4gICAqIFVzZWQgYnkgUm91dGVyTW9kdWxlLiBUaGlzIGFsbG93cyB1cyB0b1xuICAgKiBwYXVzZSB0aGUgbmF2aWdhdGlvbiBlaXRoZXIgYmVmb3JlIHByZWFjdGl2YXRpb24gb3IgYWZ0ZXIgaXQuXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgaG9va3M6IHtiZWZvcmVQcmVhY3RpdmF0aW9uOiBSb3V0ZXJIb29rLCBhZnRlclByZWFjdGl2YXRpb246IFJvdXRlckhvb2t9ID0ge1xuICAgIGJlZm9yZVByZWFjdGl2YXRpb246IGRlZmF1bHRSb3V0ZXJIb29rLFxuICAgIGFmdGVyUHJlYWN0aXZhdGlvbjogZGVmYXVsdFJvdXRlckhvb2tcbiAgfTtcblxuICAvKipcbiAgICogRXh0cmFjdHMgYW5kIG1lcmdlcyBVUkxzLiBVc2VkIGZvciBBbmd1bGFySlMgdG8gQW5ndWxhciBtaWdyYXRpb25zLlxuICAgKi9cbiAgdXJsSGFuZGxpbmdTdHJhdGVneTogVXJsSGFuZGxpbmdTdHJhdGVneSA9IG5ldyBEZWZhdWx0VXJsSGFuZGxpbmdTdHJhdGVneSgpO1xuXG4gIHJvdXRlUmV1c2VTdHJhdGVneTogUm91dGVSZXVzZVN0cmF0ZWd5ID0gbmV3IERlZmF1bHRSb3V0ZVJldXNlU3RyYXRlZ3koKTtcblxuICAvKipcbiAgICogRGVmaW5lIHdoYXQgdGhlIHJvdXRlciBzaG91bGQgZG8gaWYgaXQgcmVjZWl2ZXMgYSBuYXZpZ2F0aW9uIHJlcXVlc3QgdG8gdGhlIGN1cnJlbnQgVVJMLlxuICAgKiBCeSBkZWZhdWx0LCB0aGUgcm91dGVyIHdpbGwgaWdub3JlIHRoaXMgbmF2aWdhdGlvbi4gSG93ZXZlciwgdGhpcyBwcmV2ZW50cyBmZWF0dXJlcyBzdWNoXG4gICAqIGFzIGEgXCJyZWZyZXNoXCIgYnV0dG9uLiBVc2UgdGhpcyBvcHRpb24gdG8gY29uZmlndXJlIHRoZSBiZWhhdmlvciB3aGVuIG5hdmlnYXRpbmcgdG8gdGhlXG4gICAqIGN1cnJlbnQgVVJMLiBEZWZhdWx0IGlzICdpZ25vcmUnLlxuICAgKi9cbiAgb25TYW1lVXJsTmF2aWdhdGlvbjogJ3JlbG9hZCd8J2lnbm9yZScgPSAnaWdub3JlJztcblxuICAvKipcbiAgICogRGVmaW5lcyBob3cgdGhlIHJvdXRlciBtZXJnZXMgcGFyYW1zLCBkYXRhIGFuZCByZXNvbHZlZCBkYXRhIGZyb20gcGFyZW50IHRvIGNoaWxkXG4gICAqIHJvdXRlcy4gQXZhaWxhYmxlIG9wdGlvbnMgYXJlOlxuICAgKlxuICAgKiAtIGAnZW1wdHlPbmx5J2AsIHRoZSBkZWZhdWx0LCBvbmx5IGluaGVyaXRzIHBhcmVudCBwYXJhbXMgZm9yIHBhdGgtbGVzcyBvciBjb21wb25lbnQtbGVzc1xuICAgKiAgIHJvdXRlcy5cbiAgICogLSBgJ2Fsd2F5cydgLCBlbmFibGVzIHVuY29uZGl0aW9uYWwgaW5oZXJpdGFuY2Ugb2YgcGFyZW50IHBhcmFtcy5cbiAgICovXG4gIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6ICdlbXB0eU9ubHknfCdhbHdheXMnID0gJ2VtcHR5T25seSc7XG5cbiAgLyoqXG4gICAqIERlZmluZXMgd2hlbiB0aGUgcm91dGVyIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMLiBUaGUgZGVmYXVsdCBiZWhhdmlvciBpcyB0byB1cGRhdGUgYWZ0ZXJcbiAgICogc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uLiBIb3dldmVyLCBzb21lIGFwcGxpY2F0aW9ucyBtYXkgcHJlZmVyIGEgbW9kZSB3aGVyZSB0aGUgVVJMIGdldHNcbiAgICogdXBkYXRlZCBhdCB0aGUgYmVnaW5uaW5nIG9mIG5hdmlnYXRpb24uIFRoZSBtb3N0IGNvbW1vbiB1c2UgY2FzZSB3b3VsZCBiZSB1cGRhdGluZyB0aGVcbiAgICogVVJMIGVhcmx5IHNvIGlmIG5hdmlnYXRpb24gZmFpbHMsIHlvdSBjYW4gc2hvdyBhbiBlcnJvciBtZXNzYWdlIHdpdGggdGhlIFVSTCB0aGF0IGZhaWxlZC5cbiAgICogQXZhaWxhYmxlIG9wdGlvbnMgYXJlOlxuICAgKlxuICAgKiAtIGAnZGVmZXJyZWQnYCwgdGhlIGRlZmF1bHQsIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMIGFmdGVyIG5hdmlnYXRpb24gaGFzIGZpbmlzaGVkLlxuICAgKiAtIGAnZWFnZXInYCwgdXBkYXRlcyBicm93c2VyIFVSTCBhdCB0aGUgYmVnaW5uaW5nIG9mIG5hdmlnYXRpb24uXG4gICAqL1xuICB1cmxVcGRhdGVTdHJhdGVneTogJ2RlZmVycmVkJ3wnZWFnZXInID0gJ2RlZmVycmVkJztcblxuICAvKipcbiAgICogU2VlIHtAbGluayBSb3V0ZXJNb2R1bGV9IGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICAgKi9cbiAgcmVsYXRpdmVMaW5rUmVzb2x1dGlvbjogJ2xlZ2FjeSd8J2NvcnJlY3RlZCcgPSAnbGVnYWN5JztcblxuICAvKipcbiAgICogQ3JlYXRlcyB0aGUgcm91dGVyIHNlcnZpY2UuXG4gICAqL1xuICAvLyBUT0RPOiB2c2F2a2luIG1ha2UgaW50ZXJuYWwgYWZ0ZXIgdGhlIGZpbmFsIGlzIG91dC5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT58bnVsbCwgcHJpdmF0ZSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgICAgcHJpdmF0ZSByb290Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIHByaXZhdGUgbG9jYXRpb246IExvY2F0aW9uLCBpbmplY3RvcjogSW5qZWN0b3IsXG4gICAgICBsb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLCBwdWJsaWMgY29uZmlnOiBSb3V0ZXMpIHtcbiAgICBjb25zdCBvbkxvYWRTdGFydCA9IChyOiBSb3V0ZSkgPT4gdGhpcy50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZFN0YXJ0KHIpKTtcbiAgICBjb25zdCBvbkxvYWRFbmQgPSAocjogUm91dGUpID0+IHRoaXMudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRFbmQocikpO1xuXG4gICAgdGhpcy5uZ01vZHVsZSA9IGluamVjdG9yLmdldChOZ01vZHVsZVJlZik7XG4gICAgdGhpcy5jb25zb2xlID0gaW5qZWN0b3IuZ2V0KENvbnNvbGUpO1xuICAgIGNvbnN0IG5nWm9uZSA9IGluamVjdG9yLmdldChOZ1pvbmUpO1xuICAgIHRoaXMuaXNOZ1pvbmVFbmFibGVkID0gbmdab25lIGluc3RhbmNlb2YgTmdab25lO1xuXG4gICAgdGhpcy5yZXNldENvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSBjcmVhdGVFbXB0eVVybFRyZWUoKTtcbiAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLmN1cnJlbnRVcmxUcmVlO1xuXG4gICAgdGhpcy5jb25maWdMb2FkZXIgPSBuZXcgUm91dGVyQ29uZmlnTG9hZGVyKGxvYWRlciwgY29tcGlsZXIsIG9uTG9hZFN0YXJ0LCBvbkxvYWRFbmQpO1xuICAgIHRoaXMucm91dGVyU3RhdGUgPSBjcmVhdGVFbXB0eVN0YXRlKHRoaXMuY3VycmVudFVybFRyZWUsIHRoaXMucm9vdENvbXBvbmVudFR5cGUpO1xuXG4gICAgdGhpcy50cmFuc2l0aW9ucyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8TmF2aWdhdGlvblRyYW5zaXRpb24+KHtcbiAgICAgIGlkOiAwLFxuICAgICAgY3VycmVudFVybFRyZWU6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBjdXJyZW50UmF3VXJsOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgZXh0cmFjdGVkVXJsOiB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuZXh0cmFjdCh0aGlzLmN1cnJlbnRVcmxUcmVlKSxcbiAgICAgIHVybEFmdGVyUmVkaXJlY3RzOiB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuZXh0cmFjdCh0aGlzLmN1cnJlbnRVcmxUcmVlKSxcbiAgICAgIHJhd1VybDogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIGV4dHJhczoge30sXG4gICAgICByZXNvbHZlOiBudWxsLFxuICAgICAgcmVqZWN0OiBudWxsLFxuICAgICAgcHJvbWlzZTogUHJvbWlzZS5yZXNvbHZlKHRydWUpLFxuICAgICAgc291cmNlOiAnaW1wZXJhdGl2ZScsXG4gICAgICBzdGF0ZTogbnVsbCxcbiAgICAgIGN1cnJlbnRTbmFwc2hvdDogdGhpcy5yb3V0ZXJTdGF0ZS5zbmFwc2hvdCxcbiAgICAgIHRhcmdldFNuYXBzaG90OiBudWxsLFxuICAgICAgY3VycmVudFJvdXRlclN0YXRlOiB0aGlzLnJvdXRlclN0YXRlLFxuICAgICAgdGFyZ2V0Um91dGVyU3RhdGU6IG51bGwsXG4gICAgICBndWFyZHM6IHtjYW5BY3RpdmF0ZUNoZWNrczogW10sIGNhbkRlYWN0aXZhdGVDaGVja3M6IFtdfSxcbiAgICAgIGd1YXJkc1Jlc3VsdDogbnVsbCxcbiAgICB9KTtcbiAgICB0aGlzLm5hdmlnYXRpb25zID0gdGhpcy5zZXR1cE5hdmlnYXRpb25zKHRoaXMudHJhbnNpdGlvbnMpO1xuXG4gICAgdGhpcy5wcm9jZXNzTmF2aWdhdGlvbnMoKTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0dXBOYXZpZ2F0aW9ucyh0cmFuc2l0aW9uczogT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4pOlxuICAgICAgT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4ge1xuICAgIGNvbnN0IGV2ZW50c1N1YmplY3QgPSAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pO1xuICAgIHJldHVybiB0cmFuc2l0aW9ucy5waXBlKFxuICAgICAgICBmaWx0ZXIodCA9PiB0LmlkICE9PSAwKSxcblxuICAgICAgICAvLyBFeHRyYWN0IFVSTFxuICAgICAgICBtYXAodCA9PiAoe1xuICAgICAgICAgICAgICAuLi50LCBleHRyYWN0ZWRVcmw6IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5leHRyYWN0KHQucmF3VXJsKVxuICAgICAgICAgICAgfSBhcyBOYXZpZ2F0aW9uVHJhbnNpdGlvbikpLFxuXG4gICAgICAgIC8vIFVzaW5nIHN3aXRjaE1hcCBzbyB3ZSBjYW5jZWwgZXhlY3V0aW5nIG5hdmlnYXRpb25zIHdoZW4gYSBuZXcgb25lIGNvbWVzIGluXG4gICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICBsZXQgY29tcGxldGVkID0gZmFsc2U7XG4gICAgICAgICAgbGV0IGVycm9yZWQgPSBmYWxzZTtcbiAgICAgICAgICByZXR1cm4gb2YgKHQpLnBpcGUoXG4gICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB1cmxUcmFuc2l0aW9uID1cbiAgICAgICAgICAgICAgICAgICAgIXRoaXMubmF2aWdhdGVkIHx8IHQuZXh0cmFjdGVkVXJsLnRvU3RyaW5nKCkgIT09IHRoaXMuY3VycmVudFVybFRyZWUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9jZXNzQ3VycmVudFVybCA9XG4gICAgICAgICAgICAgICAgICAgICh0aGlzLm9uU2FtZVVybE5hdmlnYXRpb24gPT09ICdyZWxvYWQnID8gdHJ1ZSA6IHVybFRyYW5zaXRpb24pICYmXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5zaG91bGRQcm9jZXNzVXJsKHQucmF3VXJsKTtcblxuICAgICAgICAgICAgICAgIGlmIChwcm9jZXNzQ3VycmVudFVybCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mICh0KS5waXBlKFxuICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgaWYgaW4gYGVhZ2VyYCB1cGRhdGUgbW9kZVxuICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcicgJiYgIXQuZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHQucmF3VXJsLCAhIXQuZXh0cmFzLnJlcGxhY2VVcmwsIHQuaWQpKSxcbiAgICAgICAgICAgICAgICAgICAgICAvLyBGaXJlIE5hdmlnYXRpb25TdGFydCBldmVudFxuICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSB0aGlzLnRyYW5zaXRpb25zLmdldFZhbHVlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmV3IE5hdmlnYXRpb25TdGFydChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIHQuc291cmNlLCB0LnN0YXRlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHJhbnNpdGlvbiAhPT0gdGhpcy50cmFuc2l0aW9ucy5nZXRWYWx1ZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbdF07XG4gICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGRlbGF5IGlzIHJlcXVpcmVkIHRvIG1hdGNoIG9sZCBiZWhhdmlvciB0aGF0IGZvcmNlZCBuYXZpZ2F0aW9uIHRvXG4gICAgICAgICAgICAgICAgICAgICAgLy8gYWx3YXlzIGJlIGFzeW5jXG4gICAgICAgICAgICAgICAgICAgICAgc3dpdGNoTWFwKHQgPT4gUHJvbWlzZS5yZXNvbHZlKHQpKSxcblxuICAgICAgICAgICAgICAgICAgICAgIC8vIEFwcGx5UmVkaXJlY3RzXG4gICAgICAgICAgICAgICAgICAgICAgYXBwbHlSZWRpcmVjdHMoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmdNb2R1bGUuaW5qZWN0b3IsIHRoaXMuY29uZmlnTG9hZGVyLCB0aGlzLnVybFNlcmlhbGl6ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnKSxcbiAgICAgICAgICAgICAgICAgICAgICAvLyBSZWNvZ25pemVcbiAgICAgICAgICAgICAgICAgICAgICByZWNvZ25pemUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9vdENvbXBvbmVudFR5cGUsIHRoaXMuY29uZmlnLCAodXJsKSA9PiB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kpLFxuXG4gICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZSBSb3V0ZXNSZWNvZ25pemVkXG4gICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm91dGVzUmVjb2duaXplZCA9IG5ldyBSb3V0ZXNSZWNvZ25pemVkKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzKSwgdC50YXJnZXRTbmFwc2hvdCAhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChyb3V0ZXNSZWNvZ25pemVkKTtcbiAgICAgICAgICAgICAgICAgICAgICB9KSwgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc1ByZXZpb3VzVXJsID0gdXJsVHJhbnNpdGlvbiAmJiB0aGlzLnJhd1VybFRyZWUgJiZcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybCh0aGlzLnJhd1VybFRyZWUpO1xuICAgICAgICAgICAgICAgICAgLyogV2hlbiB0aGUgY3VycmVudCBVUkwgc2hvdWxkbid0IGJlIHByb2Nlc3NlZCwgYnV0IHRoZSBwcmV2aW91cyBvbmUgd2FzLCB3ZVxuICAgICAgICAgICAgICAgICAgICogaGFuZGxlIHRoaXMgXCJlcnJvciBjb25kaXRpb25cIiBieSBuYXZpZ2F0aW5nIHRvIHRoZSBwcmV2aW91c2x5IHN1Y2Nlc3NmdWwgVVJMLFxuICAgICAgICAgICAgICAgICAgICogYnV0IGxlYXZpbmcgdGhlIFVSTCBpbnRhY3QuKi9cbiAgICAgICAgICAgICAgICAgIGlmIChwcm9jZXNzUHJldmlvdXNVcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qge2lkLCBleHRyYWN0ZWRVcmwsIHNvdXJjZSwgc3RhdGUsIGV4dHJhc30gPSB0O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuYXZTdGFydCA9XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgTmF2aWdhdGlvblN0YXJ0KGlkLCB0aGlzLnNlcmlhbGl6ZVVybChleHRyYWN0ZWRVcmwpLCBzb3VyY2UsIHN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdlN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0U25hcHNob3QgPVxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlRW1wdHlTdGF0ZShleHRyYWN0ZWRVcmwsIHRoaXMucm9vdENvbXBvbmVudFR5cGUpLnNuYXBzaG90O1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvZiAoe1xuICAgICAgICAgICAgICAgICAgICAgIC4uLnQsXG4gICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0U25hcHNob3QsXG4gICAgICAgICAgICAgICAgICAgICAgdXJsQWZ0ZXJSZWRpcmVjdHM6IGV4dHJhY3RlZFVybCxcbiAgICAgICAgICAgICAgICAgICAgICBleHRyYXM6IHsuLi5leHRyYXMsIHNraXBMb2NhdGlvbkNoYW5nZTogZmFsc2UsIHJlcGxhY2VVcmw6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvKiBXaGVuIG5laXRoZXIgdGhlIGN1cnJlbnQgb3IgcHJldmlvdXMgVVJMIGNhbiBiZSBwcm9jZXNzZWQsIGRvIG5vdGhpbmcgb3RoZXJcbiAgICAgICAgICAgICAgICAgICAgICogdGhhbiB1cGRhdGUgcm91dGVyJ3MgaW50ZXJuYWwgcmVmZXJlbmNlIHRvIHRoZSBjdXJyZW50IFwic2V0dGxlZFwiIFVSTC4gVGhpc1xuICAgICAgICAgICAgICAgICAgICAgKiB3YXkgdGhlIG5leHQgbmF2aWdhdGlvbiB3aWxsIGJlIGNvbWluZyBmcm9tIHRoZSBjdXJyZW50IFVSTCBpbiB0aGUgYnJvd3Nlci5cbiAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmF3VXJsVHJlZSA9IHQucmF3VXJsO1xuICAgICAgICAgICAgICAgICAgICB0LnJlc29sdmUobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgIC8vIEJlZm9yZSBQcmVhY3RpdmF0aW9uXG4gICAgICAgICAgICAgIHN3aXRjaFRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB7XG4gICAgICAgICAgICAgICAgICB0YXJnZXRTbmFwc2hvdCxcbiAgICAgICAgICAgICAgICAgIGlkOiBuYXZpZ2F0aW9uSWQsXG4gICAgICAgICAgICAgICAgICBleHRyYWN0ZWRVcmw6IGFwcGxpZWRVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgcmF3VXJsOiByYXdVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgZXh0cmFzOiB7c2tpcExvY2F0aW9uQ2hhbmdlLCByZXBsYWNlVXJsfVxuICAgICAgICAgICAgICAgIH0gPSB0O1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhvb2tzLmJlZm9yZVByZWFjdGl2YXRpb24odGFyZ2V0U25hcHNob3QgISwge1xuICAgICAgICAgICAgICAgICAgbmF2aWdhdGlvbklkLFxuICAgICAgICAgICAgICAgICAgYXBwbGllZFVybFRyZWUsXG4gICAgICAgICAgICAgICAgICByYXdVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiAhIXNraXBMb2NhdGlvbkNoYW5nZSxcbiAgICAgICAgICAgICAgICAgIHJlcGxhY2VVcmw6ICEhcmVwbGFjZVVybCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgLy8gLS0tIEdVQVJEUyAtLS1cbiAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGd1YXJkc1N0YXJ0ID0gbmV3IEd1YXJkc0NoZWNrU3RhcnQoXG4gICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgdGhpcy5zZXJpYWxpemVVcmwodC51cmxBZnRlclJlZGlyZWN0cyksXG4gICAgICAgICAgICAgICAgICAgIHQudGFyZ2V0U25hcHNob3QgISk7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQoZ3VhcmRzU3RhcnQpO1xuICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICBtYXAodCA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAuLi50LFxuICAgICAgICAgICAgICAgICAgICBndWFyZHM6XG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRBbGxSb3V0ZUd1YXJkcyh0LnRhcmdldFNuYXBzaG90ICEsIHQuY3VycmVudFNuYXBzaG90LCB0aGlzLnJvb3RDb250ZXh0cylcbiAgICAgICAgICAgICAgICAgIH0pKSxcblxuICAgICAgICAgICAgICBjaGVja0d1YXJkcyh0aGlzLm5nTW9kdWxlLmluamVjdG9yLCAoZXZ0OiBFdmVudCkgPT4gdGhpcy50cmlnZ2VyRXZlbnQoZXZ0KSksXG5cbiAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGd1YXJkc0VuZCA9IG5ldyBHdWFyZHNDaGVja0VuZChcbiAgICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzKSxcbiAgICAgICAgICAgICAgICAgICAgdC50YXJnZXRTbmFwc2hvdCAhLCAhIXQuZ3VhcmRzUmVzdWx0KTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChndWFyZHNFbmQpO1xuICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICBmaWx0ZXIodCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF0Lmd1YXJkc1Jlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgdGhpcy5yZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdkNhbmNlbCA9XG4gICAgICAgICAgICAgICAgICAgICAgbmV3IE5hdmlnYXRpb25DYW5jZWwodC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCAnJyk7XG4gICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2Q2FuY2VsKTtcbiAgICAgICAgICAgICAgICAgIHQucmVzb2x2ZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAvLyAtLS0gUkVTT0xWRSAtLS1cbiAgICAgICAgICAgICAgc3dpdGNoVGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0Lmd1YXJkcy5jYW5BY3RpdmF0ZUNoZWNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBvZiAodCkucGlwZShcbiAgICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlU3RhcnQgPSBuZXcgUmVzb2x2ZVN0YXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzKSwgdC50YXJnZXRTbmFwc2hvdCAhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KHJlc29sdmVTdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZURhdGEoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZ01vZHVsZS5pbmplY3RvciksICAvL1xuICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVFbmQgPSBuZXcgUmVzb2x2ZUVuZChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVVcmwodC51cmxBZnRlclJlZGlyZWN0cyksIHQudGFyZ2V0U25hcHNob3QgISk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChyZXNvbHZlRW5kKTtcbiAgICAgICAgICAgICAgICAgICAgICB9KSwgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgLy8gLS0tIEFGVEVSIFBSRUFDVElWQVRJT04gLS0tXG4gICAgICAgICAgICAgIHN3aXRjaFRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB7XG4gICAgICAgICAgICAgICAgICB0YXJnZXRTbmFwc2hvdCxcbiAgICAgICAgICAgICAgICAgIGlkOiBuYXZpZ2F0aW9uSWQsXG4gICAgICAgICAgICAgICAgICBleHRyYWN0ZWRVcmw6IGFwcGxpZWRVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgcmF3VXJsOiByYXdVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgZXh0cmFzOiB7c2tpcExvY2F0aW9uQ2hhbmdlLCByZXBsYWNlVXJsfVxuICAgICAgICAgICAgICAgIH0gPSB0O1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhvb2tzLmFmdGVyUHJlYWN0aXZhdGlvbih0YXJnZXRTbmFwc2hvdCAhLCB7XG4gICAgICAgICAgICAgICAgICBuYXZpZ2F0aW9uSWQsXG4gICAgICAgICAgICAgICAgICBhcHBsaWVkVXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgIHJhd1VybFRyZWUsXG4gICAgICAgICAgICAgICAgICBza2lwTG9jYXRpb25DaGFuZ2U6ICEhc2tpcExvY2F0aW9uQ2hhbmdlLFxuICAgICAgICAgICAgICAgICAgcmVwbGFjZVVybDogISFyZXBsYWNlVXJsLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICBtYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0Um91dGVyU3RhdGUgPSBjcmVhdGVSb3V0ZXJTdGF0ZShcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3ksIHQudGFyZ2V0U25hcHNob3QgISwgdC5jdXJyZW50Um91dGVyU3RhdGUpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoey4uLnQsIHRhcmdldFJvdXRlclN0YXRlfSk7XG4gICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgIC8qIE9uY2UgaGVyZSwgd2UgYXJlIGFib3V0IHRvIGFjdGl2YXRlIHN5bmNyb25vdXNseS4gVGhlIGFzc3VtcHRpb24gaXMgdGhpcyB3aWxsXG4gICAgICAgICAgICAgICAgIHN1Y2NlZWQsIGFuZCB1c2VyIGNvZGUgbWF5IHJlYWQgZnJvbSB0aGUgUm91dGVyIHNlcnZpY2UuIFRoZXJlZm9yZSBiZWZvcmVcbiAgICAgICAgICAgICAgICAgYWN0aXZhdGlvbiwgd2UgbmVlZCB0byB1cGRhdGUgcm91dGVyIHByb3BlcnRpZXMgc3RvcmluZyB0aGUgY3VycmVudCBVUkwgYW5kIHRoZVxuICAgICAgICAgICAgICAgICBSb3V0ZXJTdGF0ZSwgYXMgd2VsbCBhcyB1cGRhdGVkIHRoZSBicm93c2VyIFVSTC4gQWxsIHRoaXMgc2hvdWxkIGhhcHBlbiAqYmVmb3JlKlxuICAgICAgICAgICAgICAgICBhY3RpdmF0aW5nLiAqL1xuICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IHQudXJsQWZ0ZXJSZWRpcmVjdHM7XG4gICAgICAgICAgICAgICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHRoaXMuY3VycmVudFVybFRyZWUsIHQucmF3VXJsKTtcblxuICAgICAgICAgICAgICAgICh0aGlzIGFze3JvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZX0pLnJvdXRlclN0YXRlID0gdC50YXJnZXRSb3V0ZXJTdGF0ZSAhO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdkZWZlcnJlZCcgJiYgIXQuZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHRoaXMucmF3VXJsVHJlZSwgISF0LmV4dHJhcy5yZXBsYWNlVXJsLCB0LmlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgIGFjdGl2YXRlUm91dGVzKFxuICAgICAgICAgICAgICAgICAgdGhpcy5yb290Q29udGV4dHMsIHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LFxuICAgICAgICAgICAgICAgICAgKGV2dDogRXZlbnQpID0+IHRoaXMudHJpZ2dlckV2ZW50KGV2dCkpLFxuXG4gICAgICAgICAgICAgIHRhcCh7bmV4dCgpIHsgY29tcGxldGVkID0gdHJ1ZTsgfSwgY29tcGxldGUoKSB7IGNvbXBsZXRlZCA9IHRydWU7IH19KSxcbiAgICAgICAgICAgICAgZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8qIFdoZW4gdGhlIG5hdmlnYXRpb24gc3RyZWFtIGZpbmlzaGVzIGVpdGhlciB0aHJvdWdoIGVycm9yIG9yIHN1Y2Nlc3MsIHdlIHNldCB0aGVcbiAgICAgICAgICAgICAgICAgKiBgY29tcGxldGVkYCBvciBgZXJyb3JlZGAgZmxhZy4gSG93ZXZlciwgdGhlcmUgYXJlIHNvbWUgc2l0dWF0aW9ucyB3aGVyZSB3ZSBjb3VsZFxuICAgICAgICAgICAgICAgICAqIGdldCBoZXJlIHdpdGhvdXQgZWl0aGVyIG9mIHRob3NlIGJlaW5nIHNldC4gRm9yIGluc3RhbmNlLCBhIHJlZGlyZWN0IGR1cmluZ1xuICAgICAgICAgICAgICAgICAqIE5hdmlnYXRpb25TdGFydC4gVGhlcmVmb3JlLCB0aGlzIGlzIGEgY2F0Y2gtYWxsIHRvIG1ha2Ugc3VyZSB0aGUgTmF2aWdhdGlvbkNhbmNlbFxuICAgICAgICAgICAgICAgICAqIGV2ZW50IGlzIGZpcmVkIHdoZW4gYSBuYXZpZ2F0aW9uIGdldHMgY2FuY2VsbGVkIGJ1dCBub3QgY2F1Z2h0IGJ5IG90aGVyIG1lYW5zLiAqL1xuICAgICAgICAgICAgICAgIGlmICghY29tcGxldGVkICYmICFlcnJvcmVkKSB7XG4gICAgICAgICAgICAgICAgICAvLyBNdXN0IHJlc2V0IHRvIGN1cnJlbnQgVVJMIHRyZWUgaGVyZSB0byBlbnN1cmUgaGlzdG9yeS5zdGF0ZSBpcyBzZXQuIE9uIGEgZnJlc2hcbiAgICAgICAgICAgICAgICAgIC8vIHBhZ2UgbG9hZCwgaWYgYSBuZXcgbmF2aWdhdGlvbiBjb21lcyBpbiBiZWZvcmUgYSBzdWNjZXNzZnVsIG5hdmlnYXRpb25cbiAgICAgICAgICAgICAgICAgIC8vIGNvbXBsZXRlcywgdGhlcmUgd2lsbCBiZSBub3RoaW5nIGluIGhpc3Rvcnkuc3RhdGUubmF2aWdhdGlvbklkLiBUaGlzIGNhbiBjYXVzZVxuICAgICAgICAgICAgICAgICAgLy8gc3luYyBwcm9ibGVtcyB3aXRoIEFuZ3VsYXJKUyBzeW5jIGNvZGUgd2hpY2ggbG9va3MgZm9yIGEgdmFsdWUgaGVyZSBpbiBvcmRlclxuICAgICAgICAgICAgICAgICAgLy8gdG8gZGV0ZXJtaW5lIHdoZXRoZXIgb3Igbm90IHRvIGhhbmRsZSBhIGdpdmVuIHBvcHN0YXRlIGV2ZW50IG9yIHRvIGxlYXZlIGl0XG4gICAgICAgICAgICAgICAgICAvLyB0byB0aGUgQW5ndWFsciByb3V0ZXIuXG4gICAgICAgICAgICAgICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgICAgICAgICAgICAgICAgY29uc3QgbmF2Q2FuY2VsID0gbmV3IE5hdmlnYXRpb25DYW5jZWwoXG4gICAgICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLFxuICAgICAgICAgICAgICAgICAgICAgIGBOYXZpZ2F0aW9uIElEICR7dC5pZH0gaXMgbm90IGVxdWFsIHRvIHRoZSBjdXJyZW50IG5hdmlnYXRpb24gaWQgJHt0aGlzLm5hdmlnYXRpb25JZH1gKTtcbiAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuYXZDYW5jZWwpO1xuICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICBjYXRjaEVycm9yKChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZXJyb3JlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgLyogVGhpcyBlcnJvciB0eXBlIGlzIGlzc3VlZCBkdXJpbmcgUmVkaXJlY3QsIGFuZCBpcyBoYW5kbGVkIGFzIGEgY2FuY2VsbGF0aW9uXG4gICAgICAgICAgICAgICAgICogcmF0aGVyIHRoYW4gYW4gZXJyb3IuICovXG4gICAgICAgICAgICAgICAgaWYgKGlzTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yKGUpKSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLm5hdmlnYXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICB0aGlzLnJlc2V0U3RhdGVBbmRVcmwodC5jdXJyZW50Um91dGVyU3RhdGUsIHQuY3VycmVudFVybFRyZWUsIHQucmF3VXJsKTtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdkNhbmNlbCA9XG4gICAgICAgICAgICAgICAgICAgICAgbmV3IE5hdmlnYXRpb25DYW5jZWwodC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCBlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdkNhbmNlbCk7XG4gICAgICAgICAgICAgICAgICB0LnJlc29sdmUoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgLyogQWxsIG90aGVyIGVycm9ycyBzaG91bGQgcmVzZXQgdG8gdGhlIHJvdXRlcidzIGludGVybmFsIFVSTCByZWZlcmVuY2UgdG8gdGhlXG4gICAgICAgICAgICAgICAgICAgKiBwcmUtZXJyb3Igc3RhdGUuICovXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMucmVzZXRTdGF0ZUFuZFVybCh0LmN1cnJlbnRSb3V0ZXJTdGF0ZSwgdC5jdXJyZW50VXJsVHJlZSwgdC5yYXdVcmwpO1xuICAgICAgICAgICAgICAgICAgY29uc3QgbmF2RXJyb3IgPSBuZXcgTmF2aWdhdGlvbkVycm9yKHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgZSk7XG4gICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2RXJyb3IpO1xuICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKHRoaXMuZXJyb3JIYW5kbGVyKGUpKTtcbiAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHQucmVqZWN0KGVlKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgICAgICAgICB9KSwgKTtcbiAgICAgICAgICAvLyBUT0RPKGphc29uYWRlbik6IHJlbW92ZSBjYXN0IG9uY2UgZzMgaXMgb24gdXBkYXRlZCBUeXBlU2NyaXB0XG4gICAgICAgIH0pKSBhcyBhbnkgYXMgT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj47XG4gIH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIFRPRE86IHRoaXMgc2hvdWxkIGJlIHJlbW92ZWQgb25jZSB0aGUgY29uc3RydWN0b3Igb2YgdGhlIHJvdXRlciBtYWRlIGludGVybmFsXG4gICAqL1xuICByZXNldFJvb3RDb21wb25lbnRUeXBlKHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT4pOiB2b2lkIHtcbiAgICB0aGlzLnJvb3RDb21wb25lbnRUeXBlID0gcm9vdENvbXBvbmVudFR5cGU7XG4gICAgLy8gVE9ETzogdnNhdmtpbiByb3V0ZXIgNC4wIHNob3VsZCBtYWtlIHRoZSByb290IGNvbXBvbmVudCBzZXQgdG8gbnVsbFxuICAgIC8vIHRoaXMgd2lsbCBzaW1wbGlmeSB0aGUgbGlmZWN5Y2xlIG9mIHRoZSByb3V0ZXIuXG4gICAgdGhpcy5yb3V0ZXJTdGF0ZS5yb290LmNvbXBvbmVudCA9IHRoaXMucm9vdENvbXBvbmVudFR5cGU7XG4gIH1cblxuICBwcml2YXRlIGdldFRyYW5zaXRpb24oKTogTmF2aWdhdGlvblRyYW5zaXRpb24geyByZXR1cm4gdGhpcy50cmFuc2l0aW9ucy52YWx1ZTsgfVxuXG4gIHByaXZhdGUgc2V0VHJhbnNpdGlvbih0OiBQYXJ0aWFsPE5hdmlnYXRpb25UcmFuc2l0aW9uPik6IHZvaWQge1xuICAgIHRoaXMudHJhbnNpdGlvbnMubmV4dCh7Li4udGhpcy5nZXRUcmFuc2l0aW9uKCksIC4uLnR9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHVwIHRoZSBsb2NhdGlvbiBjaGFuZ2UgbGlzdGVuZXIgYW5kIHBlcmZvcm1zIHRoZSBpbml0aWFsIG5hdmlnYXRpb24uXG4gICAqL1xuICBpbml0aWFsTmF2aWdhdGlvbigpOiB2b2lkIHtcbiAgICB0aGlzLnNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpO1xuICAgIGlmICh0aGlzLm5hdmlnYXRpb25JZCA9PT0gMCkge1xuICAgICAgdGhpcy5uYXZpZ2F0ZUJ5VXJsKHRoaXMubG9jYXRpb24ucGF0aCh0cnVlKSwge3JlcGxhY2VVcmw6IHRydWV9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyLlxuICAgKi9cbiAgc2V0VXBMb2NhdGlvbkNoYW5nZUxpc3RlbmVyKCk6IHZvaWQge1xuICAgIC8vIERvbid0IG5lZWQgdG8gdXNlIFpvbmUud3JhcCBhbnkgbW9yZSwgYmVjYXVzZSB6b25lLmpzXG4gICAgLy8gYWxyZWFkeSBwYXRjaCBvblBvcFN0YXRlLCBzbyBsb2NhdGlvbiBjaGFuZ2UgY2FsbGJhY2sgd2lsbFxuICAgIC8vIHJ1biBpbnRvIG5nWm9uZVxuICAgIGlmICghdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbiA9IDxhbnk+dGhpcy5sb2NhdGlvbi5zdWJzY3JpYmUoKGNoYW5nZTogYW55KSA9PiB7XG4gICAgICAgIGxldCByYXdVcmxUcmVlID0gdGhpcy5wYXJzZVVybChjaGFuZ2VbJ3VybCddKTtcbiAgICAgICAgY29uc3Qgc291cmNlOiBOYXZpZ2F0aW9uVHJpZ2dlciA9IGNoYW5nZVsndHlwZSddID09PSAncG9wc3RhdGUnID8gJ3BvcHN0YXRlJyA6ICdoYXNoY2hhbmdlJztcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBjaGFuZ2Uuc3RhdGUgJiYgY2hhbmdlLnN0YXRlLm5hdmlnYXRpb25JZCA/XG4gICAgICAgICAgICB7bmF2aWdhdGlvbklkOiBjaGFuZ2Uuc3RhdGUubmF2aWdhdGlvbklkfSA6XG4gICAgICAgICAgICBudWxsO1xuICAgICAgICBzZXRUaW1lb3V0KFxuICAgICAgICAgICAgKCkgPT4geyB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbihyYXdVcmxUcmVlLCBzb3VyY2UsIHN0YXRlLCB7cmVwbGFjZVVybDogdHJ1ZX0pOyB9LCAwKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBUaGUgY3VycmVudCB1cmwgKi9cbiAgZ2V0IHVybCgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5zZXJpYWxpemVVcmwodGhpcy5jdXJyZW50VXJsVHJlZSk7IH1cblxuICAvKiogQGludGVybmFsICovXG4gIHRyaWdnZXJFdmVudChldmVudDogRXZlbnQpOiB2b2lkIHsgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KS5uZXh0KGV2ZW50KTsgfVxuXG4gIC8qKlxuICAgKiBSZXNldHMgdGhlIGNvbmZpZ3VyYXRpb24gdXNlZCBmb3IgbmF2aWdhdGlvbiBhbmQgZ2VuZXJhdGluZyBsaW5rcy5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogIyMjIEV4YW1wbGVcbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5yZXNldENvbmZpZyhbXG4gICAqICB7IHBhdGg6ICd0ZWFtLzppZCcsIGNvbXBvbmVudDogVGVhbUNtcCwgY2hpbGRyZW46IFtcbiAgICogICAgeyBwYXRoOiAnc2ltcGxlJywgY29tcG9uZW50OiBTaW1wbGVDbXAgfSxcbiAgICogICAgeyBwYXRoOiAndXNlci86bmFtZScsIGNvbXBvbmVudDogVXNlckNtcCB9XG4gICAqICBdfVxuICAgKiBdKTtcbiAgICogYGBgXG4gICAqL1xuICByZXNldENvbmZpZyhjb25maWc6IFJvdXRlcyk6IHZvaWQge1xuICAgIHZhbGlkYXRlQ29uZmlnKGNvbmZpZyk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWcubWFwKHN0YW5kYXJkaXplQ29uZmlnKTtcbiAgICB0aGlzLm5hdmlnYXRlZCA9IGZhbHNlO1xuICAgIHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCA9IC0xO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7IHRoaXMuZGlzcG9zZSgpOyB9XG5cbiAgLyoqIERpc3Bvc2VzIG9mIHRoZSByb3V0ZXIgKi9cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbiA9IG51bGwgITtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQXBwbGllcyBhbiBhcnJheSBvZiBjb21tYW5kcyB0byB0aGUgY3VycmVudCB1cmwgdHJlZSBhbmQgY3JlYXRlcyBhIG5ldyB1cmwgdHJlZS5cbiAgICpcbiAgICogV2hlbiBnaXZlbiBhbiBhY3RpdmF0ZSByb3V0ZSwgYXBwbGllcyB0aGUgZ2l2ZW4gY29tbWFuZHMgc3RhcnRpbmcgZnJvbSB0aGUgcm91dGUuXG4gICAqIFdoZW4gbm90IGdpdmVuIGEgcm91dGUsIGFwcGxpZXMgdGhlIGdpdmVuIGNvbW1hbmQgc3RhcnRpbmcgZnJvbSB0aGUgcm9vdC5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogIyMjIEV4YW1wbGVcbiAgICpcbiAgICogYGBgXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMy91c2VyLzExXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywgJ3VzZXInLCAxMV0pO1xuICAgKlxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzM7ZXhwYW5kPXRydWUvdXNlci8xMVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtleHBhbmQ6IHRydWV9LCAndXNlcicsIDExXSk7XG4gICAqXG4gICAqIC8vIHlvdSBjYW4gY29sbGFwc2Ugc3RhdGljIHNlZ21lbnRzIGxpa2UgdGhpcyAodGhpcyB3b3JrcyBvbmx5IHdpdGggdGhlIGZpcnN0IHBhc3NlZC1pbiB2YWx1ZSk6XG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0vMzMvdXNlcicsIHVzZXJJZF0pO1xuICAgKlxuICAgKiAvLyBJZiB0aGUgZmlyc3Qgc2VnbWVudCBjYW4gY29udGFpbiBzbGFzaGVzLCBhbmQgeW91IGRvIG5vdCB3YW50IHRoZSByb3V0ZXIgdG8gc3BsaXQgaXQsIHlvdVxuICAgKiAvLyBjYW4gZG8gdGhlIGZvbGxvd2luZzpcbiAgICpcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoW3tzZWdtZW50UGF0aDogJy9vbmUvdHdvJ31dKTtcbiAgICpcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzLyh1c2VyLzExLy9yaWdodDpjaGF0KVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDogJ2NoYXQnfX1dKTtcbiAgICpcbiAgICogLy8gcmVtb3ZlIHRoZSByaWdodCBzZWNvbmRhcnkgbm9kZVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDogbnVsbH19XSk7XG4gICAqXG4gICAqIC8vIGFzc3VtaW5nIHRoZSBjdXJyZW50IHVybCBpcyBgL3RlYW0vMzMvdXNlci8xMWAgYW5kIHRoZSByb3V0ZSBwb2ludHMgdG8gYHVzZXIvMTFgXG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzMzL3VzZXIvMTEvZGV0YWlsc1xuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJ2RldGFpbHMnXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzMzL3VzZXIvMjJcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycuLi8yMiddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vNDQvdXNlci8yMlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy4uLy4uL3RlYW0vNDQvdXNlci8yMiddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICogYGBgXG4gICAqL1xuICBjcmVhdGVVcmxUcmVlKGNvbW1hbmRzOiBhbnlbXSwgbmF2aWdhdGlvbkV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHt9KTogVXJsVHJlZSB7XG4gICAgY29uc3Qge3JlbGF0aXZlVG8sICAgICAgICAgIHF1ZXJ5UGFyYW1zLCAgICAgICAgIGZyYWdtZW50LFxuICAgICAgICAgICBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zLCBxdWVyeVBhcmFtc0hhbmRsaW5nLCBwcmVzZXJ2ZUZyYWdtZW50fSA9IG5hdmlnYXRpb25FeHRyYXM7XG4gICAgaWYgKGlzRGV2TW9kZSgpICYmIHByZXNlcnZlUXVlcnlQYXJhbXMgJiYgPGFueT5jb25zb2xlICYmIDxhbnk+Y29uc29sZS53YXJuKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ3ByZXNlcnZlUXVlcnlQYXJhbXMgaXMgZGVwcmVjYXRlZCwgdXNlIHF1ZXJ5UGFyYW1zSGFuZGxpbmcgaW5zdGVhZC4nKTtcbiAgICB9XG4gICAgY29uc3QgYSA9IHJlbGF0aXZlVG8gfHwgdGhpcy5yb3V0ZXJTdGF0ZS5yb290O1xuICAgIGNvbnN0IGYgPSBwcmVzZXJ2ZUZyYWdtZW50ID8gdGhpcy5jdXJyZW50VXJsVHJlZS5mcmFnbWVudCA6IGZyYWdtZW50O1xuICAgIGxldCBxOiBQYXJhbXN8bnVsbCA9IG51bGw7XG4gICAgaWYgKHF1ZXJ5UGFyYW1zSGFuZGxpbmcpIHtcbiAgICAgIHN3aXRjaCAocXVlcnlQYXJhbXNIYW5kbGluZykge1xuICAgICAgICBjYXNlICdtZXJnZSc6XG4gICAgICAgICAgcSA9IHsuLi50aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zLCAuLi5xdWVyeVBhcmFtc307XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3ByZXNlcnZlJzpcbiAgICAgICAgICBxID0gdGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBxID0gcXVlcnlQYXJhbXMgfHwgbnVsbDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcSA9IHByZXNlcnZlUXVlcnlQYXJhbXMgPyB0aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zIDogcXVlcnlQYXJhbXMgfHwgbnVsbDtcbiAgICB9XG4gICAgaWYgKHEgIT09IG51bGwpIHtcbiAgICAgIHEgPSB0aGlzLnJlbW92ZUVtcHR5UHJvcHMocSk7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVVcmxUcmVlKGEsIHRoaXMuY3VycmVudFVybFRyZWUsIGNvbW1hbmRzLCBxICEsIGYgISk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGUgYmFzZWQgb24gdGhlIHByb3ZpZGVkIHVybC4gVGhpcyBuYXZpZ2F0aW9uIGlzIGFsd2F5cyBhYnNvbHV0ZS5cbiAgICpcbiAgICogUmV0dXJucyBhIHByb21pc2UgdGhhdDpcbiAgICogLSByZXNvbHZlcyB0byAndHJ1ZScgd2hlbiBuYXZpZ2F0aW9uIHN1Y2NlZWRzLFxuICAgKiAtIHJlc29sdmVzIHRvICdmYWxzZScgd2hlbiBuYXZpZ2F0aW9uIGZhaWxzLFxuICAgKiAtIGlzIHJlamVjdGVkIHdoZW4gYW4gZXJyb3IgaGFwcGVucy5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogIyMjIEV4YW1wbGVcbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiKTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiLCB7IHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIFNpbmNlIGBuYXZpZ2F0ZUJ5VXJsKClgIHRha2VzIGFuIGFic29sdXRlIFVSTCBhcyB0aGUgZmlyc3QgcGFyYW1ldGVyLFxuICAgKiBpdCB3aWxsIG5vdCBhcHBseSBhbnkgZGVsdGEgdG8gdGhlIGN1cnJlbnQgVVJMIGFuZCBpZ25vcmVzIGFueSBwcm9wZXJ0aWVzXG4gICAqIGluIHRoZSBzZWNvbmQgcGFyYW1ldGVyICh0aGUgYE5hdmlnYXRpb25FeHRyYXNgKSB0aGF0IHdvdWxkIGNoYW5nZSB0aGVcbiAgICogcHJvdmlkZWQgVVJMLlxuICAgKi9cbiAgbmF2aWdhdGVCeVVybCh1cmw6IHN0cmluZ3xVcmxUcmVlLCBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7c2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZX0pOlxuICAgICAgUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKGlzRGV2TW9kZSgpICYmIHRoaXMuaXNOZ1pvbmVFbmFibGVkICYmICFOZ1pvbmUuaXNJbkFuZ3VsYXJab25lKCkpIHtcbiAgICAgIHRoaXMuY29uc29sZS53YXJuKFxuICAgICAgICAgIGBOYXZpZ2F0aW9uIHRyaWdnZXJlZCBvdXRzaWRlIEFuZ3VsYXIgem9uZSwgZGlkIHlvdSBmb3JnZXQgdG8gY2FsbCAnbmdab25lLnJ1bigpJz9gKTtcbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gdXJsIGluc3RhbmNlb2YgVXJsVHJlZSA/IHVybCA6IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICBjb25zdCBtZXJnZWRUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHVybFRyZWUsIHRoaXMucmF3VXJsVHJlZSk7XG5cbiAgICByZXR1cm4gdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24obWVyZ2VkVHJlZSwgJ2ltcGVyYXRpdmUnLCBudWxsLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBhcnJheSBvZiBjb21tYW5kcyBhbmQgYSBzdGFydGluZyBwb2ludC5cbiAgICogSWYgbm8gc3RhcnRpbmcgcm91dGUgaXMgcHJvdmlkZWQsIHRoZSBuYXZpZ2F0aW9uIGlzIGFic29sdXRlLlxuICAgKlxuICAgKiBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0OlxuICAgKiAtIHJlc29sdmVzIHRvICd0cnVlJyB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsXG4gICAqIC0gcmVzb2x2ZXMgdG8gJ2ZhbHNlJyB3aGVuIG5hdmlnYXRpb24gZmFpbHMsXG4gICAqIC0gaXMgcmVqZWN0ZWQgd2hlbiBhbiBlcnJvciBoYXBwZW5zLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiAjIyMgRXhhbXBsZVxuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTFxuICAgKiByb3V0ZXIubmF2aWdhdGUoWyd0ZWFtJywgMzMsICd1c2VyJywgMTFdLCB7cmVsYXRpdmVUbzogcm91dGUsIHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZX0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogVGhlIGZpcnN0IHBhcmFtZXRlciBvZiBgbmF2aWdhdGUoKWAgaXMgYSBkZWx0YSB0byBiZSBhcHBsaWVkIHRvIHRoZSBjdXJyZW50IFVSTFxuICAgKiBvciB0aGUgb25lIHByb3ZpZGVkIGluIHRoZSBgcmVsYXRpdmVUb2AgcHJvcGVydHkgb2YgdGhlIHNlY29uZCBwYXJhbWV0ZXIgKHRoZVxuICAgKiBgTmF2aWdhdGlvbkV4dHJhc2ApLlxuICAgKi9cbiAgbmF2aWdhdGUoY29tbWFuZHM6IGFueVtdLCBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7c2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZX0pOlxuICAgICAgUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdmFsaWRhdGVDb21tYW5kcyhjb21tYW5kcyk7XG4gICAgcmV0dXJuIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmNyZWF0ZVVybFRyZWUoY29tbWFuZHMsIGV4dHJhcyksIGV4dHJhcyk7XG4gIH1cblxuICAvKiogU2VyaWFsaXplcyBhIGBVcmxUcmVlYCBpbnRvIGEgc3RyaW5nICovXG4gIHNlcmlhbGl6ZVVybCh1cmw6IFVybFRyZWUpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpOyB9XG5cbiAgLyoqIFBhcnNlcyBhIHN0cmluZyBpbnRvIGEgYFVybFRyZWVgICovXG4gIHBhcnNlVXJsKHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gICAgbGV0IHVybFRyZWU6IFVybFRyZWU7XG4gICAgdHJ5IHtcbiAgICAgIHVybFRyZWUgPSB0aGlzLnVybFNlcmlhbGl6ZXIucGFyc2UodXJsKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB1cmxUcmVlID0gdGhpcy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIoZSwgdGhpcy51cmxTZXJpYWxpemVyLCB1cmwpO1xuICAgIH1cbiAgICByZXR1cm4gdXJsVHJlZTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIHdoZXRoZXIgdGhlIHVybCBpcyBhY3RpdmF0ZWQgKi9cbiAgaXNBY3RpdmUodXJsOiBzdHJpbmd8VXJsVHJlZSwgZXhhY3Q6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBpZiAodXJsIGluc3RhbmNlb2YgVXJsVHJlZSkge1xuICAgICAgcmV0dXJuIGNvbnRhaW5zVHJlZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB1cmwsIGV4YWN0KTtcbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIHJldHVybiBjb250YWluc1RyZWUodGhpcy5jdXJyZW50VXJsVHJlZSwgdXJsVHJlZSwgZXhhY3QpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVFbXB0eVByb3BzKHBhcmFtczogUGFyYW1zKTogUGFyYW1zIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMocGFyYW1zKS5yZWR1Y2UoKHJlc3VsdDogUGFyYW1zLCBrZXk6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgdmFsdWU6IGFueSA9IHBhcmFtc1trZXldO1xuICAgICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSwge30pO1xuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzTmF2aWdhdGlvbnMoKTogdm9pZCB7XG4gICAgdGhpcy5uYXZpZ2F0aW9ucy5zdWJzY3JpYmUoXG4gICAgICAgIHQgPT4ge1xuICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSB0LmlkO1xuICAgICAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25FbmQoXG4gICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIHRoaXMuc2VyaWFsaXplVXJsKHRoaXMuY3VycmVudFVybFRyZWUpKSk7XG4gICAgICAgICAgdC5yZXNvbHZlKHRydWUpO1xuICAgICAgICB9LFxuICAgICAgICBlID0+IHsgdGhpcy5jb25zb2xlLndhcm4oYFVuaGFuZGxlZCBOYXZpZ2F0aW9uIEVycm9yOiBgKTsgfSk7XG4gIH1cblxuICBwcml2YXRlIHNjaGVkdWxlTmF2aWdhdGlvbihcbiAgICAgIHJhd1VybDogVXJsVHJlZSwgc291cmNlOiBOYXZpZ2F0aW9uVHJpZ2dlciwgc3RhdGU6IHtuYXZpZ2F0aW9uSWQ6IG51bWJlcn18bnVsbCxcbiAgICAgIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IGxhc3ROYXZpZ2F0aW9uID0gdGhpcy5nZXRUcmFuc2l0aW9uKCk7XG4gICAgLy8gSWYgdGhlIHVzZXIgdHJpZ2dlcnMgYSBuYXZpZ2F0aW9uIGltcGVyYXRpdmVseSAoZS5nLiwgYnkgdXNpbmcgbmF2aWdhdGVCeVVybCksXG4gICAgLy8gYW5kIHRoYXQgbmF2aWdhdGlvbiByZXN1bHRzIGluICdyZXBsYWNlU3RhdGUnIHRoYXQgbGVhZHMgdG8gdGhlIHNhbWUgVVJMLFxuICAgIC8vIHdlIHNob3VsZCBza2lwIHRob3NlLlxuICAgIGlmIChsYXN0TmF2aWdhdGlvbiAmJiBzb3VyY2UgIT09ICdpbXBlcmF0aXZlJyAmJiBsYXN0TmF2aWdhdGlvbi5zb3VyY2UgPT09ICdpbXBlcmF0aXZlJyAmJlxuICAgICAgICBsYXN0TmF2aWdhdGlvbi5yYXdVcmwudG9TdHJpbmcoKSA9PT0gcmF3VXJsLnRvU3RyaW5nKCkpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJ1ZSk7ICAvLyByZXR1cm4gdmFsdWUgaXMgbm90IHVzZWRcbiAgICB9XG5cbiAgICAvLyBCZWNhdXNlIG9mIGEgYnVnIGluIElFIGFuZCBFZGdlLCB0aGUgbG9jYXRpb24gY2xhc3MgZmlyZXMgdHdvIGV2ZW50cyAocG9wc3RhdGUgYW5kXG4gICAgLy8gaGFzaGNoYW5nZSkgZXZlcnkgc2luZ2xlIHRpbWUuIFRoZSBzZWNvbmQgb25lIHNob3VsZCBiZSBpZ25vcmVkLiBPdGhlcndpc2UsIHRoZSBVUkwgd2lsbFxuICAgIC8vIGZsaWNrZXIuIEhhbmRsZXMgdGhlIGNhc2Ugd2hlbiBhIHBvcHN0YXRlIHdhcyBlbWl0dGVkIGZpcnN0LlxuICAgIGlmIChsYXN0TmF2aWdhdGlvbiAmJiBzb3VyY2UgPT0gJ2hhc2hjaGFuZ2UnICYmIGxhc3ROYXZpZ2F0aW9uLnNvdXJjZSA9PT0gJ3BvcHN0YXRlJyAmJlxuICAgICAgICBsYXN0TmF2aWdhdGlvbi5yYXdVcmwudG9TdHJpbmcoKSA9PT0gcmF3VXJsLnRvU3RyaW5nKCkpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJ1ZSk7ICAvLyByZXR1cm4gdmFsdWUgaXMgbm90IHVzZWRcbiAgICB9XG4gICAgLy8gQmVjYXVzZSBvZiBhIGJ1ZyBpbiBJRSBhbmQgRWRnZSwgdGhlIGxvY2F0aW9uIGNsYXNzIGZpcmVzIHR3byBldmVudHMgKHBvcHN0YXRlIGFuZFxuICAgIC8vIGhhc2hjaGFuZ2UpIGV2ZXJ5IHNpbmdsZSB0aW1lLiBUaGUgc2Vjb25kIG9uZSBzaG91bGQgYmUgaWdub3JlZC4gT3RoZXJ3aXNlLCB0aGUgVVJMIHdpbGxcbiAgICAvLyBmbGlja2VyLiBIYW5kbGVzIHRoZSBjYXNlIHdoZW4gYSBoYXNoY2hhbmdlIHdhcyBlbWl0dGVkIGZpcnN0LlxuICAgIGlmIChsYXN0TmF2aWdhdGlvbiAmJiBzb3VyY2UgPT0gJ3BvcHN0YXRlJyAmJiBsYXN0TmF2aWdhdGlvbi5zb3VyY2UgPT09ICdoYXNoY2hhbmdlJyAmJlxuICAgICAgICBsYXN0TmF2aWdhdGlvbi5yYXdVcmwudG9TdHJpbmcoKSA9PT0gcmF3VXJsLnRvU3RyaW5nKCkpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJ1ZSk7ICAvLyByZXR1cm4gdmFsdWUgaXMgbm90IHVzZWRcbiAgICB9XG5cbiAgICBsZXQgcmVzb2x2ZTogYW55ID0gbnVsbDtcbiAgICBsZXQgcmVqZWN0OiBhbnkgPSBudWxsO1xuXG4gICAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXMsIHJlaikgPT4ge1xuICAgICAgcmVzb2x2ZSA9IHJlcztcbiAgICAgIHJlamVjdCA9IHJlajtcbiAgICB9KTtcblxuICAgIGNvbnN0IGlkID0gKyt0aGlzLm5hdmlnYXRpb25JZDtcbiAgICB0aGlzLnNldFRyYW5zaXRpb24oe1xuICAgICAgaWQsXG4gICAgICBzb3VyY2UsXG4gICAgICBzdGF0ZSxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgY3VycmVudFJhd1VybDogdGhpcy5yYXdVcmxUcmVlLCByYXdVcmwsIGV4dHJhcywgcmVzb2x2ZSwgcmVqZWN0LCBwcm9taXNlLFxuICAgICAgY3VycmVudFNuYXBzaG90OiB0aGlzLnJvdXRlclN0YXRlLnNuYXBzaG90LFxuICAgICAgY3VycmVudFJvdXRlclN0YXRlOiB0aGlzLnJvdXRlclN0YXRlXG4gICAgfSk7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhhdCB0aGUgZXJyb3IgaXMgcHJvcGFnYXRlZCBldmVuIHRob3VnaCBgcHJvY2Vzc05hdmlnYXRpb25zYCBjYXRjaFxuICAgIC8vIGhhbmRsZXIgZG9lcyBub3QgcmV0aHJvd1xuICAgIHJldHVybiBwcm9taXNlLmNhdGNoKChlOiBhbnkpID0+IHsgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpOyB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0QnJvd3NlclVybCh1cmw6IFVybFRyZWUsIHJlcGxhY2VVcmw6IGJvb2xlYW4sIGlkOiBudW1iZXIpIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICAgIGlmICh0aGlzLmxvY2F0aW9uLmlzQ3VycmVudFBhdGhFcXVhbFRvKHBhdGgpIHx8IHJlcGxhY2VVcmwpIHtcbiAgICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKHBhdGgsICcnLCB7bmF2aWdhdGlvbklkOiBpZH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxvY2F0aW9uLmdvKHBhdGgsICcnLCB7bmF2aWdhdGlvbklkOiBpZH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRTdGF0ZUFuZFVybChzdG9yZWRTdGF0ZTogUm91dGVyU3RhdGUsIHN0b3JlZFVybDogVXJsVHJlZSwgcmF3VXJsOiBVcmxUcmVlKTogdm9pZCB7XG4gICAgKHRoaXMgYXN7cm91dGVyU3RhdGU6IFJvdXRlclN0YXRlfSkucm91dGVyU3RhdGUgPSBzdG9yZWRTdGF0ZTtcbiAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gc3RvcmVkVXJsO1xuICAgIHRoaXMucmF3VXJsVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCByYXdVcmwpO1xuICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gIH1cblxuICBwcml2YXRlIHJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpOiB2b2lkIHtcbiAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShcbiAgICAgICAgdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh0aGlzLnJhd1VybFRyZWUpLCAnJywge25hdmlnYXRpb25JZDogdGhpcy5sYXN0U3VjY2Vzc2Z1bElkfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVDb21tYW5kcyhjb21tYW5kczogc3RyaW5nW10pOiB2b2lkIHtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb21tYW5kcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNtZCA9IGNvbW1hbmRzW2ldO1xuICAgIGlmIChjbWQgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgcmVxdWVzdGVkIHBhdGggY29udGFpbnMgJHtjbWR9IHNlZ21lbnQgYXQgaW5kZXggJHtpfWApO1xuICAgIH1cbiAgfVxufVxuIl19