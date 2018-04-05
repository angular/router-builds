/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * \@description
 *
 * Provides a way to customize when activated routes get reused.
 *
 * \@experimental
 * @abstract
 */
var /**
 * \@description
 *
 * Provides a way to customize when activated routes get reused.
 *
 * \@experimental
 * @abstract
 */
RouteReuseStrategy = /** @class */ (function () {
    function RouteReuseStrategy() {
    }
    return RouteReuseStrategy;
}());
/**
 * \@description
 *
 * Provides a way to customize when activated routes get reused.
 *
 * \@experimental
 * @abstract
 */
export { RouteReuseStrategy };
function RouteReuseStrategy_tsickle_Closure_declarations() {
    /**
     * Determines if this route (and its subtree) should be detached to be reused later
     * @abstract
     * @param {?} route
     * @return {?}
     */
    RouteReuseStrategy.prototype.shouldDetach = function (route) { };
    /**
     * Stores the detached route.
     *
     * Storing a `null` value should erase the previously stored value.
     * @abstract
     * @param {?} route
     * @param {?} handle
     * @return {?}
     */
    RouteReuseStrategy.prototype.store = function (route, handle) { };
    /**
     * Determines if this route (and its subtree) should be reattached
     * @abstract
     * @param {?} route
     * @return {?}
     */
    RouteReuseStrategy.prototype.shouldAttach = function (route) { };
    /**
     * Retrieves the previously stored route
     * @abstract
     * @param {?} route
     * @return {?}
     */
    RouteReuseStrategy.prototype.retrieve = function (route) { };
    /**
     * Determines if a route should be reused
     * @abstract
     * @param {?} future
     * @param {?} curr
     * @return {?}
     */
    RouteReuseStrategy.prototype.shouldReuseRoute = function (future, curr) { };
}
/**
 * Does not detach any subtrees. Reuses routes as long as their route config is the same.
 */
var /**
 * Does not detach any subtrees. Reuses routes as long as their route config is the same.
 */
DefaultRouteReuseStrategy = /** @class */ (function () {
    function DefaultRouteReuseStrategy() {
    }
    /**
     * @param {?} route
     * @return {?}
     */
    DefaultRouteReuseStrategy.prototype.shouldDetach = /**
     * @param {?} route
     * @return {?}
     */
    function (route) { return false; };
    /**
     * @param {?} route
     * @param {?} detachedTree
     * @return {?}
     */
    DefaultRouteReuseStrategy.prototype.store = /**
     * @param {?} route
     * @param {?} detachedTree
     * @return {?}
     */
    function (route, detachedTree) { };
    /**
     * @param {?} route
     * @return {?}
     */
    DefaultRouteReuseStrategy.prototype.shouldAttach = /**
     * @param {?} route
     * @return {?}
     */
    function (route) { return false; };
    /**
     * @param {?} route
     * @return {?}
     */
    DefaultRouteReuseStrategy.prototype.retrieve = /**
     * @param {?} route
     * @return {?}
     */
    function (route) { return null; };
    /**
     * @param {?} future
     * @param {?} curr
     * @return {?}
     */
    DefaultRouteReuseStrategy.prototype.shouldReuseRoute = /**
     * @param {?} future
     * @param {?} curr
     * @return {?}
     */
    function (future, curr) {
        return future.routeConfig === curr.routeConfig;
    };
    return DefaultRouteReuseStrategy;
}());
/**
 * Does not detach any subtrees. Reuses routes as long as their route config is the same.
 */
export { DefaultRouteReuseStrategy };
//# sourceMappingURL=route_reuse_strategy.js.map