/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { Compiler, Injectable, Injector, NgModuleRef, NgZone, ɵConsole as Console, ɵRuntimeError as RuntimeError } from '@angular/core';
import { BehaviorSubject, combineLatest, EMPTY, of, Subject } from 'rxjs';
import { catchError, defaultIfEmpty, filter, finalize, map, switchMap, take, tap } from 'rxjs/operators';
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
import { ChildrenOutletContexts } from './router_outlet_context';
import { createEmptyState } from './router_state';
import { isNavigationCancelingError, navigationCancelingError, REDIRECTING_CANCELLATION_REASON } from './shared';
import { DefaultUrlHandlingStrategy } from './url_handling_strategy';
import { containsTree, createEmptyUrlTree, UrlSerializer } from './url_tree';
import { standardizeConfig, validateConfig } from './utils/config';
import { getAllRouteGuards } from './utils/preactivation';
import { isUrlTree } from './utils/type_guards';
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
    constructor(rootComponentType, urlSerializer, rootContexts, location, injector, compiler, config) {
        this.rootComponentType = rootComponentType;
        this.urlSerializer = urlSerializer;
        this.rootContexts = rootContexts;
        this.location = location;
        this.config = config;
        this.lastSuccessfulNavigation = null;
        this.currentNavigation = null;
        this.disposed = false;
        this.navigationId = 0;
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
         * An event stream for routing events in this NgModule.
         */
        this.events = new Subject();
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
        this.urlHandlingStrategy = new DefaultUrlHandlingStrategy();
        /**
         * A strategy for re-using routes.
         */
        this.routeReuseStrategy = new DefaultRouteReuseStrategy();
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
         * Enables a bug fix that corrects relative link resolution in components with empty paths.
         * @see `RouterModule`
         *
         * @deprecated
         */
        this.relativeLinkResolution = 'corrected';
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
        const onLoadStart = (r) => this.triggerEvent(new RouteConfigLoadStart(r));
        const onLoadEnd = (r) => this.triggerEvent(new RouteConfigLoadEnd(r));
        this.configLoader = injector.get(RouterConfigLoader);
        this.configLoader.onLoadEndListener = onLoadEnd;
        this.configLoader.onLoadStartListener = onLoadStart;
        this.ngModule = injector.get(NgModuleRef);
        this.console = injector.get(Console);
        const ngZone = injector.get(NgZone);
        this.isNgZoneEnabled = ngZone instanceof NgZone && NgZone.isInAngularZone();
        this.resetConfig(config);
        this.currentUrlTree = createEmptyUrlTree();
        this.rawUrlTree = this.currentUrlTree;
        this.browserUrlTree = this.currentUrlTree;
        this.routerState = createEmptyState(this.currentUrlTree, this.rootComponentType);
        this.transitions = new BehaviorSubject({
            id: 0,
            targetPageId: 0,
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
            restoredState: null,
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
    /**
     * The ɵrouterPageId of whatever page is currently active in the browser history. This is
     * important for computing the target page id for new navigations because we need to ensure each
     * page id in the browser history is 1 more than the previous entry.
     */
    get browserPageId() {
        return this.location.getState()?.ɵrouterPageId;
    }
    setupNavigations(transitions) {
        const eventsSubject = this.events;
        return transitions.pipe(filter(t => t.id !== 0), 
        // Extract URL
        map(t => ({ ...t, extractedUrl: this.urlHandlingStrategy.extract(t.rawUrl) })), 
        // Using switchMap so we cancel executing navigations when a new one comes in
        switchMap(t => {
            let completed = false;
            let errored = false;
            return of(t).pipe(
            // Store the Navigation object
            tap(t => {
                this.currentNavigation = {
                    id: t.id,
                    initialUrl: t.rawUrl,
                    extractedUrl: t.extractedUrl,
                    trigger: t.source,
                    extras: t.extras,
                    previousNavigation: this.lastSuccessfulNavigation ?
                        { ...this.lastSuccessfulNavigation, previousNavigation: null } :
                        null
                };
            }), switchMap(t => {
                const browserUrlTree = this.browserUrlTree.toString();
                const urlTransition = !this.navigated ||
                    t.extractedUrl.toString() !== browserUrlTree ||
                    // Navigations which succeed or ones which fail and are cleaned up
                    // correctly should result in `browserUrlTree` and `currentUrlTree`
                    // matching. If this is not the case, assume something went wrong and try
                    // processing the URL again.
                    browserUrlTree !== this.currentUrlTree.toString();
                const processCurrentUrl = (this.onSameUrlNavigation === 'reload' ? true : urlTransition) &&
                    this.urlHandlingStrategy.shouldProcessUrl(t.rawUrl);
                if (processCurrentUrl) {
                    // If the source of the navigation is from a browser event, the URL is
                    // already updated. We already need to sync the internal state.
                    if (isBrowserTriggeredNavigation(t.source)) {
                        this.browserUrlTree = t.extractedUrl;
                    }
                    return of(t).pipe(
                    // Fire NavigationStart event
                    switchMap(t => {
                        const transition = this.transitions.getValue();
                        eventsSubject.next(new NavigationStart(t.id, this.serializeUrl(t.extractedUrl), t.source, t.restoredState));
                        if (transition !== this.transitions.getValue()) {
                            return EMPTY;
                        }
                        // This delay is required to match old behavior that forced
                        // navigation to always be async
                        return Promise.resolve(t);
                    }), 
                    // ApplyRedirects
                    applyRedirects(this.ngModule.injector, this.configLoader, this.urlSerializer, this.config), 
                    // Update the currentNavigation
                    // `urlAfterRedirects` is guaranteed to be set after this point
                    tap(t => {
                        this.currentNavigation = {
                            ...this.currentNavigation,
                            finalUrl: t.urlAfterRedirects
                        };
                    }), 
                    // Recognize
                    recognize(this.ngModule.injector, this.rootComponentType, this.config, this.urlSerializer, this.paramsInheritanceStrategy, this.relativeLinkResolution), 
                    // Update URL if in `eager` update mode
                    tap(t => {
                        if (this.urlUpdateStrategy === 'eager') {
                            if (!t.extras.skipLocationChange) {
                                const rawUrl = this.urlHandlingStrategy.merge(t.urlAfterRedirects, t.rawUrl);
                                this.setBrowserUrl(rawUrl, t);
                            }
                            this.browserUrlTree = t.urlAfterRedirects;
                        }
                        // Fire RoutesRecognized
                        const routesRecognized = new RoutesRecognized(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(t.urlAfterRedirects), t.targetSnapshot);
                        eventsSubject.next(routesRecognized);
                    }));
                }
                else {
                    const processPreviousUrl = urlTransition && this.rawUrlTree &&
                        this.urlHandlingStrategy.shouldProcessUrl(this.rawUrlTree);
                    /* When the current URL shouldn't be processed, but the previous one was,
                     * we handle this "error condition" by navigating to the previously
                     * successful URL, but leaving the URL intact.*/
                    if (processPreviousUrl) {
                        const { id, extractedUrl, source, restoredState, extras } = t;
                        const navStart = new NavigationStart(id, this.serializeUrl(extractedUrl), source, restoredState);
                        eventsSubject.next(navStart);
                        const targetSnapshot = createEmptyState(extractedUrl, this.rootComponentType).snapshot;
                        return of({
                            ...t,
                            targetSnapshot,
                            urlAfterRedirects: extractedUrl,
                            extras: { ...extras, skipLocationChange: false, replaceUrl: false },
                        });
                    }
                    else {
                        /* When neither the current or previous URL can be processed, do nothing
                         * other than update router's internal reference to the current "settled"
                         * URL. This way the next navigation will be coming from the current URL
                         * in the browser.
                         */
                        this.rawUrlTree = t.rawUrl;
                        t.resolve(null);
                        return EMPTY;
                    }
                }
            }), 
            // --- GUARDS ---
            tap(t => {
                const guardsStart = new GuardsCheckStart(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(t.urlAfterRedirects), t.targetSnapshot);
                this.triggerEvent(guardsStart);
            }), map(t => ({
                ...t,
                guards: getAllRouteGuards(t.targetSnapshot, t.currentSnapshot, this.rootContexts)
            })), checkGuards(this.ngModule.injector, (evt) => this.triggerEvent(evt)), tap(t => {
                if (isUrlTree(t.guardsResult)) {
                    const error = navigationCancelingError(REDIRECTING_CANCELLATION_REASON +
                        `"${this.serializeUrl(t.guardsResult)}"`);
                    error.url = t.guardsResult;
                    throw error;
                }
                const guardsEnd = new GuardsCheckEnd(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(t.urlAfterRedirects), t.targetSnapshot, !!t.guardsResult);
                this.triggerEvent(guardsEnd);
            }), filter(t => {
                if (!t.guardsResult) {
                    this.restoreHistory(t);
                    this.cancelNavigationTransition(t, '', 3 /* NavigationCancellationCode.GuardRejected */);
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
                    }), switchMap(t => {
                        let dataResolved = false;
                        return of(t).pipe(resolveData(this.paramsInheritanceStrategy, this.ngModule.injector), tap({
                            next: () => dataResolved = true,
                            complete: () => {
                                if (!dataResolved) {
                                    this.restoreHistory(t);
                                    this.cancelNavigationTransition(t, NG_DEV_MODE ?
                                        `At least one route resolver didn't emit any value.` :
                                        '', 2 /* NavigationCancellationCode.NoDataFromResolver */);
                                }
                            }
                        }));
                    }), tap(t => {
                        const resolveEnd = new ResolveEnd(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(t.urlAfterRedirects), t.targetSnapshot);
                        this.triggerEvent(resolveEnd);
                    }));
                }
                return undefined;
            }), 
            // --- LOAD COMPONENTS ---
            switchTap((t) => {
                const loadComponents = (route) => {
                    const loaders = [];
                    if (route.routeConfig?.loadComponent &&
                        !route.routeConfig._loadedComponent) {
                        loaders.push(this.configLoader.loadComponent(route.routeConfig)
                            .pipe(tap(loadedComponent => {
                            route.component = loadedComponent;
                        }), map(() => void 0)));
                    }
                    for (const child of route.children) {
                        loaders.push(...loadComponents(child));
                    }
                    return loaders;
                };
                return combineLatest(loadComponents(t.targetSnapshot.root))
                    .pipe(defaultIfEmpty(), take(1));
            }), switchTap(() => this.afterPreactivation()), map((t) => {
                const targetRouterState = createRouterState(this.routeReuseStrategy, t.targetSnapshot, t.currentRouterState);
                return ({ ...t, targetRouterState });
            }), 
            /* Once here, we are about to activate syncronously. The assumption is this
               will succeed, and user code may read from the Router service. Therefore
               before activation, we need to update router properties storing the current
               URL and the RouterState, as well as updated the browser URL. All this should
               happen *before* activating. */
            tap((t) => {
                this.currentUrlTree = t.urlAfterRedirects;
                this.rawUrlTree =
                    this.urlHandlingStrategy.merge(t.urlAfterRedirects, t.rawUrl);
                this.routerState = t.targetRouterState;
                if (this.urlUpdateStrategy === 'deferred') {
                    if (!t.extras.skipLocationChange) {
                        this.setBrowserUrl(this.rawUrlTree, t);
                    }
                    this.browserUrlTree = t.urlAfterRedirects;
                }
            }), activateRoutes(this.rootContexts, this.routeReuseStrategy, (evt) => this.triggerEvent(evt)), tap({
                next() {
                    completed = true;
                },
                complete() {
                    completed = true;
                }
            }), finalize(() => {
                /* When the navigation stream finishes either through error or success, we
                 * set the `completed` or `errored` flag. However, there are some situations
                 * where we could get here without either of those being set. For instance, a
                 * redirect during NavigationStart. Therefore, this is a catch-all to make
                 * sure the NavigationCancel
                 * event is fired when a navigation gets cancelled but not caught by other
                 * means. */
                if (!completed && !errored) {
                    const cancelationReason = NG_DEV_MODE ?
                        `Navigation ID ${t.id} is not equal to the current navigation id ${this.navigationId}` :
                        '';
                    this.cancelNavigationTransition(t, cancelationReason, 1 /* NavigationCancellationCode.SupersededByNewNavigation */);
                }
                // Only clear current navigation if it is still set to the one that
                // finalized.
                if (this.currentNavigation?.id === t.id) {
                    this.currentNavigation = null;
                }
            }), catchError((e) => {
                // TODO(atscott): The NavigationTransition `t` used here does not accurately
                // reflect the current state of the whole transition because some operations
                // return a new object rather than modifying the one in the outermost
                // `switchMap`.
                //  The fix can likely be to:
                //  1. Rename the outer `t` variable so it's not shadowed all the time and
                //  confusing
                //  2. Keep reassigning to the outer variable after each stage to ensure it
                //  gets updated. Or change the implementations to not return a copy.
                // Not changed yet because it affects existing code and would need to be
                // tested more thoroughly.
                errored = true;
                /* This error type is issued during Redirect, and is handled as a
                 * cancellation rather than an error. */
                if (isNavigationCancelingError(e)) {
                    const redirecting = isUrlTree(e.url);
                    if (!redirecting) {
                        // Set property only if we're not redirecting. If we landed on a page and
                        // redirect to `/` route, the new navigation is going to see the `/`
                        // isn't a change from the default currentUrlTree and won't navigate.
                        // This is only applicable with initial navigation, so setting
                        // `navigated` only when not redirecting resolves this scenario.
                        this.navigated = true;
                        this.restoreHistory(t, true);
                    }
                    const navCancel = new NavigationCancel(t.id, this.serializeUrl(t.extractedUrl), e.message, 0 /* NavigationCancellationCode.Redirect */);
                    eventsSubject.next(navCancel);
                    // When redirecting, we need to delay resolving the navigation
                    // promise and push it to the redirect navigation
                    if (!redirecting) {
                        t.resolve(false);
                    }
                    else {
                        const mergedTree = this.urlHandlingStrategy.merge(e.url, this.rawUrlTree);
                        const extras = {
                            skipLocationChange: t.extras.skipLocationChange,
                            // The URL is already updated at this point if we have 'eager' URL
                            // updates or if the navigation was triggered by the browser (back
                            // button, URL bar, etc). We want to replace that item in history if
                            // the navigation is rejected.
                            replaceUrl: this.urlUpdateStrategy === 'eager' ||
                                isBrowserTriggeredNavigation(t.source)
                        };
                        this.scheduleNavigation(mergedTree, 'imperative', null, extras, { resolve: t.resolve, reject: t.reject, promise: t.promise });
                    }
                    /* All other errors should reset to the router's internal URL reference to
                     * the pre-error state. */
                }
                else {
                    this.restoreHistory(t, true);
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
    setTransition(t) {
        this.transitions.next({ ...this.transitions.value, ...t });
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
                        // Navigations coming from Angular router have a navigationId state
                        // property. When this exists, restore the state.
                        const state = event.state?.navigationId ? event.state : null;
                        if (state) {
                            const stateCopy = { ...state };
                            delete stateCopy.navigationId;
                            delete stateCopy.ɵrouterPageId;
                            if (Object.keys(stateCopy).length !== 0) {
                                extras.state = stateCopy;
                            }
                        }
                        const urlTree = this.parseUrl(event['url']);
                        this.scheduleNavigation(urlTree, source, state, extras);
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
        return this.currentNavigation;
    }
    /** @internal */
    triggerEvent(event) {
        this.events.next(event);
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
        this.transitions.complete();
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
    processNavigations() {
        this.navigations.subscribe(t => {
            this.navigated = true;
            this.lastSuccessfulId = t.id;
            this.currentPageId = t.targetPageId;
            this.events
                .next(new NavigationEnd(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(this.currentUrlTree)));
            this.lastSuccessfulNavigation = this.currentNavigation;
            this.titleStrategy?.updateTitle(this.routerState.snapshot);
            t.resolve(true);
        }, e => {
            this.console.warn(`Unhandled Navigation Error: ${e}`);
        });
    }
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
        const id = ++this.navigationId;
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
        this.setTransition({
            id,
            targetPageId,
            source,
            restoredState,
            currentUrlTree: this.currentUrlTree,
            currentRawUrl: this.rawUrlTree,
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
    setBrowserUrl(url, t) {
        const path = this.urlSerializer.serialize(url);
        const state = { ...t.extras.state, ...this.generateNgRouterState(t.id, t.targetPageId) };
        if (this.location.isCurrentPathEqualTo(path) || !!t.extras.replaceUrl) {
            this.location.replaceState(path, '', state);
        }
        else {
            this.location.go(path, '', state);
        }
    }
    /**
     * Performs the necessary rollback action to restore the browser URL to the
     * state before the transition.
     */
    restoreHistory(t, restoringFromCaughtError = false) {
        if (this.canceledNavigationResolution === 'computed') {
            const targetPagePosition = this.currentPageId - t.targetPageId;
            // The navigator change the location before triggered the browser event,
            // so we need to go back to the current url if the navigation is canceled.
            // Also, when navigation gets cancelled while using url update strategy eager, then we need to
            // go back. Because, when `urlUpdateSrategy` is `eager`; `setBrowserUrl` method is called
            // before any verification.
            const browserUrlUpdateOccurred = (t.source === 'popstate' || this.urlUpdateStrategy === 'eager' ||
                this.currentUrlTree === this.currentNavigation?.finalUrl);
            if (browserUrlUpdateOccurred && targetPagePosition !== 0) {
                this.location.historyGo(targetPagePosition);
            }
            else if (this.currentUrlTree === this.currentNavigation?.finalUrl && targetPagePosition === 0) {
                // We got to the activation stage (where currentUrlTree is set to the navigation's
                // finalUrl), but we weren't moving anywhere in history (skipLocationChange or replaceUrl).
                // We still need to reset the router state back to what it was when the navigation started.
                this.resetState(t);
                // TODO(atscott): resetting the `browserUrlTree` should really be done in `resetState`.
                // Investigate if this can be done by running TGP.
                this.browserUrlTree = t.currentUrlTree;
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
                this.resetState(t);
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
    cancelNavigationTransition(t, reason, code) {
        const navCancel = new NavigationCancel(t.id, this.serializeUrl(t.extractedUrl), reason, code);
        this.triggerEvent(navCancel);
        t.resolve(false);
    }
    generateNgRouterState(navigationId, routerPageId) {
        if (this.canceledNavigationResolution === 'computed') {
            return { navigationId, ɵrouterPageId: routerPageId };
        }
        return { navigationId };
    }
}
Router.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.1.0-next.4+sha-458d346", ngImport: i0, type: Router, deps: "invalid", target: i0.ɵɵFactoryTarget.Injectable });
Router.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.1.0-next.4+sha-458d346", ngImport: i0, type: Router });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.1.0-next.4+sha-458d346", ngImport: i0, type: Router, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i0.Type }, { type: i1.UrlSerializer }, { type: i2.ChildrenOutletContexts }, { type: i3.Location }, { type: i0.Injector }, { type: i0.Compiler }, { type: undefined }]; } });
function validateCommands(commands) {
    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        if (cmd == null) {
            throw new RuntimeError(4008 /* RuntimeErrorCode.NULLISH_COMMAND */, NG_DEV_MODE && `The requested path contains ${cmd} segment at index ${i}`);
        }
    }
}
function isBrowserTriggeredNavigation(source) {
    return source !== 'imperative';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFRLFFBQVEsSUFBSSxPQUFPLEVBQUUsYUFBYSxJQUFJLFlBQVksRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUM1SSxPQUFPLEVBQUMsZUFBZSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQWMsRUFBRSxFQUFFLE9BQU8sRUFBbUIsTUFBTSxNQUFNLENBQUM7QUFDdEcsT0FBTyxFQUFDLFVBQVUsRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUV2RyxPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUN4RCxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFFaEQsT0FBTyxFQUFRLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBOEIsYUFBYSxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQXFCLFVBQVUsRUFBRSxZQUFZLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFFelEsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUMsV0FBVyxFQUFDLE1BQU0sMEJBQTBCLENBQUM7QUFDckQsT0FBTyxFQUFDLFNBQVMsRUFB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QyxFQUFFLENBQUMsQ0FBQztTQUNoRjtLQUNGO0FBQ0gsQ0FBQztBQUVELFNBQVMsNEJBQTRCLENBQUMsTUFBNEM7SUFDaEYsT0FBTyxNQUFNLEtBQUssWUFBWSxDQUFDO0FBQ2pDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7Q29tcGlsZXIsIEluamVjdGFibGUsIEluamVjdG9yLCBOZ01vZHVsZVJlZiwgTmdab25lLCBUeXBlLCDJtUNvbnNvbGUgYXMgQ29uc29sZSwgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7QmVoYXZpb3JTdWJqZWN0LCBjb21iaW5lTGF0ZXN0LCBFTVBUWSwgT2JzZXJ2YWJsZSwgb2YsIFN1YmplY3QsIFN1YnNjcmlwdGlvbkxpa2V9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjYXRjaEVycm9yLCBkZWZhdWx0SWZFbXB0eSwgZmlsdGVyLCBmaW5hbGl6ZSwgbWFwLCBzd2l0Y2hNYXAsIHRha2UsIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge2NyZWF0ZVJvdXRlclN0YXRlfSBmcm9tICcuL2NyZWF0ZV9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtjcmVhdGVVcmxUcmVlfSBmcm9tICcuL2NyZWF0ZV91cmxfdHJlZSc7XG5pbXBvcnQge1J1bnRpbWVFcnJvckNvZGV9IGZyb20gJy4vZXJyb3JzJztcbmltcG9ydCB7RXZlbnQsIEd1YXJkc0NoZWNrRW5kLCBHdWFyZHNDaGVja1N0YXJ0LCBOYXZpZ2F0aW9uQ2FuY2VsLCBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZSwgTmF2aWdhdGlvbkVuZCwgTmF2aWdhdGlvbkVycm9yLCBOYXZpZ2F0aW9uU3RhcnQsIE5hdmlnYXRpb25UcmlnZ2VyLCBSZXNvbHZlRW5kLCBSZXNvbHZlU3RhcnQsIFJvdXRlQ29uZmlnTG9hZEVuZCwgUm91dGVDb25maWdMb2FkU3RhcnQsIFJvdXRlc1JlY29nbml6ZWR9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7UXVlcnlQYXJhbXNIYW5kbGluZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHthY3RpdmF0ZVJvdXRlc30gZnJvbSAnLi9vcGVyYXRvcnMvYWN0aXZhdGVfcm91dGVzJztcbmltcG9ydCB7YXBwbHlSZWRpcmVjdHN9IGZyb20gJy4vb3BlcmF0b3JzL2FwcGx5X3JlZGlyZWN0cyc7XG5pbXBvcnQge2NoZWNrR3VhcmRzfSBmcm9tICcuL29wZXJhdG9ycy9jaGVja19ndWFyZHMnO1xuaW1wb3J0IHtyZWNvZ25pemV9IGZyb20gJy4vb3BlcmF0b3JzL3JlY29nbml6ZSc7XG5pbXBvcnQge3Jlc29sdmVEYXRhfSBmcm9tICcuL29wZXJhdG9ycy9yZXNvbHZlX2RhdGEnO1xuaW1wb3J0IHtzd2l0Y2hUYXB9IGZyb20gJy4vb3BlcmF0b3JzL3N3aXRjaF90YXAnO1xuaW1wb3J0IHtUaXRsZVN0cmF0ZWd5fSBmcm9tICcuL3BhZ2VfdGl0bGVfc3RyYXRlZ3knO1xuaW1wb3J0IHtEZWZhdWx0Um91dGVSZXVzZVN0cmF0ZWd5LCBSb3V0ZVJldXNlU3RyYXRlZ3l9IGZyb20gJy4vcm91dGVfcmV1c2Vfc3RyYXRlZ3knO1xuaW1wb3J0IHtSb3V0ZXJDb25maWdMb2FkZXJ9IGZyb20gJy4vcm91dGVyX2NvbmZpZ19sb2FkZXInO1xuaW1wb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzfSBmcm9tICcuL3JvdXRlcl9vdXRsZXRfY29udGV4dCc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlLCBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBjcmVhdGVFbXB0eVN0YXRlLCBSb3V0ZXJTdGF0ZSwgUm91dGVyU3RhdGVTbmFwc2hvdH0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtpc05hdmlnYXRpb25DYW5jZWxpbmdFcnJvciwgbmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yLCBQYXJhbXMsIFJFRElSRUNUSU5HX0NBTkNFTExBVElPTl9SRUFTT059IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7RGVmYXVsdFVybEhhbmRsaW5nU3RyYXRlZ3ksIFVybEhhbmRsaW5nU3RyYXRlZ3l9IGZyb20gJy4vdXJsX2hhbmRsaW5nX3N0cmF0ZWd5JztcbmltcG9ydCB7Y29udGFpbnNUcmVlLCBjcmVhdGVFbXB0eVVybFRyZWUsIElzQWN0aXZlTWF0Y2hPcHRpb25zLCBVcmxTZXJpYWxpemVyLCBVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcbmltcG9ydCB7c3RhbmRhcmRpemVDb25maWcsIHZhbGlkYXRlQ29uZmlnfSBmcm9tICcuL3V0aWxzL2NvbmZpZyc7XG5pbXBvcnQge0NoZWNrcywgZ2V0QWxsUm91dGVHdWFyZHN9IGZyb20gJy4vdXRpbHMvcHJlYWN0aXZhdGlvbic7XG5pbXBvcnQge2lzVXJsVHJlZX0gZnJvbSAnLi91dGlscy90eXBlX2d1YXJkcyc7XG5cblxuY29uc3QgTkdfREVWX01PREUgPSB0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCAhIW5nRGV2TW9kZTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBPcHRpb25zIHRoYXQgbW9kaWZ5IHRoZSBgUm91dGVyYCBVUkwuXG4gKiBTdXBwbHkgYW4gb2JqZWN0IGNvbnRhaW5pbmcgYW55IG9mIHRoZXNlIHByb3BlcnRpZXMgdG8gYSBgUm91dGVyYCBuYXZpZ2F0aW9uIGZ1bmN0aW9uIHRvXG4gKiBjb250cm9sIGhvdyB0aGUgdGFyZ2V0IFVSTCBzaG91bGQgYmUgY29uc3RydWN0ZWQuXG4gKlxuICogQHNlZSBbUm91dGVyLm5hdmlnYXRlKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNuYXZpZ2F0ZSlcbiAqIEBzZWUgW1JvdXRlci5jcmVhdGVVcmxUcmVlKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNjcmVhdGV1cmx0cmVlKVxuICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBVcmxDcmVhdGlvbk9wdGlvbnMge1xuICAvKipcbiAgICogU3BlY2lmaWVzIGEgcm9vdCBVUkkgdG8gdXNlIGZvciByZWxhdGl2ZSBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBGb3IgZXhhbXBsZSwgY29uc2lkZXIgdGhlIGZvbGxvd2luZyByb3V0ZSBjb25maWd1cmF0aW9uIHdoZXJlIHRoZSBwYXJlbnQgcm91dGVcbiAgICogaGFzIHR3byBjaGlsZHJlbi5cbiAgICpcbiAgICogYGBgXG4gICAqIFt7XG4gICAqICAgcGF0aDogJ3BhcmVudCcsXG4gICAqICAgY29tcG9uZW50OiBQYXJlbnRDb21wb25lbnQsXG4gICAqICAgY2hpbGRyZW46IFt7XG4gICAqICAgICBwYXRoOiAnbGlzdCcsXG4gICAqICAgICBjb21wb25lbnQ6IExpc3RDb21wb25lbnRcbiAgICogICB9LHtcbiAgICogICAgIHBhdGg6ICdjaGlsZCcsXG4gICAqICAgICBjb21wb25lbnQ6IENoaWxkQ29tcG9uZW50XG4gICAqICAgfV1cbiAgICogfV1cbiAgICogYGBgXG4gICAqXG4gICAqIFRoZSBmb2xsb3dpbmcgYGdvKClgIGZ1bmN0aW9uIG5hdmlnYXRlcyB0byB0aGUgYGxpc3RgIHJvdXRlIGJ5XG4gICAqIGludGVycHJldGluZyB0aGUgZGVzdGluYXRpb24gVVJJIGFzIHJlbGF0aXZlIHRvIHRoZSBhY3RpdmF0ZWQgYGNoaWxkYCAgcm91dGVcbiAgICpcbiAgICogYGBgXG4gICAqICBAQ29tcG9uZW50KHsuLi59KVxuICAgKiAgY2xhc3MgQ2hpbGRDb21wb25lbnQge1xuICAgKiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJvdXRlcjogUm91dGVyLCBwcml2YXRlIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSkge31cbiAgICpcbiAgICogICAgZ28oKSB7XG4gICAqICAgICAgdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycuLi9saXN0J10sIHsgcmVsYXRpdmVUbzogdGhpcy5yb3V0ZSB9KTtcbiAgICogICAgfVxuICAgKiAgfVxuICAgKiBgYGBcbiAgICpcbiAgICogQSB2YWx1ZSBvZiBgbnVsbGAgb3IgYHVuZGVmaW5lZGAgaW5kaWNhdGVzIHRoYXQgdGhlIG5hdmlnYXRpb24gY29tbWFuZHMgc2hvdWxkIGJlIGFwcGxpZWRcbiAgICogcmVsYXRpdmUgdG8gdGhlIHJvb3QuXG4gICAqL1xuICByZWxhdGl2ZVRvPzogQWN0aXZhdGVkUm91dGV8bnVsbDtcblxuICAvKipcbiAgICogU2V0cyBxdWVyeSBwYXJhbWV0ZXJzIHRvIHRoZSBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvcmVzdWx0cz9wYWdlPTFcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvcmVzdWx0cyddLCB7IHF1ZXJ5UGFyYW1zOiB7IHBhZ2U6IDEgfSB9KTtcbiAgICogYGBgXG4gICAqL1xuICBxdWVyeVBhcmFtcz86IFBhcmFtc3xudWxsO1xuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBoYXNoIGZyYWdtZW50IGZvciB0aGUgVVJMLlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgdG8gL3Jlc3VsdHMjdG9wXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3Jlc3VsdHMnXSwgeyBmcmFnbWVudDogJ3RvcCcgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnQ/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEhvdyB0byBoYW5kbGUgcXVlcnkgcGFyYW1ldGVycyBpbiB0aGUgcm91dGVyIGxpbmsgZm9yIHRoZSBuZXh0IG5hdmlnYXRpb24uXG4gICAqIE9uZSBvZjpcbiAgICogKiBgcHJlc2VydmVgIDogUHJlc2VydmUgY3VycmVudCBwYXJhbWV0ZXJzLlxuICAgKiAqIGBtZXJnZWAgOiBNZXJnZSBuZXcgd2l0aCBjdXJyZW50IHBhcmFtZXRlcnMuXG4gICAqXG4gICAqIFRoZSBcInByZXNlcnZlXCIgb3B0aW9uIGRpc2NhcmRzIGFueSBuZXcgcXVlcnkgcGFyYW1zOlxuICAgKiBgYGBcbiAgICogLy8gZnJvbSAvdmlldzE/cGFnZT0xIHRvL3ZpZXcyP3BhZ2U9MVxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3MiddLCB7IHF1ZXJ5UGFyYW1zOiB7IHBhZ2U6IDIgfSwgIHF1ZXJ5UGFyYW1zSGFuZGxpbmc6IFwicHJlc2VydmVcIlxuICAgKiB9KTtcbiAgICogYGBgXG4gICAqIFRoZSBcIm1lcmdlXCIgb3B0aW9uIGFwcGVuZHMgbmV3IHF1ZXJ5IHBhcmFtcyB0byB0aGUgcGFyYW1zIGZyb20gdGhlIGN1cnJlbnQgVVJMOlxuICAgKiBgYGBcbiAgICogLy8gZnJvbSAvdmlldzE/cGFnZT0xIHRvL3ZpZXcyP3BhZ2U9MSZvdGhlcktleT0yXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcyJ10sIHsgcXVlcnlQYXJhbXM6IHsgb3RoZXJLZXk6IDIgfSwgIHF1ZXJ5UGFyYW1zSGFuZGxpbmc6IFwibWVyZ2VcIlxuICAgKiB9KTtcbiAgICogYGBgXG4gICAqIEluIGNhc2Ugb2YgYSBrZXkgY29sbGlzaW9uIGJldHdlZW4gY3VycmVudCBwYXJhbWV0ZXJzIGFuZCB0aG9zZSBpbiB0aGUgYHF1ZXJ5UGFyYW1zYCBvYmplY3QsXG4gICAqIHRoZSBuZXcgdmFsdWUgaXMgdXNlZC5cbiAgICpcbiAgICovXG4gIHF1ZXJ5UGFyYW1zSGFuZGxpbmc/OiBRdWVyeVBhcmFtc0hhbmRsaW5nfG51bGw7XG5cbiAgLyoqXG4gICAqIFdoZW4gdHJ1ZSwgcHJlc2VydmVzIHRoZSBVUkwgZnJhZ21lbnQgZm9yIHRoZSBuZXh0IG5hdmlnYXRpb25cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIFByZXNlcnZlIGZyYWdtZW50IGZyb20gL3Jlc3VsdHMjdG9wIHRvIC92aWV3I3RvcFxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgcHJlc2VydmVGcmFnbWVudDogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqL1xuICBwcmVzZXJ2ZUZyYWdtZW50PzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBPcHRpb25zIHRoYXQgbW9kaWZ5IHRoZSBgUm91dGVyYCBuYXZpZ2F0aW9uIHN0cmF0ZWd5LlxuICogU3VwcGx5IGFuIG9iamVjdCBjb250YWluaW5nIGFueSBvZiB0aGVzZSBwcm9wZXJ0aWVzIHRvIGEgYFJvdXRlcmAgbmF2aWdhdGlvbiBmdW5jdGlvbiB0b1xuICogY29udHJvbCBob3cgdGhlIG5hdmlnYXRpb24gc2hvdWxkIGJlIGhhbmRsZWQuXG4gKlxuICogQHNlZSBbUm91dGVyLm5hdmlnYXRlKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNuYXZpZ2F0ZSlcbiAqIEBzZWUgW1JvdXRlci5uYXZpZ2F0ZUJ5VXJsKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNuYXZpZ2F0ZWJ5dXJsKVxuICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zIHtcbiAgLyoqXG4gICAqIFdoZW4gdHJ1ZSwgbmF2aWdhdGVzIHdpdGhvdXQgcHVzaGluZyBhIG5ldyBzdGF0ZSBpbnRvIGhpc3RvcnkuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSBzaWxlbnRseSB0byAvdmlld1xuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHNraXBMb2NhdGlvbkNoYW5nZT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZW4gdHJ1ZSwgbmF2aWdhdGVzIHdoaWxlIHJlcGxhY2luZyB0aGUgY3VycmVudCBzdGF0ZSBpbiBoaXN0b3J5LlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgdG8gL3ZpZXdcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHJlcGxhY2VVcmw6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcmVwbGFjZVVybD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIERldmVsb3Blci1kZWZpbmVkIHN0YXRlIHRoYXQgY2FuIGJlIHBhc3NlZCB0byBhbnkgbmF2aWdhdGlvbi5cbiAgICogQWNjZXNzIHRoaXMgdmFsdWUgdGhyb3VnaCB0aGUgYE5hdmlnYXRpb24uZXh0cmFzYCBvYmplY3RcbiAgICogcmV0dXJuZWQgZnJvbSB0aGUgW1JvdXRlci5nZXRDdXJyZW50TmF2aWdhdGlvbigpXG4gICAqIG1ldGhvZF0oYXBpL3JvdXRlci9Sb3V0ZXIjZ2V0Y3VycmVudG5hdmlnYXRpb24pIHdoaWxlIGEgbmF2aWdhdGlvbiBpcyBleGVjdXRpbmcuXG4gICAqXG4gICAqIEFmdGVyIGEgbmF2aWdhdGlvbiBjb21wbGV0ZXMsIHRoZSByb3V0ZXIgd3JpdGVzIGFuIG9iamVjdCBjb250YWluaW5nIHRoaXNcbiAgICogdmFsdWUgdG9nZXRoZXIgd2l0aCBhIGBuYXZpZ2F0aW9uSWRgIHRvIGBoaXN0b3J5LnN0YXRlYC5cbiAgICogVGhlIHZhbHVlIGlzIHdyaXR0ZW4gd2hlbiBgbG9jYXRpb24uZ28oKWAgb3IgYGxvY2F0aW9uLnJlcGxhY2VTdGF0ZSgpYFxuICAgKiBpcyBjYWxsZWQgYmVmb3JlIGFjdGl2YXRpbmcgdGhpcyByb3V0ZS5cbiAgICpcbiAgICogTm90ZSB0aGF0IGBoaXN0b3J5LnN0YXRlYCBkb2VzIG5vdCBwYXNzIGFuIG9iamVjdCBlcXVhbGl0eSB0ZXN0IGJlY2F1c2VcbiAgICogdGhlIHJvdXRlciBhZGRzIHRoZSBgbmF2aWdhdGlvbklkYCBvbiBlYWNoIG5hdmlnYXRpb24uXG4gICAqXG4gICAqL1xuICBzdGF0ZT86IHtbazogc3RyaW5nXTogYW55fTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBPcHRpb25zIHRoYXQgbW9kaWZ5IHRoZSBgUm91dGVyYCBuYXZpZ2F0aW9uIHN0cmF0ZWd5LlxuICogU3VwcGx5IGFuIG9iamVjdCBjb250YWluaW5nIGFueSBvZiB0aGVzZSBwcm9wZXJ0aWVzIHRvIGEgYFJvdXRlcmAgbmF2aWdhdGlvbiBmdW5jdGlvbiB0b1xuICogY29udHJvbCBob3cgdGhlIHRhcmdldCBVUkwgc2hvdWxkIGJlIGNvbnN0cnVjdGVkIG9yIGludGVycHJldGVkLlxuICpcbiAqIEBzZWUgW1JvdXRlci5uYXZpZ2F0ZSgpIG1ldGhvZF0oYXBpL3JvdXRlci9Sb3V0ZXIjbmF2aWdhdGUpXG4gKiBAc2VlIFtSb3V0ZXIubmF2aWdhdGVCeVVybCgpIG1ldGhvZF0oYXBpL3JvdXRlci9Sb3V0ZXIjbmF2aWdhdGVieXVybClcbiAqIEBzZWUgW1JvdXRlci5jcmVhdGVVcmxUcmVlKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNjcmVhdGV1cmx0cmVlKVxuICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKVxuICogQHNlZSBVcmxDcmVhdGlvbk9wdGlvbnNcbiAqIEBzZWUgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9uc1xuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOYXZpZ2F0aW9uRXh0cmFzIGV4dGVuZHMgVXJsQ3JlYXRpb25PcHRpb25zLCBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zIHt9XG5cbi8qKlxuICogRXJyb3IgaGFuZGxlciB0aGF0IGlzIGludm9rZWQgd2hlbiBhIG5hdmlnYXRpb24gZXJyb3Igb2NjdXJzLlxuICpcbiAqIElmIHRoZSBoYW5kbGVyIHJldHVybnMgYSB2YWx1ZSwgdGhlIG5hdmlnYXRpb24gUHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIHRoaXMgdmFsdWUuXG4gKiBJZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLCB0aGUgbmF2aWdhdGlvbiBQcm9taXNlIGlzIHJlamVjdGVkIHdpdGhcbiAqIHRoZSBleGNlcHRpb24uXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBFcnJvckhhbmRsZXIgPSAoZXJyb3I6IGFueSkgPT4gYW55O1xuXG5mdW5jdGlvbiBkZWZhdWx0RXJyb3JIYW5kbGVyKGVycm9yOiBhbnkpOiBhbnkge1xuICB0aHJvdyBlcnJvcjtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdE1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcihcbiAgICBlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gIHJldHVybiB1cmxTZXJpYWxpemVyLnBhcnNlKCcvJyk7XG59XG5cbmV4cG9ydCB0eXBlIFJlc3RvcmVkU3RhdGUgPSB7XG4gIFtrOiBzdHJpbmddOiBhbnksXG4gIC8vIFRPRE8oIzI3NjA3KTogUmVtb3ZlIGBuYXZpZ2F0aW9uSWRgIGFuZCBgybVyb3V0ZXJQYWdlSWRgIGFuZCBtb3ZlIHRvIGBuZ2Agb3IgYMm1YCBuYW1lc3BhY2UuXG4gIG5hdmlnYXRpb25JZDogbnVtYmVyLFxuICAvLyBUaGUgYMm1YCBwcmVmaXggaXMgdGhlcmUgdG8gcmVkdWNlIHRoZSBjaGFuY2Ugb2YgY29sbGlkaW5nIHdpdGggYW55IGV4aXN0aW5nIHVzZXIgcHJvcGVydGllcyBvblxuICAvLyB0aGUgaGlzdG9yeSBzdGF0ZS5cbiAgybVyb3V0ZXJQYWdlSWQ/OiBudW1iZXIsXG59O1xuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IGEgbmF2aWdhdGlvbiBvcGVyYXRpb24uXG4gKiBSZXRyaWV2ZSB0aGUgbW9zdCByZWNlbnQgbmF2aWdhdGlvbiBvYmplY3Qgd2l0aCB0aGVcbiAqIFtSb3V0ZXIuZ2V0Q3VycmVudE5hdmlnYXRpb24oKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI2dldGN1cnJlbnRuYXZpZ2F0aW9uKSAuXG4gKlxuICogKiAqaWQqIDogVGhlIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBjdXJyZW50IG5hdmlnYXRpb24uXG4gKiAqICppbml0aWFsVXJsKiA6IFRoZSB0YXJnZXQgVVJMIHBhc3NlZCBpbnRvIHRoZSBgUm91dGVyI25hdmlnYXRlQnlVcmwoKWAgY2FsbCBiZWZvcmUgbmF2aWdhdGlvbi5cbiAqIFRoaXMgaXMgdGhlIHZhbHVlIGJlZm9yZSB0aGUgcm91dGVyIGhhcyBwYXJzZWQgb3IgYXBwbGllZCByZWRpcmVjdHMgdG8gaXQuXG4gKiAqICpleHRyYWN0ZWRVcmwqIDogVGhlIGluaXRpYWwgdGFyZ2V0IFVSTCBhZnRlciBiZWluZyBwYXJzZWQgd2l0aCBgVXJsU2VyaWFsaXplci5leHRyYWN0KClgLlxuICogKiAqZmluYWxVcmwqIDogVGhlIGV4dHJhY3RlZCBVUkwgYWZ0ZXIgcmVkaXJlY3RzIGhhdmUgYmVlbiBhcHBsaWVkLlxuICogVGhpcyBVUkwgbWF5IG5vdCBiZSBhdmFpbGFibGUgaW1tZWRpYXRlbHksIHRoZXJlZm9yZSB0aGlzIHByb3BlcnR5IGNhbiBiZSBgdW5kZWZpbmVkYC5cbiAqIEl0IGlzIGd1YXJhbnRlZWQgdG8gYmUgc2V0IGFmdGVyIHRoZSBgUm91dGVzUmVjb2duaXplZGAgZXZlbnQgZmlyZXMuXG4gKiAqICp0cmlnZ2VyKiA6IElkZW50aWZpZXMgaG93IHRoaXMgbmF2aWdhdGlvbiB3YXMgdHJpZ2dlcmVkLlxuICogLS0gJ2ltcGVyYXRpdmUnLS1UcmlnZ2VyZWQgYnkgYHJvdXRlci5uYXZpZ2F0ZUJ5VXJsYCBvciBgcm91dGVyLm5hdmlnYXRlYC5cbiAqIC0tICdwb3BzdGF0ZSctLVRyaWdnZXJlZCBieSBhIHBvcHN0YXRlIGV2ZW50LlxuICogLS0gJ2hhc2hjaGFuZ2UnLS1UcmlnZ2VyZWQgYnkgYSBoYXNoY2hhbmdlIGV2ZW50LlxuICogKiAqZXh0cmFzKiA6IEEgYE5hdmlnYXRpb25FeHRyYXNgIG9wdGlvbnMgb2JqZWN0IHRoYXQgY29udHJvbGxlZCB0aGUgc3RyYXRlZ3kgdXNlZCBmb3IgdGhpc1xuICogbmF2aWdhdGlvbi5cbiAqICogKnByZXZpb3VzTmF2aWdhdGlvbiogOiBUaGUgcHJldmlvdXNseSBzdWNjZXNzZnVsIGBOYXZpZ2F0aW9uYCBvYmplY3QuIE9ubHkgb25lIHByZXZpb3VzXG4gKiBuYXZpZ2F0aW9uIGlzIGF2YWlsYWJsZSwgdGhlcmVmb3JlIHRoaXMgcHJldmlvdXMgYE5hdmlnYXRpb25gIG9iamVjdCBoYXMgYSBgbnVsbGAgdmFsdWUgZm9yIGl0c1xuICogb3duIGBwcmV2aW91c05hdmlnYXRpb25gLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOYXZpZ2F0aW9uIHtcbiAgLyoqXG4gICAqIFRoZSB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY3VycmVudCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaWQ6IG51bWJlcjtcbiAgLyoqXG4gICAqIFRoZSB0YXJnZXQgVVJMIHBhc3NlZCBpbnRvIHRoZSBgUm91dGVyI25hdmlnYXRlQnlVcmwoKWAgY2FsbCBiZWZvcmUgbmF2aWdhdGlvbi4gVGhpcyBpc1xuICAgKiB0aGUgdmFsdWUgYmVmb3JlIHRoZSByb3V0ZXIgaGFzIHBhcnNlZCBvciBhcHBsaWVkIHJlZGlyZWN0cyB0byBpdC5cbiAgICovXG4gIGluaXRpYWxVcmw6IFVybFRyZWU7XG4gIC8qKlxuICAgKiBUaGUgaW5pdGlhbCB0YXJnZXQgVVJMIGFmdGVyIGJlaW5nIHBhcnNlZCB3aXRoIGBVcmxTZXJpYWxpemVyLmV4dHJhY3QoKWAuXG4gICAqL1xuICBleHRyYWN0ZWRVcmw6IFVybFRyZWU7XG4gIC8qKlxuICAgKiBUaGUgZXh0cmFjdGVkIFVSTCBhZnRlciByZWRpcmVjdHMgaGF2ZSBiZWVuIGFwcGxpZWQuXG4gICAqIFRoaXMgVVJMIG1heSBub3QgYmUgYXZhaWxhYmxlIGltbWVkaWF0ZWx5LCB0aGVyZWZvcmUgdGhpcyBwcm9wZXJ0eSBjYW4gYmUgYHVuZGVmaW5lZGAuXG4gICAqIEl0IGlzIGd1YXJhbnRlZWQgdG8gYmUgc2V0IGFmdGVyIHRoZSBgUm91dGVzUmVjb2duaXplZGAgZXZlbnQgZmlyZXMuXG4gICAqL1xuICBmaW5hbFVybD86IFVybFRyZWU7XG4gIC8qKlxuICAgKiBJZGVudGlmaWVzIGhvdyB0aGlzIG5hdmlnYXRpb24gd2FzIHRyaWdnZXJlZC5cbiAgICpcbiAgICogKiAnaW1wZXJhdGl2ZSctLVRyaWdnZXJlZCBieSBgcm91dGVyLm5hdmlnYXRlQnlVcmxgIG9yIGByb3V0ZXIubmF2aWdhdGVgLlxuICAgKiAqICdwb3BzdGF0ZSctLVRyaWdnZXJlZCBieSBhIHBvcHN0YXRlIGV2ZW50LlxuICAgKiAqICdoYXNoY2hhbmdlJy0tVHJpZ2dlcmVkIGJ5IGEgaGFzaGNoYW5nZSBldmVudC5cbiAgICovXG4gIHRyaWdnZXI6ICdpbXBlcmF0aXZlJ3wncG9wc3RhdGUnfCdoYXNoY2hhbmdlJztcbiAgLyoqXG4gICAqIE9wdGlvbnMgdGhhdCBjb250cm9sbGVkIHRoZSBzdHJhdGVneSB1c2VkIGZvciB0aGlzIG5hdmlnYXRpb24uXG4gICAqIFNlZSBgTmF2aWdhdGlvbkV4dHJhc2AuXG4gICAqL1xuICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXM7XG4gIC8qKlxuICAgKiBUaGUgcHJldmlvdXNseSBzdWNjZXNzZnVsIGBOYXZpZ2F0aW9uYCBvYmplY3QuIE9ubHkgb25lIHByZXZpb3VzIG5hdmlnYXRpb25cbiAgICogaXMgYXZhaWxhYmxlLCB0aGVyZWZvcmUgdGhpcyBwcmV2aW91cyBgTmF2aWdhdGlvbmAgb2JqZWN0IGhhcyBhIGBudWxsYCB2YWx1ZVxuICAgKiBmb3IgaXRzIG93biBgcHJldmlvdXNOYXZpZ2F0aW9uYC5cbiAgICovXG4gIHByZXZpb3VzTmF2aWdhdGlvbjogTmF2aWdhdGlvbnxudWxsO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5hdmlnYXRpb25UcmFuc2l0aW9uIHtcbiAgaWQ6IG51bWJlcjtcbiAgdGFyZ2V0UGFnZUlkOiBudW1iZXI7XG4gIGN1cnJlbnRVcmxUcmVlOiBVcmxUcmVlO1xuICBjdXJyZW50UmF3VXJsOiBVcmxUcmVlO1xuICBleHRyYWN0ZWRVcmw6IFVybFRyZWU7XG4gIHVybEFmdGVyUmVkaXJlY3RzPzogVXJsVHJlZTtcbiAgcmF3VXJsOiBVcmxUcmVlO1xuICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXM7XG4gIHJlc29sdmU6IGFueTtcbiAgcmVqZWN0OiBhbnk7XG4gIHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj47XG4gIHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXI7XG4gIHJlc3RvcmVkU3RhdGU6IFJlc3RvcmVkU3RhdGV8bnVsbDtcbiAgY3VycmVudFNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90O1xuICB0YXJnZXRTbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdHxudWxsO1xuICBjdXJyZW50Um91dGVyU3RhdGU6IFJvdXRlclN0YXRlO1xuICB0YXJnZXRSb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGV8bnVsbDtcbiAgZ3VhcmRzOiBDaGVja3M7XG4gIGd1YXJkc1Jlc3VsdDogYm9vbGVhbnxVcmxUcmVlfG51bGw7XG59XG5cbi8qKlxuICogVGhlIGVxdWl2YWxlbnQgYElzQWN0aXZlTWF0Y2hPcHRpb25zYCBvcHRpb25zIGZvciBgUm91dGVyLmlzQWN0aXZlYCBpcyBjYWxsZWQgd2l0aCBgdHJ1ZWBcbiAqIChleGFjdCA9IHRydWUpLlxuICovXG5leHBvcnQgY29uc3QgZXhhY3RNYXRjaE9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zID0ge1xuICBwYXRoczogJ2V4YWN0JyxcbiAgZnJhZ21lbnQ6ICdpZ25vcmVkJyxcbiAgbWF0cml4UGFyYW1zOiAnaWdub3JlZCcsXG4gIHF1ZXJ5UGFyYW1zOiAnZXhhY3QnXG59O1xuXG4vKipcbiAqIFRoZSBlcXVpdmFsZW50IGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2Agb3B0aW9ucyBmb3IgYFJvdXRlci5pc0FjdGl2ZWAgaXMgY2FsbGVkIHdpdGggYGZhbHNlYFxuICogKGV4YWN0ID0gZmFsc2UpLlxuICovXG5leHBvcnQgY29uc3Qgc3Vic2V0TWF0Y2hPcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucyA9IHtcbiAgcGF0aHM6ICdzdWJzZXQnLFxuICBmcmFnbWVudDogJ2lnbm9yZWQnLFxuICBtYXRyaXhQYXJhbXM6ICdpZ25vcmVkJyxcbiAgcXVlcnlQYXJhbXM6ICdzdWJzZXQnXG59O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEEgc2VydmljZSB0aGF0IHByb3ZpZGVzIG5hdmlnYXRpb24gYW1vbmcgdmlld3MgYW5kIFVSTCBtYW5pcHVsYXRpb24gY2FwYWJpbGl0aWVzLlxuICpcbiAqIEBzZWUgYFJvdXRlYC5cbiAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gR3VpZGVdKGd1aWRlL3JvdXRlcikuXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIFJvdXRlciB7XG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIHRoZSBhY3RpdmF0ZWQgYFVybFRyZWVgIHRoYXQgdGhlIGBSb3V0ZXJgIGlzIGNvbmZpZ3VyZWQgdG8gaGFuZGxlICh0aHJvdWdoXG4gICAqIGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCkuIFRoYXQgaXMsIGFmdGVyIHdlIGZpbmQgdGhlIHJvdXRlIGNvbmZpZyB0cmVlIHRoYXQgd2UncmUgZ29pbmcgdG9cbiAgICogYWN0aXZhdGUsIHJ1biBndWFyZHMsIGFuZCBhcmUganVzdCBhYm91dCB0byBhY3RpdmF0ZSB0aGUgcm91dGUsIHdlIHNldCB0aGUgY3VycmVudFVybFRyZWUuXG4gICAqXG4gICAqIFRoaXMgc2hvdWxkIG1hdGNoIHRoZSBgYnJvd3NlclVybFRyZWVgIHdoZW4gYSBuYXZpZ2F0aW9uIHN1Y2NlZWRzLiBJZiB0aGVcbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybGAgaXMgYGZhbHNlYCwgb25seSB0aGUgYGJyb3dzZXJVcmxUcmVlYCBpcyB1cGRhdGVkLlxuICAgKi9cbiAgcHJpdmF0ZSBjdXJyZW50VXJsVHJlZTogVXJsVHJlZTtcbiAgLyoqXG4gICAqIE1lYW50IHRvIHJlcHJlc2VudCB0aGUgZW50aXJlIGJyb3dzZXIgdXJsIGFmdGVyIGEgc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uLiBJbiB0aGUgbGlmZSBvZiBhXG4gICAqIG5hdmlnYXRpb24gdHJhbnNpdGlvbjpcbiAgICogMS4gVGhlIHJhd1VybCByZXByZXNlbnRzIHRoZSBmdWxsIFVSTCB0aGF0J3MgYmVpbmcgbmF2aWdhdGVkIHRvXG4gICAqIDIuIFdlIGFwcGx5IHJlZGlyZWN0cywgd2hpY2ggbWlnaHQgb25seSBhcHBseSB0byBfcGFydF8gb2YgdGhlIFVSTCAoZHVlIHRvXG4gICAqIGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCkuXG4gICAqIDMuIFJpZ2h0IGJlZm9yZSBhY3RpdmF0aW9uIChiZWNhdXNlIHdlIGFzc3VtZSBhY3RpdmF0aW9uIHdpbGwgc3VjY2VlZCksIHdlIHVwZGF0ZSB0aGVcbiAgICogcmF3VXJsVHJlZSB0byBiZSBhIGNvbWJpbmF0aW9uIG9mIHRoZSB1cmxBZnRlclJlZGlyZWN0cyAoYWdhaW4sIHRoaXMgbWlnaHQgb25seSBhcHBseSB0byBwYXJ0XG4gICAqIG9mIHRoZSBpbml0aWFsIHVybCkgYW5kIHRoZSByYXdVcmwgb2YgdGhlIHRyYW5zaXRpb24gKHdoaWNoIHdhcyB0aGUgb3JpZ2luYWwgbmF2aWdhdGlvbiB1cmwgaW5cbiAgICogaXRzIGZ1bGwgZm9ybSkuXG4gICAqL1xuICBwcml2YXRlIHJhd1VybFRyZWU6IFVybFRyZWU7XG4gIC8qKlxuICAgKiBNZWFudCB0byByZXByZXNlbnQgdGhlIHBhcnQgb2YgdGhlIGJyb3dzZXIgdXJsIHRoYXQgdGhlIGBSb3V0ZXJgIGlzIHNldCB1cCB0byBoYW5kbGUgKHZpYSB0aGVcbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3lgKS4gVGhpcyB2YWx1ZSBpcyB1cGRhdGVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBicm93c2VyIHVybCBpcyB1cGRhdGVkIChvclxuICAgKiB0aGUgYnJvd3NlciB1cmwgdXBkYXRlIGlzIHNraXBwZWQgdmlhIGBza2lwTG9jYXRpb25DaGFuZ2VgKS4gV2l0aCB0aGF0LCBub3RlIHRoYXRcbiAgICogYGJyb3dzZXJVcmxUcmVlYCBfbWF5IG5vdF8gcmVmbGVjdCB0aGUgYWN0dWFsIGJyb3dzZXIgVVJMIGZvciB0d28gcmVhc29uczpcbiAgICpcbiAgICogMS4gYFVybEhhbmRsaW5nU3RyYXRlZ3lgIG9ubHkgaGFuZGxlcyBwYXJ0IG9mIHRoZSBVUkxcbiAgICogMi4gYHNraXBMb2NhdGlvbkNoYW5nZWAgZG9lcyBub3QgdXBkYXRlIHRoZSBicm93c2VyIHVybC5cbiAgICpcbiAgICogU28gdG8gcmVpdGVyYXRlLCBgYnJvd3NlclVybFRyZWVgIG9ubHkgcmVwcmVzZW50cyB0aGUgUm91dGVyJ3MgaW50ZXJuYWwgdW5kZXJzdGFuZGluZyBvZiB0aGVcbiAgICogY3VycmVudCByb3V0ZSwgZWl0aGVyIGJlZm9yZSBndWFyZHMgd2l0aCBgdXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcidgIG9yIHJpZ2h0IGJlZm9yZVxuICAgKiBhY3RpdmF0aW9uIHdpdGggYCdkZWZlcnJlZCdgLlxuICAgKlxuICAgKiBUaGlzIHNob3VsZCBtYXRjaCB0aGUgYGN1cnJlbnRVcmxUcmVlYCB3aGVuIHRoZSBuYXZpZ2F0aW9uIHN1Y2NlZWRzLlxuICAgKi9cbiAgcHJpdmF0ZSBicm93c2VyVXJsVHJlZTogVXJsVHJlZTtcbiAgcHJpdmF0ZSByZWFkb25seSB0cmFuc2l0aW9uczogQmVoYXZpb3JTdWJqZWN0PE5hdmlnYXRpb25UcmFuc2l0aW9uPjtcbiAgcHJpdmF0ZSBuYXZpZ2F0aW9uczogT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj47XG4gIHByaXZhdGUgbGFzdFN1Y2Nlc3NmdWxOYXZpZ2F0aW9uOiBOYXZpZ2F0aW9ufG51bGwgPSBudWxsO1xuICBwcml2YXRlIGN1cnJlbnROYXZpZ2F0aW9uOiBOYXZpZ2F0aW9ufG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRpc3Bvc2VkID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBsb2NhdGlvblN1YnNjcmlwdGlvbj86IFN1YnNjcmlwdGlvbkxpa2U7XG4gIHByaXZhdGUgbmF2aWdhdGlvbklkOiBudW1iZXIgPSAwO1xuXG4gIC8qKlxuICAgKiBUaGUgaWQgb2YgdGhlIGN1cnJlbnRseSBhY3RpdmUgcGFnZSBpbiB0aGUgcm91dGVyLlxuICAgKiBVcGRhdGVkIHRvIHRoZSB0cmFuc2l0aW9uJ3MgdGFyZ2V0IGlkIG9uIGEgc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBUaGlzIGlzIHVzZWQgdG8gdHJhY2sgd2hhdCBwYWdlIHRoZSByb3V0ZXIgbGFzdCBhY3RpdmF0ZWQuIFdoZW4gYW4gYXR0ZW1wdGVkIG5hdmlnYXRpb24gZmFpbHMsXG4gICAqIHRoZSByb3V0ZXIgY2FuIHRoZW4gdXNlIHRoaXMgdG8gY29tcHV0ZSBob3cgdG8gcmVzdG9yZSB0aGUgc3RhdGUgYmFjayB0byB0aGUgcHJldmlvdXNseSBhY3RpdmVcbiAgICogcGFnZS5cbiAgICovXG4gIHByaXZhdGUgY3VycmVudFBhZ2VJZDogbnVtYmVyID0gMDtcbiAgLyoqXG4gICAqIFRoZSDJtXJvdXRlclBhZ2VJZCBvZiB3aGF0ZXZlciBwYWdlIGlzIGN1cnJlbnRseSBhY3RpdmUgaW4gdGhlIGJyb3dzZXIgaGlzdG9yeS4gVGhpcyBpc1xuICAgKiBpbXBvcnRhbnQgZm9yIGNvbXB1dGluZyB0aGUgdGFyZ2V0IHBhZ2UgaWQgZm9yIG5ldyBuYXZpZ2F0aW9ucyBiZWNhdXNlIHdlIG5lZWQgdG8gZW5zdXJlIGVhY2hcbiAgICogcGFnZSBpZCBpbiB0aGUgYnJvd3NlciBoaXN0b3J5IGlzIDEgbW9yZSB0aGFuIHRoZSBwcmV2aW91cyBlbnRyeS5cbiAgICovXG4gIHByaXZhdGUgZ2V0IGJyb3dzZXJQYWdlSWQoKTogbnVtYmVyfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuICh0aGlzLmxvY2F0aW9uLmdldFN0YXRlKCkgYXMgUmVzdG9yZWRTdGF0ZSB8IG51bGwpPy7JtXJvdXRlclBhZ2VJZDtcbiAgfVxuICBwcml2YXRlIGNvbmZpZ0xvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyO1xuICBwcml2YXRlIG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+O1xuICBwcml2YXRlIGNvbnNvbGU6IENvbnNvbGU7XG4gIHByaXZhdGUgaXNOZ1pvbmVFbmFibGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEFuIGV2ZW50IHN0cmVhbSBmb3Igcm91dGluZyBldmVudHMgaW4gdGhpcyBOZ01vZHVsZS5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBldmVudHM6IE9ic2VydmFibGU8RXZlbnQ+ID0gbmV3IFN1YmplY3Q8RXZlbnQ+KCk7XG4gIC8qKlxuICAgKiBUaGUgY3VycmVudCBzdGF0ZSBvZiByb3V0aW5nIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgcm91dGVyU3RhdGU6IFJvdXRlclN0YXRlO1xuXG4gIC8qKlxuICAgKiBBIGhhbmRsZXIgZm9yIG5hdmlnYXRpb24gZXJyb3JzIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqL1xuICBlcnJvckhhbmRsZXI6IEVycm9ySGFuZGxlciA9IGRlZmF1bHRFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIEEgaGFuZGxlciBmb3IgZXJyb3JzIHRocm93biBieSBgUm91dGVyLnBhcnNlVXJsKHVybClgXG4gICAqIHdoZW4gYHVybGAgY29udGFpbnMgYW4gaW52YWxpZCBjaGFyYWN0ZXIuXG4gICAqIFRoZSBtb3N0IGNvbW1vbiBjYXNlIGlzIGEgYCVgIHNpZ25cbiAgICogdGhhdCdzIG5vdCBlbmNvZGVkIGFuZCBpcyBub3QgcGFydCBvZiBhIHBlcmNlbnQgZW5jb2RlZCBzZXF1ZW5jZS5cbiAgICovXG4gIG1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcjpcbiAgICAgIChlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgICAgdXJsOiBzdHJpbmcpID0+IFVybFRyZWUgPSBkZWZhdWx0TWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyO1xuXG4gIC8qKlxuICAgKiBUcnVlIGlmIGF0IGxlYXN0IG9uZSBuYXZpZ2F0aW9uIGV2ZW50IGhhcyBvY2N1cnJlZCxcbiAgICogZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgbmF2aWdhdGVkOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgbGFzdFN1Y2Nlc3NmdWxJZDogbnVtYmVyID0gLTE7XG5cbiAgLyoqXG4gICAqIEhvb2sgdGhhdCBlbmFibGVzIHlvdSB0byBwYXVzZSBuYXZpZ2F0aW9uIGFmdGVyIHRoZSBwcmVhY3RpdmF0aW9uIHBoYXNlLlxuICAgKiBVc2VkIGJ5IGBSb3V0ZXJNb2R1bGVgLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGFmdGVyUHJlYWN0aXZhdGlvbjogKCkgPT4gT2JzZXJ2YWJsZTx2b2lkPiA9ICgpID0+IG9mKHZvaWQgMCk7XG5cbiAgLyoqXG4gICAqIEEgc3RyYXRlZ3kgZm9yIGV4dHJhY3RpbmcgYW5kIG1lcmdpbmcgVVJMcy5cbiAgICogVXNlZCBmb3IgQW5ndWxhckpTIHRvIEFuZ3VsYXIgbWlncmF0aW9ucy5cbiAgICovXG4gIHVybEhhbmRsaW5nU3RyYXRlZ3k6IFVybEhhbmRsaW5nU3RyYXRlZ3kgPSBuZXcgRGVmYXVsdFVybEhhbmRsaW5nU3RyYXRlZ3koKTtcblxuICAvKipcbiAgICogQSBzdHJhdGVneSBmb3IgcmUtdXNpbmcgcm91dGVzLlxuICAgKi9cbiAgcm91dGVSZXVzZVN0cmF0ZWd5OiBSb3V0ZVJldXNlU3RyYXRlZ3kgPSBuZXcgRGVmYXVsdFJvdXRlUmV1c2VTdHJhdGVneSgpO1xuXG4gIC8qKlxuICAgKiBBIHN0cmF0ZWd5IGZvciBzZXR0aW5nIHRoZSB0aXRsZSBiYXNlZCBvbiB0aGUgYHJvdXRlclN0YXRlYC5cbiAgICovXG4gIHRpdGxlU3RyYXRlZ3k/OiBUaXRsZVN0cmF0ZWd5O1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gaGFuZGxlIGEgbmF2aWdhdGlvbiByZXF1ZXN0IHRvIHRoZSBjdXJyZW50IFVSTC4gT25lIG9mOlxuICAgKlxuICAgKiAtIGAnaWdub3JlJ2AgOiAgVGhlIHJvdXRlciBpZ25vcmVzIHRoZSByZXF1ZXN0LlxuICAgKiAtIGAncmVsb2FkJ2AgOiBUaGUgcm91dGVyIHJlbG9hZHMgdGhlIFVSTC4gVXNlIHRvIGltcGxlbWVudCBhIFwicmVmcmVzaFwiIGZlYXR1cmUuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGlzIG9ubHkgY29uZmlndXJlcyB3aGV0aGVyIHRoZSBSb3V0ZSByZXByb2Nlc3NlcyB0aGUgVVJMIGFuZCB0cmlnZ2VycyByZWxhdGVkXG4gICAqIGFjdGlvbiBhbmQgZXZlbnRzIGxpa2UgcmVkaXJlY3RzLCBndWFyZHMsIGFuZCByZXNvbHZlcnMuIEJ5IGRlZmF1bHQsIHRoZSByb3V0ZXIgcmUtdXNlcyBhXG4gICAqIGNvbXBvbmVudCBpbnN0YW5jZSB3aGVuIGl0IHJlLW5hdmlnYXRlcyB0byB0aGUgc2FtZSBjb21wb25lbnQgdHlwZSB3aXRob3V0IHZpc2l0aW5nIGEgZGlmZmVyZW50XG4gICAqIGNvbXBvbmVudCBmaXJzdC4gVGhpcyBiZWhhdmlvciBpcyBjb25maWd1cmVkIGJ5IHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YC4gSW4gb3JkZXIgdG8gcmVsb2FkXG4gICAqIHJvdXRlZCBjb21wb25lbnRzIG9uIHNhbWUgdXJsIG5hdmlnYXRpb24sIHlvdSBuZWVkIHRvIHNldCBgb25TYW1lVXJsTmF2aWdhdGlvbmAgdG8gYCdyZWxvYWQnYFxuICAgKiBfYW5kXyBwcm92aWRlIGEgYFJvdXRlUmV1c2VTdHJhdGVneWAgd2hpY2ggcmV0dXJucyBgZmFsc2VgIGZvciBgc2hvdWxkUmV1c2VSb3V0ZWAuXG4gICAqL1xuICBvblNhbWVVcmxOYXZpZ2F0aW9uOiAncmVsb2FkJ3wnaWdub3JlJyA9ICdpZ25vcmUnO1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gbWVyZ2UgcGFyYW1ldGVycywgZGF0YSwgcmVzb2x2ZWQgZGF0YSwgYW5kIHRpdGxlIGZyb20gcGFyZW50IHRvIGNoaWxkXG4gICAqIHJvdXRlcy4gT25lIG9mOlxuICAgKlxuICAgKiAtIGAnZW1wdHlPbmx5J2AgOiBJbmhlcml0IHBhcmVudCBwYXJhbWV0ZXJzLCBkYXRhLCBhbmQgcmVzb2x2ZWQgZGF0YVxuICAgKiBmb3IgcGF0aC1sZXNzIG9yIGNvbXBvbmVudC1sZXNzIHJvdXRlcy5cbiAgICogLSBgJ2Fsd2F5cydgIDogSW5oZXJpdCBwYXJlbnQgcGFyYW1ldGVycywgZGF0YSwgYW5kIHJlc29sdmVkIGRhdGFcbiAgICogZm9yIGFsbCBjaGlsZCByb3V0ZXMuXG4gICAqL1xuICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiAnZW1wdHlPbmx5J3wnYWx3YXlzJyA9ICdlbXB0eU9ubHknO1xuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZW4gdGhlIHJvdXRlciB1cGRhdGVzIHRoZSBicm93c2VyIFVSTC5cbiAgICogQnkgZGVmYXVsdCAoYFwiZGVmZXJyZWRcImApLCB1cGRhdGVzIHRoZSBicm93c2VyIFVSTCBhZnRlciBuYXZpZ2F0aW9uIGhhcyBmaW5pc2hlZC5cbiAgICogU2V0IHRvIGAnZWFnZXInYCB0byB1cGRhdGUgdGhlIGJyb3dzZXIgVVJMIGF0IHRoZSBiZWdpbm5pbmcgb2YgbmF2aWdhdGlvbi5cbiAgICogWW91IGNhbiBjaG9vc2UgdG8gdXBkYXRlIGVhcmx5IHNvIHRoYXQsIGlmIG5hdmlnYXRpb24gZmFpbHMsXG4gICAqIHlvdSBjYW4gc2hvdyBhbiBlcnJvciBtZXNzYWdlIHdpdGggdGhlIFVSTCB0aGF0IGZhaWxlZC5cbiAgICovXG4gIHVybFVwZGF0ZVN0cmF0ZWd5OiAnZGVmZXJyZWQnfCdlYWdlcicgPSAnZGVmZXJyZWQnO1xuXG4gIC8qKlxuICAgKiBFbmFibGVzIGEgYnVnIGZpeCB0aGF0IGNvcnJlY3RzIHJlbGF0aXZlIGxpbmsgcmVzb2x1dGlvbiBpbiBjb21wb25lbnRzIHdpdGggZW1wdHkgcGF0aHMuXG4gICAqIEBzZWUgYFJvdXRlck1vZHVsZWBcbiAgICpcbiAgICogQGRlcHJlY2F0ZWRcbiAgICovXG4gIHJlbGF0aXZlTGlua1Jlc29sdXRpb246ICdsZWdhY3knfCdjb3JyZWN0ZWQnID0gJ2NvcnJlY3RlZCc7XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgaG93IHRoZSBSb3V0ZXIgYXR0ZW1wdHMgdG8gcmVzdG9yZSBzdGF0ZSB3aGVuIGEgbmF2aWdhdGlvbiBpcyBjYW5jZWxsZWQuXG4gICAqXG4gICAqICdyZXBsYWNlJyAtIEFsd2F5cyB1c2VzIGBsb2NhdGlvbi5yZXBsYWNlU3RhdGVgIHRvIHNldCB0aGUgYnJvd3NlciBzdGF0ZSB0byB0aGUgc3RhdGUgb2YgdGhlXG4gICAqIHJvdXRlciBiZWZvcmUgdGhlIG5hdmlnYXRpb24gc3RhcnRlZC4gVGhpcyBtZWFucyB0aGF0IGlmIHRoZSBVUkwgb2YgdGhlIGJyb3dzZXIgaXMgdXBkYXRlZFxuICAgKiBfYmVmb3JlXyB0aGUgbmF2aWdhdGlvbiBpcyBjYW5jZWxlZCwgdGhlIFJvdXRlciB3aWxsIHNpbXBseSByZXBsYWNlIHRoZSBpdGVtIGluIGhpc3RvcnkgcmF0aGVyXG4gICAqIHRoYW4gdHJ5aW5nIHRvIHJlc3RvcmUgdG8gdGhlIHByZXZpb3VzIGxvY2F0aW9uIGluIHRoZSBzZXNzaW9uIGhpc3RvcnkuIFRoaXMgaGFwcGVucyBtb3N0XG4gICAqIGZyZXF1ZW50bHkgd2l0aCBgdXJsVXBkYXRlU3RyYXRlZ3k6ICdlYWdlcidgIGFuZCBuYXZpZ2F0aW9ucyB3aXRoIHRoZSBicm93c2VyIGJhY2svZm9yd2FyZFxuICAgKiBidXR0b25zLlxuICAgKlxuICAgKiAnY29tcHV0ZWQnIC0gV2lsbCBhdHRlbXB0IHRvIHJldHVybiB0byB0aGUgc2FtZSBpbmRleCBpbiB0aGUgc2Vzc2lvbiBoaXN0b3J5IHRoYXQgY29ycmVzcG9uZHNcbiAgICogdG8gdGhlIEFuZ3VsYXIgcm91dGUgd2hlbiB0aGUgbmF2aWdhdGlvbiBnZXRzIGNhbmNlbGxlZC4gRm9yIGV4YW1wbGUsIGlmIHRoZSBicm93c2VyIGJhY2tcbiAgICogYnV0dG9uIGlzIGNsaWNrZWQgYW5kIHRoZSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGxlZCwgdGhlIFJvdXRlciB3aWxsIHRyaWdnZXIgYSBmb3J3YXJkIG5hdmlnYXRpb25cbiAgICogYW5kIHZpY2UgdmVyc2EuXG4gICAqXG4gICAqIE5vdGU6IHRoZSAnY29tcHV0ZWQnIG9wdGlvbiBpcyBpbmNvbXBhdGlibGUgd2l0aCBhbnkgYFVybEhhbmRsaW5nU3RyYXRlZ3lgIHdoaWNoIG9ubHlcbiAgICogaGFuZGxlcyBhIHBvcnRpb24gb2YgdGhlIFVSTCBiZWNhdXNlIHRoZSBoaXN0b3J5IHJlc3RvcmF0aW9uIG5hdmlnYXRlcyB0byB0aGUgcHJldmlvdXMgcGxhY2UgaW5cbiAgICogdGhlIGJyb3dzZXIgaGlzdG9yeSByYXRoZXIgdGhhbiBzaW1wbHkgcmVzZXR0aW5nIGEgcG9ydGlvbiBvZiB0aGUgVVJMLlxuICAgKlxuICAgKiBUaGUgZGVmYXVsdCB2YWx1ZSBpcyBgcmVwbGFjZWAuXG4gICAqXG4gICAqL1xuICBjYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uOiAncmVwbGFjZSd8J2NvbXB1dGVkJyA9ICdyZXBsYWNlJztcblxuICAvKipcbiAgICogQ3JlYXRlcyB0aGUgcm91dGVyIHNlcnZpY2UuXG4gICAqL1xuICAvLyBUT0RPOiB2c2F2a2luIG1ha2UgaW50ZXJuYWwgYWZ0ZXIgdGhlIGZpbmFsIGlzIG91dC5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT58bnVsbCwgcHJpdmF0ZSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgICAgcHJpdmF0ZSByb290Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIHByaXZhdGUgbG9jYXRpb246IExvY2F0aW9uLCBpbmplY3RvcjogSW5qZWN0b3IsXG4gICAgICBjb21waWxlcjogQ29tcGlsZXIsIHB1YmxpYyBjb25maWc6IFJvdXRlcykge1xuICAgIGNvbnN0IG9uTG9hZFN0YXJ0ID0gKHI6IFJvdXRlKSA9PiB0aGlzLnRyaWdnZXJFdmVudChuZXcgUm91dGVDb25maWdMb2FkU3RhcnQocikpO1xuICAgIGNvbnN0IG9uTG9hZEVuZCA9IChyOiBSb3V0ZSkgPT4gdGhpcy50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZEVuZChyKSk7XG4gICAgdGhpcy5jb25maWdMb2FkZXIgPSBpbmplY3Rvci5nZXQoUm91dGVyQ29uZmlnTG9hZGVyKTtcbiAgICB0aGlzLmNvbmZpZ0xvYWRlci5vbkxvYWRFbmRMaXN0ZW5lciA9IG9uTG9hZEVuZDtcbiAgICB0aGlzLmNvbmZpZ0xvYWRlci5vbkxvYWRTdGFydExpc3RlbmVyID0gb25Mb2FkU3RhcnQ7XG5cbiAgICB0aGlzLm5nTW9kdWxlID0gaW5qZWN0b3IuZ2V0KE5nTW9kdWxlUmVmKTtcbiAgICB0aGlzLmNvbnNvbGUgPSBpbmplY3Rvci5nZXQoQ29uc29sZSk7XG4gICAgY29uc3Qgbmdab25lID0gaW5qZWN0b3IuZ2V0KE5nWm9uZSk7XG4gICAgdGhpcy5pc05nWm9uZUVuYWJsZWQgPSBuZ1pvbmUgaW5zdGFuY2VvZiBOZ1pvbmUgJiYgTmdab25lLmlzSW5Bbmd1bGFyWm9uZSgpO1xuXG4gICAgdGhpcy5yZXNldENvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSBjcmVhdGVFbXB0eVVybFRyZWUoKTtcbiAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLmN1cnJlbnRVcmxUcmVlO1xuICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0aGlzLmN1cnJlbnRVcmxUcmVlO1xuXG4gICAgdGhpcy5yb3V0ZXJTdGF0ZSA9IGNyZWF0ZUVtcHR5U3RhdGUodGhpcy5jdXJyZW50VXJsVHJlZSwgdGhpcy5yb290Q29tcG9uZW50VHlwZSk7XG5cbiAgICB0aGlzLnRyYW5zaXRpb25zID0gbmV3IEJlaGF2aW9yU3ViamVjdDxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4oe1xuICAgICAgaWQ6IDAsXG4gICAgICB0YXJnZXRQYWdlSWQ6IDAsXG4gICAgICBjdXJyZW50VXJsVHJlZTogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIGN1cnJlbnRSYXdVcmw6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBleHRyYWN0ZWRVcmw6IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5leHRyYWN0KHRoaXMuY3VycmVudFVybFRyZWUpLFxuICAgICAgdXJsQWZ0ZXJSZWRpcmVjdHM6IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5leHRyYWN0KHRoaXMuY3VycmVudFVybFRyZWUpLFxuICAgICAgcmF3VXJsOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgZXh0cmFzOiB7fSxcbiAgICAgIHJlc29sdmU6IG51bGwsXG4gICAgICByZWplY3Q6IG51bGwsXG4gICAgICBwcm9taXNlOiBQcm9taXNlLnJlc29sdmUodHJ1ZSksXG4gICAgICBzb3VyY2U6ICdpbXBlcmF0aXZlJyxcbiAgICAgIHJlc3RvcmVkU3RhdGU6IG51bGwsXG4gICAgICBjdXJyZW50U25hcHNob3Q6IHRoaXMucm91dGVyU3RhdGUuc25hcHNob3QsXG4gICAgICB0YXJnZXRTbmFwc2hvdDogbnVsbCxcbiAgICAgIGN1cnJlbnRSb3V0ZXJTdGF0ZTogdGhpcy5yb3V0ZXJTdGF0ZSxcbiAgICAgIHRhcmdldFJvdXRlclN0YXRlOiBudWxsLFxuICAgICAgZ3VhcmRzOiB7Y2FuQWN0aXZhdGVDaGVja3M6IFtdLCBjYW5EZWFjdGl2YXRlQ2hlY2tzOiBbXX0sXG4gICAgICBndWFyZHNSZXN1bHQ6IG51bGwsXG4gICAgfSk7XG4gICAgdGhpcy5uYXZpZ2F0aW9ucyA9IHRoaXMuc2V0dXBOYXZpZ2F0aW9ucyh0aGlzLnRyYW5zaXRpb25zKTtcblxuICAgIHRoaXMucHJvY2Vzc05hdmlnYXRpb25zKCk7XG4gIH1cblxuICBwcml2YXRlIHNldHVwTmF2aWdhdGlvbnModHJhbnNpdGlvbnM6IE9ic2VydmFibGU8TmF2aWdhdGlvblRyYW5zaXRpb24+KTpcbiAgICAgIE9ic2VydmFibGU8TmF2aWdhdGlvblRyYW5zaXRpb24+IHtcbiAgICBjb25zdCBldmVudHNTdWJqZWN0ID0gKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KTtcbiAgICByZXR1cm4gdHJhbnNpdGlvbnMucGlwZShcbiAgICAgICAgICAgICAgIGZpbHRlcih0ID0+IHQuaWQgIT09IDApLFxuXG4gICAgICAgICAgICAgICAvLyBFeHRyYWN0IFVSTFxuICAgICAgICAgICAgICAgbWFwKHQgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgKHsuLi50LCBleHRyYWN0ZWRVcmw6IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5leHRyYWN0KHQucmF3VXJsKX0gYXNcbiAgICAgICAgICAgICAgICAgICAgICAgIE5hdmlnYXRpb25UcmFuc2l0aW9uKSksXG5cbiAgICAgICAgICAgICAgIC8vIFVzaW5nIHN3aXRjaE1hcCBzbyB3ZSBjYW5jZWwgZXhlY3V0aW5nIG5hdmlnYXRpb25zIHdoZW4gYSBuZXcgb25lIGNvbWVzIGluXG4gICAgICAgICAgICAgICBzd2l0Y2hNYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgIGxldCBjb21wbGV0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgbGV0IGVycm9yZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSB0aGUgTmF2aWdhdGlvbiBvYmplY3RcbiAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmF2aWdhdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZDogdC5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBpbml0aWFsVXJsOiB0LnJhd1VybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYWN0ZWRVcmw6IHQuZXh0cmFjdGVkVXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHRyaWdnZXI6IHQuc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhczogdC5leHRyYXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNOYXZpZ2F0aW9uOiB0aGlzLmxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbiA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsuLi50aGlzLmxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbiwgcHJldmlvdXNOYXZpZ2F0aW9uOiBudWxsfSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGxcbiAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgc3dpdGNoTWFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBicm93c2VyVXJsVHJlZSA9IHRoaXMuYnJvd3NlclVybFRyZWUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsVHJhbnNpdGlvbiA9ICF0aGlzLm5hdmlnYXRlZCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5leHRyYWN0ZWRVcmwudG9TdHJpbmcoKSAhPT0gYnJvd3NlclVybFRyZWUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5hdmlnYXRpb25zIHdoaWNoIHN1Y2NlZWQgb3Igb25lcyB3aGljaCBmYWlsIGFuZCBhcmUgY2xlYW5lZCB1cFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29ycmVjdGx5IHNob3VsZCByZXN1bHQgaW4gYGJyb3dzZXJVcmxUcmVlYCBhbmQgYGN1cnJlbnRVcmxUcmVlYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWF0Y2hpbmcuIElmIHRoaXMgaXMgbm90IHRoZSBjYXNlLCBhc3N1bWUgc29tZXRoaW5nIHdlbnQgd3JvbmcgYW5kIHRyeVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHJvY2Vzc2luZyB0aGUgVVJMIGFnYWluLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJvd3NlclVybFRyZWUgIT09IHRoaXMuY3VycmVudFVybFRyZWUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc0N1cnJlbnRVcmwgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMub25TYW1lVXJsTmF2aWdhdGlvbiA9PT0gJ3JlbG9hZCcgPyB0cnVlIDogdXJsVHJhbnNpdGlvbikgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5zaG91bGRQcm9jZXNzVXJsKHQucmF3VXJsKTtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9jZXNzQ3VycmVudFVybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZSBzb3VyY2Ugb2YgdGhlIG5hdmlnYXRpb24gaXMgZnJvbSBhIGJyb3dzZXIgZXZlbnQsIHRoZSBVUkwgaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhbHJlYWR5IHVwZGF0ZWQuIFdlIGFscmVhZHkgbmVlZCB0byBzeW5jIHRoZSBpbnRlcm5hbCBzdGF0ZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNCcm93c2VyVHJpZ2dlcmVkTmF2aWdhdGlvbih0LnNvdXJjZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0LmV4dHJhY3RlZFVybDtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpcmUgTmF2aWdhdGlvblN0YXJ0IGV2ZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gdGhpcy50cmFuc2l0aW9ucy5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuZXcgTmF2aWdhdGlvblN0YXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIHQuc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlc3RvcmVkU3RhdGUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHJhbnNpdGlvbiAhPT0gdGhpcy50cmFuc2l0aW9ucy5nZXRWYWx1ZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBkZWxheSBpcyByZXF1aXJlZCB0byBtYXRjaCBvbGQgYmVoYXZpb3IgdGhhdCBmb3JjZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuYXZpZ2F0aW9uIHRvIGFsd2F5cyBiZSBhc3luY1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFwcGx5UmVkaXJlY3RzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcGx5UmVkaXJlY3RzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZ01vZHVsZS5pbmplY3RvciwgdGhpcy5jb25maWdMb2FkZXIsIHRoaXMudXJsU2VyaWFsaXplcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnKSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGN1cnJlbnROYXZpZ2F0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGB1cmxBZnRlclJlZGlyZWN0c2AgaXMgZ3VhcmFudGVlZCB0byBiZSBzZXQgYWZ0ZXIgdGhpcyBwb2ludFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmF2aWdhdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnRoaXMuY3VycmVudE5hdmlnYXRpb24hLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxVcmw6IHQudXJsQWZ0ZXJSZWRpcmVjdHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWNvZ25pemVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjb2duaXplKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZ01vZHVsZS5pbmplY3RvciwgdGhpcy5yb290Q29tcG9uZW50VHlwZSwgdGhpcy5jb25maWcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVybFNlcmlhbGl6ZXIsIHRoaXMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVsYXRpdmVMaW5rUmVzb2x1dGlvbiksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIFVSTCBpZiBpbiBgZWFnZXJgIHVwZGF0ZSBtb2RlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0LmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmF3VXJsID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC51cmxBZnRlclJlZGlyZWN0cyEsIHQucmF3VXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHJhd1VybCwgdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJyb3dzZXJVcmxUcmVlID0gdC51cmxBZnRlclJlZGlyZWN0cyE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZSBSb3V0ZXNSZWNvZ25pemVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm91dGVzUmVjb2duaXplZCA9IG5ldyBSb3V0ZXNSZWNvZ25pemVkKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMhKSwgdC50YXJnZXRTbmFwc2hvdCEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChyb3V0ZXNSZWNvZ25pemVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NQcmV2aW91c1VybCA9IHVybFRyYW5zaXRpb24gJiYgdGhpcy5yYXdVcmxUcmVlICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5zaG91bGRQcm9jZXNzVXJsKHRoaXMucmF3VXJsVHJlZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgLyogV2hlbiB0aGUgY3VycmVudCBVUkwgc2hvdWxkbid0IGJlIHByb2Nlc3NlZCwgYnV0IHRoZSBwcmV2aW91cyBvbmUgd2FzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAqIHdlIGhhbmRsZSB0aGlzIFwiZXJyb3IgY29uZGl0aW9uXCIgYnkgbmF2aWdhdGluZyB0byB0aGUgcHJldmlvdXNseVxuICAgICAgICAgICAgICAgICAgICAgICAgICAqIHN1Y2Nlc3NmdWwgVVJMLCBidXQgbGVhdmluZyB0aGUgVVJMIGludGFjdC4qL1xuICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9jZXNzUHJldmlvdXNVcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHtpZCwgZXh0cmFjdGVkVXJsLCBzb3VyY2UsIHJlc3RvcmVkU3RhdGUsIGV4dHJhc30gPSB0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmF2U3RhcnQgPSBuZXcgTmF2aWdhdGlvblN0YXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkLCB0aGlzLnNlcmlhbGl6ZVVybChleHRyYWN0ZWRVcmwpLCBzb3VyY2UsIHJlc3RvcmVkU3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdlN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFNuYXBzaG90ID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVFbXB0eVN0YXRlKGV4dHJhY3RlZFVybCwgdGhpcy5yb290Q29tcG9uZW50VHlwZSkuc25hcHNob3Q7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvZih7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFNuYXBzaG90LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmxBZnRlclJlZGlyZWN0czogZXh0cmFjdGVkVXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYXM6IHsuLi5leHRyYXMsIHNraXBMb2NhdGlvbkNoYW5nZTogZmFsc2UsIHJlcGxhY2VVcmw6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBXaGVuIG5laXRoZXIgdGhlIGN1cnJlbnQgb3IgcHJldmlvdXMgVVJMIGNhbiBiZSBwcm9jZXNzZWQsIGRvIG5vdGhpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIG90aGVyIHRoYW4gdXBkYXRlIHJvdXRlcidzIGludGVybmFsIHJlZmVyZW5jZSB0byB0aGUgY3VycmVudCBcInNldHRsZWRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICogVVJMLiBUaGlzIHdheSB0aGUgbmV4dCBuYXZpZ2F0aW9uIHdpbGwgYmUgY29taW5nIGZyb20gdGhlIGN1cnJlbnQgVVJMXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBpbiB0aGUgYnJvd3Nlci5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yYXdVcmxUcmVlID0gdC5yYXdVcmw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlc29sdmUobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gLS0tIEdVQVJEUyAtLS1cbiAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZ3VhcmRzU3RhcnQgPSBuZXcgR3VhcmRzQ2hlY2tTdGFydChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMhKSwgdC50YXJnZXRTbmFwc2hvdCEpO1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChndWFyZHNTdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgbWFwKHQgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBndWFyZHM6IGdldEFsbFJvdXRlR3VhcmRzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQudGFyZ2V0U25hcHNob3QhLCB0LmN1cnJlbnRTbmFwc2hvdCwgdGhpcy5yb290Q29udGV4dHMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgfSkpLFxuXG4gICAgICAgICAgICAgICAgICAgICBjaGVja0d1YXJkcyh0aGlzLm5nTW9kdWxlLmluamVjdG9yLCAoZXZ0OiBFdmVudCkgPT4gdGhpcy50cmlnZ2VyRXZlbnQoZXZ0KSksXG4gICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGlmIChpc1VybFRyZWUodC5ndWFyZHNSZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3I6IEVycm9yJnt1cmw/OiBVcmxUcmVlfSA9IG5hdmlnYXRpb25DYW5jZWxpbmdFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUkVESVJFQ1RJTkdfQ0FOQ0VMTEFUSU9OX1JFQVNPTiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBcIiR7dGhpcy5zZXJpYWxpemVVcmwodC5ndWFyZHNSZXN1bHQpfVwiYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IudXJsID0gdC5ndWFyZHNSZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBndWFyZHNFbmQgPSBuZXcgR3VhcmRzQ2hlY2tFbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzISksIHQudGFyZ2V0U25hcHNob3QhLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgISF0Lmd1YXJkc1Jlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KGd1YXJkc0VuZCk7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgZmlsdGVyKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXQuZ3VhcmRzUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXN0b3JlSGlzdG9yeSh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbE5hdmlnYXRpb25UcmFuc2l0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LCAnJywgTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuR3VhcmRSZWplY3RlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIC0tLSBSRVNPTFZFIC0tLVxuICAgICAgICAgICAgICAgICAgICAgc3dpdGNoVGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAodC5ndWFyZHMuY2FuQWN0aXZhdGVDaGVja3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlU3RhcnQgPSBuZXcgUmVzb2x2ZVN0YXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMhKSwgdC50YXJnZXRTbmFwc2hvdCEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KHJlc29sdmVTdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2hNYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGFSZXNvbHZlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvZih0KS5waXBlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlRGF0YShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSwgdGhpcy5uZ01vZHVsZS5pbmplY3RvciksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dDogKCkgPT4gZGF0YVJlc29sdmVkID0gdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhUmVzb2x2ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXN0b3JlSGlzdG9yeSh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5jZWxOYXZpZ2F0aW9uVHJhbnNpdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBOR19ERVZfTU9ERSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYEF0IGxlYXN0IG9uZSByb3V0ZSByZXNvbHZlciBkaWRuJ3QgZW1pdCBhbnkgdmFsdWUuYCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZS5Ob0RhdGFGcm9tUmVzb2x2ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlRW5kID0gbmV3IFJlc29sdmVFbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVVcmwodC51cmxBZnRlclJlZGlyZWN0cyEpLCB0LnRhcmdldFNuYXBzaG90ISk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQocmVzb2x2ZUVuZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIC0tLSBMT0FEIENPTVBPTkVOVFMgLS0tXG4gICAgICAgICAgICAgICAgICAgICBzd2l0Y2hUYXAoKHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvYWRDb21wb25lbnRzID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIChyb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IEFycmF5PE9ic2VydmFibGU8dm9pZD4+ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbG9hZGVyczogQXJyYXk8T2JzZXJ2YWJsZTx2b2lkPj4gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvdXRlLnJvdXRlQ29uZmlnPy5sb2FkQ29tcG9uZW50ICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAhcm91dGUucm91dGVDb25maWcuX2xvYWRlZENvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRlcnMucHVzaCh0aGlzLmNvbmZpZ0xvYWRlci5sb2FkQ29tcG9uZW50KHJvdXRlLnJvdXRlQ29uZmlnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFwKGxvYWRlZENvbXBvbmVudCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3V0ZS5jb21wb25lbnQgPSBsb2FkZWRDb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFwKCgpID0+IHZvaWQgMCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiByb3V0ZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRlcnMucHVzaCguLi5sb2FkQ29tcG9uZW50cyhjaGlsZCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsb2FkZXJzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbWJpbmVMYXRlc3QobG9hZENvbXBvbmVudHModC50YXJnZXRTbmFwc2hvdCEucm9vdCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAucGlwZShkZWZhdWx0SWZFbXB0eSgpLCB0YWtlKDEpKTtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICBzd2l0Y2hUYXAoKCkgPT4gdGhpcy5hZnRlclByZWFjdGl2YXRpb24oKSksXG5cbiAgICAgICAgICAgICAgICAgICAgIG1hcCgodDogTmF2aWdhdGlvblRyYW5zaXRpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0Um91dGVyU3RhdGUgPSBjcmVhdGVSb3V0ZXJTdGF0ZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LCB0LnRhcmdldFNuYXBzaG90ISwgdC5jdXJyZW50Um91dGVyU3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKHsuLi50LCB0YXJnZXRSb3V0ZXJTdGF0ZX0pO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8qIE9uY2UgaGVyZSwgd2UgYXJlIGFib3V0IHRvIGFjdGl2YXRlIHN5bmNyb25vdXNseS4gVGhlIGFzc3VtcHRpb24gaXMgdGhpc1xuICAgICAgICAgICAgICAgICAgICAgICAgd2lsbCBzdWNjZWVkLCBhbmQgdXNlciBjb2RlIG1heSByZWFkIGZyb20gdGhlIFJvdXRlciBzZXJ2aWNlLiBUaGVyZWZvcmVcbiAgICAgICAgICAgICAgICAgICAgICAgIGJlZm9yZSBhY3RpdmF0aW9uLCB3ZSBuZWVkIHRvIHVwZGF0ZSByb3V0ZXIgcHJvcGVydGllcyBzdG9yaW5nIHRoZSBjdXJyZW50XG4gICAgICAgICAgICAgICAgICAgICAgICBVUkwgYW5kIHRoZSBSb3V0ZXJTdGF0ZSwgYXMgd2VsbCBhcyB1cGRhdGVkIHRoZSBicm93c2VyIFVSTC4gQWxsIHRoaXMgc2hvdWxkXG4gICAgICAgICAgICAgICAgICAgICAgICBoYXBwZW4gKmJlZm9yZSogYWN0aXZhdGluZy4gKi9cbiAgICAgICAgICAgICAgICAgICAgIHRhcCgodDogTmF2aWdhdGlvblRyYW5zaXRpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IHQudXJsQWZ0ZXJSZWRpcmVjdHMhO1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJhd1VybFRyZWUgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHQudXJsQWZ0ZXJSZWRpcmVjdHMhLCB0LnJhd1VybCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMge3JvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZX0pLnJvdXRlclN0YXRlID0gdC50YXJnZXRSb3V0ZXJTdGF0ZSE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdkZWZlcnJlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXQuZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHRoaXMucmF3VXJsVHJlZSwgdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0LnVybEFmdGVyUmVkaXJlY3RzITtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIGFjdGl2YXRlUm91dGVzKFxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9vdENvbnRleHRzLCB0aGlzLnJvdXRlUmV1c2VTdHJhdGVneSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAoZXZ0OiBFdmVudCkgPT4gdGhpcy50cmlnZ2VyRXZlbnQoZXZ0KSksXG5cbiAgICAgICAgICAgICAgICAgICAgIHRhcCh7XG4gICAgICAgICAgICAgICAgICAgICAgIG5leHQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgY29tcGxldGUoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICBmaW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIC8qIFdoZW4gdGhlIG5hdmlnYXRpb24gc3RyZWFtIGZpbmlzaGVzIGVpdGhlciB0aHJvdWdoIGVycm9yIG9yIHN1Y2Nlc3MsIHdlXG4gICAgICAgICAgICAgICAgICAgICAgICAqIHNldCB0aGUgYGNvbXBsZXRlZGAgb3IgYGVycm9yZWRgIGZsYWcuIEhvd2V2ZXIsIHRoZXJlIGFyZSBzb21lIHNpdHVhdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgICogd2hlcmUgd2UgY291bGQgZ2V0IGhlcmUgd2l0aG91dCBlaXRoZXIgb2YgdGhvc2UgYmVpbmcgc2V0LiBGb3IgaW5zdGFuY2UsIGFcbiAgICAgICAgICAgICAgICAgICAgICAgICogcmVkaXJlY3QgZHVyaW5nIE5hdmlnYXRpb25TdGFydC4gVGhlcmVmb3JlLCB0aGlzIGlzIGEgY2F0Y2gtYWxsIHRvIG1ha2VcbiAgICAgICAgICAgICAgICAgICAgICAgICogc3VyZSB0aGUgTmF2aWdhdGlvbkNhbmNlbFxuICAgICAgICAgICAgICAgICAgICAgICAgKiBldmVudCBpcyBmaXJlZCB3aGVuIGEgbmF2aWdhdGlvbiBnZXRzIGNhbmNlbGxlZCBidXQgbm90IGNhdWdodCBieSBvdGhlclxuICAgICAgICAgICAgICAgICAgICAgICAgKiBtZWFucy4gKi9cbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjb21wbGV0ZWQgJiYgIWVycm9yZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjYW5jZWxhdGlvblJlYXNvbiA9IE5HX0RFVl9NT0RFID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYE5hdmlnYXRpb24gSUQgJHt0LmlkfSBpcyBub3QgZXF1YWwgdG8gdGhlIGN1cnJlbnQgbmF2aWdhdGlvbiBpZCAke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uYXZpZ2F0aW9uSWR9YCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsTmF2aWdhdGlvblRyYW5zaXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQsIGNhbmNlbGF0aW9uUmVhc29uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZS5TdXBlcnNlZGVkQnlOZXdOYXZpZ2F0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IGNsZWFyIGN1cnJlbnQgbmF2aWdhdGlvbiBpZiBpdCBpcyBzdGlsbCBzZXQgdG8gdGhlIG9uZSB0aGF0XG4gICAgICAgICAgICAgICAgICAgICAgIC8vIGZpbmFsaXplZC5cbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudE5hdmlnYXRpb24/LmlkID09PSB0LmlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmF2aWdhdGlvbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgY2F0Y2hFcnJvcigoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAvLyBUT0RPKGF0c2NvdHQpOiBUaGUgTmF2aWdhdGlvblRyYW5zaXRpb24gYHRgIHVzZWQgaGVyZSBkb2VzIG5vdCBhY2N1cmF0ZWx5XG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHJlZmxlY3QgdGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIHdob2xlIHRyYW5zaXRpb24gYmVjYXVzZSBzb21lIG9wZXJhdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gcmV0dXJuIGEgbmV3IG9iamVjdCByYXRoZXIgdGhhbiBtb2RpZnlpbmcgdGhlIG9uZSBpbiB0aGUgb3V0ZXJtb3N0XG4gICAgICAgICAgICAgICAgICAgICAgIC8vIGBzd2l0Y2hNYXBgLlxuICAgICAgICAgICAgICAgICAgICAgICAvLyAgVGhlIGZpeCBjYW4gbGlrZWx5IGJlIHRvOlxuICAgICAgICAgICAgICAgICAgICAgICAvLyAgMS4gUmVuYW1lIHRoZSBvdXRlciBgdGAgdmFyaWFibGUgc28gaXQncyBub3Qgc2hhZG93ZWQgYWxsIHRoZSB0aW1lIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAvLyAgY29uZnVzaW5nXG4gICAgICAgICAgICAgICAgICAgICAgIC8vICAyLiBLZWVwIHJlYXNzaWduaW5nIHRvIHRoZSBvdXRlciB2YXJpYWJsZSBhZnRlciBlYWNoIHN0YWdlIHRvIGVuc3VyZSBpdFxuICAgICAgICAgICAgICAgICAgICAgICAvLyAgZ2V0cyB1cGRhdGVkLiBPciBjaGFuZ2UgdGhlIGltcGxlbWVudGF0aW9ucyB0byBub3QgcmV0dXJuIGEgY29weS5cbiAgICAgICAgICAgICAgICAgICAgICAgLy8gTm90IGNoYW5nZWQgeWV0IGJlY2F1c2UgaXQgYWZmZWN0cyBleGlzdGluZyBjb2RlIGFuZCB3b3VsZCBuZWVkIHRvIGJlXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHRlc3RlZCBtb3JlIHRob3JvdWdobHkuXG4gICAgICAgICAgICAgICAgICAgICAgIGVycm9yZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAvKiBUaGlzIGVycm9yIHR5cGUgaXMgaXNzdWVkIGR1cmluZyBSZWRpcmVjdCwgYW5kIGlzIGhhbmRsZWQgYXMgYVxuICAgICAgICAgICAgICAgICAgICAgICAgKiBjYW5jZWxsYXRpb24gcmF0aGVyIHRoYW4gYW4gZXJyb3IuICovXG4gICAgICAgICAgICAgICAgICAgICAgIGlmIChpc05hdmlnYXRpb25DYW5jZWxpbmdFcnJvcihlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlZGlyZWN0aW5nID0gaXNVcmxUcmVlKGUudXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJlZGlyZWN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgcHJvcGVydHkgb25seSBpZiB3ZSdyZSBub3QgcmVkaXJlY3RpbmcuIElmIHdlIGxhbmRlZCBvbiBhIHBhZ2UgYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZWRpcmVjdCB0byBgL2Agcm91dGUsIHRoZSBuZXcgbmF2aWdhdGlvbiBpcyBnb2luZyB0byBzZWUgdGhlIGAvYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaXNuJ3QgYSBjaGFuZ2UgZnJvbSB0aGUgZGVmYXVsdCBjdXJyZW50VXJsVHJlZSBhbmQgd29uJ3QgbmF2aWdhdGUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIG9ubHkgYXBwbGljYWJsZSB3aXRoIGluaXRpYWwgbmF2aWdhdGlvbiwgc28gc2V0dGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYG5hdmlnYXRlZGAgb25seSB3aGVuIG5vdCByZWRpcmVjdGluZyByZXNvbHZlcyB0aGlzIHNjZW5hcmlvLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uYXZpZ2F0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXN0b3JlSGlzdG9yeSh0LCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmF2Q2FuY2VsID0gbmV3IE5hdmlnYXRpb25DYW5jZWwoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgZS5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZS5SZWRpcmVjdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdkNhbmNlbCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIHJlZGlyZWN0aW5nLCB3ZSBuZWVkIHRvIGRlbGF5IHJlc29sdmluZyB0aGUgbmF2aWdhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHByb21pc2UgYW5kIHB1c2ggaXQgdG8gdGhlIHJlZGlyZWN0IG5hdmlnYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJlZGlyZWN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlc29sdmUoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXJnZWRUcmVlID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UoZS51cmwsIHRoaXMucmF3VXJsVHJlZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHRyYXMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNraXBMb2NhdGlvbkNoYW5nZTogdC5leHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgVVJMIGlzIGFscmVhZHkgdXBkYXRlZCBhdCB0aGlzIHBvaW50IGlmIHdlIGhhdmUgJ2VhZ2VyJyBVUkxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlcyBvciBpZiB0aGUgbmF2aWdhdGlvbiB3YXMgdHJpZ2dlcmVkIGJ5IHRoZSBicm93c2VyIChiYWNrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJ1dHRvbiwgVVJMIGJhciwgZXRjKS4gV2Ugd2FudCB0byByZXBsYWNlIHRoYXQgaXRlbSBpbiBoaXN0b3J5IGlmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBuYXZpZ2F0aW9uIGlzIHJlamVjdGVkLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlVXJsOiB0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZWFnZXInIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0Jyb3dzZXJUcmlnZ2VyZWROYXZpZ2F0aW9uKHQuc291cmNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVyZ2VkVHJlZSwgJ2ltcGVyYXRpdmUnLCBudWxsLCBleHRyYXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3Jlc29sdmU6IHQucmVzb2x2ZSwgcmVqZWN0OiB0LnJlamVjdCwgcHJvbWlzZTogdC5wcm9taXNlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgLyogQWxsIG90aGVyIGVycm9ycyBzaG91bGQgcmVzZXQgdG8gdGhlIHJvdXRlcidzIGludGVybmFsIFVSTCByZWZlcmVuY2UgdG9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgKiB0aGUgcHJlLWVycm9yIHN0YXRlLiAqL1xuICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZUhpc3RvcnkodCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmF2RXJyb3IgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgTmF2aWdhdGlvbkVycm9yKHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdkVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKHRoaXMuZXJyb3JIYW5kbGVyKGUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5yZWplY3QoZWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgIC8vIFRPRE8oamFzb25hZGVuKTogcmVtb3ZlIGNhc3Qgb25jZSBnMyBpcyBvbiB1cGRhdGVkIFR5cGVTY3JpcHRcbiAgICAgICAgICAgICAgIH0pKSBhcyBhbnkgYXMgT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj47XG4gIH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIFRPRE86IHRoaXMgc2hvdWxkIGJlIHJlbW92ZWQgb25jZSB0aGUgY29uc3RydWN0b3Igb2YgdGhlIHJvdXRlciBtYWRlIGludGVybmFsXG4gICAqL1xuICByZXNldFJvb3RDb21wb25lbnRUeXBlKHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT4pOiB2b2lkIHtcbiAgICB0aGlzLnJvb3RDb21wb25lbnRUeXBlID0gcm9vdENvbXBvbmVudFR5cGU7XG4gICAgLy8gVE9ETzogdnNhdmtpbiByb3V0ZXIgNC4wIHNob3VsZCBtYWtlIHRoZSByb290IGNvbXBvbmVudCBzZXQgdG8gbnVsbFxuICAgIC8vIHRoaXMgd2lsbCBzaW1wbGlmeSB0aGUgbGlmZWN5Y2xlIG9mIHRoZSByb3V0ZXIuXG4gICAgdGhpcy5yb3V0ZXJTdGF0ZS5yb290LmNvbXBvbmVudCA9IHRoaXMucm9vdENvbXBvbmVudFR5cGU7XG4gIH1cblxuICBwcml2YXRlIHNldFRyYW5zaXRpb24odDogUGFydGlhbDxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4pOiB2b2lkIHtcbiAgICB0aGlzLnRyYW5zaXRpb25zLm5leHQoey4uLnRoaXMudHJhbnNpdGlvbnMudmFsdWUsIC4uLnR9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHVwIHRoZSBsb2NhdGlvbiBjaGFuZ2UgbGlzdGVuZXIgYW5kIHBlcmZvcm1zIHRoZSBpbml0aWFsIG5hdmlnYXRpb24uXG4gICAqL1xuICBpbml0aWFsTmF2aWdhdGlvbigpOiB2b2lkIHtcbiAgICB0aGlzLnNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpO1xuICAgIGlmICh0aGlzLm5hdmlnYXRpb25JZCA9PT0gMCkge1xuICAgICAgdGhpcy5uYXZpZ2F0ZUJ5VXJsKHRoaXMubG9jYXRpb24ucGF0aCh0cnVlKSwge3JlcGxhY2VVcmw6IHRydWV9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyLiBUaGlzIGxpc3RlbmVyIGRldGVjdHMgbmF2aWdhdGlvbnMgdHJpZ2dlcmVkIGZyb20gb3V0c2lkZVxuICAgKiB0aGUgUm91dGVyICh0aGUgYnJvd3NlciBiYWNrL2ZvcndhcmQgYnV0dG9ucywgZm9yIGV4YW1wbGUpIGFuZCBzY2hlZHVsZXMgYSBjb3JyZXNwb25kaW5nIFJvdXRlclxuICAgKiBuYXZpZ2F0aW9uIHNvIHRoYXQgdGhlIGNvcnJlY3QgZXZlbnRzLCBndWFyZHMsIGV0Yy4gYXJlIHRyaWdnZXJlZC5cbiAgICovXG4gIHNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpOiB2b2lkIHtcbiAgICAvLyBEb24ndCBuZWVkIHRvIHVzZSBab25lLndyYXAgYW55IG1vcmUsIGJlY2F1c2Ugem9uZS5qc1xuICAgIC8vIGFscmVhZHkgcGF0Y2ggb25Qb3BTdGF0ZSwgc28gbG9jYXRpb24gY2hhbmdlIGNhbGxiYWNrIHdpbGxcbiAgICAvLyBydW4gaW50byBuZ1pvbmVcbiAgICBpZiAoIXRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24gPSB0aGlzLmxvY2F0aW9uLnN1YnNjcmliZShldmVudCA9PiB7XG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IGV2ZW50Wyd0eXBlJ10gPT09ICdwb3BzdGF0ZScgPyAncG9wc3RhdGUnIDogJ2hhc2hjaGFuZ2UnO1xuICAgICAgICBpZiAoc291cmNlID09PSAncG9wc3RhdGUnKSB7XG4gICAgICAgICAgLy8gVGhlIGBzZXRUaW1lb3V0YCB3YXMgYWRkZWQgaW4gIzEyMTYwIGFuZCBpcyBsaWtlbHkgdG8gc3VwcG9ydCBBbmd1bGFyL0FuZ3VsYXJKU1xuICAgICAgICAgIC8vIGh5YnJpZCBhcHBzLlxuICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3JlcGxhY2VVcmw6IHRydWV9O1xuICAgICAgICAgICAgLy8gTmF2aWdhdGlvbnMgY29taW5nIGZyb20gQW5ndWxhciByb3V0ZXIgaGF2ZSBhIG5hdmlnYXRpb25JZCBzdGF0ZVxuICAgICAgICAgICAgLy8gcHJvcGVydHkuIFdoZW4gdGhpcyBleGlzdHMsIHJlc3RvcmUgdGhlIHN0YXRlLlxuICAgICAgICAgICAgY29uc3Qgc3RhdGUgPSBldmVudC5zdGF0ZT8ubmF2aWdhdGlvbklkID8gZXZlbnQuc3RhdGUgOiBudWxsO1xuICAgICAgICAgICAgaWYgKHN0YXRlKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHN0YXRlQ29weSA9IHsuLi5zdGF0ZX0gYXMgUGFydGlhbDxSZXN0b3JlZFN0YXRlPjtcbiAgICAgICAgICAgICAgZGVsZXRlIHN0YXRlQ29weS5uYXZpZ2F0aW9uSWQ7XG4gICAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZUNvcHkuybVyb3V0ZXJQYWdlSWQ7XG4gICAgICAgICAgICAgIGlmIChPYmplY3Qua2V5cyhzdGF0ZUNvcHkpLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGV4dHJhcy5zdGF0ZSA9IHN0YXRlQ29weTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgdXJsVHJlZSA9IHRoaXMucGFyc2VVcmwoZXZlbnRbJ3VybCddISk7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbih1cmxUcmVlLCBzb3VyY2UsIHN0YXRlLCBleHRyYXMpO1xuICAgICAgICAgIH0sIDApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKiogVGhlIGN1cnJlbnQgVVJMLiAqL1xuICBnZXQgdXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuc2VyaWFsaXplVXJsKHRoaXMuY3VycmVudFVybFRyZWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGN1cnJlbnQgYE5hdmlnYXRpb25gIG9iamVjdCB3aGVuIHRoZSByb3V0ZXIgaXMgbmF2aWdhdGluZyxcbiAgICogYW5kIGBudWxsYCB3aGVuIGlkbGUuXG4gICAqL1xuICBnZXRDdXJyZW50TmF2aWdhdGlvbigpOiBOYXZpZ2F0aW9ufG51bGwge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICB0cmlnZ2VyRXZlbnQoZXZlbnQ6IEV2ZW50KTogdm9pZCB7XG4gICAgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KS5uZXh0KGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNldHMgdGhlIHJvdXRlIGNvbmZpZ3VyYXRpb24gdXNlZCBmb3IgbmF2aWdhdGlvbiBhbmQgZ2VuZXJhdGluZyBsaW5rcy5cbiAgICpcbiAgICogQHBhcmFtIGNvbmZpZyBUaGUgcm91dGUgYXJyYXkgZm9yIHRoZSBuZXcgY29uZmlndXJhdGlvbi5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5yZXNldENvbmZpZyhbXG4gICAqICB7IHBhdGg6ICd0ZWFtLzppZCcsIGNvbXBvbmVudDogVGVhbUNtcCwgY2hpbGRyZW46IFtcbiAgICogICAgeyBwYXRoOiAnc2ltcGxlJywgY29tcG9uZW50OiBTaW1wbGVDbXAgfSxcbiAgICogICAgeyBwYXRoOiAndXNlci86bmFtZScsIGNvbXBvbmVudDogVXNlckNtcCB9XG4gICAqICBdfVxuICAgKiBdKTtcbiAgICogYGBgXG4gICAqL1xuICByZXNldENvbmZpZyhjb25maWc6IFJvdXRlcyk6IHZvaWQge1xuICAgIE5HX0RFVl9NT0RFICYmIHZhbGlkYXRlQ29uZmlnKGNvbmZpZyk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWcubWFwKHN0YW5kYXJkaXplQ29uZmlnKTtcbiAgICB0aGlzLm5hdmlnYXRlZCA9IGZhbHNlO1xuICAgIHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCA9IC0xO1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLmRpc3Bvc2UoKTtcbiAgfVxuXG4gIC8qKiBEaXNwb3NlcyBvZiB0aGUgcm91dGVyLiAqL1xuICBkaXNwb3NlKCk6IHZvaWQge1xuICAgIHRoaXMudHJhbnNpdGlvbnMuY29tcGxldGUoKTtcbiAgICBpZiAodGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbiA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdGhpcy5kaXNwb3NlZCA9IHRydWU7XG4gIH1cblxuICAvKipcbiAgICogQXBwZW5kcyBVUkwgc2VnbWVudHMgdG8gdGhlIGN1cnJlbnQgVVJMIHRyZWUgdG8gY3JlYXRlIGEgbmV3IFVSTCB0cmVlLlxuICAgKlxuICAgKiBAcGFyYW0gY29tbWFuZHMgQW4gYXJyYXkgb2YgVVJMIGZyYWdtZW50cyB3aXRoIHdoaWNoIHRvIGNvbnN0cnVjdCB0aGUgbmV3IFVSTCB0cmVlLlxuICAgKiBJZiB0aGUgcGF0aCBpcyBzdGF0aWMsIGNhbiBiZSB0aGUgbGl0ZXJhbCBVUkwgc3RyaW5nLiBGb3IgYSBkeW5hbWljIHBhdGgsIHBhc3MgYW4gYXJyYXkgb2YgcGF0aFxuICAgKiBzZWdtZW50cywgZm9sbG93ZWQgYnkgdGhlIHBhcmFtZXRlcnMgZm9yIGVhY2ggc2VnbWVudC5cbiAgICogVGhlIGZyYWdtZW50cyBhcmUgYXBwbGllZCB0byB0aGUgY3VycmVudCBVUkwgdHJlZSBvciB0aGUgb25lIHByb3ZpZGVkICBpbiB0aGUgYHJlbGF0aXZlVG9gXG4gICAqIHByb3BlcnR5IG9mIHRoZSBvcHRpb25zIG9iamVjdCwgaWYgc3VwcGxpZWQuXG4gICAqIEBwYXJhbSBuYXZpZ2F0aW9uRXh0cmFzIE9wdGlvbnMgdGhhdCBjb250cm9sIHRoZSBuYXZpZ2F0aW9uIHN0cmF0ZWd5LlxuICAgKiBAcmV0dXJucyBUaGUgbmV3IFVSTCB0cmVlLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBgYGBcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCAndXNlcicsIDExXSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMztleHBhbmQ9dHJ1ZS91c2VyLzExXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge2V4cGFuZDogdHJ1ZX0sICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8geW91IGNhbiBjb2xsYXBzZSBzdGF0aWMgc2VnbWVudHMgbGlrZSB0aGlzICh0aGlzIHdvcmtzIG9ubHkgd2l0aCB0aGUgZmlyc3QgcGFzc2VkLWluIHZhbHVlKTpcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbS8zMy91c2VyJywgdXNlcklkXSk7XG4gICAqXG4gICAqIC8vIElmIHRoZSBmaXJzdCBzZWdtZW50IGNhbiBjb250YWluIHNsYXNoZXMsIGFuZCB5b3UgZG8gbm90IHdhbnQgdGhlIHJvdXRlciB0byBzcGxpdCBpdCxcbiAgICogLy8geW91IGNhbiBkbyB0aGUgZm9sbG93aW5nOlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbe3NlZ21lbnRQYXRoOiAnL29uZS90d28nfV0pO1xuICAgKlxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvKHVzZXIvMTEvL3JpZ2h0OmNoYXQpXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiAnY2hhdCd9fV0pO1xuICAgKlxuICAgKiAvLyByZW1vdmUgdGhlIHJpZ2h0IHNlY29uZGFyeSBub2RlXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiBudWxsfX1dKTtcbiAgICpcbiAgICogLy8gYXNzdW1pbmcgdGhlIGN1cnJlbnQgdXJsIGlzIGAvdGVhbS8zMy91c2VyLzExYCBhbmQgdGhlIHJvdXRlIHBvaW50cyB0byBgdXNlci8xMWBcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8xMS9kZXRhaWxzXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnZGV0YWlscyddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8yMlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy4uLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS80NC91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vLi4vdGVhbS80NC91c2VyLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiBOb3RlIHRoYXQgYSB2YWx1ZSBvZiBgbnVsbGAgb3IgYHVuZGVmaW5lZGAgZm9yIGByZWxhdGl2ZVRvYCBpbmRpY2F0ZXMgdGhhdCB0aGVcbiAgICogdHJlZSBzaG91bGQgYmUgY3JlYXRlZCByZWxhdGl2ZSB0byB0aGUgcm9vdC5cbiAgICogYGBgXG4gICAqL1xuICBjcmVhdGVVcmxUcmVlKGNvbW1hbmRzOiBhbnlbXSwgbmF2aWdhdGlvbkV4dHJhczogVXJsQ3JlYXRpb25PcHRpb25zID0ge30pOiBVcmxUcmVlIHtcbiAgICBjb25zdCB7cmVsYXRpdmVUbywgcXVlcnlQYXJhbXMsIGZyYWdtZW50LCBxdWVyeVBhcmFtc0hhbmRsaW5nLCBwcmVzZXJ2ZUZyYWdtZW50fSA9XG4gICAgICAgIG5hdmlnYXRpb25FeHRyYXM7XG4gICAgY29uc3QgYSA9IHJlbGF0aXZlVG8gfHwgdGhpcy5yb3V0ZXJTdGF0ZS5yb290O1xuICAgIGNvbnN0IGYgPSBwcmVzZXJ2ZUZyYWdtZW50ID8gdGhpcy5jdXJyZW50VXJsVHJlZS5mcmFnbWVudCA6IGZyYWdtZW50O1xuICAgIGxldCBxOiBQYXJhbXN8bnVsbCA9IG51bGw7XG4gICAgc3dpdGNoIChxdWVyeVBhcmFtc0hhbmRsaW5nKSB7XG4gICAgICBjYXNlICdtZXJnZSc6XG4gICAgICAgIHEgPSB7Li4udGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcywgLi4ucXVlcnlQYXJhbXN9O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3ByZXNlcnZlJzpcbiAgICAgICAgcSA9IHRoaXMuY3VycmVudFVybFRyZWUucXVlcnlQYXJhbXM7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcSA9IHF1ZXJ5UGFyYW1zIHx8IG51bGw7XG4gICAgfVxuICAgIGlmIChxICE9PSBudWxsKSB7XG4gICAgICBxID0gdGhpcy5yZW1vdmVFbXB0eVByb3BzKHEpO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlVXJsVHJlZShhLCB0aGlzLmN1cnJlbnRVcmxUcmVlLCBjb21tYW5kcywgcSwgZiA/PyBudWxsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZXMgdG8gYSB2aWV3IHVzaW5nIGFuIGFic29sdXRlIHJvdXRlIHBhdGguXG4gICAqXG4gICAqIEBwYXJhbSB1cmwgQW4gYWJzb2x1dGUgcGF0aCBmb3IgYSBkZWZpbmVkIHJvdXRlLiBUaGUgZnVuY3Rpb24gZG9lcyBub3QgYXBwbHkgYW55IGRlbHRhIHRvIHRoZVxuICAgKiAgICAgY3VycmVudCBVUkwuXG4gICAqIEBwYXJhbSBleHRyYXMgQW4gb2JqZWN0IGNvbnRhaW5pbmcgcHJvcGVydGllcyB0aGF0IG1vZGlmeSB0aGUgbmF2aWdhdGlvbiBzdHJhdGVneS5cbiAgICpcbiAgICogQHJldHVybnMgQSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gJ3RydWUnIHdoZW4gbmF2aWdhdGlvbiBzdWNjZWVkcyxcbiAgICogdG8gJ2ZhbHNlJyB3aGVuIG5hdmlnYXRpb24gZmFpbHMsIG9yIGlzIHJlamVjdGVkIG9uIGVycm9yLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBUaGUgZm9sbG93aW5nIGNhbGxzIHJlcXVlc3QgbmF2aWdhdGlvbiB0byBhbiBhYnNvbHV0ZSBwYXRoLlxuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLm5hdmlnYXRlQnlVcmwoXCIvdGVhbS8zMy91c2VyLzExXCIpO1xuICAgKlxuICAgKiAvLyBOYXZpZ2F0ZSB3aXRob3V0IHVwZGF0aW5nIHRoZSBVUkxcbiAgICogcm91dGVyLm5hdmlnYXRlQnlVcmwoXCIvdGVhbS8zMy91c2VyLzExXCIsIHsgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKVxuICAgKlxuICAgKi9cbiAgbmF2aWdhdGVCeVVybCh1cmw6IHN0cmluZ3xVcmxUcmVlLCBleHRyYXM6IE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMgPSB7XG4gICAgc2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZVxuICB9KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8XG4gICAgICAgIG5nRGV2TW9kZSAmJiB0aGlzLmlzTmdab25lRW5hYmxlZCAmJiAhTmdab25lLmlzSW5Bbmd1bGFyWm9uZSgpKSB7XG4gICAgICB0aGlzLmNvbnNvbGUud2FybihcbiAgICAgICAgICBgTmF2aWdhdGlvbiB0cmlnZ2VyZWQgb3V0c2lkZSBBbmd1bGFyIHpvbmUsIGRpZCB5b3UgZm9yZ2V0IHRvIGNhbGwgJ25nWm9uZS5ydW4oKSc/YCk7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IGlzVXJsVHJlZSh1cmwpID8gdXJsIDogdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIGNvbnN0IG1lcmdlZFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodXJsVHJlZSwgdGhpcy5yYXdVcmxUcmVlKTtcblxuICAgIHJldHVybiB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbihtZXJnZWRUcmVlLCAnaW1wZXJhdGl2ZScsIG51bGwsIGV4dHJhcyk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGUgYmFzZWQgb24gdGhlIHByb3ZpZGVkIGFycmF5IG9mIGNvbW1hbmRzIGFuZCBhIHN0YXJ0aW5nIHBvaW50LlxuICAgKiBJZiBubyBzdGFydGluZyByb3V0ZSBpcyBwcm92aWRlZCwgdGhlIG5hdmlnYXRpb24gaXMgYWJzb2x1dGUuXG4gICAqXG4gICAqIEBwYXJhbSBjb21tYW5kcyBBbiBhcnJheSBvZiBVUkwgZnJhZ21lbnRzIHdpdGggd2hpY2ggdG8gY29uc3RydWN0IHRoZSB0YXJnZXQgVVJMLlxuICAgKiBJZiB0aGUgcGF0aCBpcyBzdGF0aWMsIGNhbiBiZSB0aGUgbGl0ZXJhbCBVUkwgc3RyaW5nLiBGb3IgYSBkeW5hbWljIHBhdGgsIHBhc3MgYW4gYXJyYXkgb2YgcGF0aFxuICAgKiBzZWdtZW50cywgZm9sbG93ZWQgYnkgdGhlIHBhcmFtZXRlcnMgZm9yIGVhY2ggc2VnbWVudC5cbiAgICogVGhlIGZyYWdtZW50cyBhcmUgYXBwbGllZCB0byB0aGUgY3VycmVudCBVUkwgb3IgdGhlIG9uZSBwcm92aWRlZCAgaW4gdGhlIGByZWxhdGl2ZVRvYCBwcm9wZXJ0eVxuICAgKiBvZiB0aGUgb3B0aW9ucyBvYmplY3QsIGlmIHN1cHBsaWVkLlxuICAgKiBAcGFyYW0gZXh0cmFzIEFuIG9wdGlvbnMgb2JqZWN0IHRoYXQgZGV0ZXJtaW5lcyBob3cgdGhlIFVSTCBzaG91bGQgYmUgY29uc3RydWN0ZWQgb3JcbiAgICogICAgIGludGVycHJldGVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBBIFByb21pc2UgdGhhdCByZXNvbHZlcyB0byBgdHJ1ZWAgd2hlbiBuYXZpZ2F0aW9uIHN1Y2NlZWRzLCB0byBgZmFsc2VgIHdoZW4gbmF2aWdhdGlvblxuICAgKiAgICAgZmFpbHMsXG4gICAqIG9yIGlzIHJlamVjdGVkIG9uIGVycm9yLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBUaGUgZm9sbG93aW5nIGNhbGxzIHJlcXVlc3QgbmF2aWdhdGlvbiB0byBhIGR5bmFtaWMgcm91dGUgcGF0aCByZWxhdGl2ZSB0byB0aGUgY3VycmVudCBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIubmF2aWdhdGUoWyd0ZWFtJywgMzMsICd1c2VyJywgMTFdLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMLCBvdmVycmlkaW5nIHRoZSBkZWZhdWx0IGJlaGF2aW9yXG4gICAqIHJvdXRlci5uYXZpZ2F0ZShbJ3RlYW0nLCAzMywgJ3VzZXInLCAxMV0sIHtyZWxhdGl2ZVRvOiByb3V0ZSwgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpXG4gICAqXG4gICAqL1xuICBuYXZpZ2F0ZShjb21tYW5kczogYW55W10sIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHtza2lwTG9jYXRpb25DaGFuZ2U6IGZhbHNlfSk6XG4gICAgICBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB2YWxpZGF0ZUNvbW1hbmRzKGNvbW1hbmRzKTtcbiAgICByZXR1cm4gdGhpcy5uYXZpZ2F0ZUJ5VXJsKHRoaXMuY3JlYXRlVXJsVHJlZShjb21tYW5kcywgZXh0cmFzKSwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKiBTZXJpYWxpemVzIGEgYFVybFRyZWVgIGludG8gYSBzdHJpbmcgKi9cbiAgc2VyaWFsaXplVXJsKHVybDogVXJsVHJlZSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodXJsKTtcbiAgfVxuXG4gIC8qKiBQYXJzZXMgYSBzdHJpbmcgaW50byBhIGBVcmxUcmVlYCAqL1xuICBwYXJzZVVybCh1cmw6IHN0cmluZyk6IFVybFRyZWUge1xuICAgIGxldCB1cmxUcmVlOiBVcmxUcmVlO1xuICAgIHRyeSB7XG4gICAgICB1cmxUcmVlID0gdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKHVybCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdXJsVHJlZSA9IHRoaXMubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyKGUgYXMgVVJJRXJyb3IsIHRoaXMudXJsU2VyaWFsaXplciwgdXJsKTtcbiAgICB9XG4gICAgcmV0dXJuIHVybFRyZWU7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB3aGV0aGVyIHRoZSB1cmwgaXMgYWN0aXZhdGVkLlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZFxuICAgKiBVc2UgYElzQWN0aXZlTWF0Y2hPcHRpb25zYCBpbnN0ZWFkLlxuICAgKlxuICAgKiAtIFRoZSBlcXVpdmFsZW50IGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2AgZm9yIGB0cnVlYCBpc1xuICAgKiBge3BhdGhzOiAnZXhhY3QnLCBxdWVyeVBhcmFtczogJ2V4YWN0JywgZnJhZ21lbnQ6ICdpZ25vcmVkJywgbWF0cml4UGFyYW1zOiAnaWdub3JlZCd9YC5cbiAgICogLSBUaGUgZXF1aXZhbGVudCBmb3IgYGZhbHNlYCBpc1xuICAgKiBge3BhdGhzOiAnc3Vic2V0JywgcXVlcnlQYXJhbXM6ICdzdWJzZXQnLCBmcmFnbWVudDogJ2lnbm9yZWQnLCBtYXRyaXhQYXJhbXM6ICdpZ25vcmVkJ31gLlxuICAgKi9cbiAgaXNBY3RpdmUodXJsOiBzdHJpbmd8VXJsVHJlZSwgZXhhY3Q6IGJvb2xlYW4pOiBib29sZWFuO1xuICAvKipcbiAgICogUmV0dXJucyB3aGV0aGVyIHRoZSB1cmwgaXMgYWN0aXZhdGVkLlxuICAgKi9cbiAgaXNBY3RpdmUodXJsOiBzdHJpbmd8VXJsVHJlZSwgbWF0Y2hPcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IGJvb2xlYW47XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgaXNBY3RpdmUodXJsOiBzdHJpbmd8VXJsVHJlZSwgbWF0Y2hPcHRpb25zOiBib29sZWFufElzQWN0aXZlTWF0Y2hPcHRpb25zKTogYm9vbGVhbjtcbiAgaXNBY3RpdmUodXJsOiBzdHJpbmd8VXJsVHJlZSwgbWF0Y2hPcHRpb25zOiBib29sZWFufElzQWN0aXZlTWF0Y2hPcHRpb25zKTogYm9vbGVhbiB7XG4gICAgbGV0IG9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zO1xuICAgIGlmIChtYXRjaE9wdGlvbnMgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMgPSB7Li4uZXhhY3RNYXRjaE9wdGlvbnN9O1xuICAgIH0gZWxzZSBpZiAobWF0Y2hPcHRpb25zID09PSBmYWxzZSkge1xuICAgICAgb3B0aW9ucyA9IHsuLi5zdWJzZXRNYXRjaE9wdGlvbnN9O1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zID0gbWF0Y2hPcHRpb25zO1xuICAgIH1cbiAgICBpZiAoaXNVcmxUcmVlKHVybCkpIHtcbiAgICAgIHJldHVybiBjb250YWluc1RyZWUodGhpcy5jdXJyZW50VXJsVHJlZSwgdXJsLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIHJldHVybiBjb250YWluc1RyZWUodGhpcy5jdXJyZW50VXJsVHJlZSwgdXJsVHJlZSwgb3B0aW9ucyk7XG4gIH1cblxuICBwcml2YXRlIHJlbW92ZUVtcHR5UHJvcHMocGFyYW1zOiBQYXJhbXMpOiBQYXJhbXMge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhwYXJhbXMpLnJlZHVjZSgocmVzdWx0OiBQYXJhbXMsIGtleTogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZTogYW55ID0gcGFyYW1zW2tleV07XG4gICAgICBpZiAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXN1bHRba2V5XSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LCB7fSk7XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NOYXZpZ2F0aW9ucygpOiB2b2lkIHtcbiAgICB0aGlzLm5hdmlnYXRpb25zLnN1YnNjcmliZShcbiAgICAgICAgdCA9PiB7XG4gICAgICAgICAgdGhpcy5uYXZpZ2F0ZWQgPSB0cnVlO1xuICAgICAgICAgIHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCA9IHQuaWQ7XG4gICAgICAgICAgdGhpcy5jdXJyZW50UGFnZUlkID0gdC50YXJnZXRQYWdlSWQ7XG4gICAgICAgICAgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KVxuICAgICAgICAgICAgICAubmV4dChuZXcgTmF2aWdhdGlvbkVuZChcbiAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgdGhpcy5zZXJpYWxpemVVcmwodGhpcy5jdXJyZW50VXJsVHJlZSkpKTtcbiAgICAgICAgICB0aGlzLmxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbiA9IHRoaXMuY3VycmVudE5hdmlnYXRpb247XG4gICAgICAgICAgdGhpcy50aXRsZVN0cmF0ZWd5Py51cGRhdGVUaXRsZSh0aGlzLnJvdXRlclN0YXRlLnNuYXBzaG90KTtcbiAgICAgICAgICB0LnJlc29sdmUodHJ1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGUgPT4ge1xuICAgICAgICAgIHRoaXMuY29uc29sZS53YXJuKGBVbmhhbmRsZWQgTmF2aWdhdGlvbiBFcnJvcjogJHtlfWApO1xuICAgICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2NoZWR1bGVOYXZpZ2F0aW9uKFxuICAgICAgcmF3VXJsOiBVcmxUcmVlLCBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLCByZXN0b3JlZFN0YXRlOiBSZXN0b3JlZFN0YXRlfG51bGwsXG4gICAgICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMsXG4gICAgICBwcmlvclByb21pc2U/OiB7cmVzb2x2ZTogYW55LCByZWplY3Q6IGFueSwgcHJvbWlzZTogUHJvbWlzZTxib29sZWFuPn0pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShmYWxzZSk7XG4gICAgfVxuXG4gICAgbGV0IHJlc29sdmU6IGFueTtcbiAgICBsZXQgcmVqZWN0OiBhbnk7XG4gICAgbGV0IHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj47XG4gICAgaWYgKHByaW9yUHJvbWlzZSkge1xuICAgICAgcmVzb2x2ZSA9IHByaW9yUHJvbWlzZS5yZXNvbHZlO1xuICAgICAgcmVqZWN0ID0gcHJpb3JQcm9taXNlLnJlamVjdDtcbiAgICAgIHByb21pc2UgPSBwcmlvclByb21pc2UucHJvbWlzZTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBwcm9taXNlID0gbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlcywgcmVqKSA9PiB7XG4gICAgICAgIHJlc29sdmUgPSByZXM7XG4gICAgICAgIHJlamVjdCA9IHJlajtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGlkID0gKyt0aGlzLm5hdmlnYXRpb25JZDtcbiAgICBsZXQgdGFyZ2V0UGFnZUlkOiBudW1iZXI7XG4gICAgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ2NvbXB1dGVkJykge1xuICAgICAgY29uc3QgaXNJbml0aWFsUGFnZSA9IHRoaXMuY3VycmVudFBhZ2VJZCA9PT0gMDtcbiAgICAgIGlmIChpc0luaXRpYWxQYWdlKSB7XG4gICAgICAgIHJlc3RvcmVkU3RhdGUgPSB0aGlzLmxvY2F0aW9uLmdldFN0YXRlKCkgYXMgUmVzdG9yZWRTdGF0ZSB8IG51bGw7XG4gICAgICB9XG4gICAgICAvLyBJZiB0aGUgYMm1cm91dGVyUGFnZUlkYCBleGlzdCBpbiB0aGUgc3RhdGUgdGhlbiBgdGFyZ2V0cGFnZUlkYCBzaG91bGQgaGF2ZSB0aGUgdmFsdWUgb2ZcbiAgICAgIC8vIGDJtXJvdXRlclBhZ2VJZGAuIFRoaXMgaXMgdGhlIGNhc2UgZm9yIHNvbWV0aGluZyBsaWtlIGEgcGFnZSByZWZyZXNoIHdoZXJlIHdlIGFzc2lnbiB0aGVcbiAgICAgIC8vIHRhcmdldCBpZCB0byB0aGUgcHJldmlvdXNseSBzZXQgdmFsdWUgZm9yIHRoYXQgcGFnZS5cbiAgICAgIGlmIChyZXN0b3JlZFN0YXRlICYmIHJlc3RvcmVkU3RhdGUuybVyb3V0ZXJQYWdlSWQpIHtcbiAgICAgICAgdGFyZ2V0UGFnZUlkID0gcmVzdG9yZWRTdGF0ZS7JtXJvdXRlclBhZ2VJZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHdlJ3JlIHJlcGxhY2luZyB0aGUgVVJMIG9yIGRvaW5nIGEgc2lsZW50IG5hdmlnYXRpb24sIHdlIGRvIG5vdCB3YW50IHRvIGluY3JlbWVudCB0aGVcbiAgICAgICAgLy8gcGFnZSBpZCBiZWNhdXNlIHdlIGFyZW4ndCBwdXNoaW5nIGEgbmV3IGVudHJ5IHRvIGhpc3RvcnkuXG4gICAgICAgIGlmIChleHRyYXMucmVwbGFjZVVybCB8fCBleHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgICAgdGFyZ2V0UGFnZUlkID0gdGhpcy5icm93c2VyUGFnZUlkID8/IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGFyZ2V0UGFnZUlkID0gKHRoaXMuYnJvd3NlclBhZ2VJZCA/PyAwKSArIDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhpcyBpcyB1bnVzZWQgd2hlbiBgY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbmAgaXMgbm90IGNvbXB1dGVkLlxuICAgICAgdGFyZ2V0UGFnZUlkID0gMDtcbiAgICB9XG5cbiAgICB0aGlzLnNldFRyYW5zaXRpb24oe1xuICAgICAgaWQsXG4gICAgICB0YXJnZXRQYWdlSWQsXG4gICAgICBzb3VyY2UsXG4gICAgICByZXN0b3JlZFN0YXRlLFxuICAgICAgY3VycmVudFVybFRyZWU6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBjdXJyZW50UmF3VXJsOiB0aGlzLnJhd1VybFRyZWUsXG4gICAgICByYXdVcmwsXG4gICAgICBleHRyYXMsXG4gICAgICByZXNvbHZlLFxuICAgICAgcmVqZWN0LFxuICAgICAgcHJvbWlzZSxcbiAgICAgIGN1cnJlbnRTbmFwc2hvdDogdGhpcy5yb3V0ZXJTdGF0ZS5zbmFwc2hvdCxcbiAgICAgIGN1cnJlbnRSb3V0ZXJTdGF0ZTogdGhpcy5yb3V0ZXJTdGF0ZVxuICAgIH0pO1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoYXQgdGhlIGVycm9yIGlzIHByb3BhZ2F0ZWQgZXZlbiB0aG91Z2ggYHByb2Nlc3NOYXZpZ2F0aW9uc2AgY2F0Y2hcbiAgICAvLyBoYW5kbGVyIGRvZXMgbm90IHJldGhyb3dcbiAgICByZXR1cm4gcHJvbWlzZS5jYXRjaCgoZTogYW55KSA9PiB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHNldEJyb3dzZXJVcmwodXJsOiBVcmxUcmVlLCB0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbikge1xuICAgIGNvbnN0IHBhdGggPSB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHVybCk7XG4gICAgY29uc3Qgc3RhdGUgPSB7Li4udC5leHRyYXMuc3RhdGUsIC4uLnRoaXMuZ2VuZXJhdGVOZ1JvdXRlclN0YXRlKHQuaWQsIHQudGFyZ2V0UGFnZUlkKX07XG4gICAgaWYgKHRoaXMubG9jYXRpb24uaXNDdXJyZW50UGF0aEVxdWFsVG8ocGF0aCkgfHwgISF0LmV4dHJhcy5yZXBsYWNlVXJsKSB7XG4gICAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShwYXRoLCAnJywgc3RhdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxvY2F0aW9uLmdvKHBhdGgsICcnLCBzdGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBlcmZvcm1zIHRoZSBuZWNlc3Nhcnkgcm9sbGJhY2sgYWN0aW9uIHRvIHJlc3RvcmUgdGhlIGJyb3dzZXIgVVJMIHRvIHRoZVxuICAgKiBzdGF0ZSBiZWZvcmUgdGhlIHRyYW5zaXRpb24uXG4gICAqL1xuICBwcml2YXRlIHJlc3RvcmVIaXN0b3J5KHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uLCByZXN0b3JpbmdGcm9tQ2F1Z2h0RXJyb3IgPSBmYWxzZSkge1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdjb21wdXRlZCcpIHtcbiAgICAgIGNvbnN0IHRhcmdldFBhZ2VQb3NpdGlvbiA9IHRoaXMuY3VycmVudFBhZ2VJZCAtIHQudGFyZ2V0UGFnZUlkO1xuICAgICAgLy8gVGhlIG5hdmlnYXRvciBjaGFuZ2UgdGhlIGxvY2F0aW9uIGJlZm9yZSB0cmlnZ2VyZWQgdGhlIGJyb3dzZXIgZXZlbnQsXG4gICAgICAvLyBzbyB3ZSBuZWVkIHRvIGdvIGJhY2sgdG8gdGhlIGN1cnJlbnQgdXJsIGlmIHRoZSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGVkLlxuICAgICAgLy8gQWxzbywgd2hlbiBuYXZpZ2F0aW9uIGdldHMgY2FuY2VsbGVkIHdoaWxlIHVzaW5nIHVybCB1cGRhdGUgc3RyYXRlZ3kgZWFnZXIsIHRoZW4gd2UgbmVlZCB0b1xuICAgICAgLy8gZ28gYmFjay4gQmVjYXVzZSwgd2hlbiBgdXJsVXBkYXRlU3JhdGVneWAgaXMgYGVhZ2VyYDsgYHNldEJyb3dzZXJVcmxgIG1ldGhvZCBpcyBjYWxsZWRcbiAgICAgIC8vIGJlZm9yZSBhbnkgdmVyaWZpY2F0aW9uLlxuICAgICAgY29uc3QgYnJvd3NlclVybFVwZGF0ZU9jY3VycmVkID1cbiAgICAgICAgICAodC5zb3VyY2UgPT09ICdwb3BzdGF0ZScgfHwgdGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJyB8fFxuICAgICAgICAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID09PSB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uPy5maW5hbFVybCk7XG4gICAgICBpZiAoYnJvd3NlclVybFVwZGF0ZU9jY3VycmVkICYmIHRhcmdldFBhZ2VQb3NpdGlvbiAhPT0gMCkge1xuICAgICAgICB0aGlzLmxvY2F0aW9uLmhpc3RvcnlHbyh0YXJnZXRQYWdlUG9zaXRpb24pO1xuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID09PSB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uPy5maW5hbFVybCAmJiB0YXJnZXRQYWdlUG9zaXRpb24gPT09IDApIHtcbiAgICAgICAgLy8gV2UgZ290IHRvIHRoZSBhY3RpdmF0aW9uIHN0YWdlICh3aGVyZSBjdXJyZW50VXJsVHJlZSBpcyBzZXQgdG8gdGhlIG5hdmlnYXRpb24nc1xuICAgICAgICAvLyBmaW5hbFVybCksIGJ1dCB3ZSB3ZXJlbid0IG1vdmluZyBhbnl3aGVyZSBpbiBoaXN0b3J5IChza2lwTG9jYXRpb25DaGFuZ2Ugb3IgcmVwbGFjZVVybCkuXG4gICAgICAgIC8vIFdlIHN0aWxsIG5lZWQgdG8gcmVzZXQgdGhlIHJvdXRlciBzdGF0ZSBiYWNrIHRvIHdoYXQgaXQgd2FzIHdoZW4gdGhlIG5hdmlnYXRpb24gc3RhcnRlZC5cbiAgICAgICAgdGhpcy5yZXNldFN0YXRlKHQpO1xuICAgICAgICAvLyBUT0RPKGF0c2NvdHQpOiByZXNldHRpbmcgdGhlIGBicm93c2VyVXJsVHJlZWAgc2hvdWxkIHJlYWxseSBiZSBkb25lIGluIGByZXNldFN0YXRlYC5cbiAgICAgICAgLy8gSW52ZXN0aWdhdGUgaWYgdGhpcyBjYW4gYmUgZG9uZSBieSBydW5uaW5nIFRHUC5cbiAgICAgICAgdGhpcy5icm93c2VyVXJsVHJlZSA9IHQuY3VycmVudFVybFRyZWU7XG4gICAgICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBUaGUgYnJvd3NlciBVUkwgYW5kIHJvdXRlciBzdGF0ZSB3YXMgbm90IHVwZGF0ZWQgYmVmb3JlIHRoZSBuYXZpZ2F0aW9uIGNhbmNlbGxlZCBzb1xuICAgICAgICAvLyB0aGVyZSdzIG5vIHJlc3RvcmF0aW9uIG5lZWRlZC5cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ3JlcGxhY2UnKSB7XG4gICAgICAvLyBUT0RPKGF0c2NvdHQpOiBJdCBzZWVtcyBsaWtlIHdlIHNob3VsZCBfYWx3YXlzXyByZXNldCB0aGUgc3RhdGUgaGVyZS4gSXQgd291bGQgYmUgYSBuby1vcFxuICAgICAgLy8gZm9yIGBkZWZlcnJlZGAgbmF2aWdhdGlvbnMgdGhhdCBoYXZlbid0IGNoYW5nZSB0aGUgaW50ZXJuYWwgc3RhdGUgeWV0IGJlY2F1c2UgZ3VhcmRzXG4gICAgICAvLyByZWplY3QuIEZvciAnZWFnZXInIG5hdmlnYXRpb25zLCBpdCBzZWVtcyBsaWtlIHdlIGFsc28gcmVhbGx5IHNob3VsZCByZXNldCB0aGUgc3RhdGVcbiAgICAgIC8vIGJlY2F1c2UgdGhlIG5hdmlnYXRpb24gd2FzIGNhbmNlbGxlZC4gSW52ZXN0aWdhdGUgaWYgdGhpcyBjYW4gYmUgZG9uZSBieSBydW5uaW5nIFRHUC5cbiAgICAgIGlmIChyZXN0b3JpbmdGcm9tQ2F1Z2h0RXJyb3IpIHtcbiAgICAgICAgdGhpcy5yZXNldFN0YXRlKHQpO1xuICAgICAgfVxuICAgICAgdGhpcy5yZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlc2V0U3RhdGUodDogTmF2aWdhdGlvblRyYW5zaXRpb24pOiB2b2lkIHtcbiAgICAodGhpcyBhcyB7cm91dGVyU3RhdGU6IFJvdXRlclN0YXRlfSkucm91dGVyU3RhdGUgPSB0LmN1cnJlbnRSb3V0ZXJTdGF0ZTtcbiAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gdC5jdXJyZW50VXJsVHJlZTtcbiAgICAvLyBOb3RlIGhlcmUgdGhhdCB3ZSB1c2UgdGhlIHVybEhhbmRsaW5nU3RyYXRlZ3kgdG8gZ2V0IHRoZSByZXNldCBgcmF3VXJsVHJlZWAgYmVjYXVzZSBpdCBtYXkgYmVcbiAgICAvLyBjb25maWd1cmVkIHRvIGhhbmRsZSBvbmx5IHBhcnQgb2YgdGhlIG5hdmlnYXRpb24gVVJMLiBUaGlzIG1lYW5zIHdlIHdvdWxkIG9ubHkgd2FudCB0byByZXNldFxuICAgIC8vIHRoZSBwYXJ0IG9mIHRoZSBuYXZpZ2F0aW9uIGhhbmRsZWQgYnkgdGhlIEFuZ3VsYXIgcm91dGVyIHJhdGhlciB0aGFuIHRoZSB3aG9sZSBVUkwuIEluXG4gICAgLy8gYWRkaXRpb24sIHRoZSBVUkxIYW5kbGluZ1N0cmF0ZWd5IG1heSBiZSBjb25maWd1cmVkIHRvIHNwZWNpZmljYWxseSBwcmVzZXJ2ZSBwYXJ0cyBvZiB0aGUgVVJMXG4gICAgLy8gd2hlbiBtZXJnaW5nLCBzdWNoIGFzIHRoZSBxdWVyeSBwYXJhbXMgc28gdGhleSBhcmUgbm90IGxvc3Qgb24gYSByZWZyZXNoLlxuICAgIHRoaXMucmF3VXJsVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB0LnJhd1VybCk7XG4gIH1cblxuICBwcml2YXRlIHJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpOiB2b2lkIHtcbiAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShcbiAgICAgICAgdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh0aGlzLnJhd1VybFRyZWUpLCAnJyxcbiAgICAgICAgdGhpcy5nZW5lcmF0ZU5nUm91dGVyU3RhdGUodGhpcy5sYXN0U3VjY2Vzc2Z1bElkLCB0aGlzLmN1cnJlbnRQYWdlSWQpKTtcbiAgfVxuXG4gIHByaXZhdGUgY2FuY2VsTmF2aWdhdGlvblRyYW5zaXRpb24oXG4gICAgICB0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbiwgcmVhc29uOiBzdHJpbmcsIGNvZGU6IE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlKSB7XG4gICAgY29uc3QgbmF2Q2FuY2VsID0gbmV3IE5hdmlnYXRpb25DYW5jZWwodC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCByZWFzb24sIGNvZGUpO1xuICAgIHRoaXMudHJpZ2dlckV2ZW50KG5hdkNhbmNlbCk7XG4gICAgdC5yZXNvbHZlKGZhbHNlKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2VuZXJhdGVOZ1JvdXRlclN0YXRlKG5hdmlnYXRpb25JZDogbnVtYmVyLCByb3V0ZXJQYWdlSWQ/OiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAnY29tcHV0ZWQnKSB7XG4gICAgICByZXR1cm4ge25hdmlnYXRpb25JZCwgybVyb3V0ZXJQYWdlSWQ6IHJvdXRlclBhZ2VJZH07XG4gICAgfVxuICAgIHJldHVybiB7bmF2aWdhdGlvbklkfTtcbiAgfVxufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUNvbW1hbmRzKGNvbW1hbmRzOiBzdHJpbmdbXSk6IHZvaWQge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbW1hbmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY21kID0gY29tbWFuZHNbaV07XG4gICAgaWYgKGNtZCA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuTlVMTElTSF9DT01NQU5ELFxuICAgICAgICAgIE5HX0RFVl9NT0RFICYmIGBUaGUgcmVxdWVzdGVkIHBhdGggY29udGFpbnMgJHtjbWR9IHNlZ21lbnQgYXQgaW5kZXggJHtpfWApO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpc0Jyb3dzZXJUcmlnZ2VyZWROYXZpZ2F0aW9uKHNvdXJjZTogJ2ltcGVyYXRpdmUnfCdwb3BzdGF0ZSd8J2hhc2hjaGFuZ2UnKSB7XG4gIHJldHVybiBzb3VyY2UgIT09ICdpbXBlcmF0aXZlJztcbn1cbiJdfQ==