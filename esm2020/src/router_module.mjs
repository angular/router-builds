/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { HashLocationStrategy, Location, LOCATION_INITIALIZED, LocationStrategy, PathLocationStrategy, ViewportScroller } from '@angular/common';
import { ANALYZE_FOR_ENTRY_COMPONENTS, APP_BOOTSTRAP_LISTENER, APP_INITIALIZER, ApplicationRef, Compiler, ENVIRONMENT_INITIALIZER, Inject, inject, InjectFlags, InjectionToken, Injector, NgModule, NgProbeToken, Optional, SkipSelf, ɵRuntimeError as RuntimeError } from '@angular/core';
import { of, Subject } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { EmptyOutletComponent } from './components/empty_outlet';
import { RouterLink, RouterLinkWithHref } from './directives/router_link';
import { RouterLinkActive } from './directives/router_link_active';
import { RouterOutlet } from './directives/router_outlet';
import { NavigationCancel, NavigationEnd, NavigationError, stringifyEvent } from './events';
import { TitleStrategy } from './page_title_strategy';
import { RouteReuseStrategy } from './route_reuse_strategy';
import { Router } from './router';
import { RouterConfigLoader, ROUTES } from './router_config_loader';
import { ChildrenOutletContexts } from './router_outlet_context';
import { PreloadingStrategy, RouterPreloader } from './router_preloader';
import { ROUTER_SCROLLER, RouterScroller } from './router_scroller';
import { ActivatedRoute } from './router_state';
import { UrlHandlingStrategy } from './url_handling_strategy';
import { DefaultUrlSerializer, UrlSerializer } from './url_tree';
import { flatten } from './utils/collection';
import * as i0 from "@angular/core";
import * as i1 from "./router";
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || ngDevMode;
/**
 * The directives defined in the `RouterModule`.
 */
const ROUTER_DIRECTIVES = [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive, EmptyOutletComponent];
/**
 * A [DI token](guide/glossary/#di-token) for the router service.
 *
 * @publicApi
 */
export const ROUTER_CONFIGURATION = new InjectionToken(NG_DEV_MODE ? 'router config' : 'ROUTER_CONFIGURATION', {
    providedIn: 'root',
    factory: () => ({}),
});
/**
 * @docsNotRequired
 */
export const ROUTER_FORROOT_GUARD = new InjectionToken(NG_DEV_MODE ? 'router duplicate forRoot guard' : 'ROUTER_FORROOT_GUARD');
const ROUTER_PRELOADER = new InjectionToken(NG_DEV_MODE ? 'router preloader' : '');
export const ROUTER_PROVIDERS = [
    Location,
    { provide: UrlSerializer, useClass: DefaultUrlSerializer },
    {
        provide: Router,
        useFactory: setupRouter,
        deps: [
            UrlSerializer, ChildrenOutletContexts, Location, Injector, Compiler, ROUTES, TitleStrategy,
            ROUTER_CONFIGURATION, [UrlHandlingStrategy, new Optional()],
            [RouteReuseStrategy, new Optional()]
        ]
    },
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
RouterModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.0-next.0+sha-65fd757", ngImport: i0, type: RouterModule, deps: [{ token: ROUTER_FORROOT_GUARD, optional: true }, { token: i1.Router, optional: true }], target: i0.ɵɵFactoryTarget.NgModule });
RouterModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "14.2.0-next.0+sha-65fd757", ngImport: i0, type: RouterModule, imports: [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive, EmptyOutletComponent], exports: [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive, EmptyOutletComponent] });
RouterModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "14.2.0-next.0+sha-65fd757", ngImport: i0, type: RouterModule, imports: [EmptyOutletComponent] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.0-next.0+sha-65fd757", ngImport: i0, type: RouterModule, decorators: [{
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
                }] }, { type: i1.Router, decorators: [{
                    type: Optional
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
export function setupRouter(urlSerializer, contexts, location, injector, compiler, config, titleStrategy, opts = {}, urlHandlingStrategy, routeReuseStrategy) {
    const router = new Router(null, urlSerializer, contexts, location, injector, compiler, flatten(config));
    if (urlHandlingStrategy) {
        router.urlHandlingStrategy = urlHandlingStrategy;
    }
    if (routeReuseStrategy) {
        router.routeReuseStrategy = routeReuseStrategy;
    }
    router.titleStrategy = titleStrategy;
    assignExtraOptionsToRouter(opts, router);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX21vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDL0ksT0FBTyxFQUFDLDRCQUE0QixFQUFFLHNCQUFzQixFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFnQix1QkFBdUIsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUF1QixRQUFRLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBWSxRQUFRLEVBQVEsYUFBYSxJQUFJLFlBQVksRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUM1VSxPQUFPLEVBQUMsRUFBRSxFQUFFLE9BQU8sRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUNqQyxPQUFPLEVBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUVqRCxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUMvRCxPQUFPLEVBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFDLE1BQU0sMEJBQTBCLENBQUM7QUFDeEUsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0saUNBQWlDLENBQUM7QUFDakUsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLDRCQUE0QixDQUFDO0FBRXhELE9BQU8sRUFBUSxnQkFBZ0IsRUFBOEIsYUFBYSxFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFFN0gsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQ3BELE9B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bnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtIYXNoTG9jYXRpb25TdHJhdGVneSwgTG9jYXRpb24sIExPQ0FUSU9OX0lOSVRJQUxJWkVELCBMb2NhdGlvblN0cmF0ZWd5LCBQYXRoTG9jYXRpb25TdHJhdGVneSwgVmlld3BvcnRTY3JvbGxlcn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7QU5BTFlaRV9GT1JfRU5UUllfQ09NUE9ORU5UUywgQVBQX0JPT1RTVFJBUF9MSVNURU5FUiwgQVBQX0lOSVRJQUxJWkVSLCBBcHBsaWNhdGlvblJlZiwgQ29tcGlsZXIsIENvbXBvbmVudFJlZiwgRU5WSVJPTk1FTlRfSU5JVElBTElaRVIsIEluamVjdCwgaW5qZWN0LCBJbmplY3RGbGFncywgSW5qZWN0aW9uVG9rZW4sIEluamVjdG9yLCBNb2R1bGVXaXRoUHJvdmlkZXJzLCBOZ01vZHVsZSwgTmdQcm9iZVRva2VuLCBPcHRpb25hbCwgUHJvdmlkZXIsIFNraXBTZWxmLCBUeXBlLCDJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtvZiwgU3ViamVjdH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2ZpbHRlciwgbWFwLCB0YWtlfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7RW1wdHlPdXRsZXRDb21wb25lbnR9IGZyb20gJy4vY29tcG9uZW50cy9lbXB0eV9vdXRsZXQnO1xuaW1wb3J0IHtSb3V0ZXJMaW5rLCBSb3V0ZXJMaW5rV2l0aEhyZWZ9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfbGluayc7XG5pbXBvcnQge1JvdXRlckxpbmtBY3RpdmV9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfbGlua19hY3RpdmUnO1xuaW1wb3J0IHtSb3V0ZXJPdXRsZXR9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0JztcbmltcG9ydCB7UnVudGltZUVycm9yQ29kZX0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IHtFdmVudCwgTmF2aWdhdGlvbkNhbmNlbCwgTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUsIE5hdmlnYXRpb25FbmQsIE5hdmlnYXRpb25FcnJvciwgc3RyaW5naWZ5RXZlbnR9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7Um91dGUsIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtUaXRsZVN0cmF0ZWd5fSBmcm9tICcuL3BhZ2VfdGl0bGVfc3RyYXRlZ3knO1xuaW1wb3J0IHtSb3V0ZVJldXNlU3RyYXRlZ3l9IGZyb20gJy4vcm91dGVfcmV1c2Vfc3RyYXRlZ3knO1xuaW1wb3J0IHtFcnJvckhhbmRsZXIsIFJvdXRlcn0gZnJvbSAnLi9yb3V0ZXInO1xuaW1wb3J0IHtSb3V0ZXJDb25maWdMb2FkZXIsIFJPVVRFU30gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge0NoaWxkcmVuT3V0bGV0Q29udGV4dHN9IGZyb20gJy4vcm91dGVyX291dGxldF9jb250ZXh0JztcbmltcG9ydCB7UHJlbG9hZGluZ1N0cmF0ZWd5LCBSb3V0ZXJQcmVsb2FkZXJ9IGZyb20gJy4vcm91dGVyX3ByZWxvYWRlcic7XG5pbXBvcnQge1JPVVRFUl9TQ1JPTExFUiwgUm91dGVyU2Nyb2xsZXJ9IGZyb20gJy4vcm91dGVyX3Njcm9sbGVyJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGV9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7VXJsSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi91cmxfaGFuZGxpbmdfc3RyYXRlZ3knO1xuaW1wb3J0IHtEZWZhdWx0VXJsU2VyaWFsaXplciwgVXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge2ZsYXR0ZW59IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlO1xuXG4vKipcbiAqIFRoZSBkaXJlY3RpdmVzIGRlZmluZWQgaW4gdGhlIGBSb3V0ZXJNb2R1bGVgLlxuICovXG5jb25zdCBST1VURVJfRElSRUNUSVZFUyA9XG4gICAgW1JvdXRlck91dGxldCwgUm91dGVyTGluaywgUm91dGVyTGlua1dpdGhIcmVmLCBSb3V0ZXJMaW5rQWN0aXZlLCBFbXB0eU91dGxldENvbXBvbmVudF07XG5cbi8qKlxuICogQSBbREkgdG9rZW5dKGd1aWRlL2dsb3NzYXJ5LyNkaS10b2tlbikgZm9yIHRoZSByb3V0ZXIgc2VydmljZS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjb25zdCBST1VURVJfQ09ORklHVVJBVElPTiA9XG4gICAgbmV3IEluamVjdGlvblRva2VuPEV4dHJhT3B0aW9ucz4oTkdfREVWX01PREUgPyAncm91dGVyIGNvbmZpZycgOiAnUk9VVEVSX0NPTkZJR1VSQVRJT04nLCB7XG4gICAgICBwcm92aWRlZEluOiAncm9vdCcsXG4gICAgICBmYWN0b3J5OiAoKSA9PiAoe30pLFxuICAgIH0pO1xuXG4vKipcbiAqIEBkb2NzTm90UmVxdWlyZWRcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9GT1JST09UX0dVQVJEID0gbmV3IEluamVjdGlvblRva2VuPHZvaWQ+KFxuICAgIE5HX0RFVl9NT0RFID8gJ3JvdXRlciBkdXBsaWNhdGUgZm9yUm9vdCBndWFyZCcgOiAnUk9VVEVSX0ZPUlJPT1RfR1VBUkQnKTtcblxuY29uc3QgUk9VVEVSX1BSRUxPQURFUiA9IG5ldyBJbmplY3Rpb25Ub2tlbjxSb3V0ZXJQcmVsb2FkZXI+KE5HX0RFVl9NT0RFID8gJ3JvdXRlciBwcmVsb2FkZXInIDogJycpO1xuXG5leHBvcnQgY29uc3QgUk9VVEVSX1BST1ZJREVSUzogUHJvdmlkZXJbXSA9IFtcbiAgTG9jYXRpb24sXG4gIHtwcm92aWRlOiBVcmxTZXJpYWxpemVyLCB1c2VDbGFzczogRGVmYXVsdFVybFNlcmlhbGl6ZXJ9LFxuICB7XG4gICAgcHJvdmlkZTogUm91dGVyLFxuICAgIHVzZUZhY3Rvcnk6IHNldHVwUm91dGVyLFxuICAgIGRlcHM6IFtcbiAgICAgIFVybFNlcmlhbGl6ZXIsIENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIExvY2F0aW9uLCBJbmplY3RvciwgQ29tcGlsZXIsIFJPVVRFUywgVGl0bGVTdHJhdGVneSxcbiAgICAgIFJPVVRFUl9DT05GSUdVUkFUSU9OLCBbVXJsSGFuZGxpbmdTdHJhdGVneSwgbmV3IE9wdGlvbmFsKCldLFxuICAgICAgW1JvdXRlUmV1c2VTdHJhdGVneSwgbmV3IE9wdGlvbmFsKCldXG4gICAgXVxuICB9LFxuICBDaGlsZHJlbk91dGxldENvbnRleHRzLFxuICB7cHJvdmlkZTogQWN0aXZhdGVkUm91dGUsIHVzZUZhY3Rvcnk6IHJvb3RSb3V0ZSwgZGVwczogW1JvdXRlcl19LFxuICBSb3V0ZXJDb25maWdMb2FkZXIsXG5dO1xuXG5leHBvcnQgZnVuY3Rpb24gcm9vdFJvdXRlKHJvdXRlcjogUm91dGVyKTogQWN0aXZhdGVkUm91dGUge1xuICByZXR1cm4gcm91dGVyLnJvdXRlclN0YXRlLnJvb3Q7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByb3V0ZXJOZ1Byb2JlVG9rZW4oKSB7XG4gIHJldHVybiBuZXcgTmdQcm9iZVRva2VuKCdSb3V0ZXInLCBSb3V0ZXIpO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEFkZHMgZGlyZWN0aXZlcyBhbmQgcHJvdmlkZXJzIGZvciBpbi1hcHAgbmF2aWdhdGlvbiBhbW9uZyB2aWV3cyBkZWZpbmVkIGluIGFuIGFwcGxpY2F0aW9uLlxuICogVXNlIHRoZSBBbmd1bGFyIGBSb3V0ZXJgIHNlcnZpY2UgdG8gZGVjbGFyYXRpdmVseSBzcGVjaWZ5IGFwcGxpY2F0aW9uIHN0YXRlcyBhbmQgbWFuYWdlIHN0YXRlXG4gKiB0cmFuc2l0aW9ucy5cbiAqXG4gKiBZb3UgY2FuIGltcG9ydCB0aGlzIE5nTW9kdWxlIG11bHRpcGxlIHRpbWVzLCBvbmNlIGZvciBlYWNoIGxhenktbG9hZGVkIGJ1bmRsZS5cbiAqIEhvd2V2ZXIsIG9ubHkgb25lIGBSb3V0ZXJgIHNlcnZpY2UgY2FuIGJlIGFjdGl2ZS5cbiAqIFRvIGVuc3VyZSB0aGlzLCB0aGVyZSBhcmUgdHdvIHdheXMgdG8gcmVnaXN0ZXIgcm91dGVzIHdoZW4gaW1wb3J0aW5nIHRoaXMgbW9kdWxlOlxuICpcbiAqICogVGhlIGBmb3JSb290KClgIG1ldGhvZCBjcmVhdGVzIGFuIGBOZ01vZHVsZWAgdGhhdCBjb250YWlucyBhbGwgdGhlIGRpcmVjdGl2ZXMsIHRoZSBnaXZlblxuICogcm91dGVzLCBhbmQgdGhlIGBSb3V0ZXJgIHNlcnZpY2UgaXRzZWxmLlxuICogKiBUaGUgYGZvckNoaWxkKClgIG1ldGhvZCBjcmVhdGVzIGFuIGBOZ01vZHVsZWAgdGhhdCBjb250YWlucyBhbGwgdGhlIGRpcmVjdGl2ZXMgYW5kIHRoZSBnaXZlblxuICogcm91dGVzLCBidXQgZG9lcyBub3QgaW5jbHVkZSB0aGUgYFJvdXRlcmAgc2VydmljZS5cbiAqXG4gKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uIGd1aWRlXShndWlkZS9yb3V0ZXIpIGZvciBhblxuICogb3ZlcnZpZXcgb2YgaG93IHRoZSBgUm91dGVyYCBzZXJ2aWNlIHNob3VsZCBiZSB1c2VkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQE5nTW9kdWxlKHtcbiAgaW1wb3J0czogUk9VVEVSX0RJUkVDVElWRVMsXG4gIGV4cG9ydHM6IFJPVVRFUl9ESVJFQ1RJVkVTLFxufSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJNb2R1bGUge1xuICAvLyBOb3RlOiBXZSBhcmUgaW5qZWN0aW5nIHRoZSBSb3V0ZXIgc28gaXQgZ2V0cyBjcmVhdGVkIGVhZ2VybHkuLi5cbiAgY29uc3RydWN0b3IoQE9wdGlvbmFsKCkgQEluamVjdChST1VURVJfRk9SUk9PVF9HVUFSRCkgZ3VhcmQ6IGFueSwgQE9wdGlvbmFsKCkgcm91dGVyOiBSb3V0ZXIpIHt9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW5kIGNvbmZpZ3VyZXMgYSBtb2R1bGUgd2l0aCBhbGwgdGhlIHJvdXRlciBwcm92aWRlcnMgYW5kIGRpcmVjdGl2ZXMuXG4gICAqIE9wdGlvbmFsbHkgc2V0cyB1cCBhbiBhcHBsaWNhdGlvbiBsaXN0ZW5lciB0byBwZXJmb3JtIGFuIGluaXRpYWwgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogV2hlbiByZWdpc3RlcmluZyB0aGUgTmdNb2R1bGUgYXQgdGhlIHJvb3QsIGltcG9ydCBhcyBmb2xsb3dzOlxuICAgKlxuICAgKiBgYGBcbiAgICogQE5nTW9kdWxlKHtcbiAgICogICBpbXBvcnRzOiBbUm91dGVyTW9kdWxlLmZvclJvb3QoUk9VVEVTKV1cbiAgICogfSlcbiAgICogY2xhc3MgTXlOZ01vZHVsZSB7fVxuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIHJvdXRlcyBBbiBhcnJheSBvZiBgUm91dGVgIG9iamVjdHMgdGhhdCBkZWZpbmUgdGhlIG5hdmlnYXRpb24gcGF0aHMgZm9yIHRoZSBhcHBsaWNhdGlvbi5cbiAgICogQHBhcmFtIGNvbmZpZyBBbiBgRXh0cmFPcHRpb25zYCBjb25maWd1cmF0aW9uIG9iamVjdCB0aGF0IGNvbnRyb2xzIGhvdyBuYXZpZ2F0aW9uIGlzIHBlcmZvcm1lZC5cbiAgICogQHJldHVybiBUaGUgbmV3IGBOZ01vZHVsZWAuXG4gICAqXG4gICAqL1xuICBzdGF0aWMgZm9yUm9vdChyb3V0ZXM6IFJvdXRlcywgY29uZmlnPzogRXh0cmFPcHRpb25zKTogTW9kdWxlV2l0aFByb3ZpZGVyczxSb3V0ZXJNb2R1bGU+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmdNb2R1bGU6IFJvdXRlck1vZHVsZSxcbiAgICAgIHByb3ZpZGVyczogW1xuICAgICAgICBST1VURVJfUFJPVklERVJTLFxuICAgICAgICBOR19ERVZfTU9ERSA/IChjb25maWc/LmVuYWJsZVRyYWNpbmcgPyBwcm92aWRlVHJhY2luZygpIDogW10pIDogW10sXG4gICAgICAgIHByb3ZpZGVSb3V0ZXMocm91dGVzKSxcbiAgICAgICAge1xuICAgICAgICAgIHByb3ZpZGU6IFJPVVRFUl9GT1JST09UX0dVQVJELFxuICAgICAgICAgIHVzZUZhY3Rvcnk6IHByb3ZpZGVGb3JSb290R3VhcmQsXG4gICAgICAgICAgZGVwczogW1tSb3V0ZXIsIG5ldyBPcHRpb25hbCgpLCBuZXcgU2tpcFNlbGYoKV1dXG4gICAgICAgIH0sXG4gICAgICAgIHtwcm92aWRlOiBST1VURVJfQ09ORklHVVJBVElPTiwgdXNlVmFsdWU6IGNvbmZpZyA/IGNvbmZpZyA6IHt9fSxcbiAgICAgICAgY29uZmlnPy51c2VIYXNoID8gcHJvdmlkZUhhc2hMb2NhdGlvblN0cmF0ZWd5KCkgOiBwcm92aWRlUGF0aExvY2F0aW9uU3RyYXRlZ3koKSxcbiAgICAgICAgcHJvdmlkZVJvdXRlclNjcm9sbGVyKCksXG4gICAgICAgIGNvbmZpZz8ucHJlbG9hZGluZ1N0cmF0ZWd5ID8gcHJvdmlkZVByZWxvYWRpbmcoY29uZmlnLnByZWxvYWRpbmdTdHJhdGVneSkgOiBbXSxcbiAgICAgICAge3Byb3ZpZGU6IE5nUHJvYmVUb2tlbiwgbXVsdGk6IHRydWUsIHVzZUZhY3Rvcnk6IHJvdXRlck5nUHJvYmVUb2tlbn0sXG4gICAgICAgIGNvbmZpZz8uaW5pdGlhbE5hdmlnYXRpb24gPyBwcm92aWRlSW5pdGlhbE5hdmlnYXRpb24oY29uZmlnKSA6IFtdLFxuICAgICAgICBwcm92aWRlUm91dGVySW5pdGlhbGl6ZXIoKSxcbiAgICAgIF0sXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbW9kdWxlIHdpdGggYWxsIHRoZSByb3V0ZXIgZGlyZWN0aXZlcyBhbmQgYSBwcm92aWRlciByZWdpc3RlcmluZyByb3V0ZXMsXG4gICAqIHdpdGhvdXQgY3JlYXRpbmcgYSBuZXcgUm91dGVyIHNlcnZpY2UuXG4gICAqIFdoZW4gcmVnaXN0ZXJpbmcgZm9yIHN1Ym1vZHVsZXMgYW5kIGxhenktbG9hZGVkIHN1Ym1vZHVsZXMsIGNyZWF0ZSB0aGUgTmdNb2R1bGUgYXMgZm9sbG93czpcbiAgICpcbiAgICogYGBgXG4gICAqIEBOZ01vZHVsZSh7XG4gICAqICAgaW1wb3J0czogW1JvdXRlck1vZHVsZS5mb3JDaGlsZChST1VURVMpXVxuICAgKiB9KVxuICAgKiBjbGFzcyBNeU5nTW9kdWxlIHt9XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gcm91dGVzIEFuIGFycmF5IG9mIGBSb3V0ZWAgb2JqZWN0cyB0aGF0IGRlZmluZSB0aGUgbmF2aWdhdGlvbiBwYXRocyBmb3IgdGhlIHN1Ym1vZHVsZS5cbiAgICogQHJldHVybiBUaGUgbmV3IE5nTW9kdWxlLlxuICAgKlxuICAgKi9cbiAgc3RhdGljIGZvckNoaWxkKHJvdXRlczogUm91dGVzKTogTW9kdWxlV2l0aFByb3ZpZGVyczxSb3V0ZXJNb2R1bGU+IHtcbiAgICByZXR1cm4ge25nTW9kdWxlOiBSb3V0ZXJNb2R1bGUsIHByb3ZpZGVyczogW3Byb3ZpZGVSb3V0ZXMocm91dGVzKV19O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcm92aWRlUm91dGVyU2Nyb2xsZXIoKTogUHJvdmlkZXIge1xuICByZXR1cm4ge1xuICAgIHByb3ZpZGU6IFJPVVRFUl9TQ1JPTExFUixcbiAgICB1c2VGYWN0b3J5OiAoKSA9PiB7XG4gICAgICBjb25zdCByb3V0ZXIgPSBpbmplY3QoUm91dGVyKTtcbiAgICAgIGNvbnN0IHZpZXdwb3J0U2Nyb2xsZXIgPSBpbmplY3QoVmlld3BvcnRTY3JvbGxlcik7XG4gICAgICBjb25zdCBjb25maWc6IEV4dHJhT3B0aW9ucyA9IGluamVjdChST1VURVJfQ09ORklHVVJBVElPTik7XG4gICAgICBpZiAoY29uZmlnLnNjcm9sbE9mZnNldCkge1xuICAgICAgICB2aWV3cG9ydFNjcm9sbGVyLnNldE9mZnNldChjb25maWcuc2Nyb2xsT2Zmc2V0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgUm91dGVyU2Nyb2xsZXIocm91dGVyLCB2aWV3cG9ydFNjcm9sbGVyLCBjb25maWcpO1xuICAgIH0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIHByb3ZpZGVIYXNoTG9jYXRpb25TdHJhdGVneSgpOiBQcm92aWRlciB7XG4gIHJldHVybiB7cHJvdmlkZTogTG9jYXRpb25TdHJhdGVneSwgdXNlQ2xhc3M6IEhhc2hMb2NhdGlvblN0cmF0ZWd5fTtcbn1cblxuZnVuY3Rpb24gcHJvdmlkZVBhdGhMb2NhdGlvblN0cmF0ZWd5KCk6IFByb3ZpZGVyIHtcbiAgcmV0dXJuIHtwcm92aWRlOiBMb2NhdGlvblN0cmF0ZWd5LCB1c2VDbGFzczogUGF0aExvY2F0aW9uU3RyYXRlZ3l9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZUZvclJvb3RHdWFyZChyb3V0ZXI6IFJvdXRlcik6IGFueSB7XG4gIGlmIChOR19ERVZfTU9ERSAmJiByb3V0ZXIpIHtcbiAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICBSdW50aW1lRXJyb3JDb2RlLkZPUl9ST09UX0NBTExFRF9UV0lDRSxcbiAgICAgICAgYFJvdXRlck1vZHVsZS5mb3JSb290KCkgY2FsbGVkIHR3aWNlLiBMYXp5IGxvYWRlZCBtb2R1bGVzIHNob3VsZCB1c2UgUm91dGVyTW9kdWxlLmZvckNoaWxkKCkgaW5zdGVhZC5gKTtcbiAgfVxuICByZXR1cm4gJ2d1YXJkZWQnO1xufVxuXG4vKipcbiAqIFJlZ2lzdGVycyBhIFtESSBwcm92aWRlcl0oZ3VpZGUvZ2xvc3NhcnkjcHJvdmlkZXIpIGZvciBhIHNldCBvZiByb3V0ZXMuXG4gKiBAcGFyYW0gcm91dGVzIFRoZSByb3V0ZSBjb25maWd1cmF0aW9uIHRvIHByb3ZpZGUuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBgYGBcbiAqIEBOZ01vZHVsZSh7XG4gKiAgIGltcG9ydHM6IFtSb3V0ZXJNb2R1bGUuZm9yQ2hpbGQoUk9VVEVTKV0sXG4gKiAgIHByb3ZpZGVyczogW3Byb3ZpZGVSb3V0ZXMoRVhUUkFfUk9VVEVTKV1cbiAqIH0pXG4gKiBjbGFzcyBNeU5nTW9kdWxlIHt9XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm92aWRlUm91dGVzKHJvdXRlczogUm91dGVzKTogYW55IHtcbiAgcmV0dXJuIFtcbiAgICB7cHJvdmlkZTogQU5BTFlaRV9GT1JfRU5UUllfQ09NUE9ORU5UUywgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiByb3V0ZXN9LFxuICAgIHtwcm92aWRlOiBST1VURVMsIG11bHRpOiB0cnVlLCB1c2VWYWx1ZTogcm91dGVzfSxcbiAgXTtcbn1cblxuLyoqXG4gKiBBbGxvd2VkIHZhbHVlcyBpbiBhbiBgRXh0cmFPcHRpb25zYCBvYmplY3QgdGhhdCBjb25maWd1cmVcbiAqIHdoZW4gdGhlIHJvdXRlciBwZXJmb3JtcyB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIG9wZXJhdGlvbi5cbiAqXG4gKiAqICdlbmFibGVkTm9uQmxvY2tpbmcnIC0gKGRlZmF1bHQpIFRoZSBpbml0aWFsIG5hdmlnYXRpb24gc3RhcnRzIGFmdGVyIHRoZVxuICogcm9vdCBjb21wb25lbnQgaGFzIGJlZW4gY3JlYXRlZC4gVGhlIGJvb3RzdHJhcCBpcyBub3QgYmxvY2tlZCBvbiB0aGUgY29tcGxldGlvbiBvZiB0aGUgaW5pdGlhbFxuICogbmF2aWdhdGlvbi5cbiAqICogJ2VuYWJsZWRCbG9ja2luZycgLSBUaGUgaW5pdGlhbCBuYXZpZ2F0aW9uIHN0YXJ0cyBiZWZvcmUgdGhlIHJvb3QgY29tcG9uZW50IGlzIGNyZWF0ZWQuXG4gKiBUaGUgYm9vdHN0cmFwIGlzIGJsb2NrZWQgdW50aWwgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBpcyBjb21wbGV0ZS4gVGhpcyB2YWx1ZSBpcyByZXF1aXJlZFxuICogZm9yIFtzZXJ2ZXItc2lkZSByZW5kZXJpbmddKGd1aWRlL3VuaXZlcnNhbCkgdG8gd29yay5cbiAqICogJ2Rpc2FibGVkJyAtIFRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgbm90IHBlcmZvcm1lZC4gVGhlIGxvY2F0aW9uIGxpc3RlbmVyIGlzIHNldCB1cCBiZWZvcmVcbiAqIHRoZSByb290IGNvbXBvbmVudCBnZXRzIGNyZWF0ZWQuIFVzZSBpZiB0aGVyZSBpcyBhIHJlYXNvbiB0byBoYXZlXG4gKiBtb3JlIGNvbnRyb2wgb3ZlciB3aGVuIHRoZSByb3V0ZXIgc3RhcnRzIGl0cyBpbml0aWFsIG5hdmlnYXRpb24gZHVlIHRvIHNvbWUgY29tcGxleFxuICogaW5pdGlhbGl6YXRpb24gbG9naWMuXG4gKlxuICogVGhlIGZvbGxvd2luZyB2YWx1ZXMgaGF2ZSBiZWVuIFtkZXByZWNhdGVkXShndWlkZS9yZWxlYXNlcyNkZXByZWNhdGlvbi1wcmFjdGljZXMpIHNpbmNlIHYxMSxcbiAqIGFuZCBzaG91bGQgbm90IGJlIHVzZWQgZm9yIG5ldyBhcHBsaWNhdGlvbnMuXG4gKlxuICogQHNlZSBgZm9yUm9vdCgpYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgSW5pdGlhbE5hdmlnYXRpb24gPSAnZGlzYWJsZWQnfCdlbmFibGVkQmxvY2tpbmcnfCdlbmFibGVkTm9uQmxvY2tpbmcnO1xuXG4vKipcbiAqIEEgc2V0IG9mIGNvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgYSByb3V0ZXIgbW9kdWxlLCBwcm92aWRlZCBpbiB0aGVcbiAqIGBmb3JSb290KClgIG1ldGhvZC5cbiAqXG4gKiBAc2VlIGBmb3JSb290KClgXG4gKlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFeHRyYU9wdGlvbnMge1xuICAvKipcbiAgICogV2hlbiB0cnVlLCBsb2cgYWxsIGludGVybmFsIG5hdmlnYXRpb24gZXZlbnRzIHRvIHRoZSBjb25zb2xlLlxuICAgKiBVc2UgZm9yIGRlYnVnZ2luZy5cbiAgICovXG4gIGVuYWJsZVRyYWNpbmc/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGVuIHRydWUsIGVuYWJsZSB0aGUgbG9jYXRpb24gc3RyYXRlZ3kgdGhhdCB1c2VzIHRoZSBVUkwgZnJhZ21lbnRcbiAgICogaW5zdGVhZCBvZiB0aGUgaGlzdG9yeSBBUEkuXG4gICAqL1xuICB1c2VIYXNoPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogT25lIG9mIGBlbmFibGVkYCwgYGVuYWJsZWRCbG9ja2luZ2AsIGBlbmFibGVkTm9uQmxvY2tpbmdgIG9yIGBkaXNhYmxlZGAuXG4gICAqIFdoZW4gc2V0IHRvIGBlbmFibGVkYCBvciBgZW5hYmxlZEJsb2NraW5nYCwgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBzdGFydHMgYmVmb3JlIHRoZSByb290XG4gICAqIGNvbXBvbmVudCBpcyBjcmVhdGVkLiBUaGUgYm9vdHN0cmFwIGlzIGJsb2NrZWQgdW50aWwgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBpcyBjb21wbGV0ZS4gVGhpc1xuICAgKiB2YWx1ZSBpcyByZXF1aXJlZCBmb3IgW3NlcnZlci1zaWRlIHJlbmRlcmluZ10oZ3VpZGUvdW5pdmVyc2FsKSB0byB3b3JrLiBXaGVuIHNldCB0b1xuICAgKiBgZW5hYmxlZE5vbkJsb2NraW5nYCwgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBzdGFydHMgYWZ0ZXIgdGhlIHJvb3QgY29tcG9uZW50IGhhcyBiZWVuIGNyZWF0ZWQuXG4gICAqIFRoZSBib290c3RyYXAgaXMgbm90IGJsb2NrZWQgb24gdGhlIGNvbXBsZXRpb24gb2YgdGhlIGluaXRpYWwgbmF2aWdhdGlvbi4gV2hlbiBzZXQgdG9cbiAgICogYGRpc2FibGVkYCwgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBpcyBub3QgcGVyZm9ybWVkLiBUaGUgbG9jYXRpb24gbGlzdGVuZXIgaXMgc2V0IHVwIGJlZm9yZSB0aGVcbiAgICogcm9vdCBjb21wb25lbnQgZ2V0cyBjcmVhdGVkLiBVc2UgaWYgdGhlcmUgaXMgYSByZWFzb24gdG8gaGF2ZSBtb3JlIGNvbnRyb2wgb3ZlciB3aGVuIHRoZSByb3V0ZXJcbiAgICogc3RhcnRzIGl0cyBpbml0aWFsIG5hdmlnYXRpb24gZHVlIHRvIHNvbWUgY29tcGxleCBpbml0aWFsaXphdGlvbiBsb2dpYy5cbiAgICovXG4gIGluaXRpYWxOYXZpZ2F0aW9uPzogSW5pdGlhbE5hdmlnYXRpb247XG5cbiAgLyoqXG4gICAqIEEgY3VzdG9tIGVycm9yIGhhbmRsZXIgZm9yIGZhaWxlZCBuYXZpZ2F0aW9ucy5cbiAgICogSWYgdGhlIGhhbmRsZXIgcmV0dXJucyBhIHZhbHVlLCB0aGUgbmF2aWdhdGlvbiBQcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhpcyB2YWx1ZS5cbiAgICogSWYgdGhlIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbiwgdGhlIG5hdmlnYXRpb24gUHJvbWlzZSBpcyByZWplY3RlZCB3aXRoIHRoZSBleGNlcHRpb24uXG4gICAqXG4gICAqL1xuICBlcnJvckhhbmRsZXI/OiBFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5LlxuICAgKiBPbmUgb2YgYFByZWxvYWRBbGxNb2R1bGVzYCBvciBgTm9QcmVsb2FkaW5nYCAodGhlIGRlZmF1bHQpLlxuICAgKi9cbiAgcHJlbG9hZGluZ1N0cmF0ZWd5PzogYW55O1xuXG4gIC8qKlxuICAgKiBEZWZpbmUgd2hhdCB0aGUgcm91dGVyIHNob3VsZCBkbyBpZiBpdCByZWNlaXZlcyBhIG5hdmlnYXRpb24gcmVxdWVzdCB0byB0aGUgY3VycmVudCBVUkwuXG4gICAqIERlZmF1bHQgaXMgYGlnbm9yZWAsIHdoaWNoIGNhdXNlcyB0aGUgcm91dGVyIGlnbm9yZXMgdGhlIG5hdmlnYXRpb24uXG4gICAqIFRoaXMgY2FuIGRpc2FibGUgZmVhdHVyZXMgc3VjaCBhcyBhIFwicmVmcmVzaFwiIGJ1dHRvbi5cbiAgICogVXNlIHRoaXMgb3B0aW9uIHRvIGNvbmZpZ3VyZSB0aGUgYmVoYXZpb3Igd2hlbiBuYXZpZ2F0aW5nIHRvIHRoZVxuICAgKiBjdXJyZW50IFVSTC4gRGVmYXVsdCBpcyAnaWdub3JlJy5cbiAgICovXG4gIG9uU2FtZVVybE5hdmlnYXRpb24/OiAncmVsb2FkJ3wnaWdub3JlJztcblxuICAvKipcbiAgICogQ29uZmlndXJlcyBpZiB0aGUgc2Nyb2xsIHBvc2l0aW9uIG5lZWRzIHRvIGJlIHJlc3RvcmVkIHdoZW4gbmF2aWdhdGluZyBiYWNrLlxuICAgKlxuICAgKiAqICdkaXNhYmxlZCctIChEZWZhdWx0KSBEb2VzIG5vdGhpbmcuIFNjcm9sbCBwb3NpdGlvbiBpcyBtYWludGFpbmVkIG9uIG5hdmlnYXRpb24uXG4gICAqICogJ3RvcCctIFNldHMgdGhlIHNjcm9sbCBwb3NpdGlvbiB0byB4ID0gMCwgeSA9IDAgb24gYWxsIG5hdmlnYXRpb24uXG4gICAqICogJ2VuYWJsZWQnLSBSZXN0b3JlcyB0aGUgcHJldmlvdXMgc2Nyb2xsIHBvc2l0aW9uIG9uIGJhY2t3YXJkIG5hdmlnYXRpb24sIGVsc2Ugc2V0cyB0aGVcbiAgICogcG9zaXRpb24gdG8gdGhlIGFuY2hvciBpZiBvbmUgaXMgcHJvdmlkZWQsIG9yIHNldHMgdGhlIHNjcm9sbCBwb3NpdGlvbiB0byBbMCwgMF0gKGZvcndhcmRcbiAgICogbmF2aWdhdGlvbikuIFRoaXMgb3B0aW9uIHdpbGwgYmUgdGhlIGRlZmF1bHQgaW4gdGhlIGZ1dHVyZS5cbiAgICpcbiAgICogWW91IGNhbiBpbXBsZW1lbnQgY3VzdG9tIHNjcm9sbCByZXN0b3JhdGlvbiBiZWhhdmlvciBieSBhZGFwdGluZyB0aGUgZW5hYmxlZCBiZWhhdmlvciBhc1xuICAgKiBpbiB0aGUgZm9sbG93aW5nIGV4YW1wbGUuXG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY2xhc3MgQXBwQ29tcG9uZW50IHtcbiAgICogICBtb3ZpZURhdGE6IGFueTtcbiAgICpcbiAgICogICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJvdXRlcjogUm91dGVyLCBwcml2YXRlIHZpZXdwb3J0U2Nyb2xsZXI6IFZpZXdwb3J0U2Nyb2xsZXIsXG4gICAqIGNoYW5nZURldGVjdG9yUmVmOiBDaGFuZ2VEZXRlY3RvclJlZikge1xuICAgKiAgIHJvdXRlci5ldmVudHMucGlwZShmaWx0ZXIoKGV2ZW50OiBFdmVudCk6IGV2ZW50IGlzIFNjcm9sbCA9PiBldmVudCBpbnN0YW5jZW9mIFNjcm9sbClcbiAgICogICAgICkuc3Vic2NyaWJlKGUgPT4ge1xuICAgKiAgICAgICBmZXRjaCgnaHR0cDovL2V4YW1wbGUuY29tL21vdmllcy5qc29uJykudGhlbihyZXNwb25zZSA9PiB7XG4gICAqICAgICAgICAgdGhpcy5tb3ZpZURhdGEgPSByZXNwb25zZS5qc29uKCk7XG4gICAqICAgICAgICAgLy8gdXBkYXRlIHRoZSB0ZW1wbGF0ZSB3aXRoIHRoZSBkYXRhIGJlZm9yZSByZXN0b3Jpbmcgc2Nyb2xsXG4gICAqICAgICAgICAgY2hhbmdlRGV0ZWN0b3JSZWYuZGV0ZWN0Q2hhbmdlcygpO1xuICAgKlxuICAgKiAgICAgICAgIGlmIChlLnBvc2l0aW9uKSB7XG4gICAqICAgICAgICAgICB2aWV3cG9ydFNjcm9sbGVyLnNjcm9sbFRvUG9zaXRpb24oZS5wb3NpdGlvbik7XG4gICAqICAgICAgICAgfVxuICAgKiAgICAgICB9KTtcbiAgICogICAgIH0pO1xuICAgKiAgIH1cbiAgICogfVxuICAgKiBgYGBcbiAgICovXG4gIHNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb24/OiAnZGlzYWJsZWQnfCdlbmFibGVkJ3wndG9wJztcblxuICAvKipcbiAgICogV2hlbiBzZXQgdG8gJ2VuYWJsZWQnLCBzY3JvbGxzIHRvIHRoZSBhbmNob3IgZWxlbWVudCB3aGVuIHRoZSBVUkwgaGFzIGEgZnJhZ21lbnQuXG4gICAqIEFuY2hvciBzY3JvbGxpbmcgaXMgZGlzYWJsZWQgYnkgZGVmYXVsdC5cbiAgICpcbiAgICogQW5jaG9yIHNjcm9sbGluZyBkb2VzIG5vdCBoYXBwZW4gb24gJ3BvcHN0YXRlJy4gSW5zdGVhZCwgd2UgcmVzdG9yZSB0aGUgcG9zaXRpb25cbiAgICogdGhhdCB3ZSBzdG9yZWQgb3Igc2Nyb2xsIHRvIHRoZSB0b3AuXG4gICAqL1xuICBhbmNob3JTY3JvbGxpbmc/OiAnZGlzYWJsZWQnfCdlbmFibGVkJztcblxuICAvKipcbiAgICogQ29uZmlndXJlcyB0aGUgc2Nyb2xsIG9mZnNldCB0aGUgcm91dGVyIHdpbGwgdXNlIHdoZW4gc2Nyb2xsaW5nIHRvIGFuIGVsZW1lbnQuXG4gICAqXG4gICAqIFdoZW4gZ2l2ZW4gYSB0dXBsZSB3aXRoIHggYW5kIHkgcG9zaXRpb24gdmFsdWUsXG4gICAqIHRoZSByb3V0ZXIgdXNlcyB0aGF0IG9mZnNldCBlYWNoIHRpbWUgaXQgc2Nyb2xscy5cbiAgICogV2hlbiBnaXZlbiBhIGZ1bmN0aW9uLCB0aGUgcm91dGVyIGludm9rZXMgdGhlIGZ1bmN0aW9uIGV2ZXJ5IHRpbWVcbiAgICogaXQgcmVzdG9yZXMgc2Nyb2xsIHBvc2l0aW9uLlxuICAgKi9cbiAgc2Nyb2xsT2Zmc2V0PzogW251bWJlciwgbnVtYmVyXXwoKCkgPT4gW251bWJlciwgbnVtYmVyXSk7XG5cbiAgLyoqXG4gICAqIERlZmluZXMgaG93IHRoZSByb3V0ZXIgbWVyZ2VzIHBhcmFtZXRlcnMsIGRhdGEsIGFuZCByZXNvbHZlZCBkYXRhIGZyb20gcGFyZW50IHRvIGNoaWxkXG4gICAqIHJvdXRlcy4gQnkgZGVmYXVsdCAoJ2VtcHR5T25seScpLCBpbmhlcml0cyBwYXJlbnQgcGFyYW1ldGVycyBvbmx5IGZvclxuICAgKiBwYXRoLWxlc3Mgb3IgY29tcG9uZW50LWxlc3Mgcm91dGVzLlxuICAgKlxuICAgKiBTZXQgdG8gJ2Fsd2F5cycgdG8gZW5hYmxlIHVuY29uZGl0aW9uYWwgaW5oZXJpdGFuY2Ugb2YgcGFyZW50IHBhcmFtZXRlcnMuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB3aGVuIGRlYWxpbmcgd2l0aCBtYXRyaXggcGFyYW1ldGVycywgXCJwYXJlbnRcIiByZWZlcnMgdG8gdGhlIHBhcmVudCBgUm91dGVgXG4gICAqIGNvbmZpZyB3aGljaCBkb2VzIG5vdCBuZWNlc3NhcmlseSBtZWFuIHRoZSBcIlVSTCBzZWdtZW50IHRvIHRoZSBsZWZ0XCIuIFdoZW4gdGhlIGBSb3V0ZWAgYHBhdGhgXG4gICAqIGNvbnRhaW5zIG11bHRpcGxlIHNlZ21lbnRzLCB0aGUgbWF0cml4IHBhcmFtZXRlcnMgbXVzdCBhcHBlYXIgb24gdGhlIGxhc3Qgc2VnbWVudC4gRm9yIGV4YW1wbGUsXG4gICAqIG1hdHJpeCBwYXJhbWV0ZXJzIGZvciBge3BhdGg6ICdhL2InLCBjb21wb25lbnQ6IE15Q29tcH1gIHNob3VsZCBhcHBlYXIgYXMgYGEvYjtmb289YmFyYCBhbmQgbm90XG4gICAqIGBhO2Zvbz1iYXIvYmAuXG4gICAqXG4gICAqL1xuICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5PzogJ2VtcHR5T25seSd8J2Fsd2F5cyc7XG5cbiAgLyoqXG4gICAqIEEgY3VzdG9tIGhhbmRsZXIgZm9yIG1hbGZvcm1lZCBVUkkgZXJyb3JzLiBUaGUgaGFuZGxlciBpcyBpbnZva2VkIHdoZW4gYGVuY29kZWRVUklgIGNvbnRhaW5zXG4gICAqIGludmFsaWQgY2hhcmFjdGVyIHNlcXVlbmNlcy5cbiAgICogVGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gaXMgdG8gcmVkaXJlY3QgdG8gdGhlIHJvb3QgVVJMLCBkcm9wcGluZ1xuICAgKiBhbnkgcGF0aCBvciBwYXJhbWV0ZXIgaW5mb3JtYXRpb24uIFRoZSBmdW5jdGlvbiB0YWtlcyB0aHJlZSBwYXJhbWV0ZXJzOlxuICAgKlxuICAgKiAtIGAnVVJJRXJyb3InYCAtIEVycm9yIHRocm93biB3aGVuIHBhcnNpbmcgYSBiYWQgVVJMLlxuICAgKiAtIGAnVXJsU2VyaWFsaXplcidgIC0gVXJsU2VyaWFsaXplciB0aGF04oCZcyBjb25maWd1cmVkIHdpdGggdGhlIHJvdXRlci5cbiAgICogLSBgJ3VybCdgIC0gIFRoZSBtYWxmb3JtZWQgVVJMIHRoYXQgY2F1c2VkIHRoZSBVUklFcnJvclxuICAgKiAqL1xuICBtYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI/OlxuICAgICAgKGVycm9yOiBVUklFcnJvciwgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgdXJsOiBzdHJpbmcpID0+IFVybFRyZWU7XG5cbiAgLyoqXG4gICAqIERlZmluZXMgd2hlbiB0aGUgcm91dGVyIHVwZGF0ZXMgdGhlIGJyb3dzZXIgVVJMLiBCeSBkZWZhdWx0ICgnZGVmZXJyZWQnKSxcbiAgICogdXBkYXRlIGFmdGVyIHN1Y2Nlc3NmdWwgbmF2aWdhdGlvbi5cbiAgICogU2V0IHRvICdlYWdlcicgaWYgcHJlZmVyIHRvIHVwZGF0ZSB0aGUgVVJMIGF0IHRoZSBiZWdpbm5pbmcgb2YgbmF2aWdhdGlvbi5cbiAgICogVXBkYXRpbmcgdGhlIFVSTCBlYXJseSBhbGxvd3MgeW91IHRvIGhhbmRsZSBhIGZhaWx1cmUgb2YgbmF2aWdhdGlvbiBieVxuICAgKiBzaG93aW5nIGFuIGVycm9yIG1lc3NhZ2Ugd2l0aCB0aGUgVVJMIHRoYXQgZmFpbGVkLlxuICAgKi9cbiAgdXJsVXBkYXRlU3RyYXRlZ3k/OiAnZGVmZXJyZWQnfCdlYWdlcic7XG5cbiAgLyoqXG4gICAqIEVuYWJsZXMgYSBidWcgZml4IHRoYXQgY29ycmVjdHMgcmVsYXRpdmUgbGluayByZXNvbHV0aW9uIGluIGNvbXBvbmVudHMgd2l0aCBlbXB0eSBwYXRocy5cbiAgICogRXhhbXBsZTpcbiAgICpcbiAgICogYGBgXG4gICAqIGNvbnN0IHJvdXRlcyA9IFtcbiAgICogICB7XG4gICAqICAgICBwYXRoOiAnJyxcbiAgICogICAgIGNvbXBvbmVudDogQ29udGFpbmVyQ29tcG9uZW50LFxuICAgKiAgICAgY2hpbGRyZW46IFtcbiAgICogICAgICAgeyBwYXRoOiAnYScsIGNvbXBvbmVudDogQUNvbXBvbmVudCB9LFxuICAgKiAgICAgICB7IHBhdGg6ICdiJywgY29tcG9uZW50OiBCQ29tcG9uZW50IH0sXG4gICAqICAgICBdXG4gICAqICAgfVxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogRnJvbSB0aGUgYENvbnRhaW5lckNvbXBvbmVudGAsIHlvdSBzaG91bGQgYmUgYWJsZSB0byBuYXZpZ2F0ZSB0byBgQUNvbXBvbmVudGAgdXNpbmdcbiAgICogdGhlIGZvbGxvd2luZyBgcm91dGVyTGlua2AsIGJ1dCBpdCB3aWxsIG5vdCB3b3JrIGlmIGByZWxhdGl2ZUxpbmtSZXNvbHV0aW9uYCBpcyBzZXRcbiAgICogdG8gYCdsZWdhY3knYDpcbiAgICpcbiAgICogYDxhIFtyb3V0ZXJMaW5rXT1cIlsnLi9hJ11cIj5MaW5rIHRvIEE8L2E+YFxuICAgKlxuICAgKiBIb3dldmVyLCB0aGlzIHdpbGwgd29yazpcbiAgICpcbiAgICogYDxhIFtyb3V0ZXJMaW5rXT1cIlsnLi4vYSddXCI+TGluayB0byBBPC9hPmBcbiAgICpcbiAgICogSW4gb3RoZXIgd29yZHMsIHlvdSdyZSByZXF1aXJlZCB0byB1c2UgYC4uL2AgcmF0aGVyIHRoYW4gYC4vYCB3aGVuIHRoZSByZWxhdGl2ZSBsaW5rXG4gICAqIHJlc29sdXRpb24gaXMgc2V0IHRvIGAnbGVnYWN5J2AuXG4gICAqXG4gICAqIFRoZSBkZWZhdWx0IGluIHYxMSBpcyBgY29ycmVjdGVkYC5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWRcbiAgICovXG4gIHJlbGF0aXZlTGlua1Jlc29sdXRpb24/OiAnbGVnYWN5J3wnY29ycmVjdGVkJztcblxuICAvKipcbiAgICogQ29uZmlndXJlcyBob3cgdGhlIFJvdXRlciBhdHRlbXB0cyB0byByZXN0b3JlIHN0YXRlIHdoZW4gYSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGxlZC5cbiAgICpcbiAgICogJ3JlcGxhY2UnIC0gQWx3YXlzIHVzZXMgYGxvY2F0aW9uLnJlcGxhY2VTdGF0ZWAgdG8gc2V0IHRoZSBicm93c2VyIHN0YXRlIHRvIHRoZSBzdGF0ZSBvZiB0aGVcbiAgICogcm91dGVyIGJlZm9yZSB0aGUgbmF2aWdhdGlvbiBzdGFydGVkLiBUaGlzIG1lYW5zIHRoYXQgaWYgdGhlIFVSTCBvZiB0aGUgYnJvd3NlciBpcyB1cGRhdGVkXG4gICAqIF9iZWZvcmVfIHRoZSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGVkLCB0aGUgUm91dGVyIHdpbGwgc2ltcGx5IHJlcGxhY2UgdGhlIGl0ZW0gaW4gaGlzdG9yeSByYXRoZXJcbiAgICogdGhhbiB0cnlpbmcgdG8gcmVzdG9yZSB0byB0aGUgcHJldmlvdXMgbG9jYXRpb24gaW4gdGhlIHNlc3Npb24gaGlzdG9yeS4gVGhpcyBoYXBwZW5zIG1vc3RcbiAgICogZnJlcXVlbnRseSB3aXRoIGB1cmxVcGRhdGVTdHJhdGVneTogJ2VhZ2VyJ2AgYW5kIG5hdmlnYXRpb25zIHdpdGggdGhlIGJyb3dzZXIgYmFjay9mb3J3YXJkXG4gICAqIGJ1dHRvbnMuXG4gICAqXG4gICAqICdjb21wdXRlZCcgLSBXaWxsIGF0dGVtcHQgdG8gcmV0dXJuIHRvIHRoZSBzYW1lIGluZGV4IGluIHRoZSBzZXNzaW9uIGhpc3RvcnkgdGhhdCBjb3JyZXNwb25kc1xuICAgKiB0byB0aGUgQW5ndWxhciByb3V0ZSB3aGVuIHRoZSBuYXZpZ2F0aW9uIGdldHMgY2FuY2VsbGVkLiBGb3IgZXhhbXBsZSwgaWYgdGhlIGJyb3dzZXIgYmFja1xuICAgKiBidXR0b24gaXMgY2xpY2tlZCBhbmQgdGhlIG5hdmlnYXRpb24gaXMgY2FuY2VsbGVkLCB0aGUgUm91dGVyIHdpbGwgdHJpZ2dlciBhIGZvcndhcmQgbmF2aWdhdGlvblxuICAgKiBhbmQgdmljZSB2ZXJzYS5cbiAgICpcbiAgICogTm90ZTogdGhlICdjb21wdXRlZCcgb3B0aW9uIGlzIGluY29tcGF0aWJsZSB3aXRoIGFueSBgVXJsSGFuZGxpbmdTdHJhdGVneWAgd2hpY2ggb25seVxuICAgKiBoYW5kbGVzIGEgcG9ydGlvbiBvZiB0aGUgVVJMIGJlY2F1c2UgdGhlIGhpc3RvcnkgcmVzdG9yYXRpb24gbmF2aWdhdGVzIHRvIHRoZSBwcmV2aW91cyBwbGFjZSBpblxuICAgKiB0aGUgYnJvd3NlciBoaXN0b3J5IHJhdGhlciB0aGFuIHNpbXBseSByZXNldHRpbmcgYSBwb3J0aW9uIG9mIHRoZSBVUkwuXG4gICAqXG4gICAqIFRoZSBkZWZhdWx0IHZhbHVlIGlzIGByZXBsYWNlYCB3aGVuIG5vdCBzZXQuXG4gICAqL1xuICBjYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uPzogJ3JlcGxhY2UnfCdjb21wdXRlZCc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cFJvdXRlcihcbiAgICB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLCBjb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cywgbG9jYXRpb246IExvY2F0aW9uLFxuICAgIGluamVjdG9yOiBJbmplY3RvciwgY29tcGlsZXI6IENvbXBpbGVyLCBjb25maWc6IFJvdXRlW11bXSwgdGl0bGVTdHJhdGVneTogVGl0bGVTdHJhdGVneSxcbiAgICBvcHRzOiBFeHRyYU9wdGlvbnMgPSB7fSwgdXJsSGFuZGxpbmdTdHJhdGVneT86IFVybEhhbmRsaW5nU3RyYXRlZ3ksXG4gICAgcm91dGVSZXVzZVN0cmF0ZWd5PzogUm91dGVSZXVzZVN0cmF0ZWd5KSB7XG4gIGNvbnN0IHJvdXRlciA9XG4gICAgICBuZXcgUm91dGVyKG51bGwsIHVybFNlcmlhbGl6ZXIsIGNvbnRleHRzLCBsb2NhdGlvbiwgaW5qZWN0b3IsIGNvbXBpbGVyLCBmbGF0dGVuKGNvbmZpZykpO1xuXG4gIGlmICh1cmxIYW5kbGluZ1N0cmF0ZWd5KSB7XG4gICAgcm91dGVyLnVybEhhbmRsaW5nU3RyYXRlZ3kgPSB1cmxIYW5kbGluZ1N0cmF0ZWd5O1xuICB9XG5cbiAgaWYgKHJvdXRlUmV1c2VTdHJhdGVneSkge1xuICAgIHJvdXRlci5yb3V0ZVJldXNlU3RyYXRlZ3kgPSByb3V0ZVJldXNlU3RyYXRlZ3k7XG4gIH1cblxuICByb3V0ZXIudGl0bGVTdHJhdGVneSA9IHRpdGxlU3RyYXRlZ3k7XG5cbiAgYXNzaWduRXh0cmFPcHRpb25zVG9Sb3V0ZXIob3B0cywgcm91dGVyKTtcblxuICByZXR1cm4gcm91dGVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzaWduRXh0cmFPcHRpb25zVG9Sb3V0ZXIob3B0czogRXh0cmFPcHRpb25zLCByb3V0ZXI6IFJvdXRlcik6IHZvaWQge1xuICBpZiAob3B0cy5lcnJvckhhbmRsZXIpIHtcbiAgICByb3V0ZXIuZXJyb3JIYW5kbGVyID0gb3B0cy5lcnJvckhhbmRsZXI7XG4gIH1cblxuICBpZiAob3B0cy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIpIHtcbiAgICByb3V0ZXIubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyID0gb3B0cy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI7XG4gIH1cblxuICBpZiAob3B0cy5vblNhbWVVcmxOYXZpZ2F0aW9uKSB7XG4gICAgcm91dGVyLm9uU2FtZVVybE5hdmlnYXRpb24gPSBvcHRzLm9uU2FtZVVybE5hdmlnYXRpb247XG4gIH1cblxuICBpZiAob3B0cy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5KSB7XG4gICAgcm91dGVyLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kgPSBvcHRzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k7XG4gIH1cblxuICBpZiAob3B0cy5yZWxhdGl2ZUxpbmtSZXNvbHV0aW9uKSB7XG4gICAgcm91dGVyLnJlbGF0aXZlTGlua1Jlc29sdXRpb24gPSBvcHRzLnJlbGF0aXZlTGlua1Jlc29sdXRpb247XG4gIH1cblxuICBpZiAob3B0cy51cmxVcGRhdGVTdHJhdGVneSkge1xuICAgIHJvdXRlci51cmxVcGRhdGVTdHJhdGVneSA9IG9wdHMudXJsVXBkYXRlU3RyYXRlZ3k7XG4gIH1cblxuICBpZiAob3B0cy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uKSB7XG4gICAgcm91dGVyLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPSBvcHRzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb247XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEJvb3RzdHJhcExpc3RlbmVyKCkge1xuICBjb25zdCBpbmplY3RvciA9IGluamVjdChJbmplY3Rvcik7XG4gIHJldHVybiAoYm9vdHN0cmFwcGVkQ29tcG9uZW50UmVmOiBDb21wb25lbnRSZWY8dW5rbm93bj4pID0+IHtcbiAgICBjb25zdCByZWYgPSBpbmplY3Rvci5nZXQoQXBwbGljYXRpb25SZWYpO1xuXG4gICAgaWYgKGJvb3RzdHJhcHBlZENvbXBvbmVudFJlZiAhPT0gcmVmLmNvbXBvbmVudHNbMF0pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCByb3V0ZXIgPSBpbmplY3Rvci5nZXQoUm91dGVyKTtcbiAgICBjb25zdCBib290c3RyYXBEb25lID0gaW5qZWN0b3IuZ2V0KEJPT1RTVFJBUF9ET05FKTtcblxuICAgIC8vIERlZmF1bHQgY2FzZVxuICAgIGlmIChpbmplY3Rvci5nZXQoSU5JVElBTF9OQVZJR0FUSU9OLCBudWxsLCBJbmplY3RGbGFncy5PcHRpb25hbCkgPT09IG51bGwpIHtcbiAgICAgIHJvdXRlci5pbml0aWFsTmF2aWdhdGlvbigpO1xuICAgIH1cblxuICAgIGluamVjdG9yLmdldChST1VURVJfUFJFTE9BREVSLCBudWxsLCBJbmplY3RGbGFncy5PcHRpb25hbCk/LnNldFVwUHJlbG9hZGluZygpO1xuICAgIGluamVjdG9yLmdldChST1VURVJfU0NST0xMRVIsIG51bGwsIEluamVjdEZsYWdzLk9wdGlvbmFsKT8uaW5pdCgpO1xuICAgIHJvdXRlci5yZXNldFJvb3RDb21wb25lbnRUeXBlKHJlZi5jb21wb25lbnRUeXBlc1swXSk7XG4gICAgYm9vdHN0cmFwRG9uZS5uZXh0KCk7XG4gICAgYm9vdHN0cmFwRG9uZS5jb21wbGV0ZSgpO1xuICB9O1xufVxuXG4vLyBUT0RPKGF0c2NvdHQpOiBUaGlzIHNob3VsZCBub3QgYmUgaW4gdGhlIHB1YmxpYyBBUElcbi8qKlxuICogQSBbREkgdG9rZW5dKGd1aWRlL2dsb3NzYXJ5LyNkaS10b2tlbikgZm9yIHRoZSByb3V0ZXIgaW5pdGlhbGl6ZXIgdGhhdFxuICogaXMgY2FsbGVkIGFmdGVyIHRoZSBhcHAgaXMgYm9vdHN0cmFwcGVkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9JTklUSUFMSVpFUiA9IG5ldyBJbmplY3Rpb25Ub2tlbjwoY29tcFJlZjogQ29tcG9uZW50UmVmPGFueT4pID0+IHZvaWQ+KFxuICAgIE5HX0RFVl9NT0RFID8gJ1JvdXRlciBJbml0aWFsaXplcicgOiAnJyk7XG5cbmZ1bmN0aW9uIHByb3ZpZGVJbml0aWFsTmF2aWdhdGlvbihjb25maWc6IFBpY2s8RXh0cmFPcHRpb25zLCAnaW5pdGlhbE5hdmlnYXRpb24nPik6IFByb3ZpZGVyW10ge1xuICByZXR1cm4gW1xuICAgIGNvbmZpZy5pbml0aWFsTmF2aWdhdGlvbiA9PT0gJ2Rpc2FibGVkJyA/IHByb3ZpZGVEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uKCkgOiBbXSxcbiAgICBjb25maWcuaW5pdGlhbE5hdmlnYXRpb24gPT09ICdlbmFibGVkQmxvY2tpbmcnID8gcHJvdmlkZUVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uKCkgOiBbXSxcbiAgXTtcbn1cblxuZnVuY3Rpb24gcHJvdmlkZVJvdXRlckluaXRpYWxpemVyKCk6IFJlYWRvbmx5QXJyYXk8UHJvdmlkZXI+IHtcbiAgcmV0dXJuIFtcbiAgICAvLyBST1VURVJfSU5JVElBTElaRVIgdG9rZW4gc2hvdWxkIGJlIHJlbW92ZWQuIEl0J3MgcHVibGljIEFQSSBidXQgc2hvdWxkbid0IGJlLiBXZSBjYW4ganVzdFxuICAgIC8vIGhhdmUgYGdldEJvb3RzdHJhcExpc3RlbmVyYCBkaXJlY3RseSBhdHRhY2hlZCB0byBBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLlxuICAgIHtwcm92aWRlOiBST1VURVJfSU5JVElBTElaRVIsIHVzZUZhY3Rvcnk6IGdldEJvb3RzdHJhcExpc3RlbmVyfSxcbiAgICB7cHJvdmlkZTogQVBQX0JPT1RTVFJBUF9MSVNURU5FUiwgbXVsdGk6IHRydWUsIHVzZUV4aXN0aW5nOiBST1VURVJfSU5JVElBTElaRVJ9LFxuICBdO1xufVxuXG4vKipcbiAqIEEgc3ViamVjdCB1c2VkIHRvIGluZGljYXRlIHRoYXQgdGhlIGJvb3RzdHJhcHBpbmcgcGhhc2UgaXMgZG9uZS4gV2hlbiBpbml0aWFsIG5hdmlnYXRpb24gaXNcbiAqIGBlbmFibGVkQmxvY2tpbmdgLCB0aGUgZmlyc3QgbmF2aWdhdGlvbiB3YWl0cyB1bnRpbCBib290c3RyYXBwaW5nIGlzIGZpbmlzaGVkIGJlZm9yZSBjb250aW51aW5nXG4gKiB0byB0aGUgYWN0aXZhdGlvbiBwaGFzZS5cbiAqL1xuY29uc3QgQk9PVFNUUkFQX0RPTkUgPVxuICAgIG5ldyBJbmplY3Rpb25Ub2tlbjxTdWJqZWN0PHZvaWQ+PihOR19ERVZfTU9ERSA/ICdib290c3RyYXAgZG9uZSBpbmRpY2F0b3InIDogJycsIHtcbiAgICAgIGZhY3Rvcnk6ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG4gICAgICB9XG4gICAgfSk7XG5cbmZ1bmN0aW9uIHByb3ZpZGVFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbigpOiBQcm92aWRlciB7XG4gIHJldHVybiBbXG4gICAge3Byb3ZpZGU6IElOSVRJQUxfTkFWSUdBVElPTiwgdXNlVmFsdWU6ICdlbmFibGVkQmxvY2tpbmcnfSxcbiAgICB7XG4gICAgICBwcm92aWRlOiBBUFBfSU5JVElBTElaRVIsXG4gICAgICBtdWx0aTogdHJ1ZSxcbiAgICAgIGRlcHM6IFtJbmplY3Rvcl0sXG4gICAgICB1c2VGYWN0b3J5OiAoaW5qZWN0b3I6IEluamVjdG9yKSA9PiB7XG4gICAgICAgIGNvbnN0IGxvY2F0aW9uSW5pdGlhbGl6ZWQ6IFByb21pc2U8YW55PiA9XG4gICAgICAgICAgICBpbmplY3Rvci5nZXQoTE9DQVRJT05fSU5JVElBTElaRUQsIFByb21pc2UucmVzb2x2ZShudWxsKSk7XG4gICAgICAgIGxldCBpbml0TmF2aWdhdGlvbiA9IGZhbHNlO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQZXJmb3JtcyB0aGUgZ2l2ZW4gYWN0aW9uIG9uY2UgdGhlIHJvdXRlciBmaW5pc2hlcyBpdHMgbmV4dC9jdXJyZW50IG5hdmlnYXRpb24uXG4gICAgICAgICAqXG4gICAgICAgICAqIElmIHRoZSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGVkIG9yIGVycm9ycyB3aXRob3V0IGEgcmVkaXJlY3QsIHRoZSBuYXZpZ2F0aW9uIGlzIGNvbnNpZGVyZWRcbiAgICAgICAgICogY29tcGxldGUuIElmIHRoZSBgTmF2aWdhdGlvbkVuZGAgZXZlbnQgZW1pdHMsIHRoZSBuYXZpZ2F0aW9uIGlzIGFsc28gY29uc2lkZXJlZCBjb21wbGV0ZS5cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGFmdGVyTmV4dE5hdmlnYXRpb24oYWN0aW9uOiAoKSA9PiB2b2lkKSB7XG4gICAgICAgICAgY29uc3Qgcm91dGVyID0gaW5qZWN0b3IuZ2V0KFJvdXRlcik7XG4gICAgICAgICAgcm91dGVyLmV2ZW50c1xuICAgICAgICAgICAgICAucGlwZShcbiAgICAgICAgICAgICAgICAgIGZpbHRlcihcbiAgICAgICAgICAgICAgICAgICAgICAoZSk6IGUgaXMgTmF2aWdhdGlvbkVuZHxOYXZpZ2F0aW9uQ2FuY2VsfE5hdmlnYXRpb25FcnJvciA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCB8fCBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkNhbmNlbCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVycm9yKSxcbiAgICAgICAgICAgICAgICAgIG1hcChlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gTmF2aWdhdGlvbiBhc3N1bWVkIHRvIHN1Y2NlZWQgaWYgd2UgZ2V0IGBBY3RpdmF0aW9uU3RhcnRgXG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVkaXJlY3RpbmcgPSBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkNhbmNlbCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAoZS5jb2RlID09PSBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZS5SZWRpcmVjdCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgIGUuY29kZSA9PT0gTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuU3VwZXJzZWRlZEJ5TmV3TmF2aWdhdGlvbikgOlxuICAgICAgICAgICAgICAgICAgICAgICAgZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWRpcmVjdGluZyA/IG51bGwgOiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgZmlsdGVyKChyZXN1bHQpOiByZXN1bHQgaXMgYm9vbGVhbiA9PiByZXN1bHQgIT09IG51bGwpLFxuICAgICAgICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgYWN0aW9uKCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICByZXR1cm4gbG9jYXRpb25Jbml0aWFsaXplZC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgICAgY29uc3Qgcm91dGVyID0gaW5qZWN0b3IuZ2V0KFJvdXRlcik7XG4gICAgICAgICAgICAgIGNvbnN0IGJvb3RzdHJhcERvbmUgPSBpbmplY3Rvci5nZXQoQk9PVFNUUkFQX0RPTkUpO1xuICAgICAgICAgICAgICBhZnRlck5leHROYXZpZ2F0aW9uKCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBVbmJsb2NrIEFQUF9JTklUSUFMSVpFUiBpbiBjYXNlIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gd2FzIGNhbmNlbGVkIG9yIGVycm9yZWRcbiAgICAgICAgICAgICAgICAvLyB3aXRob3V0IGEgcmVkaXJlY3QuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICBpbml0TmF2aWdhdGlvbiA9IHRydWU7XG4gICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgIHJvdXRlci5hZnRlclByZWFjdGl2YXRpb24gPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVW5ibG9jayBBUFBfSU5JVElBTElaRVIgb25jZSB3ZSBnZXQgdG8gYGFmdGVyUHJlYWN0aXZhdGlvbmAuIEF0IHRoaXMgcG9pbnQsIHdlXG4gICAgICAgICAgICAgICAgLy8gYXNzdW1lIGFjdGl2YXRpb24gd2lsbCBjb21wbGV0ZSBzdWNjZXNzZnVsbHkgKGV2ZW4gdGhvdWdoIHRoaXMgaXMgbm90XG4gICAgICAgICAgICAgICAgLy8gZ3VhcmFudGVlZCkuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAvLyBvbmx5IHRoZSBpbml0aWFsIG5hdmlnYXRpb24gc2hvdWxkIGJlIGRlbGF5ZWQgdW50aWwgYm9vdHN0cmFwcGluZyBpcyBkb25lLlxuICAgICAgICAgICAgICAgIGlmICghaW5pdE5hdmlnYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBib290c3RyYXBEb25lLmNsb3NlZCA/IG9mKHZvaWQgMCkgOiBib290c3RyYXBEb25lO1xuICAgICAgICAgICAgICAgICAgLy8gc3Vic2VxdWVudCBuYXZpZ2F0aW9ucyBzaG91bGQgbm90IGJlIGRlbGF5ZWRcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHZvaWQgMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICByb3V0ZXIuaW5pdGlhbE5hdmlnYXRpb24oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0sXG4gIF07XG59XG5cbmNvbnN0IElOSVRJQUxfTkFWSUdBVElPTiA9XG4gICAgbmV3IEluamVjdGlvblRva2VuPCdkaXNhYmxlZCd8J2VuYWJsZWRCbG9ja2luZyc+KE5HX0RFVl9NT0RFID8gJ2luaXRpYWwgbmF2aWdhdGlvbicgOiAnJyk7XG5cbmZ1bmN0aW9uIHByb3ZpZGVEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uKCk6IFByb3ZpZGVyW10ge1xuICByZXR1cm4gW1xuICAgIHtcbiAgICAgIHByb3ZpZGU6IEFQUF9JTklUSUFMSVpFUixcbiAgICAgIG11bHRpOiB0cnVlLFxuICAgICAgdXNlRmFjdG9yeTogKCkgPT4ge1xuICAgICAgICBjb25zdCByb3V0ZXIgPSBpbmplY3QoUm91dGVyKTtcbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICByb3V0ZXIuc2V0VXBMb2NhdGlvbkNoYW5nZUxpc3RlbmVyKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSxcbiAgICB7cHJvdmlkZTogSU5JVElBTF9OQVZJR0FUSU9OLCB1c2VWYWx1ZTogJ2Rpc2FibGVkJ31cbiAgXTtcbn1cblxuZnVuY3Rpb24gcHJvdmlkZVRyYWNpbmcoKTogUHJvdmlkZXJbXSB7XG4gIGlmIChOR19ERVZfTU9ERSkge1xuICAgIHJldHVybiBbe1xuICAgICAgcHJvdmlkZTogRU5WSVJPTk1FTlRfSU5JVElBTElaRVIsXG4gICAgICBtdWx0aTogdHJ1ZSxcbiAgICAgIHVzZUZhY3Rvcnk6ICgpID0+IHtcbiAgICAgICAgY29uc3Qgcm91dGVyID0gaW5qZWN0KFJvdXRlcik7XG4gICAgICAgIHJldHVybiAoKSA9PiByb3V0ZXIuZXZlbnRzLnN1YnNjcmliZSgoZTogRXZlbnQpID0+IHtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5ncm91cD8uKGBSb3V0ZXIgRXZlbnQ6ICR7KDxhbnk+ZS5jb25zdHJ1Y3RvcikubmFtZX1gKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhzdHJpbmdpZnlFdmVudChlKSk7XG4gICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgY29uc29sZS5ncm91cEVuZD8uKCk7XG4gICAgICAgICAgLy8gdHNsaW50OmVuYWJsZTpuby1jb25zb2xlXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1dO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBbXTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZVByZWxvYWRpbmcocHJlbG9hZGluZ1N0cmF0ZWd5OiBUeXBlPFByZWxvYWRpbmdTdHJhdGVneT4pOiBQcm92aWRlcltdIHtcbiAgcmV0dXJuIFtcbiAgICBSb3V0ZXJQcmVsb2FkZXIsXG4gICAge3Byb3ZpZGU6IFJPVVRFUl9QUkVMT0FERVIsIHVzZUV4aXN0aW5nOiBSb3V0ZXJQcmVsb2FkZXJ9LFxuICAgIHtwcm92aWRlOiBQcmVsb2FkaW5nU3RyYXRlZ3ksIHVzZUV4aXN0aW5nOiBwcmVsb2FkaW5nU3RyYXRlZ3l9LFxuICBdO1xufVxuIl19