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
    /**
       * Called when the `RouteReuseStrategy` instructs to detach the subtree
       */
    RouterOutlet.prototype.detach = /**
       * Called when the `RouteReuseStrategy` instructs to detach the subtree
       */
    function () {
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
    /**
       * Called when the `RouteReuseStrategy` instructs to re-attach a previously detached subtree
       */
    RouterOutlet.prototype.attach = /**
       * Called when the `RouteReuseStrategy` instructs to re-attach a previously detached subtree
       */
    function (ref, activatedRoute) {
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
    RouterOutlet.decorators = [
        { type: Directive, args: [{ selector: 'router-outlet', exportAs: 'outlet' },] }
    ];
    /** @nocollapse */
    RouterOutlet.ctorParameters = function () { return [
        { type: ChildrenOutletContexts, },
        { type: ViewContainerRef, },
        { type: ComponentFactoryResolver, },
        { type: undefined, decorators: [{ type: Attribute, args: ['name',] },] },
        { type: ChangeDetectorRef, },
    ]; };
    RouterOutlet.propDecorators = {
        "activateEvents": [{ type: Output, args: ['activate',] },],
        "deactivateEvents": [{ type: Output, args: ['deactivate',] },],
    };
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX291dGxldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFRQSxPQUFPLEVBQUMsU0FBUyxFQUFFLGlCQUFpQixFQUFFLHdCQUF3QixFQUFnQixTQUFTLEVBQUUsWUFBWSxFQUErQixNQUFNLEVBQUUsZ0JBQWdCLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFFbkwsT0FBTyxFQUFDLHNCQUFzQixFQUFDLE1BQU0sMEJBQTBCLENBQUM7QUFDaEUsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxXQUFXLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFrQ3ZDLHNCQUNZLGNBQXNDLEVBQVUsUUFBMEIsRUFDMUUsUUFBa0MsRUFBcUIsTUFDdkQsY0FBaUM7UUFGakMsbUJBQWMsR0FBZCxjQUFjLENBQXdCO1FBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBa0I7UUFDMUUsYUFBUSxHQUFSLFFBQVEsQ0FBMEI7UUFDbEMsbUJBQWMsR0FBZCxjQUFjLENBQW1CO3lCQVZELElBQUk7K0JBQ0QsSUFBSTs4QkFHZCxJQUFJLFlBQVksRUFBTztnQ0FDbkIsSUFBSSxZQUFZLEVBQU87UUFNOUQsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksY0FBYyxDQUFDO1FBQ25DLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3REO0lBRUQsa0NBQVcsR0FBWCxjQUFzQixJQUFJLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO0lBRTlFLCtCQUFRLEdBQVI7UUFDRSxJQUFJLENB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V0FBTSxHQUFOLE1BQU0sQ0FBVTtLQUFJO0lBRWhDLDRCQUFHLEdBQUgsVUFBSSxLQUFVLEVBQUUsYUFBbUI7UUFDakMsSUFBSSxLQUFLLEtBQUssY0FBYyxFQUFFO1lBQzVCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztTQUNuQjtRQUVELElBQUksS0FBSyxLQUFLLHNCQUFzQixFQUFFO1lBQ3BDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQztTQUMzQjtRQUVELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0tBQzlDO3lCQTdKSDtJQThKQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZSwgQ2hhbmdlRGV0ZWN0b3JSZWYsIENvbXBvbmVudEZhY3RvcnlSZXNvbHZlciwgQ29tcG9uZW50UmVmLCBEaXJlY3RpdmUsIEV2ZW50RW1pdHRlciwgSW5qZWN0b3IsIE9uRGVzdHJveSwgT25Jbml0LCBPdXRwdXQsIFZpZXdDb250YWluZXJSZWZ9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQge0NoaWxkcmVuT3V0bGV0Q29udGV4dHN9IGZyb20gJy4uL3JvdXRlcl9vdXRsZXRfY29udGV4dCc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlfSBmcm9tICcuLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQUklNQVJZX09VVExFVH0gZnJvbSAnLi4vc2hhcmVkJztcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBBY3RzIGFzIGEgcGxhY2Vob2xkZXIgdGhhdCBBbmd1bGFyIGR5bmFtaWNhbGx5IGZpbGxzIGJhc2VkIG9uIHRoZSBjdXJyZW50IHJvdXRlciBzdGF0ZS5cbiAqXG4gKiBgYGBcbiAqIDxyb3V0ZXItb3V0bGV0Pjwvcm91dGVyLW91dGxldD5cbiAqIDxyb3V0ZXItb3V0bGV0IG5hbWU9J2xlZnQnPjwvcm91dGVyLW91dGxldD5cbiAqIDxyb3V0ZXItb3V0bGV0IG5hbWU9J3JpZ2h0Jz48L3JvdXRlci1vdXRsZXQ+XG4gKiBgYGBcbiAqXG4gKiBBIHJvdXRlciBvdXRsZXQgd2lsbCBlbWl0IGFuIGFjdGl2YXRlIGV2ZW50IGFueSB0aW1lIGEgbmV3IGNvbXBvbmVudCBpcyBiZWluZyBpbnN0YW50aWF0ZWQsXG4gKiBhbmQgYSBkZWFjdGl2YXRlIGV2ZW50IHdoZW4gaXQgaXMgYmVpbmcgZGVzdHJveWVkLlxuICpcbiAqIGBgYFxuICogPHJvdXRlci1vdXRsZXRcbiAqICAgKGFjdGl2YXRlKT0nb25BY3RpdmF0ZSgkZXZlbnQpJ1xuICogICAoZGVhY3RpdmF0ZSk9J29uRGVhY3RpdmF0ZSgkZXZlbnQpJz48L3JvdXRlci1vdXRsZXQ+XG4gKiBgYGBcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKlxuICovXG5ARGlyZWN0aXZlKHtzZWxlY3RvcjogJ3JvdXRlci1vdXRsZXQnLCBleHBvcnRBczogJ291dGxldCd9KVxuZXhwb3J0IGNsYXNzIFJvdXRlck91dGxldCBpbXBsZW1lbnRzIE9uRGVzdHJveSwgT25Jbml0IHtcbiAgcHJpdmF0ZSBhY3RpdmF0ZWQ6IENvbXBvbmVudFJlZjxhbnk+fG51bGwgPSBudWxsO1xuICBwcml2YXRlIF9hY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGV8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgbmFtZTogc3RyaW5nO1xuXG4gIEBPdXRwdXQoJ2FjdGl2YXRlJykgYWN0aXZhdGVFdmVudHMgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcbiAgQE91dHB1dCgnZGVhY3RpdmF0ZScpIGRlYWN0aXZhdGVFdmVudHMgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcGFyZW50Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIHByaXZhdGUgbG9jYXRpb246IFZpZXdDb250YWluZXJSZWYsXG4gICAgICBwcml2YXRlIHJlc29sdmVyOiBDb21wb25lbnRGYWN0b3J5UmVzb2x2ZXIsIEBBdHRyaWJ1dGUoJ25hbWUnKSBuYW1lOiBzdHJpbmcsXG4gICAgICBwcml2YXRlIGNoYW5nZURldGVjdG9yOiBDaGFuZ2VEZXRlY3RvclJlZikge1xuICAgIHRoaXMubmFtZSA9IG5hbWUgfHwgUFJJTUFSWV9PVVRMRVQ7XG4gICAgcGFyZW50Q29udGV4dHMub25DaGlsZE91dGxldENyZWF0ZWQodGhpcy5uYW1lLCB0aGlzKTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQgeyB0aGlzLnBhcmVudENvbnRleHRzLm9uQ2hpbGRPdXRsZXREZXN0cm95ZWQodGhpcy5uYW1lKTsgfVxuXG4gIG5nT25Jbml0KCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5hY3RpdmF0ZWQpIHtcbiAgICAgIC8vIElmIHRoZSBvdXRsZXQgd2FzIG5vdCBpbnN0YW50aWF0ZWQgYXQgdGhlIHRpbWUgdGhlIHJvdXRlIGdvdCBhY3RpdmF0ZWQgd2UgbmVlZCB0byBwb3B1bGF0ZVxuICAgICAgLy8gdGhlIG91dGxldCB3aGVuIGl0IGlzIGluaXRpYWxpemVkIChpZSBpbnNpZGUgYSBOZ0lmKVxuICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMucGFyZW50Q29udGV4dHMuZ2V0Q29udGV4dCh0aGlzLm5hbWUpO1xuICAgICAgaWYgKGNvbnRleHQgJiYgY29udGV4dC5yb3V0ZSkge1xuICAgICAgICBpZiAoY29udGV4dC5hdHRhY2hSZWYpIHtcbiAgICAgICAgICAvLyBgYXR0YWNoUmVmYCBpcyBwb3B1bGF0ZWQgd2hlbiB0aGVyZSBpcyBhbiBleGlzdGluZyBjb21wb25lbnQgdG8gbW91bnRcbiAgICAgICAgICB0aGlzLmF0dGFjaChjb250ZXh0LmF0dGFjaFJlZiwgY29udGV4dC5yb3V0ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gb3RoZXJ3aXNlIHRoZSBjb21wb25lbnQgZGVmaW5lZCBpbiB0aGUgY29uZmlndXJhdGlvbiBpcyBjcmVhdGVkXG4gICAgICAgICAgdGhpcy5hY3RpdmF0ZVdpdGgoY29udGV4dC5yb3V0ZSwgY29udGV4dC5yZXNvbHZlciB8fCBudWxsKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldCBpc0FjdGl2YXRlZCgpOiBib29sZWFuIHsgcmV0dXJuICEhdGhpcy5hY3RpdmF0ZWQ7IH1cblxuICBnZXQgY29tcG9uZW50KCk6IE9iamVjdCB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZCkgdGhyb3cgbmV3IEVycm9yKCdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcpO1xuICAgIHJldHVybiB0aGlzLmFjdGl2YXRlZC5pbnN0YW5jZTtcbiAgfVxuXG4gIGdldCBhY3RpdmF0ZWRSb3V0ZSgpOiBBY3RpdmF0ZWRSb3V0ZSB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZCkgdGhyb3cgbmV3IEVycm9yKCdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcpO1xuICAgIHJldHVybiB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSBhcyBBY3RpdmF0ZWRSb3V0ZTtcbiAgfVxuXG4gIGdldCBhY3RpdmF0ZWRSb3V0ZURhdGEoKSB7XG4gICAgaWYgKHRoaXMuX2FjdGl2YXRlZFJvdXRlKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWN0aXZhdGVkUm91dGUuc25hcHNob3QuZGF0YTtcbiAgICB9XG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZSBzdWJ0cmVlXG4gICAqL1xuICBkZXRhY2goKTogQ29tcG9uZW50UmVmPGFueT4ge1xuICAgIGlmICghdGhpcy5hY3RpdmF0ZWQpIHRocm93IG5ldyBFcnJvcignT3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQnKTtcbiAgICB0aGlzLmxvY2F0aW9uLmRldGFjaCgpO1xuICAgIGNvbnN0IGNtcCA9IHRoaXMuYWN0aXZhdGVkO1xuICAgIHRoaXMuYWN0aXZhdGVkID0gbnVsbDtcbiAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IG51bGw7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIHJlLWF0dGFjaCBhIHByZXZpb3VzbHkgZGV0YWNoZWQgc3VidHJlZVxuICAgKi9cbiAgYXR0YWNoKHJlZjogQ29tcG9uZW50UmVmPGFueT4sIGFjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSkge1xuICAgIHRoaXMuYWN0aXZhdGVkID0gcmVmO1xuICAgIHRoaXMuX2FjdGl2YXRlZFJvdXRlID0gYWN0aXZhdGVkUm91dGU7XG4gICAgdGhpcy5sb2NhdGlvbi5pbnNlcnQocmVmLmhvc3RWaWV3KTtcbiAgfVxuXG4gIGRlYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuYWN0aXZhdGVkKSB7XG4gICAgICBjb25zdCBjID0gdGhpcy5jb21wb25lbnQ7XG4gICAgICB0aGlzLmFjdGl2YXRlZC5kZXN0cm95KCk7XG4gICAgICB0aGlzLmFjdGl2YXRlZCA9IG51bGw7XG4gICAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IG51bGw7XG4gICAgICB0aGlzLmRlYWN0aXZhdGVFdmVudHMuZW1pdChjKTtcbiAgICB9XG4gIH1cblxuICBhY3RpdmF0ZVdpdGgoYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlLCByZXNvbHZlcjogQ29tcG9uZW50RmFjdG9yeVJlc29sdmVyfG51bGwpIHtcbiAgICBpZiAodGhpcy5pc0FjdGl2YXRlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgYWN0aXZhdGUgYW4gYWxyZWFkeSBhY3RpdmF0ZWQgb3V0bGV0Jyk7XG4gICAgfVxuICAgIHRoaXMuX2FjdGl2YXRlZFJvdXRlID0gYWN0aXZhdGVkUm91dGU7XG4gICAgY29uc3Qgc25hcHNob3QgPSBhY3RpdmF0ZWRSb3V0ZS5fZnV0dXJlU25hcHNob3Q7XG4gICAgY29uc3QgY29tcG9uZW50ID0gPGFueT5zbmFwc2hvdC5yb3V0ZUNvbmZpZyAhLmNvbXBvbmVudDtcbiAgICByZXNvbHZlciA9IHJlc29sdmVyIHx8IHRoaXMucmVzb2x2ZXI7XG4gICAgY29uc3QgZmFjdG9yeSA9IHJlc29sdmVyLnJlc29sdmVDb21wb25lbnRGYWN0b3J5KGNvbXBvbmVudCk7XG4gICAgY29uc3QgY2hpbGRDb250ZXh0cyA9IHRoaXMucGFyZW50Q29udGV4dHMuZ2V0T3JDcmVhdGVDb250ZXh0KHRoaXMubmFtZSkuY2hpbGRyZW47XG4gICAgY29uc3QgaW5qZWN0b3IgPSBuZXcgT3V0bGV0SW5qZWN0b3IoYWN0aXZhdGVkUm91dGUsIGNoaWxkQ29udGV4dHMsIHRoaXMubG9jYXRpb24uaW5qZWN0b3IpO1xuICAgIHRoaXMuYWN0aXZhdGVkID0gdGhpcy5sb2NhdGlvbi5jcmVhdGVDb21wb25lbnQoZmFjdG9yeSwgdGhpcy5sb2NhdGlvbi5sZW5ndGgsIGluamVjdG9yKTtcbiAgICAvLyBDYWxsaW5nIGBtYXJrRm9yQ2hlY2tgIHRvIG1ha2Ugc3VyZSB3ZSB3aWxsIHJ1biB0aGUgY2hhbmdlIGRldGVjdGlvbiB3aGVuIHRoZVxuICAgIC8vIGBSb3V0ZXJPdXRsZXRgIGlzIGluc2lkZSBhIGBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2hgIGNvbXBvbmVudC5cbiAgICB0aGlzLmNoYW5nZURldGVjdG9yLm1hcmtGb3JDaGVjaygpO1xuICAgIHRoaXMuYWN0aXZhdGVFdmVudHMuZW1pdCh0aGlzLmFjdGl2YXRlZC5pbnN0YW5jZSk7XG4gIH1cbn1cblxuY2xhc3MgT3V0bGV0SW5qZWN0b3IgaW1wbGVtZW50cyBJbmplY3RvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZTogQWN0aXZhdGVkUm91dGUsIHByaXZhdGUgY2hpbGRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyxcbiAgICAgIHByaXZhdGUgcGFyZW50OiBJbmplY3Rvcikge31cblxuICBnZXQodG9rZW46IGFueSwgbm90Rm91bmRWYWx1ZT86IGFueSk6IGFueSB7XG4gICAgaWYgKHRva2VuID09PSBBY3RpdmF0ZWRSb3V0ZSkge1xuICAgICAgcmV0dXJuIHRoaXMucm91dGU7XG4gICAgfVxuXG4gICAgaWYgKHRva2VuID09PSBDaGlsZHJlbk91dGxldENvbnRleHRzKSB7XG4gICAgICByZXR1cm4gdGhpcy5jaGlsZENvbnRleHRzO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnBhcmVudC5nZXQodG9rZW4sIG5vdEZvdW5kVmFsdWUpO1xuICB9XG59XG4iXX0=