/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * \@whatItDoes Contains all the router outlets created in a component.
 *
 * \@stable
 */
export class RouterOutletMap {
    constructor() {
        /** @internal */
        this._outlets = {};
    }
    /**
     * Adds an outlet to this map.
     * @param {?} name
     * @param {?} outlet
     * @return {?}
     */
    registerOutlet(name, outlet) { this._outlets[name] = outlet; }
    /**
     * Removes an outlet from this map.
     * @param {?} name
     * @return {?}
     */
    removeOutlet(name) { this._outlets[name] = undefined; }
}
function RouterOutletMap_tsickle_Closure_declarations() {
    /**
     * \@internal
     * @type {?}
     */
    RouterOutletMap.prototype._outlets;
}
//# sourceMappingURL=router_outlet_map.js.map