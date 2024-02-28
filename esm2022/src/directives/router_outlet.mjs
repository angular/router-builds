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
            environmentInjector: environmentInjector ?? this.environmentInjector,
        });
        // Calling `markForCheck` to make sure we will run the change detection when the
        // `RouterOutlet` is inside a `ChangeDetectionStrategy.OnPush` component.
        this.changeDetector.markForCheck();
        this.inputBinder?.bindActivatedRouteToOutletComponent(this);
        this.activateEvents.emit(this.activated.instance);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.0-next.1+sha-1519b5b", ngImport: i0, type: RouterOutlet, deps: [], target: i0.ɵɵFactoryTarget.Directive }); }
    static { this.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "17.3.0-next.1+sha-1519b5b", type: RouterOutlet, isStandalone: true, selector: "router-outlet", inputs: { name: "name" }, outputs: { activateEvents: "activate", deactivateEvents: "deactivate", attachEvents: "attach", detachEvents: "detach" }, exportAs: ["outlet"], usesOnChanges: true, ngImport: i0 }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.0-next.1+sha-1519b5b", ngImport: i0, type: RouterOutlet, decorators: [{
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.0-next.1+sha-1519b5b", ngImport: i0, type: RoutedComponentInputBinder, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.3.0-next.1+sha-1519b5b", ngImport: i0, type: RoutedComponentInputBinder }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.0-next.1+sha-1519b5b", ngImport: i0, type: RoutedComponentInputBinder, decorators: [{
            type: Injectable
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX291dGxldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFDTCxpQkFBaUIsRUFFakIsU0FBUyxFQUNULG1CQUFtQixFQUNuQixZQUFZLEVBQ1osTUFBTSxFQUNOLFVBQVUsRUFDVixjQUFjLEVBRWQsS0FBSyxFQUdMLE1BQU0sRUFDTixvQkFBb0IsRUFFcEIsZ0JBQWdCLEVBQ2hCLGFBQWEsSUFBSSxZQUFZLEdBQzlCLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBQyxhQUFhLEVBQUUsRUFBRSxFQUFlLE1BQU0sTUFBTSxDQUFDO0FBQ3JELE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUl6QyxPQUFPLEVBQUMsc0JBQXNCLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNoRSxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLFdBQVcsQ0FBQzs7QUFrR3pDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtERztBQU1ILE1BQU0sT0FBTyxZQUFZO0lBTHpCO1FBTVUsY0FBUyxHQUE2QixJQUFJLENBQUM7UUFLM0Msb0JBQWUsR0FBMEIsSUFBSSxDQUFDO1FBQ3REOzs7O1dBSUc7UUFDTSxTQUFJLEdBQUcsY0FBYyxDQUFDO1FBRVgsbUJBQWMsR0FBRyxJQUFJLFlBQVksRUFBTyxDQUFDO1FBQ3ZDLHFCQUFnQixHQUFHLElBQUksWUFBWSxFQUFPLENBQUM7UUFDakU7OztZQUdJO1FBQ2MsaUJBQVksR0FBRyxJQUFJLFlBQVksRUFBVyxDQUFDO1FBQzdEOzs7V0FHRztRQUNlLGlCQUFZ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WSxFQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUMzQyxNQUFNLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUMxRSxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFTCxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzdELENBQUM7eUhBM0RVLDBCQUEwQjs2SEFBMUIsMEJBQTBCOztzR0FBMUIsMEJBQTBCO2tCQUR0QyxVQUFVIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIENoYW5nZURldGVjdG9yUmVmLFxuICBDb21wb25lbnRSZWYsXG4gIERpcmVjdGl2ZSxcbiAgRW52aXJvbm1lbnRJbmplY3RvcixcbiAgRXZlbnRFbWl0dGVyLFxuICBpbmplY3QsXG4gIEluamVjdGFibGUsXG4gIEluamVjdGlvblRva2VuLFxuICBJbmplY3RvcixcbiAgSW5wdXQsXG4gIE9uRGVzdHJveSxcbiAgT25Jbml0LFxuICBPdXRwdXQsXG4gIHJlZmxlY3RDb21wb25lbnRUeXBlLFxuICBTaW1wbGVDaGFuZ2VzLFxuICBWaWV3Q29udGFpbmVyUmVmLFxuICDJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3IsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtjb21iaW5lTGF0ZXN0LCBvZiwgU3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzJztcbmltcG9ydCB7c3dpdGNoTWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7UnVudGltZUVycm9yQ29kZX0gZnJvbSAnLi4vZXJyb3JzJztcbmltcG9ydCB7RGF0YX0gZnJvbSAnLi4vbW9kZWxzJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0c30gZnJvbSAnLi4vcm91dGVyX291dGxldF9jb250ZXh0JztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGV9IGZyb20gJy4uL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BSSU1BUllfT1VUTEVUfSBmcm9tICcuLi9zaGFyZWQnO1xuXG4vKipcbiAqIEFuIGludGVyZmFjZSB0aGF0IGRlZmluZXMgdGhlIGNvbnRyYWN0IGZvciBkZXZlbG9waW5nIGEgY29tcG9uZW50IG91dGxldCBmb3IgdGhlIGBSb3V0ZXJgLlxuICpcbiAqIEFuIG91dGxldCBhY3RzIGFzIGEgcGxhY2Vob2xkZXIgdGhhdCBBbmd1bGFyIGR5bmFtaWNhbGx5IGZpbGxzIGJhc2VkIG9uIHRoZSBjdXJyZW50IHJvdXRlciBzdGF0ZS5cbiAqXG4gKiBBIHJvdXRlciBvdXRsZXQgc2hvdWxkIHJlZ2lzdGVyIGl0c2VsZiB3aXRoIHRoZSBgUm91dGVyYCB2aWFcbiAqIGBDaGlsZHJlbk91dGxldENvbnRleHRzI29uQ2hpbGRPdXRsZXRDcmVhdGVkYCBhbmQgdW5yZWdpc3RlciB3aXRoXG4gKiBgQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyNvbkNoaWxkT3V0bGV0RGVzdHJveWVkYC4gV2hlbiB0aGUgYFJvdXRlcmAgaWRlbnRpZmllcyBhIG1hdGNoZWQgYFJvdXRlYCxcbiAqIGl0IGxvb2tzIGZvciBhIHJlZ2lzdGVyZWQgb3V0bGV0IGluIHRoZSBgQ2hpbGRyZW5PdXRsZXRDb250ZXh0c2AgYW5kIGFjdGl2YXRlcyBpdC5cbiAqXG4gKiBAc2VlIHtAbGluayBDaGlsZHJlbk91dGxldENvbnRleHRzfVxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJvdXRlck91dGxldENvbnRyYWN0IHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGdpdmVuIG91dGxldCBpcyBhY3RpdmF0ZWQuXG4gICAqXG4gICAqIEFuIG91dGxldCBpcyBjb25zaWRlcmVkIFwiYWN0aXZhdGVkXCIgaWYgaXQgaGFzIGFuIGFjdGl2ZSBjb21wb25lbnQuXG4gICAqL1xuICBpc0FjdGl2YXRlZDogYm9vbGVhbjtcblxuICAvKiogVGhlIGluc3RhbmNlIG9mIHRoZSBhY3RpdmF0ZWQgY29tcG9uZW50IG9yIGBudWxsYCBpZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQuICovXG4gIGNvbXBvbmVudDogT2JqZWN0IHwgbnVsbDtcblxuICAvKipcbiAgICogVGhlIGBEYXRhYCBvZiB0aGUgYEFjdGl2YXRlZFJvdXRlYCBzbmFwc2hvdC5cbiAgICovXG4gIGFjdGl2YXRlZFJvdXRlRGF0YTogRGF0YTtcblxuICAvKipcbiAgICogVGhlIGBBY3RpdmF0ZWRSb3V0ZWAgZm9yIHRoZSBvdXRsZXQgb3IgYG51bGxgIGlmIHRoZSBvdXRsZXQgaXMgbm90IGFjdGl2YXRlZC5cbiAgICovXG4gIGFjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSB8IG51bGw7XG5cbiAgLyoqXG4gICAqIENhbGxlZCBieSB0aGUgYFJvdXRlcmAgd2hlbiB0aGUgb3V0bGV0IHNob3VsZCBhY3RpdmF0ZSAoY3JlYXRlIGEgY29tcG9uZW50KS5cbiAgICovXG4gIGFjdGl2YXRlV2l0aChcbiAgICBhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGUsXG4gICAgZW52aXJvbm1lbnRJbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvciB8IG51bGwsXG4gICk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIEEgcmVxdWVzdCB0byBkZXN0cm95IHRoZSBjdXJyZW50bHkgYWN0aXZhdGVkIGNvbXBvbmVudC5cbiAgICpcbiAgICogV2hlbiBhIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluZGljYXRlcyB0aGF0IGFuIGBBY3RpdmF0ZWRSb3V0ZWAgc2hvdWxkIGJlIHJlbW92ZWQgYnV0IHN0b3JlZCBmb3JcbiAgICogbGF0ZXIgcmUtdXNlIHJhdGhlciB0aGFuIGRlc3Ryb3llZCwgdGhlIGBSb3V0ZXJgIHdpbGwgY2FsbCBgZGV0YWNoYCBpbnN0ZWFkLlxuICAgKi9cbiAgZGVhY3RpdmF0ZSgpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIGRldGFjaCB0aGUgc3VidHJlZS5cbiAgICpcbiAgICogVGhpcyBpcyBzaW1pbGFyIHRvIGBkZWFjdGl2YXRlYCwgYnV0IHRoZSBhY3RpdmF0ZWQgY29tcG9uZW50IHNob3VsZCBfbm90XyBiZSBkZXN0cm95ZWQuXG4gICAqIEluc3RlYWQsIGl0IGlzIHJldHVybmVkIHNvIHRoYXQgaXQgY2FuIGJlIHJlYXR0YWNoZWQgbGF0ZXIgdmlhIHRoZSBgYXR0YWNoYCBtZXRob2QuXG4gICAqL1xuICBkZXRhY2goKTogQ29tcG9uZW50UmVmPHVua25vd24+O1xuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIHJlLWF0dGFjaCBhIHByZXZpb3VzbHkgZGV0YWNoZWQgc3VidHJlZS5cbiAgICovXG4gIGF0dGFjaChyZWY6IENvbXBvbmVudFJlZjx1bmtub3duPiwgYWN0aXZhdGVkUm91dGU6IEFjdGl2YXRlZFJvdXRlKTogdm9pZDtcblxuICAvKipcbiAgICogRW1pdHMgYW4gYWN0aXZhdGUgZXZlbnQgd2hlbiBhIG5ldyBjb21wb25lbnQgaXMgaW5zdGFudGlhdGVkXG4gICAqKi9cbiAgYWN0aXZhdGVFdmVudHM/OiBFdmVudEVtaXR0ZXI8dW5rbm93bj47XG5cbiAgLyoqXG4gICAqIEVtaXRzIGEgZGVhY3RpdmF0ZSBldmVudCB3aGVuIGEgY29tcG9uZW50IGlzIGRlc3Ryb3llZC5cbiAgICovXG4gIGRlYWN0aXZhdGVFdmVudHM/OiBFdmVudEVtaXR0ZXI8dW5rbm93bj47XG5cbiAgLyoqXG4gICAqIEVtaXRzIGFuIGF0dGFjaGVkIGNvbXBvbmVudCBpbnN0YW5jZSB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gcmUtYXR0YWNoIGFcbiAgICogcHJldmlvdXNseSBkZXRhY2hlZCBzdWJ0cmVlLlxuICAgKiovXG4gIGF0dGFjaEV2ZW50cz86IEV2ZW50RW1pdHRlcjx1bmtub3duPjtcblxuICAvKipcbiAgICogRW1pdHMgYSBkZXRhY2hlZCBjb21wb25lbnQgaW5zdGFuY2Ugd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIGRldGFjaCB0aGVcbiAgICogc3VidHJlZS5cbiAgICovXG4gIGRldGFjaEV2ZW50cz86IEV2ZW50RW1pdHRlcjx1bmtub3duPjtcblxuICAvKipcbiAgICogVXNlZCB0byBpbmRpY2F0ZSB0aGF0IHRoZSBvdXRsZXQgaXMgYWJsZSB0byBiaW5kIGRhdGEgZnJvbSB0aGUgYFJvdXRlcmAgdG8gdGhlIG91dGxldFxuICAgKiBjb21wb25lbnQncyBpbnB1dHMuXG4gICAqXG4gICAqIFdoZW4gdGhpcyBpcyBgdW5kZWZpbmVkYCBvciBgZmFsc2VgIGFuZCB0aGUgZGV2ZWxvcGVyIGhhcyBvcHRlZCBpbiB0byB0aGVcbiAgICogZmVhdHVyZSB1c2luZyBgd2l0aENvbXBvbmVudElucHV0QmluZGluZ2AsIGEgd2FybmluZyB3aWxsIGJlIGxvZ2dlZCBpbiBkZXYgbW9kZSBpZiB0aGlzIG91dGxldFxuICAgKiBpcyB1c2VkIGluIHRoZSBhcHBsaWNhdGlvbi5cbiAgICovXG4gIHJlYWRvbmx5IHN1cHBvcnRzQmluZGluZ1RvQ29tcG9uZW50SW5wdXRzPzogdHJ1ZTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBBY3RzIGFzIGEgcGxhY2Vob2xkZXIgdGhhdCBBbmd1bGFyIGR5bmFtaWNhbGx5IGZpbGxzIGJhc2VkIG9uIHRoZSBjdXJyZW50IHJvdXRlciBzdGF0ZS5cbiAqXG4gKiBFYWNoIG91dGxldCBjYW4gaGF2ZSBhIHVuaXF1ZSBuYW1lLCBkZXRlcm1pbmVkIGJ5IHRoZSBvcHRpb25hbCBgbmFtZWAgYXR0cmlidXRlLlxuICogVGhlIG5hbWUgY2Fubm90IGJlIHNldCBvciBjaGFuZ2VkIGR5bmFtaWNhbGx5LiBJZiBub3Qgc2V0LCBkZWZhdWx0IHZhbHVlIGlzIFwicHJpbWFyeVwiLlxuICpcbiAqIGBgYFxuICogPHJvdXRlci1vdXRsZXQ+PC9yb3V0ZXItb3V0bGV0PlxuICogPHJvdXRlci1vdXRsZXQgbmFtZT0nbGVmdCc+PC9yb3V0ZXItb3V0bGV0PlxuICogPHJvdXRlci1vdXRsZXQgbmFtZT0ncmlnaHQnPjwvcm91dGVyLW91dGxldD5cbiAqIGBgYFxuICpcbiAqIE5hbWVkIG91dGxldHMgY2FuIGJlIHRoZSB0YXJnZXRzIG9mIHNlY29uZGFyeSByb3V0ZXMuXG4gKiBUaGUgYFJvdXRlYCBvYmplY3QgZm9yIGEgc2Vjb25kYXJ5IHJvdXRlIGhhcyBhbiBgb3V0bGV0YCBwcm9wZXJ0eSB0byBpZGVudGlmeSB0aGUgdGFyZ2V0IG91dGxldDpcbiAqXG4gKiBge3BhdGg6IDxiYXNlLXBhdGg+LCBjb21wb25lbnQ6IDxjb21wb25lbnQ+LCBvdXRsZXQ6IDx0YXJnZXRfb3V0bGV0X25hbWU+fWBcbiAqXG4gKiBVc2luZyBuYW1lZCBvdXRsZXRzIGFuZCBzZWNvbmRhcnkgcm91dGVzLCB5b3UgY2FuIHRhcmdldCBtdWx0aXBsZSBvdXRsZXRzIGluXG4gKiB0aGUgc2FtZSBgUm91dGVyTGlua2AgZGlyZWN0aXZlLlxuICpcbiAqIFRoZSByb3V0ZXIga2VlcHMgdHJhY2sgb2Ygc2VwYXJhdGUgYnJhbmNoZXMgaW4gYSBuYXZpZ2F0aW9uIHRyZWUgZm9yIGVhY2ggbmFtZWQgb3V0bGV0IGFuZFxuICogZ2VuZXJhdGVzIGEgcmVwcmVzZW50YXRpb24gb2YgdGhhdCB0cmVlIGluIHRoZSBVUkwuXG4gKiBUaGUgVVJMIGZvciBhIHNlY29uZGFyeSByb3V0ZSB1c2VzIHRoZSBmb2xsb3dpbmcgc3ludGF4IHRvIHNwZWNpZnkgYm90aCB0aGUgcHJpbWFyeSBhbmQgc2Vjb25kYXJ5XG4gKiByb3V0ZXMgYXQgdGhlIHNhbWUgdGltZTpcbiAqXG4gKiBgaHR0cDovL2Jhc2UtcGF0aC9wcmltYXJ5LXJvdXRlLXBhdGgob3V0bGV0LW5hbWU6cm91dGUtcGF0aClgXG4gKlxuICogQSByb3V0ZXIgb3V0bGV0IGVtaXRzIGFuIGFjdGl2YXRlIGV2ZW50IHdoZW4gYSBuZXcgY29tcG9uZW50IGlzIGluc3RhbnRpYXRlZCxcbiAqIGRlYWN0aXZhdGUgZXZlbnQgd2hlbiBhIGNvbXBvbmVudCBpcyBkZXN0cm95ZWQuXG4gKiBBbiBhdHRhY2hlZCBldmVudCBlbWl0cyB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdGhlIG91dGxldCB0byByZWF0dGFjaCB0aGVcbiAqIHN1YnRyZWUsIGFuZCB0aGUgZGV0YWNoZWQgZXZlbnQgZW1pdHMgd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRoZSBvdXRsZXQgdG9cbiAqIGRldGFjaCB0aGUgc3VidHJlZS5cbiAqXG4gKiBgYGBcbiAqIDxyb3V0ZXItb3V0bGV0XG4gKiAgIChhY3RpdmF0ZSk9J29uQWN0aXZhdGUoJGV2ZW50KSdcbiAqICAgKGRlYWN0aXZhdGUpPSdvbkRlYWN0aXZhdGUoJGV2ZW50KSdcbiAqICAgKGF0dGFjaCk9J29uQXR0YWNoKCRldmVudCknXG4gKiAgIChkZXRhY2gpPSdvbkRldGFjaCgkZXZlbnQpJz48L3JvdXRlci1vdXRsZXQ+XG4gKiBgYGBcbiAqXG4gKiBAc2VlIFtSb3V0aW5nIHR1dG9yaWFsXShndWlkZS9yb3V0ZXItdHV0b3JpYWwtdG9oI25hbWVkLW91dGxldHMgXCJFeGFtcGxlIG9mIGEgbmFtZWRcbiAqIG91dGxldCBhbmQgc2Vjb25kYXJ5IHJvdXRlIGNvbmZpZ3VyYXRpb25cIikuXG4gKiBAc2VlIHtAbGluayBSb3V0ZXJMaW5rfVxuICogQHNlZSB7QGxpbmsgUm91dGV9XG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ARGlyZWN0aXZlKHtcbiAgc2VsZWN0b3I6ICdyb3V0ZXItb3V0bGV0JyxcbiAgZXhwb3J0QXM6ICdvdXRsZXQnLFxuICBzdGFuZGFsb25lOiB0cnVlLFxufSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJPdXRsZXQgaW1wbGVtZW50cyBPbkRlc3Ryb3ksIE9uSW5pdCwgUm91dGVyT3V0bGV0Q29udHJhY3Qge1xuICBwcml2YXRlIGFjdGl2YXRlZDogQ29tcG9uZW50UmVmPGFueT4gfCBudWxsID0gbnVsbDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBnZXQgYWN0aXZhdGVkQ29tcG9uZW50UmVmKCk6IENvbXBvbmVudFJlZjxhbnk+IHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuYWN0aXZhdGVkO1xuICB9XG4gIHByaXZhdGUgX2FjdGl2YXRlZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSB8IG51bGwgPSBudWxsO1xuICAvKipcbiAgICogVGhlIG5hbWUgb2YgdGhlIG91dGxldFxuICAgKlxuICAgKiBAc2VlIFtuYW1lZCBvdXRsZXRzXShndWlkZS9yb3V0ZXItdHV0b3JpYWwtdG9oI2Rpc3BsYXlpbmctbXVsdGlwbGUtcm91dGVzLWluLW5hbWVkLW91dGxldHMpXG4gICAqL1xuICBASW5wdXQoKSBuYW1lID0gUFJJTUFSWV9PVVRMRVQ7XG5cbiAgQE91dHB1dCgnYWN0aXZhdGUnKSBhY3RpdmF0ZUV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpO1xuICBAT3V0cHV0KCdkZWFjdGl2YXRlJykgZGVhY3RpdmF0ZUV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXI8YW55PigpO1xuICAvKipcbiAgICogRW1pdHMgYW4gYXR0YWNoZWQgY29tcG9uZW50IGluc3RhbmNlIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byByZS1hdHRhY2ggYVxuICAgKiBwcmV2aW91c2x5IGRldGFjaGVkIHN1YnRyZWUuXG4gICAqKi9cbiAgQE91dHB1dCgnYXR0YWNoJykgYXR0YWNoRXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjx1bmtub3duPigpO1xuICAvKipcbiAgICogRW1pdHMgYSBkZXRhY2hlZCBjb21wb25lbnQgaW5zdGFuY2Ugd2hlbiB0aGUgYFJvdXRlUmV1c2VTdHJhdGVneWAgaW5zdHJ1Y3RzIHRvIGRldGFjaCB0aGVcbiAgICogc3VidHJlZS5cbiAgICovXG4gIEBPdXRwdXQoJ2RldGFjaCcpIGRldGFjaEV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXI8dW5rbm93bj4oKTtcblxuICBwcml2YXRlIHBhcmVudENvbnRleHRzID0gaW5qZWN0KENoaWxkcmVuT3V0bGV0Q29udGV4dHMpO1xuICBwcml2YXRlIGxvY2F0aW9uID0gaW5qZWN0KFZpZXdDb250YWluZXJSZWYpO1xuICBwcml2YXRlIGNoYW5nZURldGVjdG9yID0gaW5qZWN0KENoYW5nZURldGVjdG9yUmVmKTtcbiAgcHJpdmF0ZSBlbnZpcm9ubWVudEluamVjdG9yID0gaW5qZWN0KEVudmlyb25tZW50SW5qZWN0b3IpO1xuICBwcml2YXRlIGlucHV0QmluZGVyID0gaW5qZWN0KElOUFVUX0JJTkRFUiwge29wdGlvbmFsOiB0cnVlfSk7XG4gIC8qKiBAbm9kb2MgKi9cbiAgcmVhZG9ubHkgc3VwcG9ydHNCaW5kaW5nVG9Db21wb25lbnRJbnB1dHMgPSB0cnVlO1xuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcykge1xuICAgIGlmIChjaGFuZ2VzWyduYW1lJ10pIHtcbiAgICAgIGNvbnN0IHtmaXJzdENoYW5nZSwgcHJldmlvdXNWYWx1ZX0gPSBjaGFuZ2VzWyduYW1lJ107XG4gICAgICBpZiAoZmlyc3RDaGFuZ2UpIHtcbiAgICAgICAgLy8gVGhlIGZpcnN0IGNoYW5nZSBpcyBoYW5kbGVkIGJ5IG5nT25Jbml0LiBCZWNhdXNlIG5nT25DaGFuZ2VzIGRvZXNuJ3QgZ2V0IGNhbGxlZCB3aGVuIG5vXG4gICAgICAgIC8vIGlucHV0IGlzIHNldCBhdCBhbGwsIHdlIG5lZWQgdG8gY2VudHJhbGx5IGhhbmRsZSB0aGUgZmlyc3QgY2hhbmdlIHRoZXJlLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIHVucmVnaXN0ZXIgd2l0aCB0aGUgb2xkIG5hbWVcbiAgICAgIGlmICh0aGlzLmlzVHJhY2tlZEluUGFyZW50Q29udGV4dHMocHJldmlvdXNWYWx1ZSkpIHtcbiAgICAgICAgdGhpcy5kZWFjdGl2YXRlKCk7XG4gICAgICAgIHRoaXMucGFyZW50Q29udGV4dHMub25DaGlsZE91dGxldERlc3Ryb3llZChwcmV2aW91c1ZhbHVlKTtcbiAgICAgIH1cbiAgICAgIC8vIHJlZ2lzdGVyIHRoZSBuZXcgbmFtZVxuICAgICAgdGhpcy5pbml0aWFsaXplT3V0bGV0V2l0aE5hbWUoKTtcbiAgICB9XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIC8vIEVuc3VyZSB0aGF0IHRoZSByZWdpc3RlcmVkIG91dGxldCBpcyB0aGlzIG9uZSBiZWZvcmUgcmVtb3ZpbmcgaXQgb24gdGhlIGNvbnRleHQuXG4gICAgaWYgKHRoaXMuaXNUcmFja2VkSW5QYXJlbnRDb250ZXh0cyh0aGlzLm5hbWUpKSB7XG4gICAgICB0aGlzLnBhcmVudENvbnRleHRzLm9uQ2hpbGRPdXRsZXREZXN0cm95ZWQodGhpcy5uYW1lKTtcbiAgICB9XG4gICAgdGhpcy5pbnB1dEJpbmRlcj8udW5zdWJzY3JpYmVGcm9tUm91dGVEYXRhKHRoaXMpO1xuICB9XG5cbiAgcHJpdmF0ZSBpc1RyYWNrZWRJblBhcmVudENvbnRleHRzKG91dGxldE5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiB0aGlzLnBhcmVudENvbnRleHRzLmdldENvbnRleHQob3V0bGV0TmFtZSk/Lm91dGxldCA9PT0gdGhpcztcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkluaXQoKTogdm9pZCB7XG4gICAgdGhpcy5pbml0aWFsaXplT3V0bGV0V2l0aE5hbWUoKTtcbiAgfVxuXG4gIHByaXZhdGUgaW5pdGlhbGl6ZU91dGxldFdpdGhOYW1lKCkge1xuICAgIHRoaXMucGFyZW50Q29udGV4dHMub25DaGlsZE91dGxldENyZWF0ZWQodGhpcy5uYW1lLCB0aGlzKTtcbiAgICBpZiAodGhpcy5hY3RpdmF0ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgb3V0bGV0IHdhcyBub3QgaW5zdGFudGlhdGVkIGF0IHRoZSB0aW1lIHRoZSByb3V0ZSBnb3QgYWN0aXZhdGVkIHdlIG5lZWQgdG8gcG9wdWxhdGVcbiAgICAvLyB0aGUgb3V0bGV0IHdoZW4gaXQgaXMgaW5pdGlhbGl6ZWQgKGllIGluc2lkZSBhIE5nSWYpXG4gICAgY29uc3QgY29udGV4dCA9IHRoaXMucGFyZW50Q29udGV4dHMuZ2V0Q29udGV4dCh0aGlzLm5hbWUpO1xuICAgIGlmIChjb250ZXh0Py5yb3V0ZSkge1xuICAgICAgaWYgKGNvbnRleHQuYXR0YWNoUmVmKSB7XG4gICAgICAgIC8vIGBhdHRhY2hSZWZgIGlzIHBvcHVsYXRlZCB3aGVuIHRoZXJlIGlzIGFuIGV4aXN0aW5nIGNvbXBvbmVudCB0byBtb3VudFxuICAgICAgICB0aGlzLmF0dGFjaChjb250ZXh0LmF0dGFjaFJlZiwgY29udGV4dC5yb3V0ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBvdGhlcndpc2UgdGhlIGNvbXBvbmVudCBkZWZpbmVkIGluIHRoZSBjb25maWd1cmF0aW9uIGlzIGNyZWF0ZWRcbiAgICAgICAgdGhpcy5hY3RpdmF0ZVdpdGgoY29udGV4dC5yb3V0ZSwgY29udGV4dC5pbmplY3Rvcik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0IGlzQWN0aXZhdGVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXRoaXMuYWN0aXZhdGVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm5zIFRoZSBjdXJyZW50bHkgYWN0aXZhdGVkIGNvbXBvbmVudCBpbnN0YW5jZS5cbiAgICogQHRocm93cyBBbiBlcnJvciBpZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQuXG4gICAqL1xuICBnZXQgY29tcG9uZW50KCk6IE9iamVjdCB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZClcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuT1VUTEVUX05PVF9BQ1RJVkFURUQsXG4gICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmICdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcsXG4gICAgICApO1xuICAgIHJldHVybiB0aGlzLmFjdGl2YXRlZC5pbnN0YW5jZTtcbiAgfVxuXG4gIGdldCBhY3RpdmF0ZWRSb3V0ZSgpOiBBY3RpdmF0ZWRSb3V0ZSB7XG4gICAgaWYgKCF0aGlzLmFjdGl2YXRlZClcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuT1VUTEVUX05PVF9BQ1RJVkFURUQsXG4gICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmICdPdXRsZXQgaXMgbm90IGFjdGl2YXRlZCcsXG4gICAgICApO1xuICAgIHJldHVybiB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSBhcyBBY3RpdmF0ZWRSb3V0ZTtcbiAgfVxuXG4gIGdldCBhY3RpdmF0ZWRSb3V0ZURhdGEoKTogRGF0YSB7XG4gICAgaWYgKHRoaXMuX2FjdGl2YXRlZFJvdXRlKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWN0aXZhdGVkUm91dGUuc25hcHNob3QuZGF0YTtcbiAgICB9XG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBgUm91dGVSZXVzZVN0cmF0ZWd5YCBpbnN0cnVjdHMgdG8gZGV0YWNoIHRoZSBzdWJ0cmVlXG4gICAqL1xuICBkZXRhY2goKTogQ29tcG9uZW50UmVmPGFueT4ge1xuICAgIGlmICghdGhpcy5hY3RpdmF0ZWQpXG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICBSdW50aW1lRXJyb3JDb2RlLk9VVExFVF9OT1RfQUNUSVZBVEVELFxuICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJiAnT3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQnLFxuICAgICAgKTtcbiAgICB0aGlzLmxvY2F0aW9uLmRldGFjaCgpO1xuICAgIGNvbnN0IGNtcCA9IHRoaXMuYWN0aXZhdGVkO1xuICAgIHRoaXMuYWN0aXZhdGVkID0gbnVsbDtcbiAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IG51bGw7XG4gICAgdGhpcy5kZXRhY2hFdmVudHMuZW1pdChjbXAuaW5zdGFuY2UpO1xuICAgIHJldHVybiBjbXA7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIGBSb3V0ZVJldXNlU3RyYXRlZ3lgIGluc3RydWN0cyB0byByZS1hdHRhY2ggYSBwcmV2aW91c2x5IGRldGFjaGVkIHN1YnRyZWVcbiAgICovXG4gIGF0dGFjaChyZWY6IENvbXBvbmVudFJlZjxhbnk+LCBhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGUpIHtcbiAgICB0aGlzLmFjdGl2YXRlZCA9IHJlZjtcbiAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IGFjdGl2YXRlZFJvdXRlO1xuICAgIHRoaXMubG9jYXRpb24uaW5zZXJ0KHJlZi5ob3N0Vmlldyk7XG4gICAgdGhpcy5pbnB1dEJpbmRlcj8uYmluZEFjdGl2YXRlZFJvdXRlVG9PdXRsZXRDb21wb25lbnQodGhpcyk7XG4gICAgdGhpcy5hdHRhY2hFdmVudHMuZW1pdChyZWYuaW5zdGFuY2UpO1xuICB9XG5cbiAgZGVhY3RpdmF0ZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5hY3RpdmF0ZWQpIHtcbiAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbXBvbmVudDtcbiAgICAgIHRoaXMuYWN0aXZhdGVkLmRlc3Ryb3koKTtcbiAgICAgIHRoaXMuYWN0aXZhdGVkID0gbnVsbDtcbiAgICAgIHRoaXMuX2FjdGl2YXRlZFJvdXRlID0gbnVsbDtcbiAgICAgIHRoaXMuZGVhY3RpdmF0ZUV2ZW50cy5lbWl0KGMpO1xuICAgIH1cbiAgfVxuXG4gIGFjdGl2YXRlV2l0aChhY3RpdmF0ZWRSb3V0ZTogQWN0aXZhdGVkUm91dGUsIGVudmlyb25tZW50SW5qZWN0b3I/OiBFbnZpcm9ubWVudEluamVjdG9yIHwgbnVsbCkge1xuICAgIGlmICh0aGlzLmlzQWN0aXZhdGVkKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICBSdW50aW1lRXJyb3JDb2RlLk9VVExFVF9BTFJFQURZX0FDVElWQVRFRCxcbiAgICAgICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiZcbiAgICAgICAgICAnQ2Fubm90IGFjdGl2YXRlIGFuIGFscmVhZHkgYWN0aXZhdGVkIG91dGxldCcsXG4gICAgICApO1xuICAgIH1cbiAgICB0aGlzLl9hY3RpdmF0ZWRSb3V0ZSA9IGFjdGl2YXRlZFJvdXRlO1xuICAgIGNvbnN0IGxvY2F0aW9uID0gdGhpcy5sb2NhdGlvbjtcbiAgICBjb25zdCBzbmFwc2hvdCA9IGFjdGl2YXRlZFJvdXRlLnNuYXBzaG90O1xuICAgIGNvbnN0IGNvbXBvbmVudCA9IHNuYXBzaG90LmNvbXBvbmVudCE7XG4gICAgY29uc3QgY2hpbGRDb250ZXh0cyA9IHRoaXMucGFyZW50Q29udGV4dHMuZ2V0T3JDcmVhdGVDb250ZXh0KHRoaXMubmFtZSkuY2hpbGRyZW47XG4gICAgY29uc3QgaW5qZWN0b3IgPSBuZXcgT3V0bGV0SW5qZWN0b3IoYWN0aXZhdGVkUm91dGUsIGNoaWxkQ29udGV4dHMsIGxvY2F0aW9uLmluamVjdG9yKTtcblxuICAgIHRoaXMuYWN0aXZhdGVkID0gbG9jYXRpb24uY3JlYXRlQ29tcG9uZW50KGNvbXBvbmVudCwge1xuICAgICAgaW5kZXg6IGxvY2F0aW9uLmxlbmd0aCxcbiAgICAgIGluamVjdG9yLFxuICAgICAgZW52aXJvbm1lbnRJbmplY3RvcjogZW52aXJvbm1lbnRJbmplY3RvciA/PyB0aGlzLmVudmlyb25tZW50SW5qZWN0b3IsXG4gICAgfSk7XG4gICAgLy8gQ2FsbGluZyBgbWFya0ZvckNoZWNrYCB0byBtYWtlIHN1cmUgd2Ugd2lsbCBydW4gdGhlIGNoYW5nZSBkZXRlY3Rpb24gd2hlbiB0aGVcbiAgICAvLyBgUm91dGVyT3V0bGV0YCBpcyBpbnNpZGUgYSBgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoYCBjb21wb25lbnQuXG4gICAgdGhpcy5jaGFuZ2VEZXRlY3Rvci5tYXJrRm9yQ2hlY2soKTtcbiAgICB0aGlzLmlucHV0QmluZGVyPy5iaW5kQWN0aXZhdGVkUm91dGVUb091dGxldENvbXBvbmVudCh0aGlzKTtcbiAgICB0aGlzLmFjdGl2YXRlRXZlbnRzLmVtaXQodGhpcy5hY3RpdmF0ZWQuaW5zdGFuY2UpO1xuICB9XG59XG5cbmNsYXNzIE91dGxldEluamVjdG9yIGltcGxlbWVudHMgSW5qZWN0b3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSxcbiAgICBwcml2YXRlIGNoaWxkQ29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsXG4gICAgcHJpdmF0ZSBwYXJlbnQ6IEluamVjdG9yLFxuICApIHt9XG5cbiAgZ2V0KHRva2VuOiBhbnksIG5vdEZvdW5kVmFsdWU/OiBhbnkpOiBhbnkge1xuICAgIGlmICh0b2tlbiA9PT0gQWN0aXZhdGVkUm91dGUpIHtcbiAgICAgIHJldHVybiB0aGlzLnJvdXRlO1xuICAgIH1cblxuICAgIGlmICh0b2tlbiA9PT0gQ2hpbGRyZW5PdXRsZXRDb250ZXh0cykge1xuICAgICAgcmV0dXJuIHRoaXMuY2hpbGRDb250ZXh0cztcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5wYXJlbnQuZ2V0KHRva2VuLCBub3RGb3VuZFZhbHVlKTtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgSU5QVVRfQklOREVSID0gbmV3IEluamVjdGlvblRva2VuPFJvdXRlZENvbXBvbmVudElucHV0QmluZGVyPignJyk7XG5cbi8qKlxuICogSW5qZWN0YWJsZSB1c2VkIGFzIGEgdHJlZS1zaGFrYWJsZSBwcm92aWRlciBmb3Igb3B0aW5nIGluIHRvIGJpbmRpbmcgcm91dGVyIGRhdGEgdG8gY29tcG9uZW50XG4gKiBpbnB1dHMuXG4gKlxuICogVGhlIFJvdXRlck91dGxldCByZWdpc3RlcnMgaXRzZWxmIHdpdGggdGhpcyBzZXJ2aWNlIHdoZW4gYW4gYEFjdGl2YXRlZFJvdXRlYCBpcyBhdHRhY2hlZCBvclxuICogYWN0aXZhdGVkLiBXaGVuIHRoaXMgaGFwcGVucywgdGhlIHNlcnZpY2Ugc3Vic2NyaWJlcyB0byB0aGUgYEFjdGl2YXRlZFJvdXRlYCBvYnNlcnZhYmxlcyAocGFyYW1zLFxuICogcXVlcnlQYXJhbXMsIGRhdGEpIGFuZCBzZXRzIHRoZSBpbnB1dHMgb2YgdGhlIGNvbXBvbmVudCB1c2luZyBgQ29tcG9uZW50UmVmLnNldElucHV0YC5cbiAqIEltcG9ydGFudGx5LCB3aGVuIGFuIGlucHV0IGRvZXMgbm90IGhhdmUgYW4gaXRlbSBpbiB0aGUgcm91dGUgZGF0YSB3aXRoIGEgbWF0Y2hpbmcga2V5LCB0aGlzXG4gKiBpbnB1dCBpcyBzZXQgdG8gYHVuZGVmaW5lZGAuIElmIGl0IHdlcmUgbm90IGRvbmUgdGhpcyB3YXksIHRoZSBwcmV2aW91cyBpbmZvcm1hdGlvbiB3b3VsZCBiZVxuICogcmV0YWluZWQgaWYgdGhlIGRhdGEgZ290IHJlbW92ZWQgZnJvbSB0aGUgcm91dGUgKGkuZS4gaWYgYSBxdWVyeSBwYXJhbWV0ZXIgaXMgcmVtb3ZlZCkuXG4gKlxuICogVGhlIGBSb3V0ZXJPdXRsZXRgIHNob3VsZCB1bnJlZ2lzdGVyIGl0c2VsZiB3aGVuIGRlc3Ryb3llZCB2aWEgYHVuc3Vic2NyaWJlRnJvbVJvdXRlRGF0YWAgc28gdGhhdFxuICogdGhlIHN1YnNjcmlwdGlvbnMgYXJlIGNsZWFuZWQgdXAuXG4gKi9cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBSb3V0ZWRDb21wb25lbnRJbnB1dEJpbmRlciB7XG4gIHByaXZhdGUgb3V0bGV0RGF0YVN1YnNjcmlwdGlvbnMgPSBuZXcgTWFwPFJvdXRlck91dGxldCwgU3Vic2NyaXB0aW9uPigpO1xuXG4gIGJpbmRBY3RpdmF0ZWRSb3V0ZVRvT3V0bGV0Q29tcG9uZW50KG91dGxldDogUm91dGVyT3V0bGV0KSB7XG4gICAgdGhpcy51bnN1YnNjcmliZUZyb21Sb3V0ZURhdGEob3V0bGV0KTtcbiAgICB0aGlzLnN1YnNjcmliZVRvUm91dGVEYXRhKG91dGxldCk7XG4gIH1cblxuICB1bnN1YnNjcmliZUZyb21Sb3V0ZURhdGEob3V0bGV0OiBSb3V0ZXJPdXRsZXQpIHtcbiAgICB0aGlzLm91dGxldERhdGFTdWJzY3JpcHRpb25zLmdldChvdXRsZXQpPy51bnN1YnNjcmliZSgpO1xuICAgIHRoaXMub3V0bGV0RGF0YVN1YnNjcmlwdGlvbnMuZGVsZXRlKG91dGxldCk7XG4gIH1cblxuICBwcml2YXRlIHN1YnNjcmliZVRvUm91dGVEYXRhKG91dGxldDogUm91dGVyT3V0bGV0KSB7XG4gICAgY29uc3Qge2FjdGl2YXRlZFJvdXRlfSA9IG91dGxldDtcbiAgICBjb25zdCBkYXRhU3Vic2NyaXB0aW9uID0gY29tYmluZUxhdGVzdChbXG4gICAgICBhY3RpdmF0ZWRSb3V0ZS5xdWVyeVBhcmFtcyxcbiAgICAgIGFjdGl2YXRlZFJvdXRlLnBhcmFtcyxcbiAgICAgIGFjdGl2YXRlZFJvdXRlLmRhdGEsXG4gICAgXSlcbiAgICAgIC5waXBlKFxuICAgICAgICBzd2l0Y2hNYXAoKFtxdWVyeVBhcmFtcywgcGFyYW1zLCBkYXRhXSwgaW5kZXgpID0+IHtcbiAgICAgICAgICBkYXRhID0gey4uLnF1ZXJ5UGFyYW1zLCAuLi5wYXJhbXMsIC4uLmRhdGF9O1xuICAgICAgICAgIC8vIEdldCB0aGUgZmlyc3QgcmVzdWx0IGZyb20gdGhlIGRhdGEgc3Vic2NyaXB0aW9uIHN5bmNocm9ub3VzbHkgc28gaXQncyBhdmFpbGFibGUgdG9cbiAgICAgICAgICAvLyB0aGUgY29tcG9uZW50IGFzIHNvb24gYXMgcG9zc2libGUgKGFuZCBkb2Vzbid0IHJlcXVpcmUgYSBzZWNvbmQgY2hhbmdlIGRldGVjdGlvbikuXG4gICAgICAgICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gb2YoZGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFByb21pc2UucmVzb2x2ZSBpcyB1c2VkIHRvIGF2b2lkIHN5bmNocm9ub3VzbHkgd3JpdGluZyB0aGUgd3JvbmcgZGF0YSB3aGVuXG4gICAgICAgICAgLy8gdHdvIG9mIHRoZSBPYnNlcnZhYmxlcyBpbiB0aGUgYGNvbWJpbmVMYXRlc3RgIHN0cmVhbSBlbWl0IG9uZSBhZnRlclxuICAgICAgICAgIC8vIGFub3RoZXIuXG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShkYXRhKTtcbiAgICAgICAgfSksXG4gICAgICApXG4gICAgICAuc3Vic2NyaWJlKChkYXRhKSA9PiB7XG4gICAgICAgIC8vIE91dGxldCBtYXkgaGF2ZSBiZWVuIGRlYWN0aXZhdGVkIG9yIGNoYW5nZWQgbmFtZXMgdG8gYmUgYXNzb2NpYXRlZCB3aXRoIGEgZGlmZmVyZW50XG4gICAgICAgIC8vIHJvdXRlXG4gICAgICAgIGlmIChcbiAgICAgICAgICAhb3V0bGV0LmlzQWN0aXZhdGVkIHx8XG4gICAgICAgICAgIW91dGxldC5hY3RpdmF0ZWRDb21wb25lbnRSZWYgfHxcbiAgICAgICAgICBvdXRsZXQuYWN0aXZhdGVkUm91dGUgIT09IGFjdGl2YXRlZFJvdXRlIHx8XG4gICAgICAgICAgYWN0aXZhdGVkUm91dGUuY29tcG9uZW50ID09PSBudWxsXG4gICAgICAgICkge1xuICAgICAgICAgIHRoaXMudW5zdWJzY3JpYmVGcm9tUm91dGVEYXRhKG91dGxldCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWlycm9yID0gcmVmbGVjdENvbXBvbmVudFR5cGUoYWN0aXZhdGVkUm91dGUuY29tcG9uZW50KTtcbiAgICAgICAgaWYgKCFtaXJyb3IpIHtcbiAgICAgICAgICB0aGlzLnVuc3Vic2NyaWJlRnJvbVJvdXRlRGF0YShvdXRsZXQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3Qge3RlbXBsYXRlTmFtZX0gb2YgbWlycm9yLmlucHV0cykge1xuICAgICAgICAgIG91dGxldC5hY3RpdmF0ZWRDb21wb25lbnRSZWYuc2V0SW5wdXQodGVtcGxhdGVOYW1lLCBkYXRhW3RlbXBsYXRlTmFtZV0pO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgIHRoaXMub3V0bGV0RGF0YVN1YnNjcmlwdGlvbnMuc2V0KG91dGxldCwgZGF0YVN1YnNjcmlwdGlvbik7XG4gIH1cbn1cbiJdfQ==