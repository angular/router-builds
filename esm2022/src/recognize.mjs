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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb2duaXplLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yZWNvZ25pemUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUE0QixhQUFhLElBQUksWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3ZGLE9BQU8sRUFBQyxJQUFJLEVBQWMsRUFBRSxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsSUFBSSxJQUFJLFFBQVEsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFbkksT0FBTyxFQUFDLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ25HLE9BQU8sRUFBQyx5QkFBeUIsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBRzVELE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBRTFELE9BQU8sRUFBQyxzQkFBc0IsRUFBRSxZQUFZLEVBQTZCLG1CQUFtQixFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDcEgsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUV4QyxPQUFPLEVBQUMsSUFBSSxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDeEMsT0FBTyxFQUFDLFNBQVMsRUFBRSxxQkFBcUIsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxnQkFBZ0IsRUFBRSxLQUFLLEVBQWUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQ3ZILE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxj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QUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN2RSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdkQsTUFBTSxJQUFJLFlBQVksNERBRWxCLENBQUMsT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLFNBQVMsQ0FBQztnQkFDM0MsbURBQW1ELENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzlFO1FBQ0QsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUNsQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FBQyxLQUFZO0lBQzNCLE9BQU8sS0FBSyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7QUFDMUIsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLEtBQVk7SUFDOUIsT0FBTyxLQUFLLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQztBQUM3QixDQUFDO0FBRUQsU0FBUyx5QkFBeUIsQ0FBQyxRQUFzQjtJQUN2RCxPQUFPO1FBQ0wsT0FBTyxFQUFFLElBQUk7UUFDYixVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDakUsZ0JBQWdCLEVBQUUsUUFBUTtRQUMxQixpQkFBaUIsRUFBRSxFQUFFO1FBQ3JCLHVCQUF1QixFQUFFLEVBQUU7S0FDNUIsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFbnZpcm9ubWVudEluamVjdG9yLCBUeXBlLCDJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtmcm9tLCBPYnNlcnZhYmxlLCBvZn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NhdGNoRXJyb3IsIGNvbmNhdE1hcCwgZGVmYXVsdElmRW1wdHksIGZpcnN0LCBsYXN0IGFzIHJ4anNMYXN0LCBtYXAsIG1lcmdlTWFwLCBzY2FuLCBzd2l0Y2hNYXAsIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0Fic29sdXRlUmVkaXJlY3QsIEFwcGx5UmVkaXJlY3RzLCBjYW5Mb2FkRmFpbHMsIG5vTWF0Y2gsIE5vTWF0Y2h9IGZyb20gJy4vYXBwbHlfcmVkaXJlY3RzJztcbmltcG9ydCB7Y3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdH0gZnJvbSAnLi9jcmVhdGVfdXJsX3RyZWUnO1xuaW1wb3J0IHtSdW50aW1lRXJyb3JDb2RlfSBmcm9tICcuL2Vycm9ycyc7XG5pbXBvcnQge0RhdGEsIExvYWRlZFJvdXRlckNvbmZpZywgUmVzb2x2ZURhdGEsIFJvdXRlLCBSb3V0ZXN9IGZyb20gJy4vbW9kZWxzJztcbmltcG9ydCB7cnVuQ2FuTG9hZEd1YXJkc30gZnJvbSAnLi9vcGVyYXRvcnMvY2hlY2tfZ3VhcmRzJztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgZ2V0SW5oZXJpdGVkLCBQYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LCBSb3V0ZXJTdGF0ZVNuYXBzaG90fSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BSSU1BUllfT1VUTEVUfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge1VybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cCwgVXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge2xhc3R9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge2dldE91dGxldCwgc29ydEJ5TWF0Y2hpbmdPdXRsZXRzfSBmcm9tICcuL3V0aWxzL2NvbmZpZyc7XG5pbXBvcnQge2lzSW1tZWRpYXRlTWF0Y2gsIG1hdGNoLCBNYXRjaFJlc3VsdCwgbWF0Y2hXaXRoQ2hlY2tzLCBub0xlZnRvdmVyc0luVXJsLCBzcGxpdH0gZnJvbSAnLi91dGlscy9jb25maWdfbWF0Y2hpbmcnO1xuaW1wb3J0IHtUcmVlTm9kZX0gZnJvbSAnLi91dGlscy90cmVlJztcbmltcG9ydCB7aXNFbXB0eUVycm9yfSBmcm9tICcuL3V0aWxzL3R5cGVfZ3VhcmRzJztcblxuLyoqXG4gKiBDbGFzcyB1c2VkIHRvIGluZGljYXRlIHRoZXJlIHdlcmUgbm8gYWRkaXRpb25hbCByb3V0ZSBjb25maWcgbWF0Y2hlcyBidXQgdGhhdCBhbGwgc2VnbWVudHMgb2ZcbiAqIHRoZSBVUkwgd2VyZSBjb25zdW1lZCBkdXJpbmcgbWF0Y2hpbmcgc28gdGhlIHJvdXRlIHdhcyBVUkwgbWF0Y2hlZC4gV2hlbiB0aGlzIGhhcHBlbnMsIHdlIHN0aWxsXG4gKiB0cnkgdG8gbWF0Y2ggY2hpbGQgY29uZmlncyBpbiBjYXNlIHRoZXJlIGFyZSBlbXB0eSBwYXRoIGNoaWxkcmVuLlxuICovXG5jbGFzcyBOb0xlZnRvdmVyc0luVXJsIHt9XG5cbmV4cG9ydCBmdW5jdGlvbiByZWNvZ25pemUoXG4gICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIGNvbmZpZ0xvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyLFxuICAgIHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT58bnVsbCwgY29uZmlnOiBSb3V0ZXMsIHVybFRyZWU6IFVybFRyZWUsXG4gICAgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiBQYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5ID1cbiAgICAgICAgJ2VtcHR5T25seScpOiBPYnNlcnZhYmxlPHtzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCwgdHJlZTogVXJsVHJlZX0+IHtcbiAgcmV0dXJuIG5ldyBSZWNvZ25pemVyKFxuICAgICAgICAgICAgIGluamVjdG9yLCBjb25maWdMb2FkZXIsIHJvb3RDb21wb25lbnRUeXBlLCBjb25maWcsIHVybFRyZWUsIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3ksXG4gICAgICAgICAgICAgdXJsU2VyaWFsaXplcilcbiAgICAgIC5yZWNvZ25pemUoKTtcbn1cblxuY29uc3QgTUFYX0FMTE9XRURfUkVESVJFQ1RTID0gMzE7XG5cbmV4cG9ydCBjbGFzcyBSZWNvZ25pemVyIHtcbiAgcHJpdmF0ZSBhcHBseVJlZGlyZWN0cyA9IG5ldyBBcHBseVJlZGlyZWN0cyh0aGlzLnVybFNlcmlhbGl6ZXIsIHRoaXMudXJsVHJlZSk7XG4gIHByaXZhdGUgYWJzb2x1dGVSZWRpcmVjdENvdW50ID0gMDtcbiAgYWxsb3dSZWRpcmVjdHMgPSB0cnVlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvciwgcHJpdmF0ZSBjb25maWdMb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcixcbiAgICAgIHByaXZhdGUgcm9vdENvbXBvbmVudFR5cGU6IFR5cGU8YW55PnxudWxsLCBwcml2YXRlIGNvbmZpZzogUm91dGVzLCBwcml2YXRlIHVybFRyZWU6IFVybFRyZWUsXG4gICAgICBwcml2YXRlIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6IFBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3ksXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIpIHt9XG5cbiAgcHJpdmF0ZSBub01hdGNoRXJyb3IoZTogTm9NYXRjaCk6IGFueSB7XG4gICAgcmV0dXJuIG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuTk9fTUFUQ0gsXG4gICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmXG4gICAgICAgICAgICBgQ2Fubm90IG1hdGNoIGFueSByb3V0ZXMuIFVSTCBTZWdtZW50OiAnJHtlLnNlZ21lbnRHcm91cH0nYCk7XG4gIH1cblxuICByZWNvZ25pemUoKTogT2JzZXJ2YWJsZTx7c3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QsIHRyZWU6IFVybFRyZWV9PiB7XG4gICAgY29uc3Qgcm9vdFNlZ21lbnRHcm91cCA9IHNwbGl0KHRoaXMudXJsVHJlZS5yb290LCBbXSwgW10sIHRoaXMuY29uZmlnKS5zZWdtZW50R3JvdXA7XG5cbiAgICByZXR1cm4gdGhpcy5tYXRjaChyb290U2VnbWVudEdyb3VwKS5waXBlKG1hcChjaGlsZHJlbiA9PiB7XG4gICAgICAvLyBVc2UgT2JqZWN0LmZyZWV6ZSB0byBwcmV2ZW50IHJlYWRlcnMgb2YgdGhlIFJvdXRlciBzdGF0ZSBmcm9tIG1vZGlmeWluZyBpdCBvdXRzaWRlXG4gICAgICAvLyBvZiBhIG5hdmlnYXRpb24sIHJlc3VsdGluZyBpbiB0aGUgcm91dGVyIGJlaW5nIG91dCBvZiBzeW5jIHdpdGggdGhlIGJyb3dzZXIuXG4gICAgICBjb25zdCByb290ID0gbmV3IEFjdGl2YXRlZFJvdXRlU25hcHNob3QoXG4gICAgICAgICAgW10sIE9iamVjdC5mcmVlemUoe30pLCBPYmplY3QuZnJlZXplKHsuLi50aGlzLnVybFRyZWUucXVlcnlQYXJhbXN9KSxcbiAgICAgICAgICB0aGlzLnVybFRyZWUuZnJhZ21lbnQsIHt9LCBQUklNQVJZX09VVExFVCwgdGhpcy5yb290Q29tcG9uZW50VHlwZSwgbnVsbCwge30pO1xuXG4gICAgICBjb25zdCByb290Tm9kZSA9IG5ldyBUcmVlTm9kZShyb290LCBjaGlsZHJlbik7XG4gICAgICBjb25zdCByb3V0ZVN0YXRlID0gbmV3IFJvdXRlclN0YXRlU25hcHNob3QoJycsIHJvb3ROb2RlKTtcbiAgICAgIGNvbnN0IHRyZWUgPVxuICAgICAgICAgIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qocm9vdCwgW10sIHRoaXMudXJsVHJlZS5xdWVyeVBhcmFtcywgdGhpcy51cmxUcmVlLmZyYWdtZW50KTtcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzQ3MzA3XG4gICAgICAvLyBDcmVhdGluZyB0aGUgdHJlZSBzdHJpbmdpZmllcyB0aGUgcXVlcnkgcGFyYW1zXG4gICAgICAvLyBXZSBkb24ndCB3YW50IHRvIGRvIHRoaXMgaGVyZSBzbyByZWFzc2lnbiB0aGVtIHRvIHRoZSBvcmlnaW5hbC5cbiAgICAgIHRyZWUucXVlcnlQYXJhbXMgPSB0aGlzLnVybFRyZWUucXVlcnlQYXJhbXM7XG4gICAgICByb3V0ZVN0YXRlLnVybCA9IHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodHJlZSk7XG4gICAgICB0aGlzLmluaGVyaXRQYXJhbXNBbmREYXRhKHJvdXRlU3RhdGUuX3Jvb3QsIG51bGwpO1xuICAgICAgcmV0dXJuIHtzdGF0ZTogcm91dGVTdGF0ZSwgdHJlZX07XG4gICAgfSkpO1xuICB9XG5cblxuICBwcml2YXRlIG1hdGNoKHJvb3RTZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6IE9ic2VydmFibGU8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXT4ge1xuICAgIGNvbnN0IGV4cGFuZGVkJCA9XG4gICAgICAgIHRoaXMucHJvY2Vzc1NlZ21lbnRHcm91cCh0aGlzLmluamVjdG9yLCB0aGlzLmNvbmZpZywgcm9vdFNlZ21lbnRHcm91cCwgUFJJTUFSWV9PVVRMRVQpO1xuICAgIHJldHVybiBleHBhbmRlZCQucGlwZShjYXRjaEVycm9yKChlOiBhbnkpID0+IHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgQWJzb2x1dGVSZWRpcmVjdCkge1xuICAgICAgICB0aGlzLnVybFRyZWUgPSBlLnVybFRyZWU7XG4gICAgICAgIHJldHVybiB0aGlzLm1hdGNoKGUudXJsVHJlZS5yb290KTtcbiAgICAgIH1cbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9NYXRjaCkge1xuICAgICAgICB0aHJvdyB0aGlzLm5vTWF0Y2hFcnJvcihlKTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgZTtcbiAgICB9KSk7XG4gIH1cblxuICBpbmhlcml0UGFyYW1zQW5kRGF0YShcbiAgICAgIHJvdXRlTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4sIHBhcmVudDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdHxudWxsKTogdm9pZCB7XG4gICAgY29uc3Qgcm91dGUgPSByb3V0ZU5vZGUudmFsdWU7XG4gICAgY29uc3QgaSA9IGdldEluaGVyaXRlZChyb3V0ZSwgcGFyZW50LCB0aGlzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kpO1xuXG4gICAgcm91dGUucGFyYW1zID0gT2JqZWN0LmZyZWV6ZShpLnBhcmFtcyk7XG4gICAgcm91dGUuZGF0YSA9IE9iamVjdC5mcmVlemUoaS5kYXRhKTtcblxuICAgIHJvdXRlTm9kZS5jaGlsZHJlbi5mb3JFYWNoKG4gPT4gdGhpcy5pbmhlcml0UGFyYW1zQW5kRGF0YShuLCByb3V0ZSkpO1xuICB9XG5cbiAgcHJvY2Vzc1NlZ21lbnRHcm91cChcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCBjb25maWc6IFJvdXRlW10sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLFxuICAgICAgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10+IHtcbiAgICBpZiAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiBzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc0NoaWxkcmVuKGluamVjdG9yLCBjb25maWcsIHNlZ21lbnRHcm91cCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucHJvY2Vzc1NlZ21lbnQoaW5qZWN0b3IsIGNvbmZpZywgc2VnbWVudEdyb3VwLCBzZWdtZW50R3JvdXAuc2VnbWVudHMsIG91dGxldCwgdHJ1ZSlcbiAgICAgICAgLnBpcGUobWFwKGNoaWxkID0+IGNoaWxkIGluc3RhbmNlb2YgVHJlZU5vZGUgPyBbY2hpbGRdIDogW10pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNYXRjaGVzIGV2ZXJ5IGNoaWxkIG91dGxldCBpbiB0aGUgYHNlZ21lbnRHcm91cGAgdG8gYSBgUm91dGVgIGluIHRoZSBjb25maWcuIFJldHVybnMgYG51bGxgIGlmXG4gICAqIHdlIGNhbm5vdCBmaW5kIGEgbWF0Y2ggZm9yIF9hbnlfIG9mIHRoZSBjaGlsZHJlbi5cbiAgICpcbiAgICogQHBhcmFtIGNvbmZpZyAtIFRoZSBgUm91dGVzYCB0byBtYXRjaCBhZ2FpbnN0XG4gICAqIEBwYXJhbSBzZWdtZW50R3JvdXAgLSBUaGUgYFVybFNlZ21lbnRHcm91cGAgd2hvc2UgY2hpbGRyZW4gbmVlZCB0byBiZSBtYXRjaGVkIGFnYWluc3QgdGhlXG4gICAqICAgICBjb25maWcuXG4gICAqL1xuICBwcm9jZXNzQ2hpbGRyZW4oaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIGNvbmZpZzogUm91dGVbXSwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXApOlxuICAgICAgT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PltdPiB7XG4gICAgLy8gRXhwYW5kIG91dGxldHMgb25lIGF0IGEgdGltZSwgc3RhcnRpbmcgd2l0aCB0aGUgcHJpbWFyeSBvdXRsZXQuIFdlIG5lZWQgdG8gZG8gaXQgdGhpcyB3YXlcbiAgICAvLyBiZWNhdXNlIGFuIGFic29sdXRlIHJlZGlyZWN0IGZyb20gdGhlIHByaW1hcnkgb3V0bGV0IHRha2VzIHByZWNlZGVuY2UuXG4gICAgY29uc3QgY2hpbGRPdXRsZXRzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgT2JqZWN0LmtleXMoc2VnbWVudEdyb3VwLmNoaWxkcmVuKSkge1xuICAgICAgaWYgKGNoaWxkID09PSAncHJpbWFyeScpIHtcbiAgICAgICAgY2hpbGRPdXRsZXRzLnVuc2hpZnQoY2hpbGQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hpbGRPdXRsZXRzLnB1c2goY2hpbGQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZnJvbShjaGlsZE91dGxldHMpXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgICAgY29uY2F0TWFwKGNoaWxkT3V0bGV0ID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgY2hpbGQgPSBzZWdtZW50R3JvdXAuY2hpbGRyZW5bY2hpbGRPdXRsZXRdO1xuICAgICAgICAgICAgICAvLyBTb3J0IHRoZSBjb25maWcgc28gdGhhdCByb3V0ZXMgd2l0aCBvdXRsZXRzIHRoYXQgbWF0Y2ggdGhlIG9uZSBiZWluZyBhY3RpdmF0ZWRcbiAgICAgICAgICAgICAgLy8gYXBwZWFyIGZpcnN0LCBmb2xsb3dlZCBieSByb3V0ZXMgZm9yIG90aGVyIG91dGxldHMsIHdoaWNoIG1pZ2h0IG1hdGNoIGlmIHRoZXkgaGF2ZVxuICAgICAgICAgICAgICAvLyBhbiBlbXB0eSBwYXRoLlxuICAgICAgICAgICAgICBjb25zdCBzb3J0ZWRDb25maWcgPSBzb3J0QnlNYXRjaGluZ091dGxldHMoY29uZmlnLCBjaGlsZE91dGxldCk7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NTZWdtZW50R3JvdXAoaW5qZWN0b3IsIHNvcnRlZENvbmZpZywgY2hpbGQsIGNoaWxkT3V0bGV0KTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgc2NhbigoY2hpbGRyZW4sIG91dGxldENoaWxkcmVuKSA9PiB7XG4gICAgICAgICAgICAgIGNoaWxkcmVuLnB1c2goLi4ub3V0bGV0Q2hpbGRyZW4pO1xuICAgICAgICAgICAgICByZXR1cm4gY2hpbGRyZW47XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIGRlZmF1bHRJZkVtcHR5KG51bGwgYXMgVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD5bXSB8IG51bGwpLFxuICAgICAgICAgICAgcnhqc0xhc3QoKSxcbiAgICAgICAgICAgIG1lcmdlTWFwKGNoaWxkcmVuID0+IHtcbiAgICAgICAgICAgICAgaWYgKGNoaWxkcmVuID09PSBudWxsKSByZXR1cm4gbm9NYXRjaChzZWdtZW50R3JvdXApO1xuICAgICAgICAgICAgICAvLyBCZWNhdXNlIHdlIG1heSBoYXZlIG1hdGNoZWQgdHdvIG91dGxldHMgdG8gdGhlIHNhbWUgZW1wdHkgcGF0aCBzZWdtZW50LCB3ZSBjYW4gaGF2ZVxuICAgICAgICAgICAgICAvLyBtdWx0aXBsZSBhY3RpdmF0ZWQgcmVzdWx0cyBmb3IgdGhlIHNhbWUgb3V0bGV0LiBXZSBzaG91bGQgbWVyZ2UgdGhlIGNoaWxkcmVuIG9mXG4gICAgICAgICAgICAgIC8vIHRoZXNlIHJlc3VsdHMgc28gdGhlIGZpbmFsIHJldHVybiB2YWx1ZSBpcyBvbmx5IG9uZSBgVHJlZU5vZGVgIHBlciBvdXRsZXQuXG4gICAgICAgICAgICAgIGNvbnN0IG1lcmdlZENoaWxkcmVuID0gbWVyZ2VFbXB0eVBhdGhNYXRjaGVzKGNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkge1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgc2hvdWxkIHJlYWxseSBuZXZlciBoYXBwZW4gLSB3ZSBhcmUgb25seSB0YWtpbmcgdGhlIGZpcnN0IG1hdGNoIGZvciBlYWNoXG4gICAgICAgICAgICAgICAgLy8gb3V0bGV0IGFuZCBtZXJnZSB0aGUgZW1wdHkgcGF0aCBtYXRjaGVzLlxuICAgICAgICAgICAgICAgIGNoZWNrT3V0bGV0TmFtZVVuaXF1ZW5lc3MobWVyZ2VkQ2hpbGRyZW4pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHNvcnRBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90cyhtZXJnZWRDaGlsZHJlbik7XG4gICAgICAgICAgICAgIHJldHVybiBvZihtZXJnZWRDaGlsZHJlbik7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgKTtcbiAgfVxuXG4gIHByb2Nlc3NTZWdtZW50KFxuICAgICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJvdXRlczogUm91dGVbXSwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZyxcbiAgICAgIGFsbG93UmVkaXJlY3RzOiBib29sZWFuKTogT2JzZXJ2YWJsZTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PnxOb0xlZnRvdmVyc0luVXJsPiB7XG4gICAgcmV0dXJuIGZyb20ocm91dGVzKS5waXBlKFxuICAgICAgICBjb25jYXRNYXAociA9PiB7XG4gICAgICAgICAgcmV0dXJuIHRoaXNcbiAgICAgICAgICAgICAgLnByb2Nlc3NTZWdtZW50QWdhaW5zdFJvdXRlKFxuICAgICAgICAgICAgICAgICAgci5faW5qZWN0b3IgPz8gaW5qZWN0b3IsIHJvdXRlcywgciwgc2VnbWVudEdyb3VwLCBzZWdtZW50cywgb3V0bGV0LFxuICAgICAgICAgICAgICAgICAgYWxsb3dSZWRpcmVjdHMpXG4gICAgICAgICAgICAgIC5waXBlKGNhdGNoRXJyb3IoKGU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9NYXRjaCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG9mKG51bGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pLFxuICAgICAgICBmaXJzdCgoeCk6IHggaXMgVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD58Tm9MZWZ0b3ZlcnNJblVybCA9PiAhIXgpLCBjYXRjaEVycm9yKGUgPT4ge1xuICAgICAgICAgIGlmIChpc0VtcHR5RXJyb3IoZSkpIHtcbiAgICAgICAgICAgIGlmIChub0xlZnRvdmVyc0luVXJsKHNlZ21lbnRHcm91cCwgc2VnbWVudHMsIG91dGxldCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9mKG5ldyBOb0xlZnRvdmVyc0luVXJsKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5vTWF0Y2goc2VnbWVudEdyb3VwKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfSkpO1xuICB9XG5cbiAgcHJvY2Vzc1NlZ21lbnRBZ2FpbnN0Um91dGUoXG4gICAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvciwgcm91dGVzOiBSb3V0ZVtdLCByb3V0ZTogUm91dGUsIHJhd1NlZ21lbnQ6IFVybFNlZ21lbnRHcm91cCxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nLFxuICAgICAgYWxsb3dSZWRpcmVjdHM6IGJvb2xlYW4pOiBPYnNlcnZhYmxlPFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+fE5vTGVmdG92ZXJzSW5Vcmw+IHtcbiAgICBpZiAoIWlzSW1tZWRpYXRlTWF0Y2gocm91dGUsIHJhd1NlZ21lbnQsIHNlZ21lbnRzLCBvdXRsZXQpKSByZXR1cm4gbm9NYXRjaChyYXdTZWdtZW50KTtcblxuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLm1hdGNoU2VnbWVudEFnYWluc3RSb3V0ZShpbmplY3RvciwgcmF3U2VnbWVudCwgcm91dGUsIHNlZ21lbnRzLCBvdXRsZXQpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmFsbG93UmVkaXJlY3RzICYmIGFsbG93UmVkaXJlY3RzKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRTZWdtZW50QWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgICAgICBpbmplY3RvciwgcmF3U2VnbWVudCwgcm91dGVzLCByb3V0ZSwgc2VnbWVudHMsIG91dGxldCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vTWF0Y2gocmF3U2VnbWVudCk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFNlZ21lbnRBZ2FpbnN0Um91dGVVc2luZ1JlZGlyZWN0KFxuICAgICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZXM6IFJvdXRlW10sIHJvdXRlOiBSb3V0ZSxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgICBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD58Tm9MZWZ0b3ZlcnNJblVybD4ge1xuICAgIGNvbnN0IHtcbiAgICAgIG1hdGNoZWQsXG4gICAgICBjb25zdW1lZFNlZ21lbnRzLFxuICAgICAgcG9zaXRpb25hbFBhcmFtU2VnbWVudHMsXG4gICAgICByZW1haW5pbmdTZWdtZW50cyxcbiAgICB9ID0gcm91dGUucGF0aCA9PT0gJyoqJyA/IGNyZWF0ZVdpbGRjYXJkTWF0Y2hSZXN1bHQoc2VnbWVudHMpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoKHNlZ21lbnRHcm91cCwgcm91dGUsIHNlZ21lbnRzKTtcbiAgICBpZiAoIW1hdGNoZWQpIHJldHVybiBub01hdGNoKHNlZ21lbnRHcm91cCk7XG5cbiAgICAvLyBUT0RPKGF0c2NvdHQpOiBNb3ZlIGFsbCBvZiB0aGlzIHVuZGVyIGFuIGlmKG5nRGV2TW9kZSkgYXMgYSBicmVha2luZyBjaGFuZ2UgYW5kIGFsbG93IHN0YWNrXG4gICAgLy8gc2l6ZSBleGNlZWRlZCBpbiBwcm9kdWN0aW9uXG4gICAgaWYgKHJvdXRlLnJlZGlyZWN0VG8hLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgdGhpcy5hYnNvbHV0ZVJlZGlyZWN0Q291bnQrKztcbiAgICAgIGlmICh0aGlzLmFic29sdXRlUmVkaXJlY3RDb3VudCA+IE1BWF9BTExPV0VEX1JFRElSRUNUUykge1xuICAgICAgICBpZiAobmdEZXZNb2RlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICAgICAgUnVudGltZUVycm9yQ29kZS5JTkZJTklURV9SRURJUkVDVCxcbiAgICAgICAgICAgICAgYERldGVjdGVkIHBvc3NpYmxlIGluZmluaXRlIHJlZGlyZWN0IHdoZW4gcmVkaXJlY3RpbmcgZnJvbSAnJHt0aGlzLnVybFRyZWV9JyB0byAnJHtcbiAgICAgICAgICAgICAgICAgIHJvdXRlLnJlZGlyZWN0VG99Jy5cXG5gICtcbiAgICAgICAgICAgICAgICAgIGBUaGlzIGlzIGN1cnJlbnRseSBhIGRldiBtb2RlIG9ubHkgZXJyb3IgYnV0IHdpbGwgYmVjb21lIGFgICtcbiAgICAgICAgICAgICAgICAgIGAgY2FsbCBzdGFjayBzaXplIGV4Y2VlZGVkIGVycm9yIGluIHByb2R1Y3Rpb24gaW4gYSBmdXR1cmUgbWFqb3IgdmVyc2lvbi5gKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFsbG93UmVkaXJlY3RzID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IG5ld1RyZWUgPSB0aGlzLmFwcGx5UmVkaXJlY3RzLmFwcGx5UmVkaXJlY3RDb21tYW5kcyhcbiAgICAgICAgY29uc3VtZWRTZWdtZW50cywgcm91dGUucmVkaXJlY3RUbyEsIHBvc2l0aW9uYWxQYXJhbVNlZ21lbnRzKTtcblxuICAgIHJldHVybiB0aGlzLmFwcGx5UmVkaXJlY3RzLmxpbmVyYWxpemVTZWdtZW50cyhyb3V0ZSwgbmV3VHJlZSlcbiAgICAgICAgLnBpcGUobWVyZ2VNYXAoKG5ld1NlZ21lbnRzOiBVcmxTZWdtZW50W10pID0+IHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzU2VnbWVudChcbiAgICAgICAgICAgICAgaW5qZWN0b3IsIHJvdXRlcywgc2VnbWVudEdyb3VwLCBuZXdTZWdtZW50cy5jb25jYXQocmVtYWluaW5nU2VnbWVudHMpLCBvdXRsZXQsIGZhbHNlKTtcbiAgICAgICAgfSkpO1xuICB9XG5cbiAgbWF0Y2hTZWdtZW50QWdhaW5zdFJvdXRlKFxuICAgICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJhd1NlZ21lbnQ6IFVybFNlZ21lbnRHcm91cCwgcm91dGU6IFJvdXRlLFxuICAgICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+PiB7XG4gICAgbGV0IG1hdGNoUmVzdWx0OiBPYnNlcnZhYmxlPE1hdGNoUmVzdWx0PjtcblxuICAgIGlmIChyb3V0ZS5wYXRoID09PSAnKionKSB7XG4gICAgICBtYXRjaFJlc3VsdCA9IG9mKGNyZWF0ZVdpbGRjYXJkTWF0Y2hSZXN1bHQoc2VnbWVudHMpKTtcbiAgICAgIC8vIFByaW9yIHZlcnNpb25zIG9mIHRoZSByb3V0ZSBtYXRjaGluZyBhbGdvcml0aG0gd291bGQgc3RvcCBtYXRjaGluZyBhdCB0aGUgd2lsZGNhcmQgcm91dGUuXG4gICAgICAvLyBXZSBzaG91bGQgaW52ZXN0aWdhdGUgYSBiZXR0ZXIgc3RyYXRlZ3kgZm9yIGFueSBleGlzdGluZyBjaGlsZHJlbi4gT3RoZXJ3aXNlLCB0aGVzZVxuICAgICAgLy8gY2hpbGQgc2VnbWVudHMgYXJlIHNpbGVudGx5IGRyb3BwZWQgZnJvbSB0aGUgbmF2aWdhdGlvbi5cbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzQwMDg5XG4gICAgICByYXdTZWdtZW50LmNoaWxkcmVuID0ge307XG4gICAgfSBlbHNlIHtcbiAgICAgIG1hdGNoUmVzdWx0ID0gbWF0Y2hXaXRoQ2hlY2tzKHJhd1NlZ21lbnQsIHJvdXRlLCBzZWdtZW50cywgaW5qZWN0b3IsIHRoaXMudXJsU2VyaWFsaXplcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hdGNoUmVzdWx0LnBpcGUoc3dpdGNoTWFwKChyZXN1bHQpID0+IHtcbiAgICAgIGlmICghcmVzdWx0Lm1hdGNoZWQpIHtcbiAgICAgICAgcmV0dXJuIG5vTWF0Y2gocmF3U2VnbWVudCk7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZSByb3V0ZSBoYXMgYW4gaW5qZWN0b3IgY3JlYXRlZCBmcm9tIHByb3ZpZGVycywgd2Ugc2hvdWxkIHN0YXJ0IHVzaW5nIHRoYXQuXG4gICAgICBpbmplY3RvciA9IHJvdXRlLl9pbmplY3RvciA/PyBpbmplY3RvcjtcbiAgICAgIHJldHVybiB0aGlzLmdldENoaWxkQ29uZmlnKGluamVjdG9yLCByb3V0ZSwgc2VnbWVudHMpXG4gICAgICAgICAgLnBpcGUoc3dpdGNoTWFwKCh7cm91dGVzOiBjaGlsZENvbmZpZ30pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNoaWxkSW5qZWN0b3IgPSByb3V0ZS5fbG9hZGVkSW5qZWN0b3IgPz8gaW5qZWN0b3I7XG5cbiAgICAgICAgICAgIGNvbnN0IHtjb25zdW1lZFNlZ21lbnRzLCByZW1haW5pbmdTZWdtZW50cywgcGFyYW1ldGVyc30gPSByZXN1bHQ7XG4gICAgICAgICAgICBjb25zdCBzbmFwc2hvdCA9IG5ldyBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KFxuICAgICAgICAgICAgICAgIGNvbnN1bWVkU2VnbWVudHMsIHBhcmFtZXRlcnMsIE9iamVjdC5mcmVlemUoey4uLnRoaXMudXJsVHJlZS5xdWVyeVBhcmFtc30pLFxuICAgICAgICAgICAgICAgIHRoaXMudXJsVHJlZS5mcmFnbWVudCwgZ2V0RGF0YShyb3V0ZSksIGdldE91dGxldChyb3V0ZSksXG4gICAgICAgICAgICAgICAgcm91dGUuY29tcG9uZW50ID8/IHJvdXRlLl9sb2FkZWRDb21wb25lbnQgPz8gbnVsbCwgcm91dGUsIGdldFJlc29sdmUocm91dGUpKTtcblxuICAgICAgICAgICAgY29uc3Qge3NlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHN9ID1cbiAgICAgICAgICAgICAgICBzcGxpdChyYXdTZWdtZW50LCBjb25zdW1lZFNlZ21lbnRzLCByZW1haW5pbmdTZWdtZW50cywgY2hpbGRDb25maWcpO1xuXG4gICAgICAgICAgICBpZiAoc2xpY2VkU2VnbWVudHMubGVuZ3RoID09PSAwICYmIHNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NDaGlsZHJlbihjaGlsZEluamVjdG9yLCBjaGlsZENvbmZpZywgc2VnbWVudEdyb3VwKVxuICAgICAgICAgICAgICAgICAgLnBpcGUobWFwKGNoaWxkcmVuID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkcmVuID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBUcmVlTm9kZShzbmFwc2hvdCwgY2hpbGRyZW4pO1xuICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY2hpbGRDb25maWcubGVuZ3RoID09PSAwICYmIHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICByZXR1cm4gb2YobmV3IFRyZWVOb2RlKHNuYXBzaG90LCBbXSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBtYXRjaGVkT25PdXRsZXQgPSBnZXRPdXRsZXQocm91dGUpID09PSBvdXRsZXQ7XG4gICAgICAgICAgICAvLyBJZiB3ZSBtYXRjaGVkIGEgY29uZmlnIGR1ZSB0byBlbXB0eSBwYXRoIG1hdGNoIG9uIGEgZGlmZmVyZW50IG91dGxldCwgd2UgbmVlZCB0b1xuICAgICAgICAgICAgLy8gY29udGludWUgcGFzc2luZyB0aGUgY3VycmVudCBvdXRsZXQgZm9yIHRoZSBzZWdtZW50IHJhdGhlciB0aGFuIHN3aXRjaCB0byBQUklNQVJZLlxuICAgICAgICAgICAgLy8gTm90ZSB0aGF0IHdlIHN3aXRjaCB0byBwcmltYXJ5IHdoZW4gd2UgaGF2ZSBhIG1hdGNoIGJlY2F1c2Ugb3V0bGV0IGNvbmZpZ3MgbG9vayBsaWtlXG4gICAgICAgICAgICAvLyB0aGlzOiB7cGF0aDogJ2EnLCBvdXRsZXQ6ICdhJywgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIC8vICB7cGF0aDogJ2InLCBjb21wb25lbnQ6IEJ9LFxuICAgICAgICAgICAgLy8gIHtwYXRoOiAnYycsIGNvbXBvbmVudDogQ30sXG4gICAgICAgICAgICAvLyBdfVxuICAgICAgICAgICAgLy8gTm90aWNlIHRoYXQgdGhlIGNoaWxkcmVuIG9mIHRoZSBuYW1lZCBvdXRsZXQgYXJlIGNvbmZpZ3VyZWQgd2l0aCB0aGUgcHJpbWFyeSBvdXRsZXRcbiAgICAgICAgICAgIHJldHVybiB0aGlzXG4gICAgICAgICAgICAgICAgLnByb2Nlc3NTZWdtZW50KFxuICAgICAgICAgICAgICAgICAgICBjaGlsZEluamVjdG9yLCBjaGlsZENvbmZpZywgc2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50cyxcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZE9uT3V0bGV0ID8gUFJJTUFSWV9PVVRMRVQgOiBvdXRsZXQsIHRydWUpXG4gICAgICAgICAgICAgICAgLnBpcGUobWFwKGNoaWxkID0+IHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVHJlZU5vZGUoc25hcHNob3QsIGNoaWxkIGluc3RhbmNlb2YgVHJlZU5vZGUgPyBbY2hpbGRdIDogW10pO1xuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICB9KSk7XG4gICAgfSkpO1xuICB9XG4gIHByaXZhdGUgZ2V0Q2hpbGRDb25maWcoaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJvdXRlOiBSb3V0ZSwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSk6XG4gICAgICBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4ge1xuICAgIGlmIChyb3V0ZS5jaGlsZHJlbikge1xuICAgICAgLy8gVGhlIGNoaWxkcmVuIGJlbG9uZyB0byB0aGUgc2FtZSBtb2R1bGVcbiAgICAgIHJldHVybiBvZih7cm91dGVzOiByb3V0ZS5jaGlsZHJlbiwgaW5qZWN0b3J9KTtcbiAgICB9XG5cbiAgICBpZiAocm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgICAvLyBsYXp5IGNoaWxkcmVuIGJlbG9uZyB0byB0aGUgbG9hZGVkIG1vZHVsZVxuICAgICAgaWYgKHJvdXRlLl9sb2FkZWRSb3V0ZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gb2Yoe3JvdXRlczogcm91dGUuX2xvYWRlZFJvdXRlcywgaW5qZWN0b3I6IHJvdXRlLl9sb2FkZWRJbmplY3Rvcn0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcnVuQ2FuTG9hZEd1YXJkcyhpbmplY3Rvciwgcm91dGUsIHNlZ21lbnRzLCB0aGlzLnVybFNlcmlhbGl6ZXIpXG4gICAgICAgICAgLnBpcGUobWVyZ2VNYXAoKHNob3VsZExvYWRSZXN1bHQ6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgIGlmIChzaG91bGRMb2FkUmVzdWx0KSB7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmZpZ0xvYWRlci5sb2FkQ2hpbGRyZW4oaW5qZWN0b3IsIHJvdXRlKVxuICAgICAgICAgICAgICAgICAgLnBpcGUodGFwKChjZmc6IExvYWRlZFJvdXRlckNvbmZpZykgPT4ge1xuICAgICAgICAgICAgICAgICAgICByb3V0ZS5fbG9hZGVkUm91dGVzID0gY2ZnLnJvdXRlcztcbiAgICAgICAgICAgICAgICAgICAgcm91dGUuX2xvYWRlZEluamVjdG9yID0gY2ZnLmluamVjdG9yO1xuICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNhbkxvYWRGYWlscyhyb3V0ZSk7XG4gICAgICAgICAgfSkpO1xuICAgIH1cblxuICAgIHJldHVybiBvZih7cm91dGVzOiBbXSwgaW5qZWN0b3J9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzb3J0QWN0aXZhdGVkUm91dGVTbmFwc2hvdHMobm9kZXM6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10pOiB2b2lkIHtcbiAgbm9kZXMuc29ydCgoYSwgYikgPT4ge1xuICAgIGlmIChhLnZhbHVlLm91dGxldCA9PT0gUFJJTUFSWV9PVVRMRVQpIHJldHVybiAtMTtcbiAgICBpZiAoYi52YWx1ZS5vdXRsZXQgPT09IFBSSU1BUllfT1VUTEVUKSByZXR1cm4gMTtcbiAgICByZXR1cm4gYS52YWx1ZS5vdXRsZXQubG9jYWxlQ29tcGFyZShiLnZhbHVlLm91dGxldCk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBoYXNFbXB0eVBhdGhDb25maWcobm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4pIHtcbiAgY29uc3QgY29uZmlnID0gbm9kZS52YWx1ZS5yb3V0ZUNvbmZpZztcbiAgcmV0dXJuIGNvbmZpZyAmJiBjb25maWcucGF0aCA9PT0gJyc7XG59XG5cbi8qKlxuICogRmluZHMgYFRyZWVOb2RlYHMgd2l0aCBtYXRjaGluZyBlbXB0eSBwYXRoIHJvdXRlIGNvbmZpZ3MgYW5kIG1lcmdlcyB0aGVtIGludG8gYFRyZWVOb2RlYCB3aXRoXG4gKiB0aGUgY2hpbGRyZW4gZnJvbSBlYWNoIGR1cGxpY2F0ZS4gVGhpcyBpcyBuZWNlc3NhcnkgYmVjYXVzZSBkaWZmZXJlbnQgb3V0bGV0cyBjYW4gbWF0Y2ggYVxuICogc2luZ2xlIGVtcHR5IHBhdGggcm91dGUgY29uZmlnIGFuZCB0aGUgcmVzdWx0cyBuZWVkIHRvIHRoZW4gYmUgbWVyZ2VkLlxuICovXG5mdW5jdGlvbiBtZXJnZUVtcHR5UGF0aE1hdGNoZXMobm9kZXM6IEFycmF5PFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+Pik6XG4gICAgQXJyYXk8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4+IHtcbiAgY29uc3QgcmVzdWx0OiBBcnJheTxUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pj4gPSBbXTtcbiAgLy8gVGhlIHNldCBvZiBub2RlcyB3aGljaCBjb250YWluIGNoaWxkcmVuIHRoYXQgd2VyZSBtZXJnZWQgZnJvbSB0d28gZHVwbGljYXRlIGVtcHR5IHBhdGggbm9kZXMuXG4gIGNvbnN0IG1lcmdlZE5vZGVzOiBTZXQ8VHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4+ID0gbmV3IFNldCgpO1xuXG4gIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgIGlmICghaGFzRW1wdHlQYXRoQ29uZmlnKG5vZGUpKSB7XG4gICAgICByZXN1bHQucHVzaChub2RlKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGR1cGxpY2F0ZUVtcHR5UGF0aE5vZGUgPVxuICAgICAgICByZXN1bHQuZmluZChyZXN1bHROb2RlID0+IG5vZGUudmFsdWUucm91dGVDb25maWcgPT09IHJlc3VsdE5vZGUudmFsdWUucm91dGVDb25maWcpO1xuICAgIGlmIChkdXBsaWNhdGVFbXB0eVBhdGhOb2RlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGR1cGxpY2F0ZUVtcHR5UGF0aE5vZGUuY2hpbGRyZW4ucHVzaCguLi5ub2RlLmNoaWxkcmVuKTtcbiAgICAgIG1lcmdlZE5vZGVzLmFkZChkdXBsaWNhdGVFbXB0eVBhdGhOb2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0LnB1c2gobm9kZSk7XG4gICAgfVxuICB9XG4gIC8vIEZvciBlYWNoIG5vZGUgd2hpY2ggaGFzIGNoaWxkcmVuIGZyb20gbXVsdGlwbGUgc291cmNlcywgd2UgbmVlZCB0byByZWNvbXB1dGUgYSBuZXcgYFRyZWVOb2RlYFxuICAvLyBieSBhbHNvIG1lcmdpbmcgdGhvc2UgY2hpbGRyZW4uIFRoaXMgaXMgbmVjZXNzYXJ5IHdoZW4gdGhlcmUgYXJlIG11bHRpcGxlIGVtcHR5IHBhdGggY29uZmlnc1xuICAvLyBpbiBhIHJvdy4gUHV0IGFub3RoZXIgd2F5OiB3aGVuZXZlciB3ZSBjb21iaW5lIGNoaWxkcmVuIG9mIHR3byBub2Rlcywgd2UgbmVlZCB0byBhbHNvIGNoZWNrXG4gIC8vIGlmIGFueSBvZiB0aG9zZSBjaGlsZHJlbiBjYW4gYmUgY29tYmluZWQgaW50byBhIHNpbmdsZSBub2RlIGFzIHdlbGwuXG4gIGZvciAoY29uc3QgbWVyZ2VkTm9kZSBvZiBtZXJnZWROb2Rlcykge1xuICAgIGNvbnN0IG1lcmdlZENoaWxkcmVuID0gbWVyZ2VFbXB0eVBhdGhNYXRjaGVzKG1lcmdlZE5vZGUuY2hpbGRyZW4pO1xuICAgIHJlc3VsdC5wdXNoKG5ldyBUcmVlTm9kZShtZXJnZWROb2RlLnZhbHVlLCBtZXJnZWRDaGlsZHJlbikpO1xuICB9XG4gIHJldHVybiByZXN1bHQuZmlsdGVyKG4gPT4gIW1lcmdlZE5vZGVzLmhhcyhuKSk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrT3V0bGV0TmFtZVVuaXF1ZW5lc3Mobm9kZXM6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10pOiB2b2lkIHtcbiAgY29uc3QgbmFtZXM6IHtbazogc3RyaW5nXTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdH0gPSB7fTtcbiAgbm9kZXMuZm9yRWFjaChuID0+IHtcbiAgICBjb25zdCByb3V0ZVdpdGhTYW1lT3V0bGV0TmFtZSA9IG5hbWVzW24udmFsdWUub3V0bGV0XTtcbiAgICBpZiAocm91dGVXaXRoU2FtZU91dGxldE5hbWUpIHtcbiAgICAgIGNvbnN0IHAgPSByb3V0ZVdpdGhTYW1lT3V0bGV0TmFtZS51cmwubWFwKHMgPT4gcy50b1N0cmluZygpKS5qb2luKCcvJyk7XG4gICAgICBjb25zdCBjID0gbi52YWx1ZS51cmwubWFwKHMgPT4gcy50b1N0cmluZygpKS5qb2luKCcvJyk7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuVFdPX1NFR01FTlRTX1dJVEhfU0FNRV9PVVRMRVQsXG4gICAgICAgICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiZcbiAgICAgICAgICAgICAgYFR3byBzZWdtZW50cyBjYW5ub3QgaGF2ZSB0aGUgc2FtZSBvdXRsZXQgbmFtZTogJyR7cH0nIGFuZCAnJHtjfScuYCk7XG4gICAgfVxuICAgIG5hbWVzW24udmFsdWUub3V0bGV0XSA9IG4udmFsdWU7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZXREYXRhKHJvdXRlOiBSb3V0ZSk6IERhdGEge1xuICByZXR1cm4gcm91dGUuZGF0YSB8fCB7fTtcbn1cblxuZnVuY3Rpb24gZ2V0UmVzb2x2ZShyb3V0ZTogUm91dGUpOiBSZXNvbHZlRGF0YSB7XG4gIHJldHVybiByb3V0ZS5yZXNvbHZlIHx8IHt9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVXaWxkY2FyZE1hdGNoUmVzdWx0KHNlZ21lbnRzOiBVcmxTZWdtZW50W10pOiBNYXRjaFJlc3VsdCB7XG4gIHJldHVybiB7XG4gICAgbWF0Y2hlZDogdHJ1ZSxcbiAgICBwYXJhbWV0ZXJzOiBzZWdtZW50cy5sZW5ndGggPiAwID8gbGFzdChzZWdtZW50cykhLnBhcmFtZXRlcnMgOiB7fSxcbiAgICBjb25zdW1lZFNlZ21lbnRzOiBzZWdtZW50cyxcbiAgICByZW1haW5pbmdTZWdtZW50czogW10sXG4gICAgcG9zaXRpb25hbFBhcmFtU2VnbWVudHM6IHt9LFxuICB9O1xufVxuIl19