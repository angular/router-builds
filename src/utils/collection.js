/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs/Observable';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { of } from 'rxjs/observable/of';
import { concatAll } from 'rxjs/operator/concatAll';
import { every } from 'rxjs/operator/every';
import * as l from 'rxjs/operator/last';
import { map } from 'rxjs/operator/map';
import { mergeAll } from 'rxjs/operator/mergeAll';
import { PRIMARY_OUTLET } from '../shared';
/**
 * @param {?} a
 * @param {?} b
 * @return {?}
 */
export function shallowEqualArrays(a, b) {
    if (a.length !== b.length)
        return false;
    for (let /** @type {?} */ i = 0; i < a.length; ++i) {
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
    const /** @type {?} */ k1 = Object.keys(a);
    const /** @type {?} */ k2 = Object.keys(b);
    if (k1.length != k2.length) {
        return false;
    }
    let /** @type {?} */ key;
    for (let /** @type {?} */ i = 0; i < k1.length; i++) {
        key = k1[i];
        if (a[key] !== b[key]) {
            return false;
        }
    }
    return true;
}
/**
 * @param {?} a
 * @return {?}
 */
export function flatten(a) {
    const /** @type {?} */ target = [];
    for (let /** @type {?} */ i = 0; i < a.length; ++i) {
        for (let /** @type {?} */ j = 0; j < a[i].length; ++j) {
            target.push(a[i][j]);
        }
    }
    return target;
}
/**
 * @param {?} a
 * @return {?}
 */
export function first(a) {
    return a.length > 0 ? a[0] : null;
}
/**
 * @param {?} a
 * @return {?}
 */
export function last(a) {
    return a.length > 0 ? a[a.length - 1] : null;
}
/**
 * @param {?} bools
 * @return {?}
 */
export function and(bools) {
    return !bools.some(v => !v);
}
/**
 * @param {?} m1
 * @param {?} m2
 * @return {?}
 */
export function merge(m1, m2) {
    const /** @type {?} */ m = {};
    for (const attr in m1) {
        if (m1.hasOwnProperty(attr)) {
            m[attr] = m1[attr];
        }
    }
    for (const attr in m2) {
        if (m2.hasOwnProperty(attr)) {
            m[attr] = m2[attr];
        }
    }
    return m;
}
/**
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
 * @param {?} obj
 * @param {?} fn
 * @return {?}
 */
export function waitForMap(obj, fn) {
    const /** @type {?} */ waitFor = [];
    const /** @type {?} */ res = {};
    forEach(obj, (a, k) => {
        if (k === PRIMARY_OUTLET) {
            waitFor.push(map.call(fn(k, a), (_) => {
                res[k] = _;
                return _;
            }));
        }
    });
    forEach(obj, (a, k) => {
        if (k !== PRIMARY_OUTLET) {
            waitFor.push(map.call(fn(k, a), (_) => {
                res[k] = _;
                return _;
            }));
        }
    });
    if (waitFor.length > 0) {
        const /** @type {?} */ concatted$ = concatAll.call(of(...waitFor));
        const /** @type {?} */ last$ = l.last.call(concatted$);
        return map.call(last$, () => res);
    }
    return of(res);
}
/**
 * @param {?} observables
 * @return {?}
 */
export function andObservables(observables) {
    const /** @type {?} */ merged$ = mergeAll.call(observables);
    return every.call(merged$, (result) => result === true);
}
/**
 * @param {?} value
 * @return {?}
 */
export function wrapIntoObservable(value) {
    if (value instanceof Observable) {
        return value;
    }
    if (value instanceof Promise) {
        return fromPromise(value);
    }
    return of(value);
}
//# sourceMappingURL=collection.js.map