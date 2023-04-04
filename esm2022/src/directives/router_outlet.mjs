/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ChangeDetectorRef, Directive, EnvironmentInjector, EventEmitter, inject, Injectable, InjectionToken, Input, Output, reflectComponentType, ViewContainerRef, ɵRuntimeError as RuntimeError, } from '@angular/core';
import { combineLatest } from 'rxjs';
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
 * @see `RouterLink`
 * @see `Route`
 * @ngModule RouterModule
 *
 * @publicApi
 */
class RouterOutlet {
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.6+sha-cb23864", ngImport: i0, type: RouterOutlet, deps: [], target: i0.ɵɵFactoryTarget.Directive }); }
    static { this.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "16.0.0-next.6+sha-cb23864", type: RouterOutlet, isStandalone: true, selector: "router-outlet", inputs: { name: "name" }, outputs: { activateEvents: "activate", deactivateEvents: "deactivate", attachEvents: "attach", detachEvents: "detach" }, exportAs: ["outlet"], usesOnChanges: true, ngImport: i0 }); }
}
export { RouterOutlet };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.6+sha-cb23864", ngImport: i0, type: RouterOutlet, decorators: [{
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
class RoutedComponentInputBinder {
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
            .pipe(switchMap(([queryParams, params, data]) => {
            // Promise.resolve is used to avoid synchronously writing the wrong data when two of
            // the Observables in the `combineLatest` stream emit one after another.
            return Promise.resolve({ ...queryParams, ...params, ...data });
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.6+sha-cb23864", ngImport: i0, type: RoutedComponentInputBinder, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.0.0-next.6+sha-cb23864", ngImport: i0, type: RoutedComponentInputBinder }); }
}
export { RoutedComponentInputBinder };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.6+sha-cb23864", ngImport: i0, type: RoutedComponentInputBinder, decorators: [{
            type: Injectable
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX291dGxldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxpQkFBaUIsRUFBZ0IsU0FBUyxFQUFFLG1CQUFtQixFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLGNBQWMsRUFBWSxLQUFLLEVBQXFCLE1BQU0sRUFBRSxvQkFBb0IsRUFBaUIsZ0JBQWdCLEVBQUUsYUFBYSxJQUFJLFlBQVksR0FBRSxNQUFNLGVBQWUsQ0FBQztBQUNuUixPQUFPLEVBQUMsYUFBYSxFQUFlLE1BQU0sTUFBTSxDQUFDO0FBQ2pELE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUl6QyxPQUFPLEVBQUMsc0JBQXNCLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNoRSxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLFdBQVcsQ0FBQzs7QUFnR3pDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtERztBQUNILE1BS2EsWUFBWTtJQUx6QjtRQU1VLGNBQVMsR0FBMkIsSUFBSSxDQUFDO1FBS3pDLG9CQUFlLEdBQXdCLElBQUksQ0FBQztRQUNwRDs7OztXQUlHO1FBQ00sU0FBSSxHQUFHLGNBQWMsQ0FBQztRQUVYLG1CQUFjLEdBQUcsSUFBSSxZQUFZLEVBQU8sQ0FBQztRQUN2QyxxQkFBZ0IsR0FBRyxJQUFJLFlBQVksRUFBTyxDQUFDO1FBQ2pFOzs7WUFHSTtRQUNjLGlCQUFZLEdBQUcsSUFBSSxZQUFZLEVBQVcsQ0FBQztRQUM3RDs7O1dBR0c7UUFDZSxpQkFBWSxHQUFHLElBQUksWUFBWSxF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Z2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDaGFuZ2VEZXRlY3RvclJlZiwgQ29tcG9uZW50UmVmLCBEaXJlY3RpdmUsIEVudmlyb25tZW50SW5qZWN0b3IsIEV2ZW50RW1pdHRlciwgaW5qZWN0LCBJbmplY3RhYmxlLCBJbmplY3Rpb25Ub2tlbiwgSW5qZWN0b3IsIElucHV0LCBPbkRlc3Ryb3ksIE9uSW5pdCwgT3V0cHV0LCByZWZsZWN0Q29tcG9uZW50VHlwZSwgU2ltcGxlQ2hhbmdlcywgVmlld0NvbnRhaW5lclJlZiwgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yLH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge2NvbWJpbmVMYXRlc3QsIFN1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge3N3aXRjaE1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge1J1bnRpbWVFcnJvckNvZGV9IGZyb20gJy4uL2Vycm9ycyc7XG5pbXBvcnQge0RhdGF9IGZyb20gJy4uL21vZGVscyc7XG5pbXBvcnQge0NoaWxkcmVuT3V0bGV0Q29udGV4dHN9IGZyb20gJy4uL3JvdXRlcl9vdXRsZXRfY29udGV4dCc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlfSBmcm9tICcuLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQUklNQVJZX09VVExFVH0gZnJvbSAnLi4vc2hhcmVkJztcblxuXG4vKipcbiAqIEFuIGludGVyZmFjZSB0aGF0IGRlZmluZXMgdGhlIGNvbnRyYWN0IGZvciBkZXZlbG9waW5nIGEgY29tcG9uZW50IG91dGxldCBmb3IgdGhlIGBSb3V0ZXJgLlxuICpcbiAqIEFuIG91dGxldCBhY3RzIGFzIGEgcGxhY2Vob2xkZXIgdGhhdCBBbmd1bGFyIGR5bmFtaWNhbGx5IGZpbGxzIGJhc2VkIG9uIHRoZSBjdXJyZW50IHJvdXRlciBzdGF0ZS5cbiAqXG4gKiBBIHJvdXRlciBvdXRsZXQgc2hvdWxkIHJlZ2lzdGVyIGl0c2VsZiB3aXRoIHRoZSBgUm91dGVyYCB2aWFcbiAqIGBDaGlsZHJlbk91dGxldENvbnRleHRzI29uQ2hpbGRPdXRsZXRDcmVhdGVkYCBhbmQgdW5yZWdpc3RlciB3aXRoXG4gKiBgQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyNvbkNoaWxkT3V0bGV0RGVzdHJveWVkYC4gV2hlbiB0aGUgYFJvdXRlcmAgaWRlbnRpZmllcyBhIG1hdGNoZWQgYFJvdXRlYCxcbiAqIGl0IGxvb2tzIGZvciBhIHJlZ2lzdGVyZWQgb3V0bGV0IGluIHRoZSBgQ2hpbGRyZW5PdXRsZXRDb250ZXh0c2AgYW5kIGFjdGl2YXRlcyBpdC5cbiAqXG4gKiBAc2VlIGBDaGlsZHJlbk91dGxldENvbnRleHRzYFxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJvdXRlck91dGxldENvbnRyYWN0IHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGdpdmVuIG91dGxldCBpcyBhY3RpdmF0ZWQuXG4gICAqXG4gICAqIEFuIG91dGxldCBpcyBjb25zaWRlcmVkIFwiYWN0aXZhdGVkXCIgaWYgaXQgaGFzIGFuIGFjdGl2ZSBjb21wb25lbnQuXG4gICAqL1xuICBpc0FjdGl2YXRlZDogYm9vbGVhbjtcblxuICAvKiogVGhlIGluc3RhbmNlIG9mIHRoZSBhY3RpdmF0ZWQgY29tcG9uZW50IG9yIGBudWxsYCBpZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQuICovXG4gIGNvbXBvbmVudDogT2JqZWN0fG51bGw7XG5cbiAgLyoqXG4gICAqIFRoZSBgRGF0YWAgb2YgdGhlIGBBY3RpdmF0ZWRSb3V0ZWAgc25hcHNob3QuXG4gICAqL1xuICBhY3RpdmF0ZWRSb3V0ZURhdGE6IERhdGE7XG5cbiAgLyoqXG4gICAqIFRoZSBgQWN0aXZhdGVkUm91dGVgIGZvciB0aGUgb3V0bGV0IG9yIGBudWxsYCBpZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQuXG4gICAqL1xuICBhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGV8bnVsbDtcblxuICAvKipcbiAgICogQ2FsbGVkIGJ5IHRoZSBgUm91dGVyYCB3aGVuIHRoZSBvdXRsZXQgc2hvdWxkIGFjdGl2YXRlIChjcmVhdGUgYSBjb21wb25lbnQpLlxuICAgKi9cbiAgYWN0aXZhdGVXaXRoKGFjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSwgZW52aXJvbm1lbnRJbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvcnxudWxsKTogdm9pZDtcblxuICAvKipcbiAgICogQSByZXF1ZXN0IHRvIGRlc3Ryb3kgdGhlIGN1cnJlbnRseSBhY3RpdmF0ZWQgY29tcG9uZW50LlxuICAgKlxuICAgKiBXaGVuIGEgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5kaWNhdGVzIHRoYXQgYW4gYEFjdGl2YXRlZFJvdXRlYCBzaG91bGQgYmUgcmVtb3ZlZCBidXQgc3RvcmVkIGZvclxuICAgKiBsYXRlciByZS11c2UgcmF0aGVyIHRoYW4gZGVzdHJveWVkLCB0aGUgYFJvdXRlcmAgd2lsbCBjYWxsIGBkZXRhY2hgIGluc3RlYWQuXG4gICAqL1xuICBkZWFjdGl2YXRlKCk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZSBzdWJ0cmVlLlxuICAgKlxuICAgKiBUaGlzIGlzIHNpbWlsYXIgdG8gYGRlYWN0aXZhdGVgLCBidXQgdGhlIGFjdGl2YXRlZCBjb21wb25lbnQgc2hvdWxkIF9ub3RfIGJlIGRlc3Ryb3llZC5cbiAgICogSW5zdGVhZCwgaXQgaXMgcmV0dXJuZWQgc28gdGhhdCBpdCBjYW4gYmUgcmVhdHRhY2hlZCBsYXRlciB2aWEgdGhlIGBhdHRhY2hgIG1ldGhvZC5cbiAgICovXG4gIGRldGFjaCgpOiBDb21wb25lbnRSZWY8dW5rbm93bj47XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gcmUtYXR0YWNoIGEgcHJldmlvdXNseSBkZXRhY2hlZCBzdWJ0cmVlLlxuICAgKi9cbiAgYXR0YWNoKHJlZjogQ29tcG9uZW50UmVmPHVua25vd24+LCBhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGUpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBFbWl0cyBhbiBhY3RpdmF0ZSBldmVudCB3aGVuIGEgbmV3IGNvbXBvbmVudCBpcyBpbnN0YW50aWF0ZWRcbiAgICoqL1xuICBhY3RpdmF0ZUV2ZW50cz86IEV2ZW50RW1pdHRlcjx1bmtub3duPjtcblxuICAvKipcbiAgICogRW1pdHMgYSBkZWFjdGl2YXRlIGV2ZW50IHdoZW4gYSBjb21wb25lbnQgaXMgZGVzdHJveWVkLlxuICAgKi9cbiAgZGVhY3RpdmF0ZUV2ZW50cz86IEV2ZW50RW1pdHRlcjx1bmtub3duPjtcblxuICAvKipcbiAgICogRW1pdHMgYW4gYXR0YWNoZWQgY29tcG9uZW50IGluc3RhbmNlIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byByZS1hdHRhY2ggYVxuICAgKiBwcmV2aW91c2x5IGRldGFjaGVkIHN1YnRyZWUuXG4gICAqKi9cbiAgYXR0YWNoRXZlbnRzPzogRXZlbnRFbWl0dGVyPHVua25vd24+O1xuXG4gIC8qKlxuICAgKiBFbWl0cyBhIGRldGFjaGVkIGNvbXBvbmVudCBpbnN0YW5jZSB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZVxuICAgKiBzdWJ0cmVlLlxuICAgKi9cbiAgZGV0YWNoRXZlbnRzPzogRXZlbnRFbWl0dGVyPHVua25vd24+O1xuXG4gIC8qKlxuICAgKiBVc2VkIHRvIGluZGljYXRlIHRoYXQgdGhlIG91dGxldCBpcyBhYmxlIHRvIGJpbmQgZGF0YSBmcm9tIHRoZSBgUm91dGVyYCB0byB0aGUgb3V0bGV0XG4gICAqIGNvbXBvbmVudCdzIGlucHV0cy5cbiAgICpcbiAgICogV2hlbiB0aGlzIGlzIGB1bmRlZmluZWRgIG9yIGBmYWxzZWAgYW5kIHRoZSBkZXZlbG9wZXIgaGFzIG9wdGVkIGluIHRvIHRoZVxuICAgKiBmZWF0dXJlIHVzaW5nIGB3aXRoQ29tcG9uZW50SW5wdXRCaW5kaW5nYCwgYSB3YXJuaW5nIHdpbGwgYmUgbG9nZ2VkIGluIGRldiBtb2RlIGlmIHRoaXMgb3V0bGV0XG4gICAqIGlzIHVzZWQgaW4gdGhlIGFwcGxpY2F0aW9uLlxuICAgKi9cbiAgcmVhZG9ubHkgc3VwcG9ydHNCaW5kaW5nVG9Db21wb25lbnRJbnB1dHM/OiB0cnVlO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEFjdHMgYXMgYSBwbGFjZWhvbGRlciB0aGF0IEFuZ3VsYXIgZHluYW1pY2FsbHkgZmlsbHMgYmFzZWQgb24gdGhlIGN1cnJlbnQgcm91dGVyIHN0YXRlLlxuICpcbiAqIEVhY2ggb3V0bGV0IGNhbiBoYXZlIGEgdW5pcXVlIG5hbWUsIGRldGVybWluZWQgYnkgdGhlIG9wdGlvbmFsIGBuYW1lYCBhdHRyaWJ1dGUuXG4gKiBUaGUgbmFtZSBjYW5ub3QgYmUgc2V0IG9yIGNoYW5nZWQgZHluYW1pY2FsbHkuIElmIG5vdCBzZXQsIGRlZmF1bHQgdmFsdWUgaXMgXCJwcmltYXJ5XCIuXG4gKlxuICogYGBgXG4gKiA8cm91dGVyLW91dGxldD48L3JvdXRlci1vdXRsZXQ+XG4gKiA8cm91dGVyLW91dGxldCBuYW1lPSdsZWZ0Jz48L3JvdXRlci1vdXRsZXQ+XG4gKiA8cm91dGVyLW91dGxldCBuYW1lPSdyaWdodCc+PC9yb3V0ZXItb3V0bGV0PlxuICogYGBgXG4gKlxuICogTmFtZWQgb3V0bGV0cyBjYW4gYmUgdGhlIHRhcmdldHMgb2Ygc2Vjb25kYXJ5IHJvdXRlcy5cbiAqIFRoZSBgUm91dGVgIG9iamVjdCBmb3IgYSBzZWNvbmRhcnkgcm91dGUgaGFzIGFuIGBvdXRsZXRgIHByb3BlcnR5IHRvIGlkZW50aWZ5IHRoZSB0YXJnZXQgb3V0bGV0OlxuICpcbiAqIGB7cGF0aDogPGJhc2UtcGF0aD4sIGNvbXBvbmVudDogPGNvbXBvbmVudD4sIG91dGxldDogPHRhcmdldF9vdXRsZXRfbmFtZT59YFxuICpcbiAqIFVzaW5nIG5hbWVkIG91dGxldHMgYW5kIHNlY29uZGFyeSByb3V0ZXMsIHlvdSBjYW4gdGFyZ2V0IG11bHRpcGxlIG91dGxldHMgaW5cbiAqIHRoZSBzYW1lIGBSb3V0ZXJMaW5rYCBkaXJlY3RpdmUuXG4gKlxuICogVGhlIHJvdXRlciBrZWVwcyB0cmFjayBvZiBzZXBhcmF0ZSBicmFuY2hlcyBpbiBhIG5hdmlnYXRpb24gdHJlZSBmb3IgZWFjaCBuYW1lZCBvdXRsZXQgYW5kXG4gKiBnZW5lcmF0ZXMgYSByZXByZXNlbnRhdGlvbiBvZiB0aGF0IHRyZWUgaW4gdGhlIFVSTC5cbiAqIFRoZSBVUkwgZm9yIGEgc2Vjb25kYXJ5IHJvdXRlIHVzZXMgdGhlIGZvbGxvd2luZyBzeW50YXggdG8gc3BlY2lmeSBib3RoIHRoZSBwcmltYXJ5IGFuZCBzZWNvbmRhcnlcbiAqIHJvdXRlcyBhdCB0aGUgc2FtZSB0aW1lOlxuICpcbiAqIGBodHRwOi8vYmFzZS1wYXRoL3ByaW1hcnktcm91dGUtcGF0aChvdXRsZXQtbmFtZTpyb3V0ZS1wYXRoKWBcbiAqXG4gKiBBIHJvdXRlciBvdXRsZXQgZW1pdHMgYW4gYWN0aXZhdGUgZXZlbnQgd2hlbiBhIG5ldyBjb21wb25lbnQgaXMgaW5zdGFudGlhdGVkLFxuICogZGVhY3RpdmF0ZSBldmVudCB3aGVuIGEgY29tcG9uZW50IGlzIGRlc3Ryb3llZC5cbiAqIEFuIGF0dGFjaGVkIGV2ZW50IGVtaXRzIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0aGUgb3V0bGV0IHRvIHJlYXR0YWNoIHRoZVxuICogc3VidHJlZSwgYW5kIHRoZSBkZXRhY2hlZCBldmVudCBlbWl0cyB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdGhlIG91dGxldCB0b1xuICogZGV0YWNoIHRoZSBzdWJ0cmVlLlxuICpcbiAqIGBgYFxuICogPHJvdXRlci1vdXRsZXRcbiAqICAgKGFjdGl2YXRlKT0nb25BY3RpdmF0ZSgkZXZlbnQpJ1xuICogICAoZGVhY3RpdmF0ZSk9J29uRGVhY3RpdmF0ZSgkZXZlbnQpJ1xuICogICAoYXR0YWNoKT0nb25BdHRhY2goJGV2ZW50KSdcbiAqICAgKGRldGFjaCk9J29uRGV0YWNoKCRldmVudCknPjwvcm91dGVyLW91dGxldD5cbiAqIGBgYFxuICpcbiAqIEBzZWUgW1JvdXRpbmcgdHV0b3JpYWxdKGd1aWRlL3JvdXRlci10dXRvcmlhbC10b2gjbmFtZWQtb3V0bGV0cyBcIkV4YW1wbGUgb2YgYSBuYW1lZFxuICogb3V0bGV0IGFuZCBzZWNvbmRhcnkgcm91dGUgY29uZmlndXJhdGlvblwiKS5cbiAqIEBzZWUgYFJvdXRlckxpbmtgXG4gKiBAc2VlIGBSb3V0ZWBcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBEaXJlY3RpdmUoe1xuICBzZWxlY3RvcjogJ3JvdXRlci1vdXRsZXQnLFxuICBleHBvcnRBczogJ291dGxldCcsXG4gIHN0YW5kYWxvbmU6IHRydWUsXG59KVxuZXhwb3J0IGNsYXNzIFJvdXRlck91dGxldCBpbXBsZW1lbnRzIE9uRGVzdHJveSwgT25Jbml0LCBSb3V0ZXJPdXRsZXRDb250cmFjdCB7XG4gIHByaXZhdGUgYWN0aXZhdGVkOiBDb21wb25lbnRSZWY8YW55PnxudWxsID0gbnVsbDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBnZXQgYWN0aXZhdGVkQ29tcG9uZW50UmVmKCk6IENvbXBvbmVudFJlZjxhbnk+fG51bGwge1xuICAgIHJldHVybiB0aGlzLmFjdGl2YXRlZDtcbiAgfVxuICBwcml2YXRlIF9hY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGV8bnVsbCA9IG51bGw7XG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgb3V0bGV0XG4gICAqXG4gICAqIEBzZWUgW25hbWVkIG91dGxldHNdKGd1aWRlL3JvdXRlci10dXRvcmlhbC10b2gjZGlzcGxheWluZy1tdWx0aXBsZS1yb3V0ZXMtaW4tbmFtZWQtb3V0bGV0cylcbiAgICovXG4gIEBJbnB1dCgpIG5hbWUgPSBQUklNQVJZX09VVExFVDtcblxuICBAT3V0cHV0KCdhY3RpdmF0ZScpIGFjdGl2YXRlRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG4gIEBPdXRwdXQoJ2RlYWN0aXZhdGUnKSBkZWFjdGl2YXRlRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG4gIC8qKlxuICAgKiBFbWl0cyBhbiBhdHRhY2hlZCBjb21wb25lbnQgaW5zdGFuY2Ugd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIHJlLWF0dGFjaCBhXG4gICAqIHByZXZpb3VzbHkgZGV0YWNoZWQgc3VidHJlZS5cbiAgICoqL1xuICBAT3V0cHV0KCdhdHRhY2gnKSBhdHRhY2hFdmVudHMgPSBuZXcgRXZlbnRFbWl0dGVyPHVua25vd24+KCk7XG4gIC8qKlxuICAgKiBFbWl0cyBhIGRldGFjaGVkIGNvbXBvbmVudCBpbnN0YW5jZSB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZVxuICAgKiBzdWJ0cmVlLlxuICAgKi9cbiAgQE91dHB1dCgnZGV0YWNoJykgZGV0YWNoRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjx1bmtub3duPigpO1xuXG4gIHByaXZhdGUgcGFyZW50Q29udGV4dHMgPSBpbmplY3QoQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk7XG4gIHByaXZhdGUgbG9jYXRpb24gPSBpbmplY3QoVmlld0NvbnRhaW5lclJlZik7XG4gIHByaXZhdGUgY2hhbmdlRGV0ZWN0b3IgPSBpbmplY3QoQ2hhbmdlRGV0ZWN0b3JSZWYpO1xuICBwcml2YXRlIGVudmlyb25tZW50SW5qZWN0b3IgPSBpbmplY3QoRW52aXJvbm1lbnRJbmplY3Rvcik7XG4gIHByaXZhdGUgaW5wdXRCaW5kZXIgPSBpbmplY3QoSU5QVVRfQklOREVSLCB7b3B0aW9uYWw6IHRydWV9KTtcbiAgLyoqIEBub2RvYyAqL1xuICByZWFkb25seSBzdXBwb3J0c0JpbmRpbmdUb0NvbXBvbmVudElucHV0cyA9IHRydWU7XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7XG4gICAgaWYgKGNoYW5nZXNbJ25hbWUnXSkge1xuICAgICAgY29uc3Qge2ZpcnN0Q2hhbmdlLCBwcmV2aW91c1ZhbHVlfSA9IGNoYW5nZXNbJ25hbWUnXTtcbiAgICAgIGlmIChmaXJzdENoYW5nZSkge1xuICAgICAgICAvLyBUaGUgZmlyc3QgY2hhbmdlIGlzIGhhbmRsZWQgYnkgbmdPbkluaXQuIEJlY2F1c2UgbmdPbkNoYW5nZXMgZG9lc24ndCBnZXQgY2FsbGVkIHdoZW4gbm9cbiAgICAgICAgLy8gaW5wdXQgaXMgc2V0IGF0IGFsbCwgd2UgbmVlZCB0byBjZW50cmFsbHkgaGFuZGxlIHRoZSBmaXJzdCBjaGFuZ2UgdGhlcmUuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gdW5yZWdpc3RlciB3aXRoIHRoZSBvbGQgbmFtZVxuICAgICAgaWYgKHRoaXMuaXNUcmFja2VkSW5QYXJlbnRDb250ZXh0cyhwcmV2aW91c1ZhbHVlKSkge1xuICAgICAgICB0aGlzLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgdGhpcy5wYXJlbnRDb250ZXh0cy5vbkNoaWxkT3V0bGV0RGVzdHJveWVkKHByZXZpb3VzVmFsdWUpO1xuICAgICAgfVxuICAgICAgLy8gcmVnaXN0ZXIgdGhlIG5ldyBuYW1lXG4gICAgICB0aGlzLmluaXRpYWxpemVPdXRsZXRXaXRoTmFtZSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgLy8gRW5zdXJlIHRoYXQgdGhlIHJlZ2lzdGVyZWQgb3V0bGV0IGlzIHRoaXMgb25lIGJlZm9yZSByZW1vdmluZyBpdCBvbiB0aGUgY29udGV4dC5cbiAgICBpZiAodGhpcy5pc1RyYWNrZWRJblBhcmVudENvbnRleHRzKHRoaXMubmFtZSkpIHtcbiAgICAgIHRoaXMucGFyZW50Q29udGV4dHMub25DaGlsZE91dGxldERlc3Ryb3llZCh0aGlzLm5hbWUpO1xuICAgIH1cbiAgICB0aGlzLmlucHV0QmluZGVyPy51bnN1YnNjcmliZUZyb21Sb3V0ZURhdGEodGhpcyk7XG4gIH1cblxuICBwcml2YXRlIGlzVHJhY2tlZEluUGFyZW50Q29udGV4dHMob3V0bGV0TmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMucGFyZW50Q29udGV4dHMuZ2V0Q29udGV4dChvdXRsZXROYW1lKT8ub3V0bGV0ID09PSB0aGlzO1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uSW5pdCgpOiB2b2lkIHtcbiAgICB0aGlzLmluaXRpYWxpemVPdXRsZXRXaXRoTmFtZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBpbml0aWFsaXplT3V0bGV0V2l0aE5hbWUoKSB7XG4gICAgdGhpcy5wYXJlbnRDb250ZXh0cy5vbkNoaWxkT3V0bGV0Q3JlYXRlZCh0aGlzLm5hbWUsIHRoaXMpO1xuICAgIGlmICh0aGlzLmFjdGl2YXRlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBvdXRsZXQgd2FzIG5vdCBpbnN0YW50aWF0ZWQgYXQgdGhlIHRpbWUgdGhlIHJvdXRlIGdvdCBhY3RpdmF0ZWQgd2UgbmVlZCB0byBwb3B1bGF0ZVxuICAgIC8vIHRoZSBvdXRsZXQgd2hlbiBpdCBpcyBpbml0aWFsaXplZCAoaWUgaW5zaWRlIGEgTmdJZilcbiAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5wYXJlbnRDb250ZXh0cy5nZXRDb250ZXh0KHRoaXMubmFtZSk7XG4gICAgaWYgKGNvbnRleHQ/LnJvdXRlKSB7XG4gICAgICBpZiAoY29udGV4dC5hdHRhY2hSZWYpIHtcbiAgICAgICAgLy8gYGF0dGFjaFJlZmAgaXMgcG9wdWxhdGVkIHdoZW4gdGhlcmUgaXMgYW4gZXhpc3RpbmcgY29tcG9uZW50IHRvIG1vdW50XG4gICAgICAgIHRoaXMuYXR0YWNoKGNvbnRleHQuYXR0YWNoUmVmLCBjb250ZXh0LnJvdXRlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIG90aGVyd2lzZSB0aGUgY29tcG9uZW50IGRlZmluZWQgaW4gdGhlIGNvbmZpZ3VyYXRpb24gaXMgY3JlYXRlZFxuICAgICAgICB0aGlzLmFjdGl2YXRlV2l0aChjb250ZXh0LnJvdXRlLCBjb250ZXh0LmluamVjdG9yKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXQgaXNBY3RpdmF0ZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhdGhpcy5hY3RpdmF0ZWQ7XG4gIH1cblxuICAvKipcbiAgICogQHJldHVybnMgVGhlIGN1cnJlbnRseSBhY3RpdmF0ZWQgY29tcG9uZW50IGluc3RhbmNlLlxuICAgKiBAdGhyb3dzIEFuIGVycm9yIGlmIHRoZSBvdXRsZXQgaXMgbm90IGFjdGl2YXRlZC5cbiAgICovXG4gIGdldCBjb21wb25lbnQoKTogT2JqZWN0IHtcbiAgICBpZiAoIXRoaXMuYWN0aXZhdGVkKVxuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLk9VVExFVF9OT1RfQUNUSVZBVEVELFxuICAgICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmICdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcpO1xuICAgIHJldHVybiB0aGlzLmFjdGl2YXRlZC5pbnN0YW5jZTtcbiAgfVxuXG4gIGdldCBhY3RpdmF0ZWRSb3V0ZSgpOiBBY3RpdmF0ZWRSb3V0ZSB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZClcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5PVVRMRVRfTk9UX0FDVElWQVRFRCxcbiAgICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJiAnT3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQnKTtcbiAgICByZXR1cm4gdGhpcy5fYWN0aXZhdGVkUm91dGUgYXMgQWN0aXZhdGVkUm91dGU7XG4gIH1cblxuICBnZXQgYWN0aXZhdGVkUm91dGVEYXRhKCk6IERhdGEge1xuICAgIGlmICh0aGlzLl9hY3RpdmF0ZWRSb3V0ZSkge1xuICAgICAgcmV0dXJuIHRoaXMuX2FjdGl2YXRlZFJvdXRlLnNuYXBzaG90LmRhdGE7XG4gICAgfVxuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIGRldGFjaCB0aGUgc3VidHJlZVxuICAgKi9cbiAgZGV0YWNoKCk6IENvbXBvbmVudFJlZjxhbnk+IHtcbiAgICBpZiAoIXRoaXMuYWN0aXZhdGVkKVxuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLk9VVExFVF9OT1RfQUNUSVZBVEVELFxuICAgICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmICdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcpO1xuICAgIHRoaXMubG9jYXRpb24uZGV0YWNoKCk7XG4gICAgY29uc3QgY21wID0gdGhpcy5hY3RpdmF0ZWQ7XG4gICAgdGhpcy5hY3RpdmF0ZWQgPSBudWxsO1xuICAgIHRoaXMuX2FjdGl2YXRlZFJvdXRlID0gbnVsbDtcbiAgICB0aGlzLmRldGFjaEV2ZW50cy5lbWl0KGNtcC5pbnN0YW5jZSk7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIHJlLWF0dGFjaCBhIHByZXZpb3VzbHkgZGV0YWNoZWQgc3VidHJlZVxuICAgKi9cbiAgYXR0YWNoKHJlZjogQ29tcG9uZW50UmVmPGFueT4sIGFjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSkge1xuICAgIHRoaXMuYWN0aXZhdGVkID0gcmVmO1xuICAgIHRoaXMuX2FjdGl2YXRlZFJvdXRlID0gYWN0aXZhdGVkUm91dGU7XG4gICAgdGhpcy5sb2NhdGlvbi5pbnNlcnQocmVmLmhvc3RWaWV3KTtcbiAgICB0aGlzLmlucHV0QmluZGVyPy5iaW5kQWN0aXZhdGVkUm91dGVUb091dGxldENvbXBvbmVudCh0aGlzKTtcbiAgICB0aGlzLmF0dGFjaEV2ZW50cy5lbWl0KHJlZi5pbnN0YW5jZSk7XG4gIH1cblxuICBkZWFjdGl2YXRlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmFjdGl2YXRlZCkge1xuICAgICAgY29uc3QgYyA9IHRoaXMuY29tcG9uZW50O1xuICAgICAgdGhpcy5hY3RpdmF0ZWQuZGVzdHJveSgpO1xuICAgICAgdGhpcy5hY3RpdmF0ZWQgPSBudWxsO1xuICAgICAgdGhpcy5fYWN0aXZhdGVkUm91dGUgPSBudWxsO1xuICAgICAgdGhpcy5kZWFjdGl2YXRlRXZlbnRzLmVtaXQoYyk7XG4gICAgfVxuICB9XG5cbiAgYWN0aXZhdGVXaXRoKGFjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSwgZW52aXJvbm1lbnRJbmplY3Rvcj86IEVudmlyb25tZW50SW5qZWN0b3J8bnVsbCkge1xuICAgIGlmICh0aGlzLmlzQWN0aXZhdGVkKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuT1VUTEVUX0FMUkVBRFlfQUNUSVZBVEVELFxuICAgICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmXG4gICAgICAgICAgICAgICdDYW5ub3QgYWN0aXZhdGUgYW4gYWxyZWFkeSBhY3RpdmF0ZWQgb3V0bGV0Jyk7XG4gICAgfVxuICAgIHRoaXMuX2FjdGl2YXRlZFJvdXRlID0gYWN0aXZhdGVkUm91dGU7XG4gICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLmxvY2F0aW9uO1xuICAgIGNvbnN0IHNuYXBzaG90ID0gYWN0aXZhdGVkUm91dGUuc25hcHNob3Q7XG4gICAgY29uc3QgY29tcG9uZW50ID0gc25hcHNob3QuY29tcG9uZW50ITtcbiAgICBjb25zdCBjaGlsZENvbnRleHRzID0gdGhpcy5wYXJlbnRDb250ZXh0cy5nZXRPckNyZWF0ZUNvbnRleHQodGhpcy5uYW1lKS5jaGlsZHJlbjtcbiAgICBjb25zdCBpbmplY3RvciA9IG5ldyBPdXRsZXRJbmplY3RvcihhY3RpdmF0ZWRSb3V0ZSwgY2hpbGRDb250ZXh0cywgbG9jYXRpb24uaW5qZWN0b3IpO1xuXG4gICAgdGhpcy5hY3RpdmF0ZWQgPSBsb2NhdGlvbi5jcmVhdGVDb21wb25lbnQoY29tcG9uZW50LCB7XG4gICAgICBpbmRleDogbG9jYXRpb24ubGVuZ3RoLFxuICAgICAgaW5qZWN0b3IsXG4gICAgICBlbnZpcm9ubWVudEluamVjdG9yOiBlbnZpcm9ubWVudEluamVjdG9yID8/IHRoaXMuZW52aXJvbm1lbnRJbmplY3RvclxuICAgIH0pO1xuICAgIC8vIENhbGxpbmcgYG1hcmtGb3JDaGVja2AgdG8gbWFrZSBzdXJlIHdlIHdpbGwgcnVuIHRoZSBjaGFuZ2UgZGV0ZWN0aW9uIHdoZW4gdGhlXG4gICAgLy8gYFJvdXRlck91dGxldGAgaXMgaW5zaWRlIGEgYENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaGAgY29tcG9uZW50LlxuICAgIHRoaXMuY2hhbmdlRGV0ZWN0b3IubWFya0ZvckNoZWNrKCk7XG4gICAgdGhpcy5pbnB1dEJpbmRlcj8uYmluZEFjdGl2YXRlZFJvdXRlVG9PdXRsZXRDb21wb25lbnQodGhpcyk7XG4gICAgdGhpcy5hY3RpdmF0ZUV2ZW50cy5lbWl0KHRoaXMuYWN0aXZhdGVkLmluc3RhbmNlKTtcbiAgfVxufVxuXG5jbGFzcyBPdXRsZXRJbmplY3RvciBpbXBsZW1lbnRzIEluamVjdG9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSwgcHJpdmF0ZSBjaGlsZENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLFxuICAgICAgcHJpdmF0ZSBwYXJlbnQ6IEluamVjdG9yKSB7fVxuXG4gIGdldCh0b2tlbjogYW55LCBub3RGb3VuZFZhbHVlPzogYW55KTogYW55IHtcbiAgICBpZiAodG9rZW4gPT09IEFjdGl2YXRlZFJvdXRlKSB7XG4gICAgICByZXR1cm4gdGhpcy5yb3V0ZTtcbiAgICB9XG5cbiAgICBpZiAodG9rZW4gPT09IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpIHtcbiAgICAgIHJldHVybiB0aGlzLmNoaWxkQ29udGV4dHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucGFyZW50LmdldCh0b2tlbiwgbm90Rm91bmRWYWx1ZSk7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IElOUFVUX0JJTkRFUiA9IG5ldyBJbmplY3Rpb25Ub2tlbjxSb3V0ZWRDb21wb25lbnRJbnB1dEJpbmRlcj4oJycpO1xuXG4vKipcbiAqIEluamVjdGFibGUgdXNlZCBhcyBhIHRyZWUtc2hha2FibGUgcHJvdmlkZXIgZm9yIG9wdGluZyBpbiB0byBiaW5kaW5nIHJvdXRlciBkYXRhIHRvIGNvbXBvbmVudFxuICogaW5wdXRzLlxuICpcbiAqIFRoZSBSb3V0ZXJPdXRsZXQgcmVnaXN0ZXJzIGl0c2VsZiB3aXRoIHRoaXMgc2VydmljZSB3aGVuIGFuIGBBY3RpdmF0ZWRSb3V0ZWAgaXMgYXR0YWNoZWQgb3JcbiAqIGFjdGl2YXRlZC4gV2hlbiB0aGlzIGhhcHBlbnMsIHRoZSBzZXJ2aWNlIHN1YnNjcmliZXMgdG8gdGhlIGBBY3RpdmF0ZWRSb3V0ZWAgb2JzZXJ2YWJsZXMgKHBhcmFtcyxcbiAqIHF1ZXJ5UGFyYW1zLCBkYXRhKSBhbmQgc2V0cyB0aGUgaW5wdXRzIG9mIHRoZSBjb21wb25lbnQgdXNpbmcgYENvbXBvbmVudFJlZi5zZXRJbnB1dGAuXG4gKiBJbXBvcnRhbnRseSwgd2hlbiBhbiBpbnB1dCBkb2VzIG5vdCBoYXZlIGFuIGl0ZW0gaW4gdGhlIHJvdXRlIGRhdGEgd2l0aCBhIG1hdGNoaW5nIGtleSwgdGhpc1xuICogaW5wdXQgaXMgc2V0IHRvIGB1bmRlZmluZWRgLiBJZiBpdCB3ZXJlIG5vdCBkb25lIHRoaXMgd2F5LCB0aGUgcHJldmlvdXMgaW5mb3JtYXRpb24gd291bGQgYmVcbiAqIHJldGFpbmVkIGlmIHRoZSBkYXRhIGdvdCByZW1vdmVkIGZyb20gdGhlIHJvdXRlIChpLmUuIGlmIGEgcXVlcnkgcGFyYW1ldGVyIGlzIHJlbW92ZWQpLlxuICpcbiAqIFRoZSBgUm91dGVyT3V0bGV0YCBzaG91bGQgdW5yZWdpc3RlciBpdHNlbGYgd2hlbiBkZXN0cm95ZWQgdmlhIGB1bnN1YnNjcmliZUZyb21Sb3V0ZURhdGFgIHNvIHRoYXRcbiAqIHRoZSBzdWJzY3JpcHRpb25zIGFyZSBjbGVhbmVkIHVwLlxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgUm91dGVkQ29tcG9uZW50SW5wdXRCaW5kZXIge1xuICBwcml2YXRlIG91dGxldERhdGFTdWJzY3JpcHRpb25zID0gbmV3IE1hcDxSb3V0ZXJPdXRsZXQsIFN1YnNjcmlwdGlvbj47XG5cbiAgYmluZEFjdGl2YXRlZFJvdXRlVG9PdXRsZXRDb21wb25lbnQob3V0bGV0OiBSb3V0ZXJPdXRsZXQpIHtcbiAgICB0aGlzLnVuc3Vic2NyaWJlRnJvbVJvdXRlRGF0YShvdXRsZXQpO1xuICAgIHRoaXMuc3Vic2NyaWJlVG9Sb3V0ZURhdGEob3V0bGV0KTtcbiAgfVxuXG4gIHVuc3Vic2NyaWJlRnJvbVJvdXRlRGF0YShvdXRsZXQ6IFJvdXRlck91dGxldCkge1xuICAgIHRoaXMub3V0bGV0RGF0YVN1YnNjcmlwdGlvbnMuZ2V0KG91dGxldCk/LnVuc3Vic2NyaWJlKCk7XG4gICAgdGhpcy5vdXRsZXREYXRhU3Vic2NyaXB0aW9ucy5kZWxldGUob3V0bGV0KTtcbiAgfVxuXG4gIHByaXZhdGUgc3Vic2NyaWJlVG9Sb3V0ZURhdGEob3V0bGV0OiBSb3V0ZXJPdXRsZXQpIHtcbiAgICBjb25zdCB7YWN0aXZhdGVkUm91dGV9ID0gb3V0bGV0O1xuICAgIGNvbnN0IGRhdGFTdWJzY3JpcHRpb24gPVxuICAgICAgICBjb21iaW5lTGF0ZXN0KFtcbiAgICAgICAgICBhY3RpdmF0ZWRSb3V0ZS5xdWVyeVBhcmFtcyxcbiAgICAgICAgICBhY3RpdmF0ZWRSb3V0ZS5wYXJhbXMsXG4gICAgICAgICAgYWN0aXZhdGVkUm91dGUuZGF0YSxcbiAgICAgICAgXSlcbiAgICAgICAgICAgIC5waXBlKHN3aXRjaE1hcCgoW3F1ZXJ5UGFyYW1zLCBwYXJhbXMsIGRhdGFdKSA9PiB7XG4gICAgICAgICAgICAgIC8vIFByb21pc2UucmVzb2x2ZSBpcyB1c2VkIHRvIGF2b2lkIHN5bmNocm9ub3VzbHkgd3JpdGluZyB0aGUgd3JvbmcgZGF0YSB3aGVuIHR3byBvZlxuICAgICAgICAgICAgICAvLyB0aGUgT2JzZXJ2YWJsZXMgaW4gdGhlIGBjb21iaW5lTGF0ZXN0YCBzdHJlYW0gZW1pdCBvbmUgYWZ0ZXIgYW5vdGhlci5cbiAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7Li4ucXVlcnlQYXJhbXMsIC4uLnBhcmFtcywgLi4uZGF0YX0pO1xuICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAuc3Vic2NyaWJlKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAvLyBPdXRsZXQgbWF5IGhhdmUgYmVlbiBkZWFjdGl2YXRlZCBvciBjaGFuZ2VkIG5hbWVzIHRvIGJlIGFzc29jaWF0ZWQgd2l0aCBhIGRpZmZlcmVudFxuICAgICAgICAgICAgICAvLyByb3V0ZVxuICAgICAgICAgICAgICBpZiAoIW91dGxldC5pc0FjdGl2YXRlZCB8fCAhb3V0bGV0LmFjdGl2YXRlZENvbXBvbmVudFJlZiB8fFxuICAgICAgICAgICAgICAgICAgb3V0bGV0LmFjdGl2YXRlZFJvdXRlICE9PSBhY3RpdmF0ZWRSb3V0ZSB8fCBhY3RpdmF0ZWRSb3V0ZS5jb21wb25lbnQgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlRnJvbVJvdXRlRGF0YShvdXRsZXQpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNvbnN0IG1pcnJvciA9IHJlZmxlY3RDb21wb25lbnRUeXBlKGFjdGl2YXRlZFJvdXRlLmNvbXBvbmVudCk7XG4gICAgICAgICAgICAgIGlmICghbWlycm9yKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZUZyb21Sb3V0ZURhdGEob3V0bGV0KTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBmb3IgKGNvbnN0IHt0ZW1wbGF0ZU5hbWV9IG9mIG1pcnJvci5pbnB1dHMpIHtcbiAgICAgICAgICAgICAgICBvdXRsZXQuYWN0aXZhdGVkQ29tcG9uZW50UmVmLnNldElucHV0KHRlbXBsYXRlTmFtZSwgZGF0YVt0ZW1wbGF0ZU5hbWVdKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICB0aGlzLm91dGxldERhdGFTdWJzY3JpcHRpb25zLnNldChvdXRsZXQsIGRhdGFTdWJzY3JpcHRpb24pO1xuICB9XG59XG4iXX0=