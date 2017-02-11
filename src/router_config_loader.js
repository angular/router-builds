/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Compiler, InjectionToken } from '@angular/core/index';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { of } from 'rxjs/observable/of';
import { map } from 'rxjs/operator/map';
import { mergeMap } from 'rxjs/operator/mergeMap';
import { flatten, wrapIntoObservable } from './utils/collection';
/**
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
     */
    constructor(loader, compiler) {
        this.loader = loader;
        this.compiler = compiler;
    }
    /**
     * @param {?} parentInjector
     * @param {?} loadChildren
     * @return {?}
     */
    load(parentInjector, loadChildren) {
        return map.call(this.loadModuleFactory(loadChildren), (r) => {
            const /** @type {?} */ ref = r.create(parentInjector);
            const /** @type {?} */ injectorFactory = (parent) => r.create(parent).injector;
            return new LoadedRouterConfig(flatten(ref.injector.get(ROUTES)), ref.injector, ref.componentFactoryResolver, injectorFactory);
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
            const /** @type {?} */ offlineMode = this.compiler instanceof Compiler;
            return mergeMap.call(wrapIntoObservable(loadChildren()), (t) => offlineMode ? of(/** @type {?} */ (t)) : fromPromise(this.compiler.compileModuleAsync(t)));
        }
    }
}
function RouterConfigLoader_tsickle_Closure_declarations() {
    /** @type {?} */
    RouterConfigLoader.prototype.loader;
    /** @type {?} */
    RouterConfigLoader.prototype.compiler;
}
//# sourceMappingURL=router_config_loader.js.map