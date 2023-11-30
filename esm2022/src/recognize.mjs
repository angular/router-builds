/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ɵRuntimeError as RuntimeError } from '@angular/core';
import { from, of } from 'rxjs';
import { catchError, concatMap, defaultIfEmpty, first, last, map, mergeMap, scan, switchMap, tap } from 'rxjs/operators';
import { AbsoluteRedirect, ApplyRedirects, canLoadFails, noMatch, NoMatch } from './apply_redirects';
import { createUrlTreeFromSnapshot } from './create_url_tree';
import { runCanLoadGuards } from './operators/check_guards';
import { ActivatedRouteSnapshot, getInherited, RouterStateSnapshot } from './router_state';
import { PRIMARY_OUTLET } from './shared';
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
            this.inheritParamsAndData(routeState._root, null);
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
    inheritParamsAndData(routeNode, parent) {
        const route = routeNode.value;
        const i = getInherited(route, parent, this.paramsInheritanceStrategy);
        route.params = Object.freeze(i.params);
        route.data = Object.freeze(i.data);
        routeNode.children.forEach(n => this.inheritParamsAndData(n, route));
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
        }), defaultIfEmpty(null), last(), mergeMap(children => {
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
        const { matched, consumedSegments, positionalParamSegments, remainingSegments, } = match(segmentGroup, route, segments);
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
        const matchResult = matchWithChecks(rawSegment, route, segments, injector, this.urlSerializer);
        if (route.path === '**') {
            // Prior versions of the route matching algorithm would stop matching at the wildcard route.
            // We should investigate a better strategy for any existing children. Otherwise, these
            // child segments are silently dropped from the navigation.
            // https://github.com/angular/angular/issues/40089
            rawSegment.children = {};
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb2duaXplLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yZWNvZ25pemUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUE0QixhQUFhLElBQUksWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3ZGLE9BQU8sRUFBQyxJQUFJLEVBQWMsRUFBRSxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUV2SCxPQUFPLEVBQUMsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDbkcsT0FBTyxFQUFDLHlCQUF5QixFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFHNUQsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0sMEJBQTBCLENBQUM7QUFFMUQsT0FBTyxFQUFDLHNCQUFzQixFQUFFLFlBQVksRUFBNkIsbUJBQW1CLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUNwSCxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBRXhDLE9BQU8sRUFBQyxTQUFTLEVBQUUscUJBQXFCLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUNoRSxPQUFPLEVBQUMsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUMxRyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sY0FBYyxDQUFDO0FBQ3RDLE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztB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NERBRWxCLENBQUMsT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLFNBQVMsQ0FBQztnQkFDM0MsbURBQW1ELENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzlFO1FBQ0QsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUNsQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FBQyxLQUFZO0lBQzNCLE9BQU8sS0FBSyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7QUFDMUIsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLEtBQVk7SUFDOUIsT0FBTyxLQUFLLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQztBQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RW52aXJvbm1lbnRJbmplY3RvciwgVHlwZSwgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ZnJvbSwgT2JzZXJ2YWJsZSwgb2Z9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjYXRjaEVycm9yLCBjb25jYXRNYXAsIGRlZmF1bHRJZkVtcHR5LCBmaXJzdCwgbGFzdCwgbWFwLCBtZXJnZU1hcCwgc2Nhbiwgc3dpdGNoTWFwLCB0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtBYnNvbHV0ZVJlZGlyZWN0LCBBcHBseVJlZGlyZWN0cywgY2FuTG9hZEZhaWxzLCBub01hdGNoLCBOb01hdGNofSBmcm9tICcuL2FwcGx5X3JlZGlyZWN0cyc7XG5pbXBvcnQge2NyZWF0ZVVybFRyZWVGcm9tU25hcHNob3R9IGZyb20gJy4vY3JlYXRlX3VybF90cmVlJztcbmltcG9ydCB7UnVudGltZUVycm9yQ29kZX0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IHtEYXRhLCBMb2FkZWRSb3V0ZXJDb25maWcsIFJlc29sdmVEYXRhLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge3J1bkNhbkxvYWRHdWFyZHN9IGZyb20gJy4vb3BlcmF0b3JzL2NoZWNrX2d1YXJkcyc7XG5pbXBvcnQge1JvdXRlckNvbmZpZ0xvYWRlcn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIGdldEluaGVyaXRlZCwgUGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSwgUm91dGVyU3RhdGVTbmFwc2hvdH0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQUklNQVJZX09VVExFVH0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtVcmxTZWdtZW50LCBVcmxTZWdtZW50R3JvdXAsIFVybFNlcmlhbGl6ZXIsIFVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtnZXRPdXRsZXQsIHNvcnRCeU1hdGNoaW5nT3V0bGV0c30gZnJvbSAnLi91dGlscy9jb25maWcnO1xuaW1wb3J0IHtpc0ltbWVkaWF0ZU1hdGNoLCBtYXRjaCwgbWF0Y2hXaXRoQ2hlY2tzLCBub0xlZnRvdmVyc0luVXJsLCBzcGxpdH0gZnJvbSAnLi91dGlscy9jb25maWdfbWF0Y2hpbmcnO1xuaW1wb3J0IHtUcmVlTm9kZX0gZnJvbSAnLi91dGlscy90cmVlJztcbmltcG9ydCB7aXNFbXB0eUVycm9yfSBmcm9tICcuL3V0aWxzL3R5cGVfZ3VhcmRzJztcblxuLyoqXG4gKiBDbGFzcyB1c2VkIHRvIGluZGljYXRlIHRoZXJlIHdlcmUgbm8gYWRkaXRpb25hbCByb3V0ZSBjb25maWcgbWF0Y2hlcyBidXQgdGhhdCBhbGwgc2VnbWVudHMgb2ZcbiAqIHRoZSBVUkwgd2VyZSBjb25zdW1lZCBkdXJpbmcgbWF0Y2hpbmcgc28gdGhlIHJvdXRlIHdhcyBVUkwgbWF0Y2hlZC4gV2hlbiB0aGlzIGhhcHBlbnMsIHdlIHN0aWxsXG4gKiB0cnkgdG8gbWF0Y2ggY2hpbGQgY29uZmlncyBpbiBjYXNlIHRoZXJlIGFyZSBlbXB0eSBwYXRoIGNoaWxkcmVuLlxuICovXG5jbGFzcyBOb0xlZnRvdmVyc0luVXJsIHt9XG5cbmV4cG9ydCBmdW5jdGlvbiByZWNvZ25pemUoXG4gICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIGNvbmZpZ0xvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyLFxuICAgIHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT58bnVsbCwgY29uZmlnOiBSb3V0ZXMsIHVybFRyZWU6IFVybFRyZWUsXG4gICAgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiBQYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5ID1cbiAgICAgICAgJ2VtcHR5T25seScpOiBPYnNlcnZhYmxlPHtzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCwgdHJlZTogVXJsVHJlZX0+IHtcbiAgcmV0dXJuIG5ldyBSZWNvZ25pemVyKFxuICAgICAgICAgICAgIGluamVjdG9yLCBjb25maWdMb2FkZXIsIHJvb3RDb21wb25lbnRUeXBlLCBjb25maWcsIHVybFRyZWUsIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3ksXG4gICAgICAgICAgICAgdXJsU2VyaWFsaXplcilcbiAgICAgIC5yZWNvZ25pemUoKTtcbn1cblxuY29uc3QgTUFYX0FMTE9XRURfUkVESVJFQ1RTID0gMzE7XG5cbmV4cG9ydCBjbGFzcyBSZWNvZ25pemVyIHtcbiAgcHJpdmF0ZSBhcHBseVJlZGlyZWN0cyA9IG5ldyBBcHBseVJlZGlyZWN0cyh0aGlzLnVybFNlcmlhbGl6ZXIsIHRoaXMudXJsVHJlZSk7XG4gIHByaXZhdGUgYWJzb2x1dGVSZWRpcmVjdENvdW50ID0gMDtcbiAgYWxsb3dSZWRpcmVjdHMgPSB0cnVlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvciwgcHJpdmF0ZSBjb25maWdMb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcixcbiAgICAgIHByaXZhdGUgcm9vdENvbXBvbmVudFR5cGU6IFR5cGU8YW55PnxudWxsLCBwcml2YXRlIGNvbmZpZzogUm91dGVzLCBwcml2YXRlIHVybFRyZWU6IFVybFRyZWUsXG4gICAgICBwcml2YXRlIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6IFBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3ksXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIpIHt9XG5cbiAgcHJpdmF0ZSBub01hdGNoRXJyb3IoZTogTm9NYXRjaCk6IGFueSB7XG4gICAgcmV0dXJuIG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuTk9fTUFUQ0gsXG4gICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmXG4gICAgICAgICAgICBgQ2Fubm90IG1hdGNoIGFueSByb3V0ZXMuIFVSTCBTZWdtZW50OiAnJHtlLnNlZ21lbnRHcm91cH0nYCk7XG4gIH1cblxuICByZWNvZ25pemUoKTogT2JzZXJ2YWJsZTx7c3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QsIHRyZWU6IFVybFRyZWV9PiB7XG4gICAgY29uc3Qgcm9vdFNlZ21lbnRHcm91cCA9IHNwbGl0KHRoaXMudXJsVHJlZS5yb290LCBbXSwgW10sIHRoaXMuY29uZmlnKS5zZWdtZW50R3JvdXA7XG5cbiAgICByZXR1cm4gdGhpcy5tYXRjaChyb290U2VnbWVudEdyb3VwKS5waXBlKG1hcChjaGlsZHJlbiA9PiB7XG4gICAgICAvLyBVc2UgT2JqZWN0LmZyZWV6ZSB0byBwcmV2ZW50IHJlYWRlcnMgb2YgdGhlIFJvdXRlciBzdGF0ZSBmcm9tIG1vZGlmeWluZyBpdCBvdXRzaWRlXG4gICAgICAvLyBvZiBhIG5hdmlnYXRpb24sIHJlc3VsdGluZyBpbiB0aGUgcm91dGVyIGJlaW5nIG91dCBvZiBzeW5jIHdpdGggdGhlIGJyb3dzZXIuXG4gICAgICBjb25zdCByb290ID0gbmV3IEFjdGl2YXRlZFJvdXRlU25hcHNob3QoXG4gICAgICAgICAgW10sIE9iamVjdC5mcmVlemUoe30pLCBPYmplY3QuZnJlZXplKHsuLi50aGlzLnVybFRyZWUucXVlcnlQYXJhbXN9KSxcbiAgICAgICAgICB0aGlzLnVybFRyZWUuZnJhZ21lbnQsIHt9LCBQUklNQVJZX09VVExFVCwgdGhpcy5yb290Q29tcG9uZW50VHlwZSwgbnVsbCwge30pO1xuXG4gICAgICBjb25zdCByb290Tm9kZSA9IG5ldyBUcmVlTm9kZShyb290LCBjaGlsZHJlbik7XG4gICAgICBjb25zdCByb3V0ZVN0YXRlID0gbmV3IFJvdXRlclN0YXRlU25hcHNob3QoJycsIHJvb3ROb2RlKTtcbiAgICAgIGNvbnN0IHRyZWUgPVxuICAgICAgICAgIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qocm9vdCwgW10sIHRoaXMudXJsVHJlZS5xdWVyeVBhcmFtcywgdGhpcy51cmxUcmVlLmZyYWdtZW50KTtcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzQ3MzA3XG4gICAgICAvLyBDcmVhdGluZyB0aGUgdHJlZSBzdHJpbmdpZmllcyB0aGUgcXVlcnkgcGFyYW1zXG4gICAgICAvLyBXZSBkb24ndCB3YW50IHRvIGRvIHRoaXMgaGVyZSBzbyByZWFzc2lnbiB0aGVtIHRvIHRoZSBvcmlnaW5hbC5cbiAgICAgIHRyZWUucXVlcnlQYXJhbXMgPSB0aGlzLnVybFRyZWUucXVlcnlQYXJhbXM7XG4gICAgICByb3V0ZVN0YXRlLnVybCA9IHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodHJlZSk7XG4gICAgICB0aGlzLmluaGVyaXRQYXJhbXNBbmREYXRhKHJvdXRlU3RhdGUuX3Jvb3QsIG51bGwpO1xuICAgICAgcmV0dXJuIHtzdGF0ZTogcm91dGVTdGF0ZSwgdHJlZX07XG4gICAgfSkpO1xuICB9XG5cblxuICBwcml2YXRlIG1hdGNoKHJvb3RTZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6IE9ic2VydmFibGU8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXT4ge1xuICAgIGNvbnN0IGV4cGFuZGVkJCA9XG4gICAgICAgIHRoaXMucHJvY2Vzc1NlZ21lbnRHcm91cCh0aGlzLmluamVjdG9yLCB0aGlzLmNvbmZpZywgcm9vdFNlZ21lbnRHcm91cCwgUFJJTUFSWV9PVVRMRVQpO1xuICAgIHJldHVybiBleHBhbmRlZCQucGlwZShjYXRjaEVycm9yKChlOiBhbnkpID0+IHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgQWJzb2x1dGVSZWRpcmVjdCkge1xuICAgICAgICB0aGlzLnVybFRyZWUgPSBlLnVybFRyZWU7XG4gICAgICAgIHJldHVybiB0aGlzLm1hdGNoKGUudXJsVHJlZS5yb290KTtcbiAgICAgIH1cbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9NYXRjaCkge1xuICAgICAgICB0aHJvdyB0aGlzLm5vTWF0Y2hFcnJvcihlKTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgZTtcbiAgICB9KSk7XG4gIH1cblxuICBpbmhlcml0UGFyYW1zQW5kRGF0YShcbiAgICAgIHJvdXRlTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4sIHBhcmVudDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdHxudWxsKTogdm9pZCB7XG4gICAgY29uc3Qgcm91dGUgPSByb3V0ZU5vZGUudmFsdWU7XG4gICAgY29uc3QgaSA9IGdldEluaGVyaXRlZChyb3V0ZSwgcGFyZW50LCB0aGlzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kpO1xuXG4gICAgcm91dGUucGFyYW1zID0gT2JqZWN0LmZyZWV6ZShpLnBhcmFtcyk7XG4gICAgcm91dGUuZGF0YSA9IE9iamVjdC5mcmVlemUoaS5kYXRhKTtcblxuICAgIHJvdXRlTm9kZS5jaGlsZHJlbi5mb3JFYWNoKG4gPT4gdGhpcy5pbmhlcml0UGFyYW1zQW5kRGF0YShuLCByb3V0ZSkpO1xuICB9XG5cbiAgcHJvY2Vzc1NlZ21lbnRHcm91cChcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCBjb25maWc6IFJvdXRlW10sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLFxuICAgICAgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10+IHtcbiAgICBpZiAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiBzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc0NoaWxkcmVuKGluamVjdG9yLCBjb25maWcsIHNlZ21lbnRHcm91cCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucHJvY2Vzc1NlZ21lbnQoaW5qZWN0b3IsIGNvbmZpZywgc2VnbWVudEdyb3VwLCBzZWdtZW50R3JvdXAuc2VnbWVudHMsIG91dGxldCwgdHJ1ZSlcbiAgICAgICAgLnBpcGUobWFwKGNoaWxkID0+IGNoaWxkIGluc3RhbmNlb2YgVHJlZU5vZGUgPyBbY2hpbGRdIDogW10pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNYXRjaGVzIGV2ZXJ5IGNoaWxkIG91dGxldCBpbiB0aGUgYHNlZ21lbnRHcm91cGAgdG8gYSBgUm91dGVgIGluIHRoZSBjb25maWcuIFJldHVybnMgYG51bGxgIGlmXG4gICAqIHdlIGNhbm5vdCBmaW5kIGEgbWF0Y2ggZm9yIF9hbnlfIG9mIHRoZSBjaGlsZHJlbi5cbiAgICpcbiAgICogQHBhcmFtIGNvbmZpZyAtIFRoZSBgUm91dGVzYCB0byBtYXRjaCBhZ2FpbnN0XG4gICAqIEBwYXJhbSBzZWdtZW50R3JvdXAgLSBUaGUgYFVybFNlZ21lbnRHcm91cGAgd2hvc2UgY2hpbGRyZW4gbmVlZCB0byBiZSBtYXRjaGVkIGFnYWluc3QgdGhlXG4gICAqICAgICBjb25maWcuXG4gICAqL1xuICBwcm9jZXNzQ2hpbGRyZW4oaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIGNvbmZpZzogUm91dGVbXSwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXApOlxuICAgICAgT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PltdPiB7XG4gICAgLy8gRXhwYW5kIG91dGxldHMgb25lIGF0IGEgdGltZSwgc3RhcnRpbmcgd2l0aCB0aGUgcHJpbWFyeSBvdXRsZXQuIFdlIG5lZWQgdG8gZG8gaXQgdGhpcyB3YXlcbiAgICAvLyBiZWNhdXNlIGFuIGFic29sdXRlIHJlZGlyZWN0IGZyb20gdGhlIHByaW1hcnkgb3V0bGV0IHRha2VzIHByZWNlZGVuY2UuXG4gICAgY29uc3QgY2hpbGRPdXRsZXRzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgT2JqZWN0LmtleXMoc2VnbWVudEdyb3VwLmNoaWxkcmVuKSkge1xuICAgICAgaWYgKGNoaWxkID09PSAncHJpbWFyeScpIHtcbiAgICAgICAgY2hpbGRPdXRsZXRzLnVuc2hpZnQoY2hpbGQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hpbGRPdXRsZXRzLnB1c2goY2hpbGQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZnJvbShjaGlsZE91dGxldHMpXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgICAgY29uY2F0TWFwKGNoaWxkT3V0bGV0ID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgY2hpbGQgPSBzZWdtZW50R3JvdXAuY2hpbGRyZW5bY2hpbGRPdXRsZXRdO1xuICAgICAgICAgICAgICAvLyBTb3J0IHRoZSBjb25maWcgc28gdGhhdCByb3V0ZXMgd2l0aCBvdXRsZXRzIHRoYXQgbWF0Y2ggdGhlIG9uZSBiZWluZyBhY3RpdmF0ZWRcbiAgICAgICAgICAgICAgLy8gYXBwZWFyIGZpcnN0LCBmb2xsb3dlZCBieSByb3V0ZXMgZm9yIG90aGVyIG91dGxldHMsIHdoaWNoIG1pZ2h0IG1hdGNoIGlmIHRoZXkgaGF2ZVxuICAgICAgICAgICAgICAvLyBhbiBlbXB0eSBwYXRoLlxuICAgICAgICAgICAgICBjb25zdCBzb3J0ZWRDb25maWcgPSBzb3J0QnlNYXRjaGluZ091dGxldHMoY29uZmlnLCBjaGlsZE91dGxldCk7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NTZWdtZW50R3JvdXAoaW5qZWN0b3IsIHNvcnRlZENvbmZpZywgY2hpbGQsIGNoaWxkT3V0bGV0KTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgc2NhbigoY2hpbGRyZW4sIG91dGxldENoaWxkcmVuKSA9PiB7XG4gICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2goLi4ub3V0bGV0Q2hpbGRyZW4pO1xuICAgICAgICAgICAgICByZXR1cm4gY2hpbGRyZW47XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIGRlZmF1bHRJZkVtcHR5KG51bGwgYXMgVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXSB8IG51bGwpLFxuICAgICAgICAgICAgbGFzdCgpLFxuICAgICAgICAgICAgbWVyZ2VNYXAoY2hpbGRyZW4gPT4ge1xuICAgICAgICAgICAgICBpZiAoY2hpbGRyZW4gPT09IG51bGwpIHJldHVybiBub01hdGNoKHNlZ21lbnRHcm91cCk7XG4gICAgICAgICAgICAgIC8vIEJlY2F1c2Ugd2UgbWF5IGhhdmUgbWF0Y2hlZCB0d28gb3V0bGV0cyB0byB0aGUgc2FtZSBlbXB0eSBwYXRoIHNlZ21lbnQsIHdlIGNhbiBoYXZlXG4gICAgICAgICAgICAgIC8vIG11bHRpcGxlIGFjdGl2YXRlZCByZXN1bHRzIGZvciB0aGUgc2FtZSBvdXRsZXQuIFdlIHNob3VsZCBtZXJnZSB0aGUgY2hpbGRyZW4gb2ZcbiAgICAgICAgICAgICAgLy8gdGhlc2UgcmVzdWx0cyBzbyB0aGUgZmluYWwgcmV0dXJuIHZhbHVlIGlzIG9ubHkgb25lIGBUcmVlTm9kZWAgcGVyIG91dGxldC5cbiAgICAgICAgICAgICAgY29uc3QgbWVyZ2VkQ2hpbGRyZW4gPSBtZXJnZUVtcHR5UGF0aE1hdGNoZXMoY2hpbGRyZW4pO1xuICAgICAgICAgICAgICBpZiAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhpcyBzaG91bGQgcmVhbGx5IG5ldmVyIGhhcHBlbiAtIHdlIGFyZSBvbmx5IHRha2luZyB0aGUgZmlyc3QgbWF0Y2ggZm9yIGVhY2hcbiAgICAgICAgICAgICAgICAvLyBvdXRsZXQgYW5kIG1lcmdlIHRoZSBlbXB0eSBwYXRoIG1hdGNoZXMuXG4gICAgICAgICAgICAgICAgY2hlY2tPdXRsZXROYW1lVW5pcXVlbmVzcyhtZXJnZWRDaGlsZHJlbik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgc29ydEFjdGl2YXRlZFJvdXRlU25hcHNob3RzKG1lcmdlZENoaWxkcmVuKTtcbiAgICAgICAgICAgICAgcmV0dXJuIG9mKG1lcmdlZENoaWxkcmVuKTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICApO1xuICB9XG5cbiAgcHJvY2Vzc1NlZ21lbnQoXG4gICAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvciwgcm91dGVzOiBSb3V0ZVtdLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nLFxuICAgICAgYWxsb3dSZWRpcmVjdHM6IGJvb2xlYW4pOiBPYnNlcnZhYmxlPFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+fE5vTGVmdG92ZXJzSW5Vcmw+IHtcbiAgICByZXR1cm4gZnJvbShyb3V0ZXMpLnBpcGUoXG4gICAgICAgIGNvbmNhdE1hcChyID0+IHtcbiAgICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICAgICAgICAucHJvY2Vzc1NlZ21lbnRBZ2FpbnN0Um91dGUoXG4gICAgICAgICAgICAgICAgICByLl9pbmplY3RvciA/PyBpbmplY3Rvciwgcm91dGVzLCByLCBzZWdtZW50R3JvdXAsIHNlZ21lbnRzLCBvdXRsZXQsXG4gICAgICAgICAgICAgICAgICBhbGxvd1JlZGlyZWN0cylcbiAgICAgICAgICAgICAgLnBpcGUoY2F0Y2hFcnJvcigoZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOb01hdGNoKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gb2YobnVsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSksXG4gICAgICAgIGZpcnN0KCh4KTogeCBpcyBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PnxOb0xlZnRvdmVyc0luVXJsID0+ICEheCksIGNhdGNoRXJyb3IoZSA9PiB7XG4gICAgICAgICAgaWYgKGlzRW1wdHlFcnJvcihlKSkge1xuICAgICAgICAgICAgaWYgKG5vTGVmdG92ZXJzSW5Vcmwoc2VnbWVudEdyb3VwLCBzZWdtZW50cywgb3V0bGV0KSkge1xuICAgICAgICAgICAgICByZXR1cm4gb2YobmV3IE5vTGVmdG92ZXJzSW5VcmwoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbm9NYXRjaChzZWdtZW50R3JvdXApO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9KSk7XG4gIH1cblxuICBwcm9jZXNzU2VnbWVudEFnYWluc3RSb3V0ZShcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZXM6IFJvdXRlW10sIHJvdXRlOiBSb3V0ZSwgcmF3U2VnbWVudDogVXJsU2VnbWVudEdyb3VwLFxuICAgICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgb3V0bGV0OiBzdHJpbmcsXG4gICAgICBhbGxvd1JlZGlyZWN0czogYm9vbGVhbik6IE9ic2VydmFibGU8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD58Tm9MZWZ0b3ZlcnNJblVybD4ge1xuICAgIGlmICghaXNJbW1lZGlhdGVNYXRjaChyb3V0ZSwgcmF3U2VnbWVudCwgc2VnbWVudHMsIG91dGxldCkpIHJldHVybiBub01hdGNoKHJhd1NlZ21lbnQpO1xuXG4gICAgaWYgKHJvdXRlLnJlZGlyZWN0VG8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRoaXMubWF0Y2hTZWdtZW50QWdhaW5zdFJvdXRlKGluamVjdG9yLCByYXdTZWdtZW50LCByb3V0ZSwgc2VnbWVudHMsIG91dGxldCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYWxsb3dSZWRpcmVjdHMgJiYgYWxsb3dSZWRpcmVjdHMpIHtcbiAgICAgIHJldHVybiB0aGlzLmV4cGFuZFNlZ21lbnRBZ2FpbnN0Um91dGVVc2luZ1JlZGlyZWN0KFxuICAgICAgICAgIGluamVjdG9yLCByYXdTZWdtZW50LCByb3V0ZXMsIHJvdXRlLCBzZWdtZW50cywgb3V0bGV0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm9NYXRjaChyYXdTZWdtZW50KTtcbiAgfVxuXG4gIHByaXZhdGUgZXhwYW5kU2VnbWVudEFnYWluc3RSb3V0ZVVzaW5nUmVkaXJlY3QoXG4gICAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvciwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlczogUm91dGVbXSwgcm91dGU6IFJvdXRlLFxuICAgICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICAgIG91dGxldDogc3RyaW5nKTogT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PnxOb0xlZnRvdmVyc0luVXJsPiB7XG4gICAgY29uc3Qge1xuICAgICAgbWF0Y2hlZCxcbiAgICAgIGNvbnN1bWVkU2VnbWVudHMsXG4gICAgICBwb3NpdGlvbmFsUGFyYW1TZWdtZW50cyxcbiAgICAgIHJlbWFpbmluZ1NlZ21lbnRzLFxuICAgIH0gPSBtYXRjaChzZWdtZW50R3JvdXAsIHJvdXRlLCBzZWdtZW50cyk7XG4gICAgaWYgKCFtYXRjaGVkKSByZXR1cm4gbm9NYXRjaChzZWdtZW50R3JvdXApO1xuXG4gICAgLy8gVE9ETyhhdHNjb3R0KTogTW92ZSBhbGwgb2YgdGhpcyB1bmRlciBhbiBpZihuZ0Rldk1vZGUpIGFzIGEgYnJlYWtpbmcgY2hhbmdlIGFuZCBhbGxvdyBzdGFja1xuICAgIC8vIHNpemUgZXhjZWVkZWQgaW4gcHJvZHVjdGlvblxuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvIS5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAgIHRoaXMuYWJzb2x1dGVSZWRpcmVjdENvdW50Kys7XG4gICAgICBpZiAodGhpcy5hYnNvbHV0ZVJlZGlyZWN0Q291bnQgPiBNQVhfQUxMT1dFRF9SRURJUkVDVFMpIHtcbiAgICAgICAgaWYgKG5nRGV2TW9kZSkge1xuICAgICAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5GSU5JVEVfUkVESVJFQ1QsXG4gICAgICAgICAgICAgIGBEZXRlY3RlZCBwb3NzaWJsZSBpbmZpbml0ZSByZWRpcmVjdCB3aGVuIHJlZGlyZWN0aW5nIGZyb20gJyR7dGhpcy51cmxUcmVlfScgdG8gJyR7XG4gICAgICAgICAgICAgICAgICByb3V0ZS5yZWRpcmVjdFRvfScuXFxuYCArXG4gICAgICAgICAgICAgICAgICBgVGhpcyBpcyBjdXJyZW50bHkgYSBkZXYgbW9kZSBvbmx5IGVycm9yIGJ1dCB3aWxsIGJlY29tZSBhYCArXG4gICAgICAgICAgICAgICAgICBgIGNhbGwgc3RhY2sgc2l6ZSBleGNlZWRlZCBlcnJvciBpbiBwcm9kdWN0aW9uIGluIGEgZnV0dXJlIG1ham9yIHZlcnNpb24uYCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hbGxvd1JlZGlyZWN0cyA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBuZXdUcmVlID0gdGhpcy5hcHBseVJlZGlyZWN0cy5hcHBseVJlZGlyZWN0Q29tbWFuZHMoXG4gICAgICAgIGNvbnN1bWVkU2VnbWVudHMsIHJvdXRlLnJlZGlyZWN0VG8hLCBwb3NpdGlvbmFsUGFyYW1TZWdtZW50cyk7XG5cbiAgICByZXR1cm4gdGhpcy5hcHBseVJlZGlyZWN0cy5saW5lcmFsaXplU2VnbWVudHMocm91dGUsIG5ld1RyZWUpXG4gICAgICAgIC5waXBlKG1lcmdlTWFwKChuZXdTZWdtZW50czogVXJsU2VnbWVudFtdKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1NlZ21lbnQoXG4gICAgICAgICAgICAgIGluamVjdG9yLCByb3V0ZXMsIHNlZ21lbnRHcm91cCwgbmV3U2VnbWVudHMuY29uY2F0KHJlbWFpbmluZ1NlZ21lbnRzKSwgb3V0bGV0LCBmYWxzZSk7XG4gICAgICAgIH0pKTtcbiAgfVxuXG4gIG1hdGNoU2VnbWVudEFnYWluc3RSb3V0ZShcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByYXdTZWdtZW50OiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlOiBSb3V0ZSxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nKTogT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4ge1xuICAgIGNvbnN0IG1hdGNoUmVzdWx0ID0gbWF0Y2hXaXRoQ2hlY2tzKHJhd1NlZ21lbnQsIHJvdXRlLCBzZWdtZW50cywgaW5qZWN0b3IsIHRoaXMudXJsU2VyaWFsaXplcik7XG4gICAgaWYgKHJvdXRlLnBhdGggPT09ICcqKicpIHtcbiAgICAgIC8vIFByaW9yIHZlcnNpb25zIG9mIHRoZSByb3V0ZSBtYXRjaGluZyBhbGdvcml0aG0gd291bGQgc3RvcCBtYXRjaGluZyBhdCB0aGUgd2lsZGNhcmQgcm91dGUuXG4gICAgICAvLyBXZSBzaG91bGQgaW52ZXN0aWdhdGUgYSBiZXR0ZXIgc3RyYXRlZ3kgZm9yIGFueSBleGlzdGluZyBjaGlsZHJlbi4gT3RoZXJ3aXNlLCB0aGVzZVxuICAgICAgLy8gY2hpbGQgc2VnbWVudHMgYXJlIHNpbGVudGx5IGRyb3BwZWQgZnJvbSB0aGUgbmF2aWdhdGlvbi5cbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzQwMDg5XG4gICAgICByYXdTZWdtZW50LmNoaWxkcmVuID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hdGNoUmVzdWx0LnBpcGUoc3dpdGNoTWFwKChyZXN1bHQpID0+IHtcbiAgICAgIGlmICghcmVzdWx0Lm1hdGNoZWQpIHtcbiAgICAgICAgcmV0dXJuIG5vTWF0Y2gocmF3U2VnbWVudCk7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZSByb3V0ZSBoYXMgYW4gaW5qZWN0b3IgY3JlYXRlZCBmcm9tIHByb3ZpZGVycywgd2Ugc2hvdWxkIHN0YXJ0IHVzaW5nIHRoYXQuXG4gICAgICBpbmplY3RvciA9IHJvdXRlLl9pbmplY3RvciA/PyBpbmplY3RvcjtcbiAgICAgIHJldHVybiB0aGlzLmdldENoaWxkQ29uZmlnKGluamVjdG9yLCByb3V0ZSwgc2VnbWVudHMpXG4gICAgICAgICAgLnBpcGUoc3dpdGNoTWFwKCh7cm91dGVzOiBjaGlsZENvbmZpZ30pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNoaWxkSW5qZWN0b3IgPSByb3V0ZS5fbG9hZGVkSW5qZWN0b3IgPz8gaW5qZWN0b3I7XG5cbiAgICAgICAgICAgIGNvbnN0IHtjb25zdW1lZFNlZ21lbnRzLCByZW1haW5pbmdTZWdtZW50cywgcGFyYW1ldGVyc30gPSByZXN1bHQ7XG4gICAgICAgICAgICBjb25zdCBzbmFwc2hvdCA9IG5ldyBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KFxuICAgICAgICAgICAgICAgIGNvbnN1bWVkU2VnbWVudHMsIHBhcmFtZXRlcnMsIE9iamVjdC5mcmVlemUoey4uLnRoaXMudXJsVHJlZS5xdWVyeVBhcmFtc30pLFxuICAgICAgICAgICAgICAgIHRoaXMudXJsVHJlZS5mcmFnbWVudCwgZ2V0RGF0YShyb3V0ZSksIGdldE91dGxldChyb3V0ZSksXG4gICAgICAgICAgICAgICAgcm91dGUuY29tcG9uZW50ID8/IHJvdXRlLl9sb2FkZWRDb21wb25lbnQgPz8gbnVsbCwgcm91dGUsIGdldFJlc29sdmUocm91dGUpKTtcblxuICAgICAgICAgICAgY29uc3Qge3NlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHN9ID1cbiAgICAgICAgICAgICAgICBzcGxpdChyYXdTZWdtZW50LCBjb25zdW1lZFNlZ21lbnRzLCByZW1haW5pbmdTZWdtZW50cywgY2hpbGRDb25maWcpO1xuXG4gICAgICAgICAgICBpZiAoc2xpY2VkU2VnbWVudHMubGVuZ3RoID09PSAwICYmIHNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NDaGlsZHJlbihjaGlsZEluamVjdG9yLCBjaGlsZENvbmZpZywgc2VnbWVudEdyb3VwKVxuICAgICAgICAgICAgICAgICAgLnBpcGUobWFwKGNoaWxkcmVuID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkcmVuID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBUcmVlTm9kZShzbmFwc2hvdCwgY2hpbGRyZW4pO1xuICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY2hpbGRDb25maWcubGVuZ3RoID09PSAwICYmIHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICByZXR1cm4gb2YobmV3IFRyZWVOb2RlKHNuYXBzaG90LCBbXSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBtYXRjaGVkT25PdXRsZXQgPSBnZXRPdXRsZXQocm91dGUpID09PSBvdXRsZXQ7XG4gICAgICAgICAgICAvLyBJZiB3ZSBtYXRjaGVkIGEgY29uZmlnIGR1ZSB0byBlbXB0eSBwYXRoIG1hdGNoIG9uIGEgZGlmZmVyZW50IG91dGxldCwgd2UgbmVlZCB0b1xuICAgICAgICAgICAgLy8gY29udGludWUgcGFzc2luZyB0aGUgY3VycmVudCBvdXRsZXQgZm9yIHRoZSBzZWdtZW50IHJhdGhlciB0aGFuIHN3aXRjaCB0byBQUklNQVJZLlxuICAgICAgICAgICAgLy8gTm90ZSB0aGF0IHdlIHN3aXRjaCB0byBwcmltYXJ5IHdoZW4gd2UgaGF2ZSBhIG1hdGNoIGJlY2F1c2Ugb3V0bGV0IGNvbmZpZ3MgbG9vayBsaWtlXG4gICAgICAgICAgICAvLyB0aGlzOiB7cGF0aDogJ2EnLCBvdXRsZXQ6ICdhJywgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIC8vICB7cGF0aDogJ2InLCBjb21wb25lbnQ6IEJ9LFxuICAgICAgICAgICAgLy8gIHtwYXRoOiAnYycsIGNvbXBvbmVudDogQ30sXG4gICAgICAgICAgICAvLyBdfVxuICAgICAgICAgICAgLy8gTm90aWNlIHRoYXQgdGhlIGNoaWxkcmVuIG9mIHRoZSBuYW1lZCBvdXRsZXQgYXJlIGNvbmZpZ3VyZWQgd2l0aCB0aGUgcHJpbWFyeSBvdXRsZXRcbiAgICAgICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgICAgICAgICAgLnByb2Nlc3NTZWdtZW50KFxuICAgICAgICAgICAgICAgICAgICBjaGlsZEluamVjdG9yLCBjaGlsZENvbmZpZywgc2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50cyxcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZE9uT3V0bGV0ID8gUFJJTUFSWV9PVVRMRVQgOiBvdXRsZXQsIHRydWUpXG4gICAgICAgICAgICAgICAgLnBpcGUobWFwKGNoaWxkID0+IHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVHJlZU5vZGUoc25hcHNob3QsIGNoaWxkIGluc3RhbmNlb2YgVHJlZU5vZGUgPyBbY2hpbGRdIDogW10pO1xuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICB9KSk7XG4gICAgfSkpO1xuICB9XG4gIHByaXZhdGUgZ2V0Q2hpbGRDb25maWcoaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJvdXRlOiBSb3V0ZSwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSk6XG4gICAgICBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4ge1xuICAgIGlmIChyb3V0ZS5jaGlsZHJlbikge1xuICAgICAgLy8gVGhlIGNoaWxkcmVuIGJlbG9uZyB0byB0aGUgc2FtZSBtb2R1bGVcbiAgICAgIHJldHVybiBvZih7cm91dGVzOiByb3V0ZS5jaGlsZHJlbiwgaW5qZWN0b3J9KTtcbiAgICB9XG5cbiAgICBpZiAocm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgICAvLyBsYXp5IGNoaWxkcmVuIGJlbG9uZyB0byB0aGUgbG9hZGVkIG1vZHVsZVxuICAgICAgaWYgKHJvdXRlLl9sb2FkZWRSb3V0ZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gb2Yoe3JvdXRlczogcm91dGUuX2xvYWRlZFJvdXRlcywgaW5qZWN0b3I6IHJvdXRlLl9sb2FkZWRJbmplY3Rvcn0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcnVuQ2FuTG9hZEd1YXJkcyhpbmplY3Rvciwgcm91dGUsIHNlZ21lbnRzLCB0aGlzLnVybFNlcmlhbGl6ZXIpXG4gICAgICAgICAgLnBpcGUobWVyZ2VNYXAoKHNob3VsZExvYWRSZXN1bHQ6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgIGlmIChzaG91bGRMb2FkUmVzdWx0KSB7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmZpZ0xvYWRlci5sb2FkQ2hpbGRyZW4oaW5qZWN0b3IsIHJvdXRlKVxuICAgICAgICAgICAgICAgICAgLnBpcGUodGFwKChjZmc6IExvYWRlZFJvdXRlckNvbmZpZykgPT4ge1xuICAgICAgICAgICAgICAgICAgICByb3V0ZS5fbG9hZGVkUm91dGVzID0gY2ZnLnJvdXRlcztcbiAgICAgICAgICAgICAgICAgICAgcm91dGUuX2xvYWRlZEluamVjdG9yID0gY2ZnLmluamVjdG9yO1xuICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNhbkxvYWRGYWlscyhyb3V0ZSk7XG4gICAgICAgICAgfSkpO1xuICAgIH1cblxuICAgIHJldHVybiBvZih7cm91dGVzOiBbXSwgaW5qZWN0b3J9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzb3J0QWN0aXZhdGVkUm91dGVTbmFwc2hvdHMobm9kZXM6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10pOiB2b2lkIHtcbiAgbm9kZXMuc29ydCgoYSwgYikgPT4ge1xuICAgIGlmIChhLnZhbHVlLm91dGxldCA9PT0gUFJJTUFSWV9PVVRMRVQpIHJldHVybiAtMTtcbiAgICBpZiAoYi52YWx1ZS5vdXRsZXQgPT09IFBSSU1BUllfT1VUTEVUKSByZXR1cm4gMTtcbiAgICByZXR1cm4gYS52YWx1ZS5vdXRsZXQubG9jYWxlQ29tcGFyZShiLnZhbHVlLm91dGxldCk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBoYXNFbXB0eVBhdGhDb25maWcobm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4pIHtcbiAgY29uc3QgY29uZmlnID0gbm9kZS52YWx1ZS5yb3V0ZUNvbmZpZztcbiAgcmV0dXJuIGNvbmZpZyAmJiBjb25maWcucGF0aCA9PT0gJyc7XG59XG5cbi8qKlxuICogRmluZHMgYFRyZWVOb2RlYHMgd2l0aCBtYXRjaGluZyBlbXB0eSBwYXRoIHJvdXRlIGNvbmZpZ3MgYW5kIG1lcmdlcyB0aGVtIGludG8gYFRyZWVOb2RlYCB3aXRoXG4gKiB0aGUgY2hpbGRyZW4gZnJvbSBlYWNoIGR1cGxpY2F0ZS4gVGhpcyBpcyBuZWNlc3NhcnkgYmVjYXVzZSBkaWZmZXJlbnQgb3V0bGV0cyBjYW4gbWF0Y2ggYVxuICogc2luZ2xlIGVtcHR5IHBhdGggcm91dGUgY29uZmlnIGFuZCB0aGUgcmVzdWx0cyBuZWVkIHRvIHRoZW4gYmUgbWVyZ2VkLlxuICovXG5mdW5jdGlvbiBtZXJnZUVtcHR5UGF0aE1hdGNoZXMobm9kZXM6IEFycmF5PFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+Pik6XG4gICAgQXJyYXk8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4+IHtcbiAgY29uc3QgcmVzdWx0OiBBcnJheTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4gPSBbXTtcbiAgLy8gVGhlIHNldCBvZiBub2RlcyB3aGljaCBjb250YWluIGNoaWxkcmVuIHRoYXQgd2VyZSBtZXJnZWQgZnJvbSB0d28gZHVwbGljYXRlIGVtcHR5IHBhdGggbm9kZXMuXG4gIGNvbnN0IG1lcmdlZE5vZGVzOiBTZXQ8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4+ID0gbmV3IFNldCgpO1xuXG4gIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgIGlmICghaGFzRW1wdHlQYXRoQ29uZmlnKG5vZGUpKSB7XG4gICAgICByZXN1bHQucHVzaChub2RlKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGR1cGxpY2F0ZUVtcHR5UGF0aE5vZGUgPVxuICAgICAgICByZXN1bHQuZmluZChyZXN1bHROb2RlID0+IG5vZGUudmFsdWUucm91dGVDb25maWcgPT09IHJlc3VsdE5vZGUudmFsdWUucm91dGVDb25maWcpO1xuICAgIGlmIChkdXBsaWNhdGVFbXB0eVBhdGhOb2RlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGR1cGxpY2F0ZUVtcHR5UGF0aE5vZGUuY2hpbGRyZW4ucHVzaCguLi5ub2RlLmNoaWxkcmVuKTtcbiAgICAgIG1lcmdlZE5vZGVzLmFkZChkdXBsaWNhdGVFbXB0eVBhdGhOb2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0LnB1c2gobm9kZSk7XG4gICAgfVxuICB9XG4gIC8vIEZvciBlYWNoIG5vZGUgd2hpY2ggaGFzIGNoaWxkcmVuIGZyb20gbXVsdGlwbGUgc291cmNlcywgd2UgbmVlZCB0byByZWNvbXB1dGUgYSBuZXcgYFRyZWVOb2RlYFxuICAvLyBieSBhbHNvIG1lcmdpbmcgdGhvc2UgY2hpbGRyZW4uIFRoaXMgaXMgbmVjZXNzYXJ5IHdoZW4gdGhlcmUgYXJlIG11bHRpcGxlIGVtcHR5IHBhdGggY29uZmlnc1xuICAvLyBpbiBhIHJvdy4gUHV0IGFub3RoZXIgd2F5OiB3aGVuZXZlciB3ZSBjb21iaW5lIGNoaWxkcmVuIG9mIHR3byBub2Rlcywgd2UgbmVlZCB0byBhbHNvIGNoZWNrXG4gIC8vIGlmIGFueSBvZiB0aG9zZSBjaGlsZHJlbiBjYW4gYmUgY29tYmluZWQgaW50byBhIHNpbmdsZSBub2RlIGFzIHdlbGwuXG4gIGZvciAoY29uc3QgbWVyZ2VkTm9kZSBvZiBtZXJnZWROb2Rlcykge1xuICAgIGNvbnN0IG1lcmdlZENoaWxkcmVuID0gbWVyZ2VFbXB0eVBhdGhNYXRjaGVzKG1lcmdlZE5vZGUuY2hpbGRyZW4pO1xuICAgIHJlc3VsdC5wdXNoKG5ldyBUcmVlTm9kZShtZXJnZWROb2RlLnZhbHVlLCBtZXJnZWRDaGlsZHJlbikpO1xuICB9XG4gIHJldHVybiByZXN1bHQuZmlsdGVyKG4gPT4gIW1lcmdlZE5vZGVzLmhhcyhuKSk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrT3V0bGV0TmFtZVVuaXF1ZW5lc3Mobm9kZXM6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10pOiB2b2lkIHtcbiAgY29uc3QgbmFtZXM6IHtbazogc3RyaW5nXTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdH0gPSB7fTtcbiAgbm9kZXMuZm9yRWFjaChuID0+IHtcbiAgICBjb25zdCByb3V0ZVdpdGhTYW1lT3V0bGV0TmFtZSA9IG5hbWVzW24udmFsdWUub3V0bGV0XTtcbiAgICBpZiAocm91dGVXaXRoU2FtZU91dGxldE5hbWUpIHtcbiAgICAgIGNvbnN0IHAgPSByb3V0ZVdpdGhTYW1lT3V0bGV0TmFtZS51cmwubWFwKHMgPT4gcy50b1N0cmluZygpKS5qb2luKCcvJyk7XG4gICAgICBjb25zdCBjID0gbi52YWx1ZS51cmwubWFwKHMgPT4gcy50b1N0cmluZygpKS5qb2luKCcvJyk7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuVFdPX1NFR01FTlRTX1dJVEhfU0FNRV9PVVRMRVQsXG4gICAgICAgICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiZcbiAgICAgICAgICAgICAgYFR3byBzZWdtZW50cyBjYW5ub3QgaGF2ZSB0aGUgc2FtZSBvdXRsZXQgbmFtZTogJyR7cH0nIGFuZCAnJHtjfScuYCk7XG4gICAgfVxuICAgIG5hbWVzW24udmFsdWUub3V0bGV0XSA9IG4udmFsdWU7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZXREYXRhKHJvdXRlOiBSb3V0ZSk6IERhdGEge1xuICByZXR1cm4gcm91dGUuZGF0YSB8fCB7fTtcbn1cblxuZnVuY3Rpb24gZ2V0UmVzb2x2ZShyb3V0ZTogUm91dGUpOiBSZXNvbHZlRGF0YSB7XG4gIHJldHVybiByb3V0ZS5yZXNvbHZlIHx8IHt9O1xufVxuIl19