/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { defaultUrlMatcher, PRIMARY_OUTLET } from '../shared';
import { UrlSegmentGroup } from '../url_tree';
import { forEach } from './collection';
import { getOutlet } from './config';
const noMatch = {
    matched: false,
    consumedSegments: [],
    lastChild: 0,
    parameters: {},
    positionalParamSegments: {}
};
export function match(segmentGroup, route, segments) {
    var _a;
    if (route.path === '') {
        if (route.pathMatch === 'full' && (segmentGroup.hasChildren() || segments.length > 0)) {
            return Object.assign({}, noMatch);
        }
        return {
            matched: true,
            consumedSegments: [],
            lastChild: 0,
            parameters: {},
            positionalParamSegments: {}
        };
    }
    const matcher = route.matcher || defaultUrlMatcher;
    const res = matcher(segments, segmentGroup, route);
    if (!res)
        return Object.assign({}, noMatch);
    const posParams = {};
    forEach(res.posParams, (v, k) => {
        posParams[k] = v.path;
    });
    const parameters = res.consumed.length > 0 ? Object.assign(Object.assign({}, posParams), res.consumed[res.consumed.length - 1].parameters) :
        posParams;
    return {
        matched: true,
        consumedSegments: res.consumed,
        lastChild: res.consumed.length,
        // TODO(atscott): investigate combining parameters and positionalParamSegments
        parameters,
        positionalParamSegments: (_a = res.posParams) !== null && _a !== void 0 ? _a : {}
    };
}
export function split(segmentGroup, consumedSegments, slicedSegments, config, relativeLinkResolution = 'corrected') {
    if (slicedSegments.length > 0 &&
        containsEmptyPathMatchesWithNamedOutlets(segmentGroup, slicedSegments, config)) {
        const s = new UrlSegmentGroup(consumedSegments, createChildrenForEmptyPaths(segmentGroup, consumedSegments, config, new UrlSegmentGroup(slicedSegments, segmentGroup.children)));
        s._sourceSegment = segmentGroup;
        s._segmentIndexShift = consumedSegments.length;
        return { segmentGroup: s, slicedSegments: [] };
    }
    if (slicedSegments.length === 0 &&
        containsEmptyPathMatches(segmentGroup, slicedSegments, config)) {
        const s = new UrlSegmentGroup(segmentGroup.segments, addEmptyPathsToChildrenIfNeeded(segmentGroup, consumedSegments, slicedSegments, config, segmentGroup.children, relativeLinkResolution));
        s._sourceSegment = segmentGroup;
        s._segmentIndexShift = consumedSegments.length;
        return { segmentGroup: s, slicedSegments };
    }
    const s = new UrlSegmentGroup(segmentGroup.segments, segmentGroup.children);
    s._sourceSegment = segmentGroup;
    s._segmentIndexShift = consumedSegments.length;
    return { segmentGroup: s, slicedSegments };
}
function addEmptyPathsToChildrenIfNeeded(segmentGroup, consumedSegments, slicedSegments, routes, children, relativeLinkResolution) {
    const res = {};
    for (const r of routes) {
        if (emptyPathMatch(segmentGroup, slicedSegments, r) && !children[getOutlet(r)]) {
            const s = new UrlSegmentGroup([], {});
            s._sourceSegment = segmentGroup;
            if (relativeLinkResolution === 'legacy') {
                s._segmentIndexShift = segmentGroup.segments.length;
            }
            else {
                s._segmentIndexShift = consumedSegments.length;
            }
            res[getOutlet(r)] = s;
        }
    }
    return Object.assign(Object.assign({}, children), res);
}
function createChildrenForEmptyPaths(segmentGroup, consumedSegments, routes, primarySegment) {
    const res = {};
    res[PRIMARY_OUTLET] = primarySegment;
    primarySegment._sourceSegment = segmentGroup;
    primarySegment._segmentIndexShift = consumedSegments.length;
    for (const r of routes) {
        if (r.path === '' && getOutlet(r) !== PRIMARY_OUTLET) {
            const s = new UrlSegmentGroup([], {});
            s._sourceSegment = segmentGroup;
            s._segmentIndexShift = consumedSegments.length;
            res[getOutlet(r)] = s;
        }
    }
    return res;
}
function containsEmptyPathMatchesWithNamedOutlets(segmentGroup, slicedSegments, routes) {
    return routes.some(r => emptyPathMatch(segmentGroup, slicedSegments, r) && getOutlet(r) !== PRIMARY_OUTLET);
}
function containsEmptyPathMatches(segmentGroup, slicedSegments, routes) {
    return routes.some(r => emptyPathMatch(segmentGroup, slicedSegments, r));
}
function emptyPathMatch(segmentGroup, slicedSegments, r) {
    if ((segmentGroup.hasChildren() || slicedSegments.length > 0) && r.pathMatch === 'full') {
        return false;
    }
    return r.path === '';
}
/**
 * Determines if `route` is a path match for the `rawSegment`, `segments`, and `outlet` without
 * verifying that its children are a full match for the remainder of the `rawSegment` children as
 * well.
 */
export function isImmediateMatch(route, rawSegment, segments, outlet) {
    // We allow matches to empty paths when the outlets differ so we can match a url like `/(b:b)` to
    // a config like
    // * `{path: '', children: [{path: 'b', outlet: 'b'}]}`
    // or even
    // * `{path: '', outlet: 'a', children: [{path: 'b', outlet: 'b'}]`
    //
    // The exception here is when the segment outlet is for the primary outlet. This would
    // result in a match inside the named outlet because all children there are written as primary
    // outlets. So we need to prevent child named outlet matches in a url like `/b` in a config like
    // * `{path: '', outlet: 'x' children: [{path: 'b'}]}`
    // This should only match if the url is `/(x:b)`.
    if (getOutlet(route) !== outlet &&
        (outlet === PRIMARY_OUTLET || !emptyPathMatch(rawSegment, segments, route))) {
        return false;
    }
    if (route.path === '**') {
        return true;
    }
    return match(rawSegment, route, segments).matched;
}
export function noLeftoversInUrl(segmentGroup, segments, outlet) {
    return segments.length === 0 && !segmentGroup.children[outlet];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnX21hdGNoaW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy91dGlscy9jb25maWdfbWF0Y2hpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUFDLGlCQUFpQixFQUFFLGNBQWMsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUM1RCxPQUFPLEVBQWEsZUFBZSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBRXhELE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDckMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQVVuQyxNQUFNLE9BQU8sR0FBZ0I7SUFDM0IsT0FBTyxFQUFFLEtBQUs7SUFDZCxnQkFBZ0IsRUFBRSxFQUFFO0lBQ3BCLFNBQVMsRUFBRSxDQUFDO0lBQ1osVUFBVSxFQUFFLEVBQUU7SUFDZCx1QkFBdUIsRUFBRSxFQUFFO0NBQzVCLENBQUM7QUFFRixNQUFNLFVBQVUsS0FBSyxDQUNqQixZQUE2QixFQUFFLEtBQVksRUFBRSxRQUFzQjs7SUFDckUsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLEVBQUUsRUFBRTtRQUNyQixJQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUU7WUFDckYseUJBQVcsT0FBTyxFQUFFO1NBQ3JCO1FBRUQsT0FBTztZQUNMLE9BQU8sRUFBRSxJQUFJO1lBQ2IsZ0JBQWdCLEVBQUUsRUFBRTtZQUNwQixTQUFTLEVBQUUsQ0FBQztZQUNaLFVBQVUsRUFBRSxFQUFFO1lBQ2QsdUJBQXVCLEVBQUUsRUFBRTtTQUM1QixDQUFDO0tBQ0g7SUFFRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxJQUFJLGlCQUFpQixDQUFD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UUFBc0IsRUFBRSxNQUFjO0lBQ25GLGlHQUFpRztJQUNqRyxnQkFBZ0I7SUFDaEIsdURBQXVEO0lBQ3ZELFVBQVU7SUFDVixtRUFBbUU7SUFDbkUsRUFBRTtJQUNGLHNGQUFzRjtJQUN0Riw4RkFBOEY7SUFDOUYsZ0dBQWdHO0lBQ2hHLHNEQUFzRDtJQUN0RCxpREFBaUQ7SUFDakQsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssTUFBTTtRQUMzQixDQUFDLE1BQU0sS0FBSyxjQUFjLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFO1FBQy9FLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFDRCxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFDRCxPQUFPLEtBQUssQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUNwRCxDQUFDO0FBRUQsTUFBTSxVQUFVLGdCQUFnQixDQUM1QixZQUE2QixFQUFFLFFBQXNCLEVBQUUsTUFBYztJQUN2RSxPQUFPLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNqRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Um91dGV9IGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQge2RlZmF1bHRVcmxNYXRjaGVyLCBQUklNQVJZX09VVExFVH0gZnJvbSAnLi4vc2hhcmVkJztcbmltcG9ydCB7VXJsU2VnbWVudCwgVXJsU2VnbWVudEdyb3VwfSBmcm9tICcuLi91cmxfdHJlZSc7XG5cbmltcG9ydCB7Zm9yRWFjaH0gZnJvbSAnLi9jb2xsZWN0aW9uJztcbmltcG9ydCB7Z2V0T3V0bGV0fSBmcm9tICcuL2NvbmZpZyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hSZXN1bHQge1xuICBtYXRjaGVkOiBib29sZWFuO1xuICBjb25zdW1lZFNlZ21lbnRzOiBVcmxTZWdtZW50W107XG4gIGxhc3RDaGlsZDogbnVtYmVyO1xuICBwYXJhbWV0ZXJzOiB7W2s6IHN0cmluZ106IHN0cmluZ307XG4gIHBvc2l0aW9uYWxQYXJhbVNlZ21lbnRzOiB7W2s6IHN0cmluZ106IFVybFNlZ21lbnR9O1xufVxuXG5jb25zdCBub01hdGNoOiBNYXRjaFJlc3VsdCA9IHtcbiAgbWF0Y2hlZDogZmFsc2UsXG4gIGNvbnN1bWVkU2VnbWVudHM6IFtdLFxuICBsYXN0Q2hpbGQ6IDAsXG4gIHBhcmFtZXRlcnM6IHt9LFxuICBwb3NpdGlvbmFsUGFyYW1TZWdtZW50czoge31cbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXRjaChcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGU6IFJvdXRlLCBzZWdtZW50czogVXJsU2VnbWVudFtdKTogTWF0Y2hSZXN1bHQge1xuICBpZiAocm91dGUucGF0aCA9PT0gJycpIHtcbiAgICBpZiAocm91dGUucGF0aE1hdGNoID09PSAnZnVsbCcgJiYgKHNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpIHx8IHNlZ21lbnRzLmxlbmd0aCA+IDApKSB7XG4gICAgICByZXR1cm4gey4uLm5vTWF0Y2h9O1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBtYXRjaGVkOiB0cnVlLFxuICAgICAgY29uc3VtZWRTZWdtZW50czogW10sXG4gICAgICBsYXN0Q2hpbGQ6IDAsXG4gICAgICBwYXJhbWV0ZXJzOiB7fSxcbiAgICAgIHBvc2l0aW9uYWxQYXJhbVNlZ21lbnRzOiB7fVxuICAgIH07XG4gIH1cblxuICBjb25zdCBtYXRjaGVyID0gcm91dGUubWF0Y2hlciB8fCBkZWZhdWx0VXJsTWF0Y2hlcjtcbiAgY29uc3QgcmVzID0gbWF0Y2hlcihzZWdtZW50cywgc2VnbWVudEdyb3VwLCByb3V0ZSk7XG4gIGlmICghcmVzKSByZXR1cm4gey4uLm5vTWF0Y2h9O1xuXG4gIGNvbnN0IHBvc1BhcmFtczoge1tuOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIGZvckVhY2gocmVzLnBvc1BhcmFtcyEsICh2OiBVcmxTZWdtZW50LCBrOiBzdHJpbmcpID0+IHtcbiAgICBwb3NQYXJhbXNba10gPSB2LnBhdGg7XG4gIH0pO1xuICBjb25zdCBwYXJhbWV0ZXJzID0gcmVzLmNvbnN1bWVkLmxlbmd0aCA+IDAgP1xuICAgICAgey4uLnBvc1BhcmFtcywgLi4ucmVzLmNvbnN1bWVkW3Jlcy5jb25zdW1lZC5sZW5ndGggLSAxXS5wYXJhbWV0ZXJzfSA6XG4gICAgICBwb3NQYXJhbXM7XG5cbiAgcmV0dXJuIHtcbiAgICBtYXRjaGVkOiB0cnVlLFxuICAgIGNvbnN1bWVkU2VnbWVudHM6IHJlcy5jb25zdW1lZCxcbiAgICBsYXN0Q2hpbGQ6IHJlcy5jb25zdW1lZC5sZW5ndGgsXG4gICAgLy8gVE9ETyhhdHNjb3R0KTogaW52ZXN0aWdhdGUgY29tYmluaW5nIHBhcmFtZXRlcnMgYW5kIHBvc2l0aW9uYWxQYXJhbVNlZ21lbnRzXG4gICAgcGFyYW1ldGVycyxcbiAgICBwb3NpdGlvbmFsUGFyYW1TZWdtZW50czogcmVzLnBvc1BhcmFtcyA/PyB7fVxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3BsaXQoXG4gICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIGNvbnN1bWVkU2VnbWVudHM6IFVybFNlZ21lbnRbXSwgc2xpY2VkU2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICBjb25maWc6IFJvdXRlW10sIHJlbGF0aXZlTGlua1Jlc29sdXRpb246ICdsZWdhY3knfCdjb3JyZWN0ZWQnID0gJ2NvcnJlY3RlZCcpIHtcbiAgaWYgKHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA+IDAgJiZcbiAgICAgIGNvbnRhaW5zRW1wdHlQYXRoTWF0Y2hlc1dpdGhOYW1lZE91dGxldHMoc2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50cywgY29uZmlnKSkge1xuICAgIGNvbnN0IHMgPSBuZXcgVXJsU2VnbWVudEdyb3VwKFxuICAgICAgICBjb25zdW1lZFNlZ21lbnRzLFxuICAgICAgICBjcmVhdGVDaGlsZHJlbkZvckVtcHR5UGF0aHMoXG4gICAgICAgICAgICBzZWdtZW50R3JvdXAsIGNvbnN1bWVkU2VnbWVudHMsIGNvbmZpZyxcbiAgICAgICAgICAgIG5ldyBVcmxTZWdtZW50R3JvdXAoc2xpY2VkU2VnbWVudHMsIHNlZ21lbnRHcm91cC5jaGlsZHJlbikpKTtcbiAgICBzLl9zb3VyY2VTZWdtZW50ID0gc2VnbWVudEdyb3VwO1xuICAgIHMuX3NlZ21lbnRJbmRleFNoaWZ0ID0gY29uc3VtZWRTZWdtZW50cy5sZW5ndGg7XG4gICAgcmV0dXJuIHtzZWdtZW50R3JvdXA6IHMsIHNsaWNlZFNlZ21lbnRzOiBbXX07XG4gIH1cblxuICBpZiAoc2xpY2VkU2VnbWVudHMubGVuZ3RoID09PSAwICYmXG4gICAgICBjb250YWluc0VtcHR5UGF0aE1hdGNoZXMoc2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50cywgY29uZmlnKSkge1xuICAgIGNvbnN0IHMgPSBuZXcgVXJsU2VnbWVudEdyb3VwKFxuICAgICAgICBzZWdtZW50R3JvdXAuc2VnbWVudHMsXG4gICAgICAgIGFkZEVtcHR5UGF0aHNUb0NoaWxkcmVuSWZOZWVkZWQoXG4gICAgICAgICAgICBzZWdtZW50R3JvdXAsIGNvbnN1bWVkU2VnbWVudHMsIHNsaWNlZFNlZ21lbnRzLCBjb25maWcsIHNlZ21lbnRHcm91cC5jaGlsZHJlbixcbiAgICAgICAgICAgIHJlbGF0aXZlTGlua1Jlc29sdXRpb24pKTtcbiAgICBzLl9zb3VyY2VTZWdtZW50ID0gc2VnbWVudEdyb3VwO1xuICAgIHMuX3NlZ21lbnRJbmRleFNoaWZ0ID0gY29uc3VtZWRTZWdtZW50cy5sZW5ndGg7XG4gICAgcmV0dXJuIHtzZWdtZW50R3JvdXA6IHMsIHNsaWNlZFNlZ21lbnRzfTtcbiAgfVxuXG4gIGNvbnN0IHMgPSBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cC5zZWdtZW50cywgc2VnbWVudEdyb3VwLmNoaWxkcmVuKTtcbiAgcy5fc291cmNlU2VnbWVudCA9IHNlZ21lbnRHcm91cDtcbiAgcy5fc2VnbWVudEluZGV4U2hpZnQgPSBjb25zdW1lZFNlZ21lbnRzLmxlbmd0aDtcbiAgcmV0dXJuIHtzZWdtZW50R3JvdXA6IHMsIHNsaWNlZFNlZ21lbnRzfTtcbn1cblxuZnVuY3Rpb24gYWRkRW1wdHlQYXRoc1RvQ2hpbGRyZW5JZk5lZWRlZChcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgY29uc3VtZWRTZWdtZW50czogVXJsU2VnbWVudFtdLCBzbGljZWRTZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgIHJvdXRlczogUm91dGVbXSwgY2hpbGRyZW46IHtbbmFtZTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSxcbiAgICByZWxhdGl2ZUxpbmtSZXNvbHV0aW9uOiAnbGVnYWN5J3wnY29ycmVjdGVkJyk6IHtbbmFtZTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSB7XG4gIGNvbnN0IHJlczoge1tuYW1lOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gIGZvciAoY29uc3QgciBvZiByb3V0ZXMpIHtcbiAgICBpZiAoZW1wdHlQYXRoTWF0Y2goc2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50cywgcikgJiYgIWNoaWxkcmVuW2dldE91dGxldChyKV0pIHtcbiAgICAgIGNvbnN0IHMgPSBuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCB7fSk7XG4gICAgICBzLl9zb3VyY2VTZWdtZW50ID0gc2VnbWVudEdyb3VwO1xuICAgICAgaWYgKHJlbGF0aXZlTGlua1Jlc29sdXRpb24gPT09ICdsZWdhY3knKSB7XG4gICAgICAgIHMuX3NlZ21lbnRJbmRleFNoaWZ0ID0gc2VnbWVudEdyb3VwLnNlZ21lbnRzLmxlbmd0aDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMuX3NlZ21lbnRJbmRleFNoaWZ0ID0gY29uc3VtZWRTZWdtZW50cy5sZW5ndGg7XG4gICAgICB9XG4gICAgICByZXNbZ2V0T3V0bGV0KHIpXSA9IHM7XG4gICAgfVxuICB9XG4gIHJldHVybiB7Li4uY2hpbGRyZW4sIC4uLnJlc307XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUNoaWxkcmVuRm9yRW1wdHlQYXRocyhcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgY29uc3VtZWRTZWdtZW50czogVXJsU2VnbWVudFtdLCByb3V0ZXM6IFJvdXRlW10sXG4gICAgcHJpbWFyeVNlZ21lbnQ6IFVybFNlZ21lbnRHcm91cCk6IHtbbmFtZTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSB7XG4gIGNvbnN0IHJlczoge1tuYW1lOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gIHJlc1tQUklNQVJZX09VVExFVF0gPSBwcmltYXJ5U2VnbWVudDtcbiAgcHJpbWFyeVNlZ21lbnQuX3NvdXJjZVNlZ21lbnQgPSBzZWdtZW50R3JvdXA7XG4gIHByaW1hcnlTZWdtZW50Ll9zZWdtZW50SW5kZXhTaGlmdCA9IGNvbnN1bWVkU2VnbWVudHMubGVuZ3RoO1xuXG4gIGZvciAoY29uc3QgciBvZiByb3V0ZXMpIHtcbiAgICBpZiAoci5wYXRoID09PSAnJyAmJiBnZXRPdXRsZXQocikgIT09IFBSSU1BUllfT1VUTEVUKSB7XG4gICAgICBjb25zdCBzID0gbmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pO1xuICAgICAgcy5fc291cmNlU2VnbWVudCA9IHNlZ21lbnRHcm91cDtcbiAgICAgIHMuX3NlZ21lbnRJbmRleFNoaWZ0ID0gY29uc3VtZWRTZWdtZW50cy5sZW5ndGg7XG4gICAgICByZXNbZ2V0T3V0bGV0KHIpXSA9IHM7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXM7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zRW1wdHlQYXRoTWF0Y2hlc1dpdGhOYW1lZE91dGxldHMoXG4gICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzOiBVcmxTZWdtZW50W10sIHJvdXRlczogUm91dGVbXSk6IGJvb2xlYW4ge1xuICByZXR1cm4gcm91dGVzLnNvbWUoXG4gICAgICByID0+IGVtcHR5UGF0aE1hdGNoKHNlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHMsIHIpICYmIGdldE91dGxldChyKSAhPT0gUFJJTUFSWV9PVVRMRVQpO1xufVxuXG5mdW5jdGlvbiBjb250YWluc0VtcHR5UGF0aE1hdGNoZXMoXG4gICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzOiBVcmxTZWdtZW50W10sIHJvdXRlczogUm91dGVbXSk6IGJvb2xlYW4ge1xuICByZXR1cm4gcm91dGVzLnNvbWUociA9PiBlbXB0eVBhdGhNYXRjaChzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzLCByKSk7XG59XG5cbmZ1bmN0aW9uIGVtcHR5UGF0aE1hdGNoKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50czogVXJsU2VnbWVudFtdLCByOiBSb3V0ZSk6IGJvb2xlYW4ge1xuICBpZiAoKHNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpIHx8IHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA+IDApICYmIHIucGF0aE1hdGNoID09PSAnZnVsbCcpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gci5wYXRoID09PSAnJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIGByb3V0ZWAgaXMgYSBwYXRoIG1hdGNoIGZvciB0aGUgYHJhd1NlZ21lbnRgLCBgc2VnbWVudHNgLCBhbmQgYG91dGxldGAgd2l0aG91dFxuICogdmVyaWZ5aW5nIHRoYXQgaXRzIGNoaWxkcmVuIGFyZSBhIGZ1bGwgbWF0Y2ggZm9yIHRoZSByZW1haW5kZXIgb2YgdGhlIGByYXdTZWdtZW50YCBjaGlsZHJlbiBhc1xuICogd2VsbC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSW1tZWRpYXRlTWF0Y2goXG4gICAgcm91dGU6IFJvdXRlLCByYXdTZWdtZW50OiBVcmxTZWdtZW50R3JvdXAsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIC8vIFdlIGFsbG93IG1hdGNoZXMgdG8gZW1wdHkgcGF0aHMgd2hlbiB0aGUgb3V0bGV0cyBkaWZmZXIgc28gd2UgY2FuIG1hdGNoIGEgdXJsIGxpa2UgYC8oYjpiKWAgdG9cbiAgLy8gYSBjb25maWcgbGlrZVxuICAvLyAqIGB7cGF0aDogJycsIGNoaWxkcmVuOiBbe3BhdGg6ICdiJywgb3V0bGV0OiAnYid9XX1gXG4gIC8vIG9yIGV2ZW5cbiAgLy8gKiBge3BhdGg6ICcnLCBvdXRsZXQ6ICdhJywgY2hpbGRyZW46IFt7cGF0aDogJ2InLCBvdXRsZXQ6ICdiJ31dYFxuICAvL1xuICAvLyBUaGUgZXhjZXB0aW9uIGhlcmUgaXMgd2hlbiB0aGUgc2VnbWVudCBvdXRsZXQgaXMgZm9yIHRoZSBwcmltYXJ5IG91dGxldC4gVGhpcyB3b3VsZFxuICAvLyByZXN1bHQgaW4gYSBtYXRjaCBpbnNpZGUgdGhlIG5hbWVkIG91dGxldCBiZWNhdXNlIGFsbCBjaGlsZHJlbiB0aGVyZSBhcmUgd3JpdHRlbiBhcyBwcmltYXJ5XG4gIC8vIG91dGxldHMuIFNvIHdlIG5lZWQgdG8gcHJldmVudCBjaGlsZCBuYW1lZCBvdXRsZXQgbWF0Y2hlcyBpbiBhIHVybCBsaWtlIGAvYmAgaW4gYSBjb25maWcgbGlrZVxuICAvLyAqIGB7cGF0aDogJycsIG91dGxldDogJ3gnIGNoaWxkcmVuOiBbe3BhdGg6ICdiJ31dfWBcbiAgLy8gVGhpcyBzaG91bGQgb25seSBtYXRjaCBpZiB0aGUgdXJsIGlzIGAvKHg6YilgLlxuICBpZiAoZ2V0T3V0bGV0KHJvdXRlKSAhPT0gb3V0bGV0ICYmXG4gICAgICAob3V0bGV0ID09PSBQUklNQVJZX09VVExFVCB8fCAhZW1wdHlQYXRoTWF0Y2gocmF3U2VnbWVudCwgc2VnbWVudHMsIHJvdXRlKSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKHJvdXRlLnBhdGggPT09ICcqKicpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gbWF0Y2gocmF3U2VnbWVudCwgcm91dGUsIHNlZ21lbnRzKS5tYXRjaGVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9MZWZ0b3ZlcnNJblVybChcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgb3V0bGV0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIHNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiAhc2VnbWVudEdyb3VwLmNoaWxkcmVuW291dGxldF07XG59XG4iXX0=