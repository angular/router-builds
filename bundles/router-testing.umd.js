/**
 * @license Angular v13.0.0-next.9+1.sha-6e7454d.with-local-changes
 * (c) 2010-2021 Google LLC. https://angular.io/
 * License: MIT
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/common'), require('@angular/common/testing'), require('@angular/core'), require('@angular/router')) :
    typeof define === 'function' && define.amd ? define('@angular/router/testing', ['exports', '@angular/common', '@angular/common/testing', '@angular/core', '@angular/router'], factory) :
    (global = global || self, factory((global.ng = global.ng || {}, global.ng.router = global.ng.router || {}, global.ng.router.testing = {}), global.ng.common, global.ng.common.testing, global.ng.core, global.ng.router));
}(this, (function (exports, common, testing, i0, router) { 'use strict';

    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    function isUrlHandlingStrategy(opts) {
        // This property check is needed because UrlHandlingStrategy is an interface and doesn't exist at
        // runtime.
        return 'shouldProcessUrl' in opts;
    }
    /**
     * Router setup factory function used for testing.
     *
     * @publicApi
     */
    function setupTestingRouter(urlSerializer, contexts, location, compiler, injector, routes, opts, urlHandlingStrategy, routeReuseStrategy) {
        var router$1 = new router.Router(null, urlSerializer, contexts, location, injector, compiler, router.ɵflatten(routes));
        if (opts) {
            // Handle deprecated argument ordering.
            if (isUrlHandlingStrategy(opts)) {
                router$1.urlHandlingStrategy = opts;
            }
            else {
                // Handle ExtraOptions
                router.ɵassignExtraOptionsToRouter(opts, router$1);
            }
        }
        if (urlHandlingStrategy) {
            router$1.urlHandlingStrategy = urlHandlingStrategy;
        }
        if (routeReuseStrategy) {
            router$1.routeReuseStrategy = routeReuseStrategy;
        }
        return router$1;
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
    var RouterTestingModule = /** @class */ (function () {
        function RouterTestingModule() {
        }
        RouterTestingModule.withRoutes = function (routes, config) {
            return {
                ngModule: RouterTestingModule,
                providers: [
                    router.provideRoutes(routes),
                    { provide: router.ROUTER_CONFIGURATION, useValue: config ? config : {} },
                ]
            };
        };
        return RouterTestingModule;
    }());
    RouterTestingModule.ɵfac = function RouterTestingModule_Factory(t) { return new (t || RouterTestingModule)(); };
    RouterTestingModule.ɵmod = /*@__PURE__*/ i0.ɵɵdefineNgModule({ type: RouterTestingModule });
    RouterTestingModule.ɵinj = /*@__PURE__*/ i0.ɵɵdefineInjector({ providers: [
            router.ɵROUTER_PROVIDERS, { provide: common.Location, useClass: testing.SpyLocation },
            { provide: common.LocationStrategy, useClass: testing.MockLocationStrategy }, {
                provide: router.Router,
                useFactory: setupTestingRouter,
                deps: [
                    router.UrlSerializer, router.ChildrenOutletContexts, common.Location, i0.Compiler, i0.Injector, router.ROUTES,
                    router.ROUTER_CONFIGURATION, [router.UrlHandlingStrategy, new i0.Optional()],
                    [router.RouteReuseStrategy, new i0.Optional()]
                ]
            },
            { provide: router.PreloadingStrategy, useExisting: router.NoPreloading }, router.provideRoutes([])
        ], imports: [router.RouterModule] });
    (function () {
        (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(RouterTestingModule, [{
                type: i0.NgModule,
                args: [{
                        exports: [router.RouterModule],
                        providers: [
                            router.ɵROUTER_PROVIDERS, { provide: common.Location, useClass: testing.SpyLocation },
                            { provide: common.LocationStrategy, useClass: testing.MockLocationStrategy }, {
                                provide: router.Router,
                                useFactory: setupTestingRouter,
                                deps: [
                                    router.UrlSerializer, router.ChildrenOutletContexts, common.Location, i0.Compiler, i0.Injector, router.ROUTES,
                                    router.ROUTER_CONFIGURATION, [router.UrlHandlingStrategy, new i0.Optional()],
                                    [router.RouteReuseStrategy, new i0.Optional()]
                                ]
                            },
                            { provide: router.PreloadingStrategy, useExisting: router.NoPreloading }, router.provideRoutes([])
                        ]
                    }]
            }], null, null);
    })();
    (function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵɵsetNgModuleScope(RouterTestingModule, { exports: [router.RouterModule] }); })();

    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */

    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    // This file only reexports content of the `src` folder. Keep it that way.

    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */

    /**
     * Generated bundle index. Do not edit.
     */

    exports.RouterTestingModule = RouterTestingModule;
    exports.setupTestingRouter = setupTestingRouter;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=router-testing.umd.js.map
