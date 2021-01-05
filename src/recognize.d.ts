/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Type } from '@angular/core';
import { Observable } from 'rxjs';
import { Route, Routes } from './config';
import { ActivatedRouteSnapshot, ParamsInheritanceStrategy, RouterStateSnapshot } from './router_state';
import { UrlSegment, UrlSegmentGroup, UrlTree } from './url_tree';
import { TreeNode } from './utils/tree';
export declare function recognize(rootComponentType: Type<any> | null, config: Routes, urlTree: UrlTree, url: string, paramsInheritanceStrategy?: ParamsInheritanceStrategy, relativeLinkResolution?: 'legacy' | 'corrected'): Observable<RouterStateSnapshot>;
export declare class Recognizer {
    private rootComponentType;
    private config;
    private urlTree;
    private url;
    private paramsInheritanceStrategy;
    private relativeLinkResolution;
    constructor(rootComponentType: Type<any> | null, config: Routes, urlTree: UrlTree, url: string, paramsInheritanceStrategy: ParamsInheritanceStrategy, relativeLinkResolution: 'legacy' | 'corrected');
    recognize(): RouterStateSnapshot | null;
    inheritParamsAndData(routeNode: TreeNode<ActivatedRouteSnapshot>): void;
    processSegmentGroup(config: Route[], segmentGroup: UrlSegmentGroup, outlet: string): TreeNode<ActivatedRouteSnapshot>[] | null;
    /**
     * Matches every child outlet in the `segmentGroup` to a `Route` in the config. Returns `null` if
     * we cannot find a match for _any_ of the children.
     *
     * @param config - The `Routes` to match against
     * @param segmentGroup - The `UrlSegmentGroup` whose children need to be matched against the
     *     config.
     */
    processChildren(config: Route[], segmentGroup: UrlSegmentGroup): TreeNode<ActivatedRouteSnapshot>[] | null;
    processSegment(config: Route[], segmentGroup: UrlSegmentGroup, segments: UrlSegment[], outlet: string): TreeNode<ActivatedRouteSnapshot>[] | null;
    processSegmentAgainstRoute(route: Route, rawSegment: UrlSegmentGroup, segments: UrlSegment[], outlet: string): TreeNode<ActivatedRouteSnapshot>[] | null;
}
