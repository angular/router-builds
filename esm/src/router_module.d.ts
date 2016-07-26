import { Injector } from '@angular/core';
import { RouterLink, RouterLinkWithHref } from './directives/router_link';
import { RouterLinkActive } from './directives/router_link_active';
import { RouterOutlet } from './directives/router_outlet';
/**
 * @stable
 */
export declare const ROUTER_DIRECTIVES: (typeof RouterOutlet | typeof RouterLink | typeof RouterLinkWithHref | typeof RouterLinkActive)[];
export declare const ROUTER_PROVIDERS: any[];
/**
 * Router module to be used for lazy loaded parts.
 *
 * ### Example
 *
 * ```
 * @NgModule({
 *   imports: [RouterModuleWithoutProviders]
 * })
 * class TeamsModule {}
 * ```
 *
 * @experimental We will soon have a way for the `RouterModule` to be imported with and without a
 * provider,
 * and then this module will be removed.
 */
export declare class RouterModuleWithoutProviders {
}
/**
 * Router module.
 *
 * ### Example
 *
 * ```
 * bootstrap(AppCmp, {modules: [RouterModule]});
 * ```
 *
 * @experimental
 */
export declare class RouterModule {
    private injector;
    constructor(injector: Injector);
}
