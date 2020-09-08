/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Route, Routes } from '../config';
export declare function validateConfig(config: Routes, parentPath?: string): void;
/**
 * Makes a copy of the config and adds any default required properties.
 */
export declare function standardizeConfig(r: Route): Route;
/** Returns of `Map` of outlet names to the `Route`s for that outlet. */
export declare function groupRoutesByOutlet(routes: Route[]): Map<string, Route[]>;
/** Returns the `route.outlet` or PRIMARY_OUTLET if none exists. */
export declare function getOutlet(route: Route): string;
