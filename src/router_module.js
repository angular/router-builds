/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
"use strict";
var common_1 = require('@angular/common');
var core_1 = require('@angular/core');
var common_router_providers_1 = require('./common_router_providers');
var router_link_1 = require('./directives/router_link');
var router_link_active_1 = require('./directives/router_link_active');
var router_outlet_1 = require('./directives/router_outlet');
var router_1 = require('./router');
var router_config_loader_1 = require('./router_config_loader');
var router_outlet_map_1 = require('./router_outlet_map');
var router_state_1 = require('./router_state');
var url_tree_1 = require('./url_tree');
/**
 * @stable
 */
exports.ROUTER_DIRECTIVES = [router_outlet_1.RouterOutlet, router_link_1.RouterLink, router_link_1.RouterLinkWithHref, router_link_active_1.RouterLinkActive];
exports.ROUTER_PROVIDERS = [
    common_1.Location, { provide: common_1.LocationStrategy, useClass: common_1.PathLocationStrategy },
    { provide: url_tree_1.UrlSerializer, useClass: url_tree_1.DefaultUrlSerializer }, {
        provide: router_1.Router,
        useFactory: common_router_providers_1.setupRouter,
        deps: [
            core_1.ApplicationRef, core_1.ComponentResolver, url_tree_1.UrlSerializer, router_outlet_map_1.RouterOutletMap, common_1.Location, core_1.Injector,
            core_1.AppModuleFactoryLoader, router_config_loader_1.ROUTES, common_router_providers_1.ROUTER_CONFIGURATION
        ]
    },
    router_outlet_map_1.RouterOutletMap, { provide: router_state_1.ActivatedRoute, useFactory: common_router_providers_1.rootRoute, deps: [router_1.Router] },
    { provide: core_1.AppModuleFactoryLoader, useClass: core_1.SystemJsAppModuleLoader },
    { provide: common_router_providers_1.ROUTER_CONFIGURATION, useValue: { enableTracing: false } }
];
var RouterModule = (function () {
    function RouterModule(injector) {
        this.injector = injector;
        setTimeout(function () {
            var appRef = injector.get(core_1.ApplicationRef);
            if (appRef.componentTypes.length == 0) {
                appRef.registerBootstrapListener(function () { injector.get(router_1.Router).initialNavigation(); });
            }
            else {
                injector.get(router_1.Router).initialNavigation();
            }
        }, 0);
    }
    /** @nocollapse */
    RouterModule.decorators = [
        { type: core_1.AppModule, args: [{ directives: exports.ROUTER_DIRECTIVES, providers: exports.ROUTER_PROVIDERS },] },
    ];
    /** @nocollapse */
    RouterModule.ctorParameters = [
        { type: core_1.Injector, },
    ];
    return RouterModule;
}());
exports.RouterModule = RouterModule;
//# sourceMappingURL=router_module.js.map