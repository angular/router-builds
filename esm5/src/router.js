/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
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
import { PreActivation } from './pre_activation';
import { DefaultRouteReuseStrategy } from './route_reuse_strategy';
import { RouterConfigLoader } from './router_config_loader';
import { createEmptyState } from './router_state';
import { isNavigationCancelingError } from './shared';
import { DefaultUrlHandlingStrategy } from './url_handling_strategy';
import { UrlTree, containsTree, createEmptyUrlTree } from './url_tree';
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
 *
 */
var Router = /** @class */ (function () {
    /**
     * Creates the router service.
     */
    // TODO: vsavkin make internal after the final is out.
    function Router(rootComponentType, urlSerializer, rootContexts, location, injector, loader, compiler, config) {
        var _this = this;
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
        var onLoadStart = function (r) { return _this.triggerEvent(new RouteConfigLoadStart(r)); };
        var onLoadEnd = function (r) { return _this.triggerEvent(new RouteConfigLoadEnd(r)); };
        this.ngModule = injector.get(NgModuleRef);
        this.console = injector.get(Console);
        var ngZone = injector.get(NgZone);
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
            guardsResult: null,
            preActivation: null
        });
        this.navigations = this.setupNavigations(this.transitions);
        this.processNavigations();
    }
    Router.prototype.setupNavigations = function (transitions) {
        var _this = this;
        var eventsSubject = this.events;
        return transitions.pipe(filter(function (t) { return t.id !== 0; }), 
        // Extract URL
        map(function (t) { return (tslib_1.__assign({}, t, { extractedUrl: _this.urlHandlingStrategy.extract(t.rawUrl) })); }), 
        // Using switchMap so we cancel executing navigations when a new one comes in
        switchMap(function (t) {
            var completed = false;
            var errored = false;
            return of(t).pipe(switchMap(function (t) {
                var urlTransition = !_this.navigated || t.extractedUrl.toString() !== _this.currentUrlTree.toString();
                var processCurrentUrl = (_this.onSameUrlNavigation === 'reload' ? true : urlTransition) &&
                    _this.urlHandlingStrategy.shouldProcessUrl(t.rawUrl);
                if (processCurrentUrl) {
                    return of(t).pipe(
                    // Update URL if in `eager` update mode
                    tap(function (t) { return _this.urlUpdateStrategy === 'eager' && !t.extras.skipLocationChange &&
                        _this.setBrowserUrl(t.rawUrl, !!t.extras.replaceUrl, t.id); }), 
                    // Fire NavigationStart event
                    switchMap(function (t) {
                        var transition = _this.transitions.getValue();
                        eventsSubject.next(new NavigationStart(t.id, _this.serializeUrl(t.extractedUrl), t.source, t.state));
                        if (transition !== _this.transitions.getValue()) {
                            return EMPTY;
                        }
                        return [t];
                    }), 
                    // This delay is required to match old behavior that forced navigation to
                    // always be async
                    switchMap(function (t) { return Promise.resolve(t); }), 
                    // ApplyRedirects
                    applyRedirects(_this.ngModule.injector, _this.configLoader, _this.urlSerializer, _this.config), 
                    // Recognize
                    recognize(_this.rootComponentType, _this.config, function (url) { return _this.serializeUrl(url); }, _this.paramsInheritanceStrategy), 
                    // Fire RoutesRecognized
                    tap(function (t) {
                        var routesRecognized = new RoutesRecognized(t.id, _this.serializeUrl(t.extractedUrl), _this.serializeUrl(t.urlAfterRedirects), t.targetSnapshot);
                        eventsSubject.next(routesRecognized);
                    }));
                }
                else {
                    var processPreviousUrl = urlTransition && _this.rawUrlTree &&
                        _this.urlHandlingStrategy.shouldProcessUrl(_this.rawUrlTree);
                    /* When the current URL shouldn't be processed, but the previous one was, we
                     * handle this "error condition" by navigating to the previously successful URL,
                     * but leaving the URL intact.*/
                    if (processPreviousUrl) {
                        var id = t.id, extractedUrl = t.extractedUrl, source = t.source, state = t.state, extras = t.extras;
                        var navStart = new NavigationStart(id, _this.serializeUrl(extractedUrl), source, state);
                        eventsSubject.next(navStart);
                        var targetSnapshot = createEmptyState(extractedUrl, _this.rootComponentType).snapshot;
                        return of(tslib_1.__assign({}, t, { targetSnapshot: targetSnapshot, urlAfterRedirects: extractedUrl, extras: tslib_1.__assign({}, extras, { skipLocationChange: false, replaceUrl: false }) }));
                    }
                    else {
                        /* When neither the current or previous URL can be processed, do nothing other
                         * than update router's internal reference to the current "settled" URL. This
                         * way the next navigation will be coming from the current URL in the browser.
                         */
                        _this.rawUrlTree = t.rawUrl;
                        t.resolve(null);
                        return EMPTY;
                    }
                }
            }), 
            // Before Preactivation
            switchTap(function (t) {
                var targetSnapshot = t.targetSnapshot, navigationId = t.id, appliedUrlTree = t.extractedUrl, rawUrlTree = t.rawUrl, _a = t.extras, skipLocationChange = _a.skipLocationChange, replaceUrl = _a.replaceUrl;
                return _this.hooks.beforePreactivation(targetSnapshot, {
                    navigationId: navigationId,
                    appliedUrlTree: appliedUrlTree,
                    rawUrlTree: rawUrlTree,
                    skipLocationChange: !!skipLocationChange,
                    replaceUrl: !!replaceUrl,
                });
            }), 
            // --- GUARDS ---
            tap(function (t) {
                var guardsStart = new GuardsCheckStart(t.id, _this.serializeUrl(t.extractedUrl), _this.serializeUrl(t.urlAfterRedirects), t.targetSnapshot);
                _this.triggerEvent(guardsStart);
            }), map(function (t) {
                var preActivation = new PreActivation(t.targetSnapshot, t.currentSnapshot, _this.ngModule.injector, function (evt) { return _this.triggerEvent(evt); });
                preActivation.initialize(_this.rootContexts);
                return tslib_1.__assign({}, t, { preActivation: preActivation });
            }), checkGuards(), tap(function (t) {
                var guardsEnd = new GuardsCheckEnd(t.id, _this.serializeUrl(t.extractedUrl), _this.serializeUrl(t.urlAfterRedirects), t.targetSnapshot, !!t.guardsResult);
                _this.triggerEvent(guardsEnd);
            }), filter(function (t) {
                if (!t.guardsResult) {
                    _this.resetUrlToCurrentUrlTree();
                    var navCancel = new NavigationCancel(t.id, _this.serializeUrl(t.extractedUrl), '');
                    eventsSubject.next(navCancel);
                    t.resolve(false);
                    return false;
                }
                return true;
            }), 
            // --- RESOLVE ---
            switchTap(function (t) {
                if (t.preActivation.isActivating()) {
                    return of(t).pipe(tap(function (t) {
                        var resolveStart = new ResolveStart(t.id, _this.serializeUrl(t.extractedUrl), _this.serializeUrl(t.urlAfterRedirects), t.targetSnapshot);
                        _this.triggerEvent(resolveStart);
                    }), resolveData(_this.paramsInheritanceStrategy), //
                    tap(function (t) {
                        var resolveEnd = new ResolveEnd(t.id, _this.serializeUrl(t.extractedUrl), _this.serializeUrl(t.urlAfterRedirects), t.targetSnapshot);
                        _this.triggerEvent(resolveEnd);
                    }));
                }
                return undefined;
            }), 
            // --- AFTER PREACTIVATION ---
            switchTap(function (t) {
                var targetSnapshot = t.targetSnapshot, navigationId = t.id, appliedUrlTree = t.extractedUrl, rawUrlTree = t.rawUrl, _a = t.extras, skipLocationChange = _a.skipLocationChange, replaceUrl = _a.replaceUrl;
                return _this.hooks.afterPreactivation(targetSnapshot, {
                    navigationId: navigationId,
                    appliedUrlTree: appliedUrlTree,
                    rawUrlTree: rawUrlTree,
                    skipLocationChange: !!skipLocationChange,
                    replaceUrl: !!replaceUrl,
                });
            }), map(function (t) {
                var targetRouterState = createRouterState(_this.routeReuseStrategy, t.targetSnapshot, t.currentRouterState);
                return (tslib_1.__assign({}, t, { targetRouterState: targetRouterState }));
            }), 
            /* Once here, we are about to activate syncronously. The assumption is this will
               succeed, and user code may read from the Router service. Therefore before
               activation, we need to update router properties storing the current URL and the
               RouterState, as well as updated the browser URL. All this should happen *before*
               activating. */
            tap(function (t) {
                _this.currentUrlTree = t.urlAfterRedirects;
                _this.rawUrlTree = _this.urlHandlingStrategy.merge(_this.currentUrlTree, t.rawUrl);
                _this.routerState = t.targetRouterState;
                if (_this.urlUpdateStrategy === 'deferred' && !t.extras.skipLocationChange) {
                    _this.setBrowserUrl(_this.rawUrlTree, !!t.extras.replaceUrl, t.id);
                }
            }), activateRoutes(_this.rootContexts, _this.routeReuseStrategy, function (evt) { return _this.triggerEvent(evt); }), tap({ next: function () { completed = true; }, complete: function () { completed = true; } }), finalize(function () {
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
                    _this.resetUrlToCurrentUrlTree();
                    var navCancel = new NavigationCancel(t.id, _this.serializeUrl(t.extractedUrl), "Navigation ID " + t.id + " is not equal to the current navigation id " + _this.navigationId);
                    eventsSubject.next(navCancel);
                    t.resolve(false);
                }
            }), catchError(function (e) {
                errored = true;
                /* This error type is issued during Redirect, and is handled as a cancellation
                 * rather than an error. */
                if (isNavigationCancelingError(e)) {
                    _this.navigated = true;
                    _this.resetStateAndUrl(t.currentRouterState, t.currentUrlTree, t.rawUrl);
                    var navCancel = new NavigationCancel(t.id, _this.serializeUrl(t.extractedUrl), e.message);
                    eventsSubject.next(navCancel);
                    /* All other errors should reset to the router's internal URL reference to the
                     * pre-error state. */
                }
                else {
                    _this.resetStateAndUrl(t.currentRouterState, t.currentUrlTree, t.rawUrl);
                    var navError = new NavigationError(t.id, _this.serializeUrl(t.extractedUrl), e);
                    eventsSubject.next(navError);
                    try {
                        t.resolve(_this.errorHandler(e));
                    }
                    catch (ee) {
                        t.reject(ee);
                    }
                }
                return EMPTY;
            }));
            // TODO(jasonaden): remove cast once g3 is on updated TypeScript
        }));
    };
    /**
     * @internal
     * TODO: this should be removed once the constructor of the router made internal
     */
    Router.prototype.resetRootComponentType = function (rootComponentType) {
        this.rootComponentType = rootComponentType;
        // TODO: vsavkin router 4.0 should make the root component set to null
        // this will simplify the lifecycle of the router.
        this.routerState.root.component = this.rootComponentType;
    };
    Router.prototype.getTransition = function () { return this.transitions.value; };
    Router.prototype.setTransition = function (t) {
        this.transitions.next(tslib_1.__assign({}, this.getTransition(), t));
    };
    /**
     * Sets up the location change listener and performs the initial navigation.
     */
    Router.prototype.initialNavigation = function () {
        this.setUpLocationChangeListener();
        if (this.navigationId === 0) {
            this.navigateByUrl(this.location.path(true), { replaceUrl: true });
        }
    };
    /**
     * Sets up the location change listener.
     */
    Router.prototype.setUpLocationChangeListener = function () {
        var _this = this;
        // Don't need to use Zone.wrap any more, because zone.js
        // already patch onPopState, so location change callback will
        // run into ngZone
        if (!this.locationSubscription) {
            this.locationSubscription = this.location.subscribe(function (change) {
                var rawUrlTree = _this.parseUrl(change['url']);
                var source = change['type'] === 'popstate' ? 'popstate' : 'hashchange';
                var state = change.state && change.state.navigationId ?
                    { navigationId: change.state.navigationId } :
                    null;
                setTimeout(function () { _this.scheduleNavigation(rawUrlTree, source, state, { replaceUrl: true }); }, 0);
            });
        }
    };
    Object.defineProperty(Router.prototype, "url", {
        /** The current url */
        get: function () { return this.serializeUrl(this.currentUrlTree); },
        enumerable: true,
        configurable: true
    });
    /** @internal */
    Router.prototype.triggerEvent = function (event) { this.events.next(event); };
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
    Router.prototype.resetConfig = function (config) {
        validateConfig(config);
        this.config = config.map(standardizeConfig);
        this.navigated = false;
        this.lastSuccessfulId = -1;
    };
    /** @docsNotRequired */
    Router.prototype.ngOnDestroy = function () { this.dispose(); };
    /** Disposes of the router */
    Router.prototype.dispose = function () {
        if (this.locationSubscription) {
            this.locationSubscription.unsubscribe();
            this.locationSubscription = null;
        }
    };
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
    Router.prototype.createUrlTree = function (commands, navigationExtras) {
        if (navigationExtras === void 0) { navigationExtras = {}; }
        var relativeTo = navigationExtras.relativeTo, queryParams = navigationExtras.queryParams, fragment = navigationExtras.fragment, preserveQueryParams = navigationExtras.preserveQueryParams, queryParamsHandling = navigationExtras.queryParamsHandling, preserveFragment = navigationExtras.preserveFragment;
        if (isDevMode() && preserveQueryParams && console && console.warn) {
            console.warn('preserveQueryParams is deprecated, use queryParamsHandling instead.');
        }
        var a = relativeTo || this.routerState.root;
        var f = preserveFragment ? this.currentUrlTree.fragment : fragment;
        var q = null;
        if (queryParamsHandling) {
            switch (queryParamsHandling) {
                case 'merge':
                    q = tslib_1.__assign({}, this.currentUrlTree.queryParams, queryParams);
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
    };
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
    Router.prototype.navigateByUrl = function (url, extras) {
        if (extras === void 0) { extras = { skipLocationChange: false }; }
        if (isDevMode() && this.isNgZoneEnabled && !NgZone.isInAngularZone()) {
            this.console.warn("Navigation triggered outside Angular zone, did you forget to call 'ngZone.run()'?");
        }
        var urlTree = url instanceof UrlTree ? url : this.parseUrl(url);
        var mergedTree = this.urlHandlingStrategy.merge(urlTree, this.rawUrlTree);
        return this.scheduleNavigation(mergedTree, 'imperative', null, extras);
    };
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
    Router.prototype.navigate = function (commands, extras) {
        if (extras === void 0) { extras = { skipLocationChange: false }; }
        validateCommands(commands);
        return this.navigateByUrl(this.createUrlTree(commands, extras), extras);
    };
    /** Serializes a `UrlTree` into a string */
    Router.prototype.serializeUrl = function (url) { return this.urlSerializer.serialize(url); };
    /** Parses a string into a `UrlTree` */
    Router.prototype.parseUrl = function (url) {
        var urlTree;
        try {
            urlTree = this.urlSerializer.parse(url);
        }
        catch (e) {
            urlTree = this.malformedUriErrorHandler(e, this.urlSerializer, url);
        }
        return urlTree;
    };
    /** Returns whether the url is activated */
    Router.prototype.isActive = function (url, exact) {
        if (url instanceof UrlTree) {
            return containsTree(this.currentUrlTree, url, exact);
        }
        var urlTree = this.parseUrl(url);
        return containsTree(this.currentUrlTree, urlTree, exact);
    };
    Router.prototype.removeEmptyProps = function (params) {
        return Object.keys(params).reduce(function (result, key) {
            var value = params[key];
            if (value !== null && value !== undefined) {
                result[key] = value;
            }
            return result;
        }, {});
    };
    Router.prototype.processNavigations = function () {
        var _this = this;
        this.navigations.subscribe(function (t) {
            _this.navigated = true;
            _this.lastSuccessfulId = t.id;
            _this.events
                .next(new NavigationEnd(t.id, _this.serializeUrl(t.extractedUrl), _this.serializeUrl(_this.currentUrlTree)));
            t.resolve(true);
        }, function (e) { _this.console.warn("Unhandled Navigation Error: "); });
    };
    Router.prototype.scheduleNavigation = function (rawUrl, source, state, extras) {
        var lastNavigation = this.getTransition();
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
        var resolve = null;
        var reject = null;
        var promise = new Promise(function (res, rej) {
            resolve = res;
            reject = rej;
        });
        var id = ++this.navigationId;
        this.setTransition({
            id: id,
            source: source,
            state: state,
            currentUrlTree: this.currentUrlTree,
            currentRawUrl: this.rawUrlTree, rawUrl: rawUrl, extras: extras, resolve: resolve, reject: reject, promise: promise,
            currentSnapshot: this.routerState.snapshot,
            currentRouterState: this.routerState
        });
        // Make sure that the error is propagated even though `processNavigations` catch
        // handler does not rethrow
        return promise.catch(function (e) { return Promise.reject(e); });
    };
    Router.prototype.setBrowserUrl = function (url, replaceUrl, id) {
        var path = this.urlSerializer.serialize(url);
        if (this.location.isCurrentPathEqualTo(path) || replaceUrl) {
            this.location.replaceState(path, '', { navigationId: id });
        }
        else {
            this.location.go(path, '', { navigationId: id });
        }
    };
    Router.prototype.resetStateAndUrl = function (storedState, storedUrl, rawUrl) {
        this.routerState = storedState;
        this.currentUrlTree = storedUrl;
        this.rawUrlTree = this.urlHandlingStrategy.merge(this.currentUrlTree, rawUrl);
        this.resetUrlToCurrentUrlTree();
    };
    Router.prototype.resetUrlToCurrentUrlTree = function () {
        this.location.replaceState(this.urlSerializer.serialize(this.rawUrlTree), '', { navigationId: this.lastSuccessfulId });
    };
    return Router;
}());
export { Router };
function validateCommands(commands) {
    for (var i = 0; i < commands.length; i++) {
        var cmd = commands[i];
        if (cmd == null) {
            throw new Error("The requested path contains " + cmd + " segment at index " + i);
        }
    }
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOztBQUdILE9BQU8sRUFBNEMsV0FBVyxFQUFFLE1BQU0sRUFBUSxTQUFTLEVBQUUsUUFBUSxJQUFJLE9BQU8sRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNuSSxPQUFPLEVBQUMsZUFBZSxFQUFFLEtBQUssRUFBYyxPQUFPLEVBQWdCLEVBQUUsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUNwRixPQUFPLEVBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUVqRixPQUFPLEVBQXFDLGlCQUFpQixFQUFFLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUMvRixPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUN4RCxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDaEQsT0FBTyxFQUFRLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBcUIsVUFBVSxFQUFFLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3TyxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNyRCxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDaEQsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFN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QUksRUFBRSxFQUFFLEVBQUUsRUFBQyxZQUFZLEVBQUUsRUFBRSxFQUFDLENBQUMsQ0FBQztTQUNoRDtJQUNILENBQUM7SUFFTyxpQ0FBZ0IsR0FBeEIsVUFBeUIsV0FBd0IsRUFBRSxTQUFrQixFQUFFLE1BQWU7UUFDbkYsSUFBa0MsQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQzlELElBQUksQ0FBQyxjQUFjLEdBQUcsU0FBUyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzlFLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO0lBQ2xDLENBQUM7SUFFTyx5Q0FBd0IsR0FBaEM7UUFDRSxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FDdEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUMsQ0FBQyxDQUFDO0lBQ2hHLENBQUM7SUFDSCxhQUFDO0FBQUQsQ0FBQyxBQXZ1QkQsSUF1dUJDOztBQUVELFNBQVMsZ0JBQWdCLENBQUMsUUFBa0I7SUFDMUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDeEMsSUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsaUNBQStCLEdBQUcsMEJBQXFCLENBQUcsQ0FBQyxDQUFDO1NBQzdFO0tBQ0Y7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtDb21waWxlciwgSW5qZWN0b3IsIE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgTmdNb2R1bGVSZWYsIE5nWm9uZSwgVHlwZSwgaXNEZXZNb2RlLCDJtUNvbnNvbGUgYXMgQ29uc29sZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0JlaGF2aW9yU3ViamVjdCwgRU1QVFksIE9ic2VydmFibGUsIFN1YmplY3QsIFN1YnNjcmlwdGlvbiwgb2YgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y2F0Y2hFcnJvciwgZmlsdGVyLCBmaW5hbGl6ZSwgbWFwLCBzd2l0Y2hNYXAsIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge1F1ZXJ5UGFyYW1zSGFuZGxpbmcsIFJvdXRlLCBSb3V0ZXMsIHN0YW5kYXJkaXplQ29uZmlnLCB2YWxpZGF0ZUNvbmZpZ30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtjcmVhdGVSb3V0ZXJTdGF0ZX0gZnJvbSAnLi9jcmVhdGVfcm91dGVyX3N0YXRlJztcbmltcG9ydCB7Y3JlYXRlVXJsVHJlZX0gZnJvbSAnLi9jcmVhdGVfdXJsX3RyZWUnO1xuaW1wb3J0IHtFdmVudCwgR3VhcmRzQ2hlY2tFbmQsIEd1YXJkc0NoZWNrU3RhcnQsIE5hdmlnYXRpb25DYW5jZWwsIE5hdmlnYXRpb25FbmQsIE5hdmlnYXRpb25FcnJvciwgTmF2aWdhdGlvblN0YXJ0LCBOYXZpZ2F0aW9uVHJpZ2dlciwgUmVzb2x2ZUVuZCwgUmVzb2x2ZVN0YXJ0LCBSb3V0ZUNvbmZpZ0xvYWRFbmQsIFJvdXRlQ29uZmlnTG9hZFN0YXJ0LCBSb3V0ZXNSZWNvZ25pemVkfSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge2FjdGl2YXRlUm91dGVzfSBmcm9tICcuL29wZXJhdG9ycy9hY3RpdmF0ZV9yb3V0ZXMnO1xuaW1wb3J0IHthcHBseVJlZGlyZWN0c30gZnJvbSAnLi9vcGVyYXRvcnMvYXBwbHlfcmVkaXJlY3RzJztcbmltcG9ydCB7Y2hlY2tHdWFyZHN9IGZyb20gJy4vb3BlcmF0b3JzL2NoZWNrX2d1YXJkcyc7XG5pbXBvcnQge3JlY29nbml6ZX0gZnJvbSAnLi9vcGVyYXRvcnMvcmVjb2duaXplJztcbmltcG9ydCB7cmVzb2x2ZURhdGF9IGZyb20gJy4vb3BlcmF0b3JzL3Jlc29sdmVfZGF0YSc7XG5pbXBvcnQge3N3aXRjaFRhcH0gZnJvbSAnLi9vcGVyYXRvcnMvc3dpdGNoX3RhcCc7XG5pbXBvcnQge1ByZUFjdGl2YXRpb259IGZyb20gJy4vcHJlX2FjdGl2YXRpb24nO1xuaW1wb3J0IHtEZWZhdWx0Um91dGVSZXVzZVN0cmF0ZWd5LCBSb3V0ZVJldXNlU3RyYXRlZ3l9IGZyb20gJy4vcm91dGVfcmV1c2Vfc3RyYXRlZ3knO1xuaW1wb3J0IHtSb3V0ZXJDb25maWdMb2FkZXJ9IGZyb20gJy4vcm91dGVyX2NvbmZpZ19sb2FkZXInO1xuaW1wb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzfSBmcm9tICcuL3JvdXRlcl9vdXRsZXRfY29udGV4dCc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlLCBSb3V0ZXJTdGF0ZSwgUm91dGVyU3RhdGVTbmFwc2hvdCwgY3JlYXRlRW1wdHlTdGF0ZX0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQYXJhbXMsIGlzTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge0RlZmF1bHRVcmxIYW5kbGluZ1N0cmF0ZWd5LCBVcmxIYW5kbGluZ1N0cmF0ZWd5fSBmcm9tICcuL3VybF9oYW5kbGluZ19zdHJhdGVneSc7XG5pbXBvcnQge1VybFNlcmlhbGl6ZXIsIFVybFRyZWUsIGNvbnRhaW5zVHJlZSwgY3JlYXRlRW1wdHlVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIGV4dHJhIG9wdGlvbnMgdXNlZCBkdXJpbmcgbmF2aWdhdGlvbi5cbiAqXG4gKlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5hdmlnYXRpb25FeHRyYXMge1xuICAvKipcbiAgICogRW5hYmxlcyByZWxhdGl2ZSBuYXZpZ2F0aW9uIGZyb20gdGhlIGN1cnJlbnQgQWN0aXZhdGVkUm91dGUuXG4gICAqXG4gICAqIENvbmZpZ3VyYXRpb246XG4gICAqXG4gICAqIGBgYFxuICAgKiBbe1xuICAqICAgcGF0aDogJ3BhcmVudCcsXG4gICogICBjb21wb25lbnQ6IFBhcmVudENvbXBvbmVudCxcbiAgKiAgIGNoaWxkcmVuOiBbe1xuICAqICAgICBwYXRoOiAnbGlzdCcsXG4gICogICAgIGNvbXBvbmVudDogTGlzdENvbXBvbmVudFxuICAqICAgfSx7XG4gICogICAgIHBhdGg6ICdjaGlsZCcsXG4gICogICAgIGNvbXBvbmVudDogQ2hpbGRDb21wb25lbnRcbiAgKiAgIH1dXG4gICogfV1cbiAgICogYGBgXG4gICAqXG4gICAqIE5hdmlnYXRlIHRvIGxpc3Qgcm91dGUgZnJvbSBjaGlsZCByb3V0ZTpcbiAgICpcbiAgICogYGBgXG4gICAqICBAQ29tcG9uZW50KHsuLi59KVxuICAgKiAgY2xhc3MgQ2hpbGRDb21wb25lbnQge1xuICAqICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsIHByaXZhdGUgcm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7fVxuICAqXG4gICogICAgZ28oKSB7XG4gICogICAgICB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy4uL2xpc3QnXSwgeyByZWxhdGl2ZVRvOiB0aGlzLnJvdXRlIH0pO1xuICAqICAgIH1cbiAgKiAgfVxuICAgKiBgYGBcbiAgICovXG4gIHJlbGF0aXZlVG8/OiBBY3RpdmF0ZWRSb3V0ZXxudWxsO1xuXG4gIC8qKlxuICAgKiBTZXRzIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gdGhlIFVSTC5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHRvIC9yZXN1bHRzP3BhZ2U9MVxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy9yZXN1bHRzJ10sIHsgcXVlcnlQYXJhbXM6IHsgcGFnZTogMSB9IH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHF1ZXJ5UGFyYW1zPzogUGFyYW1zfG51bGw7XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGhhc2ggZnJhZ21lbnQgZm9yIHRoZSBVUkwuXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBOYXZpZ2F0ZSB0byAvcmVzdWx0cyN0b3BcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvcmVzdWx0cyddLCB7IGZyYWdtZW50OiAndG9wJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudD86IHN0cmluZztcblxuICAvKipcbiAgICogUHJlc2VydmVzIHRoZSBxdWVyeSBwYXJhbWV0ZXJzIGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBkZXByZWNhdGVkLCB1c2UgYHF1ZXJ5UGFyYW1zSGFuZGxpbmdgIGluc3RlYWRcbiAgICpcbiAgICogYGBgXG4gICAqIC8vIFByZXNlcnZlIHF1ZXJ5IHBhcmFtcyBmcm9tIC9yZXN1bHRzP3BhZ2U9MSB0byAvdmlldz9wYWdlPTFcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHByZXNlcnZlUXVlcnlQYXJhbXM6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBzaW5jZSB2NFxuICAgKi9cbiAgcHJlc2VydmVRdWVyeVBhcmFtcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqICBjb25maWcgc3RyYXRlZ3kgdG8gaGFuZGxlIHRoZSBxdWVyeSBwYXJhbWV0ZXJzIGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBgYGBcbiAgICogLy8gZnJvbSAvcmVzdWx0cz9wYWdlPTEgdG8gL3ZpZXc/cGFnZT0xJnBhZ2U9MlxuICAgKiB0aGlzLnJvdXRlci5uYXZpZ2F0ZShbJy92aWV3J10sIHsgcXVlcnlQYXJhbXM6IHsgcGFnZTogMiB9LCAgcXVlcnlQYXJhbXNIYW5kbGluZzogXCJtZXJnZVwiIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHF1ZXJ5UGFyYW1zSGFuZGxpbmc/OiBRdWVyeVBhcmFtc0hhbmRsaW5nfG51bGw7XG4gIC8qKlxuICAgKiBQcmVzZXJ2ZXMgdGhlIGZyYWdtZW50IGZvciB0aGUgbmV4dCBuYXZpZ2F0aW9uXG4gICAqXG4gICAqIGBgYFxuICAgKiAvLyBQcmVzZXJ2ZSBmcmFnbWVudCBmcm9tIC9yZXN1bHRzI3RvcCB0byAvdmlldyN0b3BcbiAgICogdGhpcy5yb3V0ZXIubmF2aWdhdGUoWycvdmlldyddLCB7IHByZXNlcnZlRnJhZ21lbnQ6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgcHJlc2VydmVGcmFnbWVudD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBOYXZpZ2F0ZXMgd2l0aG91dCBwdXNoaW5nIGEgbmV3IHN0YXRlIGludG8gaGlzdG9yeS5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHNpbGVudGx5IHRvIC92aWV3XG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyBza2lwTG9jYXRpb25DaGFuZ2U6IHRydWUgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgc2tpcExvY2F0aW9uQ2hhbmdlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIE5hdmlnYXRlcyB3aGlsZSByZXBsYWNpbmcgdGhlIGN1cnJlbnQgc3RhdGUgaW4gaGlzdG9yeS5cbiAgICpcbiAgICogYGBgXG4gICAqIC8vIE5hdmlnYXRlIHRvIC92aWV3XG4gICAqIHRoaXMucm91dGVyLm5hdmlnYXRlKFsnL3ZpZXcnXSwgeyByZXBsYWNlVXJsOiB0cnVlIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHJlcGxhY2VVcmw/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEVycm9yIGhhbmRsZXIgdGhhdCBpcyBpbnZva2VkIHdoZW4gYSBuYXZpZ2F0aW9uIGVycm9ycy5cbiAqXG4gKiBJZiB0aGUgaGFuZGxlciByZXR1cm5zIGEgdmFsdWUsIHRoZSBuYXZpZ2F0aW9uIHByb21pc2Ugd2lsbCBiZSByZXNvbHZlZCB3aXRoIHRoaXMgdmFsdWUuXG4gKiBJZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLCB0aGUgbmF2aWdhdGlvbiBwcm9taXNlIHdpbGwgYmUgcmVqZWN0ZWQgd2l0aFxuICogdGhlIGV4Y2VwdGlvbi5cbiAqXG4gKlxuICovXG5leHBvcnQgdHlwZSBFcnJvckhhbmRsZXIgPSAoZXJyb3I6IGFueSkgPT4gYW55O1xuXG5mdW5jdGlvbiBkZWZhdWx0RXJyb3JIYW5kbGVyKGVycm9yOiBhbnkpOiBhbnkge1xuICB0aHJvdyBlcnJvcjtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdE1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcihcbiAgICBlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gIHJldHVybiB1cmxTZXJpYWxpemVyLnBhcnNlKCcvJyk7XG59XG5cbnR5cGUgTmF2U3RyZWFtVmFsdWUgPVxuICAgIGJvb2xlYW4gfCB7YXBwbGllZFVybDogVXJsVHJlZSwgc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QsIHNob3VsZEFjdGl2YXRlPzogYm9vbGVhbn07XG5cbmV4cG9ydCB0eXBlIE5hdmlnYXRpb25UcmFuc2l0aW9uID0ge1xuICBpZDogbnVtYmVyLFxuICBjdXJyZW50VXJsVHJlZTogVXJsVHJlZSxcbiAgY3VycmVudFJhd1VybDogVXJsVHJlZSxcbiAgZXh0cmFjdGVkVXJsOiBVcmxUcmVlLFxuICB1cmxBZnRlclJlZGlyZWN0czogVXJsVHJlZSxcbiAgcmF3VXJsOiBVcmxUcmVlLFxuICBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMsXG4gIHJlc29sdmU6IGFueSxcbiAgcmVqZWN0OiBhbnksXG4gIHByb21pc2U6IFByb21pc2U8Ym9vbGVhbj4sXG4gIHNvdXJjZTogTmF2aWdhdGlvblRyaWdnZXIsXG4gIHN0YXRlOiB7bmF2aWdhdGlvbklkOiBudW1iZXJ9IHwgbnVsbCxcbiAgY3VycmVudFNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxuICB0YXJnZXRTbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCB8IG51bGwsXG4gIGN1cnJlbnRSb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGUsXG4gIHRhcmdldFJvdXRlclN0YXRlOiBSb3V0ZXJTdGF0ZSB8IG51bGwsXG4gIGd1YXJkc1Jlc3VsdDogYm9vbGVhbiB8IG51bGwsXG4gIHByZUFjdGl2YXRpb246IFByZUFjdGl2YXRpb24gfCBudWxsXG59O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgdHlwZSBSb3V0ZXJIb29rID0gKHNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90LCBydW5FeHRyYXM6IHtcbiAgYXBwbGllZFVybFRyZWU6IFVybFRyZWUsXG4gIHJhd1VybFRyZWU6IFVybFRyZWUsXG4gIHNraXBMb2NhdGlvbkNoYW5nZTogYm9vbGVhbixcbiAgcmVwbGFjZVVybDogYm9vbGVhbixcbiAgbmF2aWdhdGlvbklkOiBudW1iZXJcbn0pID0+IE9ic2VydmFibGU8dm9pZD47XG5cbi8qKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGRlZmF1bHRSb3V0ZXJIb29rKHNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90LCBydW5FeHRyYXM6IHtcbiAgYXBwbGllZFVybFRyZWU6IFVybFRyZWUsXG4gIHJhd1VybFRyZWU6IFVybFRyZWUsXG4gIHNraXBMb2NhdGlvbkNoYW5nZTogYm9vbGVhbixcbiAgcmVwbGFjZVVybDogYm9vbGVhbixcbiAgbmF2aWdhdGlvbklkOiBudW1iZXJcbn0pOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgcmV0dXJuIG9mIChudWxsKSBhcyBhbnk7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUHJvdmlkZXMgdGhlIG5hdmlnYXRpb24gYW5kIHVybCBtYW5pcHVsYXRpb24gY2FwYWJpbGl0aWVzLlxuICpcbiAqIFNlZSBgUm91dGVzYCBmb3IgbW9yZSBkZXRhaWxzIGFuZCBleGFtcGxlcy5cbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICpcbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlciB7XG4gIHByaXZhdGUgY3VycmVudFVybFRyZWU6IFVybFRyZWU7XG4gIHByaXZhdGUgcmF3VXJsVHJlZTogVXJsVHJlZTtcbiAgcHJpdmF0ZSByZWFkb25seSB0cmFuc2l0aW9uczogQmVoYXZpb3JTdWJqZWN0PE5hdmlnYXRpb25UcmFuc2l0aW9uPjtcbiAgcHJpdmF0ZSBuYXZpZ2F0aW9uczogT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj47XG5cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgbG9jYXRpb25TdWJzY3JpcHRpb24gITogU3Vic2NyaXB0aW9uO1xuICBwcml2YXRlIG5hdmlnYXRpb25JZDogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBjb25maWdMb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcjtcbiAgcHJpdmF0ZSBuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55PjtcbiAgcHJpdmF0ZSBjb25zb2xlOiBDb25zb2xlO1xuICBwcml2YXRlIGlzTmdab25lRW5hYmxlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIHB1YmxpYyByZWFkb25seSBldmVudHM6IE9ic2VydmFibGU8RXZlbnQ+ID0gbmV3IFN1YmplY3Q8RXZlbnQ+KCk7XG4gIHB1YmxpYyByZWFkb25seSByb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGU7XG5cbiAgLyoqXG4gICAqIEVycm9yIGhhbmRsZXIgdGhhdCBpcyBpbnZva2VkIHdoZW4gYSBuYXZpZ2F0aW9uIGVycm9ycy5cbiAgICpcbiAgICogU2VlIGBFcnJvckhhbmRsZXJgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICAgKi9cbiAgZXJyb3JIYW5kbGVyOiBFcnJvckhhbmRsZXIgPSBkZWZhdWx0RXJyb3JIYW5kbGVyO1xuXG4gIC8qKlxuICAgKiBNYWxmb3JtZWQgdXJpIGVycm9yIGhhbmRsZXIgaXMgaW52b2tlZCB3aGVuIGBSb3V0ZXIucGFyc2VVcmwodXJsKWAgdGhyb3dzIGFuXG4gICAqIGVycm9yIGR1ZSB0byBjb250YWluaW5nIGFuIGludmFsaWQgY2hhcmFjdGVyLiBUaGUgbW9zdCBjb21tb24gY2FzZSB3b3VsZCBiZSBhIGAlYCBzaWduXG4gICAqIHRoYXQncyBub3QgZW5jb2RlZCBhbmQgaXMgbm90IHBhcnQgb2YgYSBwZXJjZW50IGVuY29kZWQgc2VxdWVuY2UuXG4gICAqL1xuICBtYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI6XG4gICAgICAoZXJyb3I6IFVSSUVycm9yLCB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgICAgIHVybDogc3RyaW5nKSA9PiBVcmxUcmVlID0gZGVmYXVsdE1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcjtcblxuICAvKipcbiAgICogSW5kaWNhdGVzIGlmIGF0IGxlYXN0IG9uZSBuYXZpZ2F0aW9uIGhhcHBlbmVkLlxuICAgKi9cbiAgbmF2aWdhdGVkOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgbGFzdFN1Y2Nlc3NmdWxJZDogbnVtYmVyID0gLTE7XG5cbiAgLyoqXG4gICAqIFVzZWQgYnkgUm91dGVyTW9kdWxlLiBUaGlzIGFsbG93cyB1cyB0b1xuICAgKiBwYXVzZSB0aGUgbmF2aWdhdGlvbiBlaXRoZXIgYmVmb3JlIHByZWFjdGl2YXRpb24gb3IgYWZ0ZXIgaXQuXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgaG9va3M6IHtiZWZvcmVQcmVhY3RpdmF0aW9uOiBSb3V0ZXJIb29rLCBhZnRlclByZWFjdGl2YXRpb246IFJvdXRlckhvb2t9ID0ge1xuICAgIGJlZm9yZVByZWFjdGl2YXRpb246IGRlZmF1bHRSb3V0ZXJIb29rLFxuICAgIGFmdGVyUHJlYWN0aXZhdGlvbjogZGVmYXVsdFJvdXRlckhvb2tcbiAgfTtcblxuICAvKipcbiAgICogRXh0cmFjdHMgYW5kIG1lcmdlcyBVUkxzLiBVc2VkIGZvciBBbmd1bGFySlMgdG8gQW5ndWxhciBtaWdyYXRpb25zLlxuICAgKi9cbiAgdXJsSGFuZGxpbmdTdHJhdGVneTogVXJsSGFuZGxpbmdTdHJhdGVneSA9IG5ldyBEZWZhdWx0VXJsSGFuZGxpbmdTdHJhdGVneSgpO1xuXG4gIHJvdXRlUmV1c2VTdHJhdGVneTogUm91dGVSZXVzZVN0cmF0ZWd5ID0gbmV3IERlZmF1bHRSb3V0ZVJldXNlU3RyYXRlZ3koKTtcblxuICAvKipcbiAgICogRGVmaW5lIHdoYXQgdGhlIHJvdXRlciBzaG91bGQgZG8gaWYgaXQgcmVjZWl2ZXMgYSBuYXZpZ2F0aW9uIHJlcXVlc3QgdG8gdGhlIGN1cnJlbnQgVVJMLlxuICAgKiBCeSBkZWZhdWx0LCB0aGUgcm91dGVyIHdpbGwgaWdub3JlIHRoaXMgbmF2aWdhdGlvbi4gSG93ZXZlciwgdGhpcyBwcmV2ZW50cyBmZWF0dXJlcyBzdWNoXG4gICAqIGFzIGEgXCJyZWZyZXNoXCIgYnV0dG9uLiBVc2UgdGhpcyBvcHRpb24gdG8gY29uZmlndXJlIHRoZSBiZWhhdmlvciB3aGVuIG5hdmlnYXRpbmcgdG8gdGhlXG4gICAqIGN1cnJlbnQgVVJMLiBEZWZhdWx0IGlzICdpZ25vcmUnLlxuICAgKi9cbiAgb25TYW1lVXJsTmF2aWdhdGlvbjogJ3JlbG9hZCd8J2lnbm9yZScgPSAnaWdub3JlJztcblxuICAvKipcbiAgICogRGVmaW5lcyBob3cgdGhlIHJvdXRlciBtZXJnZXMgcGFyYW1zLCBkYXRhIGFuZCByZXNvbHZlZCBkYXRhIGZyb20gcGFyZW50IHRvIGNoaWxkXG4gICAqIHJvdXRlcy4gQXZhaWxhYmxlIG9wdGlvbnMgYXJlOlxuICAgKlxuICAgKiAtIGAnZW1wdHlPbmx5J2AsIHRoZSBkZWZhdWx0LCBvbmx5IGluaGVyaXRzIHBhcmVudCBwYXJhbXMgZm9yIHBhdGgtbGVzcyBvciBjb21wb25lbnQtbGVzc1xuICAgKiAgIHJvdXRlcy5cbiAgICogLSBgJ2Fsd2F5cydgLCBlbmFibGVzIHVuY29uZGl0aW9uYWwgaW5oZXJpdGFuY2Ugb2YgcGFyZW50IHBhcmFtcy5cbiAgICovXG4gIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6ICdlbXB0eU9ubHknfCdhbHdheXMnID0gJ2VtcHR5T25seSc7XG5cbiAgLyoqXG4gICAqIERlZmluZXMgd2hlbiB0aGUgcm91dGVyIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMLiBUaGUgZGVmYXVsdCBiZWhhdmlvciBpcyB0byB1cGRhdGUgYWZ0ZXJcbiAgICogc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uLiBIb3dldmVyLCBzb21lIGFwcGxpY2F0aW9ucyBtYXkgcHJlZmVyIGEgbW9kZSB3aGVyZSB0aGUgVVJMIGdldHNcbiAgICogdXBkYXRlZCBhdCB0aGUgYmVnaW5uaW5nIG9mIG5hdmlnYXRpb24uIFRoZSBtb3N0IGNvbW1vbiB1c2UgY2FzZSB3b3VsZCBiZSB1cGRhdGluZyB0aGVcbiAgICogVVJMIGVhcmx5IHNvIGlmIG5hdmlnYXRpb24gZmFpbHMsIHlvdSBjYW4gc2hvdyBhbiBlcnJvciBtZXNzYWdlIHdpdGggdGhlIFVSTCB0aGF0IGZhaWxlZC5cbiAgICogQXZhaWxhYmxlIG9wdGlvbnMgYXJlOlxuICAgKlxuICAgKiAtIGAnZGVmZXJyZWQnYCwgdGhlIGRlZmF1bHQsIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMIGFmdGVyIG5hdmlnYXRpb24gaGFzIGZpbmlzaGVkLlxuICAgKiAtIGAnZWFnZXInYCwgdXBkYXRlcyBicm93c2VyIFVSTCBhdCB0aGUgYmVnaW5uaW5nIG9mIG5hdmlnYXRpb24uXG4gICAqL1xuICB1cmxVcGRhdGVTdHJhdGVneTogJ2RlZmVycmVkJ3wnZWFnZXInID0gJ2RlZmVycmVkJztcblxuICAvKipcbiAgICogU2VlIHtAbGluayBSb3V0ZXJNb2R1bGV9IGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICAgKi9cbiAgcmVsYXRpdmVMaW5rUmVzb2x1dGlvbjogJ2xlZ2FjeSd8J2NvcnJlY3RlZCcgPSAnbGVnYWN5JztcblxuICAvKipcbiAgICogQ3JlYXRlcyB0aGUgcm91dGVyIHNlcnZpY2UuXG4gICAqL1xuICAvLyBUT0RPOiB2c2F2a2luIG1ha2UgaW50ZXJuYWwgYWZ0ZXIgdGhlIGZpbmFsIGlzIG91dC5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT58bnVsbCwgcHJpdmF0ZSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgICAgcHJpdmF0ZSByb290Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIHByaXZhdGUgbG9jYXRpb246IExvY2F0aW9uLCBpbmplY3RvcjogSW5qZWN0b3IsXG4gICAgICBsb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLCBwdWJsaWMgY29uZmlnOiBSb3V0ZXMpIHtcbiAgICBjb25zdCBvbkxvYWRTdGFydCA9IChyOiBSb3V0ZSkgPT4gdGhpcy50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZFN0YXJ0KHIpKTtcbiAgICBjb25zdCBvbkxvYWRFbmQgPSAocjogUm91dGUpID0+IHRoaXMudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRFbmQocikpO1xuXG4gICAgdGhpcy5uZ01vZHVsZSA9IGluamVjdG9yLmdldChOZ01vZHVsZVJlZik7XG4gICAgdGhpcy5jb25zb2xlID0gaW5qZWN0b3IuZ2V0KENvbnNvbGUpO1xuICAgIGNvbnN0IG5nWm9uZSA9IGluamVjdG9yLmdldChOZ1pvbmUpO1xuICAgIHRoaXMuaXNOZ1pvbmVFbmFibGVkID0gbmdab25lIGluc3RhbmNlb2YgTmdab25lO1xuXG4gICAgdGhpcy5yZXNldENvbmZpZyhjb25maWcpO1xuICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSBjcmVhdGVFbXB0eVVybFRyZWUoKTtcbiAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLmN1cnJlbnRVcmxUcmVlO1xuXG4gICAgdGhpcy5jb25maWdMb2FkZXIgPSBuZXcgUm91dGVyQ29uZmlnTG9hZGVyKGxvYWRlciwgY29tcGlsZXIsIG9uTG9hZFN0YXJ0LCBvbkxvYWRFbmQpO1xuICAgIHRoaXMucm91dGVyU3RhdGUgPSBjcmVhdGVFbXB0eVN0YXRlKHRoaXMuY3VycmVudFVybFRyZWUsIHRoaXMucm9vdENvbXBvbmVudFR5cGUpO1xuXG4gICAgdGhpcy50cmFuc2l0aW9ucyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8TmF2aWdhdGlvblRyYW5zaXRpb24+KHtcbiAgICAgIGlkOiAwLFxuICAgICAgY3VycmVudFVybFRyZWU6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBjdXJyZW50UmF3VXJsOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgZXh0cmFjdGVkVXJsOiB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuZXh0cmFjdCh0aGlzLmN1cnJlbnRVcmxUcmVlKSxcbiAgICAgIHVybEFmdGVyUmVkaXJlY3RzOiB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuZXh0cmFjdCh0aGlzLmN1cnJlbnRVcmxUcmVlKSxcbiAgICAgIHJhd1VybDogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIGV4dHJhczoge30sXG4gICAgICByZXNvbHZlOiBudWxsLFxuICAgICAgcmVqZWN0OiBudWxsLFxuICAgICAgcHJvbWlzZTogUHJvbWlzZS5yZXNvbHZlKHRydWUpLFxuICAgICAgc291cmNlOiAnaW1wZXJhdGl2ZScsXG4gICAgICBzdGF0ZTogbnVsbCxcbiAgICAgIGN1cnJlbnRTbmFwc2hvdDogdGhpcy5yb3V0ZXJTdGF0ZS5zbmFwc2hvdCxcbiAgICAgIHRhcmdldFNuYXBzaG90OiBudWxsLFxuICAgICAgY3VycmVudFJvdXRlclN0YXRlOiB0aGlzLnJvdXRlclN0YXRlLFxuICAgICAgdGFyZ2V0Um91dGVyU3RhdGU6IG51bGwsXG4gICAgICBndWFyZHNSZXN1bHQ6IG51bGwsXG4gICAgICBwcmVBY3RpdmF0aW9uOiBudWxsXG4gICAgfSk7XG4gICAgdGhpcy5uYXZpZ2F0aW9ucyA9IHRoaXMuc2V0dXBOYXZpZ2F0aW9ucyh0aGlzLnRyYW5zaXRpb25zKTtcblxuICAgIHRoaXMucHJvY2Vzc05hdmlnYXRpb25zKCk7XG4gIH1cblxuICBwcml2YXRlIHNldHVwTmF2aWdhdGlvbnModHJhbnNpdGlvbnM6IE9ic2VydmFibGU8TmF2aWdhdGlvblRyYW5zaXRpb24+KTpcbiAgICAgIE9ic2VydmFibGU8TmF2aWdhdGlvblRyYW5zaXRpb24+IHtcbiAgICBjb25zdCBldmVudHNTdWJqZWN0ID0gKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KTtcbiAgICByZXR1cm4gdHJhbnNpdGlvbnMucGlwZShcbiAgICAgICAgZmlsdGVyKHQgPT4gdC5pZCAhPT0gMCksXG5cbiAgICAgICAgLy8gRXh0cmFjdCBVUkxcbiAgICAgICAgbWFwKHQgPT4gKHtcbiAgICAgICAgICAgICAgLi4udCwgZXh0cmFjdGVkVXJsOiB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuZXh0cmFjdCh0LnJhd1VybClcbiAgICAgICAgICAgIH0gYXMgTmF2aWdhdGlvblRyYW5zaXRpb24pKSxcblxuICAgICAgICAvLyBVc2luZyBzd2l0Y2hNYXAgc28gd2UgY2FuY2VsIGV4ZWN1dGluZyBuYXZpZ2F0aW9ucyB3aGVuIGEgbmV3IG9uZSBjb21lcyBpblxuICAgICAgICBzd2l0Y2hNYXAodCA9PiB7XG4gICAgICAgICAgbGV0IGNvbXBsZXRlZCA9IGZhbHNlO1xuICAgICAgICAgIGxldCBlcnJvcmVkID0gZmFsc2U7XG4gICAgICAgICAgcmV0dXJuIG9mICh0KS5waXBlKFxuICAgICAgICAgICAgICBzd2l0Y2hNYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdXJsVHJhbnNpdGlvbiA9XG4gICAgICAgICAgICAgICAgICAgICF0aGlzLm5hdmlnYXRlZCB8fCB0LmV4dHJhY3RlZFVybC50b1N0cmluZygpICE9PSB0aGlzLmN1cnJlbnRVcmxUcmVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc0N1cnJlbnRVcmwgPVxuICAgICAgICAgICAgICAgICAgICAodGhpcy5vblNhbWVVcmxOYXZpZ2F0aW9uID09PSAncmVsb2FkJyA/IHRydWUgOiB1cmxUcmFuc2l0aW9uKSAmJlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybCh0LnJhd1VybCk7XG5cbiAgICAgICAgICAgICAgICBpZiAocHJvY2Vzc0N1cnJlbnRVcmwpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBvZiAodCkucGlwZShcbiAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGlmIGluIGBlYWdlcmAgdXBkYXRlIG1vZGVcbiAgICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZWFnZXInICYmICF0LmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QnJvd3NlclVybCh0LnJhd1VybCwgISF0LmV4dHJhcy5yZXBsYWNlVXJsLCB0LmlkKSksXG4gICAgICAgICAgICAgICAgICAgICAgLy8gRmlyZSBOYXZpZ2F0aW9uU3RhcnQgZXZlbnRcbiAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2hNYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gdGhpcy50cmFuc2l0aW9ucy5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRzU3ViamVjdC5uZXh0KG5ldyBOYXZpZ2F0aW9uU3RhcnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCB0LnNvdXJjZSwgdC5zdGF0ZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRyYW5zaXRpb24gIT09IHRoaXMudHJhbnNpdGlvbnMuZ2V0VmFsdWUoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3RdO1xuICAgICAgICAgICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBkZWxheSBpcyByZXF1aXJlZCB0byBtYXRjaCBvbGQgYmVoYXZpb3IgdGhhdCBmb3JjZWQgbmF2aWdhdGlvbiB0b1xuICAgICAgICAgICAgICAgICAgICAgIC8vIGFsd2F5cyBiZSBhc3luY1xuICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaE1hcCh0ID0+IFByb21pc2UucmVzb2x2ZSh0KSksXG5cbiAgICAgICAgICAgICAgICAgICAgICAvLyBBcHBseVJlZGlyZWN0c1xuICAgICAgICAgICAgICAgICAgICAgIGFwcGx5UmVkaXJlY3RzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5nTW9kdWxlLmluamVjdG9yLCB0aGlzLmNvbmZpZ0xvYWRlciwgdGhpcy51cmxTZXJpYWxpemVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZyksXG4gICAgICAgICAgICAgICAgICAgICAgLy8gUmVjb2duaXplXG4gICAgICAgICAgICAgICAgICAgICAgcmVjb2duaXplKFxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb3RDb21wb25lbnRUeXBlLCB0aGlzLmNvbmZpZywgKHVybCkgPT4gdGhpcy5zZXJpYWxpemVVcmwodXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5KSxcblxuICAgICAgICAgICAgICAgICAgICAgIC8vIEZpcmUgUm91dGVzUmVjb2duaXplZFxuICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvdXRlc1JlY29nbml6ZWQgPSBuZXcgUm91dGVzUmVjb2duaXplZChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXJpYWxpemVVcmwodC51cmxBZnRlclJlZGlyZWN0cyksIHQudGFyZ2V0U25hcHNob3QgISk7XG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQocm91dGVzUmVjb2duaXplZCk7XG4gICAgICAgICAgICAgICAgICAgICAgfSksICk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NQcmV2aW91c1VybCA9IHVybFRyYW5zaXRpb24gJiYgdGhpcy5yYXdVcmxUcmVlICYmXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5LnNob3VsZFByb2Nlc3NVcmwodGhpcy5yYXdVcmxUcmVlKTtcbiAgICAgICAgICAgICAgICAgIC8qIFdoZW4gdGhlIGN1cnJlbnQgVVJMIHNob3VsZG4ndCBiZSBwcm9jZXNzZWQsIGJ1dCB0aGUgcHJldmlvdXMgb25lIHdhcywgd2VcbiAgICAgICAgICAgICAgICAgICAqIGhhbmRsZSB0aGlzIFwiZXJyb3IgY29uZGl0aW9uXCIgYnkgbmF2aWdhdGluZyB0byB0aGUgcHJldmlvdXNseSBzdWNjZXNzZnVsIFVSTCxcbiAgICAgICAgICAgICAgICAgICAqIGJ1dCBsZWF2aW5nIHRoZSBVUkwgaW50YWN0LiovXG4gICAgICAgICAgICAgICAgICBpZiAocHJvY2Vzc1ByZXZpb3VzVXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHtpZCwgZXh0cmFjdGVkVXJsLCBzb3VyY2UsIHN0YXRlLCBleHRyYXN9ID0gdDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmF2U3RhcnQgPVxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5hdmlnYXRpb25TdGFydChpZCwgdGhpcy5zZXJpYWxpemVVcmwoZXh0cmFjdGVkVXJsKSwgc291cmNlLCBzdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuYXZTdGFydCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFNuYXBzaG90ID1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZUVtcHR5U3RhdGUoZXh0cmFjdGVkVXJsLCB0aGlzLnJvb3RDb21wb25lbnRUeXBlKS5zbmFwc2hvdDtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2YgKHtcbiAgICAgICAgICAgICAgICAgICAgICAuLi50LFxuICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFNuYXBzaG90LFxuICAgICAgICAgICAgICAgICAgICAgIHVybEFmdGVyUmVkaXJlY3RzOiBleHRyYWN0ZWRVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgZXh0cmFzOiB7Li4uZXh0cmFzLCBza2lwTG9jYXRpb25DaGFuZ2U6IGZhbHNlLCByZXBsYWNlVXJsOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLyogV2hlbiBuZWl0aGVyIHRoZSBjdXJyZW50IG9yIHByZXZpb3VzIFVSTCBjYW4gYmUgcHJvY2Vzc2VkLCBkbyBub3RoaW5nIG90aGVyXG4gICAgICAgICAgICAgICAgICAgICAqIHRoYW4gdXBkYXRlIHJvdXRlcidzIGludGVybmFsIHJlZmVyZW5jZSB0byB0aGUgY3VycmVudCBcInNldHRsZWRcIiBVUkwuIFRoaXNcbiAgICAgICAgICAgICAgICAgICAgICogd2F5IHRoZSBuZXh0IG5hdmlnYXRpb24gd2lsbCBiZSBjb21pbmcgZnJvbSB0aGUgY3VycmVudCBVUkwgaW4gdGhlIGJyb3dzZXIuXG4gICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJhd1VybFRyZWUgPSB0LnJhd1VybDtcbiAgICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAvLyBCZWZvcmUgUHJlYWN0aXZhdGlvblxuICAgICAgICAgICAgICBzd2l0Y2hUYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgICAgICAgdGFyZ2V0U25hcHNob3QsXG4gICAgICAgICAgICAgICAgICBpZDogbmF2aWdhdGlvbklkLFxuICAgICAgICAgICAgICAgICAgZXh0cmFjdGVkVXJsOiBhcHBsaWVkVXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgIHJhd1VybDogcmF3VXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgIGV4dHJhczoge3NraXBMb2NhdGlvbkNoYW5nZSwgcmVwbGFjZVVybH1cbiAgICAgICAgICAgICAgICB9ID0gdDtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5ob29rcy5iZWZvcmVQcmVhY3RpdmF0aW9uKHRhcmdldFNuYXBzaG90ICEsIHtcbiAgICAgICAgICAgICAgICAgIG5hdmlnYXRpb25JZCxcbiAgICAgICAgICAgICAgICAgIGFwcGxpZWRVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgcmF3VXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgIHNraXBMb2NhdGlvbkNoYW5nZTogISFza2lwTG9jYXRpb25DaGFuZ2UsXG4gICAgICAgICAgICAgICAgICByZXBsYWNlVXJsOiAhIXJlcGxhY2VVcmwsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgIC8vIC0tLSBHVUFSRFMgLS0tXG4gICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBndWFyZHNTdGFydCA9IG5ldyBHdWFyZHNDaGVja1N0YXJ0KFxuICAgICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLFxuICAgICAgICAgICAgICAgICAgICB0LnRhcmdldFNuYXBzaG90ICEpO1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckV2ZW50KGd1YXJkc1N0YXJ0KTtcbiAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgIG1hcCh0ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcmVBY3RpdmF0aW9uID0gbmV3IFByZUFjdGl2YXRpb24oXG4gICAgICAgICAgICAgICAgICAgIHQudGFyZ2V0U25hcHNob3QgISwgdC5jdXJyZW50U25hcHNob3QsIHRoaXMubmdNb2R1bGUuaW5qZWN0b3IsXG4gICAgICAgICAgICAgICAgICAgIChldnQ6IEV2ZW50KSA9PiB0aGlzLnRyaWdnZXJFdmVudChldnQpKTtcbiAgICAgICAgICAgICAgICBwcmVBY3RpdmF0aW9uLmluaXRpYWxpemUodGhpcy5yb290Q29udGV4dHMpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7Li4udCwgcHJlQWN0aXZhdGlvbn07XG4gICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgIGNoZWNrR3VhcmRzKCksXG5cbiAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGd1YXJkc0VuZCA9IG5ldyBHdWFyZHNDaGVja0VuZChcbiAgICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCB0aGlzLnNlcmlhbGl6ZVVybCh0LnVybEFmdGVyUmVkaXJlY3RzKSxcbiAgICAgICAgICAgICAgICAgICAgdC50YXJnZXRTbmFwc2hvdCAhLCAhIXQuZ3VhcmRzUmVzdWx0KTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJFdmVudChndWFyZHNFbmQpO1xuICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICBmaWx0ZXIodCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF0Lmd1YXJkc1Jlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgdGhpcy5yZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdkNhbmNlbCA9XG4gICAgICAgICAgICAgICAgICAgICAgbmV3IE5hdmlnYXRpb25DYW5jZWwodC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLCAnJyk7XG4gICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2Q2FuY2VsKTtcbiAgICAgICAgICAgICAgICAgIHQucmVzb2x2ZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAvLyAtLS0gUkVTT0xWRSAtLS1cbiAgICAgICAgICAgICAgc3dpdGNoVGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0LnByZUFjdGl2YXRpb24gIS5pc0FjdGl2YXRpbmcoKSkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mICh0KS5waXBlKFxuICAgICAgICAgICAgICAgICAgICAgIHRhcCh0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVTdGFydCA9IG5ldyBSZXNvbHZlU3RhcnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ICEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQocmVzb2x2ZVN0YXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlRGF0YSh0aGlzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kpLCAgLy9cbiAgICAgICAgICAgICAgICAgICAgICB0YXAodCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlRW5kID0gbmV3IFJlc29sdmVFbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdC5pZCwgdGhpcy5zZXJpYWxpemVVcmwodC5leHRyYWN0ZWRVcmwpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VyaWFsaXplVXJsKHQudXJsQWZ0ZXJSZWRpcmVjdHMpLCB0LnRhcmdldFNuYXBzaG90ICEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyRXZlbnQocmVzb2x2ZUVuZCk7XG4gICAgICAgICAgICAgICAgICAgICAgfSksICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICAgIC8vIC0tLSBBRlRFUiBQUkVBQ1RJVkFUSU9OIC0tLVxuICAgICAgICAgICAgICBzd2l0Y2hUYXAodCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgICAgICAgdGFyZ2V0U25hcHNob3QsXG4gICAgICAgICAgICAgICAgICBpZDogbmF2aWdhdGlvbklkLFxuICAgICAgICAgICAgICAgICAgZXh0cmFjdGVkVXJsOiBhcHBsaWVkVXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgIHJhd1VybDogcmF3VXJsVHJlZSxcbiAgICAgICAgICAgICAgICAgIGV4dHJhczoge3NraXBMb2NhdGlvbkNoYW5nZSwgcmVwbGFjZVVybH1cbiAgICAgICAgICAgICAgICB9ID0gdDtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5ob29rcy5hZnRlclByZWFjdGl2YXRpb24odGFyZ2V0U25hcHNob3QgISwge1xuICAgICAgICAgICAgICAgICAgbmF2aWdhdGlvbklkLFxuICAgICAgICAgICAgICAgICAgYXBwbGllZFVybFRyZWUsXG4gICAgICAgICAgICAgICAgICByYXdVcmxUcmVlLFxuICAgICAgICAgICAgICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiAhIXNraXBMb2NhdGlvbkNoYW5nZSxcbiAgICAgICAgICAgICAgICAgIHJlcGxhY2VVcmw6ICEhcmVwbGFjZVVybCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgICAgbWFwKHQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFJvdXRlclN0YXRlID0gY3JlYXRlUm91dGVyU3RhdGUoXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LCB0LnRhcmdldFNuYXBzaG90ICEsIHQuY3VycmVudFJvdXRlclN0YXRlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHsuLi50LCB0YXJnZXRSb3V0ZXJTdGF0ZX0pO1xuICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICAvKiBPbmNlIGhlcmUsIHdlIGFyZSBhYm91dCB0byBhY3RpdmF0ZSBzeW5jcm9ub3VzbHkuIFRoZSBhc3N1bXB0aW9uIGlzIHRoaXMgd2lsbFxuICAgICAgICAgICAgICAgICBzdWNjZWVkLCBhbmQgdXNlciBjb2RlIG1heSByZWFkIGZyb20gdGhlIFJvdXRlciBzZXJ2aWNlLiBUaGVyZWZvcmUgYmVmb3JlXG4gICAgICAgICAgICAgICAgIGFjdGl2YXRpb24sIHdlIG5lZWQgdG8gdXBkYXRlIHJvdXRlciBwcm9wZXJ0aWVzIHN0b3JpbmcgdGhlIGN1cnJlbnQgVVJMIGFuZCB0aGVcbiAgICAgICAgICAgICAgICAgUm91dGVyU3RhdGUsIGFzIHdlbGwgYXMgdXBkYXRlZCB0aGUgYnJvd3NlciBVUkwuIEFsbCB0aGlzIHNob3VsZCBoYXBwZW4gKmJlZm9yZSpcbiAgICAgICAgICAgICAgICAgYWN0aXZhdGluZy4gKi9cbiAgICAgICAgICAgICAgdGFwKHQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSB0LnVybEFmdGVyUmVkaXJlY3RzO1xuICAgICAgICAgICAgICAgIHRoaXMucmF3VXJsVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB0LnJhd1VybCk7XG5cbiAgICAgICAgICAgICAgICAodGhpcyBhc3tyb3V0ZXJTdGF0ZTogUm91dGVyU3RhdGV9KS5yb3V0ZXJTdGF0ZSA9IHQudGFyZ2V0Um91dGVyU3RhdGUgITtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZGVmZXJyZWQnICYmICF0LmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QnJvd3NlclVybCh0aGlzLnJhd1VybFRyZWUsICEhdC5leHRyYXMucmVwbGFjZVVybCwgdC5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgICBhY3RpdmF0ZVJvdXRlcyhcbiAgICAgICAgICAgICAgICAgIHRoaXMucm9vdENvbnRleHRzLCB0aGlzLnJvdXRlUmV1c2VTdHJhdGVneSxcbiAgICAgICAgICAgICAgICAgIChldnQ6IEV2ZW50KSA9PiB0aGlzLnRyaWdnZXJFdmVudChldnQpKSxcblxuICAgICAgICAgICAgICB0YXAoe25leHQoKSB7IGNvbXBsZXRlZCA9IHRydWU7IH0sIGNvbXBsZXRlKCkgeyBjb21wbGV0ZWQgPSB0cnVlOyB9fSksXG4gICAgICAgICAgICAgIGZpbmFsaXplKCgpID0+IHtcbiAgICAgICAgICAgICAgICAvKiBXaGVuIHRoZSBuYXZpZ2F0aW9uIHN0cmVhbSBmaW5pc2hlcyBlaXRoZXIgdGhyb3VnaCBlcnJvciBvciBzdWNjZXNzLCB3ZSBzZXQgdGhlXG4gICAgICAgICAgICAgICAgICogYGNvbXBsZXRlZGAgb3IgYGVycm9yZWRgIGZsYWcuIEhvd2V2ZXIsIHRoZXJlIGFyZSBzb21lIHNpdHVhdGlvbnMgd2hlcmUgd2UgY291bGRcbiAgICAgICAgICAgICAgICAgKiBnZXQgaGVyZSB3aXRob3V0IGVpdGhlciBvZiB0aG9zZSBiZWluZyBzZXQuIEZvciBpbnN0YW5jZSwgYSByZWRpcmVjdCBkdXJpbmdcbiAgICAgICAgICAgICAgICAgKiBOYXZpZ2F0aW9uU3RhcnQuIFRoZXJlZm9yZSwgdGhpcyBpcyBhIGNhdGNoLWFsbCB0byBtYWtlIHN1cmUgdGhlIE5hdmlnYXRpb25DYW5jZWxcbiAgICAgICAgICAgICAgICAgKiBldmVudCBpcyBmaXJlZCB3aGVuIGEgbmF2aWdhdGlvbiBnZXRzIGNhbmNlbGxlZCBidXQgbm90IGNhdWdodCBieSBvdGhlciBtZWFucy4gKi9cbiAgICAgICAgICAgICAgICBpZiAoIWNvbXBsZXRlZCAmJiAhZXJyb3JlZCkge1xuICAgICAgICAgICAgICAgICAgLy8gTXVzdCByZXNldCB0byBjdXJyZW50IFVSTCB0cmVlIGhlcmUgdG8gZW5zdXJlIGhpc3Rvcnkuc3RhdGUgaXMgc2V0LiBPbiBhIGZyZXNoXG4gICAgICAgICAgICAgICAgICAvLyBwYWdlIGxvYWQsIGlmIGEgbmV3IG5hdmlnYXRpb24gY29tZXMgaW4gYmVmb3JlIGEgc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uXG4gICAgICAgICAgICAgICAgICAvLyBjb21wbGV0ZXMsIHRoZXJlIHdpbGwgYmUgbm90aGluZyBpbiBoaXN0b3J5LnN0YXRlLm5hdmlnYXRpb25JZC4gVGhpcyBjYW4gY2F1c2VcbiAgICAgICAgICAgICAgICAgIC8vIHN5bmMgcHJvYmxlbXMgd2l0aCBBbmd1bGFySlMgc3luYyBjb2RlIHdoaWNoIGxvb2tzIGZvciBhIHZhbHVlIGhlcmUgaW4gb3JkZXJcbiAgICAgICAgICAgICAgICAgIC8vIHRvIGRldGVybWluZSB3aGV0aGVyIG9yIG5vdCB0byBoYW5kbGUgYSBnaXZlbiBwb3BzdGF0ZSBldmVudCBvciB0byBsZWF2ZSBpdFxuICAgICAgICAgICAgICAgICAgLy8gdG8gdGhlIEFuZ3VhbHIgcm91dGVyLlxuICAgICAgICAgICAgICAgICAgdGhpcy5yZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG5hdkNhbmNlbCA9IG5ldyBOYXZpZ2F0aW9uQ2FuY2VsKFxuICAgICAgICAgICAgICAgICAgICAgIHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSxcbiAgICAgICAgICAgICAgICAgICAgICBgTmF2aWdhdGlvbiBJRCAke3QuaWR9IGlzIG5vdCBlcXVhbCB0byB0aGUgY3VycmVudCBuYXZpZ2F0aW9uIGlkICR7dGhpcy5uYXZpZ2F0aW9uSWR9YCk7XG4gICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2Q2FuY2VsKTtcbiAgICAgICAgICAgICAgICAgIHQucmVzb2x2ZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgY2F0Y2hFcnJvcigoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGVycm9yZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIC8qIFRoaXMgZXJyb3IgdHlwZSBpcyBpc3N1ZWQgZHVyaW5nIFJlZGlyZWN0LCBhbmQgaXMgaGFuZGxlZCBhcyBhIGNhbmNlbGxhdGlvblxuICAgICAgICAgICAgICAgICAqIHJhdGhlciB0aGFuIGFuIGVycm9yLiAqL1xuICAgICAgICAgICAgICAgIGlmIChpc05hdmlnYXRpb25DYW5jZWxpbmdFcnJvcihlKSkge1xuICAgICAgICAgICAgICAgICAgdGhpcy5uYXZpZ2F0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgdGhpcy5yZXNldFN0YXRlQW5kVXJsKHQuY3VycmVudFJvdXRlclN0YXRlLCB0LmN1cnJlbnRVcmxUcmVlLCB0LnJhd1VybCk7XG4gICAgICAgICAgICAgICAgICBjb25zdCBuYXZDYW5jZWwgPVxuICAgICAgICAgICAgICAgICAgICAgIG5ldyBOYXZpZ2F0aW9uQ2FuY2VsKHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgIGV2ZW50c1N1YmplY3QubmV4dChuYXZDYW5jZWwpO1xuICAgICAgICAgICAgICAgICAgLyogQWxsIG90aGVyIGVycm9ycyBzaG91bGQgcmVzZXQgdG8gdGhlIHJvdXRlcidzIGludGVybmFsIFVSTCByZWZlcmVuY2UgdG8gdGhlXG4gICAgICAgICAgICAgICAgICAgKiBwcmUtZXJyb3Igc3RhdGUuICovXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMucmVzZXRTdGF0ZUFuZFVybCh0LmN1cnJlbnRSb3V0ZXJTdGF0ZSwgdC5jdXJyZW50VXJsVHJlZSwgdC5yYXdVcmwpO1xuICAgICAgICAgICAgICAgICAgY29uc3QgbmF2RXJyb3IgPSBuZXcgTmF2aWdhdGlvbkVycm9yKHQuaWQsIHRoaXMuc2VyaWFsaXplVXJsKHQuZXh0cmFjdGVkVXJsKSwgZSk7XG4gICAgICAgICAgICAgICAgICBldmVudHNTdWJqZWN0Lm5leHQobmF2RXJyb3IpO1xuICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgdC5yZXNvbHZlKHRoaXMuZXJyb3JIYW5kbGVyKGUpKTtcbiAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHQucmVqZWN0KGVlKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgICAgICAgICB9KSwgKTtcbiAgICAgICAgICAvLyBUT0RPKGphc29uYWRlbik6IHJlbW92ZSBjYXN0IG9uY2UgZzMgaXMgb24gdXBkYXRlZCBUeXBlU2NyaXB0XG4gICAgICAgIH0pKSBhcyBhbnkgYXMgT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj47XG4gIH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIFRPRE86IHRoaXMgc2hvdWxkIGJlIHJlbW92ZWQgb25jZSB0aGUgY29uc3RydWN0b3Igb2YgdGhlIHJvdXRlciBtYWRlIGludGVybmFsXG4gICAqL1xuICByZXNldFJvb3RDb21wb25lbnRUeXBlKHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT4pOiB2b2lkIHtcbiAgICB0aGlzLnJvb3RDb21wb25lbnRUeXBlID0gcm9vdENvbXBvbmVudFR5cGU7XG4gICAgLy8gVE9ETzogdnNhdmtpbiByb3V0ZXIgNC4wIHNob3VsZCBtYWtlIHRoZSByb290IGNvbXBvbmVudCBzZXQgdG8gbnVsbFxuICAgIC8vIHRoaXMgd2lsbCBzaW1wbGlmeSB0aGUgbGlmZWN5Y2xlIG9mIHRoZSByb3V0ZXIuXG4gICAgdGhpcy5yb3V0ZXJTdGF0ZS5yb290LmNvbXBvbmVudCA9IHRoaXMucm9vdENvbXBvbmVudFR5cGU7XG4gIH1cblxuICBwcml2YXRlIGdldFRyYW5zaXRpb24oKTogTmF2aWdhdGlvblRyYW5zaXRpb24geyByZXR1cm4gdGhpcy50cmFuc2l0aW9ucy52YWx1ZTsgfVxuXG4gIHByaXZhdGUgc2V0VHJhbnNpdGlvbih0OiBQYXJ0aWFsPE5hdmlnYXRpb25UcmFuc2l0aW9uPik6IHZvaWQge1xuICAgIHRoaXMudHJhbnNpdGlvbnMubmV4dCh7Li4udGhpcy5nZXRUcmFuc2l0aW9uKCksIC4uLnR9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHVwIHRoZSBsb2NhdGlvbiBjaGFuZ2UgbGlzdGVuZXIgYW5kIHBlcmZvcm1zIHRoZSBpbml0aWFsIG5hdmlnYXRpb24uXG4gICAqL1xuICBpbml0aWFsTmF2aWdhdGlvbigpOiB2b2lkIHtcbiAgICB0aGlzLnNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpO1xuICAgIGlmICh0aGlzLm5hdmlnYXRpb25JZCA9PT0gMCkge1xuICAgICAgdGhpcy5uYXZpZ2F0ZUJ5VXJsKHRoaXMubG9jYXRpb24ucGF0aCh0cnVlKSwge3JlcGxhY2VVcmw6IHRydWV9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB1cCB0aGUgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyLlxuICAgKi9cbiAgc2V0VXBMb2NhdGlvbkNoYW5nZUxpc3RlbmVyKCk6IHZvaWQge1xuICAgIC8vIERvbid0IG5lZWQgdG8gdXNlIFpvbmUud3JhcCBhbnkgbW9yZSwgYmVjYXVzZSB6b25lLmpzXG4gICAgLy8gYWxyZWFkeSBwYXRjaCBvblBvcFN0YXRlLCBzbyBsb2NhdGlvbiBjaGFuZ2UgY2FsbGJhY2sgd2lsbFxuICAgIC8vIHJ1biBpbnRvIG5nWm9uZVxuICAgIGlmICghdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbiA9IDxhbnk+dGhpcy5sb2NhdGlvbi5zdWJzY3JpYmUoKGNoYW5nZTogYW55KSA9PiB7XG4gICAgICAgIGxldCByYXdVcmxUcmVlID0gdGhpcy5wYXJzZVVybChjaGFuZ2VbJ3VybCddKTtcbiAgICAgICAgY29uc3Qgc291cmNlOiBOYXZpZ2F0aW9uVHJpZ2dlciA9IGNoYW5nZVsndHlwZSddID09PSAncG9wc3RhdGUnID8gJ3BvcHN0YXRlJyA6ICdoYXNoY2hhbmdlJztcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBjaGFuZ2Uuc3RhdGUgJiYgY2hhbmdlLnN0YXRlLm5hdmlnYXRpb25JZCA/XG4gICAgICAgICAgICB7bmF2aWdhdGlvbklkOiBjaGFuZ2Uuc3RhdGUubmF2aWdhdGlvbklkfSA6XG4gICAgICAgICAgICBudWxsO1xuICAgICAgICBzZXRUaW1lb3V0KFxuICAgICAgICAgICAgKCkgPT4geyB0aGlzLnNjaGVkdWxlTmF2aWdhdGlvbihyYXdVcmxUcmVlLCBzb3VyY2UsIHN0YXRlLCB7cmVwbGFjZVVybDogdHJ1ZX0pOyB9LCAwKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBUaGUgY3VycmVudCB1cmwgKi9cbiAgZ2V0IHVybCgpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5zZXJpYWxpemVVcmwodGhpcy5jdXJyZW50VXJsVHJlZSk7IH1cblxuICAvKiogQGludGVybmFsICovXG4gIHRyaWdnZXJFdmVudChldmVudDogRXZlbnQpOiB2b2lkIHsgKHRoaXMuZXZlbnRzIGFzIFN1YmplY3Q8RXZlbnQ+KS5uZXh0KGV2ZW50KTsgfVxuXG4gIC8qKlxuICAgKiBSZXNldHMgdGhlIGNvbmZpZ3VyYXRpb24gdXNlZCBmb3IgbmF2aWdhdGlvbiBhbmQgZ2VuZXJhdGluZyBsaW5rcy5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogIyMjIEV4YW1wbGVcbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5yZXNldENvbmZpZyhbXG4gICAqICB7IHBhdGg6ICd0ZWFtLzppZCcsIGNvbXBvbmVudDogVGVhbUNtcCwgY2hpbGRyZW46IFtcbiAgICogICAgeyBwYXRoOiAnc2ltcGxlJywgY29tcG9uZW50OiBTaW1wbGVDbXAgfSxcbiAgICogICAgeyBwYXRoOiAndXNlci86bmFtZScsIGNvbXBvbmVudDogVXNlckNtcCB9XG4gICAqICBdfVxuICAgKiBdKTtcbiAgICogYGBgXG4gICAqL1xuICByZXNldENvbmZpZyhjb25maWc6IFJvdXRlcyk6IHZvaWQge1xuICAgIHZhbGlkYXRlQ29uZmlnKGNvbmZpZyk7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWcubWFwKHN0YW5kYXJkaXplQ29uZmlnKTtcbiAgICB0aGlzLm5hdmlnYXRlZCA9IGZhbHNlO1xuICAgIHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCA9IC0xO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7IHRoaXMuZGlzcG9zZSgpOyB9XG5cbiAgLyoqIERpc3Bvc2VzIG9mIHRoZSByb3V0ZXIgKi9cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgdGhpcy5sb2NhdGlvblN1YnNjcmlwdGlvbiA9IG51bGwgITtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQXBwbGllcyBhbiBhcnJheSBvZiBjb21tYW5kcyB0byB0aGUgY3VycmVudCB1cmwgdHJlZSBhbmQgY3JlYXRlcyBhIG5ldyB1cmwgdHJlZS5cbiAgICpcbiAgICogV2hlbiBnaXZlbiBhbiBhY3RpdmF0ZSByb3V0ZSwgYXBwbGllcyB0aGUgZ2l2ZW4gY29tbWFuZHMgc3RhcnRpbmcgZnJvbSB0aGUgcm91dGUuXG4gICAqIFdoZW4gbm90IGdpdmVuIGEgcm91dGUsIGFwcGxpZXMgdGhlIGdpdmVuIGNvbW1hbmQgc3RhcnRpbmcgZnJvbSB0aGUgcm9vdC5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogIyMjIEV4YW1wbGVcbiAgICpcbiAgICogYGBgXG4gICAqIC8vIGNyZWF0ZSAvdGVhbS8zMy91c2VyLzExXG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0nLCAzMywgJ3VzZXInLCAxMV0pO1xuICAgKlxuICAgKiAvLyBjcmVhdGUgL3RlYW0vMzM7ZXhwYW5kPXRydWUvdXNlci8xMVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtleHBhbmQ6IHRydWV9LCAndXNlcicsIDExXSk7XG4gICAqXG4gICAqIC8vIHlvdSBjYW4gY29sbGFwc2Ugc3RhdGljIHNlZ21lbnRzIGxpa2UgdGhpcyAodGhpcyB3b3JrcyBvbmx5IHdpdGggdGhlIGZpcnN0IHBhc3NlZC1pbiB2YWx1ZSk6XG4gICAqIHJvdXRlci5jcmVhdGVVcmxUcmVlKFsnL3RlYW0vMzMvdXNlcicsIHVzZXJJZF0pO1xuICAgKlxuICAgKiAvLyBJZiB0aGUgZmlyc3Qgc2VnbWVudCBjYW4gY29udGFpbiBzbGFzaGVzLCBhbmQgeW91IGRvIG5vdCB3YW50IHRoZSByb3V0ZXIgdG8gc3BsaXQgaXQsIHlvdVxuICAgKiAvLyBjYW4gZG8gdGhlIGZvbGxvd2luZzpcbiAgICpcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoW3tzZWdtZW50UGF0aDogJy9vbmUvdHdvJ31dKTtcbiAgICpcbiAgICogLy8gY3JlYXRlIC90ZWFtLzMzLyh1c2VyLzExLy9yaWdodDpjaGF0KVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDogJ2NoYXQnfX1dKTtcbiAgICpcbiAgICogLy8gcmVtb3ZlIHRoZSByaWdodCBzZWNvbmRhcnkgbm9kZVxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDogbnVsbH19XSk7XG4gICAqXG4gICAqIC8vIGFzc3VtaW5nIHRoZSBjdXJyZW50IHVybCBpcyBgL3RlYW0vMzMvdXNlci8xMWAgYW5kIHRoZSByb3V0ZSBwb2ludHMgdG8gYHVzZXIvMTFgXG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzMzL3VzZXIvMTEvZGV0YWlsc1xuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJ2RldGFpbHMnXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzMzL3VzZXIvMjJcbiAgICogcm91dGVyLmNyZWF0ZVVybFRyZWUoWycuLi8yMiddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICpcbiAgICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vNDQvdXNlci8yMlxuICAgKiByb3V0ZXIuY3JlYXRlVXJsVHJlZShbJy4uLy4uL3RlYW0vNDQvdXNlci8yMiddLCB7cmVsYXRpdmVUbzogcm91dGV9KTtcbiAgICogYGBgXG4gICAqL1xuICBjcmVhdGVVcmxUcmVlKGNvbW1hbmRzOiBhbnlbXSwgbmF2aWdhdGlvbkV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyA9IHt9KTogVXJsVHJlZSB7XG4gICAgY29uc3Qge3JlbGF0aXZlVG8sICAgICAgICAgIHF1ZXJ5UGFyYW1zLCAgICAgICAgIGZyYWdtZW50LFxuICAgICAgICAgICBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zLCBxdWVyeVBhcmFtc0hhbmRsaW5nLCBwcmVzZXJ2ZUZyYWdtZW50fSA9IG5hdmlnYXRpb25FeHRyYXM7XG4gICAgaWYgKGlzRGV2TW9kZSgpICYmIHByZXNlcnZlUXVlcnlQYXJhbXMgJiYgPGFueT5jb25zb2xlICYmIDxhbnk+Y29uc29sZS53YXJuKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ3ByZXNlcnZlUXVlcnlQYXJhbXMgaXMgZGVwcmVjYXRlZCwgdXNlIHF1ZXJ5UGFyYW1zSGFuZGxpbmcgaW5zdGVhZC4nKTtcbiAgICB9XG4gICAgY29uc3QgYSA9IHJlbGF0aXZlVG8gfHwgdGhpcy5yb3V0ZXJTdGF0ZS5yb290O1xuICAgIGNvbnN0IGYgPSBwcmVzZXJ2ZUZyYWdtZW50ID8gdGhpcy5jdXJyZW50VXJsVHJlZS5mcmFnbWVudCA6IGZyYWdtZW50O1xuICAgIGxldCBxOiBQYXJhbXN8bnVsbCA9IG51bGw7XG4gICAgaWYgKHF1ZXJ5UGFyYW1zSGFuZGxpbmcpIHtcbiAgICAgIHN3aXRjaCAocXVlcnlQYXJhbXNIYW5kbGluZykge1xuICAgICAgICBjYXNlICdtZXJnZSc6XG4gICAgICAgICAgcSA9IHsuLi50aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zLCAuLi5xdWVyeVBhcmFtc307XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3ByZXNlcnZlJzpcbiAgICAgICAgICBxID0gdGhpcy5jdXJyZW50VXJsVHJlZS5xdWVyeVBhcmFtcztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBxID0gcXVlcnlQYXJhbXMgfHwgbnVsbDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcSA9IHByZXNlcnZlUXVlcnlQYXJhbXMgPyB0aGlzLmN1cnJlbnRVcmxUcmVlLnF1ZXJ5UGFyYW1zIDogcXVlcnlQYXJhbXMgfHwgbnVsbDtcbiAgICB9XG4gICAgaWYgKHEgIT09IG51bGwpIHtcbiAgICAgIHEgPSB0aGlzLnJlbW92ZUVtcHR5UHJvcHMocSk7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVVcmxUcmVlKGEsIHRoaXMuY3VycmVudFVybFRyZWUsIGNvbW1hbmRzLCBxICEsIGYgISk7XG4gIH1cblxuICAvKipcbiAgICogTmF2aWdhdGUgYmFzZWQgb24gdGhlIHByb3ZpZGVkIHVybC4gVGhpcyBuYXZpZ2F0aW9uIGlzIGFsd2F5cyBhYnNvbHV0ZS5cbiAgICpcbiAgICogUmV0dXJucyBhIHByb21pc2UgdGhhdDpcbiAgICogLSByZXNvbHZlcyB0byAndHJ1ZScgd2hlbiBuYXZpZ2F0aW9uIHN1Y2NlZWRzLFxuICAgKiAtIHJlc29sdmVzIHRvICdmYWxzZScgd2hlbiBuYXZpZ2F0aW9uIGZhaWxzLFxuICAgKiAtIGlzIHJlamVjdGVkIHdoZW4gYW4gZXJyb3IgaGFwcGVucy5cbiAgICpcbiAgICogQHVzYWdlTm90ZXNcbiAgICpcbiAgICogIyMjIEV4YW1wbGVcbiAgICpcbiAgICogYGBgXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiKTtcbiAgICpcbiAgICogLy8gTmF2aWdhdGUgd2l0aG91dCB1cGRhdGluZyB0aGUgVVJMXG4gICAqIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKFwiL3RlYW0vMzMvdXNlci8xMVwiLCB7IHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZSB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIFNpbmNlIGBuYXZpZ2F0ZUJ5VXJsKClgIHRha2VzIGFuIGFic29sdXRlIFVSTCBhcyB0aGUgZmlyc3QgcGFyYW1ldGVyLFxuICAgKiBpdCB3aWxsIG5vdCBhcHBseSBhbnkgZGVsdGEgdG8gdGhlIGN1cnJlbnQgVVJMIGFuZCBpZ25vcmVzIGFueSBwcm9wZXJ0aWVzXG4gICAqIGluIHRoZSBzZWNvbmQgcGFyYW1ldGVyICh0aGUgYE5hdmlnYXRpb25FeHRyYXNgKSB0aGF0IHdvdWxkIGNoYW5nZSB0aGVcbiAgICogcHJvdmlkZWQgVVJMLlxuICAgKi9cbiAgbmF2aWdhdGVCeVVybCh1cmw6IHN0cmluZ3xVcmxUcmVlLCBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7c2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZX0pOlxuICAgICAgUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKGlzRGV2TW9kZSgpICYmIHRoaXMuaXNOZ1pvbmVFbmFibGVkICYmICFOZ1pvbmUuaXNJbkFuZ3VsYXJab25lKCkpIHtcbiAgICAgIHRoaXMuY29uc29sZS53YXJuKFxuICAgICAgICAgIGBOYXZpZ2F0aW9uIHRyaWdnZXJlZCBvdXRzaWRlIEFuZ3VsYXIgem9uZSwgZGlkIHlvdSBmb3JnZXQgdG8gY2FsbCAnbmdab25lLnJ1bigpJz9gKTtcbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gdXJsIGluc3RhbmNlb2YgVXJsVHJlZSA/IHVybCA6IHRoaXMucGFyc2VVcmwodXJsKTtcbiAgICBjb25zdCBtZXJnZWRUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHVybFRyZWUsIHRoaXMucmF3VXJsVHJlZSk7XG5cbiAgICByZXR1cm4gdGhpcy5zY2hlZHVsZU5hdmlnYXRpb24obWVyZ2VkVHJlZSwgJ2ltcGVyYXRpdmUnLCBudWxsLCBleHRyYXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBhcnJheSBvZiBjb21tYW5kcyBhbmQgYSBzdGFydGluZyBwb2ludC5cbiAgICogSWYgbm8gc3RhcnRpbmcgcm91dGUgaXMgcHJvdmlkZWQsIHRoZSBuYXZpZ2F0aW9uIGlzIGFic29sdXRlLlxuICAgKlxuICAgKiBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0OlxuICAgKiAtIHJlc29sdmVzIHRvICd0cnVlJyB3aGVuIG5hdmlnYXRpb24gc3VjY2VlZHMsXG4gICAqIC0gcmVzb2x2ZXMgdG8gJ2ZhbHNlJyB3aGVuIG5hdmlnYXRpb24gZmFpbHMsXG4gICAqIC0gaXMgcmVqZWN0ZWQgd2hlbiBhbiBlcnJvciBoYXBwZW5zLlxuICAgKlxuICAgKiBAdXNhZ2VOb3Rlc1xuICAgKlxuICAgKiAjIyMgRXhhbXBsZVxuICAgKlxuICAgKiBgYGBcbiAgICogcm91dGVyLm5hdmlnYXRlKFsndGVhbScsIDMzLCAndXNlcicsIDExXSwge3JlbGF0aXZlVG86IHJvdXRlfSk7XG4gICAqXG4gICAqIC8vIE5hdmlnYXRlIHdpdGhvdXQgdXBkYXRpbmcgdGhlIFVSTFxuICAgKiByb3V0ZXIubmF2aWdhdGUoWyd0ZWFtJywgMzMsICd1c2VyJywgMTFdLCB7cmVsYXRpdmVUbzogcm91dGUsIHNraXBMb2NhdGlvbkNoYW5nZTogdHJ1ZX0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogVGhlIGZpcnN0IHBhcmFtZXRlciBvZiBgbmF2aWdhdGUoKWAgaXMgYSBkZWx0YSB0byBiZSBhcHBsaWVkIHRvIHRoZSBjdXJyZW50IFVSTFxuICAgKiBvciB0aGUgb25lIHByb3ZpZGVkIGluIHRoZSBgcmVsYXRpdmVUb2AgcHJvcGVydHkgb2YgdGhlIHNlY29uZCBwYXJhbWV0ZXIgKHRoZVxuICAgKiBgTmF2aWdhdGlvbkV4dHJhc2ApLlxuICAgKi9cbiAgbmF2aWdhdGUoY29tbWFuZHM6IGFueVtdLCBleHRyYXM6IE5hdmlnYXRpb25FeHRyYXMgPSB7c2tpcExvY2F0aW9uQ2hhbmdlOiBmYWxzZX0pOlxuICAgICAgUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdmFsaWRhdGVDb21tYW5kcyhjb21tYW5kcyk7XG4gICAgcmV0dXJuIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmNyZWF0ZVVybFRyZWUoY29tbWFuZHMsIGV4dHJhcyksIGV4dHJhcyk7XG4gIH1cblxuICAvKiogU2VyaWFsaXplcyBhIGBVcmxUcmVlYCBpbnRvIGEgc3RyaW5nICovXG4gIHNlcmlhbGl6ZVVybCh1cmw6IFVybFRyZWUpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpOyB9XG5cbiAgLyoqIFBhcnNlcyBhIHN0cmluZyBpbnRvIGEgYFVybFRyZWVgICovXG4gIHBhcnNlVXJsKHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gICAgbGV0IHVybFRyZWU6IFVybFRyZWU7XG4gICAgdHJ5IHtcbiAgICAgIHVybFRyZWUgPSB0aGlzLnVybFNlcmlhbGl6ZXIucGFyc2UodXJsKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB1cmxUcmVlID0gdGhpcy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIoZSwgdGhpcy51cmxTZXJpYWxpemVyLCB1cmwpO1xuICAgIH1cbiAgICByZXR1cm4gdXJsVHJlZTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIHdoZXRoZXIgdGhlIHVybCBpcyBhY3RpdmF0ZWQgKi9cbiAgaXNBY3RpdmUodXJsOiBzdHJpbmd8VXJsVHJlZSwgZXhhY3Q6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBpZiAodXJsIGluc3RhbmNlb2YgVXJsVHJlZSkge1xuICAgICAgcmV0dXJuIGNvbnRhaW5zVHJlZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCB1cmwsIGV4YWN0KTtcbiAgICB9XG5cbiAgICBjb25zdCB1cmxUcmVlID0gdGhpcy5wYXJzZVVybCh1cmwpO1xuICAgIHJldHVybiBjb250YWluc1RyZWUodGhpcy5jdXJyZW50VXJsVHJlZSwgdXJsVHJlZSwgZXhhY3QpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVFbXB0eVByb3BzKHBhcmFtczogUGFyYW1zKTogUGFyYW1zIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMocGFyYW1zKS5yZWR1Y2UoKHJlc3VsdDogUGFyYW1zLCBrZXk6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgdmFsdWU6IGFueSA9IHBhcmFtc1trZXldO1xuICAgICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSwge30pO1xuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzTmF2aWdhdGlvbnMoKTogdm9pZCB7XG4gICAgdGhpcy5uYXZpZ2F0aW9ucy5zdWJzY3JpYmUoXG4gICAgICAgIHQgPT4ge1xuICAgICAgICAgIHRoaXMubmF2aWdhdGVkID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSB0LmlkO1xuICAgICAgICAgICh0aGlzLmV2ZW50cyBhcyBTdWJqZWN0PEV2ZW50PilcbiAgICAgICAgICAgICAgLm5leHQobmV3IE5hdmlnYXRpb25FbmQoXG4gICAgICAgICAgICAgICAgICB0LmlkLCB0aGlzLnNlcmlhbGl6ZVVybCh0LmV4dHJhY3RlZFVybCksIHRoaXMuc2VyaWFsaXplVXJsKHRoaXMuY3VycmVudFVybFRyZWUpKSk7XG4gICAgICAgICAgdC5yZXNvbHZlKHRydWUpO1xuICAgICAgICB9LFxuICAgICAgICBlID0+IHsgdGhpcy5jb25zb2xlLndhcm4oYFVuaGFuZGxlZCBOYXZpZ2F0aW9uIEVycm9yOiBgKTsgfSk7XG4gIH1cblxuICBwcml2YXRlIHNjaGVkdWxlTmF2aWdhdGlvbihcbiAgICAgIHJhd1VybDogVXJsVHJlZSwgc291cmNlOiBOYXZpZ2F0aW9uVHJpZ2dlciwgc3RhdGU6IHtuYXZpZ2F0aW9uSWQ6IG51bWJlcn18bnVsbCxcbiAgICAgIGV4dHJhczogTmF2aWdhdGlvbkV4dHJhcyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IGxhc3ROYXZpZ2F0aW9uID0gdGhpcy5nZXRUcmFuc2l0aW9uKCk7XG4gICAgLy8gSWYgdGhlIHVzZXIgdHJpZ2dlcnMgYSBuYXZpZ2F0aW9uIGltcGVyYXRpdmVseSAoZS5nLiwgYnkgdXNpbmcgbmF2aWdhdGVCeVVybCksXG4gICAgLy8gYW5kIHRoYXQgbmF2aWdhdGlvbiByZXN1bHRzIGluICdyZXBsYWNlU3RhdGUnIHRoYXQgbGVhZHMgdG8gdGhlIHNhbWUgVVJMLFxuICAgIC8vIHdlIHNob3VsZCBza2lwIHRob3NlLlxuICAgIGlmIChsYXN0TmF2aWdhdGlvbiAmJiBzb3VyY2UgIT09ICdpbXBlcmF0aXZlJyAmJiBsYXN0TmF2aWdhdGlvbi5zb3VyY2UgPT09ICdpbXBlcmF0aXZlJyAmJlxuICAgICAgICBsYXN0TmF2aWdhdGlvbi5yYXdVcmwudG9TdHJpbmcoKSA9PT0gcmF3VXJsLnRvU3RyaW5nKCkpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJ1ZSk7ICAvLyByZXR1cm4gdmFsdWUgaXMgbm90IHVzZWRcbiAgICB9XG5cbiAgICAvLyBCZWNhdXNlIG9mIGEgYnVnIGluIElFIGFuZCBFZGdlLCB0aGUgbG9jYXRpb24gY2xhc3MgZmlyZXMgdHdvIGV2ZW50cyAocG9wc3RhdGUgYW5kXG4gICAgLy8gaGFzaGNoYW5nZSkgZXZlcnkgc2luZ2xlIHRpbWUuIFRoZSBzZWNvbmQgb25lIHNob3VsZCBiZSBpZ25vcmVkLiBPdGhlcndpc2UsIHRoZSBVUkwgd2lsbFxuICAgIC8vIGZsaWNrZXIuIEhhbmRsZXMgdGhlIGNhc2Ugd2hlbiBhIHBvcHN0YXRlIHdhcyBlbWl0dGVkIGZpcnN0LlxuICAgIGlmIChsYXN0TmF2aWdhdGlvbiAmJiBzb3VyY2UgPT0gJ2hhc2hjaGFuZ2UnICYmIGxhc3ROYXZpZ2F0aW9uLnNvdXJjZSA9PT0gJ3BvcHN0YXRlJyAmJlxuICAgICAgICBsYXN0TmF2aWdhdGlvbi5yYXdVcmwudG9TdHJpbmcoKSA9PT0gcmF3VXJsLnRvU3RyaW5nKCkpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJ1ZSk7ICAvLyByZXR1cm4gdmFsdWUgaXMgbm90IHVzZWRcbiAgICB9XG4gICAgLy8gQmVjYXVzZSBvZiBhIGJ1ZyBpbiBJRSBhbmQgRWRnZSwgdGhlIGxvY2F0aW9uIGNsYXNzIGZpcmVzIHR3byBldmVudHMgKHBvcHN0YXRlIGFuZFxuICAgIC8vIGhhc2hjaGFuZ2UpIGV2ZXJ5IHNpbmdsZSB0aW1lLiBUaGUgc2Vjb25kIG9uZSBzaG91bGQgYmUgaWdub3JlZC4gT3RoZXJ3aXNlLCB0aGUgVVJMIHdpbGxcbiAgICAvLyBmbGlja2VyLiBIYW5kbGVzIHRoZSBjYXNlIHdoZW4gYSBoYXNoY2hhbmdlIHdhcyBlbWl0dGVkIGZpcnN0LlxuICAgIGlmIChsYXN0TmF2aWdhdGlvbiAmJiBzb3VyY2UgPT0gJ3BvcHN0YXRlJyAmJiBsYXN0TmF2aWdhdGlvbi5zb3VyY2UgPT09ICdoYXNoY2hhbmdlJyAmJlxuICAgICAgICBsYXN0TmF2aWdhdGlvbi5yYXdVcmwudG9TdHJpbmcoKSA9PT0gcmF3VXJsLnRvU3RyaW5nKCkpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJ1ZSk7ICAvLyByZXR1cm4gdmFsdWUgaXMgbm90IHVzZWRcbiAgICB9XG5cbiAgICBsZXQgcmVzb2x2ZTogYW55ID0gbnVsbDtcbiAgICBsZXQgcmVqZWN0OiBhbnkgPSBudWxsO1xuXG4gICAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXMsIHJlaikgPT4ge1xuICAgICAgcmVzb2x2ZSA9IHJlcztcbiAgICAgIHJlamVjdCA9IHJlajtcbiAgICB9KTtcblxuICAgIGNvbnN0IGlkID0gKyt0aGlzLm5hdmlnYXRpb25JZDtcbiAgICB0aGlzLnNldFRyYW5zaXRpb24oe1xuICAgICAgaWQsXG4gICAgICBzb3VyY2UsXG4gICAgICBzdGF0ZSxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgY3VycmVudFJhd1VybDogdGhpcy5yYXdVcmxUcmVlLCByYXdVcmwsIGV4dHJhcywgcmVzb2x2ZSwgcmVqZWN0LCBwcm9taXNlLFxuICAgICAgY3VycmVudFNuYXBzaG90OiB0aGlzLnJvdXRlclN0YXRlLnNuYXBzaG90LFxuICAgICAgY3VycmVudFJvdXRlclN0YXRlOiB0aGlzLnJvdXRlclN0YXRlXG4gICAgfSk7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhhdCB0aGUgZXJyb3IgaXMgcHJvcGFnYXRlZCBldmVuIHRob3VnaCBgcHJvY2Vzc05hdmlnYXRpb25zYCBjYXRjaFxuICAgIC8vIGhhbmRsZXIgZG9lcyBub3QgcmV0aHJvd1xuICAgIHJldHVybiBwcm9taXNlLmNhdGNoKChlOiBhbnkpID0+IHsgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpOyB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0QnJvd3NlclVybCh1cmw6IFVybFRyZWUsIHJlcGxhY2VVcmw6IGJvb2xlYW4sIGlkOiBudW1iZXIpIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICAgIGlmICh0aGlzLmxvY2F0aW9uLmlzQ3VycmVudFBhdGhFcXVhbFRvKHBhdGgpIHx8IHJlcGxhY2VVcmwpIHtcbiAgICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKHBhdGgsICcnLCB7bmF2aWdhdGlvbklkOiBpZH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxvY2F0aW9uLmdvKHBhdGgsICcnLCB7bmF2aWdhdGlvbklkOiBpZH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRTdGF0ZUFuZFVybChzdG9yZWRTdGF0ZTogUm91dGVyU3RhdGUsIHN0b3JlZFVybDogVXJsVHJlZSwgcmF3VXJsOiBVcmxUcmVlKTogdm9pZCB7XG4gICAgKHRoaXMgYXN7cm91dGVyU3RhdGU6IFJvdXRlclN0YXRlfSkucm91dGVyU3RhdGUgPSBzdG9yZWRTdGF0ZTtcbiAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gc3RvcmVkVXJsO1xuICAgIHRoaXMucmF3VXJsVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCByYXdVcmwpO1xuICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gIH1cblxuICBwcml2YXRlIHJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpOiB2b2lkIHtcbiAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShcbiAgICAgICAgdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh0aGlzLnJhd1VybFRyZWUpLCAnJywge25hdmlnYXRpb25JZDogdGhpcy5sYXN0U3VjY2Vzc2Z1bElkfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVDb21tYW5kcyhjb21tYW5kczogc3RyaW5nW10pOiB2b2lkIHtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb21tYW5kcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNtZCA9IGNvbW1hbmRzW2ldO1xuICAgIGlmIChjbWQgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgcmVxdWVzdGVkIHBhdGggY29udGFpbnMgJHtjbWR9IHNlZ21lbnQgYXQgaW5kZXggJHtpfWApO1xuICAgIH1cbiAgfVxufVxuIl19