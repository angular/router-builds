"use strict";
const core_1 = require('@angular/core');
const router_outlet_map_1 = require('../router_outlet_map');
const shared_1 = require('../shared');
class RouterOutlet {
    /**
     * @internal
     */
    constructor(parentOutletMap, location, name) {
        this.location = location;
        parentOutletMap.registerOutlet(name ? name : shared_1.PRIMARY_OUTLET, this);
    }
    get isActivated() { return !!this.activated; }
    get component() {
        if (!this.activated)
            throw new Error('Outlet is not activated');
        return this.activated.instance;
    }
    get activatedRoute() {
        if (!this.activated)
            throw new Error('Outlet is not activated');
        return this._activatedRoute;
    }
    deactivate() {
        if (this.activated) {
            this.activated.destroy();
            this.activated = null;
        }
    }
    activate(factory, activatedRoute, providers, outletMap) {
        this.outletMap = outletMap;
        this._activatedRoute = activatedRoute;
        const inj = core_1.ReflectiveInjector.fromResolvedProviders(providers, this.location.parentInjector);
        this.activated = this.location.createComponent(factory, this.location.length, inj, []);
    }
}
/** @nocollapse */
RouterOutlet.decorators = [
    { type: core_1.Directive, args: [{ selector: 'router-outlet' },] },
];
/** @nocollapse */
RouterOutlet.ctorParameters = [
    { type: router_outlet_map_1.RouterOutletMap, },
    { type: core_1.ViewContainerRef, },
    { type: undefined, decorators: [{ type: core_1.Attribute, args: ['name',] },] },
];
exports.RouterOutlet = RouterOutlet;
//# sourceMappingURL=router_outlet.js.map