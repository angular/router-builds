/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NgModuleRef } from '@angular/core';
import { defer, EmptyError, from, Observable, of } from 'rxjs';
import { catchError, combineAll, concatMap, first, map, mergeMap, tap } from 'rxjs/operators';
import { LoadedRouterConfig } from './config';
import { prioritizedGuardValue } from './operators/prioritized_guard_value';
import { defaultUrlMatcher, navigationCancelingError, PRIMARY_OUTLET } from './shared';
import { UrlSegmentGroup, UrlTree } from './url_tree';
import { forEach, waitForMap, wrapIntoObservable } from './utils/collection';
import { getOutlet, groupRoutesByOutlet } from './utils/config';
import { isCanLoad, isFunction, isUrlTree } from './utils/type_guards';
class NoMatch {
    constructor(segmentGroup) {
        this.segmentGroup = segmentGroup || null;
    }
}
class AbsoluteRedirect {
    constructor(urlTree) {
        this.urlTree = urlTree;
    }
}
function noMatch(segmentGroup) {
    return new Observable((obs) => obs.error(new NoMatch(segmentGroup)));
}
function absoluteRedirect(newTree) {
    return new Observable((obs) => obs.error(new AbsoluteRedirect(newTree)));
}
function namedOutletsRedirect(redirectTo) {
    return new Observable((obs) => obs.error(new Error(`Only absolute redirects can have named outlets. redirectTo: '${redirectTo}'`)));
}
function canLoadFails(route) {
    return new Observable((obs) => obs.error(navigationCancelingError(`Cannot load children because the guard of the route "path: '${route.path}'" returned false`)));
}
/**
 * Returns the `UrlTree` with the redirection applied.
 *
 * Lazy modules are loaded along the way.
 */
export function applyRedirects(moduleInjector, configLoader, urlSerializer, urlTree, config) {
    return new ApplyRedirects(moduleInjector, configLoader, urlSerializer, urlTree, config).apply();
}
class ApplyRedirects {
    constructor(moduleInjector, configLoader, urlSerializer, urlTree, config) {
        this.configLoader = configLoader;
        this.urlSerializer = urlSerializer;
        this.urlTree = urlTree;
        this.config = config;
        this.allowRedirects = true;
        this.ngModule = moduleInjector.get(NgModuleRef);
    }
    apply() {
        const expanded$ = this.expandSegmentGroup(this.ngModule, this.config, this.urlTree.root, PRIMARY_OUTLET);
        const urlTrees$ = expanded$.pipe(map((rootSegmentGroup) => this.createUrlTree(rootSegmentGroup, this.urlTree.queryParams, this.urlTree.fragment)));
        return urlTrees$.pipe(catchError((e) => {
            if (e instanceof AbsoluteRedirect) {
                // after an absolute redirect we do not apply any more redirects!
                this.allowRedirects = false;
                // we need to run matching, so we can fetch all lazy-loaded modules
                return this.match(e.urlTree);
            }
            if (e instanceof NoMatch) {
                throw this.noMatchError(e);
            }
            throw e;
        }));
    }
    match(tree) {
        const expanded$ = this.expandSegmentGroup(this.ngModule, this.config, tree.root, PRIMARY_OUTLET);
        const mapped$ = expanded$.pipe(map((rootSegmentGroup) => this.createUrlTree(rootSegmentGroup, tree.queryParams, tree.fragment)));
        return mapped$.pipe(catchError((e) => {
            if (e instanceof NoMatch) {
                throw this.noMatchError(e);
            }
            throw e;
        }));
    }
    noMatchError(e) {
        return new Error(`Cannot match any routes. URL Segment: '${e.segmentGroup}'`);
    }
    createUrlTree(rootCandidate, queryParams, fragment) {
        const root = rootCandidate.segments.length > 0 ?
            new UrlSegmentGroup([], { [PRIMARY_OUTLET]: rootCandidate }) :
            rootCandidate;
        return new UrlTree(root, queryParams, fragment);
    }
    expandSegmentGroup(ngModule, routes, segmentGroup, outlet) {
        if (segmentGroup.segments.length === 0 && segmentGroup.hasChildren()) {
            return this.expandChildren(ngModule, routes, segmentGroup)
                .pipe(map((children) => new UrlSegmentGroup([], children)));
        }
        return this.expandSegment(ngModule, segmentGroup, routes, segmentGroup.segments, outlet, true);
    }
    // Recursively expand segment groups for all the child outlets
    expandChildren(ngModule, routes, segmentGroup) {
        return waitForMap(segmentGroup.children, (childOutlet, child) => this.expandSegmentGroup(ngModule, routes, child, childOutlet));
    }
    expandSegment(ngModule, segmentGroup, routes, segments, outlet, allowRedirects) {
        // We need to expand each outlet group independently to ensure that we not only load modules
        // for routes matching the given `outlet`, but also those which will be activated because
        // their path is empty string. This can result in multiple outlets being activated at once.
        const routesByOutlet = groupRoutesByOutlet(routes);
        if (!routesByOutlet.has(outlet)) {
            routesByOutlet.set(outlet, []);
        }
        const expandRoutes = (routes) => {
            return from(routes).pipe(concatMap((r) => {
                const expanded$ = this.expandSegmentAgainstRoute(ngModule, segmentGroup, routes, r, segments, outlet, allowRedirects);
                return expanded$.pipe(catchError(e => {
                    if (e instanceof NoMatch) {
                        return of(null);
                    }
                    throw e;
                }));
            }), first((s) => s !== null), catchError(e => {
                if (e instanceof EmptyError || e.name === 'EmptyError') {
                    if (this.noLeftoversInUrl(segmentGroup, segments, outlet)) {
                        return of(new UrlSegmentGroup([], {}));
                    }
                    throw new NoMatch(segmentGroup);
                }
                throw e;
            }));
        };
        const expansions = Array.from(routesByOutlet.entries()).map(([routeOutlet, routes]) => {
            const expanded = expandRoutes(routes);
            // Map all results from outlets we aren't activating to `null` so they can be ignored later
            return routeOutlet === outlet ? expanded :
                expanded.pipe(map(() => null), catchError(() => of(null)));
        });
        return from(expansions)
            .pipe(combineAll(), first(), 
        // Return only the expansion for the route outlet we are trying to activate.
        map(results => results.find(result => result !== null)));
    }
    noLeftoversInUrl(segmentGroup, segments, outlet) {
        return segments.length === 0 && !segmentGroup.children[outlet];
    }
    expandSegmentAgainstRoute(ngModule, segmentGroup, routes, route, paths, outlet, allowRedirects) {
        // Empty string segments are special because multiple outlets can match a single path, i.e.
        // `[{path: '', component: B}, {path: '', loadChildren: () => {}, outlet: "about"}]`
        if (getOutlet(route) !== outlet && route.path !== '') {
            return noMatch(segmentGroup);
        }
        if (route.redirectTo === undefined) {
            return this.matchSegmentAgainstRoute(ngModule, segmentGroup, route, paths);
        }
        if (allowRedirects && this.allowRedirects) {
            return this.expandSegmentAgainstRouteUsingRedirect(ngModule, segmentGroup, routes, route, paths, outlet);
        }
        return noMatch(segmentGroup);
    }
    expandSegmentAgainstRouteUsingRedirect(ngModule, segmentGroup, routes, route, segments, outlet) {
        if (route.path === '**') {
            return this.expandWildCardWithParamsAgainstRouteUsingRedirect(ngModule, routes, route, outlet);
        }
        return this.expandRegularSegmentAgainstRouteUsingRedirect(ngModule, segmentGroup, routes, route, segments, outlet);
    }
    expandWildCardWithParamsAgainstRouteUsingRedirect(ngModule, routes, route, outlet) {
        const newTree = this.applyRedirectCommands([], route.redirectTo, {});
        if (route.redirectTo.startsWith('/')) {
            return absoluteRedirect(newTree);
        }
        return this.lineralizeSegments(route, newTree).pipe(mergeMap((newSegments) => {
            const group = new UrlSegmentGroup(newSegments, {});
            return this.expandSegment(ngModule, group, routes, newSegments, outlet, false);
        }));
    }
    expandRegularSegmentAgainstRouteUsingRedirect(ngModule, segmentGroup, routes, route, segments, outlet) {
        const { matched, consumedSegments, lastChild, positionalParamSegments } = match(segmentGroup, route, segments);
        if (!matched)
            return noMatch(segmentGroup);
        const newTree = this.applyRedirectCommands(consumedSegments, route.redirectTo, positionalParamSegments);
        if (route.redirectTo.startsWith('/')) {
            return absoluteRedirect(newTree);
        }
        return this.lineralizeSegments(route, newTree).pipe(mergeMap((newSegments) => {
            return this.expandSegment(ngModule, segmentGroup, routes, newSegments.concat(segments.slice(lastChild)), outlet, false);
        }));
    }
    matchSegmentAgainstRoute(ngModule, rawSegmentGroup, route, segments) {
        if (route.path === '**') {
            if (route.loadChildren) {
                return defer(() => this.configLoader.load(ngModule.injector, route)
                    .pipe(map((cfg) => {
                    route._loadedConfig = cfg;
                    return new UrlSegmentGroup(segments, {});
                })));
            }
            return of(new UrlSegmentGroup(segments, {}));
        }
        const { matched, consumedSegments, lastChild } = match(rawSegmentGroup, route, segments);
        if (!matched)
            return noMatch(rawSegmentGroup);
        const rawSlicedSegments = segments.slice(lastChild);
        const childConfig$ = this.getChildConfig(ngModule, route, segments);
        return childConfig$.pipe(mergeMap((routerConfig) => {
            const childModule = routerConfig.module;
            const childConfig = routerConfig.routes;
            const { segmentGroup, slicedSegments } = split(rawSegmentGroup, consumedSegments, rawSlicedSegments, childConfig);
            if (slicedSegments.length === 0 && segmentGroup.hasChildren()) {
                const expanded$ = this.expandChildren(childModule, childConfig, segmentGroup);
                return expanded$.pipe(map((children) => new UrlSegmentGroup(consumedSegments, children)));
            }
            if (childConfig.length === 0 && slicedSegments.length === 0) {
                return of(new UrlSegmentGroup(consumedSegments, {}));
            }
            const expanded$ = this.expandSegment(childModule, segmentGroup, childConfig, slicedSegments, PRIMARY_OUTLET, true);
            return expanded$.pipe(map((cs) => new UrlSegmentGroup(consumedSegments.concat(cs.segments), cs.children)));
        }));
    }
    getChildConfig(ngModule, route, segments) {
        if (route.children) {
            // The children belong to the same module
            return of(new LoadedRouterConfig(route.children, ngModule));
        }
        if (route.loadChildren) {
            // lazy children belong to the loaded module
            if (route._loadedConfig !== undefined) {
                return of(route._loadedConfig);
            }
            return this.runCanLoadGuards(ngModule.injector, route, segments)
                .pipe(mergeMap((shouldLoadResult) => {
                if (shouldLoadResult) {
                    return this.configLoader.load(ngModule.injector, route)
                        .pipe(map((cfg) => {
                        route._loadedConfig = cfg;
                        return cfg;
                    }));
                }
                return canLoadFails(route);
            }));
        }
        return of(new LoadedRouterConfig([], ngModule));
    }
    runCanLoadGuards(moduleInjector, route, segments) {
        const canLoad = route.canLoad;
        if (!canLoad || canLoad.length === 0)
            return of(true);
        const canLoadObservables = canLoad.map((injectionToken) => {
            const guard = moduleInjector.get(injectionToken);
            let guardVal;
            if (isCanLoad(guard)) {
                guardVal = guard.canLoad(route, segments);
            }
            else if (isFunction(guard)) {
                guardVal = guard(route, segments);
            }
            else {
                throw new Error('Invalid CanLoad guard');
            }
            return wrapIntoObservable(guardVal);
        });
        return of(canLoadObservables)
            .pipe(prioritizedGuardValue(), tap((result) => {
            if (!isUrlTree(result))
                return;
            const error = navigationCancelingError(`Redirecting to "${this.urlSerializer.serialize(result)}"`);
            error.url = result;
            throw error;
        }), map(result => result === true));
    }
    lineralizeSegments(route, urlTree) {
        let res = [];
        let c = urlTree.root;
        while (true) {
            res = res.concat(c.segments);
            if (c.numberOfChildren === 0) {
                return of(res);
            }
            if (c.numberOfChildren > 1 || !c.children[PRIMARY_OUTLET]) {
                return namedOutletsRedirect(route.redirectTo);
            }
            c = c.children[PRIMARY_OUTLET];
        }
    }
    applyRedirectCommands(segments, redirectTo, posParams) {
        return this.applyRedirectCreatreUrlTree(redirectTo, this.urlSerializer.parse(redirectTo), segments, posParams);
    }
    applyRedirectCreatreUrlTree(redirectTo, urlTree, segments, posParams) {
        const newRoot = this.createSegmentGroup(redirectTo, urlTree.root, segments, posParams);
        return new UrlTree(newRoot, this.createQueryParams(urlTree.queryParams, this.urlTree.queryParams), urlTree.fragment);
    }
    createQueryParams(redirectToParams, actualParams) {
        const res = {};
        forEach(redirectToParams, (v, k) => {
            const copySourceValue = typeof v === 'string' && v.startsWith(':');
            if (copySourceValue) {
                const sourceName = v.substring(1);
                res[k] = actualParams[sourceName];
            }
            else {
                res[k] = v;
            }
        });
        return res;
    }
    createSegmentGroup(redirectTo, group, segments, posParams) {
        const updatedSegments = this.createSegments(redirectTo, group.segments, segments, posParams);
        let children = {};
        forEach(group.children, (child, name) => {
            children[name] = this.createSegmentGroup(redirectTo, child, segments, posParams);
        });
        return new UrlSegmentGroup(updatedSegments, children);
    }
    createSegments(redirectTo, redirectToSegments, actualSegments, posParams) {
        return redirectToSegments.map(s => s.path.startsWith(':') ? this.findPosParam(redirectTo, s, posParams) :
            this.findOrReturn(s, actualSegments));
    }
    findPosParam(redirectTo, redirectToUrlSegment, posParams) {
        const pos = posParams[redirectToUrlSegment.path.substring(1)];
        if (!pos)
            throw new Error(`Cannot redirect to '${redirectTo}'. Cannot find '${redirectToUrlSegment.path}'.`);
        return pos;
    }
    findOrReturn(redirectToUrlSegment, actualSegments) {
        let idx = 0;
        for (const s of actualSegments) {
            if (s.path === redirectToUrlSegment.path) {
                actualSegments.splice(idx);
                return s;
            }
            idx++;
        }
        return redirectToUrlSegment;
    }
}
function match(segmentGroup, route, segments) {
    if (route.path === '') {
        if ((route.pathMatch === 'full') && (segmentGroup.hasChildren() || segments.length > 0)) {
            return { matched: false, consumedSegments: [], lastChild: 0, positionalParamSegments: {} };
        }
        return { matched: true, consumedSegments: [], lastChild: 0, positionalParamSegments: {} };
    }
    const matcher = route.matcher || defaultUrlMatcher;
    const res = matcher(segments, segmentGroup, route);
    if (!res) {
        return {
            matched: false,
            consumedSegments: [],
            lastChild: 0,
            positionalParamSegments: {},
        };
    }
    return {
        matched: true,
        consumedSegments: res.consumed,
        lastChild: res.consumed.length,
        positionalParamSegments: res.posParams,
    };
}
function split(segmentGroup, consumedSegments, slicedSegments, config) {
    if (slicedSegments.length > 0 &&
        containsEmptyPathRedirectsWithNamedOutlets(segmentGroup, slicedSegments, config)) {
        const s = new UrlSegmentGroup(consumedSegments, createChildrenForEmptySegments(config, new UrlSegmentGroup(slicedSegments, segmentGroup.children)));
        return { segmentGroup: mergeTrivialChildren(s), slicedSegments: [] };
    }
    if (slicedSegments.length === 0 &&
        containsEmptyPathRedirects(segmentGroup, slicedSegments, config)) {
        const s = new UrlSegmentGroup(segmentGroup.segments, addEmptySegmentsToChildrenIfNeeded(segmentGroup, slicedSegments, config, segmentGroup.children));
        return { segmentGroup: mergeTrivialChildren(s), slicedSegments };
    }
    return { segmentGroup, slicedSegments };
}
function mergeTrivialChildren(s) {
    if (s.numberOfChildren === 1 && s.children[PRIMARY_OUTLET]) {
        const c = s.children[PRIMARY_OUTLET];
        return new UrlSegmentGroup(s.segments.concat(c.segments), c.children);
    }
    return s;
}
function addEmptySegmentsToChildrenIfNeeded(segmentGroup, slicedSegments, routes, children) {
    const res = {};
    for (const r of routes) {
        if (isEmptyPathRedirect(segmentGroup, slicedSegments, r) && !children[getOutlet(r)]) {
            res[getOutlet(r)] = new UrlSegmentGroup([], {});
        }
    }
    return Object.assign(Object.assign({}, children), res);
}
function createChildrenForEmptySegments(routes, primarySegmentGroup) {
    const res = {};
    res[PRIMARY_OUTLET] = primarySegmentGroup;
    for (const r of routes) {
        if (r.path === '' && getOutlet(r) !== PRIMARY_OUTLET) {
            res[getOutlet(r)] = new UrlSegmentGroup([], {});
        }
    }
    return res;
}
function containsEmptyPathRedirectsWithNamedOutlets(segmentGroup, segments, routes) {
    return routes.some(r => isEmptyPathRedirect(segmentGroup, segments, r) && getOutlet(r) !== PRIMARY_OUTLET);
}
function containsEmptyPathRedirects(segmentGroup, segments, routes) {
    return routes.some(r => isEmptyPathRedirect(segmentGroup, segments, r));
}
function isEmptyPathRedirect(segmentGroup, segments, r) {
    if ((segmentGroup.hasChildren() || segments.length > 0) && r.pathMatch === 'full') {
        return false;
    }
    return r.path === '' && r.redirectTo !== undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHlfcmVkaXJlY3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9hcHBseV9yZWRpcmVjdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFXLFdBQVcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNwRCxPQUFPLEVBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFZLEVBQUUsRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUN2RSxPQUFPLEVBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFNUYsT0FBTyxFQUFDLGtCQUFrQixFQUFnQixNQUFNLFVBQVUsQ0FBQztBQUUzRCxPQUFPLEVBQUMscUJBQXFCLEVBQUMsTUFBTSxxQ0FBcUMsQ0FBQztBQUUxRSxPQUFPLEVBQUMsaUJBQWlCLEVBQUUsd0JBQXdCLEVBQVUsY0FBYyxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzdGLE9BQU8sRUFBYSxlQUFlLEVBQWlCLE9BQU8sRUFBQyxNQUFNLFlBQVksQ0FBQztBQUMvRSxPQUFPLEVBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQzNFLE9BQU8sRUFBQyxTQUFTLEVBQUUsbUJBQW1CLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUM5RCxPQUFPLEVBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUVyRSxNQUFNLE9BQU87SUFHWCxZQUFZLFlBQThCO1FBQ3hDLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxJQUFJLElBQUksQ0FBQztJQUMzQyxDQUFDO0NBQ0Y7QUFFRCxNQUFNLGdCQUFnQjtJQUNwQixZQUFt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QUFtQixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLGNBQWMsQ0FBQyxDQUFDO0FBQzlGLENBQUM7QUFFRCxTQUFTLDBCQUEwQixDQUMvQixZQUE2QixFQUFFLFFBQXNCLEVBQUUsTUFBZTtJQUN4RSxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUUsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQ3hCLFlBQTZCLEVBQUUsUUFBc0IsRUFBRSxDQUFRO0lBQ2pFLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxLQUFLLE1BQU0sRUFBRTtRQUNqRixPQUFPLEtBQUssQ0FBQztLQUNkO0lBRUQsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQztBQUNyRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SW5qZWN0b3IsIE5nTW9kdWxlUmVmfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ZGVmZXIsIEVtcHR5RXJyb3IsIGZyb20sIE9ic2VydmFibGUsIE9ic2VydmVyLCBvZn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NhdGNoRXJyb3IsIGNvbWJpbmVBbGwsIGNvbmNhdE1hcCwgZmlyc3QsIG1hcCwgbWVyZ2VNYXAsIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0xvYWRlZFJvdXRlckNvbmZpZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtDYW5Mb2FkRm59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge3ByaW9yaXRpemVkR3VhcmRWYWx1ZX0gZnJvbSAnLi9vcGVyYXRvcnMvcHJpb3JpdGl6ZWRfZ3VhcmRfdmFsdWUnO1xuaW1wb3J0IHtSb3V0ZXJDb25maWdMb2FkZXJ9IGZyb20gJy4vcm91dGVyX2NvbmZpZ19sb2FkZXInO1xuaW1wb3J0IHtkZWZhdWx0VXJsTWF0Y2hlciwgbmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yLCBQYXJhbXMsIFBSSU1BUllfT1VUTEVUfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge1VybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cCwgVXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge2ZvckVhY2gsIHdhaXRGb3JNYXAsIHdyYXBJbnRvT2JzZXJ2YWJsZX0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcbmltcG9ydCB7Z2V0T3V0bGV0LCBncm91cFJvdXRlc0J5T3V0bGV0fSBmcm9tICcuL3V0aWxzL2NvbmZpZyc7XG5pbXBvcnQge2lzQ2FuTG9hZCwgaXNGdW5jdGlvbiwgaXNVcmxUcmVlfSBmcm9tICcuL3V0aWxzL3R5cGVfZ3VhcmRzJztcblxuY2xhc3MgTm9NYXRjaCB7XG4gIHB1YmxpYyBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cHxudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHNlZ21lbnRHcm91cD86IFVybFNlZ21lbnRHcm91cCkge1xuICAgIHRoaXMuc2VnbWVudEdyb3VwID0gc2VnbWVudEdyb3VwIHx8IG51bGw7XG4gIH1cbn1cblxuY2xhc3MgQWJzb2x1dGVSZWRpcmVjdCB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyB1cmxUcmVlOiBVcmxUcmVlKSB7fVxufVxuXG5mdW5jdGlvbiBub01hdGNoKHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4oXG4gICAgICAob2JzOiBPYnNlcnZlcjxVcmxTZWdtZW50R3JvdXA+KSA9PiBvYnMuZXJyb3IobmV3IE5vTWF0Y2goc2VnbWVudEdyb3VwKSkpO1xufVxuXG5mdW5jdGlvbiBhYnNvbHV0ZVJlZGlyZWN0KG5ld1RyZWU6IFVybFRyZWUpOiBPYnNlcnZhYmxlPGFueT4ge1xuICByZXR1cm4gbmV3IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPihcbiAgICAgIChvYnM6IE9ic2VydmVyPFVybFNlZ21lbnRHcm91cD4pID0+IG9icy5lcnJvcihuZXcgQWJzb2x1dGVSZWRpcmVjdChuZXdUcmVlKSkpO1xufVxuXG5mdW5jdGlvbiBuYW1lZE91dGxldHNSZWRpcmVjdChyZWRpcmVjdFRvOiBzdHJpbmcpOiBPYnNlcnZhYmxlPGFueT4ge1xuICByZXR1cm4gbmV3IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPihcbiAgICAgIChvYnM6IE9ic2VydmVyPFVybFNlZ21lbnRHcm91cD4pID0+IG9icy5lcnJvcihuZXcgRXJyb3IoXG4gICAgICAgICAgYE9ubHkgYWJzb2x1dGUgcmVkaXJlY3RzIGNhbiBoYXZlIG5hbWVkIG91dGxldHMuIHJlZGlyZWN0VG86ICcke3JlZGlyZWN0VG99J2ApKSk7XG59XG5cbmZ1bmN0aW9uIGNhbkxvYWRGYWlscyhyb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4ge1xuICByZXR1cm4gbmV3IE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPihcbiAgICAgIChvYnM6IE9ic2VydmVyPExvYWRlZFJvdXRlckNvbmZpZz4pID0+IG9icy5lcnJvcihcbiAgICAgICAgICBuYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoYENhbm5vdCBsb2FkIGNoaWxkcmVuIGJlY2F1c2UgdGhlIGd1YXJkIG9mIHRoZSByb3V0ZSBcInBhdGg6ICcke1xuICAgICAgICAgICAgICByb3V0ZS5wYXRofSdcIiByZXR1cm5lZCBmYWxzZWApKSk7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgYFVybFRyZWVgIHdpdGggdGhlIHJlZGlyZWN0aW9uIGFwcGxpZWQuXG4gKlxuICogTGF6eSBtb2R1bGVzIGFyZSBsb2FkZWQgYWxvbmcgdGhlIHdheS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UmVkaXJlY3RzKFxuICAgIG1vZHVsZUluamVjdG9yOiBJbmplY3RvciwgY29uZmlnTG9hZGVyOiBSb3V0ZXJDb25maWdMb2FkZXIsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgdXJsVHJlZTogVXJsVHJlZSwgY29uZmlnOiBSb3V0ZXMpOiBPYnNlcnZhYmxlPFVybFRyZWU+IHtcbiAgcmV0dXJuIG5ldyBBcHBseVJlZGlyZWN0cyhtb2R1bGVJbmplY3RvciwgY29uZmlnTG9hZGVyLCB1cmxTZXJpYWxpemVyLCB1cmxUcmVlLCBjb25maWcpLmFwcGx5KCk7XG59XG5cbmNsYXNzIEFwcGx5UmVkaXJlY3RzIHtcbiAgcHJpdmF0ZSBhbGxvd1JlZGlyZWN0czogYm9vbGVhbiA9IHRydWU7XG4gIHByaXZhdGUgbmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBtb2R1bGVJbmplY3RvcjogSW5qZWN0b3IsIHByaXZhdGUgY29uZmlnTG9hZGVyOiBSb3V0ZXJDb25maWdMb2FkZXIsXG4gICAgICBwcml2YXRlIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIHByaXZhdGUgdXJsVHJlZTogVXJsVHJlZSwgcHJpdmF0ZSBjb25maWc6IFJvdXRlcykge1xuICAgIHRoaXMubmdNb2R1bGUgPSBtb2R1bGVJbmplY3Rvci5nZXQoTmdNb2R1bGVSZWYpO1xuICB9XG5cbiAgYXBwbHkoKTogT2JzZXJ2YWJsZTxVcmxUcmVlPiB7XG4gICAgY29uc3QgZXhwYW5kZWQkID1cbiAgICAgICAgdGhpcy5leHBhbmRTZWdtZW50R3JvdXAodGhpcy5uZ01vZHVsZSwgdGhpcy5jb25maWcsIHRoaXMudXJsVHJlZS5yb290LCBQUklNQVJZX09VVExFVCk7XG4gICAgY29uc3QgdXJsVHJlZXMkID0gZXhwYW5kZWQkLnBpcGUoXG4gICAgICAgIG1hcCgocm9vdFNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKSA9PiB0aGlzLmNyZWF0ZVVybFRyZWUoXG4gICAgICAgICAgICAgICAgcm9vdFNlZ21lbnRHcm91cCwgdGhpcy51cmxUcmVlLnF1ZXJ5UGFyYW1zLCB0aGlzLnVybFRyZWUuZnJhZ21lbnQhKSkpO1xuICAgIHJldHVybiB1cmxUcmVlcyQucGlwZShjYXRjaEVycm9yKChlOiBhbnkpID0+IHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgQWJzb2x1dGVSZWRpcmVjdCkge1xuICAgICAgICAvLyBhZnRlciBhbiBhYnNvbHV0ZSByZWRpcmVjdCB3ZSBkbyBub3QgYXBwbHkgYW55IG1vcmUgcmVkaXJlY3RzIVxuICAgICAgICB0aGlzLmFsbG93UmVkaXJlY3RzID0gZmFsc2U7XG4gICAgICAgIC8vIHdlIG5lZWQgdG8gcnVuIG1hdGNoaW5nLCBzbyB3ZSBjYW4gZmV0Y2ggYWxsIGxhenktbG9hZGVkIG1vZHVsZXNcbiAgICAgICAgcmV0dXJuIHRoaXMubWF0Y2goZS51cmxUcmVlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOb01hdGNoKSB7XG4gICAgICAgIHRocm93IHRoaXMubm9NYXRjaEVycm9yKGUpO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlO1xuICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgbWF0Y2godHJlZTogVXJsVHJlZSk6IE9ic2VydmFibGU8VXJsVHJlZT4ge1xuICAgIGNvbnN0IGV4cGFuZGVkJCA9XG4gICAgICAgIHRoaXMuZXhwYW5kU2VnbWVudEdyb3VwKHRoaXMubmdNb2R1bGUsIHRoaXMuY29uZmlnLCB0cmVlLnJvb3QsIFBSSU1BUllfT1VUTEVUKTtcbiAgICBjb25zdCBtYXBwZWQkID0gZXhwYW5kZWQkLnBpcGUoXG4gICAgICAgIG1hcCgocm9vdFNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKSA9PlxuICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlVXJsVHJlZShyb290U2VnbWVudEdyb3VwLCB0cmVlLnF1ZXJ5UGFyYW1zLCB0cmVlLmZyYWdtZW50ISkpKTtcbiAgICByZXR1cm4gbWFwcGVkJC5waXBlKGNhdGNoRXJyb3IoKGU6IGFueSk6IE9ic2VydmFibGU8VXJsVHJlZT4gPT4ge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOb01hdGNoKSB7XG4gICAgICAgIHRocm93IHRoaXMubm9NYXRjaEVycm9yKGUpO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlO1xuICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgbm9NYXRjaEVycm9yKGU6IE5vTWF0Y2gpOiBhbnkge1xuICAgIHJldHVybiBuZXcgRXJyb3IoYENhbm5vdCBtYXRjaCBhbnkgcm91dGVzLiBVUkwgU2VnbWVudDogJyR7ZS5zZWdtZW50R3JvdXB9J2ApO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVVcmxUcmVlKHJvb3RDYW5kaWRhdGU6IFVybFNlZ21lbnRHcm91cCwgcXVlcnlQYXJhbXM6IFBhcmFtcywgZnJhZ21lbnQ6IHN0cmluZyk6XG4gICAgICBVcmxUcmVlIHtcbiAgICBjb25zdCByb290ID0gcm9vdENhbmRpZGF0ZS5zZWdtZW50cy5sZW5ndGggPiAwID9cbiAgICAgICAgbmV3IFVybFNlZ21lbnRHcm91cChbXSwge1tQUklNQVJZX09VVExFVF06IHJvb3RDYW5kaWRhdGV9KSA6XG4gICAgICAgIHJvb3RDYW5kaWRhdGU7XG4gICAgcmV0dXJuIG5ldyBVcmxUcmVlKHJvb3QsIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFNlZ21lbnRHcm91cChcbiAgICAgIG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+LCByb3V0ZXM6IFJvdXRlW10sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLFxuICAgICAgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIGlmIChzZWdtZW50R3JvdXAuc2VnbWVudHMubGVuZ3RoID09PSAwICYmIHNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRDaGlsZHJlbihuZ01vZHVsZSwgcm91dGVzLCBzZWdtZW50R3JvdXApXG4gICAgICAgICAgLnBpcGUobWFwKChjaGlsZHJlbjogYW55KSA9PiBuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCBjaGlsZHJlbikpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5leHBhbmRTZWdtZW50KG5nTW9kdWxlLCBzZWdtZW50R3JvdXAsIHJvdXRlcywgc2VnbWVudEdyb3VwLnNlZ21lbnRzLCBvdXRsZXQsIHRydWUpO1xuICB9XG5cbiAgLy8gUmVjdXJzaXZlbHkgZXhwYW5kIHNlZ21lbnQgZ3JvdXBzIGZvciBhbGwgdGhlIGNoaWxkIG91dGxldHNcbiAgcHJpdmF0ZSBleHBhbmRDaGlsZHJlbihcbiAgICAgIG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+LCByb3V0ZXM6IFJvdXRlW10sXG4gICAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6IE9ic2VydmFibGU8e1tuYW1lOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9PiB7XG4gICAgcmV0dXJuIHdhaXRGb3JNYXAoXG4gICAgICAgIHNlZ21lbnRHcm91cC5jaGlsZHJlbixcbiAgICAgICAgKGNoaWxkT3V0bGV0LCBjaGlsZCkgPT4gdGhpcy5leHBhbmRTZWdtZW50R3JvdXAobmdNb2R1bGUsIHJvdXRlcywgY2hpbGQsIGNoaWxkT3V0bGV0KSk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFNlZ21lbnQoXG4gICAgICBuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55Piwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlczogUm91dGVbXSxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nLFxuICAgICAgYWxsb3dSZWRpcmVjdHM6IGJvb2xlYW4pOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIC8vIFdlIG5lZWQgdG8gZXhwYW5kIGVhY2ggb3V0bGV0IGdyb3VwIGluZGVwZW5kZW50bHkgdG8gZW5zdXJlIHRoYXQgd2Ugbm90IG9ubHkgbG9hZCBtb2R1bGVzXG4gICAgLy8gZm9yIHJvdXRlcyBtYXRjaGluZyB0aGUgZ2l2ZW4gYG91dGxldGAsIGJ1dCBhbHNvIHRob3NlIHdoaWNoIHdpbGwgYmUgYWN0aXZhdGVkIGJlY2F1c2VcbiAgICAvLyB0aGVpciBwYXRoIGlzIGVtcHR5IHN0cmluZy4gVGhpcyBjYW4gcmVzdWx0IGluIG11bHRpcGxlIG91dGxldHMgYmVpbmcgYWN0aXZhdGVkIGF0IG9uY2UuXG4gICAgY29uc3Qgcm91dGVzQnlPdXRsZXQ6IE1hcDxzdHJpbmcsIFJvdXRlW10+ID0gZ3JvdXBSb3V0ZXNCeU91dGxldChyb3V0ZXMpO1xuICAgIGlmICghcm91dGVzQnlPdXRsZXQuaGFzKG91dGxldCkpIHtcbiAgICAgIHJvdXRlc0J5T3V0bGV0LnNldChvdXRsZXQsIFtdKTtcbiAgICB9XG5cbiAgICBjb25zdCBleHBhbmRSb3V0ZXMgPSAocm91dGVzOiBSb3V0ZVtdKSA9PiB7XG4gICAgICByZXR1cm4gZnJvbShyb3V0ZXMpLnBpcGUoXG4gICAgICAgICAgY29uY2F0TWFwKChyOiBSb3V0ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXhwYW5kZWQkID0gdGhpcy5leHBhbmRTZWdtZW50QWdhaW5zdFJvdXRlKFxuICAgICAgICAgICAgICAgIG5nTW9kdWxlLCBzZWdtZW50R3JvdXAsIHJvdXRlcywgciwgc2VnbWVudHMsIG91dGxldCwgYWxsb3dSZWRpcmVjdHMpO1xuICAgICAgICAgICAgcmV0dXJuIGV4cGFuZGVkJC5waXBlKGNhdGNoRXJyb3IoZSA9PiB7XG4gICAgICAgICAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9NYXRjaCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBvZihudWxsKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgIH0pLFxuICAgICAgICAgIGZpcnN0KChzOiBVcmxTZWdtZW50R3JvdXB8bnVsbCk6IHMgaXMgVXJsU2VnbWVudEdyb3VwID0+IHMgIT09IG51bGwpLFxuICAgICAgICAgIGNhdGNoRXJyb3IoZSA9PiB7XG4gICAgICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIEVtcHR5RXJyb3IgfHwgZS5uYW1lID09PSAnRW1wdHlFcnJvcicpIHtcbiAgICAgICAgICAgICAgaWYgKHRoaXMubm9MZWZ0b3ZlcnNJblVybChzZWdtZW50R3JvdXAsIHNlZ21lbnRzLCBvdXRsZXQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9mKG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdGhyb3cgbmV3IE5vTWF0Y2goc2VnbWVudEdyb3VwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfSksXG4gICAgICApO1xuICAgIH07XG5cbiAgICBjb25zdCBleHBhbnNpb25zID0gQXJyYXkuZnJvbShyb3V0ZXNCeU91dGxldC5lbnRyaWVzKCkpLm1hcCgoW3JvdXRlT3V0bGV0LCByb3V0ZXNdKSA9PiB7XG4gICAgICBjb25zdCBleHBhbmRlZCA9IGV4cGFuZFJvdXRlcyhyb3V0ZXMpO1xuICAgICAgLy8gTWFwIGFsbCByZXN1bHRzIGZyb20gb3V0bGV0cyB3ZSBhcmVuJ3QgYWN0aXZhdGluZyB0byBgbnVsbGAgc28gdGhleSBjYW4gYmUgaWdub3JlZCBsYXRlclxuICAgICAgcmV0dXJuIHJvdXRlT3V0bGV0ID09PSBvdXRsZXQgPyBleHBhbmRlZCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGFuZGVkLnBpcGUobWFwKCgpID0+IG51bGwpLCBjYXRjaEVycm9yKCgpID0+IG9mKG51bGwpKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGZyb20oZXhwYW5zaW9ucylcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICBjb21iaW5lQWxsKCksXG4gICAgICAgICAgICBmaXJzdCgpLFxuICAgICAgICAgICAgLy8gUmV0dXJuIG9ubHkgdGhlIGV4cGFuc2lvbiBmb3IgdGhlIHJvdXRlIG91dGxldCB3ZSBhcmUgdHJ5aW5nIHRvIGFjdGl2YXRlLlxuICAgICAgICAgICAgbWFwKHJlc3VsdHMgPT4gcmVzdWx0cy5maW5kKHJlc3VsdCA9PiByZXN1bHQgIT09IG51bGwpISksXG4gICAgICAgICk7XG4gIH1cblxuICBwcml2YXRlIG5vTGVmdG92ZXJzSW5Vcmwoc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nKTpcbiAgICAgIGJvb2xlYW4ge1xuICAgIHJldHVybiBzZWdtZW50cy5sZW5ndGggPT09IDAgJiYgIXNlZ21lbnRHcm91cC5jaGlsZHJlbltvdXRsZXRdO1xuICB9XG5cbiAgcHJpdmF0ZSBleHBhbmRTZWdtZW50QWdhaW5zdFJvdXRlKFxuICAgICAgbmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT4sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZXM6IFJvdXRlW10sIHJvdXRlOiBSb3V0ZSxcbiAgICAgIHBhdGhzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nLCBhbGxvd1JlZGlyZWN0czogYm9vbGVhbik6IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPiB7XG4gICAgLy8gRW1wdHkgc3RyaW5nIHNlZ21lbnRzIGFyZSBzcGVjaWFsIGJlY2F1c2UgbXVsdGlwbGUgb3V0bGV0cyBjYW4gbWF0Y2ggYSBzaW5nbGUgcGF0aCwgaS5lLlxuICAgIC8vIGBbe3BhdGg6ICcnLCBjb21wb25lbnQ6IEJ9LCB7cGF0aDogJycsIGxvYWRDaGlsZHJlbjogKCkgPT4ge30sIG91dGxldDogXCJhYm91dFwifV1gXG4gICAgaWYgKGdldE91dGxldChyb3V0ZSkgIT09IG91dGxldCAmJiByb3V0ZS5wYXRoICE9PSAnJykge1xuICAgICAgcmV0dXJuIG5vTWF0Y2goc2VnbWVudEdyb3VwKTtcbiAgICB9XG5cbiAgICBpZiAocm91dGUucmVkaXJlY3RUbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXRjaFNlZ21lbnRBZ2FpbnN0Um91dGUobmdNb2R1bGUsIHNlZ21lbnRHcm91cCwgcm91dGUsIHBhdGhzKTtcbiAgICB9XG5cbiAgICBpZiAoYWxsb3dSZWRpcmVjdHMgJiYgdGhpcy5hbGxvd1JlZGlyZWN0cykge1xuICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kU2VnbWVudEFnYWluc3RSb3V0ZVVzaW5nUmVkaXJlY3QoXG4gICAgICAgICAgbmdNb2R1bGUsIHNlZ21lbnRHcm91cCwgcm91dGVzLCByb3V0ZSwgcGF0aHMsIG91dGxldCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vTWF0Y2goc2VnbWVudEdyb3VwKTtcbiAgfVxuXG4gIHByaXZhdGUgZXhwYW5kU2VnbWVudEFnYWluc3RSb3V0ZVVzaW5nUmVkaXJlY3QoXG4gICAgICBuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55Piwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlczogUm91dGVbXSwgcm91dGU6IFJvdXRlLFxuICAgICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIGlmIChyb3V0ZS5wYXRoID09PSAnKionKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRXaWxkQ2FyZFdpdGhQYXJhbXNBZ2FpbnN0Um91dGVVc2luZ1JlZGlyZWN0KFxuICAgICAgICAgIG5nTW9kdWxlLCByb3V0ZXMsIHJvdXRlLCBvdXRsZXQpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmV4cGFuZFJlZ3VsYXJTZWdtZW50QWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgICAgbmdNb2R1bGUsIHNlZ21lbnRHcm91cCwgcm91dGVzLCByb3V0ZSwgc2VnbWVudHMsIG91dGxldCk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFdpbGRDYXJkV2l0aFBhcmFtc0FnYWluc3RSb3V0ZVVzaW5nUmVkaXJlY3QoXG4gICAgICBuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55Piwgcm91dGVzOiBSb3V0ZVtdLCByb3V0ZTogUm91dGUsXG4gICAgICBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPiB7XG4gICAgY29uc3QgbmV3VHJlZSA9IHRoaXMuYXBwbHlSZWRpcmVjdENvbW1hbmRzKFtdLCByb3V0ZS5yZWRpcmVjdFRvISwge30pO1xuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvIS5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAgIHJldHVybiBhYnNvbHV0ZVJlZGlyZWN0KG5ld1RyZWUpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmxpbmVyYWxpemVTZWdtZW50cyhyb3V0ZSwgbmV3VHJlZSkucGlwZShtZXJnZU1hcCgobmV3U2VnbWVudHM6IFVybFNlZ21lbnRbXSkgPT4ge1xuICAgICAgY29uc3QgZ3JvdXAgPSBuZXcgVXJsU2VnbWVudEdyb3VwKG5ld1NlZ21lbnRzLCB7fSk7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRTZWdtZW50KG5nTW9kdWxlLCBncm91cCwgcm91dGVzLCBuZXdTZWdtZW50cywgb3V0bGV0LCBmYWxzZSk7XG4gICAgfSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBleHBhbmRSZWd1bGFyU2VnbWVudEFnYWluc3RSb3V0ZVVzaW5nUmVkaXJlY3QoXG4gICAgICBuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55Piwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlczogUm91dGVbXSwgcm91dGU6IFJvdXRlLFxuICAgICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIGNvbnN0IHttYXRjaGVkLCBjb25zdW1lZFNlZ21lbnRzLCBsYXN0Q2hpbGQsIHBvc2l0aW9uYWxQYXJhbVNlZ21lbnRzfSA9XG4gICAgICAgIG1hdGNoKHNlZ21lbnRHcm91cCwgcm91dGUsIHNlZ21lbnRzKTtcbiAgICBpZiAoIW1hdGNoZWQpIHJldHVybiBub01hdGNoKHNlZ21lbnRHcm91cCk7XG5cbiAgICBjb25zdCBuZXdUcmVlID0gdGhpcy5hcHBseVJlZGlyZWN0Q29tbWFuZHMoXG4gICAgICAgIGNvbnN1bWVkU2VnbWVudHMsIHJvdXRlLnJlZGlyZWN0VG8hLCA8YW55PnBvc2l0aW9uYWxQYXJhbVNlZ21lbnRzKTtcbiAgICBpZiAocm91dGUucmVkaXJlY3RUbyEuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICByZXR1cm4gYWJzb2x1dGVSZWRpcmVjdChuZXdUcmVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5saW5lcmFsaXplU2VnbWVudHMocm91dGUsIG5ld1RyZWUpLnBpcGUobWVyZ2VNYXAoKG5ld1NlZ21lbnRzOiBVcmxTZWdtZW50W10pID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmV4cGFuZFNlZ21lbnQoXG4gICAgICAgICAgbmdNb2R1bGUsIHNlZ21lbnRHcm91cCwgcm91dGVzLCBuZXdTZWdtZW50cy5jb25jYXQoc2VnbWVudHMuc2xpY2UobGFzdENoaWxkKSksIG91dGxldCxcbiAgICAgICAgICBmYWxzZSk7XG4gICAgfSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBtYXRjaFNlZ21lbnRBZ2FpbnN0Um91dGUoXG4gICAgICBuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55PiwgcmF3U2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlOiBSb3V0ZSxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIGlmIChyb3V0ZS5wYXRoID09PSAnKionKSB7XG4gICAgICBpZiAocm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgICAgIHJldHVybiBkZWZlcihcbiAgICAgICAgICAgICgpID0+IHRoaXMuY29uZmlnTG9hZGVyLmxvYWQobmdNb2R1bGUuaW5qZWN0b3IsIHJvdXRlKVxuICAgICAgICAgICAgICAgICAgICAgIC5waXBlKG1hcCgoY2ZnOiBMb2FkZWRSb3V0ZXJDb25maWcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRDb25maWcgPSBjZmc7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50cywge30pO1xuICAgICAgICAgICAgICAgICAgICAgIH0pKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvZihuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRzLCB7fSkpO1xuICAgIH1cblxuICAgIGNvbnN0IHttYXRjaGVkLCBjb25zdW1lZFNlZ21lbnRzLCBsYXN0Q2hpbGR9ID0gbWF0Y2gocmF3U2VnbWVudEdyb3VwLCByb3V0ZSwgc2VnbWVudHMpO1xuICAgIGlmICghbWF0Y2hlZCkgcmV0dXJuIG5vTWF0Y2gocmF3U2VnbWVudEdyb3VwKTtcblxuICAgIGNvbnN0IHJhd1NsaWNlZFNlZ21lbnRzID0gc2VnbWVudHMuc2xpY2UobGFzdENoaWxkKTtcbiAgICBjb25zdCBjaGlsZENvbmZpZyQgPSB0aGlzLmdldENoaWxkQ29uZmlnKG5nTW9kdWxlLCByb3V0ZSwgc2VnbWVudHMpO1xuXG4gICAgcmV0dXJuIGNoaWxkQ29uZmlnJC5waXBlKG1lcmdlTWFwKChyb3V0ZXJDb25maWc6IExvYWRlZFJvdXRlckNvbmZpZykgPT4ge1xuICAgICAgY29uc3QgY2hpbGRNb2R1bGUgPSByb3V0ZXJDb25maWcubW9kdWxlO1xuICAgICAgY29uc3QgY2hpbGRDb25maWcgPSByb3V0ZXJDb25maWcucm91dGVzO1xuXG4gICAgICBjb25zdCB7c2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50c30gPVxuICAgICAgICAgIHNwbGl0KHJhd1NlZ21lbnRHcm91cCwgY29uc3VtZWRTZWdtZW50cywgcmF3U2xpY2VkU2VnbWVudHMsIGNoaWxkQ29uZmlnKTtcblxuICAgICAgaWYgKHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiBzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgICBjb25zdCBleHBhbmRlZCQgPSB0aGlzLmV4cGFuZENoaWxkcmVuKGNoaWxkTW9kdWxlLCBjaGlsZENvbmZpZywgc2VnbWVudEdyb3VwKTtcbiAgICAgICAgcmV0dXJuIGV4cGFuZGVkJC5waXBlKFxuICAgICAgICAgICAgbWFwKChjaGlsZHJlbjogYW55KSA9PiBuZXcgVXJsU2VnbWVudEdyb3VwKGNvbnN1bWVkU2VnbWVudHMsIGNoaWxkcmVuKSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY2hpbGRDb25maWcubGVuZ3RoID09PSAwICYmIHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gb2YobmV3IFVybFNlZ21lbnRHcm91cChjb25zdW1lZFNlZ21lbnRzLCB7fSkpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBleHBhbmRlZCQgPSB0aGlzLmV4cGFuZFNlZ21lbnQoXG4gICAgICAgICAgY2hpbGRNb2R1bGUsIHNlZ21lbnRHcm91cCwgY2hpbGRDb25maWcsIHNsaWNlZFNlZ21lbnRzLCBQUklNQVJZX09VVExFVCwgdHJ1ZSk7XG4gICAgICByZXR1cm4gZXhwYW5kZWQkLnBpcGUoXG4gICAgICAgICAgbWFwKChjczogVXJsU2VnbWVudEdyb3VwKSA9PlxuICAgICAgICAgICAgICAgICAgbmV3IFVybFNlZ21lbnRHcm91cChjb25zdW1lZFNlZ21lbnRzLmNvbmNhdChjcy5zZWdtZW50cyksIGNzLmNoaWxkcmVuKSkpO1xuICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q2hpbGRDb25maWcobmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT4sIHJvdXRlOiBSb3V0ZSwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSk6XG4gICAgICBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4ge1xuICAgIGlmIChyb3V0ZS5jaGlsZHJlbikge1xuICAgICAgLy8gVGhlIGNoaWxkcmVuIGJlbG9uZyB0byB0aGUgc2FtZSBtb2R1bGVcbiAgICAgIHJldHVybiBvZihuZXcgTG9hZGVkUm91dGVyQ29uZmlnKHJvdXRlLmNoaWxkcmVuLCBuZ01vZHVsZSkpO1xuICAgIH1cblxuICAgIGlmIChyb3V0ZS5sb2FkQ2hpbGRyZW4pIHtcbiAgICAgIC8vIGxhenkgY2hpbGRyZW4gYmVsb25nIHRvIHRoZSBsb2FkZWQgbW9kdWxlXG4gICAgICBpZiAocm91dGUuX2xvYWRlZENvbmZpZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBvZihyb3V0ZS5fbG9hZGVkQ29uZmlnKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMucnVuQ2FuTG9hZEd1YXJkcyhuZ01vZHVsZS5pbmplY3Rvciwgcm91dGUsIHNlZ21lbnRzKVxuICAgICAgICAgIC5waXBlKG1lcmdlTWFwKChzaG91bGRMb2FkUmVzdWx0OiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgICBpZiAoc2hvdWxkTG9hZFJlc3VsdCkge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25maWdMb2FkZXIubG9hZChuZ01vZHVsZS5pbmplY3Rvciwgcm91dGUpXG4gICAgICAgICAgICAgICAgICAucGlwZShtYXAoKGNmZzogTG9hZGVkUm91dGVyQ29uZmlnKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRDb25maWcgPSBjZmc7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjZmc7XG4gICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY2FuTG9hZEZhaWxzKHJvdXRlKTtcbiAgICAgICAgICB9KSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9mKG5ldyBMb2FkZWRSb3V0ZXJDb25maWcoW10sIG5nTW9kdWxlKSk7XG4gIH1cblxuICBwcml2YXRlIHJ1bkNhbkxvYWRHdWFyZHMobW9kdWxlSW5qZWN0b3I6IEluamVjdG9yLCByb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pOlxuICAgICAgT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gICAgY29uc3QgY2FuTG9hZCA9IHJvdXRlLmNhbkxvYWQ7XG4gICAgaWYgKCFjYW5Mb2FkIHx8IGNhbkxvYWQubGVuZ3RoID09PSAwKSByZXR1cm4gb2YodHJ1ZSk7XG5cbiAgICBjb25zdCBjYW5Mb2FkT2JzZXJ2YWJsZXMgPSBjYW5Mb2FkLm1hcCgoaW5qZWN0aW9uVG9rZW46IGFueSkgPT4ge1xuICAgICAgY29uc3QgZ3VhcmQgPSBtb2R1bGVJbmplY3Rvci5nZXQoaW5qZWN0aW9uVG9rZW4pO1xuICAgICAgbGV0IGd1YXJkVmFsO1xuICAgICAgaWYgKGlzQ2FuTG9hZChndWFyZCkpIHtcbiAgICAgICAgZ3VhcmRWYWwgPSBndWFyZC5jYW5Mb2FkKHJvdXRlLCBzZWdtZW50cyk7XG4gICAgICB9IGVsc2UgaWYgKGlzRnVuY3Rpb248Q2FuTG9hZEZuPihndWFyZCkpIHtcbiAgICAgICAgZ3VhcmRWYWwgPSBndWFyZChyb3V0ZSwgc2VnbWVudHMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIENhbkxvYWQgZ3VhcmQnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB3cmFwSW50b09ic2VydmFibGUoZ3VhcmRWYWwpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG9mKGNhbkxvYWRPYnNlcnZhYmxlcylcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICBwcmlvcml0aXplZEd1YXJkVmFsdWUoKSxcbiAgICAgICAgICAgIHRhcCgocmVzdWx0OiBVcmxUcmVlfGJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgICAgaWYgKCFpc1VybFRyZWUocmVzdWx0KSkgcmV0dXJuO1xuXG4gICAgICAgICAgICAgIGNvbnN0IGVycm9yOiBFcnJvciZ7dXJsPzogVXJsVHJlZX0gPSBuYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoXG4gICAgICAgICAgICAgICAgICBgUmVkaXJlY3RpbmcgdG8gXCIke3RoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUocmVzdWx0KX1cImApO1xuICAgICAgICAgICAgICBlcnJvci51cmwgPSByZXN1bHQ7XG4gICAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBtYXAocmVzdWx0ID0+IHJlc3VsdCA9PT0gdHJ1ZSksXG4gICAgICAgICk7XG4gIH1cblxuICBwcml2YXRlIGxpbmVyYWxpemVTZWdtZW50cyhyb3V0ZTogUm91dGUsIHVybFRyZWU6IFVybFRyZWUpOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRbXT4ge1xuICAgIGxldCByZXM6IFVybFNlZ21lbnRbXSA9IFtdO1xuICAgIGxldCBjID0gdXJsVHJlZS5yb290O1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICByZXMgPSByZXMuY29uY2F0KGMuc2VnbWVudHMpO1xuICAgICAgaWYgKGMubnVtYmVyT2ZDaGlsZHJlbiA9PT0gMCkge1xuICAgICAgICByZXR1cm4gb2YocmVzKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGMubnVtYmVyT2ZDaGlsZHJlbiA+IDEgfHwgIWMuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdKSB7XG4gICAgICAgIHJldHVybiBuYW1lZE91dGxldHNSZWRpcmVjdChyb3V0ZS5yZWRpcmVjdFRvISk7XG4gICAgICB9XG5cbiAgICAgIGMgPSBjLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFwcGx5UmVkaXJlY3RDb21tYW5kcyhcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIHJlZGlyZWN0VG86IHN0cmluZywgcG9zUGFyYW1zOiB7W2s6IHN0cmluZ106IFVybFNlZ21lbnR9KTogVXJsVHJlZSB7XG4gICAgcmV0dXJuIHRoaXMuYXBwbHlSZWRpcmVjdENyZWF0cmVVcmxUcmVlKFxuICAgICAgICByZWRpcmVjdFRvLCB0aGlzLnVybFNlcmlhbGl6ZXIucGFyc2UocmVkaXJlY3RUbyksIHNlZ21lbnRzLCBwb3NQYXJhbXMpO1xuICB9XG5cbiAgcHJpdmF0ZSBhcHBseVJlZGlyZWN0Q3JlYXRyZVVybFRyZWUoXG4gICAgICByZWRpcmVjdFRvOiBzdHJpbmcsIHVybFRyZWU6IFVybFRyZWUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgICBwb3NQYXJhbXM6IHtbazogc3RyaW5nXTogVXJsU2VnbWVudH0pOiBVcmxUcmVlIHtcbiAgICBjb25zdCBuZXdSb290ID0gdGhpcy5jcmVhdGVTZWdtZW50R3JvdXAocmVkaXJlY3RUbywgdXJsVHJlZS5yb290LCBzZWdtZW50cywgcG9zUGFyYW1zKTtcbiAgICByZXR1cm4gbmV3IFVybFRyZWUoXG4gICAgICAgIG5ld1Jvb3QsIHRoaXMuY3JlYXRlUXVlcnlQYXJhbXModXJsVHJlZS5xdWVyeVBhcmFtcywgdGhpcy51cmxUcmVlLnF1ZXJ5UGFyYW1zKSxcbiAgICAgICAgdXJsVHJlZS5mcmFnbWVudCk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVF1ZXJ5UGFyYW1zKHJlZGlyZWN0VG9QYXJhbXM6IFBhcmFtcywgYWN0dWFsUGFyYW1zOiBQYXJhbXMpOiBQYXJhbXMge1xuICAgIGNvbnN0IHJlczogUGFyYW1zID0ge307XG4gICAgZm9yRWFjaChyZWRpcmVjdFRvUGFyYW1zLCAodjogYW55LCBrOiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IGNvcHlTb3VyY2VWYWx1ZSA9IHR5cGVvZiB2ID09PSAnc3RyaW5nJyAmJiB2LnN0YXJ0c1dpdGgoJzonKTtcbiAgICAgIGlmIChjb3B5U291cmNlVmFsdWUpIHtcbiAgICAgICAgY29uc3Qgc291cmNlTmFtZSA9IHYuc3Vic3RyaW5nKDEpO1xuICAgICAgICByZXNba10gPSBhY3R1YWxQYXJhbXNbc291cmNlTmFtZV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNba10gPSB2O1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVNlZ21lbnRHcm91cChcbiAgICAgIHJlZGlyZWN0VG86IHN0cmluZywgZ3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICAgIHBvc1BhcmFtczoge1trOiBzdHJpbmddOiBVcmxTZWdtZW50fSk6IFVybFNlZ21lbnRHcm91cCB7XG4gICAgY29uc3QgdXBkYXRlZFNlZ21lbnRzID0gdGhpcy5jcmVhdGVTZWdtZW50cyhyZWRpcmVjdFRvLCBncm91cC5zZWdtZW50cywgc2VnbWVudHMsIHBvc1BhcmFtcyk7XG5cbiAgICBsZXQgY2hpbGRyZW46IHtbbjogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICAgIGZvckVhY2goZ3JvdXAuY2hpbGRyZW4sIChjaGlsZDogVXJsU2VnbWVudEdyb3VwLCBuYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgIGNoaWxkcmVuW25hbWVdID0gdGhpcy5jcmVhdGVTZWdtZW50R3JvdXAocmVkaXJlY3RUbywgY2hpbGQsIHNlZ21lbnRzLCBwb3NQYXJhbXMpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAodXBkYXRlZFNlZ21lbnRzLCBjaGlsZHJlbik7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVNlZ21lbnRzKFxuICAgICAgcmVkaXJlY3RUbzogc3RyaW5nLCByZWRpcmVjdFRvU2VnbWVudHM6IFVybFNlZ21lbnRbXSwgYWN0dWFsU2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICAgIHBvc1BhcmFtczoge1trOiBzdHJpbmddOiBVcmxTZWdtZW50fSk6IFVybFNlZ21lbnRbXSB7XG4gICAgcmV0dXJuIHJlZGlyZWN0VG9TZWdtZW50cy5tYXAoXG4gICAgICAgIHMgPT4gcy5wYXRoLnN0YXJ0c1dpdGgoJzonKSA/IHRoaXMuZmluZFBvc1BhcmFtKHJlZGlyZWN0VG8sIHMsIHBvc1BhcmFtcykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZpbmRPclJldHVybihzLCBhY3R1YWxTZWdtZW50cykpO1xuICB9XG5cbiAgcHJpdmF0ZSBmaW5kUG9zUGFyYW0oXG4gICAgICByZWRpcmVjdFRvOiBzdHJpbmcsIHJlZGlyZWN0VG9VcmxTZWdtZW50OiBVcmxTZWdtZW50LFxuICAgICAgcG9zUGFyYW1zOiB7W2s6IHN0cmluZ106IFVybFNlZ21lbnR9KTogVXJsU2VnbWVudCB7XG4gICAgY29uc3QgcG9zID0gcG9zUGFyYW1zW3JlZGlyZWN0VG9VcmxTZWdtZW50LnBhdGguc3Vic3RyaW5nKDEpXTtcbiAgICBpZiAoIXBvcylcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQ2Fubm90IHJlZGlyZWN0IHRvICcke3JlZGlyZWN0VG99Jy4gQ2Fubm90IGZpbmQgJyR7cmVkaXJlY3RUb1VybFNlZ21lbnQucGF0aH0nLmApO1xuICAgIHJldHVybiBwb3M7XG4gIH1cblxuICBwcml2YXRlIGZpbmRPclJldHVybihyZWRpcmVjdFRvVXJsU2VnbWVudDogVXJsU2VnbWVudCwgYWN0dWFsU2VnbWVudHM6IFVybFNlZ21lbnRbXSk6IFVybFNlZ21lbnQge1xuICAgIGxldCBpZHggPSAwO1xuICAgIGZvciAoY29uc3QgcyBvZiBhY3R1YWxTZWdtZW50cykge1xuICAgICAgaWYgKHMucGF0aCA9PT0gcmVkaXJlY3RUb1VybFNlZ21lbnQucGF0aCkge1xuICAgICAgICBhY3R1YWxTZWdtZW50cy5zcGxpY2UoaWR4KTtcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgICB9XG4gICAgICBpZHgrKztcbiAgICB9XG4gICAgcmV0dXJuIHJlZGlyZWN0VG9VcmxTZWdtZW50O1xuICB9XG59XG5cbmZ1bmN0aW9uIG1hdGNoKHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pOiB7XG4gIG1hdGNoZWQ6IGJvb2xlYW4sXG4gIGNvbnN1bWVkU2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgbGFzdENoaWxkOiBudW1iZXIsXG4gIHBvc2l0aW9uYWxQYXJhbVNlZ21lbnRzOiB7W2s6IHN0cmluZ106IFVybFNlZ21lbnR9XG59IHtcbiAgaWYgKHJvdXRlLnBhdGggPT09ICcnKSB7XG4gICAgaWYgKChyb3V0ZS5wYXRoTWF0Y2ggPT09ICdmdWxsJykgJiYgKHNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpIHx8IHNlZ21lbnRzLmxlbmd0aCA+IDApKSB7XG4gICAgICByZXR1cm4ge21hdGNoZWQ6IGZhbHNlLCBjb25zdW1lZFNlZ21lbnRzOiBbXSwgbGFzdENoaWxkOiAwLCBwb3NpdGlvbmFsUGFyYW1TZWdtZW50czoge319O1xuICAgIH1cblxuICAgIHJldHVybiB7bWF0Y2hlZDogdHJ1ZSwgY29uc3VtZWRTZWdtZW50czogW10sIGxhc3RDaGlsZDogMCwgcG9zaXRpb25hbFBhcmFtU2VnbWVudHM6IHt9fTtcbiAgfVxuXG4gIGNvbnN0IG1hdGNoZXIgPSByb3V0ZS5tYXRjaGVyIHx8IGRlZmF1bHRVcmxNYXRjaGVyO1xuICBjb25zdCByZXMgPSBtYXRjaGVyKHNlZ21lbnRzLCBzZWdtZW50R3JvdXAsIHJvdXRlKTtcblxuICBpZiAoIXJlcykge1xuICAgIHJldHVybiB7XG4gICAgICBtYXRjaGVkOiBmYWxzZSxcbiAgICAgIGNvbnN1bWVkU2VnbWVudHM6IDxhbnlbXT5bXSxcbiAgICAgIGxhc3RDaGlsZDogMCxcbiAgICAgIHBvc2l0aW9uYWxQYXJhbVNlZ21lbnRzOiB7fSxcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBtYXRjaGVkOiB0cnVlLFxuICAgIGNvbnN1bWVkU2VnbWVudHM6IHJlcy5jb25zdW1lZCEsXG4gICAgbGFzdENoaWxkOiByZXMuY29uc3VtZWQubGVuZ3RoISxcbiAgICBwb3NpdGlvbmFsUGFyYW1TZWdtZW50czogcmVzLnBvc1BhcmFtcyEsXG4gIH07XG59XG5cbmZ1bmN0aW9uIHNwbGl0KFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBjb25zdW1lZFNlZ21lbnRzOiBVcmxTZWdtZW50W10sIHNsaWNlZFNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgY29uZmlnOiBSb3V0ZVtdKSB7XG4gIGlmIChzbGljZWRTZWdtZW50cy5sZW5ndGggPiAwICYmXG4gICAgICBjb250YWluc0VtcHR5UGF0aFJlZGlyZWN0c1dpdGhOYW1lZE91dGxldHMoc2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50cywgY29uZmlnKSkge1xuICAgIGNvbnN0IHMgPSBuZXcgVXJsU2VnbWVudEdyb3VwKFxuICAgICAgICBjb25zdW1lZFNlZ21lbnRzLFxuICAgICAgICBjcmVhdGVDaGlsZHJlbkZvckVtcHR5U2VnbWVudHMoXG4gICAgICAgICAgICBjb25maWcsIG5ldyBVcmxTZWdtZW50R3JvdXAoc2xpY2VkU2VnbWVudHMsIHNlZ21lbnRHcm91cC5jaGlsZHJlbikpKTtcbiAgICByZXR1cm4ge3NlZ21lbnRHcm91cDogbWVyZ2VUcml2aWFsQ2hpbGRyZW4ocyksIHNsaWNlZFNlZ21lbnRzOiBbXX07XG4gIH1cblxuICBpZiAoc2xpY2VkU2VnbWVudHMubGVuZ3RoID09PSAwICYmXG4gICAgICBjb250YWluc0VtcHR5UGF0aFJlZGlyZWN0cyhzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzLCBjb25maWcpKSB7XG4gICAgY29uc3QgcyA9IG5ldyBVcmxTZWdtZW50R3JvdXAoXG4gICAgICAgIHNlZ21lbnRHcm91cC5zZWdtZW50cyxcbiAgICAgICAgYWRkRW1wdHlTZWdtZW50c1RvQ2hpbGRyZW5JZk5lZWRlZChcbiAgICAgICAgICAgIHNlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHMsIGNvbmZpZywgc2VnbWVudEdyb3VwLmNoaWxkcmVuKSk7XG4gICAgcmV0dXJuIHtzZWdtZW50R3JvdXA6IG1lcmdlVHJpdmlhbENoaWxkcmVuKHMpLCBzbGljZWRTZWdtZW50c307XG4gIH1cblxuICByZXR1cm4ge3NlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHN9O1xufVxuXG5mdW5jdGlvbiBtZXJnZVRyaXZpYWxDaGlsZHJlbihzOiBVcmxTZWdtZW50R3JvdXApOiBVcmxTZWdtZW50R3JvdXAge1xuICBpZiAocy5udW1iZXJPZkNoaWxkcmVuID09PSAxICYmIHMuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdKSB7XG4gICAgY29uc3QgYyA9IHMuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdO1xuICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHMuc2VnbWVudHMuY29uY2F0KGMuc2VnbWVudHMpLCBjLmNoaWxkcmVuKTtcbiAgfVxuXG4gIHJldHVybiBzO1xufVxuXG5mdW5jdGlvbiBhZGRFbXB0eVNlZ21lbnRzVG9DaGlsZHJlbklmTmVlZGVkKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50czogVXJsU2VnbWVudFtdLCByb3V0ZXM6IFJvdXRlW10sXG4gICAgY2hpbGRyZW46IHtbbmFtZTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSk6IHtbbmFtZTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSB7XG4gIGNvbnN0IHJlczoge1tuYW1lOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gIGZvciAoY29uc3QgciBvZiByb3V0ZXMpIHtcbiAgICBpZiAoaXNFbXB0eVBhdGhSZWRpcmVjdChzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzLCByKSAmJiAhY2hpbGRyZW5bZ2V0T3V0bGV0KHIpXSkge1xuICAgICAgcmVzW2dldE91dGxldChyKV0gPSBuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCB7fSk7XG4gICAgfVxuICB9XG4gIHJldHVybiB7Li4uY2hpbGRyZW4sIC4uLnJlc307XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUNoaWxkcmVuRm9yRW1wdHlTZWdtZW50cyhcbiAgICByb3V0ZXM6IFJvdXRlW10sIHByaW1hcnlTZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6IHtbbmFtZTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSB7XG4gIGNvbnN0IHJlczoge1tuYW1lOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gIHJlc1tQUklNQVJZX09VVExFVF0gPSBwcmltYXJ5U2VnbWVudEdyb3VwO1xuICBmb3IgKGNvbnN0IHIgb2Ygcm91dGVzKSB7XG4gICAgaWYgKHIucGF0aCA9PT0gJycgJiYgZ2V0T3V0bGV0KHIpICE9PSBQUklNQVJZX09VVExFVCkge1xuICAgICAgcmVzW2dldE91dGxldChyKV0gPSBuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCB7fSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXM7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zRW1wdHlQYXRoUmVkaXJlY3RzV2l0aE5hbWVkT3V0bGV0cyhcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgcm91dGVzOiBSb3V0ZVtdKTogYm9vbGVhbiB7XG4gIHJldHVybiByb3V0ZXMuc29tZShcbiAgICAgIHIgPT4gaXNFbXB0eVBhdGhSZWRpcmVjdChzZWdtZW50R3JvdXAsIHNlZ21lbnRzLCByKSAmJiBnZXRPdXRsZXQocikgIT09IFBSSU1BUllfT1VUTEVUKTtcbn1cblxuZnVuY3Rpb24gY29udGFpbnNFbXB0eVBhdGhSZWRpcmVjdHMoXG4gICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIHJvdXRlczogUm91dGVbXSk6IGJvb2xlYW4ge1xuICByZXR1cm4gcm91dGVzLnNvbWUociA9PiBpc0VtcHR5UGF0aFJlZGlyZWN0KHNlZ21lbnRHcm91cCwgc2VnbWVudHMsIHIpKTtcbn1cblxuZnVuY3Rpb24gaXNFbXB0eVBhdGhSZWRpcmVjdChcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgcjogUm91dGUpOiBib29sZWFuIHtcbiAgaWYgKChzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSB8fCBzZWdtZW50cy5sZW5ndGggPiAwKSAmJiByLnBhdGhNYXRjaCA9PT0gJ2Z1bGwnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHIucGF0aCA9PT0gJycgJiYgci5yZWRpcmVjdFRvICE9PSB1bmRlZmluZWQ7XG59XG4iXX0=