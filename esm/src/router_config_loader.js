/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Compiler, OpaqueToken } from '@angular/core';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { of } from 'rxjs/observable/of';
import { flatten, wrapIntoObservable } from './utils/collection';
export const ROUTES = new OpaqueToken('ROUTES');
export class LoadedRouterConfig {
    constructor(routes, injector, factoryResolver) {
        this.routes = routes;
        this.injector = injector;
        this.factoryResolver = factoryResolver;
    }
}
export class RouterConfigLoader {
    constructor(loader, compiler) {
        this.loader = loader;
        this.compiler = compiler;
    }
    load(parentInjector, loadChildren) {
        return this.loadModuleFactory(loadChildren).map(r => {
            const ref = r.create(parentInjector);
            return new LoadedRouterConfig(flatten(ref.injector.get(ROUTES)), ref.injector, ref.componentFactoryResolver);
        });
    }
    loadModuleFactory(loadChildren) {
        if (typeof loadChildren === 'string') {
            return fromPromise(this.loader.load(loadChildren));
        }
        else {
            const offlineMode = this.compiler instanceof Compiler;
            return wrapIntoObservable(loadChildren())
                .mergeMap(t => offlineMode ? of(t) : fromPromise(this.compiler.compileModuleAsync(t)));
        }
    }
}
//# sourceMappingURL=router_config_loader.js.map