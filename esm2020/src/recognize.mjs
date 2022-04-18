/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, of } from 'rxjs';
import { ActivatedRouteSnapshot, inheritedParamsDataResolve, RouterStateSnapshot } from './router_state';
import { PRIMARY_OUTLET } from './shared';
import { last } from './utils/collection';
import { getOutlet, sortByMatchingOutlets } from './utils/config';
import { isImmediateMatch, match, noLeftoversInUrl, split } from './utils/config_matching';
import { TreeNode } from './utils/tree';
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || !!ngDevMode;
class NoMatch {
}
function newObservableError(e) {
    // TODO(atscott): This pattern is used throughout the router code and can be `throwError` instead.
    return new Observable((obs) => obs.error(e));
}
export function recognize(rootComponentType, config, urlTree, url, paramsInheritanceStrategy = 'emptyOnly', relativeLinkResolution = 'legacy') {
    try {
        const result = new Recognizer(rootComponentType, config, urlTree, url, paramsInheritanceStrategy, relativeLinkResolution)
            .recognize();
        if (result === null) {
            return newObservableError(new NoMatch());
        }
        else {
            return of(result);
        }
    }
    catch (e) {
        // Catch the potential error from recognize due to duplicate outlet matches and return as an
        // `Observable` error instead.
        return newObservableError(e);
    }
}
export class Recognizer {
    constructor(rootComponentType, config, urlTree, url, paramsInheritanceStrategy, relativeLinkResolution) {
        this.rootComponentType = rootComponentType;
        this.config = config;
        this.urlTree = urlTree;
        this.url = url;
        this.paramsInheritanceStrategy = paramsInheritanceStrategy;
        this.relativeLinkResolution = relativeLinkResolution;
    }
    recognize() {
        const rootSegmentGroup = split(this.urlTree.root, [], [], this.config.filter(c => c.redirectTo === undefined), this.relativeLinkResolution)
            .segmentGroup;
        const children = this.processSegmentGroup(this.config, rootSegmentGroup, PRIMARY_OUTLET);
        if (children === null) {
            return null;
        }
        // Use Object.freeze to prevent readers of the Router state from modifying it outside of a
        // navigation, resulting in the router being out of sync with the browser.
        const root = new ActivatedRouteSnapshot([], Object.freeze({}), Object.freeze({ ...this.urlTree.queryParams }), this.urlTree.fragment, {}, PRIMARY_OUTLET, this.rootComponentType, null, this.urlTree.root, -1, {});
        const rootNode = new TreeNode(root, children);
        const routeState = new RouterStateSnapshot(this.url, rootNode);
        this.inheritParamsAndData(routeState._root);
        return routeState;
    }
    inheritParamsAndData(routeNode) {
        const route = routeNode.value;
        const i = inheritedParamsDataResolve(route, this.paramsInheritanceStrategy);
        route.params = Object.freeze(i.params);
        route.data = Object.freeze(i.data);
        routeNode.children.forEach(n => this.inheritParamsAndData(n));
    }
    processSegmentGroup(config, segmentGroup, outlet) {
        if (segmentGroup.segments.length === 0 && segmentGroup.hasChildren()) {
            return this.processChildren(config, segmentGroup);
        }
        return this.processSegment(config, segmentGroup, segmentGroup.segments, outlet);
    }
    /**
     * Matches every child outlet in the `segmentGroup` to a `Route` in the config. Returns `null` if
     * we cannot find a match for _any_ of the children.
     *
     * @param config - The `Routes` to match against
     * @param segmentGroup - The `UrlSegmentGroup` whose children need to be matched against the
     *     config.
     */
    processChildren(config, segmentGroup) {
        const children = [];
        for (const childOutlet of Object.keys(segmentGroup.children)) {
            const child = segmentGroup.children[childOutlet];
            // Sort the config so that routes with outlets that match the one being activated appear
            // first, followed by routes for other outlets, which might match if they have an empty path.
            const sortedConfig = sortByMatchingOutlets(config, childOutlet);
            const outletChildren = this.processSegmentGroup(sortedConfig, child, childOutlet);
            if (outletChildren === null) {
                // Configs must match all segment children so because we did not find a match for this
                // outlet, return `null`.
                return null;
            }
            children.push(...outletChildren);
        }
        // Because we may have matched two outlets to the same empty path segment, we can have multiple
        // activated results for the same outlet. We should merge the children of these results so the
        // final return value is only one `TreeNode` per outlet.
        const mergedChildren = mergeEmptyPathMatches(children);
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
            // This should really never happen - we are only taking the first match for each outlet and
            // merge the empty path matches.
            checkOutletNameUniqueness(mergedChildren);
        }
        sortActivatedRouteSnapshots(mergedChildren);
        return mergedChildren;
    }
    processSegment(config, segmentGroup, segments, outlet) {
        for (const r of config) {
            const children = this.processSegmentAgainstRoute(r, segmentGroup, segments, outlet);
            if (children !== null) {
                return children;
            }
        }
        if (noLeftoversInUrl(segmentGroup, segments, outlet)) {
            return [];
        }
        return null;
    }
    processSegmentAgainstRoute(route, rawSegment, segments, outlet) {
        if (route.redirectTo || !isImmediateMatch(route, rawSegment, segments, outlet))
            return null;
        let snapshot;
        let consumedSegments = [];
        let remainingSegments = [];
        if (route.path === '**') {
            const params = segments.length > 0 ? last(segments).parameters : {};
            const pathIndexShift = getPathIndexShift(rawSegment) + segments.length;
            snapshot = new ActivatedRouteSnapshot(segments, params, Object.freeze({ ...this.urlTree.queryParams }), this.urlTree.fragment, getData(route), getOutlet(route), route.component, route, getSourceSegmentGroup(rawSegment), pathIndexShift, getResolve(route), 
            // NG_DEV_MODE is used to prevent the getCorrectedPathIndexShift function from affecting
            // production bundle size. This value is intended only to surface a warning to users
            // depending on `relativeLinkResolution: 'legacy'` in dev mode.
            (NG_DEV_MODE ? getCorrectedPathIndexShift(rawSegment) + segments.length :
                pathIndexShift));
        }
        else {
            const result = match(rawSegment, route, segments);
            if (!result.matched) {
                return null;
            }
            consumedSegments = result.consumedSegments;
            remainingSegments = result.remainingSegments;
            const pathIndexShift = getPathIndexShift(rawSegment) + consumedSegments.length;
            snapshot = new ActivatedRouteSnapshot(consumedSegments, result.parameters, Object.freeze({ ...this.urlTree.queryParams }), this.urlTree.fragment, getData(route), getOutlet(route), route.component, route, getSourceSegmentGroup(rawSegment), pathIndexShift, getResolve(route), (NG_DEV_MODE ? getCorrectedPathIndexShift(rawSegment) + consumedSegments.length :
                pathIndexShift));
        }
        const childConfig = getChildConfig(route);
        const { segmentGroup, slicedSegments } = split(rawSegment, consumedSegments, remainingSegments, 
        // Filter out routes with redirectTo because we are trying to create activated route
        // snapshots and don't handle redirects here. That should have been done in
        // `applyRedirects`.
        childConfig.filter(c => c.redirectTo === undefined), this.relativeLinkResolution);
        if (slicedSegments.length === 0 && segmentGroup.hasChildren()) {
            const children = this.processChildren(childConfig, segmentGroup);
            if (children === null) {
                return null;
            }
            return [new TreeNode(snapshot, children)];
        }
        if (childConfig.length === 0 && slicedSegments.length === 0) {
            return [new TreeNode(snapshot, [])];
        }
        const matchedOnOutlet = getOutlet(route) === outlet;
        // If we matched a config due to empty path match on a different outlet, we need to continue
        // passing the current outlet for the segment rather than switch to PRIMARY.
        // Note that we switch to primary when we have a match because outlet configs look like this:
        // {path: 'a', outlet: 'a', children: [
        //  {path: 'b', component: B},
        //  {path: 'c', component: C},
        // ]}
        // Notice that the children of the named outlet are configured with the primary outlet
        const children = this.processSegment(childConfig, segmentGroup, slicedSegments, matchedOnOutlet ? PRIMARY_OUTLET : outlet);
        if (children === null) {
            return null;
        }
        return [new TreeNode(snapshot, children)];
    }
}
function sortActivatedRouteSnapshots(nodes) {
    nodes.sort((a, b) => {
        if (a.value.outlet === PRIMARY_OUTLET)
            return -1;
        if (b.value.outlet === PRIMARY_OUTLET)
            return 1;
        return a.value.outlet.localeCompare(b.value.outlet);
    });
}
function getChildConfig(route) {
    if (route.children) {
        return route.children;
    }
    if (route.loadChildren) {
        return route._loadedRoutes;
    }
    return [];
}
function hasEmptyPathConfig(node) {
    const config = node.value.routeConfig;
    return config && config.path === '' && config.redirectTo === undefined;
}
/**
 * Finds `TreeNode`s with matching empty path route configs and merges them into `TreeNode` with the
 * children from each duplicate. This is necessary because different outlets can match a single
 * empty path route config and the results need to then be merged.
 */
function mergeEmptyPathMatches(nodes) {
    const result = [];
    // The set of nodes which contain children that were merged from two duplicate empty path nodes.
    const mergedNodes = new Set();
    for (const node of nodes) {
        if (!hasEmptyPathConfig(node)) {
            result.push(node);
            continue;
        }
        const duplicateEmptyPathNode = result.find(resultNode => node.value.routeConfig === resultNode.value.routeConfig);
        if (duplicateEmptyPathNode !== undefined) {
            duplicateEmptyPathNode.children.push(...node.children);
            mergedNodes.add(duplicateEmptyPathNode);
        }
        else {
            result.push(node);
        }
    }
    // For each node which has children from multiple sources, we need to recompute a new `TreeNode`
    // by also merging those children. This is necessary when there are multiple empty path configs in
    // a row. Put another way: whenever we combine children of two nodes, we need to also check if any
    // of those children can be combined into a single node as well.
    for (const mergedNode of mergedNodes) {
        const mergedChildren = mergeEmptyPathMatches(mergedNode.children);
        result.push(new TreeNode(mergedNode.value, mergedChildren));
    }
    return result.filter(n => !mergedNodes.has(n));
}
function checkOutletNameUniqueness(nodes) {
    const names = {};
    nodes.forEach(n => {
        const routeWithSameOutletName = names[n.value.outlet];
        if (routeWithSameOutletName) {
            const p = routeWithSameOutletName.url.map(s => s.toString()).join('/');
            const c = n.value.url.map(s => s.toString()).join('/');
            throw new Error(`Two segments cannot have the same outlet name: '${p}' and '${c}'.`);
        }
        names[n.value.outlet] = n.value;
    });
}
function getSourceSegmentGroup(segmentGroup) {
    let s = segmentGroup;
    while (s._sourceSegment) {
        s = s._sourceSegment;
    }
    return s;
}
function getPathIndexShift(segmentGroup) {
    let s = segmentGroup;
    let res = s._segmentIndexShift ?? 0;
    while (s._sourceSegment) {
        s = s._sourceSegment;
        res += s._segmentIndexShift ?? 0;
    }
    return res - 1;
}
function getCorrectedPathIndexShift(segmentGroup) {
    let s = segmentGroup;
    let res = s._segmentIndexShiftCorrected ?? s._segmentIndexShift ?? 0;
    while (s._sourceSegment) {
        s = s._sourceSegment;
        res += s._segmentIndexShiftCorrected ?? s._segmentIndexShift ?? 0;
    }
    return res - 1;
}
function getData(route) {
    return route.data || {};
}
function getResolve(route) {
    return route.resolve || {};
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb2duaXplLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yZWNvZ25pemUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUFDLFVBQVUsRUFBWSxFQUFFLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFHOUMsT0FBTyxFQUFDLHNCQUFzQixFQUFFLDBCQUEwQixFQUE2QixtQkFBbUIsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ2xJLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFFeEMsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxTQUFTLEVBQUUscUJBQXFCLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUNoRSxPQUFPLEVBQUMsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQ3pGLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFFdEMsTUFBTSxXQUFXLEdBQUcsT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFFcEUsTUFBTSxPQUFPO0NBQUc7QUFFaEIsU0FBUyxrQkFBa0IsQ0FBQyxDQUFVO0lBQ3BDLGtHQUFrRztJQUNsRyxPQUFPLElBQUksVUFBVSxDQUFzQixDQUFDLEdBQWtDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuRyxDQUFDO0FBRUQsTUFBTSxVQUFVLFNBQVMsQ0FDckIsaUJBQWlDLEVBQUUsTUFBYyxFQUFFLE9BQWdCLEVBQUUsR0FBVyxFQUNoRiw0QkFBdUQsV0FBVyxFQUNsRSx5QkFBK0MsUUFBUTtJQUN6RCxJQUFJO1FBQ0YsTUFBTSxNQUFNLEdBQUcsSUFBSSxV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QUcsR0FBRyxDQUFDLENBQUM7QUFDakIsQ0FBQztBQUVELFNBQVMsT0FBTyxDQUFDLEtBQVk7SUFDM0IsT0FBTyxLQUFLLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztBQUMxQixDQUFDO0FBRUQsU0FBUyxVQUFVLENBQUMsS0FBWTtJQUM5QixPQUFPLEtBQUssQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDO0FBQzdCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtUeXBlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgT2JzZXJ2ZXIsIG9mfSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtEYXRhLCBSZXNvbHZlRGF0YSwgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBpbmhlcml0ZWRQYXJhbXNEYXRhUmVzb2x2ZSwgUGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSwgUm91dGVyU3RhdGVTbmFwc2hvdH0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQUklNQVJZX09VVExFVH0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtVcmxTZWdtZW50LCBVcmxTZWdtZW50R3JvdXAsIFVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtsYXN0fSBmcm9tICcuL3V0aWxzL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtnZXRPdXRsZXQsIHNvcnRCeU1hdGNoaW5nT3V0bGV0c30gZnJvbSAnLi91dGlscy9jb25maWcnO1xuaW1wb3J0IHtpc0ltbWVkaWF0ZU1hdGNoLCBtYXRjaCwgbm9MZWZ0b3ZlcnNJblVybCwgc3BsaXR9IGZyb20gJy4vdXRpbHMvY29uZmlnX21hdGNoaW5nJztcbmltcG9ydCB7VHJlZU5vZGV9IGZyb20gJy4vdXRpbHMvdHJlZSc7XG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgISFuZ0Rldk1vZGU7XG5cbmNsYXNzIE5vTWF0Y2gge31cblxuZnVuY3Rpb24gbmV3T2JzZXJ2YWJsZUVycm9yKGU6IHVua25vd24pOiBPYnNlcnZhYmxlPFJvdXRlclN0YXRlU25hcHNob3Q+IHtcbiAgLy8gVE9ETyhhdHNjb3R0KTogVGhpcyBwYXR0ZXJuIGlzIHVzZWQgdGhyb3VnaG91dCB0aGUgcm91dGVyIGNvZGUgYW5kIGNhbiBiZSBgdGhyb3dFcnJvcmAgaW5zdGVhZC5cbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFJvdXRlclN0YXRlU25hcHNob3Q+KChvYnM6IE9ic2VydmVyPFJvdXRlclN0YXRlU25hcHNob3Q+KSA9PiBvYnMuZXJyb3IoZSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVjb2duaXplKFxuICAgIHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT58bnVsbCwgY29uZmlnOiBSb3V0ZXMsIHVybFRyZWU6IFVybFRyZWUsIHVybDogc3RyaW5nLFxuICAgIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6IFBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kgPSAnZW1wdHlPbmx5JyxcbiAgICByZWxhdGl2ZUxpbmtSZXNvbHV0aW9uOiAnbGVnYWN5J3wnY29ycmVjdGVkJyA9ICdsZWdhY3knKTogT2JzZXJ2YWJsZTxSb3V0ZXJTdGF0ZVNuYXBzaG90PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IFJlY29nbml6ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgIHJvb3RDb21wb25lbnRUeXBlLCBjb25maWcsIHVybFRyZWUsIHVybCwgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSxcbiAgICAgICAgICAgICAgICAgICAgICAgcmVsYXRpdmVMaW5rUmVzb2x1dGlvbilcbiAgICAgICAgICAgICAgICAgICAgICAgLnJlY29nbml6ZSgpO1xuICAgIGlmIChyZXN1bHQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBuZXdPYnNlcnZhYmxlRXJyb3IobmV3IE5vTWF0Y2goKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvZihyZXN1bHQpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIC8vIENhdGNoIHRoZSBwb3RlbnRpYWwgZXJyb3IgZnJvbSByZWNvZ25pemUgZHVlIHRvIGR1cGxpY2F0ZSBvdXRsZXQgbWF0Y2hlcyBhbmQgcmV0dXJuIGFzIGFuXG4gICAgLy8gYE9ic2VydmFibGVgIGVycm9yIGluc3RlYWQuXG4gICAgcmV0dXJuIG5ld09ic2VydmFibGVFcnJvcihlKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVjb2duaXplciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+fG51bGwsIHByaXZhdGUgY29uZmlnOiBSb3V0ZXMsIHByaXZhdGUgdXJsVHJlZTogVXJsVHJlZSxcbiAgICAgIHByaXZhdGUgdXJsOiBzdHJpbmcsIHByaXZhdGUgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogUGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSxcbiAgICAgIHByaXZhdGUgcmVsYXRpdmVMaW5rUmVzb2x1dGlvbjogJ2xlZ2FjeSd8J2NvcnJlY3RlZCcpIHt9XG5cbiAgcmVjb2duaXplKCk6IFJvdXRlclN0YXRlU25hcHNob3R8bnVsbCB7XG4gICAgY29uc3Qgcm9vdFNlZ21lbnRHcm91cCA9XG4gICAgICAgIHNwbGl0KFxuICAgICAgICAgICAgdGhpcy51cmxUcmVlLnJvb3QsIFtdLCBbXSwgdGhpcy5jb25maWcuZmlsdGVyKGMgPT4gYy5yZWRpcmVjdFRvID09PSB1bmRlZmluZWQpLFxuICAgICAgICAgICAgdGhpcy5yZWxhdGl2ZUxpbmtSZXNvbHV0aW9uKVxuICAgICAgICAgICAgLnNlZ21lbnRHcm91cDtcblxuICAgIGNvbnN0IGNoaWxkcmVuID0gdGhpcy5wcm9jZXNzU2VnbWVudEdyb3VwKHRoaXMuY29uZmlnLCByb290U2VnbWVudEdyb3VwLCBQUklNQVJZX09VVExFVCk7XG4gICAgaWYgKGNoaWxkcmVuID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBVc2UgT2JqZWN0LmZyZWV6ZSB0byBwcmV2ZW50IHJlYWRlcnMgb2YgdGhlIFJvdXRlciBzdGF0ZSBmcm9tIG1vZGlmeWluZyBpdCBvdXRzaWRlIG9mIGFcbiAgICAvLyBuYXZpZ2F0aW9uLCByZXN1bHRpbmcgaW4gdGhlIHJvdXRlciBiZWluZyBvdXQgb2Ygc3luYyB3aXRoIHRoZSBicm93c2VyLlxuICAgIGNvbnN0IHJvb3QgPSBuZXcgQWN0aXZhdGVkUm91dGVTbmFwc2hvdChcbiAgICAgICAgW10sIE9iamVjdC5mcmVlemUoe30pLCBPYmplY3QuZnJlZXplKHsuLi50aGlzLnVybFRyZWUucXVlcnlQYXJhbXN9KSwgdGhpcy51cmxUcmVlLmZyYWdtZW50LFxuICAgICAgICB7fSwgUFJJTUFSWV9PVVRMRVQsIHRoaXMucm9vdENvbXBvbmVudFR5cGUsIG51bGwsIHRoaXMudXJsVHJlZS5yb290LCAtMSwge30pO1xuXG4gICAgY29uc3Qgcm9vdE5vZGUgPSBuZXcgVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4ocm9vdCwgY2hpbGRyZW4pO1xuICAgIGNvbnN0IHJvdXRlU3RhdGUgPSBuZXcgUm91dGVyU3RhdGVTbmFwc2hvdCh0aGlzLnVybCwgcm9vdE5vZGUpO1xuICAgIHRoaXMuaW5oZXJpdFBhcmFtc0FuZERhdGEocm91dGVTdGF0ZS5fcm9vdCk7XG4gICAgcmV0dXJuIHJvdXRlU3RhdGU7XG4gIH1cblxuICBpbmhlcml0UGFyYW1zQW5kRGF0YShyb3V0ZU5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KTogdm9pZCB7XG4gICAgY29uc3Qgcm91dGUgPSByb3V0ZU5vZGUudmFsdWU7XG5cbiAgICBjb25zdCBpID0gaW5oZXJpdGVkUGFyYW1zRGF0YVJlc29sdmUocm91dGUsIHRoaXMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSk7XG4gICAgcm91dGUucGFyYW1zID0gT2JqZWN0LmZyZWV6ZShpLnBhcmFtcyk7XG4gICAgcm91dGUuZGF0YSA9IE9iamVjdC5mcmVlemUoaS5kYXRhKTtcblxuICAgIHJvdXRlTm9kZS5jaGlsZHJlbi5mb3JFYWNoKG4gPT4gdGhpcy5pbmhlcml0UGFyYW1zQW5kRGF0YShuKSk7XG4gIH1cblxuICBwcm9jZXNzU2VnbWVudEdyb3VwKGNvbmZpZzogUm91dGVbXSwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIG91dGxldDogc3RyaW5nKTpcbiAgICAgIFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W118bnVsbCB7XG4gICAgaWYgKHNlZ21lbnRHcm91cC5zZWdtZW50cy5sZW5ndGggPT09IDAgJiYgc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NDaGlsZHJlbihjb25maWcsIHNlZ21lbnRHcm91cCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucHJvY2Vzc1NlZ21lbnQoY29uZmlnLCBzZWdtZW50R3JvdXAsIHNlZ21lbnRHcm91cC5zZWdtZW50cywgb3V0bGV0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNYXRjaGVzIGV2ZXJ5IGNoaWxkIG91dGxldCBpbiB0aGUgYHNlZ21lbnRHcm91cGAgdG8gYSBgUm91dGVgIGluIHRoZSBjb25maWcuIFJldHVybnMgYG51bGxgIGlmXG4gICAqIHdlIGNhbm5vdCBmaW5kIGEgbWF0Y2ggZm9yIF9hbnlfIG9mIHRoZSBjaGlsZHJlbi5cbiAgICpcbiAgICogQHBhcmFtIGNvbmZpZyAtIFRoZSBgUm91dGVzYCB0byBtYXRjaCBhZ2FpbnN0XG4gICAqIEBwYXJhbSBzZWdtZW50R3JvdXAgLSBUaGUgYFVybFNlZ21lbnRHcm91cGAgd2hvc2UgY2hpbGRyZW4gbmVlZCB0byBiZSBtYXRjaGVkIGFnYWluc3QgdGhlXG4gICAqICAgICBjb25maWcuXG4gICAqL1xuICBwcm9jZXNzQ2hpbGRyZW4oY29uZmlnOiBSb3V0ZVtdLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6XG4gICAgICBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PltdfG51bGwge1xuICAgIGNvbnN0IGNoaWxkcmVuOiBBcnJheTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGNoaWxkT3V0bGV0IG9mIE9iamVjdC5rZXlzKHNlZ21lbnRHcm91cC5jaGlsZHJlbikpIHtcbiAgICAgIGNvbnN0IGNoaWxkID0gc2VnbWVudEdyb3VwLmNoaWxkcmVuW2NoaWxkT3V0bGV0XTtcbiAgICAgIC8vIFNvcnQgdGhlIGNvbmZpZyBzbyB0aGF0IHJvdXRlcyB3aXRoIG91dGxldHMgdGhhdCBtYXRjaCB0aGUgb25lIGJlaW5nIGFjdGl2YXRlZCBhcHBlYXJcbiAgICAgIC8vIGZpcnN0LCBmb2xsb3dlZCBieSByb3V0ZXMgZm9yIG90aGVyIG91dGxldHMsIHdoaWNoIG1pZ2h0IG1hdGNoIGlmIHRoZXkgaGF2ZSBhbiBlbXB0eSBwYXRoLlxuICAgICAgY29uc3Qgc29ydGVkQ29uZmlnID0gc29ydEJ5TWF0Y2hpbmdPdXRsZXRzKGNvbmZpZywgY2hpbGRPdXRsZXQpO1xuICAgICAgY29uc3Qgb3V0bGV0Q2hpbGRyZW4gPSB0aGlzLnByb2Nlc3NTZWdtZW50R3JvdXAoc29ydGVkQ29uZmlnLCBjaGlsZCwgY2hpbGRPdXRsZXQpO1xuICAgICAgaWYgKG91dGxldENoaWxkcmVuID09PSBudWxsKSB7XG4gICAgICAgIC8vIENvbmZpZ3MgbXVzdCBtYXRjaCBhbGwgc2VnbWVudCBjaGlsZHJlbiBzbyBiZWNhdXNlIHdlIGRpZCBub3QgZmluZCBhIG1hdGNoIGZvciB0aGlzXG4gICAgICAgIC8vIG91dGxldCwgcmV0dXJuIGBudWxsYC5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICBjaGlsZHJlbi5wdXNoKC4uLm91dGxldENoaWxkcmVuKTtcbiAgICB9XG4gICAgLy8gQmVjYXVzZSB3ZSBtYXkgaGF2ZSBtYXRjaGVkIHR3byBvdXRsZXRzIHRvIHRoZSBzYW1lIGVtcHR5IHBhdGggc2VnbWVudCwgd2UgY2FuIGhhdmUgbXVsdGlwbGVcbiAgICAvLyBhY3RpdmF0ZWQgcmVzdWx0cyBmb3IgdGhlIHNhbWUgb3V0bGV0LiBXZSBzaG91bGQgbWVyZ2UgdGhlIGNoaWxkcmVuIG9mIHRoZXNlIHJlc3VsdHMgc28gdGhlXG4gICAgLy8gZmluYWwgcmV0dXJuIHZhbHVlIGlzIG9ubHkgb25lIGBUcmVlTm9kZWAgcGVyIG91dGxldC5cbiAgICBjb25zdCBtZXJnZWRDaGlsZHJlbiA9IG1lcmdlRW1wdHlQYXRoTWF0Y2hlcyhjaGlsZHJlbik7XG4gICAgaWYgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkge1xuICAgICAgLy8gVGhpcyBzaG91bGQgcmVhbGx5IG5ldmVyIGhhcHBlbiAtIHdlIGFyZSBvbmx5IHRha2luZyB0aGUgZmlyc3QgbWF0Y2ggZm9yIGVhY2ggb3V0bGV0IGFuZFxuICAgICAgLy8gbWVyZ2UgdGhlIGVtcHR5IHBhdGggbWF0Y2hlcy5cbiAgICAgIGNoZWNrT3V0bGV0TmFtZVVuaXF1ZW5lc3MobWVyZ2VkQ2hpbGRyZW4pO1xuICAgIH1cbiAgICBzb3J0QWN0aXZhdGVkUm91dGVTbmFwc2hvdHMobWVyZ2VkQ2hpbGRyZW4pO1xuICAgIHJldHVybiBtZXJnZWRDaGlsZHJlbjtcbiAgfVxuXG4gIHByb2Nlc3NTZWdtZW50KFxuICAgICAgY29uZmlnOiBSb3V0ZVtdLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICAgIG91dGxldDogc3RyaW5nKTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXXxudWxsIHtcbiAgICBmb3IgKGNvbnN0IHIgb2YgY29uZmlnKSB7XG4gICAgICBjb25zdCBjaGlsZHJlbiA9IHRoaXMucHJvY2Vzc1NlZ21lbnRBZ2FpbnN0Um91dGUociwgc2VnbWVudEdyb3VwLCBzZWdtZW50cywgb3V0bGV0KTtcbiAgICAgIGlmIChjaGlsZHJlbiAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gY2hpbGRyZW47XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChub0xlZnRvdmVyc0luVXJsKHNlZ21lbnRHcm91cCwgc2VnbWVudHMsIG91dGxldCkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByb2Nlc3NTZWdtZW50QWdhaW5zdFJvdXRlKFxuICAgICAgcm91dGU6IFJvdXRlLCByYXdTZWdtZW50OiBVcmxTZWdtZW50R3JvdXAsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgICBvdXRsZXQ6IHN0cmluZyk6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W118bnVsbCB7XG4gICAgaWYgKHJvdXRlLnJlZGlyZWN0VG8gfHwgIWlzSW1tZWRpYXRlTWF0Y2gocm91dGUsIHJhd1NlZ21lbnQsIHNlZ21lbnRzLCBvdXRsZXQpKSByZXR1cm4gbnVsbDtcblxuICAgIGxldCBzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdDtcbiAgICBsZXQgY29uc3VtZWRTZWdtZW50czogVXJsU2VnbWVudFtdID0gW107XG4gICAgbGV0IHJlbWFpbmluZ1NlZ21lbnRzOiBVcmxTZWdtZW50W10gPSBbXTtcblxuICAgIGlmIChyb3V0ZS5wYXRoID09PSAnKionKSB7XG4gICAgICBjb25zdCBwYXJhbXMgPSBzZWdtZW50cy5sZW5ndGggPiAwID8gbGFzdChzZWdtZW50cykhLnBhcmFtZXRlcnMgOiB7fTtcbiAgICAgIGNvbnN0IHBhdGhJbmRleFNoaWZ0ID0gZ2V0UGF0aEluZGV4U2hpZnQocmF3U2VnbWVudCkgKyBzZWdtZW50cy5sZW5ndGg7XG4gICAgICBzbmFwc2hvdCA9IG5ldyBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KFxuICAgICAgICAgIHNlZ21lbnRzLCBwYXJhbXMsIE9iamVjdC5mcmVlemUoey4uLnRoaXMudXJsVHJlZS5xdWVyeVBhcmFtc30pLCB0aGlzLnVybFRyZWUuZnJhZ21lbnQsXG4gICAgICAgICAgZ2V0RGF0YShyb3V0ZSksIGdldE91dGxldChyb3V0ZSksIHJvdXRlLmNvbXBvbmVudCEsIHJvdXRlLFxuICAgICAgICAgIGdldFNvdXJjZVNlZ21lbnRHcm91cChyYXdTZWdtZW50KSwgcGF0aEluZGV4U2hpZnQsIGdldFJlc29sdmUocm91dGUpLFxuICAgICAgICAgIC8vIE5HX0RFVl9NT0RFIGlzIHVzZWQgdG8gcHJldmVudCB0aGUgZ2V0Q29ycmVjdGVkUGF0aEluZGV4U2hpZnQgZnVuY3Rpb24gZnJvbSBhZmZlY3RpbmdcbiAgICAgICAgICAvLyBwcm9kdWN0aW9uIGJ1bmRsZSBzaXplLiBUaGlzIHZhbHVlIGlzIGludGVuZGVkIG9ubHkgdG8gc3VyZmFjZSBhIHdhcm5pbmcgdG8gdXNlcnNcbiAgICAgICAgICAvLyBkZXBlbmRpbmcgb24gYHJlbGF0aXZlTGlua1Jlc29sdXRpb246ICdsZWdhY3knYCBpbiBkZXYgbW9kZS5cbiAgICAgICAgICAoTkdfREVWX01PREUgPyBnZXRDb3JyZWN0ZWRQYXRoSW5kZXhTaGlmdChyYXdTZWdtZW50KSArIHNlZ21lbnRzLmxlbmd0aCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgcGF0aEluZGV4U2hpZnQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgcmVzdWx0ID0gbWF0Y2gocmF3U2VnbWVudCwgcm91dGUsIHNlZ21lbnRzKTtcbiAgICAgIGlmICghcmVzdWx0Lm1hdGNoZWQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICBjb25zdW1lZFNlZ21lbnRzID0gcmVzdWx0LmNvbnN1bWVkU2VnbWVudHM7XG4gICAgICByZW1haW5pbmdTZWdtZW50cyA9IHJlc3VsdC5yZW1haW5pbmdTZWdtZW50cztcbiAgICAgIGNvbnN0IHBhdGhJbmRleFNoaWZ0ID0gZ2V0UGF0aEluZGV4U2hpZnQocmF3U2VnbWVudCkgKyBjb25zdW1lZFNlZ21lbnRzLmxlbmd0aDtcblxuICAgICAgc25hcHNob3QgPSBuZXcgQWN0aXZhdGVkUm91dGVTbmFwc2hvdChcbiAgICAgICAgICBjb25zdW1lZFNlZ21lbnRzLCByZXN1bHQucGFyYW1ldGVycywgT2JqZWN0LmZyZWV6ZSh7Li4udGhpcy51cmxUcmVlLnF1ZXJ5UGFyYW1zfSksXG4gICAgICAgICAgdGhpcy51cmxUcmVlLmZyYWdtZW50LCBnZXREYXRhKHJvdXRlKSwgZ2V0T3V0bGV0KHJvdXRlKSwgcm91dGUuY29tcG9uZW50ISwgcm91dGUsXG4gICAgICAgICAgZ2V0U291cmNlU2VnbWVudEdyb3VwKHJhd1NlZ21lbnQpLCBwYXRoSW5kZXhTaGlmdCwgZ2V0UmVzb2x2ZShyb3V0ZSksXG4gICAgICAgICAgKE5HX0RFVl9NT0RFID8gZ2V0Q29ycmVjdGVkUGF0aEluZGV4U2hpZnQocmF3U2VnbWVudCkgKyBjb25zdW1lZFNlZ21lbnRzLmxlbmd0aCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgcGF0aEluZGV4U2hpZnQpKTtcbiAgICB9XG5cbiAgICBjb25zdCBjaGlsZENvbmZpZzogUm91dGVbXSA9IGdldENoaWxkQ29uZmlnKHJvdXRlKTtcblxuICAgIGNvbnN0IHtzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzfSA9IHNwbGl0KFxuICAgICAgICByYXdTZWdtZW50LCBjb25zdW1lZFNlZ21lbnRzLCByZW1haW5pbmdTZWdtZW50cyxcbiAgICAgICAgLy8gRmlsdGVyIG91dCByb3V0ZXMgd2l0aCByZWRpcmVjdFRvIGJlY2F1c2Ugd2UgYXJlIHRyeWluZyB0byBjcmVhdGUgYWN0aXZhdGVkIHJvdXRlXG4gICAgICAgIC8vIHNuYXBzaG90cyBhbmQgZG9uJ3QgaGFuZGxlIHJlZGlyZWN0cyBoZXJlLiBUaGF0IHNob3VsZCBoYXZlIGJlZW4gZG9uZSBpblxuICAgICAgICAvLyBgYXBwbHlSZWRpcmVjdHNgLlxuICAgICAgICBjaGlsZENvbmZpZy5maWx0ZXIoYyA9PiBjLnJlZGlyZWN0VG8gPT09IHVuZGVmaW5lZCksIHRoaXMucmVsYXRpdmVMaW5rUmVzb2x1dGlvbik7XG5cbiAgICBpZiAoc2xpY2VkU2VnbWVudHMubGVuZ3RoID09PSAwICYmIHNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpKSB7XG4gICAgICBjb25zdCBjaGlsZHJlbiA9IHRoaXMucHJvY2Vzc0NoaWxkcmVuKGNoaWxkQ29uZmlnLCBzZWdtZW50R3JvdXApO1xuICAgICAgaWYgKGNoaWxkcmVuID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFtuZXcgVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4oc25hcHNob3QsIGNoaWxkcmVuKV07XG4gICAgfVxuXG4gICAgaWYgKGNoaWxkQ29uZmlnLmxlbmd0aCA9PT0gMCAmJiBzbGljZWRTZWdtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBbbmV3IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KHNuYXBzaG90LCBbXSldO1xuICAgIH1cblxuICAgIGNvbnN0IG1hdGNoZWRPbk91dGxldCA9IGdldE91dGxldChyb3V0ZSkgPT09IG91dGxldDtcbiAgICAvLyBJZiB3ZSBtYXRjaGVkIGEgY29uZmlnIGR1ZSB0byBlbXB0eSBwYXRoIG1hdGNoIG9uIGEgZGlmZmVyZW50IG91dGxldCwgd2UgbmVlZCB0byBjb250aW51ZVxuICAgIC8vIHBhc3NpbmcgdGhlIGN1cnJlbnQgb3V0bGV0IGZvciB0aGUgc2VnbWVudCByYXRoZXIgdGhhbiBzd2l0Y2ggdG8gUFJJTUFSWS5cbiAgICAvLyBOb3RlIHRoYXQgd2Ugc3dpdGNoIHRvIHByaW1hcnkgd2hlbiB3ZSBoYXZlIGEgbWF0Y2ggYmVjYXVzZSBvdXRsZXQgY29uZmlncyBsb29rIGxpa2UgdGhpczpcbiAgICAvLyB7cGF0aDogJ2EnLCBvdXRsZXQ6ICdhJywgY2hpbGRyZW46IFtcbiAgICAvLyAge3BhdGg6ICdiJywgY29tcG9uZW50OiBCfSxcbiAgICAvLyAge3BhdGg6ICdjJywgY29tcG9uZW50OiBDfSxcbiAgICAvLyBdfVxuICAgIC8vIE5vdGljZSB0aGF0IHRoZSBjaGlsZHJlbiBvZiB0aGUgbmFtZWQgb3V0bGV0IGFyZSBjb25maWd1cmVkIHdpdGggdGhlIHByaW1hcnkgb3V0bGV0XG4gICAgY29uc3QgY2hpbGRyZW4gPSB0aGlzLnByb2Nlc3NTZWdtZW50KFxuICAgICAgICBjaGlsZENvbmZpZywgc2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50cywgbWF0Y2hlZE9uT3V0bGV0ID8gUFJJTUFSWV9PVVRMRVQgOiBvdXRsZXQpO1xuICAgIGlmIChjaGlsZHJlbiA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBbbmV3IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KHNuYXBzaG90LCBjaGlsZHJlbildO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNvcnRBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90cyhub2RlczogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXSk6IHZvaWQge1xuICBub2Rlcy5zb3J0KChhLCBiKSA9PiB7XG4gICAgaWYgKGEudmFsdWUub3V0bGV0ID09PSBQUklNQVJZX09VVExFVCkgcmV0dXJuIC0xO1xuICAgIGlmIChiLnZhbHVlLm91dGxldCA9PT0gUFJJTUFSWV9PVVRMRVQpIHJldHVybiAxO1xuICAgIHJldHVybiBhLnZhbHVlLm91dGxldC5sb2NhbGVDb21wYXJlKGIudmFsdWUub3V0bGV0KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldENoaWxkQ29uZmlnKHJvdXRlOiBSb3V0ZSk6IFJvdXRlW10ge1xuICBpZiAocm91dGUuY2hpbGRyZW4pIHtcbiAgICByZXR1cm4gcm91dGUuY2hpbGRyZW47XG4gIH1cblxuICBpZiAocm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgcmV0dXJuIHJvdXRlLl9sb2FkZWRSb3V0ZXMhO1xuICB9XG5cbiAgcmV0dXJuIFtdO1xufVxuXG5mdW5jdGlvbiBoYXNFbXB0eVBhdGhDb25maWcobm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4pIHtcbiAgY29uc3QgY29uZmlnID0gbm9kZS52YWx1ZS5yb3V0ZUNvbmZpZztcbiAgcmV0dXJuIGNvbmZpZyAmJiBjb25maWcucGF0aCA9PT0gJycgJiYgY29uZmlnLnJlZGlyZWN0VG8gPT09IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBGaW5kcyBgVHJlZU5vZGVgcyB3aXRoIG1hdGNoaW5nIGVtcHR5IHBhdGggcm91dGUgY29uZmlncyBhbmQgbWVyZ2VzIHRoZW0gaW50byBgVHJlZU5vZGVgIHdpdGggdGhlXG4gKiBjaGlsZHJlbiBmcm9tIGVhY2ggZHVwbGljYXRlLiBUaGlzIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIGRpZmZlcmVudCBvdXRsZXRzIGNhbiBtYXRjaCBhIHNpbmdsZVxuICogZW1wdHkgcGF0aCByb3V0ZSBjb25maWcgYW5kIHRoZSByZXN1bHRzIG5lZWQgdG8gdGhlbiBiZSBtZXJnZWQuXG4gKi9cbmZ1bmN0aW9uIG1lcmdlRW1wdHlQYXRoTWF0Y2hlcyhub2RlczogQXJyYXk8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4+KTpcbiAgICBBcnJheTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4ge1xuICBjb25zdCByZXN1bHQ6IEFycmF5PFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+PiA9IFtdO1xuICAvLyBUaGUgc2V0IG9mIG5vZGVzIHdoaWNoIGNvbnRhaW4gY2hpbGRyZW4gdGhhdCB3ZXJlIG1lcmdlZCBmcm9tIHR3byBkdXBsaWNhdGUgZW1wdHkgcGF0aCBub2Rlcy5cbiAgY29uc3QgbWVyZ2VkTm9kZXM6IFNldDxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4gPSBuZXcgU2V0KCk7XG5cbiAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgaWYgKCFoYXNFbXB0eVBhdGhDb25maWcobm9kZSkpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG5vZGUpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgZHVwbGljYXRlRW1wdHlQYXRoTm9kZSA9XG4gICAgICAgIHJlc3VsdC5maW5kKHJlc3VsdE5vZGUgPT4gbm9kZS52YWx1ZS5yb3V0ZUNvbmZpZyA9PT0gcmVzdWx0Tm9kZS52YWx1ZS5yb3V0ZUNvbmZpZyk7XG4gICAgaWYgKGR1cGxpY2F0ZUVtcHR5UGF0aE5vZGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZHVwbGljYXRlRW1wdHlQYXRoTm9kZS5jaGlsZHJlbi5wdXNoKC4uLm5vZGUuY2hpbGRyZW4pO1xuICAgICAgbWVyZ2VkTm9kZXMuYWRkKGR1cGxpY2F0ZUVtcHR5UGF0aE5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQucHVzaChub2RlKTtcbiAgICB9XG4gIH1cbiAgLy8gRm9yIGVhY2ggbm9kZSB3aGljaCBoYXMgY2hpbGRyZW4gZnJvbSBtdWx0aXBsZSBzb3VyY2VzLCB3ZSBuZWVkIHRvIHJlY29tcHV0ZSBhIG5ldyBgVHJlZU5vZGVgXG4gIC8vIGJ5IGFsc28gbWVyZ2luZyB0aG9zZSBjaGlsZHJlbi4gVGhpcyBpcyBuZWNlc3Nhcnkgd2hlbiB0aGVyZSBhcmUgbXVsdGlwbGUgZW1wdHkgcGF0aCBjb25maWdzIGluXG4gIC8vIGEgcm93LiBQdXQgYW5vdGhlciB3YXk6IHdoZW5ldmVyIHdlIGNvbWJpbmUgY2hpbGRyZW4gb2YgdHdvIG5vZGVzLCB3ZSBuZWVkIHRvIGFsc28gY2hlY2sgaWYgYW55XG4gIC8vIG9mIHRob3NlIGNoaWxkcmVuIGNhbiBiZSBjb21iaW5lZCBpbnRvIGEgc2luZ2xlIG5vZGUgYXMgd2VsbC5cbiAgZm9yIChjb25zdCBtZXJnZWROb2RlIG9mIG1lcmdlZE5vZGVzKSB7XG4gICAgY29uc3QgbWVyZ2VkQ2hpbGRyZW4gPSBtZXJnZUVtcHR5UGF0aE1hdGNoZXMobWVyZ2VkTm9kZS5jaGlsZHJlbik7XG4gICAgcmVzdWx0LnB1c2gobmV3IFRyZWVOb2RlKG1lcmdlZE5vZGUudmFsdWUsIG1lcmdlZENoaWxkcmVuKSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdC5maWx0ZXIobiA9PiAhbWVyZ2VkTm9kZXMuaGFzKG4pKTtcbn1cblxuZnVuY3Rpb24gY2hlY2tPdXRsZXROYW1lVW5pcXVlbmVzcyhub2RlczogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXSk6IHZvaWQge1xuICBjb25zdCBuYW1lczoge1trOiBzdHJpbmddOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90fSA9IHt9O1xuICBub2Rlcy5mb3JFYWNoKG4gPT4ge1xuICAgIGNvbnN0IHJvdXRlV2l0aFNhbWVPdXRsZXROYW1lID0gbmFtZXNbbi52YWx1ZS5vdXRsZXRdO1xuICAgIGlmIChyb3V0ZVdpdGhTYW1lT3V0bGV0TmFtZSkge1xuICAgICAgY29uc3QgcCA9IHJvdXRlV2l0aFNhbWVPdXRsZXROYW1lLnVybC5tYXAocyA9PiBzLnRvU3RyaW5nKCkpLmpvaW4oJy8nKTtcbiAgICAgIGNvbnN0IGMgPSBuLnZhbHVlLnVybC5tYXAocyA9PiBzLnRvU3RyaW5nKCkpLmpvaW4oJy8nKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVHdvIHNlZ21lbnRzIGNhbm5vdCBoYXZlIHRoZSBzYW1lIG91dGxldCBuYW1lOiAnJHtwfScgYW5kICcke2N9Jy5gKTtcbiAgICB9XG4gICAgbmFtZXNbbi52YWx1ZS5vdXRsZXRdID0gbi52YWx1ZTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldFNvdXJjZVNlZ21lbnRHcm91cChzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6IFVybFNlZ21lbnRHcm91cCB7XG4gIGxldCBzID0gc2VnbWVudEdyb3VwO1xuICB3aGlsZSAocy5fc291cmNlU2VnbWVudCkge1xuICAgIHMgPSBzLl9zb3VyY2VTZWdtZW50O1xuICB9XG4gIHJldHVybiBzO1xufVxuXG5mdW5jdGlvbiBnZXRQYXRoSW5kZXhTaGlmdChzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6IG51bWJlciB7XG4gIGxldCBzID0gc2VnbWVudEdyb3VwO1xuICBsZXQgcmVzID0gcy5fc2VnbWVudEluZGV4U2hpZnQgPz8gMDtcbiAgd2hpbGUgKHMuX3NvdXJjZVNlZ21lbnQpIHtcbiAgICBzID0gcy5fc291cmNlU2VnbWVudDtcbiAgICByZXMgKz0gcy5fc2VnbWVudEluZGV4U2hpZnQgPz8gMDtcbiAgfVxuICByZXR1cm4gcmVzIC0gMTtcbn1cblxuZnVuY3Rpb24gZ2V0Q29ycmVjdGVkUGF0aEluZGV4U2hpZnQoc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXApOiBudW1iZXIge1xuICBsZXQgcyA9IHNlZ21lbnRHcm91cDtcbiAgbGV0IHJlcyA9IHMuX3NlZ21lbnRJbmRleFNoaWZ0Q29ycmVjdGVkID8/IHMuX3NlZ21lbnRJbmRleFNoaWZ0ID8/IDA7XG4gIHdoaWxlIChzLl9zb3VyY2VTZWdtZW50KSB7XG4gICAgcyA9IHMuX3NvdXJjZVNlZ21lbnQ7XG4gICAgcmVzICs9IHMuX3NlZ21lbnRJbmRleFNoaWZ0Q29ycmVjdGVkID8/IHMuX3NlZ21lbnRJbmRleFNoaWZ0ID8/IDA7XG4gIH1cbiAgcmV0dXJuIHJlcyAtIDE7XG59XG5cbmZ1bmN0aW9uIGdldERhdGEocm91dGU6IFJvdXRlKTogRGF0YSB7XG4gIHJldHVybiByb3V0ZS5kYXRhIHx8IHt9O1xufVxuXG5mdW5jdGlvbiBnZXRSZXNvbHZlKHJvdXRlOiBSb3V0ZSk6IFJlc29sdmVEYXRhIHtcbiAgcmV0dXJuIHJvdXRlLnJlc29sdmUgfHwge307XG59XG4iXX0=