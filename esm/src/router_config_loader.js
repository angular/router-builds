/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { OpaqueToken } from '@angular/core';
import { fromPromise } from 'rxjs/observable/fromPromise';
/**
 * @deprecated use Routes
 */
export const ROUTER_CONFIG = new OpaqueToken('ROUTER_CONFIG');
export const ROUTES = new OpaqueToken('ROUTES');
export class LoadedRouterConfig {
    constructor(routes, factoryResolver) {
        this.routes = routes;
        this.factoryResolver = factoryResolver;
    }
}
export class RouterConfigLoader {
    constructor(loader) {
        this.loader = loader;
    }
    load(path) {
        return fromPromise(this.loader.load(path).then(r => {
            const ref = r.create();
            return new LoadedRouterConfig(ref.injector.get(ROUTES), ref.componentFactoryResolver);
        }));
    }
}
//# sourceMappingURL=router_config_loader.js.map