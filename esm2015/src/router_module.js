/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { APP_BASE_HREF, HashLocationStrategy, Location, LOCATION_INITIALIZED, LocationStrategy, PathLocationStrategy, PlatformLocation, ViewportScroller } from '@angular/common';
import { ANALYZE_FOR_ENTRY_COMPONENTS, APP_BOOTSTRAP_LISTENER, APP_INITIALIZER, ApplicationRef, Compiler, Inject, Injectable, InjectionToken, Injector, NgModule, NgModuleFactoryLoader, NgProbeToken, Optional, SkipSelf, SystemJsNgModuleLoader } from '@angular/core';
import { of, Subject } from 'rxjs';
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
import * as i0 from "@angular/core";
import * as i1 from "./router";
/**
 * The directives defined in the `RouterModule`.
 */
const ROUTER_DIRECTIVES = [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive, EmptyOutletComponent];
/**
 * A [DI token](guide/glossary/#di-token) for the router service.
 *
 * @publicApi
 */
export const ROUTER_CONFIGURATION = new InjectionToken('ROUTER_CONFIGURATION');
/**
 * @docsNotRequired
 */
export const ROUTER_FORROOT_GUARD = new InjectionToken('ROUTER_FORROOT_GUARD');
export const ROUTER_PROVIDERS = [
    Location,
    { provide: UrlSerializer, useClass: DefaultUrlSerializer },
    {
        provide: Router,
        useFactory: setupRouter,
        deps: [
            UrlSerializer, ChildrenOutletContexts, Location, Injector, NgModuleFactoryLoader, Compiler,
            ROUTES, ROUTER_CONFIGURATION, [UrlHandlingStrategy, new Optional()],
            [RouteReuseStrategy, new Optional()]
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
 * @description
 *
 * Adds directives and providers for in-app navigation among views defined in an application.
 * Use the Angular `Router` service to declaratively specify application states and manage state
 * transitions.
 *
 * You can import this NgModule multiple times, once for each lazy-loaded bundle.
 * However, only one `Router` service can be active.
 * To ensure this, there are two ways to register routes when importing this module:
 *
 * * The `forRoot()` method creates an `NgModule` that contains all the directives, the given
 * routes, and the `Router` service itself.
 * * The `forChild()` method creates an `NgModule` that contains all the directives and the given
 * routes, but does not include the `Router` service.
 *
 * @see [Routing and Navigation guide](guide/router) for an
 * overview of how the `Router` service should be used.
 *
 * @publicApi
 */
export class RouterModule {
    // Note: We are injecting the Router so it gets created eagerly...
    constructor(guard, router) { }
    /**
     * Creates and configures a module with all the router providers and directives.
     * Optionally sets up an application listener to perform an initial navigation.
     *
     * When registering the NgModule at the root, import as follows:
     *
     * ```
     * @NgModule({
     *   imports: [RouterModule.forRoot(ROUTES)]
     * })
     * class MyNgModule {}
     * ```
     *
     * @param routes An array of `Route` objects that define the navigation paths for the application.
     * @param config An `ExtraOptions` configuration object that controls how navigation is performed.
     * @return The new `NgModule`.
     *
     */
    static forRoot(routes, config) {
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
                    deps: [PlatformLocation, [new Inject(APP_BASE_HREF), new Optional()], ROUTER_CONFIGURATION]
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
    }
    /**
     * Creates a module with all the router directives and a provider registering routes,
     * without creating a new Router service.
     * When registering for submodules and lazy-loaded submodules, create the NgModule as follows:
     *
     * ```
     * @NgModule({
     *   imports: [RouterModule.forChild(ROUTES)]
     * })
     * class MyNgModule {}
     * ```
     *
     * @param routes An array of `Route` objects that define the navigation paths for the submodule.
     * @return The new NgModule.
     *
     */
    static forChild(routes) {
        return { ngModule: RouterModule, providers: [provideRoutes(routes)] };
    }
}
RouterModule.ɵfac = function RouterModule_Factory(t) { return new (t || RouterModule)(i0.ɵɵinject(ROUTER_FORROOT_GUARD, 8), i0.ɵɵinject(i1.Router, 8)); };
RouterModule.ɵmod = /*@__PURE__*/ i0.ɵɵdefineNgModule({ type: RouterModule });
RouterModule.ɵinj = /*@__PURE__*/ i0.ɵɵdefineInjector({});
(function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(RouterModule, [{
        type: NgModule,
        args: [{
                declarations: ROUTER_DIRECTIVES,
                exports: ROUTER_DIRECTIVES,
                entryComponents: [EmptyOutletComponent]
            }]
    }], function () { return [{ type: undefined, decorators: [{
                type: Optional
            }, {
                type: Inject,
                args: [ROUTER_FORROOT_GUARD]
            }] }, { type: i1.Router, decorators: [{
                type: Optional
            }] }]; }, null); })();
(function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵɵsetNgModuleScope(RouterModule, { declarations: [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive, EmptyOutletComponent], exports: [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive, EmptyOutletComponent] }); })();
export function createRouterScroller(router, viewportScroller, config) {
    if (config.scrollOffset) {
        viewportScroller.setOffset(config.scrollOffset);
    }
    return new RouterScroller(router, viewportScroller, config);
}
export function provideLocationStrategy(platformLocationStrategy, baseHref, options = {}) {
    return options.useHash ? new HashLocationStrategy(platformLocationStrategy, baseHref) :
        new PathLocationStrategy(platformLocationStrategy, baseHref);
}
export function provideForRootGuard(router) {
    if ((typeof ngDevMode === 'undefined' || ngDevMode) && router) {
        throw new Error(`RouterModule.forRoot() called twice. Lazy loaded modules should use RouterModule.forChild() instead.`);
    }
    return 'guarded';
}
/**
 * Registers a [DI provider](guide/glossary#provider) for a set of routes.
 * @param routes The route configuration to provide.
 *
 * @usageNotes
 *
 * ```
 * @NgModule({
 *   imports: [RouterModule.forChild(ROUTES)],
 *   providers: [provideRoutes(EXTRA_ROUTES)]
 * })
 * class MyNgModule {}
 * ```
 *
 * @publicApi
 */
export function provideRoutes(routes) {
    return [
        { provide: ANALYZE_FOR_ENTRY_COMPONENTS, multi: true, useValue: routes },
        { provide: ROUTES, multi: true, useValue: routes },
    ];
}
export function setupRouter(urlSerializer, contexts, location, injector, loader, compiler, config, opts = {}, urlHandlingStrategy, routeReuseStrategy) {
    const router = new Router(null, urlSerializer, contexts, location, injector, loader, compiler, flatten(config));
    if (urlHandlingStrategy) {
        router.urlHandlingStrategy = urlHandlingStrategy;
    }
    if (routeReuseStrategy) {
        router.routeReuseStrategy = routeReuseStrategy;
    }
    assignExtraOptionsToRouter(opts, router);
    if (opts.enableTracing) {
        router.events.subscribe((e) => {
            var _a, _b;
            // tslint:disable:no-console
            (_a = console.group) === null || _a === void 0 ? void 0 : _a.call(console, `Router Event: ${e.constructor.name}`);
            console.log(e.toString());
            console.log(e);
            (_b = console.groupEnd) === null || _b === void 0 ? void 0 : _b.call(console);
            // tslint:enable:no-console
        });
    }
    return router;
}
export function assignExtraOptionsToRouter(opts, router) {
    if (opts.errorHandler) {
        router.errorHandler = opts.errorHandler;
    }
    if (opts.malformedUriErrorHandler) {
        router.malformedUriErrorHandler = opts.malformedUriErrorHandler;
    }
    if (opts.onSameUrlNavigation) {
        router.onSameUrlNavigation = opts.onSameUrlNavigation;
    }
    if (opts.paramsInheritanceStrategy) {
        router.paramsInheritanceStrategy = opts.paramsInheritanceStrategy;
    }
    if (opts.relativeLinkResolution) {
        router.relativeLinkResolution = opts.relativeLinkResolution;
    }
    if (opts.urlUpdateStrategy) {
        router.urlUpdateStrategy = opts.urlUpdateStrategy;
    }
}
export function rootRoute(router) {
    return router.routerState.root;
}
/**
 * Router initialization requires two steps:
 *
 * First, we start the navigation in a `APP_INITIALIZER` to block the bootstrap if
 * a resolver or a guard executes asynchronously.
 *
 * Next, we actually run activation in a `BOOTSTRAP_LISTENER`, using the
 * `afterPreactivation` hook provided by the router.
 * The router navigation starts, reaches the point when preactivation is done, and then
 * pauses. It waits for the hook to be resolved. We then resolve it only in a bootstrap listener.
 */
export class RouterInitializer {
    constructor(injector) {
        this.injector = injector;
        this.initNavigation = false;
        this.resultOfPreactivationDone = new Subject();
    }
    appInitializer() {
        const p = this.injector.get(LOCATION_INITIALIZED, Promise.resolve(null));
        return p.then(() => {
            let resolve = null;
            const res = new Promise(r => resolve = r);
            const router = this.injector.get(Router);
            const opts = this.injector.get(ROUTER_CONFIGURATION);
            if (opts.initialNavigation === 'disabled') {
                router.setUpLocationChangeListener();
                resolve(true);
            }
            else if (
            // TODO: enabled is deprecated as of v11, can be removed in v13
            opts.initialNavigation === 'enabled' || opts.initialNavigation === 'enabledBlocking') {
                router.hooks.afterPreactivation = () => {
                    // only the initial navigation should be delayed
                    if (!this.initNavigation) {
                        this.initNavigation = true;
                        resolve(true);
                        return this.resultOfPreactivationDone;
                        // subsequent navigations should not be delayed
                    }
                    else {
                        return of(null);
                    }
                };
                router.initialNavigation();
            }
            else {
                resolve(true);
            }
            return res;
        });
    }
    bootstrapListener(bootstrappedComponentRef) {
        const opts = this.injector.get(ROUTER_CONFIGURATION);
        const preloader = this.injector.get(RouterPreloader);
        const routerScroller = this.injector.get(RouterScroller);
        const router = this.injector.get(Router);
        const ref = this.injector.get(ApplicationRef);
        if (bootstrappedComponentRef !== ref.components[0]) {
            return;
        }
        // Default case
        if (opts.initialNavigation === 'enabledNonBlocking' || opts.initialNavigation === undefined) {
            router.initialNavigation();
        }
        preloader.setUpPreloading();
        routerScroller.init();
        router.resetRootComponentType(ref.componentTypes[0]);
        this.resultOfPreactivationDone.next(null);
        this.resultOfPreactivationDone.complete();
    }
}
RouterInitializer.ɵfac = function RouterInitializer_Factory(t) { return new (t || RouterInitializer)(i0.ɵɵinject(i0.Injector)); };
RouterInitializer.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: RouterInitializer, factory: RouterInitializer.ɵfac });
(function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(RouterInitializer, [{
        type: Injectable
    }], function () { return [{ type: i0.Injector }]; }, null); })();
export function getAppInitializer(r) {
    return r.appInitializer.bind(r);
}
export function getBootstrapListener(r) {
    return r.bootstrapListener.bind(r);
}
/**
 * A [DI token](guide/glossary/#di-token) for the router initializer that
 * is called after the app is bootstrapped.
 *
 * @publicApi
 */
export const ROUTER_INITIALIZER = new InjectionToken('Router Initializer');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX21vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsYUFBYSxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ2hMLE9BQU8sRUFBQyw0QkFBNEIsRUFBRSxzQkFBc0IsRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBZ0IsTUFBTSxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUF1QixRQUFRLEVBQUUscUJBQXFCLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBWSxRQUFRLEVBQUUsc0JBQXNCLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDcFQsT0FBTyxFQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFFakMsT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFFL0QsT0FBTyxFQUFDLFVBQVUsRUFBRSxrQkFBa0IsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQ3hFLE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLGlDQUFpQyxDQUFDO0FBQ2pFLE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSw0QkFBNEIsQ0FBQztBQUV4RCxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUMxRCxPQUFPLEVBQWUsTUFBTSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzlDLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUM5QyxPQUFPLEVBQUMsc0JBQXNCLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUMvRCxPQUFP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YyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQyxDQUFDO0FBRUQsTUFBTSxVQUFVLG9CQUFvQixDQUFDLENBQW9CO0lBQ3ZELE9BQU8sQ0FBQyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQyxDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FDM0IsSUFBSSxjQUFjLENBQXVDLG9CQUFvQixDQUFDLENBQUM7QUFFbkYsTUFBTSxVQUFVLHdCQUF3QjtJQUN0QyxPQUFPO1FBQ0wsaUJBQWlCO1FBQ2pCO1lBQ0UsT0FBTyxFQUFFLGVBQWU7WUFDeEIsS0FBSyxFQUFFLElBQUk7WUFDWCxVQUFVLEVBQUUsaUJBQWlCO1lBQzdCLElBQUksRUFBRSxDQUFDLGlCQUFpQixDQUFDO1NBQzFCO1FBQ0QsRUFBQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxFQUFFLG9CQUFvQixFQUFFLElBQUksRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUM7UUFDMUYsRUFBQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUM7S0FDaEYsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBUFBfQkFTRV9IUkVGLCBIYXNoTG9jYXRpb25TdHJhdGVneSwgTG9jYXRpb24sIExPQ0FUSU9OX0lOSVRJQUxJWkVELCBMb2NhdGlvblN0cmF0ZWd5LCBQYXRoTG9jYXRpb25TdHJhdGVneSwgUGxhdGZvcm1Mb2NhdGlvbiwgVmlld3BvcnRTY3JvbGxlcn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7QU5BTFlaRV9GT1JfRU5UUllfQ09NUE9ORU5UUywgQVBQX0JPT1RTVFJBUF9MSVNURU5FUiwgQVBQX0lOSVRJQUxJWkVSLCBBcHBsaWNhdGlvblJlZiwgQ29tcGlsZXIsIENvbXBvbmVudFJlZiwgSW5qZWN0LCBJbmplY3RhYmxlLCBJbmplY3Rpb25Ub2tlbiwgSW5qZWN0b3IsIE1vZHVsZVdpdGhQcm92aWRlcnMsIE5nTW9kdWxlLCBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIE5nUHJvYmVUb2tlbiwgT3B0aW9uYWwsIFByb3ZpZGVyLCBTa2lwU2VsZiwgU3lzdGVtSnNOZ01vZHVsZUxvYWRlcn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge29mLCBTdWJqZWN0fSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtFbXB0eU91dGxldENvbXBvbmVudH0gZnJvbSAnLi9jb21wb25lbnRzL2VtcHR5X291dGxldCc7XG5pbXBvcnQge1JvdXRlLCBSb3V0ZXN9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7Um91dGVyTGluaywgUm91dGVyTGlua1dpdGhIcmVmfSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsnO1xuaW1wb3J0IHtSb3V0ZXJMaW5rQWN0aXZlfSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmtfYWN0aXZlJztcbmltcG9ydCB7Um91dGVyT3V0bGV0fSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX291dGxldCc7XG5pbXBvcnQge0V2ZW50fSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge1JvdXRlUmV1c2VTdHJhdGVneX0gZnJvbSAnLi9yb3V0ZV9yZXVzZV9zdHJhdGVneSc7XG5pbXBvcnQge0Vycm9ySGFuZGxlciwgUm91dGVyfSBmcm9tICcuL3JvdXRlcic7XG5pbXBvcnQge1JPVVRFU30gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge0NoaWxkcmVuT3V0bGV0Q29udGV4dHN9IGZyb20gJy4vcm91dGVyX291dGxldF9jb250ZXh0JztcbmltcG9ydCB7Tm9QcmVsb2FkaW5nLCBQcmVsb2FkQWxsTW9kdWxlcywgUHJlbG9hZGluZ1N0cmF0ZWd5LCBSb3V0ZXJQcmVsb2FkZXJ9IGZyb20gJy4vcm91dGVyX3ByZWxvYWRlcic7XG5pbXBvcnQge1JvdXRlclNjcm9sbGVyfSBmcm9tICcuL3JvdXRlcl9zY3JvbGxlcic7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlfSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1VybEhhbmRsaW5nU3RyYXRlZ3l9IGZyb20gJy4vdXJsX2hhbmRsaW5nX3N0cmF0ZWd5JztcbmltcG9ydCB7RGVmYXVsdFVybFNlcmlhbGl6ZXIsIFVybFNlcmlhbGl6ZXIsIFVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtmbGF0dGVufSBmcm9tICcuL3V0aWxzL2NvbGxlY3Rpb24nO1xuXG4vKipcbiAqIFRoZSBkaXJlY3RpdmVzIGRlZmluZWQgaW4gdGhlIGBSb3V0ZXJNb2R1bGVgLlxuICovXG5jb25zdCBST1VURVJfRElSRUNUSVZFUyA9XG4gICAgW1JvdXRlck91dGxldCwgUm91dGVyTGluaywgUm91dGVyTGlua1dpdGhIcmVmLCBSb3V0ZXJMaW5rQWN0aXZlLCBFbXB0eU91dGxldENvbXBvbmVudF07XG5cbi8qKlxuICogQSBbREkgdG9rZW5dKGd1aWRlL2dsb3NzYXJ5LyNkaS10b2tlbikgZm9yIHRoZSByb3V0ZXIgc2VydmljZS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjb25zdCBST1VURVJfQ09ORklHVVJBVElPTiA9IG5ldyBJbmplY3Rpb25Ub2tlbjxFeHRyYU9wdGlvbnM+KCdST1VURVJfQ09ORklHVVJBVElPTicpO1xuXG4vKipcbiAqIEBkb2NzTm90UmVxdWlyZWRcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9GT1JST09UX0dVQVJEID0gbmV3IEluamVjdGlvblRva2VuPHZvaWQ+KCdST1VURVJfRk9SUk9PVF9HVUFSRCcpO1xuXG5leHBvcnQgY29uc3QgUk9VVEVSX1BST1ZJREVSUzogUHJvdmlkZXJbXSA9IFtcbiAgTG9jYXRpb24sXG4gIHtwcm92aWRlOiBVcmxTZXJpYWxpemVyLCB1c2VDbGFzczogRGVmYXVsdFVybFNlcmlhbGl6ZXJ9LFxuICB7XG4gICAgcHJvdmlkZTogUm91dGVyLFxuICAgIHVzZUZhY3Rvcnk6IHNldHVwUm91dGVyLFxuICAgIGRlcHM6IFtcbiAgICAgIFVybFNlcmlhbGl6ZXIsIENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIExvY2F0aW9uLCBJbmplY3RvciwgTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBDb21waWxlcixcbiAgICAgIFJPVVRFUywgUk9VVEVSX0NPTkZJR1VSQVRJT04sIFtVcmxIYW5kbGluZ1N0cmF0ZWd5LCBuZXcgT3B0aW9uYWwoKV0sXG4gICAgICBbUm91dGVSZXVzZVN0cmF0ZWd5LCBuZXcgT3B0aW9uYWwoKV1cbiAgICBdXG4gIH0sXG4gIENoaWxkcmVuT3V0bGV0Q29udGV4dHMsXG4gIHtwcm92aWRlOiBBY3RpdmF0ZWRSb3V0ZSwgdXNlRmFjdG9yeTogcm9vdFJvdXRlLCBkZXBzOiBbUm91dGVyXX0sXG4gIHtwcm92aWRlOiBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIHVzZUNsYXNzOiBTeXN0ZW1Kc05nTW9kdWxlTG9hZGVyfSxcbiAgUm91dGVyUHJlbG9hZGVyLFxuICBOb1ByZWxvYWRpbmcsXG4gIFByZWxvYWRBbGxNb2R1bGVzLFxuICB7cHJvdmlkZTogUk9VVEVSX0NPTkZJR1VSQVRJT04sIHVzZVZhbHVlOiB7ZW5hYmxlVHJhY2luZzogZmFsc2V9fSxcbl07XG5cbmV4cG9ydCBmdW5jdGlvbiByb3V0ZXJOZ1Byb2JlVG9rZW4oKSB7XG4gIHJldHVybiBuZXcgTmdQcm9iZVRva2VuKCdSb3V0ZXInLCBSb3V0ZXIpO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEFkZHMgZGlyZWN0aXZlcyBhbmQgcHJvdmlkZXJzIGZvciBpbi1hcHAgbmF2aWdhdGlvbiBhbW9uZyB2aWV3cyBkZWZpbmVkIGluIGFuIGFwcGxpY2F0aW9uLlxuICogVXNlIHRoZSBBbmd1bGFyIGBSb3V0ZXJgIHNlcnZpY2UgdG8gZGVjbGFyYXRpdmVseSBzcGVjaWZ5IGFwcGxpY2F0aW9uIHN0YXRlcyBhbmQgbWFuYWdlIHN0YXRlXG4gKiB0cmFuc2l0aW9ucy5cbiAqXG4gKiBZb3UgY2FuIGltcG9ydCB0aGlzIE5nTW9kdWxlIG11bHRpcGxlIHRpbWVzLCBvbmNlIGZvciBlYWNoIGxhenktbG9hZGVkIGJ1bmRsZS5cbiAqIEhvd2V2ZXIsIG9ubHkgb25lIGBSb3V0ZXJgIHNlcnZpY2UgY2FuIGJlIGFjdGl2ZS5cbiAqIFRvIGVuc3VyZSB0aGlzLCB0aGVyZSBhcmUgdHdvIHdheXMgdG8gcmVnaXN0ZXIgcm91dGVzIHdoZW4gaW1wb3J0aW5nIHRoaXMgbW9kdWxlOlxuICpcbiAqICogVGhlIGBmb3JSb290KClgIG1ldGhvZCBjcmVhdGVzIGFuIGBOZ01vZHVsZWAgdGhhdCBjb250YWlucyBhbGwgdGhlIGRpcmVjdGl2ZXMsIHRoZSBnaXZlblxuICogcm91dGVzLCBhbmQgdGhlIGBSb3V0ZXJgIHNlcnZpY2UgaXRzZWxmLlxuICogKiBUaGUgYGZvckNoaWxkKClgIG1ldGhvZCBjcmVhdGVzIGFuIGBOZ01vZHVsZWAgdGhhdCBjb250YWlucyBhbGwgdGhlIGRpcmVjdGl2ZXMgYW5kIHRoZSBnaXZlblxuICogcm91dGVzLCBidXQgZG9lcyBub3QgaW5jbHVkZSB0aGUgYFJvdXRlcmAgc2VydmljZS5cbiAqXG4gKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpIGZvciBhblxuICogb3ZlcnZpZXcgb2YgaG93IHRoZSBgUm91dGVyYCBzZXJ2aWNlIHNob3VsZCBiZSB1c2VkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQE5nTW9kdWxlKHtcbiAgZGVjbGFyYXRpb25zOiBST1VURVJfRElSRUNUSVZFUyxcbiAgZXhwb3J0czogUk9VVEVSX0RJUkVDVElWRVMsXG4gIGVudHJ5Q29tcG9uZW50czogW0VtcHR5T3V0bGV0Q29tcG9uZW50XVxufSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJNb2R1bGUge1xuICAvLyBOb3RlOiBXZSBhcmUgaW5qZWN0aW5nIHRoZSBSb3V0ZXIgc28gaXQgZ2V0cyBjcmVhdGVkIGVhZ2VybHkuLi5cbiAgY29uc3RydWN0b3IoQE9wdGlvbmFsKCkgQEluamVjdChST1VURVJfRk9SUk9PVF9HVUFSRCkgZ3VhcmQ6IGFueSwgQE9wdGlvbmFsKCkgcm91dGVyOiBSb3V0ZXIpIHt9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW5kIGNvbmZpZ3VyZXMgYSBtb2R1bGUgd2l0aCBhbGwgdGhlIHJvdXRlciBwcm92aWRlcnMgYW5kIGRpcmVjdGl2ZXMuXG4gICAqIE9wdGlvbmFsbHkgc2V0cyB1cCBhbiBhcHBsaWNhdGlvbiBsaXN0ZW5lciB0byBwZXJmb3JtIGFuIGluaXRpYWwgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogV2hlbiByZWdpc3RlcmluZyB0aGUgTmdNb2R1bGUgYXQgdGhlIHJvb3QsIGltcG9ydCBhcyBmb2xsb3dzOlxuICAgKlxuICAgKiBgYGBcbiAgICogQE5nTW9kdWxlKHtcbiAgICogICBpbXBvcnRzOiBbUm91dGVyTW9kdWxlLmZvclJvb3QoUk9VVEVTKV1cbiAgICogfSlcbiAgICogY2xhc3MgTXlOZ01vZHVsZSB7fVxuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIHJvdXRlcyBBbiBhcnJheSBvZiBgUm91dGVgIG9iamVjdHMgdGhhdCBkZWZpbmUgdGhlIG5hdmlnYXRpb24gcGF0aHMgZm9yIHRoZSBhcHBsaWNhdGlvbi5cbiAgICogQHBhcmFtIGNvbmZpZyBBbiBgRXh0cmFPcHRpb25zYCBjb25maWd1cmF0aW9uIG9iamVjdCB0aGF0IGNvbnRyb2xzIGhvdyBuYXZpZ2F0aW9uIGlzIHBlcmZvcm1lZC5cbiAgICogQHJldHVybiBUaGUgbmV3IGBOZ01vZHVsZWAuXG4gICAqXG4gICAqL1xuICBzdGF0aWMgZm9yUm9vdChyb3V0ZXM6IFJvdXRlcywgY29uZmlnPzogRXh0cmFPcHRpb25zKTogTW9kdWxlV2l0aFByb3ZpZGVyczxSb3V0ZXJNb2R1bGU+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmdNb2R1bGU6IFJvdXRlck1vZHVsZSxcbiAgICAgIHByb3ZpZGVyczogW1xuICAgICAgICBST1VURVJfUFJPVklERVJTLFxuICAgICAgICBwcm92aWRlUm91dGVzKHJvdXRlcyksXG4gICAgICAgIHtcbiAgICAgICAgICBwcm92aWRlOiBST1VURVJfRk9SUk9PVF9HVUFSRCxcbiAgICAgICAgICB1c2VGYWN0b3J5OiBwcm92aWRlRm9yUm9vdEd1YXJkLFxuICAgICAgICAgIGRlcHM6IFtbUm91dGVyLCBuZXcgT3B0aW9uYWwoKSwgbmV3IFNraXBTZWxmKCldXVxuICAgICAgICB9LFxuICAgICAgICB7cHJvdmlkZTogUk9VVEVSX0NPTkZJR1VSQVRJT04sIHVzZVZhbHVlOiBjb25maWcgPyBjb25maWcgOiB7fX0sXG4gICAgICAgIHtcbiAgICAgICAgICBwcm92aWRlOiBMb2NhdGlvblN0cmF0ZWd5LFxuICAgICAgICAgIHVzZUZhY3Rvcnk6IHByb3ZpZGVMb2NhdGlvblN0cmF0ZWd5LFxuICAgICAgICAgIGRlcHM6XG4gICAgICAgICAgICAgIFtQbGF0Zm9ybUxvY2F0aW9uLCBbbmV3IEluamVjdChBUFBfQkFTRV9IUkVGKSwgbmV3IE9wdGlvbmFsKCldLCBST1VURVJfQ09ORklHVVJBVElPTl1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHByb3ZpZGU6IFJvdXRlclNjcm9sbGVyLFxuICAgICAgICAgIHVzZUZhY3Rvcnk6IGNyZWF0ZVJvdXRlclNjcm9sbGVyLFxuICAgICAgICAgIGRlcHM6IFtSb3V0ZXIsIFZpZXdwb3J0U2Nyb2xsZXIsIFJPVVRFUl9DT05GSUdVUkFUSU9OXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgcHJvdmlkZTogUHJlbG9hZGluZ1N0cmF0ZWd5LFxuICAgICAgICAgIHVzZUV4aXN0aW5nOiBjb25maWcgJiYgY29uZmlnLnByZWxvYWRpbmdTdHJhdGVneSA/IGNvbmZpZy5wcmVsb2FkaW5nU3RyYXRlZ3kgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE5vUHJlbG9hZGluZ1xuICAgICAgICB9LFxuICAgICAgICB7cHJvdmlkZTogTmdQcm9iZVRva2VuLCBtdWx0aTogdHJ1ZSwgdXNlRmFjdG9yeTogcm91dGVyTmdQcm9iZVRva2VufSxcbiAgICAgICAgcHJvdmlkZVJvdXRlckluaXRpYWxpemVyKCksXG4gICAgICBdLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG1vZHVsZSB3aXRoIGFsbCB0aGUgcm91dGVyIGRpcmVjdGl2ZXMgYW5kIGEgcHJvdmlkZXIgcmVnaXN0ZXJpbmcgcm91dGVzLFxuICAgKiB3aXRob3V0IGNyZWF0aW5nIGEgbmV3IFJvdXRlciBzZXJ2aWNlLlxuICAgKiBXaGVuIHJlZ2lzdGVyaW5nIGZvciBzdWJtb2R1bGVzIGFuZCBsYXp5LWxvYWRlZCBzdWJtb2R1bGVzLCBjcmVhdGUgdGhlIE5nTW9kdWxlIGFzIGZvbGxvd3M6XG4gICAqXG4gICAqIGBgYFxuICAgKiBATmdNb2R1bGUoe1xuICAgKiAgIGltcG9ydHM6IFtSb3V0ZXJNb2R1bGUuZm9yQ2hpbGQoUk9VVEVTKV1cbiAgICogfSlcbiAgICogY2xhc3MgTXlOZ01vZHVsZSB7fVxuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIHJvdXRlcyBBbiBhcnJheSBvZiBgUm91dGVgIG9iamVjdHMgdGhhdCBkZWZpbmUgdGhlIG5hdmlnYXRpb24gcGF0aHMgZm9yIHRoZSBzdWJtb2R1bGUuXG4gICAqIEByZXR1cm4gVGhlIG5ldyBOZ01vZHVsZS5cbiAgICpcbiAgICovXG4gIHN0YXRpYyBmb3JDaGlsZChyb3V0ZXM6IFJvdXRlcyk6IE1vZHVsZVdpdGhQcm92aWRlcnM8Um91dGVyTW9kdWxlPiB7XG4gICAgcmV0dXJuIHtuZ01vZHVsZTogUm91dGVyTW9kdWxlLCBwcm92aWRlcnM6IFtwcm92aWRlUm91dGVzKHJvdXRlcyldfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUm91dGVyU2Nyb2xsZXIoXG4gICAgcm91dGVyOiBSb3V0ZXIsIHZpZXdwb3J0U2Nyb2xsZXI6IFZpZXdwb3J0U2Nyb2xsZXIsIGNvbmZpZzogRXh0cmFPcHRpb25zKTogUm91dGVyU2Nyb2xsZXIge1xuICBpZiAoY29uZmlnLnNjcm9sbE9mZnNldCkge1xuICAgIHZpZXdwb3J0U2Nyb2xsZXIuc2V0T2Zmc2V0KGNvbmZpZy5zY3JvbGxPZmZzZXQpO1xuICB9XG4gIHJldHVybiBuZXcgUm91dGVyU2Nyb2xsZXIocm91dGVyLCB2aWV3cG9ydFNjcm9sbGVyLCBjb25maWcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZUxvY2F0aW9uU3RyYXRlZ3koXG4gICAgcGxhdGZvcm1Mb2NhdGlvblN0cmF0ZWd5OiBQbGF0Zm9ybUxvY2F0aW9uLCBiYXNlSHJlZjogc3RyaW5nLCBvcHRpb25zOiBFeHRyYU9wdGlvbnMgPSB7fSkge1xuICByZXR1cm4gb3B0aW9ucy51c2VIYXNoID8gbmV3IEhhc2hMb2NhdGlvblN0cmF0ZWd5KHBsYXRmb3JtTG9jYXRpb25TdHJhdGVneSwgYmFzZUhyZWYpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQYXRoTG9jYXRpb25TdHJhdGVneShwbGF0Zm9ybUxvY2F0aW9uU3RyYXRlZ3ksIGJhc2VIcmVmKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVGb3JSb290R3VhcmQocm91dGVyOiBSb3V0ZXIpOiBhbnkge1xuICBpZiAoKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiYgcm91dGVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgUm91dGVyTW9kdWxlLmZvclJvb3QoKSBjYWxsZWQgdHdpY2UuIExhenkgbG9hZGVkIG1vZHVsZXMgc2hvdWxkIHVzZSBSb3V0ZXJNb2R1bGUuZm9yQ2hpbGQoKSBpbnN0ZWFkLmApO1xuICB9XG4gIHJldHVybiAnZ3VhcmRlZCc7XG59XG5cbi8qKlxuICogUmVnaXN0ZXJzIGEgW0RJIHByb3ZpZGVyXShndWlkZS9nbG9zc2FyeSNwcm92aWRlcikgZm9yIGEgc2V0IG9mIHJvdXRlcy5cbiAqIEBwYXJhbSByb3V0ZXMgVGhlIHJvdXRlIGNvbmZpZ3VyYXRpb24gdG8gcHJvdmlkZS5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIGBgYFxuICogQE5nTW9kdWxlKHtcbiAqICAgaW1wb3J0czogW1JvdXRlck1vZHVsZS5mb3JDaGlsZChST1VURVMpXSxcbiAqICAgcHJvdmlkZXJzOiBbcHJvdmlkZVJvdXRlcyhFWFRSQV9ST1VURVMpXVxuICogfSlcbiAqIGNsYXNzIE15TmdNb2R1bGUge31cbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVSb3V0ZXMocm91dGVzOiBSb3V0ZXMpOiBhbnkge1xuICByZXR1cm4gW1xuICAgIHtwcm92aWRlOiBBTkFMWVpFX0ZPUl9FTlRSWV9DT01QT05FTlRTLCBtdWx0aTogdHJ1ZSwgdXNlVmFsdWU6IHJvdXRlc30sXG4gICAge3Byb3ZpZGU6IFJPVVRFUywgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiByb3V0ZXN9LFxuICBdO1xufVxuXG4vKipcbiAqIEFsbG93ZWQgdmFsdWVzIGluIGFuIGBFeHRyYU9wdGlvbnNgIG9iamVjdCB0aGF0IGNvbmZpZ3VyZVxuICogd2hlbiB0aGUgcm91dGVyIHBlcmZvcm1zIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gb3BlcmF0aW9uLlxuICpcbiAqICogJ2VuYWJsZWROb25CbG9ja2luZycgLSAoZGVmYXVsdCkgVGhlIGluaXRpYWwgbmF2aWdhdGlvbiBzdGFydHMgYWZ0ZXIgdGhlXG4gKiByb290IGNvbXBvbmVudCBoYXMgYmVlbiBjcmVhdGVkLiBUaGUgYm9vdHN0cmFwIGlzIG5vdCBibG9ja2VkIG9uIHRoZSBjb21wbGV0aW9uIG9mIHRoZSBpbml0aWFsXG4gKiBuYXZpZ2F0aW9uLlxuICogKiAnZW5hYmxlZEJsb2NraW5nJyAtIFRoZSBpbml0aWFsIG5hdmlnYXRpb24gc3RhcnRzIGJlZm9yZSB0aGUgcm9vdCBjb21wb25lbnQgaXMgY3JlYXRlZC5cbiAqIFRoZSBib290c3RyYXAgaXMgYmxvY2tlZCB1bnRpbCB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIGlzIGNvbXBsZXRlLiBUaGlzIHZhbHVlIGlzIHJlcXVpcmVkXG4gKiBmb3IgW3NlcnZlci1zaWRlIHJlbmRlcmluZ10oZ3VpZGUvdW5pdmVyc2FsKSB0byB3b3JrLlxuICogKiAnZGlzYWJsZWQnIC0gVGhlIGluaXRpYWwgbmF2aWdhdGlvbiBpcyBub3QgcGVyZm9ybWVkLiBUaGUgbG9jYXRpb24gbGlzdGVuZXIgaXMgc2V0IHVwIGJlZm9yZVxuICogdGhlIHJvb3QgY29tcG9uZW50IGdldHMgY3JlYXRlZC4gVXNlIGlmIHRoZXJlIGlzIGEgcmVhc29uIHRvIGhhdmVcbiAqIG1vcmUgY29udHJvbCBvdmVyIHdoZW4gdGhlIHJvdXRlciBzdGFydHMgaXRzIGluaXRpYWwgbmF2aWdhdGlvbiBkdWUgdG8gc29tZSBjb21wbGV4XG4gKiBpbml0aWFsaXphdGlvbiBsb2dpYy5cbiAqXG4gKiBUaGUgZm9sbG93aW5nIHZhbHVlcyBoYXZlIGJlZW4gW2RlcHJlY2F0ZWRdKGd1aWRlL3JlbGVhc2VzI2RlcHJlY2F0aW9uLXByYWN0aWNlcykgc2luY2UgdjExLFxuICogYW5kIHNob3VsZCBub3QgYmUgdXNlZCBmb3IgbmV3IGFwcGxpY2F0aW9ucy5cbiAqXG4gKiAqICdlbmFibGVkJyAtIFRoaXMgb3B0aW9uIGlzIDE6MSByZXBsYWNlYWJsZSB3aXRoIGBlbmFibGVkQmxvY2tpbmdgLlxuICpcbiAqIEBzZWUgYGZvclJvb3QoKWBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIEluaXRpYWxOYXZpZ2F0aW9uID0gJ2Rpc2FibGVkJ3wnZW5hYmxlZCd8J2VuYWJsZWRCbG9ja2luZyd8J2VuYWJsZWROb25CbG9ja2luZyc7XG5cbi8qKlxuICogQSBzZXQgb2YgY29uZmlndXJhdGlvbiBvcHRpb25zIGZvciBhIHJvdXRlciBtb2R1bGUsIHByb3ZpZGVkIGluIHRoZVxuICogYGZvclJvb3QoKWAgbWV0aG9kLlxuICpcbiAqIEBzZWUgYGZvclJvb3QoKWBcbiAqXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEV4dHJhT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBXaGVuIHRydWUsIGxvZyBhbGwgaW50ZXJuYWwgbmF2aWdhdGlvbiBldmVudHMgdG8gdGhlIGNvbnNvbGUuXG4gICAqIFVzZSBmb3IgZGVidWdnaW5nLlxuICAgKi9cbiAgZW5hYmxlVHJhY2luZz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZW4gdHJ1ZSwgZW5hYmxlIHRoZSBsb2NhdGlvbiBzdHJhdGVneSB0aGF0IHVzZXMgdGhlIFVSTCBmcmFnbWVudFxuICAgKiBpbnN0ZWFkIG9mIHRoZSBoaXN0b3J5IEFQSS5cbiAgICovXG4gIHVzZUhhc2g/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBPbmUgb2YgYGVuYWJsZWRgLCBgZW5hYmxlZEJsb2NraW5nYCwgYGVuYWJsZWROb25CbG9ja2luZ2Agb3IgYGRpc2FibGVkYC5cbiAgICogV2hlbiBzZXQgdG8gYGVuYWJsZWRgIG9yIGBlbmFibGVkQmxvY2tpbmdgLCB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIHN0YXJ0cyBiZWZvcmUgdGhlIHJvb3RcbiAgICogY29tcG9uZW50IGlzIGNyZWF0ZWQuIFRoZSBib290c3RyYXAgaXMgYmxvY2tlZCB1bnRpbCB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIGlzIGNvbXBsZXRlLiBUaGlzXG4gICAqIHZhbHVlIGlzIHJlcXVpcmVkIGZvciBbc2VydmVyLXNpZGUgcmVuZGVyaW5nXShndWlkZS91bml2ZXJzYWwpIHRvIHdvcmsuIFdoZW4gc2V0IHRvXG4gICAqIGBlbmFibGVkTm9uQmxvY2tpbmdgLCB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIHN0YXJ0cyBhZnRlciB0aGUgcm9vdCBjb21wb25lbnQgaGFzIGJlZW4gY3JlYXRlZC5cbiAgICogVGhlIGJvb3RzdHJhcCBpcyBub3QgYmxvY2tlZCBvbiB0aGUgY29tcGxldGlvbiBvZiB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLiBXaGVuIHNldCB0b1xuICAgKiBgZGlzYWJsZWRgLCB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIGlzIG5vdCBwZXJmb3JtZWQuIFRoZSBsb2NhdGlvbiBsaXN0ZW5lciBpcyBzZXQgdXAgYmVmb3JlIHRoZVxuICAgKiByb290IGNvbXBvbmVudCBnZXRzIGNyZWF0ZWQuIFVzZSBpZiB0aGVyZSBpcyBhIHJlYXNvbiB0byBoYXZlIG1vcmUgY29udHJvbCBvdmVyIHdoZW4gdGhlIHJvdXRlclxuICAgKiBzdGFydHMgaXRzIGluaXRpYWwgbmF2aWdhdGlvbiBkdWUgdG8gc29tZSBjb21wbGV4IGluaXRpYWxpemF0aW9uIGxvZ2ljLlxuICAgKi9cbiAgaW5pdGlhbE5hdmlnYXRpb24/OiBJbml0aWFsTmF2aWdhdGlvbjtcblxuICAvKipcbiAgICogQSBjdXN0b20gZXJyb3IgaGFuZGxlciBmb3IgZmFpbGVkIG5hdmlnYXRpb25zLlxuICAgKiBJZiB0aGUgaGFuZGxlciByZXR1cm5zIGEgdmFsdWUsIHRoZSBuYXZpZ2F0aW9uIFByb21pc2UgaXMgcmVzb2x2ZWQgd2l0aCB0aGlzIHZhbHVlLlxuICAgKiBJZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLCB0aGUgbmF2aWdhdGlvbiBQcm9taXNlIGlzIHJlamVjdGVkIHdpdGggdGhlIGV4Y2VwdGlvbi5cbiAgICpcbiAgICovXG4gIGVycm9ySGFuZGxlcj86IEVycm9ySGFuZGxlcjtcblxuICAvKipcbiAgICogQ29uZmlndXJlcyBhIHByZWxvYWRpbmcgc3RyYXRlZ3kuXG4gICAqIE9uZSBvZiBgUHJlbG9hZEFsbE1vZHVsZXNgIG9yIGBOb1ByZWxvYWRpbmdgICh0aGUgZGVmYXVsdCkuXG4gICAqL1xuICBwcmVsb2FkaW5nU3RyYXRlZ3k/OiBhbnk7XG5cbiAgLyoqXG4gICAqIERlZmluZSB3aGF0IHRoZSByb3V0ZXIgc2hvdWxkIGRvIGlmIGl0IHJlY2VpdmVzIGEgbmF2aWdhdGlvbiByZXF1ZXN0IHRvIHRoZSBjdXJyZW50IFVSTC5cbiAgICogRGVmYXVsdCBpcyBgaWdub3JlYCwgd2hpY2ggY2F1c2VzIHRoZSByb3V0ZXIgaWdub3JlcyB0aGUgbmF2aWdhdGlvbi5cbiAgICogVGhpcyBjYW4gZGlzYWJsZSBmZWF0dXJlcyBzdWNoIGFzIGEgXCJyZWZyZXNoXCIgYnV0dG9uLlxuICAgKiBVc2UgdGhpcyBvcHRpb24gdG8gY29uZmlndXJlIHRoZSBiZWhhdmlvciB3aGVuIG5hdmlnYXRpbmcgdG8gdGhlXG4gICAqIGN1cnJlbnQgVVJMLiBEZWZhdWx0IGlzICdpZ25vcmUnLlxuICAgKi9cbiAgb25TYW1lVXJsTmF2aWdhdGlvbj86ICdyZWxvYWQnfCdpZ25vcmUnO1xuXG4gIC8qKlxuICAgKiBDb25maWd1cmVzIGlmIHRoZSBzY3JvbGwgcG9zaXRpb24gbmVlZHMgdG8gYmUgcmVzdG9yZWQgd2hlbiBuYXZpZ2F0aW5nIGJhY2suXG4gICAqXG4gICAqICogJ2Rpc2FibGVkJy0gKERlZmF1bHQpIERvZXMgbm90aGluZy4gU2Nyb2xsIHBvc2l0aW9uIGlzIG1haW50YWluZWQgb24gbmF2aWdhdGlvbi5cbiAgICogKiAndG9wJy0gU2V0cyB0aGUgc2Nyb2xsIHBvc2l0aW9uIHRvIHggPSAwLCB5ID0gMCBvbiBhbGwgbmF2aWdhdGlvbi5cbiAgICogKiAnZW5hYmxlZCctIFJlc3RvcmVzIHRoZSBwcmV2aW91cyBzY3JvbGwgcG9zaXRpb24gb24gYmFja3dhcmQgbmF2aWdhdGlvbiwgZWxzZSBzZXRzIHRoZVxuICAgKiBwb3NpdGlvbiB0byB0aGUgYW5jaG9yIGlmIG9uZSBpcyBwcm92aWRlZCwgb3Igc2V0cyB0aGUgc2Nyb2xsIHBvc2l0aW9uIHRvIFswLCAwXSAoZm9yd2FyZFxuICAgKiBuYXZpZ2F0aW9uKS4gVGhpcyBvcHRpb24gd2lsbCBiZSB0aGUgZGVmYXVsdCBpbiB0aGUgZnV0dXJlLlxuICAgKlxuICAgKiBZb3UgY2FuIGltcGxlbWVudCBjdXN0b20gc2Nyb2xsIHJlc3RvcmF0aW9uIGJlaGF2aW9yIGJ5IGFkYXB0aW5nIHRoZSBlbmFibGVkIGJlaGF2aW9yIGFzXG4gICAqIGluIHRoZSBmb2xsb3dpbmcgZXhhbXBsZS5cbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBjbGFzcyBBcHBNb2R1bGUge1xuICAgKiAgIGNvbnN0cnVjdG9yKHJvdXRlcjogUm91dGVyLCB2aWV3cG9ydFNjcm9sbGVyOiBWaWV3cG9ydFNjcm9sbGVyKSB7XG4gICAqICAgICByb3V0ZXIuZXZlbnRzLnBpcGUoXG4gICAqICAgICAgIGZpbHRlcigoZTogRXZlbnQpOiBlIGlzIFNjcm9sbCA9PiBlIGluc3RhbmNlb2YgU2Nyb2xsKVxuICAgKiAgICAgKS5zdWJzY3JpYmUoZSA9PiB7XG4gICAqICAgICAgIGlmIChlLnBvc2l0aW9uKSB7XG4gICAqICAgICAgICAgLy8gYmFja3dhcmQgbmF2aWdhdGlvblxuICAgKiAgICAgICAgIHZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9Qb3NpdGlvbihlLnBvc2l0aW9uKTtcbiAgICogICAgICAgfSBlbHNlIGlmIChlLmFuY2hvcikge1xuICAgKiAgICAgICAgIC8vIGFuY2hvciBuYXZpZ2F0aW9uXG4gICAqICAgICAgICAgdmlld3BvcnRTY3JvbGxlci5zY3JvbGxUb0FuY2hvcihlLmFuY2hvcik7XG4gICAqICAgICAgIH0gZWxzZSB7XG4gICAqICAgICAgICAgLy8gZm9yd2FyZCBuYXZpZ2F0aW9uXG4gICAqICAgICAgICAgdmlld3BvcnRTY3JvbGxlci5zY3JvbGxUb1Bvc2l0aW9uKFswLCAwXSk7XG4gICAqICAgICAgIH1cbiAgICogICAgIH0pO1xuICAgKiAgIH1cbiAgICogfVxuICAgKiBgYGBcbiAgICovXG4gIHNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb24/OiAnZGlzYWJsZWQnfCdlbmFibGVkJ3wndG9wJztcblxuICAvKipcbiAgICogV2hlbiBzZXQgdG8gJ2VuYWJsZWQnLCBzY3JvbGxzIHRvIHRoZSBhbmNob3IgZWxlbWVudCB3aGVuIHRoZSBVUkwgaGFzIGEgZnJhZ21lbnQuXG4gICAqIEFuY2hvciBzY3JvbGxpbmcgaXMgZGlzYWJsZWQgYnkgZGVmYXVsdC5cbiAgICpcbiAgICogQW5jaG9yIHNjcm9sbGluZyBkb2VzIG5vdCBoYXBwZW4gb24gJ3BvcHN0YXRlJy4gSW5zdGVhZCwgd2UgcmVzdG9yZSB0aGUgcG9zaXRpb25cbiAgICogdGhhdCB3ZSBzdG9yZWQgb3Igc2Nyb2xsIHRvIHRoZSB0b3AuXG4gICAqL1xuICBhbmNob3JTY3JvbGxpbmc/OiAnZGlzYWJsZWQnfCdlbmFibGVkJztcblxuICAvKipcbiAgICogQ29uZmlndXJlcyB0aGUgc2Nyb2xsIG9mZnNldCB0aGUgcm91dGVyIHdpbGwgdXNlIHdoZW4gc2Nyb2xsaW5nIHRvIGFuIGVsZW1lbnQuXG4gICAqXG4gICAqIFdoZW4gZ2l2ZW4gYSB0dXBsZSB3aXRoIHggYW5kIHkgcG9zaXRpb24gdmFsdWUsXG4gICAqIHRoZSByb3V0ZXIgdXNlcyB0aGF0IG9mZnNldCBlYWNoIHRpbWUgaXQgc2Nyb2xscy5cbiAgICogV2hlbiBnaXZlbiBhIGZ1bmN0aW9uLCB0aGUgcm91dGVyIGludm9rZXMgdGhlIGZ1bmN0aW9uIGV2ZXJ5IHRpbWVcbiAgICogaXQgcmVzdG9yZXMgc2Nyb2xsIHBvc2l0aW9uLlxuICAgKi9cbiAgc2Nyb2xsT2Zmc2V0PzogW251bWJlciwgbnVtYmVyXXwoKCkgPT4gW251bWJlciwgbnVtYmVyXSk7XG5cbiAgLyoqXG4gICAqIERlZmluZXMgaG93IHRoZSByb3V0ZXIgbWVyZ2VzIHBhcmFtZXRlcnMsIGRhdGEsIGFuZCByZXNvbHZlZCBkYXRhIGZyb20gcGFyZW50IHRvIGNoaWxkXG4gICAqIHJvdXRlcy4gQnkgZGVmYXVsdCAoJ2VtcHR5T25seScpLCBpbmhlcml0cyBwYXJlbnQgcGFyYW1ldGVycyBvbmx5IGZvclxuICAgKiBwYXRoLWxlc3Mgb3IgY29tcG9uZW50LWxlc3Mgcm91dGVzLlxuICAgKlxuICAgKiBTZXQgdG8gJ2Fsd2F5cycgdG8gZW5hYmxlIHVuY29uZGl0aW9uYWwgaW5oZXJpdGFuY2Ugb2YgcGFyZW50IHBhcmFtZXRlcnMuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB3aGVuIGRlYWxpbmcgd2l0aCBtYXRyaXggcGFyYW1ldGVycywgXCJwYXJlbnRcIiByZWZlcnMgdG8gdGhlIHBhcmVudCBgUm91dGVgXG4gICAqIGNvbmZpZyB3aGljaCBkb2VzIG5vdCBuZWNlc3NhcmlseSBtZWFuIHRoZSBcIlVSTCBzZWdtZW50IHRvIHRoZSBsZWZ0XCIuIFdoZW4gdGhlIGBSb3V0ZWAgYHBhdGhgXG4gICAqIGNvbnRhaW5zIG11bHRpcGxlIHNlZ21lbnRzLCB0aGUgbWF0cml4IHBhcmFtZXRlcnMgbXVzdCBhcHBlYXIgb24gdGhlIGxhc3Qgc2VnbWVudC4gRm9yIGV4YW1wbGUsXG4gICAqIG1hdHJpeCBwYXJhbWV0ZXJzIGZvciBge3BhdGg6ICdhL2InLCBjb21wb25lbnQ6IE15Q29tcH1gIHNob3VsZCBhcHBlYXIgYXMgYGEvYjtmb289YmFyYCBhbmQgbm90XG4gICAqIGBhO2Zvbz1iYXIvYmAuXG4gICAqXG4gICAqL1xuICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5PzogJ2VtcHR5T25seSd8J2Fsd2F5cyc7XG5cbiAgLyoqXG4gICAqIEEgY3VzdG9tIGhhbmRsZXIgZm9yIG1hbGZvcm1lZCBVUkkgZXJyb3JzLiBUaGUgaGFuZGxlciBpcyBpbnZva2VkIHdoZW4gYGVuY29kZWRVUklgIGNvbnRhaW5zXG4gICAqIGludmFsaWQgY2hhcmFjdGVyIHNlcXVlbmNlcy5cbiAgICogVGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gaXMgdG8gcmVkaXJlY3QgdG8gdGhlIHJvb3QgVVJMLCBkcm9wcGluZ1xuICAgKiBhbnkgcGF0aCBvciBwYXJhbWV0ZXIgaW5mb3JtYXRpb24uIFRoZSBmdW5jdGlvbiB0YWtlcyB0aHJlZSBwYXJhbWV0ZXJzOlxuICAgKlxuICAgKiAtIGAnVVJJRXJyb3InYCAtIEVycm9yIHRocm93biB3aGVuIHBhcnNpbmcgYSBiYWQgVVJMLlxuICAgKiAtIGAnVXJsU2VyaWFsaXplcidgIC0gVXJsU2VyaWFsaXplciB0aGF04oCZcyBjb25maWd1cmVkIHdpdGggdGhlIHJvdXRlci5cbiAgICogLSBgJ3VybCdgIC0gIFRoZSBtYWxmb3JtZWQgVVJMIHRoYXQgY2F1c2VkIHRoZSBVUklFcnJvclxuICAgKiAqL1xuICBtYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI/OlxuICAgICAgKGVycm9yOiBVUklFcnJvciwgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgdXJsOiBzdHJpbmcpID0+IFVybFRyZWU7XG5cbiAgLyoqXG4gICAqIERlZmluZXMgd2hlbiB0aGUgcm91dGVyIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMLiBCeSBkZWZhdWx0ICgnZGVmZXJyZWQnKSxcbiAgICogdXBkYXRlIGFmdGVyIHN1Y2Nlc3NmdWwgbmF2aWdhdGlvbi5cbiAgICogU2V0IHRvICdlYWdlcicgaWYgcHJlZmVyIHRvIHVwZGF0ZSB0aGUgVVJMIGF0IHRoZSBiZWdpbm5pbmcgb2YgbmF2aWdhdGlvbi5cbiAgICogVXBkYXRpbmcgdGhlIFVSTCBlYXJseSBhbGxvd3MgeW91IHRvIGhhbmRsZSBhIGZhaWx1cmUgb2YgbmF2aWdhdGlvbiBieVxuICAgKiBzaG93aW5nIGFuIGVycm9yIG1lc3NhZ2Ugd2l0aCB0aGUgVVJMIHRoYXQgZmFpbGVkLlxuICAgKi9cbiAgdXJsVXBkYXRlU3RyYXRlZ3k/OiAnZGVmZXJyZWQnfCdlYWdlcic7XG5cbiAgLyoqXG4gICAqIEVuYWJsZXMgYSBidWcgZml4IHRoYXQgY29ycmVjdHMgcmVsYXRpdmUgbGluayByZXNvbHV0aW9uIGluIGNvbXBvbmVudHMgd2l0aCBlbXB0eSBwYXRocy5cbiAgICogRXhhbXBsZTpcbiAgICpcbiAgICogYGBgXG4gICAqIGNvbnN0IHJvdXRlcyA9IFtcbiAgICogICB7XG4gICAqICAgICBwYXRoOiAnJyxcbiAgICogICAgIGNvbXBvbmVudDogQ29udGFpbmVyQ29tcG9uZW50LFxuICAgKiAgICAgY2hpbGRyZW46IFtcbiAgICogICAgICAgeyBwYXRoOiAnYScsIGNvbXBvbmVudDogQUNvbXBvbmVudCB9LFxuICAgKiAgICAgICB7IHBhdGg6ICdiJywgY29tcG9uZW50OiBCQ29tcG9uZW50IH0sXG4gICAqICAgICBdXG4gICAqICAgfVxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogRnJvbSB0aGUgYENvbnRhaW5lckNvbXBvbmVudGAsIHlvdSBzaG91bGQgYmUgYWJsZSB0byBuYXZpZ2F0ZSB0byBgQUNvbXBvbmVudGAgdXNpbmdcbiAgICogdGhlIGZvbGxvd2luZyBgcm91dGVyTGlua2AsIGJ1dCBpdCB3aWxsIG5vdCB3b3JrIGlmIGByZWxhdGl2ZUxpbmtSZXNvbHV0aW9uYCBpcyBzZXRcbiAgICogdG8gYCdsZWdhY3knYDpcbiAgICpcbiAgICogYDxhIFtyb3V0ZXJMaW5rXT1cIlsnLi9hJ11cIj5MaW5rIHRvIEE8L2E+YFxuICAgKlxuICAgKiBIb3dldmVyLCB0aGlzIHdpbGwgd29yazpcbiAgICpcbiAgICogYDxhIFtyb3V0ZXJMaW5rXT1cIlsnLi4vYSddXCI+TGluayB0byBBPC9hPmBcbiAgICpcbiAgICogSW4gb3RoZXIgd29yZHMsIHlvdSdyZSByZXF1aXJlZCB0byB1c2UgYC4uL2AgcmF0aGVyIHRoYW4gYC4vYCB3aGVuIHRoZSByZWxhdGl2ZSBsaW5rXG4gICAqIHJlc29sdXRpb24gaXMgc2V0IHRvIGAnbGVnYWN5J2AuXG4gICAqXG4gICAqIFRoZSBkZWZhdWx0IGluIHYxMSBpcyBgY29ycmVjdGVkYC5cbiAgICovXG4gIHJlbGF0aXZlTGlua1Jlc29sdXRpb24/OiAnbGVnYWN5J3wnY29ycmVjdGVkJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwUm91dGVyKFxuICAgIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIGNvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLCBsb2NhdGlvbjogTG9jYXRpb24sXG4gICAgaW5qZWN0b3I6IEluamVjdG9yLCBsb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLCBjb25maWc6IFJvdXRlW11bXSxcbiAgICBvcHRzOiBFeHRyYU9wdGlvbnMgPSB7fSwgdXJsSGFuZGxpbmdTdHJhdGVneT86IFVybEhhbmRsaW5nU3RyYXRlZ3ksXG4gICAgcm91dGVSZXVzZVN0cmF0ZWd5PzogUm91dGVSZXVzZVN0cmF0ZWd5KSB7XG4gIGNvbnN0IHJvdXRlciA9IG5ldyBSb3V0ZXIoXG4gICAgICBudWxsLCB1cmxTZXJpYWxpemVyLCBjb250ZXh0cywgbG9jYXRpb24sIGluamVjdG9yLCBsb2FkZXIsIGNvbXBpbGVyLCBmbGF0dGVuKGNvbmZpZykpO1xuXG4gIGlmICh1cmxIYW5kbGluZ1N0cmF0ZWd5KSB7XG4gICAgcm91dGVyLnVybEhhbmRsaW5nU3RyYXRlZ3kgPSB1cmxIYW5kbGluZ1N0cmF0ZWd5O1xuICB9XG5cbiAgaWYgKHJvdXRlUmV1c2VTdHJhdGVneSkge1xuICAgIHJvdXRlci5yb3V0ZVJldXNlU3RyYXRlZ3kgPSByb3V0ZVJldXNlU3RyYXRlZ3k7XG4gIH1cblxuICBhc3NpZ25FeHRyYU9wdGlvbnNUb1JvdXRlcihvcHRzLCByb3V0ZXIpO1xuXG4gIGlmIChvcHRzLmVuYWJsZVRyYWNpbmcpIHtcbiAgICByb3V0ZXIuZXZlbnRzLnN1YnNjcmliZSgoZTogRXZlbnQpID0+IHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZ3JvdXA/LihgUm91dGVyIEV2ZW50OiAkeyg8YW55PmUuY29uc3RydWN0b3IpLm5hbWV9YCk7XG4gICAgICBjb25zb2xlLmxvZyhlLnRvU3RyaW5nKCkpO1xuICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICBjb25zb2xlLmdyb3VwRW5kPy4oKTtcbiAgICAgIC8vIHRzbGludDplbmFibGU6bm8tY29uc29sZVxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHJvdXRlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2lnbkV4dHJhT3B0aW9uc1RvUm91dGVyKG9wdHM6IEV4dHJhT3B0aW9ucywgcm91dGVyOiBSb3V0ZXIpOiB2b2lkIHtcbiAgaWYgKG9wdHMuZXJyb3JIYW5kbGVyKSB7XG4gICAgcm91dGVyLmVycm9ySGFuZGxlciA9IG9wdHMuZXJyb3JIYW5kbGVyO1xuICB9XG5cbiAgaWYgKG9wdHMubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyKSB7XG4gICAgcm91dGVyLm1hbGZvcm1lZFVyaUVycm9ySGFuZGxlciA9IG9wdHMubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyO1xuICB9XG5cbiAgaWYgKG9wdHMub25TYW1lVXJsTmF2aWdhdGlvbikge1xuICAgIHJvdXRlci5vblNhbWVVcmxOYXZpZ2F0aW9uID0gb3B0cy5vblNhbWVVcmxOYXZpZ2F0aW9uO1xuICB9XG5cbiAgaWYgKG9wdHMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSkge1xuICAgIHJvdXRlci5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5ID0gb3B0cy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5O1xuICB9XG5cbiAgaWYgKG9wdHMucmVsYXRpdmVMaW5rUmVzb2x1dGlvbikge1xuICAgIHJvdXRlci5yZWxhdGl2ZUxpbmtSZXNvbHV0aW9uID0gb3B0cy5yZWxhdGl2ZUxpbmtSZXNvbHV0aW9uO1xuICB9XG5cbiAgaWYgKG9wdHMudXJsVXBkYXRlU3RyYXRlZ3kpIHtcbiAgICByb3V0ZXIudXJsVXBkYXRlU3RyYXRlZ3kgPSBvcHRzLnVybFVwZGF0ZVN0cmF0ZWd5O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByb290Um91dGUocm91dGVyOiBSb3V0ZXIpOiBBY3RpdmF0ZWRSb3V0ZSB7XG4gIHJldHVybiByb3V0ZXIucm91dGVyU3RhdGUucm9vdDtcbn1cblxuLyoqXG4gKiBSb3V0ZXIgaW5pdGlhbGl6YXRpb24gcmVxdWlyZXMgdHdvIHN0ZXBzOlxuICpcbiAqIEZpcnN0LCB3ZSBzdGFydCB0aGUgbmF2aWdhdGlvbiBpbiBhIGBBUFBfSU5JVElBTElaRVJgIHRvIGJsb2NrIHRoZSBib290c3RyYXAgaWZcbiAqIGEgcmVzb2x2ZXIgb3IgYSBndWFyZCBleGVjdXRlcyBhc3luY2hyb25vdXNseS5cbiAqXG4gKiBOZXh0LCB3ZSBhY3R1YWxseSBydW4gYWN0aXZhdGlvbiBpbiBhIGBCT09UU1RSQVBfTElTVEVORVJgLCB1c2luZyB0aGVcbiAqIGBhZnRlclByZWFjdGl2YXRpb25gIGhvb2sgcHJvdmlkZWQgYnkgdGhlIHJvdXRlci5cbiAqIFRoZSByb3V0ZXIgbmF2aWdhdGlvbiBzdGFydHMsIHJlYWNoZXMgdGhlIHBvaW50IHdoZW4gcHJlYWN0aXZhdGlvbiBpcyBkb25lLCBhbmQgdGhlblxuICogcGF1c2VzLiBJdCB3YWl0cyBmb3IgdGhlIGhvb2sgdG8gYmUgcmVzb2x2ZWQuIFdlIHRoZW4gcmVzb2x2ZSBpdCBvbmx5IGluIGEgYm9vdHN0cmFwIGxpc3RlbmVyLlxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgUm91dGVySW5pdGlhbGl6ZXIge1xuICBwcml2YXRlIGluaXROYXZpZ2F0aW9uOiBib29sZWFuID0gZmFsc2U7XG4gIHByaXZhdGUgcmVzdWx0T2ZQcmVhY3RpdmF0aW9uRG9uZSA9IG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBpbmplY3RvcjogSW5qZWN0b3IpIHt9XG5cbiAgYXBwSW5pdGlhbGl6ZXIoKTogUHJvbWlzZTxhbnk+IHtcbiAgICBjb25zdCBwOiBQcm9taXNlPGFueT4gPSB0aGlzLmluamVjdG9yLmdldChMT0NBVElPTl9JTklUSUFMSVpFRCwgUHJvbWlzZS5yZXNvbHZlKG51bGwpKTtcbiAgICByZXR1cm4gcC50aGVuKCgpID0+IHtcbiAgICAgIGxldCByZXNvbHZlOiBGdW5jdGlvbiA9IG51bGwhO1xuICAgICAgY29uc3QgcmVzID0gbmV3IFByb21pc2UociA9PiByZXNvbHZlID0gcik7XG4gICAgICBjb25zdCByb3V0ZXIgPSB0aGlzLmluamVjdG9yLmdldChSb3V0ZXIpO1xuICAgICAgY29uc3Qgb3B0cyA9IHRoaXMuaW5qZWN0b3IuZ2V0KFJPVVRFUl9DT05GSUdVUkFUSU9OKTtcblxuICAgICAgaWYgKG9wdHMuaW5pdGlhbE5hdmlnYXRpb24gPT09ICdkaXNhYmxlZCcpIHtcbiAgICAgICAgcm91dGVyLnNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpO1xuICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAvLyBUT0RPOiBlbmFibGVkIGlzIGRlcHJlY2F0ZWQgYXMgb2YgdjExLCBjYW4gYmUgcmVtb3ZlZCBpbiB2MTNcbiAgICAgICAgICBvcHRzLmluaXRpYWxOYXZpZ2F0aW9uID09PSAnZW5hYmxlZCcgfHwgb3B0cy5pbml0aWFsTmF2aWdhdGlvbiA9PT0gJ2VuYWJsZWRCbG9ja2luZycpIHtcbiAgICAgICAgcm91dGVyLmhvb2tzLmFmdGVyUHJlYWN0aXZhdGlvbiA9ICgpID0+IHtcbiAgICAgICAgICAvLyBvbmx5IHRoZSBpbml0aWFsIG5hdmlnYXRpb24gc2hvdWxkIGJlIGRlbGF5ZWRcbiAgICAgICAgICBpZiAoIXRoaXMuaW5pdE5hdmlnYXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMuaW5pdE5hdmlnYXRpb24gPSB0cnVlO1xuICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlc3VsdE9mUHJlYWN0aXZhdGlvbkRvbmU7XG5cbiAgICAgICAgICAgIC8vIHN1YnNlcXVlbnQgbmF2aWdhdGlvbnMgc2hvdWxkIG5vdCBiZSBkZWxheWVkXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBvZihudWxsKSBhcyBhbnk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByb3V0ZXIuaW5pdGlhbE5hdmlnYXRpb24oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXM7XG4gICAgfSk7XG4gIH1cblxuICBib290c3RyYXBMaXN0ZW5lcihib290c3RyYXBwZWRDb21wb25lbnRSZWY6IENvbXBvbmVudFJlZjxhbnk+KTogdm9pZCB7XG4gICAgY29uc3Qgb3B0cyA9IHRoaXMuaW5qZWN0b3IuZ2V0KFJPVVRFUl9DT05GSUdVUkFUSU9OKTtcbiAgICBjb25zdCBwcmVsb2FkZXIgPSB0aGlzLmluamVjdG9yLmdldChSb3V0ZXJQcmVsb2FkZXIpO1xuICAgIGNvbnN0IHJvdXRlclNjcm9sbGVyID0gdGhpcy5pbmplY3Rvci5nZXQoUm91dGVyU2Nyb2xsZXIpO1xuICAgIGNvbnN0IHJvdXRlciA9IHRoaXMuaW5qZWN0b3IuZ2V0KFJvdXRlcik7XG4gICAgY29uc3QgcmVmID0gdGhpcy5pbmplY3Rvci5nZXQ8QXBwbGljYXRpb25SZWY+KEFwcGxpY2F0aW9uUmVmKTtcblxuICAgIGlmIChib290c3RyYXBwZWRDb21wb25lbnRSZWYgIT09IHJlZi5jb21wb25lbnRzWzBdKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gRGVmYXVsdCBjYXNlXG4gICAgaWYgKG9wdHMuaW5pdGlhbE5hdmlnYXRpb24gPT09ICdlbmFibGVkTm9uQmxvY2tpbmcnIHx8IG9wdHMuaW5pdGlhbE5hdmlnYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcm91dGVyLmluaXRpYWxOYXZpZ2F0aW9uKCk7XG4gICAgfVxuXG4gICAgcHJlbG9hZGVyLnNldFVwUHJlbG9hZGluZygpO1xuICAgIHJvdXRlclNjcm9sbGVyLmluaXQoKTtcbiAgICByb3V0ZXIucmVzZXRSb290Q29tcG9uZW50VHlwZShyZWYuY29tcG9uZW50VHlwZXNbMF0pO1xuICAgIHRoaXMucmVzdWx0T2ZQcmVhY3RpdmF0aW9uRG9uZS5uZXh0KG51bGwhKTtcbiAgICB0aGlzLnJlc3VsdE9mUHJlYWN0aXZhdGlvbkRvbmUuY29tcGxldGUoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBwSW5pdGlhbGl6ZXIocjogUm91dGVySW5pdGlhbGl6ZXIpIHtcbiAgcmV0dXJuIHIuYXBwSW5pdGlhbGl6ZXIuYmluZChyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEJvb3RzdHJhcExpc3RlbmVyKHI6IFJvdXRlckluaXRpYWxpemVyKSB7XG4gIHJldHVybiByLmJvb3RzdHJhcExpc3RlbmVyLmJpbmQocik7XG59XG5cbi8qKlxuICogQSBbREkgdG9rZW5dKGd1aWRlL2dsb3NzYXJ5LyNkaS10b2tlbikgZm9yIHRoZSByb3V0ZXIgaW5pdGlhbGl6ZXIgdGhhdFxuICogaXMgY2FsbGVkIGFmdGVyIHRoZSBhcHAgaXMgYm9vdHN0cmFwcGVkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9JTklUSUFMSVpFUiA9XG4gICAgbmV3IEluamVjdGlvblRva2VuPChjb21wUmVmOiBDb21wb25lbnRSZWY8YW55PikgPT4gdm9pZD4oJ1JvdXRlciBJbml0aWFsaXplcicpO1xuXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZVJvdXRlckluaXRpYWxpemVyKCk6IFJlYWRvbmx5QXJyYXk8UHJvdmlkZXI+IHtcbiAgcmV0dXJuIFtcbiAgICBSb3V0ZXJJbml0aWFsaXplcixcbiAgICB7XG4gICAgICBwcm92aWRlOiBBUFBfSU5JVElBTElaRVIsXG4gICAgICBtdWx0aTogdHJ1ZSxcbiAgICAgIHVzZUZhY3Rvcnk6IGdldEFwcEluaXRpYWxpemVyLFxuICAgICAgZGVwczogW1JvdXRlckluaXRpYWxpemVyXVxuICAgIH0sXG4gICAge3Byb3ZpZGU6IFJPVVRFUl9JTklUSUFMSVpFUiwgdXNlRmFjdG9yeTogZ2V0Qm9vdHN0cmFwTGlzdGVuZXIsIGRlcHM6IFtSb3V0ZXJJbml0aWFsaXplcl19LFxuICAgIHtwcm92aWRlOiBBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLCBtdWx0aTogdHJ1ZSwgdXNlRXhpc3Rpbmc6IFJPVVRFUl9JTklUSUFMSVpFUn0sXG4gIF07XG59XG4iXX0=