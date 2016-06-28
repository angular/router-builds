/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Type } from '@angular/core';
/**
 * @experimental
 */
export declare type RouterConfig = Route[];
/**
 * @experimental
 */
export declare type Data = {
    [name: string]: any;
};
/**
 * @experimental
 */
export declare type ResolveData = {
    [name: string]: any;
};
/**
 * @experimental
 */
export interface Route {
    path?: string;
    /**
     * @deprecated - use `pathMatch` instead
     */
    terminal?: boolean;
    pathMatch?: 'full' | 'prefix';
    component?: Type | string;
    outlet?: string;
    canActivate?: any[];
    canDeactivate?: any[];
    redirectTo?: string;
    children?: Route[];
    data?: Data;
    resolve?: ResolveData;
}
export declare function validateConfig(config: RouterConfig): void;
