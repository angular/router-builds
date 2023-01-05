/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { HashLocationStrategy, LOCATION_INITIALIZED, LocationStrategy, ViewportScroller } from '@angular/common';
import { APP_BOOTSTRAP_LISTENER, APP_INITIALIZER, ApplicationRef, ENVIRONMENT_INITIALIZER, inject, InjectFlags, InjectionToken, Injector, makeEnvironmentProviders, NgZone } from '@angular/core';
import { of, Subject } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { NavigationCancel, NavigationEnd, NavigationError, stringifyEvent } from './events';
import { NavigationTransitions } from './navigation_transition';
import { Router } from './router';
import { ROUTER_CONFIGURATION } from './router_config';
import { ROUTES } from './router_config_loader';
import { PreloadingStrategy, RouterPreloader } from './router_preloader';
import { ROUTER_SCROLLER, RouterScroller } from './router_scroller';
import { ActivatedRoute } from './router_state';
import { UrlSerializer } from './url_tree';
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
 * @param routes A set of `Route`s to use for the application routing table.
 * @param features Optional features to configure additional router behaviors.
 * @returns A set of providers to setup a Router.
 */
export function provideRouter(routes, ...features) {
    return makeEnvironmentProviders([
        { provide: ROUTES, multi: true, useValue: routes },
        NG_DEV_MODE ? { provide: ROUTER_IS_PROVIDED, useValue: true } : [],
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
 * @see `ROUTES`
 * @publicApi
 */
export function provideRoutes(routes) {
    return [
        { provide: ROUTES, multi: true, useValue: routes },
        NG_DEV_MODE ? routerIsProvidedDevModeCheck : [],
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
            bootstrapDone.unsubscribe();
        }
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
                            });
                            router.afterPreactivation = () => {
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
 * @see `provideRouter`
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
 * @see `provideRouter`
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
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
 * @see `provideRouter`
 * @see `HashLocationStrategy`
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
export function withHashLocation() {
    const providers = [
        { provide: LocationStrategy, useClass: HashLocationStrategy },
    ];
    return routerFeature(5 /* RouterFeatureKind.RouterConfigurationFeature */, providers);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZV9yb3V0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3Byb3ZpZGVfcm91dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQy9HLE9BQU8sRUFBQyxzQkFBc0IsRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFnQix1QkFBdUIsRUFBd0IsTUFBTSxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLHdCQUF3QixFQUFFLE1BQU0sRUFBaUIsTUFBTSxlQUFlLENBQUM7QUFDcFAsT0FBTyxFQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDakMsT0FBTyxFQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFakQsT0FBTyxFQUFRLGdCQUFnQixFQUE4QixhQUFhLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU3SCxPQUFPLEVBQUMscUJBQXFCLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RCxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sRUFBMkIsb0JBQW9CLEVBQXNCLE1BQU0saUJBQWlCLENBQUM7QUFDcEcsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBQzlDLE9BQU8sRUFBQyxrQkFBa0IsRUFBRSxlQUFlLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUN2RSxPQUFPLEVBQUMsZUFBZSxFQUFFLGNBQWMsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ2xFLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztB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Ozs7Ozs7Ozs7Ozs7O0dBMEJHO0FBQ0gsTUFBTSxVQUFVLGdCQUFnQixDQUFDLE9BQTRCO0lBQzNELE1BQU0sU0FBUyxHQUFHO1FBQ2hCLEVBQUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUM7S0FDbkQsQ0FBQztJQUNGLE9BQU8sYUFBYSx1REFBK0MsU0FBUyxDQUFDLENBQUM7QUFDaEYsQ0FBQztBQVlEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXVCRztBQUNILE1BQU0sVUFBVSxnQkFBZ0I7SUFDOUIsTUFBTSxTQUFTLEdBQUc7UUFDaEIsRUFBQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFDO0tBQzVELENBQUM7SUFDRixPQUFPLGFBQWEsdURBQStDLFNBQVMsQ0FBQyxDQUFDO0FBQ2hGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtIYXNoTG9jYXRpb25TdHJhdGVneSwgTE9DQVRJT05fSU5JVElBTElaRUQsIExvY2F0aW9uU3RyYXRlZ3ksIFZpZXdwb3J0U2Nyb2xsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0FQUF9CT09UU1RSQVBfTElTVEVORVIsIEFQUF9JTklUSUFMSVpFUiwgQXBwbGljYXRpb25SZWYsIENvbXBvbmVudFJlZiwgRU5WSVJPTk1FTlRfSU5JVElBTElaRVIsIEVudmlyb25tZW50UHJvdmlkZXJzLCBpbmplY3QsIEluamVjdEZsYWdzLCBJbmplY3Rpb25Ub2tlbiwgSW5qZWN0b3IsIG1ha2VFbnZpcm9ubWVudFByb3ZpZGVycywgTmdab25lLCBQcm92aWRlciwgVHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge29mLCBTdWJqZWN0fSBmcm9tICdyeGpzJztcbmltcG9ydCB7ZmlsdGVyLCBtYXAsIHRha2V9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtFdmVudCwgTmF2aWdhdGlvbkNhbmNlbCwgTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUsIE5hdmlnYXRpb25FbmQsIE5hdmlnYXRpb25FcnJvciwgc3RyaW5naWZ5RXZlbnR9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7Um91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge05hdmlnYXRpb25UcmFuc2l0aW9uc30gZnJvbSAnLi9uYXZpZ2F0aW9uX3RyYW5zaXRpb24nO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJy4vcm91dGVyJztcbmltcG9ydCB7SW5NZW1vcnlTY3JvbGxpbmdPcHRpb25zLCBST1VURVJfQ09ORklHVVJBVElPTiwgUm91dGVyQ29uZmlnT3B0aW9uc30gZnJvbSAnLi9yb3V0ZXJfY29uZmlnJztcbmltcG9ydCB7Uk9VVEVTfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7UHJlbG9hZGluZ1N0cmF0ZWd5LCBSb3V0ZXJQcmVsb2FkZXJ9IGZyb20gJy4vcm91dGVyX3ByZWxvYWRlcic7XG5pbXBvcnQge1JPVVRFUl9TQ1JPTExFUiwgUm91dGVyU2Nyb2xsZXJ9IGZyb20gJy4vcm91dGVyX3Njcm9sbGVyJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGV9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7VXJsU2VyaWFsaXplcn0gZnJvbSAnLi91cmxfdHJlZSc7XG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlO1xuXG4vKipcbiAqIFNldHMgdXAgcHJvdmlkZXJzIG5lY2Vzc2FyeSB0byBlbmFibGUgYFJvdXRlcmAgZnVuY3Rpb25hbGl0eSBmb3IgdGhlIGFwcGxpY2F0aW9uLlxuICogQWxsb3dzIHRvIGNvbmZpZ3VyZSBhIHNldCBvZiByb3V0ZXMgYXMgd2VsbCBhcyBleHRyYSBmZWF0dXJlcyB0aGF0IHNob3VsZCBiZSBlbmFibGVkLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogQmFzaWMgZXhhbXBsZSBvZiBob3cgeW91IGNhbiBhZGQgYSBSb3V0ZXIgdG8geW91ciBhcHBsaWNhdGlvbjpcbiAqIGBgYFxuICogY29uc3QgYXBwUm91dGVzOiBSb3V0ZXMgPSBbXTtcbiAqIGJvb3RzdHJhcEFwcGxpY2F0aW9uKEFwcENvbXBvbmVudCwge1xuICogICBwcm92aWRlcnM6IFtwcm92aWRlUm91dGVyKGFwcFJvdXRlcyldXG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIFlvdSBjYW4gYWxzbyBlbmFibGUgb3B0aW9uYWwgZmVhdHVyZXMgaW4gdGhlIFJvdXRlciBieSBhZGRpbmcgZnVuY3Rpb25zIGZyb20gdGhlIGBSb3V0ZXJGZWF0dXJlc2BcbiAqIHR5cGU6XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLFxuICogICAgICAgICB3aXRoRGVidWdUcmFjaW5nKCksXG4gKiAgICAgICAgIHdpdGhSb3V0ZXJDb25maWcoe3BhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6ICdhbHdheXMnfSkpXG4gKiAgICAgXVxuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQHNlZSBgUm91dGVyRmVhdHVyZXNgXG4gKlxuICogQHB1YmxpY0FwaVxuICogQHBhcmFtIHJvdXRlcyBBIHNldCBvZiBgUm91dGVgcyB0byB1c2UgZm9yIHRoZSBhcHBsaWNhdGlvbiByb3V0aW5nIHRhYmxlLlxuICogQHBhcmFtIGZlYXR1cmVzIE9wdGlvbmFsIGZlYXR1cmVzIHRvIGNvbmZpZ3VyZSBhZGRpdGlvbmFsIHJvdXRlciBiZWhhdmlvcnMuXG4gKiBAcmV0dXJucyBBIHNldCBvZiBwcm92aWRlcnMgdG8gc2V0dXAgYSBSb3V0ZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm92aWRlUm91dGVyKHJvdXRlczogUm91dGVzLCAuLi5mZWF0dXJlczogUm91dGVyRmVhdHVyZXNbXSk6IEVudmlyb25tZW50UHJvdmlkZXJzIHtcbiAgcmV0dXJuIG1ha2VFbnZpcm9ubWVudFByb3ZpZGVycyhbXG4gICAge3Byb3ZpZGU6IFJPVVRFUywgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiByb3V0ZXN9LFxuICAgIE5HX0RFVl9NT0RFID8ge3Byb3ZpZGU6IFJPVVRFUl9JU19QUk9WSURFRCwgdXNlVmFsdWU6IHRydWV9IDogW10sXG4gICAge3Byb3ZpZGU6IEFjdGl2YXRlZFJvdXRlLCB1c2VGYWN0b3J5OiByb290Um91dGUsIGRlcHM6IFtSb3V0ZXJdfSxcbiAgICB7cHJvdmlkZTogQVBQX0JPT1RTVFJBUF9MSVNURU5FUiwgbXVsdGk6IHRydWUsIHVzZUZhY3Rvcnk6IGdldEJvb3RzdHJhcExpc3RlbmVyfSxcbiAgICBmZWF0dXJlcy5tYXAoZmVhdHVyZSA9PiBmZWF0dXJlLsm1cHJvdmlkZXJzKSxcbiAgXSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByb290Um91dGUocm91dGVyOiBSb3V0ZXIpOiBBY3RpdmF0ZWRSb3V0ZSB7XG4gIHJldHVybiByb3V0ZXIucm91dGVyU3RhdGUucm9vdDtcbn1cblxuLyoqXG4gKiBIZWxwZXIgdHlwZSB0byByZXByZXNlbnQgYSBSb3V0ZXIgZmVhdHVyZS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm91dGVyRmVhdHVyZTxGZWF0dXJlS2luZCBleHRlbmRzIFJvdXRlckZlYXR1cmVLaW5kPiB7XG4gIMm1a2luZDogRmVhdHVyZUtpbmQ7XG4gIMm1cHJvdmlkZXJzOiBQcm92aWRlcltdO1xufVxuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiB0byBjcmVhdGUgYW4gb2JqZWN0IHRoYXQgcmVwcmVzZW50cyBhIFJvdXRlciBmZWF0dXJlLlxuICovXG5mdW5jdGlvbiByb3V0ZXJGZWF0dXJlPEZlYXR1cmVLaW5kIGV4dGVuZHMgUm91dGVyRmVhdHVyZUtpbmQ+KFxuICAgIGtpbmQ6IEZlYXR1cmVLaW5kLCBwcm92aWRlcnM6IFByb3ZpZGVyW10pOiBSb3V0ZXJGZWF0dXJlPEZlYXR1cmVLaW5kPiB7XG4gIHJldHVybiB7ybVraW5kOiBraW5kLCDJtXByb3ZpZGVyczogcHJvdmlkZXJzfTtcbn1cblxuXG4vKipcbiAqIEFuIEluamVjdGlvbiB0b2tlbiB1c2VkIHRvIGluZGljYXRlIHdoZXRoZXIgYHByb3ZpZGVSb3V0ZXJgIG9yIGBSb3V0ZXJNb2R1bGUuZm9yUm9vdGAgd2FzIGV2ZXJcbiAqIGNhbGxlZC5cbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9JU19QUk9WSURFRCA9XG4gICAgbmV3IEluamVjdGlvblRva2VuPGJvb2xlYW4+KCcnLCB7cHJvdmlkZWRJbjogJ3Jvb3QnLCBmYWN0b3J5OiAoKSA9PiBmYWxzZX0pO1xuXG5jb25zdCByb3V0ZXJJc1Byb3ZpZGVkRGV2TW9kZUNoZWNrID0ge1xuICBwcm92aWRlOiBFTlZJUk9OTUVOVF9JTklUSUFMSVpFUixcbiAgbXVsdGk6IHRydWUsXG4gIHVzZUZhY3RvcnkoKSB7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGlmICghaW5qZWN0KFJPVVRFUl9JU19QUk9WSURFRCkpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgJ2Bwcm92aWRlUm91dGVzYCB3YXMgY2FsbGVkIHdpdGhvdXQgYHByb3ZpZGVSb3V0ZXJgIG9yIGBSb3V0ZXJNb2R1bGUuZm9yUm9vdGAuICcgK1xuICAgICAgICAgICAgJ1RoaXMgaXMgbGlrZWx5IGEgbWlzdGFrZS4nKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhIFtESSBwcm92aWRlcl0oZ3VpZGUvZ2xvc3NhcnkjcHJvdmlkZXIpIGZvciBhIHNldCBvZiByb3V0ZXMuXG4gKiBAcGFyYW0gcm91dGVzIFRoZSByb3V0ZSBjb25maWd1cmF0aW9uIHRvIHByb3ZpZGUuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBgYGBcbiAqIEBOZ01vZHVsZSh7XG4gKiAgIHByb3ZpZGVyczogW3Byb3ZpZGVSb3V0ZXMoUk9VVEVTKV1cbiAqIH0pXG4gKiBjbGFzcyBMYXp5TG9hZGVkQ2hpbGRNb2R1bGUge31cbiAqIGBgYFxuICpcbiAqIEBkZXByZWNhdGVkIElmIG5lY2Vzc2FyeSwgcHJvdmlkZSByb3V0ZXMgdXNpbmcgdGhlIGBST1VURVNgIGBJbmplY3Rpb25Ub2tlbmAuXG4gKiBAc2VlIGBST1VURVNgXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm92aWRlUm91dGVzKHJvdXRlczogUm91dGVzKTogUHJvdmlkZXJbXSB7XG4gIHJldHVybiBbXG4gICAge3Byb3ZpZGU6IFJPVVRFUywgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiByb3V0ZXN9LFxuICAgIE5HX0RFVl9NT0RFID8gcm91dGVySXNQcm92aWRlZERldk1vZGVDaGVjayA6IFtdLFxuICBdO1xufVxuXG4vKipcbiAqIEEgdHlwZSBhbGlhcyBmb3IgcHJvdmlkZXJzIHJldHVybmVkIGJ5IGB3aXRoSW5NZW1vcnlTY3JvbGxpbmdgIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHNlZSBgd2l0aEluTWVtb3J5U2Nyb2xsaW5nYFxuICogQHNlZSBgcHJvdmlkZVJvdXRlcmBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIEluTWVtb3J5U2Nyb2xsaW5nRmVhdHVyZSA9IFJvdXRlckZlYXR1cmU8Um91dGVyRmVhdHVyZUtpbmQuSW5NZW1vcnlTY3JvbGxpbmdGZWF0dXJlPjtcblxuLyoqXG4gKiBFbmFibGVzIGN1c3RvbWl6YWJsZSBzY3JvbGxpbmcgYmVoYXZpb3IgZm9yIHJvdXRlciBuYXZpZ2F0aW9ucy5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIEJhc2ljIGV4YW1wbGUgb2YgaG93IHlvdSBjYW4gZW5hYmxlIHNjcm9sbGluZyBmZWF0dXJlOlxuICogYGBgXG4gKiBjb25zdCBhcHBSb3V0ZXM6IFJvdXRlcyA9IFtdO1xuICogYm9vdHN0cmFwQXBwbGljYXRpb24oQXBwQ29tcG9uZW50LFxuICogICB7XG4gKiAgICAgcHJvdmlkZXJzOiBbXG4gKiAgICAgICBwcm92aWRlUm91dGVyKGFwcFJvdXRlcywgd2l0aEluTWVtb3J5U2Nyb2xsaW5nKCkpXG4gKiAgICAgXVxuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQHNlZSBgcHJvdmlkZVJvdXRlcmBcbiAqIEBzZWUgYFZpZXdwb3J0U2Nyb2xsZXJgXG4gKlxuICogQHB1YmxpY0FwaVxuICogQHBhcmFtIG9wdGlvbnMgU2V0IG9mIGNvbmZpZ3VyYXRpb24gcGFyYW1ldGVycyB0byBjdXN0b21pemUgc2Nyb2xsaW5nIGJlaGF2aW9yLCBzZWVcbiAqICAgICBgSW5NZW1vcnlTY3JvbGxpbmdPcHRpb25zYCBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvbi5cbiAqIEByZXR1cm5zIEEgc2V0IG9mIHByb3ZpZGVycyBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aEluTWVtb3J5U2Nyb2xsaW5nKG9wdGlvbnM6IEluTWVtb3J5U2Nyb2xsaW5nT3B0aW9ucyA9IHt9KTpcbiAgICBJbk1lbW9yeVNjcm9sbGluZ0ZlYXR1cmUge1xuICBjb25zdCBwcm92aWRlcnMgPSBbe1xuICAgIHByb3ZpZGU6IFJPVVRFUl9TQ1JPTExFUixcbiAgICB1c2VGYWN0b3J5OiAoKSA9PiB7XG4gICAgICBjb25zdCB2aWV3cG9ydFNjcm9sbGVyID0gaW5qZWN0KFZpZXdwb3J0U2Nyb2xsZXIpO1xuICAgICAgY29uc3Qgem9uZSA9IGluamVjdChOZ1pvbmUpO1xuICAgICAgY29uc3QgdHJhbnNpdGlvbnMgPSBpbmplY3QoTmF2aWdhdGlvblRyYW5zaXRpb25zKTtcbiAgICAgIGNvbnN0IHVybFNlcmlhbGl6ZXIgPSBpbmplY3QoVXJsU2VyaWFsaXplcik7XG4gICAgICByZXR1cm4gbmV3IFJvdXRlclNjcm9sbGVyKHVybFNlcmlhbGl6ZXIsIHRyYW5zaXRpb25zLCB2aWV3cG9ydFNjcm9sbGVyLCB6b25lLCBvcHRpb25zKTtcbiAgICB9LFxuICB9XTtcbiAgcmV0dXJuIHJvdXRlckZlYXR1cmUoUm91dGVyRmVhdHVyZUtpbmQuSW5NZW1vcnlTY3JvbGxpbmdGZWF0dXJlLCBwcm92aWRlcnMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Qm9vdHN0cmFwTGlzdGVuZXIoKSB7XG4gIGNvbnN0IGluamVjdG9yID0gaW5qZWN0KEluamVjdG9yKTtcbiAgcmV0dXJuIChib290c3RyYXBwZWRDb21wb25lbnRSZWY6IENvbXBvbmVudFJlZjx1bmtub3duPikgPT4ge1xuICAgIGNvbnN0IHJlZiA9IGluamVjdG9yLmdldChBcHBsaWNhdGlvblJlZik7XG5cbiAgICBpZiAoYm9vdHN0cmFwcGVkQ29tcG9uZW50UmVmICE9PSByZWYuY29tcG9uZW50c1swXSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHJvdXRlciA9IGluamVjdG9yLmdldChSb3V0ZXIpO1xuICAgIGNvbnN0IGJvb3RzdHJhcERvbmUgPSBpbmplY3Rvci5nZXQoQk9PVFNUUkFQX0RPTkUpO1xuXG4gICAgaWYgKGluamVjdG9yLmdldChJTklUSUFMX05BVklHQVRJT04pID09PSBJbml0aWFsTmF2aWdhdGlvbi5FbmFibGVkTm9uQmxvY2tpbmcpIHtcbiAgICAgIHJvdXRlci5pbml0aWFsTmF2aWdhdGlvbigpO1xuICAgIH1cblxuICAgIGluamVjdG9yLmdldChST1VURVJfUFJFTE9BREVSLCBudWxsLCBJbmplY3RGbGFncy5PcHRpb25hbCk/LnNldFVwUHJlbG9hZGluZygpO1xuICAgIGluamVjdG9yLmdldChST1VURVJfU0NST0xMRVIsIG51bGwsIEluamVjdEZsYWdzLk9wdGlvbmFsKT8uaW5pdCgpO1xuICAgIHJvdXRlci5yZXNldFJvb3RDb21wb25lbnRUeXBlKHJlZi5jb21wb25lbnRUeXBlc1swXSk7XG4gICAgaWYgKCFib290c3RyYXBEb25lLmNsb3NlZCkge1xuICAgICAgYm9vdHN0cmFwRG9uZS5uZXh0KCk7XG4gICAgICBib290c3RyYXBEb25lLnVuc3Vic2NyaWJlKCk7XG4gICAgfVxuICB9O1xufVxuXG4vKipcbiAqIEEgc3ViamVjdCB1c2VkIHRvIGluZGljYXRlIHRoYXQgdGhlIGJvb3RzdHJhcHBpbmcgcGhhc2UgaXMgZG9uZS4gV2hlbiBpbml0aWFsIG5hdmlnYXRpb24gaXNcbiAqIGBlbmFibGVkQmxvY2tpbmdgLCB0aGUgZmlyc3QgbmF2aWdhdGlvbiB3YWl0cyB1bnRpbCBib290c3RyYXBwaW5nIGlzIGZpbmlzaGVkIGJlZm9yZSBjb250aW51aW5nXG4gKiB0byB0aGUgYWN0aXZhdGlvbiBwaGFzZS5cbiAqL1xuY29uc3QgQk9PVFNUUkFQX0RPTkUgPVxuICAgIG5ldyBJbmplY3Rpb25Ub2tlbjxTdWJqZWN0PHZvaWQ+PihOR19ERVZfTU9ERSA/ICdib290c3RyYXAgZG9uZSBpbmRpY2F0b3InIDogJycsIHtcbiAgICAgIGZhY3Rvcnk6ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG4gICAgICB9XG4gICAgfSk7XG5cbi8qKlxuICogVGhpcyBhbmQgdGhlIElOSVRJQUxfTkFWSUdBVElPTiB0b2tlbiBhcmUgdXNlZCBpbnRlcm5hbGx5IG9ubHkuIFRoZSBwdWJsaWMgQVBJIHNpZGUgb2YgdGhpcyBpc1xuICogY29uZmlndXJlZCB0aHJvdWdoIHRoZSBgRXh0cmFPcHRpb25zYC5cbiAqXG4gKiBXaGVuIHNldCB0byBgRW5hYmxlZEJsb2NraW5nYCwgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBzdGFydHMgYmVmb3JlIHRoZSByb290XG4gKiBjb21wb25lbnQgaXMgY3JlYXRlZC4gVGhlIGJvb3RzdHJhcCBpcyBibG9ja2VkIHVudGlsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgY29tcGxldGUuIFRoaXNcbiAqIHZhbHVlIGlzIHJlcXVpcmVkIGZvciBbc2VydmVyLXNpZGUgcmVuZGVyaW5nXShndWlkZS91bml2ZXJzYWwpIHRvIHdvcmsuXG4gKlxuICogV2hlbiBzZXQgdG8gYEVuYWJsZWROb25CbG9ja2luZ2AsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gc3RhcnRzIGFmdGVyIHRoZSByb290IGNvbXBvbmVudCBoYXMgYmVlblxuICogY3JlYXRlZC4gVGhlIGJvb3RzdHJhcCBpcyBub3QgYmxvY2tlZCBvbiB0aGUgY29tcGxldGlvbiBvZiB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICpcbiAqIFdoZW4gc2V0IHRvIGBEaXNhYmxlZGAsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgbm90IHBlcmZvcm1lZC4gVGhlIGxvY2F0aW9uIGxpc3RlbmVyIGlzIHNldCB1cFxuICogYmVmb3JlIHRoZSByb290IGNvbXBvbmVudCBnZXRzIGNyZWF0ZWQuIFVzZSBpZiB0aGVyZSBpcyBhIHJlYXNvbiB0byBoYXZlIG1vcmUgY29udHJvbCBvdmVyIHdoZW5cbiAqIHRoZSByb3V0ZXIgc3RhcnRzIGl0cyBpbml0aWFsIG5hdmlnYXRpb24gZHVlIHRvIHNvbWUgY29tcGxleCBpbml0aWFsaXphdGlvbiBsb2dpYy5cbiAqXG4gKiBAc2VlIGBFeHRyYU9wdGlvbnNgXG4gKi9cbmNvbnN0IGVudW0gSW5pdGlhbE5hdmlnYXRpb24ge1xuICBFbmFibGVkQmxvY2tpbmcsXG4gIEVuYWJsZWROb25CbG9ja2luZyxcbiAgRGlzYWJsZWQsXG59XG5cbmNvbnN0IElOSVRJQUxfTkFWSUdBVElPTiA9IG5ldyBJbmplY3Rpb25Ub2tlbjxJbml0aWFsTmF2aWdhdGlvbj4oXG4gICAgTkdfREVWX01PREUgPyAnaW5pdGlhbCBuYXZpZ2F0aW9uJyA6ICcnLFxuICAgIHtwcm92aWRlZEluOiAncm9vdCcsIGZhY3Rvcnk6ICgpID0+IEluaXRpYWxOYXZpZ2F0aW9uLkVuYWJsZWROb25CbG9ja2luZ30pO1xuXG4vKipcbiAqIEEgdHlwZSBhbGlhcyBmb3IgcHJvdmlkZXJzIHJldHVybmVkIGJ5IGB3aXRoRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb25gIGZvciB1c2Ugd2l0aFxuICogYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBzZWUgYHdpdGhFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbmBcbiAqIEBzZWUgYHByb3ZpZGVSb3V0ZXJgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUgPVxuICAgIFJvdXRlckZlYXR1cmU8Um91dGVyRmVhdHVyZUtpbmQuRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb25GZWF0dXJlPjtcblxuLyoqXG4gKiBBIHR5cGUgYWxpYXMgZm9yIHByb3ZpZGVycyByZXR1cm5lZCBieSBgd2l0aEVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uYCBvclxuICogYHdpdGhEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uYCBmdW5jdGlvbnMgZm9yIHVzZSB3aXRoIGBwcm92aWRlUm91dGVyYC5cbiAqXG4gKiBAc2VlIGB3aXRoRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb25gXG4gKiBAc2VlIGB3aXRoRGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbmBcbiAqIEBzZWUgYHByb3ZpZGVSb3V0ZXJgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUgPVxuICAgIEVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZXxEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZTtcblxuLyoqXG4gKiBDb25maWd1cmVzIGluaXRpYWwgbmF2aWdhdGlvbiB0byBzdGFydCBiZWZvcmUgdGhlIHJvb3QgY29tcG9uZW50IGlzIGNyZWF0ZWQuXG4gKlxuICogVGhlIGJvb3RzdHJhcCBpcyBibG9ja2VkIHVudGlsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgY29tcGxldGUuIFRoaXMgdmFsdWUgaXMgcmVxdWlyZWQgZm9yXG4gKiBbc2VydmVyLXNpZGUgcmVuZGVyaW5nXShndWlkZS91bml2ZXJzYWwpIHRvIHdvcmsuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBCYXNpYyBleGFtcGxlIG9mIGhvdyB5b3UgY2FuIGVuYWJsZSB0aGlzIG5hdmlnYXRpb24gYmVoYXZpb3I6XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLCB3aXRoRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb24oKSlcbiAqICAgICBdXG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqXG4gKiBAc2VlIGBwcm92aWRlUm91dGVyYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqIEByZXR1cm5zIEEgc2V0IG9mIHByb3ZpZGVycyBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aEVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uKCk6IEVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZSB7XG4gIGNvbnN0IHByb3ZpZGVycyA9IFtcbiAgICB7cHJvdmlkZTogSU5JVElBTF9OQVZJR0FUSU9OLCB1c2VWYWx1ZTogSW5pdGlhbE5hdmlnYXRpb24uRW5hYmxlZEJsb2NraW5nfSxcbiAgICB7XG4gICAgICBwcm92aWRlOiBBUFBfSU5JVElBTElaRVIsXG4gICAgICBtdWx0aTogdHJ1ZSxcbiAgICAgIGRlcHM6IFtJbmplY3Rvcl0sXG4gICAgICB1c2VGYWN0b3J5OiAoaW5qZWN0b3I6IEluamVjdG9yKSA9PiB7XG4gICAgICAgIGNvbnN0IGxvY2F0aW9uSW5pdGlhbGl6ZWQ6IFByb21pc2U8YW55PiA9XG4gICAgICAgICAgICBpbmplY3Rvci5nZXQoTE9DQVRJT05fSU5JVElBTElaRUQsIFByb21pc2UucmVzb2x2ZSgpKTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUGVyZm9ybXMgdGhlIGdpdmVuIGFjdGlvbiBvbmNlIHRoZSByb3V0ZXIgZmluaXNoZXMgaXRzIG5leHQvY3VycmVudCBuYXZpZ2F0aW9uLlxuICAgICAgICAgKlxuICAgICAgICAgKiBJZiB0aGUgbmF2aWdhdGlvbiBpcyBjYW5jZWxlZCBvciBlcnJvcnMgd2l0aG91dCBhIHJlZGlyZWN0LCB0aGUgbmF2aWdhdGlvbiBpcyBjb25zaWRlcmVkXG4gICAgICAgICAqIGNvbXBsZXRlLiBJZiB0aGUgYE5hdmlnYXRpb25FbmRgIGV2ZW50IGVtaXRzLCB0aGUgbmF2aWdhdGlvbiBpcyBhbHNvIGNvbnNpZGVyZWQgY29tcGxldGUuXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBhZnRlck5leHROYXZpZ2F0aW9uKGFjdGlvbjogKCkgPT4gdm9pZCkge1xuICAgICAgICAgIGNvbnN0IHJvdXRlciA9IGluamVjdG9yLmdldChSb3V0ZXIpO1xuICAgICAgICAgIHJvdXRlci5ldmVudHNcbiAgICAgICAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICAgICAgICBmaWx0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgKGUpOiBlIGlzIE5hdmlnYXRpb25FbmR8TmF2aWdhdGlvbkNhbmNlbHxOYXZpZ2F0aW9uRXJyb3IgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQgfHwgZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25DYW5jZWwgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FcnJvciksXG4gICAgICAgICAgICAgICAgICBtYXAoZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIE5hdmlnYXRpb24gYXNzdW1lZCB0byBzdWNjZWVkIGlmIHdlIGdldCBgQWN0aXZhdGlvblN0YXJ0YFxuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlZGlyZWN0aW5nID0gZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25DYW5jZWwgP1xuICAgICAgICAgICAgICAgICAgICAgICAgKGUuY29kZSA9PT0gTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuUmVkaXJlY3QgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICBlLmNvZGUgPT09IE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLlN1cGVyc2VkZWRCeU5ld05hdmlnYXRpb24pIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVkaXJlY3RpbmcgPyBudWxsIDogZmFsc2U7XG4gICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgIGZpbHRlcigocmVzdWx0KTogcmVzdWx0IGlzIGJvb2xlYW4gPT4gcmVzdWx0ICE9PSBudWxsKSxcbiAgICAgICAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgIC5zdWJzY3JpYmUoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGFjdGlvbigpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGxvY2F0aW9uSW5pdGlhbGl6ZWQudGhlbigoKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHJvdXRlciA9IGluamVjdG9yLmdldChSb3V0ZXIpO1xuICAgICAgICAgICAgICBjb25zdCBib290c3RyYXBEb25lID0gaW5qZWN0b3IuZ2V0KEJPT1RTVFJBUF9ET05FKTtcbiAgICAgICAgICAgICAgYWZ0ZXJOZXh0TmF2aWdhdGlvbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVW5ibG9jayBBUFBfSU5JVElBTElaRVIgaW4gY2FzZSB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIHdhcyBjYW5jZWxlZCBvciBlcnJvcmVkXG4gICAgICAgICAgICAgICAgLy8gd2l0aG91dCBhIHJlZGlyZWN0LlxuICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgIHJvdXRlci5hZnRlclByZWFjdGl2YXRpb24gPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVW5ibG9jayBBUFBfSU5JVElBTElaRVIgb25jZSB3ZSBnZXQgdG8gYGFmdGVyUHJlYWN0aXZhdGlvbmAuIEF0IHRoaXMgcG9pbnQsIHdlXG4gICAgICAgICAgICAgICAgLy8gYXNzdW1lIGFjdGl2YXRpb24gd2lsbCBjb21wbGV0ZSBzdWNjZXNzZnVsbHkgKGV2ZW4gdGhvdWdoIHRoaXMgaXMgbm90XG4gICAgICAgICAgICAgICAgLy8gZ3VhcmFudGVlZCkuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYm9vdHN0cmFwRG9uZS5jbG9zZWQgPyBvZih2b2lkIDApIDogYm9vdHN0cmFwRG9uZTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgcm91dGVyLmluaXRpYWxOYXZpZ2F0aW9uKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9LFxuICBdO1xuICByZXR1cm4gcm91dGVyRmVhdHVyZShSb3V0ZXJGZWF0dXJlS2luZC5FbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUsIHByb3ZpZGVycyk7XG59XG5cbi8qKlxuICogQSB0eXBlIGFsaWFzIGZvciBwcm92aWRlcnMgcmV0dXJuZWQgYnkgYHdpdGhEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uYCBmb3IgdXNlIHdpdGhcbiAqIGBwcm92aWRlUm91dGVyYC5cbiAqXG4gKiBAc2VlIGB3aXRoRGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbmBcbiAqIEBzZWUgYHByb3ZpZGVSb3V0ZXJgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZSA9XG4gICAgUm91dGVyRmVhdHVyZTxSb3V0ZXJGZWF0dXJlS2luZC5EaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZT47XG5cbi8qKlxuICogRGlzYWJsZXMgaW5pdGlhbCBuYXZpZ2F0aW9uLlxuICpcbiAqIFVzZSBpZiB0aGVyZSBpcyBhIHJlYXNvbiB0byBoYXZlIG1vcmUgY29udHJvbCBvdmVyIHdoZW4gdGhlIHJvdXRlciBzdGFydHMgaXRzIGluaXRpYWwgbmF2aWdhdGlvblxuICogZHVlIHRvIHNvbWUgY29tcGxleCBpbml0aWFsaXphdGlvbiBsb2dpYy5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIEJhc2ljIGV4YW1wbGUgb2YgaG93IHlvdSBjYW4gZGlzYWJsZSBpbml0aWFsIG5hdmlnYXRpb246XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLCB3aXRoRGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbigpKVxuICogICAgIF1cbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICpcbiAqIEBzZWUgYHByb3ZpZGVSb3V0ZXJgXG4gKlxuICogQHJldHVybnMgQSBzZXQgb2YgcHJvdmlkZXJzIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aERpc2FibGVkSW5pdGlhbE5hdmlnYXRpb24oKTogRGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUge1xuICBjb25zdCBwcm92aWRlcnMgPSBbXG4gICAge1xuICAgICAgcHJvdmlkZTogQVBQX0lOSVRJQUxJWkVSLFxuICAgICAgbXVsdGk6IHRydWUsXG4gICAgICB1c2VGYWN0b3J5OiAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHJvdXRlciA9IGluamVjdChSb3V0ZXIpO1xuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgIHJvdXRlci5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHtwcm92aWRlOiBJTklUSUFMX05BVklHQVRJT04sIHVzZVZhbHVlOiBJbml0aWFsTmF2aWdhdGlvbi5EaXNhYmxlZH1cbiAgXTtcbiAgcmV0dXJuIHJvdXRlckZlYXR1cmUoUm91dGVyRmVhdHVyZUtpbmQuRGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUsIHByb3ZpZGVycyk7XG59XG5cbi8qKlxuICogQSB0eXBlIGFsaWFzIGZvciBwcm92aWRlcnMgcmV0dXJuZWQgYnkgYHdpdGhEZWJ1Z1RyYWNpbmdgIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHNlZSBgd2l0aERlYnVnVHJhY2luZ2BcbiAqIEBzZWUgYHByb3ZpZGVSb3V0ZXJgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBEZWJ1Z1RyYWNpbmdGZWF0dXJlID0gUm91dGVyRmVhdHVyZTxSb3V0ZXJGZWF0dXJlS2luZC5EZWJ1Z1RyYWNpbmdGZWF0dXJlPjtcblxuLyoqXG4gKiBFbmFibGVzIGxvZ2dpbmcgb2YgYWxsIGludGVybmFsIG5hdmlnYXRpb24gZXZlbnRzIHRvIHRoZSBjb25zb2xlLlxuICogRXh0cmEgbG9nZ2luZyBtaWdodCBiZSB1c2VmdWwgZm9yIGRlYnVnZ2luZyBwdXJwb3NlcyB0byBpbnNwZWN0IFJvdXRlciBldmVudCBzZXF1ZW5jZS5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIEJhc2ljIGV4YW1wbGUgb2YgaG93IHlvdSBjYW4gZW5hYmxlIGRlYnVnIHRyYWNpbmc6XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLCB3aXRoRGVidWdUcmFjaW5nKCkpXG4gKiAgICAgXVxuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQHNlZSBgcHJvdmlkZVJvdXRlcmBcbiAqXG4gKiBAcmV0dXJucyBBIHNldCBvZiBwcm92aWRlcnMgZm9yIHVzZSB3aXRoIGBwcm92aWRlUm91dGVyYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXRoRGVidWdUcmFjaW5nKCk6IERlYnVnVHJhY2luZ0ZlYXR1cmUge1xuICBsZXQgcHJvdmlkZXJzOiBQcm92aWRlcltdID0gW107XG4gIGlmIChOR19ERVZfTU9ERSkge1xuICAgIHByb3ZpZGVycyA9IFt7XG4gICAgICBwcm92aWRlOiBFTlZJUk9OTUVOVF9JTklUSUFMSVpFUixcbiAgICAgIG11bHRpOiB0cnVlLFxuICAgICAgdXNlRmFjdG9yeTogKCkgPT4ge1xuICAgICAgICBjb25zdCByb3V0ZXIgPSBpbmplY3QoUm91dGVyKTtcbiAgICAgICAgcmV0dXJuICgpID0+IHJvdXRlci5ldmVudHMuc3Vic2NyaWJlKChlOiBFdmVudCkgPT4ge1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmdyb3VwPy4oYFJvdXRlciBFdmVudDogJHsoPGFueT5lLmNvbnN0cnVjdG9yKS5uYW1lfWApO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHN0cmluZ2lmeUV2ZW50KGUpKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICBjb25zb2xlLmdyb3VwRW5kPy4oKTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZW5hYmxlOm5vLWNvbnNvbGVcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfV07XG4gIH0gZWxzZSB7XG4gICAgcHJvdmlkZXJzID0gW107XG4gIH1cbiAgcmV0dXJuIHJvdXRlckZlYXR1cmUoUm91dGVyRmVhdHVyZUtpbmQuRGVidWdUcmFjaW5nRmVhdHVyZSwgcHJvdmlkZXJzKTtcbn1cblxuY29uc3QgUk9VVEVSX1BSRUxPQURFUiA9IG5ldyBJbmplY3Rpb25Ub2tlbjxSb3V0ZXJQcmVsb2FkZXI+KE5HX0RFVl9NT0RFID8gJ3JvdXRlciBwcmVsb2FkZXInIDogJycpO1xuXG4vKipcbiAqIEEgdHlwZSBhbGlhcyB0aGF0IHJlcHJlc2VudHMgYSBmZWF0dXJlIHdoaWNoIGVuYWJsZXMgcHJlbG9hZGluZyBpbiBSb3V0ZXIuXG4gKiBUaGUgdHlwZSBpcyB1c2VkIHRvIGRlc2NyaWJlIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGB3aXRoUHJlbG9hZGluZ2AgZnVuY3Rpb24uXG4gKlxuICogQHNlZSBgd2l0aFByZWxvYWRpbmdgXG4gKiBAc2VlIGBwcm92aWRlUm91dGVyYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgUHJlbG9hZGluZ0ZlYXR1cmUgPSBSb3V0ZXJGZWF0dXJlPFJvdXRlckZlYXR1cmVLaW5kLlByZWxvYWRpbmdGZWF0dXJlPjtcblxuLyoqXG4gKiBBbGxvd3MgdG8gY29uZmlndXJlIGEgcHJlbG9hZGluZyBzdHJhdGVneSB0byB1c2UuIFRoZSBzdHJhdGVneSBpcyBjb25maWd1cmVkIGJ5IHByb3ZpZGluZyBhXG4gKiByZWZlcmVuY2UgdG8gYSBjbGFzcyB0aGF0IGltcGxlbWVudHMgYSBgUHJlbG9hZGluZ1N0cmF0ZWd5YC5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIEJhc2ljIGV4YW1wbGUgb2YgaG93IHlvdSBjYW4gY29uZmlndXJlIHByZWxvYWRpbmc6XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLCB3aXRoUHJlbG9hZGluZyhQcmVsb2FkQWxsTW9kdWxlcykpXG4gKiAgICAgXVxuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQHNlZSBgcHJvdmlkZVJvdXRlcmBcbiAqXG4gKiBAcGFyYW0gcHJlbG9hZGluZ1N0cmF0ZWd5IEEgcmVmZXJlbmNlIHRvIGEgY2xhc3MgdGhhdCBpbXBsZW1lbnRzIGEgYFByZWxvYWRpbmdTdHJhdGVneWAgdGhhdFxuICogICAgIHNob3VsZCBiZSB1c2VkLlxuICogQHJldHVybnMgQSBzZXQgb2YgcHJvdmlkZXJzIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aFByZWxvYWRpbmcocHJlbG9hZGluZ1N0cmF0ZWd5OiBUeXBlPFByZWxvYWRpbmdTdHJhdGVneT4pOiBQcmVsb2FkaW5nRmVhdHVyZSB7XG4gIGNvbnN0IHByb3ZpZGVycyA9IFtcbiAgICB7cHJvdmlkZTogUk9VVEVSX1BSRUxPQURFUiwgdXNlRXhpc3Rpbmc6IFJvdXRlclByZWxvYWRlcn0sXG4gICAge3Byb3ZpZGU6IFByZWxvYWRpbmdTdHJhdGVneSwgdXNlRXhpc3Rpbmc6IHByZWxvYWRpbmdTdHJhdGVneX0sXG4gIF07XG4gIHJldHVybiByb3V0ZXJGZWF0dXJlKFJvdXRlckZlYXR1cmVLaW5kLlByZWxvYWRpbmdGZWF0dXJlLCBwcm92aWRlcnMpO1xufVxuXG4vKipcbiAqIEEgdHlwZSBhbGlhcyBmb3IgcHJvdmlkZXJzIHJldHVybmVkIGJ5IGB3aXRoUm91dGVyQ29uZmlnYCBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBzZWUgYHdpdGhSb3V0ZXJDb25maWdgXG4gKiBAc2VlIGBwcm92aWRlUm91dGVyYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgUm91dGVyQ29uZmlndXJhdGlvbkZlYXR1cmUgPVxuICAgIFJvdXRlckZlYXR1cmU8Um91dGVyRmVhdHVyZUtpbmQuUm91dGVyQ29uZmlndXJhdGlvbkZlYXR1cmU+O1xuXG4vKipcbiAqIEFsbG93cyB0byBwcm92aWRlIGV4dHJhIHBhcmFtZXRlcnMgdG8gY29uZmlndXJlIFJvdXRlci5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIEJhc2ljIGV4YW1wbGUgb2YgaG93IHlvdSBjYW4gcHJvdmlkZSBleHRyYSBjb25maWd1cmF0aW9uIG9wdGlvbnM6XG4gKiBgYGBcbiAqIGNvbnN0IGFwcFJvdXRlczogUm91dGVzID0gW107XG4gKiBib290c3RyYXBBcHBsaWNhdGlvbihBcHBDb21wb25lbnQsXG4gKiAgIHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXIoYXBwUm91dGVzLCB3aXRoUm91dGVyQ29uZmlnKHtcbiAqICAgICAgICAgIG9uU2FtZVVybE5hdmlnYXRpb246ICdyZWxvYWQnXG4gKiAgICAgICB9KSlcbiAqICAgICBdXG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqXG4gKiBAc2VlIGBwcm92aWRlUm91dGVyYFxuICpcbiAqIEBwYXJhbSBvcHRpb25zIEEgc2V0IG9mIHBhcmFtZXRlcnMgdG8gY29uZmlndXJlIFJvdXRlciwgc2VlIGBSb3V0ZXJDb25maWdPcHRpb25zYCBmb3JcbiAqICAgICBhZGRpdGlvbmFsIGluZm9ybWF0aW9uLlxuICogQHJldHVybnMgQSBzZXQgb2YgcHJvdmlkZXJzIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2l0aFJvdXRlckNvbmZpZyhvcHRpb25zOiBSb3V0ZXJDb25maWdPcHRpb25zKTogUm91dGVyQ29uZmlndXJhdGlvbkZlYXR1cmUge1xuICBjb25zdCBwcm92aWRlcnMgPSBbXG4gICAge3Byb3ZpZGU6IFJPVVRFUl9DT05GSUdVUkFUSU9OLCB1c2VWYWx1ZTogb3B0aW9uc30sXG4gIF07XG4gIHJldHVybiByb3V0ZXJGZWF0dXJlKFJvdXRlckZlYXR1cmVLaW5kLlJvdXRlckNvbmZpZ3VyYXRpb25GZWF0dXJlLCBwcm92aWRlcnMpO1xufVxuXG4vKipcbiAqIEEgdHlwZSBhbGlhcyBmb3IgcHJvdmlkZXJzIHJldHVybmVkIGJ5IGB3aXRoSGFzaExvY2F0aW9uYCBmb3IgdXNlIHdpdGggYHByb3ZpZGVSb3V0ZXJgLlxuICpcbiAqIEBzZWUgYHdpdGhIYXNoTG9jYXRpb25gXG4gKiBAc2VlIGBwcm92aWRlUm91dGVyYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgUm91dGVySGFzaExvY2F0aW9uRmVhdHVyZSA9IFJvdXRlckZlYXR1cmU8Um91dGVyRmVhdHVyZUtpbmQuUm91dGVySGFzaExvY2F0aW9uRmVhdHVyZT47XG5cbi8qKlxuICogUHJvdmlkZXMgdGhlIGxvY2F0aW9uIHN0cmF0ZWd5IHRoYXQgdXNlcyB0aGUgVVJMIGZyYWdtZW50IGluc3RlYWQgb2YgdGhlIGhpc3RvcnkgQVBJLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogQmFzaWMgZXhhbXBsZSBvZiBob3cgeW91IGNhbiB1c2UgdGhlIGhhc2ggbG9jYXRpb24gb3B0aW9uOlxuICogYGBgXG4gKiBjb25zdCBhcHBSb3V0ZXM6IFJvdXRlcyA9IFtdO1xuICogYm9vdHN0cmFwQXBwbGljYXRpb24oQXBwQ29tcG9uZW50LFxuICogICB7XG4gKiAgICAgcHJvdmlkZXJzOiBbXG4gKiAgICAgICBwcm92aWRlUm91dGVyKGFwcFJvdXRlcywgd2l0aEhhc2hMb2NhdGlvbigpKVxuICogICAgIF1cbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICpcbiAqIEBzZWUgYHByb3ZpZGVSb3V0ZXJgXG4gKiBAc2VlIGBIYXNoTG9jYXRpb25TdHJhdGVneWBcbiAqXG4gKiBAcmV0dXJucyBBIHNldCBvZiBwcm92aWRlcnMgZm9yIHVzZSB3aXRoIGBwcm92aWRlUm91dGVyYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXRoSGFzaExvY2F0aW9uKCk6IFJvdXRlckNvbmZpZ3VyYXRpb25GZWF0dXJlIHtcbiAgY29uc3QgcHJvdmlkZXJzID0gW1xuICAgIHtwcm92aWRlOiBMb2NhdGlvblN0cmF0ZWd5LCB1c2VDbGFzczogSGFzaExvY2F0aW9uU3RyYXRlZ3l9LFxuICBdO1xuICByZXR1cm4gcm91dGVyRmVhdHVyZShSb3V0ZXJGZWF0dXJlS2luZC5Sb3V0ZXJDb25maWd1cmF0aW9uRmVhdHVyZSwgcHJvdmlkZXJzKTtcbn1cblxuLyoqXG4gKiBBIHR5cGUgYWxpYXMgdGhhdCByZXByZXNlbnRzIGFsbCBSb3V0ZXIgZmVhdHVyZXMgYXZhaWxhYmxlIGZvciB1c2Ugd2l0aCBgcHJvdmlkZVJvdXRlcmAuXG4gKiBGZWF0dXJlcyBjYW4gYmUgZW5hYmxlZCBieSBhZGRpbmcgc3BlY2lhbCBmdW5jdGlvbnMgdG8gdGhlIGBwcm92aWRlUm91dGVyYCBjYWxsLlxuICogU2VlIGRvY3VtZW50YXRpb24gZm9yIGVhY2ggc3ltYm9sIHRvIGZpbmQgY29ycmVzcG9uZGluZyBmdW5jdGlvbiBuYW1lLiBTZWUgYWxzbyBgcHJvdmlkZVJvdXRlcmBcbiAqIGRvY3VtZW50YXRpb24gb24gaG93IHRvIHVzZSB0aG9zZSBmdW5jdGlvbnMuXG4gKlxuICogQHNlZSBgcHJvdmlkZVJvdXRlcmBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIFJvdXRlckZlYXR1cmVzID0gUHJlbG9hZGluZ0ZlYXR1cmV8RGVidWdUcmFjaW5nRmVhdHVyZXxJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmV8XG4gICAgSW5NZW1vcnlTY3JvbGxpbmdGZWF0dXJlfFJvdXRlckNvbmZpZ3VyYXRpb25GZWF0dXJlO1xuXG4vKipcbiAqIFRoZSBsaXN0IG9mIGZlYXR1cmVzIGFzIGFuIGVudW0gdG8gdW5pcXVlbHkgdHlwZSBlYWNoIGZlYXR1cmUuXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIFJvdXRlckZlYXR1cmVLaW5kIHtcbiAgUHJlbG9hZGluZ0ZlYXR1cmUsXG4gIERlYnVnVHJhY2luZ0ZlYXR1cmUsXG4gIEVuYWJsZWRCbG9ja2luZ0luaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZSxcbiAgRGlzYWJsZWRJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUsXG4gIEluTWVtb3J5U2Nyb2xsaW5nRmVhdHVyZSxcbiAgUm91dGVyQ29uZmlndXJhdGlvbkZlYXR1cmUsXG4gIFJvdXRlckhhc2hMb2NhdGlvbkZlYXR1cmVcbn1cbiJdfQ==