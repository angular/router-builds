/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { HashLocationStrategy, Location, LocationStrategy, PathLocationStrategy, ViewportScroller, } from '@angular/common';
import { APP_BOOTSTRAP_LISTENER, inject, Inject, InjectionToken, NgModule, NgZone, Optional, SkipSelf, ɵRuntimeError as RuntimeError, } from '@angular/core';
import { EmptyOutletComponent } from './components/empty_outlet';
import { RouterLink } from './directives/router_link';
import { RouterLinkActive } from './directives/router_link_active';
import { RouterOutlet } from './directives/router_outlet';
import { NavigationTransitions } from './navigation_transition';
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.9+sha-fae3c83", ngImport: i0, type: RouterModule, deps: [{ token: ROUTER_FORROOT_GUARD, optional: true }], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "18.2.9+sha-fae3c83", ngImport: i0, type: RouterModule, imports: [RouterOutlet, RouterLink, RouterLinkActive, EmptyOutletComponent], exports: [RouterOutlet, RouterLink, RouterLinkActive, EmptyOutletComponent] }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "18.2.9+sha-fae3c83", ngImport: i0, type: RouterModule }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.9+sha-fae3c83", ngImport: i0, type: RouterModule, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX21vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQ0wsb0JBQW9CLEVBQ3BCLFFBQVEsRUFDUixnQkFBZ0IsRUFDaEIsb0JBQW9CLEVBQ3BCLGdCQUFnQixHQUNqQixNQUFNLGlCQUFpQixDQUFDO0FBQ3pCLE9BQU8sRUFDTCxzQkFBc0IsRUFFdEIsTUFBTSxFQUNOLE1BQU0sRUFDTixjQUFjLEVBRWQsUUFBUSxFQUNSLE1BQU0sRUFDTixRQUFRLEVBRVIsUUFBUSxFQUNSLGFBQWEsSUFBSSxZQUFZLEdBQzlCLE1BQU0sZUFBZSxDQUFDO0FBRXZCLE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLDJCQUEyQixDQUFDO0FBQy9ELE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqRSxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFHeEQsT0FBTyxFQUFDLHFCQUFxQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDOUQsT0FBTyxFQUNMLG9CQUFvQixFQUNwQixTQUFTLEVBQ1Qsa0JBQWtCLEVBQ2xCLHlCQUF5QixFQUN6QixnQkFBZ0IsRUFDaEIsNkJBQTZCLEVBQzdCLG9DQUFvQyxFQUNwQyxjQUFjLEVBQ2QsbUJBQW1CLEdBQ3BCLE1BQU0sa0JBQWtCLENBQUM7QUFDMUIsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLEVBQWUsb0JBQW9CLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUNuRSxPQUFPLEVBQUMsa0JBQWtCLEVBQUUsTUFBTSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDbEUsT0FBTyxFQUFDLHNCQUFzQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDL0QsT0FBTyxFQUFDLGVBQWUsRUFBRSxjQUFjLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUNsRSxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDOUMsT0FBTyxFQUFDLG9CQUFvQixFQUFFLGFBQWEsRUFBQyxNQUFNLFlBQVksQ0FBQzs7QUFFL0Q7O0dBRUc7QUFDSCxNQUFNLGlCQUFpQixHQUFHLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0FBRTdGOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxjQUFjLENBQ3BELE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTO0lBQzNDLENBQUMsQ0FBQyxnQ0FBZ0M7SUFDbEMsQ0FBQyxDQUFDLHNCQUFzQixDQUMzQixDQUFDO0FBRUYsbUdBQW1HO0FBQ25HLHdGQUF3RjtBQUN4RixnR0FBZ0c7QUFDaEcsNkJBQTZCO0FBQzdCLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFlO0lBQzFDLFFBQVE7SUFDUixFQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFDO0lBQ3hELE1BQU07SUFDTixzQkFBc0I7SUFDdEIsRUFBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUM7SUFDaEUsa0JBQWtCO0lBQ2xCLGdHQUFnRztJQUNoRyw4Q0FBOEM7SUFDOUMsT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLFNBQVM7UUFDM0MsQ0FBQyxDQUFDLEVBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUM7UUFDL0MsQ0FBQyxDQUFDLEVBQUU7Q0FDUCxDQUFDO0FBRUY7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0JHO0FBS0gsTUFBTSxPQUFPLFlBQVk7SUFDdkIsWUFBc0QsS0FBVSxJQUFHLENBQUM7SUFFcEU7Ozs7Ozs7Ozs7Ozs7Ozs7O09BaUJHO0lBQ0gsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFjLEVBQUUsTUFBcUI7UUFDbEQsT0FBTztZQUNMLFFBQVEsRUFBRSxZQUFZO1lBQ3RCLFNBQVMsRUFBRTtnQkFDVCxnQkFBZ0I7Z0JBQ2hCLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTO29CQUMzQyxDQUFDLENBQUMsTUFBTSxFQUFFLGFBQWE7d0JBQ3JCLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLFVBQVU7d0JBQy9CLENBQUMsQ0FBQyxFQUFFO29CQUNOLENBQUMsQ0FBQyxFQUFFO2dCQUNOLEVBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUM7Z0JBQ2hEO29CQUNFLE9BQU8sRUFBRSxvQkFBb0I7b0JBQzdCLFVBQVUsRUFBRSxtQkFBbUI7b0JBQy9CLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLElBQUksUUFBUSxFQUFFLEVBQUUsSUFBSSxRQUFRLEVBQUUsQ0FBQyxDQUFDO2lCQUNqRDtnQkFDRCxFQUFDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBQztnQkFDL0QsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUMsMkJBQTJCLEVBQUU7Z0JBQy9FLHFCQUFxQixFQUFFO2dCQUN2QixNQUFNLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3RGLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2pFLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQzNFLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3JFLHdCQUF3QixFQUFFO2FBQzNCO1NBQ0YsQ0FBQztJQUNKLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7O09BZUc7SUFDSCxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQWM7UUFDNUIsT0FBTztZQUNMLFFBQVEsRUFBRSxZQUFZO1lBQ3RCLFNBQVMsRUFBRSxDQUFDLEVBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUMsQ0FBQztTQUM5RCxDQUFDO0lBQ0osQ0FBQzt5SEF0RVUsWUFBWSxrQkFDUyxvQkFBb0I7MEhBRHpDLFlBQVksWUF0REUsWUFBWSxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0IsYUFBaEUsWUFBWSxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0I7MEhBc0Q5RSxZQUFZOztzR0FBWixZQUFZO2tCQUp4QixRQUFRO21CQUFDO29CQUNSLE9BQU8sRUFBRSxpQkFBaUI7b0JBQzFCLE9BQU8sRUFBRSxpQkFBaUI7aUJBQzNCOzswQkFFYyxRQUFROzswQkFBSSxNQUFNOzJCQUFDLG9CQUFvQjs7QUF3RXREOzs7R0FHRztBQUNILE1BQU0sVUFBVSxxQkFBcUI7SUFDbkMsT0FBTztRQUNMLE9BQU8sRUFBRSxlQUFlO1FBQ3hCLFVBQVUsRUFBRSxHQUFHLEVBQUU7WUFDZixNQUFNLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1QixNQUFNLE1BQU0sR0FBaUIsTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFDMUQsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFDbEQsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzVDLElBQUksTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUN4QixnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ2xELENBQUM7WUFDRCxPQUFPLElBQUksY0FBYyxDQUFDLGFBQWEsRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3hGLENBQUM7S0FDRixDQUFDO0FBQ0osQ0FBQztBQUVELCtGQUErRjtBQUMvRixvR0FBb0c7QUFDcEcsU0FBUywyQkFBMkI7SUFDbEMsT0FBTyxFQUFDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsb0JBQW9CLEVBQUMsQ0FBQztBQUNyRSxDQUFDO0FBRUQsaUdBQWlHO0FBQ2pHLGlHQUFpRztBQUNqRyxTQUFTLDJCQUEyQjtJQUNsQyxPQUFPLEVBQUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxvQkFBb0IsRUFBQyxDQUFDO0FBQ3JFLENBQUM7QUFFRCxNQUFNLFVBQVUsbUJBQW1CLENBQUMsTUFBYztJQUNoRCxJQUFJLENBQUMsT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLFNBQVMsQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzlELE1BQU0sSUFBSSxZQUFZLG9EQUVwQiw0R0FBNEc7WUFDMUcsa0VBQWtFLENBQ3JFLENBQUM7SUFDSixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUM7QUFDbkIsQ0FBQztBQUVELGdHQUFnRztBQUNoRyxnREFBZ0Q7QUFDaEQsU0FBUyx3QkFBd0IsQ0FBQyxNQUErQztJQUMvRSxPQUFPO1FBQ0wsTUFBTSxDQUFDLGlCQUFpQixLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDekYsTUFBTSxDQUFDLGlCQUFpQixLQUFLLGlCQUFpQjtZQUM1QyxDQUFDLENBQUMsb0NBQW9DLEVBQUUsQ0FBQyxVQUFVO1lBQ25ELENBQUMsQ0FBQyxFQUFFO0tBQ1AsQ0FBQztBQUNKLENBQUM7QUFFRCxzREFBc0Q7QUFDdEQ7Ozs7O0dBS0c7QUFDSCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLGNBQWMsQ0FDbEQsT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FDMUUsQ0FBQztBQUVGLFNBQVMsd0JBQXdCO0lBQy9CLE9BQU87UUFDTCw0RkFBNEY7UUFDNUYsMkVBQTJFO1FBQzNFLEVBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxvQkFBb0IsRUFBQztRQUMvRCxFQUFDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxrQkFBa0IsRUFBQztLQUNoRixDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmRldi9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtcbiAgSGFzaExvY2F0aW9uU3RyYXRlZ3ksXG4gIExvY2F0aW9uLFxuICBMb2NhdGlvblN0cmF0ZWd5LFxuICBQYXRoTG9jYXRpb25TdHJhdGVneSxcbiAgVmlld3BvcnRTY3JvbGxlcixcbn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7XG4gIEFQUF9CT09UU1RSQVBfTElTVEVORVIsXG4gIENvbXBvbmVudFJlZixcbiAgaW5qZWN0LFxuICBJbmplY3QsXG4gIEluamVjdGlvblRva2VuLFxuICBNb2R1bGVXaXRoUHJvdmlkZXJzLFxuICBOZ01vZHVsZSxcbiAgTmdab25lLFxuICBPcHRpb25hbCxcbiAgUHJvdmlkZXIsXG4gIFNraXBTZWxmLFxuICDJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3IsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQge0VtcHR5T3V0bGV0Q29tcG9uZW50fSBmcm9tICcuL2NvbXBvbmVudHMvZW1wdHlfb3V0bGV0JztcbmltcG9ydCB7Um91dGVyTGlua30gZnJvbSAnLi9kaXJlY3RpdmVzL3JvdXRlcl9saW5rJztcbmltcG9ydCB7Um91dGVyTGlua0FjdGl2ZX0gZnJvbSAnLi9kaXJlY3RpdmVzL3JvdXRlcl9saW5rX2FjdGl2ZSc7XG5pbXBvcnQge1JvdXRlck91dGxldH0gZnJvbSAnLi9kaXJlY3RpdmVzL3JvdXRlcl9vdXRsZXQnO1xuaW1wb3J0IHtSdW50aW1lRXJyb3JDb2RlfSBmcm9tICcuL2Vycm9ycyc7XG5pbXBvcnQge1JvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtOYXZpZ2F0aW9uVHJhbnNpdGlvbnN9IGZyb20gJy4vbmF2aWdhdGlvbl90cmFuc2l0aW9uJztcbmltcG9ydCB7XG4gIGdldEJvb3RzdHJhcExpc3RlbmVyLFxuICByb290Um91dGUsXG4gIFJPVVRFUl9JU19QUk9WSURFRCxcbiAgd2l0aENvbXBvbmVudElucHV0QmluZGluZyxcbiAgd2l0aERlYnVnVHJhY2luZyxcbiAgd2l0aERpc2FibGVkSW5pdGlhbE5hdmlnYXRpb24sXG4gIHdpdGhFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbixcbiAgd2l0aFByZWxvYWRpbmcsXG4gIHdpdGhWaWV3VHJhbnNpdGlvbnMsXG59IGZyb20gJy4vcHJvdmlkZV9yb3V0ZXInO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJy4vcm91dGVyJztcbmltcG9ydCB7RXh0cmFPcHRpb25zLCBST1VURVJfQ09ORklHVVJBVElPTn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnJztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyLCBST1VURVN9IGZyb20gJy4vcm91dGVyX2NvbmZpZ19sb2FkZXInO1xuaW1wb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzfSBmcm9tICcuL3JvdXRlcl9vdXRsZXRfY29udGV4dCc7XG5pbXBvcnQge1JPVVRFUl9TQ1JPTExFUiwgUm91dGVyU2Nyb2xsZXJ9IGZyb20gJy4vcm91dGVyX3Njcm9sbGVyJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGV9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7RGVmYXVsdFVybFNlcmlhbGl6ZXIsIFVybFNlcmlhbGl6ZXJ9IGZyb20gJy4vdXJsX3RyZWUnO1xuXG4vKipcbiAqIFRoZSBkaXJlY3RpdmVzIGRlZmluZWQgaW4gdGhlIGBSb3V0ZXJNb2R1bGVgLlxuICovXG5jb25zdCBST1VURVJfRElSRUNUSVZFUyA9IFtSb3V0ZXJPdXRsZXQsIFJvdXRlckxpbmssIFJvdXRlckxpbmtBY3RpdmUsIEVtcHR5T3V0bGV0Q29tcG9uZW50XTtcblxuLyoqXG4gKiBAZG9jc05vdFJlcXVpcmVkXG4gKi9cbmV4cG9ydCBjb25zdCBST1VURVJfRk9SUk9PVF9HVUFSRCA9IG5ldyBJbmplY3Rpb25Ub2tlbjx2b2lkPihcbiAgdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlXG4gICAgPyAncm91dGVyIGR1cGxpY2F0ZSBmb3JSb290IGd1YXJkJ1xuICAgIDogJ1JPVVRFUl9GT1JST09UX0dVQVJEJyxcbik7XG5cbi8vIFRPRE8oYXRzY290dCk6IEFsbCBvZiB0aGVzZSBleGNlcHQgYEFjdGl2YXRlZFJvdXRlYCBhcmUgYHByb3ZpZGVkSW46ICdyb290J2AuIFRoZXkgYXJlIG9ubHkga2VwdFxuLy8gaGVyZSB0byBhdm9pZCBhIGJyZWFraW5nIGNoYW5nZSB3aGVyZWJ5IHRoZSBwcm92aWRlciBvcmRlciBtYXR0ZXJzIGJhc2VkIG9uIHdoZXJlIHRoZVxuLy8gYFJvdXRlck1vZHVsZWAvYFJvdXRlclRlc3RpbmdNb2R1bGVgIGlzIGltcG9ydGVkLiBUaGVzZSBjYW4vc2hvdWxkIGJlIHJlbW92ZWQgYXMgYSBcImJyZWFraW5nXCJcbi8vIGNoYW5nZSBpbiBhIG1ham9yIHZlcnNpb24uXG5leHBvcnQgY29uc3QgUk9VVEVSX1BST1ZJREVSUzogUHJvdmlkZXJbXSA9IFtcbiAgTG9jYXRpb24sXG4gIHtwcm92aWRlOiBVcmxTZXJpYWxpemVyLCB1c2VDbGFzczogRGVmYXVsdFVybFNlcmlhbGl6ZXJ9LFxuICBSb3V0ZXIsXG4gIENoaWxkcmVuT3V0bGV0Q29udGV4dHMsXG4gIHtwcm92aWRlOiBBY3RpdmF0ZWRSb3V0ZSwgdXNlRmFjdG9yeTogcm9vdFJvdXRlLCBkZXBzOiBbUm91dGVyXX0sXG4gIFJvdXRlckNvbmZpZ0xvYWRlcixcbiAgLy8gT25seSB1c2VkIHRvIHdhcm4gd2hlbiBgcHJvdmlkZVJvdXRlc2AgaXMgdXNlZCB3aXRob3V0IGBSb3V0ZXJNb2R1bGVgIG9yIGBwcm92aWRlUm91dGVyYC4gQ2FuXG4gIC8vIGJlIHJlbW92ZWQgd2hlbiBgcHJvdmlkZVJvdXRlc2AgaXMgcmVtb3ZlZC5cbiAgdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlXG4gICAgPyB7cHJvdmlkZTogUk9VVEVSX0lTX1BST1ZJREVELCB1c2VWYWx1ZTogdHJ1ZX1cbiAgICA6IFtdLFxuXTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBBZGRzIGRpcmVjdGl2ZXMgYW5kIHByb3ZpZGVycyBmb3IgaW4tYXBwIG5hdmlnYXRpb24gYW1vbmcgdmlld3MgZGVmaW5lZCBpbiBhbiBhcHBsaWNhdGlvbi5cbiAqIFVzZSB0aGUgQW5ndWxhciBgUm91dGVyYCBzZXJ2aWNlIHRvIGRlY2xhcmF0aXZlbHkgc3BlY2lmeSBhcHBsaWNhdGlvbiBzdGF0ZXMgYW5kIG1hbmFnZSBzdGF0ZVxuICogdHJhbnNpdGlvbnMuXG4gKlxuICogWW91IGNhbiBpbXBvcnQgdGhpcyBOZ01vZHVsZSBtdWx0aXBsZSB0aW1lcywgb25jZSBmb3IgZWFjaCBsYXp5LWxvYWRlZCBidW5kbGUuXG4gKiBIb3dldmVyLCBvbmx5IG9uZSBgUm91dGVyYCBzZXJ2aWNlIGNhbiBiZSBhY3RpdmUuXG4gKiBUbyBlbnN1cmUgdGhpcywgdGhlcmUgYXJlIHR3byB3YXlzIHRvIHJlZ2lzdGVyIHJvdXRlcyB3aGVuIGltcG9ydGluZyB0aGlzIG1vZHVsZTpcbiAqXG4gKiAqIFRoZSBgZm9yUm9vdCgpYCBtZXRob2QgY3JlYXRlcyBhbiBgTmdNb2R1bGVgIHRoYXQgY29udGFpbnMgYWxsIHRoZSBkaXJlY3RpdmVzLCB0aGUgZ2l2ZW5cbiAqIHJvdXRlcywgYW5kIHRoZSBgUm91dGVyYCBzZXJ2aWNlIGl0c2VsZi5cbiAqICogVGhlIGBmb3JDaGlsZCgpYCBtZXRob2QgY3JlYXRlcyBhbiBgTmdNb2R1bGVgIHRoYXQgY29udGFpbnMgYWxsIHRoZSBkaXJlY3RpdmVzIGFuZCB0aGUgZ2l2ZW5cbiAqIHJvdXRlcywgYnV0IGRvZXMgbm90IGluY2x1ZGUgdGhlIGBSb3V0ZXJgIHNlcnZpY2UuXG4gKlxuICogQHNlZSBbUm91dGluZyBhbmQgTmF2aWdhdGlvbiBndWlkZV0oZ3VpZGUvcm91dGluZy9jb21tb24tcm91dGVyLXRhc2tzKSBmb3IgYW5cbiAqIG92ZXJ2aWV3IG9mIGhvdyB0aGUgYFJvdXRlcmAgc2VydmljZSBzaG91bGQgYmUgdXNlZC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBOZ01vZHVsZSh7XG4gIGltcG9ydHM6IFJPVVRFUl9ESVJFQ1RJVkVTLFxuICBleHBvcnRzOiBST1VURVJfRElSRUNUSVZFUyxcbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyTW9kdWxlIHtcbiAgY29uc3RydWN0b3IoQE9wdGlvbmFsKCkgQEluamVjdChST1VURVJfRk9SUk9PVF9HVUFSRCkgZ3VhcmQ6IGFueSkge31cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbmQgY29uZmlndXJlcyBhIG1vZHVsZSB3aXRoIGFsbCB0aGUgcm91dGVyIHByb3ZpZGVycyBhbmQgZGlyZWN0aXZlcy5cbiAgICogT3B0aW9uYWxseSBzZXRzIHVwIGFuIGFwcGxpY2F0aW9uIGxpc3RlbmVyIHRvIHBlcmZvcm0gYW4gaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBXaGVuIHJlZ2lzdGVyaW5nIHRoZSBOZ01vZHVsZSBhdCB0aGUgcm9vdCwgaW1wb3J0IGFzIGZvbGxvd3M6XG4gICAqXG4gICAqIGBgYFxuICAgKiBATmdNb2R1bGUoe1xuICAgKiAgIGltcG9ydHM6IFtSb3V0ZXJNb2R1bGUuZm9yUm9vdChST1VURVMpXVxuICAgKiB9KVxuICAgKiBjbGFzcyBNeU5nTW9kdWxlIHt9XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gcm91dGVzIEFuIGFycmF5IG9mIGBSb3V0ZWAgb2JqZWN0cyB0aGF0IGRlZmluZSB0aGUgbmF2aWdhdGlvbiBwYXRocyBmb3IgdGhlIGFwcGxpY2F0aW9uLlxuICAgKiBAcGFyYW0gY29uZmlnIEFuIGBFeHRyYU9wdGlvbnNgIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHRoYXQgY29udHJvbHMgaG93IG5hdmlnYXRpb24gaXMgcGVyZm9ybWVkLlxuICAgKiBAcmV0dXJuIFRoZSBuZXcgYE5nTW9kdWxlYC5cbiAgICpcbiAgICovXG4gIHN0YXRpYyBmb3JSb290KHJvdXRlczogUm91dGVzLCBjb25maWc/OiBFeHRyYU9wdGlvbnMpOiBNb2R1bGVXaXRoUHJvdmlkZXJzPFJvdXRlck1vZHVsZT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuZ01vZHVsZTogUm91dGVyTW9kdWxlLFxuICAgICAgcHJvdmlkZXJzOiBbXG4gICAgICAgIFJPVVRFUl9QUk9WSURFUlMsXG4gICAgICAgIHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZVxuICAgICAgICAgID8gY29uZmlnPy5lbmFibGVUcmFjaW5nXG4gICAgICAgICAgICA/IHdpdGhEZWJ1Z1RyYWNpbmcoKS7JtXByb3ZpZGVyc1xuICAgICAgICAgICAgOiBbXVxuICAgICAgICAgIDogW10sXG4gICAgICAgIHtwcm92aWRlOiBST1VURVMsIG11bHRpOiB0cnVlLCB1c2VWYWx1ZTogcm91dGVzfSxcbiAgICAgICAge1xuICAgICAgICAgIHByb3ZpZGU6IFJPVVRFUl9GT1JST09UX0dVQVJELFxuICAgICAgICAgIHVzZUZhY3Rvcnk6IHByb3ZpZGVGb3JSb290R3VhcmQsXG4gICAgICAgICAgZGVwczogW1tSb3V0ZXIsIG5ldyBPcHRpb25hbCgpLCBuZXcgU2tpcFNlbGYoKV1dLFxuICAgICAgICB9LFxuICAgICAgICB7cHJvdmlkZTogUk9VVEVSX0NPTkZJR1VSQVRJT04sIHVzZVZhbHVlOiBjb25maWcgPyBjb25maWcgOiB7fX0sXG4gICAgICAgIGNvbmZpZz8udXNlSGFzaCA/IHByb3ZpZGVIYXNoTG9jYXRpb25TdHJhdGVneSgpIDogcHJvdmlkZVBhdGhMb2NhdGlvblN0cmF0ZWd5KCksXG4gICAgICAgIHByb3ZpZGVSb3V0ZXJTY3JvbGxlcigpLFxuICAgICAgICBjb25maWc/LnByZWxvYWRpbmdTdHJhdGVneSA/IHdpdGhQcmVsb2FkaW5nKGNvbmZpZy5wcmVsb2FkaW5nU3RyYXRlZ3kpLsm1cHJvdmlkZXJzIDogW10sXG4gICAgICAgIGNvbmZpZz8uaW5pdGlhbE5hdmlnYXRpb24gPyBwcm92aWRlSW5pdGlhbE5hdmlnYXRpb24oY29uZmlnKSA6IFtdLFxuICAgICAgICBjb25maWc/LmJpbmRUb0NvbXBvbmVudElucHV0cyA/IHdpdGhDb21wb25lbnRJbnB1dEJpbmRpbmcoKS7JtXByb3ZpZGVycyA6IFtdLFxuICAgICAgICBjb25maWc/LmVuYWJsZVZpZXdUcmFuc2l0aW9ucyA/IHdpdGhWaWV3VHJhbnNpdGlvbnMoKS7JtXByb3ZpZGVycyA6IFtdLFxuICAgICAgICBwcm92aWRlUm91dGVySW5pdGlhbGl6ZXIoKSxcbiAgICAgIF0sXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbW9kdWxlIHdpdGggYWxsIHRoZSByb3V0ZXIgZGlyZWN0aXZlcyBhbmQgYSBwcm92aWRlciByZWdpc3RlcmluZyByb3V0ZXMsXG4gICAqIHdpdGhvdXQgY3JlYXRpbmcgYSBuZXcgUm91dGVyIHNlcnZpY2UuXG4gICAqIFdoZW4gcmVnaXN0ZXJpbmcgZm9yIHN1Ym1vZHVsZXMgYW5kIGxhenktbG9hZGVkIHN1Ym1vZHVsZXMsIGNyZWF0ZSB0aGUgTmdNb2R1bGUgYXMgZm9sbG93czpcbiAgICpcbiAgICogYGBgXG4gICAqIEBOZ01vZHVsZSh7XG4gICAqICAgaW1wb3J0czogW1JvdXRlck1vZHVsZS5mb3JDaGlsZChST1VURVMpXVxuICAgKiB9KVxuICAgKiBjbGFzcyBNeU5nTW9kdWxlIHt9XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gcm91dGVzIEFuIGFycmF5IG9mIGBSb3V0ZWAgb2JqZWN0cyB0aGF0IGRlZmluZSB0aGUgbmF2aWdhdGlvbiBwYXRocyBmb3IgdGhlIHN1Ym1vZHVsZS5cbiAgICogQHJldHVybiBUaGUgbmV3IE5nTW9kdWxlLlxuICAgKlxuICAgKi9cbiAgc3RhdGljIGZvckNoaWxkKHJvdXRlczogUm91dGVzKTogTW9kdWxlV2l0aFByb3ZpZGVyczxSb3V0ZXJNb2R1bGU+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmdNb2R1bGU6IFJvdXRlck1vZHVsZSxcbiAgICAgIHByb3ZpZGVyczogW3twcm92aWRlOiBST1VURVMsIG11bHRpOiB0cnVlLCB1c2VWYWx1ZTogcm91dGVzfV0sXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIEZvciBpbnRlcm5hbCB1c2UgYnkgYFJvdXRlck1vZHVsZWAgb25seS4gTm90ZSB0aGF0IHRoaXMgZGlmZmVycyBmcm9tIGB3aXRoSW5NZW1vcnlSb3V0ZXJTY3JvbGxlcmBcbiAqIGJlY2F1c2UgaXQgcmVhZHMgZnJvbSB0aGUgYEV4dHJhT3B0aW9uc2Agd2hpY2ggc2hvdWxkIG5vdCBiZSB1c2VkIGluIHRoZSBzdGFuZGFsb25lIHdvcmxkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZVJvdXRlclNjcm9sbGVyKCk6IFByb3ZpZGVyIHtcbiAgcmV0dXJuIHtcbiAgICBwcm92aWRlOiBST1VURVJfU0NST0xMRVIsXG4gICAgdXNlRmFjdG9yeTogKCkgPT4ge1xuICAgICAgY29uc3Qgdmlld3BvcnRTY3JvbGxlciA9IGluamVjdChWaWV3cG9ydFNjcm9sbGVyKTtcbiAgICAgIGNvbnN0IHpvbmUgPSBpbmplY3QoTmdab25lKTtcbiAgICAgIGNvbnN0IGNvbmZpZzogRXh0cmFPcHRpb25zID0gaW5qZWN0KFJPVVRFUl9DT05GSUdVUkFUSU9OKTtcbiAgICAgIGNvbnN0IHRyYW5zaXRpb25zID0gaW5qZWN0KE5hdmlnYXRpb25UcmFuc2l0aW9ucyk7XG4gICAgICBjb25zdCB1cmxTZXJpYWxpemVyID0gaW5qZWN0KFVybFNlcmlhbGl6ZXIpO1xuICAgICAgaWYgKGNvbmZpZy5zY3JvbGxPZmZzZXQpIHtcbiAgICAgICAgdmlld3BvcnRTY3JvbGxlci5zZXRPZmZzZXQoY29uZmlnLnNjcm9sbE9mZnNldCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFJvdXRlclNjcm9sbGVyKHVybFNlcmlhbGl6ZXIsIHRyYW5zaXRpb25zLCB2aWV3cG9ydFNjcm9sbGVyLCB6b25lLCBjb25maWcpO1xuICAgIH0sXG4gIH07XG59XG5cbi8vIE5vdGU6IEZvciBpbnRlcm5hbCB1c2Ugb25seSB3aXRoIGBSb3V0ZXJNb2R1bGVgLiBTdGFuZGFsb25lIHNldHVwIHZpYSBgcHJvdmlkZVJvdXRlcmAgc2hvdWxkXG4vLyBwcm92aWRlIGhhc2ggbG9jYXRpb24gZGlyZWN0bHkgdmlhIGB7cHJvdmlkZTogTG9jYXRpb25TdHJhdGVneSwgdXNlQ2xhc3M6IEhhc2hMb2NhdGlvblN0cmF0ZWd5fWAuXG5mdW5jdGlvbiBwcm92aWRlSGFzaExvY2F0aW9uU3RyYXRlZ3koKTogUHJvdmlkZXIge1xuICByZXR1cm4ge3Byb3ZpZGU6IExvY2F0aW9uU3RyYXRlZ3ksIHVzZUNsYXNzOiBIYXNoTG9jYXRpb25TdHJhdGVneX07XG59XG5cbi8vIE5vdGU6IEZvciBpbnRlcm5hbCB1c2Ugb25seSB3aXRoIGBSb3V0ZXJNb2R1bGVgLiBTdGFuZGFsb25lIHNldHVwIHZpYSBgcHJvdmlkZVJvdXRlcmAgZG9lcyBub3Rcbi8vIG5lZWQgdGhpcyBhdCBhbGwgYmVjYXVzZSBgUGF0aExvY2F0aW9uU3RyYXRlZ3lgIGlzIHRoZSBkZWZhdWx0IGZhY3RvcnkgZm9yIGBMb2NhdGlvblN0cmF0ZWd5YC5cbmZ1bmN0aW9uIHByb3ZpZGVQYXRoTG9jYXRpb25TdHJhdGVneSgpOiBQcm92aWRlciB7XG4gIHJldHVybiB7cHJvdmlkZTogTG9jYXRpb25TdHJhdGVneSwgdXNlQ2xhc3M6IFBhdGhMb2NhdGlvblN0cmF0ZWd5fTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVGb3JSb290R3VhcmQocm91dGVyOiBSb3V0ZXIpOiBhbnkge1xuICBpZiAoKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiYgcm91dGVyKSB7XG4gICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgIFJ1bnRpbWVFcnJvckNvZGUuRk9SX1JPT1RfQ0FMTEVEX1RXSUNFLFxuICAgICAgYFRoZSBSb3V0ZXIgd2FzIHByb3ZpZGVkIG1vcmUgdGhhbiBvbmNlLiBUaGlzIGNhbiBoYXBwZW4gaWYgJ2ZvclJvb3QnIGlzIHVzZWQgb3V0c2lkZSBvZiB0aGUgcm9vdCBpbmplY3Rvci5gICtcbiAgICAgICAgYCBMYXp5IGxvYWRlZCBtb2R1bGVzIHNob3VsZCB1c2UgUm91dGVyTW9kdWxlLmZvckNoaWxkKCkgaW5zdGVhZC5gLFxuICAgICk7XG4gIH1cbiAgcmV0dXJuICdndWFyZGVkJztcbn1cblxuLy8gTm90ZTogRm9yIGludGVybmFsIHVzZSBvbmx5IHdpdGggYFJvdXRlck1vZHVsZWAuIFN0YW5kYWxvbmUgcm91dGVyIHNldHVwIHdpdGggYHByb3ZpZGVSb3V0ZXJgXG4vLyB1c2VycyBjYWxsIGB3aXRoWEluaXRpYWxOYXZpZ2F0aW9uYCBkaXJlY3RseS5cbmZ1bmN0aW9uIHByb3ZpZGVJbml0aWFsTmF2aWdhdGlvbihjb25maWc6IFBpY2s8RXh0cmFPcHRpb25zLCAnaW5pdGlhbE5hdmlnYXRpb24nPik6IFByb3ZpZGVyW10ge1xuICByZXR1cm4gW1xuICAgIGNvbmZpZy5pbml0aWFsTmF2aWdhdGlvbiA9PT0gJ2Rpc2FibGVkJyA/IHdpdGhEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uKCkuybVwcm92aWRlcnMgOiBbXSxcbiAgICBjb25maWcuaW5pdGlhbE5hdmlnYXRpb24gPT09ICdlbmFibGVkQmxvY2tpbmcnXG4gICAgICA/IHdpdGhFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbigpLsm1cHJvdmlkZXJzXG4gICAgICA6IFtdLFxuICBdO1xufVxuXG4vLyBUT0RPKGF0c2NvdHQpOiBUaGlzIHNob3VsZCBub3QgYmUgaW4gdGhlIHB1YmxpYyBBUElcbi8qKlxuICogQSBESSB0b2tlbiBmb3IgdGhlIHJvdXRlciBpbml0aWFsaXplciB0aGF0XG4gKiBpcyBjYWxsZWQgYWZ0ZXIgdGhlIGFwcCBpcyBib290c3RyYXBwZWQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY29uc3QgUk9VVEVSX0lOSVRJQUxJWkVSID0gbmV3IEluamVjdGlvblRva2VuPChjb21wUmVmOiBDb21wb25lbnRSZWY8YW55PikgPT4gdm9pZD4oXG4gIHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSA/ICdSb3V0ZXIgSW5pdGlhbGl6ZXInIDogJycsXG4pO1xuXG5mdW5jdGlvbiBwcm92aWRlUm91dGVySW5pdGlhbGl6ZXIoKTogUHJvdmlkZXJbXSB7XG4gIHJldHVybiBbXG4gICAgLy8gUk9VVEVSX0lOSVRJQUxJWkVSIHRva2VuIHNob3VsZCBiZSByZW1vdmVkLiBJdCdzIHB1YmxpYyBBUEkgYnV0IHNob3VsZG4ndCBiZS4gV2UgY2FuIGp1c3RcbiAgICAvLyBoYXZlIGBnZXRCb290c3RyYXBMaXN0ZW5lcmAgZGlyZWN0bHkgYXR0YWNoZWQgdG8gQVBQX0JPT1RTVFJBUF9MSVNURU5FUi5cbiAgICB7cHJvdmlkZTogUk9VVEVSX0lOSVRJQUxJWkVSLCB1c2VGYWN0b3J5OiBnZXRCb290c3RyYXBMaXN0ZW5lcn0sXG4gICAge3Byb3ZpZGU6IEFQUF9CT09UU1RSQVBfTElTVEVORVIsIG11bHRpOiB0cnVlLCB1c2VFeGlzdGluZzogUk9VVEVSX0lOSVRJQUxJWkVSfSxcbiAgXTtcbn1cbiJdfQ==