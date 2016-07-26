/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { ApplicationRef, ComponentResolver, Injector, NgModule, NgModuleFactoryLoader, SystemJsNgModuleLoader } from '@angular/core';
import { ROUTER_CONFIGURATION, rootRoute, setupRouter } from './common_router_providers';
import { RouterLink, RouterLinkWithHref } from './directives/router_link';
import { RouterLinkActive } from './directives/router_link_active';
import { RouterOutlet } from './directives/router_outlet';
import { Router } from './router';
import { ROUTES } from './router_config_loader';
import { RouterOutletMap } from './router_outlet_map';
import { ActivatedRoute } from './router_state';
import { DefaultUrlSerializer, UrlSerializer } from './url_tree';
/**
 * @stable
 */
export const ROUTER_DIRECTIVES = [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive];
export const ROUTER_PROVIDERS = [
    Location, { provide: LocationStrategy, useClass: PathLocationStrategy },
    { provide: UrlSerializer, useClass: DefaultUrlSerializer }, {
        provide: Router,
        useFactory: setupRouter,
        deps: [
            ApplicationRef, ComponentResolver, UrlSerializer, RouterOutletMap, Location, Injector,
            NgModuleFactoryLoader, ROUTES, ROUTER_CONFIGURATION
        ]
    },
    RouterOutletMap, { provide: ActivatedRoute, useFactory: rootRoute, deps: [Router] },
    { provide: NgModuleFactoryLoader, useClass: SystemJsNgModuleLoader },
    { provide: ROUTER_CONFIGURATION, useValue: { enableTracing: false } }
];
export class RouterModuleWithoutProviders {
}
/** @nocollapse */
RouterModuleWithoutProviders.decorators = [
    { type: NgModule, args: [{ declarations: ROUTER_DIRECTIVES, exports: ROUTER_DIRECTIVES },] },
];
export class RouterModule {
    constructor(injector) {
        this.injector = injector;
        setTimeout(() => {
            const appRef = injector.get(ApplicationRef);
            if (appRef.componentTypes.length == 0) {
                appRef.registerBootstrapListener(() => { injector.get(Router).initialNavigation(); });
            }
            else {
                injector.get(Router).initialNavigation();
            }
        }, 0);
    }
}
/** @nocollapse */
RouterModule.decorators = [
    { type: NgModule, args: [{ exports: [RouterModuleWithoutProviders], providers: ROUTER_PROVIDERS },] },
];
/** @nocollapse */
RouterModule.ctorParameters = [
    { type: Injector, },
];
//# sourceMappingURL=router_module.js.map