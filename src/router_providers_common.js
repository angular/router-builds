"use strict";
var core_1 = require('@angular/core');
var common_1 = require('@angular/common');
var router_1 = require('./router');
var segments_1 = require('./segments');
var router_url_serializer_1 = require('./router_url_serializer');
/**
 * The Platform agnostic ROUTER PROVIDERS
 */
exports.ROUTER_PROVIDERS_COMMON = [
    router_1.RouterOutletMap,
    /*@ts2dart_Provider*/ { provide: router_url_serializer_1.RouterUrlSerializer, useClass: router_url_serializer_1.DefaultRouterUrlSerializer },
    /*@ts2dart_Provider*/ { provide: common_1.LocationStrategy, useClass: common_1.PathLocationStrategy }, common_1.Location,
    /*@ts2dart_Provider*/ {
        provide: router_1.Router,
        useFactory: routerFactory,
        deps: /*@ts2dart_const*/ [core_1.ApplicationRef, core_1.ComponentResolver, router_url_serializer_1.RouterUrlSerializer, router_1.RouterOutletMap, common_1.Location],
    },
    /*@ts2dart_Provider*/ { provide: segments_1.RouteSegment, useFactory: routeSegmentFactory, deps: [router_1.Router] }
];
function routerFactory(app, componentResolver, urlSerializer, routerOutletMap, location) {
    if (app.componentTypes.length == 0) {
        throw new core_1.BaseException("Bootstrap at least one component before injecting Router.");
    }
    // TODO: vsavkin this should not be null
    var router = new router_1.Router(null, app.componentTypes[0], componentResolver, urlSerializer, routerOutletMap, location);
    app.registerDisposeListener(function () { return router.dispose(); });
    return router;
}
function routeSegmentFactory(router) {
    return router.routeTree.root;
}
//# sourceMappingURL=router_providers_common.js.map