/**
 * @license Angular v4.0.0-rc.3-b00fe20
 * (c) 2010-2017 Google, Inc. https://angular.io/
 * License: MIT
 */ import { Location, LocationStrategy } from '@angular/common';
import { MockLocationStrategy, SpyLocation } from '@angular/common/testing';
import { Injectable, Compiler, Optional, Injector, NgModuleFactoryLoader, NgModule } from '@angular/core';
import { ɵflatten, Router, provideRoutes, NoPreloading, PreloadingStrategy, UrlHandlingStrategy, ROUTES, RouterOutletMap, UrlSerializer, ɵROUTER_PROVIDERS, RouterModule } from '@angular/router';
/**
 * @whatItDoes Allows to simulate the loading of ng modules in tests.
 *
 * @howToUse
 *
 * ```
 * const loader = TestBed.get(NgModuleFactoryLoader);
 *
 * @Component({template: 'lazy-loaded'})
 * class LazyLoadedComponent {}
 * @NgModule({
 *   declarations: [LazyLoadedComponent],
 *   imports: [RouterModule.forChild([{path: 'loaded', component: LazyLoadedComponent}])]
 * })
 *
 * class LoadedModule {}
 *
 * // sets up stubbedModules
 * loader.stubbedModules = {lazyModule: LoadedModule};
 *
 * router.resetConfig([
 *   {path: 'lazy', loadChildren: 'lazyModule'},
 * ]);
 *
 * router.navigateByUrl('/lazy/loaded');
 * ```
 *
 * @stable
 */
var SpyNgModuleFactoryLoader = (function () {
    function SpyNgModuleFactoryLoader(compiler) {
        this.compiler = compiler;
        /**
         * @docsNotRequired
         */
        this._stubbedModules = {};
    }
    Object.defineProperty(SpyNgModuleFactoryLoader.prototype, "stubbedModules", {
        /**
         * @docsNotRequired
         */
        get: function () { return this._stubbedModules; },
        /**
         * @docsNotRequired
         */
        set: function (modules) {
            var res = {};
            for (var _i = 0, _a = Object.keys(modules); _i < _a.length; _i++) {
                var t = _a[_i];
                res[t] = this.compiler.compileModuleAsync(modules[t]);
            }
            this._stubbedModules = res;
        },
        enumerable: true,
        configurable: true
    });
    SpyNgModuleFactoryLoader.prototype.load = function (path) {
        if (this._stubbedModules[path]) {
            return this._stubbedModules[path];
        }
        else {
            return Promise.reject(new Error("Cannot find module " + path));
        }
    };
    return SpyNgModuleFactoryLoader;
}());
SpyNgModuleFactoryLoader.decorators = [
    { type: Injectable },
];
/** @nocollapse */
SpyNgModuleFactoryLoader.ctorParameters = function () { return [
    { type: Compiler, },
]; };
/**
 * Router setup factory function used for testing.
 *
 * @stable
 */
function setupTestingRouter(urlSerializer, outletMap, location, loader, compiler, injector, routes, urlHandlingStrategy) {
    var router = new Router(null, urlSerializer, outletMap, location, injector, loader, compiler, ɵflatten(routes));
    if (urlHandlingStrategy) {
        router.urlHandlingStrategy = urlHandlingStrategy;
    }
    return router;
}
/**
 * @whatItDoes Sets up the router to be used for testing.
 *
 * @howToUse
 *
 * ```
 * beforeEach(() => {
 *   TestBed.configureTestModule({
 *     imports: [
 *       RouterTestingModule.withRoutes(
 *         [{path: '', component: BlankCmp}, {path: 'simple', component: SimpleCmp}])]
 *       )
 *     ]
 *   });
 * });
 * ```
 *
 * @description
 *
 * The modules sets up the router to be used for testing.
 * It provides spy implementations of {@link Location}, {@link LocationStrategy}, and {@link
 * NgModuleFactoryLoader}.
 *
 * @stable
 */
var RouterTestingModule = (function () {
    function RouterTestingModule() {
    }
    RouterTestingModule.withRoutes = function (routes) {
        return { ngModule: RouterTestingModule, providers: [provideRoutes(routes)] };
    };
    return RouterTestingModule;
}());
RouterTestingModule.decorators = [
    { type: NgModule, args: [{
                exports: [RouterModule],
                providers: [
                    ɵROUTER_PROVIDERS, { provide: Location, useClass: SpyLocation },
                    { provide: LocationStrategy, useClass: MockLocationStrategy },
                    { provide: NgModuleFactoryLoader, useClass: SpyNgModuleFactoryLoader }, {
                        provide: Router,
                        useFactory: setupTestingRouter,
                        deps: [
                            UrlSerializer, RouterOutletMap, Location, NgModuleFactoryLoader, Compiler, Injector, ROUTES,
                            [UrlHandlingStrategy, new Optional()]
                        ]
                    },
                    { provide: PreloadingStrategy, useExisting: NoPreloading }, provideRoutes([])
                ]
            },] },
];
/** @nocollapse */
RouterTestingModule.ctorParameters = function () { return []; };
export { SpyNgModuleFactoryLoader, setupTestingRouter, RouterTestingModule };
