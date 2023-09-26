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
const MAX_ALLOWED_REDIRECTS = 31;
export class Recognizer {
    constructor(injector, configLoader, rootComponentType, config, urlTree, paramsInheritanceStrategy, urlSerializer) {
        this.injector = injector;
        this.configLoader = configLoader;
        this.rootComponentType = rootComponentType;
        this.config = config;
        this.urlTree = urlTree;
        this.paramsInheritanceStrategy = paramsInheritanceStrategy;
        this.urlSerializer = urlSerializer;
        this.applyRedirects = new ApplyRedirects(this.urlSerializer, this.urlTree);
        this.absoluteRedirectCount = 0;
        this.allowRedirects = true;
    }
    noMatchError(e) {
        return new RuntimeError(4002 /* RuntimeErrorCode.NO_MATCH */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
            `Cannot match any routes. URL Segment: '${e.segmentGroup}'`);
    }
    recognize() {
        const rootSegmentGroup = split(this.urlTree.root, [], [], this.config).segmentGroup;
        return this.match(rootSegmentGroup).pipe(map(children => {
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
    match(rootSegmentGroup) {
        const expanded$ = this.processSegmentGroup(this.injector, this.config, rootSegmentGroup, PRIMARY_OUTLET);
        return expanded$.pipe(catchError((e) => {
            if (e instanceof AbsoluteRedirect) {
                this.urlTree = e.urlTree;
                return this.match(e.urlTree.root);
            }
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
        if (this.allowRedirects && allowRedirects) {
            return this.expandSegmentAgainstRouteUsingRedirect(injector, rawSegment, routes, route, segments, outlet);
        }
        return noMatch(rawSegment);
    }
    expandSegmentAgainstRouteUsingRedirect(injector, segmentGroup, routes, route, segments, outlet) {
        const { matched, consumedSegments, positionalParamSegments, remainingSegments, } = route.path === '**' ? createWildcardMatchResult(segments) :
            match(segmentGroup, route, segments);
        if (!matched)
            return noMatch(segmentGroup);
        // TODO(atscott): Move all of this under an if(ngDevMode) as a breaking change and allow stack
        // size exceeded in production
        if (route.redirectTo.startsWith('/')) {
            this.absoluteRedirectCount++;
            if (this.absoluteRedirectCount > MAX_ALLOWED_REDIRECTS) {
                if (ngDevMode) {
                    throw new RuntimeError(4016 /* RuntimeErrorCode.INFINITE_REDIRECT */, `Detected possible infinite redirect when redirecting from '${this.urlTree}' to '${route.redirectTo}'.\n` +
                        `This is currently a dev mode only error but will become a` +
                        ` call stack size exceeded error in production in a future major version.`);
                }
                this.allowRedirects = false;
            }
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb2duaXplLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yZWNvZ25pemUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUE0QixhQUFhLElBQUksWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3ZGLE9BQU8sRUFBQyxJQUFJLEVBQWMsRUFBRSxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsSUFBSSxJQUFJLFFBQVEsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFbkksT0FBTyxFQUFDLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ25HLE9BQU8sRUFBQyx5QkFBeUIsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBRzVELE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBRTFELE9BQU8sRUFBQyxzQkFBc0IsRUFBRSwwQkFBMEIsRUFBNkIsbUJBQW1CLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUNsSSxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBRXhDLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUN4QyxPQUFPLEVBQUMsU0FBUyxFQUFFLHFCQUFxQixFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDaEUsT0FBTyxFQUFDLGdCQUFnQixFQUFFLEtBQUssRUFBZSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDdkgsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFN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LENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdkUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZELE1BQU0sSUFBSSxZQUFZLDREQUVsQixDQUFDLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTLENBQUM7Z0JBQzNDLG1EQUFtRCxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUM5RTtRQUNELEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDbEMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsU0FBUyxPQUFPLENBQUMsS0FBWTtJQUMzQixPQUFPLEtBQUssQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO0FBQzFCLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxLQUFZO0lBQzlCLE9BQU8sS0FBSyxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUM7QUFDN0IsQ0FBQztBQUVELFNBQVMseUJBQXlCLENBQUMsUUFBc0I7SUFDdkQsT0FBTztRQUNMLE9BQU8sRUFBRSxJQUFJO1FBQ2IsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ2pFLGdCQUFnQixFQUFFLFFBQVE7UUFDMUIsaUJBQWlCLEVBQUUsRUFBRTtRQUNyQix1QkFBdUIsRUFBRSxFQUFFO0tBQzVCLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RW52aXJvbm1lbnRJbmplY3RvciwgVHlwZSwgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ZnJvbSwgT2JzZXJ2YWJsZSwgb2Z9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjYXRjaEVycm9yLCBjb25jYXRNYXAsIGRlZmF1bHRJZkVtcHR5LCBmaXJzdCwgbGFzdCBhcyByeGpzTGFzdCwgbWFwLCBtZXJnZU1hcCwgc2Nhbiwgc3dpdGNoTWFwLCB0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtBYnNvbHV0ZVJlZGlyZWN0LCBBcHBseVJlZGlyZWN0cywgY2FuTG9hZEZhaWxzLCBub01hdGNoLCBOb01hdGNofSBmcm9tICcuL2FwcGx5X3JlZGlyZWN0cyc7XG5pbXBvcnQge2NyZWF0ZVVybFRyZWVGcm9tU25hcHNob3R9IGZyb20gJy4vY3JlYXRlX3VybF90cmVlJztcbmltcG9ydCB7UnVudGltZUVycm9yQ29kZX0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IHtEYXRhLCBMb2FkZWRSb3V0ZXJDb25maWcsIFJlc29sdmVEYXRhLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge3J1bkNhbkxvYWRHdWFyZHN9IGZyb20gJy4vb3BlcmF0b3JzL2NoZWNrX2d1YXJkcyc7XG5pbXBvcnQge1JvdXRlckNvbmZpZ0xvYWRlcn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIGluaGVyaXRlZFBhcmFtc0RhdGFSZXNvbHZlLCBQYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LCBSb3V0ZXJTdGF0ZVNuYXBzaG90fSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BSSU1BUllfT1VUTEVUfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge1VybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cCwgVXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge2xhc3R9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge2dldE91dGxldCwgc29ydEJ5TWF0Y2hpbmdPdXRsZXRzfSBmcm9tICcuL3V0aWxzL2NvbmZpZyc7XG5pbXBvcnQge2lzSW1tZWRpYXRlTWF0Y2gsIG1hdGNoLCBNYXRjaFJlc3VsdCwgbWF0Y2hXaXRoQ2hlY2tzLCBub0xlZnRvdmVyc0luVXJsLCBzcGxpdH0gZnJvbSAnLi91dGlscy9jb25maWdfbWF0Y2hpbmcnO1xuaW1wb3J0IHtUcmVlTm9kZX0gZnJvbSAnLi91dGlscy90cmVlJztcbmltcG9ydCB7aXNFbXB0eUVycm9yfSBmcm9tICcuL3V0aWxzL3R5cGVfZ3VhcmRzJztcblxuLyoqXG4gKiBDbGFzcyB1c2VkIHRvIGluZGljYXRlIHRoZXJlIHdlcmUgbm8gYWRkaXRpb25hbCByb3V0ZSBjb25maWcgbWF0Y2hlcyBidXQgdGhhdCBhbGwgc2VnbWVudHMgb2ZcbiAqIHRoZSBVUkwgd2VyZSBjb25zdW1lZCBkdXJpbmcgbWF0Y2hpbmcgc28gdGhlIHJvdXRlIHdhcyBVUkwgbWF0Y2hlZC4gV2hlbiB0aGlzIGhhcHBlbnMsIHdlIHN0aWxsXG4gKiB0cnkgdG8gbWF0Y2ggY2hpbGQgY29uZmlncyBpbiBjYXNlIHRoZXJlIGFyZSBlbXB0eSBwYXRoIGNoaWxkcmVuLlxuICovXG5jbGFzcyBOb0xlZnRvdmVyc0luVXJsIHt9XG5cbmV4cG9ydCBmdW5jdGlvbiByZWNvZ25pemUoXG4gICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIGNvbmZpZ0xvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyLFxuICAgIHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT58bnVsbCwgY29uZmlnOiBSb3V0ZXMsIHVybFRyZWU6IFVybFRyZWUsXG4gICAgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiBQYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5ID1cbiAgICAgICAgJ2VtcHR5T25seScpOiBPYnNlcnZhYmxlPHtzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCwgdHJlZTogVXJsVHJlZX0+IHtcbiAgcmV0dXJuIG5ldyBSZWNvZ25pemVyKFxuICAgICAgICAgICAgIGluamVjdG9yLCBjb25maWdMb2FkZXIsIHJvb3RDb21wb25lbnRUeXBlLCBjb25maWcsIHVybFRyZWUsIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3ksXG4gICAgICAgICAgICAgdXJsU2VyaWFsaXplcilcbiAgICAgIC5yZWNvZ25pemUoKTtcbn1cblxuY29uc3QgTUFYX0FMTE9XRURfUkVESVJFQ1RTID0gMzE7XG5cbmV4cG9ydCBjbGFzcyBSZWNvZ25pemVyIHtcbiAgcHJpdmF0ZSBhcHBseVJlZGlyZWN0cyA9IG5ldyBBcHBseVJlZGlyZWN0cyh0aGlzLnVybFNlcmlhbGl6ZXIsIHRoaXMudXJsVHJlZSk7XG4gIHByaXZhdGUgYWJzb2x1dGVSZWRpcmVjdENvdW50ID0gMDtcbiAgYWxsb3dSZWRpcmVjdHMgPSB0cnVlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvciwgcHJpdmF0ZSBjb25maWdMb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcixcbiAgICAgIHByaXZhdGUgcm9vdENvbXBvbmVudFR5cGU6IFR5cGU8YW55PnxudWxsLCBwcml2YXRlIGNvbmZpZzogUm91dGVzLCBwcml2YXRlIHVybFRyZWU6IFVybFRyZWUsXG4gICAgICBwcml2YXRlIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6IFBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3ksXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIpIHt9XG5cbiAgcHJpdmF0ZSBub01hdGNoRXJyb3IoZTogTm9NYXRjaCk6IGFueSB7XG4gICAgcmV0dXJuIG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuTk9fTUFUQ0gsXG4gICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmXG4gICAgICAgICAgICBgQ2Fubm90IG1hdGNoIGFueSByb3V0ZXMuIFVSTCBTZWdtZW50OiAnJHtlLnNlZ21lbnRHcm91cH0nYCk7XG4gIH1cblxuICByZWNvZ25pemUoKTogT2JzZXJ2YWJsZTx7c3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QsIHRyZWU6IFVybFRyZWV9PiB7XG4gICAgY29uc3Qgcm9vdFNlZ21lbnRHcm91cCA9IHNwbGl0KHRoaXMudXJsVHJlZS5yb290LCBbXSwgW10sIHRoaXMuY29uZmlnKS5zZWdtZW50R3JvdXA7XG5cbiAgICByZXR1cm4gdGhpcy5tYXRjaChyb290U2VnbWVudEdyb3VwKS5waXBlKG1hcChjaGlsZHJlbiA9PiB7XG4gICAgICAvLyBVc2UgT2JqZWN0LmZyZWV6ZSB0byBwcmV2ZW50IHJlYWRlcnMgb2YgdGhlIFJvdXRlciBzdGF0ZSBmcm9tIG1vZGlmeWluZyBpdCBvdXRzaWRlXG4gICAgICAvLyBvZiBhIG5hdmlnYXRpb24sIHJlc3VsdGluZyBpbiB0aGUgcm91dGVyIGJlaW5nIG91dCBvZiBzeW5jIHdpdGggdGhlIGJyb3dzZXIuXG4gICAgICBjb25zdCByb290ID0gbmV3IEFjdGl2YXRlZFJvdXRlU25hcHNob3QoXG4gICAgICAgICAgW10sIE9iamVjdC5mcmVlemUoe30pLCBPYmplY3QuZnJlZXplKHsuLi50aGlzLnVybFRyZWUucXVlcnlQYXJhbXN9KSxcbiAgICAgICAgICB0aGlzLnVybFRyZWUuZnJhZ21lbnQsIHt9LCBQUklNQVJZX09VVExFVCwgdGhpcy5yb290Q29tcG9uZW50VHlwZSwgbnVsbCwge30pO1xuXG4gICAgICBjb25zdCByb290Tm9kZSA9IG5ldyBUcmVlTm9kZShyb290LCBjaGlsZHJlbik7XG4gICAgICBjb25zdCByb3V0ZVN0YXRlID0gbmV3IFJvdXRlclN0YXRlU25hcHNob3QoJycsIHJvb3ROb2RlKTtcbiAgICAgIGNvbnN0IHRyZWUgPVxuICAgICAgICAgIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qocm9vdCwgW10sIHRoaXMudXJsVHJlZS5xdWVyeVBhcmFtcywgdGhpcy51cmxUcmVlLmZyYWdtZW50KTtcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzQ3MzA3XG4gICAgICAvLyBDcmVhdGluZyB0aGUgdHJlZSBzdHJpbmdpZmllcyB0aGUgcXVlcnkgcGFyYW1zXG4gICAgICAvLyBXZSBkb24ndCB3YW50IHRvIGRvIHRoaXMgaGVyZSBzbyByZWFzc2lnbiB0aGVtIHRvIHRoZSBvcmlnaW5hbC5cbiAgICAgIHRyZWUucXVlcnlQYXJhbXMgPSB0aGlzLnVybFRyZWUucXVlcnlQYXJhbXM7XG4gICAgICByb3V0ZVN0YXRlLnVybCA9IHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodHJlZSk7XG4gICAgICB0aGlzLmluaGVyaXRQYXJhbXNBbmREYXRhKHJvdXRlU3RhdGUuX3Jvb3QpO1xuICAgICAgcmV0dXJuIHtzdGF0ZTogcm91dGVTdGF0ZSwgdHJlZX07XG4gICAgfSkpO1xuICB9XG5cblxuICBwcml2YXRlIG1hdGNoKHJvb3RTZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6IE9ic2VydmFibGU8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXT4ge1xuICAgIGNvbnN0IGV4cGFuZGVkJCA9XG4gICAgICAgIHRoaXMucHJvY2Vzc1NlZ21lbnRHcm91cCh0aGlzLmluamVjdG9yLCB0aGlzLmNvbmZpZywgcm9vdFNlZ21lbnRHcm91cCwgUFJJTUFSWV9PVVRMRVQpO1xuICAgIHJldHVybiBleHBhbmRlZCQucGlwZShjYXRjaEVycm9yKChlOiBhbnkpID0+IHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgQWJzb2x1dGVSZWRpcmVjdCkge1xuICAgICAgICB0aGlzLnVybFRyZWUgPSBlLnVybFRyZWU7XG4gICAgICAgIHJldHVybiB0aGlzLm1hdGNoKGUudXJsVHJlZS5yb290KTtcbiAgICAgIH1cbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9NYXRjaCkge1xuICAgICAgICB0aHJvdyB0aGlzLm5vTWF0Y2hFcnJvcihlKTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgZTtcbiAgICB9KSk7XG4gIH1cblxuICBpbmhlcml0UGFyYW1zQW5kRGF0YShyb3V0ZU5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KTogdm9pZCB7XG4gICAgY29uc3Qgcm91dGUgPSByb3V0ZU5vZGUudmFsdWU7XG5cbiAgICBjb25zdCBpID0gaW5oZXJpdGVkUGFyYW1zRGF0YVJlc29sdmUocm91dGUsIHRoaXMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSk7XG4gICAgcm91dGUucGFyYW1zID0gT2JqZWN0LmZyZWV6ZShpLnBhcmFtcyk7XG4gICAgcm91dGUuZGF0YSA9IE9iamVjdC5mcmVlemUoaS5kYXRhKTtcblxuICAgIHJvdXRlTm9kZS5jaGlsZHJlbi5mb3JFYWNoKG4gPT4gdGhpcy5pbmhlcml0UGFyYW1zQW5kRGF0YShuKSk7XG4gIH1cblxuICBwcm9jZXNzU2VnbWVudEdyb3VwKFxuICAgICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIGNvbmZpZzogUm91dGVbXSwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsXG4gICAgICBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXT4ge1xuICAgIGlmIChzZWdtZW50R3JvdXAuc2VnbWVudHMubGVuZ3RoID09PSAwICYmIHNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5wcm9jZXNzQ2hpbGRyZW4oaW5qZWN0b3IsIGNvbmZpZywgc2VnbWVudEdyb3VwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5wcm9jZXNzU2VnbWVudChpbmplY3RvciwgY29uZmlnLCBzZWdtZW50R3JvdXAsIHNlZ21lbnRHcm91cC5zZWdtZW50cywgb3V0bGV0LCB0cnVlKVxuICAgICAgICAucGlwZShtYXAoY2hpbGQgPT4gY2hpbGQgaW5zdGFuY2VvZiBUcmVlTm9kZSA/IFtjaGlsZF0gOiBbXSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIE1hdGNoZXMgZXZlcnkgY2hpbGQgb3V0bGV0IGluIHRoZSBgc2VnbWVudEdyb3VwYCB0byBhIGBSb3V0ZWAgaW4gdGhlIGNvbmZpZy4gUmV0dXJucyBgbnVsbGAgaWZcbiAgICogd2UgY2Fubm90IGZpbmQgYSBtYXRjaCBmb3IgX2FueV8gb2YgdGhlIGNoaWxkcmVuLlxuICAgKlxuICAgKiBAcGFyYW0gY29uZmlnIC0gVGhlIGBSb3V0ZXNgIHRvIG1hdGNoIGFnYWluc3RcbiAgICogQHBhcmFtIHNlZ21lbnRHcm91cCAtIFRoZSBgVXJsU2VnbWVudEdyb3VwYCB3aG9zZSBjaGlsZHJlbiBuZWVkIHRvIGJlIG1hdGNoZWQgYWdhaW5zdCB0aGVcbiAgICogICAgIGNvbmZpZy5cbiAgICovXG4gIHByb2Nlc3NDaGlsZHJlbihpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvciwgY29uZmlnOiBSb3V0ZVtdLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6XG4gICAgICBPYnNlcnZhYmxlPFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10+IHtcbiAgICAvLyBFeHBhbmQgb3V0bGV0cyBvbmUgYXQgYSB0aW1lLCBzdGFydGluZyB3aXRoIHRoZSBwcmltYXJ5IG91dGxldC4gV2UgbmVlZCB0byBkbyBpdCB0aGlzIHdheVxuICAgIC8vIGJlY2F1c2UgYW4gYWJzb2x1dGUgcmVkaXJlY3QgZnJvbSB0aGUgcHJpbWFyeSBvdXRsZXQgdGFrZXMgcHJlY2VkZW5jZS5cbiAgICBjb25zdCBjaGlsZE91dGxldHM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBPYmplY3Qua2V5cyhzZWdtZW50R3JvdXAuY2hpbGRyZW4pKSB7XG4gICAgICBpZiAoY2hpbGQgPT09ICdwcmltYXJ5Jykge1xuICAgICAgICBjaGlsZE91dGxldHMudW5zaGlmdChjaGlsZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGlsZE91dGxldHMucHVzaChjaGlsZCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmcm9tKGNoaWxkT3V0bGV0cylcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICBjb25jYXRNYXAoY2hpbGRPdXRsZXQgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBjaGlsZCA9IHNlZ21lbnRHcm91cC5jaGlsZHJlbltjaGlsZE91dGxldF07XG4gICAgICAgICAgICAgIC8vIFNvcnQgdGhlIGNvbmZpZyBzbyB0aGF0IHJvdXRlcyB3aXRoIG91dGxldHMgdGhhdCBtYXRjaCB0aGUgb25lIGJlaW5nIGFjdGl2YXRlZFxuICAgICAgICAgICAgICAvLyBhcHBlYXIgZmlyc3QsIGZvbGxvd2VkIGJ5IHJvdXRlcyBmb3Igb3RoZXIgb3V0bGV0cywgd2hpY2ggbWlnaHQgbWF0Y2ggaWYgdGhleSBoYXZlXG4gICAgICAgICAgICAgIC8vIGFuIGVtcHR5IHBhdGguXG4gICAgICAgICAgICAgIGNvbnN0IHNvcnRlZENvbmZpZyA9IHNvcnRCeU1hdGNoaW5nT3V0bGV0cyhjb25maWcsIGNoaWxkT3V0bGV0KTtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1NlZ21lbnRHcm91cChpbmplY3Rvciwgc29ydGVkQ29uZmlnLCBjaGlsZCwgY2hpbGRPdXRsZXQpO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBzY2FuKChjaGlsZHJlbiwgb3V0bGV0Q2hpbGRyZW4pID0+IHtcbiAgICAgICAgICAgICAgY2hpbGRyZW4ucHVzaCguLi5vdXRsZXRDaGlsZHJlbik7XG4gICAgICAgICAgICAgIHJldHVybiBjaGlsZHJlbjtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgZGVmYXVsdElmRW1wdHkobnVsbCBhcyBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PltdIHwgbnVsbCksXG4gICAgICAgICAgICByeGpzTGFzdCgpLFxuICAgICAgICAgICAgbWVyZ2VNYXAoY2hpbGRyZW4gPT4ge1xuICAgICAgICAgICAgICBpZiAoY2hpbGRyZW4gPT09IG51bGwpIHJldHVybiBub01hdGNoKHNlZ21lbnRHcm91cCk7XG4gICAgICAgICAgICAgIC8vIEJlY2F1c2Ugd2UgbWF5IGhhdmUgbWF0Y2hlZCB0d28gb3V0bGV0cyB0byB0aGUgc2FtZSBlbXB0eSBwYXRoIHNlZ21lbnQsIHdlIGNhbiBoYXZlXG4gICAgICAgICAgICAgIC8vIG11bHRpcGxlIGFjdGl2YXRlZCByZXN1bHRzIGZvciB0aGUgc2FtZSBvdXRsZXQuIFdlIHNob3VsZCBtZXJnZSB0aGUgY2hpbGRyZW4gb2ZcbiAgICAgICAgICAgICAgLy8gdGhlc2UgcmVzdWx0cyBzbyB0aGUgZmluYWwgcmV0dXJuIHZhbHVlIGlzIG9ubHkgb25lIGBUcmVlTm9kZWAgcGVyIG91dGxldC5cbiAgICAgICAgICAgICAgY29uc3QgbWVyZ2VkQ2hpbGRyZW4gPSBtZXJnZUVtcHR5UGF0aE1hdGNoZXMoY2hpbGRyZW4pO1xuICAgICAgICAgICAgICBpZiAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhpcyBzaG91bGQgcmVhbGx5IG5ldmVyIGhhcHBlbiAtIHdlIGFyZSBvbmx5IHRha2luZyB0aGUgZmlyc3QgbWF0Y2ggZm9yIGVhY2hcbiAgICAgICAgICAgICAgICAvLyBvdXRsZXQgYW5kIG1lcmdlIHRoZSBlbXB0eSBwYXRoIG1hdGNoZXMuXG4gICAgICAgICAgICAgICAgY2hlY2tPdXRsZXROYW1lVW5pcXVlbmVzcyhtZXJnZWRDaGlsZHJlbik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgc29ydEFjdGl2YXRlZFJvdXRlU25hcHNob3RzKG1lcmdlZENoaWxkcmVuKTtcbiAgICAgICAgICAgICAgcmV0dXJuIG9mKG1lcmdlZENoaWxkcmVuKTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICApO1xuICB9XG5cbiAgcHJvY2Vzc1NlZ21lbnQoXG4gICAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvciwgcm91dGVzOiBSb3V0ZVtdLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nLFxuICAgICAgYWxsb3dSZWRpcmVjdHM6IGJvb2xlYW4pOiBPYnNlcnZhYmxlPFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+fE5vTGVmdG92ZXJzSW5Vcmw+IHtcbiAgICByZXR1cm4gZnJvbShyb3V0ZXMpLnBpcGUoXG4gICAgICAgIGNvbmNhdE1hcChyID0+IHtcbiAgICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICAgICAgICAucHJvY2Vzc1NlZ21lbnRBZ2FpbnN0Um91dGUoXG4gICAgICAgICAgICAgICAgICByLl9pbmplY3RvciA/PyBpbmplY3Rvciwgcm91dGVzLCByLCBzZWdtZW50R3JvdXAsIHNlZ21lbnRzLCBvdXRsZXQsXG4gICAgICAgICAgICAgICAgICBhbGxvd1JlZGlyZWN0cylcbiAgICAgICAgICAgICAgLnBpcGUoY2F0Y2hFcnJvcigoZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOb01hdGNoKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gb2YobnVsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSksXG4gICAgICAgIGZpcnN0KCh4KTogeCBpcyBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PnxOb0xlZnRvdmVyc0luVXJsID0+ICEheCksIGNhdGNoRXJyb3IoZSA9PiB7XG4gICAgICAgICAgaWYgKGlzRW1wdHlFcnJvcihlKSkge1xuICAgICAgICAgICAgaWYgKG5vTGVmdG92ZXJzSW5Vcmwoc2VnbWVudEdyb3VwLCBzZWdtZW50cywgb3V0bGV0KSkge1xuICAgICAgICAgICAgICByZXR1cm4gb2YobmV3IE5vTGVmdG92ZXJzSW5VcmwoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbm9NYXRjaChzZWdtZW50R3JvdXApO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9KSk7XG4gIH1cblxuICBwcm9jZXNzU2VnbWVudEFnYWluc3RSb3V0ZShcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZXM6IFJvdXRlW10sIHJvdXRlOiBSb3V0ZSwgcmF3U2VnbWVudDogVXJsU2VnbWVudEdyb3VwLFxuICAgICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgb3V0bGV0OiBzdHJpbmcsXG4gICAgICBhbGxvd1JlZGlyZWN0czogYm9vbGVhbik6IE9ic2VydmFibGU8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD58Tm9MZWZ0b3ZlcnNJblVybD4ge1xuICAgIGlmICghaXNJbW1lZGlhdGVNYXRjaChyb3V0ZSwgcmF3U2VnbWVudCwgc2VnbWVudHMsIG91dGxldCkpIHJldHVybiBub01hdGNoKHJhd1NlZ21lbnQpO1xuXG4gICAgaWYgKHJvdXRlLnJlZGlyZWN0VG8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRoaXMubWF0Y2hTZWdtZW50QWdhaW5zdFJvdXRlKGluamVjdG9yLCByYXdTZWdtZW50LCByb3V0ZSwgc2VnbWVudHMsIG91dGxldCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYWxsb3dSZWRpcmVjdHMgJiYgYWxsb3dSZWRpcmVjdHMpIHtcbiAgICAgIHJldHVybiB0aGlzLmV4cGFuZFNlZ21lbnRBZ2FpbnN0Um91dGVVc2luZ1JlZGlyZWN0KFxuICAgICAgICAgIGluamVjdG9yLCByYXdTZWdtZW50LCByb3V0ZXMsIHJvdXRlLCBzZWdtZW50cywgb3V0bGV0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm9NYXRjaChyYXdTZWdtZW50KTtcbiAgfVxuXG4gIHByaXZhdGUgZXhwYW5kU2VnbWVudEFnYWluc3RSb3V0ZVVzaW5nUmVkaXJlY3QoXG4gICAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvciwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlczogUm91dGVbXSwgcm91dGU6IFJvdXRlLFxuICAgICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICAgIG91dGxldDogc3RyaW5nKTogT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PnxOb0xlZnRvdmVyc0luVXJsPiB7XG4gICAgY29uc3Qge1xuICAgICAgbWF0Y2hlZCxcbiAgICAgIGNvbnN1bWVkU2VnbWVudHMsXG4gICAgICBwb3NpdGlvbmFsUGFyYW1TZWdtZW50cyxcbiAgICAgIHJlbWFpbmluZ1NlZ21lbnRzLFxuICAgIH0gPSByb3V0ZS5wYXRoID09PSAnKionID8gY3JlYXRlV2lsZGNhcmRNYXRjaFJlc3VsdChzZWdtZW50cykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2goc2VnbWVudEdyb3VwLCByb3V0ZSwgc2VnbWVudHMpO1xuICAgIGlmICghbWF0Y2hlZCkgcmV0dXJuIG5vTWF0Y2goc2VnbWVudEdyb3VwKTtcblxuICAgIC8vIFRPRE8oYXRzY290dCk6IE1vdmUgYWxsIG9mIHRoaXMgdW5kZXIgYW4gaWYobmdEZXZNb2RlKSBhcyBhIGJyZWFraW5nIGNoYW5nZSBhbmQgYWxsb3cgc3RhY2tcbiAgICAvLyBzaXplIGV4Y2VlZGVkIGluIHByb2R1Y3Rpb25cbiAgICBpZiAocm91dGUucmVkaXJlY3RUbyEuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICB0aGlzLmFic29sdXRlUmVkaXJlY3RDb3VudCsrO1xuICAgICAgaWYgKHRoaXMuYWJzb2x1dGVSZWRpcmVjdENvdW50ID4gTUFYX0FMTE9XRURfUkVESVJFQ1RTKSB7XG4gICAgICAgIGlmIChuZ0Rldk1vZGUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLklORklOSVRFX1JFRElSRUNULFxuICAgICAgICAgICAgICBgRGV0ZWN0ZWQgcG9zc2libGUgaW5maW5pdGUgcmVkaXJlY3Qgd2hlbiByZWRpcmVjdGluZyBmcm9tICcke3RoaXMudXJsVHJlZX0nIHRvICcke1xuICAgICAgICAgICAgICAgICAgcm91dGUucmVkaXJlY3RUb30nLlxcbmAgK1xuICAgICAgICAgICAgICAgICAgYFRoaXMgaXMgY3VycmVudGx5IGEgZGV2IG1vZGUgb25seSBlcnJvciBidXQgd2lsbCBiZWNvbWUgYWAgK1xuICAgICAgICAgICAgICAgICAgYCBjYWxsIHN0YWNrIHNpemUgZXhjZWVkZWQgZXJyb3IgaW4gcHJvZHVjdGlvbiBpbiBhIGZ1dHVyZSBtYWpvciB2ZXJzaW9uLmApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYWxsb3dSZWRpcmVjdHMgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgbmV3VHJlZSA9IHRoaXMuYXBwbHlSZWRpcmVjdHMuYXBwbHlSZWRpcmVjdENvbW1hbmRzKFxuICAgICAgICBjb25zdW1lZFNlZ21lbnRzLCByb3V0ZS5yZWRpcmVjdFRvISwgcG9zaXRpb25hbFBhcmFtU2VnbWVudHMpO1xuXG4gICAgcmV0dXJuIHRoaXMuYXBwbHlSZWRpcmVjdHMubGluZXJhbGl6ZVNlZ21lbnRzKHJvdXRlLCBuZXdUcmVlKVxuICAgICAgICAucGlwZShtZXJnZU1hcCgobmV3U2VnbWVudHM6IFVybFNlZ21lbnRbXSkgPT4ge1xuICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NTZWdtZW50KFxuICAgICAgICAgICAgICBpbmplY3Rvciwgcm91dGVzLCBzZWdtZW50R3JvdXAsIG5ld1NlZ21lbnRzLmNvbmNhdChyZW1haW5pbmdTZWdtZW50cyksIG91dGxldCwgZmFsc2UpO1xuICAgICAgICB9KSk7XG4gIH1cblxuICBtYXRjaFNlZ21lbnRBZ2FpbnN0Um91dGUoXG4gICAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvciwgcmF3U2VnbWVudDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZTogUm91dGUsXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4+IHtcbiAgICBsZXQgbWF0Y2hSZXN1bHQ6IE9ic2VydmFibGU8TWF0Y2hSZXN1bHQ+O1xuXG4gICAgaWYgKHJvdXRlLnBhdGggPT09ICcqKicpIHtcbiAgICAgIG1hdGNoUmVzdWx0ID0gb2YoY3JlYXRlV2lsZGNhcmRNYXRjaFJlc3VsdChzZWdtZW50cykpO1xuICAgICAgLy8gUHJpb3IgdmVyc2lvbnMgb2YgdGhlIHJvdXRlIG1hdGNoaW5nIGFsZ29yaXRobSB3b3VsZCBzdG9wIG1hdGNoaW5nIGF0IHRoZSB3aWxkY2FyZCByb3V0ZS5cbiAgICAgIC8vIFdlIHNob3VsZCBpbnZlc3RpZ2F0ZSBhIGJldHRlciBzdHJhdGVneSBmb3IgYW55IGV4aXN0aW5nIGNoaWxkcmVuLiBPdGhlcndpc2UsIHRoZXNlXG4gICAgICAvLyBjaGlsZCBzZWdtZW50cyBhcmUgc2lsZW50bHkgZHJvcHBlZCBmcm9tIHRoZSBuYXZpZ2F0aW9uLlxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9pc3N1ZXMvNDAwODlcbiAgICAgIHJhd1NlZ21lbnQuY2hpbGRyZW4gPSB7fTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWF0Y2hSZXN1bHQgPSBtYXRjaFdpdGhDaGVja3MocmF3U2VnbWVudCwgcm91dGUsIHNlZ21lbnRzLCBpbmplY3RvciwgdGhpcy51cmxTZXJpYWxpemVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbWF0Y2hSZXN1bHQucGlwZShzd2l0Y2hNYXAoKHJlc3VsdCkgPT4ge1xuICAgICAgaWYgKCFyZXN1bHQubWF0Y2hlZCkge1xuICAgICAgICByZXR1cm4gbm9NYXRjaChyYXdTZWdtZW50KTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhlIHJvdXRlIGhhcyBhbiBpbmplY3RvciBjcmVhdGVkIGZyb20gcHJvdmlkZXJzLCB3ZSBzaG91bGQgc3RhcnQgdXNpbmcgdGhhdC5cbiAgICAgIGluamVjdG9yID0gcm91dGUuX2luamVjdG9yID8/IGluamVjdG9yO1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0Q2hpbGRDb25maWcoaW5qZWN0b3IsIHJvdXRlLCBzZWdtZW50cylcbiAgICAgICAgICAucGlwZShzd2l0Y2hNYXAoKHtyb3V0ZXM6IGNoaWxkQ29uZmlnfSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2hpbGRJbmplY3RvciA9IHJvdXRlLl9sb2FkZWRJbmplY3RvciA/PyBpbmplY3RvcjtcblxuICAgICAgICAgICAgY29uc3Qge2NvbnN1bWVkU2VnbWVudHMsIHJlbWFpbmluZ1NlZ21lbnRzLCBwYXJhbWV0ZXJzfSA9IHJlc3VsdDtcbiAgICAgICAgICAgIGNvbnN0IHNuYXBzaG90ID0gbmV3IEFjdGl2YXRlZFJvdXRlU25hcHNob3QoXG4gICAgICAgICAgICAgICAgY29uc3VtZWRTZWdtZW50cywgcGFyYW1ldGVycywgT2JqZWN0LmZyZWV6ZSh7Li4udGhpcy51cmxUcmVlLnF1ZXJ5UGFyYW1zfSksXG4gICAgICAgICAgICAgICAgdGhpcy51cmxUcmVlLmZyYWdtZW50LCBnZXREYXRhKHJvdXRlKSwgZ2V0T3V0bGV0KHJvdXRlKSxcbiAgICAgICAgICAgICAgICByb3V0ZS5jb21wb25lbnQgPz8gcm91dGUuX2xvYWRlZENvbXBvbmVudCA/PyBudWxsLCByb3V0ZSwgZ2V0UmVzb2x2ZShyb3V0ZSkpO1xuXG4gICAgICAgICAgICBjb25zdCB7c2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50c30gPVxuICAgICAgICAgICAgICAgIHNwbGl0KHJhd1NlZ21lbnQsIGNvbnN1bWVkU2VnbWVudHMsIHJlbWFpbmluZ1NlZ21lbnRzLCBjaGlsZENvbmZpZyk7XG5cbiAgICAgICAgICAgIGlmIChzbGljZWRTZWdtZW50cy5sZW5ndGggPT09IDAgJiYgc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc0NoaWxkcmVuKGNoaWxkSW5qZWN0b3IsIGNoaWxkQ29uZmlnLCBzZWdtZW50R3JvdXApXG4gICAgICAgICAgICAgICAgICAucGlwZShtYXAoY2hpbGRyZW4gPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2hpbGRyZW4gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFRyZWVOb2RlKHNuYXBzaG90LCBjaGlsZHJlbik7XG4gICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjaGlsZENvbmZpZy5sZW5ndGggPT09IDAgJiYgc2xpY2VkU2VnbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvZihuZXcgVHJlZU5vZGUoc25hcHNob3QsIFtdKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG1hdGNoZWRPbk91dGxldCA9IGdldE91dGxldChyb3V0ZSkgPT09IG91dGxldDtcbiAgICAgICAgICAgIC8vIElmIHdlIG1hdGNoZWQgYSBjb25maWcgZHVlIHRvIGVtcHR5IHBhdGggbWF0Y2ggb24gYSBkaWZmZXJlbnQgb3V0bGV0LCB3ZSBuZWVkIHRvXG4gICAgICAgICAgICAvLyBjb250aW51ZSBwYXNzaW5nIHRoZSBjdXJyZW50IG91dGxldCBmb3IgdGhlIHNlZ21lbnQgcmF0aGVyIHRoYW4gc3dpdGNoIHRvIFBSSU1BUlkuXG4gICAgICAgICAgICAvLyBOb3RlIHRoYXQgd2Ugc3dpdGNoIHRvIHByaW1hcnkgd2hlbiB3ZSBoYXZlIGEgbWF0Y2ggYmVjYXVzZSBvdXRsZXQgY29uZmlncyBsb29rIGxpa2VcbiAgICAgICAgICAgIC8vIHRoaXM6IHtwYXRoOiAnYScsIG91dGxldDogJ2EnLCBjaGlsZHJlbjogW1xuICAgICAgICAgICAgLy8gIHtwYXRoOiAnYicsIGNvbXBvbmVudDogQn0sXG4gICAgICAgICAgICAvLyAge3BhdGg6ICdjJywgY29tcG9uZW50OiBDfSxcbiAgICAgICAgICAgIC8vIF19XG4gICAgICAgICAgICAvLyBOb3RpY2UgdGhhdCB0aGUgY2hpbGRyZW4gb2YgdGhlIG5hbWVkIG91dGxldCBhcmUgY29uZmlndXJlZCB3aXRoIHRoZSBwcmltYXJ5IG91dGxldFxuICAgICAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgICAgICAgICAucHJvY2Vzc1NlZ21lbnQoXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkSW5qZWN0b3IsIGNoaWxkQ29uZmlnLCBzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzLFxuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkT25PdXRsZXQgPyBQUklNQVJZX09VVExFVCA6IG91dGxldCwgdHJ1ZSlcbiAgICAgICAgICAgICAgICAucGlwZShtYXAoY2hpbGQgPT4ge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBUcmVlTm9kZShzbmFwc2hvdCwgY2hpbGQgaW5zdGFuY2VvZiBUcmVlTm9kZSA/IFtjaGlsZF0gOiBbXSk7XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgIH0pKTtcbiAgICB9KSk7XG4gIH1cbiAgcHJpdmF0ZSBnZXRDaGlsZENvbmZpZyhpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvciwgcm91dGU6IFJvdXRlLCBzZWdtZW50czogVXJsU2VnbWVudFtdKTpcbiAgICAgIE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPiB7XG4gICAgaWYgKHJvdXRlLmNoaWxkcmVuKSB7XG4gICAgICAvLyBUaGUgY2hpbGRyZW4gYmVsb25nIHRvIHRoZSBzYW1lIG1vZHVsZVxuICAgICAgcmV0dXJuIG9mKHtyb3V0ZXM6IHJvdXRlLmNoaWxkcmVuLCBpbmplY3Rvcn0pO1xuICAgIH1cblxuICAgIGlmIChyb3V0ZS5sb2FkQ2hpbGRyZW4pIHtcbiAgICAgIC8vIGxhenkgY2hpbGRyZW4gYmVsb25nIHRvIHRoZSBsb2FkZWQgbW9kdWxlXG4gICAgICBpZiAocm91dGUuX2xvYWRlZFJvdXRlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBvZih7cm91dGVzOiByb3V0ZS5fbG9hZGVkUm91dGVzLCBpbmplY3Rvcjogcm91dGUuX2xvYWRlZEluamVjdG9yfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBydW5DYW5Mb2FkR3VhcmRzKGluamVjdG9yLCByb3V0ZSwgc2VnbWVudHMsIHRoaXMudXJsU2VyaWFsaXplcilcbiAgICAgICAgICAucGlwZShtZXJnZU1hcCgoc2hvdWxkTG9hZFJlc3VsdDogYm9vbGVhbikgPT4ge1xuICAgICAgICAgICAgaWYgKHNob3VsZExvYWRSZXN1bHQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnTG9hZGVyLmxvYWRDaGlsZHJlbihpbmplY3Rvciwgcm91dGUpXG4gICAgICAgICAgICAgICAgICAucGlwZSh0YXAoKGNmZzogTG9hZGVkUm91dGVyQ29uZmlnKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRSb3V0ZXMgPSBjZmcucm91dGVzO1xuICAgICAgICAgICAgICAgICAgICByb3V0ZS5fbG9hZGVkSW5qZWN0b3IgPSBjZmcuaW5qZWN0b3I7XG4gICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY2FuTG9hZEZhaWxzKHJvdXRlKTtcbiAgICAgICAgICB9KSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9mKHtyb3V0ZXM6IFtdLCBpbmplY3Rvcn0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNvcnRBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90cyhub2RlczogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXSk6IHZvaWQge1xuICBub2Rlcy5zb3J0KChhLCBiKSA9PiB7XG4gICAgaWYgKGEudmFsdWUub3V0bGV0ID09PSBQUklNQVJZX09VVExFVCkgcmV0dXJuIC0xO1xuICAgIGlmIChiLnZhbHVlLm91dGxldCA9PT0gUFJJTUFSWV9PVVRMRVQpIHJldHVybiAxO1xuICAgIHJldHVybiBhLnZhbHVlLm91dGxldC5sb2NhbGVDb21wYXJlKGIudmFsdWUub3V0bGV0KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGhhc0VtcHR5UGF0aENvbmZpZyhub2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pikge1xuICBjb25zdCBjb25maWcgPSBub2RlLnZhbHVlLnJvdXRlQ29uZmlnO1xuICByZXR1cm4gY29uZmlnICYmIGNvbmZpZy5wYXRoID09PSAnJztcbn1cblxuLyoqXG4gKiBGaW5kcyBgVHJlZU5vZGVgcyB3aXRoIG1hdGNoaW5nIGVtcHR5IHBhdGggcm91dGUgY29uZmlncyBhbmQgbWVyZ2VzIHRoZW0gaW50byBgVHJlZU5vZGVgIHdpdGhcbiAqIHRoZSBjaGlsZHJlbiBmcm9tIGVhY2ggZHVwbGljYXRlLiBUaGlzIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIGRpZmZlcmVudCBvdXRsZXRzIGNhbiBtYXRjaCBhXG4gKiBzaW5nbGUgZW1wdHkgcGF0aCByb3V0ZSBjb25maWcgYW5kIHRoZSByZXN1bHRzIG5lZWQgdG8gdGhlbiBiZSBtZXJnZWQuXG4gKi9cbmZ1bmN0aW9uIG1lcmdlRW1wdHlQYXRoTWF0Y2hlcyhub2RlczogQXJyYXk8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4+KTpcbiAgICBBcnJheTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4ge1xuICBjb25zdCByZXN1bHQ6IEFycmF5PFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+PiA9IFtdO1xuICAvLyBUaGUgc2V0IG9mIG5vZGVzIHdoaWNoIGNvbnRhaW4gY2hpbGRyZW4gdGhhdCB3ZXJlIG1lcmdlZCBmcm9tIHR3byBkdXBsaWNhdGUgZW1wdHkgcGF0aCBub2Rlcy5cbiAgY29uc3QgbWVyZ2VkTm9kZXM6IFNldDxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4gPSBuZXcgU2V0KCk7XG5cbiAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgaWYgKCFoYXNFbXB0eVBhdGhDb25maWcobm9kZSkpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG5vZGUpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgZHVwbGljYXRlRW1wdHlQYXRoTm9kZSA9XG4gICAgICAgIHJlc3VsdC5maW5kKHJlc3VsdE5vZGUgPT4gbm9kZS52YWx1ZS5yb3V0ZUNvbmZpZyA9PT0gcmVzdWx0Tm9kZS52YWx1ZS5yb3V0ZUNvbmZpZyk7XG4gICAgaWYgKGR1cGxpY2F0ZUVtcHR5UGF0aE5vZGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZHVwbGljYXRlRW1wdHlQYXRoTm9kZS5jaGlsZHJlbi5wdXNoKC4uLm5vZGUuY2hpbGRyZW4pO1xuICAgICAgbWVyZ2VkTm9kZXMuYWRkKGR1cGxpY2F0ZUVtcHR5UGF0aE5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQucHVzaChub2RlKTtcbiAgICB9XG4gIH1cbiAgLy8gRm9yIGVhY2ggbm9kZSB3aGljaCBoYXMgY2hpbGRyZW4gZnJvbSBtdWx0aXBsZSBzb3VyY2VzLCB3ZSBuZWVkIHRvIHJlY29tcHV0ZSBhIG5ldyBgVHJlZU5vZGVgXG4gIC8vIGJ5IGFsc28gbWVyZ2luZyB0aG9zZSBjaGlsZHJlbi4gVGhpcyBpcyBuZWNlc3Nhcnkgd2hlbiB0aGVyZSBhcmUgbXVsdGlwbGUgZW1wdHkgcGF0aCBjb25maWdzXG4gIC8vIGluIGEgcm93LiBQdXQgYW5vdGhlciB3YXk6IHdoZW5ldmVyIHdlIGNvbWJpbmUgY2hpbGRyZW4gb2YgdHdvIG5vZGVzLCB3ZSBuZWVkIHRvIGFsc28gY2hlY2tcbiAgLy8gaWYgYW55IG9mIHRob3NlIGNoaWxkcmVuIGNhbiBiZSBjb21iaW5lZCBpbnRvIGEgc2luZ2xlIG5vZGUgYXMgd2VsbC5cbiAgZm9yIChjb25zdCBtZXJnZWROb2RlIG9mIG1lcmdlZE5vZGVzKSB7XG4gICAgY29uc3QgbWVyZ2VkQ2hpbGRyZW4gPSBtZXJnZUVtcHR5UGF0aE1hdGNoZXMobWVyZ2VkTm9kZS5jaGlsZHJlbik7XG4gICAgcmVzdWx0LnB1c2gobmV3IFRyZWVOb2RlKG1lcmdlZE5vZGUudmFsdWUsIG1lcmdlZENoaWxkcmVuKSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdC5maWx0ZXIobiA9PiAhbWVyZ2VkTm9kZXMuaGFzKG4pKTtcbn1cblxuZnVuY3Rpb24gY2hlY2tPdXRsZXROYW1lVW5pcXVlbmVzcyhub2RlczogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXSk6IHZvaWQge1xuICBjb25zdCBuYW1lczoge1trOiBzdHJpbmddOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90fSA9IHt9O1xuICBub2Rlcy5mb3JFYWNoKG4gPT4ge1xuICAgIGNvbnN0IHJvdXRlV2l0aFNhbWVPdXRsZXROYW1lID0gbmFtZXNbbi52YWx1ZS5vdXRsZXRdO1xuICAgIGlmIChyb3V0ZVdpdGhTYW1lT3V0bGV0TmFtZSkge1xuICAgICAgY29uc3QgcCA9IHJvdXRlV2l0aFNhbWVPdXRsZXROYW1lLnVybC5tYXAocyA9PiBzLnRvU3RyaW5nKCkpLmpvaW4oJy8nKTtcbiAgICAgIGNvbnN0IGMgPSBuLnZhbHVlLnVybC5tYXAocyA9PiBzLnRvU3RyaW5nKCkpLmpvaW4oJy8nKTtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5UV09fU0VHTUVOVFNfV0lUSF9TQU1FX09VVExFVCxcbiAgICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICAgICAgICBgVHdvIHNlZ21lbnRzIGNhbm5vdCBoYXZlIHRoZSBzYW1lIG91dGxldCBuYW1lOiAnJHtwfScgYW5kICcke2N9Jy5gKTtcbiAgICB9XG4gICAgbmFtZXNbbi52YWx1ZS5vdXRsZXRdID0gbi52YWx1ZTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldERhdGEocm91dGU6IFJvdXRlKTogRGF0YSB7XG4gIHJldHVybiByb3V0ZS5kYXRhIHx8IHt9O1xufVxuXG5mdW5jdGlvbiBnZXRSZXNvbHZlKHJvdXRlOiBSb3V0ZSk6IFJlc29sdmVEYXRhIHtcbiAgcmV0dXJuIHJvdXRlLnJlc29sdmUgfHwge307XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVdpbGRjYXJkTWF0Y2hSZXN1bHQoc2VnbWVudHM6IFVybFNlZ21lbnRbXSk6IE1hdGNoUmVzdWx0IHtcbiAgcmV0dXJuIHtcbiAgICBtYXRjaGVkOiB0cnVlLFxuICAgIHBhcmFtZXRlcnM6IHNlZ21lbnRzLmxlbmd0aCA+IDAgPyBsYXN0KHNlZ21lbnRzKSEucGFyYW1ldGVycyA6IHt9LFxuICAgIGNvbnN1bWVkU2VnbWVudHM6IHNlZ21lbnRzLFxuICAgIHJlbWFpbmluZ1NlZ21lbnRzOiBbXSxcbiAgICBwb3NpdGlvbmFsUGFyYW1TZWdtZW50czoge30sXG4gIH07XG59XG4iXX0=