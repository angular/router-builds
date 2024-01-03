/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { HashLocationStrategy, LOCATION_INITIALIZED, LocationStrategy, ViewportScroller } from '@angular/common';
import { APP_BOOTSTRAP_LISTENER, APP_INITIALIZER, ApplicationRef, ENVIRONMENT_INITIALIZER, EnvironmentInjector, inject, InjectFlags, InjectionToken, Injector, makeEnvironmentProviders, NgZone, runInInjectionContext } from '@angular/core';
import { of, Subject } from 'rxjs';
import { INPUT_BINDER, RoutedComponentInputBinder } from './directives/router_outlet';
import { NavigationError, stringifyEvent } from './events';
import { NavigationTransitions } from './navigation_transition';
import { Router } from './router';
import { ROUTER_CONFIGURATION } from './router_config';
import { ROUTES } from './router_config_loader';
import { PreloadingStrategy, RouterPreloader } from './router_preloader';
import { ROUTER_SCROLLER, RouterScroller } from './router_scroller';
import { ActivatedRoute } from './router_state';
import { UrlSerializer } from './url_tree';
import { afterNextNavigation } from './utils/navigations';
import { CREATE_VIEW_TRANSITION, createViewTransition, VIEW_TRANSITION_OPTIONS } from './utils/view_transition';
/**
 * Sets up providers necessary to enable `Router` functionality for the application.
 * Allows to configure a set of routes as well as extra features that should be enabled.
 *
 * @usageNotes
 *
 * Basic example of how you can add a Router to your application:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent, {
 *   providers: [provideRouter(appRoutes)]
 * });
 * ```
 *
 * You can also enable optional features in the Router by adding functions from the `RouterFeatures`
 * type:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes,
 *         withDebugTracing(),
 *         withRouterConfig({paramsInheritanceStrategy: 'always'}))
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link RouterFeatures}
 *
 * @publicApi
 * @param routes A set of `Route`s to use for the application routing table.
 * @param features Optional features to configure additional router behaviors.
 * @returns A set of providers to setup a Router.
 */
export function provideRouter(routes, ...features) {
    return makeEnvironmentProviders([
        { provide: ROUTES, multi: true, useValue: routes },
        (typeof ngDevMode === 'undefined' || ngDevMode) ?
            { provide: ROUTER_IS_PROVIDED, useValue: true } :
            [],
        { provide: ActivatedRoute, useFactory: rootRoute, deps: [Router] },
        { provide: APP_BOOTSTRAP_LISTENER, multi: true, useFactory: getBootstrapListener },
        features.map(feature => feature.ɵproviders),
    ]);
}
export function rootRoute(router) {
    return router.routerState.root;
}
/**
 * Helper function to create an object that represents a Router feature.
 */
function routerFeature(kind, providers) {
    return { ɵkind: kind, ɵproviders: providers };
}
/**
 * An Injection token used to indicate whether `provideRouter` or `RouterModule.forRoot` was ever
 * called.
 */
export const ROUTER_IS_PROVIDED = new InjectionToken('', { providedIn: 'root', factory: () => false });
const routerIsProvidedDevModeCheck = {
    provide: ENVIRONMENT_INITIALIZER,
    multi: true,
    useFactory() {
        return () => {
            if (!inject(ROUTER_IS_PROVIDED)) {
                console.warn('`provideRoutes` was called without `provideRouter` or `RouterModule.forRoot`. ' +
                    'This is likely a mistake.');
            }
        };
    }
};
/**
 * Registers a [DI provider](guide/glossary#provider) for a set of routes.
 * @param routes The route configuration to provide.
 *
 * @usageNotes
 *
 * ```
 * @NgModule({
 *   providers: [provideRoutes(ROUTES)]
 * })
 * class LazyLoadedChildModule {}
 * ```
 *
 * @deprecated If necessary, provide routes using the `ROUTES` `InjectionToken`.
 * @see {@link ROUTES}
 * @publicApi
 */
export function provideRoutes(routes) {
    return [
        { provide: ROUTES, multi: true, useValue: routes },
        (typeof ngDevMode === 'undefined' || ngDevMode) ? routerIsProvidedDevModeCheck : [],
    ];
}
/**
 * Enables customizable scrolling behavior for router navigations.
 *
 * @usageNotes
 *
 * Basic example of how you can enable scrolling feature:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withInMemoryScrolling())
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 * @see {@link ViewportScroller}
 *
 * @publicApi
 * @param options Set of configuration parameters to customize scrolling behavior, see
 *     `InMemoryScrollingOptions` for additional information.
 * @returns A set of providers for use with `provideRouter`.
 */
export function withInMemoryScrolling(options = {}) {
    const providers = [{
            provide: ROUTER_SCROLLER,
            useFactory: () => {
                const viewportScroller = inject(ViewportScroller);
                const zone = inject(NgZone);
                const transitions = inject(NavigationTransitions);
                const urlSerializer = inject(UrlSerializer);
                return new RouterScroller(urlSerializer, transitions, viewportScroller, zone, options);
            },
        }];
    return routerFeature(4 /* RouterFeatureKind.InMemoryScrollingFeature */, providers);
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
        if (injector.get(INITIAL_NAVIGATION) === 1 /* InitialNavigation.EnabledNonBlocking */) {
            router.initialNavigation();
        }
        injector.get(ROUTER_PRELOADER, null, InjectFlags.Optional)?.setUpPreloading();
        injector.get(ROUTER_SCROLLER, null, InjectFlags.Optional)?.init();
        router.resetRootComponentType(ref.componentTypes[0]);
        if (!bootstrapDone.closed) {
            bootstrapDone.next();
            bootstrapDone.complete();
            bootstrapDone.unsubscribe();
        }
    };
}
/**
 * A subject used to indicate that the bootstrapping phase is done. When initial navigation is
 * `enabledBlocking`, the first navigation waits until bootstrapping is finished before continuing
 * to the activation phase.
 */
const BOOTSTRAP_DONE = new InjectionToken((typeof ngDevMode === 'undefined' || ngDevMode) ? 'bootstrap done indicator' : '', {
    factory: () => {
        return new Subject();
    }
});
const INITIAL_NAVIGATION = new InjectionToken((typeof ngDevMode === 'undefined' || ngDevMode) ? 'initial navigation' : '', { providedIn: 'root', factory: () => 1 /* InitialNavigation.EnabledNonBlocking */ });
/**
 * Configures initial navigation to start before the root component is created.
 *
 * The bootstrap is blocked until the initial navigation is complete. This value is required for
 * [server-side rendering](guide/ssr) to work.
 *
 * @usageNotes
 *
 * Basic example of how you can enable this navigation behavior:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withEnabledBlockingInitialNavigation())
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 *
 * @publicApi
 * @returns A set of providers for use with `provideRouter`.
 */
export function withEnabledBlockingInitialNavigation() {
    const providers = [
        { provide: INITIAL_NAVIGATION, useValue: 0 /* InitialNavigation.EnabledBlocking */ },
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [Injector],
            useFactory: (injector) => {
                const locationInitialized = injector.get(LOCATION_INITIALIZED, Promise.resolve());
                return () => {
                    return locationInitialized.then(() => {
                        return new Promise(resolve => {
                            const router = injector.get(Router);
                            const bootstrapDone = injector.get(BOOTSTRAP_DONE);
                            afterNextNavigation(router, () => {
                                // Unblock APP_INITIALIZER in case the initial navigation was canceled or errored
                                // without a redirect.
                                resolve(true);
                            });
                            injector.get(NavigationTransitions).afterPreactivation = () => {
                                // Unblock APP_INITIALIZER once we get to `afterPreactivation`. At this point, we
                                // assume activation will complete successfully (even though this is not
                                // guaranteed).
                                resolve(true);
                                return bootstrapDone.closed ? of(void 0) : bootstrapDone;
                            };
                            router.initialNavigation();
                        });
                    });
                };
            }
        },
    ];
    return routerFeature(2 /* RouterFeatureKind.EnabledBlockingInitialNavigationFeature */, providers);
}
/**
 * Disables initial navigation.
 *
 * Use if there is a reason to have more control over when the router starts its initial navigation
 * due to some complex initialization logic.
 *
 * @usageNotes
 *
 * Basic example of how you can disable initial navigation:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withDisabledInitialNavigation())
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
export function withDisabledInitialNavigation() {
    const providers = [
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
        { provide: INITIAL_NAVIGATION, useValue: 2 /* InitialNavigation.Disabled */ }
    ];
    return routerFeature(3 /* RouterFeatureKind.DisabledInitialNavigationFeature */, providers);
}
/**
 * Enables logging of all internal navigation events to the console.
 * Extra logging might be useful for debugging purposes to inspect Router event sequence.
 *
 * @usageNotes
 *
 * Basic example of how you can enable debug tracing:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withDebugTracing())
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
export function withDebugTracing() {
    let providers = [];
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
        providers = [{
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
        providers = [];
    }
    return routerFeature(1 /* RouterFeatureKind.DebugTracingFeature */, providers);
}
const ROUTER_PRELOADER = new InjectionToken((typeof ngDevMode === 'undefined' || ngDevMode) ? 'router preloader' : '');
/**
 * Allows to configure a preloading strategy to use. The strategy is configured by providing a
 * reference to a class that implements a `PreloadingStrategy`.
 *
 * @usageNotes
 *
 * Basic example of how you can configure preloading:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withPreloading(PreloadAllModules))
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 *
 * @param preloadingStrategy A reference to a class that implements a `PreloadingStrategy` that
 *     should be used.
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
export function withPreloading(preloadingStrategy) {
    const providers = [
        { provide: ROUTER_PRELOADER, useExisting: RouterPreloader },
        { provide: PreloadingStrategy, useExisting: preloadingStrategy },
    ];
    return routerFeature(0 /* RouterFeatureKind.PreloadingFeature */, providers);
}
/**
 * Allows to provide extra parameters to configure Router.
 *
 * @usageNotes
 *
 * Basic example of how you can provide extra configuration options:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withRouterConfig({
 *          onSameUrlNavigation: 'reload'
 *       }))
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 *
 * @param options A set of parameters to configure Router, see `RouterConfigOptions` for
 *     additional information.
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
export function withRouterConfig(options) {
    const providers = [
        { provide: ROUTER_CONFIGURATION, useValue: options },
    ];
    return routerFeature(5 /* RouterFeatureKind.RouterConfigurationFeature */, providers);
}
/**
 * Provides the location strategy that uses the URL fragment instead of the history API.
 *
 * @usageNotes
 *
 * Basic example of how you can use the hash location option:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withHashLocation())
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 * @see {@link HashLocationStrategy}
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
export function withHashLocation() {
    const providers = [
        { provide: LocationStrategy, useClass: HashLocationStrategy },
    ];
    return routerFeature(6 /* RouterFeatureKind.RouterHashLocationFeature */, providers);
}
/**
 * Subscribes to the Router's navigation events and calls the given function when a
 * `NavigationError` happens.
 *
 * This function is run inside application's [injection context](guide/dependency-injection-context)
 * so you can use the [`inject`](api/core/inject) function.
 *
 * @usageNotes
 *
 * Basic example of how you can use the error handler option:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withNavigationErrorHandler((e: NavigationError) =>
 * inject(MyErrorTracker).trackError(e)))
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link NavigationError}
 * @see {@link core/inject}
 * @see {@link runInInjectionContext}
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
export function withNavigationErrorHandler(fn) {
    const providers = [{
            provide: ENVIRONMENT_INITIALIZER,
            multi: true,
            useValue: () => {
                const injector = inject(EnvironmentInjector);
                inject(Router).events.subscribe((e) => {
                    if (e instanceof NavigationError) {
                        runInInjectionContext(injector, () => fn(e));
                    }
                });
            }
        }];
    return routerFeature(7 /* RouterFeatureKind.NavigationErrorHandlerFeature */, providers);
}
/**
 * Enables binding information from the `Router` state directly to the inputs of the component in
 * `Route` configurations.
 *
 * @usageNotes
 *
 * Basic example of how you can enable the feature:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withComponentInputBinding())
 *     ]
 *   }
 * );
 * ```
 *
 * @returns A set of providers for use with `provideRouter`.
 */
export function withComponentInputBinding() {
    const providers = [
        RoutedComponentInputBinder,
        { provide: INPUT_BINDER, useExisting: RoutedComponentInputBinder },
    ];
    return routerFeature(8 /* RouterFeatureKind.ComponentInputBindingFeature */, providers);
}
/**
 * Enables view transitions in the Router by running the route activation and deactivation inside of
 * `document.startViewTransition`.
 *
 * Note: The View Transitions API is not available in all browsers. If the browser does not support
 * view transitions, the Router will not attempt to start a view transition and continue processing
 * the navigation as usual.
 *
 * @usageNotes
 *
 * Basic example of how you can enable the feature:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withViewTransitions())
 *     ]
 *   }
 * );
 * ```
 *
 * @returns A set of providers for use with `provideRouter`.
 * @see https://developer.chrome.com/docs/web-platform/view-transitions/
 * @see https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
 * @experimental
 */
export function withViewTransitions(options) {
    const providers = [
        { provide: CREATE_VIEW_TRANSITION, useValue: createViewTransition },
        {
            provide: VIEW_TRANSITION_OPTIONS,
            useValue: { skipNextTransition: !!options?.skipInitialTransition, ...options }
        },
    ];
    return routerFeature(9 /* RouterFeatureKind.ViewTransitionsFeature */, providers);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZV9yb3V0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3Byb3ZpZGVfcm91dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQy9HLE9BQU8sRUFBQyxzQkFBc0IsRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFnQix1QkFBdUIsRUFBRSxtQkFBbUIsRUFBd0IsTUFBTSxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLHdCQUF3QixFQUFFLE1BQU0sRUFBWSxxQkFBcUIsRUFBTyxNQUFNLGVBQWUsQ0FBQztBQUNoUyxPQUFPLEVBQUMsRUFBRSxFQUFFLE9BQU8sRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUVqQyxPQUFPLEVBQUMsWUFBWSxFQUFFLDBCQUEwQixFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFDcEYsT0FBTyxFQUFRLGVBQWUsRUFBRSxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFFaEUsT0FBTyxFQUFDLHFCQUFxQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDOUQsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLEVBQTJCLG9CQUFvQixFQUFzQixNQUFNLGlCQUFpQixDQUFDO0FBQ3BHLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUM5QyxPQUFPLEVBQUMsa0JBQWtCLEVBQUUsZUFBZSxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDdkUsT0FBTyxFQUFDLGVBQWUsRUFBRSxjQUFjLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUNsRSxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDOUMsT0FB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QUM7U0FDN0U7S0FDRixDQUFDO0lBQ0YsT0FBTyxhQUFhLG1EQUEyQyxTQUFTLENBQUMsQ0FBQztBQUM1RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SGFzaExvY2F0aW9uU3RyYXRlZ3ksIExPQ0FUSU9OX0lOSVRJQUxJWkVELCBMb2NhdGlvblN0cmF0ZWd5LCBWaWV3cG9ydFNjcm9sbGVyfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLCBBUFBfSU5JVElBTElaRVIsIEFwcGxpY2F0aW9uUmVmLCBDb21wb25lbnRSZWYsIEVOVklST05NRU5UX0lOSVRJQUxJWkVSLCBFbnZpcm9ubWVudEluamVjdG9yLCBFbnZpcm9ubWVudFByb3ZpZGVycywgaW5qZWN0LCBJbmplY3RGbGFncywgSW5qZWN0aW9uVG9rZW4sIEluamVjdG9yLCBtYWtlRW52aXJvbm1lbnRQcm92aWRlcnMsIE5nWm9uZSwgUHJvdmlkZXIsIHJ1bkluSW5qZWN0aW9uQ29udGV4dCwgVHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge29mLCBTdWJqZWN0fSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtJTlBVVF9CSU5ERVIsIFJvdXRlZENvbXBvbmVudElucHV0QmluZGVyfSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX291dGxldCc7XG5pbXBvcnQge0V2ZW50LCBOYXZpZ2F0aW9uRXJyb3IsIHN0cmluZ2lmeUV2ZW50fSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge1JvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtOYXZpZ2F0aW9uVHJhbnNpdGlvbnN9IGZyb20gJy4vbmF2aWdhdGlvbl90cmFuc2l0aW9uJztcbmltcG9ydCB7Um91dGVyfSBmcm9tICcuL3JvdXRlcic7XG5pbXBvcnQge0luTWVtb3J5U2Nyb2xsaW5nT3B0aW9ucywgUk9VVEVSX0NPTkZJR1VSQVRJT04sIFJvdXRlckNvbmZpZ09wdGlvbnN9IGZyb20gJy4vcm91dGVyX2NvbmZpZyc7XG5pbXBvcnQge1JPVVRFU30gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge1ByZWxvYWRpbmdTdHJhdGVneSwgUm91dGVyUHJlbG9hZGVyfSBmcm9tICcuL3JvdXRlcl9wcmVsb2FkZXInO1xuaW1wb3J0IHtST1VURVJfU0NST0xMRVIsIFJvdXRlclNjcm9sbGVyfSBmcm9tICcuL3JvdXRlcl9zY3JvbGxlcic7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlfSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1VybFNlcmlhbGl6ZXJ9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHthZnRlck5leHROYXZpZ2F0aW9ufSBmcm9tICcuL3V0aWxzL25hdmlnYXRpb25zJztcbmltcG9ydCB7Q1JFQVRFX1ZJRVdfVFJBTlNJVElPTiwgY3JlYXRlVmlld1RyYW5zaXRpb24sIFZJRVdfVFJBTlNJVElPTl9PUFRJT05TLCBWaWV3VHJhbnNpdGlvbnNGZWF0dXJlT3B0aW9uc30gZnJvbSAnLi91dGlscy92aWV3X3RyYW5zaXRpb24nO1xuXG5cbi8qKlxuICogU2V0cyB1cCBwcm92aWRlcnMgbmVjZXNzYXJ5IHRvIGVuYWJsZSBgUm91dGVyYCBmdW5jdGlvbmFsaXR5IGZvciB0aGUgYXBwbGljYXRpb24uXG4gKiBBbGxvd3MgdG8gY29uZmlndXJlIGEgc2V0IG9mIHJvdXRlcyBhcyB3ZWxsIGFzIGV4dHJhIGZlYXR1cmVzIHRoYXQgc2hvdWxkIGJlIGVuYWJsZWQuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBCYXNpYyBleGFtcGxlIG9mIGhvdyB5b3UgY2FuIGFkZCBhIFJvdXRlciB0byB5b3VyIGFwcGxpY2F0aW9uOlxuICogYGBgXG4gKiBjb25zdCBhcHBSb3V0ZXM6IFJvdXRlcyA9IFtdO1xuICogYm9vdHN0cmFwQXBwbGljYXRpb24oQXBwQ29tcG9uZW50LCB7XG4gKiAgIHByb3ZpZGVyczogW3Byb3ZpZGVSb3V0ZXIoYXBwUm91dGVzKV1cbiAqIH0pO1xuICogYGBgXG4gKlxuICogWW91IGNhbiBhbHNvIGVuYWJsZSBvcHRpb25hbCBmZWF0dXJlcyBpbiB0aGUgUm91dGVyIGJ5IGFkZGluZyBmdW5jdGlvbnMgZnJvbSB0aGUgYFJvdXRlckZlYXR1cmVzYFxuICogdHlwZTpcbiAqIGBgYFxuICogY29uc3QgYXBwUm91dGVzOiBSb3V0ZXMgPSBbXTtcbiAqIGJvb3RzdHJhcEFwcGxpY2F0aW9uKEFwcENvbXBvbmVudCxcbiAqICAge1xuICogICAgIHByb3ZpZGVyczogW1xuICogICAgICAgcHJvdmlkZVJvdXRlcihhcHBSb3V0ZXMsXG4gKiAgICAgICAgIHdpdGhEZWJ1Z1RyYWNpbmcoKSxcbiAqICAgICAgICAgd2l0aFJvdXRlckNvbmZpZyh7cGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogJ2Fsd2F5cyd9KSlcbiAqICAgICBdXG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqXG4gKiBAc2VlIHtAbGluayBSb3V0ZXJGZWF0dXJlc31cbiAqXG4gKiBAcHVibGljQXBpXG4gKiBAcGFyYW0gcm91dGVzIEEgc2V0IG9mIGBSb3V0ZWBzIHRvIHVzZSBmb3IgdGhlIGFwcGxpY2F0aW9uIHJvdXRpbmcgdGFibGUuXG4gKiBAcGFyYW0gZmVhdHVyZXMgT3B0aW9uYWwgZmVhdHVyZXMgdG8gY29uZmlndXJlIGFkZGl0aW9uYWwgcm91dGVyIGJlaGF2aW9ycy5cbiAqIEByZXR1cm5zIEEgc2V0IG9mIHByb3ZpZGVycyB0byBzZXR1cCBhIFJvdXRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVSb3V0ZXIocm91dGVzOiBSb3V0ZXMsIC4uLmZlYXR1cmVzOiBSb3V0ZXJGZWF0dXJlc1tdKTogRW52aXJvbm1lbnRQcm92aWRlcnMge1xuICByZXR1cm4gbWFrZUVudmlyb25tZW50UHJvdmlkZXJzKFtcbiAgICB7cHJvdmlkZTogUk9VVEVTLCBtdWx0aTogdHJ1ZSwgdXNlVmFsdWU6IHJvdXRlc30sXG4gICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgP1xuICAgICAgICB7cHJvdmlkZTogUk9VVEVSX0lTX1BST1ZJREVELCB1c2VWYWx1ZTogdHJ1ZX0gOlxuICAgICAgICBbXSxcbiAgICB7cHJvdmlkZTogQWN0aXZhdGVkUm91dGUsIHVzZUZhY3Rvcnk6IHJvb3RSb3V0ZSwgZGVwczogW1JvdXRlcl19LFxuICAgIHtwcm92aWRlOiBBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLCBtdWx0aTogdHJ1ZSwgdXNlRmFjdG9yeTogZ2V0Qm9vdHN0cmFwTGlzdGVuZXJ9LFxuICAgIGZlYXR1cmVzLm1hcChmZWF0dXJlID0+IGZlYXR1cmUuybVwcm92aWRlcnMpLFxuICBdKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJvb3RSb3V0ZShyb3V0ZXI6IFJvdXRlcik6IEFjdGl2YXRlZFJvdXRlIHtcbiAgcmV0dXJuIHJvdXRlci5yb3V0ZXJTdGF0ZS5yb290O1xufVxuXG4vKipcbiAqIEhlbHBlciB0eXBlIHRvIHJlcHJlc2VudCBhIFJvdXRlciBmZWF0dXJlLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSb3V0ZXJGZWF0dXJlPEZlYXR1cmVLaW5kIGV4dGVuZHMgUm91dGVyRmVhdHVyZUtpbmQ+IHtcbiAgybVraW5kOiBGZWF0dXJlS2luZDtcbiAgybVwcm92aWRlcnM6IFByb3ZpZGVyW107XG59XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIHRvIGNyZWF0ZSBhbiBvYmplY3QgdGhhdCByZXByZXNlbnRzIGEgUm91dGVyIGZlYXR1cmUuXG4gKi9cbmZ1bmN0aW9uIHJvdXRlckZlYXR1cmU8RmVhdHVyZUtpbmQgZXh0ZW5kcyBSb3V0ZXJGZWF0dXJlS2luZD4oXG4gICAga2luZDogRmVhdHVyZUtpbmQsIHByb3ZpZGVyczogUHJvdmlkZXJbXSk6IFJvdXRlckZlYXR1cmU8RmVhdHVyZUtpbmQ+IHtcbiAgcmV0dXJuIHvJtWtpbmQ6IGtpbmQsIMm1cHJvdmlkZXJzOiBwcm92aWRlcnN9O1xufVxuXG5cbi8qKlxuICogQW4gSW5qZWN0aW9uIHRva2VuIHVzZWQgdG8gaW5kaWNhdGUgd2hldGhlciBgcHJvdmlkZVJvdXRlcmAgb3IgYFJvdXRlck1vZHVsZS5mb3JSb290YCB3YXMgZXZlclxuICogY2FsbGVkLlxuICovXG5leHBvcnQgY29uc3QgUk9VVEVSX0lTX1BST1ZJREVEID1cbiAgICBuZXcgSW5qZWN0aW9uVG9rZW48Ym9vbGVhbj4oJycsIHtwcm92aWRlZEluOiAncm9vdCcsIGZhY3Rvcnk6ICgpID0+IGZhbHNlfSk7XG5cbmNvbnN0IHJvdXRlcklzUHJvdmlkZWREZXZNb2RlQ2hlY2sgPSB7XG4gIHByb3ZpZGU6IEVOVklST05NRU5UX0lOSVRJQUxJWkVSLFxuICBtdWx0aTogdHJ1ZSxcbiAgdXNlRmFjdG9yeSgpIHtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgaWYgKCFpbmplY3QoUk9VVEVSX0lTX1BST1ZJREVEKSkge1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgICAnYHByb3ZpZGVSb3V0ZXNgIHdhcyBjYWxsZWQgd2l0aG91dCBgcHJvdmlkZVJvdXRlcmAgb3IgYFJvdXRlck1vZHVsZS5mb3JSb290YC4gJyArXG4gICAgICAgICAgICAnVGhpcyBpcyBsaWtlbHkgYSBtaXN0YWtlLicpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn07XG5cbi8qKlxuICogUmVnaXN0ZXJzIGEgW0RJIHByb3ZpZGVyXShndWlkZS9nbG9zc2FyeSNwcm92aWRlcikgZm9yIGEgc2V0IG9mIHJvdXRlcy5cbiAqIEBwYXJhbSByb3V0ZXMgVGhlIHJvdXRlIGNvbmZpZ3VyYXRpb24gdG8gcHJvdmlkZS5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIGBgYFxuICogQE5nTW9kdWxlKHtcbiAqICAgcHJvdmlkZXJzOiBbcHJvdmlkZVJvdXRlcyhST1VURVMpXVxuICogfSlcbiAqIGNsYXNzIExhenlMb2FkZWRDaGlsZE1vZHVsZSB7fVxuICogYGBgXG4gKlxuICogQGRlcHJlY2F0ZWQgSWYgbmVjZXNzYXJ5LCBwcm92aWRlIHJvdXRlcyB1c2luZyB0aGUgYFJPVVRFU2AgYEluamVjdGlvblRva2VuYC5cbiAqIEBzZWUge0BsaW5rIFJPVVRFU31cbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVSb3V0ZXMocm91dGVzOiBSb3V0ZXMpOiBQcm92aWRlcltdIHtcbiAgcmV0dXJuIFtcbiAgICB7cHJvdmlkZTogUk9VVEVTLCBtdWx0aTogdHJ1ZSwgdXNlVmFsdWU6IHJvdXRlc30sXG4gICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgPyByb3V0ZXJJc1Byb3ZpZGVkRGV2TW9kZUNoZWNrIDogW10sXG4gIF07XG59XG5cbi8qKlxuICogQSB0eXBlIGFsaWFzIGZvciBwcm92aWRlcnMgcmV0dXJuZWQgYnkgYHdpdGhJbk1lbW9yeVNjcm9sbGluZ2AgZm9yIHVzZSB3aXRoIGBwcm92aWRlUm91dGVyYC5cbiAqXG4gKiBAc2VlIHtAbGluayB3aXRoSW5NZW1vcnlTY3JvbGxpbmd9XG4gKiBAc2VlIHtAbGluayBwcm92aWRlUm91dGVyfVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgSW5NZW1vcnlTY3JvbGxpbmdGZWF0dXJlID0gUm91dGVyRmVhdHVyZTxSb3V0ZXJGZWF0dXJlS2luZC5Jbk1lbW9yeVNjcm9sbGluZ0ZlYXR1cmU+O1xuXG4vKipcbiAqIEVuYWJsZXMgY3VzdG9taXphYmxlIHNjcm9sbGluZyBiZWhhdmlvciBmb3Igcm91dGVyIG5hdmlnYXRpb25zLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogQmFzaWMgZXhhbXBsZSBvZiBob3cgeW91IGNhbiBlbmFibGUgc2Nyb2xsaW5nIGZlYXR1cmU6XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLCB3aXRoSW5NZW1vcnlTY3JvbGxpbmcoKSlcbiAqICAgICBdXG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqXG4gKiBAc2VlIHtAbGluayBwcm92aWRlUm91dGVyfVxuICogQHNlZSB7QGxpbmsgVmlld3BvcnRTY3JvbGxlcn1cbiAqXG4gKiBAcHVibGljQXBpXG4gKiBAcGFyYW0gb3B0aW9ucyBTZXQgb2YgY29uZmlndXJhdGlvbiBwYXJhbWV0ZXJzIHRvIGN1c3RvbWl6ZSBzY3JvbGxpbmcgYmVoYXZpb3IsIHNlZVxuICogICAgIGBJbk1lbW9yeVNjcm9sbGluZ09wdGlvbnNgIGZvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uLlxuICogQHJldHVybnMgQSBzZXQgb2YgcHJvdmlkZXJzIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXRoSW5NZW1vcnlTY3JvbGxpbmcob3B0aW9uczogSW5NZW1vcnlTY3JvbGxpbmdPcHRpb25zID0ge30pOlxuICAgIEluTWVtb3J5U2Nyb2xsaW5nRmVhdHVyZSB7XG4gIGNvbnN0IHByb3ZpZGVycyA9IFt7XG4gICAgcHJvdmlkZTogUk9VVEVSX1NDUk9MTEVSLFxuICAgIHVzZUZhY3Rvcnk6ICgpID0+IHtcbiAgICAgIGNvbnN0IHZpZXdwb3J0U2Nyb2xsZXIgPSBpbmplY3QoVmlld3BvcnRTY3JvbGxlcik7XG4gICAgICBjb25zdCB6b25lID0gaW5qZWN0KE5nWm9uZSk7XG4gICAgICBjb25zdCB0cmFuc2l0aW9ucyA9IGluamVjdChOYXZpZ2F0aW9uVHJhbnNpdGlvbnMpO1xuICAgICAgY29uc3QgdXJsU2VyaWFsaXplciA9IGluamVjdChVcmxTZXJpYWxpemVyKTtcbiAgICAgIHJldHVybiBuZXcgUm91dGVyU2Nyb2xsZXIodXJsU2VyaWFsaXplciwgdHJhbnNpdGlvbnMsIHZpZXdwb3J0U2Nyb2xsZXIsIHpvbmUsIG9wdGlvbnMpO1xuICAgIH0sXG4gIH1dO1xuICByZXR1cm4gcm91dGVyRmVhdHVyZShSb3V0ZXJGZWF0dXJlS2luZC5Jbk1lbW9yeVNjcm9sbGluZ0ZlYXR1cmUsIHByb3ZpZGVycyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRCb290c3RyYXBMaXN0ZW5lcigpIHtcbiAgY29uc3QgaW5qZWN0b3IgPSBpbmplY3QoSW5qZWN0b3IpO1xuICByZXR1cm4gKGJvb3RzdHJhcHBlZENvbXBvbmVudFJlZjogQ29tcG9uZW50UmVmPHVua25vd24+KSA9PiB7XG4gICAgY29uc3QgcmVmID0gaW5qZWN0b3IuZ2V0KEFwcGxpY2F0aW9uUmVmKTtcblxuICAgIGlmIChib290c3RyYXBwZWRDb21wb25lbnRSZWYgIT09IHJlZi5jb21wb25lbnRzWzBdKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgcm91dGVyID0gaW5qZWN0b3IuZ2V0KFJvdXRlcik7XG4gICAgY29uc3QgYm9vdHN0cmFwRG9uZSA9IGluamVjdG9yLmdldChCT09UU1RSQVBfRE9ORSk7XG5cbiAgICBpZiAoaW5qZWN0b3IuZ2V0KElOSVRJQUxfTkFWSUdBVElPTikgPT09IEluaXRpYWxOYXZpZ2F0aW9uLkVuYWJsZWROb25CbG9ja2luZykge1xuICAgICAgcm91dGVyLmluaXRpYWxOYXZpZ2F0aW9uKCk7XG4gICAgfVxuXG4gICAgaW5qZWN0b3IuZ2V0KFJPVVRFUl9QUkVMT0FERVIsIG51bGwsIEluamVjdEZsYWdzLk9wdGlvbmFsKT8uc2V0VXBQcmVsb2FkaW5nKCk7XG4gICAgaW5qZWN0b3IuZ2V0KFJPVVRFUl9TQ1JPTExFUiwgbnVsbCwgSW5qZWN0RmxhZ3MuT3B0aW9uYWwpPy5pbml0KCk7XG4gICAgcm91dGVyLnJlc2V0Um9vdENvbXBvbmVudFR5cGUocmVmLmNvbXBvbmVudFR5cGVzWzBdKTtcbiAgICBpZiAoIWJvb3RzdHJhcERvbmUuY2xvc2VkKSB7XG4gICAgICBib290c3RyYXBEb25lLm5leHQoKTtcbiAgICAgIGJvb3RzdHJhcERvbmUuY29tcGxldGUoKTtcbiAgICAgIGJvb3RzdHJhcERvbmUudW5zdWJzY3JpYmUoKTtcbiAgICB9XG4gIH07XG59XG5cbi8qKlxuICogQSBzdWJqZWN0IHVzZWQgdG8gaW5kaWNhdGUgdGhhdCB0aGUgYm9vdHN0cmFwcGluZyBwaGFzZSBpcyBkb25lLiBXaGVuIGluaXRpYWwgbmF2aWdhdGlvbiBpc1xuICogYGVuYWJsZWRCbG9ja2luZ2AsIHRoZSBmaXJzdCBuYXZpZ2F0aW9uIHdhaXRzIHVudGlsIGJvb3RzdHJhcHBpbmcgaXMgZmluaXNoZWQgYmVmb3JlIGNvbnRpbnVpbmdcbiAqIHRvIHRoZSBhY3RpdmF0aW9uIHBoYXNlLlxuICovXG5jb25zdCBCT09UU1RSQVBfRE9ORSA9IG5ldyBJbmplY3Rpb25Ub2tlbjxTdWJqZWN0PHZvaWQ+PihcbiAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSA/ICdib290c3RyYXAgZG9uZSBpbmRpY2F0b3InIDogJycsIHtcbiAgICAgIGZhY3Rvcnk6ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG4gICAgICB9XG4gICAgfSk7XG5cbi8qKlxuICogVGhpcyBhbmQgdGhlIElOSVRJQUxfTkFWSUdBVElPTiB0b2tlbiBhcmUgdXNlZCBpbnRlcm5hbGx5IG9ubHkuIFRoZSBwdWJsaWMgQVBJIHNpZGUgb2YgdGhpcyBpc1xuICogY29uZmlndXJlZCB0aHJvdWdoIHRoZSBgRXh0cmFPcHRpb25zYC5cbiAqXG4gKiBXaGVuIHNldCB0byBgRW5hYmxlZEJsb2NraW5nYCwgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBzdGFydHMgYmVmb3JlIHRoZSByb290XG4gKiBjb21wb25lbnQgaXMgY3JlYXRlZC4gVGhlIGJvb3RzdHJhcCBpcyBibG9ja2VkIHVudGlsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgY29tcGxldGUuIFRoaXNcbiAqIHZhbHVlIGlzIHJlcXVpcmVkIGZvciBbc2VydmVyLXNpZGUgcmVuZGVyaW5nXShndWlkZS9zc3IpIHRvIHdvcmsuXG4gKlxuICogV2hlbiBzZXQgdG8gYEVuYWJsZWROb25CbG9ja2luZ2AsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gc3RhcnRzIGFmdGVyIHRoZSByb290IGNvbXBvbmVudCBoYXMgYmVlblxuICogY3JlYXRlZC4gVGhlIGJvb3RzdHJhcCBpcyBub3QgYmxvY2tlZCBvbiB0aGUgY29tcGxldGlvbiBvZiB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICpcbiAqIFdoZW4gc2V0IHRvIGBEaXNhYmxlZGAsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgbm90IHBlcmZvcm1lZC4gVGhlIGxvY2F0aW9uIGxpc3RlbmVyIGlzIHNldCB1cFxuICogYmVmb3JlIHRoZSByb290IGNvbXBvbmVudCBnZXRzIGNyZWF0ZWQuIFVzZSBpZiB0aGVyZSBpcyBhIHJlYXNvbiB0byBoYXZlIG1vcmUgY29udHJvbCBvdmVyIHdoZW5cbiAqIHRoZSByb3V0ZXIgc3RhcnRzIGl0cyBpbml0aWFsIG5hdmlnYXRpb24gZHVlIHRvIHNvbWUgY29tcGxleCBpbml0aWFsaXphdGlvbiBsb2dpYy5cbiAqXG4gKiBAc2VlIHtAbGluayBFeHRyYU9wdGlvbnN9XG4gKi9cbmNvbnN0IGVudW0gSW5pdGlhbE5hdmlnYXRpb24ge1xuICBFbmFibGVkQmxvY2tpbmcsXG4gIEVuYWJsZWROb25CbG9ja2luZyxcbiAgRGlzYWJsZWQsXG59XG5cbmNvbnN0IElOSVRJQUxfTkFWSUdBVElPTiA9IG5ldyBJbmplY3Rpb25Ub2tlbjxJbml0aWFsTmF2aWdhdGlvbj4oXG4gICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgPyAnaW5pdGlhbCBuYXZpZ2F0aW9uJyA6ICcnLFxuICAgIHtwcm92aWRlZEluOiAncm9vdCcsIGZhY3Rvcnk6ICgpID0+IEluaXRpYWxOYXZpZ2F0aW9uLkVuYWJsZWROb25CbG9ja2luZ30pO1xuXG4vKipcbiAqIEEgdHlwZSBhbGlhcyBmb3IgcHJvdmlkZXJzIHJldHVybmVkIGJ5IGB3aXRoRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb25gIGZvciB1c2Ugd2l0aFxuICogYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBzZWUge0BsaW5rIHdpdGhFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbn1cbiAqIEBzZWUge0BsaW5rIHByb3ZpZGVSb3V0ZXJ9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUgPVxuICAgIFJvdXRlckZlYXR1cmU8Um91dGVyRmVhdHVyZUtpbmQuRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb25GZWF0dXJlPjtcblxuLyoqXG4gKiBBIHR5cGUgYWxpYXMgZm9yIHByb3ZpZGVycyByZXR1cm5lZCBieSBgd2l0aEVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uYCBvclxuICogYHdpdGhEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uYCBmdW5jdGlvbnMgZm9yIHVzZSB3aXRoIGBwcm92aWRlUm91dGVyYC5cbiAqXG4gKiBAc2VlIHtAbGluayB3aXRoRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb259XG4gKiBAc2VlIHtAbGluayB3aXRoRGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbn1cbiAqIEBzZWUge0BsaW5rIHByb3ZpZGVSb3V0ZXJ9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUgPVxuICAgIEVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZXxEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZTtcblxuLyoqXG4gKiBDb25maWd1cmVzIGluaXRpYWwgbmF2aWdhdGlvbiB0byBzdGFydCBiZWZvcmUgdGhlIHJvb3QgY29tcG9uZW50IGlzIGNyZWF0ZWQuXG4gKlxuICogVGhlIGJvb3RzdHJhcCBpcyBibG9ja2VkIHVudGlsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgY29tcGxldGUuIFRoaXMgdmFsdWUgaXMgcmVxdWlyZWQgZm9yXG4gKiBbc2VydmVyLXNpZGUgcmVuZGVyaW5nXShndWlkZS9zc3IpIHRvIHdvcmsuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBCYXNpYyBleGFtcGxlIG9mIGhvdyB5b3UgY2FuIGVuYWJsZSB0aGlzIG5hdmlnYXRpb24gYmVoYXZpb3I6XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLCB3aXRoRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb24oKSlcbiAqICAgICBdXG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqXG4gKiBAc2VlIHtAbGluayBwcm92aWRlUm91dGVyfVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqIEByZXR1cm5zIEEgc2V0IG9mIHByb3ZpZGVycyBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aEVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uKCk6IEVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZSB7XG4gIGNvbnN0IHByb3ZpZGVycyA9IFtcbiAgICB7cHJvdmlkZTogSU5JVElBTF9OQVZJR0FUSU9OLCB1c2VWYWx1ZTogSW5pdGlhbE5hdmlnYXRpb24uRW5hYmxlZEJsb2NraW5nfSxcbiAgICB7XG4gICAgICBwcm92aWRlOiBBUFBfSU5JVElBTElaRVIsXG4gICAgICBtdWx0aTogdHJ1ZSxcbiAgICAgIGRlcHM6IFtJbmplY3Rvcl0sXG4gICAgICB1c2VGYWN0b3J5OiAoaW5qZWN0b3I6IEluamVjdG9yKSA9PiB7XG4gICAgICAgIGNvbnN0IGxvY2F0aW9uSW5pdGlhbGl6ZWQ6IFByb21pc2U8YW55PiA9XG4gICAgICAgICAgICBpbmplY3Rvci5nZXQoTE9DQVRJT05fSU5JVElBTElaRUQsIFByb21pc2UucmVzb2x2ZSgpKTtcblxuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgIHJldHVybiBsb2NhdGlvbkluaXRpYWxpemVkLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgICBjb25zdCByb3V0ZXIgPSBpbmplY3Rvci5nZXQoUm91dGVyKTtcbiAgICAgICAgICAgICAgY29uc3QgYm9vdHN0cmFwRG9uZSA9IGluamVjdG9yLmdldChCT09UU1RSQVBfRE9ORSk7XG4gICAgICAgICAgICAgIGFmdGVyTmV4dE5hdmlnYXRpb24ocm91dGVyLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVW5ibG9jayBBUFBfSU5JVElBTElaRVIgaW4gY2FzZSB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIHdhcyBjYW5jZWxlZCBvciBlcnJvcmVkXG4gICAgICAgICAgICAgICAgLy8gd2l0aG91dCBhIHJlZGlyZWN0LlxuICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgIGluamVjdG9yLmdldChOYXZpZ2F0aW9uVHJhbnNpdGlvbnMpLmFmdGVyUHJlYWN0aXZhdGlvbiA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBVbmJsb2NrIEFQUF9JTklUSUFMSVpFUiBvbmNlIHdlIGdldCB0byBgYWZ0ZXJQcmVhY3RpdmF0aW9uYC4gQXQgdGhpcyBwb2ludCwgd2VcbiAgICAgICAgICAgICAgICAvLyBhc3N1bWUgYWN0aXZhdGlvbiB3aWxsIGNvbXBsZXRlIHN1Y2Nlc3NmdWxseSAoZXZlbiB0aG91Z2ggdGhpcyBpcyBub3RcbiAgICAgICAgICAgICAgICAvLyBndWFyYW50ZWVkKS5cbiAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBib290c3RyYXBEb25lLmNsb3NlZCA/IG9mKHZvaWQgMCkgOiBib290c3RyYXBEb25lO1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICByb3V0ZXIuaW5pdGlhbE5hdmlnYXRpb24oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0sXG4gIF07XG4gIHJldHVybiByb3V0ZXJGZWF0dXJlKFJvdXRlckZlYXR1cmVLaW5kLkVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZSwgcHJvdmlkZXJzKTtcbn1cblxuLyoqXG4gKiBBIHR5cGUgYWxpYXMgZm9yIHByb3ZpZGVycyByZXR1cm5lZCBieSBgd2l0aERpc2FibGVkSW5pdGlhbE5hdmlnYXRpb25gIGZvciB1c2Ugd2l0aFxuICogYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBzZWUge0BsaW5rIHdpdGhEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9ufVxuICogQHNlZSB7QGxpbmsgcHJvdmlkZVJvdXRlcn1cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIERpc2FibGVkSW5pdGlhbE5hdmlnYXRpb25GZWF0dXJlID1cbiAgICBSb3V0ZXJGZWF0dXJlPFJvdXRlckZlYXR1cmVLaW5kLkRpc2FibGVkSW5pdGlhbE5hdmlnYXRpb25GZWF0dXJlPjtcblxuLyoqXG4gKiBEaXNhYmxlcyBpbml0aWFsIG5hdmlnYXRpb24uXG4gKlxuICogVXNlIGlmIHRoZXJlIGlzIGEgcmVhc29uIHRvIGhhdmUgbW9yZSBjb250cm9sIG92ZXIgd2hlbiB0aGUgcm91dGVyIHN0YXJ0cyBpdHMgaW5pdGlhbCBuYXZpZ2F0aW9uXG4gKiBkdWUgdG8gc29tZSBjb21wbGV4IGluaXRpYWxpemF0aW9uIGxvZ2ljLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogQmFzaWMgZXhhbXBsZSBvZiBob3cgeW91IGNhbiBkaXNhYmxlIGluaXRpYWwgbmF2aWdhdGlvbjpcbiAqIGBgYFxuICogY29uc3QgYXBwUm91dGVzOiBSb3V0ZXMgPSBbXTtcbiAqIGJvb3RzdHJhcEFwcGxpY2F0aW9uKEFwcENvbXBvbmVudCxcbiAqICAge1xuICogICAgIHByb3ZpZGVyczogW1xuICogICAgICAgcHJvdmlkZVJvdXRlcihhcHBSb3V0ZXMsIHdpdGhEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uKCkpXG4gKiAgICAgXVxuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQHNlZSB7QGxpbmsgcHJvdmlkZVJvdXRlcn1cbiAqXG4gKiBAcmV0dXJucyBBIHNldCBvZiBwcm92aWRlcnMgZm9yIHVzZSB3aXRoIGBwcm92aWRlUm91dGVyYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXRoRGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbigpOiBEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZSB7XG4gIGNvbnN0IHByb3ZpZGVycyA9IFtcbiAgICB7XG4gICAgICBwcm92aWRlOiBBUFBfSU5JVElBTElaRVIsXG4gICAgICBtdWx0aTogdHJ1ZSxcbiAgICAgIHVzZUZhY3Rvcnk6ICgpID0+IHtcbiAgICAgICAgY29uc3Qgcm91dGVyID0gaW5qZWN0KFJvdXRlcik7XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgcm91dGVyLnNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0sXG4gICAge3Byb3ZpZGU6IElOSVRJQUxfTkFWSUdBVElPTiwgdXNlVmFsdWU6IEluaXRpYWxOYXZpZ2F0aW9uLkRpc2FibGVkfVxuICBdO1xuICByZXR1cm4gcm91dGVyRmVhdHVyZShSb3V0ZXJGZWF0dXJlS2luZC5EaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZSwgcHJvdmlkZXJzKTtcbn1cblxuLyoqXG4gKiBBIHR5cGUgYWxpYXMgZm9yIHByb3ZpZGVycyByZXR1cm5lZCBieSBgd2l0aERlYnVnVHJhY2luZ2AgZm9yIHVzZSB3aXRoIGBwcm92aWRlUm91dGVyYC5cbiAqXG4gKiBAc2VlIHtAbGluayB3aXRoRGVidWdUcmFjaW5nfVxuICogQHNlZSB7QGxpbmsgcHJvdmlkZVJvdXRlcn1cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIERlYnVnVHJhY2luZ0ZlYXR1cmUgPSBSb3V0ZXJGZWF0dXJlPFJvdXRlckZlYXR1cmVLaW5kLkRlYnVnVHJhY2luZ0ZlYXR1cmU+O1xuXG4vKipcbiAqIEVuYWJsZXMgbG9nZ2luZyBvZiBhbGwgaW50ZXJuYWwgbmF2aWdhdGlvbiBldmVudHMgdG8gdGhlIGNvbnNvbGUuXG4gKiBFeHRyYSBsb2dnaW5nIG1pZ2h0IGJlIHVzZWZ1bCBmb3IgZGVidWdnaW5nIHB1cnBvc2VzIHRvIGluc3BlY3QgUm91dGVyIGV2ZW50IHNlcXVlbmNlLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogQmFzaWMgZXhhbXBsZSBvZiBob3cgeW91IGNhbiBlbmFibGUgZGVidWcgdHJhY2luZzpcbiAqIGBgYFxuICogY29uc3QgYXBwUm91dGVzOiBSb3V0ZXMgPSBbXTtcbiAqIGJvb3RzdHJhcEFwcGxpY2F0aW9uKEFwcENvbXBvbmVudCxcbiAqICAge1xuICogICAgIHByb3ZpZGVyczogW1xuICogICAgICAgcHJvdmlkZVJvdXRlcihhcHBSb3V0ZXMsIHdpdGhEZWJ1Z1RyYWNpbmcoKSlcbiAqICAgICBdXG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqXG4gKiBAc2VlIHtAbGluayBwcm92aWRlUm91dGVyfVxuICpcbiAqIEByZXR1cm5zIEEgc2V0IG9mIHByb3ZpZGVycyBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhEZWJ1Z1RyYWNpbmcoKTogRGVidWdUcmFjaW5nRmVhdHVyZSB7XG4gIGxldCBwcm92aWRlcnM6IFByb3ZpZGVyW10gPSBbXTtcbiAgaWYgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkge1xuICAgIHByb3ZpZGVycyA9IFt7XG4gICAgICBwcm92aWRlOiBFTlZJUk9OTUVOVF9JTklUSUFMSVpFUixcbiAgICAgIG11bHRpOiB0cnVlLFxuICAgICAgdXNlRmFjdG9yeTogKCkgPT4ge1xuICAgICAgICBjb25zdCByb3V0ZXIgPSBpbmplY3QoUm91dGVyKTtcbiAgICAgICAgcmV0dXJuICgpID0+IHJvdXRlci5ldmVudHMuc3Vic2NyaWJlKChlOiBFdmVudCkgPT4ge1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmdyb3VwPy4oYFJvdXRlciBFdmVudDogJHsoPGFueT5lLmNvbnN0cnVjdG9yKS5uYW1lfWApO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHN0cmluZ2lmeUV2ZW50KGUpKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICBjb25zb2xlLmdyb3VwRW5kPy4oKTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZW5hYmxlOm5vLWNvbnNvbGVcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfV07XG4gIH0gZWxzZSB7XG4gICAgcHJvdmlkZXJzID0gW107XG4gIH1cbiAgcmV0dXJuIHJvdXRlckZlYXR1cmUoUm91dGVyRmVhdHVyZUtpbmQuRGVidWdUcmFjaW5nRmVhdHVyZSwgcHJvdmlkZXJzKTtcbn1cblxuY29uc3QgUk9VVEVSX1BSRUxPQURFUiA9IG5ldyBJbmplY3Rpb25Ub2tlbjxSb3V0ZXJQcmVsb2FkZXI+KFxuICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpID8gJ3JvdXRlciBwcmVsb2FkZXInIDogJycpO1xuXG4vKipcbiAqIEEgdHlwZSBhbGlhcyB0aGF0IHJlcHJlc2VudHMgYSBmZWF0dXJlIHdoaWNoIGVuYWJsZXMgcHJlbG9hZGluZyBpbiBSb3V0ZXIuXG4gKiBUaGUgdHlwZSBpcyB1c2VkIHRvIGRlc2NyaWJlIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGB3aXRoUHJlbG9hZGluZ2AgZnVuY3Rpb24uXG4gKlxuICogQHNlZSB7QGxpbmsgd2l0aFByZWxvYWRpbmd9XG4gKiBAc2VlIHtAbGluayBwcm92aWRlUm91dGVyfVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgUHJlbG9hZGluZ0ZlYXR1cmUgPSBSb3V0ZXJGZWF0dXJlPFJvdXRlckZlYXR1cmVLaW5kLlByZWxvYWRpbmdGZWF0dXJlPjtcblxuLyoqXG4gKiBBbGxvd3MgdG8gY29uZmlndXJlIGEgcHJlbG9hZGluZyBzdHJhdGVneSB0byB1c2UuIFRoZSBzdHJhdGVneSBpcyBjb25maWd1cmVkIGJ5IHByb3ZpZGluZyBhXG4gKiByZWZlcmVuY2UgdG8gYSBjbGFzcyB0aGF0IGltcGxlbWVudHMgYSBgUHJlbG9hZGluZ1N0cmF0ZWd5YC5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIEJhc2ljIGV4YW1wbGUgb2YgaG93IHlvdSBjYW4gY29uZmlndXJlIHByZWxvYWRpbmc6XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLCB3aXRoUHJlbG9hZGluZyhQcmVsb2FkQWxsTW9kdWxlcykpXG4gKiAgICAgXVxuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQHNlZSB7QGxpbmsgcHJvdmlkZVJvdXRlcn1cbiAqXG4gKiBAcGFyYW0gcHJlbG9hZGluZ1N0cmF0ZWd5IEEgcmVmZXJlbmNlIHRvIGEgY2xhc3MgdGhhdCBpbXBsZW1lbnRzIGEgYFByZWxvYWRpbmdTdHJhdGVneWAgdGhhdFxuICogICAgIHNob3VsZCBiZSB1c2VkLlxuICogQHJldHVybnMgQSBzZXQgb2YgcHJvdmlkZXJzIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aFByZWxvYWRpbmcocHJlbG9hZGluZ1N0cmF0ZWd5OiBUeXBlPFByZWxvYWRpbmdTdHJhdGVneT4pOiBQcmVsb2FkaW5nRmVhdHVyZSB7XG4gIGNvbnN0IHByb3ZpZGVycyA9IFtcbiAgICB7cHJvdmlkZTogUk9VVEVSX1BSRUxPQURFUiwgdXNlRXhpc3Rpbmc6IFJvdXRlclByZWxvYWRlcn0sXG4gICAge3Byb3ZpZGU6IFByZWxvYWRpbmdTdHJhdGVneSwgdXNlRXhpc3Rpbmc6IHByZWxvYWRpbmdTdHJhdGVneX0sXG4gIF07XG4gIHJldHVybiByb3V0ZXJGZWF0dXJlKFJvdXRlckZlYXR1cmVLaW5kLlByZWxvYWRpbmdGZWF0dXJlLCBwcm92aWRlcnMpO1xufVxuXG4vKipcbiAqIEEgdHlwZSBhbGlhcyBmb3IgcHJvdmlkZXJzIHJldHVybmVkIGJ5IGB3aXRoUm91dGVyQ29uZmlnYCBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBzZWUge0BsaW5rIHdpdGhSb3V0ZXJDb25maWd9XG4gKiBAc2VlIHtAbGluayBwcm92aWRlUm91dGVyfVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgUm91dGVyQ29uZmlndXJhdGlvbkZlYXR1cmUgPVxuICAgIFJvdXRlckZlYXR1cmU8Um91dGVyRmVhdHVyZUtpbmQuUm91dGVyQ29uZmlndXJhdGlvbkZlYXR1cmU+O1xuXG4vKipcbiAqIEFsbG93cyB0byBwcm92aWRlIGV4dHJhIHBhcmFtZXRlcnMgdG8gY29uZmlndXJlIFJvdXRlci5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIEJhc2ljIGV4YW1wbGUgb2YgaG93IHlvdSBjYW4gcHJvdmlkZSBleHRyYSBjb25maWd1cmF0aW9uIG9wdGlvbnM6XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLCB3aXRoUm91dGVyQ29uZmlnKHtcbiAqICAgICAgICAgIG9uU2FtZVVybE5hdmlnYXRpb246ICdyZWxvYWQnXG4gKiAgICAgICB9KSlcbiAqICAgICBdXG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqXG4gKiBAc2VlIHtAbGluayBwcm92aWRlUm91dGVyfVxuICpcbiAqIEBwYXJhbSBvcHRpb25zIEEgc2V0IG9mIHBhcmFtZXRlcnMgdG8gY29uZmlndXJlIFJvdXRlciwgc2VlIGBSb3V0ZXJDb25maWdPcHRpb25zYCBmb3JcbiAqICAgICBhZGRpdGlvbmFsIGluZm9ybWF0aW9uLlxuICogQHJldHVybnMgQSBzZXQgb2YgcHJvdmlkZXJzIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aFJvdXRlckNvbmZpZyhvcHRpb25zOiBSb3V0ZXJDb25maWdPcHRpb25zKTogUm91dGVyQ29uZmlndXJhdGlvbkZlYXR1cmUge1xuICBjb25zdCBwcm92aWRlcnMgPSBbXG4gICAge3Byb3ZpZGU6IFJPVVRFUl9DT05GSUdVUkFUSU9OLCB1c2VWYWx1ZTogb3B0aW9uc30sXG4gIF07XG4gIHJldHVybiByb3V0ZXJGZWF0dXJlKFJvdXRlckZlYXR1cmVLaW5kLlJvdXRlckNvbmZpZ3VyYXRpb25GZWF0dXJlLCBwcm92aWRlcnMpO1xufVxuXG4vKipcbiAqIEEgdHlwZSBhbGlhcyBmb3IgcHJvdmlkZXJzIHJldHVybmVkIGJ5IGB3aXRoSGFzaExvY2F0aW9uYCBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBzZWUge0BsaW5rIHdpdGhIYXNoTG9jYXRpb259XG4gKiBAc2VlIHtAbGluayBwcm92aWRlUm91dGVyfVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgUm91dGVySGFzaExvY2F0aW9uRmVhdHVyZSA9IFJvdXRlckZlYXR1cmU8Um91dGVyRmVhdHVyZUtpbmQuUm91dGVySGFzaExvY2F0aW9uRmVhdHVyZT47XG5cbi8qKlxuICogUHJvdmlkZXMgdGhlIGxvY2F0aW9uIHN0cmF0ZWd5IHRoYXQgdXNlcyB0aGUgVVJMIGZyYWdtZW50IGluc3RlYWQgb2YgdGhlIGhpc3RvcnkgQVBJLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogQmFzaWMgZXhhbXBsZSBvZiBob3cgeW91IGNhbiB1c2UgdGhlIGhhc2ggbG9jYXRpb24gb3B0aW9uOlxuICogYGBgXG4gKiBjb25zdCBhcHBSb3V0ZXM6IFJvdXRlcyA9IFtdO1xuICogYm9vdHN0cmFwQXBwbGljYXRpb24oQXBwQ29tcG9uZW50LFxuICogICB7XG4gKiAgICAgcHJvdmlkZXJzOiBbXG4gKiAgICAgICBwcm92aWRlUm91dGVyKGFwcFJvdXRlcywgd2l0aEhhc2hMb2NhdGlvbigpKVxuICogICAgIF1cbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICpcbiAqIEBzZWUge0BsaW5rIHByb3ZpZGVSb3V0ZXJ9XG4gKiBAc2VlIHtAbGluayBIYXNoTG9jYXRpb25TdHJhdGVneX1cbiAqXG4gKiBAcmV0dXJucyBBIHNldCBvZiBwcm92aWRlcnMgZm9yIHVzZSB3aXRoIGBwcm92aWRlUm91dGVyYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXRoSGFzaExvY2F0aW9uKCk6IFJvdXRlckhhc2hMb2NhdGlvbkZlYXR1cmUge1xuICBjb25zdCBwcm92aWRlcnMgPSBbXG4gICAge3Byb3ZpZGU6IExvY2F0aW9uU3RyYXRlZ3ksIHVzZUNsYXNzOiBIYXNoTG9jYXRpb25TdHJhdGVneX0sXG4gIF07XG4gIHJldHVybiByb3V0ZXJGZWF0dXJlKFJvdXRlckZlYXR1cmVLaW5kLlJvdXRlckhhc2hMb2NhdGlvbkZlYXR1cmUsIHByb3ZpZGVycyk7XG59XG5cbi8qKlxuICogQSB0eXBlIGFsaWFzIGZvciBwcm92aWRlcnMgcmV0dXJuZWQgYnkgYHdpdGhOYXZpZ2F0aW9uRXJyb3JIYW5kbGVyYCBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBzZWUge0BsaW5rIHdpdGhOYXZpZ2F0aW9uRXJyb3JIYW5kbGVyfVxuICogQHNlZSB7QGxpbmsgcHJvdmlkZVJvdXRlcn1cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIE5hdmlnYXRpb25FcnJvckhhbmRsZXJGZWF0dXJlID1cbiAgICBSb3V0ZXJGZWF0dXJlPFJvdXRlckZlYXR1cmVLaW5kLk5hdmlnYXRpb25FcnJvckhhbmRsZXJGZWF0dXJlPjtcblxuLyoqXG4gKiBTdWJzY3JpYmVzIHRvIHRoZSBSb3V0ZXIncyBuYXZpZ2F0aW9uIGV2ZW50cyBhbmQgY2FsbHMgdGhlIGdpdmVuIGZ1bmN0aW9uIHdoZW4gYVxuICogYE5hdmlnYXRpb25FcnJvcmAgaGFwcGVucy5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIHJ1biBpbnNpZGUgYXBwbGljYXRpb24ncyBbaW5qZWN0aW9uIGNvbnRleHRdKGd1aWRlL2RlcGVuZGVuY3ktaW5qZWN0aW9uLWNvbnRleHQpXG4gKiBzbyB5b3UgY2FuIHVzZSB0aGUgW2BpbmplY3RgXShhcGkvY29yZS9pbmplY3QpIGZ1bmN0aW9uLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogQmFzaWMgZXhhbXBsZSBvZiBob3cgeW91IGNhbiB1c2UgdGhlIGVycm9yIGhhbmRsZXIgb3B0aW9uOlxuICogYGBgXG4gKiBjb25zdCBhcHBSb3V0ZXM6IFJvdXRlcyA9IFtdO1xuICogYm9vdHN0cmFwQXBwbGljYXRpb24oQXBwQ29tcG9uZW50LFxuICogICB7XG4gKiAgICAgcHJvdmlkZXJzOiBbXG4gKiAgICAgICBwcm92aWRlUm91dGVyKGFwcFJvdXRlcywgd2l0aE5hdmlnYXRpb25FcnJvckhhbmRsZXIoKGU6IE5hdmlnYXRpb25FcnJvcikgPT5cbiAqIGluamVjdChNeUVycm9yVHJhY2tlcikudHJhY2tFcnJvcihlKSkpXG4gKiAgICAgXVxuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkVycm9yfVxuICogQHNlZSB7QGxpbmsgY29yZS9pbmplY3R9XG4gKiBAc2VlIHtAbGluayBydW5JbkluamVjdGlvbkNvbnRleHR9XG4gKlxuICogQHJldHVybnMgQSBzZXQgb2YgcHJvdmlkZXJzIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aE5hdmlnYXRpb25FcnJvckhhbmRsZXIoZm46IChlcnJvcjogTmF2aWdhdGlvbkVycm9yKSA9PiB2b2lkKTpcbiAgICBOYXZpZ2F0aW9uRXJyb3JIYW5kbGVyRmVhdHVyZSB7XG4gIGNvbnN0IHByb3ZpZGVycyA9IFt7XG4gICAgcHJvdmlkZTogRU5WSVJPTk1FTlRfSU5JVElBTElaRVIsXG4gICAgbXVsdGk6IHRydWUsXG4gICAgdXNlVmFsdWU6ICgpID0+IHtcbiAgICAgIGNvbnN0IGluamVjdG9yID0gaW5qZWN0KEVudmlyb25tZW50SW5qZWN0b3IpO1xuICAgICAgaW5qZWN0KFJvdXRlcikuZXZlbnRzLnN1YnNjcmliZSgoZSkgPT4ge1xuICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FcnJvcikge1xuICAgICAgICAgIHJ1bkluSW5qZWN0aW9uQ29udGV4dChpbmplY3RvciwgKCkgPT4gZm4oZSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1dO1xuICByZXR1cm4gcm91dGVyRmVhdHVyZShSb3V0ZXJGZWF0dXJlS2luZC5OYXZpZ2F0aW9uRXJyb3JIYW5kbGVyRmVhdHVyZSwgcHJvdmlkZXJzKTtcbn1cblxuLyoqXG4gKiBBIHR5cGUgYWxpYXMgZm9yIHByb3ZpZGVycyByZXR1cm5lZCBieSBgd2l0aENvbXBvbmVudElucHV0QmluZGluZ2AgZm9yIHVzZSB3aXRoIGBwcm92aWRlUm91dGVyYC5cbiAqXG4gKiBAc2VlIHtAbGluayB3aXRoQ29tcG9uZW50SW5wdXRCaW5kaW5nfVxuICogQHNlZSB7QGxpbmsgcHJvdmlkZVJvdXRlcn1cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIENvbXBvbmVudElucHV0QmluZGluZ0ZlYXR1cmUgPVxuICAgIFJvdXRlckZlYXR1cmU8Um91dGVyRmVhdHVyZUtpbmQuQ29tcG9uZW50SW5wdXRCaW5kaW5nRmVhdHVyZT47XG5cbi8qKlxuICogQSB0eXBlIGFsaWFzIGZvciBwcm92aWRlcnMgcmV0dXJuZWQgYnkgYHdpdGhWaWV3VHJhbnNpdGlvbnNgIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHNlZSB7QGxpbmsgd2l0aFZpZXdUcmFuc2l0aW9uc31cbiAqIEBzZWUge0BsaW5rIHByb3ZpZGVSb3V0ZXJ9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBWaWV3VHJhbnNpdGlvbnNGZWF0dXJlID0gUm91dGVyRmVhdHVyZTxSb3V0ZXJGZWF0dXJlS2luZC5WaWV3VHJhbnNpdGlvbnNGZWF0dXJlPjtcblxuLyoqXG4gKiBFbmFibGVzIGJpbmRpbmcgaW5mb3JtYXRpb24gZnJvbSB0aGUgYFJvdXRlcmAgc3RhdGUgZGlyZWN0bHkgdG8gdGhlIGlucHV0cyBvZiB0aGUgY29tcG9uZW50IGluXG4gKiBgUm91dGVgIGNvbmZpZ3VyYXRpb25zLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogQmFzaWMgZXhhbXBsZSBvZiBob3cgeW91IGNhbiBlbmFibGUgdGhlIGZlYXR1cmU6XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLCB3aXRoQ29tcG9uZW50SW5wdXRCaW5kaW5nKCkpXG4gKiAgICAgXVxuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQHJldHVybnMgQSBzZXQgb2YgcHJvdmlkZXJzIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXRoQ29tcG9uZW50SW5wdXRCaW5kaW5nKCk6IENvbXBvbmVudElucHV0QmluZGluZ0ZlYXR1cmUge1xuICBjb25zdCBwcm92aWRlcnMgPSBbXG4gICAgUm91dGVkQ29tcG9uZW50SW5wdXRCaW5kZXIsXG4gICAge3Byb3ZpZGU6IElOUFVUX0JJTkRFUiwgdXNlRXhpc3Rpbmc6IFJvdXRlZENvbXBvbmVudElucHV0QmluZGVyfSxcbiAgXTtcblxuICByZXR1cm4gcm91dGVyRmVhdHVyZShSb3V0ZXJGZWF0dXJlS2luZC5Db21wb25lbnRJbnB1dEJpbmRpbmdGZWF0dXJlLCBwcm92aWRlcnMpO1xufVxuXG4vKipcbiAqIEVuYWJsZXMgdmlldyB0cmFuc2l0aW9ucyBpbiB0aGUgUm91dGVyIGJ5IHJ1bm5pbmcgdGhlIHJvdXRlIGFjdGl2YXRpb24gYW5kIGRlYWN0aXZhdGlvbiBpbnNpZGUgb2ZcbiAqIGBkb2N1bWVudC5zdGFydFZpZXdUcmFuc2l0aW9uYC5cbiAqXG4gKiBOb3RlOiBUaGUgVmlldyBUcmFuc2l0aW9ucyBBUEkgaXMgbm90IGF2YWlsYWJsZSBpbiBhbGwgYnJvd3NlcnMuIElmIHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnRcbiAqIHZpZXcgdHJhbnNpdGlvbnMsIHRoZSBSb3V0ZXIgd2lsbCBub3QgYXR0ZW1wdCB0byBzdGFydCBhIHZpZXcgdHJhbnNpdGlvbiBhbmQgY29udGludWUgcHJvY2Vzc2luZ1xuICogdGhlIG5hdmlnYXRpb24gYXMgdXN1YWwuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBCYXNpYyBleGFtcGxlIG9mIGhvdyB5b3UgY2FuIGVuYWJsZSB0aGUgZmVhdHVyZTpcbiAqIGBgYFxuICogY29uc3QgYXBwUm91dGVzOiBSb3V0ZXMgPSBbXTtcbiAqIGJvb3RzdHJhcEFwcGxpY2F0aW9uKEFwcENvbXBvbmVudCxcbiAqICAge1xuICogICAgIHByb3ZpZGVyczogW1xuICogICAgICAgcHJvdmlkZVJvdXRlcihhcHBSb3V0ZXMsIHdpdGhWaWV3VHJhbnNpdGlvbnMoKSlcbiAqICAgICBdXG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqXG4gKiBAcmV0dXJucyBBIHNldCBvZiBwcm92aWRlcnMgZm9yIHVzZSB3aXRoIGBwcm92aWRlUm91dGVyYC5cbiAqIEBzZWUgaHR0cHM6Ly9kZXZlbG9wZXIuY2hyb21lLmNvbS9kb2NzL3dlYi1wbGF0Zm9ybS92aWV3LXRyYW5zaXRpb25zL1xuICogQHNlZSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvVmlld19UcmFuc2l0aW9uc19BUElcbiAqIEBleHBlcmltZW50YWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhWaWV3VHJhbnNpdGlvbnMob3B0aW9ucz86IFZpZXdUcmFuc2l0aW9uc0ZlYXR1cmVPcHRpb25zKTpcbiAgICBWaWV3VHJhbnNpdGlvbnNGZWF0dXJlIHtcbiAgY29uc3QgcHJvdmlkZXJzID0gW1xuICAgIHtwcm92aWRlOiBDUkVBVEVfVklFV19UUkFOU0lUSU9OLCB1c2VWYWx1ZTogY3JlYXRlVmlld1RyYW5zaXRpb259LFxuICAgIHtcbiAgICAgIHByb3ZpZGU6IFZJRVdfVFJBTlNJVElPTl9PUFRJT05TLFxuICAgICAgdXNlVmFsdWU6IHtza2lwTmV4dFRyYW5zaXRpb246ICEhb3B0aW9ucz8uc2tpcEluaXRpYWxUcmFuc2l0aW9uLCAuLi5vcHRpb25zfVxuICAgIH0sXG4gIF07XG4gIHJldHVybiByb3V0ZXJGZWF0dXJlKFJvdXRlckZlYXR1cmVLaW5kLlZpZXdUcmFuc2l0aW9uc0ZlYXR1cmUsIHByb3ZpZGVycyk7XG59XG5cbi8qKlxuICogQSB0eXBlIGFsaWFzIHRoYXQgcmVwcmVzZW50cyBhbGwgUm91dGVyIGZlYXR1cmVzIGF2YWlsYWJsZSBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICogRmVhdHVyZXMgY2FuIGJlIGVuYWJsZWQgYnkgYWRkaW5nIHNwZWNpYWwgZnVuY3Rpb25zIHRvIHRoZSBgcHJvdmlkZVJvdXRlcmAgY2FsbC5cbiAqIFNlZSBkb2N1bWVudGF0aW9uIGZvciBlYWNoIHN5bWJvbCB0byBmaW5kIGNvcnJlc3BvbmRpbmcgZnVuY3Rpb24gbmFtZS4gU2VlIGFsc28gYHByb3ZpZGVSb3V0ZXJgXG4gKiBkb2N1bWVudGF0aW9uIG9uIGhvdyB0byB1c2UgdGhvc2UgZnVuY3Rpb25zLlxuICpcbiAqIEBzZWUge0BsaW5rIHByb3ZpZGVSb3V0ZXJ9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBSb3V0ZXJGZWF0dXJlcyA9IFByZWxvYWRpbmdGZWF0dXJlfERlYnVnVHJhY2luZ0ZlYXR1cmV8SW5pdGlhbE5hdmlnYXRpb25GZWF0dXJlfFxuICAgIEluTWVtb3J5U2Nyb2xsaW5nRmVhdHVyZXxSb3V0ZXJDb25maWd1cmF0aW9uRmVhdHVyZXxOYXZpZ2F0aW9uRXJyb3JIYW5kbGVyRmVhdHVyZXxcbiAgICBDb21wb25lbnRJbnB1dEJpbmRpbmdGZWF0dXJlfFZpZXdUcmFuc2l0aW9uc0ZlYXR1cmV8Um91dGVySGFzaExvY2F0aW9uRmVhdHVyZTtcblxuLyoqXG4gKiBUaGUgbGlzdCBvZiBmZWF0dXJlcyBhcyBhbiBlbnVtIHRvIHVuaXF1ZWx5IHR5cGUgZWFjaCBmZWF0dXJlLlxuICovXG5leHBvcnQgY29uc3QgZW51bSBSb3V0ZXJGZWF0dXJlS2luZCB7XG4gIFByZWxvYWRpbmdGZWF0dXJlLFxuICBEZWJ1Z1RyYWNpbmdGZWF0dXJlLFxuICBFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUsXG4gIERpc2FibGVkSW5pdGlhbE5hdmlnYXRpb25GZWF0dXJlLFxuICBJbk1lbW9yeVNjcm9sbGluZ0ZlYXR1cmUsXG4gIFJvdXRlckNvbmZpZ3VyYXRpb25GZWF0dXJlLFxuICBSb3V0ZXJIYXNoTG9jYXRpb25GZWF0dXJlLFxuICBOYXZpZ2F0aW9uRXJyb3JIYW5kbGVyRmVhdHVyZSxcbiAgQ29tcG9uZW50SW5wdXRCaW5kaW5nRmVhdHVyZSxcbiAgVmlld1RyYW5zaXRpb25zRmVhdHVyZSxcbn1cbiJdfQ==