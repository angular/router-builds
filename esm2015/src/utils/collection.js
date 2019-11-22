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
import { ɵisObservable as isObservable, ɵisPromise as isPromise } from '@angular/core';
import { from, of } from 'rxjs';
import { concatAll, last as lastValue, map } from 'rxjs/operators';
import { PRIMARY_OUTLET } from '../shared';
/**
 * @param {?} a
 * @param {?} b
 * @return {?}
 */
export function shallowEqualArrays(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; ++i) {
        if (!shallowEqual(a[i], b[i]))
            return false;
    }
    return true;
}
/**
 * @param {?} a
 * @param {?} b
 * @return {?}
 */
export function shallowEqual(a, b) {
    // Casting Object.keys return values to include `undefined` as there are some cases
    // in IE 11 where this can happen. Cannot provide a test because the behavior only
    // exists in certain circumstances in IE 11, therefore doing this cast ensures the
    // logic is correct for when this edge case is hit.
    /** @type {?} */
    const k1 = (/** @type {?} */ (Object.keys(a)));
    /** @type {?} */
    const k2 = (/** @type {?} */ (Object.keys(b)));
    if (!k1 || !k2 || k1.length != k2.length) {
        return false;
    }
    /** @type {?} */
    let key;
    for (let i = 0; i < k1.length; i++) {
        key = k1[i];
        if (!equalArraysOrString(a[key], b[key])) {
            return false;
        }
    }
    return true;
}
/**
 * Test equality for arrays of strings or a string.
 * @param {?} a
 * @param {?} b
 * @return {?}
 */
export function equalArraysOrString(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length != b.length)
            return false;
        return a.every((/**
         * @param {?} aItem
         * @return {?}
         */
        aItem => b.indexOf(aItem) > -1));
    }
    else {
        return a === b;
    }
}
/**
 * Flattens single-level nested arrays.
 * @template T
 * @param {?} arr
 * @return {?}
 */
export function flatten(arr) {
    return Array.prototype.concat.apply([], arr);
}
/**
 * Return the last element of an array.
 * @template T
 * @param {?} a
 * @return {?}
 */
export function last(a) {
    return a.length > 0 ? a[a.length - 1] : null;
}
/**
 * Verifys all booleans in an array are `true`.
 * @param {?} bools
 * @return {?}
 */
export function and(bools) {
    return !bools.some((/**
     * @param {?} v
     * @return {?}
     */
    v => !v));
}
/**
 * @template K, V
 * @param {?} map
 * @param {?} callback
 * @return {?}
 */
export function forEach(map, callback) {
    for (const prop in map) {
        if (map.hasOwnProperty(prop)) {
            callback(map[prop], prop);
        }
    }
}
/**
 * @template A, B
 * @param {?} obj
 * @param {?} fn
 * @return {?}
 */
export function waitForMap(obj, fn) {
    if (Object.keys(obj).length === 0) {
        return of({});
    }
    /** @type {?} */
    const waitHead = [];
    /** @type {?} */
    const waitTail = [];
    /** @type {?} */
    const res = {};
    forEach(obj, (/**
     * @param {?} a
     * @param {?} k
     * @return {?}
     */
    (a, k) => {
        /** @type {?} */
        const mapped = fn(k, a).pipe(map((/**
         * @param {?} r
         * @return {?}
         */
        (r) => res[k] = r)));
        if (k === PRIMARY_OUTLET) {
            waitHead.push(mapped);
        }
        else {
            waitTail.push(mapped);
        }
    }));
    // Closure compiler has problem with using spread operator here. So we use "Array.concat".
    // Note that we also need to cast the new promise because TypeScript cannot infer the type
    // when calling the "of" function through "Function.apply"
    return ((/** @type {?} */ (of.apply(null, waitHead.concat(waitTail)))))
        .pipe(concatAll(), lastValue(), map((/**
     * @return {?}
     */
    () => res)));
}
/**
 * @template T
 * @param {?} value
 * @return {?}
 */
export function wrapIntoObservable(value) {
    if (isObservable(value)) {
        return value;
    }
    if (isPromise(value)) {
        // Use `Promise.resolve()` to wrap promise-like instances.
        // Required ie when a Resolver returns a AngularJS `$q` promise to correctly trigger the
        // change detection.
        return from(Promise.resolve(value));
    }
    return of(value);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvdXRpbHMvY29sbGVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQVFBLE9BQU8sRUFBa0IsYUFBYSxJQUFJLFlBQVksRUFBRSxVQUFVLElBQUksU0FBUyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3RHLE9BQU8sRUFBYSxJQUFJLEVBQUUsRUFBRSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQzNDLE9BQU8sRUFBQyxTQUFTLEVBQUUsSUFBSSxJQUFJLFNBQVMsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUVqRSxPQUFPLEVBQUMsY0FBYyxFQUFTLE1BQU0sV0FBVyxDQUFDOzs7Ozs7QUFFakQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLENBQVEsRUFBRSxDQUFRO0lBQ25ELElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsTUFBTTtRQUFFLE9BQU8sS0FBSyxDQUFDO0lBQ3hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1FBQ2pDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO0tBQzdDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDOzs7Ozs7QUFFRCxNQUFNLFVBQVUsWUFBWSxDQUFDLENBQVMsRUFBRSxDQUFTOzs7Ozs7VUFLekMsRUFBRSxHQUFHLG1CQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQXdCOztVQUMzQyxFQUFFLEdBQUcsbUJBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBd0I7SUFDakQsSUFB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LGNBQWMsRUFBRTtZQUN4QixRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3ZCO2FBQU07WUFDTCxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3ZCO0lBQ0gsQ0FBQyxFQUFDLENBQUM7SUFFSCwwRkFBMEY7SUFDMUYsMEZBQTBGO0lBQzFGLDBEQUEwRDtJQUMxRCxPQUFPLENBQUMsbUJBQUEsRUFBRSxDQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUE2QixDQUFDO1NBQzNFLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxTQUFTLEVBQUUsRUFBRSxHQUFHOzs7SUFBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDO0FBQ3RELENBQUM7Ozs7OztBQUVELE1BQU0sVUFBVSxrQkFBa0IsQ0FBSSxLQUFvQztJQUN4RSxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUN2QixPQUFPLEtBQUssQ0FBQztLQUNkO0lBRUQsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDcEIsMERBQTBEO1FBQzFELHdGQUF3RjtRQUN4RixvQkFBb0I7UUFDcEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0tBQ3JDO0lBRUQsT0FBTyxFQUFFLENBQUUsS0FBSyxDQUFDLENBQUM7QUFDcEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtOZ01vZHVsZUZhY3RvcnksIMm1aXNPYnNlcnZhYmxlIGFzIGlzT2JzZXJ2YWJsZSwgybVpc1Byb21pc2UgYXMgaXNQcm9taXNlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgZnJvbSwgb2YgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y29uY2F0QWxsLCBsYXN0IGFzIGxhc3RWYWx1ZSwgbWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7UFJJTUFSWV9PVVRMRVQsIFBhcmFtc30gZnJvbSAnLi4vc2hhcmVkJztcblxuZXhwb3J0IGZ1bmN0aW9uIHNoYWxsb3dFcXVhbEFycmF5cyhhOiBhbnlbXSwgYjogYW55W10pOiBib29sZWFuIHtcbiAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGEubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoIXNoYWxsb3dFcXVhbChhW2ldLCBiW2ldKSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2hhbGxvd0VxdWFsKGE6IFBhcmFtcywgYjogUGFyYW1zKTogYm9vbGVhbiB7XG4gIC8vIENhc3RpbmcgT2JqZWN0LmtleXMgcmV0dXJuIHZhbHVlcyB0byBpbmNsdWRlIGB1bmRlZmluZWRgIGFzIHRoZXJlIGFyZSBzb21lIGNhc2VzXG4gIC8vIGluIElFIDExIHdoZXJlIHRoaXMgY2FuIGhhcHBlbi4gQ2Fubm90IHByb3ZpZGUgYSB0ZXN0IGJlY2F1c2UgdGhlIGJlaGF2aW9yIG9ubHlcbiAgLy8gZXhpc3RzIGluIGNlcnRhaW4gY2lyY3Vtc3RhbmNlcyBpbiBJRSAxMSwgdGhlcmVmb3JlIGRvaW5nIHRoaXMgY2FzdCBlbnN1cmVzIHRoZVxuICAvLyBsb2dpYyBpcyBjb3JyZWN0IGZvciB3aGVuIHRoaXMgZWRnZSBjYXNlIGlzIGhpdC5cbiAgY29uc3QgazEgPSBPYmplY3Qua2V5cyhhKSBhcyBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcbiAgY29uc3QgazIgPSBPYmplY3Qua2V5cyhiKSBhcyBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcbiAgaWYgKCFrMSB8fCAhazIgfHwgazEubGVuZ3RoICE9IGsyLmxlbmd0aCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBsZXQga2V5OiBzdHJpbmc7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgazEubGVuZ3RoOyBpKyspIHtcbiAgICBrZXkgPSBrMVtpXTtcbiAgICBpZiAoIWVxdWFsQXJyYXlzT3JTdHJpbmcoYVtrZXldLCBiW2tleV0pKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIFRlc3QgZXF1YWxpdHkgZm9yIGFycmF5cyBvZiBzdHJpbmdzIG9yIGEgc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXF1YWxBcnJheXNPclN0cmluZyhhOiBzdHJpbmcgfCBzdHJpbmdbXSwgYjogc3RyaW5nIHwgc3RyaW5nW10pIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkoYSkgJiYgQXJyYXkuaXNBcnJheShiKSkge1xuICAgIGlmIChhLmxlbmd0aCAhPSBiLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiBhLmV2ZXJ5KGFJdGVtID0+IGIuaW5kZXhPZihhSXRlbSkgPiAtMSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGEgPT09IGI7XG4gIH1cbn1cblxuLyoqXG4gKiBGbGF0dGVucyBzaW5nbGUtbGV2ZWwgbmVzdGVkIGFycmF5cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZsYXR0ZW48VD4oYXJyOiBUW11bXSk6IFRbXSB7XG4gIHJldHVybiBBcnJheS5wcm90b3R5cGUuY29uY2F0LmFwcGx5KFtdLCBhcnIpO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgbGFzdCBlbGVtZW50IG9mIGFuIGFycmF5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbGFzdDxUPihhOiBUW10pOiBUfG51bGwge1xuICByZXR1cm4gYS5sZW5ndGggPiAwID8gYVthLmxlbmd0aCAtIDFdIDogbnVsbDtcbn1cblxuLyoqXG4gKiBWZXJpZnlzIGFsbCBib29sZWFucyBpbiBhbiBhcnJheSBhcmUgYHRydWVgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYW5kKGJvb2xzOiBib29sZWFuW10pOiBib29sZWFuIHtcbiAgcmV0dXJuICFib29scy5zb21lKHYgPT4gIXYpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9yRWFjaDxLLCBWPihtYXA6IHtba2V5OiBzdHJpbmddOiBWfSwgY2FsbGJhY2s6ICh2OiBWLCBrOiBzdHJpbmcpID0+IHZvaWQpOiB2b2lkIHtcbiAgZm9yIChjb25zdCBwcm9wIGluIG1hcCkge1xuICAgIGlmIChtYXAuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgIGNhbGxiYWNrKG1hcFtwcm9wXSwgcHJvcCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3YWl0Rm9yTWFwPEEsIEI+KFxuICAgIG9iajoge1trOiBzdHJpbmddOiBBfSwgZm46IChrOiBzdHJpbmcsIGE6IEEpID0+IE9ic2VydmFibGU8Qj4pOiBPYnNlcnZhYmxlPHtbazogc3RyaW5nXTogQn0+IHtcbiAgaWYgKE9iamVjdC5rZXlzKG9iaikubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG9mICh7fSk7XG4gIH1cblxuICBjb25zdCB3YWl0SGVhZDogT2JzZXJ2YWJsZTxCPltdID0gW107XG4gIGNvbnN0IHdhaXRUYWlsOiBPYnNlcnZhYmxlPEI+W10gPSBbXTtcbiAgY29uc3QgcmVzOiB7W2s6IHN0cmluZ106IEJ9ID0ge307XG5cbiAgZm9yRWFjaChvYmosIChhOiBBLCBrOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBtYXBwZWQgPSBmbihrLCBhKS5waXBlKG1hcCgocjogQikgPT4gcmVzW2tdID0gcikpO1xuICAgIGlmIChrID09PSBQUklNQVJZX09VVExFVCkge1xuICAgICAgd2FpdEhlYWQucHVzaChtYXBwZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3YWl0VGFpbC5wdXNoKG1hcHBlZCk7XG4gICAgfVxuICB9KTtcblxuICAvLyBDbG9zdXJlIGNvbXBpbGVyIGhhcyBwcm9ibGVtIHdpdGggdXNpbmcgc3ByZWFkIG9wZXJhdG9yIGhlcmUuIFNvIHdlIHVzZSBcIkFycmF5LmNvbmNhdFwiLlxuICAvLyBOb3RlIHRoYXQgd2UgYWxzbyBuZWVkIHRvIGNhc3QgdGhlIG5ldyBwcm9taXNlIGJlY2F1c2UgVHlwZVNjcmlwdCBjYW5ub3QgaW5mZXIgdGhlIHR5cGVcbiAgLy8gd2hlbiBjYWxsaW5nIHRoZSBcIm9mXCIgZnVuY3Rpb24gdGhyb3VnaCBcIkZ1bmN0aW9uLmFwcGx5XCJcbiAgcmV0dXJuIChvZiAuYXBwbHkobnVsbCwgd2FpdEhlYWQuY29uY2F0KHdhaXRUYWlsKSkgYXMgT2JzZXJ2YWJsZTxPYnNlcnZhYmxlPEI+PilcbiAgICAgIC5waXBlKGNvbmNhdEFsbCgpLCBsYXN0VmFsdWUoKSwgbWFwKCgpID0+IHJlcykpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JhcEludG9PYnNlcnZhYmxlPFQ+KHZhbHVlOiBUIHwgUHJvbWlzZTxUPnwgT2JzZXJ2YWJsZTxUPik6IE9ic2VydmFibGU8VD4ge1xuICBpZiAoaXNPYnNlcnZhYmxlKHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIGlmIChpc1Byb21pc2UodmFsdWUpKSB7XG4gICAgLy8gVXNlIGBQcm9taXNlLnJlc29sdmUoKWAgdG8gd3JhcCBwcm9taXNlLWxpa2UgaW5zdGFuY2VzLlxuICAgIC8vIFJlcXVpcmVkIGllIHdoZW4gYSBSZXNvbHZlciByZXR1cm5zIGEgQW5ndWxhckpTIGAkcWAgcHJvbWlzZSB0byBjb3JyZWN0bHkgdHJpZ2dlciB0aGVcbiAgICAvLyBjaGFuZ2UgZGV0ZWN0aW9uLlxuICAgIHJldHVybiBmcm9tKFByb21pc2UucmVzb2x2ZSh2YWx1ZSkpO1xuICB9XG5cbiAgcmV0dXJuIG9mICh2YWx1ZSk7XG59XG4iXX0=