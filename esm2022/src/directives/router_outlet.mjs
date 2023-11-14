/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ChangeDetectorRef, Directive, EnvironmentInjector, EventEmitter, inject, Injectable, InjectionToken, Input, Output, reflectComponentType, ViewContainerRef, ɵRuntimeError as RuntimeError, } from '@angular/core';
import { combineLatest, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ChildrenOutletContexts } from '../router_outlet_context';
import { ActivatedRoute } from '../router_state';
import { PRIMARY_OUTLET } from '../shared';
import * as i0 from "@angular/core";
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
 * deactivate event when a component is destroyed.
 * An attached event emits when the `RouteReuseStrategy` instructs the outlet to reattach the
 * subtree, and the detached event emits when the `RouteReuseStrategy` instructs the outlet to
 * detach the subtree.
 *
 * ```
 * <router-outlet
 *   (activate)='onActivate($event)'
 *   (deactivate)='onDeactivate($event)'
 *   (attach)='onAttach($event)'
 *   (detach)='onDetach($event)'></router-outlet>
 * ```
 *
 * @see [Routing tutorial](guide/router-tutorial-toh#named-outlets "Example of a named
 * outlet and secondary route configuration").
 * @see {@link RouterLink}
 * @see {@link Route}
 * @ngModule RouterModule
 *
 * @publicApi
 */
export class RouterOutlet {
    constructor() {
        this.activated = null;
        this._activatedRoute = null;
        /**
         * The name of the outlet
         *
         * @see [named outlets](guide/router-tutorial-toh#displaying-multiple-routes-in-named-outlets)
         */
        this.name = PRIMARY_OUTLET;
        this.activateEvents = new EventEmitter();
        this.deactivateEvents = new EventEmitter();
        /**
         * Emits an attached component instance when the `RouteReuseStrategy` instructs to re-attach a
         * previously detached subtree.
         **/
        this.attachEvents = new EventEmitter();
        /**
         * Emits a detached component instance when the `RouteReuseStrategy` instructs to detach the
         * subtree.
         */
        this.detachEvents = new EventEmitter();
        this.parentContexts = inject(ChildrenOutletContexts);
        this.location = inject(ViewContainerRef);
        this.changeDetector = inject(ChangeDetectorRef);
        this.environmentInjector = inject(EnvironmentInjector);
        this.inputBinder = inject(INPUT_BINDER, { optional: true });
        /** @nodoc */
        this.supportsBindingToComponentInputs = true;
    }
    /** @internal */
    get activatedComponentRef() {
        return this.activated;
    }
    /** @nodoc */
    ngOnChanges(changes) {
        if (changes['name']) {
            const { firstChange, previousValue } = changes['name'];
            if (firstChange) {
                // The first change is handled by ngOnInit. Because ngOnChanges doesn't get called when no
                // input is set at all, we need to centrally handle the first change there.
                return;
            }
            // unregister with the old name
            if (this.isTrackedInParentContexts(previousValue)) {
                this.deactivate();
                this.parentContexts.onChildOutletDestroyed(previousValue);
            }
            // register the new name
            this.initializeOutletWithName();
        }
    }
    /** @nodoc */
    ngOnDestroy() {
        // Ensure that the registered outlet is this one before removing it on the context.
        if (this.isTrackedInParentContexts(this.name)) {
            this.parentContexts.onChildOutletDestroyed(this.name);
        }
        this.inputBinder?.unsubscribeFromRouteData(this);
    }
    isTrackedInParentContexts(outletName) {
        return this.parentContexts.getContext(outletName)?.outlet === this;
    }
    /** @nodoc */
    ngOnInit() {
        this.initializeOutletWithName();
    }
    initializeOutletWithName() {
        this.parentContexts.onChildOutletCreated(this.name, this);
        if (this.activated) {
            return;
        }
        // If the outlet was not instantiated at the time the route got activated we need to populate
        // the outlet when it is initialized (ie inside a NgIf)
        const context = this.parentContexts.getContext(this.name);
        if (context?.route) {
            if (context.attachRef) {
                // `attachRef` is populated when there is an existing component to mount
                this.attach(context.attachRef, context.route);
            }
            else {
                // otherwise the component defined in the configuration is created
                this.activateWith(context.route, context.injector);
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
            throw new RuntimeError(4012 /* RuntimeErrorCode.OUTLET_NOT_ACTIVATED */, (typeof ngDevMode === 'undefined' || ngDevMode) && 'Outlet is not activated');
        return this.activated.instance;
    }
    get activatedRoute() {
        if (!this.activated)
            throw new RuntimeError(4012 /* RuntimeErrorCode.OUTLET_NOT_ACTIVATED */, (typeof ngDevMode === 'undefined' || ngDevMode) && 'Outlet is not activated');
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
            throw new RuntimeError(4012 /* RuntimeErrorCode.OUTLET_NOT_ACTIVATED */, (typeof ngDevMode === 'undefined' || ngDevMode) && 'Outlet is not activated');
        this.location.detach();
        const cmp = this.activated;
        this.activated = null;
        this._activatedRoute = null;
        this.detachEvents.emit(cmp.instance);
        return cmp;
    }
    /**
     * Called when the `RouteReuseStrategy` instructs to re-attach a previously detached subtree
     */
    attach(ref, activatedRoute) {
        this.activated = ref;
        this._activatedRoute = activatedRoute;
        this.location.insert(ref.hostView);
        this.inputBinder?.bindActivatedRouteToOutletComponent(this);
        this.attachEvents.emit(ref.instance);
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
    activateWith(activatedRoute, environmentInjector) {
        if (this.isActivated) {
            throw new RuntimeError(4013 /* RuntimeErrorCode.OUTLET_ALREADY_ACTIVATED */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
                'Cannot activate an already activated outlet');
        }
        this._activatedRoute = activatedRoute;
        const location = this.location;
        const snapshot = activatedRoute.snapshot;
        const component = snapshot.component;
        const childContexts = this.parentContexts.getOrCreateContext(this.name).children;
        const injector = new OutletInjector(activatedRoute, childContexts, location.injector);
        this.activated = location.createComponent(component, {
            index: location.length,
            injector,
            environmentInjector: environmentInjector ?? this.environmentInjector
        });
        // Calling `markForCheck` to make sure we will run the change detection when the
        // `RouterOutlet` is inside a `ChangeDetectionStrategy.OnPush` component.
        this.changeDetector.markForCheck();
        this.inputBinder?.bindActivatedRouteToOutletComponent(this);
        this.activateEvents.emit(this.activated.instance);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-f8d5b84", ngImport: i0, type: RouterOutlet, deps: [], target: i0.ɵɵFactoryTarget.Directive }); }
    static { this.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "17.1.0-next.0+sha-f8d5b84", type: RouterOutlet, isStandalone: true, selector: "router-outlet", inputs: { name: "name" }, outputs: { activateEvents: "activate", deactivateEvents: "deactivate", attachEvents: "attach", detachEvents: "detach" }, exportAs: ["outlet"], usesOnChanges: true, ngImport: i0 }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-f8d5b84", ngImport: i0, type: RouterOutlet, decorators: [{
            type: Directive,
            args: [{
                    selector: 'router-outlet',
                    exportAs: 'outlet',
                    standalone: true,
                }]
        }], propDecorators: { name: [{
                type: Input
            }], activateEvents: [{
                type: Output,
                args: ['activate']
            }], deactivateEvents: [{
                type: Output,
                args: ['deactivate']
            }], attachEvents: [{
                type: Output,
                args: ['attach']
            }], detachEvents: [{
                type: Output,
                args: ['detach']
            }] } });
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
export const INPUT_BINDER = new InjectionToken('');
/**
 * Injectable used as a tree-shakable provider for opting in to binding router data to component
 * inputs.
 *
 * The RouterOutlet registers itself with this service when an `ActivatedRoute` is attached or
 * activated. When this happens, the service subscribes to the `ActivatedRoute` observables (params,
 * queryParams, data) and sets the inputs of the component using `ComponentRef.setInput`.
 * Importantly, when an input does not have an item in the route data with a matching key, this
 * input is set to `undefined`. If it were not done this way, the previous information would be
 * retained if the data got removed from the route (i.e. if a query parameter is removed).
 *
 * The `RouterOutlet` should unregister itself when destroyed via `unsubscribeFromRouteData` so that
 * the subscriptions are cleaned up.
 */
export class RoutedComponentInputBinder {
    constructor() {
        this.outletDataSubscriptions = new Map;
    }
    bindActivatedRouteToOutletComponent(outlet) {
        this.unsubscribeFromRouteData(outlet);
        this.subscribeToRouteData(outlet);
    }
    unsubscribeFromRouteData(outlet) {
        this.outletDataSubscriptions.get(outlet)?.unsubscribe();
        this.outletDataSubscriptions.delete(outlet);
    }
    subscribeToRouteData(outlet) {
        const { activatedRoute } = outlet;
        const dataSubscription = combineLatest([
            activatedRoute.queryParams,
            activatedRoute.params,
            activatedRoute.data,
        ])
            .pipe(switchMap(([queryParams, params, data], index) => {
            data = { ...queryParams, ...params, ...data };
            // Get the first result from the data subscription synchronously so it's available to
            // the component as soon as possible (and doesn't require a second change detection).
            if (index === 0) {
                return of(data);
            }
            // Promise.resolve is used to avoid synchronously writing the wrong data when
            // two of the Observables in the `combineLatest` stream emit one after
            // another.
            return Promise.resolve(data);
        }))
            .subscribe(data => {
            // Outlet may have been deactivated or changed names to be associated with a different
            // route
            if (!outlet.isActivated || !outlet.activatedComponentRef ||
                outlet.activatedRoute !== activatedRoute || activatedRoute.component === null) {
                this.unsubscribeFromRouteData(outlet);
                return;
            }
            const mirror = reflectComponentType(activatedRoute.component);
            if (!mirror) {
                this.unsubscribeFromRouteData(outlet);
                return;
            }
            for (const { templateName } of mirror.inputs) {
                outlet.activatedComponentRef.setInput(templateName, data[templateName]);
            }
        });
        this.outletDataSubscriptions.set(outlet, dataSubscription);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-f8d5b84", ngImport: i0, type: RoutedComponentInputBinder, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-f8d5b84", ngImport: i0, type: RoutedComponentInputBinder }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-f8d5b84", ngImport: i0, type: RoutedComponentInputBinder, decorators: [{
            type: Injectable
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX291dGxldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxpQkFBaUIsRUFBZ0IsU0FBUyxFQUFFLG1CQUFtQixFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLGNBQWMsRUFBWSxLQUFLLEVBQXFCLE1BQU0sRUFBRSxvQkFBb0IsRUFBaUIsZ0JBQWdCLEVBQUUsYUFBYSxJQUFJLFlBQVksR0FBRSxNQUFNLGVBQWUsQ0FBQztBQUNuUixPQUFPLEVBQUMsYUFBYSxFQUFFLEVBQUUsRUFBZSxNQUFNLE1BQU0sQ0FBQztBQUNyRCxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFJekMsT0FBTyxFQUFDLHNCQUFzQixFQUFDLE1BQU0sMEJBQTBCLENBQUM7QUFDaEUsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxXQUFXLENBQUM7O0FBZ0d6Qzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrREc7QUFNSCxNQUFNLE9BQU8sWUFBWTtJQUx6QjtRQU1VLGNBQVMsR0FBMkIsSUFBSSxDQUFDO1FBS3pDLG9CQUFlLEdBQXdCLElBQUksQ0FBQztRQUNwRDs7OztXQUlHO1FBQ00sU0FBSSxHQUFHLGNBQWMsQ0FBQztRQUVYLG1CQUFjLEdBQUcsSUFBSSxZQUFZLEVBQU8sQ0FBQztRQUN2QyxxQkFBZ0IsR0FBRyxJQUFJLFlBQVksRUFBTyxDQUFDO1FBQ2pFOzs7WUFHSTtRQUNjLGlCQUFZLEdBQUcsSUFBSSxZQUFZLEVBQVcsQ0FBQztRQUM3RDs7O1dBR0c7UUFDZSxpQkFBWSxH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QUFDLE1BQU0sRUFBRSxDQUFDO2dCQUMzQyxNQUFNLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUMxRSxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFWCxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzdELENBQUM7eUhBdERVLDBCQUEwQjs2SEFBMUIsMEJBQTBCOztzR0FBMUIsMEJBQTBCO2tCQUR0QyxVQUFVIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q2hhbmdlRGV0ZWN0b3JSZWYsIENvbXBvbmVudFJlZiwgRGlyZWN0aXZlLCBFbnZpcm9ubWVudEluamVjdG9yLCBFdmVudEVtaXR0ZXIsIGluamVjdCwgSW5qZWN0YWJsZSwgSW5qZWN0aW9uVG9rZW4sIEluamVjdG9yLCBJbnB1dCwgT25EZXN0cm95LCBPbkluaXQsIE91dHB1dCwgcmVmbGVjdENvbXBvbmVudFR5cGUsIFNpbXBsZUNoYW5nZXMsIFZpZXdDb250YWluZXJSZWYsIMm1UnVudGltZUVycm9yIGFzIFJ1bnRpbWVFcnJvcix9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtjb21iaW5lTGF0ZXN0LCBvZiwgU3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzJztcbmltcG9ydCB7c3dpdGNoTWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7UnVudGltZUVycm9yQ29kZX0gZnJvbSAnLi4vZXJyb3JzJztcbmltcG9ydCB7RGF0YX0gZnJvbSAnLi4vbW9kZWxzJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0c30gZnJvbSAnLi4vcm91dGVyX291dGxldF9jb250ZXh0JztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGV9IGZyb20gJy4uL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BSSU1BUllfT1VUTEVUfSBmcm9tICcuLi9zaGFyZWQnO1xuXG5cbi8qKlxuICogQW4gaW50ZXJmYWNlIHRoYXQgZGVmaW5lcyB0aGUgY29udHJhY3QgZm9yIGRldmVsb3BpbmcgYSBjb21wb25lbnQgb3V0bGV0IGZvciB0aGUgYFJvdXRlcmAuXG4gKlxuICogQW4gb3V0bGV0IGFjdHMgYXMgYSBwbGFjZWhvbGRlciB0aGF0IEFuZ3VsYXIgZHluYW1pY2FsbHkgZmlsbHMgYmFzZWQgb24gdGhlIGN1cnJlbnQgcm91dGVyIHN0YXRlLlxuICpcbiAqIEEgcm91dGVyIG91dGxldCBzaG91bGQgcmVnaXN0ZXIgaXRzZWxmIHdpdGggdGhlIGBSb3V0ZXJgIHZpYVxuICogYENoaWxkcmVuT3V0bGV0Q29udGV4dHMjb25DaGlsZE91dGxldENyZWF0ZWRgIGFuZCB1bnJlZ2lzdGVyIHdpdGhcbiAqIGBDaGlsZHJlbk91dGxldENvbnRleHRzI29uQ2hpbGRPdXRsZXREZXN0cm95ZWRgLiBXaGVuIHRoZSBgUm91dGVyYCBpZGVudGlmaWVzIGEgbWF0Y2hlZCBgUm91dGVgLFxuICogaXQgbG9va3MgZm9yIGEgcmVnaXN0ZXJlZCBvdXRsZXQgaW4gdGhlIGBDaGlsZHJlbk91dGxldENvbnRleHRzYCBhbmQgYWN0aXZhdGVzIGl0LlxuICpcbiAqIEBzZWUge0BsaW5rIENoaWxkcmVuT3V0bGV0Q29udGV4dHN9XG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm91dGVyT3V0bGV0Q29udHJhY3Qge1xuICAvKipcbiAgICogV2hldGhlciB0aGUgZ2l2ZW4gb3V0bGV0IGlzIGFjdGl2YXRlZC5cbiAgICpcbiAgICogQW4gb3V0bGV0IGlzIGNvbnNpZGVyZWQgXCJhY3RpdmF0ZWRcIiBpZiBpdCBoYXMgYW4gYWN0aXZlIGNvbXBvbmVudC5cbiAgICovXG4gIGlzQWN0aXZhdGVkOiBib29sZWFuO1xuXG4gIC8qKiBUaGUgaW5zdGFuY2Ugb2YgdGhlIGFjdGl2YXRlZCBjb21wb25lbnQgb3IgYG51bGxgIGlmIHRoZSBvdXRsZXQgaXMgbm90IGFjdGl2YXRlZC4gKi9cbiAgY29tcG9uZW50OiBPYmplY3R8bnVsbDtcblxuICAvKipcbiAgICogVGhlIGBEYXRhYCBvZiB0aGUgYEFjdGl2YXRlZFJvdXRlYCBzbmFwc2hvdC5cbiAgICovXG4gIGFjdGl2YXRlZFJvdXRlRGF0YTogRGF0YTtcblxuICAvKipcbiAgICogVGhlIGBBY3RpdmF0ZWRSb3V0ZWAgZm9yIHRoZSBvdXRsZXQgb3IgYG51bGxgIGlmIHRoZSBvdXRsZXQgaXMgbm90IGFjdGl2YXRlZC5cbiAgICovXG4gIGFjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZXxudWxsO1xuXG4gIC8qKlxuICAgKiBDYWxsZWQgYnkgdGhlIGBSb3V0ZXJgIHdoZW4gdGhlIG91dGxldCBzaG91bGQgYWN0aXZhdGUgKGNyZWF0ZSBhIGNvbXBvbmVudCkuXG4gICAqL1xuICBhY3RpdmF0ZVdpdGgoYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlLCBlbnZpcm9ubWVudEluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yfG51bGwpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBBIHJlcXVlc3QgdG8gZGVzdHJveSB0aGUgY3VycmVudGx5IGFjdGl2YXRlZCBjb21wb25lbnQuXG4gICAqXG4gICAqIFdoZW4gYSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbmRpY2F0ZXMgdGhhdCBhbiBgQWN0aXZhdGVkUm91dGVgIHNob3VsZCBiZSByZW1vdmVkIGJ1dCBzdG9yZWQgZm9yXG4gICAqIGxhdGVyIHJlLXVzZSByYXRoZXIgdGhhbiBkZXN0cm95ZWQsIHRoZSBgUm91dGVyYCB3aWxsIGNhbGwgYGRldGFjaGAgaW5zdGVhZC5cbiAgICovXG4gIGRlYWN0aXZhdGUoKTogdm9pZDtcblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byBkZXRhY2ggdGhlIHN1YnRyZWUuXG4gICAqXG4gICAqIFRoaXMgaXMgc2ltaWxhciB0byBgZGVhY3RpdmF0ZWAsIGJ1dCB0aGUgYWN0aXZhdGVkIGNvbXBvbmVudCBzaG91bGQgX25vdF8gYmUgZGVzdHJveWVkLlxuICAgKiBJbnN0ZWFkLCBpdCBpcyByZXR1cm5lZCBzbyB0aGF0IGl0IGNhbiBiZSByZWF0dGFjaGVkIGxhdGVyIHZpYSB0aGUgYGF0dGFjaGAgbWV0aG9kLlxuICAgKi9cbiAgZGV0YWNoKCk6IENvbXBvbmVudFJlZjx1bmtub3duPjtcblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byByZS1hdHRhY2ggYSBwcmV2aW91c2x5IGRldGFjaGVkIHN1YnRyZWUuXG4gICAqL1xuICBhdHRhY2gocmVmOiBDb21wb25lbnRSZWY8dW5rbm93bj4sIGFjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIEVtaXRzIGFuIGFjdGl2YXRlIGV2ZW50IHdoZW4gYSBuZXcgY29tcG9uZW50IGlzIGluc3RhbnRpYXRlZFxuICAgKiovXG4gIGFjdGl2YXRlRXZlbnRzPzogRXZlbnRFbWl0dGVyPHVua25vd24+O1xuXG4gIC8qKlxuICAgKiBFbWl0cyBhIGRlYWN0aXZhdGUgZXZlbnQgd2hlbiBhIGNvbXBvbmVudCBpcyBkZXN0cm95ZWQuXG4gICAqL1xuICBkZWFjdGl2YXRlRXZlbnRzPzogRXZlbnRFbWl0dGVyPHVua25vd24+O1xuXG4gIC8qKlxuICAgKiBFbWl0cyBhbiBhdHRhY2hlZCBjb21wb25lbnQgaW5zdGFuY2Ugd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIHJlLWF0dGFjaCBhXG4gICAqIHByZXZpb3VzbHkgZGV0YWNoZWQgc3VidHJlZS5cbiAgICoqL1xuICBhdHRhY2hFdmVudHM/OiBFdmVudEVtaXR0ZXI8dW5rbm93bj47XG5cbiAgLyoqXG4gICAqIEVtaXRzIGEgZGV0YWNoZWQgY29tcG9uZW50IGluc3RhbmNlIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byBkZXRhY2ggdGhlXG4gICAqIHN1YnRyZWUuXG4gICAqL1xuICBkZXRhY2hFdmVudHM/OiBFdmVudEVtaXR0ZXI8dW5rbm93bj47XG5cbiAgLyoqXG4gICAqIFVzZWQgdG8gaW5kaWNhdGUgdGhhdCB0aGUgb3V0bGV0IGlzIGFibGUgdG8gYmluZCBkYXRhIGZyb20gdGhlIGBSb3V0ZXJgIHRvIHRoZSBvdXRsZXRcbiAgICogY29tcG9uZW50J3MgaW5wdXRzLlxuICAgKlxuICAgKiBXaGVuIHRoaXMgaXMgYHVuZGVmaW5lZGAgb3IgYGZhbHNlYCBhbmQgdGhlIGRldmVsb3BlciBoYXMgb3B0ZWQgaW4gdG8gdGhlXG4gICAqIGZlYXR1cmUgdXNpbmcgYHdpdGhDb21wb25lbnRJbnB1dEJpbmRpbmdgLCBhIHdhcm5pbmcgd2lsbCBiZSBsb2dnZWQgaW4gZGV2IG1vZGUgaWYgdGhpcyBvdXRsZXRcbiAgICogaXMgdXNlZCBpbiB0aGUgYXBwbGljYXRpb24uXG4gICAqL1xuICByZWFkb25seSBzdXBwb3J0c0JpbmRpbmdUb0NvbXBvbmVudElucHV0cz86IHRydWU7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQWN0cyBhcyBhIHBsYWNlaG9sZGVyIHRoYXQgQW5ndWxhciBkeW5hbWljYWxseSBmaWxscyBiYXNlZCBvbiB0aGUgY3VycmVudCByb3V0ZXIgc3RhdGUuXG4gKlxuICogRWFjaCBvdXRsZXQgY2FuIGhhdmUgYSB1bmlxdWUgbmFtZSwgZGV0ZXJtaW5lZCBieSB0aGUgb3B0aW9uYWwgYG5hbWVgIGF0dHJpYnV0ZS5cbiAqIFRoZSBuYW1lIGNhbm5vdCBiZSBzZXQgb3IgY2hhbmdlZCBkeW5hbWljYWxseS4gSWYgbm90IHNldCwgZGVmYXVsdCB2YWx1ZSBpcyBcInByaW1hcnlcIi5cbiAqXG4gKiBgYGBcbiAqIDxyb3V0ZXItb3V0bGV0Pjwvcm91dGVyLW91dGxldD5cbiAqIDxyb3V0ZXItb3V0bGV0IG5hbWU9J2xlZnQnPjwvcm91dGVyLW91dGxldD5cbiAqIDxyb3V0ZXItb3V0bGV0IG5hbWU9J3JpZ2h0Jz48L3JvdXRlci1vdXRsZXQ+XG4gKiBgYGBcbiAqXG4gKiBOYW1lZCBvdXRsZXRzIGNhbiBiZSB0aGUgdGFyZ2V0cyBvZiBzZWNvbmRhcnkgcm91dGVzLlxuICogVGhlIGBSb3V0ZWAgb2JqZWN0IGZvciBhIHNlY29uZGFyeSByb3V0ZSBoYXMgYW4gYG91dGxldGAgcHJvcGVydHkgdG8gaWRlbnRpZnkgdGhlIHRhcmdldCBvdXRsZXQ6XG4gKlxuICogYHtwYXRoOiA8YmFzZS1wYXRoPiwgY29tcG9uZW50OiA8Y29tcG9uZW50Piwgb3V0bGV0OiA8dGFyZ2V0X291dGxldF9uYW1lPn1gXG4gKlxuICogVXNpbmcgbmFtZWQgb3V0bGV0cyBhbmQgc2Vjb25kYXJ5IHJvdXRlcywgeW91IGNhbiB0YXJnZXQgbXVsdGlwbGUgb3V0bGV0cyBpblxuICogdGhlIHNhbWUgYFJvdXRlckxpbmtgIGRpcmVjdGl2ZS5cbiAqXG4gKiBUaGUgcm91dGVyIGtlZXBzIHRyYWNrIG9mIHNlcGFyYXRlIGJyYW5jaGVzIGluIGEgbmF2aWdhdGlvbiB0cmVlIGZvciBlYWNoIG5hbWVkIG91dGxldCBhbmRcbiAqIGdlbmVyYXRlcyBhIHJlcHJlc2VudGF0aW9uIG9mIHRoYXQgdHJlZSBpbiB0aGUgVVJMLlxuICogVGhlIFVSTCBmb3IgYSBzZWNvbmRhcnkgcm91dGUgdXNlcyB0aGUgZm9sbG93aW5nIHN5bnRheCB0byBzcGVjaWZ5IGJvdGggdGhlIHByaW1hcnkgYW5kIHNlY29uZGFyeVxuICogcm91dGVzIGF0IHRoZSBzYW1lIHRpbWU6XG4gKlxuICogYGh0dHA6Ly9iYXNlLXBhdGgvcHJpbWFyeS1yb3V0ZS1wYXRoKG91dGxldC1uYW1lOnJvdXRlLXBhdGgpYFxuICpcbiAqIEEgcm91dGVyIG91dGxldCBlbWl0cyBhbiBhY3RpdmF0ZSBldmVudCB3aGVuIGEgbmV3IGNvbXBvbmVudCBpcyBpbnN0YW50aWF0ZWQsXG4gKiBkZWFjdGl2YXRlIGV2ZW50IHdoZW4gYSBjb21wb25lbnQgaXMgZGVzdHJveWVkLlxuICogQW4gYXR0YWNoZWQgZXZlbnQgZW1pdHMgd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRoZSBvdXRsZXQgdG8gcmVhdHRhY2ggdGhlXG4gKiBzdWJ0cmVlLCBhbmQgdGhlIGRldGFjaGVkIGV2ZW50IGVtaXRzIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0aGUgb3V0bGV0IHRvXG4gKiBkZXRhY2ggdGhlIHN1YnRyZWUuXG4gKlxuICogYGBgXG4gKiA8cm91dGVyLW91dGxldFxuICogICAoYWN0aXZhdGUpPSdvbkFjdGl2YXRlKCRldmVudCknXG4gKiAgIChkZWFjdGl2YXRlKT0nb25EZWFjdGl2YXRlKCRldmVudCknXG4gKiAgIChhdHRhY2gpPSdvbkF0dGFjaCgkZXZlbnQpJ1xuICogICAoZGV0YWNoKT0nb25EZXRhY2goJGV2ZW50KSc+PC9yb3V0ZXItb3V0bGV0PlxuICogYGBgXG4gKlxuICogQHNlZSBbUm91dGluZyB0dXRvcmlhbF0oZ3VpZGUvcm91dGVyLXR1dG9yaWFsLXRvaCNuYW1lZC1vdXRsZXRzIFwiRXhhbXBsZSBvZiBhIG5hbWVkXG4gKiBvdXRsZXQgYW5kIHNlY29uZGFyeSByb3V0ZSBjb25maWd1cmF0aW9uXCIpLlxuICogQHNlZSB7QGxpbmsgUm91dGVyTGlua31cbiAqIEBzZWUge0BsaW5rIFJvdXRlfVxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQERpcmVjdGl2ZSh7XG4gIHNlbGVjdG9yOiAncm91dGVyLW91dGxldCcsXG4gIGV4cG9ydEFzOiAnb3V0bGV0JyxcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyT3V0bGV0IGltcGxlbWVudHMgT25EZXN0cm95LCBPbkluaXQsIFJvdXRlck91dGxldENvbnRyYWN0IHtcbiAgcHJpdmF0ZSBhY3RpdmF0ZWQ6IENvbXBvbmVudFJlZjxhbnk+fG51bGwgPSBudWxsO1xuICAvKiogQGludGVybmFsICovXG4gIGdldCBhY3RpdmF0ZWRDb21wb25lbnRSZWYoKTogQ29tcG9uZW50UmVmPGFueT58bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuYWN0aXZhdGVkO1xuICB9XG4gIHByaXZhdGUgX2FjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZXxudWxsID0gbnVsbDtcbiAgLyoqXG4gICAqIFRoZSBuYW1lIG9mIHRoZSBvdXRsZXRcbiAgICpcbiAgICogQHNlZSBbbmFtZWQgb3V0bGV0c10oZ3VpZGUvcm91dGVyLXR1dG9yaWFsLXRvaCNkaXNwbGF5aW5nLW11bHRpcGxlLXJvdXRlcy1pbi1uYW1lZC1vdXRsZXRzKVxuICAgKi9cbiAgQElucHV0KCkgbmFtZSA9IFBSSU1BUllfT1VUTEVUO1xuXG4gIEBPdXRwdXQoJ2FjdGl2YXRlJykgYWN0aXZhdGVFdmVudHMgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcbiAgQE91dHB1dCgnZGVhY3RpdmF0ZScpIGRlYWN0aXZhdGVFdmVudHMgPSBuZXcgRXZlbnRFbWl0dGVyPGFueT4oKTtcbiAgLyoqXG4gICAqIEVtaXRzIGFuIGF0dGFjaGVkIGNvbXBvbmVudCBpbnN0YW5jZSB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gcmUtYXR0YWNoIGFcbiAgICogcHJldmlvdXNseSBkZXRhY2hlZCBzdWJ0cmVlLlxuICAgKiovXG4gIEBPdXRwdXQoJ2F0dGFjaCcpIGF0dGFjaEV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXI8dW5rbm93bj4oKTtcbiAgLyoqXG4gICAqIEVtaXRzIGEgZGV0YWNoZWQgY29tcG9uZW50IGluc3RhbmNlIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byBkZXRhY2ggdGhlXG4gICAqIHN1YnRyZWUuXG4gICAqL1xuICBAT3V0cHV0KCdkZXRhY2gnKSBkZXRhY2hFdmVudHMgPSBuZXcgRXZlbnRFbWl0dGVyPHVua25vd24+KCk7XG5cbiAgcHJpdmF0ZSBwYXJlbnRDb250ZXh0cyA9IGluamVjdChDaGlsZHJlbk91dGxldENvbnRleHRzKTtcbiAgcHJpdmF0ZSBsb2NhdGlvbiA9IGluamVjdChWaWV3Q29udGFpbmVyUmVmKTtcbiAgcHJpdmF0ZSBjaGFuZ2VEZXRlY3RvciA9IGluamVjdChDaGFuZ2VEZXRlY3RvclJlZik7XG4gIHByaXZhdGUgZW52aXJvbm1lbnRJbmplY3RvciA9IGluamVjdChFbnZpcm9ubWVudEluamVjdG9yKTtcbiAgcHJpdmF0ZSBpbnB1dEJpbmRlciA9IGluamVjdChJTlBVVF9CSU5ERVIsIHtvcHRpb25hbDogdHJ1ZX0pO1xuICAvKiogQG5vZG9jICovXG4gIHJlYWRvbmx5IHN1cHBvcnRzQmluZGluZ1RvQ29tcG9uZW50SW5wdXRzID0gdHJ1ZTtcblxuICAvKiogQG5vZG9jICovXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpIHtcbiAgICBpZiAoY2hhbmdlc1snbmFtZSddKSB7XG4gICAgICBjb25zdCB7Zmlyc3RDaGFuZ2UsIHByZXZpb3VzVmFsdWV9ID0gY2hhbmdlc1snbmFtZSddO1xuICAgICAgaWYgKGZpcnN0Q2hhbmdlKSB7XG4gICAgICAgIC8vIFRoZSBmaXJzdCBjaGFuZ2UgaXMgaGFuZGxlZCBieSBuZ09uSW5pdC4gQmVjYXVzZSBuZ09uQ2hhbmdlcyBkb2Vzbid0IGdldCBjYWxsZWQgd2hlbiBub1xuICAgICAgICAvLyBpbnB1dCBpcyBzZXQgYXQgYWxsLCB3ZSBuZWVkIHRvIGNlbnRyYWxseSBoYW5kbGUgdGhlIGZpcnN0IGNoYW5nZSB0aGVyZS5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyB1bnJlZ2lzdGVyIHdpdGggdGhlIG9sZCBuYW1lXG4gICAgICBpZiAodGhpcy5pc1RyYWNrZWRJblBhcmVudENvbnRleHRzKHByZXZpb3VzVmFsdWUpKSB7XG4gICAgICAgIHRoaXMuZGVhY3RpdmF0ZSgpO1xuICAgICAgICB0aGlzLnBhcmVudENvbnRleHRzLm9uQ2hpbGRPdXRsZXREZXN0cm95ZWQocHJldmlvdXNWYWx1ZSk7XG4gICAgICB9XG4gICAgICAvLyByZWdpc3RlciB0aGUgbmV3IG5hbWVcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZU91dGxldFdpdGhOYW1lKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICAvLyBFbnN1cmUgdGhhdCB0aGUgcmVnaXN0ZXJlZCBvdXRsZXQgaXMgdGhpcyBvbmUgYmVmb3JlIHJlbW92aW5nIGl0IG9uIHRoZSBjb250ZXh0LlxuICAgIGlmICh0aGlzLmlzVHJhY2tlZEluUGFyZW50Q29udGV4dHModGhpcy5uYW1lKSkge1xuICAgICAgdGhpcy5wYXJlbnRDb250ZXh0cy5vbkNoaWxkT3V0bGV0RGVzdHJveWVkKHRoaXMubmFtZSk7XG4gICAgfVxuICAgIHRoaXMuaW5wdXRCaW5kZXI/LnVuc3Vic2NyaWJlRnJvbVJvdXRlRGF0YSh0aGlzKTtcbiAgfVxuXG4gIHByaXZhdGUgaXNUcmFja2VkSW5QYXJlbnRDb250ZXh0cyhvdXRsZXROYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnRDb250ZXh0cy5nZXRDb250ZXh0KG91dGxldE5hbWUpPy5vdXRsZXQgPT09IHRoaXM7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25Jbml0KCk6IHZvaWQge1xuICAgIHRoaXMuaW5pdGlhbGl6ZU91dGxldFdpdGhOYW1lKCk7XG4gIH1cblxuICBwcml2YXRlIGluaXRpYWxpemVPdXRsZXRXaXRoTmFtZSgpIHtcbiAgICB0aGlzLnBhcmVudENvbnRleHRzLm9uQ2hpbGRPdXRsZXRDcmVhdGVkKHRoaXMubmFtZSwgdGhpcyk7XG4gICAgaWYgKHRoaXMuYWN0aXZhdGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIG91dGxldCB3YXMgbm90IGluc3RhbnRpYXRlZCBhdCB0aGUgdGltZSB0aGUgcm91dGUgZ290IGFjdGl2YXRlZCB3ZSBuZWVkIHRvIHBvcHVsYXRlXG4gICAgLy8gdGhlIG91dGxldCB3aGVuIGl0IGlzIGluaXRpYWxpemVkIChpZSBpbnNpZGUgYSBOZ0lmKVxuICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLnBhcmVudENvbnRleHRzLmdldENvbnRleHQodGhpcy5uYW1lKTtcbiAgICBpZiAoY29udGV4dD8ucm91dGUpIHtcbiAgICAgIGlmIChjb250ZXh0LmF0dGFjaFJlZikge1xuICAgICAgICAvLyBgYXR0YWNoUmVmYCBpcyBwb3B1bGF0ZWQgd2hlbiB0aGVyZSBpcyBhbiBleGlzdGluZyBjb21wb25lbnQgdG8gbW91bnRcbiAgICAgICAgdGhpcy5hdHRhY2goY29udGV4dC5hdHRhY2hSZWYsIGNvbnRleHQucm91dGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gb3RoZXJ3aXNlIHRoZSBjb21wb25lbnQgZGVmaW5lZCBpbiB0aGUgY29uZmlndXJhdGlvbiBpcyBjcmVhdGVkXG4gICAgICAgIHRoaXMuYWN0aXZhdGVXaXRoKGNvbnRleHQucm91dGUsIGNvbnRleHQuaW5qZWN0b3IpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldCBpc0FjdGl2YXRlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISF0aGlzLmFjdGl2YXRlZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBUaGUgY3VycmVudGx5IGFjdGl2YXRlZCBjb21wb25lbnQgaW5zdGFuY2UuXG4gICAqIEB0aHJvd3MgQW4gZXJyb3IgaWYgdGhlIG91dGxldCBpcyBub3QgYWN0aXZhdGVkLlxuICAgKi9cbiAgZ2V0IGNvbXBvbmVudCgpOiBPYmplY3Qge1xuICAgIGlmICghdGhpcy5hY3RpdmF0ZWQpXG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuT1VUTEVUX05PVF9BQ1RJVkFURUQsXG4gICAgICAgICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiYgJ091dGxldCBpcyBub3QgYWN0aXZhdGVkJyk7XG4gICAgcmV0dXJuIHRoaXMuYWN0aXZhdGVkLmluc3RhbmNlO1xuICB9XG5cbiAgZ2V0IGFjdGl2YXRlZFJvdXRlKCk6IEFjdGl2YXRlZFJvdXRlIHtcbiAgICBpZiAoIXRoaXMuYWN0aXZhdGVkKVxuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLk9VVExFVF9OT1RfQUNUSVZBVEVELFxuICAgICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmICdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcpO1xuICAgIHJldHVybiB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSBhcyBBY3RpdmF0ZWRSb3V0ZTtcbiAgfVxuXG4gIGdldCBhY3RpdmF0ZWRSb3V0ZURhdGEoKTogRGF0YSB7XG4gICAgaWYgKHRoaXMuX2FjdGl2YXRlZFJvdXRlKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWN0aXZhdGVkUm91dGUuc25hcHNob3QuZGF0YTtcbiAgICB9XG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZSBzdWJ0cmVlXG4gICAqL1xuICBkZXRhY2goKTogQ29tcG9uZW50UmVmPGFueT4ge1xuICAgIGlmICghdGhpcy5hY3RpdmF0ZWQpXG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuT1VUTEVUX05PVF9BQ1RJVkFURUQsXG4gICAgICAgICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiYgJ091dGxldCBpcyBub3QgYWN0aXZhdGVkJyk7XG4gICAgdGhpcy5sb2NhdGlvbi5kZXRhY2goKTtcbiAgICBjb25zdCBjbXAgPSB0aGlzLmFjdGl2YXRlZDtcbiAgICB0aGlzLmFjdGl2YXRlZCA9IG51bGw7XG4gICAgdGhpcy5fYWN0aXZhdGVkUm91dGUgPSBudWxsO1xuICAgIHRoaXMuZGV0YWNoRXZlbnRzLmVtaXQoY21wLmluc3RhbmNlKTtcbiAgICByZXR1cm4gY21wO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gcmUtYXR0YWNoIGEgcHJldmlvdXNseSBkZXRhY2hlZCBzdWJ0cmVlXG4gICAqL1xuICBhdHRhY2gocmVmOiBDb21wb25lbnRSZWY8YW55PiwgYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7XG4gICAgdGhpcy5hY3RpdmF0ZWQgPSByZWY7XG4gICAgdGhpcy5fYWN0aXZhdGVkUm91dGUgPSBhY3RpdmF0ZWRSb3V0ZTtcbiAgICB0aGlzLmxvY2F0aW9uLmluc2VydChyZWYuaG9zdFZpZXcpO1xuICAgIHRoaXMuaW5wdXRCaW5kZXI/LmJpbmRBY3RpdmF0ZWRSb3V0ZVRvT3V0bGV0Q29tcG9uZW50KHRoaXMpO1xuICAgIHRoaXMuYXR0YWNoRXZlbnRzLmVtaXQocmVmLmluc3RhbmNlKTtcbiAgfVxuXG4gIGRlYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuYWN0aXZhdGVkKSB7XG4gICAgICBjb25zdCBjID0gdGhpcy5jb21wb25lbnQ7XG4gICAgICB0aGlzLmFjdGl2YXRlZC5kZXN0cm95KCk7XG4gICAgICB0aGlzLmFjdGl2YXRlZCA9IG51bGw7XG4gICAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IG51bGw7XG4gICAgICB0aGlzLmRlYWN0aXZhdGVFdmVudHMuZW1pdChjKTtcbiAgICB9XG4gIH1cblxuICBhY3RpdmF0ZVdpdGgoYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlLCBlbnZpcm9ubWVudEluamVjdG9yPzogRW52aXJvbm1lbnRJbmplY3RvcnxudWxsKSB7XG4gICAgaWYgKHRoaXMuaXNBY3RpdmF0ZWQpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5PVVRMRVRfQUxSRUFEWV9BQ1RJVkFURUQsXG4gICAgICAgICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiZcbiAgICAgICAgICAgICAgJ0Nhbm5vdCBhY3RpdmF0ZSBhbiBhbHJlYWR5IGFjdGl2YXRlZCBvdXRsZXQnKTtcbiAgICB9XG4gICAgdGhpcy5fYWN0aXZhdGVkUm91dGUgPSBhY3RpdmF0ZWRSb3V0ZTtcbiAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMubG9jYXRpb247XG4gICAgY29uc3Qgc25hcHNob3QgPSBhY3RpdmF0ZWRSb3V0ZS5zbmFwc2hvdDtcbiAgICBjb25zdCBjb21wb25lbnQgPSBzbmFwc2hvdC5jb21wb25lbnQhO1xuICAgIGNvbnN0IGNoaWxkQ29udGV4dHMgPSB0aGlzLnBhcmVudENvbnRleHRzLmdldE9yQ3JlYXRlQ29udGV4dCh0aGlzLm5hbWUpLmNoaWxkcmVuO1xuICAgIGNvbnN0IGluamVjdG9yID0gbmV3IE91dGxldEluamVjdG9yKGFjdGl2YXRlZFJvdXRlLCBjaGlsZENvbnRleHRzLCBsb2NhdGlvbi5pbmplY3Rvcik7XG5cbiAgICB0aGlzLmFjdGl2YXRlZCA9IGxvY2F0aW9uLmNyZWF0ZUNvbXBvbmVudChjb21wb25lbnQsIHtcbiAgICAgIGluZGV4OiBsb2NhdGlvbi5sZW5ndGgsXG4gICAgICBpbmplY3RvcixcbiAgICAgIGVudmlyb25tZW50SW5qZWN0b3I6IGVudmlyb25tZW50SW5qZWN0b3IgPz8gdGhpcy5lbnZpcm9ubWVudEluamVjdG9yXG4gICAgfSk7XG4gICAgLy8gQ2FsbGluZyBgbWFya0ZvckNoZWNrYCB0byBtYWtlIHN1cmUgd2Ugd2lsbCBydW4gdGhlIGNoYW5nZSBkZXRlY3Rpb24gd2hlbiB0aGVcbiAgICAvLyBgUm91dGVyT3V0bGV0YCBpcyBpbnNpZGUgYSBgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoYCBjb21wb25lbnQuXG4gICAgdGhpcy5jaGFuZ2VEZXRlY3Rvci5tYXJrRm9yQ2hlY2soKTtcbiAgICB0aGlzLmlucHV0QmluZGVyPy5iaW5kQWN0aXZhdGVkUm91dGVUb091dGxldENvbXBvbmVudCh0aGlzKTtcbiAgICB0aGlzLmFjdGl2YXRlRXZlbnRzLmVtaXQodGhpcy5hY3RpdmF0ZWQuaW5zdGFuY2UpO1xuICB9XG59XG5cbmNsYXNzIE91dGxldEluamVjdG9yIGltcGxlbWVudHMgSW5qZWN0b3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm91dGU6IEFjdGl2YXRlZFJvdXRlLCBwcml2YXRlIGNoaWxkQ29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsXG4gICAgICBwcml2YXRlIHBhcmVudDogSW5qZWN0b3IpIHt9XG5cbiAgZ2V0KHRva2VuOiBhbnksIG5vdEZvdW5kVmFsdWU/OiBhbnkpOiBhbnkge1xuICAgIGlmICh0b2tlbiA9PT0gQWN0aXZhdGVkUm91dGUpIHtcbiAgICAgIHJldHVybiB0aGlzLnJvdXRlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbiA9PT0gQ2hpbGRyZW5PdXRsZXRDb250ZXh0cykge1xuICAgICAgcmV0dXJuIHRoaXMuY2hpbGRDb250ZXh0cztcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5wYXJlbnQuZ2V0KHRva2VuLCBub3RGb3VuZFZhbHVlKTtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgSU5QVVRfQklOREVSID0gbmV3IEluamVjdGlvblRva2VuPFJvdXRlZENvbXBvbmVudElucHV0QmluZGVyPignJyk7XG5cbi8qKlxuICogSW5qZWN0YWJsZSB1c2VkIGFzIGEgdHJlZS1zaGFrYWJsZSBwcm92aWRlciBmb3Igb3B0aW5nIGluIHRvIGJpbmRpbmcgcm91dGVyIGRhdGEgdG8gY29tcG9uZW50XG4gKiBpbnB1dHMuXG4gKlxuICogVGhlIFJvdXRlck91dGxldCByZWdpc3RlcnMgaXRzZWxmIHdpdGggdGhpcyBzZXJ2aWNlIHdoZW4gYW4gYEFjdGl2YXRlZFJvdXRlYCBpcyBhdHRhY2hlZCBvclxuICogYWN0aXZhdGVkLiBXaGVuIHRoaXMgaGFwcGVucywgdGhlIHNlcnZpY2Ugc3Vic2NyaWJlcyB0byB0aGUgYEFjdGl2YXRlZFJvdXRlYCBvYnNlcnZhYmxlcyAocGFyYW1zLFxuICogcXVlcnlQYXJhbXMsIGRhdGEpIGFuZCBzZXRzIHRoZSBpbnB1dHMgb2YgdGhlIGNvbXBvbmVudCB1c2luZyBgQ29tcG9uZW50UmVmLnNldElucHV0YC5cbiAqIEltcG9ydGFudGx5LCB3aGVuIGFuIGlucHV0IGRvZXMgbm90IGhhdmUgYW4gaXRlbSBpbiB0aGUgcm91dGUgZGF0YSB3aXRoIGEgbWF0Y2hpbmcga2V5LCB0aGlzXG4gKiBpbnB1dCBpcyBzZXQgdG8gYHVuZGVmaW5lZGAuIElmIGl0IHdlcmUgbm90IGRvbmUgdGhpcyB3YXksIHRoZSBwcmV2aW91cyBpbmZvcm1hdGlvbiB3b3VsZCBiZVxuICogcmV0YWluZWQgaWYgdGhlIGRhdGEgZ290IHJlbW92ZWQgZnJvbSB0aGUgcm91dGUgKGkuZS4gaWYgYSBxdWVyeSBwYXJhbWV0ZXIgaXMgcmVtb3ZlZCkuXG4gKlxuICogVGhlIGBSb3V0ZXJPdXRsZXRgIHNob3VsZCB1bnJlZ2lzdGVyIGl0c2VsZiB3aGVuIGRlc3Ryb3llZCB2aWEgYHVuc3Vic2NyaWJlRnJvbVJvdXRlRGF0YWAgc28gdGhhdFxuICogdGhlIHN1YnNjcmlwdGlvbnMgYXJlIGNsZWFuZWQgdXAuXG4gKi9cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBSb3V0ZWRDb21wb25lbnRJbnB1dEJpbmRlciB7XG4gIHByaXZhdGUgb3V0bGV0RGF0YVN1YnNjcmlwdGlvbnMgPSBuZXcgTWFwPFJvdXRlck91dGxldCwgU3Vic2NyaXB0aW9uPjtcblxuICBiaW5kQWN0aXZhdGVkUm91dGVUb091dGxldENvbXBvbmVudChvdXRsZXQ6IFJvdXRlck91dGxldCkge1xuICAgIHRoaXMudW5zdWJzY3JpYmVGcm9tUm91dGVEYXRhKG91dGxldCk7XG4gICAgdGhpcy5zdWJzY3JpYmVUb1JvdXRlRGF0YShvdXRsZXQpO1xuICB9XG5cbiAgdW5zdWJzY3JpYmVGcm9tUm91dGVEYXRhKG91dGxldDogUm91dGVyT3V0bGV0KSB7XG4gICAgdGhpcy5vdXRsZXREYXRhU3Vic2NyaXB0aW9ucy5nZXQob3V0bGV0KT8udW5zdWJzY3JpYmUoKTtcbiAgICB0aGlzLm91dGxldERhdGFTdWJzY3JpcHRpb25zLmRlbGV0ZShvdXRsZXQpO1xuICB9XG5cbiAgcHJpdmF0ZSBzdWJzY3JpYmVUb1JvdXRlRGF0YShvdXRsZXQ6IFJvdXRlck91dGxldCkge1xuICAgIGNvbnN0IHthY3RpdmF0ZWRSb3V0ZX0gPSBvdXRsZXQ7XG4gICAgY29uc3QgZGF0YVN1YnNjcmlwdGlvbiA9XG4gICAgICAgIGNvbWJpbmVMYXRlc3QoW1xuICAgICAgICAgIGFjdGl2YXRlZFJvdXRlLnF1ZXJ5UGFyYW1zLFxuICAgICAgICAgIGFjdGl2YXRlZFJvdXRlLnBhcmFtcyxcbiAgICAgICAgICBhY3RpdmF0ZWRSb3V0ZS5kYXRhLFxuICAgICAgICBdKVxuICAgICAgICAgICAgLnBpcGUoc3dpdGNoTWFwKChbcXVlcnlQYXJhbXMsIHBhcmFtcywgZGF0YV0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgIGRhdGEgPSB7Li4ucXVlcnlQYXJhbXMsIC4uLnBhcmFtcywgLi4uZGF0YX07XG4gICAgICAgICAgICAgIC8vIEdldCB0aGUgZmlyc3QgcmVzdWx0IGZyb20gdGhlIGRhdGEgc3Vic2NyaXB0aW9uIHN5bmNocm9ub3VzbHkgc28gaXQncyBhdmFpbGFibGUgdG9cbiAgICAgICAgICAgICAgLy8gdGhlIGNvbXBvbmVudCBhcyBzb29uIGFzIHBvc3NpYmxlIChhbmQgZG9lc24ndCByZXF1aXJlIGEgc2Vjb25kIGNoYW5nZSBkZXRlY3Rpb24pLlxuICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb2YoZGF0YSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gUHJvbWlzZS5yZXNvbHZlIGlzIHVzZWQgdG8gYXZvaWQgc3luY2hyb25vdXNseSB3cml0aW5nIHRoZSB3cm9uZyBkYXRhIHdoZW5cbiAgICAgICAgICAgICAgLy8gdHdvIG9mIHRoZSBPYnNlcnZhYmxlcyBpbiB0aGUgYGNvbWJpbmVMYXRlc3RgIHN0cmVhbSBlbWl0IG9uZSBhZnRlclxuICAgICAgICAgICAgICAvLyBhbm90aGVyLlxuICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAuc3Vic2NyaWJlKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAvLyBPdXRsZXQgbWF5IGhhdmUgYmVlbiBkZWFjdGl2YXRlZCBvciBjaGFuZ2VkIG5hbWVzIHRvIGJlIGFzc29jaWF0ZWQgd2l0aCBhIGRpZmZlcmVudFxuICAgICAgICAgICAgICAvLyByb3V0ZVxuICAgICAgICAgICAgICBpZiAoIW91dGxldC5pc0FjdGl2YXRlZCB8fCAhb3V0bGV0LmFjdGl2YXRlZENvbXBvbmVudFJlZiB8fFxuICAgICAgICAgICAgICAgICAgb3V0bGV0LmFjdGl2YXRlZFJvdXRlICE9PSBhY3RpdmF0ZWRSb3V0ZSB8fCBhY3RpdmF0ZWRSb3V0ZS5jb21wb25lbnQgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlRnJvbVJvdXRlRGF0YShvdXRsZXQpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNvbnN0IG1pcnJvciA9IHJlZmxlY3RDb21wb25lbnRUeXBlKGFjdGl2YXRlZFJvdXRlLmNvbXBvbmVudCk7XG4gICAgICAgICAgICAgIGlmICghbWlycm9yKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZUZyb21Sb3V0ZURhdGEob3V0bGV0KTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBmb3IgKGNvbnN0IHt0ZW1wbGF0ZU5hbWV9IG9mIG1pcnJvci5pbnB1dHMpIHtcbiAgICAgICAgICAgICAgICBvdXRsZXQuYWN0aXZhdGVkQ29tcG9uZW50UmVmLnNldElucHV0KHRlbXBsYXRlTmFtZSwgZGF0YVt0ZW1wbGF0ZU5hbWVdKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICB0aGlzLm91dGxldERhdGFTdWJzY3JpcHRpb25zLnNldChvdXRsZXQsIGRhdGFTdWJzY3JpcHRpb24pO1xuICB9XG59XG4iXX0=