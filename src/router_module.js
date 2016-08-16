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
var router_link_1 = require('./directives/router_link');
var router_link_active_1 = require('./directives/router_link_active');
var router_outlet_1 = require('./directives/router_outlet');
var router_1 = require('./router');
var router_config_loader_1 = require('./router_config_loader');
var router_outlet_map_1 = require('./router_outlet_map');
var router_state_1 = require('./router_state');
var url_tree_1 = require('./url_tree');
var collection_1 = require('./utils/collection');
/**
 * @stable
 */
exports.ROUTER_DIRECTIVES = [router_outlet_1.RouterOutlet, router_link_1.RouterLink, router_link_1.RouterLinkWithHref, router_link_active_1.RouterLinkActive];
/**
 * @stable
 */
exports.ROUTER_CONFIGURATION = new core_1.OpaqueToken('ROUTER_CONFIGURATION');
var pathLocationStrategy = {
    provide: common_1.LocationStrategy,
    useClass: common_1.PathLocationStrategy
};
var hashLocationStrategy = {
    provide: common_1.LocationStrategy,
    useClass: common_1.HashLocationStrategy
};
exports.ROUTER_PROVIDERS = [
    common_1.Location, { provide: url_tree_1.UrlSerializer, useClass: url_tree_1.DefaultUrlSerializer }, {
        provide: router_1.Router,
        useFactory: setupRouter,
        deps: [
            core_1.ApplicationRef, url_tree_1.UrlSerializer, router_outlet_map_1.RouterOutletMap, common_1.Location, core_1.Injector, core_1.NgModuleFactoryLoader,
            core_1.Compiler, router_config_loader_1.ROUTES, exports.ROUTER_CONFIGURATION
        ]
    },
    router_outlet_map_1.RouterOutletMap, { provide: router_state_1.ActivatedRoute, useFactory: rootRoute, deps: [router_1.Router] },
    { provide: core_1.NgModuleFactoryLoader, useClass: core_1.SystemJsNgModuleLoader },
    { provide: exports.ROUTER_CONFIGURATION, useValue: { enableTracing: false } }
];
var RouterModule = (function () {
    function RouterModule() {
    }
    RouterModule.forRoot = function (routes, config) {
        return {
            ngModule: RouterModule,
            providers: [
                exports.ROUTER_PROVIDERS, provideRoutes(routes),
                { provide: exports.ROUTER_CONFIGURATION, useValue: config ? config : {} }, {
                    provide: common_1.LocationStrategy,
                    useFactory: provideLocationStrategy,
                    deps: [
                        common_1.PlatformLocation, [new core_1.Inject(common_1.APP_BASE_HREF), new core_1.Optional()], exports.ROUTER_CONFIGURATION
                    ]
                },
                provideRouterInitializer()
            ]
        };
    };
    RouterModule.forChild = function (routes) {
        return { ngModule: RouterModule, providers: [provideRoutes(routes)] };
    };
    /** @nocollapse */
    RouterModule.decorators = [
        { type: core_1.NgModule, args: [{ declarations: exports.ROUTER_DIRECTIVES, exports: exports.ROUTER_DIRECTIVES },] },
    ];
    return RouterModule;
}());
exports.RouterModule = RouterModule;
function provideLocationStrategy(platformLocationStrategy, baseHref, options) {
    if (options === void 0) { options = {}; }
    return options.useHash ? new common_1.HashLocationStrategy(platformLocationStrategy, baseHref) :
        new common_1.PathLocationStrategy(platformLocationStrategy, baseHref);
}
exports.provideLocationStrategy = provideLocationStrategy;
/**
 * @stable
 */
function provideRoutes(routes) {
    return [
        { provide: core_1.ANALYZE_FOR_ENTRY_COMPONENTS, multi: true, useValue: routes },
        { provide: router_config_loader_1.ROUTES, multi: true, useValue: routes }
    ];
}
exports.provideRoutes = provideRoutes;
function setupRouter(ref, urlSerializer, outletMap, location, injector, loader, compiler, config, opts) {
    if (opts === void 0) { opts = {}; }
    if (ref.componentTypes.length == 0) {
        throw new Error('Bootstrap at least one component before injecting Router.');
    }
    var componentType = ref.componentTypes[0];
    var r = new router_1.Router(componentType, urlSerializer, outletMap, location, injector, loader, compiler, collection_1.flatten(config));
    if (opts.enableTracing) {
        r.events.subscribe(function (e) {
            console.group("Router Event: " + e.constructor.name);
            console.log(e.toString());
            console.log(e);
            console.groupEnd();
        });
    }
    return r;
}
exports.setupRouter = setupRouter;
function rootRoute(router) {
    return router.routerState.root;
}
exports.rootRoute = rootRoute;
function initialRouterNavigation(router) {
    return function () { router.initialNavigation(); };
}
exports.initialRouterNavigation = initialRouterNavigation;
function provideRouterInitializer() {
    return {
        provide: core_1.APP_BOOTSTRAP_LISTENER,
        multi: true,
        useFactory: initialRouterNavigation,
        deps: [router_1.Router]
    };
}
exports.provideRouterInitializer = provideRouterInitializer;
//# sourceMappingURL=router_module.js.map