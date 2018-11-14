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
    /** @type {?} */
    const k1 = Object.keys(a);
    /** @type {?} */
    const k2 = Object.keys(b);
    if (k1.length != k2.length) {
        return false;
    }
    /** @type {?} */
    let key;
    for (let i = 0; i < k1.length; i++) {
        key = k1[i];
        if (a[key] !== b[key]) {
            return false;
        }
    }
    return true;
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
    return !bools.some(v => !v);
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
    forEach(obj, (a, k) => {
        /** @type {?} */
        const mapped = fn(k, a).pipe(map((r) => res[k] = r));
        if (k === PRIMARY_OUTLET) {
            waitHead.push(mapped);
        }
        else {
            waitTail.push(mapped);
        }
    });
    // Closure compiler has problem with using spread operator here. So just using Array.concat.
    return of.apply(null, waitHead.concat(waitTail)).pipe(concatAll(), lastValue(), map(() => res));
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvdXRpbHMvY29sbGVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQVFBLE9BQU8sRUFBa0IsYUFBYSxJQUFJLFlBQVksRUFBRSxVQUFVLElBQUksU0FBUyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3RHLE9BQU8sRUFBYSxJQUFJLEVBQUUsRUFBRSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQzNDLE9BQU8sRUFBQyxTQUFTLEVBQUUsSUFBSSxJQUFJLFNBQVMsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUVqRSxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sV0FBVyxDQUFDOzs7Ozs7QUFFekMsTUFBTSxVQUFVLGtCQUFrQixDQUFDLENBQVEsRUFBRSxDQUFRO0lBQ25ELElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsTUFBTTtRQUFFLE9BQU8sS0FBSyxDQUFDO0lBQ3hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1FBQ2pDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO0tBQzdDO0lBQ0QsT0FBTyxJQUFJLENBQUM7Q0FDYjs7Ozs7O0FBRUQsTUFBTSxVQUFVLFlBQVksQ0FBQyxDQUFxQixFQUFFLENBQXFCOztJQUN2RSxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDOztJQUMxQixNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFCLElBQUksRUFBRSxDQUFD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LENBQUMsS0FBSyxDQUFDLEVBQUU7Ozs7UUFJcEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0tBQ3JDO0lBRUQsT0FBTyxFQUFFLENBQUUsS0FBSyxDQUFDLENBQUM7Q0FDbkIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TmdNb2R1bGVGYWN0b3J5LCDJtWlzT2JzZXJ2YWJsZSBhcyBpc09ic2VydmFibGUsIMm1aXNQcm9taXNlIGFzIGlzUHJvbWlzZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge09ic2VydmFibGUsIGZyb20sIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NvbmNhdEFsbCwgbGFzdCBhcyBsYXN0VmFsdWUsIG1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge1BSSU1BUllfT1VUTEVUfSBmcm9tICcuLi9zaGFyZWQnO1xuXG5leHBvcnQgZnVuY3Rpb24gc2hhbGxvd0VxdWFsQXJyYXlzKGE6IGFueVtdLCBiOiBhbnlbXSk6IGJvb2xlYW4ge1xuICBpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYS5sZW5ndGg7ICsraSkge1xuICAgIGlmICghc2hhbGxvd0VxdWFsKGFbaV0sIGJbaV0pKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaGFsbG93RXF1YWwoYToge1t4OiBzdHJpbmddOiBhbnl9LCBiOiB7W3g6IHN0cmluZ106IGFueX0pOiBib29sZWFuIHtcbiAgY29uc3QgazEgPSBPYmplY3Qua2V5cyhhKTtcbiAgY29uc3QgazIgPSBPYmplY3Qua2V5cyhiKTtcbiAgaWYgKGsxLmxlbmd0aCAhPSBrMi5sZW5ndGgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgbGV0IGtleTogc3RyaW5nO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGsxLmxlbmd0aDsgaSsrKSB7XG4gICAga2V5ID0gazFbaV07XG4gICAgaWYgKGFba2V5XSAhPT0gYltrZXldKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEZsYXR0ZW5zIHNpbmdsZS1sZXZlbCBuZXN0ZWQgYXJyYXlzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmxhdHRlbjxUPihhcnI6IFRbXVtdKTogVFtdIHtcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoW10sIGFycik7XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSBsYXN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsYXN0PFQ+KGE6IFRbXSk6IFR8bnVsbCB7XG4gIHJldHVybiBhLmxlbmd0aCA+IDAgPyBhW2EubGVuZ3RoIC0gMV0gOiBudWxsO1xufVxuXG4vKipcbiAqIFZlcmlmeXMgYWxsIGJvb2xlYW5zIGluIGFuIGFycmF5IGFyZSBgdHJ1ZWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhbmQoYm9vbHM6IGJvb2xlYW5bXSk6IGJvb2xlYW4ge1xuICByZXR1cm4gIWJvb2xzLnNvbWUodiA9PiAhdik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JFYWNoPEssIFY+KG1hcDoge1trZXk6IHN0cmluZ106IFZ9LCBjYWxsYmFjazogKHY6IFYsIGs6IHN0cmluZykgPT4gdm9pZCk6IHZvaWQge1xuICBmb3IgKGNvbnN0IHByb3AgaW4gbWFwKSB7XG4gICAgaWYgKG1hcC5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgY2FsbGJhY2sobWFwW3Byb3BdLCBwcm9wKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdhaXRGb3JNYXA8QSwgQj4oXG4gICAgb2JqOiB7W2s6IHN0cmluZ106IEF9LCBmbjogKGs6IHN0cmluZywgYTogQSkgPT4gT2JzZXJ2YWJsZTxCPik6IE9ic2VydmFibGU8e1trOiBzdHJpbmddOiBCfT4ge1xuICBpZiAoT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gb2YgKHt9KTtcbiAgfVxuXG4gIGNvbnN0IHdhaXRIZWFkOiBPYnNlcnZhYmxlPEI+W10gPSBbXTtcbiAgY29uc3Qgd2FpdFRhaWw6IE9ic2VydmFibGU8Qj5bXSA9IFtdO1xuICBjb25zdCByZXM6IHtbazogc3RyaW5nXTogQn0gPSB7fTtcblxuICBmb3JFYWNoKG9iaiwgKGE6IEEsIGs6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IG1hcHBlZCA9IGZuKGssIGEpLnBpcGUobWFwKChyOiBCKSA9PiByZXNba10gPSByKSk7XG4gICAgaWYgKGsgPT09IFBSSU1BUllfT1VUTEVUKSB7XG4gICAgICB3YWl0SGVhZC5wdXNoKG1hcHBlZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdhaXRUYWlsLnB1c2gobWFwcGVkKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIENsb3N1cmUgY29tcGlsZXIgaGFzIHByb2JsZW0gd2l0aCB1c2luZyBzcHJlYWQgb3BlcmF0b3IgaGVyZS4gU28ganVzdCB1c2luZyBBcnJheS5jb25jYXQuXG4gIHJldHVybiBvZiAuYXBwbHkobnVsbCwgd2FpdEhlYWQuY29uY2F0KHdhaXRUYWlsKSkucGlwZShjb25jYXRBbGwoKSwgbGFzdFZhbHVlKCksIG1hcCgoKSA9PiByZXMpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyYXBJbnRvT2JzZXJ2YWJsZTxUPih2YWx1ZTogVCB8IE5nTW9kdWxlRmFjdG9yeTxUPnwgUHJvbWlzZTxUPnwgT2JzZXJ2YWJsZTxUPikge1xuICBpZiAoaXNPYnNlcnZhYmxlKHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIGlmIChpc1Byb21pc2UodmFsdWUpKSB7XG4gICAgLy8gVXNlIGBQcm9taXNlLnJlc29sdmUoKWAgdG8gd3JhcCBwcm9taXNlLWxpa2UgaW5zdGFuY2VzLlxuICAgIC8vIFJlcXVpcmVkIGllIHdoZW4gYSBSZXNvbHZlciByZXR1cm5zIGEgQW5ndWxhckpTIGAkcWAgcHJvbWlzZSB0byBjb3JyZWN0bHkgdHJpZ2dlciB0aGVcbiAgICAvLyBjaGFuZ2UgZGV0ZWN0aW9uLlxuICAgIHJldHVybiBmcm9tKFByb21pc2UucmVzb2x2ZSh2YWx1ZSkpO1xuICB9XG5cbiAgcmV0dXJuIG9mICh2YWx1ZSk7XG59XG4iXX0=