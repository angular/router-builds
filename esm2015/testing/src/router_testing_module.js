/**
 * @fileoverview added by tsickle
 * Generated from: packages/router/testing/src/router_testing_module.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Location, LocationStrategy } from '@angular/common';
import { MockLocationStrategy, SpyLocation } from '@angular/common/testing';
import { Compiler, Injectable, Injector, NgModule, NgModuleFactoryLoader, Optional } from '@angular/core';
import { ChildrenOutletContexts, NoPreloading, PreloadingStrategy, provideRoutes, Router, ROUTER_CONFIGURATION, RouterModule, ROUTES, UrlHandlingStrategy, UrlSerializer, ɵflatten as flatten, ɵROUTER_PROVIDERS as ROUTER_PROVIDERS } from '@angular/router';
import * as i0 from "@angular/core";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * \@description
 *
 * Allows to simulate the loading of ng modules in tests.
 *
 * ```
 * const loader = TestBed.inject(NgModuleFactoryLoader);
 *
 * \@Component({template: 'lazy-loaded'})
 * class LazyLoadedComponent {}
 * \@NgModule({
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
 * \@publicApi
 */
export class SpyNgModuleFactoryLoader {
    /**
     * @param {?} compiler
     */
    constructor(compiler) {
        this.compiler = compiler;
        /**
         * \@docsNotRequired
         */
        this._stubbedModules = {};
    }
    /**
     * \@docsNotRequired
     * @param {?} modules
     * @return {?}
     */
    set stubbedModules(modules) {
        /** @type {?} */
        const res = {};
        for (const t of Object.keys(modules)) {
            res[t] = this.compiler.compileModuleAsync(modules[t]);
        }
        this._stubbedModules = res;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    get stubbedModules() {
        return this._stubbedModules;
    }
    /**
     * @param {?} path
     * @return {?}
     */
    load(path) {
        if (this._stubbedModules[path]) {
            return this._stubbedModules[path];
        }
        else {
            return (/** @type {?} */ (Promise.reject(new Error(`Cannot find module ${path}`))));
        }
    }
}
SpyNgModuleFactoryLoader.decorators = [
    { type: Injectable },
];
/** @nocollapse */
SpyNgModuleFactoryLoader.ctorParameters = () => [
    { type: Compiler }
];
/** @nocollapse */ SpyNgModuleFactoryLoader.ɵfac = function SpyNgModuleFactoryLoader_Factory(t) { return new (t || SpyNgModuleFactoryLoader)(i0.ɵɵinject(i0.Compiler)); };
/** @nocollapse */ SpyNgModuleFactoryLoader.ɵprov = i0.ɵɵdefineInjectable({ token: SpyNgModuleFactoryLoader, factory: SpyNgModuleFactoryLoader.ɵfac });
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(SpyNgModuleFactoryLoader, [{
        type: Injectable
    }], function () { return [{ type: i0.Compiler }]; }, null); })();
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     * @private
     */
    SpyNgModuleFactoryLoader.prototype._stubbedModules;
    /**
     * @type {?}
     * @private
     */
    SpyNgModuleFactoryLoader.prototype.compiler;
}
/**
 * @param {?} opts
 * @return {?}
 */
function isUrlHandlingStrategy(opts) {
    // This property check is needed because UrlHandlingStrategy is an interface and doesn't exist at
    // runtime.
    return 'shouldProcessUrl' in opts;
}
/**
 * Router setup factory function used for testing.
 *
 * \@publicApi
 * @param {?} urlSerializer
 * @param {?} contexts
 * @param {?} location
 * @param {?} loader
 * @param {?} compiler
 * @param {?} injector
 * @param {?} routes
 * @param {?=} opts
 * @param {?=} urlHandlingStrategy
 * @return {?}
 */
export function setupTestingRouter(urlSerializer, contexts, location, loader, compiler, injector, routes, opts, urlHandlingStrategy) {
    /** @type {?} */
    const router = new Router((/** @type {?} */ (null)), urlSerializer, contexts, location, injector, loader, compiler, flatten(routes));
    if (opts) {
        // Handle deprecated argument ordering.
        if (isUrlHandlingStrategy(opts)) {
            router.urlHandlingStrategy = opts;
        }
        else {
            // Handle ExtraOptions
            if (opts.malformedUriErrorHandler) {
                router.malformedUriErrorHandler = opts.malformedUriErrorHandler;
            }
            if (opts.paramsInheritanceStrategy) {
                router.paramsInheritanceStrategy = opts.paramsInheritanceStrategy;
            }
        }
    }
    if (urlHandlingStrategy) {
        router.urlHandlingStrategy = urlHandlingStrategy;
    }
    return router;
}
/**
 * \@description
 *
 * Sets up the router to be used for testing.
 *
 * The modules sets up the router to be used for testing.
 * It provides spy implementations of `Location`, `LocationStrategy`, and {\@link
 * NgModuleFactoryLoader}.
 *
 * \@usageNotes
 * ### Example
 *
 * ```
 * beforeEach(() => {
 *   TestBed.configureTestModule({
 *     imports: [
 *       RouterTestingModule.withRoutes(
 *         [{path: '', component: BlankCmp}, {path: 'simple', component: SimpleCmp}]
 *       )
 *     ]
 *   });
 * });
 * ```
 *
 * \@publicApi
 */
export class RouterTestingModule {
    /**
     * @param {?} routes
     * @param {?=} config
     * @return {?}
     */
    static withRoutes(routes, config) {
        return {
            ngModule: RouterTestingModule,
            providers: [
                provideRoutes(routes),
                { provide: ROUTER_CONFIGURATION, useValue: config ? config : {} },
            ]
        };
    }
}
RouterTestingModule.decorators = [
    { type: NgModule, args: [{
                exports: [RouterModule],
                providers: [
                    ROUTER_PROVIDERS, { provide: Location, useClass: SpyLocation },
                    { provide: LocationStrategy, useClass: MockLocationStrategy },
                    { provide: NgModuleFactoryLoader, useClass: SpyNgModuleFactoryLoader }, {
                        provide: Router,
                        useFactory: setupTestingRouter,
                        deps: [
                            UrlSerializer, ChildrenOutletContexts, Location, NgModuleFactoryLoader, Compiler, Injector,
                            ROUTES, ROUTER_CONFIGURATION, [UrlHandlingStrategy, new Optional()]
                        ]
                    },
                    { provide: PreloadingStrategy, useExisting: NoPreloading }, provideRoutes([])
                ]
            },] },
];
/** @nocollapse */ RouterTestingModule.ɵmod = i0.ɵɵdefineNgModule({ type: RouterTestingModule });
/** @nocollapse */ RouterTestingModule.ɵinj = i0.ɵɵdefineInjector({ factory: function RouterTestingModule_Factory(t) { return new (t || RouterTestingModule)(); }, providers: [
        ROUTER_PROVIDERS, { provide: Location, useClass: SpyLocation },
        { provide: LocationStrategy, useClass: MockLocationStrategy },
        { provide: NgModuleFactoryLoader, useClass: SpyNgModuleFactoryLoader }, {
            provide: Router,
            useFactory: setupTestingRouter,
            deps: [
                UrlSerializer, ChildrenOutletContexts, Location, NgModuleFactoryLoader, Compiler, Injector,
                ROUTES, ROUTER_CONFIGURATION, [UrlHandlingStrategy, new Optional()]
            ]
        },
        { provide: PreloadingStrategy, useExisting: NoPreloading }, provideRoutes([])
    ], imports: [RouterModule] });
(function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵɵsetNgModuleScope(RouterTestingModule, { exports: [RouterModule] }); })();
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RouterTestingModule, [{
        type: NgModule,
        args: [{
                exports: [RouterModule],
                providers: [
                    ROUTER_PROVIDERS, { provide: Location, useClass: SpyLocation },
                    { provide: LocationStrategy, useClass: MockLocationStrategy },
                    { provide: NgModuleFactoryLoader, useClass: SpyNgModuleFactoryLoader }, {
                        provide: Router,
                        useFactory: setupTestingRouter,
                        deps: [
                            UrlSerializer, ChildrenOutletContexts, Location, NgModuleFactoryLoader, Compiler, Injector,
                            ROUTES, ROUTER_CONFIGURATION, [UrlHandlingStrategy, new Optional()]
                        ]
                    },
                    { provide: PreloadingStrategy, useExisting: NoPreloading }, provideRoutes([])
                ]
            }]
    }], null, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Rlc3RpbmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3Rlc3Rpbmcvc3JjL3JvdXRlcl90ZXN0aW5nX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQVFBLE9BQU8sRUFBQyxRQUFRLEVBQUUsZ0JBQWdCLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUMzRCxPQUFPLEVBQUMsb0JBQW9CLEVBQUUsV0FBVyxFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDMUUsT0FBTyxFQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUF1QixRQUFRLEVBQW1CLHFCQUFxQixFQUFFLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUM5SSxPQUFPLEVBQUMsc0JBQXNCLEVBQWdCLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxhQUFhLEVBQVMsTUFBTSxFQUFFLG9CQUFvQixFQUFFLFlBQVksRUFBRSxNQUFNLEVBQVUsbUJBQW1CLEVBQUUsYUFBYSxFQUFFLFFBQVEsSUFBSSxPQUFPLEVBQUUsaUJBQWlCLElBQUksZ0JBQWdCLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQ3pSLE1BQU0sT0FBTyx3QkFBd0I7Ozs7SUF3Qm5DLFlBQW9CLFFBQWtCO1FBQWxCLGFBQVEsR0FBUixRQUFRLENBQVU7Ozs7UUFwQjlCLG9CQUFlLEdBQW9ELEVBQUUsQ0FBQztJQW9CckMsQ0FBQzs7Ozs7O0lBZjFDLElBQUksY0FBYyxDQUFDLE9BQThCOztjQUN6QyxHQUFHLEdBQTBCLEVBQUU7UUFDckMsS0FBSyxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ3BDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFD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QkFDUixPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUM7Z0JBQ3ZCLFNBQVMsRUFBRTtvQkFDVCxnQkFBZ0IsRUFBRSxFQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBQztvQkFDNUQsRUFBQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFDO29CQUMzRCxFQUFDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxRQUFRLEVBQUUsd0JBQXdCLEVBQUMsRUFBRTt3QkFDcEUsT0FBTyxFQUFFLE1BQU07d0JBQ2YsVUFBVSxFQUFFLGtCQUFrQjt3QkFDOUIsSUFBSSxFQUFFOzRCQUNKLGFBQWEsRUFBRSxzQkFBc0IsRUFBRSxRQUFRLEVBQUUscUJBQXFCLEVBQUUsUUFBUSxFQUFFLFFBQVE7NEJBQzFGLE1BQU0sRUFBRSxvQkFBb0IsRUFBRSxDQUFDLG1CQUFtQixFQUFFLElBQUksUUFBUSxFQUFFLENBQUM7eUJBQ3BFO3FCQUNGO29CQUNELEVBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUMsRUFBRSxhQUFhLENBQUMsRUFBRSxDQUFDO2lCQUM1RTthQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9uLCBMb2NhdGlvblN0cmF0ZWd5fSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtNb2NrTG9jYXRpb25TdHJhdGVneSwgU3B5TG9jYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbi90ZXN0aW5nJztcbmltcG9ydCB7Q29tcGlsZXIsIEluamVjdGFibGUsIEluamVjdG9yLCBNb2R1bGVXaXRoUHJvdmlkZXJzLCBOZ01vZHVsZSwgTmdNb2R1bGVGYWN0b3J5LCBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIE9wdGlvbmFsfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0cywgRXh0cmFPcHRpb25zLCBOb1ByZWxvYWRpbmcsIFByZWxvYWRpbmdTdHJhdGVneSwgcHJvdmlkZVJvdXRlcywgUm91dGUsIFJvdXRlciwgUk9VVEVSX0NPTkZJR1VSQVRJT04sIFJvdXRlck1vZHVsZSwgUk9VVEVTLCBSb3V0ZXMsIFVybEhhbmRsaW5nU3RyYXRlZ3ksIFVybFNlcmlhbGl6ZXIsIMm1ZmxhdHRlbiBhcyBmbGF0dGVuLCDJtVJPVVRFUl9QUk9WSURFUlMgYXMgUk9VVEVSX1BST1ZJREVSU30gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcblxuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQWxsb3dzIHRvIHNpbXVsYXRlIHRoZSBsb2FkaW5nIG9mIG5nIG1vZHVsZXMgaW4gdGVzdHMuXG4gKlxuICogYGBgXG4gKiBjb25zdCBsb2FkZXIgPSBUZXN0QmVkLmluamVjdChOZ01vZHVsZUZhY3RvcnlMb2FkZXIpO1xuICpcbiAqIEBDb21wb25lbnQoe3RlbXBsYXRlOiAnbGF6eS1sb2FkZWQnfSlcbiAqIGNsYXNzIExhenlMb2FkZWRDb21wb25lbnQge31cbiAqIEBOZ01vZHVsZSh7XG4gKiAgIGRlY2xhcmF0aW9uczogW0xhenlMb2FkZWRDb21wb25lbnRdLFxuICogICBpbXBvcnRzOiBbUm91dGVyTW9kdWxlLmZvckNoaWxkKFt7cGF0aDogJ2xvYWRlZCcsIGNvbXBvbmVudDogTGF6eUxvYWRlZENvbXBvbmVudH1dKV1cbiAqIH0pXG4gKlxuICogY2xhc3MgTG9hZGVkTW9kdWxlIHt9XG4gKlxuICogLy8gc2V0cyB1cCBzdHViYmVkTW9kdWxlc1xuICogbG9hZGVyLnN0dWJiZWRNb2R1bGVzID0ge2xhenlNb2R1bGU6IExvYWRlZE1vZHVsZX07XG4gKlxuICogcm91dGVyLnJlc2V0Q29uZmlnKFtcbiAqICAge3BhdGg6ICdsYXp5JywgbG9hZENoaWxkcmVuOiAnbGF6eU1vZHVsZSd9LFxuICogXSk7XG4gKlxuICogcm91dGVyLm5hdmlnYXRlQnlVcmwoJy9sYXp5L2xvYWRlZCcpO1xuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgU3B5TmdNb2R1bGVGYWN0b3J5TG9hZGVyIGltcGxlbWVudHMgTmdNb2R1bGVGYWN0b3J5TG9hZGVyIHtcbiAgLyoqXG4gICAqIEBkb2NzTm90UmVxdWlyZWRcbiAgICovXG4gIHByaXZhdGUgX3N0dWJiZWRNb2R1bGVzOiB7W3BhdGg6IHN0cmluZ106IFByb21pc2U8TmdNb2R1bGVGYWN0b3J5PGFueT4+fSA9IHt9O1xuXG4gIC8qKlxuICAgKiBAZG9jc05vdFJlcXVpcmVkXG4gICAqL1xuICBzZXQgc3R1YmJlZE1vZHVsZXMobW9kdWxlczoge1twYXRoOiBzdHJpbmddOiBhbnl9KSB7XG4gICAgY29uc3QgcmVzOiB7W3BhdGg6IHN0cmluZ106IGFueX0gPSB7fTtcbiAgICBmb3IgKGNvbnN0IHQgb2YgT2JqZWN0LmtleXMobW9kdWxlcykpIHtcbiAgICAgIHJlc1t0XSA9IHRoaXMuY29tcGlsZXIuY29tcGlsZU1vZHVsZUFzeW5jKG1vZHVsZXNbdF0pO1xuICAgIH1cbiAgICB0aGlzLl9zdHViYmVkTW9kdWxlcyA9IHJlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBAZG9jc05vdFJlcXVpcmVkXG4gICAqL1xuICBnZXQgc3R1YmJlZE1vZHVsZXMoKToge1twYXRoOiBzdHJpbmddOiBhbnl9IHtcbiAgICByZXR1cm4gdGhpcy5fc3R1YmJlZE1vZHVsZXM7XG4gIH1cblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNvbXBpbGVyOiBDb21waWxlcikge31cblxuICBsb2FkKHBhdGg6IHN0cmluZyk6IFByb21pc2U8TmdNb2R1bGVGYWN0b3J5PGFueT4+IHtcbiAgICBpZiAodGhpcy5fc3R1YmJlZE1vZHVsZXNbcGF0aF0pIHtcbiAgICAgIHJldHVybiB0aGlzLl9zdHViYmVkTW9kdWxlc1twYXRoXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIDxhbnk+UHJvbWlzZS5yZWplY3QobmV3IEVycm9yKGBDYW5ub3QgZmluZCBtb2R1bGUgJHtwYXRofWApKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNVcmxIYW5kbGluZ1N0cmF0ZWd5KG9wdHM6IEV4dHJhT3B0aW9uc3xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBVcmxIYW5kbGluZ1N0cmF0ZWd5KTogb3B0cyBpcyBVcmxIYW5kbGluZ1N0cmF0ZWd5IHtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBjaGVjayBpcyBuZWVkZWQgYmVjYXVzZSBVcmxIYW5kbGluZ1N0cmF0ZWd5IGlzIGFuIGludGVyZmFjZSBhbmQgZG9lc24ndCBleGlzdCBhdFxuICAvLyBydW50aW1lLlxuICByZXR1cm4gJ3Nob3VsZFByb2Nlc3NVcmwnIGluIG9wdHM7XG59XG5cbi8qKlxuICogUm91dGVyIHNldHVwIGZhY3RvcnkgZnVuY3Rpb24gdXNlZCBmb3IgdGVzdGluZy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cFRlc3RpbmdSb3V0ZXIoXG4gICAgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgY29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIGxvY2F0aW9uOiBMb2NhdGlvbixcbiAgICBsb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLCBpbmplY3RvcjogSW5qZWN0b3IsIHJvdXRlczogUm91dGVbXVtdLFxuICAgIG9wdHM/OiBFeHRyYU9wdGlvbnMsIHVybEhhbmRsaW5nU3RyYXRlZ3k/OiBVcmxIYW5kbGluZ1N0cmF0ZWd5KTogUm91dGVyO1xuXG4vKipcbiAqIFJvdXRlciBzZXR1cCBmYWN0b3J5IGZ1bmN0aW9uIHVzZWQgZm9yIHRlc3RpbmcuXG4gKlxuICogQGRlcHJlY2F0ZWQgQXMgb2YgdjUuMi4gVGhlIDJuZC10by1sYXN0IGFyZ3VtZW50IHNob3VsZCBiZSBgRXh0cmFPcHRpb25zYCwgbm90XG4gKiBgVXJsSGFuZGxpbmdTdHJhdGVneWBcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwVGVzdGluZ1JvdXRlcihcbiAgICB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLCBjb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cywgbG9jYXRpb246IExvY2F0aW9uLFxuICAgIGxvYWRlcjogTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBjb21waWxlcjogQ29tcGlsZXIsIGluamVjdG9yOiBJbmplY3Rvciwgcm91dGVzOiBSb3V0ZVtdW10sXG4gICAgdXJsSGFuZGxpbmdTdHJhdGVneT86IFVybEhhbmRsaW5nU3RyYXRlZ3kpOiBSb3V0ZXI7XG5cbi8qKlxuICogUm91dGVyIHNldHVwIGZhY3RvcnkgZnVuY3Rpb24gdXNlZCBmb3IgdGVzdGluZy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cFRlc3RpbmdSb3V0ZXIoXG4gICAgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgY29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIGxvY2F0aW9uOiBMb2NhdGlvbixcbiAgICBsb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLCBpbmplY3RvcjogSW5qZWN0b3IsIHJvdXRlczogUm91dGVbXVtdLFxuICAgIG9wdHM/OiBFeHRyYU9wdGlvbnN8VXJsSGFuZGxpbmdTdHJhdGVneSwgdXJsSGFuZGxpbmdTdHJhdGVneT86IFVybEhhbmRsaW5nU3RyYXRlZ3kpIHtcbiAgY29uc3Qgcm91dGVyID0gbmV3IFJvdXRlcihcbiAgICAgIG51bGwhLCB1cmxTZXJpYWxpemVyLCBjb250ZXh0cywgbG9jYXRpb24sIGluamVjdG9yLCBsb2FkZXIsIGNvbXBpbGVyLCBmbGF0dGVuKHJvdXRlcykpO1xuICBpZiAob3B0cykge1xuICAgIC8vIEhhbmRsZSBkZXByZWNhdGVkIGFyZ3VtZW50IG9yZGVyaW5nLlxuICAgIGlmIChpc1VybEhhbmRsaW5nU3RyYXRlZ3kob3B0cykpIHtcbiAgICAgIHJvdXRlci51cmxIYW5kbGluZ1N0cmF0ZWd5ID0gb3B0cztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSGFuZGxlIEV4dHJhT3B0aW9uc1xuXG4gICAgICBpZiAob3B0cy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIpIHtcbiAgICAgICAgcm91dGVyLm1hbGZvcm1lZFVyaUVycm9ySGFuZGxlciA9IG9wdHMubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyO1xuICAgICAgfVxuXG4gICAgICBpZiAob3B0cy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5KSB7XG4gICAgICAgIHJvdXRlci5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5ID0gb3B0cy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmICh1cmxIYW5kbGluZ1N0cmF0ZWd5KSB7XG4gICAgcm91dGVyLnVybEhhbmRsaW5nU3RyYXRlZ3kgPSB1cmxIYW5kbGluZ1N0cmF0ZWd5O1xuICB9XG4gIHJldHVybiByb3V0ZXI7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogU2V0cyB1cCB0aGUgcm91dGVyIHRvIGJlIHVzZWQgZm9yIHRlc3RpbmcuXG4gKlxuICogVGhlIG1vZHVsZXMgc2V0cyB1cCB0aGUgcm91dGVyIHRvIGJlIHVzZWQgZm9yIHRlc3RpbmcuXG4gKiBJdCBwcm92aWRlcyBzcHkgaW1wbGVtZW50YXRpb25zIG9mIGBMb2NhdGlvbmAsIGBMb2NhdGlvblN0cmF0ZWd5YCwgYW5kIHtAbGlua1xuICogTmdNb2R1bGVGYWN0b3J5TG9hZGVyfS5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICogIyMjIEV4YW1wbGVcbiAqXG4gKiBgYGBcbiAqIGJlZm9yZUVhY2goKCkgPT4ge1xuICogICBUZXN0QmVkLmNvbmZpZ3VyZVRlc3RNb2R1bGUoe1xuICogICAgIGltcG9ydHM6IFtcbiAqICAgICAgIFJvdXRlclRlc3RpbmdNb2R1bGUud2l0aFJvdXRlcyhcbiAqICAgICAgICAgW3twYXRoOiAnJywgY29tcG9uZW50OiBCbGFua0NtcH0sIHtwYXRoOiAnc2ltcGxlJywgY29tcG9uZW50OiBTaW1wbGVDbXB9XVxuICogICAgICAgKVxuICogICAgIF1cbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQE5nTW9kdWxlKHtcbiAgZXhwb3J0czogW1JvdXRlck1vZHVsZV0sXG4gIHByb3ZpZGVyczogW1xuICAgIFJPVVRFUl9QUk9WSURFUlMsIHtwcm92aWRlOiBMb2NhdGlvbiwgdXNlQ2xhc3M6IFNweUxvY2F0aW9ufSxcbiAgICB7cHJvdmlkZTogTG9jYXRpb25TdHJhdGVneSwgdXNlQ2xhc3M6IE1vY2tMb2NhdGlvblN0cmF0ZWd5fSxcbiAgICB7cHJvdmlkZTogTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCB1c2VDbGFzczogU3B5TmdNb2R1bGVGYWN0b3J5TG9hZGVyfSwge1xuICAgICAgcHJvdmlkZTogUm91dGVyLFxuICAgICAgdXNlRmFjdG9yeTogc2V0dXBUZXN0aW5nUm91dGVyLFxuICAgICAgZGVwczogW1xuICAgICAgICBVcmxTZXJpYWxpemVyLCBDaGlsZHJlbk91dGxldENvbnRleHRzLCBMb2NhdGlvbiwgTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBDb21waWxlciwgSW5qZWN0b3IsXG4gICAgICAgIFJPVVRFUywgUk9VVEVSX0NPTkZJR1VSQVRJT04sIFtVcmxIYW5kbGluZ1N0cmF0ZWd5LCBuZXcgT3B0aW9uYWwoKV1cbiAgICAgIF1cbiAgICB9LFxuICAgIHtwcm92aWRlOiBQcmVsb2FkaW5nU3RyYXRlZ3ksIHVzZUV4aXN0aW5nOiBOb1ByZWxvYWRpbmd9LCBwcm92aWRlUm91dGVzKFtdKVxuICBdXG59KVxuZXhwb3J0IGNsYXNzIFJvdXRlclRlc3RpbmdNb2R1bGUge1xuICBzdGF0aWMgd2l0aFJvdXRlcyhyb3V0ZXM6IFJvdXRlcywgY29uZmlnPzogRXh0cmFPcHRpb25zKTpcbiAgICAgIE1vZHVsZVdpdGhQcm92aWRlcnM8Um91dGVyVGVzdGluZ01vZHVsZT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuZ01vZHVsZTogUm91dGVyVGVzdGluZ01vZHVsZSxcbiAgICAgIHByb3ZpZGVyczogW1xuICAgICAgICBwcm92aWRlUm91dGVzKHJvdXRlcyksXG4gICAgICAgIHtwcm92aWRlOiBST1VURVJfQ09ORklHVVJBVElPTiwgdXNlVmFsdWU6IGNvbmZpZyA/IGNvbmZpZyA6IHt9fSxcbiAgICAgIF1cbiAgICB9O1xuICB9XG59XG4iXX0=