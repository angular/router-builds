/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ɵRuntimeError as RuntimeError } from '@angular/core';
import { from, of } from 'rxjs';
import { catchError, concatMap, defaultIfEmpty, first, last as rxjsLast, map, mergeMap, scan, switchMap, tap } from 'rxjs/operators';
import { AbsoluteRedirect, ApplyRedirects, canLoadFails, noMatch, NoMatch } from './apply_redirects';
import { createUrlTreeFromSnapshot } from './create_url_tree';
import { runCanLoadGuards } from './operators/check_guards';
import { ActivatedRouteSnapshot, inheritedParamsDataResolve, RouterStateSnapshot } from './router_state';
import { PRIMARY_OUTLET } from './shared';
import { last } from './utils/collection';
import { getOutlet, sortByMatchingOutlets } from './utils/config';
import { isImmediateMatch, match, matchWithChecks, noLeftoversInUrl, split } from './utils/config_matching';
import { TreeNode } from './utils/tree';
import { isEmptyError } from './utils/type_guards';
/**
 * Class used to indicate there were no additional route config matches but that all segments of
 * the URL were consumed during matching so the route was URL matched. When this happens, we still
 * try to match child configs in case there are empty path children.
 */
class NoLeftoversInUrl {
}
export function recognize(injector, configLoader, rootComponentType, config, urlTree, urlSerializer, paramsInheritanceStrategy = 'emptyOnly') {
    return new Recognizer(injector, configLoader, rootComponentType, config, urlTree, paramsInheritanceStrategy, urlSerializer)
        .recognize();
}
export class Recognizer {
    constructor(injector, configLoader, rootComponentType, config, urlTree, paramsInheritanceStrategy, urlSerializer) {
        this.injector = injector;
        this.configLoader = configLoader;
        this.rootComponentType = rootComponentType;
        this.config = config;
        this.urlTree = urlTree;
        this.paramsInheritanceStrategy = paramsInheritanceStrategy;
        this.urlSerializer = urlSerializer;
        this.allowRedirects = true;
        this.applyRedirects = new ApplyRedirects(this.urlSerializer, this.urlTree);
    }
    noMatchError(e) {
        return new RuntimeError(4002 /* RuntimeErrorCode.NO_MATCH */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
            `Cannot match any routes. URL Segment: '${e.segmentGroup}'`);
    }
    recognize() {
        const rootSegmentGroup = split(this.urlTree.root, [], [], this.config).segmentGroup;
        return this.processSegmentGroup(this.injector, this.config, rootSegmentGroup, PRIMARY_OUTLET)
            .pipe(catchError((e) => {
            if (e instanceof AbsoluteRedirect) {
                // After an absolute redirect we do not apply any more redirects!
                // If this implementation changes, update the documentation note in `redirectTo`.
                this.allowRedirects = false;
                this.urlTree = e.urlTree;
                return this.match(e.urlTree);
            }
            if (e instanceof NoMatch) {
                throw this.noMatchError(e);
            }
            throw e;
        }), map(children => {
            // Use Object.freeze to prevent readers of the Router state from modifying it outside
            // of a navigation, resulting in the router being out of sync with the browser.
            const root = new ActivatedRouteSnapshot([], Object.freeze({}), Object.freeze({ ...this.urlTree.queryParams }), this.urlTree.fragment, {}, PRIMARY_OUTLET, this.rootComponentType, null, {});
            const rootNode = new TreeNode(root, children);
            const routeState = new RouterStateSnapshot('', rootNode);
            const tree = createUrlTreeFromSnapshot(root, [], this.urlTree.queryParams, this.urlTree.fragment);
            // https://github.com/angular/angular/issues/47307
            // Creating the tree stringifies the query params
            // We don't want to do this here so reassign them to the original.
            tree.queryParams = this.urlTree.queryParams;
            routeState.url = this.urlSerializer.serialize(tree);
            this.inheritParamsAndData(routeState._root);
            return { state: routeState, tree };
        }));
    }
    match(tree) {
        const expanded$ = this.processSegmentGroup(this.injector, this.config, tree.root, PRIMARY_OUTLET);
        return expanded$.pipe(catchError((e) => {
            if (e instanceof NoMatch) {
                throw this.noMatchError(e);
            }
            throw e;
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
        return this.processSegment(injector, config, segmentGroup, segmentGroup.segments, outlet, true)
            .pipe(map(child => child instanceof TreeNode ? [child] : []));
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
        // Expand outlets one at a time, starting with the primary outlet. We need to do it this way
        // because an absolute redirect from the primary outlet takes precedence.
        const childOutlets = [];
        for (const child of Object.keys(segmentGroup.children)) {
            if (child === 'primary') {
                childOutlets.unshift(child);
            }
            else {
                childOutlets.push(child);
            }
        }
        return from(childOutlets)
            .pipe(concatMap(childOutlet => {
            const child = segmentGroup.children[childOutlet];
            // Sort the config so that routes with outlets that match the one being activated
            // appear first, followed by routes for other outlets, which might match if they have
            // an empty path.
            const sortedConfig = sortByMatchingOutlets(config, childOutlet);
            return this.processSegmentGroup(injector, sortedConfig, child, childOutlet);
        }), scan((children, outletChildren) => {
            children.push(...outletChildren);
            return children;
        }), defaultIfEmpty(null), rxjsLast(), mergeMap(children => {
            if (children === null)
                return noMatch(segmentGroup);
            // Because we may have matched two outlets to the same empty path segment, we can have
            // multiple activated results for the same outlet. We should merge the children of
            // these results so the final return value is only one `TreeNode` per outlet.
            const mergedChildren = mergeEmptyPathMatches(children);
            if (typeof ngDevMode === 'undefined' || ngDevMode) {
                // This should really never happen - we are only taking the first match for each
                // outlet and merge the empty path matches.
                checkOutletNameUniqueness(mergedChildren);
            }
            sortActivatedRouteSnapshots(mergedChildren);
            return of(mergedChildren);
        }));
    }
    processSegment(injector, routes, segmentGroup, segments, outlet, allowRedirects) {
        return from(routes).pipe(concatMap(r => {
            return this
                .processSegmentAgainstRoute(r._injector ?? injector, routes, r, segmentGroup, segments, outlet, allowRedirects)
                .pipe(catchError((e) => {
                if (e instanceof NoMatch) {
                    return of(null);
                }
                throw e;
            }));
        }), first((x) => !!x), catchError(e => {
            if (isEmptyError(e)) {
                if (noLeftoversInUrl(segmentGroup, segments, outlet)) {
                    return of(new NoLeftoversInUrl());
                }
                return noMatch(segmentGroup);
            }
            throw e;
        }));
    }
    processSegmentAgainstRoute(injector, routes, route, rawSegment, segments, outlet, allowRedirects) {
        if (!isImmediateMatch(route, rawSegment, segments, outlet))
            return noMatch(rawSegment);
        if (route.redirectTo === undefined) {
            return this.matchSegmentAgainstRoute(injector, rawSegment, route, segments, outlet);
        }
        if (allowRedirects && this.allowRedirects) {
            return this.expandSegmentAgainstRouteUsingRedirect(injector, rawSegment, routes, route, segments, outlet);
        }
        return noMatch(rawSegment);
    }
    expandSegmentAgainstRouteUsingRedirect(injector, segmentGroup, routes, route, segments, outlet) {
        const { matched, consumedSegments, positionalParamSegments, remainingSegments, } = route.path === '**' ? createWildcardMatchResult(segments) :
            match(segmentGroup, route, segments);
        if (!matched)
            return noMatch(segmentGroup);
        const newTree = this.applyRedirects.applyRedirectCommands(consumedSegments, route.redirectTo, positionalParamSegments);
        return this.applyRedirects.lineralizeSegments(route, newTree)
            .pipe(mergeMap((newSegments) => {
            return this.processSegment(injector, routes, segmentGroup, newSegments.concat(remainingSegments), outlet, false);
        }));
    }
    matchSegmentAgainstRoute(injector, rawSegment, route, segments, outlet) {
        let matchResult;
        if (route.path === '**') {
            matchResult = of(createWildcardMatchResult(segments));
            // Prior versions of the route matching algorithm would stop matching at the wildcard route.
            // We should investigate a better strategy for any existing children. Otherwise, these
            // child segments are silently dropped from the navigation.
            // https://github.com/angular/angular/issues/40089
            rawSegment.children = {};
        }
        else {
            matchResult = matchWithChecks(rawSegment, route, segments, injector, this.urlSerializer);
        }
        return matchResult.pipe(switchMap((result) => {
            if (!result.matched) {
                return noMatch(rawSegment);
            }
            // If the route has an injector created from providers, we should start using that.
            injector = route._injector ?? injector;
            return this.getChildConfig(injector, route, segments)
                .pipe(switchMap(({ routes: childConfig }) => {
                const childInjector = route._loadedInjector ?? injector;
                const { consumedSegments, remainingSegments, parameters } = result;
                const snapshot = new ActivatedRouteSnapshot(consumedSegments, parameters, Object.freeze({ ...this.urlTree.queryParams }), this.urlTree.fragment, getData(route), getOutlet(route), route.component ?? route._loadedComponent ?? null, route, getResolve(route));
                const { segmentGroup, slicedSegments } = split(rawSegment, consumedSegments, remainingSegments, childConfig);
                if (slicedSegments.length === 0 && segmentGroup.hasChildren()) {
                    return this.processChildren(childInjector, childConfig, segmentGroup)
                        .pipe(map(children => {
                        if (children === null) {
                            return null;
                        }
                        return new TreeNode(snapshot, children);
                    }));
                }
                if (childConfig.length === 0 && slicedSegments.length === 0) {
                    return of(new TreeNode(snapshot, []));
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
                    .processSegment(childInjector, childConfig, segmentGroup, slicedSegments, matchedOnOutlet ? PRIMARY_OUTLET : outlet, true)
                    .pipe(map(child => {
                    return new TreeNode(snapshot, child instanceof TreeNode ? [child] : []);
                }));
            }));
        }));
    }
    getChildConfig(injector, route, segments) {
        if (route.children) {
            // The children belong to the same module
            return of({ routes: route.children, injector });
        }
        if (route.loadChildren) {
            // lazy children belong to the loaded module
            if (route._loadedRoutes !== undefined) {
                return of({ routes: route._loadedRoutes, injector: route._loadedInjector });
            }
            return runCanLoadGuards(injector, route, segments, this.urlSerializer)
                .pipe(mergeMap((shouldLoadResult) => {
                if (shouldLoadResult) {
                    return this.configLoader.loadChildren(injector, route)
                        .pipe(tap((cfg) => {
                        route._loadedRoutes = cfg.routes;
                        route._loadedInjector = cfg.injector;
                    }));
                }
                return canLoadFails(route);
            }));
        }
        return of({ routes: [], injector });
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
function hasEmptyPathConfig(node) {
    const config = node.value.routeConfig;
    return config && config.path === '';
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
            throw new RuntimeError(4006 /* RuntimeErrorCode.TWO_SEGMENTS_WITH_SAME_OUTLET */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
                `Two segments cannot have the same outlet name: '${p}' and '${c}'.`);
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
function createWildcardMatchResult(segments) {
    return {
        matched: true,
        parameters: segments.length > 0 ? last(segments).parameters : {},
        consumedSegments: segments,
        remainingSegments: [],
        positionalParamSegments: {},
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb2duaXplLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yZWNvZ25pemUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUE0QixhQUFhLElBQUksWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3ZGLE9BQU8sRUFBQyxJQUFJLEVBQWMsRUFBRSxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsSUFBSSxJQUFJLFFBQVEsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFbkksT0FBTyxFQUFtQixnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUNySCxPQUFPLEVBQUMseUJBQXlCLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUc1RCxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUUxRCxPQUFPLEVBQUMsc0JBQXNCLEVBQUUsMEJBQTBCLEVBQTZCLG1CQUFtQixFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDbEksT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUV4QyxPQUFPLEVBQUMsSUFBSSxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDeEMsT0FBTyxFQUFDLFNBQVMsRUFBRSxxQkFBcUIsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxnQkFBZ0IsRUFBRSxLQUFLLEVBQWUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQ3ZILE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDdEMsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBRWpEOzs7O0dBSUc7QUFDSCxNQUFNLGdCQUFnQjtDQUFHO0FBRXpCLE1BQU0sVUFBVSxTQUFTLENBQ3JCLFFBQTZCLEVBQUUsWUFBZ0MsRUFDL0QsaUJBQWlDLEVBQUUsTUFBYyxFQUFFLE9BQWdCLEVBQ25FLGFBQTRCLEVBQzVCLDRCQUNJLFdBQVc7SUFDakIsT0FBTyxJQUFJLFVBQVUsQ0FDVixRQUFRLEVBQUUsWUFBWSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUseUJBQXlCLEVBQ3JGLGFBQWEsQ0FBQztTQUNwQixTQUFTLEVBQUUsQ0FBQztBQUNuQixDQUFDO0FBRUQsTUFBTSxPQUFPLFVBQVU7SUFJckIsWUFDWSxRQUE2QixFQUFVLFlBQWdDLEVBQ3ZFLGlCQUFpQyxFQUFVLE1BQWMsRUFBVSxPQUFnQixFQUNuRix5QkFBb0QsRUFDM0MsYUFBNEI7UUFIckMsYUFBUSxHQUFSLFFBQVEsQ0FBcUI7UUFBVSxpQkFBWSxHQUFaLFlBQVksQ0FBb0I7UUFDdkUsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFnQjtRQUFVLFdBQU0sR0FBTixNQUFNLENBQVE7UUFBVSxZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQ25GLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBMkI7UUFDM0Msa0JBQWEsR0FBYixhQUFhLENBQWU7UUFQakQsbUJBQWMsR0FBRyxJQUFJLENBQUM7UUFDZCxtQkFBYyxHQUFHLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBTTFCLENBQUM7SUFFN0MsWUFBWSxDQUFDLENBQVU7UUFDN0IsT0FBTyxJQUFJLFlBQVksdUNBRW5CLENBQUMsT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLFNBQVMsQ0FBQztZQUMzQywwQ0FBMEMsQ0FBQyxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVELFNBQVM7UUFDUCxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLENBQUM7UUFFcEYsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLGdCQUFnQixFQUFFLGNBQWMsQ0FBQzthQUN4RixJQUFJLENBQ0QsVUFBVSxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUU7WUFDcEIsSUFBSSxDQUFDLFlBQVksZ0JBQWdCLEVBQUU7Z0JBQ2pDLGlFQUFpRTtnQkFDakUsaUZBQWlGO2dCQUNqRixJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQztnQkFDNUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUN6QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQzlCO1lBRUQsSUFBSSxDQUFDLFlBQVksT0FBTyxFQUFFO2dCQUN4QixNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDNUI7WUFFRCxNQUFNLENBQUMsQ0FBQztRQUNWLENBQUMsQ0FBQyxFQUNGLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNiLHFGQUFxRjtZQUNyRiwrRUFBK0U7WUFDL0UsTUFBTSxJQUFJLEdBQUcsSUFBSSxzQkFBc0IsQ0FDbkMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUMsQ0FBQyxFQUNuRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFFakYsTUFBTSxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sVUFBVSxHQUFHLElBQUksbUJBQW1CLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3pELE1BQU0sSUFBSSxHQUFHLHlCQUF5QixDQUNsQyxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDL0Qsa0RBQWtEO1lBQ2xELGlEQUFpRDtZQUNqRCxrRUFBa0U7WUFDbEUsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztZQUM1QyxVQUFVLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3BELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDNUMsT0FBTyxFQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFDLENBQUM7UUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNkLENBQUM7SUFHTyxLQUFLLENBQUMsSUFBYTtRQUN6QixNQUFNLFNBQVMsR0FDWCxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDcEYsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFO1lBQzFDLElBQUksQ0FBQyxZQUFZLE9BQU8sRUFBRTtnQkFDeEIsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzVCO1lBRUQsTUFBTSxDQUFDLENBQUM7UUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQztJQUVELG9CQUFvQixDQUFDLFNBQTJDO1FBQzlELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUM7UUFFOUIsTUFBTSxDQUFDLEdBQUcsMEJBQTBCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzVFLEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkMsS0FBSyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVuQyxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxtQkFBbUIsQ0FDZixRQUE2QixFQUFFLE1BQWUsRUFBRSxZQUE2QixFQUM3RSxNQUFjO1FBQ2hCLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLFlBQVksQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUNwRSxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztTQUM3RDtRQUVELE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUM7YUFDMUYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssWUFBWSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSCxlQUFlLENBQUMsUUFBNkIsRUFBRSxNQUFlLEVBQUUsWUFBNkI7UUFFM0YsNEZBQTRGO1FBQzVGLHlFQUF5RTtRQUN6RSxNQUFNLFlBQVksR0FBYSxFQUFFLENBQUM7UUFDbEMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUN0RCxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7Z0JBQ3ZCLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDN0I7aUJBQU07Z0JBQ0wsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUMxQjtTQUNGO1FBQ0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO2FBQ3BCLElBQUksQ0FDRCxTQUFTLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDdEIsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNqRCxpRkFBaUY7WUFDakYscUZBQXFGO1lBQ3JGLGlCQUFpQjtZQUNqQixNQUFNLFlBQVksR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDaEUsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDOUUsQ0FBQyxDQUFDLEVBQ0YsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLGNBQWMsRUFBRSxFQUFFO1lBQ2hDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxjQUFjLENBQUMsQ0FBQztZQUNqQyxPQUFPLFFBQVEsQ0FBQztRQUNsQixDQUFDLENBQUMsRUFDRixjQUFjLENBQUMsSUFBaUQsQ0FBQyxFQUNqRSxRQUFRLEVBQUUsRUFDVixRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDbEIsSUFBSSxRQUFRLEtBQUssSUFBSTtnQkFBRSxPQUFPLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNwRCxzRkFBc0Y7WUFDdEYsa0ZBQWtGO1lBQ2xGLDZFQUE2RTtZQUM3RSxNQUFNLGNBQWMsR0FBRyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN2RCxJQUFJLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTLEVBQUU7Z0JBQ2pELGdGQUFnRjtnQkFDaEYsMkNBQTJDO2dCQUMzQyx5QkFBeUIsQ0FBQyxjQUFjLENBQUMsQ0FBQzthQUMzQztZQUNELDJCQUEyQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzVDLE9BQU8sRUFBRSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUNMLENBQUM7SUFDUixDQUFDO0lBRUQsY0FBYyxDQUNWLFFBQTZCLEVBQUUsTUFBZSxFQUFFLFlBQTZCLEVBQzdFLFFBQXNCLEVBQUUsTUFBYyxFQUN0QyxjQUF1QjtRQUN6QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQ3BCLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNaLE9BQU8sSUFBSTtpQkFDTiwwQkFBMEIsQ0FDdkIsQ0FBQyxDQUFDLFNBQVMsSUFBSSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFDbEUsY0FBYyxDQUFDO2lCQUNsQixJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUU7Z0JBQzFCLElBQUksQ0FBQyxZQUFZLE9BQU8sRUFBRTtvQkFDeEIsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ2pCO2dCQUNELE1BQU0sQ0FBQyxDQUFDO1lBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNWLENBQUMsQ0FBQyxFQUNGLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBMEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDeEYsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ25CLElBQUksZ0JBQWdCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsRUFBRTtvQkFDcEQsT0FBTyxFQUFFLENBQUMsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7aUJBQ25DO2dCQUNELE9BQU8sT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO2FBQzlCO1lBQ0QsTUFBTSxDQUFDLENBQUM7UUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVELDBCQUEwQixDQUN0QixRQUE2QixFQUFFLE1BQWUsRUFBRSxLQUFZLEVBQUUsVUFBMkIsRUFDekYsUUFBc0IsRUFBRSxNQUFjLEVBQ3RDLGNBQXVCO1FBQ3pCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUM7WUFBRSxPQUFPLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV2RixJQUFJLEtBQUssQ0FBQyxVQUFVLEtBQUssU0FBUyxFQUFFO1lBQ2xDLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztTQUNyRjtRQUVELElBQUksY0FBYyxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDekMsT0FBTyxJQUFJLENBQUMsc0NBQXNDLENBQzlDLFFBQVEsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7U0FDNUQ7UUFFRCxPQUFPLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRU8sc0NBQXNDLENBQzFDLFFBQTZCLEVBQUUsWUFBNkIsRUFBRSxNQUFlLEVBQUUsS0FBWSxFQUMzRixRQUFzQixFQUN0QixNQUFjO1FBQ2hCLE1BQU0sRUFDSixPQUFPLEVBQ1AsZ0JBQWdCLEVBQ2hCLHVCQUF1QixFQUN2QixpQkFBaUIsR0FDbEIsR0FBRyxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUNyQyxLQUFLLENBQUMsWUFBWSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsT0FBTztZQUFFLE9BQU8sT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRTNDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQ3JELGdCQUFnQixFQUFFLEtBQUssQ0FBQyxVQUFXLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztRQUVsRSxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQzthQUN4RCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsV0FBeUIsRUFBRSxFQUFFO1lBQzNDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FDdEIsUUFBUSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM1RixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVELHdCQUF3QixDQUNwQixRQUE2QixFQUFFLFVBQTJCLEVBQUUsS0FBWSxFQUN4RSxRQUFzQixFQUFFLE1BQWM7UUFDeEMsSUFBSSxXQUFvQyxDQUFDO1FBRXpDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJLEVBQUU7WUFDdkIsV0FBVyxHQUFHLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ3RELDRGQUE0RjtZQUM1RixzRkFBc0Y7WUFDdEYsMkRBQTJEO1lBQzNELGtEQUFrRDtZQUNsRCxVQUFVLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztTQUMxQjthQUFNO1lBQ0wsV0FBVyxHQUFHLGVBQWUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1NBQzFGO1FBRUQsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQzNDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO2dCQUNuQixPQUFPLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQzthQUM1QjtZQUVELG1GQUFtRjtZQUNuRixRQUFRLEdBQUcsS0FBSyxDQUFDLFNBQVMsSUFBSSxRQUFRLENBQUM7WUFDdkMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDO2lCQUNoRCxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxNQUFNLEVBQUUsV0FBVyxFQUFDLEVBQUUsRUFBRTtnQkFDeEMsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLGVBQWUsSUFBSSxRQUFRLENBQUM7Z0JBRXhELE1BQU0sRUFBQyxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQUMsR0FBRyxNQUFNLENBQUM7Z0JBQ2pFLE1BQU0sUUFBUSxHQUFHLElBQUksc0JBQXNCLENBQ3ZDLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBQyxDQUFDLEVBQzFFLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQ3ZELEtBQUssQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDLGdCQUFnQixJQUFJLElBQUksRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBRWpGLE1BQU0sRUFBQyxZQUFZLEVBQUUsY0FBYyxFQUFDLEdBQ2hDLEtBQUssQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBRXhFLElBQUksY0FBYyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksWUFBWSxDQUFDLFdBQVcsRUFBRSxFQUFFO29CQUM3RCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxFQUFFLFdBQVcsRUFBRSxZQUFZLENBQUM7eUJBQ2hFLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7d0JBQ25CLElBQUksUUFBUSxLQUFLLElBQUksRUFBRTs0QkFDckIsT0FBTyxJQUFJLENBQUM7eUJBQ2I7d0JBQ0QsT0FBTyxJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7b0JBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ1Q7Z0JBRUQsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxjQUFjLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtvQkFDM0QsT0FBTyxFQUFFLENBQUMsSUFBSSxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7aUJBQ3ZDO2dCQUVELE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxNQUFNLENBQUM7Z0JBQ3BELG1GQUFtRjtnQkFDbkYscUZBQXFGO2dCQUNyRix1RkFBdUY7Z0JBQ3ZGLDZDQUE2QztnQkFDN0MsOEJBQThCO2dCQUM5Qiw4QkFBOEI7Z0JBQzlCLEtBQUs7Z0JBQ0wsc0ZBQXNGO2dCQUN0RixPQUFPLElBQUk7cUJBQ04sY0FBYyxDQUNYLGFBQWEsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFDeEQsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUM7cUJBQ25ELElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ2hCLE9BQU8sSUFBSSxRQUFRLENBQUMsUUFBUSxFQUFFLEtBQUssWUFBWSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUMxRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNWLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTixDQUFDO0lBQ08sY0FBYyxDQUFDLFFBQTZCLEVBQUUsS0FBWSxFQUFFLFFBQXNCO1FBRXhGLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRTtZQUNsQix5Q0FBeUM7WUFDekMsT0FBTyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUMsQ0FBQyxDQUFDO1NBQy9DO1FBRUQsSUFBSSxLQUFLLENBQUMsWUFBWSxFQUFFO1lBQ3RCLDRDQUE0QztZQUM1QyxJQUFJLEtBQUssQ0FBQyxhQUFhLEtBQUssU0FBUyxFQUFFO2dCQUNyQyxPQUFPLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsYUFBYSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsZUFBZSxFQUFDLENBQUMsQ0FBQzthQUMzRTtZQUVELE9BQU8sZ0JBQWdCLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQztpQkFDakUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUF5QixFQUFFLEVBQUU7Z0JBQzNDLElBQUksZ0JBQWdCLEVBQUU7b0JBQ3BCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQzt5QkFDakQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQXVCLEVBQUUsRUFBRTt3QkFDcEMsS0FBSyxDQUFDLGFBQWEsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO3dCQUNqQyxLQUFLLENBQUMsZUFBZSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUM7b0JBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ1Q7Z0JBQ0QsT0FBTyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNUO1FBRUQsT0FBTyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBQyxDQUFDLENBQUM7SUFDcEMsQ0FBQztDQUNGO0FBRUQsU0FBUywyQkFBMkIsQ0FBQyxLQUF5QztJQUM1RSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ2xCLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssY0FBYztZQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxjQUFjO1lBQUUsT0FBTyxDQUFDLENBQUM7UUFDaEQsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0RCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLElBQXNDO0lBQ2hFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDO0lBQ3RDLE9BQU8sTUFBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDO0FBQ3RDLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBUyxxQkFBcUIsQ0FBQyxLQUE4QztJQUUzRSxNQUFNLE1BQU0sR0FBNEMsRUFBRSxDQUFDO0lBQzNELGdHQUFnRztJQUNoRyxNQUFNLFdBQVcsR0FBMEMsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUVyRSxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtRQUN4QixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDN0IsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQixTQUFTO1NBQ1Y7UUFFRCxNQUFNLHNCQUFzQixHQUN4QixNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEtBQUssVUFBVSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN2RixJQUFJLHNCQUFzQixLQUFLLFNBQVMsRUFBRTtZQUN4QyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3ZELFdBQVcsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztTQUN6QzthQUFNO1lBQ0wsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNuQjtLQUNGO0lBQ0QsZ0dBQWdHO0lBQ2hHLCtGQUErRjtJQUMvRiw4RkFBOEY7SUFDOUYsdUVBQXVFO0lBQ3ZFLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFO1FBQ3BDLE1BQU0sY0FBYyxHQUFHLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztLQUM3RDtJQUNELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pELENBQUM7QUFFRCxTQUFTLHlCQUF5QixDQUFDLEtBQXlDO0lBQzFFLE1BQU0sS0FBSyxHQUEwQyxFQUFFLENBQUM7SUFDeEQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNoQixNQUFNLHVCQUF1QixHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RELElBQUksdUJBQXVCLEVBQUU7WUFDM0IsTUFBTSxDQUFDLEdBQUcsdUJBQXVCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN2RSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdkQsTUFBTSxJQUFJLFlBQVksNERBRWxCLENBQUMsT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLFNBQVMsQ0FBQztnQkFDM0MsbURBQW1ELENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzlFO1FBQ0QsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUNsQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FBQyxLQUFZO0lBQzNCLE9BQU8sS0FBSyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7QUFDMUIsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLEtBQVk7SUFDOUIsT0FBTyxLQUFLLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQztBQUM3QixDQUFDO0FBRUQsU0FBUyx5QkFBeUIsQ0FBQyxRQUFzQjtJQUN2RCxPQUFPO1FBQ0wsT0FBTyxFQUFFLElBQUk7UUFDYixVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDakUsZ0JBQWdCLEVBQUUsUUFBUTtRQUMxQixpQkFBaUIsRUFBRSxFQUFFO1FBQ3JCLHVCQUF1QixFQUFFLEVBQUU7S0FDNUIsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFbnZpcm9ubWVudEluamVjdG9yLCBUeXBlLCDJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtmcm9tLCBPYnNlcnZhYmxlLCBvZn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NhdGNoRXJyb3IsIGNvbmNhdE1hcCwgZGVmYXVsdElmRW1wdHksIGZpcnN0LCBsYXN0IGFzIHJ4anNMYXN0LCBtYXAsIG1lcmdlTWFwLCBzY2FuLCBzd2l0Y2hNYXAsIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge2Fic29sdXRlUmVkaXJlY3QsIEFic29sdXRlUmVkaXJlY3QsIEFwcGx5UmVkaXJlY3RzLCBjYW5Mb2FkRmFpbHMsIG5vTWF0Y2gsIE5vTWF0Y2h9IGZyb20gJy4vYXBwbHlfcmVkaXJlY3RzJztcbmltcG9ydCB7Y3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdH0gZnJvbSAnLi9jcmVhdGVfdXJsX3RyZWUnO1xuaW1wb3J0IHtSdW50aW1lRXJyb3JDb2RlfSBmcm9tICcuL2Vycm9ycyc7XG5pbXBvcnQge0RhdGEsIExvYWRlZFJvdXRlckNvbmZpZywgUmVzb2x2ZURhdGEsIFJvdXRlLCBSb3V0ZXN9IGZyb20gJy4vbW9kZWxzJztcbmltcG9ydCB7cnVuQ2FuTG9hZEd1YXJkc30gZnJvbSAnLi9vcGVyYXRvcnMvY2hlY2tfZ3VhcmRzJztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgaW5oZXJpdGVkUGFyYW1zRGF0YVJlc29sdmUsIFBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3ksIFJvdXRlclN0YXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UFJJTUFSWV9PVVRMRVR9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7VXJsU2VnbWVudCwgVXJsU2VnbWVudEdyb3VwLCBVcmxTZXJpYWxpemVyLCBVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcbmltcG9ydCB7bGFzdH0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcbmltcG9ydCB7Z2V0T3V0bGV0LCBzb3J0QnlNYXRjaGluZ091dGxldHN9IGZyb20gJy4vdXRpbHMvY29uZmlnJztcbmltcG9ydCB7aXNJbW1lZGlhdGVNYXRjaCwgbWF0Y2gsIE1hdGNoUmVzdWx0LCBtYXRjaFdpdGhDaGVja3MsIG5vTGVmdG92ZXJzSW5VcmwsIHNwbGl0fSBmcm9tICcuL3V0aWxzL2NvbmZpZ19tYXRjaGluZyc7XG5pbXBvcnQge1RyZWVOb2RlfSBmcm9tICcuL3V0aWxzL3RyZWUnO1xuaW1wb3J0IHtpc0VtcHR5RXJyb3J9IGZyb20gJy4vdXRpbHMvdHlwZV9ndWFyZHMnO1xuXG4vKipcbiAqIENsYXNzIHVzZWQgdG8gaW5kaWNhdGUgdGhlcmUgd2VyZSBubyBhZGRpdGlvbmFsIHJvdXRlIGNvbmZpZyBtYXRjaGVzIGJ1dCB0aGF0IGFsbCBzZWdtZW50cyBvZlxuICogdGhlIFVSTCB3ZXJlIGNvbnN1bWVkIGR1cmluZyBtYXRjaGluZyBzbyB0aGUgcm91dGUgd2FzIFVSTCBtYXRjaGVkLiBXaGVuIHRoaXMgaGFwcGVucywgd2Ugc3RpbGxcbiAqIHRyeSB0byBtYXRjaCBjaGlsZCBjb25maWdzIGluIGNhc2UgdGhlcmUgYXJlIGVtcHR5IHBhdGggY2hpbGRyZW4uXG4gKi9cbmNsYXNzIE5vTGVmdG92ZXJzSW5Vcmwge31cblxuZXhwb3J0IGZ1bmN0aW9uIHJlY29nbml6ZShcbiAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvciwgY29uZmlnTG9hZGVyOiBSb3V0ZXJDb25maWdMb2FkZXIsXG4gICAgcm9vdENvbXBvbmVudFR5cGU6IFR5cGU8YW55PnxudWxsLCBjb25maWc6IFJvdXRlcywgdXJsVHJlZTogVXJsVHJlZSxcbiAgICB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6IFBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kgPVxuICAgICAgICAnZW1wdHlPbmx5Jyk6IE9ic2VydmFibGU8e3N0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LCB0cmVlOiBVcmxUcmVlfT4ge1xuICByZXR1cm4gbmV3IFJlY29nbml6ZXIoXG4gICAgICAgICAgICAgaW5qZWN0b3IsIGNvbmZpZ0xvYWRlciwgcm9vdENvbXBvbmVudFR5cGUsIGNvbmZpZywgdXJsVHJlZSwgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSxcbiAgICAgICAgICAgICB1cmxTZXJpYWxpemVyKVxuICAgICAgLnJlY29nbml6ZSgpO1xufVxuXG5leHBvcnQgY2xhc3MgUmVjb2duaXplciB7XG4gIGFsbG93UmVkaXJlY3RzID0gdHJ1ZTtcbiAgcHJpdmF0ZSBhcHBseVJlZGlyZWN0cyA9IG5ldyBBcHBseVJlZGlyZWN0cyh0aGlzLnVybFNlcmlhbGl6ZXIsIHRoaXMudXJsVHJlZSk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCBwcml2YXRlIGNvbmZpZ0xvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyLFxuICAgICAgcHJpdmF0ZSByb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+fG51bGwsIHByaXZhdGUgY29uZmlnOiBSb3V0ZXMsIHByaXZhdGUgdXJsVHJlZTogVXJsVHJlZSxcbiAgICAgIHByaXZhdGUgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogUGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcikge31cblxuICBwcml2YXRlIG5vTWF0Y2hFcnJvcihlOiBOb01hdGNoKTogYW55IHtcbiAgICByZXR1cm4gbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgUnVudGltZUVycm9yQ29kZS5OT19NQVRDSCxcbiAgICAgICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiZcbiAgICAgICAgICAgIGBDYW5ub3QgbWF0Y2ggYW55IHJvdXRlcy4gVVJMIFNlZ21lbnQ6ICcke2Uuc2VnbWVudEdyb3VwfSdgKTtcbiAgfVxuXG4gIHJlY29nbml6ZSgpOiBPYnNlcnZhYmxlPHtzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCwgdHJlZTogVXJsVHJlZX0+IHtcbiAgICBjb25zdCByb290U2VnbWVudEdyb3VwID0gc3BsaXQodGhpcy51cmxUcmVlLnJvb3QsIFtdLCBbXSwgdGhpcy5jb25maWcpLnNlZ21lbnRHcm91cDtcblxuICAgIHJldHVybiB0aGlzLnByb2Nlc3NTZWdtZW50R3JvdXAodGhpcy5pbmplY3RvciwgdGhpcy5jb25maWcsIHJvb3RTZWdtZW50R3JvdXAsIFBSSU1BUllfT1VUTEVUKVxuICAgICAgICAucGlwZShcbiAgICAgICAgICAgIGNhdGNoRXJyb3IoKGU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIEFic29sdXRlUmVkaXJlY3QpIHtcbiAgICAgICAgICAgICAgICAvLyBBZnRlciBhbiBhYnNvbHV0ZSByZWRpcmVjdCB3ZSBkbyBub3QgYXBwbHkgYW55IG1vcmUgcmVkaXJlY3RzIVxuICAgICAgICAgICAgICAgIC8vIElmIHRoaXMgaW1wbGVtZW50YXRpb24gY2hhbmdlcywgdXBkYXRlIHRoZSBkb2N1bWVudGF0aW9uIG5vdGUgaW4gYHJlZGlyZWN0VG9gLlxuICAgICAgICAgICAgICAgIHRoaXMuYWxsb3dSZWRpcmVjdHMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLnVybFRyZWUgPSBlLnVybFRyZWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubWF0Y2goZS51cmxUcmVlKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9NYXRjaCkge1xuICAgICAgICAgICAgICAgIHRocm93IHRoaXMubm9NYXRjaEVycm9yKGUpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgbWFwKGNoaWxkcmVuID0+IHtcbiAgICAgICAgICAgICAgLy8gVXNlIE9iamVjdC5mcmVlemUgdG8gcHJldmVudCByZWFkZXJzIG9mIHRoZSBSb3V0ZXIgc3RhdGUgZnJvbSBtb2RpZnlpbmcgaXQgb3V0c2lkZVxuICAgICAgICAgICAgICAvLyBvZiBhIG5hdmlnYXRpb24sIHJlc3VsdGluZyBpbiB0aGUgcm91dGVyIGJlaW5nIG91dCBvZiBzeW5jIHdpdGggdGhlIGJyb3dzZXIuXG4gICAgICAgICAgICAgIGNvbnN0IHJvb3QgPSBuZXcgQWN0aXZhdGVkUm91dGVTbmFwc2hvdChcbiAgICAgICAgICAgICAgICAgIFtdLCBPYmplY3QuZnJlZXplKHt9KSwgT2JqZWN0LmZyZWV6ZSh7Li4udGhpcy51cmxUcmVlLnF1ZXJ5UGFyYW1zfSksXG4gICAgICAgICAgICAgICAgICB0aGlzLnVybFRyZWUuZnJhZ21lbnQsIHt9LCBQUklNQVJZX09VVExFVCwgdGhpcy5yb290Q29tcG9uZW50VHlwZSwgbnVsbCwge30pO1xuXG4gICAgICAgICAgICAgIGNvbnN0IHJvb3ROb2RlID0gbmV3IFRyZWVOb2RlKHJvb3QsIGNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgY29uc3Qgcm91dGVTdGF0ZSA9IG5ldyBSb3V0ZXJTdGF0ZVNuYXBzaG90KCcnLCByb290Tm9kZSk7XG4gICAgICAgICAgICAgIGNvbnN0IHRyZWUgPSBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KFxuICAgICAgICAgICAgICAgICAgcm9vdCwgW10sIHRoaXMudXJsVHJlZS5xdWVyeVBhcmFtcywgdGhpcy51cmxUcmVlLmZyYWdtZW50KTtcbiAgICAgICAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9pc3N1ZXMvNDczMDdcbiAgICAgICAgICAgICAgLy8gQ3JlYXRpbmcgdGhlIHRyZWUgc3RyaW5naWZpZXMgdGhlIHF1ZXJ5IHBhcmFtc1xuICAgICAgICAgICAgICAvLyBXZSBkb24ndCB3YW50IHRvIGRvIHRoaXMgaGVyZSBzbyByZWFzc2lnbiB0aGVtIHRvIHRoZSBvcmlnaW5hbC5cbiAgICAgICAgICAgICAgdHJlZS5xdWVyeVBhcmFtcyA9IHRoaXMudXJsVHJlZS5xdWVyeVBhcmFtcztcbiAgICAgICAgICAgICAgcm91dGVTdGF0ZS51cmwgPSB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHRyZWUpO1xuICAgICAgICAgICAgICB0aGlzLmluaGVyaXRQYXJhbXNBbmREYXRhKHJvdXRlU3RhdGUuX3Jvb3QpO1xuICAgICAgICAgICAgICByZXR1cm4ge3N0YXRlOiByb3V0ZVN0YXRlLCB0cmVlfTtcbiAgICAgICAgICAgIH0pKTtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBtYXRjaCh0cmVlOiBVcmxUcmVlKSB7XG4gICAgY29uc3QgZXhwYW5kZWQkID1cbiAgICAgICAgdGhpcy5wcm9jZXNzU2VnbWVudEdyb3VwKHRoaXMuaW5qZWN0b3IsIHRoaXMuY29uZmlnLCB0cmVlLnJvb3QsIFBSSU1BUllfT1VUTEVUKTtcbiAgICByZXR1cm4gZXhwYW5kZWQkLnBpcGUoY2F0Y2hFcnJvcigoZTogYW55KSA9PiB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIE5vTWF0Y2gpIHtcbiAgICAgICAgdGhyb3cgdGhpcy5ub01hdGNoRXJyb3IoZSk7XG4gICAgICB9XG5cbiAgICAgIHRocm93IGU7XG4gICAgfSkpO1xuICB9XG5cbiAgaW5oZXJpdFBhcmFtc0FuZERhdGEocm91dGVOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pik6IHZvaWQge1xuICAgIGNvbnN0IHJvdXRlID0gcm91dGVOb2RlLnZhbHVlO1xuXG4gICAgY29uc3QgaSA9IGluaGVyaXRlZFBhcmFtc0RhdGFSZXNvbHZlKHJvdXRlLCB0aGlzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kpO1xuICAgIHJvdXRlLnBhcmFtcyA9IE9iamVjdC5mcmVlemUoaS5wYXJhbXMpO1xuICAgIHJvdXRlLmRhdGEgPSBPYmplY3QuZnJlZXplKGkuZGF0YSk7XG5cbiAgICByb3V0ZU5vZGUuY2hpbGRyZW4uZm9yRWFjaChuID0+IHRoaXMuaW5oZXJpdFBhcmFtc0FuZERhdGEobikpO1xuICB9XG5cbiAgcHJvY2Vzc1NlZ21lbnRHcm91cChcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCBjb25maWc6IFJvdXRlW10sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLFxuICAgICAgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10+IHtcbiAgICBpZiAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiBzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc0NoaWxkcmVuKGluamVjdG9yLCBjb25maWcsIHNlZ21lbnRHcm91cCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucHJvY2Vzc1NlZ21lbnQoaW5qZWN0b3IsIGNvbmZpZywgc2VnbWVudEdyb3VwLCBzZWdtZW50R3JvdXAuc2VnbWVudHMsIG91dGxldCwgdHJ1ZSlcbiAgICAgICAgLnBpcGUobWFwKGNoaWxkID0+IGNoaWxkIGluc3RhbmNlb2YgVHJlZU5vZGUgPyBbY2hpbGRdIDogW10pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNYXRjaGVzIGV2ZXJ5IGNoaWxkIG91dGxldCBpbiB0aGUgYHNlZ21lbnRHcm91cGAgdG8gYSBgUm91dGVgIGluIHRoZSBjb25maWcuIFJldHVybnMgYG51bGxgIGlmXG4gICAqIHdlIGNhbm5vdCBmaW5kIGEgbWF0Y2ggZm9yIF9hbnlfIG9mIHRoZSBjaGlsZHJlbi5cbiAgICpcbiAgICogQHBhcmFtIGNvbmZpZyAtIFRoZSBgUm91dGVzYCB0byBtYXRjaCBhZ2FpbnN0XG4gICAqIEBwYXJhbSBzZWdtZW50R3JvdXAgLSBUaGUgYFVybFNlZ21lbnRHcm91cGAgd2hvc2UgY2hpbGRyZW4gbmVlZCB0byBiZSBtYXRjaGVkIGFnYWluc3QgdGhlXG4gICAqICAgICBjb25maWcuXG4gICAqL1xuICBwcm9jZXNzQ2hpbGRyZW4oaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIGNvbmZpZzogUm91dGVbXSwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXApOlxuICAgICAgT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PltdPiB7XG4gICAgLy8gRXhwYW5kIG91dGxldHMgb25lIGF0IGEgdGltZSwgc3RhcnRpbmcgd2l0aCB0aGUgcHJpbWFyeSBvdXRsZXQuIFdlIG5lZWQgdG8gZG8gaXQgdGhpcyB3YXlcbiAgICAvLyBiZWNhdXNlIGFuIGFic29sdXRlIHJlZGlyZWN0IGZyb20gdGhlIHByaW1hcnkgb3V0bGV0IHRha2VzIHByZWNlZGVuY2UuXG4gICAgY29uc3QgY2hpbGRPdXRsZXRzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgT2JqZWN0LmtleXMoc2VnbWVudEdyb3VwLmNoaWxkcmVuKSkge1xuICAgICAgaWYgKGNoaWxkID09PSAncHJpbWFyeScpIHtcbiAgICAgICAgY2hpbGRPdXRsZXRzLnVuc2hpZnQoY2hpbGQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hpbGRPdXRsZXRzLnB1c2goY2hpbGQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZnJvbShjaGlsZE91dGxldHMpXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgICAgY29uY2F0TWFwKGNoaWxkT3V0bGV0ID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgY2hpbGQgPSBzZWdtZW50R3JvdXAuY2hpbGRyZW5bY2hpbGRPdXRsZXRdO1xuICAgICAgICAgICAgICAvLyBTb3J0IHRoZSBjb25maWcgc28gdGhhdCByb3V0ZXMgd2l0aCBvdXRsZXRzIHRoYXQgbWF0Y2ggdGhlIG9uZSBiZWluZyBhY3RpdmF0ZWRcbiAgICAgICAgICAgICAgLy8gYXBwZWFyIGZpcnN0LCBmb2xsb3dlZCBieSByb3V0ZXMgZm9yIG90aGVyIG91dGxldHMsIHdoaWNoIG1pZ2h0IG1hdGNoIGlmIHRoZXkgaGF2ZVxuICAgICAgICAgICAgICAvLyBhbiBlbXB0eSBwYXRoLlxuICAgICAgICAgICAgICBjb25zdCBzb3J0ZWRDb25maWcgPSBzb3J0QnlNYXRjaGluZ091dGxldHMoY29uZmlnLCBjaGlsZE91dGxldCk7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NTZWdtZW50R3JvdXAoaW5qZWN0b3IsIHNvcnRlZENvbmZpZywgY2hpbGQsIGNoaWxkT3V0bGV0KTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgc2NhbigoY2hpbGRyZW4sIG91dGxldENoaWxkcmVuKSA9PiB7XG4gICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2goLi4ub3V0bGV0Q2hpbGRyZW4pO1xuICAgICAgICAgICAgICByZXR1cm4gY2hpbGRyZW47XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIGRlZmF1bHRJZkVtcHR5KG51bGwgYXMgVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXSB8IG51bGwpLFxuICAgICAgICAgICAgcnhqc0xhc3QoKSxcbiAgICAgICAgICAgIG1lcmdlTWFwKGNoaWxkcmVuID0+IHtcbiAgICAgICAgICAgICAgaWYgKGNoaWxkcmVuID09PSBudWxsKSByZXR1cm4gbm9NYXRjaChzZWdtZW50R3JvdXApO1xuICAgICAgICAgICAgICAvLyBCZWNhdXNlIHdlIG1heSBoYXZlIG1hdGNoZWQgdHdvIG91dGxldHMgdG8gdGhlIHNhbWUgZW1wdHkgcGF0aCBzZWdtZW50LCB3ZSBjYW4gaGF2ZVxuICAgICAgICAgICAgICAvLyBtdWx0aXBsZSBhY3RpdmF0ZWQgcmVzdWx0cyBmb3IgdGhlIHNhbWUgb3V0bGV0LiBXZSBzaG91bGQgbWVyZ2UgdGhlIGNoaWxkcmVuIG9mXG4gICAgICAgICAgICAgIC8vIHRoZXNlIHJlc3VsdHMgc28gdGhlIGZpbmFsIHJldHVybiB2YWx1ZSBpcyBvbmx5IG9uZSBgVHJlZU5vZGVgIHBlciBvdXRsZXQuXG4gICAgICAgICAgICAgIGNvbnN0IG1lcmdlZENoaWxkcmVuID0gbWVyZ2VFbXB0eVBhdGhNYXRjaGVzKGNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkge1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgc2hvdWxkIHJlYWxseSBuZXZlciBoYXBwZW4gLSB3ZSBhcmUgb25seSB0YWtpbmcgdGhlIGZpcnN0IG1hdGNoIGZvciBlYWNoXG4gICAgICAgICAgICAgICAgLy8gb3V0bGV0IGFuZCBtZXJnZSB0aGUgZW1wdHkgcGF0aCBtYXRjaGVzLlxuICAgICAgICAgICAgICAgIGNoZWNrT3V0bGV0TmFtZVVuaXF1ZW5lc3MobWVyZ2VkQ2hpbGRyZW4pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHNvcnRBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90cyhtZXJnZWRDaGlsZHJlbik7XG4gICAgICAgICAgICAgIHJldHVybiBvZihtZXJnZWRDaGlsZHJlbik7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgKTtcbiAgfVxuXG4gIHByb2Nlc3NTZWdtZW50KFxuICAgICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJvdXRlczogUm91dGVbXSwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZyxcbiAgICAgIGFsbG93UmVkaXJlY3RzOiBib29sZWFuKTogT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PnxOb0xlZnRvdmVyc0luVXJsPiB7XG4gICAgcmV0dXJuIGZyb20ocm91dGVzKS5waXBlKFxuICAgICAgICBjb25jYXRNYXAociA9PiB7XG4gICAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgICAgICAgLnByb2Nlc3NTZWdtZW50QWdhaW5zdFJvdXRlKFxuICAgICAgICAgICAgICAgICAgci5faW5qZWN0b3IgPz8gaW5qZWN0b3IsIHJvdXRlcywgciwgc2VnbWVudEdyb3VwLCBzZWdtZW50cywgb3V0bGV0LFxuICAgICAgICAgICAgICAgICAgYWxsb3dSZWRpcmVjdHMpXG4gICAgICAgICAgICAgIC5waXBlKGNhdGNoRXJyb3IoKGU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9NYXRjaCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKG51bGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pLFxuICAgICAgICBmaXJzdCgoeCk6IHggaXMgVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD58Tm9MZWZ0b3ZlcnNJblVybCA9PiAhIXgpLCBjYXRjaEVycm9yKGUgPT4ge1xuICAgICAgICAgIGlmIChpc0VtcHR5RXJyb3IoZSkpIHtcbiAgICAgICAgICAgIGlmIChub0xlZnRvdmVyc0luVXJsKHNlZ21lbnRHcm91cCwgc2VnbWVudHMsIG91dGxldCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9mKG5ldyBOb0xlZnRvdmVyc0luVXJsKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5vTWF0Y2goc2VnbWVudEdyb3VwKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfSkpO1xuICB9XG5cbiAgcHJvY2Vzc1NlZ21lbnRBZ2FpbnN0Um91dGUoXG4gICAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvciwgcm91dGVzOiBSb3V0ZVtdLCByb3V0ZTogUm91dGUsIHJhd1NlZ21lbnQ6IFVybFNlZ21lbnRHcm91cCxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nLFxuICAgICAgYWxsb3dSZWRpcmVjdHM6IGJvb2xlYW4pOiBPYnNlcnZhYmxlPFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+fE5vTGVmdG92ZXJzSW5Vcmw+IHtcbiAgICBpZiAoIWlzSW1tZWRpYXRlTWF0Y2gocm91dGUsIHJhd1NlZ21lbnQsIHNlZ21lbnRzLCBvdXRsZXQpKSByZXR1cm4gbm9NYXRjaChyYXdTZWdtZW50KTtcblxuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLm1hdGNoU2VnbWVudEFnYWluc3RSb3V0ZShpbmplY3RvciwgcmF3U2VnbWVudCwgcm91dGUsIHNlZ21lbnRzLCBvdXRsZXQpO1xuICAgIH1cblxuICAgIGlmIChhbGxvd1JlZGlyZWN0cyAmJiB0aGlzLmFsbG93UmVkaXJlY3RzKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRTZWdtZW50QWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgICAgICBpbmplY3RvciwgcmF3U2VnbWVudCwgcm91dGVzLCByb3V0ZSwgc2VnbWVudHMsIG91dGxldCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vTWF0Y2gocmF3U2VnbWVudCk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFNlZ21lbnRBZ2FpbnN0Um91dGVVc2luZ1JlZGlyZWN0KFxuICAgICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZXM6IFJvdXRlW10sIHJvdXRlOiBSb3V0ZSxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgICBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD58Tm9MZWZ0b3ZlcnNJblVybD4ge1xuICAgIGNvbnN0IHtcbiAgICAgIG1hdGNoZWQsXG4gICAgICBjb25zdW1lZFNlZ21lbnRzLFxuICAgICAgcG9zaXRpb25hbFBhcmFtU2VnbWVudHMsXG4gICAgICByZW1haW5pbmdTZWdtZW50cyxcbiAgICB9ID0gcm91dGUucGF0aCA9PT0gJyoqJyA/IGNyZWF0ZVdpbGRjYXJkTWF0Y2hSZXN1bHQoc2VnbWVudHMpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoKHNlZ21lbnRHcm91cCwgcm91dGUsIHNlZ21lbnRzKTtcbiAgICBpZiAoIW1hdGNoZWQpIHJldHVybiBub01hdGNoKHNlZ21lbnRHcm91cCk7XG5cbiAgICBjb25zdCBuZXdUcmVlID0gdGhpcy5hcHBseVJlZGlyZWN0cy5hcHBseVJlZGlyZWN0Q29tbWFuZHMoXG4gICAgICAgIGNvbnN1bWVkU2VnbWVudHMsIHJvdXRlLnJlZGlyZWN0VG8hLCBwb3NpdGlvbmFsUGFyYW1TZWdtZW50cyk7XG5cbiAgICByZXR1cm4gdGhpcy5hcHBseVJlZGlyZWN0cy5saW5lcmFsaXplU2VnbWVudHMocm91dGUsIG5ld1RyZWUpXG4gICAgICAgIC5waXBlKG1lcmdlTWFwKChuZXdTZWdtZW50czogVXJsU2VnbWVudFtdKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1NlZ21lbnQoXG4gICAgICAgICAgICAgIGluamVjdG9yLCByb3V0ZXMsIHNlZ21lbnRHcm91cCwgbmV3U2VnbWVudHMuY29uY2F0KHJlbWFpbmluZ1NlZ21lbnRzKSwgb3V0bGV0LCBmYWxzZSk7XG4gICAgICAgIH0pKTtcbiAgfVxuXG4gIG1hdGNoU2VnbWVudEFnYWluc3RSb3V0ZShcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByYXdTZWdtZW50OiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlOiBSb3V0ZSxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nKTogT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4ge1xuICAgIGxldCBtYXRjaFJlc3VsdDogT2JzZXJ2YWJsZTxNYXRjaFJlc3VsdD47XG5cbiAgICBpZiAocm91dGUucGF0aCA9PT0gJyoqJykge1xuICAgICAgbWF0Y2hSZXN1bHQgPSBvZihjcmVhdGVXaWxkY2FyZE1hdGNoUmVzdWx0KHNlZ21lbnRzKSk7XG4gICAgICAvLyBQcmlvciB2ZXJzaW9ucyBvZiB0aGUgcm91dGUgbWF0Y2hpbmcgYWxnb3JpdGhtIHdvdWxkIHN0b3AgbWF0Y2hpbmcgYXQgdGhlIHdpbGRjYXJkIHJvdXRlLlxuICAgICAgLy8gV2Ugc2hvdWxkIGludmVzdGlnYXRlIGEgYmV0dGVyIHN0cmF0ZWd5IGZvciBhbnkgZXhpc3RpbmcgY2hpbGRyZW4uIE90aGVyd2lzZSwgdGhlc2VcbiAgICAgIC8vIGNoaWxkIHNlZ21lbnRzIGFyZSBzaWxlbnRseSBkcm9wcGVkIGZyb20gdGhlIG5hdmlnYXRpb24uXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2lzc3Vlcy80MDA4OVxuICAgICAgcmF3U2VnbWVudC5jaGlsZHJlbiA9IHt9O1xuICAgIH0gZWxzZSB7XG4gICAgICBtYXRjaFJlc3VsdCA9IG1hdGNoV2l0aENoZWNrcyhyYXdTZWdtZW50LCByb3V0ZSwgc2VnbWVudHMsIGluamVjdG9yLCB0aGlzLnVybFNlcmlhbGl6ZXIpO1xuICAgIH1cblxuICAgIHJldHVybiBtYXRjaFJlc3VsdC5waXBlKHN3aXRjaE1hcCgocmVzdWx0KSA9PiB7XG4gICAgICBpZiAoIXJlc3VsdC5tYXRjaGVkKSB7XG4gICAgICAgIHJldHVybiBub01hdGNoKHJhd1NlZ21lbnQpO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGUgcm91dGUgaGFzIGFuIGluamVjdG9yIGNyZWF0ZWQgZnJvbSBwcm92aWRlcnMsIHdlIHNob3VsZCBzdGFydCB1c2luZyB0aGF0LlxuICAgICAgaW5qZWN0b3IgPSByb3V0ZS5faW5qZWN0b3IgPz8gaW5qZWN0b3I7XG4gICAgICByZXR1cm4gdGhpcy5nZXRDaGlsZENvbmZpZyhpbmplY3Rvciwgcm91dGUsIHNlZ21lbnRzKVxuICAgICAgICAgIC5waXBlKHN3aXRjaE1hcCgoe3JvdXRlczogY2hpbGRDb25maWd9KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjaGlsZEluamVjdG9yID0gcm91dGUuX2xvYWRlZEluamVjdG9yID8/IGluamVjdG9yO1xuXG4gICAgICAgICAgICBjb25zdCB7Y29uc3VtZWRTZWdtZW50cywgcmVtYWluaW5nU2VnbWVudHMsIHBhcmFtZXRlcnN9ID0gcmVzdWx0O1xuICAgICAgICAgICAgY29uc3Qgc25hcHNob3QgPSBuZXcgQWN0aXZhdGVkUm91dGVTbmFwc2hvdChcbiAgICAgICAgICAgICAgICBjb25zdW1lZFNlZ21lbnRzLCBwYXJhbWV0ZXJzLCBPYmplY3QuZnJlZXplKHsuLi50aGlzLnVybFRyZWUucXVlcnlQYXJhbXN9KSxcbiAgICAgICAgICAgICAgICB0aGlzLnVybFRyZWUuZnJhZ21lbnQsIGdldERhdGEocm91dGUpLCBnZXRPdXRsZXQocm91dGUpLFxuICAgICAgICAgICAgICAgIHJvdXRlLmNvbXBvbmVudCA/PyByb3V0ZS5fbG9hZGVkQ29tcG9uZW50ID8/IG51bGwsIHJvdXRlLCBnZXRSZXNvbHZlKHJvdXRlKSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHtzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzfSA9XG4gICAgICAgICAgICAgICAgc3BsaXQocmF3U2VnbWVudCwgY29uc3VtZWRTZWdtZW50cywgcmVtYWluaW5nU2VnbWVudHMsIGNoaWxkQ29uZmlnKTtcblxuICAgICAgICAgICAgaWYgKHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiBzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzQ2hpbGRyZW4oY2hpbGRJbmplY3RvciwgY2hpbGRDb25maWcsIHNlZ21lbnRHcm91cClcbiAgICAgICAgICAgICAgICAgIC5waXBlKG1hcChjaGlsZHJlbiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZHJlbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVHJlZU5vZGUoc25hcHNob3QsIGNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGNoaWxkQ29uZmlnLmxlbmd0aCA9PT0gMCAmJiBzbGljZWRTZWdtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9mKG5ldyBUcmVlTm9kZShzbmFwc2hvdCwgW10pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgbWF0Y2hlZE9uT3V0bGV0ID0gZ2V0T3V0bGV0KHJvdXRlKSA9PT0gb3V0bGV0O1xuICAgICAgICAgICAgLy8gSWYgd2UgbWF0Y2hlZCBhIGNvbmZpZyBkdWUgdG8gZW1wdHkgcGF0aCBtYXRjaCBvbiBhIGRpZmZlcmVudCBvdXRsZXQsIHdlIG5lZWQgdG9cbiAgICAgICAgICAgIC8vIGNvbnRpbnVlIHBhc3NpbmcgdGhlIGN1cnJlbnQgb3V0bGV0IGZvciB0aGUgc2VnbWVudCByYXRoZXIgdGhhbiBzd2l0Y2ggdG8gUFJJTUFSWS5cbiAgICAgICAgICAgIC8vIE5vdGUgdGhhdCB3ZSBzd2l0Y2ggdG8gcHJpbWFyeSB3aGVuIHdlIGhhdmUgYSBtYXRjaCBiZWNhdXNlIG91dGxldCBjb25maWdzIGxvb2sgbGlrZVxuICAgICAgICAgICAgLy8gdGhpczoge3BhdGg6ICdhJywgb3V0bGV0OiAnYScsIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAvLyAge3BhdGg6ICdiJywgY29tcG9uZW50OiBCfSxcbiAgICAgICAgICAgIC8vICB7cGF0aDogJ2MnLCBjb21wb25lbnQ6IEN9LFxuICAgICAgICAgICAgLy8gXX1cbiAgICAgICAgICAgIC8vIE5vdGljZSB0aGF0IHRoZSBjaGlsZHJlbiBvZiB0aGUgbmFtZWQgb3V0bGV0IGFyZSBjb25maWd1cmVkIHdpdGggdGhlIHByaW1hcnkgb3V0bGV0XG4gICAgICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICAgICAgICAgIC5wcm9jZXNzU2VnbWVudChcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRJbmplY3RvciwgY2hpbGRDb25maWcsIHNlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHMsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRPbk91dGxldCA/IFBSSU1BUllfT1VUTEVUIDogb3V0bGV0LCB0cnVlKVxuICAgICAgICAgICAgICAgIC5waXBlKG1hcChjaGlsZCA9PiB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFRyZWVOb2RlKHNuYXBzaG90LCBjaGlsZCBpbnN0YW5jZW9mIFRyZWVOb2RlID8gW2NoaWxkXSA6IFtdKTtcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgfSkpO1xuICAgIH0pKTtcbiAgfVxuICBwcml2YXRlIGdldENoaWxkQ29uZmlnKGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pOlxuICAgICAgT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWc+IHtcbiAgICBpZiAocm91dGUuY2hpbGRyZW4pIHtcbiAgICAgIC8vIFRoZSBjaGlsZHJlbiBiZWxvbmcgdG8gdGhlIHNhbWUgbW9kdWxlXG4gICAgICByZXR1cm4gb2Yoe3JvdXRlczogcm91dGUuY2hpbGRyZW4sIGluamVjdG9yfSk7XG4gICAgfVxuXG4gICAgaWYgKHJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgICAgLy8gbGF6eSBjaGlsZHJlbiBiZWxvbmcgdG8gdGhlIGxvYWRlZCBtb2R1bGVcbiAgICAgIGlmIChyb3V0ZS5fbG9hZGVkUm91dGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIG9mKHtyb3V0ZXM6IHJvdXRlLl9sb2FkZWRSb3V0ZXMsIGluamVjdG9yOiByb3V0ZS5fbG9hZGVkSW5qZWN0b3J9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJ1bkNhbkxvYWRHdWFyZHMoaW5qZWN0b3IsIHJvdXRlLCBzZWdtZW50cywgdGhpcy51cmxTZXJpYWxpemVyKVxuICAgICAgICAgIC5waXBlKG1lcmdlTWFwKChzaG91bGRMb2FkUmVzdWx0OiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgICBpZiAoc2hvdWxkTG9hZFJlc3VsdCkge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25maWdMb2FkZXIubG9hZENoaWxkcmVuKGluamVjdG9yLCByb3V0ZSlcbiAgICAgICAgICAgICAgICAgIC5waXBlKHRhcCgoY2ZnOiBMb2FkZWRSb3V0ZXJDb25maWcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUuX2xvYWRlZFJvdXRlcyA9IGNmZy5yb3V0ZXM7XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRJbmplY3RvciA9IGNmZy5pbmplY3RvcjtcbiAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjYW5Mb2FkRmFpbHMocm91dGUpO1xuICAgICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb2Yoe3JvdXRlczogW10sIGluamVjdG9yfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc29ydEFjdGl2YXRlZFJvdXRlU25hcHNob3RzKG5vZGVzOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PltdKTogdm9pZCB7XG4gIG5vZGVzLnNvcnQoKGEsIGIpID0+IHtcbiAgICBpZiAoYS52YWx1ZS5vdXRsZXQgPT09IFBSSU1BUllfT1VUTEVUKSByZXR1cm4gLTE7XG4gICAgaWYgKGIudmFsdWUub3V0bGV0ID09PSBQUklNQVJZX09VVExFVCkgcmV0dXJuIDE7XG4gICAgcmV0dXJuIGEudmFsdWUub3V0bGV0LmxvY2FsZUNvbXBhcmUoYi52YWx1ZS5vdXRsZXQpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gaGFzRW1wdHlQYXRoQ29uZmlnKG5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KSB7XG4gIGNvbnN0IGNvbmZpZyA9IG5vZGUudmFsdWUucm91dGVDb25maWc7XG4gIHJldHVybiBjb25maWcgJiYgY29uZmlnLnBhdGggPT09ICcnO1xufVxuXG4vKipcbiAqIEZpbmRzIGBUcmVlTm9kZWBzIHdpdGggbWF0Y2hpbmcgZW1wdHkgcGF0aCByb3V0ZSBjb25maWdzIGFuZCBtZXJnZXMgdGhlbSBpbnRvIGBUcmVlTm9kZWAgd2l0aFxuICogdGhlIGNoaWxkcmVuIGZyb20gZWFjaCBkdXBsaWNhdGUuIFRoaXMgaXMgbmVjZXNzYXJ5IGJlY2F1c2UgZGlmZmVyZW50IG91dGxldHMgY2FuIG1hdGNoIGFcbiAqIHNpbmdsZSBlbXB0eSBwYXRoIHJvdXRlIGNvbmZpZyBhbmQgdGhlIHJlc3VsdHMgbmVlZCB0byB0aGVuIGJlIG1lcmdlZC5cbiAqL1xuZnVuY3Rpb24gbWVyZ2VFbXB0eVBhdGhNYXRjaGVzKG5vZGVzOiBBcnJheTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4pOlxuICAgIEFycmF5PFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+PiB7XG4gIGNvbnN0IHJlc3VsdDogQXJyYXk8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4+ID0gW107XG4gIC8vIFRoZSBzZXQgb2Ygbm9kZXMgd2hpY2ggY29udGFpbiBjaGlsZHJlbiB0aGF0IHdlcmUgbWVyZ2VkIGZyb20gdHdvIGR1cGxpY2F0ZSBlbXB0eSBwYXRoIG5vZGVzLlxuICBjb25zdCBtZXJnZWROb2RlczogU2V0PFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+PiA9IG5ldyBTZXQoKTtcblxuICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICBpZiAoIWhhc0VtcHR5UGF0aENvbmZpZyhub2RlKSkge1xuICAgICAgcmVzdWx0LnB1c2gobm9kZSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBkdXBsaWNhdGVFbXB0eVBhdGhOb2RlID1cbiAgICAgICAgcmVzdWx0LmZpbmQocmVzdWx0Tm9kZSA9PiBub2RlLnZhbHVlLnJvdXRlQ29uZmlnID09PSByZXN1bHROb2RlLnZhbHVlLnJvdXRlQ29uZmlnKTtcbiAgICBpZiAoZHVwbGljYXRlRW1wdHlQYXRoTm9kZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBkdXBsaWNhdGVFbXB0eVBhdGhOb2RlLmNoaWxkcmVuLnB1c2goLi4ubm9kZS5jaGlsZHJlbik7XG4gICAgICBtZXJnZWROb2Rlcy5hZGQoZHVwbGljYXRlRW1wdHlQYXRoTm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdC5wdXNoKG5vZGUpO1xuICAgIH1cbiAgfVxuICAvLyBGb3IgZWFjaCBub2RlIHdoaWNoIGhhcyBjaGlsZHJlbiBmcm9tIG11bHRpcGxlIHNvdXJjZXMsIHdlIG5lZWQgdG8gcmVjb21wdXRlIGEgbmV3IGBUcmVlTm9kZWBcbiAgLy8gYnkgYWxzbyBtZXJnaW5nIHRob3NlIGNoaWxkcmVuLiBUaGlzIGlzIG5lY2Vzc2FyeSB3aGVuIHRoZXJlIGFyZSBtdWx0aXBsZSBlbXB0eSBwYXRoIGNvbmZpZ3NcbiAgLy8gaW4gYSByb3cuIFB1dCBhbm90aGVyIHdheTogd2hlbmV2ZXIgd2UgY29tYmluZSBjaGlsZHJlbiBvZiB0d28gbm9kZXMsIHdlIG5lZWQgdG8gYWxzbyBjaGVja1xuICAvLyBpZiBhbnkgb2YgdGhvc2UgY2hpbGRyZW4gY2FuIGJlIGNvbWJpbmVkIGludG8gYSBzaW5nbGUgbm9kZSBhcyB3ZWxsLlxuICBmb3IgKGNvbnN0IG1lcmdlZE5vZGUgb2YgbWVyZ2VkTm9kZXMpIHtcbiAgICBjb25zdCBtZXJnZWRDaGlsZHJlbiA9IG1lcmdlRW1wdHlQYXRoTWF0Y2hlcyhtZXJnZWROb2RlLmNoaWxkcmVuKTtcbiAgICByZXN1bHQucHVzaChuZXcgVHJlZU5vZGUobWVyZ2VkTm9kZS52YWx1ZSwgbWVyZ2VkQ2hpbGRyZW4pKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0LmZpbHRlcihuID0+ICFtZXJnZWROb2Rlcy5oYXMobikpO1xufVxuXG5mdW5jdGlvbiBjaGVja091dGxldE5hbWVVbmlxdWVuZXNzKG5vZGVzOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PltdKTogdm9pZCB7XG4gIGNvbnN0IG5hbWVzOiB7W2s6IHN0cmluZ106IEFjdGl2YXRlZFJvdXRlU25hcHNob3R9ID0ge307XG4gIG5vZGVzLmZvckVhY2gobiA9PiB7XG4gICAgY29uc3Qgcm91dGVXaXRoU2FtZU91dGxldE5hbWUgPSBuYW1lc1tuLnZhbHVlLm91dGxldF07XG4gICAgaWYgKHJvdXRlV2l0aFNhbWVPdXRsZXROYW1lKSB7XG4gICAgICBjb25zdCBwID0gcm91dGVXaXRoU2FtZU91dGxldE5hbWUudXJsLm1hcChzID0+IHMudG9TdHJpbmcoKSkuam9pbignLycpO1xuICAgICAgY29uc3QgYyA9IG4udmFsdWUudXJsLm1hcChzID0+IHMudG9TdHJpbmcoKSkuam9pbignLycpO1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLlRXT19TRUdNRU5UU19XSVRIX1NBTUVfT1VUTEVULFxuICAgICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmXG4gICAgICAgICAgICAgIGBUd28gc2VnbWVudHMgY2Fubm90IGhhdmUgdGhlIHNhbWUgb3V0bGV0IG5hbWU6ICcke3B9JyBhbmQgJyR7Y30nLmApO1xuICAgIH1cbiAgICBuYW1lc1tuLnZhbHVlLm91dGxldF0gPSBuLnZhbHVlO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0RGF0YShyb3V0ZTogUm91dGUpOiBEYXRhIHtcbiAgcmV0dXJuIHJvdXRlLmRhdGEgfHwge307XG59XG5cbmZ1bmN0aW9uIGdldFJlc29sdmUocm91dGU6IFJvdXRlKTogUmVzb2x2ZURhdGEge1xuICByZXR1cm4gcm91dGUucmVzb2x2ZSB8fCB7fTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlV2lsZGNhcmRNYXRjaFJlc3VsdChzZWdtZW50czogVXJsU2VnbWVudFtdKTogTWF0Y2hSZXN1bHQge1xuICByZXR1cm4ge1xuICAgIG1hdGNoZWQ6IHRydWUsXG4gICAgcGFyYW1ldGVyczogc2VnbWVudHMubGVuZ3RoID4gMCA/IGxhc3Qoc2VnbWVudHMpIS5wYXJhbWV0ZXJzIDoge30sXG4gICAgY29uc3VtZWRTZWdtZW50czogc2VnbWVudHMsXG4gICAgcmVtYWluaW5nU2VnbWVudHM6IFtdLFxuICAgIHBvc2l0aW9uYWxQYXJhbVNlZ21lbnRzOiB7fSxcbiAgfTtcbn1cbiJdfQ==