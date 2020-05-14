/**
 * @fileoverview added by tsickle
 * Generated from: packages/router/src/directives/router_outlet.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Attribute, ChangeDetectorRef, ComponentFactoryResolver, Directive, EventEmitter, Output, ViewContainerRef } from '@angular/core';
import { ChildrenOutletContexts } from '../router_outlet_context';
import { ActivatedRoute } from '../router_state';
import { PRIMARY_OUTLET } from '../shared';
import * as i0 from "@angular/core";
import * as i1 from "../router_outlet_context";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * \@description
 *
 * Acts as a placeholder that Angular dynamically fills based on the current router state.
 *
 * Each outlet can have a unique name, determined by the optional `name` attribute.
 * The name cannot be set or changed dynamically. If not set, default value is "primary".
 *
 * ```
 * <router-outlet></router-outlet>
 * <router-outlet name='left'></router-outlet>
 * <router-outlet name='right'></router-outlet>
 * ```
 *
 * A router outlet emits an activate event when a new component is instantiated,
 * and a deactivate event when a component is destroyed.
 *
 * ```
 * <router-outlet
 *   (activate)='onActivate($event)'
 *   (deactivate)='onDeactivate($event)'></router-outlet>
 * ```
 * \@ngModule RouterModule
 *
 * \@publicApi
 */
let RouterOutlet = /** @class */ (() => {
    /**
     * \@description
     *
     * Acts as a placeholder that Angular dynamically fills based on the current router state.
     *
     * Each outlet can have a unique name, determined by the optional `name` attribute.
     * The name cannot be set or changed dynamically. If not set, default value is "primary".
     *
     * ```
     * <router-outlet></router-outlet>
     * <router-outlet name='left'></router-outlet>
     * <router-outlet name='right'></router-outlet>
     * ```
     *
     * A router outlet emits an activate event when a new component is instantiated,
     * and a deactivate event when a component is destroyed.
     *
     * ```
     * <router-outlet
     *   (activate)='onActivate($event)'
     *   (deactivate)='onDeactivate($event)'></router-outlet>
     * ```
     * \@ngModule RouterModule
     *
     * \@publicApi
     */
    class RouterOutlet {
        /**
         * @param {?} parentContexts
         * @param {?} location
         * @param {?} resolver
         * @param {?} name
         * @param {?} changeDetector
         */
        constructor(parentContexts, location, resolver, name, changeDetector) {
            this.parentContexts = parentContexts;
            this.location = location;
            this.resolver = resolver;
            this.changeDetector = changeDetector;
            this.activated = null;
            this._activatedRoute = null;
            this.activateEvents = new EventEmitter();
            this.deactivateEvents = new EventEmitter();
            this.name = name || PRIMARY_OUTLET;
            parentContexts.onChildOutletCreated(this.name, this);
        }
        /**
         * @return {?}
         */
        ngOnDestroy() {
            this.parentContexts.onChildOutletDestroyed(this.name);
        }
        /**
         * @return {?}
         */
        ngOnInit() {
            if (!this.activated) {
                // If the outlet was not instantiated at the time the route got activated we need to populate
                // the outlet when it is initialized (ie inside a NgIf)
                /** @type {?} */
                const context = this.parentContexts.getContext(this.name);
                if (context && context.route) {
                    if (context.attachRef) {
                        // `attachRef` is populated when there is an existing component to mount
                        this.attach(context.attachRef, context.route);
                    }
                    else {
                        // otherwise the component defined in the configuration is created
                        this.activateWith(context.route, context.resolver || null);
                    }
                }
            }
        }
        /**
         * @return {?}
         */
        get isActivated() {
            return !!this.activated;
        }
        /**
         * @return {?}
         */
        get component() {
            if (!this.activated)
                throw new Error('Outlet is not activated');
            return this.activated.instance;
        }
        /**
         * @return {?}
         */
        get activatedRoute() {
            if (!this.activated)
                throw new Error('Outlet is not activated');
            return (/** @type {?} */ (this._activatedRoute));
        }
        /**
         * @return {?}
         */
        get activatedRouteData() {
            if (this._activatedRoute) {
                return this._activatedRoute.snapshot.data;
            }
            return {};
        }
        /**
         * Called when the `RouteReuseStrategy` instructs to detach the subtree
         * @return {?}
         */
        detach() {
            if (!this.activated)
                throw new Error('Outlet is not activated');
            this.location.detach();
            /** @type {?} */
            const cmp = this.activated;
            this.activated = null;
            this._activatedRoute = null;
            return cmp;
        }
        /**
         * Called when the `RouteReuseStrategy` instructs to re-attach a previously detached subtree
         * @param {?} ref
         * @param {?} activatedRoute
         * @return {?}
         */
        attach(ref, activatedRoute) {
            this.activated = ref;
            this._activatedRoute = activatedRoute;
            this.location.insert(ref.hostView);
        }
        /**
         * @return {?}
         */
        deactivate() {
            if (this.activated) {
                /** @type {?} */
                const c = this.component;
                this.activated.destroy();
                this.activated = null;
                this._activatedRoute = null;
                this.deactivateEvents.emit(c);
            }
        }
        /**
         * @param {?} activatedRoute
         * @param {?} resolver
         * @return {?}
         */
        activateWith(activatedRoute, resolver) {
            if (this.isActivated) {
                throw new Error('Cannot activate an already activated outlet');
            }
            this._activatedRoute = activatedRoute;
            /** @type {?} */
            const snapshot = activatedRoute._futureSnapshot;
            /** @type {?} */
            const component = (/** @type {?} */ ((/** @type {?} */ (snapshot.routeConfig)).component));
            resolver = resolver || this.resolver;
            /** @type {?} */
            const factory = resolver.resolveComponentFactory(component);
            /** @type {?} */
            const childContexts = this.parentContexts.getOrCreateContext(this.name).children;
            /** @type {?} */
            const injector = new OutletInjector(activatedRoute, childContexts, this.location.injector);
            this.activated = this.location.createComponent(factory, this.location.length, injector);
            // Calling `markForCheck` to make sure we will run the change detection when the
            // `RouterOutlet` is inside a `ChangeDetectionStrategy.OnPush` component.
            this.changeDetector.markForCheck();
            this.activateEvents.emit(this.activated.instance);
        }
    }
    RouterOutlet.decorators = [
        { type: Directive, args: [{ selector: 'router-outlet', exportAs: 'outlet' },] },
    ];
    /** @nocollapse */
    RouterOutlet.ctorParameters = () => [
        { type: ChildrenOutletContexts },
        { type: ViewContainerRef },
        { type: ComponentFactoryResolver },
        { type: String, decorators: [{ type: Attribute, args: ['name',] }] },
        { type: ChangeDetectorRef }
    ];
    RouterOutlet.propDecorators = {
        activateEvents: [{ type: Output, args: ['activate',] }],
        deactivateEvents: [{ type: Output, args: ['deactivate',] }]
    };
    /** @nocollapse */ RouterOutlet.ɵfac = function RouterOutlet_Factory(t) { return new (t || RouterOutlet)(i0.ɵɵdirectiveInject(i1.ChildrenOutletContexts), i0.ɵɵdirectiveInject(i0.ViewContainerRef), i0.ɵɵdirectiveInject(i0.ComponentFactoryResolver), i0.ɵɵinjectAttribute('name'), i0.ɵɵdirectiveInject(i0.ChangeDetectorRef)); };
    /** @nocollapse */ RouterOutlet.ɵdir = i0.ɵɵdefineDirective({ type: RouterOutlet, selectors: [["router-outlet"]], outputs: { activateEvents: "activate", deactivateEvents: "deactivate" }, exportAs: ["outlet"] });
    return RouterOutlet;
})();
export { RouterOutlet };
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RouterOutlet, [{
        type: Directive,
        args: [{ selector: 'router-outlet', exportAs: 'outlet' }]
    }], function () { return [{ type: i1.ChildrenOutletContexts }, { type: i0.ViewContainerRef }, { type: i0.ComponentFactoryResolver }, { type: undefined, decorators: [{
                type: Attribute,
                args: ['name']
            }] }, { type: i0.ChangeDetectorRef }]; }, { activateEvents: [{
            type: Output,
            args: ['activate']
        }], deactivateEvents: [{
            type: Output,
            args: ['deactivate']
        }] }); })();
if (false) {
    /**
     * @type {?}
     * @private
     */
    RouterOutlet.prototype.activated;
    /**
     * @type {?}
     * @private
     */
    RouterOutlet.prototype._activatedRoute;
    /**
     * @type {?}
     * @private
     */
    RouterOutlet.prototype.name;
    /** @type {?} */
    RouterOutlet.prototype.activateEvents;
    /** @type {?} */
    RouterOutlet.prototype.deactivateEvents;
    /**
     * @type {?}
     * @private
     */
    RouterOutlet.prototype.parentContexts;
    /**
     * @type {?}
     * @private
     */
    RouterOutlet.prototype.location;
    /**
     * @type {?}
     * @private
     */
    RouterOutlet.prototype.resolver;
    /**
     * @type {?}
     * @private
     */
    RouterOutlet.prototype.changeDetector;
}
class OutletInjector {
    /**
     * @param {?} route
     * @param {?} childContexts
     * @param {?} parent
     */
    constructor(route, childContexts, parent) {
        this.route = route;
        this.childContexts = childContexts;
        this.parent = parent;
    }
    /**
     * @param {?} token
     * @param {?=} notFoundValue
     * @return {?}
     */
    get(token, notFoundValue) {
        if (token === ActivatedRoute) {
            return this.route;
        }
        if (token === ChildrenOutletContexts) {
            return this.childContexts;
        }
        return this.parent.get(token, notFoundValue);
    }
}
if (false) {
    /**
     * @type {?}
     * @private
     */
    OutletInjector.prototype.route;
    /**
     * @type {?}
     * @private
     */
    OutletInjector.prototype.childContexts;
    /**
     * @type {?}
     * @private
     */
    OutletInjector.prototype.parent;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX291dGxldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBUUEsT0FBTyxFQUFDLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSx3QkFBd0IsRUFBZ0IsU0FBUyxFQUFFLFlBQVksRUFBK0IsTUFBTSxFQUFFLGdCQUFnQixFQUFDLE1BQU0sZUFBZSxDQUFDO0FBR25MLE9BQU8sRUFBQyxzQkFBc0IsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUMvQyxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sV0FBVyxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUE0QnpDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFBQSxNQUNhLFlBQVk7Ozs7Ozs7O1FBUXZCLFlBQ1ksY0FBc0MsRUFBVSxRQUEwQixFQUMxRSxRQUFrQyxFQUFxQixJQUFZLEVBQ25FLGNBQWlDO1lBRmpDLG1CQUFjLEdBQWQsY0FBYyxDQUF3QjtZQUFVLGFBQVEsR0FBUixRQUFRLENBQWtCO1lBQzFFLGFBQVEsR0FBUixRQUFRLENBQTBCO1lBQ2xDLG1CQUFjLEdBQWQsY0FBYyxDQUFtQjtZQVZyQyxjQUFTLEdBQTJCLElBQUksQ0FBQztZQUN6QyxvQkFBZSxHQUF3QixJQUFJLENBQUM7WUFHaEMsbUJBQWMsR0FBRyxJQUFJLFlBQVksRUFBTyxDQUFDO1lBQ3ZDLHFCQUFnQixHQUFHLElBQUksWUFBWSxFQUFPLENBQUM7WUFNL0QsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksY0FBYyxDQUFDO1lBQ25DLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxD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LE1BQU07d0VBVnRELFlBQVk7dUJBMUN6QjtLQW9KQztTQTFHWSxZQUFZO2tEQUFaLFlBQVk7Y0FEeEIsU0FBUztlQUFDLEVBQUMsUUFBUSxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFDOztzQkFXUCxTQUFTO3VCQUFDLE1BQU07O2tCQUxoRSxNQUFNO21CQUFDLFVBQVU7O2tCQUNqQixNQUFNO21CQUFDLFlBQVk7Ozs7Ozs7SUFMcEIsaUNBQWlEOzs7OztJQUNqRCx1Q0FBb0Q7Ozs7O0lBQ3BELDRCQUFxQjs7SUFFckIsc0NBQTZEOztJQUM3RCx3Q0FBaUU7Ozs7O0lBRzdELHNDQUE4Qzs7Ozs7SUFBRSxnQ0FBa0M7Ozs7O0lBQ2xGLGdDQUEwQzs7Ozs7SUFDMUMsc0NBQXlDOztBQWlHL0MsTUFBTSxjQUFjOzs7Ozs7SUFDbEIsWUFDWSxLQUFxQixFQUFVLGFBQXFDLEVBQ3BFLE1BQWdCO1FBRGhCLFVBQUssR0FBTCxLQUFLLENBQWdCO1FBQVUsa0JBQWEsR0FBYixhQUFhLENBQXdCO1FBQ3BFLFdBQU0sR0FBTixNQUFNLENBQVU7SUFBRyxDQUFDOzs7Ozs7SUFFaEMsR0FBRyxDQUFDLEtBQVUsRUFBRSxhQUFtQjtRQUNqQyxJQUFJLEtBQUssS0FBSyxjQUFjLEVBQUU7WUFDNUIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO1NBQ25CO1FBRUQsSUFBSSxLQUFLLEtBQUssc0JBQXNCLEVBQUU7WUFDcEMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDO1NBQzNCO1FBRUQsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDL0MsQ0FBQztDQUNGOzs7Ozs7SUFkSywrQkFBNkI7Ozs7O0lBQUUsdUNBQTZDOzs7OztJQUM1RSxnQ0FBd0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QXR0cmlidXRlLCBDaGFuZ2VEZXRlY3RvclJlZiwgQ29tcG9uZW50RmFjdG9yeVJlc29sdmVyLCBDb21wb25lbnRSZWYsIERpcmVjdGl2ZSwgRXZlbnRFbWl0dGVyLCBJbmplY3RvciwgT25EZXN0cm95LCBPbkluaXQsIE91dHB1dCwgVmlld0NvbnRhaW5lclJlZn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7RGF0YX0gZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0c30gZnJvbSAnLi4vcm91dGVyX291dGxldF9jb250ZXh0JztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGV9IGZyb20gJy4uL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BSSU1BUllfT1VUTEVUfSBmcm9tICcuLi9zaGFyZWQnO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEFjdHMgYXMgYSBwbGFjZWhvbGRlciB0aGF0IEFuZ3VsYXIgZHluYW1pY2FsbHkgZmlsbHMgYmFzZWQgb24gdGhlIGN1cnJlbnQgcm91dGVyIHN0YXRlLlxuICpcbiAqIEVhY2ggb3V0bGV0IGNhbiBoYXZlIGEgdW5pcXVlIG5hbWUsIGRldGVybWluZWQgYnkgdGhlIG9wdGlvbmFsIGBuYW1lYCBhdHRyaWJ1dGUuXG4gKiBUaGUgbmFtZSBjYW5ub3QgYmUgc2V0IG9yIGNoYW5nZWQgZHluYW1pY2FsbHkuIElmIG5vdCBzZXQsIGRlZmF1bHQgdmFsdWUgaXMgXCJwcmltYXJ5XCIuXG4gKlxuICogYGBgXG4gKiA8cm91dGVyLW91dGxldD48L3JvdXRlci1vdXRsZXQ+XG4gKiA8cm91dGVyLW91dGxldCBuYW1lPSdsZWZ0Jz48L3JvdXRlci1vdXRsZXQ+XG4gKiA8cm91dGVyLW91dGxldCBuYW1lPSdyaWdodCc+PC9yb3V0ZXItb3V0bGV0PlxuICogYGBgXG4gKlxuICogQSByb3V0ZXIgb3V0bGV0IGVtaXRzIGFuIGFjdGl2YXRlIGV2ZW50IHdoZW4gYSBuZXcgY29tcG9uZW50IGlzIGluc3RhbnRpYXRlZCxcbiAqIGFuZCBhIGRlYWN0aXZhdGUgZXZlbnQgd2hlbiBhIGNvbXBvbmVudCBpcyBkZXN0cm95ZWQuXG4gKlxuICogYGBgXG4gKiA8cm91dGVyLW91dGxldFxuICogICAoYWN0aXZhdGUpPSdvbkFjdGl2YXRlKCRldmVudCknXG4gKiAgIChkZWFjdGl2YXRlKT0nb25EZWFjdGl2YXRlKCRldmVudCknPjwvcm91dGVyLW91dGxldD5cbiAqIGBgYFxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQERpcmVjdGl2ZSh7c2VsZWN0b3I6ICdyb3V0ZXItb3V0bGV0JywgZXhwb3J0QXM6ICdvdXRsZXQnfSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJPdXRsZXQgaW1wbGVtZW50cyBPbkRlc3Ryb3ksIE9uSW5pdCB7XG4gIHByaXZhdGUgYWN0aXZhdGVkOiBDb21wb25lbnRSZWY8YW55PnxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBfYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlfG51bGwgPSBudWxsO1xuICBwcml2YXRlIG5hbWU6IHN0cmluZztcblxuICBAT3V0cHV0KCdhY3RpdmF0ZScpIGFjdGl2YXRlRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG4gIEBPdXRwdXQoJ2RlYWN0aXZhdGUnKSBkZWFjdGl2YXRlRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHBhcmVudENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLCBwcml2YXRlIGxvY2F0aW9uOiBWaWV3Q29udGFpbmVyUmVmLFxuICAgICAgcHJpdmF0ZSByZXNvbHZlcjogQ29tcG9uZW50RmFjdG9yeVJlc29sdmVyLCBAQXR0cmlidXRlKCduYW1lJykgbmFtZTogc3RyaW5nLFxuICAgICAgcHJpdmF0ZSBjaGFuZ2VEZXRlY3RvcjogQ2hhbmdlRGV0ZWN0b3JSZWYpIHtcbiAgICB0aGlzLm5hbWUgPSBuYW1lIHx8IFBSSU1BUllfT1VUTEVUO1xuICAgIHBhcmVudENvbnRleHRzLm9uQ2hpbGRPdXRsZXRDcmVhdGVkKHRoaXMubmFtZSwgdGhpcyk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLnBhcmVudENvbnRleHRzLm9uQ2hpbGRPdXRsZXREZXN0cm95ZWQodGhpcy5uYW1lKTtcbiAgfVxuXG4gIG5nT25Jbml0KCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5hY3RpdmF0ZWQpIHtcbiAgICAgIC8vIElmIHRoZSBvdXRsZXQgd2FzIG5vdCBpbnN0YW50aWF0ZWQgYXQgdGhlIHRpbWUgdGhlIHJvdXRlIGdvdCBhY3RpdmF0ZWQgd2UgbmVlZCB0byBwb3B1bGF0ZVxuICAgICAgLy8gdGhlIG91dGxldCB3aGVuIGl0IGlzIGluaXRpYWxpemVkIChpZSBpbnNpZGUgYSBOZ0lmKVxuICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMucGFyZW50Q29udGV4dHMuZ2V0Q29udGV4dCh0aGlzLm5hbWUpO1xuICAgICAgaWYgKGNvbnRleHQgJiYgY29udGV4dC5yb3V0ZSkge1xuICAgICAgICBpZiAoY29udGV4dC5hdHRhY2hSZWYpIHtcbiAgICAgICAgICAvLyBgYXR0YWNoUmVmYCBpcyBwb3B1bGF0ZWQgd2hlbiB0aGVyZSBpcyBhbiBleGlzdGluZyBjb21wb25lbnQgdG8gbW91bnRcbiAgICAgICAgICB0aGlzLmF0dGFjaChjb250ZXh0LmF0dGFjaFJlZiwgY29udGV4dC5yb3V0ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gb3RoZXJ3aXNlIHRoZSBjb21wb25lbnQgZGVmaW5lZCBpbiB0aGUgY29uZmlndXJhdGlvbiBpcyBjcmVhdGVkXG4gICAgICAgICAgdGhpcy5hY3RpdmF0ZVdpdGgoY29udGV4dC5yb3V0ZSwgY29udGV4dC5yZXNvbHZlciB8fCBudWxsKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldCBpc0FjdGl2YXRlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISF0aGlzLmFjdGl2YXRlZDtcbiAgfVxuXG4gIGdldCBjb21wb25lbnQoKTogT2JqZWN0IHtcbiAgICBpZiAoIXRoaXMuYWN0aXZhdGVkKSB0aHJvdyBuZXcgRXJyb3IoJ091dGxldCBpcyBub3QgYWN0aXZhdGVkJyk7XG4gICAgcmV0dXJuIHRoaXMuYWN0aXZhdGVkLmluc3RhbmNlO1xuICB9XG5cbiAgZ2V0IGFjdGl2YXRlZFJvdXRlKCk6IEFjdGl2YXRlZFJvdXRlIHtcbiAgICBpZiAoIXRoaXMuYWN0aXZhdGVkKSB0aHJvdyBuZXcgRXJyb3IoJ091dGxldCBpcyBub3QgYWN0aXZhdGVkJyk7XG4gICAgcmV0dXJuIHRoaXMuX2FjdGl2YXRlZFJvdXRlIGFzIEFjdGl2YXRlZFJvdXRlO1xuICB9XG5cbiAgZ2V0IGFjdGl2YXRlZFJvdXRlRGF0YSgpOiBEYXRhIHtcbiAgICBpZiAodGhpcy5fYWN0aXZhdGVkUm91dGUpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hY3RpdmF0ZWRSb3V0ZS5zbmFwc2hvdC5kYXRhO1xuICAgIH1cbiAgICByZXR1cm4ge307XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byBkZXRhY2ggdGhlIHN1YnRyZWVcbiAgICovXG4gIGRldGFjaCgpOiBDb21wb25lbnRSZWY8YW55PiB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZCkgdGhyb3cgbmV3IEVycm9yKCdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcpO1xuICAgIHRoaXMubG9jYXRpb24uZGV0YWNoKCk7XG4gICAgY29uc3QgY21wID0gdGhpcy5hY3RpdmF0ZWQ7XG4gICAgdGhpcy5hY3RpdmF0ZWQgPSBudWxsO1xuICAgIHRoaXMuX2FjdGl2YXRlZFJvdXRlID0gbnVsbDtcbiAgICByZXR1cm4gY21wO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gcmUtYXR0YWNoIGEgcHJldmlvdXNseSBkZXRhY2hlZCBzdWJ0cmVlXG4gICAqL1xuICBhdHRhY2gocmVmOiBDb21wb25lbnRSZWY8YW55PiwgYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7XG4gICAgdGhpcy5hY3RpdmF0ZWQgPSByZWY7XG4gICAgdGhpcy5fYWN0aXZhdGVkUm91dGUgPSBhY3RpdmF0ZWRSb3V0ZTtcbiAgICB0aGlzLmxvY2F0aW9uLmluc2VydChyZWYuaG9zdFZpZXcpO1xuICB9XG5cbiAgZGVhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5hY3RpdmF0ZWQpIHtcbiAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbXBvbmVudDtcbiAgICAgIHRoaXMuYWN0aXZhdGVkLmRlc3Ryb3koKTtcbiAgICAgIHRoaXMuYWN0aXZhdGVkID0gbnVsbDtcbiAgICAgIHRoaXMuX2FjdGl2YXRlZFJvdXRlID0gbnVsbDtcbiAgICAgIHRoaXMuZGVhY3RpdmF0ZUV2ZW50cy5lbWl0KGMpO1xuICAgIH1cbiAgfVxuXG4gIGFjdGl2YXRlV2l0aChhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGUsIHJlc29sdmVyOiBDb21wb25lbnRGYWN0b3J5UmVzb2x2ZXJ8bnVsbCkge1xuICAgIGlmICh0aGlzLmlzQWN0aXZhdGVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBhY3RpdmF0ZSBhbiBhbHJlYWR5IGFjdGl2YXRlZCBvdXRsZXQnKTtcbiAgICB9XG4gICAgdGhpcy5fYWN0aXZhdGVkUm91dGUgPSBhY3RpdmF0ZWRSb3V0ZTtcbiAgICBjb25zdCBzbmFwc2hvdCA9IGFjdGl2YXRlZFJvdXRlLl9mdXR1cmVTbmFwc2hvdDtcbiAgICBjb25zdCBjb21wb25lbnQgPSA8YW55PnNuYXBzaG90LnJvdXRlQ29uZmlnIS5jb21wb25lbnQ7XG4gICAgcmVzb2x2ZXIgPSByZXNvbHZlciB8fCB0aGlzLnJlc29sdmVyO1xuICAgIGNvbnN0IGZhY3RvcnkgPSByZXNvbHZlci5yZXNvbHZlQ29tcG9uZW50RmFjdG9yeShjb21wb25lbnQpO1xuICAgIGNvbnN0IGNoaWxkQ29udGV4dHMgPSB0aGlzLnBhcmVudENvbnRleHRzLmdldE9yQ3JlYXRlQ29udGV4dCh0aGlzLm5hbWUpLmNoaWxkcmVuO1xuICAgIGNvbnN0IGluamVjdG9yID0gbmV3IE91dGxldEluamVjdG9yKGFjdGl2YXRlZFJvdXRlLCBjaGlsZENvbnRleHRzLCB0aGlzLmxvY2F0aW9uLmluamVjdG9yKTtcbiAgICB0aGlzLmFjdGl2YXRlZCA9IHRoaXMubG9jYXRpb24uY3JlYXRlQ29tcG9uZW50KGZhY3RvcnksIHRoaXMubG9jYXRpb24ubGVuZ3RoLCBpbmplY3Rvcik7XG4gICAgLy8gQ2FsbGluZyBgbWFya0ZvckNoZWNrYCB0byBtYWtlIHN1cmUgd2Ugd2lsbCBydW4gdGhlIGNoYW5nZSBkZXRlY3Rpb24gd2hlbiB0aGVcbiAgICAvLyBgUm91dGVyT3V0bGV0YCBpcyBpbnNpZGUgYSBgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoYCBjb21wb25lbnQuXG4gICAgdGhpcy5jaGFuZ2VEZXRlY3Rvci5tYXJrRm9yQ2hlY2soKTtcbiAgICB0aGlzLmFjdGl2YXRlRXZlbnRzLmVtaXQodGhpcy5hY3RpdmF0ZWQuaW5zdGFuY2UpO1xuICB9XG59XG5cbmNsYXNzIE91dGxldEluamVjdG9yIGltcGxlbWVudHMgSW5qZWN0b3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm91dGU6IEFjdGl2YXRlZFJvdXRlLCBwcml2YXRlIGNoaWxkQ29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsXG4gICAgICBwcml2YXRlIHBhcmVudDogSW5qZWN0b3IpIHt9XG5cbiAgZ2V0KHRva2VuOiBhbnksIG5vdEZvdW5kVmFsdWU/OiBhbnkpOiBhbnkge1xuICAgIGlmICh0b2tlbiA9PT0gQWN0aXZhdGVkUm91dGUpIHtcbiAgICAgIHJldHVybiB0aGlzLnJvdXRlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbiA9PT0gQ2hpbGRyZW5PdXRsZXRDb250ZXh0cykge1xuICAgICAgcmV0dXJuIHRoaXMuY2hpbGRDb250ZXh0cztcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5wYXJlbnQuZ2V0KHRva2VuLCBub3RGb3VuZFZhbHVlKTtcbiAgfVxufVxuIl19