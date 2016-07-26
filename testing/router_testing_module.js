/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
"use strict";
var common_1 = require('@angular/common');
var testing_1 = require('@angular/common/testing');
var core_1 = require('@angular/core');
var index_1 = require('../index');
var router_config_loader_1 = require('../src/router_config_loader');
var router_module_1 = require('../src/router_module');
var SpyAppModuleFactoryLoader = (function () {
    function SpyAppModuleFactoryLoader(compiler) {
        this.compiler = compiler;
        this.stubbedModules = {};
    }
    SpyAppModuleFactoryLoader.prototype.load = function (path) {
        if (this.stubbedModules[path]) {
            return this.compiler.compileAppModuleAsync(this.stubbedModules[path]);
        }
        else {
            return Promise.reject(new Error("Cannot find module " + path));
        }
    };
    /** @nocollapse */
    SpyAppModuleFactoryLoader.decorators = [
        { type: core_1.Injectable },
    ];
    /** @nocollapse */
    SpyAppModuleFactoryLoader.ctorParameters = [
        { type: core_1.Compiler, },
    ];
    return SpyAppModuleFactoryLoader;
}());
exports.SpyAppModuleFactoryLoader = SpyAppModuleFactoryLoader;
function setupTestingRouter(resolver, urlSerializer, outletMap, location, loader, injector, routes) {
    return new index_1.Router(null, resolver, urlSerializer, outletMap, location, injector, loader, routes);
}
var RouterTestingModule = (function () {
    function RouterTestingModule() {
    }
    /** @nocollapse */
    RouterTestingModule.decorators = [
        { type: core_1.AppModule, args: [{
                    directives: router_module_1.ROUTER_DIRECTIVES,
                    providers: [
                        router_module_1.ROUTER_PROVIDERS,
                        { provide: common_1.Location, useClass: testing_1.SpyLocation },
                        { provide: common_1.LocationStrategy, useClass: testing_1.MockLocationStrategy },
                        { provide: core_1.AppModuleFactoryLoader, useClass: SpyAppModuleFactoryLoader },
                        {
                            provide: index_1.Router,
                            useFactory: setupTestingRouter,
                            deps: [
                                core_1.ComponentResolver, index_1.UrlSerializer, index_1.RouterOutletMap, common_1.Location, core_1.AppModuleFactoryLoader,
                                core_1.Injector, router_config_loader_1.ROUTES
                            ]
                        },
                    ]
                },] },
    ];
    return RouterTestingModule;
}());
exports.RouterTestingModule = RouterTestingModule;
//# sourceMappingURL=router_testing_module.js.map