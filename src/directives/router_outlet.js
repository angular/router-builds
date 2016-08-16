/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
"use strict";
var core_1 = require('@angular/core');
var router_outlet_map_1 = require('../router_outlet_map');
var shared_1 = require('../shared');
var RouterOutlet = (function () {
    function RouterOutlet(parentOutletMap, location, resolver, name) {
        this.parentOutletMap = parentOutletMap;
        this.location = location;
        this.resolver = resolver;
        this.name = name;
        this.activateEvents = new core_1.EventEmitter();
        this.deactivateEvents = new core_1.EventEmitter();
        parentOutletMap.registerOutlet(name ? name : shared_1.PRIMARY_OUTLET, this);
    }
    RouterOutlet.prototype.ngOnDestroy = function () { this.parentOutletMap.removeOutlet(this.name ? this.name : shared_1.PRIMARY_OUTLET); };
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
    RouterOutlet.prototype.deactivate = function () {
        if (this.activated) {
            var c = this.component;
            this.activated.destroy();
            this.activated = null;
            this.deactivateEvents.emit(c);
        }
    };
    RouterOutlet.prototype.activate = function (activatedRoute, loadedResolver, loadedInjector, providers, outletMap) {
        this.outletMap = outletMap;
        this._activatedRoute = activatedRoute;
        var snapshot = activatedRoute._futureSnapshot;
        var component = snapshot._routeConfig.component;
        var factory;
        if (loadedResolver) {
            factory = loadedResolver.resolveComponentFactory(component);
        }
        else {
            factory = this.resolver.resolveComponentFactory(component);
        }
        var injector = loadedInjector ? loadedInjector : this.location.parentInjector;
        var inj = core_1.ReflectiveInjector.fromResolvedProviders(providers, injector);
        this.activated = this.location.createComponent(factory, this.location.length, inj, []);
        this.activated.changeDetectorRef.detectChanges();
        this.activateEvents.emit(this.activated.instance);
    };
    /** @nocollapse */
    RouterOutlet.decorators = [
        { type: core_1.Directive, args: [{ selector: 'router-outlet' },] },
    ];
    /** @nocollapse */
    RouterOutlet.ctorParameters = [
        { type: router_outlet_map_1.RouterOutletMap, },
        { type: core_1.ViewContainerRef, },
        { type: core_1.ComponentFactoryResolver, },
        { type: undefined, decorators: [{ type: core_1.Attribute, args: ['name',] },] },
    ];
    /** @nocollapse */
    RouterOutlet.propDecorators = {
        'activateEvents': [{ type: core_1.Output, args: ['activate',] },],
        'deactivateEvents': [{ type: core_1.Output, args: ['deactivate',] },],
    };
    return RouterOutlet;
}());
exports.RouterOutlet = RouterOutlet;
//# sourceMappingURL=router_outlet.js.map