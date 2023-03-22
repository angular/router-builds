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
export function recognize(injector, rootComponentType, config, urlTree, url, urlSerializer, paramsInheritanceStrategy = 'emptyOnly') {
    return new Recognizer(injector, rootComponentType, config, urlTree, url, paramsInheritanceStrategy, urlSerializer)
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
    constructor(injector, rootComponentType, config, urlTree, url, paramsInheritanceStrategy, urlSerializer) {
        this.injector = injector;
        this.rootComponentType = rootComponentType;
        this.config = config;
        this.urlTree = urlTree;
        this.url = url;
        this.paramsInheritanceStrategy = paramsInheritanceStrategy;
        this.urlSerializer = urlSerializer;
    }
    recognize() {
        const rootSegmentGroup = split(this.urlTree.root, [], [], this.config.filter(c => c.redirectTo === undefined))
            .segmentGroup;
        return this.processSegmentGroup(this.injector, this.config, rootSegmentGroup, PRIMARY_OUTLET)
            .pipe(map(children => {
            if (children === null) {
                return null;
            }
            // Use Object.freeze to prevent readers of the Router state from modifying it outside of a
            // navigation, resulting in the router being out of sync with the browser.
            const root = new ActivatedRouteSnapshot([], Object.freeze({}), Object.freeze({ ...this.urlTree.queryParams }), this.urlTree.fragment, {}, PRIMARY_OUTLET, this.rootComponentType, null, {});
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
            const snapshot = new ActivatedRouteSnapshot(segments, params, Object.freeze({ ...this.urlTree.queryParams }), this.urlTree.fragment, getData(route), getOutlet(route), route.component ?? route._loadedComponent ?? null, route, getResolve(route));
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
                    const snapshot = new ActivatedRouteSnapshot(consumedSegments, parameters, Object.freeze({ ...this.urlTree.queryParams }), this.urlTree.fragment, getData(route), getOutlet(route), route.component ?? route._loadedComponent ?? null, route, getResolve(route));
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
            childConfig.filter(c => c.redirectTo === undefined));
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
function getData(route) {
    return route.data || {};
}
function getResolve(route) {
    return route.resolve || {};
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb2duaXplLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yZWNvZ25pemUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUE0QixhQUFhLElBQUksWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3ZGLE9BQU8sRUFBYSxJQUFJLEVBQUUsVUFBVSxFQUFZLEVBQUUsRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUNoRSxPQUFPLEVBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLElBQUksSUFBSSxRQUFRLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFJL0gsT0FBTyxFQUFDLHNCQUFzQixFQUFFLDBCQUEwQixFQUE2QixtQkFBbUIsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ2xJLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFFeEMsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxTQUFTLEVBQUUscUJBQXFCLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUNoRSxPQUFPLEVBQUMsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQ25HLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDdEMsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBRWpELE1BQU0sV0FBVyxHQUFHLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDO0FBRXBFLE1BQU0sT0FBTztDQUFHO0FBRWhCLFNBQVMsa0JBQWtCLENBQUMsQ0FBVTtJQUNwQyxrR0FBa0c7SUFDbEcsT0FBTyxJQUFJLFVBQVUsQ0FBc0IsQ0FBQyxHQUFrQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkcsQ0FBQztBQUVELE1BQU0sVUFBVSxTQUFTLENBQ3JCLFFBQTZCLEVBQUUsaUJBQWlDLEVBQUUsTUFBYyxFQUNoRixPQUFnQixFQUFFLEdBQVcsRUFBRSxhQUE0QixFQUMzRCw0QkFDSSxXQUFXO0lBQ2pCLE9BQU8sSUFBSSxVQUFVLENBQ1YsUUFBUSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLHlCQUF5QixFQUM1RSxhQUFhLENBQUM7U0FDcEIsU0FBUyxFQUFFO1NBQ1gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUN2QixJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7WUFDbkIsT0FBTyxrQkFBa0IsQ0FBQyxJQUFJLE9BQU8sRUFBRSxDQUFDLENBQUM7U0FDMUM7YUFBTTtZQUNMLE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ25CO0lBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUM7QUFFRCxNQUFNLE9BQU8sVUFBVTtJQUNyQixZQUNZLFFBQTZCLEVBQVUsaUJBQWlDLEVBQ3hFLE1BQWMsRUFBVSxPQUFnQixFQUFVLEdBQVcsRUFDN0QseUJBQW9ELEVBQzNDLGFBQTRCO1FBSHJDLGFBQVEsR0FBUixRQUFRLENBQXFCO1FBQVUsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFnQjtRQUN4RSxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQVUsWUFBTyxHQUFQLE9BQU8sQ0FBUztRQUFVLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDN0QsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUEyQjtRQUMzQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtJQUFHLENBQUM7SUFFckQsU0FBUztRQUNQLE1BQU0sZ0JBQWdCLEdBQ2xCLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsS0FBSyxTQUFTLENBQUMsQ0FBQzthQUNoRixZQUFZLENBQUM7UUFFdEIsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLGdCQUFnQixFQUFFLGNBQWMsQ0FBQzthQUN4RixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ25CLElBQUksUUFBUSxLQUFLLElBQUksRUFBRTtnQkFDckIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELDBGQUEwRjtZQUMxRiwwRUFBMEU7WUFDMUUsTUFBTSxJQUFJLEdBQUcsSUFBSSxzQkFBc0IsQ0FDbkMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUMsQ0FBQyxFQUNuRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFFakYsTUFBTSxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQXlCLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztZQUN0RSxNQUFNLFVBQVUsR0FBRyxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDL0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QyxPQUFPLFVBQVUsQ0FBQztRQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVELG9CQUFvQixDQUFDLFNBQTJDO1FBQzlELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUM7UUFFOUIsTUFBTSxDQUFDLEdBQUcsMEJBQTBCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzVFLEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkMsS0FBSyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVuQyxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxtQkFBbUIsQ0FDZixRQUE2QixFQUFFLE1BQWUsRUFBRSxZQUE2QixFQUM3RSxNQUFjO1FBQ2hCLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLFlBQVksQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUNwRSxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztTQUM3RDtRQUVELE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzVGLENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0gsZUFBZSxDQUFDLFFBQTZCLEVBQUUsTUFBZSxFQUFFLFlBQTZCO1FBRTNGLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQzFDLElBQUksQ0FDRCxTQUFTLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDdEIsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNqRCxpRkFBaUY7WUFDakYscUZBQXFGO1lBQ3JGLGlCQUFpQjtZQUNqQixNQUFNLFlBQVksR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDaEUsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDOUUsQ0FBQyxDQUFDLEVBQ0YsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLGNBQWMsRUFBRSxFQUFFO1lBQ2hDLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxjQUFjO2dCQUFFLE9BQU8sSUFBSSxDQUFDO1lBQzlDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxjQUFjLENBQUMsQ0FBQztZQUNqQyxPQUFPLFFBQVEsQ0FBQztRQUNsQixDQUFDLENBQUMsRUFDRixTQUFTLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLEVBQ3hDLGNBQWMsQ0FBQyxJQUFpRCxDQUFDLEVBQ2pFLFFBQVEsRUFBRSxFQUNWLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNiLElBQUksUUFBUSxLQUFLLElBQUk7Z0JBQUUsT0FBTyxJQUFJLENBQUM7WUFDbkMsc0ZBQXNGO1lBQ3RGLGtGQUFrRjtZQUNsRiw2RUFBNkU7WUFDN0UsTUFBTSxjQUFjLEdBQUcscUJBQXFCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDdkQsSUFBSSxXQUFXLEVBQUU7Z0JBQ2YsZ0ZBQWdGO2dCQUNoRiwyQ0FBMkM7Z0JBQzNDLHlCQUF5QixDQUFDLGNBQWMsQ0FBQyxDQUFDO2FBQzNDO1lBQ0QsMkJBQTJCLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDNUMsT0FBTyxjQUFjLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQ0wsQ0FBQztJQUNSLENBQUM7SUFFRCxjQUFjLENBQ1YsUUFBNkIsRUFBRSxNQUFlLEVBQUUsWUFBNkIsRUFDN0UsUUFBc0IsRUFBRSxNQUFjO1FBQ3hDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FDcEIsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ1osT0FBTyxJQUFJLENBQUMsMEJBQTBCLENBQ2xDLENBQUMsQ0FBQyxTQUFTLElBQUksUUFBUSxFQUFFLENBQUMsRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2xFLENBQUMsQ0FBQyxFQUNGLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBMkMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDekUsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ25CLElBQUksZ0JBQWdCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsRUFBRTtvQkFDcEQsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7aUJBQ2Y7Z0JBQ0QsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDakI7WUFDRCxNQUFNLENBQUMsQ0FBQztRQUNWLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDVixDQUFDO0lBRUQsMEJBQTBCLENBQ3RCLFFBQTZCLEVBQUUsS0FBWSxFQUFFLFVBQTJCLEVBQ3hFLFFBQXNCLEVBQUUsTUFBYztRQUN4QyxJQUFJLEtBQUssQ0FBQyxVQUFVLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUM7WUFBRSxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVoRyxJQUFJLFdBSUcsQ0FBQztRQUVSLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJLEVBQUU7WUFDdkIsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNyRSxNQUFNLFFBQVEsR0FBRyxJQUFJLHNCQUFzQixDQUN2QyxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFDckYsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsU0FBUyxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsSUFBSSxJQUFJLEVBQ25GLEtBQUssRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUM5QixXQUFXLEdBQUcsRUFBRSxDQUFDO2dCQUNmLFFBQVE7Z0JBQ1IsZ0JBQWdCLEVBQUUsRUFBRTtnQkFDcEIsaUJBQWlCLEVBQUUsRUFBRTthQUN0QixDQUFDLENBQUM7U0FDSjthQUFNO1lBQ0wsV0FBVztnQkFDUCxlQUFlLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUM7cUJBQ3JFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQUMsRUFBRSxFQUFFO29CQUN2RSxJQUFJLENBQUMsT0FBTyxFQUFFO3dCQUNaLE9BQU8sSUFBSSxDQUFDO3FCQUNiO29CQUVELE1BQU0sUUFBUSxHQUFHLElBQUksc0JBQXNCLENBQ3ZDLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBQyxDQUFDLEVBQzFFLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQ3ZELEtBQUssQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDLGdCQUFnQixJQUFJLElBQUksRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQ2pGLE9BQU8sRUFBQyxRQUFRLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUMsQ0FBQztnQkFDekQsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNiO1FBRUQsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQzNDLElBQUksTUFBTSxLQUFLLElBQUksRUFBRTtnQkFDbkIsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDakI7WUFDRCxNQUFNLEVBQUMsUUFBUSxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFDLEdBQUcsTUFBTSxDQUFDO1lBQy9ELG1GQUFtRjtZQUNuRixRQUFRLEdBQUcsS0FBSyxDQUFDLFNBQVMsSUFBSSxRQUFRLENBQUM7WUFDdkMsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLGVBQWUsSUFBSSxRQUFRLENBQUM7WUFDeEQsTUFBTSxXQUFXLEdBQVksY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRW5ELE1BQU0sRUFBQyxZQUFZLEVBQUUsY0FBYyxFQUFDLEdBQUcsS0FBSyxDQUN4QyxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCO1lBQy9DLG9GQUFvRjtZQUNwRiwyRUFBMkU7WUFDM0Usb0JBQW9CO1lBQ3BCLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFFekQsSUFBSSxjQUFjLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxZQUFZLENBQUMsV0FBVyxFQUFFLEVBQUU7Z0JBQzdELE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLEVBQUUsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQ3hGLElBQUksUUFBUSxLQUFLLElBQUksRUFBRTt3QkFDckIsT0FBTyxJQUFJLENBQUM7cUJBQ2I7b0JBQ0QsT0FBTyxDQUFDLElBQUksUUFBUSxDQUF5QixRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDcEUsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNMO1lBRUQsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxjQUFjLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDM0QsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBeUIsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNqRTtZQUVELE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxNQUFNLENBQUM7WUFDcEQsbUZBQW1GO1lBQ25GLHFGQUFxRjtZQUNyRix1RkFBdUY7WUFDdkYsNkNBQTZDO1lBQzdDLDhCQUE4QjtZQUM5Qiw4QkFBOEI7WUFDOUIsS0FBSztZQUNMLHNGQUFzRjtZQUN0RixPQUFPLElBQUk7aUJBQ04sY0FBYyxDQUNYLGFBQWEsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFDeEQsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztpQkFDN0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDbkIsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFO29CQUNyQixPQUFPLElBQUksQ0FBQztpQkFDYjtnQkFDRCxPQUFPLENBQUMsSUFBSSxRQUFRLENBQXlCLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ3BFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQztDQUNGO0FBRUQsU0FBUywyQkFBMkIsQ0FBQyxLQUF5QztJQUM1RSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ2xCLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssY0FBYztZQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxjQUFjO1lBQUUsT0FBTyxDQUFDLENBQUM7UUFDaEQsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0RCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxLQUFZO0lBQ2xDLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRTtRQUNsQixPQUFPLEtBQUssQ0FBQyxRQUFRLENBQUM7S0FDdkI7SUFFRCxJQUFJLEtBQUssQ0FBQyxZQUFZLEVBQUU7UUFDdEIsT0FBTyxLQUFLLENBQUMsYUFBYyxDQUFDO0tBQzdCO0lBRUQsT0FBTyxFQUFFLENBQUM7QUFDWixDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxJQUFzQztJQUNoRSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQztJQUN0QyxPQUFPLE1BQU0sSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUUsSUFBSSxNQUFNLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQztBQUN6RSxDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQVMscUJBQXFCLENBQUMsS0FBOEM7SUFFM0UsTUFBTSxNQUFNLEdBQTRDLEVBQUUsQ0FBQztJQUMzRCxnR0FBZ0c7SUFDaEcsTUFBTSxXQUFXLEdBQTBDLElBQUksR0FBRyxFQUFFLENBQUM7SUFFckUsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7UUFDeEIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzdCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEIsU0FBUztTQUNWO1FBRUQsTUFBTSxzQkFBc0IsR0FDeEIsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxLQUFLLFVBQVUsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDdkYsSUFBSSxzQkFBc0IsS0FBSyxTQUFTLEVBQUU7WUFDeEMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN2RCxXQUFXLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUM7U0FDekM7YUFBTTtZQUNMLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDbkI7S0FDRjtJQUNELGdHQUFnRztJQUNoRywrRkFBK0Y7SUFDL0YsOEZBQThGO0lBQzlGLHVFQUF1RTtJQUN2RSxLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRTtRQUNwQyxNQUFNLGNBQWMsR0FBRyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7S0FDN0Q7SUFDRCxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRCxDQUFDO0FBRUQsU0FBUyx5QkFBeUIsQ0FBQyxLQUF5QztJQUMxRSxNQUFNLEtBQUssR0FBMEMsRUFBRSxDQUFDO0lBQ3hELEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDaEIsTUFBTSx1QkFBdUIsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0RCxJQUFJLHVCQUF1QixFQUFFO1lBQzNCLE1BQU0sQ0FBQyxHQUFHLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdkUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZELE1BQU0sSUFBSSxZQUFZLDREQUVsQixXQUFXLElBQUksbURBQW1ELENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3pGO1FBQ0QsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUNsQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FBQyxLQUFZO0lBQzNCLE9BQU8sS0FBSyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7QUFDMUIsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLEtBQVk7SUFDOUIsT0FBTyxLQUFLLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQztBQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RW52aXJvbm1lbnRJbmplY3RvciwgVHlwZSwgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7RW1wdHlFcnJvciwgZnJvbSwgT2JzZXJ2YWJsZSwgT2JzZXJ2ZXIsIG9mfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y2F0Y2hFcnJvciwgY29uY2F0TWFwLCBkZWZhdWx0SWZFbXB0eSwgZmlyc3QsIGxhc3QgYXMgcnhqc0xhc3QsIG1hcCwgc2Nhbiwgc3dpdGNoTWFwLCB0YWtlV2hpbGV9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtSdW50aW1lRXJyb3JDb2RlfSBmcm9tICcuL2Vycm9ycyc7XG5pbXBvcnQge0RhdGEsIFJlc29sdmVEYXRhLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIGluaGVyaXRlZFBhcmFtc0RhdGFSZXNvbHZlLCBQYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LCBSb3V0ZXJTdGF0ZVNuYXBzaG90fSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BSSU1BUllfT1VUTEVUfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge1VybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cCwgVXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge2xhc3R9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge2dldE91dGxldCwgc29ydEJ5TWF0Y2hpbmdPdXRsZXRzfSBmcm9tICcuL3V0aWxzL2NvbmZpZyc7XG5pbXBvcnQge2lzSW1tZWRpYXRlTWF0Y2gsIG1hdGNoV2l0aENoZWNrcywgbm9MZWZ0b3ZlcnNJblVybCwgc3BsaXR9IGZyb20gJy4vdXRpbHMvY29uZmlnX21hdGNoaW5nJztcbmltcG9ydCB7VHJlZU5vZGV9IGZyb20gJy4vdXRpbHMvdHJlZSc7XG5pbXBvcnQge2lzRW1wdHlFcnJvcn0gZnJvbSAnLi91dGlscy90eXBlX2d1YXJkcyc7XG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgISFuZ0Rldk1vZGU7XG5cbmNsYXNzIE5vTWF0Y2gge31cblxuZnVuY3Rpb24gbmV3T2JzZXJ2YWJsZUVycm9yKGU6IHVua25vd24pOiBPYnNlcnZhYmxlPFJvdXRlclN0YXRlU25hcHNob3Q+IHtcbiAgLy8gVE9ETyhhdHNjb3R0KTogVGhpcyBwYXR0ZXJuIGlzIHVzZWQgdGhyb3VnaG91dCB0aGUgcm91dGVyIGNvZGUgYW5kIGNhbiBiZSBgdGhyb3dFcnJvcmAgaW5zdGVhZC5cbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFJvdXRlclN0YXRlU25hcHNob3Q+KChvYnM6IE9ic2VydmVyPFJvdXRlclN0YXRlU25hcHNob3Q+KSA9PiBvYnMuZXJyb3IoZSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVjb2duaXplKFxuICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+fG51bGwsIGNvbmZpZzogUm91dGVzLFxuICAgIHVybFRyZWU6IFVybFRyZWUsIHVybDogc3RyaW5nLCB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6IFBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kgPVxuICAgICAgICAnZW1wdHlPbmx5Jyk6IE9ic2VydmFibGU8Um91dGVyU3RhdGVTbmFwc2hvdD4ge1xuICByZXR1cm4gbmV3IFJlY29nbml6ZXIoXG4gICAgICAgICAgICAgaW5qZWN0b3IsIHJvb3RDb21wb25lbnRUeXBlLCBjb25maWcsIHVybFRyZWUsIHVybCwgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSxcbiAgICAgICAgICAgICB1cmxTZXJpYWxpemVyKVxuICAgICAgLnJlY29nbml6ZSgpXG4gICAgICAucGlwZShzd2l0Y2hNYXAocmVzdWx0ID0+IHtcbiAgICAgICAgaWYgKHJlc3VsdCA9PT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBuZXdPYnNlcnZhYmxlRXJyb3IobmV3IE5vTWF0Y2goKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG9mKHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbn1cblxuZXhwb3J0IGNsYXNzIFJlY29nbml6ZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHByaXZhdGUgcm9vdENvbXBvbmVudFR5cGU6IFR5cGU8YW55PnxudWxsLFxuICAgICAgcHJpdmF0ZSBjb25maWc6IFJvdXRlcywgcHJpdmF0ZSB1cmxUcmVlOiBVcmxUcmVlLCBwcml2YXRlIHVybDogc3RyaW5nLFxuICAgICAgcHJpdmF0ZSBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiBQYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyKSB7fVxuXG4gIHJlY29nbml6ZSgpOiBPYnNlcnZhYmxlPFJvdXRlclN0YXRlU25hcHNob3R8bnVsbD4ge1xuICAgIGNvbnN0IHJvb3RTZWdtZW50R3JvdXAgPVxuICAgICAgICBzcGxpdCh0aGlzLnVybFRyZWUucm9vdCwgW10sIFtdLCB0aGlzLmNvbmZpZy5maWx0ZXIoYyA9PiBjLnJlZGlyZWN0VG8gPT09IHVuZGVmaW5lZCkpXG4gICAgICAgICAgICAuc2VnbWVudEdyb3VwO1xuXG4gICAgcmV0dXJuIHRoaXMucHJvY2Vzc1NlZ21lbnRHcm91cCh0aGlzLmluamVjdG9yLCB0aGlzLmNvbmZpZywgcm9vdFNlZ21lbnRHcm91cCwgUFJJTUFSWV9PVVRMRVQpXG4gICAgICAgIC5waXBlKG1hcChjaGlsZHJlbiA9PiB7XG4gICAgICAgICAgaWYgKGNoaWxkcmVuID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBVc2UgT2JqZWN0LmZyZWV6ZSB0byBwcmV2ZW50IHJlYWRlcnMgb2YgdGhlIFJvdXRlciBzdGF0ZSBmcm9tIG1vZGlmeWluZyBpdCBvdXRzaWRlIG9mIGFcbiAgICAgICAgICAvLyBuYXZpZ2F0aW9uLCByZXN1bHRpbmcgaW4gdGhlIHJvdXRlciBiZWluZyBvdXQgb2Ygc3luYyB3aXRoIHRoZSBicm93c2VyLlxuICAgICAgICAgIGNvbnN0IHJvb3QgPSBuZXcgQWN0aXZhdGVkUm91dGVTbmFwc2hvdChcbiAgICAgICAgICAgICAgW10sIE9iamVjdC5mcmVlemUoe30pLCBPYmplY3QuZnJlZXplKHsuLi50aGlzLnVybFRyZWUucXVlcnlQYXJhbXN9KSxcbiAgICAgICAgICAgICAgdGhpcy51cmxUcmVlLmZyYWdtZW50LCB7fSwgUFJJTUFSWV9PVVRMRVQsIHRoaXMucm9vdENvbXBvbmVudFR5cGUsIG51bGwsIHt9KTtcblxuICAgICAgICAgIGNvbnN0IHJvb3ROb2RlID0gbmV3IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KHJvb3QsIGNoaWxkcmVuKTtcbiAgICAgICAgICBjb25zdCByb3V0ZVN0YXRlID0gbmV3IFJvdXRlclN0YXRlU25hcHNob3QodGhpcy51cmwsIHJvb3ROb2RlKTtcbiAgICAgICAgICB0aGlzLmluaGVyaXRQYXJhbXNBbmREYXRhKHJvdXRlU3RhdGUuX3Jvb3QpO1xuICAgICAgICAgIHJldHVybiByb3V0ZVN0YXRlO1xuICAgICAgICB9KSk7XG4gIH1cblxuICBpbmhlcml0UGFyYW1zQW5kRGF0YShyb3V0ZU5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KTogdm9pZCB7XG4gICAgY29uc3Qgcm91dGUgPSByb3V0ZU5vZGUudmFsdWU7XG5cbiAgICBjb25zdCBpID0gaW5oZXJpdGVkUGFyYW1zRGF0YVJlc29sdmUocm91dGUsIHRoaXMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSk7XG4gICAgcm91dGUucGFyYW1zID0gT2JqZWN0LmZyZWV6ZShpLnBhcmFtcyk7XG4gICAgcm91dGUuZGF0YSA9IE9iamVjdC5mcmVlemUoaS5kYXRhKTtcblxuICAgIHJvdXRlTm9kZS5jaGlsZHJlbi5mb3JFYWNoKG4gPT4gdGhpcy5pbmhlcml0UGFyYW1zQW5kRGF0YShuKSk7XG4gIH1cblxuICBwcm9jZXNzU2VnbWVudEdyb3VwKFxuICAgICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIGNvbmZpZzogUm91dGVbXSwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsXG4gICAgICBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXXxudWxsPiB7XG4gICAgaWYgKHNlZ21lbnRHcm91cC5zZWdtZW50cy5sZW5ndGggPT09IDAgJiYgc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NDaGlsZHJlbihpbmplY3RvciwgY29uZmlnLCBzZWdtZW50R3JvdXApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnByb2Nlc3NTZWdtZW50KGluamVjdG9yLCBjb25maWcsIHNlZ21lbnRHcm91cCwgc2VnbWVudEdyb3VwLnNlZ21lbnRzLCBvdXRsZXQpO1xuICB9XG5cbiAgLyoqXG4gICAqIE1hdGNoZXMgZXZlcnkgY2hpbGQgb3V0bGV0IGluIHRoZSBgc2VnbWVudEdyb3VwYCB0byBhIGBSb3V0ZWAgaW4gdGhlIGNvbmZpZy4gUmV0dXJucyBgbnVsbGAgaWZcbiAgICogd2UgY2Fubm90IGZpbmQgYSBtYXRjaCBmb3IgX2FueV8gb2YgdGhlIGNoaWxkcmVuLlxuICAgKlxuICAgKiBAcGFyYW0gY29uZmlnIC0gVGhlIGBSb3V0ZXNgIHRvIG1hdGNoIGFnYWluc3RcbiAgICogQHBhcmFtIHNlZ21lbnRHcm91cCAtIFRoZSBgVXJsU2VnbWVudEdyb3VwYCB3aG9zZSBjaGlsZHJlbiBuZWVkIHRvIGJlIG1hdGNoZWQgYWdhaW5zdCB0aGVcbiAgICogICAgIGNvbmZpZy5cbiAgICovXG4gIHByb2Nlc3NDaGlsZHJlbihpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvciwgY29uZmlnOiBSb3V0ZVtdLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6XG4gICAgICBPYnNlcnZhYmxlPFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W118bnVsbD4ge1xuICAgIHJldHVybiBmcm9tKE9iamVjdC5rZXlzKHNlZ21lbnRHcm91cC5jaGlsZHJlbikpXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgICAgY29uY2F0TWFwKGNoaWxkT3V0bGV0ID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgY2hpbGQgPSBzZWdtZW50R3JvdXAuY2hpbGRyZW5bY2hpbGRPdXRsZXRdO1xuICAgICAgICAgICAgICAvLyBTb3J0IHRoZSBjb25maWcgc28gdGhhdCByb3V0ZXMgd2l0aCBvdXRsZXRzIHRoYXQgbWF0Y2ggdGhlIG9uZSBiZWluZyBhY3RpdmF0ZWRcbiAgICAgICAgICAgICAgLy8gYXBwZWFyIGZpcnN0LCBmb2xsb3dlZCBieSByb3V0ZXMgZm9yIG90aGVyIG91dGxldHMsIHdoaWNoIG1pZ2h0IG1hdGNoIGlmIHRoZXkgaGF2ZVxuICAgICAgICAgICAgICAvLyBhbiBlbXB0eSBwYXRoLlxuICAgICAgICAgICAgICBjb25zdCBzb3J0ZWRDb25maWcgPSBzb3J0QnlNYXRjaGluZ091dGxldHMoY29uZmlnLCBjaGlsZE91dGxldCk7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NTZWdtZW50R3JvdXAoaW5qZWN0b3IsIHNvcnRlZENvbmZpZywgY2hpbGQsIGNoaWxkT3V0bGV0KTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgc2NhbigoY2hpbGRyZW4sIG91dGxldENoaWxkcmVuKSA9PiB7XG4gICAgICAgICAgICAgIGlmICghY2hpbGRyZW4gfHwgIW91dGxldENoaWxkcmVuKSByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgY2hpbGRyZW4ucHVzaCguLi5vdXRsZXRDaGlsZHJlbik7XG4gICAgICAgICAgICAgIHJldHVybiBjaGlsZHJlbjtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgdGFrZVdoaWxlKGNoaWxkcmVuID0+IGNoaWxkcmVuICE9PSBudWxsKSxcbiAgICAgICAgICAgIGRlZmF1bHRJZkVtcHR5KG51bGwgYXMgVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXSB8IG51bGwpLFxuICAgICAgICAgICAgcnhqc0xhc3QoKSxcbiAgICAgICAgICAgIG1hcChjaGlsZHJlbiA9PiB7XG4gICAgICAgICAgICAgIGlmIChjaGlsZHJlbiA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgIC8vIEJlY2F1c2Ugd2UgbWF5IGhhdmUgbWF0Y2hlZCB0d28gb3V0bGV0cyB0byB0aGUgc2FtZSBlbXB0eSBwYXRoIHNlZ21lbnQsIHdlIGNhbiBoYXZlXG4gICAgICAgICAgICAgIC8vIG11bHRpcGxlIGFjdGl2YXRlZCByZXN1bHRzIGZvciB0aGUgc2FtZSBvdXRsZXQuIFdlIHNob3VsZCBtZXJnZSB0aGUgY2hpbGRyZW4gb2ZcbiAgICAgICAgICAgICAgLy8gdGhlc2UgcmVzdWx0cyBzbyB0aGUgZmluYWwgcmV0dXJuIHZhbHVlIGlzIG9ubHkgb25lIGBUcmVlTm9kZWAgcGVyIG91dGxldC5cbiAgICAgICAgICAgICAgY29uc3QgbWVyZ2VkQ2hpbGRyZW4gPSBtZXJnZUVtcHR5UGF0aE1hdGNoZXMoY2hpbGRyZW4pO1xuICAgICAgICAgICAgICBpZiAoTkdfREVWX01PREUpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIHNob3VsZCByZWFsbHkgbmV2ZXIgaGFwcGVuIC0gd2UgYXJlIG9ubHkgdGFraW5nIHRoZSBmaXJzdCBtYXRjaCBmb3IgZWFjaFxuICAgICAgICAgICAgICAgIC8vIG91dGxldCBhbmQgbWVyZ2UgdGhlIGVtcHR5IHBhdGggbWF0Y2hlcy5cbiAgICAgICAgICAgICAgICBjaGVja091dGxldE5hbWVVbmlxdWVuZXNzKG1lcmdlZENoaWxkcmVuKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBzb3J0QWN0aXZhdGVkUm91dGVTbmFwc2hvdHMobWVyZ2VkQ2hpbGRyZW4pO1xuICAgICAgICAgICAgICByZXR1cm4gbWVyZ2VkQ2hpbGRyZW47XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgKTtcbiAgfVxuXG4gIHByb2Nlc3NTZWdtZW50KFxuICAgICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJvdXRlczogUm91dGVbXSwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXXxudWxsPiB7XG4gICAgcmV0dXJuIGZyb20ocm91dGVzKS5waXBlKFxuICAgICAgICBjb25jYXRNYXAociA9PiB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1NlZ21lbnRBZ2FpbnN0Um91dGUoXG4gICAgICAgICAgICAgIHIuX2luamVjdG9yID8/IGluamVjdG9yLCByLCBzZWdtZW50R3JvdXAsIHNlZ21lbnRzLCBvdXRsZXQpO1xuICAgICAgICB9KSxcbiAgICAgICAgZmlyc3QoKHgpOiB4IGlzIFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10gPT4gISF4KSwgY2F0Y2hFcnJvcihlID0+IHtcbiAgICAgICAgICBpZiAoaXNFbXB0eUVycm9yKGUpKSB7XG4gICAgICAgICAgICBpZiAobm9MZWZ0b3ZlcnNJblVybChzZWdtZW50R3JvdXAsIHNlZ21lbnRzLCBvdXRsZXQpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvZihbXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb2YobnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH0pKTtcbiAgfVxuXG4gIHByb2Nlc3NTZWdtZW50QWdhaW5zdFJvdXRlKFxuICAgICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJvdXRlOiBSb3V0ZSwgcmF3U2VnbWVudDogVXJsU2VnbWVudEdyb3VwLFxuICAgICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W118bnVsbD4ge1xuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvIHx8ICFpc0ltbWVkaWF0ZU1hdGNoKHJvdXRlLCByYXdTZWdtZW50LCBzZWdtZW50cywgb3V0bGV0KSkgcmV0dXJuIG9mKG51bGwpO1xuXG4gICAgbGV0IG1hdGNoUmVzdWx0OiBPYnNlcnZhYmxlPHtcbiAgICAgIHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LFxuICAgICAgY29uc3VtZWRTZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgICAgcmVtYWluaW5nU2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICB9fG51bGw+O1xuXG4gICAgaWYgKHJvdXRlLnBhdGggPT09ICcqKicpIHtcbiAgICAgIGNvbnN0IHBhcmFtcyA9IHNlZ21lbnRzLmxlbmd0aCA+IDAgPyBsYXN0KHNlZ21lbnRzKSEucGFyYW1ldGVycyA6IHt9O1xuICAgICAgY29uc3Qgc25hcHNob3QgPSBuZXcgQWN0aXZhdGVkUm91dGVTbmFwc2hvdChcbiAgICAgICAgICBzZWdtZW50cywgcGFyYW1zLCBPYmplY3QuZnJlZXplKHsuLi50aGlzLnVybFRyZWUucXVlcnlQYXJhbXN9KSwgdGhpcy51cmxUcmVlLmZyYWdtZW50LFxuICAgICAgICAgIGdldERhdGEocm91dGUpLCBnZXRPdXRsZXQocm91dGUpLCByb3V0ZS5jb21wb25lbnQgPz8gcm91dGUuX2xvYWRlZENvbXBvbmVudCA/PyBudWxsLFxuICAgICAgICAgIHJvdXRlLCBnZXRSZXNvbHZlKHJvdXRlKSk7XG4gICAgICBtYXRjaFJlc3VsdCA9IG9mKHtcbiAgICAgICAgc25hcHNob3QsXG4gICAgICAgIGNvbnN1bWVkU2VnbWVudHM6IFtdLFxuICAgICAgICByZW1haW5pbmdTZWdtZW50czogW10sXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWF0Y2hSZXN1bHQgPVxuICAgICAgICAgIG1hdGNoV2l0aENoZWNrcyhyYXdTZWdtZW50LCByb3V0ZSwgc2VnbWVudHMsIGluamVjdG9yLCB0aGlzLnVybFNlcmlhbGl6ZXIpXG4gICAgICAgICAgICAgIC5waXBlKG1hcCgoe21hdGNoZWQsIGNvbnN1bWVkU2VnbWVudHMsIHJlbWFpbmluZ1NlZ21lbnRzLCBwYXJhbWV0ZXJzfSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghbWF0Y2hlZCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3Qgc25hcHNob3QgPSBuZXcgQWN0aXZhdGVkUm91dGVTbmFwc2hvdChcbiAgICAgICAgICAgICAgICAgICAgY29uc3VtZWRTZWdtZW50cywgcGFyYW1ldGVycywgT2JqZWN0LmZyZWV6ZSh7Li4udGhpcy51cmxUcmVlLnF1ZXJ5UGFyYW1zfSksXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXJsVHJlZS5mcmFnbWVudCwgZ2V0RGF0YShyb3V0ZSksIGdldE91dGxldChyb3V0ZSksXG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLmNvbXBvbmVudCA/PyByb3V0ZS5fbG9hZGVkQ29tcG9uZW50ID8/IG51bGwsIHJvdXRlLCBnZXRSZXNvbHZlKHJvdXRlKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtzbmFwc2hvdCwgY29uc3VtZWRTZWdtZW50cywgcmVtYWluaW5nU2VnbWVudHN9O1xuICAgICAgICAgICAgICB9KSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hdGNoUmVzdWx0LnBpcGUoc3dpdGNoTWFwKChyZXN1bHQpID0+IHtcbiAgICAgIGlmIChyZXN1bHQgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9mKG51bGwpO1xuICAgICAgfVxuICAgICAgY29uc3Qge3NuYXBzaG90LCBjb25zdW1lZFNlZ21lbnRzLCByZW1haW5pbmdTZWdtZW50c30gPSByZXN1bHQ7XG4gICAgICAvLyBJZiB0aGUgcm91dGUgaGFzIGFuIGluamVjdG9yIGNyZWF0ZWQgZnJvbSBwcm92aWRlcnMsIHdlIHNob3VsZCBzdGFydCB1c2luZyB0aGF0LlxuICAgICAgaW5qZWN0b3IgPSByb3V0ZS5faW5qZWN0b3IgPz8gaW5qZWN0b3I7XG4gICAgICBjb25zdCBjaGlsZEluamVjdG9yID0gcm91dGUuX2xvYWRlZEluamVjdG9yID8/IGluamVjdG9yO1xuICAgICAgY29uc3QgY2hpbGRDb25maWc6IFJvdXRlW10gPSBnZXRDaGlsZENvbmZpZyhyb3V0ZSk7XG5cbiAgICAgIGNvbnN0IHtzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzfSA9IHNwbGl0KFxuICAgICAgICAgIHJhd1NlZ21lbnQsIGNvbnN1bWVkU2VnbWVudHMsIHJlbWFpbmluZ1NlZ21lbnRzLFxuICAgICAgICAgIC8vIEZpbHRlciBvdXQgcm91dGVzIHdpdGggcmVkaXJlY3RUbyBiZWNhdXNlIHdlIGFyZSB0cnlpbmcgdG8gY3JlYXRlIGFjdGl2YXRlZCByb3V0ZVxuICAgICAgICAgIC8vIHNuYXBzaG90cyBhbmQgZG9uJ3QgaGFuZGxlIHJlZGlyZWN0cyBoZXJlLiBUaGF0IHNob3VsZCBoYXZlIGJlZW4gZG9uZSBpblxuICAgICAgICAgIC8vIGBhcHBseVJlZGlyZWN0c2AuXG4gICAgICAgICAgY2hpbGRDb25maWcuZmlsdGVyKGMgPT4gYy5yZWRpcmVjdFRvID09PSB1bmRlZmluZWQpKTtcblxuICAgICAgaWYgKHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiBzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzQ2hpbGRyZW4oY2hpbGRJbmplY3RvciwgY2hpbGRDb25maWcsIHNlZ21lbnRHcm91cCkucGlwZShtYXAoY2hpbGRyZW4gPT4ge1xuICAgICAgICAgIGlmIChjaGlsZHJlbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBbbmV3IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KHNuYXBzaG90LCBjaGlsZHJlbildO1xuICAgICAgICB9KSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjaGlsZENvbmZpZy5sZW5ndGggPT09IDAgJiYgc2xpY2VkU2VnbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvZihbbmV3IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KHNuYXBzaG90LCBbXSldKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWF0Y2hlZE9uT3V0bGV0ID0gZ2V0T3V0bGV0KHJvdXRlKSA9PT0gb3V0bGV0O1xuICAgICAgLy8gSWYgd2UgbWF0Y2hlZCBhIGNvbmZpZyBkdWUgdG8gZW1wdHkgcGF0aCBtYXRjaCBvbiBhIGRpZmZlcmVudCBvdXRsZXQsIHdlIG5lZWQgdG9cbiAgICAgIC8vIGNvbnRpbnVlIHBhc3NpbmcgdGhlIGN1cnJlbnQgb3V0bGV0IGZvciB0aGUgc2VnbWVudCByYXRoZXIgdGhhbiBzd2l0Y2ggdG8gUFJJTUFSWS5cbiAgICAgIC8vIE5vdGUgdGhhdCB3ZSBzd2l0Y2ggdG8gcHJpbWFyeSB3aGVuIHdlIGhhdmUgYSBtYXRjaCBiZWNhdXNlIG91dGxldCBjb25maWdzIGxvb2sgbGlrZVxuICAgICAgLy8gdGhpczoge3BhdGg6ICdhJywgb3V0bGV0OiAnYScsIGNoaWxkcmVuOiBbXG4gICAgICAvLyAge3BhdGg6ICdiJywgY29tcG9uZW50OiBCfSxcbiAgICAgIC8vICB7cGF0aDogJ2MnLCBjb21wb25lbnQ6IEN9LFxuICAgICAgLy8gXX1cbiAgICAgIC8vIE5vdGljZSB0aGF0IHRoZSBjaGlsZHJlbiBvZiB0aGUgbmFtZWQgb3V0bGV0IGFyZSBjb25maWd1cmVkIHdpdGggdGhlIHByaW1hcnkgb3V0bGV0XG4gICAgICByZXR1cm4gdGhpc1xuICAgICAgICAgIC5wcm9jZXNzU2VnbWVudChcbiAgICAgICAgICAgICAgY2hpbGRJbmplY3RvciwgY2hpbGRDb25maWcsIHNlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHMsXG4gICAgICAgICAgICAgIG1hdGNoZWRPbk91dGxldCA/IFBSSU1BUllfT1VUTEVUIDogb3V0bGV0KVxuICAgICAgICAgIC5waXBlKG1hcChjaGlsZHJlbiA9PiB7XG4gICAgICAgICAgICBpZiAoY2hpbGRyZW4gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gW25ldyBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PihzbmFwc2hvdCwgY2hpbGRyZW4pXTtcbiAgICAgICAgICB9KSk7XG4gICAgfSkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNvcnRBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90cyhub2RlczogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXSk6IHZvaWQge1xuICBub2Rlcy5zb3J0KChhLCBiKSA9PiB7XG4gICAgaWYgKGEudmFsdWUub3V0bGV0ID09PSBQUklNQVJZX09VVExFVCkgcmV0dXJuIC0xO1xuICAgIGlmIChiLnZhbHVlLm91dGxldCA9PT0gUFJJTUFSWV9PVVRMRVQpIHJldHVybiAxO1xuICAgIHJldHVybiBhLnZhbHVlLm91dGxldC5sb2NhbGVDb21wYXJlKGIudmFsdWUub3V0bGV0KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldENoaWxkQ29uZmlnKHJvdXRlOiBSb3V0ZSk6IFJvdXRlW10ge1xuICBpZiAocm91dGUuY2hpbGRyZW4pIHtcbiAgICByZXR1cm4gcm91dGUuY2hpbGRyZW47XG4gIH1cblxuICBpZiAocm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgcmV0dXJuIHJvdXRlLl9sb2FkZWRSb3V0ZXMhO1xuICB9XG5cbiAgcmV0dXJuIFtdO1xufVxuXG5mdW5jdGlvbiBoYXNFbXB0eVBhdGhDb25maWcobm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4pIHtcbiAgY29uc3QgY29uZmlnID0gbm9kZS52YWx1ZS5yb3V0ZUNvbmZpZztcbiAgcmV0dXJuIGNvbmZpZyAmJiBjb25maWcucGF0aCA9PT0gJycgJiYgY29uZmlnLnJlZGlyZWN0VG8gPT09IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBGaW5kcyBgVHJlZU5vZGVgcyB3aXRoIG1hdGNoaW5nIGVtcHR5IHBhdGggcm91dGUgY29uZmlncyBhbmQgbWVyZ2VzIHRoZW0gaW50byBgVHJlZU5vZGVgIHdpdGhcbiAqIHRoZSBjaGlsZHJlbiBmcm9tIGVhY2ggZHVwbGljYXRlLiBUaGlzIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIGRpZmZlcmVudCBvdXRsZXRzIGNhbiBtYXRjaCBhXG4gKiBzaW5nbGUgZW1wdHkgcGF0aCByb3V0ZSBjb25maWcgYW5kIHRoZSByZXN1bHRzIG5lZWQgdG8gdGhlbiBiZSBtZXJnZWQuXG4gKi9cbmZ1bmN0aW9uIG1lcmdlRW1wdHlQYXRoTWF0Y2hlcyhub2RlczogQXJyYXk8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4+KTpcbiAgICBBcnJheTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4ge1xuICBjb25zdCByZXN1bHQ6IEFycmF5PFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+PiA9IFtdO1xuICAvLyBUaGUgc2V0IG9mIG5vZGVzIHdoaWNoIGNvbnRhaW4gY2hpbGRyZW4gdGhhdCB3ZXJlIG1lcmdlZCBmcm9tIHR3byBkdXBsaWNhdGUgZW1wdHkgcGF0aCBub2Rlcy5cbiAgY29uc3QgbWVyZ2VkTm9kZXM6IFNldDxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4gPSBuZXcgU2V0KCk7XG5cbiAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgaWYgKCFoYXNFbXB0eVBhdGhDb25maWcobm9kZSkpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG5vZGUpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgZHVwbGljYXRlRW1wdHlQYXRoTm9kZSA9XG4gICAgICAgIHJlc3VsdC5maW5kKHJlc3VsdE5vZGUgPT4gbm9kZS52YWx1ZS5yb3V0ZUNvbmZpZyA9PT0gcmVzdWx0Tm9kZS52YWx1ZS5yb3V0ZUNvbmZpZyk7XG4gICAgaWYgKGR1cGxpY2F0ZUVtcHR5UGF0aE5vZGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZHVwbGljYXRlRW1wdHlQYXRoTm9kZS5jaGlsZHJlbi5wdXNoKC4uLm5vZGUuY2hpbGRyZW4pO1xuICAgICAgbWVyZ2VkTm9kZXMuYWRkKGR1cGxpY2F0ZUVtcHR5UGF0aE5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQucHVzaChub2RlKTtcbiAgICB9XG4gIH1cbiAgLy8gRm9yIGVhY2ggbm9kZSB3aGljaCBoYXMgY2hpbGRyZW4gZnJvbSBtdWx0aXBsZSBzb3VyY2VzLCB3ZSBuZWVkIHRvIHJlY29tcHV0ZSBhIG5ldyBgVHJlZU5vZGVgXG4gIC8vIGJ5IGFsc28gbWVyZ2luZyB0aG9zZSBjaGlsZHJlbi4gVGhpcyBpcyBuZWNlc3Nhcnkgd2hlbiB0aGVyZSBhcmUgbXVsdGlwbGUgZW1wdHkgcGF0aCBjb25maWdzXG4gIC8vIGluIGEgcm93LiBQdXQgYW5vdGhlciB3YXk6IHdoZW5ldmVyIHdlIGNvbWJpbmUgY2hpbGRyZW4gb2YgdHdvIG5vZGVzLCB3ZSBuZWVkIHRvIGFsc28gY2hlY2tcbiAgLy8gaWYgYW55IG9mIHRob3NlIGNoaWxkcmVuIGNhbiBiZSBjb21iaW5lZCBpbnRvIGEgc2luZ2xlIG5vZGUgYXMgd2VsbC5cbiAgZm9yIChjb25zdCBtZXJnZWROb2RlIG9mIG1lcmdlZE5vZGVzKSB7XG4gICAgY29uc3QgbWVyZ2VkQ2hpbGRyZW4gPSBtZXJnZUVtcHR5UGF0aE1hdGNoZXMobWVyZ2VkTm9kZS5jaGlsZHJlbik7XG4gICAgcmVzdWx0LnB1c2gobmV3IFRyZWVOb2RlKG1lcmdlZE5vZGUudmFsdWUsIG1lcmdlZENoaWxkcmVuKSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdC5maWx0ZXIobiA9PiAhbWVyZ2VkTm9kZXMuaGFzKG4pKTtcbn1cblxuZnVuY3Rpb24gY2hlY2tPdXRsZXROYW1lVW5pcXVlbmVzcyhub2RlczogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXSk6IHZvaWQge1xuICBjb25zdCBuYW1lczoge1trOiBzdHJpbmddOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90fSA9IHt9O1xuICBub2Rlcy5mb3JFYWNoKG4gPT4ge1xuICAgIGNvbnN0IHJvdXRlV2l0aFNhbWVPdXRsZXROYW1lID0gbmFtZXNbbi52YWx1ZS5vdXRsZXRdO1xuICAgIGlmIChyb3V0ZVdpdGhTYW1lT3V0bGV0TmFtZSkge1xuICAgICAgY29uc3QgcCA9IHJvdXRlV2l0aFNhbWVPdXRsZXROYW1lLnVybC5tYXAocyA9PiBzLnRvU3RyaW5nKCkpLmpvaW4oJy8nKTtcbiAgICAgIGNvbnN0IGMgPSBuLnZhbHVlLnVybC5tYXAocyA9PiBzLnRvU3RyaW5nKCkpLmpvaW4oJy8nKTtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5UV09fU0VHTUVOVFNfV0lUSF9TQU1FX09VVExFVCxcbiAgICAgICAgICBOR19ERVZfTU9ERSAmJiBgVHdvIHNlZ21lbnRzIGNhbm5vdCBoYXZlIHRoZSBzYW1lIG91dGxldCBuYW1lOiAnJHtwfScgYW5kICcke2N9Jy5gKTtcbiAgICB9XG4gICAgbmFtZXNbbi52YWx1ZS5vdXRsZXRdID0gbi52YWx1ZTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldERhdGEocm91dGU6IFJvdXRlKTogRGF0YSB7XG4gIHJldHVybiByb3V0ZS5kYXRhIHx8IHt9O1xufVxuXG5mdW5jdGlvbiBnZXRSZXNvbHZlKHJvdXRlOiBSb3V0ZSk6IFJlc29sdmVEYXRhIHtcbiAgcmV0dXJuIHJvdXRlLnJlc29sdmUgfHwge307XG59XG4iXX0=