/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { HashLocationStrategy, Location, PathLocationStrategy, PlatformLocation } from '@angular/common';
import { ApplicationRef, Compiler, Injector, ModuleWithProviders, NgModuleFactoryLoader, OpaqueToken, Provider } from '@angular/core';
import { Route, Routes } from './config';
import { RouterLink, RouterLinkWithHref } from './directives/router_link';
import { RouterLinkActive } from './directives/router_link_active';
import { RouterOutlet } from './directives/router_outlet';
import { Router } from './router';
import { RouterOutletMap } from './router_outlet_map';
import { ActivatedRoute } from './router_state';
import { UrlSerializer } from './url_tree';
/**
 * @stable
 */
export declare const ROUTER_DIRECTIVES: (typeof RouterOutlet | typeof RouterLink | typeof RouterLinkWithHref | typeof RouterLinkActive)[];
/**
 * @stable
 */
export declare const ROUTER_CONFIGURATION: OpaqueToken;
export declare const ROUTER_FORROOT_GUARD: OpaqueToken;
export declare const ROUTER_PROVIDERS: Provider[];
/**
 * Router module.
 *
 * When registered at the root, it should be used as follows:
 *
 * ### Example
 *
 * ```
 * bootstrap(AppCmp, {imports: [RouterModule.forRoot(ROUTES)]});
 * ```
 *
 * For submodules and lazy loaded submodules it should be used as follows:
 *
 * ### Example
 *
 * ```
 * @NgModule({
 *   imports: [RouterModule.forChild(CHILD_ROUTES)]
 * })
 * class Lazy {}
 * ```
 *
 * @stable
 */
export declare class RouterModule {
    constructor(guard: any);
    static forRoot(routes: Routes, config?: ExtraOptions): ModuleWithProviders;
    static forChild(routes: Routes): ModuleWithProviders;
}
export declare function provideLocationStrategy(platformLocationStrategy: PlatformLocation, baseHref: string, options?: ExtraOptions): HashLocationStrategy | PathLocationStrategy;
export declare function provideForRootGuard(router: Router): any;
/**
 * @stable
 */
export declare function provideRoutes(routes: Routes): any;
/**
 * @stable
 */
export interface ExtraOptions {
    enableTracing?: boolean;
    useHash?: boolean;
}
export declare function setupRouter(ref: ApplicationRef, urlSerializer: UrlSerializer, outletMap: RouterOutletMap, location: Location, injector: Injector, loader: NgModuleFactoryLoader, compiler: Compiler, config: Route[][], opts?: ExtraOptions): Router;
export declare function rootRoute(router: Router): ActivatedRoute;
export declare function initialRouterNavigation(router: Router): () => void;
export declare function provideRouterInitializer(): {
    provide: OpaqueToken;
    multi: boolean;
    useFactory: (router: Router) => () => void;
    deps: typeof Router[];
};
