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
import { createRoot, squashSegmentGroup, UrlSegmentGroup, UrlTree } from './url_tree';
import { forEach, wrapIntoObservable } from './utils/collection';
import { getOrCreateRouteInjectorIfNeeded, getOutlet, sortByMatchingOutlets } from './utils/config';
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
        const { matched, consumedSegments, remainingSegments } = match(rawSegmentGroup, route, segments);
        if (!matched)
            return noMatch(rawSegmentGroup);
        // Only create the Route's `EnvironmentInjector` if it matches the attempted navigation
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHlfcmVkaXJlY3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9hcHBseV9yZWRpcmVjdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUFDLFVBQVUsRUFBRSxJQUFJLEVBQWMsRUFBRSxFQUFFLFVBQVUsRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUNsRSxPQUFPLEVBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRzVGLE9BQU8sRUFBQyxxQkFBcUIsRUFBQyxNQUFNLHFDQUFxQyxDQUFDO0FBRTFFLE9BQU8sRUFBQyx3QkFBd0IsRUFBVSxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDMUUsT0FBTyxFQUFDLFVBQVUsRUFBRSxrQkFBa0IsRUFBYyxlQUFlLEVBQWlCLE9BQU8sRUFBQyxNQUFNLFlBQVksQ0FBQztBQUMvRyxPQUFPLEVBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDL0QsT0FBTyxFQUFDLGdDQUFnQyxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ2xHLE9BQU8sRUFBQyxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDekYsT0FBTyxFQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFDLE1BQU0scUJBQXFCLENBQUM7QUFFckUsTUFBTSxPQUFPO0lBR1gsWUFBWSxZQUE4QjtRQUN4QyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksSUFBSSxJQUFJLENBQUM7SUFDM0MsQ0FBQztDQUNGO0FBRUQsTUFBTSxnQkFBZ0I7SUFDcEIs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QUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ1osS0FBSyxNQUFNLENBQUMsSUFBSSxjQUFjLEVBQUU7WUFDOUIsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLG9CQUFvQixDQUFDLElBQUksRUFBRTtnQkFDeEMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDM0IsT0FBTyxDQUFDLENBQUM7YUFDVjtZQUNELEdBQUcsRUFBRSxDQUFDO1NBQ1A7UUFDRCxPQUFPLG9CQUFvQixDQUFDO0lBQzlCLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0Vudmlyb25tZW50SW5qZWN0b3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtFbXB0eUVycm9yLCBmcm9tLCBPYnNlcnZhYmxlLCBvZiwgdGhyb3dFcnJvcn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NhdGNoRXJyb3IsIGNvbmNhdE1hcCwgZmlyc3QsIGxhc3QsIG1hcCwgbWVyZ2VNYXAsIHNjYW4sIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0NhbkxvYWRGbiwgTG9hZGVkUm91dGVyQ29uZmlnLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge3ByaW9yaXRpemVkR3VhcmRWYWx1ZX0gZnJvbSAnLi9vcGVyYXRvcnMvcHJpb3JpdGl6ZWRfZ3VhcmRfdmFsdWUnO1xuaW1wb3J0IHtSb3V0ZXJDb25maWdMb2FkZXJ9IGZyb20gJy4vcm91dGVyX2NvbmZpZ19sb2FkZXInO1xuaW1wb3J0IHtuYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IsIFBhcmFtcywgUFJJTUFSWV9PVVRMRVR9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7Y3JlYXRlUm9vdCwgc3F1YXNoU2VnbWVudEdyb3VwLCBVcmxTZWdtZW50LCBVcmxTZWdtZW50R3JvdXAsIFVybFNlcmlhbGl6ZXIsIFVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtmb3JFYWNoLCB3cmFwSW50b09ic2VydmFibGV9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge2dldE9yQ3JlYXRlUm91dGVJbmplY3RvcklmTmVlZGVkLCBnZXRPdXRsZXQsIHNvcnRCeU1hdGNoaW5nT3V0bGV0c30gZnJvbSAnLi91dGlscy9jb25maWcnO1xuaW1wb3J0IHtpc0ltbWVkaWF0ZU1hdGNoLCBtYXRjaCwgbm9MZWZ0b3ZlcnNJblVybCwgc3BsaXR9IGZyb20gJy4vdXRpbHMvY29uZmlnX21hdGNoaW5nJztcbmltcG9ydCB7aXNDYW5Mb2FkLCBpc0Z1bmN0aW9uLCBpc1VybFRyZWV9IGZyb20gJy4vdXRpbHMvdHlwZV9ndWFyZHMnO1xuXG5jbGFzcyBOb01hdGNoIHtcbiAgcHVibGljIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwfG51bGw7XG5cbiAgY29uc3RydWN0b3Ioc2VnbWVudEdyb3VwPzogVXJsU2VnbWVudEdyb3VwKSB7XG4gICAgdGhpcy5zZWdtZW50R3JvdXAgPSBzZWdtZW50R3JvdXAgfHwgbnVsbDtcbiAgfVxufVxuXG5jbGFzcyBBYnNvbHV0ZVJlZGlyZWN0IHtcbiAgY29uc3RydWN0b3IocHVibGljIHVybFRyZWU6IFVybFRyZWUpIHt9XG59XG5cbmZ1bmN0aW9uIG5vTWF0Y2goc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXApOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICByZXR1cm4gdGhyb3dFcnJvcihuZXcgTm9NYXRjaChzZWdtZW50R3JvdXApKTtcbn1cblxuZnVuY3Rpb24gYWJzb2x1dGVSZWRpcmVjdChuZXdUcmVlOiBVcmxUcmVlKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgcmV0dXJuIHRocm93RXJyb3IobmV3IEFic29sdXRlUmVkaXJlY3QobmV3VHJlZSkpO1xufVxuXG5mdW5jdGlvbiBuYW1lZE91dGxldHNSZWRpcmVjdChyZWRpcmVjdFRvOiBzdHJpbmcpOiBPYnNlcnZhYmxlPGFueT4ge1xuICByZXR1cm4gdGhyb3dFcnJvcihcbiAgICAgIG5ldyBFcnJvcihgT25seSBhYnNvbHV0ZSByZWRpcmVjdHMgY2FuIGhhdmUgbmFtZWQgb3V0bGV0cy4gcmVkaXJlY3RUbzogJyR7cmVkaXJlY3RUb30nYCkpO1xufVxuXG5mdW5jdGlvbiBjYW5Mb2FkRmFpbHMocm91dGU6IFJvdXRlKTogT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWc+IHtcbiAgcmV0dXJuIHRocm93RXJyb3IoXG4gICAgICBuYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoYENhbm5vdCBsb2FkIGNoaWxkcmVuIGJlY2F1c2UgdGhlIGd1YXJkIG9mIHRoZSByb3V0ZSBcInBhdGg6ICcke1xuICAgICAgICAgIHJvdXRlLnBhdGh9J1wiIHJldHVybmVkIGZhbHNlYCkpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGBVcmxUcmVlYCB3aXRoIHRoZSByZWRpcmVjdGlvbiBhcHBsaWVkLlxuICpcbiAqIExhenkgbW9kdWxlcyBhcmUgbG9hZGVkIGFsb25nIHRoZSB3YXkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVJlZGlyZWN0cyhcbiAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvciwgY29uZmlnTG9hZGVyOiBSb3V0ZXJDb25maWdMb2FkZXIsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgdXJsVHJlZTogVXJsVHJlZSwgY29uZmlnOiBSb3V0ZXMpOiBPYnNlcnZhYmxlPFVybFRyZWU+IHtcbiAgcmV0dXJuIG5ldyBBcHBseVJlZGlyZWN0cyhpbmplY3RvciwgY29uZmlnTG9hZGVyLCB1cmxTZXJpYWxpemVyLCB1cmxUcmVlLCBjb25maWcpLmFwcGx5KCk7XG59XG5cbmNsYXNzIEFwcGx5UmVkaXJlY3RzIHtcbiAgcHJpdmF0ZSBhbGxvd1JlZGlyZWN0czogYm9vbGVhbiA9IHRydWU7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCBwcml2YXRlIGNvbmZpZ0xvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyLFxuICAgICAgcHJpdmF0ZSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLCBwcml2YXRlIHVybFRyZWU6IFVybFRyZWUsIHByaXZhdGUgY29uZmlnOiBSb3V0ZXMpIHt9XG5cbiAgYXBwbHkoKTogT2JzZXJ2YWJsZTxVcmxUcmVlPiB7XG4gICAgY29uc3Qgc3BsaXRHcm91cCA9IHNwbGl0KHRoaXMudXJsVHJlZS5yb290LCBbXSwgW10sIHRoaXMuY29uZmlnKS5zZWdtZW50R3JvdXA7XG4gICAgLy8gVE9ETyhhdHNjb3R0KTogY3JlYXRpbmcgYSBuZXcgc2VnbWVudCByZW1vdmVzIHRoZSBfc291cmNlU2VnbWVudCBfc2VnbWVudEluZGV4U2hpZnQsIHdoaWNoIGlzXG4gICAgLy8gb25seSBuZWNlc3NhcnkgdG8gcHJldmVudCBmYWlsdXJlcyBpbiB0ZXN0cyB3aGljaCBhc3NlcnQgZXhhY3Qgb2JqZWN0IG1hdGNoZXMuIFRoZSBgc3BsaXRgIGlzXG4gICAgLy8gbm93IHNoYXJlZCBiZXR3ZWVuIGBhcHBseVJlZGlyZWN0c2AgYW5kIGByZWNvZ25pemVgIGJ1dCBvbmx5IHRoZSBgcmVjb2duaXplYCBzdGVwIG5lZWRzIHRoZXNlXG4gICAgLy8gcHJvcGVydGllcy4gQmVmb3JlIHRoZSBpbXBsZW1lbnRhdGlvbnMgd2VyZSBtZXJnZWQsIHRoZSBgYXBwbHlSZWRpcmVjdHNgIHdvdWxkIG5vdCBhc3NpZ25cbiAgICAvLyB0aGVtLiBXZSBzaG91bGQgYmUgYWJsZSB0byByZW1vdmUgdGhpcyBsb2dpYyBhcyBhIFwiYnJlYWtpbmcgY2hhbmdlXCIgYnV0IHNob3VsZCBkbyBzb21lIG1vcmVcbiAgICAvLyBpbnZlc3RpZ2F0aW9uIGludG8gdGhlIGZhaWx1cmVzIGZpcnN0LlxuICAgIGNvbnN0IHJvb3RTZWdtZW50R3JvdXAgPSBuZXcgVXJsU2VnbWVudEdyb3VwKHNwbGl0R3JvdXAuc2VnbWVudHMsIHNwbGl0R3JvdXAuY2hpbGRyZW4pO1xuXG4gICAgY29uc3QgZXhwYW5kZWQkID1cbiAgICAgICAgdGhpcy5leHBhbmRTZWdtZW50R3JvdXAodGhpcy5pbmplY3RvciwgdGhpcy5jb25maWcsIHJvb3RTZWdtZW50R3JvdXAsIFBSSU1BUllfT1VUTEVUKTtcbiAgICBjb25zdCB1cmxUcmVlcyQgPSBleHBhbmRlZCQucGlwZShtYXAoKHJvb3RTZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCkgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlVXJsVHJlZShcbiAgICAgICAgICBzcXVhc2hTZWdtZW50R3JvdXAocm9vdFNlZ21lbnRHcm91cCksIHRoaXMudXJsVHJlZS5xdWVyeVBhcmFtcywgdGhpcy51cmxUcmVlLmZyYWdtZW50KTtcbiAgICB9KSk7XG4gICAgcmV0dXJuIHVybFRyZWVzJC5waXBlKGNhdGNoRXJyb3IoKGU6IGFueSkgPT4ge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBBYnNvbHV0ZVJlZGlyZWN0KSB7XG4gICAgICAgIC8vIEFmdGVyIGFuIGFic29sdXRlIHJlZGlyZWN0IHdlIGRvIG5vdCBhcHBseSBhbnkgbW9yZSByZWRpcmVjdHMhXG4gICAgICAgIC8vIElmIHRoaXMgaW1wbGVtZW50YXRpb24gY2hhbmdlcywgdXBkYXRlIHRoZSBkb2N1bWVudGF0aW9uIG5vdGUgaW4gYHJlZGlyZWN0VG9gLlxuICAgICAgICB0aGlzLmFsbG93UmVkaXJlY3RzID0gZmFsc2U7XG4gICAgICAgIC8vIHdlIG5lZWQgdG8gcnVuIG1hdGNoaW5nLCBzbyB3ZSBjYW4gZmV0Y2ggYWxsIGxhenktbG9hZGVkIG1vZHVsZXNcbiAgICAgICAgcmV0dXJuIHRoaXMubWF0Y2goZS51cmxUcmVlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOb01hdGNoKSB7XG4gICAgICAgIHRocm93IHRoaXMubm9NYXRjaEVycm9yKGUpO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlO1xuICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgbWF0Y2godHJlZTogVXJsVHJlZSk6IE9ic2VydmFibGU8VXJsVHJlZT4ge1xuICAgIGNvbnN0IGV4cGFuZGVkJCA9XG4gICAgICAgIHRoaXMuZXhwYW5kU2VnbWVudEdyb3VwKHRoaXMuaW5qZWN0b3IsIHRoaXMuY29uZmlnLCB0cmVlLnJvb3QsIFBSSU1BUllfT1VUTEVUKTtcbiAgICBjb25zdCBtYXBwZWQkID0gZXhwYW5kZWQkLnBpcGUobWFwKChyb290U2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXApID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmNyZWF0ZVVybFRyZWUoXG4gICAgICAgICAgc3F1YXNoU2VnbWVudEdyb3VwKHJvb3RTZWdtZW50R3JvdXApLCB0cmVlLnF1ZXJ5UGFyYW1zLCB0cmVlLmZyYWdtZW50KTtcbiAgICB9KSk7XG4gICAgcmV0dXJuIG1hcHBlZCQucGlwZShjYXRjaEVycm9yKChlOiBhbnkpOiBPYnNlcnZhYmxlPFVybFRyZWU+ID0+IHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9NYXRjaCkge1xuICAgICAgICB0aHJvdyB0aGlzLm5vTWF0Y2hFcnJvcihlKTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgZTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIG5vTWF0Y2hFcnJvcihlOiBOb01hdGNoKTogYW55IHtcbiAgICByZXR1cm4gbmV3IEVycm9yKGBDYW5ub3QgbWF0Y2ggYW55IHJvdXRlcy4gVVJMIFNlZ21lbnQ6ICcke2Uuc2VnbWVudEdyb3VwfSdgKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlVXJsVHJlZShyb290Q2FuZGlkYXRlOiBVcmxTZWdtZW50R3JvdXAsIHF1ZXJ5UGFyYW1zOiBQYXJhbXMsIGZyYWdtZW50OiBzdHJpbmd8bnVsbCk6XG4gICAgICBVcmxUcmVlIHtcbiAgICBjb25zdCByb290ID0gY3JlYXRlUm9vdChyb290Q2FuZGlkYXRlKTtcbiAgICByZXR1cm4gbmV3IFVybFRyZWUocm9vdCwgcXVlcnlQYXJhbXMsIGZyYWdtZW50KTtcbiAgfVxuXG4gIHByaXZhdGUgZXhwYW5kU2VnbWVudEdyb3VwKFxuICAgICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJvdXRlczogUm91dGVbXSwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsXG4gICAgICBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPiB7XG4gICAgaWYgKHNlZ21lbnRHcm91cC5zZWdtZW50cy5sZW5ndGggPT09IDAgJiYgc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmV4cGFuZENoaWxkcmVuKGluamVjdG9yLCByb3V0ZXMsIHNlZ21lbnRHcm91cClcbiAgICAgICAgICAucGlwZShtYXAoKGNoaWxkcmVuOiBhbnkpID0+IG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIGNoaWxkcmVuKSkpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmV4cGFuZFNlZ21lbnQoaW5qZWN0b3IsIHNlZ21lbnRHcm91cCwgcm91dGVzLCBzZWdtZW50R3JvdXAuc2VnbWVudHMsIG91dGxldCwgdHJ1ZSk7XG4gIH1cblxuICAvLyBSZWN1cnNpdmVseSBleHBhbmQgc2VnbWVudCBncm91cHMgZm9yIGFsbCB0aGUgY2hpbGQgb3V0bGV0c1xuICBwcml2YXRlIGV4cGFuZENoaWxkcmVuKFxuICAgICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJvdXRlczogUm91dGVbXSxcbiAgICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKTogT2JzZXJ2YWJsZTx7W25hbWU6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0+IHtcbiAgICAvLyBFeHBhbmQgb3V0bGV0cyBvbmUgYXQgYSB0aW1lLCBzdGFydGluZyB3aXRoIHRoZSBwcmltYXJ5IG91dGxldC4gV2UgbmVlZCB0byBkbyBpdCB0aGlzIHdheVxuICAgIC8vIGJlY2F1c2UgYW4gYWJzb2x1dGUgcmVkaXJlY3QgZnJvbSB0aGUgcHJpbWFyeSBvdXRsZXQgdGFrZXMgcHJlY2VkZW5jZS5cbiAgICBjb25zdCBjaGlsZE91dGxldHM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBPYmplY3Qua2V5cyhzZWdtZW50R3JvdXAuY2hpbGRyZW4pKSB7XG4gICAgICBpZiAoY2hpbGQgPT09ICdwcmltYXJ5Jykge1xuICAgICAgICBjaGlsZE91dGxldHMudW5zaGlmdChjaGlsZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGlsZE91dGxldHMucHVzaChjaGlsZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZyb20oY2hpbGRPdXRsZXRzKVxuICAgICAgICAucGlwZShcbiAgICAgICAgICAgIGNvbmNhdE1hcChjaGlsZE91dGxldCA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGNoaWxkID0gc2VnbWVudEdyb3VwLmNoaWxkcmVuW2NoaWxkT3V0bGV0XTtcbiAgICAgICAgICAgICAgLy8gU29ydCB0aGUgcm91dGVzIHNvIHJvdXRlcyB3aXRoIG91dGxldHMgdGhhdCBtYXRjaCB0aGUgc2VnbWVudCBhcHBlYXJcbiAgICAgICAgICAgICAgLy8gZmlyc3QsIGZvbGxvd2VkIGJ5IHJvdXRlcyBmb3Igb3RoZXIgb3V0bGV0cywgd2hpY2ggbWlnaHQgbWF0Y2ggaWYgdGhleSBoYXZlIGFuXG4gICAgICAgICAgICAgIC8vIGVtcHR5IHBhdGguXG4gICAgICAgICAgICAgIGNvbnN0IHNvcnRlZFJvdXRlcyA9IHNvcnRCeU1hdGNoaW5nT3V0bGV0cyhyb3V0ZXMsIGNoaWxkT3V0bGV0KTtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kU2VnbWVudEdyb3VwKGluamVjdG9yLCBzb3J0ZWRSb3V0ZXMsIGNoaWxkLCBjaGlsZE91dGxldClcbiAgICAgICAgICAgICAgICAgIC5waXBlKG1hcChzID0+ICh7c2VnbWVudDogcywgb3V0bGV0OiBjaGlsZE91dGxldH0pKSk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHNjYW4oXG4gICAgICAgICAgICAgICAgKGNoaWxkcmVuLCBleHBhbmRlZENoaWxkKSA9PiB7XG4gICAgICAgICAgICAgICAgICBjaGlsZHJlbltleHBhbmRlZENoaWxkLm91dGxldF0gPSBleHBhbmRlZENoaWxkLnNlZ21lbnQ7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRyZW47XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7fSBhcyB7W291dGxldDogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSksXG4gICAgICAgICAgICBsYXN0KCksXG4gICAgICAgICk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFNlZ21lbnQoXG4gICAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvciwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlczogUm91dGVbXSxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nLFxuICAgICAgYWxsb3dSZWRpcmVjdHM6IGJvb2xlYW4pOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIHJldHVybiBmcm9tKHJvdXRlcykucGlwZShcbiAgICAgICAgY29uY2F0TWFwKHIgPT4ge1xuICAgICAgICAgIGNvbnN0IGV4cGFuZGVkJCA9IHRoaXMuZXhwYW5kU2VnbWVudEFnYWluc3RSb3V0ZShcbiAgICAgICAgICAgICAgaW5qZWN0b3IsIHNlZ21lbnRHcm91cCwgcm91dGVzLCByLCBzZWdtZW50cywgb3V0bGV0LCBhbGxvd1JlZGlyZWN0cyk7XG4gICAgICAgICAgcmV0dXJuIGV4cGFuZGVkJC5waXBlKGNhdGNoRXJyb3IoKGU6IGFueSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOb01hdGNoKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvZihudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9KSxcbiAgICAgICAgZmlyc3QoKHMpOiBzIGlzIFVybFNlZ21lbnRHcm91cCA9PiAhIXMpLCBjYXRjaEVycm9yKChlOiBhbnksIF86IGFueSkgPT4ge1xuICAgICAgICAgIGlmIChlIGluc3RhbmNlb2YgRW1wdHlFcnJvciB8fCBlLm5hbWUgPT09ICdFbXB0eUVycm9yJykge1xuICAgICAgICAgICAgaWYgKG5vTGVmdG92ZXJzSW5Vcmwoc2VnbWVudEdyb3VwLCBzZWdtZW50cywgb3V0bGV0KSkge1xuICAgICAgICAgICAgICByZXR1cm4gb2YobmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBub01hdGNoKHNlZ21lbnRHcm91cCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgZXhwYW5kU2VnbWVudEFnYWluc3RSb3V0ZShcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGVzOiBSb3V0ZVtdLCByb3V0ZTogUm91dGUsXG4gICAgICBwYXRoczogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZywgYWxsb3dSZWRpcmVjdHM6IGJvb2xlYW4pOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIGlmICghaXNJbW1lZGlhdGVNYXRjaChyb3V0ZSwgc2VnbWVudEdyb3VwLCBwYXRocywgb3V0bGV0KSkge1xuICAgICAgcmV0dXJuIG5vTWF0Y2goc2VnbWVudEdyb3VwKTtcbiAgICB9XG5cbiAgICBpZiAocm91dGUucmVkaXJlY3RUbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXRjaFNlZ21lbnRBZ2FpbnN0Um91dGUoaW5qZWN0b3IsIHNlZ21lbnRHcm91cCwgcm91dGUsIHBhdGhzLCBvdXRsZXQpO1xuICAgIH1cblxuICAgIGlmIChhbGxvd1JlZGlyZWN0cyAmJiB0aGlzLmFsbG93UmVkaXJlY3RzKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRTZWdtZW50QWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgICAgICBpbmplY3Rvciwgc2VnbWVudEdyb3VwLCByb3V0ZXMsIHJvdXRlLCBwYXRocywgb3V0bGV0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm9NYXRjaChzZWdtZW50R3JvdXApO1xuICB9XG5cbiAgcHJpdmF0ZSBleHBhbmRTZWdtZW50QWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGVzOiBSb3V0ZVtdLCByb3V0ZTogUm91dGUsXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPiB7XG4gICAgaWYgKHJvdXRlLnBhdGggPT09ICcqKicpIHtcbiAgICAgIHJldHVybiB0aGlzLmV4cGFuZFdpbGRDYXJkV2l0aFBhcmFtc0FnYWluc3RSb3V0ZVVzaW5nUmVkaXJlY3QoXG4gICAgICAgICAgaW5qZWN0b3IsIHJvdXRlcywgcm91dGUsIG91dGxldCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZXhwYW5kUmVndWxhclNlZ21lbnRBZ2FpbnN0Um91dGVVc2luZ1JlZGlyZWN0KFxuICAgICAgICBpbmplY3Rvciwgc2VnbWVudEdyb3VwLCByb3V0ZXMsIHJvdXRlLCBzZWdtZW50cywgb3V0bGV0KTtcbiAgfVxuXG4gIHByaXZhdGUgZXhwYW5kV2lsZENhcmRXaXRoUGFyYW1zQWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZXM6IFJvdXRlW10sIHJvdXRlOiBSb3V0ZSxcbiAgICAgIG91dGxldDogc3RyaW5nKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgICBjb25zdCBuZXdUcmVlID0gdGhpcy5hcHBseVJlZGlyZWN0Q29tbWFuZHMoW10sIHJvdXRlLnJlZGlyZWN0VG8hLCB7fSk7XG4gICAgaWYgKHJvdXRlLnJlZGlyZWN0VG8hLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgcmV0dXJuIGFic29sdXRlUmVkaXJlY3QobmV3VHJlZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubGluZXJhbGl6ZVNlZ21lbnRzKHJvdXRlLCBuZXdUcmVlKS5waXBlKG1lcmdlTWFwKChuZXdTZWdtZW50czogVXJsU2VnbWVudFtdKSA9PiB7XG4gICAgICBjb25zdCBncm91cCA9IG5ldyBVcmxTZWdtZW50R3JvdXAobmV3U2VnbWVudHMsIHt9KTtcbiAgICAgIHJldHVybiB0aGlzLmV4cGFuZFNlZ21lbnQoaW5qZWN0b3IsIGdyb3VwLCByb3V0ZXMsIG5ld1NlZ21lbnRzLCBvdXRsZXQsIGZhbHNlKTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFJlZ3VsYXJTZWdtZW50QWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGVzOiBSb3V0ZVtdLCByb3V0ZTogUm91dGUsXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPiB7XG4gICAgY29uc3Qge21hdGNoZWQsIGNvbnN1bWVkU2VnbWVudHMsIHJlbWFpbmluZ1NlZ21lbnRzLCBwb3NpdGlvbmFsUGFyYW1TZWdtZW50c30gPVxuICAgICAgICBtYXRjaChzZWdtZW50R3JvdXAsIHJvdXRlLCBzZWdtZW50cyk7XG4gICAgaWYgKCFtYXRjaGVkKSByZXR1cm4gbm9NYXRjaChzZWdtZW50R3JvdXApO1xuXG4gICAgY29uc3QgbmV3VHJlZSA9XG4gICAgICAgIHRoaXMuYXBwbHlSZWRpcmVjdENvbW1hbmRzKGNvbnN1bWVkU2VnbWVudHMsIHJvdXRlLnJlZGlyZWN0VG8hLCBwb3NpdGlvbmFsUGFyYW1TZWdtZW50cyk7XG4gICAgaWYgKHJvdXRlLnJlZGlyZWN0VG8hLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgcmV0dXJuIGFic29sdXRlUmVkaXJlY3QobmV3VHJlZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubGluZXJhbGl6ZVNlZ21lbnRzKHJvdXRlLCBuZXdUcmVlKS5waXBlKG1lcmdlTWFwKChuZXdTZWdtZW50czogVXJsU2VnbWVudFtdKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRTZWdtZW50KFxuICAgICAgICAgIGluamVjdG9yLCBzZWdtZW50R3JvdXAsIHJvdXRlcywgbmV3U2VnbWVudHMuY29uY2F0KHJlbWFpbmluZ1NlZ21lbnRzKSwgb3V0bGV0LCBmYWxzZSk7XG4gICAgfSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBtYXRjaFNlZ21lbnRBZ2FpbnN0Um91dGUoXG4gICAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvciwgcmF3U2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlOiBSb3V0ZSxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgICBpZiAocm91dGUucGF0aCA9PT0gJyoqJykge1xuICAgICAgLy8gT25seSBjcmVhdGUgdGhlIFJvdXRlJ3MgYEVudmlyb25tZW50SW5qZWN0b3JgIGlmIGl0IG1hdGNoZXMgdGhlIGF0dGVtcHRlZCBuYXZpZ2F0aW9uXG4gICAgICBpbmplY3RvciA9IGdldE9yQ3JlYXRlUm91dGVJbmplY3RvcklmTmVlZGVkKHJvdXRlLCBpbmplY3Rvcik7XG4gICAgICBpZiAocm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgICAgIGNvbnN0IGxvYWRlZCQgPSByb3V0ZS5fbG9hZGVkUm91dGVzID9cbiAgICAgICAgICAgIG9mKHtyb3V0ZXM6IHJvdXRlLl9sb2FkZWRSb3V0ZXMsIGluamVjdG9yOiByb3V0ZS5fbG9hZGVkSW5qZWN0b3J9KSA6XG4gICAgICAgICAgICB0aGlzLmNvbmZpZ0xvYWRlci5sb2FkQ2hpbGRyZW4oaW5qZWN0b3IsIHJvdXRlKTtcbiAgICAgICAgcmV0dXJuIGxvYWRlZCQucGlwZShtYXAoKGNmZzogTG9hZGVkUm91dGVyQ29uZmlnKSA9PiB7XG4gICAgICAgICAgcm91dGUuX2xvYWRlZFJvdXRlcyA9IGNmZy5yb3V0ZXM7XG4gICAgICAgICAgcm91dGUuX2xvYWRlZEluamVjdG9yID0gY2ZnLmluamVjdG9yO1xuICAgICAgICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRzLCB7fSk7XG4gICAgICAgIH0pKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9mKG5ldyBVcmxTZWdtZW50R3JvdXAoc2VnbWVudHMsIHt9KSk7XG4gICAgfVxuXG4gICAgY29uc3Qge21hdGNoZWQsIGNvbnN1bWVkU2VnbWVudHMsIHJlbWFpbmluZ1NlZ21lbnRzfSA9IG1hdGNoKHJhd1NlZ21lbnRHcm91cCwgcm91dGUsIHNlZ21lbnRzKTtcbiAgICBpZiAoIW1hdGNoZWQpIHJldHVybiBub01hdGNoKHJhd1NlZ21lbnRHcm91cCk7XG5cbiAgICAvLyBPbmx5IGNyZWF0ZSB0aGUgUm91dGUncyBgRW52aXJvbm1lbnRJbmplY3RvcmAgaWYgaXQgbWF0Y2hlcyB0aGUgYXR0ZW1wdGVkIG5hdmlnYXRpb25cbiAgICBpbmplY3RvciA9IGdldE9yQ3JlYXRlUm91dGVJbmplY3RvcklmTmVlZGVkKHJvdXRlLCBpbmplY3Rvcik7XG4gICAgY29uc3QgY2hpbGRDb25maWckID0gdGhpcy5nZXRDaGlsZENvbmZpZyhpbmplY3Rvciwgcm91dGUsIHNlZ21lbnRzKTtcblxuICAgIHJldHVybiBjaGlsZENvbmZpZyQucGlwZShtZXJnZU1hcCgocm91dGVyQ29uZmlnOiBMb2FkZWRSb3V0ZXJDb25maWcpID0+IHtcbiAgICAgIGNvbnN0IGNoaWxkSW5qZWN0b3IgPSByb3V0ZXJDb25maWcuaW5qZWN0b3IgPz8gaW5qZWN0b3I7XG4gICAgICBjb25zdCBjaGlsZENvbmZpZyA9IHJvdXRlckNvbmZpZy5yb3V0ZXM7XG5cbiAgICAgIGNvbnN0IHtzZWdtZW50R3JvdXA6IHNwbGl0U2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50c30gPVxuICAgICAgICAgIHNwbGl0KHJhd1NlZ21lbnRHcm91cCwgY29uc3VtZWRTZWdtZW50cywgcmVtYWluaW5nU2VnbWVudHMsIGNoaWxkQ29uZmlnKTtcbiAgICAgIC8vIFNlZSBjb21tZW50IG9uIHRoZSBvdGhlciBjYWxsIHRvIGBzcGxpdGAgYWJvdXQgd2h5IHRoaXMgaXMgbmVjZXNzYXJ5LlxuICAgICAgY29uc3Qgc2VnbWVudEdyb3VwID1cbiAgICAgICAgICBuZXcgVXJsU2VnbWVudEdyb3VwKHNwbGl0U2VnbWVudEdyb3VwLnNlZ21lbnRzLCBzcGxpdFNlZ21lbnRHcm91cC5jaGlsZHJlbik7XG5cbiAgICAgIGlmIChzbGljZWRTZWdtZW50cy5sZW5ndGggPT09IDAgJiYgc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkpIHtcbiAgICAgICAgY29uc3QgZXhwYW5kZWQkID0gdGhpcy5leHBhbmRDaGlsZHJlbihjaGlsZEluamVjdG9yLCBjaGlsZENvbmZpZywgc2VnbWVudEdyb3VwKTtcbiAgICAgICAgcmV0dXJuIGV4cGFuZGVkJC5waXBlKFxuICAgICAgICAgICAgbWFwKChjaGlsZHJlbjogYW55KSA9PiBuZXcgVXJsU2VnbWVudEdyb3VwKGNvbnN1bWVkU2VnbWVudHMsIGNoaWxkcmVuKSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY2hpbGRDb25maWcubGVuZ3RoID09PSAwICYmIHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gb2YobmV3IFVybFNlZ21lbnRHcm91cChjb25zdW1lZFNlZ21lbnRzLCB7fSkpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtYXRjaGVkT25PdXRsZXQgPSBnZXRPdXRsZXQocm91dGUpID09PSBvdXRsZXQ7XG4gICAgICBjb25zdCBleHBhbmRlZCQgPSB0aGlzLmV4cGFuZFNlZ21lbnQoXG4gICAgICAgICAgY2hpbGRJbmplY3Rvciwgc2VnbWVudEdyb3VwLCBjaGlsZENvbmZpZywgc2xpY2VkU2VnbWVudHMsXG4gICAgICAgICAgbWF0Y2hlZE9uT3V0bGV0ID8gUFJJTUFSWV9PVVRMRVQgOiBvdXRsZXQsIHRydWUpO1xuICAgICAgcmV0dXJuIGV4cGFuZGVkJC5waXBlKFxuICAgICAgICAgIG1hcCgoY3M6IFVybFNlZ21lbnRHcm91cCkgPT5cbiAgICAgICAgICAgICAgICAgIG5ldyBVcmxTZWdtZW50R3JvdXAoY29uc3VtZWRTZWdtZW50cy5jb25jYXQoY3Muc2VnbWVudHMpLCBjcy5jaGlsZHJlbikpKTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIGdldENoaWxkQ29uZmlnKGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pOlxuICAgICAgT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWc+IHtcbiAgICBpZiAocm91dGUuY2hpbGRyZW4pIHtcbiAgICAgIC8vIFRoZSBjaGlsZHJlbiBiZWxvbmcgdG8gdGhlIHNhbWUgbW9kdWxlXG4gICAgICByZXR1cm4gb2Yoe3JvdXRlczogcm91dGUuY2hpbGRyZW4sIGluamVjdG9yfSk7XG4gICAgfVxuXG4gICAgaWYgKHJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgICAgLy8gbGF6eSBjaGlsZHJlbiBiZWxvbmcgdG8gdGhlIGxvYWRlZCBtb2R1bGVcbiAgICAgIGlmIChyb3V0ZS5fbG9hZGVkUm91dGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIG9mKHtyb3V0ZXM6IHJvdXRlLl9sb2FkZWRSb3V0ZXMsIGluamVjdG9yOiByb3V0ZS5fbG9hZGVkSW5qZWN0b3J9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMucnVuQ2FuTG9hZEd1YXJkcyhpbmplY3Rvciwgcm91dGUsIHNlZ21lbnRzKVxuICAgICAgICAgIC5waXBlKG1lcmdlTWFwKChzaG91bGRMb2FkUmVzdWx0OiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgICBpZiAoc2hvdWxkTG9hZFJlc3VsdCkge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25maWdMb2FkZXIubG9hZENoaWxkcmVuKGluamVjdG9yLCByb3V0ZSlcbiAgICAgICAgICAgICAgICAgIC5waXBlKHRhcCgoY2ZnOiBMb2FkZWRSb3V0ZXJDb25maWcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUuX2xvYWRlZFJvdXRlcyA9IGNmZy5yb3V0ZXM7XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRJbmplY3RvciA9IGNmZy5pbmplY3RvcjtcbiAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjYW5Mb2FkRmFpbHMocm91dGUpO1xuICAgICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb2Yoe3JvdXRlczogW10sIGluamVjdG9yfSk7XG4gIH1cblxuICBwcml2YXRlIHJ1bkNhbkxvYWRHdWFyZHMoaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJvdXRlOiBSb3V0ZSwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSk6XG4gICAgICBPYnNlcnZhYmxlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBjYW5Mb2FkID0gcm91dGUuY2FuTG9hZDtcbiAgICBpZiAoIWNhbkxvYWQgfHwgY2FuTG9hZC5sZW5ndGggPT09IDApIHJldHVybiBvZih0cnVlKTtcblxuICAgIGNvbnN0IGNhbkxvYWRPYnNlcnZhYmxlcyA9IGNhbkxvYWQubWFwKChpbmplY3Rpb25Ub2tlbjogYW55KSA9PiB7XG4gICAgICBjb25zdCBndWFyZCA9IGluamVjdG9yLmdldChpbmplY3Rpb25Ub2tlbik7XG4gICAgICBsZXQgZ3VhcmRWYWw7XG4gICAgICBpZiAoaXNDYW5Mb2FkKGd1YXJkKSkge1xuICAgICAgICBndWFyZFZhbCA9IGd1YXJkLmNhbkxvYWQocm91dGUsIHNlZ21lbnRzKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbjxDYW5Mb2FkRm4+KGd1YXJkKSkge1xuICAgICAgICBndWFyZFZhbCA9IGd1YXJkKHJvdXRlLCBzZWdtZW50cyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgQ2FuTG9hZCBndWFyZCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHdyYXBJbnRvT2JzZXJ2YWJsZShndWFyZFZhbCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gb2YoY2FuTG9hZE9ic2VydmFibGVzKVxuICAgICAgICAucGlwZShcbiAgICAgICAgICAgIHByaW9yaXRpemVkR3VhcmRWYWx1ZSgpLFxuICAgICAgICAgICAgdGFwKChyZXN1bHQ6IFVybFRyZWV8Ym9vbGVhbikgPT4ge1xuICAgICAgICAgICAgICBpZiAoIWlzVXJsVHJlZShyZXN1bHQpKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgY29uc3QgZXJyb3I6IEVycm9yJnt1cmw/OiBVcmxUcmVlfSA9IG5hdmlnYXRpb25DYW5jZWxpbmdFcnJvcihcbiAgICAgICAgICAgICAgICAgIGBSZWRpcmVjdGluZyB0byBcIiR7dGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZShyZXN1bHQpfVwiYCk7XG4gICAgICAgICAgICAgIGVycm9yLnVybCA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG1hcChyZXN1bHQgPT4gcmVzdWx0ID09PSB0cnVlKSxcbiAgICAgICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgbGluZXJhbGl6ZVNlZ21lbnRzKHJvdXRlOiBSb3V0ZSwgdXJsVHJlZTogVXJsVHJlZSk6IE9ic2VydmFibGU8VXJsU2VnbWVudFtdPiB7XG4gICAgbGV0IHJlczogVXJsU2VnbWVudFtdID0gW107XG4gICAgbGV0IGMgPSB1cmxUcmVlLnJvb3Q7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHJlcyA9IHJlcy5jb25jYXQoYy5zZWdtZW50cyk7XG4gICAgICBpZiAoYy5udW1iZXJPZkNoaWxkcmVuID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvZihyZXMpO1xuICAgICAgfVxuXG4gICAgICBpZiAoYy5udW1iZXJPZkNoaWxkcmVuID4gMSB8fCAhYy5jaGlsZHJlbltQUklNQVJZX09VVExFVF0pIHtcbiAgICAgICAgcmV0dXJuIG5hbWVkT3V0bGV0c1JlZGlyZWN0KHJvdXRlLnJlZGlyZWN0VG8hKTtcbiAgICAgIH1cblxuICAgICAgYyA9IGMuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXBwbHlSZWRpcmVjdENvbW1hbmRzKFxuICAgICAgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgcmVkaXJlY3RUbzogc3RyaW5nLCBwb3NQYXJhbXM6IHtbazogc3RyaW5nXTogVXJsU2VnbWVudH0pOiBVcmxUcmVlIHtcbiAgICByZXR1cm4gdGhpcy5hcHBseVJlZGlyZWN0Q3JlYXRyZVVybFRyZWUoXG4gICAgICAgIHJlZGlyZWN0VG8sIHRoaXMudXJsU2VyaWFsaXplci5wYXJzZShyZWRpcmVjdFRvKSwgc2VnbWVudHMsIHBvc1BhcmFtcyk7XG4gIH1cblxuICBwcml2YXRlIGFwcGx5UmVkaXJlY3RDcmVhdHJlVXJsVHJlZShcbiAgICAgIHJlZGlyZWN0VG86IHN0cmluZywgdXJsVHJlZTogVXJsVHJlZSwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICAgIHBvc1BhcmFtczoge1trOiBzdHJpbmddOiBVcmxTZWdtZW50fSk6IFVybFRyZWUge1xuICAgIGNvbnN0IG5ld1Jvb3QgPSB0aGlzLmNyZWF0ZVNlZ21lbnRHcm91cChyZWRpcmVjdFRvLCB1cmxUcmVlLnJvb3QsIHNlZ21lbnRzLCBwb3NQYXJhbXMpO1xuICAgIHJldHVybiBuZXcgVXJsVHJlZShcbiAgICAgICAgbmV3Um9vdCwgdGhpcy5jcmVhdGVRdWVyeVBhcmFtcyh1cmxUcmVlLnF1ZXJ5UGFyYW1zLCB0aGlzLnVybFRyZWUucXVlcnlQYXJhbXMpLFxuICAgICAgICB1cmxUcmVlLmZyYWdtZW50KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlUXVlcnlQYXJhbXMocmVkaXJlY3RUb1BhcmFtczogUGFyYW1zLCBhY3R1YWxQYXJhbXM6IFBhcmFtcyk6IFBhcmFtcyB7XG4gICAgY29uc3QgcmVzOiBQYXJhbXMgPSB7fTtcbiAgICBmb3JFYWNoKHJlZGlyZWN0VG9QYXJhbXMsICh2OiBhbnksIGs6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgY29weVNvdXJjZVZhbHVlID0gdHlwZW9mIHYgPT09ICdzdHJpbmcnICYmIHYuc3RhcnRzV2l0aCgnOicpO1xuICAgICAgaWYgKGNvcHlTb3VyY2VWYWx1ZSkge1xuICAgICAgICBjb25zdCBzb3VyY2VOYW1lID0gdi5zdWJzdHJpbmcoMSk7XG4gICAgICAgIHJlc1trXSA9IGFjdHVhbFBhcmFtc1tzb3VyY2VOYW1lXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc1trXSA9IHY7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlU2VnbWVudEdyb3VwKFxuICAgICAgcmVkaXJlY3RUbzogc3RyaW5nLCBncm91cDogVXJsU2VnbWVudEdyb3VwLCBzZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgICAgcG9zUGFyYW1zOiB7W2s6IHN0cmluZ106IFVybFNlZ21lbnR9KTogVXJsU2VnbWVudEdyb3VwIHtcbiAgICBjb25zdCB1cGRhdGVkU2VnbWVudHMgPSB0aGlzLmNyZWF0ZVNlZ21lbnRzKHJlZGlyZWN0VG8sIGdyb3VwLnNlZ21lbnRzLCBzZWdtZW50cywgcG9zUGFyYW1zKTtcblxuICAgIGxldCBjaGlsZHJlbjoge1tuOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gICAgZm9yRWFjaChncm91cC5jaGlsZHJlbiwgKGNoaWxkOiBVcmxTZWdtZW50R3JvdXAsIG5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgY2hpbGRyZW5bbmFtZV0gPSB0aGlzLmNyZWF0ZVNlZ21lbnRHcm91cChyZWRpcmVjdFRvLCBjaGlsZCwgc2VnbWVudHMsIHBvc1BhcmFtcyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cCh1cGRhdGVkU2VnbWVudHMsIGNoaWxkcmVuKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlU2VnbWVudHMoXG4gICAgICByZWRpcmVjdFRvOiBzdHJpbmcsIHJlZGlyZWN0VG9TZWdtZW50czogVXJsU2VnbWVudFtdLCBhY3R1YWxTZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgICAgcG9zUGFyYW1zOiB7W2s6IHN0cmluZ106IFVybFNlZ21lbnR9KTogVXJsU2VnbWVudFtdIHtcbiAgICByZXR1cm4gcmVkaXJlY3RUb1NlZ21lbnRzLm1hcChcbiAgICAgICAgcyA9PiBzLnBhdGguc3RhcnRzV2l0aCgnOicpID8gdGhpcy5maW5kUG9zUGFyYW0ocmVkaXJlY3RUbywgcywgcG9zUGFyYW1zKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmluZE9yUmV0dXJuKHMsIGFjdHVhbFNlZ21lbnRzKSk7XG4gIH1cblxuICBwcml2YXRlIGZpbmRQb3NQYXJhbShcbiAgICAgIHJlZGlyZWN0VG86IHN0cmluZywgcmVkaXJlY3RUb1VybFNlZ21lbnQ6IFVybFNlZ21lbnQsXG4gICAgICBwb3NQYXJhbXM6IHtbazogc3RyaW5nXTogVXJsU2VnbWVudH0pOiBVcmxTZWdtZW50IHtcbiAgICBjb25zdCBwb3MgPSBwb3NQYXJhbXNbcmVkaXJlY3RUb1VybFNlZ21lbnQucGF0aC5zdWJzdHJpbmcoMSldO1xuICAgIGlmICghcG9zKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBDYW5ub3QgcmVkaXJlY3QgdG8gJyR7cmVkaXJlY3RUb30nLiBDYW5ub3QgZmluZCAnJHtyZWRpcmVjdFRvVXJsU2VnbWVudC5wYXRofScuYCk7XG4gICAgcmV0dXJuIHBvcztcbiAgfVxuXG4gIHByaXZhdGUgZmluZE9yUmV0dXJuKHJlZGlyZWN0VG9VcmxTZWdtZW50OiBVcmxTZWdtZW50LCBhY3R1YWxTZWdtZW50czogVXJsU2VnbWVudFtdKTogVXJsU2VnbWVudCB7XG4gICAgbGV0IGlkeCA9IDA7XG4gICAgZm9yIChjb25zdCBzIG9mIGFjdHVhbFNlZ21lbnRzKSB7XG4gICAgICBpZiAocy5wYXRoID09PSByZWRpcmVjdFRvVXJsU2VnbWVudC5wYXRoKSB7XG4gICAgICAgIGFjdHVhbFNlZ21lbnRzLnNwbGljZShpZHgpO1xuICAgICAgICByZXR1cm4gcztcbiAgICAgIH1cbiAgICAgIGlkeCsrO1xuICAgIH1cbiAgICByZXR1cm4gcmVkaXJlY3RUb1VybFNlZ21lbnQ7XG4gIH1cbn1cbiJdfQ==