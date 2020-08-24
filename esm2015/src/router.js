/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { Compiler, Injectable, Injector, isDevMode, NgModuleFactoryLoader, NgModuleRef, NgZone, ɵConsole as Console } from '@angular/core';
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
        /**
         * Tracks the previously seen location change from the location subscription so we can compare
         * the two latest to see if they are duplicates. See setUpLocationChangeListener.
         */
        this.lastLocationChangeInfo = null;
        this.navigationId = 0;
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
         * - `'ignore'` :  The router ignores the request.
         * - `'reload'` : The router reloads the URL. Use to implement a "refresh" feature.
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
        this.browserUrlTree = this.currentUrlTree;
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
                        return [t];
                    }), 
                    // This delay is required to match old behavior that forced navigation
                    // to always be async
                    switchMap(t => Promise.resolve(t)), 
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
                                this.setBrowserUrl(t.urlAfterRedirects, !!t.extras.replaceUrl, t.id, t.extras.state);
                            }
                            this.browserUrlTree = t.urlAfterRedirects;
                        }
                    }), 
                    // Fire RoutesRecognized
                    tap(t => {
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
            }), tap(t => {
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
                    }), switchMap(t => {
                        let dataResolved = false;
                        return of(t).pipe(resolveData(this.paramsInheritanceStrategy, this.ngModule.injector), tap({
                            next: () => dataResolved = true,
                            complete: () => {
                                if (!dataResolved) {
                                    const navCancel = new NavigationCancel(t.id, this.serializeUrl(t.extractedUrl), `At least one route resolver didn't emit any value.`);
                                    eventsSubject.next(navCancel);
                                    t.resolve(false);
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
                        this.setBrowserUrl(this.rawUrlTree, !!t.extras.replaceUrl, t.id, t.extras.state);
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
                    // Must reset to current URL tree here to ensure history.state is set. On a
                    // fresh page load, if a new navigation comes in before a successful
                    // navigation completes, there will be nothing in
                    // history.state.navigationId. This can cause sync problems with AngularJS
                    // sync code which looks for a value here in order to determine whether or
                    // not to handle a given popstate event or to leave it to the Angualr
                    // router.
                    this.resetUrlToCurrentUrlTree();
                    const navCancel = new NavigationCancel(t.id, this.serializeUrl(t.extractedUrl), `Navigation ID ${t.id} is not equal to the current navigation id ${this.navigationId}`);
                    eventsSubject.next(navCancel);
                    t.resolve(false);
                }
                // currentNavigation should always be reset to null here. If navigation was
                // successful, lastSuccessfulTransition will have already been set. Therefore
                // we can safely set currentNavigation to null here.
                this.currentNavigation = null;
            }), catchError((e) => {
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
                        this.resetStateAndUrl(t.currentRouterState, t.currentUrlTree, t.rawUrl);
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
                            return this.scheduleNavigation(mergedTree, 'imperative', null, extras, { resolve: t.resolve, reject: t.reject, promise: t.promise });
                        }, 0);
                    }
                    /* All other errors should reset to the router's internal URL reference to
                     * the pre-error state. */
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
                if (this.shouldScheduleNavigation(this.lastLocationChangeInfo, currentChange)) {
                    // The `setTimeout` was added in #12160 and is likely to support Angular/AngularJS
                    // hybrid apps.
                    setTimeout(() => {
                        const { source, state, urlTree } = currentChange;
                        const extras = { replaceUrl: true };
                        if (state) {
                            const stateCopy = Object.assign({}, state);
                            delete stateCopy.navigationId;
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
    /** The current Navigation object if one exists */
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
        if (this.locationSubscription) {
            this.locationSubscription.unsubscribe();
            this.locationSubscription = undefined;
        }
    }
    /**
     * Appends URL segments to the current URL tree to create a new URL tree.
     *
     * @param commands An array of URL fragments with which to construct the new URL tree.
     * If the path is static, can be the literal URL string. For a dynamic path, pass an array of path
     * segments, followed by the parameters for each segment.
     * The fragments are applied to the current URL tree or the one provided  in the `relativeTo`
     * property of the options object, if supplied.
     * @param navigationExtras Options that control the navigation strategy. This function
     * only uses properties in `NavigationExtras` that would change the provided URL.
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
                    q = Object.assign(Object.assign({}, this.currentUrlTree.queryParams), queryParams);
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
     * Navigates to a view using an absolute route path.
     *
     * @param url An absolute path for a defined route. The function does not apply any delta to the
     *     current URL.
     * @param extras An object containing properties that modify the navigation strategy.
     * The function ignores any properties in the `NavigationExtras` that would change the
     * provided URL.
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
    navigateByUrl(url, extras = { skipLocationChange: false }) {
        if (isDevMode() && this.isNgZoneEnabled && !NgZone.isInAngularZone()) {
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
    /** Returns whether the url is activated */
    isActive(url, exact) {
        if (isUrlTree(url)) {
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
            this.lastSuccessfulNavigation = this.currentNavigation;
            this.currentNavigation = null;
            t.resolve(true);
        }, e => {
            this.console.warn(`Unhandled Navigation Error: `);
        });
    }
    scheduleNavigation(rawUrl, source, restoredState, extras, priorPromise) {
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
        this.setTransition({
            id,
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
    setBrowserUrl(url, replaceUrl, id, state) {
        const path = this.urlSerializer.serialize(url);
        state = state || {};
        if (this.location.isCurrentPathEqualTo(path) || replaceUrl) {
            // TODO(jasonaden): Remove first `navigationId` and rely on `ng` namespace.
            this.location.replaceState(path, '', Object.assign(Object.assign({}, state), { navigationId: id }));
        }
        else {
            this.location.go(path, '', Object.assign(Object.assign({}, state), { navigationId: id }));
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
Router.ɵfac = function Router_Factory(t) { i0.ɵɵinvalidFactory(); };
Router.ɵprov = i0.ɵɵdefineInjectable({ token: Router, factory: Router.ɵfac });
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(Router, [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBZ0IsTUFBTSxpQkFBaUIsQ0FBQztBQUN4RCxPQUFPLEVBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQVEsUUFBUSxJQUFJLE9BQU8sRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUMvSSxPQUFPLEVBQUMsZUFBZSxFQUFFLEtBQUssRUFBYyxFQUFFLEVBQUUsT0FBTyxFQUFtQixNQUFNLE1BQU0sQ0FBQztBQUN2RixPQUFPLEVBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUdqRixPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUN4RCxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDaEQsT0FBTyxFQUFRLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBcUIsVUFBVSxFQUFFLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3TyxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNyRCxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDaEQsT0FB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QyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDOUUsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVPLHdCQUF3QjtRQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FDdEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUMsQ0FBQyxDQUFDO0lBQ2hHLENBQUM7Ozs4Q0F2OUJVLE1BQU0sV0FBTixNQUFNO2tEQUFOLE1BQU07Y0FEbEIsVUFBVTs7QUEyOUJYLFNBQVMsZ0JBQWdCLENBQUMsUUFBa0I7SUFDMUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDeEMsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLEdBQUcscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDN0U7S0FDRjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvbiwgUG9wU3RhdGVFdmVudH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7Q29tcGlsZXIsIEluamVjdGFibGUsIEluamVjdG9yLCBpc0Rldk1vZGUsIE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgTmdNb2R1bGVSZWYsIE5nWm9uZSwgVHlwZSwgybVDb25zb2xlIGFzIENvbnNvbGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtCZWhhdmlvclN1YmplY3QsIEVNUFRZLCBPYnNlcnZhYmxlLCBvZiwgU3ViamVjdCwgU3Vic2NyaXB0aW9uTGlrZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NhdGNoRXJyb3IsIGZpbHRlciwgZmluYWxpemUsIG1hcCwgc3dpdGNoTWFwLCB0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtRdWVyeVBhcmFtc0hhbmRsaW5nLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge2NyZWF0ZVJvdXRlclN0YXRlfSBmcm9tICcuL2NyZWF0ZV9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtjcmVhdGVVcmxUcmVlfSBmcm9tICcuL2NyZWF0ZV91cmxfdHJlZSc7XG5pbXBvcnQge0V2ZW50LCBHdWFyZHNDaGVja0VuZCwgR3VhcmRzQ2hlY2tTdGFydCwgTmF2aWdhdGlvbkNhbmNlbCwgTmF2aWdhdGlvbkVuZCwgTmF2aWdhdGlvbkVycm9yLCBOYXZpZ2F0aW9uU3RhcnQsIE5hdmlnYXRpb25UcmlnZ2VyLCBSZXNvbHZlRW5kLCBSZXNvbHZlU3RhcnQsIFJvdXRlQ29uZmlnTG9hZEVuZCwgUm91dGVDb25maWdMb2FkU3RhcnQsIFJvdXRlc1JlY29nbml6ZWR9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7YWN0aXZhdGVSb3V0ZXN9IGZyb20gJy4vb3BlcmF0b3JzL2FjdGl2YXRlX3JvdXRlcyc7XG5pbXBvcnQge2FwcGx5UmVkaXJlY3RzfSBmcm9tICcuL29wZXJhdG9ycy9hcHBseV9yZWRpcmVjdHMnO1xuaW1wb3J0IHtjaGVja0d1YXJkc30gZnJvbSAnLi9vcGVyYXRvcnMvY2hlY2tfZ3VhcmRzJztcbmltcG9ydCB7cmVjb2duaXplfSBmcm9tICcuL29wZXJhdG9ycy9yZWNvZ25pemUnO1xuaW1wb3J0IHtyZXNvbHZlRGF0YX0gZnJvbSAnLi9vcGVyYXRvcnMvcmVzb2x2ZV9kYXRhJztcbmltcG9ydCB7c3dpdGNoVGFwfSBmcm9tICcuL29wZXJhdG9ycy9zd2l0Y2hfdGFwJztcbmltcG9ydCB7RGVmYXVsdFJvdXRlUmV1c2VTdHJhdGVneSwgUm91dGVSZXVzZVN0cmF0ZWd5fSBmcm9tICcuL3JvdXRlX3JldXNlX3N0cmF0ZWd5JztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0c30gZnJvbSAnLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZSwgY3JlYXRlRW1wdHlTdGF0ZSwgUm91dGVyU3RhdGUsIFJvdXRlclN0YXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7aXNOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IsIG5hdmlnYXRpb25DYW5jZWxpbmdFcnJvciwgUGFyYW1zfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge0RlZmF1bHRVcmxIYW5kbGluZ1N0cmF0ZWd5LCBVcmxIYW5kbGluZ1N0cmF0ZWd5fSBmcm9tICcuL3VybF9oYW5kbGluZ19zdHJhdGVneSc7XG5pbXBvcnQge2NvbnRhaW5zVHJlZSwgY3JlYXRlRW1wdHlVcmxUcmVlLCBVcmxTZXJpYWxpemVyLCBVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcbmltcG9ydCB7c3RhbmRhcmRpemVDb25maWcsIHZhbGlkYXRlQ29uZmlnfSBmcm9tICcuL3V0aWxzL2NvbmZpZyc7XG5pbXBvcnQge0NoZWNrcywgZ2V0QWxsUm91dGVHdWFyZHN9IGZyb20gJy4vdXRpbHMvcHJlYWN0aXZhdGlvbic7XG5pbXBvcnQge2lzVXJsVHJlZX0gZnJvbSAnLi91dGlscy90eXBlX2d1YXJkcyc7XG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBPcHRpb25zIHRoYXQgbW9kaWZ5IHRoZSBgUm91dGVyYCBuYXZpZ2F0aW9uIHN0cmF0ZWd5LlxuICogU3VwcGx5IGFuIG9iamVjdCBjb250YWluaW5nIGFueSBvZiB0aGVzZSBwcm9wZXJ0aWVzIHRvIGEgYFJvdXRlcmAgbmF2aWdhdGlvbiBmdW5jdGlvbiB0b1xuICogY29udHJvbCBob3cgdGhlIHRhcmdldCBVUkwgc2hvdWxkIGJlIGNvbnN0cnVjdGVkIG9yIGludGVycHJldGVkLlxuICpcbiAqIEBzZWUgW1JvdXRlci5uYXZpZ2F0ZSgpIG1ldGhvZF0oYXBpL3JvdXRlci9Sb3V0ZXIjbmF2aWdhdGUpXG4gKiBAc2VlIFtSb3V0ZXIubmF2aWdhdGVCeVVybCgpIG1ldGhvZF0oYXBpL3JvdXRlci9Sb3V0ZXIjbmF2aWdhdGVieXVybClcbiAqIEBzZWUgW1JvdXRlci5jcmVhdGVVcmxUcmVlKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNjcmVhdGV1cmx0cmVlKVxuICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOYXZpZ2F0aW9uRXh0cmFzIHtcbiAgLyoqXG4gICAqIFNwZWNpZmllcyBhIHJvb3QgVVJJIHRvIHVzZSBmb3IgcmVsYXRpdmUgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogRm9yIGV4YW1wbGUsIGNvbnNpZGVyIHRoZSBmb2xsb3dpbmcgcm91dGUgY29uZmlndXJhdGlvbiB3aGVyZSB0aGUgcGFyZW50IHJvdXRlXG4gICAqIGhhcyB0d28gY2hpbGRyZW4uXG4gICAqXG4gICAqIGBgYFxuICAgKiBbe1xuICAgKiAgIHBhdGg6ICdwYXJlbnQnLFxuICAgKiAgIGNvbXBvbmVudDogUGFyZW50Q29tcG9uZW50LFxuICAgKiAgIGNoaWxkcmVuOiBbe1xuICAgKiAgICAgcGF0aDogJ2xpc3QnLFxuICAgKiAgICAgY29tcG9uZW50OiBMaXN0Q29tcG9uZW50XG4gICAqICAgfSx7XG4gICAqICAgICBwYXRoOiAnY2hpbGQnLFxuICAgKiAgICAgY29tcG9uZW50OiBDaGlsZENvbXBvbmVudFxuICAgKiAgIH1dXG4gICAqIH1dXG4gICAqIGBgYFxuICAgKlxuICAgKiBUaGUgZm9sbG93aW5nIGBnbygpYCBmdW5jdGlvbiBuYXZpZ2F0ZXMgdG8gdGhlIGBsaXN0YCByb3V0ZSBieVxuICAgKiBpbnRlcnByZXRpbmcgdGhlIGRlc3RpbmF0aW9uIFVSSSBhcyByZWxhdGl2ZSB0byB0aGUgYWN0aXZhdGVkIGBjaGlsZGAgIHJvdXRlXG4gICAqXG4gICAqIGBgYFxuICAgKiAgQENvbXBvbmVudCh7Li4ufSlcbiAgICogIGNsYXNzIENoaWxkQ29tcG9uZW50IHtcbiAgICogICAgY29uc3RydWN0b3IocHJpdmF0ZSByb3V0ZXI6IFJvdXRlciwgcHJpdmF0ZSByb3V0ZTogQWN0aXZhdGVkUm91dGUpIHt9XG4gICAqXG4gICAqICAgIGdvKCkge1xuICAgKiAgICAgIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnLi4vbGlzdCddLCB7IHJlbGF0aXZlVG86IHRoaXMucm91dGUgfSk7XG4gICAqICAgIH1cbiAgICogIH1cbiAgICogYGBgXG4gICAqL1xuICByZWxhdGl2ZVRvPzogQWN0aXZhdGVkUm91dGV8bnVsbDtcblxuICAvKipcbiAgICogU2V0cyBxdWVyeSBwYXJhbWV0ZXJzIHRvIHRoZSBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvcmVzdWx0cz9wYWdlPTFcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvcmVzdWx0cyddLCB7IHF1ZXJ5UGFyYW1zOiB7IHBhZ2U6IDEgfSB9KTtcbiAgICogYGBgXG4gICAqL1xuICBxdWVyeVBhcmFtcz86IFBhcmFtc3xudWxsO1xuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBoYXNoIGZyYWdtZW50IGZvciB0aGUgVVJMLlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgdG8gL3Jlc3VsdHMjdG9wXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3Jlc3VsdHMnXSwgeyBmcmFnbWVudDogJ3RvcCcgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnQ/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqICoqREVQUkVDQVRFRCoqOiBVc2UgYHF1ZXJ5UGFyYW1zSGFuZGxpbmc6IFwicHJlc2VydmVcImAgaW5zdGVhZCB0byBwcmVzZXJ2ZVxuICAgKiBxdWVyeSBwYXJhbWV0ZXJzIGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBzaW5jZSB2NFxuICAgKi9cbiAgcHJlc2VydmVRdWVyeVBhcmFtcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEhvdyB0byBoYW5kbGUgcXVlcnkgcGFyYW1ldGVycyBpbiB0aGUgcm91dGVyIGxpbmsgZm9yIHRoZSBuZXh0IG5hdmlnYXRpb24uXG4gICAqIE9uZSBvZjpcbiAgICogKiBgcHJlc2VydmVgIDogUHJlc2VydmUgY3VycmVudCBwYXJhbWV0ZXJzLlxuICAgKiAqIGBtZXJnZWAgOiBNZXJnZSBuZXcgd2l0aCBjdXJyZW50IHBhcmFtZXRlcnMuXG4gICAqXG4gICAqIFRoZSBcInByZXNlcnZlXCIgb3B0aW9uIGRpc2NhcmRzIGFueSBuZXcgcXVlcnkgcGFyYW1zOlxuICAgKiBgYGBcbiAgICogLy8gZnJvbSAvdmlldzE/cGFnZT0xIHRvL3ZpZXcyP3BhZ2U9MVxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3MiddLCB7IHF1ZXJ5UGFyYW1zOiB7IHBhZ2U6IDIgfSwgIHF1ZXJ5UGFyYW1zSGFuZGxpbmc6IFwicHJlc2VydmVcIlxuICAgKiB9KTtcbiAgICogYGBgXG4gICAqIFRoZSBcIm1lcmdlXCIgb3B0aW9uIGFwcGVuZHMgbmV3IHF1ZXJ5IHBhcmFtcyB0byB0aGUgcGFyYW1zIGZyb20gdGhlIGN1cnJlbnQgVVJMOlxuICAgKiBgYGBcbiAgICogLy8gZnJvbSAvdmlldzE/cGFnZT0xIHRvL3ZpZXcyP3BhZ2U9MSZvdGhlcktleT0yXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcyJ10sIHsgcXVlcnlQYXJhbXM6IHsgb3RoZXJLZXk6IDIgfSwgIHF1ZXJ5UGFyYW1zSGFuZGxpbmc6IFwibWVyZ2VcIlxuICAgKiB9KTtcbiAgICogYGBgXG4gICAqIEluIGNhc2Ugb2YgYSBrZXkgY29sbGlzaW9uIGJldHdlZW4gY3VycmVudCBwYXJhbWV0ZXJzIGFuZCB0aG9zZSBpbiB0aGUgYHF1ZXJ5UGFyYW1zYCBvYmplY3QsXG4gICAqIHRoZSBuZXcgdmFsdWUgaXMgdXNlZC5cbiAgICpcbiAgICovXG4gIHF1ZXJ5UGFyYW1zSGFuZGxpbmc/OiBRdWVyeVBhcmFtc0hhbmRsaW5nfG51bGw7XG4gIC8qKlxuICAgKiBXaGVuIHRydWUsIHByZXNlcnZlcyB0aGUgVVJMIGZyYWdtZW50IGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBQcmVzZXJ2ZSBmcmFnbWVudCBmcm9tIC9yZXN1bHRzI3RvcCB0byAvdmlldyN0b3BcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHByZXNlcnZlRnJhZ21lbnQ6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcHJlc2VydmVGcmFnbWVudD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXaGVuIHRydWUsIG5hdmlnYXRlcyB3aXRob3V0IHB1c2hpbmcgYSBuZXcgc3RhdGUgaW50byBoaXN0b3J5LlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgc2lsZW50bHkgdG8gL3ZpZXdcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqL1xuICBza2lwTG9jYXRpb25DaGFuZ2U/OiBib29sZWFuO1xuICAvKipcbiAgICogV2hlbiB0cnVlLCBuYXZpZ2F0ZXMgd2hpbGUgcmVwbGFjaW5nIHRoZSBjdXJyZW50IHN0YXRlIGluIGhpc3RvcnkuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvdmlld1xuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgcmVwbGFjZVVybDogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqL1xuICByZXBsYWNlVXJsPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIERldmVsb3Blci1kZWZpbmVkIHN0YXRlIHRoYXQgY2FuIGJlIHBhc3NlZCB0byBhbnkgbmF2aWdhdGlvbi5cbiAgICogQWNjZXNzIHRoaXMgdmFsdWUgdGhyb3VnaCB0aGUgYE5hdmlnYXRpb24uZXh0cmFzYCBvYmplY3RcbiAgICogcmV0dXJuZWQgZnJvbSB0aGUgW1JvdXRlci5nZXRDdXJyZW50TmF2aWdhdGlvbigpXG4gICAqIG1ldGhvZF0oYXBpL3JvdXRlci9Sb3V0ZXIjZ2V0Y3VycmVudG5hdmlnYXRpb24pIHdoaWxlIGEgbmF2aWdhdGlvbiBpcyBleGVjdXRpbmcuXG4gICAqXG4gICAqIEFmdGVyIGEgbmF2aWdhdGlvbiBjb21wbGV0ZXMsIHRoZSByb3V0ZXIgd3JpdGVzIGFuIG9iamVjdCBjb250YWluaW5nIHRoaXNcbiAgICogdmFsdWUgdG9nZXRoZXIgd2l0aCBhIGBuYXZpZ2F0aW9uSWRgIHRvIGBoaXN0b3J5LnN0YXRlYC5cbiAgICogVGhlIHZhbHVlIGlzIHdyaXR0ZW4gd2hlbiBgbG9jYXRpb24uZ28oKWAgb3IgYGxvY2F0aW9uLnJlcGxhY2VTdGF0ZSgpYFxuICAgKiBpcyBjYWxsZWQgYmVmb3JlIGFjdGl2YXRpbmcgdGhpcyByb3V0ZS5cbiAgICpcbiAgICogTm90ZSB0aGF0IGBoaXN0b3J5LnN0YXRlYCBkb2VzIG5vdCBwYXNzIGFuIG9iamVjdCBlcXVhbGl0eSB0ZXN0IGJlY2F1c2VcbiAgICogdGhlIHJvdXRlciBhZGRzIHRoZSBgbmF2aWdhdGlvbklkYCBvbiBlYWNoIG5hdmlnYXRpb24uXG4gICAqXG4gICAqL1xuICBzdGF0ZT86IHtbazogc3RyaW5nXTogYW55fTtcbn1cblxuLyoqXG4gKiBFcnJvciBoYW5kbGVyIHRoYXQgaXMgaW52b2tlZCB3aGVuIGEgbmF2aWdhdGlvbiBlcnJvciBvY2N1cnMuXG4gKlxuICogSWYgdGhlIGhhbmRsZXIgcmV0dXJucyBhIHZhbHVlLCB0aGUgbmF2aWdhdGlvbiBQcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhpcyB2YWx1ZS5cbiAqIElmIHRoZSBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb24sIHRoZSBuYXZpZ2F0aW9uIFByb21pc2UgaXMgcmVqZWN0ZWQgd2l0aFxuICogdGhlIGV4Y2VwdGlvbi5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIEVycm9ySGFuZGxlciA9IChlcnJvcjogYW55KSA9PiBhbnk7XG5cbmZ1bmN0aW9uIGRlZmF1bHRFcnJvckhhbmRsZXIoZXJyb3I6IGFueSk6IGFueSB7XG4gIHRocm93IGVycm9yO1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0TWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyKFxuICAgIGVycm9yOiBVUklFcnJvciwgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgdXJsOiBzdHJpbmcpOiBVcmxUcmVlIHtcbiAgcmV0dXJuIHVybFNlcmlhbGl6ZXIucGFyc2UoJy8nKTtcbn1cblxuZXhwb3J0IHR5cGUgUmVzdG9yZWRTdGF0ZSA9IHtcbiAgW2s6IHN0cmluZ106IGFueTsgbmF2aWdhdGlvbklkOiBudW1iZXI7XG59O1xuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IGEgbmF2aWdhdGlvbiBvcGVyYXRpb24uXG4gKiBSZXRyaWV2ZSB0aGUgbW9zdCByZWNlbnQgbmF2aWdhdGlvbiBvYmplY3Qgd2l0aCB0aGVcbiAqIFtSb3V0ZXIuZ2V0Q3VycmVudE5hdmlnYXRpb24oKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI2dldGN1cnJlbnRuYXZpZ2F0aW9uKSAuXG4gKlxuICogKiAqaWQqIDogVGhlIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBjdXJyZW50IG5hdmlnYXRpb24uXG4gKiAqICppbml0aWFsVXJsKiA6IFRoZSB0YXJnZXQgVVJMIHBhc3NlZCBpbnRvIHRoZSBgUm91dGVyI25hdmlnYXRlQnlVcmwoKWAgY2FsbCBiZWZvcmUgbmF2aWdhdGlvbi5cbiAqIFRoaXMgaXMgdGhlIHZhbHVlIGJlZm9yZSB0aGUgcm91dGVyIGhhcyBwYXJzZWQgb3IgYXBwbGllZCByZWRpcmVjdHMgdG8gaXQuXG4gKiAqICpleHRyYWN0ZWRVcmwqIDogVGhlIGluaXRpYWwgdGFyZ2V0IFVSTCBhZnRlciBiZWluZyBwYXJzZWQgd2l0aCBgVXJsU2VyaWFsaXplci5leHRyYWN0KClgLlxuICogKiAqZmluYWxVcmwqIDogVGhlIGV4dHJhY3RlZCBVUkwgYWZ0ZXIgcmVkaXJlY3RzIGhhdmUgYmVlbiBhcHBsaWVkLlxuICogVGhpcyBVUkwgbWF5IG5vdCBiZSBhdmFpbGFibGUgaW1tZWRpYXRlbHksIHRoZXJlZm9yZSB0aGlzIHByb3BlcnR5IGNhbiBiZSBgdW5kZWZpbmVkYC5cbiAqIEl0IGlzIGd1YXJhbnRlZWQgdG8gYmUgc2V0IGFmdGVyIHRoZSBgUm91dGVzUmVjb2duaXplZGAgZXZlbnQgZmlyZXMuXG4gKiAqICp0cmlnZ2VyKiA6IElkZW50aWZpZXMgaG93IHRoaXMgbmF2aWdhdGlvbiB3YXMgdHJpZ2dlcmVkLlxuICogLS0gJ2ltcGVyYXRpdmUnLS1UcmlnZ2VyZWQgYnkgYHJvdXRlci5uYXZpZ2F0ZUJ5VXJsYCBvciBgcm91dGVyLm5hdmlnYXRlYC5cbiAqIC0tICdwb3BzdGF0ZSctLVRyaWdnZXJlZCBieSBhIHBvcHN0YXRlIGV2ZW50LlxuICogLS0gJ2hhc2hjaGFuZ2UnLS1UcmlnZ2VyZWQgYnkgYSBoYXNoY2hhbmdlIGV2ZW50LlxuICogKiAqZXh0cmFzKiA6IEEgYE5hdmlnYXRpb25FeHRyYXNgIG9wdGlvbnMgb2JqZWN0IHRoYXQgY29udHJvbGxlZCB0aGUgc3RyYXRlZ3kgdXNlZCBmb3IgdGhpc1xuICogbmF2aWdhdGlvbi5cbiAqICogKnByZXZpb3VzTmF2aWdhdGlvbiogOiBUaGUgcHJldmlvdXNseSBzdWNjZXNzZnVsIGBOYXZpZ2F0aW9uYCBvYmplY3QuIE9ubHkgb25lIHByZXZpb3VzXG4gKiBuYXZpZ2F0aW9uIGlzIGF2YWlsYWJsZSwgdGhlcmVmb3JlIHRoaXMgcHJldmlvdXMgYE5hdmlnYXRpb25gIG9iamVjdCBoYXMgYSBgbnVsbGAgdmFsdWUgZm9yIGl0c1xuICogb3duIGBwcmV2aW91c05hdmlnYXRpb25gLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgTmF2aWdhdGlvbiA9IHtcbiAgLyoqXG4gICAqIFRoZSB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY3VycmVudCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaWQ6IG51bWJlcjtcbiAgLyoqXG4gICAqIFRoZSB0YXJnZXQgVVJMIHBhc3NlZCBpbnRvIHRoZSBgUm91dGVyI25hdmlnYXRlQnlVcmwoKWAgY2FsbCBiZWZvcmUgbmF2aWdhdGlvbi4gVGhpcyBpc1xuICAgKiB0aGUgdmFsdWUgYmVmb3JlIHRoZSByb3V0ZXIgaGFzIHBhcnNlZCBvciBhcHBsaWVkIHJlZGlyZWN0cyB0byBpdC5cbiAgICovXG4gIGluaXRpYWxVcmw6IHN0cmluZyB8IFVybFRyZWU7XG4gIC8qKlxuICAgKiBUaGUgaW5pdGlhbCB0YXJnZXQgVVJMIGFmdGVyIGJlaW5nIHBhcnNlZCB3aXRoIGBVcmxTZXJpYWxpemVyLmV4dHJhY3QoKWAuXG4gICAqL1xuICBleHRyYWN0ZWRVcmw6IFVybFRyZWU7XG4gIC8qKlxuICAgKiBUaGUgZXh0cmFjdGVkIFVSTCBhZnRlciByZWRpcmVjdHMgaGF2ZSBiZWVuIGFwcGxpZWQuXG4gICAqIFRoaXMgVVJMIG1heSBub3QgYmUgYXZhaWxhYmxlIGltbWVkaWF0ZWx5LCB0aGVyZWZvcmUgdGhpcyBwcm9wZXJ0eSBjYW4gYmUgYHVuZGVmaW5lZGAuXG4gICAqIEl0IGlzIGd1YXJhbnRlZWQgdG8gYmUgc2V0IGFmdGVyIHRoZSBgUm91dGVzUmVjb2duaXplZGAgZXZlbnQgZmlyZXMuXG4gICAqL1xuICBmaW5hbFVybD86IFVybFRyZWU7XG4gIC8qKlxuICAgKiBJZGVudGlmaWVzIGhvdyB0aGlzIG5hdmlnYXRpb24gd2FzIHRyaWdnZXJlZC5cbiAgICpcbiAgICogKiAnaW1wZXJhdGl2ZSctLVRyaWdnZXJlZCBieSBgcm91dGVyLm5hdmlnYXRlQnlVcmxgIG9yIGByb3V0ZXIubmF2aWdhdGVgLlxuICAgKiAqICdwb3BzdGF0ZSctLVRyaWdnZXJlZCBieSBhIHBvcHN0YXRlIGV2ZW50LlxuICAgKiAqICdoYXNoY2hhbmdlJy0tVHJpZ2dlcmVkIGJ5IGEgaGFzaGNoYW5nZSBldmVudC5cbiAgICovXG4gIHRyaWdnZXI6ICdpbXBlcmF0aXZlJyB8ICdwb3BzdGF0ZScgfCAnaGFzaGNoYW5nZSc7XG4gIC8qKlxuICAgKiBPcHRpb25zIHRoYXQgY29udHJvbGxlZCB0aGUgc3RyYXRlZ3kgdXNlZCBmb3IgdGhpcyBuYXZpZ2F0aW9uLlxuICAgKiBTZWUgYE5hdmlnYXRpb25FeHRyYXNgLlxuICAgKi9cbiAgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzO1xuICAvKipcbiAgICogVGhlIHByZXZpb3VzbHkgc3VjY2Vzc2Z1bCBgTmF2aWdhdGlvbmAgb2JqZWN0LiBPbmx5IG9uZSBwcmV2aW91cyBuYXZpZ2F0aW9uXG4gICAqIGlzIGF2YWlsYWJsZSwgdGhlcmVmb3JlIHRoaXMgcHJldmlvdXMgYE5hdmlnYXRpb25gIG9iamVjdCBoYXMgYSBgbnVsbGAgdmFsdWVcbiAgICogZm9yIGl0cyBvd24gYHByZXZpb3VzTmF2aWdhdGlvbmAuXG4gICAqL1xuICBwcmV2aW91c05hdmlnYXRpb246IE5hdmlnYXRpb24gfCBudWxsO1xufTtcblxuZXhwb3J0IHR5cGUgTmF2aWdhdGlvblRyYW5zaXRpb24gPSB7XG4gIGlkOiBudW1iZXIsXG4gIGN1cnJlbnRVcmxUcmVlOiBVcmxUcmVlLFxuICBjdXJyZW50UmF3VXJsOiBVcmxUcmVlLFxuICBleHRyYWN0ZWRVcmw6IFVybFRyZWUsXG4gIHVybEFmdGVyUmVkaXJlY3RzOiBVcmxUcmVlLFxuICByYXdVcmw6IFVybFRyZWUsXG4gIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyxcbiAgcmVzb2x2ZTogYW55LFxuICByZWplY3Q6IGFueSxcbiAgcHJvbWlzZTogUHJvbWlzZTxib29sZWFuPixcbiAgc291cmNlOiBOYXZpZ2F0aW9uVHJpZ2dlcixcbiAgcmVzdG9yZWRTdGF0ZTogUmVzdG9yZWRTdGF0ZXxudWxsLFxuICBjdXJyZW50U25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QsXG4gIHRhcmdldFNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90fG51bGwsXG4gIGN1cnJlbnRSb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGUsXG4gIHRhcmdldFJvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZXxudWxsLFxuICBndWFyZHM6IENoZWNrcyxcbiAgZ3VhcmRzUmVzdWx0OiBib29sZWFufFVybFRyZWV8bnVsbCxcbn07XG5cbi8qKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCB0eXBlIFJvdXRlckhvb2sgPSAoc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QsIHJ1bkV4dHJhczoge1xuICBhcHBsaWVkVXJsVHJlZTogVXJsVHJlZSxcbiAgcmF3VXJsVHJlZTogVXJsVHJlZSxcbiAgc2tpcExvY2F0aW9uQ2hhbmdlOiBib29sZWFuLFxuICByZXBsYWNlVXJsOiBib29sZWFuLFxuICBuYXZpZ2F0aW9uSWQ6IG51bWJlclxufSkgPT4gT2JzZXJ2YWJsZTx2b2lkPjtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gZGVmYXVsdFJvdXRlckhvb2soc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QsIHJ1bkV4dHJhczoge1xuICBhcHBsaWVkVXJsVHJlZTogVXJsVHJlZSxcbiAgcmF3VXJsVHJlZTogVXJsVHJlZSxcbiAgc2tpcExvY2F0aW9uQ2hhbmdlOiBib29sZWFuLFxuICByZXBsYWNlVXJsOiBib29sZWFuLFxuICBuYXZpZ2F0aW9uSWQ6IG51bWJlclxufSk6IE9ic2VydmFibGU8dm9pZD4ge1xuICByZXR1cm4gb2YobnVsbCkgYXMgYW55O1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIHJlbGF0ZWQgdG8gYSBsb2NhdGlvbiBjaGFuZ2UsIG5lY2Vzc2FyeSBmb3Igc2NoZWR1bGluZyBmb2xsb3ctdXAgUm91dGVyIG5hdmlnYXRpb25zLlxuICovXG50eXBlIExvY2F0aW9uQ2hhbmdlSW5mbyA9IHtcbiAgc291cmNlOiAncG9wc3RhdGUnfCdoYXNoY2hhbmdlJyxcbiAgdXJsVHJlZTogVXJsVHJlZSxcbiAgc3RhdGU6IFJlc3RvcmVkU3RhdGV8bnVsbCxcbiAgdHJhbnNpdGlvbklkOiBudW1iZXJcbn07XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQSBzZXJ2aWNlIHRoYXQgcHJvdmlkZXMgbmF2aWdhdGlvbiBhbW9uZyB2aWV3cyBhbmQgVVJMIG1hbmlwdWxhdGlvbiBjYXBhYmlsaXRpZXMuXG4gKlxuICogQHNlZSBgUm91dGVgLlxuICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBHdWlkZV0oZ3VpZGUvcm91dGVyKS5cbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgUm91dGVyIHtcbiAgcHJpdmF0ZSBjdXJyZW50VXJsVHJlZTogVXJsVHJlZTtcbiAgcHJpdmF0ZSByYXdVcmxUcmVlOiBVcmxUcmVlO1xuICBwcml2YXRlIGJyb3dzZXJVcmxUcmVlOiBVcmxUcmVlO1xuICBwcml2YXRlIHJlYWRvbmx5IHRyYW5zaXRpb25zOiBCZWhhdmlvclN1YmplY3Q8TmF2aWdhdGlvblRyYW5zaXRpb24+O1xuICBwcml2YXRlIG5hdmlnYXRpb25zOiBPYnNlcnZhYmxlPE5hdmlnYXRpb25UcmFuc2l0aW9uPjtcbiAgcHJpdmF0ZSBsYXN0U3VjY2Vzc2Z1bE5hdmlnYXRpb246IE5hdmlnYXRpb258bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY3VycmVudE5hdmlnYXRpb246IE5hdmlnYXRpb258bnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBsb2NhdGlvblN1YnNjcmlwdGlvbj86IFN1YnNjcmlwdGlvbkxpa2U7XG4gIC8qKlxuICAgKiBUcmFja3MgdGhlIHByZXZpb3VzbHkgc2VlbiBsb2NhdGlvbiBjaGFuZ2UgZnJvbSB0aGUgbG9jYXRpb24gc3Vic2NyaXB0aW9uIHNvIHdlIGNhbiBjb21wYXJlXG4gICAqIHRoZSB0d28gbGF0ZXN0IHRvIHNlZSBpZiB0aGV5IGFyZSBkdXBsaWNhdGVzLiBTZWUgc2V0VXBMb2NhdGlvbkNoYW5nZUxpc3RlbmVyLlxuICAgKi9cbiAgcHJpdmF0ZSBsYXN0TG9jYXRpb25DaGFuZ2VJbmZvOiBMb2NhdGlvbkNoYW5nZUluZm98bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgbmF2aWdhdGlvbklkOiBudW1iZXIgPSAwO1xuICBwcml2YXRlIGNvbmZpZ0xvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyO1xuICBwcml2YXRlIG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+O1xuICBwcml2YXRlIGNvbnNvbGU6IENvbnNvbGU7XG4gIHByaXZhdGUgaXNOZ1pvbmVFbmFibGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEFuIGV2ZW50IHN0cmVhbSBmb3Igcm91dGluZyBldmVudHMgaW4gdGhpcyBOZ01vZHVsZS5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBldmVudHM6IE9ic2VydmFibGU8RXZlbnQ+ID0gbmV3IFN1YmplY3Q8RXZlbnQ+KCk7XG4gIC8qKlxuICAgKiBUaGUgY3VycmVudCBzdGF0ZSBvZiByb3V0aW5nIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgcm91dGVyU3RhdGU6IFJvdXRlclN0YXRlO1xuXG4gIC8qKlxuICAgKiBBIGhhbmRsZXIgZm9yIG5hdmlnYXRpb24gZXJyb3JzIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqL1xuICBlcnJvckhhbmRsZXI6IEVycm9ySGFuZGxlciA9IGRlZmF1bHRFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIEEgaGFuZGxlciBmb3IgZXJyb3JzIHRocm93biBieSBgUm91dGVyLnBhcnNlVXJsKHVybClgXG4gICAqIHdoZW4gYHVybGAgY29udGFpbnMgYW4gaW52YWxpZCBjaGFyYWN0ZXIuXG4gICAqIFRoZSBtb3N0IGNvbW1vbiBjYXNlIGlzIGEgYCVgIHNpZ25cbiAgICogdGhhdCdzIG5vdCBlbmNvZGVkIGFuZCBpcyBub3QgcGFydCBvZiBhIHBlcmNlbnQgZW5jb2RlZCBzZXF1ZW5jZS5cbiAgICovXG4gIG1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcjpcbiAgICAgIChlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgICAgdXJsOiBzdHJpbmcpID0+IFVybFRyZWUgPSBkZWZhdWx0TWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyO1xuXG4gIC8qKlxuICAgKiBUcnVlIGlmIGF0IGxlYXN0IG9uZSBuYXZpZ2F0aW9uIGV2ZW50IGhhcyBvY2N1cnJlZCxcbiAgICogZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgbmF2aWdhdGVkOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgbGFzdFN1Y2Nlc3NmdWxJZDogbnVtYmVyID0gLTE7XG5cbiAgLyoqXG4gICAqIEhvb2tzIHRoYXQgZW5hYmxlIHlvdSB0byBwYXVzZSBuYXZpZ2F0aW9uLFxuICAgKiBlaXRoZXIgYmVmb3JlIG9yIGFmdGVyIHRoZSBwcmVhY3RpdmF0aW9uIHBoYXNlLlxuICAgKiBVc2VkIGJ5IGBSb3V0ZXJNb2R1bGVgLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGhvb2tzOiB7XG4gICAgYmVmb3JlUHJlYWN0aXZhdGlvbjogUm91dGVySG9vayxcbiAgICBhZnRlclByZWFjdGl2YXRpb246IFJvdXRlckhvb2tcbiAgfSA9IHtiZWZvcmVQcmVhY3RpdmF0aW9uOiBkZWZhdWx0Um91dGVySG9vaywgYWZ0ZXJQcmVhY3RpdmF0aW9uOiBkZWZhdWx0Um91dGVySG9va307XG5cbiAgLyoqXG4gICAqIEEgc3RyYXRlZ3kgZm9yIGV4dHJhY3RpbmcgYW5kIG1lcmdpbmcgVVJMcy5cbiAgICogVXNlZCBmb3IgQW5ndWxhckpTIHRvIEFuZ3VsYXIgbWlncmF0aW9ucy5cbiAgICovXG4gIHVybEhhbmRsaW5nU3RyYXRlZ3k6IFVybEhhbmRsaW5nU3RyYXRlZ3kgPSBuZXcgRGVmYXVsdFVybEhhbmRsaW5nU3RyYXRlZ3koKTtcblxuICAvKipcbiAgICogQSBzdHJhdGVneSBmb3IgcmUtdXNpbmcgcm91dGVzLlxuICAgKi9cbiAgcm91dGVSZXVzZVN0cmF0ZWd5OiBSb3V0ZVJldXNlU3RyYXRlZ3kgPSBuZXcgRGVmYXVsdFJvdXRlUmV1c2VTdHJhdGVneSgpO1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gaGFuZGxlIGEgbmF2aWdhdGlvbiByZXF1ZXN0IHRvIHRoZSBjdXJyZW50IFVSTC4gT25lIG9mOlxuICAgKiAtIGAnaWdub3JlJ2AgOiAgVGhlIHJvdXRlciBpZ25vcmVzIHRoZSByZXF1ZXN0LlxuICAgKiAtIGAncmVsb2FkJ2AgOiBUaGUgcm91dGVyIHJlbG9hZHMgdGhlIFVSTC4gVXNlIHRvIGltcGxlbWVudCBhIFwicmVmcmVzaFwiIGZlYXR1cmUuXG4gICAqL1xuICBvblNhbWVVcmxOYXZpZ2F0aW9uOiAncmVsb2FkJ3wnaWdub3JlJyA9ICdpZ25vcmUnO1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gbWVyZ2UgcGFyYW1ldGVycywgZGF0YSwgYW5kIHJlc29sdmVkIGRhdGEgZnJvbSBwYXJlbnQgdG8gY2hpbGRcbiAgICogcm91dGVzLiBPbmUgb2Y6XG4gICAqXG4gICAqIC0gYCdlbXB0eU9ubHknYCA6IEluaGVyaXQgcGFyZW50IHBhcmFtZXRlcnMsIGRhdGEsIGFuZCByZXNvbHZlZCBkYXRhXG4gICAqIGZvciBwYXRoLWxlc3Mgb3IgY29tcG9uZW50LWxlc3Mgcm91dGVzLlxuICAgKiAtIGAnYWx3YXlzJ2AgOiBJbmhlcml0IHBhcmVudCBwYXJhbWV0ZXJzLCBkYXRhLCBhbmQgcmVzb2x2ZWQgZGF0YVxuICAgKiBmb3IgYWxsIGNoaWxkIHJvdXRlcy5cbiAgICovXG4gIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6ICdlbXB0eU9ubHknfCdhbHdheXMnID0gJ2VtcHR5T25seSc7XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hlbiB0aGUgcm91dGVyIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMLlxuICAgKiBCeSBkZWZhdWx0IChgXCJkZWZlcnJlZFwiYCksIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMIGFmdGVyIG5hdmlnYXRpb24gaGFzIGZpbmlzaGVkLlxuICAgKiBTZXQgdG8gYCdlYWdlcidgIHRvIHVwZGF0ZSB0aGUgYnJvd3NlciBVUkwgYXQgdGhlIGJlZ2lubmluZyBvZiBuYXZpZ2F0aW9uLlxuICAgKiBZb3UgY2FuIGNob29zZSB0byB1cGRhdGUgZWFybHkgc28gdGhhdCwgaWYgbmF2aWdhdGlvbiBmYWlscyxcbiAgICogeW91IGNhbiBzaG93IGFuIGVycm9yIG1lc3NhZ2Ugd2l0aCB0aGUgVVJMIHRoYXQgZmFpbGVkLlxuICAgKi9cbiAgdXJsVXBkYXRlU3RyYXRlZ3k6ICdkZWZlcnJlZCd8J2VhZ2VyJyA9ICdkZWZlcnJlZCc7XG5cbiAgLyoqXG4gICAqIEVuYWJsZXMgYSBidWcgZml4IHRoYXQgY29ycmVjdHMgcmVsYXRpdmUgbGluayByZXNvbHV0aW9uIGluIGNvbXBvbmVudHMgd2l0aCBlbXB0eSBwYXRocy5cbiAgICogQHNlZSBgUm91dGVyTW9kdWxlYFxuICAgKi9cbiAgcmVsYXRpdmVMaW5rUmVzb2x1dGlvbjogJ2xlZ2FjeSd8J2NvcnJlY3RlZCcgPSAnbGVnYWN5JztcblxuICAvKipcbiAgICogQ3JlYXRlcyB0aGUgcm91dGVyIHNlcnZpY2UuXG4gICAqL1xuICAvLyBUT0RPOiB2c2F2a2luIG1ha2UgaW50ZXJuYWwgYWZ0ZXIgdGhlIGZpbmFsIGlzIG91dC5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT58bnVsbCwgcHJpdmF0ZSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgICAgcHJpdmF0ZSByb290Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIHByaXZhdGUgbG9jYXRpb246IExvY2F0aW9uLCBpbmplY3RvcjogSW5qZWN0b3IsXG4gICAgICBsb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLCBwdWJsaWMgY29uZmlnOiBSb3V0ZXMpIHtcbiAgICBjb25zdCBvbkxvYWRTdGFydCA9IChyOiBSb3V0ZSkgPT4gdGhpcy50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZFN0YXJ0KHIpKTtcbiAgICBjb25zdCBvbkxvYWRFbmQgPSAocjogUm91dGUpID0+IHRoaXMudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRFbmQocikpO1xuXG4gICAgdGhpcy5uZ01vZHVsZSA9IGluamVjdG9yLmdldChOZ01vZHVsZVJlZik7XG4gICAgdGhpcy5jb25zb2xlID0gaW5qZWN0b3IuZ2V0KENvbnNvbGUpO1xuICAgIGNvbnN0IG5nWm9uZSA9IGluamVjdG9yLmdldChOZ1pvbmUpO1xuICAgIHRoaXMuaXNOZ1pvbmVFbmFibGVkID0gbmdab25lIGluc3RhbmNlb2YgTmdab25lO1xuXG4gICAgdGhpcy5yZXNldENvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSBjcmVhdGVFbXB0eVVybFRyZWUoKTtcbiAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLmN1cnJlbnRVcmxUcmVlO1xuICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0aGlzLmN1cnJlbnRVcmxUcmVlO1xuXG4gICAgdGhpcy5jb25maWdMb2FkZXIgPSBuZXcgUm91dGVyQ29uZmlnTG9hZGVyKGxvYWRlciwgY29tcGlsZXIsIG9uTG9hZFN0YXJ0LCBvbkxvYWRFbmQpO1xuICAgIHRoaXMucm91dGVyU3RhdGUgPSBjcmVhdGVFbXB0eVN0YXRlKHRoaXMuY3VycmVudFVybFRyZWUsIHRoaXMucm9vdENvbXBvbmVudFR5cGUpO1xuXG4gICAgdGhpcy50cmFuc2l0aW9ucyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8TmF2aWdhdGlvblRyYW5zaXRpb24+KHtcbiAgICAgIGlkOiAwLFxuICAgICAgY3VycmVudFVybFRyZWU6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBjdXJyZW50UmF3VXJsOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgZXh0cmFjdGVkVXJsOiB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuZXh0cmFjdCh0aGlzLmN1cnJlbnRVcmxUcmVlKSxcbiAgICAgIHVybEFmdGVyUmVkaXJlY3RzOiB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuZXh0cmFjdCh0aGlzLmN1cnJlbnRVcmxUcmVlKSxcbiAgICAgIHJhd1VybDogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIGV4dHJhczoge30sXG4gICAgICByZXNvbHZlOiBudWxsLFxuICAgICAgcmVqZWN0OiBudWxsLFxuICAgICAgcHJvbWlzZTogUHJvbWlzZS5yZXNvbHZlKHRydWUpLFxuICAgICAgc291cmNlOiAnaW1wZXJhdGl2ZScsXG4gICAgICByZXN0b3JlZFN0YXRlOiBudWxsLFxuICAgICAgY3VycmVudFNuYXBzaG90OiB0aGlzLnJvdXRlclN0YXRlLnNuYXBzaG90LFxuICAgICAgdGFyZ2V0U25hcHNob3Q6IG51bGwsXG4gICAgICBjdXJyZW50Um91dGVyU3RhdGU6IHRoaXMucm91dGVyU3RhdGUsXG4gICAgICB0YXJnZXRSb3V0ZXJTdGF0ZTogbnVsbCxcbiAgICAgIGd1YXJkczoge2NhbkFjdGl2YXRlQ2hlY2tzOiBbXSwgY2FuRGVhY3RpdmF0ZUNoZWNrczogW119LFxuICAgICAgZ3VhcmRzUmVzdWx0OiBudWxsLFxuICAgIH0pO1xuICAgIHRoaXMubmF2aWdhdGlvbnMgPSB0aGlzLnNldHVwTmF2aWdhdGlvbnModGhpcy50cmFuc2l0aW9ucyk7XG5cbiAgICB0aGlzLnByb2Nlc3NOYXZpZ2F0aW9ucygpO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXR1cE5hdmlnYXRpb25zKHRyYW5zaXRpb25zOiBPYnNlcnZhYmxlPE5hdmlnYXRpb25UcmFuc2l0aW9uPik6XG4gICAgICBPYnNlcnZhYmxlPE5hdmlnYXRpb25UcmFuc2l0aW9uPiB7XG4gICAgY29uc3QgZXZlbnRzU3ViamVjdCA9ICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50Pik7XG4gICAgcmV0dXJuIHRyYW5zaXRpb25zLnBpcGUoXG4gICAgICAgICAgICAgICBmaWx0ZXIodCA9PiB0LmlkICE9PSAwKSxcblxuICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBVUkxcbiAgICAgICAgICAgICAgIG1hcCh0ID0+XG4gICAgICAgICAgICAgICAgICAgICAgICh7Li4udCwgZXh0cmFjdGVkVXJsOiB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuZXh0cmFjdCh0LnJhd1VybCl9IGFzXG4gICAgICAgICAgICAgICAgICAgICAgICBOYXZpZ2F0aW9uVHJhbnNpdGlvbikpLFxuXG4gICAgICAgICAgICAgICAvLyBVc2luZyBzd2l0Y2hNYXAgc28gd2UgY2FuY2VsIGV4ZWN1dGluZyBuYXZpZ2F0aW9ucyB3aGVuIGEgbmV3IG9uZSBjb21lcyBpblxuICAgICAgICAgICAgICAgc3dpdGNoTWFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICBsZXQgY29tcGxldGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgIGxldCBlcnJvcmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgIHJldHVybiBvZih0KS5waXBlKFxuICAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgdGhlIE5hdmlnYXRpb24gb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudE5hdmlnYXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHQuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgaW5pdGlhbFVybDogdC5jdXJyZW50UmF3VXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZFVybDogdC5leHRyYWN0ZWRVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgdHJpZ2dlcjogdC5zb3VyY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFzOiB0LmV4dHJhcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c05hdmlnYXRpb246IHRoaXMubGFzdFN1Y2Nlc3NmdWxOYXZpZ2F0aW9uID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgey4uLnRoaXMubGFzdFN1Y2Nlc3NmdWxOYXZpZ2F0aW9uLCBwcmV2aW91c05hdmlnYXRpb246IG51bGx9IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVsbFxuICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICBzd2l0Y2hNYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybFRyYW5zaXRpb24gPSAhdGhpcy5uYXZpZ2F0ZWQgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuZXh0cmFjdGVkVXJsLnRvU3RyaW5nKCkgIT09IHRoaXMuYnJvd3NlclVybFRyZWUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc0N1cnJlbnRVcmwgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMub25TYW1lVXJsTmF2aWdhdGlvbiA9PT0gJ3JlbG9hZCcgPyB0cnVlIDogdXJsVHJhbnNpdGlvbikgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5zaG91bGRQcm9jZXNzVXJsKHQucmF3VXJsKTtcblxuICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvY2Vzc0N1cnJlbnRVcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2YodCkucGlwZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZSBOYXZpZ2F0aW9uU3RhcnQgZXZlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoTWFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSB0aGlzLnRyYW5zaXRpb25zLmdldFZhbHVlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5ldyBOYXZpZ2F0aW9uU3RhcnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgdC5zb3VyY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQucmVzdG9yZWRTdGF0ZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0cmFuc2l0aW9uICE9PSB0aGlzLnRyYW5zaXRpb25zLmdldFZhbHVlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt0XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBkZWxheSBpcyByZXF1aXJlZCB0byBtYXRjaCBvbGQgYmVoYXZpb3IgdGhhdCBmb3JjZWQgbmF2aWdhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0byBhbHdheXMgYmUgYXN5bmNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoTWFwKHQgPT4gUHJvbWlzZS5yZXNvbHZlKHQpKSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBcHBseVJlZGlyZWN0c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBseVJlZGlyZWN0cyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmdNb2R1bGUuaW5qZWN0b3IsIHRoaXMuY29uZmlnTG9hZGVyLCB0aGlzLnVybFNlcmlhbGl6ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZyksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBjdXJyZW50TmF2aWdhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmF2aWdhdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnRoaXMuY3VycmVudE5hdmlnYXRpb24hLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxVcmw6IHQudXJsQWZ0ZXJSZWRpcmVjdHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWNvZ25pemVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjb2duaXplKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb290Q29tcG9uZW50VHlwZSwgdGhpcy5jb25maWcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodXJsKSA9PiB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCB0aGlzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3ksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbGF0aXZlTGlua1Jlc29sdXRpb24pLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgaWYgaW4gYGVhZ2VyYCB1cGRhdGUgbW9kZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdC5leHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QnJvd3NlclVybChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQudXJsQWZ0ZXJSZWRpcmVjdHMsICEhdC5leHRyYXMucmVwbGFjZVVybCwgdC5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuZXh0cmFzLnN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0LnVybEFmdGVyUmVkaXJlY3RzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZSBSb3V0ZXNSZWNvZ25pemVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByb3V0ZXNSZWNvZ25pemVkID0gbmV3IFJvdXRlc1JlY29nbml6ZWQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVVcmwodC51cmxBZnRlclJlZGlyZWN0cyksIHQudGFyZ2V0U25hcHNob3QhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQocm91dGVzUmVjb2duaXplZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9jZXNzUHJldmlvdXNVcmwgPSB1cmxUcmFuc2l0aW9uICYmIHRoaXMucmF3VXJsVHJlZSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybCh0aGlzLnJhd1VybFRyZWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIC8qIFdoZW4gdGhlIGN1cnJlbnQgVVJMIHNob3VsZG4ndCBiZSBwcm9jZXNzZWQsIGJ1dCB0aGUgcHJldmlvdXMgb25lIHdhcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKiB3ZSBoYW5kbGUgdGhpcyBcImVycm9yIGNvbmRpdGlvblwiIGJ5IG5hdmlnYXRpbmcgdG8gdGhlIHByZXZpb3VzbHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKiBzdWNjZXNzZnVsIFVSTCwgYnV0IGxlYXZpbmcgdGhlIFVSTCBpbnRhY3QuKi9cbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvY2Vzc1ByZXZpb3VzVXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7aWQsIGV4dHJhY3RlZFVybCwgc291cmNlLCByZXN0b3JlZFN0YXRlLCBleHRyYXN9ID0gdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdlN0YXJ0ID0gbmV3IE5hdmlnYXRpb25TdGFydChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZCwgdGhpcy5zZXJpYWxpemVVcmwoZXh0cmFjdGVkVXJsKSwgc291cmNlLCByZXN0b3JlZFN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuYXZTdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRTbmFwc2hvdCA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlRW1wdHlTdGF0ZShleHRyYWN0ZWRVcmwsIHRoaXMucm9vdENvbXBvbmVudFR5cGUpLnNuYXBzaG90O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2Yoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRTbmFwc2hvdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsQWZ0ZXJSZWRpcmVjdHM6IGV4dHJhY3RlZFVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFzOiB7Li4uZXh0cmFzLCBza2lwTG9jYXRpb25DaGFuZ2U6IGZhbHNlLCByZXBsYWNlVXJsOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogV2hlbiBuZWl0aGVyIHRoZSBjdXJyZW50IG9yIHByZXZpb3VzIFVSTCBjYW4gYmUgcHJvY2Vzc2VkLCBkbyBub3RoaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBvdGhlciB0aGFuIHVwZGF0ZSByb3V0ZXIncyBpbnRlcm5hbCByZWZlcmVuY2UgdG8gdGhlIGN1cnJlbnQgXCJzZXR0bGVkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIFVSTC4gVGhpcyB3YXkgdGhlIG5leHQgbmF2aWdhdGlvbiB3aWxsIGJlIGNvbWluZyBmcm9tIHRoZSBjdXJyZW50IFVSTFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICogaW4gdGhlIGJyb3dzZXIuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmF3VXJsVHJlZSA9IHQucmF3VXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5icm93c2VyVXJsVHJlZSA9IHQudXJsQWZ0ZXJSZWRpcmVjdHM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlc29sdmUobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gQmVmb3JlIFByZWFjdGl2YXRpb25cbiAgICAgICAgICAgICAgICAgICAgIHN3aXRjaFRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFNuYXBzaG90LFxuICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBuYXZpZ2F0aW9uSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFjdGVkVXJsOiBhcHBsaWVkVXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICByYXdVcmw6IHJhd1VybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFzOiB7c2tpcExvY2F0aW9uQ2hhbmdlLCByZXBsYWNlVXJsfVxuICAgICAgICAgICAgICAgICAgICAgICB9ID0gdDtcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaG9va3MuYmVmb3JlUHJlYWN0aXZhdGlvbih0YXJnZXRTbmFwc2hvdCEsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBuYXZpZ2F0aW9uSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgYXBwbGllZFVybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmF3VXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBza2lwTG9jYXRpb25DaGFuZ2U6ICEhc2tpcExvY2F0aW9uQ2hhbmdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2VVcmw6ICEhcmVwbGFjZVVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gLS0tIEdVQVJEUyAtLS1cbiAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZ3VhcmRzU3RhcnQgPSBuZXcgR3VhcmRzQ2hlY2tTdGFydChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ISk7XG4gICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KGd1YXJkc1N0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICBtYXAodCA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4udCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGd1YXJkczogZ2V0QWxsUm91dGVHdWFyZHMoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC50YXJnZXRTbmFwc2hvdCEsIHQuY3VycmVudFNuYXBzaG90LCB0aGlzLnJvb3RDb250ZXh0cylcbiAgICAgICAgICAgICAgICAgICAgICAgICB9KSksXG5cbiAgICAgICAgICAgICAgICAgICAgIGNoZWNrR3VhcmRzKHRoaXMubmdNb2R1bGUuaW5qZWN0b3IsIChldnQ6IEV2ZW50KSA9PiB0aGlzLnRyaWdnZXJFdmVudChldnQpKSxcbiAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzVXJsVHJlZSh0Lmd1YXJkc1Jlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvcjogRXJyb3Ime3VybD86IFVybFRyZWV9ID0gbmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgUmVkaXJlY3RpbmcgdG8gXCIke3RoaXMuc2VyaWFsaXplVXJsKHQuZ3VhcmRzUmVzdWx0KX1cImApO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yLnVybCA9IHQuZ3VhcmRzUmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBndWFyZHNFbmQgPSBuZXcgR3VhcmRzQ2hlY2tFbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzKSwgdC50YXJnZXRTbmFwc2hvdCEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAhIXQuZ3VhcmRzUmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQoZ3VhcmRzRW5kKTtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICBmaWx0ZXIodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGlmICghdC5ndWFyZHNSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdkNhbmNlbCA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOYXZpZ2F0aW9uQ2FuY2VsKHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuYXZDYW5jZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIHQucmVzb2x2ZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIC0tLSBSRVNPTFZFIC0tLVxuICAgICAgICAgICAgICAgICAgICAgc3dpdGNoVGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAodC5ndWFyZHMuY2FuQWN0aXZhdGVDaGVja3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlU3RhcnQgPSBuZXcgUmVzb2x2ZVN0YXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ISk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQocmVzb2x2ZVN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YVJlc29sdmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmVEYXRhKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LCB0aGlzLm5nTW9kdWxlLmluamVjdG9yKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0OiAoKSA9PiBkYXRhUmVzb2x2ZWQgPSB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGFSZXNvbHZlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuYXZDYW5jZWwgPSBuZXcgTmF2aWdhdGlvbkNhbmNlbChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBBdCBsZWFzdCBvbmUgcm91dGUgcmVzb2x2ZXIgZGlkbid0IGVtaXQgYW55IHZhbHVlLmApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2Q2FuY2VsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZUVuZCA9IG5ldyBSZXNvbHZlRW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ISk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQocmVzb2x2ZUVuZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIC0tLSBBRlRFUiBQUkVBQ1RJVkFUSU9OIC0tLVxuICAgICAgICAgICAgICAgICAgICAgc3dpdGNoVGFwKCh0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0U25hcHNob3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IG5hdmlnYXRpb25JZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYWN0ZWRVcmw6IGFwcGxpZWRVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHJhd1VybDogcmF3VXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYXM6IHtza2lwTG9jYXRpb25DaGFuZ2UsIHJlcGxhY2VVcmx9XG4gICAgICAgICAgICAgICAgICAgICAgIH0gPSB0O1xuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5ob29rcy5hZnRlclByZWFjdGl2YXRpb24odGFyZ2V0U25hcHNob3QhLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdGlvbklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFwcGxpZWRVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHJhd1VybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiAhIXNraXBMb2NhdGlvbkNoYW5nZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlVXJsOiAhIXJlcGxhY2VVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIG1hcCgodDogTmF2aWdhdGlvblRyYW5zaXRpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0Um91dGVyU3RhdGUgPSBjcmVhdGVSb3V0ZXJTdGF0ZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LCB0LnRhcmdldFNuYXBzaG90ISwgdC5jdXJyZW50Um91dGVyU3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKHsuLi50LCB0YXJnZXRSb3V0ZXJTdGF0ZX0pO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8qIE9uY2UgaGVyZSwgd2UgYXJlIGFib3V0IHRvIGFjdGl2YXRlIHN5bmNyb25vdXNseS4gVGhlIGFzc3VtcHRpb24gaXMgdGhpc1xuICAgICAgICAgICAgICAgICAgICAgICAgd2lsbCBzdWNjZWVkLCBhbmQgdXNlciBjb2RlIG1heSByZWFkIGZyb20gdGhlIFJvdXRlciBzZXJ2aWNlLiBUaGVyZWZvcmVcbiAgICAgICAgICAgICAgICAgICAgICAgIGJlZm9yZSBhY3RpdmF0aW9uLCB3ZSBuZWVkIHRvIHVwZGF0ZSByb3V0ZXIgcHJvcGVydGllcyBzdG9yaW5nIHRoZSBjdXJyZW50XG4gICAgICAgICAgICAgICAgICAgICAgICBVUkwgYW5kIHRoZSBSb3V0ZXJTdGF0ZSwgYXMgd2VsbCBhcyB1cGRhdGVkIHRoZSBicm93c2VyIFVSTC4gQWxsIHRoaXMgc2hvdWxkXG4gICAgICAgICAgICAgICAgICAgICAgICBoYXBwZW4gKmJlZm9yZSogYWN0aXZhdGluZy4gKi9cbiAgICAgICAgICAgICAgICAgICAgIHRhcCgodDogTmF2aWdhdGlvblRyYW5zaXRpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IHQudXJsQWZ0ZXJSZWRpcmVjdHM7XG4gICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmF3VXJsVHJlZSA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodGhpcy5jdXJyZW50VXJsVHJlZSwgdC5yYXdVcmwpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIHtyb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGV9KS5yb3V0ZXJTdGF0ZSA9IHQudGFyZ2V0Um91dGVyU3RhdGUhO1xuXG4gICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZGVmZXJyZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0LmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QnJvd3NlclVybChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJhd1VybFRyZWUsICEhdC5leHRyYXMucmVwbGFjZVVybCwgdC5pZCwgdC5leHRyYXMuc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJyb3dzZXJVcmxUcmVlID0gdC51cmxBZnRlclJlZGlyZWN0cztcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIGFjdGl2YXRlUm91dGVzKFxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9vdENvbnRleHRzLCB0aGlzLnJvdXRlUmV1c2VTdHJhdGVneSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAoZXZ0OiBFdmVudCkgPT4gdGhpcy50cmlnZ2VyRXZlbnQoZXZ0KSksXG5cbiAgICAgICAgICAgICAgICAgICAgIHRhcCh7XG4gICAgICAgICAgICAgICAgICAgICAgIG5leHQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgY29tcGxldGUoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICBmaW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIC8qIFdoZW4gdGhlIG5hdmlnYXRpb24gc3RyZWFtIGZpbmlzaGVzIGVpdGhlciB0aHJvdWdoIGVycm9yIG9yIHN1Y2Nlc3MsIHdlXG4gICAgICAgICAgICAgICAgICAgICAgICAqIHNldCB0aGUgYGNvbXBsZXRlZGAgb3IgYGVycm9yZWRgIGZsYWcuIEhvd2V2ZXIsIHRoZXJlIGFyZSBzb21lIHNpdHVhdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgICogd2hlcmUgd2UgY291bGQgZ2V0IGhlcmUgd2l0aG91dCBlaXRoZXIgb2YgdGhvc2UgYmVpbmcgc2V0LiBGb3IgaW5zdGFuY2UsIGFcbiAgICAgICAgICAgICAgICAgICAgICAgICogcmVkaXJlY3QgZHVyaW5nIE5hdmlnYXRpb25TdGFydC4gVGhlcmVmb3JlLCB0aGlzIGlzIGEgY2F0Y2gtYWxsIHRvIG1ha2VcbiAgICAgICAgICAgICAgICAgICAgICAgICogc3VyZSB0aGUgTmF2aWdhdGlvbkNhbmNlbFxuICAgICAgICAgICAgICAgICAgICAgICAgKiBldmVudCBpcyBmaXJlZCB3aGVuIGEgbmF2aWdhdGlvbiBnZXRzIGNhbmNlbGxlZCBidXQgbm90IGNhdWdodCBieSBvdGhlclxuICAgICAgICAgICAgICAgICAgICAgICAgKiBtZWFucy4gKi9cbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjb21wbGV0ZWQgJiYgIWVycm9yZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNdXN0IHJlc2V0IHRvIGN1cnJlbnQgVVJMIHRyZWUgaGVyZSB0byBlbnN1cmUgaGlzdG9yeS5zdGF0ZSBpcyBzZXQuIE9uIGFcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBmcmVzaCBwYWdlIGxvYWQsIGlmIGEgbmV3IG5hdmlnYXRpb24gY29tZXMgaW4gYmVmb3JlIGEgc3VjY2Vzc2Z1bFxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5hdmlnYXRpb24gY29tcGxldGVzLCB0aGVyZSB3aWxsIGJlIG5vdGhpbmcgaW5cbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBoaXN0b3J5LnN0YXRlLm5hdmlnYXRpb25JZC4gVGhpcyBjYW4gY2F1c2Ugc3luYyBwcm9ibGVtcyB3aXRoIEFuZ3VsYXJKU1xuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHN5bmMgY29kZSB3aGljaCBsb29rcyBmb3IgYSB2YWx1ZSBoZXJlIGluIG9yZGVyIHRvIGRldGVybWluZSB3aGV0aGVyIG9yXG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm90IHRvIGhhbmRsZSBhIGdpdmVuIHBvcHN0YXRlIGV2ZW50IG9yIHRvIGxlYXZlIGl0IHRvIHRoZSBBbmd1YWxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gcm91dGVyLlxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmF2Q2FuY2VsID0gbmV3IE5hdmlnYXRpb25DYW5jZWwoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYE5hdmlnYXRpb24gSUQgJHt0LmlkfSBpcyBub3QgZXF1YWwgdG8gdGhlIGN1cnJlbnQgbmF2aWdhdGlvbiBpZCAke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uYXZpZ2F0aW9uSWR9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdkNhbmNlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAvLyBjdXJyZW50TmF2aWdhdGlvbiBzaG91bGQgYWx3YXlzIGJlIHJlc2V0IHRvIG51bGwgaGVyZS4gSWYgbmF2aWdhdGlvbiB3YXNcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gc3VjY2Vzc2Z1bCwgbGFzdFN1Y2Nlc3NmdWxUcmFuc2l0aW9uIHdpbGwgaGF2ZSBhbHJlYWR5IGJlZW4gc2V0LiBUaGVyZWZvcmVcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gd2UgY2FuIHNhZmVseSBzZXQgY3VycmVudE5hdmlnYXRpb24gdG8gbnVsbCBoZXJlLlxuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgY2F0Y2hFcnJvcigoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBlcnJvcmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgLyogVGhpcyBlcnJvciB0eXBlIGlzIGlzc3VlZCBkdXJpbmcgUmVkaXJlY3QsIGFuZCBpcyBoYW5kbGVkIGFzIGFcbiAgICAgICAgICAgICAgICAgICAgICAgICogY2FuY2VsbGF0aW9uIHJhdGhlciB0aGFuIGFuIGVycm9yLiAqL1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWRpcmVjdGluZyA9IGlzVXJsVHJlZShlLnVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWRpcmVjdGluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHByb3BlcnR5IG9ubHkgaWYgd2UncmUgbm90IHJlZGlyZWN0aW5nLiBJZiB3ZSBsYW5kZWQgb24gYSBwYWdlIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVkaXJlY3QgdG8gYC9gIHJvdXRlLCB0aGUgbmV3IG5hdmlnYXRpb24gaXMgZ29pbmcgdG8gc2VlIHRoZSBgL2BcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlzbid0IGEgY2hhbmdlIGZyb20gdGhlIGRlZmF1bHQgY3VycmVudFVybFRyZWUgYW5kIHdvbid0IG5hdmlnYXRlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBvbmx5IGFwcGxpY2FibGUgd2l0aCBpbml0aWFsIG5hdmlnYXRpb24sIHNvIHNldHRpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGBuYXZpZ2F0ZWRgIG9ubHkgd2hlbiBub3QgcmVkaXJlY3RpbmcgcmVzb2x2ZXMgdGhpcyBzY2VuYXJpby5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzZXRTdGF0ZUFuZFVybCh0LmN1cnJlbnRSb3V0ZXJTdGF0ZSwgdC5jdXJyZW50VXJsVHJlZSwgdC5yYXdVcmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuYXZDYW5jZWwgPSBuZXcgTmF2aWdhdGlvbkNhbmNlbChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCBlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuYXZDYW5jZWwpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiByZWRpcmVjdGluZywgd2UgbmVlZCB0byBkZWxheSByZXNvbHZpbmcgdGhlIG5hdmlnYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwcm9taXNlIGFuZCBwdXNoIGl0IHRvIHRoZSByZWRpcmVjdCBuYXZpZ2F0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWRpcmVjdGluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2V0VGltZW91dCBpcyByZXF1aXJlZCBzbyB0aGlzIG5hdmlnYXRpb24gZmluaXNoZXMgd2l0aFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIHJldHVybiBFTVBUWSBiZWxvdy4gSWYgaXQgaXNuJ3QgYWxsb3dlZCB0byBmaW5pc2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHByb2Nlc3NpbmcsIHRoZXJlIGNhbiBiZSBtdWx0aXBsZSBuYXZpZ2F0aW9ucyB0byB0aGUgc2FtZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVVJMLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lcmdlZFRyZWUgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKGUudXJsLCB0aGlzLnJhd1VybFRyZWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHRyYXMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiB0LmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZVVybDogdGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lcmdlZFRyZWUsICdpbXBlcmF0aXZlJywgbnVsbCwgZXh0cmFzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3Jlc29sdmU6IHQucmVzb2x2ZSwgcmVqZWN0OiB0LnJlamVjdCwgcHJvbWlzZTogdC5wcm9taXNlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAvKiBBbGwgb3RoZXIgZXJyb3JzIHNob3VsZCByZXNldCB0byB0aGUgcm91dGVyJ3MgaW50ZXJuYWwgVVJMIHJlZmVyZW5jZSB0b1xuICAgICAgICAgICAgICAgICAgICAgICAgICAqIHRoZSBwcmUtZXJyb3Igc3RhdGUuICovXG4gICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXNldFN0YXRlQW5kVXJsKHQuY3VycmVudFJvdXRlclN0YXRlLCB0LmN1cnJlbnRVcmxUcmVlLCB0LnJhd1VybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmF2RXJyb3IgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgTmF2aWdhdGlvbkVycm9yKHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdkVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKHRoaXMuZXJyb3JIYW5kbGVyKGUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5yZWplY3QoZWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgIC8vIFRPRE8oamFzb25hZGVuKTogcmVtb3ZlIGNhc3Qgb25jZSBnMyBpcyBvbiB1cGRhdGVkIFR5cGVTY3JpcHRcbiAgICAgICAgICAgICAgIH0pKSBhcyBhbnkgYXMgT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj47XG4gIH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIFRPRE86IHRoaXMgc2hvdWxkIGJlIHJlbW92ZWQgb25jZSB0aGUgY29uc3RydWN0b3Igb2YgdGhlIHJvdXRlciBtYWRlIGludGVybmFsXG4gICAqL1xuICByZXNldFJvb3RDb21wb25lbnRUeXBlKHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT4pOiB2b2lkIHtcbiAgICB0aGlzLnJvb3RDb21wb25lbnRUeXBlID0gcm9vdENvbXBvbmVudFR5cGU7XG4gICAgLy8gVE9ETzogdnNhdmtpbiByb3V0ZXIgNC4wIHNob3VsZCBtYWtlIHRoZSByb290IGNvbXBvbmVudCBzZXQgdG8gbnVsbFxuICAgIC8vIHRoaXMgd2lsbCBzaW1wbGlmeSB0aGUgbGlmZWN5Y2xlIG9mIHRoZSByb3V0ZXIuXG4gICAgdGhpcy5yb3V0ZXJTdGF0ZS5yb290LmNvbXBvbmVudCA9IHRoaXMucm9vdENvbXBvbmVudFR5cGU7XG4gIH1cblxuICBwcml2YXRlIGdldFRyYW5zaXRpb24oKTogTmF2aWdhdGlvblRyYW5zaXRpb24ge1xuICAgIGNvbnN0IHRyYW5zaXRpb24gPSB0aGlzLnRyYW5zaXRpb25zLnZhbHVlO1xuICAgIC8vIFRoaXMgdmFsdWUgbmVlZHMgdG8gYmUgc2V0LiBPdGhlciB2YWx1ZXMgc3VjaCBhcyBleHRyYWN0ZWRVcmwgYXJlIHNldCBvbiBpbml0aWFsIG5hdmlnYXRpb25cbiAgICAvLyBidXQgdGhlIHVybEFmdGVyUmVkaXJlY3RzIG1heSBub3QgZ2V0IHNldCBpZiB3ZSBhcmVuJ3QgcHJvY2Vzc2luZyB0aGUgbmV3IFVSTCAqYW5kKiBub3RcbiAgICAvLyBwcm9jZXNzaW5nIHRoZSBwcmV2aW91cyBVUkwuXG4gICAgdHJhbnNpdGlvbi51cmxBZnRlclJlZGlyZWN0cyA9IHRoaXMuYnJvd3NlclVybFRyZWU7XG4gICAgcmV0dXJuIHRyYW5zaXRpb247XG4gIH1cblxuICBwcml2YXRlIHNldFRyYW5zaXRpb24odDogUGFydGlhbDxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4pOiB2b2lkIHtcbiAgICB0aGlzLnRyYW5zaXRpb25zLm5leHQoey4uLnRoaXMuZ2V0VHJhbnNpdGlvbigpLCAuLi50fSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyIGFuZCBwZXJmb3JtcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaW5pdGlhbE5hdmlnYXRpb24oKTogdm9pZCB7XG4gICAgdGhpcy5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICBpZiAodGhpcy5uYXZpZ2F0aW9uSWQgPT09IDApIHtcbiAgICAgIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmxvY2F0aW9uLnBhdGgodHJ1ZSksIHtyZXBsYWNlVXJsOiB0cnVlfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdXAgdGhlIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lci4gVGhpcyBsaXN0ZW5lciBkZXRlY3RzIG5hdmlnYXRpb25zIHRyaWdnZXJlZCBmcm9tIG91dHNpZGVcbiAgICogdGhlIFJvdXRlciAodGhlIGJyb3dzZXIgYmFjay9mb3J3YXJkIGJ1dHRvbnMsIGZvciBleGFtcGxlKSBhbmQgc2NoZWR1bGVzIGEgY29ycmVzcG9uZGluZyBSb3V0ZXJcbiAgICogbmF2aWdhdGlvbiBzbyB0aGF0IHRoZSBjb3JyZWN0IGV2ZW50cywgZ3VhcmRzLCBldGMuIGFyZSB0cmlnZ2VyZWQuXG4gICAqL1xuICBzZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTogdm9pZCB7XG4gICAgLy8gRG9uJ3QgbmVlZCB0byB1c2UgWm9uZS53cmFwIGFueSBtb3JlLCBiZWNhdXNlIHpvbmUuanNcbiAgICAvLyBhbHJlYWR5IHBhdGNoIG9uUG9wU3RhdGUsIHNvIGxvY2F0aW9uIGNoYW5nZSBjYWxsYmFjayB3aWxsXG4gICAgLy8gcnVuIGludG8gbmdab25lXG4gICAgaWYgKCF0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLmxvY2F0aW9uU3Vic2NyaXB0aW9uID0gdGhpcy5sb2NhdGlvbi5zdWJzY3JpYmUoZXZlbnQgPT4ge1xuICAgICAgICBjb25zdCBjdXJyZW50Q2hhbmdlID0gdGhpcy5leHRyYWN0TG9jYXRpb25DaGFuZ2VJbmZvRnJvbUV2ZW50KGV2ZW50KTtcbiAgICAgICAgaWYgKHRoaXMuc2hvdWxkU2NoZWR1bGVOYXZpZ2F0aW9uKHRoaXMubGFzdExvY2F0aW9uQ2hhbmdlSW5mbywgY3VycmVudENoYW5nZSkpIHtcbiAgICAgICAgICAvLyBUaGUgYHNldFRpbWVvdXRgIHdhcyBhZGRlZCBpbiAjMTIxNjAgYW5kIGlzIGxpa2VseSB0byBzdXBwb3J0IEFuZ3VsYXIvQW5ndWxhckpTXG4gICAgICAgICAgLy8gaHlicmlkIGFwcHMuXG4gICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7c291cmNlLCBzdGF0ZSwgdXJsVHJlZX0gPSBjdXJyZW50Q2hhbmdlO1xuICAgICAgICAgICAgY29uc3QgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3JlcGxhY2VVcmw6IHRydWV9O1xuICAgICAgICAgICAgaWYgKHN0YXRlKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHN0YXRlQ29weSA9IHsuLi5zdGF0ZX0gYXMgUGFydGlhbDxSZXN0b3JlZFN0YXRlPjtcbiAgICAgICAgICAgICAgZGVsZXRlIHN0YXRlQ29weS5uYXZpZ2F0aW9uSWQ7XG4gICAgICAgICAgICAgIGlmIChPYmplY3Qua2V5cyhzdGF0ZUNvcHkpLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGV4dHJhcy5zdGF0ZSA9IHN0YXRlQ29weTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24odXJsVHJlZSwgc291cmNlLCBzdGF0ZSwgZXh0cmFzKTtcbiAgICAgICAgICB9LCAwKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxhc3RMb2NhdGlvbkNoYW5nZUluZm8gPSBjdXJyZW50Q2hhbmdlO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEV4dHJhY3RzIHJvdXRlci1yZWxhdGVkIGluZm9ybWF0aW9uIGZyb20gYSBgUG9wU3RhdGVFdmVudGAuICovXG4gIHByaXZhdGUgZXh0cmFjdExvY2F0aW9uQ2hhbmdlSW5mb0Zyb21FdmVudChjaGFuZ2U6IFBvcFN0YXRlRXZlbnQpOiBMb2NhdGlvbkNoYW5nZUluZm8ge1xuICAgIHJldHVybiB7XG4gICAgICBzb3VyY2U6IGNoYW5nZVsndHlwZSddID09PSAncG9wc3RhdGUnID8gJ3BvcHN0YXRlJyA6ICdoYXNoY2hhbmdlJyxcbiAgICAgIHVybFRyZWU6IHRoaXMucGFyc2VVcmwoY2hhbmdlWyd1cmwnXSEpLFxuICAgICAgLy8gTmF2aWdhdGlvbnMgY29taW5nIGZyb20gQW5ndWxhciByb3V0ZXIgaGF2ZSBhIG5hdmlnYXRpb25JZCBzdGF0ZVxuICAgICAgLy8gcHJvcGVydHkuIFdoZW4gdGhpcyBleGlzdHMsIHJlc3RvcmUgdGhlIHN0YXRlLlxuICAgICAgc3RhdGU6IGNoYW5nZS5zdGF0ZT8ubmF2aWdhdGlvbklkID8gY2hhbmdlLnN0YXRlIDogbnVsbCxcbiAgICAgIHRyYW5zaXRpb25JZDogdGhpcy5nZXRUcmFuc2l0aW9uKCkuaWRcbiAgICB9IGFzIGNvbnN0O1xuICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hldGhlciB0d28gZXZlbnRzIHRyaWdnZXJlZCBieSB0aGUgTG9jYXRpb24gc3Vic2NyaXB0aW9uIGFyZSBkdWUgdG8gdGhlIHNhbWVcbiAgICogbmF2aWdhdGlvbi4gVGhlIGxvY2F0aW9uIHN1YnNjcmlwdGlvbiBjYW4gZmlyZSB0d28gZXZlbnRzIChwb3BzdGF0ZSBhbmQgaGFzaGNoYW5nZSkgZm9yIGFcbiAgICogc2luZ2xlIG5hdmlnYXRpb24uIFRoZSBzZWNvbmQgb25lIHNob3VsZCBiZSBpZ25vcmVkLCB0aGF0IGlzLCB3ZSBzaG91bGQgbm90IHNjaGVkdWxlIGFub3RoZXJcbiAgICogbmF2aWdhdGlvbiBpbiB0aGUgUm91dGVyLlxuICAgKi9cbiAgcHJpdmF0ZSBzaG91bGRTY2hlZHVsZU5hdmlnYXRpb24ocHJldmlvdXM6IExvY2F0aW9uQ2hhbmdlSW5mb3xudWxsLCBjdXJyZW50OiBMb2NhdGlvbkNoYW5nZUluZm8pOlxuICAgICAgYm9vbGVhbiB7XG4gICAgaWYgKCFwcmV2aW91cykgcmV0dXJuIHRydWU7XG5cbiAgICBjb25zdCBzYW1lRGVzdGluYXRpb24gPSBjdXJyZW50LnVybFRyZWUudG9TdHJpbmcoKSA9PT0gcHJldmlvdXMudXJsVHJlZS50b1N0cmluZygpO1xuICAgIGNvbnN0IGV2ZW50c09jY3VycmVkQXRTYW1lVGltZSA9IGN1cnJlbnQudHJhbnNpdGlvbklkID09PSBwcmV2aW91cy50cmFuc2l0aW9uSWQ7XG4gICAgaWYgKCFldmVudHNPY2N1cnJlZEF0U2FtZVRpbWUgfHwgIXNhbWVEZXN0aW5hdGlvbikge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKChjdXJyZW50LnNvdXJjZSA9PT0gJ2hhc2hjaGFuZ2UnICYmIHByZXZpb3VzLnNvdXJjZSA9PT0gJ3BvcHN0YXRlJykgfHxcbiAgICAgICAgKGN1cnJlbnQuc291cmNlID09PSAncG9wc3RhdGUnICYmIHByZXZpb3VzLnNvdXJjZSA9PT0gJ2hhc2hjaGFuZ2UnKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqIFRoZSBjdXJyZW50IFVSTC4gKi9cbiAgZ2V0IHVybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnNlcmlhbGl6ZVVybCh0aGlzLmN1cnJlbnRVcmxUcmVlKTtcbiAgfVxuXG4gIC8qKiBUaGUgY3VycmVudCBOYXZpZ2F0aW9uIG9iamVjdCBpZiBvbmUgZXhpc3RzICovXG4gIGdldEN1cnJlbnROYXZpZ2F0aW9uKCk6IE5hdmlnYXRpb258bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuY3VycmVudE5hdmlnYXRpb247XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIHRyaWdnZXJFdmVudChldmVudDogRXZlbnQpOiB2b2lkIHtcbiAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pLm5leHQoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0cyB0aGUgcm91dGUgY29uZmlndXJhdGlvbiB1c2VkIGZvciBuYXZpZ2F0aW9uIGFuZCBnZW5lcmF0aW5nIGxpbmtzLlxuICAgKlxuICAgKiBAcGFyYW0gY29uZmlnIFRoZSByb3V0ZSBhcnJheSBmb3IgdGhlIG5ldyBjb25maWd1cmF0aW9uLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLnJlc2V0Q29uZmlnKFtcbiAgICogIHsgcGF0aDogJ3RlYW0vOmlkJywgY29tcG9uZW50OiBUZWFtQ21wLCBjaGlsZHJlbjogW1xuICAgKiAgICB7IHBhdGg6ICdzaW1wbGUnLCBjb21wb25lbnQ6IFNpbXBsZUNtcCB9LFxuICAgKiAgICB7IHBhdGg6ICd1c2VyLzpuYW1lJywgY29tcG9uZW50OiBVc2VyQ21wIH1cbiAgICogIF19XG4gICAqIF0pO1xuICAgKiBgYGBcbiAgICovXG4gIHJlc2V0Q29uZmlnKGNvbmZpZzogUm91dGVzKTogdm9pZCB7XG4gICAgdmFsaWRhdGVDb25maWcoY29uZmlnKTtcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZy5tYXAoc3RhbmRhcmRpemVDb25maWcpO1xuICAgIHRoaXMubmF2aWdhdGVkID0gZmFsc2U7XG4gICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bElkID0gLTE7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuZGlzcG9zZSgpO1xuICB9XG5cbiAgLyoqIERpc3Bvc2VzIG9mIHRoZSByb3V0ZXIuICovXG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24gPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFwcGVuZHMgVVJMIHNlZ21lbnRzIHRvIHRoZSBjdXJyZW50IFVSTCB0cmVlIHRvIGNyZWF0ZSBhIG5ldyBVUkwgdHJlZS5cbiAgICpcbiAgICogQHBhcmFtIGNvbW1hbmRzIEFuIGFycmF5IG9mIFVSTCBmcmFnbWVudHMgd2l0aCB3aGljaCB0byBjb25zdHJ1Y3QgdGhlIG5ldyBVUkwgdHJlZS5cbiAgICogSWYgdGhlIHBhdGggaXMgc3RhdGljLCBjYW4gYmUgdGhlIGxpdGVyYWwgVVJMIHN0cmluZy4gRm9yIGEgZHluYW1pYyBwYXRoLCBwYXNzIGFuIGFycmF5IG9mIHBhdGhcbiAgICogc2VnbWVudHMsIGZvbGxvd2VkIGJ5IHRoZSBwYXJhbWV0ZXJzIGZvciBlYWNoIHNlZ21lbnQuXG4gICAqIFRoZSBmcmFnbWVudHMgYXJlIGFwcGxpZWQgdG8gdGhlIGN1cnJlbnQgVVJMIHRyZWUgb3IgdGhlIG9uZSBwcm92aWRlZCAgaW4gdGhlIGByZWxhdGl2ZVRvYFxuICAgKiBwcm9wZXJ0eSBvZiB0aGUgb3B0aW9ucyBvYmplY3QsIGlmIHN1cHBsaWVkLlxuICAgKiBAcGFyYW0gbmF2aWdhdGlvbkV4dHJhcyBPcHRpb25zIHRoYXQgY29udHJvbCB0aGUgbmF2aWdhdGlvbiBzdHJhdGVneS4gVGhpcyBmdW5jdGlvblxuICAgKiBvbmx5IHVzZXMgcHJvcGVydGllcyBpbiBgTmF2aWdhdGlvbkV4dHJhc2AgdGhhdCB3b3VsZCBjaGFuZ2UgdGhlIHByb3ZpZGVkIFVSTC5cbiAgICogQHJldHVybnMgVGhlIG5ldyBVUkwgdHJlZS5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogYGBgXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMy91c2VyLzExXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywgJ3VzZXInLCAxMV0pO1xuICAgKlxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzM7ZXhwYW5kPXRydWUvdXNlci8xMVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtleHBhbmQ6IHRydWV9LCAndXNlcicsIDExXSk7XG4gICAqXG4gICAqIC8vIHlvdSBjYW4gY29sbGFwc2Ugc3RhdGljIHNlZ21lbnRzIGxpa2UgdGhpcyAodGhpcyB3b3JrcyBvbmx5IHdpdGggdGhlIGZpcnN0IHBhc3NlZC1pbiB2YWx1ZSk6XG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0vMzMvdXNlcicsIHVzZXJJZF0pO1xuICAgKlxuICAgKiAvLyBJZiB0aGUgZmlyc3Qgc2VnbWVudCBjYW4gY29udGFpbiBzbGFzaGVzLCBhbmQgeW91IGRvIG5vdCB3YW50IHRoZSByb3V0ZXIgdG8gc3BsaXQgaXQsXG4gICAqIC8vIHlvdSBjYW4gZG8gdGhlIGZvbGxvd2luZzpcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoW3tzZWdtZW50UGF0aDogJy9vbmUvdHdvJ31dKTtcbiAgICpcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzLyh1c2VyLzExLy9yaWdodDpjaGF0KVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDogJ2NoYXQnfX1dKTtcbiAgICpcbiAgICogLy8gcmVtb3ZlIHRoZSByaWdodCBzZWNvbmRhcnkgbm9kZVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDogbnVsbH19XSk7XG4gICAqXG4gICAqIC8vIGFzc3VtaW5nIHRoZSBjdXJyZW50IHVybCBpcyBgL3RlYW0vMzMvdXNlci8xMWAgYW5kIHRoZSByb3V0ZSBwb2ludHMgdG8gYHVzZXIvMTFgXG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzMzL3VzZXIvMTEvZGV0YWlsc1xuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJ2RldGFpbHMnXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzMzL3VzZXIvMjJcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycuLi8yMiddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vNDQvdXNlci8yMlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy4uLy4uL3RlYW0vNDQvdXNlci8yMiddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICogYGBgXG4gICAqL1xuICBjcmVhdGVVcmxUcmVlKGNvbW1hbmRzOiBhbnlbXSwgbmF2aWdhdGlvbkV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHt9KTogVXJsVHJlZSB7XG4gICAgY29uc3Qge1xuICAgICAgcmVsYXRpdmVUbyxcbiAgICAgIHF1ZXJ5UGFyYW1zLFxuICAgICAgZnJhZ21lbnQsXG4gICAgICBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zLFxuICAgICAgcXVlcnlQYXJhbXNIYW5kbGluZyxcbiAgICAgIHByZXNlcnZlRnJhZ21lbnRcbiAgICB9ID0gbmF2aWdhdGlvbkV4dHJhcztcbiAgICBpZiAoaXNEZXZNb2RlKCkgJiYgcHJlc2VydmVRdWVyeVBhcmFtcyAmJiA8YW55PmNvbnNvbGUgJiYgPGFueT5jb25zb2xlLndhcm4pIHtcbiAgICAgIGNvbnNvbGUud2FybigncHJlc2VydmVRdWVyeVBhcmFtcyBpcyBkZXByZWNhdGVkLCB1c2UgcXVlcnlQYXJhbXNIYW5kbGluZyBpbnN0ZWFkLicpO1xuICAgIH1cbiAgICBjb25zdCBhID0gcmVsYXRpdmVUbyB8fCB0aGlzLnJvdXRlclN0YXRlLnJvb3Q7XG4gICAgY29uc3QgZiA9IHByZXNlcnZlRnJhZ21lbnQgPyB0aGlzLmN1cnJlbnRVcmxUcmVlLmZyYWdtZW50IDogZnJhZ21lbnQ7XG4gICAgbGV0IHE6IFBhcmFtc3xudWxsID0gbnVsbDtcbiAgICBpZiAocXVlcnlQYXJhbXNIYW5kbGluZykge1xuICAgICAgc3dpdGNoIChxdWVyeVBhcmFtc0hhbmRsaW5nKSB7XG4gICAgICAgIGNhc2UgJ21lcmdlJzpcbiAgICAgICAgICBxID0gey4uLnRoaXMuY3VycmVudFVybFRyZWUucXVlcnlQYXJhbXMsIC4uLnF1ZXJ5UGFyYW1zfTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncHJlc2VydmUnOlxuICAgICAgICAgIHEgPSB0aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHEgPSBxdWVyeVBhcmFtcyB8fCBudWxsO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBxID0gcHJlc2VydmVRdWVyeVBhcmFtcyA/IHRoaXMuY3VycmVudFVybFRyZWUucXVlcnlQYXJhbXMgOiBxdWVyeVBhcmFtcyB8fCBudWxsO1xuICAgIH1cbiAgICBpZiAocSAhPT0gbnVsbCkge1xuICAgICAgcSA9IHRoaXMucmVtb3ZlRW1wdHlQcm9wcyhxKTtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZVVybFRyZWUoYSwgdGhpcy5jdXJyZW50VXJsVHJlZSwgY29tbWFuZHMsIHEhLCBmISk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGVzIHRvIGEgdmlldyB1c2luZyBhbiBhYnNvbHV0ZSByb3V0ZSBwYXRoLlxuICAgKlxuICAgKiBAcGFyYW0gdXJsIEFuIGFic29sdXRlIHBhdGggZm9yIGEgZGVmaW5lZCByb3V0ZS4gVGhlIGZ1bmN0aW9uIGRvZXMgbm90IGFwcGx5IGFueSBkZWx0YSB0byB0aGVcbiAgICogICAgIGN1cnJlbnQgVVJMLlxuICAgKiBAcGFyYW0gZXh0cmFzIEFuIG9iamVjdCBjb250YWluaW5nIHByb3BlcnRpZXMgdGhhdCBtb2RpZnkgdGhlIG5hdmlnYXRpb24gc3RyYXRlZ3kuXG4gICAqIFRoZSBmdW5jdGlvbiBpZ25vcmVzIGFueSBwcm9wZXJ0aWVzIGluIHRoZSBgTmF2aWdhdGlvbkV4dHJhc2AgdGhhdCB3b3VsZCBjaGFuZ2UgdGhlXG4gICAqIHByb3ZpZGVkIFVSTC5cbiAgICpcbiAgICogQHJldHVybnMgQSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gJ3RydWUnIHdoZW4gbmF2aWdhdGlvbiBzdWNjZWVkcyxcbiAgICogdG8gJ2ZhbHNlJyB3aGVuIG5hdmlnYXRpb24gZmFpbHMsIG9yIGlzIHJlamVjdGVkIG9uIGVycm9yLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBUaGUgZm9sbG93aW5nIGNhbGxzIHJlcXVlc3QgbmF2aWdhdGlvbiB0byBhbiBhYnNvbHV0ZSBwYXRoLlxuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLm5hdmlnYXRlQnlVcmwoXCIvdGVhbS8zMy91c2VyLzExXCIpO1xuICAgKlxuICAgKiAvLyBOYXZpZ2F0ZSB3aXRob3V0IHVwZGF0aW5nIHRoZSBVUkxcbiAgICogcm91dGVyLm5hdmlnYXRlQnlVcmwoXCIvdGVhbS8zMy91c2VyLzExXCIsIHsgc2tpcExvY2F0aW9uQ2hhbmdlOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKVxuICAgKlxuICAgKi9cbiAgbmF2aWdhdGVCeVVybCh1cmw6IHN0cmluZ3xVcmxUcmVlLCBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7c2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZX0pOlxuICAgICAgUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKGlzRGV2TW9kZSgpICYmIHRoaXMuaXNOZ1pvbmVFbmFibGVkICYmICFOZ1pvbmUuaXNJbkFuZ3VsYXJab25lKCkpIHtcbiAgICAgIHRoaXMuY29uc29sZS53YXJuKFxuICAgICAgICAgIGBOYXZpZ2F0aW9uIHRyaWdnZXJlZCBvdXRzaWRlIEFuZ3VsYXIgem9uZSwgZGlkIHlvdSBmb3JnZXQgdG8gY2FsbCAnbmdab25lLnJ1bigpJz9gKTtcbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gaXNVcmxUcmVlKHVybCkgPyB1cmwgOiB0aGlzLnBhcnNlVXJsKHVybCk7XG4gICAgY29uc3QgbWVyZ2VkVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh1cmxUcmVlLCB0aGlzLnJhd1VybFRyZWUpO1xuXG4gICAgcmV0dXJuIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKG1lcmdlZFRyZWUsICdpbXBlcmF0aXZlJywgbnVsbCwgZXh0cmFzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZSBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgYXJyYXkgb2YgY29tbWFuZHMgYW5kIGEgc3RhcnRpbmcgcG9pbnQuXG4gICAqIElmIG5vIHN0YXJ0aW5nIHJvdXRlIGlzIHByb3ZpZGVkLCB0aGUgbmF2aWdhdGlvbiBpcyBhYnNvbHV0ZS5cbiAgICpcbiAgICogQHBhcmFtIGNvbW1hbmRzIEFuIGFycmF5IG9mIFVSTCBmcmFnbWVudHMgd2l0aCB3aGljaCB0byBjb25zdHJ1Y3QgdGhlIHRhcmdldCBVUkwuXG4gICAqIElmIHRoZSBwYXRoIGlzIHN0YXRpYywgY2FuIGJlIHRoZSBsaXRlcmFsIFVSTCBzdHJpbmcuIEZvciBhIGR5bmFtaWMgcGF0aCwgcGFzcyBhbiBhcnJheSBvZiBwYXRoXG4gICAqIHNlZ21lbnRzLCBmb2xsb3dlZCBieSB0aGUgcGFyYW1ldGVycyBmb3IgZWFjaCBzZWdtZW50LlxuICAgKiBUaGUgZnJhZ21lbnRzIGFyZSBhcHBsaWVkIHRvIHRoZSBjdXJyZW50IFVSTCBvciB0aGUgb25lIHByb3ZpZGVkICBpbiB0aGUgYHJlbGF0aXZlVG9gIHByb3BlcnR5XG4gICAqIG9mIHRoZSBvcHRpb25zIG9iamVjdCwgaWYgc3VwcGxpZWQuXG4gICAqIEBwYXJhbSBleHRyYXMgQW4gb3B0aW9ucyBvYmplY3QgdGhhdCBkZXRlcm1pbmVzIGhvdyB0aGUgVVJMIHNob3VsZCBiZSBjb25zdHJ1Y3RlZCBvclxuICAgKiAgICAgaW50ZXJwcmV0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGB0cnVlYCB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsIHRvIGBmYWxzZWAgd2hlbiBuYXZpZ2F0aW9uXG4gICAqICAgICBmYWlscyxcbiAgICogb3IgaXMgcmVqZWN0ZWQgb24gZXJyb3IuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIFRoZSBmb2xsb3dpbmcgY2FsbHMgcmVxdWVzdCBuYXZpZ2F0aW9uIHRvIGEgZHluYW1pYyByb3V0ZSBwYXRoIHJlbGF0aXZlIHRvIHRoZSBjdXJyZW50IFVSTC5cbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZShbJ3RlYW0nLCAzMywgJ3VzZXInLCAxMV0sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBOYXZpZ2F0ZSB3aXRob3V0IHVwZGF0aW5nIHRoZSBVUkwsIG92ZXJyaWRpbmcgdGhlIGRlZmF1bHQgYmVoYXZpb3JcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlLCBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWV9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRlcilcbiAgICpcbiAgICovXG4gIG5hdmlnYXRlKGNvbW1hbmRzOiBhbnlbXSwgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3NraXBMb2NhdGlvbkNoYW5nZTogZmFsc2V9KTpcbiAgICAgIFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHMpO1xuICAgIHJldHVybiB0aGlzLm5hdmlnYXRlQnlVcmwodGhpcy5jcmVhdGVVcmxUcmVlKGNvbW1hbmRzLCBleHRyYXMpLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqIFNlcmlhbGl6ZXMgYSBgVXJsVHJlZWAgaW50byBhIHN0cmluZyAqL1xuICBzZXJpYWxpemVVcmwodXJsOiBVcmxUcmVlKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICB9XG5cbiAgLyoqIFBhcnNlcyBhIHN0cmluZyBpbnRvIGEgYFVybFRyZWVgICovXG4gIHBhcnNlVXJsKHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gICAgbGV0IHVybFRyZWU6IFVybFRyZWU7XG4gICAgdHJ5IHtcbiAgICAgIHVybFRyZWUgPSB0aGlzLnVybFNlcmlhbGl6ZXIucGFyc2UodXJsKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB1cmxUcmVlID0gdGhpcy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIoZSwgdGhpcy51cmxTZXJpYWxpemVyLCB1cmwpO1xuICAgIH1cbiAgICByZXR1cm4gdXJsVHJlZTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIHdoZXRoZXIgdGhlIHVybCBpcyBhY3RpdmF0ZWQgKi9cbiAgaXNBY3RpdmUodXJsOiBzdHJpbmd8VXJsVHJlZSwgZXhhY3Q6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBpZiAoaXNVcmxUcmVlKHVybCkpIHtcbiAgICAgIHJldHVybiBjb250YWluc1RyZWUodGhpcy5jdXJyZW50VXJsVHJlZSwgdXJsLCBleGFjdCk7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybFRyZWUsIGV4YWN0KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVtb3ZlRW1wdHlQcm9wcyhwYXJhbXM6IFBhcmFtcyk6IFBhcmFtcyB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHBhcmFtcykucmVkdWNlKChyZXN1bHQ6IFBhcmFtcywga2V5OiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlOiBhbnkgPSBwYXJhbXNba2V5XTtcbiAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sIHt9KTtcbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc05hdmlnYXRpb25zKCk6IHZvaWQge1xuICAgIHRoaXMubmF2aWdhdGlvbnMuc3Vic2NyaWJlKFxuICAgICAgICB0ID0+IHtcbiAgICAgICAgICB0aGlzLm5hdmlnYXRlZCA9IHRydWU7XG4gICAgICAgICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bElkID0gdC5pZDtcbiAgICAgICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgICAgIC5uZXh0KG5ldyBOYXZpZ2F0aW9uRW5kKFxuICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCB0aGlzLnNlcmlhbGl6ZVVybCh0aGlzLmN1cnJlbnRVcmxUcmVlKSkpO1xuICAgICAgICAgIHRoaXMubGFzdFN1Y2Nlc3NmdWxOYXZpZ2F0aW9uID0gdGhpcy5jdXJyZW50TmF2aWdhdGlvbjtcbiAgICAgICAgICB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uID0gbnVsbDtcbiAgICAgICAgICB0LnJlc29sdmUodHJ1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGUgPT4ge1xuICAgICAgICAgIHRoaXMuY29uc29sZS53YXJuKGBVbmhhbmRsZWQgTmF2aWdhdGlvbiBFcnJvcjogYCk7XG4gICAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzY2hlZHVsZU5hdmlnYXRpb24oXG4gICAgICByYXdVcmw6IFVybFRyZWUsIHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIsIHJlc3RvcmVkU3RhdGU6IFJlc3RvcmVkU3RhdGV8bnVsbCxcbiAgICAgIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyxcbiAgICAgIHByaW9yUHJvbWlzZT86IHtyZXNvbHZlOiBhbnksIHJlamVjdDogYW55LCBwcm9taXNlOiBQcm9taXNlPGJvb2xlYW4+fSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIC8vICogSW1wZXJhdGl2ZSBuYXZpZ2F0aW9ucyAocm91dGVyLm5hdmlnYXRlKSBtaWdodCB0cmlnZ2VyIGFkZGl0aW9uYWwgbmF2aWdhdGlvbnMgdG8gdGhlIHNhbWVcbiAgICAvLyAgIFVSTCB2aWEgYSBwb3BzdGF0ZSBldmVudCBhbmQgdGhlIGxvY2F0aW9uQ2hhbmdlTGlzdGVuZXIuIFdlIHNob3VsZCBza2lwIHRoZXNlIGR1cGxpY2F0ZVxuICAgIC8vICAgbmF2cy4gRHVwbGljYXRlcyBtYXkgYWxzbyBiZSB0cmlnZ2VyZWQgYnkgYXR0ZW1wdHMgdG8gc3luYyBBbmd1bGFySlMgYW5kIEFuZ3VsYXIgcm91dGVyXG4gICAgLy8gICBzdGF0ZXMuXG4gICAgLy8gKiBJbXBlcmF0aXZlIG5hdmlnYXRpb25zIGNhbiBiZSBjYW5jZWxsZWQgYnkgcm91dGVyIGd1YXJkcywgbWVhbmluZyB0aGUgVVJMIHdvbid0IGNoYW5nZS4gSWZcbiAgICAvLyAgIHRoZSB1c2VyIGZvbGxvd3MgdGhhdCB3aXRoIGEgbmF2aWdhdGlvbiB1c2luZyB0aGUgYmFjay9mb3J3YXJkIGJ1dHRvbiBvciBtYW51YWwgVVJMIGNoYW5nZSxcbiAgICAvLyAgIHRoZSBkZXN0aW5hdGlvbiBtYXkgYmUgdGhlIHNhbWUgYXMgdGhlIHByZXZpb3VzIGltcGVyYXRpdmUgYXR0ZW1wdC4gV2Ugc2hvdWxkIG5vdCBza2lwXG4gICAgLy8gICB0aGVzZSBuYXZpZ2F0aW9ucyBiZWNhdXNlIGl0J3MgYSBzZXBhcmF0ZSBjYXNlIGZyb20gdGhlIG9uZSBhYm92ZSAtLSBpdCdzIG5vdCBhIGR1cGxpY2F0ZVxuICAgIC8vICAgbmF2aWdhdGlvbi5cbiAgICBjb25zdCBsYXN0TmF2aWdhdGlvbiA9IHRoaXMuZ2V0VHJhbnNpdGlvbigpO1xuICAgIC8vIFdlIGRvbid0IHdhbnQgdG8gc2tpcCBkdXBsaWNhdGUgc3VjY2Vzc2Z1bCBuYXZzIGlmIHRoZXkncmUgaW1wZXJhdGl2ZSBiZWNhdXNlXG4gICAgLy8gb25TYW1lVXJsTmF2aWdhdGlvbiBjb3VsZCBiZSAncmVsb2FkJyAoc28gdGhlIGR1cGxpY2F0ZSBpcyBpbnRlbmRlZCkuXG4gICAgY29uc3QgYnJvd3Nlck5hdlByZWNlZGVkQnlSb3V0ZXJOYXYgPVxuICAgICAgICBzb3VyY2UgIT09ICdpbXBlcmF0aXZlJyAmJiBsYXN0TmF2aWdhdGlvbj8uc291cmNlID09PSAnaW1wZXJhdGl2ZSc7XG4gICAgY29uc3QgbGFzdE5hdmlnYXRpb25TdWNjZWVkZWQgPSB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPT09IGxhc3ROYXZpZ2F0aW9uLmlkO1xuICAgIC8vIElmIHRoZSBsYXN0IG5hdmlnYXRpb24gc3VjY2VlZGVkIG9yIGlzIGluIGZsaWdodCwgd2UgY2FuIHVzZSB0aGUgcmF3VXJsIGFzIHRoZSBjb21wYXJpc29uLlxuICAgIC8vIEhvd2V2ZXIsIGlmIGl0IGZhaWxlZCwgd2Ugc2hvdWxkIGNvbXBhcmUgdG8gdGhlIGZpbmFsIHJlc3VsdCAodXJsQWZ0ZXJSZWRpcmVjdHMpLlxuICAgIGNvbnN0IGxhc3ROYXZpZ2F0aW9uVXJsID0gKGxhc3ROYXZpZ2F0aW9uU3VjY2VlZGVkIHx8IHRoaXMuY3VycmVudE5hdmlnYXRpb24pID9cbiAgICAgICAgbGFzdE5hdmlnYXRpb24ucmF3VXJsIDpcbiAgICAgICAgbGFzdE5hdmlnYXRpb24udXJsQWZ0ZXJSZWRpcmVjdHM7XG4gICAgY29uc3QgZHVwbGljYXRlTmF2ID0gbGFzdE5hdmlnYXRpb25VcmwudG9TdHJpbmcoKSA9PT0gcmF3VXJsLnRvU3RyaW5nKCk7XG4gICAgaWYgKGJyb3dzZXJOYXZQcmVjZWRlZEJ5Um91dGVyTmF2ICYmIGR1cGxpY2F0ZU5hdikge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0cnVlKTsgIC8vIHJldHVybiB2YWx1ZSBpcyBub3QgdXNlZFxuICAgIH1cblxuICAgIGxldCByZXNvbHZlOiBhbnk7XG4gICAgbGV0IHJlamVjdDogYW55O1xuICAgIGxldCBwcm9taXNlOiBQcm9taXNlPGJvb2xlYW4+O1xuICAgIGlmIChwcmlvclByb21pc2UpIHtcbiAgICAgIHJlc29sdmUgPSBwcmlvclByb21pc2UucmVzb2x2ZTtcbiAgICAgIHJlamVjdCA9IHByaW9yUHJvbWlzZS5yZWplY3Q7XG4gICAgICBwcm9taXNlID0gcHJpb3JQcm9taXNlLnByb21pc2U7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgcHJvbWlzZSA9IG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXMsIHJlaikgPT4ge1xuICAgICAgICByZXNvbHZlID0gcmVzO1xuICAgICAgICByZWplY3QgPSByZWo7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBpZCA9ICsrdGhpcy5uYXZpZ2F0aW9uSWQ7XG4gICAgdGhpcy5zZXRUcmFuc2l0aW9uKHtcbiAgICAgIGlkLFxuICAgICAgc291cmNlLFxuICAgICAgcmVzdG9yZWRTdGF0ZSxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgY3VycmVudFJhd1VybDogdGhpcy5yYXdVcmxUcmVlLFxuICAgICAgcmF3VXJsLFxuICAgICAgZXh0cmFzLFxuICAgICAgcmVzb2x2ZSxcbiAgICAgIHJlamVjdCxcbiAgICAgIHByb21pc2UsXG4gICAgICBjdXJyZW50U25hcHNob3Q6IHRoaXMucm91dGVyU3RhdGUuc25hcHNob3QsXG4gICAgICBjdXJyZW50Um91dGVyU3RhdGU6IHRoaXMucm91dGVyU3RhdGVcbiAgICB9KTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBlcnJvciBpcyBwcm9wYWdhdGVkIGV2ZW4gdGhvdWdoIGBwcm9jZXNzTmF2aWdhdGlvbnNgIGNhdGNoXG4gICAgLy8gaGFuZGxlciBkb2VzIG5vdCByZXRocm93XG4gICAgcmV0dXJuIHByb21pc2UuY2F0Y2goKGU6IGFueSkgPT4ge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXRCcm93c2VyVXJsKFxuICAgICAgdXJsOiBVcmxUcmVlLCByZXBsYWNlVXJsOiBib29sZWFuLCBpZDogbnVtYmVyLCBzdGF0ZT86IHtba2V5OiBzdHJpbmddOiBhbnl9KSB7XG4gICAgY29uc3QgcGF0aCA9IHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodXJsKTtcbiAgICBzdGF0ZSA9IHN0YXRlIHx8IHt9O1xuICAgIGlmICh0aGlzLmxvY2F0aW9uLmlzQ3VycmVudFBhdGhFcXVhbFRvKHBhdGgpIHx8IHJlcGxhY2VVcmwpIHtcbiAgICAgIC8vIFRPRE8oamFzb25hZGVuKTogUmVtb3ZlIGZpcnN0IGBuYXZpZ2F0aW9uSWRgIGFuZCByZWx5IG9uIGBuZ2AgbmFtZXNwYWNlLlxuICAgICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUocGF0aCwgJycsIHsuLi5zdGF0ZSwgbmF2aWdhdGlvbklkOiBpZH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxvY2F0aW9uLmdvKHBhdGgsICcnLCB7Li4uc3RhdGUsIG5hdmlnYXRpb25JZDogaWR9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlc2V0U3RhdGVBbmRVcmwoc3RvcmVkU3RhdGU6IFJvdXRlclN0YXRlLCBzdG9yZWRVcmw6IFVybFRyZWUsIHJhd1VybDogVXJsVHJlZSk6IHZvaWQge1xuICAgICh0aGlzIGFzIHtyb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGV9KS5yb3V0ZXJTdGF0ZSA9IHN0b3JlZFN0YXRlO1xuICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSBzdG9yZWRVcmw7XG4gICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHRoaXMuY3VycmVudFVybFRyZWUsIHJhd1VybCk7XG4gICAgdGhpcy5yZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk6IHZvaWQge1xuICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKFxuICAgICAgICB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHRoaXMucmF3VXJsVHJlZSksICcnLCB7bmF2aWdhdGlvbklkOiB0aGlzLmxhc3RTdWNjZXNzZnVsSWR9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUNvbW1hbmRzKGNvbW1hbmRzOiBzdHJpbmdbXSk6IHZvaWQge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbW1hbmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY21kID0gY29tbWFuZHNbaV07XG4gICAgaWYgKGNtZCA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSByZXF1ZXN0ZWQgcGF0aCBjb250YWlucyAke2NtZH0gc2VnbWVudCBhdCBpbmRleCAke2l9YCk7XG4gICAgfVxuICB9XG59XG4iXX0=