/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
import { APP_BASE_HREF, HashLocationStrategy, LOCATION_INITIALIZED, Location, LocationStrategy, PathLocationStrategy, PlatformLocation, ViewportScroller } from '@angular/common';
import { ANALYZE_FOR_ENTRY_COMPONENTS, APP_BOOTSTRAP_LISTENER, APP_INITIALIZER, ApplicationRef, Compiler, Inject, Injectable, InjectionToken, Injector, NgModule, NgModuleFactoryLoader, NgProbeToken, Optional, SkipSelf, SystemJsNgModuleLoader } from '@angular/core';
import { ɵgetDOM as getDOM } from '@angular/platform-browser';
import { Subject, of } from 'rxjs';
import { EmptyOutletComponent } from './components/empty_outlet';
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
var ROUTER_DIRECTIVES = [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive, EmptyOutletComponent];
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
    RouterModule_1 = RouterModule;
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
     * * `paramsInheritanceStrategy` defines how the router merges params, data and resolved data
     * from parent to child routes.
     */
    RouterModule.forRoot = function (routes, config) {
        return {
            ngModule: RouterModule_1,
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
        return { ngModule: RouterModule_1, providers: [provideRoutes(routes)] };
    };
    var RouterModule_1;
    RouterModule = RouterModule_1 = tslib_1.__decorate([
        NgModule({
            declarations: ROUTER_DIRECTIVES,
            exports: ROUTER_DIRECTIVES,
            entryComponents: [EmptyOutletComponent]
        }),
        tslib_1.__param(0, Optional()), tslib_1.__param(0, Inject(ROUTER_FORROOT_GUARD)), tslib_1.__param(1, Optional()),
        tslib_1.__metadata("design:paramtypes", [Object, Router])
    ], RouterModule);
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
    if (opts.malformedUriErrorHandler) {
        router.malformedUriErrorHandler = opts.malformedUriErrorHandler;
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
    if (opts.urlUpdateStrategy) {
        router.urlUpdateStrategy = opts.urlUpdateStrategy;
    }
    if (opts.relativeLinkResolution) {
        router.relativeLinkResolution = opts.relativeLinkResolution;
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
    RouterInitializer = tslib_1.__decorate([
        Injectable(),
        tslib_1.__metadata("design:paramtypes", [Injector])
    ], RouterInitializer);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX21vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7O0FBRUgsT0FBTyxFQUFDLGFBQWEsRUFBRSxvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUNoTCxPQUFPLEVBQUMsNEJBQTRCLEVBQUUsc0JBQXNCLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQWdCLE1BQU0sRUFBRSxVQUFVLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBdUIsUUFBUSxFQUFFLHFCQUFxQixFQUFFLFlBQVksRUFBRSxRQUFRLEVBQVksUUFBUSxFQUFFLHNCQUFzQixFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3BULE9BQU8sRUFBQyxPQUFPLElBQUksTUFBTSxFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFDNUQsT0FBTyxFQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFFbEMsT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFFL0QsT0FBTyxFQUFDLFVBQVUsRUFBRSxrQkFBa0IsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQ3hFLE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLGlDQUFpQyxDQUFDO0FBQ2pFLE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSw0QkFBNEIsQ0FBQztBQUV4RCxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUMxRCxPQUFPLEVBQWUsTUFBTSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzlDLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSx3QkFB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QyxDQUFDO0lBRU8sNENBQWdCLEdBQXhCLFVBQXlCLElBQWtCO1FBQ3pDLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixLQUFLLGlCQUFpQixJQUFJLElBQUksQ0FBQyxpQkFBaUIsS0FBSyxLQUFLLENBQUM7SUFDMUYsQ0FBQztJQTNFVSxpQkFBaUI7UUFEN0IsVUFBVSxFQUFFO2lEQUttQixRQUFRO09BSjNCLGlCQUFpQixDQTRFN0I7SUFBRCx3QkFBQztDQUFBLEFBNUVELElBNEVDO1NBNUVZLGlCQUFpQjtBQThFOUIsTUFBTSw0QkFBNEIsQ0FBb0I7SUFDcEQsT0FBTyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQyxDQUFDO0FBRUQsTUFBTSwrQkFBK0IsQ0FBb0I7SUFDdkQsT0FBTyxDQUFDLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLElBQU0sa0JBQWtCLEdBQzNCLElBQUksY0FBYyxDQUF1QyxvQkFBb0IsQ0FBQyxDQUFDO0FBRW5GLE1BQU07SUFDSixPQUFPO1FBQ0wsaUJBQWlCO1FBQ2pCO1lBQ0UsT0FBTyxFQUFFLGVBQWU7WUFDeEIsS0FBSyxFQUFFLElBQUk7WUFDWCxVQUFVLEVBQUUsaUJBQWlCO1lBQzdCLElBQUksRUFBRSxDQUFDLGlCQUFpQixDQUFDO1NBQzFCO1FBQ0QsRUFBQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxFQUFFLG9CQUFvQixFQUFFLElBQUksRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUM7UUFDMUYsRUFBQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUM7S0FDaEYsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVBQX0JBU0VfSFJFRiwgSGFzaExvY2F0aW9uU3RyYXRlZ3ksIExPQ0FUSU9OX0lOSVRJQUxJWkVELCBMb2NhdGlvbiwgTG9jYXRpb25TdHJhdGVneSwgUGF0aExvY2F0aW9uU3RyYXRlZ3ksIFBsYXRmb3JtTG9jYXRpb24sIFZpZXdwb3J0U2Nyb2xsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0FOQUxZWkVfRk9SX0VOVFJZX0NPTVBPTkVOVFMsIEFQUF9CT09UU1RSQVBfTElTVEVORVIsIEFQUF9JTklUSUFMSVpFUiwgQXBwbGljYXRpb25SZWYsIENvbXBpbGVyLCBDb21wb25lbnRSZWYsIEluamVjdCwgSW5qZWN0YWJsZSwgSW5qZWN0aW9uVG9rZW4sIEluamVjdG9yLCBNb2R1bGVXaXRoUHJvdmlkZXJzLCBOZ01vZHVsZSwgTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBOZ1Byb2JlVG9rZW4sIE9wdGlvbmFsLCBQcm92aWRlciwgU2tpcFNlbGYsIFN5c3RlbUpzTmdNb2R1bGVMb2FkZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHvJtWdldERPTSBhcyBnZXRET019IGZyb20gJ0Bhbmd1bGFyL3BsYXRmb3JtLWJyb3dzZXInO1xuaW1wb3J0IHtTdWJqZWN0LCBvZiB9IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge0VtcHR5T3V0bGV0Q29tcG9uZW50fSBmcm9tICcuL2NvbXBvbmVudHMvZW1wdHlfb3V0bGV0JztcbmltcG9ydCB7Um91dGUsIFJvdXRlc30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtSb3V0ZXJMaW5rLCBSb3V0ZXJMaW5rV2l0aEhyZWZ9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfbGluayc7XG5pbXBvcnQge1JvdXRlckxpbmtBY3RpdmV9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfbGlua19hY3RpdmUnO1xuaW1wb3J0IHtSb3V0ZXJPdXRsZXR9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0JztcbmltcG9ydCB7Um91dGVyRXZlbnR9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7Um91dGVSZXVzZVN0cmF0ZWd5fSBmcm9tICcuL3JvdXRlX3JldXNlX3N0cmF0ZWd5JztcbmltcG9ydCB7RXJyb3JIYW5kbGVyLCBSb3V0ZXJ9IGZyb20gJy4vcm91dGVyJztcbmltcG9ydCB7Uk9VVEVTfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0c30gZnJvbSAnLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtOb1ByZWxvYWRpbmcsIFByZWxvYWRBbGxNb2R1bGVzLCBQcmVsb2FkaW5nU3RyYXRlZ3ksIFJvdXRlclByZWxvYWRlcn0gZnJvbSAnLi9yb3V0ZXJfcHJlbG9hZGVyJztcbmltcG9ydCB7Um91dGVyU2Nyb2xsZXJ9IGZyb20gJy4vcm91dGVyX3Njcm9sbGVyJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGV9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7VXJsSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi91cmxfaGFuZGxpbmdfc3RyYXRlZ3knO1xuaW1wb3J0IHtEZWZhdWx0VXJsU2VyaWFsaXplciwgVXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge2ZsYXR0ZW59IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5cblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIENvbnRhaW5zIGEgbGlzdCBvZiBkaXJlY3RpdmVzXG4gKlxuICpcbiAqL1xuY29uc3QgUk9VVEVSX0RJUkVDVElWRVMgPVxuICAgIFtSb3V0ZXJPdXRsZXQsIFJvdXRlckxpbmssIFJvdXRlckxpbmtXaXRoSHJlZiwgUm91dGVyTGlua0FjdGl2ZSwgRW1wdHlPdXRsZXRDb21wb25lbnRdO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIElzIHVzZWQgaW4gREkgdG8gY29uZmlndXJlIHRoZSByb3V0ZXIuXG4gKlxuICpcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9DT05GSUdVUkFUSU9OID0gbmV3IEluamVjdGlvblRva2VuPEV4dHJhT3B0aW9ucz4oJ1JPVVRFUl9DT05GSUdVUkFUSU9OJyk7XG5cbi8qKlxuICogQGRvY3NOb3RSZXF1aXJlZFxuICovXG5leHBvcnQgY29uc3QgUk9VVEVSX0ZPUlJPT1RfR1VBUkQgPSBuZXcgSW5qZWN0aW9uVG9rZW48dm9pZD4oJ1JPVVRFUl9GT1JST09UX0dVQVJEJyk7XG5cbmV4cG9ydCBjb25zdCBST1VURVJfUFJPVklERVJTOiBQcm92aWRlcltdID0gW1xuICBMb2NhdGlvbixcbiAge3Byb3ZpZGU6IFVybFNlcmlhbGl6ZXIsIHVzZUNsYXNzOiBEZWZhdWx0VXJsU2VyaWFsaXplcn0sXG4gIHtcbiAgICBwcm92aWRlOiBSb3V0ZXIsXG4gICAgdXNlRmFjdG9yeTogc2V0dXBSb3V0ZXIsXG4gICAgZGVwczogW1xuICAgICAgQXBwbGljYXRpb25SZWYsIFVybFNlcmlhbGl6ZXIsIENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIExvY2F0aW9uLCBJbmplY3RvcixcbiAgICAgIE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgQ29tcGlsZXIsIFJPVVRFUywgUk9VVEVSX0NPTkZJR1VSQVRJT04sXG4gICAgICBbVXJsSGFuZGxpbmdTdHJhdGVneSwgbmV3IE9wdGlvbmFsKCldLCBbUm91dGVSZXVzZVN0cmF0ZWd5LCBuZXcgT3B0aW9uYWwoKV1cbiAgICBdXG4gIH0sXG4gIENoaWxkcmVuT3V0bGV0Q29udGV4dHMsXG4gIHtwcm92aWRlOiBBY3RpdmF0ZWRSb3V0ZSwgdXNlRmFjdG9yeTogcm9vdFJvdXRlLCBkZXBzOiBbUm91dGVyXX0sXG4gIHtwcm92aWRlOiBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIHVzZUNsYXNzOiBTeXN0ZW1Kc05nTW9kdWxlTG9hZGVyfSxcbiAgUm91dGVyUHJlbG9hZGVyLFxuICBOb1ByZWxvYWRpbmcsXG4gIFByZWxvYWRBbGxNb2R1bGVzLFxuICB7cHJvdmlkZTogUk9VVEVSX0NPTkZJR1VSQVRJT04sIHVzZVZhbHVlOiB7ZW5hYmxlVHJhY2luZzogZmFsc2V9fSxcbl07XG5cbmV4cG9ydCBmdW5jdGlvbiByb3V0ZXJOZ1Byb2JlVG9rZW4oKSB7XG4gIHJldHVybiBuZXcgTmdQcm9iZVRva2VuKCdSb3V0ZXInLCBSb3V0ZXIpO1xufVxuXG4vKipcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogUm91dGVyTW9kdWxlIGNhbiBiZSBpbXBvcnRlZCBtdWx0aXBsZSB0aW1lczogb25jZSBwZXIgbGF6aWx5LWxvYWRlZCBidW5kbGUuXG4gKiBTaW5jZSB0aGUgcm91dGVyIGRlYWxzIHdpdGggYSBnbG9iYWwgc2hhcmVkIHJlc291cmNlLS1sb2NhdGlvbiwgd2UgY2Fubm90IGhhdmVcbiAqIG1vcmUgdGhhbiBvbmUgcm91dGVyIHNlcnZpY2UgYWN0aXZlLlxuICpcbiAqIFRoYXQgaXMgd2h5IHRoZXJlIGFyZSB0d28gd2F5cyB0byBjcmVhdGUgdGhlIG1vZHVsZTogYFJvdXRlck1vZHVsZS5mb3JSb290YCBhbmRcbiAqIGBSb3V0ZXJNb2R1bGUuZm9yQ2hpbGRgLlxuICpcbiAqICogYGZvclJvb3RgIGNyZWF0ZXMgYSBtb2R1bGUgdGhhdCBjb250YWlucyBhbGwgdGhlIGRpcmVjdGl2ZXMsIHRoZSBnaXZlbiByb3V0ZXMsIGFuZCB0aGUgcm91dGVyXG4gKiAgIHNlcnZpY2UgaXRzZWxmLlxuICogKiBgZm9yQ2hpbGRgIGNyZWF0ZXMgYSBtb2R1bGUgdGhhdCBjb250YWlucyBhbGwgdGhlIGRpcmVjdGl2ZXMgYW5kIHRoZSBnaXZlbiByb3V0ZXMsIGJ1dCBkb2VzIG5vdFxuICogICBpbmNsdWRlIHRoZSByb3V0ZXIgc2VydmljZS5cbiAqXG4gKiBXaGVuIHJlZ2lzdGVyZWQgYXQgdGhlIHJvb3QsIHRoZSBtb2R1bGUgc2hvdWxkIGJlIHVzZWQgYXMgZm9sbG93c1xuICpcbiAqIGBgYFxuICogQE5nTW9kdWxlKHtcbiAqICAgaW1wb3J0czogW1JvdXRlck1vZHVsZS5mb3JSb290KFJPVVRFUyldXG4gKiB9KVxuICogY2xhc3MgTXlOZ01vZHVsZSB7fVxuICogYGBgXG4gKlxuICogRm9yIHN1Ym1vZHVsZXMgYW5kIGxhenkgbG9hZGVkIHN1Ym1vZHVsZXMgdGhlIG1vZHVsZSBzaG91bGQgYmUgdXNlZCBhcyBmb2xsb3dzOlxuICpcbiAqIGBgYFxuICogQE5nTW9kdWxlKHtcbiAqICAgaW1wb3J0czogW1JvdXRlck1vZHVsZS5mb3JDaGlsZChST1VURVMpXVxuICogfSlcbiAqIGNsYXNzIE15TmdNb2R1bGUge31cbiAqIGBgYFxuICpcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEFkZHMgcm91dGVyIGRpcmVjdGl2ZXMgYW5kIHByb3ZpZGVycy5cbiAqXG4gKiBNYW5hZ2luZyBzdGF0ZSB0cmFuc2l0aW9ucyBpcyBvbmUgb2YgdGhlIGhhcmRlc3QgcGFydHMgb2YgYnVpbGRpbmcgYXBwbGljYXRpb25zLiBUaGlzIGlzXG4gKiBlc3BlY2lhbGx5IHRydWUgb24gdGhlIHdlYiwgd2hlcmUgeW91IGFsc28gbmVlZCB0byBlbnN1cmUgdGhhdCB0aGUgc3RhdGUgaXMgcmVmbGVjdGVkIGluIHRoZSBVUkwuXG4gKiBJbiBhZGRpdGlvbiwgd2Ugb2Z0ZW4gd2FudCB0byBzcGxpdCBhcHBsaWNhdGlvbnMgaW50byBtdWx0aXBsZSBidW5kbGVzIGFuZCBsb2FkIHRoZW0gb24gZGVtYW5kLlxuICogRG9pbmcgdGhpcyB0cmFuc3BhcmVudGx5IGlzIG5vdCB0cml2aWFsLlxuICpcbiAqIFRoZSBBbmd1bGFyIHJvdXRlciBzb2x2ZXMgdGhlc2UgcHJvYmxlbXMuIFVzaW5nIHRoZSByb3V0ZXIsIHlvdSBjYW4gZGVjbGFyYXRpdmVseSBzcGVjaWZ5XG4gKiBhcHBsaWNhdGlvbiBzdGF0ZXMsIG1hbmFnZSBzdGF0ZSB0cmFuc2l0aW9ucyB3aGlsZSB0YWtpbmcgY2FyZSBvZiB0aGUgVVJMLCBhbmQgbG9hZCBidW5kbGVzIG9uXG4gKiBkZW1hbmQuXG4gKlxuICogW1JlYWQgdGhpcyBkZXZlbG9wZXIgZ3VpZGVdKGh0dHBzOi8vYW5ndWxhci5pby9kb2NzL3RzL2xhdGVzdC9ndWlkZS9yb3V0ZXIuaHRtbCkgdG8gZ2V0IGFuXG4gKiBvdmVydmlldyBvZiBob3cgdGhlIHJvdXRlciBzaG91bGQgYmUgdXNlZC5cbiAqXG4gKlxuICovXG5ATmdNb2R1bGUoe1xuICBkZWNsYXJhdGlvbnM6IFJPVVRFUl9ESVJFQ1RJVkVTLFxuICBleHBvcnRzOiBST1VURVJfRElSRUNUSVZFUyxcbiAgZW50cnlDb21wb25lbnRzOiBbRW1wdHlPdXRsZXRDb21wb25lbnRdXG59KVxuZXhwb3J0IGNsYXNzIFJvdXRlck1vZHVsZSB7XG4gIC8vIE5vdGU6IFdlIGFyZSBpbmplY3RpbmcgdGhlIFJvdXRlciBzbyBpdCBnZXRzIGNyZWF0ZWQgZWFnZXJseS4uLlxuICBjb25zdHJ1Y3RvcihAT3B0aW9uYWwoKSBASW5qZWN0KFJPVVRFUl9GT1JST09UX0dVQVJEKSBndWFyZDogYW55LCBAT3B0aW9uYWwoKSByb3V0ZXI6IFJvdXRlcikge31cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG1vZHVsZSB3aXRoIGFsbCB0aGUgcm91dGVyIHByb3ZpZGVycyBhbmQgZGlyZWN0aXZlcy4gSXQgYWxzbyBvcHRpb25hbGx5IHNldHMgdXAgYW5cbiAgICogYXBwbGljYXRpb24gbGlzdGVuZXIgdG8gcGVyZm9ybSBhbiBpbml0aWFsIG5hdmlnYXRpb24uXG4gICAqXG4gICAqIE9wdGlvbnMgKHNlZSBgRXh0cmFPcHRpb25zYCk6XG4gICAqICogYGVuYWJsZVRyYWNpbmdgIG1ha2VzIHRoZSByb3V0ZXIgbG9nIGFsbCBpdHMgaW50ZXJuYWwgZXZlbnRzIHRvIHRoZSBjb25zb2xlLlxuICAgKiAqIGB1c2VIYXNoYCBlbmFibGVzIHRoZSBsb2NhdGlvbiBzdHJhdGVneSB0aGF0IHVzZXMgdGhlIFVSTCBmcmFnbWVudCBpbnN0ZWFkIG9mIHRoZSBoaXN0b3J5XG4gICAqIEFQSS5cbiAgICogKiBgaW5pdGlhbE5hdmlnYXRpb25gIGRpc2FibGVzIHRoZSBpbml0aWFsIG5hdmlnYXRpb24uXG4gICAqICogYGVycm9ySGFuZGxlcmAgcHJvdmlkZXMgYSBjdXN0b20gZXJyb3IgaGFuZGxlci5cbiAgICogKiBgcHJlbG9hZGluZ1N0cmF0ZWd5YCBjb25maWd1cmVzIGEgcHJlbG9hZGluZyBzdHJhdGVneSAoc2VlIGBQcmVsb2FkQWxsTW9kdWxlc2ApLlxuICAgKiAqIGBvblNhbWVVcmxOYXZpZ2F0aW9uYCBjb25maWd1cmVzIGhvdyB0aGUgcm91dGVyIGhhbmRsZXMgbmF2aWdhdGlvbiB0byB0aGUgY3VycmVudCBVUkwuIFNlZVxuICAgKiBgRXh0cmFPcHRpb25zYCBmb3IgbW9yZSBkZXRhaWxzLlxuICAgKiAqIGBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5YCBkZWZpbmVzIGhvdyB0aGUgcm91dGVyIG1lcmdlcyBwYXJhbXMsIGRhdGEgYW5kIHJlc29sdmVkIGRhdGFcbiAgICogZnJvbSBwYXJlbnQgdG8gY2hpbGQgcm91dGVzLlxuICAgKi9cbiAgc3RhdGljIGZvclJvb3Qocm91dGVzOiBSb3V0ZXMsIGNvbmZpZz86IEV4dHJhT3B0aW9ucyk6IE1vZHVsZVdpdGhQcm92aWRlcnM8Um91dGVyTW9kdWxlPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5nTW9kdWxlOiBSb3V0ZXJNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFtcbiAgICAgICAgUk9VVEVSX1BST1ZJREVSUyxcbiAgICAgICAgcHJvdmlkZVJvdXRlcyhyb3V0ZXMpLFxuICAgICAgICB7XG4gICAgICAgICAgcHJvdmlkZTogUk9VVEVSX0ZPUlJPT1RfR1VBUkQsXG4gICAgICAgICAgdXNlRmFjdG9yeTogcHJvdmlkZUZvclJvb3RHdWFyZCxcbiAgICAgICAgICBkZXBzOiBbW1JvdXRlciwgbmV3IE9wdGlvbmFsKCksIG5ldyBTa2lwU2VsZigpXV1cbiAgICAgICAgfSxcbiAgICAgICAge3Byb3ZpZGU6IFJPVVRFUl9DT05GSUdVUkFUSU9OLCB1c2VWYWx1ZTogY29uZmlnID8gY29uZmlnIDoge319LFxuICAgICAgICB7XG4gICAgICAgICAgcHJvdmlkZTogTG9jYXRpb25TdHJhdGVneSxcbiAgICAgICAgICB1c2VGYWN0b3J5OiBwcm92aWRlTG9jYXRpb25TdHJhdGVneSxcbiAgICAgICAgICBkZXBzOiBbXG4gICAgICAgICAgICBQbGF0Zm9ybUxvY2F0aW9uLCBbbmV3IEluamVjdChBUFBfQkFTRV9IUkVGKSwgbmV3IE9wdGlvbmFsKCldLCBST1VURVJfQ09ORklHVVJBVElPTlxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHByb3ZpZGU6IFJvdXRlclNjcm9sbGVyLFxuICAgICAgICAgIHVzZUZhY3Rvcnk6IGNyZWF0ZVJvdXRlclNjcm9sbGVyLFxuICAgICAgICAgIGRlcHM6IFtSb3V0ZXIsIFZpZXdwb3J0U2Nyb2xsZXIsIFJPVVRFUl9DT05GSUdVUkFUSU9OXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgcHJvdmlkZTogUHJlbG9hZGluZ1N0cmF0ZWd5LFxuICAgICAgICAgIHVzZUV4aXN0aW5nOiBjb25maWcgJiYgY29uZmlnLnByZWxvYWRpbmdTdHJhdGVneSA/IGNvbmZpZy5wcmVsb2FkaW5nU3RyYXRlZ3kgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE5vUHJlbG9hZGluZ1xuICAgICAgICB9LFxuICAgICAgICB7cHJvdmlkZTogTmdQcm9iZVRva2VuLCBtdWx0aTogdHJ1ZSwgdXNlRmFjdG9yeTogcm91dGVyTmdQcm9iZVRva2VufSxcbiAgICAgICAgcHJvdmlkZVJvdXRlckluaXRpYWxpemVyKCksXG4gICAgICBdLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG1vZHVsZSB3aXRoIGFsbCB0aGUgcm91dGVyIGRpcmVjdGl2ZXMgYW5kIGEgcHJvdmlkZXIgcmVnaXN0ZXJpbmcgcm91dGVzLlxuICAgKi9cbiAgc3RhdGljIGZvckNoaWxkKHJvdXRlczogUm91dGVzKTogTW9kdWxlV2l0aFByb3ZpZGVyczxSb3V0ZXJNb2R1bGU+IHtcbiAgICByZXR1cm4ge25nTW9kdWxlOiBSb3V0ZXJNb2R1bGUsIHByb3ZpZGVyczogW3Byb3ZpZGVSb3V0ZXMocm91dGVzKV19O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSb3V0ZXJTY3JvbGxlcihcbiAgICByb3V0ZXI6IFJvdXRlciwgdmlld3BvcnRTY3JvbGxlcjogVmlld3BvcnRTY3JvbGxlciwgY29uZmlnOiBFeHRyYU9wdGlvbnMpOiBSb3V0ZXJTY3JvbGxlciB7XG4gIGlmIChjb25maWcuc2Nyb2xsT2Zmc2V0KSB7XG4gICAgdmlld3BvcnRTY3JvbGxlci5zZXRPZmZzZXQoY29uZmlnLnNjcm9sbE9mZnNldCk7XG4gIH1cbiAgcmV0dXJuIG5ldyBSb3V0ZXJTY3JvbGxlcihyb3V0ZXIsIHZpZXdwb3J0U2Nyb2xsZXIsIGNvbmZpZyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcm92aWRlTG9jYXRpb25TdHJhdGVneShcbiAgICBwbGF0Zm9ybUxvY2F0aW9uU3RyYXRlZ3k6IFBsYXRmb3JtTG9jYXRpb24sIGJhc2VIcmVmOiBzdHJpbmcsIG9wdGlvbnM6IEV4dHJhT3B0aW9ucyA9IHt9KSB7XG4gIHJldHVybiBvcHRpb25zLnVzZUhhc2ggPyBuZXcgSGFzaExvY2F0aW9uU3RyYXRlZ3kocGxhdGZvcm1Mb2NhdGlvblN0cmF0ZWd5LCBiYXNlSHJlZikgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFBhdGhMb2NhdGlvblN0cmF0ZWd5KHBsYXRmb3JtTG9jYXRpb25TdHJhdGVneSwgYmFzZUhyZWYpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZUZvclJvb3RHdWFyZChyb3V0ZXI6IFJvdXRlcik6IGFueSB7XG4gIGlmIChyb3V0ZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBSb3V0ZXJNb2R1bGUuZm9yUm9vdCgpIGNhbGxlZCB0d2ljZS4gTGF6eSBsb2FkZWQgbW9kdWxlcyBzaG91bGQgdXNlIFJvdXRlck1vZHVsZS5mb3JDaGlsZCgpIGluc3RlYWQuYCk7XG4gIH1cbiAgcmV0dXJuICdndWFyZGVkJztcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZWdpc3RlcnMgcm91dGVzLlxuICpcbiAqICMjIyBFeGFtcGxlXG4gKlxuICogYGBgXG4gKiBATmdNb2R1bGUoe1xuICogICBpbXBvcnRzOiBbUm91dGVyTW9kdWxlLmZvckNoaWxkKFJPVVRFUyldLFxuICogICBwcm92aWRlcnM6IFtwcm92aWRlUm91dGVzKEVYVFJBX1JPVVRFUyldXG4gKiB9KVxuICogY2xhc3MgTXlOZ01vZHVsZSB7fVxuICogYGBgXG4gKlxuICpcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVSb3V0ZXMocm91dGVzOiBSb3V0ZXMpOiBhbnkge1xuICByZXR1cm4gW1xuICAgIHtwcm92aWRlOiBBTkFMWVpFX0ZPUl9FTlRSWV9DT01QT05FTlRTLCBtdWx0aTogdHJ1ZSwgdXNlVmFsdWU6IHJvdXRlc30sXG4gICAge3Byb3ZpZGU6IFJPVVRFUywgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiByb3V0ZXN9LFxuICBdO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgYW4gb3B0aW9uIHRvIGNvbmZpZ3VyZSB3aGVuIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgcGVyZm9ybWVkLlxuICpcbiAqICogJ2VuYWJsZWQnIC0gdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBzdGFydHMgYmVmb3JlIHRoZSByb290IGNvbXBvbmVudCBpcyBjcmVhdGVkLlxuICogVGhlIGJvb3RzdHJhcCBpcyBibG9ja2VkIHVudGlsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgY29tcGxldGUuXG4gKiAqICdkaXNhYmxlZCcgLSB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIGlzIG5vdCBwZXJmb3JtZWQuIFRoZSBsb2NhdGlvbiBsaXN0ZW5lciBpcyBzZXQgdXAgYmVmb3JlXG4gKiB0aGUgcm9vdCBjb21wb25lbnQgZ2V0cyBjcmVhdGVkLlxuICogKiAnbGVnYWN5X2VuYWJsZWQnLSB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIHN0YXJ0cyBhZnRlciB0aGUgcm9vdCBjb21wb25lbnQgaGFzIGJlZW4gY3JlYXRlZC5cbiAqIFRoZSBib290c3RyYXAgaXMgbm90IGJsb2NrZWQgdW50aWwgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBpcyBjb21wbGV0ZS4gQGRlcHJlY2F0ZWRcbiAqICogJ2xlZ2FjeV9kaXNhYmxlZCctIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgbm90IHBlcmZvcm1lZC4gVGhlIGxvY2F0aW9uIGxpc3RlbmVyIGlzIHNldCB1cFxuICogYWZ0ZXIgQGRlcHJlY2F0ZWRcbiAqIHRoZSByb290IGNvbXBvbmVudCBnZXRzIGNyZWF0ZWQuXG4gKiAqIGB0cnVlYCAtIHNhbWUgYXMgJ2xlZ2FjeV9lbmFibGVkJy4gQGRlcHJlY2F0ZWQgc2luY2UgdjRcbiAqICogYGZhbHNlYCAtIHNhbWUgYXMgJ2xlZ2FjeV9kaXNhYmxlZCcuIEBkZXByZWNhdGVkIHNpbmNlIHY0XG4gKlxuICogVGhlICdlbmFibGVkJyBvcHRpb24gc2hvdWxkIGJlIHVzZWQgZm9yIGFwcGxpY2F0aW9ucyB1bmxlc3MgdGhlcmUgaXMgYSByZWFzb24gdG8gaGF2ZVxuICogbW9yZSBjb250cm9sIG92ZXIgd2hlbiB0aGUgcm91dGVyIHN0YXJ0cyBpdHMgaW5pdGlhbCBuYXZpZ2F0aW9uIGR1ZSB0byBzb21lIGNvbXBsZXhcbiAqIGluaXRpYWxpemF0aW9uIGxvZ2ljLiBJbiB0aGlzIGNhc2UsICdkaXNhYmxlZCcgc2hvdWxkIGJlIHVzZWQuXG4gKlxuICogVGhlICdsZWdhY3lfZW5hYmxlZCcgYW5kICdsZWdhY3lfZGlzYWJsZWQnIHNob3VsZCBub3QgYmUgdXNlZCBmb3IgbmV3IGFwcGxpY2F0aW9ucy5cbiAqXG4gKiBAZXhwZXJpbWVudGFsXG4gKi9cbmV4cG9ydCB0eXBlIEluaXRpYWxOYXZpZ2F0aW9uID1cbiAgICB0cnVlIHwgZmFsc2UgfCAnZW5hYmxlZCcgfCAnZGlzYWJsZWQnIHwgJ2xlZ2FjeV9lbmFibGVkJyB8ICdsZWdhY3lfZGlzYWJsZWQnO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgb3B0aW9ucyB0byBjb25maWd1cmUgdGhlIHJvdXRlci5cbiAqXG4gKlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEV4dHJhT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBNYWtlcyB0aGUgcm91dGVyIGxvZyBhbGwgaXRzIGludGVybmFsIGV2ZW50cyB0byB0aGUgY29uc29sZS5cbiAgICovXG4gIGVuYWJsZVRyYWNpbmc/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBFbmFibGVzIHRoZSBsb2NhdGlvbiBzdHJhdGVneSB0aGF0IHVzZXMgdGhlIFVSTCBmcmFnbWVudCBpbnN0ZWFkIG9mIHRoZSBoaXN0b3J5IEFQSS5cbiAgICovXG4gIHVzZUhhc2g/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBEaXNhYmxlcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICAgKi9cbiAgaW5pdGlhbE5hdmlnYXRpb24/OiBJbml0aWFsTmF2aWdhdGlvbjtcblxuICAvKipcbiAgICogQSBjdXN0b20gZXJyb3IgaGFuZGxlci5cbiAgICovXG4gIGVycm9ySGFuZGxlcj86IEVycm9ySGFuZGxlcjtcblxuICAvKipcbiAgICogQ29uZmlndXJlcyBhIHByZWxvYWRpbmcgc3RyYXRlZ3kuIFNlZSBgUHJlbG9hZEFsbE1vZHVsZXNgLlxuICAgKi9cbiAgcHJlbG9hZGluZ1N0cmF0ZWd5PzogYW55O1xuXG4gIC8qKlxuICAgKiBEZWZpbmUgd2hhdCB0aGUgcm91dGVyIHNob3VsZCBkbyBpZiBpdCByZWNlaXZlcyBhIG5hdmlnYXRpb24gcmVxdWVzdCB0byB0aGUgY3VycmVudCBVUkwuXG4gICAqIEJ5IGRlZmF1bHQsIHRoZSByb3V0ZXIgd2lsbCBpZ25vcmUgdGhpcyBuYXZpZ2F0aW9uLiBIb3dldmVyLCB0aGlzIHByZXZlbnRzIGZlYXR1cmVzIHN1Y2hcbiAgICogYXMgYSBcInJlZnJlc2hcIiBidXR0b24uIFVzZSB0aGlzIG9wdGlvbiB0byBjb25maWd1cmUgdGhlIGJlaGF2aW9yIHdoZW4gbmF2aWdhdGluZyB0byB0aGVcbiAgICogY3VycmVudCBVUkwuIERlZmF1bHQgaXMgJ2lnbm9yZScuXG4gICAqL1xuICBvblNhbWVVcmxOYXZpZ2F0aW9uPzogJ3JlbG9hZCd8J2lnbm9yZSc7XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgaWYgdGhlIHNjcm9sbCBwb3NpdGlvbiBuZWVkcyB0byBiZSByZXN0b3JlZCB3aGVuIG5hdmlnYXRpbmcgYmFjay5cbiAgICpcbiAgICogKiAnZGlzYWJsZWQnLS1kb2VzIG5vdGhpbmcgKGRlZmF1bHQpLlxuICAgKiAqICd0b3AnLS1zZXQgdGhlIHNjcm9sbCBwb3NpdGlvbiB0byAwLDAuLlxuICAgKiAqICdlbmFibGVkJy0tc2V0IHRoZSBzY3JvbGwgcG9zaXRpb24gdG8gdGhlIHN0b3JlZCBwb3NpdGlvbi4gVGhpcyBvcHRpb24gd2lsbCBiZSB0aGUgZGVmYXVsdCBpblxuICAgKiB0aGUgZnV0dXJlLlxuICAgKlxuICAgKiBXaGVuIGVuYWJsZWQsIHRoZSByb3V0ZXIgc3RvcmVzIGFuZCByZXN0b3JlcyBzY3JvbGwgcG9zaXRpb25zIGR1cmluZyBuYXZpZ2F0aW9uLlxuICAgKiBXaGVuIG5hdmlnYXRpbmcgZm9yd2FyZCwgdGhlIHNjcm9sbCBwb3NpdGlvbiB3aWxsIGJlIHNldCB0byBbMCwgMF0sIG9yIHRvIHRoZSBhbmNob3JcbiAgICogaWYgb25lIGlzIHByb3ZpZGVkLlxuICAgKlxuICAgKiBZb3UgY2FuIGltcGxlbWVudCBjdXN0b20gc2Nyb2xsIHJlc3RvcmF0aW9uIGJlaGF2aW9yIGFzIGZvbGxvd3MuXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY2xhc3MgQXBwTW9kdWxlIHtcbiAgICogIGNvbnN0cnVjdG9yKHJvdXRlcjogUm91dGVyLCB2aWV3cG9ydFNjcm9sbGVyOiBWaWV3cG9ydFNjcm9sbGVyLCBzdG9yZTogU3RvcmU8QXBwU3RhdGU+KSB7XG4gICAqICAgIHJvdXRlci5ldmVudHMucGlwZShmaWx0ZXIoZSA9PiBlIGluc3RhbmNlb2YgU2Nyb2xsKSwgc3dpdGNoTWFwKGUgPT4ge1xuICAgKiAgICAgIHJldHVybiBzdG9yZS5waXBlKGZpcnN0KCksIHRpbWVvdXQoMjAwKSwgbWFwKCgpID0+IGUpKTtcbiAgICogICAgfSkuc3Vic2NyaWJlKGUgPT4ge1xuICAgKiAgICAgIGlmIChlLnBvc2l0aW9uKSB7XG4gICAqICAgICAgICB2aWV3cG9ydFNjcm9sbGVyLnNjcm9sbFRvUG9zaXRpb24oZS5wb3NpdGlvbik7XG4gICAqICAgICAgfSBlbHNlIGlmIChlLmFuY2hvcikge1xuICAgKiAgICAgICAgdmlld3BvcnRTY3JvbGxlci5zY3JvbGxUb0FuY2hvcihlLmFuY2hvcik7XG4gICAqICAgICAgfSBlbHNlIHtcbiAgICogICAgICAgIHZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9Qb3NpdGlvbihbMCwgMF0pO1xuICAgKiAgICAgIH1cbiAgICogICAgfSk7XG4gICAqICB9XG4gICAqIH1cbiAgICogYGBgXG4gICAqXG4gICAqIFlvdSBjYW4gYWxzbyBpbXBsZW1lbnQgY29tcG9uZW50LXNwZWNpZmljIHNjcm9sbGluZyBsaWtlIHRoaXM6XG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY2xhc3MgTGlzdENvbXBvbmVudCB7XG4gICAqICAgbGlzdDogYW55W107XG4gICAqICAgY29uc3RydWN0b3Iocm91dGVyOiBSb3V0ZXIsIHZpZXdwb3J0U2Nyb2xsZXI6IFZpZXdwb3J0U2Nyb2xsZXIsIGZldGNoZXI6IExpc3RGZXRjaGVyKSB7XG4gICAqICAgICBjb25zdCBzY3JvbGxFdmVudHMgPSByb3V0ZXIuZXZlbnRzLmZpbHRlcihlID0+IGUgaW5zdGFuY2VvZiBTY3JvbGwpO1xuICAgKiAgICAgbGlzdEZldGNoZXIuZmV0Y2goKS5waXBlKHdpdGhMYXRlc3RGcm9tKHNjcm9sbEV2ZW50cykpLnN1YnNjcmliZSgoW2xpc3QsIGVdKSA9PiB7XG4gICAqICAgICAgIHRoaXMubGlzdCA9IGxpc3Q7XG4gICAqICAgICAgIGlmIChlLnBvc2l0aW9uKSB7XG4gICAqICAgICAgICAgdmlld3BvcnRTY3JvbGxlci5zY3JvbGxUb1Bvc2l0aW9uKGUucG9zaXRpb24pO1xuICAgKiAgICAgICB9IGVsc2Uge1xuICAgKiAgICAgICAgIHZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9Qb3NpdGlvbihbMCwgMF0pO1xuICAgKiAgICAgICB9XG4gICAqICAgICB9KTtcbiAgICogICB9XG4gICAqIH1cbiAgICovXG4gIHNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb24/OiAnZGlzYWJsZWQnfCdlbmFibGVkJ3wndG9wJztcblxuICAvKipcbiAgICogQ29uZmlndXJlcyBpZiB0aGUgcm91dGVyIHNob3VsZCBzY3JvbGwgdG8gdGhlIGVsZW1lbnQgd2hlbiB0aGUgdXJsIGhhcyBhIGZyYWdtZW50LlxuICAgKlxuICAgKiAqICdkaXNhYmxlZCctLWRvZXMgbm90aGluZyAoZGVmYXVsdCkuXG4gICAqICogJ2VuYWJsZWQnLS1zY3JvbGxzIHRvIHRoZSBlbGVtZW50LiBUaGlzIG9wdGlvbiB3aWxsIGJlIHRoZSBkZWZhdWx0IGluIHRoZSBmdXR1cmUuXG4gICAqXG4gICAqIEFuY2hvciBzY3JvbGxpbmcgZG9lcyBub3QgaGFwcGVuIG9uICdwb3BzdGF0ZScuIEluc3RlYWQsIHdlIHJlc3RvcmUgdGhlIHBvc2l0aW9uXG4gICAqIHRoYXQgd2Ugc3RvcmVkIG9yIHNjcm9sbCB0byB0aGUgdG9wLlxuICAgKi9cbiAgYW5jaG9yU2Nyb2xsaW5nPzogJ2Rpc2FibGVkJ3wnZW5hYmxlZCc7XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgdGhlIHNjcm9sbCBvZmZzZXQgdGhlIHJvdXRlciB3aWxsIHVzZSB3aGVuIHNjcm9sbGluZyB0byBhbiBlbGVtZW50LlxuICAgKlxuICAgKiBXaGVuIGdpdmVuIGEgdHVwbGUgd2l0aCB0d28gbnVtYmVycywgdGhlIHJvdXRlciB3aWxsIGFsd2F5cyB1c2UgdGhlIG51bWJlcnMuXG4gICAqIFdoZW4gZ2l2ZW4gYSBmdW5jdGlvbiwgdGhlIHJvdXRlciB3aWxsIGludm9rZSB0aGUgZnVuY3Rpb24gZXZlcnkgdGltZSBpdCByZXN0b3JlcyBzY3JvbGxcbiAgICogcG9zaXRpb24uXG4gICAqL1xuICBzY3JvbGxPZmZzZXQ/OiBbbnVtYmVyLCBudW1iZXJdfCgoKSA9PiBbbnVtYmVyLCBudW1iZXJdKTtcblxuICAvKipcbiAgICogRGVmaW5lcyBob3cgdGhlIHJvdXRlciBtZXJnZXMgcGFyYW1zLCBkYXRhIGFuZCByZXNvbHZlZCBkYXRhIGZyb20gcGFyZW50IHRvIGNoaWxkXG4gICAqIHJvdXRlcy4gQXZhaWxhYmxlIG9wdGlvbnMgYXJlOlxuICAgKlxuICAgKiAtIGAnZW1wdHlPbmx5J2AsIHRoZSBkZWZhdWx0LCBvbmx5IGluaGVyaXRzIHBhcmVudCBwYXJhbXMgZm9yIHBhdGgtbGVzcyBvciBjb21wb25lbnQtbGVzc1xuICAgKiAgIHJvdXRlcy5cbiAgICogLSBgJ2Fsd2F5cydgLCBlbmFibGVzIHVuY29uZGl0aW9uYWwgaW5oZXJpdGFuY2Ugb2YgcGFyZW50IHBhcmFtcy5cbiAgICovXG4gIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k/OiAnZW1wdHlPbmx5J3wnYWx3YXlzJztcblxuICAvKipcbiAgICogQSBjdXN0b20gbWFsZm9ybWVkIHVyaSBlcnJvciBoYW5kbGVyIGZ1bmN0aW9uLiBUaGlzIGhhbmRsZXIgaXMgaW52b2tlZCB3aGVuIGVuY29kZWRVUkkgY29udGFpbnNcbiAgICogaW52YWxpZCBjaGFyYWN0ZXIgc2VxdWVuY2VzLiBUaGUgZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiBpcyB0byByZWRpcmVjdCB0byB0aGUgcm9vdCB1cmwgZHJvcHBpbmdcbiAgICogYW55IHBhdGggb3IgcGFyYW0gaW5mby4gVGhpcyBmdW5jdGlvbiBwYXNzZXMgdGhyZWUgcGFyYW1ldGVyczpcbiAgICpcbiAgICogLSBgJ1VSSUVycm9yJ2AgLSBFcnJvciB0aHJvd24gd2hlbiBwYXJzaW5nIGEgYmFkIFVSTFxuICAgKiAtIGAnVXJsU2VyaWFsaXplcidgIC0gVXJsU2VyaWFsaXplciB0aGF04oCZcyBjb25maWd1cmVkIHdpdGggdGhlIHJvdXRlci5cbiAgICogLSBgJ3VybCdgIC0gIFRoZSBtYWxmb3JtZWQgVVJMIHRoYXQgY2F1c2VkIHRoZSBVUklFcnJvclxuICAgKiAqL1xuICBtYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI/OlxuICAgICAgKGVycm9yOiBVUklFcnJvciwgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgdXJsOiBzdHJpbmcpID0+IFVybFRyZWU7XG5cbiAgLyoqXG4gICAqIERlZmluZXMgd2hlbiB0aGUgcm91dGVyIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMLiBUaGUgZGVmYXVsdCBiZWhhdmlvciBpcyB0byB1cGRhdGUgYWZ0ZXJcbiAgICogc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uLiBIb3dldmVyLCBzb21lIGFwcGxpY2F0aW9ucyBtYXkgcHJlZmVyIGEgbW9kZSB3aGVyZSB0aGUgVVJMIGdldHNcbiAgICogdXBkYXRlZCBhdCB0aGUgYmVnaW5uaW5nIG9mIG5hdmlnYXRpb24uIFRoZSBtb3N0IGNvbW1vbiB1c2UgY2FzZSB3b3VsZCBiZSB1cGRhdGluZyB0aGVcbiAgICogVVJMIGVhcmx5IHNvIGlmIG5hdmlnYXRpb24gZmFpbHMsIHlvdSBjYW4gc2hvdyBhbiBlcnJvciBtZXNzYWdlIHdpdGggdGhlIFVSTCB0aGF0IGZhaWxlZC5cbiAgICogQXZhaWxhYmxlIG9wdGlvbnMgYXJlOlxuICAgKlxuICAgKiAtIGAnZGVmZXJyZWQnYCwgdGhlIGRlZmF1bHQsIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMIGFmdGVyIG5hdmlnYXRpb24gaGFzIGZpbmlzaGVkLlxuICAgKiAtIGAnZWFnZXInYCwgdXBkYXRlcyBicm93c2VyIFVSTCBhdCB0aGUgYmVnaW5uaW5nIG9mIG5hdmlnYXRpb24uXG4gICAqL1xuICB1cmxVcGRhdGVTdHJhdGVneT86ICdkZWZlcnJlZCd8J2VhZ2VyJztcblxuICAvKipcbiAgICogRW5hYmxlcyBhIGJ1ZyBmaXggdGhhdCBjb3JyZWN0cyByZWxhdGl2ZSBsaW5rIHJlc29sdXRpb24gaW4gY29tcG9uZW50cyB3aXRoIGVtcHR5IHBhdGhzLlxuICAgKiBFeGFtcGxlOlxuICAgKlxuICAgKiBgYGBcbiAgICogY29uc3Qgcm91dGVzID0gW1xuICAgKiAgIHtcbiAgICogICAgIHBhdGg6ICcnLFxuICAgKiAgICAgY29tcG9uZW50OiBDb250YWluZXJDb21wb25lbnQsXG4gICAqICAgICBjaGlsZHJlbjogW1xuICAgKiAgICAgICB7IHBhdGg6ICdhJywgY29tcG9uZW50OiBBQ29tcG9uZW50IH0sXG4gICAqICAgICAgIHsgcGF0aDogJ2InLCBjb21wb25lbnQ6IEJDb21wb25lbnQgfSxcbiAgICogICAgIF1cbiAgICogICB9XG4gICAqIF07XG4gICAqIGBgYFxuICAgKlxuICAgKiBGcm9tIHRoZSBgQ29udGFpbmVyQ29tcG9uZW50YCwgdGhpcyB3aWxsIG5vdCB3b3JrOlxuICAgKlxuICAgKiBgPGEgW3JvdXRlckxpbmtdPVwiWycuL2EnXVwiPkxpbmsgdG8gQTwvYT5gXG4gICAqXG4gICAqIEhvd2V2ZXIsIHRoaXMgd2lsbCB3b3JrOlxuICAgKlxuICAgKiBgPGEgW3JvdXRlckxpbmtdPVwiWycuLi9hJ11cIj5MaW5rIHRvIEE8L2E+YFxuICAgKlxuICAgKiBJbiBvdGhlciB3b3JkcywgeW91J3JlIHJlcXVpcmVkIHRvIHVzZSBgLi4vYCByYXRoZXIgdGhhbiBgLi9gLiBUaGUgY3VycmVudCBkZWZhdWx0IGluIHY2XG4gICAqIGlzIGBsZWdhY3lgLCBhbmQgdGhpcyBvcHRpb24gd2lsbCBiZSByZW1vdmVkIGluIHY3IHRvIGRlZmF1bHQgdG8gdGhlIGNvcnJlY3RlZCBiZWhhdmlvci5cbiAgICovXG4gIHJlbGF0aXZlTGlua1Jlc29sdXRpb24/OiAnbGVnYWN5J3wnY29ycmVjdGVkJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwUm91dGVyKFxuICAgIHJlZjogQXBwbGljYXRpb25SZWYsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIGNvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLFxuICAgIGxvY2F0aW9uOiBMb2NhdGlvbiwgaW5qZWN0b3I6IEluamVjdG9yLCBsb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLFxuICAgIGNvbmZpZzogUm91dGVbXVtdLCBvcHRzOiBFeHRyYU9wdGlvbnMgPSB7fSwgdXJsSGFuZGxpbmdTdHJhdGVneT86IFVybEhhbmRsaW5nU3RyYXRlZ3ksXG4gICAgcm91dGVSZXVzZVN0cmF0ZWd5PzogUm91dGVSZXVzZVN0cmF0ZWd5KSB7XG4gIGNvbnN0IHJvdXRlciA9IG5ldyBSb3V0ZXIoXG4gICAgICBudWxsLCB1cmxTZXJpYWxpemVyLCBjb250ZXh0cywgbG9jYXRpb24sIGluamVjdG9yLCBsb2FkZXIsIGNvbXBpbGVyLCBmbGF0dGVuKGNvbmZpZykpO1xuXG4gIGlmICh1cmxIYW5kbGluZ1N0cmF0ZWd5KSB7XG4gICAgcm91dGVyLnVybEhhbmRsaW5nU3RyYXRlZ3kgPSB1cmxIYW5kbGluZ1N0cmF0ZWd5O1xuICB9XG5cbiAgaWYgKHJvdXRlUmV1c2VTdHJhdGVneSkge1xuICAgIHJvdXRlci5yb3V0ZVJldXNlU3RyYXRlZ3kgPSByb3V0ZVJldXNlU3RyYXRlZ3k7XG4gIH1cblxuICBpZiAob3B0cy5lcnJvckhhbmRsZXIpIHtcbiAgICByb3V0ZXIuZXJyb3JIYW5kbGVyID0gb3B0cy5lcnJvckhhbmRsZXI7XG4gIH1cblxuICBpZiAob3B0cy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIpIHtcbiAgICByb3V0ZXIubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyID0gb3B0cy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI7XG4gIH1cblxuICBpZiAob3B0cy5lbmFibGVUcmFjaW5nKSB7XG4gICAgY29uc3QgZG9tID0gZ2V0RE9NKCk7XG4gICAgcm91dGVyLmV2ZW50cy5zdWJzY3JpYmUoKGU6IFJvdXRlckV2ZW50KSA9PiB7XG4gICAgICBkb20ubG9nR3JvdXAoYFJvdXRlciBFdmVudDogJHsoPGFueT5lLmNvbnN0cnVjdG9yKS5uYW1lfWApO1xuICAgICAgZG9tLmxvZyhlLnRvU3RyaW5nKCkpO1xuICAgICAgZG9tLmxvZyhlKTtcbiAgICAgIGRvbS5sb2dHcm91cEVuZCgpO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKG9wdHMub25TYW1lVXJsTmF2aWdhdGlvbikge1xuICAgIHJvdXRlci5vblNhbWVVcmxOYXZpZ2F0aW9uID0gb3B0cy5vblNhbWVVcmxOYXZpZ2F0aW9uO1xuICB9XG5cbiAgaWYgKG9wdHMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSkge1xuICAgIHJvdXRlci5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5ID0gb3B0cy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5O1xuICB9XG5cbiAgaWYgKG9wdHMudXJsVXBkYXRlU3RyYXRlZ3kpIHtcbiAgICByb3V0ZXIudXJsVXBkYXRlU3RyYXRlZ3kgPSBvcHRzLnVybFVwZGF0ZVN0cmF0ZWd5O1xuICB9XG5cbiAgaWYgKG9wdHMucmVsYXRpdmVMaW5rUmVzb2x1dGlvbikge1xuICAgIHJvdXRlci5yZWxhdGl2ZUxpbmtSZXNvbHV0aW9uID0gb3B0cy5yZWxhdGl2ZUxpbmtSZXNvbHV0aW9uO1xuICB9XG5cbiAgcmV0dXJuIHJvdXRlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJvb3RSb3V0ZShyb3V0ZXI6IFJvdXRlcik6IEFjdGl2YXRlZFJvdXRlIHtcbiAgcmV0dXJuIHJvdXRlci5yb3V0ZXJTdGF0ZS5yb290O1xufVxuXG4vKipcbiAqIFRvIGluaXRpYWxpemUgdGhlIHJvdXRlciBwcm9wZXJseSB3ZSBuZWVkIHRvIGRvIGluIHR3byBzdGVwczpcbiAqXG4gKiBXZSBuZWVkIHRvIHN0YXJ0IHRoZSBuYXZpZ2F0aW9uIGluIGEgQVBQX0lOSVRJQUxJWkVSIHRvIGJsb2NrIHRoZSBib290c3RyYXAgaWZcbiAqIGEgcmVzb2x2ZXIgb3IgYSBndWFyZHMgZXhlY3V0ZXMgYXN5bmNocm9ub3VzbHkuIFNlY29uZCwgd2UgbmVlZCB0byBhY3R1YWxseSBydW5cbiAqIGFjdGl2YXRpb24gaW4gYSBCT09UU1RSQVBfTElTVEVORVIuIFdlIHV0aWxpemUgdGhlIGFmdGVyUHJlYWN0aXZhdGlvblxuICogaG9vayBwcm92aWRlZCBieSB0aGUgcm91dGVyIHRvIGRvIHRoYXQuXG4gKlxuICogVGhlIHJvdXRlciBuYXZpZ2F0aW9uIHN0YXJ0cywgcmVhY2hlcyB0aGUgcG9pbnQgd2hlbiBwcmVhY3RpdmF0aW9uIGlzIGRvbmUsIGFuZCB0aGVuXG4gKiBwYXVzZXMuIEl0IHdhaXRzIGZvciB0aGUgaG9vayB0byBiZSByZXNvbHZlZC4gV2UgdGhlbiByZXNvbHZlIGl0IG9ubHkgaW4gYSBib290c3RyYXAgbGlzdGVuZXIuXG4gKi9cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBSb3V0ZXJJbml0aWFsaXplciB7XG4gIHByaXZhdGUgaW5pdE5hdmlnYXRpb246IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSByZXN1bHRPZlByZWFjdGl2YXRpb25Eb25lID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGluamVjdG9yOiBJbmplY3Rvcikge31cblxuICBhcHBJbml0aWFsaXplcigpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IHA6IFByb21pc2U8YW55PiA9IHRoaXMuaW5qZWN0b3IuZ2V0KExPQ0FUSU9OX0lOSVRJQUxJWkVELCBQcm9taXNlLnJlc29sdmUobnVsbCkpO1xuICAgIHJldHVybiBwLnRoZW4oKCkgPT4ge1xuICAgICAgbGV0IHJlc29sdmU6IEZ1bmN0aW9uID0gbnVsbCAhO1xuICAgICAgY29uc3QgcmVzID0gbmV3IFByb21pc2UociA9PiByZXNvbHZlID0gcik7XG4gICAgICBjb25zdCByb3V0ZXIgPSB0aGlzLmluamVjdG9yLmdldChSb3V0ZXIpO1xuICAgICAgY29uc3Qgb3B0cyA9IHRoaXMuaW5qZWN0b3IuZ2V0KFJPVVRFUl9DT05GSUdVUkFUSU9OKTtcblxuICAgICAgaWYgKHRoaXMuaXNMZWdhY3lEaXNhYmxlZChvcHRzKSB8fCB0aGlzLmlzTGVnYWN5RW5hYmxlZChvcHRzKSkge1xuICAgICAgICByZXNvbHZlKHRydWUpO1xuXG4gICAgICB9IGVsc2UgaWYgKG9wdHMuaW5pdGlhbE5hdmlnYXRpb24gPT09ICdkaXNhYmxlZCcpIHtcbiAgICAgICAgcm91dGVyLnNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpO1xuICAgICAgICByZXNvbHZlKHRydWUpO1xuXG4gICAgICB9IGVsc2UgaWYgKG9wdHMuaW5pdGlhbE5hdmlnYXRpb24gPT09ICdlbmFibGVkJykge1xuICAgICAgICByb3V0ZXIuaG9va3MuYWZ0ZXJQcmVhY3RpdmF0aW9uID0gKCkgPT4ge1xuICAgICAgICAgIC8vIG9ubHkgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBzaG91bGQgYmUgZGVsYXllZFxuICAgICAgICAgIGlmICghdGhpcy5pbml0TmF2aWdhdGlvbikge1xuICAgICAgICAgICAgdGhpcy5pbml0TmF2aWdhdGlvbiA9IHRydWU7XG4gICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVzdWx0T2ZQcmVhY3RpdmF0aW9uRG9uZTtcblxuICAgICAgICAgICAgLy8gc3Vic2VxdWVudCBuYXZpZ2F0aW9ucyBzaG91bGQgbm90IGJlIGRlbGF5ZWRcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG9mIChudWxsKSBhcyBhbnk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByb3V0ZXIuaW5pdGlhbE5hdmlnYXRpb24oKTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGluaXRpYWxOYXZpZ2F0aW9uIG9wdGlvbnM6ICcke29wdHMuaW5pdGlhbE5hdmlnYXRpb259J2ApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzO1xuICAgIH0pO1xuICB9XG5cbiAgYm9vdHN0cmFwTGlzdGVuZXIoYm9vdHN0cmFwcGVkQ29tcG9uZW50UmVmOiBDb21wb25lbnRSZWY8YW55Pik6IHZvaWQge1xuICAgIGNvbnN0IG9wdHMgPSB0aGlzLmluamVjdG9yLmdldChST1VURVJfQ09ORklHVVJBVElPTik7XG4gICAgY29uc3QgcHJlbG9hZGVyID0gdGhpcy5pbmplY3Rvci5nZXQoUm91dGVyUHJlbG9hZGVyKTtcbiAgICBjb25zdCByb3V0ZXJTY3JvbGxlciA9IHRoaXMuaW5qZWN0b3IuZ2V0KFJvdXRlclNjcm9sbGVyKTtcbiAgICBjb25zdCByb3V0ZXIgPSB0aGlzLmluamVjdG9yLmdldChSb3V0ZXIpO1xuICAgIGNvbnN0IHJlZiA9IHRoaXMuaW5qZWN0b3IuZ2V0PEFwcGxpY2F0aW9uUmVmPihBcHBsaWNhdGlvblJlZik7XG5cbiAgICBpZiAoYm9vdHN0cmFwcGVkQ29tcG9uZW50UmVmICE9PSByZWYuY29tcG9uZW50c1swXSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzTGVnYWN5RW5hYmxlZChvcHRzKSkge1xuICAgICAgcm91dGVyLmluaXRpYWxOYXZpZ2F0aW9uKCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzTGVnYWN5RGlzYWJsZWQob3B0cykpIHtcbiAgICAgIHJvdXRlci5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICB9XG5cbiAgICBwcmVsb2FkZXIuc2V0VXBQcmVsb2FkaW5nKCk7XG4gICAgcm91dGVyU2Nyb2xsZXIuaW5pdCgpO1xuICAgIHJvdXRlci5yZXNldFJvb3RDb21wb25lbnRUeXBlKHJlZi5jb21wb25lbnRUeXBlc1swXSk7XG4gICAgdGhpcy5yZXN1bHRPZlByZWFjdGl2YXRpb25Eb25lLm5leHQobnVsbCAhKTtcbiAgICB0aGlzLnJlc3VsdE9mUHJlYWN0aXZhdGlvbkRvbmUuY29tcGxldGUoKTtcbiAgfVxuXG4gIHByaXZhdGUgaXNMZWdhY3lFbmFibGVkKG9wdHM6IEV4dHJhT3B0aW9ucyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBvcHRzLmluaXRpYWxOYXZpZ2F0aW9uID09PSAnbGVnYWN5X2VuYWJsZWQnIHx8IG9wdHMuaW5pdGlhbE5hdmlnYXRpb24gPT09IHRydWUgfHxcbiAgICAgICAgb3B0cy5pbml0aWFsTmF2aWdhdGlvbiA9PT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBpc0xlZ2FjeURpc2FibGVkKG9wdHM6IEV4dHJhT3B0aW9ucyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBvcHRzLmluaXRpYWxOYXZpZ2F0aW9uID09PSAnbGVnYWN5X2Rpc2FibGVkJyB8fCBvcHRzLmluaXRpYWxOYXZpZ2F0aW9uID09PSBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBwSW5pdGlhbGl6ZXIocjogUm91dGVySW5pdGlhbGl6ZXIpIHtcbiAgcmV0dXJuIHIuYXBwSW5pdGlhbGl6ZXIuYmluZChyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEJvb3RzdHJhcExpc3RlbmVyKHI6IFJvdXRlckluaXRpYWxpemVyKSB7XG4gIHJldHVybiByLmJvb3RzdHJhcExpc3RlbmVyLmJpbmQocik7XG59XG5cbi8qKlxuICogQSB0b2tlbiBmb3IgdGhlIHJvdXRlciBpbml0aWFsaXplciB0aGF0IHdpbGwgYmUgY2FsbGVkIGFmdGVyIHRoZSBhcHAgaXMgYm9vdHN0cmFwcGVkLlxuICpcbiAqIEBleHBlcmltZW50YWxcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9JTklUSUFMSVpFUiA9XG4gICAgbmV3IEluamVjdGlvblRva2VuPChjb21wUmVmOiBDb21wb25lbnRSZWY8YW55PikgPT4gdm9pZD4oJ1JvdXRlciBJbml0aWFsaXplcicpO1xuXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZVJvdXRlckluaXRpYWxpemVyKCkge1xuICByZXR1cm4gW1xuICAgIFJvdXRlckluaXRpYWxpemVyLFxuICAgIHtcbiAgICAgIHByb3ZpZGU6IEFQUF9JTklUSUFMSVpFUixcbiAgICAgIG11bHRpOiB0cnVlLFxuICAgICAgdXNlRmFjdG9yeTogZ2V0QXBwSW5pdGlhbGl6ZXIsXG4gICAgICBkZXBzOiBbUm91dGVySW5pdGlhbGl6ZXJdXG4gICAgfSxcbiAgICB7cHJvdmlkZTogUk9VVEVSX0lOSVRJQUxJWkVSLCB1c2VGYWN0b3J5OiBnZXRCb290c3RyYXBMaXN0ZW5lciwgZGVwczogW1JvdXRlckluaXRpYWxpemVyXX0sXG4gICAge3Byb3ZpZGU6IEFQUF9CT09UU1RSQVBfTElTVEVORVIsIG11bHRpOiB0cnVlLCB1c2VFeGlzdGluZzogUk9VVEVSX0lOSVRJQUxJWkVSfSxcbiAgXTtcbn1cbiJdfQ==