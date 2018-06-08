/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { APP_BASE_HREF, HashLocationStrategy, LOCATION_INITIALIZED, Location, LocationStrategy, PathLocationStrategy, PlatformLocation, ViewportScroller } from '@angular/common';
import { ANALYZE_FOR_ENTRY_COMPONENTS, APP_BOOTSTRAP_LISTENER, APP_INITIALIZER, ApplicationRef, Compiler, Inject, Injectable, InjectionToken, Injector, NgModule, NgModuleFactoryLoader, NgProbeToken, Optional, SkipSelf, SystemJsNgModuleLoader } from '@angular/core';
import { ɵgetDOM as getDOM } from '@angular/platform-browser';
import { Subject, of } from 'rxjs';
import { RouterLink, RouterLinkWithHref } from './directives/router_link';
import { RouterLinkActive } from './directives/router_link_active';
import { RouterOutlet } from './directives/router_outlet';
import { RouteReuseStrategy } from './route_reuse_strategy';
import { Router } from './router';
import { ROUTES } from './router_config_loader';
import { ChildrenOutletContexts } from './router_outlet_context';
import { NoPreloading, PreloadAllModules, PreloadingStrategy, RouterPreloader } from './router_preloader';
import { RouterScroller } from './router_scroller';
import { ActivatedRoute } from './router_state';
import { UrlHandlingStrategy } from './url_handling_strategy';
import { DefaultUrlSerializer, UrlSerializer } from './url_tree';
import { flatten } from './utils/collection';
/**
 * @description
 *
 * Contains a list of directives
 *
 *
 */
var ROUTER_DIRECTIVES = [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive];
/**
 * @description
 *
 * Is used in DI to configure the router.
 *
 *
 */
export var ROUTER_CONFIGURATION = new InjectionToken('ROUTER_CONFIGURATION');
/**
 * @docsNotRequired
 */
export var ROUTER_FORROOT_GUARD = new InjectionToken('ROUTER_FORROOT_GUARD');
export var ROUTER_PROVIDERS = [
    Location,
    { provide: UrlSerializer, useClass: DefaultUrlSerializer },
    {
        provide: Router,
        useFactory: setupRouter,
        deps: [
            ApplicationRef, UrlSerializer, ChildrenOutletContexts, Location, Injector,
            NgModuleFactoryLoader, Compiler, ROUTES, ROUTER_CONFIGURATION,
            [UrlHandlingStrategy, new Optional()], [RouteReuseStrategy, new Optional()]
        ]
    },
    ChildrenOutletContexts,
    { provide: ActivatedRoute, useFactory: rootRoute, deps: [Router] },
    { provide: NgModuleFactoryLoader, useClass: SystemJsNgModuleLoader },
    RouterPreloader,
    NoPreloading,
    PreloadAllModules,
    { provide: ROUTER_CONFIGURATION, useValue: { enableTracing: false } },
];
export function routerNgProbeToken() {
    return new NgProbeToken('Router', Router);
}
/**
 * @usageNotes
 *
 * RouterModule can be imported multiple times: once per lazily-loaded bundle.
 * Since the router deals with a global shared resource--location, we cannot have
 * more than one router service active.
 *
 * That is why there are two ways to create the module: `RouterModule.forRoot` and
 * `RouterModule.forChild`.
 *
 * * `forRoot` creates a module that contains all the directives, the given routes, and the router
 *   service itself.
 * * `forChild` creates a module that contains all the directives and the given routes, but does not
 *   include the router service.
 *
 * When registered at the root, the module should be used as follows
 *
 * ```
 * @NgModule({
 *   imports: [RouterModule.forRoot(ROUTES)]
 * })
 * class MyNgModule {}
 * ```
 *
 * For submodules and lazy loaded submodules the module should be used as follows:
 *
 * ```
 * @NgModule({
 *   imports: [RouterModule.forChild(ROUTES)]
 * })
 * class MyNgModule {}
 * ```
 *
 * @description
 *
 * Adds router directives and providers.
 *
 * Managing state transitions is one of the hardest parts of building applications. This is
 * especially true on the web, where you also need to ensure that the state is reflected in the URL.
 * In addition, we often want to split applications into multiple bundles and load them on demand.
 * Doing this transparently is not trivial.
 *
 * The Angular router solves these problems. Using the router, you can declaratively specify
 * application states, manage state transitions while taking care of the URL, and load bundles on
 * demand.
 *
 * [Read this developer guide](https://angular.io/docs/ts/latest/guide/router.html) to get an
 * overview of how the router should be used.
 *
 *
 */
var RouterModule = /** @class */ (function () {
    // Note: We are injecting the Router so it gets created eagerly...
    function RouterModule(guard, router) {
    }
    /**
     * Creates a module with all the router providers and directives. It also optionally sets up an
     * application listener to perform an initial navigation.
     *
     * Options (see `ExtraOptions`):
     * * `enableTracing` makes the router log all its internal events to the console.
     * * `useHash` enables the location strategy that uses the URL fragment instead of the history
     * API.
     * * `initialNavigation` disables the initial navigation.
     * * `errorHandler` provides a custom error handler.
     * * `preloadingStrategy` configures a preloading strategy (see `PreloadAllModules`).
     * * `onSameUrlNavigation` configures how the router handles navigation to the current URL. See
     * `ExtraOptions` for more details.
     */
    RouterModule.forRoot = function (routes, config) {
        return {
            ngModule: RouterModule,
            providers: [
                ROUTER_PROVIDERS,
                provideRoutes(routes),
                {
                    provide: ROUTER_FORROOT_GUARD,
                    useFactory: provideForRootGuard,
                    deps: [[Router, new Optional(), new SkipSelf()]]
                },
                { provide: ROUTER_CONFIGURATION, useValue: config ? config : {} },
                {
                    provide: LocationStrategy,
                    useFactory: provideLocationStrategy,
                    deps: [
                        PlatformLocation, [new Inject(APP_BASE_HREF), new Optional()], ROUTER_CONFIGURATION
                    ]
                },
                {
                    provide: RouterScroller,
                    useFactory: createRouterScroller,
                    deps: [Router, ViewportScroller, ROUTER_CONFIGURATION]
                },
                {
                    provide: PreloadingStrategy,
                    useExisting: config && config.preloadingStrategy ? config.preloadingStrategy :
                        NoPreloading
                },
                { provide: NgProbeToken, multi: true, useFactory: routerNgProbeToken },
                provideRouterInitializer(),
            ],
        };
    };
    /**
     * Creates a module with all the router directives and a provider registering routes.
     */
    RouterModule.forChild = function (routes) {
        return { ngModule: RouterModule, providers: [provideRoutes(routes)] };
    };
    RouterModule.decorators = [
        { type: NgModule, args: [{ declarations: ROUTER_DIRECTIVES, exports: ROUTER_DIRECTIVES },] }
    ];
    /** @nocollapse */
    RouterModule.ctorParameters = function () { return [
        { type: undefined, decorators: [{ type: Optional }, { type: Inject, args: [ROUTER_FORROOT_GUARD,] }] },
        { type: Router, decorators: [{ type: Optional }] }
    ]; };
    return RouterModule;
}());
export { RouterModule };
export function createRouterScroller(router, viewportScroller, config) {
    if (config.scrollOffset) {
        viewportScroller.setOffset(config.scrollOffset);
    }
    return new RouterScroller(router, viewportScroller, config);
}
export function provideLocationStrategy(platformLocationStrategy, baseHref, options) {
    if (options === void 0) { options = {}; }
    return options.useHash ? new HashLocationStrategy(platformLocationStrategy, baseHref) :
        new PathLocationStrategy(platformLocationStrategy, baseHref);
}
export function provideForRootGuard(router) {
    if (router) {
        throw new Error("RouterModule.forRoot() called twice. Lazy loaded modules should use RouterModule.forChild() instead.");
    }
    return 'guarded';
}
/**
 * @description
 *
 * Registers routes.
 *
 * ### Example
 *
 * ```
 * @NgModule({
 *   imports: [RouterModule.forChild(ROUTES)],
 *   providers: [provideRoutes(EXTRA_ROUTES)]
 * })
 * class MyNgModule {}
 * ```
 *
 *
 */
export function provideRoutes(routes) {
    return [
        { provide: ANALYZE_FOR_ENTRY_COMPONENTS, multi: true, useValue: routes },
        { provide: ROUTES, multi: true, useValue: routes },
    ];
}
export function setupRouter(ref, urlSerializer, contexts, location, injector, loader, compiler, config, opts, urlHandlingStrategy, routeReuseStrategy) {
    if (opts === void 0) { opts = {}; }
    var router = new Router(null, urlSerializer, contexts, location, injector, loader, compiler, flatten(config));
    if (urlHandlingStrategy) {
        router.urlHandlingStrategy = urlHandlingStrategy;
    }
    if (routeReuseStrategy) {
        router.routeReuseStrategy = routeReuseStrategy;
    }
    if (opts.errorHandler) {
        router.errorHandler = opts.errorHandler;
    }
    if (opts.enableTracing) {
        var dom_1 = getDOM();
        router.events.subscribe(function (e) {
            dom_1.logGroup("Router Event: " + e.constructor.name);
            dom_1.log(e.toString());
            dom_1.log(e);
            dom_1.logGroupEnd();
        });
    }
    if (opts.onSameUrlNavigation) {
        router.onSameUrlNavigation = opts.onSameUrlNavigation;
    }
    if (opts.paramsInheritanceStrategy) {
        router.paramsInheritanceStrategy = opts.paramsInheritanceStrategy;
    }
    return router;
}
export function rootRoute(router) {
    return router.routerState.root;
}
/**
 * To initialize the router properly we need to do in two steps:
 *
 * We need to start the navigation in a APP_INITIALIZER to block the bootstrap if
 * a resolver or a guards executes asynchronously. Second, we need to actually run
 * activation in a BOOTSTRAP_LISTENER. We utilize the afterPreactivation
 * hook provided by the router to do that.
 *
 * The router navigation starts, reaches the point when preactivation is done, and then
 * pauses. It waits for the hook to be resolved. We then resolve it only in a bootstrap listener.
 */
var RouterInitializer = /** @class */ (function () {
    function RouterInitializer(injector) {
        this.injector = injector;
        this.initNavigation = false;
        this.resultOfPreactivationDone = new Subject();
    }
    RouterInitializer.prototype.appInitializer = function () {
        var _this = this;
        var p = this.injector.get(LOCATION_INITIALIZED, Promise.resolve(null));
        return p.then(function () {
            var resolve = null;
            var res = new Promise(function (r) { return resolve = r; });
            var router = _this.injector.get(Router);
            var opts = _this.injector.get(ROUTER_CONFIGURATION);
            if (_this.isLegacyDisabled(opts) || _this.isLegacyEnabled(opts)) {
                resolve(true);
            }
            else if (opts.initialNavigation === 'disabled') {
                router.setUpLocationChangeListener();
                resolve(true);
            }
            else if (opts.initialNavigation === 'enabled') {
                router.hooks.afterPreactivation = function () {
                    // only the initial navigation should be delayed
                    if (!_this.initNavigation) {
                        _this.initNavigation = true;
                        resolve(true);
                        return _this.resultOfPreactivationDone;
                        // subsequent navigations should not be delayed
                    }
                    else {
                        return of(null);
                    }
                };
                router.initialNavigation();
            }
            else {
                throw new Error("Invalid initialNavigation options: '" + opts.initialNavigation + "'");
            }
            return res;
        });
    };
    RouterInitializer.prototype.bootstrapListener = function (bootstrappedComponentRef) {
        var opts = this.injector.get(ROUTER_CONFIGURATION);
        var preloader = this.injector.get(RouterPreloader);
        var routerScroller = this.injector.get(RouterScroller);
        var router = this.injector.get(Router);
        var ref = this.injector.get(ApplicationRef);
        if (bootstrappedComponentRef !== ref.components[0]) {
            return;
        }
        if (this.isLegacyEnabled(opts)) {
            router.initialNavigation();
        }
        else if (this.isLegacyDisabled(opts)) {
            router.setUpLocationChangeListener();
        }
        preloader.setUpPreloading();
        routerScroller.init();
        router.resetRootComponentType(ref.componentTypes[0]);
        this.resultOfPreactivationDone.next(null);
        this.resultOfPreactivationDone.complete();
    };
    RouterInitializer.prototype.isLegacyEnabled = function (opts) {
        return opts.initialNavigation === 'legacy_enabled' || opts.initialNavigation === true ||
            opts.initialNavigation === undefined;
    };
    RouterInitializer.prototype.isLegacyDisabled = function (opts) {
        return opts.initialNavigation === 'legacy_disabled' || opts.initialNavigation === false;
    };
    RouterInitializer.decorators = [
        { type: Injectable }
    ];
    /** @nocollapse */
    RouterInitializer.ctorParameters = function () { return [
        { type: Injector }
    ]; };
    return RouterInitializer;
}());
export { RouterInitializer };
export function getAppInitializer(r) {
    return r.appInitializer.bind(r);
}
export function getBootstrapListener(r) {
    return r.bootstrapListener.bind(r);
}
/**
 * A token for the router initializer that will be called after the app is bootstrapped.
 *
 * @experimental
 */
export var ROUTER_INITIALIZER = new InjectionToken('Router Initializer');
export function provideRouterInitializer() {
    return [
        RouterInitializer,
        {
            provide: APP_INITIALIZER,
            multi: true,
            useFactory: getAppInitializer,
            deps: [RouterInitializer]
        },
        { provide: ROUTER_INITIALIZER, useFactory: getBootstrapListener, deps: [RouterInitializer] },
        { provide: APP_BOOTSTRAP_LISTENER, multi: true, useExisting: ROUTER_INITIALIZER },
    ];
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX21vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsYUFBYSxFQUFFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ2hMLE9BQU8sRUFBQyw0QkFBNEIsRUFBRSxzQkFBc0IsRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBZ0IsTUFBTSxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUF1QixRQUFRLEVBQUUscUJBQXFCLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBWSxRQUFRLEVBQUUsc0JBQXNCLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDcFQsT0FBTyxFQUFDLE9BQU8sSUFBSSxNQUFNLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUM1RCxPQUFPLEVBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUdsQyxPQUFPLEVBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFDLE1BQU0sMEJBQTBCLENBQUM7QUFDeEUsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0saUNBQWlDLENBQUM7QUFDakUsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLDRCQUE0QixDQUFDO0FBRXhELE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBQzFELE9BQU8sRUFBZSxNQUFNLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDOUMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBQzlDLE9BQU8sRUFBQyxzQkFBc0IsRUFBQyxNQUFNLHlCQUF5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QUF1QyxvQkFBb0IsQ0FBQyxDQUFDO0FBRW5GLE1BQU07SUFDSixPQUFPO1FBQ0wsaUJBQWlCO1FBQ2pCO1lBQ0UsT0FBTyxFQUFFLGVBQWU7WUFDeEIsS0FBSyxFQUFFLElBQUk7WUFDWCxVQUFVLEVBQUUsaUJBQWlCO1lBQzdCLElBQUksRUFBRSxDQUFDLGlCQUFpQixDQUFDO1NBQzFCO1FBQ0QsRUFBQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxFQUFFLG9CQUFvQixFQUFFLElBQUksRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUM7UUFDMUYsRUFBQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUM7S0FDaEYsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVBQX0JBU0VfSFJFRiwgSGFzaExvY2F0aW9uU3RyYXRlZ3ksIExPQ0FUSU9OX0lOSVRJQUxJWkVELCBMb2NhdGlvbiwgTG9jYXRpb25TdHJhdGVneSwgUGF0aExvY2F0aW9uU3RyYXRlZ3ksIFBsYXRmb3JtTG9jYXRpb24sIFZpZXdwb3J0U2Nyb2xsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0FOQUxZWkVfRk9SX0VOVFJZX0NPTVBPTkVOVFMsIEFQUF9CT09UU1RSQVBfTElTVEVORVIsIEFQUF9JTklUSUFMSVpFUiwgQXBwbGljYXRpb25SZWYsIENvbXBpbGVyLCBDb21wb25lbnRSZWYsIEluamVjdCwgSW5qZWN0YWJsZSwgSW5qZWN0aW9uVG9rZW4sIEluamVjdG9yLCBNb2R1bGVXaXRoUHJvdmlkZXJzLCBOZ01vZHVsZSwgTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBOZ1Byb2JlVG9rZW4sIE9wdGlvbmFsLCBQcm92aWRlciwgU2tpcFNlbGYsIFN5c3RlbUpzTmdNb2R1bGVMb2FkZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHvJtWdldERPTSBhcyBnZXRET019IGZyb20gJ0Bhbmd1bGFyL3BsYXRmb3JtLWJyb3dzZXInO1xuaW1wb3J0IHtTdWJqZWN0LCBvZiB9IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge1JvdXRlLCBSb3V0ZXN9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7Um91dGVyTGluaywgUm91dGVyTGlua1dpdGhIcmVmfSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsnO1xuaW1wb3J0IHtSb3V0ZXJMaW5rQWN0aXZlfSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmtfYWN0aXZlJztcbmltcG9ydCB7Um91dGVyT3V0bGV0fSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX291dGxldCc7XG5pbXBvcnQge1JvdXRlckV2ZW50fSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge1JvdXRlUmV1c2VTdHJhdGVneX0gZnJvbSAnLi9yb3V0ZV9yZXVzZV9zdHJhdGVneSc7XG5pbXBvcnQge0Vycm9ySGFuZGxlciwgUm91dGVyfSBmcm9tICcuL3JvdXRlcic7XG5pbXBvcnQge1JPVVRFU30gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge0NoaWxkcmVuT3V0bGV0Q29udGV4dHN9IGZyb20gJy4vcm91dGVyX291dGxldF9jb250ZXh0JztcbmltcG9ydCB7Tm9QcmVsb2FkaW5nLCBQcmVsb2FkQWxsTW9kdWxlcywgUHJlbG9hZGluZ1N0cmF0ZWd5LCBSb3V0ZXJQcmVsb2FkZXJ9IGZyb20gJy4vcm91dGVyX3ByZWxvYWRlcic7XG5pbXBvcnQge1JvdXRlclNjcm9sbGVyfSBmcm9tICcuL3JvdXRlcl9zY3JvbGxlcic7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlfSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1VybEhhbmRsaW5nU3RyYXRlZ3l9IGZyb20gJy4vdXJsX2hhbmRsaW5nX3N0cmF0ZWd5JztcbmltcG9ydCB7RGVmYXVsdFVybFNlcmlhbGl6ZXIsIFVybFNlcmlhbGl6ZXJ9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtmbGF0dGVufSBmcm9tICcuL3V0aWxzL2NvbGxlY3Rpb24nO1xuXG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBDb250YWlucyBhIGxpc3Qgb2YgZGlyZWN0aXZlc1xuICpcbiAqXG4gKi9cbmNvbnN0IFJPVVRFUl9ESVJFQ1RJVkVTID0gW1JvdXRlck91dGxldCwgUm91dGVyTGluaywgUm91dGVyTGlua1dpdGhIcmVmLCBSb3V0ZXJMaW5rQWN0aXZlXTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBJcyB1c2VkIGluIERJIHRvIGNvbmZpZ3VyZSB0aGUgcm91dGVyLlxuICpcbiAqXG4gKi9cbmV4cG9ydCBjb25zdCBST1VURVJfQ09ORklHVVJBVElPTiA9IG5ldyBJbmplY3Rpb25Ub2tlbjxFeHRyYU9wdGlvbnM+KCdST1VURVJfQ09ORklHVVJBVElPTicpO1xuXG4vKipcbiAqIEBkb2NzTm90UmVxdWlyZWRcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9GT1JST09UX0dVQVJEID0gbmV3IEluamVjdGlvblRva2VuPHZvaWQ+KCdST1VURVJfRk9SUk9PVF9HVUFSRCcpO1xuXG5leHBvcnQgY29uc3QgUk9VVEVSX1BST1ZJREVSUzogUHJvdmlkZXJbXSA9IFtcbiAgTG9jYXRpb24sXG4gIHtwcm92aWRlOiBVcmxTZXJpYWxpemVyLCB1c2VDbGFzczogRGVmYXVsdFVybFNlcmlhbGl6ZXJ9LFxuICB7XG4gICAgcHJvdmlkZTogUm91dGVyLFxuICAgIHVzZUZhY3Rvcnk6IHNldHVwUm91dGVyLFxuICAgIGRlcHM6IFtcbiAgICAgIEFwcGxpY2F0aW9uUmVmLCBVcmxTZXJpYWxpemVyLCBDaGlsZHJlbk91dGxldENvbnRleHRzLCBMb2NhdGlvbiwgSW5qZWN0b3IsXG4gICAgICBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIENvbXBpbGVyLCBST1VURVMsIFJPVVRFUl9DT05GSUdVUkFUSU9OLFxuICAgICAgW1VybEhhbmRsaW5nU3RyYXRlZ3ksIG5ldyBPcHRpb25hbCgpXSwgW1JvdXRlUmV1c2VTdHJhdGVneSwgbmV3IE9wdGlvbmFsKCldXG4gICAgXVxuICB9LFxuICBDaGlsZHJlbk91dGxldENvbnRleHRzLFxuICB7cHJvdmlkZTogQWN0aXZhdGVkUm91dGUsIHVzZUZhY3Rvcnk6IHJvb3RSb3V0ZSwgZGVwczogW1JvdXRlcl19LFxuICB7cHJvdmlkZTogTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCB1c2VDbGFzczogU3lzdGVtSnNOZ01vZHVsZUxvYWRlcn0sXG4gIFJvdXRlclByZWxvYWRlcixcbiAgTm9QcmVsb2FkaW5nLFxuICBQcmVsb2FkQWxsTW9kdWxlcyxcbiAge3Byb3ZpZGU6IFJPVVRFUl9DT05GSUdVUkFUSU9OLCB1c2VWYWx1ZToge2VuYWJsZVRyYWNpbmc6IGZhbHNlfX0sXG5dO1xuXG5leHBvcnQgZnVuY3Rpb24gcm91dGVyTmdQcm9iZVRva2VuKCkge1xuICByZXR1cm4gbmV3IE5nUHJvYmVUb2tlbignUm91dGVyJywgUm91dGVyKTtcbn1cblxuLyoqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIFJvdXRlck1vZHVsZSBjYW4gYmUgaW1wb3J0ZWQgbXVsdGlwbGUgdGltZXM6IG9uY2UgcGVyIGxhemlseS1sb2FkZWQgYnVuZGxlLlxuICogU2luY2UgdGhlIHJvdXRlciBkZWFscyB3aXRoIGEgZ2xvYmFsIHNoYXJlZCByZXNvdXJjZS0tbG9jYXRpb24sIHdlIGNhbm5vdCBoYXZlXG4gKiBtb3JlIHRoYW4gb25lIHJvdXRlciBzZXJ2aWNlIGFjdGl2ZS5cbiAqXG4gKiBUaGF0IGlzIHdoeSB0aGVyZSBhcmUgdHdvIHdheXMgdG8gY3JlYXRlIHRoZSBtb2R1bGU6IGBSb3V0ZXJNb2R1bGUuZm9yUm9vdGAgYW5kXG4gKiBgUm91dGVyTW9kdWxlLmZvckNoaWxkYC5cbiAqXG4gKiAqIGBmb3JSb290YCBjcmVhdGVzIGEgbW9kdWxlIHRoYXQgY29udGFpbnMgYWxsIHRoZSBkaXJlY3RpdmVzLCB0aGUgZ2l2ZW4gcm91dGVzLCBhbmQgdGhlIHJvdXRlclxuICogICBzZXJ2aWNlIGl0c2VsZi5cbiAqICogYGZvckNoaWxkYCBjcmVhdGVzIGEgbW9kdWxlIHRoYXQgY29udGFpbnMgYWxsIHRoZSBkaXJlY3RpdmVzIGFuZCB0aGUgZ2l2ZW4gcm91dGVzLCBidXQgZG9lcyBub3RcbiAqICAgaW5jbHVkZSB0aGUgcm91dGVyIHNlcnZpY2UuXG4gKlxuICogV2hlbiByZWdpc3RlcmVkIGF0IHRoZSByb290LCB0aGUgbW9kdWxlIHNob3VsZCBiZSB1c2VkIGFzIGZvbGxvd3NcbiAqXG4gKiBgYGBcbiAqIEBOZ01vZHVsZSh7XG4gKiAgIGltcG9ydHM6IFtSb3V0ZXJNb2R1bGUuZm9yUm9vdChST1VURVMpXVxuICogfSlcbiAqIGNsYXNzIE15TmdNb2R1bGUge31cbiAqIGBgYFxuICpcbiAqIEZvciBzdWJtb2R1bGVzIGFuZCBsYXp5IGxvYWRlZCBzdWJtb2R1bGVzIHRoZSBtb2R1bGUgc2hvdWxkIGJlIHVzZWQgYXMgZm9sbG93czpcbiAqXG4gKiBgYGBcbiAqIEBOZ01vZHVsZSh7XG4gKiAgIGltcG9ydHM6IFtSb3V0ZXJNb2R1bGUuZm9yQ2hpbGQoUk9VVEVTKV1cbiAqIH0pXG4gKiBjbGFzcyBNeU5nTW9kdWxlIHt9XG4gKiBgYGBcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBBZGRzIHJvdXRlciBkaXJlY3RpdmVzIGFuZCBwcm92aWRlcnMuXG4gKlxuICogTWFuYWdpbmcgc3RhdGUgdHJhbnNpdGlvbnMgaXMgb25lIG9mIHRoZSBoYXJkZXN0IHBhcnRzIG9mIGJ1aWxkaW5nIGFwcGxpY2F0aW9ucy4gVGhpcyBpc1xuICogZXNwZWNpYWxseSB0cnVlIG9uIHRoZSB3ZWIsIHdoZXJlIHlvdSBhbHNvIG5lZWQgdG8gZW5zdXJlIHRoYXQgdGhlIHN0YXRlIGlzIHJlZmxlY3RlZCBpbiB0aGUgVVJMLlxuICogSW4gYWRkaXRpb24sIHdlIG9mdGVuIHdhbnQgdG8gc3BsaXQgYXBwbGljYXRpb25zIGludG8gbXVsdGlwbGUgYnVuZGxlcyBhbmQgbG9hZCB0aGVtIG9uIGRlbWFuZC5cbiAqIERvaW5nIHRoaXMgdHJhbnNwYXJlbnRseSBpcyBub3QgdHJpdmlhbC5cbiAqXG4gKiBUaGUgQW5ndWxhciByb3V0ZXIgc29sdmVzIHRoZXNlIHByb2JsZW1zLiBVc2luZyB0aGUgcm91dGVyLCB5b3UgY2FuIGRlY2xhcmF0aXZlbHkgc3BlY2lmeVxuICogYXBwbGljYXRpb24gc3RhdGVzLCBtYW5hZ2Ugc3RhdGUgdHJhbnNpdGlvbnMgd2hpbGUgdGFraW5nIGNhcmUgb2YgdGhlIFVSTCwgYW5kIGxvYWQgYnVuZGxlcyBvblxuICogZGVtYW5kLlxuICpcbiAqIFtSZWFkIHRoaXMgZGV2ZWxvcGVyIGd1aWRlXShodHRwczovL2FuZ3VsYXIuaW8vZG9jcy90cy9sYXRlc3QvZ3VpZGUvcm91dGVyLmh0bWwpIHRvIGdldCBhblxuICogb3ZlcnZpZXcgb2YgaG93IHRoZSByb3V0ZXIgc2hvdWxkIGJlIHVzZWQuXG4gKlxuICpcbiAqL1xuQE5nTW9kdWxlKHtkZWNsYXJhdGlvbnM6IFJPVVRFUl9ESVJFQ1RJVkVTLCBleHBvcnRzOiBST1VURVJfRElSRUNUSVZFU30pXG5leHBvcnQgY2xhc3MgUm91dGVyTW9kdWxlIHtcbiAgLy8gTm90ZTogV2UgYXJlIGluamVjdGluZyB0aGUgUm91dGVyIHNvIGl0IGdldHMgY3JlYXRlZCBlYWdlcmx5Li4uXG4gIGNvbnN0cnVjdG9yKEBPcHRpb25hbCgpIEBJbmplY3QoUk9VVEVSX0ZPUlJPT1RfR1VBUkQpIGd1YXJkOiBhbnksIEBPcHRpb25hbCgpIHJvdXRlcjogUm91dGVyKSB7fVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbW9kdWxlIHdpdGggYWxsIHRoZSByb3V0ZXIgcHJvdmlkZXJzIGFuZCBkaXJlY3RpdmVzLiBJdCBhbHNvIG9wdGlvbmFsbHkgc2V0cyB1cCBhblxuICAgKiBhcHBsaWNhdGlvbiBsaXN0ZW5lciB0byBwZXJmb3JtIGFuIGluaXRpYWwgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogT3B0aW9ucyAoc2VlIGBFeHRyYU9wdGlvbnNgKTpcbiAgICogKiBgZW5hYmxlVHJhY2luZ2AgbWFrZXMgdGhlIHJvdXRlciBsb2cgYWxsIGl0cyBpbnRlcm5hbCBldmVudHMgdG8gdGhlIGNvbnNvbGUuXG4gICAqICogYHVzZUhhc2hgIGVuYWJsZXMgdGhlIGxvY2F0aW9uIHN0cmF0ZWd5IHRoYXQgdXNlcyB0aGUgVVJMIGZyYWdtZW50IGluc3RlYWQgb2YgdGhlIGhpc3RvcnlcbiAgICogQVBJLlxuICAgKiAqIGBpbml0aWFsTmF2aWdhdGlvbmAgZGlzYWJsZXMgdGhlIGluaXRpYWwgbmF2aWdhdGlvbi5cbiAgICogKiBgZXJyb3JIYW5kbGVyYCBwcm92aWRlcyBhIGN1c3RvbSBlcnJvciBoYW5kbGVyLlxuICAgKiAqIGBwcmVsb2FkaW5nU3RyYXRlZ3lgIGNvbmZpZ3VyZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5IChzZWUgYFByZWxvYWRBbGxNb2R1bGVzYCkuXG4gICAqICogYG9uU2FtZVVybE5hdmlnYXRpb25gIGNvbmZpZ3VyZXMgaG93IHRoZSByb3V0ZXIgaGFuZGxlcyBuYXZpZ2F0aW9uIHRvIHRoZSBjdXJyZW50IFVSTC4gU2VlXG4gICAqIGBFeHRyYU9wdGlvbnNgIGZvciBtb3JlIGRldGFpbHMuXG4gICAqL1xuICBzdGF0aWMgZm9yUm9vdChyb3V0ZXM6IFJvdXRlcywgY29uZmlnPzogRXh0cmFPcHRpb25zKTogTW9kdWxlV2l0aFByb3ZpZGVycyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5nTW9kdWxlOiBSb3V0ZXJNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFtcbiAgICAgICAgUk9VVEVSX1BST1ZJREVSUyxcbiAgICAgICAgcHJvdmlkZVJvdXRlcyhyb3V0ZXMpLFxuICAgICAgICB7XG4gICAgICAgICAgcHJvdmlkZTogUk9VVEVSX0ZPUlJPT1RfR1VBUkQsXG4gICAgICAgICAgdXNlRmFjdG9yeTogcHJvdmlkZUZvclJvb3RHdWFyZCxcbiAgICAgICAgICBkZXBzOiBbW1JvdXRlciwgbmV3IE9wdGlvbmFsKCksIG5ldyBTa2lwU2VsZigpXV1cbiAgICAgICAgfSxcbiAgICAgICAge3Byb3ZpZGU6IFJPVVRFUl9DT05GSUdVUkFUSU9OLCB1c2VWYWx1ZTogY29uZmlnID8gY29uZmlnIDoge319LFxuICAgICAgICB7XG4gICAgICAgICAgcHJvdmlkZTogTG9jYXRpb25TdHJhdGVneSxcbiAgICAgICAgICB1c2VGYWN0b3J5OiBwcm92aWRlTG9jYXRpb25TdHJhdGVneSxcbiAgICAgICAgICBkZXBzOiBbXG4gICAgICAgICAgICBQbGF0Zm9ybUxvY2F0aW9uLCBbbmV3IEluamVjdChBUFBfQkFTRV9IUkVGKSwgbmV3IE9wdGlvbmFsKCldLCBST1VURVJfQ09ORklHVVJBVElPTlxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHByb3ZpZGU6IFJvdXRlclNjcm9sbGVyLFxuICAgICAgICAgIHVzZUZhY3Rvcnk6IGNyZWF0ZVJvdXRlclNjcm9sbGVyLFxuICAgICAgICAgIGRlcHM6IFtSb3V0ZXIsIFZpZXdwb3J0U2Nyb2xsZXIsIFJPVVRFUl9DT05GSUdVUkFUSU9OXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgcHJvdmlkZTogUHJlbG9hZGluZ1N0cmF0ZWd5LFxuICAgICAgICAgIHVzZUV4aXN0aW5nOiBjb25maWcgJiYgY29uZmlnLnByZWxvYWRpbmdTdHJhdGVneSA/IGNvbmZpZy5wcmVsb2FkaW5nU3RyYXRlZ3kgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE5vUHJlbG9hZGluZ1xuICAgICAgICB9LFxuICAgICAgICB7cHJvdmlkZTogTmdQcm9iZVRva2VuLCBtdWx0aTogdHJ1ZSwgdXNlRmFjdG9yeTogcm91dGVyTmdQcm9iZVRva2VufSxcbiAgICAgICAgcHJvdmlkZVJvdXRlckluaXRpYWxpemVyKCksXG4gICAgICBdLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG1vZHVsZSB3aXRoIGFsbCB0aGUgcm91dGVyIGRpcmVjdGl2ZXMgYW5kIGEgcHJvdmlkZXIgcmVnaXN0ZXJpbmcgcm91dGVzLlxuICAgKi9cbiAgc3RhdGljIGZvckNoaWxkKHJvdXRlczogUm91dGVzKTogTW9kdWxlV2l0aFByb3ZpZGVycyB7XG4gICAgcmV0dXJuIHtuZ01vZHVsZTogUm91dGVyTW9kdWxlLCBwcm92aWRlcnM6IFtwcm92aWRlUm91dGVzKHJvdXRlcyldfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUm91dGVyU2Nyb2xsZXIoXG4gICAgcm91dGVyOiBSb3V0ZXIsIHZpZXdwb3J0U2Nyb2xsZXI6IFZpZXdwb3J0U2Nyb2xsZXIsIGNvbmZpZzogRXh0cmFPcHRpb25zKTogUm91dGVyU2Nyb2xsZXIge1xuICBpZiAoY29uZmlnLnNjcm9sbE9mZnNldCkge1xuICAgIHZpZXdwb3J0U2Nyb2xsZXIuc2V0T2Zmc2V0KGNvbmZpZy5zY3JvbGxPZmZzZXQpO1xuICB9XG4gIHJldHVybiBuZXcgUm91dGVyU2Nyb2xsZXIocm91dGVyLCB2aWV3cG9ydFNjcm9sbGVyLCBjb25maWcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZUxvY2F0aW9uU3RyYXRlZ3koXG4gICAgcGxhdGZvcm1Mb2NhdGlvblN0cmF0ZWd5OiBQbGF0Zm9ybUxvY2F0aW9uLCBiYXNlSHJlZjogc3RyaW5nLCBvcHRpb25zOiBFeHRyYU9wdGlvbnMgPSB7fSkge1xuICByZXR1cm4gb3B0aW9ucy51c2VIYXNoID8gbmV3IEhhc2hMb2NhdGlvblN0cmF0ZWd5KHBsYXRmb3JtTG9jYXRpb25TdHJhdGVneSwgYmFzZUhyZWYpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQYXRoTG9jYXRpb25TdHJhdGVneShwbGF0Zm9ybUxvY2F0aW9uU3RyYXRlZ3ksIGJhc2VIcmVmKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVGb3JSb290R3VhcmQocm91dGVyOiBSb3V0ZXIpOiBhbnkge1xuICBpZiAocm91dGVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgUm91dGVyTW9kdWxlLmZvclJvb3QoKSBjYWxsZWQgdHdpY2UuIExhenkgbG9hZGVkIG1vZHVsZXMgc2hvdWxkIHVzZSBSb3V0ZXJNb2R1bGUuZm9yQ2hpbGQoKSBpbnN0ZWFkLmApO1xuICB9XG4gIHJldHVybiAnZ3VhcmRlZCc7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVnaXN0ZXJzIHJvdXRlcy5cbiAqXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYFxuICogQE5nTW9kdWxlKHtcbiAqICAgaW1wb3J0czogW1JvdXRlck1vZHVsZS5mb3JDaGlsZChST1VURVMpXSxcbiAqICAgcHJvdmlkZXJzOiBbcHJvdmlkZVJvdXRlcyhFWFRSQV9ST1VURVMpXVxuICogfSlcbiAqIGNsYXNzIE15TmdNb2R1bGUge31cbiAqIGBgYFxuICpcbiAqXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm92aWRlUm91dGVzKHJvdXRlczogUm91dGVzKTogYW55IHtcbiAgcmV0dXJuIFtcbiAgICB7cHJvdmlkZTogQU5BTFlaRV9GT1JfRU5UUllfQ09NUE9ORU5UUywgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiByb3V0ZXN9LFxuICAgIHtwcm92aWRlOiBST1VURVMsIG11bHRpOiB0cnVlLCB1c2VWYWx1ZTogcm91dGVzfSxcbiAgXTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIGFuIG9wdGlvbiB0byBjb25maWd1cmUgd2hlbiB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIGlzIHBlcmZvcm1lZC5cbiAqXG4gKiAqICdlbmFibGVkJyAtIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gc3RhcnRzIGJlZm9yZSB0aGUgcm9vdCBjb21wb25lbnQgaXMgY3JlYXRlZC5cbiAqIFRoZSBib290c3RyYXAgaXMgYmxvY2tlZCB1bnRpbCB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIGlzIGNvbXBsZXRlLlxuICogKiAnZGlzYWJsZWQnIC0gdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBpcyBub3QgcGVyZm9ybWVkLiBUaGUgbG9jYXRpb24gbGlzdGVuZXIgaXMgc2V0IHVwIGJlZm9yZVxuICogdGhlIHJvb3QgY29tcG9uZW50IGdldHMgY3JlYXRlZC5cbiAqICogJ2xlZ2FjeV9lbmFibGVkJy0gdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBzdGFydHMgYWZ0ZXIgdGhlIHJvb3QgY29tcG9uZW50IGhhcyBiZWVuIGNyZWF0ZWQuXG4gKiBUaGUgYm9vdHN0cmFwIGlzIG5vdCBibG9ja2VkIHVudGlsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgY29tcGxldGUuIEBkZXByZWNhdGVkXG4gKiAqICdsZWdhY3lfZGlzYWJsZWQnLSB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIGlzIG5vdCBwZXJmb3JtZWQuIFRoZSBsb2NhdGlvbiBsaXN0ZW5lciBpcyBzZXQgdXBcbiAqIGFmdGVyIEBkZXByZWNhdGVkXG4gKiB0aGUgcm9vdCBjb21wb25lbnQgZ2V0cyBjcmVhdGVkLlxuICogKiBgdHJ1ZWAgLSBzYW1lIGFzICdsZWdhY3lfZW5hYmxlZCcuIEBkZXByZWNhdGVkIHNpbmNlIHY0XG4gKiAqIGBmYWxzZWAgLSBzYW1lIGFzICdsZWdhY3lfZGlzYWJsZWQnLiBAZGVwcmVjYXRlZCBzaW5jZSB2NFxuICpcbiAqIFRoZSAnZW5hYmxlZCcgb3B0aW9uIHNob3VsZCBiZSB1c2VkIGZvciBhcHBsaWNhdGlvbnMgdW5sZXNzIHRoZXJlIGlzIGEgcmVhc29uIHRvIGhhdmVcbiAqIG1vcmUgY29udHJvbCBvdmVyIHdoZW4gdGhlIHJvdXRlciBzdGFydHMgaXRzIGluaXRpYWwgbmF2aWdhdGlvbiBkdWUgdG8gc29tZSBjb21wbGV4XG4gKiBpbml0aWFsaXphdGlvbiBsb2dpYy4gSW4gdGhpcyBjYXNlLCAnZGlzYWJsZWQnIHNob3VsZCBiZSB1c2VkLlxuICpcbiAqIFRoZSAnbGVnYWN5X2VuYWJsZWQnIGFuZCAnbGVnYWN5X2Rpc2FibGVkJyBzaG91bGQgbm90IGJlIHVzZWQgZm9yIG5ldyBhcHBsaWNhdGlvbnMuXG4gKlxuICogQGV4cGVyaW1lbnRhbFxuICovXG5leHBvcnQgdHlwZSBJbml0aWFsTmF2aWdhdGlvbiA9XG4gICAgdHJ1ZSB8IGZhbHNlIHwgJ2VuYWJsZWQnIHwgJ2Rpc2FibGVkJyB8ICdsZWdhY3lfZW5hYmxlZCcgfCAnbGVnYWN5X2Rpc2FibGVkJztcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIG9wdGlvbnMgdG8gY29uZmlndXJlIHRoZSByb3V0ZXIuXG4gKlxuICpcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFeHRyYU9wdGlvbnMge1xuICAvKipcbiAgICogTWFrZXMgdGhlIHJvdXRlciBsb2cgYWxsIGl0cyBpbnRlcm5hbCBldmVudHMgdG8gdGhlIGNvbnNvbGUuXG4gICAqL1xuICBlbmFibGVUcmFjaW5nPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogRW5hYmxlcyB0aGUgbG9jYXRpb24gc3RyYXRlZ3kgdGhhdCB1c2VzIHRoZSBVUkwgZnJhZ21lbnQgaW5zdGVhZCBvZiB0aGUgaGlzdG9yeSBBUEkuXG4gICAqL1xuICB1c2VIYXNoPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogRGlzYWJsZXMgdGhlIGluaXRpYWwgbmF2aWdhdGlvbi5cbiAgICovXG4gIGluaXRpYWxOYXZpZ2F0aW9uPzogSW5pdGlhbE5hdmlnYXRpb247XG5cbiAgLyoqXG4gICAqIEEgY3VzdG9tIGVycm9yIGhhbmRsZXIuXG4gICAqL1xuICBlcnJvckhhbmRsZXI/OiBFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5LiBTZWUgYFByZWxvYWRBbGxNb2R1bGVzYC5cbiAgICovXG4gIHByZWxvYWRpbmdTdHJhdGVneT86IGFueTtcblxuICAvKipcbiAgICogRGVmaW5lIHdoYXQgdGhlIHJvdXRlciBzaG91bGQgZG8gaWYgaXQgcmVjZWl2ZXMgYSBuYXZpZ2F0aW9uIHJlcXVlc3QgdG8gdGhlIGN1cnJlbnQgVVJMLlxuICAgKiBCeSBkZWZhdWx0LCB0aGUgcm91dGVyIHdpbGwgaWdub3JlIHRoaXMgbmF2aWdhdGlvbi4gSG93ZXZlciwgdGhpcyBwcmV2ZW50cyBmZWF0dXJlcyBzdWNoXG4gICAqIGFzIGEgXCJyZWZyZXNoXCIgYnV0dG9uLiBVc2UgdGhpcyBvcHRpb24gdG8gY29uZmlndXJlIHRoZSBiZWhhdmlvciB3aGVuIG5hdmlnYXRpbmcgdG8gdGhlXG4gICAqIGN1cnJlbnQgVVJMLiBEZWZhdWx0IGlzICdpZ25vcmUnLlxuICAgKi9cbiAgb25TYW1lVXJsTmF2aWdhdGlvbj86ICdyZWxvYWQnfCdpZ25vcmUnO1xuXG4gIC8qKlxuICAgKiBDb25maWd1cmVzIGlmIHRoZSBzY3JvbGwgcG9zaXRpb24gbmVlZHMgdG8gYmUgcmVzdG9yZWQgd2hlbiBuYXZpZ2F0aW5nIGJhY2suXG4gICAqXG4gICAqICogJ2Rpc2FibGVkJy0tZG9lcyBub3RoaW5nIChkZWZhdWx0KS5cbiAgICogKiAndG9wJy0tc2V0IHRoZSBzY3JvbGwgcG9zaXRpb24gdG8gMCwwLi5cbiAgICogKiAnZW5hYmxlZCctLXNldCB0aGUgc2Nyb2xsIHBvc2l0aW9uIHRvIHRoZSBzdG9yZWQgcG9zaXRpb24uIFRoaXMgb3B0aW9uIHdpbGwgYmUgdGhlIGRlZmF1bHQgaW5cbiAgICogdGhlIGZ1dHVyZS5cbiAgICpcbiAgICogV2hlbiBlbmFibGVkLCB0aGUgcm91dGVyIHN0b3JlIHN0b3JlIHNjcm9sbCBwb3NpdGlvbnMgd2hlbiBuYXZpZ2F0aW5nIGZvcndhcmQsIGFuZCB3aWxsXG4gICAqIHJlc3RvcmUgdGhlIHN0b3JlZCBwb3NpdGlvbnMgd2hlIG5hdmlnYXRpbmcgYmFjayAocG9wc3RhdGUpLiBXaGVuIG5hdmlnYXRpbmcgZm9yd2FyZCxcbiAgICogdGhlIHNjcm9sbCBwb3NpdGlvbiB3aWxsIGJlIHNldCB0byBbMCwgMF0sIG9yIHRvIHRoZSBhbmNob3IgaWYgb25lIGlzIHByb3ZpZGVkLlxuICAgKlxuICAgKiBZb3UgY2FuIGltcGxlbWVudCBjdXN0b20gc2Nyb2xsIHJlc3RvcmF0aW9uIGJlaGF2aW9yIGFzIGZvbGxvd3MuXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY2xhc3MgQXBwTW9kdWxlIHtcbiAgICogIGNvbnN0cnVjdG9yKHJvdXRlcjogUm91dGVyLCB2aWV3cG9ydFNjcm9sbGVyOiBWaWV3cG9ydFNjcm9sbGVyLCBzdG9yZTogU3RvcmU8QXBwU3RhdGU+KSB7XG4gICAqICAgIHJvdXRlci5ldmVudHMucGlwZShmaWx0ZXIoZSA9PiBlIGluc3RhbmNlb2YgU2Nyb2xsKSwgc3dpdGNoTWFwKGUgPT4ge1xuICAgKiAgICAgIHJldHVybiBzdG9yZS5waXBlKGZpcnN0KCksIHRpbWVvdXQoMjAwKSwgbWFwKCgpID0+IGUpKTtcbiAgICogICAgfSkuc3Vic2NyaWJlKGUgPT4ge1xuICAgKiAgICAgIGlmIChlLnBvc2l0aW9uKSB7XG4gICAqICAgICAgICB2aWV3cG9ydFNjcm9sbGVyLnNjcm9sbFRvUG9zaXRpb24oZS5wb3NpdGlvbik7XG4gICAqICAgICAgfSBlbHNlIGlmIChlLmFuY2hvcikge1xuICAgKiAgICAgICAgdmlld3BvcnRTY3JvbGxlci5zY3JvbGxUb0FuY2hvcihlLmFuY2hvcik7XG4gICAqICAgICAgfSBlbHNlIHtcbiAgICogICAgICAgIHZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9Qb3NpdGlvbihbMCwgMF0pO1xuICAgKiAgICAgIH1cbiAgICogICAgfSk7XG4gICAqICB9XG4gICAqIH1cbiAgICogYGBgXG4gICAqXG4gICAqIFlvdSBjYW4gYWxzbyBpbXBsZW1lbnQgY29tcG9uZW50LXNwZWNpZmljIHNjcm9sbGluZyBsaWtlIHRoaXM6XG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY2xhc3MgTGlzdENvbXBvbmVudCB7XG4gICAqICAgbGlzdDogYW55W107XG4gICAqICAgY29uc3RydWN0b3Iocm91dGVyOiBSb3V0ZXIsIHZpZXdwb3J0U2Nyb2xsZXI6IFZpZXdwb3J0U2Nyb2xsZXIsIGZldGNoZXI6IExpc3RGZXRjaGVyKSB7XG4gICAqICAgICBjb25zdCBzY3JvbGxFdmVudHMgPSByb3V0ZXIuZXZlbnRzLmZpbHRlcihlID0+IGUgaW5zdGFuY2VvZiBTY3JvbGwpO1xuICAgKiAgICAgbGlzdEZldGNoZXIuZmV0Y2goKS5waXBlKHdpdGhMYXRlc3RGcm9tKHNjcm9sbEV2ZW50cykpLnN1YnNjcmliZSgoW2xpc3QsIGVdKSA9PiB7XG4gICAqICAgICAgIHRoaXMubGlzdCA9IGxpc3Q7XG4gICAqICAgICAgIGlmIChlLnBvc2l0aW9uKSB7XG4gICAqICAgICAgICAgdmlld3BvcnRTY3JvbGxlci5zY3JvbGxUb1Bvc2l0aW9uKGUucG9zaXRpb24pO1xuICAgKiAgICAgICB9IGVsc2Uge1xuICAgKiAgICAgICAgIHZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9Qb3NpdGlvbihbMCwgMF0pO1xuICAgKiAgICAgICB9XG4gICAqICAgICB9KTtcbiAgICogICB9XG4gICAqIH1cbiAgICovXG4gIHNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb24/OiAnZGlzYWJsZWQnfCdlbmFibGVkJ3wndG9wJztcblxuICAvKipcbiAgICogQ29uZmlndXJlcyBpZiB0aGUgcm91dGVyIHNob3VsZCBzY3JvbGwgdG8gdGhlIGVsZW1lbnQgd2hlbiB0aGUgdXJsIGhhcyBhIGZyYWdtZW50LlxuICAgKlxuICAgKiAqICdkaXNhYmxlZCctLWRvZXMgbm90aGluZyAoZGVmYXVsdCkuXG4gICAqICogJ2VuYWJsZWQnLS1zY3JvbGxzIHRvIHRoZSBlbGVtZW50LiBUaGlzIG9wdGlvbiB3aWxsIGJlIHRoZSBkZWZhdWx0IGluIHRoZSBmdXR1cmUuXG4gICAqXG4gICAqIEFuY2hvciBzY3JvbGxpbmcgZG9lcyBub3QgaGFwcGVuIG9uICdwb3BzdGF0ZScuIEluc3RlYWQsIHdlIHJlc3RvcmUgdGhlIHBvc2l0aW9uXG4gICAqIHRoYXQgd2Ugc3RvcmVkIG9yIHNjcm9sbCB0byB0aGUgdG9wLlxuICAgKi9cbiAgYW5jaG9yU2Nyb2xsaW5nPzogJ2Rpc2FibGVkJ3wnZW5hYmxlZCc7XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgdGhlIHNjcm9sbCBvZmZzZXQgdGhlIHJvdXRlciB3aWxsIHVzZSB3aGVuIHNjcm9sbGluZyB0byBhbiBlbGVtZW50LlxuICAgKlxuICAgKiBXaGVuIGdpdmVuIGEgdHVwbGUgd2l0aCB0d28gbnVtYmVycywgdGhlIHJvdXRlciB3aWxsIGFsd2F5cyB1c2UgdGhlIG51bWJlcnMuXG4gICAqIFdoZW4gZ2l2ZW4gYSBmdW5jdGlvbiwgdGhlIHJvdXRlciB3aWxsIGludm9rZSB0aGUgZnVuY3Rpb24gZXZlcnkgdGltZSBpdCByZXN0b3JlcyBzY3JvbGxcbiAgICogcG9zaXRpb24uXG4gICAqL1xuICBzY3JvbGxPZmZzZXQ/OiBbbnVtYmVyLCBudW1iZXJdfCgoKSA9PiBbbnVtYmVyLCBudW1iZXJdKTtcblxuICAvKipcbiAgICogRGVmaW5lcyBob3cgdGhlIHJvdXRlciBtZXJnZXMgcGFyYW1zLCBkYXRhIGFuZCByZXNvbHZlZCBkYXRhIGZyb20gcGFyZW50IHRvIGNoaWxkXG4gICAqIHJvdXRlcy4gQXZhaWxhYmxlIG9wdGlvbnMgYXJlOlxuICAgKlxuICAgKiAtIGAnZW1wdHlPbmx5J2AsIHRoZSBkZWZhdWx0LCBvbmx5IGluaGVyaXRzIHBhcmVudCBwYXJhbXMgZm9yIHBhdGgtbGVzcyBvciBjb21wb25lbnQtbGVzc1xuICAgKiAgIHJvdXRlcy5cbiAgICogLSBgJ2Fsd2F5cydgLCBlbmFibGVzIHVuY29uZGl0aW9uYWwgaW5oZXJpdGFuY2Ugb2YgcGFyZW50IHBhcmFtcy5cbiAgICovXG4gIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k/OiAnZW1wdHlPbmx5J3wnYWx3YXlzJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwUm91dGVyKFxuICAgIHJlZjogQXBwbGljYXRpb25SZWYsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIGNvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLFxuICAgIGxvY2F0aW9uOiBMb2NhdGlvbiwgaW5qZWN0b3I6IEluamVjdG9yLCBsb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLFxuICAgIGNvbmZpZzogUm91dGVbXVtdLCBvcHRzOiBFeHRyYU9wdGlvbnMgPSB7fSwgdXJsSGFuZGxpbmdTdHJhdGVneT86IFVybEhhbmRsaW5nU3RyYXRlZ3ksXG4gICAgcm91dGVSZXVzZVN0cmF0ZWd5PzogUm91dGVSZXVzZVN0cmF0ZWd5KSB7XG4gIGNvbnN0IHJvdXRlciA9IG5ldyBSb3V0ZXIoXG4gICAgICBudWxsLCB1cmxTZXJpYWxpemVyLCBjb250ZXh0cywgbG9jYXRpb24sIGluamVjdG9yLCBsb2FkZXIsIGNvbXBpbGVyLCBmbGF0dGVuKGNvbmZpZykpO1xuXG4gIGlmICh1cmxIYW5kbGluZ1N0cmF0ZWd5KSB7XG4gICAgcm91dGVyLnVybEhhbmRsaW5nU3RyYXRlZ3kgPSB1cmxIYW5kbGluZ1N0cmF0ZWd5O1xuICB9XG5cbiAgaWYgKHJvdXRlUmV1c2VTdHJhdGVneSkge1xuICAgIHJvdXRlci5yb3V0ZVJldXNlU3RyYXRlZ3kgPSByb3V0ZVJldXNlU3RyYXRlZ3k7XG4gIH1cblxuICBpZiAob3B0cy5lcnJvckhhbmRsZXIpIHtcbiAgICByb3V0ZXIuZXJyb3JIYW5kbGVyID0gb3B0cy5lcnJvckhhbmRsZXI7XG4gIH1cblxuICBpZiAob3B0cy5lbmFibGVUcmFjaW5nKSB7XG4gICAgY29uc3QgZG9tID0gZ2V0RE9NKCk7XG4gICAgcm91dGVyLmV2ZW50cy5zdWJzY3JpYmUoKGU6IFJvdXRlckV2ZW50KSA9PiB7XG4gICAgICBkb20ubG9nR3JvdXAoYFJvdXRlciBFdmVudDogJHsoPGFueT5lLmNvbnN0cnVjdG9yKS5uYW1lfWApO1xuICAgICAgZG9tLmxvZyhlLnRvU3RyaW5nKCkpO1xuICAgICAgZG9tLmxvZyhlKTtcbiAgICAgIGRvbS5sb2dHcm91cEVuZCgpO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKG9wdHMub25TYW1lVXJsTmF2aWdhdGlvbikge1xuICAgIHJvdXRlci5vblNhbWVVcmxOYXZpZ2F0aW9uID0gb3B0cy5vblNhbWVVcmxOYXZpZ2F0aW9uO1xuICB9XG5cbiAgaWYgKG9wdHMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSkge1xuICAgIHJvdXRlci5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5ID0gb3B0cy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5O1xuICB9XG5cbiAgcmV0dXJuIHJvdXRlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJvb3RSb3V0ZShyb3V0ZXI6IFJvdXRlcik6IEFjdGl2YXRlZFJvdXRlIHtcbiAgcmV0dXJuIHJvdXRlci5yb3V0ZXJTdGF0ZS5yb290O1xufVxuXG4vKipcbiAqIFRvIGluaXRpYWxpemUgdGhlIHJvdXRlciBwcm9wZXJseSB3ZSBuZWVkIHRvIGRvIGluIHR3byBzdGVwczpcbiAqXG4gKiBXZSBuZWVkIHRvIHN0YXJ0IHRoZSBuYXZpZ2F0aW9uIGluIGEgQVBQX0lOSVRJQUxJWkVSIHRvIGJsb2NrIHRoZSBib290c3RyYXAgaWZcbiAqIGEgcmVzb2x2ZXIgb3IgYSBndWFyZHMgZXhlY3V0ZXMgYXN5bmNocm9ub3VzbHkuIFNlY29uZCwgd2UgbmVlZCB0byBhY3R1YWxseSBydW5cbiAqIGFjdGl2YXRpb24gaW4gYSBCT09UU1RSQVBfTElTVEVORVIuIFdlIHV0aWxpemUgdGhlIGFmdGVyUHJlYWN0aXZhdGlvblxuICogaG9vayBwcm92aWRlZCBieSB0aGUgcm91dGVyIHRvIGRvIHRoYXQuXG4gKlxuICogVGhlIHJvdXRlciBuYXZpZ2F0aW9uIHN0YXJ0cywgcmVhY2hlcyB0aGUgcG9pbnQgd2hlbiBwcmVhY3RpdmF0aW9uIGlzIGRvbmUsIGFuZCB0aGVuXG4gKiBwYXVzZXMuIEl0IHdhaXRzIGZvciB0aGUgaG9vayB0byBiZSByZXNvbHZlZC4gV2UgdGhlbiByZXNvbHZlIGl0IG9ubHkgaW4gYSBib290c3RyYXAgbGlzdGVuZXIuXG4gKi9cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBSb3V0ZXJJbml0aWFsaXplciB7XG4gIHByaXZhdGUgaW5pdE5hdmlnYXRpb246IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSByZXN1bHRPZlByZWFjdGl2YXRpb25Eb25lID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGluamVjdG9yOiBJbmplY3Rvcikge31cblxuICBhcHBJbml0aWFsaXplcigpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IHA6IFByb21pc2U8YW55PiA9IHRoaXMuaW5qZWN0b3IuZ2V0KExPQ0FUSU9OX0lOSVRJQUxJWkVELCBQcm9taXNlLnJlc29sdmUobnVsbCkpO1xuICAgIHJldHVybiBwLnRoZW4oKCkgPT4ge1xuICAgICAgbGV0IHJlc29sdmU6IEZ1bmN0aW9uID0gbnVsbCAhO1xuICAgICAgY29uc3QgcmVzID0gbmV3IFByb21pc2UociA9PiByZXNvbHZlID0gcik7XG4gICAgICBjb25zdCByb3V0ZXIgPSB0aGlzLmluamVjdG9yLmdldChSb3V0ZXIpO1xuICAgICAgY29uc3Qgb3B0cyA9IHRoaXMuaW5qZWN0b3IuZ2V0KFJPVVRFUl9DT05GSUdVUkFUSU9OKTtcblxuICAgICAgaWYgKHRoaXMuaXNMZWdhY3lEaXNhYmxlZChvcHRzKSB8fCB0aGlzLmlzTGVnYWN5RW5hYmxlZChvcHRzKSkge1xuICAgICAgICByZXNvbHZlKHRydWUpO1xuXG4gICAgICB9IGVsc2UgaWYgKG9wdHMuaW5pdGlhbE5hdmlnYXRpb24gPT09ICdkaXNhYmxlZCcpIHtcbiAgICAgICAgcm91dGVyLnNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpO1xuICAgICAgICByZXNvbHZlKHRydWUpO1xuXG4gICAgICB9IGVsc2UgaWYgKG9wdHMuaW5pdGlhbE5hdmlnYXRpb24gPT09ICdlbmFibGVkJykge1xuICAgICAgICByb3V0ZXIuaG9va3MuYWZ0ZXJQcmVhY3RpdmF0aW9uID0gKCkgPT4ge1xuICAgICAgICAgIC8vIG9ubHkgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBzaG91bGQgYmUgZGVsYXllZFxuICAgICAgICAgIGlmICghdGhpcy5pbml0TmF2aWdhdGlvbikge1xuICAgICAgICAgICAgdGhpcy5pbml0TmF2aWdhdGlvbiA9IHRydWU7XG4gICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVzdWx0T2ZQcmVhY3RpdmF0aW9uRG9uZTtcblxuICAgICAgICAgICAgLy8gc3Vic2VxdWVudCBuYXZpZ2F0aW9ucyBzaG91bGQgbm90IGJlIGRlbGF5ZWRcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG9mIChudWxsKSBhcyBhbnk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByb3V0ZXIuaW5pdGlhbE5hdmlnYXRpb24oKTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGluaXRpYWxOYXZpZ2F0aW9uIG9wdGlvbnM6ICcke29wdHMuaW5pdGlhbE5hdmlnYXRpb259J2ApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzO1xuICAgIH0pO1xuICB9XG5cbiAgYm9vdHN0cmFwTGlzdGVuZXIoYm9vdHN0cmFwcGVkQ29tcG9uZW50UmVmOiBDb21wb25lbnRSZWY8YW55Pik6IHZvaWQge1xuICAgIGNvbnN0IG9wdHMgPSB0aGlzLmluamVjdG9yLmdldChST1VURVJfQ09ORklHVVJBVElPTik7XG4gICAgY29uc3QgcHJlbG9hZGVyID0gdGhpcy5pbmplY3Rvci5nZXQoUm91dGVyUHJlbG9hZGVyKTtcbiAgICBjb25zdCByb3V0ZXJTY3JvbGxlciA9IHRoaXMuaW5qZWN0b3IuZ2V0KFJvdXRlclNjcm9sbGVyKTtcbiAgICBjb25zdCByb3V0ZXIgPSB0aGlzLmluamVjdG9yLmdldChSb3V0ZXIpO1xuICAgIGNvbnN0IHJlZiA9IHRoaXMuaW5qZWN0b3IuZ2V0PEFwcGxpY2F0aW9uUmVmPihBcHBsaWNhdGlvblJlZik7XG5cbiAgICBpZiAoYm9vdHN0cmFwcGVkQ29tcG9uZW50UmVmICE9PSByZWYuY29tcG9uZW50c1swXSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzTGVnYWN5RW5hYmxlZChvcHRzKSkge1xuICAgICAgcm91dGVyLmluaXRpYWxOYXZpZ2F0aW9uKCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzTGVnYWN5RGlzYWJsZWQob3B0cykpIHtcbiAgICAgIHJvdXRlci5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICB9XG5cbiAgICBwcmVsb2FkZXIuc2V0VXBQcmVsb2FkaW5nKCk7XG4gICAgcm91dGVyU2Nyb2xsZXIuaW5pdCgpO1xuICAgIHJvdXRlci5yZXNldFJvb3RDb21wb25lbnRUeXBlKHJlZi5jb21wb25lbnRUeXBlc1swXSk7XG4gICAgdGhpcy5yZXN1bHRPZlByZWFjdGl2YXRpb25Eb25lLm5leHQobnVsbCAhKTtcbiAgICB0aGlzLnJlc3VsdE9mUHJlYWN0aXZhdGlvbkRvbmUuY29tcGxldGUoKTtcbiAgfVxuXG4gIHByaXZhdGUgaXNMZWdhY3lFbmFibGVkKG9wdHM6IEV4dHJhT3B0aW9ucyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBvcHRzLmluaXRpYWxOYXZpZ2F0aW9uID09PSAnbGVnYWN5X2VuYWJsZWQnIHx8IG9wdHMuaW5pdGlhbE5hdmlnYXRpb24gPT09IHRydWUgfHxcbiAgICAgICAgb3B0cy5pbml0aWFsTmF2aWdhdGlvbiA9PT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBpc0xlZ2FjeURpc2FibGVkKG9wdHM6IEV4dHJhT3B0aW9ucyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBvcHRzLmluaXRpYWxOYXZpZ2F0aW9uID09PSAnbGVnYWN5X2Rpc2FibGVkJyB8fCBvcHRzLmluaXRpYWxOYXZpZ2F0aW9uID09PSBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBwSW5pdGlhbGl6ZXIocjogUm91dGVySW5pdGlhbGl6ZXIpIHtcbiAgcmV0dXJuIHIuYXBwSW5pdGlhbGl6ZXIuYmluZChyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEJvb3RzdHJhcExpc3RlbmVyKHI6IFJvdXRlckluaXRpYWxpemVyKSB7XG4gIHJldHVybiByLmJvb3RzdHJhcExpc3RlbmVyLmJpbmQocik7XG59XG5cbi8qKlxuICogQSB0b2tlbiBmb3IgdGhlIHJvdXRlciBpbml0aWFsaXplciB0aGF0IHdpbGwgYmUgY2FsbGVkIGFmdGVyIHRoZSBhcHAgaXMgYm9vdHN0cmFwcGVkLlxuICpcbiAqIEBleHBlcmltZW50YWxcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9JTklUSUFMSVpFUiA9XG4gICAgbmV3IEluamVjdGlvblRva2VuPChjb21wUmVmOiBDb21wb25lbnRSZWY8YW55PikgPT4gdm9pZD4oJ1JvdXRlciBJbml0aWFsaXplcicpO1xuXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZVJvdXRlckluaXRpYWxpemVyKCkge1xuICByZXR1cm4gW1xuICAgIFJvdXRlckluaXRpYWxpemVyLFxuICAgIHtcbiAgICAgIHByb3ZpZGU6IEFQUF9JTklUSUFMSVpFUixcbiAgICAgIG11bHRpOiB0cnVlLFxuICAgICAgdXNlRmFjdG9yeTogZ2V0QXBwSW5pdGlhbGl6ZXIsXG4gICAgICBkZXBzOiBbUm91dGVySW5pdGlhbGl6ZXJdXG4gICAgfSxcbiAgICB7cHJvdmlkZTogUk9VVEVSX0lOSVRJQUxJWkVSLCB1c2VGYWN0b3J5OiBnZXRCb290c3RyYXBMaXN0ZW5lciwgZGVwczogW1JvdXRlckluaXRpYWxpemVyXX0sXG4gICAge3Byb3ZpZGU6IEFQUF9CT09UU1RSQVBfTElTVEVORVIsIG11bHRpOiB0cnVlLCB1c2VFeGlzdGluZzogUk9VVEVSX0lOSVRJQUxJWkVSfSxcbiAgXTtcbn1cbiJdfQ==