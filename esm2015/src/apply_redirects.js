/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NgModuleRef } from '@angular/core';
import { defer, EmptyError, Observable, of } from 'rxjs';
import { catchError, concatAll, first, map, mergeMap, tap } from 'rxjs/operators';
import { LoadedRouterConfig } from './config';
import { prioritizedGuardValue } from './operators/prioritized_guard_value';
import { defaultUrlMatcher, navigationCancelingError, PRIMARY_OUTLET } from './shared';
import { UrlSegmentGroup, UrlTree } from './url_tree';
import { forEach, waitForMap, wrapIntoObservable } from './utils/collection';
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
        return of(...routes).pipe(map((r) => {
            const expanded$ = this.expandSegmentAgainstRoute(ngModule, segmentGroup, routes, r, segments, outlet, allowRedirects);
            return expanded$.pipe(catchError((e) => {
                if (e instanceof NoMatch) {
                    // TODO(i): this return type doesn't match the declared Observable<UrlSegmentGroup> -
                    // talk to Jason
                    return of(null);
                }
                throw e;
            }));
        }), concatAll(), first((s) => !!s), catchError((e, _) => {
            if (e instanceof EmptyError || e.name === 'EmptyError') {
                if (this.noLeftoversInUrl(segmentGroup, segments, outlet)) {
                    return of(new UrlSegmentGroup([], {}));
                }
                throw new NoMatch(segmentGroup);
            }
            throw e;
        }));
    }
    noLeftoversInUrl(segmentGroup, segments, outlet) {
        return segments.length === 0 && !segmentGroup.children[outlet];
    }
    expandSegmentAgainstRoute(ngModule, segmentGroup, routes, route, paths, outlet, allowRedirects) {
        if (getOutlet(route) !== outlet) {
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
function getOutlet(route) {
    return route.outlet || PRIMARY_OUTLET;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHlfcmVkaXJlY3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9hcHBseV9yZWRpcmVjdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFXLFdBQVcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNwRCxPQUFPLEVBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQVksRUFBRSxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQ2pFLE9BQU8sRUFBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRWhGLE9BQU8sRUFBQyxrQkFBa0IsRUFBZ0IsTUFBTSxVQUFVLENBQUM7QUFFM0QsT0FBTyxFQUFDLHFCQUFxQixFQUFDLE1BQU0scUNBQXFDLENBQUM7QUFFMUUsT0FBTyxFQUFDLGlCQUFpQixFQUFFLHdCQUF3QixFQUFVLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3RixPQUFPLEVBQWEsZUFBZSxFQUFpQixPQUFPLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDL0UsT0FBTyxFQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsa0JBQWtCLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUMzRSxPQUFPLEVBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUVyRSxNQUFNLE9BQU87SUFHWCxZQUFZLFlBQThCO1FBQ3hDLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxJQUFJLElBQUksQ0FBQztJQUMzQyxDQUFDO0NBQ0Y7QUFFRCxNQUFNLGdCQUFnQjtJQUNwQixZQUFtQixPQUFnQjtRQUFoQixZQUFPLEdBQVAsT0FBTyxDQUFTO0lBQUcsQ0FBQztDQUN4QztBQUVELFNBQVMsT0FBTyxDQUFDLFlBQTZC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QUFtQixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLGNBQWMsQ0FBQyxDQUFDO0FBQzlGLENBQUM7QUFFRCxTQUFTLDBCQUEwQixDQUMvQixZQUE2QixFQUFFLFFBQXNCLEVBQUUsTUFBZTtJQUN4RSxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUUsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQ3hCLFlBQTZCLEVBQUUsUUFBc0IsRUFBRSxDQUFRO0lBQ2pFLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxLQUFLLE1BQU0sRUFBRTtRQUNqRixPQUFPLEtBQUssQ0FBQztLQUNkO0lBRUQsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQztBQUNyRCxDQUFDO0FBRUQsU0FBUyxTQUFTLENBQUMsS0FBWTtJQUM3QixPQUFPLEtBQUssQ0FBQyxNQUFNLElBQUksY0FBYyxDQUFDO0FBQ3hDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtJbmplY3RvciwgTmdNb2R1bGVSZWZ9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtkZWZlciwgRW1wdHlFcnJvciwgT2JzZXJ2YWJsZSwgT2JzZXJ2ZXIsIG9mfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y2F0Y2hFcnJvciwgY29uY2F0QWxsLCBmaXJzdCwgbWFwLCBtZXJnZU1hcCwgdGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7TG9hZGVkUm91dGVyQ29uZmlnLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge0NhbkxvYWRGbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7cHJpb3JpdGl6ZWRHdWFyZFZhbHVlfSBmcm9tICcuL29wZXJhdG9ycy9wcmlvcml0aXplZF9ndWFyZF92YWx1ZSc7XG5pbXBvcnQge1JvdXRlckNvbmZpZ0xvYWRlcn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5pbXBvcnQge2RlZmF1bHRVcmxNYXRjaGVyLCBuYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IsIFBhcmFtcywgUFJJTUFSWV9PVVRMRVR9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7VXJsU2VnbWVudCwgVXJsU2VnbWVudEdyb3VwLCBVcmxTZXJpYWxpemVyLCBVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcbmltcG9ydCB7Zm9yRWFjaCwgd2FpdEZvck1hcCwgd3JhcEludG9PYnNlcnZhYmxlfSBmcm9tICcuL3V0aWxzL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtpc0NhbkxvYWQsIGlzRnVuY3Rpb24sIGlzVXJsVHJlZX0gZnJvbSAnLi91dGlscy90eXBlX2d1YXJkcyc7XG5cbmNsYXNzIE5vTWF0Y2gge1xuICBwdWJsaWMgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXB8bnVsbDtcblxuICBjb25zdHJ1Y3RvcihzZWdtZW50R3JvdXA/OiBVcmxTZWdtZW50R3JvdXApIHtcbiAgICB0aGlzLnNlZ21lbnRHcm91cCA9IHNlZ21lbnRHcm91cCB8fCBudWxsO1xuICB9XG59XG5cbmNsYXNzIEFic29sdXRlUmVkaXJlY3Qge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgdXJsVHJlZTogVXJsVHJlZSkge31cbn1cblxuZnVuY3Rpb24gbm9NYXRjaChzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPiB7XG4gIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+KFxuICAgICAgKG9iczogT2JzZXJ2ZXI8VXJsU2VnbWVudEdyb3VwPikgPT4gb2JzLmVycm9yKG5ldyBOb01hdGNoKHNlZ21lbnRHcm91cCkpKTtcbn1cblxuZnVuY3Rpb24gYWJzb2x1dGVSZWRpcmVjdChuZXdUcmVlOiBVcmxUcmVlKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4oXG4gICAgICAob2JzOiBPYnNlcnZlcjxVcmxTZWdtZW50R3JvdXA+KSA9PiBvYnMuZXJyb3IobmV3IEFic29sdXRlUmVkaXJlY3QobmV3VHJlZSkpKTtcbn1cblxuZnVuY3Rpb24gbmFtZWRPdXRsZXRzUmVkaXJlY3QocmVkaXJlY3RUbzogc3RyaW5nKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4oXG4gICAgICAob2JzOiBPYnNlcnZlcjxVcmxTZWdtZW50R3JvdXA+KSA9PiBvYnMuZXJyb3IobmV3IEVycm9yKFxuICAgICAgICAgIGBPbmx5IGFic29sdXRlIHJlZGlyZWN0cyBjYW4gaGF2ZSBuYW1lZCBvdXRsZXRzLiByZWRpcmVjdFRvOiAnJHtyZWRpcmVjdFRvfSdgKSkpO1xufVxuXG5mdW5jdGlvbiBjYW5Mb2FkRmFpbHMocm91dGU6IFJvdXRlKTogT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWc+IHtcbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4oXG4gICAgICAob2JzOiBPYnNlcnZlcjxMb2FkZWRSb3V0ZXJDb25maWc+KSA9PiBvYnMuZXJyb3IoXG4gICAgICAgICAgbmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yKGBDYW5ub3QgbG9hZCBjaGlsZHJlbiBiZWNhdXNlIHRoZSBndWFyZCBvZiB0aGUgcm91dGUgXCJwYXRoOiAnJHtcbiAgICAgICAgICAgICAgcm91dGUucGF0aH0nXCIgcmV0dXJuZWQgZmFsc2VgKSkpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGBVcmxUcmVlYCB3aXRoIHRoZSByZWRpcmVjdGlvbiBhcHBsaWVkLlxuICpcbiAqIExhenkgbW9kdWxlcyBhcmUgbG9hZGVkIGFsb25nIHRoZSB3YXkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVJlZGlyZWN0cyhcbiAgICBtb2R1bGVJbmplY3RvcjogSW5qZWN0b3IsIGNvbmZpZ0xvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyLCB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgIHVybFRyZWU6IFVybFRyZWUsIGNvbmZpZzogUm91dGVzKTogT2JzZXJ2YWJsZTxVcmxUcmVlPiB7XG4gIHJldHVybiBuZXcgQXBwbHlSZWRpcmVjdHMobW9kdWxlSW5qZWN0b3IsIGNvbmZpZ0xvYWRlciwgdXJsU2VyaWFsaXplciwgdXJsVHJlZSwgY29uZmlnKS5hcHBseSgpO1xufVxuXG5jbGFzcyBBcHBseVJlZGlyZWN0cyB7XG4gIHByaXZhdGUgYWxsb3dSZWRpcmVjdHM6IGJvb2xlYW4gPSB0cnVlO1xuICBwcml2YXRlIG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgbW9kdWxlSW5qZWN0b3I6IEluamVjdG9yLCBwcml2YXRlIGNvbmZpZ0xvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyLFxuICAgICAgcHJpdmF0ZSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLCBwcml2YXRlIHVybFRyZWU6IFVybFRyZWUsIHByaXZhdGUgY29uZmlnOiBSb3V0ZXMpIHtcbiAgICB0aGlzLm5nTW9kdWxlID0gbW9kdWxlSW5qZWN0b3IuZ2V0KE5nTW9kdWxlUmVmKTtcbiAgfVxuXG4gIGFwcGx5KCk6IE9ic2VydmFibGU8VXJsVHJlZT4ge1xuICAgIGNvbnN0IGV4cGFuZGVkJCA9XG4gICAgICAgIHRoaXMuZXhwYW5kU2VnbWVudEdyb3VwKHRoaXMubmdNb2R1bGUsIHRoaXMuY29uZmlnLCB0aGlzLnVybFRyZWUucm9vdCwgUFJJTUFSWV9PVVRMRVQpO1xuICAgIGNvbnN0IHVybFRyZWVzJCA9IGV4cGFuZGVkJC5waXBlKFxuICAgICAgICBtYXAoKHJvb3RTZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCkgPT4gdGhpcy5jcmVhdGVVcmxUcmVlKFxuICAgICAgICAgICAgICAgIHJvb3RTZWdtZW50R3JvdXAsIHRoaXMudXJsVHJlZS5xdWVyeVBhcmFtcywgdGhpcy51cmxUcmVlLmZyYWdtZW50ISkpKTtcbiAgICByZXR1cm4gdXJsVHJlZXMkLnBpcGUoY2F0Y2hFcnJvcigoZTogYW55KSA9PiB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIEFic29sdXRlUmVkaXJlY3QpIHtcbiAgICAgICAgLy8gYWZ0ZXIgYW4gYWJzb2x1dGUgcmVkaXJlY3Qgd2UgZG8gbm90IGFwcGx5IGFueSBtb3JlIHJlZGlyZWN0cyFcbiAgICAgICAgdGhpcy5hbGxvd1JlZGlyZWN0cyA9IGZhbHNlO1xuICAgICAgICAvLyB3ZSBuZWVkIHRvIHJ1biBtYXRjaGluZywgc28gd2UgY2FuIGZldGNoIGFsbCBsYXp5LWxvYWRlZCBtb2R1bGVzXG4gICAgICAgIHJldHVybiB0aGlzLm1hdGNoKGUudXJsVHJlZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9NYXRjaCkge1xuICAgICAgICB0aHJvdyB0aGlzLm5vTWF0Y2hFcnJvcihlKTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgZTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIG1hdGNoKHRyZWU6IFVybFRyZWUpOiBPYnNlcnZhYmxlPFVybFRyZWU+IHtcbiAgICBjb25zdCBleHBhbmRlZCQgPVxuICAgICAgICB0aGlzLmV4cGFuZFNlZ21lbnRHcm91cCh0aGlzLm5nTW9kdWxlLCB0aGlzLmNvbmZpZywgdHJlZS5yb290LCBQUklNQVJZX09VVExFVCk7XG4gICAgY29uc3QgbWFwcGVkJCA9IGV4cGFuZGVkJC5waXBlKFxuICAgICAgICBtYXAoKHJvb3RTZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCkgPT5cbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZVVybFRyZWUocm9vdFNlZ21lbnRHcm91cCwgdHJlZS5xdWVyeVBhcmFtcywgdHJlZS5mcmFnbWVudCEpKSk7XG4gICAgcmV0dXJuIG1hcHBlZCQucGlwZShjYXRjaEVycm9yKChlOiBhbnkpOiBPYnNlcnZhYmxlPFVybFRyZWU+ID0+IHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9NYXRjaCkge1xuICAgICAgICB0aHJvdyB0aGlzLm5vTWF0Y2hFcnJvcihlKTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgZTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIG5vTWF0Y2hFcnJvcihlOiBOb01hdGNoKTogYW55IHtcbiAgICByZXR1cm4gbmV3IEVycm9yKGBDYW5ub3QgbWF0Y2ggYW55IHJvdXRlcy4gVVJMIFNlZ21lbnQ6ICcke2Uuc2VnbWVudEdyb3VwfSdgKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlVXJsVHJlZShyb290Q2FuZGlkYXRlOiBVcmxTZWdtZW50R3JvdXAsIHF1ZXJ5UGFyYW1zOiBQYXJhbXMsIGZyYWdtZW50OiBzdHJpbmcpOlxuICAgICAgVXJsVHJlZSB7XG4gICAgY29uc3Qgcm9vdCA9IHJvb3RDYW5kaWRhdGUuc2VnbWVudHMubGVuZ3RoID4gMCA/XG4gICAgICAgIG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHtbUFJJTUFSWV9PVVRMRVRdOiByb290Q2FuZGlkYXRlfSkgOlxuICAgICAgICByb290Q2FuZGlkYXRlO1xuICAgIHJldHVybiBuZXcgVXJsVHJlZShyb290LCBxdWVyeVBhcmFtcywgZnJhZ21lbnQpO1xuICB9XG5cbiAgcHJpdmF0ZSBleHBhbmRTZWdtZW50R3JvdXAoXG4gICAgICBuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55Piwgcm91dGVzOiBSb3V0ZVtdLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCxcbiAgICAgIG91dGxldDogc3RyaW5nKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgICBpZiAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiBzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kQ2hpbGRyZW4obmdNb2R1bGUsIHJvdXRlcywgc2VnbWVudEdyb3VwKVxuICAgICAgICAgIC5waXBlKG1hcCgoY2hpbGRyZW46IGFueSkgPT4gbmV3IFVybFNlZ21lbnRHcm91cChbXSwgY2hpbGRyZW4pKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZXhwYW5kU2VnbWVudChuZ01vZHVsZSwgc2VnbWVudEdyb3VwLCByb3V0ZXMsIHNlZ21lbnRHcm91cC5zZWdtZW50cywgb3V0bGV0LCB0cnVlKTtcbiAgfVxuXG4gIC8vIFJlY3Vyc2l2ZWx5IGV4cGFuZCBzZWdtZW50IGdyb3VwcyBmb3IgYWxsIHRoZSBjaGlsZCBvdXRsZXRzXG4gIHByaXZhdGUgZXhwYW5kQ2hpbGRyZW4oXG4gICAgICBuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55Piwgcm91dGVzOiBSb3V0ZVtdLFxuICAgICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXApOiBPYnNlcnZhYmxlPHtbbmFtZTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfT4ge1xuICAgIHJldHVybiB3YWl0Rm9yTWFwKFxuICAgICAgICBzZWdtZW50R3JvdXAuY2hpbGRyZW4sXG4gICAgICAgIChjaGlsZE91dGxldCwgY2hpbGQpID0+IHRoaXMuZXhwYW5kU2VnbWVudEdyb3VwKG5nTW9kdWxlLCByb3V0ZXMsIGNoaWxkLCBjaGlsZE91dGxldCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBleHBhbmRTZWdtZW50KFxuICAgICAgbmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT4sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZXM6IFJvdXRlW10sXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZyxcbiAgICAgIGFsbG93UmVkaXJlY3RzOiBib29sZWFuKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgICByZXR1cm4gb2YoLi4ucm91dGVzKS5waXBlKFxuICAgICAgICBtYXAoKHI6IGFueSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGV4cGFuZGVkJCA9IHRoaXMuZXhwYW5kU2VnbWVudEFnYWluc3RSb3V0ZShcbiAgICAgICAgICAgICAgbmdNb2R1bGUsIHNlZ21lbnRHcm91cCwgcm91dGVzLCByLCBzZWdtZW50cywgb3V0bGV0LCBhbGxvd1JlZGlyZWN0cyk7XG4gICAgICAgICAgcmV0dXJuIGV4cGFuZGVkJC5waXBlKGNhdGNoRXJyb3IoKGU6IGFueSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOb01hdGNoKSB7XG4gICAgICAgICAgICAgIC8vIFRPRE8oaSk6IHRoaXMgcmV0dXJuIHR5cGUgZG9lc24ndCBtYXRjaCB0aGUgZGVjbGFyZWQgT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IC1cbiAgICAgICAgICAgICAgLy8gdGFsayB0byBKYXNvblxuICAgICAgICAgICAgICByZXR1cm4gb2YobnVsbCkgYXMgYW55O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0pLFxuICAgICAgICBjb25jYXRBbGwoKSwgZmlyc3QoKHM6IGFueSkgPT4gISFzKSwgY2F0Y2hFcnJvcigoZTogYW55LCBfOiBhbnkpID0+IHtcbiAgICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIEVtcHR5RXJyb3IgfHwgZS5uYW1lID09PSAnRW1wdHlFcnJvcicpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm5vTGVmdG92ZXJzSW5Vcmwoc2VnbWVudEdyb3VwLCBzZWdtZW50cywgb3V0bGV0KSkge1xuICAgICAgICAgICAgICByZXR1cm4gb2YobmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IG5ldyBOb01hdGNoKHNlZ21lbnRHcm91cCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgbm9MZWZ0b3ZlcnNJblVybChzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgb3V0bGV0OiBzdHJpbmcpOlxuICAgICAgYm9vbGVhbiB7XG4gICAgcmV0dXJuIHNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiAhc2VnbWVudEdyb3VwLmNoaWxkcmVuW291dGxldF07XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFNlZ21lbnRBZ2FpbnN0Um91dGUoXG4gICAgICBuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55Piwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlczogUm91dGVbXSwgcm91dGU6IFJvdXRlLFxuICAgICAgcGF0aHM6IFVybFNlZ21lbnRbXSwgb3V0bGV0OiBzdHJpbmcsIGFsbG93UmVkaXJlY3RzOiBib29sZWFuKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgICBpZiAoZ2V0T3V0bGV0KHJvdXRlKSAhPT0gb3V0bGV0KSB7XG4gICAgICByZXR1cm4gbm9NYXRjaChzZWdtZW50R3JvdXApO1xuICAgIH1cblxuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLm1hdGNoU2VnbWVudEFnYWluc3RSb3V0ZShuZ01vZHVsZSwgc2VnbWVudEdyb3VwLCByb3V0ZSwgcGF0aHMpO1xuICAgIH1cblxuICAgIGlmIChhbGxvd1JlZGlyZWN0cyAmJiB0aGlzLmFsbG93UmVkaXJlY3RzKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRTZWdtZW50QWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgICAgICBuZ01vZHVsZSwgc2VnbWVudEdyb3VwLCByb3V0ZXMsIHJvdXRlLCBwYXRocywgb3V0bGV0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm9NYXRjaChzZWdtZW50R3JvdXApO1xuICB9XG5cbiAgcHJpdmF0ZSBleHBhbmRTZWdtZW50QWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgIG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+LCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGVzOiBSb3V0ZVtdLCByb3V0ZTogUm91dGUsXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPiB7XG4gICAgaWYgKHJvdXRlLnBhdGggPT09ICcqKicpIHtcbiAgICAgIHJldHVybiB0aGlzLmV4cGFuZFdpbGRDYXJkV2l0aFBhcmFtc0FnYWluc3RSb3V0ZVVzaW5nUmVkaXJlY3QoXG4gICAgICAgICAgbmdNb2R1bGUsIHJvdXRlcywgcm91dGUsIG91dGxldCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZXhwYW5kUmVndWxhclNlZ21lbnRBZ2FpbnN0Um91dGVVc2luZ1JlZGlyZWN0KFxuICAgICAgICBuZ01vZHVsZSwgc2VnbWVudEdyb3VwLCByb3V0ZXMsIHJvdXRlLCBzZWdtZW50cywgb3V0bGV0KTtcbiAgfVxuXG4gIHByaXZhdGUgZXhwYW5kV2lsZENhcmRXaXRoUGFyYW1zQWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgIG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+LCByb3V0ZXM6IFJvdXRlW10sIHJvdXRlOiBSb3V0ZSxcbiAgICAgIG91dGxldDogc3RyaW5nKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgICBjb25zdCBuZXdUcmVlID0gdGhpcy5hcHBseVJlZGlyZWN0Q29tbWFuZHMoW10sIHJvdXRlLnJlZGlyZWN0VG8hLCB7fSk7XG4gICAgaWYgKHJvdXRlLnJlZGlyZWN0VG8hLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgcmV0dXJuIGFic29sdXRlUmVkaXJlY3QobmV3VHJlZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubGluZXJhbGl6ZVNlZ21lbnRzKHJvdXRlLCBuZXdUcmVlKS5waXBlKG1lcmdlTWFwKChuZXdTZWdtZW50czogVXJsU2VnbWVudFtdKSA9PiB7XG4gICAgICBjb25zdCBncm91cCA9IG5ldyBVcmxTZWdtZW50R3JvdXAobmV3U2VnbWVudHMsIHt9KTtcbiAgICAgIHJldHVybiB0aGlzLmV4cGFuZFNlZ21lbnQobmdNb2R1bGUsIGdyb3VwLCByb3V0ZXMsIG5ld1NlZ21lbnRzLCBvdXRsZXQsIGZhbHNlKTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFJlZ3VsYXJTZWdtZW50QWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgIG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+LCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGVzOiBSb3V0ZVtdLCByb3V0ZTogUm91dGUsXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPiB7XG4gICAgY29uc3Qge21hdGNoZWQsIGNvbnN1bWVkU2VnbWVudHMsIGxhc3RDaGlsZCwgcG9zaXRpb25hbFBhcmFtU2VnbWVudHN9ID1cbiAgICAgICAgbWF0Y2goc2VnbWVudEdyb3VwLCByb3V0ZSwgc2VnbWVudHMpO1xuICAgIGlmICghbWF0Y2hlZCkgcmV0dXJuIG5vTWF0Y2goc2VnbWVudEdyb3VwKTtcblxuICAgIGNvbnN0IG5ld1RyZWUgPSB0aGlzLmFwcGx5UmVkaXJlY3RDb21tYW5kcyhcbiAgICAgICAgY29uc3VtZWRTZWdtZW50cywgcm91dGUucmVkaXJlY3RUbyEsIDxhbnk+cG9zaXRpb25hbFBhcmFtU2VnbWVudHMpO1xuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvIS5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAgIHJldHVybiBhYnNvbHV0ZVJlZGlyZWN0KG5ld1RyZWUpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmxpbmVyYWxpemVTZWdtZW50cyhyb3V0ZSwgbmV3VHJlZSkucGlwZShtZXJnZU1hcCgobmV3U2VnbWVudHM6IFVybFNlZ21lbnRbXSkgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kU2VnbWVudChcbiAgICAgICAgICBuZ01vZHVsZSwgc2VnbWVudEdyb3VwLCByb3V0ZXMsIG5ld1NlZ21lbnRzLmNvbmNhdChzZWdtZW50cy5zbGljZShsYXN0Q2hpbGQpKSwgb3V0bGV0LFxuICAgICAgICAgIGZhbHNlKTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIG1hdGNoU2VnbWVudEFnYWluc3RSb3V0ZShcbiAgICAgIG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+LCByYXdTZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGU6IFJvdXRlLFxuICAgICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSk6IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPiB7XG4gICAgaWYgKHJvdXRlLnBhdGggPT09ICcqKicpIHtcbiAgICAgIGlmIChyb3V0ZS5sb2FkQ2hpbGRyZW4pIHtcbiAgICAgICAgcmV0dXJuIGRlZmVyKFxuICAgICAgICAgICAgKCkgPT4gdGhpcy5jb25maWdMb2FkZXIubG9hZChuZ01vZHVsZS5pbmplY3Rvciwgcm91dGUpXG4gICAgICAgICAgICAgICAgICAgICAgLnBpcGUobWFwKChjZmc6IExvYWRlZFJvdXRlckNvbmZpZykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcm91dGUuX2xvYWRlZENvbmZpZyA9IGNmZztcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRzLCB7fSk7XG4gICAgICAgICAgICAgICAgICAgICAgfSkpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9mKG5ldyBVcmxTZWdtZW50R3JvdXAoc2VnbWVudHMsIHt9KSk7XG4gICAgfVxuXG4gICAgY29uc3Qge21hdGNoZWQsIGNvbnN1bWVkU2VnbWVudHMsIGxhc3RDaGlsZH0gPSBtYXRjaChyYXdTZWdtZW50R3JvdXAsIHJvdXRlLCBzZWdtZW50cyk7XG4gICAgaWYgKCFtYXRjaGVkKSByZXR1cm4gbm9NYXRjaChyYXdTZWdtZW50R3JvdXApO1xuXG4gICAgY29uc3QgcmF3U2xpY2VkU2VnbWVudHMgPSBzZWdtZW50cy5zbGljZShsYXN0Q2hpbGQpO1xuICAgIGNvbnN0IGNoaWxkQ29uZmlnJCA9IHRoaXMuZ2V0Q2hpbGRDb25maWcobmdNb2R1bGUsIHJvdXRlLCBzZWdtZW50cyk7XG5cbiAgICByZXR1cm4gY2hpbGRDb25maWckLnBpcGUobWVyZ2VNYXAoKHJvdXRlckNvbmZpZzogTG9hZGVkUm91dGVyQ29uZmlnKSA9PiB7XG4gICAgICBjb25zdCBjaGlsZE1vZHVsZSA9IHJvdXRlckNvbmZpZy5tb2R1bGU7XG4gICAgICBjb25zdCBjaGlsZENvbmZpZyA9IHJvdXRlckNvbmZpZy5yb3V0ZXM7XG5cbiAgICAgIGNvbnN0IHtzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzfSA9XG4gICAgICAgICAgc3BsaXQocmF3U2VnbWVudEdyb3VwLCBjb25zdW1lZFNlZ21lbnRzLCByYXdTbGljZWRTZWdtZW50cywgY2hpbGRDb25maWcpO1xuXG4gICAgICBpZiAoc2xpY2VkU2VnbWVudHMubGVuZ3RoID09PSAwICYmIHNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpKSB7XG4gICAgICAgIGNvbnN0IGV4cGFuZGVkJCA9IHRoaXMuZXhwYW5kQ2hpbGRyZW4oY2hpbGRNb2R1bGUsIGNoaWxkQ29uZmlnLCBzZWdtZW50R3JvdXApO1xuICAgICAgICByZXR1cm4gZXhwYW5kZWQkLnBpcGUoXG4gICAgICAgICAgICBtYXAoKGNoaWxkcmVuOiBhbnkpID0+IG5ldyBVcmxTZWdtZW50R3JvdXAoY29uc3VtZWRTZWdtZW50cywgY2hpbGRyZW4pKSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjaGlsZENvbmZpZy5sZW5ndGggPT09IDAgJiYgc2xpY2VkU2VnbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvZihuZXcgVXJsU2VnbWVudEdyb3VwKGNvbnN1bWVkU2VnbWVudHMsIHt9KSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGV4cGFuZGVkJCA9IHRoaXMuZXhwYW5kU2VnbWVudChcbiAgICAgICAgICBjaGlsZE1vZHVsZSwgc2VnbWVudEdyb3VwLCBjaGlsZENvbmZpZywgc2xpY2VkU2VnbWVudHMsIFBSSU1BUllfT1VUTEVULCB0cnVlKTtcbiAgICAgIHJldHVybiBleHBhbmRlZCQucGlwZShcbiAgICAgICAgICBtYXAoKGNzOiBVcmxTZWdtZW50R3JvdXApID0+XG4gICAgICAgICAgICAgICAgICBuZXcgVXJsU2VnbWVudEdyb3VwKGNvbnN1bWVkU2VnbWVudHMuY29uY2F0KGNzLnNlZ21lbnRzKSwgY3MuY2hpbGRyZW4pKSk7XG4gICAgfSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRDaGlsZENvbmZpZyhuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55Piwgcm91dGU6IFJvdXRlLCBzZWdtZW50czogVXJsU2VnbWVudFtdKTpcbiAgICAgIE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPiB7XG4gICAgaWYgKHJvdXRlLmNoaWxkcmVuKSB7XG4gICAgICAvLyBUaGUgY2hpbGRyZW4gYmVsb25nIHRvIHRoZSBzYW1lIG1vZHVsZVxuICAgICAgcmV0dXJuIG9mKG5ldyBMb2FkZWRSb3V0ZXJDb25maWcocm91dGUuY2hpbGRyZW4sIG5nTW9kdWxlKSk7XG4gICAgfVxuXG4gICAgaWYgKHJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgICAgLy8gbGF6eSBjaGlsZHJlbiBiZWxvbmcgdG8gdGhlIGxvYWRlZCBtb2R1bGVcbiAgICAgIGlmIChyb3V0ZS5fbG9hZGVkQ29uZmlnICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIG9mKHJvdXRlLl9sb2FkZWRDb25maWcpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5ydW5DYW5Mb2FkR3VhcmRzKG5nTW9kdWxlLmluamVjdG9yLCByb3V0ZSwgc2VnbWVudHMpXG4gICAgICAgICAgLnBpcGUobWVyZ2VNYXAoKHNob3VsZExvYWRSZXN1bHQ6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgIGlmIChzaG91bGRMb2FkUmVzdWx0KSB7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmZpZ0xvYWRlci5sb2FkKG5nTW9kdWxlLmluamVjdG9yLCByb3V0ZSlcbiAgICAgICAgICAgICAgICAgIC5waXBlKG1hcCgoY2ZnOiBMb2FkZWRSb3V0ZXJDb25maWcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUuX2xvYWRlZENvbmZpZyA9IGNmZztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNmZztcbiAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjYW5Mb2FkRmFpbHMocm91dGUpO1xuICAgICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb2YobmV3IExvYWRlZFJvdXRlckNvbmZpZyhbXSwgbmdNb2R1bGUpKTtcbiAgfVxuXG4gIHByaXZhdGUgcnVuQ2FuTG9hZEd1YXJkcyhtb2R1bGVJbmplY3RvcjogSW5qZWN0b3IsIHJvdXRlOiBSb3V0ZSwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSk6XG4gICAgICBPYnNlcnZhYmxlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBjYW5Mb2FkID0gcm91dGUuY2FuTG9hZDtcbiAgICBpZiAoIWNhbkxvYWQgfHwgY2FuTG9hZC5sZW5ndGggPT09IDApIHJldHVybiBvZih0cnVlKTtcblxuICAgIGNvbnN0IGNhbkxvYWRPYnNlcnZhYmxlcyA9IGNhbkxvYWQubWFwKChpbmplY3Rpb25Ub2tlbjogYW55KSA9PiB7XG4gICAgICBjb25zdCBndWFyZCA9IG1vZHVsZUluamVjdG9yLmdldChpbmplY3Rpb25Ub2tlbik7XG4gICAgICBsZXQgZ3VhcmRWYWw7XG4gICAgICBpZiAoaXNDYW5Mb2FkKGd1YXJkKSkge1xuICAgICAgICBndWFyZFZhbCA9IGd1YXJkLmNhbkxvYWQocm91dGUsIHNlZ21lbnRzKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbjxDYW5Mb2FkRm4+KGd1YXJkKSkge1xuICAgICAgICBndWFyZFZhbCA9IGd1YXJkKHJvdXRlLCBzZWdtZW50cyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgQ2FuTG9hZCBndWFyZCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHdyYXBJbnRvT2JzZXJ2YWJsZShndWFyZFZhbCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gb2YoY2FuTG9hZE9ic2VydmFibGVzKVxuICAgICAgICAucGlwZShcbiAgICAgICAgICAgIHByaW9yaXRpemVkR3VhcmRWYWx1ZSgpLFxuICAgICAgICAgICAgdGFwKChyZXN1bHQ6IFVybFRyZWV8Ym9vbGVhbikgPT4ge1xuICAgICAgICAgICAgICBpZiAoIWlzVXJsVHJlZShyZXN1bHQpKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgY29uc3QgZXJyb3I6IEVycm9yJnt1cmw/OiBVcmxUcmVlfSA9IG5hdmlnYXRpb25DYW5jZWxpbmdFcnJvcihcbiAgICAgICAgICAgICAgICAgIGBSZWRpcmVjdGluZyB0byBcIiR7dGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZShyZXN1bHQpfVwiYCk7XG4gICAgICAgICAgICAgIGVycm9yLnVybCA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG1hcChyZXN1bHQgPT4gcmVzdWx0ID09PSB0cnVlKSxcbiAgICAgICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgbGluZXJhbGl6ZVNlZ21lbnRzKHJvdXRlOiBSb3V0ZSwgdXJsVHJlZTogVXJsVHJlZSk6IE9ic2VydmFibGU8VXJsU2VnbWVudFtdPiB7XG4gICAgbGV0IHJlczogVXJsU2VnbWVudFtdID0gW107XG4gICAgbGV0IGMgPSB1cmxUcmVlLnJvb3Q7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHJlcyA9IHJlcy5jb25jYXQoYy5zZWdtZW50cyk7XG4gICAgICBpZiAoYy5udW1iZXJPZkNoaWxkcmVuID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvZihyZXMpO1xuICAgICAgfVxuXG4gICAgICBpZiAoYy5udW1iZXJPZkNoaWxkcmVuID4gMSB8fCAhYy5jaGlsZHJlbltQUklNQVJZX09VVExFVF0pIHtcbiAgICAgICAgcmV0dXJuIG5hbWVkT3V0bGV0c1JlZGlyZWN0KHJvdXRlLnJlZGlyZWN0VG8hKTtcbiAgICAgIH1cblxuICAgICAgYyA9IGMuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwbHlSZWRpcmVjdENvbW1hbmRzKFxuICAgICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgcmVkaXJlY3RUbzogc3RyaW5nLCBwb3NQYXJhbXM6IHtbazogc3RyaW5nXTogVXJsU2VnbWVudH0pOiBVcmxUcmVlIHtcbiAgICByZXR1cm4gdGhpcy5hcHBseVJlZGlyZWN0Q3JlYXRyZVVybFRyZWUoXG4gICAgICAgIHJlZGlyZWN0VG8sIHRoaXMudXJsU2VyaWFsaXplci5wYXJzZShyZWRpcmVjdFRvKSwgc2VnbWVudHMsIHBvc1BhcmFtcyk7XG4gIH1cblxuICBwcml2YXRlIGFwcGx5UmVkaXJlY3RDcmVhdHJlVXJsVHJlZShcbiAgICAgIHJlZGlyZWN0VG86IHN0cmluZywgdXJsVHJlZTogVXJsVHJlZSwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICAgIHBvc1BhcmFtczoge1trOiBzdHJpbmddOiBVcmxTZWdtZW50fSk6IFVybFRyZWUge1xuICAgIGNvbnN0IG5ld1Jvb3QgPSB0aGlzLmNyZWF0ZVNlZ21lbnRHcm91cChyZWRpcmVjdFRvLCB1cmxUcmVlLnJvb3QsIHNlZ21lbnRzLCBwb3NQYXJhbXMpO1xuICAgIHJldHVybiBuZXcgVXJsVHJlZShcbiAgICAgICAgbmV3Um9vdCwgdGhpcy5jcmVhdGVRdWVyeVBhcmFtcyh1cmxUcmVlLnF1ZXJ5UGFyYW1zLCB0aGlzLnVybFRyZWUucXVlcnlQYXJhbXMpLFxuICAgICAgICB1cmxUcmVlLmZyYWdtZW50KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlUXVlcnlQYXJhbXMocmVkaXJlY3RUb1BhcmFtczogUGFyYW1zLCBhY3R1YWxQYXJhbXM6IFBhcmFtcyk6IFBhcmFtcyB7XG4gICAgY29uc3QgcmVzOiBQYXJhbXMgPSB7fTtcbiAgICBmb3JFYWNoKHJlZGlyZWN0VG9QYXJhbXMsICh2OiBhbnksIGs6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgY29weVNvdXJjZVZhbHVlID0gdHlwZW9mIHYgPT09ICdzdHJpbmcnICYmIHYuc3RhcnRzV2l0aCgnOicpO1xuICAgICAgaWYgKGNvcHlTb3VyY2VWYWx1ZSkge1xuICAgICAgICBjb25zdCBzb3VyY2VOYW1lID0gdi5zdWJzdHJpbmcoMSk7XG4gICAgICAgIHJlc1trXSA9IGFjdHVhbFBhcmFtc1tzb3VyY2VOYW1lXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc1trXSA9IHY7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlU2VnbWVudEdyb3VwKFxuICAgICAgcmVkaXJlY3RUbzogc3RyaW5nLCBncm91cDogVXJsU2VnbWVudEdyb3VwLCBzZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgICAgcG9zUGFyYW1zOiB7W2s6IHN0cmluZ106IFVybFNlZ21lbnR9KTogVXJsU2VnbWVudEdyb3VwIHtcbiAgICBjb25zdCB1cGRhdGVkU2VnbWVudHMgPSB0aGlzLmNyZWF0ZVNlZ21lbnRzKHJlZGlyZWN0VG8sIGdyb3VwLnNlZ21lbnRzLCBzZWdtZW50cywgcG9zUGFyYW1zKTtcblxuICAgIGxldCBjaGlsZHJlbjoge1tuOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gICAgZm9yRWFjaChncm91cC5jaGlsZHJlbiwgKGNoaWxkOiBVcmxTZWdtZW50R3JvdXAsIG5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgY2hpbGRyZW5bbmFtZV0gPSB0aGlzLmNyZWF0ZVNlZ21lbnRHcm91cChyZWRpcmVjdFRvLCBjaGlsZCwgc2VnbWVudHMsIHBvc1BhcmFtcyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cCh1cGRhdGVkU2VnbWVudHMsIGNoaWxkcmVuKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlU2VnbWVudHMoXG4gICAgICByZWRpcmVjdFRvOiBzdHJpbmcsIHJlZGlyZWN0VG9TZWdtZW50czogVXJsU2VnbWVudFtdLCBhY3R1YWxTZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgICAgcG9zUGFyYW1zOiB7W2s6IHN0cmluZ106IFVybFNlZ21lbnR9KTogVXJsU2VnbWVudFtdIHtcbiAgICByZXR1cm4gcmVkaXJlY3RUb1NlZ21lbnRzLm1hcChcbiAgICAgICAgcyA9PiBzLnBhdGguc3RhcnRzV2l0aCgnOicpID8gdGhpcy5maW5kUG9zUGFyYW0ocmVkaXJlY3RUbywgcywgcG9zUGFyYW1zKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmluZE9yUmV0dXJuKHMsIGFjdHVhbFNlZ21lbnRzKSk7XG4gIH1cblxuICBwcml2YXRlIGZpbmRQb3NQYXJhbShcbiAgICAgIHJlZGlyZWN0VG86IHN0cmluZywgcmVkaXJlY3RUb1VybFNlZ21lbnQ6IFVybFNlZ21lbnQsXG4gICAgICBwb3NQYXJhbXM6IHtbazogc3RyaW5nXTogVXJsU2VnbWVudH0pOiBVcmxTZWdtZW50IHtcbiAgICBjb25zdCBwb3MgPSBwb3NQYXJhbXNbcmVkaXJlY3RUb1VybFNlZ21lbnQucGF0aC5zdWJzdHJpbmcoMSldO1xuICAgIGlmICghcG9zKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBDYW5ub3QgcmVkaXJlY3QgdG8gJyR7cmVkaXJlY3RUb30nLiBDYW5ub3QgZmluZCAnJHtyZWRpcmVjdFRvVXJsU2VnbWVudC5wYXRofScuYCk7XG4gICAgcmV0dXJuIHBvcztcbiAgfVxuXG4gIHByaXZhdGUgZmluZE9yUmV0dXJuKHJlZGlyZWN0VG9VcmxTZWdtZW50OiBVcmxTZWdtZW50LCBhY3R1YWxTZWdtZW50czogVXJsU2VnbWVudFtdKTogVXJsU2VnbWVudCB7XG4gICAgbGV0IGlkeCA9IDA7XG4gICAgZm9yIChjb25zdCBzIG9mIGFjdHVhbFNlZ21lbnRzKSB7XG4gICAgICBpZiAocy5wYXRoID09PSByZWRpcmVjdFRvVXJsU2VnbWVudC5wYXRoKSB7XG4gICAgICAgIGFjdHVhbFNlZ21lbnRzLnNwbGljZShpZHgpO1xuICAgICAgICByZXR1cm4gcztcbiAgICAgIH1cbiAgICAgIGlkeCsrO1xuICAgIH1cbiAgICByZXR1cm4gcmVkaXJlY3RUb1VybFNlZ21lbnQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWF0Y2goc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlOiBSb3V0ZSwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSk6IHtcbiAgbWF0Y2hlZDogYm9vbGVhbixcbiAgY29uc3VtZWRTZWdtZW50czogVXJsU2VnbWVudFtdLFxuICBsYXN0Q2hpbGQ6IG51bWJlcixcbiAgcG9zaXRpb25hbFBhcmFtU2VnbWVudHM6IHtbazogc3RyaW5nXTogVXJsU2VnbWVudH1cbn0ge1xuICBpZiAocm91dGUucGF0aCA9PT0gJycpIHtcbiAgICBpZiAoKHJvdXRlLnBhdGhNYXRjaCA9PT0gJ2Z1bGwnKSAmJiAoc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkgfHwgc2VnbWVudHMubGVuZ3RoID4gMCkpIHtcbiAgICAgIHJldHVybiB7bWF0Y2hlZDogZmFsc2UsIGNvbnN1bWVkU2VnbWVudHM6IFtdLCBsYXN0Q2hpbGQ6IDAsIHBvc2l0aW9uYWxQYXJhbVNlZ21lbnRzOiB7fX07XG4gICAgfVxuXG4gICAgcmV0dXJuIHttYXRjaGVkOiB0cnVlLCBjb25zdW1lZFNlZ21lbnRzOiBbXSwgbGFzdENoaWxkOiAwLCBwb3NpdGlvbmFsUGFyYW1TZWdtZW50czoge319O1xuICB9XG5cbiAgY29uc3QgbWF0Y2hlciA9IHJvdXRlLm1hdGNoZXIgfHwgZGVmYXVsdFVybE1hdGNoZXI7XG4gIGNvbnN0IHJlcyA9IG1hdGNoZXIoc2VnbWVudHMsIHNlZ21lbnRHcm91cCwgcm91dGUpO1xuXG4gIGlmICghcmVzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG1hdGNoZWQ6IGZhbHNlLFxuICAgICAgY29uc3VtZWRTZWdtZW50czogPGFueVtdPltdLFxuICAgICAgbGFzdENoaWxkOiAwLFxuICAgICAgcG9zaXRpb25hbFBhcmFtU2VnbWVudHM6IHt9LFxuICAgIH07XG4gIH1cblxuICByZXR1cm4ge1xuICAgIG1hdGNoZWQ6IHRydWUsXG4gICAgY29uc3VtZWRTZWdtZW50czogcmVzLmNvbnN1bWVkISxcbiAgICBsYXN0Q2hpbGQ6IHJlcy5jb25zdW1lZC5sZW5ndGghLFxuICAgIHBvc2l0aW9uYWxQYXJhbVNlZ21lbnRzOiByZXMucG9zUGFyYW1zISxcbiAgfTtcbn1cblxuZnVuY3Rpb24gc3BsaXQoXG4gICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIGNvbnN1bWVkU2VnbWVudHM6IFVybFNlZ21lbnRbXSwgc2xpY2VkU2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICBjb25maWc6IFJvdXRlW10pIHtcbiAgaWYgKHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA+IDAgJiZcbiAgICAgIGNvbnRhaW5zRW1wdHlQYXRoUmVkaXJlY3RzV2l0aE5hbWVkT3V0bGV0cyhzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzLCBjb25maWcpKSB7XG4gICAgY29uc3QgcyA9IG5ldyBVcmxTZWdtZW50R3JvdXAoXG4gICAgICAgIGNvbnN1bWVkU2VnbWVudHMsXG4gICAgICAgIGNyZWF0ZUNoaWxkcmVuRm9yRW1wdHlTZWdtZW50cyhcbiAgICAgICAgICAgIGNvbmZpZywgbmV3IFVybFNlZ21lbnRHcm91cChzbGljZWRTZWdtZW50cywgc2VnbWVudEdyb3VwLmNoaWxkcmVuKSkpO1xuICAgIHJldHVybiB7c2VnbWVudEdyb3VwOiBtZXJnZVRyaXZpYWxDaGlsZHJlbihzKSwgc2xpY2VkU2VnbWVudHM6IFtdfTtcbiAgfVxuXG4gIGlmIChzbGljZWRTZWdtZW50cy5sZW5ndGggPT09IDAgJiZcbiAgICAgIGNvbnRhaW5zRW1wdHlQYXRoUmVkaXJlY3RzKHNlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHMsIGNvbmZpZykpIHtcbiAgICBjb25zdCBzID0gbmV3IFVybFNlZ21lbnRHcm91cChcbiAgICAgICAgc2VnbWVudEdyb3VwLnNlZ21lbnRzLFxuICAgICAgICBhZGRFbXB0eVNlZ21lbnRzVG9DaGlsZHJlbklmTmVlZGVkKFxuICAgICAgICAgICAgc2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50cywgY29uZmlnLCBzZWdtZW50R3JvdXAuY2hpbGRyZW4pKTtcbiAgICByZXR1cm4ge3NlZ21lbnRHcm91cDogbWVyZ2VUcml2aWFsQ2hpbGRyZW4ocyksIHNsaWNlZFNlZ21lbnRzfTtcbiAgfVxuXG4gIHJldHVybiB7c2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50c307XG59XG5cbmZ1bmN0aW9uIG1lcmdlVHJpdmlhbENoaWxkcmVuKHM6IFVybFNlZ21lbnRHcm91cCk6IFVybFNlZ21lbnRHcm91cCB7XG4gIGlmIChzLm51bWJlck9mQ2hpbGRyZW4gPT09IDEgJiYgcy5jaGlsZHJlbltQUklNQVJZX09VVExFVF0pIHtcbiAgICBjb25zdCBjID0gcy5jaGlsZHJlbltQUklNQVJZX09VVExFVF07XG4gICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAocy5zZWdtZW50cy5jb25jYXQoYy5zZWdtZW50cyksIGMuY2hpbGRyZW4pO1xuICB9XG5cbiAgcmV0dXJuIHM7XG59XG5cbmZ1bmN0aW9uIGFkZEVtcHR5U2VnbWVudHNUb0NoaWxkcmVuSWZOZWVkZWQoXG4gICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzOiBVcmxTZWdtZW50W10sIHJvdXRlczogUm91dGVbXSxcbiAgICBjaGlsZHJlbjoge1tuYW1lOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9KToge1tuYW1lOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9IHtcbiAgY29uc3QgcmVzOiB7W25hbWU6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0gPSB7fTtcbiAgZm9yIChjb25zdCByIG9mIHJvdXRlcykge1xuICAgIGlmIChpc0VtcHR5UGF0aFJlZGlyZWN0KHNlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHMsIHIpICYmICFjaGlsZHJlbltnZXRPdXRsZXQocildKSB7XG4gICAgICByZXNbZ2V0T3V0bGV0KHIpXSA9IG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHsuLi5jaGlsZHJlbiwgLi4ucmVzfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlQ2hpbGRyZW5Gb3JFbXB0eVNlZ21lbnRzKFxuICAgIHJvdXRlczogUm91dGVbXSwgcHJpbWFyeVNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKToge1tuYW1lOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9IHtcbiAgY29uc3QgcmVzOiB7W25hbWU6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0gPSB7fTtcbiAgcmVzW1BSSU1BUllfT1VUTEVUXSA9IHByaW1hcnlTZWdtZW50R3JvdXA7XG4gIGZvciAoY29uc3QgciBvZiByb3V0ZXMpIHtcbiAgICBpZiAoci5wYXRoID09PSAnJyAmJiBnZXRPdXRsZXQocikgIT09IFBSSU1BUllfT1VUTEVUKSB7XG4gICAgICByZXNbZ2V0T3V0bGV0KHIpXSA9IG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxuZnVuY3Rpb24gY29udGFpbnNFbXB0eVBhdGhSZWRpcmVjdHNXaXRoTmFtZWRPdXRsZXRzKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBzZWdtZW50czogVXJsU2VnbWVudFtdLCByb3V0ZXM6IFJvdXRlW10pOiBib29sZWFuIHtcbiAgcmV0dXJuIHJvdXRlcy5zb21lKFxuICAgICAgciA9PiBpc0VtcHR5UGF0aFJlZGlyZWN0KHNlZ21lbnRHcm91cCwgc2VnbWVudHMsIHIpICYmIGdldE91dGxldChyKSAhPT0gUFJJTUFSWV9PVVRMRVQpO1xufVxuXG5mdW5jdGlvbiBjb250YWluc0VtcHR5UGF0aFJlZGlyZWN0cyhcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgcm91dGVzOiBSb3V0ZVtdKTogYm9vbGVhbiB7XG4gIHJldHVybiByb3V0ZXMuc29tZShyID0+IGlzRW1wdHlQYXRoUmVkaXJlY3Qoc2VnbWVudEdyb3VwLCBzZWdtZW50cywgcikpO1xufVxuXG5mdW5jdGlvbiBpc0VtcHR5UGF0aFJlZGlyZWN0KFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBzZWdtZW50czogVXJsU2VnbWVudFtdLCByOiBSb3V0ZSk6IGJvb2xlYW4ge1xuICBpZiAoKHNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpIHx8IHNlZ21lbnRzLmxlbmd0aCA+IDApICYmIHIucGF0aE1hdGNoID09PSAnZnVsbCcpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gci5wYXRoID09PSAnJyAmJiByLnJlZGlyZWN0VG8gIT09IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZ2V0T3V0bGV0KHJvdXRlOiBSb3V0ZSk6IHN0cmluZyB7XG4gIHJldHVybiByb3V0ZS5vdXRsZXQgfHwgUFJJTUFSWV9PVVRMRVQ7XG59XG4iXX0=