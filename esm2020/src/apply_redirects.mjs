/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EmptyError, from, of, throwError } from 'rxjs';
import { catchError, concatMap, first, last, map, mergeMap, scan, switchMap, tap } from 'rxjs/operators';
import { runCanLoadGuards } from './operators/check_guards';
import { navigationCancelingError, PRIMARY_OUTLET } from './shared';
import { createRoot, squashSegmentGroup, UrlSegmentGroup, UrlTree } from './url_tree';
import { forEach } from './utils/collection';
import { getOrCreateRouteInjectorIfNeeded, getOutlet, sortByMatchingOutlets } from './utils/config';
import { isImmediateMatch, match, matchWithChecks, noLeftoversInUrl, split } from './utils/config_matching';
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
        const root = createRoot(rootCandidate);
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
        return from(routes).pipe(concatMap(r => {
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
            // Only create the Route's `EnvironmentInjector` if it matches the attempted navigation
            injector = getOrCreateRouteInjectorIfNeeded(route, injector);
            if (route.loadChildren) {
                const loaded$ = route._loadedRoutes ?
                    of({ routes: route._loadedRoutes, injector: route._loadedInjector }) :
                    this.configLoader.loadChildren(injector, route);
                return loaded$.pipe(map((cfg) => {
                    route._loadedRoutes = cfg.routes;
                    route._loadedInjector = cfg.injector;
                    return new UrlSegmentGroup(segments, {});
                }));
            }
            return of(new UrlSegmentGroup(segments, {}));
        }
        return matchWithChecks(rawSegmentGroup, route, segments, injector, this.urlSerializer)
            .pipe(switchMap(({ matched, consumedSegments, remainingSegments }) => {
            if (!matched)
                return noMatch(rawSegmentGroup);
            // Only create the Route's `EnvironmentInjector` if it matches the attempted
            // navigation
            injector = getOrCreateRouteInjectorIfNeeded(route, injector);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHlfcmVkaXJlY3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9hcHBseV9yZWRpcmVjdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUFDLFVBQVUsRUFBRSxJQUFJLEVBQWMsRUFBRSxFQUFFLFVBQVUsRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUNsRSxPQUFPLEVBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUd2RyxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUUxRCxPQUFPLEVBQUMsd0JBQXdCLEVBQVUsY0FBYyxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzFFLE9BQU8sRUFBQyxVQUFVLEVBQUUsa0JBQWtCLEVBQWMsZUFBZSxFQUFpQixPQUFPLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDL0csT0FBTyxFQUFDLE9BQU8sRUFBcUIsTUFBTSxvQkFBb0IsQ0FBQztBQUMvRCxPQUFPLEVBQUMsZ0NBQWdDLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDbEcsT0FBTyxFQUFDLGdCQUFnQixFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFFMUcsTUFBTSxPQUFPO0lBR1gsWUFBWSxZQUE4QjtRQUN4QyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksSUFBSSxJQUFJLENBQUM7SUFDM0MsQ0FBQztDQUNGO0FBRUQsTUFBTSxnQkFBZ0I7SUFDcEIsWUFBbUIsT0FBZ0I7UUFBaEIsWUFBTyxHQUFQLE9BQU8sQ0FBUztJQUFHLENBQUM7Q0FDeEM7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QWMsRUFBRTtZQUM5QixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssb0JBQW9CLENBQUMsSUFBSSxFQUFFO2dCQUN4QyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMzQixPQUFPLENBQUMsQ0FBQzthQUNWO1lBQ0QsR0FBRyxFQUFFLENBQUM7U0FDUDtRQUNELE9BQU8sb0JBQW9CLENBQUM7SUFDOUIsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RW52aXJvbm1lbnRJbmplY3Rvcn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0VtcHR5RXJyb3IsIGZyb20sIE9ic2VydmFibGUsIG9mLCB0aHJvd0Vycm9yfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y2F0Y2hFcnJvciwgY29uY2F0TWFwLCBmaXJzdCwgbGFzdCwgbWFwLCBtZXJnZU1hcCwgc2Nhbiwgc3dpdGNoTWFwLCB0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtMb2FkZWRSb3V0ZXJDb25maWcsIFJvdXRlLCBSb3V0ZXN9IGZyb20gJy4vbW9kZWxzJztcbmltcG9ydCB7cnVuQ2FuTG9hZEd1YXJkc30gZnJvbSAnLi9vcGVyYXRvcnMvY2hlY2tfZ3VhcmRzJztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7bmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yLCBQYXJhbXMsIFBSSU1BUllfT1VUTEVUfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge2NyZWF0ZVJvb3QsIHNxdWFzaFNlZ21lbnRHcm91cCwgVXJsU2VnbWVudCwgVXJsU2VnbWVudEdyb3VwLCBVcmxTZXJpYWxpemVyLCBVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcbmltcG9ydCB7Zm9yRWFjaCwgd3JhcEludG9PYnNlcnZhYmxlfSBmcm9tICcuL3V0aWxzL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtnZXRPckNyZWF0ZVJvdXRlSW5qZWN0b3JJZk5lZWRlZCwgZ2V0T3V0bGV0LCBzb3J0QnlNYXRjaGluZ091dGxldHN9IGZyb20gJy4vdXRpbHMvY29uZmlnJztcbmltcG9ydCB7aXNJbW1lZGlhdGVNYXRjaCwgbWF0Y2gsIG1hdGNoV2l0aENoZWNrcywgbm9MZWZ0b3ZlcnNJblVybCwgc3BsaXR9IGZyb20gJy4vdXRpbHMvY29uZmlnX21hdGNoaW5nJztcblxuY2xhc3MgTm9NYXRjaCB7XG4gIHB1YmxpYyBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cHxudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHNlZ21lbnRHcm91cD86IFVybFNlZ21lbnRHcm91cCkge1xuICAgIHRoaXMuc2VnbWVudEdyb3VwID0gc2VnbWVudEdyb3VwIHx8IG51bGw7XG4gIH1cbn1cblxuY2xhc3MgQWJzb2x1dGVSZWRpcmVjdCB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyB1cmxUcmVlOiBVcmxUcmVlKSB7fVxufVxuXG5mdW5jdGlvbiBub01hdGNoKHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgcmV0dXJuIHRocm93RXJyb3IobmV3IE5vTWF0Y2goc2VnbWVudEdyb3VwKSk7XG59XG5cbmZ1bmN0aW9uIGFic29sdXRlUmVkaXJlY3QobmV3VHJlZTogVXJsVHJlZSk6IE9ic2VydmFibGU8YW55PiB7XG4gIHJldHVybiB0aHJvd0Vycm9yKG5ldyBBYnNvbHV0ZVJlZGlyZWN0KG5ld1RyZWUpKTtcbn1cblxuZnVuY3Rpb24gbmFtZWRPdXRsZXRzUmVkaXJlY3QocmVkaXJlY3RUbzogc3RyaW5nKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgcmV0dXJuIHRocm93RXJyb3IoXG4gICAgICBuZXcgRXJyb3IoYE9ubHkgYWJzb2x1dGUgcmVkaXJlY3RzIGNhbiBoYXZlIG5hbWVkIG91dGxldHMuIHJlZGlyZWN0VG86ICcke3JlZGlyZWN0VG99J2ApKTtcbn1cblxuZnVuY3Rpb24gY2FuTG9hZEZhaWxzKHJvdXRlOiBSb3V0ZSk6IE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPiB7XG4gIHJldHVybiB0aHJvd0Vycm9yKFxuICAgICAgbmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yKGBDYW5ub3QgbG9hZCBjaGlsZHJlbiBiZWNhdXNlIHRoZSBndWFyZCBvZiB0aGUgcm91dGUgXCJwYXRoOiAnJHtcbiAgICAgICAgICByb3V0ZS5wYXRofSdcIiByZXR1cm5lZCBmYWxzZWApKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBgVXJsVHJlZWAgd2l0aCB0aGUgcmVkaXJlY3Rpb24gYXBwbGllZC5cbiAqXG4gKiBMYXp5IG1vZHVsZXMgYXJlIGxvYWRlZCBhbG9uZyB0aGUgd2F5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlSZWRpcmVjdHMoXG4gICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIGNvbmZpZ0xvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyLCB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICAgIHVybFRyZWU6IFVybFRyZWUsIGNvbmZpZzogUm91dGVzKTogT2JzZXJ2YWJsZTxVcmxUcmVlPiB7XG4gIHJldHVybiBuZXcgQXBwbHlSZWRpcmVjdHMoaW5qZWN0b3IsIGNvbmZpZ0xvYWRlciwgdXJsU2VyaWFsaXplciwgdXJsVHJlZSwgY29uZmlnKS5hcHBseSgpO1xufVxuXG5jbGFzcyBBcHBseVJlZGlyZWN0cyB7XG4gIHByaXZhdGUgYWxsb3dSZWRpcmVjdHM6IGJvb2xlYW4gPSB0cnVlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvciwgcHJpdmF0ZSBjb25maWdMb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcixcbiAgICAgIHByaXZhdGUgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgcHJpdmF0ZSB1cmxUcmVlOiBVcmxUcmVlLCBwcml2YXRlIGNvbmZpZzogUm91dGVzKSB7fVxuXG4gIGFwcGx5KCk6IE9ic2VydmFibGU8VXJsVHJlZT4ge1xuICAgIGNvbnN0IHNwbGl0R3JvdXAgPSBzcGxpdCh0aGlzLnVybFRyZWUucm9vdCwgW10sIFtdLCB0aGlzLmNvbmZpZykuc2VnbWVudEdyb3VwO1xuICAgIC8vIFRPRE8oYXRzY290dCk6IGNyZWF0aW5nIGEgbmV3IHNlZ21lbnQgcmVtb3ZlcyB0aGUgX3NvdXJjZVNlZ21lbnQgX3NlZ21lbnRJbmRleFNoaWZ0LCB3aGljaCBpc1xuICAgIC8vIG9ubHkgbmVjZXNzYXJ5IHRvIHByZXZlbnQgZmFpbHVyZXMgaW4gdGVzdHMgd2hpY2ggYXNzZXJ0IGV4YWN0IG9iamVjdCBtYXRjaGVzLiBUaGUgYHNwbGl0YCBpc1xuICAgIC8vIG5vdyBzaGFyZWQgYmV0d2VlbiBgYXBwbHlSZWRpcmVjdHNgIGFuZCBgcmVjb2duaXplYCBidXQgb25seSB0aGUgYHJlY29nbml6ZWAgc3RlcCBuZWVkcyB0aGVzZVxuICAgIC8vIHByb3BlcnRpZXMuIEJlZm9yZSB0aGUgaW1wbGVtZW50YXRpb25zIHdlcmUgbWVyZ2VkLCB0aGUgYGFwcGx5UmVkaXJlY3RzYCB3b3VsZCBub3QgYXNzaWduXG4gICAgLy8gdGhlbS4gV2Ugc2hvdWxkIGJlIGFibGUgdG8gcmVtb3ZlIHRoaXMgbG9naWMgYXMgYSBcImJyZWFraW5nIGNoYW5nZVwiIGJ1dCBzaG91bGQgZG8gc29tZSBtb3JlXG4gICAgLy8gaW52ZXN0aWdhdGlvbiBpbnRvIHRoZSBmYWlsdXJlcyBmaXJzdC5cbiAgICBjb25zdCByb290U2VnbWVudEdyb3VwID0gbmV3IFVybFNlZ21lbnRHcm91cChzcGxpdEdyb3VwLnNlZ21lbnRzLCBzcGxpdEdyb3VwLmNoaWxkcmVuKTtcblxuICAgIGNvbnN0IGV4cGFuZGVkJCA9XG4gICAgICAgIHRoaXMuZXhwYW5kU2VnbWVudEdyb3VwKHRoaXMuaW5qZWN0b3IsIHRoaXMuY29uZmlnLCByb290U2VnbWVudEdyb3VwLCBQUklNQVJZX09VVExFVCk7XG4gICAgY29uc3QgdXJsVHJlZXMkID0gZXhwYW5kZWQkLnBpcGUobWFwKChyb290U2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXApID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmNyZWF0ZVVybFRyZWUoXG4gICAgICAgICAgc3F1YXNoU2VnbWVudEdyb3VwKHJvb3RTZWdtZW50R3JvdXApLCB0aGlzLnVybFRyZWUucXVlcnlQYXJhbXMsIHRoaXMudXJsVHJlZS5mcmFnbWVudCk7XG4gICAgfSkpO1xuICAgIHJldHVybiB1cmxUcmVlcyQucGlwZShjYXRjaEVycm9yKChlOiBhbnkpID0+IHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgQWJzb2x1dGVSZWRpcmVjdCkge1xuICAgICAgICAvLyBBZnRlciBhbiBhYnNvbHV0ZSByZWRpcmVjdCB3ZSBkbyBub3QgYXBwbHkgYW55IG1vcmUgcmVkaXJlY3RzIVxuICAgICAgICAvLyBJZiB0aGlzIGltcGxlbWVudGF0aW9uIGNoYW5nZXMsIHVwZGF0ZSB0aGUgZG9jdW1lbnRhdGlvbiBub3RlIGluIGByZWRpcmVjdFRvYC5cbiAgICAgICAgdGhpcy5hbGxvd1JlZGlyZWN0cyA9IGZhbHNlO1xuICAgICAgICAvLyB3ZSBuZWVkIHRvIHJ1biBtYXRjaGluZywgc28gd2UgY2FuIGZldGNoIGFsbCBsYXp5LWxvYWRlZCBtb2R1bGVzXG4gICAgICAgIHJldHVybiB0aGlzLm1hdGNoKGUudXJsVHJlZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9NYXRjaCkge1xuICAgICAgICB0aHJvdyB0aGlzLm5vTWF0Y2hFcnJvcihlKTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgZTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIG1hdGNoKHRyZWU6IFVybFRyZWUpOiBPYnNlcnZhYmxlPFVybFRyZWU+IHtcbiAgICBjb25zdCBleHBhbmRlZCQgPVxuICAgICAgICB0aGlzLmV4cGFuZFNlZ21lbnRHcm91cCh0aGlzLmluamVjdG9yLCB0aGlzLmNvbmZpZywgdHJlZS5yb290LCBQUklNQVJZX09VVExFVCk7XG4gICAgY29uc3QgbWFwcGVkJCA9IGV4cGFuZGVkJC5waXBlKG1hcCgocm9vdFNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5jcmVhdGVVcmxUcmVlKFxuICAgICAgICAgIHNxdWFzaFNlZ21lbnRHcm91cChyb290U2VnbWVudEdyb3VwKSwgdHJlZS5xdWVyeVBhcmFtcywgdHJlZS5mcmFnbWVudCk7XG4gICAgfSkpO1xuICAgIHJldHVybiBtYXBwZWQkLnBpcGUoY2F0Y2hFcnJvcigoZTogYW55KTogT2JzZXJ2YWJsZTxVcmxUcmVlPiA9PiB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIE5vTWF0Y2gpIHtcbiAgICAgICAgdGhyb3cgdGhpcy5ub01hdGNoRXJyb3IoZSk7XG4gICAgICB9XG5cbiAgICAgIHRocm93IGU7XG4gICAgfSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBub01hdGNoRXJyb3IoZTogTm9NYXRjaCk6IGFueSB7XG4gICAgcmV0dXJuIG5ldyBFcnJvcihgQ2Fubm90IG1hdGNoIGFueSByb3V0ZXMuIFVSTCBTZWdtZW50OiAnJHtlLnNlZ21lbnRHcm91cH0nYCk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVVybFRyZWUocm9vdENhbmRpZGF0ZTogVXJsU2VnbWVudEdyb3VwLCBxdWVyeVBhcmFtczogUGFyYW1zLCBmcmFnbWVudDogc3RyaW5nfG51bGwpOlxuICAgICAgVXJsVHJlZSB7XG4gICAgY29uc3Qgcm9vdCA9IGNyZWF0ZVJvb3Qocm9vdENhbmRpZGF0ZSk7XG4gICAgcmV0dXJuIG5ldyBVcmxUcmVlKHJvb3QsIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFNlZ21lbnRHcm91cChcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZXM6IFJvdXRlW10sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLFxuICAgICAgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIGlmIChzZWdtZW50R3JvdXAuc2VnbWVudHMubGVuZ3RoID09PSAwICYmIHNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRDaGlsZHJlbihpbmplY3Rvciwgcm91dGVzLCBzZWdtZW50R3JvdXApXG4gICAgICAgICAgLnBpcGUobWFwKChjaGlsZHJlbjogYW55KSA9PiBuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCBjaGlsZHJlbikpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5leHBhbmRTZWdtZW50KGluamVjdG9yLCBzZWdtZW50R3JvdXAsIHJvdXRlcywgc2VnbWVudEdyb3VwLnNlZ21lbnRzLCBvdXRsZXQsIHRydWUpO1xuICB9XG5cbiAgLy8gUmVjdXJzaXZlbHkgZXhwYW5kIHNlZ21lbnQgZ3JvdXBzIGZvciBhbGwgdGhlIGNoaWxkIG91dGxldHNcbiAgcHJpdmF0ZSBleHBhbmRDaGlsZHJlbihcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZXM6IFJvdXRlW10sXG4gICAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6IE9ic2VydmFibGU8e1tuYW1lOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9PiB7XG4gICAgLy8gRXhwYW5kIG91dGxldHMgb25lIGF0IGEgdGltZSwgc3RhcnRpbmcgd2l0aCB0aGUgcHJpbWFyeSBvdXRsZXQuIFdlIG5lZWQgdG8gZG8gaXQgdGhpcyB3YXlcbiAgICAvLyBiZWNhdXNlIGFuIGFic29sdXRlIHJlZGlyZWN0IGZyb20gdGhlIHByaW1hcnkgb3V0bGV0IHRha2VzIHByZWNlZGVuY2UuXG4gICAgY29uc3QgY2hpbGRPdXRsZXRzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgT2JqZWN0LmtleXMoc2VnbWVudEdyb3VwLmNoaWxkcmVuKSkge1xuICAgICAgaWYgKGNoaWxkID09PSAncHJpbWFyeScpIHtcbiAgICAgICAgY2hpbGRPdXRsZXRzLnVuc2hpZnQoY2hpbGQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hpbGRPdXRsZXRzLnB1c2goY2hpbGQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmcm9tKGNoaWxkT3V0bGV0cylcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICBjb25jYXRNYXAoY2hpbGRPdXRsZXQgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBjaGlsZCA9IHNlZ21lbnRHcm91cC5jaGlsZHJlbltjaGlsZE91dGxldF07XG4gICAgICAgICAgICAgIC8vIFNvcnQgdGhlIHJvdXRlcyBzbyByb3V0ZXMgd2l0aCBvdXRsZXRzIHRoYXQgbWF0Y2ggdGhlIHNlZ21lbnQgYXBwZWFyXG4gICAgICAgICAgICAgIC8vIGZpcnN0LCBmb2xsb3dlZCBieSByb3V0ZXMgZm9yIG90aGVyIG91dGxldHMsIHdoaWNoIG1pZ2h0IG1hdGNoIGlmIHRoZXkgaGF2ZSBhblxuICAgICAgICAgICAgICAvLyBlbXB0eSBwYXRoLlxuICAgICAgICAgICAgICBjb25zdCBzb3J0ZWRSb3V0ZXMgPSBzb3J0QnlNYXRjaGluZ091dGxldHMocm91dGVzLCBjaGlsZE91dGxldCk7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLmV4cGFuZFNlZ21lbnRHcm91cChpbmplY3Rvciwgc29ydGVkUm91dGVzLCBjaGlsZCwgY2hpbGRPdXRsZXQpXG4gICAgICAgICAgICAgICAgICAucGlwZShtYXAocyA9PiAoe3NlZ21lbnQ6IHMsIG91dGxldDogY2hpbGRPdXRsZXR9KSkpO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBzY2FuKFxuICAgICAgICAgICAgICAgIChjaGlsZHJlbiwgZXhwYW5kZWRDaGlsZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgY2hpbGRyZW5bZXhwYW5kZWRDaGlsZC5vdXRsZXRdID0gZXhwYW5kZWRDaGlsZC5zZWdtZW50O1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkcmVuO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge30gYXMge1tvdXRsZXQ6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0pLFxuICAgICAgICAgICAgbGFzdCgpLFxuICAgICAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBleHBhbmRTZWdtZW50KFxuICAgICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZXM6IFJvdXRlW10sXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZyxcbiAgICAgIGFsbG93UmVkaXJlY3RzOiBib29sZWFuKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgICByZXR1cm4gZnJvbShyb3V0ZXMpLnBpcGUoXG4gICAgICAgIGNvbmNhdE1hcChyID0+IHtcbiAgICAgICAgICBjb25zdCBleHBhbmRlZCQgPSB0aGlzLmV4cGFuZFNlZ21lbnRBZ2FpbnN0Um91dGUoXG4gICAgICAgICAgICAgIGluamVjdG9yLCBzZWdtZW50R3JvdXAsIHJvdXRlcywgciwgc2VnbWVudHMsIG91dGxldCwgYWxsb3dSZWRpcmVjdHMpO1xuICAgICAgICAgIHJldHVybiBleHBhbmRlZCQucGlwZShjYXRjaEVycm9yKChlOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9NYXRjaCkge1xuICAgICAgICAgICAgICByZXR1cm4gb2YobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgfSksXG4gICAgICAgIGZpcnN0KChzKTogcyBpcyBVcmxTZWdtZW50R3JvdXAgPT4gISFzKSwgY2F0Y2hFcnJvcigoZTogYW55LCBfOiBhbnkpID0+IHtcbiAgICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIEVtcHR5RXJyb3IgfHwgZS5uYW1lID09PSAnRW1wdHlFcnJvcicpIHtcbiAgICAgICAgICAgIGlmIChub0xlZnRvdmVyc0luVXJsKHNlZ21lbnRHcm91cCwgc2VnbWVudHMsIG91dGxldCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9mKG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbm9NYXRjaChzZWdtZW50R3JvdXApO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFNlZ21lbnRBZ2FpbnN0Um91dGUoXG4gICAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvciwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlczogUm91dGVbXSwgcm91dGU6IFJvdXRlLFxuICAgICAgcGF0aHM6IFVybFNlZ21lbnRbXSwgb3V0bGV0OiBzdHJpbmcsIGFsbG93UmVkaXJlY3RzOiBib29sZWFuKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgICBpZiAoIWlzSW1tZWRpYXRlTWF0Y2gocm91dGUsIHNlZ21lbnRHcm91cCwgcGF0aHMsIG91dGxldCkpIHtcbiAgICAgIHJldHVybiBub01hdGNoKHNlZ21lbnRHcm91cCk7XG4gICAgfVxuXG4gICAgaWYgKHJvdXRlLnJlZGlyZWN0VG8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRoaXMubWF0Y2hTZWdtZW50QWdhaW5zdFJvdXRlKGluamVjdG9yLCBzZWdtZW50R3JvdXAsIHJvdXRlLCBwYXRocywgb3V0bGV0KTtcbiAgICB9XG5cbiAgICBpZiAoYWxsb3dSZWRpcmVjdHMgJiYgdGhpcy5hbGxvd1JlZGlyZWN0cykge1xuICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kU2VnbWVudEFnYWluc3RSb3V0ZVVzaW5nUmVkaXJlY3QoXG4gICAgICAgICAgaW5qZWN0b3IsIHNlZ21lbnRHcm91cCwgcm91dGVzLCByb3V0ZSwgcGF0aHMsIG91dGxldCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vTWF0Y2goc2VnbWVudEdyb3VwKTtcbiAgfVxuXG4gIHByaXZhdGUgZXhwYW5kU2VnbWVudEFnYWluc3RSb3V0ZVVzaW5nUmVkaXJlY3QoXG4gICAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvciwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlczogUm91dGVbXSwgcm91dGU6IFJvdXRlLFxuICAgICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIGlmIChyb3V0ZS5wYXRoID09PSAnKionKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRXaWxkQ2FyZFdpdGhQYXJhbXNBZ2FpbnN0Um91dGVVc2luZ1JlZGlyZWN0KFxuICAgICAgICAgIGluamVjdG9yLCByb3V0ZXMsIHJvdXRlLCBvdXRsZXQpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmV4cGFuZFJlZ3VsYXJTZWdtZW50QWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgICAgaW5qZWN0b3IsIHNlZ21lbnRHcm91cCwgcm91dGVzLCByb3V0ZSwgc2VnbWVudHMsIG91dGxldCk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFdpbGRDYXJkV2l0aFBhcmFtc0FnYWluc3RSb3V0ZVVzaW5nUmVkaXJlY3QoXG4gICAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvciwgcm91dGVzOiBSb3V0ZVtdLCByb3V0ZTogUm91dGUsXG4gICAgICBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPiB7XG4gICAgY29uc3QgbmV3VHJlZSA9IHRoaXMuYXBwbHlSZWRpcmVjdENvbW1hbmRzKFtdLCByb3V0ZS5yZWRpcmVjdFRvISwge30pO1xuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvIS5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAgIHJldHVybiBhYnNvbHV0ZVJlZGlyZWN0KG5ld1RyZWUpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmxpbmVyYWxpemVTZWdtZW50cyhyb3V0ZSwgbmV3VHJlZSkucGlwZShtZXJnZU1hcCgobmV3U2VnbWVudHM6IFVybFNlZ21lbnRbXSkgPT4ge1xuICAgICAgY29uc3QgZ3JvdXAgPSBuZXcgVXJsU2VnbWVudEdyb3VwKG5ld1NlZ21lbnRzLCB7fSk7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRTZWdtZW50KGluamVjdG9yLCBncm91cCwgcm91dGVzLCBuZXdTZWdtZW50cywgb3V0bGV0LCBmYWxzZSk7XG4gICAgfSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBleHBhbmRSZWd1bGFyU2VnbWVudEFnYWluc3RSb3V0ZVVzaW5nUmVkaXJlY3QoXG4gICAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvciwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlczogUm91dGVbXSwgcm91dGU6IFJvdXRlLFxuICAgICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIGNvbnN0IHttYXRjaGVkLCBjb25zdW1lZFNlZ21lbnRzLCByZW1haW5pbmdTZWdtZW50cywgcG9zaXRpb25hbFBhcmFtU2VnbWVudHN9ID1cbiAgICAgICAgbWF0Y2goc2VnbWVudEdyb3VwLCByb3V0ZSwgc2VnbWVudHMpO1xuICAgIGlmICghbWF0Y2hlZCkgcmV0dXJuIG5vTWF0Y2goc2VnbWVudEdyb3VwKTtcblxuICAgIGNvbnN0IG5ld1RyZWUgPVxuICAgICAgICB0aGlzLmFwcGx5UmVkaXJlY3RDb21tYW5kcyhjb25zdW1lZFNlZ21lbnRzLCByb3V0ZS5yZWRpcmVjdFRvISwgcG9zaXRpb25hbFBhcmFtU2VnbWVudHMpO1xuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvIS5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAgIHJldHVybiBhYnNvbHV0ZVJlZGlyZWN0KG5ld1RyZWUpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmxpbmVyYWxpemVTZWdtZW50cyhyb3V0ZSwgbmV3VHJlZSkucGlwZShtZXJnZU1hcCgobmV3U2VnbWVudHM6IFVybFNlZ21lbnRbXSkgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kU2VnbWVudChcbiAgICAgICAgICBpbmplY3Rvciwgc2VnbWVudEdyb3VwLCByb3V0ZXMsIG5ld1NlZ21lbnRzLmNvbmNhdChyZW1haW5pbmdTZWdtZW50cyksIG91dGxldCwgZmFsc2UpO1xuICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgbWF0Y2hTZWdtZW50QWdhaW5zdFJvdXRlKFxuICAgICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJhd1NlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZTogUm91dGUsXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPiB7XG4gICAgaWYgKHJvdXRlLnBhdGggPT09ICcqKicpIHtcbiAgICAgIC8vIE9ubHkgY3JlYXRlIHRoZSBSb3V0ZSdzIGBFbnZpcm9ubWVudEluamVjdG9yYCBpZiBpdCBtYXRjaGVzIHRoZSBhdHRlbXB0ZWQgbmF2aWdhdGlvblxuICAgICAgaW5qZWN0b3IgPSBnZXRPckNyZWF0ZVJvdXRlSW5qZWN0b3JJZk5lZWRlZChyb3V0ZSwgaW5qZWN0b3IpO1xuICAgICAgaWYgKHJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgICAgICBjb25zdCBsb2FkZWQkID0gcm91dGUuX2xvYWRlZFJvdXRlcyA/XG4gICAgICAgICAgICBvZih7cm91dGVzOiByb3V0ZS5fbG9hZGVkUm91dGVzLCBpbmplY3Rvcjogcm91dGUuX2xvYWRlZEluamVjdG9yfSkgOlxuICAgICAgICAgICAgdGhpcy5jb25maWdMb2FkZXIubG9hZENoaWxkcmVuKGluamVjdG9yLCByb3V0ZSk7XG4gICAgICAgIHJldHVybiBsb2FkZWQkLnBpcGUobWFwKChjZmc6IExvYWRlZFJvdXRlckNvbmZpZykgPT4ge1xuICAgICAgICAgIHJvdXRlLl9sb2FkZWRSb3V0ZXMgPSBjZmcucm91dGVzO1xuICAgICAgICAgIHJvdXRlLl9sb2FkZWRJbmplY3RvciA9IGNmZy5pbmplY3RvcjtcbiAgICAgICAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50cywge30pO1xuICAgICAgICB9KSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvZihuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRzLCB7fSkpO1xuICAgIH1cblxuICAgIHJldHVybiBtYXRjaFdpdGhDaGVja3MocmF3U2VnbWVudEdyb3VwLCByb3V0ZSwgc2VnbWVudHMsIGluamVjdG9yLCB0aGlzLnVybFNlcmlhbGl6ZXIpXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgICAgc3dpdGNoTWFwKCh7bWF0Y2hlZCwgY29uc3VtZWRTZWdtZW50cywgcmVtYWluaW5nU2VnbWVudHN9KSA9PiB7XG4gICAgICAgICAgICAgIGlmICghbWF0Y2hlZCkgcmV0dXJuIG5vTWF0Y2gocmF3U2VnbWVudEdyb3VwKTtcblxuICAgICAgICAgICAgICAvLyBPbmx5IGNyZWF0ZSB0aGUgUm91dGUncyBgRW52aXJvbm1lbnRJbmplY3RvcmAgaWYgaXQgbWF0Y2hlcyB0aGUgYXR0ZW1wdGVkXG4gICAgICAgICAgICAgIC8vIG5hdmlnYXRpb25cbiAgICAgICAgICAgICAgaW5qZWN0b3IgPSBnZXRPckNyZWF0ZVJvdXRlSW5qZWN0b3JJZk5lZWRlZChyb3V0ZSwgaW5qZWN0b3IpO1xuICAgICAgICAgICAgICBjb25zdCBjaGlsZENvbmZpZyQgPSB0aGlzLmdldENoaWxkQ29uZmlnKGluamVjdG9yLCByb3V0ZSwgc2VnbWVudHMpO1xuXG4gICAgICAgICAgICAgIHJldHVybiBjaGlsZENvbmZpZyQucGlwZShtZXJnZU1hcCgocm91dGVyQ29uZmlnOiBMb2FkZWRSb3V0ZXJDb25maWcpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaGlsZEluamVjdG9yID0gcm91dGVyQ29uZmlnLmluamVjdG9yID8/IGluamVjdG9yO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkQ29uZmlnID0gcm91dGVyQ29uZmlnLnJvdXRlcztcblxuICAgICAgICAgICAgICAgIGNvbnN0IHtzZWdtZW50R3JvdXA6IHNwbGl0U2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50c30gPVxuICAgICAgICAgICAgICAgICAgICBzcGxpdChyYXdTZWdtZW50R3JvdXAsIGNvbnN1bWVkU2VnbWVudHMsIHJlbWFpbmluZ1NlZ21lbnRzLCBjaGlsZENvbmZpZyk7XG4gICAgICAgICAgICAgICAgLy8gU2VlIGNvbW1lbnQgb24gdGhlIG90aGVyIGNhbGwgdG8gYHNwbGl0YCBhYm91dCB3aHkgdGhpcyBpcyBuZWNlc3NhcnkuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2VnbWVudEdyb3VwID1cbiAgICAgICAgICAgICAgICAgICAgbmV3IFVybFNlZ21lbnRHcm91cChzcGxpdFNlZ21lbnRHcm91cC5zZWdtZW50cywgc3BsaXRTZWdtZW50R3JvdXAuY2hpbGRyZW4pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiBzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgICAgICAgICAgICAgY29uc3QgZXhwYW5kZWQkID0gdGhpcy5leHBhbmRDaGlsZHJlbihjaGlsZEluamVjdG9yLCBjaGlsZENvbmZpZywgc2VnbWVudEdyb3VwKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBleHBhbmRlZCQucGlwZShcbiAgICAgICAgICAgICAgICAgICAgICBtYXAoKGNoaWxkcmVuOiBhbnkpID0+IG5ldyBVcmxTZWdtZW50R3JvdXAoY29uc3VtZWRTZWdtZW50cywgY2hpbGRyZW4pKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkQ29uZmlnLmxlbmd0aCA9PT0gMCAmJiBzbGljZWRTZWdtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBvZihuZXcgVXJsU2VnbWVudEdyb3VwKGNvbnN1bWVkU2VnbWVudHMsIHt9KSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgbWF0Y2hlZE9uT3V0bGV0ID0gZ2V0T3V0bGV0KHJvdXRlKSA9PT0gb3V0bGV0O1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4cGFuZGVkJCA9IHRoaXMuZXhwYW5kU2VnbWVudChcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRJbmplY3Rvciwgc2VnbWVudEdyb3VwLCBjaGlsZENvbmZpZywgc2xpY2VkU2VnbWVudHMsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRPbk91dGxldCA/IFBSSU1BUllfT1VUTEVUIDogb3V0bGV0LCB0cnVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXhwYW5kZWQkLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgIG1hcCgoY3M6IFVybFNlZ21lbnRHcm91cCkgPT4gbmV3IFVybFNlZ21lbnRHcm91cChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdW1lZFNlZ21lbnRzLmNvbmNhdChjcy5zZWdtZW50cyksIGNzLmNoaWxkcmVuKSkpO1xuICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q2hpbGRDb25maWcoaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJvdXRlOiBSb3V0ZSwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSk6XG4gICAgICBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4ge1xuICAgIGlmIChyb3V0ZS5jaGlsZHJlbikge1xuICAgICAgLy8gVGhlIGNoaWxkcmVuIGJlbG9uZyB0byB0aGUgc2FtZSBtb2R1bGVcbiAgICAgIHJldHVybiBvZih7cm91dGVzOiByb3V0ZS5jaGlsZHJlbiwgaW5qZWN0b3J9KTtcbiAgICB9XG5cbiAgICBpZiAocm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgICAvLyBsYXp5IGNoaWxkcmVuIGJlbG9uZyB0byB0aGUgbG9hZGVkIG1vZHVsZVxuICAgICAgaWYgKHJvdXRlLl9sb2FkZWRSb3V0ZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gb2Yoe3JvdXRlczogcm91dGUuX2xvYWRlZFJvdXRlcywgaW5qZWN0b3I6IHJvdXRlLl9sb2FkZWRJbmplY3Rvcn0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcnVuQ2FuTG9hZEd1YXJkcyhpbmplY3Rvciwgcm91dGUsIHNlZ21lbnRzLCB0aGlzLnVybFNlcmlhbGl6ZXIpXG4gICAgICAgICAgLnBpcGUobWVyZ2VNYXAoKHNob3VsZExvYWRSZXN1bHQ6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgIGlmIChzaG91bGRMb2FkUmVzdWx0KSB7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbmZpZ0xvYWRlci5sb2FkQ2hpbGRyZW4oaW5qZWN0b3IsIHJvdXRlKVxuICAgICAgICAgICAgICAgICAgLnBpcGUodGFwKChjZmc6IExvYWRlZFJvdXRlckNvbmZpZykgPT4ge1xuICAgICAgICAgICAgICAgICAgICByb3V0ZS5fbG9hZGVkUm91dGVzID0gY2ZnLnJvdXRlcztcbiAgICAgICAgICAgICAgICAgICAgcm91dGUuX2xvYWRlZEluamVjdG9yID0gY2ZnLmluamVjdG9yO1xuICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNhbkxvYWRGYWlscyhyb3V0ZSk7XG4gICAgICAgICAgfSkpO1xuICAgIH1cblxuICAgIHJldHVybiBvZih7cm91dGVzOiBbXSwgaW5qZWN0b3J9KTtcbiAgfVxuXG4gIHByaXZhdGUgbGluZXJhbGl6ZVNlZ21lbnRzKHJvdXRlOiBSb3V0ZSwgdXJsVHJlZTogVXJsVHJlZSk6IE9ic2VydmFibGU8VXJsU2VnbWVudFtdPiB7XG4gICAgbGV0IHJlczogVXJsU2VnbWVudFtdID0gW107XG4gICAgbGV0IGMgPSB1cmxUcmVlLnJvb3Q7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHJlcyA9IHJlcy5jb25jYXQoYy5zZWdtZW50cyk7XG4gICAgICBpZiAoYy5udW1iZXJPZkNoaWxkcmVuID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvZihyZXMpO1xuICAgICAgfVxuXG4gICAgICBpZiAoYy5udW1iZXJPZkNoaWxkcmVuID4gMSB8fCAhYy5jaGlsZHJlbltQUklNQVJZX09VVExFVF0pIHtcbiAgICAgICAgcmV0dXJuIG5hbWVkT3V0bGV0c1JlZGlyZWN0KHJvdXRlLnJlZGlyZWN0VG8hKTtcbiAgICAgIH1cblxuICAgICAgYyA9IGMuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwbHlSZWRpcmVjdENvbW1hbmRzKFxuICAgICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgcmVkaXJlY3RUbzogc3RyaW5nLCBwb3NQYXJhbXM6IHtbazogc3RyaW5nXTogVXJsU2VnbWVudH0pOiBVcmxUcmVlIHtcbiAgICByZXR1cm4gdGhpcy5hcHBseVJlZGlyZWN0Q3JlYXRyZVVybFRyZWUoXG4gICAgICAgIHJlZGlyZWN0VG8sIHRoaXMudXJsU2VyaWFsaXplci5wYXJzZShyZWRpcmVjdFRvKSwgc2VnbWVudHMsIHBvc1BhcmFtcyk7XG4gIH1cblxuICBwcml2YXRlIGFwcGx5UmVkaXJlY3RDcmVhdHJlVXJsVHJlZShcbiAgICAgIHJlZGlyZWN0VG86IHN0cmluZywgdXJsVHJlZTogVXJsVHJlZSwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICAgIHBvc1BhcmFtczoge1trOiBzdHJpbmddOiBVcmxTZWdtZW50fSk6IFVybFRyZWUge1xuICAgIGNvbnN0IG5ld1Jvb3QgPSB0aGlzLmNyZWF0ZVNlZ21lbnRHcm91cChyZWRpcmVjdFRvLCB1cmxUcmVlLnJvb3QsIHNlZ21lbnRzLCBwb3NQYXJhbXMpO1xuICAgIHJldHVybiBuZXcgVXJsVHJlZShcbiAgICAgICAgbmV3Um9vdCwgdGhpcy5jcmVhdGVRdWVyeVBhcmFtcyh1cmxUcmVlLnF1ZXJ5UGFyYW1zLCB0aGlzLnVybFRyZWUucXVlcnlQYXJhbXMpLFxuICAgICAgICB1cmxUcmVlLmZyYWdtZW50KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlUXVlcnlQYXJhbXMocmVkaXJlY3RUb1BhcmFtczogUGFyYW1zLCBhY3R1YWxQYXJhbXM6IFBhcmFtcyk6IFBhcmFtcyB7XG4gICAgY29uc3QgcmVzOiBQYXJhbXMgPSB7fTtcbiAgICBmb3JFYWNoKHJlZGlyZWN0VG9QYXJhbXMsICh2OiBhbnksIGs6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgY29weVNvdXJjZVZhbHVlID0gdHlwZW9mIHYgPT09ICdzdHJpbmcnICYmIHYuc3RhcnRzV2l0aCgnOicpO1xuICAgICAgaWYgKGNvcHlTb3VyY2VWYWx1ZSkge1xuICAgICAgICBjb25zdCBzb3VyY2VOYW1lID0gdi5zdWJzdHJpbmcoMSk7XG4gICAgICAgIHJlc1trXSA9IGFjdHVhbFBhcmFtc1tzb3VyY2VOYW1lXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc1trXSA9IHY7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlU2VnbWVudEdyb3VwKFxuICAgICAgcmVkaXJlY3RUbzogc3RyaW5nLCBncm91cDogVXJsU2VnbWVudEdyb3VwLCBzZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgICAgcG9zUGFyYW1zOiB7W2s6IHN0cmluZ106IFVybFNlZ21lbnR9KTogVXJsU2VnbWVudEdyb3VwIHtcbiAgICBjb25zdCB1cGRhdGVkU2VnbWVudHMgPSB0aGlzLmNyZWF0ZVNlZ21lbnRzKHJlZGlyZWN0VG8sIGdyb3VwLnNlZ21lbnRzLCBzZWdtZW50cywgcG9zUGFyYW1zKTtcblxuICAgIGxldCBjaGlsZHJlbjoge1tuOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gICAgZm9yRWFjaChncm91cC5jaGlsZHJlbiwgKGNoaWxkOiBVcmxTZWdtZW50R3JvdXAsIG5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgY2hpbGRyZW5bbmFtZV0gPSB0aGlzLmNyZWF0ZVNlZ21lbnRHcm91cChyZWRpcmVjdFRvLCBjaGlsZCwgc2VnbWVudHMsIHBvc1BhcmFtcyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cCh1cGRhdGVkU2VnbWVudHMsIGNoaWxkcmVuKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlU2VnbWVudHMoXG4gICAgICByZWRpcmVjdFRvOiBzdHJpbmcsIHJlZGlyZWN0VG9TZWdtZW50czogVXJsU2VnbWVudFtdLCBhY3R1YWxTZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgICAgcG9zUGFyYW1zOiB7W2s6IHN0cmluZ106IFVybFNlZ21lbnR9KTogVXJsU2VnbWVudFtdIHtcbiAgICByZXR1cm4gcmVkaXJlY3RUb1NlZ21lbnRzLm1hcChcbiAgICAgICAgcyA9PiBzLnBhdGguc3RhcnRzV2l0aCgnOicpID8gdGhpcy5maW5kUG9zUGFyYW0ocmVkaXJlY3RUbywgcywgcG9zUGFyYW1zKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmluZE9yUmV0dXJuKHMsIGFjdHVhbFNlZ21lbnRzKSk7XG4gIH1cblxuICBwcml2YXRlIGZpbmRQb3NQYXJhbShcbiAgICAgIHJlZGlyZWN0VG86IHN0cmluZywgcmVkaXJlY3RUb1VybFNlZ21lbnQ6IFVybFNlZ21lbnQsXG4gICAgICBwb3NQYXJhbXM6IHtbazogc3RyaW5nXTogVXJsU2VnbWVudH0pOiBVcmxTZWdtZW50IHtcbiAgICBjb25zdCBwb3MgPSBwb3NQYXJhbXNbcmVkaXJlY3RUb1VybFNlZ21lbnQucGF0aC5zdWJzdHJpbmcoMSldO1xuICAgIGlmICghcG9zKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBDYW5ub3QgcmVkaXJlY3QgdG8gJyR7cmVkaXJlY3RUb30nLiBDYW5ub3QgZmluZCAnJHtyZWRpcmVjdFRvVXJsU2VnbWVudC5wYXRofScuYCk7XG4gICAgcmV0dXJuIHBvcztcbiAgfVxuXG4gIHByaXZhdGUgZmluZE9yUmV0dXJuKHJlZGlyZWN0VG9VcmxTZWdtZW50OiBVcmxTZWdtZW50LCBhY3R1YWxTZWdtZW50czogVXJsU2VnbWVudFtdKTogVXJsU2VnbWVudCB7XG4gICAgbGV0IGlkeCA9IDA7XG4gICAgZm9yIChjb25zdCBzIG9mIGFjdHVhbFNlZ21lbnRzKSB7XG4gICAgICBpZiAocy5wYXRoID09PSByZWRpcmVjdFRvVXJsU2VnbWVudC5wYXRoKSB7XG4gICAgICAgIGFjdHVhbFNlZ21lbnRzLnNwbGljZShpZHgpO1xuICAgICAgICByZXR1cm4gcztcbiAgICAgIH1cbiAgICAgIGlkeCsrO1xuICAgIH1cbiAgICByZXR1cm4gcmVkaXJlY3RUb1VybFNlZ21lbnQ7XG4gIH1cbn1cbiJdfQ==