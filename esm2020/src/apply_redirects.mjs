/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ɵRuntimeError as RuntimeError } from '@angular/core';
import { EmptyError, from, of, throwError } from 'rxjs';
import { catchError, concatMap, first, last, map, mergeMap, scan, tap } from 'rxjs/operators';
import { prioritizedGuardValue } from './operators/prioritized_guard_value';
import { navigationCancelingError, PRIMARY_OUTLET, REDIRECTING_CANCELLATION_REASON } from './shared';
import { UrlSegmentGroup, UrlTree } from './url_tree';
import { forEach, wrapIntoObservable } from './utils/collection';
import { getOrCreateRouteInjectorIfNeeded, getOutlet, sortByMatchingOutlets } from './utils/config';
import { isImmediateMatch, match, noLeftoversInUrl, split } from './utils/config_matching';
import { isCanLoad, isUrlTree } from './utils/type_guards';
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || ngDevMode;
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
    return throwError(new RuntimeError(4000 /* RuntimeErrorCode.NAMED_OUTLET_REDIRECT */, NG_DEV_MODE &&
        `Only absolute redirects can have named outlets. redirectTo: '${redirectTo}'`));
}
function canLoadFails(route) {
    return throwError(navigationCancelingError(NG_DEV_MODE &&
        `Cannot load children because the guard of the route "path: '${route.path}'" returned false`));
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
        return new RuntimeError(4002 /* RuntimeErrorCode.NO_MATCH */, NG_DEV_MODE && `Cannot match any routes. URL Segment: '${e.segmentGroup}'`);
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
            const guardVal = isCanLoad(guard) ? guard.canLoad(route, segments) : guard(route, segments);
            return wrapIntoObservable(guardVal);
        });
        return of(canLoadObservables)
            .pipe(prioritizedGuardValue(), tap((result) => {
            if (!isUrlTree(result))
                return;
            const error = navigationCancelingError(REDIRECTING_CANCELLATION_REASON + this.urlSerializer.serialize(result));
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
            throw new RuntimeError(4001 /* RuntimeErrorCode.MISSING_REDIRECT */, NG_DEV_MODE &&
                `Cannot redirect to '${redirectTo}'. Cannot find '${redirectToUrlSegment.path}'.`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHlfcmVkaXJlY3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9hcHBseV9yZWRpcmVjdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFzQixhQUFhLElBQUksWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ2pGLE9BQU8sRUFBQyxVQUFVLEVBQUUsSUFBSSxFQUFjLEVBQUUsRUFBRSxVQUFVLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDbEUsT0FBTyxFQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUk1RixPQUFPLEVBQUMscUJBQXFCLEVBQUMsTUFBTSxxQ0FBcUMsQ0FBQztBQUUxRSxPQUFPLEVBQUMsd0JBQXdCLEVBQVUsY0FBYyxFQUFFLCtCQUErQixFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzNHLE9BQU8sRUFBYSxlQUFlLEVBQWlCLE9BQU8sRUFBQyxNQUFNLFlBQVksQ0FBQztBQUMvRSxPQUFPLEVBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDL0QsT0FBTyxFQUFDLGdDQUFnQyxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ2xHLE9BQU8sRUFBQyxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDekYsT0FBTyxFQUFDLFNBQVMsRUFBYyxTQUFTLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUVyRSxNQUFNLFdBQVcsR0FBRyxPQUFPLFNBQVMsS0FBSyxXQUFXLElBQUksU0FBUyxDQUFDO0FBRWxFLE1BQU0sT0FBTztJQUdYLFlBQVksWUFB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LEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakQsMkJBQTJCO1FBQzNCLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUN0RSxXQUFXLENBQUMsV0FBVyxDQUFDLEdBQUcsY0FBYyxDQUFDO1NBQzNDO0tBQ0Y7SUFDRCxNQUFNLENBQUMsR0FBRyxJQUFJLGVBQWUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ2xFLE9BQU8sb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0Vudmlyb25tZW50SW5qZWN0b3IsIMm1UnVudGltZUVycm9yIGFzIFJ1bnRpbWVFcnJvcn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0VtcHR5RXJyb3IsIGZyb20sIE9ic2VydmFibGUsIG9mLCB0aHJvd0Vycm9yfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y2F0Y2hFcnJvciwgY29uY2F0TWFwLCBmaXJzdCwgbGFzdCwgbWFwLCBtZXJnZU1hcCwgc2NhbiwgdGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7UnVudGltZUVycm9yQ29kZX0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IHtDYW5Mb2FkLCBDYW5Mb2FkRm4sIExvYWRlZFJvdXRlckNvbmZpZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtwcmlvcml0aXplZEd1YXJkVmFsdWV9IGZyb20gJy4vb3BlcmF0b3JzL3ByaW9yaXRpemVkX2d1YXJkX3ZhbHVlJztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7bmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yLCBQYXJhbXMsIFBSSU1BUllfT1VUTEVULCBSRURJUkVDVElOR19DQU5DRUxMQVRJT05fUkVBU09OfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge1VybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cCwgVXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge2ZvckVhY2gsIHdyYXBJbnRvT2JzZXJ2YWJsZX0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcbmltcG9ydCB7Z2V0T3JDcmVhdGVSb3V0ZUluamVjdG9ySWZOZWVkZWQsIGdldE91dGxldCwgc29ydEJ5TWF0Y2hpbmdPdXRsZXRzfSBmcm9tICcuL3V0aWxzL2NvbmZpZyc7XG5pbXBvcnQge2lzSW1tZWRpYXRlTWF0Y2gsIG1hdGNoLCBub0xlZnRvdmVyc0luVXJsLCBzcGxpdH0gZnJvbSAnLi91dGlscy9jb25maWdfbWF0Y2hpbmcnO1xuaW1wb3J0IHtpc0NhbkxvYWQsIGlzRnVuY3Rpb24sIGlzVXJsVHJlZX0gZnJvbSAnLi91dGlscy90eXBlX2d1YXJkcyc7XG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlO1xuXG5jbGFzcyBOb01hdGNoIHtcbiAgcHVibGljIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwfG51bGw7XG5cbiAgY29uc3RydWN0b3Ioc2VnbWVudEdyb3VwPzogVXJsU2VnbWVudEdyb3VwKSB7XG4gICAgdGhpcy5zZWdtZW50R3JvdXAgPSBzZWdtZW50R3JvdXAgfHwgbnVsbDtcbiAgfVxufVxuXG5jbGFzcyBBYnNvbHV0ZVJlZGlyZWN0IHtcbiAgY29uc3RydWN0b3IocHVibGljIHVybFRyZWU6IFVybFRyZWUpIHt9XG59XG5cbmZ1bmN0aW9uIG5vTWF0Y2goc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXApOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICByZXR1cm4gdGhyb3dFcnJvcihuZXcgTm9NYXRjaChzZWdtZW50R3JvdXApKTtcbn1cblxuZnVuY3Rpb24gYWJzb2x1dGVSZWRpcmVjdChuZXdUcmVlOiBVcmxUcmVlKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgcmV0dXJuIHRocm93RXJyb3IobmV3IEFic29sdXRlUmVkaXJlY3QobmV3VHJlZSkpO1xufVxuXG5mdW5jdGlvbiBuYW1lZE91dGxldHNSZWRpcmVjdChyZWRpcmVjdFRvOiBzdHJpbmcpOiBPYnNlcnZhYmxlPGFueT4ge1xuICByZXR1cm4gdGhyb3dFcnJvcihuZXcgUnVudGltZUVycm9yKFxuICAgICAgUnVudGltZUVycm9yQ29kZS5OQU1FRF9PVVRMRVRfUkVESVJFQ1QsXG4gICAgICBOR19ERVZfTU9ERSAmJlxuICAgICAgICAgIGBPbmx5IGFic29sdXRlIHJlZGlyZWN0cyBjYW4gaGF2ZSBuYW1lZCBvdXRsZXRzLiByZWRpcmVjdFRvOiAnJHtyZWRpcmVjdFRvfSdgKSk7XG59XG5cbmZ1bmN0aW9uIGNhbkxvYWRGYWlscyhyb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4ge1xuICByZXR1cm4gdGhyb3dFcnJvcihuYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoXG4gICAgICBOR19ERVZfTU9ERSAmJlxuICAgICAgYENhbm5vdCBsb2FkIGNoaWxkcmVuIGJlY2F1c2UgdGhlIGd1YXJkIG9mIHRoZSByb3V0ZSBcInBhdGg6ICcke1xuICAgICAgICAgIHJvdXRlLnBhdGh9J1wiIHJldHVybmVkIGZhbHNlYCkpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGBVcmxUcmVlYCB3aXRoIHRoZSByZWRpcmVjdGlvbiBhcHBsaWVkLlxuICpcbiAqIExhenkgbW9kdWxlcyBhcmUgbG9hZGVkIGFsb25nIHRoZSB3YXkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVJlZGlyZWN0cyhcbiAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvciwgY29uZmlnTG9hZGVyOiBSb3V0ZXJDb25maWdMb2FkZXIsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgdXJsVHJlZTogVXJsVHJlZSwgY29uZmlnOiBSb3V0ZXMpOiBPYnNlcnZhYmxlPFVybFRyZWU+IHtcbiAgcmV0dXJuIG5ldyBBcHBseVJlZGlyZWN0cyhpbmplY3RvciwgY29uZmlnTG9hZGVyLCB1cmxTZXJpYWxpemVyLCB1cmxUcmVlLCBjb25maWcpLmFwcGx5KCk7XG59XG5cbmNsYXNzIEFwcGx5UmVkaXJlY3RzIHtcbiAgcHJpdmF0ZSBhbGxvd1JlZGlyZWN0czogYm9vbGVhbiA9IHRydWU7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCBwcml2YXRlIGNvbmZpZ0xvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyLFxuICAgICAgcHJpdmF0ZSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLCBwcml2YXRlIHVybFRyZWU6IFVybFRyZWUsIHByaXZhdGUgY29uZmlnOiBSb3V0ZXMpIHt9XG5cbiAgYXBwbHkoKTogT2JzZXJ2YWJsZTxVcmxUcmVlPiB7XG4gICAgY29uc3Qgc3BsaXRHcm91cCA9IHNwbGl0KHRoaXMudXJsVHJlZS5yb290LCBbXSwgW10sIHRoaXMuY29uZmlnKS5zZWdtZW50R3JvdXA7XG4gICAgLy8gVE9ETyhhdHNjb3R0KTogY3JlYXRpbmcgYSBuZXcgc2VnbWVudCByZW1vdmVzIHRoZSBfc291cmNlU2VnbWVudCBfc2VnbWVudEluZGV4U2hpZnQsIHdoaWNoIGlzXG4gICAgLy8gb25seSBuZWNlc3NhcnkgdG8gcHJldmVudCBmYWlsdXJlcyBpbiB0ZXN0cyB3aGljaCBhc3NlcnQgZXhhY3Qgb2JqZWN0IG1hdGNoZXMuIFRoZSBgc3BsaXRgIGlzXG4gICAgLy8gbm93IHNoYXJlZCBiZXR3ZWVuIGBhcHBseVJlZGlyZWN0c2AgYW5kIGByZWNvZ25pemVgIGJ1dCBvbmx5IHRoZSBgcmVjb2duaXplYCBzdGVwIG5lZWRzIHRoZXNlXG4gICAgLy8gcHJvcGVydGllcy4gQmVmb3JlIHRoZSBpbXBsZW1lbnRhdGlvbnMgd2VyZSBtZXJnZWQsIHRoZSBgYXBwbHlSZWRpcmVjdHNgIHdvdWxkIG5vdCBhc3NpZ25cbiAgICAvLyB0aGVtLiBXZSBzaG91bGQgYmUgYWJsZSB0byByZW1vdmUgdGhpcyBsb2dpYyBhcyBhIFwiYnJlYWtpbmcgY2hhbmdlXCIgYnV0IHNob3VsZCBkbyBzb21lIG1vcmVcbiAgICAvLyBpbnZlc3RpZ2F0aW9uIGludG8gdGhlIGZhaWx1cmVzIGZpcnN0LlxuICAgIGNvbnN0IHJvb3RTZWdtZW50R3JvdXAgPSBuZXcgVXJsU2VnbWVudEdyb3VwKHNwbGl0R3JvdXAuc2VnbWVudHMsIHNwbGl0R3JvdXAuY2hpbGRyZW4pO1xuXG4gICAgY29uc3QgZXhwYW5kZWQkID1cbiAgICAgICAgdGhpcy5leHBhbmRTZWdtZW50R3JvdXAodGhpcy5pbmplY3RvciwgdGhpcy5jb25maWcsIHJvb3RTZWdtZW50R3JvdXAsIFBSSU1BUllfT1VUTEVUKTtcbiAgICBjb25zdCB1cmxUcmVlcyQgPSBleHBhbmRlZCQucGlwZShtYXAoKHJvb3RTZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCkgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlVXJsVHJlZShcbiAgICAgICAgICBzcXVhc2hTZWdtZW50R3JvdXAocm9vdFNlZ21lbnRHcm91cCksIHRoaXMudXJsVHJlZS5xdWVyeVBhcmFtcywgdGhpcy51cmxUcmVlLmZyYWdtZW50KTtcbiAgICB9KSk7XG4gICAgcmV0dXJuIHVybFRyZWVzJC5waXBlKGNhdGNoRXJyb3IoKGU6IGFueSkgPT4ge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBBYnNvbHV0ZVJlZGlyZWN0KSB7XG4gICAgICAgIC8vIEFmdGVyIGFuIGFic29sdXRlIHJlZGlyZWN0IHdlIGRvIG5vdCBhcHBseSBhbnkgbW9yZSByZWRpcmVjdHMhXG4gICAgICAgIC8vIElmIHRoaXMgaW1wbGVtZW50YXRpb24gY2hhbmdlcywgdXBkYXRlIHRoZSBkb2N1bWVudGF0aW9uIG5vdGUgaW4gYHJlZGlyZWN0VG9gLlxuICAgICAgICB0aGlzLmFsbG93UmVkaXJlY3RzID0gZmFsc2U7XG4gICAgICAgIC8vIHdlIG5lZWQgdG8gcnVuIG1hdGNoaW5nLCBzbyB3ZSBjYW4gZmV0Y2ggYWxsIGxhenktbG9hZGVkIG1vZHVsZXNcbiAgICAgICAgcmV0dXJuIHRoaXMubWF0Y2goZS51cmxUcmVlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOb01hdGNoKSB7XG4gICAgICAgIHRocm93IHRoaXMubm9NYXRjaEVycm9yKGUpO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlO1xuICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgbWF0Y2godHJlZTogVXJsVHJlZSk6IE9ic2VydmFibGU8VXJsVHJlZT4ge1xuICAgIGNvbnN0IGV4cGFuZGVkJCA9XG4gICAgICAgIHRoaXMuZXhwYW5kU2VnbWVudEdyb3VwKHRoaXMuaW5qZWN0b3IsIHRoaXMuY29uZmlnLCB0cmVlLnJvb3QsIFBSSU1BUllfT1VUTEVUKTtcbiAgICBjb25zdCBtYXBwZWQkID0gZXhwYW5kZWQkLnBpcGUobWFwKChyb290U2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXApID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmNyZWF0ZVVybFRyZWUoXG4gICAgICAgICAgc3F1YXNoU2VnbWVudEdyb3VwKHJvb3RTZWdtZW50R3JvdXApLCB0cmVlLnF1ZXJ5UGFyYW1zLCB0cmVlLmZyYWdtZW50KTtcbiAgICB9KSk7XG4gICAgcmV0dXJuIG1hcHBlZCQucGlwZShjYXRjaEVycm9yKChlOiBhbnkpOiBPYnNlcnZhYmxlPFVybFRyZWU+ID0+IHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9NYXRjaCkge1xuICAgICAgICB0aHJvdyB0aGlzLm5vTWF0Y2hFcnJvcihlKTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgZTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIG5vTWF0Y2hFcnJvcihlOiBOb01hdGNoKTogYW55IHtcbiAgICByZXR1cm4gbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgUnVudGltZUVycm9yQ29kZS5OT19NQVRDSCxcbiAgICAgICAgTkdfREVWX01PREUgJiYgYENhbm5vdCBtYXRjaCBhbnkgcm91dGVzLiBVUkwgU2VnbWVudDogJyR7ZS5zZWdtZW50R3JvdXB9J2ApO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVVcmxUcmVlKHJvb3RDYW5kaWRhdGU6IFVybFNlZ21lbnRHcm91cCwgcXVlcnlQYXJhbXM6IFBhcmFtcywgZnJhZ21lbnQ6IHN0cmluZ3xudWxsKTpcbiAgICAgIFVybFRyZWUge1xuICAgIGNvbnN0IHJvb3QgPSByb290Q2FuZGlkYXRlLnNlZ21lbnRzLmxlbmd0aCA+IDAgP1xuICAgICAgICBuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCB7W1BSSU1BUllfT1VUTEVUXTogcm9vdENhbmRpZGF0ZX0pIDpcbiAgICAgICAgcm9vdENhbmRpZGF0ZTtcbiAgICByZXR1cm4gbmV3IFVybFRyZWUocm9vdCwgcXVlcnlQYXJhbXMsIGZyYWdtZW50KTtcbiAgfVxuXG4gIHByaXZhdGUgZXhwYW5kU2VnbWVudEdyb3VwKFxuICAgICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJvdXRlczogUm91dGVbXSwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsXG4gICAgICBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPiB7XG4gICAgaWYgKHNlZ21lbnRHcm91cC5zZWdtZW50cy5sZW5ndGggPT09IDAgJiYgc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmV4cGFuZENoaWxkcmVuKGluamVjdG9yLCByb3V0ZXMsIHNlZ21lbnRHcm91cClcbiAgICAgICAgICAucGlwZShtYXAoKGNoaWxkcmVuOiBhbnkpID0+IG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIGNoaWxkcmVuKSkpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmV4cGFuZFNlZ21lbnQoaW5qZWN0b3IsIHNlZ21lbnRHcm91cCwgcm91dGVzLCBzZWdtZW50R3JvdXAuc2VnbWVudHMsIG91dGxldCwgdHJ1ZSk7XG4gIH1cblxuICAvLyBSZWN1cnNpdmVseSBleHBhbmQgc2VnbWVudCBncm91cHMgZm9yIGFsbCB0aGUgY2hpbGQgb3V0bGV0c1xuICBwcml2YXRlIGV4cGFuZENoaWxkcmVuKFxuICAgICAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJvdXRlczogUm91dGVbXSxcbiAgICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKTogT2JzZXJ2YWJsZTx7W25hbWU6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0+IHtcbiAgICAvLyBFeHBhbmQgb3V0bGV0cyBvbmUgYXQgYSB0aW1lLCBzdGFydGluZyB3aXRoIHRoZSBwcmltYXJ5IG91dGxldC4gV2UgbmVlZCB0byBkbyBpdCB0aGlzIHdheVxuICAgIC8vIGJlY2F1c2UgYW4gYWJzb2x1dGUgcmVkaXJlY3QgZnJvbSB0aGUgcHJpbWFyeSBvdXRsZXQgdGFrZXMgcHJlY2VkZW5jZS5cbiAgICBjb25zdCBjaGlsZE91dGxldHM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBPYmplY3Qua2V5cyhzZWdtZW50R3JvdXAuY2hpbGRyZW4pKSB7XG4gICAgICBpZiAoY2hpbGQgPT09ICdwcmltYXJ5Jykge1xuICAgICAgICBjaGlsZE91dGxldHMudW5zaGlmdChjaGlsZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGlsZE91dGxldHMucHVzaChjaGlsZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZyb20oY2hpbGRPdXRsZXRzKVxuICAgICAgICAucGlwZShcbiAgICAgICAgICAgIGNvbmNhdE1hcChjaGlsZE91dGxldCA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGNoaWxkID0gc2VnbWVudEdyb3VwLmNoaWxkcmVuW2NoaWxkT3V0bGV0XTtcbiAgICAgICAgICAgICAgLy8gU29ydCB0aGUgcm91dGVzIHNvIHJvdXRlcyB3aXRoIG91dGxldHMgdGhhdCBtYXRjaCB0aGUgc2VnbWVudCBhcHBlYXJcbiAgICAgICAgICAgICAgLy8gZmlyc3QsIGZvbGxvd2VkIGJ5IHJvdXRlcyBmb3Igb3RoZXIgb3V0bGV0cywgd2hpY2ggbWlnaHQgbWF0Y2ggaWYgdGhleSBoYXZlIGFuXG4gICAgICAgICAgICAgIC8vIGVtcHR5IHBhdGguXG4gICAgICAgICAgICAgIGNvbnN0IHNvcnRlZFJvdXRlcyA9IHNvcnRCeU1hdGNoaW5nT3V0bGV0cyhyb3V0ZXMsIGNoaWxkT3V0bGV0KTtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kU2VnbWVudEdyb3VwKGluamVjdG9yLCBzb3J0ZWRSb3V0ZXMsIGNoaWxkLCBjaGlsZE91dGxldClcbiAgICAgICAgICAgICAgICAgIC5waXBlKG1hcChzID0+ICh7c2VnbWVudDogcywgb3V0bGV0OiBjaGlsZE91dGxldH0pKSk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHNjYW4oXG4gICAgICAgICAgICAgICAgKGNoaWxkcmVuLCBleHBhbmRlZENoaWxkKSA9PiB7XG4gICAgICAgICAgICAgICAgICBjaGlsZHJlbltleHBhbmRlZENoaWxkLm91dGxldF0gPSBleHBhbmRlZENoaWxkLnNlZ21lbnQ7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRyZW47XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7fSBhcyB7W291dGxldDogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSksXG4gICAgICAgICAgICBsYXN0KCksXG4gICAgICAgICk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFNlZ21lbnQoXG4gICAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvciwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlczogUm91dGVbXSxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nLFxuICAgICAgYWxsb3dSZWRpcmVjdHM6IGJvb2xlYW4pOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIHJldHVybiBmcm9tKHJvdXRlcykucGlwZShcbiAgICAgICAgY29uY2F0TWFwKHIgPT4ge1xuICAgICAgICAgIGNvbnN0IGV4cGFuZGVkJCA9IHRoaXMuZXhwYW5kU2VnbWVudEFnYWluc3RSb3V0ZShcbiAgICAgICAgICAgICAgaW5qZWN0b3IsIHNlZ21lbnRHcm91cCwgcm91dGVzLCByLCBzZWdtZW50cywgb3V0bGV0LCBhbGxvd1JlZGlyZWN0cyk7XG4gICAgICAgICAgcmV0dXJuIGV4cGFuZGVkJC5waXBlKGNhdGNoRXJyb3IoKGU6IGFueSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOb01hdGNoKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvZihudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9KSxcbiAgICAgICAgZmlyc3QoKHMpOiBzIGlzIFVybFNlZ21lbnRHcm91cCA9PiAhIXMpLCBjYXRjaEVycm9yKChlOiBhbnksIF86IGFueSkgPT4ge1xuICAgICAgICAgIGlmIChlIGluc3RhbmNlb2YgRW1wdHlFcnJvciB8fCBlLm5hbWUgPT09ICdFbXB0eUVycm9yJykge1xuICAgICAgICAgICAgaWYgKG5vTGVmdG92ZXJzSW5Vcmwoc2VnbWVudEdyb3VwLCBzZWdtZW50cywgb3V0bGV0KSkge1xuICAgICAgICAgICAgICByZXR1cm4gb2YobmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBub01hdGNoKHNlZ21lbnRHcm91cCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgZXhwYW5kU2VnbWVudEFnYWluc3RSb3V0ZShcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGVzOiBSb3V0ZVtdLCByb3V0ZTogUm91dGUsXG4gICAgICBwYXRoczogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZywgYWxsb3dSZWRpcmVjdHM6IGJvb2xlYW4pOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIGlmICghaXNJbW1lZGlhdGVNYXRjaChyb3V0ZSwgc2VnbWVudEdyb3VwLCBwYXRocywgb3V0bGV0KSkge1xuICAgICAgcmV0dXJuIG5vTWF0Y2goc2VnbWVudEdyb3VwKTtcbiAgICB9XG5cbiAgICBpZiAocm91dGUucmVkaXJlY3RUbyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXRjaFNlZ21lbnRBZ2FpbnN0Um91dGUoaW5qZWN0b3IsIHNlZ21lbnRHcm91cCwgcm91dGUsIHBhdGhzLCBvdXRsZXQpO1xuICAgIH1cblxuICAgIGlmIChhbGxvd1JlZGlyZWN0cyAmJiB0aGlzLmFsbG93UmVkaXJlY3RzKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRTZWdtZW50QWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgICAgICBpbmplY3Rvciwgc2VnbWVudEdyb3VwLCByb3V0ZXMsIHJvdXRlLCBwYXRocywgb3V0bGV0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm9NYXRjaChzZWdtZW50R3JvdXApO1xuICB9XG5cbiAgcHJpdmF0ZSBleHBhbmRTZWdtZW50QWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGVzOiBSb3V0ZVtdLCByb3V0ZTogUm91dGUsXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPiB7XG4gICAgaWYgKHJvdXRlLnBhdGggPT09ICcqKicpIHtcbiAgICAgIHJldHVybiB0aGlzLmV4cGFuZFdpbGRDYXJkV2l0aFBhcmFtc0FnYWluc3RSb3V0ZVVzaW5nUmVkaXJlY3QoXG4gICAgICAgICAgaW5qZWN0b3IsIHJvdXRlcywgcm91dGUsIG91dGxldCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZXhwYW5kUmVndWxhclNlZ21lbnRBZ2FpbnN0Um91dGVVc2luZ1JlZGlyZWN0KFxuICAgICAgICBpbmplY3Rvciwgc2VnbWVudEdyb3VwLCByb3V0ZXMsIHJvdXRlLCBzZWdtZW50cywgb3V0bGV0KTtcbiAgfVxuXG4gIHByaXZhdGUgZXhwYW5kV2lsZENhcmRXaXRoUGFyYW1zQWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZXM6IFJvdXRlW10sIHJvdXRlOiBSb3V0ZSxcbiAgICAgIG91dGxldDogc3RyaW5nKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgICBjb25zdCBuZXdUcmVlID0gdGhpcy5hcHBseVJlZGlyZWN0Q29tbWFuZHMoW10sIHJvdXRlLnJlZGlyZWN0VG8hLCB7fSk7XG4gICAgaWYgKHJvdXRlLnJlZGlyZWN0VG8hLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgcmV0dXJuIGFic29sdXRlUmVkaXJlY3QobmV3VHJlZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubGluZXJhbGl6ZVNlZ21lbnRzKHJvdXRlLCBuZXdUcmVlKS5waXBlKG1lcmdlTWFwKChuZXdTZWdtZW50czogVXJsU2VnbWVudFtdKSA9PiB7XG4gICAgICBjb25zdCBncm91cCA9IG5ldyBVcmxTZWdtZW50R3JvdXAobmV3U2VnbWVudHMsIHt9KTtcbiAgICAgIHJldHVybiB0aGlzLmV4cGFuZFNlZ21lbnQoaW5qZWN0b3IsIGdyb3VwLCByb3V0ZXMsIG5ld1NlZ21lbnRzLCBvdXRsZXQsIGZhbHNlKTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFJlZ3VsYXJTZWdtZW50QWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGVzOiBSb3V0ZVtdLCByb3V0ZTogUm91dGUsXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZyk6IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPiB7XG4gICAgY29uc3Qge21hdGNoZWQsIGNvbnN1bWVkU2VnbWVudHMsIHJlbWFpbmluZ1NlZ21lbnRzLCBwb3NpdGlvbmFsUGFyYW1TZWdtZW50c30gPVxuICAgICAgICBtYXRjaChzZWdtZW50R3JvdXAsIHJvdXRlLCBzZWdtZW50cyk7XG4gICAgaWYgKCFtYXRjaGVkKSByZXR1cm4gbm9NYXRjaChzZWdtZW50R3JvdXApO1xuXG4gICAgY29uc3QgbmV3VHJlZSA9XG4gICAgICAgIHRoaXMuYXBwbHlSZWRpcmVjdENvbW1hbmRzKGNvbnN1bWVkU2VnbWVudHMsIHJvdXRlLnJlZGlyZWN0VG8hLCBwb3NpdGlvbmFsUGFyYW1TZWdtZW50cyk7XG4gICAgaWYgKHJvdXRlLnJlZGlyZWN0VG8hLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgcmV0dXJuIGFic29sdXRlUmVkaXJlY3QobmV3VHJlZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubGluZXJhbGl6ZVNlZ21lbnRzKHJvdXRlLCBuZXdUcmVlKS5waXBlKG1lcmdlTWFwKChuZXdTZWdtZW50czogVXJsU2VnbWVudFtdKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRTZWdtZW50KFxuICAgICAgICAgIGluamVjdG9yLCBzZWdtZW50R3JvdXAsIHJvdXRlcywgbmV3U2VnbWVudHMuY29uY2F0KHJlbWFpbmluZ1NlZ21lbnRzKSwgb3V0bGV0LCBmYWxzZSk7XG4gICAgfSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBtYXRjaFNlZ21lbnRBZ2FpbnN0Um91dGUoXG4gICAgICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvciwgcmF3U2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlOiBSb3V0ZSxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgICBpZiAocm91dGUucGF0aCA9PT0gJyoqJykge1xuICAgICAgLy8gT25seSBjcmVhdGUgdGhlIFJvdXRlJ3MgYEVudmlyb25tZW50SW5qZWN0b3JgIGlmIGl0IG1hdGNoZXMgdGhlIGF0dGVtcHRlZCBuYXZpZ2F0aW9uXG4gICAgICBpbmplY3RvciA9IGdldE9yQ3JlYXRlUm91dGVJbmplY3RvcklmTmVlZGVkKHJvdXRlLCBpbmplY3Rvcik7XG4gICAgICBpZiAocm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgICAgIGNvbnN0IGxvYWRlZCQgPSByb3V0ZS5fbG9hZGVkUm91dGVzID9cbiAgICAgICAgICAgIG9mKHtyb3V0ZXM6IHJvdXRlLl9sb2FkZWRSb3V0ZXMsIGluamVjdG9yOiByb3V0ZS5fbG9hZGVkSW5qZWN0b3J9KSA6XG4gICAgICAgICAgICB0aGlzLmNvbmZpZ0xvYWRlci5sb2FkQ2hpbGRyZW4oaW5qZWN0b3IsIHJvdXRlKTtcbiAgICAgICAgcmV0dXJuIGxvYWRlZCQucGlwZShtYXAoKGNmZzogTG9hZGVkUm91dGVyQ29uZmlnKSA9PiB7XG4gICAgICAgICAgcm91dGUuX2xvYWRlZFJvdXRlcyA9IGNmZy5yb3V0ZXM7XG4gICAgICAgICAgcm91dGUuX2xvYWRlZEluamVjdG9yID0gY2ZnLmluamVjdG9yO1xuICAgICAgICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRzLCB7fSk7XG4gICAgICAgIH0pKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9mKG5ldyBVcmxTZWdtZW50R3JvdXAoc2VnbWVudHMsIHt9KSk7XG4gICAgfVxuXG4gICAgY29uc3Qge21hdGNoZWQsIGNvbnN1bWVkU2VnbWVudHMsIHJlbWFpbmluZ1NlZ21lbnRzfSA9IG1hdGNoKHJhd1NlZ21lbnRHcm91cCwgcm91dGUsIHNlZ21lbnRzKTtcbiAgICBpZiAoIW1hdGNoZWQpIHJldHVybiBub01hdGNoKHJhd1NlZ21lbnRHcm91cCk7XG5cbiAgICAvLyBPbmx5IGNyZWF0ZSB0aGUgUm91dGUncyBgRW52aXJvbm1lbnRJbmplY3RvcmAgaWYgaXQgbWF0Y2hlcyB0aGUgYXR0ZW1wdGVkIG5hdmlnYXRpb25cbiAgICBpbmplY3RvciA9IGdldE9yQ3JlYXRlUm91dGVJbmplY3RvcklmTmVlZGVkKHJvdXRlLCBpbmplY3Rvcik7XG4gICAgY29uc3QgY2hpbGRDb25maWckID0gdGhpcy5nZXRDaGlsZENvbmZpZyhpbmplY3Rvciwgcm91dGUsIHNlZ21lbnRzKTtcblxuICAgIHJldHVybiBjaGlsZENvbmZpZyQucGlwZShtZXJnZU1hcCgocm91dGVyQ29uZmlnOiBMb2FkZWRSb3V0ZXJDb25maWcpID0+IHtcbiAgICAgIGNvbnN0IGNoaWxkSW5qZWN0b3IgPSByb3V0ZXJDb25maWcuaW5qZWN0b3IgPz8gaW5qZWN0b3I7XG4gICAgICBjb25zdCBjaGlsZENvbmZpZyA9IHJvdXRlckNvbmZpZy5yb3V0ZXM7XG5cbiAgICAgIGNvbnN0IHtzZWdtZW50R3JvdXA6IHNwbGl0U2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50c30gPVxuICAgICAgICAgIHNwbGl0KHJhd1NlZ21lbnRHcm91cCwgY29uc3VtZWRTZWdtZW50cywgcmVtYWluaW5nU2VnbWVudHMsIGNoaWxkQ29uZmlnKTtcbiAgICAgIC8vIFNlZSBjb21tZW50IG9uIHRoZSBvdGhlciBjYWxsIHRvIGBzcGxpdGAgYWJvdXQgd2h5IHRoaXMgaXMgbmVjZXNzYXJ5LlxuICAgICAgY29uc3Qgc2VnbWVudEdyb3VwID1cbiAgICAgICAgICBuZXcgVXJsU2VnbWVudEdyb3VwKHNwbGl0U2VnbWVudEdyb3VwLnNlZ21lbnRzLCBzcGxpdFNlZ21lbnRHcm91cC5jaGlsZHJlbik7XG5cbiAgICAgIGlmIChzbGljZWRTZWdtZW50cy5sZW5ndGggPT09IDAgJiYgc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkpIHtcbiAgICAgICAgY29uc3QgZXhwYW5kZWQkID0gdGhpcy5leHBhbmRDaGlsZHJlbihjaGlsZEluamVjdG9yLCBjaGlsZENvbmZpZywgc2VnbWVudEdyb3VwKTtcbiAgICAgICAgcmV0dXJuIGV4cGFuZGVkJC5waXBlKFxuICAgICAgICAgICAgbWFwKChjaGlsZHJlbjogYW55KSA9PiBuZXcgVXJsU2VnbWVudEdyb3VwKGNvbnN1bWVkU2VnbWVudHMsIGNoaWxkcmVuKSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY2hpbGRDb25maWcubGVuZ3RoID09PSAwICYmIHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gb2YobmV3IFVybFNlZ21lbnRHcm91cChjb25zdW1lZFNlZ21lbnRzLCB7fSkpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtYXRjaGVkT25PdXRsZXQgPSBnZXRPdXRsZXQocm91dGUpID09PSBvdXRsZXQ7XG4gICAgICBjb25zdCBleHBhbmRlZCQgPSB0aGlzLmV4cGFuZFNlZ21lbnQoXG4gICAgICAgICAgY2hpbGRJbmplY3Rvciwgc2VnbWVudEdyb3VwLCBjaGlsZENvbmZpZywgc2xpY2VkU2VnbWVudHMsXG4gICAgICAgICAgbWF0Y2hlZE9uT3V0bGV0ID8gUFJJTUFSWV9PVVRMRVQgOiBvdXRsZXQsIHRydWUpO1xuICAgICAgcmV0dXJuIGV4cGFuZGVkJC5waXBlKFxuICAgICAgICAgIG1hcCgoY3M6IFVybFNlZ21lbnRHcm91cCkgPT5cbiAgICAgICAgICAgICAgICAgIG5ldyBVcmxTZWdtZW50R3JvdXAoY29uc3VtZWRTZWdtZW50cy5jb25jYXQoY3Muc2VnbWVudHMpLCBjcy5jaGlsZHJlbikpKTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIGdldENoaWxkQ29uZmlnKGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pOlxuICAgICAgT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWc+IHtcbiAgICBpZiAocm91dGUuY2hpbGRyZW4pIHtcbiAgICAgIC8vIFRoZSBjaGlsZHJlbiBiZWxvbmcgdG8gdGhlIHNhbWUgbW9kdWxlXG4gICAgICByZXR1cm4gb2Yoe3JvdXRlczogcm91dGUuY2hpbGRyZW4sIGluamVjdG9yfSk7XG4gICAgfVxuXG4gICAgaWYgKHJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgICAgLy8gbGF6eSBjaGlsZHJlbiBiZWxvbmcgdG8gdGhlIGxvYWRlZCBtb2R1bGVcbiAgICAgIGlmIChyb3V0ZS5fbG9hZGVkUm91dGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIG9mKHtyb3V0ZXM6IHJvdXRlLl9sb2FkZWRSb3V0ZXMsIGluamVjdG9yOiByb3V0ZS5fbG9hZGVkSW5qZWN0b3J9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMucnVuQ2FuTG9hZEd1YXJkcyhpbmplY3Rvciwgcm91dGUsIHNlZ21lbnRzKVxuICAgICAgICAgIC5waXBlKG1lcmdlTWFwKChzaG91bGRMb2FkUmVzdWx0OiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgICBpZiAoc2hvdWxkTG9hZFJlc3VsdCkge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25maWdMb2FkZXIubG9hZENoaWxkcmVuKGluamVjdG9yLCByb3V0ZSlcbiAgICAgICAgICAgICAgICAgIC5waXBlKHRhcCgoY2ZnOiBMb2FkZWRSb3V0ZXJDb25maWcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUuX2xvYWRlZFJvdXRlcyA9IGNmZy5yb3V0ZXM7XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRJbmplY3RvciA9IGNmZy5pbmplY3RvcjtcbiAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjYW5Mb2FkRmFpbHMocm91dGUpO1xuICAgICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb2Yoe3JvdXRlczogW10sIGluamVjdG9yfSk7XG4gIH1cblxuICBwcml2YXRlIHJ1bkNhbkxvYWRHdWFyZHMoaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJvdXRlOiBSb3V0ZSwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSk6XG4gICAgICBPYnNlcnZhYmxlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBjYW5Mb2FkID0gcm91dGUuY2FuTG9hZDtcbiAgICBpZiAoIWNhbkxvYWQgfHwgY2FuTG9hZC5sZW5ndGggPT09IDApIHJldHVybiBvZih0cnVlKTtcblxuICAgIGNvbnN0IGNhbkxvYWRPYnNlcnZhYmxlcyA9IGNhbkxvYWQubWFwKChpbmplY3Rpb25Ub2tlbjogYW55KSA9PiB7XG4gICAgICBjb25zdCBndWFyZCA9IGluamVjdG9yLmdldDxDYW5Mb2FkfENhbkxvYWRGbj4oaW5qZWN0aW9uVG9rZW4pO1xuICAgICAgY29uc3QgZ3VhcmRWYWwgPSBpc0NhbkxvYWQoZ3VhcmQpID8gZ3VhcmQuY2FuTG9hZChyb3V0ZSwgc2VnbWVudHMpIDogZ3VhcmQocm91dGUsIHNlZ21lbnRzKTtcbiAgICAgIHJldHVybiB3cmFwSW50b09ic2VydmFibGUoZ3VhcmRWYWwpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG9mKGNhbkxvYWRPYnNlcnZhYmxlcylcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICBwcmlvcml0aXplZEd1YXJkVmFsdWUoKSxcbiAgICAgICAgICAgIHRhcCgocmVzdWx0OiBVcmxUcmVlfGJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgICAgaWYgKCFpc1VybFRyZWUocmVzdWx0KSkgcmV0dXJuO1xuXG4gICAgICAgICAgICAgIGNvbnN0IGVycm9yOiBFcnJvciZ7dXJsPzogVXJsVHJlZX0gPSBuYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoXG4gICAgICAgICAgICAgICAgICBSRURJUkVDVElOR19DQU5DRUxMQVRJT05fUkVBU09OICsgdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZShyZXN1bHQpKTtcbiAgICAgICAgICAgICAgZXJyb3IudXJsID0gcmVzdWx0O1xuICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgbWFwKHJlc3VsdCA9PiByZXN1bHQgPT09IHRydWUpLFxuICAgICAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBsaW5lcmFsaXplU2VnbWVudHMocm91dGU6IFJvdXRlLCB1cmxUcmVlOiBVcmxUcmVlKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50W10+IHtcbiAgICBsZXQgcmVzOiBVcmxTZWdtZW50W10gPSBbXTtcbiAgICBsZXQgYyA9IHVybFRyZWUucm9vdDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgcmVzID0gcmVzLmNvbmNhdChjLnNlZ21lbnRzKTtcbiAgICAgIGlmIChjLm51bWJlck9mQ2hpbGRyZW4gPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9mKHJlcyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjLm51bWJlck9mQ2hpbGRyZW4gPiAxIHx8ICFjLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSkge1xuICAgICAgICByZXR1cm4gbmFtZWRPdXRsZXRzUmVkaXJlY3Qocm91dGUucmVkaXJlY3RUbyEpO1xuICAgICAgfVxuXG4gICAgICBjID0gYy5jaGlsZHJlbltQUklNQVJZX09VVExFVF07XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhcHBseVJlZGlyZWN0Q29tbWFuZHMoXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCByZWRpcmVjdFRvOiBzdHJpbmcsIHBvc1BhcmFtczoge1trOiBzdHJpbmddOiBVcmxTZWdtZW50fSk6IFVybFRyZWUge1xuICAgIHJldHVybiB0aGlzLmFwcGx5UmVkaXJlY3RDcmVhdHJlVXJsVHJlZShcbiAgICAgICAgcmVkaXJlY3RUbywgdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKHJlZGlyZWN0VG8pLCBzZWdtZW50cywgcG9zUGFyYW1zKTtcbiAgfVxuXG4gIHByaXZhdGUgYXBwbHlSZWRpcmVjdENyZWF0cmVVcmxUcmVlKFxuICAgICAgcmVkaXJlY3RUbzogc3RyaW5nLCB1cmxUcmVlOiBVcmxUcmVlLCBzZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgICAgcG9zUGFyYW1zOiB7W2s6IHN0cmluZ106IFVybFNlZ21lbnR9KTogVXJsVHJlZSB7XG4gICAgY29uc3QgbmV3Um9vdCA9IHRoaXMuY3JlYXRlU2VnbWVudEdyb3VwKHJlZGlyZWN0VG8sIHVybFRyZWUucm9vdCwgc2VnbWVudHMsIHBvc1BhcmFtcyk7XG4gICAgcmV0dXJuIG5ldyBVcmxUcmVlKFxuICAgICAgICBuZXdSb290LCB0aGlzLmNyZWF0ZVF1ZXJ5UGFyYW1zKHVybFRyZWUucXVlcnlQYXJhbXMsIHRoaXMudXJsVHJlZS5xdWVyeVBhcmFtcyksXG4gICAgICAgIHVybFRyZWUuZnJhZ21lbnQpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVRdWVyeVBhcmFtcyhyZWRpcmVjdFRvUGFyYW1zOiBQYXJhbXMsIGFjdHVhbFBhcmFtczogUGFyYW1zKTogUGFyYW1zIHtcbiAgICBjb25zdCByZXM6IFBhcmFtcyA9IHt9O1xuICAgIGZvckVhY2gocmVkaXJlY3RUb1BhcmFtcywgKHY6IGFueSwgazogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCBjb3B5U291cmNlVmFsdWUgPSB0eXBlb2YgdiA9PT0gJ3N0cmluZycgJiYgdi5zdGFydHNXaXRoKCc6Jyk7XG4gICAgICBpZiAoY29weVNvdXJjZVZhbHVlKSB7XG4gICAgICAgIGNvbnN0IHNvdXJjZU5hbWUgPSB2LnN1YnN0cmluZygxKTtcbiAgICAgICAgcmVzW2tdID0gYWN0dWFsUGFyYW1zW3NvdXJjZU5hbWVdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzW2tdID0gdjtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVTZWdtZW50R3JvdXAoXG4gICAgICByZWRpcmVjdFRvOiBzdHJpbmcsIGdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgICBwb3NQYXJhbXM6IHtbazogc3RyaW5nXTogVXJsU2VnbWVudH0pOiBVcmxTZWdtZW50R3JvdXAge1xuICAgIGNvbnN0IHVwZGF0ZWRTZWdtZW50cyA9IHRoaXMuY3JlYXRlU2VnbWVudHMocmVkaXJlY3RUbywgZ3JvdXAuc2VnbWVudHMsIHNlZ21lbnRzLCBwb3NQYXJhbXMpO1xuXG4gICAgbGV0IGNoaWxkcmVuOiB7W246IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0gPSB7fTtcbiAgICBmb3JFYWNoKGdyb3VwLmNoaWxkcmVuLCAoY2hpbGQ6IFVybFNlZ21lbnRHcm91cCwgbmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICBjaGlsZHJlbltuYW1lXSA9IHRoaXMuY3JlYXRlU2VnbWVudEdyb3VwKHJlZGlyZWN0VG8sIGNoaWxkLCBzZWdtZW50cywgcG9zUGFyYW1zKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHVwZGF0ZWRTZWdtZW50cywgY2hpbGRyZW4pO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVTZWdtZW50cyhcbiAgICAgIHJlZGlyZWN0VG86IHN0cmluZywgcmVkaXJlY3RUb1NlZ21lbnRzOiBVcmxTZWdtZW50W10sIGFjdHVhbFNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgICBwb3NQYXJhbXM6IHtbazogc3RyaW5nXTogVXJsU2VnbWVudH0pOiBVcmxTZWdtZW50W10ge1xuICAgIHJldHVybiByZWRpcmVjdFRvU2VnbWVudHMubWFwKFxuICAgICAgICBzID0+IHMucGF0aC5zdGFydHNXaXRoKCc6JykgPyB0aGlzLmZpbmRQb3NQYXJhbShyZWRpcmVjdFRvLCBzLCBwb3NQYXJhbXMpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5maW5kT3JSZXR1cm4ocywgYWN0dWFsU2VnbWVudHMpKTtcbiAgfVxuXG4gIHByaXZhdGUgZmluZFBvc1BhcmFtKFxuICAgICAgcmVkaXJlY3RUbzogc3RyaW5nLCByZWRpcmVjdFRvVXJsU2VnbWVudDogVXJsU2VnbWVudCxcbiAgICAgIHBvc1BhcmFtczoge1trOiBzdHJpbmddOiBVcmxTZWdtZW50fSk6IFVybFNlZ21lbnQge1xuICAgIGNvbnN0IHBvcyA9IHBvc1BhcmFtc1tyZWRpcmVjdFRvVXJsU2VnbWVudC5wYXRoLnN1YnN0cmluZygxKV07XG4gICAgaWYgKCFwb3MpXG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuTUlTU0lOR19SRURJUkVDVCxcbiAgICAgICAgICBOR19ERVZfTU9ERSAmJlxuICAgICAgICAgICAgICBgQ2Fubm90IHJlZGlyZWN0IHRvICcke3JlZGlyZWN0VG99Jy4gQ2Fubm90IGZpbmQgJyR7cmVkaXJlY3RUb1VybFNlZ21lbnQucGF0aH0nLmApO1xuICAgIHJldHVybiBwb3M7XG4gIH1cblxuICBwcml2YXRlIGZpbmRPclJldHVybihyZWRpcmVjdFRvVXJsU2VnbWVudDogVXJsU2VnbWVudCwgYWN0dWFsU2VnbWVudHM6IFVybFNlZ21lbnRbXSk6IFVybFNlZ21lbnQge1xuICAgIGxldCBpZHggPSAwO1xuICAgIGZvciAoY29uc3QgcyBvZiBhY3R1YWxTZWdtZW50cykge1xuICAgICAgaWYgKHMucGF0aCA9PT0gcmVkaXJlY3RUb1VybFNlZ21lbnQucGF0aCkge1xuICAgICAgICBhY3R1YWxTZWdtZW50cy5zcGxpY2UoaWR4KTtcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgICB9XG4gICAgICBpZHgrKztcbiAgICB9XG4gICAgcmV0dXJuIHJlZGlyZWN0VG9VcmxTZWdtZW50O1xuICB9XG59XG5cbi8qKlxuICogV2hlbiBwb3NzaWJsZSwgbWVyZ2VzIHRoZSBwcmltYXJ5IG91dGxldCBjaGlsZCBpbnRvIHRoZSBwYXJlbnQgYFVybFNlZ21lbnRHcm91cGAuXG4gKlxuICogV2hlbiBhIHNlZ21lbnQgZ3JvdXAgaGFzIG9ubHkgb25lIGNoaWxkIHdoaWNoIGlzIGEgcHJpbWFyeSBvdXRsZXQsIG1lcmdlcyB0aGF0IGNoaWxkIGludG8gdGhlXG4gKiBwYXJlbnQuIFRoYXQgaXMsIHRoZSBjaGlsZCBzZWdtZW50IGdyb3VwJ3Mgc2VnbWVudHMgYXJlIG1lcmdlZCBpbnRvIHRoZSBgc2AgYW5kIHRoZSBjaGlsZCdzXG4gKiBjaGlsZHJlbiBiZWNvbWUgdGhlIGNoaWxkcmVuIG9mIGBzYC4gVGhpbmsgb2YgdGhpcyBsaWtlIGEgJ3NxdWFzaCcsIG1lcmdpbmcgdGhlIGNoaWxkIHNlZ21lbnRcbiAqIGdyb3VwIGludG8gdGhlIHBhcmVudC5cbiAqL1xuZnVuY3Rpb24gbWVyZ2VUcml2aWFsQ2hpbGRyZW4oczogVXJsU2VnbWVudEdyb3VwKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgaWYgKHMubnVtYmVyT2ZDaGlsZHJlbiA9PT0gMSAmJiBzLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSkge1xuICAgIGNvbnN0IGMgPSBzLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXTtcbiAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChzLnNlZ21lbnRzLmNvbmNhdChjLnNlZ21lbnRzKSwgYy5jaGlsZHJlbik7XG4gIH1cblxuICByZXR1cm4gcztcbn1cblxuLyoqXG4gKiBSZWN1cnNpdmVseSBtZXJnZXMgcHJpbWFyeSBzZWdtZW50IGNoaWxkcmVuIGludG8gdGhlaXIgcGFyZW50cyBhbmQgYWxzbyBkcm9wcyBlbXB0eSBjaGlsZHJlblxuICogKHRob3NlIHdoaWNoIGhhdmUgbm8gc2VnbWVudHMgYW5kIG5vIGNoaWxkcmVuIHRoZW1zZWx2ZXMpLiBUaGUgbGF0dGVyIHByZXZlbnRzIHNlcmlhbGl6aW5nIGFcbiAqIGdyb3VwIGludG8gc29tZXRoaW5nIGxpa2UgYC9hKGF1eDopYCwgd2hlcmUgYGF1eGAgaXMgYW4gZW1wdHkgY2hpbGQgc2VnbWVudC5cbiAqL1xuZnVuY3Rpb24gc3F1YXNoU2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgY29uc3QgbmV3Q2hpbGRyZW4gPSB7fSBhcyBhbnk7XG4gIGZvciAoY29uc3QgY2hpbGRPdXRsZXQgb2YgT2JqZWN0LmtleXMoc2VnbWVudEdyb3VwLmNoaWxkcmVuKSkge1xuICAgIGNvbnN0IGNoaWxkID0gc2VnbWVudEdyb3VwLmNoaWxkcmVuW2NoaWxkT3V0bGV0XTtcbiAgICBjb25zdCBjaGlsZENhbmRpZGF0ZSA9IHNxdWFzaFNlZ21lbnRHcm91cChjaGlsZCk7XG4gICAgLy8gZG9uJ3QgYWRkIGVtcHR5IGNoaWxkcmVuXG4gICAgaWYgKGNoaWxkQ2FuZGlkYXRlLnNlZ21lbnRzLmxlbmd0aCA+IDAgfHwgY2hpbGRDYW5kaWRhdGUuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgbmV3Q2hpbGRyZW5bY2hpbGRPdXRsZXRdID0gY2hpbGRDYW5kaWRhdGU7XG4gICAgfVxuICB9XG4gIGNvbnN0IHMgPSBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cC5zZWdtZW50cywgbmV3Q2hpbGRyZW4pO1xuICByZXR1cm4gbWVyZ2VUcml2aWFsQ2hpbGRyZW4ocyk7XG59XG4iXX0=