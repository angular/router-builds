/**
 * @module
 * @description
 * Maps application URLs into application states, to support deep-linking and navigation.
 */
"use strict";
var router_1 = require('./src/router');
exports.Router = router_1.Router;
exports.RouterOutletMap = router_1.RouterOutletMap;
var segments_1 = require('./src/segments');
exports.RouteSegment = segments_1.RouteSegment;
exports.UrlSegment = segments_1.UrlSegment;
exports.Tree = segments_1.Tree;
exports.UrlTree = segments_1.UrlTree;
exports.RouteTree = segments_1.RouteTree;
var decorators_1 = require('./src/metadata/decorators');
exports.Routes = decorators_1.Routes;
var metadata_1 = require('./src/metadata/metadata');
exports.Route = metadata_1.Route;
var router_url_serializer_1 = require('./src/router_url_serializer');
exports.RouterUrlSerializer = router_url_serializer_1.RouterUrlSerializer;
exports.DefaultRouterUrlSerializer = router_url_serializer_1.DefaultRouterUrlSerializer;
var router_providers_1 = require('./src/router_providers');
exports.ROUTER_PROVIDERS = router_providers_1.ROUTER_PROVIDERS;
var router_outlet_1 = require('./src/directives/router_outlet');
exports.RouterOutlet = router_outlet_1.RouterOutlet;
var router_link_1 = require('./src/directives/router_link');
exports.RouterLink = router_link_1.RouterLink;
var router_directives_1 = require("./src/directives/router_directives");
exports.ROUTER_DIRECTIVES = router_directives_1.ROUTER_DIRECTIVES;
//# sourceMappingURL=index.js.map