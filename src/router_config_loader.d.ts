/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Compiler, InjectionToken, Injector, NgModuleFactoryLoader } from '@angular/core';
import { Observable } from 'rxjs';
import { LoadedRouterConfig, Route } from './config';
/**
 * The [DI token](guide/glossary/#di-token) for a router configuration.
 *
 * `ROUTES` is a low level API for router configuration via dependency injection.
 *
 * We recommend that in almost all cases to use higher level APIs such as `RouterModule.forRoot()`,
 * `RouterModule.forChild()`, `provideRoutes`, or `Router.resetConfig()`.
 *
 * @publicApi
 */
export declare const ROUTES: InjectionToken<Route[][]>;
export declare class RouterConfigLoader {
    private loader;
    private compiler;
    private onLoadStartListener?;
    private onLoadEndListener?;
    constructor(loader: NgModuleFactoryLoader, compiler: Compiler, onLoadStartListener?: ((r: Route) => void) | undefined, onLoadEndListener?: ((r: Route) => void) | undefined);
    load(parentInjector: Injector, route: Route): Observable<LoadedRouterConfig>;
    private loadModuleFactory;
}
