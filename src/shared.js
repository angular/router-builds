/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * @whatItDoes Name of the primary outlet.
 *
 * @stable
 */
export var /** @type {?} */ PRIMARY_OUTLET = 'primary';
var /** @type {?} */ NAVIGATION_CANCELING_ERROR = 'ngNavigationCancelingError';
/**
 * @param {?} message
 * @return {?}
 */
export function navigationCancelingError(message) {
    var /** @type {?} */ error = Error('NavigationCancelingError: ' + message);
    ((error))[NAVIGATION_CANCELING_ERROR] = true;
    return error;
}
/**
 * @param {?} error
 * @return {?}
 */
export function isNavigationCancelingError(error) {
    return ((error))[NAVIGATION_CANCELING_ERROR];
}
/**
 * @param {?} segments
 * @param {?} segmentGroup
 * @param {?} route
 * @return {?}
 */
export function defaultUrlMatcher(segments, segmentGroup, route) {
    var /** @type {?} */ path = route.path;
    var /** @type {?} */ parts = path.split('/');
    var /** @type {?} */ posParams = {};
    var /** @type {?} */ consumed = [];
    var /** @type {?} */ currentIndex = 0;
    for (var /** @type {?} */ i = 0; i < parts.length; ++i) {
        if (currentIndex >= segments.length)
            return null;
        var /** @type {?} */ current = segments[currentIndex];
        var /** @type {?} */ p = parts[i];
        var /** @type {?} */ isPosParam = p.startsWith(':');
        if (!isPosParam && p !== current.path)
            return null;
        if (isPosParam) {
            posParams[p.substring(1)] = current;
        }
        consumed.push(current);
        currentIndex++;
    }
    if (route.pathMatch === 'full' &&
        (segmentGroup.hasChildren() || currentIndex < segments.length)) {
        return null;
    }
    else {
        return { consumed: consumed, posParams: posParams };
    }
}
//# sourceMappingURL=shared.js.map