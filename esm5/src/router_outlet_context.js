/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Store contextual information about a `RouterOutlet`
 *
 *
 */
var /**
 * Store contextual information about a `RouterOutlet`
 *
 *
 */
OutletContext = /** @class */ (function () {
    function OutletContext() {
        this.outlet = null;
        this.route = null;
        this.resolver = null;
        this.children = new ChildrenOutletContexts();
        this.attachRef = null;
    }
    return OutletContext;
}());
/**
 * Store contextual information about a `RouterOutlet`
 *
 *
 */
export { OutletContext };
function OutletContext_tsickle_Closure_declarations() {
    /** @type {?} */
    OutletContext.prototype.outlet;
    /** @type {?} */
    OutletContext.prototype.route;
    /** @type {?} */
    OutletContext.prototype.resolver;
    /** @type {?} */
    OutletContext.prototype.children;
    /** @type {?} */
    OutletContext.prototype.attachRef;
}
/**
 * Store contextual information about the children (= nested) `RouterOutlet`
 *
 *
 */
var /**
 * Store contextual information about the children (= nested) `RouterOutlet`
 *
 *
 */
ChildrenOutletContexts = /** @class */ (function () {
    function ChildrenOutletContexts() {
        this.contexts = new Map();
    }
    /** Called when a `RouterOutlet` directive is instantiated */
    /**
     * Called when a `RouterOutlet` directive is instantiated
     * @param {?} childName
     * @param {?} outlet
     * @return {?}
     */
    ChildrenOutletContexts.prototype.onChildOutletCreated = /**
     * Called when a `RouterOutlet` directive is instantiated
     * @param {?} childName
     * @param {?} outlet
     * @return {?}
     */
    function (childName, outlet) {
        var /** @type {?} */ context = this.getOrCreateContext(childName);
        context.outlet = outlet;
        this.contexts.set(childName, context);
    };
    /**
     * Called when a `RouterOutlet` directive is destroyed.
     * We need to keep the context as the outlet could be destroyed inside a NgIf and might be
     * re-created later.
     */
    /**
     * Called when a `RouterOutlet` directive is destroyed.
     * We need to keep the context as the outlet could be destroyed inside a NgIf and might be
     * re-created later.
     * @param {?} childName
     * @return {?}
     */
    ChildrenOutletContexts.prototype.onChildOutletDestroyed = /**
     * Called when a `RouterOutlet` directive is destroyed.
     * We need to keep the context as the outlet could be destroyed inside a NgIf and might be
     * re-created later.
     * @param {?} childName
     * @return {?}
     */
    function (childName) {
        var /** @type {?} */ context = this.getContext(childName);
        if (context) {
            context.outlet = null;
        }
    };
    /**
     * Called when the corresponding route is deactivated during navigation.
     * Because the component get destroyed, all children outlet are destroyed.
     */
    /**
     * Called when the corresponding route is deactivated during navigation.
     * Because the component get destroyed, all children outlet are destroyed.
     * @return {?}
     */
    ChildrenOutletContexts.prototype.onOutletDeactivated = /**
     * Called when the corresponding route is deactivated during navigation.
     * Because the component get destroyed, all children outlet are destroyed.
     * @return {?}
     */
    function () {
        var /** @type {?} */ contexts = this.contexts;
        this.contexts = new Map();
        return contexts;
    };
    /**
     * @param {?} contexts
     * @return {?}
     */
    ChildrenOutletContexts.prototype.onOutletReAttached = /**
     * @param {?} contexts
     * @return {?}
     */
    function (contexts) { this.contexts = contexts; };
    /**
     * @param {?} childName
     * @return {?}
     */
    ChildrenOutletContexts.prototype.getOrCreateContext = /**
     * @param {?} childName
     * @return {?}
     */
    function (childName) {
        var /** @type {?} */ context = this.getContext(childName);
        if (!context) {
            context = new OutletContext();
            this.contexts.set(childName, context);
        }
        return context;
    };
    /**
     * @param {?} childName
     * @return {?}
     */
    ChildrenOutletContexts.prototype.getContext = /**
     * @param {?} childName
     * @return {?}
     */
    function (childName) { return this.contexts.get(childName) || null; };
    return ChildrenOutletContexts;
}());
/**
 * Store contextual information about the children (= nested) `RouterOutlet`
 *
 *
 */
export { ChildrenOutletContexts };
function ChildrenOutletContexts_tsickle_Closure_declarations() {
    /** @type {?} */
    ChildrenOutletContexts.prototype.contexts;
}
//# sourceMappingURL=router_outlet_context.js.map