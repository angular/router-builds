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
                const urlTransition = !this.navigated ||
                    t.extractedUrl.toString() !== this.browserUrlTree.toString();
                /* || this.browserUrlTree.toString() !== this.currentUrlTree.toString() */
                // TODO(atscott): Run TGP to see if the above change can be made. There are
                // situations where a navigation is canceled _after_ browserUrlTree is
                // updated. For example, urlUpdateStrategy === 'eager': if a new
                // navigation happens (i.e. in a guard), this would cause the router to
                // be in an invalid state of tracking.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBZ0IsTUFBTSxpQkFBaUIsQ0FBQztBQUN4RCxPQUFPLEVBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUscUJBQXFCLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxJQUFJLE9BQU8sRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNwSSxPQUFPLEVBQUMsZUFBZSxFQUFFLEtBQUssRUFBYyxFQUFFLEVBQUUsT0FBTyxFQUFtQixNQUFNLE1BQU0sQ0FBQztBQUN2RixPQUFPLEVBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUdqRixPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUN4RCxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDaEQsT0FBTyxFQUFRLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBcUIsVUFBVSxFQUFFLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3TyxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNyRCxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDaEQsT0FB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QUUsRUFBRTtRQUN4QyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsR0FBRyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUM3RTtLQUNGO0FBQ0gsQ0FBQztBQUVELFNBQVMsNEJBQTRCLENBQUMsTUFBNEM7SUFDaEYsT0FBTyxNQUFNLEtBQUssWUFBWSxDQUFDO0FBQ2pDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvbiwgUG9wU3RhdGVFdmVudH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7Q29tcGlsZXIsIEluamVjdGFibGUsIEluamVjdG9yLCBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIE5nTW9kdWxlUmVmLCBOZ1pvbmUsIFR5cGUsIMm1Q29uc29sZSBhcyBDb25zb2xlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7QmVoYXZpb3JTdWJqZWN0LCBFTVBUWSwgT2JzZXJ2YWJsZSwgb2YsIFN1YmplY3QsIFN1YnNjcmlwdGlvbkxpa2V9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjYXRjaEVycm9yLCBmaWx0ZXIsIGZpbmFsaXplLCBtYXAsIHN3aXRjaE1hcCwgdGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7UXVlcnlQYXJhbXNIYW5kbGluZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtjcmVhdGVSb3V0ZXJTdGF0ZX0gZnJvbSAnLi9jcmVhdGVfcm91dGVyX3N0YXRlJztcbmltcG9ydCB7Y3JlYXRlVXJsVHJlZX0gZnJvbSAnLi9jcmVhdGVfdXJsX3RyZWUnO1xuaW1wb3J0IHtFdmVudCwgR3VhcmRzQ2hlY2tFbmQsIEd1YXJkc0NoZWNrU3RhcnQsIE5hdmlnYXRpb25DYW5jZWwsIE5hdmlnYXRpb25FbmQsIE5hdmlnYXRpb25FcnJvciwgTmF2aWdhdGlvblN0YXJ0LCBOYXZpZ2F0aW9uVHJpZ2dlciwgUmVzb2x2ZUVuZCwgUmVzb2x2ZVN0YXJ0LCBSb3V0ZUNvbmZpZ0xvYWRFbmQsIFJvdXRlQ29uZmlnTG9hZFN0YXJ0LCBSb3V0ZXNSZWNvZ25pemVkfSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge2FjdGl2YXRlUm91dGVzfSBmcm9tICcuL29wZXJhdG9ycy9hY3RpdmF0ZV9yb3V0ZXMnO1xuaW1wb3J0IHthcHBseVJlZGlyZWN0c30gZnJvbSAnLi9vcGVyYXRvcnMvYXBwbHlfcmVkaXJlY3RzJztcbmltcG9ydCB7Y2hlY2tHdWFyZHN9IGZyb20gJy4vb3BlcmF0b3JzL2NoZWNrX2d1YXJkcyc7XG5pbXBvcnQge3JlY29nbml6ZX0gZnJvbSAnLi9vcGVyYXRvcnMvcmVjb2duaXplJztcbmltcG9ydCB7cmVzb2x2ZURhdGF9IGZyb20gJy4vb3BlcmF0b3JzL3Jlc29sdmVfZGF0YSc7XG5pbXBvcnQge3N3aXRjaFRhcH0gZnJvbSAnLi9vcGVyYXRvcnMvc3dpdGNoX3RhcCc7XG5pbXBvcnQge0RlZmF1bHRSb3V0ZVJldXNlU3RyYXRlZ3ksIFJvdXRlUmV1c2VTdHJhdGVneX0gZnJvbSAnLi9yb3V0ZV9yZXVzZV9zdHJhdGVneSc7XG5pbXBvcnQge1JvdXRlckNvbmZpZ0xvYWRlcn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge0NoaWxkcmVuT3V0bGV0Q29udGV4dHN9IGZyb20gJy4vcm91dGVyX291dGxldF9jb250ZXh0JztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGUsIGNyZWF0ZUVtcHR5U3RhdGUsIFJvdXRlclN0YXRlLCBSb3V0ZXJTdGF0ZVNuYXBzaG90fSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge2lzTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yLCBuYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IsIFBhcmFtc30gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtEZWZhdWx0VXJsSGFuZGxpbmdTdHJhdGVneSwgVXJsSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi91cmxfaGFuZGxpbmdfc3RyYXRlZ3knO1xuaW1wb3J0IHtjb250YWluc1RyZWUsIGNyZWF0ZUVtcHR5VXJsVHJlZSwgSXNBY3RpdmVNYXRjaE9wdGlvbnMsIFVybFNlcmlhbGl6ZXIsIFVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtzdGFuZGFyZGl6ZUNvbmZpZywgdmFsaWRhdGVDb25maWd9IGZyb20gJy4vdXRpbHMvY29uZmlnJztcbmltcG9ydCB7Q2hlY2tzLCBnZXRBbGxSb3V0ZUd1YXJkc30gZnJvbSAnLi91dGlscy9wcmVhY3RpdmF0aW9uJztcbmltcG9ydCB7aXNVcmxUcmVlfSBmcm9tICcuL3V0aWxzL3R5cGVfZ3VhcmRzJztcblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIE9wdGlvbnMgdGhhdCBtb2RpZnkgdGhlIGBSb3V0ZXJgIFVSTC5cbiAqIFN1cHBseSBhbiBvYmplY3QgY29udGFpbmluZyBhbnkgb2YgdGhlc2UgcHJvcGVydGllcyB0byBhIGBSb3V0ZXJgIG5hdmlnYXRpb24gZnVuY3Rpb24gdG9cbiAqIGNvbnRyb2wgaG93IHRoZSB0YXJnZXQgVVJMIHNob3VsZCBiZSBjb25zdHJ1Y3RlZC5cbiAqXG4gKiBAc2VlIFtSb3V0ZXIubmF2aWdhdGUoKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI25hdmlnYXRlKVxuICogQHNlZSBbUm91dGVyLmNyZWF0ZVVybFRyZWUoKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI2NyZWF0ZXVybHRyZWUpXG4gKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFVybENyZWF0aW9uT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBTcGVjaWZpZXMgYSByb290IFVSSSB0byB1c2UgZm9yIHJlbGF0aXZlIG5hdmlnYXRpb24uXG4gICAqXG4gICAqIEZvciBleGFtcGxlLCBjb25zaWRlciB0aGUgZm9sbG93aW5nIHJvdXRlIGNvbmZpZ3VyYXRpb24gd2hlcmUgdGhlIHBhcmVudCByb3V0ZVxuICAgKiBoYXMgdHdvIGNoaWxkcmVuLlxuICAgKlxuICAgKiBgYGBcbiAgICogW3tcbiAgICogICBwYXRoOiAncGFyZW50JyxcbiAgICogICBjb21wb25lbnQ6IFBhcmVudENvbXBvbmVudCxcbiAgICogICBjaGlsZHJlbjogW3tcbiAgICogICAgIHBhdGg6ICdsaXN0JyxcbiAgICogICAgIGNvbXBvbmVudDogTGlzdENvbXBvbmVudFxuICAgKiAgIH0se1xuICAgKiAgICAgcGF0aDogJ2NoaWxkJyxcbiAgICogICAgIGNvbXBvbmVudDogQ2hpbGRDb21wb25lbnRcbiAgICogICB9XVxuICAgKiB9XVxuICAgKiBgYGBcbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBgZ28oKWAgZnVuY3Rpb24gbmF2aWdhdGVzIHRvIHRoZSBgbGlzdGAgcm91dGUgYnlcbiAgICogaW50ZXJwcmV0aW5nIHRoZSBkZXN0aW5hdGlvbiBVUkkgYXMgcmVsYXRpdmUgdG8gdGhlIGFjdGl2YXRlZCBgY2hpbGRgICByb3V0ZVxuICAgKlxuICAgKiBgYGBcbiAgICogIEBDb21wb25lbnQoey4uLn0pXG4gICAqICBjbGFzcyBDaGlsZENvbXBvbmVudCB7XG4gICAqICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsIHByaXZhdGUgcm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7fVxuICAgKlxuICAgKiAgICBnbygpIHtcbiAgICogICAgICB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy4uL2xpc3QnXSwgeyByZWxhdGl2ZVRvOiB0aGlzLnJvdXRlIH0pO1xuICAgKiAgICB9XG4gICAqICB9XG4gICAqIGBgYFxuICAgKlxuICAgKiBBIHZhbHVlIG9mIGBudWxsYCBvciBgdW5kZWZpbmVkYCBpbmRpY2F0ZXMgdGhhdCB0aGUgbmF2aWdhdGlvbiBjb21tYW5kcyBzaG91bGQgYmUgYXBwbGllZFxuICAgKiByZWxhdGl2ZSB0byB0aGUgcm9vdC5cbiAgICovXG4gIHJlbGF0aXZlVG8/OiBBY3RpdmF0ZWRSb3V0ZXxudWxsO1xuXG4gIC8qKlxuICAgKiBTZXRzIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gdGhlIFVSTC5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHRvIC9yZXN1bHRzP3BhZ2U9MVxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy9yZXN1bHRzJ10sIHsgcXVlcnlQYXJhbXM6IHsgcGFnZTogMSB9IH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHF1ZXJ5UGFyYW1zPzogUGFyYW1zfG51bGw7XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGhhc2ggZnJhZ21lbnQgZm9yIHRoZSBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvcmVzdWx0cyN0b3BcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvcmVzdWx0cyddLCB7IGZyYWdtZW50OiAndG9wJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudD86IHN0cmluZztcblxuICAvKipcbiAgICogSG93IHRvIGhhbmRsZSBxdWVyeSBwYXJhbWV0ZXJzIGluIHRoZSByb3V0ZXIgbGluayBmb3IgdGhlIG5leHQgbmF2aWdhdGlvbi5cbiAgICogT25lIG9mOlxuICAgKiAqIGBwcmVzZXJ2ZWAgOiBQcmVzZXJ2ZSBjdXJyZW50IHBhcmFtZXRlcnMuXG4gICAqICogYG1lcmdlYCA6IE1lcmdlIG5ldyB3aXRoIGN1cnJlbnQgcGFyYW1ldGVycy5cbiAgICpcbiAgICogVGhlIFwicHJlc2VydmVcIiBvcHRpb24gZGlzY2FyZHMgYW55IG5ldyBxdWVyeSBwYXJhbXM6XG4gICAqIGBgYFxuICAgKiAvLyBmcm9tIC92aWV3MT9wYWdlPTEgdG8vdmlldzI/cGFnZT0xXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcyJ10sIHsgcXVlcnlQYXJhbXM6IHsgcGFnZTogMiB9LCAgcXVlcnlQYXJhbXNIYW5kbGluZzogXCJwcmVzZXJ2ZVwiXG4gICAqIH0pO1xuICAgKiBgYGBcbiAgICogVGhlIFwibWVyZ2VcIiBvcHRpb24gYXBwZW5kcyBuZXcgcXVlcnkgcGFyYW1zIHRvIHRoZSBwYXJhbXMgZnJvbSB0aGUgY3VycmVudCBVUkw6XG4gICAqIGBgYFxuICAgKiAvLyBmcm9tIC92aWV3MT9wYWdlPTEgdG8vdmlldzI/cGFnZT0xJm90aGVyS2V5PTJcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldzInXSwgeyBxdWVyeVBhcmFtczogeyBvdGhlcktleTogMiB9LCAgcXVlcnlQYXJhbXNIYW5kbGluZzogXCJtZXJnZVwiXG4gICAqIH0pO1xuICAgKiBgYGBcbiAgICogSW4gY2FzZSBvZiBhIGtleSBjb2xsaXNpb24gYmV0d2VlbiBjdXJyZW50IHBhcmFtZXRlcnMgYW5kIHRob3NlIGluIHRoZSBgcXVlcnlQYXJhbXNgIG9iamVjdCxcbiAgICogdGhlIG5ldyB2YWx1ZSBpcyB1c2VkLlxuICAgKlxuICAgKi9cbiAgcXVlcnlQYXJhbXNIYW5kbGluZz86IFF1ZXJ5UGFyYW1zSGFuZGxpbmd8bnVsbDtcblxuICAvKipcbiAgICogV2hlbiB0cnVlLCBwcmVzZXJ2ZXMgdGhlIFVSTCBmcmFnbWVudCBmb3IgdGhlIG5leHQgbmF2aWdhdGlvblxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gUHJlc2VydmUgZnJhZ21lbnQgZnJvbSAvcmVzdWx0cyN0b3AgdG8gL3ZpZXcjdG9wXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBwcmVzZXJ2ZUZyYWdtZW50OiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHByZXNlcnZlRnJhZ21lbnQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIE9wdGlvbnMgdGhhdCBtb2RpZnkgdGhlIGBSb3V0ZXJgIG5hdmlnYXRpb24gc3RyYXRlZ3kuXG4gKiBTdXBwbHkgYW4gb2JqZWN0IGNvbnRhaW5pbmcgYW55IG9mIHRoZXNlIHByb3BlcnRpZXMgdG8gYSBgUm91dGVyYCBuYXZpZ2F0aW9uIGZ1bmN0aW9uIHRvXG4gKiBjb250cm9sIGhvdyB0aGUgbmF2aWdhdGlvbiBzaG91bGQgYmUgaGFuZGxlZC5cbiAqXG4gKiBAc2VlIFtSb3V0ZXIubmF2aWdhdGUoKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI25hdmlnYXRlKVxuICogQHNlZSBbUm91dGVyLm5hdmlnYXRlQnlVcmwoKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI25hdmlnYXRlYnl1cmwpXG4gKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMge1xuICAvKipcbiAgICogV2hlbiB0cnVlLCBuYXZpZ2F0ZXMgd2l0aG91dCBwdXNoaW5nIGEgbmV3IHN0YXRlIGludG8gaGlzdG9yeS5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHNpbGVudGx5IHRvIC92aWV3XG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgc2tpcExvY2F0aW9uQ2hhbmdlPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hlbiB0cnVlLCBuYXZpZ2F0ZXMgd2hpbGUgcmVwbGFjaW5nIHRoZSBjdXJyZW50IHN0YXRlIGluIGhpc3RvcnkuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvdmlld1xuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgcmVwbGFjZVVybDogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqL1xuICByZXBsYWNlVXJsPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogRGV2ZWxvcGVyLWRlZmluZWQgc3RhdGUgdGhhdCBjYW4gYmUgcGFzc2VkIHRvIGFueSBuYXZpZ2F0aW9uLlxuICAgKiBBY2Nlc3MgdGhpcyB2YWx1ZSB0aHJvdWdoIHRoZSBgTmF2aWdhdGlvbi5leHRyYXNgIG9iamVjdFxuICAgKiByZXR1cm5lZCBmcm9tIHRoZSBbUm91dGVyLmdldEN1cnJlbnROYXZpZ2F0aW9uKClcbiAgICogbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNnZXRjdXJyZW50bmF2aWdhdGlvbikgd2hpbGUgYSBuYXZpZ2F0aW9uIGlzIGV4ZWN1dGluZy5cbiAgICpcbiAgICogQWZ0ZXIgYSBuYXZpZ2F0aW9uIGNvbXBsZXRlcywgdGhlIHJvdXRlciB3cml0ZXMgYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhpc1xuICAgKiB2YWx1ZSB0b2dldGhlciB3aXRoIGEgYG5hdmlnYXRpb25JZGAgdG8gYGhpc3Rvcnkuc3RhdGVgLlxuICAgKiBUaGUgdmFsdWUgaXMgd3JpdHRlbiB3aGVuIGBsb2NhdGlvbi5nbygpYCBvciBgbG9jYXRpb24ucmVwbGFjZVN0YXRlKClgXG4gICAqIGlzIGNhbGxlZCBiZWZvcmUgYWN0aXZhdGluZyB0aGlzIHJvdXRlLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgYGhpc3Rvcnkuc3RhdGVgIGRvZXMgbm90IHBhc3MgYW4gb2JqZWN0IGVxdWFsaXR5IHRlc3QgYmVjYXVzZVxuICAgKiB0aGUgcm91dGVyIGFkZHMgdGhlIGBuYXZpZ2F0aW9uSWRgIG9uIGVhY2ggbmF2aWdhdGlvbi5cbiAgICpcbiAgICovXG4gIHN0YXRlPzoge1trOiBzdHJpbmddOiBhbnl9O1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIE9wdGlvbnMgdGhhdCBtb2RpZnkgdGhlIGBSb3V0ZXJgIG5hdmlnYXRpb24gc3RyYXRlZ3kuXG4gKiBTdXBwbHkgYW4gb2JqZWN0IGNvbnRhaW5pbmcgYW55IG9mIHRoZXNlIHByb3BlcnRpZXMgdG8gYSBgUm91dGVyYCBuYXZpZ2F0aW9uIGZ1bmN0aW9uIHRvXG4gKiBjb250cm9sIGhvdyB0aGUgdGFyZ2V0IFVSTCBzaG91bGQgYmUgY29uc3RydWN0ZWQgb3IgaW50ZXJwcmV0ZWQuXG4gKlxuICogQHNlZSBbUm91dGVyLm5hdmlnYXRlKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNuYXZpZ2F0ZSlcbiAqIEBzZWUgW1JvdXRlci5uYXZpZ2F0ZUJ5VXJsKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNuYXZpZ2F0ZWJ5dXJsKVxuICogQHNlZSBbUm91dGVyLmNyZWF0ZVVybFRyZWUoKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI2NyZWF0ZXVybHRyZWUpXG4gKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpXG4gKiBAc2VlIFVybENyZWF0aW9uT3B0aW9uc1xuICogQHNlZSBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5hdmlnYXRpb25FeHRyYXMgZXh0ZW5kcyBVcmxDcmVhdGlvbk9wdGlvbnMsIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMge31cblxuLyoqXG4gKiBFcnJvciBoYW5kbGVyIHRoYXQgaXMgaW52b2tlZCB3aGVuIGEgbmF2aWdhdGlvbiBlcnJvciBvY2N1cnMuXG4gKlxuICogSWYgdGhlIGhhbmRsZXIgcmV0dXJucyBhIHZhbHVlLCB0aGUgbmF2aWdhdGlvbiBQcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhpcyB2YWx1ZS5cbiAqIElmIHRoZSBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb24sIHRoZSBuYXZpZ2F0aW9uIFByb21pc2UgaXMgcmVqZWN0ZWQgd2l0aFxuICogdGhlIGV4Y2VwdGlvbi5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIEVycm9ySGFuZGxlciA9IChlcnJvcjogYW55KSA9PiBhbnk7XG5cbmZ1bmN0aW9uIGRlZmF1bHRFcnJvckhhbmRsZXIoZXJyb3I6IGFueSk6IGFueSB7XG4gIHRocm93IGVycm9yO1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0TWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyKFxuICAgIGVycm9yOiBVUklFcnJvciwgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgdXJsOiBzdHJpbmcpOiBVcmxUcmVlIHtcbiAgcmV0dXJuIHVybFNlcmlhbGl6ZXIucGFyc2UoJy8nKTtcbn1cblxuZXhwb3J0IHR5cGUgUmVzdG9yZWRTdGF0ZSA9IHtcbiAgW2s6IHN0cmluZ106IGFueSxcbiAgLy8gVE9ETygjMjc2MDcpOiBSZW1vdmUgYG5hdmlnYXRpb25JZGAgYW5kIGDJtXJvdXRlclBhZ2VJZGAgYW5kIG1vdmUgdG8gYG5nYCBvciBgybVgIG5hbWVzcGFjZS5cbiAgbmF2aWdhdGlvbklkOiBudW1iZXIsXG4gIC8vIFRoZSBgybVgIHByZWZpeCBpcyB0aGVyZSB0byByZWR1Y2UgdGhlIGNoYW5jZSBvZiBjb2xsaWRpbmcgd2l0aCBhbnkgZXhpc3RpbmcgdXNlciBwcm9wZXJ0aWVzIG9uXG4gIC8vIHRoZSBoaXN0b3J5IHN0YXRlLlxuICDJtXJvdXRlclBhZ2VJZD86IG51bWJlcixcbn07XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgYSBuYXZpZ2F0aW9uIG9wZXJhdGlvbi5cbiAqIFJldHJpZXZlIHRoZSBtb3N0IHJlY2VudCBuYXZpZ2F0aW9uIG9iamVjdCB3aXRoIHRoZVxuICogW1JvdXRlci5nZXRDdXJyZW50TmF2aWdhdGlvbigpIG1ldGhvZF0oYXBpL3JvdXRlci9Sb3V0ZXIjZ2V0Y3VycmVudG5hdmlnYXRpb24pIC5cbiAqXG4gKiAqICppZCogOiBUaGUgdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGN1cnJlbnQgbmF2aWdhdGlvbi5cbiAqICogKmluaXRpYWxVcmwqIDogVGhlIHRhcmdldCBVUkwgcGFzc2VkIGludG8gdGhlIGBSb3V0ZXIjbmF2aWdhdGVCeVVybCgpYCBjYWxsIGJlZm9yZSBuYXZpZ2F0aW9uLlxuICogVGhpcyBpcyB0aGUgdmFsdWUgYmVmb3JlIHRoZSByb3V0ZXIgaGFzIHBhcnNlZCBvciBhcHBsaWVkIHJlZGlyZWN0cyB0byBpdC5cbiAqICogKmV4dHJhY3RlZFVybCogOiBUaGUgaW5pdGlhbCB0YXJnZXQgVVJMIGFmdGVyIGJlaW5nIHBhcnNlZCB3aXRoIGBVcmxTZXJpYWxpemVyLmV4dHJhY3QoKWAuXG4gKiAqICpmaW5hbFVybCogOiBUaGUgZXh0cmFjdGVkIFVSTCBhZnRlciByZWRpcmVjdHMgaGF2ZSBiZWVuIGFwcGxpZWQuXG4gKiBUaGlzIFVSTCBtYXkgbm90IGJlIGF2YWlsYWJsZSBpbW1lZGlhdGVseSwgdGhlcmVmb3JlIHRoaXMgcHJvcGVydHkgY2FuIGJlIGB1bmRlZmluZWRgLlxuICogSXQgaXMgZ3VhcmFudGVlZCB0byBiZSBzZXQgYWZ0ZXIgdGhlIGBSb3V0ZXNSZWNvZ25pemVkYCBldmVudCBmaXJlcy5cbiAqICogKnRyaWdnZXIqIDogSWRlbnRpZmllcyBob3cgdGhpcyBuYXZpZ2F0aW9uIHdhcyB0cmlnZ2VyZWQuXG4gKiAtLSAnaW1wZXJhdGl2ZSctLVRyaWdnZXJlZCBieSBgcm91dGVyLm5hdmlnYXRlQnlVcmxgIG9yIGByb3V0ZXIubmF2aWdhdGVgLlxuICogLS0gJ3BvcHN0YXRlJy0tVHJpZ2dlcmVkIGJ5IGEgcG9wc3RhdGUgZXZlbnQuXG4gKiAtLSAnaGFzaGNoYW5nZSctLVRyaWdnZXJlZCBieSBhIGhhc2hjaGFuZ2UgZXZlbnQuXG4gKiAqICpleHRyYXMqIDogQSBgTmF2aWdhdGlvbkV4dHJhc2Agb3B0aW9ucyBvYmplY3QgdGhhdCBjb250cm9sbGVkIHRoZSBzdHJhdGVneSB1c2VkIGZvciB0aGlzXG4gKiBuYXZpZ2F0aW9uLlxuICogKiAqcHJldmlvdXNOYXZpZ2F0aW9uKiA6IFRoZSBwcmV2aW91c2x5IHN1Y2Nlc3NmdWwgYE5hdmlnYXRpb25gIG9iamVjdC4gT25seSBvbmUgcHJldmlvdXNcbiAqIG5hdmlnYXRpb24gaXMgYXZhaWxhYmxlLCB0aGVyZWZvcmUgdGhpcyBwcmV2aW91cyBgTmF2aWdhdGlvbmAgb2JqZWN0IGhhcyBhIGBudWxsYCB2YWx1ZSBmb3IgaXRzXG4gKiBvd24gYHByZXZpb3VzTmF2aWdhdGlvbmAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5hdmlnYXRpb24ge1xuICAvKipcbiAgICogVGhlIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBjdXJyZW50IG5hdmlnYXRpb24uXG4gICAqL1xuICBpZDogbnVtYmVyO1xuICAvKipcbiAgICogVGhlIHRhcmdldCBVUkwgcGFzc2VkIGludG8gdGhlIGBSb3V0ZXIjbmF2aWdhdGVCeVVybCgpYCBjYWxsIGJlZm9yZSBuYXZpZ2F0aW9uLiBUaGlzIGlzXG4gICAqIHRoZSB2YWx1ZSBiZWZvcmUgdGhlIHJvdXRlciBoYXMgcGFyc2VkIG9yIGFwcGxpZWQgcmVkaXJlY3RzIHRvIGl0LlxuICAgKi9cbiAgaW5pdGlhbFVybDogc3RyaW5nfFVybFRyZWU7XG4gIC8qKlxuICAgKiBUaGUgaW5pdGlhbCB0YXJnZXQgVVJMIGFmdGVyIGJlaW5nIHBhcnNlZCB3aXRoIGBVcmxTZXJpYWxpemVyLmV4dHJhY3QoKWAuXG4gICAqL1xuICBleHRyYWN0ZWRVcmw6IFVybFRyZWU7XG4gIC8qKlxuICAgKiBUaGUgZXh0cmFjdGVkIFVSTCBhZnRlciByZWRpcmVjdHMgaGF2ZSBiZWVuIGFwcGxpZWQuXG4gICAqIFRoaXMgVVJMIG1heSBub3QgYmUgYXZhaWxhYmxlIGltbWVkaWF0ZWx5LCB0aGVyZWZvcmUgdGhpcyBwcm9wZXJ0eSBjYW4gYmUgYHVuZGVmaW5lZGAuXG4gICAqIEl0IGlzIGd1YXJhbnRlZWQgdG8gYmUgc2V0IGFmdGVyIHRoZSBgUm91dGVzUmVjb2duaXplZGAgZXZlbnQgZmlyZXMuXG4gICAqL1xuICBmaW5hbFVybD86IFVybFRyZWU7XG4gIC8qKlxuICAgKiBJZGVudGlmaWVzIGhvdyB0aGlzIG5hdmlnYXRpb24gd2FzIHRyaWdnZXJlZC5cbiAgICpcbiAgICogKiAnaW1wZXJhdGl2ZSctLVRyaWdnZXJlZCBieSBgcm91dGVyLm5hdmlnYXRlQnlVcmxgIG9yIGByb3V0ZXIubmF2aWdhdGVgLlxuICAgKiAqICdwb3BzdGF0ZSctLVRyaWdnZXJlZCBieSBhIHBvcHN0YXRlIGV2ZW50LlxuICAgKiAqICdoYXNoY2hhbmdlJy0tVHJpZ2dlcmVkIGJ5IGEgaGFzaGNoYW5nZSBldmVudC5cbiAgICovXG4gIHRyaWdnZXI6ICdpbXBlcmF0aXZlJ3wncG9wc3RhdGUnfCdoYXNoY2hhbmdlJztcbiAgLyoqXG4gICAqIE9wdGlvbnMgdGhhdCBjb250cm9sbGVkIHRoZSBzdHJhdGVneSB1c2VkIGZvciB0aGlzIG5hdmlnYXRpb24uXG4gICAqIFNlZSBgTmF2aWdhdGlvbkV4dHJhc2AuXG4gICAqL1xuICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXM7XG4gIC8qKlxuICAgKiBUaGUgcHJldmlvdXNseSBzdWNjZXNzZnVsIGBOYXZpZ2F0aW9uYCBvYmplY3QuIE9ubHkgb25lIHByZXZpb3VzIG5hdmlnYXRpb25cbiAgICogaXMgYXZhaWxhYmxlLCB0aGVyZWZvcmUgdGhpcyBwcmV2aW91cyBgTmF2aWdhdGlvbmAgb2JqZWN0IGhhcyBhIGBudWxsYCB2YWx1ZVxuICAgKiBmb3IgaXRzIG93biBgcHJldmlvdXNOYXZpZ2F0aW9uYC5cbiAgICovXG4gIHByZXZpb3VzTmF2aWdhdGlvbjogTmF2aWdhdGlvbnxudWxsO1xufVxuXG5leHBvcnQgdHlwZSBOYXZpZ2F0aW9uVHJhbnNpdGlvbiA9IHtcbiAgaWQ6IG51bWJlcixcbiAgdGFyZ2V0UGFnZUlkOiBudW1iZXIsXG4gIGN1cnJlbnRVcmxUcmVlOiBVcmxUcmVlLFxuICBjdXJyZW50UmF3VXJsOiBVcmxUcmVlLFxuICBleHRyYWN0ZWRVcmw6IFVybFRyZWUsXG4gIHVybEFmdGVyUmVkaXJlY3RzOiBVcmxUcmVlLFxuICByYXdVcmw6IFVybFRyZWUsXG4gIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyxcbiAgcmVzb2x2ZTogYW55LFxuICByZWplY3Q6IGFueSxcbiAgcHJvbWlzZTogUHJvbWlzZTxib29sZWFuPixcbiAgc291cmNlOiBOYXZpZ2F0aW9uVHJpZ2dlcixcbiAgcmVzdG9yZWRTdGF0ZTogUmVzdG9yZWRTdGF0ZXxudWxsLFxuICBjdXJyZW50U25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QsXG4gIHRhcmdldFNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90fG51bGwsXG4gIGN1cnJlbnRSb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGUsXG4gIHRhcmdldFJvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZXxudWxsLFxuICBndWFyZHM6IENoZWNrcyxcbiAgZ3VhcmRzUmVzdWx0OiBib29sZWFufFVybFRyZWV8bnVsbCxcbn07XG5cbi8qKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCB0eXBlIFJvdXRlckhvb2sgPSAoc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QsIHJ1bkV4dHJhczoge1xuICBhcHBsaWVkVXJsVHJlZTogVXJsVHJlZSxcbiAgcmF3VXJsVHJlZTogVXJsVHJlZSxcbiAgc2tpcExvY2F0aW9uQ2hhbmdlOiBib29sZWFuLFxuICByZXBsYWNlVXJsOiBib29sZWFuLFxuICBuYXZpZ2F0aW9uSWQ6IG51bWJlclxufSkgPT4gT2JzZXJ2YWJsZTx2b2lkPjtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gZGVmYXVsdFJvdXRlckhvb2soc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QsIHJ1bkV4dHJhczoge1xuICBhcHBsaWVkVXJsVHJlZTogVXJsVHJlZSxcbiAgcmF3VXJsVHJlZTogVXJsVHJlZSxcbiAgc2tpcExvY2F0aW9uQ2hhbmdlOiBib29sZWFuLFxuICByZXBsYWNlVXJsOiBib29sZWFuLFxuICBuYXZpZ2F0aW9uSWQ6IG51bWJlclxufSk6IE9ic2VydmFibGU8dm9pZD4ge1xuICByZXR1cm4gb2YobnVsbCkgYXMgYW55O1xufVxuXG4vKipcbiAqIFRoZSBlcXVpdmFsZW50IGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2Agb3B0aW9ucyBmb3IgYFJvdXRlci5pc0FjdGl2ZWAgaXMgY2FsbGVkIHdpdGggYHRydWVgXG4gKiAoZXhhY3QgPSB0cnVlKS5cbiAqL1xuZXhwb3J0IGNvbnN0IGV4YWN0TWF0Y2hPcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucyA9IHtcbiAgcGF0aHM6ICdleGFjdCcsXG4gIGZyYWdtZW50OiAnaWdub3JlZCcsXG4gIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnLFxuICBxdWVyeVBhcmFtczogJ2V4YWN0J1xufTtcblxuLyoqXG4gKiBUaGUgZXF1aXZhbGVudCBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIG9wdGlvbnMgZm9yIGBSb3V0ZXIuaXNBY3RpdmVgIGlzIGNhbGxlZCB3aXRoIGBmYWxzZWBcbiAqIChleGFjdCA9IGZhbHNlKS5cbiAqL1xuZXhwb3J0IGNvbnN0IHN1YnNldE1hdGNoT3B0aW9uczogSXNBY3RpdmVNYXRjaE9wdGlvbnMgPSB7XG4gIHBhdGhzOiAnc3Vic2V0JyxcbiAgZnJhZ21lbnQ6ICdpZ25vcmVkJyxcbiAgbWF0cml4UGFyYW1zOiAnaWdub3JlZCcsXG4gIHF1ZXJ5UGFyYW1zOiAnc3Vic2V0J1xufTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBBIHNlcnZpY2UgdGhhdCBwcm92aWRlcyBuYXZpZ2F0aW9uIGFtb25nIHZpZXdzIGFuZCBVUkwgbWFuaXB1bGF0aW9uIGNhcGFiaWxpdGllcy5cbiAqXG4gKiBAc2VlIGBSb3V0ZWAuXG4gKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIEd1aWRlXShndWlkZS9yb3V0ZXIpLlxuICpcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBSb3V0ZXIge1xuICAvKipcbiAgICogUmVwcmVzZW50cyB0aGUgYWN0aXZhdGVkIGBVcmxUcmVlYCB0aGF0IHRoZSBgUm91dGVyYCBpcyBjb25maWd1cmVkIHRvIGhhbmRsZSAodGhyb3VnaFxuICAgKiBgVXJsSGFuZGxpbmdTdHJhdGVneWApLiBUaGF0IGlzLCBhZnRlciB3ZSBmaW5kIHRoZSByb3V0ZSBjb25maWcgdHJlZSB0aGF0IHdlJ3JlIGdvaW5nIHRvXG4gICAqIGFjdGl2YXRlLCBydW4gZ3VhcmRzLCBhbmQgYXJlIGp1c3QgYWJvdXQgdG8gYWN0aXZhdGUgdGhlIHJvdXRlLCB3ZSBzZXQgdGhlIGN1cnJlbnRVcmxUcmVlLlxuICAgKlxuICAgKiBUaGlzIHNob3VsZCBtYXRjaCB0aGUgYGJyb3dzZXJVcmxUcmVlYCB3aGVuIGEgbmF2aWdhdGlvbiBzdWNjZWVkcy4gSWYgdGhlXG4gICAqIGBVcmxIYW5kbGluZ1N0cmF0ZWd5LnNob3VsZFByb2Nlc3NVcmxgIGlzIGBmYWxzZWAsIG9ubHkgdGhlIGBicm93c2VyVXJsVHJlZWAgaXMgdXBkYXRlZC5cbiAgICovXG4gIHByaXZhdGUgY3VycmVudFVybFRyZWU6IFVybFRyZWU7XG4gIC8qKlxuICAgKiBNZWFudCB0byByZXByZXNlbnQgdGhlIGVudGlyZSBicm93c2VyIHVybCBhZnRlciBhIHN1Y2Nlc3NmdWwgbmF2aWdhdGlvbi4gSW4gdGhlIGxpZmUgb2YgYVxuICAgKiBuYXZpZ2F0aW9uIHRyYW5zaXRpb246XG4gICAqIDEuIFRoZSByYXdVcmwgcmVwcmVzZW50cyB0aGUgZnVsbCBVUkwgdGhhdCdzIGJlaW5nIG5hdmlnYXRlZCB0b1xuICAgKiAyLiBXZSBhcHBseSByZWRpcmVjdHMsIHdoaWNoIG1pZ2h0IG9ubHkgYXBwbHkgdG8gX3BhcnRfIG9mIHRoZSBVUkwgKGR1ZSB0b1xuICAgKiBgVXJsSGFuZGxpbmdTdHJhdGVneWApLlxuICAgKiAzLiBSaWdodCBiZWZvcmUgYWN0aXZhdGlvbiAoYmVjYXVzZSB3ZSBhc3N1bWUgYWN0aXZhdGlvbiB3aWxsIHN1Y2NlZWQpLCB3ZSB1cGRhdGUgdGhlXG4gICAqIHJhd1VybFRyZWUgdG8gYmUgYSBjb21iaW5hdGlvbiBvZiB0aGUgdXJsQWZ0ZXJSZWRpcmVjdHMgKGFnYWluLCB0aGlzIG1pZ2h0IG9ubHkgYXBwbHkgdG8gcGFydFxuICAgKiBvZiB0aGUgaW5pdGlhbCB1cmwpIGFuZCB0aGUgcmF3VXJsIG9mIHRoZSB0cmFuc2l0aW9uICh3aGljaCB3YXMgdGhlIG9yaWdpbmFsIG5hdmlnYXRpb24gdXJsIGluXG4gICAqIGl0cyBmdWxsIGZvcm0pLlxuICAgKi9cbiAgcHJpdmF0ZSByYXdVcmxUcmVlOiBVcmxUcmVlO1xuICAvKipcbiAgICogTWVhbnQgdG8gcmVwcmVzZW50IHRoZSBwYXJ0IG9mIHRoZSBicm93c2VyIHVybCB0aGF0IHRoZSBgUm91dGVyYCBpcyBzZXQgdXAgdG8gaGFuZGxlICh2aWEgdGhlXG4gICAqIGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCkuIFRoaXMgdmFsdWUgaXMgdXBkYXRlZCBpbW1lZGlhdGVseSBhZnRlciB0aGUgYnJvd3NlciB1cmwgaXMgdXBkYXRlZCAob3JcbiAgICogdGhlIGJyb3dzZXIgdXJsIHVwZGF0ZSBpcyBza2lwcGVkIHZpYSBgc2tpcExvY2F0aW9uQ2hhbmdlYCkuIFdpdGggdGhhdCwgbm90ZSB0aGF0XG4gICAqIGBicm93c2VyVXJsVHJlZWAgX21heSBub3RfIHJlZmxlY3QgdGhlIGFjdHVhbCBicm93c2VyIFVSTCBmb3IgdHdvIHJlYXNvbnM6XG4gICAqXG4gICAqIDEuIGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCBvbmx5IGhhbmRsZXMgcGFydCBvZiB0aGUgVVJMXG4gICAqIDIuIGBza2lwTG9jYXRpb25DaGFuZ2VgIGRvZXMgbm90IHVwZGF0ZSB0aGUgYnJvd3NlciB1cmwuXG4gICAqXG4gICAqIFNvIHRvIHJlaXRlcmF0ZSwgYGJyb3dzZXJVcmxUcmVlYCBvbmx5IHJlcHJlc2VudHMgdGhlIFJvdXRlcidzIGludGVybmFsIHVuZGVyc3RhbmRpbmcgb2YgdGhlXG4gICAqIGN1cnJlbnQgcm91dGUsIGVpdGhlciBiZWZvcmUgZ3VhcmRzIHdpdGggYHVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZWFnZXInYCBvciByaWdodCBiZWZvcmVcbiAgICogYWN0aXZhdGlvbiB3aXRoIGAnZGVmZXJyZWQnYC5cbiAgICpcbiAgICogVGhpcyBzaG91bGQgbWF0Y2ggdGhlIGBjdXJyZW50VXJsVHJlZWAgd2hlbiB0aGUgbmF2aWdhdGlvbiBzdWNjZWVkcy5cbiAgICovXG4gIHByaXZhdGUgYnJvd3NlclVybFRyZWU6IFVybFRyZWU7XG4gIHByaXZhdGUgcmVhZG9ubHkgdHJhbnNpdGlvbnM6IEJlaGF2aW9yU3ViamVjdDxOYXZpZ2F0aW9uVHJhbnNpdGlvbj47XG4gIHByaXZhdGUgbmF2aWdhdGlvbnM6IE9ic2VydmFibGU8TmF2aWdhdGlvblRyYW5zaXRpb24+O1xuICBwcml2YXRlIGxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbjogTmF2aWdhdGlvbnxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBjdXJyZW50TmF2aWdhdGlvbjogTmF2aWdhdGlvbnxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBkaXNwb3NlZCA9IGZhbHNlO1xuXG4gIHByaXZhdGUgbG9jYXRpb25TdWJzY3JpcHRpb24/OiBTdWJzY3JpcHRpb25MaWtlO1xuICBwcml2YXRlIG5hdmlnYXRpb25JZDogbnVtYmVyID0gMDtcblxuICAvKipcbiAgICogVGhlIGlkIG9mIHRoZSBjdXJyZW50bHkgYWN0aXZlIHBhZ2UgaW4gdGhlIHJvdXRlci5cbiAgICogVXBkYXRlZCB0byB0aGUgdHJhbnNpdGlvbidzIHRhcmdldCBpZCBvbiBhIHN1Y2Nlc3NmdWwgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogVGhpcyBpcyB1c2VkIHRvIHRyYWNrIHdoYXQgcGFnZSB0aGUgcm91dGVyIGxhc3QgYWN0aXZhdGVkLiBXaGVuIGFuIGF0dGVtcHRlZCBuYXZpZ2F0aW9uIGZhaWxzLFxuICAgKiB0aGUgcm91dGVyIGNhbiB0aGVuIHVzZSB0aGlzIHRvIGNvbXB1dGUgaG93IHRvIHJlc3RvcmUgdGhlIHN0YXRlIGJhY2sgdG8gdGhlIHByZXZpb3VzbHkgYWN0aXZlXG4gICAqIHBhZ2UuXG4gICAqL1xuICBwcml2YXRlIGN1cnJlbnRQYWdlSWQ6IG51bWJlciA9IDA7XG4gIC8qKlxuICAgKiBUaGUgybVyb3V0ZXJQYWdlSWQgb2Ygd2hhdGV2ZXIgcGFnZSBpcyBjdXJyZW50bHkgYWN0aXZlIGluIHRoZSBicm93c2VyIGhpc3RvcnkuIFRoaXMgaXNcbiAgICogaW1wb3J0YW50IGZvciBjb21wdXRpbmcgdGhlIHRhcmdldCBwYWdlIGlkIGZvciBuZXcgbmF2aWdhdGlvbnMgYmVjYXVzZSB3ZSBuZWVkIHRvIGVuc3VyZSBlYWNoXG4gICAqIHBhZ2UgaWQgaW4gdGhlIGJyb3dzZXIgaGlzdG9yeSBpcyAxIG1vcmUgdGhhbiB0aGUgcHJldmlvdXMgZW50cnkuXG4gICAqL1xuICBwcml2YXRlIGdldCBicm93c2VyUGFnZUlkKCk6IG51bWJlcnx1bmRlZmluZWQge1xuICAgIHJldHVybiAodGhpcy5sb2NhdGlvbi5nZXRTdGF0ZSgpIGFzIFJlc3RvcmVkU3RhdGUgfCBudWxsKT8uybVyb3V0ZXJQYWdlSWQ7XG4gIH1cbiAgcHJpdmF0ZSBjb25maWdMb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcjtcbiAgcHJpdmF0ZSBuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55PjtcbiAgcHJpdmF0ZSBjb25zb2xlOiBDb25zb2xlO1xuICBwcml2YXRlIGlzTmdab25lRW5hYmxlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBBbiBldmVudCBzdHJlYW0gZm9yIHJvdXRpbmcgZXZlbnRzIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgZXZlbnRzOiBPYnNlcnZhYmxlPEV2ZW50PiA9IG5ldyBTdWJqZWN0PEV2ZW50PigpO1xuICAvKipcbiAgICogVGhlIGN1cnJlbnQgc3RhdGUgb2Ygcm91dGluZyBpbiB0aGlzIE5nTW9kdWxlLlxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHJvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZTtcblxuICAvKipcbiAgICogQSBoYW5kbGVyIGZvciBuYXZpZ2F0aW9uIGVycm9ycyBpbiB0aGlzIE5nTW9kdWxlLlxuICAgKi9cbiAgZXJyb3JIYW5kbGVyOiBFcnJvckhhbmRsZXIgPSBkZWZhdWx0RXJyb3JIYW5kbGVyO1xuXG4gIC8qKlxuICAgKiBBIGhhbmRsZXIgZm9yIGVycm9ycyB0aHJvd24gYnkgYFJvdXRlci5wYXJzZVVybCh1cmwpYFxuICAgKiB3aGVuIGB1cmxgIGNvbnRhaW5zIGFuIGludmFsaWQgY2hhcmFjdGVyLlxuICAgKiBUaGUgbW9zdCBjb21tb24gY2FzZSBpcyBhIGAlYCBzaWduXG4gICAqIHRoYXQncyBub3QgZW5jb2RlZCBhbmQgaXMgbm90IHBhcnQgb2YgYSBwZXJjZW50IGVuY29kZWQgc2VxdWVuY2UuXG4gICAqL1xuICBtYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI6XG4gICAgICAoZXJyb3I6IFVSSUVycm9yLCB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgICAgIHVybDogc3RyaW5nKSA9PiBVcmxUcmVlID0gZGVmYXVsdE1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcjtcblxuICAvKipcbiAgICogVHJ1ZSBpZiBhdCBsZWFzdCBvbmUgbmF2aWdhdGlvbiBldmVudCBoYXMgb2NjdXJyZWQsXG4gICAqIGZhbHNlIG90aGVyd2lzZS5cbiAgICovXG4gIG5hdmlnYXRlZDogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIGxhc3RTdWNjZXNzZnVsSWQ6IG51bWJlciA9IC0xO1xuXG4gIC8qKlxuICAgKiBIb29rcyB0aGF0IGVuYWJsZSB5b3UgdG8gcGF1c2UgbmF2aWdhdGlvbixcbiAgICogZWl0aGVyIGJlZm9yZSBvciBhZnRlciB0aGUgcHJlYWN0aXZhdGlvbiBwaGFzZS5cbiAgICogVXNlZCBieSBgUm91dGVyTW9kdWxlYC5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuICBob29rczoge1xuICAgIGJlZm9yZVByZWFjdGl2YXRpb246IFJvdXRlckhvb2ssXG4gICAgYWZ0ZXJQcmVhY3RpdmF0aW9uOiBSb3V0ZXJIb29rXG4gIH0gPSB7YmVmb3JlUHJlYWN0aXZhdGlvbjogZGVmYXVsdFJvdXRlckhvb2ssIGFmdGVyUHJlYWN0aXZhdGlvbjogZGVmYXVsdFJvdXRlckhvb2t9O1xuXG4gIC8qKlxuICAgKiBBIHN0cmF0ZWd5IGZvciBleHRyYWN0aW5nIGFuZCBtZXJnaW5nIFVSTHMuXG4gICAqIFVzZWQgZm9yIEFuZ3VsYXJKUyB0byBBbmd1bGFyIG1pZ3JhdGlvbnMuXG4gICAqL1xuICB1cmxIYW5kbGluZ1N0cmF0ZWd5OiBVcmxIYW5kbGluZ1N0cmF0ZWd5ID0gbmV3IERlZmF1bHRVcmxIYW5kbGluZ1N0cmF0ZWd5KCk7XG5cbiAgLyoqXG4gICAqIEEgc3RyYXRlZ3kgZm9yIHJlLXVzaW5nIHJvdXRlcy5cbiAgICovXG4gIHJvdXRlUmV1c2VTdHJhdGVneTogUm91dGVSZXVzZVN0cmF0ZWd5ID0gbmV3IERlZmF1bHRSb3V0ZVJldXNlU3RyYXRlZ3koKTtcblxuICAvKipcbiAgICogSG93IHRvIGhhbmRsZSBhIG5hdmlnYXRpb24gcmVxdWVzdCB0byB0aGUgY3VycmVudCBVUkwuIE9uZSBvZjpcbiAgICpcbiAgICogLSBgJ2lnbm9yZSdgIDogIFRoZSByb3V0ZXIgaWdub3JlcyB0aGUgcmVxdWVzdC5cbiAgICogLSBgJ3JlbG9hZCdgIDogVGhlIHJvdXRlciByZWxvYWRzIHRoZSBVUkwuIFVzZSB0byBpbXBsZW1lbnQgYSBcInJlZnJlc2hcIiBmZWF0dXJlLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdGhpcyBvbmx5IGNvbmZpZ3VyZXMgd2hldGhlciB0aGUgUm91dGUgcmVwcm9jZXNzZXMgdGhlIFVSTCBhbmQgdHJpZ2dlcnMgcmVsYXRlZFxuICAgKiBhY3Rpb24gYW5kIGV2ZW50cyBsaWtlIHJlZGlyZWN0cywgZ3VhcmRzLCBhbmQgcmVzb2x2ZXJzLiBCeSBkZWZhdWx0LCB0aGUgcm91dGVyIHJlLXVzZXMgYVxuICAgKiBjb21wb25lbnQgaW5zdGFuY2Ugd2hlbiBpdCByZS1uYXZpZ2F0ZXMgdG8gdGhlIHNhbWUgY29tcG9uZW50IHR5cGUgd2l0aG91dCB2aXNpdGluZyBhIGRpZmZlcmVudFxuICAgKiBjb21wb25lbnQgZmlyc3QuIFRoaXMgYmVoYXZpb3IgaXMgY29uZmlndXJlZCBieSB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAuIEluIG9yZGVyIHRvIHJlbG9hZFxuICAgKiByb3V0ZWQgY29tcG9uZW50cyBvbiBzYW1lIHVybCBuYXZpZ2F0aW9uLCB5b3UgbmVlZCB0byBzZXQgYG9uU2FtZVVybE5hdmlnYXRpb25gIHRvIGAncmVsb2FkJ2BcbiAgICogX2FuZF8gcHJvdmlkZSBhIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIHdoaWNoIHJldHVybnMgYGZhbHNlYCBmb3IgYHNob3VsZFJldXNlUm91dGVgLlxuICAgKi9cbiAgb25TYW1lVXJsTmF2aWdhdGlvbjogJ3JlbG9hZCd8J2lnbm9yZScgPSAnaWdub3JlJztcblxuICAvKipcbiAgICogSG93IHRvIG1lcmdlIHBhcmFtZXRlcnMsIGRhdGEsIGFuZCByZXNvbHZlZCBkYXRhIGZyb20gcGFyZW50IHRvIGNoaWxkXG4gICAqIHJvdXRlcy4gT25lIG9mOlxuICAgKlxuICAgKiAtIGAnZW1wdHlPbmx5J2AgOiBJbmhlcml0IHBhcmVudCBwYXJhbWV0ZXJzLCBkYXRhLCBhbmQgcmVzb2x2ZWQgZGF0YVxuICAgKiBmb3IgcGF0aC1sZXNzIG9yIGNvbXBvbmVudC1sZXNzIHJvdXRlcy5cbiAgICogLSBgJ2Fsd2F5cydgIDogSW5oZXJpdCBwYXJlbnQgcGFyYW1ldGVycywgZGF0YSwgYW5kIHJlc29sdmVkIGRhdGFcbiAgICogZm9yIGFsbCBjaGlsZCByb3V0ZXMuXG4gICAqL1xuICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiAnZW1wdHlPbmx5J3wnYWx3YXlzJyA9ICdlbXB0eU9ubHknO1xuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZW4gdGhlIHJvdXRlciB1cGRhdGVzIHRoZSBicm93c2VyIFVSTC5cbiAgICogQnkgZGVmYXVsdCAoYFwiZGVmZXJyZWRcImApLCB1cGRhdGVzIHRoZSBicm93c2VyIFVSTCBhZnRlciBuYXZpZ2F0aW9uIGhhcyBmaW5pc2hlZC5cbiAgICogU2V0IHRvIGAnZWFnZXInYCB0byB1cGRhdGUgdGhlIGJyb3dzZXIgVVJMIGF0IHRoZSBiZWdpbm5pbmcgb2YgbmF2aWdhdGlvbi5cbiAgICogWW91IGNhbiBjaG9vc2UgdG8gdXBkYXRlIGVhcmx5IHNvIHRoYXQsIGlmIG5hdmlnYXRpb24gZmFpbHMsXG4gICAqIHlvdSBjYW4gc2hvdyBhbiBlcnJvciBtZXNzYWdlIHdpdGggdGhlIFVSTCB0aGF0IGZhaWxlZC5cbiAgICovXG4gIHVybFVwZGF0ZVN0cmF0ZWd5OiAnZGVmZXJyZWQnfCdlYWdlcicgPSAnZGVmZXJyZWQnO1xuXG4gIC8qKlxuICAgKiBFbmFibGVzIGEgYnVnIGZpeCB0aGF0IGNvcnJlY3RzIHJlbGF0aXZlIGxpbmsgcmVzb2x1dGlvbiBpbiBjb21wb25lbnRzIHdpdGggZW1wdHkgcGF0aHMuXG4gICAqIEBzZWUgYFJvdXRlck1vZHVsZWBcbiAgICovXG4gIHJlbGF0aXZlTGlua1Jlc29sdXRpb246ICdsZWdhY3knfCdjb3JyZWN0ZWQnID0gJ2NvcnJlY3RlZCc7XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgaG93IHRoZSBSb3V0ZXIgYXR0ZW1wdHMgdG8gcmVzdG9yZSBzdGF0ZSB3aGVuIGEgbmF2aWdhdGlvbiBpcyBjYW5jZWxsZWQuXG4gICAqXG4gICAqICdyZXBsYWNlJyAtIEFsd2F5cyB1c2VzIGBsb2NhdGlvbi5yZXBsYWNlU3RhdGVgIHRvIHNldCB0aGUgYnJvd3NlciBzdGF0ZSB0byB0aGUgc3RhdGUgb2YgdGhlXG4gICAqIHJvdXRlciBiZWZvcmUgdGhlIG5hdmlnYXRpb24gc3RhcnRlZC4gVGhpcyBtZWFucyB0aGF0IGlmIHRoZSBVUkwgb2YgdGhlIGJyb3dzZXIgaXMgdXBkYXRlZFxuICAgKiBfYmVmb3JlXyB0aGUgbmF2aWdhdGlvbiBpcyBjYW5jZWxlZCwgdGhlIFJvdXRlciB3aWxsIHNpbXBseSByZXBsYWNlIHRoZSBpdGVtIGluIGhpc3RvcnkgcmF0aGVyXG4gICAqIHRoYW4gdHJ5aW5nIHRvIHJlc3RvcmUgdG8gdGhlIHByZXZpb3VzIGxvY2F0aW9uIGluIHRoZSBzZXNzaW9uIGhpc3RvcnkuIFRoaXMgaGFwcGVucyBtb3N0XG4gICAqIGZyZXF1ZW50bHkgd2l0aCBgdXJsVXBkYXRlU3RyYXRlZ3k6ICdlYWdlcidgIGFuZCBuYXZpZ2F0aW9ucyB3aXRoIHRoZSBicm93c2VyIGJhY2svZm9yd2FyZFxuICAgKiBidXR0b25zLlxuICAgKlxuICAgKiAnY29tcHV0ZWQnIC0gV2lsbCBhdHRlbXB0IHRvIHJldHVybiB0byB0aGUgc2FtZSBpbmRleCBpbiB0aGUgc2Vzc2lvbiBoaXN0b3J5IHRoYXQgY29ycmVzcG9uZHNcbiAgICogdG8gdGhlIEFuZ3VsYXIgcm91dGUgd2hlbiB0aGUgbmF2aWdhdGlvbiBnZXRzIGNhbmNlbGxlZC4gRm9yIGV4YW1wbGUsIGlmIHRoZSBicm93c2VyIGJhY2tcbiAgICogYnV0dG9uIGlzIGNsaWNrZWQgYW5kIHRoZSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGxlZCwgdGhlIFJvdXRlciB3aWxsIHRyaWdnZXIgYSBmb3J3YXJkIG5hdmlnYXRpb25cbiAgICogYW5kIHZpY2UgdmVyc2EuXG4gICAqXG4gICAqIE5vdGU6IHRoZSAnY29tcHV0ZWQnIG9wdGlvbiBpcyBpbmNvbXBhdGlibGUgd2l0aCBhbnkgYFVybEhhbmRsaW5nU3RyYXRlZ3lgIHdoaWNoIG9ubHlcbiAgICogaGFuZGxlcyBhIHBvcnRpb24gb2YgdGhlIFVSTCBiZWNhdXNlIHRoZSBoaXN0b3J5IHJlc3RvcmF0aW9uIG5hdmlnYXRlcyB0byB0aGUgcHJldmlvdXMgcGxhY2UgaW5cbiAgICogdGhlIGJyb3dzZXIgaGlzdG9yeSByYXRoZXIgdGhhbiBzaW1wbHkgcmVzZXR0aW5nIGEgcG9ydGlvbiBvZiB0aGUgVVJMLlxuICAgKlxuICAgKiBUaGUgZGVmYXVsdCB2YWx1ZSBpcyBgcmVwbGFjZWAuXG4gICAqXG4gICAqL1xuICBjYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uOiAncmVwbGFjZSd8J2NvbXB1dGVkJyA9ICdyZXBsYWNlJztcblxuICAvKipcbiAgICogQ3JlYXRlcyB0aGUgcm91dGVyIHNlcnZpY2UuXG4gICAqL1xuICAvLyBUT0RPOiB2c2F2a2luIG1ha2UgaW50ZXJuYWwgYWZ0ZXIgdGhlIGZpbmFsIGlzIG91dC5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT58bnVsbCwgcHJpdmF0ZSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgICAgcHJpdmF0ZSByb290Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIHByaXZhdGUgbG9jYXRpb246IExvY2F0aW9uLCBpbmplY3RvcjogSW5qZWN0b3IsXG4gICAgICBsb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLCBwdWJsaWMgY29uZmlnOiBSb3V0ZXMpIHtcbiAgICBjb25zdCBvbkxvYWRTdGFydCA9IChyOiBSb3V0ZSkgPT4gdGhpcy50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZFN0YXJ0KHIpKTtcbiAgICBjb25zdCBvbkxvYWRFbmQgPSAocjogUm91dGUpID0+IHRoaXMudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRFbmQocikpO1xuXG4gICAgdGhpcy5uZ01vZHVsZSA9IGluamVjdG9yLmdldChOZ01vZHVsZVJlZik7XG4gICAgdGhpcy5jb25zb2xlID0gaW5qZWN0b3IuZ2V0KENvbnNvbGUpO1xuICAgIGNvbnN0IG5nWm9uZSA9IGluamVjdG9yLmdldChOZ1pvbmUpO1xuICAgIHRoaXMuaXNOZ1pvbmVFbmFibGVkID0gbmdab25lIGluc3RhbmNlb2YgTmdab25lICYmIE5nWm9uZS5pc0luQW5ndWxhclpvbmUoKTtcblxuICAgIHRoaXMucmVzZXRDb25maWcoY29uZmlnKTtcbiAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gY3JlYXRlRW1wdHlVcmxUcmVlKCk7XG4gICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy5jdXJyZW50VXJsVHJlZTtcbiAgICB0aGlzLmJyb3dzZXJVcmxUcmVlID0gdGhpcy5jdXJyZW50VXJsVHJlZTtcblxuICAgIHRoaXMuY29uZmlnTG9hZGVyID0gbmV3IFJvdXRlckNvbmZpZ0xvYWRlcihsb2FkZXIsIGNvbXBpbGVyLCBvbkxvYWRTdGFydCwgb25Mb2FkRW5kKTtcbiAgICB0aGlzLnJvdXRlclN0YXRlID0gY3JlYXRlRW1wdHlTdGF0ZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB0aGlzLnJvb3RDb21wb25lbnRUeXBlKTtcblxuICAgIHRoaXMudHJhbnNpdGlvbnMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PE5hdmlnYXRpb25UcmFuc2l0aW9uPih7XG4gICAgICBpZDogMCxcbiAgICAgIHRhcmdldFBhZ2VJZDogMCxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgY3VycmVudFJhd1VybDogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIGV4dHJhY3RlZFVybDogdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QodGhpcy5jdXJyZW50VXJsVHJlZSksXG4gICAgICB1cmxBZnRlclJlZGlyZWN0czogdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QodGhpcy5jdXJyZW50VXJsVHJlZSksXG4gICAgICByYXdVcmw6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBleHRyYXM6IHt9LFxuICAgICAgcmVzb2x2ZTogbnVsbCxcbiAgICAgIHJlamVjdDogbnVsbCxcbiAgICAgIHByb21pc2U6IFByb21pc2UucmVzb2x2ZSh0cnVlKSxcbiAgICAgIHNvdXJjZTogJ2ltcGVyYXRpdmUnLFxuICAgICAgcmVzdG9yZWRTdGF0ZTogbnVsbCxcbiAgICAgIGN1cnJlbnRTbmFwc2hvdDogdGhpcy5yb3V0ZXJTdGF0ZS5zbmFwc2hvdCxcbiAgICAgIHRhcmdldFNuYXBzaG90OiBudWxsLFxuICAgICAgY3VycmVudFJvdXRlclN0YXRlOiB0aGlzLnJvdXRlclN0YXRlLFxuICAgICAgdGFyZ2V0Um91dGVyU3RhdGU6IG51bGwsXG4gICAgICBndWFyZHM6IHtjYW5BY3RpdmF0ZUNoZWNrczogW10sIGNhbkRlYWN0aXZhdGVDaGVja3M6IFtdfSxcbiAgICAgIGd1YXJkc1Jlc3VsdDogbnVsbCxcbiAgICB9KTtcbiAgICB0aGlzLm5hdmlnYXRpb25zID0gdGhpcy5zZXR1cE5hdmlnYXRpb25zKHRoaXMudHJhbnNpdGlvbnMpO1xuXG4gICAgdGhpcy5wcm9jZXNzTmF2aWdhdGlvbnMoKTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0dXBOYXZpZ2F0aW9ucyh0cmFuc2l0aW9uczogT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4pOlxuICAgICAgT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4ge1xuICAgIGNvbnN0IGV2ZW50c1N1YmplY3QgPSAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pO1xuICAgIHJldHVybiB0cmFuc2l0aW9ucy5waXBlKFxuICAgICAgICAgICAgICAgZmlsdGVyKHQgPT4gdC5pZCAhPT0gMCksXG5cbiAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgVVJMXG4gICAgICAgICAgICAgICBtYXAodCA9PlxuICAgICAgICAgICAgICAgICAgICAgICAoey4uLnQsIGV4dHJhY3RlZFVybDogdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QodC5yYXdVcmwpfSBhc1xuICAgICAgICAgICAgICAgICAgICAgICAgTmF2aWdhdGlvblRyYW5zaXRpb24pKSxcblxuICAgICAgICAgICAgICAgLy8gVXNpbmcgc3dpdGNoTWFwIHNvIHdlIGNhbmNlbCBleGVjdXRpbmcgbmF2aWdhdGlvbnMgd2hlbiBhIG5ldyBvbmUgY29tZXMgaW5cbiAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgbGV0IGNvbXBsZXRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICBsZXQgZXJyb3JlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICByZXR1cm4gb2YodCkucGlwZShcbiAgICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBOYXZpZ2F0aW9uIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiB0LmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRpYWxVcmw6IHQuY3VycmVudFJhd1VybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYWN0ZWRVcmw6IHQuZXh0cmFjdGVkVXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHRyaWdnZXI6IHQuc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhczogdC5leHRyYXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNOYXZpZ2F0aW9uOiB0aGlzLmxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbiA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsuLi50aGlzLmxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbiwgcHJldmlvdXNOYXZpZ2F0aW9uOiBudWxsfSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGxcbiAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgc3dpdGNoTWFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmxUcmFuc2l0aW9uID0gIXRoaXMubmF2aWdhdGVkIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LmV4dHJhY3RlZFVybC50b1N0cmluZygpICE9PSB0aGlzLmJyb3dzZXJVcmxUcmVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgIC8qIHx8IHRoaXMuYnJvd3NlclVybFRyZWUudG9TdHJpbmcoKSAhPT0gdGhpcy5jdXJyZW50VXJsVHJlZS50b1N0cmluZygpICovXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIFRPRE8oYXRzY290dCk6IFJ1biBUR1AgdG8gc2VlIGlmIHRoZSBhYm92ZSBjaGFuZ2UgY2FuIGJlIG1hZGUuIFRoZXJlIGFyZVxuICAgICAgICAgICAgICAgICAgICAgICAvLyBzaXR1YXRpb25zIHdoZXJlIGEgbmF2aWdhdGlvbiBpcyBjYW5jZWxlZCBfYWZ0ZXJfIGJyb3dzZXJVcmxUcmVlIGlzXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZWQuIEZvciBleGFtcGxlLCB1cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJzogaWYgYSBuZXdcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gbmF2aWdhdGlvbiBoYXBwZW5zIChpLmUuIGluIGEgZ3VhcmQpLCB0aGlzIHdvdWxkIGNhdXNlIHRoZSByb3V0ZXIgdG9cbiAgICAgICAgICAgICAgICAgICAgICAgLy8gYmUgaW4gYW4gaW52YWxpZCBzdGF0ZSBvZiB0cmFja2luZy5cbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc0N1cnJlbnRVcmwgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMub25TYW1lVXJsTmF2aWdhdGlvbiA9PT0gJ3JlbG9hZCcgPyB0cnVlIDogdXJsVHJhbnNpdGlvbikgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5zaG91bGRQcm9jZXNzVXJsKHQucmF3VXJsKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgc291cmNlIG9mIHRoZSBuYXZpZ2F0aW9uIGlzIGZyb20gYSBicm93c2VyIGV2ZW50LCB0aGUgVVJMIGlzXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIGFscmVhZHkgdXBkYXRlZC4gV2UgYWxyZWFkeSBuZWVkIHRvIHN5bmMgdGhlIGludGVybmFsIHN0YXRlLlxuICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNCcm93c2VyVHJpZ2dlcmVkTmF2aWdhdGlvbih0LnNvdXJjZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUT0RPKGF0c2NvdHQpOiB0aGlzIHNob3VsZCBiZSBgdC5leHRyYWN0ZWRVcmxgLiBUaGUgYGJyb3dzZXJVcmxUcmVlYFxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNob3VsZCBvbmx5IGJlIHRoZSBwYXJ0IG9mIHRoZSBVUkwgdGhhdCBpcyBoYW5kbGVkIGJ5IHRoZSByb3V0ZXIuIEluXG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gYWRkaXRpb24sIHRoaXMgc2hvdWxkIG9ubHkgYmUgZG9uZSBpZiB3ZSBwcm9jZXNzIHRoZSBjdXJyZW50IHVybC5cbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJyb3dzZXJVcmxUcmVlID0gdC5yYXdVcmw7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvY2Vzc0N1cnJlbnRVcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2YodCkucGlwZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZSBOYXZpZ2F0aW9uU3RhcnQgZXZlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoTWFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSB0aGlzLnRyYW5zaXRpb25zLmdldFZhbHVlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5ldyBOYXZpZ2F0aW9uU3RhcnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgdC5zb3VyY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQucmVzdG9yZWRTdGF0ZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0cmFuc2l0aW9uICE9PSB0aGlzLnRyYW5zaXRpb25zLmdldFZhbHVlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGRlbGF5IGlzIHJlcXVpcmVkIHRvIG1hdGNoIG9sZCBiZWhhdmlvciB0aGF0IGZvcmNlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5hdmlnYXRpb24gdG8gYWx3YXlzIGJlIGFzeW5jXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXBwbHlSZWRpcmVjdHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwbHlSZWRpcmVjdHMoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5nTW9kdWxlLmluamVjdG9yLCB0aGlzLmNvbmZpZ0xvYWRlciwgdGhpcy51cmxTZXJpYWxpemVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcpLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY3VycmVudE5hdmlnYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudE5hdmlnYXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi50aGlzLmN1cnJlbnROYXZpZ2F0aW9uISxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsVXJsOiB0LnVybEFmdGVyUmVkaXJlY3RzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVjb2duaXplXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY29nbml6ZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9vdENvbXBvbmVudFR5cGUsIHRoaXMuY29uZmlnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHVybCkgPT4gdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgdGhpcy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWxhdGl2ZUxpbmtSZXNvbHV0aW9uKSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGlmIGluIGBlYWdlcmAgdXBkYXRlIG1vZGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZWFnZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXQuZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEJyb3dzZXJVcmwodC51cmxBZnRlclJlZGlyZWN0cywgdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRPRE8oYXRzY290dCk6IFRoZSBhYm92ZSBsaW5lIGlzIGluY29ycmVjdC4gSXQgc2V0cyB0aGUgdXJsIHRvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgdGhlIHBhcnQgdGhhdCBpcyBoYW5kbGVkIGJ5IHRoZSByb3V0ZXIuIEl0IHNob3VsZCBtZXJnZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGF0IHdpdGggdGhlIHJhd1VybCBzbyB0aGUgdXJsIGluY2x1ZGVzIHNlZ21lbnRzIG5vdCBoYW5kbGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJ5IHRoZSByb3V0ZXI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICBjb25zdCByYXdVcmwgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgdC51cmxBZnRlclJlZGlyZWN0cywgdC5yYXdVcmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgdGhpcy5zZXRCcm93c2VyVXJsKHJhd1VybCwgdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJyb3dzZXJVcmxUcmVlID0gdC51cmxBZnRlclJlZGlyZWN0cztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGaXJlIFJvdXRlc1JlY29nbml6ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByb3V0ZXNSZWNvZ25pemVkID0gbmV3IFJvdXRlc1JlY29nbml6ZWQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVVcmwodC51cmxBZnRlclJlZGlyZWN0cyksIHQudGFyZ2V0U25hcHNob3QhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQocm91dGVzUmVjb2duaXplZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9jZXNzUHJldmlvdXNVcmwgPSB1cmxUcmFuc2l0aW9uICYmIHRoaXMucmF3VXJsVHJlZSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybCh0aGlzLnJhd1VybFRyZWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIC8qIFdoZW4gdGhlIGN1cnJlbnQgVVJMIHNob3VsZG4ndCBiZSBwcm9jZXNzZWQsIGJ1dCB0aGUgcHJldmlvdXMgb25lIHdhcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKiB3ZSBoYW5kbGUgdGhpcyBcImVycm9yIGNvbmRpdGlvblwiIGJ5IG5hdmlnYXRpbmcgdG8gdGhlIHByZXZpb3VzbHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKiBzdWNjZXNzZnVsIFVSTCwgYnV0IGxlYXZpbmcgdGhlIFVSTCBpbnRhY3QuKi9cbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvY2Vzc1ByZXZpb3VzVXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7aWQsIGV4dHJhY3RlZFVybCwgc291cmNlLCByZXN0b3JlZFN0YXRlLCBleHRyYXN9ID0gdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdlN0YXJ0ID0gbmV3IE5hdmlnYXRpb25TdGFydChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZCwgdGhpcy5zZXJpYWxpemVVcmwoZXh0cmFjdGVkVXJsKSwgc291cmNlLCByZXN0b3JlZFN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuYXZTdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRTbmFwc2hvdCA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlRW1wdHlTdGF0ZShleHRyYWN0ZWRVcmwsIHRoaXMucm9vdENvbXBvbmVudFR5cGUpLnNuYXBzaG90O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2Yoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRTbmFwc2hvdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsQWZ0ZXJSZWRpcmVjdHM6IGV4dHJhY3RlZFVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFzOiB7Li4uZXh0cmFzLCBza2lwTG9jYXRpb25DaGFuZ2U6IGZhbHNlLCByZXBsYWNlVXJsOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogV2hlbiBuZWl0aGVyIHRoZSBjdXJyZW50IG9yIHByZXZpb3VzIFVSTCBjYW4gYmUgcHJvY2Vzc2VkLCBkbyBub3RoaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBvdGhlciB0aGFuIHVwZGF0ZSByb3V0ZXIncyBpbnRlcm5hbCByZWZlcmVuY2UgdG8gdGhlIGN1cnJlbnQgXCJzZXR0bGVkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIFVSTC4gVGhpcyB3YXkgdGhlIG5leHQgbmF2aWdhdGlvbiB3aWxsIGJlIGNvbWluZyBmcm9tIHRoZSBjdXJyZW50IFVSTFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICogaW4gdGhlIGJyb3dzZXIuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmF3VXJsVHJlZSA9IHQucmF3VXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5icm93c2VyVXJsVHJlZSA9IHQudXJsQWZ0ZXJSZWRpcmVjdHM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlc29sdmUobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gQmVmb3JlIFByZWFjdGl2YXRpb25cbiAgICAgICAgICAgICAgICAgICAgIHN3aXRjaFRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFNuYXBzaG90LFxuICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBuYXZpZ2F0aW9uSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFjdGVkVXJsOiBhcHBsaWVkVXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICByYXdVcmw6IHJhd1VybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFzOiB7c2tpcExvY2F0aW9uQ2hhbmdlLCByZXBsYWNlVXJsfVxuICAgICAgICAgICAgICAgICAgICAgICB9ID0gdDtcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaG9va3MuYmVmb3JlUHJlYWN0aXZhdGlvbih0YXJnZXRTbmFwc2hvdCEsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBuYXZpZ2F0aW9uSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgYXBwbGllZFVybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmF3VXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBza2lwTG9jYXRpb25DaGFuZ2U6ICEhc2tpcExvY2F0aW9uQ2hhbmdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2VVcmw6ICEhcmVwbGFjZVVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gLS0tIEdVQVJEUyAtLS1cbiAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZ3VhcmRzU3RhcnQgPSBuZXcgR3VhcmRzQ2hlY2tTdGFydChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ISk7XG4gICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KGd1YXJkc1N0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICBtYXAodCA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4udCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGd1YXJkczogZ2V0QWxsUm91dGVHdWFyZHMoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC50YXJnZXRTbmFwc2hvdCEsIHQuY3VycmVudFNuYXBzaG90LCB0aGlzLnJvb3RDb250ZXh0cylcbiAgICAgICAgICAgICAgICAgICAgICAgICB9KSksXG5cbiAgICAgICAgICAgICAgICAgICAgIGNoZWNrR3VhcmRzKHRoaXMubmdNb2R1bGUuaW5qZWN0b3IsIChldnQ6IEV2ZW50KSA9PiB0aGlzLnRyaWdnZXJFdmVudChldnQpKSxcbiAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzVXJsVHJlZSh0Lmd1YXJkc1Jlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvcjogRXJyb3Ime3VybD86IFVybFRyZWV9ID0gbmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgUmVkaXJlY3RpbmcgdG8gXCIke3RoaXMuc2VyaWFsaXplVXJsKHQuZ3VhcmRzUmVzdWx0KX1cImApO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yLnVybCA9IHQuZ3VhcmRzUmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZ3VhcmRzRW5kID0gbmV3IEd1YXJkc0NoZWNrRW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVVcmwodC51cmxBZnRlclJlZGlyZWN0cyksIHQudGFyZ2V0U25hcHNob3QhLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgISF0Lmd1YXJkc1Jlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KGd1YXJkc0VuZCk7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgZmlsdGVyKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXQuZ3VhcmRzUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXN0b3JlSGlzdG9yeSh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbmNlbE5hdmlnYXRpb25UcmFuc2l0aW9uKHQsICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gLS0tIFJFU09MVkUgLS0tXG4gICAgICAgICAgICAgICAgICAgICBzd2l0Y2hUYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGlmICh0Lmd1YXJkcy5jYW5BY3RpdmF0ZUNoZWNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2YodCkucGlwZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVTdGFydCA9IG5ldyBSZXNvbHZlU3RhcnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVVcmwodC51cmxBZnRlclJlZGlyZWN0cyksIHQudGFyZ2V0U25hcHNob3QhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChyZXNvbHZlU3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoTWFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkYXRhUmVzb2x2ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2YodCkucGlwZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZURhdGEoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3ksIHRoaXMubmdNb2R1bGUuaW5qZWN0b3IpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5leHQ6ICgpID0+IGRhdGFSZXNvbHZlZCA9IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcGxldGU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGF0YVJlc29sdmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZUhpc3RvcnkodCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsTmF2aWdhdGlvblRyYW5zaXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYEF0IGxlYXN0IG9uZSByb3V0ZSByZXNvbHZlciBkaWRuJ3QgZW1pdCBhbnkgdmFsdWUuYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVFbmQgPSBuZXcgUmVzb2x2ZUVuZChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzKSwgdC50YXJnZXRTbmFwc2hvdCEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KHJlc29sdmVFbmQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAvLyAtLS0gQUZURVIgUFJFQUNUSVZBVElPTiAtLS1cbiAgICAgICAgICAgICAgICAgICAgIHN3aXRjaFRhcCgodDogTmF2aWdhdGlvblRyYW5zaXRpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFNuYXBzaG90LFxuICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBuYXZpZ2F0aW9uSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFjdGVkVXJsOiBhcHBsaWVkVXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICByYXdVcmw6IHJhd1VybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFzOiB7c2tpcExvY2F0aW9uQ2hhbmdlLCByZXBsYWNlVXJsfVxuICAgICAgICAgICAgICAgICAgICAgICB9ID0gdDtcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaG9va3MuYWZ0ZXJQcmVhY3RpdmF0aW9uKHRhcmdldFNuYXBzaG90ISwge1xuICAgICAgICAgICAgICAgICAgICAgICAgIG5hdmlnYXRpb25JZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBhcHBsaWVkVXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICByYXdVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHNraXBMb2NhdGlvbkNoYW5nZTogISFza2lwTG9jYXRpb25DaGFuZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZVVybDogISFyZXBsYWNlVXJsLFxuICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICBtYXAoKHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFJvdXRlclN0YXRlID0gY3JlYXRlUm91dGVyU3RhdGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvdXRlUmV1c2VTdHJhdGVneSwgdC50YXJnZXRTbmFwc2hvdCEsIHQuY3VycmVudFJvdXRlclN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICh7Li4udCwgdGFyZ2V0Um91dGVyU3RhdGV9KTtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAvKiBPbmNlIGhlcmUsIHdlIGFyZSBhYm91dCB0byBhY3RpdmF0ZSBzeW5jcm9ub3VzbHkuIFRoZSBhc3N1bXB0aW9uIGlzIHRoaXNcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbGwgc3VjY2VlZCwgYW5kIHVzZXIgY29kZSBtYXkgcmVhZCBmcm9tIHRoZSBSb3V0ZXIgc2VydmljZS4gVGhlcmVmb3JlXG4gICAgICAgICAgICAgICAgICAgICAgICBiZWZvcmUgYWN0aXZhdGlvbiwgd2UgbmVlZCB0byB1cGRhdGUgcm91dGVyIHByb3BlcnRpZXMgc3RvcmluZyB0aGUgY3VycmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgVVJMIGFuZCB0aGUgUm91dGVyU3RhdGUsIGFzIHdlbGwgYXMgdXBkYXRlZCB0aGUgYnJvd3NlciBVUkwuIEFsbCB0aGlzIHNob3VsZFxuICAgICAgICAgICAgICAgICAgICAgICAgaGFwcGVuICpiZWZvcmUqIGFjdGl2YXRpbmcuICovXG4gICAgICAgICAgICAgICAgICAgICB0YXAoKHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSB0LnVybEFmdGVyUmVkaXJlY3RzO1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJhd1VybFRyZWUgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHQudXJsQWZ0ZXJSZWRpcmVjdHMsIHQucmF3VXJsKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyB7cm91dGVyU3RhdGU6IFJvdXRlclN0YXRlfSkucm91dGVyU3RhdGUgPSB0LnRhcmdldFJvdXRlclN0YXRlITtcblxuICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2RlZmVycmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdC5leHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEJyb3dzZXJVcmwodGhpcy5yYXdVcmxUcmVlLCB0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5icm93c2VyVXJsVHJlZSA9IHQudXJsQWZ0ZXJSZWRpcmVjdHM7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICBhY3RpdmF0ZVJvdXRlcyhcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb3RDb250ZXh0cywgdGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3ksXG4gICAgICAgICAgICAgICAgICAgICAgICAgKGV2dDogRXZlbnQpID0+IHRoaXMudHJpZ2dlckV2ZW50KGV2dCkpLFxuXG4gICAgICAgICAgICAgICAgICAgICB0YXAoe1xuICAgICAgICAgICAgICAgICAgICAgICBuZXh0KCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAvKiBXaGVuIHRoZSBuYXZpZ2F0aW9uIHN0cmVhbSBmaW5pc2hlcyBlaXRoZXIgdGhyb3VnaCBlcnJvciBvciBzdWNjZXNzLCB3ZVxuICAgICAgICAgICAgICAgICAgICAgICAgKiBzZXQgdGhlIGBjb21wbGV0ZWRgIG9yIGBlcnJvcmVkYCBmbGFnLiBIb3dldmVyLCB0aGVyZSBhcmUgc29tZSBzaXR1YXRpb25zXG4gICAgICAgICAgICAgICAgICAgICAgICAqIHdoZXJlIHdlIGNvdWxkIGdldCBoZXJlIHdpdGhvdXQgZWl0aGVyIG9mIHRob3NlIGJlaW5nIHNldC4gRm9yIGluc3RhbmNlLCBhXG4gICAgICAgICAgICAgICAgICAgICAgICAqIHJlZGlyZWN0IGR1cmluZyBOYXZpZ2F0aW9uU3RhcnQuIFRoZXJlZm9yZSwgdGhpcyBpcyBhIGNhdGNoLWFsbCB0byBtYWtlXG4gICAgICAgICAgICAgICAgICAgICAgICAqIHN1cmUgdGhlIE5hdmlnYXRpb25DYW5jZWxcbiAgICAgICAgICAgICAgICAgICAgICAgICogZXZlbnQgaXMgZmlyZWQgd2hlbiBhIG5hdmlnYXRpb24gZ2V0cyBjYW5jZWxsZWQgYnV0IG5vdCBjYXVnaHQgYnkgb3RoZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICogbWVhbnMuICovXG4gICAgICAgICAgICAgICAgICAgICAgIGlmICghY29tcGxldGVkICYmICFlcnJvcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2FuY2VsYXRpb25SZWFzb24gPSBgTmF2aWdhdGlvbiBJRCAke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkfSBpcyBub3QgZXF1YWwgdG8gdGhlIGN1cnJlbnQgbmF2aWdhdGlvbiBpZCAke3RoaXMubmF2aWdhdGlvbklkfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ3JlcGxhY2UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNdXN0IHJlc2V0IHRvIGN1cnJlbnQgVVJMIHRyZWUgaGVyZSB0byBlbnN1cmUgaGlzdG9yeS5zdGF0ZSBpcyBzZXQuIE9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhIGZyZXNoIHBhZ2UgbG9hZCwgaWYgYSBuZXcgbmF2aWdhdGlvbiBjb21lcyBpbiBiZWZvcmUgYSBzdWNjZXNzZnVsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuYXZpZ2F0aW9uIGNvbXBsZXRlcywgdGhlcmUgd2lsbCBiZSBub3RoaW5nIGluXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBoaXN0b3J5LnN0YXRlLm5hdmlnYXRpb25JZC4gVGhpcyBjYW4gY2F1c2Ugc3luYyBwcm9ibGVtcyB3aXRoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBbmd1bGFySlMgc3luYyBjb2RlIHdoaWNoIGxvb2tzIGZvciBhIHZhbHVlIGhlcmUgaW4gb3JkZXIgdG8gZGV0ZXJtaW5lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3aGV0aGVyIG9yIG5vdCB0byBoYW5kbGUgYSBnaXZlbiBwb3BzdGF0ZSBldmVudCBvciB0byBsZWF2ZSBpdCB0byB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFuZ3VsYXIgcm91dGVyLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXN0b3JlSGlzdG9yeSh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsTmF2aWdhdGlvblRyYW5zaXRpb24odCwgY2FuY2VsYXRpb25SZWFzb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSBjYW5ub3QgdHJpZ2dlciBhIGBsb2NhdGlvbi5oaXN0b3J5R29gIGlmIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2FuY2VsbGF0aW9uIHdhcyBkdWUgdG8gYSBuZXcgbmF2aWdhdGlvbiBiZWZvcmUgdGhlIHByZXZpb3VzIGNvdWxkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb21wbGV0ZS4gVGhpcyBpcyBiZWNhdXNlIGBsb2NhdGlvbi5oaXN0b3J5R29gIHRyaWdnZXJzIGEgYHBvcHN0YXRlYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2hpY2ggd291bGQgYWxzbyB0cmlnZ2VyIGFub3RoZXIgbmF2aWdhdGlvbi4gSW5zdGVhZCwgdHJlYXQgdGhpcyBhcyBhXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZWRpcmVjdCBhbmQgZG8gbm90IHJlc2V0IHRoZSBzdGF0ZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuY2VsTmF2aWdhdGlvblRyYW5zaXRpb24odCwgY2FuY2VsYXRpb25SZWFzb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVE9ETyhhdHNjb3R0KTogVGhlIHNhbWUgcHJvYmxlbSBoYXBwZW5zIGhlcmUgd2l0aCBhIGZyZXNoIHBhZ2UgbG9hZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYW5kIGEgbmV3IG5hdmlnYXRpb24gYmVmb3JlIHRoYXQgY29tcGxldGVzIHdoZXJlIHdlIHdvbid0IHNldCBhIHBhZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlkLlxuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAvLyBjdXJyZW50TmF2aWdhdGlvbiBzaG91bGQgYWx3YXlzIGJlIHJlc2V0IHRvIG51bGwgaGVyZS4gSWYgbmF2aWdhdGlvbiB3YXNcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gc3VjY2Vzc2Z1bCwgbGFzdFN1Y2Nlc3NmdWxUcmFuc2l0aW9uIHdpbGwgaGF2ZSBhbHJlYWR5IGJlZW4gc2V0LiBUaGVyZWZvcmVcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gd2UgY2FuIHNhZmVseSBzZXQgY3VycmVudE5hdmlnYXRpb24gdG8gbnVsbCBoZXJlLlxuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgY2F0Y2hFcnJvcigoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAvLyBUT0RPKGF0c2NvdHQpOiBUaGUgTmF2aWdhdGlvblRyYW5zaXRpb24gYHRgIHVzZWQgaGVyZSBkb2VzIG5vdCBhY2N1cmF0ZWx5XG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHJlZmxlY3QgdGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIHdob2xlIHRyYW5zaXRpb24gYmVjYXVzZSBzb21lIG9wZXJhdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gcmV0dXJuIGEgbmV3IG9iamVjdCByYXRoZXIgdGhhbiBtb2RpZnlpbmcgdGhlIG9uZSBpbiB0aGUgb3V0ZXJtb3N0XG4gICAgICAgICAgICAgICAgICAgICAgIC8vIGBzd2l0Y2hNYXBgLlxuICAgICAgICAgICAgICAgICAgICAgICAvLyAgVGhlIGZpeCBjYW4gbGlrZWx5IGJlIHRvOlxuICAgICAgICAgICAgICAgICAgICAgICAvLyAgMS4gUmVuYW1lIHRoZSBvdXRlciBgdGAgdmFyaWFibGUgc28gaXQncyBub3Qgc2hhZG93ZWQgYWxsIHRoZSB0aW1lIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAvLyAgY29uZnVzaW5nXG4gICAgICAgICAgICAgICAgICAgICAgIC8vICAyLiBLZWVwIHJlYXNzaWduaW5nIHRvIHRoZSBvdXRlciB2YXJpYWJsZSBhZnRlciBlYWNoIHN0YWdlIHRvIGVuc3VyZSBpdFxuICAgICAgICAgICAgICAgICAgICAgICAvLyAgZ2V0cyB1cGRhdGVkLiBPciBjaGFuZ2UgdGhlIGltcGxlbWVudGF0aW9ucyB0byBub3QgcmV0dXJuIGEgY29weS5cbiAgICAgICAgICAgICAgICAgICAgICAgLy8gTm90IGNoYW5nZWQgeWV0IGJlY2F1c2UgaXQgYWZmZWN0cyBleGlzdGluZyBjb2RlIGFuZCB3b3VsZCBuZWVkIHRvIGJlXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHRlc3RlZCBtb3JlIHRob3JvdWdobHkuXG4gICAgICAgICAgICAgICAgICAgICAgIGVycm9yZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAvKiBUaGlzIGVycm9yIHR5cGUgaXMgaXNzdWVkIGR1cmluZyBSZWRpcmVjdCwgYW5kIGlzIGhhbmRsZWQgYXMgYVxuICAgICAgICAgICAgICAgICAgICAgICAgKiBjYW5jZWxsYXRpb24gcmF0aGVyIHRoYW4gYW4gZXJyb3IuICovXG4gICAgICAgICAgICAgICAgICAgICAgIGlmIChpc05hdmlnYXRpb25DYW5jZWxpbmdFcnJvcihlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlZGlyZWN0aW5nID0gaXNVcmxUcmVlKGUudXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJlZGlyZWN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgcHJvcGVydHkgb25seSBpZiB3ZSdyZSBub3QgcmVkaXJlY3RpbmcuIElmIHdlIGxhbmRlZCBvbiBhIHBhZ2UgYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZWRpcmVjdCB0byBgL2Agcm91dGUsIHRoZSBuZXcgbmF2aWdhdGlvbiBpcyBnb2luZyB0byBzZWUgdGhlIGAvYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaXNuJ3QgYSBjaGFuZ2UgZnJvbSB0aGUgZGVmYXVsdCBjdXJyZW50VXJsVHJlZSBhbmQgd29uJ3QgbmF2aWdhdGUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIG9ubHkgYXBwbGljYWJsZSB3aXRoIGluaXRpYWwgbmF2aWdhdGlvbiwgc28gc2V0dGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYG5hdmlnYXRlZGAgb25seSB3aGVuIG5vdCByZWRpcmVjdGluZyByZXNvbHZlcyB0aGlzIHNjZW5hcmlvLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uYXZpZ2F0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXN0b3JlSGlzdG9yeSh0LCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmF2Q2FuY2VsID0gbmV3IE5hdmlnYXRpb25DYW5jZWwoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2Q2FuY2VsKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gcmVkaXJlY3RpbmcsIHdlIG5lZWQgdG8gZGVsYXkgcmVzb2x2aW5nIHRoZSBuYXZpZ2F0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHJvbWlzZSBhbmQgcHVzaCBpdCB0byB0aGUgcmVkaXJlY3QgbmF2aWdhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcmVkaXJlY3RpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHQucmVzb2x2ZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNldFRpbWVvdXQgaXMgcmVxdWlyZWQgc28gdGhpcyBuYXZpZ2F0aW9uIGZpbmlzaGVzIHdpdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSByZXR1cm4gRU1QVFkgYmVsb3cuIElmIGl0IGlzbid0IGFsbG93ZWQgdG8gZmluaXNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwcm9jZXNzaW5nLCB0aGVyZSBjYW4gYmUgbXVsdGlwbGUgbmF2aWdhdGlvbnMgdG8gdGhlIHNhbWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVSTC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXJnZWRUcmVlID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZShlLnVybCwgdGhpcy5yYXdVcmxUcmVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXh0cmFzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNraXBMb2NhdGlvbkNoYW5nZTogdC5leHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBVUkwgaXMgYWxyZWFkeSB1cGRhdGVkIGF0IHRoaXMgcG9pbnQgaWYgd2UgaGF2ZSAnZWFnZXInIFVSTFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZXMgb3IgaWYgdGhlIG5hdmlnYXRpb24gd2FzIHRyaWdnZXJlZCBieSB0aGUgYnJvd3NlciAoYmFja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJ1dHRvbiwgVVJMIGJhciwgZXRjKS4gV2Ugd2FudCB0byByZXBsYWNlIHRoYXQgaXRlbSBpbiBoaXN0b3J5IGlmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIG5hdmlnYXRpb24gaXMgcmVqZWN0ZWQuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZVVybDogdGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0Jyb3dzZXJUcmlnZ2VyZWROYXZpZ2F0aW9uKHQuc291cmNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVyZ2VkVHJlZSwgJ2ltcGVyYXRpdmUnLCBudWxsLCBleHRyYXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7cmVzb2x2ZTogdC5yZXNvbHZlLCByZWplY3Q6IHQucmVqZWN0LCBwcm9taXNlOiB0LnByb21pc2V9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgIC8qIEFsbCBvdGhlciBlcnJvcnMgc2hvdWxkIHJlc2V0IHRvIHRoZSByb3V0ZXIncyBpbnRlcm5hbCBVUkwgcmVmZXJlbmNlIHRvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICogdGhlIHByZS1lcnJvciBzdGF0ZS4gKi9cbiAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc3RvcmVIaXN0b3J5KHQsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdkVycm9yID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5hdmlnYXRpb25FcnJvcih0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuYXZFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHQucmVzb2x2ZSh0aGlzLmVycm9ySGFuZGxlcihlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHQucmVqZWN0KGVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAvLyBUT0RPKGphc29uYWRlbik6IHJlbW92ZSBjYXN0IG9uY2UgZzMgaXMgb24gdXBkYXRlZCBUeXBlU2NyaXB0XG4gICAgICAgICAgICAgICB9KSkgYXMgYW55IGFzIE9ic2VydmFibGU8TmF2aWdhdGlvblRyYW5zaXRpb24+O1xuICB9XG5cbiAgLyoqXG4gICAqIEBpbnRlcm5hbFxuICAgKiBUT0RPOiB0aGlzIHNob3VsZCBiZSByZW1vdmVkIG9uY2UgdGhlIGNvbnN0cnVjdG9yIG9mIHRoZSByb3V0ZXIgbWFkZSBpbnRlcm5hbFxuICAgKi9cbiAgcmVzZXRSb290Q29tcG9uZW50VHlwZShyb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+KTogdm9pZCB7XG4gICAgdGhpcy5yb290Q29tcG9uZW50VHlwZSA9IHJvb3RDb21wb25lbnRUeXBlO1xuICAgIC8vIFRPRE86IHZzYXZraW4gcm91dGVyIDQuMCBzaG91bGQgbWFrZSB0aGUgcm9vdCBjb21wb25lbnQgc2V0IHRvIG51bGxcbiAgICAvLyB0aGlzIHdpbGwgc2ltcGxpZnkgdGhlIGxpZmVjeWNsZSBvZiB0aGUgcm91dGVyLlxuICAgIHRoaXMucm91dGVyU3RhdGUucm9vdC5jb21wb25lbnQgPSB0aGlzLnJvb3RDb21wb25lbnRUeXBlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUcmFuc2l0aW9uKCk6IE5hdmlnYXRpb25UcmFuc2l0aW9uIHtcbiAgICBjb25zdCB0cmFuc2l0aW9uID0gdGhpcy50cmFuc2l0aW9ucy52YWx1ZTtcbiAgICAvLyBUT0RPKGF0c2NvdHQpOiBUaGlzIGNvbW1lbnQgZG9lc24ndCBtYWtlIGl0IGNsZWFyIHdoeSB0aGlzIHZhbHVlIG5lZWRzIHRvIGJlIHNldC4gSW4gdGhlIGNhc2VcbiAgICAvLyBkZXNjcmliZWQgYmVsb3cgKHdoZXJlIHdlIGRvbid0IGhhbmRsZSBwcmV2aW91cyBvciBjdXJyZW50IHVybCksIHRoZSBgYnJvd3NlclVybFRyZWVgIGlzIHNldFxuICAgIC8vIHRvIHRoZSBgdXJsQWZ0ZXJSZWRpcmVjdHNgIHZhbHVlLiBIb3dldmVyLCB0aGVzZSB2YWx1ZXMgKmFyZSBhbHJlYWR5IHRoZSBzYW1lKiBiZWNhdXNlIG9mIHRoZVxuICAgIC8vIGxpbmUgYmVsb3cuIFNvIGl0IHNlZW1zIHRoYXQgd2Ugc2hvdWxkIGJlIGFibGUgdG8gcmVtb3ZlIHRoZSBsaW5lIGJlbG93IGFuZCB0aGUgbGluZSB3aGVyZVxuICAgIC8vIGBicm93c2VyVXJsVHJlZWAgaXMgdXBkYXRlZCB3aGVuIHdlIGFyZW4ndCBoYW5kbGluZyBhbnkgcGFydCBvZiB0aGUgbmF2aWdhdGlvbiB1cmwuXG4gICAgLy8gUnVuIFRHUCB0byBjb25maXJtIHRoYXQgdGhpcyBjYW4gYmUgZG9uZS5cblxuICAgIC8vIFRoaXMgdmFsdWUgbmVlZHMgdG8gYmUgc2V0LiBPdGhlciB2YWx1ZXMgc3VjaCBhcyBleHRyYWN0ZWRVcmwgYXJlIHNldCBvbiBpbml0aWFsIG5hdmlnYXRpb25cbiAgICAvLyBidXQgdGhlIHVybEFmdGVyUmVkaXJlY3RzIG1heSBub3QgZ2V0IHNldCBpZiB3ZSBhcmVuJ3QgcHJvY2Vzc2luZyB0aGUgbmV3IFVSTCAqYW5kKiBub3RcbiAgICAvLyBwcm9jZXNzaW5nIHRoZSBwcmV2aW91cyBVUkwuXG4gICAgdHJhbnNpdGlvbi51cmxBZnRlclJlZGlyZWN0cyA9IHRoaXMuYnJvd3NlclVybFRyZWU7XG4gICAgcmV0dXJuIHRyYW5zaXRpb247XG4gIH1cblxuICBwcml2YXRlIHNldFRyYW5zaXRpb24odDogUGFydGlhbDxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4pOiB2b2lkIHtcbiAgICB0aGlzLnRyYW5zaXRpb25zLm5leHQoey4uLnRoaXMuZ2V0VHJhbnNpdGlvbigpLCAuLi50fSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyIGFuZCBwZXJmb3JtcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaW5pdGlhbE5hdmlnYXRpb24oKTogdm9pZCB7XG4gICAgdGhpcy5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICBpZiAodGhpcy5uYXZpZ2F0aW9uSWQgPT09IDApIHtcbiAgICAgIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmxvY2F0aW9uLnBhdGgodHJ1ZSksIHtyZXBsYWNlVXJsOiB0cnVlfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdXAgdGhlIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lci4gVGhpcyBsaXN0ZW5lciBkZXRlY3RzIG5hdmlnYXRpb25zIHRyaWdnZXJlZCBmcm9tIG91dHNpZGVcbiAgICogdGhlIFJvdXRlciAodGhlIGJyb3dzZXIgYmFjay9mb3J3YXJkIGJ1dHRvbnMsIGZvciBleGFtcGxlKSBhbmQgc2NoZWR1bGVzIGEgY29ycmVzcG9uZGluZyBSb3V0ZXJcbiAgICogbmF2aWdhdGlvbiBzbyB0aGF0IHRoZSBjb3JyZWN0IGV2ZW50cywgZ3VhcmRzLCBldGMuIGFyZSB0cmlnZ2VyZWQuXG4gICAqL1xuICBzZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTogdm9pZCB7XG4gICAgLy8gRG9uJ3QgbmVlZCB0byB1c2UgWm9uZS53cmFwIGFueSBtb3JlLCBiZWNhdXNlIHpvbmUuanNcbiAgICAvLyBhbHJlYWR5IHBhdGNoIG9uUG9wU3RhdGUsIHNvIGxvY2F0aW9uIGNoYW5nZSBjYWxsYmFjayB3aWxsXG4gICAgLy8gcnVuIGludG8gbmdab25lXG4gICAgaWYgKCF0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uID0gdGhpcy5sb2NhdGlvbi5zdWJzY3JpYmUoZXZlbnQgPT4ge1xuICAgICAgICBjb25zdCBzb3VyY2UgPSBldmVudFsndHlwZSddID09PSAncG9wc3RhdGUnID8gJ3BvcHN0YXRlJyA6ICdoYXNoY2hhbmdlJztcbiAgICAgICAgaWYgKHNvdXJjZSA9PT0gJ3BvcHN0YXRlJykge1xuICAgICAgICAgIC8vIFRoZSBgc2V0VGltZW91dGAgd2FzIGFkZGVkIGluICMxMjE2MCBhbmQgaXMgbGlrZWx5IHRvIHN1cHBvcnQgQW5ndWxhci9Bbmd1bGFySlNcbiAgICAgICAgICAvLyBoeWJyaWQgYXBwcy5cbiAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHtyZXBsYWNlVXJsOiB0cnVlfTtcbiAgICAgICAgICAgIC8vIE5hdmlnYXRpb25zIGNvbWluZyBmcm9tIEFuZ3VsYXIgcm91dGVyIGhhdmUgYSBuYXZpZ2F0aW9uSWQgc3RhdGVcbiAgICAgICAgICAgIC8vIHByb3BlcnR5LiBXaGVuIHRoaXMgZXhpc3RzLCByZXN0b3JlIHRoZSBzdGF0ZS5cbiAgICAgICAgICAgIGNvbnN0IHN0YXRlID0gZXZlbnQuc3RhdGU/Lm5hdmlnYXRpb25JZCA/IGV2ZW50LnN0YXRlIDogbnVsbDtcbiAgICAgICAgICAgIGlmIChzdGF0ZSkge1xuICAgICAgICAgICAgICBjb25zdCBzdGF0ZUNvcHkgPSB7Li4uc3RhdGV9IGFzIFBhcnRpYWw8UmVzdG9yZWRTdGF0ZT47XG4gICAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZUNvcHkubmF2aWdhdGlvbklkO1xuICAgICAgICAgICAgICBkZWxldGUgc3RhdGVDb3B5Lsm1cm91dGVyUGFnZUlkO1xuICAgICAgICAgICAgICBpZiAoT2JqZWN0LmtleXMoc3RhdGVDb3B5KS5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICBleHRyYXMuc3RhdGUgPSBzdGF0ZUNvcHk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHVybFRyZWUgPSB0aGlzLnBhcnNlVXJsKGV2ZW50Wyd1cmwnXSEpO1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24odXJsVHJlZSwgc291cmNlLCBzdGF0ZSwgZXh0cmFzKTtcbiAgICAgICAgICB9LCAwKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIFRoZSBjdXJyZW50IFVSTC4gKi9cbiAgZ2V0IHVybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnNlcmlhbGl6ZVVybCh0aGlzLmN1cnJlbnRVcmxUcmVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IGBOYXZpZ2F0aW9uYCBvYmplY3Qgd2hlbiB0aGUgcm91dGVyIGlzIG5hdmlnYXRpbmcsXG4gICAqIGFuZCBgbnVsbGAgd2hlbiBpZGxlLlxuICAgKi9cbiAgZ2V0Q3VycmVudE5hdmlnYXRpb24oKTogTmF2aWdhdGlvbnxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50TmF2aWdhdGlvbjtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgdHJpZ2dlckV2ZW50KGV2ZW50OiBFdmVudCk6IHZvaWQge1xuICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PikubmV4dChldmVudCk7XG4gIH1cblxuICAvKipcbiAgICogUmVzZXRzIHRoZSByb3V0ZSBjb25maWd1cmF0aW9uIHVzZWQgZm9yIG5hdmlnYXRpb24gYW5kIGdlbmVyYXRpbmcgbGlua3MuXG4gICAqXG4gICAqIEBwYXJhbSBjb25maWcgVGhlIHJvdXRlIGFycmF5IGZvciB0aGUgbmV3IGNvbmZpZ3VyYXRpb24uXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIucmVzZXRDb25maWcoW1xuICAgKiAgeyBwYXRoOiAndGVhbS86aWQnLCBjb21wb25lbnQ6IFRlYW1DbXAsIGNoaWxkcmVuOiBbXG4gICAqICAgIHsgcGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wIH0sXG4gICAqICAgIHsgcGF0aDogJ3VzZXIvOm5hbWUnLCBjb21wb25lbnQ6IFVzZXJDbXAgfVxuICAgKiAgXX1cbiAgICogXSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcmVzZXRDb25maWcoY29uZmlnOiBSb3V0ZXMpOiB2b2lkIHtcbiAgICB2YWxpZGF0ZUNvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gICAgdGhpcy5uYXZpZ2F0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSAtMTtcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5kaXNwb3NlKCk7XG4gIH1cblxuICAvKiogRGlzcG9zZXMgb2YgdGhlIHJvdXRlci4gKi9cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLnRyYW5zaXRpb25zLmNvbXBsZXRlKCk7XG4gICAgaWYgKHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24gPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHRoaXMuZGlzcG9zZWQgPSB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEFwcGVuZHMgVVJMIHNlZ21lbnRzIHRvIHRoZSBjdXJyZW50IFVSTCB0cmVlIHRvIGNyZWF0ZSBhIG5ldyBVUkwgdHJlZS5cbiAgICpcbiAgICogQHBhcmFtIGNvbW1hbmRzIEFuIGFycmF5IG9mIFVSTCBmcmFnbWVudHMgd2l0aCB3aGljaCB0byBjb25zdHJ1Y3QgdGhlIG5ldyBVUkwgdHJlZS5cbiAgICogSWYgdGhlIHBhdGggaXMgc3RhdGljLCBjYW4gYmUgdGhlIGxpdGVyYWwgVVJMIHN0cmluZy4gRm9yIGEgZHluYW1pYyBwYXRoLCBwYXNzIGFuIGFycmF5IG9mIHBhdGhcbiAgICogc2VnbWVudHMsIGZvbGxvd2VkIGJ5IHRoZSBwYXJhbWV0ZXJzIGZvciBlYWNoIHNlZ21lbnQuXG4gICAqIFRoZSBmcmFnbWVudHMgYXJlIGFwcGxpZWQgdG8gdGhlIGN1cnJlbnQgVVJMIHRyZWUgb3IgdGhlIG9uZSBwcm92aWRlZCAgaW4gdGhlIGByZWxhdGl2ZVRvYFxuICAgKiBwcm9wZXJ0eSBvZiB0aGUgb3B0aW9ucyBvYmplY3QsIGlmIHN1cHBsaWVkLlxuICAgKiBAcGFyYW0gbmF2aWdhdGlvbkV4dHJhcyBPcHRpb25zIHRoYXQgY29udHJvbCB0aGUgbmF2aWdhdGlvbiBzdHJhdGVneS5cbiAgICogQHJldHVybnMgVGhlIG5ldyBVUkwgdHJlZS5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogYGBgXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMy91c2VyLzExXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywgJ3VzZXInLCAxMV0pO1xuICAgKlxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzM7ZXhwYW5kPXRydWUvdXNlci8xMVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtleHBhbmQ6IHRydWV9LCAndXNlcicsIDExXSk7XG4gICAqXG4gICAqIC8vIHlvdSBjYW4gY29sbGFwc2Ugc3RhdGljIHNlZ21lbnRzIGxpa2UgdGhpcyAodGhpcyB3b3JrcyBvbmx5IHdpdGggdGhlIGZpcnN0IHBhc3NlZC1pbiB2YWx1ZSk6XG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0vMzMvdXNlcicsIHVzZXJJZF0pO1xuICAgKlxuICAgKiAvLyBJZiB0aGUgZmlyc3Qgc2VnbWVudCBjYW4gY29udGFpbiBzbGFzaGVzLCBhbmQgeW91IGRvIG5vdCB3YW50IHRoZSByb3V0ZXIgdG8gc3BsaXQgaXQsXG4gICAqIC8vIHlvdSBjYW4gZG8gdGhlIGZvbGxvd2luZzpcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoW3tzZWdtZW50UGF0aDogJy9vbmUvdHdvJ31dKTtcbiAgICpcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzLyh1c2VyLzExLy9yaWdodDpjaGF0KVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDogJ2NoYXQnfX1dKTtcbiAgICpcbiAgICogLy8gcmVtb3ZlIHRoZSByaWdodCBzZWNvbmRhcnkgbm9kZVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDogbnVsbH19XSk7XG4gICAqXG4gICAqIC8vIGFzc3VtaW5nIHRoZSBjdXJyZW50IHVybCBpcyBgL3RlYW0vMzMvdXNlci8xMWAgYW5kIHRoZSByb3V0ZSBwb2ludHMgdG8gYHVzZXIvMTFgXG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzMzL3VzZXIvMTEvZGV0YWlsc1xuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJ2RldGFpbHMnXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzMzL3VzZXIvMjJcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycuLi8yMiddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vNDQvdXNlci8yMlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy4uLy4uL3RlYW0vNDQvdXNlci8yMiddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogTm90ZSB0aGF0IGEgdmFsdWUgb2YgYG51bGxgIG9yIGB1bmRlZmluZWRgIGZvciBgcmVsYXRpdmVUb2AgaW5kaWNhdGVzIHRoYXQgdGhlXG4gICAqIHRyZWUgc2hvdWxkIGJlIGNyZWF0ZWQgcmVsYXRpdmUgdG8gdGhlIHJvb3QuXG4gICAqIGBgYFxuICAgKi9cbiAgY3JlYXRlVXJsVHJlZShjb21tYW5kczogYW55W10sIG5hdmlnYXRpb25FeHRyYXM6IFVybENyZWF0aW9uT3B0aW9ucyA9IHt9KTogVXJsVHJlZSB7XG4gICAgY29uc3Qge3JlbGF0aXZlVG8sIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCwgcXVlcnlQYXJhbXNIYW5kbGluZywgcHJlc2VydmVGcmFnbWVudH0gPVxuICAgICAgICBuYXZpZ2F0aW9uRXh0cmFzO1xuICAgIGNvbnN0IGEgPSByZWxhdGl2ZVRvIHx8IHRoaXMucm91dGVyU3RhdGUucm9vdDtcbiAgICBjb25zdCBmID0gcHJlc2VydmVGcmFnbWVudCA/IHRoaXMuY3VycmVudFVybFRyZWUuZnJhZ21lbnQgOiBmcmFnbWVudDtcbiAgICBsZXQgcTogUGFyYW1zfG51bGwgPSBudWxsO1xuICAgIHN3aXRjaCAocXVlcnlQYXJhbXNIYW5kbGluZykge1xuICAgICAgY2FzZSAnbWVyZ2UnOlxuICAgICAgICBxID0gey4uLnRoaXMuY3VycmVudFVybFRyZWUucXVlcnlQYXJhbXMsIC4uLnF1ZXJ5UGFyYW1zfTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdwcmVzZXJ2ZSc6XG4gICAgICAgIHEgPSB0aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHEgPSBxdWVyeVBhcmFtcyB8fCBudWxsO1xuICAgIH1cbiAgICBpZiAocSAhPT0gbnVsbCkge1xuICAgICAgcSA9IHRoaXMucmVtb3ZlRW1wdHlQcm9wcyhxKTtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZVVybFRyZWUoYSwgdGhpcy5jdXJyZW50VXJsVHJlZSwgY29tbWFuZHMsIHEsIGYgPz8gbnVsbCk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGVzIHRvIGEgdmlldyB1c2luZyBhbiBhYnNvbHV0ZSByb3V0ZSBwYXRoLlxuICAgKlxuICAgKiBAcGFyYW0gdXJsIEFuIGFic29sdXRlIHBhdGggZm9yIGEgZGVmaW5lZCByb3V0ZS4gVGhlIGZ1bmN0aW9uIGRvZXMgbm90IGFwcGx5IGFueSBkZWx0YSB0byB0aGVcbiAgICogICAgIGN1cnJlbnQgVVJMLlxuICAgKiBAcGFyYW0gZXh0cmFzIEFuIG9iamVjdCBjb250YWluaW5nIHByb3BlcnRpZXMgdGhhdCBtb2RpZnkgdGhlIG5hdmlnYXRpb24gc3RyYXRlZ3kuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvICd0cnVlJyB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsXG4gICAqIHRvICdmYWxzZScgd2hlbiBuYXZpZ2F0aW9uIGZhaWxzLCBvciBpcyByZWplY3RlZCBvbiBlcnJvci5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBjYWxscyByZXF1ZXN0IG5hdmlnYXRpb24gdG8gYW4gYWJzb2x1dGUgcGF0aC5cbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiKTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiLCB7IHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRlcilcbiAgICpcbiAgICovXG4gIG5hdmlnYXRlQnlVcmwodXJsOiBzdHJpbmd8VXJsVHJlZSwgZXh0cmFzOiBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zID0ge1xuICAgIHNraXBMb2NhdGlvbkNoYW5nZTogZmFsc2VcbiAgfSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fFxuICAgICAgICBuZ0Rldk1vZGUgJiYgdGhpcy5pc05nWm9uZUVuYWJsZWQgJiYgIU5nWm9uZS5pc0luQW5ndWxhclpvbmUoKSkge1xuICAgICAgdGhpcy5jb25zb2xlLndhcm4oXG4gICAgICAgICAgYE5hdmlnYXRpb24gdHJpZ2dlcmVkIG91dHNpZGUgQW5ndWxhciB6b25lLCBkaWQgeW91IGZvcmdldCB0byBjYWxsICduZ1pvbmUucnVuKCknP2ApO1xuICAgIH1cblxuICAgIGNvbnN0IHVybFRyZWUgPSBpc1VybFRyZWUodXJsKSA/IHVybCA6IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICBjb25zdCBtZXJnZWRUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHVybFRyZWUsIHRoaXMucmF3VXJsVHJlZSk7XG5cbiAgICByZXR1cm4gdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24obWVyZ2VkVHJlZSwgJ2ltcGVyYXRpdmUnLCBudWxsLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBhcnJheSBvZiBjb21tYW5kcyBhbmQgYSBzdGFydGluZyBwb2ludC5cbiAgICogSWYgbm8gc3RhcnRpbmcgcm91dGUgaXMgcHJvdmlkZWQsIHRoZSBuYXZpZ2F0aW9uIGlzIGFic29sdXRlLlxuICAgKlxuICAgKiBAcGFyYW0gY29tbWFuZHMgQW4gYXJyYXkgb2YgVVJMIGZyYWdtZW50cyB3aXRoIHdoaWNoIHRvIGNvbnN0cnVjdCB0aGUgdGFyZ2V0IFVSTC5cbiAgICogSWYgdGhlIHBhdGggaXMgc3RhdGljLCBjYW4gYmUgdGhlIGxpdGVyYWwgVVJMIHN0cmluZy4gRm9yIGEgZHluYW1pYyBwYXRoLCBwYXNzIGFuIGFycmF5IG9mIHBhdGhcbiAgICogc2VnbWVudHMsIGZvbGxvd2VkIGJ5IHRoZSBwYXJhbWV0ZXJzIGZvciBlYWNoIHNlZ21lbnQuXG4gICAqIFRoZSBmcmFnbWVudHMgYXJlIGFwcGxpZWQgdG8gdGhlIGN1cnJlbnQgVVJMIG9yIHRoZSBvbmUgcHJvdmlkZWQgIGluIHRoZSBgcmVsYXRpdmVUb2AgcHJvcGVydHlcbiAgICogb2YgdGhlIG9wdGlvbnMgb2JqZWN0LCBpZiBzdXBwbGllZC5cbiAgICogQHBhcmFtIGV4dHJhcyBBbiBvcHRpb25zIG9iamVjdCB0aGF0IGRldGVybWluZXMgaG93IHRoZSBVUkwgc2hvdWxkIGJlIGNvbnN0cnVjdGVkIG9yXG4gICAqICAgICBpbnRlcnByZXRlZC5cbiAgICpcbiAgICogQHJldHVybnMgQSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gYHRydWVgIHdoZW4gbmF2aWdhdGlvbiBzdWNjZWVkcywgdG8gYGZhbHNlYCB3aGVuIG5hdmlnYXRpb25cbiAgICogICAgIGZhaWxzLFxuICAgKiBvciBpcyByZWplY3RlZCBvbiBlcnJvci5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBjYWxscyByZXF1ZXN0IG5hdmlnYXRpb24gdG8gYSBkeW5hbWljIHJvdXRlIHBhdGggcmVsYXRpdmUgdG8gdGhlIGN1cnJlbnQgVVJMLlxuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTCwgb3ZlcnJpZGluZyB0aGUgZGVmYXVsdCBiZWhhdmlvclxuICAgKiByb3V0ZXIubmF2aWdhdGUoWyd0ZWFtJywgMzMsICd1c2VyJywgMTFdLCB7cmVsYXRpdmVUbzogcm91dGUsIHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZX0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKVxuICAgKlxuICAgKi9cbiAgbmF2aWdhdGUoY29tbWFuZHM6IGFueVtdLCBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7c2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZX0pOlxuICAgICAgUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdmFsaWRhdGVDb21tYW5kcyhjb21tYW5kcyk7XG4gICAgcmV0dXJuIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmNyZWF0ZVVybFRyZWUoY29tbWFuZHMsIGV4dHJhcyksIGV4dHJhcyk7XG4gIH1cblxuICAvKiogU2VyaWFsaXplcyBhIGBVcmxUcmVlYCBpbnRvIGEgc3RyaW5nICovXG4gIHNlcmlhbGl6ZVVybCh1cmw6IFVybFRyZWUpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHVybCk7XG4gIH1cblxuICAvKiogUGFyc2VzIGEgc3RyaW5nIGludG8gYSBgVXJsVHJlZWAgKi9cbiAgcGFyc2VVcmwodXJsOiBzdHJpbmcpOiBVcmxUcmVlIHtcbiAgICBsZXQgdXJsVHJlZTogVXJsVHJlZTtcbiAgICB0cnkge1xuICAgICAgdXJsVHJlZSA9IHRoaXMudXJsU2VyaWFsaXplci5wYXJzZSh1cmwpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHVybFRyZWUgPSB0aGlzLm1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcihlLCB0aGlzLnVybFNlcmlhbGl6ZXIsIHVybCk7XG4gICAgfVxuICAgIHJldHVybiB1cmxUcmVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciB0aGUgdXJsIGlzIGFjdGl2YXRlZC5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWRcbiAgICogVXNlIGBJc0FjdGl2ZU1hdGNoT3B0aW9uc2AgaW5zdGVhZC5cbiAgICpcbiAgICogLSBUaGUgZXF1aXZhbGVudCBgSXNBY3RpdmVNYXRjaE9wdGlvbnNgIGZvciBgdHJ1ZWAgaXNcbiAgICogYHtwYXRoczogJ2V4YWN0JywgcXVlcnlQYXJhbXM6ICdleGFjdCcsIGZyYWdtZW50OiAnaWdub3JlZCcsIG1hdHJpeFBhcmFtczogJ2lnbm9yZWQnfWAuXG4gICAqIC0gVGhlIGVxdWl2YWxlbnQgZm9yIGBmYWxzZWAgaXNcbiAgICogYHtwYXRoczogJ3N1YnNldCcsIHF1ZXJ5UGFyYW1zOiAnc3Vic2V0JywgZnJhZ21lbnQ6ICdpZ25vcmVkJywgbWF0cml4UGFyYW1zOiAnaWdub3JlZCd9YC5cbiAgICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIGV4YWN0OiBib29sZWFuKTogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciB0aGUgdXJsIGlzIGFjdGl2YXRlZC5cbiAgICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIG1hdGNoT3B0aW9uczogSXNBY3RpdmVNYXRjaE9wdGlvbnMpOiBib29sZWFuO1xuICAvKiogQGludGVybmFsICovXG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIG1hdGNoT3B0aW9uczogYm9vbGVhbnxJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IGJvb2xlYW47XG4gIGlzQWN0aXZlKHVybDogc3RyaW5nfFVybFRyZWUsIG1hdGNoT3B0aW9uczogYm9vbGVhbnxJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IGJvb2xlYW4ge1xuICAgIGxldCBvcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucztcbiAgICBpZiAobWF0Y2hPcHRpb25zID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zID0gey4uLmV4YWN0TWF0Y2hPcHRpb25zfTtcbiAgICB9IGVsc2UgaWYgKG1hdGNoT3B0aW9ucyA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMgPSB7Li4uc3Vic2V0TWF0Y2hPcHRpb25zfTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucyA9IG1hdGNoT3B0aW9ucztcbiAgICB9XG4gICAgaWYgKGlzVXJsVHJlZSh1cmwpKSB7XG4gICAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybCwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybFRyZWUsIG9wdGlvbnMpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVFbXB0eVByb3BzKHBhcmFtczogUGFyYW1zKTogUGFyYW1zIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMocGFyYW1zKS5yZWR1Y2UoKHJlc3VsdDogUGFyYW1zLCBrZXk6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgdmFsdWU6IGFueSA9IHBhcmFtc1trZXldO1xuICAgICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSwge30pO1xuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzTmF2aWdhdGlvbnMoKTogdm9pZCB7XG4gICAgdGhpcy5uYXZpZ2F0aW9ucy5zdWJzY3JpYmUoXG4gICAgICAgIHQgPT4ge1xuICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSB0LmlkO1xuICAgICAgICAgIHRoaXMuY3VycmVudFBhZ2VJZCA9IHQudGFyZ2V0UGFnZUlkO1xuICAgICAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25FbmQoXG4gICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIHRoaXMuc2VyaWFsaXplVXJsKHRoaXMuY3VycmVudFVybFRyZWUpKSk7XG4gICAgICAgICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bE5hdmlnYXRpb24gPSB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uO1xuICAgICAgICAgIHQucmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgfSxcbiAgICAgICAgZSA9PiB7XG4gICAgICAgICAgdGhpcy5jb25zb2xlLndhcm4oYFVuaGFuZGxlZCBOYXZpZ2F0aW9uIEVycm9yOiAke2V9YCk7XG4gICAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzY2hlZHVsZU5hdmlnYXRpb24oXG4gICAgICByYXdVcmw6IFVybFRyZWUsIHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIsIHJlc3RvcmVkU3RhdGU6IFJlc3RvcmVkU3RhdGV8bnVsbCxcbiAgICAgIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyxcbiAgICAgIHByaW9yUHJvbWlzZT86IHtyZXNvbHZlOiBhbnksIHJlamVjdDogYW55LCBwcm9taXNlOiBQcm9taXNlPGJvb2xlYW4+fSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICh0aGlzLmRpc3Bvc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGZhbHNlKTtcbiAgICB9XG5cbiAgICAvLyAqIEltcGVyYXRpdmUgbmF2aWdhdGlvbnMgKHJvdXRlci5uYXZpZ2F0ZSkgbWlnaHQgdHJpZ2dlciBhZGRpdGlvbmFsIG5hdmlnYXRpb25zIHRvIHRoZSBzYW1lXG4gICAgLy8gICBVUkwgdmlhIGEgcG9wc3RhdGUgZXZlbnQgYW5kIHRoZSBsb2NhdGlvbkNoYW5nZUxpc3RlbmVyLiBXZSBzaG91bGQgc2tpcCB0aGVzZSBkdXBsaWNhdGVcbiAgICAvLyAgIG5hdnMuIER1cGxpY2F0ZXMgbWF5IGFsc28gYmUgdHJpZ2dlcmVkIGJ5IGF0dGVtcHRzIHRvIHN5bmMgQW5ndWxhckpTIGFuZCBBbmd1bGFyIHJvdXRlclxuICAgIC8vICAgc3RhdGVzLlxuICAgIC8vICogSW1wZXJhdGl2ZSBuYXZpZ2F0aW9ucyBjYW4gYmUgY2FuY2VsbGVkIGJ5IHJvdXRlciBndWFyZHMsIG1lYW5pbmcgdGhlIFVSTCB3b24ndCBjaGFuZ2UuIElmXG4gICAgLy8gICB0aGUgdXNlciBmb2xsb3dzIHRoYXQgd2l0aCBhIG5hdmlnYXRpb24gdXNpbmcgdGhlIGJhY2svZm9yd2FyZCBidXR0b24gb3IgbWFudWFsIFVSTCBjaGFuZ2UsXG4gICAgLy8gICB0aGUgZGVzdGluYXRpb24gbWF5IGJlIHRoZSBzYW1lIGFzIHRoZSBwcmV2aW91cyBpbXBlcmF0aXZlIGF0dGVtcHQuIFdlIHNob3VsZCBub3Qgc2tpcFxuICAgIC8vICAgdGhlc2UgbmF2aWdhdGlvbnMgYmVjYXVzZSBpdCdzIGEgc2VwYXJhdGUgY2FzZSBmcm9tIHRoZSBvbmUgYWJvdmUgLS0gaXQncyBub3QgYSBkdXBsaWNhdGVcbiAgICAvLyAgIG5hdmlnYXRpb24uXG4gICAgY29uc3QgbGFzdE5hdmlnYXRpb24gPSB0aGlzLmdldFRyYW5zaXRpb24oKTtcbiAgICAvLyBXZSBkb24ndCB3YW50IHRvIHNraXAgZHVwbGljYXRlIHN1Y2Nlc3NmdWwgbmF2cyBpZiB0aGV5J3JlIGltcGVyYXRpdmUgYmVjYXVzZVxuICAgIC8vIG9uU2FtZVVybE5hdmlnYXRpb24gY291bGQgYmUgJ3JlbG9hZCcgKHNvIHRoZSBkdXBsaWNhdGUgaXMgaW50ZW5kZWQpLlxuICAgIGNvbnN0IGJyb3dzZXJOYXZQcmVjZWRlZEJ5Um91dGVyTmF2ID0gaXNCcm93c2VyVHJpZ2dlcmVkTmF2aWdhdGlvbihzb3VyY2UpICYmIGxhc3ROYXZpZ2F0aW9uICYmXG4gICAgICAgICFpc0Jyb3dzZXJUcmlnZ2VyZWROYXZpZ2F0aW9uKGxhc3ROYXZpZ2F0aW9uLnNvdXJjZSk7XG4gICAgY29uc3QgbGFzdE5hdmlnYXRpb25TdWNjZWVkZWQgPSB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPT09IGxhc3ROYXZpZ2F0aW9uLmlkO1xuICAgIC8vIElmIHRoZSBsYXN0IG5hdmlnYXRpb24gc3VjY2VlZGVkIG9yIGlzIGluIGZsaWdodCwgd2UgY2FuIHVzZSB0aGUgcmF3VXJsIGFzIHRoZSBjb21wYXJpc29uLlxuICAgIC8vIEhvd2V2ZXIsIGlmIGl0IGZhaWxlZCwgd2Ugc2hvdWxkIGNvbXBhcmUgdG8gdGhlIGZpbmFsIHJlc3VsdCAodXJsQWZ0ZXJSZWRpcmVjdHMpLlxuICAgIGNvbnN0IGxhc3ROYXZpZ2F0aW9uVXJsID0gKGxhc3ROYXZpZ2F0aW9uU3VjY2VlZGVkIHx8IHRoaXMuY3VycmVudE5hdmlnYXRpb24pID9cbiAgICAgICAgbGFzdE5hdmlnYXRpb24ucmF3VXJsIDpcbiAgICAgICAgbGFzdE5hdmlnYXRpb24udXJsQWZ0ZXJSZWRpcmVjdHM7XG4gICAgY29uc3QgZHVwbGljYXRlTmF2ID0gbGFzdE5hdmlnYXRpb25VcmwudG9TdHJpbmcoKSA9PT0gcmF3VXJsLnRvU3RyaW5nKCk7XG4gICAgaWYgKGJyb3dzZXJOYXZQcmVjZWRlZEJ5Um91dGVyTmF2ICYmIGR1cGxpY2F0ZU5hdikge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKTsgIC8vIHJldHVybiB2YWx1ZSBpcyBub3QgdXNlZFxuICAgIH1cblxuICAgIGxldCByZXNvbHZlOiBhbnk7XG4gICAgbGV0IHJlamVjdDogYW55O1xuICAgIGxldCBwcm9taXNlOiBQcm9taXNlPGJvb2xlYW4+O1xuICAgIGlmIChwcmlvclByb21pc2UpIHtcbiAgICAgIHJlc29sdmUgPSBwcmlvclByb21pc2UucmVzb2x2ZTtcbiAgICAgIHJlamVjdCA9IHByaW9yUHJvbWlzZS5yZWplY3Q7XG4gICAgICBwcm9taXNlID0gcHJpb3JQcm9taXNlLnByb21pc2U7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXMsIHJlaikgPT4ge1xuICAgICAgICByZXNvbHZlID0gcmVzO1xuICAgICAgICByZWplY3QgPSByZWo7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBpZCA9ICsrdGhpcy5uYXZpZ2F0aW9uSWQ7XG4gICAgbGV0IHRhcmdldFBhZ2VJZDogbnVtYmVyO1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdjb21wdXRlZCcpIHtcbiAgICAgIGNvbnN0IGlzSW5pdGlhbFBhZ2UgPSB0aGlzLmN1cnJlbnRQYWdlSWQgPT09IDA7XG4gICAgICBpZiAoaXNJbml0aWFsUGFnZSkge1xuICAgICAgICByZXN0b3JlZFN0YXRlID0gdGhpcy5sb2NhdGlvbi5nZXRTdGF0ZSgpIGFzIFJlc3RvcmVkU3RhdGUgfCBudWxsO1xuICAgICAgfVxuICAgICAgLy8gSWYgdGhlIGDJtXJvdXRlclBhZ2VJZGAgZXhpc3QgaW4gdGhlIHN0YXRlIHRoZW4gYHRhcmdldHBhZ2VJZGAgc2hvdWxkIGhhdmUgdGhlIHZhbHVlIG9mXG4gICAgICAvLyBgybVyb3V0ZXJQYWdlSWRgLiBUaGlzIGlzIHRoZSBjYXNlIGZvciBzb21ldGhpbmcgbGlrZSBhIHBhZ2UgcmVmcmVzaCB3aGVyZSB3ZSBhc3NpZ24gdGhlXG4gICAgICAvLyB0YXJnZXQgaWQgdG8gdGhlIHByZXZpb3VzbHkgc2V0IHZhbHVlIGZvciB0aGF0IHBhZ2UuXG4gICAgICBpZiAocmVzdG9yZWRTdGF0ZSAmJiByZXN0b3JlZFN0YXRlLsm1cm91dGVyUGFnZUlkKSB7XG4gICAgICAgIHRhcmdldFBhZ2VJZCA9IHJlc3RvcmVkU3RhdGUuybVyb3V0ZXJQYWdlSWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJZiB3ZSdyZSByZXBsYWNpbmcgdGhlIFVSTCBvciBkb2luZyBhIHNpbGVudCBuYXZpZ2F0aW9uLCB3ZSBkbyBub3Qgd2FudCB0byBpbmNyZW1lbnQgdGhlXG4gICAgICAgIC8vIHBhZ2UgaWQgYmVjYXVzZSB3ZSBhcmVuJ3QgcHVzaGluZyBhIG5ldyBlbnRyeSB0byBoaXN0b3J5LlxuICAgICAgICBpZiAoZXh0cmFzLnJlcGxhY2VVcmwgfHwgZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICAgIHRhcmdldFBhZ2VJZCA9IHRoaXMuYnJvd3NlclBhZ2VJZCA/PyAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRhcmdldFBhZ2VJZCA9ICh0aGlzLmJyb3dzZXJQYWdlSWQgPz8gMCkgKyAxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoaXMgaXMgdW51c2VkIHdoZW4gYGNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb25gIGlzIG5vdCBjb21wdXRlZC5cbiAgICAgIHRhcmdldFBhZ2VJZCA9IDA7XG4gICAgfVxuXG4gICAgdGhpcy5zZXRUcmFuc2l0aW9uKHtcbiAgICAgIGlkLFxuICAgICAgdGFyZ2V0UGFnZUlkLFxuICAgICAgc291cmNlLFxuICAgICAgcmVzdG9yZWRTdGF0ZSxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgY3VycmVudFJhd1VybDogdGhpcy5yYXdVcmxUcmVlLFxuICAgICAgcmF3VXJsLFxuICAgICAgZXh0cmFzLFxuICAgICAgcmVzb2x2ZSxcbiAgICAgIHJlamVjdCxcbiAgICAgIHByb21pc2UsXG4gICAgICBjdXJyZW50U25hcHNob3Q6IHRoaXMucm91dGVyU3RhdGUuc25hcHNob3QsXG4gICAgICBjdXJyZW50Um91dGVyU3RhdGU6IHRoaXMucm91dGVyU3RhdGVcbiAgICB9KTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBlcnJvciBpcyBwcm9wYWdhdGVkIGV2ZW4gdGhvdWdoIGBwcm9jZXNzTmF2aWdhdGlvbnNgIGNhdGNoXG4gICAgLy8gaGFuZGxlciBkb2VzIG5vdCByZXRocm93XG4gICAgcmV0dXJuIHByb21pc2UuY2F0Y2goKGU6IGFueSkgPT4ge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXRCcm93c2VyVXJsKHVybDogVXJsVHJlZSwgdDogTmF2aWdhdGlvblRyYW5zaXRpb24pIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICAgIGNvbnN0IHN0YXRlID0gey4uLnQuZXh0cmFzLnN0YXRlLCAuLi50aGlzLmdlbmVyYXRlTmdSb3V0ZXJTdGF0ZSh0LmlkLCB0LnRhcmdldFBhZ2VJZCl9O1xuICAgIGlmICh0aGlzLmxvY2F0aW9uLmlzQ3VycmVudFBhdGhFcXVhbFRvKHBhdGgpIHx8ICEhdC5leHRyYXMucmVwbGFjZVVybCkge1xuICAgICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUocGF0aCwgJycsIHN0YXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5sb2NhdGlvbi5nbyhwYXRoLCAnJywgc3RhdGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtcyB0aGUgbmVjZXNzYXJ5IHJvbGxiYWNrIGFjdGlvbiB0byByZXN0b3JlIHRoZSBicm93c2VyIFVSTCB0byB0aGVcbiAgICogc3RhdGUgYmVmb3JlIHRoZSB0cmFuc2l0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSByZXN0b3JlSGlzdG9yeSh0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbiwgcmVzdG9yaW5nRnJvbUNhdWdodEVycm9yID0gZmFsc2UpIHtcbiAgICBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAnY29tcHV0ZWQnKSB7XG4gICAgICBjb25zdCB0YXJnZXRQYWdlUG9zaXRpb24gPSB0aGlzLmN1cnJlbnRQYWdlSWQgLSB0LnRhcmdldFBhZ2VJZDtcbiAgICAgIC8vIFRoZSBuYXZpZ2F0b3IgY2hhbmdlIHRoZSBsb2NhdGlvbiBiZWZvcmUgdHJpZ2dlcmVkIHRoZSBicm93c2VyIGV2ZW50LFxuICAgICAgLy8gc28gd2UgbmVlZCB0byBnbyBiYWNrIHRvIHRoZSBjdXJyZW50IHVybCBpZiB0aGUgbmF2aWdhdGlvbiBpcyBjYW5jZWxlZC5cbiAgICAgIC8vIEFsc28sIHdoZW4gbmF2aWdhdGlvbiBnZXRzIGNhbmNlbGxlZCB3aGlsZSB1c2luZyB1cmwgdXBkYXRlIHN0cmF0ZWd5IGVhZ2VyLCB0aGVuIHdlIG5lZWQgdG9cbiAgICAgIC8vIGdvIGJhY2suIEJlY2F1c2UsIHdoZW4gYHVybFVwZGF0ZVNyYXRlZ3lgIGlzIGBlYWdlcmA7IGBzZXRCcm93c2VyVXJsYCBtZXRob2QgaXMgY2FsbGVkXG4gICAgICAvLyBiZWZvcmUgYW55IHZlcmlmaWNhdGlvbi5cbiAgICAgIGNvbnN0IGJyb3dzZXJVcmxVcGRhdGVPY2N1cnJlZCA9XG4gICAgICAgICAgKHQuc291cmNlID09PSAncG9wc3RhdGUnIHx8IHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcicgfHxcbiAgICAgICAgICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9PT0gdGhpcy5jdXJyZW50TmF2aWdhdGlvbj8uZmluYWxVcmwpO1xuICAgICAgaWYgKGJyb3dzZXJVcmxVcGRhdGVPY2N1cnJlZCAmJiB0YXJnZXRQYWdlUG9zaXRpb24gIT09IDApIHtcbiAgICAgICAgdGhpcy5sb2NhdGlvbi5oaXN0b3J5R28odGFyZ2V0UGFnZVBvc2l0aW9uKTtcbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9PT0gdGhpcy5jdXJyZW50TmF2aWdhdGlvbj8uZmluYWxVcmwgJiYgdGFyZ2V0UGFnZVBvc2l0aW9uID09PSAwKSB7XG4gICAgICAgIC8vIFdlIGdvdCB0byB0aGUgYWN0aXZhdGlvbiBzdGFnZSAod2hlcmUgY3VycmVudFVybFRyZWUgaXMgc2V0IHRvIHRoZSBuYXZpZ2F0aW9uJ3NcbiAgICAgICAgLy8gZmluYWxVcmwpLCBidXQgd2Ugd2VyZW4ndCBtb3ZpbmcgYW55d2hlcmUgaW4gaGlzdG9yeSAoc2tpcExvY2F0aW9uQ2hhbmdlIG9yIHJlcGxhY2VVcmwpLlxuICAgICAgICAvLyBXZSBzdGlsbCBuZWVkIHRvIHJlc2V0IHRoZSByb3V0ZXIgc3RhdGUgYmFjayB0byB3aGF0IGl0IHdhcyB3aGVuIHRoZSBuYXZpZ2F0aW9uIHN0YXJ0ZWQuXG4gICAgICAgIHRoaXMucmVzZXRTdGF0ZSh0KTtcbiAgICAgICAgLy8gVE9ETyhhdHNjb3R0KTogcmVzZXR0aW5nIHRoZSBgYnJvd3NlclVybFRyZWVgIHNob3VsZCByZWFsbHkgYmUgZG9uZSBpbiBgcmVzZXRTdGF0ZWAuXG4gICAgICAgIC8vIEludmVzdGlnYXRlIGlmIHRoaXMgY2FuIGJlIGRvbmUgYnkgcnVubmluZyBUR1AuXG4gICAgICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0LmN1cnJlbnRVcmxUcmVlO1xuICAgICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhlIGJyb3dzZXIgVVJMIGFuZCByb3V0ZXIgc3RhdGUgd2FzIG5vdCB1cGRhdGVkIGJlZm9yZSB0aGUgbmF2aWdhdGlvbiBjYW5jZWxsZWQgc29cbiAgICAgICAgLy8gdGhlcmUncyBubyByZXN0b3JhdGlvbiBuZWVkZWQuXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdyZXBsYWNlJykge1xuICAgICAgLy8gVE9ETyhhdHNjb3R0KTogSXQgc2VlbXMgbGlrZSB3ZSBzaG91bGQgX2Fsd2F5c18gcmVzZXQgdGhlIHN0YXRlIGhlcmUuIEl0IHdvdWxkIGJlIGEgbm8tb3BcbiAgICAgIC8vIGZvciBgZGVmZXJyZWRgIG5hdmlnYXRpb25zIHRoYXQgaGF2ZW4ndCBjaGFuZ2UgdGhlIGludGVybmFsIHN0YXRlIHlldCBiZWNhdXNlIGd1YXJkc1xuICAgICAgLy8gcmVqZWN0LiBGb3IgJ2VhZ2VyJyBuYXZpZ2F0aW9ucywgaXQgc2VlbXMgbGlrZSB3ZSBhbHNvIHJlYWxseSBzaG91bGQgcmVzZXQgdGhlIHN0YXRlXG4gICAgICAvLyBiZWNhdXNlIHRoZSBuYXZpZ2F0aW9uIHdhcyBjYW5jZWxsZWQuIEludmVzdGlnYXRlIGlmIHRoaXMgY2FuIGJlIGRvbmUgYnkgcnVubmluZyBUR1AuXG4gICAgICBpZiAocmVzdG9yaW5nRnJvbUNhdWdodEVycm9yKSB7XG4gICAgICAgIHRoaXMucmVzZXRTdGF0ZSh0KTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZXNldFN0YXRlKHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uKTogdm9pZCB7XG4gICAgKHRoaXMgYXMge3JvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZX0pLnJvdXRlclN0YXRlID0gdC5jdXJyZW50Um91dGVyU3RhdGU7XG4gICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IHQuY3VycmVudFVybFRyZWU7XG4gICAgLy8gTm90ZSBoZXJlIHRoYXQgd2UgdXNlIHRoZSB1cmxIYW5kbGluZ1N0cmF0ZWd5IHRvIGdldCB0aGUgcmVzZXQgYHJhd1VybFRyZWVgIGJlY2F1c2UgaXQgbWF5IGJlXG4gICAgLy8gY29uZmlndXJlZCB0byBoYW5kbGUgb25seSBwYXJ0IG9mIHRoZSBuYXZpZ2F0aW9uIFVSTC4gVGhpcyBtZWFucyB3ZSB3b3VsZCBvbmx5IHdhbnQgdG8gcmVzZXRcbiAgICAvLyB0aGUgcGFydCBvZiB0aGUgbmF2aWdhdGlvbiBoYW5kbGVkIGJ5IHRoZSBBbmd1bGFyIHJvdXRlciByYXRoZXIgdGhhbiB0aGUgd2hvbGUgVVJMLiBJblxuICAgIC8vIGFkZGl0aW9uLCB0aGUgVVJMSGFuZGxpbmdTdHJhdGVneSBtYXkgYmUgY29uZmlndXJlZCB0byBzcGVjaWZpY2FsbHkgcHJlc2VydmUgcGFydHMgb2YgdGhlIFVSTFxuICAgIC8vIHdoZW4gbWVyZ2luZywgc3VjaCBhcyB0aGUgcXVlcnkgcGFyYW1zIHNvIHRoZXkgYXJlIG5vdCBsb3N0IG9uIGEgcmVmcmVzaC5cbiAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodGhpcy5jdXJyZW50VXJsVHJlZSwgdC5yYXdVcmwpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTogdm9pZCB7XG4gICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUoXG4gICAgICAgIHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodGhpcy5yYXdVcmxUcmVlKSwgJycsXG4gICAgICAgIHRoaXMuZ2VuZXJhdGVOZ1JvdXRlclN0YXRlKHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCwgdGhpcy5jdXJyZW50UGFnZUlkKSk7XG4gIH1cblxuICBwcml2YXRlIGNhbmNlbE5hdmlnYXRpb25UcmFuc2l0aW9uKHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uLCByZWFzb246IHN0cmluZykge1xuICAgIGNvbnN0IG5hdkNhbmNlbCA9IG5ldyBOYXZpZ2F0aW9uQ2FuY2VsKHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgcmVhc29uKTtcbiAgICB0aGlzLnRyaWdnZXJFdmVudChuYXZDYW5jZWwpO1xuICAgIHQucmVzb2x2ZShmYWxzZSk7XG4gIH1cblxuICBwcml2YXRlIGdlbmVyYXRlTmdSb3V0ZXJTdGF0ZShuYXZpZ2F0aW9uSWQ6IG51bWJlciwgcm91dGVyUGFnZUlkPzogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ2NvbXB1dGVkJykge1xuICAgICAgcmV0dXJuIHtuYXZpZ2F0aW9uSWQsIMm1cm91dGVyUGFnZUlkOiByb3V0ZXJQYWdlSWR9O1xuICAgIH1cbiAgICByZXR1cm4ge25hdmlnYXRpb25JZH07XG4gIH1cbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVDb21tYW5kcyhjb21tYW5kczogc3RyaW5nW10pOiB2b2lkIHtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb21tYW5kcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNtZCA9IGNvbW1hbmRzW2ldO1xuICAgIGlmIChjbWQgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgcmVxdWVzdGVkIHBhdGggY29udGFpbnMgJHtjbWR9IHNlZ21lbnQgYXQgaW5kZXggJHtpfWApO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpc0Jyb3dzZXJUcmlnZ2VyZWROYXZpZ2F0aW9uKHNvdXJjZTogJ2ltcGVyYXRpdmUnfCdwb3BzdGF0ZSd8J2hhc2hjaGFuZ2UnKSB7XG4gIHJldHVybiBzb3VyY2UgIT09ICdpbXBlcmF0aXZlJztcbn1cbiJdfQ==