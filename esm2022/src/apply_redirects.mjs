/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { runInInjectionContext, ɵRuntimeError as RuntimeError } from '@angular/core';
import { of, throwError } from 'rxjs';
import { NavigationCancellationCode } from './events';
import { navigationCancelingError } from './navigation_canceling_error';
import { PRIMARY_OUTLET } from './shared';
import { UrlSegmentGroup, UrlTree } from './url_tree';
export class NoMatch {
    constructor(segmentGroup) {
        this.segmentGroup = segmentGroup || null;
    }
}
export class AbsoluteRedirect extends Error {
    constructor(urlTree) {
        super();
        this.urlTree = urlTree;
    }
}
export function noMatch(segmentGroup) {
    return throwError(new NoMatch(segmentGroup));
}
export function absoluteRedirect(newTree) {
    return throwError(new AbsoluteRedirect(newTree));
}
export function namedOutletsRedirect(redirectTo) {
    return throwError(new RuntimeError(4000 /* RuntimeErrorCode.NAMED_OUTLET_REDIRECT */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
        `Only absolute redirects can have named outlets. redirectTo: '${redirectTo}'`));
}
export function canLoadFails(route) {
    return throwError(navigationCancelingError((typeof ngDevMode === 'undefined' || ngDevMode) &&
        `Cannot load children because the guard of the route "path: '${route.path}'" returned false`, NavigationCancellationCode.GuardRejected));
}
export class ApplyRedirects {
    constructor(urlSerializer, urlTree) {
        this.urlSerializer = urlSerializer;
        this.urlTree = urlTree;
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
                return namedOutletsRedirect(`${route.redirectTo}`);
            }
            c = c.children[PRIMARY_OUTLET];
        }
    }
    applyRedirectCommands(segments, redirectTo, posParams, currentSnapshot, injector) {
        if (typeof redirectTo !== 'string') {
            const redirectToFn = redirectTo;
            const { queryParams, fragment, routeConfig, url, outlet, params, data, title } = currentSnapshot;
            const newRedirect = runInInjectionContext(injector, () => redirectToFn({ params, data, queryParams, fragment, routeConfig, url, outlet, title }));
            if (newRedirect instanceof UrlTree) {
                throw new AbsoluteRedirect(newRedirect);
            }
            redirectTo = newRedirect;
        }
        const newTree = this.applyRedirectCreateUrlTree(redirectTo, this.urlSerializer.parse(redirectTo), segments, posParams);
        if (redirectTo[0] === '/') {
            throw new AbsoluteRedirect(newTree);
        }
        return newTree;
    }
    applyRedirectCreateUrlTree(redirectTo, urlTree, segments, posParams) {
        const newRoot = this.createSegmentGroup(redirectTo, urlTree.root, segments, posParams);
        return new UrlTree(newRoot, this.createQueryParams(urlTree.queryParams, this.urlTree.queryParams), urlTree.fragment);
    }
    createQueryParams(redirectToParams, actualParams) {
        const res = {};
        Object.entries(redirectToParams).forEach(([k, v]) => {
            const copySourceValue = typeof v === 'string' && v[0] === ':';
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
        Object.entries(group.children).forEach(([name, child]) => {
            children[name] = this.createSegmentGroup(redirectTo, child, segments, posParams);
        });
        return new UrlSegmentGroup(updatedSegments, children);
    }
    createSegments(redirectTo, redirectToSegments, actualSegments, posParams) {
        return redirectToSegments.map((s) => s.path[0] === ':'
            ? this.findPosParam(redirectTo, s, posParams)
            : this.findOrReturn(s, actualSegments));
    }
    findPosParam(redirectTo, redirectToUrlSegment, posParams) {
        const pos = posParams[redirectToUrlSegment.path.substring(1)];
        if (!pos)
            throw new RuntimeError(4001 /* RuntimeErrorCode.MISSING_REDIRECT */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHlfcmVkaXJlY3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9hcHBseV9yZWRpcmVjdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFXLHFCQUFxQixFQUFFLGFBQWEsSUFBSSxZQUFZLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDN0YsT0FBTyxFQUFhLEVBQUUsRUFBRSxVQUFVLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFHaEQsT0FBTyxFQUFDLDBCQUEwQixFQUFDLE1BQU0sVUFBVSxDQUFDO0FBRXBELE9BQU8sRUFBQyx3QkFBd0IsRUFBQyxNQUFNLDhCQUE4QixDQUFDO0FBRXRFLE9BQU8sRUFBUyxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDaEQsT0FBTyxFQUFhLGVBQWUsRUFBaUIsT0FBTyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBRS9FLE1BQU0sT0FBTyxPQUFPO0lBR2xCLFlBQVksWUFBOEI7UUFDeEMsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLElBQUksSUFBSSxDQUFDO0lBQzNDLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxLQUFLO0lBQ3pDLFlBQW1CLE9BQWdCO1FBQ2pDLEtBQUssRUFBRSxDQUFDO1FBRFMsWUFBTyxHQUFQLE9BQU8sQ0FBUztJQUVuQyxDQUFDO0NBQ0Y7QUFFRCxNQUFNLFVBQVUsT0FBTyxDQUFDLFlBQTZCO0lBQ25ELE9BQU8sVUFBVSxDQUFDLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7QUFDL0MsQ0FBQztBQUVELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxPQUFnQjtJQUMvQyxPQUFPLFVBQVUsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDbkQsQ0FBQztBQUVELE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxV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QUFJLENBQ3BGLENBQUM7UUFDSixPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFFRCxZQUFZLENBQUMsb0JBQWdDLEVBQUUsY0FBNEI7UUFDekUsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ1osS0FBSyxNQUFNLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3pDLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzNCLE9BQU8sQ0FBQyxDQUFDO1lBQ1gsQ0FBQztZQUNELEdBQUcsRUFBRSxDQUFDO1FBQ1IsQ0FBQztRQUNELE9BQU8sb0JBQW9CLENBQUM7SUFDOUIsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SW5qZWN0b3IsIHJ1bkluSW5qZWN0aW9uQ29udGV4dCwgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgb2YsIHRocm93RXJyb3J9IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge1J1bnRpbWVFcnJvckNvZGV9IGZyb20gJy4vZXJyb3JzJztcbmltcG9ydCB7TmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGV9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7TG9hZGVkUm91dGVyQ29uZmlnLCBSZWRpcmVjdEZ1bmN0aW9uLCBSb3V0ZX0gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtuYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3J9IGZyb20gJy4vbmF2aWdhdGlvbl9jYW5jZWxpbmdfZXJyb3InO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90fSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BhcmFtcywgUFJJTUFSWV9PVVRMRVR9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7VXJsU2VnbWVudCwgVXJsU2VnbWVudEdyb3VwLCBVcmxTZXJpYWxpemVyLCBVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcblxuZXhwb3J0IGNsYXNzIE5vTWF0Y2gge1xuICBwdWJsaWMgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAgfCBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHNlZ21lbnRHcm91cD86IFVybFNlZ21lbnRHcm91cCkge1xuICAgIHRoaXMuc2VnbWVudEdyb3VwID0gc2VnbWVudEdyb3VwIHx8IG51bGw7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEFic29sdXRlUmVkaXJlY3QgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyB1cmxUcmVlOiBVcmxUcmVlKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9NYXRjaChzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6IE9ic2VydmFibGU8YW55PiB7XG4gIHJldHVybiB0aHJvd0Vycm9yKG5ldyBOb01hdGNoKHNlZ21lbnRHcm91cCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWJzb2x1dGVSZWRpcmVjdChuZXdUcmVlOiBVcmxUcmVlKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgcmV0dXJuIHRocm93RXJyb3IobmV3IEFic29sdXRlUmVkaXJlY3QobmV3VHJlZSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbmFtZWRPdXRsZXRzUmVkaXJlY3QocmVkaXJlY3RUbzogc3RyaW5nKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgcmV0dXJuIHRocm93RXJyb3IoXG4gICAgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgIFJ1bnRpbWVFcnJvckNvZGUuTkFNRURfT1VUTEVUX1JFRElSRUNULFxuICAgICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiZcbiAgICAgICAgYE9ubHkgYWJzb2x1dGUgcmVkaXJlY3RzIGNhbiBoYXZlIG5hbWVkIG91dGxldHMuIHJlZGlyZWN0VG86ICcke3JlZGlyZWN0VG99J2AsXG4gICAgKSxcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbkxvYWRGYWlscyhyb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4ge1xuICByZXR1cm4gdGhyb3dFcnJvcihcbiAgICBuYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoXG4gICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICBgQ2Fubm90IGxvYWQgY2hpbGRyZW4gYmVjYXVzZSB0aGUgZ3VhcmQgb2YgdGhlIHJvdXRlIFwicGF0aDogJyR7cm91dGUucGF0aH0nXCIgcmV0dXJuZWQgZmFsc2VgLFxuICAgICAgTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuR3VhcmRSZWplY3RlZCxcbiAgICApLFxuICApO1xufVxuXG5leHBvcnQgY2xhc3MgQXBwbHlSZWRpcmVjdHMge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgcHJpdmF0ZSB1cmxUcmVlOiBVcmxUcmVlLFxuICApIHt9XG5cbiAgbGluZXJhbGl6ZVNlZ21lbnRzKHJvdXRlOiBSb3V0ZSwgdXJsVHJlZTogVXJsVHJlZSk6IE9ic2VydmFibGU8VXJsU2VnbWVudFtdPiB7XG4gICAgbGV0IHJlczogVXJsU2VnbWVudFtdID0gW107XG4gICAgbGV0IGMgPSB1cmxUcmVlLnJvb3Q7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHJlcyA9IHJlcy5jb25jYXQoYy5zZWdtZW50cyk7XG4gICAgICBpZiAoYy5udW1iZXJPZkNoaWxkcmVuID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvZihyZXMpO1xuICAgICAgfVxuXG4gICAgICBpZiAoYy5udW1iZXJPZkNoaWxkcmVuID4gMSB8fCAhYy5jaGlsZHJlbltQUklNQVJZX09VVExFVF0pIHtcbiAgICAgICAgcmV0dXJuIG5hbWVkT3V0bGV0c1JlZGlyZWN0KGAke3JvdXRlLnJlZGlyZWN0VG8hfWApO1xuICAgICAgfVxuXG4gICAgICBjID0gYy5jaGlsZHJlbltQUklNQVJZX09VVExFVF07XG4gICAgfVxuICB9XG5cbiAgYXBwbHlSZWRpcmVjdENvbW1hbmRzKFxuICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgcmVkaXJlY3RUbzogc3RyaW5nIHwgUmVkaXJlY3RGdW5jdGlvbixcbiAgICBwb3NQYXJhbXM6IHtbazogc3RyaW5nXTogVXJsU2VnbWVudH0sXG4gICAgY3VycmVudFNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LFxuICAgIGluamVjdG9yOiBJbmplY3RvcixcbiAgKTogVXJsVHJlZSB7XG4gICAgaWYgKHR5cGVvZiByZWRpcmVjdFRvICE9PSAnc3RyaW5nJykge1xuICAgICAgY29uc3QgcmVkaXJlY3RUb0ZuID0gcmVkaXJlY3RUbztcbiAgICAgIGNvbnN0IHtxdWVyeVBhcmFtcywgZnJhZ21lbnQsIHJvdXRlQ29uZmlnLCB1cmwsIG91dGxldCwgcGFyYW1zLCBkYXRhLCB0aXRsZX0gPVxuICAgICAgICBjdXJyZW50U25hcHNob3Q7XG4gICAgICBjb25zdCBuZXdSZWRpcmVjdCA9IHJ1bkluSW5qZWN0aW9uQ29udGV4dChpbmplY3RvciwgKCkgPT5cbiAgICAgICAgcmVkaXJlY3RUb0ZuKHtwYXJhbXMsIGRhdGEsIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCwgcm91dGVDb25maWcsIHVybCwgb3V0bGV0LCB0aXRsZX0pLFxuICAgICAgKTtcbiAgICAgIGlmIChuZXdSZWRpcmVjdCBpbnN0YW5jZW9mIFVybFRyZWUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEFic29sdXRlUmVkaXJlY3QobmV3UmVkaXJlY3QpO1xuICAgICAgfVxuXG4gICAgICByZWRpcmVjdFRvID0gbmV3UmVkaXJlY3Q7XG4gICAgfVxuXG4gICAgY29uc3QgbmV3VHJlZSA9IHRoaXMuYXBwbHlSZWRpcmVjdENyZWF0ZVVybFRyZWUoXG4gICAgICByZWRpcmVjdFRvLFxuICAgICAgdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKHJlZGlyZWN0VG8pLFxuICAgICAgc2VnbWVudHMsXG4gICAgICBwb3NQYXJhbXMsXG4gICAgKTtcbiAgICBpZiAocmVkaXJlY3RUb1swXSA9PT0gJy8nKSB7XG4gICAgICB0aHJvdyBuZXcgQWJzb2x1dGVSZWRpcmVjdChuZXdUcmVlKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ld1RyZWU7XG4gIH1cblxuICBhcHBseVJlZGlyZWN0Q3JlYXRlVXJsVHJlZShcbiAgICByZWRpcmVjdFRvOiBzdHJpbmcsXG4gICAgdXJsVHJlZTogVXJsVHJlZSxcbiAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgIHBvc1BhcmFtczoge1trOiBzdHJpbmddOiBVcmxTZWdtZW50fSxcbiAgKTogVXJsVHJlZSB7XG4gICAgY29uc3QgbmV3Um9vdCA9IHRoaXMuY3JlYXRlU2VnbWVudEdyb3VwKHJlZGlyZWN0VG8sIHVybFRyZWUucm9vdCwgc2VnbWVudHMsIHBvc1BhcmFtcyk7XG4gICAgcmV0dXJuIG5ldyBVcmxUcmVlKFxuICAgICAgbmV3Um9vdCxcbiAgICAgIHRoaXMuY3JlYXRlUXVlcnlQYXJhbXModXJsVHJlZS5xdWVyeVBhcmFtcywgdGhpcy51cmxUcmVlLnF1ZXJ5UGFyYW1zKSxcbiAgICAgIHVybFRyZWUuZnJhZ21lbnQsXG4gICAgKTtcbiAgfVxuXG4gIGNyZWF0ZVF1ZXJ5UGFyYW1zKHJlZGlyZWN0VG9QYXJhbXM6IFBhcmFtcywgYWN0dWFsUGFyYW1zOiBQYXJhbXMpOiBQYXJhbXMge1xuICAgIGNvbnN0IHJlczogUGFyYW1zID0ge307XG4gICAgT2JqZWN0LmVudHJpZXMocmVkaXJlY3RUb1BhcmFtcykuZm9yRWFjaCgoW2ssIHZdKSA9PiB7XG4gICAgICBjb25zdCBjb3B5U291cmNlVmFsdWUgPSB0eXBlb2YgdiA9PT0gJ3N0cmluZycgJiYgdlswXSA9PT0gJzonO1xuICAgICAgaWYgKGNvcHlTb3VyY2VWYWx1ZSkge1xuICAgICAgICBjb25zdCBzb3VyY2VOYW1lID0gdi5zdWJzdHJpbmcoMSk7XG4gICAgICAgIHJlc1trXSA9IGFjdHVhbFBhcmFtc1tzb3VyY2VOYW1lXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc1trXSA9IHY7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIGNyZWF0ZVNlZ21lbnRHcm91cChcbiAgICByZWRpcmVjdFRvOiBzdHJpbmcsXG4gICAgZ3JvdXA6IFVybFNlZ21lbnRHcm91cCxcbiAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgIHBvc1BhcmFtczoge1trOiBzdHJpbmddOiBVcmxTZWdtZW50fSxcbiAgKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgICBjb25zdCB1cGRhdGVkU2VnbWVudHMgPSB0aGlzLmNyZWF0ZVNlZ21lbnRzKHJlZGlyZWN0VG8sIGdyb3VwLnNlZ21lbnRzLCBzZWdtZW50cywgcG9zUGFyYW1zKTtcblxuICAgIGxldCBjaGlsZHJlbjoge1tuOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gICAgT2JqZWN0LmVudHJpZXMoZ3JvdXAuY2hpbGRyZW4pLmZvckVhY2goKFtuYW1lLCBjaGlsZF0pID0+IHtcbiAgICAgIGNoaWxkcmVuW25hbWVdID0gdGhpcy5jcmVhdGVTZWdtZW50R3JvdXAocmVkaXJlY3RUbywgY2hpbGQsIHNlZ21lbnRzLCBwb3NQYXJhbXMpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAodXBkYXRlZFNlZ21lbnRzLCBjaGlsZHJlbik7XG4gIH1cblxuICBjcmVhdGVTZWdtZW50cyhcbiAgICByZWRpcmVjdFRvOiBzdHJpbmcsXG4gICAgcmVkaXJlY3RUb1NlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgYWN0dWFsU2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICBwb3NQYXJhbXM6IHtbazogc3RyaW5nXTogVXJsU2VnbWVudH0sXG4gICk6IFVybFNlZ21lbnRbXSB7XG4gICAgcmV0dXJuIHJlZGlyZWN0VG9TZWdtZW50cy5tYXAoKHMpID0+XG4gICAgICBzLnBhdGhbMF0gPT09ICc6J1xuICAgICAgICA/IHRoaXMuZmluZFBvc1BhcmFtKHJlZGlyZWN0VG8sIHMsIHBvc1BhcmFtcylcbiAgICAgICAgOiB0aGlzLmZpbmRPclJldHVybihzLCBhY3R1YWxTZWdtZW50cyksXG4gICAgKTtcbiAgfVxuXG4gIGZpbmRQb3NQYXJhbShcbiAgICByZWRpcmVjdFRvOiBzdHJpbmcsXG4gICAgcmVkaXJlY3RUb1VybFNlZ21lbnQ6IFVybFNlZ21lbnQsXG4gICAgcG9zUGFyYW1zOiB7W2s6IHN0cmluZ106IFVybFNlZ21lbnR9LFxuICApOiBVcmxTZWdtZW50IHtcbiAgICBjb25zdCBwb3MgPSBwb3NQYXJhbXNbcmVkaXJlY3RUb1VybFNlZ21lbnQucGF0aC5zdWJzdHJpbmcoMSldO1xuICAgIGlmICghcG9zKVxuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgUnVudGltZUVycm9yQ29kZS5NSVNTSU5HX1JFRElSRUNULFxuICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICAgIGBDYW5ub3QgcmVkaXJlY3QgdG8gJyR7cmVkaXJlY3RUb30nLiBDYW5ub3QgZmluZCAnJHtyZWRpcmVjdFRvVXJsU2VnbWVudC5wYXRofScuYCxcbiAgICAgICk7XG4gICAgcmV0dXJuIHBvcztcbiAgfVxuXG4gIGZpbmRPclJldHVybihyZWRpcmVjdFRvVXJsU2VnbWVudDogVXJsU2VnbWVudCwgYWN0dWFsU2VnbWVudHM6IFVybFNlZ21lbnRbXSk6IFVybFNlZ21lbnQge1xuICAgIGxldCBpZHggPSAwO1xuICAgIGZvciAoY29uc3QgcyBvZiBhY3R1YWxTZWdtZW50cykge1xuICAgICAgaWYgKHMucGF0aCA9PT0gcmVkaXJlY3RUb1VybFNlZ21lbnQucGF0aCkge1xuICAgICAgICBhY3R1YWxTZWdtZW50cy5zcGxpY2UoaWR4KTtcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgICB9XG4gICAgICBpZHgrKztcbiAgICB9XG4gICAgcmV0dXJuIHJlZGlyZWN0VG9VcmxTZWdtZW50O1xuICB9XG59XG4iXX0=