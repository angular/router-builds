/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Route, UrlMatchResult } from './config';
import { UrlSegment, UrlSegmentGroup } from './url_tree';
/**
 * The primary routing outlet.
 *
 * @publicApi
 */
export declare const PRIMARY_OUTLET = "primary";
/**
 * A collection of matrix and query URL parameters.
 * @see `convertToParamMap()`
 * @see `ParamMap`
 *
 * @publicApi
 */
export declare type Params = {
    [key: string]: any;
};
/**
 * A map that provides access to the required and optional parameters
 * specific to a route.
 * The map supports retrieving a single value with `get()`
 * or multiple values with `getAll()`.
 *
 * @see [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
 *
 * @publicApi
 */
export interface ParamMap {
    /**
     * Reports whether the map contains a given parameter.
     * @param name The parameter name.
     * @returns True if the map contains the given parameter, false otherwise.
     */
    has(name: string): boolean;
    /**
     * Retrieves a single value for a parameter.
     * @param name The parameter name.
     * @return The parameter's single value,
     * or the first value if the parameter has multiple values,
     * or `null` when there is no such parameter.
     */
    get(name: string): string | null;
    /**
     * Retrieves multiple values for a parameter.
     * @param name The parameter name.
     * @return An array containing one or more values,
     * or an empty array if there is no such parameter.
     *
     */
    getAll(name: string): string[];
    /** Names of the parameters in the map. */
    readonly keys: string[];
}
/**
 * Converts a `Params` instance to a `ParamMap`.
 * @param params The instance to convert.
 * @returns The new map instance.
 *
 * @publicApi
 */
export declare function convertToParamMap(params: Params): ParamMap;
export declare function navigationCancelingError(message: string): Error;
export declare function isNavigationCancelingError(error: Error): any;
export declare function defaultUrlMatcher(segments: UrlSegment[], segmentGroup: UrlSegmentGroup, route: Route): UrlMatchResult | null;
