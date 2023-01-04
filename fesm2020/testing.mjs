/**
 * @license Angular v15.1.0-next.3+sha-a532d71
 * (c) 2010-2022 Google LLC. https://angular.io/
 * License: MIT
 */

import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import * as i0 from '@angular/core';
import { inject, Compiler, Injector, NgModule } from '@angular/core';
import { UrlSerializer, ChildrenOutletContexts, ROUTES, UrlHandlingStrategy, ROUTER_CONFIGURATION, RouteReuseStrategy, TitleStrategy, Router, RouterModule, ɵROUTER_PROVIDERS, ɵwithPreloading, NoPreloading } from '@angular/router';

// This file exists to easily patch the SpyNgModuleFactoryLoader into g3
const EXTRA_ROUTER_TESTING_PROVIDERS = [];

function isUrlHandlingStrategy(opts) {
    // This property check is needed because UrlHandlingStrategy is an interface and doesn't exist at
    // runtime.
    return 'shouldProcessUrl' in opts;
}
function throwInvalidConfigError(parameter) {
    throw new Error(`Parameter ${parameter} does not match the one available in the injector. ` +
        '`setupTestingRouter` is meant to be used as a factory function with dependencies coming from DI.');
}
/**
 * Router setup factory function used for testing.
 *
 * @publicApi
 * @deprecated Use `provideRouter` or `RouterTestingModule` instead.
 */
function setupTestingRouter(urlSerializer, contexts, location, compiler, injector, routes, opts, urlHandlingStrategy, routeReuseStrategy, titleStrategy) {
    // Note: The checks below are to detect misconfigured providers and invalid uses of
    // `setupTestingRouter`. This function is not used internally (neither in router code or anywhere
    // in g3). It appears this function was exposed as publicApi by mistake and should not be used
    // externally either. However, if it is, the documented intent is to be used as a factory function
    // and parameter values should always match what's available in DI.
    if (urlSerializer !== inject(UrlSerializer)) {
        throwInvalidConfigError('urlSerializer');
    }
    if (contexts !== inject(ChildrenOutletContexts)) {
        throwInvalidConfigError('contexts');
    }
    if (location !== inject(Location)) {
        throwInvalidConfigError('location');
    }
    if (compiler !== inject(Compiler)) {
        throwInvalidConfigError('compiler');
    }
    if (injector !== inject(Injector)) {
        throwInvalidConfigError('injector');
    }
    if (routes !== inject(ROUTES)) {
        throwInvalidConfigError('routes');
    }
    if (opts) {
        // Handle deprecated argument ordering.
        if (isUrlHandlingStrategy(opts)) {
            if (opts !== inject(UrlHandlingStrategy)) {
                throwInvalidConfigError('opts (UrlHandlingStrategy)');
            }
        }
        else {
            if (opts !== inject(ROUTER_CONFIGURATION)) {
                throwInvalidConfigError('opts (ROUTER_CONFIGURATION)');
            }
        }
    }
    if (urlHandlingStrategy !== inject(UrlHandlingStrategy)) {
        throwInvalidConfigError('urlHandlingStrategy');
    }
    if (routeReuseStrategy !== inject(RouteReuseStrategy)) {
        throwInvalidConfigError('routeReuseStrategy');
    }
    if (titleStrategy !== inject(TitleStrategy)) {
        throwInvalidConfigError('titleStrategy');
    }
    return new Router();
}
/**
 * @description
 *
 * Sets up the router to be used for testing.
 *
 * The modules sets up the router to be used for testing.
 * It provides spy implementations of `Location` and `LocationStrategy`.
 *
 * @usageNotes
 * ### Example
 *
 * ```
 * beforeEach(() => {
 *   TestBed.configureTestingModule({
 *     imports: [
 *       RouterTestingModule.withRoutes(
 *         [{path: '', component: BlankCmp}, {path: 'simple', component: SimpleCmp}]
 *       )
 *     ]
 *   });
 * });
 * ```
 *
 * @publicApi
 */
class RouterTestingModule {
    static withRoutes(routes, config) {
        return {
            ngModule: RouterTestingModule,
            providers: [
                { provide: ROUTES, multi: true, useValue: routes },
                { provide: ROUTER_CONFIGURATION, useValue: config ? config : {} },
            ]
        };
    }
}
RouterTestingModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.1.0-next.3+sha-a532d71", ngImport: i0, type: RouterTestingModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
RouterTestingModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.1.0-next.3+sha-a532d71", ngImport: i0, type: RouterTestingModule, exports: [RouterModule] });
RouterTestingModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.1.0-next.3+sha-a532d71", ngImport: i0, type: RouterTestingModule, providers: [
        ɵROUTER_PROVIDERS,
        EXTRA_ROUTER_TESTING_PROVIDERS,
        provideLocationMocks(),
        ɵwithPreloading(NoPreloading).ɵproviders,
        { provide: ROUTES, multi: true, useValue: [] },
    ], imports: [RouterModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.1.0-next.3+sha-a532d71", ngImport: i0, type: RouterTestingModule, decorators: [{
            type: NgModule,
            args: [{
                    exports: [RouterModule],
                    providers: [
                        ɵROUTER_PROVIDERS,
                        EXTRA_ROUTER_TESTING_PROVIDERS,
                        provideLocationMocks(),
                        ɵwithPreloading(NoPreloading).ɵproviders,
                        { provide: ROUTES, multi: true, useValue: [] },
                    ]
                }]
        }] });

// This file exists for easily patching SpyNgModuleFactoryLoader in g3
var spy_ng_module_factory_loader = {};

/**
 * @module
 * @description
 * Entry point for all public APIs of the router/testing package.
 */

/**
 * @module
 * @description
 * Entry point for all public APIs of this package.
 */
// This file only reexports content of the `src` folder. Keep it that way.

// This file is not used to build this module. It is only used during editing

/**
 * Generated bundle index. Do not edit.
 */

export { RouterTestingModule, setupTestingRouter };
//# sourceMappingURL=testing.mjs.map
