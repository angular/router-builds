/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { Compiler, Injectable, Injector, NgModuleFactoryLoader, NgModuleRef, NgZone, Type, ɵConsole as Console } from '@angular/core';
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
                // If the source of the navigation is from a browser event, the URL is
                // already updated. We already need to sync the internal state.
                if (isBrowserTriggeredNavigation(t.source)) {
                    this.browserUrlTree = t.rawUrl;
                }
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
                                // The URL is already updated at this point if we have 'eager' URL
                                // updates or if the navigation was triggered by the browser (back
                                // button, URL bar, etc). We want to replace that item in history if
                                // the navigation is rejected.
                                replaceUrl: this.urlUpdateStrategy === 'eager' ||
                                    isBrowserTriggeredNavigation(t.source)
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
            this.console.warn(`Unhandled Navigation Error: ${e}`);
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
        const browserNavPrecededByRouterNav = isBrowserTriggeredNavigation(source) && lastNavigation &&
            !isBrowserTriggeredNavigation(lastNavigation.source);
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
Router.decorators = [
    { type: Injectable }
];
Router.ctorParameters = () => [
    { type: Type },
    { type: UrlSerializer },
    { type: ChildrenOutletContexts },
    { type: Location },
    { type: Injector },
    { type: NgModuleFactoryLoader },
    { type: Compiler },
    { type: undefined }
];
function validateCommands(commands) {
    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        if (cmd == null) {
            throw new Error(`The requested path contains ${cmd} segment at index ${i}`);
        }
    }
}
function isBrowserTriggeredNavigation(source) {
    return source !== 'imperative';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBZ0IsTUFBTSxpQkFBaUIsQ0FBQztBQUN4RCxPQUFPLEVBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUscUJBQXFCLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxJQUFJLE9BQU8sRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNwSSxPQUFPLEVBQUMsZUFBZSxFQUFFLEtBQUssRUFBYyxFQUFFLEVBQUUsT0FBTyxFQUFtQixNQUFNLE1BQU0sQ0FBQztBQUN2RixPQUFPLEVBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUdqRixPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUN4RCxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDaEQsT0FBTyxFQUFRLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBcUIsVUFBVSxFQUFFLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3TyxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNyRCxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDaEQsT0FB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QUMsQ0FBQyxZQUFZLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN4RixJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdCLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbkIsQ0FBQztJQUVPLHFCQUFxQixDQUFDLFlBQW9CLEVBQUUsWUFBcUI7UUFDdkUsSUFBSSxJQUFJLENBQUMsNEJBQTRCLEtBQUssVUFBVSxFQUFFO1lBQ3BELE9BQU8sRUFBQyxZQUFZLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBQyxDQUFDO1NBQ3BEO1FBQ0QsT0FBTyxFQUFDLFlBQVksRUFBQyxDQUFDO0lBQ3hCLENBQUM7OztZQWxvQ0YsVUFBVTs7O1lBcFl5RSxJQUFJO1lBb0J4QixhQUFhO1lBSnJFLHNCQUFzQjtZQWpCdEIsUUFBUTtZQUNjLFFBQVE7WUFBRSxxQkFBcUI7WUFBckQsUUFBUTs7O0FBeWdEaEIsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFrQjtJQUMxQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUN4QyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsR0FBRyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUM3RTtLQUNGO0FBQ0gsQ0FBQztBQUVELFNBQVMsNEJBQTRCLENBQUMsTUFBNEM7SUFDaEYsT0FBTyxNQUFNLEtBQUssWUFBWSxDQUFDO0FBQ2pDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvbiwgUG9wU3RhdGVFdmVudH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7Q29tcGlsZXIsIEluamVjdGFibGUsIEluamVjdG9yLCBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIE5nTW9kdWxlUmVmLCBOZ1pvbmUsIFR5cGUsIMm1Q29uc29sZSBhcyBDb25zb2xlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7QmVoYXZpb3JTdWJqZWN0LCBFTVBUWSwgT2JzZXJ2YWJsZSwgb2YsIFN1YmplY3QsIFN1YnNjcmlwdGlvbkxpa2V9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjYXRjaEVycm9yLCBmaWx0ZXIsIGZpbmFsaXplLCBtYXAsIHN3aXRjaE1hcCwgdGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7UXVlcnlQYXJhbXNIYW5kbGluZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtjcmVhdGVSb3V0ZXJTdGF0ZX0gZnJvbSAnLi9jcmVhdGVfcm91dGVyX3N0YXRlJztcbmltcG9ydCB7Y3JlYXRlVXJsVHJlZX0gZnJvbSAnLi9jcmVhdGVfdXJsX3RyZWUnO1xuaW1wb3J0IHtFdmVudCwgR3VhcmRzQ2hlY2tFbmQsIEd1YXJkc0NoZWNrU3RhcnQsIE5hdmlnYXRpb25DYW5jZWwsIE5hdmlnYXRpb25FbmQsIE5hdmlnYXRpb25FcnJvciwgTmF2aWdhdGlvblN0YXJ0LCBOYXZpZ2F0aW9uVHJpZ2dlciwgUmVzb2x2ZUVuZCwgUmVzb2x2ZVN0YXJ0LCBSb3V0ZUNvbmZpZ0xvYWRFbmQsIFJvdXRlQ29uZmlnTG9hZFN0YXJ0LCBSb3V0ZXNSZWNvZ25pemVkfSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge2FjdGl2YXRlUm91dGVzfSBmcm9tICcuL29wZXJhdG9ycy9hY3RpdmF0ZV9yb3V0ZXMnO1xuaW1wb3J0IHthcHBseVJlZGlyZWN0c30gZnJvbSAnLi9vcGVyYXRvcnMvYXBwbHlfcmVkaXJlY3RzJztcbmltcG9ydCB7Y2hlY2tHdWFyZHN9IGZyb20gJy4vb3BlcmF0b3JzL2NoZWNrX2d1YXJkcyc7XG5pbXBvcnQge3JlY29nbml6ZX0gZnJvbSAnLi9vcGVyYXRvcnMvcmVjb2duaXplJztcbmltcG9ydCB7cmVzb2x2ZURhdGF9IGZyb20gJy4vb3BlcmF0b3JzL3Jlc29sdmVfZGF0YSc7XG5pbXBvcnQge3N3aXRjaFRhcH0gZnJvbSAnLi9vcGVyYXRvcnMvc3dpdGNoX3RhcCc7XG5pbXBvcnQge0RlZmF1bHRSb3V0ZVJldXNlU3RyYXRlZ3ksIFJvdXRlUmV1c2VTdHJhdGVneX0gZnJvbSAnLi9yb3V0ZV9yZXVzZV9zdHJhdGVneSc7XG5pbXBvcnQge1JvdXRlckNvbmZpZ0xvYWRlcn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge0NoaWxkcmVuT3V0bGV0Q29udGV4dHN9IGZyb20gJy4vcm91dGVyX291dGxldF9jb250ZXh0JztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGUsIGNyZWF0ZUVtcHR5U3RhdGUsIFJvdXRlclN0YXRlLCBSb3V0ZXJTdGF0ZVNuYXBzaG90fSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge2lzTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yLCBuYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IsIFBhcmFtc30gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtEZWZhdWx0VXJsSGFuZGxpbmdTdHJhdGVneSwgVXJsSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi91cmxfaGFuZGxpbmdfc3RyYXRlZ3knO1xuaW1wb3J0IHtjb250YWluc1RyZWUsIGNyZWF0ZUVtcHR5VXJsVHJlZSwgSXNBY3RpdmVNYXRjaE9wdGlvbnMsIFVybFNlcmlhbGl6ZXIsIFVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtzdGFuZGFyZGl6ZUNvbmZpZywgdmFsaWRhdGVDb25maWd9IGZyb20gJy4vdXRpbHMvY29uZmlnJztcbmltcG9ydCB7Q2hlY2tzLCBnZXRBbGxSb3V0ZUd1YXJkc30gZnJvbSAnLi91dGlscy9wcmVhY3RpdmF0aW9uJztcbmltcG9ydCB7aXNVcmxUcmVlfSBmcm9tICcuL3V0aWxzL3R5cGVfZ3VhcmRzJztcblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIE9wdGlvbnMgdGhhdCBtb2RpZnkgdGhlIGBSb3V0ZXJgIFVSTC5cbiAqIFN1cHBseSBhbiBvYmplY3QgY29udGFpbmluZyBhbnkgb2YgdGhlc2UgcHJvcGVydGllcyB0byBhIGBSb3V0ZXJgIG5hdmlnYXRpb24gZnVuY3Rpb24gdG9cbiAqIGNvbnRyb2wgaG93IHRoZSB0YXJnZXQgVVJMIHNob3VsZCBiZSBjb25zdHJ1Y3RlZC5cbiAqXG4gKiBAc2VlIFtSb3V0ZXIubmF2aWdhdGUoKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI25hdmlnYXRlKVxuICogQHNlZSBbUm91dGVyLmNyZWF0ZVVybFRyZWUoKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI2NyZWF0ZXVybHRyZWUpXG4gKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFVybENyZWF0aW9uT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBTcGVjaWZpZXMgYSByb290IFVSSSB0byB1c2UgZm9yIHJlbGF0aXZlIG5hdmlnYXRpb24uXG4gICAqXG4gICAqIEZvciBleGFtcGxlLCBjb25zaWRlciB0aGUgZm9sbG93aW5nIHJvdXRlIGNvbmZpZ3VyYXRpb24gd2hlcmUgdGhlIHBhcmVudCByb3V0ZVxuICAgKiBoYXMgdHdvIGNoaWxkcmVuLlxuICAgKlxuICAgKiBgYGBcbiAgICogW3tcbiAgICogICBwYXRoOiAncGFyZW50JyxcbiAgICogICBjb21wb25lbnQ6IFBhcmVudENvbXBvbmVudCxcbiAgICogICBjaGlsZHJlbjogW3tcbiAgICogICAgIHBhdGg6ICdsaXN0JyxcbiAgICogICAgIGNvbXBvbmVudDogTGlzdENvbXBvbmVudFxuICAgKiAgIH0se1xuICAgKiAgICAgcGF0aDogJ2NoaWxkJyxcbiAgICogICAgIGNvbXBvbmVudDogQ2hpbGRDb21wb25lbnRcbiAgICogICB9XVxuICAgKiB9XVxuICAgKiBgYGBcbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBgZ28oKWAgZnVuY3Rpb24gbmF2aWdhdGVzIHRvIHRoZSBgbGlzdGAgcm91dGUgYnlcbiAgICogaW50ZXJwcmV0aW5nIHRoZSBkZXN0aW5hdGlvbiBVUkkgYXMgcmVsYXRpdmUgdG8gdGhlIGFjdGl2YXRlZCBgY2hpbGRgICByb3V0ZVxuICAgKlxuICAgKiBgYGBcbiAgICogIEBDb21wb25lbnQoey4uLn0pXG4gICAqICBjbGFzcyBDaGlsZENvbXBvbmVudCB7XG4gICAqICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsIHByaXZhdGUgcm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7fVxuICAgKlxuICAgKiAgICBnbygpIHtcbiAgICogICAgICB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy4uL2xpc3QnXSwgeyByZWxhdGl2ZVRvOiB0aGlzLnJvdXRlIH0pO1xuICAgKiAgICB9XG4gICAqICB9XG4gICAqIGBgYFxuICAgKlxuICAgKiBBIHZhbHVlIG9mIGBudWxsYCBvciBgdW5kZWZpbmVkYCBpbmRpY2F0ZXMgdGhhdCB0aGUgbmF2aWdhdGlvbiBjb21tYW5kcyBzaG91bGQgYmUgYXBwbGllZFxuICAgKiByZWxhdGl2ZSB0byB0aGUgcm9vdC5cbiAgICovXG4gIHJlbGF0aXZlVG8/OiBBY3RpdmF0ZWRSb3V0ZXxudWxsO1xuXG4gIC8qKlxuICAgKiBTZXRzIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gdGhlIFVSTC5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHRvIC9yZXN1bHRzP3BhZ2U9MVxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy9yZXN1bHRzJ10sIHsgcXVlcnlQYXJhbXM6IHsgcGFnZTogMSB9IH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHF1ZXJ5UGFyYW1zPzogUGFyYW1zfG51bGw7XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGhhc2ggZnJhZ21lbnQgZm9yIHRoZSBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvcmVzdWx0cyN0b3BcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvcmVzdWx0cyddLCB7IGZyYWdtZW50OiAndG9wJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudD86IHN0cmluZztcblxuICAvKipcbiAgICogSG93IHRvIGhhbmRsZSBxdWVyeSBwYXJhbWV0ZXJzIGluIHRoZSByb3V0ZXIgbGluayBmb3IgdGhlIG5leHQgbmF2aWdhdGlvbi5cbiAgICogT25lIG9mOlxuICAgKiAqIGBwcmVzZXJ2ZWAgOiBQcmVzZXJ2ZSBjdXJyZW50IHBhcmFtZXRlcnMuXG4gICAqICogYG1lcmdlYCA6IE1lcmdlIG5ldyB3aXRoIGN1cnJlbnQgcGFyYW1ldGVycy5cbiAgICpcbiAgICogVGhlIFwicHJlc2VydmVcIiBvcHRpb24gZGlzY2FyZHMgYW55IG5ldyBxdWVyeSBwYXJhbXM6XG4gICAqIGBgYFxuICAgKiAvLyBmcm9tIC92aWV3MT9wYWdlPTEgdG8vdmlldzI/cGFnZT0xXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcyJ10sIHsgcXVlcnlQYXJhbXM6IHsgcGFnZTogMiB9LCAgcXVlcnlQYXJhbXNIYW5kbGluZzogXCJwcmVzZXJ2ZVwiXG4gICAqIH0pO1xuICAgKiBgYGBcbiAgICogVGhlIFwibWVyZ2VcIiBvcHRpb24gYXBwZW5kcyBuZXcgcXVlcnkgcGFyYW1zIHRvIHRoZSBwYXJhbXMgZnJvbSB0aGUgY3VycmVudCBVUkw6XG4gICAqIGBgYFxuICAgKiAvLyBmcm9tIC92aWV3MT9wYWdlPTEgdG8vdmlldzI/cGFnZT0xJm90aGVyS2V5PTJcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldzInXSwgeyBxdWVyeVBhcmFtczogeyBvdGhlcktleTogMiB9LCAgcXVlcnlQYXJhbXNIYW5kbGluZzogXCJtZXJnZVwiXG4gICAqIH0pO1xuICAgKiBgYGBcbiAgICogSW4gY2FzZSBvZiBhIGtleSBjb2xsaXNpb24gYmV0d2VlbiBjdXJyZW50IHBhcmFtZXRlcnMgYW5kIHRob3NlIGluIHRoZSBgcXVlcnlQYXJhbXNgIG9iamVjdCxcbiAgICogdGhlIG5ldyB2YWx1ZSBpcyB1c2VkLlxuICAgKlxuICAgKi9cbiAgcXVlcnlQYXJhbXNIYW5kbGluZz86IFF1ZXJ5UGFyYW1zSGFuZGxpbmd8bnVsbDtcblxuICAvKipcbiAgICogV2hlbiB0cnVlLCBwcmVzZXJ2ZXMgdGhlIFVSTCBmcmFnbWVudCBmb3IgdGhlIG5leHQgbmF2aWdhdGlvblxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gUHJlc2VydmUgZnJhZ21lbnQgZnJvbSAvcmVzdWx0cyN0b3AgdG8gL3ZpZXcjdG9wXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBwcmVzZXJ2ZUZyYWdtZW50OiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHByZXNlcnZlRnJhZ21lbnQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIE9wdGlvbnMgdGhhdCBtb2RpZnkgdGhlIGBSb3V0ZXJgIG5hdmlnYXRpb24gc3RyYXRlZ3kuXG4gKiBTdXBwbHkgYW4gb2JqZWN0IGNvbnRhaW5pbmcgYW55IG9mIHRoZXNlIHByb3BlcnRpZXMgdG8gYSBgUm91dGVyYCBuYXZpZ2F0aW9uIGZ1bmN0aW9uIHRvXG4gKiBjb250cm9sIGhvdyB0aGUgbmF2aWdhdGlvbiBzaG91bGQgYmUgaGFuZGxlZC5cbiAqXG4gKiBAc2VlIFtSb3V0ZXIubmF2aWdhdGUoKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI25hdmlnYXRlKVxuICogQHNlZSBbUm91dGVyLm5hdmlnYXRlQnlVcmwoKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI25hdmlnYXRlYnl1cmwpXG4gKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMge1xuICAvKipcbiAgICogV2hlbiB0cnVlLCBuYXZpZ2F0ZXMgd2l0aG91dCBwdXNoaW5nIGEgbmV3IHN0YXRlIGludG8gaGlzdG9yeS5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHNpbGVudGx5IHRvIC92aWV3XG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgc2tpcExvY2F0aW9uQ2hhbmdlPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hlbiB0cnVlLCBuYXZpZ2F0ZXMgd2hpbGUgcmVwbGFjaW5nIHRoZSBjdXJyZW50IHN0YXRlIGluIGhpc3RvcnkuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvdmlld1xuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgcmVwbGFjZVVybDogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqL1xuICByZXBsYWNlVXJsPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogRGV2ZWxvcGVyLWRlZmluZWQgc3RhdGUgdGhhdCBjYW4gYmUgcGFzc2VkIHRvIGFueSBuYXZpZ2F0aW9uLlxuICAgKiBBY2Nlc3MgdGhpcyB2YWx1ZSB0aHJvdWdoIHRoZSBgTmF2aWdhdGlvbi5leHRyYXNgIG9iamVjdFxuICAgKiByZXR1cm5lZCBmcm9tIHRoZSBbUm91dGVyLmdldEN1cnJlbnROYXZpZ2F0aW9uKClcbiAgICogbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNnZXRjdXJyZW50bmF2aWdhdGlvbikgd2hpbGUgYSBuYXZpZ2F0aW9uIGlzIGV4ZWN1dGluZy5cbiAgICpcbiAgICogQWZ0ZXIgYSBuYXZpZ2F0aW9uIGNvbXBsZXRlcywgdGhlIHJvdXRlciB3cml0ZXMgYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhpc1xuICAgKiB2YWx1ZSB0b2dldGhlciB3aXRoIGEgYG5hdmlnYXRpb25JZGAgdG8gYGhpc3Rvcnkuc3RhdGVgLlxuICAgKiBUaGUgdmFsdWUgaXMgd3JpdHRlbiB3aGVuIGBsb2NhdGlvbi5nbygpYCBvciBgbG9jYXRpb24ucmVwbGFjZVN0YXRlKClgXG4gICAqIGlzIGNhbGxlZCBiZWZvcmUgYWN0aXZhdGluZyB0aGlzIHJvdXRlLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgYGhpc3Rvcnkuc3RhdGVgIGRvZXMgbm90IHBhc3MgYW4gb2JqZWN0IGVxdWFsaXR5IHRlc3QgYmVjYXVzZVxuICAgKiB0aGUgcm91dGVyIGFkZHMgdGhlIGBuYXZpZ2F0aW9uSWRgIG9uIGVhY2ggbmF2aWdhdGlvbi5cbiAgICpcbiAgICovXG4gIHN0YXRlPzoge1trOiBzdHJpbmddOiBhbnl9O1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIE9wdGlvbnMgdGhhdCBtb2RpZnkgdGhlIGBSb3V0ZXJgIG5hdmlnYXRpb24gc3RyYXRlZ3kuXG4gKiBTdXBwbHkgYW4gb2JqZWN0IGNvbnRhaW5pbmcgYW55IG9mIHRoZXNlIHByb3BlcnRpZXMgdG8gYSBgUm91dGVyYCBuYXZpZ2F0aW9uIGZ1bmN0aW9uIHRvXG4gKiBjb250cm9sIGhvdyB0aGUgdGFyZ2V0IFVSTCBzaG91bGQgYmUgY29uc3RydWN0ZWQgb3IgaW50ZXJwcmV0ZWQuXG4gKlxuICogQHNlZSBbUm91dGVyLm5hdmlnYXRlKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNuYXZpZ2F0ZSlcbiAqIEBzZWUgW1JvdXRlci5uYXZpZ2F0ZUJ5VXJsKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNuYXZpZ2F0ZWJ5dXJsKVxuICogQHNlZSBbUm91dGVyLmNyZWF0ZVVybFRyZWUoKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI2NyZWF0ZXVybHRyZWUpXG4gKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpXG4gKiBAc2VlIFVybENyZWF0aW9uT3B0aW9uc1xuICogQHNlZSBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5hdmlnYXRpb25FeHRyYXMgZXh0ZW5kcyBVcmxDcmVhdGlvbk9wdGlvbnMsIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMge31cblxuLyoqXG4gKiBFcnJvciBoYW5kbGVyIHRoYXQgaXMgaW52b2tlZCB3aGVuIGEgbmF2aWdhdGlvbiBlcnJvciBvY2N1cnMuXG4gKlxuICogSWYgdGhlIGhhbmRsZXIgcmV0dXJucyBhIHZhbHVlLCB0aGUgbmF2aWdhdGlvbiBQcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhpcyB2YWx1ZS5cbiAqIElmIHRoZSBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb24sIHRoZSBuYXZpZ2F0aW9uIFByb21pc2UgaXMgcmVqZWN0ZWQgd2l0aFxuICogdGhlIGV4Y2VwdGlvbi5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIEVycm9ySGFuZGxlciA9IChlcnJvcjogYW55KSA9PiBhbnk7XG5cbmZ1bmN0aW9uIGRlZmF1bHRFcnJvckhhbmRsZXIoZXJyb3I6IGFueSk6IGFueSB7XG4gIHRocm93IGVycm9yO1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0TWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyKFxuICAgIGVycm9yOiBVUklFcnJvciwgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgdXJsOiBzdHJpbmcpOiBVcmxUcmVlIHtcbiAgcmV0dXJuIHVybFNlcmlhbGl6ZXIucGFyc2UoJy8nKTtcbn1cblxuZXhwb3J0IHR5cGUgUmVzdG9yZWRTdGF0ZSA9IHtcbiAgW2s6IHN0cmluZ106IGFueSxcbiAgLy8gVE9ETygjMjc2MDcpOiBSZW1vdmUgYG5hdmlnYXRpb25JZGAgYW5kIGDJtXJvdXRlclBhZ2VJZGAgYW5kIG1vdmUgdG8gYG5nYCBvciBgybVgIG5hbWVzcGFjZS5cbiAgbmF2aWdhdGlvbklkOiBudW1iZXIsXG4gIC8vIFRoZSBgybVgIHByZWZpeCBpcyB0aGVyZSB0byByZWR1Y2UgdGhlIGNoYW5jZSBvZiBjb2xsaWRpbmcgd2l0aCBhbnkgZXhpc3RpbmcgdXNlciBwcm9wZXJ0aWVzIG9uXG4gIC8vIHRoZSBoaXN0b3J5IHN0YXRlLlxuICDJtXJvdXRlclBhZ2VJZD86IG51bWJlcixcbn07XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgYSBuYXZpZ2F0aW9uIG9wZXJhdGlvbi5cbiAqIFJldHJpZXZlIHRoZSBtb3N0IHJlY2VudCBuYXZpZ2F0aW9uIG9iamVjdCB3aXRoIHRoZVxuICogW1JvdXRlci5nZXRDdXJyZW50TmF2aWdhdGlvbigpIG1ldGhvZF0oYXBpL3JvdXRlci9Sb3V0ZXIjZ2V0Y3VycmVudG5hdmlnYXRpb24pIC5cbiAqXG4gKiAqICppZCogOiBUaGUgdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGN1cnJlbnQgbmF2aWdhdGlvbi5cbiAqICogKmluaXRpYWxVcmwqIDogVGhlIHRhcmdldCBVUkwgcGFzc2VkIGludG8gdGhlIGBSb3V0ZXIjbmF2aWdhdGVCeVVybCgpYCBjYWxsIGJlZm9yZSBuYXZpZ2F0aW9uLlxuICogVGhpcyBpcyB0aGUgdmFsdWUgYmVmb3JlIHRoZSByb3V0ZXIgaGFzIHBhcnNlZCBvciBhcHBsaWVkIHJlZGlyZWN0cyB0byBpdC5cbiAqICogKmV4dHJhY3RlZFVybCogOiBUaGUgaW5pdGlhbCB0YXJnZXQgVVJMIGFmdGVyIGJlaW5nIHBhcnNlZCB3aXRoIGBVcmxTZXJpYWxpemVyLmV4dHJhY3QoKWAuXG4gKiAqICpmaW5hbFVybCogOiBUaGUgZXh0cmFjdGVkIFVSTCBhZnRlciByZWRpcmVjdHMgaGF2ZSBiZWVuIGFwcGxpZWQuXG4gKiBUaGlzIFVSTCBtYXkgbm90IGJlIGF2YWlsYWJsZSBpbW1lZGlhdGVseSwgdGhlcmVmb3JlIHRoaXMgcHJvcGVydHkgY2FuIGJlIGB1bmRlZmluZWRgLlxuICogSXQgaXMgZ3VhcmFudGVlZCB0byBiZSBzZXQgYWZ0ZXIgdGhlIGBSb3V0ZXNSZWNvZ25pemVkYCBldmVudCBmaXJlcy5cbiAqICogKnRyaWdnZXIqIDogSWRlbnRpZmllcyBob3cgdGhpcyBuYXZpZ2F0aW9uIHdhcyB0cmlnZ2VyZWQuXG4gKiAtLSAnaW1wZXJhdGl2ZSctLVRyaWdnZXJlZCBieSBgcm91dGVyLm5hdmlnYXRlQnlVcmxgIG9yIGByb3V0ZXIubmF2aWdhdGVgLlxuICogLS0gJ3BvcHN0YXRlJy0tVHJpZ2dlcmVkIGJ5IGEgcG9wc3RhdGUgZXZlbnQuXG4gKiAtLSAnaGFzaGNoYW5nZSctLVRyaWdnZXJlZCBieSBhIGhhc2hjaGFuZ2UgZXZlbnQuXG4gKiAqICpleHRyYXMqIDogQSBgTmF2aWdhdGlvbkV4dHJhc2Agb3B0aW9ucyBvYmplY3QgdGhhdCBjb250cm9sbGVkIHRoZSBzdHJhdGVneSB1c2VkIGZvciB0aGlzXG4gKiBuYXZpZ2F0aW9uLlxuICogKiAqcHJldmlvdXNOYXZpZ2F0aW9uKiA6IFRoZSBwcmV2aW91c2x5IHN1Y2Nlc3NmdWwgYE5hdmlnYXRpb25gIG9iamVjdC4gT25seSBvbmUgcHJldmlvdXNcbiAqIG5hdmlnYXRpb24gaXMgYXZhaWxhYmxlLCB0aGVyZWZvcmUgdGhpcyBwcmV2aW91cyBgTmF2aWdhdGlvbmAgb2JqZWN0IGhhcyBhIGBudWxsYCB2YWx1ZSBmb3IgaXRzXG4gKiBvd24gYHByZXZpb3VzTmF2aWdhdGlvbmAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5hdmlnYXRpb24ge1xuICAvKipcbiAgICogVGhlIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBjdXJyZW50IG5hdmlnYXRpb24uXG4gICAqL1xuICBpZDogbnVtYmVyO1xuICAvKipcbiAgICogVGhlIHRhcmdldCBVUkwgcGFzc2VkIGludG8gdGhlIGBSb3V0ZXIjbmF2aWdhdGVCeVVybCgpYCBjYWxsIGJlZm9yZSBuYXZpZ2F0aW9uLiBUaGlzIGlzXG4gICAqIHRoZSB2YWx1ZSBiZWZvcmUgdGhlIHJvdXRlciBoYXMgcGFyc2VkIG9yIGFwcGxpZWQgcmVkaXJlY3RzIHRvIGl0LlxuICAgKi9cbiAgaW5pdGlhbFVybDogc3RyaW5nfFVybFRyZWU7XG4gIC8qKlxuICAgKiBUaGUgaW5pdGlhbCB0YXJnZXQgVVJMIGFmdGVyIGJlaW5nIHBhcnNlZCB3aXRoIGBVcmxTZXJpYWxpemVyLmV4dHJhY3QoKWAuXG4gICAqL1xuICBleHRyYWN0ZWRVcmw6IFVybFRyZWU7XG4gIC8qKlxuICAgKiBUaGUgZXh0cmFjdGVkIFVSTCBhZnRlciByZWRpcmVjdHMgaGF2ZSBiZWVuIGFwcGxpZWQuXG4gICAqIFRoaXMgVVJMIG1heSBub3QgYmUgYXZhaWxhYmxlIGltbWVkaWF0ZWx5LCB0aGVyZWZvcmUgdGhpcyBwcm9wZXJ0eSBjYW4gYmUgYHVuZGVmaW5lZGAuXG4gICAqIEl0IGlzIGd1YXJhbnRlZWQgdG8gYmUgc2V0IGFmdGVyIHRoZSBgUm91dGVzUmVjb2duaXplZGAgZXZlbnQgZmlyZXMuXG4gICAqL1xuICBmaW5hbFVybD86IFVybFRyZWU7XG4gIC8qKlxuICAgKiBJZGVudGlmaWVzIGhvdyB0aGlzIG5hdmlnYXRpb24gd2FzIHRyaWdnZXJlZC5cbiAgICpcbiAgICogKiAnaW1wZXJhdGl2ZSctLVRyaWdnZXJlZCBieSBgcm91dGVyLm5hdmlnYXRlQnlVcmxgIG9yIGByb3V0ZXIubmF2aWdhdGVgLlxuICAgKiAqICdwb3BzdGF0ZSctLVRyaWdnZXJlZCBieSBhIHBvcHN0YXRlIGV2ZW50LlxuICAgKiAqICdoYXNoY2hhbmdlJy0tVHJpZ2dlcmVkIGJ5IGEgaGFzaGNoYW5nZSBldmVudC5cbiAgICovXG4gIHRyaWdnZXI6ICdpbXBlcmF0aXZlJ3wncG9wc3RhdGUnfCdoYXNoY2hhbmdlJztcbiAgLyoqXG4gICAqIE9wdGlvbnMgdGhhdCBjb250cm9sbGVkIHRoZSBzdHJhdGVneSB1c2VkIGZvciB0aGlzIG5hdmlnYXRpb24uXG4gICAqIFNlZSBgTmF2aWdhdGlvbkV4dHJhc2AuXG4gICAqL1xuICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXM7XG4gIC8qKlxuICAgKiBUaGUgcHJldmlvdXNseSBzdWNjZXNzZnVsIGBOYXZpZ2F0aW9uYCBvYmplY3QuIE9ubHkgb25lIHByZXZpb3VzIG5hdmlnYXRpb25cbiAgICogaXMgYXZhaWxhYmxlLCB0aGVyZWZvcmUgdGhpcyBwcmV2aW91cyBgTmF2aWdhdGlvbmAgb2JqZWN0IGhhcyBhIGBudWxsYCB2YWx1ZVxuICAgKiBmb3IgaXRzIG93biBgcHJldmlvdXNOYXZpZ2F0aW9uYC5cbiAgICovXG4gIHByZXZpb3VzTmF2aWdhdGlvbjogTmF2aWdhdGlvbnxudWxsO1xufVxuXG5leHBvcnQgdHlwZSBOYXZpZ2F0aW9uVHJhbnNpdGlvbiA9IHtcbiAgaWQ6IG51bWJlcixcbiAgdGFyZ2V0UGFnZUlkOiBudW1iZXIsXG4gIGN1cnJlbnRVcmxUcmVlOiBVcmxUcmVlLFxuICBjdXJyZW50UmF3VXJsOiBVcmxUcmVlLFxuICBleHRyYWN0ZWRVcmw6IFVybFRyZWUsXG4gIHVybEFmdGVyUmVkaXJlY3RzOiBVcmxUcmVlLFxuICByYXdVcmw6IFVybFRyZWUsXG4gIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyxcbiAgcmVzb2x2ZTogYW55LFxuICByZWplY3Q6IGFueSxcbiAgcHJvbWlzZTogUHJvbWlzZTxib29sZWFuPixcbiAgc291cmNlOiBOYXZpZ2F0aW9uVHJpZ2dlcixcbiAgcmVzdG9yZWRTdGF0ZTogUmVzdG9yZWRTdGF0ZXxudWxsLFxuICBjdXJyZW50U25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QsXG4gIHRhcmdldFNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90fG51bGwsXG4gIGN1cnJlbnRSb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGUsXG4gIHRhcmdldFJvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZXxudWxsLFxuICBndWFyZHM6IENoZWNrcyxcbiAgZ3VhcmRzUmVzdWx0OiBib29sZWFufFVybFRyZWV8bnVsbCxcbn07XG5cbi8qKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCB0eXBlIFJvdXRlckhvb2sgPSAoc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QsIHJ1bkV4dHJhczoge1xuICBhcHBsaWVkVXJsVHJlZTogVXJsVHJlZSxcbiAgcmF3VXJsVHJlZTogVXJsVHJlZSxcbiAgc2tpcExvY2F0aW9uQ2hhbmdlOiBib29sZWFuLFxuICByZXBsYWNlVXJsOiBib29sZWFuLFxuICBuYXZpZ2F0aW9uSWQ6IG51bWJlclxufSkgPT4gT2JzZXJ2YWJsZTx2b2lkPjtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gZGVmYXVsdFJvdXRlckhvb2soc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QsIHJ1bkV4dHJhczoge1xuICBhcHBsaWVkVXJsVHJlZTogVXJsVHJlZSxcbiAgcmF3VXJsVHJlZTogVXJsVHJlZSxcbiAgc2tpcExvY2F0aW9uQ2hhbmdlOiBib29sZWFuLFxuICByZXBsYWNlVXJsOiBib29sZWFuLFxuICBuYXZpZ2F0aW9uSWQ6IG51bWJlclxufSk6IE9ic2VydmFibGU8dm9pZD4ge1xuICByZXR1cm4gb2YobnVsbCkgYXMgYW55O1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIHJlbGF0ZWQgdG8gYSBsb2NhdGlvbiBjaGFuZ2UsIG5lY2Vzc2FyeSBmb3Igc2NoZWR1bGluZyBmb2xsb3ctdXAgUm91dGVyIG5hdmlnYXRpb25zLlxuICovXG50eXBlIExvY2F0aW9uQ2hhbmdlSW5mbyA9IHtcbiAgc291cmNlOiAncG9wc3RhdGUnfCdoYXNoY2hhbmdlJyxcbiAgdXJsVHJlZTogVXJsVHJlZSxcbiAgc3RhdGU6IFJlc3RvcmVkU3RhdGV8bnVsbCxcbiAgdHJhbnNpdGlvbklkOiBudW1iZXJcbn07XG5cbi8qKlxuICogVGhlIGVxdWl2YWxlbnQgYElzQWN0aXZlTWF0Y2hPcHRpb25zYCBvcHRpb25zIGZvciBgUm91dGVyLmlzQWN0aXZlYCBpcyBjYWxsZWQgd2l0aCBgdHJ1ZWBcbiAqIChleGFjdCA9IHRydWUpLlxuICovXG5leHBvcnQgY29uc3QgZXhhY3RNYXRjaE9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zID0ge1xuICBwYXRoczogJ2V4YWN0JyxcbiAgZnJhZ21lbnQ6ICdpZ25vcmVkJyxcbiAgbWF0cml4UGFyYW1zOiAnaWdub3JlZCcsXG4gIHF1ZXJ5UGFyYW1zOiAnZXhhY3QnXG59O1xuXG4vKipcbiAqIFRoZSBlcXVpdmFsZW50IGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2Agb3B0aW9ucyBmb3IgYFJvdXRlci5pc0FjdGl2ZWAgaXMgY2FsbGVkIHdpdGggYGZhbHNlYFxuICogKGV4YWN0ID0gZmFsc2UpLlxuICovXG5leHBvcnQgY29uc3Qgc3Vic2V0TWF0Y2hPcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucyA9IHtcbiAgcGF0aHM6ICdzdWJzZXQnLFxuICBmcmFnbWVudDogJ2lnbm9yZWQnLFxuICBtYXRyaXhQYXJhbXM6ICdpZ25vcmVkJyxcbiAgcXVlcnlQYXJhbXM6ICdzdWJzZXQnXG59O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEEgc2VydmljZSB0aGF0IHByb3ZpZGVzIG5hdmlnYXRpb24gYW1vbmcgdmlld3MgYW5kIFVSTCBtYW5pcHVsYXRpb24gY2FwYWJpbGl0aWVzLlxuICpcbiAqIEBzZWUgYFJvdXRlYC5cbiAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gR3VpZGVdKGd1aWRlL3JvdXRlcikuXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIFJvdXRlciB7XG4gIHByaXZhdGUgY3VycmVudFVybFRyZWU6IFVybFRyZWU7XG4gIHByaXZhdGUgcmF3VXJsVHJlZTogVXJsVHJlZTtcbiAgcHJpdmF0ZSBicm93c2VyVXJsVHJlZTogVXJsVHJlZTtcbiAgcHJpdmF0ZSByZWFkb25seSB0cmFuc2l0aW9uczogQmVoYXZpb3JTdWJqZWN0PE5hdmlnYXRpb25UcmFuc2l0aW9uPjtcbiAgcHJpdmF0ZSBuYXZpZ2F0aW9uczogT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj47XG4gIHByaXZhdGUgbGFzdFN1Y2Nlc3NmdWxOYXZpZ2F0aW9uOiBOYXZpZ2F0aW9ufG51bGwgPSBudWxsO1xuICBwcml2YXRlIGN1cnJlbnROYXZpZ2F0aW9uOiBOYXZpZ2F0aW9ufG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRpc3Bvc2VkID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBsb2NhdGlvblN1YnNjcmlwdGlvbj86IFN1YnNjcmlwdGlvbkxpa2U7XG4gIC8qKlxuICAgKiBUcmFja3MgdGhlIHByZXZpb3VzbHkgc2VlbiBsb2NhdGlvbiBjaGFuZ2UgZnJvbSB0aGUgbG9jYXRpb24gc3Vic2NyaXB0aW9uIHNvIHdlIGNhbiBjb21wYXJlXG4gICAqIHRoZSB0d28gbGF0ZXN0IHRvIHNlZSBpZiB0aGV5IGFyZSBkdXBsaWNhdGVzLiBTZWUgc2V0VXBMb2NhdGlvbkNoYW5nZUxpc3RlbmVyLlxuICAgKi9cbiAgcHJpdmF0ZSBsYXN0TG9jYXRpb25DaGFuZ2VJbmZvOiBMb2NhdGlvbkNoYW5nZUluZm98bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgbmF2aWdhdGlvbklkOiBudW1iZXIgPSAwO1xuXG4gIC8qKlxuICAgKiBUaGUgaWQgb2YgdGhlIGN1cnJlbnRseSBhY3RpdmUgcGFnZSBpbiB0aGUgcm91dGVyLlxuICAgKiBVcGRhdGVkIHRvIHRoZSB0cmFuc2l0aW9uJ3MgdGFyZ2V0IGlkIG9uIGEgc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBUaGlzIGlzIHVzZWQgdG8gdHJhY2sgd2hhdCBwYWdlIHRoZSByb3V0ZXIgbGFzdCBhY3RpdmF0ZWQuIFdoZW4gYW4gYXR0ZW1wdGVkIG5hdmlnYXRpb24gZmFpbHMsXG4gICAqIHRoZSByb3V0ZXIgY2FuIHRoZW4gdXNlIHRoaXMgdG8gY29tcHV0ZSBob3cgdG8gcmVzdG9yZSB0aGUgc3RhdGUgYmFjayB0byB0aGUgcHJldmlvdXNseSBhY3RpdmVcbiAgICogcGFnZS5cbiAgICovXG4gIHByaXZhdGUgY3VycmVudFBhZ2VJZDogbnVtYmVyID0gMDtcbiAgLyoqXG4gICAqIFRoZSDJtXJvdXRlclBhZ2VJZCBvZiB3aGF0ZXZlciBwYWdlIGlzIGN1cnJlbnRseSBhY3RpdmUgaW4gdGhlIGJyb3dzZXIgaGlzdG9yeS4gVGhpcyBpc1xuICAgKiBpbXBvcnRhbnQgZm9yIGNvbXB1dGluZyB0aGUgdGFyZ2V0IHBhZ2UgaWQgZm9yIG5ldyBuYXZpZ2F0aW9ucyBiZWNhdXNlIHdlIG5lZWQgdG8gZW5zdXJlIGVhY2hcbiAgICogcGFnZSBpZCBpbiB0aGUgYnJvd3NlciBoaXN0b3J5IGlzIDEgbW9yZSB0aGFuIHRoZSBwcmV2aW91cyBlbnRyeS5cbiAgICovXG4gIHByaXZhdGUgZ2V0IGJyb3dzZXJQYWdlSWQoKTogbnVtYmVyfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuICh0aGlzLmxvY2F0aW9uLmdldFN0YXRlKCkgYXMgUmVzdG9yZWRTdGF0ZSB8IG51bGwpPy7JtXJvdXRlclBhZ2VJZDtcbiAgfVxuICBwcml2YXRlIGNvbmZpZ0xvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyO1xuICBwcml2YXRlIG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+O1xuICBwcml2YXRlIGNvbnNvbGU6IENvbnNvbGU7XG4gIHByaXZhdGUgaXNOZ1pvbmVFbmFibGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEFuIGV2ZW50IHN0cmVhbSBmb3Igcm91dGluZyBldmVudHMgaW4gdGhpcyBOZ01vZHVsZS5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBldmVudHM6IE9ic2VydmFibGU8RXZlbnQ+ID0gbmV3IFN1YmplY3Q8RXZlbnQ+KCk7XG4gIC8qKlxuICAgKiBUaGUgY3VycmVudCBzdGF0ZSBvZiByb3V0aW5nIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgcm91dGVyU3RhdGU6IFJvdXRlclN0YXRlO1xuXG4gIC8qKlxuICAgKiBBIGhhbmRsZXIgZm9yIG5hdmlnYXRpb24gZXJyb3JzIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqL1xuICBlcnJvckhhbmRsZXI6IEVycm9ySGFuZGxlciA9IGRlZmF1bHRFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIEEgaGFuZGxlciBmb3IgZXJyb3JzIHRocm93biBieSBgUm91dGVyLnBhcnNlVXJsKHVybClgXG4gICAqIHdoZW4gYHVybGAgY29udGFpbnMgYW4gaW52YWxpZCBjaGFyYWN0ZXIuXG4gICAqIFRoZSBtb3N0IGNvbW1vbiBjYXNlIGlzIGEgYCVgIHNpZ25cbiAgICogdGhhdCdzIG5vdCBlbmNvZGVkIGFuZCBpcyBub3QgcGFydCBvZiBhIHBlcmNlbnQgZW5jb2RlZCBzZXF1ZW5jZS5cbiAgICovXG4gIG1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcjpcbiAgICAgIChlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgICAgdXJsOiBzdHJpbmcpID0+IFVybFRyZWUgPSBkZWZhdWx0TWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyO1xuXG4gIC8qKlxuICAgKiBUcnVlIGlmIGF0IGxlYXN0IG9uZSBuYXZpZ2F0aW9uIGV2ZW50IGhhcyBvY2N1cnJlZCxcbiAgICogZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgbmF2aWdhdGVkOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgbGFzdFN1Y2Nlc3NmdWxJZDogbnVtYmVyID0gLTE7XG5cbiAgLyoqXG4gICAqIEhvb2tzIHRoYXQgZW5hYmxlIHlvdSB0byBwYXVzZSBuYXZpZ2F0aW9uLFxuICAgKiBlaXRoZXIgYmVmb3JlIG9yIGFmdGVyIHRoZSBwcmVhY3RpdmF0aW9uIHBoYXNlLlxuICAgKiBVc2VkIGJ5IGBSb3V0ZXJNb2R1bGVgLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGhvb2tzOiB7XG4gICAgYmVmb3JlUHJlYWN0aXZhdGlvbjogUm91dGVySG9vayxcbiAgICBhZnRlclByZWFjdGl2YXRpb246IFJvdXRlckhvb2tcbiAgfSA9IHtiZWZvcmVQcmVhY3RpdmF0aW9uOiBkZWZhdWx0Um91dGVySG9vaywgYWZ0ZXJQcmVhY3RpdmF0aW9uOiBkZWZhdWx0Um91dGVySG9va307XG5cbiAgLyoqXG4gICAqIEEgc3RyYXRlZ3kgZm9yIGV4dHJhY3RpbmcgYW5kIG1lcmdpbmcgVVJMcy5cbiAgICogVXNlZCBmb3IgQW5ndWxhckpTIHRvIEFuZ3VsYXIgbWlncmF0aW9ucy5cbiAgICovXG4gIHVybEhhbmRsaW5nU3RyYXRlZ3k6IFVybEhhbmRsaW5nU3RyYXRlZ3kgPSBuZXcgRGVmYXVsdFVybEhhbmRsaW5nU3RyYXRlZ3koKTtcblxuICAvKipcbiAgICogQSBzdHJhdGVneSBmb3IgcmUtdXNpbmcgcm91dGVzLlxuICAgKi9cbiAgcm91dGVSZXVzZVN0cmF0ZWd5OiBSb3V0ZVJldXNlU3RyYXRlZ3kgPSBuZXcgRGVmYXVsdFJvdXRlUmV1c2VTdHJhdGVneSgpO1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gaGFuZGxlIGEgbmF2aWdhdGlvbiByZXF1ZXN0IHRvIHRoZSBjdXJyZW50IFVSTC4gT25lIG9mOlxuICAgKlxuICAgKiAtIGAnaWdub3JlJ2AgOiAgVGhlIHJvdXRlciBpZ25vcmVzIHRoZSByZXF1ZXN0LlxuICAgKiAtIGAncmVsb2FkJ2AgOiBUaGUgcm91dGVyIHJlbG9hZHMgdGhlIFVSTC4gVXNlIHRvIGltcGxlbWVudCBhIFwicmVmcmVzaFwiIGZlYXR1cmUuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGlzIG9ubHkgY29uZmlndXJlcyB3aGV0aGVyIHRoZSBSb3V0ZSByZXByb2Nlc3NlcyB0aGUgVVJMIGFuZCB0cmlnZ2VycyByZWxhdGVkXG4gICAqIGFjdGlvbiBhbmQgZXZlbnRzIGxpa2UgcmVkaXJlY3RzLCBndWFyZHMsIGFuZCByZXNvbHZlcnMuIEJ5IGRlZmF1bHQsIHRoZSByb3V0ZXIgcmUtdXNlcyBhXG4gICAqIGNvbXBvbmVudCBpbnN0YW5jZSB3aGVuIGl0IHJlLW5hdmlnYXRlcyB0byB0aGUgc2FtZSBjb21wb25lbnQgdHlwZSB3aXRob3V0IHZpc2l0aW5nIGEgZGlmZmVyZW50XG4gICAqIGNvbXBvbmVudCBmaXJzdC4gVGhpcyBiZWhhdmlvciBpcyBjb25maWd1cmVkIGJ5IHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YC4gSW4gb3JkZXIgdG8gcmVsb2FkXG4gICAqIHJvdXRlZCBjb21wb25lbnRzIG9uIHNhbWUgdXJsIG5hdmlnYXRpb24sIHlvdSBuZWVkIHRvIHNldCBgb25TYW1lVXJsTmF2aWdhdGlvbmAgdG8gYCdyZWxvYWQnYFxuICAgKiBfYW5kXyBwcm92aWRlIGEgYFJvdXRlUmV1c2VTdHJhdGVneWAgd2hpY2ggcmV0dXJucyBgZmFsc2VgIGZvciBgc2hvdWxkUmV1c2VSb3V0ZWAuXG4gICAqL1xuICBvblNhbWVVcmxOYXZpZ2F0aW9uOiAncmVsb2FkJ3wnaWdub3JlJyA9ICdpZ25vcmUnO1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gbWVyZ2UgcGFyYW1ldGVycywgZGF0YSwgYW5kIHJlc29sdmVkIGRhdGEgZnJvbSBwYXJlbnQgdG8gY2hpbGRcbiAgICogcm91dGVzLiBPbmUgb2Y6XG4gICAqXG4gICAqIC0gYCdlbXB0eU9ubHknYCA6IEluaGVyaXQgcGFyZW50IHBhcmFtZXRlcnMsIGRhdGEsIGFuZCByZXNvbHZlZCBkYXRhXG4gICAqIGZvciBwYXRoLWxlc3Mgb3IgY29tcG9uZW50LWxlc3Mgcm91dGVzLlxuICAgKiAtIGAnYWx3YXlzJ2AgOiBJbmhlcml0IHBhcmVudCBwYXJhbWV0ZXJzLCBkYXRhLCBhbmQgcmVzb2x2ZWQgZGF0YVxuICAgKiBmb3IgYWxsIGNoaWxkIHJvdXRlcy5cbiAgICovXG4gIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6ICdlbXB0eU9ubHknfCdhbHdheXMnID0gJ2VtcHR5T25seSc7XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hlbiB0aGUgcm91dGVyIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMLlxuICAgKiBCeSBkZWZhdWx0IChgXCJkZWZlcnJlZFwiYCksIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMIGFmdGVyIG5hdmlnYXRpb24gaGFzIGZpbmlzaGVkLlxuICAgKiBTZXQgdG8gYCdlYWdlcidgIHRvIHVwZGF0ZSB0aGUgYnJvd3NlciBVUkwgYXQgdGhlIGJlZ2lubmluZyBvZiBuYXZpZ2F0aW9uLlxuICAgKiBZb3UgY2FuIGNob29zZSB0byB1cGRhdGUgZWFybHkgc28gdGhhdCwgaWYgbmF2aWdhdGlvbiBmYWlscyxcbiAgICogeW91IGNhbiBzaG93IGFuIGVycm9yIG1lc3NhZ2Ugd2l0aCB0aGUgVVJMIHRoYXQgZmFpbGVkLlxuICAgKi9cbiAgdXJsVXBkYXRlU3RyYXRlZ3k6ICdkZWZlcnJlZCd8J2VhZ2VyJyA9ICdkZWZlcnJlZCc7XG5cbiAgLyoqXG4gICAqIEVuYWJsZXMgYSBidWcgZml4IHRoYXQgY29ycmVjdHMgcmVsYXRpdmUgbGluayByZXNvbHV0aW9uIGluIGNvbXBvbmVudHMgd2l0aCBlbXB0eSBwYXRocy5cbiAgICogQHNlZSBgUm91dGVyTW9kdWxlYFxuICAgKi9cbiAgcmVsYXRpdmVMaW5rUmVzb2x1dGlvbjogJ2xlZ2FjeSd8J2NvcnJlY3RlZCcgPSAnY29ycmVjdGVkJztcblxuICAvKipcbiAgICogQ29uZmlndXJlcyBob3cgdGhlIFJvdXRlciBhdHRlbXB0cyB0byByZXN0b3JlIHN0YXRlIHdoZW4gYSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGxlZC5cbiAgICpcbiAgICogJ3JlcGxhY2UnIC0gQWx3YXlzIHVzZXMgYGxvY2F0aW9uLnJlcGxhY2VTdGF0ZWAgdG8gc2V0IHRoZSBicm93c2VyIHN0YXRlIHRvIHRoZSBzdGF0ZSBvZiB0aGVcbiAgICogcm91dGVyIGJlZm9yZSB0aGUgbmF2aWdhdGlvbiBzdGFydGVkLlxuICAgKlxuICAgKiAnY29tcHV0ZWQnIC0gV2lsbCBhbHdheXMgcmV0dXJuIHRvIHRoZSBzYW1lIHN0YXRlIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIGFjdHVhbCBBbmd1bGFyIHJvdXRlXG4gICAqIHdoZW4gdGhlIG5hdmlnYXRpb24gZ2V0cyBjYW5jZWxsZWQgcmlnaHQgYWZ0ZXIgdHJpZ2dlcmluZyBhIGBwb3BzdGF0ZWAgZXZlbnQuXG4gICAqXG4gICAqIFRoZSBkZWZhdWx0IHZhbHVlIGlzIGByZXBsYWNlYFxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIC8vIFRPRE8oYXRzY290dCk6IERldGVybWluZSBob3cvd2hlbi9pZiB0byBtYWtlIHRoaXMgcHVibGljIEFQSVxuICAvLyBUaGlzIHNob3VsZG7igJl0IGJlIGFuIG9wdGlvbiBhdCBhbGwgYnV0IG1heSBuZWVkIHRvIGJlIGluIG9yZGVyIHRvIGFsbG93IG1pZ3JhdGlvbiB3aXRob3V0IGFcbiAgLy8gYnJlYWtpbmcgY2hhbmdlLiBXZSBuZWVkIHRvIGRldGVybWluZSBpZiBpdCBzaG91bGQgYmUgbWFkZSBpbnRvIHB1YmxpYyBhcGkgKG9yIGlmIHdlIGZvcmdvXG4gIC8vIHRoZSBvcHRpb24gYW5kIHJlbGVhc2UgYXMgYSBicmVha2luZyBjaGFuZ2UgYnVnIGZpeCBpbiBhIG1ham9yIHZlcnNpb24pLlxuICBjYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uOiAncmVwbGFjZSd8J2NvbXB1dGVkJyA9ICdyZXBsYWNlJztcblxuICAvKipcbiAgICogQ3JlYXRlcyB0aGUgcm91dGVyIHNlcnZpY2UuXG4gICAqL1xuICAvLyBUT0RPOiB2c2F2a2luIG1ha2UgaW50ZXJuYWwgYWZ0ZXIgdGhlIGZpbmFsIGlzIG91dC5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT58bnVsbCwgcHJpdmF0ZSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgICAgcHJpdmF0ZSByb290Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIHByaXZhdGUgbG9jYXRpb246IExvY2F0aW9uLCBpbmplY3RvcjogSW5qZWN0b3IsXG4gICAgICBsb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLCBwdWJsaWMgY29uZmlnOiBSb3V0ZXMpIHtcbiAgICBjb25zdCBvbkxvYWRTdGFydCA9IChyOiBSb3V0ZSkgPT4gdGhpcy50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZFN0YXJ0KHIpKTtcbiAgICBjb25zdCBvbkxvYWRFbmQgPSAocjogUm91dGUpID0+IHRoaXMudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRFbmQocikpO1xuXG4gICAgdGhpcy5uZ01vZHVsZSA9IGluamVjdG9yLmdldChOZ01vZHVsZVJlZik7XG4gICAgdGhpcy5jb25zb2xlID0gaW5qZWN0b3IuZ2V0KENvbnNvbGUpO1xuICAgIGNvbnN0IG5nWm9uZSA9IGluamVjdG9yLmdldChOZ1pvbmUpO1xuICAgIHRoaXMuaXNOZ1pvbmVFbmFibGVkID0gbmdab25lIGluc3RhbmNlb2YgTmdab25lICYmIE5nWm9uZS5pc0luQW5ndWxhclpvbmUoKTtcblxuICAgIHRoaXMucmVzZXRDb25maWcoY29uZmlnKTtcbiAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gY3JlYXRlRW1wdHlVcmxUcmVlKCk7XG4gICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy5jdXJyZW50VXJsVHJlZTtcbiAgICB0aGlzLmJyb3dzZXJVcmxUcmVlID0gdGhpcy5jdXJyZW50VXJsVHJlZTtcblxuICAgIHRoaXMuY29uZmlnTG9hZGVyID0gbmV3IFJvdXRlckNvbmZpZ0xvYWRlcihsb2FkZXIsIGNvbXBpbGVyLCBvbkxvYWRTdGFydCwgb25Mb2FkRW5kKTtcbiAgICB0aGlzLnJvdXRlclN0YXRlID0gY3JlYXRlRW1wdHlTdGF0ZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB0aGlzLnJvb3RDb21wb25lbnRUeXBlKTtcblxuICAgIHRoaXMudHJhbnNpdGlvbnMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PE5hdmlnYXRpb25UcmFuc2l0aW9uPih7XG4gICAgICBpZDogMCxcbiAgICAgIHRhcmdldFBhZ2VJZDogMCxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgY3VycmVudFJhd1VybDogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIGV4dHJhY3RlZFVybDogdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QodGhpcy5jdXJyZW50VXJsVHJlZSksXG4gICAgICB1cmxBZnRlclJlZGlyZWN0czogdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QodGhpcy5jdXJyZW50VXJsVHJlZSksXG4gICAgICByYXdVcmw6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBleHRyYXM6IHt9LFxuICAgICAgcmVzb2x2ZTogbnVsbCxcbiAgICAgIHJlamVjdDogbnVsbCxcbiAgICAgIHByb21pc2U6IFByb21pc2UucmVzb2x2ZSh0cnVlKSxcbiAgICAgIHNvdXJjZTogJ2ltcGVyYXRpdmUnLFxuICAgICAgcmVzdG9yZWRTdGF0ZTogbnVsbCxcbiAgICAgIGN1cnJlbnRTbmFwc2hvdDogdGhpcy5yb3V0ZXJTdGF0ZS5zbmFwc2hvdCxcbiAgICAgIHRhcmdldFNuYXBzaG90OiBudWxsLFxuICAgICAgY3VycmVudFJvdXRlclN0YXRlOiB0aGlzLnJvdXRlclN0YXRlLFxuICAgICAgdGFyZ2V0Um91dGVyU3RhdGU6IG51bGwsXG4gICAgICBndWFyZHM6IHtjYW5BY3RpdmF0ZUNoZWNrczogW10sIGNhbkRlYWN0aXZhdGVDaGVja3M6IFtdfSxcbiAgICAgIGd1YXJkc1Jlc3VsdDogbnVsbCxcbiAgICB9KTtcbiAgICB0aGlzLm5hdmlnYXRpb25zID0gdGhpcy5zZXR1cE5hdmlnYXRpb25zKHRoaXMudHJhbnNpdGlvbnMpO1xuXG4gICAgdGhpcy5wcm9jZXNzTmF2aWdhdGlvbnMoKTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0dXBOYXZpZ2F0aW9ucyh0cmFuc2l0aW9uczogT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4pOlxuICAgICAgT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4ge1xuICAgIGNvbnN0IGV2ZW50c1N1YmplY3QgPSAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pO1xuICAgIHJldHVybiB0cmFuc2l0aW9ucy5waXBlKFxuICAgICAgICAgICAgICAgZmlsdGVyKHQgPT4gdC5pZCAhPT0gMCksXG5cbiAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgVVJMXG4gICAgICAgICAgICAgICBtYXAodCA9PlxuICAgICAgICAgICAgICAgICAgICAgICAoey4uLnQsIGV4dHJhY3RlZFVybDogdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QodC5yYXdVcmwpfSBhc1xuICAgICAgICAgICAgICAgICAgICAgICAgTmF2aWdhdGlvblRyYW5zaXRpb24pKSxcblxuICAgICAgICAgICAgICAgLy8gVXNpbmcgc3dpdGNoTWFwIHNvIHdlIGNhbmNlbCBleGVjdXRpbmcgbmF2aWdhdGlvbnMgd2hlbiBhIG5ldyBvbmUgY29tZXMgaW5cbiAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgbGV0IGNvbXBsZXRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICBsZXQgZXJyb3JlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICByZXR1cm4gb2YodCkucGlwZShcbiAgICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBOYXZpZ2F0aW9uIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiB0LmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRpYWxVcmw6IHQuY3VycmVudFJhd1VybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYWN0ZWRVcmw6IHQuZXh0cmFjdGVkVXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHRyaWdnZXI6IHQuc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhczogdC5leHRyYXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNOYXZpZ2F0aW9uOiB0aGlzLmxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbiA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsuLi50aGlzLmxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbiwgcHJldmlvdXNOYXZpZ2F0aW9uOiBudWxsfSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGxcbiAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgc3dpdGNoTWFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmxUcmFuc2l0aW9uID0gIXRoaXMubmF2aWdhdGVkIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LmV4dHJhY3RlZFVybC50b1N0cmluZygpICE9PSB0aGlzLmJyb3dzZXJVcmxUcmVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NDdXJyZW50VXJsID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLm9uU2FtZVVybE5hdmlnYXRpb24gPT09ICdyZWxvYWQnID8gdHJ1ZSA6IHVybFRyYW5zaXRpb24pICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybCh0LnJhd1VybCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIHNvdXJjZSBvZiB0aGUgbmF2aWdhdGlvbiBpcyBmcm9tIGEgYnJvd3NlciBldmVudCwgdGhlIFVSTCBpc1xuICAgICAgICAgICAgICAgICAgICAgICAvLyBhbHJlYWR5IHVwZGF0ZWQuIFdlIGFscmVhZHkgbmVlZCB0byBzeW5jIHRoZSBpbnRlcm5hbCBzdGF0ZS5cbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQnJvd3NlclRyaWdnZXJlZE5hdmlnYXRpb24odC5zb3VyY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5icm93c2VyVXJsVHJlZSA9IHQucmF3VXJsO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb2Nlc3NDdXJyZW50VXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpcmUgTmF2aWdhdGlvblN0YXJ0IGV2ZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gdGhpcy50cmFuc2l0aW9ucy5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuZXcgTmF2aWdhdGlvblN0YXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIHQuc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlc3RvcmVkU3RhdGUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHJhbnNpdGlvbiAhPT0gdGhpcy50cmFuc2l0aW9ucy5nZXRWYWx1ZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBkZWxheSBpcyByZXF1aXJlZCB0byBtYXRjaCBvbGQgYmVoYXZpb3IgdGhhdCBmb3JjZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuYXZpZ2F0aW9uIHRvIGFsd2F5cyBiZSBhc3luY1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFwcGx5UmVkaXJlY3RzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcGx5UmVkaXJlY3RzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZ01vZHVsZS5pbmplY3RvciwgdGhpcy5jb25maWdMb2FkZXIsIHRoaXMudXJsU2VyaWFsaXplcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnKSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGN1cnJlbnROYXZpZ2F0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4udGhpcy5jdXJyZW50TmF2aWdhdGlvbiEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5hbFVybDogdC51cmxBZnRlclJlZGlyZWN0c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlY29nbml6ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvZ25pemUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb3RDb21wb25lbnRUeXBlLCB0aGlzLmNvbmZpZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh1cmwpID0+IHRoaXMuc2VyaWFsaXplVXJsKHVybCksIHRoaXMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVsYXRpdmVMaW5rUmVzb2x1dGlvbiksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIFVSTCBpZiBpbiBgZWFnZXJgIHVwZGF0ZSBtb2RlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0LmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMsIHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5icm93c2VyVXJsVHJlZSA9IHQudXJsQWZ0ZXJSZWRpcmVjdHM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZSBSb3V0ZXNSZWNvZ25pemVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm91dGVzUmVjb2duaXplZCA9IG5ldyBSb3V0ZXNSZWNvZ25pemVkKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ISk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KHJvdXRlc1JlY29nbml6ZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc1ByZXZpb3VzVXJsID0gdXJsVHJhbnNpdGlvbiAmJiB0aGlzLnJhd1VybFRyZWUgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LnNob3VsZFByb2Nlc3NVcmwodGhpcy5yYXdVcmxUcmVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAvKiBXaGVuIHRoZSBjdXJyZW50IFVSTCBzaG91bGRuJ3QgYmUgcHJvY2Vzc2VkLCBidXQgdGhlIHByZXZpb3VzIG9uZSB3YXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICogd2UgaGFuZGxlIHRoaXMgXCJlcnJvciBjb25kaXRpb25cIiBieSBuYXZpZ2F0aW5nIHRvIHRoZSBwcmV2aW91c2x5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICogc3VjY2Vzc2Z1bCBVUkwsIGJ1dCBsZWF2aW5nIHRoZSBVUkwgaW50YWN0LiovXG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb2Nlc3NQcmV2aW91c1VybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qge2lkLCBleHRyYWN0ZWRVcmwsIHNvdXJjZSwgcmVzdG9yZWRTdGF0ZSwgZXh0cmFzfSA9IHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuYXZTdGFydCA9IG5ldyBOYXZpZ2F0aW9uU3RhcnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQsIHRoaXMuc2VyaWFsaXplVXJsKGV4dHJhY3RlZFVybCksIHNvdXJjZSwgcmVzdG9yZWRTdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2U3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0U25hcHNob3QgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZUVtcHR5U3RhdGUoZXh0cmFjdGVkVXJsLCB0aGlzLnJvb3RDb21wb25lbnRUeXBlKS5zbmFwc2hvdDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4udCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0U25hcHNob3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybEFmdGVyUmVkaXJlY3RzOiBleHRyYWN0ZWRVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhczogey4uLmV4dHJhcywgc2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZSwgcmVwbGFjZVVybDogZmFsc2V9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIFdoZW4gbmVpdGhlciB0aGUgY3VycmVudCBvciBwcmV2aW91cyBVUkwgY2FuIGJlIHByb2Nlc3NlZCwgZG8gbm90aGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICogb3RoZXIgdGhhbiB1cGRhdGUgcm91dGVyJ3MgaW50ZXJuYWwgcmVmZXJlbmNlIHRvIHRoZSBjdXJyZW50IFwic2V0dGxlZFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBVUkwuIFRoaXMgd2F5IHRoZSBuZXh0IG5hdmlnYXRpb24gd2lsbCBiZSBjb21pbmcgZnJvbSB0aGUgY3VycmVudCBVUkxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIGluIHRoZSBicm93c2VyLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJhd1VybFRyZWUgPSB0LnJhd1VybDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0LnVybEFmdGVyUmVkaXJlY3RzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIEJlZm9yZSBQcmVhY3RpdmF0aW9uXG4gICAgICAgICAgICAgICAgICAgICBzd2l0Y2hUYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRTbmFwc2hvdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZDogbmF2aWdhdGlvbklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZFVybDogYXBwbGllZFVybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmF3VXJsOiByYXdVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhczoge3NraXBMb2NhdGlvbkNoYW5nZSwgcmVwbGFjZVVybH1cbiAgICAgICAgICAgICAgICAgICAgICAgfSA9IHQ7XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhvb2tzLmJlZm9yZVByZWFjdGl2YXRpb24odGFyZ2V0U25hcHNob3QhLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdGlvbklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFwcGxpZWRVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHJhd1VybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiAhIXNraXBMb2NhdGlvbkNoYW5nZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlVXJsOiAhIXJlcGxhY2VVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIC0tLSBHVUFSRFMgLS0tXG4gICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGd1YXJkc1N0YXJ0ID0gbmV3IEd1YXJkc0NoZWNrU3RhcnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzKSwgdC50YXJnZXRTbmFwc2hvdCEpO1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChndWFyZHNTdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgbWFwKHQgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBndWFyZHM6IGdldEFsbFJvdXRlR3VhcmRzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQudGFyZ2V0U25hcHNob3QhLCB0LmN1cnJlbnRTbmFwc2hvdCwgdGhpcy5yb290Q29udGV4dHMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgfSkpLFxuXG4gICAgICAgICAgICAgICAgICAgICBjaGVja0d1YXJkcyh0aGlzLm5nTW9kdWxlLmluamVjdG9yLCAoZXZ0OiBFdmVudCkgPT4gdGhpcy50cmlnZ2VyRXZlbnQoZXZ0KSksXG4gICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGlmIChpc1VybFRyZWUodC5ndWFyZHNSZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3I6IEVycm9yJnt1cmw/OiBVcmxUcmVlfSA9IG5hdmlnYXRpb25DYW5jZWxpbmdFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYFJlZGlyZWN0aW5nIHRvIFwiJHt0aGlzLnNlcmlhbGl6ZVVybCh0Lmd1YXJkc1Jlc3VsdCl9XCJgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvci51cmwgPSB0Lmd1YXJkc1Jlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGd1YXJkc0VuZCA9IG5ldyBHdWFyZHNDaGVja0VuZChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ISxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICEhdC5ndWFyZHNSZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChndWFyZHNFbmQpO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIGZpbHRlcih0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0Lmd1YXJkc1Jlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZUhpc3RvcnkodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5jZWxOYXZpZ2F0aW9uVHJhbnNpdGlvbih0LCAnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIC0tLSBSRVNPTFZFIC0tLVxuICAgICAgICAgICAgICAgICAgICAgc3dpdGNoVGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAodC5ndWFyZHMuY2FuQWN0aXZhdGVDaGVja3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlU3RhcnQgPSBuZXcgUmVzb2x2ZVN0YXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ISk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQocmVzb2x2ZVN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YVJlc29sdmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmVEYXRhKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LCB0aGlzLm5nTW9kdWxlLmluamVjdG9yKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0OiAoKSA9PiBkYXRhUmVzb2x2ZWQgPSB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGFSZXNvbHZlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc3RvcmVIaXN0b3J5KHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbE5hdmlnYXRpb25UcmFuc2l0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBBdCBsZWFzdCBvbmUgcm91dGUgcmVzb2x2ZXIgZGlkbid0IGVtaXQgYW55IHZhbHVlLmApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlRW5kID0gbmV3IFJlc29sdmVFbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVVcmwodC51cmxBZnRlclJlZGlyZWN0cyksIHQudGFyZ2V0U25hcHNob3QhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChyZXNvbHZlRW5kKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gLS0tIEFGVEVSIFBSRUFDVElWQVRJT04gLS0tXG4gICAgICAgICAgICAgICAgICAgICBzd2l0Y2hUYXAoKHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRTbmFwc2hvdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZDogbmF2aWdhdGlvbklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZFVybDogYXBwbGllZFVybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmF3VXJsOiByYXdVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhczoge3NraXBMb2NhdGlvbkNoYW5nZSwgcmVwbGFjZVVybH1cbiAgICAgICAgICAgICAgICAgICAgICAgfSA9IHQ7XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhvb2tzLmFmdGVyUHJlYWN0aXZhdGlvbih0YXJnZXRTbmFwc2hvdCEsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBuYXZpZ2F0aW9uSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgYXBwbGllZFVybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmF3VXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBza2lwTG9jYXRpb25DaGFuZ2U6ICEhc2tpcExvY2F0aW9uQ2hhbmdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2VVcmw6ICEhcmVwbGFjZVVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgbWFwKCh0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRSb3V0ZXJTdGF0ZSA9IGNyZWF0ZVJvdXRlclN0YXRlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3ksIHQudGFyZ2V0U25hcHNob3QhLCB0LmN1cnJlbnRSb3V0ZXJTdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoey4uLnQsIHRhcmdldFJvdXRlclN0YXRlfSk7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgLyogT25jZSBoZXJlLCB3ZSBhcmUgYWJvdXQgdG8gYWN0aXZhdGUgc3luY3Jvbm91c2x5LiBUaGUgYXNzdW1wdGlvbiBpcyB0aGlzXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWxsIHN1Y2NlZWQsIGFuZCB1c2VyIGNvZGUgbWF5IHJlYWQgZnJvbSB0aGUgUm91dGVyIHNlcnZpY2UuIFRoZXJlZm9yZVxuICAgICAgICAgICAgICAgICAgICAgICAgYmVmb3JlIGFjdGl2YXRpb24sIHdlIG5lZWQgdG8gdXBkYXRlIHJvdXRlciBwcm9wZXJ0aWVzIHN0b3JpbmcgdGhlIGN1cnJlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIFVSTCBhbmQgdGhlIFJvdXRlclN0YXRlLCBhcyB3ZWxsIGFzIHVwZGF0ZWQgdGhlIGJyb3dzZXIgVVJMLiBBbGwgdGhpcyBzaG91bGRcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhcHBlbiAqYmVmb3JlKiBhY3RpdmF0aW5nLiAqL1xuICAgICAgICAgICAgICAgICAgICAgdGFwKCh0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gdC51cmxBZnRlclJlZGlyZWN0cztcbiAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yYXdVcmxUcmVlID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB0LnJhd1VybCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMge3JvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZX0pLnJvdXRlclN0YXRlID0gdC50YXJnZXRSb3V0ZXJTdGF0ZSE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdkZWZlcnJlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXQuZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHRoaXMucmF3VXJsVHJlZSwgdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0LnVybEFmdGVyUmVkaXJlY3RzO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgYWN0aXZhdGVSb3V0ZXMoXG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb290Q29udGV4dHMsIHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LFxuICAgICAgICAgICAgICAgICAgICAgICAgIChldnQ6IEV2ZW50KSA9PiB0aGlzLnRyaWdnZXJFdmVudChldnQpKSxcblxuICAgICAgICAgICAgICAgICAgICAgdGFwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgbmV4dCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgIGZpbmFsaXplKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgLyogV2hlbiB0aGUgbmF2aWdhdGlvbiBzdHJlYW0gZmluaXNoZXMgZWl0aGVyIHRocm91Z2ggZXJyb3Igb3Igc3VjY2Vzcywgd2VcbiAgICAgICAgICAgICAgICAgICAgICAgICogc2V0IHRoZSBgY29tcGxldGVkYCBvciBgZXJyb3JlZGAgZmxhZy4gSG93ZXZlciwgdGhlcmUgYXJlIHNvbWUgc2l0dWF0aW9uc1xuICAgICAgICAgICAgICAgICAgICAgICAgKiB3aGVyZSB3ZSBjb3VsZCBnZXQgaGVyZSB3aXRob3V0IGVpdGhlciBvZiB0aG9zZSBiZWluZyBzZXQuIEZvciBpbnN0YW5jZSwgYVxuICAgICAgICAgICAgICAgICAgICAgICAgKiByZWRpcmVjdCBkdXJpbmcgTmF2aWdhdGlvblN0YXJ0LiBUaGVyZWZvcmUsIHRoaXMgaXMgYSBjYXRjaC1hbGwgdG8gbWFrZVxuICAgICAgICAgICAgICAgICAgICAgICAgKiBzdXJlIHRoZSBOYXZpZ2F0aW9uQ2FuY2VsXG4gICAgICAgICAgICAgICAgICAgICAgICAqIGV2ZW50IGlzIGZpcmVkIHdoZW4gYSBuYXZpZ2F0aW9uIGdldHMgY2FuY2VsbGVkIGJ1dCBub3QgY2F1Z2h0IGJ5IG90aGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAqIG1lYW5zLiAqL1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbXBsZXRlZCAmJiAhZXJyb3JlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhbmNlbGF0aW9uUmVhc29uID0gYE5hdmlnYXRpb24gSUQgJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5pZH0gaXMgbm90IGVxdWFsIHRvIHRoZSBjdXJyZW50IG5hdmlnYXRpb24gaWQgJHt0aGlzLm5hdmlnYXRpb25JZH1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdyZXBsYWNlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTXVzdCByZXNldCB0byBjdXJyZW50IFVSTCB0cmVlIGhlcmUgdG8gZW5zdXJlIGhpc3Rvcnkuc3RhdGUgaXMgc2V0LiBPblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYSBmcmVzaCBwYWdlIGxvYWQsIGlmIGEgbmV3IG5hdmlnYXRpb24gY29tZXMgaW4gYmVmb3JlIGEgc3VjY2Vzc2Z1bFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmF2aWdhdGlvbiBjb21wbGV0ZXMsIHRoZXJlIHdpbGwgYmUgbm90aGluZyBpblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGlzdG9yeS5zdGF0ZS5uYXZpZ2F0aW9uSWQuIFRoaXMgY2FuIGNhdXNlIHN5bmMgcHJvYmxlbXMgd2l0aFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQW5ndWxhckpTIHN5bmMgY29kZSB3aGljaCBsb29rcyBmb3IgYSB2YWx1ZSBoZXJlIGluIG9yZGVyIHRvIGRldGVybWluZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2hldGhlciBvciBub3QgdG8gaGFuZGxlIGEgZ2l2ZW4gcG9wc3RhdGUgZXZlbnQgb3IgdG8gbGVhdmUgaXQgdG8gdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBbmd1bGFyIHJvdXRlci5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZUhpc3RvcnkodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbE5hdmlnYXRpb25UcmFuc2l0aW9uKHQsIGNhbmNlbGF0aW9uUmVhc29uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2UgY2Fubm90IHRyaWdnZXIgYSBgbG9jYXRpb24uaGlzdG9yeUdvYCBpZiB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNhbmNlbGxhdGlvbiB3YXMgZHVlIHRvIGEgbmV3IG5hdmlnYXRpb24gYmVmb3JlIHRoZSBwcmV2aW91cyBjb3VsZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29tcGxldGUuIFRoaXMgaXMgYmVjYXVzZSBgbG9jYXRpb24uaGlzdG9yeUdvYCB0cmlnZ2VycyBhIGBwb3BzdGF0ZWBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdoaWNoIHdvdWxkIGFsc28gdHJpZ2dlciBhbm90aGVyIG5hdmlnYXRpb24uIEluc3RlYWQsIHRyZWF0IHRoaXMgYXMgYVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVkaXJlY3QgYW5kIGRvIG5vdCByZXNldCB0aGUgc3RhdGUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbE5hdmlnYXRpb25UcmFuc2l0aW9uKHQsIGNhbmNlbGF0aW9uUmVhc29uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRPRE8oYXRzY290dCk6IFRoZSBzYW1lIHByb2JsZW0gaGFwcGVucyBoZXJlIHdpdGggYSBmcmVzaCBwYWdlIGxvYWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFuZCBhIG5ldyBuYXZpZ2F0aW9uIGJlZm9yZSB0aGF0IGNvbXBsZXRlcyB3aGVyZSB3ZSB3b24ndCBzZXQgYSBwYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpZC5cbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgLy8gY3VycmVudE5hdmlnYXRpb24gc2hvdWxkIGFsd2F5cyBiZSByZXNldCB0byBudWxsIGhlcmUuIElmIG5hdmlnYXRpb24gd2FzXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHN1Y2Nlc3NmdWwsIGxhc3RTdWNjZXNzZnVsVHJhbnNpdGlvbiB3aWxsIGhhdmUgYWxyZWFkeSBiZWVuIHNldC4gVGhlcmVmb3JlXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIGNhbiBzYWZlbHkgc2V0IGN1cnJlbnROYXZpZ2F0aW9uIHRvIG51bGwgaGVyZS5cbiAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmF2aWdhdGlvbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgIGNhdGNoRXJyb3IoKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETyhhdHNjb3R0KTogVGhlIE5hdmlnYXRpb25UcmFuc2l0aW9uIGB0YCB1c2VkIGhlcmUgZG9lcyBub3QgYWNjdXJhdGVseVxuICAgICAgICAgICAgICAgICAgICAgICAvLyByZWZsZWN0IHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSB3aG9sZSB0cmFuc2l0aW9uIGJlY2F1c2Ugc29tZSBvcGVyYXRpb25zXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHJldHVybiBhIG5ldyBvYmplY3QgcmF0aGVyIHRoYW4gbW9kaWZ5aW5nIHRoZSBvbmUgaW4gdGhlIG91dGVybW9zdFxuICAgICAgICAgICAgICAgICAgICAgICAvLyBgc3dpdGNoTWFwYC5cbiAgICAgICAgICAgICAgICAgICAgICAgLy8gIFRoZSBmaXggY2FuIGxpa2VseSBiZSB0bzpcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gIDEuIFJlbmFtZSB0aGUgb3V0ZXIgYHRgIHZhcmlhYmxlIHNvIGl0J3Mgbm90IHNoYWRvd2VkIGFsbCB0aGUgdGltZSBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gIGNvbmZ1c2luZ1xuICAgICAgICAgICAgICAgICAgICAgICAvLyAgMi4gS2VlcCByZWFzc2lnbmluZyB0byB0aGUgb3V0ZXIgdmFyaWFibGUgYWZ0ZXIgZWFjaCBzdGFnZSB0byBlbnN1cmUgaXRcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gIGdldHMgdXBkYXRlZC4gT3IgY2hhbmdlIHRoZSBpbXBsZW1lbnRhdGlvbnMgdG8gbm90IHJldHVybiBhIGNvcHkuXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIE5vdCBjaGFuZ2VkIHlldCBiZWNhdXNlIGl0IGFmZmVjdHMgZXhpc3RpbmcgY29kZSBhbmQgd291bGQgbmVlZCB0byBiZVxuICAgICAgICAgICAgICAgICAgICAgICAvLyB0ZXN0ZWQgbW9yZSB0aG9yb3VnaGx5LlxuICAgICAgICAgICAgICAgICAgICAgICBlcnJvcmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgLyogVGhpcyBlcnJvciB0eXBlIGlzIGlzc3VlZCBkdXJpbmcgUmVkaXJlY3QsIGFuZCBpcyBoYW5kbGVkIGFzIGFcbiAgICAgICAgICAgICAgICAgICAgICAgICogY2FuY2VsbGF0aW9uIHJhdGhlciB0aGFuIGFuIGVycm9yLiAqL1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWRpcmVjdGluZyA9IGlzVXJsVHJlZShlLnVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWRpcmVjdGluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHByb3BlcnR5IG9ubHkgaWYgd2UncmUgbm90IHJlZGlyZWN0aW5nLiBJZiB3ZSBsYW5kZWQgb24gYSBwYWdlIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVkaXJlY3QgdG8gYC9gIHJvdXRlLCB0aGUgbmV3IG5hdmlnYXRpb24gaXMgZ29pbmcgdG8gc2VlIHRoZSBgL2BcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlzbid0IGEgY2hhbmdlIGZyb20gdGhlIGRlZmF1bHQgY3VycmVudFVybFRyZWUgYW5kIHdvbid0IG5hdmlnYXRlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBvbmx5IGFwcGxpY2FibGUgd2l0aCBpbml0aWFsIG5hdmlnYXRpb24sIHNvIHNldHRpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGBuYXZpZ2F0ZWRgIG9ubHkgd2hlbiBub3QgcmVkaXJlY3RpbmcgcmVzb2x2ZXMgdGhpcyBzY2VuYXJpby5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZUhpc3RvcnkodCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdkNhbmNlbCA9IG5ldyBOYXZpZ2F0aW9uQ2FuY2VsKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIGUubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdkNhbmNlbCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIHJlZGlyZWN0aW5nLCB3ZSBuZWVkIHRvIGRlbGF5IHJlc29sdmluZyB0aGUgbmF2aWdhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHByb21pc2UgYW5kIHB1c2ggaXQgdG8gdGhlIHJlZGlyZWN0IG5hdmlnYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJlZGlyZWN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlc29sdmUoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzZXRUaW1lb3V0IGlzIHJlcXVpcmVkIHNvIHRoaXMgbmF2aWdhdGlvbiBmaW5pc2hlcyB3aXRoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGUgcmV0dXJuIEVNUFRZIGJlbG93LiBJZiBpdCBpc24ndCBhbGxvd2VkIHRvIGZpbmlzaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHJvY2Vzc2luZywgdGhlcmUgY2FuIGJlIG11bHRpcGxlIG5hdmlnYXRpb25zIHRvIHRoZSBzYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVUkwuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVyZ2VkVHJlZSA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UoZS51cmwsIHRoaXMucmF3VXJsVHJlZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4dHJhcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBza2lwTG9jYXRpb25DaGFuZ2U6IHQuZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgVVJMIGlzIGFscmVhZHkgdXBkYXRlZCBhdCB0aGlzIHBvaW50IGlmIHdlIGhhdmUgJ2VhZ2VyJyBVUkxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGVzIG9yIGlmIHRoZSBuYXZpZ2F0aW9uIHdhcyB0cmlnZ2VyZWQgYnkgdGhlIGJyb3dzZXIgKGJhY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBidXR0b24sIFVSTCBiYXIsIGV0YykuIFdlIHdhbnQgdG8gcmVwbGFjZSB0aGF0IGl0ZW0gaW4gaGlzdG9yeSBpZlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBuYXZpZ2F0aW9uIGlzIHJlamVjdGVkLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2VVcmw6IHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcicgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNCcm93c2VyVHJpZ2dlcmVkTmF2aWdhdGlvbih0LnNvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lcmdlZFRyZWUsICdpbXBlcmF0aXZlJywgbnVsbCwgZXh0cmFzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3Jlc29sdmU6IHQucmVzb2x2ZSwgcmVqZWN0OiB0LnJlamVjdCwgcHJvbWlzZTogdC5wcm9taXNlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAvKiBBbGwgb3RoZXIgZXJyb3JzIHNob3VsZCByZXNldCB0byB0aGUgcm91dGVyJ3MgaW50ZXJuYWwgVVJMIHJlZmVyZW5jZSB0b1xuICAgICAgICAgICAgICAgICAgICAgICAgICAqIHRoZSBwcmUtZXJyb3Igc3RhdGUuICovXG4gICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXN0b3JlSGlzdG9yeSh0LCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuYXZFcnJvciA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOYXZpZ2F0aW9uRXJyb3IodC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCBlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2RXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlc29sdmUodGhpcy5lcnJvckhhbmRsZXIoZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlamVjdChlZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgLy8gVE9ETyhqYXNvbmFkZW4pOiByZW1vdmUgY2FzdCBvbmNlIGczIGlzIG9uIHVwZGF0ZWQgVHlwZVNjcmlwdFxuICAgICAgICAgICAgICAgfSkpIGFzIGFueSBhcyBPYnNlcnZhYmxlPE5hdmlnYXRpb25UcmFuc2l0aW9uPjtcbiAgfVxuXG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICogVE9ETzogdGhpcyBzaG91bGQgYmUgcmVtb3ZlZCBvbmNlIHRoZSBjb25zdHJ1Y3RvciBvZiB0aGUgcm91dGVyIG1hZGUgaW50ZXJuYWxcbiAgICovXG4gIHJlc2V0Um9vdENvbXBvbmVudFR5cGUocm9vdENvbXBvbmVudFR5cGU6IFR5cGU8YW55Pik6IHZvaWQge1xuICAgIHRoaXMucm9vdENvbXBvbmVudFR5cGUgPSByb290Q29tcG9uZW50VHlwZTtcbiAgICAvLyBUT0RPOiB2c2F2a2luIHJvdXRlciA0LjAgc2hvdWxkIG1ha2UgdGhlIHJvb3QgY29tcG9uZW50IHNldCB0byBudWxsXG4gICAgLy8gdGhpcyB3aWxsIHNpbXBsaWZ5IHRoZSBsaWZlY3ljbGUgb2YgdGhlIHJvdXRlci5cbiAgICB0aGlzLnJvdXRlclN0YXRlLnJvb3QuY29tcG9uZW50ID0gdGhpcy5yb290Q29tcG9uZW50VHlwZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VHJhbnNpdGlvbigpOiBOYXZpZ2F0aW9uVHJhbnNpdGlvbiB7XG4gICAgY29uc3QgdHJhbnNpdGlvbiA9IHRoaXMudHJhbnNpdGlvbnMudmFsdWU7XG4gICAgLy8gVGhpcyB2YWx1ZSBuZWVkcyB0byBiZSBzZXQuIE90aGVyIHZhbHVlcyBzdWNoIGFzIGV4dHJhY3RlZFVybCBhcmUgc2V0IG9uIGluaXRpYWwgbmF2aWdhdGlvblxuICAgIC8vIGJ1dCB0aGUgdXJsQWZ0ZXJSZWRpcmVjdHMgbWF5IG5vdCBnZXQgc2V0IGlmIHdlIGFyZW4ndCBwcm9jZXNzaW5nIHRoZSBuZXcgVVJMICphbmQqIG5vdFxuICAgIC8vIHByb2Nlc3NpbmcgdGhlIHByZXZpb3VzIFVSTC5cbiAgICB0cmFuc2l0aW9uLnVybEFmdGVyUmVkaXJlY3RzID0gdGhpcy5icm93c2VyVXJsVHJlZTtcbiAgICByZXR1cm4gdHJhbnNpdGlvbjtcbiAgfVxuXG4gIHByaXZhdGUgc2V0VHJhbnNpdGlvbih0OiBQYXJ0aWFsPE5hdmlnYXRpb25UcmFuc2l0aW9uPik6IHZvaWQge1xuICAgIHRoaXMudHJhbnNpdGlvbnMubmV4dCh7Li4udGhpcy5nZXRUcmFuc2l0aW9uKCksIC4uLnR9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHVwIHRoZSBsb2NhdGlvbiBjaGFuZ2UgbGlzdGVuZXIgYW5kIHBlcmZvcm1zIHRoZSBpbml0aWFsIG5hdmlnYXRpb24uXG4gICAqL1xuICBpbml0aWFsTmF2aWdhdGlvbigpOiB2b2lkIHtcbiAgICB0aGlzLnNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpO1xuICAgIGlmICh0aGlzLm5hdmlnYXRpb25JZCA9PT0gMCkge1xuICAgICAgdGhpcy5uYXZpZ2F0ZUJ5VXJsKHRoaXMubG9jYXRpb24ucGF0aCh0cnVlKSwge3JlcGxhY2VVcmw6IHRydWV9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyLiBUaGlzIGxpc3RlbmVyIGRldGVjdHMgbmF2aWdhdGlvbnMgdHJpZ2dlcmVkIGZyb20gb3V0c2lkZVxuICAgKiB0aGUgUm91dGVyICh0aGUgYnJvd3NlciBiYWNrL2ZvcndhcmQgYnV0dG9ucywgZm9yIGV4YW1wbGUpIGFuZCBzY2hlZHVsZXMgYSBjb3JyZXNwb25kaW5nIFJvdXRlclxuICAgKiBuYXZpZ2F0aW9uIHNvIHRoYXQgdGhlIGNvcnJlY3QgZXZlbnRzLCBndWFyZHMsIGV0Yy4gYXJlIHRyaWdnZXJlZC5cbiAgICovXG4gIHNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpOiB2b2lkIHtcbiAgICAvLyBEb24ndCBuZWVkIHRvIHVzZSBab25lLndyYXAgYW55IG1vcmUsIGJlY2F1c2Ugem9uZS5qc1xuICAgIC8vIGFscmVhZHkgcGF0Y2ggb25Qb3BTdGF0ZSwgc28gbG9jYXRpb24gY2hhbmdlIGNhbGxiYWNrIHdpbGxcbiAgICAvLyBydW4gaW50byBuZ1pvbmVcbiAgICBpZiAoIXRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24gPSB0aGlzLmxvY2F0aW9uLnN1YnNjcmliZShldmVudCA9PiB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRDaGFuZ2UgPSB0aGlzLmV4dHJhY3RMb2NhdGlvbkNoYW5nZUluZm9Gcm9tRXZlbnQoZXZlbnQpO1xuICAgICAgICAvLyBUaGUgYHNldFRpbWVvdXRgIHdhcyBhZGRlZCBpbiAjMTIxNjAgYW5kIGlzIGxpa2VseSB0byBzdXBwb3J0IEFuZ3VsYXIvQW5ndWxhckpTXG4gICAgICAgIC8vIGh5YnJpZCBhcHBzLlxuICAgICAgICBpZiAodGhpcy5zaG91bGRTY2hlZHVsZU5hdmlnYXRpb24odGhpcy5sYXN0TG9jYXRpb25DaGFuZ2VJbmZvLCBjdXJyZW50Q2hhbmdlKSkge1xuICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qge3NvdXJjZSwgc3RhdGUsIHVybFRyZWV9ID0gY3VycmVudENoYW5nZTtcbiAgICAgICAgICAgIGNvbnN0IGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHtyZXBsYWNlVXJsOiB0cnVlfTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSkge1xuICAgICAgICAgICAgICBjb25zdCBzdGF0ZUNvcHkgPSB7Li4uc3RhdGV9IGFzIFBhcnRpYWw8UmVzdG9yZWRTdGF0ZT47XG4gICAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZUNvcHkubmF2aWdhdGlvbklkO1xuICAgICAgICAgICAgICBkZWxldGUgc3RhdGVDb3B5Lsm1cm91dGVyUGFnZUlkO1xuICAgICAgICAgICAgICBpZiAoT2JqZWN0LmtleXMoc3RhdGVDb3B5KS5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICBleHRyYXMuc3RhdGUgPSBzdGF0ZUNvcHk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKHVybFRyZWUsIHNvdXJjZSwgc3RhdGUsIGV4dHJhcyk7XG4gICAgICAgICAgfSwgMCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sYXN0TG9jYXRpb25DaGFuZ2VJbmZvID0gY3VycmVudENoYW5nZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBFeHRyYWN0cyByb3V0ZXItcmVsYXRlZCBpbmZvcm1hdGlvbiBmcm9tIGEgYFBvcFN0YXRlRXZlbnRgLiAqL1xuICBwcml2YXRlIGV4dHJhY3RMb2NhdGlvbkNoYW5nZUluZm9Gcm9tRXZlbnQoY2hhbmdlOiBQb3BTdGF0ZUV2ZW50KTogTG9jYXRpb25DaGFuZ2VJbmZvIHtcbiAgICByZXR1cm4ge1xuICAgICAgc291cmNlOiBjaGFuZ2VbJ3R5cGUnXSA9PT0gJ3BvcHN0YXRlJyA/ICdwb3BzdGF0ZScgOiAnaGFzaGNoYW5nZScsXG4gICAgICB1cmxUcmVlOiB0aGlzLnBhcnNlVXJsKGNoYW5nZVsndXJsJ10hKSxcbiAgICAgIC8vIE5hdmlnYXRpb25zIGNvbWluZyBmcm9tIEFuZ3VsYXIgcm91dGVyIGhhdmUgYSBuYXZpZ2F0aW9uSWQgc3RhdGVcbiAgICAgIC8vIHByb3BlcnR5LiBXaGVuIHRoaXMgZXhpc3RzLCByZXN0b3JlIHRoZSBzdGF0ZS5cbiAgICAgIHN0YXRlOiBjaGFuZ2Uuc3RhdGU/Lm5hdmlnYXRpb25JZCA/IGNoYW5nZS5zdGF0ZSA6IG51bGwsXG4gICAgICB0cmFuc2l0aW9uSWQ6IHRoaXMuZ2V0VHJhbnNpdGlvbigpLmlkXG4gICAgfSBhcyBjb25zdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgdHdvIGV2ZW50cyB0cmlnZ2VyZWQgYnkgdGhlIExvY2F0aW9uIHN1YnNjcmlwdGlvbiBhcmUgZHVlIHRvIHRoZSBzYW1lXG4gICAqIG5hdmlnYXRpb24uIFRoZSBsb2NhdGlvbiBzdWJzY3JpcHRpb24gY2FuIGZpcmUgdHdvIGV2ZW50cyAocG9wc3RhdGUgYW5kIGhhc2hjaGFuZ2UpIGZvciBhXG4gICAqIHNpbmdsZSBuYXZpZ2F0aW9uLiBUaGUgc2Vjb25kIG9uZSBzaG91bGQgYmUgaWdub3JlZCwgdGhhdCBpcywgd2Ugc2hvdWxkIG5vdCBzY2hlZHVsZSBhbm90aGVyXG4gICAqIG5hdmlnYXRpb24gaW4gdGhlIFJvdXRlci5cbiAgICovXG4gIHByaXZhdGUgc2hvdWxkU2NoZWR1bGVOYXZpZ2F0aW9uKHByZXZpb3VzOiBMb2NhdGlvbkNoYW5nZUluZm98bnVsbCwgY3VycmVudDogTG9jYXRpb25DaGFuZ2VJbmZvKTpcbiAgICAgIGJvb2xlYW4ge1xuICAgIGlmICghcHJldmlvdXMpIHJldHVybiB0cnVlO1xuXG4gICAgY29uc3Qgc2FtZURlc3RpbmF0aW9uID0gY3VycmVudC51cmxUcmVlLnRvU3RyaW5nKCkgPT09IHByZXZpb3VzLnVybFRyZWUudG9TdHJpbmcoKTtcbiAgICBjb25zdCBldmVudHNPY2N1cnJlZEF0U2FtZVRpbWUgPSBjdXJyZW50LnRyYW5zaXRpb25JZCA9PT0gcHJldmlvdXMudHJhbnNpdGlvbklkO1xuICAgIGlmICghZXZlbnRzT2NjdXJyZWRBdFNhbWVUaW1lIHx8ICFzYW1lRGVzdGluYXRpb24pIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmICgoY3VycmVudC5zb3VyY2UgPT09ICdoYXNoY2hhbmdlJyAmJiBwcmV2aW91cy5zb3VyY2UgPT09ICdwb3BzdGF0ZScpIHx8XG4gICAgICAgIChjdXJyZW50LnNvdXJjZSA9PT0gJ3BvcHN0YXRlJyAmJiBwcmV2aW91cy5zb3VyY2UgPT09ICdoYXNoY2hhbmdlJykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKiBUaGUgY3VycmVudCBVUkwuICovXG4gIGdldCB1cmwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5zZXJpYWxpemVVcmwodGhpcy5jdXJyZW50VXJsVHJlZSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgY3VycmVudCBgTmF2aWdhdGlvbmAgb2JqZWN0IHdoZW4gdGhlIHJvdXRlciBpcyBuYXZpZ2F0aW5nLFxuICAgKiBhbmQgYG51bGxgIHdoZW4gaWRsZS5cbiAgICovXG4gIGdldEN1cnJlbnROYXZpZ2F0aW9uKCk6IE5hdmlnYXRpb258bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuY3VycmVudE5hdmlnYXRpb247XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIHRyaWdnZXJFdmVudChldmVudDogRXZlbnQpOiB2b2lkIHtcbiAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pLm5leHQoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0cyB0aGUgcm91dGUgY29uZmlndXJhdGlvbiB1c2VkIGZvciBuYXZpZ2F0aW9uIGFuZCBnZW5lcmF0aW5nIGxpbmtzLlxuICAgKlxuICAgKiBAcGFyYW0gY29uZmlnIFRoZSByb3V0ZSBhcnJheSBmb3IgdGhlIG5ldyBjb25maWd1cmF0aW9uLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLnJlc2V0Q29uZmlnKFtcbiAgICogIHsgcGF0aDogJ3RlYW0vOmlkJywgY29tcG9uZW50OiBUZWFtQ21wLCBjaGlsZHJlbjogW1xuICAgKiAgICB7IHBhdGg6ICdzaW1wbGUnLCBjb21wb25lbnQ6IFNpbXBsZUNtcCB9LFxuICAgKiAgICB7IHBhdGg6ICd1c2VyLzpuYW1lJywgY29tcG9uZW50OiBVc2VyQ21wIH1cbiAgICogIF19XG4gICAqIF0pO1xuICAgKiBgYGBcbiAgICovXG4gIHJlc2V0Q29uZmlnKGNvbmZpZzogUm91dGVzKTogdm9pZCB7XG4gICAgdmFsaWRhdGVDb25maWcoY29uZmlnKTtcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZy5tYXAoc3RhbmRhcmRpemVDb25maWcpO1xuICAgIHRoaXMubmF2aWdhdGVkID0gZmFsc2U7XG4gICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bElkID0gLTE7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuZGlzcG9zZSgpO1xuICB9XG5cbiAgLyoqIERpc3Bvc2VzIG9mIHRoZSByb3V0ZXIuICovXG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgdGhpcy50cmFuc2l0aW9ucy5jb21wbGV0ZSgpO1xuICAgIGlmICh0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICB0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB0aGlzLmRpc3Bvc2VkID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBlbmRzIFVSTCBzZWdtZW50cyB0byB0aGUgY3VycmVudCBVUkwgdHJlZSB0byBjcmVhdGUgYSBuZXcgVVJMIHRyZWUuXG4gICAqXG4gICAqIEBwYXJhbSBjb21tYW5kcyBBbiBhcnJheSBvZiBVUkwgZnJhZ21lbnRzIHdpdGggd2hpY2ggdG8gY29uc3RydWN0IHRoZSBuZXcgVVJMIHRyZWUuXG4gICAqIElmIHRoZSBwYXRoIGlzIHN0YXRpYywgY2FuIGJlIHRoZSBsaXRlcmFsIFVSTCBzdHJpbmcuIEZvciBhIGR5bmFtaWMgcGF0aCwgcGFzcyBhbiBhcnJheSBvZiBwYXRoXG4gICAqIHNlZ21lbnRzLCBmb2xsb3dlZCBieSB0aGUgcGFyYW1ldGVycyBmb3IgZWFjaCBzZWdtZW50LlxuICAgKiBUaGUgZnJhZ21lbnRzIGFyZSBhcHBsaWVkIHRvIHRoZSBjdXJyZW50IFVSTCB0cmVlIG9yIHRoZSBvbmUgcHJvdmlkZWQgIGluIHRoZSBgcmVsYXRpdmVUb2BcbiAgICogcHJvcGVydHkgb2YgdGhlIG9wdGlvbnMgb2JqZWN0LCBpZiBzdXBwbGllZC5cbiAgICogQHBhcmFtIG5hdmlnYXRpb25FeHRyYXMgT3B0aW9ucyB0aGF0IGNvbnRyb2wgdGhlIG5hdmlnYXRpb24gc3RyYXRlZ3kuXG4gICAqIEByZXR1cm5zIFRoZSBuZXcgVVJMIHRyZWUuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvdXNlci8xMVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzO2V4cGFuZD10cnVlL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7ZXhwYW5kOiB0cnVlfSwgJ3VzZXInLCAxMV0pO1xuICAgKlxuICAgKiAvLyB5b3UgY2FuIGNvbGxhcHNlIHN0YXRpYyBzZWdtZW50cyBsaWtlIHRoaXMgKHRoaXMgd29ya3Mgb25seSB3aXRoIHRoZSBmaXJzdCBwYXNzZWQtaW4gdmFsdWUpOlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtLzMzL3VzZXInLCB1c2VySWRdKTtcbiAgICpcbiAgICogLy8gSWYgdGhlIGZpcnN0IHNlZ21lbnQgY2FuIGNvbnRhaW4gc2xhc2hlcywgYW5kIHlvdSBkbyBub3Qgd2FudCB0aGUgcm91dGVyIHRvIHNwbGl0IGl0LFxuICAgKiAvLyB5b3UgY2FuIGRvIHRoZSBmb2xsb3dpbmc6XG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFt7c2VnbWVudFBhdGg6ICcvb25lL3R3byd9XSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMy8odXNlci8xMS8vcmlnaHQ6Y2hhdClcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6ICdjaGF0J319XSk7XG4gICAqXG4gICAqIC8vIHJlbW92ZSB0aGUgcmlnaHQgc2Vjb25kYXJ5IG5vZGVcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6IG51bGx9fV0pO1xuICAgKlxuICAgKiAvLyBhc3N1bWluZyB0aGUgY3VycmVudCB1cmwgaXMgYC90ZWFtLzMzL3VzZXIvMTFgIGFuZCB0aGUgcm91dGUgcG9pbnRzIHRvIGB1c2VyLzExYFxuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzExL2RldGFpbHNcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWydkZXRhaWxzJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzQ0L3VzZXIvMjJcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycuLi8uLi90ZWFtLzQ0L3VzZXIvMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIE5vdGUgdGhhdCBhIHZhbHVlIG9mIGBudWxsYCBvciBgdW5kZWZpbmVkYCBmb3IgYHJlbGF0aXZlVG9gIGluZGljYXRlcyB0aGF0IHRoZVxuICAgKiB0cmVlIHNob3VsZCBiZSBjcmVhdGVkIHJlbGF0aXZlIHRvIHRoZSByb290LlxuICAgKiBgYGBcbiAgICovXG4gIGNyZWF0ZVVybFRyZWUoY29tbWFuZHM6IGFueVtdLCBuYXZpZ2F0aW9uRXh0cmFzOiBVcmxDcmVhdGlvbk9wdGlvbnMgPSB7fSk6IFVybFRyZWUge1xuICAgIGNvbnN0IHtyZWxhdGl2ZVRvLCBxdWVyeVBhcmFtcywgZnJhZ21lbnQsIHF1ZXJ5UGFyYW1zSGFuZGxpbmcsIHByZXNlcnZlRnJhZ21lbnR9ID1cbiAgICAgICAgbmF2aWdhdGlvbkV4dHJhcztcbiAgICBjb25zdCBhID0gcmVsYXRpdmVUbyB8fCB0aGlzLnJvdXRlclN0YXRlLnJvb3Q7XG4gICAgY29uc3QgZiA9IHByZXNlcnZlRnJhZ21lbnQgPyB0aGlzLmN1cnJlbnRVcmxUcmVlLmZyYWdtZW50IDogZnJhZ21lbnQ7XG4gICAgbGV0IHE6IFBhcmFtc3xudWxsID0gbnVsbDtcbiAgICBzd2l0Y2ggKHF1ZXJ5UGFyYW1zSGFuZGxpbmcpIHtcbiAgICAgIGNhc2UgJ21lcmdlJzpcbiAgICAgICAgcSA9IHsuLi50aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zLCAuLi5xdWVyeVBhcmFtc307XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncHJlc2VydmUnOlxuICAgICAgICBxID0gdGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcztcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBxID0gcXVlcnlQYXJhbXMgfHwgbnVsbDtcbiAgICB9XG4gICAgaWYgKHEgIT09IG51bGwpIHtcbiAgICAgIHEgPSB0aGlzLnJlbW92ZUVtcHR5UHJvcHMocSk7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVVcmxUcmVlKGEsIHRoaXMuY3VycmVudFVybFRyZWUsIGNvbW1hbmRzLCBxLCBmID8/IG51bGwpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlcyB0byBhIHZpZXcgdXNpbmcgYW4gYWJzb2x1dGUgcm91dGUgcGF0aC5cbiAgICpcbiAgICogQHBhcmFtIHVybCBBbiBhYnNvbHV0ZSBwYXRoIGZvciBhIGRlZmluZWQgcm91dGUuIFRoZSBmdW5jdGlvbiBkb2VzIG5vdCBhcHBseSBhbnkgZGVsdGEgdG8gdGhlXG4gICAqICAgICBjdXJyZW50IFVSTC5cbiAgICogQHBhcmFtIGV4dHJhcyBBbiBvYmplY3QgY29udGFpbmluZyBwcm9wZXJ0aWVzIHRoYXQgbW9kaWZ5IHRoZSBuYXZpZ2F0aW9uIHN0cmF0ZWd5LlxuICAgKlxuICAgKiBAcmV0dXJucyBBIFByb21pc2UgdGhhdCByZXNvbHZlcyB0byAndHJ1ZScgd2hlbiBuYXZpZ2F0aW9uIHN1Y2NlZWRzLFxuICAgKiB0byAnZmFsc2UnIHdoZW4gbmF2aWdhdGlvbiBmYWlscywgb3IgaXMgcmVqZWN0ZWQgb24gZXJyb3IuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIFRoZSBmb2xsb3dpbmcgY2FsbHMgcmVxdWVzdCBuYXZpZ2F0aW9uIHRvIGFuIGFic29sdXRlIHBhdGguXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIubmF2aWdhdGVCeVVybChcIi90ZWFtLzMzL3VzZXIvMTFcIik7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTFxuICAgKiByb3V0ZXIubmF2aWdhdGVCeVVybChcIi90ZWFtLzMzL3VzZXIvMTFcIiwgeyBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpXG4gICAqXG4gICAqL1xuICBuYXZpZ2F0ZUJ5VXJsKHVybDogc3RyaW5nfFVybFRyZWUsIGV4dHJhczogTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyA9IHtcbiAgICBza2lwTG9jYXRpb25DaGFuZ2U6IGZhbHNlXG4gIH0pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHxcbiAgICAgICAgbmdEZXZNb2RlICYmIHRoaXMuaXNOZ1pvbmVFbmFibGVkICYmICFOZ1pvbmUuaXNJbkFuZ3VsYXJab25lKCkpIHtcbiAgICAgIHRoaXMuY29uc29sZS53YXJuKFxuICAgICAgICAgIGBOYXZpZ2F0aW9uIHRyaWdnZXJlZCBvdXRzaWRlIEFuZ3VsYXIgem9uZSwgZGlkIHlvdSBmb3JnZXQgdG8gY2FsbCAnbmdab25lLnJ1bigpJz9gKTtcbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gaXNVcmxUcmVlKHVybCkgPyB1cmwgOiB0aGlzLnBhcnNlVXJsKHVybCk7XG4gICAgY29uc3QgbWVyZ2VkVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh1cmxUcmVlLCB0aGlzLnJhd1VybFRyZWUpO1xuXG4gICAgcmV0dXJuIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKG1lcmdlZFRyZWUsICdpbXBlcmF0aXZlJywgbnVsbCwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZSBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgYXJyYXkgb2YgY29tbWFuZHMgYW5kIGEgc3RhcnRpbmcgcG9pbnQuXG4gICAqIElmIG5vIHN0YXJ0aW5nIHJvdXRlIGlzIHByb3ZpZGVkLCB0aGUgbmF2aWdhdGlvbiBpcyBhYnNvbHV0ZS5cbiAgICpcbiAgICogQHBhcmFtIGNvbW1hbmRzIEFuIGFycmF5IG9mIFVSTCBmcmFnbWVudHMgd2l0aCB3aGljaCB0byBjb25zdHJ1Y3QgdGhlIHRhcmdldCBVUkwuXG4gICAqIElmIHRoZSBwYXRoIGlzIHN0YXRpYywgY2FuIGJlIHRoZSBsaXRlcmFsIFVSTCBzdHJpbmcuIEZvciBhIGR5bmFtaWMgcGF0aCwgcGFzcyBhbiBhcnJheSBvZiBwYXRoXG4gICAqIHNlZ21lbnRzLCBmb2xsb3dlZCBieSB0aGUgcGFyYW1ldGVycyBmb3IgZWFjaCBzZWdtZW50LlxuICAgKiBUaGUgZnJhZ21lbnRzIGFyZSBhcHBsaWVkIHRvIHRoZSBjdXJyZW50IFVSTCBvciB0aGUgb25lIHByb3ZpZGVkICBpbiB0aGUgYHJlbGF0aXZlVG9gIHByb3BlcnR5XG4gICAqIG9mIHRoZSBvcHRpb25zIG9iamVjdCwgaWYgc3VwcGxpZWQuXG4gICAqIEBwYXJhbSBleHRyYXMgQW4gb3B0aW9ucyBvYmplY3QgdGhhdCBkZXRlcm1pbmVzIGhvdyB0aGUgVVJMIHNob3VsZCBiZSBjb25zdHJ1Y3RlZCBvclxuICAgKiAgICAgaW50ZXJwcmV0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGB0cnVlYCB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsIHRvIGBmYWxzZWAgd2hlbiBuYXZpZ2F0aW9uXG4gICAqICAgICBmYWlscyxcbiAgICogb3IgaXMgcmVqZWN0ZWQgb24gZXJyb3IuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIFRoZSBmb2xsb3dpbmcgY2FsbHMgcmVxdWVzdCBuYXZpZ2F0aW9uIHRvIGEgZHluYW1pYyByb3V0ZSBwYXRoIHJlbGF0aXZlIHRvIHRoZSBjdXJyZW50IFVSTC5cbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZShbJ3RlYW0nLCAzMywgJ3VzZXInLCAxMV0sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBOYXZpZ2F0ZSB3aXRob3V0IHVwZGF0aW5nIHRoZSBVUkwsIG92ZXJyaWRpbmcgdGhlIGRlZmF1bHQgYmVoYXZpb3JcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlLCBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWV9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRlcilcbiAgICpcbiAgICovXG4gIG5hdmlnYXRlKGNvbW1hbmRzOiBhbnlbXSwgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3NraXBMb2NhdGlvbkNoYW5nZTogZmFsc2V9KTpcbiAgICAgIFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHMpO1xuICAgIHJldHVybiB0aGlzLm5hdmlnYXRlQnlVcmwodGhpcy5jcmVhdGVVcmxUcmVlKGNvbW1hbmRzLCBleHRyYXMpLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqIFNlcmlhbGl6ZXMgYSBgVXJsVHJlZWAgaW50byBhIHN0cmluZyAqL1xuICBzZXJpYWxpemVVcmwodXJsOiBVcmxUcmVlKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICB9XG5cbiAgLyoqIFBhcnNlcyBhIHN0cmluZyBpbnRvIGEgYFVybFRyZWVgICovXG4gIHBhcnNlVXJsKHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gICAgbGV0IHVybFRyZWU6IFVybFRyZWU7XG4gICAgdHJ5IHtcbiAgICAgIHVybFRyZWUgPSB0aGlzLnVybFNlcmlhbGl6ZXIucGFyc2UodXJsKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB1cmxUcmVlID0gdGhpcy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIoZSwgdGhpcy51cmxTZXJpYWxpemVyLCB1cmwpO1xuICAgIH1cbiAgICByZXR1cm4gdXJsVHJlZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHdoZXRoZXIgdGhlIHVybCBpcyBhY3RpdmF0ZWQuXG4gICAqXG4gICAqIEBkZXByZWNhdGVkXG4gICAqIFVzZSBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIGluc3RlYWQuXG4gICAqXG4gICAqIC0gVGhlIGVxdWl2YWxlbnQgYElzQWN0aXZlTWF0Y2hPcHRpb25zYCBmb3IgYHRydWVgIGlzXG4gICAqIGB7cGF0aHM6ICdleGFjdCcsIHF1ZXJ5UGFyYW1zOiAnZXhhY3QnLCBmcmFnbWVudDogJ2lnbm9yZWQnLCBtYXRyaXhQYXJhbXM6ICdpZ25vcmVkJ31gLlxuICAgKiAtIFRoZSBlcXVpdmFsZW50IGZvciBgZmFsc2VgIGlzXG4gICAqIGB7cGF0aHM6ICdzdWJzZXQnLCBxdWVyeVBhcmFtczogJ3N1YnNldCcsIGZyYWdtZW50OiAnaWdub3JlZCcsIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnfWAuXG4gICAqL1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBleGFjdDogYm9vbGVhbik6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBSZXR1cm5zIHdoZXRoZXIgdGhlIHVybCBpcyBhY3RpdmF0ZWQuXG4gICAqL1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBtYXRjaE9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zKTogYm9vbGVhbjtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBtYXRjaE9wdGlvbnM6IGJvb2xlYW58SXNBY3RpdmVNYXRjaE9wdGlvbnMpOiBib29sZWFuO1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBtYXRjaE9wdGlvbnM6IGJvb2xlYW58SXNBY3RpdmVNYXRjaE9wdGlvbnMpOiBib29sZWFuIHtcbiAgICBsZXQgb3B0aW9uczogSXNBY3RpdmVNYXRjaE9wdGlvbnM7XG4gICAgaWYgKG1hdGNoT3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucyA9IHsuLi5leGFjdE1hdGNoT3B0aW9uc307XG4gICAgfSBlbHNlIGlmIChtYXRjaE9wdGlvbnMgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zID0gey4uLnN1YnNldE1hdGNoT3B0aW9uc307XG4gICAgfSBlbHNlIHtcbiAgICAgIG9wdGlvbnMgPSBtYXRjaE9wdGlvbnM7XG4gICAgfVxuICAgIGlmIChpc1VybFRyZWUodXJsKSkge1xuICAgICAgcmV0dXJuIGNvbnRhaW5zVHJlZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB1cmwsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGNvbnN0IHVybFRyZWUgPSB0aGlzLnBhcnNlVXJsKHVybCk7XG4gICAgcmV0dXJuIGNvbnRhaW5zVHJlZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB1cmxUcmVlLCBvcHRpb25zKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVtb3ZlRW1wdHlQcm9wcyhwYXJhbXM6IFBhcmFtcyk6IFBhcmFtcyB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHBhcmFtcykucmVkdWNlKChyZXN1bHQ6IFBhcmFtcywga2V5OiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlOiBhbnkgPSBwYXJhbXNba2V5XTtcbiAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sIHt9KTtcbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc05hdmlnYXRpb25zKCk6IHZvaWQge1xuICAgIHRoaXMubmF2aWdhdGlvbnMuc3Vic2NyaWJlKFxuICAgICAgICB0ID0+IHtcbiAgICAgICAgICB0aGlzLm5hdmlnYXRlZCA9IHRydWU7XG4gICAgICAgICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bElkID0gdC5pZDtcbiAgICAgICAgICB0aGlzLmN1cnJlbnRQYWdlSWQgPSB0LnRhcmdldFBhZ2VJZDtcbiAgICAgICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgICAgIC5uZXh0KG5ldyBOYXZpZ2F0aW9uRW5kKFxuICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCB0aGlzLnNlcmlhbGl6ZVVybCh0aGlzLmN1cnJlbnRVcmxUcmVlKSkpO1xuICAgICAgICAgIHRoaXMubGFzdFN1Y2Nlc3NmdWxOYXZpZ2F0aW9uID0gdGhpcy5jdXJyZW50TmF2aWdhdGlvbjtcbiAgICAgICAgICB0LnJlc29sdmUodHJ1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGUgPT4ge1xuICAgICAgICAgIHRoaXMuY29uc29sZS53YXJuKGBVbmhhbmRsZWQgTmF2aWdhdGlvbiBFcnJvcjogJHtlfWApO1xuICAgICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2NoZWR1bGVOYXZpZ2F0aW9uKFxuICAgICAgcmF3VXJsOiBVcmxUcmVlLCBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLCByZXN0b3JlZFN0YXRlOiBSZXN0b3JlZFN0YXRlfG51bGwsXG4gICAgICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMsXG4gICAgICBwcmlvclByb21pc2U/OiB7cmVzb2x2ZTogYW55LCByZWplY3Q6IGFueSwgcHJvbWlzZTogUHJvbWlzZTxib29sZWFuPn0pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShmYWxzZSk7XG4gICAgfVxuXG4gICAgLy8gKiBJbXBlcmF0aXZlIG5hdmlnYXRpb25zIChyb3V0ZXIubmF2aWdhdGUpIG1pZ2h0IHRyaWdnZXIgYWRkaXRpb25hbCBuYXZpZ2F0aW9ucyB0byB0aGUgc2FtZVxuICAgIC8vICAgVVJMIHZpYSBhIHBvcHN0YXRlIGV2ZW50IGFuZCB0aGUgbG9jYXRpb25DaGFuZ2VMaXN0ZW5lci4gV2Ugc2hvdWxkIHNraXAgdGhlc2UgZHVwbGljYXRlXG4gICAgLy8gICBuYXZzLiBEdXBsaWNhdGVzIG1heSBhbHNvIGJlIHRyaWdnZXJlZCBieSBhdHRlbXB0cyB0byBzeW5jIEFuZ3VsYXJKUyBhbmQgQW5ndWxhciByb3V0ZXJcbiAgICAvLyAgIHN0YXRlcy5cbiAgICAvLyAqIEltcGVyYXRpdmUgbmF2aWdhdGlvbnMgY2FuIGJlIGNhbmNlbGxlZCBieSByb3V0ZXIgZ3VhcmRzLCBtZWFuaW5nIHRoZSBVUkwgd29uJ3QgY2hhbmdlLiBJZlxuICAgIC8vICAgdGhlIHVzZXIgZm9sbG93cyB0aGF0IHdpdGggYSBuYXZpZ2F0aW9uIHVzaW5nIHRoZSBiYWNrL2ZvcndhcmQgYnV0dG9uIG9yIG1hbnVhbCBVUkwgY2hhbmdlLFxuICAgIC8vICAgdGhlIGRlc3RpbmF0aW9uIG1heSBiZSB0aGUgc2FtZSBhcyB0aGUgcHJldmlvdXMgaW1wZXJhdGl2ZSBhdHRlbXB0LiBXZSBzaG91bGQgbm90IHNraXBcbiAgICAvLyAgIHRoZXNlIG5hdmlnYXRpb25zIGJlY2F1c2UgaXQncyBhIHNlcGFyYXRlIGNhc2UgZnJvbSB0aGUgb25lIGFib3ZlIC0tIGl0J3Mgbm90IGEgZHVwbGljYXRlXG4gICAgLy8gICBuYXZpZ2F0aW9uLlxuICAgIGNvbnN0IGxhc3ROYXZpZ2F0aW9uID0gdGhpcy5nZXRUcmFuc2l0aW9uKCk7XG4gICAgLy8gV2UgZG9uJ3Qgd2FudCB0byBza2lwIGR1cGxpY2F0ZSBzdWNjZXNzZnVsIG5hdnMgaWYgdGhleSdyZSBpbXBlcmF0aXZlIGJlY2F1c2VcbiAgICAvLyBvblNhbWVVcmxOYXZpZ2F0aW9uIGNvdWxkIGJlICdyZWxvYWQnIChzbyB0aGUgZHVwbGljYXRlIGlzIGludGVuZGVkKS5cbiAgICBjb25zdCBicm93c2VyTmF2UHJlY2VkZWRCeVJvdXRlck5hdiA9IGlzQnJvd3NlclRyaWdnZXJlZE5hdmlnYXRpb24oc291cmNlKSAmJiBsYXN0TmF2aWdhdGlvbiAmJlxuICAgICAgICAhaXNCcm93c2VyVHJpZ2dlcmVkTmF2aWdhdGlvbihsYXN0TmF2aWdhdGlvbi5zb3VyY2UpO1xuICAgIGNvbnN0IGxhc3ROYXZpZ2F0aW9uU3VjY2VlZGVkID0gdGhpcy5sYXN0U3VjY2Vzc2Z1bElkID09PSBsYXN0TmF2aWdhdGlvbi5pZDtcbiAgICAvLyBJZiB0aGUgbGFzdCBuYXZpZ2F0aW9uIHN1Y2NlZWRlZCBvciBpcyBpbiBmbGlnaHQsIHdlIGNhbiB1c2UgdGhlIHJhd1VybCBhcyB0aGUgY29tcGFyaXNvbi5cbiAgICAvLyBIb3dldmVyLCBpZiBpdCBmYWlsZWQsIHdlIHNob3VsZCBjb21wYXJlIHRvIHRoZSBmaW5hbCByZXN1bHQgKHVybEFmdGVyUmVkaXJlY3RzKS5cbiAgICBjb25zdCBsYXN0TmF2aWdhdGlvblVybCA9IChsYXN0TmF2aWdhdGlvblN1Y2NlZWRlZCB8fCB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uKSA/XG4gICAgICAgIGxhc3ROYXZpZ2F0aW9uLnJhd1VybCA6XG4gICAgICAgIGxhc3ROYXZpZ2F0aW9uLnVybEFmdGVyUmVkaXJlY3RzO1xuICAgIGNvbnN0IGR1cGxpY2F0ZU5hdiA9IGxhc3ROYXZpZ2F0aW9uVXJsLnRvU3RyaW5nKCkgPT09IHJhd1VybC50b1N0cmluZygpO1xuICAgIGlmIChicm93c2VyTmF2UHJlY2VkZWRCeVJvdXRlck5hdiAmJiBkdXBsaWNhdGVOYXYpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJ1ZSk7ICAvLyByZXR1cm4gdmFsdWUgaXMgbm90IHVzZWRcbiAgICB9XG5cbiAgICBsZXQgcmVzb2x2ZTogYW55O1xuICAgIGxldCByZWplY3Q6IGFueTtcbiAgICBsZXQgcHJvbWlzZTogUHJvbWlzZTxib29sZWFuPjtcbiAgICBpZiAocHJpb3JQcm9taXNlKSB7XG4gICAgICByZXNvbHZlID0gcHJpb3JQcm9taXNlLnJlc29sdmU7XG4gICAgICByZWplY3QgPSBwcmlvclByb21pc2UucmVqZWN0O1xuICAgICAgcHJvbWlzZSA9IHByaW9yUHJvbWlzZS5wcm9taXNlO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHByb21pc2UgPSBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzLCByZWopID0+IHtcbiAgICAgICAgcmVzb2x2ZSA9IHJlcztcbiAgICAgICAgcmVqZWN0ID0gcmVqO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgaWQgPSArK3RoaXMubmF2aWdhdGlvbklkO1xuICAgIGxldCB0YXJnZXRQYWdlSWQ6IG51bWJlcjtcbiAgICBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAnY29tcHV0ZWQnKSB7XG4gICAgICBjb25zdCBpc0luaXRpYWxQYWdlID0gdGhpcy5jdXJyZW50UGFnZUlkID09PSAwO1xuICAgICAgaWYgKGlzSW5pdGlhbFBhZ2UpIHtcbiAgICAgICAgcmVzdG9yZWRTdGF0ZSA9IHRoaXMubG9jYXRpb24uZ2V0U3RhdGUoKSBhcyBSZXN0b3JlZFN0YXRlIHwgbnVsbDtcbiAgICAgIH1cbiAgICAgIC8vIElmIHRoZSBgybVyb3V0ZXJQYWdlSWRgIGV4aXN0IGluIHRoZSBzdGF0ZSB0aGVuIGB0YXJnZXRwYWdlSWRgIHNob3VsZCBoYXZlIHRoZSB2YWx1ZSBvZlxuICAgICAgLy8gYMm1cm91dGVyUGFnZUlkYC4gVGhpcyBpcyB0aGUgY2FzZSBmb3Igc29tZXRoaW5nIGxpa2UgYSBwYWdlIHJlZnJlc2ggd2hlcmUgd2UgYXNzaWduIHRoZVxuICAgICAgLy8gdGFyZ2V0IGlkIHRvIHRoZSBwcmV2aW91c2x5IHNldCB2YWx1ZSBmb3IgdGhhdCBwYWdlLlxuICAgICAgaWYgKHJlc3RvcmVkU3RhdGUgJiYgcmVzdG9yZWRTdGF0ZS7JtXJvdXRlclBhZ2VJZCkge1xuICAgICAgICB0YXJnZXRQYWdlSWQgPSByZXN0b3JlZFN0YXRlLsm1cm91dGVyUGFnZUlkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgd2UncmUgcmVwbGFjaW5nIHRoZSBVUkwgb3IgZG9pbmcgYSBzaWxlbnQgbmF2aWdhdGlvbiwgd2UgZG8gbm90IHdhbnQgdG8gaW5jcmVtZW50IHRoZVxuICAgICAgICAvLyBwYWdlIGlkIGJlY2F1c2Ugd2UgYXJlbid0IHB1c2hpbmcgYSBuZXcgZW50cnkgdG8gaGlzdG9yeS5cbiAgICAgICAgaWYgKGV4dHJhcy5yZXBsYWNlVXJsIHx8IGV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgICB0YXJnZXRQYWdlSWQgPSB0aGlzLmJyb3dzZXJQYWdlSWQgPz8gMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0YXJnZXRQYWdlSWQgPSAodGhpcy5icm93c2VyUGFnZUlkID8/IDApICsgMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGlzIGlzIHVudXNlZCB3aGVuIGBjYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uYCBpcyBub3QgY29tcHV0ZWQuXG4gICAgICB0YXJnZXRQYWdlSWQgPSAwO1xuICAgIH1cblxuICAgIHRoaXMuc2V0VHJhbnNpdGlvbih7XG4gICAgICBpZCxcbiAgICAgIHRhcmdldFBhZ2VJZCxcbiAgICAgIHNvdXJjZSxcbiAgICAgIHJlc3RvcmVkU3RhdGUsXG4gICAgICBjdXJyZW50VXJsVHJlZTogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIGN1cnJlbnRSYXdVcmw6IHRoaXMucmF3VXJsVHJlZSxcbiAgICAgIHJhd1VybCxcbiAgICAgIGV4dHJhcyxcbiAgICAgIHJlc29sdmUsXG4gICAgICByZWplY3QsXG4gICAgICBwcm9taXNlLFxuICAgICAgY3VycmVudFNuYXBzaG90OiB0aGlzLnJvdXRlclN0YXRlLnNuYXBzaG90LFxuICAgICAgY3VycmVudFJvdXRlclN0YXRlOiB0aGlzLnJvdXRlclN0YXRlXG4gICAgfSk7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhhdCB0aGUgZXJyb3IgaXMgcHJvcGFnYXRlZCBldmVuIHRob3VnaCBgcHJvY2Vzc05hdmlnYXRpb25zYCBjYXRjaFxuICAgIC8vIGhhbmRsZXIgZG9lcyBub3QgcmV0aHJvd1xuICAgIHJldHVybiBwcm9taXNlLmNhdGNoKChlOiBhbnkpID0+IHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0QnJvd3NlclVybCh1cmw6IFVybFRyZWUsIHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uKSB7XG4gICAgY29uc3QgcGF0aCA9IHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodXJsKTtcbiAgICBjb25zdCBzdGF0ZSA9IHsuLi50LmV4dHJhcy5zdGF0ZSwgLi4udGhpcy5nZW5lcmF0ZU5nUm91dGVyU3RhdGUodC5pZCwgdC50YXJnZXRQYWdlSWQpfTtcbiAgICBpZiAodGhpcy5sb2NhdGlvbi5pc0N1cnJlbnRQYXRoRXF1YWxUbyhwYXRoKSB8fCAhIXQuZXh0cmFzLnJlcGxhY2VVcmwpIHtcbiAgICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKHBhdGgsICcnLCBzdGF0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubG9jYXRpb24uZ28ocGF0aCwgJycsIHN0YXRlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybXMgdGhlIG5lY2Vzc2FyeSByb2xsYmFjayBhY3Rpb24gdG8gcmVzdG9yZSB0aGUgYnJvd3NlciBVUkwgdG8gdGhlXG4gICAqIHN0YXRlIGJlZm9yZSB0aGUgdHJhbnNpdGlvbi5cbiAgICovXG4gIHByaXZhdGUgcmVzdG9yZUhpc3RvcnkodDogTmF2aWdhdGlvblRyYW5zaXRpb24sIHJlc3RvcmluZ0Zyb21DYXVnaHRFcnJvciA9IGZhbHNlKSB7XG4gICAgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ2NvbXB1dGVkJykge1xuICAgICAgY29uc3QgdGFyZ2V0UGFnZVBvc2l0aW9uID0gdGhpcy5jdXJyZW50UGFnZUlkIC0gdC50YXJnZXRQYWdlSWQ7XG4gICAgICAvLyBUaGUgbmF2aWdhdG9yIGNoYW5nZSB0aGUgbG9jYXRpb24gYmVmb3JlIHRyaWdnZXJlZCB0aGUgYnJvd3NlciBldmVudCxcbiAgICAgIC8vIHNvIHdlIG5lZWQgdG8gZ28gYmFjayB0byB0aGUgY3VycmVudCB1cmwgaWYgdGhlIG5hdmlnYXRpb24gaXMgY2FuY2VsZWQuXG4gICAgICAvLyBBbHNvLCB3aGVuIG5hdmlnYXRpb24gZ2V0cyBjYW5jZWxsZWQgd2hpbGUgdXNpbmcgdXJsIHVwZGF0ZSBzdHJhdGVneSBlYWdlciwgdGhlbiB3ZSBuZWVkIHRvXG4gICAgICAvLyBnbyBiYWNrLiBCZWNhdXNlLCB3aGVuIGB1cmxVcGRhdGVTcmF0ZWd5YCBpcyBgZWFnZXJgOyBgc2V0QnJvd3NlclVybGAgbWV0aG9kIGlzIGNhbGxlZFxuICAgICAgLy8gYmVmb3JlIGFueSB2ZXJpZmljYXRpb24uXG4gICAgICBjb25zdCBicm93c2VyVXJsVXBkYXRlT2NjdXJyZWQgPVxuICAgICAgICAgICh0LnNvdXJjZSA9PT0gJ3BvcHN0YXRlJyB8fCB0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZWFnZXInIHx8XG4gICAgICAgICAgIHRoaXMuY3VycmVudFVybFRyZWUgPT09IHRoaXMuY3VycmVudE5hdmlnYXRpb24/LmZpbmFsVXJsKTtcbiAgICAgIGlmIChicm93c2VyVXJsVXBkYXRlT2NjdXJyZWQgJiYgdGFyZ2V0UGFnZVBvc2l0aW9uICE9PSAwKSB7XG4gICAgICAgIHRoaXMubG9jYXRpb24uaGlzdG9yeUdvKHRhcmdldFBhZ2VQb3NpdGlvbik7XG4gICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgIHRoaXMuY3VycmVudFVybFRyZWUgPT09IHRoaXMuY3VycmVudE5hdmlnYXRpb24/LmZpbmFsVXJsICYmIHRhcmdldFBhZ2VQb3NpdGlvbiA9PT0gMCkge1xuICAgICAgICAvLyBXZSBnb3QgdG8gdGhlIGFjdGl2YXRpb24gc3RhZ2UgKHdoZXJlIGN1cnJlbnRVcmxUcmVlIGlzIHNldCB0byB0aGUgbmF2aWdhdGlvbidzXG4gICAgICAgIC8vIGZpbmFsVXJsKSwgYnV0IHdlIHdlcmVuJ3QgbW92aW5nIGFueXdoZXJlIGluIGhpc3RvcnkgKHNraXBMb2NhdGlvbkNoYW5nZSBvciByZXBsYWNlVXJsKS5cbiAgICAgICAgLy8gV2Ugc3RpbGwgbmVlZCB0byByZXNldCB0aGUgcm91dGVyIHN0YXRlIGJhY2sgdG8gd2hhdCBpdCB3YXMgd2hlbiB0aGUgbmF2aWdhdGlvbiBzdGFydGVkLlxuICAgICAgICB0aGlzLnJlc2V0U3RhdGUodCk7XG4gICAgICAgIC8vIFRPRE8oYXRzY290dCk6IHJlc2V0dGluZyB0aGUgYGJyb3dzZXJVcmxUcmVlYCBzaG91bGQgcmVhbGx5IGJlIGRvbmUgaW4gYHJlc2V0U3RhdGVgLlxuICAgICAgICAvLyBJbnZlc3RpZ2F0ZSBpZiB0aGlzIGNhbiBiZSBkb25lIGJ5IHJ1bm5pbmcgVEdQLlxuICAgICAgICB0aGlzLmJyb3dzZXJVcmxUcmVlID0gdC5jdXJyZW50VXJsVHJlZTtcbiAgICAgICAgdGhpcy5yZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoZSBicm93c2VyIFVSTCBhbmQgcm91dGVyIHN0YXRlIHdhcyBub3QgdXBkYXRlZCBiZWZvcmUgdGhlIG5hdmlnYXRpb24gY2FuY2VsbGVkIHNvXG4gICAgICAgIC8vIHRoZXJlJ3Mgbm8gcmVzdG9yYXRpb24gbmVlZGVkLlxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAncmVwbGFjZScpIHtcbiAgICAgIC8vIFRPRE8oYXRzY290dCk6IEl0IHNlZW1zIGxpa2Ugd2Ugc2hvdWxkIF9hbHdheXNfIHJlc2V0IHRoZSBzdGF0ZSBoZXJlLiBJdCB3b3VsZCBiZSBhIG5vLW9wXG4gICAgICAvLyBmb3IgYGRlZmVycmVkYCBuYXZpZ2F0aW9ucyB0aGF0IGhhdmVuJ3QgY2hhbmdlIHRoZSBpbnRlcm5hbCBzdGF0ZSB5ZXQgYmVjYXVzZSBndWFyZHNcbiAgICAgIC8vIHJlamVjdC4gRm9yICdlYWdlcicgbmF2aWdhdGlvbnMsIGl0IHNlZW1zIGxpa2Ugd2UgYWxzbyByZWFsbHkgc2hvdWxkIHJlc2V0IHRoZSBzdGF0ZVxuICAgICAgLy8gYmVjYXVzZSB0aGUgbmF2aWdhdGlvbiB3YXMgY2FuY2VsbGVkLiBJbnZlc3RpZ2F0ZSBpZiB0aGlzIGNhbiBiZSBkb25lIGJ5IHJ1bm5pbmcgVEdQLlxuICAgICAgaWYgKHJlc3RvcmluZ0Zyb21DYXVnaHRFcnJvcikge1xuICAgICAgICB0aGlzLnJlc2V0U3RhdGUodCk7XG4gICAgICB9XG4gICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRTdGF0ZSh0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbik6IHZvaWQge1xuICAgICh0aGlzIGFzIHtyb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGV9KS5yb3V0ZXJTdGF0ZSA9IHQuY3VycmVudFJvdXRlclN0YXRlO1xuICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSB0LmN1cnJlbnRVcmxUcmVlO1xuICAgIHRoaXMucmF3VXJsVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB0LnJhd1VybCk7XG4gIH1cblxuICBwcml2YXRlIHJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpOiB2b2lkIHtcbiAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShcbiAgICAgICAgdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh0aGlzLnJhd1VybFRyZWUpLCAnJyxcbiAgICAgICAgdGhpcy5nZW5lcmF0ZU5nUm91dGVyU3RhdGUodGhpcy5sYXN0U3VjY2Vzc2Z1bElkLCB0aGlzLmN1cnJlbnRQYWdlSWQpKTtcbiAgfVxuXG4gIHByaXZhdGUgY2FuY2VsTmF2aWdhdGlvblRyYW5zaXRpb24odDogTmF2aWdhdGlvblRyYW5zaXRpb24sIHJlYXNvbjogc3RyaW5nKSB7XG4gICAgY29uc3QgbmF2Q2FuY2VsID0gbmV3IE5hdmlnYXRpb25DYW5jZWwodC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCByZWFzb24pO1xuICAgIHRoaXMudHJpZ2dlckV2ZW50KG5hdkNhbmNlbCk7XG4gICAgdC5yZXNvbHZlKGZhbHNlKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2VuZXJhdGVOZ1JvdXRlclN0YXRlKG5hdmlnYXRpb25JZDogbnVtYmVyLCByb3V0ZXJQYWdlSWQ/OiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAnY29tcHV0ZWQnKSB7XG4gICAgICByZXR1cm4ge25hdmlnYXRpb25JZCwgybVyb3V0ZXJQYWdlSWQ6IHJvdXRlclBhZ2VJZH07XG4gICAgfVxuICAgIHJldHVybiB7bmF2aWdhdGlvbklkfTtcbiAgfVxufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUNvbW1hbmRzKGNvbW1hbmRzOiBzdHJpbmdbXSk6IHZvaWQge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbW1hbmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY21kID0gY29tbWFuZHNbaV07XG4gICAgaWYgKGNtZCA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSByZXF1ZXN0ZWQgcGF0aCBjb250YWlucyAke2NtZH0gc2VnbWVudCBhdCBpbmRleCAke2l9YCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGlzQnJvd3NlclRyaWdnZXJlZE5hdmlnYXRpb24oc291cmNlOiAnaW1wZXJhdGl2ZSd8J3BvcHN0YXRlJ3wnaGFzaGNoYW5nZScpIHtcbiAgcmV0dXJuIHNvdXJjZSAhPT0gJ2ltcGVyYXRpdmUnO1xufVxuIl19