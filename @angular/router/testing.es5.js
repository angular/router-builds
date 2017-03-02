var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

import { Location, LocationStrategy } from '@angular/common';
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

var SpyNgModuleFactoryLoader = function () {
    function SpyNgModuleFactoryLoader(compiler) {
        _classCallCheck(this, SpyNgModuleFactoryLoader);

        this.compiler = compiler;
        /**
         * @docsNotRequired
         */
        this._stubbedModules = {};
    }
    /**
     * @docsNotRequired
     */


    _createClass(SpyNgModuleFactoryLoader, [{
        key: 'load',
        value: function load(path) {
            if (this._stubbedModules[path]) {
                return this._stubbedModules[path];
            } else {
                return Promise.reject(new Error('Cannot find module ' + path));
            }
        }
    }, {
        key: 'stubbedModules',
        set: function set(modules) {
            var res = {};
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = Object.keys(modules)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var t = _step.value;

                    res[t] = this.compiler.compileModuleAsync(modules[t]);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            this._stubbedModules = res;
        }
        /**
         * @docsNotRequired
         */
        ,
        get: function get() {
            return this._stubbedModules;
        }
    }]);

    return SpyNgModuleFactoryLoader;
}();

SpyNgModuleFactoryLoader.decorators = [{ type: Injectable }];
/** @nocollapse */
SpyNgModuleFactoryLoader.ctorParameters = function () {
    return [{ type: Compiler }];
};
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

var RouterTestingModule = function () {
    function RouterTestingModule() {
        _classCallCheck(this, RouterTestingModule);
    }

    _createClass(RouterTestingModule, null, [{
        key: 'withRoutes',
        value: function withRoutes(routes) {
            return { ngModule: RouterTestingModule, providers: [provideRoutes(routes)] };
        }
    }]);

    return RouterTestingModule;
}();

RouterTestingModule.decorators = [{ type: NgModule, args: [{
        exports: [RouterModule],
        providers: [ɵROUTER_PROVIDERS, { provide: Location, useClass: SpyLocation }, { provide: LocationStrategy, useClass: MockLocationStrategy }, { provide: NgModuleFactoryLoader, useClass: SpyNgModuleFactoryLoader }, {
            provide: Router,
            useFactory: setupTestingRouter,
            deps: [UrlSerializer, RouterOutletMap, Location, NgModuleFactoryLoader, Compiler, Injector, ROUTES, [UrlHandlingStrategy, new Optional()]]
        }, { provide: PreloadingStrategy, useExisting: NoPreloading }, provideRoutes([])]
    }] }];
/** @nocollapse */
RouterTestingModule.ctorParameters = function () {
    return [];
};

export { SpyNgModuleFactoryLoader, setupTestingRouter, RouterTestingModule };
