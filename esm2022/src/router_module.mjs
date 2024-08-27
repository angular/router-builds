/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { HashLocationStrategy, Location, LocationStrategy, PathLocationStrategy, ViewportScroller, } from '@angular/common';
import { APP_BOOTSTRAP_LISTENER, inject, Inject, InjectionToken, NgModule, NgZone, Optional, SkipSelf, ɵRuntimeError as RuntimeError, } from '@angular/core';
import { EmptyOutletComponent } from './components/empty_outlet';
import { RouterLink } from './directives/router_link';
import { RouterLinkActive } from './directives/router_link_active';
import { RouterOutlet } from './directives/router_outlet';
import { NAVIGATION_ERROR_HANDLER, NavigationTransitions } from './navigation_transition';
import { getBootstrapListener, rootRoute, ROUTER_IS_PROVIDED, withComponentInputBinding, withDebugTracing, withDisabledInitialNavigation, withEnabledBlockingInitialNavigation, withPreloading, withViewTransitions, } from './provide_router';
import { Router } from './router';
import { ROUTER_CONFIGURATION } from './router_config';
import { RouterConfigLoader, ROUTES } from './router_config_loader';
import { ChildrenOutletContexts } from './router_outlet_context';
import { ROUTER_SCROLLER, RouterScroller } from './router_scroller';
import { ActivatedRoute } from './router_state';
import { DefaultUrlSerializer, UrlSerializer } from './url_tree';
import * as i0 from "@angular/core";
/**
 * The directives defined in the `RouterModule`.
 */
const ROUTER_DIRECTIVES = [RouterOutlet, RouterLink, RouterLinkActive, EmptyOutletComponent];
/**
 * @docsNotRequired
 */
export const ROUTER_FORROOT_GUARD = new InjectionToken(typeof ngDevMode === 'undefined' || ngDevMode
    ? 'router duplicate forRoot guard'
    : 'ROUTER_FORROOT_GUARD');
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
    typeof ngDevMode === 'undefined' || ngDevMode
        ? { provide: ROUTER_IS_PROVIDED, useValue: true }
        : [],
];
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
 * @see [Routing and Navigation guide](guide/routing/common-router-tasks) for an
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
                typeof ngDevMode === 'undefined' || ngDevMode
                    ? config?.enableTracing
                        ? withDebugTracing().ɵproviders
                        : []
                    : [],
                { provide: ROUTES, multi: true, useValue: routes },
                {
                    provide: ROUTER_FORROOT_GUARD,
                    useFactory: provideForRootGuard,
                    deps: [[Router, new Optional(), new SkipSelf()]],
                },
                config?.errorHandler
                    ? {
                        provide: NAVIGATION_ERROR_HANDLER,
                        useValue: config.errorHandler,
                    }
                    : [],
                { provide: ROUTER_CONFIGURATION, useValue: config ? config : {} },
                config?.useHash ? provideHashLocationStrategy() : providePathLocationStrategy(),
                provideRouterScroller(),
                config?.preloadingStrategy ? withPreloading(config.preloadingStrategy).ɵproviders : [],
                config?.initialNavigation ? provideInitialNavigation(config) : [],
                config?.bindToComponentInputs ? withComponentInputBinding().ɵproviders : [],
                config?.enableViewTransitions ? withViewTransitions().ɵproviders : [],
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "19.0.0-next.1+sha-21445a2", ngImport: i0, type: RouterModule, deps: [{ token: ROUTER_FORROOT_GUARD, optional: true }], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "19.0.0-next.1+sha-21445a2", ngImport: i0, type: RouterModule, imports: [RouterOutlet, RouterLink, RouterLinkActive, EmptyOutletComponent], exports: [RouterOutlet, RouterLink, RouterLinkActive, EmptyOutletComponent] }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "19.0.0-next.1+sha-21445a2", ngImport: i0, type: RouterModule }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "19.0.0-next.1+sha-21445a2", ngImport: i0, type: RouterModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: ROUTER_DIRECTIVES,
                    exports: ROUTER_DIRECTIVES,
                }]
        }], ctorParameters: () => [{ type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [ROUTER_FORROOT_GUARD]
                }] }] });
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
    if ((typeof ngDevMode === 'undefined' || ngDevMode) && router) {
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
        config.initialNavigation === 'enabledBlocking'
            ? withEnabledBlockingInitialNavigation().ɵproviders
            : [],
    ];
}
// TODO(atscott): This should not be in the public API
/**
 * A DI token for the router initializer that
 * is called after the app is bootstrapped.
 *
 * @publicApi
 */
export const ROUTER_INITIALIZER = new InjectionToken(typeof ngDevMode === 'undefined' || ngDevMode ? 'Router Initializer' : '');
function provideRouterInitializer() {
    return [
        // ROUTER_INITIALIZER token should be removed. It's public API but shouldn't be. We can just
        // have `getBootstrapListener` directly attached to APP_BOOTSTRAP_LISTENER.
        { provide: ROUTER_INITIALIZER, useFactory: getBootstrapListener },
        { provide: APP_BOOTSTRAP_LISTENER, multi: true, useExisting: ROUTER_INITIALIZER },
    ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX21vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQ0wsb0JBQW9CLEVBQ3BCLFFBQVEsRUFDUixnQkFBZ0IsRUFDaEIsb0JBQW9CLEVBQ3BCLGdCQUFnQixHQUNqQixNQUFNLGlCQUFpQixDQUFDO0FBQ3pCLE9BQU8sRUFDTCxzQkFBc0IsRUFFdEIsTUFBTSxFQUNOLE1BQU0sRUFDTixjQUFjLEVBRWQsUUFBUSxFQUNSLE1BQU0sRUFDTixRQUFRLEVBRVIsUUFBUSxFQUNSLGFBQWEsSUFBSSxZQUFZLEdBQzlCLE1BQU0sZUFBZSxDQUFDO0FBRXZCLE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLDJCQUEyQixDQUFDO0FBQy9ELE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqRSxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFHeEQsT0FBTyxFQUFDLHdCQUF3QixFQUFFLHFCQUFxQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDeEYsT0FBTyxFQUNMLG9CQUFvQixFQUNwQixTQUFTLEVBQ1Qsa0JBQWtCLEVBQ2xCLHlCQUF5QixFQUN6QixnQkFBZ0IsRUFDaEIsNkJBQTZCLEVBQzdCLG9DQUFvQyxFQUNwQyxjQUFjLEVBQ2QsbUJBQW1CLEdBQ3BCLE1BQU0sa0JBQWtCLENBQUM7QUFDMUIsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLEVBQWUsb0JBQW9CLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUNuRSxPQUFPLEVBQUMsa0JBQWtCLEVBQUUsTUFBTSxFQUFDLE1BQU0sd0JB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Q2hELFNBQVMsd0JBQXdCLENBQUMsTUFBK0M7SUFDL0UsT0FBTztRQUNMLE1BQU0sQ0FBQyxpQkFBaUIsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ3pGLE1BQU0sQ0FBQyxpQkFBaUIsS0FBSyxpQkFBaUI7WUFDNUMsQ0FBQyxDQUFDLG9DQUFvQyxFQUFFLENBQUMsVUFBVTtZQUNuRCxDQUFDLENBQUMsRUFBRTtLQUNQLENBQUM7QUFDSixDQUFDO0FBRUQsc0RBQXNEO0FBQ3REOzs7OztHQUtHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxjQUFjLENBQ2xELE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQzFFLENBQUM7QUFFRixTQUFTLHdCQUF3QjtJQUMvQixPQUFPO1FBQ0wsNEZBQTRGO1FBQzVGLDJFQUEyRTtRQUMzRSxFQUFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxVQUFVLEVBQUUsb0JBQW9CLEVBQUM7UUFDL0QsRUFBQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUM7S0FDaEYsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtcbiAgSGFzaExvY2F0aW9uU3RyYXRlZ3ksXG4gIExvY2F0aW9uLFxuICBMb2NhdGlvblN0cmF0ZWd5LFxuICBQYXRoTG9jYXRpb25TdHJhdGVneSxcbiAgVmlld3BvcnRTY3JvbGxlcixcbn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7XG4gIEFQUF9CT09UU1RSQVBfTElTVEVORVIsXG4gIENvbXBvbmVudFJlZixcbiAgaW5qZWN0LFxuICBJbmplY3QsXG4gIEluamVjdGlvblRva2VuLFxuICBNb2R1bGVXaXRoUHJvdmlkZXJzLFxuICBOZ01vZHVsZSxcbiAgTmdab25lLFxuICBPcHRpb25hbCxcbiAgUHJvdmlkZXIsXG4gIFNraXBTZWxmLFxuICDJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3IsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQge0VtcHR5T3V0bGV0Q29tcG9uZW50fSBmcm9tICcuL2NvbXBvbmVudHMvZW1wdHlfb3V0bGV0JztcbmltcG9ydCB7Um91dGVyTGlua30gZnJvbSAnLi9kaXJlY3RpdmVzL3JvdXRlcl9saW5rJztcbmltcG9ydCB7Um91dGVyTGlua0FjdGl2ZX0gZnJvbSAnLi9kaXJlY3RpdmVzL3JvdXRlcl9saW5rX2FjdGl2ZSc7XG5pbXBvcnQge1JvdXRlck91dGxldH0gZnJvbSAnLi9kaXJlY3RpdmVzL3JvdXRlcl9vdXRsZXQnO1xuaW1wb3J0IHtSdW50aW1lRXJyb3JDb2RlfSBmcm9tICcuL2Vycm9ycyc7XG5pbXBvcnQge1JvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtOQVZJR0FUSU9OX0VSUk9SX0hBTkRMRVIsIE5hdmlnYXRpb25UcmFuc2l0aW9uc30gZnJvbSAnLi9uYXZpZ2F0aW9uX3RyYW5zaXRpb24nO1xuaW1wb3J0IHtcbiAgZ2V0Qm9vdHN0cmFwTGlzdGVuZXIsXG4gIHJvb3RSb3V0ZSxcbiAgUk9VVEVSX0lTX1BST1ZJREVELFxuICB3aXRoQ29tcG9uZW50SW5wdXRCaW5kaW5nLFxuICB3aXRoRGVidWdUcmFjaW5nLFxuICB3aXRoRGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbixcbiAgd2l0aEVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uLFxuICB3aXRoUHJlbG9hZGluZyxcbiAgd2l0aFZpZXdUcmFuc2l0aW9ucyxcbn0gZnJvbSAnLi9wcm92aWRlX3JvdXRlcic7XG5pbXBvcnQge1JvdXRlcn0gZnJvbSAnLi9yb3V0ZXInO1xuaW1wb3J0IHtFeHRyYU9wdGlvbnMsIFJPVVRFUl9DT05GSUdVUkFUSU9OfSBmcm9tICcuL3JvdXRlcl9jb25maWcnO1xuaW1wb3J0IHtSb3V0ZXJDb25maWdMb2FkZXIsIFJPVVRFU30gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge0NoaWxkcmVuT3V0bGV0Q29udGV4dHN9IGZyb20gJy4vcm91dGVyX291dGxldF9jb250ZXh0JztcbmltcG9ydCB7Uk9VVEVSX1NDUk9MTEVSLCBSb3V0ZXJTY3JvbGxlcn0gZnJvbSAnLi9yb3V0ZXJfc2Nyb2xsZXInO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZX0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtEZWZhdWx0VXJsU2VyaWFsaXplciwgVXJsU2VyaWFsaXplcn0gZnJvbSAnLi91cmxfdHJlZSc7XG5cbi8qKlxuICogVGhlIGRpcmVjdGl2ZXMgZGVmaW5lZCBpbiB0aGUgYFJvdXRlck1vZHVsZWAuXG4gKi9cbmNvbnN0IFJPVVRFUl9ESVJFQ1RJVkVTID0gW1JvdXRlck91dGxldCwgUm91dGVyTGluaywgUm91dGVyTGlua0FjdGl2ZSwgRW1wdHlPdXRsZXRDb21wb25lbnRdO1xuXG4vKipcbiAqIEBkb2NzTm90UmVxdWlyZWRcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9GT1JST09UX0dVQVJEID0gbmV3IEluamVjdGlvblRva2VuPHZvaWQ+KFxuICB0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGVcbiAgICA/ICdyb3V0ZXIgZHVwbGljYXRlIGZvclJvb3QgZ3VhcmQnXG4gICAgOiAnUk9VVEVSX0ZPUlJPT1RfR1VBUkQnLFxuKTtcblxuLy8gVE9ETyhhdHNjb3R0KTogQWxsIG9mIHRoZXNlIGV4Y2VwdCBgQWN0aXZhdGVkUm91dGVgIGFyZSBgcHJvdmlkZWRJbjogJ3Jvb3QnYC4gVGhleSBhcmUgb25seSBrZXB0XG4vLyBoZXJlIHRvIGF2b2lkIGEgYnJlYWtpbmcgY2hhbmdlIHdoZXJlYnkgdGhlIHByb3ZpZGVyIG9yZGVyIG1hdHRlcnMgYmFzZWQgb24gd2hlcmUgdGhlXG4vLyBgUm91dGVyTW9kdWxlYC9gUm91dGVyVGVzdGluZ01vZHVsZWAgaXMgaW1wb3J0ZWQuIFRoZXNlIGNhbi9zaG91bGQgYmUgcmVtb3ZlZCBhcyBhIFwiYnJlYWtpbmdcIlxuLy8gY2hhbmdlIGluIGEgbWFqb3IgdmVyc2lvbi5cbmV4cG9ydCBjb25zdCBST1VURVJfUFJPVklERVJTOiBQcm92aWRlcltdID0gW1xuICBMb2NhdGlvbixcbiAge3Byb3ZpZGU6IFVybFNlcmlhbGl6ZXIsIHVzZUNsYXNzOiBEZWZhdWx0VXJsU2VyaWFsaXplcn0sXG4gIFJvdXRlcixcbiAgQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyxcbiAge3Byb3ZpZGU6IEFjdGl2YXRlZFJvdXRlLCB1c2VGYWN0b3J5OiByb290Um91dGUsIGRlcHM6IFtSb3V0ZXJdfSxcbiAgUm91dGVyQ29uZmlnTG9hZGVyLFxuICAvLyBPbmx5IHVzZWQgdG8gd2FybiB3aGVuIGBwcm92aWRlUm91dGVzYCBpcyB1c2VkIHdpdGhvdXQgYFJvdXRlck1vZHVsZWAgb3IgYHByb3ZpZGVSb3V0ZXJgLiBDYW5cbiAgLy8gYmUgcmVtb3ZlZCB3aGVuIGBwcm92aWRlUm91dGVzYCBpcyByZW1vdmVkLlxuICB0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGVcbiAgICA/IHtwcm92aWRlOiBST1VURVJfSVNfUFJPVklERUQsIHVzZVZhbHVlOiB0cnVlfVxuICAgIDogW10sXG5dO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEFkZHMgZGlyZWN0aXZlcyBhbmQgcHJvdmlkZXJzIGZvciBpbi1hcHAgbmF2aWdhdGlvbiBhbW9uZyB2aWV3cyBkZWZpbmVkIGluIGFuIGFwcGxpY2F0aW9uLlxuICogVXNlIHRoZSBBbmd1bGFyIGBSb3V0ZXJgIHNlcnZpY2UgdG8gZGVjbGFyYXRpdmVseSBzcGVjaWZ5IGFwcGxpY2F0aW9uIHN0YXRlcyBhbmQgbWFuYWdlIHN0YXRlXG4gKiB0cmFuc2l0aW9ucy5cbiAqXG4gKiBZb3UgY2FuIGltcG9ydCB0aGlzIE5nTW9kdWxlIG11bHRpcGxlIHRpbWVzLCBvbmNlIGZvciBlYWNoIGxhenktbG9hZGVkIGJ1bmRsZS5cbiAqIEhvd2V2ZXIsIG9ubHkgb25lIGBSb3V0ZXJgIHNlcnZpY2UgY2FuIGJlIGFjdGl2ZS5cbiAqIFRvIGVuc3VyZSB0aGlzLCB0aGVyZSBhcmUgdHdvIHdheXMgdG8gcmVnaXN0ZXIgcm91dGVzIHdoZW4gaW1wb3J0aW5nIHRoaXMgbW9kdWxlOlxuICpcbiAqICogVGhlIGBmb3JSb290KClgIG1ldGhvZCBjcmVhdGVzIGFuIGBOZ01vZHVsZWAgdGhhdCBjb250YWlucyBhbGwgdGhlIGRpcmVjdGl2ZXMsIHRoZSBnaXZlblxuICogcm91dGVzLCBhbmQgdGhlIGBSb3V0ZXJgIHNlcnZpY2UgaXRzZWxmLlxuICogKiBUaGUgYGZvckNoaWxkKClgIG1ldGhvZCBjcmVhdGVzIGFuIGBOZ01vZHVsZWAgdGhhdCBjb250YWlucyBhbGwgdGhlIGRpcmVjdGl2ZXMgYW5kIHRoZSBnaXZlblxuICogcm91dGVzLCBidXQgZG9lcyBub3QgaW5jbHVkZSB0aGUgYFJvdXRlcmAgc2VydmljZS5cbiAqXG4gKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0aW5nL2NvbW1vbi1yb3V0ZXItdGFza3MpIGZvciBhblxuICogb3ZlcnZpZXcgb2YgaG93IHRoZSBgUm91dGVyYCBzZXJ2aWNlIHNob3VsZCBiZSB1c2VkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQE5nTW9kdWxlKHtcbiAgaW1wb3J0czogUk9VVEVSX0RJUkVDVElWRVMsXG4gIGV4cG9ydHM6IFJPVVRFUl9ESVJFQ1RJVkVTLFxufSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJNb2R1bGUge1xuICBjb25zdHJ1Y3RvcihAT3B0aW9uYWwoKSBASW5qZWN0KFJPVVRFUl9GT1JST09UX0dVQVJEKSBndWFyZDogYW55KSB7fVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuZCBjb25maWd1cmVzIGEgbW9kdWxlIHdpdGggYWxsIHRoZSByb3V0ZXIgcHJvdmlkZXJzIGFuZCBkaXJlY3RpdmVzLlxuICAgKiBPcHRpb25hbGx5IHNldHMgdXAgYW4gYXBwbGljYXRpb24gbGlzdGVuZXIgdG8gcGVyZm9ybSBhbiBpbml0aWFsIG5hdmlnYXRpb24uXG4gICAqXG4gICAqIFdoZW4gcmVnaXN0ZXJpbmcgdGhlIE5nTW9kdWxlIGF0IHRoZSByb290LCBpbXBvcnQgYXMgZm9sbG93czpcbiAgICpcbiAgICogYGBgXG4gICAqIEBOZ01vZHVsZSh7XG4gICAqICAgaW1wb3J0czogW1JvdXRlck1vZHVsZS5mb3JSb290KFJPVVRFUyldXG4gICAqIH0pXG4gICAqIGNsYXNzIE15TmdNb2R1bGUge31cbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSByb3V0ZXMgQW4gYXJyYXkgb2YgYFJvdXRlYCBvYmplY3RzIHRoYXQgZGVmaW5lIHRoZSBuYXZpZ2F0aW9uIHBhdGhzIGZvciB0aGUgYXBwbGljYXRpb24uXG4gICAqIEBwYXJhbSBjb25maWcgQW4gYEV4dHJhT3B0aW9uc2AgY29uZmlndXJhdGlvbiBvYmplY3QgdGhhdCBjb250cm9scyBob3cgbmF2aWdhdGlvbiBpcyBwZXJmb3JtZWQuXG4gICAqIEByZXR1cm4gVGhlIG5ldyBgTmdNb2R1bGVgLlxuICAgKlxuICAgKi9cbiAgc3RhdGljIGZvclJvb3Qocm91dGVzOiBSb3V0ZXMsIGNvbmZpZz86IEV4dHJhT3B0aW9ucyk6IE1vZHVsZVdpdGhQcm92aWRlcnM8Um91dGVyTW9kdWxlPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5nTW9kdWxlOiBSb3V0ZXJNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFtcbiAgICAgICAgUk9VVEVSX1BST1ZJREVSUyxcbiAgICAgICAgdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlXG4gICAgICAgICAgPyBjb25maWc/LmVuYWJsZVRyYWNpbmdcbiAgICAgICAgICAgID8gd2l0aERlYnVnVHJhY2luZygpLsm1cHJvdmlkZXJzXG4gICAgICAgICAgICA6IFtdXG4gICAgICAgICAgOiBbXSxcbiAgICAgICAge3Byb3ZpZGU6IFJPVVRFUywgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiByb3V0ZXN9LFxuICAgICAgICB7XG4gICAgICAgICAgcHJvdmlkZTogUk9VVEVSX0ZPUlJPT1RfR1VBUkQsXG4gICAgICAgICAgdXNlRmFjdG9yeTogcHJvdmlkZUZvclJvb3RHdWFyZCxcbiAgICAgICAgICBkZXBzOiBbW1JvdXRlciwgbmV3IE9wdGlvbmFsKCksIG5ldyBTa2lwU2VsZigpXV0sXG4gICAgICAgIH0sXG4gICAgICAgIGNvbmZpZz8uZXJyb3JIYW5kbGVyXG4gICAgICAgICAgPyB7XG4gICAgICAgICAgICAgIHByb3ZpZGU6IE5BVklHQVRJT05fRVJST1JfSEFORExFUixcbiAgICAgICAgICAgICAgdXNlVmFsdWU6IGNvbmZpZy5lcnJvckhhbmRsZXIsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgOiBbXSxcbiAgICAgICAge3Byb3ZpZGU6IFJPVVRFUl9DT05GSUdVUkFUSU9OLCB1c2VWYWx1ZTogY29uZmlnID8gY29uZmlnIDoge319LFxuICAgICAgICBjb25maWc/LnVzZUhhc2ggPyBwcm92aWRlSGFzaExvY2F0aW9uU3RyYXRlZ3koKSA6IHByb3ZpZGVQYXRoTG9jYXRpb25TdHJhdGVneSgpLFxuICAgICAgICBwcm92aWRlUm91dGVyU2Nyb2xsZXIoKSxcbiAgICAgICAgY29uZmlnPy5wcmVsb2FkaW5nU3RyYXRlZ3kgPyB3aXRoUHJlbG9hZGluZyhjb25maWcucHJlbG9hZGluZ1N0cmF0ZWd5KS7JtXByb3ZpZGVycyA6IFtdLFxuICAgICAgICBjb25maWc/LmluaXRpYWxOYXZpZ2F0aW9uID8gcHJvdmlkZUluaXRpYWxOYXZpZ2F0aW9uKGNvbmZpZykgOiBbXSxcbiAgICAgICAgY29uZmlnPy5iaW5kVG9Db21wb25lbnRJbnB1dHMgPyB3aXRoQ29tcG9uZW50SW5wdXRCaW5kaW5nKCkuybVwcm92aWRlcnMgOiBbXSxcbiAgICAgICAgY29uZmlnPy5lbmFibGVWaWV3VHJhbnNpdGlvbnMgPyB3aXRoVmlld1RyYW5zaXRpb25zKCkuybVwcm92aWRlcnMgOiBbXSxcbiAgICAgICAgcHJvdmlkZVJvdXRlckluaXRpYWxpemVyKCksXG4gICAgICBdLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG1vZHVsZSB3aXRoIGFsbCB0aGUgcm91dGVyIGRpcmVjdGl2ZXMgYW5kIGEgcHJvdmlkZXIgcmVnaXN0ZXJpbmcgcm91dGVzLFxuICAgKiB3aXRob3V0IGNyZWF0aW5nIGEgbmV3IFJvdXRlciBzZXJ2aWNlLlxuICAgKiBXaGVuIHJlZ2lzdGVyaW5nIGZvciBzdWJtb2R1bGVzIGFuZCBsYXp5LWxvYWRlZCBzdWJtb2R1bGVzLCBjcmVhdGUgdGhlIE5nTW9kdWxlIGFzIGZvbGxvd3M6XG4gICAqXG4gICAqIGBgYFxuICAgKiBATmdNb2R1bGUoe1xuICAgKiAgIGltcG9ydHM6IFtSb3V0ZXJNb2R1bGUuZm9yQ2hpbGQoUk9VVEVTKV1cbiAgICogfSlcbiAgICogY2xhc3MgTXlOZ01vZHVsZSB7fVxuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIHJvdXRlcyBBbiBhcnJheSBvZiBgUm91dGVgIG9iamVjdHMgdGhhdCBkZWZpbmUgdGhlIG5hdmlnYXRpb24gcGF0aHMgZm9yIHRoZSBzdWJtb2R1bGUuXG4gICAqIEByZXR1cm4gVGhlIG5ldyBOZ01vZHVsZS5cbiAgICpcbiAgICovXG4gIHN0YXRpYyBmb3JDaGlsZChyb3V0ZXM6IFJvdXRlcyk6IE1vZHVsZVdpdGhQcm92aWRlcnM8Um91dGVyTW9kdWxlPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5nTW9kdWxlOiBSb3V0ZXJNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFt7cHJvdmlkZTogUk9VVEVTLCBtdWx0aTogdHJ1ZSwgdXNlVmFsdWU6IHJvdXRlc31dLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBGb3IgaW50ZXJuYWwgdXNlIGJ5IGBSb3V0ZXJNb2R1bGVgIG9ubHkuIE5vdGUgdGhhdCB0aGlzIGRpZmZlcnMgZnJvbSBgd2l0aEluTWVtb3J5Um91dGVyU2Nyb2xsZXJgXG4gKiBiZWNhdXNlIGl0IHJlYWRzIGZyb20gdGhlIGBFeHRyYU9wdGlvbnNgIHdoaWNoIHNob3VsZCBub3QgYmUgdXNlZCBpbiB0aGUgc3RhbmRhbG9uZSB3b3JsZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVSb3V0ZXJTY3JvbGxlcigpOiBQcm92aWRlciB7XG4gIHJldHVybiB7XG4gICAgcHJvdmlkZTogUk9VVEVSX1NDUk9MTEVSLFxuICAgIHVzZUZhY3Rvcnk6ICgpID0+IHtcbiAgICAgIGNvbnN0IHZpZXdwb3J0U2Nyb2xsZXIgPSBpbmplY3QoVmlld3BvcnRTY3JvbGxlcik7XG4gICAgICBjb25zdCB6b25lID0gaW5qZWN0KE5nWm9uZSk7XG4gICAgICBjb25zdCBjb25maWc6IEV4dHJhT3B0aW9ucyA9IGluamVjdChST1VURVJfQ09ORklHVVJBVElPTik7XG4gICAgICBjb25zdCB0cmFuc2l0aW9ucyA9IGluamVjdChOYXZpZ2F0aW9uVHJhbnNpdGlvbnMpO1xuICAgICAgY29uc3QgdXJsU2VyaWFsaXplciA9IGluamVjdChVcmxTZXJpYWxpemVyKTtcbiAgICAgIGlmIChjb25maWcuc2Nyb2xsT2Zmc2V0KSB7XG4gICAgICAgIHZpZXdwb3J0U2Nyb2xsZXIuc2V0T2Zmc2V0KGNvbmZpZy5zY3JvbGxPZmZzZXQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBSb3V0ZXJTY3JvbGxlcih1cmxTZXJpYWxpemVyLCB0cmFuc2l0aW9ucywgdmlld3BvcnRTY3JvbGxlciwgem9uZSwgY29uZmlnKTtcbiAgICB9LFxuICB9O1xufVxuXG4vLyBOb3RlOiBGb3IgaW50ZXJuYWwgdXNlIG9ubHkgd2l0aCBgUm91dGVyTW9kdWxlYC4gU3RhbmRhbG9uZSBzZXR1cCB2aWEgYHByb3ZpZGVSb3V0ZXJgIHNob3VsZFxuLy8gcHJvdmlkZSBoYXNoIGxvY2F0aW9uIGRpcmVjdGx5IHZpYSBge3Byb3ZpZGU6IExvY2F0aW9uU3RyYXRlZ3ksIHVzZUNsYXNzOiBIYXNoTG9jYXRpb25TdHJhdGVneX1gLlxuZnVuY3Rpb24gcHJvdmlkZUhhc2hMb2NhdGlvblN0cmF0ZWd5KCk6IFByb3ZpZGVyIHtcbiAgcmV0dXJuIHtwcm92aWRlOiBMb2NhdGlvblN0cmF0ZWd5LCB1c2VDbGFzczogSGFzaExvY2F0aW9uU3RyYXRlZ3l9O1xufVxuXG4vLyBOb3RlOiBGb3IgaW50ZXJuYWwgdXNlIG9ubHkgd2l0aCBgUm91dGVyTW9kdWxlYC4gU3RhbmRhbG9uZSBzZXR1cCB2aWEgYHByb3ZpZGVSb3V0ZXJgIGRvZXMgbm90XG4vLyBuZWVkIHRoaXMgYXQgYWxsIGJlY2F1c2UgYFBhdGhMb2NhdGlvblN0cmF0ZWd5YCBpcyB0aGUgZGVmYXVsdCBmYWN0b3J5IGZvciBgTG9jYXRpb25TdHJhdGVneWAuXG5mdW5jdGlvbiBwcm92aWRlUGF0aExvY2F0aW9uU3RyYXRlZ3koKTogUHJvdmlkZXIge1xuICByZXR1cm4ge3Byb3ZpZGU6IExvY2F0aW9uU3RyYXRlZ3ksIHVzZUNsYXNzOiBQYXRoTG9jYXRpb25TdHJhdGVneX07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcm92aWRlRm9yUm9vdEd1YXJkKHJvdXRlcjogUm91dGVyKTogYW55IHtcbiAgaWYgKCh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmIHJvdXRlcikge1xuICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICBSdW50aW1lRXJyb3JDb2RlLkZPUl9ST09UX0NBTExFRF9UV0lDRSxcbiAgICAgIGBUaGUgUm91dGVyIHdhcyBwcm92aWRlZCBtb3JlIHRoYW4gb25jZS4gVGhpcyBjYW4gaGFwcGVuIGlmICdmb3JSb290JyBpcyB1c2VkIG91dHNpZGUgb2YgdGhlIHJvb3QgaW5qZWN0b3IuYCArXG4gICAgICAgIGAgTGF6eSBsb2FkZWQgbW9kdWxlcyBzaG91bGQgdXNlIFJvdXRlck1vZHVsZS5mb3JDaGlsZCgpIGluc3RlYWQuYCxcbiAgICApO1xuICB9XG4gIHJldHVybiAnZ3VhcmRlZCc7XG59XG5cbi8vIE5vdGU6IEZvciBpbnRlcm5hbCB1c2Ugb25seSB3aXRoIGBSb3V0ZXJNb2R1bGVgLiBTdGFuZGFsb25lIHJvdXRlciBzZXR1cCB3aXRoIGBwcm92aWRlUm91dGVyYFxuLy8gdXNlcnMgY2FsbCBgd2l0aFhJbml0aWFsTmF2aWdhdGlvbmAgZGlyZWN0bHkuXG5mdW5jdGlvbiBwcm92aWRlSW5pdGlhbE5hdmlnYXRpb24oY29uZmlnOiBQaWNrPEV4dHJhT3B0aW9ucywgJ2luaXRpYWxOYXZpZ2F0aW9uJz4pOiBQcm92aWRlcltdIHtcbiAgcmV0dXJuIFtcbiAgICBjb25maWcuaW5pdGlhbE5hdmlnYXRpb24gPT09ICdkaXNhYmxlZCcgPyB3aXRoRGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbigpLsm1cHJvdmlkZXJzIDogW10sXG4gICAgY29uZmlnLmluaXRpYWxOYXZpZ2F0aW9uID09PSAnZW5hYmxlZEJsb2NraW5nJ1xuICAgICAgPyB3aXRoRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb24oKS7JtXByb3ZpZGVyc1xuICAgICAgOiBbXSxcbiAgXTtcbn1cblxuLy8gVE9ETyhhdHNjb3R0KTogVGhpcyBzaG91bGQgbm90IGJlIGluIHRoZSBwdWJsaWMgQVBJXG4vKipcbiAqIEEgREkgdG9rZW4gZm9yIHRoZSByb3V0ZXIgaW5pdGlhbGl6ZXIgdGhhdFxuICogaXMgY2FsbGVkIGFmdGVyIHRoZSBhcHAgaXMgYm9vdHN0cmFwcGVkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9JTklUSUFMSVpFUiA9IG5ldyBJbmplY3Rpb25Ub2tlbjwoY29tcFJlZjogQ29tcG9uZW50UmVmPGFueT4pID0+IHZvaWQ+KFxuICB0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUgPyAnUm91dGVyIEluaXRpYWxpemVyJyA6ICcnLFxuKTtcblxuZnVuY3Rpb24gcHJvdmlkZVJvdXRlckluaXRpYWxpemVyKCk6IFByb3ZpZGVyW10ge1xuICByZXR1cm4gW1xuICAgIC8vIFJPVVRFUl9JTklUSUFMSVpFUiB0b2tlbiBzaG91bGQgYmUgcmVtb3ZlZC4gSXQncyBwdWJsaWMgQVBJIGJ1dCBzaG91bGRuJ3QgYmUuIFdlIGNhbiBqdXN0XG4gICAgLy8gaGF2ZSBgZ2V0Qm9vdHN0cmFwTGlzdGVuZXJgIGRpcmVjdGx5IGF0dGFjaGVkIHRvIEFQUF9CT09UU1RSQVBfTElTVEVORVIuXG4gICAge3Byb3ZpZGU6IFJPVVRFUl9JTklUSUFMSVpFUiwgdXNlRmFjdG9yeTogZ2V0Qm9vdHN0cmFwTGlzdGVuZXJ9LFxuICAgIHtwcm92aWRlOiBBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLCBtdWx0aTogdHJ1ZSwgdXNlRXhpc3Rpbmc6IFJPVVRFUl9JTklUSUFMSVpFUn0sXG4gIF07XG59XG4iXX0=