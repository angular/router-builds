/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Route } from '../config';
import { UrlSegment, UrlSegmentGroup } from '../url_tree';
export interface MatchResult {
    matched: boolean;
    consumedSegments: UrlSegment[];
    lastChild: number;
    parameters: {
        [k: string]: string;
    };
    positionalParamSegments: {
        [k: string]: UrlSegment;
    };
}
export declare function match(segmentGroup: UrlSegmentGroup, route: Route, segments: UrlSegment[]): MatchResult;
export declare function split(segmentGroup: UrlSegmentGroup, consumedSegments: UrlSegment[], slicedSegments: UrlSegment[], config: Route[], relativeLinkResolution?: 'legacy' | 'corrected'): {
    segmentGroup: UrlSegmentGroup;
    slicedSegments: UrlSegment[];
};
/**
 * Determines if `route` is a path match for the `rawSegment`, `segments`, and `outlet` without
 * verifying that its children are a full match for the remainder of the `rawSegment` children as
 * well.
 */
export declare function isImmediateMatch(route: Route, rawSegment: UrlSegmentGroup, segments: UrlSegment[], outlet: string): boolean;
export declare function noLeftoversInUrl(segmentGroup: UrlSegmentGroup, segments: UrlSegment[], outlet: string): boolean;
