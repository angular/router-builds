import { ApplicationRef, Injector, ModuleWithProviders } from '@angular/core';
import { ExtraOptions } from './common_router_providers';
import { Routes } from './config';
import { RouterLink, RouterLinkWithHref } from './directives/router_link';
import { RouterLinkActive } from './directives/router_link_active';
import { RouterOutlet } from './directives/router_outlet';
/**
 * @stable
 */
export declare const ROUTER_DIRECTIVES: (typeof RouterOutlet | typeof RouterLink | typeof RouterLinkWithHref | typeof RouterLinkActive)[];
export declare const ROUTER_PROVIDERS: any[];
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
 * For lazy loaded modules it should be used as follows:
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
 * @experimental
 */
export declare class RouterModule {
    private injector;
    constructor(injector: Injector, appRef: ApplicationRef);
    static forRoot(routes: Routes, config?: ExtraOptions): ModuleWithProviders;
    static forChild(routes: Routes): ModuleWithProviders;
}
