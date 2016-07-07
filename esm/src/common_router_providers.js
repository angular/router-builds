/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { APP_INITIALIZER, AppModuleFactoryLoader, ApplicationRef, ComponentResolver, Injector, OpaqueToken, SystemJsAppModuleLoader } from '@angular/core';
import { Router } from './router';
import { ROUTER_CONFIG, ROUTES } from './router_config_loader';
import { RouterOutletMap } from './router_outlet_map';
import { ActivatedRoute } from './router_state';
import { DefaultUrlSerializer, UrlSerializer } from './url_tree';
export const ROUTER_CONFIGURATION = new OpaqueToken('ROUTER_CONFIGURATION');
export function setupRouter(ref, resolver, urlSerializer, outletMap, location, injector, loader, config, opts) {
    if (ref.componentTypes.length == 0) {
        throw new Error('Bootstrap at least one component before injecting Router.');
    }
    const componentType = ref.componentTypes[0];
    const r = new Router(componentType, resolver, urlSerializer, outletMap, location, injector, loader, config);
    ref.registerDisposeListener(() => r.dispose());
    if (opts.enableTracing) {
        r.events.subscribe(e => {
            console.group(`Router Event: ${e.constructor.name}`);
            console.log(e.toString());
            console.log(e);
            console.groupEnd();
        });
    }
    return r;
}
export function setupRouterInitializer(injector) {
    // https://github.com/angular/angular/issues/9101
    // Delay the router instantiation to avoid circular dependency (ApplicationRef ->
    // APP_INITIALIZER -> Router)
    setTimeout(() => {
        const appRef = injector.get(ApplicationRef);
        if (appRef.componentTypes.length == 0) {
            appRef.registerBootstrapListener(() => { injector.get(Router).initialNavigation(); });
        }
        else {
            injector.get(Router).initialNavigation();
        }
    }, 0);
    return () => null;
}
/**
 * An array of {@link Provider}s. To use the router, you must add this to your application.
 *
 * ### Example
 *
 * ```
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * class AppCmp {
 *   // ...
 * }
 *
 * const config = [
 *   {path: 'home', component: Home}
 * ];
 *
 * bootstrap(AppCmp, [provideRouter(config)]);
 * ```
 *
 * @deprecated use RouterModule instead
 */
export function provideRouter(routes, config) {
    return [
        { provide: ROUTES, useExisting: ROUTER_CONFIG }, { provide: ROUTER_CONFIG, useValue: routes },
        { provide: ROUTER_CONFIGURATION, useValue: config }, Location,
        { provide: LocationStrategy, useClass: PathLocationStrategy },
        { provide: UrlSerializer, useClass: DefaultUrlSerializer },
        {
            provide: Router,
            useFactory: setupRouter,
            deps: [
                ApplicationRef, ComponentResolver, UrlSerializer, RouterOutletMap, Location, Injector,
                AppModuleFactoryLoader, ROUTES, ROUTER_CONFIGURATION
            ]
        },
        RouterOutletMap,
        { provide: ActivatedRoute, useFactory: (r) => r.routerState.root, deps: [Router] },
        // Trigger initial navigation
        { provide: APP_INITIALIZER, multi: true, useFactory: setupRouterInitializer, deps: [Injector] },
        { provide: AppModuleFactoryLoader, useClass: SystemJsAppModuleLoader }
    ];
}
/**
 * Router configuration.
 *
 * ### Example
 *
 * ```
 * @AppModule({providers: [
 *   provideRoutes([{path: 'home', component: Home}])
 * ]})
 * class LazyLoadedModule {
 *   // ...
 * }
 * ```
 *
 * @experimental
 */
export function provideRoutes(routes) {
    return { provide: ROUTES, useValue: routes };
}
/**
 * Router configuration.
 *
 * ### Example
 *
 * ```
 * @AppModule({providers: [
 *   provideRouterOptions({enableTracing: true})
 * ]})
 * class LazyLoadedModule {
 *   // ...
 * }
 * ```
 *
 * @experimental
 */
export function provideRouterConfig(config) {
    return { provide: ROUTER_CONFIGURATION, useValue: config };
}
//# sourceMappingURL=common_router_providers.js.map