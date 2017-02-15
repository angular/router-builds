/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * \@whatItDoes Provides a way to customize when activated routes get reused.
 *
 * \@experimental
 * @abstract
 */
export class RouteReuseStrategy {
    /**
     * Determines if this route (and its subtree) should be detached to be reused later
     * @abstract
     * @param {?} route
     * @return {?}
     */
    shouldDetach(route) { }
    /**
     * Stores the detached route
     * @abstract
     * @param {?} route
     * @param {?} handle
     * @return {?}
     */
    store(route, handle) { }
    /**
     * Determines if this route (and its subtree) should be reattached
     * @abstract
     * @param {?} route
     * @return {?}
     */
    shouldAttach(route) { }
    /**
     * Retrieves the previously stored route
     * @abstract
     * @param {?} route
     * @return {?}
     */
    retrieve(route) { }
    /**
     * Determines if a route should be reused
     * @abstract
     * @param {?} future
     * @param {?} curr
     * @return {?}
     */
    shouldReuseRoute(future, curr) { }
}
//# sourceMappingURL=route_reuse_strategy.js.map