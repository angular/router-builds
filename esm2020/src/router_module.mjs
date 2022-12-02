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
import { Router, setupRouter } from './router';
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
    { provide: Router, useFactory: setupRouter },
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
export class RouterModule {
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
RouterModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.0.2+sha-dd4fd1f", ngImport: i0, type: RouterModule, deps: [{ token: ROUTER_FORROOT_GUARD, optional: true }], target: i0.ɵɵFactoryTarget.NgModule });
RouterModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.0.2+sha-dd4fd1f", ngImport: i0, type: RouterModule, imports: [RouterOutlet, RouterLink, RouterLinkActive, EmptyOutletComponent], exports: [RouterOutlet, RouterLink, RouterLinkActive, EmptyOutletComponent] });
RouterModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.0.2+sha-dd4fd1f", ngImport: i0, type: RouterModule, imports: [EmptyOutletComponent] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.0.2+sha-dd4fd1f", ngImport: i0, type: RouterModule, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX21vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDekgsT0FBTyxFQUFDLHNCQUFzQixFQUFnQixNQUFNLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBdUIsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFZLFFBQVEsRUFBRSxhQUFhLElBQUksWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBRXJOLE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLDJCQUEyQixDQUFDO0FBQy9ELE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqRSxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFHeEQsT0FBTyxFQUFDLHFCQUFxQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDOUQsT0FBTyxFQUFDLG9CQUFvQixFQUFFLFNBQVMsRUFBRSxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBRSw2QkFBNkIsRUFBRSxvQ0FBb0MsRUFBRSxjQUFjLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUM1TCxPQUFPLEVBQUMsTUFBTSxFQUFFLFdBQVcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3QyxPQUFPLEVBQWUsb0JBQW9CLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUNuRSxPQUFPLEVBQUMsa0JBQWtCLEVBQUUsTUFBTSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDbEUsT0FBTyxFQUFDLHNC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QUFDO1lBQzVDLG9DQUFvQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbkQsRUFBRTtLQUNQLENBQUM7QUFDSixDQUFDO0FBRUQsc0RBQXNEO0FBQ3REOzs7OztHQUtHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxjQUFjLENBQ2hELFdBQVcsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBRTdDLFNBQVMsd0JBQXdCO0lBQy9CLE9BQU87UUFDTCw0RkFBNEY7UUFDNUYsMkVBQTJFO1FBQzNFLEVBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxvQkFBb0IsRUFBQztRQUMvRCxFQUFDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxrQkFBa0IsRUFBQztLQUNoRixDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0hhc2hMb2NhdGlvblN0cmF0ZWd5LCBMb2NhdGlvbiwgTG9jYXRpb25TdHJhdGVneSwgUGF0aExvY2F0aW9uU3RyYXRlZ3ksIFZpZXdwb3J0U2Nyb2xsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0FQUF9CT09UU1RSQVBfTElTVEVORVIsIENvbXBvbmVudFJlZiwgaW5qZWN0LCBJbmplY3QsIEluamVjdGlvblRva2VuLCBNb2R1bGVXaXRoUHJvdmlkZXJzLCBOZ01vZHVsZSwgTmdQcm9iZVRva2VuLCBOZ1pvbmUsIE9wdGlvbmFsLCBQcm92aWRlciwgU2tpcFNlbGYsIMm1UnVudGltZUVycm9yIGFzIFJ1bnRpbWVFcnJvcn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7RW1wdHlPdXRsZXRDb21wb25lbnR9IGZyb20gJy4vY29tcG9uZW50cy9lbXB0eV9vdXRsZXQnO1xuaW1wb3J0IHtSb3V0ZXJMaW5rfSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsnO1xuaW1wb3J0IHtSb3V0ZXJMaW5rQWN0aXZlfSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmtfYWN0aXZlJztcbmltcG9ydCB7Um91dGVyT3V0bGV0fSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX291dGxldCc7XG5pbXBvcnQge1J1bnRpbWVFcnJvckNvZGV9IGZyb20gJy4vZXJyb3JzJztcbmltcG9ydCB7Um91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge05hdmlnYXRpb25UcmFuc2l0aW9uc30gZnJvbSAnLi9uYXZpZ2F0aW9uX3RyYW5zaXRpb24nO1xuaW1wb3J0IHtnZXRCb290c3RyYXBMaXN0ZW5lciwgcm9vdFJvdXRlLCBST1VURVJfSVNfUFJPVklERUQsIHdpdGhEZWJ1Z1RyYWNpbmcsIHdpdGhEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uLCB3aXRoRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb24sIHdpdGhQcmVsb2FkaW5nfSBmcm9tICcuL3Byb3ZpZGVfcm91dGVyJztcbmltcG9ydCB7Um91dGVyLCBzZXR1cFJvdXRlcn0gZnJvbSAnLi9yb3V0ZXInO1xuaW1wb3J0IHtFeHRyYU9wdGlvbnMsIFJPVVRFUl9DT05GSUdVUkFUSU9OfSBmcm9tICcuL3JvdXRlcl9jb25maWcnO1xuaW1wb3J0IHtSb3V0ZXJDb25maWdMb2FkZXIsIFJPVVRFU30gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge0NoaWxkcmVuT3V0bGV0Q29udGV4dHN9IGZyb20gJy4vcm91dGVyX291dGxldF9jb250ZXh0JztcbmltcG9ydCB7Uk9VVEVSX1NDUk9MTEVSLCBSb3V0ZXJTY3JvbGxlcn0gZnJvbSAnLi9yb3V0ZXJfc2Nyb2xsZXInO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZX0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtEZWZhdWx0VXJsU2VyaWFsaXplciwgVXJsU2VyaWFsaXplcn0gZnJvbSAnLi91cmxfdHJlZSc7XG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlO1xuXG4vKipcbiAqIFRoZSBkaXJlY3RpdmVzIGRlZmluZWQgaW4gdGhlIGBSb3V0ZXJNb2R1bGVgLlxuICovXG5jb25zdCBST1VURVJfRElSRUNUSVZFUyA9IFtSb3V0ZXJPdXRsZXQsIFJvdXRlckxpbmssIFJvdXRlckxpbmtBY3RpdmUsIEVtcHR5T3V0bGV0Q29tcG9uZW50XTtcblxuLyoqXG4gKiBAZG9jc05vdFJlcXVpcmVkXG4gKi9cbmV4cG9ydCBjb25zdCBST1VURVJfRk9SUk9PVF9HVUFSRCA9IG5ldyBJbmplY3Rpb25Ub2tlbjx2b2lkPihcbiAgICBOR19ERVZfTU9ERSA/ICdyb3V0ZXIgZHVwbGljYXRlIGZvclJvb3QgZ3VhcmQnIDogJ1JPVVRFUl9GT1JST09UX0dVQVJEJyk7XG5cbi8vIFRPRE8oYXRzY290dCk6IEFsbCBvZiB0aGVzZSBleGNlcHQgYEFjdGl2YXRlZFJvdXRlYCBhcmUgYHByb3ZpZGVkSW46ICdyb290J2AuIFRoZXkgYXJlIG9ubHkga2VwdFxuLy8gaGVyZSB0byBhdm9pZCBhIGJyZWFraW5nIGNoYW5nZSB3aGVyZWJ5IHRoZSBwcm92aWRlciBvcmRlciBtYXR0ZXJzIGJhc2VkIG9uIHdoZXJlIHRoZVxuLy8gYFJvdXRlck1vZHVsZWAvYFJvdXRlclRlc3RpbmdNb2R1bGVgIGlzIGltcG9ydGVkLiBUaGVzZSBjYW4vc2hvdWxkIGJlIHJlbW92ZWQgYXMgYSBcImJyZWFraW5nXCJcbi8vIGNoYW5nZSBpbiBhIG1ham9yIHZlcnNpb24uXG5leHBvcnQgY29uc3QgUk9VVEVSX1BST1ZJREVSUzogUHJvdmlkZXJbXSA9IFtcbiAgTG9jYXRpb24sXG4gIHtwcm92aWRlOiBVcmxTZXJpYWxpemVyLCB1c2VDbGFzczogRGVmYXVsdFVybFNlcmlhbGl6ZXJ9LFxuICB7cHJvdmlkZTogUm91dGVyLCB1c2VGYWN0b3J5OiBzZXR1cFJvdXRlcn0sXG4gIENoaWxkcmVuT3V0bGV0Q29udGV4dHMsXG4gIHtwcm92aWRlOiBBY3RpdmF0ZWRSb3V0ZSwgdXNlRmFjdG9yeTogcm9vdFJvdXRlLCBkZXBzOiBbUm91dGVyXX0sXG4gIFJvdXRlckNvbmZpZ0xvYWRlcixcbiAgLy8gT25seSB1c2VkIHRvIHdhcm4gd2hlbiBgcHJvdmlkZVJvdXRlc2AgaXMgdXNlZCB3aXRob3V0IGBSb3V0ZXJNb2R1bGVgIG9yIGBwcm92aWRlUm91dGVyYC4gQ2FuXG4gIC8vIGJlIHJlbW92ZWQgd2hlbiBgcHJvdmlkZVJvdXRlc2AgaXMgcmVtb3ZlZC5cbiAgTkdfREVWX01PREUgPyB7cHJvdmlkZTogUk9VVEVSX0lTX1BST1ZJREVELCB1c2VWYWx1ZTogdHJ1ZX0gOiBbXSxcbl07XG5cbmV4cG9ydCBmdW5jdGlvbiByb3V0ZXJOZ1Byb2JlVG9rZW4oKSB7XG4gIHJldHVybiBuZXcgTmdQcm9iZVRva2VuKCdSb3V0ZXInLCBSb3V0ZXIpO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEFkZHMgZGlyZWN0aXZlcyBhbmQgcHJvdmlkZXJzIGZvciBpbi1hcHAgbmF2aWdhdGlvbiBhbW9uZyB2aWV3cyBkZWZpbmVkIGluIGFuIGFwcGxpY2F0aW9uLlxuICogVXNlIHRoZSBBbmd1bGFyIGBSb3V0ZXJgIHNlcnZpY2UgdG8gZGVjbGFyYXRpdmVseSBzcGVjaWZ5IGFwcGxpY2F0aW9uIHN0YXRlcyBhbmQgbWFuYWdlIHN0YXRlXG4gKiB0cmFuc2l0aW9ucy5cbiAqXG4gKiBZb3UgY2FuIGltcG9ydCB0aGlzIE5nTW9kdWxlIG11bHRpcGxlIHRpbWVzLCBvbmNlIGZvciBlYWNoIGxhenktbG9hZGVkIGJ1bmRsZS5cbiAqIEhvd2V2ZXIsIG9ubHkgb25lIGBSb3V0ZXJgIHNlcnZpY2UgY2FuIGJlIGFjdGl2ZS5cbiAqIFRvIGVuc3VyZSB0aGlzLCB0aGVyZSBhcmUgdHdvIHdheXMgdG8gcmVnaXN0ZXIgcm91dGVzIHdoZW4gaW1wb3J0aW5nIHRoaXMgbW9kdWxlOlxuICpcbiAqICogVGhlIGBmb3JSb290KClgIG1ldGhvZCBjcmVhdGVzIGFuIGBOZ01vZHVsZWAgdGhhdCBjb250YWlucyBhbGwgdGhlIGRpcmVjdGl2ZXMsIHRoZSBnaXZlblxuICogcm91dGVzLCBhbmQgdGhlIGBSb3V0ZXJgIHNlcnZpY2UgaXRzZWxmLlxuICogKiBUaGUgYGZvckNoaWxkKClgIG1ldGhvZCBjcmVhdGVzIGFuIGBOZ01vZHVsZWAgdGhhdCBjb250YWlucyBhbGwgdGhlIGRpcmVjdGl2ZXMgYW5kIHRoZSBnaXZlblxuICogcm91dGVzLCBidXQgZG9lcyBub3QgaW5jbHVkZSB0aGUgYFJvdXRlcmAgc2VydmljZS5cbiAqXG4gKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpIGZvciBhblxuICogb3ZlcnZpZXcgb2YgaG93IHRoZSBgUm91dGVyYCBzZXJ2aWNlIHNob3VsZCBiZSB1c2VkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQE5nTW9kdWxlKHtcbiAgaW1wb3J0czogUk9VVEVSX0RJUkVDVElWRVMsXG4gIGV4cG9ydHM6IFJPVVRFUl9ESVJFQ1RJVkVTLFxufSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJNb2R1bGUge1xuICBjb25zdHJ1Y3RvcihAT3B0aW9uYWwoKSBASW5qZWN0KFJPVVRFUl9GT1JST09UX0dVQVJEKSBndWFyZDogYW55KSB7fVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuZCBjb25maWd1cmVzIGEgbW9kdWxlIHdpdGggYWxsIHRoZSByb3V0ZXIgcHJvdmlkZXJzIGFuZCBkaXJlY3RpdmVzLlxuICAgKiBPcHRpb25hbGx5IHNldHMgdXAgYW4gYXBwbGljYXRpb24gbGlzdGVuZXIgdG8gcGVyZm9ybSBhbiBpbml0aWFsIG5hdmlnYXRpb24uXG4gICAqXG4gICAqIFdoZW4gcmVnaXN0ZXJpbmcgdGhlIE5nTW9kdWxlIGF0IHRoZSByb290LCBpbXBvcnQgYXMgZm9sbG93czpcbiAgICpcbiAgICogYGBgXG4gICAqIEBOZ01vZHVsZSh7XG4gICAqICAgaW1wb3J0czogW1JvdXRlck1vZHVsZS5mb3JSb290KFJPVVRFUyldXG4gICAqIH0pXG4gICAqIGNsYXNzIE15TmdNb2R1bGUge31cbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSByb3V0ZXMgQW4gYXJyYXkgb2YgYFJvdXRlYCBvYmplY3RzIHRoYXQgZGVmaW5lIHRoZSBuYXZpZ2F0aW9uIHBhdGhzIGZvciB0aGUgYXBwbGljYXRpb24uXG4gICAqIEBwYXJhbSBjb25maWcgQW4gYEV4dHJhT3B0aW9uc2AgY29uZmlndXJhdGlvbiBvYmplY3QgdGhhdCBjb250cm9scyBob3cgbmF2aWdhdGlvbiBpcyBwZXJmb3JtZWQuXG4gICAqIEByZXR1cm4gVGhlIG5ldyBgTmdNb2R1bGVgLlxuICAgKlxuICAgKi9cbiAgc3RhdGljIGZvclJvb3Qocm91dGVzOiBSb3V0ZXMsIGNvbmZpZz86IEV4dHJhT3B0aW9ucyk6IE1vZHVsZVdpdGhQcm92aWRlcnM8Um91dGVyTW9kdWxlPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5nTW9kdWxlOiBSb3V0ZXJNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFtcbiAgICAgICAgUk9VVEVSX1BST1ZJREVSUyxcbiAgICAgICAgTkdfREVWX01PREUgPyAoY29uZmlnPy5lbmFibGVUcmFjaW5nID8gd2l0aERlYnVnVHJhY2luZygpLsm1cHJvdmlkZXJzIDogW10pIDogW10sXG4gICAgICAgIHtwcm92aWRlOiBST1VURVMsIG11bHRpOiB0cnVlLCB1c2VWYWx1ZTogcm91dGVzfSxcbiAgICAgICAge1xuICAgICAgICAgIHByb3ZpZGU6IFJPVVRFUl9GT1JST09UX0dVQVJELFxuICAgICAgICAgIHVzZUZhY3Rvcnk6IHByb3ZpZGVGb3JSb290R3VhcmQsXG4gICAgICAgICAgZGVwczogW1tSb3V0ZXIsIG5ldyBPcHRpb25hbCgpLCBuZXcgU2tpcFNlbGYoKV1dXG4gICAgICAgIH0sXG4gICAgICAgIHtwcm92aWRlOiBST1VURVJfQ09ORklHVVJBVElPTiwgdXNlVmFsdWU6IGNvbmZpZyA/IGNvbmZpZyA6IHt9fSxcbiAgICAgICAgY29uZmlnPy51c2VIYXNoID8gcHJvdmlkZUhhc2hMb2NhdGlvblN0cmF0ZWd5KCkgOiBwcm92aWRlUGF0aExvY2F0aW9uU3RyYXRlZ3koKSxcbiAgICAgICAgcHJvdmlkZVJvdXRlclNjcm9sbGVyKCksXG4gICAgICAgIGNvbmZpZz8ucHJlbG9hZGluZ1N0cmF0ZWd5ID8gd2l0aFByZWxvYWRpbmcoY29uZmlnLnByZWxvYWRpbmdTdHJhdGVneSkuybVwcm92aWRlcnMgOiBbXSxcbiAgICAgICAge3Byb3ZpZGU6IE5nUHJvYmVUb2tlbiwgbXVsdGk6IHRydWUsIHVzZUZhY3Rvcnk6IHJvdXRlck5nUHJvYmVUb2tlbn0sXG4gICAgICAgIGNvbmZpZz8uaW5pdGlhbE5hdmlnYXRpb24gPyBwcm92aWRlSW5pdGlhbE5hdmlnYXRpb24oY29uZmlnKSA6IFtdLFxuICAgICAgICBwcm92aWRlUm91dGVySW5pdGlhbGl6ZXIoKSxcbiAgICAgIF0sXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbW9kdWxlIHdpdGggYWxsIHRoZSByb3V0ZXIgZGlyZWN0aXZlcyBhbmQgYSBwcm92aWRlciByZWdpc3RlcmluZyByb3V0ZXMsXG4gICAqIHdpdGhvdXQgY3JlYXRpbmcgYSBuZXcgUm91dGVyIHNlcnZpY2UuXG4gICAqIFdoZW4gcmVnaXN0ZXJpbmcgZm9yIHN1Ym1vZHVsZXMgYW5kIGxhenktbG9hZGVkIHN1Ym1vZHVsZXMsIGNyZWF0ZSB0aGUgTmdNb2R1bGUgYXMgZm9sbG93czpcbiAgICpcbiAgICogYGBgXG4gICAqIEBOZ01vZHVsZSh7XG4gICAqICAgaW1wb3J0czogW1JvdXRlck1vZHVsZS5mb3JDaGlsZChST1VURVMpXVxuICAgKiB9KVxuICAgKiBjbGFzcyBNeU5nTW9kdWxlIHt9XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gcm91dGVzIEFuIGFycmF5IG9mIGBSb3V0ZWAgb2JqZWN0cyB0aGF0IGRlZmluZSB0aGUgbmF2aWdhdGlvbiBwYXRocyBmb3IgdGhlIHN1Ym1vZHVsZS5cbiAgICogQHJldHVybiBUaGUgbmV3IE5nTW9kdWxlLlxuICAgKlxuICAgKi9cbiAgc3RhdGljIGZvckNoaWxkKHJvdXRlczogUm91dGVzKTogTW9kdWxlV2l0aFByb3ZpZGVyczxSb3V0ZXJNb2R1bGU+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmdNb2R1bGU6IFJvdXRlck1vZHVsZSxcbiAgICAgIHByb3ZpZGVyczogW3twcm92aWRlOiBST1VURVMsIG11bHRpOiB0cnVlLCB1c2VWYWx1ZTogcm91dGVzfV0sXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIEZvciBpbnRlcm5hbCB1c2UgYnkgYFJvdXRlck1vZHVsZWAgb25seS4gTm90ZSB0aGF0IHRoaXMgZGlmZmVycyBmcm9tIGB3aXRoSW5NZW1vcnlSb3V0ZXJTY3JvbGxlcmBcbiAqIGJlY2F1c2UgaXQgcmVhZHMgZnJvbSB0aGUgYEV4dHJhT3B0aW9uc2Agd2hpY2ggc2hvdWxkIG5vdCBiZSB1c2VkIGluIHRoZSBzdGFuZGFsb25lIHdvcmxkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZVJvdXRlclNjcm9sbGVyKCk6IFByb3ZpZGVyIHtcbiAgcmV0dXJuIHtcbiAgICBwcm92aWRlOiBST1VURVJfU0NST0xMRVIsXG4gICAgdXNlRmFjdG9yeTogKCkgPT4ge1xuICAgICAgY29uc3Qgdmlld3BvcnRTY3JvbGxlciA9IGluamVjdChWaWV3cG9ydFNjcm9sbGVyKTtcbiAgICAgIGNvbnN0IHpvbmUgPSBpbmplY3QoTmdab25lKTtcbiAgICAgIGNvbnN0IGNvbmZpZzogRXh0cmFPcHRpb25zID0gaW5qZWN0KFJPVVRFUl9DT05GSUdVUkFUSU9OKTtcbiAgICAgIGNvbnN0IHRyYW5zaXRpb25zID0gaW5qZWN0KE5hdmlnYXRpb25UcmFuc2l0aW9ucyk7XG4gICAgICBjb25zdCB1cmxTZXJpYWxpemVyID0gaW5qZWN0KFVybFNlcmlhbGl6ZXIpO1xuICAgICAgaWYgKGNvbmZpZy5zY3JvbGxPZmZzZXQpIHtcbiAgICAgICAgdmlld3BvcnRTY3JvbGxlci5zZXRPZmZzZXQoY29uZmlnLnNjcm9sbE9mZnNldCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFJvdXRlclNjcm9sbGVyKHVybFNlcmlhbGl6ZXIsIHRyYW5zaXRpb25zLCB2aWV3cG9ydFNjcm9sbGVyLCB6b25lLCBjb25maWcpO1xuICAgIH0sXG4gIH07XG59XG5cbi8vIE5vdGU6IEZvciBpbnRlcm5hbCB1c2Ugb25seSB3aXRoIGBSb3V0ZXJNb2R1bGVgLiBTdGFuZGFsb25lIHNldHVwIHZpYSBgcHJvdmlkZVJvdXRlcmAgc2hvdWxkXG4vLyBwcm92aWRlIGhhc2ggbG9jYXRpb24gZGlyZWN0bHkgdmlhIGB7cHJvdmlkZTogTG9jYXRpb25TdHJhdGVneSwgdXNlQ2xhc3M6IEhhc2hMb2NhdGlvblN0cmF0ZWd5fWAuXG5mdW5jdGlvbiBwcm92aWRlSGFzaExvY2F0aW9uU3RyYXRlZ3koKTogUHJvdmlkZXIge1xuICByZXR1cm4ge3Byb3ZpZGU6IExvY2F0aW9uU3RyYXRlZ3ksIHVzZUNsYXNzOiBIYXNoTG9jYXRpb25TdHJhdGVneX07XG59XG5cbi8vIE5vdGU6IEZvciBpbnRlcm5hbCB1c2Ugb25seSB3aXRoIGBSb3V0ZXJNb2R1bGVgLiBTdGFuZGFsb25lIHNldHVwIHZpYSBgcHJvdmlkZVJvdXRlcmAgZG9lcyBub3Rcbi8vIG5lZWQgdGhpcyBhdCBhbGwgYmVjYXVzZSBgUGF0aExvY2F0aW9uU3RyYXRlZ3lgIGlzIHRoZSBkZWZhdWx0IGZhY3RvcnkgZm9yIGBMb2NhdGlvblN0cmF0ZWd5YC5cbmZ1bmN0aW9uIHByb3ZpZGVQYXRoTG9jYXRpb25TdHJhdGVneSgpOiBQcm92aWRlciB7XG4gIHJldHVybiB7cHJvdmlkZTogTG9jYXRpb25TdHJhdGVneSwgdXNlQ2xhc3M6IFBhdGhMb2NhdGlvblN0cmF0ZWd5fTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVGb3JSb290R3VhcmQocm91dGVyOiBSb3V0ZXIpOiBhbnkge1xuICBpZiAoTkdfREVWX01PREUgJiYgcm91dGVyKSB7XG4gICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgUnVudGltZUVycm9yQ29kZS5GT1JfUk9PVF9DQUxMRURfVFdJQ0UsXG4gICAgICAgIGBUaGUgUm91dGVyIHdhcyBwcm92aWRlZCBtb3JlIHRoYW4gb25jZS4gVGhpcyBjYW4gaGFwcGVuIGlmICdmb3JSb290JyBpcyB1c2VkIG91dHNpZGUgb2YgdGhlIHJvb3QgaW5qZWN0b3IuYCArXG4gICAgICAgICAgICBgIExhenkgbG9hZGVkIG1vZHVsZXMgc2hvdWxkIHVzZSBSb3V0ZXJNb2R1bGUuZm9yQ2hpbGQoKSBpbnN0ZWFkLmApO1xuICB9XG4gIHJldHVybiAnZ3VhcmRlZCc7XG59XG5cbi8vIE5vdGU6IEZvciBpbnRlcm5hbCB1c2Ugb25seSB3aXRoIGBSb3V0ZXJNb2R1bGVgLiBTdGFuZGFsb25lIHJvdXRlciBzZXR1cCB3aXRoIGBwcm92aWRlUm91dGVyYFxuLy8gdXNlcnMgY2FsbCBgd2l0aFhJbml0aWFsTmF2aWdhdGlvbmAgZGlyZWN0bHkuXG5mdW5jdGlvbiBwcm92aWRlSW5pdGlhbE5hdmlnYXRpb24oY29uZmlnOiBQaWNrPEV4dHJhT3B0aW9ucywgJ2luaXRpYWxOYXZpZ2F0aW9uJz4pOiBQcm92aWRlcltdIHtcbiAgcmV0dXJuIFtcbiAgICBjb25maWcuaW5pdGlhbE5hdmlnYXRpb24gPT09ICdkaXNhYmxlZCcgPyB3aXRoRGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbigpLsm1cHJvdmlkZXJzIDogW10sXG4gICAgY29uZmlnLmluaXRpYWxOYXZpZ2F0aW9uID09PSAnZW5hYmxlZEJsb2NraW5nJyA/XG4gICAgICAgIHdpdGhFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbigpLsm1cHJvdmlkZXJzIDpcbiAgICAgICAgW10sXG4gIF07XG59XG5cbi8vIFRPRE8oYXRzY290dCk6IFRoaXMgc2hvdWxkIG5vdCBiZSBpbiB0aGUgcHVibGljIEFQSVxuLyoqXG4gKiBBIFtESSB0b2tlbl0oZ3VpZGUvZ2xvc3NhcnkvI2RpLXRva2VuKSBmb3IgdGhlIHJvdXRlciBpbml0aWFsaXplciB0aGF0XG4gKiBpcyBjYWxsZWQgYWZ0ZXIgdGhlIGFwcCBpcyBib290c3RyYXBwZWQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY29uc3QgUk9VVEVSX0lOSVRJQUxJWkVSID0gbmV3IEluamVjdGlvblRva2VuPChjb21wUmVmOiBDb21wb25lbnRSZWY8YW55PikgPT4gdm9pZD4oXG4gICAgTkdfREVWX01PREUgPyAnUm91dGVyIEluaXRpYWxpemVyJyA6ICcnKTtcblxuZnVuY3Rpb24gcHJvdmlkZVJvdXRlckluaXRpYWxpemVyKCk6IFByb3ZpZGVyW10ge1xuICByZXR1cm4gW1xuICAgIC8vIFJPVVRFUl9JTklUSUFMSVpFUiB0b2tlbiBzaG91bGQgYmUgcmVtb3ZlZC4gSXQncyBwdWJsaWMgQVBJIGJ1dCBzaG91bGRuJ3QgYmUuIFdlIGNhbiBqdXN0XG4gICAgLy8gaGF2ZSBgZ2V0Qm9vdHN0cmFwTGlzdGVuZXJgIGRpcmVjdGx5IGF0dGFjaGVkIHRvIEFQUF9CT09UU1RSQVBfTElTVEVORVIuXG4gICAge3Byb3ZpZGU6IFJPVVRFUl9JTklUSUFMSVpFUiwgdXNlRmFjdG9yeTogZ2V0Qm9vdHN0cmFwTGlzdGVuZXJ9LFxuICAgIHtwcm92aWRlOiBBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLCBtdWx0aTogdHJ1ZSwgdXNlRXhpc3Rpbmc6IFJPVVRFUl9JTklUSUFMSVpFUn0sXG4gIF07XG59XG4iXX0=