/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { Compiler, Injectable, Injector, isDevMode, NgModuleFactoryLoader, NgModuleRef, NgZone, Type, ɵConsole as Console } from '@angular/core';
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
                        this.scheduleNavigation(urlTree, source, state, { replaceUrl: true });
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
    /** @docsNotRequired */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBZ0IsTUFBTSxpQkFBaUIsQ0FBQztBQUN4RCxPQUFPLEVBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsSUFBSSxPQUFPLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDL0ksT0FBTyxFQUFDLGVBQWUsRUFBRSxLQUFLLEVBQWMsRUFBRSxFQUFFLE9BQU8sRUFBbUIsTUFBTSxNQUFNLENBQUM7QUFDdkYsT0FBTyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFHakYsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDeEQsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ2hELE9BQU8sRUFBUSxjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQXFCLFVBQVUsRUFBRSxZQUFZLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDN08sT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUMsV0FBVyxFQUFDLE1BQU0sMEJBQTBCLENBQUM7QUFDckQsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQ2hELE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNyRCxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDakQsT0FBTyxFQUFDLHlCQUF5QixFQUFxQixNQUFNLHdCQUF3QixDQUFDO0FBQ3JGLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBQzFELE9BQU8sRUFBQyxzQkFBc0IsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQy9ELE9BQU8sRUFBaUIsZ0JBQWdCLEVBQW1DLE1BQU0sZ0JBQWdCLENBQUM7QUFDbEcsT0FBTyxFQUFDLDBCQUEwQixFQUFFLHdCQUF3QixFQUFTLE1BQU0sVUFBVSxDQUFDO0FBQ3RGLE9BQU8sRUFBQywwQkFBMEIsRUFBc0IsTUFBTSx5QkFBeUIsQ0FBQztBQUN4RixPQUFPLEVBQUMsWUFBWSxFQUFFLGtCQUFrQixFQUFFLGFBQWEsRUFBVSxNQUFNLFlBQVksQ0FBQztBQUNwRixPQUFPLEVBQUMsaUJBQWlCLEVBQUUsY0FBYyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDakUsT0FBTyxFQUFTLGlCQUFpQixFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDaEUsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBa0s5QyxTQUFTLG1CQUFtQixDQUFDLEtBQVU7SUFDckMsTUFBTSxLQUFLLENBQUM7QUFDZCxDQUFDO0FBRUQsU0FBUywrQkFBK0IsQ0FDcEMsS0FBZSxFQUFFLGFBQTRCLEVBQUUsR0FBVztJQUM1RCxPQUFPLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbEMsQ0FBQztBQXVHRDs7R0FFRztBQUNILFNBQVMsaUJBQWlCLENBQUMsUUFBNkIsRUFBRSxTQU16RDtJQUNDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBUSxDQUFDO0FBQ3pCLENBQUM7QUFZRDs7Ozs7Ozs7Ozs7R0FXRztBQUVILE1BQU0sT0FBTyxNQUFNO0lBNEdqQjs7T0FFRztJQUNILHNEQUFzRDtJQUN0RCxZQUNZLGlCQUFpQyxFQUFVLGFBQTRCLEVBQ3ZFLFlBQW9DLEVBQVUsUUFBa0IsRUFBRSxRQUFrQixFQUM1RixNQUE2QixFQUFFLFFBQWtCLEVBQVMsTUFBYztRQUZoRSxzQkFBaUIsR0FBakIsaUJBQWlCLENBQWdCO1FBQVUsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDdkUsaUJBQVksR0FBWixZQUFZLENBQXdCO1FBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBVTtRQUNkLFdBQU0sR0FBTixNQUFNLENBQVE7UUE3R3BFLDZCQUF3QixHQUFvQixJQUFJLENBQUM7UUFDakQsc0JBQWlCLEdBQW9CLElBQUksQ0FBQztRQUdsRDs7O1dBR0c7UUFDSywyQkFBc0IsR0FBNEIsSUFBSSxDQUFDO1FBQ3ZELGlCQUFZLEdBQVcsQ0FBQyxDQUFDO1FBSXpCLG9CQUFlLEdBQVksS0FBSyxDQUFDO1FBRXpDOztXQUVHO1FBQ2EsV0FBTSxHQUFzQixJQUFJLE9BQU8sRUFBUyxDQUFDO1FBTWpFOztXQUVHO1FBQ0gsaUJBQVksR0FBaUIsbUJBQW1CLENBQUM7UUFFakQ7Ozs7O1dBS0c7UUFDSCw2QkFBd0IsR0FFTywrQkFBK0IsQ0FBQztRQUUvRDs7O1dBR0c7UUFDSCxjQUFTLEdBQVksS0FBSyxDQUFDO1FBQ25CLHFCQUFnQixHQUFXLENBQUMsQ0FBQyxDQUFDO1FBRXRDOzs7Ozs7V0FNRztRQUNILFVBQUssR0FHRCxFQUFDLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixFQUFDLENBQUM7UUFFcEY7OztXQUdHO1FBQ0gsd0JBQW1CLEdBQXdCLElBQUksMEJBQTBCLEVBQUUsQ0FBQztRQUU1RTs7V0FFRztRQUNILHVCQUFrQixHQUF1QixJQUFJLHlCQUF5QixFQUFFLENBQUM7UUFFekU7Ozs7V0FJRztRQUNILHdCQUFtQixHQUFzQixRQUFRLENBQUM7UUFFbEQ7Ozs7Ozs7O1dBUUc7UUFDSCw4QkFBeUIsR0FBeUIsV0FBVyxDQUFDO1FBRTlEOzs7Ozs7V0FNRztRQUNILHNCQUFpQixHQUF1QixVQUFVLENBQUM7UUFFbkQ7OztXQUdHO1FBQ0gsMkJBQXNCLEdBQXlCLFFBQVEsQ0FBQztRQVV0RCxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakYsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFRLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTdFLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckMsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwQyxJQUFJLENBQUMsZUFBZSxHQUFHLE1BQU0sWUFBWSxNQUFNLENBQUM7UUFFaEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6QixJQUFJLENBQUMsY0FBYyxHQUFHLGtCQUFrQixFQUFFLENBQUM7UUFDM0MsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUUxQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksa0JBQWtCLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckYsSUFBSSxDQUFDLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBRWpGLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxlQUFlLENBQXVCO1lBQzNELEVBQUUsRUFBRSxDQUFDO1lBQ0wsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjO1lBQ25DLGFBQWEsRUFBRSxJQUFJLENBQUMsY0FBYztZQUNsQyxZQUFZLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDO1lBQ25FLGlCQUFpQixFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQztZQUN4RSxNQUFNLEVBQUUsSUFBSSxDQUFDLGNBQWM7WUFDM0IsTUFBTSxFQUFFLEVBQUU7WUFDVixPQUFPLEVBQUUsSUFBSTtZQUNiLE1BQU0sRUFBRSxJQUFJO1lBQ1osT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQzlCLE1BQU0sRUFBRSxZQUFZO1lBQ3BCLGFBQWEsRUFBRSxJQUFJO1lBQ25CLGVBQWUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVE7WUFDMUMsY0FBYyxFQUFFLElBQUk7WUFDcEIsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFdBQVc7WUFDcEMsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixNQUFNLEVBQUUsRUFBQyxpQkFBaUIsRUFBRSxFQUFFLEVBQUUsbUJBQW1CLEVBQUUsRUFBRSxFQUFDO1lBQ3hELFlBQVksRUFBRSxJQUFJO1NBQ25CLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUUzRCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRU8sZ0JBQWdCLENBQUMsV0FBNkM7UUFFcEUsTUFBTSxhQUFhLEdBQUksSUFBSSxDQUFDLE1BQXlCLENBQUM7UUFDdEQsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUNaLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXZCLGNBQWM7UUFDZCxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FDQSxDQUFDLGdDQUFJLENBQUMsS0FBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQzFDLENBQUEsQ0FBQztRQUUvQiw2RUFBNkU7UUFDN0UsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ1osSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDO1lBQ3RCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztZQUNwQixPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO1lBQ2IsOEJBQThCO1lBQzlCLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDTixJQUFJLENBQUMsaUJBQWlCLEdBQUc7b0JBQ3ZCLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTtvQkFDUixVQUFVLEVBQUUsQ0FBQyxDQUFDLGFBQWE7b0JBQzNCLFlBQVksRUFBRSxDQUFDLENBQUMsWUFBWTtvQkFDNUIsT0FBTyxFQUFFLENBQUMsQ0FBQyxNQUFNO29CQUNqQixNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU07b0JBQ2hCLGtCQUFrQixFQUFFLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLGlDQUMzQyxJQUFJLENBQUMsd0JBQXdCLEtBQUUsa0JBQWtCLEVBQUUsSUFBSSxJQUFFLENBQUM7d0JBQzlELElBQUk7aUJBQ1QsQ0FBQztZQUNKLENBQUMsQ0FBQyxFQUNGLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDWixNQUFNLGFBQWEsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTO29CQUNqQyxDQUFDLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxLQUFLLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2pFLE1BQU0saUJBQWlCLEdBQ25CLENBQUMsSUFBSSxDQUFDLG1CQUFtQixLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUM7b0JBQzlELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBRXhELElBQUksaUJBQWlCLEVBQUU7b0JBQ3JCLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7b0JBQ2IsNkJBQTZCO29CQUM3QixTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUU7d0JBQ1osTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQzt3QkFDL0MsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLGVBQWUsQ0FDbEMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUNqRCxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQzt3QkFDdEIsSUFBSSxVQUFVLEtBQUssSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRTs0QkFDOUMsT0FBTyxLQUFLLENBQUM7eUJBQ2Q7d0JBQ0QsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNiLENBQUMsQ0FBQztvQkFFRixzRUFBc0U7b0JBQ3RFLHFCQUFxQjtvQkFDckIsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFFbEMsaUJBQWlCO29CQUNqQixjQUFjLENBQ1YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsYUFBYSxFQUM3RCxJQUFJLENBQUMsTUFBTSxDQUFDO29CQUVoQiwrQkFBK0I7b0JBQy9CLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTt3QkFDTixJQUFJLENBQUMsaUJBQWlCLG1DQUNqQixJQUFJLENBQUMsaUJBQWtCLEtBQzFCLFFBQVEsRUFBRSxDQUFDLENBQUMsaUJBQWlCLEdBQzlCLENBQUM7b0JBQ0osQ0FBQyxDQUFDO29CQUVGLFlBQVk7b0JBQ1osU0FBUyxDQUNMLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUNuQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMseUJBQXlCLEVBQy9ELElBQUksQ0FBQyxzQkFBc0IsQ0FBQztvQkFFaEMsdUNBQXVDO29CQUN2QyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7d0JBQ04sSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssT0FBTyxFQUFFOzRCQUN0QyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRTtnQ0FDaEMsSUFBSSxDQUFDLGFBQWEsQ0FDZCxDQUFDLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQ2hELENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7NkJBQ3JCOzRCQUNELElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO3lCQUMzQztvQkFDSCxDQUFDLENBQUM7b0JBRUYsd0JBQXdCO29CQUN4QixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7d0JBQ04sTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGdCQUFnQixDQUN6QyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxFQUN2QyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxjQUFlLENBQUMsQ0FBQzt3QkFDL0QsYUFBYSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO29CQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUNUO3FCQUFNO29CQUNMLE1BQU0sa0JBQWtCLEdBQUcsYUFBYSxJQUFJLElBQUksQ0FBQyxVQUFVO3dCQUN2RCxJQUFJLENBQUMsbUJBQW1CLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUMvRDs7b0VBRWdEO29CQUNoRCxJQUFJLGtCQUFrQixFQUFFO3dCQUN0QixNQUFNLEVBQUMsRUFBRSxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBQyxHQUFHLENBQUMsQ0FBQzt3QkFDNUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxlQUFlLENBQ2hDLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxFQUFFLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQzt3QkFDaEUsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQzt3QkFDN0IsTUFBTSxjQUFjLEdBQ2hCLGdCQUFnQixDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxRQUFRLENBQUM7d0JBRXBFLE9BQU8sRUFBRSxpQ0FDSixDQUFDLEtBQ0osY0FBYyxFQUNkLGlCQUFpQixFQUFFLFlBQVksRUFDL0IsTUFBTSxrQ0FBTSxNQUFNLEtBQUUsa0JBQWtCLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxLQUFLLE9BQ2hFLENBQUM7cUJBQ0o7eUJBQU07d0JBQ0w7Ozs7MkJBSUc7d0JBQ0gsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDO3dCQUMzQixJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQzt3QkFDMUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDaEIsT0FBTyxLQUFLLENBQUM7cUJBQ2Q7aUJBQ0Y7WUFDSCxDQUFDLENBQUM7WUFFRix1QkFBdUI7WUFDdkIsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNaLE1BQU0sRUFDSixjQUFjLEVBQ2QsRUFBRSxFQUFFLFlBQVksRUFDaEIsWUFBWSxFQUFFLGNBQWMsRUFDNUIsTUFBTSxFQUFFLFVBQVUsRUFDbEIsTUFBTSxFQUFFLEVBQUMsa0JBQWtCLEVBQUUsVUFBVSxFQUFDLEVBQ3pDLEdBQUcsQ0FBQyxDQUFDO2dCQUNOLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxjQUFlLEVBQUU7b0JBQ3JELFlBQVk7b0JBQ1osY0FBYztvQkFDZCxVQUFVO29CQUNWLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxrQkFBa0I7b0JBQ3hDLFVBQVUsRUFBRSxDQUFDLENBQUMsVUFBVTtpQkFDekIsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDO1lBRUYsaUJBQWlCO1lBQ2pCLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDTixNQUFNLFdBQVcsR0FBRyxJQUFJLGdCQUFnQixDQUNwQyxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxFQUN2QyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxjQUFlLENBQUMsQ0FBQztnQkFDL0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNqQyxDQUFDLENBQUMsRUFFRixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxpQ0FDQSxDQUFDLEtBQ0osTUFBTSxFQUFFLGlCQUFpQixDQUNyQixDQUFDLENBQUMsY0FBZSxFQUFFLENBQUMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUM1RCxDQUFDLEVBRVAsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQzNFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDTixJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEVBQUU7b0JBQzdCLE1BQU0sS0FBSyxHQUEwQix3QkFBd0IsQ0FDekQsbUJBQW1CLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDN0QsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDO29CQUMzQixNQUFNLEtBQUssQ0FBQztpQkFDYjtZQUNILENBQUMsQ0FBQyxFQUVGLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDTixNQUFNLFNBQVMsR0FBRyxJQUFJLGNBQWMsQ0FDaEMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsRUFDdkMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUMsY0FBZSxFQUN6RCxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUN0QixJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQy9CLENBQUMsQ0FBQyxFQUVGLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDVCxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRTtvQkFDbkIsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7b0JBQ2hDLE1BQU0sU0FBUyxHQUNYLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDdEUsYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDOUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDakIsT0FBTyxLQUFLLENBQUM7aUJBQ2Q7Z0JBQ0QsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUM7WUFFRixrQkFBa0I7WUFDbEIsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNaLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUU7b0JBQ3JDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDYixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7d0JBQ04sTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQ2pDLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEVBQ3ZDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDLGNBQWUsQ0FBQyxDQUFDO3dCQUMvRCxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO29CQUNsQyxDQUFDLENBQUMsRUFDRixTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUU7d0JBQ1osSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFDO3dCQUN6QixPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQ2IsV0FBVyxDQUNQLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUMzRCxHQUFHLENBQUM7NEJBQ0YsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLFlBQVksR0FBRyxJQUFJOzRCQUMvQixRQUFRLEVBQUUsR0FBRyxFQUFFO2dDQUNiLElBQUksQ0FBQyxZQUFZLEVBQUU7b0NBQ2pCLE1BQU0sU0FBUyxHQUFHLElBQUksZ0JBQWdCLENBQ2xDLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEVBQ3ZDLG9EQUFvRCxDQUFDLENBQUM7b0NBQzFELGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7b0NBQzlCLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7aUNBQ2xCOzRCQUNILENBQUM7eUJBQ0YsQ0FBQyxDQUNMLENBQUM7b0JBQ0osQ0FBQyxDQUFDLEVBQ0YsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO3dCQUNOLE1BQU0sVUFBVSxHQUFHLElBQUksVUFBVSxDQUM3QixDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxFQUN2QyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxjQUFlLENBQUMsQ0FBQzt3QkFDL0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDVDtnQkFDRCxPQUFPLFNBQVMsQ0FBQztZQUNuQixDQUFDLENBQUM7WUFFRiw4QkFBOEI7WUFDOUIsU0FBUyxDQUFDLENBQUMsQ0FBdUIsRUFBRSxFQUFFO2dCQUNwQyxNQUFNLEVBQ0osY0FBYyxFQUNkLEVBQUUsRUFBRSxZQUFZLEVBQ2hCLFlBQVksRUFBRSxjQUFjLEVBQzVCLE1BQU0sRUFBRSxVQUFVLEVBQ2xCLE1BQU0sRUFBRSxFQUFDLGtCQUFrQixFQUFFLFVBQVUsRUFBQyxFQUN6QyxHQUFHLENBQUMsQ0FBQztnQkFDTixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsY0FBZSxFQUFFO29CQUNwRCxZQUFZO29CQUNaLGNBQWM7b0JBQ2QsVUFBVTtvQkFDVixrQkFBa0IsRUFBRSxDQUFDLENBQUMsa0JBQWtCO29CQUN4QyxVQUFVLEVBQUUsQ0FBQyxDQUFDLFVBQVU7aUJBQ3pCLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxFQUVGLEdBQUcsQ0FBQyxDQUFDLENBQXVCLEVBQUUsRUFBRTtnQkFDOUIsTUFBTSxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FDdkMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxjQUFlLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0JBQ3RFLE9BQU8saUNBQUssQ0FBQyxLQUFFLGlCQUFpQixJQUFFLENBQUM7WUFDckMsQ0FBQyxDQUFDO1lBRUY7Ozs7NkNBSWlDO1lBQ2pDLEdBQUcsQ0FBQyxDQUFDLENBQXVCLEVBQUUsRUFBRTtnQkFDOUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUMsaUJBQWlCLENBQUM7Z0JBQzFDLElBQUksQ0FBQyxVQUFVO29CQUNYLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBRWpFLElBQW1DLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxpQkFBa0IsQ0FBQztnQkFFeEUsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssVUFBVSxFQUFFO29CQUN6QyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRTt3QkFDaEMsSUFBSSxDQUFDLGFBQWEsQ0FDZCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7cUJBQ25FO29CQUNELElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO2lCQUMzQztZQUNILENBQUMsQ0FBQyxFQUVGLGNBQWMsQ0FDVixJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFDMUMsQ0FBQyxHQUFVLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsRUFFM0MsR0FBRyxDQUFDO2dCQUNGLElBQUk7b0JBQ0YsU0FBUyxHQUFHLElBQUksQ0FBQztnQkFDbkIsQ0FBQztnQkFDRCxRQUFRO29CQUNOLFNBQVMsR0FBRyxJQUFJLENBQUM7Z0JBQ25CLENBQUM7YUFDRixDQUFDLEVBQ0YsUUFBUSxDQUFDLEdBQUcsRUFBRTtnQkFDWjs7Ozs7OzRCQU1ZO2dCQUNaLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxPQUFPLEVBQUU7b0JBQzFCLDJFQUEyRTtvQkFDM0Usb0VBQW9FO29CQUNwRSxpREFBaUQ7b0JBQ2pELDBFQUEwRTtvQkFDMUUsMEVBQTBFO29CQUMxRSxxRUFBcUU7b0JBQ3JFLFVBQVU7b0JBQ1YsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7b0JBQ2hDLE1BQU0sU0FBUyxHQUFHLElBQUksZ0JBQWdCLENBQ2xDLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEVBQ3ZDLGlCQUFpQixDQUFDLENBQUMsRUFBRSw4Q0FDakIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7b0JBQzdCLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQzlCLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ2xCO2dCQUNELDJFQUEyRTtnQkFDM0UsNkVBQTZFO2dCQUM3RSxvREFBb0Q7Z0JBQ3BELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7WUFDaEMsQ0FBQyxDQUFDLEVBQ0YsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2YsT0FBTyxHQUFHLElBQUksQ0FBQztnQkFDZjt3REFDd0M7Z0JBQ3hDLElBQUksMEJBQTBCLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQ2pDLE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3JDLElBQUksQ0FBQyxXQUFXLEVBQUU7d0JBQ2hCLHlFQUF5RTt3QkFDekUsb0VBQW9FO3dCQUNwRSxxRUFBcUU7d0JBQ3JFLDhEQUE4RDt3QkFDOUQsZ0VBQWdFO3dCQUNoRSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQzt3QkFDdEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztxQkFDekU7b0JBQ0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxnQkFBZ0IsQ0FDbEMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ3hELGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBRTlCLDhEQUE4RDtvQkFDOUQsaURBQWlEO29CQUNqRCxJQUFJLENBQUMsV0FBVyxFQUFFO3dCQUNoQixDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO3FCQUNsQjt5QkFBTTt3QkFDTCwwREFBMEQ7d0JBQzFELHdEQUF3RDt3QkFDeEQsNERBQTREO3dCQUM1RCxPQUFPO3dCQUNQLFVBQVUsQ0FBQyxHQUFHLEVBQUU7NEJBQ2QsTUFBTSxVQUFVLEdBQ1osSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQzs0QkFDM0QsTUFBTSxNQUFNLEdBQUc7Z0NBQ2Isa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0I7Z0NBQy9DLFVBQVUsRUFBRSxJQUFJLENBQUMsaUJBQWlCLEtBQUssT0FBTzs2QkFDL0MsQ0FBQzs0QkFFRixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FDMUIsVUFBVSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUN0QyxFQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQzt3QkFDbEUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO3FCQUNQO29CQUVEOzhDQUMwQjtpQkFDM0I7cUJBQU07b0JBQ0wsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDeEUsTUFBTSxRQUFRLEdBQ1YsSUFBSSxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDcEUsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDN0IsSUFBSTt3QkFDRixDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDakM7b0JBQUMsT0FBTyxFQUFFLEVBQUU7d0JBQ1gsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDZDtpQkFDRjtnQkFDRCxPQUFPLEtBQUssQ0FBQztZQUNmLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDUixnRUFBZ0U7UUFDbEUsQ0FBQyxDQUFDLENBQTRDLENBQUM7SUFDNUQsQ0FBQztJQUVEOzs7T0FHRztJQUNILHNCQUFzQixDQUFDLGlCQUE0QjtRQUNqRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUM7UUFDM0Msc0VBQXNFO1FBQ3RFLGtEQUFrRDtRQUNsRCxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDO0lBQzNELENBQUM7SUFFTyxhQUFhO1FBQ25CLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO1FBQzFDLDhGQUE4RjtRQUM5RiwwRkFBMEY7UUFDMUYsK0JBQStCO1FBQy9CLFVBQVUsQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDO1FBQ25ELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7SUFFTyxhQUFhLENBQUMsQ0FBZ0M7UUFDcEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLGlDQUFLLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBSyxDQUFDLEVBQUUsQ0FBQztJQUN6RCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxpQkFBaUI7UUFDZixJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztRQUNuQyxJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssQ0FBQyxFQUFFO1lBQzNCLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBQyxVQUFVLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztTQUNsRTtJQUNILENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsMkJBQTJCO1FBQ3pCLHdEQUF3RDtRQUN4RCw2REFBNkQ7UUFDN0Qsa0JBQWtCO1FBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUU7WUFDOUIsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUMxRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsa0NBQWtDLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3JFLElBQUksSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxhQUFhLENBQUMsRUFBRTtvQkFDN0Usa0ZBQWtGO29CQUNsRixlQUFlO29CQUNmLFVBQVUsQ0FBQyxHQUFHLEVBQUU7d0JBQ2QsTUFBTSxFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFDLEdBQUcsYUFBYSxDQUFDO3dCQUMvQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBQyxVQUFVLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztvQkFDdEUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2lCQUNQO2dCQUNELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxhQUFhLENBQUM7WUFDOUMsQ0FBQyxDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7SUFFRCxrRUFBa0U7SUFDMUQsa0NBQWtDLENBQUMsTUFBcUI7O1FBQzlELE9BQU87WUFDTCxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxZQUFZO1lBQ2pFLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUUsQ0FBQztZQUN0QyxtRUFBbUU7WUFDbkUsaURBQWlEO1lBQ2pELEtBQUssRUFBRSxPQUFBLE1BQU0sQ0FBQyxLQUFLLDBDQUFFLFlBQVksRUFBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSTtZQUN2RCxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLEVBQUU7U0FDN0IsQ0FBQztJQUNiLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNLLHdCQUF3QixDQUFDLFFBQWlDLEVBQUUsT0FBMkI7UUFFN0YsSUFBSSxDQUFDLFFBQVE7WUFBRSxPQUFPLElBQUksQ0FBQztRQUUzQixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxLQUFLLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDbkYsTUFBTSx3QkFBd0IsR0FBRyxPQUFPLENBQUMsWUFBWSxLQUFLLFFBQVEsQ0FBQyxZQUFZLENBQUM7UUFDaEYsSUFBSSxDQUFDLHdCQUF3QixJQUFJLENBQUMsZUFBZSxFQUFFO1lBQ2pELE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sS0FBSyxZQUFZLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxVQUFVLENBQUM7WUFDbkUsQ0FBQyxPQUFPLENBQUMsTUFBTSxLQUFLLFVBQVUsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLFlBQVksQ0FBQyxFQUFFO1lBQ3ZFLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCx1QkFBdUI7SUFDdkIsSUFBSSxHQUFHO1FBQ0wsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRUQsa0RBQWtEO0lBQ2xELG9CQUFvQjtRQUNsQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztJQUNoQyxDQUFDO0lBRUQsZ0JBQWdCO0lBQ2hCLFlBQVksQ0FBQyxLQUFZO1FBQ3RCLElBQUksQ0FBQyxNQUF5QixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7OztPQWVHO0lBQ0gsV0FBVyxDQUFDLE1BQWM7UUFDeEIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsdUJBQXVCO0lBQ3ZCLFdBQVc7UUFDVCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQztJQUVELDhCQUE4QjtJQUM5QixPQUFPO1FBQ0wsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUU7WUFDN0IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxTQUFTLENBQUM7U0FDdkM7SUFDSCxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQTZDRztJQUNILGFBQWEsQ0FBQyxRQUFlLEVBQUUsbUJBQXFDLEVBQUU7UUFDcEUsTUFBTSxFQUNKLFVBQVUsRUFDVixXQUFXLEVBQ1gsUUFBUSxFQUNSLG1CQUFtQixFQUNuQixtQkFBbUIsRUFDbkIsZ0JBQWdCLEVBQ2pCLEdBQUcsZ0JBQWdCLENBQUM7UUFDckIsSUFBSSxTQUFTLEVBQUUsSUFBSSxtQkFBbUIsSUFBUyxPQUFPLElBQVMsT0FBTyxDQUFDLElBQUksRUFBRTtZQUMzRSxPQUFPLENBQUMsSUFBSSxDQUFDLHFFQUFxRSxDQUFDLENBQUM7U0FDckY7UUFDRCxNQUFNLENBQUMsR0FBRyxVQUFVLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7UUFDOUMsTUFBTSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDckUsSUFBSSxDQUFDLEdBQWdCLElBQUksQ0FBQztRQUMxQixJQUFJLG1CQUFtQixFQUFFO1lBQ3ZCLFFBQVEsbUJBQW1CLEVBQUU7Z0JBQzNCLEtBQUssT0FBTztvQkFDVixDQUFDLG1DQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxHQUFLLFdBQVcsQ0FBQyxDQUFDO29CQUN6RCxNQUFNO2dCQUNSLEtBQUssVUFBVTtvQkFDYixDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUM7b0JBQ3BDLE1BQU07Z0JBQ1I7b0JBQ0UsQ0FBQyxHQUFHLFdBQVcsSUFBSSxJQUFJLENBQUM7YUFDM0I7U0FDRjthQUFNO1lBQ0wsQ0FBQyxHQUFHLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQztTQUNqRjtRQUNELElBQUksQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNkLENBQUMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDOUI7UUFDRCxPQUFPLGFBQWEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxRQUFRLEVBQUUsQ0FBRSxFQUFFLENBQUUsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQXlCRztJQUNILGFBQWEsQ0FBQyxHQUFtQixFQUFFLFNBQTJCLEVBQUMsa0JBQWtCLEVBQUUsS0FBSyxFQUFDO1FBRXZGLElBQUksU0FBUyxFQUFFLElBQUksSUFBSSxDQUFDLGVBQWUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsRUFBRTtZQUNwRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDYixtRkFBbUYsQ0FBQyxDQUFDO1NBQzFGO1FBRUQsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRTVFLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0E2Qkc7SUFDSCxRQUFRLENBQUMsUUFBZSxFQUFFLFNBQTJCLEVBQUMsa0JBQWtCLEVBQUUsS0FBSyxFQUFDO1FBRTlFLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzNCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRUQsMkNBQTJDO0lBQzNDLFlBQVksQ0FBQyxHQUFZO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVELHVDQUF1QztJQUN2QyxRQUFRLENBQUMsR0FBVztRQUNsQixJQUFJLE9BQWdCLENBQUM7UUFDckIsSUFBSTtZQUNGLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN6QztRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsT0FBTyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUNyRTtRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7SUFFRCwyQ0FBMkM7SUFDM0MsUUFBUSxDQUFDLEdBQW1CLEVBQUUsS0FBYztRQUMxQyxJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNsQixPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUN0RDtRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkMsT0FBTyxZQUFZLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUVPLGdCQUFnQixDQUFDLE1BQWM7UUFDckMsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQWMsRUFBRSxHQUFXLEVBQUUsRUFBRTtZQUNoRSxNQUFNLEtBQUssR0FBUSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0IsSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7Z0JBQ3pDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7YUFDckI7WUFDRCxPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDVCxDQUFDO0lBRU8sa0JBQWtCO1FBQ3hCLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUN0QixDQUFDLENBQUMsRUFBRTtZQUNGLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxNQUF5QjtpQkFDMUIsSUFBSSxDQUFDLElBQUksYUFBYSxDQUNuQixDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxRixJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDO1lBQ3ZELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7WUFDOUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQixDQUFDLEVBQ0QsQ0FBQyxDQUFDLEVBQUU7WUFDRixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBQ3BELENBQUMsQ0FBQyxDQUFDO0lBQ1QsQ0FBQztJQUVPLGtCQUFrQixDQUN0QixNQUFlLEVBQUUsTUFBeUIsRUFBRSxhQUFpQyxFQUM3RSxNQUF3QixFQUN4QixZQUFxRTtRQUN2RSw4RkFBOEY7UUFDOUYsNEZBQTRGO1FBQzVGLDRGQUE0RjtRQUM1RixZQUFZO1FBQ1osK0ZBQStGO1FBQy9GLGdHQUFnRztRQUNoRywyRkFBMkY7UUFDM0YsOEZBQThGO1FBQzlGLGdCQUFnQjtRQUNoQixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDNUMsZ0ZBQWdGO1FBQ2hGLHdFQUF3RTtRQUN4RSxNQUFNLDZCQUE2QixHQUMvQixNQUFNLEtBQUssWUFBWSxJQUFJLENBQUEsY0FBYyxhQUFkLGNBQWMsdUJBQWQsY0FBYyxDQUFFLE1BQU0sTUFBSyxZQUFZLENBQUM7UUFDdkUsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEtBQUssY0FBYyxDQUFDLEVBQUUsQ0FBQztRQUM1RSw2RkFBNkY7UUFDN0Ysb0ZBQW9GO1FBQ3BGLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyx1QkFBdUIsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1lBQzNFLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN2QixjQUFjLENBQUMsaUJBQWlCLENBQUM7UUFDckMsTUFBTSxZQUFZLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxFQUFFLEtBQUssTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3hFLElBQUksNkJBQTZCLElBQUksWUFBWSxFQUFFO1lBQ2pELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFFLDJCQUEyQjtTQUMzRDtRQUVELElBQUksT0FBWSxDQUFDO1FBQ2pCLElBQUksTUFBVyxDQUFDO1FBQ2hCLElBQUksT0FBeUIsQ0FBQztRQUM5QixJQUFJLFlBQVksRUFBRTtZQUNoQixPQUFPLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQztZQUMvQixNQUFNLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQztZQUM3QixPQUFPLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQztTQUVoQzthQUFNO1lBQ0wsT0FBTyxHQUFHLElBQUksT0FBTyxDQUFVLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO2dCQUMxQyxPQUFPLEdBQUcsR0FBRyxDQUFDO2dCQUNkLE1BQU0sR0FBRyxHQUFHLENBQUM7WUFDZixDQUFDLENBQUMsQ0FBQztTQUNKO1FBRUQsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQy9CLElBQUksQ0FBQyxhQUFhLENBQUM7WUFDakIsRUFBRTtZQUNGLE1BQU07WUFDTixhQUFhO1lBQ2IsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjO1lBQ25DLGFBQWEsRUFBRSxJQUFJLENBQUMsVUFBVTtZQUM5QixNQUFNO1lBQ04sTUFBTTtZQUNOLE9BQU87WUFDUCxNQUFNO1lBQ04sT0FBTztZQUNQLGVBQWUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVE7WUFDMUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFdBQVc7U0FDckMsQ0FBQyxDQUFDO1FBRUgsZ0ZBQWdGO1FBQ2hGLDJCQUEyQjtRQUMzQixPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRTtZQUM5QixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sYUFBYSxDQUNqQixHQUFZLEVBQUUsVUFBbUIsRUFBRSxFQUFVLEVBQUUsS0FBNEI7UUFDN0UsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0MsS0FBSyxHQUFHLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDcEIsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsRUFBRTtZQUMxRCwyRUFBMkU7WUFDM0UsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsa0NBQU0sS0FBSyxLQUFFLFlBQVksRUFBRSxFQUFFLElBQUUsQ0FBQztTQUNwRTthQUFNO1lBQ0wsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsa0NBQU0sS0FBSyxLQUFFLFlBQVksRUFBRSxFQUFFLElBQUUsQ0FBQztTQUMxRDtJQUNILENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxXQUF3QixFQUFFLFNBQWtCLEVBQUUsTUFBZTtRQUNuRixJQUFtQyxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxTQUFTLENBQUM7UUFDaEMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDOUUsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVPLHdCQUF3QjtRQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FDdEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUMsQ0FBQyxDQUFDO0lBQ2hHLENBQUM7OztZQWg5QkYsVUFBVTs7O1lBMVVvRixJQUFJO1lBb0J6RCxhQUFhO1lBSi9DLHNCQUFzQjtZQWpCdEIsUUFBUTtZQUNjLFFBQVE7WUFBYSxxQkFBcUI7WUFBaEUsUUFBUTs7O0FBNnhDaEIsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFrQjtJQUMxQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUN4QyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsR0FBRyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUM3RTtLQUNGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9uLCBQb3BTdGF0ZUV2ZW50fSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtDb21waWxlciwgSW5qZWN0YWJsZSwgSW5qZWN0b3IsIGlzRGV2TW9kZSwgTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBOZ01vZHVsZVJlZiwgTmdab25lLCBUeXBlLCDJtUNvbnNvbGUgYXMgQ29uc29sZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0JlaGF2aW9yU3ViamVjdCwgRU1QVFksIE9ic2VydmFibGUsIG9mLCBTdWJqZWN0LCBTdWJzY3JpcHRpb25MaWtlfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y2F0Y2hFcnJvciwgZmlsdGVyLCBmaW5hbGl6ZSwgbWFwLCBzd2l0Y2hNYXAsIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge1F1ZXJ5UGFyYW1zSGFuZGxpbmcsIFJvdXRlLCBSb3V0ZXN9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7Y3JlYXRlUm91dGVyU3RhdGV9IGZyb20gJy4vY3JlYXRlX3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge2NyZWF0ZVVybFRyZWV9IGZyb20gJy4vY3JlYXRlX3VybF90cmVlJztcbmltcG9ydCB7RXZlbnQsIEd1YXJkc0NoZWNrRW5kLCBHdWFyZHNDaGVja1N0YXJ0LCBOYXZpZ2F0aW9uQ2FuY2VsLCBOYXZpZ2F0aW9uRW5kLCBOYXZpZ2F0aW9uRXJyb3IsIE5hdmlnYXRpb25TdGFydCwgTmF2aWdhdGlvblRyaWdnZXIsIFJlc29sdmVFbmQsIFJlc29sdmVTdGFydCwgUm91dGVDb25maWdMb2FkRW5kLCBSb3V0ZUNvbmZpZ0xvYWRTdGFydCwgUm91dGVzUmVjb2duaXplZH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHthY3RpdmF0ZVJvdXRlc30gZnJvbSAnLi9vcGVyYXRvcnMvYWN0aXZhdGVfcm91dGVzJztcbmltcG9ydCB7YXBwbHlSZWRpcmVjdHN9IGZyb20gJy4vb3BlcmF0b3JzL2FwcGx5X3JlZGlyZWN0cyc7XG5pbXBvcnQge2NoZWNrR3VhcmRzfSBmcm9tICcuL29wZXJhdG9ycy9jaGVja19ndWFyZHMnO1xuaW1wb3J0IHtyZWNvZ25pemV9IGZyb20gJy4vb3BlcmF0b3JzL3JlY29nbml6ZSc7XG5pbXBvcnQge3Jlc29sdmVEYXRhfSBmcm9tICcuL29wZXJhdG9ycy9yZXNvbHZlX2RhdGEnO1xuaW1wb3J0IHtzd2l0Y2hUYXB9IGZyb20gJy4vb3BlcmF0b3JzL3N3aXRjaF90YXAnO1xuaW1wb3J0IHtEZWZhdWx0Um91dGVSZXVzZVN0cmF0ZWd5LCBSb3V0ZVJldXNlU3RyYXRlZ3l9IGZyb20gJy4vcm91dGVfcmV1c2Vfc3RyYXRlZ3knO1xuaW1wb3J0IHtSb3V0ZXJDb25maWdMb2FkZXJ9IGZyb20gJy4vcm91dGVyX2NvbmZpZ19sb2FkZXInO1xuaW1wb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzfSBmcm9tICcuL3JvdXRlcl9vdXRsZXRfY29udGV4dCc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlLCBjcmVhdGVFbXB0eVN0YXRlLCBSb3V0ZXJTdGF0ZSwgUm91dGVyU3RhdGVTbmFwc2hvdH0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtpc05hdmlnYXRpb25DYW5jZWxpbmdFcnJvciwgbmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yLCBQYXJhbXN9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7RGVmYXVsdFVybEhhbmRsaW5nU3RyYXRlZ3ksIFVybEhhbmRsaW5nU3RyYXRlZ3l9IGZyb20gJy4vdXJsX2hhbmRsaW5nX3N0cmF0ZWd5JztcbmltcG9ydCB7Y29udGFpbnNUcmVlLCBjcmVhdGVFbXB0eVVybFRyZWUsIFVybFNlcmlhbGl6ZXIsIFVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtzdGFuZGFyZGl6ZUNvbmZpZywgdmFsaWRhdGVDb25maWd9IGZyb20gJy4vdXRpbHMvY29uZmlnJztcbmltcG9ydCB7Q2hlY2tzLCBnZXRBbGxSb3V0ZUd1YXJkc30gZnJvbSAnLi91dGlscy9wcmVhY3RpdmF0aW9uJztcbmltcG9ydCB7aXNVcmxUcmVlfSBmcm9tICcuL3V0aWxzL3R5cGVfZ3VhcmRzJztcblxuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogT3B0aW9ucyB0aGF0IG1vZGlmeSB0aGUgYFJvdXRlcmAgbmF2aWdhdGlvbiBzdHJhdGVneS5cbiAqIFN1cHBseSBhbiBvYmplY3QgY29udGFpbmluZyBhbnkgb2YgdGhlc2UgcHJvcGVydGllcyB0byBhIGBSb3V0ZXJgIG5hdmlnYXRpb24gZnVuY3Rpb24gdG9cbiAqIGNvbnRyb2wgaG93IHRoZSB0YXJnZXQgVVJMIHNob3VsZCBiZSBjb25zdHJ1Y3RlZCBvciBpbnRlcnByZXRlZC5cbiAqXG4gKiBAc2VlIFtSb3V0ZXIubmF2aWdhdGUoKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI25hdmlnYXRlKVxuICogQHNlZSBbUm91dGVyLm5hdmlnYXRlQnlVcmwoKSBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI25hdmlnYXRlYnl1cmwpXG4gKiBAc2VlIFtSb3V0ZXIuY3JlYXRlVXJsVHJlZSgpIG1ldGhvZF0oYXBpL3JvdXRlci9Sb3V0ZXIjY3JlYXRldXJsdHJlZSlcbiAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRlcilcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmF2aWdhdGlvbkV4dHJhcyB7XG4gIC8qKlxuICAgKiBTcGVjaWZpZXMgYSByb290IFVSSSB0byB1c2UgZm9yIHJlbGF0aXZlIG5hdmlnYXRpb24uXG4gICAqXG4gICAqIEZvciBleGFtcGxlLCBjb25zaWRlciB0aGUgZm9sbG93aW5nIHJvdXRlIGNvbmZpZ3VyYXRpb24gd2hlcmUgdGhlIHBhcmVudCByb3V0ZVxuICAgKiBoYXMgdHdvIGNoaWxkcmVuLlxuICAgKlxuICAgKiBgYGBcbiAgICogW3tcbiAgICogICBwYXRoOiAncGFyZW50JyxcbiAgICogICBjb21wb25lbnQ6IFBhcmVudENvbXBvbmVudCxcbiAgICogICBjaGlsZHJlbjogW3tcbiAgICogICAgIHBhdGg6ICdsaXN0JyxcbiAgICogICAgIGNvbXBvbmVudDogTGlzdENvbXBvbmVudFxuICAgKiAgIH0se1xuICAgKiAgICAgcGF0aDogJ2NoaWxkJyxcbiAgICogICAgIGNvbXBvbmVudDogQ2hpbGRDb21wb25lbnRcbiAgICogICB9XVxuICAgKiB9XVxuICAgKiBgYGBcbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBgZ28oKWAgZnVuY3Rpb24gbmF2aWdhdGVzIHRvIHRoZSBgbGlzdGAgcm91dGUgYnlcbiAgICogaW50ZXJwcmV0aW5nIHRoZSBkZXN0aW5hdGlvbiBVUkkgYXMgcmVsYXRpdmUgdG8gdGhlIGFjdGl2YXRlZCBgY2hpbGRgICByb3V0ZVxuICAgKlxuICAgKiBgYGBcbiAgICogIEBDb21wb25lbnQoey4uLn0pXG4gICAqICBjbGFzcyBDaGlsZENvbXBvbmVudCB7XG4gICAqICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsIHByaXZhdGUgcm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7fVxuICAgKlxuICAgKiAgICBnbygpIHtcbiAgICogICAgICB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy4uL2xpc3QnXSwgeyByZWxhdGl2ZVRvOiB0aGlzLnJvdXRlIH0pO1xuICAgKiAgICB9XG4gICAqICB9XG4gICAqIGBgYFxuICAgKi9cbiAgcmVsYXRpdmVUbz86IEFjdGl2YXRlZFJvdXRlfG51bGw7XG5cbiAgLyoqXG4gICAqIFNldHMgcXVlcnkgcGFyYW1ldGVycyB0byB0aGUgVVJMLlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgdG8gL3Jlc3VsdHM/cGFnZT0xXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3Jlc3VsdHMnXSwgeyBxdWVyeVBhcmFtczogeyBwYWdlOiAxIH0gfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcXVlcnlQYXJhbXM/OiBQYXJhbXN8bnVsbDtcblxuICAvKipcbiAgICogU2V0cyB0aGUgaGFzaCBmcmFnbWVudCBmb3IgdGhlIFVSTC5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHRvIC9yZXN1bHRzI3RvcFxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy9yZXN1bHRzJ10sIHsgZnJhZ21lbnQ6ICd0b3AnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGZyYWdtZW50Pzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiAqKkRFUFJFQ0FURUQqKjogVXNlIGBxdWVyeVBhcmFtc0hhbmRsaW5nOiBcInByZXNlcnZlXCJgIGluc3RlYWQgdG8gcHJlc2VydmVcbiAgICogcXVlcnkgcGFyYW1ldGVycyBmb3IgdGhlIG5leHQgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgc2luY2UgdjRcbiAgICovXG4gIHByZXNlcnZlUXVlcnlQYXJhbXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gaGFuZGxlIHF1ZXJ5IHBhcmFtZXRlcnMgaW4gdGhlIHJvdXRlciBsaW5rIGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uLlxuICAgKiBPbmUgb2Y6XG4gICAqICogYHByZXNlcnZlYCA6IFByZXNlcnZlIGN1cnJlbnQgcGFyYW1ldGVycy5cbiAgICogKiBgbWVyZ2VgIDogTWVyZ2UgbmV3IHdpdGggY3VycmVudCBwYXJhbWV0ZXJzLlxuICAgKlxuICAgKiBUaGUgXCJwcmVzZXJ2ZVwiIG9wdGlvbiBkaXNjYXJkcyBhbnkgbmV3IHF1ZXJ5IHBhcmFtczpcbiAgICogYGBgXG4gICAqIC8vIGZyb20gL3ZpZXcxP3BhZ2U9MSB0by92aWV3Mj9wYWdlPTFcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldzInXSwgeyBxdWVyeVBhcmFtczogeyBwYWdlOiAyIH0sICBxdWVyeVBhcmFtc0hhbmRsaW5nOiBcInByZXNlcnZlXCJcbiAgICogfSk7XG4gICAqIGBgYFxuICAgKiBUaGUgXCJtZXJnZVwiIG9wdGlvbiBhcHBlbmRzIG5ldyBxdWVyeSBwYXJhbXMgdG8gdGhlIHBhcmFtcyBmcm9tIHRoZSBjdXJyZW50IFVSTDpcbiAgICogYGBgXG4gICAqIC8vIGZyb20gL3ZpZXcxP3BhZ2U9MSB0by92aWV3Mj9wYWdlPTEmb3RoZXJLZXk9MlxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3MiddLCB7IHF1ZXJ5UGFyYW1zOiB7IG90aGVyS2V5OiAyIH0sICBxdWVyeVBhcmFtc0hhbmRsaW5nOiBcIm1lcmdlXCJcbiAgICogfSk7XG4gICAqIGBgYFxuICAgKiBJbiBjYXNlIG9mIGEga2V5IGNvbGxpc2lvbiBiZXR3ZWVuIGN1cnJlbnQgcGFyYW1ldGVycyBhbmQgdGhvc2UgaW4gdGhlIGBxdWVyeVBhcmFtc2Agb2JqZWN0LFxuICAgKiB0aGUgbmV3IHZhbHVlIGlzIHVzZWQuXG4gICAqXG4gICAqL1xuICBxdWVyeVBhcmFtc0hhbmRsaW5nPzogUXVlcnlQYXJhbXNIYW5kbGluZ3xudWxsO1xuICAvKipcbiAgICogV2hlbiB0cnVlLCBwcmVzZXJ2ZXMgdGhlIFVSTCBmcmFnbWVudCBmb3IgdGhlIG5leHQgbmF2aWdhdGlvblxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gUHJlc2VydmUgZnJhZ21lbnQgZnJvbSAvcmVzdWx0cyN0b3AgdG8gL3ZpZXcjdG9wXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBwcmVzZXJ2ZUZyYWdtZW50OiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHByZXNlcnZlRnJhZ21lbnQ/OiBib29sZWFuO1xuICAvKipcbiAgICogV2hlbiB0cnVlLCBuYXZpZ2F0ZXMgd2l0aG91dCBwdXNoaW5nIGEgbmV3IHN0YXRlIGludG8gaGlzdG9yeS5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHNpbGVudGx5IHRvIC92aWV3XG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgc2tpcExvY2F0aW9uQ2hhbmdlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFdoZW4gdHJ1ZSwgbmF2aWdhdGVzIHdoaWxlIHJlcGxhY2luZyB0aGUgY3VycmVudCBzdGF0ZSBpbiBoaXN0b3J5LlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgdG8gL3ZpZXdcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHJlcGxhY2VVcmw6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcmVwbGFjZVVybD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBEZXZlbG9wZXItZGVmaW5lZCBzdGF0ZSB0aGF0IGNhbiBiZSBwYXNzZWQgdG8gYW55IG5hdmlnYXRpb24uXG4gICAqIEFjY2VzcyB0aGlzIHZhbHVlIHRocm91Z2ggdGhlIGBOYXZpZ2F0aW9uLmV4dHJhc2Agb2JqZWN0XG4gICAqIHJldHVybmVkIGZyb20gdGhlIFtSb3V0ZXIuZ2V0Q3VycmVudE5hdmlnYXRpb24oKVxuICAgKiBtZXRob2RdKGFwaS9yb3V0ZXIvUm91dGVyI2dldGN1cnJlbnRuYXZpZ2F0aW9uKSB3aGlsZSBhIG5hdmlnYXRpb24gaXMgZXhlY3V0aW5nLlxuICAgKlxuICAgKiBBZnRlciBhIG5hdmlnYXRpb24gY29tcGxldGVzLCB0aGUgcm91dGVyIHdyaXRlcyBhbiBvYmplY3QgY29udGFpbmluZyB0aGlzXG4gICAqIHZhbHVlIHRvZ2V0aGVyIHdpdGggYSBgbmF2aWdhdGlvbklkYCB0byBgaGlzdG9yeS5zdGF0ZWAuXG4gICAqIFRoZSB2YWx1ZSBpcyB3cml0dGVuIHdoZW4gYGxvY2F0aW9uLmdvKClgIG9yIGBsb2NhdGlvbi5yZXBsYWNlU3RhdGUoKWBcbiAgICogaXMgY2FsbGVkIGJlZm9yZSBhY3RpdmF0aW5nIHRoaXMgcm91dGUuXG4gICAqXG4gICAqIE5vdGUgdGhhdCBgaGlzdG9yeS5zdGF0ZWAgZG9lcyBub3QgcGFzcyBhbiBvYmplY3QgZXF1YWxpdHkgdGVzdCBiZWNhdXNlXG4gICAqIHRoZSByb3V0ZXIgYWRkcyB0aGUgYG5hdmlnYXRpb25JZGAgb24gZWFjaCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKi9cbiAgc3RhdGU/OiB7W2s6IHN0cmluZ106IGFueX07XG59XG5cbi8qKlxuICogRXJyb3IgaGFuZGxlciB0aGF0IGlzIGludm9rZWQgd2hlbiBhIG5hdmlnYXRpb24gZXJyb3Igb2NjdXJzLlxuICpcbiAqIElmIHRoZSBoYW5kbGVyIHJldHVybnMgYSB2YWx1ZSwgdGhlIG5hdmlnYXRpb24gUHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIHRoaXMgdmFsdWUuXG4gKiBJZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLCB0aGUgbmF2aWdhdGlvbiBQcm9taXNlIGlzIHJlamVjdGVkIHdpdGhcbiAqIHRoZSBleGNlcHRpb24uXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBFcnJvckhhbmRsZXIgPSAoZXJyb3I6IGFueSkgPT4gYW55O1xuXG5mdW5jdGlvbiBkZWZhdWx0RXJyb3JIYW5kbGVyKGVycm9yOiBhbnkpOiBhbnkge1xuICB0aHJvdyBlcnJvcjtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdE1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcihcbiAgICBlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gIHJldHVybiB1cmxTZXJpYWxpemVyLnBhcnNlKCcvJyk7XG59XG5cbmV4cG9ydCB0eXBlIFJlc3RvcmVkU3RhdGUgPSB7XG4gIFtrOiBzdHJpbmddOiBhbnk7IG5hdmlnYXRpb25JZDogbnVtYmVyO1xufTtcblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCBhIG5hdmlnYXRpb24gb3BlcmF0aW9uLlxuICogUmV0cmlldmUgdGhlIG1vc3QgcmVjZW50IG5hdmlnYXRpb24gb2JqZWN0IHdpdGggdGhlXG4gKiBbUm91dGVyLmdldEN1cnJlbnROYXZpZ2F0aW9uKCkgbWV0aG9kXShhcGkvcm91dGVyL1JvdXRlciNnZXRjdXJyZW50bmF2aWdhdGlvbikgLlxuICpcbiAqICogKmlkKiA6IFRoZSB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY3VycmVudCBuYXZpZ2F0aW9uLlxuICogKiAqaW5pdGlhbFVybCogOiBUaGUgdGFyZ2V0IFVSTCBwYXNzZWQgaW50byB0aGUgYFJvdXRlciNuYXZpZ2F0ZUJ5VXJsKClgIGNhbGwgYmVmb3JlIG5hdmlnYXRpb24uXG4gKiBUaGlzIGlzIHRoZSB2YWx1ZSBiZWZvcmUgdGhlIHJvdXRlciBoYXMgcGFyc2VkIG9yIGFwcGxpZWQgcmVkaXJlY3RzIHRvIGl0LlxuICogKiAqZXh0cmFjdGVkVXJsKiA6IFRoZSBpbml0aWFsIHRhcmdldCBVUkwgYWZ0ZXIgYmVpbmcgcGFyc2VkIHdpdGggYFVybFNlcmlhbGl6ZXIuZXh0cmFjdCgpYC5cbiAqICogKmZpbmFsVXJsKiA6IFRoZSBleHRyYWN0ZWQgVVJMIGFmdGVyIHJlZGlyZWN0cyBoYXZlIGJlZW4gYXBwbGllZC5cbiAqIFRoaXMgVVJMIG1heSBub3QgYmUgYXZhaWxhYmxlIGltbWVkaWF0ZWx5LCB0aGVyZWZvcmUgdGhpcyBwcm9wZXJ0eSBjYW4gYmUgYHVuZGVmaW5lZGAuXG4gKiBJdCBpcyBndWFyYW50ZWVkIHRvIGJlIHNldCBhZnRlciB0aGUgYFJvdXRlc1JlY29nbml6ZWRgIGV2ZW50IGZpcmVzLlxuICogKiAqdHJpZ2dlciogOiBJZGVudGlmaWVzIGhvdyB0aGlzIG5hdmlnYXRpb24gd2FzIHRyaWdnZXJlZC5cbiAqIC0tICdpbXBlcmF0aXZlJy0tVHJpZ2dlcmVkIGJ5IGByb3V0ZXIubmF2aWdhdGVCeVVybGAgb3IgYHJvdXRlci5uYXZpZ2F0ZWAuXG4gKiAtLSAncG9wc3RhdGUnLS1UcmlnZ2VyZWQgYnkgYSBwb3BzdGF0ZSBldmVudC5cbiAqIC0tICdoYXNoY2hhbmdlJy0tVHJpZ2dlcmVkIGJ5IGEgaGFzaGNoYW5nZSBldmVudC5cbiAqICogKmV4dHJhcyogOiBBIGBOYXZpZ2F0aW9uRXh0cmFzYCBvcHRpb25zIG9iamVjdCB0aGF0IGNvbnRyb2xsZWQgdGhlIHN0cmF0ZWd5IHVzZWQgZm9yIHRoaXNcbiAqIG5hdmlnYXRpb24uXG4gKiAqICpwcmV2aW91c05hdmlnYXRpb24qIDogVGhlIHByZXZpb3VzbHkgc3VjY2Vzc2Z1bCBgTmF2aWdhdGlvbmAgb2JqZWN0LiBPbmx5IG9uZSBwcmV2aW91c1xuICogbmF2aWdhdGlvbiBpcyBhdmFpbGFibGUsIHRoZXJlZm9yZSB0aGlzIHByZXZpb3VzIGBOYXZpZ2F0aW9uYCBvYmplY3QgaGFzIGEgYG51bGxgIHZhbHVlIGZvciBpdHNcbiAqIG93biBgcHJldmlvdXNOYXZpZ2F0aW9uYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIE5hdmlnYXRpb24gPSB7XG4gIC8qKlxuICAgKiBUaGUgdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGN1cnJlbnQgbmF2aWdhdGlvbi5cbiAgICovXG4gIGlkOiBudW1iZXI7XG4gIC8qKlxuICAgKiBUaGUgdGFyZ2V0IFVSTCBwYXNzZWQgaW50byB0aGUgYFJvdXRlciNuYXZpZ2F0ZUJ5VXJsKClgIGNhbGwgYmVmb3JlIG5hdmlnYXRpb24uIFRoaXMgaXNcbiAgICogdGhlIHZhbHVlIGJlZm9yZSB0aGUgcm91dGVyIGhhcyBwYXJzZWQgb3IgYXBwbGllZCByZWRpcmVjdHMgdG8gaXQuXG4gICAqL1xuICBpbml0aWFsVXJsOiBzdHJpbmcgfCBVcmxUcmVlO1xuICAvKipcbiAgICogVGhlIGluaXRpYWwgdGFyZ2V0IFVSTCBhZnRlciBiZWluZyBwYXJzZWQgd2l0aCBgVXJsU2VyaWFsaXplci5leHRyYWN0KClgLlxuICAgKi9cbiAgZXh0cmFjdGVkVXJsOiBVcmxUcmVlO1xuICAvKipcbiAgICogVGhlIGV4dHJhY3RlZCBVUkwgYWZ0ZXIgcmVkaXJlY3RzIGhhdmUgYmVlbiBhcHBsaWVkLlxuICAgKiBUaGlzIFVSTCBtYXkgbm90IGJlIGF2YWlsYWJsZSBpbW1lZGlhdGVseSwgdGhlcmVmb3JlIHRoaXMgcHJvcGVydHkgY2FuIGJlIGB1bmRlZmluZWRgLlxuICAgKiBJdCBpcyBndWFyYW50ZWVkIHRvIGJlIHNldCBhZnRlciB0aGUgYFJvdXRlc1JlY29nbml6ZWRgIGV2ZW50IGZpcmVzLlxuICAgKi9cbiAgZmluYWxVcmw/OiBVcmxUcmVlO1xuICAvKipcbiAgICogSWRlbnRpZmllcyBob3cgdGhpcyBuYXZpZ2F0aW9uIHdhcyB0cmlnZ2VyZWQuXG4gICAqXG4gICAqICogJ2ltcGVyYXRpdmUnLS1UcmlnZ2VyZWQgYnkgYHJvdXRlci5uYXZpZ2F0ZUJ5VXJsYCBvciBgcm91dGVyLm5hdmlnYXRlYC5cbiAgICogKiAncG9wc3RhdGUnLS1UcmlnZ2VyZWQgYnkgYSBwb3BzdGF0ZSBldmVudC5cbiAgICogKiAnaGFzaGNoYW5nZSctLVRyaWdnZXJlZCBieSBhIGhhc2hjaGFuZ2UgZXZlbnQuXG4gICAqL1xuICB0cmlnZ2VyOiAnaW1wZXJhdGl2ZScgfCAncG9wc3RhdGUnIHwgJ2hhc2hjaGFuZ2UnO1xuICAvKipcbiAgICogT3B0aW9ucyB0aGF0IGNvbnRyb2xsZWQgdGhlIHN0cmF0ZWd5IHVzZWQgZm9yIHRoaXMgbmF2aWdhdGlvbi5cbiAgICogU2VlIGBOYXZpZ2F0aW9uRXh0cmFzYC5cbiAgICovXG4gIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcztcbiAgLyoqXG4gICAqIFRoZSBwcmV2aW91c2x5IHN1Y2Nlc3NmdWwgYE5hdmlnYXRpb25gIG9iamVjdC4gT25seSBvbmUgcHJldmlvdXMgbmF2aWdhdGlvblxuICAgKiBpcyBhdmFpbGFibGUsIHRoZXJlZm9yZSB0aGlzIHByZXZpb3VzIGBOYXZpZ2F0aW9uYCBvYmplY3QgaGFzIGEgYG51bGxgIHZhbHVlXG4gICAqIGZvciBpdHMgb3duIGBwcmV2aW91c05hdmlnYXRpb25gLlxuICAgKi9cbiAgcHJldmlvdXNOYXZpZ2F0aW9uOiBOYXZpZ2F0aW9uIHwgbnVsbDtcbn07XG5cbmV4cG9ydCB0eXBlIE5hdmlnYXRpb25UcmFuc2l0aW9uID0ge1xuICBpZDogbnVtYmVyLFxuICBjdXJyZW50VXJsVHJlZTogVXJsVHJlZSxcbiAgY3VycmVudFJhd1VybDogVXJsVHJlZSxcbiAgZXh0cmFjdGVkVXJsOiBVcmxUcmVlLFxuICB1cmxBZnRlclJlZGlyZWN0czogVXJsVHJlZSxcbiAgcmF3VXJsOiBVcmxUcmVlLFxuICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMsXG4gIHJlc29sdmU6IGFueSxcbiAgcmVqZWN0OiBhbnksXG4gIHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj4sXG4gIHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIsXG4gIHJlc3RvcmVkU3RhdGU6IFJlc3RvcmVkU3RhdGV8bnVsbCxcbiAgY3VycmVudFNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxuICB0YXJnZXRTbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdHxudWxsLFxuICBjdXJyZW50Um91dGVyU3RhdGU6IFJvdXRlclN0YXRlLFxuICB0YXJnZXRSb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGV8bnVsbCxcbiAgZ3VhcmRzOiBDaGVja3MsXG4gIGd1YXJkc1Jlc3VsdDogYm9vbGVhbnxVcmxUcmVlfG51bGwsXG59O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgdHlwZSBSb3V0ZXJIb29rID0gKHNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90LCBydW5FeHRyYXM6IHtcbiAgYXBwbGllZFVybFRyZWU6IFVybFRyZWUsXG4gIHJhd1VybFRyZWU6IFVybFRyZWUsXG4gIHNraXBMb2NhdGlvbkNoYW5nZTogYm9vbGVhbixcbiAgcmVwbGFjZVVybDogYm9vbGVhbixcbiAgbmF2aWdhdGlvbklkOiBudW1iZXJcbn0pID0+IE9ic2VydmFibGU8dm9pZD47XG5cbi8qKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGRlZmF1bHRSb3V0ZXJIb29rKHNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90LCBydW5FeHRyYXM6IHtcbiAgYXBwbGllZFVybFRyZWU6IFVybFRyZWUsXG4gIHJhd1VybFRyZWU6IFVybFRyZWUsXG4gIHNraXBMb2NhdGlvbkNoYW5nZTogYm9vbGVhbixcbiAgcmVwbGFjZVVybDogYm9vbGVhbixcbiAgbmF2aWdhdGlvbklkOiBudW1iZXJcbn0pOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgcmV0dXJuIG9mKG51bGwpIGFzIGFueTtcbn1cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiByZWxhdGVkIHRvIGEgbG9jYXRpb24gY2hhbmdlLCBuZWNlc3NhcnkgZm9yIHNjaGVkdWxpbmcgZm9sbG93LXVwIFJvdXRlciBuYXZpZ2F0aW9ucy5cbiAqL1xudHlwZSBMb2NhdGlvbkNoYW5nZUluZm8gPSB7XG4gIHNvdXJjZTogJ3BvcHN0YXRlJ3wnaGFzaGNoYW5nZScsXG4gIHVybFRyZWU6IFVybFRyZWUsXG4gIHN0YXRlOiBSZXN0b3JlZFN0YXRlfG51bGwsXG4gIHRyYW5zaXRpb25JZDogbnVtYmVyXG59O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEEgc2VydmljZSB0aGF0IHByb3ZpZGVzIG5hdmlnYXRpb24gYW1vbmcgdmlld3MgYW5kIFVSTCBtYW5pcHVsYXRpb24gY2FwYWJpbGl0aWVzLlxuICpcbiAqIEBzZWUgYFJvdXRlYC5cbiAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gR3VpZGVdKGd1aWRlL3JvdXRlcikuXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIFJvdXRlciB7XG4gIHByaXZhdGUgY3VycmVudFVybFRyZWU6IFVybFRyZWU7XG4gIHByaXZhdGUgcmF3VXJsVHJlZTogVXJsVHJlZTtcbiAgcHJpdmF0ZSBicm93c2VyVXJsVHJlZTogVXJsVHJlZTtcbiAgcHJpdmF0ZSByZWFkb25seSB0cmFuc2l0aW9uczogQmVoYXZpb3JTdWJqZWN0PE5hdmlnYXRpb25UcmFuc2l0aW9uPjtcbiAgcHJpdmF0ZSBuYXZpZ2F0aW9uczogT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj47XG4gIHByaXZhdGUgbGFzdFN1Y2Nlc3NmdWxOYXZpZ2F0aW9uOiBOYXZpZ2F0aW9ufG51bGwgPSBudWxsO1xuICBwcml2YXRlIGN1cnJlbnROYXZpZ2F0aW9uOiBOYXZpZ2F0aW9ufG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgbG9jYXRpb25TdWJzY3JpcHRpb24/OiBTdWJzY3JpcHRpb25MaWtlO1xuICAvKipcbiAgICogVHJhY2tzIHRoZSBwcmV2aW91c2x5IHNlZW4gbG9jYXRpb24gY2hhbmdlIGZyb20gdGhlIGxvY2F0aW9uIHN1YnNjcmlwdGlvbiBzbyB3ZSBjYW4gY29tcGFyZVxuICAgKiB0aGUgdHdvIGxhdGVzdCB0byBzZWUgaWYgdGhleSBhcmUgZHVwbGljYXRlcy4gU2VlIHNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lci5cbiAgICovXG4gIHByaXZhdGUgbGFzdExvY2F0aW9uQ2hhbmdlSW5mbzogTG9jYXRpb25DaGFuZ2VJbmZvfG51bGwgPSBudWxsO1xuICBwcml2YXRlIG5hdmlnYXRpb25JZDogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBjb25maWdMb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcjtcbiAgcHJpdmF0ZSBuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55PjtcbiAgcHJpdmF0ZSBjb25zb2xlOiBDb25zb2xlO1xuICBwcml2YXRlIGlzTmdab25lRW5hYmxlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBBbiBldmVudCBzdHJlYW0gZm9yIHJvdXRpbmcgZXZlbnRzIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgZXZlbnRzOiBPYnNlcnZhYmxlPEV2ZW50PiA9IG5ldyBTdWJqZWN0PEV2ZW50PigpO1xuICAvKipcbiAgICogVGhlIGN1cnJlbnQgc3RhdGUgb2Ygcm91dGluZyBpbiB0aGlzIE5nTW9kdWxlLlxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHJvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZTtcblxuICAvKipcbiAgICogQSBoYW5kbGVyIGZvciBuYXZpZ2F0aW9uIGVycm9ycyBpbiB0aGlzIE5nTW9kdWxlLlxuICAgKi9cbiAgZXJyb3JIYW5kbGVyOiBFcnJvckhhbmRsZXIgPSBkZWZhdWx0RXJyb3JIYW5kbGVyO1xuXG4gIC8qKlxuICAgKiBBIGhhbmRsZXIgZm9yIGVycm9ycyB0aHJvd24gYnkgYFJvdXRlci5wYXJzZVVybCh1cmwpYFxuICAgKiB3aGVuIGB1cmxgIGNvbnRhaW5zIGFuIGludmFsaWQgY2hhcmFjdGVyLlxuICAgKiBUaGUgbW9zdCBjb21tb24gY2FzZSBpcyBhIGAlYCBzaWduXG4gICAqIHRoYXQncyBub3QgZW5jb2RlZCBhbmQgaXMgbm90IHBhcnQgb2YgYSBwZXJjZW50IGVuY29kZWQgc2VxdWVuY2UuXG4gICAqL1xuICBtYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI6XG4gICAgICAoZXJyb3I6IFVSSUVycm9yLCB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgICAgIHVybDogc3RyaW5nKSA9PiBVcmxUcmVlID0gZGVmYXVsdE1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcjtcblxuICAvKipcbiAgICogVHJ1ZSBpZiBhdCBsZWFzdCBvbmUgbmF2aWdhdGlvbiBldmVudCBoYXMgb2NjdXJyZWQsXG4gICAqIGZhbHNlIG90aGVyd2lzZS5cbiAgICovXG4gIG5hdmlnYXRlZDogYm9vbGVhbiA9IGZhbHNlO1xuICBwcml2YXRlIGxhc3RTdWNjZXNzZnVsSWQ6IG51bWJlciA9IC0xO1xuXG4gIC8qKlxuICAgKiBIb29rcyB0aGF0IGVuYWJsZSB5b3UgdG8gcGF1c2UgbmF2aWdhdGlvbixcbiAgICogZWl0aGVyIGJlZm9yZSBvciBhZnRlciB0aGUgcHJlYWN0aXZhdGlvbiBwaGFzZS5cbiAgICogVXNlZCBieSBgUm91dGVyTW9kdWxlYC5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuICBob29rczoge1xuICAgIGJlZm9yZVByZWFjdGl2YXRpb246IFJvdXRlckhvb2ssXG4gICAgYWZ0ZXJQcmVhY3RpdmF0aW9uOiBSb3V0ZXJIb29rXG4gIH0gPSB7YmVmb3JlUHJlYWN0aXZhdGlvbjogZGVmYXVsdFJvdXRlckhvb2ssIGFmdGVyUHJlYWN0aXZhdGlvbjogZGVmYXVsdFJvdXRlckhvb2t9O1xuXG4gIC8qKlxuICAgKiBBIHN0cmF0ZWd5IGZvciBleHRyYWN0aW5nIGFuZCBtZXJnaW5nIFVSTHMuXG4gICAqIFVzZWQgZm9yIEFuZ3VsYXJKUyB0byBBbmd1bGFyIG1pZ3JhdGlvbnMuXG4gICAqL1xuICB1cmxIYW5kbGluZ1N0cmF0ZWd5OiBVcmxIYW5kbGluZ1N0cmF0ZWd5ID0gbmV3IERlZmF1bHRVcmxIYW5kbGluZ1N0cmF0ZWd5KCk7XG5cbiAgLyoqXG4gICAqIEEgc3RyYXRlZ3kgZm9yIHJlLXVzaW5nIHJvdXRlcy5cbiAgICovXG4gIHJvdXRlUmV1c2VTdHJhdGVneTogUm91dGVSZXVzZVN0cmF0ZWd5ID0gbmV3IERlZmF1bHRSb3V0ZVJldXNlU3RyYXRlZ3koKTtcblxuICAvKipcbiAgICogSG93IHRvIGhhbmRsZSBhIG5hdmlnYXRpb24gcmVxdWVzdCB0byB0aGUgY3VycmVudCBVUkwuIE9uZSBvZjpcbiAgICogLSBgJ2lnbm9yZSdgIDogIFRoZSByb3V0ZXIgaWdub3JlcyB0aGUgcmVxdWVzdC5cbiAgICogLSBgJ3JlbG9hZCdgIDogVGhlIHJvdXRlciByZWxvYWRzIHRoZSBVUkwuIFVzZSB0byBpbXBsZW1lbnQgYSBcInJlZnJlc2hcIiBmZWF0dXJlLlxuICAgKi9cbiAgb25TYW1lVXJsTmF2aWdhdGlvbjogJ3JlbG9hZCd8J2lnbm9yZScgPSAnaWdub3JlJztcblxuICAvKipcbiAgICogSG93IHRvIG1lcmdlIHBhcmFtZXRlcnMsIGRhdGEsIGFuZCByZXNvbHZlZCBkYXRhIGZyb20gcGFyZW50IHRvIGNoaWxkXG4gICAqIHJvdXRlcy4gT25lIG9mOlxuICAgKlxuICAgKiAtIGAnZW1wdHlPbmx5J2AgOiBJbmhlcml0IHBhcmVudCBwYXJhbWV0ZXJzLCBkYXRhLCBhbmQgcmVzb2x2ZWQgZGF0YVxuICAgKiBmb3IgcGF0aC1sZXNzIG9yIGNvbXBvbmVudC1sZXNzIHJvdXRlcy5cbiAgICogLSBgJ2Fsd2F5cydgIDogSW5oZXJpdCBwYXJlbnQgcGFyYW1ldGVycywgZGF0YSwgYW5kIHJlc29sdmVkIGRhdGFcbiAgICogZm9yIGFsbCBjaGlsZCByb3V0ZXMuXG4gICAqL1xuICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiAnZW1wdHlPbmx5J3wnYWx3YXlzJyA9ICdlbXB0eU9ubHknO1xuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZW4gdGhlIHJvdXRlciB1cGRhdGVzIHRoZSBicm93c2VyIFVSTC5cbiAgICogQnkgZGVmYXVsdCAoYFwiZGVmZXJyZWRcImApLCB1cGRhdGVzIHRoZSBicm93c2VyIFVSTCBhZnRlciBuYXZpZ2F0aW9uIGhhcyBmaW5pc2hlZC5cbiAgICogU2V0IHRvIGAnZWFnZXInYCB0byB1cGRhdGUgdGhlIGJyb3dzZXIgVVJMIGF0IHRoZSBiZWdpbm5pbmcgb2YgbmF2aWdhdGlvbi5cbiAgICogWW91IGNhbiBjaG9vc2UgdG8gdXBkYXRlIGVhcmx5IHNvIHRoYXQsIGlmIG5hdmlnYXRpb24gZmFpbHMsXG4gICAqIHlvdSBjYW4gc2hvdyBhbiBlcnJvciBtZXNzYWdlIHdpdGggdGhlIFVSTCB0aGF0IGZhaWxlZC5cbiAgICovXG4gIHVybFVwZGF0ZVN0cmF0ZWd5OiAnZGVmZXJyZWQnfCdlYWdlcicgPSAnZGVmZXJyZWQnO1xuXG4gIC8qKlxuICAgKiBFbmFibGVzIGEgYnVnIGZpeCB0aGF0IGNvcnJlY3RzIHJlbGF0aXZlIGxpbmsgcmVzb2x1dGlvbiBpbiBjb21wb25lbnRzIHdpdGggZW1wdHkgcGF0aHMuXG4gICAqIEBzZWUgYFJvdXRlck1vZHVsZWBcbiAgICovXG4gIHJlbGF0aXZlTGlua1Jlc29sdXRpb246ICdsZWdhY3knfCdjb3JyZWN0ZWQnID0gJ2xlZ2FjeSc7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgdGhlIHJvdXRlciBzZXJ2aWNlLlxuICAgKi9cbiAgLy8gVE9ETzogdnNhdmtpbiBtYWtlIGludGVybmFsIGFmdGVyIHRoZSBmaW5hbCBpcyBvdXQuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+fG51bGwsIHByaXZhdGUgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICAgIHByaXZhdGUgcm9vdENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLCBwcml2YXRlIGxvY2F0aW9uOiBMb2NhdGlvbiwgaW5qZWN0b3I6IEluamVjdG9yLFxuICAgICAgbG9hZGVyOiBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIGNvbXBpbGVyOiBDb21waWxlciwgcHVibGljIGNvbmZpZzogUm91dGVzKSB7XG4gICAgY29uc3Qgb25Mb2FkU3RhcnQgPSAocjogUm91dGUpID0+IHRoaXMudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRTdGFydChyKSk7XG4gICAgY29uc3Qgb25Mb2FkRW5kID0gKHI6IFJvdXRlKSA9PiB0aGlzLnRyaWdnZXJFdmVudChuZXcgUm91dGVDb25maWdMb2FkRW5kKHIpKTtcblxuICAgIHRoaXMubmdNb2R1bGUgPSBpbmplY3Rvci5nZXQoTmdNb2R1bGVSZWYpO1xuICAgIHRoaXMuY29uc29sZSA9IGluamVjdG9yLmdldChDb25zb2xlKTtcbiAgICBjb25zdCBuZ1pvbmUgPSBpbmplY3Rvci5nZXQoTmdab25lKTtcbiAgICB0aGlzLmlzTmdab25lRW5hYmxlZCA9IG5nWm9uZSBpbnN0YW5jZW9mIE5nWm9uZTtcblxuICAgIHRoaXMucmVzZXRDb25maWcoY29uZmlnKTtcbiAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gY3JlYXRlRW1wdHlVcmxUcmVlKCk7XG4gICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy5jdXJyZW50VXJsVHJlZTtcbiAgICB0aGlzLmJyb3dzZXJVcmxUcmVlID0gdGhpcy5jdXJyZW50VXJsVHJlZTtcblxuICAgIHRoaXMuY29uZmlnTG9hZGVyID0gbmV3IFJvdXRlckNvbmZpZ0xvYWRlcihsb2FkZXIsIGNvbXBpbGVyLCBvbkxvYWRTdGFydCwgb25Mb2FkRW5kKTtcbiAgICB0aGlzLnJvdXRlclN0YXRlID0gY3JlYXRlRW1wdHlTdGF0ZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB0aGlzLnJvb3RDb21wb25lbnRUeXBlKTtcblxuICAgIHRoaXMudHJhbnNpdGlvbnMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PE5hdmlnYXRpb25UcmFuc2l0aW9uPih7XG4gICAgICBpZDogMCxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgY3VycmVudFJhd1VybDogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIGV4dHJhY3RlZFVybDogdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QodGhpcy5jdXJyZW50VXJsVHJlZSksXG4gICAgICB1cmxBZnRlclJlZGlyZWN0czogdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QodGhpcy5jdXJyZW50VXJsVHJlZSksXG4gICAgICByYXdVcmw6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBleHRyYXM6IHt9LFxuICAgICAgcmVzb2x2ZTogbnVsbCxcbiAgICAgIHJlamVjdDogbnVsbCxcbiAgICAgIHByb21pc2U6IFByb21pc2UucmVzb2x2ZSh0cnVlKSxcbiAgICAgIHNvdXJjZTogJ2ltcGVyYXRpdmUnLFxuICAgICAgcmVzdG9yZWRTdGF0ZTogbnVsbCxcbiAgICAgIGN1cnJlbnRTbmFwc2hvdDogdGhpcy5yb3V0ZXJTdGF0ZS5zbmFwc2hvdCxcbiAgICAgIHRhcmdldFNuYXBzaG90OiBudWxsLFxuICAgICAgY3VycmVudFJvdXRlclN0YXRlOiB0aGlzLnJvdXRlclN0YXRlLFxuICAgICAgdGFyZ2V0Um91dGVyU3RhdGU6IG51bGwsXG4gICAgICBndWFyZHM6IHtjYW5BY3RpdmF0ZUNoZWNrczogW10sIGNhbkRlYWN0aXZhdGVDaGVja3M6IFtdfSxcbiAgICAgIGd1YXJkc1Jlc3VsdDogbnVsbCxcbiAgICB9KTtcbiAgICB0aGlzLm5hdmlnYXRpb25zID0gdGhpcy5zZXR1cE5hdmlnYXRpb25zKHRoaXMudHJhbnNpdGlvbnMpO1xuXG4gICAgdGhpcy5wcm9jZXNzTmF2aWdhdGlvbnMoKTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0dXBOYXZpZ2F0aW9ucyh0cmFuc2l0aW9uczogT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4pOlxuICAgICAgT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4ge1xuICAgIGNvbnN0IGV2ZW50c1N1YmplY3QgPSAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pO1xuICAgIHJldHVybiB0cmFuc2l0aW9ucy5waXBlKFxuICAgICAgICAgICAgICAgZmlsdGVyKHQgPT4gdC5pZCAhPT0gMCksXG5cbiAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgVVJMXG4gICAgICAgICAgICAgICBtYXAodCA9PlxuICAgICAgICAgICAgICAgICAgICAgICAoey4uLnQsIGV4dHJhY3RlZFVybDogdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3QodC5yYXdVcmwpfSBhc1xuICAgICAgICAgICAgICAgICAgICAgICAgTmF2aWdhdGlvblRyYW5zaXRpb24pKSxcblxuICAgICAgICAgICAgICAgLy8gVXNpbmcgc3dpdGNoTWFwIHNvIHdlIGNhbmNlbCBleGVjdXRpbmcgbmF2aWdhdGlvbnMgd2hlbiBhIG5ldyBvbmUgY29tZXMgaW5cbiAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgbGV0IGNvbXBsZXRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICBsZXQgZXJyb3JlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICByZXR1cm4gb2YodCkucGlwZShcbiAgICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBOYXZpZ2F0aW9uIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiB0LmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRpYWxVcmw6IHQuY3VycmVudFJhd1VybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYWN0ZWRVcmw6IHQuZXh0cmFjdGVkVXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHRyaWdnZXI6IHQuc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhczogdC5leHRyYXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNOYXZpZ2F0aW9uOiB0aGlzLmxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbiA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsuLi50aGlzLmxhc3RTdWNjZXNzZnVsTmF2aWdhdGlvbiwgcHJldmlvdXNOYXZpZ2F0aW9uOiBudWxsfSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGxcbiAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgc3dpdGNoTWFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmxUcmFuc2l0aW9uID0gIXRoaXMubmF2aWdhdGVkIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LmV4dHJhY3RlZFVybC50b1N0cmluZygpICE9PSB0aGlzLmJyb3dzZXJVcmxUcmVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NDdXJyZW50VXJsID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLm9uU2FtZVVybE5hdmlnYXRpb24gPT09ICdyZWxvYWQnID8gdHJ1ZSA6IHVybFRyYW5zaXRpb24pICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybCh0LnJhd1VybCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb2Nlc3NDdXJyZW50VXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpcmUgTmF2aWdhdGlvblN0YXJ0IGV2ZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gdGhpcy50cmFuc2l0aW9ucy5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuZXcgTmF2aWdhdGlvblN0YXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIHQuc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlc3RvcmVkU3RhdGUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHJhbnNpdGlvbiAhPT0gdGhpcy50cmFuc2l0aW9ucy5nZXRWYWx1ZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbdF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgZGVsYXkgaXMgcmVxdWlyZWQgdG8gbWF0Y2ggb2xkIGJlaGF2aW9yIHRoYXQgZm9yY2VkIG5hdmlnYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdG8gYWx3YXlzIGJlIGFzeW5jXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IFByb21pc2UucmVzb2x2ZSh0KSksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXBwbHlSZWRpcmVjdHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwbHlSZWRpcmVjdHMoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5nTW9kdWxlLmluamVjdG9yLCB0aGlzLmNvbmZpZ0xvYWRlciwgdGhpcy51cmxTZXJpYWxpemVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcpLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY3VycmVudE5hdmlnYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudE5hdmlnYXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi50aGlzLmN1cnJlbnROYXZpZ2F0aW9uISxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsVXJsOiB0LnVybEFmdGVyUmVkaXJlY3RzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVjb2duaXplXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY29nbml6ZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9vdENvbXBvbmVudFR5cGUsIHRoaXMuY29uZmlnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHVybCkgPT4gdGhpcy5zZXJpYWxpemVVcmwodXJsKSwgdGhpcy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWxhdGl2ZUxpbmtSZXNvbHV0aW9uKSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGlmIGluIGBlYWdlcmAgdXBkYXRlIG1vZGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZWFnZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXQuZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEJyb3dzZXJVcmwoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LnVybEFmdGVyUmVkaXJlY3RzLCAhIXQuZXh0cmFzLnJlcGxhY2VVcmwsIHQuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmV4dHJhcy5zdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJyb3dzZXJVcmxUcmVlID0gdC51cmxBZnRlclJlZGlyZWN0cztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpcmUgUm91dGVzUmVjb2duaXplZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm91dGVzUmVjb2duaXplZCA9IG5ldyBSb3V0ZXNSZWNvZ25pemVkKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ISk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KHJvdXRlc1JlY29nbml6ZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc1ByZXZpb3VzVXJsID0gdXJsVHJhbnNpdGlvbiAmJiB0aGlzLnJhd1VybFRyZWUgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LnNob3VsZFByb2Nlc3NVcmwodGhpcy5yYXdVcmxUcmVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAvKiBXaGVuIHRoZSBjdXJyZW50IFVSTCBzaG91bGRuJ3QgYmUgcHJvY2Vzc2VkLCBidXQgdGhlIHByZXZpb3VzIG9uZSB3YXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICogd2UgaGFuZGxlIHRoaXMgXCJlcnJvciBjb25kaXRpb25cIiBieSBuYXZpZ2F0aW5nIHRvIHRoZSBwcmV2aW91c2x5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICogc3VjY2Vzc2Z1bCBVUkwsIGJ1dCBsZWF2aW5nIHRoZSBVUkwgaW50YWN0LiovXG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb2Nlc3NQcmV2aW91c1VybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qge2lkLCBleHRyYWN0ZWRVcmwsIHNvdXJjZSwgcmVzdG9yZWRTdGF0ZSwgZXh0cmFzfSA9IHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuYXZTdGFydCA9IG5ldyBOYXZpZ2F0aW9uU3RhcnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQsIHRoaXMuc2VyaWFsaXplVXJsKGV4dHJhY3RlZFVybCksIHNvdXJjZSwgcmVzdG9yZWRTdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2U3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0U25hcHNob3QgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZUVtcHR5U3RhdGUoZXh0cmFjdGVkVXJsLCB0aGlzLnJvb3RDb21wb25lbnRUeXBlKS5zbmFwc2hvdDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4udCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0U25hcHNob3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybEFmdGVyUmVkaXJlY3RzOiBleHRyYWN0ZWRVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhczogey4uLmV4dHJhcywgc2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZSwgcmVwbGFjZVVybDogZmFsc2V9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIFdoZW4gbmVpdGhlciB0aGUgY3VycmVudCBvciBwcmV2aW91cyBVUkwgY2FuIGJlIHByb2Nlc3NlZCwgZG8gbm90aGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICogb3RoZXIgdGhhbiB1cGRhdGUgcm91dGVyJ3MgaW50ZXJuYWwgcmVmZXJlbmNlIHRvIHRoZSBjdXJyZW50IFwic2V0dGxlZFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBVUkwuIFRoaXMgd2F5IHRoZSBuZXh0IG5hdmlnYXRpb24gd2lsbCBiZSBjb21pbmcgZnJvbSB0aGUgY3VycmVudCBVUkxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIGluIHRoZSBicm93c2VyLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJhd1VybFRyZWUgPSB0LnJhd1VybDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0LnVybEFmdGVyUmVkaXJlY3RzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIEJlZm9yZSBQcmVhY3RpdmF0aW9uXG4gICAgICAgICAgICAgICAgICAgICBzd2l0Y2hUYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRTbmFwc2hvdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBpZDogbmF2aWdhdGlvbklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZFVybDogYXBwbGllZFVybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmF3VXJsOiByYXdVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhczoge3NraXBMb2NhdGlvbkNoYW5nZSwgcmVwbGFjZVVybH1cbiAgICAgICAgICAgICAgICAgICAgICAgfSA9IHQ7XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhvb2tzLmJlZm9yZVByZWFjdGl2YXRpb24odGFyZ2V0U25hcHNob3QhLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdGlvbklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFwcGxpZWRVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHJhd1VybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiAhIXNraXBMb2NhdGlvbkNoYW5nZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlVXJsOiAhIXJlcGxhY2VVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIC0tLSBHVUFSRFMgLS0tXG4gICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGd1YXJkc1N0YXJ0ID0gbmV3IEd1YXJkc0NoZWNrU3RhcnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzKSwgdC50YXJnZXRTbmFwc2hvdCEpO1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChndWFyZHNTdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgbWFwKHQgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBndWFyZHM6IGdldEFsbFJvdXRlR3VhcmRzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQudGFyZ2V0U25hcHNob3QhLCB0LmN1cnJlbnRTbmFwc2hvdCwgdGhpcy5yb290Q29udGV4dHMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgfSkpLFxuXG4gICAgICAgICAgICAgICAgICAgICBjaGVja0d1YXJkcyh0aGlzLm5nTW9kdWxlLmluamVjdG9yLCAoZXZ0OiBFdmVudCkgPT4gdGhpcy50cmlnZ2VyRXZlbnQoZXZ0KSksXG4gICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGlmIChpc1VybFRyZWUodC5ndWFyZHNSZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3I6IEVycm9yJnt1cmw/OiBVcmxUcmVlfSA9IG5hdmlnYXRpb25DYW5jZWxpbmdFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYFJlZGlyZWN0aW5nIHRvIFwiJHt0aGlzLnNlcmlhbGl6ZVVybCh0Lmd1YXJkc1Jlc3VsdCl9XCJgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvci51cmwgPSB0Lmd1YXJkc1Jlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZ3VhcmRzRW5kID0gbmV3IEd1YXJkc0NoZWNrRW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVVcmwodC51cmxBZnRlclJlZGlyZWN0cyksIHQudGFyZ2V0U25hcHNob3QhLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgISF0Lmd1YXJkc1Jlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KGd1YXJkc0VuZCk7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgZmlsdGVyKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXQuZ3VhcmRzUmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuYXZDYW5jZWwgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgTmF2aWdhdGlvbkNhbmNlbCh0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2Q2FuY2VsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlc29sdmUoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAvLyAtLS0gUkVTT0xWRSAtLS1cbiAgICAgICAgICAgICAgICAgICAgIHN3aXRjaFRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHQuZ3VhcmRzLmNhbkFjdGl2YXRlQ2hlY2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvZih0KS5waXBlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZVN0YXJ0ID0gbmV3IFJlc29sdmVTdGFydChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzKSwgdC50YXJnZXRTbmFwc2hvdCEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KHJlc29sdmVTdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2hNYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGFSZXNvbHZlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvZih0KS5waXBlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlRGF0YShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSwgdGhpcy5uZ01vZHVsZS5pbmplY3RvciksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dDogKCkgPT4gZGF0YVJlc29sdmVkID0gdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhUmVzb2x2ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmF2Q2FuY2VsID0gbmV3IE5hdmlnYXRpb25DYW5jZWwoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgQXQgbGVhc3Qgb25lIHJvdXRlIHJlc29sdmVyIGRpZG4ndCBlbWl0IGFueSB2YWx1ZS5gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdkNhbmNlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQucmVzb2x2ZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVFbmQgPSBuZXcgUmVzb2x2ZUVuZChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzKSwgdC50YXJnZXRTbmFwc2hvdCEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KHJlc29sdmVFbmQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAvLyAtLS0gQUZURVIgUFJFQUNUSVZBVElPTiAtLS1cbiAgICAgICAgICAgICAgICAgICAgIHN3aXRjaFRhcCgodDogTmF2aWdhdGlvblRyYW5zaXRpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFNuYXBzaG90LFxuICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBuYXZpZ2F0aW9uSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFjdGVkVXJsOiBhcHBsaWVkVXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICByYXdVcmw6IHJhd1VybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFzOiB7c2tpcExvY2F0aW9uQ2hhbmdlLCByZXBsYWNlVXJsfVxuICAgICAgICAgICAgICAgICAgICAgICB9ID0gdDtcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaG9va3MuYWZ0ZXJQcmVhY3RpdmF0aW9uKHRhcmdldFNuYXBzaG90ISwge1xuICAgICAgICAgICAgICAgICAgICAgICAgIG5hdmlnYXRpb25JZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBhcHBsaWVkVXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICByYXdVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHNraXBMb2NhdGlvbkNoYW5nZTogISFza2lwTG9jYXRpb25DaGFuZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZVVybDogISFyZXBsYWNlVXJsLFxuICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICBtYXAoKHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFJvdXRlclN0YXRlID0gY3JlYXRlUm91dGVyU3RhdGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvdXRlUmV1c2VTdHJhdGVneSwgdC50YXJnZXRTbmFwc2hvdCEsIHQuY3VycmVudFJvdXRlclN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICh7Li4udCwgdGFyZ2V0Um91dGVyU3RhdGV9KTtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAvKiBPbmNlIGhlcmUsIHdlIGFyZSBhYm91dCB0byBhY3RpdmF0ZSBzeW5jcm9ub3VzbHkuIFRoZSBhc3N1bXB0aW9uIGlzIHRoaXNcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbGwgc3VjY2VlZCwgYW5kIHVzZXIgY29kZSBtYXkgcmVhZCBmcm9tIHRoZSBSb3V0ZXIgc2VydmljZS4gVGhlcmVmb3JlXG4gICAgICAgICAgICAgICAgICAgICAgICBiZWZvcmUgYWN0aXZhdGlvbiwgd2UgbmVlZCB0byB1cGRhdGUgcm91dGVyIHByb3BlcnRpZXMgc3RvcmluZyB0aGUgY3VycmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgVVJMIGFuZCB0aGUgUm91dGVyU3RhdGUsIGFzIHdlbGwgYXMgdXBkYXRlZCB0aGUgYnJvd3NlciBVUkwuIEFsbCB0aGlzIHNob3VsZFxuICAgICAgICAgICAgICAgICAgICAgICAgaGFwcGVuICpiZWZvcmUqIGFjdGl2YXRpbmcuICovXG4gICAgICAgICAgICAgICAgICAgICB0YXAoKHQ6IE5hdmlnYXRpb25UcmFuc2l0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSB0LnVybEFmdGVyUmVkaXJlY3RzO1xuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJhd1VybFRyZWUgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHRoaXMuY3VycmVudFVybFRyZWUsIHQucmF3VXJsKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAodGhpcyBhcyB7cm91dGVyU3RhdGU6IFJvdXRlclN0YXRlfSkucm91dGVyU3RhdGUgPSB0LnRhcmdldFJvdXRlclN0YXRlITtcblxuICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2RlZmVycmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdC5leHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEJyb3dzZXJVcmwoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yYXdVcmxUcmVlLCAhIXQuZXh0cmFzLnJlcGxhY2VVcmwsIHQuaWQsIHQuZXh0cmFzLnN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5icm93c2VyVXJsVHJlZSA9IHQudXJsQWZ0ZXJSZWRpcmVjdHM7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICBhY3RpdmF0ZVJvdXRlcyhcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb3RDb250ZXh0cywgdGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3ksXG4gICAgICAgICAgICAgICAgICAgICAgICAgKGV2dDogRXZlbnQpID0+IHRoaXMudHJpZ2dlckV2ZW50KGV2dCkpLFxuXG4gICAgICAgICAgICAgICAgICAgICB0YXAoe1xuICAgICAgICAgICAgICAgICAgICAgICBuZXh0KCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAvKiBXaGVuIHRoZSBuYXZpZ2F0aW9uIHN0cmVhbSBmaW5pc2hlcyBlaXRoZXIgdGhyb3VnaCBlcnJvciBvciBzdWNjZXNzLCB3ZVxuICAgICAgICAgICAgICAgICAgICAgICAgKiBzZXQgdGhlIGBjb21wbGV0ZWRgIG9yIGBlcnJvcmVkYCBmbGFnLiBIb3dldmVyLCB0aGVyZSBhcmUgc29tZSBzaXR1YXRpb25zXG4gICAgICAgICAgICAgICAgICAgICAgICAqIHdoZXJlIHdlIGNvdWxkIGdldCBoZXJlIHdpdGhvdXQgZWl0aGVyIG9mIHRob3NlIGJlaW5nIHNldC4gRm9yIGluc3RhbmNlLCBhXG4gICAgICAgICAgICAgICAgICAgICAgICAqIHJlZGlyZWN0IGR1cmluZyBOYXZpZ2F0aW9uU3RhcnQuIFRoZXJlZm9yZSwgdGhpcyBpcyBhIGNhdGNoLWFsbCB0byBtYWtlXG4gICAgICAgICAgICAgICAgICAgICAgICAqIHN1cmUgdGhlIE5hdmlnYXRpb25DYW5jZWxcbiAgICAgICAgICAgICAgICAgICAgICAgICogZXZlbnQgaXMgZmlyZWQgd2hlbiBhIG5hdmlnYXRpb24gZ2V0cyBjYW5jZWxsZWQgYnV0IG5vdCBjYXVnaHQgYnkgb3RoZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICogbWVhbnMuICovXG4gICAgICAgICAgICAgICAgICAgICAgIGlmICghY29tcGxldGVkICYmICFlcnJvcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gTXVzdCByZXNldCB0byBjdXJyZW50IFVSTCB0cmVlIGhlcmUgdG8gZW5zdXJlIGhpc3Rvcnkuc3RhdGUgaXMgc2V0LiBPbiBhXG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gZnJlc2ggcGFnZSBsb2FkLCBpZiBhIG5ldyBuYXZpZ2F0aW9uIGNvbWVzIGluIGJlZm9yZSBhIHN1Y2Nlc3NmdWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuYXZpZ2F0aW9uIGNvbXBsZXRlcywgdGhlcmUgd2lsbCBiZSBub3RoaW5nIGluXG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGlzdG9yeS5zdGF0ZS5uYXZpZ2F0aW9uSWQuIFRoaXMgY2FuIGNhdXNlIHN5bmMgcHJvYmxlbXMgd2l0aCBBbmd1bGFySlNcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzeW5jIGNvZGUgd2hpY2ggbG9va3MgZm9yIGEgdmFsdWUgaGVyZSBpbiBvcmRlciB0byBkZXRlcm1pbmUgd2hldGhlciBvclxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vdCB0byBoYW5kbGUgYSBnaXZlbiBwb3BzdGF0ZSBldmVudCBvciB0byBsZWF2ZSBpdCB0byB0aGUgQW5ndWFsclxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJvdXRlci5cbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdkNhbmNlbCA9IG5ldyBOYXZpZ2F0aW9uQ2FuY2VsKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBOYXZpZ2F0aW9uIElEICR7dC5pZH0gaXMgbm90IGVxdWFsIHRvIHRoZSBjdXJyZW50IG5hdmlnYXRpb24gaWQgJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmF2aWdhdGlvbklkfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuYXZDYW5jZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIHQucmVzb2x2ZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgLy8gY3VycmVudE5hdmlnYXRpb24gc2hvdWxkIGFsd2F5cyBiZSByZXNldCB0byBudWxsIGhlcmUuIElmIG5hdmlnYXRpb24gd2FzXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHN1Y2Nlc3NmdWwsIGxhc3RTdWNjZXNzZnVsVHJhbnNpdGlvbiB3aWxsIGhhdmUgYWxyZWFkeSBiZWVuIHNldC4gVGhlcmVmb3JlXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIGNhbiBzYWZlbHkgc2V0IGN1cnJlbnROYXZpZ2F0aW9uIHRvIG51bGwgaGVyZS5cbiAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmF2aWdhdGlvbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgIGNhdGNoRXJyb3IoKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgIC8qIFRoaXMgZXJyb3IgdHlwZSBpcyBpc3N1ZWQgZHVyaW5nIFJlZGlyZWN0LCBhbmQgaXMgaGFuZGxlZCBhcyBhXG4gICAgICAgICAgICAgICAgICAgICAgICAqIGNhbmNlbGxhdGlvbiByYXRoZXIgdGhhbiBhbiBlcnJvci4gKi9cbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yKGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVkaXJlY3RpbmcgPSBpc1VybFRyZWUoZS51cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcmVkaXJlY3RpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBwcm9wZXJ0eSBvbmx5IGlmIHdlJ3JlIG5vdCByZWRpcmVjdGluZy4gSWYgd2UgbGFuZGVkIG9uIGEgcGFnZSBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlZGlyZWN0IHRvIGAvYCByb3V0ZSwgdGhlIG5ldyBuYXZpZ2F0aW9uIGlzIGdvaW5nIHRvIHNlZSB0aGUgYC9gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpc24ndCBhIGNoYW5nZSBmcm9tIHRoZSBkZWZhdWx0IGN1cnJlbnRVcmxUcmVlIGFuZCB3b24ndCBuYXZpZ2F0ZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgb25seSBhcHBsaWNhYmxlIHdpdGggaW5pdGlhbCBuYXZpZ2F0aW9uLCBzbyBzZXR0aW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBgbmF2aWdhdGVkYCBvbmx5IHdoZW4gbm90IHJlZGlyZWN0aW5nIHJlc29sdmVzIHRoaXMgc2NlbmFyaW8uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5hdmlnYXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc2V0U3RhdGVBbmRVcmwodC5jdXJyZW50Um91dGVyU3RhdGUsIHQuY3VycmVudFVybFRyZWUsIHQucmF3VXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmF2Q2FuY2VsID0gbmV3IE5hdmlnYXRpb25DYW5jZWwoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2Q2FuY2VsKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gcmVkaXJlY3RpbmcsIHdlIG5lZWQgdG8gZGVsYXkgcmVzb2x2aW5nIHRoZSBuYXZpZ2F0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHJvbWlzZSBhbmQgcHVzaCBpdCB0byB0aGUgcmVkaXJlY3QgbmF2aWdhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcmVkaXJlY3RpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHQucmVzb2x2ZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNldFRpbWVvdXQgaXMgcmVxdWlyZWQgc28gdGhpcyBuYXZpZ2F0aW9uIGZpbmlzaGVzIHdpdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSByZXR1cm4gRU1QVFkgYmVsb3cuIElmIGl0IGlzbid0IGFsbG93ZWQgdG8gZmluaXNoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwcm9jZXNzaW5nLCB0aGVyZSBjYW4gYmUgbXVsdGlwbGUgbmF2aWdhdGlvbnMgdG8gdGhlIHNhbWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVSTC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXJnZWRUcmVlID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZShlLnVybCwgdGhpcy5yYXdVcmxUcmVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXh0cmFzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNraXBMb2NhdGlvbkNoYW5nZTogdC5leHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2VVcmw6IHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXJnZWRUcmVlLCAnaW1wZXJhdGl2ZScsIG51bGwsIGV4dHJhcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtyZXNvbHZlOiB0LnJlc29sdmUsIHJlamVjdDogdC5yZWplY3QsIHByb21pc2U6IHQucHJvbWlzZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgLyogQWxsIG90aGVyIGVycm9ycyBzaG91bGQgcmVzZXQgdG8gdGhlIHJvdXRlcidzIGludGVybmFsIFVSTCByZWZlcmVuY2UgdG9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgKiB0aGUgcHJlLWVycm9yIHN0YXRlLiAqL1xuICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzZXRTdGF0ZUFuZFVybCh0LmN1cnJlbnRSb3V0ZXJTdGF0ZSwgdC5jdXJyZW50VXJsVHJlZSwgdC5yYXdVcmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdkVycm9yID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5hdmlnYXRpb25FcnJvcih0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuYXZFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHQucmVzb2x2ZSh0aGlzLmVycm9ySGFuZGxlcihlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHQucmVqZWN0KGVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAvLyBUT0RPKGphc29uYWRlbik6IHJlbW92ZSBjYXN0IG9uY2UgZzMgaXMgb24gdXBkYXRlZCBUeXBlU2NyaXB0XG4gICAgICAgICAgICAgICB9KSkgYXMgYW55IGFzIE9ic2VydmFibGU8TmF2aWdhdGlvblRyYW5zaXRpb24+O1xuICB9XG5cbiAgLyoqXG4gICAqIEBpbnRlcm5hbFxuICAgKiBUT0RPOiB0aGlzIHNob3VsZCBiZSByZW1vdmVkIG9uY2UgdGhlIGNvbnN0cnVjdG9yIG9mIHRoZSByb3V0ZXIgbWFkZSBpbnRlcm5hbFxuICAgKi9cbiAgcmVzZXRSb290Q29tcG9uZW50VHlwZShyb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+KTogdm9pZCB7XG4gICAgdGhpcy5yb290Q29tcG9uZW50VHlwZSA9IHJvb3RDb21wb25lbnRUeXBlO1xuICAgIC8vIFRPRE86IHZzYXZraW4gcm91dGVyIDQuMCBzaG91bGQgbWFrZSB0aGUgcm9vdCBjb21wb25lbnQgc2V0IHRvIG51bGxcbiAgICAvLyB0aGlzIHdpbGwgc2ltcGxpZnkgdGhlIGxpZmVjeWNsZSBvZiB0aGUgcm91dGVyLlxuICAgIHRoaXMucm91dGVyU3RhdGUucm9vdC5jb21wb25lbnQgPSB0aGlzLnJvb3RDb21wb25lbnRUeXBlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUcmFuc2l0aW9uKCk6IE5hdmlnYXRpb25UcmFuc2l0aW9uIHtcbiAgICBjb25zdCB0cmFuc2l0aW9uID0gdGhpcy50cmFuc2l0aW9ucy52YWx1ZTtcbiAgICAvLyBUaGlzIHZhbHVlIG5lZWRzIHRvIGJlIHNldC4gT3RoZXIgdmFsdWVzIHN1Y2ggYXMgZXh0cmFjdGVkVXJsIGFyZSBzZXQgb24gaW5pdGlhbCBuYXZpZ2F0aW9uXG4gICAgLy8gYnV0IHRoZSB1cmxBZnRlclJlZGlyZWN0cyBtYXkgbm90IGdldCBzZXQgaWYgd2UgYXJlbid0IHByb2Nlc3NpbmcgdGhlIG5ldyBVUkwgKmFuZCogbm90XG4gICAgLy8gcHJvY2Vzc2luZyB0aGUgcHJldmlvdXMgVVJMLlxuICAgIHRyYW5zaXRpb24udXJsQWZ0ZXJSZWRpcmVjdHMgPSB0aGlzLmJyb3dzZXJVcmxUcmVlO1xuICAgIHJldHVybiB0cmFuc2l0aW9uO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXRUcmFuc2l0aW9uKHQ6IFBhcnRpYWw8TmF2aWdhdGlvblRyYW5zaXRpb24+KTogdm9pZCB7XG4gICAgdGhpcy50cmFuc2l0aW9ucy5uZXh0KHsuLi50aGlzLmdldFRyYW5zaXRpb24oKSwgLi4udH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdXAgdGhlIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lciBhbmQgcGVyZm9ybXMgdGhlIGluaXRpYWwgbmF2aWdhdGlvbi5cbiAgICovXG4gIGluaXRpYWxOYXZpZ2F0aW9uKCk6IHZvaWQge1xuICAgIHRoaXMuc2V0VXBMb2NhdGlvbkNoYW5nZUxpc3RlbmVyKCk7XG4gICAgaWYgKHRoaXMubmF2aWdhdGlvbklkID09PSAwKSB7XG4gICAgICB0aGlzLm5hdmlnYXRlQnlVcmwodGhpcy5sb2NhdGlvbi5wYXRoKHRydWUpLCB7cmVwbGFjZVVybDogdHJ1ZX0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHVwIHRoZSBsb2NhdGlvbiBjaGFuZ2UgbGlzdGVuZXIuIFRoaXMgbGlzdGVuZXIgZGV0ZWN0cyBuYXZpZ2F0aW9ucyB0cmlnZ2VyZWQgZnJvbSBvdXRzaWRlXG4gICAqIHRoZSBSb3V0ZXIgKHRoZSBicm93c2VyIGJhY2svZm9yd2FyZCBidXR0b25zLCBmb3IgZXhhbXBsZSkgYW5kIHNjaGVkdWxlcyBhIGNvcnJlc3BvbmRpbmcgUm91dGVyXG4gICAqIG5hdmlnYXRpb24gc28gdGhhdCB0aGUgY29ycmVjdCBldmVudHMsIGd1YXJkcywgZXRjLiBhcmUgdHJpZ2dlcmVkLlxuICAgKi9cbiAgc2V0VXBMb2NhdGlvbkNoYW5nZUxpc3RlbmVyKCk6IHZvaWQge1xuICAgIC8vIERvbid0IG5lZWQgdG8gdXNlIFpvbmUud3JhcCBhbnkgbW9yZSwgYmVjYXVzZSB6b25lLmpzXG4gICAgLy8gYWxyZWFkeSBwYXRjaCBvblBvcFN0YXRlLCBzbyBsb2NhdGlvbiBjaGFuZ2UgY2FsbGJhY2sgd2lsbFxuICAgIC8vIHJ1biBpbnRvIG5nWm9uZVxuICAgIGlmICghdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbiA9IHRoaXMubG9jYXRpb24uc3Vic2NyaWJlKGV2ZW50ID0+IHtcbiAgICAgICAgY29uc3QgY3VycmVudENoYW5nZSA9IHRoaXMuZXh0cmFjdExvY2F0aW9uQ2hhbmdlSW5mb0Zyb21FdmVudChldmVudCk7XG4gICAgICAgIGlmICh0aGlzLnNob3VsZFNjaGVkdWxlTmF2aWdhdGlvbih0aGlzLmxhc3RMb2NhdGlvbkNoYW5nZUluZm8sIGN1cnJlbnRDaGFuZ2UpKSB7XG4gICAgICAgICAgLy8gVGhlIGBzZXRUaW1lb3V0YCB3YXMgYWRkZWQgaW4gIzEyMTYwIGFuZCBpcyBsaWtlbHkgdG8gc3VwcG9ydCBBbmd1bGFyL0FuZ3VsYXJKU1xuICAgICAgICAgIC8vIGh5YnJpZCBhcHBzLlxuICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qge3NvdXJjZSwgc3RhdGUsIHVybFRyZWV9ID0gY3VycmVudENoYW5nZTtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVOYXZpZ2F0aW9uKHVybFRyZWUsIHNvdXJjZSwgc3RhdGUsIHtyZXBsYWNlVXJsOiB0cnVlfSk7XG4gICAgICAgICAgfSwgMCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sYXN0TG9jYXRpb25DaGFuZ2VJbmZvID0gY3VycmVudENoYW5nZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBFeHRyYWN0cyByb3V0ZXItcmVsYXRlZCBpbmZvcm1hdGlvbiBmcm9tIGEgYFBvcFN0YXRlRXZlbnRgLiAqL1xuICBwcml2YXRlIGV4dHJhY3RMb2NhdGlvbkNoYW5nZUluZm9Gcm9tRXZlbnQoY2hhbmdlOiBQb3BTdGF0ZUV2ZW50KTogTG9jYXRpb25DaGFuZ2VJbmZvIHtcbiAgICByZXR1cm4ge1xuICAgICAgc291cmNlOiBjaGFuZ2VbJ3R5cGUnXSA9PT0gJ3BvcHN0YXRlJyA/ICdwb3BzdGF0ZScgOiAnaGFzaGNoYW5nZScsXG4gICAgICB1cmxUcmVlOiB0aGlzLnBhcnNlVXJsKGNoYW5nZVsndXJsJ10hKSxcbiAgICAgIC8vIE5hdmlnYXRpb25zIGNvbWluZyBmcm9tIEFuZ3VsYXIgcm91dGVyIGhhdmUgYSBuYXZpZ2F0aW9uSWQgc3RhdGVcbiAgICAgIC8vIHByb3BlcnR5LiBXaGVuIHRoaXMgZXhpc3RzLCByZXN0b3JlIHRoZSBzdGF0ZS5cbiAgICAgIHN0YXRlOiBjaGFuZ2Uuc3RhdGU/Lm5hdmlnYXRpb25JZCA/IGNoYW5nZS5zdGF0ZSA6IG51bGwsXG4gICAgICB0cmFuc2l0aW9uSWQ6IHRoaXMuZ2V0VHJhbnNpdGlvbigpLmlkXG4gICAgfSBhcyBjb25zdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgdHdvIGV2ZW50cyB0cmlnZ2VyZWQgYnkgdGhlIExvY2F0aW9uIHN1YnNjcmlwdGlvbiBhcmUgZHVlIHRvIHRoZSBzYW1lXG4gICAqIG5hdmlnYXRpb24uIFRoZSBsb2NhdGlvbiBzdWJzY3JpcHRpb24gY2FuIGZpcmUgdHdvIGV2ZW50cyAocG9wc3RhdGUgYW5kIGhhc2hjaGFuZ2UpIGZvciBhXG4gICAqIHNpbmdsZSBuYXZpZ2F0aW9uLiBUaGUgc2Vjb25kIG9uZSBzaG91bGQgYmUgaWdub3JlZCwgdGhhdCBpcywgd2Ugc2hvdWxkIG5vdCBzY2hlZHVsZSBhbm90aGVyXG4gICAqIG5hdmlnYXRpb24gaW4gdGhlIFJvdXRlci5cbiAgICovXG4gIHByaXZhdGUgc2hvdWxkU2NoZWR1bGVOYXZpZ2F0aW9uKHByZXZpb3VzOiBMb2NhdGlvbkNoYW5nZUluZm98bnVsbCwgY3VycmVudDogTG9jYXRpb25DaGFuZ2VJbmZvKTpcbiAgICAgIGJvb2xlYW4ge1xuICAgIGlmICghcHJldmlvdXMpIHJldHVybiB0cnVlO1xuXG4gICAgY29uc3Qgc2FtZURlc3RpbmF0aW9uID0gY3VycmVudC51cmxUcmVlLnRvU3RyaW5nKCkgPT09IHByZXZpb3VzLnVybFRyZWUudG9TdHJpbmcoKTtcbiAgICBjb25zdCBldmVudHNPY2N1cnJlZEF0U2FtZVRpbWUgPSBjdXJyZW50LnRyYW5zaXRpb25JZCA9PT0gcHJldmlvdXMudHJhbnNpdGlvbklkO1xuICAgIGlmICghZXZlbnRzT2NjdXJyZWRBdFNhbWVUaW1lIHx8ICFzYW1lRGVzdGluYXRpb24pIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmICgoY3VycmVudC5zb3VyY2UgPT09ICdoYXNoY2hhbmdlJyAmJiBwcmV2aW91cy5zb3VyY2UgPT09ICdwb3BzdGF0ZScpIHx8XG4gICAgICAgIChjdXJyZW50LnNvdXJjZSA9PT0gJ3BvcHN0YXRlJyAmJiBwcmV2aW91cy5zb3VyY2UgPT09ICdoYXNoY2hhbmdlJykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKiBUaGUgY3VycmVudCBVUkwuICovXG4gIGdldCB1cmwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5zZXJpYWxpemVVcmwodGhpcy5jdXJyZW50VXJsVHJlZSk7XG4gIH1cblxuICAvKiogVGhlIGN1cnJlbnQgTmF2aWdhdGlvbiBvYmplY3QgaWYgb25lIGV4aXN0cyAqL1xuICBnZXRDdXJyZW50TmF2aWdhdGlvbigpOiBOYXZpZ2F0aW9ufG51bGwge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICB0cmlnZ2VyRXZlbnQoZXZlbnQ6IEV2ZW50KTogdm9pZCB7XG4gICAgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KS5uZXh0KGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNldHMgdGhlIHJvdXRlIGNvbmZpZ3VyYXRpb24gdXNlZCBmb3IgbmF2aWdhdGlvbiBhbmQgZ2VuZXJhdGluZyBsaW5rcy5cbiAgICpcbiAgICogQHBhcmFtIGNvbmZpZyBUaGUgcm91dGUgYXJyYXkgZm9yIHRoZSBuZXcgY29uZmlndXJhdGlvbi5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5yZXNldENvbmZpZyhbXG4gICAqICB7IHBhdGg6ICd0ZWFtLzppZCcsIGNvbXBvbmVudDogVGVhbUNtcCwgY2hpbGRyZW46IFtcbiAgICogICAgeyBwYXRoOiAnc2ltcGxlJywgY29tcG9uZW50OiBTaW1wbGVDbXAgfSxcbiAgICogICAgeyBwYXRoOiAndXNlci86bmFtZScsIGNvbXBvbmVudDogVXNlckNtcCB9XG4gICAqICBdfVxuICAgKiBdKTtcbiAgICogYGBgXG4gICAqL1xuICByZXNldENvbmZpZyhjb25maWc6IFJvdXRlcyk6IHZvaWQge1xuICAgIHZhbGlkYXRlQ29uZmlnKGNvbmZpZyk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWcubWFwKHN0YW5kYXJkaXplQ29uZmlnKTtcbiAgICB0aGlzLm5hdmlnYXRlZCA9IGZhbHNlO1xuICAgIHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCA9IC0xO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5kaXNwb3NlKCk7XG4gIH1cblxuICAvKiogRGlzcG9zZXMgb2YgdGhlIHJvdXRlci4gKi9cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbiA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQXBwZW5kcyBVUkwgc2VnbWVudHMgdG8gdGhlIGN1cnJlbnQgVVJMIHRyZWUgdG8gY3JlYXRlIGEgbmV3IFVSTCB0cmVlLlxuICAgKlxuICAgKiBAcGFyYW0gY29tbWFuZHMgQW4gYXJyYXkgb2YgVVJMIGZyYWdtZW50cyB3aXRoIHdoaWNoIHRvIGNvbnN0cnVjdCB0aGUgbmV3IFVSTCB0cmVlLlxuICAgKiBJZiB0aGUgcGF0aCBpcyBzdGF0aWMsIGNhbiBiZSB0aGUgbGl0ZXJhbCBVUkwgc3RyaW5nLiBGb3IgYSBkeW5hbWljIHBhdGgsIHBhc3MgYW4gYXJyYXkgb2YgcGF0aFxuICAgKiBzZWdtZW50cywgZm9sbG93ZWQgYnkgdGhlIHBhcmFtZXRlcnMgZm9yIGVhY2ggc2VnbWVudC5cbiAgICogVGhlIGZyYWdtZW50cyBhcmUgYXBwbGllZCB0byB0aGUgY3VycmVudCBVUkwgdHJlZSBvciB0aGUgb25lIHByb3ZpZGVkICBpbiB0aGUgYHJlbGF0aXZlVG9gXG4gICAqIHByb3BlcnR5IG9mIHRoZSBvcHRpb25zIG9iamVjdCwgaWYgc3VwcGxpZWQuXG4gICAqIEBwYXJhbSBuYXZpZ2F0aW9uRXh0cmFzIE9wdGlvbnMgdGhhdCBjb250cm9sIHRoZSBuYXZpZ2F0aW9uIHN0cmF0ZWd5LiBUaGlzIGZ1bmN0aW9uXG4gICAqIG9ubHkgdXNlcyBwcm9wZXJ0aWVzIGluIGBOYXZpZ2F0aW9uRXh0cmFzYCB0aGF0IHdvdWxkIGNoYW5nZSB0aGUgcHJvdmlkZWQgVVJMLlxuICAgKiBAcmV0dXJucyBUaGUgbmV3IFVSTCB0cmVlLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBgYGBcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCAndXNlcicsIDExXSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMztleHBhbmQ9dHJ1ZS91c2VyLzExXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge2V4cGFuZDogdHJ1ZX0sICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8geW91IGNhbiBjb2xsYXBzZSBzdGF0aWMgc2VnbWVudHMgbGlrZSB0aGlzICh0aGlzIHdvcmtzIG9ubHkgd2l0aCB0aGUgZmlyc3QgcGFzc2VkLWluIHZhbHVlKTpcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbS8zMy91c2VyJywgdXNlcklkXSk7XG4gICAqXG4gICAqIC8vIElmIHRoZSBmaXJzdCBzZWdtZW50IGNhbiBjb250YWluIHNsYXNoZXMsIGFuZCB5b3UgZG8gbm90IHdhbnQgdGhlIHJvdXRlciB0byBzcGxpdCBpdCxcbiAgICogLy8geW91IGNhbiBkbyB0aGUgZm9sbG93aW5nOlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbe3NlZ21lbnRQYXRoOiAnL29uZS90d28nfV0pO1xuICAgKlxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvKHVzZXIvMTEvL3JpZ2h0OmNoYXQpXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiAnY2hhdCd9fV0pO1xuICAgKlxuICAgKiAvLyByZW1vdmUgdGhlIHJpZ2h0IHNlY29uZGFyeSBub2RlXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiBudWxsfX1dKTtcbiAgICpcbiAgICogLy8gYXNzdW1pbmcgdGhlIGN1cnJlbnQgdXJsIGlzIGAvdGVhbS8zMy91c2VyLzExYCBhbmQgdGhlIHJvdXRlIHBvaW50cyB0byBgdXNlci8xMWBcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8xMS9kZXRhaWxzXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnZGV0YWlscyddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8yMlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy4uLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS80NC91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vLi4vdGVhbS80NC91c2VyLzIyJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKiBgYGBcbiAgICovXG4gIGNyZWF0ZVVybFRyZWUoY29tbWFuZHM6IGFueVtdLCBuYXZpZ2F0aW9uRXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge30pOiBVcmxUcmVlIHtcbiAgICBjb25zdCB7XG4gICAgICByZWxhdGl2ZVRvLFxuICAgICAgcXVlcnlQYXJhbXMsXG4gICAgICBmcmFnbWVudCxcbiAgICAgIHByZXNlcnZlUXVlcnlQYXJhbXMsXG4gICAgICBxdWVyeVBhcmFtc0hhbmRsaW5nLFxuICAgICAgcHJlc2VydmVGcmFnbWVudFxuICAgIH0gPSBuYXZpZ2F0aW9uRXh0cmFzO1xuICAgIGlmIChpc0Rldk1vZGUoKSAmJiBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zICYmIDxhbnk+Y29uc29sZSAmJiA8YW55PmNvbnNvbGUud2Fybikge1xuICAgICAgY29uc29sZS53YXJuKCdwcmVzZXJ2ZVF1ZXJ5UGFyYW1zIGlzIGRlcHJlY2F0ZWQsIHVzZSBxdWVyeVBhcmFtc0hhbmRsaW5nIGluc3RlYWQuJyk7XG4gICAgfVxuICAgIGNvbnN0IGEgPSByZWxhdGl2ZVRvIHx8IHRoaXMucm91dGVyU3RhdGUucm9vdDtcbiAgICBjb25zdCBmID0gcHJlc2VydmVGcmFnbWVudCA/IHRoaXMuY3VycmVudFVybFRyZWUuZnJhZ21lbnQgOiBmcmFnbWVudDtcbiAgICBsZXQgcTogUGFyYW1zfG51bGwgPSBudWxsO1xuICAgIGlmIChxdWVyeVBhcmFtc0hhbmRsaW5nKSB7XG4gICAgICBzd2l0Y2ggKHF1ZXJ5UGFyYW1zSGFuZGxpbmcpIHtcbiAgICAgICAgY2FzZSAnbWVyZ2UnOlxuICAgICAgICAgIHEgPSB7Li4udGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcywgLi4ucXVlcnlQYXJhbXN9O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdwcmVzZXJ2ZSc6XG4gICAgICAgICAgcSA9IHRoaXMuY3VycmVudFVybFRyZWUucXVlcnlQYXJhbXM7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgcSA9IHF1ZXJ5UGFyYW1zIHx8IG51bGw7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHEgPSBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zID8gdGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcyA6IHF1ZXJ5UGFyYW1zIHx8IG51bGw7XG4gICAgfVxuICAgIGlmIChxICE9PSBudWxsKSB7XG4gICAgICBxID0gdGhpcy5yZW1vdmVFbXB0eVByb3BzKHEpO1xuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlVXJsVHJlZShhLCB0aGlzLmN1cnJlbnRVcmxUcmVlLCBjb21tYW5kcywgcSEsIGYhKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZXMgdG8gYSB2aWV3IHVzaW5nIGFuIGFic29sdXRlIHJvdXRlIHBhdGguXG4gICAqXG4gICAqIEBwYXJhbSB1cmwgQW4gYWJzb2x1dGUgcGF0aCBmb3IgYSBkZWZpbmVkIHJvdXRlLiBUaGUgZnVuY3Rpb24gZG9lcyBub3QgYXBwbHkgYW55IGRlbHRhIHRvIHRoZVxuICAgKiAgICAgY3VycmVudCBVUkwuXG4gICAqIEBwYXJhbSBleHRyYXMgQW4gb2JqZWN0IGNvbnRhaW5pbmcgcHJvcGVydGllcyB0aGF0IG1vZGlmeSB0aGUgbmF2aWdhdGlvbiBzdHJhdGVneS5cbiAgICogVGhlIGZ1bmN0aW9uIGlnbm9yZXMgYW55IHByb3BlcnRpZXMgaW4gdGhlIGBOYXZpZ2F0aW9uRXh0cmFzYCB0aGF0IHdvdWxkIGNoYW5nZSB0aGVcbiAgICogcHJvdmlkZWQgVVJMLlxuICAgKlxuICAgKiBAcmV0dXJucyBBIFByb21pc2UgdGhhdCByZXNvbHZlcyB0byAndHJ1ZScgd2hlbiBuYXZpZ2F0aW9uIHN1Y2NlZWRzLFxuICAgKiB0byAnZmFsc2UnIHdoZW4gbmF2aWdhdGlvbiBmYWlscywgb3IgaXMgcmVqZWN0ZWQgb24gZXJyb3IuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIFRoZSBmb2xsb3dpbmcgY2FsbHMgcmVxdWVzdCBuYXZpZ2F0aW9uIHRvIGFuIGFic29sdXRlIHBhdGguXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIubmF2aWdhdGVCeVVybChcIi90ZWFtLzMzL3VzZXIvMTFcIik7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTFxuICAgKiByb3V0ZXIubmF2aWdhdGVCeVVybChcIi90ZWFtLzMzL3VzZXIvMTFcIiwgeyBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpXG4gICAqXG4gICAqL1xuICBuYXZpZ2F0ZUJ5VXJsKHVybDogc3RyaW5nfFVybFRyZWUsIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHtza2lwTG9jYXRpb25DaGFuZ2U6IGZhbHNlfSk6XG4gICAgICBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoaXNEZXZNb2RlKCkgJiYgdGhpcy5pc05nWm9uZUVuYWJsZWQgJiYgIU5nWm9uZS5pc0luQW5ndWxhclpvbmUoKSkge1xuICAgICAgdGhpcy5jb25zb2xlLndhcm4oXG4gICAgICAgICAgYE5hdmlnYXRpb24gdHJpZ2dlcmVkIG91dHNpZGUgQW5ndWxhciB6b25lLCBkaWQgeW91IGZvcmdldCB0byBjYWxsICduZ1pvbmUucnVuKCknP2ApO1xuICAgIH1cblxuICAgIGNvbnN0IHVybFRyZWUgPSBpc1VybFRyZWUodXJsKSA/IHVybCA6IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICBjb25zdCBtZXJnZWRUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHVybFRyZWUsIHRoaXMucmF3VXJsVHJlZSk7XG5cbiAgICByZXR1cm4gdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24obWVyZ2VkVHJlZSwgJ2ltcGVyYXRpdmUnLCBudWxsLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBhcnJheSBvZiBjb21tYW5kcyBhbmQgYSBzdGFydGluZyBwb2ludC5cbiAgICogSWYgbm8gc3RhcnRpbmcgcm91dGUgaXMgcHJvdmlkZWQsIHRoZSBuYXZpZ2F0aW9uIGlzIGFic29sdXRlLlxuICAgKlxuICAgKiBAcGFyYW0gY29tbWFuZHMgQW4gYXJyYXkgb2YgVVJMIGZyYWdtZW50cyB3aXRoIHdoaWNoIHRvIGNvbnN0cnVjdCB0aGUgdGFyZ2V0IFVSTC5cbiAgICogSWYgdGhlIHBhdGggaXMgc3RhdGljLCBjYW4gYmUgdGhlIGxpdGVyYWwgVVJMIHN0cmluZy4gRm9yIGEgZHluYW1pYyBwYXRoLCBwYXNzIGFuIGFycmF5IG9mIHBhdGhcbiAgICogc2VnbWVudHMsIGZvbGxvd2VkIGJ5IHRoZSBwYXJhbWV0ZXJzIGZvciBlYWNoIHNlZ21lbnQuXG4gICAqIFRoZSBmcmFnbWVudHMgYXJlIGFwcGxpZWQgdG8gdGhlIGN1cnJlbnQgVVJMIG9yIHRoZSBvbmUgcHJvdmlkZWQgIGluIHRoZSBgcmVsYXRpdmVUb2AgcHJvcGVydHlcbiAgICogb2YgdGhlIG9wdGlvbnMgb2JqZWN0LCBpZiBzdXBwbGllZC5cbiAgICogQHBhcmFtIGV4dHJhcyBBbiBvcHRpb25zIG9iamVjdCB0aGF0IGRldGVybWluZXMgaG93IHRoZSBVUkwgc2hvdWxkIGJlIGNvbnN0cnVjdGVkIG9yXG4gICAqICAgICBpbnRlcnByZXRlZC5cbiAgICpcbiAgICogQHJldHVybnMgQSBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gYHRydWVgIHdoZW4gbmF2aWdhdGlvbiBzdWNjZWVkcywgdG8gYGZhbHNlYCB3aGVuIG5hdmlnYXRpb25cbiAgICogICAgIGZhaWxzLFxuICAgKiBvciBpcyByZWplY3RlZCBvbiBlcnJvci5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBjYWxscyByZXF1ZXN0IG5hdmlnYXRpb24gdG8gYSBkeW5hbWljIHJvdXRlIHBhdGggcmVsYXRpdmUgdG8gdGhlIGN1cnJlbnQgVVJMLlxuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTCwgb3ZlcnJpZGluZyB0aGUgZGVmYXVsdCBiZWhhdmlvclxuICAgKiByb3V0ZXIubmF2aWdhdGUoWyd0ZWFtJywgMzMsICd1c2VyJywgMTFdLCB7cmVsYXRpdmVUbzogcm91dGUsIHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZX0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKVxuICAgKlxuICAgKi9cbiAgbmF2aWdhdGUoY29tbWFuZHM6IGFueVtdLCBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7c2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZX0pOlxuICAgICAgUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdmFsaWRhdGVDb21tYW5kcyhjb21tYW5kcyk7XG4gICAgcmV0dXJuIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmNyZWF0ZVVybFRyZWUoY29tbWFuZHMsIGV4dHJhcyksIGV4dHJhcyk7XG4gIH1cblxuICAvKiogU2VyaWFsaXplcyBhIGBVcmxUcmVlYCBpbnRvIGEgc3RyaW5nICovXG4gIHNlcmlhbGl6ZVVybCh1cmw6IFVybFRyZWUpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHVybCk7XG4gIH1cblxuICAvKiogUGFyc2VzIGEgc3RyaW5nIGludG8gYSBgVXJsVHJlZWAgKi9cbiAgcGFyc2VVcmwodXJsOiBzdHJpbmcpOiBVcmxUcmVlIHtcbiAgICBsZXQgdXJsVHJlZTogVXJsVHJlZTtcbiAgICB0cnkge1xuICAgICAgdXJsVHJlZSA9IHRoaXMudXJsU2VyaWFsaXplci5wYXJzZSh1cmwpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHVybFRyZWUgPSB0aGlzLm1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcihlLCB0aGlzLnVybFNlcmlhbGl6ZXIsIHVybCk7XG4gICAgfVxuICAgIHJldHVybiB1cmxUcmVlO1xuICB9XG5cbiAgLyoqIFJldHVybnMgd2hldGhlciB0aGUgdXJsIGlzIGFjdGl2YXRlZCAqL1xuICBpc0FjdGl2ZSh1cmw6IHN0cmluZ3xVcmxUcmVlLCBleGFjdDogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgIGlmIChpc1VybFRyZWUodXJsKSkge1xuICAgICAgcmV0dXJuIGNvbnRhaW5zVHJlZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB1cmwsIGV4YWN0KTtcbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIHJldHVybiBjb250YWluc1RyZWUodGhpcy5jdXJyZW50VXJsVHJlZSwgdXJsVHJlZSwgZXhhY3QpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVFbXB0eVByb3BzKHBhcmFtczogUGFyYW1zKTogUGFyYW1zIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMocGFyYW1zKS5yZWR1Y2UoKHJlc3VsdDogUGFyYW1zLCBrZXk6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgdmFsdWU6IGFueSA9IHBhcmFtc1trZXldO1xuICAgICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSwge30pO1xuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzTmF2aWdhdGlvbnMoKTogdm9pZCB7XG4gICAgdGhpcy5uYXZpZ2F0aW9ucy5zdWJzY3JpYmUoXG4gICAgICAgIHQgPT4ge1xuICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSB0LmlkO1xuICAgICAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25FbmQoXG4gICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIHRoaXMuc2VyaWFsaXplVXJsKHRoaXMuY3VycmVudFVybFRyZWUpKSk7XG4gICAgICAgICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bE5hdmlnYXRpb24gPSB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uO1xuICAgICAgICAgIHRoaXMuY3VycmVudE5hdmlnYXRpb24gPSBudWxsO1xuICAgICAgICAgIHQucmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgfSxcbiAgICAgICAgZSA9PiB7XG4gICAgICAgICAgdGhpcy5jb25zb2xlLndhcm4oYFVuaGFuZGxlZCBOYXZpZ2F0aW9uIEVycm9yOiBgKTtcbiAgICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHNjaGVkdWxlTmF2aWdhdGlvbihcbiAgICAgIHJhd1VybDogVXJsVHJlZSwgc291cmNlOiBOYXZpZ2F0aW9uVHJpZ2dlciwgcmVzdG9yZWRTdGF0ZTogUmVzdG9yZWRTdGF0ZXxudWxsLFxuICAgICAgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzLFxuICAgICAgcHJpb3JQcm9taXNlPzoge3Jlc29sdmU6IGFueSwgcmVqZWN0OiBhbnksIHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj59KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgLy8gKiBJbXBlcmF0aXZlIG5hdmlnYXRpb25zIChyb3V0ZXIubmF2aWdhdGUpIG1pZ2h0IHRyaWdnZXIgYWRkaXRpb25hbCBuYXZpZ2F0aW9ucyB0byB0aGUgc2FtZVxuICAgIC8vICAgVVJMIHZpYSBhIHBvcHN0YXRlIGV2ZW50IGFuZCB0aGUgbG9jYXRpb25DaGFuZ2VMaXN0ZW5lci4gV2Ugc2hvdWxkIHNraXAgdGhlc2UgZHVwbGljYXRlXG4gICAgLy8gICBuYXZzLiBEdXBsaWNhdGVzIG1heSBhbHNvIGJlIHRyaWdnZXJlZCBieSBhdHRlbXB0cyB0byBzeW5jIEFuZ3VsYXJKUyBhbmQgQW5ndWxhciByb3V0ZXJcbiAgICAvLyAgIHN0YXRlcy5cbiAgICAvLyAqIEltcGVyYXRpdmUgbmF2aWdhdGlvbnMgY2FuIGJlIGNhbmNlbGxlZCBieSByb3V0ZXIgZ3VhcmRzLCBtZWFuaW5nIHRoZSBVUkwgd29uJ3QgY2hhbmdlLiBJZlxuICAgIC8vICAgdGhlIHVzZXIgZm9sbG93cyB0aGF0IHdpdGggYSBuYXZpZ2F0aW9uIHVzaW5nIHRoZSBiYWNrL2ZvcndhcmQgYnV0dG9uIG9yIG1hbnVhbCBVUkwgY2hhbmdlLFxuICAgIC8vICAgdGhlIGRlc3RpbmF0aW9uIG1heSBiZSB0aGUgc2FtZSBhcyB0aGUgcHJldmlvdXMgaW1wZXJhdGl2ZSBhdHRlbXB0LiBXZSBzaG91bGQgbm90IHNraXBcbiAgICAvLyAgIHRoZXNlIG5hdmlnYXRpb25zIGJlY2F1c2UgaXQncyBhIHNlcGFyYXRlIGNhc2UgZnJvbSB0aGUgb25lIGFib3ZlIC0tIGl0J3Mgbm90IGEgZHVwbGljYXRlXG4gICAgLy8gICBuYXZpZ2F0aW9uLlxuICAgIGNvbnN0IGxhc3ROYXZpZ2F0aW9uID0gdGhpcy5nZXRUcmFuc2l0aW9uKCk7XG4gICAgLy8gV2UgZG9uJ3Qgd2FudCB0byBza2lwIGR1cGxpY2F0ZSBzdWNjZXNzZnVsIG5hdnMgaWYgdGhleSdyZSBpbXBlcmF0aXZlIGJlY2F1c2VcbiAgICAvLyBvblNhbWVVcmxOYXZpZ2F0aW9uIGNvdWxkIGJlICdyZWxvYWQnIChzbyB0aGUgZHVwbGljYXRlIGlzIGludGVuZGVkKS5cbiAgICBjb25zdCBicm93c2VyTmF2UHJlY2VkZWRCeVJvdXRlck5hdiA9XG4gICAgICAgIHNvdXJjZSAhPT0gJ2ltcGVyYXRpdmUnICYmIGxhc3ROYXZpZ2F0aW9uPy5zb3VyY2UgPT09ICdpbXBlcmF0aXZlJztcbiAgICBjb25zdCBsYXN0TmF2aWdhdGlvblN1Y2NlZWRlZCA9IHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCA9PT0gbGFzdE5hdmlnYXRpb24uaWQ7XG4gICAgLy8gSWYgdGhlIGxhc3QgbmF2aWdhdGlvbiBzdWNjZWVkZWQgb3IgaXMgaW4gZmxpZ2h0LCB3ZSBjYW4gdXNlIHRoZSByYXdVcmwgYXMgdGhlIGNvbXBhcmlzb24uXG4gICAgLy8gSG93ZXZlciwgaWYgaXQgZmFpbGVkLCB3ZSBzaG91bGQgY29tcGFyZSB0byB0aGUgZmluYWwgcmVzdWx0ICh1cmxBZnRlclJlZGlyZWN0cykuXG4gICAgY29uc3QgbGFzdE5hdmlnYXRpb25VcmwgPSAobGFzdE5hdmlnYXRpb25TdWNjZWVkZWQgfHwgdGhpcy5jdXJyZW50TmF2aWdhdGlvbikgP1xuICAgICAgICBsYXN0TmF2aWdhdGlvbi5yYXdVcmwgOlxuICAgICAgICBsYXN0TmF2aWdhdGlvbi51cmxBZnRlclJlZGlyZWN0cztcbiAgICBjb25zdCBkdXBsaWNhdGVOYXYgPSBsYXN0TmF2aWdhdGlvblVybC50b1N0cmluZygpID09PSByYXdVcmwudG9TdHJpbmcoKTtcbiAgICBpZiAoYnJvd3Nlck5hdlByZWNlZGVkQnlSb3V0ZXJOYXYgJiYgZHVwbGljYXRlTmF2KSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpOyAgLy8gcmV0dXJuIHZhbHVlIGlzIG5vdCB1c2VkXG4gICAgfVxuXG4gICAgbGV0IHJlc29sdmU6IGFueTtcbiAgICBsZXQgcmVqZWN0OiBhbnk7XG4gICAgbGV0IHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj47XG4gICAgaWYgKHByaW9yUHJvbWlzZSkge1xuICAgICAgcmVzb2x2ZSA9IHByaW9yUHJvbWlzZS5yZXNvbHZlO1xuICAgICAgcmVqZWN0ID0gcHJpb3JQcm9taXNlLnJlamVjdDtcbiAgICAgIHByb21pc2UgPSBwcmlvclByb21pc2UucHJvbWlzZTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBwcm9taXNlID0gbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlcywgcmVqKSA9PiB7XG4gICAgICAgIHJlc29sdmUgPSByZXM7XG4gICAgICAgIHJlamVjdCA9IHJlajtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGlkID0gKyt0aGlzLm5hdmlnYXRpb25JZDtcbiAgICB0aGlzLnNldFRyYW5zaXRpb24oe1xuICAgICAgaWQsXG4gICAgICBzb3VyY2UsXG4gICAgICByZXN0b3JlZFN0YXRlLFxuICAgICAgY3VycmVudFVybFRyZWU6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBjdXJyZW50UmF3VXJsOiB0aGlzLnJhd1VybFRyZWUsXG4gICAgICByYXdVcmwsXG4gICAgICBleHRyYXMsXG4gICAgICByZXNvbHZlLFxuICAgICAgcmVqZWN0LFxuICAgICAgcHJvbWlzZSxcbiAgICAgIGN1cnJlbnRTbmFwc2hvdDogdGhpcy5yb3V0ZXJTdGF0ZS5zbmFwc2hvdCxcbiAgICAgIGN1cnJlbnRSb3V0ZXJTdGF0ZTogdGhpcy5yb3V0ZXJTdGF0ZVxuICAgIH0pO1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoYXQgdGhlIGVycm9yIGlzIHByb3BhZ2F0ZWQgZXZlbiB0aG91Z2ggYHByb2Nlc3NOYXZpZ2F0aW9uc2AgY2F0Y2hcbiAgICAvLyBoYW5kbGVyIGRvZXMgbm90IHJldGhyb3dcbiAgICByZXR1cm4gcHJvbWlzZS5jYXRjaCgoZTogYW55KSA9PiB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHNldEJyb3dzZXJVcmwoXG4gICAgICB1cmw6IFVybFRyZWUsIHJlcGxhY2VVcmw6IGJvb2xlYW4sIGlkOiBudW1iZXIsIHN0YXRlPzoge1trZXk6IHN0cmluZ106IGFueX0pIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICAgIHN0YXRlID0gc3RhdGUgfHwge307XG4gICAgaWYgKHRoaXMubG9jYXRpb24uaXNDdXJyZW50UGF0aEVxdWFsVG8ocGF0aCkgfHwgcmVwbGFjZVVybCkge1xuICAgICAgLy8gVE9ETyhqYXNvbmFkZW4pOiBSZW1vdmUgZmlyc3QgYG5hdmlnYXRpb25JZGAgYW5kIHJlbHkgb24gYG5nYCBuYW1lc3BhY2UuXG4gICAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShwYXRoLCAnJywgey4uLnN0YXRlLCBuYXZpZ2F0aW9uSWQ6IGlkfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubG9jYXRpb24uZ28ocGF0aCwgJycsIHsuLi5zdGF0ZSwgbmF2aWdhdGlvbklkOiBpZH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRTdGF0ZUFuZFVybChzdG9yZWRTdGF0ZTogUm91dGVyU3RhdGUsIHN0b3JlZFVybDogVXJsVHJlZSwgcmF3VXJsOiBVcmxUcmVlKTogdm9pZCB7XG4gICAgKHRoaXMgYXMge3JvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZX0pLnJvdXRlclN0YXRlID0gc3RvcmVkU3RhdGU7XG4gICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IHN0b3JlZFVybDtcbiAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodGhpcy5jdXJyZW50VXJsVHJlZSwgcmF3VXJsKTtcbiAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTogdm9pZCB7XG4gICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUoXG4gICAgICAgIHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodGhpcy5yYXdVcmxUcmVlKSwgJycsIHtuYXZpZ2F0aW9uSWQ6IHRoaXMubGFzdFN1Y2Nlc3NmdWxJZH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHM6IHN0cmluZ1tdKTogdm9pZCB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29tbWFuZHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjbWQgPSBjb21tYW5kc1tpXTtcbiAgICBpZiAoY21kID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIHJlcXVlc3RlZCBwYXRoIGNvbnRhaW5zICR7Y21kfSBzZWdtZW50IGF0IGluZGV4ICR7aX1gKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==