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
import { ActivatedRouteSnapshot, getInherited, RouterStateSnapshot } from './router_state';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb2duaXplLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yZWNvZ25pemUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUE0QixhQUFhLElBQUksWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3ZGLE9BQU8sRUFBQyxJQUFJLEVBQWMsRUFBRSxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsSUFBSSxJQUFJLFFBQVEsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFbkksT0FBTyxFQUFDLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ25HLE9BQU8sRUFBQyx5QkFBeUIsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBRzVELE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBRTFELE9BQU8sRUFBQyxzQkFBc0IsRUFBRSxZQUFZLEVBQTZCLG1CQUFtQixFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDcEgsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUV4QyxPQUFPLEVBQUMsSUFBSSxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDeEMsT0FBTyxFQUFDLFNBQVMsRUFBRSxxQkFBcUIsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxnQkFBZ0IsRUFBRSxLQUFLLEVBQWUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQ3ZILE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFDdEMsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBRWpEOzs7O0dBSUc7QUFDSCxNQUFNLGdCQUFnQjtDQUFHO0FBRXpCLE1BQU0sVUFBVSxTQUFTLENBQ3JCLFFBQTZCLEVBQUUsWUFBZ0MsRUFDL0QsaUJBQWlDLEVBQUUsTUFBYyxFQUFFLE9BQWdCLEVBQ25FLGFBQTRCLEVBQzVCLDRCQUNJLFdBQVc7SUFDakIsT0FBTyxJQUFJLFVBQVUsQ0FDVixRQUFRLEVBQUUsWUFBWSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUseUJBQXlCLEVBQ3JGLGFBQWEsQ0FBQztTQUNwQixTQUFTLEVBQUUsQ0FBQztBQUNuQixDQUFDO0FBRUQsTUFBTSxxQkFBcUIsR0FBRyxFQUFFLENBQUM7QUFFakMsTUFBTSxPQUFPLFVBQVU7SUFLckIsWUFDWSxRQUE2QixFQUFVLFlBQWdDLEVBQ3ZFLGlCQUFpQyxFQUFVLE1BQWMsRUFBVSxPQUFnQixFQUNuRix5QkFBb0QsRUFDM0MsYUFBNEI7UUFIckMsYUFBUSxHQUFSLFFBQVEsQ0FBcUI7UUFBVSxpQkFBWSxHQUFaLFlBQVksQ0FBb0I7UUFDdkUsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFnQjtRQUFVLFdBQU0sR0FBTixNQUFNLENBQVE7UUFBVSxZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQ25GLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBMkI7UUFDM0Msa0JBQWEsR0FBYixhQUFhLENBQWU7UUFSekMsbUJBQWMsR0FBRyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0RSwwQkFBcUIsR0FBRyxDQUFDLENBQUM7UUFDbEMsbUJBQWMsR0FBRyxJQUFJLENBQUM7SUFNOEIsQ0FBQztJQUU3QyxZQUFZLENBQUMsQ0FBVTtRQUM3QixPQUFPLElBQUksWUFBWSx1Q0FFbkIsQ0FBQyxPQUFPLFNBQVMsS0FBSyxXQUFXLElBQUksU0FBUyxDQUFDO1lBQzNDLDBDQUEwQyxDQUFDLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQztJQUN2RSxDQUFDO0lBRUQsU0FBUztRQUNQLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFlBQVksQ0FBQztRQUVwRixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3RELHFGQUFxRjtZQUNyRiwrRUFBK0U7WUFDL0UsTUFBTSxJQUFJLEdBQUcsSUFBSSxzQkFBc0IsQ0FDbkMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUMsQ0FBQyxFQUNuRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFFakYsTUFBTSxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sVUFBVSxHQUFHLElBQUksbUJBQW1CLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3pELE1BQU0sSUFBSSxHQUNOLHlCQUF5QixDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN6RixrREFBa0Q7WUFDbEQsaURBQWlEO1lBQ2pELGtFQUFrRTtZQUNsRSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO1lBQzVDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbEQsT0FBTyxFQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFDLENBQUM7UUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNOLENBQUM7SUFHTyxLQUFLLENBQUMsZ0JBQWlDO1FBQzdDLE1BQU0sU0FBUyxHQUNYLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDM0YsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFO1lBQzFDLElBQUksQ0FBQyxZQUFZLGdCQUFnQixFQUFFLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQztnQkFDekIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEMsQ0FBQztZQUNELElBQUksQ0FBQyxZQUFZLE9BQU8sRUFBRSxDQUFDO2dCQUN6QixNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0IsQ0FBQztZQUVELE1BQU0sQ0FBQyxDQUFDO1FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNOLENBQUM7SUFFRCxvQkFBb0IsQ0FDaEIsU0FBMkMsRUFBRSxNQUFtQztRQUNsRixNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxHQUFHLFlBQVksQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBRXRFLEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkMsS0FBSyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVuQyxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUN2RSxDQUFDO0lBRUQsbUJBQW1CLENBQ2YsUUFBNkIsRUFBRSxNQUFlLEVBQUUsWUFBNkIsRUFDN0UsTUFBYztRQUNoQixJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxZQUFZLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztZQUNyRSxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLFlBQVksQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQzthQUMxRixJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxZQUFZLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILGVBQWUsQ0FBQyxRQUE2QixFQUFFLE1BQWUsRUFBRSxZQUE2QjtRQUUzRiw0RkFBNEY7UUFDNUYseUVBQXlFO1FBQ3pFLE1BQU0sWUFBWSxHQUFhLEVBQUUsQ0FBQztRQUNsQyxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDdkQsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3hCLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDOUIsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDM0IsQ0FBQztRQUNILENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7YUFDcEIsSUFBSSxDQUNELFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUN0QixNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ2pELGlGQUFpRjtZQUNqRixxRkFBcUY7WUFDckYsaUJBQWlCO1lBQ2pCLE1BQU0sWUFBWSxHQUFHLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztZQUNoRSxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQztRQUM5RSxDQUFDLENBQUMsRUFDRixJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsY0FBYyxFQUFFLEVBQUU7WUFDaEMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLGNBQWMsQ0FBQyxDQUFDO1lBQ2pDLE9BQU8sUUFBUSxDQUFDO1FBQ2xCLENBQUMsQ0FBQyxFQUNGLGNBQWMsQ0FBQyxJQUFpRCxDQUFDLEVBQ2pFLFFBQVEsRUFBRSxFQUNWLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNsQixJQUFJLFFBQVEsS0FBSyxJQUFJO2dCQUFFLE9BQU8sT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3BELHNGQUFzRjtZQUN0RixrRkFBa0Y7WUFDbEYsNkVBQTZFO1lBQzdFLE1BQU0sY0FBYyxHQUFHLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3ZELElBQUksT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNsRCxnRkFBZ0Y7Z0JBQ2hGLDJDQUEyQztnQkFDM0MseUJBQXlCLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDNUMsQ0FBQztZQUNELDJCQUEyQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzVDLE9BQU8sRUFBRSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUNMLENBQUM7SUFDUixDQUFDO0lBRUQsY0FBYyxDQUNWLFFBQTZCLEVBQUUsTUFBZSxFQUFFLFlBQTZCLEVBQzdFLFFBQXNCLEVBQUUsTUFBYyxFQUN0QyxjQUF1QjtRQUN6QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQ3BCLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNaLE9BQU8sSUFBSTtpQkFDTiwwQkFBMEIsQ0FDdkIsQ0FBQyxDQUFDLFNBQVMsSUFBSSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFDbEUsY0FBYyxDQUFDO2lCQUNsQixJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUU7Z0JBQzFCLElBQUksQ0FBQyxZQUFZLE9BQU8sRUFBRSxDQUFDO29CQUN6QixPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbEIsQ0FBQztnQkFDRCxNQUFNLENBQUMsQ0FBQztZQUNWLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDVixDQUFDLENBQUMsRUFDRixLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQTBELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3hGLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BCLElBQUksZ0JBQWdCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDO29CQUNyRCxPQUFPLEVBQUUsQ0FBQyxJQUFJLGdCQUFnQixFQUFFLENBQUMsQ0FBQztnQkFDcEMsQ0FBQztnQkFDRCxPQUFPLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMvQixDQUFDO1lBQ0QsTUFBTSxDQUFDLENBQUM7UUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVELDBCQUEwQixDQUN0QixRQUE2QixFQUFFLE1BQWUsRUFBRSxLQUFZLEVBQUUsVUFBMkIsRUFDekYsUUFBc0IsRUFBRSxNQUFjLEVBQ3RDLGNBQXVCO1FBQ3pCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUM7WUFBRSxPQUFPLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV2RixJQUFJLEtBQUssQ0FBQyxVQUFVLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbkMsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3RGLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxjQUFjLElBQUksY0FBYyxFQUFFLENBQUM7WUFDMUMsT0FBTyxJQUFJLENBQUMsc0NBQXNDLENBQzlDLFFBQVEsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFTyxzQ0FBc0MsQ0FDMUMsUUFBNkIsRUFBRSxZQUE2QixFQUFFLE1BQWUsRUFBRSxLQUFZLEVBQzNGLFFBQXNCLEVBQ3RCLE1BQWM7UUFDaEIsTUFBTSxFQUNKLE9BQU8sRUFDUCxnQkFBZ0IsRUFDaEIsdUJBQXVCLEVBQ3ZCLGlCQUFpQixHQUNsQixHQUFHLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLEtBQUssQ0FBQyxZQUFZLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQy9ELElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFM0MsOEZBQThGO1FBQzlGLDhCQUE4QjtRQUM5QixJQUFJLEtBQUssQ0FBQyxVQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDN0IsSUFBSSxJQUFJLENBQUMscUJBQXFCLEdBQUcscUJBQXFCLEVBQUUsQ0FBQztnQkFDdkQsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZCxNQUFNLElBQUksWUFBWSxnREFFbEIsOERBQThELElBQUksQ0FBQyxPQUFPLFNBQ3RFLEtBQUssQ0FBQyxVQUFVLE1BQU07d0JBQ3RCLDJEQUEyRDt3QkFDM0QsMEVBQTBFLENBQUMsQ0FBQztnQkFDdEYsQ0FBQztnQkFDRCxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQztZQUM5QixDQUFDO1FBQ0gsQ0FBQztRQUNELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQ3JELGdCQUFnQixFQUFFLEtBQUssQ0FBQyxVQUFXLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztRQUVsRSxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQzthQUN4RCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsV0FBeUIsRUFBRSxFQUFFO1lBQzNDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FDdEIsUUFBUSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM1RixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVELHdCQUF3QixDQUNwQixRQUE2QixFQUFFLFVBQTJCLEVBQUUsS0FBWSxFQUN4RSxRQUFzQixFQUFFLE1BQWM7UUFDeEMsSUFBSSxXQUFvQyxDQUFDO1FBRXpDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUN4QixXQUFXLEdBQUcsRUFBRSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDdEQsNEZBQTRGO1lBQzVGLHNGQUFzRjtZQUN0RiwyREFBMkQ7WUFDM0Qsa0RBQWtEO1lBQ2xELFVBQVUsQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO1FBQzNCLENBQUM7YUFBTSxDQUFDO1lBQ04sV0FBVyxHQUFHLGVBQWUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzNGLENBQUM7UUFFRCxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDN0IsQ0FBQztZQUVELG1GQUFtRjtZQUNuRixRQUFRLEdBQUcsS0FBSyxDQUFDLFNBQVMsSUFBSSxRQUFRLENBQUM7WUFDdkMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDO2lCQUNoRCxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQyxNQUFNLEVBQUUsV0FBVyxFQUFDLEVBQUUsRUFBRTtnQkFDeEMsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLGVBQWUsSUFBSSxRQUFRLENBQUM7Z0JBRXhELE1BQU0sRUFBQyxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQUMsR0FBRyxNQUFNLENBQUM7Z0JBQ2pFLE1BQU0sUUFBUSxHQUFHLElBQUksc0JBQXNCLENBQ3ZDLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBQyxDQUFDLEVBQzFFLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQ3ZELEtBQUssQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDLGdCQUFnQixJQUFJLElBQUksRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBRWpGLE1BQU0sRUFBQyxZQUFZLEVBQUUsY0FBYyxFQUFDLEdBQ2hDLEtBQUssQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBRXhFLElBQUksY0FBYyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksWUFBWSxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7b0JBQzlELE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLEVBQUUsV0FBVyxFQUFFLFlBQVksQ0FBQzt5QkFDaEUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTt3QkFDbkIsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFLENBQUM7NEJBQ3RCLE9BQU8sSUFBSSxDQUFDO3dCQUNkLENBQUM7d0JBQ0QsT0FBTyxJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7b0JBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ1YsQ0FBQztnQkFFRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQzVELE9BQU8sRUFBRSxDQUFDLElBQUksUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN4QyxDQUFDO2dCQUVELE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxNQUFNLENBQUM7Z0JBQ3BELG1GQUFtRjtnQkFDbkYscUZBQXFGO2dCQUNyRix1RkFBdUY7Z0JBQ3ZGLDZDQUE2QztnQkFDN0MsOEJBQThCO2dCQUM5Qiw4QkFBOEI7Z0JBQzlCLEtBQUs7Z0JBQ0wsc0ZBQXNGO2dCQUN0RixPQUFPLElBQUk7cUJBQ04sY0FBYyxDQUNYLGFBQWEsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFDeEQsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUM7cUJBQ25ELElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ2hCLE9BQU8sSUFBSSxRQUFRLENBQUMsUUFBUSxFQUFFLEtBQUssWUFBWSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUMxRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNWLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTixDQUFDO0lBQ08sY0FBYyxDQUFDLFFBQTZCLEVBQUUsS0FBWSxFQUFFLFFBQXNCO1FBRXhGLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25CLHlDQUF5QztZQUN6QyxPQUFPLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBQyxDQUFDLENBQUM7UUFDaEQsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZCLDRDQUE0QztZQUM1QyxJQUFJLEtBQUssQ0FBQyxhQUFhLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3RDLE9BQU8sRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxhQUFhLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxlQUFlLEVBQUMsQ0FBQyxDQUFDO1lBQzVFLENBQUM7WUFFRCxPQUFPLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUM7aUJBQ2pFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBeUIsRUFBRSxFQUFFO2dCQUMzQyxJQUFJLGdCQUFnQixFQUFFLENBQUM7b0JBQ3JCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQzt5QkFDakQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQXVCLEVBQUUsRUFBRTt3QkFDcEMsS0FBSyxDQUFDLGFBQWEsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO3dCQUNqQyxLQUFLLENBQUMsZUFBZSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUM7b0JBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ1YsQ0FBQztnQkFDRCxPQUFPLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ1YsQ0FBQztRQUVELE9BQU8sRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUMsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7Q0FDRjtBQUVELFNBQVMsMkJBQTJCLENBQUMsS0FBeUM7SUFDNUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUNsQixJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLGNBQWM7WUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssY0FBYztZQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2hELE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEQsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxJQUFzQztJQUNoRSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQztJQUN0QyxPQUFPLE1BQU0sSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQztBQUN0QyxDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQVMscUJBQXFCLENBQUMsS0FBOEM7SUFFM0UsTUFBTSxNQUFNLEdBQTRDLEVBQUUsQ0FBQztJQUMzRCxnR0FBZ0c7SUFDaEcsTUFBTSxXQUFXLEdBQTBDLElBQUksR0FBRyxFQUFFLENBQUM7SUFFckUsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUN6QixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM5QixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xCLFNBQVM7UUFDWCxDQUFDO1FBRUQsTUFBTSxzQkFBc0IsR0FDeEIsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxLQUFLLFVBQVUsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDdkYsSUFBSSxzQkFBc0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN6QyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3ZELFdBQVcsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUMxQyxDQUFDO2FBQU0sQ0FBQztZQUNOLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEIsQ0FBQztJQUNILENBQUM7SUFDRCxnR0FBZ0c7SUFDaEcsK0ZBQStGO0lBQy9GLDhGQUE4RjtJQUM5Rix1RUFBdUU7SUFDdkUsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNyQyxNQUFNLGNBQWMsR0FBRyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pELENBQUM7QUFFRCxTQUFTLHlCQUF5QixDQUFDLEtBQXlDO0lBQzFFLE1BQU0sS0FBSyxHQUEwQyxFQUFFLENBQUM7SUFDeEQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNoQixNQUFNLHVCQUF1QixHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RELElBQUksdUJBQXVCLEVBQUUsQ0FBQztZQUM1QixNQUFNLENBQUMsR0FBRyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN2RCxNQUFNLElBQUksWUFBWSw0REFFbEIsQ0FBQyxPQUFPLFNBQVMsS0FBSyxXQUFXLElBQUksU0FBUyxDQUFDO2dCQUMzQyxtREFBbUQsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0UsQ0FBQztRQUNELEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDbEMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsU0FBUyxPQUFPLENBQUMsS0FBWTtJQUMzQixPQUFPLEtBQUssQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO0FBQzFCLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxLQUFZO0lBQzlCLE9BQU8sS0FBSyxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUM7QUFDN0IsQ0FBQztBQUVELFNBQVMseUJBQXlCLENBQUMsUUFBc0I7SUFDdkQsT0FBTztRQUNMLE9BQU8sRUFBRSxJQUFJO1FBQ2IsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ2pFLGdCQUFnQixFQUFFLFFBQVE7UUFDMUIsaUJBQWlCLEVBQUUsRUFBRTtRQUNyQix1QkFBdUIsRUFBRSxFQUFFO0tBQzVCLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RW52aXJvbm1lbnRJbmplY3RvciwgVHlwZSwgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ZnJvbSwgT2JzZXJ2YWJsZSwgb2Z9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjYXRjaEVycm9yLCBjb25jYXRNYXAsIGRlZmF1bHRJZkVtcHR5LCBmaXJzdCwgbGFzdCBhcyByeGpzTGFzdCwgbWFwLCBtZXJnZU1hcCwgc2Nhbiwgc3dpdGNoTWFwLCB0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtBYnNvbHV0ZVJlZGlyZWN0LCBBcHBseVJlZGlyZWN0cywgY2FuTG9hZEZhaWxzLCBub01hdGNoLCBOb01hdGNofSBmcm9tICcuL2FwcGx5X3JlZGlyZWN0cyc7XG5pbXBvcnQge2NyZWF0ZVVybFRyZWVGcm9tU25hcHNob3R9IGZyb20gJy4vY3JlYXRlX3VybF90cmVlJztcbmltcG9ydCB7UnVudGltZUVycm9yQ29kZX0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IHtEYXRhLCBMb2FkZWRSb3V0ZXJDb25maWcsIFJlc29sdmVEYXRhLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge3J1bkNhbkxvYWRHdWFyZHN9IGZyb20gJy4vb3BlcmF0b3JzL2NoZWNrX2d1YXJkcyc7XG5pbXBvcnQge1JvdXRlckNvbmZpZ0xvYWRlcn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIGdldEluaGVyaXRlZCwgUGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSwgUm91dGVyU3RhdGVTbmFwc2hvdH0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQUklNQVJZX09VVExFVH0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtVcmxTZWdtZW50LCBVcmxTZWdtZW50R3JvdXAsIFVybFNlcmlhbGl6ZXIsIFVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtsYXN0fSBmcm9tICcuL3V0aWxzL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtnZXRPdXRsZXQsIHNvcnRCeU1hdGNoaW5nT3V0bGV0c30gZnJvbSAnLi91dGlscy9jb25maWcnO1xuaW1wb3J0IHtpc0ltbWVkaWF0ZU1hdGNoLCBtYXRjaCwgTWF0Y2hSZXN1bHQsIG1hdGNoV2l0aENoZWNrcywgbm9MZWZ0b3ZlcnNJblVybCwgc3BsaXR9IGZyb20gJy4vdXRpbHMvY29uZmlnX21hdGNoaW5nJztcbmltcG9ydCB7VHJlZU5vZGV9IGZyb20gJy4vdXRpbHMvdHJlZSc7XG5pbXBvcnQge2lzRW1wdHlFcnJvcn0gZnJvbSAnLi91dGlscy90eXBlX2d1YXJkcyc7XG5cbi8qKlxuICogQ2xhc3MgdXNlZCB0byBpbmRpY2F0ZSB0aGVyZSB3ZXJlIG5vIGFkZGl0aW9uYWwgcm91dGUgY29uZmlnIG1hdGNoZXMgYnV0IHRoYXQgYWxsIHNlZ21lbnRzIG9mXG4gKiB0aGUgVVJMIHdlcmUgY29uc3VtZWQgZHVyaW5nIG1hdGNoaW5nIHNvIHRoZSByb3V0ZSB3YXMgVVJMIG1hdGNoZWQuIFdoZW4gdGhpcyBoYXBwZW5zLCB3ZSBzdGlsbFxuICogdHJ5IHRvIG1hdGNoIGNoaWxkIGNvbmZpZ3MgaW4gY2FzZSB0aGVyZSBhcmUgZW1wdHkgcGF0aCBjaGlsZHJlbi5cbiAqL1xuY2xhc3MgTm9MZWZ0b3ZlcnNJblVybCB7fVxuXG5leHBvcnQgZnVuY3Rpb24gcmVjb2duaXplKFxuICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCBjb25maWdMb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcixcbiAgICByb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+fG51bGwsIGNvbmZpZzogUm91dGVzLCB1cmxUcmVlOiBVcmxUcmVlLFxuICAgIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogUGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSA9XG4gICAgICAgICdlbXB0eU9ubHknKTogT2JzZXJ2YWJsZTx7c3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QsIHRyZWU6IFVybFRyZWV9PiB7XG4gIHJldHVybiBuZXcgUmVjb2duaXplcihcbiAgICAgICAgICAgICBpbmplY3RvciwgY29uZmlnTG9hZGVyLCByb290Q29tcG9uZW50VHlwZSwgY29uZmlnLCB1cmxUcmVlLCBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LFxuICAgICAgICAgICAgIHVybFNlcmlhbGl6ZXIpXG4gICAgICAucmVjb2duaXplKCk7XG59XG5cbmNvbnN0IE1BWF9BTExPV0VEX1JFRElSRUNUUyA9IDMxO1xuXG5leHBvcnQgY2xhc3MgUmVjb2duaXplciB7XG4gIHByaXZhdGUgYXBwbHlSZWRpcmVjdHMgPSBuZXcgQXBwbHlSZWRpcmVjdHModGhpcy51cmxTZXJpYWxpemVyLCB0aGlzLnVybFRyZWUpO1xuICBwcml2YXRlIGFic29sdXRlUmVkaXJlY3RDb3VudCA9IDA7XG4gIGFsbG93UmVkaXJlY3RzID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHByaXZhdGUgY29uZmlnTG9hZGVyOiBSb3V0ZXJDb25maWdMb2FkZXIsXG4gICAgICBwcml2YXRlIHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT58bnVsbCwgcHJpdmF0ZSBjb25maWc6IFJvdXRlcywgcHJpdmF0ZSB1cmxUcmVlOiBVcmxUcmVlLFxuICAgICAgcHJpdmF0ZSBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiBQYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyKSB7fVxuXG4gIHByaXZhdGUgbm9NYXRjaEVycm9yKGU6IE5vTWF0Y2gpOiBhbnkge1xuICAgIHJldHVybiBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICBSdW50aW1lRXJyb3JDb2RlLk5PX01BVENILFxuICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICAgICAgYENhbm5vdCBtYXRjaCBhbnkgcm91dGVzLiBVUkwgU2VnbWVudDogJyR7ZS5zZWdtZW50R3JvdXB9J2ApO1xuICB9XG5cbiAgcmVjb2duaXplKCk6IE9ic2VydmFibGU8e3N0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LCB0cmVlOiBVcmxUcmVlfT4ge1xuICAgIGNvbnN0IHJvb3RTZWdtZW50R3JvdXAgPSBzcGxpdCh0aGlzLnVybFRyZWUucm9vdCwgW10sIFtdLCB0aGlzLmNvbmZpZykuc2VnbWVudEdyb3VwO1xuXG4gICAgcmV0dXJuIHRoaXMubWF0Y2gocm9vdFNlZ21lbnRHcm91cCkucGlwZShtYXAoY2hpbGRyZW4gPT4ge1xuICAgICAgLy8gVXNlIE9iamVjdC5mcmVlemUgdG8gcHJldmVudCByZWFkZXJzIG9mIHRoZSBSb3V0ZXIgc3RhdGUgZnJvbSBtb2RpZnlpbmcgaXQgb3V0c2lkZVxuICAgICAgLy8gb2YgYSBuYXZpZ2F0aW9uLCByZXN1bHRpbmcgaW4gdGhlIHJvdXRlciBiZWluZyBvdXQgb2Ygc3luYyB3aXRoIHRoZSBicm93c2VyLlxuICAgICAgY29uc3Qgcm9vdCA9IG5ldyBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KFxuICAgICAgICAgIFtdLCBPYmplY3QuZnJlZXplKHt9KSwgT2JqZWN0LmZyZWV6ZSh7Li4udGhpcy51cmxUcmVlLnF1ZXJ5UGFyYW1zfSksXG4gICAgICAgICAgdGhpcy51cmxUcmVlLmZyYWdtZW50LCB7fSwgUFJJTUFSWV9PVVRMRVQsIHRoaXMucm9vdENvbXBvbmVudFR5cGUsIG51bGwsIHt9KTtcblxuICAgICAgY29uc3Qgcm9vdE5vZGUgPSBuZXcgVHJlZU5vZGUocm9vdCwgY2hpbGRyZW4pO1xuICAgICAgY29uc3Qgcm91dGVTdGF0ZSA9IG5ldyBSb3V0ZXJTdGF0ZVNuYXBzaG90KCcnLCByb290Tm9kZSk7XG4gICAgICBjb25zdCB0cmVlID1cbiAgICAgICAgICBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHJvb3QsIFtdLCB0aGlzLnVybFRyZWUucXVlcnlQYXJhbXMsIHRoaXMudXJsVHJlZS5mcmFnbWVudCk7XG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2lzc3Vlcy80NzMwN1xuICAgICAgLy8gQ3JlYXRpbmcgdGhlIHRyZWUgc3RyaW5naWZpZXMgdGhlIHF1ZXJ5IHBhcmFtc1xuICAgICAgLy8gV2UgZG9uJ3Qgd2FudCB0byBkbyB0aGlzIGhlcmUgc28gcmVhc3NpZ24gdGhlbSB0byB0aGUgb3JpZ2luYWwuXG4gICAgICB0cmVlLnF1ZXJ5UGFyYW1zID0gdGhpcy51cmxUcmVlLnF1ZXJ5UGFyYW1zO1xuICAgICAgcm91dGVTdGF0ZS51cmwgPSB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHRyZWUpO1xuICAgICAgdGhpcy5pbmhlcml0UGFyYW1zQW5kRGF0YShyb3V0ZVN0YXRlLl9yb290LCBudWxsKTtcbiAgICAgIHJldHVybiB7c3RhdGU6IHJvdXRlU3RhdGUsIHRyZWV9O1xuICAgIH0pKTtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBtYXRjaChyb290U2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXApOiBPYnNlcnZhYmxlPFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10+IHtcbiAgICBjb25zdCBleHBhbmRlZCQgPVxuICAgICAgICB0aGlzLnByb2Nlc3NTZWdtZW50R3JvdXAodGhpcy5pbmplY3RvciwgdGhpcy5jb25maWcsIHJvb3RTZWdtZW50R3JvdXAsIFBSSU1BUllfT1VUTEVUKTtcbiAgICByZXR1cm4gZXhwYW5kZWQkLnBpcGUoY2F0Y2hFcnJvcigoZTogYW55KSA9PiB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIEFic29sdXRlUmVkaXJlY3QpIHtcbiAgICAgICAgdGhpcy51cmxUcmVlID0gZS51cmxUcmVlO1xuICAgICAgICByZXR1cm4gdGhpcy5tYXRjaChlLnVybFRyZWUucm9vdCk7XG4gICAgICB9XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIE5vTWF0Y2gpIHtcbiAgICAgICAgdGhyb3cgdGhpcy5ub01hdGNoRXJyb3IoZSk7XG4gICAgICB9XG5cbiAgICAgIHRocm93IGU7XG4gICAgfSkpO1xuICB9XG5cbiAgaW5oZXJpdFBhcmFtc0FuZERhdGEoXG4gICAgICByb3V0ZU5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+LCBwYXJlbnQ6IEFjdGl2YXRlZFJvdXRlU25hcHNob3R8bnVsbCk6IHZvaWQge1xuICAgIGNvbnN0IHJvdXRlID0gcm91dGVOb2RlLnZhbHVlO1xuICAgIGNvbnN0IGkgPSBnZXRJbmhlcml0ZWQocm91dGUsIHBhcmVudCwgdGhpcy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5KTtcblxuICAgIHJvdXRlLnBhcmFtcyA9IE9iamVjdC5mcmVlemUoaS5wYXJhbXMpO1xuICAgIHJvdXRlLmRhdGEgPSBPYmplY3QuZnJlZXplKGkuZGF0YSk7XG5cbiAgICByb3V0ZU5vZGUuY2hpbGRyZW4uZm9yRWFjaChuID0+IHRoaXMuaW5oZXJpdFBhcmFtc0FuZERhdGEobiwgcm91dGUpKTtcbiAgfVxuXG4gIHByb2Nlc3NTZWdtZW50R3JvdXAoXG4gICAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvciwgY29uZmlnOiBSb3V0ZVtdLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCxcbiAgICAgIG91dGxldDogc3RyaW5nKTogT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PltdPiB7XG4gICAgaWYgKHNlZ21lbnRHcm91cC5zZWdtZW50cy5sZW5ndGggPT09IDAgJiYgc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NDaGlsZHJlbihpbmplY3RvciwgY29uZmlnLCBzZWdtZW50R3JvdXApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnByb2Nlc3NTZWdtZW50KGluamVjdG9yLCBjb25maWcsIHNlZ21lbnRHcm91cCwgc2VnbWVudEdyb3VwLnNlZ21lbnRzLCBvdXRsZXQsIHRydWUpXG4gICAgICAgIC5waXBlKG1hcChjaGlsZCA9PiBjaGlsZCBpbnN0YW5jZW9mIFRyZWVOb2RlID8gW2NoaWxkXSA6IFtdKSk7XG4gIH1cblxuICAvKipcbiAgICogTWF0Y2hlcyBldmVyeSBjaGlsZCBvdXRsZXQgaW4gdGhlIGBzZWdtZW50R3JvdXBgIHRvIGEgYFJvdXRlYCBpbiB0aGUgY29uZmlnLiBSZXR1cm5zIGBudWxsYCBpZlxuICAgKiB3ZSBjYW5ub3QgZmluZCBhIG1hdGNoIGZvciBfYW55XyBvZiB0aGUgY2hpbGRyZW4uXG4gICAqXG4gICAqIEBwYXJhbSBjb25maWcgLSBUaGUgYFJvdXRlc2AgdG8gbWF0Y2ggYWdhaW5zdFxuICAgKiBAcGFyYW0gc2VnbWVudEdyb3VwIC0gVGhlIGBVcmxTZWdtZW50R3JvdXBgIHdob3NlIGNoaWxkcmVuIG5lZWQgdG8gYmUgbWF0Y2hlZCBhZ2FpbnN0IHRoZVxuICAgKiAgICAgY29uZmlnLlxuICAgKi9cbiAgcHJvY2Vzc0NoaWxkcmVuKGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCBjb25maWc6IFJvdXRlW10sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKTpcbiAgICAgIE9ic2VydmFibGU8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXT4ge1xuICAgIC8vIEV4cGFuZCBvdXRsZXRzIG9uZSBhdCBhIHRpbWUsIHN0YXJ0aW5nIHdpdGggdGhlIHByaW1hcnkgb3V0bGV0LiBXZSBuZWVkIHRvIGRvIGl0IHRoaXMgd2F5XG4gICAgLy8gYmVjYXVzZSBhbiBhYnNvbHV0ZSByZWRpcmVjdCBmcm9tIHRoZSBwcmltYXJ5IG91dGxldCB0YWtlcyBwcmVjZWRlbmNlLlxuICAgIGNvbnN0IGNoaWxkT3V0bGV0czogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIE9iamVjdC5rZXlzKHNlZ21lbnRHcm91cC5jaGlsZHJlbikpIHtcbiAgICAgIGlmIChjaGlsZCA9PT0gJ3ByaW1hcnknKSB7XG4gICAgICAgIGNoaWxkT3V0bGV0cy51bnNoaWZ0KGNoaWxkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoaWxkT3V0bGV0cy5wdXNoKGNoaWxkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZyb20oY2hpbGRPdXRsZXRzKVxuICAgICAgICAucGlwZShcbiAgICAgICAgICAgIGNvbmNhdE1hcChjaGlsZE91dGxldCA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGNoaWxkID0gc2VnbWVudEdyb3VwLmNoaWxkcmVuW2NoaWxkT3V0bGV0XTtcbiAgICAgICAgICAgICAgLy8gU29ydCB0aGUgY29uZmlnIHNvIHRoYXQgcm91dGVzIHdpdGggb3V0bGV0cyB0aGF0IG1hdGNoIHRoZSBvbmUgYmVpbmcgYWN0aXZhdGVkXG4gICAgICAgICAgICAgIC8vIGFwcGVhciBmaXJzdCwgZm9sbG93ZWQgYnkgcm91dGVzIGZvciBvdGhlciBvdXRsZXRzLCB3aGljaCBtaWdodCBtYXRjaCBpZiB0aGV5IGhhdmVcbiAgICAgICAgICAgICAgLy8gYW4gZW1wdHkgcGF0aC5cbiAgICAgICAgICAgICAgY29uc3Qgc29ydGVkQ29uZmlnID0gc29ydEJ5TWF0Y2hpbmdPdXRsZXRzKGNvbmZpZywgY2hpbGRPdXRsZXQpO1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzU2VnbWVudEdyb3VwKGluamVjdG9yLCBzb3J0ZWRDb25maWcsIGNoaWxkLCBjaGlsZE91dGxldCk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHNjYW4oKGNoaWxkcmVuLCBvdXRsZXRDaGlsZHJlbikgPT4ge1xuICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKC4uLm91dGxldENoaWxkcmVuKTtcbiAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkcmVuO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBkZWZhdWx0SWZFbXB0eShudWxsIGFzIFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10gfCBudWxsKSxcbiAgICAgICAgICAgIHJ4anNMYXN0KCksXG4gICAgICAgICAgICBtZXJnZU1hcChjaGlsZHJlbiA9PiB7XG4gICAgICAgICAgICAgIGlmIChjaGlsZHJlbiA9PT0gbnVsbCkgcmV0dXJuIG5vTWF0Y2goc2VnbWVudEdyb3VwKTtcbiAgICAgICAgICAgICAgLy8gQmVjYXVzZSB3ZSBtYXkgaGF2ZSBtYXRjaGVkIHR3byBvdXRsZXRzIHRvIHRoZSBzYW1lIGVtcHR5IHBhdGggc2VnbWVudCwgd2UgY2FuIGhhdmVcbiAgICAgICAgICAgICAgLy8gbXVsdGlwbGUgYWN0aXZhdGVkIHJlc3VsdHMgZm9yIHRoZSBzYW1lIG91dGxldC4gV2Ugc2hvdWxkIG1lcmdlIHRoZSBjaGlsZHJlbiBvZlxuICAgICAgICAgICAgICAvLyB0aGVzZSByZXN1bHRzIHNvIHRoZSBmaW5hbCByZXR1cm4gdmFsdWUgaXMgb25seSBvbmUgYFRyZWVOb2RlYCBwZXIgb3V0bGV0LlxuICAgICAgICAgICAgICBjb25zdCBtZXJnZWRDaGlsZHJlbiA9IG1lcmdlRW1wdHlQYXRoTWF0Y2hlcyhjaGlsZHJlbik7XG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIHNob3VsZCByZWFsbHkgbmV2ZXIgaGFwcGVuIC0gd2UgYXJlIG9ubHkgdGFraW5nIHRoZSBmaXJzdCBtYXRjaCBmb3IgZWFjaFxuICAgICAgICAgICAgICAgIC8vIG91dGxldCBhbmQgbWVyZ2UgdGhlIGVtcHR5IHBhdGggbWF0Y2hlcy5cbiAgICAgICAgICAgICAgICBjaGVja091dGxldE5hbWVVbmlxdWVuZXNzKG1lcmdlZENoaWxkcmVuKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBzb3J0QWN0aXZhdGVkUm91dGVTbmFwc2hvdHMobWVyZ2VkQ2hpbGRyZW4pO1xuICAgICAgICAgICAgICByZXR1cm4gb2YobWVyZ2VkQ2hpbGRyZW4pO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICk7XG4gIH1cblxuICBwcm9jZXNzU2VnbWVudChcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZXM6IFJvdXRlW10sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLFxuICAgICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgb3V0bGV0OiBzdHJpbmcsXG4gICAgICBhbGxvd1JlZGlyZWN0czogYm9vbGVhbik6IE9ic2VydmFibGU8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD58Tm9MZWZ0b3ZlcnNJblVybD4ge1xuICAgIHJldHVybiBmcm9tKHJvdXRlcykucGlwZShcbiAgICAgICAgY29uY2F0TWFwKHIgPT4ge1xuICAgICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgICAgICAgIC5wcm9jZXNzU2VnbWVudEFnYWluc3RSb3V0ZShcbiAgICAgICAgICAgICAgICAgIHIuX2luamVjdG9yID8/IGluamVjdG9yLCByb3V0ZXMsIHIsIHNlZ21lbnRHcm91cCwgc2VnbWVudHMsIG91dGxldCxcbiAgICAgICAgICAgICAgICAgIGFsbG93UmVkaXJlY3RzKVxuICAgICAgICAgICAgICAucGlwZShjYXRjaEVycm9yKChlOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIE5vTWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBvZihudWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KSxcbiAgICAgICAgZmlyc3QoKHgpOiB4IGlzIFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+fE5vTGVmdG92ZXJzSW5VcmwgPT4gISF4KSwgY2F0Y2hFcnJvcihlID0+IHtcbiAgICAgICAgICBpZiAoaXNFbXB0eUVycm9yKGUpKSB7XG4gICAgICAgICAgICBpZiAobm9MZWZ0b3ZlcnNJblVybChzZWdtZW50R3JvdXAsIHNlZ21lbnRzLCBvdXRsZXQpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvZihuZXcgTm9MZWZ0b3ZlcnNJblVybCgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBub01hdGNoKHNlZ21lbnRHcm91cCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH0pKTtcbiAgfVxuXG4gIHByb2Nlc3NTZWdtZW50QWdhaW5zdFJvdXRlKFxuICAgICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJvdXRlczogUm91dGVbXSwgcm91dGU6IFJvdXRlLCByYXdTZWdtZW50OiBVcmxTZWdtZW50R3JvdXAsXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZyxcbiAgICAgIGFsbG93UmVkaXJlY3RzOiBib29sZWFuKTogT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PnxOb0xlZnRvdmVyc0luVXJsPiB7XG4gICAgaWYgKCFpc0ltbWVkaWF0ZU1hdGNoKHJvdXRlLCByYXdTZWdtZW50LCBzZWdtZW50cywgb3V0bGV0KSkgcmV0dXJuIG5vTWF0Y2gocmF3U2VnbWVudCk7XG5cbiAgICBpZiAocm91dGUucmVkaXJlY3RUbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXRjaFNlZ21lbnRBZ2FpbnN0Um91dGUoaW5qZWN0b3IsIHJhd1NlZ21lbnQsIHJvdXRlLCBzZWdtZW50cywgb3V0bGV0KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5hbGxvd1JlZGlyZWN0cyAmJiBhbGxvd1JlZGlyZWN0cykge1xuICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kU2VnbWVudEFnYWluc3RSb3V0ZVVzaW5nUmVkaXJlY3QoXG4gICAgICAgICAgaW5qZWN0b3IsIHJhd1NlZ21lbnQsIHJvdXRlcywgcm91dGUsIHNlZ21lbnRzLCBvdXRsZXQpO1xuICAgIH1cblxuICAgIHJldHVybiBub01hdGNoKHJhd1NlZ21lbnQpO1xuICB9XG5cbiAgcHJpdmF0ZSBleHBhbmRTZWdtZW50QWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGVzOiBSb3V0ZVtdLCByb3V0ZTogUm91dGUsXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgICAgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+fE5vTGVmdG92ZXJzSW5Vcmw+IHtcbiAgICBjb25zdCB7XG4gICAgICBtYXRjaGVkLFxuICAgICAgY29uc3VtZWRTZWdtZW50cyxcbiAgICAgIHBvc2l0aW9uYWxQYXJhbVNlZ21lbnRzLFxuICAgICAgcmVtYWluaW5nU2VnbWVudHMsXG4gICAgfSA9IHJvdXRlLnBhdGggPT09ICcqKicgPyBjcmVhdGVXaWxkY2FyZE1hdGNoUmVzdWx0KHNlZ21lbnRzKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaChzZWdtZW50R3JvdXAsIHJvdXRlLCBzZWdtZW50cyk7XG4gICAgaWYgKCFtYXRjaGVkKSByZXR1cm4gbm9NYXRjaChzZWdtZW50R3JvdXApO1xuXG4gICAgLy8gVE9ETyhhdHNjb3R0KTogTW92ZSBhbGwgb2YgdGhpcyB1bmRlciBhbiBpZihuZ0Rldk1vZGUpIGFzIGEgYnJlYWtpbmcgY2hhbmdlIGFuZCBhbGxvdyBzdGFja1xuICAgIC8vIHNpemUgZXhjZWVkZWQgaW4gcHJvZHVjdGlvblxuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvIS5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAgIHRoaXMuYWJzb2x1dGVSZWRpcmVjdENvdW50Kys7XG4gICAgICBpZiAodGhpcy5hYnNvbHV0ZVJlZGlyZWN0Q291bnQgPiBNQVhfQUxMT1dFRF9SRURJUkVDVFMpIHtcbiAgICAgICAgaWYgKG5nRGV2TW9kZSkge1xuICAgICAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5GSU5JVEVfUkVESVJFQ1QsXG4gICAgICAgICAgICAgIGBEZXRlY3RlZCBwb3NzaWJsZSBpbmZpbml0ZSByZWRpcmVjdCB3aGVuIHJlZGlyZWN0aW5nIGZyb20gJyR7dGhpcy51cmxUcmVlfScgdG8gJyR7XG4gICAgICAgICAgICAgICAgICByb3V0ZS5yZWRpcmVjdFRvfScuXFxuYCArXG4gICAgICAgICAgICAgICAgICBgVGhpcyBpcyBjdXJyZW50bHkgYSBkZXYgbW9kZSBvbmx5IGVycm9yIGJ1dCB3aWxsIGJlY29tZSBhYCArXG4gICAgICAgICAgICAgICAgICBgIGNhbGwgc3RhY2sgc2l6ZSBleGNlZWRlZCBlcnJvciBpbiBwcm9kdWN0aW9uIGluIGEgZnV0dXJlIG1ham9yIHZlcnNpb24uYCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hbGxvd1JlZGlyZWN0cyA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBuZXdUcmVlID0gdGhpcy5hcHBseVJlZGlyZWN0cy5hcHBseVJlZGlyZWN0Q29tbWFuZHMoXG4gICAgICAgIGNvbnN1bWVkU2VnbWVudHMsIHJvdXRlLnJlZGlyZWN0VG8hLCBwb3NpdGlvbmFsUGFyYW1TZWdtZW50cyk7XG5cbiAgICByZXR1cm4gdGhpcy5hcHBseVJlZGlyZWN0cy5saW5lcmFsaXplU2VnbWVudHMocm91dGUsIG5ld1RyZWUpXG4gICAgICAgIC5waXBlKG1lcmdlTWFwKChuZXdTZWdtZW50czogVXJsU2VnbWVudFtdKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1NlZ21lbnQoXG4gICAgICAgICAgICAgIGluamVjdG9yLCByb3V0ZXMsIHNlZ21lbnRHcm91cCwgbmV3U2VnbWVudHMuY29uY2F0KHJlbWFpbmluZ1NlZ21lbnRzKSwgb3V0bGV0LCBmYWxzZSk7XG4gICAgICAgIH0pKTtcbiAgfVxuXG4gIG1hdGNoU2VnbWVudEFnYWluc3RSb3V0ZShcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByYXdTZWdtZW50OiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlOiBSb3V0ZSxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nKTogT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4ge1xuICAgIGxldCBtYXRjaFJlc3VsdDogT2JzZXJ2YWJsZTxNYXRjaFJlc3VsdD47XG5cbiAgICBpZiAocm91dGUucGF0aCA9PT0gJyoqJykge1xuICAgICAgbWF0Y2hSZXN1bHQgPSBvZihjcmVhdGVXaWxkY2FyZE1hdGNoUmVzdWx0KHNlZ21lbnRzKSk7XG4gICAgICAvLyBQcmlvciB2ZXJzaW9ucyBvZiB0aGUgcm91dGUgbWF0Y2hpbmcgYWxnb3JpdGhtIHdvdWxkIHN0b3AgbWF0Y2hpbmcgYXQgdGhlIHdpbGRjYXJkIHJvdXRlLlxuICAgICAgLy8gV2Ugc2hvdWxkIGludmVzdGlnYXRlIGEgYmV0dGVyIHN0cmF0ZWd5IGZvciBhbnkgZXhpc3RpbmcgY2hpbGRyZW4uIE90aGVyd2lzZSwgdGhlc2VcbiAgICAgIC8vIGNoaWxkIHNlZ21lbnRzIGFyZSBzaWxlbnRseSBkcm9wcGVkIGZyb20gdGhlIG5hdmlnYXRpb24uXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2lzc3Vlcy80MDA4OVxuICAgICAgcmF3U2VnbWVudC5jaGlsZHJlbiA9IHt9O1xuICAgIH0gZWxzZSB7XG4gICAgICBtYXRjaFJlc3VsdCA9IG1hdGNoV2l0aENoZWNrcyhyYXdTZWdtZW50LCByb3V0ZSwgc2VnbWVudHMsIGluamVjdG9yLCB0aGlzLnVybFNlcmlhbGl6ZXIpO1xuICAgIH1cblxuICAgIHJldHVybiBtYXRjaFJlc3VsdC5waXBlKHN3aXRjaE1hcCgocmVzdWx0KSA9PiB7XG4gICAgICBpZiAoIXJlc3VsdC5tYXRjaGVkKSB7XG4gICAgICAgIHJldHVybiBub01hdGNoKHJhd1NlZ21lbnQpO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGUgcm91dGUgaGFzIGFuIGluamVjdG9yIGNyZWF0ZWQgZnJvbSBwcm92aWRlcnMsIHdlIHNob3VsZCBzdGFydCB1c2luZyB0aGF0LlxuICAgICAgaW5qZWN0b3IgPSByb3V0ZS5faW5qZWN0b3IgPz8gaW5qZWN0b3I7XG4gICAgICByZXR1cm4gdGhpcy5nZXRDaGlsZENvbmZpZyhpbmplY3Rvciwgcm91dGUsIHNlZ21lbnRzKVxuICAgICAgICAgIC5waXBlKHN3aXRjaE1hcCgoe3JvdXRlczogY2hpbGRDb25maWd9KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjaGlsZEluamVjdG9yID0gcm91dGUuX2xvYWRlZEluamVjdG9yID8/IGluamVjdG9yO1xuXG4gICAgICAgICAgICBjb25zdCB7Y29uc3VtZWRTZWdtZW50cywgcmVtYWluaW5nU2VnbWVudHMsIHBhcmFtZXRlcnN9ID0gcmVzdWx0O1xuICAgICAgICAgICAgY29uc3Qgc25hcHNob3QgPSBuZXcgQWN0aXZhdGVkUm91dGVTbmFwc2hvdChcbiAgICAgICAgICAgICAgICBjb25zdW1lZFNlZ21lbnRzLCBwYXJhbWV0ZXJzLCBPYmplY3QuZnJlZXplKHsuLi50aGlzLnVybFRyZWUucXVlcnlQYXJhbXN9KSxcbiAgICAgICAgICAgICAgICB0aGlzLnVybFRyZWUuZnJhZ21lbnQsIGdldERhdGEocm91dGUpLCBnZXRPdXRsZXQocm91dGUpLFxuICAgICAgICAgICAgICAgIHJvdXRlLmNvbXBvbmVudCA/PyByb3V0ZS5fbG9hZGVkQ29tcG9uZW50ID8/IG51bGwsIHJvdXRlLCBnZXRSZXNvbHZlKHJvdXRlKSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHtzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzfSA9XG4gICAgICAgICAgICAgICAgc3BsaXQocmF3U2VnbWVudCwgY29uc3VtZWRTZWdtZW50cywgcmVtYWluaW5nU2VnbWVudHMsIGNoaWxkQ29uZmlnKTtcblxuICAgICAgICAgICAgaWYgKHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiBzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzQ2hpbGRyZW4oY2hpbGRJbmplY3RvciwgY2hpbGRDb25maWcsIHNlZ21lbnRHcm91cClcbiAgICAgICAgICAgICAgICAgIC5waXBlKG1hcChjaGlsZHJlbiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZHJlbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVHJlZU5vZGUoc25hcHNob3QsIGNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGNoaWxkQ29uZmlnLmxlbmd0aCA9PT0gMCAmJiBzbGljZWRTZWdtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9mKG5ldyBUcmVlTm9kZShzbmFwc2hvdCwgW10pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgbWF0Y2hlZE9uT3V0bGV0ID0gZ2V0T3V0bGV0KHJvdXRlKSA9PT0gb3V0bGV0O1xuICAgICAgICAgICAgLy8gSWYgd2UgbWF0Y2hlZCBhIGNvbmZpZyBkdWUgdG8gZW1wdHkgcGF0aCBtYXRjaCBvbiBhIGRpZmZlcmVudCBvdXRsZXQsIHdlIG5lZWQgdG9cbiAgICAgICAgICAgIC8vIGNvbnRpbnVlIHBhc3NpbmcgdGhlIGN1cnJlbnQgb3V0bGV0IGZvciB0aGUgc2VnbWVudCByYXRoZXIgdGhhbiBzd2l0Y2ggdG8gUFJJTUFSWS5cbiAgICAgICAgICAgIC8vIE5vdGUgdGhhdCB3ZSBzd2l0Y2ggdG8gcHJpbWFyeSB3aGVuIHdlIGhhdmUgYSBtYXRjaCBiZWNhdXNlIG91dGxldCBjb25maWdzIGxvb2sgbGlrZVxuICAgICAgICAgICAgLy8gdGhpczoge3BhdGg6ICdhJywgb3V0bGV0OiAnYScsIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICAvLyAge3BhdGg6ICdiJywgY29tcG9uZW50OiBCfSxcbiAgICAgICAgICAgIC8vICB7cGF0aDogJ2MnLCBjb21wb25lbnQ6IEN9LFxuICAgICAgICAgICAgLy8gXX1cbiAgICAgICAgICAgIC8vIE5vdGljZSB0aGF0IHRoZSBjaGlsZHJlbiBvZiB0aGUgbmFtZWQgb3V0bGV0IGFyZSBjb25maWd1cmVkIHdpdGggdGhlIHByaW1hcnkgb3V0bGV0XG4gICAgICAgICAgICByZXR1cm4gdGhpc1xuICAgICAgICAgICAgICAgIC5wcm9jZXNzU2VnbWVudChcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRJbmplY3RvciwgY2hpbGRDb25maWcsIHNlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHMsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRPbk91dGxldCA/IFBSSU1BUllfT1VUTEVUIDogb3V0bGV0LCB0cnVlKVxuICAgICAgICAgICAgICAgIC5waXBlKG1hcChjaGlsZCA9PiB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFRyZWVOb2RlKHNuYXBzaG90LCBjaGlsZCBpbnN0YW5jZW9mIFRyZWVOb2RlID8gW2NoaWxkXSA6IFtdKTtcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgfSkpO1xuICAgIH0pKTtcbiAgfVxuICBwcml2YXRlIGdldENoaWxkQ29uZmlnKGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pOlxuICAgICAgT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWc+IHtcbiAgICBpZiAocm91dGUuY2hpbGRyZW4pIHtcbiAgICAgIC8vIFRoZSBjaGlsZHJlbiBiZWxvbmcgdG8gdGhlIHNhbWUgbW9kdWxlXG4gICAgICByZXR1cm4gb2Yoe3JvdXRlczogcm91dGUuY2hpbGRyZW4sIGluamVjdG9yfSk7XG4gICAgfVxuXG4gICAgaWYgKHJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgICAgLy8gbGF6eSBjaGlsZHJlbiBiZWxvbmcgdG8gdGhlIGxvYWRlZCBtb2R1bGVcbiAgICAgIGlmIChyb3V0ZS5fbG9hZGVkUm91dGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIG9mKHtyb3V0ZXM6IHJvdXRlLl9sb2FkZWRSb3V0ZXMsIGluamVjdG9yOiByb3V0ZS5fbG9hZGVkSW5qZWN0b3J9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJ1bkNhbkxvYWRHdWFyZHMoaW5qZWN0b3IsIHJvdXRlLCBzZWdtZW50cywgdGhpcy51cmxTZXJpYWxpemVyKVxuICAgICAgICAgIC5waXBlKG1lcmdlTWFwKChzaG91bGRMb2FkUmVzdWx0OiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgICBpZiAoc2hvdWxkTG9hZFJlc3VsdCkge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25maWdMb2FkZXIubG9hZENoaWxkcmVuKGluamVjdG9yLCByb3V0ZSlcbiAgICAgICAgICAgICAgICAgIC5waXBlKHRhcCgoY2ZnOiBMb2FkZWRSb3V0ZXJDb25maWcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUuX2xvYWRlZFJvdXRlcyA9IGNmZy5yb3V0ZXM7XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRJbmplY3RvciA9IGNmZy5pbmplY3RvcjtcbiAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjYW5Mb2FkRmFpbHMocm91dGUpO1xuICAgICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb2Yoe3JvdXRlczogW10sIGluamVjdG9yfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc29ydEFjdGl2YXRlZFJvdXRlU25hcHNob3RzKG5vZGVzOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PltdKTogdm9pZCB7XG4gIG5vZGVzLnNvcnQoKGEsIGIpID0+IHtcbiAgICBpZiAoYS52YWx1ZS5vdXRsZXQgPT09IFBSSU1BUllfT1VUTEVUKSByZXR1cm4gLTE7XG4gICAgaWYgKGIudmFsdWUub3V0bGV0ID09PSBQUklNQVJZX09VVExFVCkgcmV0dXJuIDE7XG4gICAgcmV0dXJuIGEudmFsdWUub3V0bGV0LmxvY2FsZUNvbXBhcmUoYi52YWx1ZS5vdXRsZXQpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gaGFzRW1wdHlQYXRoQ29uZmlnKG5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KSB7XG4gIGNvbnN0IGNvbmZpZyA9IG5vZGUudmFsdWUucm91dGVDb25maWc7XG4gIHJldHVybiBjb25maWcgJiYgY29uZmlnLnBhdGggPT09ICcnO1xufVxuXG4vKipcbiAqIEZpbmRzIGBUcmVlTm9kZWBzIHdpdGggbWF0Y2hpbmcgZW1wdHkgcGF0aCByb3V0ZSBjb25maWdzIGFuZCBtZXJnZXMgdGhlbSBpbnRvIGBUcmVlTm9kZWAgd2l0aFxuICogdGhlIGNoaWxkcmVuIGZyb20gZWFjaCBkdXBsaWNhdGUuIFRoaXMgaXMgbmVjZXNzYXJ5IGJlY2F1c2UgZGlmZmVyZW50IG91dGxldHMgY2FuIG1hdGNoIGFcbiAqIHNpbmdsZSBlbXB0eSBwYXRoIHJvdXRlIGNvbmZpZyBhbmQgdGhlIHJlc3VsdHMgbmVlZCB0byB0aGVuIGJlIG1lcmdlZC5cbiAqL1xuZnVuY3Rpb24gbWVyZ2VFbXB0eVBhdGhNYXRjaGVzKG5vZGVzOiBBcnJheTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4pOlxuICAgIEFycmF5PFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+PiB7XG4gIGNvbnN0IHJlc3VsdDogQXJyYXk8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4+ID0gW107XG4gIC8vIFRoZSBzZXQgb2Ygbm9kZXMgd2hpY2ggY29udGFpbiBjaGlsZHJlbiB0aGF0IHdlcmUgbWVyZ2VkIGZyb20gdHdvIGR1cGxpY2F0ZSBlbXB0eSBwYXRoIG5vZGVzLlxuICBjb25zdCBtZXJnZWROb2RlczogU2V0PFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+PiA9IG5ldyBTZXQoKTtcblxuICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICBpZiAoIWhhc0VtcHR5UGF0aENvbmZpZyhub2RlKSkge1xuICAgICAgcmVzdWx0LnB1c2gobm9kZSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBkdXBsaWNhdGVFbXB0eVBhdGhOb2RlID1cbiAgICAgICAgcmVzdWx0LmZpbmQocmVzdWx0Tm9kZSA9PiBub2RlLnZhbHVlLnJvdXRlQ29uZmlnID09PSByZXN1bHROb2RlLnZhbHVlLnJvdXRlQ29uZmlnKTtcbiAgICBpZiAoZHVwbGljYXRlRW1wdHlQYXRoTm9kZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBkdXBsaWNhdGVFbXB0eVBhdGhOb2RlLmNoaWxkcmVuLnB1c2goLi4ubm9kZS5jaGlsZHJlbik7XG4gICAgICBtZXJnZWROb2Rlcy5hZGQoZHVwbGljYXRlRW1wdHlQYXRoTm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdC5wdXNoKG5vZGUpO1xuICAgIH1cbiAgfVxuICAvLyBGb3IgZWFjaCBub2RlIHdoaWNoIGhhcyBjaGlsZHJlbiBmcm9tIG11bHRpcGxlIHNvdXJjZXMsIHdlIG5lZWQgdG8gcmVjb21wdXRlIGEgbmV3IGBUcmVlTm9kZWBcbiAgLy8gYnkgYWxzbyBtZXJnaW5nIHRob3NlIGNoaWxkcmVuLiBUaGlzIGlzIG5lY2Vzc2FyeSB3aGVuIHRoZXJlIGFyZSBtdWx0aXBsZSBlbXB0eSBwYXRoIGNvbmZpZ3NcbiAgLy8gaW4gYSByb3cuIFB1dCBhbm90aGVyIHdheTogd2hlbmV2ZXIgd2UgY29tYmluZSBjaGlsZHJlbiBvZiB0d28gbm9kZXMsIHdlIG5lZWQgdG8gYWxzbyBjaGVja1xuICAvLyBpZiBhbnkgb2YgdGhvc2UgY2hpbGRyZW4gY2FuIGJlIGNvbWJpbmVkIGludG8gYSBzaW5nbGUgbm9kZSBhcyB3ZWxsLlxuICBmb3IgKGNvbnN0IG1lcmdlZE5vZGUgb2YgbWVyZ2VkTm9kZXMpIHtcbiAgICBjb25zdCBtZXJnZWRDaGlsZHJlbiA9IG1lcmdlRW1wdHlQYXRoTWF0Y2hlcyhtZXJnZWROb2RlLmNoaWxkcmVuKTtcbiAgICByZXN1bHQucHVzaChuZXcgVHJlZU5vZGUobWVyZ2VkTm9kZS52YWx1ZSwgbWVyZ2VkQ2hpbGRyZW4pKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0LmZpbHRlcihuID0+ICFtZXJnZWROb2Rlcy5oYXMobikpO1xufVxuXG5mdW5jdGlvbiBjaGVja091dGxldE5hbWVVbmlxdWVuZXNzKG5vZGVzOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PltdKTogdm9pZCB7XG4gIGNvbnN0IG5hbWVzOiB7W2s6IHN0cmluZ106IEFjdGl2YXRlZFJvdXRlU25hcHNob3R9ID0ge307XG4gIG5vZGVzLmZvckVhY2gobiA9PiB7XG4gICAgY29uc3Qgcm91dGVXaXRoU2FtZU91dGxldE5hbWUgPSBuYW1lc1tuLnZhbHVlLm91dGxldF07XG4gICAgaWYgKHJvdXRlV2l0aFNhbWVPdXRsZXROYW1lKSB7XG4gICAgICBjb25zdCBwID0gcm91dGVXaXRoU2FtZU91dGxldE5hbWUudXJsLm1hcChzID0+IHMudG9TdHJpbmcoKSkuam9pbignLycpO1xuICAgICAgY29uc3QgYyA9IG4udmFsdWUudXJsLm1hcChzID0+IHMudG9TdHJpbmcoKSkuam9pbignLycpO1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLlRXT19TRUdNRU5UU19XSVRIX1NBTUVfT1VUTEVULFxuICAgICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmXG4gICAgICAgICAgICAgIGBUd28gc2VnbWVudHMgY2Fubm90IGhhdmUgdGhlIHNhbWUgb3V0bGV0IG5hbWU6ICcke3B9JyBhbmQgJyR7Y30nLmApO1xuICAgIH1cbiAgICBuYW1lc1tuLnZhbHVlLm91dGxldF0gPSBuLnZhbHVlO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0RGF0YShyb3V0ZTogUm91dGUpOiBEYXRhIHtcbiAgcmV0dXJuIHJvdXRlLmRhdGEgfHwge307XG59XG5cbmZ1bmN0aW9uIGdldFJlc29sdmUocm91dGU6IFJvdXRlKTogUmVzb2x2ZURhdGEge1xuICByZXR1cm4gcm91dGUucmVzb2x2ZSB8fCB7fTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlV2lsZGNhcmRNYXRjaFJlc3VsdChzZWdtZW50czogVXJsU2VnbWVudFtdKTogTWF0Y2hSZXN1bHQge1xuICByZXR1cm4ge1xuICAgIG1hdGNoZWQ6IHRydWUsXG4gICAgcGFyYW1ldGVyczogc2VnbWVudHMubGVuZ3RoID4gMCA/IGxhc3Qoc2VnbWVudHMpIS5wYXJhbWV0ZXJzIDoge30sXG4gICAgY29uc3VtZWRTZWdtZW50czogc2VnbWVudHMsXG4gICAgcmVtYWluaW5nU2VnbWVudHM6IFtdLFxuICAgIHBvc2l0aW9uYWxQYXJhbVNlZ21lbnRzOiB7fSxcbiAgfTtcbn1cbiJdfQ==