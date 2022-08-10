/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ɵRuntimeError as RuntimeError } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { catchError, concatMap, defaultIfEmpty, first, last as rxjsLast, map, scan, switchMap, takeWhile } from 'rxjs/operators';
import { ActivatedRouteSnapshot, inheritedParamsDataResolve, RouterStateSnapshot } from './router_state';
import { PRIMARY_OUTLET } from './shared';
import { last } from './utils/collection';
import { getOutlet, sortByMatchingOutlets } from './utils/config';
import { isImmediateMatch, matchWithChecks, noLeftoversInUrl, split } from './utils/config_matching';
import { TreeNode } from './utils/tree';
import { isEmptyError } from './utils/type_guards';
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || !!ngDevMode;
class NoMatch {
}
function newObservableError(e) {
    // TODO(atscott): This pattern is used throughout the router code and can be `throwError` instead.
    return new Observable((obs) => obs.error(e));
}
export function recognize(injector, rootComponentType, config, urlTree, url, urlSerializer, paramsInheritanceStrategy = 'emptyOnly', relativeLinkResolution = 'legacy') {
    return new Recognizer(injector, rootComponentType, config, urlTree, url, paramsInheritanceStrategy, relativeLinkResolution, urlSerializer)
        .recognize()
        .pipe(switchMap(result => {
        if (result === null) {
            return newObservableError(new NoMatch());
        }
        else {
            return of(result);
        }
    }));
}
export class Recognizer {
    constructor(injector, rootComponentType, config, urlTree, url, paramsInheritanceStrategy, relativeLinkResolution, urlSerializer) {
        this.injector = injector;
        this.rootComponentType = rootComponentType;
        this.config = config;
        this.urlTree = urlTree;
        this.url = url;
        this.paramsInheritanceStrategy = paramsInheritanceStrategy;
        this.relativeLinkResolution = relativeLinkResolution;
        this.urlSerializer = urlSerializer;
    }
    recognize() {
        const rootSegmentGroup = split(this.urlTree.root, [], [], this.config.filter(c => c.redirectTo === undefined), this.relativeLinkResolution)
            .segmentGroup;
        return this.processSegmentGroup(this.injector, this.config, rootSegmentGroup, PRIMARY_OUTLET)
            .pipe(map(children => {
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
        }));
    }
    inheritParamsAndData(routeNode) {
        const route = routeNode.value;
        const i = inheritedParamsDataResolve(route, this.paramsInheritanceStrategy);
        route.params = Object.freeze(i.params);
        route.data = Object.freeze(i.data);
        routeNode.children.forEach(n => this.inheritParamsAndData(n));
    }
    processSegmentGroup(injector, config, segmentGroup, outlet) {
        if (segmentGroup.segments.length === 0 && segmentGroup.hasChildren()) {
            return this.processChildren(injector, config, segmentGroup);
        }
        return this.processSegment(injector, config, segmentGroup, segmentGroup.segments, outlet);
    }
    /**
     * Matches every child outlet in the `segmentGroup` to a `Route` in the config. Returns `null` if
     * we cannot find a match for _any_ of the children.
     *
     * @param config - The `Routes` to match against
     * @param segmentGroup - The `UrlSegmentGroup` whose children need to be matched against the
     *     config.
     */
    processChildren(injector, config, segmentGroup) {
        return from(Object.keys(segmentGroup.children))
            .pipe(concatMap(childOutlet => {
            const child = segmentGroup.children[childOutlet];
            // Sort the config so that routes with outlets that match the one being activated
            // appear first, followed by routes for other outlets, which might match if they have
            // an empty path.
            const sortedConfig = sortByMatchingOutlets(config, childOutlet);
            return this.processSegmentGroup(injector, sortedConfig, child, childOutlet);
        }), scan((children, outletChildren) => {
            if (!children || !outletChildren)
                return null;
            children.push(...outletChildren);
            return children;
        }), takeWhile(children => children !== null), defaultIfEmpty(null), rxjsLast(), map(children => {
            if (children === null)
                return null;
            // Because we may have matched two outlets to the same empty path segment, we can have
            // multiple activated results for the same outlet. We should merge the children of
            // these results so the final return value is only one `TreeNode` per outlet.
            const mergedChildren = mergeEmptyPathMatches(children);
            if (NG_DEV_MODE) {
                // This should really never happen - we are only taking the first match for each
                // outlet and merge the empty path matches.
                checkOutletNameUniqueness(mergedChildren);
            }
            sortActivatedRouteSnapshots(mergedChildren);
            return mergedChildren;
        }));
    }
    processSegment(injector, routes, segmentGroup, segments, outlet) {
        return from(routes).pipe(concatMap(r => {
            return this.processSegmentAgainstRoute(r._injector ?? injector, r, segmentGroup, segments, outlet);
        }), first((x) => !!x), catchError(e => {
            if (isEmptyError(e)) {
                if (noLeftoversInUrl(segmentGroup, segments, outlet)) {
                    return of([]);
                }
                return of(null);
            }
            throw e;
        }));
    }
    processSegmentAgainstRoute(injector, route, rawSegment, segments, outlet) {
        if (route.redirectTo || !isImmediateMatch(route, rawSegment, segments, outlet))
            return of(null);
        let matchResult;
        if (route.path === '**') {
            const params = segments.length > 0 ? last(segments).parameters : {};
            const pathIndexShift = getPathIndexShift(rawSegment) + segments.length;
            const snapshot = new ActivatedRouteSnapshot(segments, params, Object.freeze({ ...this.urlTree.queryParams }), this.urlTree.fragment, getData(route), getOutlet(route), route.component ?? route._loadedComponent ?? null, route, getSourceSegmentGroup(rawSegment), pathIndexShift, getResolve(route), 
            // NG_DEV_MODE is used to prevent the getCorrectedPathIndexShift function from affecting
            // production bundle size. This value is intended only to surface a warning to users
            // depending on `relativeLinkResolution: 'legacy'` in dev mode.
            (NG_DEV_MODE ? getCorrectedPathIndexShift(rawSegment) + segments.length :
                pathIndexShift));
            matchResult = of({
                snapshot,
                consumedSegments: [],
                remainingSegments: [],
            });
        }
        else {
            matchResult =
                matchWithChecks(rawSegment, route, segments, injector, this.urlSerializer)
                    .pipe(map(({ matched, consumedSegments, remainingSegments, parameters }) => {
                    if (!matched) {
                        return null;
                    }
                    const pathIndexShift = getPathIndexShift(rawSegment) + consumedSegments.length;
                    const snapshot = new ActivatedRouteSnapshot(consumedSegments, parameters, Object.freeze({ ...this.urlTree.queryParams }), this.urlTree.fragment, getData(route), getOutlet(route), route.component ?? route._loadedComponent ?? null, route, getSourceSegmentGroup(rawSegment), pathIndexShift, getResolve(route), (NG_DEV_MODE ?
                        getCorrectedPathIndexShift(rawSegment) + consumedSegments.length :
                        pathIndexShift));
                    return { snapshot, consumedSegments, remainingSegments };
                }));
        }
        return matchResult.pipe(switchMap((result) => {
            if (result === null) {
                return of(null);
            }
            const { snapshot, consumedSegments, remainingSegments } = result;
            // If the route has an injector created from providers, we should start using that.
            injector = route._injector ?? injector;
            const childInjector = route._loadedInjector ?? injector;
            const childConfig = getChildConfig(route);
            const { segmentGroup, slicedSegments } = split(rawSegment, consumedSegments, remainingSegments, 
            // Filter out routes with redirectTo because we are trying to create activated route
            // snapshots and don't handle redirects here. That should have been done in
            // `applyRedirects`.
            childConfig.filter(c => c.redirectTo === undefined), this.relativeLinkResolution);
            if (slicedSegments.length === 0 && segmentGroup.hasChildren()) {
                return this.processChildren(childInjector, childConfig, segmentGroup).pipe(map(children => {
                    if (children === null) {
                        return null;
                    }
                    return [new TreeNode(snapshot, children)];
                }));
            }
            if (childConfig.length === 0 && slicedSegments.length === 0) {
                return of([new TreeNode(snapshot, [])]);
            }
            const matchedOnOutlet = getOutlet(route) === outlet;
            // If we matched a config due to empty path match on a different outlet, we need to
            // continue passing the current outlet for the segment rather than switch to PRIMARY.
            // Note that we switch to primary when we have a match because outlet configs look like
            // this: {path: 'a', outlet: 'a', children: [
            //  {path: 'b', component: B},
            //  {path: 'c', component: C},
            // ]}
            // Notice that the children of the named outlet are configured with the primary outlet
            return this
                .processSegment(childInjector, childConfig, segmentGroup, slicedSegments, matchedOnOutlet ? PRIMARY_OUTLET : outlet)
                .pipe(map(children => {
                if (children === null) {
                    return null;
                }
                return [new TreeNode(snapshot, children)];
            }));
        }));
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
 * Finds `TreeNode`s with matching empty path route configs and merges them into `TreeNode` with
 * the children from each duplicate. This is necessary because different outlets can match a
 * single empty path route config and the results need to then be merged.
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
    // by also merging those children. This is necessary when there are multiple empty path configs
    // in a row. Put another way: whenever we combine children of two nodes, we need to also check
    // if any of those children can be combined into a single node as well.
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
            throw new RuntimeError(4006 /* RuntimeErrorCode.TWO_SEGMENTS_WITH_SAME_OUTLET */, NG_DEV_MODE && `Two segments cannot have the same outlet name: '${p}' and '${c}'.`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb2duaXplLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yZWNvZ25pemUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUE0QixhQUFhLElBQUksWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3ZGLE9BQU8sRUFBYSxJQUFJLEVBQUUsVUFBVSxFQUFZLEVBQUUsRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUNoRSxPQUFPLEVBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLElBQUksSUFBSSxRQUFRLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFJL0gsT0FBTyxFQUFDLHNCQUFzQixFQUFFLDBCQUEwQixFQUE2QixtQkFBbUIsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ2xJLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFFeEMsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxTQUFTLEVBQUUscUJBQXFCLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUNoRSxPQUFPLEVBQUMsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQ25HLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDdEMsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBRWpELE1BQU0sV0FBVyxHQUFHLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDO0FBRXBFLE1BQU0sT0FBTztDQUFHO0FBRWhCLFNBQVMsa0JBQWtCLENBQUMsQ0FBVTtJQUNwQyxrR0FBa0c7SUFD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Q0FBQztBQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RW52aXJvbm1lbnRJbmplY3RvciwgVHlwZSwgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7RW1wdHlFcnJvciwgZnJvbSwgT2JzZXJ2YWJsZSwgT2JzZXJ2ZXIsIG9mfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y2F0Y2hFcnJvciwgY29uY2F0TWFwLCBkZWZhdWx0SWZFbXB0eSwgZmlyc3QsIGxhc3QgYXMgcnhqc0xhc3QsIG1hcCwgc2Nhbiwgc3dpdGNoTWFwLCB0YWtlV2hpbGV9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtSdW50aW1lRXJyb3JDb2RlfSBmcm9tICcuL2Vycm9ycyc7XG5pbXBvcnQge0RhdGEsIFJlc29sdmVEYXRhLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIGluaGVyaXRlZFBhcmFtc0RhdGFSZXNvbHZlLCBQYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LCBSb3V0ZXJTdGF0ZVNuYXBzaG90fSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BSSU1BUllfT1VUTEVUfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge1VybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cCwgVXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge2xhc3R9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge2dldE91dGxldCwgc29ydEJ5TWF0Y2hpbmdPdXRsZXRzfSBmcm9tICcuL3V0aWxzL2NvbmZpZyc7XG5pbXBvcnQge2lzSW1tZWRpYXRlTWF0Y2gsIG1hdGNoV2l0aENoZWNrcywgbm9MZWZ0b3ZlcnNJblVybCwgc3BsaXR9IGZyb20gJy4vdXRpbHMvY29uZmlnX21hdGNoaW5nJztcbmltcG9ydCB7VHJlZU5vZGV9IGZyb20gJy4vdXRpbHMvdHJlZSc7XG5pbXBvcnQge2lzRW1wdHlFcnJvcn0gZnJvbSAnLi91dGlscy90eXBlX2d1YXJkcyc7XG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgISFuZ0Rldk1vZGU7XG5cbmNsYXNzIE5vTWF0Y2gge31cblxuZnVuY3Rpb24gbmV3T2JzZXJ2YWJsZUVycm9yKGU6IHVua25vd24pOiBPYnNlcnZhYmxlPFJvdXRlclN0YXRlU25hcHNob3Q+IHtcbiAgLy8gVE9ETyhhdHNjb3R0KTogVGhpcyBwYXR0ZXJuIGlzIHVzZWQgdGhyb3VnaG91dCB0aGUgcm91dGVyIGNvZGUgYW5kIGNhbiBiZSBgdGhyb3dFcnJvcmAgaW5zdGVhZC5cbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFJvdXRlclN0YXRlU25hcHNob3Q+KChvYnM6IE9ic2VydmVyPFJvdXRlclN0YXRlU25hcHNob3Q+KSA9PiBvYnMuZXJyb3IoZSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVjb2duaXplKFxuICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+fG51bGwsIGNvbmZpZzogUm91dGVzLFxuICAgIHVybFRyZWU6IFVybFRyZWUsIHVybDogc3RyaW5nLCB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6IFBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kgPSAnZW1wdHlPbmx5JyxcbiAgICByZWxhdGl2ZUxpbmtSZXNvbHV0aW9uOiAnbGVnYWN5J3wnY29ycmVjdGVkJyA9ICdsZWdhY3knKTogT2JzZXJ2YWJsZTxSb3V0ZXJTdGF0ZVNuYXBzaG90PiB7XG4gIHJldHVybiBuZXcgUmVjb2duaXplcihcbiAgICAgICAgICAgICBpbmplY3Rvciwgcm9vdENvbXBvbmVudFR5cGUsIGNvbmZpZywgdXJsVHJlZSwgdXJsLCBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LFxuICAgICAgICAgICAgIHJlbGF0aXZlTGlua1Jlc29sdXRpb24sIHVybFNlcmlhbGl6ZXIpXG4gICAgICAucmVjb2duaXplKClcbiAgICAgIC5waXBlKHN3aXRjaE1hcChyZXN1bHQgPT4ge1xuICAgICAgICBpZiAocmVzdWx0ID09PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIG5ld09ic2VydmFibGVFcnJvcihuZXcgTm9NYXRjaCgpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gb2YocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgfSkpO1xufVxuXG5leHBvcnQgY2xhc3MgUmVjb2duaXplciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvciwgcHJpdmF0ZSByb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+fG51bGwsXG4gICAgICBwcml2YXRlIGNvbmZpZzogUm91dGVzLCBwcml2YXRlIHVybFRyZWU6IFVybFRyZWUsIHByaXZhdGUgdXJsOiBzdHJpbmcsXG4gICAgICBwcml2YXRlIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6IFBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3ksXG4gICAgICBwcml2YXRlIHJlbGF0aXZlTGlua1Jlc29sdXRpb246ICdsZWdhY3knfCdjb3JyZWN0ZWQnLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyKSB7fVxuXG4gIHJlY29nbml6ZSgpOiBPYnNlcnZhYmxlPFJvdXRlclN0YXRlU25hcHNob3R8bnVsbD4ge1xuICAgIGNvbnN0IHJvb3RTZWdtZW50R3JvdXAgPVxuICAgICAgICBzcGxpdChcbiAgICAgICAgICAgIHRoaXMudXJsVHJlZS5yb290LCBbXSwgW10sIHRoaXMuY29uZmlnLmZpbHRlcihjID0+IGMucmVkaXJlY3RUbyA9PT0gdW5kZWZpbmVkKSxcbiAgICAgICAgICAgIHRoaXMucmVsYXRpdmVMaW5rUmVzb2x1dGlvbilcbiAgICAgICAgICAgIC5zZWdtZW50R3JvdXA7XG5cbiAgICByZXR1cm4gdGhpcy5wcm9jZXNzU2VnbWVudEdyb3VwKHRoaXMuaW5qZWN0b3IsIHRoaXMuY29uZmlnLCByb290U2VnbWVudEdyb3VwLCBQUklNQVJZX09VVExFVClcbiAgICAgICAgLnBpcGUobWFwKGNoaWxkcmVuID0+IHtcbiAgICAgICAgICBpZiAoY2hpbGRyZW4gPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFVzZSBPYmplY3QuZnJlZXplIHRvIHByZXZlbnQgcmVhZGVycyBvZiB0aGUgUm91dGVyIHN0YXRlIGZyb20gbW9kaWZ5aW5nIGl0IG91dHNpZGUgb2YgYVxuICAgICAgICAgIC8vIG5hdmlnYXRpb24sIHJlc3VsdGluZyBpbiB0aGUgcm91dGVyIGJlaW5nIG91dCBvZiBzeW5jIHdpdGggdGhlIGJyb3dzZXIuXG4gICAgICAgICAgY29uc3Qgcm9vdCA9IG5ldyBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KFxuICAgICAgICAgICAgICBbXSwgT2JqZWN0LmZyZWV6ZSh7fSksIE9iamVjdC5mcmVlemUoey4uLnRoaXMudXJsVHJlZS5xdWVyeVBhcmFtc30pLFxuICAgICAgICAgICAgICB0aGlzLnVybFRyZWUuZnJhZ21lbnQsIHt9LCBQUklNQVJZX09VVExFVCwgdGhpcy5yb290Q29tcG9uZW50VHlwZSwgbnVsbCxcbiAgICAgICAgICAgICAgdGhpcy51cmxUcmVlLnJvb3QsIC0xLCB7fSk7XG5cbiAgICAgICAgICBjb25zdCByb290Tm9kZSA9IG5ldyBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pihyb290LCBjaGlsZHJlbik7XG4gICAgICAgICAgY29uc3Qgcm91dGVTdGF0ZSA9IG5ldyBSb3V0ZXJTdGF0ZVNuYXBzaG90KHRoaXMudXJsLCByb290Tm9kZSk7XG4gICAgICAgICAgdGhpcy5pbmhlcml0UGFyYW1zQW5kRGF0YShyb3V0ZVN0YXRlLl9yb290KTtcbiAgICAgICAgICByZXR1cm4gcm91dGVTdGF0ZTtcbiAgICAgICAgfSkpO1xuICB9XG5cbiAgaW5oZXJpdFBhcmFtc0FuZERhdGEocm91dGVOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pik6IHZvaWQge1xuICAgIGNvbnN0IHJvdXRlID0gcm91dGVOb2RlLnZhbHVlO1xuXG4gICAgY29uc3QgaSA9IGluaGVyaXRlZFBhcmFtc0RhdGFSZXNvbHZlKHJvdXRlLCB0aGlzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kpO1xuICAgIHJvdXRlLnBhcmFtcyA9IE9iamVjdC5mcmVlemUoaS5wYXJhbXMpO1xuICAgIHJvdXRlLmRhdGEgPSBPYmplY3QuZnJlZXplKGkuZGF0YSk7XG5cbiAgICByb3V0ZU5vZGUuY2hpbGRyZW4uZm9yRWFjaChuID0+IHRoaXMuaW5oZXJpdFBhcmFtc0FuZERhdGEobikpO1xuICB9XG5cbiAgcHJvY2Vzc1NlZ21lbnRHcm91cChcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCBjb25maWc6IFJvdXRlW10sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLFxuICAgICAgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W118bnVsbD4ge1xuICAgIGlmIChzZWdtZW50R3JvdXAuc2VnbWVudHMubGVuZ3RoID09PSAwICYmIHNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5wcm9jZXNzQ2hpbGRyZW4oaW5qZWN0b3IsIGNvbmZpZywgc2VnbWVudEdyb3VwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5wcm9jZXNzU2VnbWVudChpbmplY3RvciwgY29uZmlnLCBzZWdtZW50R3JvdXAsIHNlZ21lbnRHcm91cC5zZWdtZW50cywgb3V0bGV0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNYXRjaGVzIGV2ZXJ5IGNoaWxkIG91dGxldCBpbiB0aGUgYHNlZ21lbnRHcm91cGAgdG8gYSBgUm91dGVgIGluIHRoZSBjb25maWcuIFJldHVybnMgYG51bGxgIGlmXG4gICAqIHdlIGNhbm5vdCBmaW5kIGEgbWF0Y2ggZm9yIF9hbnlfIG9mIHRoZSBjaGlsZHJlbi5cbiAgICpcbiAgICogQHBhcmFtIGNvbmZpZyAtIFRoZSBgUm91dGVzYCB0byBtYXRjaCBhZ2FpbnN0XG4gICAqIEBwYXJhbSBzZWdtZW50R3JvdXAgLSBUaGUgYFVybFNlZ21lbnRHcm91cGAgd2hvc2UgY2hpbGRyZW4gbmVlZCB0byBiZSBtYXRjaGVkIGFnYWluc3QgdGhlXG4gICAqICAgICBjb25maWcuXG4gICAqL1xuICBwcm9jZXNzQ2hpbGRyZW4oaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIGNvbmZpZzogUm91dGVbXSwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXApOlxuICAgICAgT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PltdfG51bGw+IHtcbiAgICByZXR1cm4gZnJvbShPYmplY3Qua2V5cyhzZWdtZW50R3JvdXAuY2hpbGRyZW4pKVxuICAgICAgICAucGlwZShcbiAgICAgICAgICAgIGNvbmNhdE1hcChjaGlsZE91dGxldCA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGNoaWxkID0gc2VnbWVudEdyb3VwLmNoaWxkcmVuW2NoaWxkT3V0bGV0XTtcbiAgICAgICAgICAgICAgLy8gU29ydCB0aGUgY29uZmlnIHNvIHRoYXQgcm91dGVzIHdpdGggb3V0bGV0cyB0aGF0IG1hdGNoIHRoZSBvbmUgYmVpbmcgYWN0aXZhdGVkXG4gICAgICAgICAgICAgIC8vIGFwcGVhciBmaXJzdCwgZm9sbG93ZWQgYnkgcm91dGVzIGZvciBvdGhlciBvdXRsZXRzLCB3aGljaCBtaWdodCBtYXRjaCBpZiB0aGV5IGhhdmVcbiAgICAgICAgICAgICAgLy8gYW4gZW1wdHkgcGF0aC5cbiAgICAgICAgICAgICAgY29uc3Qgc29ydGVkQ29uZmlnID0gc29ydEJ5TWF0Y2hpbmdPdXRsZXRzKGNvbmZpZywgY2hpbGRPdXRsZXQpO1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzU2VnbWVudEdyb3VwKGluamVjdG9yLCBzb3J0ZWRDb25maWcsIGNoaWxkLCBjaGlsZE91dGxldCk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHNjYW4oKGNoaWxkcmVuLCBvdXRsZXRDaGlsZHJlbikgPT4ge1xuICAgICAgICAgICAgICBpZiAoIWNoaWxkcmVuIHx8ICFvdXRsZXRDaGlsZHJlbikgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2goLi4ub3V0bGV0Q2hpbGRyZW4pO1xuICAgICAgICAgICAgICByZXR1cm4gY2hpbGRyZW47XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHRha2VXaGlsZShjaGlsZHJlbiA9PiBjaGlsZHJlbiAhPT0gbnVsbCksXG4gICAgICAgICAgICBkZWZhdWx0SWZFbXB0eShudWxsIGFzIFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10gfCBudWxsKSxcbiAgICAgICAgICAgIHJ4anNMYXN0KCksXG4gICAgICAgICAgICBtYXAoY2hpbGRyZW4gPT4ge1xuICAgICAgICAgICAgICBpZiAoY2hpbGRyZW4gPT09IG51bGwpIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAvLyBCZWNhdXNlIHdlIG1heSBoYXZlIG1hdGNoZWQgdHdvIG91dGxldHMgdG8gdGhlIHNhbWUgZW1wdHkgcGF0aCBzZWdtZW50LCB3ZSBjYW4gaGF2ZVxuICAgICAgICAgICAgICAvLyBtdWx0aXBsZSBhY3RpdmF0ZWQgcmVzdWx0cyBmb3IgdGhlIHNhbWUgb3V0bGV0LiBXZSBzaG91bGQgbWVyZ2UgdGhlIGNoaWxkcmVuIG9mXG4gICAgICAgICAgICAgIC8vIHRoZXNlIHJlc3VsdHMgc28gdGhlIGZpbmFsIHJldHVybiB2YWx1ZSBpcyBvbmx5IG9uZSBgVHJlZU5vZGVgIHBlciBvdXRsZXQuXG4gICAgICAgICAgICAgIGNvbnN0IG1lcmdlZENoaWxkcmVuID0gbWVyZ2VFbXB0eVBhdGhNYXRjaGVzKGNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgaWYgKE5HX0RFVl9NT0RFKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhpcyBzaG91bGQgcmVhbGx5IG5ldmVyIGhhcHBlbiAtIHdlIGFyZSBvbmx5IHRha2luZyB0aGUgZmlyc3QgbWF0Y2ggZm9yIGVhY2hcbiAgICAgICAgICAgICAgICAvLyBvdXRsZXQgYW5kIG1lcmdlIHRoZSBlbXB0eSBwYXRoIG1hdGNoZXMuXG4gICAgICAgICAgICAgICAgY2hlY2tPdXRsZXROYW1lVW5pcXVlbmVzcyhtZXJnZWRDaGlsZHJlbik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgc29ydEFjdGl2YXRlZFJvdXRlU25hcHNob3RzKG1lcmdlZENoaWxkcmVuKTtcbiAgICAgICAgICAgICAgcmV0dXJuIG1lcmdlZENoaWxkcmVuO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICk7XG4gIH1cblxuICBwcm9jZXNzU2VnbWVudChcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZXM6IFJvdXRlW10sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLFxuICAgICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W118bnVsbD4ge1xuICAgIHJldHVybiBmcm9tKHJvdXRlcykucGlwZShcbiAgICAgICAgY29uY2F0TWFwKHIgPT4ge1xuICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NTZWdtZW50QWdhaW5zdFJvdXRlKFxuICAgICAgICAgICAgICByLl9pbmplY3RvciA/PyBpbmplY3Rvciwgciwgc2VnbWVudEdyb3VwLCBzZWdtZW50cywgb3V0bGV0KTtcbiAgICAgICAgfSksXG4gICAgICAgIGZpcnN0KCh4KTogeCBpcyBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PltdID0+ICEheCksIGNhdGNoRXJyb3IoZSA9PiB7XG4gICAgICAgICAgaWYgKGlzRW1wdHlFcnJvcihlKSkge1xuICAgICAgICAgICAgaWYgKG5vTGVmdG92ZXJzSW5Vcmwoc2VnbWVudEdyb3VwLCBzZWdtZW50cywgb3V0bGV0KSkge1xuICAgICAgICAgICAgICByZXR1cm4gb2YoW10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG9mKG51bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9KSk7XG4gIH1cblxuICBwcm9jZXNzU2VnbWVudEFnYWluc3RSb3V0ZShcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZTogUm91dGUsIHJhd1NlZ21lbnQ6IFVybFNlZ21lbnRHcm91cCxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nKTogT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PltdfG51bGw+IHtcbiAgICBpZiAocm91dGUucmVkaXJlY3RUbyB8fCAhaXNJbW1lZGlhdGVNYXRjaChyb3V0ZSwgcmF3U2VnbWVudCwgc2VnbWVudHMsIG91dGxldCkpIHJldHVybiBvZihudWxsKTtcblxuICAgIGxldCBtYXRjaFJlc3VsdDogT2JzZXJ2YWJsZTx7XG4gICAgICBzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCxcbiAgICAgIGNvbnN1bWVkU2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICAgIHJlbWFpbmluZ1NlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgfXxudWxsPjtcblxuICAgIGlmIChyb3V0ZS5wYXRoID09PSAnKionKSB7XG4gICAgICBjb25zdCBwYXJhbXMgPSBzZWdtZW50cy5sZW5ndGggPiAwID8gbGFzdChzZWdtZW50cykhLnBhcmFtZXRlcnMgOiB7fTtcbiAgICAgIGNvbnN0IHBhdGhJbmRleFNoaWZ0ID0gZ2V0UGF0aEluZGV4U2hpZnQocmF3U2VnbWVudCkgKyBzZWdtZW50cy5sZW5ndGg7XG4gICAgICBjb25zdCBzbmFwc2hvdCA9IG5ldyBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KFxuICAgICAgICAgIHNlZ21lbnRzLCBwYXJhbXMsIE9iamVjdC5mcmVlemUoey4uLnRoaXMudXJsVHJlZS5xdWVyeVBhcmFtc30pLCB0aGlzLnVybFRyZWUuZnJhZ21lbnQsXG4gICAgICAgICAgZ2V0RGF0YShyb3V0ZSksIGdldE91dGxldChyb3V0ZSksIHJvdXRlLmNvbXBvbmVudCA/PyByb3V0ZS5fbG9hZGVkQ29tcG9uZW50ID8/IG51bGwsXG4gICAgICAgICAgcm91dGUsIGdldFNvdXJjZVNlZ21lbnRHcm91cChyYXdTZWdtZW50KSwgcGF0aEluZGV4U2hpZnQsIGdldFJlc29sdmUocm91dGUpLFxuICAgICAgICAgIC8vIE5HX0RFVl9NT0RFIGlzIHVzZWQgdG8gcHJldmVudCB0aGUgZ2V0Q29ycmVjdGVkUGF0aEluZGV4U2hpZnQgZnVuY3Rpb24gZnJvbSBhZmZlY3RpbmdcbiAgICAgICAgICAvLyBwcm9kdWN0aW9uIGJ1bmRsZSBzaXplLiBUaGlzIHZhbHVlIGlzIGludGVuZGVkIG9ubHkgdG8gc3VyZmFjZSBhIHdhcm5pbmcgdG8gdXNlcnNcbiAgICAgICAgICAvLyBkZXBlbmRpbmcgb24gYHJlbGF0aXZlTGlua1Jlc29sdXRpb246ICdsZWdhY3knYCBpbiBkZXYgbW9kZS5cbiAgICAgICAgICAoTkdfREVWX01PREUgPyBnZXRDb3JyZWN0ZWRQYXRoSW5kZXhTaGlmdChyYXdTZWdtZW50KSArIHNlZ21lbnRzLmxlbmd0aCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgcGF0aEluZGV4U2hpZnQpKTtcbiAgICAgIG1hdGNoUmVzdWx0ID0gb2Yoe1xuICAgICAgICBzbmFwc2hvdCxcbiAgICAgICAgY29uc3VtZWRTZWdtZW50czogW10sXG4gICAgICAgIHJlbWFpbmluZ1NlZ21lbnRzOiBbXSxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBtYXRjaFJlc3VsdCA9XG4gICAgICAgICAgbWF0Y2hXaXRoQ2hlY2tzKHJhd1NlZ21lbnQsIHJvdXRlLCBzZWdtZW50cywgaW5qZWN0b3IsIHRoaXMudXJsU2VyaWFsaXplcilcbiAgICAgICAgICAgICAgLnBpcGUobWFwKCh7bWF0Y2hlZCwgY29uc3VtZWRTZWdtZW50cywgcmVtYWluaW5nU2VnbWVudHMsIHBhcmFtZXRlcnN9KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFtYXRjaGVkKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgcGF0aEluZGV4U2hpZnQgPSBnZXRQYXRoSW5kZXhTaGlmdChyYXdTZWdtZW50KSArIGNvbnN1bWVkU2VnbWVudHMubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc25hcHNob3QgPSBuZXcgQWN0aXZhdGVkUm91dGVTbmFwc2hvdChcbiAgICAgICAgICAgICAgICAgICAgY29uc3VtZWRTZWdtZW50cywgcGFyYW1ldGVycywgT2JqZWN0LmZyZWV6ZSh7Li4udGhpcy51cmxUcmVlLnF1ZXJ5UGFyYW1zfSksXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXJsVHJlZS5mcmFnbWVudCwgZ2V0RGF0YShyb3V0ZSksIGdldE91dGxldChyb3V0ZSksXG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLmNvbXBvbmVudCA/PyByb3V0ZS5fbG9hZGVkQ29tcG9uZW50ID8/IG51bGwsIHJvdXRlLFxuICAgICAgICAgICAgICAgICAgICBnZXRTb3VyY2VTZWdtZW50R3JvdXAocmF3U2VnbWVudCksIHBhdGhJbmRleFNoaWZ0LCBnZXRSZXNvbHZlKHJvdXRlKSxcbiAgICAgICAgICAgICAgICAgICAgKE5HX0RFVl9NT0RFID9cbiAgICAgICAgICAgICAgICAgICAgICAgICBnZXRDb3JyZWN0ZWRQYXRoSW5kZXhTaGlmdChyYXdTZWdtZW50KSArIGNvbnN1bWVkU2VnbWVudHMubGVuZ3RoIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoSW5kZXhTaGlmdCkpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7c25hcHNob3QsIGNvbnN1bWVkU2VnbWVudHMsIHJlbWFpbmluZ1NlZ21lbnRzfTtcbiAgICAgICAgICAgICAgfSkpO1xuICAgIH1cblxuICAgIHJldHVybiBtYXRjaFJlc3VsdC5waXBlKHN3aXRjaE1hcCgocmVzdWx0KSA9PiB7XG4gICAgICBpZiAocmVzdWx0ID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBvZihudWxsKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHtzbmFwc2hvdCwgY29uc3VtZWRTZWdtZW50cywgcmVtYWluaW5nU2VnbWVudHN9ID0gcmVzdWx0O1xuICAgICAgLy8gSWYgdGhlIHJvdXRlIGhhcyBhbiBpbmplY3RvciBjcmVhdGVkIGZyb20gcHJvdmlkZXJzLCB3ZSBzaG91bGQgc3RhcnQgdXNpbmcgdGhhdC5cbiAgICAgIGluamVjdG9yID0gcm91dGUuX2luamVjdG9yID8/IGluamVjdG9yO1xuICAgICAgY29uc3QgY2hpbGRJbmplY3RvciA9IHJvdXRlLl9sb2FkZWRJbmplY3RvciA/PyBpbmplY3RvcjtcbiAgICAgIGNvbnN0IGNoaWxkQ29uZmlnOiBSb3V0ZVtdID0gZ2V0Q2hpbGRDb25maWcocm91dGUpO1xuXG4gICAgICBjb25zdCB7c2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50c30gPSBzcGxpdChcbiAgICAgICAgICByYXdTZWdtZW50LCBjb25zdW1lZFNlZ21lbnRzLCByZW1haW5pbmdTZWdtZW50cyxcbiAgICAgICAgICAvLyBGaWx0ZXIgb3V0IHJvdXRlcyB3aXRoIHJlZGlyZWN0VG8gYmVjYXVzZSB3ZSBhcmUgdHJ5aW5nIHRvIGNyZWF0ZSBhY3RpdmF0ZWQgcm91dGVcbiAgICAgICAgICAvLyBzbmFwc2hvdHMgYW5kIGRvbid0IGhhbmRsZSByZWRpcmVjdHMgaGVyZS4gVGhhdCBzaG91bGQgaGF2ZSBiZWVuIGRvbmUgaW5cbiAgICAgICAgICAvLyBgYXBwbHlSZWRpcmVjdHNgLlxuICAgICAgICAgIGNoaWxkQ29uZmlnLmZpbHRlcihjID0+IGMucmVkaXJlY3RUbyA9PT0gdW5kZWZpbmVkKSwgdGhpcy5yZWxhdGl2ZUxpbmtSZXNvbHV0aW9uKTtcblxuICAgICAgaWYgKHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiBzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzQ2hpbGRyZW4oY2hpbGRJbmplY3RvciwgY2hpbGRDb25maWcsIHNlZ21lbnRHcm91cCkucGlwZShtYXAoY2hpbGRyZW4gPT4ge1xuICAgICAgICAgIGlmIChjaGlsZHJlbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBbbmV3IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KHNuYXBzaG90LCBjaGlsZHJlbildO1xuICAgICAgICB9KSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjaGlsZENvbmZpZy5sZW5ndGggPT09IDAgJiYgc2xpY2VkU2VnbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvZihbbmV3IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KHNuYXBzaG90LCBbXSldKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWF0Y2hlZE9uT3V0bGV0ID0gZ2V0T3V0bGV0KHJvdXRlKSA9PT0gb3V0bGV0O1xuICAgICAgLy8gSWYgd2UgbWF0Y2hlZCBhIGNvbmZpZyBkdWUgdG8gZW1wdHkgcGF0aCBtYXRjaCBvbiBhIGRpZmZlcmVudCBvdXRsZXQsIHdlIG5lZWQgdG9cbiAgICAgIC8vIGNvbnRpbnVlIHBhc3NpbmcgdGhlIGN1cnJlbnQgb3V0bGV0IGZvciB0aGUgc2VnbWVudCByYXRoZXIgdGhhbiBzd2l0Y2ggdG8gUFJJTUFSWS5cbiAgICAgIC8vIE5vdGUgdGhhdCB3ZSBzd2l0Y2ggdG8gcHJpbWFyeSB3aGVuIHdlIGhhdmUgYSBtYXRjaCBiZWNhdXNlIG91dGxldCBjb25maWdzIGxvb2sgbGlrZVxuICAgICAgLy8gdGhpczoge3BhdGg6ICdhJywgb3V0bGV0OiAnYScsIGNoaWxkcmVuOiBbXG4gICAgICAvLyAge3BhdGg6ICdiJywgY29tcG9uZW50OiBCfSxcbiAgICAgIC8vICB7cGF0aDogJ2MnLCBjb21wb25lbnQ6IEN9LFxuICAgICAgLy8gXX1cbiAgICAgIC8vIE5vdGljZSB0aGF0IHRoZSBjaGlsZHJlbiBvZiB0aGUgbmFtZWQgb3V0bGV0IGFyZSBjb25maWd1cmVkIHdpdGggdGhlIHByaW1hcnkgb3V0bGV0XG4gICAgICByZXR1cm4gdGhpc1xuICAgICAgICAgIC5wcm9jZXNzU2VnbWVudChcbiAgICAgICAgICAgICAgY2hpbGRJbmplY3RvciwgY2hpbGRDb25maWcsIHNlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHMsXG4gICAgICAgICAgICAgIG1hdGNoZWRPbk91dGxldCA/IFBSSU1BUllfT1VUTEVUIDogb3V0bGV0KVxuICAgICAgICAgIC5waXBlKG1hcChjaGlsZHJlbiA9PiB7XG4gICAgICAgICAgICBpZiAoY2hpbGRyZW4gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gW25ldyBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PihzbmFwc2hvdCwgY2hpbGRyZW4pXTtcbiAgICAgICAgICB9KSk7XG4gICAgfSkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNvcnRBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90cyhub2RlczogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXSk6IHZvaWQge1xuICBub2Rlcy5zb3J0KChhLCBiKSA9PiB7XG4gICAgaWYgKGEudmFsdWUub3V0bGV0ID09PSBQUklNQVJZX09VVExFVCkgcmV0dXJuIC0xO1xuICAgIGlmIChiLnZhbHVlLm91dGxldCA9PT0gUFJJTUFSWV9PVVRMRVQpIHJldHVybiAxO1xuICAgIHJldHVybiBhLnZhbHVlLm91dGxldC5sb2NhbGVDb21wYXJlKGIudmFsdWUub3V0bGV0KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldENoaWxkQ29uZmlnKHJvdXRlOiBSb3V0ZSk6IFJvdXRlW10ge1xuICBpZiAocm91dGUuY2hpbGRyZW4pIHtcbiAgICByZXR1cm4gcm91dGUuY2hpbGRyZW47XG4gIH1cblxuICBpZiAocm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgcmV0dXJuIHJvdXRlLl9sb2FkZWRSb3V0ZXMhO1xuICB9XG5cbiAgcmV0dXJuIFtdO1xufVxuXG5mdW5jdGlvbiBoYXNFbXB0eVBhdGhDb25maWcobm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4pIHtcbiAgY29uc3QgY29uZmlnID0gbm9kZS52YWx1ZS5yb3V0ZUNvbmZpZztcbiAgcmV0dXJuIGNvbmZpZyAmJiBjb25maWcucGF0aCA9PT0gJycgJiYgY29uZmlnLnJlZGlyZWN0VG8gPT09IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBGaW5kcyBgVHJlZU5vZGVgcyB3aXRoIG1hdGNoaW5nIGVtcHR5IHBhdGggcm91dGUgY29uZmlncyBhbmQgbWVyZ2VzIHRoZW0gaW50byBgVHJlZU5vZGVgIHdpdGhcbiAqIHRoZSBjaGlsZHJlbiBmcm9tIGVhY2ggZHVwbGljYXRlLiBUaGlzIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIGRpZmZlcmVudCBvdXRsZXRzIGNhbiBtYXRjaCBhXG4gKiBzaW5nbGUgZW1wdHkgcGF0aCByb3V0ZSBjb25maWcgYW5kIHRoZSByZXN1bHRzIG5lZWQgdG8gdGhlbiBiZSBtZXJnZWQuXG4gKi9cbmZ1bmN0aW9uIG1lcmdlRW1wdHlQYXRoTWF0Y2hlcyhub2RlczogQXJyYXk8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4+KTpcbiAgICBBcnJheTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4ge1xuICBjb25zdCByZXN1bHQ6IEFycmF5PFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+PiA9IFtdO1xuICAvLyBUaGUgc2V0IG9mIG5vZGVzIHdoaWNoIGNvbnRhaW4gY2hpbGRyZW4gdGhhdCB3ZXJlIG1lcmdlZCBmcm9tIHR3byBkdXBsaWNhdGUgZW1wdHkgcGF0aCBub2Rlcy5cbiAgY29uc3QgbWVyZ2VkTm9kZXM6IFNldDxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4gPSBuZXcgU2V0KCk7XG5cbiAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgaWYgKCFoYXNFbXB0eVBhdGhDb25maWcobm9kZSkpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG5vZGUpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgZHVwbGljYXRlRW1wdHlQYXRoTm9kZSA9XG4gICAgICAgIHJlc3VsdC5maW5kKHJlc3VsdE5vZGUgPT4gbm9kZS52YWx1ZS5yb3V0ZUNvbmZpZyA9PT0gcmVzdWx0Tm9kZS52YWx1ZS5yb3V0ZUNvbmZpZyk7XG4gICAgaWYgKGR1cGxpY2F0ZUVtcHR5UGF0aE5vZGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZHVwbGljYXRlRW1wdHlQYXRoTm9kZS5jaGlsZHJlbi5wdXNoKC4uLm5vZGUuY2hpbGRyZW4pO1xuICAgICAgbWVyZ2VkTm9kZXMuYWRkKGR1cGxpY2F0ZUVtcHR5UGF0aE5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQucHVzaChub2RlKTtcbiAgICB9XG4gIH1cbiAgLy8gRm9yIGVhY2ggbm9kZSB3aGljaCBoYXMgY2hpbGRyZW4gZnJvbSBtdWx0aXBsZSBzb3VyY2VzLCB3ZSBuZWVkIHRvIHJlY29tcHV0ZSBhIG5ldyBgVHJlZU5vZGVgXG4gIC8vIGJ5IGFsc28gbWVyZ2luZyB0aG9zZSBjaGlsZHJlbi4gVGhpcyBpcyBuZWNlc3Nhcnkgd2hlbiB0aGVyZSBhcmUgbXVsdGlwbGUgZW1wdHkgcGF0aCBjb25maWdzXG4gIC8vIGluIGEgcm93LiBQdXQgYW5vdGhlciB3YXk6IHdoZW5ldmVyIHdlIGNvbWJpbmUgY2hpbGRyZW4gb2YgdHdvIG5vZGVzLCB3ZSBuZWVkIHRvIGFsc28gY2hlY2tcbiAgLy8gaWYgYW55IG9mIHRob3NlIGNoaWxkcmVuIGNhbiBiZSBjb21iaW5lZCBpbnRvIGEgc2luZ2xlIG5vZGUgYXMgd2VsbC5cbiAgZm9yIChjb25zdCBtZXJnZWROb2RlIG9mIG1lcmdlZE5vZGVzKSB7XG4gICAgY29uc3QgbWVyZ2VkQ2hpbGRyZW4gPSBtZXJnZUVtcHR5UGF0aE1hdGNoZXMobWVyZ2VkTm9kZS5jaGlsZHJlbik7XG4gICAgcmVzdWx0LnB1c2gobmV3IFRyZWVOb2RlKG1lcmdlZE5vZGUudmFsdWUsIG1lcmdlZENoaWxkcmVuKSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdC5maWx0ZXIobiA9PiAhbWVyZ2VkTm9kZXMuaGFzKG4pKTtcbn1cblxuZnVuY3Rpb24gY2hlY2tPdXRsZXROYW1lVW5pcXVlbmVzcyhub2RlczogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXSk6IHZvaWQge1xuICBjb25zdCBuYW1lczoge1trOiBzdHJpbmddOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90fSA9IHt9O1xuICBub2Rlcy5mb3JFYWNoKG4gPT4ge1xuICAgIGNvbnN0IHJvdXRlV2l0aFNhbWVPdXRsZXROYW1lID0gbmFtZXNbbi52YWx1ZS5vdXRsZXRdO1xuICAgIGlmIChyb3V0ZVdpdGhTYW1lT3V0bGV0TmFtZSkge1xuICAgICAgY29uc3QgcCA9IHJvdXRlV2l0aFNhbWVPdXRsZXROYW1lLnVybC5tYXAocyA9PiBzLnRvU3RyaW5nKCkpLmpvaW4oJy8nKTtcbiAgICAgIGNvbnN0IGMgPSBuLnZhbHVlLnVybC5tYXAocyA9PiBzLnRvU3RyaW5nKCkpLmpvaW4oJy8nKTtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5UV09fU0VHTUVOVFNfV0lUSF9TQU1FX09VVExFVCxcbiAgICAgICAgICBOR19ERVZfTU9ERSAmJiBgVHdvIHNlZ21lbnRzIGNhbm5vdCBoYXZlIHRoZSBzYW1lIG91dGxldCBuYW1lOiAnJHtwfScgYW5kICcke2N9Jy5gKTtcbiAgICB9XG4gICAgbmFtZXNbbi52YWx1ZS5vdXRsZXRdID0gbi52YWx1ZTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldFNvdXJjZVNlZ21lbnRHcm91cChzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6IFVybFNlZ21lbnRHcm91cCB7XG4gIGxldCBzID0gc2VnbWVudEdyb3VwO1xuICB3aGlsZSAocy5fc291cmNlU2VnbWVudCkge1xuICAgIHMgPSBzLl9zb3VyY2VTZWdtZW50O1xuICB9XG4gIHJldHVybiBzO1xufVxuXG5mdW5jdGlvbiBnZXRQYXRoSW5kZXhTaGlmdChzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6IG51bWJlciB7XG4gIGxldCBzID0gc2VnbWVudEdyb3VwO1xuICBsZXQgcmVzID0gcy5fc2VnbWVudEluZGV4U2hpZnQgPz8gMDtcbiAgd2hpbGUgKHMuX3NvdXJjZVNlZ21lbnQpIHtcbiAgICBzID0gcy5fc291cmNlU2VnbWVudDtcbiAgICByZXMgKz0gcy5fc2VnbWVudEluZGV4U2hpZnQgPz8gMDtcbiAgfVxuICByZXR1cm4gcmVzIC0gMTtcbn1cblxuZnVuY3Rpb24gZ2V0Q29ycmVjdGVkUGF0aEluZGV4U2hpZnQoc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXApOiBudW1iZXIge1xuICBsZXQgcyA9IHNlZ21lbnRHcm91cDtcbiAgbGV0IHJlcyA9IHMuX3NlZ21lbnRJbmRleFNoaWZ0Q29ycmVjdGVkID8/IHMuX3NlZ21lbnRJbmRleFNoaWZ0ID8/IDA7XG4gIHdoaWxlIChzLl9zb3VyY2VTZWdtZW50KSB7XG4gICAgcyA9IHMuX3NvdXJjZVNlZ21lbnQ7XG4gICAgcmVzICs9IHMuX3NlZ21lbnRJbmRleFNoaWZ0Q29ycmVjdGVkID8/IHMuX3NlZ21lbnRJbmRleFNoaWZ0ID8/IDA7XG4gIH1cbiAgcmV0dXJuIHJlcyAtIDE7XG59XG5cbmZ1bmN0aW9uIGdldERhdGEocm91dGU6IFJvdXRlKTogRGF0YSB7XG4gIHJldHVybiByb3V0ZS5kYXRhIHx8IHt9O1xufVxuXG5mdW5jdGlvbiBnZXRSZXNvbHZlKHJvdXRlOiBSb3V0ZSk6IFJlc29sdmVEYXRhIHtcbiAgcmV0dXJuIHJvdXRlLnJlc29sdmUgfHwge307XG59XG4iXX0=