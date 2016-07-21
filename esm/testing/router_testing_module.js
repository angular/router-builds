/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location, LocationStrategy } from '@angular/common';
import { MockLocationStrategy, SpyLocation } from '@angular/common/testing';
import { AppModule, AppModuleFactoryLoader, Compiler, ComponentResolver, Injectable, Injector } from '@angular/core';
import { Router, RouterOutletMap, UrlSerializer } from '../index';
import { ROUTES } from '../src/router_config_loader';
import { ROUTER_DIRECTIVES, ROUTER_PROVIDERS } from '../src/router_module';
export class SpyAppModuleFactoryLoader {
    constructor(compiler) {
        this.compiler = compiler;
        this.stubbedModules = {};
    }
    load(path) {
        if (this.stubbedModules[path]) {
            return this.compiler.compileAppModuleAsync(this.stubbedModules[path]);
        }
        else {
            return Promise.reject(new Error(`Cannot find module ${path}`));
        }
    }
}
/** @nocollapse */
SpyAppModuleFactoryLoader.decorators = [
    { type: Injectable },
];
/** @nocollapse */
SpyAppModuleFactoryLoader.ctorParameters = [
    { type: Compiler, },
];
export class RouterTestingModule {
}
/** @nocollapse */
RouterTestingModule.decorators = [
    { type: AppModule, args: [{
                directives: ROUTER_DIRECTIVES,
                providers: [
                    ROUTER_PROVIDERS,
                    { provide: Location, useClass: SpyLocation },
                    { provide: LocationStrategy, useClass: MockLocationStrategy },
                    { provide: AppModuleFactoryLoader, useClass: SpyAppModuleFactoryLoader },
                    {
                        provide: Router,
                        useFactory: (resolver, urlSerializer, outletMap, location, loader, injector, routes) => {
                            return new Router(null, resolver, urlSerializer, outletMap, location, injector, loader, routes);
                        },
                        deps: [
                            ComponentResolver, UrlSerializer, RouterOutletMap, Location, AppModuleFactoryLoader,
                            Injector, ROUTES
                        ]
                    },
                ]
            },] },
];
//# sourceMappingURL=router_testing_module.js.map