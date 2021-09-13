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
                // If the source of the navigation is from a browser event, the URL is
                // already updated. We already need to sync the internal state.
                if (isBrowserTriggeredNavigation(t.source)) {
                    // TODO(atscott): this should be `t.extractedUrl`. The `browserUrlTree`
                    // should only be the part of the URL that is handled by the router. In
                    // addition, this should only be done if we process the current url.
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
                                // TODO(atscott): The above line is incorrect. It sets the url to
                                // only the part that is handled by the router. It should merge
                                // that with the rawUrl so the url includes segments not handled
                                // by the router:
                                //  const rawUrl = this.urlHandlingStrategy.merge(
                                //      t.urlAfterRedirects, t.rawUrl);
                                //  this.setBrowserUrl(rawUrl, t);
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
        // TODO(atscott): This comment doesn't make it clear why this value needs to be set. In the case
        // described below (where we don't handle previous or current url), the `browserUrlTree` is set
        // to the `urlAfterRedirects` value. However, these values *are already the same* because of the
        // line below. So it seems that we should be able to remove the line below and the line where
        // `browserUrlTree` is updated when we aren't handling any part of the navigation url.
        // Run TGP to confirm that this can be done.
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
                const source = event['type'] === 'popstate' ? 'popstate' : 'hashchange';
                if (source === 'popstate') {
                    // The `setTimeout` was added in #12160 and is likely to support Angular/AngularJS
                    // hybrid apps.
                    setTimeout(() => {
                        var _a;
                        const extras = { replaceUrl: true };
                        // Navigations coming from Angular router have a navigationId state
                        // property. When this exists, restore the state.
                        const state = ((_a = event.state) === null || _a === void 0 ? void 0 : _a.navigationId) ? event.state : null;
                        if (state) {
                            const stateCopy = Object.assign({}, state);
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
function isBrowserTriggeredNavigation(source) {
    return source !== 'imperative';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBZ0IsTUFBTSxpQkFBaUIsQ0FBQztBQUN4RCxPQUFPLEVBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUscUJBQXFCLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBUSxRQUFRLElBQUksT0FBTyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3BJLE9BQU8sRUFBQyxlQUFlLEVBQUUsS0FBSyxFQUFjLEVBQUUsRUFBRSxPQUFPLEVBQW1CLE1BQU0sTUFBTSxDQUFDO0FBQ3ZGLE9BQU8sRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBR2pGLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQ3hELE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRCxPQUFPLEVBQVEsY0FBYyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFxQixVQUFVLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzdPLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQ3JELE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUNoRCxPQUFPLEVBQUMsV0FB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UUFDeEMsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLEdBQUcscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDN0U7S0FDRjtBQUNILENBQUM7QUFFRCxTQUFTLDRCQUE0QixDQUFDLE1BQTRDO0lBQ2hGLE9BQU8sTUFBTSxLQUFLLFlBQVksQ0FBQztBQUNqQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb24sIFBvcFN0YXRlRXZlbnR9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0NvbXBpbGVyLCBJbmplY3RhYmxlLCBJbmplY3RvciwgTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBOZ01vZHVsZVJlZiwgTmdab25lLCBUeXBlLCDJtUNvbnNvbGUgYXMgQ29uc29sZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0JlaGF2aW9yU3ViamVjdCwgRU1QVFksIE9ic2VydmFibGUsIG9mLCBTdWJqZWN0LCBTdWJzY3JpcHRpb25MaWtlfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y2F0Y2hFcnJvciwgZmlsdGVyLCBmaW5hbGl6ZSwgbWFwLCBzd2l0Y2hNYXAsIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge1F1ZXJ5UGFyYW1zSGFuZGxpbmcsIFJvdXRlLCBSb3V0ZXN9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7Y3JlYXRlUm91dGVyU3RhdGV9IGZyb20gJy4vY3JlYXRlX3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge2NyZWF0ZVVybFRyZWV9IGZyb20gJy4vY3JlYXRlX3VybF90cmVlJztcbmltcG9ydCB7RXZlbnQsIEd1YXJkc0NoZWNrRW5kLCBHdWFyZHNDaGVja1N0YXJ0LCBOYXZpZ2F0aW9uQ2FuY2VsLCBOYXZpZ2F0aW9uRW5kLCBOYXZpZ2F0aW9uRXJyb3IsIE5hdmlnYXRpb25TdGFydCwgTmF2aWdhdGlvblRyaWdnZXIsIFJlc29sdmVFbmQsIFJlc29sdmVTdGFydCwgUm91dGVDb25maWdMb2FkRW5kLCBSb3V0ZUNvbmZpZ0xvYWRTdGFydCwgUm91dGVzUmVjb2duaXplZH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHthY3RpdmF0ZVJvdXRlc30gZnJvbSAnLi9vcGVyYXRvcnMvYWN0aXZhdGVfcm91dGVzJztcbmltcG9ydCB7YXBwbHlSZWRpcmVjdHN9IGZyb20gJy4vb3BlcmF0b3JzL2FwcGx5X3JlZGlyZWN0cyc7XG5pbXBvcnQge2NoZWNrR3VhcmRzfSBmcm9tICcuL29wZXJhdG9ycy9jaGVja19ndWFyZHMnO1xuaW1wb3J0IHtyZWNvZ25pemV9IGZyb20gJy4vb3BlcmF0b3JzL3JlY29nbml6ZSc7XG5pbXBvcnQge3Jlc29sdmVEYXRhfSBmcm9tICcuL29wZXJhdG9ycy9yZXNvbHZlX2RhdGEnO1xuaW1wb3J0IHtzd2l0Y2hUYXB9IGZyb20gJy4vb3BlcmF0b3JzL3N3aXRjaF90YXAnO1xuaW1wb3J0IHtEZWZhdWx0Um91dGVSZXVzZVN0cmF0ZWd5LCBSb3V0ZVJldXNlU3RyYXRlZ3l9IGZyb20gJy4vcm91dGVfcmV1c2Vfc3RyYXRlZ3knO1xuaW1wb3J0IHtSb3V0ZXJDb25maWdMb2FkZXJ9IGZyb20gJy4vcm91dGVyX2NvbmZpZ19sb2FkZXInO1xuaW1wb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzfSBmcm9tICcuL3JvdXRlcl9vdXRsZXRfY29udGV4dCc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlLCBjcmVhdGVFbXB0eVN0YXRlLCBSb3V0ZXJTdGF0ZSwgUm91dGVyU3RhdGVTbmFwc2hvdH0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtpc05hdmlnYXRpb25DYW5jZWxpbmdFcnJvciwgbmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yLCBQYXJhbXN9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7RGVmYXVsdFVybEhhbmRsaW5nU3RyYXRlZ3ksIFVybEhhbmRsaW5nU3RyYXRlZ3l9IGZyb20gJy4vdXJsX2hhbmRsaW5nX3N0cmF0ZWd5JztcbmltcG9ydCB7Y29udGFpbnNUcmVlLCBjcmVhdGVFbXB0eVVybFRyZWUsIElzQWN0aXZlTWF0Y2hPcHRpb25zLCBVcmxTZXJpYWxpemVyLCBVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcbmltcG9ydCB7c3RhbmRhcmRpemVDb25maWcsIHZhbGlkYXRlQ29uZmlnfSBmcm9tICcuL3V0aWxzL2NvbmZpZyc7XG5pbXBvcnQge0NoZWNrcywgZ2V0QWxsUm91dGVHdWFyZHN9IGZyb20gJy4vdXRpbHMvcHJlYWN0aXZhdGlvbic7XG5pbXBvcnQge2lzVXJsVHJlZX0gZnJvbSAnLi91dGlscy90eXBlX2d1YXJkcyc7XG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBPcHRpb25zIHRoYXQgbW9kaWZ5IHRoZSBgUm91dGVyYCBVUkwuXG4gKiBTdXBwbHkgYW4gb2JqZWN0IGNvbnRhaW5pbmcgYW55IG9mIHRoZXNlIHByb3BlcnRpZXMgdG8gYSBgUm91dGVyYCBuYXZpZ2F0aW9uIGZ1bmN0aW9uIHRvXG4gKiBjb250cm9sIGhvdyB0aGUgdGFyZ2V0IFVSTCBzaG91bGQgYmUgY29uc3RydWN0ZWQuXG4gKlxuICogQHNlZSBbUm91dGVyLm5hdmlnYXRlKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNuYXZpZ2F0ZSlcbiAqIEBzZWUgW1JvdXRlci5jcmVhdGVVcmxUcmVlKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNjcmVhdGV1cmx0cmVlKVxuICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBVcmxDcmVhdGlvbk9wdGlvbnMge1xuICAvKipcbiAgICogU3BlY2lmaWVzIGEgcm9vdCBVUkkgdG8gdXNlIGZvciByZWxhdGl2ZSBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBGb3IgZXhhbXBsZSwgY29uc2lkZXIgdGhlIGZvbGxvd2luZyByb3V0ZSBjb25maWd1cmF0aW9uIHdoZXJlIHRoZSBwYXJlbnQgcm91dGVcbiAgICogaGFzIHR3byBjaGlsZHJlbi5cbiAgICpcbiAgICogYGBgXG4gICAqIFt7XG4gICAqICAgcGF0aDogJ3BhcmVudCcsXG4gICAqICAgY29tcG9uZW50OiBQYXJlbnRDb21wb25lbnQsXG4gICAqICAgY2hpbGRyZW46IFt7XG4gICAqICAgICBwYXRoOiAnbGlzdCcsXG4gICAqICAgICBjb21wb25lbnQ6IExpc3RDb21wb25lbnRcbiAgICogICB9LHtcbiAgICogICAgIHBhdGg6ICdjaGlsZCcsXG4gICAqICAgICBjb21wb25lbnQ6IENoaWxkQ29tcG9uZW50XG4gICAqICAgfV1cbiAgICogfV1cbiAgICogYGBgXG4gICAqXG4gICAqIFRoZSBmb2xsb3dpbmcgYGdvKClgIGZ1bmN0aW9uIG5hdmlnYXRlcyB0byB0aGUgYGxpc3RgIHJvdXRlIGJ5XG4gICAqIGludGVycHJldGluZyB0aGUgZGVzdGluYXRpb24gVVJJIGFzIHJlbGF0aXZlIHRvIHRoZSBhY3RpdmF0ZWQgYGNoaWxkYCAgcm91dGVcbiAgICpcbiAgICogYGBgXG4gICAqICBAQ29tcG9uZW50KHsuLi59KVxuICAgKiAgY2xhc3MgQ2hpbGRDb21wb25lbnQge1xuICAgKiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJvdXRlcjogUm91dGVyLCBwcml2YXRlIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSkge31cbiAgICpcbiAgICogICAgZ28oKSB7XG4gICAqICAgICAgdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycuLi9saXN0J10sIHsgcmVsYXRpdmVUbzogdGhpcy5yb3V0ZSB9KTtcbiAgICogICAgfVxuICAgKiAgfVxuICAgKiBgYGBcbiAgICpcbiAgICogQSB2YWx1ZSBvZiBgbnVsbGAgb3IgYHVuZGVmaW5lZGAgaW5kaWNhdGVzIHRoYXQgdGhlIG5hdmlnYXRpb24gY29tbWFuZHMgc2hvdWxkIGJlIGFwcGxpZWRcbiAgICogcmVsYXRpdmUgdG8gdGhlIHJvb3QuXG4gICAqL1xuICByZWxhdGl2ZVRvPzogQWN0aXZhdGVkUm91dGV8bnVsbDtcblxuICAvKipcbiAgICogU2V0cyBxdWVyeSBwYXJhbWV0ZXJzIHRvIHRoZSBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvcmVzdWx0cz9wYWdlPTFcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvcmVzdWx0cyddLCB7IHF1ZXJ5UGFyYW1zOiB7IHBhZ2U6IDEgfSB9KTtcbiAgICogYGBgXG4gICAqL1xuICBxdWVyeVBhcmFtcz86IFBhcmFtc3xudWxsO1xuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBoYXNoIGZyYWdtZW50IGZvciB0aGUgVVJMLlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgdG8gL3Jlc3VsdHMjdG9wXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3Jlc3VsdHMnXSwgeyBmcmFnbWVudDogJ3RvcCcgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnQ/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEhvdyB0byBoYW5kbGUgcXVlcnkgcGFyYW1ldGVycyBpbiB0aGUgcm91dGVyIGxpbmsgZm9yIHRoZSBuZXh0IG5hdmlnYXRpb24uXG4gICAqIE9uZSBvZjpcbiAgICogKiBgcHJlc2VydmVgIDogUHJlc2VydmUgY3VycmVudCBwYXJhbWV0ZXJzLlxuICAgKiAqIGBtZXJnZWAgOiBNZXJnZSBuZXcgd2l0aCBjdXJyZW50IHBhcmFtZXRlcnMuXG4gICAqXG4gICAqIFRoZSBcInByZXNlcnZlXCIgb3B0aW9uIGRpc2NhcmRzIGFueSBuZXcgcXVlcnkgcGFyYW1zOlxuICAgKiBgYGBcbiAgICogLy8gZnJvbSAvdmlldzE/cGFnZT0xIHRvL3ZpZXcyP3BhZ2U9MVxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3MiddLCB7IHF1ZXJ5UGFyYW1zOiB7IHBhZ2U6IDIgfSwgIHF1ZXJ5UGFyYW1zSGFuZGxpbmc6IFwicHJlc2VydmVcIlxuICAgKiB9KTtcbiAgICogYGBgXG4gICAqIFRoZSBcIm1lcmdlXCIgb3B0aW9uIGFwcGVuZHMgbmV3IHF1ZXJ5IHBhcmFtcyB0byB0aGUgcGFyYW1zIGZyb20gdGhlIGN1cnJlbnQgVVJMOlxuICAgKiBgYGBcbiAgICogLy8gZnJvbSAvdmlldzE/cGFnZT0xIHRvL3ZpZXcyP3BhZ2U9MSZvdGhlcktleT0yXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcyJ10sIHsgcXVlcnlQYXJhbXM6IHsgb3RoZXJLZXk6IDIgfSwgIHF1ZXJ5UGFyYW1zSGFuZGxpbmc6IFwibWVyZ2VcIlxuICAgKiB9KTtcbiAgICogYGBgXG4gICAqIEluIGNhc2Ugb2YgYSBrZXkgY29sbGlzaW9uIGJldHdlZW4gY3VycmVudCBwYXJhbWV0ZXJzIGFuZCB0aG9zZSBpbiB0aGUgYHF1ZXJ5UGFyYW1zYCBvYmplY3QsXG4gICAqIHRoZSBuZXcgdmFsdWUgaXMgdXNlZC5cbiAgICpcbiAgICovXG4gIHF1ZXJ5UGFyYW1zSGFuZGxpbmc/OiBRdWVyeVBhcmFtc0hhbmRsaW5nfG51bGw7XG5cbiAgLyoqXG4gICAqIFdoZW4gdHJ1ZSwgcHJlc2VydmVzIHRoZSBVUkwgZnJhZ21lbnQgZm9yIHRoZSBuZXh0IG5hdmlnYXRpb25cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIFByZXNlcnZlIGZyYWdtZW50IGZyb20gL3Jlc3VsdHMjdG9wIHRvIC92aWV3I3RvcFxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgcHJlc2VydmVGcmFnbWVudDogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqL1xuICBwcmVzZXJ2ZUZyYWdtZW50PzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBPcHRpb25zIHRoYXQgbW9kaWZ5IHRoZSBgUm91dGVyYCBuYXZpZ2F0aW9uIHN0cmF0ZWd5LlxuICogU3VwcGx5IGFuIG9iamVjdCBjb250YWluaW5nIGFueSBvZiB0aGVzZSBwcm9wZXJ0aWVzIHRvIGEgYFJvdXRlcmAgbmF2aWdhdGlvbiBmdW5jdGlvbiB0b1xuICogY29udHJvbCBob3cgdGhlIG5hdmlnYXRpb24gc2hvdWxkIGJlIGhhbmRsZWQuXG4gKlxuICogQHNlZSBbUm91dGVyLm5hdmlnYXRlKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNuYXZpZ2F0ZSlcbiAqIEBzZWUgW1JvdXRlci5uYXZpZ2F0ZUJ5VXJsKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNuYXZpZ2F0ZWJ5dXJsKVxuICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zIHtcbiAgLyoqXG4gICAqIFdoZW4gdHJ1ZSwgbmF2aWdhdGVzIHdpdGhvdXQgcHVzaGluZyBhIG5ldyBzdGF0ZSBpbnRvIGhpc3RvcnkuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSBzaWxlbnRseSB0byAvdmlld1xuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHNraXBMb2NhdGlvbkNoYW5nZT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZW4gdHJ1ZSwgbmF2aWdhdGVzIHdoaWxlIHJlcGxhY2luZyB0aGUgY3VycmVudCBzdGF0ZSBpbiBoaXN0b3J5LlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgdG8gL3ZpZXdcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHJlcGxhY2VVcmw6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcmVwbGFjZVVybD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIERldmVsb3Blci1kZWZpbmVkIHN0YXRlIHRoYXQgY2FuIGJlIHBhc3NlZCB0byBhbnkgbmF2aWdhdGlvbi5cbiAgICogQWNjZXNzIHRoaXMgdmFsdWUgdGhyb3VnaCB0aGUgYE5hdmlnYXRpb24uZXh0cmFzYCBvYmplY3RcbiAgICogcmV0dXJuZWQgZnJvbSB0aGUgW1JvdXRlci5nZXRDdXJyZW50TmF2aWdhdGlvbigpXG4gICAqIG1ldGhvZF0oYXBpL3JvdXRlci9Sb3V0ZXIjZ2V0Y3VycmVudG5hdmlnYXRpb24pIHdoaWxlIGEgbmF2aWdhdGlvbiBpcyBleGVjdXRpbmcuXG4gICAqXG4gICAqIEFmdGVyIGEgbmF2aWdhdGlvbiBjb21wbGV0ZXMsIHRoZSByb3V0ZXIgd3JpdGVzIGFuIG9iamVjdCBjb250YWluaW5nIHRoaXNcbiAgICogdmFsdWUgdG9nZXRoZXIgd2l0aCBhIGBuYXZpZ2F0aW9uSWRgIHRvIGBoaXN0b3J5LnN0YXRlYC5cbiAgICogVGhlIHZhbHVlIGlzIHdyaXR0ZW4gd2hlbiBgbG9jYXRpb24uZ28oKWAgb3IgYGxvY2F0aW9uLnJlcGxhY2VTdGF0ZSgpYFxuICAgKiBpcyBjYWxsZWQgYmVmb3JlIGFjdGl2YXRpbmcgdGhpcyByb3V0ZS5cbiAgICpcbiAgICogTm90ZSB0aGF0IGBoaXN0b3J5LnN0YXRlYCBkb2VzIG5vdCBwYXNzIGFuIG9iamVjdCBlcXVhbGl0eSB0ZXN0IGJlY2F1c2VcbiAgICogdGhlIHJvdXRlciBhZGRzIHRoZSBgbmF2aWdhdGlvbklkYCBvbiBlYWNoIG5hdmlnYXRpb24uXG4gICAqXG4gICAqL1xuICBzdGF0ZT86IHtbazogc3RyaW5nXTogYW55fTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBPcHRpb25zIHRoYXQgbW9kaWZ5IHRoZSBgUm91dGVyYCBuYXZpZ2F0aW9uIHN0cmF0ZWd5LlxuICogU3VwcGx5IGFuIG9iamVjdCBjb250YWluaW5nIGFueSBvZiB0aGVzZSBwcm9wZXJ0aWVzIHRvIGEgYFJvdXRlcmAgbmF2aWdhdGlvbiBmdW5jdGlvbiB0b1xuICogY29udHJvbCBob3cgdGhlIHRhcmdldCBVUkwgc2hvdWxkIGJlIGNvbnN0cnVjdGVkIG9yIGludGVycHJldGVkLlxuICpcbiAqIEBzZWUgW1JvdXRlci5uYXZpZ2F0ZSgpIG1ldGhvZF0oYXBpL3JvdXRlci9Sb3V0ZXIjbmF2aWdhdGUpXG4gKiBAc2VlIFtSb3V0ZXIubmF2aWdhdGVCeVVybCgpIG1ldGhvZF0oYXBpL3JvdXRlci9Sb3V0ZXIjbmF2aWdhdGVieXVybClcbiAqIEBzZWUgW1JvdXRlci5jcmVhdGVVcmxUcmVlKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNjcmVhdGV1cmx0cmVlKVxuICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKVxuICogQHNlZSBVcmxDcmVhdGlvbk9wdGlvbnNcbiAqIEBzZWUgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9uc1xuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOYXZpZ2F0aW9uRXh0cmFzIGV4dGVuZHMgVXJsQ3JlYXRpb25PcHRpb25zLCBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zIHt9XG5cbi8qKlxuICogRXJyb3IgaGFuZGxlciB0aGF0IGlzIGludm9rZWQgd2hlbiBhIG5hdmlnYXRpb24gZXJyb3Igb2NjdXJzLlxuICpcbiAqIElmIHRoZSBoYW5kbGVyIHJldHVybnMgYSB2YWx1ZSwgdGhlIG5hdmlnYXRpb24gUHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIHRoaXMgdmFsdWUuXG4gKiBJZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLCB0aGUgbmF2aWdhdGlvbiBQcm9taXNlIGlzIHJlamVjdGVkIHdpdGhcbiAqIHRoZSBleGNlcHRpb24uXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBFcnJvckhhbmRsZXIgPSAoZXJyb3I6IGFueSkgPT4gYW55O1xuXG5mdW5jdGlvbiBkZWZhdWx0RXJyb3JIYW5kbGVyKGVycm9yOiBhbnkpOiBhbnkge1xuICB0aHJvdyBlcnJvcjtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdE1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcihcbiAgICBlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gIHJldHVybiB1cmxTZXJpYWxpemVyLnBhcnNlKCcvJyk7XG59XG5cbmV4cG9ydCB0eXBlIFJlc3RvcmVkU3RhdGUgPSB7XG4gIFtrOiBzdHJpbmddOiBhbnksXG4gIC8vIFRPRE8oIzI3NjA3KTogUmVtb3ZlIGBuYXZpZ2F0aW9uSWRgIGFuZCBgybVyb3V0ZXJQYWdlSWRgIGFuZCBtb3ZlIHRvIGBuZ2Agb3IgYMm1YCBuYW1lc3BhY2UuXG4gIG5hdmlnYXRpb25JZDogbnVtYmVyLFxuICAvLyBUaGUgYMm1YCBwcmVmaXggaXMgdGhlcmUgdG8gcmVkdWNlIHRoZSBjaGFuY2Ugb2YgY29sbGlkaW5nIHdpdGggYW55IGV4aXN0aW5nIHVzZXIgcHJvcGVydGllcyBvblxuICAvLyB0aGUgaGlzdG9yeSBzdGF0ZS5cbiAgybVyb3V0ZXJQYWdlSWQ/OiBudW1iZXIsXG59O1xuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IGEgbmF2aWdhdGlvbiBvcGVyYXRpb24uXG4gKiBSZXRyaWV2ZSB0aGUgbW9zdCByZWNlbnQgbmF2aWdhdGlvbiBvYmplY3Qgd2l0aCB0aGVcbiAqIFtSb3V0ZXIuZ2V0Q3VycmVudE5hdmlnYXRpb24oKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI2dldGN1cnJlbnRuYXZpZ2F0aW9uKSAuXG4gKlxuICogKiAqaWQqIDogVGhlIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBjdXJyZW50IG5hdmlnYXRpb24uXG4gKiAqICppbml0aWFsVXJsKiA6IFRoZSB0YXJnZXQgVVJMIHBhc3NlZCBpbnRvIHRoZSBgUm91dGVyI25hdmlnYXRlQnlVcmwoKWAgY2FsbCBiZWZvcmUgbmF2aWdhdGlvbi5cbiAqIFRoaXMgaXMgdGhlIHZhbHVlIGJlZm9yZSB0aGUgcm91dGVyIGhhcyBwYXJzZWQgb3IgYXBwbGllZCByZWRpcmVjdHMgdG8gaXQuXG4gKiAqICpleHRyYWN0ZWRVcmwqIDogVGhlIGluaXRpYWwgdGFyZ2V0IFVSTCBhZnRlciBiZWluZyBwYXJzZWQgd2l0aCBgVXJsU2VyaWFsaXplci5leHRyYWN0KClgLlxuICogKiAqZmluYWxVcmwqIDogVGhlIGV4dHJhY3RlZCBVUkwgYWZ0ZXIgcmVkaXJlY3RzIGhhdmUgYmVlbiBhcHBsaWVkLlxuICogVGhpcyBVUkwgbWF5IG5vdCBiZSBhdmFpbGFibGUgaW1tZWRpYXRlbHksIHRoZXJlZm9yZSB0aGlzIHByb3BlcnR5IGNhbiBiZSBgdW5kZWZpbmVkYC5cbiAqIEl0IGlzIGd1YXJhbnRlZWQgdG8gYmUgc2V0IGFmdGVyIHRoZSBgUm91dGVzUmVjb2duaXplZGAgZXZlbnQgZmlyZXMuXG4gKiAqICp0cmlnZ2VyKiA6IElkZW50aWZpZXMgaG93IHRoaXMgbmF2aWdhdGlvbiB3YXMgdHJpZ2dlcmVkLlxuICogLS0gJ2ltcGVyYXRpdmUnLS1UcmlnZ2VyZWQgYnkgYHJvdXRlci5uYXZpZ2F0ZUJ5VXJsYCBvciBgcm91dGVyLm5hdmlnYXRlYC5cbiAqIC0tICdwb3BzdGF0ZSctLVRyaWdnZXJlZCBieSBhIHBvcHN0YXRlIGV2ZW50LlxuICogLS0gJ2hhc2hjaGFuZ2UnLS1UcmlnZ2VyZWQgYnkgYSBoYXNoY2hhbmdlIGV2ZW50LlxuICogKiAqZXh0cmFzKiA6IEEgYE5hdmlnYXRpb25FeHRyYXNgIG9wdGlvbnMgb2JqZWN0IHRoYXQgY29udHJvbGxlZCB0aGUgc3RyYXRlZ3kgdXNlZCBmb3IgdGhpc1xuICogbmF2aWdhdGlvbi5cbiAqICogKnByZXZpb3VzTmF2aWdhdGlvbiogOiBUaGUgcHJldmlvdXNseSBzdWNjZXNzZnVsIGBOYXZpZ2F0aW9uYCBvYmplY3QuIE9ubHkgb25lIHByZXZpb3VzXG4gKiBuYXZpZ2F0aW9uIGlzIGF2YWlsYWJsZSwgdGhlcmVmb3JlIHRoaXMgcHJldmlvdXMgYE5hdmlnYXRpb25gIG9iamVjdCBoYXMgYSBgbnVsbGAgdmFsdWUgZm9yIGl0c1xuICogb3duIGBwcmV2aW91c05hdmlnYXRpb25gLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOYXZpZ2F0aW9uIHtcbiAgLyoqXG4gICAqIFRoZSB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY3VycmVudCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaWQ6IG51bWJlcjtcbiAgLyoqXG4gICAqIFRoZSB0YXJnZXQgVVJMIHBhc3NlZCBpbnRvIHRoZSBgUm91dGVyI25hdmlnYXRlQnlVcmwoKWAgY2FsbCBiZWZvcmUgbmF2aWdhdGlvbi4gVGhpcyBpc1xuICAgKiB0aGUgdmFsdWUgYmVmb3JlIHRoZSByb3V0ZXIgaGFzIHBhcnNlZCBvciBhcHBsaWVkIHJlZGlyZWN0cyB0byBpdC5cbiAgICovXG4gIGluaXRpYWxVcmw6IHN0cmluZ3xVcmxUcmVlO1xuICAvKipcbiAgICogVGhlIGluaXRpYWwgdGFyZ2V0IFVSTCBhZnRlciBiZWluZyBwYXJzZWQgd2l0aCBgVXJsU2VyaWFsaXplci5leHRyYWN0KClgLlxuICAgKi9cbiAgZXh0cmFjdGVkVXJsOiBVcmxUcmVlO1xuICAvKipcbiAgICogVGhlIGV4dHJhY3RlZCBVUkwgYWZ0ZXIgcmVkaXJlY3RzIGhhdmUgYmVlbiBhcHBsaWVkLlxuICAgKiBUaGlzIFVSTCBtYXkgbm90IGJlIGF2YWlsYWJsZSBpbW1lZGlhdGVseSwgdGhlcmVmb3JlIHRoaXMgcHJvcGVydHkgY2FuIGJlIGB1bmRlZmluZWRgLlxuICAgKiBJdCBpcyBndWFyYW50ZWVkIHRvIGJlIHNldCBhZnRlciB0aGUgYFJvdXRlc1JlY29nbml6ZWRgIGV2ZW50IGZpcmVzLlxuICAgKi9cbiAgZmluYWxVcmw/OiBVcmxUcmVlO1xuICAvKipcbiAgICogSWRlbnRpZmllcyBob3cgdGhpcyBuYXZpZ2F0aW9uIHdhcyB0cmlnZ2VyZWQuXG4gICAqXG4gICAqICogJ2ltcGVyYXRpdmUnLS1UcmlnZ2VyZWQgYnkgYHJvdXRlci5uYXZpZ2F0ZUJ5VXJsYCBvciBgcm91dGVyLm5hdmlnYXRlYC5cbiAgICogKiAncG9wc3RhdGUnLS1UcmlnZ2VyZWQgYnkgYSBwb3BzdGF0ZSBldmVudC5cbiAgICogKiAnaGFzaGNoYW5nZSctLVRyaWdnZXJlZCBieSBhIGhhc2hjaGFuZ2UgZXZlbnQuXG4gICAqL1xuICB0cmlnZ2VyOiAnaW1wZXJhdGl2ZSd8J3BvcHN0YXRlJ3wnaGFzaGNoYW5nZSc7XG4gIC8qKlxuICAgKiBPcHRpb25zIHRoYXQgY29udHJvbGxlZCB0aGUgc3RyYXRlZ3kgdXNlZCBmb3IgdGhpcyBuYXZpZ2F0aW9uLlxuICAgKiBTZWUgYE5hdmlnYXRpb25FeHRyYXNgLlxuICAgKi9cbiAgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzO1xuICAvKipcbiAgICogVGhlIHByZXZpb3VzbHkgc3VjY2Vzc2Z1bCBgTmF2aWdhdGlvbmAgb2JqZWN0LiBPbmx5IG9uZSBwcmV2aW91cyBuYXZpZ2F0aW9uXG4gICAqIGlzIGF2YWlsYWJsZSwgdGhlcmVmb3JlIHRoaXMgcHJldmlvdXMgYE5hdmlnYXRpb25gIG9iamVjdCBoYXMgYSBgbnVsbGAgdmFsdWVcbiAgICogZm9yIGl0cyBvd24gYHByZXZpb3VzTmF2aWdhdGlvbmAuXG4gICAqL1xuICBwcmV2aW91c05hdmlnYXRpb246IE5hdmlnYXRpb258bnVsbDtcbn1cblxuZXhwb3J0IHR5cGUgTmF2aWdhdGlvblRyYW5zaXRpb24gPSB7XG4gIGlkOiBudW1iZXIsXG4gIHRhcmdldFBhZ2VJZDogbnVtYmVyLFxuICBjdXJyZW50VXJsVHJlZTogVXJsVHJlZSxcbiAgY3VycmVudFJhd1VybDogVXJsVHJlZSxcbiAgZXh0cmFjdGVkVXJsOiBVcmxUcmVlLFxuICB1cmxBZnRlclJlZGlyZWN0czogVXJsVHJlZSxcbiAgcmF3VXJsOiBVcmxUcmVlLFxuICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMsXG4gIHJlc29sdmU6IGFueSxcbiAgcmVqZWN0OiBhbnksXG4gIHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj4sXG4gIHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIsXG4gIHJlc3RvcmVkU3RhdGU6IFJlc3RvcmVkU3RhdGV8bnVsbCxcbiAgY3VycmVudFNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxuICB0YXJnZXRTbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdHxudWxsLFxuICBjdXJyZW50Um91dGVyU3RhdGU6IFJvdXRlclN0YXRlLFxuICB0YXJnZXRSb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGV8bnVsbCxcbiAgZ3VhcmRzOiBDaGVja3MsXG4gIGd1YXJkc1Jlc3VsdDogYm9vbGVhbnxVcmxUcmVlfG51bGwsXG59O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgdHlwZSBSb3V0ZXJIb29rID0gKHNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90LCBydW5FeHRyYXM6IHtcbiAgYXBwbGllZFVybFRyZWU6IFVybFRyZWUsXG4gIHJhd1VybFRyZWU6IFVybFRyZWUsXG4gIHNraXBMb2NhdGlvbkNoYW5nZTogYm9vbGVhbixcbiAgcmVwbGFjZVVybDogYm9vbGVhbixcbiAgbmF2aWdhdGlvbklkOiBudW1iZXJcbn0pID0+IE9ic2VydmFibGU8dm9pZD47XG5cbi8qKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGRlZmF1bHRSb3V0ZXJIb29rKHNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90LCBydW5FeHRyYXM6IHtcbiAgYXBwbGllZFVybFRyZWU6IFVybFRyZWUsXG4gIHJhd1VybFRyZWU6IFVybFRyZWUsXG4gIHNraXBMb2NhdGlvbkNoYW5nZTogYm9vbGVhbixcbiAgcmVwbGFjZVVybDogYm9vbGVhbixcbiAgbmF2aWdhdGlvbklkOiBudW1iZXJcbn0pOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgcmV0dXJuIG9mKG51bGwpIGFzIGFueTtcbn1cblxuLyoqXG4gKiBUaGUgZXF1aXZhbGVudCBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIG9wdGlvbnMgZm9yIGBSb3V0ZXIuaXNBY3RpdmVgIGlzIGNhbGxlZCB3aXRoIGB0cnVlYFxuICogKGV4YWN0ID0gdHJ1ZSkuXG4gKi9cbmV4cG9ydCBjb25zdCBleGFjdE1hdGNoT3B0aW9uczogSXNBY3RpdmVNYXRjaE9wdGlvbnMgPSB7XG4gIHBhdGhzOiAnZXhhY3QnLFxuICBmcmFnbWVudDogJ2lnbm9yZWQnLFxuICBtYXRyaXhQYXJhbXM6ICdpZ25vcmVkJyxcbiAgcXVlcnlQYXJhbXM6ICdleGFjdCdcbn07XG5cbi8qKlxuICogVGhlIGVxdWl2YWxlbnQgYElzQWN0aXZlTWF0Y2hPcHRpb25zYCBvcHRpb25zIGZvciBgUm91dGVyLmlzQWN0aXZlYCBpcyBjYWxsZWQgd2l0aCBgZmFsc2VgXG4gKiAoZXhhY3QgPSBmYWxzZSkuXG4gKi9cbmV4cG9ydCBjb25zdCBzdWJzZXRNYXRjaE9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zID0ge1xuICBwYXRoczogJ3N1YnNldCcsXG4gIGZyYWdtZW50OiAnaWdub3JlZCcsXG4gIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnLFxuICBxdWVyeVBhcmFtczogJ3N1YnNldCdcbn07XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQSBzZXJ2aWNlIHRoYXQgcHJvdmlkZXMgbmF2aWdhdGlvbiBhbW9uZyB2aWV3cyBhbmQgVVJMIG1hbmlwdWxhdGlvbiBjYXBhYmlsaXRpZXMuXG4gKlxuICogQHNlZSBgUm91dGVgLlxuICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBHdWlkZV0oZ3VpZGUvcm91dGVyKS5cbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgUm91dGVyIHtcbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgdGhlIGFjdGl2YXRlZCBgVXJsVHJlZWAgdGhhdCB0aGUgYFJvdXRlcmAgaXMgY29uZmlndXJlZCB0byBoYW5kbGUgKHRocm91Z2hcbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3lgKS4gVGhhdCBpcywgYWZ0ZXIgd2UgZmluZCB0aGUgcm91dGUgY29uZmlnIHRyZWUgdGhhdCB3ZSdyZSBnb2luZyB0b1xuICAgKiBhY3RpdmF0ZSwgcnVuIGd1YXJkcywgYW5kIGFyZSBqdXN0IGFib3V0IHRvIGFjdGl2YXRlIHRoZSByb3V0ZSwgd2Ugc2V0IHRoZSBjdXJyZW50VXJsVHJlZS5cbiAgICpcbiAgICogVGhpcyBzaG91bGQgbWF0Y2ggdGhlIGBicm93c2VyVXJsVHJlZWAgd2hlbiBhIG5hdmlnYXRpb24gc3VjY2VlZHMuIElmIHRoZVxuICAgKiBgVXJsSGFuZGxpbmdTdHJhdGVneS5zaG91bGRQcm9jZXNzVXJsYCBpcyBgZmFsc2VgLCBvbmx5IHRoZSBgYnJvd3NlclVybFRyZWVgIGlzIHVwZGF0ZWQuXG4gICAqL1xuICBwcml2YXRlIGN1cnJlbnRVcmxUcmVlOiBVcmxUcmVlO1xuICAvKipcbiAgICogTWVhbnQgdG8gcmVwcmVzZW50IHRoZSBlbnRpcmUgYnJvd3NlciB1cmwgYWZ0ZXIgYSBzdWNjZXNzZnVsIG5hdmlnYXRpb24uIEluIHRoZSBsaWZlIG9mIGFcbiAgICogbmF2aWdhdGlvbiB0cmFuc2l0aW9uOlxuICAgKiAxLiBUaGUgcmF3VXJsIHJlcHJlc2VudHMgdGhlIGZ1bGwgVVJMIHRoYXQncyBiZWluZyBuYXZpZ2F0ZWQgdG9cbiAgICogMi4gV2UgYXBwbHkgcmVkaXJlY3RzLCB3aGljaCBtaWdodCBvbmx5IGFwcGx5IHRvIF9wYXJ0XyBvZiB0aGUgVVJMIChkdWUgdG9cbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3lgKS5cbiAgICogMy4gUmlnaHQgYmVmb3JlIGFjdGl2YXRpb24gKGJlY2F1c2Ugd2UgYXNzdW1lIGFjdGl2YXRpb24gd2lsbCBzdWNjZWVkKSwgd2UgdXBkYXRlIHRoZVxuICAgKiByYXdVcmxUcmVlIHRvIGJlIGEgY29tYmluYXRpb24gb2YgdGhlIHVybEFmdGVyUmVkaXJlY3RzIChhZ2FpbiwgdGhpcyBtaWdodCBvbmx5IGFwcGx5IHRvIHBhcnRcbiAgICogb2YgdGhlIGluaXRpYWwgdXJsKSBhbmQgdGhlIHJhd1VybCBvZiB0aGUgdHJhbnNpdGlvbiAod2hpY2ggd2FzIHRoZSBvcmlnaW5hbCBuYXZpZ2F0aW9uIHVybCBpblxuICAgKiBpdHMgZnVsbCBmb3JtKS5cbiAgICovXG4gIHByaXZhdGUgcmF3VXJsVHJlZTogVXJsVHJlZTtcbiAgLyoqXG4gICAqIE1lYW50IHRvIHJlcHJlc2VudCB0aGUgcGFydCBvZiB0aGUgYnJvd3NlciB1cmwgdGhhdCB0aGUgYFJvdXRlcmAgaXMgc2V0IHVwIHRvIGhhbmRsZSAodmlhIHRoZVxuICAgKiBgVXJsSGFuZGxpbmdTdHJhdGVneWApLiBUaGlzIHZhbHVlIGlzIHVwZGF0ZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgdGhlIGJyb3dzZXIgdXJsIGlzIHVwZGF0ZWQgKG9yXG4gICAqIHRoZSBicm93c2VyIHVybCB1cGRhdGUgaXMgc2tpcHBlZCB2aWEgYHNraXBMb2NhdGlvbkNoYW5nZWApLiBXaXRoIHRoYXQsIG5vdGUgdGhhdFxuICAgKiBgYnJvd3NlclVybFRyZWVgIF9tYXkgbm90XyByZWZsZWN0IHRoZSBhY3R1YWwgYnJvd3NlciBVUkwgZm9yIHR3byByZWFzb25zOlxuICAgKlxuICAgKiAxLiBgVXJsSGFuZGxpbmdTdHJhdGVneWAgb25seSBoYW5kbGVzIHBhcnQgb2YgdGhlIFVSTFxuICAgKiAyLiBgc2tpcExvY2F0aW9uQ2hhbmdlYCBkb2VzIG5vdCB1cGRhdGUgdGhlIGJyb3dzZXIgdXJsLlxuICAgKlxuICAgKiBTbyB0byByZWl0ZXJhdGUsIGBicm93c2VyVXJsVHJlZWAgb25seSByZXByZXNlbnRzIHRoZSBSb3V0ZXIncyBpbnRlcm5hbCB1bmRlcnN0YW5kaW5nIG9mIHRoZVxuICAgKiBjdXJyZW50IHJvdXRlLCBlaXRoZXIgYmVmb3JlIGd1YXJkcyB3aXRoIGB1cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJ2Agb3IgcmlnaHQgYmVmb3JlXG4gICAqIGFjdGl2YXRpb24gd2l0aCBgJ2RlZmVycmVkJ2AuXG4gICAqXG4gICAqIFRoaXMgc2hvdWxkIG1hdGNoIHRoZSBgY3VycmVudFVybFRyZWVgIHdoZW4gdGhlIG5hdmlnYXRpb24gc3VjY2VlZHMuXG4gICAqL1xuICBwcml2YXRlIGJyb3dzZXJVcmxUcmVlOiBVcmxUcmVlO1xuICBwcml2YXRlIHJlYWRvbmx5IHRyYW5zaXRpb25zOiBCZWhhdmlvclN1YmplY3Q8TmF2aWdhdGlvblRyYW5zaXRpb24+O1xuICBwcml2YXRlIG5hdmlnYXRpb25zOiBPYnNlcnZhYmxlPE5hdmlnYXRpb25UcmFuc2l0aW9uPjtcbiAgcHJpdmF0ZSBsYXN0U3VjY2Vzc2Z1bE5hdmlnYXRpb246IE5hdmlnYXRpb258bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY3VycmVudE5hdmlnYXRpb246IE5hdmlnYXRpb258bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZGlzcG9zZWQgPSBmYWxzZTtcblxuICBwcml2YXRlIGxvY2F0aW9uU3Vic2NyaXB0aW9uPzogU3Vic2NyaXB0aW9uTGlrZTtcbiAgcHJpdmF0ZSBuYXZpZ2F0aW9uSWQ6IG51bWJlciA9IDA7XG5cbiAgLyoqXG4gICAqIFRoZSBpZCBvZiB0aGUgY3VycmVudGx5IGFjdGl2ZSBwYWdlIGluIHRoZSByb3V0ZXIuXG4gICAqIFVwZGF0ZWQgdG8gdGhlIHRyYW5zaXRpb24ncyB0YXJnZXQgaWQgb24gYSBzdWNjZXNzZnVsIG5hdmlnYXRpb24uXG4gICAqXG4gICAqIFRoaXMgaXMgdXNlZCB0byB0cmFjayB3aGF0IHBhZ2UgdGhlIHJvdXRlciBsYXN0IGFjdGl2YXRlZC4gV2hlbiBhbiBhdHRlbXB0ZWQgbmF2aWdhdGlvbiBmYWlscyxcbiAgICogdGhlIHJvdXRlciBjYW4gdGhlbiB1c2UgdGhpcyB0byBjb21wdXRlIGhvdyB0byByZXN0b3JlIHRoZSBzdGF0ZSBiYWNrIHRvIHRoZSBwcmV2aW91c2x5IGFjdGl2ZVxuICAgKiBwYWdlLlxuICAgKi9cbiAgcHJpdmF0ZSBjdXJyZW50UGFnZUlkOiBudW1iZXIgPSAwO1xuICAvKipcbiAgICogVGhlIMm1cm91dGVyUGFnZUlkIG9mIHdoYXRldmVyIHBhZ2UgaXMgY3VycmVudGx5IGFjdGl2ZSBpbiB0aGUgYnJvd3NlciBoaXN0b3J5LiBUaGlzIGlzXG4gICAqIGltcG9ydGFudCBmb3IgY29tcHV0aW5nIHRoZSB0YXJnZXQgcGFnZSBpZCBmb3IgbmV3IG5hdmlnYXRpb25zIGJlY2F1c2Ugd2UgbmVlZCB0byBlbnN1cmUgZWFjaFxuICAgKiBwYWdlIGlkIGluIHRoZSBicm93c2VyIGhpc3RvcnkgaXMgMSBtb3JlIHRoYW4gdGhlIHByZXZpb3VzIGVudHJ5LlxuICAgKi9cbiAgcHJpdmF0ZSBnZXQgYnJvd3NlclBhZ2VJZCgpOiBudW1iZXJ8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gKHRoaXMubG9jYXRpb24uZ2V0U3RhdGUoKSBhcyBSZXN0b3JlZFN0YXRlIHwgbnVsbCk/Lsm1cm91dGVyUGFnZUlkO1xuICB9XG4gIHByaXZhdGUgY29uZmlnTG9hZGVyOiBSb3V0ZXJDb25maWdMb2FkZXI7XG4gIHByaXZhdGUgbmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT47XG4gIHByaXZhdGUgY29uc29sZTogQ29uc29sZTtcbiAgcHJpdmF0ZSBpc05nWm9uZUVuYWJsZWQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAvKipcbiAgICogQW4gZXZlbnQgc3RyZWFtIGZvciByb3V0aW5nIGV2ZW50cyBpbiB0aGlzIE5nTW9kdWxlLlxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IGV2ZW50czogT2JzZXJ2YWJsZTxFdmVudD4gPSBuZXcgU3ViamVjdDxFdmVudD4oKTtcbiAgLyoqXG4gICAqIFRoZSBjdXJyZW50IHN0YXRlIG9mIHJvdXRpbmcgaW4gdGhpcyBOZ01vZHVsZS5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSByb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGU7XG5cbiAgLyoqXG4gICAqIEEgaGFuZGxlciBmb3IgbmF2aWdhdGlvbiBlcnJvcnMgaW4gdGhpcyBOZ01vZHVsZS5cbiAgICovXG4gIGVycm9ySGFuZGxlcjogRXJyb3JIYW5kbGVyID0gZGVmYXVsdEVycm9ySGFuZGxlcjtcblxuICAvKipcbiAgICogQSBoYW5kbGVyIGZvciBlcnJvcnMgdGhyb3duIGJ5IGBSb3V0ZXIucGFyc2VVcmwodXJsKWBcbiAgICogd2hlbiBgdXJsYCBjb250YWlucyBhbiBpbnZhbGlkIGNoYXJhY3Rlci5cbiAgICogVGhlIG1vc3QgY29tbW9uIGNhc2UgaXMgYSBgJWAgc2lnblxuICAgKiB0aGF0J3Mgbm90IGVuY29kZWQgYW5kIGlzIG5vdCBwYXJ0IG9mIGEgcGVyY2VudCBlbmNvZGVkIHNlcXVlbmNlLlxuICAgKi9cbiAgbWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyOlxuICAgICAgKGVycm9yOiBVUklFcnJvciwgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICAgICB1cmw6IHN0cmluZykgPT4gVXJsVHJlZSA9IGRlZmF1bHRNYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIFRydWUgaWYgYXQgbGVhc3Qgb25lIG5hdmlnYXRpb24gZXZlbnQgaGFzIG9jY3VycmVkLFxuICAgKiBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuICBuYXZpZ2F0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSBsYXN0U3VjY2Vzc2Z1bElkOiBudW1iZXIgPSAtMTtcblxuICAvKipcbiAgICogSG9va3MgdGhhdCBlbmFibGUgeW91IHRvIHBhdXNlIG5hdmlnYXRpb24sXG4gICAqIGVpdGhlciBiZWZvcmUgb3IgYWZ0ZXIgdGhlIHByZWFjdGl2YXRpb24gcGhhc2UuXG4gICAqIFVzZWQgYnkgYFJvdXRlck1vZHVsZWAuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgaG9va3M6IHtcbiAgICBiZWZvcmVQcmVhY3RpdmF0aW9uOiBSb3V0ZXJIb29rLFxuICAgIGFmdGVyUHJlYWN0aXZhdGlvbjogUm91dGVySG9va1xuICB9ID0ge2JlZm9yZVByZWFjdGl2YXRpb246IGRlZmF1bHRSb3V0ZXJIb29rLCBhZnRlclByZWFjdGl2YXRpb246IGRlZmF1bHRSb3V0ZXJIb29rfTtcblxuICAvKipcbiAgICogQSBzdHJhdGVneSBmb3IgZXh0cmFjdGluZyBhbmQgbWVyZ2luZyBVUkxzLlxuICAgKiBVc2VkIGZvciBBbmd1bGFySlMgdG8gQW5ndWxhciBtaWdyYXRpb25zLlxuICAgKi9cbiAgdXJsSGFuZGxpbmdTdHJhdGVneTogVXJsSGFuZGxpbmdTdHJhdGVneSA9IG5ldyBEZWZhdWx0VXJsSGFuZGxpbmdTdHJhdGVneSgpO1xuXG4gIC8qKlxuICAgKiBBIHN0cmF0ZWd5IGZvciByZS11c2luZyByb3V0ZXMuXG4gICAqL1xuICByb3V0ZVJldXNlU3RyYXRlZ3k6IFJvdXRlUmV1c2VTdHJhdGVneSA9IG5ldyBEZWZhdWx0Um91dGVSZXVzZVN0cmF0ZWd5KCk7XG5cbiAgLyoqXG4gICAqIEhvdyB0byBoYW5kbGUgYSBuYXZpZ2F0aW9uIHJlcXVlc3QgdG8gdGhlIGN1cnJlbnQgVVJMLiBPbmUgb2Y6XG4gICAqXG4gICAqIC0gYCdpZ25vcmUnYCA6ICBUaGUgcm91dGVyIGlnbm9yZXMgdGhlIHJlcXVlc3QuXG4gICAqIC0gYCdyZWxvYWQnYCA6IFRoZSByb3V0ZXIgcmVsb2FkcyB0aGUgVVJMLiBVc2UgdG8gaW1wbGVtZW50IGEgXCJyZWZyZXNoXCIgZmVhdHVyZS5cbiAgICpcbiAgICogTm90ZSB0aGF0IHRoaXMgb25seSBjb25maWd1cmVzIHdoZXRoZXIgdGhlIFJvdXRlIHJlcHJvY2Vzc2VzIHRoZSBVUkwgYW5kIHRyaWdnZXJzIHJlbGF0ZWRcbiAgICogYWN0aW9uIGFuZCBldmVudHMgbGlrZSByZWRpcmVjdHMsIGd1YXJkcywgYW5kIHJlc29sdmVycy4gQnkgZGVmYXVsdCwgdGhlIHJvdXRlciByZS11c2VzIGFcbiAgICogY29tcG9uZW50IGluc3RhbmNlIHdoZW4gaXQgcmUtbmF2aWdhdGVzIHRvIHRoZSBzYW1lIGNvbXBvbmVudCB0eXBlIHdpdGhvdXQgdmlzaXRpbmcgYSBkaWZmZXJlbnRcbiAgICogY29tcG9uZW50IGZpcnN0LiBUaGlzIGJlaGF2aW9yIGlzIGNvbmZpZ3VyZWQgYnkgdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgLiBJbiBvcmRlciB0byByZWxvYWRcbiAgICogcm91dGVkIGNvbXBvbmVudHMgb24gc2FtZSB1cmwgbmF2aWdhdGlvbiwgeW91IG5lZWQgdG8gc2V0IGBvblNhbWVVcmxOYXZpZ2F0aW9uYCB0byBgJ3JlbG9hZCdgXG4gICAqIF9hbmRfIHByb3ZpZGUgYSBgUm91dGVSZXVzZVN0cmF0ZWd5YCB3aGljaCByZXR1cm5zIGBmYWxzZWAgZm9yIGBzaG91bGRSZXVzZVJvdXRlYC5cbiAgICovXG4gIG9uU2FtZVVybE5hdmlnYXRpb246ICdyZWxvYWQnfCdpZ25vcmUnID0gJ2lnbm9yZSc7XG5cbiAgLyoqXG4gICAqIEhvdyB0byBtZXJnZSBwYXJhbWV0ZXJzLCBkYXRhLCBhbmQgcmVzb2x2ZWQgZGF0YSBmcm9tIHBhcmVudCB0byBjaGlsZFxuICAgKiByb3V0ZXMuIE9uZSBvZjpcbiAgICpcbiAgICogLSBgJ2VtcHR5T25seSdgIDogSW5oZXJpdCBwYXJlbnQgcGFyYW1ldGVycywgZGF0YSwgYW5kIHJlc29sdmVkIGRhdGFcbiAgICogZm9yIHBhdGgtbGVzcyBvciBjb21wb25lbnQtbGVzcyByb3V0ZXMuXG4gICAqIC0gYCdhbHdheXMnYCA6IEluaGVyaXQgcGFyZW50IHBhcmFtZXRlcnMsIGRhdGEsIGFuZCByZXNvbHZlZCBkYXRhXG4gICAqIGZvciBhbGwgY2hpbGQgcm91dGVzLlxuICAgKi9cbiAgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogJ2VtcHR5T25seSd8J2Fsd2F5cycgPSAnZW1wdHlPbmx5JztcblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGVuIHRoZSByb3V0ZXIgdXBkYXRlcyB0aGUgYnJvd3NlciBVUkwuXG4gICAqIEJ5IGRlZmF1bHQgKGBcImRlZmVycmVkXCJgKSwgdXBkYXRlcyB0aGUgYnJvd3NlciBVUkwgYWZ0ZXIgbmF2aWdhdGlvbiBoYXMgZmluaXNoZWQuXG4gICAqIFNldCB0byBgJ2VhZ2VyJ2AgdG8gdXBkYXRlIHRoZSBicm93c2VyIFVSTCBhdCB0aGUgYmVnaW5uaW5nIG9mIG5hdmlnYXRpb24uXG4gICAqIFlvdSBjYW4gY2hvb3NlIHRvIHVwZGF0ZSBlYXJseSBzbyB0aGF0LCBpZiBuYXZpZ2F0aW9uIGZhaWxzLFxuICAgKiB5b3UgY2FuIHNob3cgYW4gZXJyb3IgbWVzc2FnZSB3aXRoIHRoZSBVUkwgdGhhdCBmYWlsZWQuXG4gICAqL1xuICB1cmxVcGRhdGVTdHJhdGVneTogJ2RlZmVycmVkJ3wnZWFnZXInID0gJ2RlZmVycmVkJztcblxuICAvKipcbiAgICogRW5hYmxlcyBhIGJ1ZyBmaXggdGhhdCBjb3JyZWN0cyByZWxhdGl2ZSBsaW5rIHJlc29sdXRpb24gaW4gY29tcG9uZW50cyB3aXRoIGVtcHR5IHBhdGhzLlxuICAgKiBAc2VlIGBSb3V0ZXJNb2R1bGVgXG4gICAqL1xuICByZWxhdGl2ZUxpbmtSZXNvbHV0aW9uOiAnbGVnYWN5J3wnY29ycmVjdGVkJyA9ICdjb3JyZWN0ZWQnO1xuXG4gIC8qKlxuICAgKiBDb25maWd1cmVzIGhvdyB0aGUgUm91dGVyIGF0dGVtcHRzIHRvIHJlc3RvcmUgc3RhdGUgd2hlbiBhIG5hdmlnYXRpb24gaXMgY2FuY2VsbGVkLlxuICAgKlxuICAgKiAncmVwbGFjZScgLSBBbHdheXMgdXNlcyBgbG9jYXRpb24ucmVwbGFjZVN0YXRlYCB0byBzZXQgdGhlIGJyb3dzZXIgc3RhdGUgdG8gdGhlIHN0YXRlIG9mIHRoZVxuICAgKiByb3V0ZXIgYmVmb3JlIHRoZSBuYXZpZ2F0aW9uIHN0YXJ0ZWQuIFRoaXMgbWVhbnMgdGhhdCBpZiB0aGUgVVJMIG9mIHRoZSBicm93c2VyIGlzIHVwZGF0ZWRcbiAgICogX2JlZm9yZV8gdGhlIG5hdmlnYXRpb24gaXMgY2FuY2VsZWQsIHRoZSBSb3V0ZXIgd2lsbCBzaW1wbHkgcmVwbGFjZSB0aGUgaXRlbSBpbiBoaXN0b3J5IHJhdGhlclxuICAgKiB0aGFuIHRyeWluZyB0byByZXN0b3JlIHRvIHRoZSBwcmV2aW91cyBsb2NhdGlvbiBpbiB0aGUgc2Vzc2lvbiBoaXN0b3J5LiBUaGlzIGhhcHBlbnMgbW9zdFxuICAgKiBmcmVxdWVudGx5IHdpdGggYHVybFVwZGF0ZVN0cmF0ZWd5OiAnZWFnZXInYCBhbmQgbmF2aWdhdGlvbnMgd2l0aCB0aGUgYnJvd3NlciBiYWNrL2ZvcndhcmRcbiAgICogYnV0dG9ucy5cbiAgICpcbiAgICogJ2NvbXB1dGVkJyAtIFdpbGwgYXR0ZW1wdCB0byByZXR1cm4gdG8gdGhlIHNhbWUgaW5kZXggaW4gdGhlIHNlc3Npb24gaGlzdG9yeSB0aGF0IGNvcnJlc3BvbmRzXG4gICAqIHRvIHRoZSBBbmd1bGFyIHJvdXRlIHdoZW4gdGhlIG5hdmlnYXRpb24gZ2V0cyBjYW5jZWxsZWQuIEZvciBleGFtcGxlLCBpZiB0aGUgYnJvd3NlciBiYWNrXG4gICAqIGJ1dHRvbiBpcyBjbGlja2VkIGFuZCB0aGUgbmF2aWdhdGlvbiBpcyBjYW5jZWxsZWQsIHRoZSBSb3V0ZXIgd2lsbCB0cmlnZ2VyIGEgZm9yd2FyZCBuYXZpZ2F0aW9uXG4gICAqIGFuZCB2aWNlIHZlcnNhLlxuICAgKlxuICAgKiBOb3RlOiB0aGUgJ2NvbXB1dGVkJyBvcHRpb24gaXMgaW5jb21wYXRpYmxlIHdpdGggYW55IGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCB3aGljaCBvbmx5XG4gICAqIGhhbmRsZXMgYSBwb3J0aW9uIG9mIHRoZSBVUkwgYmVjYXVzZSB0aGUgaGlzdG9yeSByZXN0b3JhdGlvbiBuYXZpZ2F0ZXMgdG8gdGhlIHByZXZpb3VzIHBsYWNlIGluXG4gICAqIHRoZSBicm93c2VyIGhpc3RvcnkgcmF0aGVyIHRoYW4gc2ltcGx5IHJlc2V0dGluZyBhIHBvcnRpb24gb2YgdGhlIFVSTC5cbiAgICpcbiAgICogVGhlIGRlZmF1bHQgdmFsdWUgaXMgYHJlcGxhY2VgLlxuICAgKlxuICAgKi9cbiAgY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbjogJ3JlcGxhY2UnfCdjb21wdXRlZCcgPSAncmVwbGFjZSc7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgdGhlIHJvdXRlciBzZXJ2aWNlLlxuICAgKi9cbiAgLy8gVE9ETzogdnNhdmtpbiBtYWtlIGludGVybmFsIGFmdGVyIHRoZSBmaW5hbCBpcyBvdXQuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+fG51bGwsIHByaXZhdGUgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICAgIHByaXZhdGUgcm9vdENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLCBwcml2YXRlIGxvY2F0aW9uOiBMb2NhdGlvbiwgaW5qZWN0b3I6IEluamVjdG9yLFxuICAgICAgbG9hZGVyOiBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIGNvbXBpbGVyOiBDb21waWxlciwgcHVibGljIGNvbmZpZzogUm91dGVzKSB7XG4gICAgY29uc3Qgb25Mb2FkU3RhcnQgPSAocjogUm91dGUpID0+IHRoaXMudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRTdGFydChyKSk7XG4gICAgY29uc3Qgb25Mb2FkRW5kID0gKHI6IFJvdXRlKSA9PiB0aGlzLnRyaWdnZXJFdmVudChuZXcgUm91dGVDb25maWdMb2FkRW5kKHIpKTtcblxuICAgIHRoaXMubmdNb2R1bGUgPSBpbmplY3Rvci5nZXQoTmdNb2R1bGVSZWYpO1xuICAgIHRoaXMuY29uc29sZSA9IGluamVjdG9yLmdldChDb25zb2xlKTtcbiAgICBjb25zdCBuZ1pvbmUgPSBpbmplY3Rvci5nZXQoTmdab25lKTtcbiAgICB0aGlzLmlzTmdab25lRW5hYmxlZCA9IG5nWm9uZSBpbnN0YW5jZW9mIE5nWm9uZSAmJiBOZ1pvbmUuaXNJbkFuZ3VsYXJab25lKCk7XG5cbiAgICB0aGlzLnJlc2V0Q29uZmlnKGNvbmZpZyk7XG4gICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IGNyZWF0ZUVtcHR5VXJsVHJlZSgpO1xuICAgIHRoaXMucmF3VXJsVHJlZSA9IHRoaXMuY3VycmVudFVybFRyZWU7XG4gICAgdGhpcy5icm93c2VyVXJsVHJlZSA9IHRoaXMuY3VycmVudFVybFRyZWU7XG5cbiAgICB0aGlzLmNvbmZpZ0xvYWRlciA9IG5ldyBSb3V0ZXJDb25maWdMb2FkZXIobG9hZGVyLCBjb21waWxlciwgb25Mb2FkU3RhcnQsIG9uTG9hZEVuZCk7XG4gICAgdGhpcy5yb3V0ZXJTdGF0ZSA9IGNyZWF0ZUVtcHR5U3RhdGUodGhpcy5jdXJyZW50VXJsVHJlZSwgdGhpcy5yb290Q29tcG9uZW50VHlwZSk7XG5cbiAgICB0aGlzLnRyYW5zaXRpb25zID0gbmV3IEJlaGF2aW9yU3ViamVjdDxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4oe1xuICAgICAgaWQ6IDAsXG4gICAgICB0YXJnZXRQYWdlSWQ6IDAsXG4gICAgICBjdXJyZW50VXJsVHJlZTogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIGN1cnJlbnRSYXdVcmw6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBleHRyYWN0ZWRVcmw6IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5leHRyYWN0KHRoaXMuY3VycmVudFVybFRyZWUpLFxuICAgICAgdXJsQWZ0ZXJSZWRpcmVjdHM6IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5leHRyYWN0KHRoaXMuY3VycmVudFVybFRyZWUpLFxuICAgICAgcmF3VXJsOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgZXh0cmFzOiB7fSxcbiAgICAgIHJlc29sdmU6IG51bGwsXG4gICAgICByZWplY3Q6IG51bGwsXG4gICAgICBwcm9taXNlOiBQcm9taXNlLnJlc29sdmUodHJ1ZSksXG4gICAgICBzb3VyY2U6ICdpbXBlcmF0aXZlJyxcbiAgICAgIHJlc3RvcmVkU3RhdGU6IG51bGwsXG4gICAgICBjdXJyZW50U25hcHNob3Q6IHRoaXMucm91dGVyU3RhdGUuc25hcHNob3QsXG4gICAgICB0YXJnZXRTbmFwc2hvdDogbnVsbCxcbiAgICAgIGN1cnJlbnRSb3V0ZXJTdGF0ZTogdGhpcy5yb3V0ZXJTdGF0ZSxcbiAgICAgIHRhcmdldFJvdXRlclN0YXRlOiBudWxsLFxuICAgICAgZ3VhcmRzOiB7Y2FuQWN0aXZhdGVDaGVja3M6IFtdLCBjYW5EZWFjdGl2YXRlQ2hlY2tzOiBbXX0sXG4gICAgICBndWFyZHNSZXN1bHQ6IG51bGwsXG4gICAgfSk7XG4gICAgdGhpcy5uYXZpZ2F0aW9ucyA9IHRoaXMuc2V0dXBOYXZpZ2F0aW9ucyh0aGlzLnRyYW5zaXRpb25zKTtcblxuICAgIHRoaXMucHJvY2Vzc05hdmlnYXRpb25zKCk7XG4gIH1cblxuICBwcml2YXRlIHNldHVwTmF2aWdhdGlvbnModHJhbnNpdGlvbnM6IE9ic2VydmFibGU8TmF2aWdhdGlvblRyYW5zaXRpb24+KTpcbiAgICAgIE9ic2VydmFibGU8TmF2aWdhdGlvblRyYW5zaXRpb24+IHtcbiAgICBjb25zdCBldmVudHNTdWJqZWN0ID0gKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KTtcbiAgICByZXR1cm4gdHJhbnNpdGlvbnMucGlwZShcbiAgICAgICAgICAgICAgIGZpbHRlcih0ID0+IHQuaWQgIT09IDApLFxuXG4gICAgICAgICAgICAgICAvLyBFeHRyYWN0IFVSTFxuICAgICAgICAgICAgICAgbWFwKHQgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgKHsuLi50LCBleHRyYWN0ZWRVcmw6IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5leHRyYWN0KHQucmF3VXJsKX0gYXNcbiAgICAgICAgICAgICAgICAgICAgICAgIE5hdmlnYXRpb25UcmFuc2l0aW9uKSksXG5cbiAgICAgICAgICAgICAgIC8vIFVzaW5nIHN3aXRjaE1hcCBzbyB3ZSBjYW5jZWwgZXhlY3V0aW5nIG5hdmlnYXRpb25zIHdoZW4gYSBuZXcgb25lIGNvbWVzIGluXG4gICAgICAgICAgICAgICBzd2l0Y2hNYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgIGxldCBjb21wbGV0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgbGV0IGVycm9yZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSB0aGUgTmF2aWdhdGlvbiBvYmplY3RcbiAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmF2aWdhdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZDogdC5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBpbml0aWFsVXJsOiB0LmN1cnJlbnRSYXdVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFjdGVkVXJsOiB0LmV4dHJhY3RlZFVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICB0cmlnZ2VyOiB0LnNvdXJjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYXM6IHQuZXh0cmFzLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZpb3VzTmF2aWdhdGlvbjogdGhpcy5sYXN0U3VjY2Vzc2Z1bE5hdmlnYXRpb24gP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Li4udGhpcy5sYXN0U3VjY2Vzc2Z1bE5hdmlnYXRpb24sIHByZXZpb3VzTmF2aWdhdGlvbjogbnVsbH0gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBudWxsXG4gICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYnJvd3NlclVybFRyZWUgPSB0aGlzLmJyb3dzZXJVcmxUcmVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybFRyYW5zaXRpb24gPSAhdGhpcy5uYXZpZ2F0ZWQgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuZXh0cmFjdGVkVXJsLnRvU3RyaW5nKCkgIT09IGJyb3dzZXJVcmxUcmVlIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBOYXZpZ2F0aW9ucyB3aGljaCBzdWNjZWVkIG9yIG9uZXMgd2hpY2ggZmFpbCBhbmQgYXJlIGNsZWFuZWQgdXBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvcnJlY3RseSBzaG91bGQgcmVzdWx0IGluIGBicm93c2VyVXJsVHJlZWAgYW5kIGBjdXJyZW50VXJsVHJlZWBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1hdGNoaW5nLiBJZiB0aGlzIGlzIG5vdCB0aGUgY2FzZSwgYXNzdW1lIHNvbWV0aGluZyB3ZW50IHdyb25nIGFuZCB0cnlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHByb2Nlc3NpbmcgdGhlIFVSTCBhZ2Fpbi5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyb3dzZXJVcmxUcmVlICE9PSB0aGlzLmN1cnJlbnRVcmxUcmVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NDdXJyZW50VXJsID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLm9uU2FtZVVybE5hdmlnYXRpb24gPT09ICdyZWxvYWQnID8gdHJ1ZSA6IHVybFRyYW5zaXRpb24pICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybCh0LnJhd1VybCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIHNvdXJjZSBvZiB0aGUgbmF2aWdhdGlvbiBpcyBmcm9tIGEgYnJvd3NlciBldmVudCwgdGhlIFVSTCBpc1xuICAgICAgICAgICAgICAgICAgICAgICAvLyBhbHJlYWR5IHVwZGF0ZWQuIFdlIGFscmVhZHkgbmVlZCB0byBzeW5jIHRoZSBpbnRlcm5hbCBzdGF0ZS5cbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQnJvd3NlclRyaWdnZXJlZE5hdmlnYXRpb24odC5zb3VyY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETyhhdHNjb3R0KTogdGhpcyBzaG91bGQgYmUgYHQuZXh0cmFjdGVkVXJsYC4gVGhlIGBicm93c2VyVXJsVHJlZWBcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzaG91bGQgb25seSBiZSB0aGUgcGFydCBvZiB0aGUgVVJMIHRoYXQgaXMgaGFuZGxlZCBieSB0aGUgcm91dGVyLiBJblxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFkZGl0aW9uLCB0aGlzIHNob3VsZCBvbmx5IGJlIGRvbmUgaWYgd2UgcHJvY2VzcyB0aGUgY3VycmVudCB1cmwuXG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5icm93c2VyVXJsVHJlZSA9IHQucmF3VXJsO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb2Nlc3NDdXJyZW50VXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpcmUgTmF2aWdhdGlvblN0YXJ0IGV2ZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gdGhpcy50cmFuc2l0aW9ucy5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuZXcgTmF2aWdhdGlvblN0YXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIHQuc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlc3RvcmVkU3RhdGUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHJhbnNpdGlvbiAhPT0gdGhpcy50cmFuc2l0aW9ucy5nZXRWYWx1ZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBkZWxheSBpcyByZXF1aXJlZCB0byBtYXRjaCBvbGQgYmVoYXZpb3IgdGhhdCBmb3JjZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuYXZpZ2F0aW9uIHRvIGFsd2F5cyBiZSBhc3luY1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFwcGx5UmVkaXJlY3RzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcGx5UmVkaXJlY3RzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZ01vZHVsZS5pbmplY3RvciwgdGhpcy5jb25maWdMb2FkZXIsIHRoaXMudXJsU2VyaWFsaXplcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnKSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGN1cnJlbnROYXZpZ2F0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4udGhpcy5jdXJyZW50TmF2aWdhdGlvbiEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5hbFVybDogdC51cmxBZnRlclJlZGlyZWN0c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlY29nbml6ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvZ25pemUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb3RDb21wb25lbnRUeXBlLCB0aGlzLmNvbmZpZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh1cmwpID0+IHRoaXMuc2VyaWFsaXplVXJsKHVybCksIHRoaXMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVsYXRpdmVMaW5rUmVzb2x1dGlvbiksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIFVSTCBpZiBpbiBgZWFnZXJgIHVwZGF0ZSBtb2RlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0LmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMsIHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUT0RPKGF0c2NvdHQpOiBUaGUgYWJvdmUgbGluZSBpcyBpbmNvcnJlY3QuIEl0IHNldHMgdGhlIHVybCB0b1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IHRoZSBwYXJ0IHRoYXQgaXMgaGFuZGxlZCBieSB0aGUgcm91dGVyLiBJdCBzaG91bGQgbWVyZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhhdCB3aXRoIHRoZSByYXdVcmwgc28gdGhlIHVybCBpbmNsdWRlcyBzZWdtZW50cyBub3QgaGFuZGxlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBieSB0aGUgcm91dGVyOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgY29uc3QgcmF3VXJsID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgIHQudXJsQWZ0ZXJSZWRpcmVjdHMsIHQucmF3VXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gIHRoaXMuc2V0QnJvd3NlclVybChyYXdVcmwsIHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5icm93c2VyVXJsVHJlZSA9IHQudXJsQWZ0ZXJSZWRpcmVjdHM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZSBSb3V0ZXNSZWNvZ25pemVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm91dGVzUmVjb2duaXplZCA9IG5ldyBSb3V0ZXNSZWNvZ25pemVkKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ISk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KHJvdXRlc1JlY29nbml6ZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc1ByZXZpb3VzVXJsID0gdXJsVHJhbnNpdGlvbiAmJiB0aGlzLnJhd1VybFRyZWUgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LnNob3VsZFByb2Nlc3NVcmwodGhpcy5yYXdVcmxUcmVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAvKiBXaGVuIHRoZSBjdXJyZW50IFVSTCBzaG91bGRuJ3QgYmUgcHJvY2Vzc2VkLCBidXQgdGhlIHByZXZpb3VzIG9uZSB3YXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICogd2UgaGFuZGxlIHRoaXMgXCJlcnJvciBjb25kaXRpb25cIiBieSBuYXZpZ2F0aW5nIHRvIHRoZSBwcmV2aW91c2x5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICogc3VjY2Vzc2Z1bCBVUkwsIGJ1dCBsZWF2aW5nIHRoZSBVUkwgaW50YWN0LiovXG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb2Nlc3NQcmV2aW91c1VybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qge2lkLCBleHRyYWN0ZWRVcmwsIHNvdXJjZSwgcmVzdG9yZWRTdGF0ZSwgZXh0cmFzfSA9IHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuYXZTdGFydCA9IG5ldyBOYXZpZ2F0aW9uU3RhcnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQsIHRoaXMuc2VyaWFsaXplVXJsKGV4dHJhY3RlZFVybCksIHNvdXJjZSwgcmVzdG9yZWRTdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2U3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0U25hcHNob3QgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZUVtcHR5U3RhdGUoZXh0cmFjdGVkVXJsLCB0aGlzLnJvb3RDb21wb25lbnRUeXBlKS5zbmFwc2hvdDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4udCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0U25hcHNob3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybEFmdGVyUmVkaXJlY3RzOiBleHRyYWN0ZWRVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhczogey4uLmV4dHJhcywgc2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZSwgcmVwbGFjZVVybDogZmFsc2V9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIFdoZW4gbmVpdGhlciB0aGUgY3VycmVudCBvciBwcmV2aW91cyBVUkwgY2FuIGJlIHByb2Nlc3NlZCwgZG8gbm90aGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICogb3RoZXIgdGhhbiB1cGRhdGUgcm91dGVyJ3MgaW50ZXJuYWwgcmVmZXJlbmNlIHRvIHRoZSBjdXJyZW50IFwic2V0dGxlZFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBVUkwuIFRoaXMgd2F5IHRoZSBuZXh0IG5hdmlnYXRpb24gd2lsbCBiZSBjb21pbmcgZnJvbSB0aGUgY3VycmVudCBVUkxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIGluIHRoZSBicm93c2VyLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJhd1VybFRyZWUgPSB0LnJhd1VybDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0LnVybEFmdGVyUmVkaXJlY3RzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIEJlZm9yZSBQcmVhY3RpdmF0aW9uXG4gICAgICAgICAgICAgICAgICAgICBzd2l0Y2hUYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRTbmFwc2hvdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZDogbmF2aWdhdGlvbklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZFVybDogYXBwbGllZFVybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmF3VXJsOiByYXdVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhczoge3NraXBMb2NhdGlvbkNoYW5nZSwgcmVwbGFjZVVybH1cbiAgICAgICAgICAgICAgICAgICAgICAgfSA9IHQ7XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhvb2tzLmJlZm9yZVByZWFjdGl2YXRpb24odGFyZ2V0U25hcHNob3QhLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdGlvbklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFwcGxpZWRVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHJhd1VybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiAhIXNraXBMb2NhdGlvbkNoYW5nZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlVXJsOiAhIXJlcGxhY2VVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIC0tLSBHVUFSRFMgLS0tXG4gICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGd1YXJkc1N0YXJ0ID0gbmV3IEd1YXJkc0NoZWNrU3RhcnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzKSwgdC50YXJnZXRTbmFwc2hvdCEpO1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChndWFyZHNTdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgbWFwKHQgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBndWFyZHM6IGdldEFsbFJvdXRlR3VhcmRzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQudGFyZ2V0U25hcHNob3QhLCB0LmN1cnJlbnRTbmFwc2hvdCwgdGhpcy5yb290Q29udGV4dHMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgfSkpLFxuXG4gICAgICAgICAgICAgICAgICAgICBjaGVja0d1YXJkcyh0aGlzLm5nTW9kdWxlLmluamVjdG9yLCAoZXZ0OiBFdmVudCkgPT4gdGhpcy50cmlnZ2VyRXZlbnQoZXZ0KSksXG4gICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGlmIChpc1VybFRyZWUodC5ndWFyZHNSZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3I6IEVycm9yJnt1cmw/OiBVcmxUcmVlfSA9IG5hdmlnYXRpb25DYW5jZWxpbmdFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYFJlZGlyZWN0aW5nIHRvIFwiJHt0aGlzLnNlcmlhbGl6ZVVybCh0Lmd1YXJkc1Jlc3VsdCl9XCJgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvci51cmwgPSB0Lmd1YXJkc1Jlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGd1YXJkc0VuZCA9IG5ldyBHdWFyZHNDaGVja0VuZChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ISxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICEhdC5ndWFyZHNSZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChndWFyZHNFbmQpO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIGZpbHRlcih0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0Lmd1YXJkc1Jlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZUhpc3RvcnkodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5jZWxOYXZpZ2F0aW9uVHJhbnNpdGlvbih0LCAnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIC0tLSBSRVNPTFZFIC0tLVxuICAgICAgICAgICAgICAgICAgICAgc3dpdGNoVGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAodC5ndWFyZHMuY2FuQWN0aXZhdGVDaGVja3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlU3RhcnQgPSBuZXcgUmVzb2x2ZVN0YXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ISk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQocmVzb2x2ZVN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YVJlc29sdmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmVEYXRhKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LCB0aGlzLm5nTW9kdWxlLmluamVjdG9yKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0OiAoKSA9PiBkYXRhUmVzb2x2ZWQgPSB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGFSZXNvbHZlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc3RvcmVIaXN0b3J5KHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbE5hdmlnYXRpb25UcmFuc2l0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBBdCBsZWFzdCBvbmUgcm91dGUgcmVzb2x2ZXIgZGlkbid0IGVtaXQgYW55IHZhbHVlLmApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlRW5kID0gbmV3IFJlc29sdmVFbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVVcmwodC51cmxBZnRlclJlZGlyZWN0cyksIHQudGFyZ2V0U25hcHNob3QhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChyZXNvbHZlRW5kKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gLS0tIEFGVEVSIFBSRUFDVElWQVRJT04gLS0tXG4gICAgICAgICAgICAgICAgICAgICBzd2l0Y2hUYXAoKHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRTbmFwc2hvdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZDogbmF2aWdhdGlvbklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZFVybDogYXBwbGllZFVybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmF3VXJsOiByYXdVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhczoge3NraXBMb2NhdGlvbkNoYW5nZSwgcmVwbGFjZVVybH1cbiAgICAgICAgICAgICAgICAgICAgICAgfSA9IHQ7XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhvb2tzLmFmdGVyUHJlYWN0aXZhdGlvbih0YXJnZXRTbmFwc2hvdCEsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBuYXZpZ2F0aW9uSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgYXBwbGllZFVybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmF3VXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBza2lwTG9jYXRpb25DaGFuZ2U6ICEhc2tpcExvY2F0aW9uQ2hhbmdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2VVcmw6ICEhcmVwbGFjZVVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgbWFwKCh0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRSb3V0ZXJTdGF0ZSA9IGNyZWF0ZVJvdXRlclN0YXRlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3ksIHQudGFyZ2V0U25hcHNob3QhLCB0LmN1cnJlbnRSb3V0ZXJTdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoey4uLnQsIHRhcmdldFJvdXRlclN0YXRlfSk7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgLyogT25jZSBoZXJlLCB3ZSBhcmUgYWJvdXQgdG8gYWN0aXZhdGUgc3luY3Jvbm91c2x5LiBUaGUgYXNzdW1wdGlvbiBpcyB0aGlzXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWxsIHN1Y2NlZWQsIGFuZCB1c2VyIGNvZGUgbWF5IHJlYWQgZnJvbSB0aGUgUm91dGVyIHNlcnZpY2UuIFRoZXJlZm9yZVxuICAgICAgICAgICAgICAgICAgICAgICAgYmVmb3JlIGFjdGl2YXRpb24sIHdlIG5lZWQgdG8gdXBkYXRlIHJvdXRlciBwcm9wZXJ0aWVzIHN0b3JpbmcgdGhlIGN1cnJlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIFVSTCBhbmQgdGhlIFJvdXRlclN0YXRlLCBhcyB3ZWxsIGFzIHVwZGF0ZWQgdGhlIGJyb3dzZXIgVVJMLiBBbGwgdGhpcyBzaG91bGRcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhcHBlbiAqYmVmb3JlKiBhY3RpdmF0aW5nLiAqL1xuICAgICAgICAgICAgICAgICAgICAgdGFwKCh0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gdC51cmxBZnRlclJlZGlyZWN0cztcbiAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yYXdVcmxUcmVlID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh0LnVybEFmdGVyUmVkaXJlY3RzLCB0LnJhd1VybCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMgYXMge3JvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZX0pLnJvdXRlclN0YXRlID0gdC50YXJnZXRSb3V0ZXJTdGF0ZSE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdkZWZlcnJlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXQuZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHRoaXMucmF3VXJsVHJlZSwgdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0LnVybEFmdGVyUmVkaXJlY3RzO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgYWN0aXZhdGVSb3V0ZXMoXG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb290Q29udGV4dHMsIHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LFxuICAgICAgICAgICAgICAgICAgICAgICAgIChldnQ6IEV2ZW50KSA9PiB0aGlzLnRyaWdnZXJFdmVudChldnQpKSxcblxuICAgICAgICAgICAgICAgICAgICAgdGFwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgbmV4dCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgIGZpbmFsaXplKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgLyogV2hlbiB0aGUgbmF2aWdhdGlvbiBzdHJlYW0gZmluaXNoZXMgZWl0aGVyIHRocm91Z2ggZXJyb3Igb3Igc3VjY2Vzcywgd2VcbiAgICAgICAgICAgICAgICAgICAgICAgICogc2V0IHRoZSBgY29tcGxldGVkYCBvciBgZXJyb3JlZGAgZmxhZy4gSG93ZXZlciwgdGhlcmUgYXJlIHNvbWUgc2l0dWF0aW9uc1xuICAgICAgICAgICAgICAgICAgICAgICAgKiB3aGVyZSB3ZSBjb3VsZCBnZXQgaGVyZSB3aXRob3V0IGVpdGhlciBvZiB0aG9zZSBiZWluZyBzZXQuIEZvciBpbnN0YW5jZSwgYVxuICAgICAgICAgICAgICAgICAgICAgICAgKiByZWRpcmVjdCBkdXJpbmcgTmF2aWdhdGlvblN0YXJ0LiBUaGVyZWZvcmUsIHRoaXMgaXMgYSBjYXRjaC1hbGwgdG8gbWFrZVxuICAgICAgICAgICAgICAgICAgICAgICAgKiBzdXJlIHRoZSBOYXZpZ2F0aW9uQ2FuY2VsXG4gICAgICAgICAgICAgICAgICAgICAgICAqIGV2ZW50IGlzIGZpcmVkIHdoZW4gYSBuYXZpZ2F0aW9uIGdldHMgY2FuY2VsbGVkIGJ1dCBub3QgY2F1Z2h0IGJ5IG90aGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAqIG1lYW5zLiAqL1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbXBsZXRlZCAmJiAhZXJyb3JlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhbmNlbGF0aW9uUmVhc29uID0gYE5hdmlnYXRpb24gSUQgJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5pZH0gaXMgbm90IGVxdWFsIHRvIHRoZSBjdXJyZW50IG5hdmlnYXRpb24gaWQgJHt0aGlzLm5hdmlnYXRpb25JZH1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdyZXBsYWNlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTXVzdCByZXNldCB0byBjdXJyZW50IFVSTCB0cmVlIGhlcmUgdG8gZW5zdXJlIGhpc3Rvcnkuc3RhdGUgaXMgc2V0LiBPblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYSBmcmVzaCBwYWdlIGxvYWQsIGlmIGEgbmV3IG5hdmlnYXRpb24gY29tZXMgaW4gYmVmb3JlIGEgc3VjY2Vzc2Z1bFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmF2aWdhdGlvbiBjb21wbGV0ZXMsIHRoZXJlIHdpbGwgYmUgbm90aGluZyBpblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGlzdG9yeS5zdGF0ZS5uYXZpZ2F0aW9uSWQuIFRoaXMgY2FuIGNhdXNlIHN5bmMgcHJvYmxlbXMgd2l0aFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQW5ndWxhckpTIHN5bmMgY29kZSB3aGljaCBsb29rcyBmb3IgYSB2YWx1ZSBoZXJlIGluIG9yZGVyIHRvIGRldGVybWluZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2hldGhlciBvciBub3QgdG8gaGFuZGxlIGEgZ2l2ZW4gcG9wc3RhdGUgZXZlbnQgb3IgdG8gbGVhdmUgaXQgdG8gdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBbmd1bGFyIHJvdXRlci5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZUhpc3RvcnkodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbE5hdmlnYXRpb25UcmFuc2l0aW9uKHQsIGNhbmNlbGF0aW9uUmVhc29uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2UgY2Fubm90IHRyaWdnZXIgYSBgbG9jYXRpb24uaGlzdG9yeUdvYCBpZiB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNhbmNlbGxhdGlvbiB3YXMgZHVlIHRvIGEgbmV3IG5hdmlnYXRpb24gYmVmb3JlIHRoZSBwcmV2aW91cyBjb3VsZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29tcGxldGUuIFRoaXMgaXMgYmVjYXVzZSBgbG9jYXRpb24uaGlzdG9yeUdvYCB0cmlnZ2VycyBhIGBwb3BzdGF0ZWBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdoaWNoIHdvdWxkIGFsc28gdHJpZ2dlciBhbm90aGVyIG5hdmlnYXRpb24uIEluc3RlYWQsIHRyZWF0IHRoaXMgYXMgYVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVkaXJlY3QgYW5kIGRvIG5vdCByZXNldCB0aGUgc3RhdGUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbE5hdmlnYXRpb25UcmFuc2l0aW9uKHQsIGNhbmNlbGF0aW9uUmVhc29uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRPRE8oYXRzY290dCk6IFRoZSBzYW1lIHByb2JsZW0gaGFwcGVucyBoZXJlIHdpdGggYSBmcmVzaCBwYWdlIGxvYWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFuZCBhIG5ldyBuYXZpZ2F0aW9uIGJlZm9yZSB0aGF0IGNvbXBsZXRlcyB3aGVyZSB3ZSB3b24ndCBzZXQgYSBwYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpZC5cbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgLy8gY3VycmVudE5hdmlnYXRpb24gc2hvdWxkIGFsd2F5cyBiZSByZXNldCB0byBudWxsIGhlcmUuIElmIG5hdmlnYXRpb24gd2FzXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHN1Y2Nlc3NmdWwsIGxhc3RTdWNjZXNzZnVsVHJhbnNpdGlvbiB3aWxsIGhhdmUgYWxyZWFkeSBiZWVuIHNldC4gVGhlcmVmb3JlXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIGNhbiBzYWZlbHkgc2V0IGN1cnJlbnROYXZpZ2F0aW9uIHRvIG51bGwgaGVyZS5cbiAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmF2aWdhdGlvbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgIGNhdGNoRXJyb3IoKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETyhhdHNjb3R0KTogVGhlIE5hdmlnYXRpb25UcmFuc2l0aW9uIGB0YCB1c2VkIGhlcmUgZG9lcyBub3QgYWNjdXJhdGVseVxuICAgICAgICAgICAgICAgICAgICAgICAvLyByZWZsZWN0IHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSB3aG9sZSB0cmFuc2l0aW9uIGJlY2F1c2Ugc29tZSBvcGVyYXRpb25zXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHJldHVybiBhIG5ldyBvYmplY3QgcmF0aGVyIHRoYW4gbW9kaWZ5aW5nIHRoZSBvbmUgaW4gdGhlIG91dGVybW9zdFxuICAgICAgICAgICAgICAgICAgICAgICAvLyBgc3dpdGNoTWFwYC5cbiAgICAgICAgICAgICAgICAgICAgICAgLy8gIFRoZSBmaXggY2FuIGxpa2VseSBiZSB0bzpcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gIDEuIFJlbmFtZSB0aGUgb3V0ZXIgYHRgIHZhcmlhYmxlIHNvIGl0J3Mgbm90IHNoYWRvd2VkIGFsbCB0aGUgdGltZSBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gIGNvbmZ1c2luZ1xuICAgICAgICAgICAgICAgICAgICAgICAvLyAgMi4gS2VlcCByZWFzc2lnbmluZyB0byB0aGUgb3V0ZXIgdmFyaWFibGUgYWZ0ZXIgZWFjaCBzdGFnZSB0byBlbnN1cmUgaXRcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gIGdldHMgdXBkYXRlZC4gT3IgY2hhbmdlIHRoZSBpbXBsZW1lbnRhdGlvbnMgdG8gbm90IHJldHVybiBhIGNvcHkuXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIE5vdCBjaGFuZ2VkIHlldCBiZWNhdXNlIGl0IGFmZmVjdHMgZXhpc3RpbmcgY29kZSBhbmQgd291bGQgbmVlZCB0byBiZVxuICAgICAgICAgICAgICAgICAgICAgICAvLyB0ZXN0ZWQgbW9yZSB0aG9yb3VnaGx5LlxuICAgICAgICAgICAgICAgICAgICAgICBlcnJvcmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgLyogVGhpcyBlcnJvciB0eXBlIGlzIGlzc3VlZCBkdXJpbmcgUmVkaXJlY3QsIGFuZCBpcyBoYW5kbGVkIGFzIGFcbiAgICAgICAgICAgICAgICAgICAgICAgICogY2FuY2VsbGF0aW9uIHJhdGhlciB0aGFuIGFuIGVycm9yLiAqL1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWRpcmVjdGluZyA9IGlzVXJsVHJlZShlLnVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWRpcmVjdGluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHByb3BlcnR5IG9ubHkgaWYgd2UncmUgbm90IHJlZGlyZWN0aW5nLiBJZiB3ZSBsYW5kZWQgb24gYSBwYWdlIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVkaXJlY3QgdG8gYC9gIHJvdXRlLCB0aGUgbmV3IG5hdmlnYXRpb24gaXMgZ29pbmcgdG8gc2VlIHRoZSBgL2BcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlzbid0IGEgY2hhbmdlIGZyb20gdGhlIGRlZmF1bHQgY3VycmVudFVybFRyZWUgYW5kIHdvbid0IG5hdmlnYXRlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBvbmx5IGFwcGxpY2FibGUgd2l0aCBpbml0aWFsIG5hdmlnYXRpb24sIHNvIHNldHRpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGBuYXZpZ2F0ZWRgIG9ubHkgd2hlbiBub3QgcmVkaXJlY3RpbmcgcmVzb2x2ZXMgdGhpcyBzY2VuYXJpby5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZUhpc3RvcnkodCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdkNhbmNlbCA9IG5ldyBOYXZpZ2F0aW9uQ2FuY2VsKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIGUubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdkNhbmNlbCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIHJlZGlyZWN0aW5nLCB3ZSBuZWVkIHRvIGRlbGF5IHJlc29sdmluZyB0aGUgbmF2aWdhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHByb21pc2UgYW5kIHB1c2ggaXQgdG8gdGhlIHJlZGlyZWN0IG5hdmlnYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJlZGlyZWN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlc29sdmUoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzZXRUaW1lb3V0IGlzIHJlcXVpcmVkIHNvIHRoaXMgbmF2aWdhdGlvbiBmaW5pc2hlcyB3aXRoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGUgcmV0dXJuIEVNUFRZIGJlbG93LiBJZiBpdCBpc24ndCBhbGxvd2VkIHRvIGZpbmlzaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHJvY2Vzc2luZywgdGhlcmUgY2FuIGJlIG11bHRpcGxlIG5hdmlnYXRpb25zIHRvIHRoZSBzYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVUkwuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVyZ2VkVHJlZSA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UoZS51cmwsIHRoaXMucmF3VXJsVHJlZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4dHJhcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBza2lwTG9jYXRpb25DaGFuZ2U6IHQuZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgVVJMIGlzIGFscmVhZHkgdXBkYXRlZCBhdCB0aGlzIHBvaW50IGlmIHdlIGhhdmUgJ2VhZ2VyJyBVUkxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGVzIG9yIGlmIHRoZSBuYXZpZ2F0aW9uIHdhcyB0cmlnZ2VyZWQgYnkgdGhlIGJyb3dzZXIgKGJhY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBidXR0b24sIFVSTCBiYXIsIGV0YykuIFdlIHdhbnQgdG8gcmVwbGFjZSB0aGF0IGl0ZW0gaW4gaGlzdG9yeSBpZlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBuYXZpZ2F0aW9uIGlzIHJlamVjdGVkLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2VVcmw6IHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcicgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNCcm93c2VyVHJpZ2dlcmVkTmF2aWdhdGlvbih0LnNvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lcmdlZFRyZWUsICdpbXBlcmF0aXZlJywgbnVsbCwgZXh0cmFzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3Jlc29sdmU6IHQucmVzb2x2ZSwgcmVqZWN0OiB0LnJlamVjdCwgcHJvbWlzZTogdC5wcm9taXNlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAvKiBBbGwgb3RoZXIgZXJyb3JzIHNob3VsZCByZXNldCB0byB0aGUgcm91dGVyJ3MgaW50ZXJuYWwgVVJMIHJlZmVyZW5jZSB0b1xuICAgICAgICAgICAgICAgICAgICAgICAgICAqIHRoZSBwcmUtZXJyb3Igc3RhdGUuICovXG4gICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXN0b3JlSGlzdG9yeSh0LCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuYXZFcnJvciA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOYXZpZ2F0aW9uRXJyb3IodC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCBlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2RXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlc29sdmUodGhpcy5lcnJvckhhbmRsZXIoZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlamVjdChlZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgLy8gVE9ETyhqYXNvbmFkZW4pOiByZW1vdmUgY2FzdCBvbmNlIGczIGlzIG9uIHVwZGF0ZWQgVHlwZVNjcmlwdFxuICAgICAgICAgICAgICAgfSkpIGFzIGFueSBhcyBPYnNlcnZhYmxlPE5hdmlnYXRpb25UcmFuc2l0aW9uPjtcbiAgfVxuXG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICogVE9ETzogdGhpcyBzaG91bGQgYmUgcmVtb3ZlZCBvbmNlIHRoZSBjb25zdHJ1Y3RvciBvZiB0aGUgcm91dGVyIG1hZGUgaW50ZXJuYWxcbiAgICovXG4gIHJlc2V0Um9vdENvbXBvbmVudFR5cGUocm9vdENvbXBvbmVudFR5cGU6IFR5cGU8YW55Pik6IHZvaWQge1xuICAgIHRoaXMucm9vdENvbXBvbmVudFR5cGUgPSByb290Q29tcG9uZW50VHlwZTtcbiAgICAvLyBUT0RPOiB2c2F2a2luIHJvdXRlciA0LjAgc2hvdWxkIG1ha2UgdGhlIHJvb3QgY29tcG9uZW50IHNldCB0byBudWxsXG4gICAgLy8gdGhpcyB3aWxsIHNpbXBsaWZ5IHRoZSBsaWZlY3ljbGUgb2YgdGhlIHJvdXRlci5cbiAgICB0aGlzLnJvdXRlclN0YXRlLnJvb3QuY29tcG9uZW50ID0gdGhpcy5yb290Q29tcG9uZW50VHlwZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VHJhbnNpdGlvbigpOiBOYXZpZ2F0aW9uVHJhbnNpdGlvbiB7XG4gICAgY29uc3QgdHJhbnNpdGlvbiA9IHRoaXMudHJhbnNpdGlvbnMudmFsdWU7XG4gICAgLy8gVE9ETyhhdHNjb3R0KTogVGhpcyBjb21tZW50IGRvZXNuJ3QgbWFrZSBpdCBjbGVhciB3aHkgdGhpcyB2YWx1ZSBuZWVkcyB0byBiZSBzZXQuIEluIHRoZSBjYXNlXG4gICAgLy8gZGVzY3JpYmVkIGJlbG93ICh3aGVyZSB3ZSBkb24ndCBoYW5kbGUgcHJldmlvdXMgb3IgY3VycmVudCB1cmwpLCB0aGUgYGJyb3dzZXJVcmxUcmVlYCBpcyBzZXRcbiAgICAvLyB0byB0aGUgYHVybEFmdGVyUmVkaXJlY3RzYCB2YWx1ZS4gSG93ZXZlciwgdGhlc2UgdmFsdWVzICphcmUgYWxyZWFkeSB0aGUgc2FtZSogYmVjYXVzZSBvZiB0aGVcbiAgICAvLyBsaW5lIGJlbG93LiBTbyBpdCBzZWVtcyB0aGF0IHdlIHNob3VsZCBiZSBhYmxlIHRvIHJlbW92ZSB0aGUgbGluZSBiZWxvdyBhbmQgdGhlIGxpbmUgd2hlcmVcbiAgICAvLyBgYnJvd3NlclVybFRyZWVgIGlzIHVwZGF0ZWQgd2hlbiB3ZSBhcmVuJ3QgaGFuZGxpbmcgYW55IHBhcnQgb2YgdGhlIG5hdmlnYXRpb24gdXJsLlxuICAgIC8vIFJ1biBUR1AgdG8gY29uZmlybSB0aGF0IHRoaXMgY2FuIGJlIGRvbmUuXG5cbiAgICAvLyBUaGlzIHZhbHVlIG5lZWRzIHRvIGJlIHNldC4gT3RoZXIgdmFsdWVzIHN1Y2ggYXMgZXh0cmFjdGVkVXJsIGFyZSBzZXQgb24gaW5pdGlhbCBuYXZpZ2F0aW9uXG4gICAgLy8gYnV0IHRoZSB1cmxBZnRlclJlZGlyZWN0cyBtYXkgbm90IGdldCBzZXQgaWYgd2UgYXJlbid0IHByb2Nlc3NpbmcgdGhlIG5ldyBVUkwgKmFuZCogbm90XG4gICAgLy8gcHJvY2Vzc2luZyB0aGUgcHJldmlvdXMgVVJMLlxuICAgIHRyYW5zaXRpb24udXJsQWZ0ZXJSZWRpcmVjdHMgPSB0aGlzLmJyb3dzZXJVcmxUcmVlO1xuICAgIHJldHVybiB0cmFuc2l0aW9uO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXRUcmFuc2l0aW9uKHQ6IFBhcnRpYWw8TmF2aWdhdGlvblRyYW5zaXRpb24+KTogdm9pZCB7XG4gICAgdGhpcy50cmFuc2l0aW9ucy5uZXh0KHsuLi50aGlzLmdldFRyYW5zaXRpb24oKSwgLi4udH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdXAgdGhlIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lciBhbmQgcGVyZm9ybXMgdGhlIGluaXRpYWwgbmF2aWdhdGlvbi5cbiAgICovXG4gIGluaXRpYWxOYXZpZ2F0aW9uKCk6IHZvaWQge1xuICAgIHRoaXMuc2V0VXBMb2NhdGlvbkNoYW5nZUxpc3RlbmVyKCk7XG4gICAgaWYgKHRoaXMubmF2aWdhdGlvbklkID09PSAwKSB7XG4gICAgICB0aGlzLm5hdmlnYXRlQnlVcmwodGhpcy5sb2NhdGlvbi5wYXRoKHRydWUpLCB7cmVwbGFjZVVybDogdHJ1ZX0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHVwIHRoZSBsb2NhdGlvbiBjaGFuZ2UgbGlzdGVuZXIuIFRoaXMgbGlzdGVuZXIgZGV0ZWN0cyBuYXZpZ2F0aW9ucyB0cmlnZ2VyZWQgZnJvbSBvdXRzaWRlXG4gICAqIHRoZSBSb3V0ZXIgKHRoZSBicm93c2VyIGJhY2svZm9yd2FyZCBidXR0b25zLCBmb3IgZXhhbXBsZSkgYW5kIHNjaGVkdWxlcyBhIGNvcnJlc3BvbmRpbmcgUm91dGVyXG4gICAqIG5hdmlnYXRpb24gc28gdGhhdCB0aGUgY29ycmVjdCBldmVudHMsIGd1YXJkcywgZXRjLiBhcmUgdHJpZ2dlcmVkLlxuICAgKi9cbiAgc2V0VXBMb2NhdGlvbkNoYW5nZUxpc3RlbmVyKCk6IHZvaWQge1xuICAgIC8vIERvbid0IG5lZWQgdG8gdXNlIFpvbmUud3JhcCBhbnkgbW9yZSwgYmVjYXVzZSB6b25lLmpzXG4gICAgLy8gYWxyZWFkeSBwYXRjaCBvblBvcFN0YXRlLCBzbyBsb2NhdGlvbiBjaGFuZ2UgY2FsbGJhY2sgd2lsbFxuICAgIC8vIHJ1biBpbnRvIG5nWm9uZVxuICAgIGlmICghdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbiA9IHRoaXMubG9jYXRpb24uc3Vic2NyaWJlKGV2ZW50ID0+IHtcbiAgICAgICAgY29uc3Qgc291cmNlID0gZXZlbnRbJ3R5cGUnXSA9PT0gJ3BvcHN0YXRlJyA/ICdwb3BzdGF0ZScgOiAnaGFzaGNoYW5nZSc7XG4gICAgICAgIGlmIChzb3VyY2UgPT09ICdwb3BzdGF0ZScpIHtcbiAgICAgICAgICAvLyBUaGUgYHNldFRpbWVvdXRgIHdhcyBhZGRlZCBpbiAjMTIxNjAgYW5kIGlzIGxpa2VseSB0byBzdXBwb3J0IEFuZ3VsYXIvQW5ndWxhckpTXG4gICAgICAgICAgLy8gaHlicmlkIGFwcHMuXG4gICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7cmVwbGFjZVVybDogdHJ1ZX07XG4gICAgICAgICAgICAvLyBOYXZpZ2F0aW9ucyBjb21pbmcgZnJvbSBBbmd1bGFyIHJvdXRlciBoYXZlIGEgbmF2aWdhdGlvbklkIHN0YXRlXG4gICAgICAgICAgICAvLyBwcm9wZXJ0eS4gV2hlbiB0aGlzIGV4aXN0cywgcmVzdG9yZSB0aGUgc3RhdGUuXG4gICAgICAgICAgICBjb25zdCBzdGF0ZSA9IGV2ZW50LnN0YXRlPy5uYXZpZ2F0aW9uSWQgPyBldmVudC5zdGF0ZSA6IG51bGw7XG4gICAgICAgICAgICBpZiAoc3RhdGUpIHtcbiAgICAgICAgICAgICAgY29uc3Qgc3RhdGVDb3B5ID0gey4uLnN0YXRlfSBhcyBQYXJ0aWFsPFJlc3RvcmVkU3RhdGU+O1xuICAgICAgICAgICAgICBkZWxldGUgc3RhdGVDb3B5Lm5hdmlnYXRpb25JZDtcbiAgICAgICAgICAgICAgZGVsZXRlIHN0YXRlQ29weS7JtXJvdXRlclBhZ2VJZDtcbiAgICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKHN0YXRlQ29weSkubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgZXh0cmFzLnN0YXRlID0gc3RhdGVDb3B5O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB1cmxUcmVlID0gdGhpcy5wYXJzZVVybChldmVudFsndXJsJ10hKTtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKHVybFRyZWUsIHNvdXJjZSwgc3RhdGUsIGV4dHJhcyk7XG4gICAgICAgICAgfSwgMCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBUaGUgY3VycmVudCBVUkwuICovXG4gIGdldCB1cmwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5zZXJpYWxpemVVcmwodGhpcy5jdXJyZW50VXJsVHJlZSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgY3VycmVudCBgTmF2aWdhdGlvbmAgb2JqZWN0IHdoZW4gdGhlIHJvdXRlciBpcyBuYXZpZ2F0aW5nLFxuICAgKiBhbmQgYG51bGxgIHdoZW4gaWRsZS5cbiAgICovXG4gIGdldEN1cnJlbnROYXZpZ2F0aW9uKCk6IE5hdmlnYXRpb258bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuY3VycmVudE5hdmlnYXRpb247XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIHRyaWdnZXJFdmVudChldmVudDogRXZlbnQpOiB2b2lkIHtcbiAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pLm5leHQoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0cyB0aGUgcm91dGUgY29uZmlndXJhdGlvbiB1c2VkIGZvciBuYXZpZ2F0aW9uIGFuZCBnZW5lcmF0aW5nIGxpbmtzLlxuICAgKlxuICAgKiBAcGFyYW0gY29uZmlnIFRoZSByb3V0ZSBhcnJheSBmb3IgdGhlIG5ldyBjb25maWd1cmF0aW9uLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLnJlc2V0Q29uZmlnKFtcbiAgICogIHsgcGF0aDogJ3RlYW0vOmlkJywgY29tcG9uZW50OiBUZWFtQ21wLCBjaGlsZHJlbjogW1xuICAgKiAgICB7IHBhdGg6ICdzaW1wbGUnLCBjb21wb25lbnQ6IFNpbXBsZUNtcCB9LFxuICAgKiAgICB7IHBhdGg6ICd1c2VyLzpuYW1lJywgY29tcG9uZW50OiBVc2VyQ21wIH1cbiAgICogIF19XG4gICAqIF0pO1xuICAgKiBgYGBcbiAgICovXG4gIHJlc2V0Q29uZmlnKGNvbmZpZzogUm91dGVzKTogdm9pZCB7XG4gICAgdmFsaWRhdGVDb25maWcoY29uZmlnKTtcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZy5tYXAoc3RhbmRhcmRpemVDb25maWcpO1xuICAgIHRoaXMubmF2aWdhdGVkID0gZmFsc2U7XG4gICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bElkID0gLTE7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuZGlzcG9zZSgpO1xuICB9XG5cbiAgLyoqIERpc3Bvc2VzIG9mIHRoZSByb3V0ZXIuICovXG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgdGhpcy50cmFuc2l0aW9ucy5jb21wbGV0ZSgpO1xuICAgIGlmICh0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICB0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB0aGlzLmRpc3Bvc2VkID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBlbmRzIFVSTCBzZWdtZW50cyB0byB0aGUgY3VycmVudCBVUkwgdHJlZSB0byBjcmVhdGUgYSBuZXcgVVJMIHRyZWUuXG4gICAqXG4gICAqIEBwYXJhbSBjb21tYW5kcyBBbiBhcnJheSBvZiBVUkwgZnJhZ21lbnRzIHdpdGggd2hpY2ggdG8gY29uc3RydWN0IHRoZSBuZXcgVVJMIHRyZWUuXG4gICAqIElmIHRoZSBwYXRoIGlzIHN0YXRpYywgY2FuIGJlIHRoZSBsaXRlcmFsIFVSTCBzdHJpbmcuIEZvciBhIGR5bmFtaWMgcGF0aCwgcGFzcyBhbiBhcnJheSBvZiBwYXRoXG4gICAqIHNlZ21lbnRzLCBmb2xsb3dlZCBieSB0aGUgcGFyYW1ldGVycyBmb3IgZWFjaCBzZWdtZW50LlxuICAgKiBUaGUgZnJhZ21lbnRzIGFyZSBhcHBsaWVkIHRvIHRoZSBjdXJyZW50IFVSTCB0cmVlIG9yIHRoZSBvbmUgcHJvdmlkZWQgIGluIHRoZSBgcmVsYXRpdmVUb2BcbiAgICogcHJvcGVydHkgb2YgdGhlIG9wdGlvbnMgb2JqZWN0LCBpZiBzdXBwbGllZC5cbiAgICogQHBhcmFtIG5hdmlnYXRpb25FeHRyYXMgT3B0aW9ucyB0aGF0IGNvbnRyb2wgdGhlIG5hdmlnYXRpb24gc3RyYXRlZ3kuXG4gICAqIEByZXR1cm5zIFRoZSBuZXcgVVJMIHRyZWUuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvdXNlci8xMVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzO2V4cGFuZD10cnVlL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7ZXhwYW5kOiB0cnVlfSwgJ3VzZXInLCAxMV0pO1xuICAgKlxuICAgKiAvLyB5b3UgY2FuIGNvbGxhcHNlIHN0YXRpYyBzZWdtZW50cyBsaWtlIHRoaXMgKHRoaXMgd29ya3Mgb25seSB3aXRoIHRoZSBmaXJzdCBwYXNzZWQtaW4gdmFsdWUpOlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtLzMzL3VzZXInLCB1c2VySWRdKTtcbiAgICpcbiAgICogLy8gSWYgdGhlIGZpcnN0IHNlZ21lbnQgY2FuIGNvbnRhaW4gc2xhc2hlcywgYW5kIHlvdSBkbyBub3Qgd2FudCB0aGUgcm91dGVyIHRvIHNwbGl0IGl0LFxuICAgKiAvLyB5b3UgY2FuIGRvIHRoZSBmb2xsb3dpbmc6XG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFt7c2VnbWVudFBhdGg6ICcvb25lL3R3byd9XSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMy8odXNlci8xMS8vcmlnaHQ6Y2hhdClcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6ICdjaGF0J319XSk7XG4gICAqXG4gICAqIC8vIHJlbW92ZSB0aGUgcmlnaHQgc2Vjb25kYXJ5IG5vZGVcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6IG51bGx9fV0pO1xuICAgKlxuICAgKiAvLyBhc3N1bWluZyB0aGUgY3VycmVudCB1cmwgaXMgYC90ZWFtLzMzL3VzZXIvMTFgIGFuZCB0aGUgcm91dGUgcG9pbnRzIHRvIGB1c2VyLzExYFxuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzExL2RldGFpbHNcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWydkZXRhaWxzJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzQ0L3VzZXIvMjJcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycuLi8uLi90ZWFtLzQ0L3VzZXIvMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIE5vdGUgdGhhdCBhIHZhbHVlIG9mIGBudWxsYCBvciBgdW5kZWZpbmVkYCBmb3IgYHJlbGF0aXZlVG9gIGluZGljYXRlcyB0aGF0IHRoZVxuICAgKiB0cmVlIHNob3VsZCBiZSBjcmVhdGVkIHJlbGF0aXZlIHRvIHRoZSByb290LlxuICAgKiBgYGBcbiAgICovXG4gIGNyZWF0ZVVybFRyZWUoY29tbWFuZHM6IGFueVtdLCBuYXZpZ2F0aW9uRXh0cmFzOiBVcmxDcmVhdGlvbk9wdGlvbnMgPSB7fSk6IFVybFRyZWUge1xuICAgIGNvbnN0IHtyZWxhdGl2ZVRvLCBxdWVyeVBhcmFtcywgZnJhZ21lbnQsIHF1ZXJ5UGFyYW1zSGFuZGxpbmcsIHByZXNlcnZlRnJhZ21lbnR9ID1cbiAgICAgICAgbmF2aWdhdGlvbkV4dHJhcztcbiAgICBjb25zdCBhID0gcmVsYXRpdmVUbyB8fCB0aGlzLnJvdXRlclN0YXRlLnJvb3Q7XG4gICAgY29uc3QgZiA9IHByZXNlcnZlRnJhZ21lbnQgPyB0aGlzLmN1cnJlbnRVcmxUcmVlLmZyYWdtZW50IDogZnJhZ21lbnQ7XG4gICAgbGV0IHE6IFBhcmFtc3xudWxsID0gbnVsbDtcbiAgICBzd2l0Y2ggKHF1ZXJ5UGFyYW1zSGFuZGxpbmcpIHtcbiAgICAgIGNhc2UgJ21lcmdlJzpcbiAgICAgICAgcSA9IHsuLi50aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zLCAuLi5xdWVyeVBhcmFtc307XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncHJlc2VydmUnOlxuICAgICAgICBxID0gdGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcztcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBxID0gcXVlcnlQYXJhbXMgfHwgbnVsbDtcbiAgICB9XG4gICAgaWYgKHEgIT09IG51bGwpIHtcbiAgICAgIHEgPSB0aGlzLnJlbW92ZUVtcHR5UHJvcHMocSk7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVVcmxUcmVlKGEsIHRoaXMuY3VycmVudFVybFRyZWUsIGNvbW1hbmRzLCBxLCBmID8/IG51bGwpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlcyB0byBhIHZpZXcgdXNpbmcgYW4gYWJzb2x1dGUgcm91dGUgcGF0aC5cbiAgICpcbiAgICogQHBhcmFtIHVybCBBbiBhYnNvbHV0ZSBwYXRoIGZvciBhIGRlZmluZWQgcm91dGUuIFRoZSBmdW5jdGlvbiBkb2VzIG5vdCBhcHBseSBhbnkgZGVsdGEgdG8gdGhlXG4gICAqICAgICBjdXJyZW50IFVSTC5cbiAgICogQHBhcmFtIGV4dHJhcyBBbiBvYmplY3QgY29udGFpbmluZyBwcm9wZXJ0aWVzIHRoYXQgbW9kaWZ5IHRoZSBuYXZpZ2F0aW9uIHN0cmF0ZWd5LlxuICAgKlxuICAgKiBAcmV0dXJucyBBIFByb21pc2UgdGhhdCByZXNvbHZlcyB0byAndHJ1ZScgd2hlbiBuYXZpZ2F0aW9uIHN1Y2NlZWRzLFxuICAgKiB0byAnZmFsc2UnIHdoZW4gbmF2aWdhdGlvbiBmYWlscywgb3IgaXMgcmVqZWN0ZWQgb24gZXJyb3IuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIFRoZSBmb2xsb3dpbmcgY2FsbHMgcmVxdWVzdCBuYXZpZ2F0aW9uIHRvIGFuIGFic29sdXRlIHBhdGguXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIubmF2aWdhdGVCeVVybChcIi90ZWFtLzMzL3VzZXIvMTFcIik7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTFxuICAgKiByb3V0ZXIubmF2aWdhdGVCeVVybChcIi90ZWFtLzMzL3VzZXIvMTFcIiwgeyBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpXG4gICAqXG4gICAqL1xuICBuYXZpZ2F0ZUJ5VXJsKHVybDogc3RyaW5nfFVybFRyZWUsIGV4dHJhczogTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyA9IHtcbiAgICBza2lwTG9jYXRpb25DaGFuZ2U6IGZhbHNlXG4gIH0pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHxcbiAgICAgICAgbmdEZXZNb2RlICYmIHRoaXMuaXNOZ1pvbmVFbmFibGVkICYmICFOZ1pvbmUuaXNJbkFuZ3VsYXJab25lKCkpIHtcbiAgICAgIHRoaXMuY29uc29sZS53YXJuKFxuICAgICAgICAgIGBOYXZpZ2F0aW9uIHRyaWdnZXJlZCBvdXRzaWRlIEFuZ3VsYXIgem9uZSwgZGlkIHlvdSBmb3JnZXQgdG8gY2FsbCAnbmdab25lLnJ1bigpJz9gKTtcbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gaXNVcmxUcmVlKHVybCkgPyB1cmwgOiB0aGlzLnBhcnNlVXJsKHVybCk7XG4gICAgY29uc3QgbWVyZ2VkVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh1cmxUcmVlLCB0aGlzLnJhd1VybFRyZWUpO1xuXG4gICAgcmV0dXJuIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKG1lcmdlZFRyZWUsICdpbXBlcmF0aXZlJywgbnVsbCwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZSBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgYXJyYXkgb2YgY29tbWFuZHMgYW5kIGEgc3RhcnRpbmcgcG9pbnQuXG4gICAqIElmIG5vIHN0YXJ0aW5nIHJvdXRlIGlzIHByb3ZpZGVkLCB0aGUgbmF2aWdhdGlvbiBpcyBhYnNvbHV0ZS5cbiAgICpcbiAgICogQHBhcmFtIGNvbW1hbmRzIEFuIGFycmF5IG9mIFVSTCBmcmFnbWVudHMgd2l0aCB3aGljaCB0byBjb25zdHJ1Y3QgdGhlIHRhcmdldCBVUkwuXG4gICAqIElmIHRoZSBwYXRoIGlzIHN0YXRpYywgY2FuIGJlIHRoZSBsaXRlcmFsIFVSTCBzdHJpbmcuIEZvciBhIGR5bmFtaWMgcGF0aCwgcGFzcyBhbiBhcnJheSBvZiBwYXRoXG4gICAqIHNlZ21lbnRzLCBmb2xsb3dlZCBieSB0aGUgcGFyYW1ldGVycyBmb3IgZWFjaCBzZWdtZW50LlxuICAgKiBUaGUgZnJhZ21lbnRzIGFyZSBhcHBsaWVkIHRvIHRoZSBjdXJyZW50IFVSTCBvciB0aGUgb25lIHByb3ZpZGVkICBpbiB0aGUgYHJlbGF0aXZlVG9gIHByb3BlcnR5XG4gICAqIG9mIHRoZSBvcHRpb25zIG9iamVjdCwgaWYgc3VwcGxpZWQuXG4gICAqIEBwYXJhbSBleHRyYXMgQW4gb3B0aW9ucyBvYmplY3QgdGhhdCBkZXRlcm1pbmVzIGhvdyB0aGUgVVJMIHNob3VsZCBiZSBjb25zdHJ1Y3RlZCBvclxuICAgKiAgICAgaW50ZXJwcmV0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGB0cnVlYCB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsIHRvIGBmYWxzZWAgd2hlbiBuYXZpZ2F0aW9uXG4gICAqICAgICBmYWlscyxcbiAgICogb3IgaXMgcmVqZWN0ZWQgb24gZXJyb3IuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIFRoZSBmb2xsb3dpbmcgY2FsbHMgcmVxdWVzdCBuYXZpZ2F0aW9uIHRvIGEgZHluYW1pYyByb3V0ZSBwYXRoIHJlbGF0aXZlIHRvIHRoZSBjdXJyZW50IFVSTC5cbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZShbJ3RlYW0nLCAzMywgJ3VzZXInLCAxMV0sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBOYXZpZ2F0ZSB3aXRob3V0IHVwZGF0aW5nIHRoZSBVUkwsIG92ZXJyaWRpbmcgdGhlIGRlZmF1bHQgYmVoYXZpb3JcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlLCBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWV9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRlcilcbiAgICpcbiAgICovXG4gIG5hdmlnYXRlKGNvbW1hbmRzOiBhbnlbXSwgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3NraXBMb2NhdGlvbkNoYW5nZTogZmFsc2V9KTpcbiAgICAgIFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHMpO1xuICAgIHJldHVybiB0aGlzLm5hdmlnYXRlQnlVcmwodGhpcy5jcmVhdGVVcmxUcmVlKGNvbW1hbmRzLCBleHRyYXMpLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqIFNlcmlhbGl6ZXMgYSBgVXJsVHJlZWAgaW50byBhIHN0cmluZyAqL1xuICBzZXJpYWxpemVVcmwodXJsOiBVcmxUcmVlKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICB9XG5cbiAgLyoqIFBhcnNlcyBhIHN0cmluZyBpbnRvIGEgYFVybFRyZWVgICovXG4gIHBhcnNlVXJsKHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gICAgbGV0IHVybFRyZWU6IFVybFRyZWU7XG4gICAgdHJ5IHtcbiAgICAgIHVybFRyZWUgPSB0aGlzLnVybFNlcmlhbGl6ZXIucGFyc2UodXJsKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB1cmxUcmVlID0gdGhpcy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIoZSwgdGhpcy51cmxTZXJpYWxpemVyLCB1cmwpO1xuICAgIH1cbiAgICByZXR1cm4gdXJsVHJlZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHdoZXRoZXIgdGhlIHVybCBpcyBhY3RpdmF0ZWQuXG4gICAqXG4gICAqIEBkZXByZWNhdGVkXG4gICAqIFVzZSBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIGluc3RlYWQuXG4gICAqXG4gICAqIC0gVGhlIGVxdWl2YWxlbnQgYElzQWN0aXZlTWF0Y2hPcHRpb25zYCBmb3IgYHRydWVgIGlzXG4gICAqIGB7cGF0aHM6ICdleGFjdCcsIHF1ZXJ5UGFyYW1zOiAnZXhhY3QnLCBmcmFnbWVudDogJ2lnbm9yZWQnLCBtYXRyaXhQYXJhbXM6ICdpZ25vcmVkJ31gLlxuICAgKiAtIFRoZSBlcXVpdmFsZW50IGZvciBgZmFsc2VgIGlzXG4gICAqIGB7cGF0aHM6ICdzdWJzZXQnLCBxdWVyeVBhcmFtczogJ3N1YnNldCcsIGZyYWdtZW50OiAnaWdub3JlZCcsIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnfWAuXG4gICAqL1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBleGFjdDogYm9vbGVhbik6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBSZXR1cm5zIHdoZXRoZXIgdGhlIHVybCBpcyBhY3RpdmF0ZWQuXG4gICAqL1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBtYXRjaE9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zKTogYm9vbGVhbjtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBtYXRjaE9wdGlvbnM6IGJvb2xlYW58SXNBY3RpdmVNYXRjaE9wdGlvbnMpOiBib29sZWFuO1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBtYXRjaE9wdGlvbnM6IGJvb2xlYW58SXNBY3RpdmVNYXRjaE9wdGlvbnMpOiBib29sZWFuIHtcbiAgICBsZXQgb3B0aW9uczogSXNBY3RpdmVNYXRjaE9wdGlvbnM7XG4gICAgaWYgKG1hdGNoT3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucyA9IHsuLi5leGFjdE1hdGNoT3B0aW9uc307XG4gICAgfSBlbHNlIGlmIChtYXRjaE9wdGlvbnMgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zID0gey4uLnN1YnNldE1hdGNoT3B0aW9uc307XG4gICAgfSBlbHNlIHtcbiAgICAgIG9wdGlvbnMgPSBtYXRjaE9wdGlvbnM7XG4gICAgfVxuICAgIGlmIChpc1VybFRyZWUodXJsKSkge1xuICAgICAgcmV0dXJuIGNvbnRhaW5zVHJlZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB1cmwsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGNvbnN0IHVybFRyZWUgPSB0aGlzLnBhcnNlVXJsKHVybCk7XG4gICAgcmV0dXJuIGNvbnRhaW5zVHJlZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB1cmxUcmVlLCBvcHRpb25zKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVtb3ZlRW1wdHlQcm9wcyhwYXJhbXM6IFBhcmFtcyk6IFBhcmFtcyB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHBhcmFtcykucmVkdWNlKChyZXN1bHQ6IFBhcmFtcywga2V5OiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlOiBhbnkgPSBwYXJhbXNba2V5XTtcbiAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sIHt9KTtcbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc05hdmlnYXRpb25zKCk6IHZvaWQge1xuICAgIHRoaXMubmF2aWdhdGlvbnMuc3Vic2NyaWJlKFxuICAgICAgICB0ID0+IHtcbiAgICAgICAgICB0aGlzLm5hdmlnYXRlZCA9IHRydWU7XG4gICAgICAgICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bElkID0gdC5pZDtcbiAgICAgICAgICB0aGlzLmN1cnJlbnRQYWdlSWQgPSB0LnRhcmdldFBhZ2VJZDtcbiAgICAgICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgICAgIC5uZXh0KG5ldyBOYXZpZ2F0aW9uRW5kKFxuICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCB0aGlzLnNlcmlhbGl6ZVVybCh0aGlzLmN1cnJlbnRVcmxUcmVlKSkpO1xuICAgICAgICAgIHRoaXMubGFzdFN1Y2Nlc3NmdWxOYXZpZ2F0aW9uID0gdGhpcy5jdXJyZW50TmF2aWdhdGlvbjtcbiAgICAgICAgICB0LnJlc29sdmUodHJ1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGUgPT4ge1xuICAgICAgICAgIHRoaXMuY29uc29sZS53YXJuKGBVbmhhbmRsZWQgTmF2aWdhdGlvbiBFcnJvcjogJHtlfWApO1xuICAgICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2NoZWR1bGVOYXZpZ2F0aW9uKFxuICAgICAgcmF3VXJsOiBVcmxUcmVlLCBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLCByZXN0b3JlZFN0YXRlOiBSZXN0b3JlZFN0YXRlfG51bGwsXG4gICAgICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMsXG4gICAgICBwcmlvclByb21pc2U/OiB7cmVzb2x2ZTogYW55LCByZWplY3Q6IGFueSwgcHJvbWlzZTogUHJvbWlzZTxib29sZWFuPn0pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAodGhpcy5kaXNwb3NlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShmYWxzZSk7XG4gICAgfVxuXG4gICAgLy8gKiBJbXBlcmF0aXZlIG5hdmlnYXRpb25zIChyb3V0ZXIubmF2aWdhdGUpIG1pZ2h0IHRyaWdnZXIgYWRkaXRpb25hbCBuYXZpZ2F0aW9ucyB0byB0aGUgc2FtZVxuICAgIC8vICAgVVJMIHZpYSBhIHBvcHN0YXRlIGV2ZW50IGFuZCB0aGUgbG9jYXRpb25DaGFuZ2VMaXN0ZW5lci4gV2Ugc2hvdWxkIHNraXAgdGhlc2UgZHVwbGljYXRlXG4gICAgLy8gICBuYXZzLiBEdXBsaWNhdGVzIG1heSBhbHNvIGJlIHRyaWdnZXJlZCBieSBhdHRlbXB0cyB0byBzeW5jIEFuZ3VsYXJKUyBhbmQgQW5ndWxhciByb3V0ZXJcbiAgICAvLyAgIHN0YXRlcy5cbiAgICAvLyAqIEltcGVyYXRpdmUgbmF2aWdhdGlvbnMgY2FuIGJlIGNhbmNlbGxlZCBieSByb3V0ZXIgZ3VhcmRzLCBtZWFuaW5nIHRoZSBVUkwgd29uJ3QgY2hhbmdlLiBJZlxuICAgIC8vICAgdGhlIHVzZXIgZm9sbG93cyB0aGF0IHdpdGggYSBuYXZpZ2F0aW9uIHVzaW5nIHRoZSBiYWNrL2ZvcndhcmQgYnV0dG9uIG9yIG1hbnVhbCBVUkwgY2hhbmdlLFxuICAgIC8vICAgdGhlIGRlc3RpbmF0aW9uIG1heSBiZSB0aGUgc2FtZSBhcyB0aGUgcHJldmlvdXMgaW1wZXJhdGl2ZSBhdHRlbXB0LiBXZSBzaG91bGQgbm90IHNraXBcbiAgICAvLyAgIHRoZXNlIG5hdmlnYXRpb25zIGJlY2F1c2UgaXQncyBhIHNlcGFyYXRlIGNhc2UgZnJvbSB0aGUgb25lIGFib3ZlIC0tIGl0J3Mgbm90IGEgZHVwbGljYXRlXG4gICAgLy8gICBuYXZpZ2F0aW9uLlxuICAgIGNvbnN0IGxhc3ROYXZpZ2F0aW9uID0gdGhpcy5nZXRUcmFuc2l0aW9uKCk7XG4gICAgLy8gV2UgZG9uJ3Qgd2FudCB0byBza2lwIGR1cGxpY2F0ZSBzdWNjZXNzZnVsIG5hdnMgaWYgdGhleSdyZSBpbXBlcmF0aXZlIGJlY2F1c2VcbiAgICAvLyBvblNhbWVVcmxOYXZpZ2F0aW9uIGNvdWxkIGJlICdyZWxvYWQnIChzbyB0aGUgZHVwbGljYXRlIGlzIGludGVuZGVkKS5cbiAgICBjb25zdCBicm93c2VyTmF2UHJlY2VkZWRCeVJvdXRlck5hdiA9IGlzQnJvd3NlclRyaWdnZXJlZE5hdmlnYXRpb24oc291cmNlKSAmJiBsYXN0TmF2aWdhdGlvbiAmJlxuICAgICAgICAhaXNCcm93c2VyVHJpZ2dlcmVkTmF2aWdhdGlvbihsYXN0TmF2aWdhdGlvbi5zb3VyY2UpO1xuICAgIGNvbnN0IGxhc3ROYXZpZ2F0aW9uU3VjY2VlZGVkID0gdGhpcy5sYXN0U3VjY2Vzc2Z1bElkID09PSBsYXN0TmF2aWdhdGlvbi5pZDtcbiAgICAvLyBJZiB0aGUgbGFzdCBuYXZpZ2F0aW9uIHN1Y2NlZWRlZCBvciBpcyBpbiBmbGlnaHQsIHdlIGNhbiB1c2UgdGhlIHJhd1VybCBhcyB0aGUgY29tcGFyaXNvbi5cbiAgICAvLyBIb3dldmVyLCBpZiBpdCBmYWlsZWQsIHdlIHNob3VsZCBjb21wYXJlIHRvIHRoZSBmaW5hbCByZXN1bHQgKHVybEFmdGVyUmVkaXJlY3RzKS5cbiAgICBjb25zdCBsYXN0TmF2aWdhdGlvblVybCA9IChsYXN0TmF2aWdhdGlvblN1Y2NlZWRlZCB8fCB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uKSA/XG4gICAgICAgIGxhc3ROYXZpZ2F0aW9uLnJhd1VybCA6XG4gICAgICAgIGxhc3ROYXZpZ2F0aW9uLnVybEFmdGVyUmVkaXJlY3RzO1xuICAgIGNvbnN0IGR1cGxpY2F0ZU5hdiA9IGxhc3ROYXZpZ2F0aW9uVXJsLnRvU3RyaW5nKCkgPT09IHJhd1VybC50b1N0cmluZygpO1xuICAgIGlmIChicm93c2VyTmF2UHJlY2VkZWRCeVJvdXRlck5hdiAmJiBkdXBsaWNhdGVOYXYpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJ1ZSk7ICAvLyByZXR1cm4gdmFsdWUgaXMgbm90IHVzZWRcbiAgICB9XG5cbiAgICBsZXQgcmVzb2x2ZTogYW55O1xuICAgIGxldCByZWplY3Q6IGFueTtcbiAgICBsZXQgcHJvbWlzZTogUHJvbWlzZTxib29sZWFuPjtcbiAgICBpZiAocHJpb3JQcm9taXNlKSB7XG4gICAgICByZXNvbHZlID0gcHJpb3JQcm9taXNlLnJlc29sdmU7XG4gICAgICByZWplY3QgPSBwcmlvclByb21pc2UucmVqZWN0O1xuICAgICAgcHJvbWlzZSA9IHByaW9yUHJvbWlzZS5wcm9taXNlO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHByb21pc2UgPSBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzLCByZWopID0+IHtcbiAgICAgICAgcmVzb2x2ZSA9IHJlcztcbiAgICAgICAgcmVqZWN0ID0gcmVqO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgaWQgPSArK3RoaXMubmF2aWdhdGlvbklkO1xuICAgIGxldCB0YXJnZXRQYWdlSWQ6IG51bWJlcjtcbiAgICBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAnY29tcHV0ZWQnKSB7XG4gICAgICBjb25zdCBpc0luaXRpYWxQYWdlID0gdGhpcy5jdXJyZW50UGFnZUlkID09PSAwO1xuICAgICAgaWYgKGlzSW5pdGlhbFBhZ2UpIHtcbiAgICAgICAgcmVzdG9yZWRTdGF0ZSA9IHRoaXMubG9jYXRpb24uZ2V0U3RhdGUoKSBhcyBSZXN0b3JlZFN0YXRlIHwgbnVsbDtcbiAgICAgIH1cbiAgICAgIC8vIElmIHRoZSBgybVyb3V0ZXJQYWdlSWRgIGV4aXN0IGluIHRoZSBzdGF0ZSB0aGVuIGB0YXJnZXRwYWdlSWRgIHNob3VsZCBoYXZlIHRoZSB2YWx1ZSBvZlxuICAgICAgLy8gYMm1cm91dGVyUGFnZUlkYC4gVGhpcyBpcyB0aGUgY2FzZSBmb3Igc29tZXRoaW5nIGxpa2UgYSBwYWdlIHJlZnJlc2ggd2hlcmUgd2UgYXNzaWduIHRoZVxuICAgICAgLy8gdGFyZ2V0IGlkIHRvIHRoZSBwcmV2aW91c2x5IHNldCB2YWx1ZSBmb3IgdGhhdCBwYWdlLlxuICAgICAgaWYgKHJlc3RvcmVkU3RhdGUgJiYgcmVzdG9yZWRTdGF0ZS7JtXJvdXRlclBhZ2VJZCkge1xuICAgICAgICB0YXJnZXRQYWdlSWQgPSByZXN0b3JlZFN0YXRlLsm1cm91dGVyUGFnZUlkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgd2UncmUgcmVwbGFjaW5nIHRoZSBVUkwgb3IgZG9pbmcgYSBzaWxlbnQgbmF2aWdhdGlvbiwgd2UgZG8gbm90IHdhbnQgdG8gaW5jcmVtZW50IHRoZVxuICAgICAgICAvLyBwYWdlIGlkIGJlY2F1c2Ugd2UgYXJlbid0IHB1c2hpbmcgYSBuZXcgZW50cnkgdG8gaGlzdG9yeS5cbiAgICAgICAgaWYgKGV4dHJhcy5yZXBsYWNlVXJsIHx8IGV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgICB0YXJnZXRQYWdlSWQgPSB0aGlzLmJyb3dzZXJQYWdlSWQgPz8gMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0YXJnZXRQYWdlSWQgPSAodGhpcy5icm93c2VyUGFnZUlkID8/IDApICsgMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGlzIGlzIHVudXNlZCB3aGVuIGBjYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uYCBpcyBub3QgY29tcHV0ZWQuXG4gICAgICB0YXJnZXRQYWdlSWQgPSAwO1xuICAgIH1cblxuICAgIHRoaXMuc2V0VHJhbnNpdGlvbih7XG4gICAgICBpZCxcbiAgICAgIHRhcmdldFBhZ2VJZCxcbiAgICAgIHNvdXJjZSxcbiAgICAgIHJlc3RvcmVkU3RhdGUsXG4gICAgICBjdXJyZW50VXJsVHJlZTogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIGN1cnJlbnRSYXdVcmw6IHRoaXMucmF3VXJsVHJlZSxcbiAgICAgIHJhd1VybCxcbiAgICAgIGV4dHJhcyxcbiAgICAgIHJlc29sdmUsXG4gICAgICByZWplY3QsXG4gICAgICBwcm9taXNlLFxuICAgICAgY3VycmVudFNuYXBzaG90OiB0aGlzLnJvdXRlclN0YXRlLnNuYXBzaG90LFxuICAgICAgY3VycmVudFJvdXRlclN0YXRlOiB0aGlzLnJvdXRlclN0YXRlXG4gICAgfSk7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhhdCB0aGUgZXJyb3IgaXMgcHJvcGFnYXRlZCBldmVuIHRob3VnaCBgcHJvY2Vzc05hdmlnYXRpb25zYCBjYXRjaFxuICAgIC8vIGhhbmRsZXIgZG9lcyBub3QgcmV0aHJvd1xuICAgIHJldHVybiBwcm9taXNlLmNhdGNoKChlOiBhbnkpID0+IHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0QnJvd3NlclVybCh1cmw6IFVybFRyZWUsIHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uKSB7XG4gICAgY29uc3QgcGF0aCA9IHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodXJsKTtcbiAgICBjb25zdCBzdGF0ZSA9IHsuLi50LmV4dHJhcy5zdGF0ZSwgLi4udGhpcy5nZW5lcmF0ZU5nUm91dGVyU3RhdGUodC5pZCwgdC50YXJnZXRQYWdlSWQpfTtcbiAgICBpZiAodGhpcy5sb2NhdGlvbi5pc0N1cnJlbnRQYXRoRXF1YWxUbyhwYXRoKSB8fCAhIXQuZXh0cmFzLnJlcGxhY2VVcmwpIHtcbiAgICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKHBhdGgsICcnLCBzdGF0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubG9jYXRpb24uZ28ocGF0aCwgJycsIHN0YXRlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybXMgdGhlIG5lY2Vzc2FyeSByb2xsYmFjayBhY3Rpb24gdG8gcmVzdG9yZSB0aGUgYnJvd3NlciBVUkwgdG8gdGhlXG4gICAqIHN0YXRlIGJlZm9yZSB0aGUgdHJhbnNpdGlvbi5cbiAgICovXG4gIHByaXZhdGUgcmVzdG9yZUhpc3RvcnkodDogTmF2aWdhdGlvblRyYW5zaXRpb24sIHJlc3RvcmluZ0Zyb21DYXVnaHRFcnJvciA9IGZhbHNlKSB7XG4gICAgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ2NvbXB1dGVkJykge1xuICAgICAgY29uc3QgdGFyZ2V0UGFnZVBvc2l0aW9uID0gdGhpcy5jdXJyZW50UGFnZUlkIC0gdC50YXJnZXRQYWdlSWQ7XG4gICAgICAvLyBUaGUgbmF2aWdhdG9yIGNoYW5nZSB0aGUgbG9jYXRpb24gYmVmb3JlIHRyaWdnZXJlZCB0aGUgYnJvd3NlciBldmVudCxcbiAgICAgIC8vIHNvIHdlIG5lZWQgdG8gZ28gYmFjayB0byB0aGUgY3VycmVudCB1cmwgaWYgdGhlIG5hdmlnYXRpb24gaXMgY2FuY2VsZWQuXG4gICAgICAvLyBBbHNvLCB3aGVuIG5hdmlnYXRpb24gZ2V0cyBjYW5jZWxsZWQgd2hpbGUgdXNpbmcgdXJsIHVwZGF0ZSBzdHJhdGVneSBlYWdlciwgdGhlbiB3ZSBuZWVkIHRvXG4gICAgICAvLyBnbyBiYWNrLiBCZWNhdXNlLCB3aGVuIGB1cmxVcGRhdGVTcmF0ZWd5YCBpcyBgZWFnZXJgOyBgc2V0QnJvd3NlclVybGAgbWV0aG9kIGlzIGNhbGxlZFxuICAgICAgLy8gYmVmb3JlIGFueSB2ZXJpZmljYXRpb24uXG4gICAgICBjb25zdCBicm93c2VyVXJsVXBkYXRlT2NjdXJyZWQgPVxuICAgICAgICAgICh0LnNvdXJjZSA9PT0gJ3BvcHN0YXRlJyB8fCB0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZWFnZXInIHx8XG4gICAgICAgICAgIHRoaXMuY3VycmVudFVybFRyZWUgPT09IHRoaXMuY3VycmVudE5hdmlnYXRpb24/LmZpbmFsVXJsKTtcbiAgICAgIGlmIChicm93c2VyVXJsVXBkYXRlT2NjdXJyZWQgJiYgdGFyZ2V0UGFnZVBvc2l0aW9uICE9PSAwKSB7XG4gICAgICAgIHRoaXMubG9jYXRpb24uaGlzdG9yeUdvKHRhcmdldFBhZ2VQb3NpdGlvbik7XG4gICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgIHRoaXMuY3VycmVudFVybFRyZWUgPT09IHRoaXMuY3VycmVudE5hdmlnYXRpb24/LmZpbmFsVXJsICYmIHRhcmdldFBhZ2VQb3NpdGlvbiA9PT0gMCkge1xuICAgICAgICAvLyBXZSBnb3QgdG8gdGhlIGFjdGl2YXRpb24gc3RhZ2UgKHdoZXJlIGN1cnJlbnRVcmxUcmVlIGlzIHNldCB0byB0aGUgbmF2aWdhdGlvbidzXG4gICAgICAgIC8vIGZpbmFsVXJsKSwgYnV0IHdlIHdlcmVuJ3QgbW92aW5nIGFueXdoZXJlIGluIGhpc3RvcnkgKHNraXBMb2NhdGlvbkNoYW5nZSBvciByZXBsYWNlVXJsKS5cbiAgICAgICAgLy8gV2Ugc3RpbGwgbmVlZCB0byByZXNldCB0aGUgcm91dGVyIHN0YXRlIGJhY2sgdG8gd2hhdCBpdCB3YXMgd2hlbiB0aGUgbmF2aWdhdGlvbiBzdGFydGVkLlxuICAgICAgICB0aGlzLnJlc2V0U3RhdGUodCk7XG4gICAgICAgIC8vIFRPRE8oYXRzY290dCk6IHJlc2V0dGluZyB0aGUgYGJyb3dzZXJVcmxUcmVlYCBzaG91bGQgcmVhbGx5IGJlIGRvbmUgaW4gYHJlc2V0U3RhdGVgLlxuICAgICAgICAvLyBJbnZlc3RpZ2F0ZSBpZiB0aGlzIGNhbiBiZSBkb25lIGJ5IHJ1bm5pbmcgVEdQLlxuICAgICAgICB0aGlzLmJyb3dzZXJVcmxUcmVlID0gdC5jdXJyZW50VXJsVHJlZTtcbiAgICAgICAgdGhpcy5yZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoZSBicm93c2VyIFVSTCBhbmQgcm91dGVyIHN0YXRlIHdhcyBub3QgdXBkYXRlZCBiZWZvcmUgdGhlIG5hdmlnYXRpb24gY2FuY2VsbGVkIHNvXG4gICAgICAgIC8vIHRoZXJlJ3Mgbm8gcmVzdG9yYXRpb24gbmVlZGVkLlxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAncmVwbGFjZScpIHtcbiAgICAgIC8vIFRPRE8oYXRzY290dCk6IEl0IHNlZW1zIGxpa2Ugd2Ugc2hvdWxkIF9hbHdheXNfIHJlc2V0IHRoZSBzdGF0ZSBoZXJlLiBJdCB3b3VsZCBiZSBhIG5vLW9wXG4gICAgICAvLyBmb3IgYGRlZmVycmVkYCBuYXZpZ2F0aW9ucyB0aGF0IGhhdmVuJ3QgY2hhbmdlIHRoZSBpbnRlcm5hbCBzdGF0ZSB5ZXQgYmVjYXVzZSBndWFyZHNcbiAgICAgIC8vIHJlamVjdC4gRm9yICdlYWdlcicgbmF2aWdhdGlvbnMsIGl0IHNlZW1zIGxpa2Ugd2UgYWxzbyByZWFsbHkgc2hvdWxkIHJlc2V0IHRoZSBzdGF0ZVxuICAgICAgLy8gYmVjYXVzZSB0aGUgbmF2aWdhdGlvbiB3YXMgY2FuY2VsbGVkLiBJbnZlc3RpZ2F0ZSBpZiB0aGlzIGNhbiBiZSBkb25lIGJ5IHJ1bm5pbmcgVEdQLlxuICAgICAgaWYgKHJlc3RvcmluZ0Zyb21DYXVnaHRFcnJvcikge1xuICAgICAgICB0aGlzLnJlc2V0U3RhdGUodCk7XG4gICAgICB9XG4gICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRTdGF0ZSh0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbik6IHZvaWQge1xuICAgICh0aGlzIGFzIHtyb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGV9KS5yb3V0ZXJTdGF0ZSA9IHQuY3VycmVudFJvdXRlclN0YXRlO1xuICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSB0LmN1cnJlbnRVcmxUcmVlO1xuICAgIC8vIE5vdGUgaGVyZSB0aGF0IHdlIHVzZSB0aGUgdXJsSGFuZGxpbmdTdHJhdGVneSB0byBnZXQgdGhlIHJlc2V0IGByYXdVcmxUcmVlYCBiZWNhdXNlIGl0IG1heSBiZVxuICAgIC8vIGNvbmZpZ3VyZWQgdG8gaGFuZGxlIG9ubHkgcGFydCBvZiB0aGUgbmF2aWdhdGlvbiBVUkwuIFRoaXMgbWVhbnMgd2Ugd291bGQgb25seSB3YW50IHRvIHJlc2V0XG4gICAgLy8gdGhlIHBhcnQgb2YgdGhlIG5hdmlnYXRpb24gaGFuZGxlZCBieSB0aGUgQW5ndWxhciByb3V0ZXIgcmF0aGVyIHRoYW4gdGhlIHdob2xlIFVSTC4gSW5cbiAgICAvLyBhZGRpdGlvbiwgdGhlIFVSTEhhbmRsaW5nU3RyYXRlZ3kgbWF5IGJlIGNvbmZpZ3VyZWQgdG8gc3BlY2lmaWNhbGx5IHByZXNlcnZlIHBhcnRzIG9mIHRoZSBVUkxcbiAgICAvLyB3aGVuIG1lcmdpbmcsIHN1Y2ggYXMgdGhlIHF1ZXJ5IHBhcmFtcyBzbyB0aGV5IGFyZSBub3QgbG9zdCBvbiBhIHJlZnJlc2guXG4gICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHRoaXMuY3VycmVudFVybFRyZWUsIHQucmF3VXJsKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk6IHZvaWQge1xuICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKFxuICAgICAgICB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHRoaXMucmF3VXJsVHJlZSksICcnLFxuICAgICAgICB0aGlzLmdlbmVyYXRlTmdSb3V0ZXJTdGF0ZSh0aGlzLmxhc3RTdWNjZXNzZnVsSWQsIHRoaXMuY3VycmVudFBhZ2VJZCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBjYW5jZWxOYXZpZ2F0aW9uVHJhbnNpdGlvbih0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbiwgcmVhc29uOiBzdHJpbmcpIHtcbiAgICBjb25zdCBuYXZDYW5jZWwgPSBuZXcgTmF2aWdhdGlvbkNhbmNlbCh0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIHJlYXNvbik7XG4gICAgdGhpcy50cmlnZ2VyRXZlbnQobmF2Q2FuY2VsKTtcbiAgICB0LnJlc29sdmUoZmFsc2UpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZU5nUm91dGVyU3RhdGUobmF2aWdhdGlvbklkOiBudW1iZXIsIHJvdXRlclBhZ2VJZD86IG51bWJlcikge1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdjb21wdXRlZCcpIHtcbiAgICAgIHJldHVybiB7bmF2aWdhdGlvbklkLCDJtXJvdXRlclBhZ2VJZDogcm91dGVyUGFnZUlkfTtcbiAgICB9XG4gICAgcmV0dXJuIHtuYXZpZ2F0aW9uSWR9O1xuICB9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHM6IHN0cmluZ1tdKTogdm9pZCB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29tbWFuZHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjbWQgPSBjb21tYW5kc1tpXTtcbiAgICBpZiAoY21kID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIHJlcXVlc3RlZCBwYXRoIGNvbnRhaW5zICR7Y21kfSBzZWdtZW50IGF0IGluZGV4ICR7aX1gKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNCcm93c2VyVHJpZ2dlcmVkTmF2aWdhdGlvbihzb3VyY2U6ICdpbXBlcmF0aXZlJ3wncG9wc3RhdGUnfCdoYXNoY2hhbmdlJykge1xuICByZXR1cm4gc291cmNlICE9PSAnaW1wZXJhdGl2ZSc7XG59XG4iXX0=