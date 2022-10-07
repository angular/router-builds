/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { LOCATION_INITIALIZED, ViewportScroller } from '@angular/common';
import { APP_BOOTSTRAP_LISTENER, APP_INITIALIZER, ApplicationRef, ENVIRONMENT_INITIALIZER, inject, InjectFlags, InjectionToken, Injector, makeEnvironmentProviders } from '@angular/core';
import { of, Subject } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { NavigationCancel, NavigationEnd, NavigationError, stringifyEvent } from './events';
import { Router } from './router';
import { ROUTER_CONFIGURATION } from './router_config';
import { ROUTES } from './router_config_loader';
import { PreloadingStrategy, RouterPreloader } from './router_preloader';
import { ROUTER_SCROLLER, RouterScroller } from './router_scroller';
import { ActivatedRoute } from './router_state';
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || ngDevMode;
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
 * @see `RouterFeatures`
 *
 * @publicApi
 * @developerPreview
 * @param routes A set of `Route`s to use for the application routing table.
 * @param features Optional features to configure additional router behaviors.
 * @returns A set of providers to setup a Router.
 */
export function provideRouter(routes, ...features) {
    return makeEnvironmentProviders([
        provideRoutes(routes), { provide: ActivatedRoute, useFactory: rootRoute, deps: [Router] },
        { provide: APP_BOOTSTRAP_LISTENER, multi: true, useFactory: getBootstrapListener },
        features.map(feature => feature.ɵproviders),
        // TODO: All options used by the `assignExtraOptionsToRouter` factory need to be reviewed for
        // how we want them to be configured. This API doesn't currently have a way to configure them
        // and we should decide what the _best_ way to do that is rather than just sticking with the
        // status quo of how it's done today.
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
 * @publicApi
 */
export function provideRoutes(routes) {
    return [
        { provide: ROUTES, multi: true, useValue: routes },
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
 * @see `provideRouter`
 * @see `ViewportScroller`
 *
 * @publicApi
 * @developerPreview
 * @param options Set of configuration parameters to customize scrolling behavior, see
 *     `InMemoryScrollingOptions` for additional information.
 * @returns A set of providers for use with `provideRouter`.
 */
export function withInMemoryScrolling(options = {}) {
    const providers = [{
            provide: ROUTER_SCROLLER,
            useFactory: () => {
                const router = inject(Router);
                const viewportScroller = inject(ViewportScroller);
                return new RouterScroller(router, viewportScroller, options);
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
        bootstrapDone.next();
        bootstrapDone.complete();
    };
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
const INITIAL_NAVIGATION = new InjectionToken(NG_DEV_MODE ? 'initial navigation' : '', { providedIn: 'root', factory: () => 1 /* InitialNavigation.EnabledNonBlocking */ });
/**
 * Configures initial navigation to start before the root component is created.
 *
 * The bootstrap is blocked until the initial navigation is complete. This value is required for
 * [server-side rendering](guide/universal) to work.
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
 * @see `provideRouter`
 *
 * @publicApi
 * @developerPreview
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
 * @see `provideRouter`
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 * @developerPreview
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
 * @see `provideRouter`
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 * @developerPreview
 */
export function withDebugTracing() {
    let providers = [];
    if (NG_DEV_MODE) {
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
const ROUTER_PRELOADER = new InjectionToken(NG_DEV_MODE ? 'router preloader' : '');
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
 * @see `provideRouter`
 *
 * @param preloadingStrategy A reference to a class that implements a `PreloadingStrategy` that
 *     should be used.
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 * @developerPreview
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
 * @see `provideRouter`
 *
 * @param options A set of parameters to configure Router, see `RouterConfigOptions` for
 *     additional information.
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 * @developerPreview
 */
export function withRouterConfig(options) {
    const providers = [
        { provide: ROUTER_CONFIGURATION, useValue: options },
    ];
    return routerFeature(5 /* RouterFeatureKind.RouterConfigurationFeature */, providers);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZV9yb3V0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3Byb3ZpZGVfcm91dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZFLE9BQU8sRUFBQyxzQkFBc0IsRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFnQix1QkFBdUIsRUFBd0IsTUFBTSxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLHdCQUF3QixFQUFpQixNQUFNLGVBQWUsQ0FBQztBQUM1TyxPQUFPLEVBQUMsRUFBRSxFQUFFLE9BQU8sRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUNqQyxPQUFPLEVBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUVqRCxPQUFPLEVBQVEsZ0JBQWdCLEVBQThCLGFBQWEsRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBRTdILE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDaEMsT0FBTyxFQUEyQixvQkFBb0IsRUFBc0IsTUFBTSxpQkFBaUIsQ0FBQztBQUNwRyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDOUMsT0FBTyxFQUFDLGtCQUFrQixFQUFFLGVBQWUsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3ZFLE9BQU8sRUFBQyxlQUFlLEVBQUUsY0FBYyxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDbEUsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRTlDLE1BQU0sV0FBVyxHQUFHLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTLENBQUM7QUFFbEU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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QyxDQUFDO0FBY3BHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQTBCRztBQUNILE1BQU0sVUFBVSxjQUFjLENBQUMsa0JBQTRDO0lBQ3pFLE1BQU0sU0FBUyxHQUFHO1FBQ2hCLEVBQUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUM7UUFDekQsRUFBQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsV0FBVyxFQUFFLGtCQUFrQixFQUFDO0tBQy9ELENBQUM7SUFDRixPQUFPLGFBQWEsOENBQXNDLFNBQVMsQ0FBQyxDQUFDO0FBQ3ZFLENBQUM7QUFjRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBMkJHO0FBQ0gsTUFBTSxVQUFVLGdCQUFnQixDQUFDLE9BQTRCO0lBQzNELE1BQU0sU0FBUyxHQUFHO1FBQ2hCLEVBQUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUM7S0FDbkQsQ0FBQztJQUNGLE9BQU8sYUFBYSx1REFBK0MsU0FBUyxDQUFDLENBQUM7QUFDaEYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xPQ0FUSU9OX0lOSVRJQUxJWkVELCBWaWV3cG9ydFNjcm9sbGVyfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLCBBUFBfSU5JVElBTElaRVIsIEFwcGxpY2F0aW9uUmVmLCBDb21wb25lbnRSZWYsIEVOVklST05NRU5UX0lOSVRJQUxJWkVSLCBFbnZpcm9ubWVudFByb3ZpZGVycywgaW5qZWN0LCBJbmplY3RGbGFncywgSW5qZWN0aW9uVG9rZW4sIEluamVjdG9yLCBtYWtlRW52aXJvbm1lbnRQcm92aWRlcnMsIFByb3ZpZGVyLCBUeXBlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7b2YsIFN1YmplY3R9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtmaWx0ZXIsIG1hcCwgdGFrZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0V2ZW50LCBOYXZpZ2F0aW9uQ2FuY2VsLCBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZSwgTmF2aWdhdGlvbkVuZCwgTmF2aWdhdGlvbkVycm9yLCBzdHJpbmdpZnlFdmVudH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtSb3V0ZXN9IGZyb20gJy4vbW9kZWxzJztcbmltcG9ydCB7Um91dGVyfSBmcm9tICcuL3JvdXRlcic7XG5pbXBvcnQge0luTWVtb3J5U2Nyb2xsaW5nT3B0aW9ucywgUk9VVEVSX0NPTkZJR1VSQVRJT04sIFJvdXRlckNvbmZpZ09wdGlvbnN9IGZyb20gJy4vcm91dGVyX2NvbmZpZyc7XG5pbXBvcnQge1JPVVRFU30gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge1ByZWxvYWRpbmdTdHJhdGVneSwgUm91dGVyUHJlbG9hZGVyfSBmcm9tICcuL3JvdXRlcl9wcmVsb2FkZXInO1xuaW1wb3J0IHtST1VURVJfU0NST0xMRVIsIFJvdXRlclNjcm9sbGVyfSBmcm9tICcuL3JvdXRlcl9zY3JvbGxlcic7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlfSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlO1xuXG4vKipcbiAqIFNldHMgdXAgcHJvdmlkZXJzIG5lY2Vzc2FyeSB0byBlbmFibGUgYFJvdXRlcmAgZnVuY3Rpb25hbGl0eSBmb3IgdGhlIGFwcGxpY2F0aW9uLlxuICogQWxsb3dzIHRvIGNvbmZpZ3VyZSBhIHNldCBvZiByb3V0ZXMgYXMgd2VsbCBhcyBleHRyYSBmZWF0dXJlcyB0aGF0IHNob3VsZCBiZSBlbmFibGVkLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogQmFzaWMgZXhhbXBsZSBvZiBob3cgeW91IGNhbiBhZGQgYSBSb3V0ZXIgdG8geW91ciBhcHBsaWNhdGlvbjpcbiAqIGBgYFxuICogY29uc3QgYXBwUm91dGVzOiBSb3V0ZXMgPSBbXTtcbiAqIGJvb3RzdHJhcEFwcGxpY2F0aW9uKEFwcENvbXBvbmVudCwge1xuICogICBwcm92aWRlcnM6IFtwcm92aWRlUm91dGVyKGFwcFJvdXRlcyldXG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIFlvdSBjYW4gYWxzbyBlbmFibGUgb3B0aW9uYWwgZmVhdHVyZXMgaW4gdGhlIFJvdXRlciBieSBhZGRpbmcgZnVuY3Rpb25zIGZyb20gdGhlIGBSb3V0ZXJGZWF0dXJlc2BcbiAqIHR5cGU6XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLFxuICogICAgICAgICB3aXRoRGVidWdUcmFjaW5nKCksXG4gKiAgICAgICAgIHdpdGhSb3V0ZXJDb25maWcoe3BhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6ICdhbHdheXMnfSkpXG4gKiAgICAgXVxuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQHNlZSBgUm91dGVyRmVhdHVyZXNgXG4gKlxuICogQHB1YmxpY0FwaVxuICogQGRldmVsb3BlclByZXZpZXdcbiAqIEBwYXJhbSByb3V0ZXMgQSBzZXQgb2YgYFJvdXRlYHMgdG8gdXNlIGZvciB0aGUgYXBwbGljYXRpb24gcm91dGluZyB0YWJsZS5cbiAqIEBwYXJhbSBmZWF0dXJlcyBPcHRpb25hbCBmZWF0dXJlcyB0byBjb25maWd1cmUgYWRkaXRpb25hbCByb3V0ZXIgYmVoYXZpb3JzLlxuICogQHJldHVybnMgQSBzZXQgb2YgcHJvdmlkZXJzIHRvIHNldHVwIGEgUm91dGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZVJvdXRlcihyb3V0ZXM6IFJvdXRlcywgLi4uZmVhdHVyZXM6IFJvdXRlckZlYXR1cmVzW10pOiBFbnZpcm9ubWVudFByb3ZpZGVycyB7XG4gIHJldHVybiBtYWtlRW52aXJvbm1lbnRQcm92aWRlcnMoW1xuICAgIHByb3ZpZGVSb3V0ZXMocm91dGVzKSwge3Byb3ZpZGU6IEFjdGl2YXRlZFJvdXRlLCB1c2VGYWN0b3J5OiByb290Um91dGUsIGRlcHM6IFtSb3V0ZXJdfSxcbiAgICB7cHJvdmlkZTogQVBQX0JPT1RTVFJBUF9MSVNURU5FUiwgbXVsdGk6IHRydWUsIHVzZUZhY3Rvcnk6IGdldEJvb3RzdHJhcExpc3RlbmVyfSxcbiAgICBmZWF0dXJlcy5tYXAoZmVhdHVyZSA9PiBmZWF0dXJlLsm1cHJvdmlkZXJzKSxcbiAgICAvLyBUT0RPOiBBbGwgb3B0aW9ucyB1c2VkIGJ5IHRoZSBgYXNzaWduRXh0cmFPcHRpb25zVG9Sb3V0ZXJgIGZhY3RvcnkgbmVlZCB0byBiZSByZXZpZXdlZCBmb3JcbiAgICAvLyBob3cgd2Ugd2FudCB0aGVtIHRvIGJlIGNvbmZpZ3VyZWQuIFRoaXMgQVBJIGRvZXNuJ3QgY3VycmVudGx5IGhhdmUgYSB3YXkgdG8gY29uZmlndXJlIHRoZW1cbiAgICAvLyBhbmQgd2Ugc2hvdWxkIGRlY2lkZSB3aGF0IHRoZSBfYmVzdF8gd2F5IHRvIGRvIHRoYXQgaXMgcmF0aGVyIHRoYW4ganVzdCBzdGlja2luZyB3aXRoIHRoZVxuICAgIC8vIHN0YXR1cyBxdW8gb2YgaG93IGl0J3MgZG9uZSB0b2RheS5cbiAgXSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByb290Um91dGUocm91dGVyOiBSb3V0ZXIpOiBBY3RpdmF0ZWRSb3V0ZSB7XG4gIHJldHVybiByb3V0ZXIucm91dGVyU3RhdGUucm9vdDtcbn1cblxuLyoqXG4gKiBIZWxwZXIgdHlwZSB0byByZXByZXNlbnQgYSBSb3V0ZXIgZmVhdHVyZS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKiBAZGV2ZWxvcGVyUHJldmlld1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFJvdXRlckZlYXR1cmU8RmVhdHVyZUtpbmQgZXh0ZW5kcyBSb3V0ZXJGZWF0dXJlS2luZD4ge1xuICDJtWtpbmQ6IEZlYXR1cmVLaW5kO1xuICDJtXByb3ZpZGVyczogUHJvdmlkZXJbXTtcbn1cblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gY3JlYXRlIGFuIG9iamVjdCB0aGF0IHJlcHJlc2VudHMgYSBSb3V0ZXIgZmVhdHVyZS5cbiAqL1xuZnVuY3Rpb24gcm91dGVyRmVhdHVyZTxGZWF0dXJlS2luZCBleHRlbmRzIFJvdXRlckZlYXR1cmVLaW5kPihcbiAgICBraW5kOiBGZWF0dXJlS2luZCwgcHJvdmlkZXJzOiBQcm92aWRlcltdKTogUm91dGVyRmVhdHVyZTxGZWF0dXJlS2luZD4ge1xuICByZXR1cm4ge8m1a2luZDoga2luZCwgybVwcm92aWRlcnM6IHByb3ZpZGVyc307XG59XG5cbi8qKlxuICogUmVnaXN0ZXJzIGEgW0RJIHByb3ZpZGVyXShndWlkZS9nbG9zc2FyeSNwcm92aWRlcikgZm9yIGEgc2V0IG9mIHJvdXRlcy5cbiAqIEBwYXJhbSByb3V0ZXMgVGhlIHJvdXRlIGNvbmZpZ3VyYXRpb24gdG8gcHJvdmlkZS5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIGBgYFxuICogQE5nTW9kdWxlKHtcbiAqICAgcHJvdmlkZXJzOiBbcHJvdmlkZVJvdXRlcyhST1VURVMpXVxuICogfSlcbiAqIGNsYXNzIExhenlMb2FkZWRDaGlsZE1vZHVsZSB7fVxuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZVJvdXRlcyhyb3V0ZXM6IFJvdXRlcyk6IFByb3ZpZGVyW10ge1xuICByZXR1cm4gW1xuICAgIHtwcm92aWRlOiBST1VURVMsIG11bHRpOiB0cnVlLCB1c2VWYWx1ZTogcm91dGVzfSxcbiAgXTtcbn1cblxuLyoqXG4gKiBBIHR5cGUgYWxpYXMgZm9yIHByb3ZpZGVycyByZXR1cm5lZCBieSBgd2l0aEluTWVtb3J5U2Nyb2xsaW5nYCBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBzZWUgYHdpdGhJbk1lbW9yeVNjcm9sbGluZ2BcbiAqIEBzZWUgYHByb3ZpZGVSb3V0ZXJgXG4gKlxuICogQHB1YmxpY0FwaVxuICogQGRldmVsb3BlclByZXZpZXdcbiAqL1xuZXhwb3J0IHR5cGUgSW5NZW1vcnlTY3JvbGxpbmdGZWF0dXJlID0gUm91dGVyRmVhdHVyZTxSb3V0ZXJGZWF0dXJlS2luZC5Jbk1lbW9yeVNjcm9sbGluZ0ZlYXR1cmU+O1xuXG4vKipcbiAqIEVuYWJsZXMgY3VzdG9taXphYmxlIHNjcm9sbGluZyBiZWhhdmlvciBmb3Igcm91dGVyIG5hdmlnYXRpb25zLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogQmFzaWMgZXhhbXBsZSBvZiBob3cgeW91IGNhbiBlbmFibGUgc2Nyb2xsaW5nIGZlYXR1cmU6XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLCB3aXRoSW5NZW1vcnlTY3JvbGxpbmcoKSlcbiAqICAgICBdXG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqXG4gKiBAc2VlIGBwcm92aWRlUm91dGVyYFxuICogQHNlZSBgVmlld3BvcnRTY3JvbGxlcmBcbiAqXG4gKiBAcHVibGljQXBpXG4gKiBAZGV2ZWxvcGVyUHJldmlld1xuICogQHBhcmFtIG9wdGlvbnMgU2V0IG9mIGNvbmZpZ3VyYXRpb24gcGFyYW1ldGVycyB0byBjdXN0b21pemUgc2Nyb2xsaW5nIGJlaGF2aW9yLCBzZWVcbiAqICAgICBgSW5NZW1vcnlTY3JvbGxpbmdPcHRpb25zYCBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvbi5cbiAqIEByZXR1cm5zIEEgc2V0IG9mIHByb3ZpZGVycyBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aEluTWVtb3J5U2Nyb2xsaW5nKG9wdGlvbnM6IEluTWVtb3J5U2Nyb2xsaW5nT3B0aW9ucyA9IHt9KTpcbiAgICBJbk1lbW9yeVNjcm9sbGluZ0ZlYXR1cmUge1xuICBjb25zdCBwcm92aWRlcnMgPSBbe1xuICAgIHByb3ZpZGU6IFJPVVRFUl9TQ1JPTExFUixcbiAgICB1c2VGYWN0b3J5OiAoKSA9PiB7XG4gICAgICBjb25zdCByb3V0ZXIgPSBpbmplY3QoUm91dGVyKTtcbiAgICAgIGNvbnN0IHZpZXdwb3J0U2Nyb2xsZXIgPSBpbmplY3QoVmlld3BvcnRTY3JvbGxlcik7XG4gICAgICByZXR1cm4gbmV3IFJvdXRlclNjcm9sbGVyKHJvdXRlciwgdmlld3BvcnRTY3JvbGxlciwgb3B0aW9ucyk7XG4gICAgfSxcbiAgfV07XG4gIHJldHVybiByb3V0ZXJGZWF0dXJlKFJvdXRlckZlYXR1cmVLaW5kLkluTWVtb3J5U2Nyb2xsaW5nRmVhdHVyZSwgcHJvdmlkZXJzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEJvb3RzdHJhcExpc3RlbmVyKCkge1xuICBjb25zdCBpbmplY3RvciA9IGluamVjdChJbmplY3Rvcik7XG4gIHJldHVybiAoYm9vdHN0cmFwcGVkQ29tcG9uZW50UmVmOiBDb21wb25lbnRSZWY8dW5rbm93bj4pID0+IHtcbiAgICBjb25zdCByZWYgPSBpbmplY3Rvci5nZXQoQXBwbGljYXRpb25SZWYpO1xuXG4gICAgaWYgKGJvb3RzdHJhcHBlZENvbXBvbmVudFJlZiAhPT0gcmVmLmNvbXBvbmVudHNbMF0pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCByb3V0ZXIgPSBpbmplY3Rvci5nZXQoUm91dGVyKTtcbiAgICBjb25zdCBib290c3RyYXBEb25lID0gaW5qZWN0b3IuZ2V0KEJPT1RTVFJBUF9ET05FKTtcblxuICAgIGlmIChpbmplY3Rvci5nZXQoSU5JVElBTF9OQVZJR0FUSU9OKSA9PT0gSW5pdGlhbE5hdmlnYXRpb24uRW5hYmxlZE5vbkJsb2NraW5nKSB7XG4gICAgICByb3V0ZXIuaW5pdGlhbE5hdmlnYXRpb24oKTtcbiAgICB9XG5cbiAgICBpbmplY3Rvci5nZXQoUk9VVEVSX1BSRUxPQURFUiwgbnVsbCwgSW5qZWN0RmxhZ3MuT3B0aW9uYWwpPy5zZXRVcFByZWxvYWRpbmcoKTtcbiAgICBpbmplY3Rvci5nZXQoUk9VVEVSX1NDUk9MTEVSLCBudWxsLCBJbmplY3RGbGFncy5PcHRpb25hbCk/LmluaXQoKTtcbiAgICByb3V0ZXIucmVzZXRSb290Q29tcG9uZW50VHlwZShyZWYuY29tcG9uZW50VHlwZXNbMF0pO1xuICAgIGJvb3RzdHJhcERvbmUubmV4dCgpO1xuICAgIGJvb3RzdHJhcERvbmUuY29tcGxldGUoKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBBIHN1YmplY3QgdXNlZCB0byBpbmRpY2F0ZSB0aGF0IHRoZSBib290c3RyYXBwaW5nIHBoYXNlIGlzIGRvbmUuIFdoZW4gaW5pdGlhbCBuYXZpZ2F0aW9uIGlzXG4gKiBgZW5hYmxlZEJsb2NraW5nYCwgdGhlIGZpcnN0IG5hdmlnYXRpb24gd2FpdHMgdW50aWwgYm9vdHN0cmFwcGluZyBpcyBmaW5pc2hlZCBiZWZvcmUgY29udGludWluZ1xuICogdG8gdGhlIGFjdGl2YXRpb24gcGhhc2UuXG4gKi9cbmNvbnN0IEJPT1RTVFJBUF9ET05FID1cbiAgICBuZXcgSW5qZWN0aW9uVG9rZW48U3ViamVjdDx2b2lkPj4oTkdfREVWX01PREUgPyAnYm9vdHN0cmFwIGRvbmUgaW5kaWNhdG9yJyA6ICcnLCB7XG4gICAgICBmYWN0b3J5OiAoKSA9PiB7XG4gICAgICAgIHJldHVybiBuZXcgU3ViamVjdDx2b2lkPigpO1xuICAgICAgfVxuICAgIH0pO1xuXG4vKipcbiAqIFRoaXMgYW5kIHRoZSBJTklUSUFMX05BVklHQVRJT04gdG9rZW4gYXJlIHVzZWQgaW50ZXJuYWxseSBvbmx5LiBUaGUgcHVibGljIEFQSSBzaWRlIG9mIHRoaXMgaXNcbiAqIGNvbmZpZ3VyZWQgdGhyb3VnaCB0aGUgYEV4dHJhT3B0aW9uc2AuXG4gKlxuICogV2hlbiBzZXQgdG8gYEVuYWJsZWRCbG9ja2luZ2AsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gc3RhcnRzIGJlZm9yZSB0aGUgcm9vdFxuICogY29tcG9uZW50IGlzIGNyZWF0ZWQuIFRoZSBib290c3RyYXAgaXMgYmxvY2tlZCB1bnRpbCB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIGlzIGNvbXBsZXRlLiBUaGlzXG4gKiB2YWx1ZSBpcyByZXF1aXJlZCBmb3IgW3NlcnZlci1zaWRlIHJlbmRlcmluZ10oZ3VpZGUvdW5pdmVyc2FsKSB0byB3b3JrLlxuICpcbiAqIFdoZW4gc2V0IHRvIGBFbmFibGVkTm9uQmxvY2tpbmdgLCB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIHN0YXJ0cyBhZnRlciB0aGUgcm9vdCBjb21wb25lbnQgaGFzIGJlZW5cbiAqIGNyZWF0ZWQuIFRoZSBib290c3RyYXAgaXMgbm90IGJsb2NrZWQgb24gdGhlIGNvbXBsZXRpb24gb2YgdGhlIGluaXRpYWwgbmF2aWdhdGlvbi5cbiAqXG4gKiBXaGVuIHNldCB0byBgRGlzYWJsZWRgLCB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIGlzIG5vdCBwZXJmb3JtZWQuIFRoZSBsb2NhdGlvbiBsaXN0ZW5lciBpcyBzZXQgdXBcbiAqIGJlZm9yZSB0aGUgcm9vdCBjb21wb25lbnQgZ2V0cyBjcmVhdGVkLiBVc2UgaWYgdGhlcmUgaXMgYSByZWFzb24gdG8gaGF2ZSBtb3JlIGNvbnRyb2wgb3ZlciB3aGVuXG4gKiB0aGUgcm91dGVyIHN0YXJ0cyBpdHMgaW5pdGlhbCBuYXZpZ2F0aW9uIGR1ZSB0byBzb21lIGNvbXBsZXggaW5pdGlhbGl6YXRpb24gbG9naWMuXG4gKlxuICogQHNlZSBgRXh0cmFPcHRpb25zYFxuICovXG5jb25zdCBlbnVtIEluaXRpYWxOYXZpZ2F0aW9uIHtcbiAgRW5hYmxlZEJsb2NraW5nLFxuICBFbmFibGVkTm9uQmxvY2tpbmcsXG4gIERpc2FibGVkLFxufVxuXG5jb25zdCBJTklUSUFMX05BVklHQVRJT04gPSBuZXcgSW5qZWN0aW9uVG9rZW48SW5pdGlhbE5hdmlnYXRpb24+KFxuICAgIE5HX0RFVl9NT0RFID8gJ2luaXRpYWwgbmF2aWdhdGlvbicgOiAnJyxcbiAgICB7cHJvdmlkZWRJbjogJ3Jvb3QnLCBmYWN0b3J5OiAoKSA9PiBJbml0aWFsTmF2aWdhdGlvbi5FbmFibGVkTm9uQmxvY2tpbmd9KTtcblxuLyoqXG4gKiBBIHR5cGUgYWxpYXMgZm9yIHByb3ZpZGVycyByZXR1cm5lZCBieSBgd2l0aEVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uYCBmb3IgdXNlIHdpdGhcbiAqIGBwcm92aWRlUm91dGVyYC5cbiAqXG4gKiBAc2VlIGB3aXRoRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb25gXG4gKiBAc2VlIGBwcm92aWRlUm91dGVyYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqIEBkZXZlbG9wZXJQcmV2aWV3XG4gKi9cbmV4cG9ydCB0eXBlIEVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZSA9XG4gICAgUm91dGVyRmVhdHVyZTxSb3V0ZXJGZWF0dXJlS2luZC5FbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmU+O1xuXG4vKipcbiAqIEEgdHlwZSBhbGlhcyBmb3IgcHJvdmlkZXJzIHJldHVybmVkIGJ5IGB3aXRoRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb25gIG9yXG4gKiBgd2l0aERpc2FibGVkSW5pdGlhbE5hdmlnYXRpb25gIGZ1bmN0aW9ucyBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBzZWUgYHdpdGhFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbmBcbiAqIEBzZWUgYHdpdGhEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uYFxuICogQHNlZSBgcHJvdmlkZVJvdXRlcmBcbiAqXG4gKiBAcHVibGljQXBpXG4gKiBAZGV2ZWxvcGVyUHJldmlld1xuICovXG5leHBvcnQgdHlwZSBJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUgPVxuICAgIEVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZXxEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZTtcblxuLyoqXG4gKiBDb25maWd1cmVzIGluaXRpYWwgbmF2aWdhdGlvbiB0byBzdGFydCBiZWZvcmUgdGhlIHJvb3QgY29tcG9uZW50IGlzIGNyZWF0ZWQuXG4gKlxuICogVGhlIGJvb3RzdHJhcCBpcyBibG9ja2VkIHVudGlsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgY29tcGxldGUuIFRoaXMgdmFsdWUgaXMgcmVxdWlyZWQgZm9yXG4gKiBbc2VydmVyLXNpZGUgcmVuZGVyaW5nXShndWlkZS91bml2ZXJzYWwpIHRvIHdvcmsuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBCYXNpYyBleGFtcGxlIG9mIGhvdyB5b3UgY2FuIGVuYWJsZSB0aGlzIG5hdmlnYXRpb24gYmVoYXZpb3I6XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLCB3aXRoRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb24oKSlcbiAqICAgICBdXG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqXG4gKiBAc2VlIGBwcm92aWRlUm91dGVyYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqIEBkZXZlbG9wZXJQcmV2aWV3XG4gKiBAcmV0dXJucyBBIHNldCBvZiBwcm92aWRlcnMgZm9yIHVzZSB3aXRoIGBwcm92aWRlUm91dGVyYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbigpOiBFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUge1xuICBjb25zdCBwcm92aWRlcnMgPSBbXG4gICAge3Byb3ZpZGU6IElOSVRJQUxfTkFWSUdBVElPTiwgdXNlVmFsdWU6IEluaXRpYWxOYXZpZ2F0aW9uLkVuYWJsZWRCbG9ja2luZ30sXG4gICAge1xuICAgICAgcHJvdmlkZTogQVBQX0lOSVRJQUxJWkVSLFxuICAgICAgbXVsdGk6IHRydWUsXG4gICAgICBkZXBzOiBbSW5qZWN0b3JdLFxuICAgICAgdXNlRmFjdG9yeTogKGluamVjdG9yOiBJbmplY3RvcikgPT4ge1xuICAgICAgICBjb25zdCBsb2NhdGlvbkluaXRpYWxpemVkOiBQcm9taXNlPGFueT4gPVxuICAgICAgICAgICAgaW5qZWN0b3IuZ2V0KExPQ0FUSU9OX0lOSVRJQUxJWkVELCBQcm9taXNlLnJlc29sdmUoKSk7XG4gICAgICAgIGxldCBpbml0TmF2aWdhdGlvbiA9IGZhbHNlO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQZXJmb3JtcyB0aGUgZ2l2ZW4gYWN0aW9uIG9uY2UgdGhlIHJvdXRlciBmaW5pc2hlcyBpdHMgbmV4dC9jdXJyZW50IG5hdmlnYXRpb24uXG4gICAgICAgICAqXG4gICAgICAgICAqIElmIHRoZSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGVkIG9yIGVycm9ycyB3aXRob3V0IGEgcmVkaXJlY3QsIHRoZSBuYXZpZ2F0aW9uIGlzIGNvbnNpZGVyZWRcbiAgICAgICAgICogY29tcGxldGUuIElmIHRoZSBgTmF2aWdhdGlvbkVuZGAgZXZlbnQgZW1pdHMsIHRoZSBuYXZpZ2F0aW9uIGlzIGFsc28gY29uc2lkZXJlZCBjb21wbGV0ZS5cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGFmdGVyTmV4dE5hdmlnYXRpb24oYWN0aW9uOiAoKSA9PiB2b2lkKSB7XG4gICAgICAgICAgY29uc3Qgcm91dGVyID0gaW5qZWN0b3IuZ2V0KFJvdXRlcik7XG4gICAgICAgICAgcm91dGVyLmV2ZW50c1xuICAgICAgICAgICAgICAucGlwZShcbiAgICAgICAgICAgICAgICAgIGZpbHRlcihcbiAgICAgICAgICAgICAgICAgICAgICAoZSk6IGUgaXMgTmF2aWdhdGlvbkVuZHxOYXZpZ2F0aW9uQ2FuY2VsfE5hdmlnYXRpb25FcnJvciA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCB8fCBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkNhbmNlbCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVycm9yKSxcbiAgICAgICAgICAgICAgICAgIG1hcChlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gTmF2aWdhdGlvbiBhc3N1bWVkIHRvIHN1Y2NlZWQgaWYgd2UgZ2V0IGBBY3RpdmF0aW9uU3RhcnRgXG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVkaXJlY3RpbmcgPSBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkNhbmNlbCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAoZS5jb2RlID09PSBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZS5SZWRpcmVjdCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgIGUuY29kZSA9PT0gTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuU3VwZXJzZWRlZEJ5TmV3TmF2aWdhdGlvbikgOlxuICAgICAgICAgICAgICAgICAgICAgICAgZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWRpcmVjdGluZyA/IG51bGwgOiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgZmlsdGVyKChyZXN1bHQpOiByZXN1bHQgaXMgYm9vbGVhbiA9PiByZXN1bHQgIT09IG51bGwpLFxuICAgICAgICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgYWN0aW9uKCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICByZXR1cm4gbG9jYXRpb25Jbml0aWFsaXplZC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgICAgY29uc3Qgcm91dGVyID0gaW5qZWN0b3IuZ2V0KFJvdXRlcik7XG4gICAgICAgICAgICAgIGNvbnN0IGJvb3RzdHJhcERvbmUgPSBpbmplY3Rvci5nZXQoQk9PVFNUUkFQX0RPTkUpO1xuICAgICAgICAgICAgICBhZnRlck5leHROYXZpZ2F0aW9uKCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBVbmJsb2NrIEFQUF9JTklUSUFMSVpFUiBpbiBjYXNlIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gd2FzIGNhbmNlbGVkIG9yIGVycm9yZWRcbiAgICAgICAgICAgICAgICAvLyB3aXRob3V0IGEgcmVkaXJlY3QuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICBpbml0TmF2aWdhdGlvbiA9IHRydWU7XG4gICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgIHJvdXRlci5hZnRlclByZWFjdGl2YXRpb24gPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVW5ibG9jayBBUFBfSU5JVElBTElaRVIgb25jZSB3ZSBnZXQgdG8gYGFmdGVyUHJlYWN0aXZhdGlvbmAuIEF0IHRoaXMgcG9pbnQsIHdlXG4gICAgICAgICAgICAgICAgLy8gYXNzdW1lIGFjdGl2YXRpb24gd2lsbCBjb21wbGV0ZSBzdWNjZXNzZnVsbHkgKGV2ZW4gdGhvdWdoIHRoaXMgaXMgbm90XG4gICAgICAgICAgICAgICAgLy8gZ3VhcmFudGVlZCkuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAvLyBvbmx5IHRoZSBpbml0aWFsIG5hdmlnYXRpb24gc2hvdWxkIGJlIGRlbGF5ZWQgdW50aWwgYm9vdHN0cmFwcGluZyBpcyBkb25lLlxuICAgICAgICAgICAgICAgIGlmICghaW5pdE5hdmlnYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBib290c3RyYXBEb25lLmNsb3NlZCA/IG9mKHZvaWQgMCkgOiBib290c3RyYXBEb25lO1xuICAgICAgICAgICAgICAgICAgLy8gc3Vic2VxdWVudCBuYXZpZ2F0aW9ucyBzaG91bGQgbm90IGJlIGRlbGF5ZWRcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKHZvaWQgMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICByb3V0ZXIuaW5pdGlhbE5hdmlnYXRpb24oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0sXG4gIF07XG4gIHJldHVybiByb3V0ZXJGZWF0dXJlKFJvdXRlckZlYXR1cmVLaW5kLkVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZSwgcHJvdmlkZXJzKTtcbn1cblxuLyoqXG4gKiBBIHR5cGUgYWxpYXMgZm9yIHByb3ZpZGVycyByZXR1cm5lZCBieSBgd2l0aERpc2FibGVkSW5pdGlhbE5hdmlnYXRpb25gIGZvciB1c2Ugd2l0aFxuICogYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBzZWUgYHdpdGhEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uYFxuICogQHNlZSBgcHJvdmlkZVJvdXRlcmBcbiAqXG4gKiBAcHVibGljQXBpXG4gKiBAZGV2ZWxvcGVyUHJldmlld1xuICovXG5leHBvcnQgdHlwZSBEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZSA9XG4gICAgUm91dGVyRmVhdHVyZTxSb3V0ZXJGZWF0dXJlS2luZC5EaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZT47XG5cbi8qKlxuICogRGlzYWJsZXMgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICpcbiAqIFVzZSBpZiB0aGVyZSBpcyBhIHJlYXNvbiB0byBoYXZlIG1vcmUgY29udHJvbCBvdmVyIHdoZW4gdGhlIHJvdXRlciBzdGFydHMgaXRzIGluaXRpYWwgbmF2aWdhdGlvblxuICogZHVlIHRvIHNvbWUgY29tcGxleCBpbml0aWFsaXphdGlvbiBsb2dpYy5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIEJhc2ljIGV4YW1wbGUgb2YgaG93IHlvdSBjYW4gZGlzYWJsZSBpbml0aWFsIG5hdmlnYXRpb246XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLCB3aXRoRGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbigpKVxuICogICAgIF1cbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICpcbiAqIEBzZWUgYHByb3ZpZGVSb3V0ZXJgXG4gKlxuICogQHJldHVybnMgQSBzZXQgb2YgcHJvdmlkZXJzIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHB1YmxpY0FwaVxuICogQGRldmVsb3BlclByZXZpZXdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uKCk6IERpc2FibGVkSW5pdGlhbE5hdmlnYXRpb25GZWF0dXJlIHtcbiAgY29uc3QgcHJvdmlkZXJzID0gW1xuICAgIHtcbiAgICAgIHByb3ZpZGU6IEFQUF9JTklUSUFMSVpFUixcbiAgICAgIG11bHRpOiB0cnVlLFxuICAgICAgdXNlRmFjdG9yeTogKCkgPT4ge1xuICAgICAgICBjb25zdCByb3V0ZXIgPSBpbmplY3QoUm91dGVyKTtcbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICByb3V0ZXIuc2V0VXBMb2NhdGlvbkNoYW5nZUxpc3RlbmVyKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSxcbiAgICB7cHJvdmlkZTogSU5JVElBTF9OQVZJR0FUSU9OLCB1c2VWYWx1ZTogSW5pdGlhbE5hdmlnYXRpb24uRGlzYWJsZWR9XG4gIF07XG4gIHJldHVybiByb3V0ZXJGZWF0dXJlKFJvdXRlckZlYXR1cmVLaW5kLkRpc2FibGVkSW5pdGlhbE5hdmlnYXRpb25GZWF0dXJlLCBwcm92aWRlcnMpO1xufVxuXG4vKipcbiAqIEEgdHlwZSBhbGlhcyBmb3IgcHJvdmlkZXJzIHJldHVybmVkIGJ5IGB3aXRoRGVidWdUcmFjaW5nYCBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBzZWUgYHdpdGhEZWJ1Z1RyYWNpbmdgXG4gKiBAc2VlIGBwcm92aWRlUm91dGVyYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqIEBkZXZlbG9wZXJQcmV2aWV3XG4gKi9cbmV4cG9ydCB0eXBlIERlYnVnVHJhY2luZ0ZlYXR1cmUgPSBSb3V0ZXJGZWF0dXJlPFJvdXRlckZlYXR1cmVLaW5kLkRlYnVnVHJhY2luZ0ZlYXR1cmU+O1xuXG4vKipcbiAqIEVuYWJsZXMgbG9nZ2luZyBvZiBhbGwgaW50ZXJuYWwgbmF2aWdhdGlvbiBldmVudHMgdG8gdGhlIGNvbnNvbGUuXG4gKiBFeHRyYSBsb2dnaW5nIG1pZ2h0IGJlIHVzZWZ1bCBmb3IgZGVidWdnaW5nIHB1cnBvc2VzIHRvIGluc3BlY3QgUm91dGVyIGV2ZW50IHNlcXVlbmNlLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogQmFzaWMgZXhhbXBsZSBvZiBob3cgeW91IGNhbiBlbmFibGUgZGVidWcgdHJhY2luZzpcbiAqIGBgYFxuICogY29uc3QgYXBwUm91dGVzOiBSb3V0ZXMgPSBbXTtcbiAqIGJvb3RzdHJhcEFwcGxpY2F0aW9uKEFwcENvbXBvbmVudCxcbiAqICAge1xuICogICAgIHByb3ZpZGVyczogW1xuICogICAgICAgcHJvdmlkZVJvdXRlcihhcHBSb3V0ZXMsIHdpdGhEZWJ1Z1RyYWNpbmcoKSlcbiAqICAgICBdXG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqXG4gKiBAc2VlIGBwcm92aWRlUm91dGVyYFxuICpcbiAqIEByZXR1cm5zIEEgc2V0IG9mIHByb3ZpZGVycyBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqIEBkZXZlbG9wZXJQcmV2aWV3XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXRoRGVidWdUcmFjaW5nKCk6IERlYnVnVHJhY2luZ0ZlYXR1cmUge1xuICBsZXQgcHJvdmlkZXJzOiBQcm92aWRlcltdID0gW107XG4gIGlmIChOR19ERVZfTU9ERSkge1xuICAgIHByb3ZpZGVycyA9IFt7XG4gICAgICBwcm92aWRlOiBFTlZJUk9OTUVOVF9JTklUSUFMSVpFUixcbiAgICAgIG11bHRpOiB0cnVlLFxuICAgICAgdXNlRmFjdG9yeTogKCkgPT4ge1xuICAgICAgICBjb25zdCByb3V0ZXIgPSBpbmplY3QoUm91dGVyKTtcbiAgICAgICAgcmV0dXJuICgpID0+IHJvdXRlci5ldmVudHMuc3Vic2NyaWJlKChlOiBFdmVudCkgPT4ge1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmdyb3VwPy4oYFJvdXRlciBFdmVudDogJHsoPGFueT5lLmNvbnN0cnVjdG9yKS5uYW1lfWApO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHN0cmluZ2lmeUV2ZW50KGUpKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICBjb25zb2xlLmdyb3VwRW5kPy4oKTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZW5hYmxlOm5vLWNvbnNvbGVcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfV07XG4gIH0gZWxzZSB7XG4gICAgcHJvdmlkZXJzID0gW107XG4gIH1cbiAgcmV0dXJuIHJvdXRlckZlYXR1cmUoUm91dGVyRmVhdHVyZUtpbmQuRGVidWdUcmFjaW5nRmVhdHVyZSwgcHJvdmlkZXJzKTtcbn1cblxuY29uc3QgUk9VVEVSX1BSRUxPQURFUiA9IG5ldyBJbmplY3Rpb25Ub2tlbjxSb3V0ZXJQcmVsb2FkZXI+KE5HX0RFVl9NT0RFID8gJ3JvdXRlciBwcmVsb2FkZXInIDogJycpO1xuXG4vKipcbiAqIEEgdHlwZSBhbGlhcyB0aGF0IHJlcHJlc2VudHMgYSBmZWF0dXJlIHdoaWNoIGVuYWJsZXMgcHJlbG9hZGluZyBpbiBSb3V0ZXIuXG4gKiBUaGUgdHlwZSBpcyB1c2VkIHRvIGRlc2NyaWJlIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGB3aXRoUHJlbG9hZGluZ2AgZnVuY3Rpb24uXG4gKlxuICogQHNlZSBgd2l0aFByZWxvYWRpbmdgXG4gKiBAc2VlIGBwcm92aWRlUm91dGVyYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqIEBkZXZlbG9wZXJQcmV2aWV3XG4gKi9cbmV4cG9ydCB0eXBlIFByZWxvYWRpbmdGZWF0dXJlID0gUm91dGVyRmVhdHVyZTxSb3V0ZXJGZWF0dXJlS2luZC5QcmVsb2FkaW5nRmVhdHVyZT47XG5cbi8qKlxuICogQWxsb3dzIHRvIGNvbmZpZ3VyZSBhIHByZWxvYWRpbmcgc3RyYXRlZ3kgdG8gdXNlLiBUaGUgc3RyYXRlZ3kgaXMgY29uZmlndXJlZCBieSBwcm92aWRpbmcgYVxuICogcmVmZXJlbmNlIHRvIGEgY2xhc3MgdGhhdCBpbXBsZW1lbnRzIGEgYFByZWxvYWRpbmdTdHJhdGVneWAuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBCYXNpYyBleGFtcGxlIG9mIGhvdyB5b3UgY2FuIGNvbmZpZ3VyZSBwcmVsb2FkaW5nOlxuICogYGBgXG4gKiBjb25zdCBhcHBSb3V0ZXM6IFJvdXRlcyA9IFtdO1xuICogYm9vdHN0cmFwQXBwbGljYXRpb24oQXBwQ29tcG9uZW50LFxuICogICB7XG4gKiAgICAgcHJvdmlkZXJzOiBbXG4gKiAgICAgICBwcm92aWRlUm91dGVyKGFwcFJvdXRlcywgd2l0aFByZWxvYWRpbmcoUHJlbG9hZEFsbE1vZHVsZXMpKVxuICogICAgIF1cbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICpcbiAqIEBzZWUgYHByb3ZpZGVSb3V0ZXJgXG4gKlxuICogQHBhcmFtIHByZWxvYWRpbmdTdHJhdGVneSBBIHJlZmVyZW5jZSB0byBhIGNsYXNzIHRoYXQgaW1wbGVtZW50cyBhIGBQcmVsb2FkaW5nU3RyYXRlZ3lgIHRoYXRcbiAqICAgICBzaG91bGQgYmUgdXNlZC5cbiAqIEByZXR1cm5zIEEgc2V0IG9mIHByb3ZpZGVycyBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqIEBkZXZlbG9wZXJQcmV2aWV3XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXRoUHJlbG9hZGluZyhwcmVsb2FkaW5nU3RyYXRlZ3k6IFR5cGU8UHJlbG9hZGluZ1N0cmF0ZWd5Pik6IFByZWxvYWRpbmdGZWF0dXJlIHtcbiAgY29uc3QgcHJvdmlkZXJzID0gW1xuICAgIHtwcm92aWRlOiBST1VURVJfUFJFTE9BREVSLCB1c2VFeGlzdGluZzogUm91dGVyUHJlbG9hZGVyfSxcbiAgICB7cHJvdmlkZTogUHJlbG9hZGluZ1N0cmF0ZWd5LCB1c2VFeGlzdGluZzogcHJlbG9hZGluZ1N0cmF0ZWd5fSxcbiAgXTtcbiAgcmV0dXJuIHJvdXRlckZlYXR1cmUoUm91dGVyRmVhdHVyZUtpbmQuUHJlbG9hZGluZ0ZlYXR1cmUsIHByb3ZpZGVycyk7XG59XG5cbi8qKlxuICogQSB0eXBlIGFsaWFzIGZvciBwcm92aWRlcnMgcmV0dXJuZWQgYnkgYHdpdGhSb3V0ZXJDb25maWdgIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHNlZSBgd2l0aFJvdXRlckNvbmZpZ2BcbiAqIEBzZWUgYHByb3ZpZGVSb3V0ZXJgXG4gKlxuICogQHB1YmxpY0FwaVxuICogQGRldmVsb3BlclByZXZpZXdcbiAqL1xuZXhwb3J0IHR5cGUgUm91dGVyQ29uZmlndXJhdGlvbkZlYXR1cmUgPVxuICAgIFJvdXRlckZlYXR1cmU8Um91dGVyRmVhdHVyZUtpbmQuUm91dGVyQ29uZmlndXJhdGlvbkZlYXR1cmU+O1xuXG4vKipcbiAqIEFsbG93cyB0byBwcm92aWRlIGV4dHJhIHBhcmFtZXRlcnMgdG8gY29uZmlndXJlIFJvdXRlci5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIEJhc2ljIGV4YW1wbGUgb2YgaG93IHlvdSBjYW4gcHJvdmlkZSBleHRyYSBjb25maWd1cmF0aW9uIG9wdGlvbnM6XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLCB3aXRoUm91dGVyQ29uZmlnKHtcbiAqICAgICAgICAgIG9uU2FtZVVybE5hdmlnYXRpb246ICdyZWxvYWQnXG4gKiAgICAgICB9KSlcbiAqICAgICBdXG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqXG4gKiBAc2VlIGBwcm92aWRlUm91dGVyYFxuICpcbiAqIEBwYXJhbSBvcHRpb25zIEEgc2V0IG9mIHBhcmFtZXRlcnMgdG8gY29uZmlndXJlIFJvdXRlciwgc2VlIGBSb3V0ZXJDb25maWdPcHRpb25zYCBmb3JcbiAqICAgICBhZGRpdGlvbmFsIGluZm9ybWF0aW9uLlxuICogQHJldHVybnMgQSBzZXQgb2YgcHJvdmlkZXJzIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHB1YmxpY0FwaVxuICogQGRldmVsb3BlclByZXZpZXdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhSb3V0ZXJDb25maWcob3B0aW9uczogUm91dGVyQ29uZmlnT3B0aW9ucyk6IFJvdXRlckNvbmZpZ3VyYXRpb25GZWF0dXJlIHtcbiAgY29uc3QgcHJvdmlkZXJzID0gW1xuICAgIHtwcm92aWRlOiBST1VURVJfQ09ORklHVVJBVElPTiwgdXNlVmFsdWU6IG9wdGlvbnN9LFxuICBdO1xuICByZXR1cm4gcm91dGVyRmVhdHVyZShSb3V0ZXJGZWF0dXJlS2luZC5Sb3V0ZXJDb25maWd1cmF0aW9uRmVhdHVyZSwgcHJvdmlkZXJzKTtcbn1cblxuLyoqXG4gKiBBIHR5cGUgYWxpYXMgdGhhdCByZXByZXNlbnRzIGFsbCBSb3V0ZXIgZmVhdHVyZXMgYXZhaWxhYmxlIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKiBGZWF0dXJlcyBjYW4gYmUgZW5hYmxlZCBieSBhZGRpbmcgc3BlY2lhbCBmdW5jdGlvbnMgdG8gdGhlIGBwcm92aWRlUm91dGVyYCBjYWxsLlxuICogU2VlIGRvY3VtZW50YXRpb24gZm9yIGVhY2ggc3ltYm9sIHRvIGZpbmQgY29ycmVzcG9uZGluZyBmdW5jdGlvbiBuYW1lLiBTZWUgYWxzbyBgcHJvdmlkZVJvdXRlcmBcbiAqIGRvY3VtZW50YXRpb24gb24gaG93IHRvIHVzZSB0aG9zZSBmdW5jdGlvbnMuXG4gKlxuICogQHNlZSBgcHJvdmlkZVJvdXRlcmBcbiAqXG4gKiBAcHVibGljQXBpXG4gKiBAZGV2ZWxvcGVyUHJldmlld1xuICovXG5leHBvcnQgdHlwZSBSb3V0ZXJGZWF0dXJlcyA9IFByZWxvYWRpbmdGZWF0dXJlfERlYnVnVHJhY2luZ0ZlYXR1cmV8SW5pdGlhbE5hdmlnYXRpb25GZWF0dXJlfFxuICAgIEluTWVtb3J5U2Nyb2xsaW5nRmVhdHVyZXxSb3V0ZXJDb25maWd1cmF0aW9uRmVhdHVyZTtcblxuLyoqXG4gKiBUaGUgbGlzdCBvZiBmZWF0dXJlcyBhcyBhbiBlbnVtIHRvIHVuaXF1ZWx5IHR5cGUgZWFjaCBmZWF0dXJlLlxuICovXG5leHBvcnQgY29uc3QgZW51bSBSb3V0ZXJGZWF0dXJlS2luZCB7XG4gIFByZWxvYWRpbmdGZWF0dXJlLFxuICBEZWJ1Z1RyYWNpbmdGZWF0dXJlLFxuICBFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUsXG4gIERpc2FibGVkSW5pdGlhbE5hdmlnYXRpb25GZWF0dXJlLFxuICBJbk1lbW9yeVNjcm9sbGluZ0ZlYXR1cmUsXG4gIFJvdXRlckNvbmZpZ3VyYXRpb25GZWF0dXJlXG59XG4iXX0=