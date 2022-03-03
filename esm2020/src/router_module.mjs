/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { APP_BASE_HREF, HashLocationStrategy, Location, LOCATION_INITIALIZED, LocationStrategy, PathLocationStrategy, PlatformLocation, ViewportScroller } from '@angular/common';
import { ANALYZE_FOR_ENTRY_COMPONENTS, APP_BOOTSTRAP_LISTENER, APP_INITIALIZER, ApplicationRef, Compiler, Inject, Injectable, InjectionToken, Injector, NgModule, NgProbeToken, Optional, SkipSelf } from '@angular/core';
import { of, Subject } from 'rxjs';
import { EmptyOutletComponent } from './components/empty_outlet';
import { RouterLink, RouterLinkWithHref } from './directives/router_link';
import { RouterLinkActive } from './directives/router_link_active';
import { RouterOutlet } from './directives/router_outlet';
import { DefaultTitleStrategy, TitleStrategy } from './page_title_strategy';
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
            UrlSerializer, ChildrenOutletContexts, Location, Injector, Compiler, ROUTES,
            ROUTER_CONFIGURATION, DefaultTitleStrategy, [TitleStrategy, new Optional()],
            [UrlHandlingStrategy, new Optional()], [RouteReuseStrategy, new Optional()]
        ]
    },
    ChildrenOutletContexts,
    { provide: ActivatedRoute, useFactory: rootRoute, deps: [Router] },
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
RouterModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.0.0-next.5+3.sha-b437d12", ngImport: i0, type: RouterModule, deps: [{ token: ROUTER_FORROOT_GUARD, optional: true }, { token: i1.Router, optional: true }], target: i0.ɵɵFactoryTarget.NgModule });
RouterModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "12.0.0", version: "14.0.0-next.5+3.sha-b437d12", ngImport: i0, type: RouterModule, declarations: [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive, EmptyOutletComponent], exports: [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive, EmptyOutletComponent] });
RouterModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "14.0.0-next.5+3.sha-b437d12", ngImport: i0, type: RouterModule });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.0.0-next.5+3.sha-b437d12", ngImport: i0, type: RouterModule, decorators: [{
            type: NgModule,
            args: [{
                    declarations: ROUTER_DIRECTIVES,
                    exports: ROUTER_DIRECTIVES,
                }]
        }], ctorParameters: function () { return [{ type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [ROUTER_FORROOT_GUARD]
                }] }, { type: i1.Router, decorators: [{
                    type: Optional
                }] }]; } });
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
export function setupRouter(urlSerializer, contexts, location, injector, compiler, config, opts = {}, defaultTitleStrategy, titleStrategy, urlHandlingStrategy, routeReuseStrategy) {
    const router = new Router(null, urlSerializer, contexts, location, injector, compiler, flatten(config));
    if (urlHandlingStrategy) {
        router.urlHandlingStrategy = urlHandlingStrategy;
    }
    if (routeReuseStrategy) {
        router.routeReuseStrategy = routeReuseStrategy;
    }
    router.titleStrategy = titleStrategy ?? defaultTitleStrategy;
    assignExtraOptionsToRouter(opts, router);
    if (opts.enableTracing) {
        router.events.subscribe((e) => {
            // tslint:disable:no-console
            console.group?.(`Router Event: ${e.constructor.name}`);
            console.log(e.toString());
            console.log(e);
            console.groupEnd?.();
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
    if (opts.canceledNavigationResolution) {
        router.canceledNavigationResolution = opts.canceledNavigationResolution;
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
        this.destroyed = false;
        this.resultOfPreactivationDone = new Subject();
    }
    appInitializer() {
        const p = this.injector.get(LOCATION_INITIALIZED, Promise.resolve(null));
        return p.then(() => {
            // If the injector was destroyed, the DI lookups below will fail.
            if (this.destroyed) {
                return Promise.resolve(true);
            }
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
    ngOnDestroy() {
        this.destroyed = true;
    }
}
RouterInitializer.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.0.0-next.5+3.sha-b437d12", ngImport: i0, type: RouterInitializer, deps: [{ token: i0.Injector }], target: i0.ɵɵFactoryTarget.Injectable });
RouterInitializer.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.0.0-next.5+3.sha-b437d12", ngImport: i0, type: RouterInitializer });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.0.0-next.5+3.sha-b437d12", ngImport: i0, type: RouterInitializer, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i0.Injector }]; } });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX21vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsYUFBYSxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ2hMLE9BQU8sRUFBQyw0QkFBNEIsRUFBRSxzQkFBc0IsRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBZ0IsTUFBTSxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUF1QixRQUFRLEVBQUUsWUFBWSxFQUFhLFFBQVEsRUFBWSxRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFFaFIsT0FBTyxFQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFFakMsT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFDL0QsT0FBTyxFQUFDLFVBQVUsRUFBRSxrQkFBa0IsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQ3hFLE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLGlDQUFpQyxDQUFDO0FBQ2pFLE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSw0QkFBNEIsQ0FBQztBQUd4RCxPQUFPLEVBQUMsb0JBQW9CLEVBQUUsYUFBYSxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDMUUsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDMUQsT0FBTyxFQUFlLE1BQU0sRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM5QyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDOUMsT0FBTyxFQUFDLHNCQUFzQixF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bCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FQUF9CQVNFX0hSRUYsIEhhc2hMb2NhdGlvblN0cmF0ZWd5LCBMb2NhdGlvbiwgTE9DQVRJT05fSU5JVElBTElaRUQsIExvY2F0aW9uU3RyYXRlZ3ksIFBhdGhMb2NhdGlvblN0cmF0ZWd5LCBQbGF0Zm9ybUxvY2F0aW9uLCBWaWV3cG9ydFNjcm9sbGVyfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtBTkFMWVpFX0ZPUl9FTlRSWV9DT01QT05FTlRTLCBBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLCBBUFBfSU5JVElBTElaRVIsIEFwcGxpY2F0aW9uUmVmLCBDb21waWxlciwgQ29tcG9uZW50UmVmLCBJbmplY3QsIEluamVjdGFibGUsIEluamVjdGlvblRva2VuLCBJbmplY3RvciwgTW9kdWxlV2l0aFByb3ZpZGVycywgTmdNb2R1bGUsIE5nUHJvYmVUb2tlbiwgT25EZXN0cm95LCBPcHRpb25hbCwgUHJvdmlkZXIsIFNraXBTZWxmfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7VGl0bGV9IGZyb20gJ0Bhbmd1bGFyL3BsYXRmb3JtLWJyb3dzZXInO1xuaW1wb3J0IHtvZiwgU3ViamVjdH0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7RW1wdHlPdXRsZXRDb21wb25lbnR9IGZyb20gJy4vY29tcG9uZW50cy9lbXB0eV9vdXRsZXQnO1xuaW1wb3J0IHtSb3V0ZXJMaW5rLCBSb3V0ZXJMaW5rV2l0aEhyZWZ9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfbGluayc7XG5pbXBvcnQge1JvdXRlckxpbmtBY3RpdmV9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfbGlua19hY3RpdmUnO1xuaW1wb3J0IHtSb3V0ZXJPdXRsZXR9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0JztcbmltcG9ydCB7RXZlbnR9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7Um91dGUsIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtEZWZhdWx0VGl0bGVTdHJhdGVneSwgVGl0bGVTdHJhdGVneX0gZnJvbSAnLi9wYWdlX3RpdGxlX3N0cmF0ZWd5JztcbmltcG9ydCB7Um91dGVSZXVzZVN0cmF0ZWd5fSBmcm9tICcuL3JvdXRlX3JldXNlX3N0cmF0ZWd5JztcbmltcG9ydCB7RXJyb3JIYW5kbGVyLCBSb3V0ZXJ9IGZyb20gJy4vcm91dGVyJztcbmltcG9ydCB7Uk9VVEVTfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0c30gZnJvbSAnLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtOb1ByZWxvYWRpbmcsIFByZWxvYWRBbGxNb2R1bGVzLCBQcmVsb2FkaW5nU3RyYXRlZ3ksIFJvdXRlclByZWxvYWRlcn0gZnJvbSAnLi9yb3V0ZXJfcHJlbG9hZGVyJztcbmltcG9ydCB7Um91dGVyU2Nyb2xsZXJ9IGZyb20gJy4vcm91dGVyX3Njcm9sbGVyJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGV9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7VXJsSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi91cmxfaGFuZGxpbmdfc3RyYXRlZ3knO1xuaW1wb3J0IHtEZWZhdWx0VXJsU2VyaWFsaXplciwgVXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge2ZsYXR0ZW59IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5cbi8qKlxuICogVGhlIGRpcmVjdGl2ZXMgZGVmaW5lZCBpbiB0aGUgYFJvdXRlck1vZHVsZWAuXG4gKi9cbmNvbnN0IFJPVVRFUl9ESVJFQ1RJVkVTID1cbiAgICBbUm91dGVyT3V0bGV0LCBSb3V0ZXJMaW5rLCBSb3V0ZXJMaW5rV2l0aEhyZWYsIFJvdXRlckxpbmtBY3RpdmUsIEVtcHR5T3V0bGV0Q29tcG9uZW50XTtcblxuLyoqXG4gKiBBIFtESSB0b2tlbl0oZ3VpZGUvZ2xvc3NhcnkvI2RpLXRva2VuKSBmb3IgdGhlIHJvdXRlciBzZXJ2aWNlLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9DT05GSUdVUkFUSU9OID0gbmV3IEluamVjdGlvblRva2VuPEV4dHJhT3B0aW9ucz4oJ1JPVVRFUl9DT05GSUdVUkFUSU9OJyk7XG5cbi8qKlxuICogQGRvY3NOb3RSZXF1aXJlZFxuICovXG5leHBvcnQgY29uc3QgUk9VVEVSX0ZPUlJPT1RfR1VBUkQgPSBuZXcgSW5qZWN0aW9uVG9rZW48dm9pZD4oJ1JPVVRFUl9GT1JST09UX0dVQVJEJyk7XG5cbmV4cG9ydCBjb25zdCBST1VURVJfUFJPVklERVJTOiBQcm92aWRlcltdID0gW1xuICBMb2NhdGlvbixcbiAge3Byb3ZpZGU6IFVybFNlcmlhbGl6ZXIsIHVzZUNsYXNzOiBEZWZhdWx0VXJsU2VyaWFsaXplcn0sXG4gIHtcbiAgICBwcm92aWRlOiBSb3V0ZXIsXG4gICAgdXNlRmFjdG9yeTogc2V0dXBSb3V0ZXIsXG4gICAgZGVwczogW1xuICAgICAgVXJsU2VyaWFsaXplciwgQ2hpbGRyZW5PdXRsZXRDb250ZXh0cywgTG9jYXRpb24sIEluamVjdG9yLCBDb21waWxlciwgUk9VVEVTLFxuICAgICAgUk9VVEVSX0NPTkZJR1VSQVRJT04sIERlZmF1bHRUaXRsZVN0cmF0ZWd5LCBbVGl0bGVTdHJhdGVneSwgbmV3IE9wdGlvbmFsKCldLFxuICAgICAgW1VybEhhbmRsaW5nU3RyYXRlZ3ksIG5ldyBPcHRpb25hbCgpXSwgW1JvdXRlUmV1c2VTdHJhdGVneSwgbmV3IE9wdGlvbmFsKCldXG4gICAgXVxuICB9LFxuICBDaGlsZHJlbk91dGxldENvbnRleHRzLFxuICB7cHJvdmlkZTogQWN0aXZhdGVkUm91dGUsIHVzZUZhY3Rvcnk6IHJvb3RSb3V0ZSwgZGVwczogW1JvdXRlcl19LFxuICBSb3V0ZXJQcmVsb2FkZXIsXG4gIE5vUHJlbG9hZGluZyxcbiAgUHJlbG9hZEFsbE1vZHVsZXMsXG4gIHtwcm92aWRlOiBST1VURVJfQ09ORklHVVJBVElPTiwgdXNlVmFsdWU6IHtlbmFibGVUcmFjaW5nOiBmYWxzZX19LFxuXTtcblxuZXhwb3J0IGZ1bmN0aW9uIHJvdXRlck5nUHJvYmVUb2tlbigpIHtcbiAgcmV0dXJuIG5ldyBOZ1Byb2JlVG9rZW4oJ1JvdXRlcicsIFJvdXRlcik7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQWRkcyBkaXJlY3RpdmVzIGFuZCBwcm92aWRlcnMgZm9yIGluLWFwcCBuYXZpZ2F0aW9uIGFtb25nIHZpZXdzIGRlZmluZWQgaW4gYW4gYXBwbGljYXRpb24uXG4gKiBVc2UgdGhlIEFuZ3VsYXIgYFJvdXRlcmAgc2VydmljZSB0byBkZWNsYXJhdGl2ZWx5IHNwZWNpZnkgYXBwbGljYXRpb24gc3RhdGVzIGFuZCBtYW5hZ2Ugc3RhdGVcbiAqIHRyYW5zaXRpb25zLlxuICpcbiAqIFlvdSBjYW4gaW1wb3J0IHRoaXMgTmdNb2R1bGUgbXVsdGlwbGUgdGltZXMsIG9uY2UgZm9yIGVhY2ggbGF6eS1sb2FkZWQgYnVuZGxlLlxuICogSG93ZXZlciwgb25seSBvbmUgYFJvdXRlcmAgc2VydmljZSBjYW4gYmUgYWN0aXZlLlxuICogVG8gZW5zdXJlIHRoaXMsIHRoZXJlIGFyZSB0d28gd2F5cyB0byByZWdpc3RlciByb3V0ZXMgd2hlbiBpbXBvcnRpbmcgdGhpcyBtb2R1bGU6XG4gKlxuICogKiBUaGUgYGZvclJvb3QoKWAgbWV0aG9kIGNyZWF0ZXMgYW4gYE5nTW9kdWxlYCB0aGF0IGNvbnRhaW5zIGFsbCB0aGUgZGlyZWN0aXZlcywgdGhlIGdpdmVuXG4gKiByb3V0ZXMsIGFuZCB0aGUgYFJvdXRlcmAgc2VydmljZSBpdHNlbGYuXG4gKiAqIFRoZSBgZm9yQ2hpbGQoKWAgbWV0aG9kIGNyZWF0ZXMgYW4gYE5nTW9kdWxlYCB0aGF0IGNvbnRhaW5zIGFsbCB0aGUgZGlyZWN0aXZlcyBhbmQgdGhlIGdpdmVuXG4gKiByb3V0ZXMsIGJ1dCBkb2VzIG5vdCBpbmNsdWRlIHRoZSBgUm91dGVyYCBzZXJ2aWNlLlxuICpcbiAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRlcikgZm9yIGFuXG4gKiBvdmVydmlldyBvZiBob3cgdGhlIGBSb3V0ZXJgIHNlcnZpY2Ugc2hvdWxkIGJlIHVzZWQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ATmdNb2R1bGUoe1xuICBkZWNsYXJhdGlvbnM6IFJPVVRFUl9ESVJFQ1RJVkVTLFxuICBleHBvcnRzOiBST1VURVJfRElSRUNUSVZFUyxcbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyTW9kdWxlIHtcbiAgLy8gTm90ZTogV2UgYXJlIGluamVjdGluZyB0aGUgUm91dGVyIHNvIGl0IGdldHMgY3JlYXRlZCBlYWdlcmx5Li4uXG4gIGNvbnN0cnVjdG9yKEBPcHRpb25hbCgpIEBJbmplY3QoUk9VVEVSX0ZPUlJPT1RfR1VBUkQpIGd1YXJkOiBhbnksIEBPcHRpb25hbCgpIHJvdXRlcjogUm91dGVyKSB7fVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuZCBjb25maWd1cmVzIGEgbW9kdWxlIHdpdGggYWxsIHRoZSByb3V0ZXIgcHJvdmlkZXJzIGFuZCBkaXJlY3RpdmVzLlxuICAgKiBPcHRpb25hbGx5IHNldHMgdXAgYW4gYXBwbGljYXRpb24gbGlzdGVuZXIgdG8gcGVyZm9ybSBhbiBpbml0aWFsIG5hdmlnYXRpb24uXG4gICAqXG4gICAqIFdoZW4gcmVnaXN0ZXJpbmcgdGhlIE5nTW9kdWxlIGF0IHRoZSByb290LCBpbXBvcnQgYXMgZm9sbG93czpcbiAgICpcbiAgICogYGBgXG4gICAqIEBOZ01vZHVsZSh7XG4gICAqICAgaW1wb3J0czogW1JvdXRlck1vZHVsZS5mb3JSb290KFJPVVRFUyldXG4gICAqIH0pXG4gICAqIGNsYXNzIE15TmdNb2R1bGUge31cbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSByb3V0ZXMgQW4gYXJyYXkgb2YgYFJvdXRlYCBvYmplY3RzIHRoYXQgZGVmaW5lIHRoZSBuYXZpZ2F0aW9uIHBhdGhzIGZvciB0aGUgYXBwbGljYXRpb24uXG4gICAqIEBwYXJhbSBjb25maWcgQW4gYEV4dHJhT3B0aW9uc2AgY29uZmlndXJhdGlvbiBvYmplY3QgdGhhdCBjb250cm9scyBob3cgbmF2aWdhdGlvbiBpcyBwZXJmb3JtZWQuXG4gICAqIEByZXR1cm4gVGhlIG5ldyBgTmdNb2R1bGVgLlxuICAgKlxuICAgKi9cbiAgc3RhdGljIGZvclJvb3Qocm91dGVzOiBSb3V0ZXMsIGNvbmZpZz86IEV4dHJhT3B0aW9ucyk6IE1vZHVsZVdpdGhQcm92aWRlcnM8Um91dGVyTW9kdWxlPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5nTW9kdWxlOiBSb3V0ZXJNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFtcbiAgICAgICAgUk9VVEVSX1BST1ZJREVSUyxcbiAgICAgICAgcHJvdmlkZVJvdXRlcyhyb3V0ZXMpLFxuICAgICAgICB7XG4gICAgICAgICAgcHJvdmlkZTogUk9VVEVSX0ZPUlJPT1RfR1VBUkQsXG4gICAgICAgICAgdXNlRmFjdG9yeTogcHJvdmlkZUZvclJvb3RHdWFyZCxcbiAgICAgICAgICBkZXBzOiBbW1JvdXRlciwgbmV3IE9wdGlvbmFsKCksIG5ldyBTa2lwU2VsZigpXV1cbiAgICAgICAgfSxcbiAgICAgICAge3Byb3ZpZGU6IFJPVVRFUl9DT05GSUdVUkFUSU9OLCB1c2VWYWx1ZTogY29uZmlnID8gY29uZmlnIDoge319LFxuICAgICAgICB7XG4gICAgICAgICAgcHJvdmlkZTogTG9jYXRpb25TdHJhdGVneSxcbiAgICAgICAgICB1c2VGYWN0b3J5OiBwcm92aWRlTG9jYXRpb25TdHJhdGVneSxcbiAgICAgICAgICBkZXBzOlxuICAgICAgICAgICAgICBbUGxhdGZvcm1Mb2NhdGlvbiwgW25ldyBJbmplY3QoQVBQX0JBU0VfSFJFRiksIG5ldyBPcHRpb25hbCgpXSwgUk9VVEVSX0NPTkZJR1VSQVRJT05dXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBwcm92aWRlOiBSb3V0ZXJTY3JvbGxlcixcbiAgICAgICAgICB1c2VGYWN0b3J5OiBjcmVhdGVSb3V0ZXJTY3JvbGxlcixcbiAgICAgICAgICBkZXBzOiBbUm91dGVyLCBWaWV3cG9ydFNjcm9sbGVyLCBST1VURVJfQ09ORklHVVJBVElPTl1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHByb3ZpZGU6IFByZWxvYWRpbmdTdHJhdGVneSxcbiAgICAgICAgICB1c2VFeGlzdGluZzogY29uZmlnICYmIGNvbmZpZy5wcmVsb2FkaW5nU3RyYXRlZ3kgPyBjb25maWcucHJlbG9hZGluZ1N0cmF0ZWd5IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBOb1ByZWxvYWRpbmdcbiAgICAgICAgfSxcbiAgICAgICAge3Byb3ZpZGU6IE5nUHJvYmVUb2tlbiwgbXVsdGk6IHRydWUsIHVzZUZhY3Rvcnk6IHJvdXRlck5nUHJvYmVUb2tlbn0sXG4gICAgICAgIHByb3ZpZGVSb3V0ZXJJbml0aWFsaXplcigpLFxuICAgICAgXSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBtb2R1bGUgd2l0aCBhbGwgdGhlIHJvdXRlciBkaXJlY3RpdmVzIGFuZCBhIHByb3ZpZGVyIHJlZ2lzdGVyaW5nIHJvdXRlcyxcbiAgICogd2l0aG91dCBjcmVhdGluZyBhIG5ldyBSb3V0ZXIgc2VydmljZS5cbiAgICogV2hlbiByZWdpc3RlcmluZyBmb3Igc3VibW9kdWxlcyBhbmQgbGF6eS1sb2FkZWQgc3VibW9kdWxlcywgY3JlYXRlIHRoZSBOZ01vZHVsZSBhcyBmb2xsb3dzOlxuICAgKlxuICAgKiBgYGBcbiAgICogQE5nTW9kdWxlKHtcbiAgICogICBpbXBvcnRzOiBbUm91dGVyTW9kdWxlLmZvckNoaWxkKFJPVVRFUyldXG4gICAqIH0pXG4gICAqIGNsYXNzIE15TmdNb2R1bGUge31cbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSByb3V0ZXMgQW4gYXJyYXkgb2YgYFJvdXRlYCBvYmplY3RzIHRoYXQgZGVmaW5lIHRoZSBuYXZpZ2F0aW9uIHBhdGhzIGZvciB0aGUgc3VibW9kdWxlLlxuICAgKiBAcmV0dXJuIFRoZSBuZXcgTmdNb2R1bGUuXG4gICAqXG4gICAqL1xuICBzdGF0aWMgZm9yQ2hpbGQocm91dGVzOiBSb3V0ZXMpOiBNb2R1bGVXaXRoUHJvdmlkZXJzPFJvdXRlck1vZHVsZT4ge1xuICAgIHJldHVybiB7bmdNb2R1bGU6IFJvdXRlck1vZHVsZSwgcHJvdmlkZXJzOiBbcHJvdmlkZVJvdXRlcyhyb3V0ZXMpXX07XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJvdXRlclNjcm9sbGVyKFxuICAgIHJvdXRlcjogUm91dGVyLCB2aWV3cG9ydFNjcm9sbGVyOiBWaWV3cG9ydFNjcm9sbGVyLCBjb25maWc6IEV4dHJhT3B0aW9ucyk6IFJvdXRlclNjcm9sbGVyIHtcbiAgaWYgKGNvbmZpZy5zY3JvbGxPZmZzZXQpIHtcbiAgICB2aWV3cG9ydFNjcm9sbGVyLnNldE9mZnNldChjb25maWcuc2Nyb2xsT2Zmc2V0KTtcbiAgfVxuICByZXR1cm4gbmV3IFJvdXRlclNjcm9sbGVyKHJvdXRlciwgdmlld3BvcnRTY3JvbGxlciwgY29uZmlnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVMb2NhdGlvblN0cmF0ZWd5KFxuICAgIHBsYXRmb3JtTG9jYXRpb25TdHJhdGVneTogUGxhdGZvcm1Mb2NhdGlvbiwgYmFzZUhyZWY6IHN0cmluZywgb3B0aW9uczogRXh0cmFPcHRpb25zID0ge30pIHtcbiAgcmV0dXJuIG9wdGlvbnMudXNlSGFzaCA/IG5ldyBIYXNoTG9jYXRpb25TdHJhdGVneShwbGF0Zm9ybUxvY2F0aW9uU3RyYXRlZ3ksIGJhc2VIcmVmKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgUGF0aExvY2F0aW9uU3RyYXRlZ3kocGxhdGZvcm1Mb2NhdGlvblN0cmF0ZWd5LCBiYXNlSHJlZik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcm92aWRlRm9yUm9vdEd1YXJkKHJvdXRlcjogUm91dGVyKTogYW55IHtcbiAgaWYgKCh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmIHJvdXRlcikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFJvdXRlck1vZHVsZS5mb3JSb290KCkgY2FsbGVkIHR3aWNlLiBMYXp5IGxvYWRlZCBtb2R1bGVzIHNob3VsZCB1c2UgUm91dGVyTW9kdWxlLmZvckNoaWxkKCkgaW5zdGVhZC5gKTtcbiAgfVxuICByZXR1cm4gJ2d1YXJkZWQnO1xufVxuXG4vKipcbiAqIFJlZ2lzdGVycyBhIFtESSBwcm92aWRlcl0oZ3VpZGUvZ2xvc3NhcnkjcHJvdmlkZXIpIGZvciBhIHNldCBvZiByb3V0ZXMuXG4gKiBAcGFyYW0gcm91dGVzIFRoZSByb3V0ZSBjb25maWd1cmF0aW9uIHRvIHByb3ZpZGUuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBgYGBcbiAqIEBOZ01vZHVsZSh7XG4gKiAgIGltcG9ydHM6IFtSb3V0ZXJNb2R1bGUuZm9yQ2hpbGQoUk9VVEVTKV0sXG4gKiAgIHByb3ZpZGVyczogW3Byb3ZpZGVSb3V0ZXMoRVhUUkFfUk9VVEVTKV1cbiAqIH0pXG4gKiBjbGFzcyBNeU5nTW9kdWxlIHt9XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm92aWRlUm91dGVzKHJvdXRlczogUm91dGVzKTogYW55IHtcbiAgcmV0dXJuIFtcbiAgICB7cHJvdmlkZTogQU5BTFlaRV9GT1JfRU5UUllfQ09NUE9ORU5UUywgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiByb3V0ZXN9LFxuICAgIHtwcm92aWRlOiBST1VURVMsIG11bHRpOiB0cnVlLCB1c2VWYWx1ZTogcm91dGVzfSxcbiAgXTtcbn1cblxuLyoqXG4gKiBBbGxvd2VkIHZhbHVlcyBpbiBhbiBgRXh0cmFPcHRpb25zYCBvYmplY3QgdGhhdCBjb25maWd1cmVcbiAqIHdoZW4gdGhlIHJvdXRlciBwZXJmb3JtcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIG9wZXJhdGlvbi5cbiAqXG4gKiAqICdlbmFibGVkTm9uQmxvY2tpbmcnIC0gKGRlZmF1bHQpIFRoZSBpbml0aWFsIG5hdmlnYXRpb24gc3RhcnRzIGFmdGVyIHRoZVxuICogcm9vdCBjb21wb25lbnQgaGFzIGJlZW4gY3JlYXRlZC4gVGhlIGJvb3RzdHJhcCBpcyBub3QgYmxvY2tlZCBvbiB0aGUgY29tcGxldGlvbiBvZiB0aGUgaW5pdGlhbFxuICogbmF2aWdhdGlvbi5cbiAqICogJ2VuYWJsZWRCbG9ja2luZycgLSBUaGUgaW5pdGlhbCBuYXZpZ2F0aW9uIHN0YXJ0cyBiZWZvcmUgdGhlIHJvb3QgY29tcG9uZW50IGlzIGNyZWF0ZWQuXG4gKiBUaGUgYm9vdHN0cmFwIGlzIGJsb2NrZWQgdW50aWwgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBpcyBjb21wbGV0ZS4gVGhpcyB2YWx1ZSBpcyByZXF1aXJlZFxuICogZm9yIFtzZXJ2ZXItc2lkZSByZW5kZXJpbmddKGd1aWRlL3VuaXZlcnNhbCkgdG8gd29yay5cbiAqICogJ2Rpc2FibGVkJyAtIFRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgbm90IHBlcmZvcm1lZC4gVGhlIGxvY2F0aW9uIGxpc3RlbmVyIGlzIHNldCB1cCBiZWZvcmVcbiAqIHRoZSByb290IGNvbXBvbmVudCBnZXRzIGNyZWF0ZWQuIFVzZSBpZiB0aGVyZSBpcyBhIHJlYXNvbiB0byBoYXZlXG4gKiBtb3JlIGNvbnRyb2wgb3ZlciB3aGVuIHRoZSByb3V0ZXIgc3RhcnRzIGl0cyBpbml0aWFsIG5hdmlnYXRpb24gZHVlIHRvIHNvbWUgY29tcGxleFxuICogaW5pdGlhbGl6YXRpb24gbG9naWMuXG4gKlxuICogVGhlIGZvbGxvd2luZyB2YWx1ZXMgaGF2ZSBiZWVuIFtkZXByZWNhdGVkXShndWlkZS9yZWxlYXNlcyNkZXByZWNhdGlvbi1wcmFjdGljZXMpIHNpbmNlIHYxMSxcbiAqIGFuZCBzaG91bGQgbm90IGJlIHVzZWQgZm9yIG5ldyBhcHBsaWNhdGlvbnMuXG4gKlxuICogKiAnZW5hYmxlZCcgLSBUaGlzIG9wdGlvbiBpcyAxOjEgcmVwbGFjZWFibGUgd2l0aCBgZW5hYmxlZEJsb2NraW5nYC5cbiAqXG4gKiBAc2VlIGBmb3JSb290KClgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBJbml0aWFsTmF2aWdhdGlvbiA9ICdkaXNhYmxlZCd8J2VuYWJsZWQnfCdlbmFibGVkQmxvY2tpbmcnfCdlbmFibGVkTm9uQmxvY2tpbmcnO1xuXG4vKipcbiAqIEEgc2V0IG9mIGNvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgYSByb3V0ZXIgbW9kdWxlLCBwcm92aWRlZCBpbiB0aGVcbiAqIGBmb3JSb290KClgIG1ldGhvZC5cbiAqXG4gKiBAc2VlIGBmb3JSb290KClgXG4gKlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFeHRyYU9wdGlvbnMge1xuICAvKipcbiAgICogV2hlbiB0cnVlLCBsb2cgYWxsIGludGVybmFsIG5hdmlnYXRpb24gZXZlbnRzIHRvIHRoZSBjb25zb2xlLlxuICAgKiBVc2UgZm9yIGRlYnVnZ2luZy5cbiAgICovXG4gIGVuYWJsZVRyYWNpbmc/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGVuIHRydWUsIGVuYWJsZSB0aGUgbG9jYXRpb24gc3RyYXRlZ3kgdGhhdCB1c2VzIHRoZSBVUkwgZnJhZ21lbnRcbiAgICogaW5zdGVhZCBvZiB0aGUgaGlzdG9yeSBBUEkuXG4gICAqL1xuICB1c2VIYXNoPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogT25lIG9mIGBlbmFibGVkYCwgYGVuYWJsZWRCbG9ja2luZ2AsIGBlbmFibGVkTm9uQmxvY2tpbmdgIG9yIGBkaXNhYmxlZGAuXG4gICAqIFdoZW4gc2V0IHRvIGBlbmFibGVkYCBvciBgZW5hYmxlZEJsb2NraW5nYCwgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBzdGFydHMgYmVmb3JlIHRoZSByb290XG4gICAqIGNvbXBvbmVudCBpcyBjcmVhdGVkLiBUaGUgYm9vdHN0cmFwIGlzIGJsb2NrZWQgdW50aWwgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBpcyBjb21wbGV0ZS4gVGhpc1xuICAgKiB2YWx1ZSBpcyByZXF1aXJlZCBmb3IgW3NlcnZlci1zaWRlIHJlbmRlcmluZ10oZ3VpZGUvdW5pdmVyc2FsKSB0byB3b3JrLiBXaGVuIHNldCB0b1xuICAgKiBgZW5hYmxlZE5vbkJsb2NraW5nYCwgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBzdGFydHMgYWZ0ZXIgdGhlIHJvb3QgY29tcG9uZW50IGhhcyBiZWVuIGNyZWF0ZWQuXG4gICAqIFRoZSBib290c3RyYXAgaXMgbm90IGJsb2NrZWQgb24gdGhlIGNvbXBsZXRpb24gb2YgdGhlIGluaXRpYWwgbmF2aWdhdGlvbi4gV2hlbiBzZXQgdG9cbiAgICogYGRpc2FibGVkYCwgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBpcyBub3QgcGVyZm9ybWVkLiBUaGUgbG9jYXRpb24gbGlzdGVuZXIgaXMgc2V0IHVwIGJlZm9yZSB0aGVcbiAgICogcm9vdCBjb21wb25lbnQgZ2V0cyBjcmVhdGVkLiBVc2UgaWYgdGhlcmUgaXMgYSByZWFzb24gdG8gaGF2ZSBtb3JlIGNvbnRyb2wgb3ZlciB3aGVuIHRoZSByb3V0ZXJcbiAgICogc3RhcnRzIGl0cyBpbml0aWFsIG5hdmlnYXRpb24gZHVlIHRvIHNvbWUgY29tcGxleCBpbml0aWFsaXphdGlvbiBsb2dpYy5cbiAgICovXG4gIGluaXRpYWxOYXZpZ2F0aW9uPzogSW5pdGlhbE5hdmlnYXRpb247XG5cbiAgLyoqXG4gICAqIEEgY3VzdG9tIGVycm9yIGhhbmRsZXIgZm9yIGZhaWxlZCBuYXZpZ2F0aW9ucy5cbiAgICogSWYgdGhlIGhhbmRsZXIgcmV0dXJucyBhIHZhbHVlLCB0aGUgbmF2aWdhdGlvbiBQcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhpcyB2YWx1ZS5cbiAgICogSWYgdGhlIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbiwgdGhlIG5hdmlnYXRpb24gUHJvbWlzZSBpcyByZWplY3RlZCB3aXRoIHRoZSBleGNlcHRpb24uXG4gICAqXG4gICAqL1xuICBlcnJvckhhbmRsZXI/OiBFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5LlxuICAgKiBPbmUgb2YgYFByZWxvYWRBbGxNb2R1bGVzYCBvciBgTm9QcmVsb2FkaW5nYCAodGhlIGRlZmF1bHQpLlxuICAgKi9cbiAgcHJlbG9hZGluZ1N0cmF0ZWd5PzogYW55O1xuXG4gIC8qKlxuICAgKiBEZWZpbmUgd2hhdCB0aGUgcm91dGVyIHNob3VsZCBkbyBpZiBpdCByZWNlaXZlcyBhIG5hdmlnYXRpb24gcmVxdWVzdCB0byB0aGUgY3VycmVudCBVUkwuXG4gICAqIERlZmF1bHQgaXMgYGlnbm9yZWAsIHdoaWNoIGNhdXNlcyB0aGUgcm91dGVyIGlnbm9yZXMgdGhlIG5hdmlnYXRpb24uXG4gICAqIFRoaXMgY2FuIGRpc2FibGUgZmVhdHVyZXMgc3VjaCBhcyBhIFwicmVmcmVzaFwiIGJ1dHRvbi5cbiAgICogVXNlIHRoaXMgb3B0aW9uIHRvIGNvbmZpZ3VyZSB0aGUgYmVoYXZpb3Igd2hlbiBuYXZpZ2F0aW5nIHRvIHRoZVxuICAgKiBjdXJyZW50IFVSTC4gRGVmYXVsdCBpcyAnaWdub3JlJy5cbiAgICovXG4gIG9uU2FtZVVybE5hdmlnYXRpb24/OiAncmVsb2FkJ3wnaWdub3JlJztcblxuICAvKipcbiAgICogQ29uZmlndXJlcyBpZiB0aGUgc2Nyb2xsIHBvc2l0aW9uIG5lZWRzIHRvIGJlIHJlc3RvcmVkIHdoZW4gbmF2aWdhdGluZyBiYWNrLlxuICAgKlxuICAgKiAqICdkaXNhYmxlZCctIChEZWZhdWx0KSBEb2VzIG5vdGhpbmcuIFNjcm9sbCBwb3NpdGlvbiBpcyBtYWludGFpbmVkIG9uIG5hdmlnYXRpb24uXG4gICAqICogJ3RvcCctIFNldHMgdGhlIHNjcm9sbCBwb3NpdGlvbiB0byB4ID0gMCwgeSA9IDAgb24gYWxsIG5hdmlnYXRpb24uXG4gICAqICogJ2VuYWJsZWQnLSBSZXN0b3JlcyB0aGUgcHJldmlvdXMgc2Nyb2xsIHBvc2l0aW9uIG9uIGJhY2t3YXJkIG5hdmlnYXRpb24sIGVsc2Ugc2V0cyB0aGVcbiAgICogcG9zaXRpb24gdG8gdGhlIGFuY2hvciBpZiBvbmUgaXMgcHJvdmlkZWQsIG9yIHNldHMgdGhlIHNjcm9sbCBwb3NpdGlvbiB0byBbMCwgMF0gKGZvcndhcmRcbiAgICogbmF2aWdhdGlvbikuIFRoaXMgb3B0aW9uIHdpbGwgYmUgdGhlIGRlZmF1bHQgaW4gdGhlIGZ1dHVyZS5cbiAgICpcbiAgICogWW91IGNhbiBpbXBsZW1lbnQgY3VzdG9tIHNjcm9sbCByZXN0b3JhdGlvbiBiZWhhdmlvciBieSBhZGFwdGluZyB0aGUgZW5hYmxlZCBiZWhhdmlvciBhc1xuICAgKiBpbiB0aGUgZm9sbG93aW5nIGV4YW1wbGUuXG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY2xhc3MgQXBwTW9kdWxlIHtcbiAgICogICBjb25zdHJ1Y3Rvcihyb3V0ZXI6IFJvdXRlciwgdmlld3BvcnRTY3JvbGxlcjogVmlld3BvcnRTY3JvbGxlcikge1xuICAgKiAgICAgcm91dGVyLmV2ZW50cy5waXBlKFxuICAgKiAgICAgICBmaWx0ZXIoKGU6IEV2ZW50KTogZSBpcyBTY3JvbGwgPT4gZSBpbnN0YW5jZW9mIFNjcm9sbClcbiAgICogICAgICkuc3Vic2NyaWJlKGUgPT4ge1xuICAgKiAgICAgICBpZiAoZS5wb3NpdGlvbikge1xuICAgKiAgICAgICAgIC8vIGJhY2t3YXJkIG5hdmlnYXRpb25cbiAgICogICAgICAgICB2aWV3cG9ydFNjcm9sbGVyLnNjcm9sbFRvUG9zaXRpb24oZS5wb3NpdGlvbik7XG4gICAqICAgICAgIH0gZWxzZSBpZiAoZS5hbmNob3IpIHtcbiAgICogICAgICAgICAvLyBhbmNob3IgbmF2aWdhdGlvblxuICAgKiAgICAgICAgIHZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9BbmNob3IoZS5hbmNob3IpO1xuICAgKiAgICAgICB9IGVsc2Uge1xuICAgKiAgICAgICAgIC8vIGZvcndhcmQgbmF2aWdhdGlvblxuICAgKiAgICAgICAgIHZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9Qb3NpdGlvbihbMCwgMF0pO1xuICAgKiAgICAgICB9XG4gICAqICAgICB9KTtcbiAgICogICB9XG4gICAqIH1cbiAgICogYGBgXG4gICAqL1xuICBzY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uPzogJ2Rpc2FibGVkJ3wnZW5hYmxlZCd8J3RvcCc7XG5cbiAgLyoqXG4gICAqIFdoZW4gc2V0IHRvICdlbmFibGVkJywgc2Nyb2xscyB0byB0aGUgYW5jaG9yIGVsZW1lbnQgd2hlbiB0aGUgVVJMIGhhcyBhIGZyYWdtZW50LlxuICAgKiBBbmNob3Igc2Nyb2xsaW5nIGlzIGRpc2FibGVkIGJ5IGRlZmF1bHQuXG4gICAqXG4gICAqIEFuY2hvciBzY3JvbGxpbmcgZG9lcyBub3QgaGFwcGVuIG9uICdwb3BzdGF0ZScuIEluc3RlYWQsIHdlIHJlc3RvcmUgdGhlIHBvc2l0aW9uXG4gICAqIHRoYXQgd2Ugc3RvcmVkIG9yIHNjcm9sbCB0byB0aGUgdG9wLlxuICAgKi9cbiAgYW5jaG9yU2Nyb2xsaW5nPzogJ2Rpc2FibGVkJ3wnZW5hYmxlZCc7XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgdGhlIHNjcm9sbCBvZmZzZXQgdGhlIHJvdXRlciB3aWxsIHVzZSB3aGVuIHNjcm9sbGluZyB0byBhbiBlbGVtZW50LlxuICAgKlxuICAgKiBXaGVuIGdpdmVuIGEgdHVwbGUgd2l0aCB4IGFuZCB5IHBvc2l0aW9uIHZhbHVlLFxuICAgKiB0aGUgcm91dGVyIHVzZXMgdGhhdCBvZmZzZXQgZWFjaCB0aW1lIGl0IHNjcm9sbHMuXG4gICAqIFdoZW4gZ2l2ZW4gYSBmdW5jdGlvbiwgdGhlIHJvdXRlciBpbnZva2VzIHRoZSBmdW5jdGlvbiBldmVyeSB0aW1lXG4gICAqIGl0IHJlc3RvcmVzIHNjcm9sbCBwb3NpdGlvbi5cbiAgICovXG4gIHNjcm9sbE9mZnNldD86IFtudW1iZXIsIG51bWJlcl18KCgpID0+IFtudW1iZXIsIG51bWJlcl0pO1xuXG4gIC8qKlxuICAgKiBEZWZpbmVzIGhvdyB0aGUgcm91dGVyIG1lcmdlcyBwYXJhbWV0ZXJzLCBkYXRhLCBhbmQgcmVzb2x2ZWQgZGF0YSBmcm9tIHBhcmVudCB0byBjaGlsZFxuICAgKiByb3V0ZXMuIEJ5IGRlZmF1bHQgKCdlbXB0eU9ubHknKSwgaW5oZXJpdHMgcGFyZW50IHBhcmFtZXRlcnMgb25seSBmb3JcbiAgICogcGF0aC1sZXNzIG9yIGNvbXBvbmVudC1sZXNzIHJvdXRlcy5cbiAgICpcbiAgICogU2V0IHRvICdhbHdheXMnIHRvIGVuYWJsZSB1bmNvbmRpdGlvbmFsIGluaGVyaXRhbmNlIG9mIHBhcmVudCBwYXJhbWV0ZXJzLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgd2hlbiBkZWFsaW5nIHdpdGggbWF0cml4IHBhcmFtZXRlcnMsIFwicGFyZW50XCIgcmVmZXJzIHRvIHRoZSBwYXJlbnQgYFJvdXRlYFxuICAgKiBjb25maWcgd2hpY2ggZG9lcyBub3QgbmVjZXNzYXJpbHkgbWVhbiB0aGUgXCJVUkwgc2VnbWVudCB0byB0aGUgbGVmdFwiLiBXaGVuIHRoZSBgUm91dGVgIGBwYXRoYFxuICAgKiBjb250YWlucyBtdWx0aXBsZSBzZWdtZW50cywgdGhlIG1hdHJpeCBwYXJhbWV0ZXJzIG11c3QgYXBwZWFyIG9uIHRoZSBsYXN0IHNlZ21lbnQuIEZvciBleGFtcGxlLFxuICAgKiBtYXRyaXggcGFyYW1ldGVycyBmb3IgYHtwYXRoOiAnYS9iJywgY29tcG9uZW50OiBNeUNvbXB9YCBzaG91bGQgYXBwZWFyIGFzIGBhL2I7Zm9vPWJhcmAgYW5kIG5vdFxuICAgKiBgYTtmb289YmFyL2JgLlxuICAgKlxuICAgKi9cbiAgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneT86ICdlbXB0eU9ubHknfCdhbHdheXMnO1xuXG4gIC8qKlxuICAgKiBBIGN1c3RvbSBoYW5kbGVyIGZvciBtYWxmb3JtZWQgVVJJIGVycm9ycy4gVGhlIGhhbmRsZXIgaXMgaW52b2tlZCB3aGVuIGBlbmNvZGVkVVJJYCBjb250YWluc1xuICAgKiBpbnZhbGlkIGNoYXJhY3RlciBzZXF1ZW5jZXMuXG4gICAqIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIGlzIHRvIHJlZGlyZWN0IHRvIHRoZSByb290IFVSTCwgZHJvcHBpbmdcbiAgICogYW55IHBhdGggb3IgcGFyYW1ldGVyIGluZm9ybWF0aW9uLiBUaGUgZnVuY3Rpb24gdGFrZXMgdGhyZWUgcGFyYW1ldGVyczpcbiAgICpcbiAgICogLSBgJ1VSSUVycm9yJ2AgLSBFcnJvciB0aHJvd24gd2hlbiBwYXJzaW5nIGEgYmFkIFVSTC5cbiAgICogLSBgJ1VybFNlcmlhbGl6ZXInYCAtIFVybFNlcmlhbGl6ZXIgdGhhdOKAmXMgY29uZmlndXJlZCB3aXRoIHRoZSByb3V0ZXIuXG4gICAqIC0gYCd1cmwnYCAtICBUaGUgbWFsZm9ybWVkIFVSTCB0aGF0IGNhdXNlZCB0aGUgVVJJRXJyb3JcbiAgICogKi9cbiAgbWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyPzpcbiAgICAgIChlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIHVybDogc3RyaW5nKSA9PiBVcmxUcmVlO1xuXG4gIC8qKlxuICAgKiBEZWZpbmVzIHdoZW4gdGhlIHJvdXRlciB1cGRhdGVzIHRoZSBicm93c2VyIFVSTC4gQnkgZGVmYXVsdCAoJ2RlZmVycmVkJyksXG4gICAqIHVwZGF0ZSBhZnRlciBzdWNjZXNzZnVsIG5hdmlnYXRpb24uXG4gICAqIFNldCB0byAnZWFnZXInIGlmIHByZWZlciB0byB1cGRhdGUgdGhlIFVSTCBhdCB0aGUgYmVnaW5uaW5nIG9mIG5hdmlnYXRpb24uXG4gICAqIFVwZGF0aW5nIHRoZSBVUkwgZWFybHkgYWxsb3dzIHlvdSB0byBoYW5kbGUgYSBmYWlsdXJlIG9mIG5hdmlnYXRpb24gYnlcbiAgICogc2hvd2luZyBhbiBlcnJvciBtZXNzYWdlIHdpdGggdGhlIFVSTCB0aGF0IGZhaWxlZC5cbiAgICovXG4gIHVybFVwZGF0ZVN0cmF0ZWd5PzogJ2RlZmVycmVkJ3wnZWFnZXInO1xuXG4gIC8qKlxuICAgKiBFbmFibGVzIGEgYnVnIGZpeCB0aGF0IGNvcnJlY3RzIHJlbGF0aXZlIGxpbmsgcmVzb2x1dGlvbiBpbiBjb21wb25lbnRzIHdpdGggZW1wdHkgcGF0aHMuXG4gICAqIEV4YW1wbGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiBjb25zdCByb3V0ZXMgPSBbXG4gICAqICAge1xuICAgKiAgICAgcGF0aDogJycsXG4gICAqICAgICBjb21wb25lbnQ6IENvbnRhaW5lckNvbXBvbmVudCxcbiAgICogICAgIGNoaWxkcmVuOiBbXG4gICAqICAgICAgIHsgcGF0aDogJ2EnLCBjb21wb25lbnQ6IEFDb21wb25lbnQgfSxcbiAgICogICAgICAgeyBwYXRoOiAnYicsIGNvbXBvbmVudDogQkNvbXBvbmVudCB9LFxuICAgKiAgICAgXVxuICAgKiAgIH1cbiAgICogXTtcbiAgICogYGBgXG4gICAqXG4gICAqIEZyb20gdGhlIGBDb250YWluZXJDb21wb25lbnRgLCB5b3Ugc2hvdWxkIGJlIGFibGUgdG8gbmF2aWdhdGUgdG8gYEFDb21wb25lbnRgIHVzaW5nXG4gICAqIHRoZSBmb2xsb3dpbmcgYHJvdXRlckxpbmtgLCBidXQgaXQgd2lsbCBub3Qgd29yayBpZiBgcmVsYXRpdmVMaW5rUmVzb2x1dGlvbmAgaXMgc2V0XG4gICAqIHRvIGAnbGVnYWN5J2A6XG4gICAqXG4gICAqIGA8YSBbcm91dGVyTGlua109XCJbJy4vYSddXCI+TGluayB0byBBPC9hPmBcbiAgICpcbiAgICogSG93ZXZlciwgdGhpcyB3aWxsIHdvcms6XG4gICAqXG4gICAqIGA8YSBbcm91dGVyTGlua109XCJbJy4uL2EnXVwiPkxpbmsgdG8gQTwvYT5gXG4gICAqXG4gICAqIEluIG90aGVyIHdvcmRzLCB5b3UncmUgcmVxdWlyZWQgdG8gdXNlIGAuLi9gIHJhdGhlciB0aGFuIGAuL2Agd2hlbiB0aGUgcmVsYXRpdmUgbGlua1xuICAgKiByZXNvbHV0aW9uIGlzIHNldCB0byBgJ2xlZ2FjeSdgLlxuICAgKlxuICAgKiBUaGUgZGVmYXVsdCBpbiB2MTEgaXMgYGNvcnJlY3RlZGAuXG4gICAqL1xuICByZWxhdGl2ZUxpbmtSZXNvbHV0aW9uPzogJ2xlZ2FjeSd8J2NvcnJlY3RlZCc7XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgaG93IHRoZSBSb3V0ZXIgYXR0ZW1wdHMgdG8gcmVzdG9yZSBzdGF0ZSB3aGVuIGEgbmF2aWdhdGlvbiBpcyBjYW5jZWxsZWQuXG4gICAqXG4gICAqICdyZXBsYWNlJyAtIEFsd2F5cyB1c2VzIGBsb2NhdGlvbi5yZXBsYWNlU3RhdGVgIHRvIHNldCB0aGUgYnJvd3NlciBzdGF0ZSB0byB0aGUgc3RhdGUgb2YgdGhlXG4gICAqIHJvdXRlciBiZWZvcmUgdGhlIG5hdmlnYXRpb24gc3RhcnRlZC4gVGhpcyBtZWFucyB0aGF0IGlmIHRoZSBVUkwgb2YgdGhlIGJyb3dzZXIgaXMgdXBkYXRlZFxuICAgKiBfYmVmb3JlXyB0aGUgbmF2aWdhdGlvbiBpcyBjYW5jZWxlZCwgdGhlIFJvdXRlciB3aWxsIHNpbXBseSByZXBsYWNlIHRoZSBpdGVtIGluIGhpc3RvcnkgcmF0aGVyXG4gICAqIHRoYW4gdHJ5aW5nIHRvIHJlc3RvcmUgdG8gdGhlIHByZXZpb3VzIGxvY2F0aW9uIGluIHRoZSBzZXNzaW9uIGhpc3RvcnkuIFRoaXMgaGFwcGVucyBtb3N0XG4gICAqIGZyZXF1ZW50bHkgd2l0aCBgdXJsVXBkYXRlU3RyYXRlZ3k6ICdlYWdlcidgIGFuZCBuYXZpZ2F0aW9ucyB3aXRoIHRoZSBicm93c2VyIGJhY2svZm9yd2FyZFxuICAgKiBidXR0b25zLlxuICAgKlxuICAgKiAnY29tcHV0ZWQnIC0gV2lsbCBhdHRlbXB0IHRvIHJldHVybiB0byB0aGUgc2FtZSBpbmRleCBpbiB0aGUgc2Vzc2lvbiBoaXN0b3J5IHRoYXQgY29ycmVzcG9uZHNcbiAgICogdG8gdGhlIEFuZ3VsYXIgcm91dGUgd2hlbiB0aGUgbmF2aWdhdGlvbiBnZXRzIGNhbmNlbGxlZC4gRm9yIGV4YW1wbGUsIGlmIHRoZSBicm93c2VyIGJhY2tcbiAgICogYnV0dG9uIGlzIGNsaWNrZWQgYW5kIHRoZSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGxlZCwgdGhlIFJvdXRlciB3aWxsIHRyaWdnZXIgYSBmb3J3YXJkIG5hdmlnYXRpb25cbiAgICogYW5kIHZpY2UgdmVyc2EuXG4gICAqXG4gICAqIE5vdGU6IHRoZSAnY29tcHV0ZWQnIG9wdGlvbiBpcyBpbmNvbXBhdGlibGUgd2l0aCBhbnkgYFVybEhhbmRsaW5nU3RyYXRlZ3lgIHdoaWNoIG9ubHlcbiAgICogaGFuZGxlcyBhIHBvcnRpb24gb2YgdGhlIFVSTCBiZWNhdXNlIHRoZSBoaXN0b3J5IHJlc3RvcmF0aW9uIG5hdmlnYXRlcyB0byB0aGUgcHJldmlvdXMgcGxhY2UgaW5cbiAgICogdGhlIGJyb3dzZXIgaGlzdG9yeSByYXRoZXIgdGhhbiBzaW1wbHkgcmVzZXR0aW5nIGEgcG9ydGlvbiBvZiB0aGUgVVJMLlxuICAgKlxuICAgKiBUaGUgZGVmYXVsdCB2YWx1ZSBpcyBgcmVwbGFjZWAgd2hlbiBub3Qgc2V0LlxuICAgKi9cbiAgY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbj86ICdyZXBsYWNlJ3wnY29tcHV0ZWQnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBSb3V0ZXIoXG4gICAgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgY29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIGxvY2F0aW9uOiBMb2NhdGlvbixcbiAgICBpbmplY3RvcjogSW5qZWN0b3IsIGNvbXBpbGVyOiBDb21waWxlciwgY29uZmlnOiBSb3V0ZVtdW10sIG9wdHM6IEV4dHJhT3B0aW9ucyA9IHt9LFxuICAgIGRlZmF1bHRUaXRsZVN0cmF0ZWd5OiBEZWZhdWx0VGl0bGVTdHJhdGVneSwgdGl0bGVTdHJhdGVneT86IFRpdGxlU3RyYXRlZ3ksXG4gICAgdXJsSGFuZGxpbmdTdHJhdGVneT86IFVybEhhbmRsaW5nU3RyYXRlZ3ksIHJvdXRlUmV1c2VTdHJhdGVneT86IFJvdXRlUmV1c2VTdHJhdGVneSkge1xuICBjb25zdCByb3V0ZXIgPVxuICAgICAgbmV3IFJvdXRlcihudWxsLCB1cmxTZXJpYWxpemVyLCBjb250ZXh0cywgbG9jYXRpb24sIGluamVjdG9yLCBjb21waWxlciwgZmxhdHRlbihjb25maWcpKTtcblxuICBpZiAodXJsSGFuZGxpbmdTdHJhdGVneSkge1xuICAgIHJvdXRlci51cmxIYW5kbGluZ1N0cmF0ZWd5ID0gdXJsSGFuZGxpbmdTdHJhdGVneTtcbiAgfVxuXG4gIGlmIChyb3V0ZVJldXNlU3RyYXRlZ3kpIHtcbiAgICByb3V0ZXIucm91dGVSZXVzZVN0cmF0ZWd5ID0gcm91dGVSZXVzZVN0cmF0ZWd5O1xuICB9XG5cbiAgcm91dGVyLnRpdGxlU3RyYXRlZ3kgPSB0aXRsZVN0cmF0ZWd5ID8/IGRlZmF1bHRUaXRsZVN0cmF0ZWd5O1xuXG4gIGFzc2lnbkV4dHJhT3B0aW9uc1RvUm91dGVyKG9wdHMsIHJvdXRlcik7XG5cbiAgaWYgKG9wdHMuZW5hYmxlVHJhY2luZykge1xuICAgIHJvdXRlci5ldmVudHMuc3Vic2NyaWJlKChlOiBFdmVudCkgPT4ge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuICAgICAgY29uc29sZS5ncm91cD8uKGBSb3V0ZXIgRXZlbnQ6ICR7KDxhbnk+ZS5jb25zdHJ1Y3RvcikubmFtZX1gKTtcbiAgICAgIGNvbnNvbGUubG9nKGUudG9TdHJpbmcoKSk7XG4gICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgIGNvbnNvbGUuZ3JvdXBFbmQ/LigpO1xuICAgICAgLy8gdHNsaW50OmVuYWJsZTpuby1jb25zb2xlXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gcm91dGVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzaWduRXh0cmFPcHRpb25zVG9Sb3V0ZXIob3B0czogRXh0cmFPcHRpb25zLCByb3V0ZXI6IFJvdXRlcik6IHZvaWQge1xuICBpZiAob3B0cy5lcnJvckhhbmRsZXIpIHtcbiAgICByb3V0ZXIuZXJyb3JIYW5kbGVyID0gb3B0cy5lcnJvckhhbmRsZXI7XG4gIH1cblxuICBpZiAob3B0cy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIpIHtcbiAgICByb3V0ZXIubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyID0gb3B0cy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI7XG4gIH1cblxuICBpZiAob3B0cy5vblNhbWVVcmxOYXZpZ2F0aW9uKSB7XG4gICAgcm91dGVyLm9uU2FtZVVybE5hdmlnYXRpb24gPSBvcHRzLm9uU2FtZVVybE5hdmlnYXRpb247XG4gIH1cblxuICBpZiAob3B0cy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5KSB7XG4gICAgcm91dGVyLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kgPSBvcHRzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k7XG4gIH1cblxuICBpZiAob3B0cy5yZWxhdGl2ZUxpbmtSZXNvbHV0aW9uKSB7XG4gICAgcm91dGVyLnJlbGF0aXZlTGlua1Jlc29sdXRpb24gPSBvcHRzLnJlbGF0aXZlTGlua1Jlc29sdXRpb247XG4gIH1cblxuICBpZiAob3B0cy51cmxVcGRhdGVTdHJhdGVneSkge1xuICAgIHJvdXRlci51cmxVcGRhdGVTdHJhdGVneSA9IG9wdHMudXJsVXBkYXRlU3RyYXRlZ3k7XG4gIH1cblxuICBpZiAob3B0cy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uKSB7XG4gICAgcm91dGVyLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPSBvcHRzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb247XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJvb3RSb3V0ZShyb3V0ZXI6IFJvdXRlcik6IEFjdGl2YXRlZFJvdXRlIHtcbiAgcmV0dXJuIHJvdXRlci5yb3V0ZXJTdGF0ZS5yb290O1xufVxuXG4vKipcbiAqIFJvdXRlciBpbml0aWFsaXphdGlvbiByZXF1aXJlcyB0d28gc3RlcHM6XG4gKlxuICogRmlyc3QsIHdlIHN0YXJ0IHRoZSBuYXZpZ2F0aW9uIGluIGEgYEFQUF9JTklUSUFMSVpFUmAgdG8gYmxvY2sgdGhlIGJvb3RzdHJhcCBpZlxuICogYSByZXNvbHZlciBvciBhIGd1YXJkIGV4ZWN1dGVzIGFzeW5jaHJvbm91c2x5LlxuICpcbiAqIE5leHQsIHdlIGFjdHVhbGx5IHJ1biBhY3RpdmF0aW9uIGluIGEgYEJPT1RTVFJBUF9MSVNURU5FUmAsIHVzaW5nIHRoZVxuICogYGFmdGVyUHJlYWN0aXZhdGlvbmAgaG9vayBwcm92aWRlZCBieSB0aGUgcm91dGVyLlxuICogVGhlIHJvdXRlciBuYXZpZ2F0aW9uIHN0YXJ0cywgcmVhY2hlcyB0aGUgcG9pbnQgd2hlbiBwcmVhY3RpdmF0aW9uIGlzIGRvbmUsIGFuZCB0aGVuXG4gKiBwYXVzZXMuIEl0IHdhaXRzIGZvciB0aGUgaG9vayB0byBiZSByZXNvbHZlZC4gV2UgdGhlbiByZXNvbHZlIGl0IG9ubHkgaW4gYSBib290c3RyYXAgbGlzdGVuZXIuXG4gKi9cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBSb3V0ZXJJbml0aWFsaXplciBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIHByaXZhdGUgaW5pdE5hdmlnYXRpb24gPSBmYWxzZTtcbiAgcHJpdmF0ZSBkZXN0cm95ZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSByZXN1bHRPZlByZWFjdGl2YXRpb25Eb25lID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGluamVjdG9yOiBJbmplY3Rvcikge31cblxuICBhcHBJbml0aWFsaXplcigpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IHA6IFByb21pc2U8YW55PiA9IHRoaXMuaW5qZWN0b3IuZ2V0KExPQ0FUSU9OX0lOSVRJQUxJWkVELCBQcm9taXNlLnJlc29sdmUobnVsbCkpO1xuICAgIHJldHVybiBwLnRoZW4oKCkgPT4ge1xuICAgICAgLy8gSWYgdGhlIGluamVjdG9yIHdhcyBkZXN0cm95ZWQsIHRoZSBESSBsb29rdXBzIGJlbG93IHdpbGwgZmFpbC5cbiAgICAgIGlmICh0aGlzLmRlc3Ryb3llZCkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRydWUpO1xuICAgICAgfVxuXG4gICAgICBsZXQgcmVzb2x2ZTogRnVuY3Rpb24gPSBudWxsITtcbiAgICAgIGNvbnN0IHJlcyA9IG5ldyBQcm9taXNlKHIgPT4gcmVzb2x2ZSA9IHIpO1xuICAgICAgY29uc3Qgcm91dGVyID0gdGhpcy5pbmplY3Rvci5nZXQoUm91dGVyKTtcbiAgICAgIGNvbnN0IG9wdHMgPSB0aGlzLmluamVjdG9yLmdldChST1VURVJfQ09ORklHVVJBVElPTik7XG5cbiAgICAgIGlmIChvcHRzLmluaXRpYWxOYXZpZ2F0aW9uID09PSAnZGlzYWJsZWQnKSB7XG4gICAgICAgIHJvdXRlci5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgLy8gVE9ETzogZW5hYmxlZCBpcyBkZXByZWNhdGVkIGFzIG9mIHYxMSwgY2FuIGJlIHJlbW92ZWQgaW4gdjEzXG4gICAgICAgICAgb3B0cy5pbml0aWFsTmF2aWdhdGlvbiA9PT0gJ2VuYWJsZWQnIHx8IG9wdHMuaW5pdGlhbE5hdmlnYXRpb24gPT09ICdlbmFibGVkQmxvY2tpbmcnKSB7XG4gICAgICAgIHJvdXRlci5ob29rcy5hZnRlclByZWFjdGl2YXRpb24gPSAoKSA9PiB7XG4gICAgICAgICAgLy8gb25seSB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIHNob3VsZCBiZSBkZWxheWVkXG4gICAgICAgICAgaWYgKCF0aGlzLmluaXROYXZpZ2F0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLmluaXROYXZpZ2F0aW9uID0gdHJ1ZTtcbiAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZXN1bHRPZlByZWFjdGl2YXRpb25Eb25lO1xuXG4gICAgICAgICAgICAvLyBzdWJzZXF1ZW50IG5hdmlnYXRpb25zIHNob3VsZCBub3QgYmUgZGVsYXllZFxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gb2YobnVsbCkgYXMgYW55O1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcm91dGVyLmluaXRpYWxOYXZpZ2F0aW9uKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzO1xuICAgIH0pO1xuICB9XG5cbiAgYm9vdHN0cmFwTGlzdGVuZXIoYm9vdHN0cmFwcGVkQ29tcG9uZW50UmVmOiBDb21wb25lbnRSZWY8YW55Pik6IHZvaWQge1xuICAgIGNvbnN0IG9wdHMgPSB0aGlzLmluamVjdG9yLmdldChST1VURVJfQ09ORklHVVJBVElPTik7XG4gICAgY29uc3QgcHJlbG9hZGVyID0gdGhpcy5pbmplY3Rvci5nZXQoUm91dGVyUHJlbG9hZGVyKTtcbiAgICBjb25zdCByb3V0ZXJTY3JvbGxlciA9IHRoaXMuaW5qZWN0b3IuZ2V0KFJvdXRlclNjcm9sbGVyKTtcbiAgICBjb25zdCByb3V0ZXIgPSB0aGlzLmluamVjdG9yLmdldChSb3V0ZXIpO1xuICAgIGNvbnN0IHJlZiA9IHRoaXMuaW5qZWN0b3IuZ2V0PEFwcGxpY2F0aW9uUmVmPihBcHBsaWNhdGlvblJlZik7XG5cbiAgICBpZiAoYm9vdHN0cmFwcGVkQ29tcG9uZW50UmVmICE9PSByZWYuY29tcG9uZW50c1swXSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIERlZmF1bHQgY2FzZVxuICAgIGlmIChvcHRzLmluaXRpYWxOYXZpZ2F0aW9uID09PSAnZW5hYmxlZE5vbkJsb2NraW5nJyB8fCBvcHRzLmluaXRpYWxOYXZpZ2F0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJvdXRlci5pbml0aWFsTmF2aWdhdGlvbigpO1xuICAgIH1cblxuICAgIHByZWxvYWRlci5zZXRVcFByZWxvYWRpbmcoKTtcbiAgICByb3V0ZXJTY3JvbGxlci5pbml0KCk7XG4gICAgcm91dGVyLnJlc2V0Um9vdENvbXBvbmVudFR5cGUocmVmLmNvbXBvbmVudFR5cGVzWzBdKTtcbiAgICB0aGlzLnJlc3VsdE9mUHJlYWN0aXZhdGlvbkRvbmUubmV4dChudWxsISk7XG4gICAgdGhpcy5yZXN1bHRPZlByZWFjdGl2YXRpb25Eb25lLmNvbXBsZXRlKCk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpIHtcbiAgICB0aGlzLmRlc3Ryb3llZCA9IHRydWU7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFwcEluaXRpYWxpemVyKHI6IFJvdXRlckluaXRpYWxpemVyKSB7XG4gIHJldHVybiByLmFwcEluaXRpYWxpemVyLmJpbmQocik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRCb290c3RyYXBMaXN0ZW5lcihyOiBSb3V0ZXJJbml0aWFsaXplcikge1xuICByZXR1cm4gci5ib290c3RyYXBMaXN0ZW5lci5iaW5kKHIpO1xufVxuXG4vKipcbiAqIEEgW0RJIHRva2VuXShndWlkZS9nbG9zc2FyeS8jZGktdG9rZW4pIGZvciB0aGUgcm91dGVyIGluaXRpYWxpemVyIHRoYXRcbiAqIGlzIGNhbGxlZCBhZnRlciB0aGUgYXBwIGlzIGJvb3RzdHJhcHBlZC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjb25zdCBST1VURVJfSU5JVElBTElaRVIgPVxuICAgIG5ldyBJbmplY3Rpb25Ub2tlbjwoY29tcFJlZjogQ29tcG9uZW50UmVmPGFueT4pID0+IHZvaWQ+KCdSb3V0ZXIgSW5pdGlhbGl6ZXInKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVSb3V0ZXJJbml0aWFsaXplcigpOiBSZWFkb25seUFycmF5PFByb3ZpZGVyPiB7XG4gIHJldHVybiBbXG4gICAgUm91dGVySW5pdGlhbGl6ZXIsXG4gICAge1xuICAgICAgcHJvdmlkZTogQVBQX0lOSVRJQUxJWkVSLFxuICAgICAgbXVsdGk6IHRydWUsXG4gICAgICB1c2VGYWN0b3J5OiBnZXRBcHBJbml0aWFsaXplcixcbiAgICAgIGRlcHM6IFtSb3V0ZXJJbml0aWFsaXplcl1cbiAgICB9LFxuICAgIHtwcm92aWRlOiBST1VURVJfSU5JVElBTElaRVIsIHVzZUZhY3Rvcnk6IGdldEJvb3RzdHJhcExpc3RlbmVyLCBkZXBzOiBbUm91dGVySW5pdGlhbGl6ZXJdfSxcbiAgICB7cHJvdmlkZTogQVBQX0JPT1RTVFJBUF9MSVNURU5FUiwgbXVsdGk6IHRydWUsIHVzZUV4aXN0aW5nOiBST1VURVJfSU5JVElBTElaRVJ9LFxuICBdO1xufVxuIl19