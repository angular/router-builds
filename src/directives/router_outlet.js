/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Attribute, ComponentFactoryResolver, Directive, EventEmitter, Output, ReflectiveInjector, ViewContainerRef } from '@angular/core/index';
import { RouterOutletMap } from '../router_outlet_map';
import { PRIMARY_OUTLET } from '../shared';
/**
 * \@whatItDoes Acts as a placeholder that Angular dynamically fills based on the current router
 * state.
 *
 * \@howToUse
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
 * \@selector 'a[routerLink]'
 * \@ngModule RouterModule
 *
 * \@stable
 */
export class RouterOutlet {
    /**
     * @param {?} parentOutletMap
     * @param {?} location
     * @param {?} resolver
     * @param {?} name
     */
    constructor(parentOutletMap, location, resolver, name) {
        this.parentOutletMap = parentOutletMap;
        this.location = location;
        this.resolver = resolver;
        this.name = name;
        this.activateEvents = new EventEmitter();
        this.deactivateEvents = new EventEmitter();
        parentOutletMap.registerOutlet(name ? name : PRIMARY_OUTLET, this);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() { this.parentOutletMap.removeOutlet(this.name ? this.name : PRIMARY_OUTLET); }
    /**
     * @return {?}
     */
    get locationInjector() { return this.location.injector; }
    /**
     * @return {?}
     */
    get locationFactoryResolver() { return this.resolver; }
    /**
     * @return {?}
     */
    get isActivated() { return !!this.activated; }
    /**
     * @return {?}
     */
    get component() {
        if (!this.activated)
            throw new Error('Outlet is not activated');
        return this.activated.instance;
    }
    /**
     * @return {?}
     */
    get activatedRoute() {
        if (!this.activated)
            throw new Error('Outlet is not activated');
        return this._activatedRoute;
    }
    /**
     * @return {?}
     */
    detach() {
        if (!this.activated)
            throw new Error('Outlet is not activated');
        this.location.detach();
        const /** @type {?} */ r = this.activated;
        this.activated = null;
        this._activatedRoute = null;
        return r;
    }
    /**
     * @param {?} ref
     * @param {?} activatedRoute
     * @return {?}
     */
    attach(ref, activatedRoute) {
        this.activated = ref;
        this._activatedRoute = activatedRoute;
        this.location.insert(ref.hostView);
    }
    /**
     * @return {?}
     */
    deactivate() {
        if (this.activated) {
            const /** @type {?} */ c = this.component;
            this.activated.destroy();
            this.activated = null;
            this._activatedRoute = null;
            this.deactivateEvents.emit(c);
        }
    }
    /**
     * @param {?} activatedRoute
     * @param {?} resolver
     * @param {?} injector
     * @param {?} providers
     * @param {?} outletMap
     * @return {?}
     */
    activate(activatedRoute, resolver, injector, providers, outletMap) {
        if (this.isActivated) {
            throw new Error('Cannot activate an already activated outlet');
        }
        this.outletMap = outletMap;
        this._activatedRoute = activatedRoute;
        const /** @type {?} */ snapshot = activatedRoute._futureSnapshot;
        const /** @type {?} */ component = (snapshot._routeConfig.component);
        const /** @type {?} */ factory = resolver.resolveComponentFactory(component);
        const /** @type {?} */ inj = ReflectiveInjector.fromResolvedProviders(providers, injector);
        this.activated = this.location.createComponent(factory, this.location.length, inj, []);
        this.activated.changeDetectorRef.detectChanges();
        this.activateEvents.emit(this.activated.instance);
    }
}
RouterOutlet.decorators = [
    { type: Directive, args: [{ selector: 'router-outlet' },] },
];
/** @nocollapse */
RouterOutlet.ctorParameters = () => [
    { type: RouterOutletMap, },
    { type: ViewContainerRef, },
    { type: ComponentFactoryResolver, },
    { type: undefined, decorators: [{ type: Attribute, args: ['name',] },] },
];
RouterOutlet.propDecorators = {
    'activateEvents': [{ type: Output, args: ['activate',] },],
    'deactivateEvents': [{ type: Output, args: ['deactivate',] },],
};
function RouterOutlet_tsickle_Closure_declarations() {
    /** @type {?} */
    RouterOutlet.decorators;
    /**
     * @nocollapse
     * @type {?}
     */
    RouterOutlet.ctorParameters;
    /** @type {?} */
    RouterOutlet.propDecorators;
    /** @type {?} */
    RouterOutlet.prototype.activated;
    /** @type {?} */
    RouterOutlet.prototype._activatedRoute;
    /** @type {?} */
    RouterOutlet.prototype.outletMap;
    /** @type {?} */
    RouterOutlet.prototype.activateEvents;
    /** @type {?} */
    RouterOutlet.prototype.deactivateEvents;
    /** @type {?} */
    RouterOutlet.prototype.parentOutletMap;
    /** @type {?} */
    RouterOutlet.prototype.location;
    /** @type {?} */
    RouterOutlet.prototype.resolver;
    /** @type {?} */
    RouterOutlet.prototype.name;
}
//# sourceMappingURL=router_outlet.js.map