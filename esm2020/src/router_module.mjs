/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { HashLocationStrategy, Location, LocationStrategy, PathLocationStrategy, ViewportScroller } from '@angular/common';
import { APP_BOOTSTRAP_LISTENER, inject, Inject, InjectionToken, NgModule, NgProbeToken, NgZone, Optional, SkipSelf, ɵRuntimeError as RuntimeError } from '@angular/core';
import { EmptyOutletComponent } from './components/empty_outlet';
import { RouterLink } from './directives/router_link';
import { RouterLinkActive } from './directives/router_link_active';
import { RouterOutlet } from './directives/router_outlet';
import { NavigationTransitions } from './navigation_transition';
import { getBootstrapListener, rootRoute, ROUTER_IS_PROVIDED, withDebugTracing, withDisabledInitialNavigation, withEnabledBlockingInitialNavigation, withPreloading } from './provide_router';
import { Router } from './router';
import { ROUTER_CONFIGURATION } from './router_config';
import { RouterConfigLoader, ROUTES } from './router_config_loader';
import { ChildrenOutletContexts } from './router_outlet_context';
import { ROUTER_SCROLLER, RouterScroller } from './router_scroller';
import { ActivatedRoute } from './router_state';
import { DefaultUrlSerializer, UrlSerializer } from './url_tree';
import * as i0 from "@angular/core";
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || ngDevMode;
/**
 * The directives defined in the `RouterModule`.
 */
const ROUTER_DIRECTIVES = [RouterOutlet, RouterLink, RouterLinkActive, EmptyOutletComponent];
/**
 * @docsNotRequired
 */
export const ROUTER_FORROOT_GUARD = new InjectionToken(NG_DEV_MODE ? 'router duplicate forRoot guard' : 'ROUTER_FORROOT_GUARD');
// TODO(atscott): All of these except `ActivatedRoute` are `providedIn: 'root'`. They are only kept
// here to avoid a breaking change whereby the provider order matters based on where the
// `RouterModule`/`RouterTestingModule` is imported. These can/should be removed as a "breaking"
// change in a major version.
export const ROUTER_PROVIDERS = [
    Location,
    { provide: UrlSerializer, useClass: DefaultUrlSerializer },
    Router,
    ChildrenOutletContexts,
    { provide: ActivatedRoute, useFactory: rootRoute, deps: [Router] },
    RouterConfigLoader,
    // Only used to warn when `provideRoutes` is used without `RouterModule` or `provideRouter`. Can
    // be removed when `provideRoutes` is removed.
    NG_DEV_MODE ? { provide: ROUTER_IS_PROVIDED, useValue: true } : [],
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
class RouterModule {
    constructor(guard) { }
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
                NG_DEV_MODE ? (config?.enableTracing ? withDebugTracing().ɵproviders : []) : [],
                { provide: ROUTES, multi: true, useValue: routes },
                {
                    provide: ROUTER_FORROOT_GUARD,
                    useFactory: provideForRootGuard,
                    deps: [[Router, new Optional(), new SkipSelf()]]
                },
                { provide: ROUTER_CONFIGURATION, useValue: config ? config : {} },
                config?.useHash ? provideHashLocationStrategy() : providePathLocationStrategy(),
                provideRouterScroller(),
                config?.preloadingStrategy ? withPreloading(config.preloadingStrategy).ɵproviders : [],
                { provide: NgProbeToken, multi: true, useFactory: routerNgProbeToken },
                config?.initialNavigation ? provideInitialNavigation(config) : [],
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
        return {
            ngModule: RouterModule,
            providers: [{ provide: ROUTES, multi: true, useValue: routes }],
        };
    }
}
RouterModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.3+sha-66fe827", ngImport: i0, type: RouterModule, deps: [{ token: ROUTER_FORROOT_GUARD, optional: true }], target: i0.ɵɵFactoryTarget.NgModule });
RouterModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "16.0.0-next.3+sha-66fe827", ngImport: i0, type: RouterModule, imports: [RouterOutlet, RouterLink, RouterLinkActive, EmptyOutletComponent], exports: [RouterOutlet, RouterLink, RouterLinkActive, EmptyOutletComponent] });
RouterModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "16.0.0-next.3+sha-66fe827", ngImport: i0, type: RouterModule, imports: [EmptyOutletComponent] });
export { RouterModule };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.3+sha-66fe827", ngImport: i0, type: RouterModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: ROUTER_DIRECTIVES,
                    exports: ROUTER_DIRECTIVES,
                }]
        }], ctorParameters: function () { return [{ type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [ROUTER_FORROOT_GUARD]
                }] }]; } });
/**
 * For internal use by `RouterModule` only. Note that this differs from `withInMemoryRouterScroller`
 * because it reads from the `ExtraOptions` which should not be used in the standalone world.
 */
export function provideRouterScroller() {
    return {
        provide: ROUTER_SCROLLER,
        useFactory: () => {
            const viewportScroller = inject(ViewportScroller);
            const zone = inject(NgZone);
            const config = inject(ROUTER_CONFIGURATION);
            const transitions = inject(NavigationTransitions);
            const urlSerializer = inject(UrlSerializer);
            if (config.scrollOffset) {
                viewportScroller.setOffset(config.scrollOffset);
            }
            return new RouterScroller(urlSerializer, transitions, viewportScroller, zone, config);
        },
    };
}
// Note: For internal use only with `RouterModule`. Standalone setup via `provideRouter` should
// provide hash location directly via `{provide: LocationStrategy, useClass: HashLocationStrategy}`.
function provideHashLocationStrategy() {
    return { provide: LocationStrategy, useClass: HashLocationStrategy };
}
// Note: For internal use only with `RouterModule`. Standalone setup via `provideRouter` does not
// need this at all because `PathLocationStrategy` is the default factory for `LocationStrategy`.
function providePathLocationStrategy() {
    return { provide: LocationStrategy, useClass: PathLocationStrategy };
}
export function provideForRootGuard(router) {
    if (NG_DEV_MODE && router) {
        throw new RuntimeError(4007 /* RuntimeErrorCode.FOR_ROOT_CALLED_TWICE */, `The Router was provided more than once. This can happen if 'forRoot' is used outside of the root injector.` +
            ` Lazy loaded modules should use RouterModule.forChild() instead.`);
    }
    return 'guarded';
}
// Note: For internal use only with `RouterModule`. Standalone router setup with `provideRouter`
// users call `withXInitialNavigation` directly.
function provideInitialNavigation(config) {
    return [
        config.initialNavigation === 'disabled' ? withDisabledInitialNavigation().ɵproviders : [],
        config.initialNavigation === 'enabledBlocking' ?
            withEnabledBlockingInitialNavigation().ɵproviders :
            [],
    ];
}
// TODO(atscott): This should not be in the public API
/**
 * A [DI token](guide/glossary/#di-token) for the router initializer that
 * is called after the app is bootstrapped.
 *
 * @publicApi
 */
export const ROUTER_INITIALIZER = new InjectionToken(NG_DEV_MODE ? 'Router Initializer' : '');
function provideRouterInitializer() {
    return [
        // ROUTER_INITIALIZER token should be removed. It's public API but shouldn't be. We can just
        // have `getBootstrapListener` directly attached to APP_BOOTSTRAP_LISTENER.
        { provide: ROUTER_INITIALIZER, useFactory: getBootstrapListener },
        { provide: APP_BOOTSTRAP_LISTENER, multi: true, useExisting: ROUTER_INITIALIZER },
    ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX21vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDekgsT0FBTyxFQUFDLHNCQUFzQixFQUFnQixNQUFNLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBdUIsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFZLFFBQVEsRUFBRSxhQUFhLElBQUksWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBRXJOLE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLDJCQUEyQixDQUFDO0FBQy9ELE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqRSxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFHeEQsT0FBTyxFQUFDLHFCQUFxQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDOUQsT0FBTyxFQUFDLG9CQUFvQixFQUFFLFNBQVMsRUFBRSxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBRSw2QkFBNkIsRUFBRSxvQ0FBb0MsRUFBRSxjQUFjLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUM1TCxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sRUFBZSxvQkFBb0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ25FLE9BQU8sRUFBQyxrQkFBa0IsRUFBRSxNQUFNLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUNsRSxPQUFPLEVBQUMsc0JBQXNCLEVBQUMs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RCxFQUFFO0tBQ1AsQ0FBQztBQUNKLENBQUM7QUFFRCxzREFBc0Q7QUFDdEQ7Ozs7O0dBS0c7QUFDSCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLGNBQWMsQ0FDaEQsV0FBVyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFFN0MsU0FBUyx3QkFBd0I7SUFDL0IsT0FBTztRQUNMLDRGQUE0RjtRQUM1RiwyRUFBMkU7UUFDM0UsRUFBQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxFQUFFLG9CQUFvQixFQUFDO1FBQy9ELEVBQUMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLGtCQUFrQixFQUFDO0tBQ2hGLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SGFzaExvY2F0aW9uU3RyYXRlZ3ksIExvY2F0aW9uLCBMb2NhdGlvblN0cmF0ZWd5LCBQYXRoTG9jYXRpb25TdHJhdGVneSwgVmlld3BvcnRTY3JvbGxlcn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7QVBQX0JPT1RTVFJBUF9MSVNURU5FUiwgQ29tcG9uZW50UmVmLCBpbmplY3QsIEluamVjdCwgSW5qZWN0aW9uVG9rZW4sIE1vZHVsZVdpdGhQcm92aWRlcnMsIE5nTW9kdWxlLCBOZ1Byb2JlVG9rZW4sIE5nWm9uZSwgT3B0aW9uYWwsIFByb3ZpZGVyLCBTa2lwU2VsZiwgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHtFbXB0eU91dGxldENvbXBvbmVudH0gZnJvbSAnLi9jb21wb25lbnRzL2VtcHR5X291dGxldCc7XG5pbXBvcnQge1JvdXRlckxpbmt9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfbGluayc7XG5pbXBvcnQge1JvdXRlckxpbmtBY3RpdmV9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfbGlua19hY3RpdmUnO1xuaW1wb3J0IHtSb3V0ZXJPdXRsZXR9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0JztcbmltcG9ydCB7UnVudGltZUVycm9yQ29kZX0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IHtSb3V0ZXN9IGZyb20gJy4vbW9kZWxzJztcbmltcG9ydCB7TmF2aWdhdGlvblRyYW5zaXRpb25zfSBmcm9tICcuL25hdmlnYXRpb25fdHJhbnNpdGlvbic7XG5pbXBvcnQge2dldEJvb3RzdHJhcExpc3RlbmVyLCByb290Um91dGUsIFJPVVRFUl9JU19QUk9WSURFRCwgd2l0aERlYnVnVHJhY2luZywgd2l0aERpc2FibGVkSW5pdGlhbE5hdmlnYXRpb24sIHdpdGhFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbiwgd2l0aFByZWxvYWRpbmd9IGZyb20gJy4vcHJvdmlkZV9yb3V0ZXInO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJy4vcm91dGVyJztcbmltcG9ydCB7RXh0cmFPcHRpb25zLCBST1VURVJfQ09ORklHVVJBVElPTn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnJztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyLCBST1VURVN9IGZyb20gJy4vcm91dGVyX2NvbmZpZ19sb2FkZXInO1xuaW1wb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzfSBmcm9tICcuL3JvdXRlcl9vdXRsZXRfY29udGV4dCc7XG5pbXBvcnQge1JPVVRFUl9TQ1JPTExFUiwgUm91dGVyU2Nyb2xsZXJ9IGZyb20gJy4vcm91dGVyX3Njcm9sbGVyJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGV9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7RGVmYXVsdFVybFNlcmlhbGl6ZXIsIFVybFNlcmlhbGl6ZXJ9IGZyb20gJy4vdXJsX3RyZWUnO1xuXG5jb25zdCBOR19ERVZfTU9ERSA9IHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZTtcblxuLyoqXG4gKiBUaGUgZGlyZWN0aXZlcyBkZWZpbmVkIGluIHRoZSBgUm91dGVyTW9kdWxlYC5cbiAqL1xuY29uc3QgUk9VVEVSX0RJUkVDVElWRVMgPSBbUm91dGVyT3V0bGV0LCBSb3V0ZXJMaW5rLCBSb3V0ZXJMaW5rQWN0aXZlLCBFbXB0eU91dGxldENvbXBvbmVudF07XG5cbi8qKlxuICogQGRvY3NOb3RSZXF1aXJlZFxuICovXG5leHBvcnQgY29uc3QgUk9VVEVSX0ZPUlJPT1RfR1VBUkQgPSBuZXcgSW5qZWN0aW9uVG9rZW48dm9pZD4oXG4gICAgTkdfREVWX01PREUgPyAncm91dGVyIGR1cGxpY2F0ZSBmb3JSb290IGd1YXJkJyA6ICdST1VURVJfRk9SUk9PVF9HVUFSRCcpO1xuXG4vLyBUT0RPKGF0c2NvdHQpOiBBbGwgb2YgdGhlc2UgZXhjZXB0IGBBY3RpdmF0ZWRSb3V0ZWAgYXJlIGBwcm92aWRlZEluOiAncm9vdCdgLiBUaGV5IGFyZSBvbmx5IGtlcHRcbi8vIGhlcmUgdG8gYXZvaWQgYSBicmVha2luZyBjaGFuZ2Ugd2hlcmVieSB0aGUgcHJvdmlkZXIgb3JkZXIgbWF0dGVycyBiYXNlZCBvbiB3aGVyZSB0aGVcbi8vIGBSb3V0ZXJNb2R1bGVgL2BSb3V0ZXJUZXN0aW5nTW9kdWxlYCBpcyBpbXBvcnRlZC4gVGhlc2UgY2FuL3Nob3VsZCBiZSByZW1vdmVkIGFzIGEgXCJicmVha2luZ1wiXG4vLyBjaGFuZ2UgaW4gYSBtYWpvciB2ZXJzaW9uLlxuZXhwb3J0IGNvbnN0IFJPVVRFUl9QUk9WSURFUlM6IFByb3ZpZGVyW10gPSBbXG4gIExvY2F0aW9uLFxuICB7cHJvdmlkZTogVXJsU2VyaWFsaXplciwgdXNlQ2xhc3M6IERlZmF1bHRVcmxTZXJpYWxpemVyfSxcbiAgUm91dGVyLFxuICBDaGlsZHJlbk91dGxldENvbnRleHRzLFxuICB7cHJvdmlkZTogQWN0aXZhdGVkUm91dGUsIHVzZUZhY3Rvcnk6IHJvb3RSb3V0ZSwgZGVwczogW1JvdXRlcl19LFxuICBSb3V0ZXJDb25maWdMb2FkZXIsXG4gIC8vIE9ubHkgdXNlZCB0byB3YXJuIHdoZW4gYHByb3ZpZGVSb3V0ZXNgIGlzIHVzZWQgd2l0aG91dCBgUm91dGVyTW9kdWxlYCBvciBgcHJvdmlkZVJvdXRlcmAuIENhblxuICAvLyBiZSByZW1vdmVkIHdoZW4gYHByb3ZpZGVSb3V0ZXNgIGlzIHJlbW92ZWQuXG4gIE5HX0RFVl9NT0RFID8ge3Byb3ZpZGU6IFJPVVRFUl9JU19QUk9WSURFRCwgdXNlVmFsdWU6IHRydWV9IDogW10sXG5dO1xuXG5leHBvcnQgZnVuY3Rpb24gcm91dGVyTmdQcm9iZVRva2VuKCkge1xuICByZXR1cm4gbmV3IE5nUHJvYmVUb2tlbignUm91dGVyJywgUm91dGVyKTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBBZGRzIGRpcmVjdGl2ZXMgYW5kIHByb3ZpZGVycyBmb3IgaW4tYXBwIG5hdmlnYXRpb24gYW1vbmcgdmlld3MgZGVmaW5lZCBpbiBhbiBhcHBsaWNhdGlvbi5cbiAqIFVzZSB0aGUgQW5ndWxhciBgUm91dGVyYCBzZXJ2aWNlIHRvIGRlY2xhcmF0aXZlbHkgc3BlY2lmeSBhcHBsaWNhdGlvbiBzdGF0ZXMgYW5kIG1hbmFnZSBzdGF0ZVxuICogdHJhbnNpdGlvbnMuXG4gKlxuICogWW91IGNhbiBpbXBvcnQgdGhpcyBOZ01vZHVsZSBtdWx0aXBsZSB0aW1lcywgb25jZSBmb3IgZWFjaCBsYXp5LWxvYWRlZCBidW5kbGUuXG4gKiBIb3dldmVyLCBvbmx5IG9uZSBgUm91dGVyYCBzZXJ2aWNlIGNhbiBiZSBhY3RpdmUuXG4gKiBUbyBlbnN1cmUgdGhpcywgdGhlcmUgYXJlIHR3byB3YXlzIHRvIHJlZ2lzdGVyIHJvdXRlcyB3aGVuIGltcG9ydGluZyB0aGlzIG1vZHVsZTpcbiAqXG4gKiAqIFRoZSBgZm9yUm9vdCgpYCBtZXRob2QgY3JlYXRlcyBhbiBgTmdNb2R1bGVgIHRoYXQgY29udGFpbnMgYWxsIHRoZSBkaXJlY3RpdmVzLCB0aGUgZ2l2ZW5cbiAqIHJvdXRlcywgYW5kIHRoZSBgUm91dGVyYCBzZXJ2aWNlIGl0c2VsZi5cbiAqICogVGhlIGBmb3JDaGlsZCgpYCBtZXRob2QgY3JlYXRlcyBhbiBgTmdNb2R1bGVgIHRoYXQgY29udGFpbnMgYWxsIHRoZSBkaXJlY3RpdmVzIGFuZCB0aGUgZ2l2ZW5cbiAqIHJvdXRlcywgYnV0IGRvZXMgbm90IGluY2x1ZGUgdGhlIGBSb3V0ZXJgIHNlcnZpY2UuXG4gKlxuICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGVyKSBmb3IgYW5cbiAqIG92ZXJ2aWV3IG9mIGhvdyB0aGUgYFJvdXRlcmAgc2VydmljZSBzaG91bGQgYmUgdXNlZC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBOZ01vZHVsZSh7XG4gIGltcG9ydHM6IFJPVVRFUl9ESVJFQ1RJVkVTLFxuICBleHBvcnRzOiBST1VURVJfRElSRUNUSVZFUyxcbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyTW9kdWxlIHtcbiAgY29uc3RydWN0b3IoQE9wdGlvbmFsKCkgQEluamVjdChST1VURVJfRk9SUk9PVF9HVUFSRCkgZ3VhcmQ6IGFueSkge31cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbmQgY29uZmlndXJlcyBhIG1vZHVsZSB3aXRoIGFsbCB0aGUgcm91dGVyIHByb3ZpZGVycyBhbmQgZGlyZWN0aXZlcy5cbiAgICogT3B0aW9uYWxseSBzZXRzIHVwIGFuIGFwcGxpY2F0aW9uIGxpc3RlbmVyIHRvIHBlcmZvcm0gYW4gaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBXaGVuIHJlZ2lzdGVyaW5nIHRoZSBOZ01vZHVsZSBhdCB0aGUgcm9vdCwgaW1wb3J0IGFzIGZvbGxvd3M6XG4gICAqXG4gICAqIGBgYFxuICAgKiBATmdNb2R1bGUoe1xuICAgKiAgIGltcG9ydHM6IFtSb3V0ZXJNb2R1bGUuZm9yUm9vdChST1VURVMpXVxuICAgKiB9KVxuICAgKiBjbGFzcyBNeU5nTW9kdWxlIHt9XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gcm91dGVzIEFuIGFycmF5IG9mIGBSb3V0ZWAgb2JqZWN0cyB0aGF0IGRlZmluZSB0aGUgbmF2aWdhdGlvbiBwYXRocyBmb3IgdGhlIGFwcGxpY2F0aW9uLlxuICAgKiBAcGFyYW0gY29uZmlnIEFuIGBFeHRyYU9wdGlvbnNgIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHRoYXQgY29udHJvbHMgaG93IG5hdmlnYXRpb24gaXMgcGVyZm9ybWVkLlxuICAgKiBAcmV0dXJuIFRoZSBuZXcgYE5nTW9kdWxlYC5cbiAgICpcbiAgICovXG4gIHN0YXRpYyBmb3JSb290KHJvdXRlczogUm91dGVzLCBjb25maWc/OiBFeHRyYU9wdGlvbnMpOiBNb2R1bGVXaXRoUHJvdmlkZXJzPFJvdXRlck1vZHVsZT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuZ01vZHVsZTogUm91dGVyTW9kdWxlLFxuICAgICAgcHJvdmlkZXJzOiBbXG4gICAgICAgIFJPVVRFUl9QUk9WSURFUlMsXG4gICAgICAgIE5HX0RFVl9NT0RFID8gKGNvbmZpZz8uZW5hYmxlVHJhY2luZyA/IHdpdGhEZWJ1Z1RyYWNpbmcoKS7JtXByb3ZpZGVycyA6IFtdKSA6IFtdLFxuICAgICAgICB7cHJvdmlkZTogUk9VVEVTLCBtdWx0aTogdHJ1ZSwgdXNlVmFsdWU6IHJvdXRlc30sXG4gICAgICAgIHtcbiAgICAgICAgICBwcm92aWRlOiBST1VURVJfRk9SUk9PVF9HVUFSRCxcbiAgICAgICAgICB1c2VGYWN0b3J5OiBwcm92aWRlRm9yUm9vdEd1YXJkLFxuICAgICAgICAgIGRlcHM6IFtbUm91dGVyLCBuZXcgT3B0aW9uYWwoKSwgbmV3IFNraXBTZWxmKCldXVxuICAgICAgICB9LFxuICAgICAgICB7cHJvdmlkZTogUk9VVEVSX0NPTkZJR1VSQVRJT04sIHVzZVZhbHVlOiBjb25maWcgPyBjb25maWcgOiB7fX0sXG4gICAgICAgIGNvbmZpZz8udXNlSGFzaCA/IHByb3ZpZGVIYXNoTG9jYXRpb25TdHJhdGVneSgpIDogcHJvdmlkZVBhdGhMb2NhdGlvblN0cmF0ZWd5KCksXG4gICAgICAgIHByb3ZpZGVSb3V0ZXJTY3JvbGxlcigpLFxuICAgICAgICBjb25maWc/LnByZWxvYWRpbmdTdHJhdGVneSA/IHdpdGhQcmVsb2FkaW5nKGNvbmZpZy5wcmVsb2FkaW5nU3RyYXRlZ3kpLsm1cHJvdmlkZXJzIDogW10sXG4gICAgICAgIHtwcm92aWRlOiBOZ1Byb2JlVG9rZW4sIG11bHRpOiB0cnVlLCB1c2VGYWN0b3J5OiByb3V0ZXJOZ1Byb2JlVG9rZW59LFxuICAgICAgICBjb25maWc/LmluaXRpYWxOYXZpZ2F0aW9uID8gcHJvdmlkZUluaXRpYWxOYXZpZ2F0aW9uKGNvbmZpZykgOiBbXSxcbiAgICAgICAgcHJvdmlkZVJvdXRlckluaXRpYWxpemVyKCksXG4gICAgICBdLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG1vZHVsZSB3aXRoIGFsbCB0aGUgcm91dGVyIGRpcmVjdGl2ZXMgYW5kIGEgcHJvdmlkZXIgcmVnaXN0ZXJpbmcgcm91dGVzLFxuICAgKiB3aXRob3V0IGNyZWF0aW5nIGEgbmV3IFJvdXRlciBzZXJ2aWNlLlxuICAgKiBXaGVuIHJlZ2lzdGVyaW5nIGZvciBzdWJtb2R1bGVzIGFuZCBsYXp5LWxvYWRlZCBzdWJtb2R1bGVzLCBjcmVhdGUgdGhlIE5nTW9kdWxlIGFzIGZvbGxvd3M6XG4gICAqXG4gICAqIGBgYFxuICAgKiBATmdNb2R1bGUoe1xuICAgKiAgIGltcG9ydHM6IFtSb3V0ZXJNb2R1bGUuZm9yQ2hpbGQoUk9VVEVTKV1cbiAgICogfSlcbiAgICogY2xhc3MgTXlOZ01vZHVsZSB7fVxuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIHJvdXRlcyBBbiBhcnJheSBvZiBgUm91dGVgIG9iamVjdHMgdGhhdCBkZWZpbmUgdGhlIG5hdmlnYXRpb24gcGF0aHMgZm9yIHRoZSBzdWJtb2R1bGUuXG4gICAqIEByZXR1cm4gVGhlIG5ldyBOZ01vZHVsZS5cbiAgICpcbiAgICovXG4gIHN0YXRpYyBmb3JDaGlsZChyb3V0ZXM6IFJvdXRlcyk6IE1vZHVsZVdpdGhQcm92aWRlcnM8Um91dGVyTW9kdWxlPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5nTW9kdWxlOiBSb3V0ZXJNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFt7cHJvdmlkZTogUk9VVEVTLCBtdWx0aTogdHJ1ZSwgdXNlVmFsdWU6IHJvdXRlc31dLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBGb3IgaW50ZXJuYWwgdXNlIGJ5IGBSb3V0ZXJNb2R1bGVgIG9ubHkuIE5vdGUgdGhhdCB0aGlzIGRpZmZlcnMgZnJvbSBgd2l0aEluTWVtb3J5Um91dGVyU2Nyb2xsZXJgXG4gKiBiZWNhdXNlIGl0IHJlYWRzIGZyb20gdGhlIGBFeHRyYU9wdGlvbnNgIHdoaWNoIHNob3VsZCBub3QgYmUgdXNlZCBpbiB0aGUgc3RhbmRhbG9uZSB3b3JsZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVSb3V0ZXJTY3JvbGxlcigpOiBQcm92aWRlciB7XG4gIHJldHVybiB7XG4gICAgcHJvdmlkZTogUk9VVEVSX1NDUk9MTEVSLFxuICAgIHVzZUZhY3Rvcnk6ICgpID0+IHtcbiAgICAgIGNvbnN0IHZpZXdwb3J0U2Nyb2xsZXIgPSBpbmplY3QoVmlld3BvcnRTY3JvbGxlcik7XG4gICAgICBjb25zdCB6b25lID0gaW5qZWN0KE5nWm9uZSk7XG4gICAgICBjb25zdCBjb25maWc6IEV4dHJhT3B0aW9ucyA9IGluamVjdChST1VURVJfQ09ORklHVVJBVElPTik7XG4gICAgICBjb25zdCB0cmFuc2l0aW9ucyA9IGluamVjdChOYXZpZ2F0aW9uVHJhbnNpdGlvbnMpO1xuICAgICAgY29uc3QgdXJsU2VyaWFsaXplciA9IGluamVjdChVcmxTZXJpYWxpemVyKTtcbiAgICAgIGlmIChjb25maWcuc2Nyb2xsT2Zmc2V0KSB7XG4gICAgICAgIHZpZXdwb3J0U2Nyb2xsZXIuc2V0T2Zmc2V0KGNvbmZpZy5zY3JvbGxPZmZzZXQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBSb3V0ZXJTY3JvbGxlcih1cmxTZXJpYWxpemVyLCB0cmFuc2l0aW9ucywgdmlld3BvcnRTY3JvbGxlciwgem9uZSwgY29uZmlnKTtcbiAgICB9LFxuICB9O1xufVxuXG4vLyBOb3RlOiBGb3IgaW50ZXJuYWwgdXNlIG9ubHkgd2l0aCBgUm91dGVyTW9kdWxlYC4gU3RhbmRhbG9uZSBzZXR1cCB2aWEgYHByb3ZpZGVSb3V0ZXJgIHNob3VsZFxuLy8gcHJvdmlkZSBoYXNoIGxvY2F0aW9uIGRpcmVjdGx5IHZpYSBge3Byb3ZpZGU6IExvY2F0aW9uU3RyYXRlZ3ksIHVzZUNsYXNzOiBIYXNoTG9jYXRpb25TdHJhdGVneX1gLlxuZnVuY3Rpb24gcHJvdmlkZUhhc2hMb2NhdGlvblN0cmF0ZWd5KCk6IFByb3ZpZGVyIHtcbiAgcmV0dXJuIHtwcm92aWRlOiBMb2NhdGlvblN0cmF0ZWd5LCB1c2VDbGFzczogSGFzaExvY2F0aW9uU3RyYXRlZ3l9O1xufVxuXG4vLyBOb3RlOiBGb3IgaW50ZXJuYWwgdXNlIG9ubHkgd2l0aCBgUm91dGVyTW9kdWxlYC4gU3RhbmRhbG9uZSBzZXR1cCB2aWEgYHByb3ZpZGVSb3V0ZXJgIGRvZXMgbm90XG4vLyBuZWVkIHRoaXMgYXQgYWxsIGJlY2F1c2UgYFBhdGhMb2NhdGlvblN0cmF0ZWd5YCBpcyB0aGUgZGVmYXVsdCBmYWN0b3J5IGZvciBgTG9jYXRpb25TdHJhdGVneWAuXG5mdW5jdGlvbiBwcm92aWRlUGF0aExvY2F0aW9uU3RyYXRlZ3koKTogUHJvdmlkZXIge1xuICByZXR1cm4ge3Byb3ZpZGU6IExvY2F0aW9uU3RyYXRlZ3ksIHVzZUNsYXNzOiBQYXRoTG9jYXRpb25TdHJhdGVneX07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcm92aWRlRm9yUm9vdEd1YXJkKHJvdXRlcjogUm91dGVyKTogYW55IHtcbiAgaWYgKE5HX0RFVl9NT0RFICYmIHJvdXRlcikge1xuICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuRk9SX1JPT1RfQ0FMTEVEX1RXSUNFLFxuICAgICAgICBgVGhlIFJvdXRlciB3YXMgcHJvdmlkZWQgbW9yZSB0aGFuIG9uY2UuIFRoaXMgY2FuIGhhcHBlbiBpZiAnZm9yUm9vdCcgaXMgdXNlZCBvdXRzaWRlIG9mIHRoZSByb290IGluamVjdG9yLmAgK1xuICAgICAgICAgICAgYCBMYXp5IGxvYWRlZCBtb2R1bGVzIHNob3VsZCB1c2UgUm91dGVyTW9kdWxlLmZvckNoaWxkKCkgaW5zdGVhZC5gKTtcbiAgfVxuICByZXR1cm4gJ2d1YXJkZWQnO1xufVxuXG4vLyBOb3RlOiBGb3IgaW50ZXJuYWwgdXNlIG9ubHkgd2l0aCBgUm91dGVyTW9kdWxlYC4gU3RhbmRhbG9uZSByb3V0ZXIgc2V0dXAgd2l0aCBgcHJvdmlkZVJvdXRlcmBcbi8vIHVzZXJzIGNhbGwgYHdpdGhYSW5pdGlhbE5hdmlnYXRpb25gIGRpcmVjdGx5LlxuZnVuY3Rpb24gcHJvdmlkZUluaXRpYWxOYXZpZ2F0aW9uKGNvbmZpZzogUGljazxFeHRyYU9wdGlvbnMsICdpbml0aWFsTmF2aWdhdGlvbic+KTogUHJvdmlkZXJbXSB7XG4gIHJldHVybiBbXG4gICAgY29uZmlnLmluaXRpYWxOYXZpZ2F0aW9uID09PSAnZGlzYWJsZWQnID8gd2l0aERpc2FibGVkSW5pdGlhbE5hdmlnYXRpb24oKS7JtXByb3ZpZGVycyA6IFtdLFxuICAgIGNvbmZpZy5pbml0aWFsTmF2aWdhdGlvbiA9PT0gJ2VuYWJsZWRCbG9ja2luZycgP1xuICAgICAgICB3aXRoRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb24oKS7JtXByb3ZpZGVycyA6XG4gICAgICAgIFtdLFxuICBdO1xufVxuXG4vLyBUT0RPKGF0c2NvdHQpOiBUaGlzIHNob3VsZCBub3QgYmUgaW4gdGhlIHB1YmxpYyBBUElcbi8qKlxuICogQSBbREkgdG9rZW5dKGd1aWRlL2dsb3NzYXJ5LyNkaS10b2tlbikgZm9yIHRoZSByb3V0ZXIgaW5pdGlhbGl6ZXIgdGhhdFxuICogaXMgY2FsbGVkIGFmdGVyIHRoZSBhcHAgaXMgYm9vdHN0cmFwcGVkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9JTklUSUFMSVpFUiA9IG5ldyBJbmplY3Rpb25Ub2tlbjwoY29tcFJlZjogQ29tcG9uZW50UmVmPGFueT4pID0+IHZvaWQ+KFxuICAgIE5HX0RFVl9NT0RFID8gJ1JvdXRlciBJbml0aWFsaXplcicgOiAnJyk7XG5cbmZ1bmN0aW9uIHByb3ZpZGVSb3V0ZXJJbml0aWFsaXplcigpOiBQcm92aWRlcltdIHtcbiAgcmV0dXJuIFtcbiAgICAvLyBST1VURVJfSU5JVElBTElaRVIgdG9rZW4gc2hvdWxkIGJlIHJlbW92ZWQuIEl0J3MgcHVibGljIEFQSSBidXQgc2hvdWxkbid0IGJlLiBXZSBjYW4ganVzdFxuICAgIC8vIGhhdmUgYGdldEJvb3RzdHJhcExpc3RlbmVyYCBkaXJlY3RseSBhdHRhY2hlZCB0byBBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLlxuICAgIHtwcm92aWRlOiBST1VURVJfSU5JVElBTElaRVIsIHVzZUZhY3Rvcnk6IGdldEJvb3RzdHJhcExpc3RlbmVyfSxcbiAgICB7cHJvdmlkZTogQVBQX0JPT1RTVFJBUF9MSVNURU5FUiwgbXVsdGk6IHRydWUsIHVzZUV4aXN0aW5nOiBST1VURVJfSU5JVElBTElaRVJ9LFxuICBdO1xufVxuIl19