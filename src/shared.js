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
export const /** @type {?} */ PRIMARY_OUTLET = 'primary';
export class NavigationCancelingError extends Error {
    /**
     * @param {?} message
     */
    constructor(message) {
        super(message);
        this.message = message;
        this.stack = (new Error(message)).stack;
    }
    /**
     * @return {?}
     */
    toString() { return this.message; }
}
function NavigationCancelingError_tsickle_Closure_declarations() {
    /** @type {?} */
    NavigationCancelingError.prototype.stack;
    /** @type {?} */
    NavigationCancelingError.prototype.message;
}
/**
 * @param {?} segments
 * @param {?} segmentGroup
 * @param {?} route
 * @return {?}
 */
export function defaultUrlMatcher(segments, segmentGroup, route) {
    const /** @type {?} */ path = route.path;
    const /** @type {?} */ parts = path.split('/');
    const /** @type {?} */ posParams = {};
    const /** @type {?} */ consumed = [];
    let /** @type {?} */ currentIndex = 0;
    for (let /** @type {?} */ i = 0; i < parts.length; ++i) {
        if (currentIndex >= segments.length)
            return null;
        const /** @type {?} */ current = segments[currentIndex];
        const /** @type {?} */ p = parts[i];
        const /** @type {?} */ isPosParam = p.startsWith(':');
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
        return { consumed, posParams };
    }
}
//# sourceMappingURL=shared.js.map