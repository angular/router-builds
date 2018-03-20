/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { InjectionToken, NgModuleFactory } from '@angular/core';
import { from, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { LoadedRouterConfig, copyConfig } from './config';
import { flatten, wrapIntoObservable } from './utils/collection';
/**
 * \@docsNotRequired
 * \@experimental
 */
export var /** @type {?} */ ROUTES = new InjectionToken('ROUTES');
var RouterConfigLoader = /** @class */ (function () {
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
    RouterConfigLoader.prototype.load = /**
     * @param {?} parentInjector
     * @param {?} route
     * @return {?}
     */
    function (parentInjector, route) {
        var _this = this;
        if (this.onLoadStartListener) {
            this.onLoadStartListener(route);
        }
        var /** @type {?} */ moduleFactory$ = this.loadModuleFactory(/** @type {?} */ ((route.loadChildren)));
        return moduleFactory$.pipe(map(function (factory) {
            if (_this.onLoadEndListener) {
                _this.onLoadEndListener(route);
            }
            var /** @type {?} */ module = factory.create(parentInjector);
            return new LoadedRouterConfig(flatten(module.injector.get(ROUTES)).map(copyConfig), module);
        }));
    };
    /**
     * @param {?} loadChildren
     * @return {?}
     */
    RouterConfigLoader.prototype.loadModuleFactory = /**
     * @param {?} loadChildren
     * @return {?}
     */
    function (loadChildren) {
        var _this = this;
        if (typeof loadChildren === 'string') {
            return from(this.loader.load(loadChildren));
        }
        else {
            return wrapIntoObservable(loadChildren()).pipe(mergeMap(function (t) {
                if (t instanceof NgModuleFactory) {
                    return of(t);
                }
                else {
                    return from(_this.compiler.compileModuleAsync(t));
                }
            }));
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