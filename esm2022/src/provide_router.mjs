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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZV9yb3V0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3Byb3ZpZGVfcm91dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQy9HLE9BQU8sRUFBQyxzQkFBc0IsRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFnQix1QkFBdUIsRUFBRSxtQkFBbUIsRUFBd0IsTUFBTSxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLHdCQUF3QixFQUFFLE1BQU0sRUFBWSxxQkFBcUIsRUFBTyxNQUFNLGVBQWUsQ0FBQztBQUNoUyxPQUFPLEVBQUMsRUFBRSxFQUFFLE9BQU8sRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUVqQyxPQUFPLEVBQUMsWUFBWSxFQUFFLDBCQUEwQixFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFDcEYsT0FBTyxFQUFRLGVBQWUsRUFBRSxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFFaEUsT0FBTyxFQUFDLHFCQUFxQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDOUQsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLEVBQTJCLG9CQUFvQixFQUFzQixNQUFNLGlCQUFpQixDQUFDO0FBQ3BHLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUM5QyxPQUFPLEVBQUMsa0JBQWtCLEVBQUUsZUFBZSxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDdkUsT0FBTyxFQUFDLGVBQWUsRUFBRSxjQUFjLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUNsRSxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDOUMsT0FB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QUFRLEVBQUUsRUFBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLEdBQUcsT0FBTyxFQUFDO1NBQzdFO0tBQ0YsQ0FBQztJQUNGLE9BQU8sYUFBYSxtREFBMkMsU0FBUyxDQUFDLENBQUM7QUFDNUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0hhc2hMb2NhdGlvblN0cmF0ZWd5LCBMT0NBVElPTl9JTklUSUFMSVpFRCwgTG9jYXRpb25TdHJhdGVneSwgVmlld3BvcnRTY3JvbGxlcn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7QVBQX0JPT1RTVFJBUF9MSVNURU5FUiwgQVBQX0lOSVRJQUxJWkVSLCBBcHBsaWNhdGlvblJlZiwgQ29tcG9uZW50UmVmLCBFTlZJUk9OTUVOVF9JTklUSUFMSVpFUiwgRW52aXJvbm1lbnRJbmplY3RvciwgRW52aXJvbm1lbnRQcm92aWRlcnMsIGluamVjdCwgSW5qZWN0RmxhZ3MsIEluamVjdGlvblRva2VuLCBJbmplY3RvciwgbWFrZUVudmlyb25tZW50UHJvdmlkZXJzLCBOZ1pvbmUsIFByb3ZpZGVyLCBydW5JbkluamVjdGlvbkNvbnRleHQsIFR5cGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtvZiwgU3ViamVjdH0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7SU5QVVRfQklOREVSLCBSb3V0ZWRDb21wb25lbnRJbnB1dEJpbmRlcn0gZnJvbSAnLi9kaXJlY3RpdmVzL3JvdXRlcl9vdXRsZXQnO1xuaW1wb3J0IHtFdmVudCwgTmF2aWdhdGlvbkVycm9yLCBzdHJpbmdpZnlFdmVudH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtSb3V0ZXN9IGZyb20gJy4vbW9kZWxzJztcbmltcG9ydCB7TmF2aWdhdGlvblRyYW5zaXRpb25zfSBmcm9tICcuL25hdmlnYXRpb25fdHJhbnNpdGlvbic7XG5pbXBvcnQge1JvdXRlcn0gZnJvbSAnLi9yb3V0ZXInO1xuaW1wb3J0IHtJbk1lbW9yeVNjcm9sbGluZ09wdGlvbnMsIFJPVVRFUl9DT05GSUdVUkFUSU9OLCBSb3V0ZXJDb25maWdPcHRpb25zfSBmcm9tICcuL3JvdXRlcl9jb25maWcnO1xuaW1wb3J0IHtST1VURVN9IGZyb20gJy4vcm91dGVyX2NvbmZpZ19sb2FkZXInO1xuaW1wb3J0IHtQcmVsb2FkaW5nU3RyYXRlZ3ksIFJvdXRlclByZWxvYWRlcn0gZnJvbSAnLi9yb3V0ZXJfcHJlbG9hZGVyJztcbmltcG9ydCB7Uk9VVEVSX1NDUk9MTEVSLCBSb3V0ZXJTY3JvbGxlcn0gZnJvbSAnLi9yb3V0ZXJfc2Nyb2xsZXInO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZX0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtVcmxTZXJpYWxpemVyfSBmcm9tICcuL3VybF90cmVlJztcbmltcG9ydCB7YWZ0ZXJOZXh0TmF2aWdhdGlvbn0gZnJvbSAnLi91dGlscy9uYXZpZ2F0aW9ucyc7XG5pbXBvcnQge0NSRUFURV9WSUVXX1RSQU5TSVRJT04sIGNyZWF0ZVZpZXdUcmFuc2l0aW9uLCBWSUVXX1RSQU5TSVRJT05fT1BUSU9OUywgVmlld1RyYW5zaXRpb25zRmVhdHVyZU9wdGlvbnN9IGZyb20gJy4vdXRpbHMvdmlld190cmFuc2l0aW9uJztcblxuXG4vKipcbiAqIFNldHMgdXAgcHJvdmlkZXJzIG5lY2Vzc2FyeSB0byBlbmFibGUgYFJvdXRlcmAgZnVuY3Rpb25hbGl0eSBmb3IgdGhlIGFwcGxpY2F0aW9uLlxuICogQWxsb3dzIHRvIGNvbmZpZ3VyZSBhIHNldCBvZiByb3V0ZXMgYXMgd2VsbCBhcyBleHRyYSBmZWF0dXJlcyB0aGF0IHNob3VsZCBiZSBlbmFibGVkLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogQmFzaWMgZXhhbXBsZSBvZiBob3cgeW91IGNhbiBhZGQgYSBSb3V0ZXIgdG8geW91ciBhcHBsaWNhdGlvbjpcbiAqIGBgYFxuICogY29uc3QgYXBwUm91dGVzOiBSb3V0ZXMgPSBbXTtcbiAqIGJvb3RzdHJhcEFwcGxpY2F0aW9uKEFwcENvbXBvbmVudCwge1xuICogICBwcm92aWRlcnM6IFtwcm92aWRlUm91dGVyKGFwcFJvdXRlcyldXG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIFlvdSBjYW4gYWxzbyBlbmFibGUgb3B0aW9uYWwgZmVhdHVyZXMgaW4gdGhlIFJvdXRlciBieSBhZGRpbmcgZnVuY3Rpb25zIGZyb20gdGhlIGBSb3V0ZXJGZWF0dXJlc2BcbiAqIHR5cGU6XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLFxuICogICAgICAgICB3aXRoRGVidWdUcmFjaW5nKCksXG4gKiAgICAgICAgIHdpdGhSb3V0ZXJDb25maWcoe3BhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6ICdhbHdheXMnfSkpXG4gKiAgICAgXVxuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQHNlZSB7QGxpbmsgUm91dGVyRmVhdHVyZXN9XG4gKlxuICogQHB1YmxpY0FwaVxuICogQHBhcmFtIHJvdXRlcyBBIHNldCBvZiBgUm91dGVgcyB0byB1c2UgZm9yIHRoZSBhcHBsaWNhdGlvbiByb3V0aW5nIHRhYmxlLlxuICogQHBhcmFtIGZlYXR1cmVzIE9wdGlvbmFsIGZlYXR1cmVzIHRvIGNvbmZpZ3VyZSBhZGRpdGlvbmFsIHJvdXRlciBiZWhhdmlvcnMuXG4gKiBAcmV0dXJucyBBIHNldCBvZiBwcm92aWRlcnMgdG8gc2V0dXAgYSBSb3V0ZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm92aWRlUm91dGVyKHJvdXRlczogUm91dGVzLCAuLi5mZWF0dXJlczogUm91dGVyRmVhdHVyZXNbXSk6IEVudmlyb25tZW50UHJvdmlkZXJzIHtcbiAgcmV0dXJuIG1ha2VFbnZpcm9ubWVudFByb3ZpZGVycyhbXG4gICAge3Byb3ZpZGU6IFJPVVRFUywgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiByb3V0ZXN9LFxuICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpID9cbiAgICAgICAge3Byb3ZpZGU6IFJPVVRFUl9JU19QUk9WSURFRCwgdXNlVmFsdWU6IHRydWV9IDpcbiAgICAgICAgW10sXG4gICAge3Byb3ZpZGU6IEFjdGl2YXRlZFJvdXRlLCB1c2VGYWN0b3J5OiByb290Um91dGUsIGRlcHM6IFtSb3V0ZXJdfSxcbiAgICB7cHJvdmlkZTogQVBQX0JPT1RTVFJBUF9MSVNURU5FUiwgbXVsdGk6IHRydWUsIHVzZUZhY3Rvcnk6IGdldEJvb3RzdHJhcExpc3RlbmVyfSxcbiAgICBmZWF0dXJlcy5tYXAoZmVhdHVyZSA9PiBmZWF0dXJlLsm1cHJvdmlkZXJzKSxcbiAgXSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByb290Um91dGUocm91dGVyOiBSb3V0ZXIpOiBBY3RpdmF0ZWRSb3V0ZSB7XG4gIHJldHVybiByb3V0ZXIucm91dGVyU3RhdGUucm9vdDtcbn1cblxuLyoqXG4gKiBIZWxwZXIgdHlwZSB0byByZXByZXNlbnQgYSBSb3V0ZXIgZmVhdHVyZS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm91dGVyRmVhdHVyZTxGZWF0dXJlS2luZCBleHRlbmRzIFJvdXRlckZlYXR1cmVLaW5kPiB7XG4gIMm1a2luZDogRmVhdHVyZUtpbmQ7XG4gIMm1cHJvdmlkZXJzOiBQcm92aWRlcltdO1xufVxuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiB0byBjcmVhdGUgYW4gb2JqZWN0IHRoYXQgcmVwcmVzZW50cyBhIFJvdXRlciBmZWF0dXJlLlxuICovXG5mdW5jdGlvbiByb3V0ZXJGZWF0dXJlPEZlYXR1cmVLaW5kIGV4dGVuZHMgUm91dGVyRmVhdHVyZUtpbmQ+KFxuICAgIGtpbmQ6IEZlYXR1cmVLaW5kLCBwcm92aWRlcnM6IFByb3ZpZGVyW10pOiBSb3V0ZXJGZWF0dXJlPEZlYXR1cmVLaW5kPiB7XG4gIHJldHVybiB7ybVraW5kOiBraW5kLCDJtXByb3ZpZGVyczogcHJvdmlkZXJzfTtcbn1cblxuXG4vKipcbiAqIEFuIEluamVjdGlvbiB0b2tlbiB1c2VkIHRvIGluZGljYXRlIHdoZXRoZXIgYHByb3ZpZGVSb3V0ZXJgIG9yIGBSb3V0ZXJNb2R1bGUuZm9yUm9vdGAgd2FzIGV2ZXJcbiAqIGNhbGxlZC5cbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9JU19QUk9WSURFRCA9XG4gICAgbmV3IEluamVjdGlvblRva2VuPGJvb2xlYW4+KCcnLCB7cHJvdmlkZWRJbjogJ3Jvb3QnLCBmYWN0b3J5OiAoKSA9PiBmYWxzZX0pO1xuXG5jb25zdCByb3V0ZXJJc1Byb3ZpZGVkRGV2TW9kZUNoZWNrID0ge1xuICBwcm92aWRlOiBFTlZJUk9OTUVOVF9JTklUSUFMSVpFUixcbiAgbXVsdGk6IHRydWUsXG4gIHVzZUZhY3RvcnkoKSB7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGlmICghaW5qZWN0KFJPVVRFUl9JU19QUk9WSURFRCkpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgJ2Bwcm92aWRlUm91dGVzYCB3YXMgY2FsbGVkIHdpdGhvdXQgYHByb3ZpZGVSb3V0ZXJgIG9yIGBSb3V0ZXJNb2R1bGUuZm9yUm9vdGAuICcgK1xuICAgICAgICAgICAgJ1RoaXMgaXMgbGlrZWx5IGEgbWlzdGFrZS4nKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhIFtESSBwcm92aWRlcl0oZ3VpZGUvZ2xvc3NhcnkjcHJvdmlkZXIpIGZvciBhIHNldCBvZiByb3V0ZXMuXG4gKiBAcGFyYW0gcm91dGVzIFRoZSByb3V0ZSBjb25maWd1cmF0aW9uIHRvIHByb3ZpZGUuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBgYGBcbiAqIEBOZ01vZHVsZSh7XG4gKiAgIHByb3ZpZGVyczogW3Byb3ZpZGVSb3V0ZXMoUk9VVEVTKV1cbiAqIH0pXG4gKiBjbGFzcyBMYXp5TG9hZGVkQ2hpbGRNb2R1bGUge31cbiAqIGBgYFxuICpcbiAqIEBkZXByZWNhdGVkIElmIG5lY2Vzc2FyeSwgcHJvdmlkZSByb3V0ZXMgdXNpbmcgdGhlIGBST1VURVNgIGBJbmplY3Rpb25Ub2tlbmAuXG4gKiBAc2VlIHtAbGluayBST1VURVN9XG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm92aWRlUm91dGVzKHJvdXRlczogUm91dGVzKTogUHJvdmlkZXJbXSB7XG4gIHJldHVybiBbXG4gICAge3Byb3ZpZGU6IFJPVVRFUywgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiByb3V0ZXN9LFxuICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpID8gcm91dGVySXNQcm92aWRlZERldk1vZGVDaGVjayA6IFtdLFxuICBdO1xufVxuXG4vKipcbiAqIEEgdHlwZSBhbGlhcyBmb3IgcHJvdmlkZXJzIHJldHVybmVkIGJ5IGB3aXRoSW5NZW1vcnlTY3JvbGxpbmdgIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHNlZSB7QGxpbmsgd2l0aEluTWVtb3J5U2Nyb2xsaW5nfVxuICogQHNlZSB7QGxpbmsgcHJvdmlkZVJvdXRlcn1cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIEluTWVtb3J5U2Nyb2xsaW5nRmVhdHVyZSA9IFJvdXRlckZlYXR1cmU8Um91dGVyRmVhdHVyZUtpbmQuSW5NZW1vcnlTY3JvbGxpbmdGZWF0dXJlPjtcblxuLyoqXG4gKiBFbmFibGVzIGN1c3RvbWl6YWJsZSBzY3JvbGxpbmcgYmVoYXZpb3IgZm9yIHJvdXRlciBuYXZpZ2F0aW9ucy5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIEJhc2ljIGV4YW1wbGUgb2YgaG93IHlvdSBjYW4gZW5hYmxlIHNjcm9sbGluZyBmZWF0dXJlOlxuICogYGBgXG4gKiBjb25zdCBhcHBSb3V0ZXM6IFJvdXRlcyA9IFtdO1xuICogYm9vdHN0cmFwQXBwbGljYXRpb24oQXBwQ29tcG9uZW50LFxuICogICB7XG4gKiAgICAgcHJvdmlkZXJzOiBbXG4gKiAgICAgICBwcm92aWRlUm91dGVyKGFwcFJvdXRlcywgd2l0aEluTWVtb3J5U2Nyb2xsaW5nKCkpXG4gKiAgICAgXVxuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQHNlZSB7QGxpbmsgcHJvdmlkZVJvdXRlcn1cbiAqIEBzZWUge0BsaW5rIFZpZXdwb3J0U2Nyb2xsZXJ9XG4gKlxuICogQHB1YmxpY0FwaVxuICogQHBhcmFtIG9wdGlvbnMgU2V0IG9mIGNvbmZpZ3VyYXRpb24gcGFyYW1ldGVycyB0byBjdXN0b21pemUgc2Nyb2xsaW5nIGJlaGF2aW9yLCBzZWVcbiAqICAgICBgSW5NZW1vcnlTY3JvbGxpbmdPcHRpb25zYCBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvbi5cbiAqIEByZXR1cm5zIEEgc2V0IG9mIHByb3ZpZGVycyBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aEluTWVtb3J5U2Nyb2xsaW5nKG9wdGlvbnM6IEluTWVtb3J5U2Nyb2xsaW5nT3B0aW9ucyA9IHt9KTpcbiAgICBJbk1lbW9yeVNjcm9sbGluZ0ZlYXR1cmUge1xuICBjb25zdCBwcm92aWRlcnMgPSBbe1xuICAgIHByb3ZpZGU6IFJPVVRFUl9TQ1JPTExFUixcbiAgICB1c2VGYWN0b3J5OiAoKSA9PiB7XG4gICAgICBjb25zdCB2aWV3cG9ydFNjcm9sbGVyID0gaW5qZWN0KFZpZXdwb3J0U2Nyb2xsZXIpO1xuICAgICAgY29uc3Qgem9uZSA9IGluamVjdChOZ1pvbmUpO1xuICAgICAgY29uc3QgdHJhbnNpdGlvbnMgPSBpbmplY3QoTmF2aWdhdGlvblRyYW5zaXRpb25zKTtcbiAgICAgIGNvbnN0IHVybFNlcmlhbGl6ZXIgPSBpbmplY3QoVXJsU2VyaWFsaXplcik7XG4gICAgICByZXR1cm4gbmV3IFJvdXRlclNjcm9sbGVyKHVybFNlcmlhbGl6ZXIsIHRyYW5zaXRpb25zLCB2aWV3cG9ydFNjcm9sbGVyLCB6b25lLCBvcHRpb25zKTtcbiAgICB9LFxuICB9XTtcbiAgcmV0dXJuIHJvdXRlckZlYXR1cmUoUm91dGVyRmVhdHVyZUtpbmQuSW5NZW1vcnlTY3JvbGxpbmdGZWF0dXJlLCBwcm92aWRlcnMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Qm9vdHN0cmFwTGlzdGVuZXIoKSB7XG4gIGNvbnN0IGluamVjdG9yID0gaW5qZWN0KEluamVjdG9yKTtcbiAgcmV0dXJuIChib290c3RyYXBwZWRDb21wb25lbnRSZWY6IENvbXBvbmVudFJlZjx1bmtub3duPikgPT4ge1xuICAgIGNvbnN0IHJlZiA9IGluamVjdG9yLmdldChBcHBsaWNhdGlvblJlZik7XG5cbiAgICBpZiAoYm9vdHN0cmFwcGVkQ29tcG9uZW50UmVmICE9PSByZWYuY29tcG9uZW50c1swXSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHJvdXRlciA9IGluamVjdG9yLmdldChSb3V0ZXIpO1xuICAgIGNvbnN0IGJvb3RzdHJhcERvbmUgPSBpbmplY3Rvci5nZXQoQk9PVFNUUkFQX0RPTkUpO1xuXG4gICAgaWYgKGluamVjdG9yLmdldChJTklUSUFMX05BVklHQVRJT04pID09PSBJbml0aWFsTmF2aWdhdGlvbi5FbmFibGVkTm9uQmxvY2tpbmcpIHtcbiAgICAgIHJvdXRlci5pbml0aWFsTmF2aWdhdGlvbigpO1xuICAgIH1cblxuICAgIGluamVjdG9yLmdldChST1VURVJfUFJFTE9BREVSLCBudWxsLCBJbmplY3RGbGFncy5PcHRpb25hbCk/LnNldFVwUHJlbG9hZGluZygpO1xuICAgIGluamVjdG9yLmdldChST1VURVJfU0NST0xMRVIsIG51bGwsIEluamVjdEZsYWdzLk9wdGlvbmFsKT8uaW5pdCgpO1xuICAgIHJvdXRlci5yZXNldFJvb3RDb21wb25lbnRUeXBlKHJlZi5jb21wb25lbnRUeXBlc1swXSk7XG4gICAgaWYgKCFib290c3RyYXBEb25lLmNsb3NlZCkge1xuICAgICAgYm9vdHN0cmFwRG9uZS5uZXh0KCk7XG4gICAgICBib290c3RyYXBEb25lLmNvbXBsZXRlKCk7XG4gICAgICBib290c3RyYXBEb25lLnVuc3Vic2NyaWJlKCk7XG4gICAgfVxuICB9O1xufVxuXG4vKipcbiAqIEEgc3ViamVjdCB1c2VkIHRvIGluZGljYXRlIHRoYXQgdGhlIGJvb3RzdHJhcHBpbmcgcGhhc2UgaXMgZG9uZS4gV2hlbiBpbml0aWFsIG5hdmlnYXRpb24gaXNcbiAqIGBlbmFibGVkQmxvY2tpbmdgLCB0aGUgZmlyc3QgbmF2aWdhdGlvbiB3YWl0cyB1bnRpbCBib290c3RyYXBwaW5nIGlzIGZpbmlzaGVkIGJlZm9yZSBjb250aW51aW5nXG4gKiB0byB0aGUgYWN0aXZhdGlvbiBwaGFzZS5cbiAqL1xuY29uc3QgQk9PVFNUUkFQX0RPTkUgPSBuZXcgSW5qZWN0aW9uVG9rZW48U3ViamVjdDx2b2lkPj4oXG4gICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgPyAnYm9vdHN0cmFwIGRvbmUgaW5kaWNhdG9yJyA6ICcnLCB7XG4gICAgICBmYWN0b3J5OiAoKSA9PiB7XG4gICAgICAgIHJldHVybiBuZXcgU3ViamVjdDx2b2lkPigpO1xuICAgICAgfVxuICAgIH0pO1xuXG4vKipcbiAqIFRoaXMgYW5kIHRoZSBJTklUSUFMX05BVklHQVRJT04gdG9rZW4gYXJlIHVzZWQgaW50ZXJuYWxseSBvbmx5LiBUaGUgcHVibGljIEFQSSBzaWRlIG9mIHRoaXMgaXNcbiAqIGNvbmZpZ3VyZWQgdGhyb3VnaCB0aGUgYEV4dHJhT3B0aW9uc2AuXG4gKlxuICogV2hlbiBzZXQgdG8gYEVuYWJsZWRCbG9ja2luZ2AsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gc3RhcnRzIGJlZm9yZSB0aGUgcm9vdFxuICogY29tcG9uZW50IGlzIGNyZWF0ZWQuIFRoZSBib290c3RyYXAgaXMgYmxvY2tlZCB1bnRpbCB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIGlzIGNvbXBsZXRlLiBUaGlzXG4gKiB2YWx1ZSBpcyByZXF1aXJlZCBmb3IgW3NlcnZlci1zaWRlIHJlbmRlcmluZ10oZ3VpZGUvc3NyKSB0byB3b3JrLlxuICpcbiAqIFdoZW4gc2V0IHRvIGBFbmFibGVkTm9uQmxvY2tpbmdgLCB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIHN0YXJ0cyBhZnRlciB0aGUgcm9vdCBjb21wb25lbnQgaGFzIGJlZW5cbiAqIGNyZWF0ZWQuIFRoZSBib290c3RyYXAgaXMgbm90IGJsb2NrZWQgb24gdGhlIGNvbXBsZXRpb24gb2YgdGhlIGluaXRpYWwgbmF2aWdhdGlvbi5cbiAqXG4gKiBXaGVuIHNldCB0byBgRGlzYWJsZWRgLCB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIGlzIG5vdCBwZXJmb3JtZWQuIFRoZSBsb2NhdGlvbiBsaXN0ZW5lciBpcyBzZXQgdXBcbiAqIGJlZm9yZSB0aGUgcm9vdCBjb21wb25lbnQgZ2V0cyBjcmVhdGVkLiBVc2UgaWYgdGhlcmUgaXMgYSByZWFzb24gdG8gaGF2ZSBtb3JlIGNvbnRyb2wgb3ZlciB3aGVuXG4gKiB0aGUgcm91dGVyIHN0YXJ0cyBpdHMgaW5pdGlhbCBuYXZpZ2F0aW9uIGR1ZSB0byBzb21lIGNvbXBsZXggaW5pdGlhbGl6YXRpb24gbG9naWMuXG4gKlxuICogQHNlZSB7QGxpbmsgRXh0cmFPcHRpb25zfVxuICovXG5jb25zdCBlbnVtIEluaXRpYWxOYXZpZ2F0aW9uIHtcbiAgRW5hYmxlZEJsb2NraW5nLFxuICBFbmFibGVkTm9uQmxvY2tpbmcsXG4gIERpc2FibGVkLFxufVxuXG5jb25zdCBJTklUSUFMX05BVklHQVRJT04gPSBuZXcgSW5qZWN0aW9uVG9rZW48SW5pdGlhbE5hdmlnYXRpb24+KFxuICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpID8gJ2luaXRpYWwgbmF2aWdhdGlvbicgOiAnJyxcbiAgICB7cHJvdmlkZWRJbjogJ3Jvb3QnLCBmYWN0b3J5OiAoKSA9PiBJbml0aWFsTmF2aWdhdGlvbi5FbmFibGVkTm9uQmxvY2tpbmd9KTtcblxuLyoqXG4gKiBBIHR5cGUgYWxpYXMgZm9yIHByb3ZpZGVycyByZXR1cm5lZCBieSBgd2l0aEVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uYCBmb3IgdXNlIHdpdGhcbiAqIGBwcm92aWRlUm91dGVyYC5cbiAqXG4gKiBAc2VlIHtAbGluayB3aXRoRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb259XG4gKiBAc2VlIHtAbGluayBwcm92aWRlUm91dGVyfVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb25GZWF0dXJlID1cbiAgICBSb3V0ZXJGZWF0dXJlPFJvdXRlckZlYXR1cmVLaW5kLkVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZT47XG5cbi8qKlxuICogQSB0eXBlIGFsaWFzIGZvciBwcm92aWRlcnMgcmV0dXJuZWQgYnkgYHdpdGhFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbmAgb3JcbiAqIGB3aXRoRGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbmAgZnVuY3Rpb25zIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHNlZSB7QGxpbmsgd2l0aEVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9ufVxuICogQHNlZSB7QGxpbmsgd2l0aERpc2FibGVkSW5pdGlhbE5hdmlnYXRpb259XG4gKiBAc2VlIHtAbGluayBwcm92aWRlUm91dGVyfVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgSW5pdGlhbE5hdmlnYXRpb25GZWF0dXJlID1cbiAgICBFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmV8RGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmU7XG5cbi8qKlxuICogQ29uZmlndXJlcyBpbml0aWFsIG5hdmlnYXRpb24gdG8gc3RhcnQgYmVmb3JlIHRoZSByb290IGNvbXBvbmVudCBpcyBjcmVhdGVkLlxuICpcbiAqIFRoZSBib290c3RyYXAgaXMgYmxvY2tlZCB1bnRpbCB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIGlzIGNvbXBsZXRlLiBUaGlzIHZhbHVlIGlzIHJlcXVpcmVkIGZvclxuICogW3NlcnZlci1zaWRlIHJlbmRlcmluZ10oZ3VpZGUvc3NyKSB0byB3b3JrLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogQmFzaWMgZXhhbXBsZSBvZiBob3cgeW91IGNhbiBlbmFibGUgdGhpcyBuYXZpZ2F0aW9uIGJlaGF2aW9yOlxuICogYGBgXG4gKiBjb25zdCBhcHBSb3V0ZXM6IFJvdXRlcyA9IFtdO1xuICogYm9vdHN0cmFwQXBwbGljYXRpb24oQXBwQ29tcG9uZW50LFxuICogICB7XG4gKiAgICAgcHJvdmlkZXJzOiBbXG4gKiAgICAgICBwcm92aWRlUm91dGVyKGFwcFJvdXRlcywgd2l0aEVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uKCkpXG4gKiAgICAgXVxuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQHNlZSB7QGxpbmsgcHJvdmlkZVJvdXRlcn1cbiAqXG4gKiBAcHVibGljQXBpXG4gKiBAcmV0dXJucyBBIHNldCBvZiBwcm92aWRlcnMgZm9yIHVzZSB3aXRoIGBwcm92aWRlUm91dGVyYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbigpOiBFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUge1xuICBjb25zdCBwcm92aWRlcnMgPSBbXG4gICAge3Byb3ZpZGU6IElOSVRJQUxfTkFWSUdBVElPTiwgdXNlVmFsdWU6IEluaXRpYWxOYXZpZ2F0aW9uLkVuYWJsZWRCbG9ja2luZ30sXG4gICAge1xuICAgICAgcHJvdmlkZTogQVBQX0lOSVRJQUxJWkVSLFxuICAgICAgbXVsdGk6IHRydWUsXG4gICAgICBkZXBzOiBbSW5qZWN0b3JdLFxuICAgICAgdXNlRmFjdG9yeTogKGluamVjdG9yOiBJbmplY3RvcikgPT4ge1xuICAgICAgICBjb25zdCBsb2NhdGlvbkluaXRpYWxpemVkOiBQcm9taXNlPGFueT4gPVxuICAgICAgICAgICAgaW5qZWN0b3IuZ2V0KExPQ0FUSU9OX0lOSVRJQUxJWkVELCBQcm9taXNlLnJlc29sdmUoKSk7XG5cbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICByZXR1cm4gbG9jYXRpb25Jbml0aWFsaXplZC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgICAgY29uc3Qgcm91dGVyID0gaW5qZWN0b3IuZ2V0KFJvdXRlcik7XG4gICAgICAgICAgICAgIGNvbnN0IGJvb3RzdHJhcERvbmUgPSBpbmplY3Rvci5nZXQoQk9PVFNUUkFQX0RPTkUpO1xuICAgICAgICAgICAgICBhZnRlck5leHROYXZpZ2F0aW9uKHJvdXRlciwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFVuYmxvY2sgQVBQX0lOSVRJQUxJWkVSIGluIGNhc2UgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiB3YXMgY2FuY2VsZWQgb3IgZXJyb3JlZFxuICAgICAgICAgICAgICAgIC8vIHdpdGhvdXQgYSByZWRpcmVjdC5cbiAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICBpbmplY3Rvci5nZXQoTmF2aWdhdGlvblRyYW5zaXRpb25zKS5hZnRlclByZWFjdGl2YXRpb24gPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVW5ibG9jayBBUFBfSU5JVElBTElaRVIgb25jZSB3ZSBnZXQgdG8gYGFmdGVyUHJlYWN0aXZhdGlvbmAuIEF0IHRoaXMgcG9pbnQsIHdlXG4gICAgICAgICAgICAgICAgLy8gYXNzdW1lIGFjdGl2YXRpb24gd2lsbCBjb21wbGV0ZSBzdWNjZXNzZnVsbHkgKGV2ZW4gdGhvdWdoIHRoaXMgaXMgbm90XG4gICAgICAgICAgICAgICAgLy8gZ3VhcmFudGVlZCkuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYm9vdHN0cmFwRG9uZS5jbG9zZWQgPyBvZih2b2lkIDApIDogYm9vdHN0cmFwRG9uZTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgcm91dGVyLmluaXRpYWxOYXZpZ2F0aW9uKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9LFxuICBdO1xuICByZXR1cm4gcm91dGVyRmVhdHVyZShSb3V0ZXJGZWF0dXJlS2luZC5FbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUsIHByb3ZpZGVycyk7XG59XG5cbi8qKlxuICogQSB0eXBlIGFsaWFzIGZvciBwcm92aWRlcnMgcmV0dXJuZWQgYnkgYHdpdGhEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uYCBmb3IgdXNlIHdpdGhcbiAqIGBwcm92aWRlUm91dGVyYC5cbiAqXG4gKiBAc2VlIHtAbGluayB3aXRoRGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbn1cbiAqIEBzZWUge0BsaW5rIHByb3ZpZGVSb3V0ZXJ9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZSA9XG4gICAgUm91dGVyRmVhdHVyZTxSb3V0ZXJGZWF0dXJlS2luZC5EaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZT47XG5cbi8qKlxuICogRGlzYWJsZXMgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICpcbiAqIFVzZSBpZiB0aGVyZSBpcyBhIHJlYXNvbiB0byBoYXZlIG1vcmUgY29udHJvbCBvdmVyIHdoZW4gdGhlIHJvdXRlciBzdGFydHMgaXRzIGluaXRpYWwgbmF2aWdhdGlvblxuICogZHVlIHRvIHNvbWUgY29tcGxleCBpbml0aWFsaXphdGlvbiBsb2dpYy5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIEJhc2ljIGV4YW1wbGUgb2YgaG93IHlvdSBjYW4gZGlzYWJsZSBpbml0aWFsIG5hdmlnYXRpb246XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLCB3aXRoRGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbigpKVxuICogICAgIF1cbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICpcbiAqIEBzZWUge0BsaW5rIHByb3ZpZGVSb3V0ZXJ9XG4gKlxuICogQHJldHVybnMgQSBzZXQgb2YgcHJvdmlkZXJzIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aERpc2FibGVkSW5pdGlhbE5hdmlnYXRpb24oKTogRGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUge1xuICBjb25zdCBwcm92aWRlcnMgPSBbXG4gICAge1xuICAgICAgcHJvdmlkZTogQVBQX0lOSVRJQUxJWkVSLFxuICAgICAgbXVsdGk6IHRydWUsXG4gICAgICB1c2VGYWN0b3J5OiAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHJvdXRlciA9IGluamVjdChSb3V0ZXIpO1xuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgIHJvdXRlci5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHtwcm92aWRlOiBJTklUSUFMX05BVklHQVRJT04sIHVzZVZhbHVlOiBJbml0aWFsTmF2aWdhdGlvbi5EaXNhYmxlZH1cbiAgXTtcbiAgcmV0dXJuIHJvdXRlckZlYXR1cmUoUm91dGVyRmVhdHVyZUtpbmQuRGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUsIHByb3ZpZGVycyk7XG59XG5cbi8qKlxuICogQSB0eXBlIGFsaWFzIGZvciBwcm92aWRlcnMgcmV0dXJuZWQgYnkgYHdpdGhEZWJ1Z1RyYWNpbmdgIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHNlZSB7QGxpbmsgd2l0aERlYnVnVHJhY2luZ31cbiAqIEBzZWUge0BsaW5rIHByb3ZpZGVSb3V0ZXJ9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBEZWJ1Z1RyYWNpbmdGZWF0dXJlID0gUm91dGVyRmVhdHVyZTxSb3V0ZXJGZWF0dXJlS2luZC5EZWJ1Z1RyYWNpbmdGZWF0dXJlPjtcblxuLyoqXG4gKiBFbmFibGVzIGxvZ2dpbmcgb2YgYWxsIGludGVybmFsIG5hdmlnYXRpb24gZXZlbnRzIHRvIHRoZSBjb25zb2xlLlxuICogRXh0cmEgbG9nZ2luZyBtaWdodCBiZSB1c2VmdWwgZm9yIGRlYnVnZ2luZyBwdXJwb3NlcyB0byBpbnNwZWN0IFJvdXRlciBldmVudCBzZXF1ZW5jZS5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIEJhc2ljIGV4YW1wbGUgb2YgaG93IHlvdSBjYW4gZW5hYmxlIGRlYnVnIHRyYWNpbmc6XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLCB3aXRoRGVidWdUcmFjaW5nKCkpXG4gKiAgICAgXVxuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQHNlZSB7QGxpbmsgcHJvdmlkZVJvdXRlcn1cbiAqXG4gKiBAcmV0dXJucyBBIHNldCBvZiBwcm92aWRlcnMgZm9yIHVzZSB3aXRoIGBwcm92aWRlUm91dGVyYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXRoRGVidWdUcmFjaW5nKCk6IERlYnVnVHJhY2luZ0ZlYXR1cmUge1xuICBsZXQgcHJvdmlkZXJzOiBQcm92aWRlcltdID0gW107XG4gIGlmICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpIHtcbiAgICBwcm92aWRlcnMgPSBbe1xuICAgICAgcHJvdmlkZTogRU5WSVJPTk1FTlRfSU5JVElBTElaRVIsXG4gICAgICBtdWx0aTogdHJ1ZSxcbiAgICAgIHVzZUZhY3Rvcnk6ICgpID0+IHtcbiAgICAgICAgY29uc3Qgcm91dGVyID0gaW5qZWN0KFJvdXRlcik7XG4gICAgICAgIHJldHVybiAoKSA9PiByb3V0ZXIuZXZlbnRzLnN1YnNjcmliZSgoZTogRXZlbnQpID0+IHtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5ncm91cD8uKGBSb3V0ZXIgRXZlbnQ6ICR7KDxhbnk+ZS5jb25zdHJ1Y3RvcikubmFtZX1gKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhzdHJpbmdpZnlFdmVudChlKSk7XG4gICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgY29uc29sZS5ncm91cEVuZD8uKCk7XG4gICAgICAgICAgLy8gdHNsaW50OmVuYWJsZTpuby1jb25zb2xlXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1dO1xuICB9IGVsc2Uge1xuICAgIHByb3ZpZGVycyA9IFtdO1xuICB9XG4gIHJldHVybiByb3V0ZXJGZWF0dXJlKFJvdXRlckZlYXR1cmVLaW5kLkRlYnVnVHJhY2luZ0ZlYXR1cmUsIHByb3ZpZGVycyk7XG59XG5cbmNvbnN0IFJPVVRFUl9QUkVMT0FERVIgPSBuZXcgSW5qZWN0aW9uVG9rZW48Um91dGVyUHJlbG9hZGVyPihcbiAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSA/ICdyb3V0ZXIgcHJlbG9hZGVyJyA6ICcnKTtcblxuLyoqXG4gKiBBIHR5cGUgYWxpYXMgdGhhdCByZXByZXNlbnRzIGEgZmVhdHVyZSB3aGljaCBlbmFibGVzIHByZWxvYWRpbmcgaW4gUm91dGVyLlxuICogVGhlIHR5cGUgaXMgdXNlZCB0byBkZXNjcmliZSB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBgd2l0aFByZWxvYWRpbmdgIGZ1bmN0aW9uLlxuICpcbiAqIEBzZWUge0BsaW5rIHdpdGhQcmVsb2FkaW5nfVxuICogQHNlZSB7QGxpbmsgcHJvdmlkZVJvdXRlcn1cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIFByZWxvYWRpbmdGZWF0dXJlID0gUm91dGVyRmVhdHVyZTxSb3V0ZXJGZWF0dXJlS2luZC5QcmVsb2FkaW5nRmVhdHVyZT47XG5cbi8qKlxuICogQWxsb3dzIHRvIGNvbmZpZ3VyZSBhIHByZWxvYWRpbmcgc3RyYXRlZ3kgdG8gdXNlLiBUaGUgc3RyYXRlZ3kgaXMgY29uZmlndXJlZCBieSBwcm92aWRpbmcgYVxuICogcmVmZXJlbmNlIHRvIGEgY2xhc3MgdGhhdCBpbXBsZW1lbnRzIGEgYFByZWxvYWRpbmdTdHJhdGVneWAuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBCYXNpYyBleGFtcGxlIG9mIGhvdyB5b3UgY2FuIGNvbmZpZ3VyZSBwcmVsb2FkaW5nOlxuICogYGBgXG4gKiBjb25zdCBhcHBSb3V0ZXM6IFJvdXRlcyA9IFtdO1xuICogYm9vdHN0cmFwQXBwbGljYXRpb24oQXBwQ29tcG9uZW50LFxuICogICB7XG4gKiAgICAgcHJvdmlkZXJzOiBbXG4gKiAgICAgICBwcm92aWRlUm91dGVyKGFwcFJvdXRlcywgd2l0aFByZWxvYWRpbmcoUHJlbG9hZEFsbE1vZHVsZXMpKVxuICogICAgIF1cbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICpcbiAqIEBzZWUge0BsaW5rIHByb3ZpZGVSb3V0ZXJ9XG4gKlxuICogQHBhcmFtIHByZWxvYWRpbmdTdHJhdGVneSBBIHJlZmVyZW5jZSB0byBhIGNsYXNzIHRoYXQgaW1wbGVtZW50cyBhIGBQcmVsb2FkaW5nU3RyYXRlZ3lgIHRoYXRcbiAqICAgICBzaG91bGQgYmUgdXNlZC5cbiAqIEByZXR1cm5zIEEgc2V0IG9mIHByb3ZpZGVycyBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhQcmVsb2FkaW5nKHByZWxvYWRpbmdTdHJhdGVneTogVHlwZTxQcmVsb2FkaW5nU3RyYXRlZ3k+KTogUHJlbG9hZGluZ0ZlYXR1cmUge1xuICBjb25zdCBwcm92aWRlcnMgPSBbXG4gICAge3Byb3ZpZGU6IFJPVVRFUl9QUkVMT0FERVIsIHVzZUV4aXN0aW5nOiBSb3V0ZXJQcmVsb2FkZXJ9LFxuICAgIHtwcm92aWRlOiBQcmVsb2FkaW5nU3RyYXRlZ3ksIHVzZUV4aXN0aW5nOiBwcmVsb2FkaW5nU3RyYXRlZ3l9LFxuICBdO1xuICByZXR1cm4gcm91dGVyRmVhdHVyZShSb3V0ZXJGZWF0dXJlS2luZC5QcmVsb2FkaW5nRmVhdHVyZSwgcHJvdmlkZXJzKTtcbn1cblxuLyoqXG4gKiBBIHR5cGUgYWxpYXMgZm9yIHByb3ZpZGVycyByZXR1cm5lZCBieSBgd2l0aFJvdXRlckNvbmZpZ2AgZm9yIHVzZSB3aXRoIGBwcm92aWRlUm91dGVyYC5cbiAqXG4gKiBAc2VlIHtAbGluayB3aXRoUm91dGVyQ29uZmlnfVxuICogQHNlZSB7QGxpbmsgcHJvdmlkZVJvdXRlcn1cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIFJvdXRlckNvbmZpZ3VyYXRpb25GZWF0dXJlID1cbiAgICBSb3V0ZXJGZWF0dXJlPFJvdXRlckZlYXR1cmVLaW5kLlJvdXRlckNvbmZpZ3VyYXRpb25GZWF0dXJlPjtcblxuLyoqXG4gKiBBbGxvd3MgdG8gcHJvdmlkZSBleHRyYSBwYXJhbWV0ZXJzIHRvIGNvbmZpZ3VyZSBSb3V0ZXIuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBCYXNpYyBleGFtcGxlIG9mIGhvdyB5b3UgY2FuIHByb3ZpZGUgZXh0cmEgY29uZmlndXJhdGlvbiBvcHRpb25zOlxuICogYGBgXG4gKiBjb25zdCBhcHBSb3V0ZXM6IFJvdXRlcyA9IFtdO1xuICogYm9vdHN0cmFwQXBwbGljYXRpb24oQXBwQ29tcG9uZW50LFxuICogICB7XG4gKiAgICAgcHJvdmlkZXJzOiBbXG4gKiAgICAgICBwcm92aWRlUm91dGVyKGFwcFJvdXRlcywgd2l0aFJvdXRlckNvbmZpZyh7XG4gKiAgICAgICAgICBvblNhbWVVcmxOYXZpZ2F0aW9uOiAncmVsb2FkJ1xuICogICAgICAgfSkpXG4gKiAgICAgXVxuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQHNlZSB7QGxpbmsgcHJvdmlkZVJvdXRlcn1cbiAqXG4gKiBAcGFyYW0gb3B0aW9ucyBBIHNldCBvZiBwYXJhbWV0ZXJzIHRvIGNvbmZpZ3VyZSBSb3V0ZXIsIHNlZSBgUm91dGVyQ29uZmlnT3B0aW9uc2AgZm9yXG4gKiAgICAgYWRkaXRpb25hbCBpbmZvcm1hdGlvbi5cbiAqIEByZXR1cm5zIEEgc2V0IG9mIHByb3ZpZGVycyBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhSb3V0ZXJDb25maWcob3B0aW9uczogUm91dGVyQ29uZmlnT3B0aW9ucyk6IFJvdXRlckNvbmZpZ3VyYXRpb25GZWF0dXJlIHtcbiAgY29uc3QgcHJvdmlkZXJzID0gW1xuICAgIHtwcm92aWRlOiBST1VURVJfQ09ORklHVVJBVElPTiwgdXNlVmFsdWU6IG9wdGlvbnN9LFxuICBdO1xuICByZXR1cm4gcm91dGVyRmVhdHVyZShSb3V0ZXJGZWF0dXJlS2luZC5Sb3V0ZXJDb25maWd1cmF0aW9uRmVhdHVyZSwgcHJvdmlkZXJzKTtcbn1cblxuLyoqXG4gKiBBIHR5cGUgYWxpYXMgZm9yIHByb3ZpZGVycyByZXR1cm5lZCBieSBgd2l0aEhhc2hMb2NhdGlvbmAgZm9yIHVzZSB3aXRoIGBwcm92aWRlUm91dGVyYC5cbiAqXG4gKiBAc2VlIHtAbGluayB3aXRoSGFzaExvY2F0aW9ufVxuICogQHNlZSB7QGxpbmsgcHJvdmlkZVJvdXRlcn1cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIFJvdXRlckhhc2hMb2NhdGlvbkZlYXR1cmUgPSBSb3V0ZXJGZWF0dXJlPFJvdXRlckZlYXR1cmVLaW5kLlJvdXRlckhhc2hMb2NhdGlvbkZlYXR1cmU+O1xuXG4vKipcbiAqIFByb3ZpZGVzIHRoZSBsb2NhdGlvbiBzdHJhdGVneSB0aGF0IHVzZXMgdGhlIFVSTCBmcmFnbWVudCBpbnN0ZWFkIG9mIHRoZSBoaXN0b3J5IEFQSS5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIEJhc2ljIGV4YW1wbGUgb2YgaG93IHlvdSBjYW4gdXNlIHRoZSBoYXNoIGxvY2F0aW9uIG9wdGlvbjpcbiAqIGBgYFxuICogY29uc3QgYXBwUm91dGVzOiBSb3V0ZXMgPSBbXTtcbiAqIGJvb3RzdHJhcEFwcGxpY2F0aW9uKEFwcENvbXBvbmVudCxcbiAqICAge1xuICogICAgIHByb3ZpZGVyczogW1xuICogICAgICAgcHJvdmlkZVJvdXRlcihhcHBSb3V0ZXMsIHdpdGhIYXNoTG9jYXRpb24oKSlcbiAqICAgICBdXG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqXG4gKiBAc2VlIHtAbGluayBwcm92aWRlUm91dGVyfVxuICogQHNlZSB7QGxpbmsgSGFzaExvY2F0aW9uU3RyYXRlZ3l9XG4gKlxuICogQHJldHVybnMgQSBzZXQgb2YgcHJvdmlkZXJzIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aEhhc2hMb2NhdGlvbigpOiBSb3V0ZXJIYXNoTG9jYXRpb25GZWF0dXJlIHtcbiAgY29uc3QgcHJvdmlkZXJzID0gW1xuICAgIHtwcm92aWRlOiBMb2NhdGlvblN0cmF0ZWd5LCB1c2VDbGFzczogSGFzaExvY2F0aW9uU3RyYXRlZ3l9LFxuICBdO1xuICByZXR1cm4gcm91dGVyRmVhdHVyZShSb3V0ZXJGZWF0dXJlS2luZC5Sb3V0ZXJIYXNoTG9jYXRpb25GZWF0dXJlLCBwcm92aWRlcnMpO1xufVxuXG4vKipcbiAqIEEgdHlwZSBhbGlhcyBmb3IgcHJvdmlkZXJzIHJldHVybmVkIGJ5IGB3aXRoTmF2aWdhdGlvbkVycm9ySGFuZGxlcmAgZm9yIHVzZSB3aXRoIGBwcm92aWRlUm91dGVyYC5cbiAqXG4gKiBAc2VlIHtAbGluayB3aXRoTmF2aWdhdGlvbkVycm9ySGFuZGxlcn1cbiAqIEBzZWUge0BsaW5rIHByb3ZpZGVSb3V0ZXJ9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBOYXZpZ2F0aW9uRXJyb3JIYW5kbGVyRmVhdHVyZSA9XG4gICAgUm91dGVyRmVhdHVyZTxSb3V0ZXJGZWF0dXJlS2luZC5OYXZpZ2F0aW9uRXJyb3JIYW5kbGVyRmVhdHVyZT47XG5cbi8qKlxuICogU3Vic2NyaWJlcyB0byB0aGUgUm91dGVyJ3MgbmF2aWdhdGlvbiBldmVudHMgYW5kIGNhbGxzIHRoZSBnaXZlbiBmdW5jdGlvbiB3aGVuIGFcbiAqIGBOYXZpZ2F0aW9uRXJyb3JgIGhhcHBlbnMuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBpcyBydW4gaW5zaWRlIGFwcGxpY2F0aW9uJ3MgW2luamVjdGlvbiBjb250ZXh0XShndWlkZS9kZXBlbmRlbmN5LWluamVjdGlvbi1jb250ZXh0KVxuICogc28geW91IGNhbiB1c2UgdGhlIFtgaW5qZWN0YF0oYXBpL2NvcmUvaW5qZWN0KSBmdW5jdGlvbi5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIEJhc2ljIGV4YW1wbGUgb2YgaG93IHlvdSBjYW4gdXNlIHRoZSBlcnJvciBoYW5kbGVyIG9wdGlvbjpcbiAqIGBgYFxuICogY29uc3QgYXBwUm91dGVzOiBSb3V0ZXMgPSBbXTtcbiAqIGJvb3RzdHJhcEFwcGxpY2F0aW9uKEFwcENvbXBvbmVudCxcbiAqICAge1xuICogICAgIHByb3ZpZGVyczogW1xuICogICAgICAgcHJvdmlkZVJvdXRlcihhcHBSb3V0ZXMsIHdpdGhOYXZpZ2F0aW9uRXJyb3JIYW5kbGVyKChlOiBOYXZpZ2F0aW9uRXJyb3IpID0+XG4gKiBpbmplY3QoTXlFcnJvclRyYWNrZXIpLnRyYWNrRXJyb3IoZSkpKVxuICogICAgIF1cbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICpcbiAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25FcnJvcn1cbiAqIEBzZWUge0BsaW5rIGNvcmUvaW5qZWN0fVxuICogQHNlZSB7QGxpbmsgcnVuSW5JbmplY3Rpb25Db250ZXh0fVxuICpcbiAqIEByZXR1cm5zIEEgc2V0IG9mIHByb3ZpZGVycyBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhOYXZpZ2F0aW9uRXJyb3JIYW5kbGVyKGZuOiAoZXJyb3I6IE5hdmlnYXRpb25FcnJvcikgPT4gdm9pZCk6XG4gICAgTmF2aWdhdGlvbkVycm9ySGFuZGxlckZlYXR1cmUge1xuICBjb25zdCBwcm92aWRlcnMgPSBbe1xuICAgIHByb3ZpZGU6IEVOVklST05NRU5UX0lOSVRJQUxJWkVSLFxuICAgIG11bHRpOiB0cnVlLFxuICAgIHVzZVZhbHVlOiAoKSA9PiB7XG4gICAgICBjb25zdCBpbmplY3RvciA9IGluamVjdChFbnZpcm9ubWVudEluamVjdG9yKTtcbiAgICAgIGluamVjdChSb3V0ZXIpLmV2ZW50cy5zdWJzY3JpYmUoKGUpID0+IHtcbiAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRXJyb3IpIHtcbiAgICAgICAgICBydW5JbkluamVjdGlvbkNvbnRleHQoaW5qZWN0b3IsICgpID0+IGZuKGUpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XTtcbiAgcmV0dXJuIHJvdXRlckZlYXR1cmUoUm91dGVyRmVhdHVyZUtpbmQuTmF2aWdhdGlvbkVycm9ySGFuZGxlckZlYXR1cmUsIHByb3ZpZGVycyk7XG59XG5cbi8qKlxuICogQSB0eXBlIGFsaWFzIGZvciBwcm92aWRlcnMgcmV0dXJuZWQgYnkgYHdpdGhDb21wb25lbnRJbnB1dEJpbmRpbmdgIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHNlZSB7QGxpbmsgd2l0aENvbXBvbmVudElucHV0QmluZGluZ31cbiAqIEBzZWUge0BsaW5rIHByb3ZpZGVSb3V0ZXJ9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBDb21wb25lbnRJbnB1dEJpbmRpbmdGZWF0dXJlID1cbiAgICBSb3V0ZXJGZWF0dXJlPFJvdXRlckZlYXR1cmVLaW5kLkNvbXBvbmVudElucHV0QmluZGluZ0ZlYXR1cmU+O1xuXG4vKipcbiAqIEEgdHlwZSBhbGlhcyBmb3IgcHJvdmlkZXJzIHJldHVybmVkIGJ5IGB3aXRoVmlld1RyYW5zaXRpb25zYCBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBzZWUge0BsaW5rIHdpdGhWaWV3VHJhbnNpdGlvbnN9XG4gKiBAc2VlIHtAbGluayBwcm92aWRlUm91dGVyfVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgVmlld1RyYW5zaXRpb25zRmVhdHVyZSA9IFJvdXRlckZlYXR1cmU8Um91dGVyRmVhdHVyZUtpbmQuVmlld1RyYW5zaXRpb25zRmVhdHVyZT47XG5cbi8qKlxuICogRW5hYmxlcyBiaW5kaW5nIGluZm9ybWF0aW9uIGZyb20gdGhlIGBSb3V0ZXJgIHN0YXRlIGRpcmVjdGx5IHRvIHRoZSBpbnB1dHMgb2YgdGhlIGNvbXBvbmVudCBpblxuICogYFJvdXRlYCBjb25maWd1cmF0aW9ucy5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIEJhc2ljIGV4YW1wbGUgb2YgaG93IHlvdSBjYW4gZW5hYmxlIHRoZSBmZWF0dXJlOlxuICogYGBgXG4gKiBjb25zdCBhcHBSb3V0ZXM6IFJvdXRlcyA9IFtdO1xuICogYm9vdHN0cmFwQXBwbGljYXRpb24oQXBwQ29tcG9uZW50LFxuICogICB7XG4gKiAgICAgcHJvdmlkZXJzOiBbXG4gKiAgICAgICBwcm92aWRlUm91dGVyKGFwcFJvdXRlcywgd2l0aENvbXBvbmVudElucHV0QmluZGluZygpKVxuICogICAgIF1cbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICpcbiAqIEByZXR1cm5zIEEgc2V0IG9mIHByb3ZpZGVycyBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aENvbXBvbmVudElucHV0QmluZGluZygpOiBDb21wb25lbnRJbnB1dEJpbmRpbmdGZWF0dXJlIHtcbiAgY29uc3QgcHJvdmlkZXJzID0gW1xuICAgIFJvdXRlZENvbXBvbmVudElucHV0QmluZGVyLFxuICAgIHtwcm92aWRlOiBJTlBVVF9CSU5ERVIsIHVzZUV4aXN0aW5nOiBSb3V0ZWRDb21wb25lbnRJbnB1dEJpbmRlcn0sXG4gIF07XG5cbiAgcmV0dXJuIHJvdXRlckZlYXR1cmUoUm91dGVyRmVhdHVyZUtpbmQuQ29tcG9uZW50SW5wdXRCaW5kaW5nRmVhdHVyZSwgcHJvdmlkZXJzKTtcbn1cblxuLyoqXG4gKiBFbmFibGVzIHZpZXcgdHJhbnNpdGlvbnMgaW4gdGhlIFJvdXRlciBieSBydW5uaW5nIHRoZSByb3V0ZSBhY3RpdmF0aW9uIGFuZCBkZWFjdGl2YXRpb24gaW5zaWRlIG9mXG4gKiBgZG9jdW1lbnQuc3RhcnRWaWV3VHJhbnNpdGlvbmAuXG4gKlxuICogTm90ZTogVGhlIFZpZXcgVHJhbnNpdGlvbnMgQVBJIGlzIG5vdCBhdmFpbGFibGUgaW4gYWxsIGJyb3dzZXJzLiBJZiB0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0XG4gKiB2aWV3IHRyYW5zaXRpb25zLCB0aGUgUm91dGVyIHdpbGwgbm90IGF0dGVtcHQgdG8gc3RhcnQgYSB2aWV3IHRyYW5zaXRpb24gYW5kIGNvbnRpbnVlIHByb2Nlc3NpbmdcbiAqIHRoZSBuYXZpZ2F0aW9uIGFzIHVzdWFsLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogQmFzaWMgZXhhbXBsZSBvZiBob3cgeW91IGNhbiBlbmFibGUgdGhlIGZlYXR1cmU6XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLCB3aXRoVmlld1RyYW5zaXRpb25zKCkpXG4gKiAgICAgXVxuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQHJldHVybnMgQSBzZXQgb2YgcHJvdmlkZXJzIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLmNocm9tZS5jb20vZG9jcy93ZWItcGxhdGZvcm0vdmlldy10cmFuc2l0aW9ucy9cbiAqIEBzZWUgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1ZpZXdfVHJhbnNpdGlvbnNfQVBJXG4gKiBAZXhwZXJpbWVudGFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXRoVmlld1RyYW5zaXRpb25zKG9wdGlvbnM/OiBWaWV3VHJhbnNpdGlvbnNGZWF0dXJlT3B0aW9ucyk6XG4gICAgVmlld1RyYW5zaXRpb25zRmVhdHVyZSB7XG4gIGNvbnN0IHByb3ZpZGVycyA9IFtcbiAgICB7cHJvdmlkZTogQ1JFQVRFX1ZJRVdfVFJBTlNJVElPTiwgdXNlVmFsdWU6IGNyZWF0ZVZpZXdUcmFuc2l0aW9ufSxcbiAgICB7XG4gICAgICBwcm92aWRlOiBWSUVXX1RSQU5TSVRJT05fT1BUSU9OUyxcbiAgICAgIHVzZVZhbHVlOiB7c2tpcE5leHRUcmFuc2l0aW9uOiAhIW9wdGlvbnM/LnNraXBJbml0aWFsVHJhbnNpdGlvbiwgLi4ub3B0aW9uc31cbiAgICB9LFxuICBdO1xuICByZXR1cm4gcm91dGVyRmVhdHVyZShSb3V0ZXJGZWF0dXJlS2luZC5WaWV3VHJhbnNpdGlvbnNGZWF0dXJlLCBwcm92aWRlcnMpO1xufVxuXG4vKipcbiAqIEEgdHlwZSBhbGlhcyB0aGF0IHJlcHJlc2VudHMgYWxsIFJvdXRlciBmZWF0dXJlcyBhdmFpbGFibGUgZm9yIHVzZSB3aXRoIGBwcm92aWRlUm91dGVyYC5cbiAqIEZlYXR1cmVzIGNhbiBiZSBlbmFibGVkIGJ5IGFkZGluZyBzcGVjaWFsIGZ1bmN0aW9ucyB0byB0aGUgYHByb3ZpZGVSb3V0ZXJgIGNhbGwuXG4gKiBTZWUgZG9jdW1lbnRhdGlvbiBmb3IgZWFjaCBzeW1ib2wgdG8gZmluZCBjb3JyZXNwb25kaW5nIGZ1bmN0aW9uIG5hbWUuIFNlZSBhbHNvIGBwcm92aWRlUm91dGVyYFxuICogZG9jdW1lbnRhdGlvbiBvbiBob3cgdG8gdXNlIHRob3NlIGZ1bmN0aW9ucy5cbiAqXG4gKiBAc2VlIHtAbGluayBwcm92aWRlUm91dGVyfVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgUm91dGVyRmVhdHVyZXMgPSBQcmVsb2FkaW5nRmVhdHVyZXxEZWJ1Z1RyYWNpbmdGZWF0dXJlfEluaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZXxcbiAgICBJbk1lbW9yeVNjcm9sbGluZ0ZlYXR1cmV8Um91dGVyQ29uZmlndXJhdGlvbkZlYXR1cmV8TmF2aWdhdGlvbkVycm9ySGFuZGxlckZlYXR1cmV8XG4gICAgQ29tcG9uZW50SW5wdXRCaW5kaW5nRmVhdHVyZXxWaWV3VHJhbnNpdGlvbnNGZWF0dXJlfFJvdXRlckhhc2hMb2NhdGlvbkZlYXR1cmU7XG5cbi8qKlxuICogVGhlIGxpc3Qgb2YgZmVhdHVyZXMgYXMgYW4gZW51bSB0byB1bmlxdWVseSB0eXBlIGVhY2ggZmVhdHVyZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gUm91dGVyRmVhdHVyZUtpbmQge1xuICBQcmVsb2FkaW5nRmVhdHVyZSxcbiAgRGVidWdUcmFjaW5nRmVhdHVyZSxcbiAgRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb25GZWF0dXJlLFxuICBEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZSxcbiAgSW5NZW1vcnlTY3JvbGxpbmdGZWF0dXJlLFxuICBSb3V0ZXJDb25maWd1cmF0aW9uRmVhdHVyZSxcbiAgUm91dGVySGFzaExvY2F0aW9uRmVhdHVyZSxcbiAgTmF2aWdhdGlvbkVycm9ySGFuZGxlckZlYXR1cmUsXG4gIENvbXBvbmVudElucHV0QmluZGluZ0ZlYXR1cmUsXG4gIFZpZXdUcmFuc2l0aW9uc0ZlYXR1cmUsXG59XG4iXX0=