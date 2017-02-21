/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { InjectionToken, NgModuleFactory } from '@angular/core';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { of } from 'rxjs/observable/of';
import { map } from 'rxjs/operator/map';
import { mergeMap } from 'rxjs/operator/mergeMap';
import { flatten, wrapIntoObservable } from './utils/collection';
/**
 * @docsNotRequired
 * @experimental
 */
export var /** @type {?} */ ROUTES = new InjectionToken('ROUTES');
var LoadedRouterConfig = (function () {
    /**
     * @param {?} routes
     * @param {?} injector
     * @param {?} factoryResolver
     * @param {?} injectorFactory
     */
    function LoadedRouterConfig(routes, injector, factoryResolver, injectorFactory) {
        this.routes = routes;
        this.injector = injector;
        this.factoryResolver = factoryResolver;
        this.injectorFactory = injectorFactory;
    }
    return LoadedRouterConfig;
}());
export { LoadedRouterConfig };
function LoadedRouterConfig_tsickle_Closure_declarations() {
    /** @type {?} */
    LoadedRouterConfig.prototype.routes;
    /** @type {?} */
    LoadedRouterConfig.prototype.injector;
    /** @type {?} */
    LoadedRouterConfig.prototype.factoryResolver;
    /** @type {?} */
    LoadedRouterConfig.prototype.injectorFactory;
}
var RouterConfigLoader = (function () {
    /**
     * @param {?} loader
     * @param {?} compiler
     * @param {?=} onLoadStartListener
     * @param {?=} onLoadEndListener
     */
    function RouterConfigLoader(loader, compiler, onLoadStartListener, onLoadEndListener) {
        this.loader = loader;
        this.compiler = compiler;
        this.onLoadStartListener = onLoadStartListener;
        this.onLoadEndListener = onLoadEndListener;
    }
    /**
     * @param {?} parentInjector
     * @param {?} route
     * @return {?}
     */
    RouterConfigLoader.prototype.load = function (parentInjector, route) {
        var _this = this;
        if (this.onLoadStartListener) {
            this.onLoadStartListener(route);
        }
        var /** @type {?} */ moduleFactory$ = this.loadModuleFactory(route.loadChildren);
        return map.call(moduleFactory$, function (factory) {
            if (_this.onLoadEndListener) {
                _this.onLoadEndListener(route);
            }
            var /** @type {?} */ module = factory.create(parentInjector);
            var /** @type {?} */ injectorFactory = function (parent) { return factory.create(parent).injector; };
            return new LoadedRouterConfig(flatten(module.injector.get(ROUTES)), module.injector, module.componentFactoryResolver, injectorFactory);
        });
    };
    /**
     * @param {?} loadChildren
     * @return {?}
     */
    RouterConfigLoader.prototype.loadModuleFactory = function (loadChildren) {
        var _this = this;
        if (typeof loadChildren === 'string') {
            return fromPromise(this.loader.load(loadChildren));
        }
        else {
            return mergeMap.call(wrapIntoObservable(loadChildren()), function (t) {
                if (t instanceof NgModuleFactory) {
                    return of(t);
                }
                else {
                    return fromPromise(_this.compiler.compileModuleAsync(t));
                }
            });
        }
    };
    return RouterConfigLoader;
}());
export { RouterConfigLoader };
function RouterConfigLoader_tsickle_Closure_declarations() {
    /** @type {?} */
    RouterConfigLoader.prototype.loader;
    /** @type {?} */
    RouterConfigLoader.prototype.compiler;
    /** @type {?} */
    RouterConfigLoader.prototype.onLoadStartListener;
    /** @type {?} */
    RouterConfigLoader.prototype.onLoadEndListener;
}
//# sourceMappingURL=router_config_loader.js.map