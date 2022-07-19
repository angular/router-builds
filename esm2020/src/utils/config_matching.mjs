/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { runCanMatchGuards } from '../operators/check_guards';
import { defaultUrlMatcher, PRIMARY_OUTLET } from '../shared';
import { UrlSegmentGroup } from '../url_tree';
import { forEach } from './collection';
import { getOrCreateRouteInjectorIfNeeded, getOutlet } from './config';
const noMatch = {
    matched: false,
    consumedSegments: [],
    remainingSegments: [],
    parameters: {},
    positionalParamSegments: {}
};
export function matchWithChecks(segmentGroup, route, segments, injector, urlSerializer) {
    const result = match(segmentGroup, route, segments);
    if (!result.matched) {
        return of(result);
    }
    // Only create the Route's `EnvironmentInjector` if it matches the attempted
    // navigation
    injector = getOrCreateRouteInjectorIfNeeded(route, injector);
    return runCanMatchGuards(injector, route, segments, urlSerializer)
        .pipe(map((v) => v === true ? result : { ...noMatch }));
}
export function match(segmentGroup, route, segments) {
    if (route.path === '') {
        if (route.pathMatch === 'full' && (segmentGroup.hasChildren() || segments.length > 0)) {
            return { ...noMatch };
        }
        return {
            matched: true,
            consumedSegments: [],
            remainingSegments: segments,
            parameters: {},
            positionalParamSegments: {}
        };
    }
    const matcher = route.matcher || defaultUrlMatcher;
    const res = matcher(segments, segmentGroup, route);
    if (!res)
        return { ...noMatch };
    const posParams = {};
    forEach(res.posParams, (v, k) => {
        posParams[k] = v.path;
    });
    const parameters = res.consumed.length > 0 ?
        { ...posParams, ...res.consumed[res.consumed.length - 1].parameters } :
        posParams;
    return {
        matched: true,
        consumedSegments: res.consumed,
        remainingSegments: segments.slice(res.consumed.length),
        // TODO(atscott): investigate combining parameters and positionalParamSegments
        parameters,
        positionalParamSegments: res.posParams ?? {}
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
                if (typeof ngDevMode === 'undefined' || !!ngDevMode) {
                    s._segmentIndexShiftCorrected = consumedSegments.length;
                }
            }
            else {
                s._segmentIndexShift = consumedSegments.length;
            }
            res[getOutlet(r)] = s;
        }
    }
    return { ...children, ...res };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnX21hdGNoaW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy91dGlscy9jb25maWdfbWF0Y2hpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUFhLEVBQUUsRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUNwQyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFHbkMsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFDNUQsT0FBTyxFQUFDLGlCQUFpQixFQUFFLGNBQWMsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUM1RCxPQUFPLEVBQWEsZUFBZSxFQUFnQixNQUFNLGFBQWEsQ0FBQztBQUV2RSxPQUFPLEVBQUMsT0FBTyxFQUFDLE1BQU0sY0FBYyxDQUFDO0FBQ3JDLE9BQU8sRUFBQyxnQ0FBZ0MsRUFBRSxTQUFTLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFVckUsTUFBTSxPQUFPLEdBQWdCO0lBQzNCLE9BQU8sRUFBRSxLQUFLO0lBQ2QsZ0JBQWdCLEVBQUUsRUFBRTtJQUNwQixpQkFBaUIsRUFBRSxFQUFFO0lBQ3JCLFVBQVUsRUFBRSxFQUFFO0lBQ2QsdUJBQXVCLEVBQUUsRUFBRTtDQUM1QixDQUFDO0FBRUYsTUFBTSxVQUFVLGVBQWUsQ0FDM0IsWUFBNkIsRUFBRSxLQUFZLEVBQUUsUUFBc0IsRUFDbkUsUUFBNkIsRUFBRSxhQUE0QjtJQUM3RCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNwRCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRTtRQUNuQixPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUNuQjtJQUVELDRFQUE0RTtJQUM1RSxhQUFhO0lBQ2IsUUFBUSxHQUFHLGdDQUFnQyxD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LHVEQUF1RDtJQUN2RCxVQUFVO0lBQ1YsbUVBQW1FO0lBQ25FLEVBQUU7SUFDRixzRkFBc0Y7SUFDdEYsOEZBQThGO0lBQzlGLGdHQUFnRztJQUNoRyxzREFBc0Q7SUFDdEQsaURBQWlEO0lBQ2pELElBQUksU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLE1BQU07UUFDM0IsQ0FBQyxNQUFNLEtBQUssY0FBYyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRTtRQUMvRSxPQUFPLEtBQUssQ0FBQztLQUNkO0lBQ0QsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtRQUN2QixPQUFPLElBQUksQ0FBQztLQUNiO0lBQ0QsT0FBTyxLQUFLLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDcEQsQ0FBQztBQUVELE1BQU0sVUFBVSxnQkFBZ0IsQ0FDNUIsWUFBNkIsRUFBRSxRQUFzQixFQUFFLE1BQWM7SUFDdkUsT0FBTyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDakUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0Vudmlyb25tZW50SW5qZWN0b3IsIEluamVjdG9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgb2Z9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtSb3V0ZX0gZnJvbSAnLi4vbW9kZWxzJztcbmltcG9ydCB7cnVuQ2FuTWF0Y2hHdWFyZHN9IGZyb20gJy4uL29wZXJhdG9ycy9jaGVja19ndWFyZHMnO1xuaW1wb3J0IHtkZWZhdWx0VXJsTWF0Y2hlciwgUFJJTUFSWV9PVVRMRVR9IGZyb20gJy4uL3NoYXJlZCc7XG5pbXBvcnQge1VybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cCwgVXJsU2VyaWFsaXplcn0gZnJvbSAnLi4vdXJsX3RyZWUnO1xuXG5pbXBvcnQge2ZvckVhY2h9IGZyb20gJy4vY29sbGVjdGlvbic7XG5pbXBvcnQge2dldE9yQ3JlYXRlUm91dGVJbmplY3RvcklmTmVlZGVkLCBnZXRPdXRsZXR9IGZyb20gJy4vY29uZmlnJztcblxuZXhwb3J0IGludGVyZmFjZSBNYXRjaFJlc3VsdCB7XG4gIG1hdGNoZWQ6IGJvb2xlYW47XG4gIGNvbnN1bWVkU2VnbWVudHM6IFVybFNlZ21lbnRbXTtcbiAgcmVtYWluaW5nU2VnbWVudHM6IFVybFNlZ21lbnRbXTtcbiAgcGFyYW1ldGVyczoge1trOiBzdHJpbmddOiBzdHJpbmd9O1xuICBwb3NpdGlvbmFsUGFyYW1TZWdtZW50czoge1trOiBzdHJpbmddOiBVcmxTZWdtZW50fTtcbn1cblxuY29uc3Qgbm9NYXRjaDogTWF0Y2hSZXN1bHQgPSB7XG4gIG1hdGNoZWQ6IGZhbHNlLFxuICBjb25zdW1lZFNlZ21lbnRzOiBbXSxcbiAgcmVtYWluaW5nU2VnbWVudHM6IFtdLFxuICBwYXJhbWV0ZXJzOiB7fSxcbiAgcG9zaXRpb25hbFBhcmFtU2VnbWVudHM6IHt9XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hXaXRoQ2hlY2tzKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIpOiBPYnNlcnZhYmxlPE1hdGNoUmVzdWx0PiB7XG4gIGNvbnN0IHJlc3VsdCA9IG1hdGNoKHNlZ21lbnRHcm91cCwgcm91dGUsIHNlZ21lbnRzKTtcbiAgaWYgKCFyZXN1bHQubWF0Y2hlZCkge1xuICAgIHJldHVybiBvZihyZXN1bHQpO1xuICB9XG5cbiAgLy8gT25seSBjcmVhdGUgdGhlIFJvdXRlJ3MgYEVudmlyb25tZW50SW5qZWN0b3JgIGlmIGl0IG1hdGNoZXMgdGhlIGF0dGVtcHRlZFxuICAvLyBuYXZpZ2F0aW9uXG4gIGluamVjdG9yID0gZ2V0T3JDcmVhdGVSb3V0ZUluamVjdG9ySWZOZWVkZWQocm91dGUsIGluamVjdG9yKTtcbiAgcmV0dXJuIHJ1bkNhbk1hdGNoR3VhcmRzKGluamVjdG9yLCByb3V0ZSwgc2VnbWVudHMsIHVybFNlcmlhbGl6ZXIpXG4gICAgICAucGlwZShcbiAgICAgICAgICBtYXAoKHYpID0+IHYgPT09IHRydWUgPyByZXN1bHQgOiB7Li4ubm9NYXRjaH0pLFxuICAgICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pOiBNYXRjaFJlc3VsdCB7XG4gIGlmIChyb3V0ZS5wYXRoID09PSAnJykge1xuICAgIGlmIChyb3V0ZS5wYXRoTWF0Y2ggPT09ICdmdWxsJyAmJiAoc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkgfHwgc2VnbWVudHMubGVuZ3RoID4gMCkpIHtcbiAgICAgIHJldHVybiB7Li4ubm9NYXRjaH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG1hdGNoZWQ6IHRydWUsXG4gICAgICBjb25zdW1lZFNlZ21lbnRzOiBbXSxcbiAgICAgIHJlbWFpbmluZ1NlZ21lbnRzOiBzZWdtZW50cyxcbiAgICAgIHBhcmFtZXRlcnM6IHt9LFxuICAgICAgcG9zaXRpb25hbFBhcmFtU2VnbWVudHM6IHt9XG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IG1hdGNoZXIgPSByb3V0ZS5tYXRjaGVyIHx8IGRlZmF1bHRVcmxNYXRjaGVyO1xuICBjb25zdCByZXMgPSBtYXRjaGVyKHNlZ21lbnRzLCBzZWdtZW50R3JvdXAsIHJvdXRlKTtcbiAgaWYgKCFyZXMpIHJldHVybiB7Li4ubm9NYXRjaH07XG5cbiAgY29uc3QgcG9zUGFyYW1zOiB7W246IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgZm9yRWFjaChyZXMucG9zUGFyYW1zISwgKHY6IFVybFNlZ21lbnQsIGs6IHN0cmluZykgPT4ge1xuICAgIHBvc1BhcmFtc1trXSA9IHYucGF0aDtcbiAgfSk7XG4gIGNvbnN0IHBhcmFtZXRlcnMgPSByZXMuY29uc3VtZWQubGVuZ3RoID4gMCA/XG4gICAgICB7Li4ucG9zUGFyYW1zLCAuLi5yZXMuY29uc3VtZWRbcmVzLmNvbnN1bWVkLmxlbmd0aCAtIDFdLnBhcmFtZXRlcnN9IDpcbiAgICAgIHBvc1BhcmFtcztcblxuICByZXR1cm4ge1xuICAgIG1hdGNoZWQ6IHRydWUsXG4gICAgY29uc3VtZWRTZWdtZW50czogcmVzLmNvbnN1bWVkLFxuICAgIHJlbWFpbmluZ1NlZ21lbnRzOiBzZWdtZW50cy5zbGljZShyZXMuY29uc3VtZWQubGVuZ3RoKSxcbiAgICAvLyBUT0RPKGF0c2NvdHQpOiBpbnZlc3RpZ2F0ZSBjb21iaW5pbmcgcGFyYW1ldGVycyBhbmQgcG9zaXRpb25hbFBhcmFtU2VnbWVudHNcbiAgICBwYXJhbWV0ZXJzLFxuICAgIHBvc2l0aW9uYWxQYXJhbVNlZ21lbnRzOiByZXMucG9zUGFyYW1zID8/IHt9XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzcGxpdChcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgY29uc3VtZWRTZWdtZW50czogVXJsU2VnbWVudFtdLCBzbGljZWRTZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgIGNvbmZpZzogUm91dGVbXSwgcmVsYXRpdmVMaW5rUmVzb2x1dGlvbjogJ2xlZ2FjeSd8J2NvcnJlY3RlZCcgPSAnY29ycmVjdGVkJykge1xuICBpZiAoc2xpY2VkU2VnbWVudHMubGVuZ3RoID4gMCAmJlxuICAgICAgY29udGFpbnNFbXB0eVBhdGhNYXRjaGVzV2l0aE5hbWVkT3V0bGV0cyhzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzLCBjb25maWcpKSB7XG4gICAgY29uc3QgcyA9IG5ldyBVcmxTZWdtZW50R3JvdXAoXG4gICAgICAgIGNvbnN1bWVkU2VnbWVudHMsXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuRm9yRW1wdHlQYXRocyhcbiAgICAgICAgICAgIHNlZ21lbnRHcm91cCwgY29uc3VtZWRTZWdtZW50cywgY29uZmlnLFxuICAgICAgICAgICAgbmV3IFVybFNlZ21lbnRHcm91cChzbGljZWRTZWdtZW50cywgc2VnbWVudEdyb3VwLmNoaWxkcmVuKSkpO1xuICAgIHMuX3NvdXJjZVNlZ21lbnQgPSBzZWdtZW50R3JvdXA7XG4gICAgcy5fc2VnbWVudEluZGV4U2hpZnQgPSBjb25zdW1lZFNlZ21lbnRzLmxlbmd0aDtcbiAgICByZXR1cm4ge3NlZ21lbnRHcm91cDogcywgc2xpY2VkU2VnbWVudHM6IFtdfTtcbiAgfVxuXG4gIGlmIChzbGljZWRTZWdtZW50cy5sZW5ndGggPT09IDAgJiZcbiAgICAgIGNvbnRhaW5zRW1wdHlQYXRoTWF0Y2hlcyhzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzLCBjb25maWcpKSB7XG4gICAgY29uc3QgcyA9IG5ldyBVcmxTZWdtZW50R3JvdXAoXG4gICAgICAgIHNlZ21lbnRHcm91cC5zZWdtZW50cyxcbiAgICAgICAgYWRkRW1wdHlQYXRoc1RvQ2hpbGRyZW5JZk5lZWRlZChcbiAgICAgICAgICAgIHNlZ21lbnRHcm91cCwgY29uc3VtZWRTZWdtZW50cywgc2xpY2VkU2VnbWVudHMsIGNvbmZpZywgc2VnbWVudEdyb3VwLmNoaWxkcmVuLFxuICAgICAgICAgICAgcmVsYXRpdmVMaW5rUmVzb2x1dGlvbikpO1xuICAgIHMuX3NvdXJjZVNlZ21lbnQgPSBzZWdtZW50R3JvdXA7XG4gICAgcy5fc2VnbWVudEluZGV4U2hpZnQgPSBjb25zdW1lZFNlZ21lbnRzLmxlbmd0aDtcbiAgICByZXR1cm4ge3NlZ21lbnRHcm91cDogcywgc2xpY2VkU2VnbWVudHN9O1xuICB9XG5cbiAgY29uc3QgcyA9IG5ldyBVcmxTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLCBzZWdtZW50R3JvdXAuY2hpbGRyZW4pO1xuICBzLl9zb3VyY2VTZWdtZW50ID0gc2VnbWVudEdyb3VwO1xuICBzLl9zZWdtZW50SW5kZXhTaGlmdCA9IGNvbnN1bWVkU2VnbWVudHMubGVuZ3RoO1xuICByZXR1cm4ge3NlZ21lbnRHcm91cDogcywgc2xpY2VkU2VnbWVudHN9O1xufVxuXG5mdW5jdGlvbiBhZGRFbXB0eVBhdGhzVG9DaGlsZHJlbklmTmVlZGVkKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBjb25zdW1lZFNlZ21lbnRzOiBVcmxTZWdtZW50W10sIHNsaWNlZFNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgcm91dGVzOiBSb3V0ZVtdLCBjaGlsZHJlbjoge1tuYW1lOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9LFxuICAgIHJlbGF0aXZlTGlua1Jlc29sdXRpb246ICdsZWdhY3knfCdjb3JyZWN0ZWQnKToge1tuYW1lOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9IHtcbiAgY29uc3QgcmVzOiB7W25hbWU6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0gPSB7fTtcbiAgZm9yIChjb25zdCByIG9mIHJvdXRlcykge1xuICAgIGlmIChlbXB0eVBhdGhNYXRjaChzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzLCByKSAmJiAhY2hpbGRyZW5bZ2V0T3V0bGV0KHIpXSkge1xuICAgICAgY29uc3QgcyA9IG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KTtcbiAgICAgIHMuX3NvdXJjZVNlZ21lbnQgPSBzZWdtZW50R3JvdXA7XG4gICAgICBpZiAocmVsYXRpdmVMaW5rUmVzb2x1dGlvbiA9PT0gJ2xlZ2FjeScpIHtcbiAgICAgICAgcy5fc2VnbWVudEluZGV4U2hpZnQgPSBzZWdtZW50R3JvdXAuc2VnbWVudHMubGVuZ3RoO1xuICAgICAgICBpZiAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgISFuZ0Rldk1vZGUpIHtcbiAgICAgICAgICBzLl9zZWdtZW50SW5kZXhTaGlmdENvcnJlY3RlZCA9IGNvbnN1bWVkU2VnbWVudHMubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzLl9zZWdtZW50SW5kZXhTaGlmdCA9IGNvbnN1bWVkU2VnbWVudHMubGVuZ3RoO1xuICAgICAgfVxuICAgICAgcmVzW2dldE91dGxldChyKV0gPSBzO1xuICAgIH1cbiAgfVxuICByZXR1cm4gey4uLmNoaWxkcmVuLCAuLi5yZXN9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVDaGlsZHJlbkZvckVtcHR5UGF0aHMoXG4gICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIGNvbnN1bWVkU2VnbWVudHM6IFVybFNlZ21lbnRbXSwgcm91dGVzOiBSb3V0ZVtdLFxuICAgIHByaW1hcnlTZWdtZW50OiBVcmxTZWdtZW50R3JvdXApOiB7W25hbWU6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0ge1xuICBjb25zdCByZXM6IHtbbmFtZTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICByZXNbUFJJTUFSWV9PVVRMRVRdID0gcHJpbWFyeVNlZ21lbnQ7XG4gIHByaW1hcnlTZWdtZW50Ll9zb3VyY2VTZWdtZW50ID0gc2VnbWVudEdyb3VwO1xuICBwcmltYXJ5U2VnbWVudC5fc2VnbWVudEluZGV4U2hpZnQgPSBjb25zdW1lZFNlZ21lbnRzLmxlbmd0aDtcblxuICBmb3IgKGNvbnN0IHIgb2Ygcm91dGVzKSB7XG4gICAgaWYgKHIucGF0aCA9PT0gJycgJiYgZ2V0T3V0bGV0KHIpICE9PSBQUklNQVJZX09VVExFVCkge1xuICAgICAgY29uc3QgcyA9IG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KTtcbiAgICAgIHMuX3NvdXJjZVNlZ21lbnQgPSBzZWdtZW50R3JvdXA7XG4gICAgICBzLl9zZWdtZW50SW5kZXhTaGlmdCA9IGNvbnN1bWVkU2VnbWVudHMubGVuZ3RoO1xuICAgICAgcmVzW2dldE91dGxldChyKV0gPSBzO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG5mdW5jdGlvbiBjb250YWluc0VtcHR5UGF0aE1hdGNoZXNXaXRoTmFtZWRPdXRsZXRzKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50czogVXJsU2VnbWVudFtdLCByb3V0ZXM6IFJvdXRlW10pOiBib29sZWFuIHtcbiAgcmV0dXJuIHJvdXRlcy5zb21lKFxuICAgICAgciA9PiBlbXB0eVBhdGhNYXRjaChzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzLCByKSAmJiBnZXRPdXRsZXQocikgIT09IFBSSU1BUllfT1VUTEVUKTtcbn1cblxuZnVuY3Rpb24gY29udGFpbnNFbXB0eVBhdGhNYXRjaGVzKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50czogVXJsU2VnbWVudFtdLCByb3V0ZXM6IFJvdXRlW10pOiBib29sZWFuIHtcbiAgcmV0dXJuIHJvdXRlcy5zb21lKHIgPT4gZW1wdHlQYXRoTWF0Y2goc2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50cywgcikpO1xufVxuXG5mdW5jdGlvbiBlbXB0eVBhdGhNYXRjaChcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHM6IFVybFNlZ21lbnRbXSwgcjogUm91dGUpOiBib29sZWFuIHtcbiAgaWYgKChzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSB8fCBzbGljZWRTZWdtZW50cy5sZW5ndGggPiAwKSAmJiByLnBhdGhNYXRjaCA9PT0gJ2Z1bGwnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHIucGF0aCA9PT0gJyc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiBgcm91dGVgIGlzIGEgcGF0aCBtYXRjaCBmb3IgdGhlIGByYXdTZWdtZW50YCwgYHNlZ21lbnRzYCwgYW5kIGBvdXRsZXRgIHdpdGhvdXRcbiAqIHZlcmlmeWluZyB0aGF0IGl0cyBjaGlsZHJlbiBhcmUgYSBmdWxsIG1hdGNoIGZvciB0aGUgcmVtYWluZGVyIG9mIHRoZSBgcmF3U2VnbWVudGAgY2hpbGRyZW4gYXNcbiAqIHdlbGwuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0ltbWVkaWF0ZU1hdGNoKFxuICAgIHJvdXRlOiBSb3V0ZSwgcmF3U2VnbWVudDogVXJsU2VnbWVudEdyb3VwLCBzZWdtZW50czogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAvLyBXZSBhbGxvdyBtYXRjaGVzIHRvIGVtcHR5IHBhdGhzIHdoZW4gdGhlIG91dGxldHMgZGlmZmVyIHNvIHdlIGNhbiBtYXRjaCBhIHVybCBsaWtlIGAvKGI6YilgIHRvXG4gIC8vIGEgY29uZmlnIGxpa2VcbiAgLy8gKiBge3BhdGg6ICcnLCBjaGlsZHJlbjogW3twYXRoOiAnYicsIG91dGxldDogJ2InfV19YFxuICAvLyBvciBldmVuXG4gIC8vICogYHtwYXRoOiAnJywgb3V0bGV0OiAnYScsIGNoaWxkcmVuOiBbe3BhdGg6ICdiJywgb3V0bGV0OiAnYid9XWBcbiAgLy9cbiAgLy8gVGhlIGV4Y2VwdGlvbiBoZXJlIGlzIHdoZW4gdGhlIHNlZ21lbnQgb3V0bGV0IGlzIGZvciB0aGUgcHJpbWFyeSBvdXRsZXQuIFRoaXMgd291bGRcbiAgLy8gcmVzdWx0IGluIGEgbWF0Y2ggaW5zaWRlIHRoZSBuYW1lZCBvdXRsZXQgYmVjYXVzZSBhbGwgY2hpbGRyZW4gdGhlcmUgYXJlIHdyaXR0ZW4gYXMgcHJpbWFyeVxuICAvLyBvdXRsZXRzLiBTbyB3ZSBuZWVkIHRvIHByZXZlbnQgY2hpbGQgbmFtZWQgb3V0bGV0IG1hdGNoZXMgaW4gYSB1cmwgbGlrZSBgL2JgIGluIGEgY29uZmlnIGxpa2VcbiAgLy8gKiBge3BhdGg6ICcnLCBvdXRsZXQ6ICd4JyBjaGlsZHJlbjogW3twYXRoOiAnYid9XX1gXG4gIC8vIFRoaXMgc2hvdWxkIG9ubHkgbWF0Y2ggaWYgdGhlIHVybCBpcyBgLyh4OmIpYC5cbiAgaWYgKGdldE91dGxldChyb3V0ZSkgIT09IG91dGxldCAmJlxuICAgICAgKG91dGxldCA9PT0gUFJJTUFSWV9PVVRMRVQgfHwgIWVtcHR5UGF0aE1hdGNoKHJhd1NlZ21lbnQsIHNlZ21lbnRzLCByb3V0ZSkpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChyb3V0ZS5wYXRoID09PSAnKionKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIG1hdGNoKHJhd1NlZ21lbnQsIHJvdXRlLCBzZWdtZW50cykubWF0Y2hlZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vTGVmdG92ZXJzSW5VcmwoXG4gICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBzZWdtZW50cy5sZW5ndGggPT09IDAgJiYgIXNlZ21lbnRHcm91cC5jaGlsZHJlbltvdXRsZXRdO1xufVxuIl19