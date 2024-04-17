/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ChangeDetectorRef, Directive, EventEmitter, inject, Injectable, InjectionToken, Input, Output, reflectComponentType, ViewContainerRef, ɵRuntimeError as RuntimeError, } from '@angular/core';
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
            environmentInjector: environmentInjector,
        });
        // Calling `markForCheck` to make sure we will run the change detection when the
        // `RouterOutlet` is inside a `ChangeDetectionStrategy.OnPush` component.
        this.changeDetector.markForCheck();
        this.inputBinder?.bindActivatedRouteToOutletComponent(this);
        this.activateEvents.emit(this.activated.instance);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.0-next.5+sha-011cc06", ngImport: i0, type: RouterOutlet, deps: [], target: i0.ɵɵFactoryTarget.Directive }); }
    static { this.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "18.0.0-next.5+sha-011cc06", type: RouterOutlet, isStandalone: true, selector: "router-outlet", inputs: { name: "name" }, outputs: { activateEvents: "activate", deactivateEvents: "deactivate", attachEvents: "attach", detachEvents: "detach" }, exportAs: ["outlet"], usesOnChanges: true, ngImport: i0 }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.0-next.5+sha-011cc06", ngImport: i0, type: RouterOutlet, decorators: [{
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
        /**
         * A special flag that allows to identify the `OutletInjector` without
         * referring to the class itself. This is required as a temporary solution,
         * to have a special handling for this injector in core. Eventually, this
         * injector should just become an `EnvironmentInjector` without special logic.
         */
        this.__ngOutletInjector = true;
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
        this.outletDataSubscriptions = new Map();
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
            .subscribe((data) => {
            // Outlet may have been deactivated or changed names to be associated with a different
            // route
            if (!outlet.isActivated ||
                !outlet.activatedComponentRef ||
                outlet.activatedRoute !== activatedRoute ||
                activatedRoute.component === null) {
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.0-next.5+sha-011cc06", ngImport: i0, type: RoutedComponentInputBinder, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.0.0-next.5+sha-011cc06", ngImport: i0, type: RoutedComponentInputBinder }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.0-next.5+sha-011cc06", ngImport: i0, type: RoutedComponentInputBinder, decorators: [{
            type: Injectable
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX291dGxldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFDTCxpQkFBaUIsRUFFakIsU0FBUyxFQUVULFlBQVksRUFDWixNQUFNLEVBQ04sVUFBVSxFQUNWLGNBQWMsRUFFZCxLQUFLLEVBR0wsTUFBTSxFQUNOLG9CQUFvQixFQUVwQixnQkFBZ0IsRUFDaEIsYUFBYSxJQUFJLFlBQVksR0FDOUIsTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFDLGFBQWEsRUFBRSxFQUFFLEVBQWUsTUFBTSxNQUFNLENBQUM7QUFDckQsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBSXpDLE9BQU8sRUFBQyxzQkFBc0IsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUMvQyxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sV0FBVyxDQUFDOztBQStGekM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWdERztBQU1ILE1BQU0sT0FBTyxZQUFZO0lBTHpCO1FBTVUsY0FBUyxHQUE2QixJQUFJLENBQUM7UUFLM0Msb0JBQWUsR0FBMEIsSUFBSSxDQUFDO1FBQ3REOzs7V0FHRztRQUNNLFNBQUksR0FBRyxjQUFjLENBQUM7UUFFWCxtQkFBYyxHQUFHLElBQUksWUFBWSxFQUFPLENBQUM7UUFDdkMscUJBQWdCLEdBQUcsSUFBSSxZQUFZLEVBQU8sQ0FBQztRQUNqRTs7O1lBR0k7UUFDYyxpQkFBWSxHQUFHLElBQUksWUFBWSxFQUFXLENBQUM7UUFDN0Q7OztXQUdHO1FBQ2UsaUJBQVksR0FBRyxJQUFJLFlBQVks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M0MsTUFBTSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDMUUsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUwsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUM3RCxDQUFDO3lIQTNEVSwwQkFBMEI7NkhBQTFCLDBCQUEwQjs7c0dBQTFCLDBCQUEwQjtrQkFEdEMsVUFBVSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1xuICBDaGFuZ2VEZXRlY3RvclJlZixcbiAgQ29tcG9uZW50UmVmLFxuICBEaXJlY3RpdmUsXG4gIEVudmlyb25tZW50SW5qZWN0b3IsXG4gIEV2ZW50RW1pdHRlcixcbiAgaW5qZWN0LFxuICBJbmplY3RhYmxlLFxuICBJbmplY3Rpb25Ub2tlbixcbiAgSW5qZWN0b3IsXG4gIElucHV0LFxuICBPbkRlc3Ryb3ksXG4gIE9uSW5pdCxcbiAgT3V0cHV0LFxuICByZWZsZWN0Q29tcG9uZW50VHlwZSxcbiAgU2ltcGxlQ2hhbmdlcyxcbiAgVmlld0NvbnRhaW5lclJlZixcbiAgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yLFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Y29tYmluZUxhdGVzdCwgb2YsIFN1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge3N3aXRjaE1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge1J1bnRpbWVFcnJvckNvZGV9IGZyb20gJy4uL2Vycm9ycyc7XG5pbXBvcnQge0RhdGF9IGZyb20gJy4uL21vZGVscyc7XG5pbXBvcnQge0NoaWxkcmVuT3V0bGV0Q29udGV4dHN9IGZyb20gJy4uL3JvdXRlcl9vdXRsZXRfY29udGV4dCc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlfSBmcm9tICcuLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQUklNQVJZX09VVExFVH0gZnJvbSAnLi4vc2hhcmVkJztcblxuLyoqXG4gKiBBbiBpbnRlcmZhY2UgdGhhdCBkZWZpbmVzIHRoZSBjb250cmFjdCBmb3IgZGV2ZWxvcGluZyBhIGNvbXBvbmVudCBvdXRsZXQgZm9yIHRoZSBgUm91dGVyYC5cbiAqXG4gKiBBbiBvdXRsZXQgYWN0cyBhcyBhIHBsYWNlaG9sZGVyIHRoYXQgQW5ndWxhciBkeW5hbWljYWxseSBmaWxscyBiYXNlZCBvbiB0aGUgY3VycmVudCByb3V0ZXIgc3RhdGUuXG4gKlxuICogQSByb3V0ZXIgb3V0bGV0IHNob3VsZCByZWdpc3RlciBpdHNlbGYgd2l0aCB0aGUgYFJvdXRlcmAgdmlhXG4gKiBgQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyNvbkNoaWxkT3V0bGV0Q3JlYXRlZGAgYW5kIHVucmVnaXN0ZXIgd2l0aFxuICogYENoaWxkcmVuT3V0bGV0Q29udGV4dHMjb25DaGlsZE91dGxldERlc3Ryb3llZGAuIFdoZW4gdGhlIGBSb3V0ZXJgIGlkZW50aWZpZXMgYSBtYXRjaGVkIGBSb3V0ZWAsXG4gKiBpdCBsb29rcyBmb3IgYSByZWdpc3RlcmVkIG91dGxldCBpbiB0aGUgYENoaWxkcmVuT3V0bGV0Q29udGV4dHNgIGFuZCBhY3RpdmF0ZXMgaXQuXG4gKlxuICogQHNlZSB7QGxpbmsgQ2hpbGRyZW5PdXRsZXRDb250ZXh0c31cbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSb3V0ZXJPdXRsZXRDb250cmFjdCB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBnaXZlbiBvdXRsZXQgaXMgYWN0aXZhdGVkLlxuICAgKlxuICAgKiBBbiBvdXRsZXQgaXMgY29uc2lkZXJlZCBcImFjdGl2YXRlZFwiIGlmIGl0IGhhcyBhbiBhY3RpdmUgY29tcG9uZW50LlxuICAgKi9cbiAgaXNBY3RpdmF0ZWQ6IGJvb2xlYW47XG5cbiAgLyoqIFRoZSBpbnN0YW5jZSBvZiB0aGUgYWN0aXZhdGVkIGNvbXBvbmVudCBvciBgbnVsbGAgaWYgdGhlIG91dGxldCBpcyBub3QgYWN0aXZhdGVkLiAqL1xuICBjb21wb25lbnQ6IE9iamVjdCB8IG51bGw7XG5cbiAgLyoqXG4gICAqIFRoZSBgRGF0YWAgb2YgdGhlIGBBY3RpdmF0ZWRSb3V0ZWAgc25hcHNob3QuXG4gICAqL1xuICBhY3RpdmF0ZWRSb3V0ZURhdGE6IERhdGE7XG5cbiAgLyoqXG4gICAqIFRoZSBgQWN0aXZhdGVkUm91dGVgIGZvciB0aGUgb3V0bGV0IG9yIGBudWxsYCBpZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQuXG4gICAqL1xuICBhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGUgfCBudWxsO1xuXG4gIC8qKlxuICAgKiBDYWxsZWQgYnkgdGhlIGBSb3V0ZXJgIHdoZW4gdGhlIG91dGxldCBzaG91bGQgYWN0aXZhdGUgKGNyZWF0ZSBhIGNvbXBvbmVudCkuXG4gICAqL1xuICBhY3RpdmF0ZVdpdGgoYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlLCBlbnZpcm9ubWVudEluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yKTogdm9pZDtcblxuICAvKipcbiAgICogQSByZXF1ZXN0IHRvIGRlc3Ryb3kgdGhlIGN1cnJlbnRseSBhY3RpdmF0ZWQgY29tcG9uZW50LlxuICAgKlxuICAgKiBXaGVuIGEgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5kaWNhdGVzIHRoYXQgYW4gYEFjdGl2YXRlZFJvdXRlYCBzaG91bGQgYmUgcmVtb3ZlZCBidXQgc3RvcmVkIGZvclxuICAgKiBsYXRlciByZS11c2UgcmF0aGVyIHRoYW4gZGVzdHJveWVkLCB0aGUgYFJvdXRlcmAgd2lsbCBjYWxsIGBkZXRhY2hgIGluc3RlYWQuXG4gICAqL1xuICBkZWFjdGl2YXRlKCk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZSBzdWJ0cmVlLlxuICAgKlxuICAgKiBUaGlzIGlzIHNpbWlsYXIgdG8gYGRlYWN0aXZhdGVgLCBidXQgdGhlIGFjdGl2YXRlZCBjb21wb25lbnQgc2hvdWxkIF9ub3RfIGJlIGRlc3Ryb3llZC5cbiAgICogSW5zdGVhZCwgaXQgaXMgcmV0dXJuZWQgc28gdGhhdCBpdCBjYW4gYmUgcmVhdHRhY2hlZCBsYXRlciB2aWEgdGhlIGBhdHRhY2hgIG1ldGhvZC5cbiAgICovXG4gIGRldGFjaCgpOiBDb21wb25lbnRSZWY8dW5rbm93bj47XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gcmUtYXR0YWNoIGEgcHJldmlvdXNseSBkZXRhY2hlZCBzdWJ0cmVlLlxuICAgKi9cbiAgYXR0YWNoKHJlZjogQ29tcG9uZW50UmVmPHVua25vd24+LCBhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGUpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBFbWl0cyBhbiBhY3RpdmF0ZSBldmVudCB3aGVuIGEgbmV3IGNvbXBvbmVudCBpcyBpbnN0YW50aWF0ZWRcbiAgICoqL1xuICBhY3RpdmF0ZUV2ZW50cz86IEV2ZW50RW1pdHRlcjx1bmtub3duPjtcblxuICAvKipcbiAgICogRW1pdHMgYSBkZWFjdGl2YXRlIGV2ZW50IHdoZW4gYSBjb21wb25lbnQgaXMgZGVzdHJveWVkLlxuICAgKi9cbiAgZGVhY3RpdmF0ZUV2ZW50cz86IEV2ZW50RW1pdHRlcjx1bmtub3duPjtcblxuICAvKipcbiAgICogRW1pdHMgYW4gYXR0YWNoZWQgY29tcG9uZW50IGluc3RhbmNlIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byByZS1hdHRhY2ggYVxuICAgKiBwcmV2aW91c2x5IGRldGFjaGVkIHN1YnRyZWUuXG4gICAqKi9cbiAgYXR0YWNoRXZlbnRzPzogRXZlbnRFbWl0dGVyPHVua25vd24+O1xuXG4gIC8qKlxuICAgKiBFbWl0cyBhIGRldGFjaGVkIGNvbXBvbmVudCBpbnN0YW5jZSB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZVxuICAgKiBzdWJ0cmVlLlxuICAgKi9cbiAgZGV0YWNoRXZlbnRzPzogRXZlbnRFbWl0dGVyPHVua25vd24+O1xuXG4gIC8qKlxuICAgKiBVc2VkIHRvIGluZGljYXRlIHRoYXQgdGhlIG91dGxldCBpcyBhYmxlIHRvIGJpbmQgZGF0YSBmcm9tIHRoZSBgUm91dGVyYCB0byB0aGUgb3V0bGV0XG4gICAqIGNvbXBvbmVudCdzIGlucHV0cy5cbiAgICpcbiAgICogV2hlbiB0aGlzIGlzIGB1bmRlZmluZWRgIG9yIGBmYWxzZWAgYW5kIHRoZSBkZXZlbG9wZXIgaGFzIG9wdGVkIGluIHRvIHRoZVxuICAgKiBmZWF0dXJlIHVzaW5nIGB3aXRoQ29tcG9uZW50SW5wdXRCaW5kaW5nYCwgYSB3YXJuaW5nIHdpbGwgYmUgbG9nZ2VkIGluIGRldiBtb2RlIGlmIHRoaXMgb3V0bGV0XG4gICAqIGlzIHVzZWQgaW4gdGhlIGFwcGxpY2F0aW9uLlxuICAgKi9cbiAgcmVhZG9ubHkgc3VwcG9ydHNCaW5kaW5nVG9Db21wb25lbnRJbnB1dHM/OiB0cnVlO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEFjdHMgYXMgYSBwbGFjZWhvbGRlciB0aGF0IEFuZ3VsYXIgZHluYW1pY2FsbHkgZmlsbHMgYmFzZWQgb24gdGhlIGN1cnJlbnQgcm91dGVyIHN0YXRlLlxuICpcbiAqIEVhY2ggb3V0bGV0IGNhbiBoYXZlIGEgdW5pcXVlIG5hbWUsIGRldGVybWluZWQgYnkgdGhlIG9wdGlvbmFsIGBuYW1lYCBhdHRyaWJ1dGUuXG4gKiBUaGUgbmFtZSBjYW5ub3QgYmUgc2V0IG9yIGNoYW5nZWQgZHluYW1pY2FsbHkuIElmIG5vdCBzZXQsIGRlZmF1bHQgdmFsdWUgaXMgXCJwcmltYXJ5XCIuXG4gKlxuICogYGBgXG4gKiA8cm91dGVyLW91dGxldD48L3JvdXRlci1vdXRsZXQ+XG4gKiA8cm91dGVyLW91dGxldCBuYW1lPSdsZWZ0Jz48L3JvdXRlci1vdXRsZXQ+XG4gKiA8cm91dGVyLW91dGxldCBuYW1lPSdyaWdodCc+PC9yb3V0ZXItb3V0bGV0PlxuICogYGBgXG4gKlxuICogTmFtZWQgb3V0bGV0cyBjYW4gYmUgdGhlIHRhcmdldHMgb2Ygc2Vjb25kYXJ5IHJvdXRlcy5cbiAqIFRoZSBgUm91dGVgIG9iamVjdCBmb3IgYSBzZWNvbmRhcnkgcm91dGUgaGFzIGFuIGBvdXRsZXRgIHByb3BlcnR5IHRvIGlkZW50aWZ5IHRoZSB0YXJnZXQgb3V0bGV0OlxuICpcbiAqIGB7cGF0aDogPGJhc2UtcGF0aD4sIGNvbXBvbmVudDogPGNvbXBvbmVudD4sIG91dGxldDogPHRhcmdldF9vdXRsZXRfbmFtZT59YFxuICpcbiAqIFVzaW5nIG5hbWVkIG91dGxldHMgYW5kIHNlY29uZGFyeSByb3V0ZXMsIHlvdSBjYW4gdGFyZ2V0IG11bHRpcGxlIG91dGxldHMgaW5cbiAqIHRoZSBzYW1lIGBSb3V0ZXJMaW5rYCBkaXJlY3RpdmUuXG4gKlxuICogVGhlIHJvdXRlciBrZWVwcyB0cmFjayBvZiBzZXBhcmF0ZSBicmFuY2hlcyBpbiBhIG5hdmlnYXRpb24gdHJlZSBmb3IgZWFjaCBuYW1lZCBvdXRsZXQgYW5kXG4gKiBnZW5lcmF0ZXMgYSByZXByZXNlbnRhdGlvbiBvZiB0aGF0IHRyZWUgaW4gdGhlIFVSTC5cbiAqIFRoZSBVUkwgZm9yIGEgc2Vjb25kYXJ5IHJvdXRlIHVzZXMgdGhlIGZvbGxvd2luZyBzeW50YXggdG8gc3BlY2lmeSBib3RoIHRoZSBwcmltYXJ5IGFuZCBzZWNvbmRhcnlcbiAqIHJvdXRlcyBhdCB0aGUgc2FtZSB0aW1lOlxuICpcbiAqIGBodHRwOi8vYmFzZS1wYXRoL3ByaW1hcnktcm91dGUtcGF0aChvdXRsZXQtbmFtZTpyb3V0ZS1wYXRoKWBcbiAqXG4gKiBBIHJvdXRlciBvdXRsZXQgZW1pdHMgYW4gYWN0aXZhdGUgZXZlbnQgd2hlbiBhIG5ldyBjb21wb25lbnQgaXMgaW5zdGFudGlhdGVkLFxuICogZGVhY3RpdmF0ZSBldmVudCB3aGVuIGEgY29tcG9uZW50IGlzIGRlc3Ryb3llZC5cbiAqIEFuIGF0dGFjaGVkIGV2ZW50IGVtaXRzIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0aGUgb3V0bGV0IHRvIHJlYXR0YWNoIHRoZVxuICogc3VidHJlZSwgYW5kIHRoZSBkZXRhY2hlZCBldmVudCBlbWl0cyB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdGhlIG91dGxldCB0b1xuICogZGV0YWNoIHRoZSBzdWJ0cmVlLlxuICpcbiAqIGBgYFxuICogPHJvdXRlci1vdXRsZXRcbiAqICAgKGFjdGl2YXRlKT0nb25BY3RpdmF0ZSgkZXZlbnQpJ1xuICogICAoZGVhY3RpdmF0ZSk9J29uRGVhY3RpdmF0ZSgkZXZlbnQpJ1xuICogICAoYXR0YWNoKT0nb25BdHRhY2goJGV2ZW50KSdcbiAqICAgKGRldGFjaCk9J29uRGV0YWNoKCRldmVudCknPjwvcm91dGVyLW91dGxldD5cbiAqIGBgYFxuICpcbiAqIEBzZWUge0BsaW5rIFJvdXRlckxpbmt9XG4gKiBAc2VlIHtAbGluayBSb3V0ZX1cbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBEaXJlY3RpdmUoe1xuICBzZWxlY3RvcjogJ3JvdXRlci1vdXRsZXQnLFxuICBleHBvcnRBczogJ291dGxldCcsXG4gIHN0YW5kYWxvbmU6IHRydWUsXG59KVxuZXhwb3J0IGNsYXNzIFJvdXRlck91dGxldCBpbXBsZW1lbnRzIE9uRGVzdHJveSwgT25Jbml0LCBSb3V0ZXJPdXRsZXRDb250cmFjdCB7XG4gIHByaXZhdGUgYWN0aXZhdGVkOiBDb21wb25lbnRSZWY8YW55PiB8IG51bGwgPSBudWxsO1xuICAvKiogQGludGVybmFsICovXG4gIGdldCBhY3RpdmF0ZWRDb21wb25lbnRSZWYoKTogQ29tcG9uZW50UmVmPGFueT4gfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5hY3RpdmF0ZWQ7XG4gIH1cbiAgcHJpdmF0ZSBfYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlIHwgbnVsbCA9IG51bGw7XG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgb3V0bGV0XG4gICAqXG4gICAqL1xuICBASW5wdXQoKSBuYW1lID0gUFJJTUFSWV9PVVRMRVQ7XG5cbiAgQE91dHB1dCgnYWN0aXZhdGUnKSBhY3RpdmF0ZUV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpO1xuICBAT3V0cHV0KCdkZWFjdGl2YXRlJykgZGVhY3RpdmF0ZUV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpO1xuICAvKipcbiAgICogRW1pdHMgYW4gYXR0YWNoZWQgY29tcG9uZW50IGluc3RhbmNlIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byByZS1hdHRhY2ggYVxuICAgKiBwcmV2aW91c2x5IGRldGFjaGVkIHN1YnRyZWUuXG4gICAqKi9cbiAgQE91dHB1dCgnYXR0YWNoJykgYXR0YWNoRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjx1bmtub3duPigpO1xuICAvKipcbiAgICogRW1pdHMgYSBkZXRhY2hlZCBjb21wb25lbnQgaW5zdGFuY2Ugd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIGRldGFjaCB0aGVcbiAgICogc3VidHJlZS5cbiAgICovXG4gIEBPdXRwdXQoJ2RldGFjaCcpIGRldGFjaEV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXI8dW5rbm93bj4oKTtcblxuICBwcml2YXRlIHBhcmVudENvbnRleHRzID0gaW5qZWN0KENoaWxkcmVuT3V0bGV0Q29udGV4dHMpO1xuICBwcml2YXRlIGxvY2F0aW9uID0gaW5qZWN0KFZpZXdDb250YWluZXJSZWYpO1xuICBwcml2YXRlIGNoYW5nZURldGVjdG9yID0gaW5qZWN0KENoYW5nZURldGVjdG9yUmVmKTtcbiAgcHJpdmF0ZSBpbnB1dEJpbmRlciA9IGluamVjdChJTlBVVF9CSU5ERVIsIHtvcHRpb25hbDogdHJ1ZX0pO1xuICAvKiogQG5vZG9jICovXG4gIHJlYWRvbmx5IHN1cHBvcnRzQmluZGluZ1RvQ29tcG9uZW50SW5wdXRzID0gdHJ1ZTtcblxuICAvKiogQG5vZG9jICovXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpIHtcbiAgICBpZiAoY2hhbmdlc1snbmFtZSddKSB7XG4gICAgICBjb25zdCB7Zmlyc3RDaGFuZ2UsIHByZXZpb3VzVmFsdWV9ID0gY2hhbmdlc1snbmFtZSddO1xuICAgICAgaWYgKGZpcnN0Q2hhbmdlKSB7XG4gICAgICAgIC8vIFRoZSBmaXJzdCBjaGFuZ2UgaXMgaGFuZGxlZCBieSBuZ09uSW5pdC4gQmVjYXVzZSBuZ09uQ2hhbmdlcyBkb2Vzbid0IGdldCBjYWxsZWQgd2hlbiBub1xuICAgICAgICAvLyBpbnB1dCBpcyBzZXQgYXQgYWxsLCB3ZSBuZWVkIHRvIGNlbnRyYWxseSBoYW5kbGUgdGhlIGZpcnN0IGNoYW5nZSB0aGVyZS5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyB1bnJlZ2lzdGVyIHdpdGggdGhlIG9sZCBuYW1lXG4gICAgICBpZiAodGhpcy5pc1RyYWNrZWRJblBhcmVudENvbnRleHRzKHByZXZpb3VzVmFsdWUpKSB7XG4gICAgICAgIHRoaXMuZGVhY3RpdmF0ZSgpO1xuICAgICAgICB0aGlzLnBhcmVudENvbnRleHRzLm9uQ2hpbGRPdXRsZXREZXN0cm95ZWQocHJldmlvdXNWYWx1ZSk7XG4gICAgICB9XG4gICAgICAvLyByZWdpc3RlciB0aGUgbmV3IG5hbWVcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZU91dGxldFdpdGhOYW1lKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICAvLyBFbnN1cmUgdGhhdCB0aGUgcmVnaXN0ZXJlZCBvdXRsZXQgaXMgdGhpcyBvbmUgYmVmb3JlIHJlbW92aW5nIGl0IG9uIHRoZSBjb250ZXh0LlxuICAgIGlmICh0aGlzLmlzVHJhY2tlZEluUGFyZW50Q29udGV4dHModGhpcy5uYW1lKSkge1xuICAgICAgdGhpcy5wYXJlbnRDb250ZXh0cy5vbkNoaWxkT3V0bGV0RGVzdHJveWVkKHRoaXMubmFtZSk7XG4gICAgfVxuICAgIHRoaXMuaW5wdXRCaW5kZXI/LnVuc3Vic2NyaWJlRnJvbVJvdXRlRGF0YSh0aGlzKTtcbiAgfVxuXG4gIHByaXZhdGUgaXNUcmFja2VkSW5QYXJlbnRDb250ZXh0cyhvdXRsZXROYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnRDb250ZXh0cy5nZXRDb250ZXh0KG91dGxldE5hbWUpPy5vdXRsZXQgPT09IHRoaXM7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25Jbml0KCk6IHZvaWQge1xuICAgIHRoaXMuaW5pdGlhbGl6ZU91dGxldFdpdGhOYW1lKCk7XG4gIH1cblxuICBwcml2YXRlIGluaXRpYWxpemVPdXRsZXRXaXRoTmFtZSgpIHtcbiAgICB0aGlzLnBhcmVudENvbnRleHRzLm9uQ2hpbGRPdXRsZXRDcmVhdGVkKHRoaXMubmFtZSwgdGhpcyk7XG4gICAgaWYgKHRoaXMuYWN0aXZhdGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIG91dGxldCB3YXMgbm90IGluc3RhbnRpYXRlZCBhdCB0aGUgdGltZSB0aGUgcm91dGUgZ290IGFjdGl2YXRlZCB3ZSBuZWVkIHRvIHBvcHVsYXRlXG4gICAgLy8gdGhlIG91dGxldCB3aGVuIGl0IGlzIGluaXRpYWxpemVkIChpZSBpbnNpZGUgYSBOZ0lmKVxuICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLnBhcmVudENvbnRleHRzLmdldENvbnRleHQodGhpcy5uYW1lKTtcbiAgICBpZiAoY29udGV4dD8ucm91dGUpIHtcbiAgICAgIGlmIChjb250ZXh0LmF0dGFjaFJlZikge1xuICAgICAgICAvLyBgYXR0YWNoUmVmYCBpcyBwb3B1bGF0ZWQgd2hlbiB0aGVyZSBpcyBhbiBleGlzdGluZyBjb21wb25lbnQgdG8gbW91bnRcbiAgICAgICAgdGhpcy5hdHRhY2goY29udGV4dC5hdHRhY2hSZWYsIGNvbnRleHQucm91dGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gb3RoZXJ3aXNlIHRoZSBjb21wb25lbnQgZGVmaW5lZCBpbiB0aGUgY29uZmlndXJhdGlvbiBpcyBjcmVhdGVkXG4gICAgICAgIHRoaXMuYWN0aXZhdGVXaXRoKGNvbnRleHQucm91dGUsIGNvbnRleHQuaW5qZWN0b3IpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldCBpc0FjdGl2YXRlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISF0aGlzLmFjdGl2YXRlZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBUaGUgY3VycmVudGx5IGFjdGl2YXRlZCBjb21wb25lbnQgaW5zdGFuY2UuXG4gICAqIEB0aHJvd3MgQW4gZXJyb3IgaWYgdGhlIG91dGxldCBpcyBub3QgYWN0aXZhdGVkLlxuICAgKi9cbiAgZ2V0IGNvbXBvbmVudCgpOiBPYmplY3Qge1xuICAgIGlmICghdGhpcy5hY3RpdmF0ZWQpXG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICBSdW50aW1lRXJyb3JDb2RlLk9VVExFVF9OT1RfQUNUSVZBVEVELFxuICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJiAnT3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQnLFxuICAgICAgKTtcbiAgICByZXR1cm4gdGhpcy5hY3RpdmF0ZWQuaW5zdGFuY2U7XG4gIH1cblxuICBnZXQgYWN0aXZhdGVkUm91dGUoKTogQWN0aXZhdGVkUm91dGUge1xuICAgIGlmICghdGhpcy5hY3RpdmF0ZWQpXG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICBSdW50aW1lRXJyb3JDb2RlLk9VVExFVF9OT1RfQUNUSVZBVEVELFxuICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJiAnT3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQnLFxuICAgICAgKTtcbiAgICByZXR1cm4gdGhpcy5fYWN0aXZhdGVkUm91dGUgYXMgQWN0aXZhdGVkUm91dGU7XG4gIH1cblxuICBnZXQgYWN0aXZhdGVkUm91dGVEYXRhKCk6IERhdGEge1xuICAgIGlmICh0aGlzLl9hY3RpdmF0ZWRSb3V0ZSkge1xuICAgICAgcmV0dXJuIHRoaXMuX2FjdGl2YXRlZFJvdXRlLnNuYXBzaG90LmRhdGE7XG4gICAgfVxuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIGRldGFjaCB0aGUgc3VidHJlZVxuICAgKi9cbiAgZGV0YWNoKCk6IENvbXBvbmVudFJlZjxhbnk+IHtcbiAgICBpZiAoIXRoaXMuYWN0aXZhdGVkKVxuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgUnVudGltZUVycm9yQ29kZS5PVVRMRVRfTk9UX0FDVElWQVRFRCxcbiAgICAgICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiYgJ091dGxldCBpcyBub3QgYWN0aXZhdGVkJyxcbiAgICAgICk7XG4gICAgdGhpcy5sb2NhdGlvbi5kZXRhY2goKTtcbiAgICBjb25zdCBjbXAgPSB0aGlzLmFjdGl2YXRlZDtcbiAgICB0aGlzLmFjdGl2YXRlZCA9IG51bGw7XG4gICAgdGhpcy5fYWN0aXZhdGVkUm91dGUgPSBudWxsO1xuICAgIHRoaXMuZGV0YWNoRXZlbnRzLmVtaXQoY21wLmluc3RhbmNlKTtcbiAgICByZXR1cm4gY21wO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gcmUtYXR0YWNoIGEgcHJldmlvdXNseSBkZXRhY2hlZCBzdWJ0cmVlXG4gICAqL1xuICBhdHRhY2gocmVmOiBDb21wb25lbnRSZWY8YW55PiwgYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7XG4gICAgdGhpcy5hY3RpdmF0ZWQgPSByZWY7XG4gICAgdGhpcy5fYWN0aXZhdGVkUm91dGUgPSBhY3RpdmF0ZWRSb3V0ZTtcbiAgICB0aGlzLmxvY2F0aW9uLmluc2VydChyZWYuaG9zdFZpZXcpO1xuICAgIHRoaXMuaW5wdXRCaW5kZXI/LmJpbmRBY3RpdmF0ZWRSb3V0ZVRvT3V0bGV0Q29tcG9uZW50KHRoaXMpO1xuICAgIHRoaXMuYXR0YWNoRXZlbnRzLmVtaXQocmVmLmluc3RhbmNlKTtcbiAgfVxuXG4gIGRlYWN0aXZhdGUoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuYWN0aXZhdGVkKSB7XG4gICAgICBjb25zdCBjID0gdGhpcy5jb21wb25lbnQ7XG4gICAgICB0aGlzLmFjdGl2YXRlZC5kZXN0cm95KCk7XG4gICAgICB0aGlzLmFjdGl2YXRlZCA9IG51bGw7XG4gICAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IG51bGw7XG4gICAgICB0aGlzLmRlYWN0aXZhdGVFdmVudHMuZW1pdChjKTtcbiAgICB9XG4gIH1cblxuICBhY3RpdmF0ZVdpdGgoYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlLCBlbnZpcm9ubWVudEluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yKSB7XG4gICAgaWYgKHRoaXMuaXNBY3RpdmF0ZWQpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuT1VUTEVUX0FMUkVBRFlfQUNUSVZBVEVELFxuICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICAgICdDYW5ub3QgYWN0aXZhdGUgYW4gYWxyZWFkeSBhY3RpdmF0ZWQgb3V0bGV0JyxcbiAgICAgICk7XG4gICAgfVxuICAgIHRoaXMuX2FjdGl2YXRlZFJvdXRlID0gYWN0aXZhdGVkUm91dGU7XG4gICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLmxvY2F0aW9uO1xuICAgIGNvbnN0IHNuYXBzaG90ID0gYWN0aXZhdGVkUm91dGUuc25hcHNob3Q7XG4gICAgY29uc3QgY29tcG9uZW50ID0gc25hcHNob3QuY29tcG9uZW50ITtcbiAgICBjb25zdCBjaGlsZENvbnRleHRzID0gdGhpcy5wYXJlbnRDb250ZXh0cy5nZXRPckNyZWF0ZUNvbnRleHQodGhpcy5uYW1lKS5jaGlsZHJlbjtcbiAgICBjb25zdCBpbmplY3RvciA9IG5ldyBPdXRsZXRJbmplY3RvcihhY3RpdmF0ZWRSb3V0ZSwgY2hpbGRDb250ZXh0cywgbG9jYXRpb24uaW5qZWN0b3IpO1xuXG4gICAgdGhpcy5hY3RpdmF0ZWQgPSBsb2NhdGlvbi5jcmVhdGVDb21wb25lbnQoY29tcG9uZW50LCB7XG4gICAgICBpbmRleDogbG9jYXRpb24ubGVuZ3RoLFxuICAgICAgaW5qZWN0b3IsXG4gICAgICBlbnZpcm9ubWVudEluamVjdG9yOiBlbnZpcm9ubWVudEluamVjdG9yLFxuICAgIH0pO1xuICAgIC8vIENhbGxpbmcgYG1hcmtGb3JDaGVja2AgdG8gbWFrZSBzdXJlIHdlIHdpbGwgcnVuIHRoZSBjaGFuZ2UgZGV0ZWN0aW9uIHdoZW4gdGhlXG4gICAgLy8gYFJvdXRlck91dGxldGAgaXMgaW5zaWRlIGEgYENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaGAgY29tcG9uZW50LlxuICAgIHRoaXMuY2hhbmdlRGV0ZWN0b3IubWFya0ZvckNoZWNrKCk7XG4gICAgdGhpcy5pbnB1dEJpbmRlcj8uYmluZEFjdGl2YXRlZFJvdXRlVG9PdXRsZXRDb21wb25lbnQodGhpcyk7XG4gICAgdGhpcy5hY3RpdmF0ZUV2ZW50cy5lbWl0KHRoaXMuYWN0aXZhdGVkLmluc3RhbmNlKTtcbiAgfVxufVxuXG5jbGFzcyBPdXRsZXRJbmplY3RvciBpbXBsZW1lbnRzIEluamVjdG9yIHtcbiAgLyoqXG4gICAqIEEgc3BlY2lhbCBmbGFnIHRoYXQgYWxsb3dzIHRvIGlkZW50aWZ5IHRoZSBgT3V0bGV0SW5qZWN0b3JgIHdpdGhvdXRcbiAgICogcmVmZXJyaW5nIHRvIHRoZSBjbGFzcyBpdHNlbGYuIFRoaXMgaXMgcmVxdWlyZWQgYXMgYSB0ZW1wb3Jhcnkgc29sdXRpb24sXG4gICAqIHRvIGhhdmUgYSBzcGVjaWFsIGhhbmRsaW5nIGZvciB0aGlzIGluamVjdG9yIGluIGNvcmUuIEV2ZW50dWFsbHksIHRoaXNcbiAgICogaW5qZWN0b3Igc2hvdWxkIGp1c3QgYmVjb21lIGFuIGBFbnZpcm9ubWVudEluamVjdG9yYCB3aXRob3V0IHNwZWNpYWwgbG9naWMuXG4gICAqL1xuICBwcml2YXRlIF9fbmdPdXRsZXRJbmplY3RvciA9IHRydWU7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByb3V0ZTogQWN0aXZhdGVkUm91dGUsXG4gICAgcHJpdmF0ZSBjaGlsZENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLFxuICAgIHByaXZhdGUgcGFyZW50OiBJbmplY3RvcixcbiAgKSB7fVxuXG4gIGdldCh0b2tlbjogYW55LCBub3RGb3VuZFZhbHVlPzogYW55KTogYW55IHtcbiAgICBpZiAodG9rZW4gPT09IEFjdGl2YXRlZFJvdXRlKSB7XG4gICAgICByZXR1cm4gdGhpcy5yb3V0ZTtcbiAgICB9XG5cbiAgICBpZiAodG9rZW4gPT09IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpIHtcbiAgICAgIHJldHVybiB0aGlzLmNoaWxkQ29udGV4dHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucGFyZW50LmdldCh0b2tlbiwgbm90Rm91bmRWYWx1ZSk7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IElOUFVUX0JJTkRFUiA9IG5ldyBJbmplY3Rpb25Ub2tlbjxSb3V0ZWRDb21wb25lbnRJbnB1dEJpbmRlcj4oJycpO1xuXG4vKipcbiAqIEluamVjdGFibGUgdXNlZCBhcyBhIHRyZWUtc2hha2FibGUgcHJvdmlkZXIgZm9yIG9wdGluZyBpbiB0byBiaW5kaW5nIHJvdXRlciBkYXRhIHRvIGNvbXBvbmVudFxuICogaW5wdXRzLlxuICpcbiAqIFRoZSBSb3V0ZXJPdXRsZXQgcmVnaXN0ZXJzIGl0c2VsZiB3aXRoIHRoaXMgc2VydmljZSB3aGVuIGFuIGBBY3RpdmF0ZWRSb3V0ZWAgaXMgYXR0YWNoZWQgb3JcbiAqIGFjdGl2YXRlZC4gV2hlbiB0aGlzIGhhcHBlbnMsIHRoZSBzZXJ2aWNlIHN1YnNjcmliZXMgdG8gdGhlIGBBY3RpdmF0ZWRSb3V0ZWAgb2JzZXJ2YWJsZXMgKHBhcmFtcyxcbiAqIHF1ZXJ5UGFyYW1zLCBkYXRhKSBhbmQgc2V0cyB0aGUgaW5wdXRzIG9mIHRoZSBjb21wb25lbnQgdXNpbmcgYENvbXBvbmVudFJlZi5zZXRJbnB1dGAuXG4gKiBJbXBvcnRhbnRseSwgd2hlbiBhbiBpbnB1dCBkb2VzIG5vdCBoYXZlIGFuIGl0ZW0gaW4gdGhlIHJvdXRlIGRhdGEgd2l0aCBhIG1hdGNoaW5nIGtleSwgdGhpc1xuICogaW5wdXQgaXMgc2V0IHRvIGB1bmRlZmluZWRgLiBJZiBpdCB3ZXJlIG5vdCBkb25lIHRoaXMgd2F5LCB0aGUgcHJldmlvdXMgaW5mb3JtYXRpb24gd291bGQgYmVcbiAqIHJldGFpbmVkIGlmIHRoZSBkYXRhIGdvdCByZW1vdmVkIGZyb20gdGhlIHJvdXRlIChpLmUuIGlmIGEgcXVlcnkgcGFyYW1ldGVyIGlzIHJlbW92ZWQpLlxuICpcbiAqIFRoZSBgUm91dGVyT3V0bGV0YCBzaG91bGQgdW5yZWdpc3RlciBpdHNlbGYgd2hlbiBkZXN0cm95ZWQgdmlhIGB1bnN1YnNjcmliZUZyb21Sb3V0ZURhdGFgIHNvIHRoYXRcbiAqIHRoZSBzdWJzY3JpcHRpb25zIGFyZSBjbGVhbmVkIHVwLlxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgUm91dGVkQ29tcG9uZW50SW5wdXRCaW5kZXIge1xuICBwcml2YXRlIG91dGxldERhdGFTdWJzY3JpcHRpb25zID0gbmV3IE1hcDxSb3V0ZXJPdXRsZXQsIFN1YnNjcmlwdGlvbj4oKTtcblxuICBiaW5kQWN0aXZhdGVkUm91dGVUb091dGxldENvbXBvbmVudChvdXRsZXQ6IFJvdXRlck91dGxldCkge1xuICAgIHRoaXMudW5zdWJzY3JpYmVGcm9tUm91dGVEYXRhKG91dGxldCk7XG4gICAgdGhpcy5zdWJzY3JpYmVUb1JvdXRlRGF0YShvdXRsZXQpO1xuICB9XG5cbiAgdW5zdWJzY3JpYmVGcm9tUm91dGVEYXRhKG91dGxldDogUm91dGVyT3V0bGV0KSB7XG4gICAgdGhpcy5vdXRsZXREYXRhU3Vic2NyaXB0aW9ucy5nZXQob3V0bGV0KT8udW5zdWJzY3JpYmUoKTtcbiAgICB0aGlzLm91dGxldERhdGFTdWJzY3JpcHRpb25zLmRlbGV0ZShvdXRsZXQpO1xuICB9XG5cbiAgcHJpdmF0ZSBzdWJzY3JpYmVUb1JvdXRlRGF0YShvdXRsZXQ6IFJvdXRlck91dGxldCkge1xuICAgIGNvbnN0IHthY3RpdmF0ZWRSb3V0ZX0gPSBvdXRsZXQ7XG4gICAgY29uc3QgZGF0YVN1YnNjcmlwdGlvbiA9IGNvbWJpbmVMYXRlc3QoW1xuICAgICAgYWN0aXZhdGVkUm91dGUucXVlcnlQYXJhbXMsXG4gICAgICBhY3RpdmF0ZWRSb3V0ZS5wYXJhbXMsXG4gICAgICBhY3RpdmF0ZWRSb3V0ZS5kYXRhLFxuICAgIF0pXG4gICAgICAucGlwZShcbiAgICAgICAgc3dpdGNoTWFwKChbcXVlcnlQYXJhbXMsIHBhcmFtcywgZGF0YV0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgZGF0YSA9IHsuLi5xdWVyeVBhcmFtcywgLi4ucGFyYW1zLCAuLi5kYXRhfTtcbiAgICAgICAgICAvLyBHZXQgdGhlIGZpcnN0IHJlc3VsdCBmcm9tIHRoZSBkYXRhIHN1YnNjcmlwdGlvbiBzeW5jaHJvbm91c2x5IHNvIGl0J3MgYXZhaWxhYmxlIHRvXG4gICAgICAgICAgLy8gdGhlIGNvbXBvbmVudCBhcyBzb29uIGFzIHBvc3NpYmxlIChhbmQgZG9lc24ndCByZXF1aXJlIGEgc2Vjb25kIGNoYW5nZSBkZXRlY3Rpb24pLlxuICAgICAgICAgIGlmIChpbmRleCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIG9mKGRhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBQcm9taXNlLnJlc29sdmUgaXMgdXNlZCB0byBhdm9pZCBzeW5jaHJvbm91c2x5IHdyaXRpbmcgdGhlIHdyb25nIGRhdGEgd2hlblxuICAgICAgICAgIC8vIHR3byBvZiB0aGUgT2JzZXJ2YWJsZXMgaW4gdGhlIGBjb21iaW5lTGF0ZXN0YCBzdHJlYW0gZW1pdCBvbmUgYWZ0ZXJcbiAgICAgICAgICAvLyBhbm90aGVyLlxuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZGF0YSk7XG4gICAgICAgIH0pLFxuICAgICAgKVxuICAgICAgLnN1YnNjcmliZSgoZGF0YSkgPT4ge1xuICAgICAgICAvLyBPdXRsZXQgbWF5IGhhdmUgYmVlbiBkZWFjdGl2YXRlZCBvciBjaGFuZ2VkIG5hbWVzIHRvIGJlIGFzc29jaWF0ZWQgd2l0aCBhIGRpZmZlcmVudFxuICAgICAgICAvLyByb3V0ZVxuICAgICAgICBpZiAoXG4gICAgICAgICAgIW91dGxldC5pc0FjdGl2YXRlZCB8fFxuICAgICAgICAgICFvdXRsZXQuYWN0aXZhdGVkQ29tcG9uZW50UmVmIHx8XG4gICAgICAgICAgb3V0bGV0LmFjdGl2YXRlZFJvdXRlICE9PSBhY3RpdmF0ZWRSb3V0ZSB8fFxuICAgICAgICAgIGFjdGl2YXRlZFJvdXRlLmNvbXBvbmVudCA9PT0gbnVsbFxuICAgICAgICApIHtcbiAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlRnJvbVJvdXRlRGF0YShvdXRsZXQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG1pcnJvciA9IHJlZmxlY3RDb21wb25lbnRUeXBlKGFjdGl2YXRlZFJvdXRlLmNvbXBvbmVudCk7XG4gICAgICAgIGlmICghbWlycm9yKSB7XG4gICAgICAgICAgdGhpcy51bnN1YnNjcmliZUZyb21Sb3V0ZURhdGEob3V0bGV0KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IHt0ZW1wbGF0ZU5hbWV9IG9mIG1pcnJvci5pbnB1dHMpIHtcbiAgICAgICAgICBvdXRsZXQuYWN0aXZhdGVkQ29tcG9uZW50UmVmLnNldElucHV0KHRlbXBsYXRlTmFtZSwgZGF0YVt0ZW1wbGF0ZU5hbWVdKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICB0aGlzLm91dGxldERhdGFTdWJzY3JpcHRpb25zLnNldChvdXRsZXQsIGRhdGFTdWJzY3JpcHRpb24pO1xuICB9XG59XG4iXX0=