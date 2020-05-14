/**
 * @fileoverview added by tsickle
 * Generated from: packages/router/src/router.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Location } from '@angular/common';
import { Compiler, Injectable, Injector, isDevMode, NgModuleFactoryLoader, NgModuleRef, NgZone, ɵConsole as Console } from '@angular/core';
import { BehaviorSubject, EMPTY, of, Subject } from 'rxjs';
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
import { ChildrenOutletContexts } from './router_outlet_context';
import { createEmptyState } from './router_state';
import { isNavigationCancelingError, navigationCancelingError } from './shared';
import { DefaultUrlHandlingStrategy } from './url_handling_strategy';
import { containsTree, createEmptyUrlTree, UrlSerializer } from './url_tree';
import { getAllRouteGuards } from './utils/preactivation';
import { isUrlTree } from './utils/type_guards';
import * as i0 from "@angular/core";
import * as i1 from "./url_tree";
import * as i2 from "./router_outlet_context";
import * as i3 from "@angular/common";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * \@description
 *
 * Options that modify the navigation strategy.
 *
 * \@publicApi
 * @record
 */
export function NavigationExtras() { }
if (false) {
    /**
     * Specifies a root URI to use for relative navigation.
     *
     * For example, consider the following route configuration where the parent route
     * has two children.
     *
     * ```
     * [{
     *   path: 'parent',
     *   component: ParentComponent,
     *   children: [{
     *     path: 'list',
     *     component: ListComponent
     *   },{
     *     path: 'child',
     *     component: ChildComponent
     *   }]
     * }]
     * ```
     *
     * The following `go()` function navigates to the `list` route by
     * interpreting the destination URI as relative to the activated `child`  route
     *
     * ```
     * \@Component({...})
     *  class ChildComponent {
     *    constructor(private router: Router, private route: ActivatedRoute) {}
     *
     *    go() {
     *      this.router.navigate(['../list'], { relativeTo: this.route });
     *    }
     *  }
     * ```
     * @type {?|undefined}
     */
    NavigationExtras.prototype.relativeTo;
    /**
     * Sets query parameters to the URL.
     *
     * ```
     * // Navigate to /results?page=1
     * this.router.navigate(['/results'], { queryParams: { page: 1 } });
     * ```
     * @type {?|undefined}
     */
    NavigationExtras.prototype.queryParams;
    /**
     * Sets the hash fragment for the URL.
     *
     * ```
     * // Navigate to /results#top
     * this.router.navigate(['/results'], { fragment: 'top' });
     * ```
     * @type {?|undefined}
     */
    NavigationExtras.prototype.fragment;
    /**
     * **DEPRECATED**: Use `queryParamsHandling: "preserve"` instead to preserve
     * query parameters for the next navigation.
     *
     * @deprecated since v4
     * @type {?|undefined}
     */
    NavigationExtras.prototype.preserveQueryParams;
    /**
     * How to handle query parameters in the router link for the next navigation.
     * One of:
     * * `merge` : Merge new with current parameters.
     * * `preserve` : Preserve current parameters.
     *
     * ```
     * // from /results?page=1 to /view?page=1&page=2
     * this.router.navigate(['/view'], { queryParams: { page: 2 },  queryParamsHandling: "merge" });
     * ```
     * @type {?|undefined}
     */
    NavigationExtras.prototype.queryParamsHandling;
    /**
     * When true, preserves the URL fragment for the next navigation
     *
     * ```
     * // Preserve fragment from /results#top to /view#top
     * this.router.navigate(['/view'], { preserveFragment: true });
     * ```
     * @type {?|undefined}
     */
    NavigationExtras.prototype.preserveFragment;
    /**
     * When true, navigates without pushing a new state into history.
     *
     * ```
     * // Navigate silently to /view
     * this.router.navigate(['/view'], { skipLocationChange: true });
     * ```
     * @type {?|undefined}
     */
    NavigationExtras.prototype.skipLocationChange;
    /**
     * When true, navigates while replacing the current state in history.
     *
     * ```
     * // Navigate to /view
     * this.router.navigate(['/view'], { replaceUrl: true });
     * ```
     * @type {?|undefined}
     */
    NavigationExtras.prototype.replaceUrl;
    /**
     * Developer-defined state that can be passed to any navigation.
     * Access this value through the `Navigation.extras` object
     * returned from `router.getCurrentNavigation()` while a navigation is executing.
     *
     * After a navigation completes, the router writes an object containing this
     * value together with a `navigationId` to `history.state`.
     * The value is written when `location.go()` or `location.replaceState()`
     * is called before activating this route.
     *
     * Note that `history.state` does not pass an object equality test because
     * the router adds the `navigationId` on each navigation.
     * @type {?|undefined}
     */
    NavigationExtras.prototype.state;
}
/**
 * @param {?} error
 * @return {?}
 */
function defaultErrorHandler(error) {
    throw error;
}
/**
 * @param {?} error
 * @param {?} urlSerializer
 * @param {?} url
 * @return {?}
 */
function defaultMalformedUriErrorHandler(error, urlSerializer, url) {
    return urlSerializer.parse('/');
}
/**
 * \@internal
 * @param {?} snapshot
 * @param {?} runExtras
 * @return {?}
 */
function defaultRouterHook(snapshot, runExtras) {
    return (/** @type {?} */ (of(null)));
}
/**
 * \@description
 *
 * A service that provides navigation and URL manipulation capabilities.
 *
 * @see `Route`.
 * @see [Routing and Navigation Guide](guide/router).
 *
 * \@ngModule RouterModule
 *
 * \@publicApi
 */
let Router = /** @class */ (() => {
    /**
     * \@description
     *
     * A service that provides navigation and URL manipulation capabilities.
     *
     * @see `Route`.
     * @see [Routing and Navigation Guide](guide/router).
     *
     * \@ngModule RouterModule
     *
     * \@publicApi
     */
    class Router {
        /**
         * Creates the router service.
         * @param {?} rootComponentType
         * @param {?} urlSerializer
         * @param {?} rootContexts
         * @param {?} location
         * @param {?} injector
         * @param {?} loader
         * @param {?} compiler
         * @param {?} config
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
             * \@internal
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
            /** @type {?} */
            const onLoadStart = (/**
             * @param {?} r
             * @return {?}
             */
            (r) => this.triggerEvent(new RouteConfigLoadStart(r)));
            /** @type {?} */
            const onLoadEnd = (/**
             * @param {?} r
             * @return {?}
             */
            (r) => this.triggerEvent(new RouteConfigLoadEnd(r)));
            this.ngModule = injector.get(NgModuleRef);
            this.console = injector.get(Console);
            /** @type {?} */
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
        /**
         * @private
         * @param {?} transitions
         * @return {?}
         */
        setupNavigations(transitions) {
            /** @type {?} */
            const eventsSubject = ((/** @type {?} */ (this.events)));
            return (/** @type {?} */ ((/** @type {?} */ (transitions.pipe(filter((/**
             * @param {?} t
             * @return {?}
             */
            t => t.id !== 0)), 
            // Extract URL
            map((/**
             * @param {?} t
             * @return {?}
             */
            t => ((/** @type {?} */ (Object.assign(Object.assign({}, t), { extractedUrl: this.urlHandlingStrategy.extract(t.rawUrl) })))))), 
            // Using switchMap so we cancel executing navigations when a new one comes in
            switchMap((/**
             * @param {?} t
             * @return {?}
             */
            t => {
                /** @type {?} */
                let completed = false;
                /** @type {?} */
                let errored = false;
                return of(t).pipe(
                // Store the Navigation object
                tap((/**
                 * @param {?} t
                 * @return {?}
                 */
                t => {
                    this.currentNavigation = {
                        id: t.id,
                        initialUrl: t.currentRawUrl,
                        extractedUrl: t.extractedUrl,
                        trigger: t.source,
                        extras: t.extras,
                        previousNavigation: this.lastSuccessfulNavigation ? Object.assign(Object.assign({}, this.lastSuccessfulNavigation), { previousNavigation: null }) :
                            null
                    };
                })), switchMap((/**
                 * @param {?} t
                 * @return {?}
                 */
                t => {
                    /** @type {?} */
                    const urlTransition = !this.navigated ||
                        t.extractedUrl.toString() !== this.browserUrlTree.toString();
                    /** @type {?} */
                    const processCurrentUrl = (this.onSameUrlNavigation === 'reload' ? true : urlTransition) &&
                        this.urlHandlingStrategy.shouldProcessUrl(t.rawUrl);
                    if (processCurrentUrl) {
                        return of(t).pipe(
                        // Fire NavigationStart event
                        switchMap((/**
                         * @param {?} t
                         * @return {?}
                         */
                        t => {
                            /** @type {?} */
                            const transition = this.transitions.getValue();
                            eventsSubject.next(new NavigationStart(t.id, this.serializeUrl(t.extractedUrl), t.source, t.restoredState));
                            if (transition !== this.transitions.getValue()) {
                                return EMPTY;
                            }
                            return [t];
                        })), 
                        // This delay is required to match old behavior that forced navigation
                        // to always be async
                        switchMap((/**
                         * @param {?} t
                         * @return {?}
                         */
                        t => Promise.resolve(t))), 
                        // ApplyRedirects
                        applyRedirects(this.ngModule.injector, this.configLoader, this.urlSerializer, this.config), 
                        // Update the currentNavigation
                        tap((/**
                         * @param {?} t
                         * @return {?}
                         */
                        t => {
                            this.currentNavigation = Object.assign(Object.assign({}, (/** @type {?} */ (this.currentNavigation))), { finalUrl: t.urlAfterRedirects });
                        })), 
                        // Recognize
                        recognize(this.rootComponentType, this.config, (/**
                         * @param {?} url
                         * @return {?}
                         */
                        (url) => this.serializeUrl(url)), this.paramsInheritanceStrategy, this.relativeLinkResolution), 
                        // Update URL if in `eager` update mode
                        tap((/**
                         * @param {?} t
                         * @return {?}
                         */
                        t => {
                            if (this.urlUpdateStrategy === 'eager') {
                                if (!t.extras.skipLocationChange) {
                                    this.setBrowserUrl(t.urlAfterRedirects, !!t.extras.replaceUrl, t.id, t.extras.state);
                                }
                                this.browserUrlTree = t.urlAfterRedirects;
                            }
                        })), 
                        // Fire RoutesRecognized
                        tap((/**
                         * @param {?} t
                         * @return {?}
                         */
                        t => {
                            /** @type {?} */
                            const routesRecognized = new RoutesRecognized(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(t.urlAfterRedirects), (/** @type {?} */ (t.targetSnapshot)));
                            eventsSubject.next(routesRecognized);
                        })));
                    }
                    else {
                        /** @type {?} */
                        const processPreviousUrl = urlTransition && this.rawUrlTree &&
                            this.urlHandlingStrategy.shouldProcessUrl(this.rawUrlTree);
                        /* When the current URL shouldn't be processed, but the previous one was,
                         * we handle this "error condition" by navigating to the previously
                         * successful URL, but leaving the URL intact.*/
                        if (processPreviousUrl) {
                            const { id, extractedUrl, source, restoredState, extras } = t;
                            /** @type {?} */
                            const navStart = new NavigationStart(id, this.serializeUrl(extractedUrl), source, restoredState);
                            eventsSubject.next(navStart);
                            /** @type {?} */
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
                })), 
                // Before Preactivation
                switchTap((/**
                 * @param {?} t
                 * @return {?}
                 */
                t => {
                    const { targetSnapshot, id: navigationId, extractedUrl: appliedUrlTree, rawUrl: rawUrlTree, extras: { skipLocationChange, replaceUrl } } = t;
                    return this.hooks.beforePreactivation((/** @type {?} */ (targetSnapshot)), {
                        navigationId,
                        appliedUrlTree,
                        rawUrlTree,
                        skipLocationChange: !!skipLocationChange,
                        replaceUrl: !!replaceUrl,
                    });
                })), 
                // --- GUARDS ---
                tap((/**
                 * @param {?} t
                 * @return {?}
                 */
                t => {
                    /** @type {?} */
                    const guardsStart = new GuardsCheckStart(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(t.urlAfterRedirects), (/** @type {?} */ (t.targetSnapshot)));
                    this.triggerEvent(guardsStart);
                })), map((/**
                 * @param {?} t
                 * @return {?}
                 */
                t => (Object.assign(Object.assign({}, t), { guards: getAllRouteGuards((/** @type {?} */ (t.targetSnapshot)), t.currentSnapshot, this.rootContexts) })))), checkGuards(this.ngModule.injector, (/**
                 * @param {?} evt
                 * @return {?}
                 */
                (evt) => this.triggerEvent(evt))), tap((/**
                 * @param {?} t
                 * @return {?}
                 */
                t => {
                    if (isUrlTree(t.guardsResult)) {
                        /** @type {?} */
                        const error = navigationCancelingError(`Redirecting to "${this.serializeUrl(t.guardsResult)}"`);
                        error.url = t.guardsResult;
                        throw error;
                    }
                })), tap((/**
                 * @param {?} t
                 * @return {?}
                 */
                t => {
                    /** @type {?} */
                    const guardsEnd = new GuardsCheckEnd(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(t.urlAfterRedirects), (/** @type {?} */ (t.targetSnapshot)), !!t.guardsResult);
                    this.triggerEvent(guardsEnd);
                })), filter((/**
                 * @param {?} t
                 * @return {?}
                 */
                t => {
                    if (!t.guardsResult) {
                        this.resetUrlToCurrentUrlTree();
                        /** @type {?} */
                        const navCancel = new NavigationCancel(t.id, this.serializeUrl(t.extractedUrl), '');
                        eventsSubject.next(navCancel);
                        t.resolve(false);
                        return false;
                    }
                    return true;
                })), 
                // --- RESOLVE ---
                switchTap((/**
                 * @param {?} t
                 * @return {?}
                 */
                t => {
                    if (t.guards.canActivateChecks.length) {
                        return of(t).pipe(tap((/**
                         * @param {?} t
                         * @return {?}
                         */
                        t => {
                            /** @type {?} */
                            const resolveStart = new ResolveStart(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(t.urlAfterRedirects), (/** @type {?} */ (t.targetSnapshot)));
                            this.triggerEvent(resolveStart);
                        })), switchMap((/**
                         * @param {?} t
                         * @return {?}
                         */
                        t => {
                            /** @type {?} */
                            let dataResolved = false;
                            return of(t).pipe(resolveData(this.paramsInheritanceStrategy, this.ngModule.injector), tap({
                                next: (/**
                                 * @return {?}
                                 */
                                () => dataResolved = true),
                                complete: (/**
                                 * @return {?}
                                 */
                                () => {
                                    if (!dataResolved) {
                                        /** @type {?} */
                                        const navCancel = new NavigationCancel(t.id, this.serializeUrl(t.extractedUrl), `At least one route resolver didn't emit any value.`);
                                        eventsSubject.next(navCancel);
                                        t.resolve(false);
                                    }
                                })
                            }));
                        })), tap((/**
                         * @param {?} t
                         * @return {?}
                         */
                        t => {
                            /** @type {?} */
                            const resolveEnd = new ResolveEnd(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(t.urlAfterRedirects), (/** @type {?} */ (t.targetSnapshot)));
                            this.triggerEvent(resolveEnd);
                        })));
                    }
                    return undefined;
                })), 
                // --- AFTER PREACTIVATION ---
                switchTap((/**
                 * @param {?} t
                 * @return {?}
                 */
                (t) => {
                    const { targetSnapshot, id: navigationId, extractedUrl: appliedUrlTree, rawUrl: rawUrlTree, extras: { skipLocationChange, replaceUrl } } = t;
                    return this.hooks.afterPreactivation((/** @type {?} */ (targetSnapshot)), {
                        navigationId,
                        appliedUrlTree,
                        rawUrlTree,
                        skipLocationChange: !!skipLocationChange,
                        replaceUrl: !!replaceUrl,
                    });
                })), map((/**
                 * @param {?} t
                 * @return {?}
                 */
                (t) => {
                    /** @type {?} */
                    const targetRouterState = createRouterState(this.routeReuseStrategy, (/** @type {?} */ (t.targetSnapshot)), t.currentRouterState);
                    return (Object.assign(Object.assign({}, t), { targetRouterState }));
                })), 
                /* Once here, we are about to activate syncronously. The assumption is this
                   will succeed, and user code may read from the Router service. Therefore
                   before activation, we need to update router properties storing the current
                   URL and the RouterState, as well as updated the browser URL. All this should
                   happen *before* activating. */
                tap((/**
                 * @param {?} t
                 * @return {?}
                 */
                (t) => {
                    this.currentUrlTree = t.urlAfterRedirects;
                    this.rawUrlTree =
                        this.urlHandlingStrategy.merge(this.currentUrlTree, t.rawUrl);
                    ((/** @type {?} */ (this))).routerState = (/** @type {?} */ (t.targetRouterState));
                    if (this.urlUpdateStrategy === 'deferred') {
                        if (!t.extras.skipLocationChange) {
                            this.setBrowserUrl(this.rawUrlTree, !!t.extras.replaceUrl, t.id, t.extras.state);
                        }
                        this.browserUrlTree = t.urlAfterRedirects;
                    }
                })), activateRoutes(this.rootContexts, this.routeReuseStrategy, (/**
                 * @param {?} evt
                 * @return {?}
                 */
                (evt) => this.triggerEvent(evt))), tap({
                    /**
                     * @return {?}
                     */
                    next() {
                        completed = true;
                    },
                    /**
                     * @return {?}
                     */
                    complete() {
                        completed = true;
                    }
                }), finalize((/**
                 * @return {?}
                 */
                () => {
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
                        /** @type {?} */
                        const navCancel = new NavigationCancel(t.id, this.serializeUrl(t.extractedUrl), `Navigation ID ${t.id} is not equal to the current navigation id ${this.navigationId}`);
                        eventsSubject.next(navCancel);
                        t.resolve(false);
                    }
                    // currentNavigation should always be reset to null here. If navigation was
                    // successful, lastSuccessfulTransition will have already been set. Therefore
                    // we can safely set currentNavigation to null here.
                    this.currentNavigation = null;
                })), catchError((/**
                 * @param {?} e
                 * @return {?}
                 */
                (e) => {
                    errored = true;
                    /* This error type is issued during Redirect, and is handled as a
                     * cancellation rather than an error. */
                    if (isNavigationCancelingError(e)) {
                        /** @type {?} */
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
                        /** @type {?} */
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
                            setTimeout((/**
                             * @return {?}
                             */
                            () => {
                                /** @type {?} */
                                const mergedTree = this.urlHandlingStrategy.merge(e.url, this.rawUrlTree);
                                /** @type {?} */
                                const extras = {
                                    skipLocationChange: t.extras.skipLocationChange,
                                    replaceUrl: this.urlUpdateStrategy === 'eager'
                                };
                                return this.scheduleNavigation(mergedTree, 'imperative', null, extras, { resolve: t.resolve, reject: t.reject, promise: t.promise });
                            }), 0);
                        }
                        /* All other errors should reset to the router's internal URL reference to
                         * the pre-error state. */
                    }
                    else {
                        this.resetStateAndUrl(t.currentRouterState, t.currentUrlTree, t.rawUrl);
                        /** @type {?} */
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
                })));
                // TODO(jasonaden): remove cast once g3 is on updated TypeScript
            })))))));
        }
        /**
         * \@internal
         * TODO: this should be removed once the constructor of the router made internal
         * @param {?} rootComponentType
         * @return {?}
         */
        resetRootComponentType(rootComponentType) {
            this.rootComponentType = rootComponentType;
            // TODO: vsavkin router 4.0 should make the root component set to null
            // this will simplify the lifecycle of the router.
            this.routerState.root.component = this.rootComponentType;
        }
        /**
         * @private
         * @return {?}
         */
        getTransition() {
            /** @type {?} */
            const transition = this.transitions.value;
            // This value needs to be set. Other values such as extractedUrl are set on initial navigation
            // but the urlAfterRedirects may not get set if we aren't processing the new URL *and* not
            // processing the previous URL.
            transition.urlAfterRedirects = this.browserUrlTree;
            return transition;
        }
        /**
         * @private
         * @param {?} t
         * @return {?}
         */
        setTransition(t) {
            this.transitions.next(Object.assign(Object.assign({}, this.getTransition()), t));
        }
        /**
         * Sets up the location change listener and performs the initial navigation.
         * @return {?}
         */
        initialNavigation() {
            this.setUpLocationChangeListener();
            if (this.navigationId === 0) {
                this.navigateByUrl(this.location.path(true), { replaceUrl: true });
            }
        }
        /**
         * Sets up the location change listener.
         * @return {?}
         */
        setUpLocationChangeListener() {
            // Don't need to use Zone.wrap any more, because zone.js
            // already patch onPopState, so location change callback will
            // run into ngZone
            if (!this.locationSubscription) {
                this.locationSubscription = (/** @type {?} */ (this.location.subscribe((/**
                 * @param {?} change
                 * @return {?}
                 */
                (change) => {
                    /** @type {?} */
                    let rawUrlTree = this.parseUrl(change['url']);
                    /** @type {?} */
                    const source = change['type'] === 'popstate' ? 'popstate' : 'hashchange';
                    // Navigations coming from Angular router have a navigationId state property. When this
                    // exists, restore the state.
                    /** @type {?} */
                    const state = change.state && change.state.navigationId ? change.state : null;
                    setTimeout((/**
                     * @return {?}
                     */
                    () => {
                        this.scheduleNavigation(rawUrlTree, source, state, { replaceUrl: true });
                    }), 0);
                }))));
            }
        }
        /**
         * The current URL.
         * @return {?}
         */
        get url() {
            return this.serializeUrl(this.currentUrlTree);
        }
        /**
         * The current Navigation object if one exists
         * @return {?}
         */
        getCurrentNavigation() {
            return this.currentNavigation;
        }
        /**
         * \@internal
         * @param {?} event
         * @return {?}
         */
        triggerEvent(event) {
            ((/** @type {?} */ (this.events))).next(event);
        }
        /**
         * Resets the configuration used for navigation and generating links.
         *
         * \@usageNotes
         *
         * ```
         * router.resetConfig([
         *  { path: 'team/:id', component: TeamCmp, children: [
         *    { path: 'simple', component: SimpleCmp },
         *    { path: 'user/:name', component: UserCmp }
         *  ]}
         * ]);
         * ```
         * @param {?} config The route array for the new configuration.
         *
         * @return {?}
         */
        resetConfig(config) {
            validateConfig(config);
            this.config = config.map(standardizeConfig);
            this.navigated = false;
            this.lastSuccessfulId = -1;
        }
        /**
         * \@docsNotRequired
         * @return {?}
         */
        ngOnDestroy() {
            this.dispose();
        }
        /**
         * Disposes of the router.
         * @return {?}
         */
        dispose() {
            if (this.locationSubscription) {
                this.locationSubscription.unsubscribe();
                this.locationSubscription = (/** @type {?} */ (null));
            }
        }
        /**
         * Applies an array of commands to the current URL tree and creates a new URL tree.
         *
         * When given an activated route, applies the given commands starting from the route.
         * Otherwise, applies the given command starting from the root.
         *
         * \@usageNotes
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
         * @param {?} commands An array of commands to apply.
         * @param {?=} navigationExtras Options that control the navigation strategy. This function
         * only utilizes properties in `NavigationExtras` that would change the provided URL.
         * @return {?} The new URL tree.
         *
         */
        createUrlTree(commands, navigationExtras = {}) {
            const { relativeTo, queryParams, fragment, preserveQueryParams, queryParamsHandling, preserveFragment } = navigationExtras;
            if (isDevMode() && preserveQueryParams && (/** @type {?} */ (console)) && (/** @type {?} */ (console.warn))) {
                console.warn('preserveQueryParams is deprecated, use queryParamsHandling instead.');
            }
            /** @type {?} */
            const a = relativeTo || this.routerState.root;
            /** @type {?} */
            const f = preserveFragment ? this.currentUrlTree.fragment : fragment;
            /** @type {?} */
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
            return createUrlTree(a, this.currentUrlTree, commands, (/** @type {?} */ (q)), (/** @type {?} */ (f)));
        }
        /**
         * Navigate based on the provided URL, which must be absolute.
         *
         * \@usageNotes
         *
         * ```
         * router.navigateByUrl("/team/33/user/11");
         *
         * // Navigate without updating the URL
         * router.navigateByUrl("/team/33/user/11", { skipLocationChange: true });
         * ```
         *
         * @param {?} url An absolute URL. The function does not apply any delta to the current URL.
         * @param {?=} extras An object containing properties that modify the navigation strategy.
         * The function ignores any properties in the `NavigationExtras` that would change the
         * provided URL.
         *
         * @return {?} A Promise that resolves to 'true' when navigation succeeds,
         * to 'false' when navigation fails, or is rejected on error.
         *
         */
        navigateByUrl(url, extras = { skipLocationChange: false }) {
            if (isDevMode() && this.isNgZoneEnabled && !NgZone.isInAngularZone()) {
                this.console.warn(`Navigation triggered outside Angular zone, did you forget to call 'ngZone.run()'?`);
            }
            /** @type {?} */
            const urlTree = isUrlTree(url) ? url : this.parseUrl(url);
            /** @type {?} */
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
         * \@usageNotes
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
         *
         * In order to affect this browser's `history.state` entry, the `state`
         * parameter can be passed. This must be an object because the router
         * will add the `navigationId` property to this object before creating
         * the new history item.
         * @param {?} commands
         * @param {?=} extras
         * @return {?}
         */
        navigate(commands, extras = { skipLocationChange: false }) {
            validateCommands(commands);
            return this.navigateByUrl(this.createUrlTree(commands, extras), extras);
        }
        /**
         * Serializes a `UrlTree` into a string
         * @param {?} url
         * @return {?}
         */
        serializeUrl(url) {
            return this.urlSerializer.serialize(url);
        }
        /**
         * Parses a string into a `UrlTree`
         * @param {?} url
         * @return {?}
         */
        parseUrl(url) {
            /** @type {?} */
            let urlTree;
            try {
                urlTree = this.urlSerializer.parse(url);
            }
            catch (e) {
                urlTree = this.malformedUriErrorHandler(e, this.urlSerializer, url);
            }
            return urlTree;
        }
        /**
         * Returns whether the url is activated
         * @param {?} url
         * @param {?} exact
         * @return {?}
         */
        isActive(url, exact) {
            if (isUrlTree(url)) {
                return containsTree(this.currentUrlTree, url, exact);
            }
            /** @type {?} */
            const urlTree = this.parseUrl(url);
            return containsTree(this.currentUrlTree, urlTree, exact);
        }
        /**
         * @private
         * @param {?} params
         * @return {?}
         */
        removeEmptyProps(params) {
            return Object.keys(params).reduce((/**
             * @param {?} result
             * @param {?} key
             * @return {?}
             */
            (result, key) => {
                /** @type {?} */
                const value = params[key];
                if (value !== null && value !== undefined) {
                    result[key] = value;
                }
                return result;
            }), {});
        }
        /**
         * @private
         * @return {?}
         */
        processNavigations() {
            this.navigations.subscribe((/**
             * @param {?} t
             * @return {?}
             */
            t => {
                this.navigated = true;
                this.lastSuccessfulId = t.id;
                ((/** @type {?} */ (this.events)))
                    .next(new NavigationEnd(t.id, this.serializeUrl(t.extractedUrl), this.serializeUrl(this.currentUrlTree)));
                this.lastSuccessfulNavigation = this.currentNavigation;
                this.currentNavigation = null;
                t.resolve(true);
            }), (/**
             * @param {?} e
             * @return {?}
             */
            e => {
                this.console.warn(`Unhandled Navigation Error: `);
            }));
        }
        /**
         * @private
         * @param {?} rawUrl
         * @param {?} source
         * @param {?} restoredState
         * @param {?} extras
         * @param {?=} priorPromise
         * @return {?}
         */
        scheduleNavigation(rawUrl, source, restoredState, extras, priorPromise) {
            /** @type {?} */
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
            /** @type {?} */
            let resolve;
            /** @type {?} */
            let reject;
            /** @type {?} */
            let promise;
            if (priorPromise) {
                resolve = priorPromise.resolve;
                reject = priorPromise.reject;
                promise = priorPromise.promise;
            }
            else {
                promise = new Promise((/**
                 * @param {?} res
                 * @param {?} rej
                 * @return {?}
                 */
                (res, rej) => {
                    resolve = res;
                    reject = rej;
                }));
            }
            /** @type {?} */
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
            return promise.catch((/**
             * @param {?} e
             * @return {?}
             */
            (e) => {
                return Promise.reject(e);
            }));
        }
        /**
         * @private
         * @param {?} url
         * @param {?} replaceUrl
         * @param {?} id
         * @param {?=} state
         * @return {?}
         */
        setBrowserUrl(url, replaceUrl, id, state) {
            /** @type {?} */
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
        /**
         * @private
         * @param {?} storedState
         * @param {?} storedUrl
         * @param {?} rawUrl
         * @return {?}
         */
        resetStateAndUrl(storedState, storedUrl, rawUrl) {
            ((/** @type {?} */ (this))).routerState = storedState;
            this.currentUrlTree = storedUrl;
            this.rawUrlTree = this.urlHandlingStrategy.merge(this.currentUrlTree, rawUrl);
            this.resetUrlToCurrentUrlTree();
        }
        /**
         * @private
         * @return {?}
         */
        resetUrlToCurrentUrlTree() {
            this.location.replaceState(this.urlSerializer.serialize(this.rawUrlTree), '', { navigationId: this.lastSuccessfulId });
        }
    }
    Router.decorators = [
        { type: Injectable },
    ];
    /** @nocollapse */
    Router.ctorParameters = () => [
        { type: undefined },
        { type: UrlSerializer },
        { type: ChildrenOutletContexts },
        { type: Location },
        { type: Injector },
        { type: NgModuleFactoryLoader },
        { type: Compiler },
        { type: undefined }
    ];
    /** @nocollapse */ Router.ɵfac = function Router_Factory(t) { i0.ɵɵinvalidFactory(); };
    /** @nocollapse */ Router.ɵprov = i0.ɵɵdefineInjectable({ token: Router, factory: Router.ɵfac });
    return Router;
})();
export { Router };
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(Router, [{
        type: Injectable
    }], function () { return [{ type: i0.Type }, { type: i1.UrlSerializer }, { type: i2.ChildrenOutletContexts }, { type: i3.Location }, { type: i0.Injector }, { type: i0.NgModuleFactoryLoader }, { type: i0.Compiler }, { type: undefined }]; }, null); })();
if (false) {
    /**
     * @type {?}
     * @private
     */
    Router.prototype.currentUrlTree;
    /**
     * @type {?}
     * @private
     */
    Router.prototype.rawUrlTree;
    /**
     * @type {?}
     * @private
     */
    Router.prototype.browserUrlTree;
    /**
     * @type {?}
     * @private
     */
    Router.prototype.transitions;
    /**
     * @type {?}
     * @private
     */
    Router.prototype.navigations;
    /**
     * @type {?}
     * @private
     */
    Router.prototype.lastSuccessfulNavigation;
    /**
     * @type {?}
     * @private
     */
    Router.prototype.currentNavigation;
    /**
     * @type {?}
     * @private
     */
    Router.prototype.locationSubscription;
    /**
     * @type {?}
     * @private
     */
    Router.prototype.navigationId;
    /**
     * @type {?}
     * @private
     */
    Router.prototype.configLoader;
    /**
     * @type {?}
     * @private
     */
    Router.prototype.ngModule;
    /**
     * @type {?}
     * @private
     */
    Router.prototype.console;
    /**
     * @type {?}
     * @private
     */
    Router.prototype.isNgZoneEnabled;
    /**
     * An event stream for routing events in this NgModule.
     * @type {?}
     */
    Router.prototype.events;
    /**
     * The current state of routing in this NgModule.
     * @type {?}
     */
    Router.prototype.routerState;
    /**
     * A handler for navigation errors in this NgModule.
     * @type {?}
     */
    Router.prototype.errorHandler;
    /**
     * A handler for errors thrown by `Router.parseUrl(url)`
     * when `url` contains an invalid character.
     * The most common case is a `%` sign
     * that's not encoded and is not part of a percent encoded sequence.
     * @type {?}
     */
    Router.prototype.malformedUriErrorHandler;
    /**
     * True if at least one navigation event has occurred,
     * false otherwise.
     * @type {?}
     */
    Router.prototype.navigated;
    /**
     * @type {?}
     * @private
     */
    Router.prototype.lastSuccessfulId;
    /**
     * Hooks that enable you to pause navigation,
     * either before or after the preactivation phase.
     * Used by `RouterModule`.
     *
     * \@internal
     * @type {?}
     */
    Router.prototype.hooks;
    /**
     * A strategy for extracting and merging URLs.
     * Used for AngularJS to Angular migrations.
     * @type {?}
     */
    Router.prototype.urlHandlingStrategy;
    /**
     * A strategy for re-using routes.
     * @type {?}
     */
    Router.prototype.routeReuseStrategy;
    /**
     * How to handle a navigation request to the current URL. One of:
     * - `'ignore'` :  The router ignores the request.
     * - `'reload'` : The router reloads the URL. Use to implement a "refresh" feature.
     * @type {?}
     */
    Router.prototype.onSameUrlNavigation;
    /**
     * How to merge parameters, data, and resolved data from parent to child
     * routes. One of:
     *
     * - `'emptyOnly'` : Inherit parent parameters, data, and resolved data
     * for path-less or component-less routes.
     * - `'always'` : Inherit parent parameters, data, and resolved data
     * for all child routes.
     * @type {?}
     */
    Router.prototype.paramsInheritanceStrategy;
    /**
     * Determines when the router updates the browser URL.
     * By default (`"deferred"`), updates the browser URL after navigation has finished.
     * Set to `'eager'` to update the browser URL at the beginning of navigation.
     * You can choose to update early so that, if navigation fails,
     * you can show an error message with the URL that failed.
     * @type {?}
     */
    Router.prototype.urlUpdateStrategy;
    /**
     * Enables a bug fix that corrects relative link resolution in components with empty paths.
     * @see `RouterModule`
     * @type {?}
     */
    Router.prototype.relativeLinkResolution;
    /**
     * @type {?}
     * @private
     */
    Router.prototype.rootComponentType;
    /**
     * @type {?}
     * @private
     */
    Router.prototype.urlSerializer;
    /**
     * @type {?}
     * @private
     */
    Router.prototype.rootContexts;
    /**
     * @type {?}
     * @private
     */
    Router.prototype.location;
    /** @type {?} */
    Router.prototype.config;
}
/**
 * @param {?} commands
 * @return {?}
 */
function validateCommands(commands) {
    for (let i = 0; i < commands.length; i++) {
        /** @type {?} */
        const cmd = commands[i];
        if (cmd == null) {
            throw new Error(`The requested path contains ${cmd} segment at index ${i}`);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFRQSxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDekMsT0FBTyxFQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFRLFFBQVEsSUFBSSxPQUFPLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDL0ksT0FBTyxFQUFDLGVBQWUsRUFBRSxLQUFLLEVBQWMsRUFBRSxFQUFFLE9BQU8sRUFBZSxNQUFNLE1BQU0sQ0FBQztBQUNuRixPQUFPLEVBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUVqRixPQUFPLEVBQXFDLGlCQUFpQixFQUFFLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUMvRixPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUN4RCxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDaEQsT0FBTyxFQUFRLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBcUIsVUFBVSxFQUFFLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3TyxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNyRCxPQUFP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RDs7Ozs7Ozs7O0lBUzlELG1DQUFtRDs7Ozs7O0lBTW5ELHdDQUF3RDs7Ozs7SUFPcEQsbUNBQXlDOzs7OztJQUFFLCtCQUFvQzs7Ozs7SUFDL0UsOEJBQTRDOzs7OztJQUFFLDBCQUEwQjs7SUFDckIsd0JBQXFCOzs7Ozs7QUE2eUI5RSxTQUFTLGdCQUFnQixDQUFDLFFBQWtCO0lBQzFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFOztjQUNsQyxHQUFHLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN2QixJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDZixNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixHQUFHLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQzdFO0tBQ0Y7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtDb21waWxlciwgSW5qZWN0YWJsZSwgSW5qZWN0b3IsIGlzRGV2TW9kZSwgTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBOZ01vZHVsZVJlZiwgTmdab25lLCBUeXBlLCDJtUNvbnNvbGUgYXMgQ29uc29sZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0JlaGF2aW9yU3ViamVjdCwgRU1QVFksIE9ic2VydmFibGUsIG9mLCBTdWJqZWN0LCBTdWJzY3JpcHRpb259IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjYXRjaEVycm9yLCBmaWx0ZXIsIGZpbmFsaXplLCBtYXAsIHN3aXRjaE1hcCwgdGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7UXVlcnlQYXJhbXNIYW5kbGluZywgUm91dGUsIFJvdXRlcywgc3RhbmRhcmRpemVDb25maWcsIHZhbGlkYXRlQ29uZmlnfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge2NyZWF0ZVJvdXRlclN0YXRlfSBmcm9tICcuL2NyZWF0ZV9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtjcmVhdGVVcmxUcmVlfSBmcm9tICcuL2NyZWF0ZV91cmxfdHJlZSc7XG5pbXBvcnQge0V2ZW50LCBHdWFyZHNDaGVja0VuZCwgR3VhcmRzQ2hlY2tTdGFydCwgTmF2aWdhdGlvbkNhbmNlbCwgTmF2aWdhdGlvbkVuZCwgTmF2aWdhdGlvbkVycm9yLCBOYXZpZ2F0aW9uU3RhcnQsIE5hdmlnYXRpb25UcmlnZ2VyLCBSZXNvbHZlRW5kLCBSZXNvbHZlU3RhcnQsIFJvdXRlQ29uZmlnTG9hZEVuZCwgUm91dGVDb25maWdMb2FkU3RhcnQsIFJvdXRlc1JlY29nbml6ZWR9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7YWN0aXZhdGVSb3V0ZXN9IGZyb20gJy4vb3BlcmF0b3JzL2FjdGl2YXRlX3JvdXRlcyc7XG5pbXBvcnQge2FwcGx5UmVkaXJlY3RzfSBmcm9tICcuL29wZXJhdG9ycy9hcHBseV9yZWRpcmVjdHMnO1xuaW1wb3J0IHtjaGVja0d1YXJkc30gZnJvbSAnLi9vcGVyYXRvcnMvY2hlY2tfZ3VhcmRzJztcbmltcG9ydCB7cmVjb2duaXplfSBmcm9tICcuL29wZXJhdG9ycy9yZWNvZ25pemUnO1xuaW1wb3J0IHtyZXNvbHZlRGF0YX0gZnJvbSAnLi9vcGVyYXRvcnMvcmVzb2x2ZV9kYXRhJztcbmltcG9ydCB7c3dpdGNoVGFwfSBmcm9tICcuL29wZXJhdG9ycy9zd2l0Y2hfdGFwJztcbmltcG9ydCB7RGVmYXVsdFJvdXRlUmV1c2VTdHJhdGVneSwgUm91dGVSZXVzZVN0cmF0ZWd5fSBmcm9tICcuL3JvdXRlX3JldXNlX3N0cmF0ZWd5JztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0c30gZnJvbSAnLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZSwgY3JlYXRlRW1wdHlTdGF0ZSwgUm91dGVyU3RhdGUsIFJvdXRlclN0YXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7aXNOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IsIG5hdmlnYXRpb25DYW5jZWxpbmdFcnJvciwgUGFyYW1zfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge0RlZmF1bHRVcmxIYW5kbGluZ1N0cmF0ZWd5LCBVcmxIYW5kbGluZ1N0cmF0ZWd5fSBmcm9tICcuL3VybF9oYW5kbGluZ19zdHJhdGVneSc7XG5pbXBvcnQge2NvbnRhaW5zVHJlZSwgY3JlYXRlRW1wdHlVcmxUcmVlLCBVcmxTZXJpYWxpemVyLCBVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcbmltcG9ydCB7Q2hlY2tzLCBnZXRBbGxSb3V0ZUd1YXJkc30gZnJvbSAnLi91dGlscy9wcmVhY3RpdmF0aW9uJztcbmltcG9ydCB7aXNVcmxUcmVlfSBmcm9tICcuL3V0aWxzL3R5cGVfZ3VhcmRzJztcblxuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogT3B0aW9ucyB0aGF0IG1vZGlmeSB0aGUgbmF2aWdhdGlvbiBzdHJhdGVneS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmF2aWdhdGlvbkV4dHJhcyB7XG4gIC8qKlxuICAgKiBTcGVjaWZpZXMgYSByb290IFVSSSB0byB1c2UgZm9yIHJlbGF0aXZlIG5hdmlnYXRpb24uXG4gICAqXG4gICAqIEZvciBleGFtcGxlLCBjb25zaWRlciB0aGUgZm9sbG93aW5nIHJvdXRlIGNvbmZpZ3VyYXRpb24gd2hlcmUgdGhlIHBhcmVudCByb3V0ZVxuICAgKiBoYXMgdHdvIGNoaWxkcmVuLlxuICAgKlxuICAgKiBgYGBcbiAgICogW3tcbiAgICogICBwYXRoOiAncGFyZW50JyxcbiAgICogICBjb21wb25lbnQ6IFBhcmVudENvbXBvbmVudCxcbiAgICogICBjaGlsZHJlbjogW3tcbiAgICogICAgIHBhdGg6ICdsaXN0JyxcbiAgICogICAgIGNvbXBvbmVudDogTGlzdENvbXBvbmVudFxuICAgKiAgIH0se1xuICAgKiAgICAgcGF0aDogJ2NoaWxkJyxcbiAgICogICAgIGNvbXBvbmVudDogQ2hpbGRDb21wb25lbnRcbiAgICogICB9XVxuICAgKiB9XVxuICAgKiBgYGBcbiAgICpcbiAgICogVGhlIGZvbGxvd2luZyBgZ28oKWAgZnVuY3Rpb24gbmF2aWdhdGVzIHRvIHRoZSBgbGlzdGAgcm91dGUgYnlcbiAgICogaW50ZXJwcmV0aW5nIHRoZSBkZXN0aW5hdGlvbiBVUkkgYXMgcmVsYXRpdmUgdG8gdGhlIGFjdGl2YXRlZCBgY2hpbGRgICByb3V0ZVxuICAgKlxuICAgKiBgYGBcbiAgICogIEBDb21wb25lbnQoey4uLn0pXG4gICAqICBjbGFzcyBDaGlsZENvbXBvbmVudCB7XG4gICAqICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsIHByaXZhdGUgcm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7fVxuICAgKlxuICAgKiAgICBnbygpIHtcbiAgICogICAgICB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy4uL2xpc3QnXSwgeyByZWxhdGl2ZVRvOiB0aGlzLnJvdXRlIH0pO1xuICAgKiAgICB9XG4gICAqICB9XG4gICAqIGBgYFxuICAgKi9cbiAgcmVsYXRpdmVUbz86IEFjdGl2YXRlZFJvdXRlfG51bGw7XG5cbiAgLyoqXG4gICAqIFNldHMgcXVlcnkgcGFyYW1ldGVycyB0byB0aGUgVVJMLlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgdG8gL3Jlc3VsdHM/cGFnZT0xXG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3Jlc3VsdHMnXSwgeyBxdWVyeVBhcmFtczogeyBwYWdlOiAxIH0gfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcXVlcnlQYXJhbXM/OiBQYXJhbXN8bnVsbDtcblxuICAvKipcbiAgICogU2V0cyB0aGUgaGFzaCBmcmFnbWVudCBmb3IgdGhlIFVSTC5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHRvIC9yZXN1bHRzI3RvcFxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy9yZXN1bHRzJ10sIHsgZnJhZ21lbnQ6ICd0b3AnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGZyYWdtZW50Pzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiAqKkRFUFJFQ0FURUQqKjogVXNlIGBxdWVyeVBhcmFtc0hhbmRsaW5nOiBcInByZXNlcnZlXCJgIGluc3RlYWQgdG8gcHJlc2VydmVcbiAgICogcXVlcnkgcGFyYW1ldGVycyBmb3IgdGhlIG5leHQgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgc2luY2UgdjRcbiAgICovXG4gIHByZXNlcnZlUXVlcnlQYXJhbXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gaGFuZGxlIHF1ZXJ5IHBhcmFtZXRlcnMgaW4gdGhlIHJvdXRlciBsaW5rIGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uLlxuICAgKiBPbmUgb2Y6XG4gICAqICogYG1lcmdlYCA6IE1lcmdlIG5ldyB3aXRoIGN1cnJlbnQgcGFyYW1ldGVycy5cbiAgICogKiBgcHJlc2VydmVgIDogUHJlc2VydmUgY3VycmVudCBwYXJhbWV0ZXJzLlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gZnJvbSAvcmVzdWx0cz9wYWdlPTEgdG8gL3ZpZXc/cGFnZT0xJnBhZ2U9MlxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgcXVlcnlQYXJhbXM6IHsgcGFnZTogMiB9LCAgcXVlcnlQYXJhbXNIYW5kbGluZzogXCJtZXJnZVwiIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHF1ZXJ5UGFyYW1zSGFuZGxpbmc/OiBRdWVyeVBhcmFtc0hhbmRsaW5nfG51bGw7XG4gIC8qKlxuICAgKiBXaGVuIHRydWUsIHByZXNlcnZlcyB0aGUgVVJMIGZyYWdtZW50IGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBQcmVzZXJ2ZSBmcmFnbWVudCBmcm9tIC9yZXN1bHRzI3RvcCB0byAvdmlldyN0b3BcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHByZXNlcnZlRnJhZ21lbnQ6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcHJlc2VydmVGcmFnbWVudD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXaGVuIHRydWUsIG5hdmlnYXRlcyB3aXRob3V0IHB1c2hpbmcgYSBuZXcgc3RhdGUgaW50byBoaXN0b3J5LlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gTmF2aWdhdGUgc2lsZW50bHkgdG8gL3ZpZXdcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqL1xuICBza2lwTG9jYXRpb25DaGFuZ2U/OiBib29sZWFuO1xuICAvKipcbiAgICogV2hlbiB0cnVlLCBuYXZpZ2F0ZXMgd2hpbGUgcmVwbGFjaW5nIHRoZSBjdXJyZW50IHN0YXRlIGluIGhpc3RvcnkuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvdmlld1xuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgcmVwbGFjZVVybDogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqL1xuICByZXBsYWNlVXJsPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIERldmVsb3Blci1kZWZpbmVkIHN0YXRlIHRoYXQgY2FuIGJlIHBhc3NlZCB0byBhbnkgbmF2aWdhdGlvbi5cbiAgICogQWNjZXNzIHRoaXMgdmFsdWUgdGhyb3VnaCB0aGUgYE5hdmlnYXRpb24uZXh0cmFzYCBvYmplY3RcbiAgICogcmV0dXJuZWQgZnJvbSBgcm91dGVyLmdldEN1cnJlbnROYXZpZ2F0aW9uKClgIHdoaWxlIGEgbmF2aWdhdGlvbiBpcyBleGVjdXRpbmcuXG4gICAqXG4gICAqIEFmdGVyIGEgbmF2aWdhdGlvbiBjb21wbGV0ZXMsIHRoZSByb3V0ZXIgd3JpdGVzIGFuIG9iamVjdCBjb250YWluaW5nIHRoaXNcbiAgICogdmFsdWUgdG9nZXRoZXIgd2l0aCBhIGBuYXZpZ2F0aW9uSWRgIHRvIGBoaXN0b3J5LnN0YXRlYC5cbiAgICogVGhlIHZhbHVlIGlzIHdyaXR0ZW4gd2hlbiBgbG9jYXRpb24uZ28oKWAgb3IgYGxvY2F0aW9uLnJlcGxhY2VTdGF0ZSgpYFxuICAgKiBpcyBjYWxsZWQgYmVmb3JlIGFjdGl2YXRpbmcgdGhpcyByb3V0ZS5cbiAgICpcbiAgICogTm90ZSB0aGF0IGBoaXN0b3J5LnN0YXRlYCBkb2VzIG5vdCBwYXNzIGFuIG9iamVjdCBlcXVhbGl0eSB0ZXN0IGJlY2F1c2VcbiAgICogdGhlIHJvdXRlciBhZGRzIHRoZSBgbmF2aWdhdGlvbklkYCBvbiBlYWNoIG5hdmlnYXRpb24uXG4gICAqL1xuICBzdGF0ZT86IHtbazogc3RyaW5nXTogYW55fTtcbn1cblxuLyoqXG4gKiBFcnJvciBoYW5kbGVyIHRoYXQgaXMgaW52b2tlZCB3aGVuIGEgbmF2aWdhdGlvbiBlcnJvciBvY2N1cnMuXG4gKlxuICogSWYgdGhlIGhhbmRsZXIgcmV0dXJucyBhIHZhbHVlLCB0aGUgbmF2aWdhdGlvbiBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhpcyB2YWx1ZS5cbiAqIElmIHRoZSBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb24sIHRoZSBuYXZpZ2F0aW9uIHByb21pc2UgaXMgcmVqZWN0ZWQgd2l0aFxuICogdGhlIGV4Y2VwdGlvbi5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIEVycm9ySGFuZGxlciA9IChlcnJvcjogYW55KSA9PiBhbnk7XG5cbmZ1bmN0aW9uIGRlZmF1bHRFcnJvckhhbmRsZXIoZXJyb3I6IGFueSk6IGFueSB7XG4gIHRocm93IGVycm9yO1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0TWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyKFxuICAgIGVycm9yOiBVUklFcnJvciwgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgdXJsOiBzdHJpbmcpOiBVcmxUcmVlIHtcbiAgcmV0dXJuIHVybFNlcmlhbGl6ZXIucGFyc2UoJy8nKTtcbn1cblxuZXhwb3J0IHR5cGUgUmVzdG9yZWRTdGF0ZSA9IHtcbiAgW2s6IHN0cmluZ106IGFueTsgbmF2aWdhdGlvbklkOiBudW1iZXI7XG59O1xuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IGEgbmF2aWdhdGlvbiBvcGVyYXRpb24uIFJldHJpZXZlIHRoZSBtb3N0IHJlY2VudFxuICogbmF2aWdhdGlvbiBvYmplY3Qgd2l0aCB0aGUgYHJvdXRlci5nZXRDdXJyZW50TmF2aWdhdGlvbigpYCBtZXRob2QuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBOYXZpZ2F0aW9uID0ge1xuICAvKipcbiAgICogVGhlIElEIG9mIHRoZSBjdXJyZW50IG5hdmlnYXRpb24uXG4gICAqL1xuICBpZDogbnVtYmVyO1xuICAvKipcbiAgICogVGhlIHRhcmdldCBVUkwgcGFzc2VkIGludG8gdGhlIGBSb3V0ZXIjbmF2aWdhdGVCeVVybCgpYCBjYWxsIGJlZm9yZSBuYXZpZ2F0aW9uLiBUaGlzIGlzXG4gICAqIHRoZSB2YWx1ZSBiZWZvcmUgdGhlIHJvdXRlciBoYXMgcGFyc2VkIG9yIGFwcGxpZWQgcmVkaXJlY3RzIHRvIGl0LlxuICAgKi9cbiAgaW5pdGlhbFVybDogc3RyaW5nIHwgVXJsVHJlZTtcbiAgLyoqXG4gICAqIFRoZSBpbml0aWFsIHRhcmdldCBVUkwgYWZ0ZXIgYmVpbmcgcGFyc2VkIHdpdGggYFVybFNlcmlhbGl6ZXIuZXh0cmFjdCgpYC5cbiAgICovXG4gIGV4dHJhY3RlZFVybDogVXJsVHJlZTtcbiAgLyoqXG4gICAqIFRoZSBleHRyYWN0ZWQgVVJMIGFmdGVyIHJlZGlyZWN0cyBoYXZlIGJlZW4gYXBwbGllZC5cbiAgICogVGhpcyBVUkwgbWF5IG5vdCBiZSBhdmFpbGFibGUgaW1tZWRpYXRlbHksIHRoZXJlZm9yZSB0aGlzIHByb3BlcnR5IGNhbiBiZSBgdW5kZWZpbmVkYC5cbiAgICogSXQgaXMgZ3VhcmFudGVlZCB0byBiZSBzZXQgYWZ0ZXIgdGhlIGBSb3V0ZXNSZWNvZ25pemVkYCBldmVudCBmaXJlcy5cbiAgICovXG4gIGZpbmFsVXJsPzogVXJsVHJlZTtcbiAgLyoqXG4gICAqIElkZW50aWZpZXMgaG93IHRoaXMgbmF2aWdhdGlvbiB3YXMgdHJpZ2dlcmVkLlxuICAgKlxuICAgKiAqICdpbXBlcmF0aXZlJy0tVHJpZ2dlcmVkIGJ5IGByb3V0ZXIubmF2aWdhdGVCeVVybGAgb3IgYHJvdXRlci5uYXZpZ2F0ZWAuXG4gICAqICogJ3BvcHN0YXRlJy0tVHJpZ2dlcmVkIGJ5IGEgcG9wc3RhdGUgZXZlbnQuXG4gICAqICogJ2hhc2hjaGFuZ2UnLS1UcmlnZ2VyZWQgYnkgYSBoYXNoY2hhbmdlIGV2ZW50LlxuICAgKi9cbiAgdHJpZ2dlcjogJ2ltcGVyYXRpdmUnIHwgJ3BvcHN0YXRlJyB8ICdoYXNoY2hhbmdlJztcbiAgLyoqXG4gICAqIE9wdGlvbnMgdGhhdCBjb250cm9sbGVkIHRoZSBzdHJhdGVneSB1c2VkIGZvciB0aGlzIG5hdmlnYXRpb24uXG4gICAqIFNlZSBgTmF2aWdhdGlvbkV4dHJhc2AuXG4gICAqL1xuICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXM7XG4gIC8qKlxuICAgKiBUaGUgcHJldmlvdXNseSBzdWNjZXNzZnVsIGBOYXZpZ2F0aW9uYCBvYmplY3QuIE9ubHkgb25lIHByZXZpb3VzIG5hdmlnYXRpb25cbiAgICogaXMgYXZhaWxhYmxlLCB0aGVyZWZvcmUgdGhpcyBwcmV2aW91cyBgTmF2aWdhdGlvbmAgb2JqZWN0IGhhcyBhIGBudWxsYCB2YWx1ZVxuICAgKiBmb3IgaXRzIG93biBgcHJldmlvdXNOYXZpZ2F0aW9uYC5cbiAgICovXG4gIHByZXZpb3VzTmF2aWdhdGlvbjogTmF2aWdhdGlvbiB8IG51bGw7XG59O1xuXG5leHBvcnQgdHlwZSBOYXZpZ2F0aW9uVHJhbnNpdGlvbiA9IHtcbiAgaWQ6IG51bWJlcixcbiAgY3VycmVudFVybFRyZWU6IFVybFRyZWUsXG4gIGN1cnJlbnRSYXdVcmw6IFVybFRyZWUsXG4gIGV4dHJhY3RlZFVybDogVXJsVHJlZSxcbiAgdXJsQWZ0ZXJSZWRpcmVjdHM6IFVybFRyZWUsXG4gIHJhd1VybDogVXJsVHJlZSxcbiAgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzLFxuICByZXNvbHZlOiBhbnksXG4gIHJlamVjdDogYW55LFxuICBwcm9taXNlOiBQcm9taXNlPGJvb2xlYW4+LFxuICBzb3VyY2U6IE5hdmlnYXRpb25UcmlnZ2VyLFxuICByZXN0b3JlZFN0YXRlOiBSZXN0b3JlZFN0YXRlfG51bGwsXG4gIGN1cnJlbnRTbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCxcbiAgdGFyZ2V0U25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3R8bnVsbCxcbiAgY3VycmVudFJvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZSxcbiAgdGFyZ2V0Um91dGVyU3RhdGU6IFJvdXRlclN0YXRlfG51bGwsXG4gIGd1YXJkczogQ2hlY2tzLFxuICBndWFyZHNSZXN1bHQ6IGJvb2xlYW58VXJsVHJlZXxudWxsLFxufTtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IHR5cGUgUm91dGVySG9vayA9IChzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCwgcnVuRXh0cmFzOiB7XG4gIGFwcGxpZWRVcmxUcmVlOiBVcmxUcmVlLFxuICByYXdVcmxUcmVlOiBVcmxUcmVlLFxuICBza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW4sXG4gIHJlcGxhY2VVcmw6IGJvb2xlYW4sXG4gIG5hdmlnYXRpb25JZDogbnVtYmVyXG59KSA9PiBPYnNlcnZhYmxlPHZvaWQ+O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBkZWZhdWx0Um91dGVySG9vayhzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCwgcnVuRXh0cmFzOiB7XG4gIGFwcGxpZWRVcmxUcmVlOiBVcmxUcmVlLFxuICByYXdVcmxUcmVlOiBVcmxUcmVlLFxuICBza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW4sXG4gIHJlcGxhY2VVcmw6IGJvb2xlYW4sXG4gIG5hdmlnYXRpb25JZDogbnVtYmVyXG59KTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gIHJldHVybiBvZihudWxsKSBhcyBhbnk7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQSBzZXJ2aWNlIHRoYXQgcHJvdmlkZXMgbmF2aWdhdGlvbiBhbmQgVVJMIG1hbmlwdWxhdGlvbiBjYXBhYmlsaXRpZXMuXG4gKlxuICogQHNlZSBgUm91dGVgLlxuICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBHdWlkZV0oZ3VpZGUvcm91dGVyKS5cbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgUm91dGVyIHtcbiAgcHJpdmF0ZSBjdXJyZW50VXJsVHJlZTogVXJsVHJlZTtcbiAgcHJpdmF0ZSByYXdVcmxUcmVlOiBVcmxUcmVlO1xuICBwcml2YXRlIGJyb3dzZXJVcmxUcmVlOiBVcmxUcmVlO1xuICBwcml2YXRlIHJlYWRvbmx5IHRyYW5zaXRpb25zOiBCZWhhdmlvclN1YmplY3Q8TmF2aWdhdGlvblRyYW5zaXRpb24+O1xuICBwcml2YXRlIG5hdmlnYXRpb25zOiBPYnNlcnZhYmxlPE5hdmlnYXRpb25UcmFuc2l0aW9uPjtcbiAgcHJpdmF0ZSBsYXN0U3VjY2Vzc2Z1bE5hdmlnYXRpb246IE5hdmlnYXRpb258bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgY3VycmVudE5hdmlnYXRpb246IE5hdmlnYXRpb258bnVsbCA9IG51bGw7XG5cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgbG9jYXRpb25TdWJzY3JpcHRpb24hOiBTdWJzY3JpcHRpb247XG4gIHByaXZhdGUgbmF2aWdhdGlvbklkOiBudW1iZXIgPSAwO1xuICBwcml2YXRlIGNvbmZpZ0xvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyO1xuICBwcml2YXRlIG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+O1xuICBwcml2YXRlIGNvbnNvbGU6IENvbnNvbGU7XG4gIHByaXZhdGUgaXNOZ1pvbmVFbmFibGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEFuIGV2ZW50IHN0cmVhbSBmb3Igcm91dGluZyBldmVudHMgaW4gdGhpcyBOZ01vZHVsZS5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBldmVudHM6IE9ic2VydmFibGU8RXZlbnQ+ID0gbmV3IFN1YmplY3Q8RXZlbnQ+KCk7XG4gIC8qKlxuICAgKiBUaGUgY3VycmVudCBzdGF0ZSBvZiByb3V0aW5nIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgcm91dGVyU3RhdGU6IFJvdXRlclN0YXRlO1xuXG4gIC8qKlxuICAgKiBBIGhhbmRsZXIgZm9yIG5hdmlnYXRpb24gZXJyb3JzIGluIHRoaXMgTmdNb2R1bGUuXG4gICAqL1xuICBlcnJvckhhbmRsZXI6IEVycm9ySGFuZGxlciA9IGRlZmF1bHRFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIEEgaGFuZGxlciBmb3IgZXJyb3JzIHRocm93biBieSBgUm91dGVyLnBhcnNlVXJsKHVybClgXG4gICAqIHdoZW4gYHVybGAgY29udGFpbnMgYW4gaW52YWxpZCBjaGFyYWN0ZXIuXG4gICAqIFRoZSBtb3N0IGNvbW1vbiBjYXNlIGlzIGEgYCVgIHNpZ25cbiAgICogdGhhdCdzIG5vdCBlbmNvZGVkIGFuZCBpcyBub3QgcGFydCBvZiBhIHBlcmNlbnQgZW5jb2RlZCBzZXF1ZW5jZS5cbiAgICovXG4gIG1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcjpcbiAgICAgIChlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgICAgdXJsOiBzdHJpbmcpID0+IFVybFRyZWUgPSBkZWZhdWx0TWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyO1xuXG4gIC8qKlxuICAgKiBUcnVlIGlmIGF0IGxlYXN0IG9uZSBuYXZpZ2F0aW9uIGV2ZW50IGhhcyBvY2N1cnJlZCxcbiAgICogZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgbmF2aWdhdGVkOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgbGFzdFN1Y2Nlc3NmdWxJZDogbnVtYmVyID0gLTE7XG5cbiAgLyoqXG4gICAqIEhvb2tzIHRoYXQgZW5hYmxlIHlvdSB0byBwYXVzZSBuYXZpZ2F0aW9uLFxuICAgKiBlaXRoZXIgYmVmb3JlIG9yIGFmdGVyIHRoZSBwcmVhY3RpdmF0aW9uIHBoYXNlLlxuICAgKiBVc2VkIGJ5IGBSb3V0ZXJNb2R1bGVgLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGhvb2tzOiB7XG4gICAgYmVmb3JlUHJlYWN0aXZhdGlvbjogUm91dGVySG9vayxcbiAgICBhZnRlclByZWFjdGl2YXRpb246IFJvdXRlckhvb2tcbiAgfSA9IHtiZWZvcmVQcmVhY3RpdmF0aW9uOiBkZWZhdWx0Um91dGVySG9vaywgYWZ0ZXJQcmVhY3RpdmF0aW9uOiBkZWZhdWx0Um91dGVySG9va307XG5cbiAgLyoqXG4gICAqIEEgc3RyYXRlZ3kgZm9yIGV4dHJhY3RpbmcgYW5kIG1lcmdpbmcgVVJMcy5cbiAgICogVXNlZCBmb3IgQW5ndWxhckpTIHRvIEFuZ3VsYXIgbWlncmF0aW9ucy5cbiAgICovXG4gIHVybEhhbmRsaW5nU3RyYXRlZ3k6IFVybEhhbmRsaW5nU3RyYXRlZ3kgPSBuZXcgRGVmYXVsdFVybEhhbmRsaW5nU3RyYXRlZ3koKTtcblxuICAvKipcbiAgICogQSBzdHJhdGVneSBmb3IgcmUtdXNpbmcgcm91dGVzLlxuICAgKi9cbiAgcm91dGVSZXVzZVN0cmF0ZWd5OiBSb3V0ZVJldXNlU3RyYXRlZ3kgPSBuZXcgRGVmYXVsdFJvdXRlUmV1c2VTdHJhdGVneSgpO1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gaGFuZGxlIGEgbmF2aWdhdGlvbiByZXF1ZXN0IHRvIHRoZSBjdXJyZW50IFVSTC4gT25lIG9mOlxuICAgKiAtIGAnaWdub3JlJ2AgOiAgVGhlIHJvdXRlciBpZ25vcmVzIHRoZSByZXF1ZXN0LlxuICAgKiAtIGAncmVsb2FkJ2AgOiBUaGUgcm91dGVyIHJlbG9hZHMgdGhlIFVSTC4gVXNlIHRvIGltcGxlbWVudCBhIFwicmVmcmVzaFwiIGZlYXR1cmUuXG4gICAqL1xuICBvblNhbWVVcmxOYXZpZ2F0aW9uOiAncmVsb2FkJ3wnaWdub3JlJyA9ICdpZ25vcmUnO1xuXG4gIC8qKlxuICAgKiBIb3cgdG8gbWVyZ2UgcGFyYW1ldGVycywgZGF0YSwgYW5kIHJlc29sdmVkIGRhdGEgZnJvbSBwYXJlbnQgdG8gY2hpbGRcbiAgICogcm91dGVzLiBPbmUgb2Y6XG4gICAqXG4gICAqIC0gYCdlbXB0eU9ubHknYCA6IEluaGVyaXQgcGFyZW50IHBhcmFtZXRlcnMsIGRhdGEsIGFuZCByZXNvbHZlZCBkYXRhXG4gICAqIGZvciBwYXRoLWxlc3Mgb3IgY29tcG9uZW50LWxlc3Mgcm91dGVzLlxuICAgKiAtIGAnYWx3YXlzJ2AgOiBJbmhlcml0IHBhcmVudCBwYXJhbWV0ZXJzLCBkYXRhLCBhbmQgcmVzb2x2ZWQgZGF0YVxuICAgKiBmb3IgYWxsIGNoaWxkIHJvdXRlcy5cbiAgICovXG4gIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6ICdlbXB0eU9ubHknfCdhbHdheXMnID0gJ2VtcHR5T25seSc7XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgd2hlbiB0aGUgcm91dGVyIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMLlxuICAgKiBCeSBkZWZhdWx0IChgXCJkZWZlcnJlZFwiYCksIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMIGFmdGVyIG5hdmlnYXRpb24gaGFzIGZpbmlzaGVkLlxuICAgKiBTZXQgdG8gYCdlYWdlcidgIHRvIHVwZGF0ZSB0aGUgYnJvd3NlciBVUkwgYXQgdGhlIGJlZ2lubmluZyBvZiBuYXZpZ2F0aW9uLlxuICAgKiBZb3UgY2FuIGNob29zZSB0byB1cGRhdGUgZWFybHkgc28gdGhhdCwgaWYgbmF2aWdhdGlvbiBmYWlscyxcbiAgICogeW91IGNhbiBzaG93IGFuIGVycm9yIG1lc3NhZ2Ugd2l0aCB0aGUgVVJMIHRoYXQgZmFpbGVkLlxuICAgKi9cbiAgdXJsVXBkYXRlU3RyYXRlZ3k6ICdkZWZlcnJlZCd8J2VhZ2VyJyA9ICdkZWZlcnJlZCc7XG5cbiAgLyoqXG4gICAqIEVuYWJsZXMgYSBidWcgZml4IHRoYXQgY29ycmVjdHMgcmVsYXRpdmUgbGluayByZXNvbHV0aW9uIGluIGNvbXBvbmVudHMgd2l0aCBlbXB0eSBwYXRocy5cbiAgICogQHNlZSBgUm91dGVyTW9kdWxlYFxuICAgKi9cbiAgcmVsYXRpdmVMaW5rUmVzb2x1dGlvbjogJ2xlZ2FjeSd8J2NvcnJlY3RlZCcgPSAnbGVnYWN5JztcblxuICAvKipcbiAgICogQ3JlYXRlcyB0aGUgcm91dGVyIHNlcnZpY2UuXG4gICAqL1xuICAvLyBUT0RPOiB2c2F2a2luIG1ha2UgaW50ZXJuYWwgYWZ0ZXIgdGhlIGZpbmFsIGlzIG91dC5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT58bnVsbCwgcHJpdmF0ZSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgICAgcHJpdmF0ZSByb290Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIHByaXZhdGUgbG9jYXRpb246IExvY2F0aW9uLCBpbmplY3RvcjogSW5qZWN0b3IsXG4gICAgICBsb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLCBwdWJsaWMgY29uZmlnOiBSb3V0ZXMpIHtcbiAgICBjb25zdCBvbkxvYWRTdGFydCA9IChyOiBSb3V0ZSkgPT4gdGhpcy50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZFN0YXJ0KHIpKTtcbiAgICBjb25zdCBvbkxvYWRFbmQgPSAocjogUm91dGUpID0+IHRoaXMudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRFbmQocikpO1xuXG4gICAgdGhpcy5uZ01vZHVsZSA9IGluamVjdG9yLmdldChOZ01vZHVsZVJlZik7XG4gICAgdGhpcy5jb25zb2xlID0gaW5qZWN0b3IuZ2V0KENvbnNvbGUpO1xuICAgIGNvbnN0IG5nWm9uZSA9IGluamVjdG9yLmdldChOZ1pvbmUpO1xuICAgIHRoaXMuaXNOZ1pvbmVFbmFibGVkID0gbmdab25lIGluc3RhbmNlb2YgTmdab25lO1xuXG4gICAgdGhpcy5yZXNldENvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSBjcmVhdGVFbXB0eVVybFRyZWUoKTtcbiAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLmN1cnJlbnRVcmxUcmVlO1xuICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0aGlzLmN1cnJlbnRVcmxUcmVlO1xuXG4gICAgdGhpcy5jb25maWdMb2FkZXIgPSBuZXcgUm91dGVyQ29uZmlnTG9hZGVyKGxvYWRlciwgY29tcGlsZXIsIG9uTG9hZFN0YXJ0LCBvbkxvYWRFbmQpO1xuICAgIHRoaXMucm91dGVyU3RhdGUgPSBjcmVhdGVFbXB0eVN0YXRlKHRoaXMuY3VycmVudFVybFRyZWUsIHRoaXMucm9vdENvbXBvbmVudFR5cGUpO1xuXG4gICAgdGhpcy50cmFuc2l0aW9ucyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8TmF2aWdhdGlvblRyYW5zaXRpb24+KHtcbiAgICAgIGlkOiAwLFxuICAgICAgY3VycmVudFVybFRyZWU6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBjdXJyZW50UmF3VXJsOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgZXh0cmFjdGVkVXJsOiB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuZXh0cmFjdCh0aGlzLmN1cnJlbnRVcmxUcmVlKSxcbiAgICAgIHVybEFmdGVyUmVkaXJlY3RzOiB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuZXh0cmFjdCh0aGlzLmN1cnJlbnRVcmxUcmVlKSxcbiAgICAgIHJhd1VybDogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIGV4dHJhczoge30sXG4gICAgICByZXNvbHZlOiBudWxsLFxuICAgICAgcmVqZWN0OiBudWxsLFxuICAgICAgcHJvbWlzZTogUHJvbWlzZS5yZXNvbHZlKHRydWUpLFxuICAgICAgc291cmNlOiAnaW1wZXJhdGl2ZScsXG4gICAgICByZXN0b3JlZFN0YXRlOiBudWxsLFxuICAgICAgY3VycmVudFNuYXBzaG90OiB0aGlzLnJvdXRlclN0YXRlLnNuYXBzaG90LFxuICAgICAgdGFyZ2V0U25hcHNob3Q6IG51bGwsXG4gICAgICBjdXJyZW50Um91dGVyU3RhdGU6IHRoaXMucm91dGVyU3RhdGUsXG4gICAgICB0YXJnZXRSb3V0ZXJTdGF0ZTogbnVsbCxcbiAgICAgIGd1YXJkczoge2NhbkFjdGl2YXRlQ2hlY2tzOiBbXSwgY2FuRGVhY3RpdmF0ZUNoZWNrczogW119LFxuICAgICAgZ3VhcmRzUmVzdWx0OiBudWxsLFxuICAgIH0pO1xuICAgIHRoaXMubmF2aWdhdGlvbnMgPSB0aGlzLnNldHVwTmF2aWdhdGlvbnModGhpcy50cmFuc2l0aW9ucyk7XG5cbiAgICB0aGlzLnByb2Nlc3NOYXZpZ2F0aW9ucygpO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXR1cE5hdmlnYXRpb25zKHRyYW5zaXRpb25zOiBPYnNlcnZhYmxlPE5hdmlnYXRpb25UcmFuc2l0aW9uPik6XG4gICAgICBPYnNlcnZhYmxlPE5hdmlnYXRpb25UcmFuc2l0aW9uPiB7XG4gICAgY29uc3QgZXZlbnRzU3ViamVjdCA9ICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50Pik7XG4gICAgcmV0dXJuIHRyYW5zaXRpb25zLnBpcGUoXG4gICAgICAgICAgICAgICBmaWx0ZXIodCA9PiB0LmlkICE9PSAwKSxcblxuICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBVUkxcbiAgICAgICAgICAgICAgIG1hcCh0ID0+XG4gICAgICAgICAgICAgICAgICAgICAgICh7Li4udCwgZXh0cmFjdGVkVXJsOiB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuZXh0cmFjdCh0LnJhd1VybCl9IGFzXG4gICAgICAgICAgICAgICAgICAgICAgICBOYXZpZ2F0aW9uVHJhbnNpdGlvbikpLFxuXG4gICAgICAgICAgICAgICAvLyBVc2luZyBzd2l0Y2hNYXAgc28gd2UgY2FuY2VsIGV4ZWN1dGluZyBuYXZpZ2F0aW9ucyB3aGVuIGEgbmV3IG9uZSBjb21lcyBpblxuICAgICAgICAgICAgICAgc3dpdGNoTWFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICBsZXQgY29tcGxldGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgIGxldCBlcnJvcmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgIHJldHVybiBvZih0KS5waXBlKFxuICAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgdGhlIE5hdmlnYXRpb24gb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudE5hdmlnYXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHQuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgaW5pdGlhbFVybDogdC5jdXJyZW50UmF3VXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhY3RlZFVybDogdC5leHRyYWN0ZWRVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgdHJpZ2dlcjogdC5zb3VyY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFzOiB0LmV4dHJhcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c05hdmlnYXRpb246IHRoaXMubGFzdFN1Y2Nlc3NmdWxOYXZpZ2F0aW9uID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgey4uLnRoaXMubGFzdFN1Y2Nlc3NmdWxOYXZpZ2F0aW9uLCBwcmV2aW91c05hdmlnYXRpb246IG51bGx9IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVsbFxuICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICBzd2l0Y2hNYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybFRyYW5zaXRpb24gPSAhdGhpcy5uYXZpZ2F0ZWQgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuZXh0cmFjdGVkVXJsLnRvU3RyaW5nKCkgIT09IHRoaXMuYnJvd3NlclVybFRyZWUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc0N1cnJlbnRVcmwgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMub25TYW1lVXJsTmF2aWdhdGlvbiA9PT0gJ3JlbG9hZCcgPyB0cnVlIDogdXJsVHJhbnNpdGlvbikgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5zaG91bGRQcm9jZXNzVXJsKHQucmF3VXJsKTtcblxuICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvY2Vzc0N1cnJlbnRVcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2YodCkucGlwZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZSBOYXZpZ2F0aW9uU3RhcnQgZXZlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoTWFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSB0aGlzLnRyYW5zaXRpb25zLmdldFZhbHVlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5ldyBOYXZpZ2F0aW9uU3RhcnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgdC5zb3VyY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQucmVzdG9yZWRTdGF0ZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0cmFuc2l0aW9uICE9PSB0aGlzLnRyYW5zaXRpb25zLmdldFZhbHVlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt0XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBkZWxheSBpcyByZXF1aXJlZCB0byBtYXRjaCBvbGQgYmVoYXZpb3IgdGhhdCBmb3JjZWQgbmF2aWdhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0byBhbHdheXMgYmUgYXN5bmNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoTWFwKHQgPT4gUHJvbWlzZS5yZXNvbHZlKHQpKSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBcHBseVJlZGlyZWN0c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBseVJlZGlyZWN0cyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmdNb2R1bGUuaW5qZWN0b3IsIHRoaXMuY29uZmlnTG9hZGVyLCB0aGlzLnVybFNlcmlhbGl6ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZyksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBjdXJyZW50TmF2aWdhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmF2aWdhdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnRoaXMuY3VycmVudE5hdmlnYXRpb24hLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxVcmw6IHQudXJsQWZ0ZXJSZWRpcmVjdHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWNvZ25pemVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjb2duaXplKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb290Q29tcG9uZW50VHlwZSwgdGhpcy5jb25maWcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodXJsKSA9PiB0aGlzLnNlcmlhbGl6ZVVybCh1cmwpLCB0aGlzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3ksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbGF0aXZlTGlua1Jlc29sdXRpb24pLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgaWYgaW4gYGVhZ2VyYCB1cGRhdGUgbW9kZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdC5leHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QnJvd3NlclVybChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQudXJsQWZ0ZXJSZWRpcmVjdHMsICEhdC5leHRyYXMucmVwbGFjZVVybCwgdC5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuZXh0cmFzLnN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3NlclVybFRyZWUgPSB0LnVybEFmdGVyUmVkaXJlY3RzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZSBSb3V0ZXNSZWNvZ25pemVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByb3V0ZXNSZWNvZ25pemVkID0gbmV3IFJvdXRlc1JlY29nbml6ZWQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVVcmwodC51cmxBZnRlclJlZGlyZWN0cyksIHQudGFyZ2V0U25hcHNob3QhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQocm91dGVzUmVjb2duaXplZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9jZXNzUHJldmlvdXNVcmwgPSB1cmxUcmFuc2l0aW9uICYmIHRoaXMucmF3VXJsVHJlZSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybCh0aGlzLnJhd1VybFRyZWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIC8qIFdoZW4gdGhlIGN1cnJlbnQgVVJMIHNob3VsZG4ndCBiZSBwcm9jZXNzZWQsIGJ1dCB0aGUgcHJldmlvdXMgb25lIHdhcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKiB3ZSBoYW5kbGUgdGhpcyBcImVycm9yIGNvbmRpdGlvblwiIGJ5IG5hdmlnYXRpbmcgdG8gdGhlIHByZXZpb3VzbHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKiBzdWNjZXNzZnVsIFVSTCwgYnV0IGxlYXZpbmcgdGhlIFVSTCBpbnRhY3QuKi9cbiAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvY2Vzc1ByZXZpb3VzVXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7aWQsIGV4dHJhY3RlZFVybCwgc291cmNlLCByZXN0b3JlZFN0YXRlLCBleHRyYXN9ID0gdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdlN0YXJ0ID0gbmV3IE5hdmlnYXRpb25TdGFydChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZCwgdGhpcy5zZXJpYWxpemVVcmwoZXh0cmFjdGVkVXJsKSwgc291cmNlLCByZXN0b3JlZFN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuYXZTdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRTbmFwc2hvdCA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlRW1wdHlTdGF0ZShleHRyYWN0ZWRVcmwsIHRoaXMucm9vdENvbXBvbmVudFR5cGUpLnNuYXBzaG90O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2Yoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRTbmFwc2hvdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsQWZ0ZXJSZWRpcmVjdHM6IGV4dHJhY3RlZFVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFzOiB7Li4uZXh0cmFzLCBza2lwTG9jYXRpb25DaGFuZ2U6IGZhbHNlLCByZXBsYWNlVXJsOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogV2hlbiBuZWl0aGVyIHRoZSBjdXJyZW50IG9yIHByZXZpb3VzIFVSTCBjYW4gYmUgcHJvY2Vzc2VkLCBkbyBub3RoaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBvdGhlciB0aGFuIHVwZGF0ZSByb3V0ZXIncyBpbnRlcm5hbCByZWZlcmVuY2UgdG8gdGhlIGN1cnJlbnQgXCJzZXR0bGVkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIFVSTC4gVGhpcyB3YXkgdGhlIG5leHQgbmF2aWdhdGlvbiB3aWxsIGJlIGNvbWluZyBmcm9tIHRoZSBjdXJyZW50IFVSTFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICogaW4gdGhlIGJyb3dzZXIuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmF3VXJsVHJlZSA9IHQucmF3VXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5icm93c2VyVXJsVHJlZSA9IHQudXJsQWZ0ZXJSZWRpcmVjdHM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LnJlc29sdmUobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gQmVmb3JlIFByZWFjdGl2YXRpb25cbiAgICAgICAgICAgICAgICAgICAgIHN3aXRjaFRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFNuYXBzaG90LFxuICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBuYXZpZ2F0aW9uSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFjdGVkVXJsOiBhcHBsaWVkVXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICByYXdVcmw6IHJhd1VybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFzOiB7c2tpcExvY2F0aW9uQ2hhbmdlLCByZXBsYWNlVXJsfVxuICAgICAgICAgICAgICAgICAgICAgICB9ID0gdDtcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaG9va3MuYmVmb3JlUHJlYWN0aXZhdGlvbih0YXJnZXRTbmFwc2hvdCEsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBuYXZpZ2F0aW9uSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgYXBwbGllZFVybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmF3VXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBza2lwTG9jYXRpb25DaGFuZ2U6ICEhc2tpcExvY2F0aW9uQ2hhbmdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2VVcmw6ICEhcmVwbGFjZVVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgLy8gLS0tIEdVQVJEUyAtLS1cbiAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZ3VhcmRzU3RhcnQgPSBuZXcgR3VhcmRzQ2hlY2tTdGFydChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ISk7XG4gICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KGd1YXJkc1N0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICBtYXAodCA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4udCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGd1YXJkczogZ2V0QWxsUm91dGVHdWFyZHMoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC50YXJnZXRTbmFwc2hvdCEsIHQuY3VycmVudFNuYXBzaG90LCB0aGlzLnJvb3RDb250ZXh0cylcbiAgICAgICAgICAgICAgICAgICAgICAgICB9KSksXG5cbiAgICAgICAgICAgICAgICAgICAgIGNoZWNrR3VhcmRzKHRoaXMubmdNb2R1bGUuaW5qZWN0b3IsIChldnQ6IEV2ZW50KSA9PiB0aGlzLnRyaWdnZXJFdmVudChldnQpKSxcbiAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzVXJsVHJlZSh0Lmd1YXJkc1Jlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvcjogRXJyb3Ime3VybD86IFVybFRyZWV9ID0gbmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgUmVkaXJlY3RpbmcgdG8gXCIke3RoaXMuc2VyaWFsaXplVXJsKHQuZ3VhcmRzUmVzdWx0KX1cImApO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yLnVybCA9IHQuZ3VhcmRzUmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBndWFyZHNFbmQgPSBuZXcgR3VhcmRzQ2hlY2tFbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzKSwgdC50YXJnZXRTbmFwc2hvdCEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAhIXQuZ3VhcmRzUmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQoZ3VhcmRzRW5kKTtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICBmaWx0ZXIodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIGlmICghdC5ndWFyZHNSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdkNhbmNlbCA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOYXZpZ2F0aW9uQ2FuY2VsKHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuYXZDYW5jZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIHQucmVzb2x2ZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIC0tLSBSRVNPTFZFIC0tLVxuICAgICAgICAgICAgICAgICAgICAgc3dpdGNoVGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAodC5ndWFyZHMuY2FuQWN0aXZhdGVDaGVja3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlU3RhcnQgPSBuZXcgUmVzb2x2ZVN0YXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ISk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQocmVzb2x2ZVN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YVJlc29sdmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmVEYXRhKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LCB0aGlzLm5nTW9kdWxlLmluamVjdG9yKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0OiAoKSA9PiBkYXRhUmVzb2x2ZWQgPSB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGFSZXNvbHZlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuYXZDYW5jZWwgPSBuZXcgTmF2aWdhdGlvbkNhbmNlbChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBBdCBsZWFzdCBvbmUgcm91dGUgcmVzb2x2ZXIgZGlkbid0IGVtaXQgYW55IHZhbHVlLmApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2Q2FuY2VsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZUVuZCA9IG5ldyBSZXNvbHZlRW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ISk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQocmVzb2x2ZUVuZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8vIC0tLSBBRlRFUiBQUkVBQ1RJVkFUSU9OIC0tLVxuICAgICAgICAgICAgICAgICAgICAgc3dpdGNoVGFwKCh0OiBOYXZpZ2F0aW9uVHJhbnNpdGlvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0U25hcHNob3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IG5hdmlnYXRpb25JZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYWN0ZWRVcmw6IGFwcGxpZWRVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHJhd1VybDogcmF3VXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYXM6IHtza2lwTG9jYXRpb25DaGFuZ2UsIHJlcGxhY2VVcmx9XG4gICAgICAgICAgICAgICAgICAgICAgIH0gPSB0O1xuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5ob29rcy5hZnRlclByZWFjdGl2YXRpb24odGFyZ2V0U25hcHNob3QhLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdGlvbklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGFwcGxpZWRVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHJhd1VybFRyZWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiAhIXNraXBMb2NhdGlvbkNoYW5nZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlVXJsOiAhIXJlcGxhY2VVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIG1hcCgodDogTmF2aWdhdGlvblRyYW5zaXRpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0Um91dGVyU3RhdGUgPSBjcmVhdGVSb3V0ZXJTdGF0ZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LCB0LnRhcmdldFNuYXBzaG90ISwgdC5jdXJyZW50Um91dGVyU3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKHsuLi50LCB0YXJnZXRSb3V0ZXJTdGF0ZX0pO1xuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIC8qIE9uY2UgaGVyZSwgd2UgYXJlIGFib3V0IHRvIGFjdGl2YXRlIHN5bmNyb25vdXNseS4gVGhlIGFzc3VtcHRpb24gaXMgdGhpc1xuICAgICAgICAgICAgICAgICAgICAgICAgd2lsbCBzdWNjZWVkLCBhbmQgdXNlciBjb2RlIG1heSByZWFkIGZyb20gdGhlIFJvdXRlciBzZXJ2aWNlLiBUaGVyZWZvcmVcbiAgICAgICAgICAgICAgICAgICAgICAgIGJlZm9yZSBhY3RpdmF0aW9uLCB3ZSBuZWVkIHRvIHVwZGF0ZSByb3V0ZXIgcHJvcGVydGllcyBzdG9yaW5nIHRoZSBjdXJyZW50XG4gICAgICAgICAgICAgICAgICAgICAgICBVUkwgYW5kIHRoZSBSb3V0ZXJTdGF0ZSwgYXMgd2VsbCBhcyB1cGRhdGVkIHRoZSBicm93c2VyIFVSTC4gQWxsIHRoaXMgc2hvdWxkXG4gICAgICAgICAgICAgICAgICAgICAgICBoYXBwZW4gKmJlZm9yZSogYWN0aXZhdGluZy4gKi9cbiAgICAgICAgICAgICAgICAgICAgIHRhcCgodDogTmF2aWdhdGlvblRyYW5zaXRpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IHQudXJsQWZ0ZXJSZWRpcmVjdHM7XG4gICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmF3VXJsVHJlZSA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodGhpcy5jdXJyZW50VXJsVHJlZSwgdC5yYXdVcmwpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICh0aGlzIGFzIHtyb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGV9KS5yb3V0ZXJTdGF0ZSA9IHQudGFyZ2V0Um91dGVyU3RhdGUhO1xuXG4gICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZGVmZXJyZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0LmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QnJvd3NlclVybChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJhd1VybFRyZWUsICEhdC5leHRyYXMucmVwbGFjZVVybCwgdC5pZCwgdC5leHRyYXMuc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJyb3dzZXJVcmxUcmVlID0gdC51cmxBZnRlclJlZGlyZWN0cztcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgICAgICAgIGFjdGl2YXRlUm91dGVzKFxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9vdENvbnRleHRzLCB0aGlzLnJvdXRlUmV1c2VTdHJhdGVneSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAoZXZ0OiBFdmVudCkgPT4gdGhpcy50cmlnZ2VyRXZlbnQoZXZ0KSksXG5cbiAgICAgICAgICAgICAgICAgICAgIHRhcCh7XG4gICAgICAgICAgICAgICAgICAgICAgIG5leHQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgY29tcGxldGUoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICBmaW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIC8qIFdoZW4gdGhlIG5hdmlnYXRpb24gc3RyZWFtIGZpbmlzaGVzIGVpdGhlciB0aHJvdWdoIGVycm9yIG9yIHN1Y2Nlc3MsIHdlXG4gICAgICAgICAgICAgICAgICAgICAgICAqIHNldCB0aGUgYGNvbXBsZXRlZGAgb3IgYGVycm9yZWRgIGZsYWcuIEhvd2V2ZXIsIHRoZXJlIGFyZSBzb21lIHNpdHVhdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgICogd2hlcmUgd2UgY291bGQgZ2V0IGhlcmUgd2l0aG91dCBlaXRoZXIgb2YgdGhvc2UgYmVpbmcgc2V0LiBGb3IgaW5zdGFuY2UsIGFcbiAgICAgICAgICAgICAgICAgICAgICAgICogcmVkaXJlY3QgZHVyaW5nIE5hdmlnYXRpb25TdGFydC4gVGhlcmVmb3JlLCB0aGlzIGlzIGEgY2F0Y2gtYWxsIHRvIG1ha2VcbiAgICAgICAgICAgICAgICAgICAgICAgICogc3VyZSB0aGUgTmF2aWdhdGlvbkNhbmNlbFxuICAgICAgICAgICAgICAgICAgICAgICAgKiBldmVudCBpcyBmaXJlZCB3aGVuIGEgbmF2aWdhdGlvbiBnZXRzIGNhbmNlbGxlZCBidXQgbm90IGNhdWdodCBieSBvdGhlclxuICAgICAgICAgICAgICAgICAgICAgICAgKiBtZWFucy4gKi9cbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjb21wbGV0ZWQgJiYgIWVycm9yZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNdXN0IHJlc2V0IHRvIGN1cnJlbnQgVVJMIHRyZWUgaGVyZSB0byBlbnN1cmUgaGlzdG9yeS5zdGF0ZSBpcyBzZXQuIE9uIGFcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBmcmVzaCBwYWdlIGxvYWQsIGlmIGEgbmV3IG5hdmlnYXRpb24gY29tZXMgaW4gYmVmb3JlIGEgc3VjY2Vzc2Z1bFxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5hdmlnYXRpb24gY29tcGxldGVzLCB0aGVyZSB3aWxsIGJlIG5vdGhpbmcgaW5cbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBoaXN0b3J5LnN0YXRlLm5hdmlnYXRpb25JZC4gVGhpcyBjYW4gY2F1c2Ugc3luYyBwcm9ibGVtcyB3aXRoIEFuZ3VsYXJKU1xuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHN5bmMgY29kZSB3aGljaCBsb29rcyBmb3IgYSB2YWx1ZSBoZXJlIGluIG9yZGVyIHRvIGRldGVybWluZSB3aGV0aGVyIG9yXG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm90IHRvIGhhbmRsZSBhIGdpdmVuIHBvcHN0YXRlIGV2ZW50IG9yIHRvIGxlYXZlIGl0IHRvIHRoZSBBbmd1YWxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gcm91dGVyLlxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmF2Q2FuY2VsID0gbmV3IE5hdmlnYXRpb25DYW5jZWwoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYE5hdmlnYXRpb24gSUQgJHt0LmlkfSBpcyBub3QgZXF1YWwgdG8gdGhlIGN1cnJlbnQgbmF2aWdhdGlvbiBpZCAke1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uYXZpZ2F0aW9uSWR9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdkNhbmNlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAvLyBjdXJyZW50TmF2aWdhdGlvbiBzaG91bGQgYWx3YXlzIGJlIHJlc2V0IHRvIG51bGwgaGVyZS4gSWYgbmF2aWdhdGlvbiB3YXNcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gc3VjY2Vzc2Z1bCwgbGFzdFN1Y2Nlc3NmdWxUcmFuc2l0aW9uIHdpbGwgaGF2ZSBhbHJlYWR5IGJlZW4gc2V0LiBUaGVyZWZvcmVcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gd2UgY2FuIHNhZmVseSBzZXQgY3VycmVudE5hdmlnYXRpb24gdG8gbnVsbCBoZXJlLlxuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgY2F0Y2hFcnJvcigoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICBlcnJvcmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgLyogVGhpcyBlcnJvciB0eXBlIGlzIGlzc3VlZCBkdXJpbmcgUmVkaXJlY3QsIGFuZCBpcyBoYW5kbGVkIGFzIGFcbiAgICAgICAgICAgICAgICAgICAgICAgICogY2FuY2VsbGF0aW9uIHJhdGhlciB0aGFuIGFuIGVycm9yLiAqL1xuICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWRpcmVjdGluZyA9IGlzVXJsVHJlZShlLnVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWRpcmVjdGluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHByb3BlcnR5IG9ubHkgaWYgd2UncmUgbm90IHJlZGlyZWN0aW5nLiBJZiB3ZSBsYW5kZWQgb24gYSBwYWdlIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVkaXJlY3QgdG8gYC9gIHJvdXRlLCB0aGUgbmV3IG5hdmlnYXRpb24gaXMgZ29pbmcgdG8gc2VlIHRoZSBgL2BcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlzbid0IGEgY2hhbmdlIGZyb20gdGhlIGRlZmF1bHQgY3VycmVudFVybFRyZWUgYW5kIHdvbid0IG5hdmlnYXRlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBvbmx5IGFwcGxpY2FibGUgd2l0aCBpbml0aWFsIG5hdmlnYXRpb24sIHNvIHNldHRpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGBuYXZpZ2F0ZWRgIG9ubHkgd2hlbiBub3QgcmVkaXJlY3RpbmcgcmVzb2x2ZXMgdGhpcyBzY2VuYXJpby5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzZXRTdGF0ZUFuZFVybCh0LmN1cnJlbnRSb3V0ZXJTdGF0ZSwgdC5jdXJyZW50VXJsVHJlZSwgdC5yYXdVcmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuYXZDYW5jZWwgPSBuZXcgTmF2aWdhdGlvbkNhbmNlbChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCBlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuYXZDYW5jZWwpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiByZWRpcmVjdGluZywgd2UgbmVlZCB0byBkZWxheSByZXNvbHZpbmcgdGhlIG5hdmlnYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwcm9taXNlIGFuZCBwdXNoIGl0IHRvIHRoZSByZWRpcmVjdCBuYXZpZ2F0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWRpcmVjdGluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2V0VGltZW91dCBpcyByZXF1aXJlZCBzbyB0aGlzIG5hdmlnYXRpb24gZmluaXNoZXMgd2l0aFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIHJldHVybiBFTVBUWSBiZWxvdy4gSWYgaXQgaXNuJ3QgYWxsb3dlZCB0byBmaW5pc2hcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHByb2Nlc3NpbmcsIHRoZXJlIGNhbiBiZSBtdWx0aXBsZSBuYXZpZ2F0aW9ucyB0byB0aGUgc2FtZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVVJMLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lcmdlZFRyZWUgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKGUudXJsLCB0aGlzLnJhd1VybFRyZWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHRyYXMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiB0LmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZVVybDogdGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lcmdlZFRyZWUsICdpbXBlcmF0aXZlJywgbnVsbCwgZXh0cmFzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3Jlc29sdmU6IHQucmVzb2x2ZSwgcmVqZWN0OiB0LnJlamVjdCwgcHJvbWlzZTogdC5wcm9taXNlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAvKiBBbGwgb3RoZXIgZXJyb3JzIHNob3VsZCByZXNldCB0byB0aGUgcm91dGVyJ3MgaW50ZXJuYWwgVVJMIHJlZmVyZW5jZSB0b1xuICAgICAgICAgICAgICAgICAgICAgICAgICAqIHRoZSBwcmUtZXJyb3Igc3RhdGUuICovXG4gICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXNldFN0YXRlQW5kVXJsKHQuY3VycmVudFJvdXRlclN0YXRlLCB0LmN1cnJlbnRVcmxUcmVlLCB0LnJhd1VybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmF2RXJyb3IgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgTmF2aWdhdGlvbkVycm9yKHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5hdkVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKHRoaXMuZXJyb3JIYW5kbGVyKGUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5yZWplY3QoZWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgIC8vIFRPRE8oamFzb25hZGVuKTogcmVtb3ZlIGNhc3Qgb25jZSBnMyBpcyBvbiB1cGRhdGVkIFR5cGVTY3JpcHRcbiAgICAgICAgICAgICAgIH0pKSBhcyBhbnkgYXMgT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj47XG4gIH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIFRPRE86IHRoaXMgc2hvdWxkIGJlIHJlbW92ZWQgb25jZSB0aGUgY29uc3RydWN0b3Igb2YgdGhlIHJvdXRlciBtYWRlIGludGVybmFsXG4gICAqL1xuICByZXNldFJvb3RDb21wb25lbnRUeXBlKHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT4pOiB2b2lkIHtcbiAgICB0aGlzLnJvb3RDb21wb25lbnRUeXBlID0gcm9vdENvbXBvbmVudFR5cGU7XG4gICAgLy8gVE9ETzogdnNhdmtpbiByb3V0ZXIgNC4wIHNob3VsZCBtYWtlIHRoZSByb290IGNvbXBvbmVudCBzZXQgdG8gbnVsbFxuICAgIC8vIHRoaXMgd2lsbCBzaW1wbGlmeSB0aGUgbGlmZWN5Y2xlIG9mIHRoZSByb3V0ZXIuXG4gICAgdGhpcy5yb3V0ZXJTdGF0ZS5yb290LmNvbXBvbmVudCA9IHRoaXMucm9vdENvbXBvbmVudFR5cGU7XG4gIH1cblxuICBwcml2YXRlIGdldFRyYW5zaXRpb24oKTogTmF2aWdhdGlvblRyYW5zaXRpb24ge1xuICAgIGNvbnN0IHRyYW5zaXRpb24gPSB0aGlzLnRyYW5zaXRpb25zLnZhbHVlO1xuICAgIC8vIFRoaXMgdmFsdWUgbmVlZHMgdG8gYmUgc2V0LiBPdGhlciB2YWx1ZXMgc3VjaCBhcyBleHRyYWN0ZWRVcmwgYXJlIHNldCBvbiBpbml0aWFsIG5hdmlnYXRpb25cbiAgICAvLyBidXQgdGhlIHVybEFmdGVyUmVkaXJlY3RzIG1heSBub3QgZ2V0IHNldCBpZiB3ZSBhcmVuJ3QgcHJvY2Vzc2luZyB0aGUgbmV3IFVSTCAqYW5kKiBub3RcbiAgICAvLyBwcm9jZXNzaW5nIHRoZSBwcmV2aW91cyBVUkwuXG4gICAgdHJhbnNpdGlvbi51cmxBZnRlclJlZGlyZWN0cyA9IHRoaXMuYnJvd3NlclVybFRyZWU7XG4gICAgcmV0dXJuIHRyYW5zaXRpb247XG4gIH1cblxuICBwcml2YXRlIHNldFRyYW5zaXRpb24odDogUGFydGlhbDxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4pOiB2b2lkIHtcbiAgICB0aGlzLnRyYW5zaXRpb25zLm5leHQoey4uLnRoaXMuZ2V0VHJhbnNpdGlvbigpLCAuLi50fSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyIGFuZCBwZXJmb3JtcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaW5pdGlhbE5hdmlnYXRpb24oKTogdm9pZCB7XG4gICAgdGhpcy5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICBpZiAodGhpcy5uYXZpZ2F0aW9uSWQgPT09IDApIHtcbiAgICAgIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmxvY2F0aW9uLnBhdGgodHJ1ZSksIHtyZXBsYWNlVXJsOiB0cnVlfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdXAgdGhlIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lci5cbiAgICovXG4gIHNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpOiB2b2lkIHtcbiAgICAvLyBEb24ndCBuZWVkIHRvIHVzZSBab25lLndyYXAgYW55IG1vcmUsIGJlY2F1c2Ugem9uZS5qc1xuICAgIC8vIGFscmVhZHkgcGF0Y2ggb25Qb3BTdGF0ZSwgc28gbG9jYXRpb24gY2hhbmdlIGNhbGxiYWNrIHdpbGxcbiAgICAvLyBydW4gaW50byBuZ1pvbmVcbiAgICBpZiAoIXRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24gPSA8YW55PnRoaXMubG9jYXRpb24uc3Vic2NyaWJlKChjaGFuZ2U6IGFueSkgPT4ge1xuICAgICAgICBsZXQgcmF3VXJsVHJlZSA9IHRoaXMucGFyc2VVcmwoY2hhbmdlWyd1cmwnXSk7XG4gICAgICAgIGNvbnN0IHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIgPSBjaGFuZ2VbJ3R5cGUnXSA9PT0gJ3BvcHN0YXRlJyA/ICdwb3BzdGF0ZScgOiAnaGFzaGNoYW5nZSc7XG4gICAgICAgIC8vIE5hdmlnYXRpb25zIGNvbWluZyBmcm9tIEFuZ3VsYXIgcm91dGVyIGhhdmUgYSBuYXZpZ2F0aW9uSWQgc3RhdGUgcHJvcGVydHkuIFdoZW4gdGhpc1xuICAgICAgICAvLyBleGlzdHMsIHJlc3RvcmUgdGhlIHN0YXRlLlxuICAgICAgICBjb25zdCBzdGF0ZSA9IGNoYW5nZS5zdGF0ZSAmJiBjaGFuZ2Uuc3RhdGUubmF2aWdhdGlvbklkID8gY2hhbmdlLnN0YXRlIDogbnVsbDtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24ocmF3VXJsVHJlZSwgc291cmNlLCBzdGF0ZSwge3JlcGxhY2VVcmw6IHRydWV9KTtcbiAgICAgICAgfSwgMCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKiogVGhlIGN1cnJlbnQgVVJMLiAqL1xuICBnZXQgdXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuc2VyaWFsaXplVXJsKHRoaXMuY3VycmVudFVybFRyZWUpO1xuICB9XG5cbiAgLyoqIFRoZSBjdXJyZW50IE5hdmlnYXRpb24gb2JqZWN0IGlmIG9uZSBleGlzdHMgKi9cbiAgZ2V0Q3VycmVudE5hdmlnYXRpb24oKTogTmF2aWdhdGlvbnxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50TmF2aWdhdGlvbjtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgdHJpZ2dlckV2ZW50KGV2ZW50OiBFdmVudCk6IHZvaWQge1xuICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PikubmV4dChldmVudCk7XG4gIH1cblxuICAvKipcbiAgICogUmVzZXRzIHRoZSBjb25maWd1cmF0aW9uIHVzZWQgZm9yIG5hdmlnYXRpb24gYW5kIGdlbmVyYXRpbmcgbGlua3MuXG4gICAqXG4gICAqIEBwYXJhbSBjb25maWcgVGhlIHJvdXRlIGFycmF5IGZvciB0aGUgbmV3IGNvbmZpZ3VyYXRpb24uXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIGBgYFxuICAgKiByb3V0ZXIucmVzZXRDb25maWcoW1xuICAgKiAgeyBwYXRoOiAndGVhbS86aWQnLCBjb21wb25lbnQ6IFRlYW1DbXAsIGNoaWxkcmVuOiBbXG4gICAqICAgIHsgcGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wIH0sXG4gICAqICAgIHsgcGF0aDogJ3VzZXIvOm5hbWUnLCBjb21wb25lbnQ6IFVzZXJDbXAgfVxuICAgKiAgXX1cbiAgICogXSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcmVzZXRDb25maWcoY29uZmlnOiBSb3V0ZXMpOiB2b2lkIHtcbiAgICB2YWxpZGF0ZUNvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gICAgdGhpcy5uYXZpZ2F0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSAtMTtcbiAgfVxuXG4gIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuZGlzcG9zZSgpO1xuICB9XG5cbiAgLyoqIERpc3Bvc2VzIG9mIHRoZSByb3V0ZXIuICovXG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgIHRoaXMubG9jYXRpb25TdWJzY3JpcHRpb24gPSBudWxsITtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQXBwbGllcyBhbiBhcnJheSBvZiBjb21tYW5kcyB0byB0aGUgY3VycmVudCBVUkwgdHJlZSBhbmQgY3JlYXRlcyBhIG5ldyBVUkwgdHJlZS5cbiAgICpcbiAgICogV2hlbiBnaXZlbiBhbiBhY3RpdmF0ZWQgcm91dGUsIGFwcGxpZXMgdGhlIGdpdmVuIGNvbW1hbmRzIHN0YXJ0aW5nIGZyb20gdGhlIHJvdXRlLlxuICAgKiBPdGhlcndpc2UsIGFwcGxpZXMgdGhlIGdpdmVuIGNvbW1hbmQgc3RhcnRpbmcgZnJvbSB0aGUgcm9vdC5cbiAgICpcbiAgICogQHBhcmFtIGNvbW1hbmRzIEFuIGFycmF5IG9mIGNvbW1hbmRzIHRvIGFwcGx5LlxuICAgKiBAcGFyYW0gbmF2aWdhdGlvbkV4dHJhcyBPcHRpb25zIHRoYXQgY29udHJvbCB0aGUgbmF2aWdhdGlvbiBzdHJhdGVneS4gVGhpcyBmdW5jdGlvblxuICAgKiBvbmx5IHV0aWxpemVzIHByb3BlcnRpZXMgaW4gYE5hdmlnYXRpb25FeHRyYXNgIHRoYXQgd291bGQgY2hhbmdlIHRoZSBwcm92aWRlZCBVUkwuXG4gICAqIEByZXR1cm5zIFRoZSBuZXcgVVJMIHRyZWUuXG4gICAqXG4gICAqIEB1c2FnZU5vdGVzXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzMvdXNlci8xMVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsICd1c2VyJywgMTFdKTtcbiAgICpcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzO2V4cGFuZD10cnVlL3VzZXIvMTFcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7ZXhwYW5kOiB0cnVlfSwgJ3VzZXInLCAxMV0pO1xuICAgKlxuICAgKiAvLyB5b3UgY2FuIGNvbGxhcHNlIHN0YXRpYyBzZWdtZW50cyBsaWtlIHRoaXMgKHRoaXMgd29ya3Mgb25seSB3aXRoIHRoZSBmaXJzdCBwYXNzZWQtaW4gdmFsdWUpOlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtLzMzL3VzZXInLCB1c2VySWRdKTtcbiAgICpcbiAgICogLy8gSWYgdGhlIGZpcnN0IHNlZ21lbnQgY2FuIGNvbnRhaW4gc2xhc2hlcywgYW5kIHlvdSBkbyBub3Qgd2FudCB0aGUgcm91dGVyIHRvIHNwbGl0IGl0LFxuICAgKiAvLyB5b3UgY2FuIGRvIHRoZSBmb2xsb3dpbmc6XG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFt7c2VnbWVudFBhdGg6ICcvb25lL3R3byd9XSk7XG4gICAqXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMy8odXNlci8xMS8vcmlnaHQ6Y2hhdClcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6ICdjaGF0J319XSk7XG4gICAqXG4gICAqIC8vIHJlbW92ZSB0aGUgcmlnaHQgc2Vjb25kYXJ5IG5vZGVcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6IG51bGx9fV0pO1xuICAgKlxuICAgKiAvLyBhc3N1bWluZyB0aGUgY3VycmVudCB1cmwgaXMgYC90ZWFtLzMzL3VzZXIvMTFgIGFuZCB0aGUgcm91dGUgcG9pbnRzIHRvIGB1c2VyLzExYFxuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzExL2RldGFpbHNcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWydkZXRhaWxzJ10sIHtyZWxhdGl2ZVRvOiByb3V0ZX0pO1xuICAgKlxuICAgKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzIyXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnLi4vMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzQ0L3VzZXIvMjJcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycuLi8uLi90ZWFtLzQ0L3VzZXIvMjInXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgY3JlYXRlVXJsVHJlZShjb21tYW5kczogYW55W10sIG5hdmlnYXRpb25FeHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7fSk6IFVybFRyZWUge1xuICAgIGNvbnN0IHtcbiAgICAgIHJlbGF0aXZlVG8sXG4gICAgICBxdWVyeVBhcmFtcyxcbiAgICAgIGZyYWdtZW50LFxuICAgICAgcHJlc2VydmVRdWVyeVBhcmFtcyxcbiAgICAgIHF1ZXJ5UGFyYW1zSGFuZGxpbmcsXG4gICAgICBwcmVzZXJ2ZUZyYWdtZW50XG4gICAgfSA9IG5hdmlnYXRpb25FeHRyYXM7XG4gICAgaWYgKGlzRGV2TW9kZSgpICYmIHByZXNlcnZlUXVlcnlQYXJhbXMgJiYgPGFueT5jb25zb2xlICYmIDxhbnk+Y29uc29sZS53YXJuKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ3ByZXNlcnZlUXVlcnlQYXJhbXMgaXMgZGVwcmVjYXRlZCwgdXNlIHF1ZXJ5UGFyYW1zSGFuZGxpbmcgaW5zdGVhZC4nKTtcbiAgICB9XG4gICAgY29uc3QgYSA9IHJlbGF0aXZlVG8gfHwgdGhpcy5yb3V0ZXJTdGF0ZS5yb290O1xuICAgIGNvbnN0IGYgPSBwcmVzZXJ2ZUZyYWdtZW50ID8gdGhpcy5jdXJyZW50VXJsVHJlZS5mcmFnbWVudCA6IGZyYWdtZW50O1xuICAgIGxldCBxOiBQYXJhbXN8bnVsbCA9IG51bGw7XG4gICAgaWYgKHF1ZXJ5UGFyYW1zSGFuZGxpbmcpIHtcbiAgICAgIHN3aXRjaCAocXVlcnlQYXJhbXNIYW5kbGluZykge1xuICAgICAgICBjYXNlICdtZXJnZSc6XG4gICAgICAgICAgcSA9IHsuLi50aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zLCAuLi5xdWVyeVBhcmFtc307XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3ByZXNlcnZlJzpcbiAgICAgICAgICBxID0gdGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBxID0gcXVlcnlQYXJhbXMgfHwgbnVsbDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcSA9IHByZXNlcnZlUXVlcnlQYXJhbXMgPyB0aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zIDogcXVlcnlQYXJhbXMgfHwgbnVsbDtcbiAgICB9XG4gICAgaWYgKHEgIT09IG51bGwpIHtcbiAgICAgIHEgPSB0aGlzLnJlbW92ZUVtcHR5UHJvcHMocSk7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVVcmxUcmVlKGEsIHRoaXMuY3VycmVudFVybFRyZWUsIGNvbW1hbmRzLCBxISwgZiEpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBVUkwsIHdoaWNoIG11c3QgYmUgYWJzb2x1dGUuXG4gICAqXG4gICAqIEBwYXJhbSB1cmwgQW4gYWJzb2x1dGUgVVJMLiBUaGUgZnVuY3Rpb24gZG9lcyBub3QgYXBwbHkgYW55IGRlbHRhIHRvIHRoZSBjdXJyZW50IFVSTC5cbiAgICogQHBhcmFtIGV4dHJhcyBBbiBvYmplY3QgY29udGFpbmluZyBwcm9wZXJ0aWVzIHRoYXQgbW9kaWZ5IHRoZSBuYXZpZ2F0aW9uIHN0cmF0ZWd5LlxuICAgKiBUaGUgZnVuY3Rpb24gaWdub3JlcyBhbnkgcHJvcGVydGllcyBpbiB0aGUgYE5hdmlnYXRpb25FeHRyYXNgIHRoYXQgd291bGQgY2hhbmdlIHRoZVxuICAgKiBwcm92aWRlZCBVUkwuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvICd0cnVlJyB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsXG4gICAqIHRvICdmYWxzZScgd2hlbiBuYXZpZ2F0aW9uIGZhaWxzLCBvciBpcyByZWplY3RlZCBvbiBlcnJvci5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiKTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiLCB7IHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqL1xuICBuYXZpZ2F0ZUJ5VXJsKHVybDogc3RyaW5nfFVybFRyZWUsIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHtza2lwTG9jYXRpb25DaGFuZ2U6IGZhbHNlfSk6XG4gICAgICBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoaXNEZXZNb2RlKCkgJiYgdGhpcy5pc05nWm9uZUVuYWJsZWQgJiYgIU5nWm9uZS5pc0luQW5ndWxhclpvbmUoKSkge1xuICAgICAgdGhpcy5jb25zb2xlLndhcm4oXG4gICAgICAgICAgYE5hdmlnYXRpb24gdHJpZ2dlcmVkIG91dHNpZGUgQW5ndWxhciB6b25lLCBkaWQgeW91IGZvcmdldCB0byBjYWxsICduZ1pvbmUucnVuKCknP2ApO1xuICAgIH1cblxuICAgIGNvbnN0IHVybFRyZWUgPSBpc1VybFRyZWUodXJsKSA/IHVybCA6IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICBjb25zdCBtZXJnZWRUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHVybFRyZWUsIHRoaXMucmF3VXJsVHJlZSk7XG5cbiAgICByZXR1cm4gdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24obWVyZ2VkVHJlZSwgJ2ltcGVyYXRpdmUnLCBudWxsLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBhcnJheSBvZiBjb21tYW5kcyBhbmQgYSBzdGFydGluZyBwb2ludC5cbiAgICogSWYgbm8gc3RhcnRpbmcgcm91dGUgaXMgcHJvdmlkZWQsIHRoZSBuYXZpZ2F0aW9uIGlzIGFic29sdXRlLlxuICAgKlxuICAgKiBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0OlxuICAgKiAtIHJlc29sdmVzIHRvICd0cnVlJyB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsXG4gICAqIC0gcmVzb2x2ZXMgdG8gJ2ZhbHNlJyB3aGVuIG5hdmlnYXRpb24gZmFpbHMsXG4gICAqIC0gaXMgcmVqZWN0ZWQgd2hlbiBhbiBlcnJvciBoYXBwZW5zLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTFxuICAgKiByb3V0ZXIubmF2aWdhdGUoWyd0ZWFtJywgMzMsICd1c2VyJywgMTFdLCB7cmVsYXRpdmVUbzogcm91dGUsIHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZX0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogVGhlIGZpcnN0IHBhcmFtZXRlciBvZiBgbmF2aWdhdGUoKWAgaXMgYSBkZWx0YSB0byBiZSBhcHBsaWVkIHRvIHRoZSBjdXJyZW50IFVSTFxuICAgKiBvciB0aGUgb25lIHByb3ZpZGVkIGluIHRoZSBgcmVsYXRpdmVUb2AgcHJvcGVydHkgb2YgdGhlIHNlY29uZCBwYXJhbWV0ZXIgKHRoZVxuICAgKiBgTmF2aWdhdGlvbkV4dHJhc2ApLlxuICAgKlxuICAgKiBJbiBvcmRlciB0byBhZmZlY3QgdGhpcyBicm93c2VyJ3MgYGhpc3Rvcnkuc3RhdGVgIGVudHJ5LCB0aGUgYHN0YXRlYFxuICAgKiBwYXJhbWV0ZXIgY2FuIGJlIHBhc3NlZC4gVGhpcyBtdXN0IGJlIGFuIG9iamVjdCBiZWNhdXNlIHRoZSByb3V0ZXJcbiAgICogd2lsbCBhZGQgdGhlIGBuYXZpZ2F0aW9uSWRgIHByb3BlcnR5IHRvIHRoaXMgb2JqZWN0IGJlZm9yZSBjcmVhdGluZ1xuICAgKiB0aGUgbmV3IGhpc3RvcnkgaXRlbS5cbiAgICovXG4gIG5hdmlnYXRlKGNvbW1hbmRzOiBhbnlbXSwgZXh0cmFzOiBOYXZpZ2F0aW9uRXh0cmFzID0ge3NraXBMb2NhdGlvbkNoYW5nZTogZmFsc2V9KTpcbiAgICAgIFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHZhbGlkYXRlQ29tbWFuZHMoY29tbWFuZHMpO1xuICAgIHJldHVybiB0aGlzLm5hdmlnYXRlQnlVcmwodGhpcy5jcmVhdGVVcmxUcmVlKGNvbW1hbmRzLCBleHRyYXMpLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqIFNlcmlhbGl6ZXMgYSBgVXJsVHJlZWAgaW50byBhIHN0cmluZyAqL1xuICBzZXJpYWxpemVVcmwodXJsOiBVcmxUcmVlKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICB9XG5cbiAgLyoqIFBhcnNlcyBhIHN0cmluZyBpbnRvIGEgYFVybFRyZWVgICovXG4gIHBhcnNlVXJsKHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gICAgbGV0IHVybFRyZWU6IFVybFRyZWU7XG4gICAgdHJ5IHtcbiAgICAgIHVybFRyZWUgPSB0aGlzLnVybFNlcmlhbGl6ZXIucGFyc2UodXJsKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB1cmxUcmVlID0gdGhpcy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIoZSwgdGhpcy51cmxTZXJpYWxpemVyLCB1cmwpO1xuICAgIH1cbiAgICByZXR1cm4gdXJsVHJlZTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIHdoZXRoZXIgdGhlIHVybCBpcyBhY3RpdmF0ZWQgKi9cbiAgaXNBY3RpdmUodXJsOiBzdHJpbmd8VXJsVHJlZSwgZXhhY3Q6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBpZiAoaXNVcmxUcmVlKHVybCkpIHtcbiAgICAgIHJldHVybiBjb250YWluc1RyZWUodGhpcy5jdXJyZW50VXJsVHJlZSwgdXJsLCBleGFjdCk7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsVHJlZSA9IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICByZXR1cm4gY29udGFpbnNUcmVlKHRoaXMuY3VycmVudFVybFRyZWUsIHVybFRyZWUsIGV4YWN0KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVtb3ZlRW1wdHlQcm9wcyhwYXJhbXM6IFBhcmFtcyk6IFBhcmFtcyB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHBhcmFtcykucmVkdWNlKChyZXN1bHQ6IFBhcmFtcywga2V5OiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlOiBhbnkgPSBwYXJhbXNba2V5XTtcbiAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sIHt9KTtcbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc05hdmlnYXRpb25zKCk6IHZvaWQge1xuICAgIHRoaXMubmF2aWdhdGlvbnMuc3Vic2NyaWJlKFxuICAgICAgICB0ID0+IHtcbiAgICAgICAgICB0aGlzLm5hdmlnYXRlZCA9IHRydWU7XG4gICAgICAgICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bElkID0gdC5pZDtcbiAgICAgICAgICAodGhpcy5ldmVudHMgYXMgU3ViamVjdDxFdmVudD4pXG4gICAgICAgICAgICAgIC5uZXh0KG5ldyBOYXZpZ2F0aW9uRW5kKFxuICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCB0aGlzLnNlcmlhbGl6ZVVybCh0aGlzLmN1cnJlbnRVcmxUcmVlKSkpO1xuICAgICAgICAgIHRoaXMubGFzdFN1Y2Nlc3NmdWxOYXZpZ2F0aW9uID0gdGhpcy5jdXJyZW50TmF2aWdhdGlvbjtcbiAgICAgICAgICB0aGlzLmN1cnJlbnROYXZpZ2F0aW9uID0gbnVsbDtcbiAgICAgICAgICB0LnJlc29sdmUodHJ1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGUgPT4ge1xuICAgICAgICAgIHRoaXMuY29uc29sZS53YXJuKGBVbmhhbmRsZWQgTmF2aWdhdGlvbiBFcnJvcjogYCk7XG4gICAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzY2hlZHVsZU5hdmlnYXRpb24oXG4gICAgICByYXdVcmw6IFVybFRyZWUsIHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIsIHJlc3RvcmVkU3RhdGU6IFJlc3RvcmVkU3RhdGV8bnVsbCxcbiAgICAgIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyxcbiAgICAgIHByaW9yUHJvbWlzZT86IHtyZXNvbHZlOiBhbnksIHJlamVjdDogYW55LCBwcm9taXNlOiBQcm9taXNlPGJvb2xlYW4+fSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IGxhc3ROYXZpZ2F0aW9uID0gdGhpcy5nZXRUcmFuc2l0aW9uKCk7XG4gICAgLy8gSWYgdGhlIHVzZXIgdHJpZ2dlcnMgYSBuYXZpZ2F0aW9uIGltcGVyYXRpdmVseSAoZS5nLiwgYnkgdXNpbmcgbmF2aWdhdGVCeVVybCksXG4gICAgLy8gYW5kIHRoYXQgbmF2aWdhdGlvbiByZXN1bHRzIGluICdyZXBsYWNlU3RhdGUnIHRoYXQgbGVhZHMgdG8gdGhlIHNhbWUgVVJMLFxuICAgIC8vIHdlIHNob3VsZCBza2lwIHRob3NlLlxuICAgIGlmIChsYXN0TmF2aWdhdGlvbiAmJiBzb3VyY2UgIT09ICdpbXBlcmF0aXZlJyAmJiBsYXN0TmF2aWdhdGlvbi5zb3VyY2UgPT09ICdpbXBlcmF0aXZlJyAmJlxuICAgICAgICBsYXN0TmF2aWdhdGlvbi5yYXdVcmwudG9TdHJpbmcoKSA9PT0gcmF3VXJsLnRvU3RyaW5nKCkpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJ1ZSk7ICAvLyByZXR1cm4gdmFsdWUgaXMgbm90IHVzZWRcbiAgICB9XG5cbiAgICAvLyBCZWNhdXNlIG9mIGEgYnVnIGluIElFIGFuZCBFZGdlLCB0aGUgbG9jYXRpb24gY2xhc3MgZmlyZXMgdHdvIGV2ZW50cyAocG9wc3RhdGUgYW5kXG4gICAgLy8gaGFzaGNoYW5nZSkgZXZlcnkgc2luZ2xlIHRpbWUuIFRoZSBzZWNvbmQgb25lIHNob3VsZCBiZSBpZ25vcmVkLiBPdGhlcndpc2UsIHRoZSBVUkwgd2lsbFxuICAgIC8vIGZsaWNrZXIuIEhhbmRsZXMgdGhlIGNhc2Ugd2hlbiBhIHBvcHN0YXRlIHdhcyBlbWl0dGVkIGZpcnN0LlxuICAgIGlmIChsYXN0TmF2aWdhdGlvbiAmJiBzb3VyY2UgPT0gJ2hhc2hjaGFuZ2UnICYmIGxhc3ROYXZpZ2F0aW9uLnNvdXJjZSA9PT0gJ3BvcHN0YXRlJyAmJlxuICAgICAgICBsYXN0TmF2aWdhdGlvbi5yYXdVcmwudG9TdHJpbmcoKSA9PT0gcmF3VXJsLnRvU3RyaW5nKCkpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJ1ZSk7ICAvLyByZXR1cm4gdmFsdWUgaXMgbm90IHVzZWRcbiAgICB9XG4gICAgLy8gQmVjYXVzZSBvZiBhIGJ1ZyBpbiBJRSBhbmQgRWRnZSwgdGhlIGxvY2F0aW9uIGNsYXNzIGZpcmVzIHR3byBldmVudHMgKHBvcHN0YXRlIGFuZFxuICAgIC8vIGhhc2hjaGFuZ2UpIGV2ZXJ5IHNpbmdsZSB0aW1lLiBUaGUgc2Vjb25kIG9uZSBzaG91bGQgYmUgaWdub3JlZC4gT3RoZXJ3aXNlLCB0aGUgVVJMIHdpbGxcbiAgICAvLyBmbGlja2VyLiBIYW5kbGVzIHRoZSBjYXNlIHdoZW4gYSBoYXNoY2hhbmdlIHdhcyBlbWl0dGVkIGZpcnN0LlxuICAgIGlmIChsYXN0TmF2aWdhdGlvbiAmJiBzb3VyY2UgPT0gJ3BvcHN0YXRlJyAmJiBsYXN0TmF2aWdhdGlvbi5zb3VyY2UgPT09ICdoYXNoY2hhbmdlJyAmJlxuICAgICAgICBsYXN0TmF2aWdhdGlvbi5yYXdVcmwudG9TdHJpbmcoKSA9PT0gcmF3VXJsLnRvU3RyaW5nKCkpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJ1ZSk7ICAvLyByZXR1cm4gdmFsdWUgaXMgbm90IHVzZWRcbiAgICB9XG5cbiAgICBsZXQgcmVzb2x2ZTogYW55O1xuICAgIGxldCByZWplY3Q6IGFueTtcbiAgICBsZXQgcHJvbWlzZTogUHJvbWlzZTxib29sZWFuPjtcbiAgICBpZiAocHJpb3JQcm9taXNlKSB7XG4gICAgICByZXNvbHZlID0gcHJpb3JQcm9taXNlLnJlc29sdmU7XG4gICAgICByZWplY3QgPSBwcmlvclByb21pc2UucmVqZWN0O1xuICAgICAgcHJvbWlzZSA9IHByaW9yUHJvbWlzZS5wcm9taXNlO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHByb21pc2UgPSBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzLCByZWopID0+IHtcbiAgICAgICAgcmVzb2x2ZSA9IHJlcztcbiAgICAgICAgcmVqZWN0ID0gcmVqO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgaWQgPSArK3RoaXMubmF2aWdhdGlvbklkO1xuICAgIHRoaXMuc2V0VHJhbnNpdGlvbih7XG4gICAgICBpZCxcbiAgICAgIHNvdXJjZSxcbiAgICAgIHJlc3RvcmVkU3RhdGUsXG4gICAgICBjdXJyZW50VXJsVHJlZTogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIGN1cnJlbnRSYXdVcmw6IHRoaXMucmF3VXJsVHJlZSxcbiAgICAgIHJhd1VybCxcbiAgICAgIGV4dHJhcyxcbiAgICAgIHJlc29sdmUsXG4gICAgICByZWplY3QsXG4gICAgICBwcm9taXNlLFxuICAgICAgY3VycmVudFNuYXBzaG90OiB0aGlzLnJvdXRlclN0YXRlLnNuYXBzaG90LFxuICAgICAgY3VycmVudFJvdXRlclN0YXRlOiB0aGlzLnJvdXRlclN0YXRlXG4gICAgfSk7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhhdCB0aGUgZXJyb3IgaXMgcHJvcGFnYXRlZCBldmVuIHRob3VnaCBgcHJvY2Vzc05hdmlnYXRpb25zYCBjYXRjaFxuICAgIC8vIGhhbmRsZXIgZG9lcyBub3QgcmV0aHJvd1xuICAgIHJldHVybiBwcm9taXNlLmNhdGNoKChlOiBhbnkpID0+IHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0QnJvd3NlclVybChcbiAgICAgIHVybDogVXJsVHJlZSwgcmVwbGFjZVVybDogYm9vbGVhbiwgaWQ6IG51bWJlciwgc3RhdGU/OiB7W2tleTogc3RyaW5nXTogYW55fSkge1xuICAgIGNvbnN0IHBhdGggPSB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHVybCk7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCB7fTtcbiAgICBpZiAodGhpcy5sb2NhdGlvbi5pc0N1cnJlbnRQYXRoRXF1YWxUbyhwYXRoKSB8fCByZXBsYWNlVXJsKSB7XG4gICAgICAvLyBUT0RPKGphc29uYWRlbik6IFJlbW92ZSBmaXJzdCBgbmF2aWdhdGlvbklkYCBhbmQgcmVseSBvbiBgbmdgIG5hbWVzcGFjZS5cbiAgICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKHBhdGgsICcnLCB7Li4uc3RhdGUsIG5hdmlnYXRpb25JZDogaWR9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5sb2NhdGlvbi5nbyhwYXRoLCAnJywgey4uLnN0YXRlLCBuYXZpZ2F0aW9uSWQ6IGlkfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZXNldFN0YXRlQW5kVXJsKHN0b3JlZFN0YXRlOiBSb3V0ZXJTdGF0ZSwgc3RvcmVkVXJsOiBVcmxUcmVlLCByYXdVcmw6IFVybFRyZWUpOiB2b2lkIHtcbiAgICAodGhpcyBhcyB7cm91dGVyU3RhdGU6IFJvdXRlclN0YXRlfSkucm91dGVyU3RhdGUgPSBzdG9yZWRTdGF0ZTtcbiAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gc3RvcmVkVXJsO1xuICAgIHRoaXMucmF3VXJsVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCByYXdVcmwpO1xuICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gIH1cblxuICBwcml2YXRlIHJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpOiB2b2lkIHtcbiAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShcbiAgICAgICAgdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh0aGlzLnJhd1VybFRyZWUpLCAnJywge25hdmlnYXRpb25JZDogdGhpcy5sYXN0U3VjY2Vzc2Z1bElkfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVDb21tYW5kcyhjb21tYW5kczogc3RyaW5nW10pOiB2b2lkIHtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb21tYW5kcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNtZCA9IGNvbW1hbmRzW2ldO1xuICAgIGlmIChjbWQgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgcmVxdWVzdGVkIHBhdGggY29udGFpbnMgJHtjbWR9IHNlZ21lbnQgYXQgaW5kZXggJHtpfWApO1xuICAgIH1cbiAgfVxufVxuIl19