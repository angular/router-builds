/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EmptyError, from, of, throwError } from 'rxjs';
import { catchError, concatMap, first, last, map, mergeMap, scan, tap } from 'rxjs/operators';
import { prioritizedGuardValue } from './operators/prioritized_guard_value';
import { navigationCancelingError, PRIMARY_OUTLET } from './shared';
import { UrlSegmentGroup, UrlTree } from './url_tree';
import { forEach, wrapIntoObservable } from './utils/collection';
import { getOutlet, sortByMatchingOutlets } from './utils/config';
import { isImmediateMatch, match, noLeftoversInUrl, split } from './utils/config_matching';
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
    return throwError(new NoMatch(segmentGroup));
}
function absoluteRedirect(newTree) {
    return throwError(new AbsoluteRedirect(newTree));
}
function namedOutletsRedirect(redirectTo) {
    return throwError(new Error(`Only absolute redirects can have named outlets. redirectTo: '${redirectTo}'`));
}
function canLoadFails(route) {
    return throwError(navigationCancelingError(`Cannot load children because the guard of the route "path: '${route.path}'" returned false`));
}
/**
 * Returns the `UrlTree` with the redirection applied.
 *
 * Lazy modules are loaded along the way.
 */
export function applyRedirects(injector, configLoader, urlSerializer, urlTree, config) {
    return new ApplyRedirects(injector, configLoader, urlSerializer, urlTree, config).apply();
}
class ApplyRedirects {
    constructor(injector, configLoader, urlSerializer, urlTree, config) {
        this.injector = injector;
        this.configLoader = configLoader;
        this.urlSerializer = urlSerializer;
        this.urlTree = urlTree;
        this.config = config;
        this.allowRedirects = true;
    }
    apply() {
        const splitGroup = split(this.urlTree.root, [], [], this.config).segmentGroup;
        // TODO(atscott): creating a new segment removes the _sourceSegment _segmentIndexShift, which is
        // only necessary to prevent failures in tests which assert exact object matches. The `split` is
        // now shared between `applyRedirects` and `recognize` but only the `recognize` step needs these
        // properties. Before the implementations were merged, the `applyRedirects` would not assign
        // them. We should be able to remove this logic as a "breaking change" but should do some more
        // investigation into the failures first.
        const rootSegmentGroup = new UrlSegmentGroup(splitGroup.segments, splitGroup.children);
        const expanded$ = this.expandSegmentGroup(this.injector, this.config, rootSegmentGroup, PRIMARY_OUTLET);
        const urlTrees$ = expanded$.pipe(map((rootSegmentGroup) => {
            return this.createUrlTree(squashSegmentGroup(rootSegmentGroup), this.urlTree.queryParams, this.urlTree.fragment);
        }));
        return urlTrees$.pipe(catchError((e) => {
            if (e instanceof AbsoluteRedirect) {
                // After an absolute redirect we do not apply any more redirects!
                // If this implementation changes, update the documentation note in `redirectTo`.
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
        const expanded$ = this.expandSegmentGroup(this.injector, this.config, tree.root, PRIMARY_OUTLET);
        const mapped$ = expanded$.pipe(map((rootSegmentGroup) => {
            return this.createUrlTree(squashSegmentGroup(rootSegmentGroup), tree.queryParams, tree.fragment);
        }));
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
    expandSegmentGroup(injector, routes, segmentGroup, outlet) {
        if (segmentGroup.segments.length === 0 && segmentGroup.hasChildren()) {
            return this.expandChildren(injector, routes, segmentGroup)
                .pipe(map((children) => new UrlSegmentGroup([], children)));
        }
        return this.expandSegment(injector, segmentGroup, routes, segmentGroup.segments, outlet, true);
    }
    // Recursively expand segment groups for all the child outlets
    expandChildren(injector, routes, segmentGroup) {
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
            // Sort the routes so routes with outlets that match the segment appear
            // first, followed by routes for other outlets, which might match if they have an
            // empty path.
            const sortedRoutes = sortByMatchingOutlets(routes, childOutlet);
            return this.expandSegmentGroup(injector, sortedRoutes, child, childOutlet)
                .pipe(map(s => ({ segment: s, outlet: childOutlet })));
        }), scan((children, expandedChild) => {
            children[expandedChild.outlet] = expandedChild.segment;
            return children;
        }, {}), last());
    }
    expandSegment(injector, segmentGroup, routes, segments, outlet, allowRedirects) {
        return from(routes).pipe(concatMap((r) => {
            const expanded$ = this.expandSegmentAgainstRoute(injector, segmentGroup, routes, r, segments, outlet, allowRedirects);
            return expanded$.pipe(catchError((e) => {
                if (e instanceof NoMatch) {
                    return of(null);
                }
                throw e;
            }));
        }), first((s) => !!s), catchError((e, _) => {
            if (e instanceof EmptyError || e.name === 'EmptyError') {
                if (noLeftoversInUrl(segmentGroup, segments, outlet)) {
                    return of(new UrlSegmentGroup([], {}));
                }
                return noMatch(segmentGroup);
            }
            throw e;
        }));
    }
    expandSegmentAgainstRoute(injector, segmentGroup, routes, route, paths, outlet, allowRedirects) {
        if (!isImmediateMatch(route, segmentGroup, paths, outlet)) {
            return noMatch(segmentGroup);
        }
        if (route.redirectTo === undefined) {
            return this.matchSegmentAgainstRoute(injector, segmentGroup, route, paths, outlet);
        }
        if (allowRedirects && this.allowRedirects) {
            return this.expandSegmentAgainstRouteUsingRedirect(injector, segmentGroup, routes, route, paths, outlet);
        }
        return noMatch(segmentGroup);
    }
    expandSegmentAgainstRouteUsingRedirect(injector, segmentGroup, routes, route, segments, outlet) {
        if (route.path === '**') {
            return this.expandWildCardWithParamsAgainstRouteUsingRedirect(injector, routes, route, outlet);
        }
        return this.expandRegularSegmentAgainstRouteUsingRedirect(injector, segmentGroup, routes, route, segments, outlet);
    }
    expandWildCardWithParamsAgainstRouteUsingRedirect(injector, routes, route, outlet) {
        const newTree = this.applyRedirectCommands([], route.redirectTo, {});
        if (route.redirectTo.startsWith('/')) {
            return absoluteRedirect(newTree);
        }
        return this.lineralizeSegments(route, newTree).pipe(mergeMap((newSegments) => {
            const group = new UrlSegmentGroup(newSegments, {});
            return this.expandSegment(injector, group, routes, newSegments, outlet, false);
        }));
    }
    expandRegularSegmentAgainstRouteUsingRedirect(injector, segmentGroup, routes, route, segments, outlet) {
        const { matched, consumedSegments, remainingSegments, positionalParamSegments } = match(segmentGroup, route, segments);
        if (!matched)
            return noMatch(segmentGroup);
        const newTree = this.applyRedirectCommands(consumedSegments, route.redirectTo, positionalParamSegments);
        if (route.redirectTo.startsWith('/')) {
            return absoluteRedirect(newTree);
        }
        return this.lineralizeSegments(route, newTree).pipe(mergeMap((newSegments) => {
            return this.expandSegment(injector, segmentGroup, routes, newSegments.concat(remainingSegments), outlet, false);
        }));
    }
    matchSegmentAgainstRoute(injector, rawSegmentGroup, route, segments, outlet) {
        if (route.path === '**') {
            if (route.loadChildren) {
                const loaded$ = route._loadedRoutes ?
                    of({ routes: route._loadedRoutes, injector: route._loadedInjector }) :
                    this.configLoader.load(injector, route);
                return loaded$.pipe(map((cfg) => {
                    route._loadedRoutes = cfg.routes;
                    route._loadedInjector = cfg.injector;
                    return new UrlSegmentGroup(segments, {});
                }));
            }
            return of(new UrlSegmentGroup(segments, {}));
        }
        const { matched, consumedSegments, remainingSegments } = match(rawSegmentGroup, route, segments);
        if (!matched)
            return noMatch(rawSegmentGroup);
        const childConfig$ = this.getChildConfig(injector, route, segments);
        return childConfig$.pipe(mergeMap((routerConfig) => {
            const childInjector = routerConfig.injector ?? injector;
            const childConfig = routerConfig.routes;
            const { segmentGroup: splitSegmentGroup, slicedSegments } = split(rawSegmentGroup, consumedSegments, remainingSegments, childConfig);
            // See comment on the other call to `split` about why this is necessary.
            const segmentGroup = new UrlSegmentGroup(splitSegmentGroup.segments, splitSegmentGroup.children);
            if (slicedSegments.length === 0 && segmentGroup.hasChildren()) {
                const expanded$ = this.expandChildren(childInjector, childConfig, segmentGroup);
                return expanded$.pipe(map((children) => new UrlSegmentGroup(consumedSegments, children)));
            }
            if (childConfig.length === 0 && slicedSegments.length === 0) {
                return of(new UrlSegmentGroup(consumedSegments, {}));
            }
            const matchedOnOutlet = getOutlet(route) === outlet;
            const expanded$ = this.expandSegment(childInjector, segmentGroup, childConfig, slicedSegments, matchedOnOutlet ? PRIMARY_OUTLET : outlet, true);
            return expanded$.pipe(map((cs) => new UrlSegmentGroup(consumedSegments.concat(cs.segments), cs.children)));
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
            return this.runCanLoadGuards(injector, route, segments)
                .pipe(mergeMap((shouldLoadResult) => {
                if (shouldLoadResult) {
                    return this.configLoader.load(injector, route).pipe(map((cfg) => {
                        route._loadedRoutes = cfg.routes;
                        route._loadedInjector = cfg.injector;
                        return cfg;
                    }));
                }
                return canLoadFails(route);
            }));
        }
        return of({ routes: [], injector });
    }
    runCanLoadGuards(injector, route, segments) {
        const canLoad = route.canLoad;
        if (!canLoad || canLoad.length === 0)
            return of(true);
        const canLoadObservables = canLoad.map((injectionToken) => {
            const guard = injector.get(injectionToken);
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
/**
 * When possible, merges the primary outlet child into the parent `UrlSegmentGroup`.
 *
 * When a segment group has only one child which is a primary outlet, merges that child into the
 * parent. That is, the child segment group's segments are merged into the `s` and the child's
 * children become the children of `s`. Think of this like a 'squash', merging the child segment
 * group into the parent.
 */
function mergeTrivialChildren(s) {
    if (s.numberOfChildren === 1 && s.children[PRIMARY_OUTLET]) {
        const c = s.children[PRIMARY_OUTLET];
        return new UrlSegmentGroup(s.segments.concat(c.segments), c.children);
    }
    return s;
}
/**
 * Recursively merges primary segment children into their parents and also drops empty children
 * (those which have no segments and no children themselves). The latter prevents serializing a
 * group into something like `/a(aux:)`, where `aux` is an empty child segment.
 */
function squashSegmentGroup(segmentGroup) {
    const newChildren = {};
    for (const childOutlet of Object.keys(segmentGroup.children)) {
        const child = segmentGroup.children[childOutlet];
        const childCandidate = squashSegmentGroup(child);
        // don't add empty children
        if (childCandidate.segments.length > 0 || childCandidate.hasChildren()) {
            newChildren[childOutlet] = childCandidate;
        }
    }
    const s = new UrlSegmentGroup(segmentGroup.segments, newChildren);
    return mergeTrivialChildren(s);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHlfcmVkaXJlY3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9hcHBseV9yZWRpcmVjdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUFDLFVBQVUsRUFBRSxJQUFJLEVBQXdCLEVBQUUsRUFBRSxVQUFVLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDNUUsT0FBTyxFQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUc1RixPQUFPLEVBQUMscUJBQXFCLEVBQUMsTUFBTSxxQ0FBcUMsQ0FBQztBQUUxRSxPQUFPLEVBQUMsd0JBQXdCLEVBQVUsY0FBYyxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzFFLE9BQU8sRUFBYSxlQUFlLEVBQWlCLE9BQU8sRUFBQyxNQUFNLFlBQVksQ0FBQztBQUMvRSxPQUFPLEVBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDL0QsT0FBTyxFQUFDLFNBQVMsRUFBRSxxQkFBcUIsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDekYsT0FBTyxFQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFDLE1BQU0scUJBQXFCLENBQUM7QUFFckUsTUFBTSxPQUFPO0lBR1gsWUFBWSxZQUE4QjtRQUN4QyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksSUFBSSxJQUFJLENBQUM7SUFDM0MsQ0FBQztDQUNGO0FBRUQsTUFBTSxnQkFBZ0I7SUFDcEIsWUFBbUIsT0FBZ0I7UUFBaEIsWUFBTyxHQUFQLE9BQU8s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QUFjLENBQUM7U0FDM0M7S0FDRjtJQUNELE1BQU0sQ0FBQyxHQUFHLElBQUksZUFBZSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDbEUsT0FBTyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SW5qZWN0b3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtFbXB0eUVycm9yLCBmcm9tLCBPYnNlcnZhYmxlLCBPYnNlcnZlciwgb2YsIHRocm93RXJyb3J9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjYXRjaEVycm9yLCBjb25jYXRNYXAsIGZpcnN0LCBsYXN0LCBtYXAsIG1lcmdlTWFwLCBzY2FuLCB0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtDYW5Mb2FkRm4sIExvYWRlZFJvdXRlckNvbmZpZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtwcmlvcml0aXplZEd1YXJkVmFsdWV9IGZyb20gJy4vb3BlcmF0b3JzL3ByaW9yaXRpemVkX2d1YXJkX3ZhbHVlJztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7bmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yLCBQYXJhbXMsIFBSSU1BUllfT1VUTEVUfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge1VybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cCwgVXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge2ZvckVhY2gsIHdyYXBJbnRvT2JzZXJ2YWJsZX0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcbmltcG9ydCB7Z2V0T3V0bGV0LCBzb3J0QnlNYXRjaGluZ091dGxldHN9IGZyb20gJy4vdXRpbHMvY29uZmlnJztcbmltcG9ydCB7aXNJbW1lZGlhdGVNYXRjaCwgbWF0Y2gsIG5vTGVmdG92ZXJzSW5VcmwsIHNwbGl0fSBmcm9tICcuL3V0aWxzL2NvbmZpZ19tYXRjaGluZyc7XG5pbXBvcnQge2lzQ2FuTG9hZCwgaXNGdW5jdGlvbiwgaXNVcmxUcmVlfSBmcm9tICcuL3V0aWxzL3R5cGVfZ3VhcmRzJztcblxuY2xhc3MgTm9NYXRjaCB7XG4gIHB1YmxpYyBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cHxudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHNlZ21lbnRHcm91cD86IFVybFNlZ21lbnRHcm91cCkge1xuICAgIHRoaXMuc2VnbWVudEdyb3VwID0gc2VnbWVudEdyb3VwIHx8IG51bGw7XG4gIH1cbn1cblxuY2xhc3MgQWJzb2x1dGVSZWRpcmVjdCB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyB1cmxUcmVlOiBVcmxUcmVlKSB7fVxufVxuXG5mdW5jdGlvbiBub01hdGNoKHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgcmV0dXJuIHRocm93RXJyb3IobmV3IE5vTWF0Y2goc2VnbWVudEdyb3VwKSk7XG59XG5cbmZ1bmN0aW9uIGFic29sdXRlUmVkaXJlY3QobmV3VHJlZTogVXJsVHJlZSk6IE9ic2VydmFibGU8YW55PiB7XG4gIHJldHVybiB0aHJvd0Vycm9yKG5ldyBBYnNvbHV0ZVJlZGlyZWN0KG5ld1RyZWUpKTtcbn1cblxuZnVuY3Rpb24gbmFtZWRPdXRsZXRzUmVkaXJlY3QocmVkaXJlY3RUbzogc3RyaW5nKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgcmV0dXJuIHRocm93RXJyb3IoXG4gICAgICBuZXcgRXJyb3IoYE9ubHkgYWJzb2x1dGUgcmVkaXJlY3RzIGNhbiBoYXZlIG5hbWVkIG91dGxldHMuIHJlZGlyZWN0VG86ICcke3JlZGlyZWN0VG99J2ApKTtcbn1cblxuZnVuY3Rpb24gY2FuTG9hZEZhaWxzKHJvdXRlOiBSb3V0ZSk6IE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPiB7XG4gIHJldHVybiB0aHJvd0Vycm9yKFxuICAgICAgbmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yKGBDYW5ub3QgbG9hZCBjaGlsZHJlbiBiZWNhdXNlIHRoZSBndWFyZCBvZiB0aGUgcm91dGUgXCJwYXRoOiAnJHtcbiAgICAgICAgICByb3V0ZS5wYXRofSdcIiByZXR1cm5lZCBmYWxzZWApKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBgVXJsVHJlZWAgd2l0aCB0aGUgcmVkaXJlY3Rpb24gYXBwbGllZC5cbiAqXG4gKiBMYXp5IG1vZHVsZXMgYXJlIGxvYWRlZCBhbG9uZyB0aGUgd2F5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlSZWRpcmVjdHMoXG4gICAgaW5qZWN0b3I6IEluamVjdG9yLCBjb25maWdMb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlciwgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICB1cmxUcmVlOiBVcmxUcmVlLCBjb25maWc6IFJvdXRlcyk6IE9ic2VydmFibGU8VXJsVHJlZT4ge1xuICByZXR1cm4gbmV3IEFwcGx5UmVkaXJlY3RzKGluamVjdG9yLCBjb25maWdMb2FkZXIsIHVybFNlcmlhbGl6ZXIsIHVybFRyZWUsIGNvbmZpZykuYXBwbHkoKTtcbn1cblxuY2xhc3MgQXBwbHlSZWRpcmVjdHMge1xuICBwcml2YXRlIGFsbG93UmVkaXJlY3RzOiBib29sZWFuID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaW5qZWN0b3I6IEluamVjdG9yLCBwcml2YXRlIGNvbmZpZ0xvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyLFxuICAgICAgcHJpdmF0ZSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLCBwcml2YXRlIHVybFRyZWU6IFVybFRyZWUsIHByaXZhdGUgY29uZmlnOiBSb3V0ZXMpIHt9XG5cbiAgYXBwbHkoKTogT2JzZXJ2YWJsZTxVcmxUcmVlPiB7XG4gICAgY29uc3Qgc3BsaXRHcm91cCA9IHNwbGl0KHRoaXMudXJsVHJlZS5yb290LCBbXSwgW10sIHRoaXMuY29uZmlnKS5zZWdtZW50R3JvdXA7XG4gICAgLy8gVE9ETyhhdHNjb3R0KTogY3JlYXRpbmcgYSBuZXcgc2VnbWVudCByZW1vdmVzIHRoZSBfc291cmNlU2VnbWVudCBfc2VnbWVudEluZGV4U2hpZnQsIHdoaWNoIGlzXG4gICAgLy8gb25seSBuZWNlc3NhcnkgdG8gcHJldmVudCBmYWlsdXJlcyBpbiB0ZXN0cyB3aGljaCBhc3NlcnQgZXhhY3Qgb2JqZWN0IG1hdGNoZXMuIFRoZSBgc3BsaXRgIGlzXG4gICAgLy8gbm93IHNoYXJlZCBiZXR3ZWVuIGBhcHBseVJlZGlyZWN0c2AgYW5kIGByZWNvZ25pemVgIGJ1dCBvbmx5IHRoZSBgcmVjb2duaXplYCBzdGVwIG5lZWRzIHRoZXNlXG4gICAgLy8gcHJvcGVydGllcy4gQmVmb3JlIHRoZSBpbXBsZW1lbnRhdGlvbnMgd2VyZSBtZXJnZWQsIHRoZSBgYXBwbHlSZWRpcmVjdHNgIHdvdWxkIG5vdCBhc3NpZ25cbiAgICAvLyB0aGVtLiBXZSBzaG91bGQgYmUgYWJsZSB0byByZW1vdmUgdGhpcyBsb2dpYyBhcyBhIFwiYnJlYWtpbmcgY2hhbmdlXCIgYnV0IHNob3VsZCBkbyBzb21lIG1vcmVcbiAgICAvLyBpbnZlc3RpZ2F0aW9uIGludG8gdGhlIGZhaWx1cmVzIGZpcnN0LlxuICAgIGNvbnN0IHJvb3RTZWdtZW50R3JvdXAgPSBuZXcgVXJsU2VnbWVudEdyb3VwKHNwbGl0R3JvdXAuc2VnbWVudHMsIHNwbGl0R3JvdXAuY2hpbGRyZW4pO1xuXG4gICAgY29uc3QgZXhwYW5kZWQkID1cbiAgICAgICAgdGhpcy5leHBhbmRTZWdtZW50R3JvdXAodGhpcy5pbmplY3RvciwgdGhpcy5jb25maWcsIHJvb3RTZWdtZW50R3JvdXAsIFBSSU1BUllfT1VUTEVUKTtcbiAgICBjb25zdCB1cmxUcmVlcyQgPSBleHBhbmRlZCQucGlwZShtYXAoKHJvb3RTZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCkgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlVXJsVHJlZShcbiAgICAgICAgICBzcXVhc2hTZWdtZW50R3JvdXAocm9vdFNlZ21lbnRHcm91cCksIHRoaXMudXJsVHJlZS5xdWVyeVBhcmFtcywgdGhpcy51cmxUcmVlLmZyYWdtZW50KTtcbiAgICB9KSk7XG4gICAgcmV0dXJuIHVybFRyZWVzJC5waXBlKGNhdGNoRXJyb3IoKGU6IGFueSkgPT4ge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBBYnNvbHV0ZVJlZGlyZWN0KSB7XG4gICAgICAgIC8vIEFmdGVyIGFuIGFic29sdXRlIHJlZGlyZWN0IHdlIGRvIG5vdCBhcHBseSBhbnkgbW9yZSByZWRpcmVjdHMhXG4gICAgICAgIC8vIElmIHRoaXMgaW1wbGVtZW50YXRpb24gY2hhbmdlcywgdXBkYXRlIHRoZSBkb2N1bWVudGF0aW9uIG5vdGUgaW4gYHJlZGlyZWN0VG9gLlxuICAgICAgICB0aGlzLmFsbG93UmVkaXJlY3RzID0gZmFsc2U7XG4gICAgICAgIC8vIHdlIG5lZWQgdG8gcnVuIG1hdGNoaW5nLCBzbyB3ZSBjYW4gZmV0Y2ggYWxsIGxhenktbG9hZGVkIG1vZHVsZXNcbiAgICAgICAgcmV0dXJuIHRoaXMubWF0Y2goZS51cmxUcmVlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOb01hdGNoKSB7XG4gICAgICAgIHRocm93IHRoaXMubm9NYXRjaEVycm9yKGUpO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlO1xuICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgbWF0Y2godHJlZTogVXJsVHJlZSk6IE9ic2VydmFibGU8VXJsVHJlZT4ge1xuICAgIGNvbnN0IGV4cGFuZGVkJCA9XG4gICAgICAgIHRoaXMuZXhwYW5kU2VnbWVudEdyb3VwKHRoaXMuaW5qZWN0b3IsIHRoaXMuY29uZmlnLCB0cmVlLnJvb3QsIFBSSU1BUllfT1VUTEVUKTtcbiAgICBjb25zdCBtYXBwZWQkID0gZXhwYW5kZWQkLnBpcGUobWFwKChyb290U2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXApID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmNyZWF0ZVVybFRyZWUoXG4gICAgICAgICAgc3F1YXNoU2VnbWVudEdyb3VwKHJvb3RTZWdtZW50R3JvdXApLCB0cmVlLnF1ZXJ5UGFyYW1zLCB0cmVlLmZyYWdtZW50KTtcbiAgICB9KSk7XG4gICAgcmV0dXJuIG1hcHBlZCQucGlwZShjYXRjaEVycm9yKChlOiBhbnkpOiBPYnNlcnZhYmxlPFVybFRyZWU+ID0+IHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9NYXRjaCkge1xuICAgICAgICB0aHJvdyB0aGlzLm5vTWF0Y2hFcnJvcihlKTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgZTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIG5vTWF0Y2hFcnJvcihlOiBOb01hdGNoKTogYW55IHtcbiAgICByZXR1cm4gbmV3IEVycm9yKGBDYW5ub3QgbWF0Y2ggYW55IHJvdXRlcy4gVVJMIFNlZ21lbnQ6ICcke2Uuc2VnbWVudEdyb3VwfSdgKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlVXJsVHJlZShyb290Q2FuZGlkYXRlOiBVcmxTZWdtZW50R3JvdXAsIHF1ZXJ5UGFyYW1zOiBQYXJhbXMsIGZyYWdtZW50OiBzdHJpbmd8bnVsbCk6XG4gICAgICBVcmxUcmVlIHtcbiAgICBjb25zdCByb290ID0gcm9vdENhbmRpZGF0ZS5zZWdtZW50cy5sZW5ndGggPiAwID9cbiAgICAgICAgbmV3IFVybFNlZ21lbnRHcm91cChbXSwge1tQUklNQVJZX09VVExFVF06IHJvb3RDYW5kaWRhdGV9KSA6XG4gICAgICAgIHJvb3RDYW5kaWRhdGU7XG4gICAgcmV0dXJuIG5ldyBVcmxUcmVlKHJvb3QsIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFNlZ21lbnRHcm91cChcbiAgICAgIGluamVjdG9yOiBJbmplY3Rvciwgcm91dGVzOiBSb3V0ZVtdLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCxcbiAgICAgIG91dGxldDogc3RyaW5nKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgICBpZiAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiBzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kQ2hpbGRyZW4oaW5qZWN0b3IsIHJvdXRlcywgc2VnbWVudEdyb3VwKVxuICAgICAgICAgIC5waXBlKG1hcCgoY2hpbGRyZW46IGFueSkgPT4gbmV3IFVybFNlZ21lbnRHcm91cChbXSwgY2hpbGRyZW4pKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZXhwYW5kU2VnbWVudChpbmplY3Rvciwgc2VnbWVudEdyb3VwLCByb3V0ZXMsIHNlZ21lbnRHcm91cC5zZWdtZW50cywgb3V0bGV0LCB0cnVlKTtcbiAgfVxuXG4gIC8vIFJlY3Vyc2l2ZWx5IGV4cGFuZCBzZWdtZW50IGdyb3VwcyBmb3IgYWxsIHRoZSBjaGlsZCBvdXRsZXRzXG4gIHByaXZhdGUgZXhwYW5kQ2hpbGRyZW4oaW5qZWN0b3I6IEluamVjdG9yLCByb3V0ZXM6IFJvdXRlW10sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKTpcbiAgICAgIE9ic2VydmFibGU8e1tuYW1lOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9PiB7XG4gICAgLy8gRXhwYW5kIG91dGxldHMgb25lIGF0IGEgdGltZSwgc3RhcnRpbmcgd2l0aCB0aGUgcHJpbWFyeSBvdXRsZXQuIFdlIG5lZWQgdG8gZG8gaXQgdGhpcyB3YXlcbiAgICAvLyBiZWNhdXNlIGFuIGFic29sdXRlIHJlZGlyZWN0IGZyb20gdGhlIHByaW1hcnkgb3V0bGV0IHRha2VzIHByZWNlZGVuY2UuXG4gICAgY29uc3QgY2hpbGRPdXRsZXRzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgT2JqZWN0LmtleXMoc2VnbWVudEdyb3VwLmNoaWxkcmVuKSkge1xuICAgICAgaWYgKGNoaWxkID09PSAncHJpbWFyeScpIHtcbiAgICAgICAgY2hpbGRPdXRsZXRzLnVuc2hpZnQoY2hpbGQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hpbGRPdXRsZXRzLnB1c2goY2hpbGQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmcm9tKGNoaWxkT3V0bGV0cylcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICBjb25jYXRNYXAoY2hpbGRPdXRsZXQgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBjaGlsZCA9IHNlZ21lbnRHcm91cC5jaGlsZHJlbltjaGlsZE91dGxldF07XG4gICAgICAgICAgICAgIC8vIFNvcnQgdGhlIHJvdXRlcyBzbyByb3V0ZXMgd2l0aCBvdXRsZXRzIHRoYXQgbWF0Y2ggdGhlIHNlZ21lbnQgYXBwZWFyXG4gICAgICAgICAgICAgIC8vIGZpcnN0LCBmb2xsb3dlZCBieSByb3V0ZXMgZm9yIG90aGVyIG91dGxldHMsIHdoaWNoIG1pZ2h0IG1hdGNoIGlmIHRoZXkgaGF2ZSBhblxuICAgICAgICAgICAgICAvLyBlbXB0eSBwYXRoLlxuICAgICAgICAgICAgICBjb25zdCBzb3J0ZWRSb3V0ZXMgPSBzb3J0QnlNYXRjaGluZ091dGxldHMocm91dGVzLCBjaGlsZE91dGxldCk7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLmV4cGFuZFNlZ21lbnRHcm91cChpbmplY3Rvciwgc29ydGVkUm91dGVzLCBjaGlsZCwgY2hpbGRPdXRsZXQpXG4gICAgICAgICAgICAgICAgICAucGlwZShtYXAocyA9PiAoe3NlZ21lbnQ6IHMsIG91dGxldDogY2hpbGRPdXRsZXR9KSkpO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBzY2FuKFxuICAgICAgICAgICAgICAgIChjaGlsZHJlbiwgZXhwYW5kZWRDaGlsZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgY2hpbGRyZW5bZXhwYW5kZWRDaGlsZC5vdXRsZXRdID0gZXhwYW5kZWRDaGlsZC5zZWdtZW50O1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkcmVuO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge30gYXMge1tvdXRsZXQ6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0pLFxuICAgICAgICAgICAgbGFzdCgpLFxuICAgICAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBleHBhbmRTZWdtZW50KFxuICAgICAgaW5qZWN0b3I6IEluamVjdG9yLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGVzOiBSb3V0ZVtdLCBzZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgICAgb3V0bGV0OiBzdHJpbmcsIGFsbG93UmVkaXJlY3RzOiBib29sZWFuKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgICByZXR1cm4gZnJvbShyb3V0ZXMpLnBpcGUoXG4gICAgICAgIGNvbmNhdE1hcCgocjogYW55KSA9PiB7XG4gICAgICAgICAgY29uc3QgZXhwYW5kZWQkID0gdGhpcy5leHBhbmRTZWdtZW50QWdhaW5zdFJvdXRlKFxuICAgICAgICAgICAgICBpbmplY3Rvciwgc2VnbWVudEdyb3VwLCByb3V0ZXMsIHIsIHNlZ21lbnRzLCBvdXRsZXQsIGFsbG93UmVkaXJlY3RzKTtcbiAgICAgICAgICByZXR1cm4gZXhwYW5kZWQkLnBpcGUoY2F0Y2hFcnJvcigoZTogYW55KSA9PiB7XG4gICAgICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIE5vTWF0Y2gpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9mKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0pLFxuICAgICAgICBmaXJzdCgocyk6IHMgaXMgVXJsU2VnbWVudEdyb3VwID0+ICEhcyksIGNhdGNoRXJyb3IoKGU6IGFueSwgXzogYW55KSA9PiB7XG4gICAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBFbXB0eUVycm9yIHx8IGUubmFtZSA9PT0gJ0VtcHR5RXJyb3InKSB7XG4gICAgICAgICAgICBpZiAobm9MZWZ0b3ZlcnNJblVybChzZWdtZW50R3JvdXAsIHNlZ21lbnRzLCBvdXRsZXQpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvZihuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCB7fSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5vTWF0Y2goc2VnbWVudEdyb3VwKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBleHBhbmRTZWdtZW50QWdhaW5zdFJvdXRlKFxuICAgICAgaW5qZWN0b3I6IEluamVjdG9yLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGVzOiBSb3V0ZVtdLCByb3V0ZTogUm91dGUsXG4gICAgICBwYXRoczogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZywgYWxsb3dSZWRpcmVjdHM6IGJvb2xlYW4pOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIGlmICghaXNJbW1lZGlhdGVNYXRjaChyb3V0ZSwgc2VnbWVudEdyb3VwLCBwYXRocywgb3V0bGV0KSkge1xuICAgICAgcmV0dXJuIG5vTWF0Y2goc2VnbWVudEdyb3VwKTtcbiAgICB9XG5cbiAgICBpZiAocm91dGUucmVkaXJlY3RUbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXRjaFNlZ21lbnRBZ2FpbnN0Um91dGUoaW5qZWN0b3IsIHNlZ21lbnRHcm91cCwgcm91dGUsIHBhdGhzLCBvdXRsZXQpO1xuICAgIH1cblxuICAgIGlmIChhbGxvd1JlZGlyZWN0cyAmJiB0aGlzLmFsbG93UmVkaXJlY3RzKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRTZWdtZW50QWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgICAgICBpbmplY3Rvciwgc2VnbWVudEdyb3VwLCByb3V0ZXMsIHJvdXRlLCBwYXRocywgb3V0bGV0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm9NYXRjaChzZWdtZW50R3JvdXApO1xuICB9XG5cbiAgcHJpdmF0ZSBleHBhbmRTZWdtZW50QWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgIGluamVjdG9yOiBJbmplY3Rvciwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlczogUm91dGVbXSwgcm91dGU6IFJvdXRlLFxuICAgICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIGlmIChyb3V0ZS5wYXRoID09PSAnKionKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRXaWxkQ2FyZFdpdGhQYXJhbXNBZ2FpbnN0Um91dGVVc2luZ1JlZGlyZWN0KFxuICAgICAgICAgIGluamVjdG9yLCByb3V0ZXMsIHJvdXRlLCBvdXRsZXQpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmV4cGFuZFJlZ3VsYXJTZWdtZW50QWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgICAgaW5qZWN0b3IsIHNlZ21lbnRHcm91cCwgcm91dGVzLCByb3V0ZSwgc2VnbWVudHMsIG91dGxldCk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFdpbGRDYXJkV2l0aFBhcmFtc0FnYWluc3RSb3V0ZVVzaW5nUmVkaXJlY3QoXG4gICAgICBpbmplY3RvcjogSW5qZWN0b3IsIHJvdXRlczogUm91dGVbXSwgcm91dGU6IFJvdXRlLFxuICAgICAgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIGNvbnN0IG5ld1RyZWUgPSB0aGlzLmFwcGx5UmVkaXJlY3RDb21tYW5kcyhbXSwgcm91dGUucmVkaXJlY3RUbyEsIHt9KTtcbiAgICBpZiAocm91dGUucmVkaXJlY3RUbyEuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICByZXR1cm4gYWJzb2x1dGVSZWRpcmVjdChuZXdUcmVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5saW5lcmFsaXplU2VnbWVudHMocm91dGUsIG5ld1RyZWUpLnBpcGUobWVyZ2VNYXAoKG5ld1NlZ21lbnRzOiBVcmxTZWdtZW50W10pID0+IHtcbiAgICAgIGNvbnN0IGdyb3VwID0gbmV3IFVybFNlZ21lbnRHcm91cChuZXdTZWdtZW50cywge30pO1xuICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kU2VnbWVudChpbmplY3RvciwgZ3JvdXAsIHJvdXRlcywgbmV3U2VnbWVudHMsIG91dGxldCwgZmFsc2UpO1xuICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgZXhwYW5kUmVndWxhclNlZ21lbnRBZ2FpbnN0Um91dGVVc2luZ1JlZGlyZWN0KFxuICAgICAgaW5qZWN0b3I6IEluamVjdG9yLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGVzOiBSb3V0ZVtdLCByb3V0ZTogUm91dGUsXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPiB7XG4gICAgY29uc3Qge21hdGNoZWQsIGNvbnN1bWVkU2VnbWVudHMsIHJlbWFpbmluZ1NlZ21lbnRzLCBwb3NpdGlvbmFsUGFyYW1TZWdtZW50c30gPVxuICAgICAgICBtYXRjaChzZWdtZW50R3JvdXAsIHJvdXRlLCBzZWdtZW50cyk7XG4gICAgaWYgKCFtYXRjaGVkKSByZXR1cm4gbm9NYXRjaChzZWdtZW50R3JvdXApO1xuXG4gICAgY29uc3QgbmV3VHJlZSA9XG4gICAgICAgIHRoaXMuYXBwbHlSZWRpcmVjdENvbW1hbmRzKGNvbnN1bWVkU2VnbWVudHMsIHJvdXRlLnJlZGlyZWN0VG8hLCBwb3NpdGlvbmFsUGFyYW1TZWdtZW50cyk7XG4gICAgaWYgKHJvdXRlLnJlZGlyZWN0VG8hLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgcmV0dXJuIGFic29sdXRlUmVkaXJlY3QobmV3VHJlZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubGluZXJhbGl6ZVNlZ21lbnRzKHJvdXRlLCBuZXdUcmVlKS5waXBlKG1lcmdlTWFwKChuZXdTZWdtZW50czogVXJsU2VnbWVudFtdKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRTZWdtZW50KFxuICAgICAgICAgIGluamVjdG9yLCBzZWdtZW50R3JvdXAsIHJvdXRlcywgbmV3U2VnbWVudHMuY29uY2F0KHJlbWFpbmluZ1NlZ21lbnRzKSwgb3V0bGV0LCBmYWxzZSk7XG4gICAgfSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBtYXRjaFNlZ21lbnRBZ2FpbnN0Um91dGUoXG4gICAgICBpbmplY3RvcjogSW5qZWN0b3IsIHJhd1NlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgICBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPiB7XG4gICAgaWYgKHJvdXRlLnBhdGggPT09ICcqKicpIHtcbiAgICAgIGlmIChyb3V0ZS5sb2FkQ2hpbGRyZW4pIHtcbiAgICAgICAgY29uc3QgbG9hZGVkJCA9IHJvdXRlLl9sb2FkZWRSb3V0ZXMgP1xuICAgICAgICAgICAgb2Yoe3JvdXRlczogcm91dGUuX2xvYWRlZFJvdXRlcywgaW5qZWN0b3I6IHJvdXRlLl9sb2FkZWRJbmplY3Rvcn0pIDpcbiAgICAgICAgICAgIHRoaXMuY29uZmlnTG9hZGVyLmxvYWQoaW5qZWN0b3IsIHJvdXRlKTtcbiAgICAgICAgcmV0dXJuIGxvYWRlZCQucGlwZShtYXAoKGNmZzogTG9hZGVkUm91dGVyQ29uZmlnKSA9PiB7XG4gICAgICAgICAgcm91dGUuX2xvYWRlZFJvdXRlcyA9IGNmZy5yb3V0ZXM7XG4gICAgICAgICAgcm91dGUuX2xvYWRlZEluamVjdG9yID0gY2ZnLmluamVjdG9yO1xuICAgICAgICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRzLCB7fSk7XG4gICAgICAgIH0pKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9mKG5ldyBVcmxTZWdtZW50R3JvdXAoc2VnbWVudHMsIHt9KSk7XG4gICAgfVxuXG4gICAgY29uc3Qge21hdGNoZWQsIGNvbnN1bWVkU2VnbWVudHMsIHJlbWFpbmluZ1NlZ21lbnRzfSA9IG1hdGNoKHJhd1NlZ21lbnRHcm91cCwgcm91dGUsIHNlZ21lbnRzKTtcbiAgICBpZiAoIW1hdGNoZWQpIHJldHVybiBub01hdGNoKHJhd1NlZ21lbnRHcm91cCk7XG5cbiAgICBjb25zdCBjaGlsZENvbmZpZyQgPSB0aGlzLmdldENoaWxkQ29uZmlnKGluamVjdG9yLCByb3V0ZSwgc2VnbWVudHMpO1xuXG4gICAgcmV0dXJuIGNoaWxkQ29uZmlnJC5waXBlKG1lcmdlTWFwKChyb3V0ZXJDb25maWc6IExvYWRlZFJvdXRlckNvbmZpZykgPT4ge1xuICAgICAgY29uc3QgY2hpbGRJbmplY3RvciA9IHJvdXRlckNvbmZpZy5pbmplY3RvciA/PyBpbmplY3RvcjtcbiAgICAgIGNvbnN0IGNoaWxkQ29uZmlnID0gcm91dGVyQ29uZmlnLnJvdXRlcztcblxuICAgICAgY29uc3Qge3NlZ21lbnRHcm91cDogc3BsaXRTZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzfSA9XG4gICAgICAgICAgc3BsaXQocmF3U2VnbWVudEdyb3VwLCBjb25zdW1lZFNlZ21lbnRzLCByZW1haW5pbmdTZWdtZW50cywgY2hpbGRDb25maWcpO1xuICAgICAgLy8gU2VlIGNvbW1lbnQgb24gdGhlIG90aGVyIGNhbGwgdG8gYHNwbGl0YCBhYm91dCB3aHkgdGhpcyBpcyBuZWNlc3NhcnkuXG4gICAgICBjb25zdCBzZWdtZW50R3JvdXAgPVxuICAgICAgICAgIG5ldyBVcmxTZWdtZW50R3JvdXAoc3BsaXRTZWdtZW50R3JvdXAuc2VnbWVudHMsIHNwbGl0U2VnbWVudEdyb3VwLmNoaWxkcmVuKTtcblxuICAgICAgaWYgKHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiBzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgICBjb25zdCBleHBhbmRlZCQgPSB0aGlzLmV4cGFuZENoaWxkcmVuKGNoaWxkSW5qZWN0b3IsIGNoaWxkQ29uZmlnLCBzZWdtZW50R3JvdXApO1xuICAgICAgICByZXR1cm4gZXhwYW5kZWQkLnBpcGUoXG4gICAgICAgICAgICBtYXAoKGNoaWxkcmVuOiBhbnkpID0+IG5ldyBVcmxTZWdtZW50R3JvdXAoY29uc3VtZWRTZWdtZW50cywgY2hpbGRyZW4pKSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjaGlsZENvbmZpZy5sZW5ndGggPT09IDAgJiYgc2xpY2VkU2VnbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvZihuZXcgVXJsU2VnbWVudEdyb3VwKGNvbnN1bWVkU2VnbWVudHMsIHt9KSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG1hdGNoZWRPbk91dGxldCA9IGdldE91dGxldChyb3V0ZSkgPT09IG91dGxldDtcbiAgICAgIGNvbnN0IGV4cGFuZGVkJCA9IHRoaXMuZXhwYW5kU2VnbWVudChcbiAgICAgICAgICBjaGlsZEluamVjdG9yLCBzZWdtZW50R3JvdXAsIGNoaWxkQ29uZmlnLCBzbGljZWRTZWdtZW50cyxcbiAgICAgICAgICBtYXRjaGVkT25PdXRsZXQgPyBQUklNQVJZX09VVExFVCA6IG91dGxldCwgdHJ1ZSk7XG4gICAgICByZXR1cm4gZXhwYW5kZWQkLnBpcGUoXG4gICAgICAgICAgbWFwKChjczogVXJsU2VnbWVudEdyb3VwKSA9PlxuICAgICAgICAgICAgICAgICAgbmV3IFVybFNlZ21lbnRHcm91cChjb25zdW1lZFNlZ21lbnRzLmNvbmNhdChjcy5zZWdtZW50cyksIGNzLmNoaWxkcmVuKSkpO1xuICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q2hpbGRDb25maWcoaW5qZWN0b3I6IEluamVjdG9yLCByb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pOlxuICAgICAgT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWc+IHtcbiAgICBpZiAocm91dGUuY2hpbGRyZW4pIHtcbiAgICAgIC8vIFRoZSBjaGlsZHJlbiBiZWxvbmcgdG8gdGhlIHNhbWUgbW9kdWxlXG4gICAgICByZXR1cm4gb2Yoe3JvdXRlczogcm91dGUuY2hpbGRyZW4sIGluamVjdG9yfSk7XG4gICAgfVxuXG4gICAgaWYgKHJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgICAgLy8gbGF6eSBjaGlsZHJlbiBiZWxvbmcgdG8gdGhlIGxvYWRlZCBtb2R1bGVcbiAgICAgIGlmIChyb3V0ZS5fbG9hZGVkUm91dGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIG9mKHtyb3V0ZXM6IHJvdXRlLl9sb2FkZWRSb3V0ZXMsIGluamVjdG9yOiByb3V0ZS5fbG9hZGVkSW5qZWN0b3J9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMucnVuQ2FuTG9hZEd1YXJkcyhpbmplY3Rvciwgcm91dGUsIHNlZ21lbnRzKVxuICAgICAgICAgIC5waXBlKG1lcmdlTWFwKChzaG91bGRMb2FkUmVzdWx0OiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgICBpZiAoc2hvdWxkTG9hZFJlc3VsdCkge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25maWdMb2FkZXIubG9hZChpbmplY3Rvciwgcm91dGUpLnBpcGUobWFwKChjZmc6IExvYWRlZFJvdXRlckNvbmZpZykgPT4ge1xuICAgICAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRSb3V0ZXMgPSBjZmcucm91dGVzO1xuICAgICAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRJbmplY3RvciA9IGNmZy5pbmplY3RvcjtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2ZnO1xuICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY2FuTG9hZEZhaWxzKHJvdXRlKTtcbiAgICAgICAgICB9KSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9mKHtyb3V0ZXM6IFtdLCBpbmplY3Rvcn0pO1xuICB9XG5cbiAgcHJpdmF0ZSBydW5DYW5Mb2FkR3VhcmRzKGluamVjdG9yOiBJbmplY3Rvciwgcm91dGU6IFJvdXRlLCBzZWdtZW50czogVXJsU2VnbWVudFtdKTpcbiAgICAgIE9ic2VydmFibGU8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IGNhbkxvYWQgPSByb3V0ZS5jYW5Mb2FkO1xuICAgIGlmICghY2FuTG9hZCB8fCBjYW5Mb2FkLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG9mKHRydWUpO1xuXG4gICAgY29uc3QgY2FuTG9hZE9ic2VydmFibGVzID0gY2FuTG9hZC5tYXAoKGluamVjdGlvblRva2VuOiBhbnkpID0+IHtcbiAgICAgIGNvbnN0IGd1YXJkID0gaW5qZWN0b3IuZ2V0KGluamVjdGlvblRva2VuKTtcbiAgICAgIGxldCBndWFyZFZhbDtcbiAgICAgIGlmIChpc0NhbkxvYWQoZ3VhcmQpKSB7XG4gICAgICAgIGd1YXJkVmFsID0gZ3VhcmQuY2FuTG9hZChyb3V0ZSwgc2VnbWVudHMpO1xuICAgICAgfSBlbHNlIGlmIChpc0Z1bmN0aW9uPENhbkxvYWRGbj4oZ3VhcmQpKSB7XG4gICAgICAgIGd1YXJkVmFsID0gZ3VhcmQocm91dGUsIHNlZ21lbnRzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBDYW5Mb2FkIGd1YXJkJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gd3JhcEludG9PYnNlcnZhYmxlKGd1YXJkVmFsKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBvZihjYW5Mb2FkT2JzZXJ2YWJsZXMpXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgICAgcHJpb3JpdGl6ZWRHdWFyZFZhbHVlKCksXG4gICAgICAgICAgICB0YXAoKHJlc3VsdDogVXJsVHJlZXxib29sZWFuKSA9PiB7XG4gICAgICAgICAgICAgIGlmICghaXNVcmxUcmVlKHJlc3VsdCkpIHJldHVybjtcblxuICAgICAgICAgICAgICBjb25zdCBlcnJvcjogRXJyb3Ime3VybD86IFVybFRyZWV9ID0gbmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yKFxuICAgICAgICAgICAgICAgICAgYFJlZGlyZWN0aW5nIHRvIFwiJHt0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHJlc3VsdCl9XCJgKTtcbiAgICAgICAgICAgICAgZXJyb3IudXJsID0gcmVzdWx0O1xuICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgbWFwKHJlc3VsdCA9PiByZXN1bHQgPT09IHRydWUpLFxuICAgICAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBsaW5lcmFsaXplU2VnbWVudHMocm91dGU6IFJvdXRlLCB1cmxUcmVlOiBVcmxUcmVlKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50W10+IHtcbiAgICBsZXQgcmVzOiBVcmxTZWdtZW50W10gPSBbXTtcbiAgICBsZXQgYyA9IHVybFRyZWUucm9vdDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgcmVzID0gcmVzLmNvbmNhdChjLnNlZ21lbnRzKTtcbiAgICAgIGlmIChjLm51bWJlck9mQ2hpbGRyZW4gPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9mKHJlcyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjLm51bWJlck9mQ2hpbGRyZW4gPiAxIHx8ICFjLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSkge1xuICAgICAgICByZXR1cm4gbmFtZWRPdXRsZXRzUmVkaXJlY3Qocm91dGUucmVkaXJlY3RUbyEpO1xuICAgICAgfVxuXG4gICAgICBjID0gYy5jaGlsZHJlbltQUklNQVJZX09VVExFVF07XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhcHBseVJlZGlyZWN0Q29tbWFuZHMoXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCByZWRpcmVjdFRvOiBzdHJpbmcsIHBvc1BhcmFtczoge1trOiBzdHJpbmddOiBVcmxTZWdtZW50fSk6IFVybFRyZWUge1xuICAgIHJldHVybiB0aGlzLmFwcGx5UmVkaXJlY3RDcmVhdHJlVXJsVHJlZShcbiAgICAgICAgcmVkaXJlY3RUbywgdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKHJlZGlyZWN0VG8pLCBzZWdtZW50cywgcG9zUGFyYW1zKTtcbiAgfVxuXG4gIHByaXZhdGUgYXBwbHlSZWRpcmVjdENyZWF0cmVVcmxUcmVlKFxuICAgICAgcmVkaXJlY3RUbzogc3RyaW5nLCB1cmxUcmVlOiBVcmxUcmVlLCBzZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgICAgcG9zUGFyYW1zOiB7W2s6IHN0cmluZ106IFVybFNlZ21lbnR9KTogVXJsVHJlZSB7XG4gICAgY29uc3QgbmV3Um9vdCA9IHRoaXMuY3JlYXRlU2VnbWVudEdyb3VwKHJlZGlyZWN0VG8sIHVybFRyZWUucm9vdCwgc2VnbWVudHMsIHBvc1BhcmFtcyk7XG4gICAgcmV0dXJuIG5ldyBVcmxUcmVlKFxuICAgICAgICBuZXdSb290LCB0aGlzLmNyZWF0ZVF1ZXJ5UGFyYW1zKHVybFRyZWUucXVlcnlQYXJhbXMsIHRoaXMudXJsVHJlZS5xdWVyeVBhcmFtcyksXG4gICAgICAgIHVybFRyZWUuZnJhZ21lbnQpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVRdWVyeVBhcmFtcyhyZWRpcmVjdFRvUGFyYW1zOiBQYXJhbXMsIGFjdHVhbFBhcmFtczogUGFyYW1zKTogUGFyYW1zIHtcbiAgICBjb25zdCByZXM6IFBhcmFtcyA9IHt9O1xuICAgIGZvckVhY2gocmVkaXJlY3RUb1BhcmFtcywgKHY6IGFueSwgazogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCBjb3B5U291cmNlVmFsdWUgPSB0eXBlb2YgdiA9PT0gJ3N0cmluZycgJiYgdi5zdGFydHNXaXRoKCc6Jyk7XG4gICAgICBpZiAoY29weVNvdXJjZVZhbHVlKSB7XG4gICAgICAgIGNvbnN0IHNvdXJjZU5hbWUgPSB2LnN1YnN0cmluZygxKTtcbiAgICAgICAgcmVzW2tdID0gYWN0dWFsUGFyYW1zW3NvdXJjZU5hbWVdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzW2tdID0gdjtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVTZWdtZW50R3JvdXAoXG4gICAgICByZWRpcmVjdFRvOiBzdHJpbmcsIGdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgICBwb3NQYXJhbXM6IHtbazogc3RyaW5nXTogVXJsU2VnbWVudH0pOiBVcmxTZWdtZW50R3JvdXAge1xuICAgIGNvbnN0IHVwZGF0ZWRTZWdtZW50cyA9IHRoaXMuY3JlYXRlU2VnbWVudHMocmVkaXJlY3RUbywgZ3JvdXAuc2VnbWVudHMsIHNlZ21lbnRzLCBwb3NQYXJhbXMpO1xuXG4gICAgbGV0IGNoaWxkcmVuOiB7W246IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0gPSB7fTtcbiAgICBmb3JFYWNoKGdyb3VwLmNoaWxkcmVuLCAoY2hpbGQ6IFVybFNlZ21lbnRHcm91cCwgbmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICBjaGlsZHJlbltuYW1lXSA9IHRoaXMuY3JlYXRlU2VnbWVudEdyb3VwKHJlZGlyZWN0VG8sIGNoaWxkLCBzZWdtZW50cywgcG9zUGFyYW1zKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHVwZGF0ZWRTZWdtZW50cywgY2hpbGRyZW4pO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVTZWdtZW50cyhcbiAgICAgIHJlZGlyZWN0VG86IHN0cmluZywgcmVkaXJlY3RUb1NlZ21lbnRzOiBVcmxTZWdtZW50W10sIGFjdHVhbFNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgICBwb3NQYXJhbXM6IHtbazogc3RyaW5nXTogVXJsU2VnbWVudH0pOiBVcmxTZWdtZW50W10ge1xuICAgIHJldHVybiByZWRpcmVjdFRvU2VnbWVudHMubWFwKFxuICAgICAgICBzID0+IHMucGF0aC5zdGFydHNXaXRoKCc6JykgPyB0aGlzLmZpbmRQb3NQYXJhbShyZWRpcmVjdFRvLCBzLCBwb3NQYXJhbXMpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5maW5kT3JSZXR1cm4ocywgYWN0dWFsU2VnbWVudHMpKTtcbiAgfVxuXG4gIHByaXZhdGUgZmluZFBvc1BhcmFtKFxuICAgICAgcmVkaXJlY3RUbzogc3RyaW5nLCByZWRpcmVjdFRvVXJsU2VnbWVudDogVXJsU2VnbWVudCxcbiAgICAgIHBvc1BhcmFtczoge1trOiBzdHJpbmddOiBVcmxTZWdtZW50fSk6IFVybFNlZ21lbnQge1xuICAgIGNvbnN0IHBvcyA9IHBvc1BhcmFtc1tyZWRpcmVjdFRvVXJsU2VnbWVudC5wYXRoLnN1YnN0cmluZygxKV07XG4gICAgaWYgKCFwb3MpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYENhbm5vdCByZWRpcmVjdCB0byAnJHtyZWRpcmVjdFRvfScuIENhbm5vdCBmaW5kICcke3JlZGlyZWN0VG9VcmxTZWdtZW50LnBhdGh9Jy5gKTtcbiAgICByZXR1cm4gcG9zO1xuICB9XG5cbiAgcHJpdmF0ZSBmaW5kT3JSZXR1cm4ocmVkaXJlY3RUb1VybFNlZ21lbnQ6IFVybFNlZ21lbnQsIGFjdHVhbFNlZ21lbnRzOiBVcmxTZWdtZW50W10pOiBVcmxTZWdtZW50IHtcbiAgICBsZXQgaWR4ID0gMDtcbiAgICBmb3IgKGNvbnN0IHMgb2YgYWN0dWFsU2VnbWVudHMpIHtcbiAgICAgIGlmIChzLnBhdGggPT09IHJlZGlyZWN0VG9VcmxTZWdtZW50LnBhdGgpIHtcbiAgICAgICAgYWN0dWFsU2VnbWVudHMuc3BsaWNlKGlkeCk7XG4gICAgICAgIHJldHVybiBzO1xuICAgICAgfVxuICAgICAgaWR4Kys7XG4gICAgfVxuICAgIHJldHVybiByZWRpcmVjdFRvVXJsU2VnbWVudDtcbiAgfVxufVxuXG4vKipcbiAqIFdoZW4gcG9zc2libGUsIG1lcmdlcyB0aGUgcHJpbWFyeSBvdXRsZXQgY2hpbGQgaW50byB0aGUgcGFyZW50IGBVcmxTZWdtZW50R3JvdXBgLlxuICpcbiAqIFdoZW4gYSBzZWdtZW50IGdyb3VwIGhhcyBvbmx5IG9uZSBjaGlsZCB3aGljaCBpcyBhIHByaW1hcnkgb3V0bGV0LCBtZXJnZXMgdGhhdCBjaGlsZCBpbnRvIHRoZVxuICogcGFyZW50LiBUaGF0IGlzLCB0aGUgY2hpbGQgc2VnbWVudCBncm91cCdzIHNlZ21lbnRzIGFyZSBtZXJnZWQgaW50byB0aGUgYHNgIGFuZCB0aGUgY2hpbGQnc1xuICogY2hpbGRyZW4gYmVjb21lIHRoZSBjaGlsZHJlbiBvZiBgc2AuIFRoaW5rIG9mIHRoaXMgbGlrZSBhICdzcXVhc2gnLCBtZXJnaW5nIHRoZSBjaGlsZCBzZWdtZW50XG4gKiBncm91cCBpbnRvIHRoZSBwYXJlbnQuXG4gKi9cbmZ1bmN0aW9uIG1lcmdlVHJpdmlhbENoaWxkcmVuKHM6IFVybFNlZ21lbnRHcm91cCk6IFVybFNlZ21lbnRHcm91cCB7XG4gIGlmIChzLm51bWJlck9mQ2hpbGRyZW4gPT09IDEgJiYgcy5jaGlsZHJlbltQUklNQVJZX09VVExFVF0pIHtcbiAgICBjb25zdCBjID0gcy5jaGlsZHJlbltQUklNQVJZX09VVExFVF07XG4gICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAocy5zZWdtZW50cy5jb25jYXQoYy5zZWdtZW50cyksIGMuY2hpbGRyZW4pO1xuICB9XG5cbiAgcmV0dXJuIHM7XG59XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgbWVyZ2VzIHByaW1hcnkgc2VnbWVudCBjaGlsZHJlbiBpbnRvIHRoZWlyIHBhcmVudHMgYW5kIGFsc28gZHJvcHMgZW1wdHkgY2hpbGRyZW5cbiAqICh0aG9zZSB3aGljaCBoYXZlIG5vIHNlZ21lbnRzIGFuZCBubyBjaGlsZHJlbiB0aGVtc2VsdmVzKS4gVGhlIGxhdHRlciBwcmV2ZW50cyBzZXJpYWxpemluZyBhXG4gKiBncm91cCBpbnRvIHNvbWV0aGluZyBsaWtlIGAvYShhdXg6KWAsIHdoZXJlIGBhdXhgIGlzIGFuIGVtcHR5IGNoaWxkIHNlZ21lbnQuXG4gKi9cbmZ1bmN0aW9uIHNxdWFzaFNlZ21lbnRHcm91cChzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6IFVybFNlZ21lbnRHcm91cCB7XG4gIGNvbnN0IG5ld0NoaWxkcmVuID0ge30gYXMgYW55O1xuICBmb3IgKGNvbnN0IGNoaWxkT3V0bGV0IG9mIE9iamVjdC5rZXlzKHNlZ21lbnRHcm91cC5jaGlsZHJlbikpIHtcbiAgICBjb25zdCBjaGlsZCA9IHNlZ21lbnRHcm91cC5jaGlsZHJlbltjaGlsZE91dGxldF07XG4gICAgY29uc3QgY2hpbGRDYW5kaWRhdGUgPSBzcXVhc2hTZWdtZW50R3JvdXAoY2hpbGQpO1xuICAgIC8vIGRvbid0IGFkZCBlbXB0eSBjaGlsZHJlblxuICAgIGlmIChjaGlsZENhbmRpZGF0ZS5zZWdtZW50cy5sZW5ndGggPiAwIHx8IGNoaWxkQ2FuZGlkYXRlLmhhc0NoaWxkcmVuKCkpIHtcbiAgICAgIG5ld0NoaWxkcmVuW2NoaWxkT3V0bGV0XSA9IGNoaWxkQ2FuZGlkYXRlO1xuICAgIH1cbiAgfVxuICBjb25zdCBzID0gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuc2VnbWVudHMsIG5ld0NoaWxkcmVuKTtcbiAgcmV0dXJuIG1lcmdlVHJpdmlhbENoaWxkcmVuKHMpO1xufVxuIl19