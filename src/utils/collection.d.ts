/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs';
import { Params } from '../shared';
export declare function shallowEqualArrays(a: any[], b: any[]): boolean;
export declare function shallowEqual(a: Params, b: Params): boolean;
/**
 * Test equality for arrays of strings or a string.
 */
export declare function equalArraysOrString(a: string | string[], b: string | string[]): boolean;
/**
 * Flattens single-level nested arrays.
 */
export declare function flatten<T>(arr: T[][]): T[];
/**
 * Return the last element of an array.
 */
export declare function last<T>(a: T[]): T | null;
/**
 * Verifys all booleans in an array are `true`.
 */
export declare function and(bools: boolean[]): boolean;
export declare function forEach<K, V>(map: {
    [key: string]: V;
}, callback: (v: V, k: string) => void): void;
export declare function wrapIntoObservable<T>(value: T | Promise<T> | Observable<T>): Observable<T>;
