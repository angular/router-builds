/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Attribute, ChangeDetectorRef, ComponentFactoryResolver, Directive, EventEmitter, Output, ViewContainerRef } from '@angular/core';
import { ChildrenOutletContexts } from '../router_outlet_context';
import { ActivatedRoute } from '../router_state';
import { PRIMARY_OUTLET } from '../shared';
import * as i0 from "@angular/core";
/**
 * @description
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
 * @ngModule RouterModule
 *
 *
 */
var RouterOutlet = /** @class */ (function () {
    function RouterOutlet(parentContexts, location, resolver, name, changeDetector) {
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
    RouterOutlet.prototype.ngOnDestroy = function () { this.parentContexts.onChildOutletDestroyed(this.name); };
    RouterOutlet.prototype.ngOnInit = function () {
        if (!this.activated) {
            // If the outlet was not instantiated at the time the route got activated we need to populate
            // the outlet when it is initialized (ie inside a NgIf)
            var context = this.parentContexts.getContext(this.name);
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
    };
    Object.defineProperty(RouterOutlet.prototype, "isActivated", {
        get: function () { return !!this.activated; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RouterOutlet.prototype, "component", {
        get: function () {
            if (!this.activated)
                throw new Error('Outlet is not activated');
            return this.activated.instance;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RouterOutlet.prototype, "activatedRoute", {
        get: function () {
            if (!this.activated)
                throw new Error('Outlet is not activated');
            return this._activatedRoute;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RouterOutlet.prototype, "activatedRouteData", {
        get: function () {
            if (this._activatedRoute) {
                return this._activatedRoute.snapshot.data;
            }
            return {};
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Called when the `RouteReuseStrategy` instructs to detach the subtree
     */
    RouterOutlet.prototype.detach = function () {
        if (!this.activated)
            throw new Error('Outlet is not activated');
        this.location.detach();
        var cmp = this.activated;
        this.activated = null;
        this._activatedRoute = null;
        return cmp;
    };
    /**
     * Called when the `RouteReuseStrategy` instructs to re-attach a previously detached subtree
     */
    RouterOutlet.prototype.attach = function (ref, activatedRoute) {
        this.activated = ref;
        this._activatedRoute = activatedRoute;
        this.location.insert(ref.hostView);
    };
    RouterOutlet.prototype.deactivate = function () {
        if (this.activated) {
            var c = this.component;
            this.activated.destroy();
            this.activated = null;
            this._activatedRoute = null;
            this.deactivateEvents.emit(c);
        }
    };
    RouterOutlet.prototype.activateWith = function (activatedRoute, resolver) {
        if (this.isActivated) {
            throw new Error('Cannot activate an already activated outlet');
        }
        this._activatedRoute = activatedRoute;
        var snapshot = activatedRoute._futureSnapshot;
        var component = snapshot.routeConfig.component;
        resolver = resolver || this.resolver;
        var factory = resolver.resolveComponentFactory(component);
        var childContexts = this.parentContexts.getOrCreateContext(this.name).children;
        var injector = new OutletInjector(activatedRoute, childContexts, this.location.injector);
        this.activated = this.location.createComponent(factory, this.location.length, injector);
        // Calling `markForCheck` to make sure we will run the change detection when the
        // `RouterOutlet` is inside a `ChangeDetectionStrategy.OnPush` component.
        this.changeDetector.markForCheck();
        this.activateEvents.emit(this.activated.instance);
    };
    RouterOutlet.ngDirectiveDef = i0.ɵdefineDirective({ type: RouterOutlet, selectors: [["router-outlet"]], factory: function RouterOutlet_Factory(t) { return new (t || RouterOutlet)(i0.ɵdirectiveInject(ChildrenOutletContexts), i0.ɵdirectiveInject(ViewContainerRef), i0.ɵdirectiveInject(ComponentFactoryResolver), i0.ɵinjectAttribute('name'), i0.ɵdirectiveInject(ChangeDetectorRef)); }, outputs: { activateEvents: "activate", deactivateEvents: "deactivate" }, features: [i0.ɵPublicFeature], exportAs: "outlet" });
    return RouterOutlet;
}());
export { RouterOutlet };
var OutletInjector = /** @class */ (function () {
    function OutletInjector(route, childContexts, parent) {
        this.route = route;
        this.childContexts = childContexts;
        this.parent = parent;
    }
    OutletInjector.prototype.get = function (token, notFoundValue) {
        if (token === ActivatedRoute) {
            return this.route;
        }
        if (token === ChildrenOutletContexts) {
            return this.childContexts;
        }
        return this.parent.get(token, notFoundValue);
    };
    return OutletInjector;
}());

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX291dGxldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsd0JBQXdCLEVBQWdCLFNBQVMsRUFBRSxZQUFZLEVBQStCLE1BQU0sRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUduTCxPQUFPLEVBQUMsc0JBQXNCLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNoRSxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLFdBQVcsQ0FBQzs7QUFFekM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FzQkc7QUFDSDtJQVNFLHNCQUNZLGNBQXNDLEVBQVUsUUFBMEIsRUFDMUUsUUFBa0MsRUFBcUIsSUFBWSxFQUNuRSxjQUFpQztRQUZqQyxtQkFBYyxHQUFkLGNBQWMsQ0FBd0I7UUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFrQjtRQUMxRSxhQUFRLEdBQVIsUUFBUSxDQUEwQjtRQUNsQyxtQkFBYyxHQUFkLGNBQWMsQ0FBbUI7UUFWckMsY0FBUyxHQUEyQixJQUFJLENBQUM7UUFDekMsb0JBQWUsR0FBd0IsSUFBSSxDQUFDO1FBR2hDLG1CQUFjLEdBQUcsSUFBSSxZQUFZLEVBQU8sQ0FBQztRQUN2QyxxQkFBZ0IsR0FBRyxJQUFJLFlBQVksRUFBTyxDQUFDO1FBTS9ELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLGNBQWMsQ0FBQztRQUNuQyxjQUFjLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQsa0NBQVcsR0FBWCxj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QXRHWSxZQUFZO0FBd0d6QjtJQUNFLHdCQUNZLEtBQXFCLEVBQVUsYUFBcUMsRUFDcEUsTUFBZ0I7UUFEaEIsVUFBSyxHQUFMLEtBQUssQ0FBZ0I7UUFBVSxrQkFBYSxHQUFiLGFBQWEsQ0FBd0I7UUFDcEUsV0FBTSxHQUFOLE1BQU0sQ0FBVTtJQUFHLENBQUM7SUFFaEMsNEJBQUcsR0FBSCxVQUFJLEtBQVUsRUFBRSxhQUFtQjtRQUNqQyxJQUFJLEtBQUssS0FBSyxjQUFjLEVBQUU7WUFDNUIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO1NBQ25CO1FBRUQsSUFBSSxLQUFLLEtBQUssc0JBQXNCLEVBQUU7WUFDcEMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDO1NBQzNCO1FBRUQsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUNILHFCQUFDO0FBQUQsQ0FBQyxBQWhCRCxJQWdCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGUsIENoYW5nZURldGVjdG9yUmVmLCBDb21wb25lbnRGYWN0b3J5UmVzb2x2ZXIsIENvbXBvbmVudFJlZiwgRGlyZWN0aXZlLCBFdmVudEVtaXR0ZXIsIEluamVjdG9yLCBPbkRlc3Ryb3ksIE9uSW5pdCwgT3V0cHV0LCBWaWV3Q29udGFpbmVyUmVmfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHtEYXRhfSBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzfSBmcm9tICcuLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZX0gZnJvbSAnLi4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UFJJTUFSWV9PVVRMRVR9IGZyb20gJy4uL3NoYXJlZCc7XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQWN0cyBhcyBhIHBsYWNlaG9sZGVyIHRoYXQgQW5ndWxhciBkeW5hbWljYWxseSBmaWxscyBiYXNlZCBvbiB0aGUgY3VycmVudCByb3V0ZXIgc3RhdGUuXG4gKlxuICogYGBgXG4gKiA8cm91dGVyLW91dGxldD48L3JvdXRlci1vdXRsZXQ+XG4gKiA8cm91dGVyLW91dGxldCBuYW1lPSdsZWZ0Jz48L3JvdXRlci1vdXRsZXQ+XG4gKiA8cm91dGVyLW91dGxldCBuYW1lPSdyaWdodCc+PC9yb3V0ZXItb3V0bGV0PlxuICogYGBgXG4gKlxuICogQSByb3V0ZXIgb3V0bGV0IHdpbGwgZW1pdCBhbiBhY3RpdmF0ZSBldmVudCBhbnkgdGltZSBhIG5ldyBjb21wb25lbnQgaXMgYmVpbmcgaW5zdGFudGlhdGVkLFxuICogYW5kIGEgZGVhY3RpdmF0ZSBldmVudCB3aGVuIGl0IGlzIGJlaW5nIGRlc3Ryb3llZC5cbiAqXG4gKiBgYGBcbiAqIDxyb3V0ZXItb3V0bGV0XG4gKiAgIChhY3RpdmF0ZSk9J29uQWN0aXZhdGUoJGV2ZW50KSdcbiAqICAgKGRlYWN0aXZhdGUpPSdvbkRlYWN0aXZhdGUoJGV2ZW50KSc+PC9yb3V0ZXItb3V0bGV0PlxuICogYGBgXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICpcbiAqL1xuQERpcmVjdGl2ZSh7c2VsZWN0b3I6ICdyb3V0ZXItb3V0bGV0JywgZXhwb3J0QXM6ICdvdXRsZXQnfSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJPdXRsZXQgaW1wbGVtZW50cyBPbkRlc3Ryb3ksIE9uSW5pdCB7XG4gIHByaXZhdGUgYWN0aXZhdGVkOiBDb21wb25lbnRSZWY8YW55PnxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBfYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlfG51bGwgPSBudWxsO1xuICBwcml2YXRlIG5hbWU6IHN0cmluZztcblxuICBAT3V0cHV0KCdhY3RpdmF0ZScpIGFjdGl2YXRlRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG4gIEBPdXRwdXQoJ2RlYWN0aXZhdGUnKSBkZWFjdGl2YXRlRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHBhcmVudENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLCBwcml2YXRlIGxvY2F0aW9uOiBWaWV3Q29udGFpbmVyUmVmLFxuICAgICAgcHJpdmF0ZSByZXNvbHZlcjogQ29tcG9uZW50RmFjdG9yeVJlc29sdmVyLCBAQXR0cmlidXRlKCduYW1lJykgbmFtZTogc3RyaW5nLFxuICAgICAgcHJpdmF0ZSBjaGFuZ2VEZXRlY3RvcjogQ2hhbmdlRGV0ZWN0b3JSZWYpIHtcbiAgICB0aGlzLm5hbWUgPSBuYW1lIHx8IFBSSU1BUllfT1VUTEVUO1xuICAgIHBhcmVudENvbnRleHRzLm9uQ2hpbGRPdXRsZXRDcmVhdGVkKHRoaXMubmFtZSwgdGhpcyk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHsgdGhpcy5wYXJlbnRDb250ZXh0cy5vbkNoaWxkT3V0bGV0RGVzdHJveWVkKHRoaXMubmFtZSk7IH1cblxuICBuZ09uSW5pdCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuYWN0aXZhdGVkKSB7XG4gICAgICAvLyBJZiB0aGUgb3V0bGV0IHdhcyBub3QgaW5zdGFudGlhdGVkIGF0IHRoZSB0aW1lIHRoZSByb3V0ZSBnb3QgYWN0aXZhdGVkIHdlIG5lZWQgdG8gcG9wdWxhdGVcbiAgICAgIC8vIHRoZSBvdXRsZXQgd2hlbiBpdCBpcyBpbml0aWFsaXplZCAoaWUgaW5zaWRlIGEgTmdJZilcbiAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLnBhcmVudENvbnRleHRzLmdldENvbnRleHQodGhpcy5uYW1lKTtcbiAgICAgIGlmIChjb250ZXh0ICYmIGNvbnRleHQucm91dGUpIHtcbiAgICAgICAgaWYgKGNvbnRleHQuYXR0YWNoUmVmKSB7XG4gICAgICAgICAgLy8gYGF0dGFjaFJlZmAgaXMgcG9wdWxhdGVkIHdoZW4gdGhlcmUgaXMgYW4gZXhpc3RpbmcgY29tcG9uZW50IHRvIG1vdW50XG4gICAgICAgICAgdGhpcy5hdHRhY2goY29udGV4dC5hdHRhY2hSZWYsIGNvbnRleHQucm91dGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIG90aGVyd2lzZSB0aGUgY29tcG9uZW50IGRlZmluZWQgaW4gdGhlIGNvbmZpZ3VyYXRpb24gaXMgY3JlYXRlZFxuICAgICAgICAgIHRoaXMuYWN0aXZhdGVXaXRoKGNvbnRleHQucm91dGUsIGNvbnRleHQucmVzb2x2ZXIgfHwgbnVsbCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXQgaXNBY3RpdmF0ZWQoKTogYm9vbGVhbiB7IHJldHVybiAhIXRoaXMuYWN0aXZhdGVkOyB9XG5cbiAgZ2V0IGNvbXBvbmVudCgpOiBPYmplY3Qge1xuICAgIGlmICghdGhpcy5hY3RpdmF0ZWQpIHRocm93IG5ldyBFcnJvcignT3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQnKTtcbiAgICByZXR1cm4gdGhpcy5hY3RpdmF0ZWQuaW5zdGFuY2U7XG4gIH1cblxuICBnZXQgYWN0aXZhdGVkUm91dGUoKTogQWN0aXZhdGVkUm91dGUge1xuICAgIGlmICghdGhpcy5hY3RpdmF0ZWQpIHRocm93IG5ldyBFcnJvcignT3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQnKTtcbiAgICByZXR1cm4gdGhpcy5fYWN0aXZhdGVkUm91dGUgYXMgQWN0aXZhdGVkUm91dGU7XG4gIH1cblxuICBnZXQgYWN0aXZhdGVkUm91dGVEYXRhKCk6IERhdGEge1xuICAgIGlmICh0aGlzLl9hY3RpdmF0ZWRSb3V0ZSkge1xuICAgICAgcmV0dXJuIHRoaXMuX2FjdGl2YXRlZFJvdXRlLnNuYXBzaG90LmRhdGE7XG4gICAgfVxuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIGRldGFjaCB0aGUgc3VidHJlZVxuICAgKi9cbiAgZGV0YWNoKCk6IENvbXBvbmVudFJlZjxhbnk+IHtcbiAgICBpZiAoIXRoaXMuYWN0aXZhdGVkKSB0aHJvdyBuZXcgRXJyb3IoJ091dGxldCBpcyBub3QgYWN0aXZhdGVkJyk7XG4gICAgdGhpcy5sb2NhdGlvbi5kZXRhY2goKTtcbiAgICBjb25zdCBjbXAgPSB0aGlzLmFjdGl2YXRlZDtcbiAgICB0aGlzLmFjdGl2YXRlZCA9IG51bGw7XG4gICAgdGhpcy5fYWN0aXZhdGVkUm91dGUgPSBudWxsO1xuICAgIHJldHVybiBjbXA7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byByZS1hdHRhY2ggYSBwcmV2aW91c2x5IGRldGFjaGVkIHN1YnRyZWVcbiAgICovXG4gIGF0dGFjaChyZWY6IENvbXBvbmVudFJlZjxhbnk+LCBhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGUpIHtcbiAgICB0aGlzLmFjdGl2YXRlZCA9IHJlZjtcbiAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IGFjdGl2YXRlZFJvdXRlO1xuICAgIHRoaXMubG9jYXRpb24uaW5zZXJ0KHJlZi5ob3N0Vmlldyk7XG4gIH1cblxuICBkZWFjdGl2YXRlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmFjdGl2YXRlZCkge1xuICAgICAgY29uc3QgYyA9IHRoaXMuY29tcG9uZW50O1xuICAgICAgdGhpcy5hY3RpdmF0ZWQuZGVzdHJveSgpO1xuICAgICAgdGhpcy5hY3RpdmF0ZWQgPSBudWxsO1xuICAgICAgdGhpcy5fYWN0aXZhdGVkUm91dGUgPSBudWxsO1xuICAgICAgdGhpcy5kZWFjdGl2YXRlRXZlbnRzLmVtaXQoYyk7XG4gICAgfVxuICB9XG5cbiAgYWN0aXZhdGVXaXRoKGFjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSwgcmVzb2x2ZXI6IENvbXBvbmVudEZhY3RvcnlSZXNvbHZlcnxudWxsKSB7XG4gICAgaWYgKHRoaXMuaXNBY3RpdmF0ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGFjdGl2YXRlIGFuIGFscmVhZHkgYWN0aXZhdGVkIG91dGxldCcpO1xuICAgIH1cbiAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IGFjdGl2YXRlZFJvdXRlO1xuICAgIGNvbnN0IHNuYXBzaG90ID0gYWN0aXZhdGVkUm91dGUuX2Z1dHVyZVNuYXBzaG90O1xuICAgIGNvbnN0IGNvbXBvbmVudCA9IDxhbnk+c25hcHNob3Qucm91dGVDb25maWcgIS5jb21wb25lbnQ7XG4gICAgcmVzb2x2ZXIgPSByZXNvbHZlciB8fCB0aGlzLnJlc29sdmVyO1xuICAgIGNvbnN0IGZhY3RvcnkgPSByZXNvbHZlci5yZXNvbHZlQ29tcG9uZW50RmFjdG9yeShjb21wb25lbnQpO1xuICAgIGNvbnN0IGNoaWxkQ29udGV4dHMgPSB0aGlzLnBhcmVudENvbnRleHRzLmdldE9yQ3JlYXRlQ29udGV4dCh0aGlzLm5hbWUpLmNoaWxkcmVuO1xuICAgIGNvbnN0IGluamVjdG9yID0gbmV3IE91dGxldEluamVjdG9yKGFjdGl2YXRlZFJvdXRlLCBjaGlsZENvbnRleHRzLCB0aGlzLmxvY2F0aW9uLmluamVjdG9yKTtcbiAgICB0aGlzLmFjdGl2YXRlZCA9IHRoaXMubG9jYXRpb24uY3JlYXRlQ29tcG9uZW50KGZhY3RvcnksIHRoaXMubG9jYXRpb24ubGVuZ3RoLCBpbmplY3Rvcik7XG4gICAgLy8gQ2FsbGluZyBgbWFya0ZvckNoZWNrYCB0byBtYWtlIHN1cmUgd2Ugd2lsbCBydW4gdGhlIGNoYW5nZSBkZXRlY3Rpb24gd2hlbiB0aGVcbiAgICAvLyBgUm91dGVyT3V0bGV0YCBpcyBpbnNpZGUgYSBgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoYCBjb21wb25lbnQuXG4gICAgdGhpcy5jaGFuZ2VEZXRlY3Rvci5tYXJrRm9yQ2hlY2soKTtcbiAgICB0aGlzLmFjdGl2YXRlRXZlbnRzLmVtaXQodGhpcy5hY3RpdmF0ZWQuaW5zdGFuY2UpO1xuICB9XG59XG5cbmNsYXNzIE91dGxldEluamVjdG9yIGltcGxlbWVudHMgSW5qZWN0b3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm91dGU6IEFjdGl2YXRlZFJvdXRlLCBwcml2YXRlIGNoaWxkQ29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsXG4gICAgICBwcml2YXRlIHBhcmVudDogSW5qZWN0b3IpIHt9XG5cbiAgZ2V0KHRva2VuOiBhbnksIG5vdEZvdW5kVmFsdWU/OiBhbnkpOiBhbnkge1xuICAgIGlmICh0b2tlbiA9PT0gQWN0aXZhdGVkUm91dGUpIHtcbiAgICAgIHJldHVybiB0aGlzLnJvdXRlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbiA9PT0gQ2hpbGRyZW5PdXRsZXRDb250ZXh0cykge1xuICAgICAgcmV0dXJuIHRoaXMuY2hpbGRDb250ZXh0cztcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5wYXJlbnQuZ2V0KHRva2VuLCBub3RGb3VuZFZhbHVlKTtcbiAgfVxufVxuIl19