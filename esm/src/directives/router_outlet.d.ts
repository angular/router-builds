import { ComponentFactory, ResolvedReflectiveProvider } from '@angular/core';
import { RouterOutletMap } from '../router_outlet_map';
import { ActivatedRoute } from '../router_state';
export declare class RouterOutlet {
    private location;
    private activated;
    private _activatedRoute;
    outletMap: RouterOutletMap;
    readonly isActivated: boolean;
    readonly component: Object;
    readonly activatedRoute: ActivatedRoute;
    deactivate(): void;
    activate(factory: ComponentFactory<any>, activatedRoute: ActivatedRoute, providers: ResolvedReflectiveProvider[], outletMap: RouterOutletMap): void;
}
