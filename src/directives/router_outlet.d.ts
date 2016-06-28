/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ResolvedReflectiveProvider } from '@angular/core';
import { RouterOutletMap } from '../router_outlet_map';
import { ActivatedRoute } from '../router_state';
export declare class RouterOutlet {
    private location;
    private componentFactoryResolver;
    private activated;
    private _activatedRoute;
    outletMap: RouterOutletMap;
    isActivated: boolean;
    component: Object;
    activatedRoute: ActivatedRoute;
    deactivate(): void;
    activate(activatedRoute: ActivatedRoute, providers: ResolvedReflectiveProvider[], outletMap: RouterOutletMap): void;
}
