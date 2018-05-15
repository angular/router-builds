/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute, RouterState } from './router_state';
import { TreeNode } from './utils/tree';
export function createRouterState(routeReuseStrategy, curr, prevState) {
    var root = createNode(routeReuseStrategy, curr._root, prevState ? prevState._root : undefined);
    return new RouterState(root, curr);
}
function createNode(routeReuseStrategy, curr, prevState) {
    // reuse an activated route that is currently displayed on the screen
    if (prevState && routeReuseStrategy.shouldReuseRoute(curr.value, prevState.value.snapshot)) {
        var value = prevState.value;
        value._futureSnapshot = curr.value;
        var children = createOrReuseChildren(routeReuseStrategy, curr, prevState);
        return new TreeNode(value, children);
        // retrieve an activated route that is used to be displayed, but is not currently displayed
    }
    else {
        var detachedRouteHandle = routeReuseStrategy.retrieve(curr.value);
        if (detachedRouteHandle) {
            var tree = detachedRouteHandle.route;
            setFutureSnapshotsOfActivatedRoutes(curr, tree);
            return tree;
        }
        else {
            var value = createActivatedRoute(curr.value);
            var children = curr.children.map(function (c) { return createNode(routeReuseStrategy, c); });
            return new TreeNode(value, children);
        }
    }
}
function setFutureSnapshotsOfActivatedRoutes(curr, result) {
    if (curr.value.routeConfig !== result.value.routeConfig) {
        throw new Error('Cannot reattach ActivatedRouteSnapshot created from a different route');
    }
    if (curr.children.length !== result.children.length) {
        throw new Error('Cannot reattach ActivatedRouteSnapshot with a different number of children');
    }
    result.value._futureSnapshot = curr.value;
    for (var i = 0; i < curr.children.length; ++i) {
        setFutureSnapshotsOfActivatedRoutes(curr.children[i], result.children[i]);
    }
}
function createOrReuseChildren(routeReuseStrategy, curr, prevState) {
    return curr.children.map(function (child) {
        try {
            for (var _a = tslib_1.__values(prevState.children), _b = _a.next(); !_b.done; _b = _a.next()) {
                var p = _b.value;
                if (routeReuseStrategy.shouldReuseRoute(p.value.snapshot, child.value)) {
                    return createNode(routeReuseStrategy, child, p);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return createNode(routeReuseStrategy, child);
        var e_1, _c;
    });
}
function createActivatedRoute(c) {
    return new ActivatedRoute(new BehaviorSubject(c.url), new BehaviorSubject(c.params), new BehaviorSubject(c.queryParams), new BehaviorSubject(c.fragment), new BehaviorSubject(c.data), c.outlet, c.component, c);
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlX3JvdXRlcl9zdGF0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvY3JlYXRlX3JvdXRlcl9zdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQVFBLE9BQU8sRUFBQyxlQUFlLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFHckMsT0FBTyxFQUFDLGNBQWMsRUFBMEIsV0FBVyxFQUFzQixNQUFNLGdCQUFnQixDQUFDO0FBQ3hHLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFFdEMsTUFBTSw0QkFDRixrQkFBc0MsRUFBRSxJQUF5QixFQUNqRSxTQUFzQjtJQUN4QixJQUFNLElBQUksR0FBRyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2pHLE9BQU8sSUFBSSxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0NBQ3BDO0FBRUQsb0JBQ0ksa0JBQXNDLEVBQUUsSUFBc0MsRUFDOUUsU0FBb0M7O0lBRXRDLElBQUksU0FBUyxJQUFJLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUMxRixJQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDO1FBQzlCLEtBQUssQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUNuQyxJQUFNLFFBQVEsR0FBRyxxQkFBcUIsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDNUUsT0FBTyxJQUFJLFFBQVEsQ0FBaUIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDOztLQUd0RDtTQUFNO1FBQ0wsSUFBTSxtQkFBbUIsR0FDUSxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3pFLElBQUksbUJBQW1CLEVBQUU7WUFDdkIsSUFBTSxJQUFJLEdBQTZCLG1CQUFtQixDQUFDLEtBQUssQ0FBQztZQUNqRSxtQ0FBbUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDaEQsT0FBTyxJQUFJLENBQUM7U0FFYjthQUFNO1lBQ0wsSUFBTSxLQUFLLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQy9DLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsVUFBVSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxFQUFqQyxDQUFpQyxDQUFDLENBQUM7WUFDM0UsT0FBTyxJQUFJLFFBQVEsQ0FBaUIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ3REO0tBQ0Y7Q0FDRjtBQUVELDZDQUNJLElBQXNDLEVBQUUsTUFBZ0M7SUFDMUUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRTtRQUN2RCxNQUFNLElBQUksS0FBSyxDQUFDLHVFQUF1RSxDQUFDLENBQUM7S0FDMUY7SUFDRCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO1FBQ25ELE1BQU0sSUFBSSxLQUFLLENBQUMsNEVBQTRFLENBQUMsQ0FBQztLQUMvRjtJQUNELE1BQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDMUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1FBQzdDLG1DQUFtQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzNFO0NBQ0Y7QUFFRCwrQkFDSSxrQkFBc0MsRUFBRSxJQUFzQyxFQUM5RSxTQUFtQztJQUNyQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQUEsS0FBSzs7WUFDNUIsS0FBZ0IsSUFBQSxLQUFBLGlCQUFBLFNBQVMsQ0FBQyxRQUFRLENBQUEsZ0JBQUE7Z0JBQTdCLElBQU0sQ0FBQyxXQUFBO2dCQUNWLElBQUksa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUN0RSxPQUFPLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7aUJBQ2pEO2FBQ0Y7Ozs7Ozs7OztRQUNELE9BQU8sVUFBVSxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFDOztLQUM5QyxDQUFDLENBQUM7Q0FDSjtBQUVELDhCQUE4QixDQUF5QjtJQUNyRCxPQUFPLElBQUksY0FBYyxDQUNyQixJQUFJLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxlQUFlLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksZUFBZSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFDN0YsSUFBSSxlQUFlLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDN0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QmVoYXZpb3JTdWJqZWN0fSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtEZXRhY2hlZFJvdXRlSGFuZGxlSW50ZXJuYWwsIFJvdXRlUmV1c2VTdHJhdGVneX0gZnJvbSAnLi9yb3V0ZV9yZXVzZV9zdHJhdGVneSc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlLCBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBSb3V0ZXJTdGF0ZSwgUm91dGVyU3RhdGVTbmFwc2hvdH0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtUcmVlTm9kZX0gZnJvbSAnLi91dGlscy90cmVlJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJvdXRlclN0YXRlKFxuICAgIHJvdXRlUmV1c2VTdHJhdGVneTogUm91dGVSZXVzZVN0cmF0ZWd5LCBjdXJyOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxuICAgIHByZXZTdGF0ZTogUm91dGVyU3RhdGUpOiBSb3V0ZXJTdGF0ZSB7XG4gIGNvbnN0IHJvb3QgPSBjcmVhdGVOb2RlKHJvdXRlUmV1c2VTdHJhdGVneSwgY3Vyci5fcm9vdCwgcHJldlN0YXRlID8gcHJldlN0YXRlLl9yb290IDogdW5kZWZpbmVkKTtcbiAgcmV0dXJuIG5ldyBSb3V0ZXJTdGF0ZShyb290LCBjdXJyKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTm9kZShcbiAgICByb3V0ZVJldXNlU3RyYXRlZ3k6IFJvdXRlUmV1c2VTdHJhdGVneSwgY3VycjogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4sXG4gICAgcHJldlN0YXRlPzogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+KTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+IHtcbiAgLy8gcmV1c2UgYW4gYWN0aXZhdGVkIHJvdXRlIHRoYXQgaXMgY3VycmVudGx5IGRpc3BsYXllZCBvbiB0aGUgc2NyZWVuXG4gIGlmIChwcmV2U3RhdGUgJiYgcm91dGVSZXVzZVN0cmF0ZWd5LnNob3VsZFJldXNlUm91dGUoY3Vyci52YWx1ZSwgcHJldlN0YXRlLnZhbHVlLnNuYXBzaG90KSkge1xuICAgIGNvbnN0IHZhbHVlID0gcHJldlN0YXRlLnZhbHVlO1xuICAgIHZhbHVlLl9mdXR1cmVTbmFwc2hvdCA9IGN1cnIudmFsdWU7XG4gICAgY29uc3QgY2hpbGRyZW4gPSBjcmVhdGVPclJldXNlQ2hpbGRyZW4ocm91dGVSZXVzZVN0cmF0ZWd5LCBjdXJyLCBwcmV2U3RhdGUpO1xuICAgIHJldHVybiBuZXcgVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+KHZhbHVlLCBjaGlsZHJlbik7XG5cbiAgICAvLyByZXRyaWV2ZSBhbiBhY3RpdmF0ZWQgcm91dGUgdGhhdCBpcyB1c2VkIHRvIGJlIGRpc3BsYXllZCwgYnV0IGlzIG5vdCBjdXJyZW50bHkgZGlzcGxheWVkXG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZGV0YWNoZWRSb3V0ZUhhbmRsZSA9XG4gICAgICAgIDxEZXRhY2hlZFJvdXRlSGFuZGxlSW50ZXJuYWw+cm91dGVSZXVzZVN0cmF0ZWd5LnJldHJpZXZlKGN1cnIudmFsdWUpO1xuICAgIGlmIChkZXRhY2hlZFJvdXRlSGFuZGxlKSB7XG4gICAgICBjb25zdCB0cmVlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4gPSBkZXRhY2hlZFJvdXRlSGFuZGxlLnJvdXRlO1xuICAgICAgc2V0RnV0dXJlU25hcHNob3RzT2ZBY3RpdmF0ZWRSb3V0ZXMoY3VyciwgdHJlZSk7XG4gICAgICByZXR1cm4gdHJlZTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IGNyZWF0ZUFjdGl2YXRlZFJvdXRlKGN1cnIudmFsdWUpO1xuICAgICAgY29uc3QgY2hpbGRyZW4gPSBjdXJyLmNoaWxkcmVuLm1hcChjID0+IGNyZWF0ZU5vZGUocm91dGVSZXVzZVN0cmF0ZWd5LCBjKSk7XG4gICAgICByZXR1cm4gbmV3IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPih2YWx1ZSwgY2hpbGRyZW4pO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRGdXR1cmVTbmFwc2hvdHNPZkFjdGl2YXRlZFJvdXRlcyhcbiAgICBjdXJyOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PiwgcmVzdWx0OiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4pOiB2b2lkIHtcbiAgaWYgKGN1cnIudmFsdWUucm91dGVDb25maWcgIT09IHJlc3VsdC52YWx1ZS5yb3V0ZUNvbmZpZykge1xuICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHJlYXR0YWNoIEFjdGl2YXRlZFJvdXRlU25hcHNob3QgY3JlYXRlZCBmcm9tIGEgZGlmZmVyZW50IHJvdXRlJyk7XG4gIH1cbiAgaWYgKGN1cnIuY2hpbGRyZW4ubGVuZ3RoICE9PSByZXN1bHQuY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgcmVhdHRhY2ggQWN0aXZhdGVkUm91dGVTbmFwc2hvdCB3aXRoIGEgZGlmZmVyZW50IG51bWJlciBvZiBjaGlsZHJlbicpO1xuICB9XG4gIHJlc3VsdC52YWx1ZS5fZnV0dXJlU25hcHNob3QgPSBjdXJyLnZhbHVlO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGN1cnIuY2hpbGRyZW4ubGVuZ3RoOyArK2kpIHtcbiAgICBzZXRGdXR1cmVTbmFwc2hvdHNPZkFjdGl2YXRlZFJvdXRlcyhjdXJyLmNoaWxkcmVuW2ldLCByZXN1bHQuY2hpbGRyZW5baV0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU9yUmV1c2VDaGlsZHJlbihcbiAgICByb3V0ZVJldXNlU3RyYXRlZ3k6IFJvdXRlUmV1c2VTdHJhdGVneSwgY3VycjogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4sXG4gICAgcHJldlN0YXRlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4pIHtcbiAgcmV0dXJuIGN1cnIuY2hpbGRyZW4ubWFwKGNoaWxkID0+IHtcbiAgICBmb3IgKGNvbnN0IHAgb2YgcHJldlN0YXRlLmNoaWxkcmVuKSB7XG4gICAgICBpZiAocm91dGVSZXVzZVN0cmF0ZWd5LnNob3VsZFJldXNlUm91dGUocC52YWx1ZS5zbmFwc2hvdCwgY2hpbGQudmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVOb2RlKHJvdXRlUmV1c2VTdHJhdGVneSwgY2hpbGQsIHApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY3JlYXRlTm9kZShyb3V0ZVJldXNlU3RyYXRlZ3ksIGNoaWxkKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUFjdGl2YXRlZFJvdXRlKGM6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpIHtcbiAgcmV0dXJuIG5ldyBBY3RpdmF0ZWRSb3V0ZShcbiAgICAgIG5ldyBCZWhhdmlvclN1YmplY3QoYy51cmwpLCBuZXcgQmVoYXZpb3JTdWJqZWN0KGMucGFyYW1zKSwgbmV3IEJlaGF2aW9yU3ViamVjdChjLnF1ZXJ5UGFyYW1zKSxcbiAgICAgIG5ldyBCZWhhdmlvclN1YmplY3QoYy5mcmFnbWVudCksIG5ldyBCZWhhdmlvclN1YmplY3QoYy5kYXRhKSwgYy5vdXRsZXQsIGMuY29tcG9uZW50LCBjKTtcbn1cbiJdfQ==