/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { Compiler, Injectable, Injector, NgModuleFactoryLoader, NgModuleRef, NgZone, ɵConsole as Console } from '@angular/core';
import { BehaviorSubject, EMPTY, of, Subject } from 'rxjs';
import { catchError, filter, finalize, map, switchMap, tap } from 'rxjs/operators';
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
import { isNavigationCancelingError, navigationCancelingError } from './shared';
import { DefaultUrlHandlingStrategy } from './url_handling_strategy';
import { containsTree, createEmptyUrlTree, UrlSerializer } from './url_tree';
import { standardizeConfig, validateConfig } from './utils/config';
import { getAllRouteGuards } from './utils/preactivation';
import { isUrlTree } from './utils/type_guards';
import * as i0 from "@angular/core";
import * as i1 from "./url_tree";
import * as i2 from "./router_outlet_context";
import * as i3 from "@angular/common";
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
 * The equivalent `IsActiveUrlTreeOptions` options for `Router.isActive` is called with `true`
 * (exact = true).
 */
export const exactMatchOptions = {
    paths: 'exact',
    fragment: 'ignored',
    matrixParams: 'ignored',
    queryParams: 'exact'
};
/**
 * The equivalent `IsActiveUrlTreeOptions` options for `Router.isActive` is called with `false`
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
    constructor(rootComponentType, urlSerializer, rootContexts, location, injector, loader, compiler, config) {
        this.rootComponentType = rootComponentType;
        this.urlSerializer = urlSerializer;
        this.rootContexts = rootContexts;
        this.location = location;
        this.config = config;
        this.lastSuccessfulNavigation = null;
        this.currentNavigation = null;
        this.disposed = false;
        /**
         * Tracks the previously seen location change from the location subscription so we can compare
         * the two latest to see if they are duplicates. See setUpLocationChangeListener.
         */
        this.lastLocationChangeInfo = null;
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
         * Hooks that enable you to pause navigation,
         * either before or after the preactivation phase.
         * Used by `RouterModule`.
         *
         * @internal
         */
        this.hooks = { beforePreactivation: defaultRouterHook, afterPreactivation: defaultRouterHook };
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
         * How to merge parameters, data, and resolved data from parent to child
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
         */
        this.relativeLinkResolution = 'corrected';
        /**
         * Configures how the Router attempts to restore state when a navigation is cancelled.
         *
         * 'replace' - Always uses `location.replaceState` to set the browser state to the state of the
         * router before the navigation started.
         *
         * 'computed' - Will always return to the same state that corresponds to the actual Angular route
         * when the navigation gets cancelled right after triggering a `popstate` event.
         *
         * The default value is `replace`
         *
         * @internal
         */
        // TODO(atscott): Determine how/when/if to make this public API
        // This shouldn’t be an option at all but may need to be in order to allow migration without a
        // breaking change. We need to determine if it should be made into public api (or if we forgo
        // the option and release as a breaking change bug fix in a major version).
        this.canceledNavigationResolution = 'replace';
        const onLoadStart = (r) => this.triggerEvent(new RouteConfigLoadStart(r));
        const onLoadEnd = (r) => this.triggerEvent(new RouteConfigLoadEnd(r));
        this.ngModule = injector.get(NgModuleRef);
        this.console = injector.get(Console);
        const ngZone = injector.get(NgZone);
        this.isNgZoneEnabled = ngZone instanceof NgZone && NgZone.isInAngularZone();
        this.resetConfig(config);
        this.currentUrlTree = createEmptyUrlTree();
        this.rawUrlTree = this.currentUrlTree;
        this.browserUrlTree = this.currentUrlTree;
        this.configLoader = new RouterConfigLoader(loader, compiler, onLoadStart, onLoadEnd);
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
        var _a;
        return (_a = this.location.getState()) === null || _a === void 0 ? void 0 : _a.ɵrouterPageId;
    }
    setupNavigations(transitions) {
        const eventsSubject = this.events;
        return transitions.pipe(filter(t => t.id !== 0), 
        // Extract URL
        map(t => (Object.assign(Object.assign({}, t), { extractedUrl: this.urlHandlingStrategy.extract(t.rawUrl) }))), 
        // Using switchMap so we cancel executing navigations when a new one comes in
        switchMap(t => {
            let completed = false;
            let errored = false;
            return of(t).pipe(
            // Store the Navigation object
            tap(t => {
                this.currentNavigation = {
                    id: t.id,
                    initialUrl: t.currentRawUrl,
                    extractedUrl: t.extractedUrl,
                    trigger: t.source,
                    extras: t.extras,
                    previousNavigation: this.lastSuccessfulNavigation ? Object.assign(Object.assign({}, this.lastSuccessfulNavigation), { previousNavigation: null }) :
                        null
                };
            }), switchMap(t => {
                const urlTransition = !this.navigated ||
                    t.extractedUrl.toString() !== this.browserUrlTree.toString();
                const processCurrentUrl = (this.onSameUrlNavigation === 'reload' ? true : urlTransition) &&
                    this.urlHandlingStrategy.shouldProcessUrl(t.rawUrl);
                if (processCurrentUrl) {
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
                    tap(t => {
                        this.currentNavigation = Object.assign(Object.assign({}, this.currentNavigation), { finalUrl: t.urlAfterRedirects });
                    }), 
                    // Recognize
                    recognize(this.rootComponentType, this.config, (url) => this.serializeUrl(url), this.paramsInheritanceStrategy, this.relativeLinkResolution), 
                    // Update URL if in `eager` update mode
                    tap(t => {
                        if (this.urlUpdateStrategy === 'eager') {
                            if (!t.extras.skipLocationChange) {
                                this.setBrowserUrl(t.urlAfterRedirects, t);
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
                        return of(Object.assign(Object.assign({}, t), { targetSnapshot, urlAfterRedirects: extractedUrl, extras: Object.assign(Object.assign({}, extras), { skipLocationChange: false, replaceUrl: false }) }));
                    }
                    else {
                        /* When neither the current or previous URL can be processed, do nothing
                         * other than update router's internal reference to the current "settled"
                         * URL. This way the next navigation will be coming from the current URL
                         * in the browser.
                         */
                        this.rawUrlTree = t.rawUrl;
                        this.browserUrlTree = t.urlAfterRedirects;
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
            }), map(t => (Object.assign(Object.assign({}, t), { guards: getAllRouteGuards(t.targetSnapshot, t.currentSnapshot, this.rootContexts) }))), checkGuards(this.ngModule.injector, (evt) => this.triggerEvent(evt)), tap(t => {
                if (isUrlTree(t.guardsResult)) {
                    const error = navigationCancelingError(`Redirecting to "${this.serializeUrl(t.guardsResult)}"`);
                    error.url = t.guardsResult;
                    throw error;
                }
                const guardsEnd = new GuardsCheckEnd(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(t.urlAfterRedirects), t.targetSnapshot, !!t.guardsResult);
                this.triggerEvent(guardsEnd);
            }), filter(t => {
                if (!t.guardsResult) {
                    this.restoreHistory(t);
                    this.cancelNavigationTransition(t, '');
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
                                    this.cancelNavigationTransition(t, `At least one route resolver didn't emit any value.`);
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
            // --- AFTER PREACTIVATION ---
            switchTap((t) => {
                const { targetSnapshot, id: navigationId, extractedUrl: appliedUrlTree, rawUrl: rawUrlTree, extras: { skipLocationChange, replaceUrl } } = t;
                return this.hooks.afterPreactivation(targetSnapshot, {
                    navigationId,
                    appliedUrlTree,
                    rawUrlTree,
                    skipLocationChange: !!skipLocationChange,
                    replaceUrl: !!replaceUrl,
                });
            }), map((t) => {
                const targetRouterState = createRouterState(this.routeReuseStrategy, t.targetSnapshot, t.currentRouterState);
                return (Object.assign(Object.assign({}, t), { targetRouterState }));
            }), 
            /* Once here, we are about to activate syncronously. The assumption is this
               will succeed, and user code may read from the Router service. Therefore
               before activation, we need to update router properties storing the current
               URL and the RouterState, as well as updated the browser URL. All this should
               happen *before* activating. */
            tap((t) => {
                this.currentUrlTree = t.urlAfterRedirects;
                this.rawUrlTree =
                    this.urlHandlingStrategy.merge(this.currentUrlTree, t.rawUrl);
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
                    const cancelationReason = `Navigation ID ${t.id} is not equal to the current navigation id ${this.navigationId}`;
                    if (this.canceledNavigationResolution === 'replace') {
                        // Must reset to current URL tree here to ensure history.state is set. On
                        // a fresh page load, if a new navigation comes in before a successful
                        // navigation completes, there will be nothing in
                        // history.state.navigationId. This can cause sync problems with
                        // AngularJS sync code which looks for a value here in order to determine
                        // whether or not to handle a given popstate event or to leave it to the
                        // Angular router.
                        this.restoreHistory(t);
                        this.cancelNavigationTransition(t, cancelationReason);
                    }
                    else {
                        // We cannot trigger a `location.historyGo` if the
                        // cancellation was due to a new navigation before the previous could
                        // complete. This is because `location.historyGo` triggers a `popstate`
                        // which would also trigger another navigation. Instead, treat this as a
                        // redirect and do not reset the state.
                        this.cancelNavigationTransition(t, cancelationReason);
                        // TODO(atscott): The same problem happens here with a fresh page load
                        // and a new navigation before that completes where we won't set a page
                        // id.
                    }
                }
                // currentNavigation should always be reset to null here. If navigation was
                // successful, lastSuccessfulTransition will have already been set. Therefore
                // we can safely set currentNavigation to null here.
                this.currentNavigation = null;
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
                    const navCancel = new NavigationCancel(t.id, this.serializeUrl(t.extractedUrl), e.message);
                    eventsSubject.next(navCancel);
                    // When redirecting, we need to delay resolving the navigation
                    // promise and push it to the redirect navigation
                    if (!redirecting) {
                        t.resolve(false);
                    }
                    else {
                        // setTimeout is required so this navigation finishes with
                        // the return EMPTY below. If it isn't allowed to finish
                        // processing, there can be multiple navigations to the same
                        // URL.
                        setTimeout(() => {
                            const mergedTree = this.urlHandlingStrategy.merge(e.url, this.rawUrlTree);
                            const extras = {
                                skipLocationChange: t.extras.skipLocationChange,
                                replaceUrl: this.urlUpdateStrategy === 'eager'
                            };
                            this.scheduleNavigation(mergedTree, 'imperative', null, extras, { resolve: t.resolve, reject: t.reject, promise: t.promise });
                        }, 0);
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
    getTransition() {
        const transition = this.transitions.value;
        // This value needs to be set. Other values such as extractedUrl are set on initial navigation
        // but the urlAfterRedirects may not get set if we aren't processing the new URL *and* not
        // processing the previous URL.
        transition.urlAfterRedirects = this.browserUrlTree;
        return transition;
    }
    setTransition(t) {
        this.transitions.next(Object.assign(Object.assign({}, this.getTransition()), t));
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
                const currentChange = this.extractLocationChangeInfoFromEvent(event);
                // The `setTimeout` was added in #12160 and is likely to support Angular/AngularJS
                // hybrid apps.
                if (this.shouldScheduleNavigation(this.lastLocationChangeInfo, currentChange)) {
                    setTimeout(() => {
                        const { source, state, urlTree } = currentChange;
                        const extras = { replaceUrl: true };
                        if (state) {
                            const stateCopy = Object.assign({}, state);
                            delete stateCopy.navigationId;
                            delete stateCopy.ɵrouterPageId;
                            if (Object.keys(stateCopy).length !== 0) {
                                extras.state = stateCopy;
                            }
                        }
                        this.scheduleNavigation(urlTree, source, state, extras);
                    }, 0);
                }
                this.lastLocationChangeInfo = currentChange;
            });
        }
    }
    /** Extracts router-related information from a `PopStateEvent`. */
    extractLocationChangeInfoFromEvent(change) {
        var _a;
        return {
            source: change['type'] === 'popstate' ? 'popstate' : 'hashchange',
            urlTree: this.parseUrl(change['url']),
            // Navigations coming from Angular router have a navigationId state
            // property. When this exists, restore the state.
            state: ((_a = change.state) === null || _a === void 0 ? void 0 : _a.navigationId) ? change.state : null,
            transitionId: this.getTransition().id
        };
    }
    /**
     * Determines whether two events triggered by the Location subscription are due to the same
     * navigation. The location subscription can fire two events (popstate and hashchange) for a
     * single navigation. The second one should be ignored, that is, we should not schedule another
     * navigation in the Router.
     */
    shouldScheduleNavigation(previous, current) {
        if (!previous)
            return true;
        const sameDestination = current.urlTree.toString() === previous.urlTree.toString();
        const eventsOccurredAtSameTime = current.transitionId === previous.transitionId;
        if (!eventsOccurredAtSameTime || !sameDestination) {
            return true;
        }
        if ((current.source === 'hashchange' && previous.source === 'popstate') ||
            (current.source === 'popstate' && previous.source === 'hashchange')) {
            return false;
        }
        return true;
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
        validateConfig(config);
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
                q = Object.assign(Object.assign({}, this.currentUrlTree.queryParams), queryParams);
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
        return createUrlTree(a, this.currentUrlTree, commands, q, f !== null && f !== void 0 ? f : null);
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
            options = Object.assign({}, exactMatchOptions);
        }
        else if (matchOptions === false) {
            options = Object.assign({}, subsetMatchOptions);
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
            t.resolve(true);
        }, e => {
            this.console.warn(`Unhandled Navigation Error: `);
        });
    }
    scheduleNavigation(rawUrl, source, restoredState, extras, priorPromise) {
        var _a, _b;
        if (this.disposed) {
            return Promise.resolve(false);
        }
        // * Imperative navigations (router.navigate) might trigger additional navigations to the same
        //   URL via a popstate event and the locationChangeListener. We should skip these duplicate
        //   navs. Duplicates may also be triggered by attempts to sync AngularJS and Angular router
        //   states.
        // * Imperative navigations can be cancelled by router guards, meaning the URL won't change. If
        //   the user follows that with a navigation using the back/forward button or manual URL change,
        //   the destination may be the same as the previous imperative attempt. We should not skip
        //   these navigations because it's a separate case from the one above -- it's not a duplicate
        //   navigation.
        const lastNavigation = this.getTransition();
        // We don't want to skip duplicate successful navs if they're imperative because
        // onSameUrlNavigation could be 'reload' (so the duplicate is intended).
        const browserNavPrecededByRouterNav = source !== 'imperative' && (lastNavigation === null || lastNavigation === void 0 ? void 0 : lastNavigation.source) === 'imperative';
        const lastNavigationSucceeded = this.lastSuccessfulId === lastNavigation.id;
        // If the last navigation succeeded or is in flight, we can use the rawUrl as the comparison.
        // However, if it failed, we should compare to the final result (urlAfterRedirects).
        const lastNavigationUrl = (lastNavigationSucceeded || this.currentNavigation) ?
            lastNavigation.rawUrl :
            lastNavigation.urlAfterRedirects;
        const duplicateNav = lastNavigationUrl.toString() === rawUrl.toString();
        if (browserNavPrecededByRouterNav && duplicateNav) {
            return Promise.resolve(true); // return value is not used
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
                    targetPageId = (_a = this.browserPageId) !== null && _a !== void 0 ? _a : 0;
                }
                else {
                    targetPageId = ((_b = this.browserPageId) !== null && _b !== void 0 ? _b : 0) + 1;
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
        const state = Object.assign(Object.assign({}, t.extras.state), this.generateNgRouterState(t.id, t.targetPageId));
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
        var _a, _b;
        if (this.canceledNavigationResolution === 'computed') {
            const targetPagePosition = this.currentPageId - t.targetPageId;
            // The navigator change the location before triggered the browser event,
            // so we need to go back to the current url if the navigation is canceled.
            // Also, when navigation gets cancelled while using url update strategy eager, then we need to
            // go back. Because, when `urlUpdateSrategy` is `eager`; `setBrowserUrl` method is called
            // before any verification.
            const browserUrlUpdateOccurred = (t.source === 'popstate' || this.urlUpdateStrategy === 'eager' ||
                this.currentUrlTree === ((_a = this.currentNavigation) === null || _a === void 0 ? void 0 : _a.finalUrl));
            if (browserUrlUpdateOccurred && targetPagePosition !== 0) {
                this.location.historyGo(targetPagePosition);
            }
            else if (this.currentUrlTree === ((_b = this.currentNavigation) === null || _b === void 0 ? void 0 : _b.finalUrl) && targetPagePosition === 0) {
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
        this.rawUrlTree = this.urlHandlingStrategy.merge(this.currentUrlTree, t.rawUrl);
    }
    resetUrlToCurrentUrlTree() {
        this.location.replaceState(this.urlSerializer.serialize(this.rawUrlTree), '', this.generateNgRouterState(this.lastSuccessfulId, this.currentPageId));
    }
    cancelNavigationTransition(t, reason) {
        const navCancel = new NavigationCancel(t.id, this.serializeUrl(t.extractedUrl), reason);
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
Router.ɵfac = function Router_Factory(t) { i0.ɵɵinvalidFactory(); };
Router.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: Router, factory: Router.ɵfac });
(function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(Router, [{
        type: Injectable
    }], function () { return [{ type: i0.Type }, { type: i1.UrlSerializer }, { type: i2.ChildrenOutletContexts }, { type: i3.Location }, { type: i0.Injector }, { type: i0.NgModuleFactoryLoader }, { type: i0.Compiler }, { type: undefined }]; }, null); })();
function validateCommands(commands) {
    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        if (cmd == null) {
            throw new Error(`The requested path contains ${cmd} segment at index ${i}`);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBZ0IsTUFBTSxpQkFBaUIsQ0FBQztBQUN4RCxPQUFPLEVBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUscUJBQXFCLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBUSxRQUFRLElBQUksT0FBTyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3BJLE9BQU8sRUFBQyxlQUFlLEVBQUUsS0FBSyxFQUFjLEVBQUUsRUFBRSxPQUFPLEVBQW1CLE1BQU0sTUFBTSxDQUFDO0FBQ3ZGLE9BQU8sRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBR2pGLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQ3hELE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRCxPQUFPLEVBQVEsY0FBYyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFxQixVQUFVLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzdPLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQ3JELE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUNoRCxPQUFPLEVBQUMsV0FB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WUFBWSxFQUFDLENBQUM7U0FDcEQ7UUFDRCxPQUFPLEVBQUMsWUFBWSxFQUFDLENBQUM7SUFDeEIsQ0FBQzs7OzREQXRuQ1UsTUFBTSxXQUFOLE1BQU07dUZBQU4sTUFBTTtjQURsQixVQUFVOztBQTBuQ1gsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFrQjtJQUMxQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUN4QyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsR0FBRyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUM3RTtLQUNGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9uLCBQb3BTdGF0ZUV2ZW50fSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtDb21waWxlciwgSW5qZWN0YWJsZSwgSW5qZWN0b3IsIE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgTmdNb2R1bGVSZWYsIE5nWm9uZSwgVHlwZSwgybVDb25zb2xlIGFzIENvbnNvbGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtCZWhhdmlvclN1YmplY3QsIEVNUFRZLCBPYnNlcnZhYmxlLCBvZiwgU3ViamVjdCwgU3Vic2NyaXB0aW9uTGlrZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NhdGNoRXJyb3IsIGZpbHRlciwgZmluYWxpemUsIG1hcCwgc3dpdGNoTWFwLCB0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtRdWVyeVBhcmFtc0hhbmRsaW5nLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge2NyZWF0ZVJvdXRlclN0YXRlfSBmcm9tICcuL2NyZWF0ZV9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtjcmVhdGVVcmxUcmVlfSBmcm9tICcuL2NyZWF0ZV91cmxfdHJlZSc7XG5pbXBvcnQge0V2ZW50LCBHdWFyZHNDaGVja0VuZCwgR3VhcmRzQ2hlY2tTdGFydCwgTmF2aWdhdGlvbkNhbmNlbCwgTmF2aWdhdGlvbkVuZCwgTmF2aWdhdGlvbkVycm9yLCBOYXZpZ2F0aW9uU3RhcnQsIE5hdmlnYXRpb25UcmlnZ2VyLCBSZXNvbHZlRW5kLCBSZXNvbHZlU3RhcnQsIFJvdXRlQ29uZmlnTG9hZEVuZCwgUm91dGVDb25maWdMb2FkU3RhcnQsIFJvdXRlc1JlY29nbml6ZWR9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7YWN0aXZhdGVSb3V0ZXN9IGZyb20gJy4vb3BlcmF0b3JzL2FjdGl2YXRlX3JvdXRlcyc7XG5pbXBvcnQge2FwcGx5UmVkaXJlY3RzfSBmcm9tICcuL29wZXJhdG9ycy9hcHBseV9yZWRpcmVjdHMnO1xuaW1wb3J0IHtjaGVja0d1YXJkc30gZnJvbSAnLi9vcGVyYXRvcnMvY2hlY2tfZ3VhcmRzJztcbmltcG9ydCB7cmVjb2duaXplfSBmcm9tICcuL29wZXJhdG9ycy9yZWNvZ25pemUnO1xuaW1wb3J0IHtyZXNvbHZlRGF0YX0gZnJvbSAnLi9vcGVyYXRvcnMvcmVzb2x2ZV9kYXRhJztcbmltcG9ydCB7c3dpdGNoVGFwfSBmcm9tICcuL29wZXJhdG9ycy9zd2l0Y2hfdGFwJztcbmltcG9ydCB7RGVmYXVsdFJvdXRlUmV1c2VTdHJhdGVneSwgUm91dGVSZXVzZVN0cmF0ZWd5fSBmcm9tICcuL3JvdXRlX3JldXNlX3N0cmF0ZWd5JztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0c30gZnJvbSAnLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZSwgY3JlYXRlRW1wdHlTdGF0ZSwgUm91dGVyU3RhdGUsIFJvdXRlclN0YXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7aXNOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IsIG5hdmlnYXRpb25DYW5jZWxpbmdFcnJvciwgUGFyYW1zfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge0RlZmF1bHRVcmxIYW5kbGluZ1N0cmF0ZWd5LCBVcmxIYW5kbGluZ1N0cmF0ZWd5fSBmcm9tICcuL3VybF9oYW5kbGluZ19zdHJhdGVneSc7XG5pbXBvcnQge2NvbnRhaW5zVHJlZSwgY3JlYXRlRW1wdHlVcmxUcmVlLCBJc0FjdGl2ZU1hdGNoT3B0aW9ucywgVXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge3N0YW5kYXJkaXplQ29uZmlnLCB2YWxpZGF0ZUNvbmZpZ30gZnJvbSAnLi91dGlscy9jb25maWcnO1xuaW1wb3J0IHtDaGVja3MsIGdldEFsbFJvdXRlR3VhcmRzfSBmcm9tICcuL3V0aWxzL3ByZWFjdGl2YXRpb24nO1xuaW1wb3J0IHtpc1VybFRyZWV9IGZyb20gJy4vdXRpbHMvdHlwZV9ndWFyZHMnO1xuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogT3B0aW9ucyB0aGF0IG1vZGlmeSB0aGUgYFJvdXRlcmAgVVJMLlxuICogU3VwcGx5IGFuIG9iamVjdCBjb250YWluaW5nIGFueSBvZiB0aGVzZSBwcm9wZXJ0aWVzIHRvIGEgYFJvdXRlcmAgbmF2aWdhdGlvbiBmdW5jdGlvbiB0b1xuICogY29udHJvbCBob3cgdGhlIHRhcmdldCBVUkwgc2hvdWxkIGJlIGNvbnN0cnVjdGVkLlxuICpcbiAqIEBzZWUgW1JvdXRlci5uYXZpZ2F0ZSgpIG1ldGhvZF0oYXBpL3JvdXRlci9Sb3V0ZXIjbmF2aWdhdGUpXG4gKiBAc2VlIFtSb3V0ZXIuY3JlYXRlVXJsVHJlZSgpIG1ldGhvZF0oYXBpL3JvdXRlci9Sb3V0ZXIjY3JlYXRldXJsdHJlZSlcbiAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRlcilcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVXJsQ3JlYXRpb25PcHRpb25zIHtcbiAgLyoqXG4gICAqIFNwZWNpZmllcyBhIHJvb3QgVVJJIHRvIHVzZSBmb3IgcmVsYXRpdmUgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogRm9yIGV4YW1wbGUsIGNvbnNpZGVyIHRoZSBmb2xsb3dpbmcgcm91dGUgY29uZmlndXJhdGlvbiB3aGVyZSB0aGUgcGFyZW50IHJvdXRlXG4gICAqIGhhcyB0d28gY2hpbGRyZW4uXG4gICAqXG4gICAqIGBgYFxuICAgKiBbe1xuICAgKiAgIHBhdGg6ICdwYXJlbnQnLFxuICAgKiAgIGNvbXBvbmVudDogUGFyZW50Q29tcG9uZW50LFxuICAgKiAgIGNoaWxkcmVuOiBbe1xuICAgKiAgICAgcGF0aDogJ2xpc3QnLFxuICAgKiAgICAgY29tcG9uZW50OiBMaXN0Q29tcG9uZW50XG4gICAqICAgfSx7XG4gICAqICAgICBwYXRoOiAnY2hpbGQnLFxuICAgKiAgICAgY29tcG9uZW50OiBDaGlsZENvbXBvbmVudFxuICAgKiAgIH1dXG4gICAqIH1dXG4gICAqIGBgYFxuICAgKlxuICAgKiBUaGUgZm9sbG93aW5nIGBnbygpYCBmdW5jdGlvbiBuYXZpZ2F0ZXMgdG8gdGhlIGBsaXN0YCByb3V0ZSBieVxuICAgKiBpbnRlcnByZXRpbmcgdGhlIGRlc3RpbmF0aW9uIFVSSSBhcyByZWxhdGl2ZSB0byB0aGUgYWN0aXZhdGVkIGBjaGlsZGAgIHJvdXRlXG4gICAqXG4gICAqIGBgYFxuICAgKiAgQENvbXBvbmVudCh7Li4ufSlcbiAgICogIGNsYXNzIENoaWxkQ29tcG9uZW50IHtcbiAgICogICAgY29uc3RydWN0b3IocHJpdmF0ZSByb3V0ZXI6IFJvdXRlciwgcHJpdmF0ZSByb3V0ZTogQWN0aXZhdGVkUm91dGUpIHt9XG4gICAqXG4gICAqICAgIGdvKCkge1xuICAgKiAgICAgIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnLi4vbGlzdCddLCB7IHJlbGF0aXZlVG86IHRoaXMucm91dGUgfSk7XG4gICAqICAgIH1cbiAgICogIH1cbiAgICogYGBgXG4gICAqXG4gICAqIEEgdmFsdWUgb2YgYG51bGxgIG9yIGB1bmRlZmluZWRgIGluZGljYXRlcyB0aGF0IHRoZSBuYXZpZ2F0aW9uIGNvbW1hbmRzIHNob3VsZCBiZSBhcHBsaWVkXG4gICAqIHJlbGF0aXZlIHRvIHRoZSByb290LlxuICAgKi9cbiAgcmVsYXRpdmVUbz86IEFjdGl2YXRlZFJvdXRlfG51bGw7XG5cbiAgLyoqXG4gICAqIFNldHMgcXVlcnkgcGFyYW1ldGVycyB0byB0aGUgVVJMLlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgdG8gL3Jlc3VsdHM/cGFnZT0xXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3Jlc3VsdHMnXSwgeyBxdWVyeVBhcmFtczogeyBwYWdlOiAxIH0gfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcXVlcnlQYXJhbXM/OiBQYXJhbXN8bnVsbDtcblxuICAvKipcbiAgICogU2V0cyB0aGUgaGFzaCBmcmFnbWVudCBmb3IgdGhlIFVSTC5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHRvIC9yZXN1bHRzI3RvcFxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy9yZXN1bHRzJ10sIHsgZnJhZ21lbnQ6ICd0b3AnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGZyYWdtZW50Pzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gaGFuZGxlIHF1ZXJ5IHBhcmFtZXRlcnMgaW4gdGhlIHJvdXRlciBsaW5rIGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uLlxuICAgKiBPbmUgb2Y6XG4gICAqICogYHByZXNlcnZlYCA6IFByZXNlcnZlIGN1cnJlbnQgcGFyYW1ldGVycy5cbiAgICogKiBgbWVyZ2VgIDogTWVyZ2UgbmV3IHdpdGggY3VycmVudCBwYXJhbWV0ZXJzLlxuICAgKlxuICAgKiBUaGUgXCJwcmVzZXJ2ZVwiIG9wdGlvbiBkaXNjYXJkcyBhbnkgbmV3IHF1ZXJ5IHBhcmFtczpcbiAgICogYGBgXG4gICAqIC8vIGZyb20gL3ZpZXcxP3BhZ2U9MSB0by92aWV3Mj9wYWdlPTFcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldzInXSwgeyBxdWVyeVBhcmFtczogeyBwYWdlOiAyIH0sICBxdWVyeVBhcmFtc0hhbmRsaW5nOiBcInByZXNlcnZlXCJcbiAgICogfSk7XG4gICAqIGBgYFxuICAgKiBUaGUgXCJtZXJnZVwiIG9wdGlvbiBhcHBlbmRzIG5ldyBxdWVyeSBwYXJhbXMgdG8gdGhlIHBhcmFtcyBmcm9tIHRoZSBjdXJyZW50IFVSTDpcbiAgICogYGBgXG4gICAqIC8vIGZyb20gL3ZpZXcxP3BhZ2U9MSB0by92aWV3Mj9wYWdlPTEmb3RoZXJLZXk9MlxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3MiddLCB7IHF1ZXJ5UGFyYW1zOiB7IG90aGVyS2V5OiAyIH0sICBxdWVyeVBhcmFtc0hhbmRsaW5nOiBcIm1lcmdlXCJcbiAgICogfSk7XG4gICAqIGBgYFxuICAgKiBJbiBjYXNlIG9mIGEga2V5IGNvbGxpc2lvbiBiZXR3ZWVuIGN1cnJlbnQgcGFyYW1ldGVycyBhbmQgdGhvc2UgaW4gdGhlIGBxdWVyeVBhcmFtc2Agb2JqZWN0LFxuICAgKiB0aGUgbmV3IHZhbHVlIGlzIHVzZWQuXG4gICAqXG4gICAqL1xuICBxdWVyeVBhcmFtc0hhbmRsaW5nPzogUXVlcnlQYXJhbXNIYW5kbGluZ3xudWxsO1xuXG4gIC8qKlxuICAgKiBXaGVuIHRydWUsIHByZXNlcnZlcyB0aGUgVVJMIGZyYWdtZW50IGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBQcmVzZXJ2ZSBmcmFnbWVudCBmcm9tIC9yZXN1bHRzI3RvcCB0byAvdmlldyN0b3BcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHByZXNlcnZlRnJhZ21lbnQ6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcHJlc2VydmVGcmFnbWVudD86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogT3B0aW9ucyB0aGF0IG1vZGlmeSB0aGUgYFJvdXRlcmAgbmF2aWdhdGlvbiBzdHJhdGVneS5cbiAqIFN1cHBseSBhbiBvYmplY3QgY29udGFpbmluZyBhbnkgb2YgdGhlc2UgcHJvcGVydGllcyB0byBhIGBSb3V0ZXJgIG5hdmlnYXRpb24gZnVuY3Rpb24gdG9cbiAqIGNvbnRyb2wgaG93IHRoZSBuYXZpZ2F0aW9uIHNob3VsZCBiZSBoYW5kbGVkLlxuICpcbiAqIEBzZWUgW1JvdXRlci5uYXZpZ2F0ZSgpIG1ldGhvZF0oYXBpL3JvdXRlci9Sb3V0ZXIjbmF2aWdhdGUpXG4gKiBAc2VlIFtSb3V0ZXIubmF2aWdhdGVCeVVybCgpIG1ldGhvZF0oYXBpL3JvdXRlci9Sb3V0ZXIjbmF2aWdhdGVieXVybClcbiAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRlcilcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBXaGVuIHRydWUsIG5hdmlnYXRlcyB3aXRob3V0IHB1c2hpbmcgYSBuZXcgc3RhdGUgaW50byBoaXN0b3J5LlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgc2lsZW50bHkgdG8gL3ZpZXdcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqL1xuICBza2lwTG9jYXRpb25DaGFuZ2U/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGVuIHRydWUsIG5hdmlnYXRlcyB3aGlsZSByZXBsYWNpbmcgdGhlIGN1cnJlbnQgc3RhdGUgaW4gaGlzdG9yeS5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHRvIC92aWV3XG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyByZXBsYWNlVXJsOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHJlcGxhY2VVcmw/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBEZXZlbG9wZXItZGVmaW5lZCBzdGF0ZSB0aGF0IGNhbiBiZSBwYXNzZWQgdG8gYW55IG5hdmlnYXRpb24uXG4gICAqIEFjY2VzcyB0aGlzIHZhbHVlIHRocm91Z2ggdGhlIGBOYXZpZ2F0aW9uLmV4dHJhc2Agb2JqZWN0XG4gICAqIHJldHVybmVkIGZyb20gdGhlIFtSb3V0ZXIuZ2V0Q3VycmVudE5hdmlnYXRpb24oKVxuICAgKiBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI2dldGN1cnJlbnRuYXZpZ2F0aW9uKSB3aGlsZSBhIG5hdmlnYXRpb24gaXMgZXhlY3V0aW5nLlxuICAgKlxuICAgKiBBZnRlciBhIG5hdmlnYXRpb24gY29tcGxldGVzLCB0aGUgcm91dGVyIHdyaXRlcyBhbiBvYmplY3QgY29udGFpbmluZyB0aGlzXG4gICAqIHZhbHVlIHRvZ2V0aGVyIHdpdGggYSBgbmF2aWdhdGlvbklkYCB0byBgaGlzdG9yeS5zdGF0ZWAuXG4gICAqIFRoZSB2YWx1ZSBpcyB3cml0dGVuIHdoZW4gYGxvY2F0aW9uLmdvKClgIG9yIGBsb2NhdGlvbi5yZXBsYWNlU3RhdGUoKWBcbiAgICogaXMgY2FsbGVkIGJlZm9yZSBhY3RpdmF0aW5nIHRoaXMgcm91dGUuXG4gICAqXG4gICAqIE5vdGUgdGhhdCBgaGlzdG9yeS5zdGF0ZWAgZG9lcyBub3QgcGFzcyBhbiBvYmplY3QgZXF1YWxpdHkgdGVzdCBiZWNhdXNlXG4gICAqIHRoZSByb3V0ZXIgYWRkcyB0aGUgYG5hdmlnYXRpb25JZGAgb24gZWFjaCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKi9cbiAgc3RhdGU/OiB7W2s6IHN0cmluZ106IGFueX07XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogT3B0aW9ucyB0aGF0IG1vZGlmeSB0aGUgYFJvdXRlcmAgbmF2aWdhdGlvbiBzdHJhdGVneS5cbiAqIFN1cHBseSBhbiBvYmplY3QgY29udGFpbmluZyBhbnkgb2YgdGhlc2UgcHJvcGVydGllcyB0byBhIGBSb3V0ZXJgIG5hdmlnYXRpb24gZnVuY3Rpb24gdG9cbiAqIGNvbnRyb2wgaG93IHRoZSB0YXJnZXQgVVJMIHNob3VsZCBiZSBjb25zdHJ1Y3RlZCBvciBpbnRlcnByZXRlZC5cbiAqXG4gKiBAc2VlIFtSb3V0ZXIubmF2aWdhdGUoKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI25hdmlnYXRlKVxuICogQHNlZSBbUm91dGVyLm5hdmlnYXRlQnlVcmwoKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI25hdmlnYXRlYnl1cmwpXG4gKiBAc2VlIFtSb3V0ZXIuY3JlYXRlVXJsVHJlZSgpIG1ldGhvZF0oYXBpL3JvdXRlci9Sb3V0ZXIjY3JlYXRldXJsdHJlZSlcbiAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRlcilcbiAqIEBzZWUgVXJsQ3JlYXRpb25PcHRpb25zXG4gKiBAc2VlIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnNcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmF2aWdhdGlvbkV4dHJhcyBleHRlbmRzIFVybENyZWF0aW9uT3B0aW9ucywgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyB7fVxuXG4vKipcbiAqIEVycm9yIGhhbmRsZXIgdGhhdCBpcyBpbnZva2VkIHdoZW4gYSBuYXZpZ2F0aW9uIGVycm9yIG9jY3Vycy5cbiAqXG4gKiBJZiB0aGUgaGFuZGxlciByZXR1cm5zIGEgdmFsdWUsIHRoZSBuYXZpZ2F0aW9uIFByb21pc2UgaXMgcmVzb2x2ZWQgd2l0aCB0aGlzIHZhbHVlLlxuICogSWYgdGhlIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbiwgdGhlIG5hdmlnYXRpb24gUHJvbWlzZSBpcyByZWplY3RlZCB3aXRoXG4gKiB0aGUgZXhjZXB0aW9uLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgRXJyb3JIYW5kbGVyID0gKGVycm9yOiBhbnkpID0+IGFueTtcblxuZnVuY3Rpb24gZGVmYXVsdEVycm9ySGFuZGxlcihlcnJvcjogYW55KTogYW55IHtcbiAgdGhyb3cgZXJyb3I7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRNYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIoXG4gICAgZXJyb3I6IFVSSUVycm9yLCB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLCB1cmw6IHN0cmluZyk6IFVybFRyZWUge1xuICByZXR1cm4gdXJsU2VyaWFsaXplci5wYXJzZSgnLycpO1xufVxuXG5leHBvcnQgdHlwZSBSZXN0b3JlZFN0YXRlID0ge1xuICBbazogc3RyaW5nXTogYW55LFxuICAvLyBUT0RPKCMyNzYwNyk6IFJlbW92ZSBgbmF2aWdhdGlvbklkYCBhbmQgYMm1cm91dGVyUGFnZUlkYCBhbmQgbW92ZSB0byBgbmdgIG9yIGDJtWAgbmFtZXNwYWNlLlxuICBuYXZpZ2F0aW9uSWQ6IG51bWJlcixcbiAgLy8gVGhlIGDJtWAgcHJlZml4IGlzIHRoZXJlIHRvIHJlZHVjZSB0aGUgY2hhbmNlIG9mIGNvbGxpZGluZyB3aXRoIGFueSBleGlzdGluZyB1c2VyIHByb3BlcnRpZXMgb25cbiAgLy8gdGhlIGhpc3Rvcnkgc3RhdGUuXG4gIMm1cm91dGVyUGFnZUlkPzogbnVtYmVyLFxufTtcblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCBhIG5hdmlnYXRpb24gb3BlcmF0aW9uLlxuICogUmV0cmlldmUgdGhlIG1vc3QgcmVjZW50IG5hdmlnYXRpb24gb2JqZWN0IHdpdGggdGhlXG4gKiBbUm91dGVyLmdldEN1cnJlbnROYXZpZ2F0aW9uKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNnZXRjdXJyZW50bmF2aWdhdGlvbikgLlxuICpcbiAqICogKmlkKiA6IFRoZSB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY3VycmVudCBuYXZpZ2F0aW9uLlxuICogKiAqaW5pdGlhbFVybCogOiBUaGUgdGFyZ2V0IFVSTCBwYXNzZWQgaW50byB0aGUgYFJvdXRlciNuYXZpZ2F0ZUJ5VXJsKClgIGNhbGwgYmVmb3JlIG5hdmlnYXRpb24uXG4gKiBUaGlzIGlzIHRoZSB2YWx1ZSBiZWZvcmUgdGhlIHJvdXRlciBoYXMgcGFyc2VkIG9yIGFwcGxpZWQgcmVkaXJlY3RzIHRvIGl0LlxuICogKiAqZXh0cmFjdGVkVXJsKiA6IFRoZSBpbml0aWFsIHRhcmdldCBVUkwgYWZ0ZXIgYmVpbmcgcGFyc2VkIHdpdGggYFVybFNlcmlhbGl6ZXIuZXh0cmFjdCgpYC5cbiAqICogKmZpbmFsVXJsKiA6IFRoZSBleHRyYWN0ZWQgVVJMIGFmdGVyIHJlZGlyZWN0cyBoYXZlIGJlZW4gYXBwbGllZC5cbiAqIFRoaXMgVVJMIG1heSBub3QgYmUgYXZhaWxhYmxlIGltbWVkaWF0ZWx5LCB0aGVyZWZvcmUgdGhpcyBwcm9wZXJ0eSBjYW4gYmUgYHVuZGVmaW5lZGAuXG4gKiBJdCBpcyBndWFyYW50ZWVkIHRvIGJlIHNldCBhZnRlciB0aGUgYFJvdXRlc1JlY29nbml6ZWRgIGV2ZW50IGZpcmVzLlxuICogKiAqdHJpZ2dlciogOiBJZGVudGlmaWVzIGhvdyB0aGlzIG5hdmlnYXRpb24gd2FzIHRyaWdnZXJlZC5cbiAqIC0tICdpbXBlcmF0aXZlJy0tVHJpZ2dlcmVkIGJ5IGByb3V0ZXIubmF2aWdhdGVCeVVybGAgb3IgYHJvdXRlci5uYXZpZ2F0ZWAuXG4gKiAtLSAncG9wc3RhdGUnLS1UcmlnZ2VyZWQgYnkgYSBwb3BzdGF0ZSBldmVudC5cbiAqIC0tICdoYXNoY2hhbmdlJy0tVHJpZ2dlcmVkIGJ5IGEgaGFzaGNoYW5nZSBldmVudC5cbiAqICogKmV4dHJhcyogOiBBIGBOYXZpZ2F0aW9uRXh0cmFzYCBvcHRpb25zIG9iamVjdCB0aGF0IGNvbnRyb2xsZWQgdGhlIHN0cmF0ZWd5IHVzZWQgZm9yIHRoaXNcbiAqIG5hdmlnYXRpb24uXG4gKiAqICpwcmV2aW91c05hdmlnYXRpb24qIDogVGhlIHByZXZpb3VzbHkgc3VjY2Vzc2Z1bCBgTmF2aWdhdGlvbmAgb2JqZWN0LiBPbmx5IG9uZSBwcmV2aW91c1xuICogbmF2aWdhdGlvbiBpcyBhdmFpbGFibGUsIHRoZXJlZm9yZSB0aGlzIHByZXZpb3VzIGBOYXZpZ2F0aW9uYCBvYmplY3QgaGFzIGEgYG51bGxgIHZhbHVlIGZvciBpdHNcbiAqIG93biBgcHJldmlvdXNOYXZpZ2F0aW9uYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmF2aWdhdGlvbiB7XG4gIC8qKlxuICAgKiBUaGUgdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGN1cnJlbnQgbmF2aWdhdGlvbi5cbiAgICovXG4gIGlkOiBudW1iZXI7XG4gIC8qKlxuICAgKiBUaGUgdGFyZ2V0IFVSTCBwYXNzZWQgaW50byB0aGUgYFJvdXRlciNuYXZpZ2F0ZUJ5VXJsKClgIGNhbGwgYmVmb3JlIG5hdmlnYXRpb24uIFRoaXMgaXNcbiAgICogdGhlIHZhbHVlIGJlZm9yZSB0aGUgcm91dGVyIGhhcyBwYXJzZWQgb3IgYXBwbGllZCByZWRpcmVjdHMgdG8gaXQuXG4gICAqL1xuICBpbml0aWFsVXJsOiBzdHJpbmd8VXJsVHJlZTtcbiAgLyoqXG4gICAqIFRoZSBpbml0aWFsIHRhcmdldCBVUkwgYWZ0ZXIgYmVpbmcgcGFyc2VkIHdpdGggYFVybFNlcmlhbGl6ZXIuZXh0cmFjdCgpYC5cbiAgICovXG4gIGV4dHJhY3RlZFVybDogVXJsVHJlZTtcbiAgLyoqXG4gICAqIFRoZSBleHRyYWN0ZWQgVVJMIGFmdGVyIHJlZGlyZWN0cyBoYXZlIGJlZW4gYXBwbGllZC5cbiAgICogVGhpcyBVUkwgbWF5IG5vdCBiZSBhdmFpbGFibGUgaW1tZWRpYXRlbHksIHRoZXJlZm9yZSB0aGlzIHByb3BlcnR5IGNhbiBiZSBgdW5kZWZpbmVkYC5cbiAgICogSXQgaXMgZ3VhcmFudGVlZCB0byBiZSBzZXQgYWZ0ZXIgdGhlIGBSb3V0ZXNSZWNvZ25pemVkYCBldmVudCBmaXJlcy5cbiAgICovXG4gIGZpbmFsVXJsPzogVXJsVHJlZTtcbiAgLyoqXG4gICAqIElkZW50aWZpZXMgaG93IHRoaXMgbmF2aWdhdGlvbiB3YXMgdHJpZ2dlcmVkLlxuICAgKlxuICAgKiAqICdpbXBlcmF0aXZlJy0tVHJpZ2dlcmVkIGJ5IGByb3V0ZXIubmF2aWdhdGVCeVVybGAgb3IgYHJvdXRlci5uYXZpZ2F0ZWAuXG4gICAqICogJ3BvcHN0YXRlJy0tVHJpZ2dlcmVkIGJ5IGEgcG9wc3RhdGUgZXZlbnQuXG4gICAqICogJ2hhc2hjaGFuZ2UnLS1UcmlnZ2VyZWQgYnkgYSBoYXNoY2hhbmdlIGV2ZW50LlxuICAgKi9cbiAgdHJpZ2dlcjogJ2ltcGVyYXRpdmUnfCdwb3BzdGF0ZSd8J2hhc2hjaGFuZ2UnO1xuICAvKipcbiAgICogT3B0aW9ucyB0aGF0IGNvbnRyb2xsZWQgdGhlIHN0cmF0ZWd5IHVzZWQgZm9yIHRoaXMgbmF2aWdhdGlvbi5cbiAgICogU2VlIGBOYXZpZ2F0aW9uRXh0cmFzYC5cbiAgICovXG4gIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcztcbiAgLyoqXG4gICAqIFRoZSBwcmV2aW91c2x5IHN1Y2Nlc3NmdWwgYE5hdmlnYXRpb25gIG9iamVjdC4gT25seSBvbmUgcHJldmlvdXMgbmF2aWdhdGlvblxuICAgKiBpcyBhdmFpbGFibGUsIHRoZXJlZm9yZSB0aGlzIHByZXZpb3VzIGBOYXZpZ2F0aW9uYCBvYmplY3QgaGFzIGEgYG51bGxgIHZhbHVlXG4gICAqIGZvciBpdHMgb3duIGBwcmV2aW91c05hdmlnYXRpb25gLlxuICAgKi9cbiAgcHJldmlvdXNOYXZpZ2F0aW9uOiBOYXZpZ2F0aW9ufG51bGw7XG59XG5cbmV4cG9ydCB0eXBlIE5hdmlnYXRpb25UcmFuc2l0aW9uID0ge1xuICBpZDogbnVtYmVyLFxuICB0YXJnZXRQYWdlSWQ6IG51bWJlcixcbiAgY3VycmVudFVybFRyZWU6IFVybFRyZWUsXG4gIGN1cnJlbnRSYXdVcmw6IFVybFRyZWUsXG4gIGV4dHJhY3RlZFVybDogVXJsVHJlZSxcbiAgdXJsQWZ0ZXJSZWRpcmVjdHM6IFVybFRyZWUsXG4gIHJhd1VybDogVXJsVHJlZSxcbiAgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzLFxuICByZXNvbHZlOiBhbnksXG4gIHJlamVjdDogYW55LFxuICBwcm9taXNlOiBQcm9taXNlPGJvb2xlYW4+LFxuICBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLFxuICByZXN0b3JlZFN0YXRlOiBSZXN0b3JlZFN0YXRlfG51bGwsXG4gIGN1cnJlbnRTbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCxcbiAgdGFyZ2V0U25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3R8bnVsbCxcbiAgY3VycmVudFJvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZSxcbiAgdGFyZ2V0Um91dGVyU3RhdGU6IFJvdXRlclN0YXRlfG51bGwsXG4gIGd1YXJkczogQ2hlY2tzLFxuICBndWFyZHNSZXN1bHQ6IGJvb2xlYW58VXJsVHJlZXxudWxsLFxufTtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IHR5cGUgUm91dGVySG9vayA9IChzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCwgcnVuRXh0cmFzOiB7XG4gIGFwcGxpZWRVcmxUcmVlOiBVcmxUcmVlLFxuICByYXdVcmxUcmVlOiBVcmxUcmVlLFxuICBza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW4sXG4gIHJlcGxhY2VVcmw6IGJvb2xlYW4sXG4gIG5hdmlnYXRpb25JZDogbnVtYmVyXG59KSA9PiBPYnNlcnZhYmxlPHZvaWQ+O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBkZWZhdWx0Um91dGVySG9vayhzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCwgcnVuRXh0cmFzOiB7XG4gIGFwcGxpZWRVcmxUcmVlOiBVcmxUcmVlLFxuICByYXdVcmxUcmVlOiBVcmxUcmVlLFxuICBza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW4sXG4gIHJlcGxhY2VVcmw6IGJvb2xlYW4sXG4gIG5hdmlnYXRpb25JZDogbnVtYmVyXG59KTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gIHJldHVybiBvZihudWxsKSBhcyBhbnk7XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gcmVsYXRlZCB0byBhIGxvY2F0aW9uIGNoYW5nZSwgbmVjZXNzYXJ5IGZvciBzY2hlZHVsaW5nIGZvbGxvdy11cCBSb3V0ZXIgbmF2aWdhdGlvbnMuXG4gKi9cbnR5cGUgTG9jYXRpb25DaGFuZ2VJbmZvID0ge1xuICBzb3VyY2U6ICdwb3BzdGF0ZSd8J2hhc2hjaGFuZ2UnLFxuICB1cmxUcmVlOiBVcmxUcmVlLFxuICBzdGF0ZTogUmVzdG9yZWRTdGF0ZXxudWxsLFxuICB0cmFuc2l0aW9uSWQ6IG51bWJlclxufTtcblxuLyoqXG4gKiBUaGUgZXF1aXZhbGVudCBgSXNBY3RpdmVVcmxUcmVlT3B0aW9uc2Agb3B0aW9ucyBmb3IgYFJvdXRlci5pc0FjdGl2ZWAgaXMgY2FsbGVkIHdpdGggYHRydWVgXG4gKiAoZXhhY3QgPSB0cnVlKS5cbiAqL1xuZXhwb3J0IGNvbnN0IGV4YWN0TWF0Y2hPcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucyA9IHtcbiAgcGF0aHM6ICdleGFjdCcsXG4gIGZyYWdtZW50OiAnaWdub3JlZCcsXG4gIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnLFxuICBxdWVyeVBhcmFtczogJ2V4YWN0J1xufTtcblxuLyoqXG4gKiBUaGUgZXF1aXZhbGVudCBgSXNBY3RpdmVVcmxUcmVlT3B0aW9uc2Agb3B0aW9ucyBmb3IgYFJvdXRlci5pc0FjdGl2ZWAgaXMgY2FsbGVkIHdpdGggYGZhbHNlYFxuICogKGV4YWN0ID0gZmFsc2UpLlxuICovXG5leHBvcnQgY29uc3Qgc3Vic2V0TWF0Y2hPcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucyA9IHtcbiAgcGF0aHM6ICdzdWJzZXQnLFxuICBmcmFnbWVudDogJ2lnbm9yZWQnLFxuICBtYXRyaXhQYXJhbXM6ICdpZ25vcmVkJyxcbiAgcXVlcnlQYXJhbXM6ICdzdWJzZXQnXG59O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEEgc2VydmljZSB0aGF0IHByb3ZpZGVzIG5hdmlnYXRpb24gYW1vbmcgdmlld3MgYW5kIFVSTCBtYW5pcHVsYXRpb24gY2FwYWJpbGl0aWVzLlxuICpcbiAqIEBzZWUgYFJvdXRlYC5cbiAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gR3VpZGVdKGd1aWRlL3JvdXRlcikuXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIFJvdXRlciB7XG4gIHByaXZhdGUgY3VycmVudFVybFRyZWU6IFVybFRyZWU7XG4gIHByaXZhdGUgcmF3VXJsVHJlZTogVXJsVHJlZTtcbiAgcHJpdmF0ZSBicm93c2VyVXJsVHJlZTogVXJsVHJlZTtcbiAgcHJpdmF0ZSByZWFkb25seSB0cmFuc2l0aW9uczogQmVoYXZpb3JTdWJqZWN0PE5hdmlnYXRpb25UcmFuc2l0aW9uPjtcbiAgcHJpdmF0ZSBuYXZpZ2F0aW9uczogT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj47XG4gIHByaXZhdGUgbGFzdFN1Y2Nlc3NmdWxOYXZpZ2F0aW9uOiBOYXZpZ2F0aW9ufG51bGwgPSBudWxsO1xuICBwcml2YXRlIGN1cnJlbnROYXZpZ2F0aW9uOiBOYXZpZ2F0aW9ufG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRpc3Bvc2VkID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBsb2NhdGlvblN1YnNjcmlwdGlvbj86IFN1YnNjcmlwdGlvbkxpa2U7XG4gIC8qKlxuICAgKiBUcmFja3MgdGhlIHByZXZpb3VzbHkgc2VlbiBsb2NhdGlvbiBjaGFuZ2UgZnJvbSB0aGUgbG9jYXRpb24gc3Vic2NyaXB0aW9uIHNvIHdlIGNhbiBjb21wYXJlXG4gICAqIHRoZSB0d28gbGF0ZXN0IHRvIHNlZSBpZiB0aGV5IGFyZSBkdXBsaWNhdGVzLiBTZWUgc2V0VXBMb2NhdGlvbkNoYW5nZUxpc3RlbmVyLlxuICAgKi9cbiAgcHJpdmF0ZSBsYXN0TG9jYXRpb25DaGFuZ2VJbmZvOiBMb2NhdGlvbkNoYW5nZUluZm98bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgbmF2aWdhdGlvbklkOiBudW1iZXIgPSAwO1xuXG4gIC8qKlxuICAgKiBUaGUgaWQgb2YgdGhlIGN1cnJlbnRseSBhY3RpdmUgcGFnZSBpbiB0aGUgcm91dGVyLlxuICAgKiBVcGRhdGVkIHRvIHRoZSB0cmFuc2l0aW9uJ3MgdGFyZ2V0IGlkIG9uIGEgc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBUaGlzIGlzIHVzZWQgdG8gdHJhY2sgd2hhdCBwYWdlIHRoZSByb3V0ZXIgbGFzdCBhY3RpdmF0ZWQuIFdoZW4gYW4gYXR0ZW1wdGVkIG5hdmlnYXRpb24gZmFpbHMsXG4gICAqIHRoZSByb3V0ZXIgY2FuIHRoZW4gdXNlIHRoaXMgdG8gY29tcHV0ZSBob3cgdG8gcmVzdG9yZSB0aGUgc3RhdGUgYmFjayB0byB0aGUgcHJldmlvdXNseSBhY3RpdmVcbiAgICogcGFnZS5cbiAgICovXG4gIHByaXZhdGUgY3VycmVudFBhZ2VJZDogbnVtYmVyID0gMDtcbiAgLyoqXG4gICAqIFRoZSDJtXJvdXRlclBhZ2VJZCBvZiB3aGF0ZXZlciBwYWdlIGlzIGN1cnJlbnRseSBhY3RpdmUgaW4gdGhlIGJyb3dzZXIgaGlzdG9yeS4gVGhpcyBpc1xuICAgKiBpbXBvcnRhbnQgZm9yIGNvbXB1dGluZyB0aGUgdGFyZ2V0IHBhZ2UgaWQgZm9yIG5ldyBuYXZpZ2F0aW9ucyBiZWNhdXNlIHdlIG5lZWQgdG8gZW5zdXJlIGVhY2hcbiAgICogcGFnZSBpZCBpbiB0aGUgYnJvd3NlciBoaXN0b3J5IGlzIDEgbW9yZSB0aGFuIHRoZSBwcmV2aW91cyBlbnRyeS5cbiAgICovXG4gIHByaXZhdGUgZ2V0IGJyb3dzZXJQYWdlSWQoKTogbnVtYmVyfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuICh0aGlzLmxvY2F0aW9uLmdldFN0YXRlKCkgYXMgUmVzdG9yZWRTdGF0ZSB8IG51bGwpPy7JtXJvdXRlclBhZ2VJZDtcbiAgfVxuICBwcml2YXRlIGNvbmZpZ0xvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyO1xuICBwcml2YXRlIG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+O1xuICBwcml2YXRlIGNvbnNvbGU6IENvbnNvbGU7XG4gIHByaXZhdGUgaXNOZ1pvbmVFbmFibGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEFuIGV2ZW50IHN0cmVhbSBmb3Igcm91dGluZyBldmVudHMgaW4gdGhpcyBOZ01vZHVsZS5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBldmVudHM6IE9ic2VydmFibGU8RXZlbnQ+ID0gbmV3IFN1YmplY3Q8RXZlbnQ+KCk7XG4gIC8qKlxuICAgKiBUaGUgY3VycmVudCBzdGF0ZSBvZiByb3V0aW5nIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgcm91dGVyU3RhdGU6IFJvdXRlclN0YXRlO1xuXG4gIC8qKlxuICAgKiBBIGhhbmRsZXIgZm9yIG5hdmlnYXRpb24gZXJyb3JzIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqL1xuICBlcnJvckhhbmRsZXI6IEVycm9ySGFuZGxlciA9IGRlZmF1bHRFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIEEgaGFuZGxlciBmb3IgZXJyb3JzIHRocm93biBieSBgUm91dGVyLnBhcnNlVXJsKHVybClgXG4gICAqIHdoZW4gYHVybGAgY29udGFpbnMgYW4gaW52YWxpZCBjaGFyYWN0ZXIuXG4gICAqIFRoZSBtb3N0IGNvbW1vbiBjYXNlIGlzIGEgYCVgIHNpZ25cbiAgICogdGhhdCdzIG5vdCBlbmNvZGVkIGFuZCBpcyBub3QgcGFydCBvZiBhIHBlcmNlbnQgZW5jb2RlZCBzZXF1ZW5jZS5cbiAgICovXG4gIG1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcjpcbiAgICAgIChlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgICAgdXJsOiBzdHJpbmcpID0+IFVybFRyZWUgPSBkZWZhdWx0TWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyO1xuXG4gIC8qKlxuICAgKiBUcnVlIGlmIGF0IGxlYXN0IG9uZSBuYXZpZ2F0aW9uIGV2ZW50IGhhcyBvY2N1cnJlZCxcbiAgICogZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgbmF2aWdhdGVkOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgbGFzdFN1Y2Nlc3NmdWxJZDogbnVtYmVyID0gLTE7XG5cbiAgLyoqXG4gICAqIEhvb2tzIHRoYXQgZW5hYmxlIHlvdSB0byBwYXVzZSBuYXZpZ2F0aW9uLFxuICAgKiBlaXRoZXIgYmVmb3JlIG9yIGFmdGVyIHRoZSBwcmVhY3RpdmF0aW9uIHBoYXNlLlxuICAgKiBVc2VkIGJ5IGBSb3V0ZXJNb2R1bGVgLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGhvb2tzOiB7XG4gICAgYmVmb3JlUHJlYWN0aXZhdGlvbjogUm91dGVySG9vayxcbiAgICBhZnRlclByZWFjdGl2YXRpb246IFJvdXRlckhvb2tcbiAgfSA9IHtiZWZvcmVQcmVhY3RpdmF0aW9uOiBkZWZhdWx0Um91dGVySG9vaywgYWZ0ZXJQcmVhY3RpdmF0aW9uOiBkZWZhdWx0Um91dGVySG9va307XG5cbiAgLyoqXG4gICAqIEEgc3RyYXRlZ3kgZm9yIGV4dHJhY3RpbmcgYW5kIG1lcmdpbmcgVVJMcy5cbiAgICogVXNlZCBmb3IgQW5ndWxhckpTIHRvIEFuZ3VsYXIgbWlncmF0aW9ucy5cbiAgICovXG4gIHVybEhhbmRsaW5nU3RyYXRlZ3k6IFVybEhhbmRsaW5nU3RyYXRlZ3kgPSBuZXcgRGVmYXVsdFVybEhhbmRsaW5nU3RyYXRlZ3koKTtcblxuICAvKipcbiAgICogQSBzdHJhdGVneSBmb3IgcmUtdXNpbmcgcm91dGVzLlxuICAgKi9cbiAgcm91dGVSZXVzZVN0cmF0ZWd5OiBSb3V0ZVJldXNlU3RyYXRlZ3kgPSBuZXcgRGVmYXVsdFJvdXRlUmV1c2VTdHJhdGVneSgpO1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gaGFuZGxlIGEgbmF2aWdhdGlvbiByZXF1ZXN0IHRvIHRoZSBjdXJyZW50IFVSTC4gT25lIG9mOlxuICAgKlxuICAgKiAtIGAnaWdub3JlJ2AgOiAgVGhlIHJvdXRlciBpZ25vcmVzIHRoZSByZXF1ZXN0LlxuICAgKiAtIGAncmVsb2FkJ2AgOiBUaGUgcm91dGVyIHJlbG9hZHMgdGhlIFVSTC4gVXNlIHRvIGltcGxlbWVudCBhIFwicmVmcmVzaFwiIGZlYXR1cmUuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGlzIG9ubHkgY29uZmlndXJlcyB3aGV0aGVyIHRoZSBSb3V0ZSByZXByb2Nlc3NlcyB0aGUgVVJMIGFuZCB0cmlnZ2VycyByZWxhdGVkXG4gICAqIGFjdGlvbiBhbmQgZXZlbnRzIGxpa2UgcmVkaXJlY3RzLCBndWFyZHMsIGFuZCByZXNvbHZlcnMuIEJ5IGRlZmF1bHQsIHRoZSByb3V0ZXIgcmUtdXNlcyBhXG4gICAqIGNvbXBvbmVudCBpbnN0YW5jZSB3aGVuIGl0IHJlLW5hdmlnYXRlcyB0byB0aGUgc2FtZSBjb21wb25lbnQgdHlwZSB3aXRob3V0IHZpc2l0aW5nIGEgZGlmZmVyZW50XG4gICAqIGNvbXBvbmVudCBmaXJzdC4gVGhpcyBiZWhhdmlvciBpcyBjb25maWd1cmVkIGJ5IHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YC4gSW4gb3JkZXIgdG8gcmVsb2FkXG4gICAqIHJvdXRlZCBjb21wb25lbnRzIG9uIHNhbWUgdXJsIG5hdmlnYXRpb24sIHlvdSBuZWVkIHRvIHNldCBgb25TYW1lVXJsTmF2aWdhdGlvbmAgdG8gYCdyZWxvYWQnYFxuICAgKiBfYW5kXyBwcm92aWRlIGEgYFJvdXRlUmV1c2VTdHJhdGVneWAgd2hpY2ggcmV0dXJucyBgZmFsc2VgIGZvciBgc2hvdWxkUmV1c2VSb3V0ZWAuXG4gICAqL1xuICBvblNhbWVVcmxOYXZpZ2F0aW9uOiAncmVsb2FkJ3wnaWdub3JlJyA9ICdpZ25vcmUnO1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gbWVyZ2UgcGFyYW1ldGVycywgZGF0YSwgYW5kIHJlc29sdmVkIGRhdGEgZnJvbSBwYXJlbnQgdG8gY2hpbGRcbiAgICogcm91dGVzLiBPbmUgb2Y6XG4gICAqXG4gICAqIC0gYCdlbXB0eU9ubHknYCA6IEluaGVyaXQgcGFyZW50IHBhcmFtZXRlcnMsIGRhdGEsIGFuZCByZXNvbHZlZCBkYXRhXG4gICAqIGZvciBwYXRoLWxlc3Mgb3IgY29tcG9uZW50LWxlc3Mgcm91dGVzLlxuICAgKiAtIGAnYWx3YXlzJ2AgOiBJbmhlcml0IHBhcmVudCBwYXJhbWV0ZXJzLCBkYXRhLCBhbmQgcmVzb2x2ZWQgZGF0YVxuICAgKiBmb3IgYWxsIGNoaWxkIHJvdXRlcy5cbiAgICovXG4gIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6ICdlbXB0eU9ubHknfCdhbHdheXMnID0gJ2VtcHR5T25seSc7XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hlbiB0aGUgcm91dGVyIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMLlxuICAgKiBCeSBkZWZhdWx0IChgXCJkZWZlcnJlZFwiYCksIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMIGFmdGVyIG5hdmlnYXRpb24gaGFzIGZpbmlzaGVkLlxuICAgKiBTZXQgdG8gYCdlYWdlcidgIHRvIHVwZGF0ZSB0aGUgYnJvd3NlciBVUkwgYXQgdGhlIGJlZ2lubmluZyBvZiBuYXZpZ2F0aW9uLlxuICAgKiBZb3UgY2FuIGNob29zZSB0byB1cGRhdGUgZWFybHkgc28gdGhhdCwgaWYgbmF2aWdhdGlvbiBmYWlscyxcbiAgICogeW91IGNhbiBzaG93IGFuIGVycm9yIG1lc3NhZ2Ugd2l0aCB0aGUgVVJMIHRoYXQgZmFpbGVkLlxuICAgKi9cbiAgdXJsVXBkYXRlU3RyYXRlZ3k6ICdkZWZlcnJlZCd8J2VhZ2VyJyA9ICdkZWZlcnJlZCc7XG5cbiAgLyoqXG4gICAqIEVuYWJsZXMgYSBidWcgZml4IHRoYXQgY29ycmVjdHMgcmVsYXRpdmUgbGluayByZXNvbHV0aW9uIGluIGNvbXBvbmVudHMgd2l0aCBlbXB0eSBwYXRocy5cbiAgICogQHNlZSBgUm91dGVyTW9kdWxlYFxuICAgKi9cbiAgcmVsYXRpdmVMaW5rUmVzb2x1dGlvbjogJ2xlZ2FjeSd8J2NvcnJlY3RlZCcgPSAnY29ycmVjdGVkJztcblxuICAvKipcbiAgICogQ29uZmlndXJlcyBob3cgdGhlIFJvdXRlciBhdHRlbXB0cyB0byByZXN0b3JlIHN0YXRlIHdoZW4gYSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGxlZC5cbiAgICpcbiAgICogJ3JlcGxhY2UnIC0gQWx3YXlzIHVzZXMgYGxvY2F0aW9uLnJlcGxhY2VTdGF0ZWAgdG8gc2V0IHRoZSBicm93c2VyIHN0YXRlIHRvIHRoZSBzdGF0ZSBvZiB0aGVcbiAgICogcm91dGVyIGJlZm9yZSB0aGUgbmF2aWdhdGlvbiBzdGFydGVkLlxuICAgKlxuICAgKiAnY29tcHV0ZWQnIC0gV2lsbCBhbHdheXMgcmV0dXJuIHRvIHRoZSBzYW1lIHN0YXRlIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIGFjdHVhbCBBbmd1bGFyIHJvdXRlXG4gICAqIHdoZW4gdGhlIG5hdmlnYXRpb24gZ2V0cyBjYW5jZWxsZWQgcmlnaHQgYWZ0ZXIgdHJpZ2dlcmluZyBhIGBwb3BzdGF0ZWAgZXZlbnQuXG4gICAqXG4gICAqIFRoZSBkZWZhdWx0IHZhbHVlIGlzIGByZXBsYWNlYFxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIC8vIFRPRE8oYXRzY290dCk6IERldGVybWluZSBob3cvd2hlbi9pZiB0byBtYWtlIHRoaXMgcHVibGljIEFQSVxuICAvLyBUaGlzIHNob3VsZG7igJl0IGJlIGFuIG9wdGlvbiBhdCBhbGwgYnV0IG1heSBuZWVkIHRvIGJlIGluIG9yZGVyIHRvIGFsbG93IG1pZ3JhdGlvbiB3aXRob3V0IGFcbiAgLy8gYnJlYWtpbmcgY2hhbmdlLiBXZSBuZWVkIHRvIGRldGVybWluZSBpZiBpdCBzaG91bGQgYmUgbWFkZSBpbnRvIHB1YmxpYyBhcGkgKG9yIGlmIHdlIGZvcmdvXG4gIC8vIHRoZSBvcHRpb24gYW5kIHJlbGVhc2UgYXMgYSBicmVha2luZyBjaGFuZ2UgYnVnIGZpeCBpbiBhIG1ham9yIHZlcnNpb24pLlxuICBjYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uOiAncmVwbGFjZSd8J2NvbXB1dGVkJyA9ICdyZXBsYWNlJztcblxuICAvKipcbiAgICogQ3JlYXRlcyB0aGUgcm91dGVyIHNlcnZpY2UuXG4gICAqL1xuICAvLyBUT0RPOiB2c2F2a2luIG1ha2UgaW50ZXJuYWwgYWZ0ZXIgdGhlIGZpbmFsIGlzIG91dC5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT58bnVsbCwgcHJpdmF0ZSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgICAgcHJpdmF0ZSByb290Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIHByaXZhdGUgbG9jYXRpb246IExvY2F0aW9uLCBpbmplY3RvcjogSW5qZWN0b3IsXG4gICAgICBsb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLCBwdWJsaWMgY29uZmlnOiBSb3V0ZXMpIHtcbiAgICBjb25zdCBvbkxvYWRTdGFydCA9IChyOiBSb3V0ZSkgPT4gdGhpcy50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZFN0YXJ0KHIpKTtcbiAgICBjb25zdCBvbkxvYWRFbmQgPSAocjogUm91dGUpID0+IHRoaXMudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRFbmQocikpO1xuXG4gICAgdGhpcy5uZ01vZHVsZSA9IGluamVjdG9yLmdldChOZ01vZHVsZVJlZik7XG4gICAgdGhpcy5jb25zb2xlID0gaW5qZWN0b3IuZ2V0KENvbnNvbGUpO1xuICAgIGNvbnN0IG5nWm9uZSA9IGluamVjdG9yLmdldChOZ1pvbmUpO1xuICAgIHRoaXMuaXNOZ1pvbmVFbmFibGVkID0gbmdab25lIGluc3RhbmNlb2YgTmdab25lICYmIE5nWm9uZS5pc0luQW5ndWxhclpvbmUoKTtcblxuICAgIHRoaXMucmVzZXRDb25maWcoY29uZmlnKTtcbiAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gY3JlYXRlRW1wdHlVcmxUcmVlKCk7XG4gICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy5jdXJyZW50VXJsVHJlZTtcbiAgICB0aGlzLmJyb3dzZXJVcmxUcmVlID0gdGhpcy5jdXJyZW50VXJsVHJlZTtcblxuICAgIHRoaXMuY29uZmlnTG9hZGVyID0gbmV3IFJvdXRlckNvbmZpZ0xvYWRlcihsb2FkZXIsIGNvbXBpbGVyLCBvbkxvYWRTdGFydCwgb25Mb2FkRW5kKTtcbiAgICB0aGlzLnJvdXRlclN0YXRlID0gY3JlYXRlRW1wdHlTdGF0ZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB0aGlzLnJvb3RDb21wb25lbnRUeXBlKTtcblxuICAgIHRoaXMudHJhbnNpdGlvbnMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PE5hdmlnYXRpb25UcmFuc2l0aW9uPih7XG4gICAgICBpZDogMCxcbiAgICAgIHRhcmdldFBhZ2VJZDogMCxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgY3VycmVudFJhd1VybDogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIGV4dHJhY3RlZFVybDogdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QodGhpcy5jdXJyZW50VXJsVHJlZSksXG4gICAgICB1cmxBZnRlclJlZGlyZWN0czogdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QodGhpcy5jdXJyZW50VXJsVHJlZSksXG4gICAgICByYXdVcmw6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBleHRyYXM6IHt9LFxuICAgICAgcmVzb2x2ZTogbnVsbCxcbiAgICAgIHJlamVjdDogbnVsbCxcbiAgICAgIHByb21pc2U6IFByb21pc2UucmVzb2x2ZSh0cnVlKSxcbiAgICAgIHNvdXJjZTogJ2ltcGVyYXRpdmUnLFxuICAgICAgcmVzdG9yZWRTdGF0ZTogbnVsbCxcbiAgICAgIGN1cnJlbnRTbmFwc2hvdDogdGhpcy5yb3V0ZXJTdGF0ZS5zbmFwc2hvdCxcbiAgICAgIHRhcmdldFNuYXBzaG90OiBudWxsLFxuICAgICAgY3VycmVudFJvdXRlclN0YXRlOiB0aGlzLnJvdXRlclN0YXRlLFxuICAgICAgdGFyZ2V0Um91dGVyU3RhdGU6IG51bGwsXG4gICAgICBndWFyZHM6IHtjYW5BY3RpdmF0ZUNoZWNrczogW10sIGNhbkRlYWN0aXZhdGVDaGVja3M6IFtdfSxcbiAgICAgIGd1YXJkc1Jlc3VsdDogbnVsbCxcbiAgICB9KTtcbiAgICB0aGlzLm5hdmlnYXRpb25zID0gdGhpcy5zZXR1cE5hdmlnYXRpb25zKHRoaXMudHJhbnNpdGlvbnMpO1xuXG4gICAgdGhpcy5wcm9jZXNzTmF2aWdhdGlvbnMoKTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0dXBOYXZpZ2F0aW9ucyh0cmFuc2l0aW9uczogT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4pOlxuICAgICAgT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4ge1xuICAgIGNvbnN0IGV2ZW50c1N1YmplY3QgPSAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pO1xuICAgIHJldHVybiB0cmFuc2l0aW9ucy5waXBlKFxuICAgICAgICAgICAgICAgZmlsdGVyKHQgPT4gdC5pZCAhPT0gMCksXG5cbiAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgVVJMXG4gICAgICAgICAgICAgICBtYXAodCA9PlxuICAgICAgICAgICAgICAgICAgICAgICAoey4uLnQsIGV4dHJhY3RlZFVybDogdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QodC5yYXdVcmwpfSBhc1xuICAgICAgICAgICAgICAgICAgICAgICAgTmF2aWdhdGlvblRyYW5zaXRpb24pKSxcblxuICAgICAgICAgICAgICAgLy8gVXNpbmcgc3dpdGNoTWFwIHNvIHdlIGNhbmNlbCBleGVjdXRpbmcgbmF2aWdhdGlvbnMgd2hlbiBhIG5ldyBvbmUgY29tZXMgaW5cbiAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgbGV0IGNvbXBsZXRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICBsZXQgZXJyb3JlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICByZXR1cm4gb2YodCkucGlwZShcbiAgICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBOYXZpZ2F0aW9uIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiB0LmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRpYWxVcmw6IHQuY3VycmVudFJhd1VybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYWN0ZWRVcmw6IHQuZXh0cmFjdGVkVXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHRyaWdnZXI6IHQuc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhczogdC5leHRyYXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNOYXZpZ2F0aW9uOiB0aGlzLmxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbiA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsuLi50aGlzLmxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbiwgcHJldmlvdXNOYXZpZ2F0aW9uOiBudWxsfSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGxcbiAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgc3dpdGNoTWFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmxUcmFuc2l0aW9uID0gIXRoaXMubmF2aWdhdGVkIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LmV4dHJhY3RlZFVybC50b1N0cmluZygpICE9PSB0aGlzLmJyb3dzZXJVcmxUcmVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NDdXJyZW50VXJsID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLm9uU2FtZVVybE5hdmlnYXRpb24gPT09ICdyZWxvYWQnID8gdHJ1ZSA6IHVybFRyYW5zaXRpb24pICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybCh0LnJhd1VybCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb2Nlc3NDdXJyZW50VXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpcmUgTmF2aWdhdGlvblN0YXJ0IGV2ZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gdGhpcy50cmFuc2l0aW9ucy5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuZXcgTmF2aWdhdGlvblN0YXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIHQuc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlc3RvcmVkU3RhdGUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHJhbnNpdGlvbiAhPT0gdGhpcy50cmFuc2l0aW9ucy5nZXRWYWx1ZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBkZWxheSBpcyByZXF1aXJlZCB0byBtYXRjaCBvbGQgYmVoYXZpb3IgdGhhdCBmb3JjZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuYXZpZ2F0aW9uIHRvIGFsd2F5cyBiZSBhc3luY1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFwcGx5UmVkaXJlY3RzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcGx5UmVkaXJlY3RzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZ01vZHVsZS5pbmplY3RvciwgdGhpcy5jb25maWdMb2FkZXIsIHRoaXMudXJsU2VyaWFsaXplcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnKSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGN1cnJlbnROYXZpZ2F0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4udGhpcy5jdXJyZW50TmF2aWdhdGlvbiEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5hbFVybDogdC51cmxBZnRlclJlZGlyZWN0c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlY29nbml6ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvZ25pemUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb3RDb21wb25lbnRUeXBlLCB0aGlzLmNvbmZpZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh1cmwpID0+IHRoaXMuc2VyaWFsaXplVXJsKHVybCksIHRoaXMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVsYXRpdmVMaW5rUmVzb2x1dGlvbiksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIFVSTCBpZiBpbiBgZWFnZXJgIHVwZGF0ZSBtb2RlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0LmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMsIHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5icm93c2VyVXJsVHJlZSA9IHQudXJsQWZ0ZXJSZWRpcmVjdHM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZSBSb3V0ZXNSZWNvZ25pemVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm91dGVzUmVjb2duaXplZCA9IG5ldyBSb3V0ZXNSZWNvZ25pemVkKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ISk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KHJvdXRlc1JlY29nbml6ZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc1ByZXZpb3VzVXJsID0gdXJsVHJhbnNpdGlvbiAmJiB0aGlzLnJhd1VybFRyZWUgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LnNob3VsZFByb2Nlc3NVcmwodGhpcy5yYXdVcmxUcmVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAvKiBXaGVuIHRoZSBjdXJyZW50IFVSTCBzaG91bGRuJ3QgYmUgcHJvY2Vzc2VkLCBidXQgdGhlIHByZXZpb3VzIG9uZSB3YXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICogd2UgaGFuZGxlIHRoaXMgXCJlcnJvciBjb25kaXRpb25cIiBieSBuYXZpZ2F0aW5nIHRvIHRoZSBwcmV2aW91c2x5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICogc3VjY2Vzc2Z1bCBVUkwsIGJ1dCBsZWF2aW5nIHRoZSBVUkwgaW50YWN0LiovXG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb2Nlc3NQcmV2aW91c1VybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qge2lkLCBleHRyYWN0ZWRVcmwsIHNvdXJjZSwgcmVzdG9yZWRTdGF0ZSwgZXh0cmFzfSA9IHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuYXZTdGFydCA9IG5ldyBOYXZpZ2F0aW9uU3RhcnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQsIHRoaXMuc2VyaWFsaXplVXJsKGV4dHJhY3RlZFVybCksIHNvdXJjZSwgcmVzdG9yZWRTdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2U3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0U25hcHNob3QgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZUVtcHR5U3RhdGUoZXh0cmFjdGVkVXJsLCB0aGlzLnJvb3RDb21wb25lbnRUeXBlKS5zbmFwc2hvdDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4udCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0U25hcHNob3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybEFmdGVyUmVkaXJlY3RzOiBleHRyYWN0ZWRVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhczogey4uLmV4dHJhcywgc2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZSwgcmVwbGFjZVVybDogZmFsc2V9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIFdoZW4gbmVpdGhlciB0aGUgY3VycmVudCBvciBwcmV2aW91cyBVUkwgY2FuIGJlIHByb2Nlc3NlZCwgZG8gbm90aGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICogb3RoZXIgdGhhbiB1cGRhdGUgcm91dGVyJ3MgaW50ZXJuYWwgcmVmZXJlbmNlIHRvIHRoZSBjdXJyZW50IFwic2V0dGxlZFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBVUkwuIFRoaXMgd2F5IHRoZSBuZXh0IG5hdmlnYXRpb24gd2lsbCBiZSBjb21pbmcgZnJvbSB0aGUgY3VycmVudCBVUkxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIGluIHRoZSBicm93c2VyLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJhd1VybFRyZWUgPSB0LnJhd1VybDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0LnVybEFmdGVyUmVkaXJlY3RzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIEJlZm9yZSBQcmVhY3RpdmF0aW9uXG4gICAgICAgICAgICAgICAgICAgICBzd2l0Y2hUYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRTbmFwc2hvdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZDogbmF2aWdhdGlvbklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZFVybDogYXBwbGllZFVybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmF3VXJsOiByYXdVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhczoge3NraXBMb2NhdGlvbkNoYW5nZSwgcmVwbGFjZVVybH1cbiAgICAgICAgICAgICAgICAgICAgICAgfSA9IHQ7XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhvb2tzLmJlZm9yZVByZWFjdGl2YXRpb24odGFyZ2V0U25hcHNob3QhLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdGlvbklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFwcGxpZWRVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHJhd1VybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiAhIXNraXBMb2NhdGlvbkNoYW5nZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlVXJsOiAhIXJlcGxhY2VVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIC0tLSBHVUFSRFMgLS0tXG4gICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGd1YXJkc1N0YXJ0ID0gbmV3IEd1YXJkc0NoZWNrU3RhcnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzKSwgdC50YXJnZXRTbmFwc2hvdCEpO1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChndWFyZHNTdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgbWFwKHQgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBndWFyZHM6IGdldEFsbFJvdXRlR3VhcmRzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQudGFyZ2V0U25hcHNob3QhLCB0LmN1cnJlbnRTbmFwc2hvdCwgdGhpcy5yb290Q29udGV4dHMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgfSkpLFxuXG4gICAgICAgICAgICAgICAgICAgICBjaGVja0d1YXJkcyh0aGlzLm5nTW9kdWxlLmluamVjdG9yLCAoZXZ0OiBFdmVudCkgPT4gdGhpcy50cmlnZ2VyRXZlbnQoZXZ0KSksXG4gICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGlmIChpc1VybFRyZWUodC5ndWFyZHNSZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3I6IEVycm9yJnt1cmw/OiBVcmxUcmVlfSA9IG5hdmlnYXRpb25DYW5jZWxpbmdFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYFJlZGlyZWN0aW5nIHRvIFwiJHt0aGlzLnNlcmlhbGl6ZVVybCh0Lmd1YXJkc1Jlc3VsdCl9XCJgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvci51cmwgPSB0Lmd1YXJkc1Jlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGd1YXJkc0VuZCA9IG5ldyBHdWFyZHNDaGVja0VuZChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ISxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICEhdC5ndWFyZHNSZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChndWFyZHNFbmQpO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIGZpbHRlcih0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0Lmd1YXJkc1Jlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZUhpc3RvcnkodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5jZWxOYXZpZ2F0aW9uVHJhbnNpdGlvbih0LCAnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIC0tLSBSRVNPTFZFIC0tLVxuICAgICAgICAgICAgICAgICAgICAgc3dpdGNoVGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAodC5ndWFyZHMuY2FuQWN0aXZhdGVDaGVja3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlU3RhcnQgPSBuZXcgUmVzb2x2ZVN0YXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ISk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQocmVzb2x2ZVN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YVJlc29sdmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmVEYXRhKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LCB0aGlzLm5nTW9kdWxlLmluamVjdG9yKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0OiAoKSA9PiBkYXRhUmVzb2x2ZWQgPSB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGFSZXNvbHZlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc3RvcmVIaXN0b3J5KHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbE5hdmlnYXRpb25UcmFuc2l0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBBdCBsZWFzdCBvbmUgcm91dGUgcmVzb2x2ZXIgZGlkbid0IGVtaXQgYW55IHZhbHVlLmApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlRW5kID0gbmV3IFJlc29sdmVFbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVVcmwodC51cmxBZnRlclJlZGlyZWN0cyksIHQudGFyZ2V0U25hcHNob3QhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChyZXNvbHZlRW5kKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gLS0tIEFGVEVSIFBSRUFDVElWQVRJT04gLS0tXG4gICAgICAgICAgICAgICAgICAgICBzd2l0Y2hUYXAoKHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRTbmFwc2hvdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZDogbmF2aWdhdGlvbklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZFVybDogYXBwbGllZFVybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmF3VXJsOiByYXdVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhczoge3NraXBMb2NhdGlvbkNoYW5nZSwgcmVwbGFjZVVybH1cbiAgICAgICAgICAgICAgICAgICAgICAgfSA9IHQ7XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhvb2tzLmFmdGVyUHJlYWN0aXZhdGlvbih0YXJnZXRTbmFwc2hvdCEsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBuYXZpZ2F0aW9uSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgYXBwbGllZFVybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmF3VXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBza2lwTG9jYXRpb25DaGFuZ2U6ICEhc2tpcExvY2F0aW9uQ2hhbmdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2VVcmw6ICEhcmVwbGFjZVVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgbWFwKCh0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRSb3V0ZXJTdGF0ZSA9IGNyZWF0ZVJvdXRlclN0YXRlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3ksIHQudGFyZ2V0U25hcHNob3QhLCB0LmN1cnJlbnRSb3V0ZXJTdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoey4uLnQsIHRhcmdldFJvdXRlclN0YXRlfSk7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgLyogT25jZSBoZXJlLCB3ZSBhcmUgYWJvdXQgdG8gYWN0aXZhdGUgc3luY3Jvbm91c2x5LiBUaGUgYXNzdW1wdGlvbiBpcyB0aGlzXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWxsIHN1Y2NlZWQsIGFuZCB1c2VyIGNvZGUgbWF5IHJlYWQgZnJvbSB0aGUgUm91dGVyIHNlcnZpY2UuIFRoZXJlZm9yZVxuICAgICAgICAgICAgICAgICAgICAgICAgYmVmb3JlIGFjdGl2YXRpb24sIHdlIG5lZWQgdG8gdXBkYXRlIHJvdXRlciBwcm9wZXJ0aWVzIHN0b3JpbmcgdGhlIGN1cnJlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIFVSTCBhbmQgdGhlIFJvdXRlclN0YXRlLCBhcyB3ZWxsIGFzIHVwZGF0ZWQgdGhlIGJyb3dzZXIgVVJMLiBBbGwgdGhpcyBzaG91bGRcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhcHBlbiAqYmVmb3JlKiBhY3RpdmF0aW5nLiAqL1xuICAgICAgICAgICAgICAgICAgICAgdGFwKCh0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gdC51cmxBZnRlclJlZGlyZWN0cztcbiAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yYXdVcmxUcmVlID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB0LnJhd1VybCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMge3JvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZX0pLnJvdXRlclN0YXRlID0gdC50YXJnZXRSb3V0ZXJTdGF0ZSE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdkZWZlcnJlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXQuZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHRoaXMucmF3VXJsVHJlZSwgdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0LnVybEFmdGVyUmVkaXJlY3RzO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgYWN0aXZhdGVSb3V0ZXMoXG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb290Q29udGV4dHMsIHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LFxuICAgICAgICAgICAgICAgICAgICAgICAgIChldnQ6IEV2ZW50KSA9PiB0aGlzLnRyaWdnZXJFdmVudChldnQpKSxcblxuICAgICAgICAgICAgICAgICAgICAgdGFwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgbmV4dCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgIGZpbmFsaXplKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgLyogV2hlbiB0aGUgbmF2aWdhdGlvbiBzdHJlYW0gZmluaXNoZXMgZWl0aGVyIHRocm91Z2ggZXJyb3Igb3Igc3VjY2Vzcywgd2VcbiAgICAgICAgICAgICAgICAgICAgICAgICogc2V0IHRoZSBgY29tcGxldGVkYCBvciBgZXJyb3JlZGAgZmxhZy4gSG93ZXZlciwgdGhlcmUgYXJlIHNvbWUgc2l0dWF0aW9uc1xuICAgICAgICAgICAgICAgICAgICAgICAgKiB3aGVyZSB3ZSBjb3VsZCBnZXQgaGVyZSB3aXRob3V0IGVpdGhlciBvZiB0aG9zZSBiZWluZyBzZXQuIEZvciBpbnN0YW5jZSwgYVxuICAgICAgICAgICAgICAgICAgICAgICAgKiByZWRpcmVjdCBkdXJpbmcgTmF2aWdhdGlvblN0YXJ0LiBUaGVyZWZvcmUsIHRoaXMgaXMgYSBjYXRjaC1hbGwgdG8gbWFrZVxuICAgICAgICAgICAgICAgICAgICAgICAgKiBzdXJlIHRoZSBOYXZpZ2F0aW9uQ2FuY2VsXG4gICAgICAgICAgICAgICAgICAgICAgICAqIGV2ZW50IGlzIGZpcmVkIHdoZW4gYSBuYXZpZ2F0aW9uIGdldHMgY2FuY2VsbGVkIGJ1dCBub3QgY2F1Z2h0IGJ5IG90aGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAqIG1lYW5zLiAqL1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbXBsZXRlZCAmJiAhZXJyb3JlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhbmNlbGF0aW9uUmVhc29uID0gYE5hdmlnYXRpb24gSUQgJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5pZH0gaXMgbm90IGVxdWFsIHRvIHRoZSBjdXJyZW50IG5hdmlnYXRpb24gaWQgJHt0aGlzLm5hdmlnYXRpb25JZH1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdyZXBsYWNlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTXVzdCByZXNldCB0byBjdXJyZW50IFVSTCB0cmVlIGhlcmUgdG8gZW5zdXJlIGhpc3Rvcnkuc3RhdGUgaXMgc2V0LiBPblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYSBmcmVzaCBwYWdlIGxvYWQsIGlmIGEgbmV3IG5hdmlnYXRpb24gY29tZXMgaW4gYmVmb3JlIGEgc3VjY2Vzc2Z1bFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmF2aWdhdGlvbiBjb21wbGV0ZXMsIHRoZXJlIHdpbGwgYmUgbm90aGluZyBpblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGlzdG9yeS5zdGF0ZS5uYXZpZ2F0aW9uSWQuIFRoaXMgY2FuIGNhdXNlIHN5bmMgcHJvYmxlbXMgd2l0aFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQW5ndWxhckpTIHN5bmMgY29kZSB3aGljaCBsb29rcyBmb3IgYSB2YWx1ZSBoZXJlIGluIG9yZGVyIHRvIGRldGVybWluZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2hldGhlciBvciBub3QgdG8gaGFuZGxlIGEgZ2l2ZW4gcG9wc3RhdGUgZXZlbnQgb3IgdG8gbGVhdmUgaXQgdG8gdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBbmd1bGFyIHJvdXRlci5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZUhpc3RvcnkodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbE5hdmlnYXRpb25UcmFuc2l0aW9uKHQsIGNhbmNlbGF0aW9uUmVhc29uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2UgY2Fubm90IHRyaWdnZXIgYSBgbG9jYXRpb24uaGlzdG9yeUdvYCBpZiB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNhbmNlbGxhdGlvbiB3YXMgZHVlIHRvIGEgbmV3IG5hdmlnYXRpb24gYmVmb3JlIHRoZSBwcmV2aW91cyBjb3VsZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29tcGxldGUuIFRoaXMgaXMgYmVjYXVzZSBgbG9jYXRpb24uaGlzdG9yeUdvYCB0cmlnZ2VycyBhIGBwb3BzdGF0ZWBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdoaWNoIHdvdWxkIGFsc28gdHJpZ2dlciBhbm90aGVyIG5hdmlnYXRpb24uIEluc3RlYWQsIHRyZWF0IHRoaXMgYXMgYVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVkaXJlY3QgYW5kIGRvIG5vdCByZXNldCB0aGUgc3RhdGUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbE5hdmlnYXRpb25UcmFuc2l0aW9uKHQsIGNhbmNlbGF0aW9uUmVhc29uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRPRE8oYXRzY290dCk6IFRoZSBzYW1lIHByb2JsZW0gaGFwcGVucyBoZXJlIHdpdGggYSBmcmVzaCBwYWdlIGxvYWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFuZCBhIG5ldyBuYXZpZ2F0aW9uIGJlZm9yZSB0aGF0IGNvbXBsZXRlcyB3aGVyZSB3ZSB3b24ndCBzZXQgYSBwYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpZC5cbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgLy8gY3VycmVudE5hdmlnYXRpb24gc2hvdWxkIGFsd2F5cyBiZSByZXNldCB0byBudWxsIGhlcmUuIElmIG5hdmlnYXRpb24gd2FzXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHN1Y2Nlc3NmdWwsIGxhc3RTdWNjZXNzZnVsVHJhbnNpdGlvbiB3aWxsIGhhdmUgYWxyZWFkeSBiZWVuIHNldC4gVGhlcmVmb3JlXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIGNhbiBzYWZlbHkgc2V0IGN1cnJlbnROYXZpZ2F0aW9uIHRvIG51bGwgaGVyZS5cbiAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmF2aWdhdGlvbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgIGNhdGNoRXJyb3IoKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETyhhdHNjb3R0KTogVGhlIE5hdmlnYXRpb25UcmFuc2l0aW9uIGB0YCB1c2VkIGhlcmUgZG9lcyBub3QgYWNjdXJhdGVseVxuICAgICAgICAgICAgICAgICAgICAgICAvLyByZWZsZWN0IHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSB3aG9sZSB0cmFuc2l0aW9uIGJlY2F1c2Ugc29tZSBvcGVyYXRpb25zXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHJldHVybiBhIG5ldyBvYmplY3QgcmF0aGVyIHRoYW4gbW9kaWZ5aW5nIHRoZSBvbmUgaW4gdGhlIG91dGVybW9zdFxuICAgICAgICAgICAgICAgICAgICAgICAvLyBgc3dpdGNoTWFwYC5cbiAgICAgICAgICAgICAgICAgICAgICAgLy8gIFRoZSBmaXggY2FuIGxpa2VseSBiZSB0bzpcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gIDEuIFJlbmFtZSB0aGUgb3V0ZXIgYHRgIHZhcmlhYmxlIHNvIGl0J3Mgbm90IHNoYWRvd2VkIGFsbCB0aGUgdGltZSBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gIGNvbmZ1c2luZ1xuICAgICAgICAgICAgICAgICAgICAgICAvLyAgMi4gS2VlcCByZWFzc2lnbmluZyB0byB0aGUgb3V0ZXIgdmFyaWFibGUgYWZ0ZXIgZWFjaCBzdGFnZSB0byBlbnN1cmUgaXRcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gIGdldHMgdXBkYXRlZC4gT3IgY2hhbmdlIHRoZSBpbXBsZW1lbnRhdGlvbnMgdG8gbm90IHJldHVybiBhIGNvcHkuXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIE5vdCBjaGFuZ2VkIHlldCBiZWNhdXNlIGl0IGFmZmVjdHMgZXhpc3RpbmcgY29kZSBhbmQgd291bGQgbmVlZCB0byBiZVxuICAgICAgICAgICAgICAgICAgICAgICAvLyB0ZXN0ZWQgbW9yZSB0aG9yb3VnaGx5LlxuICAgICAgICAgICAgICAgICAgICAgICBlcnJvcmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgLyogVGhpcyBlcnJvciB0eXBlIGlzIGlzc3VlZCBkdXJpbmcgUmVkaXJlY3QsIGFuZCBpcyBoYW5kbGVkIGFzIGFcbiAgICAgICAgICAgICAgICAgICAgICAgICogY2FuY2VsbGF0aW9uIHJhdGhlciB0aGFuIGFuIGVycm9yLiAqL1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWRpcmVjdGluZyA9IGlzVXJsVHJlZShlLnVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWRpcmVjdGluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHByb3BlcnR5IG9ubHkgaWYgd2UncmUgbm90IHJlZGlyZWN0aW5nLiBJZiB3ZSBsYW5kZWQgb24gYSBwYWdlIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVkaXJlY3QgdG8gYC9gIHJvdXRlLCB0aGUgbmV3IG5hdmlnYXRpb24gaXMgZ29pbmcgdG8gc2VlIHRoZSBgL2BcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlzbid0IGEgY2hhbmdlIGZyb20gdGhlIGRlZmF1bHQgY3VycmVudFVybFRyZWUgYW5kIHdvbid0IG5hdmlnYXRlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBvbmx5IGFwcGxpY2FibGUgd2l0aCBpbml0aWFsIG5hdmlnYXRpb24sIHNvIHNldHRpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGBuYXZpZ2F0ZWRgIG9ubHkgd2hlbiBub3QgcmVkaXJlY3RpbmcgcmVzb2x2ZXMgdGhpcyBzY2VuYXJpby5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZUhpc3RvcnkodCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdkNhbmNlbCA9IG5ldyBOYXZpZ2F0aW9uQ2FuY2VsKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIGUubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdkNhbmNlbCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIHJlZGlyZWN0aW5nLCB3ZSBuZWVkIHRvIGRlbGF5IHJlc29sdmluZyB0aGUgbmF2aWdhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHByb21pc2UgYW5kIHB1c2ggaXQgdG8gdGhlIHJlZGlyZWN0IG5hdmlnYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJlZGlyZWN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlc29sdmUoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzZXRUaW1lb3V0IGlzIHJlcXVpcmVkIHNvIHRoaXMgbmF2aWdhdGlvbiBmaW5pc2hlcyB3aXRoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGUgcmV0dXJuIEVNUFRZIGJlbG93LiBJZiBpdCBpc24ndCBhbGxvd2VkIHRvIGZpbmlzaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHJvY2Vzc2luZywgdGhlcmUgY2FuIGJlIG11bHRpcGxlIG5hdmlnYXRpb25zIHRvIHRoZSBzYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVUkwuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVyZ2VkVHJlZSA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UoZS51cmwsIHRoaXMucmF3VXJsVHJlZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4dHJhcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBza2lwTG9jYXRpb25DaGFuZ2U6IHQuZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlVXJsOiB0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZWFnZXInXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXJnZWRUcmVlLCAnaW1wZXJhdGl2ZScsIG51bGwsIGV4dHJhcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtyZXNvbHZlOiB0LnJlc29sdmUsIHJlamVjdDogdC5yZWplY3QsIHByb21pc2U6IHQucHJvbWlzZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgLyogQWxsIG90aGVyIGVycm9ycyBzaG91bGQgcmVzZXQgdG8gdGhlIHJvdXRlcidzIGludGVybmFsIFVSTCByZWZlcmVuY2UgdG9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgKiB0aGUgcHJlLWVycm9yIHN0YXRlLiAqL1xuICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZUhpc3RvcnkodCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmF2RXJyb3IgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgTmF2aWdhdGlvbkVycm9yKHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdkVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKHRoaXMuZXJyb3JIYW5kbGVyKGUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5yZWplY3QoZWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgIC8vIFRPRE8oamFzb25hZGVuKTogcmVtb3ZlIGNhc3Qgb25jZSBnMyBpcyBvbiB1cGRhdGVkIFR5cGVTY3JpcHRcbiAgICAgICAgICAgICAgIH0pKSBhcyBhbnkgYXMgT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj47XG4gIH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIFRPRE86IHRoaXMgc2hvdWxkIGJlIHJlbW92ZWQgb25jZSB0aGUgY29uc3RydWN0b3Igb2YgdGhlIHJvdXRlciBtYWRlIGludGVybmFsXG4gICAqL1xuICByZXNldFJvb3RDb21wb25lbnRUeXBlKHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT4pOiB2b2lkIHtcbiAgICB0aGlzLnJvb3RDb21wb25lbnRUeXBlID0gcm9vdENvbXBvbmVudFR5cGU7XG4gICAgLy8gVE9ETzogdnNhdmtpbiByb3V0ZXIgNC4wIHNob3VsZCBtYWtlIHRoZSByb290IGNvbXBvbmVudCBzZXQgdG8gbnVsbFxuICAgIC8vIHRoaXMgd2lsbCBzaW1wbGlmeSB0aGUgbGlmZWN5Y2xlIG9mIHRoZSByb3V0ZXIuXG4gICAgdGhpcy5yb3V0ZXJTdGF0ZS5yb290LmNvbXBvbmVudCA9IHRoaXMucm9vdENvbXBvbmVudFR5cGU7XG4gIH1cblxuICBwcml2YXRlIGdldFRyYW5zaXRpb24oKTogTmF2aWdhdGlvblRyYW5zaXRpb24ge1xuICAgIGNvbnN0IHRyYW5zaXRpb24gPSB0aGlzLnRyYW5zaXRpb25zLnZhbHVlO1xuICAgIC8vIFRoaXMgdmFsdWUgbmVlZHMgdG8gYmUgc2V0LiBPdGhlciB2YWx1ZXMgc3VjaCBhcyBleHRyYWN0ZWRVcmwgYXJlIHNldCBvbiBpbml0aWFsIG5hdmlnYXRpb25cbiAgICAvLyBidXQgdGhlIHVybEFmdGVyUmVkaXJlY3RzIG1heSBub3QgZ2V0IHNldCBpZiB3ZSBhcmVuJ3QgcHJvY2Vzc2luZyB0aGUgbmV3IFVSTCAqYW5kKiBub3RcbiAgICAvLyBwcm9jZXNzaW5nIHRoZSBwcmV2aW91cyBVUkwuXG4gICAgdHJhbnNpdGlvbi51cmxBZnRlclJlZGlyZWN0cyA9IHRoaXMuYnJvd3NlclVybFRyZWU7XG4gICAgcmV0dXJuIHRyYW5zaXRpb247XG4gIH1cblxuICBwcml2YXRlIHNldFRyYW5zaXRpb24odDogUGFydGlhbDxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4pOiB2b2lkIHtcbiAgICB0aGlzLnRyYW5zaXRpb25zLm5leHQoey4uLnRoaXMuZ2V0VHJhbnNpdGlvbigpLCAuLi50fSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyIGFuZCBwZXJmb3JtcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaW5pdGlhbE5hdmlnYXRpb24oKTogdm9pZCB7XG4gICAgdGhpcy5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICBpZiAodGhpcy5uYXZpZ2F0aW9uSWQgPT09IDApIHtcbiAgICAgIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmxvY2F0aW9uLnBhdGgodHJ1ZSksIHtyZXBsYWNlVXJsOiB0cnVlfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdXAgdGhlIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lci4gVGhpcyBsaXN0ZW5lciBkZXRlY3RzIG5hdmlnYXRpb25zIHRyaWdnZXJlZCBmcm9tIG91dHNpZGVcbiAgICogdGhlIFJvdXRlciAodGhlIGJyb3dzZXIgYmFjay9mb3J3YXJkIGJ1dHRvbnMsIGZvciBleGFtcGxlKSBhbmQgc2NoZWR1bGVzIGEgY29ycmVzcG9uZGluZyBSb3V0ZXJcbiAgICogbmF2aWdhdGlvbiBzbyB0aGF0IHRoZSBjb3JyZWN0IGV2ZW50cywgZ3VhcmRzLCBldGMuIGFyZSB0cmlnZ2VyZWQuXG4gICAqL1xuICBzZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTogdm9pZCB7XG4gICAgLy8gRG9uJ3QgbmVlZCB0byB1c2UgWm9uZS53cmFwIGFueSBtb3JlLCBiZWNhdXNlIHpvbmUuanNcbiAgICAvLyBhbHJlYWR5IHBhdGNoIG9uUG9wU3RhdGUsIHNvIGxvY2F0aW9uIGNoYW5nZSBjYWxsYmFjayB3aWxsXG4gICAgLy8gcnVuIGludG8gbmdab25lXG4gICAgaWYgKCF0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uID0gdGhpcy5sb2NhdGlvbi5zdWJzY3JpYmUoZXZlbnQgPT4ge1xuICAgICAgICBjb25zdCBjdXJyZW50Q2hhbmdlID0gdGhpcy5leHRyYWN0TG9jYXRpb25DaGFuZ2VJbmZvRnJvbUV2ZW50KGV2ZW50KTtcbiAgICAgICAgLy8gVGhlIGBzZXRUaW1lb3V0YCB3YXMgYWRkZWQgaW4gIzEyMTYwIGFuZCBpcyBsaWtlbHkgdG8gc3VwcG9ydCBBbmd1bGFyL0FuZ3VsYXJKU1xuICAgICAgICAvLyBoeWJyaWQgYXBwcy5cbiAgICAgICAgaWYgKHRoaXMuc2hvdWxkU2NoZWR1bGVOYXZpZ2F0aW9uKHRoaXMubGFzdExvY2F0aW9uQ2hhbmdlSW5mbywgY3VycmVudENoYW5nZSkpIHtcbiAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHtzb3VyY2UsIHN0YXRlLCB1cmxUcmVlfSA9IGN1cnJlbnRDaGFuZ2U7XG4gICAgICAgICAgICBjb25zdCBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7cmVwbGFjZVVybDogdHJ1ZX07XG4gICAgICAgICAgICBpZiAoc3RhdGUpIHtcbiAgICAgICAgICAgICAgY29uc3Qgc3RhdGVDb3B5ID0gey4uLnN0YXRlfSBhcyBQYXJ0aWFsPFJlc3RvcmVkU3RhdGU+O1xuICAgICAgICAgICAgICBkZWxldGUgc3RhdGVDb3B5Lm5hdmlnYXRpb25JZDtcbiAgICAgICAgICAgICAgZGVsZXRlIHN0YXRlQ29weS7JtXJvdXRlclBhZ2VJZDtcbiAgICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKHN0YXRlQ29weSkubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgZXh0cmFzLnN0YXRlID0gc3RhdGVDb3B5O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbih1cmxUcmVlLCBzb3VyY2UsIHN0YXRlLCBleHRyYXMpO1xuICAgICAgICAgIH0sIDApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubGFzdExvY2F0aW9uQ2hhbmdlSW5mbyA9IGN1cnJlbnRDaGFuZ2U7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKiogRXh0cmFjdHMgcm91dGVyLXJlbGF0ZWQgaW5mb3JtYXRpb24gZnJvbSBhIGBQb3BTdGF0ZUV2ZW50YC4gKi9cbiAgcHJpdmF0ZSBleHRyYWN0TG9jYXRpb25DaGFuZ2VJbmZvRnJvbUV2ZW50KGNoYW5nZTogUG9wU3RhdGVFdmVudCk6IExvY2F0aW9uQ2hhbmdlSW5mbyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNvdXJjZTogY2hhbmdlWyd0eXBlJ10gPT09ICdwb3BzdGF0ZScgPyAncG9wc3RhdGUnIDogJ2hhc2hjaGFuZ2UnLFxuICAgICAgdXJsVHJlZTogdGhpcy5wYXJzZVVybChjaGFuZ2VbJ3VybCddISksXG4gICAgICAvLyBOYXZpZ2F0aW9ucyBjb21pbmcgZnJvbSBBbmd1bGFyIHJvdXRlciBoYXZlIGEgbmF2aWdhdGlvbklkIHN0YXRlXG4gICAgICAvLyBwcm9wZXJ0eS4gV2hlbiB0aGlzIGV4aXN0cywgcmVzdG9yZSB0aGUgc3RhdGUuXG4gICAgICBzdGF0ZTogY2hhbmdlLnN0YXRlPy5uYXZpZ2F0aW9uSWQgPyBjaGFuZ2Uuc3RhdGUgOiBudWxsLFxuICAgICAgdHJhbnNpdGlvbklkOiB0aGlzLmdldFRyYW5zaXRpb24oKS5pZFxuICAgIH0gYXMgY29uc3Q7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIHR3byBldmVudHMgdHJpZ2dlcmVkIGJ5IHRoZSBMb2NhdGlvbiBzdWJzY3JpcHRpb24gYXJlIGR1ZSB0byB0aGUgc2FtZVxuICAgKiBuYXZpZ2F0aW9uLiBUaGUgbG9jYXRpb24gc3Vic2NyaXB0aW9uIGNhbiBmaXJlIHR3byBldmVudHMgKHBvcHN0YXRlIGFuZCBoYXNoY2hhbmdlKSBmb3IgYVxuICAgKiBzaW5nbGUgbmF2aWdhdGlvbi4gVGhlIHNlY29uZCBvbmUgc2hvdWxkIGJlIGlnbm9yZWQsIHRoYXQgaXMsIHdlIHNob3VsZCBub3Qgc2NoZWR1bGUgYW5vdGhlclxuICAgKiBuYXZpZ2F0aW9uIGluIHRoZSBSb3V0ZXIuXG4gICAqL1xuICBwcml2YXRlIHNob3VsZFNjaGVkdWxlTmF2aWdhdGlvbihwcmV2aW91czogTG9jYXRpb25DaGFuZ2VJbmZvfG51bGwsIGN1cnJlbnQ6IExvY2F0aW9uQ2hhbmdlSW5mbyk6XG4gICAgICBib29sZWFuIHtcbiAgICBpZiAoIXByZXZpb3VzKSByZXR1cm4gdHJ1ZTtcblxuICAgIGNvbnN0IHNhbWVEZXN0aW5hdGlvbiA9IGN1cnJlbnQudXJsVHJlZS50b1N0cmluZygpID09PSBwcmV2aW91cy51cmxUcmVlLnRvU3RyaW5nKCk7XG4gICAgY29uc3QgZXZlbnRzT2NjdXJyZWRBdFNhbWVUaW1lID0gY3VycmVudC50cmFuc2l0aW9uSWQgPT09IHByZXZpb3VzLnRyYW5zaXRpb25JZDtcbiAgICBpZiAoIWV2ZW50c09jY3VycmVkQXRTYW1lVGltZSB8fCAhc2FtZURlc3RpbmF0aW9uKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoKGN1cnJlbnQuc291cmNlID09PSAnaGFzaGNoYW5nZScgJiYgcHJldmlvdXMuc291cmNlID09PSAncG9wc3RhdGUnKSB8fFxuICAgICAgICAoY3VycmVudC5zb3VyY2UgPT09ICdwb3BzdGF0ZScgJiYgcHJldmlvdXMuc291cmNlID09PSAnaGFzaGNoYW5nZScpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKiogVGhlIGN1cnJlbnQgVVJMLiAqL1xuICBnZXQgdXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuc2VyaWFsaXplVXJsKHRoaXMuY3VycmVudFVybFRyZWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGN1cnJlbnQgYE5hdmlnYXRpb25gIG9iamVjdCB3aGVuIHRoZSByb3V0ZXIgaXMgbmF2aWdhdGluZyxcbiAgICogYW5kIGBudWxsYCB3aGVuIGlkbGUuXG4gICAqL1xuICBnZXRDdXJyZW50TmF2aWdhdGlvbigpOiBOYXZpZ2F0aW9ufG51bGwge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICB0cmlnZ2VyRXZlbnQoZXZlbnQ6IEV2ZW50KTogdm9pZCB7XG4gICAgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KS5uZXh0KGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNldHMgdGhlIHJvdXRlIGNvbmZpZ3VyYXRpb24gdXNlZCBmb3IgbmF2aWdhdGlvbiBhbmQgZ2VuZXJhdGluZyBsaW5rcy5cbiAgICpcbiAgICogQHBhcmFtIGNvbmZpZyBUaGUgcm91dGUgYXJyYXkgZm9yIHRoZSBuZXcgY29uZmlndXJhdGlvbi5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5yZXNldENvbmZpZyhbXG4gICAqICB7IHBhdGg6ICd0ZWFtLzppZCcsIGNvbXBvbmVudDogVGVhbUNtcCwgY2hpbGRyZW46IFtcbiAgICogICAgeyBwYXRoOiAnc2ltcGxlJywgY29tcG9uZW50OiBTaW1wbGVDbXAgfSxcbiAgICogICAgeyBwYXRoOiAndXNlci86bmFtZScsIGNvbXBvbmVudDogVXNlckNtcCB9XG4gICAqICBdfVxuICAgKiBdKTtcbiAgICogYGBgXG4gICAqL1xuICByZXNldENvbmZpZyhjb25maWc6IFJvdXRlcyk6IHZvaWQge1xuICAgIHZhbGlkYXRlQ29uZmlnKGNvbmZpZyk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWcubWFwKHN0YW5kYXJkaXplQ29uZmlnKTtcbiAgICB0aGlzLm5hdmlnYXRlZCA9IGZhbHNlO1xuICAgIHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCA9IC0xO1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLmRpc3Bvc2UoKTtcbiAgfVxuXG4gIC8qKiBEaXNwb3NlcyBvZiB0aGUgcm91dGVyLiAqL1xuICBkaXNwb3NlKCk6IHZvaWQge1xuICAgIHRoaXMudHJhbnNpdGlvbnMuY29tcGxldGUoKTtcbiAgICBpZiAodGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbiA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdGhpcy5kaXNwb3NlZCA9IHRydWU7XG4gIH1cblxuICAvKipcbiAgICogQXBwZW5kcyBVUkwgc2VnbWVudHMgdG8gdGhlIGN1cnJlbnQgVVJMIHRyZWUgdG8gY3JlYXRlIGEgbmV3IFVSTCB0cmVlLlxuICAgKlxuICAgKiBAcGFyYW0gY29tbWFuZHMgQW4gYXJyYXkgb2YgVVJMIGZyYWdtZW50cyB3aXRoIHdoaWNoIHRvIGNvbnN0cnVjdCB0aGUgbmV3IFVSTCB0cmVlLlxuICAgKiBJZiB0aGUgcGF0aCBpcyBzdGF0aWMsIGNhbiBiZSB0aGUgbGl0ZXJhbCBVUkwgc3RyaW5nLiBGb3IgYSBkeW5hbWljIHBhdGgsIHBhc3MgYW4gYXJyYXkgb2YgcGF0aFxuICAgKiBzZWdtZW50cywgZm9sbG93ZWQgYnkgdGhlIHBhcmFtZXRlcnMgZm9yIGVhY2ggc2VnbWVudC5cbiAgICogVGhlIGZyYWdtZW50cyBhcmUgYXBwbGllZCB0byB0aGUgY3VycmVudCBVUkwgdHJlZSBvciB0aGUgb25lIHByb3ZpZGVkICBpbiB0aGUgYHJlbGF0aXZlVG9gXG4gICAqIHByb3BlcnR5IG9mIHRoZSBvcHRpb25zIG9iamVjdCwgaWYgc3VwcGxpZWQuXG4gICAqIEBwYXJhbSBuYXZpZ2F0aW9uRXh0cmFzIE9wdGlvbnMgdGhhdCBjb250cm9sIHRoZSBuYXZpZ2F0aW9uIHN0cmF0ZWd5LlxuICAgKiBAcmV0dXJucyBUaGUgbmV3IFVSTCB0cmVlLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBgYGBcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCAndXNlcicsIDExXSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMztleHBhbmQ9dHJ1ZS91c2VyLzExXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge2V4cGFuZDogdHJ1ZX0sICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8geW91IGNhbiBjb2xsYXBzZSBzdGF0aWMgc2VnbWVudHMgbGlrZSB0aGlzICh0aGlzIHdvcmtzIG9ubHkgd2l0aCB0aGUgZmlyc3QgcGFzc2VkLWluIHZhbHVlKTpcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbS8zMy91c2VyJywgdXNlcklkXSk7XG4gICAqXG4gICAqIC8vIElmIHRoZSBmaXJzdCBzZWdtZW50IGNhbiBjb250YWluIHNsYXNoZXMsIGFuZCB5b3UgZG8gbm90IHdhbnQgdGhlIHJvdXRlciB0byBzcGxpdCBpdCxcbiAgICogLy8geW91IGNhbiBkbyB0aGUgZm9sbG93aW5nOlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbe3NlZ21lbnRQYXRoOiAnL29uZS90d28nfV0pO1xuICAgKlxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvKHVzZXIvMTEvL3JpZ2h0OmNoYXQpXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiAnY2hhdCd9fV0pO1xuICAgKlxuICAgKiAvLyByZW1vdmUgdGhlIHJpZ2h0IHNlY29uZGFyeSBub2RlXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiBudWxsfX1dKTtcbiAgICpcbiAgICogLy8gYXNzdW1pbmcgdGhlIGN1cnJlbnQgdXJsIGlzIGAvdGVhbS8zMy91c2VyLzExYCBhbmQgdGhlIHJvdXRlIHBvaW50cyB0byBgdXNlci8xMWBcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8xMS9kZXRhaWxzXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnZGV0YWlscyddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8yMlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy4uLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS80NC91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vLi4vdGVhbS80NC91c2VyLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiBOb3RlIHRoYXQgYSB2YWx1ZSBvZiBgbnVsbGAgb3IgYHVuZGVmaW5lZGAgZm9yIGByZWxhdGl2ZVRvYCBpbmRpY2F0ZXMgdGhhdCB0aGVcbiAgICogdHJlZSBzaG91bGQgYmUgY3JlYXRlZCByZWxhdGl2ZSB0byB0aGUgcm9vdC5cbiAgICogYGBgXG4gICAqL1xuICBjcmVhdGVVcmxUcmVlKGNvbW1hbmRzOiBhbnlbXSwgbmF2aWdhdGlvbkV4dHJhczogVXJsQ3JlYXRpb25PcHRpb25zID0ge30pOiBVcmxUcmVlIHtcbiAgICBjb25zdCB7cmVsYXRpdmVUbywgcXVlcnlQYXJhbXMsIGZyYWdtZW50LCBxdWVyeVBhcmFtc0hhbmRsaW5nLCBwcmVzZXJ2ZUZyYWdtZW50fSA9XG4gICAgICAgIG5hdmlnYXRpb25FeHRyYXM7XG4gICAgY29uc3QgYSA9IHJlbGF0aXZlVG8gfHwgdGhpcy5yb3V0ZXJTdGF0ZS5yb290O1xuICAgIGNvbnN0IGYgPSBwcmVzZXJ2ZUZyYWdtZW50ID8gdGhpcy5jdXJyZW50VXJsVHJlZS5mcmFnbWVudCA6IGZyYWdtZW50O1xuICAgIGxldCBxOiBQYXJhbXN8bnVsbCA9IG51bGw7XG4gICAgc3dpdGNoIChxdWVyeVBhcmFtc0hhbmRsaW5nKSB7XG4gICAgICBjYXNlICdtZXJnZSc6XG4gICAgICAgIHEgPSB7Li4udGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcywgLi4ucXVlcnlQYXJhbXN9O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3ByZXNlcnZlJzpcbiAgICAgICAgcSA9IHRoaXMuY3VycmVudFVybFRyZWUucXVlcnlQYXJhbXM7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcSA9IHF1ZXJ5UGFyYW1zIHx8IG51bGw7XG4gICAgfVxuICAgIGlmIChxICE9PSBudWxsKSB7XG4gICAgICBxID0gdGhpcy5yZW1vdmVFbXB0eVByb3BzKHEpO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlVXJsVHJlZShhLCB0aGlzLmN1cnJlbnRVcmxUcmVlLCBjb21tYW5kcywgcSwgZiA/PyBudWxsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZXMgdG8gYSB2aWV3IHVzaW5nIGFuIGFic29sdXRlIHJvdXRlIHBhdGguXG4gICAqXG4gICAqIEBwYXJhbSB1cmwgQW4gYWJzb2x1dGUgcGF0aCBmb3IgYSBkZWZpbmVkIHJvdXRlLiBUaGUgZnVuY3Rpb24gZG9lcyBub3QgYXBwbHkgYW55IGRlbHRhIHRvIHRoZVxuICAgKiAgICAgY3VycmVudCBVUkwuXG4gICAqIEBwYXJhbSBleHRyYXMgQW4gb2JqZWN0IGNvbnRhaW5pbmcgcHJvcGVydGllcyB0aGF0IG1vZGlmeSB0aGUgbmF2aWdhdGlvbiBzdHJhdGVneS5cbiAgICpcbiAgICogQHJldHVybnMgQSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gJ3RydWUnIHdoZW4gbmF2aWdhdGlvbiBzdWNjZWVkcyxcbiAgICogdG8gJ2ZhbHNlJyB3aGVuIG5hdmlnYXRpb24gZmFpbHMsIG9yIGlzIHJlamVjdGVkIG9uIGVycm9yLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBUaGUgZm9sbG93aW5nIGNhbGxzIHJlcXVlc3QgbmF2aWdhdGlvbiB0byBhbiBhYnNvbHV0ZSBwYXRoLlxuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLm5hdmlnYXRlQnlVcmwoXCIvdGVhbS8zMy91c2VyLzExXCIpO1xuICAgKlxuICAgKiAvLyBOYXZpZ2F0ZSB3aXRob3V0IHVwZGF0aW5nIHRoZSBVUkxcbiAgICogcm91dGVyLm5hdmlnYXRlQnlVcmwoXCIvdGVhbS8zMy91c2VyLzExXCIsIHsgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKVxuICAgKlxuICAgKi9cbiAgbmF2aWdhdGVCeVVybCh1cmw6IHN0cmluZ3xVcmxUcmVlLCBleHRyYXM6IE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMgPSB7XG4gICAgc2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZVxuICB9KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8XG4gICAgICAgIG5nRGV2TW9kZSAmJiB0aGlzLmlzTmdab25lRW5hYmxlZCAmJiAhTmdab25lLmlzSW5Bbmd1bGFyWm9uZSgpKSB7XG4gICAgICB0aGlzLmNvbnNvbGUud2FybihcbiAgICAgICAgICBgTmF2aWdhdGlvbiB0cmlnZ2VyZWQgb3V0c2lkZSBBbmd1bGFyIHpvbmUsIGRpZCB5b3UgZm9yZ2V0IHRvIGNhbGwgJ25nWm9uZS5ydW4oKSc/YCk7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IGlzVXJsVHJlZSh1cmwpID8gdXJsIDogdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIGNvbnN0IG1lcmdlZFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodXJsVHJlZSwgdGhpcy5yYXdVcmxUcmVlKTtcblxuICAgIHJldHVybiB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbihtZXJnZWRUcmVlLCAnaW1wZXJhdGl2ZScsIG51bGwsIGV4dHJhcyk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGUgYmFzZWQgb24gdGhlIHByb3ZpZGVkIGFycmF5IG9mIGNvbW1hbmRzIGFuZCBhIHN0YXJ0aW5nIHBvaW50LlxuICAgKiBJZiBubyBzdGFydGluZyByb3V0ZSBpcyBwcm92aWRlZCwgdGhlIG5hdmlnYXRpb24gaXMgYWJzb2x1dGUuXG4gICAqXG4gICAqIEBwYXJhbSBjb21tYW5kcyBBbiBhcnJheSBvZiBVUkwgZnJhZ21lbnRzIHdpdGggd2hpY2ggdG8gY29uc3RydWN0IHRoZSB0YXJnZXQgVVJMLlxuICAgKiBJZiB0aGUgcGF0aCBpcyBzdGF0aWMsIGNhbiBiZSB0aGUgbGl0ZXJhbCBVUkwgc3RyaW5nLiBGb3IgYSBkeW5hbWljIHBhdGgsIHBhc3MgYW4gYXJyYXkgb2YgcGF0aFxuICAgKiBzZWdtZW50cywgZm9sbG93ZWQgYnkgdGhlIHBhcmFtZXRlcnMgZm9yIGVhY2ggc2VnbWVudC5cbiAgICogVGhlIGZyYWdtZW50cyBhcmUgYXBwbGllZCB0byB0aGUgY3VycmVudCBVUkwgb3IgdGhlIG9uZSBwcm92aWRlZCAgaW4gdGhlIGByZWxhdGl2ZVRvYCBwcm9wZXJ0eVxuICAgKiBvZiB0aGUgb3B0aW9ucyBvYmplY3QsIGlmIHN1cHBsaWVkLlxuICAgKiBAcGFyYW0gZXh0cmFzIEFuIG9wdGlvbnMgb2JqZWN0IHRoYXQgZGV0ZXJtaW5lcyBob3cgdGhlIFVSTCBzaG91bGQgYmUgY29uc3RydWN0ZWQgb3JcbiAgICogICAgIGludGVycHJldGVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBBIFByb21pc2UgdGhhdCByZXNvbHZlcyB0byBgdHJ1ZWAgd2hlbiBuYXZpZ2F0aW9uIHN1Y2NlZWRzLCB0byBgZmFsc2VgIHdoZW4gbmF2aWdhdGlvblxuICAgKiAgICAgZmFpbHMsXG4gICAqIG9yIGlzIHJlamVjdGVkIG9uIGVycm9yLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBUaGUgZm9sbG93aW5nIGNhbGxzIHJlcXVlc3QgbmF2aWdhdGlvbiB0byBhIGR5bmFtaWMgcm91dGUgcGF0aCByZWxhdGl2ZSB0byB0aGUgY3VycmVudCBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIubmF2aWdhdGUoWyd0ZWFtJywgMzMsICd1c2VyJywgMTFdLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMLCBvdmVycmlkaW5nIHRoZSBkZWZhdWx0IGJlaGF2aW9yXG4gICAqIHJvdXRlci5uYXZpZ2F0ZShbJ3RlYW0nLCAzMywgJ3VzZXInLCAxMV0sIHtyZWxhdGl2ZVRvOiByb3V0ZSwgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpXG4gICAqXG4gICAqL1xuICBuYXZpZ2F0ZShjb21tYW5kczogYW55W10sIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHtza2lwTG9jYXRpb25DaGFuZ2U6IGZhbHNlfSk6XG4gICAgICBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB2YWxpZGF0ZUNvbW1hbmRzKGNvbW1hbmRzKTtcbiAgICByZXR1cm4gdGhpcy5uYXZpZ2F0ZUJ5VXJsKHRoaXMuY3JlYXRlVXJsVHJlZShjb21tYW5kcywgZXh0cmFzKSwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKiBTZXJpYWxpemVzIGEgYFVybFRyZWVgIGludG8gYSBzdHJpbmcgKi9cbiAgc2VyaWFsaXplVXJsKHVybDogVXJsVHJlZSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodXJsKTtcbiAgfVxuXG4gIC8qKiBQYXJzZXMgYSBzdHJpbmcgaW50byBhIGBVcmxUcmVlYCAqL1xuICBwYXJzZVVybCh1cmw6IHN0cmluZyk6IFVybFRyZWUge1xuICAgIGxldCB1cmxUcmVlOiBVcmxUcmVlO1xuICAgIHRyeSB7XG4gICAgICB1cmxUcmVlID0gdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKHVybCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdXJsVHJlZSA9IHRoaXMubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyKGUsIHRoaXMudXJsU2VyaWFsaXplciwgdXJsKTtcbiAgICB9XG4gICAgcmV0dXJuIHVybFRyZWU7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB3aGV0aGVyIHRoZSB1cmwgaXMgYWN0aXZhdGVkLlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZFxuICAgKiBVc2UgYElzQWN0aXZlVXJsVHJlZU9wdGlvbnNgIGluc3RlYWQuXG4gICAqXG4gICAqIC0gVGhlIGVxdWl2YWxlbnQgYElzQWN0aXZlVXJsVHJlZU9wdGlvbnNgIGZvciBgdHJ1ZWAgaXNcbiAgICogYHtwYXRoczogJ2V4YWN0JywgcXVlcnlQYXJhbXM6ICdleGFjdCcsIGZyYWdtZW50OiAnaWdub3JlZCcsIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnfWAuXG4gICAqIC0gVGhlIGVxdWl2YWxlbnQgZm9yIGBmYWxzZWAgaXNcbiAgICogYHtwYXRoczogJ3N1YnNldCcsIHF1ZXJ5UGFyYW1zOiAnc3Vic2V0JywgZnJhZ21lbnQ6ICdpZ25vcmVkJywgbWF0cml4UGFyYW1zOiAnaWdub3JlZCd9YC5cbiAgICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIGV4YWN0OiBib29sZWFuKTogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciB0aGUgdXJsIGlzIGFjdGl2YXRlZC5cbiAgICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIG1hdGNoT3B0aW9uczogSXNBY3RpdmVNYXRjaE9wdGlvbnMpOiBib29sZWFuO1xuICAvKiogQGludGVybmFsICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIG1hdGNoT3B0aW9uczogYm9vbGVhbnxJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IGJvb2xlYW47XG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIG1hdGNoT3B0aW9uczogYm9vbGVhbnxJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IGJvb2xlYW4ge1xuICAgIGxldCBvcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucztcbiAgICBpZiAobWF0Y2hPcHRpb25zID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zID0gey4uLmV4YWN0TWF0Y2hPcHRpb25zfTtcbiAgICB9IGVsc2UgaWYgKG1hdGNoT3B0aW9ucyA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMgPSB7Li4uc3Vic2V0TWF0Y2hPcHRpb25zfTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucyA9IG1hdGNoT3B0aW9ucztcbiAgICB9XG4gICAgaWYgKGlzVXJsVHJlZSh1cmwpKSB7XG4gICAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybCwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybFRyZWUsIG9wdGlvbnMpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVFbXB0eVByb3BzKHBhcmFtczogUGFyYW1zKTogUGFyYW1zIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMocGFyYW1zKS5yZWR1Y2UoKHJlc3VsdDogUGFyYW1zLCBrZXk6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgdmFsdWU6IGFueSA9IHBhcmFtc1trZXldO1xuICAgICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSwge30pO1xuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzTmF2aWdhdGlvbnMoKTogdm9pZCB7XG4gICAgdGhpcy5uYXZpZ2F0aW9ucy5zdWJzY3JpYmUoXG4gICAgICAgIHQgPT4ge1xuICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSB0LmlkO1xuICAgICAgICAgIHRoaXMuY3VycmVudFBhZ2VJZCA9IHQudGFyZ2V0UGFnZUlkO1xuICAgICAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25FbmQoXG4gICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIHRoaXMuc2VyaWFsaXplVXJsKHRoaXMuY3VycmVudFVybFRyZWUpKSk7XG4gICAgICAgICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bE5hdmlnYXRpb24gPSB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uO1xuICAgICAgICAgIHQucmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgfSxcbiAgICAgICAgZSA9PiB7XG4gICAgICAgICAgdGhpcy5jb25zb2xlLndhcm4oYFVuaGFuZGxlZCBOYXZpZ2F0aW9uIEVycm9yOiBgKTtcbiAgICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHNjaGVkdWxlTmF2aWdhdGlvbihcbiAgICAgIHJhd1VybDogVXJsVHJlZSwgc291cmNlOiBOYXZpZ2F0aW9uVHJpZ2dlciwgcmVzdG9yZWRTdGF0ZTogUmVzdG9yZWRTdGF0ZXxudWxsLFxuICAgICAgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzLFxuICAgICAgcHJpb3JQcm9taXNlPzoge3Jlc29sdmU6IGFueSwgcmVqZWN0OiBhbnksIHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj59KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKHRoaXMuZGlzcG9zZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZmFsc2UpO1xuICAgIH1cblxuICAgIC8vICogSW1wZXJhdGl2ZSBuYXZpZ2F0aW9ucyAocm91dGVyLm5hdmlnYXRlKSBtaWdodCB0cmlnZ2VyIGFkZGl0aW9uYWwgbmF2aWdhdGlvbnMgdG8gdGhlIHNhbWVcbiAgICAvLyAgIFVSTCB2aWEgYSBwb3BzdGF0ZSBldmVudCBhbmQgdGhlIGxvY2F0aW9uQ2hhbmdlTGlzdGVuZXIuIFdlIHNob3VsZCBza2lwIHRoZXNlIGR1cGxpY2F0ZVxuICAgIC8vICAgbmF2cy4gRHVwbGljYXRlcyBtYXkgYWxzbyBiZSB0cmlnZ2VyZWQgYnkgYXR0ZW1wdHMgdG8gc3luYyBBbmd1bGFySlMgYW5kIEFuZ3VsYXIgcm91dGVyXG4gICAgLy8gICBzdGF0ZXMuXG4gICAgLy8gKiBJbXBlcmF0aXZlIG5hdmlnYXRpb25zIGNhbiBiZSBjYW5jZWxsZWQgYnkgcm91dGVyIGd1YXJkcywgbWVhbmluZyB0aGUgVVJMIHdvbid0IGNoYW5nZS4gSWZcbiAgICAvLyAgIHRoZSB1c2VyIGZvbGxvd3MgdGhhdCB3aXRoIGEgbmF2aWdhdGlvbiB1c2luZyB0aGUgYmFjay9mb3J3YXJkIGJ1dHRvbiBvciBtYW51YWwgVVJMIGNoYW5nZSxcbiAgICAvLyAgIHRoZSBkZXN0aW5hdGlvbiBtYXkgYmUgdGhlIHNhbWUgYXMgdGhlIHByZXZpb3VzIGltcGVyYXRpdmUgYXR0ZW1wdC4gV2Ugc2hvdWxkIG5vdCBza2lwXG4gICAgLy8gICB0aGVzZSBuYXZpZ2F0aW9ucyBiZWNhdXNlIGl0J3MgYSBzZXBhcmF0ZSBjYXNlIGZyb20gdGhlIG9uZSBhYm92ZSAtLSBpdCdzIG5vdCBhIGR1cGxpY2F0ZVxuICAgIC8vICAgbmF2aWdhdGlvbi5cbiAgICBjb25zdCBsYXN0TmF2aWdhdGlvbiA9IHRoaXMuZ2V0VHJhbnNpdGlvbigpO1xuICAgIC8vIFdlIGRvbid0IHdhbnQgdG8gc2tpcCBkdXBsaWNhdGUgc3VjY2Vzc2Z1bCBuYXZzIGlmIHRoZXkncmUgaW1wZXJhdGl2ZSBiZWNhdXNlXG4gICAgLy8gb25TYW1lVXJsTmF2aWdhdGlvbiBjb3VsZCBiZSAncmVsb2FkJyAoc28gdGhlIGR1cGxpY2F0ZSBpcyBpbnRlbmRlZCkuXG4gICAgY29uc3QgYnJvd3Nlck5hdlByZWNlZGVkQnlSb3V0ZXJOYXYgPVxuICAgICAgICBzb3VyY2UgIT09ICdpbXBlcmF0aXZlJyAmJiBsYXN0TmF2aWdhdGlvbj8uc291cmNlID09PSAnaW1wZXJhdGl2ZSc7XG4gICAgY29uc3QgbGFzdE5hdmlnYXRpb25TdWNjZWVkZWQgPSB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPT09IGxhc3ROYXZpZ2F0aW9uLmlkO1xuICAgIC8vIElmIHRoZSBsYXN0IG5hdmlnYXRpb24gc3VjY2VlZGVkIG9yIGlzIGluIGZsaWdodCwgd2UgY2FuIHVzZSB0aGUgcmF3VXJsIGFzIHRoZSBjb21wYXJpc29uLlxuICAgIC8vIEhvd2V2ZXIsIGlmIGl0IGZhaWxlZCwgd2Ugc2hvdWxkIGNvbXBhcmUgdG8gdGhlIGZpbmFsIHJlc3VsdCAodXJsQWZ0ZXJSZWRpcmVjdHMpLlxuICAgIGNvbnN0IGxhc3ROYXZpZ2F0aW9uVXJsID0gKGxhc3ROYXZpZ2F0aW9uU3VjY2VlZGVkIHx8IHRoaXMuY3VycmVudE5hdmlnYXRpb24pID9cbiAgICAgICAgbGFzdE5hdmlnYXRpb24ucmF3VXJsIDpcbiAgICAgICAgbGFzdE5hdmlnYXRpb24udXJsQWZ0ZXJSZWRpcmVjdHM7XG4gICAgY29uc3QgZHVwbGljYXRlTmF2ID0gbGFzdE5hdmlnYXRpb25VcmwudG9TdHJpbmcoKSA9PT0gcmF3VXJsLnRvU3RyaW5nKCk7XG4gICAgaWYgKGJyb3dzZXJOYXZQcmVjZWRlZEJ5Um91dGVyTmF2ICYmIGR1cGxpY2F0ZU5hdikge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKTsgIC8vIHJldHVybiB2YWx1ZSBpcyBub3QgdXNlZFxuICAgIH1cblxuICAgIGxldCByZXNvbHZlOiBhbnk7XG4gICAgbGV0IHJlamVjdDogYW55O1xuICAgIGxldCBwcm9taXNlOiBQcm9taXNlPGJvb2xlYW4+O1xuICAgIGlmIChwcmlvclByb21pc2UpIHtcbiAgICAgIHJlc29sdmUgPSBwcmlvclByb21pc2UucmVzb2x2ZTtcbiAgICAgIHJlamVjdCA9IHByaW9yUHJvbWlzZS5yZWplY3Q7XG4gICAgICBwcm9taXNlID0gcHJpb3JQcm9taXNlLnByb21pc2U7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXMsIHJlaikgPT4ge1xuICAgICAgICByZXNvbHZlID0gcmVzO1xuICAgICAgICByZWplY3QgPSByZWo7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBpZCA9ICsrdGhpcy5uYXZpZ2F0aW9uSWQ7XG4gICAgbGV0IHRhcmdldFBhZ2VJZDogbnVtYmVyO1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdjb21wdXRlZCcpIHtcbiAgICAgIGNvbnN0IGlzSW5pdGlhbFBhZ2UgPSB0aGlzLmN1cnJlbnRQYWdlSWQgPT09IDA7XG4gICAgICBpZiAoaXNJbml0aWFsUGFnZSkge1xuICAgICAgICByZXN0b3JlZFN0YXRlID0gdGhpcy5sb2NhdGlvbi5nZXRTdGF0ZSgpIGFzIFJlc3RvcmVkU3RhdGUgfCBudWxsO1xuICAgICAgfVxuICAgICAgLy8gSWYgdGhlIGDJtXJvdXRlclBhZ2VJZGAgZXhpc3QgaW4gdGhlIHN0YXRlIHRoZW4gYHRhcmdldHBhZ2VJZGAgc2hvdWxkIGhhdmUgdGhlIHZhbHVlIG9mXG4gICAgICAvLyBgybVyb3V0ZXJQYWdlSWRgLiBUaGlzIGlzIHRoZSBjYXNlIGZvciBzb21ldGhpbmcgbGlrZSBhIHBhZ2UgcmVmcmVzaCB3aGVyZSB3ZSBhc3NpZ24gdGhlXG4gICAgICAvLyB0YXJnZXQgaWQgdG8gdGhlIHByZXZpb3VzbHkgc2V0IHZhbHVlIGZvciB0aGF0IHBhZ2UuXG4gICAgICBpZiAocmVzdG9yZWRTdGF0ZSAmJiByZXN0b3JlZFN0YXRlLsm1cm91dGVyUGFnZUlkKSB7XG4gICAgICAgIHRhcmdldFBhZ2VJZCA9IHJlc3RvcmVkU3RhdGUuybVyb3V0ZXJQYWdlSWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJZiB3ZSdyZSByZXBsYWNpbmcgdGhlIFVSTCBvciBkb2luZyBhIHNpbGVudCBuYXZpZ2F0aW9uLCB3ZSBkbyBub3Qgd2FudCB0byBpbmNyZW1lbnQgdGhlXG4gICAgICAgIC8vIHBhZ2UgaWQgYmVjYXVzZSB3ZSBhcmVuJ3QgcHVzaGluZyBhIG5ldyBlbnRyeSB0byBoaXN0b3J5LlxuICAgICAgICBpZiAoZXh0cmFzLnJlcGxhY2VVcmwgfHwgZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICAgIHRhcmdldFBhZ2VJZCA9IHRoaXMuYnJvd3NlclBhZ2VJZCA/PyAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRhcmdldFBhZ2VJZCA9ICh0aGlzLmJyb3dzZXJQYWdlSWQgPz8gMCkgKyAxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoaXMgaXMgdW51c2VkIHdoZW4gYGNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb25gIGlzIG5vdCBjb21wdXRlZC5cbiAgICAgIHRhcmdldFBhZ2VJZCA9IDA7XG4gICAgfVxuXG4gICAgdGhpcy5zZXRUcmFuc2l0aW9uKHtcbiAgICAgIGlkLFxuICAgICAgdGFyZ2V0UGFnZUlkLFxuICAgICAgc291cmNlLFxuICAgICAgcmVzdG9yZWRTdGF0ZSxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgY3VycmVudFJhd1VybDogdGhpcy5yYXdVcmxUcmVlLFxuICAgICAgcmF3VXJsLFxuICAgICAgZXh0cmFzLFxuICAgICAgcmVzb2x2ZSxcbiAgICAgIHJlamVjdCxcbiAgICAgIHByb21pc2UsXG4gICAgICBjdXJyZW50U25hcHNob3Q6IHRoaXMucm91dGVyU3RhdGUuc25hcHNob3QsXG4gICAgICBjdXJyZW50Um91dGVyU3RhdGU6IHRoaXMucm91dGVyU3RhdGVcbiAgICB9KTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBlcnJvciBpcyBwcm9wYWdhdGVkIGV2ZW4gdGhvdWdoIGBwcm9jZXNzTmF2aWdhdGlvbnNgIGNhdGNoXG4gICAgLy8gaGFuZGxlciBkb2VzIG5vdCByZXRocm93XG4gICAgcmV0dXJuIHByb21pc2UuY2F0Y2goKGU6IGFueSkgPT4ge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXRCcm93c2VyVXJsKHVybDogVXJsVHJlZSwgdDogTmF2aWdhdGlvblRyYW5zaXRpb24pIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICAgIGNvbnN0IHN0YXRlID0gey4uLnQuZXh0cmFzLnN0YXRlLCAuLi50aGlzLmdlbmVyYXRlTmdSb3V0ZXJTdGF0ZSh0LmlkLCB0LnRhcmdldFBhZ2VJZCl9O1xuICAgIGlmICh0aGlzLmxvY2F0aW9uLmlzQ3VycmVudFBhdGhFcXVhbFRvKHBhdGgpIHx8ICEhdC5leHRyYXMucmVwbGFjZVVybCkge1xuICAgICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUocGF0aCwgJycsIHN0YXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5sb2NhdGlvbi5nbyhwYXRoLCAnJywgc3RhdGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtcyB0aGUgbmVjZXNzYXJ5IHJvbGxiYWNrIGFjdGlvbiB0byByZXN0b3JlIHRoZSBicm93c2VyIFVSTCB0byB0aGVcbiAgICogc3RhdGUgYmVmb3JlIHRoZSB0cmFuc2l0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSByZXN0b3JlSGlzdG9yeSh0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbiwgcmVzdG9yaW5nRnJvbUNhdWdodEVycm9yID0gZmFsc2UpIHtcbiAgICBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAnY29tcHV0ZWQnKSB7XG4gICAgICBjb25zdCB0YXJnZXRQYWdlUG9zaXRpb24gPSB0aGlzLmN1cnJlbnRQYWdlSWQgLSB0LnRhcmdldFBhZ2VJZDtcbiAgICAgIC8vIFRoZSBuYXZpZ2F0b3IgY2hhbmdlIHRoZSBsb2NhdGlvbiBiZWZvcmUgdHJpZ2dlcmVkIHRoZSBicm93c2VyIGV2ZW50LFxuICAgICAgLy8gc28gd2UgbmVlZCB0byBnbyBiYWNrIHRvIHRoZSBjdXJyZW50IHVybCBpZiB0aGUgbmF2aWdhdGlvbiBpcyBjYW5jZWxlZC5cbiAgICAgIC8vIEFsc28sIHdoZW4gbmF2aWdhdGlvbiBnZXRzIGNhbmNlbGxlZCB3aGlsZSB1c2luZyB1cmwgdXBkYXRlIHN0cmF0ZWd5IGVhZ2VyLCB0aGVuIHdlIG5lZWQgdG9cbiAgICAgIC8vIGdvIGJhY2suIEJlY2F1c2UsIHdoZW4gYHVybFVwZGF0ZVNyYXRlZ3lgIGlzIGBlYWdlcmA7IGBzZXRCcm93c2VyVXJsYCBtZXRob2QgaXMgY2FsbGVkXG4gICAgICAvLyBiZWZvcmUgYW55IHZlcmlmaWNhdGlvbi5cbiAgICAgIGNvbnN0IGJyb3dzZXJVcmxVcGRhdGVPY2N1cnJlZCA9XG4gICAgICAgICAgKHQuc291cmNlID09PSAncG9wc3RhdGUnIHx8IHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcicgfHxcbiAgICAgICAgICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9PT0gdGhpcy5jdXJyZW50TmF2aWdhdGlvbj8uZmluYWxVcmwpO1xuICAgICAgaWYgKGJyb3dzZXJVcmxVcGRhdGVPY2N1cnJlZCAmJiB0YXJnZXRQYWdlUG9zaXRpb24gIT09IDApIHtcbiAgICAgICAgdGhpcy5sb2NhdGlvbi5oaXN0b3J5R28odGFyZ2V0UGFnZVBvc2l0aW9uKTtcbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9PT0gdGhpcy5jdXJyZW50TmF2aWdhdGlvbj8uZmluYWxVcmwgJiYgdGFyZ2V0UGFnZVBvc2l0aW9uID09PSAwKSB7XG4gICAgICAgIC8vIFdlIGdvdCB0byB0aGUgYWN0aXZhdGlvbiBzdGFnZSAod2hlcmUgY3VycmVudFVybFRyZWUgaXMgc2V0IHRvIHRoZSBuYXZpZ2F0aW9uJ3NcbiAgICAgICAgLy8gZmluYWxVcmwpLCBidXQgd2Ugd2VyZW4ndCBtb3ZpbmcgYW55d2hlcmUgaW4gaGlzdG9yeSAoc2tpcExvY2F0aW9uQ2hhbmdlIG9yIHJlcGxhY2VVcmwpLlxuICAgICAgICAvLyBXZSBzdGlsbCBuZWVkIHRvIHJlc2V0IHRoZSByb3V0ZXIgc3RhdGUgYmFjayB0byB3aGF0IGl0IHdhcyB3aGVuIHRoZSBuYXZpZ2F0aW9uIHN0YXJ0ZWQuXG4gICAgICAgIHRoaXMucmVzZXRTdGF0ZSh0KTtcbiAgICAgICAgLy8gVE9ETyhhdHNjb3R0KTogcmVzZXR0aW5nIHRoZSBgYnJvd3NlclVybFRyZWVgIHNob3VsZCByZWFsbHkgYmUgZG9uZSBpbiBgcmVzZXRTdGF0ZWAuXG4gICAgICAgIC8vIEludmVzdGlnYXRlIGlmIHRoaXMgY2FuIGJlIGRvbmUgYnkgcnVubmluZyBUR1AuXG4gICAgICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0LmN1cnJlbnRVcmxUcmVlO1xuICAgICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhlIGJyb3dzZXIgVVJMIGFuZCByb3V0ZXIgc3RhdGUgd2FzIG5vdCB1cGRhdGVkIGJlZm9yZSB0aGUgbmF2aWdhdGlvbiBjYW5jZWxsZWQgc29cbiAgICAgICAgLy8gdGhlcmUncyBubyByZXN0b3JhdGlvbiBuZWVkZWQuXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdyZXBsYWNlJykge1xuICAgICAgLy8gVE9ETyhhdHNjb3R0KTogSXQgc2VlbXMgbGlrZSB3ZSBzaG91bGQgX2Fsd2F5c18gcmVzZXQgdGhlIHN0YXRlIGhlcmUuIEl0IHdvdWxkIGJlIGEgbm8tb3BcbiAgICAgIC8vIGZvciBgZGVmZXJyZWRgIG5hdmlnYXRpb25zIHRoYXQgaGF2ZW4ndCBjaGFuZ2UgdGhlIGludGVybmFsIHN0YXRlIHlldCBiZWNhdXNlIGd1YXJkc1xuICAgICAgLy8gcmVqZWN0LiBGb3IgJ2VhZ2VyJyBuYXZpZ2F0aW9ucywgaXQgc2VlbXMgbGlrZSB3ZSBhbHNvIHJlYWxseSBzaG91bGQgcmVzZXQgdGhlIHN0YXRlXG4gICAgICAvLyBiZWNhdXNlIHRoZSBuYXZpZ2F0aW9uIHdhcyBjYW5jZWxsZWQuIEludmVzdGlnYXRlIGlmIHRoaXMgY2FuIGJlIGRvbmUgYnkgcnVubmluZyBUR1AuXG4gICAgICBpZiAocmVzdG9yaW5nRnJvbUNhdWdodEVycm9yKSB7XG4gICAgICAgIHRoaXMucmVzZXRTdGF0ZSh0KTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZXNldFN0YXRlKHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uKTogdm9pZCB7XG4gICAgKHRoaXMgYXMge3JvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZX0pLnJvdXRlclN0YXRlID0gdC5jdXJyZW50Um91dGVyU3RhdGU7XG4gICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IHQuY3VycmVudFVybFRyZWU7XG4gICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHRoaXMuY3VycmVudFVybFRyZWUsIHQucmF3VXJsKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk6IHZvaWQge1xuICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKFxuICAgICAgICB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHRoaXMucmF3VXJsVHJlZSksICcnLFxuICAgICAgICB0aGlzLmdlbmVyYXRlTmdSb3V0ZXJTdGF0ZSh0aGlzLmxhc3RTdWNjZXNzZnVsSWQsIHRoaXMuY3VycmVudFBhZ2VJZCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBjYW5jZWxOYXZpZ2F0aW9uVHJhbnNpdGlvbih0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbiwgcmVhc29uOiBzdHJpbmcpIHtcbiAgICBjb25zdCBuYXZDYW5jZWwgPSBuZXcgTmF2aWdhdGlvbkNhbmNlbCh0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIHJlYXNvbik7XG4gICAgdGhpcy50cmlnZ2VyRXZlbnQobmF2Q2FuY2VsKTtcbiAgICB0LnJlc29sdmUoZmFsc2UpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZU5nUm91dGVyU3RhdGUobmF2aWdhdGlvbklkOiBudW1iZXIsIHJvdXRlclBhZ2VJZD86IG51bWJlcikge1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdjb21wdXRlZCcpIHtcbiAgICAgIHJldHVybiB7bmF2aWdhdGlvbklkLCDJtXJvdXRlclBhZ2VJZDogcm91dGVyUGFnZUlkfTtcbiAgICB9XG4gICAgcmV0dXJuIHtuYXZpZ2F0aW9uSWR9O1xuICB9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHM6IHN0cmluZ1tdKTogdm9pZCB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29tbWFuZHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjbWQgPSBjb21tYW5kc1tpXTtcbiAgICBpZiAoY21kID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIHJlcXVlc3RlZCBwYXRoIGNvbnRhaW5zICR7Y21kfSBzZWdtZW50IGF0IGluZGV4ICR7aX1gKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==