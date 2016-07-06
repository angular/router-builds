/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { AppModuleFactoryLoader, ComponentFactoryResolver, OpaqueToken } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Route } from './config';
export declare const ROUTER_CONFIG: OpaqueToken;
export declare class LoadedRouterConfig {
    routes: Route[];
    factoryResolver: ComponentFactoryResolver;
    constructor(routes: Route[], factoryResolver: ComponentFactoryResolver);
}
export declare class RouterConfigLoader {
    private loader;
    constructor(loader: AppModuleFactoryLoader);
    load(path: string): Observable<LoadedRouterConfig>;
}
