/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ɵRuntimeError as RuntimeError } from '@angular/core';
import { from, of } from 'rxjs';
import { catchError, concatMap, defaultIfEmpty, first, last, map, mergeMap, scan, switchMap, tap, } from 'rxjs/operators';
import { AbsoluteRedirect, ApplyRedirects, canLoadFails, noMatch, NoMatch } from './apply_redirects';
import { createUrlTreeFromSnapshot } from './create_url_tree';
import { runCanLoadGuards } from './operators/check_guards';
import { ActivatedRouteSnapshot, getInherited, RouterStateSnapshot, } from './router_state';
import { PRIMARY_OUTLET } from './shared';
import { getOutlet, sortByMatchingOutlets } from './utils/config';
import { emptyPathMatch, match, matchWithChecks, noLeftoversInUrl, split, } from './utils/config_matching';
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
    return new Recognizer(injector, configLoader, rootComponentType, config, urlTree, paramsInheritanceStrategy, urlSerializer).recognize();
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
        return new RuntimeError(4002 /* RuntimeErrorCode.NO_MATCH */, typeof ngDevMode === 'undefined' || ngDevMode
            ? `Cannot match any routes. URL Segment: '${e.segmentGroup}'`
            : `'${e.segmentGroup}'`);
    }
    recognize() {
        const rootSegmentGroup = split(this.urlTree.root, [], [], this.config).segmentGroup;
        return this.match(rootSegmentGroup).pipe(map(({ children, rootSnapshot }) => {
            const rootNode = new TreeNode(rootSnapshot, children);
            const routeState = new RouterStateSnapshot('', rootNode);
            const tree = createUrlTreeFromSnapshot(rootSnapshot, [], this.urlTree.queryParams, this.urlTree.fragment);
            // https://github.com/angular/angular/issues/47307
            // Creating the tree stringifies the query params
            // We don't want to do this here so reassign them to the original.
            tree.queryParams = this.urlTree.queryParams;
            routeState.url = this.urlSerializer.serialize(tree);
            return { state: routeState, tree };
        }));
    }
    match(rootSegmentGroup) {
        // Use Object.freeze to prevent readers of the Router state from modifying it outside
        // of a navigation, resulting in the router being out of sync with the browser.
        const rootSnapshot = new ActivatedRouteSnapshot([], Object.freeze({}), Object.freeze({ ...this.urlTree.queryParams }), this.urlTree.fragment, Object.freeze({}), PRIMARY_OUTLET, this.rootComponentType, null, {});
        return this.processSegmentGroup(this.injector, this.config, rootSegmentGroup, PRIMARY_OUTLET, rootSnapshot).pipe(map((children) => {
            return { children, rootSnapshot };
        }), catchError((e) => {
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
    processSegmentGroup(injector, config, segmentGroup, outlet, parentRoute) {
        if (segmentGroup.segments.length === 0 && segmentGroup.hasChildren()) {
            return this.processChildren(injector, config, segmentGroup, parentRoute);
        }
        return this.processSegment(injector, config, segmentGroup, segmentGroup.segments, outlet, true, parentRoute).pipe(map((child) => (child instanceof TreeNode ? [child] : [])));
    }
    /**
     * Matches every child outlet in the `segmentGroup` to a `Route` in the config. Returns `null` if
     * we cannot find a match for _any_ of the children.
     *
     * @param config - The `Routes` to match against
     * @param segmentGroup - The `UrlSegmentGroup` whose children need to be matched against the
     *     config.
     */
    processChildren(injector, config, segmentGroup, parentRoute) {
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
        return from(childOutlets).pipe(concatMap((childOutlet) => {
            const child = segmentGroup.children[childOutlet];
            // Sort the config so that routes with outlets that match the one being activated
            // appear first, followed by routes for other outlets, which might match if they have
            // an empty path.
            const sortedConfig = sortByMatchingOutlets(config, childOutlet);
            return this.processSegmentGroup(injector, sortedConfig, child, childOutlet, parentRoute);
        }), scan((children, outletChildren) => {
            children.push(...outletChildren);
            return children;
        }), defaultIfEmpty(null), last(), mergeMap((children) => {
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
    processSegment(injector, routes, segmentGroup, segments, outlet, allowRedirects, parentRoute) {
        return from(routes).pipe(concatMap((r) => {
            return this.processSegmentAgainstRoute(r._injector ?? injector, routes, r, segmentGroup, segments, outlet, allowRedirects, parentRoute).pipe(catchError((e) => {
                if (e instanceof NoMatch) {
                    return of(null);
                }
                throw e;
            }));
        }), first((x) => !!x), catchError((e) => {
            if (isEmptyError(e)) {
                if (noLeftoversInUrl(segmentGroup, segments, outlet)) {
                    return of(new NoLeftoversInUrl());
                }
                return noMatch(segmentGroup);
            }
            throw e;
        }));
    }
    processSegmentAgainstRoute(injector, routes, route, rawSegment, segments, outlet, allowRedirects, parentRoute) {
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
            return noMatch(rawSegment);
        }
        if (route.redirectTo === undefined) {
            return this.matchSegmentAgainstRoute(injector, rawSegment, route, segments, outlet, parentRoute);
        }
        if (this.allowRedirects && allowRedirects) {
            return this.expandSegmentAgainstRouteUsingRedirect(injector, rawSegment, routes, route, segments, outlet, parentRoute);
        }
        return noMatch(rawSegment);
    }
    expandSegmentAgainstRouteUsingRedirect(injector, segmentGroup, routes, route, segments, outlet, parentRoute) {
        const { matched, parameters, consumedSegments, positionalParamSegments, remainingSegments } = match(segmentGroup, route, segments);
        if (!matched)
            return noMatch(segmentGroup);
        // TODO(atscott): Move all of this under an if(ngDevMode) as a breaking change and allow stack
        // size exceeded in production
        if (typeof route.redirectTo === 'string' && route.redirectTo[0] === '/') {
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
        const currentSnapshot = new ActivatedRouteSnapshot(segments, parameters, Object.freeze({ ...this.urlTree.queryParams }), this.urlTree.fragment, getData(route), getOutlet(route), route.component ?? route._loadedComponent ?? null, route, getResolve(route));
        const inherited = getInherited(currentSnapshot, parentRoute, this.paramsInheritanceStrategy);
        currentSnapshot.params = Object.freeze(inherited.params);
        currentSnapshot.data = Object.freeze(inherited.data);
        const newTree = this.applyRedirects.applyRedirectCommands(consumedSegments, route.redirectTo, positionalParamSegments, currentSnapshot, injector);
        return this.applyRedirects.lineralizeSegments(route, newTree).pipe(mergeMap((newSegments) => {
            return this.processSegment(injector, routes, segmentGroup, newSegments.concat(remainingSegments), outlet, false, parentRoute);
        }));
    }
    matchSegmentAgainstRoute(injector, rawSegment, route, segments, outlet, parentRoute) {
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
            return this.getChildConfig(injector, route, segments).pipe(switchMap(({ routes: childConfig }) => {
                const childInjector = route._loadedInjector ?? injector;
                const { parameters, consumedSegments, remainingSegments } = result;
                const snapshot = new ActivatedRouteSnapshot(consumedSegments, parameters, Object.freeze({ ...this.urlTree.queryParams }), this.urlTree.fragment, getData(route), getOutlet(route), route.component ?? route._loadedComponent ?? null, route, getResolve(route));
                const inherited = getInherited(snapshot, parentRoute, this.paramsInheritanceStrategy);
                snapshot.params = Object.freeze(inherited.params);
                snapshot.data = Object.freeze(inherited.data);
                const { segmentGroup, slicedSegments } = split(rawSegment, consumedSegments, remainingSegments, childConfig);
                if (slicedSegments.length === 0 && segmentGroup.hasChildren()) {
                    return this.processChildren(childInjector, childConfig, segmentGroup, snapshot).pipe(map((children) => {
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
                return this.processSegment(childInjector, childConfig, segmentGroup, slicedSegments, matchedOnOutlet ? PRIMARY_OUTLET : outlet, true, snapshot).pipe(map((child) => {
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
            return runCanLoadGuards(injector, route, segments, this.urlSerializer).pipe(mergeMap((shouldLoadResult) => {
                if (shouldLoadResult) {
                    return this.configLoader.loadChildren(injector, route).pipe(tap((cfg) => {
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
        const duplicateEmptyPathNode = result.find((resultNode) => node.value.routeConfig === resultNode.value.routeConfig);
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
    return result.filter((n) => !mergedNodes.has(n));
}
function checkOutletNameUniqueness(nodes) {
    const names = {};
    nodes.forEach((n) => {
        const routeWithSameOutletName = names[n.value.outlet];
        if (routeWithSameOutletName) {
            const p = routeWithSameOutletName.url.map((s) => s.toString()).join('/');
            const c = n.value.url.map((s) => s.toString()).join('/');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb2duaXplLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yZWNvZ25pemUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUE0QixhQUFhLElBQUksWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3ZGLE9BQU8sRUFBQyxJQUFJLEVBQWMsRUFBRSxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQzFDLE9BQU8sRUFDTCxVQUFVLEVBQ1YsU0FBUyxFQUNULGNBQWMsRUFDZCxLQUFLLEVBQ0wsSUFBSSxFQUNKLEdBQUcsRUFDSCxRQUFRLEVBQ1IsSUFBSSxFQUNKLFNBQVMsRUFDVCxHQUFHLEdBQ0osTUFBTSxnQkFBZ0IsQ0FBQztBQUV4QixPQUFPLEVBQUMsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDbkcsT0FBTyxFQUFDLHlCQUF5QixFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFHNUQsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0sMEJBQTBCLENBQUM7QUFFMUQsT0FBTyxFQUNMLHNCQUFzQixFQUN0QixZQUFZLEVBRVosbUJBQW1CLEdBQ3BCLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEIsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUV4QyxPQUFPLEVBQUMsU0FBUyxFQUFFLHFCQUFxQixFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDaEUsT0FBTyxFQUNMLGNBQWMsRUFDZCxLQUFLLEVBQ0wsZUFBZSxFQUNmLGdCQUFnQixFQUNoQixLQUFLLEdBQ04sTUFBTSx5QkFBeUIsQ0FBQztBQUNqQyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sY0FBYyxDQUFDO0FBQ3RDLE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztB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QUMsR0FBRyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekQsTUFBTSxJQUFJLFlBQVksNERBRXBCLENBQUMsT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLFNBQVMsQ0FBQztnQkFDN0MsbURBQW1ELENBQUMsVUFBVSxDQUFDLElBQUksQ0FDdEUsQ0FBQztRQUNKLENBQUM7UUFDRCxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ2xDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELFNBQVMsT0FBTyxDQUFDLEtBQVk7SUFDM0IsT0FBTyxLQUFLLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztBQUMxQixDQUFDO0FBRUQsU0FBUyxVQUFVLENBQUMsS0FBWTtJQUM5QixPQUFPLEtBQUssQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDO0FBQzdCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFbnZpcm9ubWVudEluamVjdG9yLCBUeXBlLCDJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtmcm9tLCBPYnNlcnZhYmxlLCBvZn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge1xuICBjYXRjaEVycm9yLFxuICBjb25jYXRNYXAsXG4gIGRlZmF1bHRJZkVtcHR5LFxuICBmaXJzdCxcbiAgbGFzdCxcbiAgbWFwLFxuICBtZXJnZU1hcCxcbiAgc2NhbixcbiAgc3dpdGNoTWFwLFxuICB0YXAsXG59IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtBYnNvbHV0ZVJlZGlyZWN0LCBBcHBseVJlZGlyZWN0cywgY2FuTG9hZEZhaWxzLCBub01hdGNoLCBOb01hdGNofSBmcm9tICcuL2FwcGx5X3JlZGlyZWN0cyc7XG5pbXBvcnQge2NyZWF0ZVVybFRyZWVGcm9tU25hcHNob3R9IGZyb20gJy4vY3JlYXRlX3VybF90cmVlJztcbmltcG9ydCB7UnVudGltZUVycm9yQ29kZX0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IHtEYXRhLCBMb2FkZWRSb3V0ZXJDb25maWcsIFJlc29sdmVEYXRhLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge3J1bkNhbkxvYWRHdWFyZHN9IGZyb20gJy4vb3BlcmF0b3JzL2NoZWNrX2d1YXJkcyc7XG5pbXBvcnQge1JvdXRlckNvbmZpZ0xvYWRlcn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge1xuICBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LFxuICBnZXRJbmhlcml0ZWQsXG4gIFBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3ksXG4gIFJvdXRlclN0YXRlU25hcHNob3QsXG59IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UFJJTUFSWV9PVVRMRVR9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7VXJsU2VnbWVudCwgVXJsU2VnbWVudEdyb3VwLCBVcmxTZXJpYWxpemVyLCBVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcbmltcG9ydCB7Z2V0T3V0bGV0LCBzb3J0QnlNYXRjaGluZ091dGxldHN9IGZyb20gJy4vdXRpbHMvY29uZmlnJztcbmltcG9ydCB7XG4gIGVtcHR5UGF0aE1hdGNoLFxuICBtYXRjaCxcbiAgbWF0Y2hXaXRoQ2hlY2tzLFxuICBub0xlZnRvdmVyc0luVXJsLFxuICBzcGxpdCxcbn0gZnJvbSAnLi91dGlscy9jb25maWdfbWF0Y2hpbmcnO1xuaW1wb3J0IHtUcmVlTm9kZX0gZnJvbSAnLi91dGlscy90cmVlJztcbmltcG9ydCB7aXNFbXB0eUVycm9yfSBmcm9tICcuL3V0aWxzL3R5cGVfZ3VhcmRzJztcblxuLyoqXG4gKiBDbGFzcyB1c2VkIHRvIGluZGljYXRlIHRoZXJlIHdlcmUgbm8gYWRkaXRpb25hbCByb3V0ZSBjb25maWcgbWF0Y2hlcyBidXQgdGhhdCBhbGwgc2VnbWVudHMgb2ZcbiAqIHRoZSBVUkwgd2VyZSBjb25zdW1lZCBkdXJpbmcgbWF0Y2hpbmcgc28gdGhlIHJvdXRlIHdhcyBVUkwgbWF0Y2hlZC4gV2hlbiB0aGlzIGhhcHBlbnMsIHdlIHN0aWxsXG4gKiB0cnkgdG8gbWF0Y2ggY2hpbGQgY29uZmlncyBpbiBjYXNlIHRoZXJlIGFyZSBlbXB0eSBwYXRoIGNoaWxkcmVuLlxuICovXG5jbGFzcyBOb0xlZnRvdmVyc0luVXJsIHt9XG5cbmV4cG9ydCBmdW5jdGlvbiByZWNvZ25pemUoXG4gIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLFxuICBjb25maWdMb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcixcbiAgcm9vdENvbXBvbmVudFR5cGU6IFR5cGU8YW55PiB8IG51bGwsXG4gIGNvbmZpZzogUm91dGVzLFxuICB1cmxUcmVlOiBVcmxUcmVlLFxuICB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiBQYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5ID0gJ2VtcHR5T25seScsXG4pOiBPYnNlcnZhYmxlPHtzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdDsgdHJlZTogVXJsVHJlZX0+IHtcbiAgcmV0dXJuIG5ldyBSZWNvZ25pemVyKFxuICAgIGluamVjdG9yLFxuICAgIGNvbmZpZ0xvYWRlcixcbiAgICByb290Q29tcG9uZW50VHlwZSxcbiAgICBjb25maWcsXG4gICAgdXJsVHJlZSxcbiAgICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LFxuICAgIHVybFNlcmlhbGl6ZXIsXG4gICkucmVjb2duaXplKCk7XG59XG5cbmNvbnN0IE1BWF9BTExPV0VEX1JFRElSRUNUUyA9IDMxO1xuXG5leHBvcnQgY2xhc3MgUmVjb2duaXplciB7XG4gIHByaXZhdGUgYXBwbHlSZWRpcmVjdHMgPSBuZXcgQXBwbHlSZWRpcmVjdHModGhpcy51cmxTZXJpYWxpemVyLCB0aGlzLnVybFRyZWUpO1xuICBwcml2YXRlIGFic29sdXRlUmVkaXJlY3RDb3VudCA9IDA7XG4gIGFsbG93UmVkaXJlY3RzID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLFxuICAgIHByaXZhdGUgY29uZmlnTG9hZGVyOiBSb3V0ZXJDb25maWdMb2FkZXIsXG4gICAgcHJpdmF0ZSByb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+IHwgbnVsbCxcbiAgICBwcml2YXRlIGNvbmZpZzogUm91dGVzLFxuICAgIHByaXZhdGUgdXJsVHJlZTogVXJsVHJlZSxcbiAgICBwcml2YXRlIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6IFBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3ksXG4gICAgcHJpdmF0ZSByZWFkb25seSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICApIHt9XG5cbiAgcHJpdmF0ZSBub01hdGNoRXJyb3IoZTogTm9NYXRjaCk6IFJ1bnRpbWVFcnJvcjxSdW50aW1lRXJyb3JDb2RlLk5PX01BVENIPiB7XG4gICAgcmV0dXJuIG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICBSdW50aW1lRXJyb3JDb2RlLk5PX01BVENILFxuICAgICAgdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlXG4gICAgICAgID8gYENhbm5vdCBtYXRjaCBhbnkgcm91dGVzLiBVUkwgU2VnbWVudDogJyR7ZS5zZWdtZW50R3JvdXB9J2BcbiAgICAgICAgOiBgJyR7ZS5zZWdtZW50R3JvdXB9J2AsXG4gICAgKTtcbiAgfVxuXG4gIHJlY29nbml6ZSgpOiBPYnNlcnZhYmxlPHtzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdDsgdHJlZTogVXJsVHJlZX0+IHtcbiAgICBjb25zdCByb290U2VnbWVudEdyb3VwID0gc3BsaXQodGhpcy51cmxUcmVlLnJvb3QsIFtdLCBbXSwgdGhpcy5jb25maWcpLnNlZ21lbnRHcm91cDtcblxuICAgIHJldHVybiB0aGlzLm1hdGNoKHJvb3RTZWdtZW50R3JvdXApLnBpcGUoXG4gICAgICBtYXAoKHtjaGlsZHJlbiwgcm9vdFNuYXBzaG90fSkgPT4ge1xuICAgICAgICBjb25zdCByb290Tm9kZSA9IG5ldyBUcmVlTm9kZShyb290U25hcHNob3QsIGNoaWxkcmVuKTtcbiAgICAgICAgY29uc3Qgcm91dGVTdGF0ZSA9IG5ldyBSb3V0ZXJTdGF0ZVNuYXBzaG90KCcnLCByb290Tm9kZSk7XG4gICAgICAgIGNvbnN0IHRyZWUgPSBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KFxuICAgICAgICAgIHJvb3RTbmFwc2hvdCxcbiAgICAgICAgICBbXSxcbiAgICAgICAgICB0aGlzLnVybFRyZWUucXVlcnlQYXJhbXMsXG4gICAgICAgICAgdGhpcy51cmxUcmVlLmZyYWdtZW50LFxuICAgICAgICApO1xuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2lzc3Vlcy80NzMwN1xuICAgICAgICAvLyBDcmVhdGluZyB0aGUgdHJlZSBzdHJpbmdpZmllcyB0aGUgcXVlcnkgcGFyYW1zXG4gICAgICAgIC8vIFdlIGRvbid0IHdhbnQgdG8gZG8gdGhpcyBoZXJlIHNvIHJlYXNzaWduIHRoZW0gdG8gdGhlIG9yaWdpbmFsLlxuICAgICAgICB0cmVlLnF1ZXJ5UGFyYW1zID0gdGhpcy51cmxUcmVlLnF1ZXJ5UGFyYW1zO1xuICAgICAgICByb3V0ZVN0YXRlLnVybCA9IHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodHJlZSk7XG4gICAgICAgIHJldHVybiB7c3RhdGU6IHJvdXRlU3RhdGUsIHRyZWV9O1xuICAgICAgfSksXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgbWF0Y2gocm9vdFNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKTogT2JzZXJ2YWJsZTx7XG4gICAgY2hpbGRyZW46IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W107XG4gICAgcm9vdFNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90O1xuICB9PiB7XG4gICAgLy8gVXNlIE9iamVjdC5mcmVlemUgdG8gcHJldmVudCByZWFkZXJzIG9mIHRoZSBSb3V0ZXIgc3RhdGUgZnJvbSBtb2RpZnlpbmcgaXQgb3V0c2lkZVxuICAgIC8vIG9mIGEgbmF2aWdhdGlvbiwgcmVzdWx0aW5nIGluIHRoZSByb3V0ZXIgYmVpbmcgb3V0IG9mIHN5bmMgd2l0aCB0aGUgYnJvd3Nlci5cbiAgICBjb25zdCByb290U25hcHNob3QgPSBuZXcgQWN0aXZhdGVkUm91dGVTbmFwc2hvdChcbiAgICAgIFtdLFxuICAgICAgT2JqZWN0LmZyZWV6ZSh7fSksXG4gICAgICBPYmplY3QuZnJlZXplKHsuLi50aGlzLnVybFRyZWUucXVlcnlQYXJhbXN9KSxcbiAgICAgIHRoaXMudXJsVHJlZS5mcmFnbWVudCxcbiAgICAgIE9iamVjdC5mcmVlemUoe30pLFxuICAgICAgUFJJTUFSWV9PVVRMRVQsXG4gICAgICB0aGlzLnJvb3RDb21wb25lbnRUeXBlLFxuICAgICAgbnVsbCxcbiAgICAgIHt9LFxuICAgICk7XG4gICAgcmV0dXJuIHRoaXMucHJvY2Vzc1NlZ21lbnRHcm91cChcbiAgICAgIHRoaXMuaW5qZWN0b3IsXG4gICAgICB0aGlzLmNvbmZpZyxcbiAgICAgIHJvb3RTZWdtZW50R3JvdXAsXG4gICAgICBQUklNQVJZX09VVExFVCxcbiAgICAgIHJvb3RTbmFwc2hvdCxcbiAgICApLnBpcGUoXG4gICAgICBtYXAoKGNoaWxkcmVuKSA9PiB7XG4gICAgICAgIHJldHVybiB7Y2hpbGRyZW4sIHJvb3RTbmFwc2hvdH07XG4gICAgICB9KSxcbiAgICAgIGNhdGNoRXJyb3IoKGU6IGFueSkgPT4ge1xuICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIEFic29sdXRlUmVkaXJlY3QpIHtcbiAgICAgICAgICB0aGlzLnVybFRyZWUgPSBlLnVybFRyZWU7XG4gICAgICAgICAgcmV0dXJuIHRoaXMubWF0Y2goZS51cmxUcmVlLnJvb3QpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9NYXRjaCkge1xuICAgICAgICAgIHRocm93IHRoaXMubm9NYXRjaEVycm9yKGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH0pLFxuICAgICk7XG4gIH1cblxuICBwcm9jZXNzU2VnbWVudEdyb3VwKFxuICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLFxuICAgIGNvbmZpZzogUm91dGVbXSxcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCxcbiAgICBvdXRsZXQ6IHN0cmluZyxcbiAgICBwYXJlbnRSb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCxcbiAgKTogT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PltdPiB7XG4gICAgaWYgKHNlZ21lbnRHcm91cC5zZWdtZW50cy5sZW5ndGggPT09IDAgJiYgc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NDaGlsZHJlbihpbmplY3RvciwgY29uZmlnLCBzZWdtZW50R3JvdXAsIHBhcmVudFJvdXRlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5wcm9jZXNzU2VnbWVudChcbiAgICAgIGluamVjdG9yLFxuICAgICAgY29uZmlnLFxuICAgICAgc2VnbWVudEdyb3VwLFxuICAgICAgc2VnbWVudEdyb3VwLnNlZ21lbnRzLFxuICAgICAgb3V0bGV0LFxuICAgICAgdHJ1ZSxcbiAgICAgIHBhcmVudFJvdXRlLFxuICAgICkucGlwZShtYXAoKGNoaWxkKSA9PiAoY2hpbGQgaW5zdGFuY2VvZiBUcmVlTm9kZSA/IFtjaGlsZF0gOiBbXSkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNYXRjaGVzIGV2ZXJ5IGNoaWxkIG91dGxldCBpbiB0aGUgYHNlZ21lbnRHcm91cGAgdG8gYSBgUm91dGVgIGluIHRoZSBjb25maWcuIFJldHVybnMgYG51bGxgIGlmXG4gICAqIHdlIGNhbm5vdCBmaW5kIGEgbWF0Y2ggZm9yIF9hbnlfIG9mIHRoZSBjaGlsZHJlbi5cbiAgICpcbiAgICogQHBhcmFtIGNvbmZpZyAtIFRoZSBgUm91dGVzYCB0byBtYXRjaCBhZ2FpbnN0XG4gICAqIEBwYXJhbSBzZWdtZW50R3JvdXAgLSBUaGUgYFVybFNlZ21lbnRHcm91cGAgd2hvc2UgY2hpbGRyZW4gbmVlZCB0byBiZSBtYXRjaGVkIGFnYWluc3QgdGhlXG4gICAqICAgICBjb25maWcuXG4gICAqL1xuICBwcm9jZXNzQ2hpbGRyZW4oXG4gICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsXG4gICAgY29uZmlnOiBSb3V0ZVtdLFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLFxuICAgIHBhcmVudFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LFxuICApOiBPYnNlcnZhYmxlPFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10+IHtcbiAgICAvLyBFeHBhbmQgb3V0bGV0cyBvbmUgYXQgYSB0aW1lLCBzdGFydGluZyB3aXRoIHRoZSBwcmltYXJ5IG91dGxldC4gV2UgbmVlZCB0byBkbyBpdCB0aGlzIHdheVxuICAgIC8vIGJlY2F1c2UgYW4gYWJzb2x1dGUgcmVkaXJlY3QgZnJvbSB0aGUgcHJpbWFyeSBvdXRsZXQgdGFrZXMgcHJlY2VkZW5jZS5cbiAgICBjb25zdCBjaGlsZE91dGxldHM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBPYmplY3Qua2V5cyhzZWdtZW50R3JvdXAuY2hpbGRyZW4pKSB7XG4gICAgICBpZiAoY2hpbGQgPT09ICdwcmltYXJ5Jykge1xuICAgICAgICBjaGlsZE91dGxldHMudW5zaGlmdChjaGlsZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGlsZE91dGxldHMucHVzaChjaGlsZCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmcm9tKGNoaWxkT3V0bGV0cykucGlwZShcbiAgICAgIGNvbmNhdE1hcCgoY2hpbGRPdXRsZXQpID0+IHtcbiAgICAgICAgY29uc3QgY2hpbGQgPSBzZWdtZW50R3JvdXAuY2hpbGRyZW5bY2hpbGRPdXRsZXRdO1xuICAgICAgICAvLyBTb3J0IHRoZSBjb25maWcgc28gdGhhdCByb3V0ZXMgd2l0aCBvdXRsZXRzIHRoYXQgbWF0Y2ggdGhlIG9uZSBiZWluZyBhY3RpdmF0ZWRcbiAgICAgICAgLy8gYXBwZWFyIGZpcnN0LCBmb2xsb3dlZCBieSByb3V0ZXMgZm9yIG90aGVyIG91dGxldHMsIHdoaWNoIG1pZ2h0IG1hdGNoIGlmIHRoZXkgaGF2ZVxuICAgICAgICAvLyBhbiBlbXB0eSBwYXRoLlxuICAgICAgICBjb25zdCBzb3J0ZWRDb25maWcgPSBzb3J0QnlNYXRjaGluZ091dGxldHMoY29uZmlnLCBjaGlsZE91dGxldCk7XG4gICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NTZWdtZW50R3JvdXAoaW5qZWN0b3IsIHNvcnRlZENvbmZpZywgY2hpbGQsIGNoaWxkT3V0bGV0LCBwYXJlbnRSb3V0ZSk7XG4gICAgICB9KSxcbiAgICAgIHNjYW4oKGNoaWxkcmVuLCBvdXRsZXRDaGlsZHJlbikgPT4ge1xuICAgICAgICBjaGlsZHJlbi5wdXNoKC4uLm91dGxldENoaWxkcmVuKTtcbiAgICAgICAgcmV0dXJuIGNoaWxkcmVuO1xuICAgICAgfSksXG4gICAgICBkZWZhdWx0SWZFbXB0eShudWxsIGFzIFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10gfCBudWxsKSxcbiAgICAgIGxhc3QoKSxcbiAgICAgIG1lcmdlTWFwKChjaGlsZHJlbikgPT4ge1xuICAgICAgICBpZiAoY2hpbGRyZW4gPT09IG51bGwpIHJldHVybiBub01hdGNoKHNlZ21lbnRHcm91cCk7XG4gICAgICAgIC8vIEJlY2F1c2Ugd2UgbWF5IGhhdmUgbWF0Y2hlZCB0d28gb3V0bGV0cyB0byB0aGUgc2FtZSBlbXB0eSBwYXRoIHNlZ21lbnQsIHdlIGNhbiBoYXZlXG4gICAgICAgIC8vIG11bHRpcGxlIGFjdGl2YXRlZCByZXN1bHRzIGZvciB0aGUgc2FtZSBvdXRsZXQuIFdlIHNob3VsZCBtZXJnZSB0aGUgY2hpbGRyZW4gb2ZcbiAgICAgICAgLy8gdGhlc2UgcmVzdWx0cyBzbyB0aGUgZmluYWwgcmV0dXJuIHZhbHVlIGlzIG9ubHkgb25lIGBUcmVlTm9kZWAgcGVyIG91dGxldC5cbiAgICAgICAgY29uc3QgbWVyZ2VkQ2hpbGRyZW4gPSBtZXJnZUVtcHR5UGF0aE1hdGNoZXMoY2hpbGRyZW4pO1xuICAgICAgICBpZiAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSB7XG4gICAgICAgICAgLy8gVGhpcyBzaG91bGQgcmVhbGx5IG5ldmVyIGhhcHBlbiAtIHdlIGFyZSBvbmx5IHRha2luZyB0aGUgZmlyc3QgbWF0Y2ggZm9yIGVhY2hcbiAgICAgICAgICAvLyBvdXRsZXQgYW5kIG1lcmdlIHRoZSBlbXB0eSBwYXRoIG1hdGNoZXMuXG4gICAgICAgICAgY2hlY2tPdXRsZXROYW1lVW5pcXVlbmVzcyhtZXJnZWRDaGlsZHJlbik7XG4gICAgICAgIH1cbiAgICAgICAgc29ydEFjdGl2YXRlZFJvdXRlU25hcHNob3RzKG1lcmdlZENoaWxkcmVuKTtcbiAgICAgICAgcmV0dXJuIG9mKG1lcmdlZENoaWxkcmVuKTtcbiAgICAgIH0pLFxuICAgICk7XG4gIH1cblxuICBwcm9jZXNzU2VnbWVudChcbiAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvcixcbiAgICByb3V0ZXM6IFJvdXRlW10sXG4gICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsXG4gICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICBvdXRsZXQ6IHN0cmluZyxcbiAgICBhbGxvd1JlZGlyZWN0czogYm9vbGVhbixcbiAgICBwYXJlbnRSb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCxcbiAgKTogT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PiB8IE5vTGVmdG92ZXJzSW5Vcmw+IHtcbiAgICByZXR1cm4gZnJvbShyb3V0ZXMpLnBpcGUoXG4gICAgICBjb25jYXRNYXAoKHIpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1NlZ21lbnRBZ2FpbnN0Um91dGUoXG4gICAgICAgICAgci5faW5qZWN0b3IgPz8gaW5qZWN0b3IsXG4gICAgICAgICAgcm91dGVzLFxuICAgICAgICAgIHIsXG4gICAgICAgICAgc2VnbWVudEdyb3VwLFxuICAgICAgICAgIHNlZ21lbnRzLFxuICAgICAgICAgIG91dGxldCxcbiAgICAgICAgICBhbGxvd1JlZGlyZWN0cyxcbiAgICAgICAgICBwYXJlbnRSb3V0ZSxcbiAgICAgICAgKS5waXBlKFxuICAgICAgICAgIGNhdGNoRXJyb3IoKGU6IGFueSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOb01hdGNoKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvZihudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfSksXG4gICAgICAgICk7XG4gICAgICB9KSxcbiAgICAgIGZpcnN0KCh4KTogeCBpcyBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PiB8IE5vTGVmdG92ZXJzSW5VcmwgPT4gISF4KSxcbiAgICAgIGNhdGNoRXJyb3IoKGUpID0+IHtcbiAgICAgICAgaWYgKGlzRW1wdHlFcnJvcihlKSkge1xuICAgICAgICAgIGlmIChub0xlZnRvdmVyc0luVXJsKHNlZ21lbnRHcm91cCwgc2VnbWVudHMsIG91dGxldCkpIHtcbiAgICAgICAgICAgIHJldHVybiBvZihuZXcgTm9MZWZ0b3ZlcnNJblVybCgpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG5vTWF0Y2goc2VnbWVudEdyb3VwKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBlO1xuICAgICAgfSksXG4gICAgKTtcbiAgfVxuXG4gIHByb2Nlc3NTZWdtZW50QWdhaW5zdFJvdXRlKFxuICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLFxuICAgIHJvdXRlczogUm91dGVbXSxcbiAgICByb3V0ZTogUm91dGUsXG4gICAgcmF3U2VnbWVudDogVXJsU2VnbWVudEdyb3VwLFxuICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgb3V0bGV0OiBzdHJpbmcsXG4gICAgYWxsb3dSZWRpcmVjdHM6IGJvb2xlYW4sXG4gICAgcGFyZW50Um91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsXG4gICk6IE9ic2VydmFibGU8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4gfCBOb0xlZnRvdmVyc0luVXJsPiB7XG4gICAgLy8gV2UgYWxsb3cgbWF0Y2hlcyB0byBlbXB0eSBwYXRocyB3aGVuIHRoZSBvdXRsZXRzIGRpZmZlciBzbyB3ZSBjYW4gbWF0Y2ggYSB1cmwgbGlrZSBgLyhiOmIpYCB0b1xuICAgIC8vIGEgY29uZmlnIGxpa2VcbiAgICAvLyAqIGB7cGF0aDogJycsIGNoaWxkcmVuOiBbe3BhdGg6ICdiJywgb3V0bGV0OiAnYid9XX1gXG4gICAgLy8gb3IgZXZlblxuICAgIC8vICogYHtwYXRoOiAnJywgb3V0bGV0OiAnYScsIGNoaWxkcmVuOiBbe3BhdGg6ICdiJywgb3V0bGV0OiAnYid9XWBcbiAgICAvL1xuICAgIC8vIFRoZSBleGNlcHRpb24gaGVyZSBpcyB3aGVuIHRoZSBzZWdtZW50IG91dGxldCBpcyBmb3IgdGhlIHByaW1hcnkgb3V0bGV0LiBUaGlzIHdvdWxkXG4gICAgLy8gcmVzdWx0IGluIGEgbWF0Y2ggaW5zaWRlIHRoZSBuYW1lZCBvdXRsZXQgYmVjYXVzZSBhbGwgY2hpbGRyZW4gdGhlcmUgYXJlIHdyaXR0ZW4gYXMgcHJpbWFyeVxuICAgIC8vIG91dGxldHMuIFNvIHdlIG5lZWQgdG8gcHJldmVudCBjaGlsZCBuYW1lZCBvdXRsZXQgbWF0Y2hlcyBpbiBhIHVybCBsaWtlIGAvYmAgaW4gYSBjb25maWcgbGlrZVxuICAgIC8vICogYHtwYXRoOiAnJywgb3V0bGV0OiAneCcgY2hpbGRyZW46IFt7cGF0aDogJ2InfV19YFxuICAgIC8vIFRoaXMgc2hvdWxkIG9ubHkgbWF0Y2ggaWYgdGhlIHVybCBpcyBgLyh4OmIpYC5cbiAgICBpZiAoXG4gICAgICBnZXRPdXRsZXQocm91dGUpICE9PSBvdXRsZXQgJiZcbiAgICAgIChvdXRsZXQgPT09IFBSSU1BUllfT1VUTEVUIHx8ICFlbXB0eVBhdGhNYXRjaChyYXdTZWdtZW50LCBzZWdtZW50cywgcm91dGUpKVxuICAgICkge1xuICAgICAgcmV0dXJuIG5vTWF0Y2gocmF3U2VnbWVudCk7XG4gICAgfVxuXG4gICAgaWYgKHJvdXRlLnJlZGlyZWN0VG8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRoaXMubWF0Y2hTZWdtZW50QWdhaW5zdFJvdXRlKFxuICAgICAgICBpbmplY3RvcixcbiAgICAgICAgcmF3U2VnbWVudCxcbiAgICAgICAgcm91dGUsXG4gICAgICAgIHNlZ21lbnRzLFxuICAgICAgICBvdXRsZXQsXG4gICAgICAgIHBhcmVudFJvdXRlLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5hbGxvd1JlZGlyZWN0cyAmJiBhbGxvd1JlZGlyZWN0cykge1xuICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kU2VnbWVudEFnYWluc3RSb3V0ZVVzaW5nUmVkaXJlY3QoXG4gICAgICAgIGluamVjdG9yLFxuICAgICAgICByYXdTZWdtZW50LFxuICAgICAgICByb3V0ZXMsXG4gICAgICAgIHJvdXRlLFxuICAgICAgICBzZWdtZW50cyxcbiAgICAgICAgb3V0bGV0LFxuICAgICAgICBwYXJlbnRSb3V0ZSxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vTWF0Y2gocmF3U2VnbWVudCk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFNlZ21lbnRBZ2FpbnN0Um91dGVVc2luZ1JlZGlyZWN0KFxuICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLFxuICAgIHJvdXRlczogUm91dGVbXSxcbiAgICByb3V0ZTogUm91dGUsXG4gICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICBvdXRsZXQ6IHN0cmluZyxcbiAgICBwYXJlbnRSb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCxcbiAgKTogT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PiB8IE5vTGVmdG92ZXJzSW5Vcmw+IHtcbiAgICBjb25zdCB7bWF0Y2hlZCwgcGFyYW1ldGVycywgY29uc3VtZWRTZWdtZW50cywgcG9zaXRpb25hbFBhcmFtU2VnbWVudHMsIHJlbWFpbmluZ1NlZ21lbnRzfSA9XG4gICAgICBtYXRjaChzZWdtZW50R3JvdXAsIHJvdXRlLCBzZWdtZW50cyk7XG4gICAgaWYgKCFtYXRjaGVkKSByZXR1cm4gbm9NYXRjaChzZWdtZW50R3JvdXApO1xuXG4gICAgLy8gVE9ETyhhdHNjb3R0KTogTW92ZSBhbGwgb2YgdGhpcyB1bmRlciBhbiBpZihuZ0Rldk1vZGUpIGFzIGEgYnJlYWtpbmcgY2hhbmdlIGFuZCBhbGxvdyBzdGFja1xuICAgIC8vIHNpemUgZXhjZWVkZWQgaW4gcHJvZHVjdGlvblxuICAgIGlmICh0eXBlb2Ygcm91dGUucmVkaXJlY3RUbyA9PT0gJ3N0cmluZycgJiYgcm91dGUucmVkaXJlY3RUb1swXSA9PT0gJy8nKSB7XG4gICAgICB0aGlzLmFic29sdXRlUmVkaXJlY3RDb3VudCsrO1xuICAgICAgaWYgKHRoaXMuYWJzb2x1dGVSZWRpcmVjdENvdW50ID4gTUFYX0FMTE9XRURfUkVESVJFQ1RTKSB7XG4gICAgICAgIGlmIChuZ0Rldk1vZGUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgICAgUnVudGltZUVycm9yQ29kZS5JTkZJTklURV9SRURJUkVDVCxcbiAgICAgICAgICAgIGBEZXRlY3RlZCBwb3NzaWJsZSBpbmZpbml0ZSByZWRpcmVjdCB3aGVuIHJlZGlyZWN0aW5nIGZyb20gJyR7dGhpcy51cmxUcmVlfScgdG8gJyR7cm91dGUucmVkaXJlY3RUb30nLlxcbmAgK1xuICAgICAgICAgICAgICBgVGhpcyBpcyBjdXJyZW50bHkgYSBkZXYgbW9kZSBvbmx5IGVycm9yIGJ1dCB3aWxsIGJlY29tZSBhYCArXG4gICAgICAgICAgICAgIGAgY2FsbCBzdGFjayBzaXplIGV4Y2VlZGVkIGVycm9yIGluIHByb2R1Y3Rpb24gaW4gYSBmdXR1cmUgbWFqb3IgdmVyc2lvbi5gLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hbGxvd1JlZGlyZWN0cyA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBjdXJyZW50U25hcHNob3QgPSBuZXcgQWN0aXZhdGVkUm91dGVTbmFwc2hvdChcbiAgICAgIHNlZ21lbnRzLFxuICAgICAgcGFyYW1ldGVycyxcbiAgICAgIE9iamVjdC5mcmVlemUoey4uLnRoaXMudXJsVHJlZS5xdWVyeVBhcmFtc30pLFxuICAgICAgdGhpcy51cmxUcmVlLmZyYWdtZW50LFxuICAgICAgZ2V0RGF0YShyb3V0ZSksXG4gICAgICBnZXRPdXRsZXQocm91dGUpLFxuICAgICAgcm91dGUuY29tcG9uZW50ID8/IHJvdXRlLl9sb2FkZWRDb21wb25lbnQgPz8gbnVsbCxcbiAgICAgIHJvdXRlLFxuICAgICAgZ2V0UmVzb2x2ZShyb3V0ZSksXG4gICAgKTtcbiAgICBjb25zdCBpbmhlcml0ZWQgPSBnZXRJbmhlcml0ZWQoY3VycmVudFNuYXBzaG90LCBwYXJlbnRSb3V0ZSwgdGhpcy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5KTtcbiAgICBjdXJyZW50U25hcHNob3QucGFyYW1zID0gT2JqZWN0LmZyZWV6ZShpbmhlcml0ZWQucGFyYW1zKTtcbiAgICBjdXJyZW50U25hcHNob3QuZGF0YSA9IE9iamVjdC5mcmVlemUoaW5oZXJpdGVkLmRhdGEpO1xuICAgIGNvbnN0IG5ld1RyZWUgPSB0aGlzLmFwcGx5UmVkaXJlY3RzLmFwcGx5UmVkaXJlY3RDb21tYW5kcyhcbiAgICAgIGNvbnN1bWVkU2VnbWVudHMsXG4gICAgICByb3V0ZS5yZWRpcmVjdFRvISxcbiAgICAgIHBvc2l0aW9uYWxQYXJhbVNlZ21lbnRzLFxuICAgICAgY3VycmVudFNuYXBzaG90LFxuICAgICAgaW5qZWN0b3IsXG4gICAgKTtcblxuICAgIHJldHVybiB0aGlzLmFwcGx5UmVkaXJlY3RzLmxpbmVyYWxpemVTZWdtZW50cyhyb3V0ZSwgbmV3VHJlZSkucGlwZShcbiAgICAgIG1lcmdlTWFwKChuZXdTZWdtZW50czogVXJsU2VnbWVudFtdKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NTZWdtZW50KFxuICAgICAgICAgIGluamVjdG9yLFxuICAgICAgICAgIHJvdXRlcyxcbiAgICAgICAgICBzZWdtZW50R3JvdXAsXG4gICAgICAgICAgbmV3U2VnbWVudHMuY29uY2F0KHJlbWFpbmluZ1NlZ21lbnRzKSxcbiAgICAgICAgICBvdXRsZXQsXG4gICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgcGFyZW50Um91dGUsXG4gICAgICAgICk7XG4gICAgICB9KSxcbiAgICApO1xuICB9XG5cbiAgbWF0Y2hTZWdtZW50QWdhaW5zdFJvdXRlKFxuICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLFxuICAgIHJhd1NlZ21lbnQ6IFVybFNlZ21lbnRHcm91cCxcbiAgICByb3V0ZTogUm91dGUsXG4gICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICBvdXRsZXQ6IHN0cmluZyxcbiAgICBwYXJlbnRSb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCxcbiAgKTogT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4ge1xuICAgIGNvbnN0IG1hdGNoUmVzdWx0ID0gbWF0Y2hXaXRoQ2hlY2tzKHJhd1NlZ21lbnQsIHJvdXRlLCBzZWdtZW50cywgaW5qZWN0b3IsIHRoaXMudXJsU2VyaWFsaXplcik7XG4gICAgaWYgKHJvdXRlLnBhdGggPT09ICcqKicpIHtcbiAgICAgIC8vIFByaW9yIHZlcnNpb25zIG9mIHRoZSByb3V0ZSBtYXRjaGluZyBhbGdvcml0aG0gd291bGQgc3RvcCBtYXRjaGluZyBhdCB0aGUgd2lsZGNhcmQgcm91dGUuXG4gICAgICAvLyBXZSBzaG91bGQgaW52ZXN0aWdhdGUgYSBiZXR0ZXIgc3RyYXRlZ3kgZm9yIGFueSBleGlzdGluZyBjaGlsZHJlbi4gT3RoZXJ3aXNlLCB0aGVzZVxuICAgICAgLy8gY2hpbGQgc2VnbWVudHMgYXJlIHNpbGVudGx5IGRyb3BwZWQgZnJvbSB0aGUgbmF2aWdhdGlvbi5cbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzQwMDg5XG4gICAgICByYXdTZWdtZW50LmNoaWxkcmVuID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hdGNoUmVzdWx0LnBpcGUoXG4gICAgICBzd2l0Y2hNYXAoKHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAoIXJlc3VsdC5tYXRjaGVkKSB7XG4gICAgICAgICAgcmV0dXJuIG5vTWF0Y2gocmF3U2VnbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgdGhlIHJvdXRlIGhhcyBhbiBpbmplY3RvciBjcmVhdGVkIGZyb20gcHJvdmlkZXJzLCB3ZSBzaG91bGQgc3RhcnQgdXNpbmcgdGhhdC5cbiAgICAgICAgaW5qZWN0b3IgPSByb3V0ZS5faW5qZWN0b3IgPz8gaW5qZWN0b3I7XG4gICAgICAgIHJldHVybiB0aGlzLmdldENoaWxkQ29uZmlnKGluamVjdG9yLCByb3V0ZSwgc2VnbWVudHMpLnBpcGUoXG4gICAgICAgICAgc3dpdGNoTWFwKCh7cm91dGVzOiBjaGlsZENvbmZpZ30pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNoaWxkSW5qZWN0b3IgPSByb3V0ZS5fbG9hZGVkSW5qZWN0b3IgPz8gaW5qZWN0b3I7XG5cbiAgICAgICAgICAgIGNvbnN0IHtwYXJhbWV0ZXJzLCBjb25zdW1lZFNlZ21lbnRzLCByZW1haW5pbmdTZWdtZW50c30gPSByZXN1bHQ7XG4gICAgICAgICAgICBjb25zdCBzbmFwc2hvdCA9IG5ldyBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KFxuICAgICAgICAgICAgICBjb25zdW1lZFNlZ21lbnRzLFxuICAgICAgICAgICAgICBwYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICBPYmplY3QuZnJlZXplKHsuLi50aGlzLnVybFRyZWUucXVlcnlQYXJhbXN9KSxcbiAgICAgICAgICAgICAgdGhpcy51cmxUcmVlLmZyYWdtZW50LFxuICAgICAgICAgICAgICBnZXREYXRhKHJvdXRlKSxcbiAgICAgICAgICAgICAgZ2V0T3V0bGV0KHJvdXRlKSxcbiAgICAgICAgICAgICAgcm91dGUuY29tcG9uZW50ID8/IHJvdXRlLl9sb2FkZWRDb21wb25lbnQgPz8gbnVsbCxcbiAgICAgICAgICAgICAgcm91dGUsXG4gICAgICAgICAgICAgIGdldFJlc29sdmUocm91dGUpLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGNvbnN0IGluaGVyaXRlZCA9IGdldEluaGVyaXRlZChzbmFwc2hvdCwgcGFyZW50Um91dGUsIHRoaXMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSk7XG4gICAgICAgICAgICBzbmFwc2hvdC5wYXJhbXMgPSBPYmplY3QuZnJlZXplKGluaGVyaXRlZC5wYXJhbXMpO1xuICAgICAgICAgICAgc25hcHNob3QuZGF0YSA9IE9iamVjdC5mcmVlemUoaW5oZXJpdGVkLmRhdGEpO1xuXG4gICAgICAgICAgICBjb25zdCB7c2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50c30gPSBzcGxpdChcbiAgICAgICAgICAgICAgcmF3U2VnbWVudCxcbiAgICAgICAgICAgICAgY29uc3VtZWRTZWdtZW50cyxcbiAgICAgICAgICAgICAgcmVtYWluaW5nU2VnbWVudHMsXG4gICAgICAgICAgICAgIGNoaWxkQ29uZmlnLFxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgaWYgKHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiBzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzQ2hpbGRyZW4oY2hpbGRJbmplY3RvciwgY2hpbGRDb25maWcsIHNlZ21lbnRHcm91cCwgc25hcHNob3QpLnBpcGUoXG4gICAgICAgICAgICAgICAgbWFwKChjaGlsZHJlbikgPT4ge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBUcmVlTm9kZShzbmFwc2hvdCwgY2hpbGRyZW4pO1xuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY2hpbGRDb25maWcubGVuZ3RoID09PSAwICYmIHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICByZXR1cm4gb2YobmV3IFRyZWVOb2RlKHNuYXBzaG90LCBbXSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBtYXRjaGVkT25PdXRsZXQgPSBnZXRPdXRsZXQocm91dGUpID09PSBvdXRsZXQ7XG4gICAgICAgICAgICAvLyBJZiB3ZSBtYXRjaGVkIGEgY29uZmlnIGR1ZSB0byBlbXB0eSBwYXRoIG1hdGNoIG9uIGEgZGlmZmVyZW50IG91dGxldCwgd2UgbmVlZCB0b1xuICAgICAgICAgICAgLy8gY29udGludWUgcGFzc2luZyB0aGUgY3VycmVudCBvdXRsZXQgZm9yIHRoZSBzZWdtZW50IHJhdGhlciB0aGFuIHN3aXRjaCB0byBQUklNQVJZLlxuICAgICAgICAgICAgLy8gTm90ZSB0aGF0IHdlIHN3aXRjaCB0byBwcmltYXJ5IHdoZW4gd2UgaGF2ZSBhIG1hdGNoIGJlY2F1c2Ugb3V0bGV0IGNvbmZpZ3MgbG9vayBsaWtlXG4gICAgICAgICAgICAvLyB0aGlzOiB7cGF0aDogJ2EnLCBvdXRsZXQ6ICdhJywgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIC8vICB7cGF0aDogJ2InLCBjb21wb25lbnQ6IEJ9LFxuICAgICAgICAgICAgLy8gIHtwYXRoOiAnYycsIGNvbXBvbmVudDogQ30sXG4gICAgICAgICAgICAvLyBdfVxuICAgICAgICAgICAgLy8gTm90aWNlIHRoYXQgdGhlIGNoaWxkcmVuIG9mIHRoZSBuYW1lZCBvdXRsZXQgYXJlIGNvbmZpZ3VyZWQgd2l0aCB0aGUgcHJpbWFyeSBvdXRsZXRcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NTZWdtZW50KFxuICAgICAgICAgICAgICBjaGlsZEluamVjdG9yLFxuICAgICAgICAgICAgICBjaGlsZENvbmZpZyxcbiAgICAgICAgICAgICAgc2VnbWVudEdyb3VwLFxuICAgICAgICAgICAgICBzbGljZWRTZWdtZW50cyxcbiAgICAgICAgICAgICAgbWF0Y2hlZE9uT3V0bGV0ID8gUFJJTUFSWV9PVVRMRVQgOiBvdXRsZXQsXG4gICAgICAgICAgICAgIHRydWUsXG4gICAgICAgICAgICAgIHNuYXBzaG90LFxuICAgICAgICAgICAgKS5waXBlKFxuICAgICAgICAgICAgICBtYXAoKGNoaWxkKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBUcmVlTm9kZShzbmFwc2hvdCwgY2hpbGQgaW5zdGFuY2VvZiBUcmVlTm9kZSA/IFtjaGlsZF0gOiBbXSk7XG4gICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9KSxcbiAgICAgICAgKTtcbiAgICAgIH0pLFxuICAgICk7XG4gIH1cbiAgcHJpdmF0ZSBnZXRDaGlsZENvbmZpZyhcbiAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvcixcbiAgICByb3V0ZTogUm91dGUsXG4gICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgKTogT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWc+IHtcbiAgICBpZiAocm91dGUuY2hpbGRyZW4pIHtcbiAgICAgIC8vIFRoZSBjaGlsZHJlbiBiZWxvbmcgdG8gdGhlIHNhbWUgbW9kdWxlXG4gICAgICByZXR1cm4gb2Yoe3JvdXRlczogcm91dGUuY2hpbGRyZW4sIGluamVjdG9yfSk7XG4gICAgfVxuXG4gICAgaWYgKHJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgICAgLy8gbGF6eSBjaGlsZHJlbiBiZWxvbmcgdG8gdGhlIGxvYWRlZCBtb2R1bGVcbiAgICAgIGlmIChyb3V0ZS5fbG9hZGVkUm91dGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIG9mKHtyb3V0ZXM6IHJvdXRlLl9sb2FkZWRSb3V0ZXMsIGluamVjdG9yOiByb3V0ZS5fbG9hZGVkSW5qZWN0b3J9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJ1bkNhbkxvYWRHdWFyZHMoaW5qZWN0b3IsIHJvdXRlLCBzZWdtZW50cywgdGhpcy51cmxTZXJpYWxpemVyKS5waXBlKFxuICAgICAgICBtZXJnZU1hcCgoc2hvdWxkTG9hZFJlc3VsdDogYm9vbGVhbikgPT4ge1xuICAgICAgICAgIGlmIChzaG91bGRMb2FkUmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25maWdMb2FkZXIubG9hZENoaWxkcmVuKGluamVjdG9yLCByb3V0ZSkucGlwZShcbiAgICAgICAgICAgICAgdGFwKChjZmc6IExvYWRlZFJvdXRlckNvbmZpZykgPT4ge1xuICAgICAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRSb3V0ZXMgPSBjZmcucm91dGVzO1xuICAgICAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRJbmplY3RvciA9IGNmZy5pbmplY3RvcjtcbiAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gY2FuTG9hZEZhaWxzKHJvdXRlKTtcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiBvZih7cm91dGVzOiBbXSwgaW5qZWN0b3J9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzb3J0QWN0aXZhdGVkUm91dGVTbmFwc2hvdHMobm9kZXM6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10pOiB2b2lkIHtcbiAgbm9kZXMuc29ydCgoYSwgYikgPT4ge1xuICAgIGlmIChhLnZhbHVlLm91dGxldCA9PT0gUFJJTUFSWV9PVVRMRVQpIHJldHVybiAtMTtcbiAgICBpZiAoYi52YWx1ZS5vdXRsZXQgPT09IFBSSU1BUllfT1VUTEVUKSByZXR1cm4gMTtcbiAgICByZXR1cm4gYS52YWx1ZS5vdXRsZXQubG9jYWxlQ29tcGFyZShiLnZhbHVlLm91dGxldCk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBoYXNFbXB0eVBhdGhDb25maWcobm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4pIHtcbiAgY29uc3QgY29uZmlnID0gbm9kZS52YWx1ZS5yb3V0ZUNvbmZpZztcbiAgcmV0dXJuIGNvbmZpZyAmJiBjb25maWcucGF0aCA9PT0gJyc7XG59XG5cbi8qKlxuICogRmluZHMgYFRyZWVOb2RlYHMgd2l0aCBtYXRjaGluZyBlbXB0eSBwYXRoIHJvdXRlIGNvbmZpZ3MgYW5kIG1lcmdlcyB0aGVtIGludG8gYFRyZWVOb2RlYCB3aXRoXG4gKiB0aGUgY2hpbGRyZW4gZnJvbSBlYWNoIGR1cGxpY2F0ZS4gVGhpcyBpcyBuZWNlc3NhcnkgYmVjYXVzZSBkaWZmZXJlbnQgb3V0bGV0cyBjYW4gbWF0Y2ggYVxuICogc2luZ2xlIGVtcHR5IHBhdGggcm91dGUgY29uZmlnIGFuZCB0aGUgcmVzdWx0cyBuZWVkIHRvIHRoZW4gYmUgbWVyZ2VkLlxuICovXG5mdW5jdGlvbiBtZXJnZUVtcHR5UGF0aE1hdGNoZXMoXG4gIG5vZGVzOiBBcnJheTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4sXG4pOiBBcnJheTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4ge1xuICBjb25zdCByZXN1bHQ6IEFycmF5PFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+PiA9IFtdO1xuICAvLyBUaGUgc2V0IG9mIG5vZGVzIHdoaWNoIGNvbnRhaW4gY2hpbGRyZW4gdGhhdCB3ZXJlIG1lcmdlZCBmcm9tIHR3byBkdXBsaWNhdGUgZW1wdHkgcGF0aCBub2Rlcy5cbiAgY29uc3QgbWVyZ2VkTm9kZXM6IFNldDxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4gPSBuZXcgU2V0KCk7XG5cbiAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgaWYgKCFoYXNFbXB0eVBhdGhDb25maWcobm9kZSkpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG5vZGUpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgZHVwbGljYXRlRW1wdHlQYXRoTm9kZSA9IHJlc3VsdC5maW5kKFxuICAgICAgKHJlc3VsdE5vZGUpID0+IG5vZGUudmFsdWUucm91dGVDb25maWcgPT09IHJlc3VsdE5vZGUudmFsdWUucm91dGVDb25maWcsXG4gICAgKTtcbiAgICBpZiAoZHVwbGljYXRlRW1wdHlQYXRoTm9kZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBkdXBsaWNhdGVFbXB0eVBhdGhOb2RlLmNoaWxkcmVuLnB1c2goLi4ubm9kZS5jaGlsZHJlbik7XG4gICAgICBtZXJnZWROb2Rlcy5hZGQoZHVwbGljYXRlRW1wdHlQYXRoTm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdC5wdXNoKG5vZGUpO1xuICAgIH1cbiAgfVxuICAvLyBGb3IgZWFjaCBub2RlIHdoaWNoIGhhcyBjaGlsZHJlbiBmcm9tIG11bHRpcGxlIHNvdXJjZXMsIHdlIG5lZWQgdG8gcmVjb21wdXRlIGEgbmV3IGBUcmVlTm9kZWBcbiAgLy8gYnkgYWxzbyBtZXJnaW5nIHRob3NlIGNoaWxkcmVuLiBUaGlzIGlzIG5lY2Vzc2FyeSB3aGVuIHRoZXJlIGFyZSBtdWx0aXBsZSBlbXB0eSBwYXRoIGNvbmZpZ3NcbiAgLy8gaW4gYSByb3cuIFB1dCBhbm90aGVyIHdheTogd2hlbmV2ZXIgd2UgY29tYmluZSBjaGlsZHJlbiBvZiB0d28gbm9kZXMsIHdlIG5lZWQgdG8gYWxzbyBjaGVja1xuICAvLyBpZiBhbnkgb2YgdGhvc2UgY2hpbGRyZW4gY2FuIGJlIGNvbWJpbmVkIGludG8gYSBzaW5nbGUgbm9kZSBhcyB3ZWxsLlxuICBmb3IgKGNvbnN0IG1lcmdlZE5vZGUgb2YgbWVyZ2VkTm9kZXMpIHtcbiAgICBjb25zdCBtZXJnZWRDaGlsZHJlbiA9IG1lcmdlRW1wdHlQYXRoTWF0Y2hlcyhtZXJnZWROb2RlLmNoaWxkcmVuKTtcbiAgICByZXN1bHQucHVzaChuZXcgVHJlZU5vZGUobWVyZ2VkTm9kZS52YWx1ZSwgbWVyZ2VkQ2hpbGRyZW4pKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0LmZpbHRlcigobikgPT4gIW1lcmdlZE5vZGVzLmhhcyhuKSk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrT3V0bGV0TmFtZVVuaXF1ZW5lc3Mobm9kZXM6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10pOiB2b2lkIHtcbiAgY29uc3QgbmFtZXM6IHtbazogc3RyaW5nXTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdH0gPSB7fTtcbiAgbm9kZXMuZm9yRWFjaCgobikgPT4ge1xuICAgIGNvbnN0IHJvdXRlV2l0aFNhbWVPdXRsZXROYW1lID0gbmFtZXNbbi52YWx1ZS5vdXRsZXRdO1xuICAgIGlmIChyb3V0ZVdpdGhTYW1lT3V0bGV0TmFtZSkge1xuICAgICAgY29uc3QgcCA9IHJvdXRlV2l0aFNhbWVPdXRsZXROYW1lLnVybC5tYXAoKHMpID0+IHMudG9TdHJpbmcoKSkuam9pbignLycpO1xuICAgICAgY29uc3QgYyA9IG4udmFsdWUudXJsLm1hcCgocykgPT4gcy50b1N0cmluZygpKS5qb2luKCcvJyk7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICBSdW50aW1lRXJyb3JDb2RlLlRXT19TRUdNRU5UU19XSVRIX1NBTUVfT1VUTEVULFxuICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICAgIGBUd28gc2VnbWVudHMgY2Fubm90IGhhdmUgdGhlIHNhbWUgb3V0bGV0IG5hbWU6ICcke3B9JyBhbmQgJyR7Y30nLmAsXG4gICAgICApO1xuICAgIH1cbiAgICBuYW1lc1tuLnZhbHVlLm91dGxldF0gPSBuLnZhbHVlO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0RGF0YShyb3V0ZTogUm91dGUpOiBEYXRhIHtcbiAgcmV0dXJuIHJvdXRlLmRhdGEgfHwge307XG59XG5cbmZ1bmN0aW9uIGdldFJlc29sdmUocm91dGU6IFJvdXRlKTogUmVzb2x2ZURhdGEge1xuICByZXR1cm4gcm91dGUucmVzb2x2ZSB8fCB7fTtcbn1cbiJdfQ==