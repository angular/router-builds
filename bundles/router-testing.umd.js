/**
 * @license Angular v11.0.0-next.3+72.sha-06525cf
 * (c) 2010-2020 Google LLC. https://angular.io/
 * License: MIT
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/common'), require('@angular/common/testing'), require('@angular/core'), require('@angular/router')) :
    typeof define === 'function' && define.amd ? define('@angular/router/testing', ['exports', '@angular/common', '@angular/common/testing', '@angular/core', '@angular/router'], factory) :
    (global = global || self, factory((global.ng = global.ng || {}, global.ng.router = global.ng.router || {}, global.ng.router.testing = {}), global.ng.common, global.ng.common.testing, global.ng.core, global.ng.router));
}(this, (function (exports, common, testing, i0, router) { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b)
                if (b.hasOwnProperty(p))
                    d[p] = b[p]; };
        return extendStatics(d, b);
    };
    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }
    var __assign = function () {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s)
                    if (Object.prototype.hasOwnProperty.call(s, p))
                        t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };
    function __rest(s, e) {
        var t = {};
        for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
                t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }
    function __decorate(decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
            r = Reflect.decorate(decorators, target, key, desc);
        else
            for (var i = decorators.length - 1; i >= 0; i--)
                if (d = decorators[i])
                    r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    }
    function __param(paramIndex, decorator) {
        return function (target, key) { decorator(target, key, paramIndex); };
    }
    function __metadata(metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
            return Reflect.metadata(metadataKey, metadataValue);
    }
    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try {
                step(generator.next(value));
            }
            catch (e) {
                reject(e);
            } }
            function rejected(value) { try {
                step(generator["throw"](value));
            }
            catch (e) {
                reject(e);
            } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }
    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function () { if (t[0] & 1)
                throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function () { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f)
                throw new TypeError("Generator is already executing.");
            while (_)
                try {
                    if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                        return t;
                    if (y = 0, t)
                        op = [op[0] & 2, t.value];
                    switch (op[0]) {
                        case 0:
                        case 1:
                            t = op;
                            break;
                        case 4:
                            _.label++;
                            return { value: op[1], done: false };
                        case 5:
                            _.label++;
                            y = op[1];
                            op = [0];
                            continue;
                        case 7:
                            op = _.ops.pop();
                            _.trys.pop();
                            continue;
                        default:
                            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                                _ = 0;
                                continue;
                            }
                            if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                                _.label = op[1];
                                break;
                            }
                            if (op[0] === 6 && _.label < t[1]) {
                                _.label = t[1];
                                t = op;
                                break;
                            }
                            if (t && _.label < t[2]) {
                                _.label = t[2];
                                _.ops.push(op);
                                break;
                            }
                            if (t[2])
                                _.ops.pop();
                            _.trys.pop();
                            continue;
                    }
                    op = body.call(thisArg, _);
                }
                catch (e) {
                    op = [6, e];
                    y = 0;
                }
                finally {
                    f = t = 0;
                }
            if (op[0] & 5)
                throw op[1];
            return { value: op[0] ? op[1] : void 0, done: true };
        }
    }
    var __createBinding = Object.create ? (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        Object.defineProperty(o, k2, { enumerable: true, get: function () { return m[k]; } });
    }) : (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        o[k2] = m[k];
    });
    function __exportStar(m, exports) {
        for (var p in m)
            if (p !== "default" && !exports.hasOwnProperty(p))
                __createBinding(exports, m, p);
    }
    function __values(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m)
            return m.call(o);
        if (o && typeof o.length === "number")
            return {
                next: function () {
                    if (o && i >= o.length)
                        o = void 0;
                    return { value: o && o[i++], done: !o };
                }
            };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }
    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m)
            return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done)
                ar.push(r.value);
        }
        catch (error) {
            e = { error: error };
        }
        finally {
            try {
                if (r && !r.done && (m = i["return"]))
                    m.call(i);
            }
            finally {
                if (e)
                    throw e.error;
            }
        }
        return ar;
    }
    function __spread() {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    }
    function __spreadArrays() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++)
            s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    }
    ;
    function __await(v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    }
    function __asyncGenerator(thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator)
            throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
        function verb(n) { if (g[n])
            i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
        function resume(n, v) { try {
            step(g[n](v));
        }
        catch (e) {
            settle(q[0][3], e);
        } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length)
            resume(q[0][0], q[0][1]); }
    }
    function __asyncDelegator(o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
        function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
    }
    function __asyncValues(o) {
        if (!Symbol.asyncIterator)
            throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function (v) { resolve({ value: v, done: d }); }, reject); }
    }
    function __makeTemplateObject(cooked, raw) {
        if (Object.defineProperty) {
            Object.defineProperty(cooked, "raw", { value: raw });
        }
        else {
            cooked.raw = raw;
        }
        return cooked;
    }
    ;
    var __setModuleDefault = Object.create ? (function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function (o, v) {
        o["default"] = v;
    };
    function __importStar(mod) {
        if (mod && mod.__esModule)
            return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (Object.hasOwnProperty.call(mod, k))
                    __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    }
    function __importDefault(mod) {
        return (mod && mod.__esModule) ? mod : { default: mod };
    }
    function __classPrivateFieldGet(receiver, privateMap) {
        if (!privateMap.has(receiver)) {
            throw new TypeError("attempted to get private field on non-instance");
        }
        return privateMap.get(receiver);
    }
    function __classPrivateFieldSet(receiver, privateMap, value) {
        if (!privateMap.has(receiver)) {
            throw new TypeError("attempted to set private field on non-instance");
        }
        privateMap.set(receiver, value);
        return value;
    }

    /**
     * @description
     *
     * Allows to simulate the loading of ng modules in tests.
     *
     * ```
     * const loader = TestBed.inject(NgModuleFactoryLoader);
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
     * @publicApi
     */
    var SpyNgModuleFactoryLoader = /** @class */ (function () {
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
            get: function () {
                return this._stubbedModules;
            },
            /**
             * @docsNotRequired
             */
            set: function (modules) {
                var e_1, _a;
                var res = {};
                try {
                    for (var _b = __values(Object.keys(modules)), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var t = _c.value;
                        res[t] = this.compiler.compileModuleAsync(modules[t]);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                this._stubbedModules = res;
            },
            enumerable: false,
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
    SpyNgModuleFactoryLoader.ɵfac = function SpyNgModuleFactoryLoader_Factory(t) { return new (t || SpyNgModuleFactoryLoader)(i0.ɵɵinject(i0.Compiler)); };
    SpyNgModuleFactoryLoader.ɵprov = i0.ɵɵdefineInjectable({ token: SpyNgModuleFactoryLoader, factory: SpyNgModuleFactoryLoader.ɵfac });
    /*@__PURE__*/ (function () {
        i0.ɵsetClassMetadata(SpyNgModuleFactoryLoader, [{
                type: i0.Injectable
            }], function () { return [{ type: i0.Compiler }]; }, null);
    })();
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
    function setupTestingRouter(urlSerializer, contexts, location, loader, compiler, injector, routes, opts, urlHandlingStrategy) {
        var router$1 = new router.Router(null, urlSerializer, contexts, location, injector, loader, compiler, router.ɵflatten(routes));
        if (opts) {
            // Handle deprecated argument ordering.
            if (isUrlHandlingStrategy(opts)) {
                router$1.urlHandlingStrategy = opts;
            }
            else {
                // Handle ExtraOptions
                if (opts.malformedUriErrorHandler) {
                    router$1.malformedUriErrorHandler = opts.malformedUriErrorHandler;
                }
                if (opts.paramsInheritanceStrategy) {
                    router$1.paramsInheritanceStrategy = opts.paramsInheritanceStrategy;
                }
            }
        }
        if (urlHandlingStrategy) {
            router$1.urlHandlingStrategy = urlHandlingStrategy;
        }
        return router$1;
    }
    /**
     * @description
     *
     * Sets up the router to be used for testing.
     *
     * The modules sets up the router to be used for testing.
     * It provides spy implementations of `Location`, `LocationStrategy`, and {@link
     * NgModuleFactoryLoader}.
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
    RouterTestingModule.ɵmod = i0.ɵɵdefineNgModule({ type: RouterTestingModule });
    RouterTestingModule.ɵinj = i0.ɵɵdefineInjector({ factory: function RouterTestingModule_Factory(t) { return new (t || RouterTestingModule)(); }, providers: [
            router.ɵROUTER_PROVIDERS, { provide: common.Location, useClass: testing.SpyLocation },
            { provide: common.LocationStrategy, useClass: testing.MockLocationStrategy },
            { provide: i0.NgModuleFactoryLoader, useClass: SpyNgModuleFactoryLoader }, {
                provide: router.Router,
                useFactory: setupTestingRouter,
                deps: [
                    router.UrlSerializer, router.ChildrenOutletContexts, common.Location, i0.NgModuleFactoryLoader, i0.Compiler, i0.Injector,
                    router.ROUTES, router.ROUTER_CONFIGURATION, [router.UrlHandlingStrategy, new i0.Optional()]
                ]
            },
            { provide: router.PreloadingStrategy, useExisting: router.NoPreloading }, router.provideRoutes([])
        ], imports: [router.RouterModule] });
    (function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵɵsetNgModuleScope(RouterTestingModule, { exports: [router.RouterModule] }); })();
    /*@__PURE__*/ (function () {
        i0.ɵsetClassMetadata(RouterTestingModule, [{
                type: i0.NgModule,
                args: [{
                        exports: [router.RouterModule],
                        providers: [
                            router.ɵROUTER_PROVIDERS, { provide: common.Location, useClass: testing.SpyLocation },
                            { provide: common.LocationStrategy, useClass: testing.MockLocationStrategy },
                            { provide: i0.NgModuleFactoryLoader, useClass: SpyNgModuleFactoryLoader }, {
                                provide: router.Router,
                                useFactory: setupTestingRouter,
                                deps: [
                                    router.UrlSerializer, router.ChildrenOutletContexts, common.Location, i0.NgModuleFactoryLoader, i0.Compiler, i0.Injector,
                                    router.ROUTES, router.ROUTER_CONFIGURATION, [router.UrlHandlingStrategy, new i0.Optional()]
                                ]
                            },
                            { provide: router.PreloadingStrategy, useExisting: router.NoPreloading }, router.provideRoutes([])
                        ]
                    }]
            }], null, null);
    })();

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
    exports.SpyNgModuleFactoryLoader = SpyNgModuleFactoryLoader;
    exports.setupTestingRouter = setupTestingRouter;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=router-testing.umd.js.map
