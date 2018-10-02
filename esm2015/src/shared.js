/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** *
 * \@description
 *
 * Name of the primary outlet.
 *
 *
  @type {?} */
export const PRIMARY_OUTLET = 'primary';
/** @typedef {?} */
var Params;
export { Params };
/**
 * Matrix and Query parameters.
 *
 * `ParamMap` makes it easier to work with parameters as they could have either a single value or
 * multiple value. Because this should be known by the user, calling `get` or `getAll` returns the
 * correct type (either `string` or `string[]`).
 *
 * The API is inspired by the URLSearchParams interface.
 * see https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
 *
 *
 * @record
 */
export function ParamMap() { }
/** @type {?} */
ParamMap.prototype.has;
/**
 * Return a single value for the given parameter name:
 * - the value when the parameter has a single value,
 * - the first value if the parameter has multiple values,
 * - `null` when there is no such parameter.
 * @type {?}
 */
ParamMap.prototype.get;
/**
 * Return an array of values for the given parameter name.
 *
 * If there is no such parameter, an empty array is returned.
 * @type {?}
 */
ParamMap.prototype.getAll;
/**
 * Name of the parameters
 * @type {?}
 */
ParamMap.prototype.keys;
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
    /** @type {?} */
    ParamsAsMap.prototype.params;
}
/**
 * Convert a `Params` instance to a `ParamMap`.
 *
 *
 * @param {?} params
 * @return {?}
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
    (/** @type {?} */ (error))[NAVIGATION_CANCELING_ERROR] = true;
    return error;
}
/**
 * @param {?} error
 * @return {?}
 */
export function isNavigationCancelingError(error) {
    return error && (/** @type {?} */ (error))[NAVIGATION_CANCELING_ERROR];
}
/**
 * @param {?} segments
 * @param {?} segmentGroup
 * @param {?} route
 * @return {?}
 */
export function defaultUrlMatcher(segments, segmentGroup, route) {
    /** @type {?} */
    const parts = /** @type {?} */ ((route.path)).split('/');
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9zaGFyZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBbUJBLGFBQWEsY0FBYyxHQUFHLFNBQVMsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTJDeEMsTUFBTSxXQUFXOzs7O0lBR2YsWUFBWSxNQUFjLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLElBQUksRUFBRSxDQUFDLEVBQUU7Ozs7O0lBRTNELEdBQUcsQ0FBQyxJQUFZLElBQWEsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFOzs7OztJQUV2RSxHQUFHLENBQUMsSUFBWTtRQUNkLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTs7WUFDbEIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1QixPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3BDO1FBRUQsT0FBTyxJQUFJLENBQUM7S0FDYjs7Ozs7SUFFRCxNQUFNLENBQUMsSUFBWTtRQUNqQixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7O1lBQ2xCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUIsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbkM7UUFFRCxPQUFPLEVBQUUsQ0FBQztLQUNYOzs7O0lBRUQsSUFBSSxJQUFJLEtBQWUsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFO0NBQzFEOzs7Ozs7Ozs7Ozs7QUFPRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsTUFBYztJQUM5QyxPQUFPLElBQUksV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0NBQ2hDOztBQUVELE1BQU0sMEJBQTBCLEdBQUcsNEJBQTRCLENBQUM7Ozs7O0FBRWhFLE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxPQUFlOztJQUN0RCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsNEJBQTRCLEdBQUcsT0FBTyxDQUFDLENBQUM7SUFDNUQsbUJBQUMsS0FBWSxFQUFDLENBQUMsMEJBQTBCLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDbEQsT0FBTyxLQUFLLENBQUM7Q0FDZDs7Ozs7QUFFRCxNQUFNLFVBQVUsMEJBQTBCLENBQUMsS0FBWTtJQUNyRCxPQUFPLEtBQUssSUFBSSxtQkFBQyxLQUFZLEVBQUMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0NBQzVEOzs7Ozs7O0FBR0QsTUFBTSxVQUFVLGlCQUFpQixDQUM3QixRQUFzQixFQUFFLFlBQTZCLEVBQUUsS0FBWTs7SUFDckUsTUFBTSxLQUFLLHNCQUFHLEtBQUssQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRTtJQUV0QyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRTs7UUFFbEMsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUVELElBQUksS0FBSyxDQUFDLFNBQVMsS0FBSyxNQUFNO1FBQzFCLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFOztRQUVsRSxPQUFPLElBQUksQ0FBQztLQUNiOztJQUVELE1BQU0sU0FBUyxHQUFnQyxFQUFFLENBQUM7O0lBR2xELEtBQUssSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFOztRQUNqRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7O1FBQzFCLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQzs7UUFDaEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN6QyxJQUFJLFdBQVcsRUFBRTtZQUNmLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDO1NBQ3hDO2FBQU0sSUFBSSxJQUFJLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRTs7WUFFaEMsT0FBTyxJQUFJLENBQUM7U0FDYjtLQUNGO0lBRUQsT0FBTyxFQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsU0FBUyxFQUFDLENBQUM7Q0FDL0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Um91dGUsIFVybE1hdGNoUmVzdWx0fSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge1VybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cH0gZnJvbSAnLi91cmxfdHJlZSc7XG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBOYW1lIG9mIHRoZSBwcmltYXJ5IG91dGxldC5cbiAqXG4gKlxuICovXG5leHBvcnQgY29uc3QgUFJJTUFSWV9PVVRMRVQgPSAncHJpbWFyeSc7XG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIHBhcmFtZXRlcnMuXG4gKlxuICpcbiAqL1xuZXhwb3J0IHR5cGUgUGFyYW1zID0ge1xuICBba2V5OiBzdHJpbmddOiBhbnlcbn07XG5cbi8qKlxuICogTWF0cml4IGFuZCBRdWVyeSBwYXJhbWV0ZXJzLlxuICpcbiAqIGBQYXJhbU1hcGAgbWFrZXMgaXQgZWFzaWVyIHRvIHdvcmsgd2l0aCBwYXJhbWV0ZXJzIGFzIHRoZXkgY291bGQgaGF2ZSBlaXRoZXIgYSBzaW5nbGUgdmFsdWUgb3JcbiAqIG11bHRpcGxlIHZhbHVlLiBCZWNhdXNlIHRoaXMgc2hvdWxkIGJlIGtub3duIGJ5IHRoZSB1c2VyLCBjYWxsaW5nIGBnZXRgIG9yIGBnZXRBbGxgIHJldHVybnMgdGhlXG4gKiBjb3JyZWN0IHR5cGUgKGVpdGhlciBgc3RyaW5nYCBvciBgc3RyaW5nW11gKS5cbiAqXG4gKiBUaGUgQVBJIGlzIGluc3BpcmVkIGJ5IHRoZSBVUkxTZWFyY2hQYXJhbXMgaW50ZXJmYWNlLlxuICogc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9VUkxTZWFyY2hQYXJhbXNcbiAqXG4gKlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhcmFtTWFwIHtcbiAgaGFzKG5hbWU6IHN0cmluZyk6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBSZXR1cm4gYSBzaW5nbGUgdmFsdWUgZm9yIHRoZSBnaXZlbiBwYXJhbWV0ZXIgbmFtZTpcbiAgICogLSB0aGUgdmFsdWUgd2hlbiB0aGUgcGFyYW1ldGVyIGhhcyBhIHNpbmdsZSB2YWx1ZSxcbiAgICogLSB0aGUgZmlyc3QgdmFsdWUgaWYgdGhlIHBhcmFtZXRlciBoYXMgbXVsdGlwbGUgdmFsdWVzLFxuICAgKiAtIGBudWxsYCB3aGVuIHRoZXJlIGlzIG5vIHN1Y2ggcGFyYW1ldGVyLlxuICAgKi9cbiAgZ2V0KG5hbWU6IHN0cmluZyk6IHN0cmluZ3xudWxsO1xuICAvKipcbiAgICogUmV0dXJuIGFuIGFycmF5IG9mIHZhbHVlcyBmb3IgdGhlIGdpdmVuIHBhcmFtZXRlciBuYW1lLlxuICAgKlxuICAgKiBJZiB0aGVyZSBpcyBubyBzdWNoIHBhcmFtZXRlciwgYW4gZW1wdHkgYXJyYXkgaXMgcmV0dXJuZWQuXG4gICAqL1xuICBnZXRBbGwobmFtZTogc3RyaW5nKTogc3RyaW5nW107XG5cbiAgLyoqIE5hbWUgb2YgdGhlIHBhcmFtZXRlcnMgKi9cbiAgcmVhZG9ubHkga2V5czogc3RyaW5nW107XG59XG5cbmNsYXNzIFBhcmFtc0FzTWFwIGltcGxlbWVudHMgUGFyYW1NYXAge1xuICBwcml2YXRlIHBhcmFtczogUGFyYW1zO1xuXG4gIGNvbnN0cnVjdG9yKHBhcmFtczogUGFyYW1zKSB7IHRoaXMucGFyYW1zID0gcGFyYW1zIHx8IHt9OyB9XG5cbiAgaGFzKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5wYXJhbXMuaGFzT3duUHJvcGVydHkobmFtZSk7IH1cblxuICBnZXQobmFtZTogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICAgIGlmICh0aGlzLmhhcyhuYW1lKSkge1xuICAgICAgY29uc3QgdiA9IHRoaXMucGFyYW1zW25hbWVdO1xuICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkodikgPyB2WzBdIDogdjtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGdldEFsbChuYW1lOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgaWYgKHRoaXMuaGFzKG5hbWUpKSB7XG4gICAgICBjb25zdCB2ID0gdGhpcy5wYXJhbXNbbmFtZV07XG4gICAgICByZXR1cm4gQXJyYXkuaXNBcnJheSh2KSA/IHYgOiBbdl07XG4gICAgfVxuXG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgZ2V0IGtleXMoKTogc3RyaW5nW10geyByZXR1cm4gT2JqZWN0LmtleXModGhpcy5wYXJhbXMpOyB9XG59XG5cbi8qKlxuICogQ29udmVydCBhIGBQYXJhbXNgIGluc3RhbmNlIHRvIGEgYFBhcmFtTWFwYC5cbiAqXG4gKlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFRvUGFyYW1NYXAocGFyYW1zOiBQYXJhbXMpOiBQYXJhbU1hcCB7XG4gIHJldHVybiBuZXcgUGFyYW1zQXNNYXAocGFyYW1zKTtcbn1cblxuY29uc3QgTkFWSUdBVElPTl9DQU5DRUxJTkdfRVJST1IgPSAnbmdOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3InO1xuXG5leHBvcnQgZnVuY3Rpb24gbmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yKG1lc3NhZ2U6IHN0cmluZykge1xuICBjb25zdCBlcnJvciA9IEVycm9yKCdOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3I6ICcgKyBtZXNzYWdlKTtcbiAgKGVycm9yIGFzIGFueSlbTkFWSUdBVElPTl9DQU5DRUxJTkdfRVJST1JdID0gdHJ1ZTtcbiAgcmV0dXJuIGVycm9yO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoZXJyb3I6IEVycm9yKSB7XG4gIHJldHVybiBlcnJvciAmJiAoZXJyb3IgYXMgYW55KVtOQVZJR0FUSU9OX0NBTkNFTElOR19FUlJPUl07XG59XG5cbi8vIE1hdGNoZXMgdGhlIHJvdXRlIGNvbmZpZ3VyYXRpb24gKGByb3V0ZWApIGFnYWluc3QgdGhlIGFjdHVhbCBVUkwgKGBzZWdtZW50c2ApLlxuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRVcmxNYXRjaGVyKFxuICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZTogUm91dGUpOiBVcmxNYXRjaFJlc3VsdHxudWxsIHtcbiAgY29uc3QgcGFydHMgPSByb3V0ZS5wYXRoICEuc3BsaXQoJy8nKTtcblxuICBpZiAocGFydHMubGVuZ3RoID4gc2VnbWVudHMubGVuZ3RoKSB7XG4gICAgLy8gVGhlIGFjdHVhbCBVUkwgaXMgc2hvcnRlciB0aGFuIHRoZSBjb25maWcsIG5vIG1hdGNoXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpZiAocm91dGUucGF0aE1hdGNoID09PSAnZnVsbCcgJiZcbiAgICAgIChzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSB8fCBwYXJ0cy5sZW5ndGggPCBzZWdtZW50cy5sZW5ndGgpKSB7XG4gICAgLy8gVGhlIGNvbmZpZyBpcyBsb25nZXIgdGhhbiB0aGUgYWN0dWFsIFVSTCBidXQgd2UgYXJlIGxvb2tpbmcgZm9yIGEgZnVsbCBtYXRjaCwgcmV0dXJuIG51bGxcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IHBvc1BhcmFtczoge1trZXk6IHN0cmluZ106IFVybFNlZ21lbnR9ID0ge307XG5cbiAgLy8gQ2hlY2sgZWFjaCBjb25maWcgcGFydCBhZ2FpbnN0IHRoZSBhY3R1YWwgVVJMXG4gIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBwYXJ0cy5sZW5ndGg7IGluZGV4KyspIHtcbiAgICBjb25zdCBwYXJ0ID0gcGFydHNbaW5kZXhdO1xuICAgIGNvbnN0IHNlZ21lbnQgPSBzZWdtZW50c1tpbmRleF07XG4gICAgY29uc3QgaXNQYXJhbWV0ZXIgPSBwYXJ0LnN0YXJ0c1dpdGgoJzonKTtcbiAgICBpZiAoaXNQYXJhbWV0ZXIpIHtcbiAgICAgIHBvc1BhcmFtc1twYXJ0LnN1YnN0cmluZygxKV0gPSBzZWdtZW50O1xuICAgIH0gZWxzZSBpZiAocGFydCAhPT0gc2VnbWVudC5wYXRoKSB7XG4gICAgICAvLyBUaGUgYWN0dWFsIFVSTCBwYXJ0IGRvZXMgbm90IG1hdGNoIHRoZSBjb25maWcsIG5vIG1hdGNoXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge2NvbnN1bWVkOiBzZWdtZW50cy5zbGljZSgwLCBwYXJ0cy5sZW5ndGgpLCBwb3NQYXJhbXN9O1xufVxuIl19