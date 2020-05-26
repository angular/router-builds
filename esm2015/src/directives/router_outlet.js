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
 * A router outlet emits an activate event when a new component is instantiated,
 * and a deactivate event when a component is destroyed.
 *
 * ```
 * <router-outlet
 *   (activate)='onActivate($event)'
 *   (deactivate)='onDeactivate($event)'></router-outlet>
 * ```
 * @ngModule RouterModule
 *
 * @publicApi
 */
let RouterOutlet = /** @class */ (() => {
    class RouterOutlet {
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
        ngOnDestroy() {
            this.parentContexts.onChildOutletDestroyed(this.name);
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX291dGxldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsd0JBQXdCLEVBQWdCLFNBQVMsRUFBRSxZQUFZLEVBQStCLE1BQU0sRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUduTCxPQUFPLEVBQUMsc0JBQXNCLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNoRSxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLFdBQVcsQ0FBQzs7O0FBRXpDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBeUJHO0FBQ0g7SUFBQSxNQUNhLFlBQVk7UUFRdkIsWUFDWSxjQUFzQyxFQUFVLFFBQTBCLEVBQzFFLFFBQWtDLEVBQXFCLElBQVksRUFDbkUsY0FBaUM7WUFGakMsbUJBQWMsR0FBZCxjQUFjLENBQXdCO1lBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBa0I7WUFDMUUsYUFBUSxHQUFSLFFBQVEsQ0FBMEI7WUFDbEMsbUJBQWMsR0FBZCxjQUFjLENBQW1CO1lBVnJDLGNBQVMsR0FBMkIsSUFBSSxDQUFDO1lBQ3pDLG9CQUFlLEdBQXdCLElBQUksQ0FBQztZQUdoQyxtQkFBYyxHQUFHLElBQUksWUFBWSxFQUFPLENBQUM7WUFDdkMscUJBQWdCLEdBQUcsSUFBSSxZQUFZLEVBQU8sQ0FBQztZQU0vRCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxjQUFjLENBQUM7WUFDbkMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdkQsQ0FBQztRQUVELFdB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QixNQUFNO21CQUFDLFlBQVk7O0FBc0d0QixNQUFNLGNBQWM7SUFDbEIsWUFDWSxLQUFxQixFQUFVLGFBQXFDLEVBQ3BFLE1BQWdCO1FBRGhCLFVBQUssR0FBTCxLQUFLLENBQWdCO1FBQVUsa0JBQWEsR0FBYixhQUFhLENBQXdCO1FBQ3BFLFdBQU0sR0FBTixNQUFNLENBQVU7SUFBRyxDQUFDO0lBRWhDLEdBQUcsQ0FBQyxLQUFVLEVBQUUsYUFBbUI7UUFDakMsSUFBSSxLQUFLLEtBQUssY0FBYyxFQUFFO1lBQzVCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztTQUNuQjtRQUVELElBQUksS0FBSyxLQUFLLHNCQUFzQixFQUFFO1lBQ3BDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQztTQUMzQjtRQUVELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQy9DLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZSwgQ2hhbmdlRGV0ZWN0b3JSZWYsIENvbXBvbmVudEZhY3RvcnlSZXNvbHZlciwgQ29tcG9uZW50UmVmLCBEaXJlY3RpdmUsIEV2ZW50RW1pdHRlciwgSW5qZWN0b3IsIE9uRGVzdHJveSwgT25Jbml0LCBPdXRwdXQsIFZpZXdDb250YWluZXJSZWZ9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQge0RhdGF9IGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQge0NoaWxkcmVuT3V0bGV0Q29udGV4dHN9IGZyb20gJy4uL3JvdXRlcl9vdXRsZXRfY29udGV4dCc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlfSBmcm9tICcuLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQUklNQVJZX09VVExFVH0gZnJvbSAnLi4vc2hhcmVkJztcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBBY3RzIGFzIGEgcGxhY2Vob2xkZXIgdGhhdCBBbmd1bGFyIGR5bmFtaWNhbGx5IGZpbGxzIGJhc2VkIG9uIHRoZSBjdXJyZW50IHJvdXRlciBzdGF0ZS5cbiAqXG4gKiBFYWNoIG91dGxldCBjYW4gaGF2ZSBhIHVuaXF1ZSBuYW1lLCBkZXRlcm1pbmVkIGJ5IHRoZSBvcHRpb25hbCBgbmFtZWAgYXR0cmlidXRlLlxuICogVGhlIG5hbWUgY2Fubm90IGJlIHNldCBvciBjaGFuZ2VkIGR5bmFtaWNhbGx5LiBJZiBub3Qgc2V0LCBkZWZhdWx0IHZhbHVlIGlzIFwicHJpbWFyeVwiLlxuICpcbiAqIGBgYFxuICogPHJvdXRlci1vdXRsZXQ+PC9yb3V0ZXItb3V0bGV0PlxuICogPHJvdXRlci1vdXRsZXQgbmFtZT0nbGVmdCc+PC9yb3V0ZXItb3V0bGV0PlxuICogPHJvdXRlci1vdXRsZXQgbmFtZT0ncmlnaHQnPjwvcm91dGVyLW91dGxldD5cbiAqIGBgYFxuICpcbiAqIEEgcm91dGVyIG91dGxldCBlbWl0cyBhbiBhY3RpdmF0ZSBldmVudCB3aGVuIGEgbmV3IGNvbXBvbmVudCBpcyBpbnN0YW50aWF0ZWQsXG4gKiBhbmQgYSBkZWFjdGl2YXRlIGV2ZW50IHdoZW4gYSBjb21wb25lbnQgaXMgZGVzdHJveWVkLlxuICpcbiAqIGBgYFxuICogPHJvdXRlci1vdXRsZXRcbiAqICAgKGFjdGl2YXRlKT0nb25BY3RpdmF0ZSgkZXZlbnQpJ1xuICogICAoZGVhY3RpdmF0ZSk9J29uRGVhY3RpdmF0ZSgkZXZlbnQpJz48L3JvdXRlci1vdXRsZXQ+XG4gKiBgYGBcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBEaXJlY3RpdmUoe3NlbGVjdG9yOiAncm91dGVyLW91dGxldCcsIGV4cG9ydEFzOiAnb3V0bGV0J30pXG5leHBvcnQgY2xhc3MgUm91dGVyT3V0bGV0IGltcGxlbWVudHMgT25EZXN0cm95LCBPbkluaXQge1xuICBwcml2YXRlIGFjdGl2YXRlZDogQ29tcG9uZW50UmVmPGFueT58bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgX2FjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZXxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBuYW1lOiBzdHJpbmc7XG5cbiAgQE91dHB1dCgnYWN0aXZhdGUnKSBhY3RpdmF0ZUV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpO1xuICBAT3V0cHV0KCdkZWFjdGl2YXRlJykgZGVhY3RpdmF0ZUV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBwYXJlbnRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cywgcHJpdmF0ZSBsb2NhdGlvbjogVmlld0NvbnRhaW5lclJlZixcbiAgICAgIHByaXZhdGUgcmVzb2x2ZXI6IENvbXBvbmVudEZhY3RvcnlSZXNvbHZlciwgQEF0dHJpYnV0ZSgnbmFtZScpIG5hbWU6IHN0cmluZyxcbiAgICAgIHByaXZhdGUgY2hhbmdlRGV0ZWN0b3I6IENoYW5nZURldGVjdG9yUmVmKSB7XG4gICAgdGhpcy5uYW1lID0gbmFtZSB8fCBQUklNQVJZX09VVExFVDtcbiAgICBwYXJlbnRDb250ZXh0cy5vbkNoaWxkT3V0bGV0Q3JlYXRlZCh0aGlzLm5hbWUsIHRoaXMpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5wYXJlbnRDb250ZXh0cy5vbkNoaWxkT3V0bGV0RGVzdHJveWVkKHRoaXMubmFtZSk7XG4gIH1cblxuICBuZ09uSW5pdCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuYWN0aXZhdGVkKSB7XG4gICAgICAvLyBJZiB0aGUgb3V0bGV0IHdhcyBub3QgaW5zdGFudGlhdGVkIGF0IHRoZSB0aW1lIHRoZSByb3V0ZSBnb3QgYWN0aXZhdGVkIHdlIG5lZWQgdG8gcG9wdWxhdGVcbiAgICAgIC8vIHRoZSBvdXRsZXQgd2hlbiBpdCBpcyBpbml0aWFsaXplZCAoaWUgaW5zaWRlIGEgTmdJZilcbiAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLnBhcmVudENvbnRleHRzLmdldENvbnRleHQodGhpcy5uYW1lKTtcbiAgICAgIGlmIChjb250ZXh0ICYmIGNvbnRleHQucm91dGUpIHtcbiAgICAgICAgaWYgKGNvbnRleHQuYXR0YWNoUmVmKSB7XG4gICAgICAgICAgLy8gYGF0dGFjaFJlZmAgaXMgcG9wdWxhdGVkIHdoZW4gdGhlcmUgaXMgYW4gZXhpc3RpbmcgY29tcG9uZW50IHRvIG1vdW50XG4gICAgICAgICAgdGhpcy5hdHRhY2goY29udGV4dC5hdHRhY2hSZWYsIGNvbnRleHQucm91dGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIG90aGVyd2lzZSB0aGUgY29tcG9uZW50IGRlZmluZWQgaW4gdGhlIGNvbmZpZ3VyYXRpb24gaXMgY3JlYXRlZFxuICAgICAgICAgIHRoaXMuYWN0aXZhdGVXaXRoKGNvbnRleHQucm91dGUsIGNvbnRleHQucmVzb2x2ZXIgfHwgbnVsbCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXQgaXNBY3RpdmF0ZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhdGhpcy5hY3RpdmF0ZWQ7XG4gIH1cblxuICBnZXQgY29tcG9uZW50KCk6IE9iamVjdCB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZCkgdGhyb3cgbmV3IEVycm9yKCdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcpO1xuICAgIHJldHVybiB0aGlzLmFjdGl2YXRlZC5pbnN0YW5jZTtcbiAgfVxuXG4gIGdldCBhY3RpdmF0ZWRSb3V0ZSgpOiBBY3RpdmF0ZWRSb3V0ZSB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZCkgdGhyb3cgbmV3IEVycm9yKCdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcpO1xuICAgIHJldHVybiB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSBhcyBBY3RpdmF0ZWRSb3V0ZTtcbiAgfVxuXG4gIGdldCBhY3RpdmF0ZWRSb3V0ZURhdGEoKTogRGF0YSB7XG4gICAgaWYgKHRoaXMuX2FjdGl2YXRlZFJvdXRlKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWN0aXZhdGVkUm91dGUuc25hcHNob3QuZGF0YTtcbiAgICB9XG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZSBzdWJ0cmVlXG4gICAqL1xuICBkZXRhY2goKTogQ29tcG9uZW50UmVmPGFueT4ge1xuICAgIGlmICghdGhpcy5hY3RpdmF0ZWQpIHRocm93IG5ldyBFcnJvcignT3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQnKTtcbiAgICB0aGlzLmxvY2F0aW9uLmRldGFjaCgpO1xuICAgIGNvbnN0IGNtcCA9IHRoaXMuYWN0aXZhdGVkO1xuICAgIHRoaXMuYWN0aXZhdGVkID0gbnVsbDtcbiAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IG51bGw7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIHJlLWF0dGFjaCBhIHByZXZpb3VzbHkgZGV0YWNoZWQgc3VidHJlZVxuICAgKi9cbiAgYXR0YWNoKHJlZjogQ29tcG9uZW50UmVmPGFueT4sIGFjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSkge1xuICAgIHRoaXMuYWN0aXZhdGVkID0gcmVmO1xuICAgIHRoaXMuX2FjdGl2YXRlZFJvdXRlID0gYWN0aXZhdGVkUm91dGU7XG4gICAgdGhpcy5sb2NhdGlvbi5pbnNlcnQocmVmLmhvc3RWaWV3KTtcbiAgfVxuXG4gIGRlYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuYWN0aXZhdGVkKSB7XG4gICAgICBjb25zdCBjID0gdGhpcy5jb21wb25lbnQ7XG4gICAgICB0aGlzLmFjdGl2YXRlZC5kZXN0cm95KCk7XG4gICAgICB0aGlzLmFjdGl2YXRlZCA9IG51bGw7XG4gICAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IG51bGw7XG4gICAgICB0aGlzLmRlYWN0aXZhdGVFdmVudHMuZW1pdChjKTtcbiAgICB9XG4gIH1cblxuICBhY3RpdmF0ZVdpdGgoYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlLCByZXNvbHZlcjogQ29tcG9uZW50RmFjdG9yeVJlc29sdmVyfG51bGwpIHtcbiAgICBpZiAodGhpcy5pc0FjdGl2YXRlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgYWN0aXZhdGUgYW4gYWxyZWFkeSBhY3RpdmF0ZWQgb3V0bGV0Jyk7XG4gICAgfVxuICAgIHRoaXMuX2FjdGl2YXRlZFJvdXRlID0gYWN0aXZhdGVkUm91dGU7XG4gICAgY29uc3Qgc25hcHNob3QgPSBhY3RpdmF0ZWRSb3V0ZS5fZnV0dXJlU25hcHNob3Q7XG4gICAgY29uc3QgY29tcG9uZW50ID0gPGFueT5zbmFwc2hvdC5yb3V0ZUNvbmZpZyEuY29tcG9uZW50O1xuICAgIHJlc29sdmVyID0gcmVzb2x2ZXIgfHwgdGhpcy5yZXNvbHZlcjtcbiAgICBjb25zdCBmYWN0b3J5ID0gcmVzb2x2ZXIucmVzb2x2ZUNvbXBvbmVudEZhY3RvcnkoY29tcG9uZW50KTtcbiAgICBjb25zdCBjaGlsZENvbnRleHRzID0gdGhpcy5wYXJlbnRDb250ZXh0cy5nZXRPckNyZWF0ZUNvbnRleHQodGhpcy5uYW1lKS5jaGlsZHJlbjtcbiAgICBjb25zdCBpbmplY3RvciA9IG5ldyBPdXRsZXRJbmplY3RvcihhY3RpdmF0ZWRSb3V0ZSwgY2hpbGRDb250ZXh0cywgdGhpcy5sb2NhdGlvbi5pbmplY3Rvcik7XG4gICAgdGhpcy5hY3RpdmF0ZWQgPSB0aGlzLmxvY2F0aW9uLmNyZWF0ZUNvbXBvbmVudChmYWN0b3J5LCB0aGlzLmxvY2F0aW9uLmxlbmd0aCwgaW5qZWN0b3IpO1xuICAgIC8vIENhbGxpbmcgYG1hcmtGb3JDaGVja2AgdG8gbWFrZSBzdXJlIHdlIHdpbGwgcnVuIHRoZSBjaGFuZ2UgZGV0ZWN0aW9uIHdoZW4gdGhlXG4gICAgLy8gYFJvdXRlck91dGxldGAgaXMgaW5zaWRlIGEgYENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaGAgY29tcG9uZW50LlxuICAgIHRoaXMuY2hhbmdlRGV0ZWN0b3IubWFya0ZvckNoZWNrKCk7XG4gICAgdGhpcy5hY3RpdmF0ZUV2ZW50cy5lbWl0KHRoaXMuYWN0aXZhdGVkLmluc3RhbmNlKTtcbiAgfVxufVxuXG5jbGFzcyBPdXRsZXRJbmplY3RvciBpbXBsZW1lbnRzIEluamVjdG9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSwgcHJpdmF0ZSBjaGlsZENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLFxuICAgICAgcHJpdmF0ZSBwYXJlbnQ6IEluamVjdG9yKSB7fVxuXG4gIGdldCh0b2tlbjogYW55LCBub3RGb3VuZFZhbHVlPzogYW55KTogYW55IHtcbiAgICBpZiAodG9rZW4gPT09IEFjdGl2YXRlZFJvdXRlKSB7XG4gICAgICByZXR1cm4gdGhpcy5yb3V0ZTtcbiAgICB9XG5cbiAgICBpZiAodG9rZW4gPT09IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpIHtcbiAgICAgIHJldHVybiB0aGlzLmNoaWxkQ29udGV4dHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucGFyZW50LmdldCh0b2tlbiwgbm90Rm91bmRWYWx1ZSk7XG4gIH1cbn1cbiJdfQ==