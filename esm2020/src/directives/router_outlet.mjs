/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ChangeDetectorRef, Directive, EnvironmentInjector, EventEmitter, inject, Input, Output, ViewContainerRef, ɵRuntimeError as RuntimeError, } from '@angular/core';
import { ChildrenOutletContexts } from '../router_outlet_context';
import { ActivatedRoute } from '../router_state';
import { PRIMARY_OUTLET } from '../shared';
import * as i0 from "@angular/core";
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || ngDevMode;
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
            throw new RuntimeError(4012 /* RuntimeErrorCode.OUTLET_NOT_ACTIVATED */, NG_DEV_MODE && 'Outlet is not activated');
        return this.activated.instance;
    }
    get activatedRoute() {
        if (!this.activated)
            throw new RuntimeError(4012 /* RuntimeErrorCode.OUTLET_NOT_ACTIVATED */, NG_DEV_MODE && 'Outlet is not activated');
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
            throw new RuntimeError(4012 /* RuntimeErrorCode.OUTLET_NOT_ACTIVATED */, NG_DEV_MODE && 'Outlet is not activated');
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
    activateWith(activatedRoute, resolverOrInjector) {
        if (this.isActivated) {
            throw new RuntimeError(4013 /* RuntimeErrorCode.OUTLET_ALREADY_ACTIVATED */, NG_DEV_MODE && 'Cannot activate an already activated outlet');
        }
        this._activatedRoute = activatedRoute;
        const location = this.location;
        const snapshot = activatedRoute.snapshot;
        const component = snapshot.component;
        const childContexts = this.parentContexts.getOrCreateContext(this.name).children;
        const injector = new OutletInjector(activatedRoute, childContexts, location.injector);
        if (resolverOrInjector && isComponentFactoryResolver(resolverOrInjector)) {
            const factory = resolverOrInjector.resolveComponentFactory(component);
            this.activated = location.createComponent(factory, location.length, injector);
        }
        else {
            const environmentInjector = resolverOrInjector ?? this.environmentInjector;
            this.activated = location.createComponent(component, { index: location.length, injector, environmentInjector });
        }
        // Calling `markForCheck` to make sure we will run the change detection when the
        // `RouterOutlet` is inside a `ChangeDetectionStrategy.OnPush` component.
        this.changeDetector.markForCheck();
        this.activateEvents.emit(this.activated.instance);
    }
}
RouterOutlet.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.2+sha-0b71b0a", ngImport: i0, type: RouterOutlet, deps: [], target: i0.ɵɵFactoryTarget.Directive });
RouterOutlet.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "16.0.0-next.2+sha-0b71b0a", type: RouterOutlet, isStandalone: true, selector: "router-outlet", inputs: { name: "name" }, outputs: { activateEvents: "activate", deactivateEvents: "deactivate", attachEvents: "attach", detachEvents: "detach" }, exportAs: ["outlet"], usesOnChanges: true, ngImport: i0 });
export { RouterOutlet };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.2+sha-0b71b0a", ngImport: i0, type: RouterOutlet, decorators: [{
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
function isComponentFactoryResolver(item) {
    return !!item.resolveComponentFactory;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX291dGxldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxpQkFBaUIsRUFBMEMsU0FBUyxFQUFFLG1CQUFtQixFQUFFLFlBQVksRUFBRSxNQUFNLEVBQVksS0FBSyxFQUFxQixNQUFNLEVBQWlCLGdCQUFnQixFQUFFLGFBQWEsSUFBSSxZQUFZLEdBQUUsTUFBTSxlQUFlLENBQUM7QUFJM1AsT0FBTyxFQUFDLHNCQUFzQixFQUFDLE1BQU0sMEJBQTBCLENBQUM7QUFDaEUsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxXQUFXLENBQUM7O0FBRXpDLE1BQU0sV0FBVyxHQUFHLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTLENBQUM7QUE0RmxFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtERztBQUNILE1BS2EsWUFBWTtJQUx6QjtRQU1VLGNBQVMsR0FBMkIsSUFBSSxDQUFDO1FBQ3pDLG9CQUFlLEdBQXdCLElBQUksQ0FBQztRQUNwRDs7OztXQUlHO1FBQ00sU0FBSSxHQUFHLGNBQWMsQ0FBQztRQUVYLG1CQUFjLEdBQUcsSUFBSSxZQUFZLEVBQU8sQ0FBQztRQUN2QyxxQkFBZ0IsR0FBRyxJQUFJLFlBQVksRUFBTyxDQUFDO1FBQ2pFOzs7WUFHSTtRQUNjLGlCQUFZLEdBQUcsSUFBSSxZQUFZLEVBQVcsQ0FBQztRQUM3RDs7O1dBR0c7UUFDZSxpQkFBWSxHQUFHLElBQUksWUFBWSxFQUFXLENBQUM7UUFFckQsbUJBQWMsR0FBRyxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNoRCxh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QUFJLENBQUMsdUJBQXVCLENBQUM7QUFDeEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NoYW5nZURldGVjdG9yUmVmLCBDb21wb25lbnRGYWN0b3J5UmVzb2x2ZXIsIENvbXBvbmVudFJlZiwgRGlyZWN0aXZlLCBFbnZpcm9ubWVudEluamVjdG9yLCBFdmVudEVtaXR0ZXIsIGluamVjdCwgSW5qZWN0b3IsIElucHV0LCBPbkRlc3Ryb3ksIE9uSW5pdCwgT3V0cHV0LCBTaW1wbGVDaGFuZ2VzLCBWaWV3Q29udGFpbmVyUmVmLCDJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3IsfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHtSdW50aW1lRXJyb3JDb2RlfSBmcm9tICcuLi9lcnJvcnMnO1xuaW1wb3J0IHtEYXRhfSBmcm9tICcuLi9tb2RlbHMnO1xuaW1wb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzfSBmcm9tICcuLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZX0gZnJvbSAnLi4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UFJJTUFSWV9PVVRMRVR9IGZyb20gJy4uL3NoYXJlZCc7XG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlO1xuXG4vKipcbiAqIEFuIGludGVyZmFjZSB0aGF0IGRlZmluZXMgdGhlIGNvbnRyYWN0IGZvciBkZXZlbG9waW5nIGEgY29tcG9uZW50IG91dGxldCBmb3IgdGhlIGBSb3V0ZXJgLlxuICpcbiAqIEFuIG91dGxldCBhY3RzIGFzIGEgcGxhY2Vob2xkZXIgdGhhdCBBbmd1bGFyIGR5bmFtaWNhbGx5IGZpbGxzIGJhc2VkIG9uIHRoZSBjdXJyZW50IHJvdXRlciBzdGF0ZS5cbiAqXG4gKiBBIHJvdXRlciBvdXRsZXQgc2hvdWxkIHJlZ2lzdGVyIGl0c2VsZiB3aXRoIHRoZSBgUm91dGVyYCB2aWFcbiAqIGBDaGlsZHJlbk91dGxldENvbnRleHRzI29uQ2hpbGRPdXRsZXRDcmVhdGVkYCBhbmQgdW5yZWdpc3RlciB3aXRoXG4gKiBgQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyNvbkNoaWxkT3V0bGV0RGVzdHJveWVkYC4gV2hlbiB0aGUgYFJvdXRlcmAgaWRlbnRpZmllcyBhIG1hdGNoZWQgYFJvdXRlYCxcbiAqIGl0IGxvb2tzIGZvciBhIHJlZ2lzdGVyZWQgb3V0bGV0IGluIHRoZSBgQ2hpbGRyZW5PdXRsZXRDb250ZXh0c2AgYW5kIGFjdGl2YXRlcyBpdC5cbiAqXG4gKiBAc2VlIGBDaGlsZHJlbk91dGxldENvbnRleHRzYFxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJvdXRlck91dGxldENvbnRyYWN0IHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGdpdmVuIG91dGxldCBpcyBhY3RpdmF0ZWQuXG4gICAqXG4gICAqIEFuIG91dGxldCBpcyBjb25zaWRlcmVkIFwiYWN0aXZhdGVkXCIgaWYgaXQgaGFzIGFuIGFjdGl2ZSBjb21wb25lbnQuXG4gICAqL1xuICBpc0FjdGl2YXRlZDogYm9vbGVhbjtcblxuICAvKiogVGhlIGluc3RhbmNlIG9mIHRoZSBhY3RpdmF0ZWQgY29tcG9uZW50IG9yIGBudWxsYCBpZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQuICovXG4gIGNvbXBvbmVudDogT2JqZWN0fG51bGw7XG5cbiAgLyoqXG4gICAqIFRoZSBgRGF0YWAgb2YgdGhlIGBBY3RpdmF0ZWRSb3V0ZWAgc25hcHNob3QuXG4gICAqL1xuICBhY3RpdmF0ZWRSb3V0ZURhdGE6IERhdGE7XG5cbiAgLyoqXG4gICAqIFRoZSBgQWN0aXZhdGVkUm91dGVgIGZvciB0aGUgb3V0bGV0IG9yIGBudWxsYCBpZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQuXG4gICAqL1xuICBhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGV8bnVsbDtcblxuICAvKipcbiAgICogQ2FsbGVkIGJ5IHRoZSBgUm91dGVyYCB3aGVuIHRoZSBvdXRsZXQgc2hvdWxkIGFjdGl2YXRlIChjcmVhdGUgYSBjb21wb25lbnQpLlxuICAgKi9cbiAgYWN0aXZhdGVXaXRoKGFjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSwgZW52aXJvbm1lbnRJbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvcnxudWxsKTogdm9pZDtcbiAgLyoqXG4gICAqIENhbGxlZCBieSB0aGUgYFJvdXRlcmAgd2hlbiB0aGUgb3V0bGV0IHNob3VsZCBhY3RpdmF0ZSAoY3JlYXRlIGEgY29tcG9uZW50KS5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgUGFzc2luZyBhIHJlc29sdmVyIHRvIHJldHJpZXZlIGEgY29tcG9uZW50IGZhY3RvcnkgaXMgbm90IHJlcXVpcmVkIGFuZCBpc1xuICAgKiAgICAgZGVwcmVjYXRlZCBzaW5jZSB2MTQuXG4gICAqL1xuICBhY3RpdmF0ZVdpdGgoYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlLCByZXNvbHZlcjogQ29tcG9uZW50RmFjdG9yeVJlc29sdmVyfG51bGwpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBBIHJlcXVlc3QgdG8gZGVzdHJveSB0aGUgY3VycmVudGx5IGFjdGl2YXRlZCBjb21wb25lbnQuXG4gICAqXG4gICAqIFdoZW4gYSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbmRpY2F0ZXMgdGhhdCBhbiBgQWN0aXZhdGVkUm91dGVgIHNob3VsZCBiZSByZW1vdmVkIGJ1dCBzdG9yZWQgZm9yXG4gICAqIGxhdGVyIHJlLXVzZSByYXRoZXIgdGhhbiBkZXN0cm95ZWQsIHRoZSBgUm91dGVyYCB3aWxsIGNhbGwgYGRldGFjaGAgaW5zdGVhZC5cbiAgICovXG4gIGRlYWN0aXZhdGUoKTogdm9pZDtcblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byBkZXRhY2ggdGhlIHN1YnRyZWUuXG4gICAqXG4gICAqIFRoaXMgaXMgc2ltaWxhciB0byBgZGVhY3RpdmF0ZWAsIGJ1dCB0aGUgYWN0aXZhdGVkIGNvbXBvbmVudCBzaG91bGQgX25vdF8gYmUgZGVzdHJveWVkLlxuICAgKiBJbnN0ZWFkLCBpdCBpcyByZXR1cm5lZCBzbyB0aGF0IGl0IGNhbiBiZSByZWF0dGFjaGVkIGxhdGVyIHZpYSB0aGUgYGF0dGFjaGAgbWV0aG9kLlxuICAgKi9cbiAgZGV0YWNoKCk6IENvbXBvbmVudFJlZjx1bmtub3duPjtcblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byByZS1hdHRhY2ggYSBwcmV2aW91c2x5IGRldGFjaGVkIHN1YnRyZWUuXG4gICAqL1xuICBhdHRhY2gocmVmOiBDb21wb25lbnRSZWY8dW5rbm93bj4sIGFjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIEVtaXRzIGFuIGFjdGl2YXRlIGV2ZW50IHdoZW4gYSBuZXcgY29tcG9uZW50IGlzIGluc3RhbnRpYXRlZFxuICAgKiovXG4gIGFjdGl2YXRlRXZlbnRzPzogRXZlbnRFbWl0dGVyPHVua25vd24+O1xuXG4gIC8qKlxuICAgKiBFbWl0cyBhIGRlYWN0aXZhdGUgZXZlbnQgd2hlbiBhIGNvbXBvbmVudCBpcyBkZXN0cm95ZWQuXG4gICAqL1xuICBkZWFjdGl2YXRlRXZlbnRzPzogRXZlbnRFbWl0dGVyPHVua25vd24+O1xuXG4gIC8qKlxuICAgKiBFbWl0cyBhbiBhdHRhY2hlZCBjb21wb25lbnQgaW5zdGFuY2Ugd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIHJlLWF0dGFjaCBhXG4gICAqIHByZXZpb3VzbHkgZGV0YWNoZWQgc3VidHJlZS5cbiAgICoqL1xuICBhdHRhY2hFdmVudHM/OiBFdmVudEVtaXR0ZXI8dW5rbm93bj47XG5cbiAgLyoqXG4gICAqIEVtaXRzIGEgZGV0YWNoZWQgY29tcG9uZW50IGluc3RhbmNlIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byBkZXRhY2ggdGhlXG4gICAqIHN1YnRyZWUuXG4gICAqL1xuICBkZXRhY2hFdmVudHM/OiBFdmVudEVtaXR0ZXI8dW5rbm93bj47XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQWN0cyBhcyBhIHBsYWNlaG9sZGVyIHRoYXQgQW5ndWxhciBkeW5hbWljYWxseSBmaWxscyBiYXNlZCBvbiB0aGUgY3VycmVudCByb3V0ZXIgc3RhdGUuXG4gKlxuICogRWFjaCBvdXRsZXQgY2FuIGhhdmUgYSB1bmlxdWUgbmFtZSwgZGV0ZXJtaW5lZCBieSB0aGUgb3B0aW9uYWwgYG5hbWVgIGF0dHJpYnV0ZS5cbiAqIFRoZSBuYW1lIGNhbm5vdCBiZSBzZXQgb3IgY2hhbmdlZCBkeW5hbWljYWxseS4gSWYgbm90IHNldCwgZGVmYXVsdCB2YWx1ZSBpcyBcInByaW1hcnlcIi5cbiAqXG4gKiBgYGBcbiAqIDxyb3V0ZXItb3V0bGV0Pjwvcm91dGVyLW91dGxldD5cbiAqIDxyb3V0ZXItb3V0bGV0IG5hbWU9J2xlZnQnPjwvcm91dGVyLW91dGxldD5cbiAqIDxyb3V0ZXItb3V0bGV0IG5hbWU9J3JpZ2h0Jz48L3JvdXRlci1vdXRsZXQ+XG4gKiBgYGBcbiAqXG4gKiBOYW1lZCBvdXRsZXRzIGNhbiBiZSB0aGUgdGFyZ2V0cyBvZiBzZWNvbmRhcnkgcm91dGVzLlxuICogVGhlIGBSb3V0ZWAgb2JqZWN0IGZvciBhIHNlY29uZGFyeSByb3V0ZSBoYXMgYW4gYG91dGxldGAgcHJvcGVydHkgdG8gaWRlbnRpZnkgdGhlIHRhcmdldCBvdXRsZXQ6XG4gKlxuICogYHtwYXRoOiA8YmFzZS1wYXRoPiwgY29tcG9uZW50OiA8Y29tcG9uZW50Piwgb3V0bGV0OiA8dGFyZ2V0X291dGxldF9uYW1lPn1gXG4gKlxuICogVXNpbmcgbmFtZWQgb3V0bGV0cyBhbmQgc2Vjb25kYXJ5IHJvdXRlcywgeW91IGNhbiB0YXJnZXQgbXVsdGlwbGUgb3V0bGV0cyBpblxuICogdGhlIHNhbWUgYFJvdXRlckxpbmtgIGRpcmVjdGl2ZS5cbiAqXG4gKiBUaGUgcm91dGVyIGtlZXBzIHRyYWNrIG9mIHNlcGFyYXRlIGJyYW5jaGVzIGluIGEgbmF2aWdhdGlvbiB0cmVlIGZvciBlYWNoIG5hbWVkIG91dGxldCBhbmRcbiAqIGdlbmVyYXRlcyBhIHJlcHJlc2VudGF0aW9uIG9mIHRoYXQgdHJlZSBpbiB0aGUgVVJMLlxuICogVGhlIFVSTCBmb3IgYSBzZWNvbmRhcnkgcm91dGUgdXNlcyB0aGUgZm9sbG93aW5nIHN5bnRheCB0byBzcGVjaWZ5IGJvdGggdGhlIHByaW1hcnkgYW5kIHNlY29uZGFyeVxuICogcm91dGVzIGF0IHRoZSBzYW1lIHRpbWU6XG4gKlxuICogYGh0dHA6Ly9iYXNlLXBhdGgvcHJpbWFyeS1yb3V0ZS1wYXRoKG91dGxldC1uYW1lOnJvdXRlLXBhdGgpYFxuICpcbiAqIEEgcm91dGVyIG91dGxldCBlbWl0cyBhbiBhY3RpdmF0ZSBldmVudCB3aGVuIGEgbmV3IGNvbXBvbmVudCBpcyBpbnN0YW50aWF0ZWQsXG4gKiBkZWFjdGl2YXRlIGV2ZW50IHdoZW4gYSBjb21wb25lbnQgaXMgZGVzdHJveWVkLlxuICogQW4gYXR0YWNoZWQgZXZlbnQgZW1pdHMgd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRoZSBvdXRsZXQgdG8gcmVhdHRhY2ggdGhlXG4gKiBzdWJ0cmVlLCBhbmQgdGhlIGRldGFjaGVkIGV2ZW50IGVtaXRzIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0aGUgb3V0bGV0IHRvXG4gKiBkZXRhY2ggdGhlIHN1YnRyZWUuXG4gKlxuICogYGBgXG4gKiA8cm91dGVyLW91dGxldFxuICogICAoYWN0aXZhdGUpPSdvbkFjdGl2YXRlKCRldmVudCknXG4gKiAgIChkZWFjdGl2YXRlKT0nb25EZWFjdGl2YXRlKCRldmVudCknXG4gKiAgIChhdHRhY2gpPSdvbkF0dGFjaCgkZXZlbnQpJ1xuICogICAoZGV0YWNoKT0nb25EZXRhY2goJGV2ZW50KSc+PC9yb3V0ZXItb3V0bGV0PlxuICogYGBgXG4gKlxuICogQHNlZSBbUm91dGluZyB0dXRvcmlhbF0oZ3VpZGUvcm91dGVyLXR1dG9yaWFsLXRvaCNuYW1lZC1vdXRsZXRzIFwiRXhhbXBsZSBvZiBhIG5hbWVkXG4gKiBvdXRsZXQgYW5kIHNlY29uZGFyeSByb3V0ZSBjb25maWd1cmF0aW9uXCIpLlxuICogQHNlZSBgUm91dGVyTGlua2BcbiAqIEBzZWUgYFJvdXRlYFxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQERpcmVjdGl2ZSh7XG4gIHNlbGVjdG9yOiAncm91dGVyLW91dGxldCcsXG4gIGV4cG9ydEFzOiAnb3V0bGV0JyxcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyT3V0bGV0IGltcGxlbWVudHMgT25EZXN0cm95LCBPbkluaXQsIFJvdXRlck91dGxldENvbnRyYWN0IHtcbiAgcHJpdmF0ZSBhY3RpdmF0ZWQ6IENvbXBvbmVudFJlZjxhbnk+fG51bGwgPSBudWxsO1xuICBwcml2YXRlIF9hY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGV8bnVsbCA9IG51bGw7XG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgb3V0bGV0XG4gICAqXG4gICAqIEBzZWUgW25hbWVkIG91dGxldHNdKGd1aWRlL3JvdXRlci10dXRvcmlhbC10b2gjZGlzcGxheWluZy1tdWx0aXBsZS1yb3V0ZXMtaW4tbmFtZWQtb3V0bGV0cylcbiAgICovXG4gIEBJbnB1dCgpIG5hbWUgPSBQUklNQVJZX09VVExFVDtcblxuICBAT3V0cHV0KCdhY3RpdmF0ZScpIGFjdGl2YXRlRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG4gIEBPdXRwdXQoJ2RlYWN0aXZhdGUnKSBkZWFjdGl2YXRlRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG4gIC8qKlxuICAgKiBFbWl0cyBhbiBhdHRhY2hlZCBjb21wb25lbnQgaW5zdGFuY2Ugd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIHJlLWF0dGFjaCBhXG4gICAqIHByZXZpb3VzbHkgZGV0YWNoZWQgc3VidHJlZS5cbiAgICoqL1xuICBAT3V0cHV0KCdhdHRhY2gnKSBhdHRhY2hFdmVudHMgPSBuZXcgRXZlbnRFbWl0dGVyPHVua25vd24+KCk7XG4gIC8qKlxuICAgKiBFbWl0cyBhIGRldGFjaGVkIGNvbXBvbmVudCBpbnN0YW5jZSB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZVxuICAgKiBzdWJ0cmVlLlxuICAgKi9cbiAgQE91dHB1dCgnZGV0YWNoJykgZGV0YWNoRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjx1bmtub3duPigpO1xuXG4gIHByaXZhdGUgcGFyZW50Q29udGV4dHMgPSBpbmplY3QoQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk7XG4gIHByaXZhdGUgbG9jYXRpb24gPSBpbmplY3QoVmlld0NvbnRhaW5lclJlZik7XG4gIHByaXZhdGUgY2hhbmdlRGV0ZWN0b3IgPSBpbmplY3QoQ2hhbmdlRGV0ZWN0b3JSZWYpO1xuICBwcml2YXRlIGVudmlyb25tZW50SW5qZWN0b3IgPSBpbmplY3QoRW52aXJvbm1lbnRJbmplY3Rvcik7XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7XG4gICAgaWYgKGNoYW5nZXNbJ25hbWUnXSkge1xuICAgICAgY29uc3Qge2ZpcnN0Q2hhbmdlLCBwcmV2aW91c1ZhbHVlfSA9IGNoYW5nZXNbJ25hbWUnXTtcbiAgICAgIGlmIChmaXJzdENoYW5nZSkge1xuICAgICAgICAvLyBUaGUgZmlyc3QgY2hhbmdlIGlzIGhhbmRsZWQgYnkgbmdPbkluaXQuIEJlY2F1c2UgbmdPbkNoYW5nZXMgZG9lc24ndCBnZXQgY2FsbGVkIHdoZW4gbm9cbiAgICAgICAgLy8gaW5wdXQgaXMgc2V0IGF0IGFsbCwgd2UgbmVlZCB0byBjZW50cmFsbHkgaGFuZGxlIHRoZSBmaXJzdCBjaGFuZ2UgdGhlcmUuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gdW5yZWdpc3RlciB3aXRoIHRoZSBvbGQgbmFtZVxuICAgICAgaWYgKHRoaXMuaXNUcmFja2VkSW5QYXJlbnRDb250ZXh0cyhwcmV2aW91c1ZhbHVlKSkge1xuICAgICAgICB0aGlzLmRlYWN0aXZhdGUoKTtcbiAgICAgICAgdGhpcy5wYXJlbnRDb250ZXh0cy5vbkNoaWxkT3V0bGV0RGVzdHJveWVkKHByZXZpb3VzVmFsdWUpO1xuICAgICAgfVxuICAgICAgLy8gcmVnaXN0ZXIgdGhlIG5ldyBuYW1lXG4gICAgICB0aGlzLmluaXRpYWxpemVPdXRsZXRXaXRoTmFtZSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgLy8gRW5zdXJlIHRoYXQgdGhlIHJlZ2lzdGVyZWQgb3V0bGV0IGlzIHRoaXMgb25lIGJlZm9yZSByZW1vdmluZyBpdCBvbiB0aGUgY29udGV4dC5cbiAgICBpZiAodGhpcy5pc1RyYWNrZWRJblBhcmVudENvbnRleHRzKHRoaXMubmFtZSkpIHtcbiAgICAgIHRoaXMucGFyZW50Q29udGV4dHMub25DaGlsZE91dGxldERlc3Ryb3llZCh0aGlzLm5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgaXNUcmFja2VkSW5QYXJlbnRDb250ZXh0cyhvdXRsZXROYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnRDb250ZXh0cy5nZXRDb250ZXh0KG91dGxldE5hbWUpPy5vdXRsZXQgPT09IHRoaXM7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25Jbml0KCk6IHZvaWQge1xuICAgIHRoaXMuaW5pdGlhbGl6ZU91dGxldFdpdGhOYW1lKCk7XG4gIH1cblxuICBwcml2YXRlIGluaXRpYWxpemVPdXRsZXRXaXRoTmFtZSgpIHtcbiAgICB0aGlzLnBhcmVudENvbnRleHRzLm9uQ2hpbGRPdXRsZXRDcmVhdGVkKHRoaXMubmFtZSwgdGhpcyk7XG4gICAgaWYgKHRoaXMuYWN0aXZhdGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIG91dGxldCB3YXMgbm90IGluc3RhbnRpYXRlZCBhdCB0aGUgdGltZSB0aGUgcm91dGUgZ290IGFjdGl2YXRlZCB3ZSBuZWVkIHRvIHBvcHVsYXRlXG4gICAgLy8gdGhlIG91dGxldCB3aGVuIGl0IGlzIGluaXRpYWxpemVkIChpZSBpbnNpZGUgYSBOZ0lmKVxuICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLnBhcmVudENvbnRleHRzLmdldENvbnRleHQodGhpcy5uYW1lKTtcbiAgICBpZiAoY29udGV4dD8ucm91dGUpIHtcbiAgICAgIGlmIChjb250ZXh0LmF0dGFjaFJlZikge1xuICAgICAgICAvLyBgYXR0YWNoUmVmYCBpcyBwb3B1bGF0ZWQgd2hlbiB0aGVyZSBpcyBhbiBleGlzdGluZyBjb21wb25lbnQgdG8gbW91bnRcbiAgICAgICAgdGhpcy5hdHRhY2goY29udGV4dC5hdHRhY2hSZWYsIGNvbnRleHQucm91dGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gb3RoZXJ3aXNlIHRoZSBjb21wb25lbnQgZGVmaW5lZCBpbiB0aGUgY29uZmlndXJhdGlvbiBpcyBjcmVhdGVkXG4gICAgICAgIHRoaXMuYWN0aXZhdGVXaXRoKGNvbnRleHQucm91dGUsIGNvbnRleHQuaW5qZWN0b3IpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldCBpc0FjdGl2YXRlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISF0aGlzLmFjdGl2YXRlZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBUaGUgY3VycmVudGx5IGFjdGl2YXRlZCBjb21wb25lbnQgaW5zdGFuY2UuXG4gICAqIEB0aHJvd3MgQW4gZXJyb3IgaWYgdGhlIG91dGxldCBpcyBub3QgYWN0aXZhdGVkLlxuICAgKi9cbiAgZ2V0IGNvbXBvbmVudCgpOiBPYmplY3Qge1xuICAgIGlmICghdGhpcy5hY3RpdmF0ZWQpXG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuT1VUTEVUX05PVF9BQ1RJVkFURUQsIE5HX0RFVl9NT0RFICYmICdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcpO1xuICAgIHJldHVybiB0aGlzLmFjdGl2YXRlZC5pbnN0YW5jZTtcbiAgfVxuXG4gIGdldCBhY3RpdmF0ZWRSb3V0ZSgpOiBBY3RpdmF0ZWRSb3V0ZSB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZClcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5PVVRMRVRfTk9UX0FDVElWQVRFRCwgTkdfREVWX01PREUgJiYgJ091dGxldCBpcyBub3QgYWN0aXZhdGVkJyk7XG4gICAgcmV0dXJuIHRoaXMuX2FjdGl2YXRlZFJvdXRlIGFzIEFjdGl2YXRlZFJvdXRlO1xuICB9XG5cbiAgZ2V0IGFjdGl2YXRlZFJvdXRlRGF0YSgpOiBEYXRhIHtcbiAgICBpZiAodGhpcy5fYWN0aXZhdGVkUm91dGUpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hY3RpdmF0ZWRSb3V0ZS5zbmFwc2hvdC5kYXRhO1xuICAgIH1cbiAgICByZXR1cm4ge307XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byBkZXRhY2ggdGhlIHN1YnRyZWVcbiAgICovXG4gIGRldGFjaCgpOiBDb21wb25lbnRSZWY8YW55PiB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZClcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5PVVRMRVRfTk9UX0FDVElWQVRFRCwgTkdfREVWX01PREUgJiYgJ091dGxldCBpcyBub3QgYWN0aXZhdGVkJyk7XG4gICAgdGhpcy5sb2NhdGlvbi5kZXRhY2goKTtcbiAgICBjb25zdCBjbXAgPSB0aGlzLmFjdGl2YXRlZDtcbiAgICB0aGlzLmFjdGl2YXRlZCA9IG51bGw7XG4gICAgdGhpcy5fYWN0aXZhdGVkUm91dGUgPSBudWxsO1xuICAgIHRoaXMuZGV0YWNoRXZlbnRzLmVtaXQoY21wLmluc3RhbmNlKTtcbiAgICByZXR1cm4gY21wO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gcmUtYXR0YWNoIGEgcHJldmlvdXNseSBkZXRhY2hlZCBzdWJ0cmVlXG4gICAqL1xuICBhdHRhY2gocmVmOiBDb21wb25lbnRSZWY8YW55PiwgYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7XG4gICAgdGhpcy5hY3RpdmF0ZWQgPSByZWY7XG4gICAgdGhpcy5fYWN0aXZhdGVkUm91dGUgPSBhY3RpdmF0ZWRSb3V0ZTtcbiAgICB0aGlzLmxvY2F0aW9uLmluc2VydChyZWYuaG9zdFZpZXcpO1xuICAgIHRoaXMuYXR0YWNoRXZlbnRzLmVtaXQocmVmLmluc3RhbmNlKTtcbiAgfVxuXG4gIGRlYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuYWN0aXZhdGVkKSB7XG4gICAgICBjb25zdCBjID0gdGhpcy5jb21wb25lbnQ7XG4gICAgICB0aGlzLmFjdGl2YXRlZC5kZXN0cm95KCk7XG4gICAgICB0aGlzLmFjdGl2YXRlZCA9IG51bGw7XG4gICAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IG51bGw7XG4gICAgICB0aGlzLmRlYWN0aXZhdGVFdmVudHMuZW1pdChjKTtcbiAgICB9XG4gIH1cblxuICBhY3RpdmF0ZVdpdGgoXG4gICAgICBhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGUsXG4gICAgICByZXNvbHZlck9ySW5qZWN0b3I/OiBDb21wb25lbnRGYWN0b3J5UmVzb2x2ZXJ8RW52aXJvbm1lbnRJbmplY3RvcnxudWxsKSB7XG4gICAgaWYgKHRoaXMuaXNBY3RpdmF0ZWQpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5PVVRMRVRfQUxSRUFEWV9BQ1RJVkFURUQsXG4gICAgICAgICAgTkdfREVWX01PREUgJiYgJ0Nhbm5vdCBhY3RpdmF0ZSBhbiBhbHJlYWR5IGFjdGl2YXRlZCBvdXRsZXQnKTtcbiAgICB9XG4gICAgdGhpcy5fYWN0aXZhdGVkUm91dGUgPSBhY3RpdmF0ZWRSb3V0ZTtcbiAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMubG9jYXRpb247XG4gICAgY29uc3Qgc25hcHNob3QgPSBhY3RpdmF0ZWRSb3V0ZS5zbmFwc2hvdDtcbiAgICBjb25zdCBjb21wb25lbnQgPSBzbmFwc2hvdC5jb21wb25lbnQhO1xuICAgIGNvbnN0IGNoaWxkQ29udGV4dHMgPSB0aGlzLnBhcmVudENvbnRleHRzLmdldE9yQ3JlYXRlQ29udGV4dCh0aGlzLm5hbWUpLmNoaWxkcmVuO1xuICAgIGNvbnN0IGluamVjdG9yID0gbmV3IE91dGxldEluamVjdG9yKGFjdGl2YXRlZFJvdXRlLCBjaGlsZENvbnRleHRzLCBsb2NhdGlvbi5pbmplY3Rvcik7XG5cbiAgICBpZiAocmVzb2x2ZXJPckluamVjdG9yICYmIGlzQ29tcG9uZW50RmFjdG9yeVJlc29sdmVyKHJlc29sdmVyT3JJbmplY3RvcikpIHtcbiAgICAgIGNvbnN0IGZhY3RvcnkgPSByZXNvbHZlck9ySW5qZWN0b3IucmVzb2x2ZUNvbXBvbmVudEZhY3RvcnkoY29tcG9uZW50KTtcbiAgICAgIHRoaXMuYWN0aXZhdGVkID0gbG9jYXRpb24uY3JlYXRlQ29tcG9uZW50KGZhY3RvcnksIGxvY2F0aW9uLmxlbmd0aCwgaW5qZWN0b3IpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBlbnZpcm9ubWVudEluamVjdG9yID0gcmVzb2x2ZXJPckluamVjdG9yID8/IHRoaXMuZW52aXJvbm1lbnRJbmplY3RvcjtcbiAgICAgIHRoaXMuYWN0aXZhdGVkID0gbG9jYXRpb24uY3JlYXRlQ29tcG9uZW50KFxuICAgICAgICAgIGNvbXBvbmVudCwge2luZGV4OiBsb2NhdGlvbi5sZW5ndGgsIGluamVjdG9yLCBlbnZpcm9ubWVudEluamVjdG9yfSk7XG4gICAgfVxuICAgIC8vIENhbGxpbmcgYG1hcmtGb3JDaGVja2AgdG8gbWFrZSBzdXJlIHdlIHdpbGwgcnVuIHRoZSBjaGFuZ2UgZGV0ZWN0aW9uIHdoZW4gdGhlXG4gICAgLy8gYFJvdXRlck91dGxldGAgaXMgaW5zaWRlIGEgYENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaGAgY29tcG9uZW50LlxuICAgIHRoaXMuY2hhbmdlRGV0ZWN0b3IubWFya0ZvckNoZWNrKCk7XG4gICAgdGhpcy5hY3RpdmF0ZUV2ZW50cy5lbWl0KHRoaXMuYWN0aXZhdGVkLmluc3RhbmNlKTtcbiAgfVxufVxuXG5jbGFzcyBPdXRsZXRJbmplY3RvciBpbXBsZW1lbnRzIEluamVjdG9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSwgcHJpdmF0ZSBjaGlsZENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLFxuICAgICAgcHJpdmF0ZSBwYXJlbnQ6IEluamVjdG9yKSB7fVxuXG4gIGdldCh0b2tlbjogYW55LCBub3RGb3VuZFZhbHVlPzogYW55KTogYW55IHtcbiAgICBpZiAodG9rZW4gPT09IEFjdGl2YXRlZFJvdXRlKSB7XG4gICAgICByZXR1cm4gdGhpcy5yb3V0ZTtcbiAgICB9XG5cbiAgICBpZiAodG9rZW4gPT09IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpIHtcbiAgICAgIHJldHVybiB0aGlzLmNoaWxkQ29udGV4dHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucGFyZW50LmdldCh0b2tlbiwgbm90Rm91bmRWYWx1ZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNDb21wb25lbnRGYWN0b3J5UmVzb2x2ZXIoaXRlbTogYW55KTogaXRlbSBpcyBDb21wb25lbnRGYWN0b3J5UmVzb2x2ZXIge1xuICByZXR1cm4gISFpdGVtLnJlc29sdmVDb21wb25lbnRGYWN0b3J5O1xufVxuIl19