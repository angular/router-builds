import { Attribute, ChangeDetectorRef, ComponentFactoryResolver, Directive, EventEmitter, Output, ViewContainerRef } from '@angular/core';
import { ChildrenOutletContexts } from '../router_outlet_context';
import { ActivatedRoute } from '../router_state';
import { PRIMARY_OUTLET } from '../shared';
import * as i0 from "@angular/core";
/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,missingReturn,uselessCode} checked by tsc
 */
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
 * ```
 * <router-outlet></router-outlet>
 * <router-outlet name='left'></router-outlet>
 * <router-outlet name='right'></router-outlet>
 * ```
 *
 * A router outlet will emit an activate event any time a new component is being instantiated,
 * and a deactivate event when it is being destroyed.
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
export class RouterOutlet {
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
    ngOnDestroy() { this.parentContexts.onChildOutletDestroyed(this.name); }
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
    get isActivated() { return !!this.activated; }
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
RouterOutlet.ngDirectiveDef = i0.ɵdefineDirective({ type: RouterOutlet, selectors: [["router-outlet"]], factory: function RouterOutlet_Factory(t) { return new (t || RouterOutlet)(i0.ɵdirectiveInject(ChildrenOutletContexts), i0.ɵdirectiveInject(ViewContainerRef), i0.ɵdirectiveInject(ComponentFactoryResolver), i0.ɵinjectAttribute('name'), i0.ɵdirectiveInject(ChangeDetectorRef)); }, outputs: { activateEvents: "activate", deactivateEvents: "deactivate" }, exportAs: "outlet" });
/*@__PURE__*/ i0.ɵsetClassMetadata(RouterOutlet, [{
        type: Directive,
        args: [{ selector: 'router-outlet', exportAs: 'outlet' }]
    }], function () { return [{
        type: ChildrenOutletContexts
    }, {
        type: ViewContainerRef
    }, {
        type: ComponentFactoryResolver
    }, {
        type: undefined,
        decorators: [{
                type: Attribute,
                args: ['name']
            }]
    }, {
        type: ChangeDetectorRef
    }]; }, { activateEvents: [{
            type: Output,
            args: ['activate']
        }], deactivateEvents: [{
            type: Output,
            args: ['deactivate']
        }] });
if (false) {
    /** @type {?} */
    RouterOutlet.prototype.activated;
    /** @type {?} */
    RouterOutlet.prototype._activatedRoute;
    /** @type {?} */
    RouterOutlet.prototype.name;
    /** @type {?} */
    RouterOutlet.prototype.activateEvents;
    /** @type {?} */
    RouterOutlet.prototype.deactivateEvents;
    /** @type {?} */
    RouterOutlet.prototype.parentContexts;
    /** @type {?} */
    RouterOutlet.prototype.location;
    /** @type {?} */
    RouterOutlet.prototype.resolver;
    /** @type {?} */
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
    /** @type {?} */
    OutletInjector.prototype.route;
    /** @type {?} */
    OutletInjector.prototype.childContexts;
    /** @type {?} */
    OutletInjector.prototype.parent;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX291dGxldC5qcyIsInNvdXJjZVJvb3QiOiIuLi8uLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3JvdXRlci9zcmMvZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQVFBLE9BQU8sRUFBQyxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsd0JBQXdCLEVBQWdCLFNBQVMsRUFBRSxZQUFZLEVBQStCLE1BQU0sRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUduTCxPQUFPLEVBQUMsc0JBQXNCLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNoRSxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLFdBQVcsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBMEJ6QyxNQUFNLE9BQU8sWUFBWTs7Ozs7Ozs7SUFRdkIsWUFDWSxjQUFzQyxFQUFVLFFBQTBCLEVBQzFFLFFBQWtDLEVBQXFCLElBQVksRUFDbkUsY0FBaUM7UUFGakMsbUJBQWMsR0FBZCxjQUFjLENBQXdCO1FBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBa0I7UUFDMUUsYUFBUSxHQUFSLFFBQVEsQ0FBMEI7UUFDbEMsbUJBQWMsR0FBZCxjQUFjLENBQW1CO1FBVnJDLGNBQVMsR0FBMkIsSUFBSSxDQUFDO1FBQ3pDLG9CQUFlLEdBQXdCLElBQUksQ0FBQztRQUdoQyxtQkFBYyxHQUFHLElBQUksWUFBWSxFQUFPLENBQUM7UUFDdkMscUJBQWdCLEdBQUcsSUFBSSxZQUFZLEVBQU8sQ0FBQztRQU0vRCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxjQUFjLENBQUM7UUFDbkMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdkQsQ0FBQzs7OztJQUVELFdBQVcsS0FBVyxJQUFJLENBQUMsY0FB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aUI7bUNBWGxDLFlBQVk7Y0FEeEIsU0FBUztlQUFDLEVBQUMsUUFBUSxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFDOztjQVU1QixzQkFBc0I7O2NBQW9CLGdCQUFnQjs7Y0FDaEUsd0JBQXdCOzs7O3NCQUFHLFNBQVM7dUJBQUMsTUFBTTs7O2NBQ3JDLGlCQUFpQjs7a0JBTjVDLE1BQU07bUJBQUMsVUFBVTs7a0JBQ2pCLE1BQU07bUJBQUMsWUFBWTs7OztJQUxwQixpQ0FBaUQ7O0lBQ2pELHVDQUFvRDs7SUFDcEQsNEJBQXFCOztJQUVyQixzQ0FBNkQ7O0lBQzdELHdDQUFpRTs7SUFHN0Qsc0NBQThDOztJQUFFLGdDQUFrQzs7SUFDbEYsZ0NBQTBDOztJQUMxQyxzQ0FBeUM7O0FBNkYvQyxNQUFNLGNBQWM7Ozs7OztJQUNsQixZQUNZLEtBQXFCLEVBQVUsYUFBcUMsRUFDcEUsTUFBZ0I7UUFEaEIsVUFBSyxHQUFMLEtBQUssQ0FBZ0I7UUFBVSxrQkFBYSxHQUFiLGFBQWEsQ0FBd0I7UUFDcEUsV0FBTSxHQUFOLE1BQU0sQ0FBVTtJQUFHLENBQUM7Ozs7OztJQUVoQyxHQUFHLENBQUMsS0FBVSxFQUFFLGFBQW1CO1FBQ2pDLElBQUksS0FBSyxLQUFLLGNBQWMsRUFBRTtZQUM1QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7U0FDbkI7UUFFRCxJQUFJLEtBQUssS0FBSyxzQkFBc0IsRUFBRTtZQUNwQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUM7U0FDM0I7UUFFRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztJQUMvQyxDQUFDO0NBQ0Y7OztJQWRLLCtCQUE2Qjs7SUFBRSx1Q0FBNkM7O0lBQzVFLGdDQUF3QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGUsIENoYW5nZURldGVjdG9yUmVmLCBDb21wb25lbnRGYWN0b3J5UmVzb2x2ZXIsIENvbXBvbmVudFJlZiwgRGlyZWN0aXZlLCBFdmVudEVtaXR0ZXIsIEluamVjdG9yLCBPbkRlc3Ryb3ksIE9uSW5pdCwgT3V0cHV0LCBWaWV3Q29udGFpbmVyUmVmfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHtEYXRhfSBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzfSBmcm9tICcuLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZX0gZnJvbSAnLi4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UFJJTUFSWV9PVVRMRVR9IGZyb20gJy4uL3NoYXJlZCc7XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQWN0cyBhcyBhIHBsYWNlaG9sZGVyIHRoYXQgQW5ndWxhciBkeW5hbWljYWxseSBmaWxscyBiYXNlZCBvbiB0aGUgY3VycmVudCByb3V0ZXIgc3RhdGUuXG4gKlxuICogYGBgXG4gKiA8cm91dGVyLW91dGxldD48L3JvdXRlci1vdXRsZXQ+XG4gKiA8cm91dGVyLW91dGxldCBuYW1lPSdsZWZ0Jz48L3JvdXRlci1vdXRsZXQ+XG4gKiA8cm91dGVyLW91dGxldCBuYW1lPSdyaWdodCc+PC9yb3V0ZXItb3V0bGV0PlxuICogYGBgXG4gKlxuICogQSByb3V0ZXIgb3V0bGV0IHdpbGwgZW1pdCBhbiBhY3RpdmF0ZSBldmVudCBhbnkgdGltZSBhIG5ldyBjb21wb25lbnQgaXMgYmVpbmcgaW5zdGFudGlhdGVkLFxuICogYW5kIGEgZGVhY3RpdmF0ZSBldmVudCB3aGVuIGl0IGlzIGJlaW5nIGRlc3Ryb3llZC5cbiAqXG4gKiBgYGBcbiAqIDxyb3V0ZXItb3V0bGV0XG4gKiAgIChhY3RpdmF0ZSk9J29uQWN0aXZhdGUoJGV2ZW50KSdcbiAqICAgKGRlYWN0aXZhdGUpPSdvbkRlYWN0aXZhdGUoJGV2ZW50KSc+PC9yb3V0ZXItb3V0bGV0PlxuICogYGBgXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ARGlyZWN0aXZlKHtzZWxlY3RvcjogJ3JvdXRlci1vdXRsZXQnLCBleHBvcnRBczogJ291dGxldCd9KVxuZXhwb3J0IGNsYXNzIFJvdXRlck91dGxldCBpbXBsZW1lbnRzIE9uRGVzdHJveSwgT25Jbml0IHtcbiAgcHJpdmF0ZSBhY3RpdmF0ZWQ6IENvbXBvbmVudFJlZjxhbnk+fG51bGwgPSBudWxsO1xuICBwcml2YXRlIF9hY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGV8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgbmFtZTogc3RyaW5nO1xuXG4gIEBPdXRwdXQoJ2FjdGl2YXRlJykgYWN0aXZhdGVFdmVudHMgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcbiAgQE91dHB1dCgnZGVhY3RpdmF0ZScpIGRlYWN0aXZhdGVFdmVudHMgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcGFyZW50Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIHByaXZhdGUgbG9jYXRpb246IFZpZXdDb250YWluZXJSZWYsXG4gICAgICBwcml2YXRlIHJlc29sdmVyOiBDb21wb25lbnRGYWN0b3J5UmVzb2x2ZXIsIEBBdHRyaWJ1dGUoJ25hbWUnKSBuYW1lOiBzdHJpbmcsXG4gICAgICBwcml2YXRlIGNoYW5nZURldGVjdG9yOiBDaGFuZ2VEZXRlY3RvclJlZikge1xuICAgIHRoaXMubmFtZSA9IG5hbWUgfHwgUFJJTUFSWV9PVVRMRVQ7XG4gICAgcGFyZW50Q29udGV4dHMub25DaGlsZE91dGxldENyZWF0ZWQodGhpcy5uYW1lLCB0aGlzKTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQgeyB0aGlzLnBhcmVudENvbnRleHRzLm9uQ2hpbGRPdXRsZXREZXN0cm95ZWQodGhpcy5uYW1lKTsgfVxuXG4gIG5nT25Jbml0KCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5hY3RpdmF0ZWQpIHtcbiAgICAgIC8vIElmIHRoZSBvdXRsZXQgd2FzIG5vdCBpbnN0YW50aWF0ZWQgYXQgdGhlIHRpbWUgdGhlIHJvdXRlIGdvdCBhY3RpdmF0ZWQgd2UgbmVlZCB0byBwb3B1bGF0ZVxuICAgICAgLy8gdGhlIG91dGxldCB3aGVuIGl0IGlzIGluaXRpYWxpemVkIChpZSBpbnNpZGUgYSBOZ0lmKVxuICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMucGFyZW50Q29udGV4dHMuZ2V0Q29udGV4dCh0aGlzLm5hbWUpO1xuICAgICAgaWYgKGNvbnRleHQgJiYgY29udGV4dC5yb3V0ZSkge1xuICAgICAgICBpZiAoY29udGV4dC5hdHRhY2hSZWYpIHtcbiAgICAgICAgICAvLyBgYXR0YWNoUmVmYCBpcyBwb3B1bGF0ZWQgd2hlbiB0aGVyZSBpcyBhbiBleGlzdGluZyBjb21wb25lbnQgdG8gbW91bnRcbiAgICAgICAgICB0aGlzLmF0dGFjaChjb250ZXh0LmF0dGFjaFJlZiwgY29udGV4dC5yb3V0ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gb3RoZXJ3aXNlIHRoZSBjb21wb25lbnQgZGVmaW5lZCBpbiB0aGUgY29uZmlndXJhdGlvbiBpcyBjcmVhdGVkXG4gICAgICAgICAgdGhpcy5hY3RpdmF0ZVdpdGgoY29udGV4dC5yb3V0ZSwgY29udGV4dC5yZXNvbHZlciB8fCBudWxsKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldCBpc0FjdGl2YXRlZCgpOiBib29sZWFuIHsgcmV0dXJuICEhdGhpcy5hY3RpdmF0ZWQ7IH1cblxuICBnZXQgY29tcG9uZW50KCk6IE9iamVjdCB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZCkgdGhyb3cgbmV3IEVycm9yKCdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcpO1xuICAgIHJldHVybiB0aGlzLmFjdGl2YXRlZC5pbnN0YW5jZTtcbiAgfVxuXG4gIGdldCBhY3RpdmF0ZWRSb3V0ZSgpOiBBY3RpdmF0ZWRSb3V0ZSB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZCkgdGhyb3cgbmV3IEVycm9yKCdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcpO1xuICAgIHJldHVybiB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSBhcyBBY3RpdmF0ZWRSb3V0ZTtcbiAgfVxuXG4gIGdldCBhY3RpdmF0ZWRSb3V0ZURhdGEoKTogRGF0YSB7XG4gICAgaWYgKHRoaXMuX2FjdGl2YXRlZFJvdXRlKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWN0aXZhdGVkUm91dGUuc25hcHNob3QuZGF0YTtcbiAgICB9XG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZSBzdWJ0cmVlXG4gICAqL1xuICBkZXRhY2goKTogQ29tcG9uZW50UmVmPGFueT4ge1xuICAgIGlmICghdGhpcy5hY3RpdmF0ZWQpIHRocm93IG5ldyBFcnJvcignT3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQnKTtcbiAgICB0aGlzLmxvY2F0aW9uLmRldGFjaCgpO1xuICAgIGNvbnN0IGNtcCA9IHRoaXMuYWN0aXZhdGVkO1xuICAgIHRoaXMuYWN0aXZhdGVkID0gbnVsbDtcbiAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IG51bGw7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIHJlLWF0dGFjaCBhIHByZXZpb3VzbHkgZGV0YWNoZWQgc3VidHJlZVxuICAgKi9cbiAgYXR0YWNoKHJlZjogQ29tcG9uZW50UmVmPGFueT4sIGFjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSkge1xuICAgIHRoaXMuYWN0aXZhdGVkID0gcmVmO1xuICAgIHRoaXMuX2FjdGl2YXRlZFJvdXRlID0gYWN0aXZhdGVkUm91dGU7XG4gICAgdGhpcy5sb2NhdGlvbi5pbnNlcnQocmVmLmhvc3RWaWV3KTtcbiAgfVxuXG4gIGRlYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuYWN0aXZhdGVkKSB7XG4gICAgICBjb25zdCBjID0gdGhpcy5jb21wb25lbnQ7XG4gICAgICB0aGlzLmFjdGl2YXRlZC5kZXN0cm95KCk7XG4gICAgICB0aGlzLmFjdGl2YXRlZCA9IG51bGw7XG4gICAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IG51bGw7XG4gICAgICB0aGlzLmRlYWN0aXZhdGVFdmVudHMuZW1pdChjKTtcbiAgICB9XG4gIH1cblxuICBhY3RpdmF0ZVdpdGgoYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlLCByZXNvbHZlcjogQ29tcG9uZW50RmFjdG9yeVJlc29sdmVyfG51bGwpIHtcbiAgICBpZiAodGhpcy5pc0FjdGl2YXRlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgYWN0aXZhdGUgYW4gYWxyZWFkeSBhY3RpdmF0ZWQgb3V0bGV0Jyk7XG4gICAgfVxuICAgIHRoaXMuX2FjdGl2YXRlZFJvdXRlID0gYWN0aXZhdGVkUm91dGU7XG4gICAgY29uc3Qgc25hcHNob3QgPSBhY3RpdmF0ZWRSb3V0ZS5fZnV0dXJlU25hcHNob3Q7XG4gICAgY29uc3QgY29tcG9uZW50ID0gPGFueT5zbmFwc2hvdC5yb3V0ZUNvbmZpZyAhLmNvbXBvbmVudDtcbiAgICByZXNvbHZlciA9IHJlc29sdmVyIHx8IHRoaXMucmVzb2x2ZXI7XG4gICAgY29uc3QgZmFjdG9yeSA9IHJlc29sdmVyLnJlc29sdmVDb21wb25lbnRGYWN0b3J5KGNvbXBvbmVudCk7XG4gICAgY29uc3QgY2hpbGRDb250ZXh0cyA9IHRoaXMucGFyZW50Q29udGV4dHMuZ2V0T3JDcmVhdGVDb250ZXh0KHRoaXMubmFtZSkuY2hpbGRyZW47XG4gICAgY29uc3QgaW5qZWN0b3IgPSBuZXcgT3V0bGV0SW5qZWN0b3IoYWN0aXZhdGVkUm91dGUsIGNoaWxkQ29udGV4dHMsIHRoaXMubG9jYXRpb24uaW5qZWN0b3IpO1xuICAgIHRoaXMuYWN0aXZhdGVkID0gdGhpcy5sb2NhdGlvbi5jcmVhdGVDb21wb25lbnQoZmFjdG9yeSwgdGhpcy5sb2NhdGlvbi5sZW5ndGgsIGluamVjdG9yKTtcbiAgICAvLyBDYWxsaW5nIGBtYXJrRm9yQ2hlY2tgIHRvIG1ha2Ugc3VyZSB3ZSB3aWxsIHJ1biB0aGUgY2hhbmdlIGRldGVjdGlvbiB3aGVuIHRoZVxuICAgIC8vIGBSb3V0ZXJPdXRsZXRgIGlzIGluc2lkZSBhIGBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2hgIGNvbXBvbmVudC5cbiAgICB0aGlzLmNoYW5nZURldGVjdG9yLm1hcmtGb3JDaGVjaygpO1xuICAgIHRoaXMuYWN0aXZhdGVFdmVudHMuZW1pdCh0aGlzLmFjdGl2YXRlZC5pbnN0YW5jZSk7XG4gIH1cbn1cblxuY2xhc3MgT3V0bGV0SW5qZWN0b3IgaW1wbGVtZW50cyBJbmplY3RvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZTogQWN0aXZhdGVkUm91dGUsIHByaXZhdGUgY2hpbGRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyxcbiAgICAgIHByaXZhdGUgcGFyZW50OiBJbmplY3Rvcikge31cblxuICBnZXQodG9rZW46IGFueSwgbm90Rm91bmRWYWx1ZT86IGFueSk6IGFueSB7XG4gICAgaWYgKHRva2VuID09PSBBY3RpdmF0ZWRSb3V0ZSkge1xuICAgICAgcmV0dXJuIHRoaXMucm91dGU7XG4gICAgfVxuXG4gICAgaWYgKHRva2VuID09PSBDaGlsZHJlbk91dGxldENvbnRleHRzKSB7XG4gICAgICByZXR1cm4gdGhpcy5jaGlsZENvbnRleHRzO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnBhcmVudC5nZXQodG9rZW4sIG5vdEZvdW5kVmFsdWUpO1xuICB9XG59XG4iXX0=