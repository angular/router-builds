"use strict";
class RouterOutletMap {
    constructor() {
        /** @internal */
        this._outlets = {};
    }
    registerOutlet(name, outlet) { this._outlets[name] = outlet; }
}
exports.RouterOutletMap = RouterOutletMap;
//# sourceMappingURL=router_outlet_map.js.map