/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { Compiler, inject, Injectable, Injector, NgModuleRef, NgZone, ɵConsole as Console, ɵRuntimeError as RuntimeError } from '@angular/core';
import { BehaviorSubject, combineLatest, EMPTY, of, Subject } from 'rxjs';
import { catchError, defaultIfEmpty, filter, finalize, map, switchMap, take, tap } from 'rxjs/operators';
import { createRouterState } from './create_router_state';
import { createUrlTree } from './create_url_tree';
import { GuardsCheckEnd, GuardsCheckStart, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, ResolveEnd, ResolveStart, RouteConfigLoadEnd, RouteConfigLoadStart, RoutesRecognized } from './events';
import { isNavigationCancelingError, isRedirectingNavigationCancelingError, redirectingNavigationError } from './navigation_canceling_error';
import { activateRoutes } from './operators/activate_routes';
import { applyRedirects } from './operators/apply_redirects';
import { checkGuards } from './operators/check_guards';
import { recognize } from './operators/recognize';
import { resolveData } from './operators/resolve_data';
import { switchTap } from './operators/switch_tap';
import { DefaultTitleStrategy, TitleStrategy } from './page_title_strategy';
import { DefaultRouteReuseStrategy, RouteReuseStrategy } from './route_reuse_strategy';
import { ROUTER_CONFIGURATION } from './router_config';
import { RouterConfigLoader, ROUTES } from './router_config_loader';
import { ChildrenOutletContexts } from './router_outlet_context';
import { createEmptyState } from './router_state';
import { DefaultUrlHandlingStrategy, UrlHandlingStrategy } from './url_handling_strategy';
import { containsTree, isUrlTree, UrlSerializer, UrlTree } from './url_tree';
import { flatten } from './utils/collection';
import { standardizeConfig, validateConfig } from './utils/config';
import { getAllRouteGuards } from './utils/preactivation';
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
    const defaultTitleStrategy = inject(DefaultTitleStrategy);
    const titleStrategy = inject(TitleStrategy, { optional: true });
    const urlHandlingStrategy = inject(UrlHandlingStrategy, { optional: true });
    const routeReuseStrategy = inject(RouteReuseStrategy, { optional: true });
    const router = new Router(null, urlSerializer, contexts, location, injector, compiler, flatten(config));
    if (urlHandlingStrategy) {
        router.urlHandlingStrategy = urlHandlingStrategy;
    }
    if (routeReuseStrategy) {
        router.routeReuseStrategy = routeReuseStrategy;
    }
    router.titleStrategy = titleStrategy ?? defaultTitleStrategy;
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
        this.currentUrlTree = new UrlTree();
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
        switchMap(overallTransitionState => {
            let completed = false;
            let errored = false;
            return of(overallTransitionState)
                .pipe(
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
                    // matching. If this is not the case, assume something went wrong and
                    // try processing the URL again.
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
                        overallTransitionState.urlAfterRedirects = t.urlAfterRedirects;
                    }), 
                    // Recognize
                    recognize(this.ngModule.injector, this.rootComponentType, this.config, this.urlSerializer, this.paramsInheritanceStrategy), 
                    // Update URL if in `eager` update mode
                    tap(t => {
                        overallTransitionState.targetSnapshot = t.targetSnapshot;
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
                    /* When the current URL shouldn't be processed, but the previous one
                     * was, we handle this "error condition" by navigating to the
                     * previously successful URL, but leaving the URL intact.*/
                    if (processPreviousUrl) {
                        const { id, extractedUrl, source, restoredState, extras } = t;
                        const navStart = new NavigationStart(id, this.serializeUrl(extractedUrl), source, restoredState);
                        eventsSubject.next(navStart);
                        const targetSnapshot = createEmptyState(extractedUrl, this.rootComponentType).snapshot;
                        overallTransitionState = {
                            ...t,
                            targetSnapshot,
                            urlAfterRedirects: extractedUrl,
                            extras: { ...extras, skipLocationChange: false, replaceUrl: false },
                        };
                        return of(overallTransitionState);
                    }
                    else {
                        /* When neither the current or previous URL can be processed, do
                         * nothing other than update router's internal reference to the
                         * current "settled" URL. This way the next navigation will be coming
                         * from the current URL in the browser.
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
            }), map(t => {
                overallTransitionState = {
                    ...t,
                    guards: getAllRouteGuards(t.targetSnapshot, t.currentSnapshot, this.rootContexts)
                };
                return overallTransitionState;
            }), checkGuards(this.ngModule.injector, (evt) => this.triggerEvent(evt)), tap(t => {
                overallTransitionState.guardsResult = t.guardsResult;
                if (isUrlTree(t.guardsResult)) {
                    throw redirectingNavigationError(this.urlSerializer, t.guardsResult);
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
                overallTransitionState = { ...t, targetRouterState };
                return (overallTransitionState);
            }), 
            /* Once here, we are about to activate synchronously. The assumption is
               this will succeed, and user code may read from the Router service.
               Therefore before activation, we need to update router properties storing
               the current URL and the RouterState, as well as updated the browser URL.
               All this should happen *before* activating. */
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
                /* When the navigation stream finishes either through error or success,
                 * we set the `completed` or `errored` flag. However, there are some
                 * situations where we could get here without either of those being set.
                 * For instance, a redirect during NavigationStart. Therefore, this is a
                 * catch-all to make sure the NavigationCancel event is fired when a
                 * navigation gets cancelled but not caught by other means. */
                if (!completed && !errored) {
                    const cancelationReason = NG_DEV_MODE ?
                        `Navigation ID ${overallTransitionState
                            .id} is not equal to the current navigation id ${this.navigationId}` :
                        '';
                    this.cancelNavigationTransition(overallTransitionState, cancelationReason, 1 /* NavigationCancellationCode.SupersededByNewNavigation */);
                }
                // Only clear current navigation if it is still set to the one that
                // finalized.
                if (this.currentNavigation?.id === overallTransitionState.id) {
                    this.currentNavigation = null;
                }
            }), catchError((e) => {
                errored = true;
                /* This error type is issued during Redirect, and is handled as a
                 * cancellation rather than an error. */
                if (isNavigationCancelingError(e)) {
                    if (!isRedirectingNavigationCancelingError(e)) {
                        // Set property only if we're not redirecting. If we landed on a page
                        // and redirect to `/` route, the new navigation is going to see the
                        // `/` isn't a change from the default currentUrlTree and won't
                        // navigate. This is only applicable with initial navigation, so
                        // setting `navigated` only when not redirecting resolves this
                        // scenario.
                        this.navigated = true;
                        this.restoreHistory(overallTransitionState, true);
                    }
                    const navCancel = new NavigationCancel(overallTransitionState.id, this.serializeUrl(overallTransitionState.extractedUrl), e.message, e.cancellationCode);
                    eventsSubject.next(navCancel);
                    // When redirecting, we need to delay resolving the navigation
                    // promise and push it to the redirect navigation
                    if (!isRedirectingNavigationCancelingError(e)) {
                        overallTransitionState.resolve(false);
                    }
                    else {
                        const mergedTree = this.urlHandlingStrategy.merge(e.url, this.rawUrlTree);
                        const extras = {
                            skipLocationChange: overallTransitionState.extras.skipLocationChange,
                            // The URL is already updated at this point if we have 'eager' URL
                            // updates or if the navigation was triggered by the browser (back
                            // button, URL bar, etc). We want to replace that item in history
                            // if the navigation is rejected.
                            replaceUrl: this.urlUpdateStrategy === 'eager' ||
                                isBrowserTriggeredNavigation(overallTransitionState.source)
                        };
                        this.scheduleNavigation(mergedTree, 'imperative', null, extras, {
                            resolve: overallTransitionState.resolve,
                            reject: overallTransitionState.reject,
                            promise: overallTransitionState.promise
                        });
                    }
                    /* All other errors should reset to the router's internal URL reference
                     * to the pre-error state. */
                }
                else {
                    this.restoreHistory(overallTransitionState, true);
                    const navError = new NavigationError(overallTransitionState.id, this.serializeUrl(overallTransitionState.extractedUrl), e, overallTransitionState.targetSnapshot ?? undefined);
                    eventsSubject.next(navError);
                    try {
                        overallTransitionState.resolve(this.errorHandler(e));
                    }
                    catch (ee) {
                        overallTransitionState.reject(ee);
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
            // go back. Because, when `urlUpdateStrategy` is `eager`; `setBrowserUrl` method is called
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
Router.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0-next.0+sha-f5d0c80", ngImport: i0, type: Router, deps: "invalid", target: i0.ɵɵFactoryTarget.Injectable });
Router.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.1.0-next.0+sha-f5d0c80", ngImport: i0, type: Router, providedIn: 'root', useFactory: setupRouter });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0-next.0+sha-f5d0c80", ngImport: i0, type: Router, decorators: [{
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
function isBrowserTriggeredNavigation(source) {
    return source !== 'imperative';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBUSxRQUFRLElBQUksT0FBTyxFQUFFLGFBQWEsSUFBSSxZQUFZLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDcEosT0FBTyxFQUFDLGVBQWUsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFjLEVBQUUsRUFBRSxPQUFPLEVBQW1CLE1BQU0sTUFBTSxDQUFDO0FBQ3RHLE9BQU8sRUFBQyxVQUFVLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFdkcsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDeEQsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBRWhELE9BQU8sRUFBUSxjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQThCLGFBQWEsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFxQixVQUFVLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFDLE1BQU0sVUFBVSxDQUFDO0FBRXpRLE9BQU8sRUFBQywwQkFBMEIsRUFBRSxxQ0FBcUMsRUFBRSwwQkFBMEIsRUFBQyxNQUFNLDhCQUE4QixDQUFDO0FBQzNJLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0s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eEMsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtZQUNmLE1BQU0sSUFBSSxZQUFZLDhDQUVsQixXQUFXLElBQUksK0JBQStCLEdBQUcscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDaEY7S0FDRjtBQUNILENBQUM7QUFFRCxTQUFTLDRCQUE0QixDQUFDLE1BQTRDO0lBQ2hGLE9BQU8sTUFBTSxLQUFLLFlBQVksQ0FBQztBQUNqQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0NvbXBpbGVyLCBpbmplY3QsIEluamVjdGFibGUsIEluamVjdG9yLCBOZ01vZHVsZVJlZiwgTmdab25lLCBUeXBlLCDJtUNvbnNvbGUgYXMgQ29uc29sZSwgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7QmVoYXZpb3JTdWJqZWN0LCBjb21iaW5lTGF0ZXN0LCBFTVBUWSwgT2JzZXJ2YWJsZSwgb2YsIFN1YmplY3QsIFN1YnNjcmlwdGlvbkxpa2V9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjYXRjaEVycm9yLCBkZWZhdWx0SWZFbXB0eSwgZmlsdGVyLCBmaW5hbGl6ZSwgbWFwLCBzd2l0Y2hNYXAsIHRha2UsIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge2NyZWF0ZVJvdXRlclN0YXRlfSBmcm9tICcuL2NyZWF0ZV9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtjcmVhdGVVcmxUcmVlfSBmcm9tICcuL2NyZWF0ZV91cmxfdHJlZSc7XG5pbXBvcnQge1J1bnRpbWVFcnJvckNvZGV9IGZyb20gJy4vZXJyb3JzJztcbmltcG9ydCB7RXZlbnQsIEd1YXJkc0NoZWNrRW5kLCBHdWFyZHNDaGVja1N0YXJ0LCBOYXZpZ2F0aW9uQ2FuY2VsLCBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZSwgTmF2aWdhdGlvbkVuZCwgTmF2aWdhdGlvbkVycm9yLCBOYXZpZ2F0aW9uU3RhcnQsIE5hdmlnYXRpb25UcmlnZ2VyLCBSZXNvbHZlRW5kLCBSZXNvbHZlU3RhcnQsIFJvdXRlQ29uZmlnTG9hZEVuZCwgUm91dGVDb25maWdMb2FkU3RhcnQsIFJvdXRlc1JlY29nbml6ZWR9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7TmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucywgUXVlcnlQYXJhbXNIYW5kbGluZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtpc05hdmlnYXRpb25DYW5jZWxpbmdFcnJvciwgaXNSZWRpcmVjdGluZ05hdmlnYXRpb25DYW5jZWxpbmdFcnJvciwgcmVkaXJlY3RpbmdOYXZpZ2F0aW9uRXJyb3J9IGZyb20gJy4vbmF2aWdhdGlvbl9jYW5jZWxpbmdfZXJyb3InO1xuaW1wb3J0IHthY3RpdmF0ZVJvdXRlc30gZnJvbSAnLi9vcGVyYXRvcnMvYWN0aXZhdGVfcm91dGVzJztcbmltcG9ydCB7YXBwbHlSZWRpcmVjdHN9IGZyb20gJy4vb3BlcmF0b3JzL2FwcGx5X3JlZGlyZWN0cyc7XG5pbXBvcnQge2NoZWNrR3VhcmRzfSBmcm9tICcuL29wZXJhdG9ycy9jaGVja19ndWFyZHMnO1xuaW1wb3J0IHtyZWNvZ25pemV9IGZyb20gJy4vb3BlcmF0b3JzL3JlY29nbml6ZSc7XG5pbXBvcnQge3Jlc29sdmVEYXRhfSBmcm9tICcuL29wZXJhdG9ycy9yZXNvbHZlX2RhdGEnO1xuaW1wb3J0IHtzd2l0Y2hUYXB9IGZyb20gJy4vb3BlcmF0b3JzL3N3aXRjaF90YXAnO1xuaW1wb3J0IHtEZWZhdWx0VGl0bGVTdHJhdGVneSwgVGl0bGVTdHJhdGVneX0gZnJvbSAnLi9wYWdlX3RpdGxlX3N0cmF0ZWd5JztcbmltcG9ydCB7RGVmYXVsdFJvdXRlUmV1c2VTdHJhdGVneSwgUm91dGVSZXVzZVN0cmF0ZWd5fSBmcm9tICcuL3JvdXRlX3JldXNlX3N0cmF0ZWd5JztcbmltcG9ydCB7RXJyb3JIYW5kbGVyLCBFeHRyYU9wdGlvbnMsIFJPVVRFUl9DT05GSUdVUkFUSU9OfSBmcm9tICcuL3JvdXRlcl9jb25maWcnO1xuaW1wb3J0IHtSb3V0ZXJDb25maWdMb2FkZXIsIFJPVVRFU30gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge0NoaWxkcmVuT3V0bGV0Q29udGV4dHN9IGZyb20gJy4vcm91dGVyX291dGxldF9jb250ZXh0JztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGUsIEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGNyZWF0ZUVtcHR5U3RhdGUsIFJvdXRlclN0YXRlLCBSb3V0ZXJTdGF0ZVNuYXBzaG90fSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BhcmFtc30gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtEZWZhdWx0VXJsSGFuZGxpbmdTdHJhdGVneSwgVXJsSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi91cmxfaGFuZGxpbmdfc3RyYXRlZ3knO1xuaW1wb3J0IHtjb250YWluc1RyZWUsIElzQWN0aXZlTWF0Y2hPcHRpb25zLCBpc1VybFRyZWUsIFVybFNlcmlhbGl6ZXIsIFVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtmbGF0dGVufSBmcm9tICcuL3V0aWxzL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtzdGFuZGFyZGl6ZUNvbmZpZywgdmFsaWRhdGVDb25maWd9IGZyb20gJy4vdXRpbHMvY29uZmlnJztcbmltcG9ydCB7Q2hlY2tzLCBnZXRBbGxSb3V0ZUd1YXJkc30gZnJvbSAnLi91dGlscy9wcmVhY3RpdmF0aW9uJztcblxuXG5jb25zdCBOR19ERVZfTU9ERSA9IHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8ICEhbmdEZXZNb2RlO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIE9wdGlvbnMgdGhhdCBtb2RpZnkgdGhlIGBSb3V0ZXJgIFVSTC5cbiAqIFN1cHBseSBhbiBvYmplY3QgY29udGFpbmluZyBhbnkgb2YgdGhlc2UgcHJvcGVydGllcyB0byBhIGBSb3V0ZXJgIG5hdmlnYXRpb24gZnVuY3Rpb24gdG9cbiAqIGNvbnRyb2wgaG93IHRoZSB0YXJnZXQgVVJMIHNob3VsZCBiZSBjb25zdHJ1Y3RlZC5cbiAqXG4gKiBAc2VlIFtSb3V0ZXIubmF2aWdhdGUoKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI25hdmlnYXRlKVxuICogQHNlZSBbUm91dGVyLmNyZWF0ZVVybFRyZWUoKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI2NyZWF0ZXVybHRyZWUpXG4gKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFVybENyZWF0aW9uT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBTcGVjaWZpZXMgYSByb290IFVSSSB0byB1c2UgZm9yIHJlbGF0aXZlIG5hdmlnYXRpb24uXG4gICAqXG4gICAqIEZvciBleGFtcGxlLCBjb25zaWRlciB0aGUgZm9sbG93aW5nIHJvdXRlIGNvbmZpZ3VyYXRpb24gd2hlcmUgdGhlIHBhcmVudCByb3V0ZVxuICAgKiBoYXMgdHdvIGNoaWxkcmVuLlxuICAgKlxuICAgKiBgYGBcbiAgICogW3tcbiAgICogICBwYXRoOiAncGFyZW50JyxcbiAgICogICBjb21wb25lbnQ6IFBhcmVudENvbXBvbmVudCxcbiAgICogICBjaGlsZHJlbjogW3tcbiAgICogICAgIHBhdGg6ICdsaXN0JyxcbiAgICogICAgIGNvbXBvbmVudDogTGlzdENvbXBvbmVudFxuICAgKiAgIH0se1xuICAgKiAgICAgcGF0aDogJ2NoaWxkJyxcbiAgICogICAgIGNvbXBvbmVudDogQ2hpbGRDb21wb25lbnRcbiAgICogICB9XVxuICAgKiB9XVxuICAgKiBgYGBcbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBgZ28oKWAgZnVuY3Rpb24gbmF2aWdhdGVzIHRvIHRoZSBgbGlzdGAgcm91dGUgYnlcbiAgICogaW50ZXJwcmV0aW5nIHRoZSBkZXN0aW5hdGlvbiBVUkkgYXMgcmVsYXRpdmUgdG8gdGhlIGFjdGl2YXRlZCBgY2hpbGRgICByb3V0ZVxuICAgKlxuICAgKiBgYGBcbiAgICogIEBDb21wb25lbnQoey4uLn0pXG4gICAqICBjbGFzcyBDaGlsZENvbXBvbmVudCB7XG4gICAqICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsIHByaXZhdGUgcm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7fVxuICAgKlxuICAgKiAgICBnbygpIHtcbiAgICogICAgICB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy4uL2xpc3QnXSwgeyByZWxhdGl2ZVRvOiB0aGlzLnJvdXRlIH0pO1xuICAgKiAgICB9XG4gICAqICB9XG4gICAqIGBgYFxuICAgKlxuICAgKiBBIHZhbHVlIG9mIGBudWxsYCBvciBgdW5kZWZpbmVkYCBpbmRpY2F0ZXMgdGhhdCB0aGUgbmF2aWdhdGlvbiBjb21tYW5kcyBzaG91bGQgYmUgYXBwbGllZFxuICAgKiByZWxhdGl2ZSB0byB0aGUgcm9vdC5cbiAgICovXG4gIHJlbGF0aXZlVG8/OiBBY3RpdmF0ZWRSb3V0ZXxudWxsO1xuXG4gIC8qKlxuICAgKiBTZXRzIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gdGhlIFVSTC5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHRvIC9yZXN1bHRzP3BhZ2U9MVxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy9yZXN1bHRzJ10sIHsgcXVlcnlQYXJhbXM6IHsgcGFnZTogMSB9IH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHF1ZXJ5UGFyYW1zPzogUGFyYW1zfG51bGw7XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGhhc2ggZnJhZ21lbnQgZm9yIHRoZSBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvcmVzdWx0cyN0b3BcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvcmVzdWx0cyddLCB7IGZyYWdtZW50OiAndG9wJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudD86IHN0cmluZztcblxuICAvKipcbiAgICogSG93IHRvIGhhbmRsZSBxdWVyeSBwYXJhbWV0ZXJzIGluIHRoZSByb3V0ZXIgbGluayBmb3IgdGhlIG5leHQgbmF2aWdhdGlvbi5cbiAgICogT25lIG9mOlxuICAgKiAqIGBwcmVzZXJ2ZWAgOiBQcmVzZXJ2ZSBjdXJyZW50IHBhcmFtZXRlcnMuXG4gICAqICogYG1lcmdlYCA6IE1lcmdlIG5ldyB3aXRoIGN1cnJlbnQgcGFyYW1ldGVycy5cbiAgICpcbiAgICogVGhlIFwicHJlc2VydmVcIiBvcHRpb24gZGlzY2FyZHMgYW55IG5ldyBxdWVyeSBwYXJhbXM6XG4gICAqIGBgYFxuICAgKiAvLyBmcm9tIC92aWV3MT9wYWdlPTEgdG8vdmlldzI/cGFnZT0xXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcyJ10sIHsgcXVlcnlQYXJhbXM6IHsgcGFnZTogMiB9LCAgcXVlcnlQYXJhbXNIYW5kbGluZzogXCJwcmVzZXJ2ZVwiXG4gICAqIH0pO1xuICAgKiBgYGBcbiAgICogVGhlIFwibWVyZ2VcIiBvcHRpb24gYXBwZW5kcyBuZXcgcXVlcnkgcGFyYW1zIHRvIHRoZSBwYXJhbXMgZnJvbSB0aGUgY3VycmVudCBVUkw6XG4gICAqIGBgYFxuICAgKiAvLyBmcm9tIC92aWV3MT9wYWdlPTEgdG8vdmlldzI/cGFnZT0xJm90aGVyS2V5PTJcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldzInXSwgeyBxdWVyeVBhcmFtczogeyBvdGhlcktleTogMiB9LCAgcXVlcnlQYXJhbXNIYW5kbGluZzogXCJtZXJnZVwiXG4gICAqIH0pO1xuICAgKiBgYGBcbiAgICogSW4gY2FzZSBvZiBhIGtleSBjb2xsaXNpb24gYmV0d2VlbiBjdXJyZW50IHBhcmFtZXRlcnMgYW5kIHRob3NlIGluIHRoZSBgcXVlcnlQYXJhbXNgIG9iamVjdCxcbiAgICogdGhlIG5ldyB2YWx1ZSBpcyB1c2VkLlxuICAgKlxuICAgKi9cbiAgcXVlcnlQYXJhbXNIYW5kbGluZz86IFF1ZXJ5UGFyYW1zSGFuZGxpbmd8bnVsbDtcblxuICAvKipcbiAgICogV2hlbiB0cnVlLCBwcmVzZXJ2ZXMgdGhlIFVSTCBmcmFnbWVudCBmb3IgdGhlIG5leHQgbmF2aWdhdGlvblxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gUHJlc2VydmUgZnJhZ21lbnQgZnJvbSAvcmVzdWx0cyN0b3AgdG8gL3ZpZXcjdG9wXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBwcmVzZXJ2ZUZyYWdtZW50OiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHByZXNlcnZlRnJhZ21lbnQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIE9wdGlvbnMgdGhhdCBtb2RpZnkgdGhlIGBSb3V0ZXJgIG5hdmlnYXRpb24gc3RyYXRlZ3kuXG4gKiBTdXBwbHkgYW4gb2JqZWN0IGNvbnRhaW5pbmcgYW55IG9mIHRoZXNlIHByb3BlcnRpZXMgdG8gYSBgUm91dGVyYCBuYXZpZ2F0aW9uIGZ1bmN0aW9uIHRvXG4gKiBjb250cm9sIGhvdyB0aGUgdGFyZ2V0IFVSTCBzaG91bGQgYmUgY29uc3RydWN0ZWQgb3IgaW50ZXJwcmV0ZWQuXG4gKlxuICogQHNlZSBbUm91dGVyLm5hdmlnYXRlKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNuYXZpZ2F0ZSlcbiAqIEBzZWUgW1JvdXRlci5uYXZpZ2F0ZUJ5VXJsKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNuYXZpZ2F0ZWJ5dXJsKVxuICogQHNlZSBbUm91dGVyLmNyZWF0ZVVybFRyZWUoKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI2NyZWF0ZXVybHRyZWUpXG4gKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpXG4gKiBAc2VlIFVybENyZWF0aW9uT3B0aW9uc1xuICogQHNlZSBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5hdmlnYXRpb25FeHRyYXMgZXh0ZW5kcyBVcmxDcmVhdGlvbk9wdGlvbnMsIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMge31cblxuZnVuY3Rpb24gZGVmYXVsdEVycm9ySGFuZGxlcihlcnJvcjogYW55KTogYW55IHtcbiAgdGhyb3cgZXJyb3I7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRNYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIoXG4gICAgZXJyb3I6IFVSSUVycm9yLCB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLCB1cmw6IHN0cmluZyk6IFVybFRyZWUge1xuICByZXR1cm4gdXJsU2VyaWFsaXplci5wYXJzZSgnLycpO1xufVxuXG5leHBvcnQgdHlwZSBSZXN0b3JlZFN0YXRlID0ge1xuICBbazogc3RyaW5nXTogYW55LFxuICAvLyBUT0RPKCMyNzYwNyk6IFJlbW92ZSBgbmF2aWdhdGlvbklkYCBhbmQgYMm1cm91dGVyUGFnZUlkYCBhbmQgbW92ZSB0byBgbmdgIG9yIGDJtWAgbmFtZXNwYWNlLlxuICBuYXZpZ2F0aW9uSWQ6IG51bWJlcixcbiAgLy8gVGhlIGDJtWAgcHJlZml4IGlzIHRoZXJlIHRvIHJlZHVjZSB0aGUgY2hhbmNlIG9mIGNvbGxpZGluZyB3aXRoIGFueSBleGlzdGluZyB1c2VyIHByb3BlcnRpZXMgb25cbiAgLy8gdGhlIGhpc3Rvcnkgc3RhdGUuXG4gIMm1cm91dGVyUGFnZUlkPzogbnVtYmVyLFxufTtcblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCBhIG5hdmlnYXRpb24gb3BlcmF0aW9uLlxuICogUmV0cmlldmUgdGhlIG1vc3QgcmVjZW50IG5hdmlnYXRpb24gb2JqZWN0IHdpdGggdGhlXG4gKiBbUm91dGVyLmdldEN1cnJlbnROYXZpZ2F0aW9uKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNnZXRjdXJyZW50bmF2aWdhdGlvbikgLlxuICpcbiAqICogKmlkKiA6IFRoZSB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY3VycmVudCBuYXZpZ2F0aW9uLlxuICogKiAqaW5pdGlhbFVybCogOiBUaGUgdGFyZ2V0IFVSTCBwYXNzZWQgaW50byB0aGUgYFJvdXRlciNuYXZpZ2F0ZUJ5VXJsKClgIGNhbGwgYmVmb3JlIG5hdmlnYXRpb24uXG4gKiBUaGlzIGlzIHRoZSB2YWx1ZSBiZWZvcmUgdGhlIHJvdXRlciBoYXMgcGFyc2VkIG9yIGFwcGxpZWQgcmVkaXJlY3RzIHRvIGl0LlxuICogKiAqZXh0cmFjdGVkVXJsKiA6IFRoZSBpbml0aWFsIHRhcmdldCBVUkwgYWZ0ZXIgYmVpbmcgcGFyc2VkIHdpdGggYFVybFNlcmlhbGl6ZXIuZXh0cmFjdCgpYC5cbiAqICogKmZpbmFsVXJsKiA6IFRoZSBleHRyYWN0ZWQgVVJMIGFmdGVyIHJlZGlyZWN0cyBoYXZlIGJlZW4gYXBwbGllZC5cbiAqIFRoaXMgVVJMIG1heSBub3QgYmUgYXZhaWxhYmxlIGltbWVkaWF0ZWx5LCB0aGVyZWZvcmUgdGhpcyBwcm9wZXJ0eSBjYW4gYmUgYHVuZGVmaW5lZGAuXG4gKiBJdCBpcyBndWFyYW50ZWVkIHRvIGJlIHNldCBhZnRlciB0aGUgYFJvdXRlc1JlY29nbml6ZWRgIGV2ZW50IGZpcmVzLlxuICogKiAqdHJpZ2dlciogOiBJZGVudGlmaWVzIGhvdyB0aGlzIG5hdmlnYXRpb24gd2FzIHRyaWdnZXJlZC5cbiAqIC0tICdpbXBlcmF0aXZlJy0tVHJpZ2dlcmVkIGJ5IGByb3V0ZXIubmF2aWdhdGVCeVVybGAgb3IgYHJvdXRlci5uYXZpZ2F0ZWAuXG4gKiAtLSAncG9wc3RhdGUnLS1UcmlnZ2VyZWQgYnkgYSBwb3BzdGF0ZSBldmVudC5cbiAqIC0tICdoYXNoY2hhbmdlJy0tVHJpZ2dlcmVkIGJ5IGEgaGFzaGNoYW5nZSBldmVudC5cbiAqICogKmV4dHJhcyogOiBBIGBOYXZpZ2F0aW9uRXh0cmFzYCBvcHRpb25zIG9iamVjdCB0aGF0IGNvbnRyb2xsZWQgdGhlIHN0cmF0ZWd5IHVzZWQgZm9yIHRoaXNcbiAqIG5hdmlnYXRpb24uXG4gKiAqICpwcmV2aW91c05hdmlnYXRpb24qIDogVGhlIHByZXZpb3VzbHkgc3VjY2Vzc2Z1bCBgTmF2aWdhdGlvbmAgb2JqZWN0LiBPbmx5IG9uZSBwcmV2aW91c1xuICogbmF2aWdhdGlvbiBpcyBhdmFpbGFibGUsIHRoZXJlZm9yZSB0aGlzIHByZXZpb3VzIGBOYXZpZ2F0aW9uYCBvYmplY3QgaGFzIGEgYG51bGxgIHZhbHVlIGZvciBpdHNcbiAqIG93biBgcHJldmlvdXNOYXZpZ2F0aW9uYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmF2aWdhdGlvbiB7XG4gIC8qKlxuICAgKiBUaGUgdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGN1cnJlbnQgbmF2aWdhdGlvbi5cbiAgICovXG4gIGlkOiBudW1iZXI7XG4gIC8qKlxuICAgKiBUaGUgdGFyZ2V0IFVSTCBwYXNzZWQgaW50byB0aGUgYFJvdXRlciNuYXZpZ2F0ZUJ5VXJsKClgIGNhbGwgYmVmb3JlIG5hdmlnYXRpb24uIFRoaXMgaXNcbiAgICogdGhlIHZhbHVlIGJlZm9yZSB0aGUgcm91dGVyIGhhcyBwYXJzZWQgb3IgYXBwbGllZCByZWRpcmVjdHMgdG8gaXQuXG4gICAqL1xuICBpbml0aWFsVXJsOiBVcmxUcmVlO1xuICAvKipcbiAgICogVGhlIGluaXRpYWwgdGFyZ2V0IFVSTCBhZnRlciBiZWluZyBwYXJzZWQgd2l0aCBgVXJsSGFuZGxpbmdTdHJhdGVneS5leHRyYWN0KClgLlxuICAgKi9cbiAgZXh0cmFjdGVkVXJsOiBVcmxUcmVlO1xuICAvKipcbiAgICogVGhlIGV4dHJhY3RlZCBVUkwgYWZ0ZXIgcmVkaXJlY3RzIGhhdmUgYmVlbiBhcHBsaWVkLlxuICAgKiBUaGlzIFVSTCBtYXkgbm90IGJlIGF2YWlsYWJsZSBpbW1lZGlhdGVseSwgdGhlcmVmb3JlIHRoaXMgcHJvcGVydHkgY2FuIGJlIGB1bmRlZmluZWRgLlxuICAgKiBJdCBpcyBndWFyYW50ZWVkIHRvIGJlIHNldCBhZnRlciB0aGUgYFJvdXRlc1JlY29nbml6ZWRgIGV2ZW50IGZpcmVzLlxuICAgKi9cbiAgZmluYWxVcmw/OiBVcmxUcmVlO1xuICAvKipcbiAgICogSWRlbnRpZmllcyBob3cgdGhpcyBuYXZpZ2F0aW9uIHdhcyB0cmlnZ2VyZWQuXG4gICAqXG4gICAqICogJ2ltcGVyYXRpdmUnLS1UcmlnZ2VyZWQgYnkgYHJvdXRlci5uYXZpZ2F0ZUJ5VXJsYCBvciBgcm91dGVyLm5hdmlnYXRlYC5cbiAgICogKiAncG9wc3RhdGUnLS1UcmlnZ2VyZWQgYnkgYSBwb3BzdGF0ZSBldmVudC5cbiAgICogKiAnaGFzaGNoYW5nZSctLVRyaWdnZXJlZCBieSBhIGhhc2hjaGFuZ2UgZXZlbnQuXG4gICAqL1xuICB0cmlnZ2VyOiAnaW1wZXJhdGl2ZSd8J3BvcHN0YXRlJ3wnaGFzaGNoYW5nZSc7XG4gIC8qKlxuICAgKiBPcHRpb25zIHRoYXQgY29udHJvbGxlZCB0aGUgc3RyYXRlZ3kgdXNlZCBmb3IgdGhpcyBuYXZpZ2F0aW9uLlxuICAgKiBTZWUgYE5hdmlnYXRpb25FeHRyYXNgLlxuICAgKi9cbiAgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzO1xuICAvKipcbiAgICogVGhlIHByZXZpb3VzbHkgc3VjY2Vzc2Z1bCBgTmF2aWdhdGlvbmAgb2JqZWN0LiBPbmx5IG9uZSBwcmV2aW91cyBuYXZpZ2F0aW9uXG4gICAqIGlzIGF2YWlsYWJsZSwgdGhlcmVmb3JlIHRoaXMgcHJldmlvdXMgYE5hdmlnYXRpb25gIG9iamVjdCBoYXMgYSBgbnVsbGAgdmFsdWVcbiAgICogZm9yIGl0cyBvd24gYHByZXZpb3VzTmF2aWdhdGlvbmAuXG4gICAqL1xuICBwcmV2aW91c05hdmlnYXRpb246IE5hdmlnYXRpb258bnVsbDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBOYXZpZ2F0aW9uVHJhbnNpdGlvbiB7XG4gIGlkOiBudW1iZXI7XG4gIHRhcmdldFBhZ2VJZDogbnVtYmVyO1xuICBjdXJyZW50VXJsVHJlZTogVXJsVHJlZTtcbiAgY3VycmVudFJhd1VybDogVXJsVHJlZTtcbiAgZXh0cmFjdGVkVXJsOiBVcmxUcmVlO1xuICB1cmxBZnRlclJlZGlyZWN0cz86IFVybFRyZWU7XG4gIHJhd1VybDogVXJsVHJlZTtcbiAgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzO1xuICByZXNvbHZlOiBhbnk7XG4gIHJlamVjdDogYW55O1xuICBwcm9taXNlOiBQcm9taXNlPGJvb2xlYW4+O1xuICBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyO1xuICByZXN0b3JlZFN0YXRlOiBSZXN0b3JlZFN0YXRlfG51bGw7XG4gIGN1cnJlbnRTbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdDtcbiAgdGFyZ2V0U25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3R8bnVsbDtcbiAgY3VycmVudFJvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZTtcbiAgdGFyZ2V0Um91dGVyU3RhdGU6IFJvdXRlclN0YXRlfG51bGw7XG4gIGd1YXJkczogQ2hlY2tzO1xuICBndWFyZHNSZXN1bHQ6IGJvb2xlYW58VXJsVHJlZXxudWxsO1xufVxuXG4vKipcbiAqIFRoZSBlcXVpdmFsZW50IGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2Agb3B0aW9ucyBmb3IgYFJvdXRlci5pc0FjdGl2ZWAgaXMgY2FsbGVkIHdpdGggYHRydWVgXG4gKiAoZXhhY3QgPSB0cnVlKS5cbiAqL1xuZXhwb3J0IGNvbnN0IGV4YWN0TWF0Y2hPcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucyA9IHtcbiAgcGF0aHM6ICdleGFjdCcsXG4gIGZyYWdtZW50OiAnaWdub3JlZCcsXG4gIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnLFxuICBxdWVyeVBhcmFtczogJ2V4YWN0J1xufTtcblxuLyoqXG4gKiBUaGUgZXF1aXZhbGVudCBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIG9wdGlvbnMgZm9yIGBSb3V0ZXIuaXNBY3RpdmVgIGlzIGNhbGxlZCB3aXRoIGBmYWxzZWBcbiAqIChleGFjdCA9IGZhbHNlKS5cbiAqL1xuZXhwb3J0IGNvbnN0IHN1YnNldE1hdGNoT3B0aW9uczogSXNBY3RpdmVNYXRjaE9wdGlvbnMgPSB7XG4gIHBhdGhzOiAnc3Vic2V0JyxcbiAgZnJhZ21lbnQ6ICdpZ25vcmVkJyxcbiAgbWF0cml4UGFyYW1zOiAnaWdub3JlZCcsXG4gIHF1ZXJ5UGFyYW1zOiAnc3Vic2V0J1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2lnbkV4dHJhT3B0aW9uc1RvUm91dGVyKG9wdHM6IEV4dHJhT3B0aW9ucywgcm91dGVyOiBSb3V0ZXIpOiB2b2lkIHtcbiAgaWYgKG9wdHMuZXJyb3JIYW5kbGVyKSB7XG4gICAgcm91dGVyLmVycm9ySGFuZGxlciA9IG9wdHMuZXJyb3JIYW5kbGVyO1xuICB9XG5cbiAgaWYgKG9wdHMubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyKSB7XG4gICAgcm91dGVyLm1hbGZvcm1lZFVyaUVycm9ySGFuZGxlciA9IG9wdHMubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyO1xuICB9XG5cbiAgaWYgKG9wdHMub25TYW1lVXJsTmF2aWdhdGlvbikge1xuICAgIHJvdXRlci5vblNhbWVVcmxOYXZpZ2F0aW9uID0gb3B0cy5vblNhbWVVcmxOYXZpZ2F0aW9uO1xuICB9XG5cbiAgaWYgKG9wdHMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSkge1xuICAgIHJvdXRlci5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5ID0gb3B0cy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5O1xuICB9XG5cbiAgaWYgKG9wdHMudXJsVXBkYXRlU3RyYXRlZ3kpIHtcbiAgICByb3V0ZXIudXJsVXBkYXRlU3RyYXRlZ3kgPSBvcHRzLnVybFVwZGF0ZVN0cmF0ZWd5O1xuICB9XG5cbiAgaWYgKG9wdHMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbikge1xuICAgIHJvdXRlci5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID0gb3B0cy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cFJvdXRlcigpIHtcbiAgY29uc3QgdXJsU2VyaWFsaXplciA9IGluamVjdChVcmxTZXJpYWxpemVyKTtcbiAgY29uc3QgY29udGV4dHMgPSBpbmplY3QoQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk7XG4gIGNvbnN0IGxvY2F0aW9uID0gaW5qZWN0KExvY2F0aW9uKTtcbiAgY29uc3QgaW5qZWN0b3IgPSBpbmplY3QoSW5qZWN0b3IpO1xuICBjb25zdCBjb21waWxlciA9IGluamVjdChDb21waWxlcik7XG4gIGNvbnN0IGNvbmZpZyA9IGluamVjdChST1VURVMsIHtvcHRpb25hbDogdHJ1ZX0pID8/IFtdO1xuICBjb25zdCBvcHRzID0gaW5qZWN0KFJPVVRFUl9DT05GSUdVUkFUSU9OLCB7b3B0aW9uYWw6IHRydWV9KSA/PyB7fTtcbiAgY29uc3QgZGVmYXVsdFRpdGxlU3RyYXRlZ3kgPSBpbmplY3QoRGVmYXVsdFRpdGxlU3RyYXRlZ3kpO1xuICBjb25zdCB0aXRsZVN0cmF0ZWd5ID0gaW5qZWN0KFRpdGxlU3RyYXRlZ3ksIHtvcHRpb25hbDogdHJ1ZX0pO1xuICBjb25zdCB1cmxIYW5kbGluZ1N0cmF0ZWd5ID0gaW5qZWN0KFVybEhhbmRsaW5nU3RyYXRlZ3ksIHtvcHRpb25hbDogdHJ1ZX0pO1xuICBjb25zdCByb3V0ZVJldXNlU3RyYXRlZ3kgPSBpbmplY3QoUm91dGVSZXVzZVN0cmF0ZWd5LCB7b3B0aW9uYWw6IHRydWV9KTtcbiAgY29uc3Qgcm91dGVyID1cbiAgICAgIG5ldyBSb3V0ZXIobnVsbCwgdXJsU2VyaWFsaXplciwgY29udGV4dHMsIGxvY2F0aW9uLCBpbmplY3RvciwgY29tcGlsZXIsIGZsYXR0ZW4oY29uZmlnKSk7XG5cbiAgaWYgKHVybEhhbmRsaW5nU3RyYXRlZ3kpIHtcbiAgICByb3V0ZXIudXJsSGFuZGxpbmdTdHJhdGVneSA9IHVybEhhbmRsaW5nU3RyYXRlZ3k7XG4gIH1cblxuICBpZiAocm91dGVSZXVzZVN0cmF0ZWd5KSB7XG4gICAgcm91dGVyLnJvdXRlUmV1c2VTdHJhdGVneSA9IHJvdXRlUmV1c2VTdHJhdGVneTtcbiAgfVxuXG4gIHJvdXRlci50aXRsZVN0cmF0ZWd5ID0gdGl0bGVTdHJhdGVneSA/PyBkZWZhdWx0VGl0bGVTdHJhdGVneTtcblxuICBhc3NpZ25FeHRyYU9wdGlvbnNUb1JvdXRlcihvcHRzLCByb3V0ZXIpO1xuXG4gIHJldHVybiByb3V0ZXI7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQSBzZXJ2aWNlIHRoYXQgcHJvdmlkZXMgbmF2aWdhdGlvbiBhbW9uZyB2aWV3cyBhbmQgVVJMIG1hbmlwdWxhdGlvbiBjYXBhYmlsaXRpZXMuXG4gKlxuICogQHNlZSBgUm91dGVgLlxuICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBHdWlkZV0oZ3VpZGUvcm91dGVyKS5cbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSh7XG4gIHByb3ZpZGVkSW46ICdyb290JyxcbiAgdXNlRmFjdG9yeTogc2V0dXBSb3V0ZXIsXG59KVxuZXhwb3J0IGNsYXNzIFJvdXRlciB7XG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIHRoZSBhY3RpdmF0ZWQgYFVybFRyZWVgIHRoYXQgdGhlIGBSb3V0ZXJgIGlzIGNvbmZpZ3VyZWQgdG8gaGFuZGxlICh0aHJvdWdoXG4gICAqIGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCkuIFRoYXQgaXMsIGFmdGVyIHdlIGZpbmQgdGhlIHJvdXRlIGNvbmZpZyB0cmVlIHRoYXQgd2UncmUgZ29pbmcgdG9cbiAgICogYWN0aXZhdGUsIHJ1biBndWFyZHMsIGFuZCBhcmUganVzdCBhYm91dCB0byBhY3RpdmF0ZSB0aGUgcm91dGUsIHdlIHNldCB0aGUgY3VycmVudFVybFRyZWUuXG4gICAqXG4gICAqIFRoaXMgc2hvdWxkIG1hdGNoIHRoZSBgYnJvd3NlclVybFRyZWVgIHdoZW4gYSBuYXZpZ2F0aW9uIHN1Y2NlZWRzLiBJZiB0aGVcbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybGAgaXMgYGZhbHNlYCwgb25seSB0aGUgYGJyb3dzZXJVcmxUcmVlYCBpcyB1cGRhdGVkLlxuICAgKi9cbiAgcHJpdmF0ZSBjdXJyZW50VXJsVHJlZTogVXJsVHJlZTtcbiAgLyoqXG4gICAqIE1lYW50IHRvIHJlcHJlc2VudCB0aGUgZW50aXJlIGJyb3dzZXIgdXJsIGFmdGVyIGEgc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uLiBJbiB0aGUgbGlmZSBvZiBhXG4gICAqIG5hdmlnYXRpb24gdHJhbnNpdGlvbjpcbiAgICogMS4gVGhlIHJhd1VybCByZXByZXNlbnRzIHRoZSBmdWxsIFVSTCB0aGF0J3MgYmVpbmcgbmF2aWdhdGVkIHRvXG4gICAqIDIuIFdlIGFwcGx5IHJlZGlyZWN0cywgd2hpY2ggbWlnaHQgb25seSBhcHBseSB0byBfcGFydF8gb2YgdGhlIFVSTCAoZHVlIHRvXG4gICAqIGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCkuXG4gICAqIDMuIFJpZ2h0IGJlZm9yZSBhY3RpdmF0aW9uIChiZWNhdXNlIHdlIGFzc3VtZSBhY3RpdmF0aW9uIHdpbGwgc3VjY2VlZCksIHdlIHVwZGF0ZSB0aGVcbiAgICogcmF3VXJsVHJlZSB0byBiZSBhIGNvbWJpbmF0aW9uIG9mIHRoZSB1cmxBZnRlclJlZGlyZWN0cyAoYWdhaW4sIHRoaXMgbWlnaHQgb25seSBhcHBseSB0byBwYXJ0XG4gICAqIG9mIHRoZSBpbml0aWFsIHVybCkgYW5kIHRoZSByYXdVcmwgb2YgdGhlIHRyYW5zaXRpb24gKHdoaWNoIHdhcyB0aGUgb3JpZ2luYWwgbmF2aWdhdGlvbiB1cmwgaW5cbiAgICogaXRzIGZ1bGwgZm9ybSkuXG4gICAqL1xuICBwcml2YXRlIHJhd1VybFRyZWU6IFVybFRyZWU7XG4gIC8qKlxuICAgKiBNZWFudCB0byByZXByZXNlbnQgdGhlIHBhcnQgb2YgdGhlIGJyb3dzZXIgdXJsIHRoYXQgdGhlIGBSb3V0ZXJgIGlzIHNldCB1cCB0byBoYW5kbGUgKHZpYSB0aGVcbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3lgKS4gVGhpcyB2YWx1ZSBpcyB1cGRhdGVkIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBicm93c2VyIHVybCBpcyB1cGRhdGVkIChvclxuICAgKiB0aGUgYnJvd3NlciB1cmwgdXBkYXRlIGlzIHNraXBwZWQgdmlhIGBza2lwTG9jYXRpb25DaGFuZ2VgKS4gV2l0aCB0aGF0LCBub3RlIHRoYXRcbiAgICogYGJyb3dzZXJVcmxUcmVlYCBfbWF5IG5vdF8gcmVmbGVjdCB0aGUgYWN0dWFsIGJyb3dzZXIgVVJMIGZvciB0d28gcmVhc29uczpcbiAgICpcbiAgICogMS4gYFVybEhhbmRsaW5nU3RyYXRlZ3lgIG9ubHkgaGFuZGxlcyBwYXJ0IG9mIHRoZSBVUkxcbiAgICogMi4gYHNraXBMb2NhdGlvbkNoYW5nZWAgZG9lcyBub3QgdXBkYXRlIHRoZSBicm93c2VyIHVybC5cbiAgICpcbiAgICogU28gdG8gcmVpdGVyYXRlLCBgYnJvd3NlclVybFRyZWVgIG9ubHkgcmVwcmVzZW50cyB0aGUgUm91dGVyJ3MgaW50ZXJuYWwgdW5kZXJzdGFuZGluZyBvZiB0aGVcbiAgICogY3VycmVudCByb3V0ZSwgZWl0aGVyIGJlZm9yZSBndWFyZHMgd2l0aCBgdXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcidgIG9yIHJpZ2h0IGJlZm9yZVxuICAgKiBhY3RpdmF0aW9uIHdpdGggYCdkZWZlcnJlZCdgLlxuICAgKlxuICAgKiBUaGlzIHNob3VsZCBtYXRjaCB0aGUgYGN1cnJlbnRVcmxUcmVlYCB3aGVuIHRoZSBuYXZpZ2F0aW9uIHN1Y2NlZWRzLlxuICAgKi9cbiAgcHJpdmF0ZSBicm93c2VyVXJsVHJlZTogVXJsVHJlZTtcbiAgcHJpdmF0ZSByZWFkb25seSB0cmFuc2l0aW9uczogQmVoYXZpb3JTdWJqZWN0PE5hdmlnYXRpb25UcmFuc2l0aW9uPjtcbiAgcHJpdmF0ZSBuYXZpZ2F0aW9uczogT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj47XG4gIHByaXZhdGUgbGFzdFN1Y2Nlc3NmdWxOYXZpZ2F0aW9uOiBOYXZpZ2F0aW9ufG51bGwgPSBudWxsO1xuICBwcml2YXRlIGN1cnJlbnROYXZpZ2F0aW9uOiBOYXZpZ2F0aW9ufG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRpc3Bvc2VkID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBsb2NhdGlvblN1YnNjcmlwdGlvbj86IFN1YnNjcmlwdGlvbkxpa2U7XG4gIHByaXZhdGUgbmF2aWdhdGlvbklkOiBudW1iZXIgPSAwO1xuXG4gIC8qKlxuICAgKiBUaGUgaWQgb2YgdGhlIGN1cnJlbnRseSBhY3RpdmUgcGFnZSBpbiB0aGUgcm91dGVyLlxuICAgKiBVcGRhdGVkIHRvIHRoZSB0cmFuc2l0aW9uJ3MgdGFyZ2V0IGlkIG9uIGEgc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBUaGlzIGlzIHVzZWQgdG8gdHJhY2sgd2hhdCBwYWdlIHRoZSByb3V0ZXIgbGFzdCBhY3RpdmF0ZWQuIFdoZW4gYW4gYXR0ZW1wdGVkIG5hdmlnYXRpb24gZmFpbHMsXG4gICAqIHRoZSByb3V0ZXIgY2FuIHRoZW4gdXNlIHRoaXMgdG8gY29tcHV0ZSBob3cgdG8gcmVzdG9yZSB0aGUgc3RhdGUgYmFjayB0byB0aGUgcHJldmlvdXNseSBhY3RpdmVcbiAgICogcGFnZS5cbiAgICovXG4gIHByaXZhdGUgY3VycmVudFBhZ2VJZDogbnVtYmVyID0gMDtcbiAgLyoqXG4gICAqIFRoZSDJtXJvdXRlclBhZ2VJZCBvZiB3aGF0ZXZlciBwYWdlIGlzIGN1cnJlbnRseSBhY3RpdmUgaW4gdGhlIGJyb3dzZXIgaGlzdG9yeS4gVGhpcyBpc1xuICAgKiBpbXBvcnRhbnQgZm9yIGNvbXB1dGluZyB0aGUgdGFyZ2V0IHBhZ2UgaWQgZm9yIG5ldyBuYXZpZ2F0aW9ucyBiZWNhdXNlIHdlIG5lZWQgdG8gZW5zdXJlIGVhY2hcbiAgICogcGFnZSBpZCBpbiB0aGUgYnJvd3NlciBoaXN0b3J5IGlzIDEgbW9yZSB0aGFuIHRoZSBwcmV2aW91cyBlbnRyeS5cbiAgICovXG4gIHByaXZhdGUgZ2V0IGJyb3dzZXJQYWdlSWQoKTogbnVtYmVyfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuICh0aGlzLmxvY2F0aW9uLmdldFN0YXRlKCkgYXMgUmVzdG9yZWRTdGF0ZSB8IG51bGwpPy7JtXJvdXRlclBhZ2VJZDtcbiAgfVxuICBwcml2YXRlIGNvbmZpZ0xvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyO1xuICBwcml2YXRlIG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+O1xuICBwcml2YXRlIGNvbnNvbGU6IENvbnNvbGU7XG4gIHByaXZhdGUgaXNOZ1pvbmVFbmFibGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEFuIGV2ZW50IHN0cmVhbSBmb3Igcm91dGluZyBldmVudHMgaW4gdGhpcyBOZ01vZHVsZS5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBldmVudHM6IE9ic2VydmFibGU8RXZlbnQ+ID0gbmV3IFN1YmplY3Q8RXZlbnQ+KCk7XG4gIC8qKlxuICAgKiBUaGUgY3VycmVudCBzdGF0ZSBvZiByb3V0aW5nIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgcm91dGVyU3RhdGU6IFJvdXRlclN0YXRlO1xuXG4gIC8qKlxuICAgKiBBIGhhbmRsZXIgZm9yIG5hdmlnYXRpb24gZXJyb3JzIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqL1xuICBlcnJvckhhbmRsZXI6IEVycm9ySGFuZGxlciA9IGRlZmF1bHRFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIEEgaGFuZGxlciBmb3IgZXJyb3JzIHRocm93biBieSBgUm91dGVyLnBhcnNlVXJsKHVybClgXG4gICAqIHdoZW4gYHVybGAgY29udGFpbnMgYW4gaW52YWxpZCBjaGFyYWN0ZXIuXG4gICAqIFRoZSBtb3N0IGNvbW1vbiBjYXNlIGlzIGEgYCVgIHNpZ25cbiAgICogdGhhdCdzIG5vdCBlbmNvZGVkIGFuZCBpcyBub3QgcGFydCBvZiBhIHBlcmNlbnQgZW5jb2RlZCBzZXF1ZW5jZS5cbiAgICovXG4gIG1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcjpcbiAgICAgIChlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgICAgdXJsOiBzdHJpbmcpID0+IFVybFRyZWUgPSBkZWZhdWx0TWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyO1xuXG4gIC8qKlxuICAgKiBUcnVlIGlmIGF0IGxlYXN0IG9uZSBuYXZpZ2F0aW9uIGV2ZW50IGhhcyBvY2N1cnJlZCxcbiAgICogZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgbmF2aWdhdGVkOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgbGFzdFN1Y2Nlc3NmdWxJZDogbnVtYmVyID0gLTE7XG5cbiAgLyoqXG4gICAqIEhvb2sgdGhhdCBlbmFibGVzIHlvdSB0byBwYXVzZSBuYXZpZ2F0aW9uIGFmdGVyIHRoZSBwcmVhY3RpdmF0aW9uIHBoYXNlLlxuICAgKiBVc2VkIGJ5IGBSb3V0ZXJNb2R1bGVgLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGFmdGVyUHJlYWN0aXZhdGlvbjogKCkgPT4gT2JzZXJ2YWJsZTx2b2lkPiA9ICgpID0+IG9mKHZvaWQgMCk7XG5cbiAgLyoqXG4gICAqIEEgc3RyYXRlZ3kgZm9yIGV4dHJhY3RpbmcgYW5kIG1lcmdpbmcgVVJMcy5cbiAgICogVXNlZCBmb3IgQW5ndWxhckpTIHRvIEFuZ3VsYXIgbWlncmF0aW9ucy5cbiAgICovXG4gIHVybEhhbmRsaW5nU3RyYXRlZ3k6IFVybEhhbmRsaW5nU3RyYXRlZ3kgPSBuZXcgRGVmYXVsdFVybEhhbmRsaW5nU3RyYXRlZ3koKTtcblxuICAvKipcbiAgICogQSBzdHJhdGVneSBmb3IgcmUtdXNpbmcgcm91dGVzLlxuICAgKi9cbiAgcm91dGVSZXVzZVN0cmF0ZWd5OiBSb3V0ZVJldXNlU3RyYXRlZ3kgPSBuZXcgRGVmYXVsdFJvdXRlUmV1c2VTdHJhdGVneSgpO1xuXG4gIC8qKlxuICAgKiBBIHN0cmF0ZWd5IGZvciBzZXR0aW5nIHRoZSB0aXRsZSBiYXNlZCBvbiB0aGUgYHJvdXRlclN0YXRlYC5cbiAgICovXG4gIHRpdGxlU3RyYXRlZ3k/OiBUaXRsZVN0cmF0ZWd5O1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gaGFuZGxlIGEgbmF2aWdhdGlvbiByZXF1ZXN0IHRvIHRoZSBjdXJyZW50IFVSTC4gT25lIG9mOlxuICAgKlxuICAgKiAtIGAnaWdub3JlJ2AgOiAgVGhlIHJvdXRlciBpZ25vcmVzIHRoZSByZXF1ZXN0LlxuICAgKiAtIGAncmVsb2FkJ2AgOiBUaGUgcm91dGVyIHJlbG9hZHMgdGhlIFVSTC4gVXNlIHRvIGltcGxlbWVudCBhIFwicmVmcmVzaFwiIGZlYXR1cmUuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGlzIG9ubHkgY29uZmlndXJlcyB3aGV0aGVyIHRoZSBSb3V0ZSByZXByb2Nlc3NlcyB0aGUgVVJMIGFuZCB0cmlnZ2VycyByZWxhdGVkXG4gICAqIGFjdGlvbiBhbmQgZXZlbnRzIGxpa2UgcmVkaXJlY3RzLCBndWFyZHMsIGFuZCByZXNvbHZlcnMuIEJ5IGRlZmF1bHQsIHRoZSByb3V0ZXIgcmUtdXNlcyBhXG4gICAqIGNvbXBvbmVudCBpbnN0YW5jZSB3aGVuIGl0IHJlLW5hdmlnYXRlcyB0byB0aGUgc2FtZSBjb21wb25lbnQgdHlwZSB3aXRob3V0IHZpc2l0aW5nIGEgZGlmZmVyZW50XG4gICAqIGNvbXBvbmVudCBmaXJzdC4gVGhpcyBiZWhhdmlvciBpcyBjb25maWd1cmVkIGJ5IHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YC4gSW4gb3JkZXIgdG8gcmVsb2FkXG4gICAqIHJvdXRlZCBjb21wb25lbnRzIG9uIHNhbWUgdXJsIG5hdmlnYXRpb24sIHlvdSBuZWVkIHRvIHNldCBgb25TYW1lVXJsTmF2aWdhdGlvbmAgdG8gYCdyZWxvYWQnYFxuICAgKiBfYW5kXyBwcm92aWRlIGEgYFJvdXRlUmV1c2VTdHJhdGVneWAgd2hpY2ggcmV0dXJucyBgZmFsc2VgIGZvciBgc2hvdWxkUmV1c2VSb3V0ZWAuXG4gICAqL1xuICBvblNhbWVVcmxOYXZpZ2F0aW9uOiAncmVsb2FkJ3wnaWdub3JlJyA9ICdpZ25vcmUnO1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gbWVyZ2UgcGFyYW1ldGVycywgZGF0YSwgcmVzb2x2ZWQgZGF0YSwgYW5kIHRpdGxlIGZyb20gcGFyZW50IHRvIGNoaWxkXG4gICAqIHJvdXRlcy4gT25lIG9mOlxuICAgKlxuICAgKiAtIGAnZW1wdHlPbmx5J2AgOiBJbmhlcml0IHBhcmVudCBwYXJhbWV0ZXJzLCBkYXRhLCBhbmQgcmVzb2x2ZWQgZGF0YVxuICAgKiBmb3IgcGF0aC1sZXNzIG9yIGNvbXBvbmVudC1sZXNzIHJvdXRlcy5cbiAgICogLSBgJ2Fsd2F5cydgIDogSW5oZXJpdCBwYXJlbnQgcGFyYW1ldGVycywgZGF0YSwgYW5kIHJlc29sdmVkIGRhdGFcbiAgICogZm9yIGFsbCBjaGlsZCByb3V0ZXMuXG4gICAqL1xuICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiAnZW1wdHlPbmx5J3wnYWx3YXlzJyA9ICdlbXB0eU9ubHknO1xuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZW4gdGhlIHJvdXRlciB1cGRhdGVzIHRoZSBicm93c2VyIFVSTC5cbiAgICogQnkgZGVmYXVsdCAoYFwiZGVmZXJyZWRcImApLCB1cGRhdGVzIHRoZSBicm93c2VyIFVSTCBhZnRlciBuYXZpZ2F0aW9uIGhhcyBmaW5pc2hlZC5cbiAgICogU2V0IHRvIGAnZWFnZXInYCB0byB1cGRhdGUgdGhlIGJyb3dzZXIgVVJMIGF0IHRoZSBiZWdpbm5pbmcgb2YgbmF2aWdhdGlvbi5cbiAgICogWW91IGNhbiBjaG9vc2UgdG8gdXBkYXRlIGVhcmx5IHNvIHRoYXQsIGlmIG5hdmlnYXRpb24gZmFpbHMsXG4gICAqIHlvdSBjYW4gc2hvdyBhbiBlcnJvciBtZXNzYWdlIHdpdGggdGhlIFVSTCB0aGF0IGZhaWxlZC5cbiAgICovXG4gIHVybFVwZGF0ZVN0cmF0ZWd5OiAnZGVmZXJyZWQnfCdlYWdlcicgPSAnZGVmZXJyZWQnO1xuXG4gIC8qKlxuICAgKiBDb25maWd1cmVzIGhvdyB0aGUgUm91dGVyIGF0dGVtcHRzIHRvIHJlc3RvcmUgc3RhdGUgd2hlbiBhIG5hdmlnYXRpb24gaXMgY2FuY2VsbGVkLlxuICAgKlxuICAgKiAncmVwbGFjZScgLSBBbHdheXMgdXNlcyBgbG9jYXRpb24ucmVwbGFjZVN0YXRlYCB0byBzZXQgdGhlIGJyb3dzZXIgc3RhdGUgdG8gdGhlIHN0YXRlIG9mIHRoZVxuICAgKiByb3V0ZXIgYmVmb3JlIHRoZSBuYXZpZ2F0aW9uIHN0YXJ0ZWQuIFRoaXMgbWVhbnMgdGhhdCBpZiB0aGUgVVJMIG9mIHRoZSBicm93c2VyIGlzIHVwZGF0ZWRcbiAgICogX2JlZm9yZV8gdGhlIG5hdmlnYXRpb24gaXMgY2FuY2VsZWQsIHRoZSBSb3V0ZXIgd2lsbCBzaW1wbHkgcmVwbGFjZSB0aGUgaXRlbSBpbiBoaXN0b3J5IHJhdGhlclxuICAgKiB0aGFuIHRyeWluZyB0byByZXN0b3JlIHRvIHRoZSBwcmV2aW91cyBsb2NhdGlvbiBpbiB0aGUgc2Vzc2lvbiBoaXN0b3J5LiBUaGlzIGhhcHBlbnMgbW9zdFxuICAgKiBmcmVxdWVudGx5IHdpdGggYHVybFVwZGF0ZVN0cmF0ZWd5OiAnZWFnZXInYCBhbmQgbmF2aWdhdGlvbnMgd2l0aCB0aGUgYnJvd3NlciBiYWNrL2ZvcndhcmRcbiAgICogYnV0dG9ucy5cbiAgICpcbiAgICogJ2NvbXB1dGVkJyAtIFdpbGwgYXR0ZW1wdCB0byByZXR1cm4gdG8gdGhlIHNhbWUgaW5kZXggaW4gdGhlIHNlc3Npb24gaGlzdG9yeSB0aGF0IGNvcnJlc3BvbmRzXG4gICAqIHRvIHRoZSBBbmd1bGFyIHJvdXRlIHdoZW4gdGhlIG5hdmlnYXRpb24gZ2V0cyBjYW5jZWxsZWQuIEZvciBleGFtcGxlLCBpZiB0aGUgYnJvd3NlciBiYWNrXG4gICAqIGJ1dHRvbiBpcyBjbGlja2VkIGFuZCB0aGUgbmF2aWdhdGlvbiBpcyBjYW5jZWxsZWQsIHRoZSBSb3V0ZXIgd2lsbCB0cmlnZ2VyIGEgZm9yd2FyZCBuYXZpZ2F0aW9uXG4gICAqIGFuZCB2aWNlIHZlcnNhLlxuICAgKlxuICAgKiBOb3RlOiB0aGUgJ2NvbXB1dGVkJyBvcHRpb24gaXMgaW5jb21wYXRpYmxlIHdpdGggYW55IGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCB3aGljaCBvbmx5XG4gICAqIGhhbmRsZXMgYSBwb3J0aW9uIG9mIHRoZSBVUkwgYmVjYXVzZSB0aGUgaGlzdG9yeSByZXN0b3JhdGlvbiBuYXZpZ2F0ZXMgdG8gdGhlIHByZXZpb3VzIHBsYWNlIGluXG4gICAqIHRoZSBicm93c2VyIGhpc3RvcnkgcmF0aGVyIHRoYW4gc2ltcGx5IHJlc2V0dGluZyBhIHBvcnRpb24gb2YgdGhlIFVSTC5cbiAgICpcbiAgICogVGhlIGRlZmF1bHQgdmFsdWUgaXMgYHJlcGxhY2VgLlxuICAgKlxuICAgKi9cbiAgY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbjogJ3JlcGxhY2UnfCdjb21wdXRlZCcgPSAncmVwbGFjZSc7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgdGhlIHJvdXRlciBzZXJ2aWNlLlxuICAgKi9cbiAgLy8gVE9ETzogdnNhdmtpbiBtYWtlIGludGVybmFsIGFmdGVyIHRoZSBmaW5hbCBpcyBvdXQuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+fG51bGwsIHByaXZhdGUgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICAgIHByaXZhdGUgcm9vdENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLCBwcml2YXRlIGxvY2F0aW9uOiBMb2NhdGlvbiwgaW5qZWN0b3I6IEluamVjdG9yLFxuICAgICAgY29tcGlsZXI6IENvbXBpbGVyLCBwdWJsaWMgY29uZmlnOiBSb3V0ZXMpIHtcbiAgICBjb25zdCBvbkxvYWRTdGFydCA9IChyOiBSb3V0ZSkgPT4gdGhpcy50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZFN0YXJ0KHIpKTtcbiAgICBjb25zdCBvbkxvYWRFbmQgPSAocjogUm91dGUpID0+IHRoaXMudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRFbmQocikpO1xuICAgIHRoaXMuY29uZmlnTG9hZGVyID0gaW5qZWN0b3IuZ2V0KFJvdXRlckNvbmZpZ0xvYWRlcik7XG4gICAgdGhpcy5jb25maWdMb2FkZXIub25Mb2FkRW5kTGlzdGVuZXIgPSBvbkxvYWRFbmQ7XG4gICAgdGhpcy5jb25maWdMb2FkZXIub25Mb2FkU3RhcnRMaXN0ZW5lciA9IG9uTG9hZFN0YXJ0O1xuXG4gICAgdGhpcy5uZ01vZHVsZSA9IGluamVjdG9yLmdldChOZ01vZHVsZVJlZik7XG4gICAgdGhpcy5jb25zb2xlID0gaW5qZWN0b3IuZ2V0KENvbnNvbGUpO1xuICAgIGNvbnN0IG5nWm9uZSA9IGluamVjdG9yLmdldChOZ1pvbmUpO1xuICAgIHRoaXMuaXNOZ1pvbmVFbmFibGVkID0gbmdab25lIGluc3RhbmNlb2YgTmdab25lICYmIE5nWm9uZS5pc0luQW5ndWxhclpvbmUoKTtcblxuICAgIHRoaXMucmVzZXRDb25maWcoY29uZmlnKTtcbiAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gbmV3IFVybFRyZWUoKTtcbiAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLmN1cnJlbnRVcmxUcmVlO1xuICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0aGlzLmN1cnJlbnRVcmxUcmVlO1xuXG4gICAgdGhpcy5yb3V0ZXJTdGF0ZSA9IGNyZWF0ZUVtcHR5U3RhdGUodGhpcy5jdXJyZW50VXJsVHJlZSwgdGhpcy5yb290Q29tcG9uZW50VHlwZSk7XG5cbiAgICB0aGlzLnRyYW5zaXRpb25zID0gbmV3IEJlaGF2aW9yU3ViamVjdDxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4oe1xuICAgICAgaWQ6IDAsXG4gICAgICB0YXJnZXRQYWdlSWQ6IDAsXG4gICAgICBjdXJyZW50VXJsVHJlZTogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIGN1cnJlbnRSYXdVcmw6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBleHRyYWN0ZWRVcmw6IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5leHRyYWN0KHRoaXMuY3VycmVudFVybFRyZWUpLFxuICAgICAgdXJsQWZ0ZXJSZWRpcmVjdHM6IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5leHRyYWN0KHRoaXMuY3VycmVudFVybFRyZWUpLFxuICAgICAgcmF3VXJsOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgZXh0cmFzOiB7fSxcbiAgICAgIHJlc29sdmU6IG51bGwsXG4gICAgICByZWplY3Q6IG51bGwsXG4gICAgICBwcm9taXNlOiBQcm9taXNlLnJlc29sdmUodHJ1ZSksXG4gICAgICBzb3VyY2U6ICdpbXBlcmF0aXZlJyxcbiAgICAgIHJlc3RvcmVkU3RhdGU6IG51bGwsXG4gICAgICBjdXJyZW50U25hcHNob3Q6IHRoaXMucm91dGVyU3RhdGUuc25hcHNob3QsXG4gICAgICB0YXJnZXRTbmFwc2hvdDogbnVsbCxcbiAgICAgIGN1cnJlbnRSb3V0ZXJTdGF0ZTogdGhpcy5yb3V0ZXJTdGF0ZSxcbiAgICAgIHRhcmdldFJvdXRlclN0YXRlOiBudWxsLFxuICAgICAgZ3VhcmRzOiB7Y2FuQWN0aXZhdGVDaGVja3M6IFtdLCBjYW5EZWFjdGl2YXRlQ2hlY2tzOiBbXX0sXG4gICAgICBndWFyZHNSZXN1bHQ6IG51bGwsXG4gICAgfSk7XG4gICAgdGhpcy5uYXZpZ2F0aW9ucyA9IHRoaXMuc2V0dXBOYXZpZ2F0aW9ucyh0aGlzLnRyYW5zaXRpb25zKTtcblxuICAgIHRoaXMucHJvY2Vzc05hdmlnYXRpb25zKCk7XG4gIH1cblxuICBwcml2YXRlIHNldHVwTmF2aWdhdGlvbnModHJhbnNpdGlvbnM6IE9ic2VydmFibGU8TmF2aWdhdGlvblRyYW5zaXRpb24+KTpcbiAgICAgIE9ic2VydmFibGU8TmF2aWdhdGlvblRyYW5zaXRpb24+IHtcbiAgICBjb25zdCBldmVudHNTdWJqZWN0ID0gKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KTtcbiAgICByZXR1cm4gdHJhbnNpdGlvbnMucGlwZShcbiAgICAgICAgICAgICAgIGZpbHRlcih0ID0+IHQuaWQgIT09IDApLFxuXG4gICAgICAgICAgICAgICAvLyBFeHRyYWN0IFVSTFxuICAgICAgICAgICAgICAgbWFwKHQgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgKHsuLi50LCBleHRyYWN0ZWRVcmw6IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5leHRyYWN0KHQucmF3VXJsKX0gYXNcbiAgICAgICAgICAgICAgICAgICAgICAgIE5hdmlnYXRpb25UcmFuc2l0aW9uKSksXG5cbiAgICAgICAgICAgICAgIC8vIFVzaW5nIHN3aXRjaE1hcCBzbyB3ZSBjYW5jZWwgZXhlY3V0aW5nIG5hdmlnYXRpb25zIHdoZW4gYSBuZXcgb25lIGNvbWVzIGluXG4gICAgICAgICAgICAgICBzd2l0Y2hNYXAob3ZlcmFsbFRyYW5zaXRpb25TdGF0ZSA9PiB7XG4gICAgICAgICAgICAgICAgIGxldCBjb21wbGV0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgbGV0IGVycm9yZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKG92ZXJhbGxUcmFuc2l0aW9uU3RhdGUpXG4gICAgICAgICAgICAgICAgICAgICAucGlwZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSB0aGUgTmF2aWdhdGlvbiBvYmplY3RcbiAgICAgICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogdC5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdGlhbFVybDogdC5yYXdVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZFVybDogdC5leHRyYWN0ZWRVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyaWdnZXI6IHQuc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYXM6IHQuZXh0cmFzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c05hdmlnYXRpb246IHRoaXMubGFzdFN1Y2Nlc3NmdWxOYXZpZ2F0aW9uID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsuLi50aGlzLmxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbiwgcHJldmlvdXNOYXZpZ2F0aW9uOiBudWxsfSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBudWxsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJyb3dzZXJVcmxUcmVlID0gdGhpcy5icm93c2VyVXJsVHJlZS50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsVHJhbnNpdGlvbiA9ICF0aGlzLm5hdmlnYXRlZCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuZXh0cmFjdGVkVXJsLnRvU3RyaW5nKCkgIT09IGJyb3dzZXJVcmxUcmVlIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTmF2aWdhdGlvbnMgd2hpY2ggc3VjY2VlZCBvciBvbmVzIHdoaWNoIGZhaWwgYW5kIGFyZSBjbGVhbmVkIHVwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29ycmVjdGx5IHNob3VsZCByZXN1bHQgaW4gYGJyb3dzZXJVcmxUcmVlYCBhbmQgYGN1cnJlbnRVcmxUcmVlYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1hdGNoaW5nLiBJZiB0aGlzIGlzIG5vdCB0aGUgY2FzZSwgYXNzdW1lIHNvbWV0aGluZyB3ZW50IHdyb25nIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRyeSBwcm9jZXNzaW5nIHRoZSBVUkwgYWdhaW4uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJvd3NlclVybFRyZWUgIT09IHRoaXMuY3VycmVudFVybFRyZWUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NDdXJyZW50VXJsID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5vblNhbWVVcmxOYXZpZ2F0aW9uID09PSAncmVsb2FkJyA/IHRydWUgOiB1cmxUcmFuc2l0aW9uKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5zaG91bGRQcm9jZXNzVXJsKHQucmF3VXJsKTtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvY2Vzc0N1cnJlbnRVcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIHNvdXJjZSBvZiB0aGUgbmF2aWdhdGlvbiBpcyBmcm9tIGEgYnJvd3NlciBldmVudCwgdGhlIFVSTCBpc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhbHJlYWR5IHVwZGF0ZWQuIFdlIGFscmVhZHkgbmVlZCB0byBzeW5jIHRoZSBpbnRlcm5hbCBzdGF0ZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQnJvd3NlclRyaWdnZXJlZE5hdmlnYXRpb24odC5zb3VyY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5icm93c2VyVXJsVHJlZSA9IHQuZXh0cmFjdGVkVXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvZih0KS5waXBlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZSBOYXZpZ2F0aW9uU3RhcnQgZXZlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IHRoaXMudHJhbnNpdGlvbnMuZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5ldyBOYXZpZ2F0aW9uU3RhcnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIHQuc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5yZXN0b3JlZFN0YXRlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0cmFuc2l0aW9uICE9PSB0aGlzLnRyYW5zaXRpb25zLmdldFZhbHVlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGRlbGF5IGlzIHJlcXVpcmVkIHRvIG1hdGNoIG9sZCBiZWhhdmlvciB0aGF0IGZvcmNlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuYXZpZ2F0aW9uIHRvIGFsd2F5cyBiZSBhc3luY1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFwcGx5UmVkaXJlY3RzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBseVJlZGlyZWN0cyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5nTW9kdWxlLmluamVjdG9yLCB0aGlzLmNvbmZpZ0xvYWRlciwgdGhpcy51cmxTZXJpYWxpemVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnKSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBjdXJyZW50TmF2aWdhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYHVybEFmdGVyUmVkaXJlY3RzYCBpcyBndWFyYW50ZWVkIHRvIGJlIHNldCBhZnRlciB0aGlzIHBvaW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudE5hdmlnYXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4udGhpcy5jdXJyZW50TmF2aWdhdGlvbiEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxVcmw6IHQudXJsQWZ0ZXJSZWRpcmVjdHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmFsbFRyYW5zaXRpb25TdGF0ZS51cmxBZnRlclJlZGlyZWN0cyA9IHQudXJsQWZ0ZXJSZWRpcmVjdHM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVjb2duaXplXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvZ25pemUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZ01vZHVsZS5pbmplY3RvciwgdGhpcy5yb290Q29tcG9uZW50VHlwZSwgdGhpcy5jb25maWcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cmxTZXJpYWxpemVyLCB0aGlzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kpLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGlmIGluIGBlYWdlcmAgdXBkYXRlIG1vZGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmFsbFRyYW5zaXRpb25TdGF0ZS50YXJnZXRTbmFwc2hvdCA9IHQudGFyZ2V0U25hcHNob3Q7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZWFnZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0LmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJhd1VybCA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LnVybEFmdGVyUmVkaXJlY3RzISwgdC5yYXdVcmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHJhd1VybCwgdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0LnVybEFmdGVyUmVkaXJlY3RzITtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpcmUgUm91dGVzUmVjb2duaXplZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByb3V0ZXNSZWNvZ25pemVkID0gbmV3IFJvdXRlc1JlY29nbml6ZWQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzISksIHQudGFyZ2V0U25hcHNob3QhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KHJvdXRlc1JlY29nbml6ZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc1ByZXZpb3VzVXJsID0gdXJsVHJhbnNpdGlvbiAmJiB0aGlzLnJhd1VybFRyZWUgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5zaG91bGRQcm9jZXNzVXJsKHRoaXMucmF3VXJsVHJlZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIFdoZW4gdGhlIGN1cnJlbnQgVVJMIHNob3VsZG4ndCBiZSBwcm9jZXNzZWQsIGJ1dCB0aGUgcHJldmlvdXMgb25lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIHdhcywgd2UgaGFuZGxlIHRoaXMgXCJlcnJvciBjb25kaXRpb25cIiBieSBuYXZpZ2F0aW5nIHRvIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBwcmV2aW91c2x5IHN1Y2Nlc3NmdWwgVVJMLCBidXQgbGVhdmluZyB0aGUgVVJMIGludGFjdC4qL1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvY2Vzc1ByZXZpb3VzVXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qge2lkLCBleHRyYWN0ZWRVcmwsIHNvdXJjZSwgcmVzdG9yZWRTdGF0ZSwgZXh0cmFzfSA9IHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmF2U3RhcnQgPSBuZXcgTmF2aWdhdGlvblN0YXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZCwgdGhpcy5zZXJpYWxpemVVcmwoZXh0cmFjdGVkVXJsKSwgc291cmNlLCByZXN0b3JlZFN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2U3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFNuYXBzaG90ID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlRW1wdHlTdGF0ZShleHRyYWN0ZWRVcmwsIHRoaXMucm9vdENvbXBvbmVudFR5cGUpLnNuYXBzaG90O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmFsbFRyYW5zaXRpb25TdGF0ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRTbmFwc2hvdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybEFmdGVyUmVkaXJlY3RzOiBleHRyYWN0ZWRVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYXM6IHsuLi5leHRyYXMsIHNraXBMb2NhdGlvbkNoYW5nZTogZmFsc2UsIHJlcGxhY2VVcmw6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvZihvdmVyYWxsVHJhbnNpdGlvblN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBXaGVuIG5laXRoZXIgdGhlIGN1cnJlbnQgb3IgcHJldmlvdXMgVVJMIGNhbiBiZSBwcm9jZXNzZWQsIGRvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICogbm90aGluZyBvdGhlciB0aGFuIHVwZGF0ZSByb3V0ZXIncyBpbnRlcm5hbCByZWZlcmVuY2UgdG8gdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICogY3VycmVudCBcInNldHRsZWRcIiBVUkwuIFRoaXMgd2F5IHRoZSBuZXh0IG5hdmlnYXRpb24gd2lsbCBiZSBjb21pbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBmcm9tIHRoZSBjdXJyZW50IFVSTCBpbiB0aGUgYnJvd3Nlci5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJhd1VybFRyZWUgPSB0LnJhd1VybDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlc29sdmUobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyAtLS0gR1VBUkRTIC0tLVxuICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGd1YXJkc1N0YXJ0ID0gbmV3IEd1YXJkc0NoZWNrU3RhcnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMhKSwgdC50YXJnZXRTbmFwc2hvdCEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQoZ3VhcmRzU3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgbWFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmFsbFRyYW5zaXRpb25TdGF0ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4udCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ3VhcmRzOiBnZXRBbGxSb3V0ZUd1YXJkcyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQudGFyZ2V0U25hcHNob3QhLCB0LmN1cnJlbnRTbmFwc2hvdCwgdGhpcy5yb290Q29udGV4dHMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG92ZXJhbGxUcmFuc2l0aW9uU3RhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja0d1YXJkcyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZ01vZHVsZS5pbmplY3RvciwgKGV2dDogRXZlbnQpID0+IHRoaXMudHJpZ2dlckV2ZW50KGV2dCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJhbGxUcmFuc2l0aW9uU3RhdGUuZ3VhcmRzUmVzdWx0ID0gdC5ndWFyZHNSZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNVcmxUcmVlKHQuZ3VhcmRzUmVzdWx0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyByZWRpcmVjdGluZ05hdmlnYXRpb25FcnJvcih0aGlzLnVybFNlcmlhbGl6ZXIsIHQuZ3VhcmRzUmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZ3VhcmRzRW5kID0gbmV3IEd1YXJkc0NoZWNrRW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzISksIHQudGFyZ2V0U25hcHNob3QhLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICEhdC5ndWFyZHNSZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQoZ3VhcmRzRW5kKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcih0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdC5ndWFyZHNSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXN0b3JlSGlzdG9yeSh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5jZWxOYXZpZ2F0aW9uVHJhbnNpdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQsICcnLCBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZS5HdWFyZFJlamVjdGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyAtLS0gUkVTT0xWRSAtLS1cbiAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2hUYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodC5ndWFyZHMuY2FuQWN0aXZhdGVDaGVja3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvZih0KS5waXBlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlU3RhcnQgPSBuZXcgUmVzb2x2ZVN0YXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVVcmwodC51cmxBZnRlclJlZGlyZWN0cyEpLCB0LnRhcmdldFNuYXBzaG90ISk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KHJlc29sdmVTdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGFSZXNvbHZlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2YodCkucGlwZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmVEYXRhKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSwgdGhpcy5uZ01vZHVsZS5pbmplY3RvciksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0OiAoKSA9PiBkYXRhUmVzb2x2ZWQgPSB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGF0YVJlc29sdmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc3RvcmVIaXN0b3J5KHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5jZWxOYXZpZ2F0aW9uVHJhbnNpdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE5HX0RFVl9NT0RFID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYEF0IGxlYXN0IG9uZSByb3V0ZSByZXNvbHZlciBkaWRuJ3QgZW1pdCBhbnkgdmFsdWUuYCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLk5vRGF0YUZyb21SZXNvbHZlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlRW5kID0gbmV3IFJlc29sdmVFbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzISksIHQudGFyZ2V0U25hcHNob3QhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQocmVzb2x2ZUVuZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gLS0tIExPQUQgQ09NUE9ORU5UUyAtLS1cbiAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2hUYXAoKHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2FkQ29tcG9uZW50cyA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogQXJyYXk8T2JzZXJ2YWJsZTx2b2lkPj4gPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbG9hZGVyczogQXJyYXk8T2JzZXJ2YWJsZTx2b2lkPj4gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb3V0ZS5yb3V0ZUNvbmZpZz8ubG9hZENvbXBvbmVudCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICFyb3V0ZS5yb3V0ZUNvbmZpZy5fbG9hZGVkQ29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRlcnMucHVzaCh0aGlzLmNvbmZpZ0xvYWRlci5sb2FkQ29tcG9uZW50KHJvdXRlLnJvdXRlQ29uZmlnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5waXBlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXAobG9hZGVkQ29tcG9uZW50ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3V0ZS5jb21wb25lbnQgPSBsb2FkZWRDb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXAoKCkgPT4gdm9pZCAwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIHJvdXRlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRlcnMucHVzaCguLi5sb2FkQ29tcG9uZW50cyhjaGlsZCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxvYWRlcnM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb21iaW5lTGF0ZXN0KGxvYWRDb21wb25lbnRzKHQudGFyZ2V0U25hcHNob3QhLnJvb3QpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5waXBlKGRlZmF1bHRJZkVtcHR5KCksIHRha2UoMSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoVGFwKCgpID0+IHRoaXMuYWZ0ZXJQcmVhY3RpdmF0aW9uKCkpLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgbWFwKCh0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0Um91dGVyU3RhdGUgPSBjcmVhdGVSb3V0ZXJTdGF0ZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvdXRlUmV1c2VTdHJhdGVneSwgdC50YXJnZXRTbmFwc2hvdCEsIHQuY3VycmVudFJvdXRlclN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJhbGxUcmFuc2l0aW9uU3RhdGUgPSB7Li4udCwgdGFyZ2V0Um91dGVyU3RhdGV9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChvdmVyYWxsVHJhbnNpdGlvblN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgIC8qIE9uY2UgaGVyZSwgd2UgYXJlIGFib3V0IHRvIGFjdGl2YXRlIHN5bmNocm9ub3VzbHkuIFRoZSBhc3N1bXB0aW9uIGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcyB3aWxsIHN1Y2NlZWQsIGFuZCB1c2VyIGNvZGUgbWF5IHJlYWQgZnJvbSB0aGUgUm91dGVyIHNlcnZpY2UuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVGhlcmVmb3JlIGJlZm9yZSBhY3RpdmF0aW9uLCB3ZSBuZWVkIHRvIHVwZGF0ZSByb3V0ZXIgcHJvcGVydGllcyBzdG9yaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIGN1cnJlbnQgVVJMIGFuZCB0aGUgUm91dGVyU3RhdGUsIGFzIHdlbGwgYXMgdXBkYXRlZCB0aGUgYnJvd3NlciBVUkwuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQWxsIHRoaXMgc2hvdWxkIGhhcHBlbiAqYmVmb3JlKiBhY3RpdmF0aW5nLiAqL1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCgodDogTmF2aWdhdGlvblRyYW5zaXRpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSB0LnVybEFmdGVyUmVkaXJlY3RzITtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmF3VXJsVHJlZSA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHQudXJsQWZ0ZXJSZWRpcmVjdHMhLCB0LnJhd1VybCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIHtyb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGV9KS5yb3V0ZXJTdGF0ZSA9IHQudGFyZ2V0Um91dGVyU3RhdGUhO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2RlZmVycmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXQuZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QnJvd3NlclVybCh0aGlzLnJhd1VybFRyZWUsIHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0LnVybEFmdGVyUmVkaXJlY3RzITtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2YXRlUm91dGVzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb3RDb250ZXh0cywgdGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3ksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIChldnQ6IEV2ZW50KSA9PiB0aGlzLnRyaWdnZXJFdmVudChldnQpKSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0KCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsaXplKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIFdoZW4gdGhlIG5hdmlnYXRpb24gc3RyZWFtIGZpbmlzaGVzIGVpdGhlciB0aHJvdWdoIGVycm9yIG9yIHN1Y2Nlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKiB3ZSBzZXQgdGhlIGBjb21wbGV0ZWRgIG9yIGBlcnJvcmVkYCBmbGFnLiBIb3dldmVyLCB0aGVyZSBhcmUgc29tZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICogc2l0dWF0aW9ucyB3aGVyZSB3ZSBjb3VsZCBnZXQgaGVyZSB3aXRob3V0IGVpdGhlciBvZiB0aG9zZSBiZWluZyBzZXQuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBGb3IgaW5zdGFuY2UsIGEgcmVkaXJlY3QgZHVyaW5nIE5hdmlnYXRpb25TdGFydC4gVGhlcmVmb3JlLCB0aGlzIGlzIGFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIGNhdGNoLWFsbCB0byBtYWtlIHN1cmUgdGhlIE5hdmlnYXRpb25DYW5jZWwgZXZlbnQgaXMgZmlyZWQgd2hlbiBhXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBuYXZpZ2F0aW9uIGdldHMgY2FuY2VsbGVkIGJ1dCBub3QgY2F1Z2h0IGJ5IG90aGVyIG1lYW5zLiAqL1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjb21wbGV0ZWQgJiYgIWVycm9yZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2FuY2VsYXRpb25SZWFzb24gPSBOR19ERVZfTU9ERSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgTmF2aWdhdGlvbiBJRCAke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJhbGxUcmFuc2l0aW9uU3RhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmlkfSBpcyBub3QgZXF1YWwgdG8gdGhlIGN1cnJlbnQgbmF2aWdhdGlvbiBpZCAke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmF2aWdhdGlvbklkfWAgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsTmF2aWdhdGlvblRyYW5zaXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdmVyYWxsVHJhbnNpdGlvblN0YXRlLCBjYW5jZWxhdGlvblJlYXNvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLlN1cGVyc2VkZWRCeU5ld05hdmlnYXRpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gT25seSBjbGVhciBjdXJyZW50IG5hdmlnYXRpb24gaWYgaXQgaXMgc3RpbGwgc2V0IHRvIHRoZSBvbmUgdGhhdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmluYWxpemVkLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudE5hdmlnYXRpb24/LmlkID09PSBvdmVyYWxsVHJhbnNpdGlvblN0YXRlLmlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudE5hdmlnYXRpb24gPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGNoRXJyb3IoKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogVGhpcyBlcnJvciB0eXBlIGlzIGlzc3VlZCBkdXJpbmcgUmVkaXJlY3QsIGFuZCBpcyBoYW5kbGVkIGFzIGFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIGNhbmNlbGxhdGlvbiByYXRoZXIgdGhhbiBhbiBlcnJvci4gKi9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc05hdmlnYXRpb25DYW5jZWxpbmdFcnJvcihlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzUmVkaXJlY3RpbmdOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgcHJvcGVydHkgb25seSBpZiB3ZSdyZSBub3QgcmVkaXJlY3RpbmcuIElmIHdlIGxhbmRlZCBvbiBhIHBhZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhbmQgcmVkaXJlY3QgdG8gYC9gIHJvdXRlLCB0aGUgbmV3IG5hdmlnYXRpb24gaXMgZ29pbmcgdG8gc2VlIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGAvYCBpc24ndCBhIGNoYW5nZSBmcm9tIHRoZSBkZWZhdWx0IGN1cnJlbnRVcmxUcmVlIGFuZCB3b24ndFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5hdmlnYXRlLiBUaGlzIGlzIG9ubHkgYXBwbGljYWJsZSB3aXRoIGluaXRpYWwgbmF2aWdhdGlvbiwgc29cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzZXR0aW5nIGBuYXZpZ2F0ZWRgIG9ubHkgd2hlbiBub3QgcmVkaXJlY3RpbmcgcmVzb2x2ZXMgdGhpc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNjZW5hcmlvLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc3RvcmVIaXN0b3J5KG92ZXJhbGxUcmFuc2l0aW9uU3RhdGUsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdkNhbmNlbCA9IG5ldyBOYXZpZ2F0aW9uQ2FuY2VsKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmFsbFRyYW5zaXRpb25TdGF0ZS5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKG92ZXJhbGxUcmFuc2l0aW9uU3RhdGUuZXh0cmFjdGVkVXJsKSwgZS5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5jYW5jZWxsYXRpb25Db2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdkNhbmNlbCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiByZWRpcmVjdGluZywgd2UgbmVlZCB0byBkZWxheSByZXNvbHZpbmcgdGhlIG5hdmlnYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHJvbWlzZSBhbmQgcHVzaCBpdCB0byB0aGUgcmVkaXJlY3QgbmF2aWdhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzUmVkaXJlY3RpbmdOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdmVyYWxsVHJhbnNpdGlvblN0YXRlLnJlc29sdmUoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lcmdlZFRyZWUgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UoZS51cmwsIHRoaXMucmF3VXJsVHJlZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXh0cmFzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJhbGxUcmFuc2l0aW9uU3RhdGUuZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBVUkwgaXMgYWxyZWFkeSB1cGRhdGVkIGF0IHRoaXMgcG9pbnQgaWYgd2UgaGF2ZSAnZWFnZXInIFVSTFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlcyBvciBpZiB0aGUgbmF2aWdhdGlvbiB3YXMgdHJpZ2dlcmVkIGJ5IHRoZSBicm93c2VyIChiYWNrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBidXR0b24sIFVSTCBiYXIsIGV0YykuIFdlIHdhbnQgdG8gcmVwbGFjZSB0aGF0IGl0ZW0gaW4gaGlzdG9yeVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgdGhlIG5hdmlnYXRpb24gaXMgcmVqZWN0ZWQuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlVXJsOiB0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZWFnZXInIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNCcm93c2VyVHJpZ2dlcmVkTmF2aWdhdGlvbihvdmVyYWxsVHJhbnNpdGlvblN0YXRlLnNvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24obWVyZ2VkVHJlZSwgJ2ltcGVyYXRpdmUnLCBudWxsLCBleHRyYXMsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmU6IG92ZXJhbGxUcmFuc2l0aW9uU3RhdGUucmVzb2x2ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdDogb3ZlcmFsbFRyYW5zaXRpb25TdGF0ZS5yZWplY3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9taXNlOiBvdmVyYWxsVHJhbnNpdGlvblN0YXRlLnByb21pc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIEFsbCBvdGhlciBlcnJvcnMgc2hvdWxkIHJlc2V0IHRvIHRoZSByb3V0ZXIncyBpbnRlcm5hbCBVUkwgcmVmZXJlbmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIHRvIHRoZSBwcmUtZXJyb3Igc3RhdGUuICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc3RvcmVIaXN0b3J5KG92ZXJhbGxUcmFuc2l0aW9uU3RhdGUsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuYXZFcnJvciA9IG5ldyBOYXZpZ2F0aW9uRXJyb3IoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdmVyYWxsVHJhbnNpdGlvblN0YXRlLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVVcmwob3ZlcmFsbFRyYW5zaXRpb25TdGF0ZS5leHRyYWN0ZWRVcmwpLCBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmFsbFRyYW5zaXRpb25TdGF0ZS50YXJnZXRTbmFwc2hvdCA/PyB1bmRlZmluZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2RXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJhbGxUcmFuc2l0aW9uU3RhdGUucmVzb2x2ZSh0aGlzLmVycm9ySGFuZGxlcihlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcmFsbFRyYW5zaXRpb25TdGF0ZS5yZWplY3QoZWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAvLyBUT0RPKGphc29uYWRlbik6IHJlbW92ZSBjYXN0IG9uY2UgZzMgaXMgb24gdXBkYXRlZCBUeXBlU2NyaXB0XG4gICAgICAgICAgICAgICB9KSkgYXMgYW55IGFzIE9ic2VydmFibGU8TmF2aWdhdGlvblRyYW5zaXRpb24+O1xuICB9XG5cbiAgLyoqXG4gICAqIEBpbnRlcm5hbFxuICAgKiBUT0RPOiB0aGlzIHNob3VsZCBiZSByZW1vdmVkIG9uY2UgdGhlIGNvbnN0cnVjdG9yIG9mIHRoZSByb3V0ZXIgbWFkZSBpbnRlcm5hbFxuICAgKi9cbiAgcmVzZXRSb290Q29tcG9uZW50VHlwZShyb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+KTogdm9pZCB7XG4gICAgdGhpcy5yb290Q29tcG9uZW50VHlwZSA9IHJvb3RDb21wb25lbnRUeXBlO1xuICAgIC8vIFRPRE86IHZzYXZraW4gcm91dGVyIDQuMCBzaG91bGQgbWFrZSB0aGUgcm9vdCBjb21wb25lbnQgc2V0IHRvIG51bGxcbiAgICAvLyB0aGlzIHdpbGwgc2ltcGxpZnkgdGhlIGxpZmVjeWNsZSBvZiB0aGUgcm91dGVyLlxuICAgIHRoaXMucm91dGVyU3RhdGUucm9vdC5jb21wb25lbnQgPSB0aGlzLnJvb3RDb21wb25lbnRUeXBlO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXRUcmFuc2l0aW9uKHQ6IFBhcnRpYWw8TmF2aWdhdGlvblRyYW5zaXRpb24+KTogdm9pZCB7XG4gICAgdGhpcy50cmFuc2l0aW9ucy5uZXh0KHsuLi50aGlzLnRyYW5zaXRpb25zLnZhbHVlLCAuLi50fSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyIGFuZCBwZXJmb3JtcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaW5pdGlhbE5hdmlnYXRpb24oKTogdm9pZCB7XG4gICAgdGhpcy5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICBpZiAodGhpcy5uYXZpZ2F0aW9uSWQgPT09IDApIHtcbiAgICAgIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmxvY2F0aW9uLnBhdGgodHJ1ZSksIHtyZXBsYWNlVXJsOiB0cnVlfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdXAgdGhlIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lci4gVGhpcyBsaXN0ZW5lciBkZXRlY3RzIG5hdmlnYXRpb25zIHRyaWdnZXJlZCBmcm9tIG91dHNpZGVcbiAgICogdGhlIFJvdXRlciAodGhlIGJyb3dzZXIgYmFjay9mb3J3YXJkIGJ1dHRvbnMsIGZvciBleGFtcGxlKSBhbmQgc2NoZWR1bGVzIGEgY29ycmVzcG9uZGluZyBSb3V0ZXJcbiAgICogbmF2aWdhdGlvbiBzbyB0aGF0IHRoZSBjb3JyZWN0IGV2ZW50cywgZ3VhcmRzLCBldGMuIGFyZSB0cmlnZ2VyZWQuXG4gICAqL1xuICBzZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTogdm9pZCB7XG4gICAgLy8gRG9uJ3QgbmVlZCB0byB1c2UgWm9uZS53cmFwIGFueSBtb3JlLCBiZWNhdXNlIHpvbmUuanNcbiAgICAvLyBhbHJlYWR5IHBhdGNoIG9uUG9wU3RhdGUsIHNvIGxvY2F0aW9uIGNoYW5nZSBjYWxsYmFjayB3aWxsXG4gICAgLy8gcnVuIGludG8gbmdab25lXG4gICAgaWYgKCF0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uID0gdGhpcy5sb2NhdGlvbi5zdWJzY3JpYmUoZXZlbnQgPT4ge1xuICAgICAgICBjb25zdCBzb3VyY2UgPSBldmVudFsndHlwZSddID09PSAncG9wc3RhdGUnID8gJ3BvcHN0YXRlJyA6ICdoYXNoY2hhbmdlJztcbiAgICAgICAgaWYgKHNvdXJjZSA9PT0gJ3BvcHN0YXRlJykge1xuICAgICAgICAgIC8vIFRoZSBgc2V0VGltZW91dGAgd2FzIGFkZGVkIGluICMxMjE2MCBhbmQgaXMgbGlrZWx5IHRvIHN1cHBvcnQgQW5ndWxhci9Bbmd1bGFySlNcbiAgICAgICAgICAvLyBoeWJyaWQgYXBwcy5cbiAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHtyZXBsYWNlVXJsOiB0cnVlfTtcbiAgICAgICAgICAgIC8vIE5hdmlnYXRpb25zIGNvbWluZyBmcm9tIEFuZ3VsYXIgcm91dGVyIGhhdmUgYSBuYXZpZ2F0aW9uSWQgc3RhdGVcbiAgICAgICAgICAgIC8vIHByb3BlcnR5LiBXaGVuIHRoaXMgZXhpc3RzLCByZXN0b3JlIHRoZSBzdGF0ZS5cbiAgICAgICAgICAgIGNvbnN0IHN0YXRlID0gZXZlbnQuc3RhdGU/Lm5hdmlnYXRpb25JZCA/IGV2ZW50LnN0YXRlIDogbnVsbDtcbiAgICAgICAgICAgIGlmIChzdGF0ZSkge1xuICAgICAgICAgICAgICBjb25zdCBzdGF0ZUNvcHkgPSB7Li4uc3RhdGV9IGFzIFBhcnRpYWw8UmVzdG9yZWRTdGF0ZT47XG4gICAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZUNvcHkubmF2aWdhdGlvbklkO1xuICAgICAgICAgICAgICBkZWxldGUgc3RhdGVDb3B5Lsm1cm91dGVyUGFnZUlkO1xuICAgICAgICAgICAgICBpZiAoT2JqZWN0LmtleXMoc3RhdGVDb3B5KS5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICBleHRyYXMuc3RhdGUgPSBzdGF0ZUNvcHk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHVybFRyZWUgPSB0aGlzLnBhcnNlVXJsKGV2ZW50Wyd1cmwnXSEpO1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24odXJsVHJlZSwgc291cmNlLCBzdGF0ZSwgZXh0cmFzKTtcbiAgICAgICAgICB9LCAwKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIFRoZSBjdXJyZW50IFVSTC4gKi9cbiAgZ2V0IHVybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnNlcmlhbGl6ZVVybCh0aGlzLmN1cnJlbnRVcmxUcmVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IGBOYXZpZ2F0aW9uYCBvYmplY3Qgd2hlbiB0aGUgcm91dGVyIGlzIG5hdmlnYXRpbmcsXG4gICAqIGFuZCBgbnVsbGAgd2hlbiBpZGxlLlxuICAgKi9cbiAgZ2V0Q3VycmVudE5hdmlnYXRpb24oKTogTmF2aWdhdGlvbnxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50TmF2aWdhdGlvbjtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgdHJpZ2dlckV2ZW50KGV2ZW50OiBFdmVudCk6IHZvaWQge1xuICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PikubmV4dChldmVudCk7XG4gIH1cblxuICAvKipcbiAgICogUmVzZXRzIHRoZSByb3V0ZSBjb25maWd1cmF0aW9uIHVzZWQgZm9yIG5hdmlnYXRpb24gYW5kIGdlbmVyYXRpbmcgbGlua3MuXG4gICAqXG4gICAqIEBwYXJhbSBjb25maWcgVGhlIHJvdXRlIGFycmF5IGZvciB0aGUgbmV3IGNvbmZpZ3VyYXRpb24uXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIucmVzZXRDb25maWcoW1xuICAgKiAgeyBwYXRoOiAndGVhbS86aWQnLCBjb21wb25lbnQ6IFRlYW1DbXAsIGNoaWxkcmVuOiBbXG4gICAqICAgIHsgcGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wIH0sXG4gICAqICAgIHsgcGF0aDogJ3VzZXIvOm5hbWUnLCBjb21wb25lbnQ6IFVzZXJDbXAgfVxuICAgKiAgXX1cbiAgICogXSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcmVzZXRDb25maWcoY29uZmlnOiBSb3V0ZXMpOiB2b2lkIHtcbiAgICBOR19ERVZfTU9ERSAmJiB2YWxpZGF0ZUNvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gICAgdGhpcy5uYXZpZ2F0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSAtMTtcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5kaXNwb3NlKCk7XG4gIH1cblxuICAvKiogRGlzcG9zZXMgb2YgdGhlIHJvdXRlci4gKi9cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLnRyYW5zaXRpb25zLmNvbXBsZXRlKCk7XG4gICAgaWYgKHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24gPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHRoaXMuZGlzcG9zZWQgPSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEFwcGVuZHMgVVJMIHNlZ21lbnRzIHRvIHRoZSBjdXJyZW50IFVSTCB0cmVlIHRvIGNyZWF0ZSBhIG5ldyBVUkwgdHJlZS5cbiAgICpcbiAgICogQHBhcmFtIGNvbW1hbmRzIEFuIGFycmF5IG9mIFVSTCBmcmFnbWVudHMgd2l0aCB3aGljaCB0byBjb25zdHJ1Y3QgdGhlIG5ldyBVUkwgdHJlZS5cbiAgICogSWYgdGhlIHBhdGggaXMgc3RhdGljLCBjYW4gYmUgdGhlIGxpdGVyYWwgVVJMIHN0cmluZy4gRm9yIGEgZHluYW1pYyBwYXRoLCBwYXNzIGFuIGFycmF5IG9mIHBhdGhcbiAgICogc2VnbWVudHMsIGZvbGxvd2VkIGJ5IHRoZSBwYXJhbWV0ZXJzIGZvciBlYWNoIHNlZ21lbnQuXG4gICAqIFRoZSBmcmFnbWVudHMgYXJlIGFwcGxpZWQgdG8gdGhlIGN1cnJlbnQgVVJMIHRyZWUgb3IgdGhlIG9uZSBwcm92aWRlZCAgaW4gdGhlIGByZWxhdGl2ZVRvYFxuICAgKiBwcm9wZXJ0eSBvZiB0aGUgb3B0aW9ucyBvYmplY3QsIGlmIHN1cHBsaWVkLlxuICAgKiBAcGFyYW0gbmF2aWdhdGlvbkV4dHJhcyBPcHRpb25zIHRoYXQgY29udHJvbCB0aGUgbmF2aWdhdGlvbiBzdHJhdGVneS5cbiAgICogQHJldHVybnMgVGhlIG5ldyBVUkwgdHJlZS5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogYGBgXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMy91c2VyLzExXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywgJ3VzZXInLCAxMV0pO1xuICAgKlxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzM7ZXhwYW5kPXRydWUvdXNlci8xMVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtleHBhbmQ6IHRydWV9LCAndXNlcicsIDExXSk7XG4gICAqXG4gICAqIC8vIHlvdSBjYW4gY29sbGFwc2Ugc3RhdGljIHNlZ21lbnRzIGxpa2UgdGhpcyAodGhpcyB3b3JrcyBvbmx5IHdpdGggdGhlIGZpcnN0IHBhc3NlZC1pbiB2YWx1ZSk6XG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0vMzMvdXNlcicsIHVzZXJJZF0pO1xuICAgKlxuICAgKiAvLyBJZiB0aGUgZmlyc3Qgc2VnbWVudCBjYW4gY29udGFpbiBzbGFzaGVzLCBhbmQgeW91IGRvIG5vdCB3YW50IHRoZSByb3V0ZXIgdG8gc3BsaXQgaXQsXG4gICAqIC8vIHlvdSBjYW4gZG8gdGhlIGZvbGxvd2luZzpcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoW3tzZWdtZW50UGF0aDogJy9vbmUvdHdvJ31dKTtcbiAgICpcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzLyh1c2VyLzExLy9yaWdodDpjaGF0KVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDogJ2NoYXQnfX1dKTtcbiAgICpcbiAgICogLy8gcmVtb3ZlIHRoZSByaWdodCBzZWNvbmRhcnkgbm9kZVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDogbnVsbH19XSk7XG4gICAqXG4gICAqIC8vIGFzc3VtaW5nIHRoZSBjdXJyZW50IHVybCBpcyBgL3RlYW0vMzMvdXNlci8xMWAgYW5kIHRoZSByb3V0ZSBwb2ludHMgdG8gYHVzZXIvMTFgXG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzMzL3VzZXIvMTEvZGV0YWlsc1xuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJ2RldGFpbHMnXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzMzL3VzZXIvMjJcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycuLi8yMiddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vNDQvdXNlci8yMlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy4uLy4uL3RlYW0vNDQvdXNlci8yMiddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogTm90ZSB0aGF0IGEgdmFsdWUgb2YgYG51bGxgIG9yIGB1bmRlZmluZWRgIGZvciBgcmVsYXRpdmVUb2AgaW5kaWNhdGVzIHRoYXQgdGhlXG4gICAqIHRyZWUgc2hvdWxkIGJlIGNyZWF0ZWQgcmVsYXRpdmUgdG8gdGhlIHJvb3QuXG4gICAqIGBgYFxuICAgKi9cbiAgY3JlYXRlVXJsVHJlZShjb21tYW5kczogYW55W10sIG5hdmlnYXRpb25FeHRyYXM6IFVybENyZWF0aW9uT3B0aW9ucyA9IHt9KTogVXJsVHJlZSB7XG4gICAgY29uc3Qge3JlbGF0aXZlVG8sIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCwgcXVlcnlQYXJhbXNIYW5kbGluZywgcHJlc2VydmVGcmFnbWVudH0gPVxuICAgICAgICBuYXZpZ2F0aW9uRXh0cmFzO1xuICAgIGNvbnN0IGEgPSByZWxhdGl2ZVRvIHx8IHRoaXMucm91dGVyU3RhdGUucm9vdDtcbiAgICBjb25zdCBmID0gcHJlc2VydmVGcmFnbWVudCA/IHRoaXMuY3VycmVudFVybFRyZWUuZnJhZ21lbnQgOiBmcmFnbWVudDtcbiAgICBsZXQgcTogUGFyYW1zfG51bGwgPSBudWxsO1xuICAgIHN3aXRjaCAocXVlcnlQYXJhbXNIYW5kbGluZykge1xuICAgICAgY2FzZSAnbWVyZ2UnOlxuICAgICAgICBxID0gey4uLnRoaXMuY3VycmVudFVybFRyZWUucXVlcnlQYXJhbXMsIC4uLnF1ZXJ5UGFyYW1zfTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdwcmVzZXJ2ZSc6XG4gICAgICAgIHEgPSB0aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHEgPSBxdWVyeVBhcmFtcyB8fCBudWxsO1xuICAgIH1cbiAgICBpZiAocSAhPT0gbnVsbCkge1xuICAgICAgcSA9IHRoaXMucmVtb3ZlRW1wdHlQcm9wcyhxKTtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZVVybFRyZWUoYSwgdGhpcy5jdXJyZW50VXJsVHJlZSwgY29tbWFuZHMsIHEsIGYgPz8gbnVsbCk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGVzIHRvIGEgdmlldyB1c2luZyBhbiBhYnNvbHV0ZSByb3V0ZSBwYXRoLlxuICAgKlxuICAgKiBAcGFyYW0gdXJsIEFuIGFic29sdXRlIHBhdGggZm9yIGEgZGVmaW5lZCByb3V0ZS4gVGhlIGZ1bmN0aW9uIGRvZXMgbm90IGFwcGx5IGFueSBkZWx0YSB0byB0aGVcbiAgICogICAgIGN1cnJlbnQgVVJMLlxuICAgKiBAcGFyYW0gZXh0cmFzIEFuIG9iamVjdCBjb250YWluaW5nIHByb3BlcnRpZXMgdGhhdCBtb2RpZnkgdGhlIG5hdmlnYXRpb24gc3RyYXRlZ3kuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvICd0cnVlJyB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsXG4gICAqIHRvICdmYWxzZScgd2hlbiBuYXZpZ2F0aW9uIGZhaWxzLCBvciBpcyByZWplY3RlZCBvbiBlcnJvci5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBjYWxscyByZXF1ZXN0IG5hdmlnYXRpb24gdG8gYW4gYWJzb2x1dGUgcGF0aC5cbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiKTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiLCB7IHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRlcilcbiAgICpcbiAgICovXG4gIG5hdmlnYXRlQnlVcmwodXJsOiBzdHJpbmd8VXJsVHJlZSwgZXh0cmFzOiBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zID0ge1xuICAgIHNraXBMb2NhdGlvbkNoYW5nZTogZmFsc2VcbiAgfSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fFxuICAgICAgICBuZ0Rldk1vZGUgJiYgdGhpcy5pc05nWm9uZUVuYWJsZWQgJiYgIU5nWm9uZS5pc0luQW5ndWxhclpvbmUoKSkge1xuICAgICAgdGhpcy5jb25zb2xlLndhcm4oXG4gICAgICAgICAgYE5hdmlnYXRpb24gdHJpZ2dlcmVkIG91dHNpZGUgQW5ndWxhciB6b25lLCBkaWQgeW91IGZvcmdldCB0byBjYWxsICduZ1pvbmUucnVuKCknP2ApO1xuICAgIH1cblxuICAgIGNvbnN0IHVybFRyZWUgPSBpc1VybFRyZWUodXJsKSA/IHVybCA6IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICBjb25zdCBtZXJnZWRUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHVybFRyZWUsIHRoaXMucmF3VXJsVHJlZSk7XG5cbiAgICByZXR1cm4gdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24obWVyZ2VkVHJlZSwgJ2ltcGVyYXRpdmUnLCBudWxsLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBhcnJheSBvZiBjb21tYW5kcyBhbmQgYSBzdGFydGluZyBwb2ludC5cbiAgICogSWYgbm8gc3RhcnRpbmcgcm91dGUgaXMgcHJvdmlkZWQsIHRoZSBuYXZpZ2F0aW9uIGlzIGFic29sdXRlLlxuICAgKlxuICAgKiBAcGFyYW0gY29tbWFuZHMgQW4gYXJyYXkgb2YgVVJMIGZyYWdtZW50cyB3aXRoIHdoaWNoIHRvIGNvbnN0cnVjdCB0aGUgdGFyZ2V0IFVSTC5cbiAgICogSWYgdGhlIHBhdGggaXMgc3RhdGljLCBjYW4gYmUgdGhlIGxpdGVyYWwgVVJMIHN0cmluZy4gRm9yIGEgZHluYW1pYyBwYXRoLCBwYXNzIGFuIGFycmF5IG9mIHBhdGhcbiAgICogc2VnbWVudHMsIGZvbGxvd2VkIGJ5IHRoZSBwYXJhbWV0ZXJzIGZvciBlYWNoIHNlZ21lbnQuXG4gICAqIFRoZSBmcmFnbWVudHMgYXJlIGFwcGxpZWQgdG8gdGhlIGN1cnJlbnQgVVJMIG9yIHRoZSBvbmUgcHJvdmlkZWQgIGluIHRoZSBgcmVsYXRpdmVUb2AgcHJvcGVydHlcbiAgICogb2YgdGhlIG9wdGlvbnMgb2JqZWN0LCBpZiBzdXBwbGllZC5cbiAgICogQHBhcmFtIGV4dHJhcyBBbiBvcHRpb25zIG9iamVjdCB0aGF0IGRldGVybWluZXMgaG93IHRoZSBVUkwgc2hvdWxkIGJlIGNvbnN0cnVjdGVkIG9yXG4gICAqICAgICBpbnRlcnByZXRlZC5cbiAgICpcbiAgICogQHJldHVybnMgQSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gYHRydWVgIHdoZW4gbmF2aWdhdGlvbiBzdWNjZWVkcywgdG8gYGZhbHNlYCB3aGVuIG5hdmlnYXRpb25cbiAgICogICAgIGZhaWxzLFxuICAgKiBvciBpcyByZWplY3RlZCBvbiBlcnJvci5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBjYWxscyByZXF1ZXN0IG5hdmlnYXRpb24gdG8gYSBkeW5hbWljIHJvdXRlIHBhdGggcmVsYXRpdmUgdG8gdGhlIGN1cnJlbnQgVVJMLlxuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTCwgb3ZlcnJpZGluZyB0aGUgZGVmYXVsdCBiZWhhdmlvclxuICAgKiByb3V0ZXIubmF2aWdhdGUoWyd0ZWFtJywgMzMsICd1c2VyJywgMTFdLCB7cmVsYXRpdmVUbzogcm91dGUsIHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZX0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKVxuICAgKlxuICAgKi9cbiAgbmF2aWdhdGUoY29tbWFuZHM6IGFueVtdLCBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7c2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZX0pOlxuICAgICAgUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdmFsaWRhdGVDb21tYW5kcyhjb21tYW5kcyk7XG4gICAgcmV0dXJuIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmNyZWF0ZVVybFRyZWUoY29tbWFuZHMsIGV4dHJhcyksIGV4dHJhcyk7XG4gIH1cblxuICAvKiogU2VyaWFsaXplcyBhIGBVcmxUcmVlYCBpbnRvIGEgc3RyaW5nICovXG4gIHNlcmlhbGl6ZVVybCh1cmw6IFVybFRyZWUpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHVybCk7XG4gIH1cblxuICAvKiogUGFyc2VzIGEgc3RyaW5nIGludG8gYSBgVXJsVHJlZWAgKi9cbiAgcGFyc2VVcmwodXJsOiBzdHJpbmcpOiBVcmxUcmVlIHtcbiAgICBsZXQgdXJsVHJlZTogVXJsVHJlZTtcbiAgICB0cnkge1xuICAgICAgdXJsVHJlZSA9IHRoaXMudXJsU2VyaWFsaXplci5wYXJzZSh1cmwpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHVybFRyZWUgPSB0aGlzLm1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcihlIGFzIFVSSUVycm9yLCB0aGlzLnVybFNlcmlhbGl6ZXIsIHVybCk7XG4gICAgfVxuICAgIHJldHVybiB1cmxUcmVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciB0aGUgdXJsIGlzIGFjdGl2YXRlZC5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWRcbiAgICogVXNlIGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2AgaW5zdGVhZC5cbiAgICpcbiAgICogLSBUaGUgZXF1aXZhbGVudCBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIGZvciBgdHJ1ZWAgaXNcbiAgICogYHtwYXRoczogJ2V4YWN0JywgcXVlcnlQYXJhbXM6ICdleGFjdCcsIGZyYWdtZW50OiAnaWdub3JlZCcsIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnfWAuXG4gICAqIC0gVGhlIGVxdWl2YWxlbnQgZm9yIGBmYWxzZWAgaXNcbiAgICogYHtwYXRoczogJ3N1YnNldCcsIHF1ZXJ5UGFyYW1zOiAnc3Vic2V0JywgZnJhZ21lbnQ6ICdpZ25vcmVkJywgbWF0cml4UGFyYW1zOiAnaWdub3JlZCd9YC5cbiAgICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIGV4YWN0OiBib29sZWFuKTogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciB0aGUgdXJsIGlzIGFjdGl2YXRlZC5cbiAgICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIG1hdGNoT3B0aW9uczogSXNBY3RpdmVNYXRjaE9wdGlvbnMpOiBib29sZWFuO1xuICAvKiogQGludGVybmFsICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIG1hdGNoT3B0aW9uczogYm9vbGVhbnxJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IGJvb2xlYW47XG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIG1hdGNoT3B0aW9uczogYm9vbGVhbnxJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IGJvb2xlYW4ge1xuICAgIGxldCBvcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucztcbiAgICBpZiAobWF0Y2hPcHRpb25zID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zID0gey4uLmV4YWN0TWF0Y2hPcHRpb25zfTtcbiAgICB9IGVsc2UgaWYgKG1hdGNoT3B0aW9ucyA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMgPSB7Li4uc3Vic2V0TWF0Y2hPcHRpb25zfTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucyA9IG1hdGNoT3B0aW9ucztcbiAgICB9XG4gICAgaWYgKGlzVXJsVHJlZSh1cmwpKSB7XG4gICAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybCwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybFRyZWUsIG9wdGlvbnMpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVFbXB0eVByb3BzKHBhcmFtczogUGFyYW1zKTogUGFyYW1zIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMocGFyYW1zKS5yZWR1Y2UoKHJlc3VsdDogUGFyYW1zLCBrZXk6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgdmFsdWU6IGFueSA9IHBhcmFtc1trZXldO1xuICAgICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSwge30pO1xuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzTmF2aWdhdGlvbnMoKTogdm9pZCB7XG4gICAgdGhpcy5uYXZpZ2F0aW9ucy5zdWJzY3JpYmUoXG4gICAgICAgIHQgPT4ge1xuICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSB0LmlkO1xuICAgICAgICAgIHRoaXMuY3VycmVudFBhZ2VJZCA9IHQudGFyZ2V0UGFnZUlkO1xuICAgICAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25FbmQoXG4gICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIHRoaXMuc2VyaWFsaXplVXJsKHRoaXMuY3VycmVudFVybFRyZWUpKSk7XG4gICAgICAgICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bE5hdmlnYXRpb24gPSB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uO1xuICAgICAgICAgIHRoaXMudGl0bGVTdHJhdGVneT8udXBkYXRlVGl0bGUodGhpcy5yb3V0ZXJTdGF0ZS5zbmFwc2hvdCk7XG4gICAgICAgICAgdC5yZXNvbHZlKHRydWUpO1xuICAgICAgICB9LFxuICAgICAgICBlID0+IHtcbiAgICAgICAgICB0aGlzLmNvbnNvbGUud2FybihgVW5oYW5kbGVkIE5hdmlnYXRpb24gRXJyb3I6ICR7ZX1gKTtcbiAgICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHNjaGVkdWxlTmF2aWdhdGlvbihcbiAgICAgIHJhd1VybDogVXJsVHJlZSwgc291cmNlOiBOYXZpZ2F0aW9uVHJpZ2dlciwgcmVzdG9yZWRTdGF0ZTogUmVzdG9yZWRTdGF0ZXxudWxsLFxuICAgICAgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzLFxuICAgICAgcHJpb3JQcm9taXNlPzoge3Jlc29sdmU6IGFueSwgcmVqZWN0OiBhbnksIHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj59KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKHRoaXMuZGlzcG9zZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZmFsc2UpO1xuICAgIH1cblxuICAgIGxldCByZXNvbHZlOiBhbnk7XG4gICAgbGV0IHJlamVjdDogYW55O1xuICAgIGxldCBwcm9taXNlOiBQcm9taXNlPGJvb2xlYW4+O1xuICAgIGlmIChwcmlvclByb21pc2UpIHtcbiAgICAgIHJlc29sdmUgPSBwcmlvclByb21pc2UucmVzb2x2ZTtcbiAgICAgIHJlamVjdCA9IHByaW9yUHJvbWlzZS5yZWplY3Q7XG4gICAgICBwcm9taXNlID0gcHJpb3JQcm9taXNlLnByb21pc2U7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXMsIHJlaikgPT4ge1xuICAgICAgICByZXNvbHZlID0gcmVzO1xuICAgICAgICByZWplY3QgPSByZWo7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBpZCA9ICsrdGhpcy5uYXZpZ2F0aW9uSWQ7XG4gICAgbGV0IHRhcmdldFBhZ2VJZDogbnVtYmVyO1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdjb21wdXRlZCcpIHtcbiAgICAgIGNvbnN0IGlzSW5pdGlhbFBhZ2UgPSB0aGlzLmN1cnJlbnRQYWdlSWQgPT09IDA7XG4gICAgICBpZiAoaXNJbml0aWFsUGFnZSkge1xuICAgICAgICByZXN0b3JlZFN0YXRlID0gdGhpcy5sb2NhdGlvbi5nZXRTdGF0ZSgpIGFzIFJlc3RvcmVkU3RhdGUgfCBudWxsO1xuICAgICAgfVxuICAgICAgLy8gSWYgdGhlIGDJtXJvdXRlclBhZ2VJZGAgZXhpc3QgaW4gdGhlIHN0YXRlIHRoZW4gYHRhcmdldHBhZ2VJZGAgc2hvdWxkIGhhdmUgdGhlIHZhbHVlIG9mXG4gICAgICAvLyBgybVyb3V0ZXJQYWdlSWRgLiBUaGlzIGlzIHRoZSBjYXNlIGZvciBzb21ldGhpbmcgbGlrZSBhIHBhZ2UgcmVmcmVzaCB3aGVyZSB3ZSBhc3NpZ24gdGhlXG4gICAgICAvLyB0YXJnZXQgaWQgdG8gdGhlIHByZXZpb3VzbHkgc2V0IHZhbHVlIGZvciB0aGF0IHBhZ2UuXG4gICAgICBpZiAocmVzdG9yZWRTdGF0ZSAmJiByZXN0b3JlZFN0YXRlLsm1cm91dGVyUGFnZUlkKSB7XG4gICAgICAgIHRhcmdldFBhZ2VJZCA9IHJlc3RvcmVkU3RhdGUuybVyb3V0ZXJQYWdlSWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJZiB3ZSdyZSByZXBsYWNpbmcgdGhlIFVSTCBvciBkb2luZyBhIHNpbGVudCBuYXZpZ2F0aW9uLCB3ZSBkbyBub3Qgd2FudCB0byBpbmNyZW1lbnQgdGhlXG4gICAgICAgIC8vIHBhZ2UgaWQgYmVjYXVzZSB3ZSBhcmVuJ3QgcHVzaGluZyBhIG5ldyBlbnRyeSB0byBoaXN0b3J5LlxuICAgICAgICBpZiAoZXh0cmFzLnJlcGxhY2VVcmwgfHwgZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICAgIHRhcmdldFBhZ2VJZCA9IHRoaXMuYnJvd3NlclBhZ2VJZCA/PyAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRhcmdldFBhZ2VJZCA9ICh0aGlzLmJyb3dzZXJQYWdlSWQgPz8gMCkgKyAxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoaXMgaXMgdW51c2VkIHdoZW4gYGNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb25gIGlzIG5vdCBjb21wdXRlZC5cbiAgICAgIHRhcmdldFBhZ2VJZCA9IDA7XG4gICAgfVxuXG4gICAgdGhpcy5zZXRUcmFuc2l0aW9uKHtcbiAgICAgIGlkLFxuICAgICAgdGFyZ2V0UGFnZUlkLFxuICAgICAgc291cmNlLFxuICAgICAgcmVzdG9yZWRTdGF0ZSxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgY3VycmVudFJhd1VybDogdGhpcy5yYXdVcmxUcmVlLFxuICAgICAgcmF3VXJsLFxuICAgICAgZXh0cmFzLFxuICAgICAgcmVzb2x2ZSxcbiAgICAgIHJlamVjdCxcbiAgICAgIHByb21pc2UsXG4gICAgICBjdXJyZW50U25hcHNob3Q6IHRoaXMucm91dGVyU3RhdGUuc25hcHNob3QsXG4gICAgICBjdXJyZW50Um91dGVyU3RhdGU6IHRoaXMucm91dGVyU3RhdGVcbiAgICB9KTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBlcnJvciBpcyBwcm9wYWdhdGVkIGV2ZW4gdGhvdWdoIGBwcm9jZXNzTmF2aWdhdGlvbnNgIGNhdGNoXG4gICAgLy8gaGFuZGxlciBkb2VzIG5vdCByZXRocm93XG4gICAgcmV0dXJuIHByb21pc2UuY2F0Y2goKGU6IGFueSkgPT4ge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXRCcm93c2VyVXJsKHVybDogVXJsVHJlZSwgdDogTmF2aWdhdGlvblRyYW5zaXRpb24pIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICAgIGNvbnN0IHN0YXRlID0gey4uLnQuZXh0cmFzLnN0YXRlLCAuLi50aGlzLmdlbmVyYXRlTmdSb3V0ZXJTdGF0ZSh0LmlkLCB0LnRhcmdldFBhZ2VJZCl9O1xuICAgIGlmICh0aGlzLmxvY2F0aW9uLmlzQ3VycmVudFBhdGhFcXVhbFRvKHBhdGgpIHx8ICEhdC5leHRyYXMucmVwbGFjZVVybCkge1xuICAgICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUocGF0aCwgJycsIHN0YXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5sb2NhdGlvbi5nbyhwYXRoLCAnJywgc3RhdGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtcyB0aGUgbmVjZXNzYXJ5IHJvbGxiYWNrIGFjdGlvbiB0byByZXN0b3JlIHRoZSBicm93c2VyIFVSTCB0byB0aGVcbiAgICogc3RhdGUgYmVmb3JlIHRoZSB0cmFuc2l0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSByZXN0b3JlSGlzdG9yeSh0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbiwgcmVzdG9yaW5nRnJvbUNhdWdodEVycm9yID0gZmFsc2UpIHtcbiAgICBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAnY29tcHV0ZWQnKSB7XG4gICAgICBjb25zdCB0YXJnZXRQYWdlUG9zaXRpb24gPSB0aGlzLmN1cnJlbnRQYWdlSWQgLSB0LnRhcmdldFBhZ2VJZDtcbiAgICAgIC8vIFRoZSBuYXZpZ2F0b3IgY2hhbmdlIHRoZSBsb2NhdGlvbiBiZWZvcmUgdHJpZ2dlcmVkIHRoZSBicm93c2VyIGV2ZW50LFxuICAgICAgLy8gc28gd2UgbmVlZCB0byBnbyBiYWNrIHRvIHRoZSBjdXJyZW50IHVybCBpZiB0aGUgbmF2aWdhdGlvbiBpcyBjYW5jZWxlZC5cbiAgICAgIC8vIEFsc28sIHdoZW4gbmF2aWdhdGlvbiBnZXRzIGNhbmNlbGxlZCB3aGlsZSB1c2luZyB1cmwgdXBkYXRlIHN0cmF0ZWd5IGVhZ2VyLCB0aGVuIHdlIG5lZWQgdG9cbiAgICAgIC8vIGdvIGJhY2suIEJlY2F1c2UsIHdoZW4gYHVybFVwZGF0ZVN0cmF0ZWd5YCBpcyBgZWFnZXJgOyBgc2V0QnJvd3NlclVybGAgbWV0aG9kIGlzIGNhbGxlZFxuICAgICAgLy8gYmVmb3JlIGFueSB2ZXJpZmljYXRpb24uXG4gICAgICBjb25zdCBicm93c2VyVXJsVXBkYXRlT2NjdXJyZWQgPVxuICAgICAgICAgICh0LnNvdXJjZSA9PT0gJ3BvcHN0YXRlJyB8fCB0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZWFnZXInIHx8XG4gICAgICAgICAgIHRoaXMuY3VycmVudFVybFRyZWUgPT09IHRoaXMuY3VycmVudE5hdmlnYXRpb24/LmZpbmFsVXJsKTtcbiAgICAgIGlmIChicm93c2VyVXJsVXBkYXRlT2NjdXJyZWQgJiYgdGFyZ2V0UGFnZVBvc2l0aW9uICE9PSAwKSB7XG4gICAgICAgIHRoaXMubG9jYXRpb24uaGlzdG9yeUdvKHRhcmdldFBhZ2VQb3NpdGlvbik7XG4gICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgIHRoaXMuY3VycmVudFVybFRyZWUgPT09IHRoaXMuY3VycmVudE5hdmlnYXRpb24/LmZpbmFsVXJsICYmIHRhcmdldFBhZ2VQb3NpdGlvbiA9PT0gMCkge1xuICAgICAgICAvLyBXZSBnb3QgdG8gdGhlIGFjdGl2YXRpb24gc3RhZ2UgKHdoZXJlIGN1cnJlbnRVcmxUcmVlIGlzIHNldCB0byB0aGUgbmF2aWdhdGlvbidzXG4gICAgICAgIC8vIGZpbmFsVXJsKSwgYnV0IHdlIHdlcmVuJ3QgbW92aW5nIGFueXdoZXJlIGluIGhpc3RvcnkgKHNraXBMb2NhdGlvbkNoYW5nZSBvciByZXBsYWNlVXJsKS5cbiAgICAgICAgLy8gV2Ugc3RpbGwgbmVlZCB0byByZXNldCB0aGUgcm91dGVyIHN0YXRlIGJhY2sgdG8gd2hhdCBpdCB3YXMgd2hlbiB0aGUgbmF2aWdhdGlvbiBzdGFydGVkLlxuICAgICAgICB0aGlzLnJlc2V0U3RhdGUodCk7XG4gICAgICAgIC8vIFRPRE8oYXRzY290dCk6IHJlc2V0dGluZyB0aGUgYGJyb3dzZXJVcmxUcmVlYCBzaG91bGQgcmVhbGx5IGJlIGRvbmUgaW4gYHJlc2V0U3RhdGVgLlxuICAgICAgICAvLyBJbnZlc3RpZ2F0ZSBpZiB0aGlzIGNhbiBiZSBkb25lIGJ5IHJ1bm5pbmcgVEdQLlxuICAgICAgICB0aGlzLmJyb3dzZXJVcmxUcmVlID0gdC5jdXJyZW50VXJsVHJlZTtcbiAgICAgICAgdGhpcy5yZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoZSBicm93c2VyIFVSTCBhbmQgcm91dGVyIHN0YXRlIHdhcyBub3QgdXBkYXRlZCBiZWZvcmUgdGhlIG5hdmlnYXRpb24gY2FuY2VsbGVkIHNvXG4gICAgICAgIC8vIHRoZXJlJ3Mgbm8gcmVzdG9yYXRpb24gbmVlZGVkLlxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAncmVwbGFjZScpIHtcbiAgICAgIC8vIFRPRE8oYXRzY290dCk6IEl0IHNlZW1zIGxpa2Ugd2Ugc2hvdWxkIF9hbHdheXNfIHJlc2V0IHRoZSBzdGF0ZSBoZXJlLiBJdCB3b3VsZCBiZSBhIG5vLW9wXG4gICAgICAvLyBmb3IgYGRlZmVycmVkYCBuYXZpZ2F0aW9ucyB0aGF0IGhhdmVuJ3QgY2hhbmdlIHRoZSBpbnRlcm5hbCBzdGF0ZSB5ZXQgYmVjYXVzZSBndWFyZHNcbiAgICAgIC8vIHJlamVjdC4gRm9yICdlYWdlcicgbmF2aWdhdGlvbnMsIGl0IHNlZW1zIGxpa2Ugd2UgYWxzbyByZWFsbHkgc2hvdWxkIHJlc2V0IHRoZSBzdGF0ZVxuICAgICAgLy8gYmVjYXVzZSB0aGUgbmF2aWdhdGlvbiB3YXMgY2FuY2VsbGVkLiBJbnZlc3RpZ2F0ZSBpZiB0aGlzIGNhbiBiZSBkb25lIGJ5IHJ1bm5pbmcgVEdQLlxuICAgICAgaWYgKHJlc3RvcmluZ0Zyb21DYXVnaHRFcnJvcikge1xuICAgICAgICB0aGlzLnJlc2V0U3RhdGUodCk7XG4gICAgICB9XG4gICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRTdGF0ZSh0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbik6IHZvaWQge1xuICAgICh0aGlzIGFzIHtyb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGV9KS5yb3V0ZXJTdGF0ZSA9IHQuY3VycmVudFJvdXRlclN0YXRlO1xuICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSB0LmN1cnJlbnRVcmxUcmVlO1xuICAgIC8vIE5vdGUgaGVyZSB0aGF0IHdlIHVzZSB0aGUgdXJsSGFuZGxpbmdTdHJhdGVneSB0byBnZXQgdGhlIHJlc2V0IGByYXdVcmxUcmVlYCBiZWNhdXNlIGl0IG1heSBiZVxuICAgIC8vIGNvbmZpZ3VyZWQgdG8gaGFuZGxlIG9ubHkgcGFydCBvZiB0aGUgbmF2aWdhdGlvbiBVUkwuIFRoaXMgbWVhbnMgd2Ugd291bGQgb25seSB3YW50IHRvIHJlc2V0XG4gICAgLy8gdGhlIHBhcnQgb2YgdGhlIG5hdmlnYXRpb24gaGFuZGxlZCBieSB0aGUgQW5ndWxhciByb3V0ZXIgcmF0aGVyIHRoYW4gdGhlIHdob2xlIFVSTC4gSW5cbiAgICAvLyBhZGRpdGlvbiwgdGhlIFVSTEhhbmRsaW5nU3RyYXRlZ3kgbWF5IGJlIGNvbmZpZ3VyZWQgdG8gc3BlY2lmaWNhbGx5IHByZXNlcnZlIHBhcnRzIG9mIHRoZSBVUkxcbiAgICAvLyB3aGVuIG1lcmdpbmcsIHN1Y2ggYXMgdGhlIHF1ZXJ5IHBhcmFtcyBzbyB0aGV5IGFyZSBub3QgbG9zdCBvbiBhIHJlZnJlc2guXG4gICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHRoaXMuY3VycmVudFVybFRyZWUsIHQucmF3VXJsKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk6IHZvaWQge1xuICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKFxuICAgICAgICB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHRoaXMucmF3VXJsVHJlZSksICcnLFxuICAgICAgICB0aGlzLmdlbmVyYXRlTmdSb3V0ZXJTdGF0ZSh0aGlzLmxhc3RTdWNjZXNzZnVsSWQsIHRoaXMuY3VycmVudFBhZ2VJZCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBjYW5jZWxOYXZpZ2F0aW9uVHJhbnNpdGlvbihcbiAgICAgIHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uLCByZWFzb246IHN0cmluZywgY29kZTogTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUpIHtcbiAgICBjb25zdCBuYXZDYW5jZWwgPSBuZXcgTmF2aWdhdGlvbkNhbmNlbCh0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIHJlYXNvbiwgY29kZSk7XG4gICAgdGhpcy50cmlnZ2VyRXZlbnQobmF2Q2FuY2VsKTtcbiAgICB0LnJlc29sdmUoZmFsc2UpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZU5nUm91dGVyU3RhdGUobmF2aWdhdGlvbklkOiBudW1iZXIsIHJvdXRlclBhZ2VJZD86IG51bWJlcikge1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdjb21wdXRlZCcpIHtcbiAgICAgIHJldHVybiB7bmF2aWdhdGlvbklkLCDJtXJvdXRlclBhZ2VJZDogcm91dGVyUGFnZUlkfTtcbiAgICB9XG4gICAgcmV0dXJuIHtuYXZpZ2F0aW9uSWR9O1xuICB9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHM6IHN0cmluZ1tdKTogdm9pZCB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29tbWFuZHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjbWQgPSBjb21tYW5kc1tpXTtcbiAgICBpZiAoY21kID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5OVUxMSVNIX0NPTU1BTkQsXG4gICAgICAgICAgTkdfREVWX01PREUgJiYgYFRoZSByZXF1ZXN0ZWQgcGF0aCBjb250YWlucyAke2NtZH0gc2VnbWVudCBhdCBpbmRleCAke2l9YCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGlzQnJvd3NlclRyaWdnZXJlZE5hdmlnYXRpb24oc291cmNlOiAnaW1wZXJhdGl2ZSd8J3BvcHN0YXRlJ3wnaGFzaGNoYW5nZScpIHtcbiAgcmV0dXJuIHNvdXJjZSAhPT0gJ2ltcGVyYXRpdmUnO1xufVxuIl19