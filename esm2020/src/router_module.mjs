/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { HashLocationStrategy, Location, LOCATION_INITIALIZED, LocationStrategy, PathLocationStrategy, ViewportScroller } from '@angular/common';
import { ANALYZE_FOR_ENTRY_COMPONENTS, APP_BOOTSTRAP_LISTENER, APP_INITIALIZER, ApplicationRef, ENVIRONMENT_INITIALIZER, inject, Inject, InjectFlags, InjectionToken, Injector, NgModule, NgProbeToken, Optional, SkipSelf, ɵRuntimeError as RuntimeError } from '@angular/core';
import { of, Subject } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { EmptyOutletComponent } from './components/empty_outlet';
import { RouterLink, RouterLinkWithHref } from './directives/router_link';
import { RouterLinkActive } from './directives/router_link_active';
import { RouterOutlet } from './directives/router_outlet';
import { NavigationCancel, NavigationEnd, NavigationError, stringifyEvent } from './events';
import { Router, setupRouter } from './router';
import { ROUTER_CONFIGURATION } from './router_config';
import { RouterConfigLoader, ROUTES } from './router_config_loader';
import { ChildrenOutletContexts } from './router_outlet_context';
import { PreloadingStrategy, RouterPreloader } from './router_preloader';
import { ROUTER_SCROLLER, RouterScroller } from './router_scroller';
import { ActivatedRoute } from './router_state';
import { DefaultUrlSerializer, UrlSerializer } from './url_tree';
import * as i0 from "@angular/core";
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || ngDevMode;
/**
 * The directives defined in the `RouterModule`.
 */
const ROUTER_DIRECTIVES = [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive, EmptyOutletComponent];
/**
 * @docsNotRequired
 */
export const ROUTER_FORROOT_GUARD = new InjectionToken(NG_DEV_MODE ? 'router duplicate forRoot guard' : 'ROUTER_FORROOT_GUARD');
const ROUTER_PRELOADER = new InjectionToken(NG_DEV_MODE ? 'router preloader' : '');
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
];
export function rootRoute(router) {
    return router.routerState.root;
}
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
                NG_DEV_MODE ? (config?.enableTracing ? provideTracing() : []) : [],
                provideRoutes(routes),
                {
                    provide: ROUTER_FORROOT_GUARD,
                    useFactory: provideForRootGuard,
                    deps: [[Router, new Optional(), new SkipSelf()]]
                },
                { provide: ROUTER_CONFIGURATION, useValue: config ? config : {} },
                config?.useHash ? provideHashLocationStrategy() : providePathLocationStrategy(),
                provideRouterScroller(),
                config?.preloadingStrategy ? providePreloading(config.preloadingStrategy) : [],
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
        return { ngModule: RouterModule, providers: [provideRoutes(routes)] };
    }
}
RouterModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.0-next.0+sha-46c44de", ngImport: i0, type: RouterModule, deps: [{ token: ROUTER_FORROOT_GUARD, optional: true }], target: i0.ɵɵFactoryTarget.NgModule });
RouterModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "14.2.0-next.0+sha-46c44de", ngImport: i0, type: RouterModule, imports: [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive, EmptyOutletComponent], exports: [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive, EmptyOutletComponent] });
RouterModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "14.2.0-next.0+sha-46c44de", ngImport: i0, type: RouterModule, imports: [EmptyOutletComponent] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.0-next.0+sha-46c44de", ngImport: i0, type: RouterModule, decorators: [{
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
export function provideRouterScroller() {
    return {
        provide: ROUTER_SCROLLER,
        useFactory: () => {
            const router = inject(Router);
            const viewportScroller = inject(ViewportScroller);
            const config = inject(ROUTER_CONFIGURATION);
            if (config.scrollOffset) {
                viewportScroller.setOffset(config.scrollOffset);
            }
            return new RouterScroller(router, viewportScroller, config);
        },
    };
}
function provideHashLocationStrategy() {
    return { provide: LocationStrategy, useClass: HashLocationStrategy };
}
function providePathLocationStrategy() {
    return { provide: LocationStrategy, useClass: PathLocationStrategy };
}
export function provideForRootGuard(router) {
    if (NG_DEV_MODE && router) {
        throw new RuntimeError(4007 /* RuntimeErrorCode.FOR_ROOT_CALLED_TWICE */, `RouterModule.forRoot() called twice. Lazy loaded modules should use RouterModule.forChild() instead.`);
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
export function getBootstrapListener() {
    const injector = inject(Injector);
    return (bootstrappedComponentRef) => {
        const ref = injector.get(ApplicationRef);
        if (bootstrappedComponentRef !== ref.components[0]) {
            return;
        }
        const router = injector.get(Router);
        const bootstrapDone = injector.get(BOOTSTRAP_DONE);
        // Default case
        if (injector.get(INITIAL_NAVIGATION, null, InjectFlags.Optional) === null) {
            router.initialNavigation();
        }
        injector.get(ROUTER_PRELOADER, null, InjectFlags.Optional)?.setUpPreloading();
        injector.get(ROUTER_SCROLLER, null, InjectFlags.Optional)?.init();
        router.resetRootComponentType(ref.componentTypes[0]);
        bootstrapDone.next();
        bootstrapDone.complete();
    };
}
// TODO(atscott): This should not be in the public API
/**
 * A [DI token](guide/glossary/#di-token) for the router initializer that
 * is called after the app is bootstrapped.
 *
 * @publicApi
 */
export const ROUTER_INITIALIZER = new InjectionToken(NG_DEV_MODE ? 'Router Initializer' : '');
function provideInitialNavigation(config) {
    return [
        config.initialNavigation === 'disabled' ? provideDisabledInitialNavigation() : [],
        config.initialNavigation === 'enabledBlocking' ? provideEnabledBlockingInitialNavigation() : [],
    ];
}
function provideRouterInitializer() {
    return [
        // ROUTER_INITIALIZER token should be removed. It's public API but shouldn't be. We can just
        // have `getBootstrapListener` directly attached to APP_BOOTSTRAP_LISTENER.
        { provide: ROUTER_INITIALIZER, useFactory: getBootstrapListener },
        { provide: APP_BOOTSTRAP_LISTENER, multi: true, useExisting: ROUTER_INITIALIZER },
    ];
}
/**
 * A subject used to indicate that the bootstrapping phase is done. When initial navigation is
 * `enabledBlocking`, the first navigation waits until bootstrapping is finished before continuing
 * to the activation phase.
 */
const BOOTSTRAP_DONE = new InjectionToken(NG_DEV_MODE ? 'bootstrap done indicator' : '', {
    factory: () => {
        return new Subject();
    }
});
function provideEnabledBlockingInitialNavigation() {
    return [
        { provide: INITIAL_NAVIGATION, useValue: 'enabledBlocking' },
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [Injector],
            useFactory: (injector) => {
                const locationInitialized = injector.get(LOCATION_INITIALIZED, Promise.resolve(null));
                let initNavigation = false;
                /**
                 * Performs the given action once the router finishes its next/current navigation.
                 *
                 * If the navigation is canceled or errors without a redirect, the navigation is considered
                 * complete. If the `NavigationEnd` event emits, the navigation is also considered complete.
                 */
                function afterNextNavigation(action) {
                    const router = injector.get(Router);
                    router.events
                        .pipe(filter((e) => e instanceof NavigationEnd || e instanceof NavigationCancel ||
                        e instanceof NavigationError), map(e => {
                        if (e instanceof NavigationEnd) {
                            // Navigation assumed to succeed if we get `ActivationStart`
                            return true;
                        }
                        const redirecting = e instanceof NavigationCancel ?
                            (e.code === 0 /* NavigationCancellationCode.Redirect */ ||
                                e.code === 1 /* NavigationCancellationCode.SupersededByNewNavigation */) :
                            false;
                        return redirecting ? null : false;
                    }), filter((result) => result !== null), take(1))
                        .subscribe(() => {
                        action();
                    });
                }
                return () => {
                    return locationInitialized.then(() => {
                        return new Promise(resolve => {
                            const router = injector.get(Router);
                            const bootstrapDone = injector.get(BOOTSTRAP_DONE);
                            afterNextNavigation(() => {
                                // Unblock APP_INITIALIZER in case the initial navigation was canceled or errored
                                // without a redirect.
                                resolve(true);
                                initNavigation = true;
                            });
                            router.afterPreactivation = () => {
                                // Unblock APP_INITIALIZER once we get to `afterPreactivation`. At this point, we
                                // assume activation will complete successfully (even though this is not
                                // guaranteed).
                                resolve(true);
                                // only the initial navigation should be delayed until bootstrapping is done.
                                if (!initNavigation) {
                                    return bootstrapDone.closed ? of(void 0) : bootstrapDone;
                                    // subsequent navigations should not be delayed
                                }
                                else {
                                    return of(void 0);
                                }
                            };
                            router.initialNavigation();
                        });
                    });
                };
            }
        },
    ];
}
const INITIAL_NAVIGATION = new InjectionToken(NG_DEV_MODE ? 'initial navigation' : '');
function provideDisabledInitialNavigation() {
    return [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useFactory: () => {
                const router = inject(Router);
                return () => {
                    router.setUpLocationChangeListener();
                };
            }
        },
        { provide: INITIAL_NAVIGATION, useValue: 'disabled' }
    ];
}
function provideTracing() {
    if (NG_DEV_MODE) {
        return [{
                provide: ENVIRONMENT_INITIALIZER,
                multi: true,
                useFactory: () => {
                    const router = inject(Router);
                    return () => router.events.subscribe((e) => {
                        // tslint:disable:no-console
                        console.group?.(`Router Event: ${e.constructor.name}`);
                        console.log(stringifyEvent(e));
                        console.log(e);
                        console.groupEnd?.();
                        // tslint:enable:no-console
                    });
                }
            }];
    }
    else {
        return [];
    }
}
export function providePreloading(preloadingStrategy) {
    return [
        RouterPreloader,
        { provide: ROUTER_PRELOADER, useExisting: RouterPreloader },
        { provide: PreloadingStrategy, useExisting: preloadingStrategy },
    ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX21vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDL0ksT0FBTyxFQUFDLDRCQUE0QixFQUFFLHNCQUFzQixFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQWdCLHVCQUF1QixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQXVCLFFBQVEsRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFZLFFBQVEsRUFBUSxhQUFhLElBQUksWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ2xVLE9BQU8sRUFBQyxFQUFFLEVBQUUsT0FBTyxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQ2pDLE9BQU8sRUFBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRWpELE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLDJCQUEyQixDQUFDO0FBQy9ELE9BQU8sRUFBQyxVQUFVLEVBQUUsa0JBQWtCLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUN4RSxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqRSxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFFeEQsT0FBTyxFQUFRLGdCQUFnQixFQUE4QixhQUFhLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU3SCxPQUFPLEVBQUMsTUFBTSxFQUFFLFdBQVcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3QyxPQUFP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ZUFBZSxFQUFDO1FBQ3pELEVBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFdBQVcsRUFBRSxrQkFBa0IsRUFBQztLQUMvRCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0hhc2hMb2NhdGlvblN0cmF0ZWd5LCBMb2NhdGlvbiwgTE9DQVRJT05fSU5JVElBTElaRUQsIExvY2F0aW9uU3RyYXRlZ3ksIFBhdGhMb2NhdGlvblN0cmF0ZWd5LCBWaWV3cG9ydFNjcm9sbGVyfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtBTkFMWVpFX0ZPUl9FTlRSWV9DT01QT05FTlRTLCBBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLCBBUFBfSU5JVElBTElaRVIsIEFwcGxpY2F0aW9uUmVmLCBDb21wb25lbnRSZWYsIEVOVklST05NRU5UX0lOSVRJQUxJWkVSLCBpbmplY3QsIEluamVjdCwgSW5qZWN0RmxhZ3MsIEluamVjdGlvblRva2VuLCBJbmplY3RvciwgTW9kdWxlV2l0aFByb3ZpZGVycywgTmdNb2R1bGUsIE5nUHJvYmVUb2tlbiwgT3B0aW9uYWwsIFByb3ZpZGVyLCBTa2lwU2VsZiwgVHlwZSwgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7b2YsIFN1YmplY3R9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtmaWx0ZXIsIG1hcCwgdGFrZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0VtcHR5T3V0bGV0Q29tcG9uZW50fSBmcm9tICcuL2NvbXBvbmVudHMvZW1wdHlfb3V0bGV0JztcbmltcG9ydCB7Um91dGVyTGluaywgUm91dGVyTGlua1dpdGhIcmVmfSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsnO1xuaW1wb3J0IHtSb3V0ZXJMaW5rQWN0aXZlfSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmtfYWN0aXZlJztcbmltcG9ydCB7Um91dGVyT3V0bGV0fSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX291dGxldCc7XG5pbXBvcnQge1J1bnRpbWVFcnJvckNvZGV9IGZyb20gJy4vZXJyb3JzJztcbmltcG9ydCB7RXZlbnQsIE5hdmlnYXRpb25DYW5jZWwsIE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLCBOYXZpZ2F0aW9uRW5kLCBOYXZpZ2F0aW9uRXJyb3IsIHN0cmluZ2lmeUV2ZW50fSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge1JvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtSb3V0ZXIsIHNldHVwUm91dGVyfSBmcm9tICcuL3JvdXRlcic7XG5pbXBvcnQge0V4dHJhT3B0aW9ucywgUk9VVEVSX0NPTkZJR1VSQVRJT059IGZyb20gJy4vcm91dGVyX2NvbmZpZyc7XG5pbXBvcnQge1JvdXRlckNvbmZpZ0xvYWRlciwgUk9VVEVTfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0c30gZnJvbSAnLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtQcmVsb2FkaW5nU3RyYXRlZ3ksIFJvdXRlclByZWxvYWRlcn0gZnJvbSAnLi9yb3V0ZXJfcHJlbG9hZGVyJztcbmltcG9ydCB7Uk9VVEVSX1NDUk9MTEVSLCBSb3V0ZXJTY3JvbGxlcn0gZnJvbSAnLi9yb3V0ZXJfc2Nyb2xsZXInO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZX0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtEZWZhdWx0VXJsU2VyaWFsaXplciwgVXJsU2VyaWFsaXplcn0gZnJvbSAnLi91cmxfdHJlZSc7XG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlO1xuXG4vKipcbiAqIFRoZSBkaXJlY3RpdmVzIGRlZmluZWQgaW4gdGhlIGBSb3V0ZXJNb2R1bGVgLlxuICovXG5jb25zdCBST1VURVJfRElSRUNUSVZFUyA9XG4gICAgW1JvdXRlck91dGxldCwgUm91dGVyTGluaywgUm91dGVyTGlua1dpdGhIcmVmLCBSb3V0ZXJMaW5rQWN0aXZlLCBFbXB0eU91dGxldENvbXBvbmVudF07XG5cbi8qKlxuICogQGRvY3NOb3RSZXF1aXJlZFxuICovXG5leHBvcnQgY29uc3QgUk9VVEVSX0ZPUlJPT1RfR1VBUkQgPSBuZXcgSW5qZWN0aW9uVG9rZW48dm9pZD4oXG4gICAgTkdfREVWX01PREUgPyAncm91dGVyIGR1cGxpY2F0ZSBmb3JSb290IGd1YXJkJyA6ICdST1VURVJfRk9SUk9PVF9HVUFSRCcpO1xuXG5jb25zdCBST1VURVJfUFJFTE9BREVSID0gbmV3IEluamVjdGlvblRva2VuPFJvdXRlclByZWxvYWRlcj4oTkdfREVWX01PREUgPyAncm91dGVyIHByZWxvYWRlcicgOiAnJyk7XG5cbi8vIFRPRE8oYXRzY290dCk6IEFsbCBvZiB0aGVzZSBleGNlcHQgYEFjdGl2YXRlZFJvdXRlYCBhcmUgYHByb3ZpZGVkSW46ICdyb290J2AuIFRoZXkgYXJlIG9ubHkga2VwdFxuLy8gaGVyZSB0byBhdm9pZCBhIGJyZWFraW5nIGNoYW5nZSB3aGVyZWJ5IHRoZSBwcm92aWRlciBvcmRlciBtYXR0ZXJzIGJhc2VkIG9uIHdoZXJlIHRoZVxuLy8gYFJvdXRlck1vZHVsZWAvYFJvdXRlclRlc3RpbmdNb2R1bGVgIGlzIGltcG9ydGVkLiBUaGVzZSBjYW4vc2hvdWxkIGJlIHJlbW92ZWQgYXMgYSBcImJyZWFraW5nXCJcbi8vIGNoYW5nZSBpbiBhIG1ham9yIHZlcnNpb24uXG5leHBvcnQgY29uc3QgUk9VVEVSX1BST1ZJREVSUzogUHJvdmlkZXJbXSA9IFtcbiAgTG9jYXRpb24sXG4gIHtwcm92aWRlOiBVcmxTZXJpYWxpemVyLCB1c2VDbGFzczogRGVmYXVsdFVybFNlcmlhbGl6ZXJ9LFxuICB7cHJvdmlkZTogUm91dGVyLCB1c2VGYWN0b3J5OiBzZXR1cFJvdXRlcn0sXG4gIENoaWxkcmVuT3V0bGV0Q29udGV4dHMsXG4gIHtwcm92aWRlOiBBY3RpdmF0ZWRSb3V0ZSwgdXNlRmFjdG9yeTogcm9vdFJvdXRlLCBkZXBzOiBbUm91dGVyXX0sXG4gIFJvdXRlckNvbmZpZ0xvYWRlcixcbl07XG5cbmV4cG9ydCBmdW5jdGlvbiByb290Um91dGUocm91dGVyOiBSb3V0ZXIpOiBBY3RpdmF0ZWRSb3V0ZSB7XG4gIHJldHVybiByb3V0ZXIucm91dGVyU3RhdGUucm9vdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJvdXRlck5nUHJvYmVUb2tlbigpIHtcbiAgcmV0dXJuIG5ldyBOZ1Byb2JlVG9rZW4oJ1JvdXRlcicsIFJvdXRlcik7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQWRkcyBkaXJlY3RpdmVzIGFuZCBwcm92aWRlcnMgZm9yIGluLWFwcCBuYXZpZ2F0aW9uIGFtb25nIHZpZXdzIGRlZmluZWQgaW4gYW4gYXBwbGljYXRpb24uXG4gKiBVc2UgdGhlIEFuZ3VsYXIgYFJvdXRlcmAgc2VydmljZSB0byBkZWNsYXJhdGl2ZWx5IHNwZWNpZnkgYXBwbGljYXRpb24gc3RhdGVzIGFuZCBtYW5hZ2Ugc3RhdGVcbiAqIHRyYW5zaXRpb25zLlxuICpcbiAqIFlvdSBjYW4gaW1wb3J0IHRoaXMgTmdNb2R1bGUgbXVsdGlwbGUgdGltZXMsIG9uY2UgZm9yIGVhY2ggbGF6eS1sb2FkZWQgYnVuZGxlLlxuICogSG93ZXZlciwgb25seSBvbmUgYFJvdXRlcmAgc2VydmljZSBjYW4gYmUgYWN0aXZlLlxuICogVG8gZW5zdXJlIHRoaXMsIHRoZXJlIGFyZSB0d28gd2F5cyB0byByZWdpc3RlciByb3V0ZXMgd2hlbiBpbXBvcnRpbmcgdGhpcyBtb2R1bGU6XG4gKlxuICogKiBUaGUgYGZvclJvb3QoKWAgbWV0aG9kIGNyZWF0ZXMgYW4gYE5nTW9kdWxlYCB0aGF0IGNvbnRhaW5zIGFsbCB0aGUgZGlyZWN0aXZlcywgdGhlIGdpdmVuXG4gKiByb3V0ZXMsIGFuZCB0aGUgYFJvdXRlcmAgc2VydmljZSBpdHNlbGYuXG4gKiAqIFRoZSBgZm9yQ2hpbGQoKWAgbWV0aG9kIGNyZWF0ZXMgYW4gYE5nTW9kdWxlYCB0aGF0IGNvbnRhaW5zIGFsbCB0aGUgZGlyZWN0aXZlcyBhbmQgdGhlIGdpdmVuXG4gKiByb3V0ZXMsIGJ1dCBkb2VzIG5vdCBpbmNsdWRlIHRoZSBgUm91dGVyYCBzZXJ2aWNlLlxuICpcbiAqIEBzZWUgW1JvdXRpbmcgYW5kIE5hdmlnYXRpb24gZ3VpZGVdKGd1aWRlL3JvdXRlcikgZm9yIGFuXG4gKiBvdmVydmlldyBvZiBob3cgdGhlIGBSb3V0ZXJgIHNlcnZpY2Ugc2hvdWxkIGJlIHVzZWQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ATmdNb2R1bGUoe1xuICBpbXBvcnRzOiBST1VURVJfRElSRUNUSVZFUyxcbiAgZXhwb3J0czogUk9VVEVSX0RJUkVDVElWRVMsXG59KVxuZXhwb3J0IGNsYXNzIFJvdXRlck1vZHVsZSB7XG4gIGNvbnN0cnVjdG9yKEBPcHRpb25hbCgpIEBJbmplY3QoUk9VVEVSX0ZPUlJPT1RfR1VBUkQpIGd1YXJkOiBhbnkpIHt9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW5kIGNvbmZpZ3VyZXMgYSBtb2R1bGUgd2l0aCBhbGwgdGhlIHJvdXRlciBwcm92aWRlcnMgYW5kIGRpcmVjdGl2ZXMuXG4gICAqIE9wdGlvbmFsbHkgc2V0cyB1cCBhbiBhcHBsaWNhdGlvbiBsaXN0ZW5lciB0byBwZXJmb3JtIGFuIGluaXRpYWwgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogV2hlbiByZWdpc3RlcmluZyB0aGUgTmdNb2R1bGUgYXQgdGhlIHJvb3QsIGltcG9ydCBhcyBmb2xsb3dzOlxuICAgKlxuICAgKiBgYGBcbiAgICogQE5nTW9kdWxlKHtcbiAgICogICBpbXBvcnRzOiBbUm91dGVyTW9kdWxlLmZvclJvb3QoUk9VVEVTKV1cbiAgICogfSlcbiAgICogY2xhc3MgTXlOZ01vZHVsZSB7fVxuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIHJvdXRlcyBBbiBhcnJheSBvZiBgUm91dGVgIG9iamVjdHMgdGhhdCBkZWZpbmUgdGhlIG5hdmlnYXRpb24gcGF0aHMgZm9yIHRoZSBhcHBsaWNhdGlvbi5cbiAgICogQHBhcmFtIGNvbmZpZyBBbiBgRXh0cmFPcHRpb25zYCBjb25maWd1cmF0aW9uIG9iamVjdCB0aGF0IGNvbnRyb2xzIGhvdyBuYXZpZ2F0aW9uIGlzIHBlcmZvcm1lZC5cbiAgICogQHJldHVybiBUaGUgbmV3IGBOZ01vZHVsZWAuXG4gICAqXG4gICAqL1xuICBzdGF0aWMgZm9yUm9vdChyb3V0ZXM6IFJvdXRlcywgY29uZmlnPzogRXh0cmFPcHRpb25zKTogTW9kdWxlV2l0aFByb3ZpZGVyczxSb3V0ZXJNb2R1bGU+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmdNb2R1bGU6IFJvdXRlck1vZHVsZSxcbiAgICAgIHByb3ZpZGVyczogW1xuICAgICAgICBST1VURVJfUFJPVklERVJTLFxuICAgICAgICBOR19ERVZfTU9ERSA/IChjb25maWc/LmVuYWJsZVRyYWNpbmcgPyBwcm92aWRlVHJhY2luZygpIDogW10pIDogW10sXG4gICAgICAgIHByb3ZpZGVSb3V0ZXMocm91dGVzKSxcbiAgICAgICAge1xuICAgICAgICAgIHByb3ZpZGU6IFJPVVRFUl9GT1JST09UX0dVQVJELFxuICAgICAgICAgIHVzZUZhY3Rvcnk6IHByb3ZpZGVGb3JSb290R3VhcmQsXG4gICAgICAgICAgZGVwczogW1tSb3V0ZXIsIG5ldyBPcHRpb25hbCgpLCBuZXcgU2tpcFNlbGYoKV1dXG4gICAgICAgIH0sXG4gICAgICAgIHtwcm92aWRlOiBST1VURVJfQ09ORklHVVJBVElPTiwgdXNlVmFsdWU6IGNvbmZpZyA/IGNvbmZpZyA6IHt9fSxcbiAgICAgICAgY29uZmlnPy51c2VIYXNoID8gcHJvdmlkZUhhc2hMb2NhdGlvblN0cmF0ZWd5KCkgOiBwcm92aWRlUGF0aExvY2F0aW9uU3RyYXRlZ3koKSxcbiAgICAgICAgcHJvdmlkZVJvdXRlclNjcm9sbGVyKCksXG4gICAgICAgIGNvbmZpZz8ucHJlbG9hZGluZ1N0cmF0ZWd5ID8gcHJvdmlkZVByZWxvYWRpbmcoY29uZmlnLnByZWxvYWRpbmdTdHJhdGVneSkgOiBbXSxcbiAgICAgICAge3Byb3ZpZGU6IE5nUHJvYmVUb2tlbiwgbXVsdGk6IHRydWUsIHVzZUZhY3Rvcnk6IHJvdXRlck5nUHJvYmVUb2tlbn0sXG4gICAgICAgIGNvbmZpZz8uaW5pdGlhbE5hdmlnYXRpb24gPyBwcm92aWRlSW5pdGlhbE5hdmlnYXRpb24oY29uZmlnKSA6IFtdLFxuICAgICAgICBwcm92aWRlUm91dGVySW5pdGlhbGl6ZXIoKSxcbiAgICAgIF0sXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbW9kdWxlIHdpdGggYWxsIHRoZSByb3V0ZXIgZGlyZWN0aXZlcyBhbmQgYSBwcm92aWRlciByZWdpc3RlcmluZyByb3V0ZXMsXG4gICAqIHdpdGhvdXQgY3JlYXRpbmcgYSBuZXcgUm91dGVyIHNlcnZpY2UuXG4gICAqIFdoZW4gcmVnaXN0ZXJpbmcgZm9yIHN1Ym1vZHVsZXMgYW5kIGxhenktbG9hZGVkIHN1Ym1vZHVsZXMsIGNyZWF0ZSB0aGUgTmdNb2R1bGUgYXMgZm9sbG93czpcbiAgICpcbiAgICogYGBgXG4gICAqIEBOZ01vZHVsZSh7XG4gICAqICAgaW1wb3J0czogW1JvdXRlck1vZHVsZS5mb3JDaGlsZChST1VURVMpXVxuICAgKiB9KVxuICAgKiBjbGFzcyBNeU5nTW9kdWxlIHt9XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gcm91dGVzIEFuIGFycmF5IG9mIGBSb3V0ZWAgb2JqZWN0cyB0aGF0IGRlZmluZSB0aGUgbmF2aWdhdGlvbiBwYXRocyBmb3IgdGhlIHN1Ym1vZHVsZS5cbiAgICogQHJldHVybiBUaGUgbmV3IE5nTW9kdWxlLlxuICAgKlxuICAgKi9cbiAgc3RhdGljIGZvckNoaWxkKHJvdXRlczogUm91dGVzKTogTW9kdWxlV2l0aFByb3ZpZGVyczxSb3V0ZXJNb2R1bGU+IHtcbiAgICByZXR1cm4ge25nTW9kdWxlOiBSb3V0ZXJNb2R1bGUsIHByb3ZpZGVyczogW3Byb3ZpZGVSb3V0ZXMocm91dGVzKV19O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcm92aWRlUm91dGVyU2Nyb2xsZXIoKTogUHJvdmlkZXIge1xuICByZXR1cm4ge1xuICAgIHByb3ZpZGU6IFJPVVRFUl9TQ1JPTExFUixcbiAgICB1c2VGYWN0b3J5OiAoKSA9PiB7XG4gICAgICBjb25zdCByb3V0ZXIgPSBpbmplY3QoUm91dGVyKTtcbiAgICAgIGNvbnN0IHZpZXdwb3J0U2Nyb2xsZXIgPSBpbmplY3QoVmlld3BvcnRTY3JvbGxlcik7XG4gICAgICBjb25zdCBjb25maWc6IEV4dHJhT3B0aW9ucyA9IGluamVjdChST1VURVJfQ09ORklHVVJBVElPTik7XG4gICAgICBpZiAoY29uZmlnLnNjcm9sbE9mZnNldCkge1xuICAgICAgICB2aWV3cG9ydFNjcm9sbGVyLnNldE9mZnNldChjb25maWcuc2Nyb2xsT2Zmc2V0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgUm91dGVyU2Nyb2xsZXIocm91dGVyLCB2aWV3cG9ydFNjcm9sbGVyLCBjb25maWcpO1xuICAgIH0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIHByb3ZpZGVIYXNoTG9jYXRpb25TdHJhdGVneSgpOiBQcm92aWRlciB7XG4gIHJldHVybiB7cHJvdmlkZTogTG9jYXRpb25TdHJhdGVneSwgdXNlQ2xhc3M6IEhhc2hMb2NhdGlvblN0cmF0ZWd5fTtcbn1cblxuZnVuY3Rpb24gcHJvdmlkZVBhdGhMb2NhdGlvblN0cmF0ZWd5KCk6IFByb3ZpZGVyIHtcbiAgcmV0dXJuIHtwcm92aWRlOiBMb2NhdGlvblN0cmF0ZWd5LCB1c2VDbGFzczogUGF0aExvY2F0aW9uU3RyYXRlZ3l9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZUZvclJvb3RHdWFyZChyb3V0ZXI6IFJvdXRlcik6IGFueSB7XG4gIGlmIChOR19ERVZfTU9ERSAmJiByb3V0ZXIpIHtcbiAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICBSdW50aW1lRXJyb3JDb2RlLkZPUl9ST09UX0NBTExFRF9UV0lDRSxcbiAgICAgICAgYFJvdXRlck1vZHVsZS5mb3JSb290KCkgY2FsbGVkIHR3aWNlLiBMYXp5IGxvYWRlZCBtb2R1bGVzIHNob3VsZCB1c2UgUm91dGVyTW9kdWxlLmZvckNoaWxkKCkgaW5zdGVhZC5gKTtcbiAgfVxuICByZXR1cm4gJ2d1YXJkZWQnO1xufVxuXG4vKipcbiAqIFJlZ2lzdGVycyBhIFtESSBwcm92aWRlcl0oZ3VpZGUvZ2xvc3NhcnkjcHJvdmlkZXIpIGZvciBhIHNldCBvZiByb3V0ZXMuXG4gKiBAcGFyYW0gcm91dGVzIFRoZSByb3V0ZSBjb25maWd1cmF0aW9uIHRvIHByb3ZpZGUuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBgYGBcbiAqIEBOZ01vZHVsZSh7XG4gKiAgIGltcG9ydHM6IFtSb3V0ZXJNb2R1bGUuZm9yQ2hpbGQoUk9VVEVTKV0sXG4gKiAgIHByb3ZpZGVyczogW3Byb3ZpZGVSb3V0ZXMoRVhUUkFfUk9VVEVTKV1cbiAqIH0pXG4gKiBjbGFzcyBNeU5nTW9kdWxlIHt9XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm92aWRlUm91dGVzKHJvdXRlczogUm91dGVzKTogYW55IHtcbiAgcmV0dXJuIFtcbiAgICB7cHJvdmlkZTogQU5BTFlaRV9GT1JfRU5UUllfQ09NUE9ORU5UUywgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiByb3V0ZXN9LFxuICAgIHtwcm92aWRlOiBST1VURVMsIG11bHRpOiB0cnVlLCB1c2VWYWx1ZTogcm91dGVzfSxcbiAgXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEJvb3RzdHJhcExpc3RlbmVyKCkge1xuICBjb25zdCBpbmplY3RvciA9IGluamVjdChJbmplY3Rvcik7XG4gIHJldHVybiAoYm9vdHN0cmFwcGVkQ29tcG9uZW50UmVmOiBDb21wb25lbnRSZWY8dW5rbm93bj4pID0+IHtcbiAgICBjb25zdCByZWYgPSBpbmplY3Rvci5nZXQoQXBwbGljYXRpb25SZWYpO1xuXG4gICAgaWYgKGJvb3RzdHJhcHBlZENvbXBvbmVudFJlZiAhPT0gcmVmLmNvbXBvbmVudHNbMF0pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCByb3V0ZXIgPSBpbmplY3Rvci5nZXQoUm91dGVyKTtcbiAgICBjb25zdCBib290c3RyYXBEb25lID0gaW5qZWN0b3IuZ2V0KEJPT1RTVFJBUF9ET05FKTtcblxuICAgIC8vIERlZmF1bHQgY2FzZVxuICAgIGlmIChpbmplY3Rvci5nZXQoSU5JVElBTF9OQVZJR0FUSU9OLCBudWxsLCBJbmplY3RGbGFncy5PcHRpb25hbCkgPT09IG51bGwpIHtcbiAgICAgIHJvdXRlci5pbml0aWFsTmF2aWdhdGlvbigpO1xuICAgIH1cblxuICAgIGluamVjdG9yLmdldChST1VURVJfUFJFTE9BREVSLCBudWxsLCBJbmplY3RGbGFncy5PcHRpb25hbCk/LnNldFVwUHJlbG9hZGluZygpO1xuICAgIGluamVjdG9yLmdldChST1VURVJfU0NST0xMRVIsIG51bGwsIEluamVjdEZsYWdzLk9wdGlvbmFsKT8uaW5pdCgpO1xuICAgIHJvdXRlci5yZXNldFJvb3RDb21wb25lbnRUeXBlKHJlZi5jb21wb25lbnRUeXBlc1swXSk7XG4gICAgYm9vdHN0cmFwRG9uZS5uZXh0KCk7XG4gICAgYm9vdHN0cmFwRG9uZS5jb21wbGV0ZSgpO1xuICB9O1xufVxuXG4vLyBUT0RPKGF0c2NvdHQpOiBUaGlzIHNob3VsZCBub3QgYmUgaW4gdGhlIHB1YmxpYyBBUElcbi8qKlxuICogQSBbREkgdG9rZW5dKGd1aWRlL2dsb3NzYXJ5LyNkaS10b2tlbikgZm9yIHRoZSByb3V0ZXIgaW5pdGlhbGl6ZXIgdGhhdFxuICogaXMgY2FsbGVkIGFmdGVyIHRoZSBhcHAgaXMgYm9vdHN0cmFwcGVkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9JTklUSUFMSVpFUiA9IG5ldyBJbmplY3Rpb25Ub2tlbjwoY29tcFJlZjogQ29tcG9uZW50UmVmPGFueT4pID0+IHZvaWQ+KFxuICAgIE5HX0RFVl9NT0RFID8gJ1JvdXRlciBJbml0aWFsaXplcicgOiAnJyk7XG5cbmZ1bmN0aW9uIHByb3ZpZGVJbml0aWFsTmF2aWdhdGlvbihjb25maWc6IFBpY2s8RXh0cmFPcHRpb25zLCAnaW5pdGlhbE5hdmlnYXRpb24nPik6IFByb3ZpZGVyW10ge1xuICByZXR1cm4gW1xuICAgIGNvbmZpZy5pbml0aWFsTmF2aWdhdGlvbiA9PT0gJ2Rpc2FibGVkJyA/IHByb3ZpZGVEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uKCkgOiBbXSxcbiAgICBjb25maWcuaW5pdGlhbE5hdmlnYXRpb24gPT09ICdlbmFibGVkQmxvY2tpbmcnID8gcHJvdmlkZUVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uKCkgOiBbXSxcbiAgXTtcbn1cblxuZnVuY3Rpb24gcHJvdmlkZVJvdXRlckluaXRpYWxpemVyKCk6IFJlYWRvbmx5QXJyYXk8UHJvdmlkZXI+IHtcbiAgcmV0dXJuIFtcbiAgICAvLyBST1VURVJfSU5JVElBTElaRVIgdG9rZW4gc2hvdWxkIGJlIHJlbW92ZWQuIEl0J3MgcHVibGljIEFQSSBidXQgc2hvdWxkbid0IGJlLiBXZSBjYW4ganVzdFxuICAgIC8vIGhhdmUgYGdldEJvb3RzdHJhcExpc3RlbmVyYCBkaXJlY3RseSBhdHRhY2hlZCB0byBBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLlxuICAgIHtwcm92aWRlOiBST1VURVJfSU5JVElBTElaRVIsIHVzZUZhY3Rvcnk6IGdldEJvb3RzdHJhcExpc3RlbmVyfSxcbiAgICB7cHJvdmlkZTogQVBQX0JPT1RTVFJBUF9MSVNURU5FUiwgbXVsdGk6IHRydWUsIHVzZUV4aXN0aW5nOiBST1VURVJfSU5JVElBTElaRVJ9LFxuICBdO1xufVxuXG4vKipcbiAqIEEgc3ViamVjdCB1c2VkIHRvIGluZGljYXRlIHRoYXQgdGhlIGJvb3RzdHJhcHBpbmcgcGhhc2UgaXMgZG9uZS4gV2hlbiBpbml0aWFsIG5hdmlnYXRpb24gaXNcbiAqIGBlbmFibGVkQmxvY2tpbmdgLCB0aGUgZmlyc3QgbmF2aWdhdGlvbiB3YWl0cyB1bnRpbCBib290c3RyYXBwaW5nIGlzIGZpbmlzaGVkIGJlZm9yZSBjb250aW51aW5nXG4gKiB0byB0aGUgYWN0aXZhdGlvbiBwaGFzZS5cbiAqL1xuY29uc3QgQk9PVFNUUkFQX0RPTkUgPVxuICAgIG5ldyBJbmplY3Rpb25Ub2tlbjxTdWJqZWN0PHZvaWQ+PihOR19ERVZfTU9ERSA/ICdib290c3RyYXAgZG9uZSBpbmRpY2F0b3InIDogJycsIHtcbiAgICAgIGZhY3Rvcnk6ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG4gICAgICB9XG4gICAgfSk7XG5cbmZ1bmN0aW9uIHByb3ZpZGVFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbigpOiBQcm92aWRlciB7XG4gIHJldHVybiBbXG4gICAge3Byb3ZpZGU6IElOSVRJQUxfTkFWSUdBVElPTiwgdXNlVmFsdWU6ICdlbmFibGVkQmxvY2tpbmcnfSxcbiAgICB7XG4gICAgICBwcm92aWRlOiBBUFBfSU5JVElBTElaRVIsXG4gICAgICBtdWx0aTogdHJ1ZSxcbiAgICAgIGRlcHM6IFtJbmplY3Rvcl0sXG4gICAgICB1c2VGYWN0b3J5OiAoaW5qZWN0b3I6IEluamVjdG9yKSA9PiB7XG4gICAgICAgIGNvbnN0IGxvY2F0aW9uSW5pdGlhbGl6ZWQ6IFByb21pc2U8YW55PiA9XG4gICAgICAgICAgICBpbmplY3Rvci5nZXQoTE9DQVRJT05fSU5JVElBTElaRUQsIFByb21pc2UucmVzb2x2ZShudWxsKSk7XG4gICAgICAgIGxldCBpbml0TmF2aWdhdGlvbiA9IGZhbHNlO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQZXJmb3JtcyB0aGUgZ2l2ZW4gYWN0aW9uIG9uY2UgdGhlIHJvdXRlciBmaW5pc2hlcyBpdHMgbmV4dC9jdXJyZW50IG5hdmlnYXRpb24uXG4gICAgICAgICAqXG4gICAgICAgICAqIElmIHRoZSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGVkIG9yIGVycm9ycyB3aXRob3V0IGEgcmVkaXJlY3QsIHRoZSBuYXZpZ2F0aW9uIGlzIGNvbnNpZGVyZWRcbiAgICAgICAgICogY29tcGxldGUuIElmIHRoZSBgTmF2aWdhdGlvbkVuZGAgZXZlbnQgZW1pdHMsIHRoZSBuYXZpZ2F0aW9uIGlzIGFsc28gY29uc2lkZXJlZCBjb21wbGV0ZS5cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGFmdGVyTmV4dE5hdmlnYXRpb24oYWN0aW9uOiAoKSA9PiB2b2lkKSB7XG4gICAgICAgICAgY29uc3Qgcm91dGVyID0gaW5qZWN0b3IuZ2V0KFJvdXRlcik7XG4gICAgICAgICAgcm91dGVyLmV2ZW50c1xuICAgICAgICAgICAgICAucGlwZShcbiAgICAgICAgICAgICAgICAgIGZpbHRlcihcbiAgICAgICAgICAgICAgICAgICAgICAoZSk6IGUgaXMgTmF2aWdhdGlvbkVuZHxOYXZpZ2F0aW9uQ2FuY2VsfE5hdmlnYXRpb25FcnJvciA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCB8fCBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkNhbmNlbCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVycm9yKSxcbiAgICAgICAgICAgICAgICAgIG1hcChlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gTmF2aWdhdGlvbiBhc3N1bWVkIHRvIHN1Y2NlZWQgaWYgd2UgZ2V0IGBBY3RpdmF0aW9uU3RhcnRgXG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVkaXJlY3RpbmcgPSBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkNhbmNlbCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAoZS5jb2RlID09PSBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZS5SZWRpcmVjdCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgIGUuY29kZSA9PT0gTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuU3VwZXJzZWRlZEJ5TmV3TmF2aWdhdGlvbikgOlxuICAgICAgICAgICAgICAgICAgICAgICAgZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWRpcmVjdGluZyA/IG51bGwgOiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgZmlsdGVyKChyZXN1bHQpOiByZXN1bHQgaXMgYm9vbGVhbiA9PiByZXN1bHQgIT09IG51bGwpLFxuICAgICAgICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgYWN0aW9uKCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICByZXR1cm4gbG9jYXRpb25Jbml0aWFsaXplZC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgICAgY29uc3Qgcm91dGVyID0gaW5qZWN0b3IuZ2V0KFJvdXRlcik7XG4gICAgICAgICAgICAgIGNvbnN0IGJvb3RzdHJhcERvbmUgPSBpbmplY3Rvci5nZXQoQk9PVFNUUkFQX0RPTkUpO1xuICAgICAgICAgICAgICBhZnRlck5leHROYXZpZ2F0aW9uKCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBVbmJsb2NrIEFQUF9JTklUSUFMSVpFUiBpbiBjYXNlIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gd2FzIGNhbmNlbGVkIG9yIGVycm9yZWRcbiAgICAgICAgICAgICAgICAvLyB3aXRob3V0IGEgcmVkaXJlY3QuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICBpbml0TmF2aWdhdGlvbiA9IHRydWU7XG4gICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgIHJvdXRlci5hZnRlclByZWFjdGl2YXRpb24gPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVW5ibG9jayBBUFBfSU5JVElBTElaRVIgb25jZSB3ZSBnZXQgdG8gYGFmdGVyUHJlYWN0aXZhdGlvbmAuIEF0IHRoaXMgcG9pbnQsIHdlXG4gICAgICAgICAgICAgICAgLy8gYXNzdW1lIGFjdGl2YXRpb24gd2lsbCBjb21wbGV0ZSBzdWNjZXNzZnVsbHkgKGV2ZW4gdGhvdWdoIHRoaXMgaXMgbm90XG4gICAgICAgICAgICAgICAgLy8gZ3VhcmFudGVlZCkuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAvLyBvbmx5IHRoZSBpbml0aWFsIG5hdmlnYXRpb24gc2hvdWxkIGJlIGRlbGF5ZWQgdW50aWwgYm9vdHN0cmFwcGluZyBpcyBkb25lLlxuICAgICAgICAgICAgICAgIGlmICghaW5pdE5hdmlnYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBib290c3RyYXBEb25lLmNsb3NlZCA/IG9mKHZvaWQgMCkgOiBib290c3RyYXBEb25lO1xuICAgICAgICAgICAgICAgICAgLy8gc3Vic2VxdWVudCBuYXZpZ2F0aW9ucyBzaG91bGQgbm90IGJlIGRlbGF5ZWRcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHZvaWQgMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICByb3V0ZXIuaW5pdGlhbE5hdmlnYXRpb24oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0sXG4gIF07XG59XG5cbmNvbnN0IElOSVRJQUxfTkFWSUdBVElPTiA9XG4gICAgbmV3IEluamVjdGlvblRva2VuPCdkaXNhYmxlZCd8J2VuYWJsZWRCbG9ja2luZyc+KE5HX0RFVl9NT0RFID8gJ2luaXRpYWwgbmF2aWdhdGlvbicgOiAnJyk7XG5cbmZ1bmN0aW9uIHByb3ZpZGVEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uKCk6IFByb3ZpZGVyW10ge1xuICByZXR1cm4gW1xuICAgIHtcbiAgICAgIHByb3ZpZGU6IEFQUF9JTklUSUFMSVpFUixcbiAgICAgIG11bHRpOiB0cnVlLFxuICAgICAgdXNlRmFjdG9yeTogKCkgPT4ge1xuICAgICAgICBjb25zdCByb3V0ZXIgPSBpbmplY3QoUm91dGVyKTtcbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICByb3V0ZXIuc2V0VXBMb2NhdGlvbkNoYW5nZUxpc3RlbmVyKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSxcbiAgICB7cHJvdmlkZTogSU5JVElBTF9OQVZJR0FUSU9OLCB1c2VWYWx1ZTogJ2Rpc2FibGVkJ31cbiAgXTtcbn1cblxuZnVuY3Rpb24gcHJvdmlkZVRyYWNpbmcoKTogUHJvdmlkZXJbXSB7XG4gIGlmIChOR19ERVZfTU9ERSkge1xuICAgIHJldHVybiBbe1xuICAgICAgcHJvdmlkZTogRU5WSVJPTk1FTlRfSU5JVElBTElaRVIsXG4gICAgICBtdWx0aTogdHJ1ZSxcbiAgICAgIHVzZUZhY3Rvcnk6ICgpID0+IHtcbiAgICAgICAgY29uc3Qgcm91dGVyID0gaW5qZWN0KFJvdXRlcik7XG4gICAgICAgIHJldHVybiAoKSA9PiByb3V0ZXIuZXZlbnRzLnN1YnNjcmliZSgoZTogRXZlbnQpID0+IHtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5ncm91cD8uKGBSb3V0ZXIgRXZlbnQ6ICR7KDxhbnk+ZS5jb25zdHJ1Y3RvcikubmFtZX1gKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhzdHJpbmdpZnlFdmVudChlKSk7XG4gICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgY29uc29sZS5ncm91cEVuZD8uKCk7XG4gICAgICAgICAgLy8gdHNsaW50OmVuYWJsZTpuby1jb25zb2xlXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1dO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBbXTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZVByZWxvYWRpbmcocHJlbG9hZGluZ1N0cmF0ZWd5OiBUeXBlPFByZWxvYWRpbmdTdHJhdGVneT4pOiBQcm92aWRlcltdIHtcbiAgcmV0dXJuIFtcbiAgICBSb3V0ZXJQcmVsb2FkZXIsXG4gICAge3Byb3ZpZGU6IFJPVVRFUl9QUkVMT0FERVIsIHVzZUV4aXN0aW5nOiBSb3V0ZXJQcmVsb2FkZXJ9LFxuICAgIHtwcm92aWRlOiBQcmVsb2FkaW5nU3RyYXRlZ3ksIHVzZUV4aXN0aW5nOiBwcmVsb2FkaW5nU3RyYXRlZ3l9LFxuICBdO1xufVxuIl19