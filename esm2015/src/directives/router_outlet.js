/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Attribute, ChangeDetectorRef, ComponentFactoryResolver, Directive, EventEmitter, Output, ViewContainerRef } from '@angular/core';
import { ChildrenOutletContexts } from '../router_outlet_context';
import { ActivatedRoute } from '../router_state';
import { PRIMARY_OUTLET } from '../shared';
import * as i0 from "@angular/core";
import * as i1 from "../router_outlet_context";
/**
 * @description
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
 * Named outlets can be the targets of secondary routes.
 * The `Route` object for a secondary route has an `outlet` property to identify the target outlet:
 *
 * `{path: <base-path>, component: <component>, outlet: <target_outlet_name>}`
 *
 * Using named outlets and secondary routes, you can target multiple outlets in
 * the same `RouterLink` directive.
 *
 * The router keeps track of separate branches in a navigation tree for each named outlet and
 * generates a representation of that tree in the URL.
 * The URL for a secondary route uses the following syntax to specify both the primary and secondary
 * routes at the same time:
 *
 * `http://base-path/primary-route-path(outlet-name:route-path)`
 *
 * A router outlet emits an activate event when a new component is instantiated,
 * and a deactivate event when a component is destroyed.
 *
 * ```
 * <router-outlet
 *   (activate)='onActivate($event)'
 *   (deactivate)='onDeactivate($event)'></router-outlet>
 * ```
 *
 * @see [Routing tutorial](guide/router-tutorial-toh#named-outlets "Example of a named
 * outlet and secondary route configuration").
 * @see `RouterLink`
 * @see `Route`
 * @ngModule RouterModule
 *
 * @publicApi
 */
export class RouterOutlet {
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
    /** @nodoc */
    ngOnDestroy() {
        this.parentContexts.onChildOutletDestroyed(this.name);
    }
    /** @nodoc */
    ngOnInit() {
        if (!this.activated) {
            // If the outlet was not instantiated at the time the route got activated we need to populate
            // the outlet when it is initialized (ie inside a NgIf)
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
    get isActivated() {
        return !!this.activated;
    }
    /**
     * @returns The currently activated component instance.
     * @throws An error if the outlet is not activated.
     */
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
    get activatedRouteData() {
        if (this._activatedRoute) {
            return this._activatedRoute.snapshot.data;
        }
        return {};
    }
    /**
     * Called when the `RouteReuseStrategy` instructs to detach the subtree
     */
    detach() {
        if (!this.activated)
            throw new Error('Outlet is not activated');
        this.location.detach();
        const cmp = this.activated;
        this.activated = null;
        this._activatedRoute = null;
        return cmp;
    }
    /**
     * Called when the `RouteReuseStrategy` instructs to re-attach a previously detached subtree
     */
    attach(ref, activatedRoute) {
        this.activated = ref;
        this._activatedRoute = activatedRoute;
        this.location.insert(ref.hostView);
    }
    deactivate() {
        if (this.activated) {
            const c = this.component;
            this.activated.destroy();
            this.activated = null;
            this._activatedRoute = null;
            this.deactivateEvents.emit(c);
        }
    }
    activateWith(activatedRoute, resolver) {
        if (this.isActivated) {
            throw new Error('Cannot activate an already activated outlet');
        }
        this._activatedRoute = activatedRoute;
        const snapshot = activatedRoute._futureSnapshot;
        const component = snapshot.routeConfig.component;
        resolver = resolver || this.resolver;
        const factory = resolver.resolveComponentFactory(component);
        const childContexts = this.parentContexts.getOrCreateContext(this.name).children;
        const injector = new OutletInjector(activatedRoute, childContexts, this.location.injector);
        this.activated = this.location.createComponent(factory, this.location.length, injector);
        // Calling `markForCheck` to make sure we will run the change detection when the
        // `RouterOutlet` is inside a `ChangeDetectionStrategy.OnPush` component.
        this.changeDetector.markForCheck();
        this.activateEvents.emit(this.activated.instance);
    }
}
RouterOutlet.ɵfac = function RouterOutlet_Factory(t) { return new (t || RouterOutlet)(i0.ɵɵdirectiveInject(i1.ChildrenOutletContexts), i0.ɵɵdirectiveInject(i0.ViewContainerRef), i0.ɵɵdirectiveInject(i0.ComponentFactoryResolver), i0.ɵɵinjectAttribute('name'), i0.ɵɵdirectiveInject(i0.ChangeDetectorRef)); };
RouterOutlet.ɵdir = i0.ɵɵdefineDirective({ type: RouterOutlet, selectors: [["router-outlet"]], outputs: { activateEvents: "activate", deactivateEvents: "deactivate" }, exportAs: ["outlet"] });
(function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(RouterOutlet, [{
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
class OutletInjector {
    constructor(route, childContexts, parent) {
        this.route = route;
        this.childContexts = childContexts;
        this.parent = parent;
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX291dGxldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsd0JBQXdCLEVBQWdCLFNBQVMsRUFBRSxZQUFZLEVBQStCLE1BQU0sRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUduTCxPQUFPLEVBQUMsc0JBQXNCLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNoRSxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLFdBQVcsQ0FBQzs7O0FBK0R6Qzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBNkNHO0FBRUgsTUFBTSxPQUFPLFlBQVk7SUFRdkIsWUFDWSxjQUFzQyxFQUFVLFFBQTBCLEVBQzFFLFFBQWtDLEVBQXFCLElBQVksRUFDbkUsY0FBaUM7UUFGakMsbUJBQWMsR0FBZCxjQUFjLENBQXdCO1FBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBa0I7UUFDMUUsYUFBUSxHQUFSLFFBQVEsQ0FBMEI7UUFDbEMsbUJBQWMsR0FBZCxjQUFjLENBQW1CO1FBVnJDLGNBQVMsR0FBMkIsSUFBSSxDQUFDO1FBQ3pDLG9CQUFlLEdBQXdCLElBQUksQ0FBQztRQUdoQyxtQkFBYyxHQUFHLElBQUksWUFBWSxFQUFPLENBQUM7UUFDdkMscUJBQWdCLEdBQUcsSUFBSSxZQUFZLEVBQU8sQ0FBQztRQU0vRCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxjQUFjLENBQUM7UUFDbkMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENB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QyxNQUFNO21CQUFDLFVBQVU7WUFDSSxnQkFBZ0I7a0JBQXJDLE1BQU07bUJBQUMsWUFBWTs7QUE0R3RCLE1BQU0sY0FBYztJQUNsQixZQUNZLEtBQXFCLEVBQVUsYUFBcUMsRUFDcEUsTUFBZ0I7UUFEaEIsVUFBSyxHQUFMLEtBQUssQ0FBZ0I7UUFBVSxrQkFBYSxHQUFiLGFBQWEsQ0FBd0I7UUFDcEUsV0FBTSxHQUFOLE1BQU0sQ0FBVTtJQUFHLENBQUM7SUFFaEMsR0FBRyxDQUFDLEtBQVUsRUFBRSxhQUFtQjtRQUNqQyxJQUFJLEtBQUssS0FBSyxjQUFjLEVBQUU7WUFDNUIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO1NBQ25CO1FBRUQsSUFBSSxLQUFLLEtBQUssc0JBQXNCLEVBQUU7WUFDcEMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDO1NBQzNCO1FBRUQsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDL0MsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QXR0cmlidXRlLCBDaGFuZ2VEZXRlY3RvclJlZiwgQ29tcG9uZW50RmFjdG9yeVJlc29sdmVyLCBDb21wb25lbnRSZWYsIERpcmVjdGl2ZSwgRXZlbnRFbWl0dGVyLCBJbmplY3RvciwgT25EZXN0cm95LCBPbkluaXQsIE91dHB1dCwgVmlld0NvbnRhaW5lclJlZn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7RGF0YX0gZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0c30gZnJvbSAnLi4vcm91dGVyX291dGxldF9jb250ZXh0JztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGV9IGZyb20gJy4uL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BSSU1BUllfT1VUTEVUfSBmcm9tICcuLi9zaGFyZWQnO1xuXG4vKipcbiAqIEFuIGludGVyZmFjZSB0aGF0IGRlZmluZXMgdGhlIGNvbnRyYWN0IGZvciBkZXZlbG9waW5nIGEgY29tcG9uZW50IG91dGxldCBmb3IgdGhlIGBSb3V0ZXJgLlxuICpcbiAqIEFuIG91dGxldCBhY3RzIGFzIGEgcGxhY2Vob2xkZXIgdGhhdCBBbmd1bGFyIGR5bmFtaWNhbGx5IGZpbGxzIGJhc2VkIG9uIHRoZSBjdXJyZW50IHJvdXRlciBzdGF0ZS5cbiAqXG4gKiBBIHJvdXRlciBvdXRsZXQgc2hvdWxkIHJlZ2lzdGVyIGl0c2VsZiB3aXRoIHRoZSBgUm91dGVyYCB2aWFcbiAqIGBDaGlsZHJlbk91dGxldENvbnRleHRzI29uQ2hpbGRPdXRsZXRDcmVhdGVkYCBhbmQgdW5yZWdpc3RlciB3aXRoXG4gKiBgQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyNvbkNoaWxkT3V0bGV0RGVzdHJveWVkYC4gV2hlbiB0aGUgYFJvdXRlcmAgaWRlbnRpZmllcyBhIG1hdGNoZWQgYFJvdXRlYCxcbiAqIGl0IGxvb2tzIGZvciBhIHJlZ2lzdGVyZWQgb3V0bGV0IGluIHRoZSBgQ2hpbGRyZW5PdXRsZXRDb250ZXh0c2AgYW5kIGFjdGl2YXRlcyBpdC5cbiAqXG4gKiBAc2VlIGBDaGlsZHJlbk91dGxldENvbnRleHRzYFxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJvdXRlck91dGxldENvbnRyYWN0IHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGdpdmVuIG91dGxldCBpcyBhY3RpdmF0ZWQuXG4gICAqXG4gICAqIEFuIG91dGxldCBpcyBjb25zaWRlcmVkIFwiYWN0aXZhdGVkXCIgaWYgaXQgaGFzIGFuIGFjdGl2ZSBjb21wb25lbnQuXG4gICAqL1xuICBpc0FjdGl2YXRlZDogYm9vbGVhbjtcblxuICAvKiogVGhlIGluc3RhbmNlIG9mIHRoZSBhY3RpdmF0ZWQgY29tcG9uZW50IG9yIGBudWxsYCBpZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQuICovXG4gIGNvbXBvbmVudDogT2JqZWN0fG51bGw7XG5cbiAgLyoqXG4gICAqIFRoZSBgRGF0YWAgb2YgdGhlIGBBY3RpdmF0ZWRSb3V0ZWAgc25hcHNob3QuXG4gICAqL1xuICBhY3RpdmF0ZWRSb3V0ZURhdGE6IERhdGE7XG5cbiAgLyoqXG4gICAqIFRoZSBgQWN0aXZhdGVkUm91dGVgIGZvciB0aGUgb3V0bGV0IG9yIGBudWxsYCBpZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQuXG4gICAqL1xuICBhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGV8bnVsbDtcblxuICAvKipcbiAgICogQ2FsbGVkIGJ5IHRoZSBgUm91dGVyYCB3aGVuIHRoZSBvdXRsZXQgc2hvdWxkIGFjdGl2YXRlIChjcmVhdGUgYSBjb21wb25lbnQpLlxuICAgKi9cbiAgYWN0aXZhdGVXaXRoKGFjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSwgcmVzb2x2ZXI6IENvbXBvbmVudEZhY3RvcnlSZXNvbHZlcnxudWxsKTogdm9pZDtcblxuICAvKipcbiAgICogQSByZXF1ZXN0IHRvIGRlc3Ryb3kgdGhlIGN1cnJlbnRseSBhY3RpdmF0ZWQgY29tcG9uZW50LlxuICAgKlxuICAgKiBXaGVuIGEgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5kaWNhdGVzIHRoYXQgYW4gYEFjdGl2YXRlZFJvdXRlYCBzaG91bGQgYmUgcmVtb3ZlZCBidXQgc3RvcmVkIGZvclxuICAgKiBsYXRlciByZS11c2UgcmF0aGVyIHRoYW4gZGVzdHJveWVkLCB0aGUgYFJvdXRlcmAgd2lsbCBjYWxsIGBkZXRhY2hgIGluc3RlYWQuXG4gICAqL1xuICBkZWFjdGl2YXRlKCk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZSBzdWJ0cmVlLlxuICAgKlxuICAgKiBUaGlzIGlzIHNpbWlsYXIgdG8gYGRlYWN0aXZhdGVgLCBidXQgdGhlIGFjdGl2YXRlZCBjb21wb25lbnQgc2hvdWxkIF9ub3RfIGJlIGRlc3Ryb3llZC5cbiAgICogSW5zdGVhZCwgaXQgaXMgcmV0dXJuZWQgc28gdGhhdCBpdCBjYW4gYmUgcmVhdHRhY2hlZCBsYXRlciB2aWEgdGhlIGBhdHRhY2hgIG1ldGhvZC5cbiAgICovXG4gIGRldGFjaCgpOiBDb21wb25lbnRSZWY8dW5rbm93bj47XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gcmUtYXR0YWNoIGEgcHJldmlvdXNseSBkZXRhY2hlZCBzdWJ0cmVlLlxuICAgKi9cbiAgYXR0YWNoKHJlZjogQ29tcG9uZW50UmVmPHVua25vd24+LCBhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGUpOiB2b2lkO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEFjdHMgYXMgYSBwbGFjZWhvbGRlciB0aGF0IEFuZ3VsYXIgZHluYW1pY2FsbHkgZmlsbHMgYmFzZWQgb24gdGhlIGN1cnJlbnQgcm91dGVyIHN0YXRlLlxuICpcbiAqIEVhY2ggb3V0bGV0IGNhbiBoYXZlIGEgdW5pcXVlIG5hbWUsIGRldGVybWluZWQgYnkgdGhlIG9wdGlvbmFsIGBuYW1lYCBhdHRyaWJ1dGUuXG4gKiBUaGUgbmFtZSBjYW5ub3QgYmUgc2V0IG9yIGNoYW5nZWQgZHluYW1pY2FsbHkuIElmIG5vdCBzZXQsIGRlZmF1bHQgdmFsdWUgaXMgXCJwcmltYXJ5XCIuXG4gKlxuICogYGBgXG4gKiA8cm91dGVyLW91dGxldD48L3JvdXRlci1vdXRsZXQ+XG4gKiA8cm91dGVyLW91dGxldCBuYW1lPSdsZWZ0Jz48L3JvdXRlci1vdXRsZXQ+XG4gKiA8cm91dGVyLW91dGxldCBuYW1lPSdyaWdodCc+PC9yb3V0ZXItb3V0bGV0PlxuICogYGBgXG4gKlxuICogTmFtZWQgb3V0bGV0cyBjYW4gYmUgdGhlIHRhcmdldHMgb2Ygc2Vjb25kYXJ5IHJvdXRlcy5cbiAqIFRoZSBgUm91dGVgIG9iamVjdCBmb3IgYSBzZWNvbmRhcnkgcm91dGUgaGFzIGFuIGBvdXRsZXRgIHByb3BlcnR5IHRvIGlkZW50aWZ5IHRoZSB0YXJnZXQgb3V0bGV0OlxuICpcbiAqIGB7cGF0aDogPGJhc2UtcGF0aD4sIGNvbXBvbmVudDogPGNvbXBvbmVudD4sIG91dGxldDogPHRhcmdldF9vdXRsZXRfbmFtZT59YFxuICpcbiAqIFVzaW5nIG5hbWVkIG91dGxldHMgYW5kIHNlY29uZGFyeSByb3V0ZXMsIHlvdSBjYW4gdGFyZ2V0IG11bHRpcGxlIG91dGxldHMgaW5cbiAqIHRoZSBzYW1lIGBSb3V0ZXJMaW5rYCBkaXJlY3RpdmUuXG4gKlxuICogVGhlIHJvdXRlciBrZWVwcyB0cmFjayBvZiBzZXBhcmF0ZSBicmFuY2hlcyBpbiBhIG5hdmlnYXRpb24gdHJlZSBmb3IgZWFjaCBuYW1lZCBvdXRsZXQgYW5kXG4gKiBnZW5lcmF0ZXMgYSByZXByZXNlbnRhdGlvbiBvZiB0aGF0IHRyZWUgaW4gdGhlIFVSTC5cbiAqIFRoZSBVUkwgZm9yIGEgc2Vjb25kYXJ5IHJvdXRlIHVzZXMgdGhlIGZvbGxvd2luZyBzeW50YXggdG8gc3BlY2lmeSBib3RoIHRoZSBwcmltYXJ5IGFuZCBzZWNvbmRhcnlcbiAqIHJvdXRlcyBhdCB0aGUgc2FtZSB0aW1lOlxuICpcbiAqIGBodHRwOi8vYmFzZS1wYXRoL3ByaW1hcnktcm91dGUtcGF0aChvdXRsZXQtbmFtZTpyb3V0ZS1wYXRoKWBcbiAqXG4gKiBBIHJvdXRlciBvdXRsZXQgZW1pdHMgYW4gYWN0aXZhdGUgZXZlbnQgd2hlbiBhIG5ldyBjb21wb25lbnQgaXMgaW5zdGFudGlhdGVkLFxuICogYW5kIGEgZGVhY3RpdmF0ZSBldmVudCB3aGVuIGEgY29tcG9uZW50IGlzIGRlc3Ryb3llZC5cbiAqXG4gKiBgYGBcbiAqIDxyb3V0ZXItb3V0bGV0XG4gKiAgIChhY3RpdmF0ZSk9J29uQWN0aXZhdGUoJGV2ZW50KSdcbiAqICAgKGRlYWN0aXZhdGUpPSdvbkRlYWN0aXZhdGUoJGV2ZW50KSc+PC9yb3V0ZXItb3V0bGV0PlxuICogYGBgXG4gKlxuICogQHNlZSBbUm91dGluZyB0dXRvcmlhbF0oZ3VpZGUvcm91dGVyLXR1dG9yaWFsLXRvaCNuYW1lZC1vdXRsZXRzIFwiRXhhbXBsZSBvZiBhIG5hbWVkXG4gKiBvdXRsZXQgYW5kIHNlY29uZGFyeSByb3V0ZSBjb25maWd1cmF0aW9uXCIpLlxuICogQHNlZSBgUm91dGVyTGlua2BcbiAqIEBzZWUgYFJvdXRlYFxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQERpcmVjdGl2ZSh7c2VsZWN0b3I6ICdyb3V0ZXItb3V0bGV0JywgZXhwb3J0QXM6ICdvdXRsZXQnfSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJPdXRsZXQgaW1wbGVtZW50cyBPbkRlc3Ryb3ksIE9uSW5pdCwgUm91dGVyT3V0bGV0Q29udHJhY3Qge1xuICBwcml2YXRlIGFjdGl2YXRlZDogQ29tcG9uZW50UmVmPGFueT58bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgX2FjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZXxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBuYW1lOiBzdHJpbmc7XG5cbiAgQE91dHB1dCgnYWN0aXZhdGUnKSBhY3RpdmF0ZUV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpO1xuICBAT3V0cHV0KCdkZWFjdGl2YXRlJykgZGVhY3RpdmF0ZUV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBwYXJlbnRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cywgcHJpdmF0ZSBsb2NhdGlvbjogVmlld0NvbnRhaW5lclJlZixcbiAgICAgIHByaXZhdGUgcmVzb2x2ZXI6IENvbXBvbmVudEZhY3RvcnlSZXNvbHZlciwgQEF0dHJpYnV0ZSgnbmFtZScpIG5hbWU6IHN0cmluZyxcbiAgICAgIHByaXZhdGUgY2hhbmdlRGV0ZWN0b3I6IENoYW5nZURldGVjdG9yUmVmKSB7XG4gICAgdGhpcy5uYW1lID0gbmFtZSB8fCBQUklNQVJZX09VVExFVDtcbiAgICBwYXJlbnRDb250ZXh0cy5vbkNoaWxkT3V0bGV0Q3JlYXRlZCh0aGlzLm5hbWUsIHRoaXMpO1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLnBhcmVudENvbnRleHRzLm9uQ2hpbGRPdXRsZXREZXN0cm95ZWQodGhpcy5uYW1lKTtcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkluaXQoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZCkge1xuICAgICAgLy8gSWYgdGhlIG91dGxldCB3YXMgbm90IGluc3RhbnRpYXRlZCBhdCB0aGUgdGltZSB0aGUgcm91dGUgZ290IGFjdGl2YXRlZCB3ZSBuZWVkIHRvIHBvcHVsYXRlXG4gICAgICAvLyB0aGUgb3V0bGV0IHdoZW4gaXQgaXMgaW5pdGlhbGl6ZWQgKGllIGluc2lkZSBhIE5nSWYpXG4gICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5wYXJlbnRDb250ZXh0cy5nZXRDb250ZXh0KHRoaXMubmFtZSk7XG4gICAgICBpZiAoY29udGV4dCAmJiBjb250ZXh0LnJvdXRlKSB7XG4gICAgICAgIGlmIChjb250ZXh0LmF0dGFjaFJlZikge1xuICAgICAgICAgIC8vIGBhdHRhY2hSZWZgIGlzIHBvcHVsYXRlZCB3aGVuIHRoZXJlIGlzIGFuIGV4aXN0aW5nIGNvbXBvbmVudCB0byBtb3VudFxuICAgICAgICAgIHRoaXMuYXR0YWNoKGNvbnRleHQuYXR0YWNoUmVmLCBjb250ZXh0LnJvdXRlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBvdGhlcndpc2UgdGhlIGNvbXBvbmVudCBkZWZpbmVkIGluIHRoZSBjb25maWd1cmF0aW9uIGlzIGNyZWF0ZWRcbiAgICAgICAgICB0aGlzLmFjdGl2YXRlV2l0aChjb250ZXh0LnJvdXRlLCBjb250ZXh0LnJlc29sdmVyIHx8IG51bGwpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0IGlzQWN0aXZhdGVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXRoaXMuYWN0aXZhdGVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm5zIFRoZSBjdXJyZW50bHkgYWN0aXZhdGVkIGNvbXBvbmVudCBpbnN0YW5jZS5cbiAgICogQHRocm93cyBBbiBlcnJvciBpZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQuXG4gICAqL1xuICBnZXQgY29tcG9uZW50KCk6IE9iamVjdCB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZCkgdGhyb3cgbmV3IEVycm9yKCdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcpO1xuICAgIHJldHVybiB0aGlzLmFjdGl2YXRlZC5pbnN0YW5jZTtcbiAgfVxuXG4gIGdldCBhY3RpdmF0ZWRSb3V0ZSgpOiBBY3RpdmF0ZWRSb3V0ZSB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZCkgdGhyb3cgbmV3IEVycm9yKCdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcpO1xuICAgIHJldHVybiB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSBhcyBBY3RpdmF0ZWRSb3V0ZTtcbiAgfVxuXG4gIGdldCBhY3RpdmF0ZWRSb3V0ZURhdGEoKTogRGF0YSB7XG4gICAgaWYgKHRoaXMuX2FjdGl2YXRlZFJvdXRlKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWN0aXZhdGVkUm91dGUuc25hcHNob3QuZGF0YTtcbiAgICB9XG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZSBzdWJ0cmVlXG4gICAqL1xuICBkZXRhY2goKTogQ29tcG9uZW50UmVmPGFueT4ge1xuICAgIGlmICghdGhpcy5hY3RpdmF0ZWQpIHRocm93IG5ldyBFcnJvcignT3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQnKTtcbiAgICB0aGlzLmxvY2F0aW9uLmRldGFjaCgpO1xuICAgIGNvbnN0IGNtcCA9IHRoaXMuYWN0aXZhdGVkO1xuICAgIHRoaXMuYWN0aXZhdGVkID0gbnVsbDtcbiAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IG51bGw7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIHJlLWF0dGFjaCBhIHByZXZpb3VzbHkgZGV0YWNoZWQgc3VidHJlZVxuICAgKi9cbiAgYXR0YWNoKHJlZjogQ29tcG9uZW50UmVmPGFueT4sIGFjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSkge1xuICAgIHRoaXMuYWN0aXZhdGVkID0gcmVmO1xuICAgIHRoaXMuX2FjdGl2YXRlZFJvdXRlID0gYWN0aXZhdGVkUm91dGU7XG4gICAgdGhpcy5sb2NhdGlvbi5pbnNlcnQocmVmLmhvc3RWaWV3KTtcbiAgfVxuXG4gIGRlYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuYWN0aXZhdGVkKSB7XG4gICAgICBjb25zdCBjID0gdGhpcy5jb21wb25lbnQ7XG4gICAgICB0aGlzLmFjdGl2YXRlZC5kZXN0cm95KCk7XG4gICAgICB0aGlzLmFjdGl2YXRlZCA9IG51bGw7XG4gICAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IG51bGw7XG4gICAgICB0aGlzLmRlYWN0aXZhdGVFdmVudHMuZW1pdChjKTtcbiAgICB9XG4gIH1cblxuICBhY3RpdmF0ZVdpdGgoYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlLCByZXNvbHZlcjogQ29tcG9uZW50RmFjdG9yeVJlc29sdmVyfG51bGwpIHtcbiAgICBpZiAodGhpcy5pc0FjdGl2YXRlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgYWN0aXZhdGUgYW4gYWxyZWFkeSBhY3RpdmF0ZWQgb3V0bGV0Jyk7XG4gICAgfVxuICAgIHRoaXMuX2FjdGl2YXRlZFJvdXRlID0gYWN0aXZhdGVkUm91dGU7XG4gICAgY29uc3Qgc25hcHNob3QgPSBhY3RpdmF0ZWRSb3V0ZS5fZnV0dXJlU25hcHNob3Q7XG4gICAgY29uc3QgY29tcG9uZW50ID0gPGFueT5zbmFwc2hvdC5yb3V0ZUNvbmZpZyEuY29tcG9uZW50O1xuICAgIHJlc29sdmVyID0gcmVzb2x2ZXIgfHwgdGhpcy5yZXNvbHZlcjtcbiAgICBjb25zdCBmYWN0b3J5ID0gcmVzb2x2ZXIucmVzb2x2ZUNvbXBvbmVudEZhY3RvcnkoY29tcG9uZW50KTtcbiAgICBjb25zdCBjaGlsZENvbnRleHRzID0gdGhpcy5wYXJlbnRDb250ZXh0cy5nZXRPckNyZWF0ZUNvbnRleHQodGhpcy5uYW1lKS5jaGlsZHJlbjtcbiAgICBjb25zdCBpbmplY3RvciA9IG5ldyBPdXRsZXRJbmplY3RvcihhY3RpdmF0ZWRSb3V0ZSwgY2hpbGRDb250ZXh0cywgdGhpcy5sb2NhdGlvbi5pbmplY3Rvcik7XG4gICAgdGhpcy5hY3RpdmF0ZWQgPSB0aGlzLmxvY2F0aW9uLmNyZWF0ZUNvbXBvbmVudChmYWN0b3J5LCB0aGlzLmxvY2F0aW9uLmxlbmd0aCwgaW5qZWN0b3IpO1xuICAgIC8vIENhbGxpbmcgYG1hcmtGb3JDaGVja2AgdG8gbWFrZSBzdXJlIHdlIHdpbGwgcnVuIHRoZSBjaGFuZ2UgZGV0ZWN0aW9uIHdoZW4gdGhlXG4gICAgLy8gYFJvdXRlck91dGxldGAgaXMgaW5zaWRlIGEgYENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaGAgY29tcG9uZW50LlxuICAgIHRoaXMuY2hhbmdlRGV0ZWN0b3IubWFya0ZvckNoZWNrKCk7XG4gICAgdGhpcy5hY3RpdmF0ZUV2ZW50cy5lbWl0KHRoaXMuYWN0aXZhdGVkLmluc3RhbmNlKTtcbiAgfVxufVxuXG5jbGFzcyBPdXRsZXRJbmplY3RvciBpbXBsZW1lbnRzIEluamVjdG9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSwgcHJpdmF0ZSBjaGlsZENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLFxuICAgICAgcHJpdmF0ZSBwYXJlbnQ6IEluamVjdG9yKSB7fVxuXG4gIGdldCh0b2tlbjogYW55LCBub3RGb3VuZFZhbHVlPzogYW55KTogYW55IHtcbiAgICBpZiAodG9rZW4gPT09IEFjdGl2YXRlZFJvdXRlKSB7XG4gICAgICByZXR1cm4gdGhpcy5yb3V0ZTtcbiAgICB9XG5cbiAgICBpZiAodG9rZW4gPT09IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpIHtcbiAgICAgIHJldHVybiB0aGlzLmNoaWxkQ29udGV4dHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucGFyZW50LmdldCh0b2tlbiwgbm90Rm91bmRWYWx1ZSk7XG4gIH1cbn1cbiJdfQ==