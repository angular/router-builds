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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.0-next.2+sha-940a358", ngImport: i0, type: RouterOutlet, deps: [], target: i0.ɵɵFactoryTarget.Directive }); }
    static { this.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "18.0.0-next.2+sha-940a358", type: RouterOutlet, isStandalone: true, selector: "router-outlet", inputs: { name: "name" }, outputs: { activateEvents: "activate", deactivateEvents: "deactivate", attachEvents: "attach", detachEvents: "detach" }, exportAs: ["outlet"], usesOnChanges: true, ngImport: i0 }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.0-next.2+sha-940a358", ngImport: i0, type: RouterOutlet, decorators: [{
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.0-next.2+sha-940a358", ngImport: i0, type: RoutedComponentInputBinder, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.0.0-next.2+sha-940a358", ngImport: i0, type: RoutedComponentInputBinder }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.0-next.2+sha-940a358", ngImport: i0, type: RoutedComponentInputBinder, decorators: [{
            type: Injectable
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX291dGxldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFDTCxpQkFBaUIsRUFFakIsU0FBUyxFQUVULFlBQVksRUFDWixNQUFNLEVBQ04sVUFBVSxFQUNWLGNBQWMsRUFFZCxLQUFLLEVBR0wsTUFBTSxFQUNOLG9CQUFvQixFQUVwQixnQkFBZ0IsRUFDaEIsYUFBYSxJQUFJLFlBQVksR0FDOUIsTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFDLGFBQWEsRUFBRSxFQUFFLEVBQWUsTUFBTSxNQUFNLENBQUM7QUFDckQsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBSXpDLE9BQU8sRUFBQyxzQkFBc0IsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUMvQyxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sV0FBVyxDQUFDOztBQStGekM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0RHO0FBTUgsTUFBTSxPQUFPLFlBQVk7SUFMekI7UUFNVSxjQUFTLEdBQTZCLElBQUksQ0FBQztRQUszQyxvQkFBZSxHQUEwQixJQUFJLENBQUM7UUFDdEQ7Ozs7V0FJRztRQUNNLFNBQUksR0FBRyxjQUFjLENBQUM7UUFFWCxtQkFBYyxHQUFHLElBQUksWUFBWSxFQUFPLENBQUM7UUFDdkMscUJBQWdCLEdBQUcsSUFBSSxZQUFZLEVBQU8sQ0FBQztRQUNqRTs7O1lBR0k7UUFDYyxpQkFBWSxHQUFHLElBQUksWUFBWSxFQUFXLENBQUM7UUFDN0Q7OztXQUdHO1FBQ2UsaUJBQVksR0FBRyxJQUFJLFlB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QkFDM0MsTUFBTSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDMUUsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUwsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUM3RCxDQUFDO3lIQTNEVSwwQkFBMEI7NkhBQTFCLDBCQUEwQjs7c0dBQTFCLDBCQUEwQjtrQkFEdEMsVUFBVSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1xuICBDaGFuZ2VEZXRlY3RvclJlZixcbiAgQ29tcG9uZW50UmVmLFxuICBEaXJlY3RpdmUsXG4gIEVudmlyb25tZW50SW5qZWN0b3IsXG4gIEV2ZW50RW1pdHRlcixcbiAgaW5qZWN0LFxuICBJbmplY3RhYmxlLFxuICBJbmplY3Rpb25Ub2tlbixcbiAgSW5qZWN0b3IsXG4gIElucHV0LFxuICBPbkRlc3Ryb3ksXG4gIE9uSW5pdCxcbiAgT3V0cHV0LFxuICByZWZsZWN0Q29tcG9uZW50VHlwZSxcbiAgU2ltcGxlQ2hhbmdlcyxcbiAgVmlld0NvbnRhaW5lclJlZixcbiAgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yLFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Y29tYmluZUxhdGVzdCwgb2YsIFN1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge3N3aXRjaE1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge1J1bnRpbWVFcnJvckNvZGV9IGZyb20gJy4uL2Vycm9ycyc7XG5pbXBvcnQge0RhdGF9IGZyb20gJy4uL21vZGVscyc7XG5pbXBvcnQge0NoaWxkcmVuT3V0bGV0Q29udGV4dHN9IGZyb20gJy4uL3JvdXRlcl9vdXRsZXRfY29udGV4dCc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlfSBmcm9tICcuLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQUklNQVJZX09VVExFVH0gZnJvbSAnLi4vc2hhcmVkJztcblxuLyoqXG4gKiBBbiBpbnRlcmZhY2UgdGhhdCBkZWZpbmVzIHRoZSBjb250cmFjdCBmb3IgZGV2ZWxvcGluZyBhIGNvbXBvbmVudCBvdXRsZXQgZm9yIHRoZSBgUm91dGVyYC5cbiAqXG4gKiBBbiBvdXRsZXQgYWN0cyBhcyBhIHBsYWNlaG9sZGVyIHRoYXQgQW5ndWxhciBkeW5hbWljYWxseSBmaWxscyBiYXNlZCBvbiB0aGUgY3VycmVudCByb3V0ZXIgc3RhdGUuXG4gKlxuICogQSByb3V0ZXIgb3V0bGV0IHNob3VsZCByZWdpc3RlciBpdHNlbGYgd2l0aCB0aGUgYFJvdXRlcmAgdmlhXG4gKiBgQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyNvbkNoaWxkT3V0bGV0Q3JlYXRlZGAgYW5kIHVucmVnaXN0ZXIgd2l0aFxuICogYENoaWxkcmVuT3V0bGV0Q29udGV4dHMjb25DaGlsZE91dGxldERlc3Ryb3llZGAuIFdoZW4gdGhlIGBSb3V0ZXJgIGlkZW50aWZpZXMgYSBtYXRjaGVkIGBSb3V0ZWAsXG4gKiBpdCBsb29rcyBmb3IgYSByZWdpc3RlcmVkIG91dGxldCBpbiB0aGUgYENoaWxkcmVuT3V0bGV0Q29udGV4dHNgIGFuZCBhY3RpdmF0ZXMgaXQuXG4gKlxuICogQHNlZSB7QGxpbmsgQ2hpbGRyZW5PdXRsZXRDb250ZXh0c31cbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSb3V0ZXJPdXRsZXRDb250cmFjdCB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBnaXZlbiBvdXRsZXQgaXMgYWN0aXZhdGVkLlxuICAgKlxuICAgKiBBbiBvdXRsZXQgaXMgY29uc2lkZXJlZCBcImFjdGl2YXRlZFwiIGlmIGl0IGhhcyBhbiBhY3RpdmUgY29tcG9uZW50LlxuICAgKi9cbiAgaXNBY3RpdmF0ZWQ6IGJvb2xlYW47XG5cbiAgLyoqIFRoZSBpbnN0YW5jZSBvZiB0aGUgYWN0aXZhdGVkIGNvbXBvbmVudCBvciBgbnVsbGAgaWYgdGhlIG91dGxldCBpcyBub3QgYWN0aXZhdGVkLiAqL1xuICBjb21wb25lbnQ6IE9iamVjdCB8IG51bGw7XG5cbiAgLyoqXG4gICAqIFRoZSBgRGF0YWAgb2YgdGhlIGBBY3RpdmF0ZWRSb3V0ZWAgc25hcHNob3QuXG4gICAqL1xuICBhY3RpdmF0ZWRSb3V0ZURhdGE6IERhdGE7XG5cbiAgLyoqXG4gICAqIFRoZSBgQWN0aXZhdGVkUm91dGVgIGZvciB0aGUgb3V0bGV0IG9yIGBudWxsYCBpZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQuXG4gICAqL1xuICBhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGUgfCBudWxsO1xuXG4gIC8qKlxuICAgKiBDYWxsZWQgYnkgdGhlIGBSb3V0ZXJgIHdoZW4gdGhlIG91dGxldCBzaG91bGQgYWN0aXZhdGUgKGNyZWF0ZSBhIGNvbXBvbmVudCkuXG4gICAqL1xuICBhY3RpdmF0ZVdpdGgoYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlLCBlbnZpcm9ubWVudEluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yKTogdm9pZDtcblxuICAvKipcbiAgICogQSByZXF1ZXN0IHRvIGRlc3Ryb3kgdGhlIGN1cnJlbnRseSBhY3RpdmF0ZWQgY29tcG9uZW50LlxuICAgKlxuICAgKiBXaGVuIGEgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5kaWNhdGVzIHRoYXQgYW4gYEFjdGl2YXRlZFJvdXRlYCBzaG91bGQgYmUgcmVtb3ZlZCBidXQgc3RvcmVkIGZvclxuICAgKiBsYXRlciByZS11c2UgcmF0aGVyIHRoYW4gZGVzdHJveWVkLCB0aGUgYFJvdXRlcmAgd2lsbCBjYWxsIGBkZXRhY2hgIGluc3RlYWQuXG4gICAqL1xuICBkZWFjdGl2YXRlKCk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZSBzdWJ0cmVlLlxuICAgKlxuICAgKiBUaGlzIGlzIHNpbWlsYXIgdG8gYGRlYWN0aXZhdGVgLCBidXQgdGhlIGFjdGl2YXRlZCBjb21wb25lbnQgc2hvdWxkIF9ub3RfIGJlIGRlc3Ryb3llZC5cbiAgICogSW5zdGVhZCwgaXQgaXMgcmV0dXJuZWQgc28gdGhhdCBpdCBjYW4gYmUgcmVhdHRhY2hlZCBsYXRlciB2aWEgdGhlIGBhdHRhY2hgIG1ldGhvZC5cbiAgICovXG4gIGRldGFjaCgpOiBDb21wb25lbnRSZWY8dW5rbm93bj47XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gcmUtYXR0YWNoIGEgcHJldmlvdXNseSBkZXRhY2hlZCBzdWJ0cmVlLlxuICAgKi9cbiAgYXR0YWNoKHJlZjogQ29tcG9uZW50UmVmPHVua25vd24+LCBhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGUpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBFbWl0cyBhbiBhY3RpdmF0ZSBldmVudCB3aGVuIGEgbmV3IGNvbXBvbmVudCBpcyBpbnN0YW50aWF0ZWRcbiAgICoqL1xuICBhY3RpdmF0ZUV2ZW50cz86IEV2ZW50RW1pdHRlcjx1bmtub3duPjtcblxuICAvKipcbiAgICogRW1pdHMgYSBkZWFjdGl2YXRlIGV2ZW50IHdoZW4gYSBjb21wb25lbnQgaXMgZGVzdHJveWVkLlxuICAgKi9cbiAgZGVhY3RpdmF0ZUV2ZW50cz86IEV2ZW50RW1pdHRlcjx1bmtub3duPjtcblxuICAvKipcbiAgICogRW1pdHMgYW4gYXR0YWNoZWQgY29tcG9uZW50IGluc3RhbmNlIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byByZS1hdHRhY2ggYVxuICAgKiBwcmV2aW91c2x5IGRldGFjaGVkIHN1YnRyZWUuXG4gICAqKi9cbiAgYXR0YWNoRXZlbnRzPzogRXZlbnRFbWl0dGVyPHVua25vd24+O1xuXG4gIC8qKlxuICAgKiBFbWl0cyBhIGRldGFjaGVkIGNvbXBvbmVudCBpbnN0YW5jZSB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZVxuICAgKiBzdWJ0cmVlLlxuICAgKi9cbiAgZGV0YWNoRXZlbnRzPzogRXZlbnRFbWl0dGVyPHVua25vd24+O1xuXG4gIC8qKlxuICAgKiBVc2VkIHRvIGluZGljYXRlIHRoYXQgdGhlIG91dGxldCBpcyBhYmxlIHRvIGJpbmQgZGF0YSBmcm9tIHRoZSBgUm91dGVyYCB0byB0aGUgb3V0bGV0XG4gICAqIGNvbXBvbmVudCdzIGlucHV0cy5cbiAgICpcbiAgICogV2hlbiB0aGlzIGlzIGB1bmRlZmluZWRgIG9yIGBmYWxzZWAgYW5kIHRoZSBkZXZlbG9wZXIgaGFzIG9wdGVkIGluIHRvIHRoZVxuICAgKiBmZWF0dXJlIHVzaW5nIGB3aXRoQ29tcG9uZW50SW5wdXRCaW5kaW5nYCwgYSB3YXJuaW5nIHdpbGwgYmUgbG9nZ2VkIGluIGRldiBtb2RlIGlmIHRoaXMgb3V0bGV0XG4gICAqIGlzIHVzZWQgaW4gdGhlIGFwcGxpY2F0aW9uLlxuICAgKi9cbiAgcmVhZG9ubHkgc3VwcG9ydHNCaW5kaW5nVG9Db21wb25lbnRJbnB1dHM/OiB0cnVlO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEFjdHMgYXMgYSBwbGFjZWhvbGRlciB0aGF0IEFuZ3VsYXIgZHluYW1pY2FsbHkgZmlsbHMgYmFzZWQgb24gdGhlIGN1cnJlbnQgcm91dGVyIHN0YXRlLlxuICpcbiAqIEVhY2ggb3V0bGV0IGNhbiBoYXZlIGEgdW5pcXVlIG5hbWUsIGRldGVybWluZWQgYnkgdGhlIG9wdGlvbmFsIGBuYW1lYCBhdHRyaWJ1dGUuXG4gKiBUaGUgbmFtZSBjYW5ub3QgYmUgc2V0IG9yIGNoYW5nZWQgZHluYW1pY2FsbHkuIElmIG5vdCBzZXQsIGRlZmF1bHQgdmFsdWUgaXMgXCJwcmltYXJ5XCIuXG4gKlxuICogYGBgXG4gKiA8cm91dGVyLW91dGxldD48L3JvdXRlci1vdXRsZXQ+XG4gKiA8cm91dGVyLW91dGxldCBuYW1lPSdsZWZ0Jz48L3JvdXRlci1vdXRsZXQ+XG4gKiA8cm91dGVyLW91dGxldCBuYW1lPSdyaWdodCc+PC9yb3V0ZXItb3V0bGV0PlxuICogYGBgXG4gKlxuICogTmFtZWQgb3V0bGV0cyBjYW4gYmUgdGhlIHRhcmdldHMgb2Ygc2Vjb25kYXJ5IHJvdXRlcy5cbiAqIFRoZSBgUm91dGVgIG9iamVjdCBmb3IgYSBzZWNvbmRhcnkgcm91dGUgaGFzIGFuIGBvdXRsZXRgIHByb3BlcnR5IHRvIGlkZW50aWZ5IHRoZSB0YXJnZXQgb3V0bGV0OlxuICpcbiAqIGB7cGF0aDogPGJhc2UtcGF0aD4sIGNvbXBvbmVudDogPGNvbXBvbmVudD4sIG91dGxldDogPHRhcmdldF9vdXRsZXRfbmFtZT59YFxuICpcbiAqIFVzaW5nIG5hbWVkIG91dGxldHMgYW5kIHNlY29uZGFyeSByb3V0ZXMsIHlvdSBjYW4gdGFyZ2V0IG11bHRpcGxlIG91dGxldHMgaW5cbiAqIHRoZSBzYW1lIGBSb3V0ZXJMaW5rYCBkaXJlY3RpdmUuXG4gKlxuICogVGhlIHJvdXRlciBrZWVwcyB0cmFjayBvZiBzZXBhcmF0ZSBicmFuY2hlcyBpbiBhIG5hdmlnYXRpb24gdHJlZSBmb3IgZWFjaCBuYW1lZCBvdXRsZXQgYW5kXG4gKiBnZW5lcmF0ZXMgYSByZXByZXNlbnRhdGlvbiBvZiB0aGF0IHRyZWUgaW4gdGhlIFVSTC5cbiAqIFRoZSBVUkwgZm9yIGEgc2Vjb25kYXJ5IHJvdXRlIHVzZXMgdGhlIGZvbGxvd2luZyBzeW50YXggdG8gc3BlY2lmeSBib3RoIHRoZSBwcmltYXJ5IGFuZCBzZWNvbmRhcnlcbiAqIHJvdXRlcyBhdCB0aGUgc2FtZSB0aW1lOlxuICpcbiAqIGBodHRwOi8vYmFzZS1wYXRoL3ByaW1hcnktcm91dGUtcGF0aChvdXRsZXQtbmFtZTpyb3V0ZS1wYXRoKWBcbiAqXG4gKiBBIHJvdXRlciBvdXRsZXQgZW1pdHMgYW4gYWN0aXZhdGUgZXZlbnQgd2hlbiBhIG5ldyBjb21wb25lbnQgaXMgaW5zdGFudGlhdGVkLFxuICogZGVhY3RpdmF0ZSBldmVudCB3aGVuIGEgY29tcG9uZW50IGlzIGRlc3Ryb3llZC5cbiAqIEFuIGF0dGFjaGVkIGV2ZW50IGVtaXRzIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0aGUgb3V0bGV0IHRvIHJlYXR0YWNoIHRoZVxuICogc3VidHJlZSwgYW5kIHRoZSBkZXRhY2hlZCBldmVudCBlbWl0cyB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdGhlIG91dGxldCB0b1xuICogZGV0YWNoIHRoZSBzdWJ0cmVlLlxuICpcbiAqIGBgYFxuICogPHJvdXRlci1vdXRsZXRcbiAqICAgKGFjdGl2YXRlKT0nb25BY3RpdmF0ZSgkZXZlbnQpJ1xuICogICAoZGVhY3RpdmF0ZSk9J29uRGVhY3RpdmF0ZSgkZXZlbnQpJ1xuICogICAoYXR0YWNoKT0nb25BdHRhY2goJGV2ZW50KSdcbiAqICAgKGRldGFjaCk9J29uRGV0YWNoKCRldmVudCknPjwvcm91dGVyLW91dGxldD5cbiAqIGBgYFxuICpcbiAqIEBzZWUgW1JvdXRpbmcgdHV0b3JpYWxdKGd1aWRlL3JvdXRlci10dXRvcmlhbC10b2gjbmFtZWQtb3V0bGV0cyBcIkV4YW1wbGUgb2YgYSBuYW1lZFxuICogb3V0bGV0IGFuZCBzZWNvbmRhcnkgcm91dGUgY29uZmlndXJhdGlvblwiKS5cbiAqIEBzZWUge0BsaW5rIFJvdXRlckxpbmt9XG4gKiBAc2VlIHtAbGluayBSb3V0ZX1cbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBEaXJlY3RpdmUoe1xuICBzZWxlY3RvcjogJ3JvdXRlci1vdXRsZXQnLFxuICBleHBvcnRBczogJ291dGxldCcsXG4gIHN0YW5kYWxvbmU6IHRydWUsXG59KVxuZXhwb3J0IGNsYXNzIFJvdXRlck91dGxldCBpbXBsZW1lbnRzIE9uRGVzdHJveSwgT25Jbml0LCBSb3V0ZXJPdXRsZXRDb250cmFjdCB7XG4gIHByaXZhdGUgYWN0aXZhdGVkOiBDb21wb25lbnRSZWY8YW55PiB8IG51bGwgPSBudWxsO1xuICAvKiogQGludGVybmFsICovXG4gIGdldCBhY3RpdmF0ZWRDb21wb25lbnRSZWYoKTogQ29tcG9uZW50UmVmPGFueT4gfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5hY3RpdmF0ZWQ7XG4gIH1cbiAgcHJpdmF0ZSBfYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlIHwgbnVsbCA9IG51bGw7XG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgb3V0bGV0XG4gICAqXG4gICAqIEBzZWUgW25hbWVkIG91dGxldHNdKGd1aWRlL3JvdXRlci10dXRvcmlhbC10b2gjZGlzcGxheWluZy1tdWx0aXBsZS1yb3V0ZXMtaW4tbmFtZWQtb3V0bGV0cylcbiAgICovXG4gIEBJbnB1dCgpIG5hbWUgPSBQUklNQVJZX09VVExFVDtcblxuICBAT3V0cHV0KCdhY3RpdmF0ZScpIGFjdGl2YXRlRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG4gIEBPdXRwdXQoJ2RlYWN0aXZhdGUnKSBkZWFjdGl2YXRlRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjxhbnk+KCk7XG4gIC8qKlxuICAgKiBFbWl0cyBhbiBhdHRhY2hlZCBjb21wb25lbnQgaW5zdGFuY2Ugd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIHJlLWF0dGFjaCBhXG4gICAqIHByZXZpb3VzbHkgZGV0YWNoZWQgc3VidHJlZS5cbiAgICoqL1xuICBAT3V0cHV0KCdhdHRhY2gnKSBhdHRhY2hFdmVudHMgPSBuZXcgRXZlbnRFbWl0dGVyPHVua25vd24+KCk7XG4gIC8qKlxuICAgKiBFbWl0cyBhIGRldGFjaGVkIGNvbXBvbmVudCBpbnN0YW5jZSB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZVxuICAgKiBzdWJ0cmVlLlxuICAgKi9cbiAgQE91dHB1dCgnZGV0YWNoJykgZGV0YWNoRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjx1bmtub3duPigpO1xuXG4gIHByaXZhdGUgcGFyZW50Q29udGV4dHMgPSBpbmplY3QoQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk7XG4gIHByaXZhdGUgbG9jYXRpb24gPSBpbmplY3QoVmlld0NvbnRhaW5lclJlZik7XG4gIHByaXZhdGUgY2hhbmdlRGV0ZWN0b3IgPSBpbmplY3QoQ2hhbmdlRGV0ZWN0b3JSZWYpO1xuICBwcml2YXRlIGlucHV0QmluZGVyID0gaW5qZWN0KElOUFVUX0JJTkRFUiwge29wdGlvbmFsOiB0cnVlfSk7XG4gIC8qKiBAbm9kb2MgKi9cbiAgcmVhZG9ubHkgc3VwcG9ydHNCaW5kaW5nVG9Db21wb25lbnRJbnB1dHMgPSB0cnVlO1xuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcykge1xuICAgIGlmIChjaGFuZ2VzWyduYW1lJ10pIHtcbiAgICAgIGNvbnN0IHtmaXJzdENoYW5nZSwgcHJldmlvdXNWYWx1ZX0gPSBjaGFuZ2VzWyduYW1lJ107XG4gICAgICBpZiAoZmlyc3RDaGFuZ2UpIHtcbiAgICAgICAgLy8gVGhlIGZpcnN0IGNoYW5nZSBpcyBoYW5kbGVkIGJ5IG5nT25Jbml0LiBCZWNhdXNlIG5nT25DaGFuZ2VzIGRvZXNuJ3QgZ2V0IGNhbGxlZCB3aGVuIG5vXG4gICAgICAgIC8vIGlucHV0IGlzIHNldCBhdCBhbGwsIHdlIG5lZWQgdG8gY2VudHJhbGx5IGhhbmRsZSB0aGUgZmlyc3QgY2hhbmdlIHRoZXJlLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIHVucmVnaXN0ZXIgd2l0aCB0aGUgb2xkIG5hbWVcbiAgICAgIGlmICh0aGlzLmlzVHJhY2tlZEluUGFyZW50Q29udGV4dHMocHJldmlvdXNWYWx1ZSkpIHtcbiAgICAgICAgdGhpcy5kZWFjdGl2YXRlKCk7XG4gICAgICAgIHRoaXMucGFyZW50Q29udGV4dHMub25DaGlsZE91dGxldERlc3Ryb3llZChwcmV2aW91c1ZhbHVlKTtcbiAgICAgIH1cbiAgICAgIC8vIHJlZ2lzdGVyIHRoZSBuZXcgbmFtZVxuICAgICAgdGhpcy5pbml0aWFsaXplT3V0bGV0V2l0aE5hbWUoKTtcbiAgICB9XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIC8vIEVuc3VyZSB0aGF0IHRoZSByZWdpc3RlcmVkIG91dGxldCBpcyB0aGlzIG9uZSBiZWZvcmUgcmVtb3ZpbmcgaXQgb24gdGhlIGNvbnRleHQuXG4gICAgaWYgKHRoaXMuaXNUcmFja2VkSW5QYXJlbnRDb250ZXh0cyh0aGlzLm5hbWUpKSB7XG4gICAgICB0aGlzLnBhcmVudENvbnRleHRzLm9uQ2hpbGRPdXRsZXREZXN0cm95ZWQodGhpcy5uYW1lKTtcbiAgICB9XG4gICAgdGhpcy5pbnB1dEJpbmRlcj8udW5zdWJzY3JpYmVGcm9tUm91dGVEYXRhKHRoaXMpO1xuICB9XG5cbiAgcHJpdmF0ZSBpc1RyYWNrZWRJblBhcmVudENvbnRleHRzKG91dGxldE5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiB0aGlzLnBhcmVudENvbnRleHRzLmdldENvbnRleHQob3V0bGV0TmFtZSk/Lm91dGxldCA9PT0gdGhpcztcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkluaXQoKTogdm9pZCB7XG4gICAgdGhpcy5pbml0aWFsaXplT3V0bGV0V2l0aE5hbWUoKTtcbiAgfVxuXG4gIHByaXZhdGUgaW5pdGlhbGl6ZU91dGxldFdpdGhOYW1lKCkge1xuICAgIHRoaXMucGFyZW50Q29udGV4dHMub25DaGlsZE91dGxldENyZWF0ZWQodGhpcy5uYW1lLCB0aGlzKTtcbiAgICBpZiAodGhpcy5hY3RpdmF0ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgb3V0bGV0IHdhcyBub3QgaW5zdGFudGlhdGVkIGF0IHRoZSB0aW1lIHRoZSByb3V0ZSBnb3QgYWN0aXZhdGVkIHdlIG5lZWQgdG8gcG9wdWxhdGVcbiAgICAvLyB0aGUgb3V0bGV0IHdoZW4gaXQgaXMgaW5pdGlhbGl6ZWQgKGllIGluc2lkZSBhIE5nSWYpXG4gICAgY29uc3QgY29udGV4dCA9IHRoaXMucGFyZW50Q29udGV4dHMuZ2V0Q29udGV4dCh0aGlzLm5hbWUpO1xuICAgIGlmIChjb250ZXh0Py5yb3V0ZSkge1xuICAgICAgaWYgKGNvbnRleHQuYXR0YWNoUmVmKSB7XG4gICAgICAgIC8vIGBhdHRhY2hSZWZgIGlzIHBvcHVsYXRlZCB3aGVuIHRoZXJlIGlzIGFuIGV4aXN0aW5nIGNvbXBvbmVudCB0byBtb3VudFxuICAgICAgICB0aGlzLmF0dGFjaChjb250ZXh0LmF0dGFjaFJlZiwgY29udGV4dC5yb3V0ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBvdGhlcndpc2UgdGhlIGNvbXBvbmVudCBkZWZpbmVkIGluIHRoZSBjb25maWd1cmF0aW9uIGlzIGNyZWF0ZWRcbiAgICAgICAgdGhpcy5hY3RpdmF0ZVdpdGgoY29udGV4dC5yb3V0ZSwgY29udGV4dC5pbmplY3Rvcik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0IGlzQWN0aXZhdGVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXRoaXMuYWN0aXZhdGVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm5zIFRoZSBjdXJyZW50bHkgYWN0aXZhdGVkIGNvbXBvbmVudCBpbnN0YW5jZS5cbiAgICogQHRocm93cyBBbiBlcnJvciBpZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQuXG4gICAqL1xuICBnZXQgY29tcG9uZW50KCk6IE9iamVjdCB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZClcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuT1VUTEVUX05PVF9BQ1RJVkFURUQsXG4gICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmICdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcsXG4gICAgICApO1xuICAgIHJldHVybiB0aGlzLmFjdGl2YXRlZC5pbnN0YW5jZTtcbiAgfVxuXG4gIGdldCBhY3RpdmF0ZWRSb3V0ZSgpOiBBY3RpdmF0ZWRSb3V0ZSB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZClcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuT1VUTEVUX05PVF9BQ1RJVkFURUQsXG4gICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmICdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcsXG4gICAgICApO1xuICAgIHJldHVybiB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSBhcyBBY3RpdmF0ZWRSb3V0ZTtcbiAgfVxuXG4gIGdldCBhY3RpdmF0ZWRSb3V0ZURhdGEoKTogRGF0YSB7XG4gICAgaWYgKHRoaXMuX2FjdGl2YXRlZFJvdXRlKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWN0aXZhdGVkUm91dGUuc25hcHNob3QuZGF0YTtcbiAgICB9XG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZSBzdWJ0cmVlXG4gICAqL1xuICBkZXRhY2goKTogQ29tcG9uZW50UmVmPGFueT4ge1xuICAgIGlmICghdGhpcy5hY3RpdmF0ZWQpXG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICBSdW50aW1lRXJyb3JDb2RlLk9VVExFVF9OT1RfQUNUSVZBVEVELFxuICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJiAnT3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQnLFxuICAgICAgKTtcbiAgICB0aGlzLmxvY2F0aW9uLmRldGFjaCgpO1xuICAgIGNvbnN0IGNtcCA9IHRoaXMuYWN0aXZhdGVkO1xuICAgIHRoaXMuYWN0aXZhdGVkID0gbnVsbDtcbiAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IG51bGw7XG4gICAgdGhpcy5kZXRhY2hFdmVudHMuZW1pdChjbXAuaW5zdGFuY2UpO1xuICAgIHJldHVybiBjbXA7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byByZS1hdHRhY2ggYSBwcmV2aW91c2x5IGRldGFjaGVkIHN1YnRyZWVcbiAgICovXG4gIGF0dGFjaChyZWY6IENvbXBvbmVudFJlZjxhbnk+LCBhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGUpIHtcbiAgICB0aGlzLmFjdGl2YXRlZCA9IHJlZjtcbiAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IGFjdGl2YXRlZFJvdXRlO1xuICAgIHRoaXMubG9jYXRpb24uaW5zZXJ0KHJlZi5ob3N0Vmlldyk7XG4gICAgdGhpcy5pbnB1dEJpbmRlcj8uYmluZEFjdGl2YXRlZFJvdXRlVG9PdXRsZXRDb21wb25lbnQodGhpcyk7XG4gICAgdGhpcy5hdHRhY2hFdmVudHMuZW1pdChyZWYuaW5zdGFuY2UpO1xuICB9XG5cbiAgZGVhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5hY3RpdmF0ZWQpIHtcbiAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbXBvbmVudDtcbiAgICAgIHRoaXMuYWN0aXZhdGVkLmRlc3Ryb3koKTtcbiAgICAgIHRoaXMuYWN0aXZhdGVkID0gbnVsbDtcbiAgICAgIHRoaXMuX2FjdGl2YXRlZFJvdXRlID0gbnVsbDtcbiAgICAgIHRoaXMuZGVhY3RpdmF0ZUV2ZW50cy5lbWl0KGMpO1xuICAgIH1cbiAgfVxuXG4gIGFjdGl2YXRlV2l0aChhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGUsIGVudmlyb25tZW50SW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IpIHtcbiAgICBpZiAodGhpcy5pc0FjdGl2YXRlZCkge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgUnVudGltZUVycm9yQ29kZS5PVVRMRVRfQUxSRUFEWV9BQ1RJVkFURUQsXG4gICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmXG4gICAgICAgICAgJ0Nhbm5vdCBhY3RpdmF0ZSBhbiBhbHJlYWR5IGFjdGl2YXRlZCBvdXRsZXQnLFxuICAgICAgKTtcbiAgICB9XG4gICAgdGhpcy5fYWN0aXZhdGVkUm91dGUgPSBhY3RpdmF0ZWRSb3V0ZTtcbiAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMubG9jYXRpb247XG4gICAgY29uc3Qgc25hcHNob3QgPSBhY3RpdmF0ZWRSb3V0ZS5zbmFwc2hvdDtcbiAgICBjb25zdCBjb21wb25lbnQgPSBzbmFwc2hvdC5jb21wb25lbnQhO1xuICAgIGNvbnN0IGNoaWxkQ29udGV4dHMgPSB0aGlzLnBhcmVudENvbnRleHRzLmdldE9yQ3JlYXRlQ29udGV4dCh0aGlzLm5hbWUpLmNoaWxkcmVuO1xuICAgIGNvbnN0IGluamVjdG9yID0gbmV3IE91dGxldEluamVjdG9yKGFjdGl2YXRlZFJvdXRlLCBjaGlsZENvbnRleHRzLCBsb2NhdGlvbi5pbmplY3Rvcik7XG5cbiAgICB0aGlzLmFjdGl2YXRlZCA9IGxvY2F0aW9uLmNyZWF0ZUNvbXBvbmVudChjb21wb25lbnQsIHtcbiAgICAgIGluZGV4OiBsb2NhdGlvbi5sZW5ndGgsXG4gICAgICBpbmplY3RvcixcbiAgICAgIGVudmlyb25tZW50SW5qZWN0b3I6IGVudmlyb25tZW50SW5qZWN0b3IsXG4gICAgfSk7XG4gICAgLy8gQ2FsbGluZyBgbWFya0ZvckNoZWNrYCB0byBtYWtlIHN1cmUgd2Ugd2lsbCBydW4gdGhlIGNoYW5nZSBkZXRlY3Rpb24gd2hlbiB0aGVcbiAgICAvLyBgUm91dGVyT3V0bGV0YCBpcyBpbnNpZGUgYSBgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoYCBjb21wb25lbnQuXG4gICAgdGhpcy5jaGFuZ2VEZXRlY3Rvci5tYXJrRm9yQ2hlY2soKTtcbiAgICB0aGlzLmlucHV0QmluZGVyPy5iaW5kQWN0aXZhdGVkUm91dGVUb091dGxldENvbXBvbmVudCh0aGlzKTtcbiAgICB0aGlzLmFjdGl2YXRlRXZlbnRzLmVtaXQodGhpcy5hY3RpdmF0ZWQuaW5zdGFuY2UpO1xuICB9XG59XG5cbmNsYXNzIE91dGxldEluamVjdG9yIGltcGxlbWVudHMgSW5qZWN0b3Ige1xuICAvKipcbiAgICogQSBzcGVjaWFsIGZsYWcgdGhhdCBhbGxvd3MgdG8gaWRlbnRpZnkgdGhlIGBPdXRsZXRJbmplY3RvcmAgd2l0aG91dFxuICAgKiByZWZlcnJpbmcgdG8gdGhlIGNsYXNzIGl0c2VsZi4gVGhpcyBpcyByZXF1aXJlZCBhcyBhIHRlbXBvcmFyeSBzb2x1dGlvbixcbiAgICogdG8gaGF2ZSBhIHNwZWNpYWwgaGFuZGxpbmcgZm9yIHRoaXMgaW5qZWN0b3IgaW4gY29yZS4gRXZlbnR1YWxseSwgdGhpc1xuICAgKiBpbmplY3RvciBzaG91bGQganVzdCBiZWNvbWUgYW4gYEVudmlyb25tZW50SW5qZWN0b3JgIHdpdGhvdXQgc3BlY2lhbCBsb2dpYy5cbiAgICovXG4gIHByaXZhdGUgX19uZ091dGxldEluamVjdG9yID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSxcbiAgICBwcml2YXRlIGNoaWxkQ29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsXG4gICAgcHJpdmF0ZSBwYXJlbnQ6IEluamVjdG9yLFxuICApIHt9XG5cbiAgZ2V0KHRva2VuOiBhbnksIG5vdEZvdW5kVmFsdWU/OiBhbnkpOiBhbnkge1xuICAgIGlmICh0b2tlbiA9PT0gQWN0aXZhdGVkUm91dGUpIHtcbiAgICAgIHJldHVybiB0aGlzLnJvdXRlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbiA9PT0gQ2hpbGRyZW5PdXRsZXRDb250ZXh0cykge1xuICAgICAgcmV0dXJuIHRoaXMuY2hpbGRDb250ZXh0cztcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5wYXJlbnQuZ2V0KHRva2VuLCBub3RGb3VuZFZhbHVlKTtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgSU5QVVRfQklOREVSID0gbmV3IEluamVjdGlvblRva2VuPFJvdXRlZENvbXBvbmVudElucHV0QmluZGVyPignJyk7XG5cbi8qKlxuICogSW5qZWN0YWJsZSB1c2VkIGFzIGEgdHJlZS1zaGFrYWJsZSBwcm92aWRlciBmb3Igb3B0aW5nIGluIHRvIGJpbmRpbmcgcm91dGVyIGRhdGEgdG8gY29tcG9uZW50XG4gKiBpbnB1dHMuXG4gKlxuICogVGhlIFJvdXRlck91dGxldCByZWdpc3RlcnMgaXRzZWxmIHdpdGggdGhpcyBzZXJ2aWNlIHdoZW4gYW4gYEFjdGl2YXRlZFJvdXRlYCBpcyBhdHRhY2hlZCBvclxuICogYWN0aXZhdGVkLiBXaGVuIHRoaXMgaGFwcGVucywgdGhlIHNlcnZpY2Ugc3Vic2NyaWJlcyB0byB0aGUgYEFjdGl2YXRlZFJvdXRlYCBvYnNlcnZhYmxlcyAocGFyYW1zLFxuICogcXVlcnlQYXJhbXMsIGRhdGEpIGFuZCBzZXRzIHRoZSBpbnB1dHMgb2YgdGhlIGNvbXBvbmVudCB1c2luZyBgQ29tcG9uZW50UmVmLnNldElucHV0YC5cbiAqIEltcG9ydGFudGx5LCB3aGVuIGFuIGlucHV0IGRvZXMgbm90IGhhdmUgYW4gaXRlbSBpbiB0aGUgcm91dGUgZGF0YSB3aXRoIGEgbWF0Y2hpbmcga2V5LCB0aGlzXG4gKiBpbnB1dCBpcyBzZXQgdG8gYHVuZGVmaW5lZGAuIElmIGl0IHdlcmUgbm90IGRvbmUgdGhpcyB3YXksIHRoZSBwcmV2aW91cyBpbmZvcm1hdGlvbiB3b3VsZCBiZVxuICogcmV0YWluZWQgaWYgdGhlIGRhdGEgZ290IHJlbW92ZWQgZnJvbSB0aGUgcm91dGUgKGkuZS4gaWYgYSBxdWVyeSBwYXJhbWV0ZXIgaXMgcmVtb3ZlZCkuXG4gKlxuICogVGhlIGBSb3V0ZXJPdXRsZXRgIHNob3VsZCB1bnJlZ2lzdGVyIGl0c2VsZiB3aGVuIGRlc3Ryb3llZCB2aWEgYHVuc3Vic2NyaWJlRnJvbVJvdXRlRGF0YWAgc28gdGhhdFxuICogdGhlIHN1YnNjcmlwdGlvbnMgYXJlIGNsZWFuZWQgdXAuXG4gKi9cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBSb3V0ZWRDb21wb25lbnRJbnB1dEJpbmRlciB7XG4gIHByaXZhdGUgb3V0bGV0RGF0YVN1YnNjcmlwdGlvbnMgPSBuZXcgTWFwPFJvdXRlck91dGxldCwgU3Vic2NyaXB0aW9uPigpO1xuXG4gIGJpbmRBY3RpdmF0ZWRSb3V0ZVRvT3V0bGV0Q29tcG9uZW50KG91dGxldDogUm91dGVyT3V0bGV0KSB7XG4gICAgdGhpcy51bnN1YnNjcmliZUZyb21Sb3V0ZURhdGEob3V0bGV0KTtcbiAgICB0aGlzLnN1YnNjcmliZVRvUm91dGVEYXRhKG91dGxldCk7XG4gIH1cblxuICB1bnN1YnNjcmliZUZyb21Sb3V0ZURhdGEob3V0bGV0OiBSb3V0ZXJPdXRsZXQpIHtcbiAgICB0aGlzLm91dGxldERhdGFTdWJzY3JpcHRpb25zLmdldChvdXRsZXQpPy51bnN1YnNjcmliZSgpO1xuICAgIHRoaXMub3V0bGV0RGF0YVN1YnNjcmlwdGlvbnMuZGVsZXRlKG91dGxldCk7XG4gIH1cblxuICBwcml2YXRlIHN1YnNjcmliZVRvUm91dGVEYXRhKG91dGxldDogUm91dGVyT3V0bGV0KSB7XG4gICAgY29uc3Qge2FjdGl2YXRlZFJvdXRlfSA9IG91dGxldDtcbiAgICBjb25zdCBkYXRhU3Vic2NyaXB0aW9uID0gY29tYmluZUxhdGVzdChbXG4gICAgICBhY3RpdmF0ZWRSb3V0ZS5xdWVyeVBhcmFtcyxcbiAgICAgIGFjdGl2YXRlZFJvdXRlLnBhcmFtcyxcbiAgICAgIGFjdGl2YXRlZFJvdXRlLmRhdGEsXG4gICAgXSlcbiAgICAgIC5waXBlKFxuICAgICAgICBzd2l0Y2hNYXAoKFtxdWVyeVBhcmFtcywgcGFyYW1zLCBkYXRhXSwgaW5kZXgpID0+IHtcbiAgICAgICAgICBkYXRhID0gey4uLnF1ZXJ5UGFyYW1zLCAuLi5wYXJhbXMsIC4uLmRhdGF9O1xuICAgICAgICAgIC8vIEdldCB0aGUgZmlyc3QgcmVzdWx0IGZyb20gdGhlIGRhdGEgc3Vic2NyaXB0aW9uIHN5bmNocm9ub3VzbHkgc28gaXQncyBhdmFpbGFibGUgdG9cbiAgICAgICAgICAvLyB0aGUgY29tcG9uZW50IGFzIHNvb24gYXMgcG9zc2libGUgKGFuZCBkb2Vzbid0IHJlcXVpcmUgYSBzZWNvbmQgY2hhbmdlIGRldGVjdGlvbikuXG4gICAgICAgICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gb2YoZGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFByb21pc2UucmVzb2x2ZSBpcyB1c2VkIHRvIGF2b2lkIHN5bmNocm9ub3VzbHkgd3JpdGluZyB0aGUgd3JvbmcgZGF0YSB3aGVuXG4gICAgICAgICAgLy8gdHdvIG9mIHRoZSBPYnNlcnZhYmxlcyBpbiB0aGUgYGNvbWJpbmVMYXRlc3RgIHN0cmVhbSBlbWl0IG9uZSBhZnRlclxuICAgICAgICAgIC8vIGFub3RoZXIuXG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShkYXRhKTtcbiAgICAgICAgfSksXG4gICAgICApXG4gICAgICAuc3Vic2NyaWJlKChkYXRhKSA9PiB7XG4gICAgICAgIC8vIE91dGxldCBtYXkgaGF2ZSBiZWVuIGRlYWN0aXZhdGVkIG9yIGNoYW5nZWQgbmFtZXMgdG8gYmUgYXNzb2NpYXRlZCB3aXRoIGEgZGlmZmVyZW50XG4gICAgICAgIC8vIHJvdXRlXG4gICAgICAgIGlmIChcbiAgICAgICAgICAhb3V0bGV0LmlzQWN0aXZhdGVkIHx8XG4gICAgICAgICAgIW91dGxldC5hY3RpdmF0ZWRDb21wb25lbnRSZWYgfHxcbiAgICAgICAgICBvdXRsZXQuYWN0aXZhdGVkUm91dGUgIT09IGFjdGl2YXRlZFJvdXRlIHx8XG4gICAgICAgICAgYWN0aXZhdGVkUm91dGUuY29tcG9uZW50ID09PSBudWxsXG4gICAgICAgICkge1xuICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmVGcm9tUm91dGVEYXRhKG91dGxldCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWlycm9yID0gcmVmbGVjdENvbXBvbmVudFR5cGUoYWN0aXZhdGVkUm91dGUuY29tcG9uZW50KTtcbiAgICAgICAgaWYgKCFtaXJyb3IpIHtcbiAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlRnJvbVJvdXRlRGF0YShvdXRsZXQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3Qge3RlbXBsYXRlTmFtZX0gb2YgbWlycm9yLmlucHV0cykge1xuICAgICAgICAgIG91dGxldC5hY3RpdmF0ZWRDb21wb25lbnRSZWYuc2V0SW5wdXQodGVtcGxhdGVOYW1lLCBkYXRhW3RlbXBsYXRlTmFtZV0pO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgIHRoaXMub3V0bGV0RGF0YVN1YnNjcmlwdGlvbnMuc2V0KG91dGxldCwgZGF0YVN1YnNjcmlwdGlvbik7XG4gIH1cbn1cbiJdfQ==