import { Injector } from '@angular/core';
import { RouterLink, RouterLinkWithHref } from './directives/router_link';
import { RouterLinkActive } from './directives/router_link_active';
import { RouterOutlet } from './directives/router_outlet';
/**
 * @stable
 */
export declare const ROUTER_DIRECTIVES: (typeof RouterOutlet | typeof RouterLink | typeof RouterLinkWithHref | typeof RouterLinkActive)[];
/**
 * Router module.
 *
 * ### Example
 *
 * ```
 * bootstrap(AppCmp, {modules: [RouterAppModule]});
 * ```
 *
 * @experimental
 */
export declare class RouterAppModule {
    private injector;
    constructor(injector: Injector);
}
