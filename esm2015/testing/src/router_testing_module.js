import { Location, LocationStrategy } from '@angular/common';
import { MockLocationStrategy, SpyLocation } from '@angular/common/testing';
import { Compiler, Injectable, Injector, NgModule, NgModuleFactoryLoader, Optional } from '@angular/core';
import { ChildrenOutletContexts, NoPreloading, PreloadingStrategy, ROUTER_CONFIGURATION, ROUTES, Router, RouterModule, UrlHandlingStrategy, UrlSerializer, provideRoutes, ɵROUTER_PROVIDERS as ROUTER_PROVIDERS, ɵflatten as flatten } from '@angular/router';
import * as i0 from "@angular/core";
/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
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
 * const loader = TestBed.get(NgModuleFactoryLoader);
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
 *
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
    get stubbedModules() { return this._stubbedModules; }
    /**
     * @param {?} path
     * @return {?}
     */
    load(path) {
        if (this._stubbedModules[path]) {
            return this._stubbedModules[path];
        }
        else {
            return /** @type {?} */ (Promise.reject(new Error(`Cannot find module ${path}`)));
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
SpyNgModuleFactoryLoader.ngInjectableDef = i0.defineInjectable({ token: SpyNgModuleFactoryLoader, factory: function SpyNgModuleFactoryLoader_Factory(t) { return new (t || SpyNgModuleFactoryLoader)(i0.inject(Compiler)); }, providedIn: null });
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    SpyNgModuleFactoryLoader.prototype._stubbedModules;
    /** @type {?} */
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
 *
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
    const router = new Router(/** @type {?} */ ((null)), urlSerializer, contexts, location, injector, loader, compiler, flatten(routes));
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
 *
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
RouterTestingModule.ngModuleDef = i0.ɵdefineNgModule({ type: RouterTestingModule, bootstrap: [], declarations: [], imports: [], exports: [RouterModule] });
RouterTestingModule.ngInjectorDef = i0.defineInjector({ factory: function RouterTestingModule_Factory(t) { return new (t || RouterTestingModule)(); }, providers: [
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
    ], imports: [[RouterModule]] });

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Rlc3RpbmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3Rlc3Rpbmcvc3JjL3JvdXRlcl90ZXN0aW5nX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFRQSxPQUFPLEVBQUMsUUFBUSxFQUFFLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDM0QsT0FBTyxFQUFDLG9CQUFvQixFQUFFLFdBQVcsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQzFFLE9BQU8sRUFBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBdUIsUUFBUSxFQUFtQixxQkFBcUIsRUFBRSxRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDOUksT0FBTyxFQUFDLHNCQUFzQixFQUFnQixZQUFZLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxFQUFTLE1BQU0sRUFBRSxZQUFZLEVBQVUsbUJBQW1CLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsSUFBSSxnQkFBZ0IsRUFBRSxRQUFRLElBQUksT0FBTyxFQUFDLE1BQU0saUJBQWlCLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtDelIsTUFBTSxPQUFPLHdCQUF3Qjs7OztJQXNCbkMsWUFBb0IsUUFBa0I7UUFBbEIsYUFBUSxHQUFSLFFBQVEsQ0FBVTs7OzsrQkFsQnFDLEVBQUU7S0FrQm5DOzs7Ozs7SUFiMUMsSUFBSSxjQUFjLENBQUMsT0FBOEI7O1FBQy9DLE1BQU0sR0FBRyxHQUEwQixFQUFFLENBQUM7UUFDdEMsS0FBSyxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ3BDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxD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LFFBQVEsRUFBRSxRQUFROzRCQUMxRixNQUFNLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLFFBQVEsRUFBRSxDQUFDO3lCQUNwRTtxQkFDRjtvQkFDRCxFQUFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFDLEVBQUUsYUFBYSxDQUFDLEVBQUUsQ0FBQztpQkFDNUU7YUFDRjs7NkRBQ1ksbUJBQW1CLDBEQWZwQixZQUFZOzRIQWVYLG1CQUFtQixtQkFkbkI7UUFDVCxnQkFBZ0IsRUFBRSxFQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBQztRQUM1RCxFQUFDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsb0JBQW9CLEVBQUM7UUFDM0QsRUFBQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsUUFBUSxFQUFFLHdCQUF3QixFQUFDLEVBQUU7WUFDcEUsT0FBTyxFQUFFLE1BQU07WUFDZixVQUFVLEVBQUUsa0JBQWtCO1lBQzlCLElBQUksRUFBRTtnQkFDSixhQUFhLEVBQUUsc0JBQXNCLEVBQUUsUUFBUSxFQUFFLHFCQUFxQixFQUFFLFFBQVEsRUFBRSxRQUFRO2dCQUMxRixNQUFNLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLFFBQVEsRUFBRSxDQUFDO2FBQ3BFO1NBQ0Y7UUFDRCxFQUFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFDLEVBQUUsYUFBYSxDQUFDLEVBQUUsQ0FBQztLQUM1RSxZQWJRLENBQUMsWUFBWSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9uLCBMb2NhdGlvblN0cmF0ZWd5fSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtNb2NrTG9jYXRpb25TdHJhdGVneSwgU3B5TG9jYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbi90ZXN0aW5nJztcbmltcG9ydCB7Q29tcGlsZXIsIEluamVjdGFibGUsIEluamVjdG9yLCBNb2R1bGVXaXRoUHJvdmlkZXJzLCBOZ01vZHVsZSwgTmdNb2R1bGVGYWN0b3J5LCBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIE9wdGlvbmFsfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0cywgRXh0cmFPcHRpb25zLCBOb1ByZWxvYWRpbmcsIFByZWxvYWRpbmdTdHJhdGVneSwgUk9VVEVSX0NPTkZJR1VSQVRJT04sIFJPVVRFUywgUm91dGUsIFJvdXRlciwgUm91dGVyTW9kdWxlLCBSb3V0ZXMsIFVybEhhbmRsaW5nU3RyYXRlZ3ksIFVybFNlcmlhbGl6ZXIsIHByb3ZpZGVSb3V0ZXMsIMm1Uk9VVEVSX1BST1ZJREVSUyBhcyBST1VURVJfUFJPVklERVJTLCDJtWZsYXR0ZW4gYXMgZmxhdHRlbn0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcblxuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQWxsb3dzIHRvIHNpbXVsYXRlIHRoZSBsb2FkaW5nIG9mIG5nIG1vZHVsZXMgaW4gdGVzdHMuXG4gKlxuICogYGBgXG4gKiBjb25zdCBsb2FkZXIgPSBUZXN0QmVkLmdldChOZ01vZHVsZUZhY3RvcnlMb2FkZXIpO1xuICpcbiAqIEBDb21wb25lbnQoe3RlbXBsYXRlOiAnbGF6eS1sb2FkZWQnfSlcbiAqIGNsYXNzIExhenlMb2FkZWRDb21wb25lbnQge31cbiAqIEBOZ01vZHVsZSh7XG4gKiAgIGRlY2xhcmF0aW9uczogW0xhenlMb2FkZWRDb21wb25lbnRdLFxuICogICBpbXBvcnRzOiBbUm91dGVyTW9kdWxlLmZvckNoaWxkKFt7cGF0aDogJ2xvYWRlZCcsIGNvbXBvbmVudDogTGF6eUxvYWRlZENvbXBvbmVudH1dKV1cbiAqIH0pXG4gKlxuICogY2xhc3MgTG9hZGVkTW9kdWxlIHt9XG4gKlxuICogLy8gc2V0cyB1cCBzdHViYmVkTW9kdWxlc1xuICogbG9hZGVyLnN0dWJiZWRNb2R1bGVzID0ge2xhenlNb2R1bGU6IExvYWRlZE1vZHVsZX07XG4gKlxuICogcm91dGVyLnJlc2V0Q29uZmlnKFtcbiAqICAge3BhdGg6ICdsYXp5JywgbG9hZENoaWxkcmVuOiAnbGF6eU1vZHVsZSd9LFxuICogXSk7XG4gKlxuICogcm91dGVyLm5hdmlnYXRlQnlVcmwoJy9sYXp5L2xvYWRlZCcpO1xuICogYGBgXG4gKlxuICpcbiAqL1xuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIFNweU5nTW9kdWxlRmFjdG9yeUxvYWRlciBpbXBsZW1lbnRzIE5nTW9kdWxlRmFjdG9yeUxvYWRlciB7XG4gIC8qKlxuICAgKiBAZG9jc05vdFJlcXVpcmVkXG4gICAqL1xuICBwcml2YXRlIF9zdHViYmVkTW9kdWxlczoge1twYXRoOiBzdHJpbmddOiBQcm9taXNlPE5nTW9kdWxlRmFjdG9yeTxhbnk+Pn0gPSB7fTtcblxuICAvKipcbiAgICogQGRvY3NOb3RSZXF1aXJlZFxuICAgKi9cbiAgc2V0IHN0dWJiZWRNb2R1bGVzKG1vZHVsZXM6IHtbcGF0aDogc3RyaW5nXTogYW55fSkge1xuICAgIGNvbnN0IHJlczoge1twYXRoOiBzdHJpbmddOiBhbnl9ID0ge307XG4gICAgZm9yIChjb25zdCB0IG9mIE9iamVjdC5rZXlzKG1vZHVsZXMpKSB7XG4gICAgICByZXNbdF0gPSB0aGlzLmNvbXBpbGVyLmNvbXBpbGVNb2R1bGVBc3luYyhtb2R1bGVzW3RdKTtcbiAgICB9XG4gICAgdGhpcy5fc3R1YmJlZE1vZHVsZXMgPSByZXM7XG4gIH1cblxuICAvKipcbiAgICogQGRvY3NOb3RSZXF1aXJlZFxuICAgKi9cbiAgZ2V0IHN0dWJiZWRNb2R1bGVzKCk6IHtbcGF0aDogc3RyaW5nXTogYW55fSB7IHJldHVybiB0aGlzLl9zdHViYmVkTW9kdWxlczsgfVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgY29tcGlsZXI6IENvbXBpbGVyKSB7fVxuXG4gIGxvYWQocGF0aDogc3RyaW5nKTogUHJvbWlzZTxOZ01vZHVsZUZhY3Rvcnk8YW55Pj4ge1xuICAgIGlmICh0aGlzLl9zdHViYmVkTW9kdWxlc1twYXRoXSkge1xuICAgICAgcmV0dXJuIHRoaXMuX3N0dWJiZWRNb2R1bGVzW3BhdGhdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gPGFueT5Qcm9taXNlLnJlamVjdChuZXcgRXJyb3IoYENhbm5vdCBmaW5kIG1vZHVsZSAke3BhdGh9YCkpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpc1VybEhhbmRsaW5nU3RyYXRlZ3kob3B0czogRXh0cmFPcHRpb25zIHwgVXJsSGFuZGxpbmdTdHJhdGVneSk6XG4gICAgb3B0cyBpcyBVcmxIYW5kbGluZ1N0cmF0ZWd5IHtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBjaGVjayBpcyBuZWVkZWQgYmVjYXVzZSBVcmxIYW5kbGluZ1N0cmF0ZWd5IGlzIGFuIGludGVyZmFjZSBhbmQgZG9lc24ndCBleGlzdCBhdFxuICAvLyBydW50aW1lLlxuICByZXR1cm4gJ3Nob3VsZFByb2Nlc3NVcmwnIGluIG9wdHM7XG59XG5cbi8qKlxuICogUm91dGVyIHNldHVwIGZhY3RvcnkgZnVuY3Rpb24gdXNlZCBmb3IgdGVzdGluZy5cbiAqXG4gKlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBUZXN0aW5nUm91dGVyKFxuICAgIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIGNvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLCBsb2NhdGlvbjogTG9jYXRpb24sXG4gICAgbG9hZGVyOiBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIGNvbXBpbGVyOiBDb21waWxlciwgaW5qZWN0b3I6IEluamVjdG9yLCByb3V0ZXM6IFJvdXRlW11bXSxcbiAgICBvcHRzPzogRXh0cmFPcHRpb25zLCB1cmxIYW5kbGluZ1N0cmF0ZWd5PzogVXJsSGFuZGxpbmdTdHJhdGVneSk6IFJvdXRlcjtcblxuLyoqXG4gKiBSb3V0ZXIgc2V0dXAgZmFjdG9yeSBmdW5jdGlvbiB1c2VkIGZvciB0ZXN0aW5nLlxuICpcbiAqIEBkZXByZWNhdGVkIEFzIG9mIHY1LjIuIFRoZSAybmQtdG8tbGFzdCBhcmd1bWVudCBzaG91bGQgYmUgYEV4dHJhT3B0aW9uc2AsIG5vdFxuICogYFVybEhhbmRsaW5nU3RyYXRlZ3lgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cFRlc3RpbmdSb3V0ZXIoXG4gICAgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgY29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIGxvY2F0aW9uOiBMb2NhdGlvbixcbiAgICBsb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLCBpbmplY3RvcjogSW5qZWN0b3IsIHJvdXRlczogUm91dGVbXVtdLFxuICAgIHVybEhhbmRsaW5nU3RyYXRlZ3k/OiBVcmxIYW5kbGluZ1N0cmF0ZWd5KTogUm91dGVyO1xuXG4vKipcbiAqIFJvdXRlciBzZXR1cCBmYWN0b3J5IGZ1bmN0aW9uIHVzZWQgZm9yIHRlc3RpbmcuXG4gKlxuICpcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwVGVzdGluZ1JvdXRlcihcbiAgICB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLCBjb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cywgbG9jYXRpb246IExvY2F0aW9uLFxuICAgIGxvYWRlcjogTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBjb21waWxlcjogQ29tcGlsZXIsIGluamVjdG9yOiBJbmplY3Rvciwgcm91dGVzOiBSb3V0ZVtdW10sXG4gICAgb3B0cz86IEV4dHJhT3B0aW9ucyB8IFVybEhhbmRsaW5nU3RyYXRlZ3ksIHVybEhhbmRsaW5nU3RyYXRlZ3k/OiBVcmxIYW5kbGluZ1N0cmF0ZWd5KSB7XG4gIGNvbnN0IHJvdXRlciA9IG5ldyBSb3V0ZXIoXG4gICAgICBudWxsICEsIHVybFNlcmlhbGl6ZXIsIGNvbnRleHRzLCBsb2NhdGlvbiwgaW5qZWN0b3IsIGxvYWRlciwgY29tcGlsZXIsIGZsYXR0ZW4ocm91dGVzKSk7XG4gIGlmIChvcHRzKSB7XG4gICAgLy8gSGFuZGxlIGRlcHJlY2F0ZWQgYXJndW1lbnQgb3JkZXJpbmcuXG4gICAgaWYgKGlzVXJsSGFuZGxpbmdTdHJhdGVneShvcHRzKSkge1xuICAgICAgcm91dGVyLnVybEhhbmRsaW5nU3RyYXRlZ3kgPSBvcHRzO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBIYW5kbGUgRXh0cmFPcHRpb25zXG5cbiAgICAgIGlmIChvcHRzLm1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcikge1xuICAgICAgICByb3V0ZXIubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyID0gb3B0cy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI7XG4gICAgICB9XG5cbiAgICAgIGlmIChvcHRzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kpIHtcbiAgICAgICAgcm91dGVyLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kgPSBvcHRzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKHVybEhhbmRsaW5nU3RyYXRlZ3kpIHtcbiAgICByb3V0ZXIudXJsSGFuZGxpbmdTdHJhdGVneSA9IHVybEhhbmRsaW5nU3RyYXRlZ3k7XG4gIH1cbiAgcmV0dXJuIHJvdXRlcjtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBTZXRzIHVwIHRoZSByb3V0ZXIgdG8gYmUgdXNlZCBmb3IgdGVzdGluZy5cbiAqXG4gKiBUaGUgbW9kdWxlcyBzZXRzIHVwIHRoZSByb3V0ZXIgdG8gYmUgdXNlZCBmb3IgdGVzdGluZy5cbiAqIEl0IHByb3ZpZGVzIHNweSBpbXBsZW1lbnRhdGlvbnMgb2YgYExvY2F0aW9uYCwgYExvY2F0aW9uU3RyYXRlZ3lgLCBhbmQge0BsaW5rXG4gKiBOZ01vZHVsZUZhY3RvcnlMb2FkZXJ9LlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYFxuICogYmVmb3JlRWFjaCgoKSA9PiB7XG4gKiAgIFRlc3RCZWQuY29uZmlndXJlVGVzdE1vZHVsZSh7XG4gKiAgICAgaW1wb3J0czogW1xuICogICAgICAgUm91dGVyVGVzdGluZ01vZHVsZS53aXRoUm91dGVzKFxuICogICAgICAgICBbe3BhdGg6ICcnLCBjb21wb25lbnQ6IEJsYW5rQ21wfSwge3BhdGg6ICdzaW1wbGUnLCBjb21wb25lbnQ6IFNpbXBsZUNtcH1dXG4gKiAgICAgICApXG4gKiAgICAgXVxuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICpcbiAqL1xuQE5nTW9kdWxlKHtcbiAgZXhwb3J0czogW1JvdXRlck1vZHVsZV0sXG4gIHByb3ZpZGVyczogW1xuICAgIFJPVVRFUl9QUk9WSURFUlMsIHtwcm92aWRlOiBMb2NhdGlvbiwgdXNlQ2xhc3M6IFNweUxvY2F0aW9ufSxcbiAgICB7cHJvdmlkZTogTG9jYXRpb25TdHJhdGVneSwgdXNlQ2xhc3M6IE1vY2tMb2NhdGlvblN0cmF0ZWd5fSxcbiAgICB7cHJvdmlkZTogTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCB1c2VDbGFzczogU3B5TmdNb2R1bGVGYWN0b3J5TG9hZGVyfSwge1xuICAgICAgcHJvdmlkZTogUm91dGVyLFxuICAgICAgdXNlRmFjdG9yeTogc2V0dXBUZXN0aW5nUm91dGVyLFxuICAgICAgZGVwczogW1xuICAgICAgICBVcmxTZXJpYWxpemVyLCBDaGlsZHJlbk91dGxldENvbnRleHRzLCBMb2NhdGlvbiwgTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBDb21waWxlciwgSW5qZWN0b3IsXG4gICAgICAgIFJPVVRFUywgUk9VVEVSX0NPTkZJR1VSQVRJT04sIFtVcmxIYW5kbGluZ1N0cmF0ZWd5LCBuZXcgT3B0aW9uYWwoKV1cbiAgICAgIF1cbiAgICB9LFxuICAgIHtwcm92aWRlOiBQcmVsb2FkaW5nU3RyYXRlZ3ksIHVzZUV4aXN0aW5nOiBOb1ByZWxvYWRpbmd9LCBwcm92aWRlUm91dGVzKFtdKVxuICBdXG59KVxuZXhwb3J0IGNsYXNzIFJvdXRlclRlc3RpbmdNb2R1bGUge1xuICBzdGF0aWMgd2l0aFJvdXRlcyhyb3V0ZXM6IFJvdXRlcywgY29uZmlnPzogRXh0cmFPcHRpb25zKTpcbiAgICAgIE1vZHVsZVdpdGhQcm92aWRlcnM8Um91dGVyVGVzdGluZ01vZHVsZT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuZ01vZHVsZTogUm91dGVyVGVzdGluZ01vZHVsZSxcbiAgICAgIHByb3ZpZGVyczogW1xuICAgICAgICBwcm92aWRlUm91dGVzKHJvdXRlcyksXG4gICAgICAgIHtwcm92aWRlOiBST1VURVJfQ09ORklHVVJBVElPTiwgdXNlVmFsdWU6IGNvbmZpZyA/IGNvbmZpZyA6IHt9fSxcbiAgICAgIF1cbiAgICB9O1xuICB9XG59XG4iXX0=