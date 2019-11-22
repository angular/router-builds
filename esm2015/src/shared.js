/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * The primary routing outlet.
 *
 * \@publicApi
 * @type {?}
 */
export const PRIMARY_OUTLET = 'primary';
/**
 * A map that provides access to the required and optional parameters
 * specific to a route.
 * The map supports retrieving a single value with `get()`
 * or multiple values with `getAll()`.
 *
 * @see [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
 *
 * \@publicApi
 * @record
 */
export function ParamMap() { }
if (false) {
    /**
     * Names of the parameters in the map.
     * @type {?}
     */
    ParamMap.prototype.keys;
    /**
     * Reports whether the map contains a given parameter.
     * @param {?} name The parameter name.
     * @return {?} True if the map contains the given parameter, false otherwise.
     */
    ParamMap.prototype.has = function (name) { };
    /**
     * Retrieves a single value for a parameter.
     * @param {?} name The parameter name.
     * @return {?} The parameter's single value,
     * or the first value if the parameter has multiple values,
     * or `null` when there is no such parameter.
     */
    ParamMap.prototype.get = function (name) { };
    /**
     * Retrieves multiple values for a parameter.
     * @param {?} name The parameter name.
     * @return {?} An array containing one or more values,
     * or an empty array if there is no such parameter.
     *
     */
    ParamMap.prototype.getAll = function (name) { };
}
class ParamsAsMap {
    /**
     * @param {?} params
     */
    constructor(params) { this.params = params || {}; }
    /**
     * @param {?} name
     * @return {?}
     */
    has(name) { return this.params.hasOwnProperty(name); }
    /**
     * @param {?} name
     * @return {?}
     */
    get(name) {
        if (this.has(name)) {
            /** @type {?} */
            const v = this.params[name];
            return Array.isArray(v) ? v[0] : v;
        }
        return null;
    }
    /**
     * @param {?} name
     * @return {?}
     */
    getAll(name) {
        if (this.has(name)) {
            /** @type {?} */
            const v = this.params[name];
            return Array.isArray(v) ? v : [v];
        }
        return [];
    }
    /**
     * @return {?}
     */
    get keys() { return Object.keys(this.params); }
}
if (false) {
    /**
     * @type {?}
     * @private
     */
    ParamsAsMap.prototype.params;
}
/**
 * Converts a `Params` instance to a `ParamMap`.
 * \@publicApi
 * @param {?} params The instance to convert.
 * @return {?} The new map instance.
 *
 */
export function convertToParamMap(params) {
    return new ParamsAsMap(params);
}
/** @type {?} */
const NAVIGATION_CANCELING_ERROR = 'ngNavigationCancelingError';
/**
 * @param {?} message
 * @return {?}
 */
export function navigationCancelingError(message) {
    /** @type {?} */
    const error = Error('NavigationCancelingError: ' + message);
    ((/** @type {?} */ (error)))[NAVIGATION_CANCELING_ERROR] = true;
    return error;
}
/**
 * @param {?} error
 * @return {?}
 */
export function isNavigationCancelingError(error) {
    return error && ((/** @type {?} */ (error)))[NAVIGATION_CANCELING_ERROR];
}
// Matches the route configuration (`route`) against the actual URL (`segments`).
/**
 * @param {?} segments
 * @param {?} segmentGroup
 * @param {?} route
 * @return {?}
 */
export function defaultUrlMatcher(segments, segmentGroup, route) {
    /** @type {?} */
    const parts = (/** @type {?} */ (route.path)).split('/');
    if (parts.length > segments.length) {
        // The actual URL is shorter than the config, no match
        return null;
    }
    if (route.pathMatch === 'full' &&
        (segmentGroup.hasChildren() || parts.length < segments.length)) {
        // The config is longer than the actual URL but we are looking for a full match, return null
        return null;
    }
    /** @type {?} */
    const posParams = {};
    // Check each config part against the actual URL
    for (let index = 0; index < parts.length; index++) {
        /** @type {?} */
        const part = parts[index];
        /** @type {?} */
        const segment = segments[index];
        /** @type {?} */
        const isParameter = part.startsWith(':');
        if (isParameter) {
            posParams[part.substring(1)] = segment;
        }
        else if (part !== segment.path) {
            // The actual URL part does not match the config, no match
            return null;
        }
    }
    return { consumed: segments.slice(0, parts.length), posParams };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9zaGFyZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFpQkEsTUFBTSxPQUFPLGNBQWMsR0FBRyxTQUFTOzs7Ozs7Ozs7Ozs7QUF1QnZDLDhCQTBCQzs7Ozs7O0lBREMsd0JBQXdCOzs7Ozs7SUFuQnhCLDZDQUEyQjs7Ozs7Ozs7SUFRM0IsNkNBQStCOzs7Ozs7OztJQVEvQixnREFBK0I7O0FBTWpDLE1BQU0sV0FBVzs7OztJQUdmLFlBQVksTUFBYyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7Ozs7O0lBRTNELEdBQUcsQ0FBQyxJQUFZLElBQWEsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Ozs7O0lBRXZFLEdBQUcsQ0FBQyxJQUFZO1FBQ2QsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFOztrQkFDWixDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDM0IsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNwQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQzs7Ozs7SUFFRCxNQUFNLENBQUMsSUFBWTtRQUNqQixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7O2tCQUNaLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztZQUMzQixPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuQztRQUVELE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQzs7OztJQUVELElBQUksSUFBSSxLQUFlLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQzFEOzs7Ozs7SUF6QkMsNkJBQXVCOzs7Ozs7Ozs7QUFrQ3pCLE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxNQUFjO0lBQzlDLE9BQU8sSUFBSSxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDakMsQ0FBQzs7TUFFSywwQkFBMEIsR0FBRyw0QkFBNEI7Ozs7O0FBRS9ELE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxPQUFlOztVQUNoRCxLQUFLLEdBQUcsS0FBSyxDQUFDLDRCQUE0QixHQUFHLE9BQU8sQ0FBQztJQUMzRCxDQUFDLG1CQUFBLEtBQUssRUFBTyxDQUFDLENBQUMsMEJBQTBCLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDbEQsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDOzs7OztBQUVELE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxLQUFZO0lBQ3JELE9BQU8sS0FBSyxJQUFJLENBQUMsbUJBQUEsS0FBSyxFQUFPLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBQzdELENBQUM7Ozs7Ozs7O0FBR0QsTUFBTSxVQUFVLGlCQUFpQixDQUM3QixRQUFzQixFQUFFLFlBQTZCLEVBQUUsS0FBWTs7VUFDL0QsS0FBSyxHQUFHLG1CQUFBLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBRXJDLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFO1FBQ2xDLHNEQUFzRDtRQUN0RCxPQUFPLElBQUksQ0FBQztLQUNiO0lBRUQsSUFBSSxLQUFLLENBQUMsU0FBUyxLQUFLLE1BQU07UUFDMUIsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDbEUsNEZBQTRGO1FBQzVGLE9BQU8sSUFBSSxDQUFDO0tBQ2I7O1VBRUssU0FBUyxHQUFnQyxFQUFFO0lBRWpELGdEQUFnRDtJQUNoRCxLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTs7Y0FDM0MsSUFBSSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUM7O2NBQ25CLE9BQU8sR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDOztjQUN6QixXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7UUFDeEMsSUFBSSxXQUFXLEVBQUU7WUFDZixTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQztTQUN4QzthQUFNLElBQUksSUFBSSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDaEMsMERBQTBEO1lBQzFELE9BQU8sSUFBSSxDQUFDO1NBQ2I7S0FDRjtJQUVELE9BQU8sRUFBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFNBQVMsRUFBQyxDQUFDO0FBQ2hFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Um91dGUsIFVybE1hdGNoUmVzdWx0fSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge1VybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cH0gZnJvbSAnLi91cmxfdHJlZSc7XG5cblxuLyoqXG4gKiBUaGUgcHJpbWFyeSByb3V0aW5nIG91dGxldC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjb25zdCBQUklNQVJZX09VVExFVCA9ICdwcmltYXJ5JztcblxuLyoqXG4gKiBBIGNvbGxlY3Rpb24gb2YgbWF0cml4IGFuZCBxdWVyeSBVUkwgcGFyYW1ldGVycy5cbiAqIEBzZWUgYGNvbnZlcnRUb1BhcmFtTWFwKClgXG4gKiBAc2VlIGBQYXJhbU1hcGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIFBhcmFtcyA9IHtcbiAgW2tleTogc3RyaW5nXTogYW55O1xufTtcblxuLyoqXG4gKiBBIG1hcCB0aGF0IHByb3ZpZGVzIGFjY2VzcyB0byB0aGUgcmVxdWlyZWQgYW5kIG9wdGlvbmFsIHBhcmFtZXRlcnNcbiAqIHNwZWNpZmljIHRvIGEgcm91dGUuXG4gKiBUaGUgbWFwIHN1cHBvcnRzIHJldHJpZXZpbmcgYSBzaW5nbGUgdmFsdWUgd2l0aCBgZ2V0KClgXG4gKiBvciBtdWx0aXBsZSB2YWx1ZXMgd2l0aCBgZ2V0QWxsKClgLlxuICpcbiAqIEBzZWUgW1VSTFNlYXJjaFBhcmFtc10oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1VSTFNlYXJjaFBhcmFtcylcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyYW1NYXAge1xuICAvKipcbiAgICogUmVwb3J0cyB3aGV0aGVyIHRoZSBtYXAgY29udGFpbnMgYSBnaXZlbiBwYXJhbWV0ZXIuXG4gICAqIEBwYXJhbSBuYW1lIFRoZSBwYXJhbWV0ZXIgbmFtZS5cbiAgICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgbWFwIGNvbnRhaW5zIHRoZSBnaXZlbiBwYXJhbWV0ZXIsIGZhbHNlIG90aGVyd2lzZS5cbiAgICovXG4gIGhhcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuO1xuICAvKipcbiAgICogUmV0cmlldmVzIGEgc2luZ2xlIHZhbHVlIGZvciBhIHBhcmFtZXRlci5cbiAgICogQHBhcmFtIG5hbWUgVGhlIHBhcmFtZXRlciBuYW1lLlxuICAgKiBAcmV0dXJuIFRoZSBwYXJhbWV0ZXIncyBzaW5nbGUgdmFsdWUsXG4gICAqIG9yIHRoZSBmaXJzdCB2YWx1ZSBpZiB0aGUgcGFyYW1ldGVyIGhhcyBtdWx0aXBsZSB2YWx1ZXMsXG4gICAqIG9yIGBudWxsYCB3aGVuIHRoZXJlIGlzIG5vIHN1Y2ggcGFyYW1ldGVyLlxuICAgKi9cbiAgZ2V0KG5hbWU6IHN0cmluZyk6IHN0cmluZ3xudWxsO1xuICAvKipcbiAgICogUmV0cmlldmVzIG11bHRpcGxlIHZhbHVlcyBmb3IgYSBwYXJhbWV0ZXIuXG4gICAqIEBwYXJhbSBuYW1lIFRoZSBwYXJhbWV0ZXIgbmFtZS5cbiAgICogQHJldHVybiBBbiBhcnJheSBjb250YWluaW5nIG9uZSBvciBtb3JlIHZhbHVlcyxcbiAgICogb3IgYW4gZW1wdHkgYXJyYXkgaWYgdGhlcmUgaXMgbm8gc3VjaCBwYXJhbWV0ZXIuXG4gICAqXG4gICAqL1xuICBnZXRBbGwobmFtZTogc3RyaW5nKTogc3RyaW5nW107XG5cbiAgLyoqIE5hbWVzIG9mIHRoZSBwYXJhbWV0ZXJzIGluIHRoZSBtYXAuICovXG4gIHJlYWRvbmx5IGtleXM6IHN0cmluZ1tdO1xufVxuXG5jbGFzcyBQYXJhbXNBc01hcCBpbXBsZW1lbnRzIFBhcmFtTWFwIHtcbiAgcHJpdmF0ZSBwYXJhbXM6IFBhcmFtcztcblxuICBjb25zdHJ1Y3RvcihwYXJhbXM6IFBhcmFtcykgeyB0aGlzLnBhcmFtcyA9IHBhcmFtcyB8fCB7fTsgfVxuXG4gIGhhcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMucGFyYW1zLmhhc093blByb3BlcnR5KG5hbWUpOyB9XG5cbiAgZ2V0KG5hbWU6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgICBpZiAodGhpcy5oYXMobmFtZSkpIHtcbiAgICAgIGNvbnN0IHYgPSB0aGlzLnBhcmFtc1tuYW1lXTtcbiAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KHYpID8gdlswXSA6IHY7XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBnZXRBbGwobmFtZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIGlmICh0aGlzLmhhcyhuYW1lKSkge1xuICAgICAgY29uc3QgdiA9IHRoaXMucGFyYW1zW25hbWVdO1xuICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkodikgPyB2IDogW3ZdO1xuICAgIH1cblxuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGdldCBrZXlzKCk6IHN0cmluZ1tdIHsgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMucGFyYW1zKTsgfVxufVxuXG4vKipcbiAqIENvbnZlcnRzIGEgYFBhcmFtc2AgaW5zdGFuY2UgdG8gYSBgUGFyYW1NYXBgLlxuICogQHBhcmFtIHBhcmFtcyBUaGUgaW5zdGFuY2UgdG8gY29udmVydC5cbiAqIEByZXR1cm5zIFRoZSBuZXcgbWFwIGluc3RhbmNlLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRUb1BhcmFtTWFwKHBhcmFtczogUGFyYW1zKTogUGFyYW1NYXAge1xuICByZXR1cm4gbmV3IFBhcmFtc0FzTWFwKHBhcmFtcyk7XG59XG5cbmNvbnN0IE5BVklHQVRJT05fQ0FOQ0VMSU5HX0VSUk9SID0gJ25nTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yJztcblxuZXhwb3J0IGZ1bmN0aW9uIG5hdmlnYXRpb25DYW5jZWxpbmdFcnJvcihtZXNzYWdlOiBzdHJpbmcpIHtcbiAgY29uc3QgZXJyb3IgPSBFcnJvcignTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yOiAnICsgbWVzc2FnZSk7XG4gIChlcnJvciBhcyBhbnkpW05BVklHQVRJT05fQ0FOQ0VMSU5HX0VSUk9SXSA9IHRydWU7XG4gIHJldHVybiBlcnJvcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yKGVycm9yOiBFcnJvcikge1xuICByZXR1cm4gZXJyb3IgJiYgKGVycm9yIGFzIGFueSlbTkFWSUdBVElPTl9DQU5DRUxJTkdfRVJST1JdO1xufVxuXG4vLyBNYXRjaGVzIHRoZSByb3V0ZSBjb25maWd1cmF0aW9uIChgcm91dGVgKSBhZ2FpbnN0IHRoZSBhY3R1YWwgVVJMIChgc2VnbWVudHNgKS5cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0VXJsTWF0Y2hlcihcbiAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGU6IFJvdXRlKTogVXJsTWF0Y2hSZXN1bHR8bnVsbCB7XG4gIGNvbnN0IHBhcnRzID0gcm91dGUucGF0aCAhLnNwbGl0KCcvJyk7XG5cbiAgaWYgKHBhcnRzLmxlbmd0aCA+IHNlZ21lbnRzLmxlbmd0aCkge1xuICAgIC8vIFRoZSBhY3R1YWwgVVJMIGlzIHNob3J0ZXIgdGhhbiB0aGUgY29uZmlnLCBubyBtYXRjaFxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgaWYgKHJvdXRlLnBhdGhNYXRjaCA9PT0gJ2Z1bGwnICYmXG4gICAgICAoc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkgfHwgcGFydHMubGVuZ3RoIDwgc2VnbWVudHMubGVuZ3RoKSkge1xuICAgIC8vIFRoZSBjb25maWcgaXMgbG9uZ2VyIHRoYW4gdGhlIGFjdHVhbCBVUkwgYnV0IHdlIGFyZSBsb29raW5nIGZvciBhIGZ1bGwgbWF0Y2gsIHJldHVybiBudWxsXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBwb3NQYXJhbXM6IHtba2V5OiBzdHJpbmddOiBVcmxTZWdtZW50fSA9IHt9O1xuXG4gIC8vIENoZWNrIGVhY2ggY29uZmlnIHBhcnQgYWdhaW5zdCB0aGUgYWN0dWFsIFVSTFxuICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgcGFydHMubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgY29uc3QgcGFydCA9IHBhcnRzW2luZGV4XTtcbiAgICBjb25zdCBzZWdtZW50ID0gc2VnbWVudHNbaW5kZXhdO1xuICAgIGNvbnN0IGlzUGFyYW1ldGVyID0gcGFydC5zdGFydHNXaXRoKCc6Jyk7XG4gICAgaWYgKGlzUGFyYW1ldGVyKSB7XG4gICAgICBwb3NQYXJhbXNbcGFydC5zdWJzdHJpbmcoMSldID0gc2VnbWVudDtcbiAgICB9IGVsc2UgaWYgKHBhcnQgIT09IHNlZ21lbnQucGF0aCkge1xuICAgICAgLy8gVGhlIGFjdHVhbCBVUkwgcGFydCBkb2VzIG5vdCBtYXRjaCB0aGUgY29uZmlnLCBubyBtYXRjaFxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtjb25zdW1lZDogc2VnbWVudHMuc2xpY2UoMCwgcGFydHMubGVuZ3RoKSwgcG9zUGFyYW1zfTtcbn1cbiJdfQ==