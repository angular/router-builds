/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { InjectionToken, NgModuleFactory } from '@angular/core/index';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { of } from 'rxjs/observable/of';
import { map } from 'rxjs/operator/map';
import { mergeMap } from 'rxjs/operator/mergeMap';
import { flatten, wrapIntoObservable } from './utils/collection';
/**
 * @docsNotRequired
 * @experimental
 */
export const /** @type {?} */ ROUTES = new InjectionToken('ROUTES');
export class LoadedRouterConfig {
    /**
     * @param {?} routes
     * @param {?} injector
     * @param {?} factoryResolver
     * @param {?} injectorFactory
     */
    constructor(routes, injector, factoryResolver, injectorFactory) {
        this.routes = routes;
        this.injector = injector;
        this.factoryResolver = factoryResolver;
        this.injectorFactory = injectorFactory;
    }
}
function LoadedRouterConfig_tsickle_Closure_declarations() {
    /** @type {?} */
    LoadedRouterConfig.prototype.routes;
    /** @type {?} */
    LoadedRouterConfig.prototype.injector;
    /** @type {?} */
    LoadedRouterConfig.prototype.factoryResolver;
    /** @type {?} */
    LoadedRouterConfig.prototype.injectorFactory;
}
export class RouterConfigLoader {
    /**
     * @param {?} loader
     * @param {?} compiler
     * @param {?=} onLoadStartListener
     * @param {?=} onLoadEndListener
     */
    constructor(loader, compiler, onLoadStartListener, onLoadEndListener) {
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
    load(parentInjector, route) {
        if (this.onLoadStartListener) {
            this.onLoadStartListener(route);
        }
        const /** @type {?} */ moduleFactory$ = this.loadModuleFactory(route.loadChildren);
        return map.call(moduleFactory$, (factory) => {
            if (this.onLoadEndListener) {
                this.onLoadEndListener(route);
            }
            const /** @type {?} */ module = factory.create(parentInjector);
            const /** @type {?} */ injectorFactory = (parent) => factory.create(parent).injector;
            return new LoadedRouterConfig(flatten(module.injector.get(ROUTES)), module.injector, module.componentFactoryResolver, injectorFactory);
        });
    }
    /**
     * @param {?} loadChildren
     * @return {?}
     */
    loadModuleFactory(loadChildren) {
        if (typeof loadChildren === 'string') {
            return fromPromise(this.loader.load(loadChildren));
        }
        else {
            return mergeMap.call(wrapIntoObservable(loadChildren()), (t) => {
                if (t instanceof NgModuleFactory) {
                    return of(t);
                }
                else {
                    return fromPromise(this.compiler.compileModuleAsync(t));
                }
            });
        }
    }
}
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