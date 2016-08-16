/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
"use strict";
var core_1 = require('@angular/core');
var fromPromise_1 = require('rxjs/observable/fromPromise');
var of_1 = require('rxjs/observable/of');
var collection_1 = require('./utils/collection');
exports.ROUTES = new core_1.OpaqueToken('ROUTES');
var LoadedRouterConfig = (function () {
    function LoadedRouterConfig(routes, injector, factoryResolver) {
        this.routes = routes;
        this.injector = injector;
        this.factoryResolver = factoryResolver;
    }
    return LoadedRouterConfig;
}());
exports.LoadedRouterConfig = LoadedRouterConfig;
var RouterConfigLoader = (function () {
    function RouterConfigLoader(loader, compiler) {
        this.loader = loader;
        this.compiler = compiler;
    }
    RouterConfigLoader.prototype.load = function (parentInjector, loadChildren) {
        return this.loadModuleFactory(loadChildren).map(function (r) {
            var ref = r.create(parentInjector);
            return new LoadedRouterConfig(collection_1.flatten(ref.injector.get(exports.ROUTES)), ref.injector, ref.componentFactoryResolver);
        });
    };
    RouterConfigLoader.prototype.loadModuleFactory = function (loadChildren) {
        var _this = this;
        if (typeof loadChildren === 'string') {
            return fromPromise_1.fromPromise(this.loader.load(loadChildren));
        }
        else {
            var offlineMode_1 = this.compiler instanceof core_1.Compiler;
            return collection_1.wrapIntoObservable(loadChildren())
                .mergeMap(function (t) { return offlineMode_1 ? of_1.of(t) : fromPromise_1.fromPromise(_this.compiler.compileModuleAsync(t)); });
        }
    };
    return RouterConfigLoader;
}());
exports.RouterConfigLoader = RouterConfigLoader;
//# sourceMappingURL=router_config_loader.js.map