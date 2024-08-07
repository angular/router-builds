/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { inject, Injectable } from '@angular/core';
import * as i0 from "@angular/core";
/**
 * @description
 *
 * Provides a way to customize when activated routes get reused.
 *
 * @publicApi
 */
export class RouteReuseStrategy {
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: RouteReuseStrategy, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: RouteReuseStrategy, providedIn: 'root', useFactory: () => inject(DefaultRouteReuseStrategy) }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: RouteReuseStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root', useFactory: () => inject(DefaultRouteReuseStrategy) }]
        }] });
/**
 * @description
 *
 * This base route reuse strategy only reuses routes when the matched router configs are
 * identical. This prevents components from being destroyed and recreated
 * when just the route parameters, query parameters or fragment change
 * (that is, the existing component is _reused_).
 *
 * This strategy does not store any routes for later reuse.
 *
 * Angular uses this strategy by default.
 *
 *
 * It can be used as a base class for custom route reuse strategies, i.e. you can create your own
 * class that extends the `BaseRouteReuseStrategy` one.
 * @publicApi
 */
export class BaseRouteReuseStrategy {
    /**
     * Whether the given route should detach for later reuse.
     * Always returns false for `BaseRouteReuseStrategy`.
     * */
    shouldDetach(route) {
        return false;
    }
    /**
     * A no-op; the route is never stored since this strategy never detaches routes for later re-use.
     */
    store(route, detachedTree) { }
    /** Returns `false`, meaning the route (and its subtree) is never reattached */
    shouldAttach(route) {
        return false;
    }
    /** Returns `null` because this strategy does not store routes for later re-use. */
    retrieve(route) {
        return null;
    }
    /**
     * Determines if a route should be reused.
     * This strategy returns `true` when the future route config and current route config are
     * identical.
     */
    shouldReuseRoute(future, curr) {
        return future.routeConfig === curr.routeConfig;
    }
}
export class DefaultRouteReuseStrategy extends BaseRouteReuseStrategy {
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: DefaultRouteReuseStrategy, deps: null, target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: DefaultRouteReuseStrategy, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: DefaultRouteReuseStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVfcmV1c2Vfc3RyYXRlZ3kuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3JvdXRlX3JldXNlX3N0cmF0ZWd5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBZSxNQUFNLEVBQUUsVUFBVSxFQUFDLE1BQU0sZUFBZSxDQUFDOztBQXlCL0Q7Ozs7OztHQU1HO0FBRUgsTUFBTSxPQUFnQixrQkFBa0I7eUhBQWxCLGtCQUFrQjs2SEFBbEIsa0JBQWtCLGNBRGYsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQzs7c0dBQzlELGtCQUFrQjtrQkFEdkMsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxFQUFDOztBQXNCckY7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQkc7QUFDSCxNQUFNLE9BQWdCLHNCQUFzQjtJQUMxQzs7O1NBR0s7SUFDTCxZQUFZLENBQUMsS0FBNkI7UUFDeEMsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsS0FBNkIsRUFBRSxZQUFpQyxJQUFTLENBQUM7SUFFaEYsK0VBQStFO0lBQy9FLFlBQVksQ0FBQyxLQUE2QjtRQUN4QyxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxtRkFBbUY7SUFDbkYsUUFBUSxDQUFDLEtBQTZCO1FBQ3BDLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxnQkFBZ0IsQ0FBQyxNQUE4QixFQUFFLElBQTRCO1FBQzNFLE9BQU8sTUFBTSxDQUFDLFdBQVcsS0FBSyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ2pELENBQUM7Q0FDRjtBQUdELE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxzQkFBc0I7eUhBQXhELHlCQUF5Qjs2SEFBekIseUJBQXlCLGNBRGIsTUFBTTs7c0dBQ2xCLHlCQUF5QjtrQkFEckMsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb21wb25lbnRSZWYsIGluamVjdCwgSW5qZWN0YWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7T3V0bGV0Q29udGV4dH0gZnJvbSAnLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZSwgQWN0aXZhdGVkUm91dGVTbmFwc2hvdH0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtUcmVlTm9kZX0gZnJvbSAnLi91dGlscy90cmVlJztcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIHRoZSBkZXRhY2hlZCByb3V0ZSB0cmVlLlxuICpcbiAqIFRoaXMgaXMgYW4gb3BhcXVlIHZhbHVlIHRoZSByb3V0ZXIgd2lsbCBnaXZlIHRvIGEgY3VzdG9tIHJvdXRlIHJldXNlIHN0cmF0ZWd5XG4gKiB0byBzdG9yZSBhbmQgcmV0cmlldmUgbGF0ZXIgb24uXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBEZXRhY2hlZFJvdXRlSGFuZGxlID0ge307XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIERldGFjaGVkUm91dGVIYW5kbGVJbnRlcm5hbCA9IHtcbiAgY29udGV4dHM6IE1hcDxzdHJpbmcsIE91dGxldENvbnRleHQ+O1xuICBjb21wb25lbnRSZWY6IENvbXBvbmVudFJlZjxhbnk+O1xuICByb3V0ZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+O1xufTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBQcm92aWRlcyBhIHdheSB0byBjdXN0b21pemUgd2hlbiBhY3RpdmF0ZWQgcm91dGVzIGdldCByZXVzZWQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnLCB1c2VGYWN0b3J5OiAoKSA9PiBpbmplY3QoRGVmYXVsdFJvdXRlUmV1c2VTdHJhdGVneSl9KVxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFJvdXRlUmV1c2VTdHJhdGVneSB7XG4gIC8qKiBEZXRlcm1pbmVzIGlmIHRoaXMgcm91dGUgKGFuZCBpdHMgc3VidHJlZSkgc2hvdWxkIGJlIGRldGFjaGVkIHRvIGJlIHJldXNlZCBsYXRlciAqL1xuICBhYnN0cmFjdCBzaG91bGREZXRhY2gocm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBTdG9yZXMgdGhlIGRldGFjaGVkIHJvdXRlLlxuICAgKlxuICAgKiBTdG9yaW5nIGEgYG51bGxgIHZhbHVlIHNob3VsZCBlcmFzZSB0aGUgcHJldmlvdXNseSBzdG9yZWQgdmFsdWUuXG4gICAqL1xuICBhYnN0cmFjdCBzdG9yZShyb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgaGFuZGxlOiBEZXRhY2hlZFJvdXRlSGFuZGxlIHwgbnVsbCk6IHZvaWQ7XG5cbiAgLyoqIERldGVybWluZXMgaWYgdGhpcyByb3V0ZSAoYW5kIGl0cyBzdWJ0cmVlKSBzaG91bGQgYmUgcmVhdHRhY2hlZCAqL1xuICBhYnN0cmFjdCBzaG91bGRBdHRhY2gocm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBib29sZWFuO1xuXG4gIC8qKiBSZXRyaWV2ZXMgdGhlIHByZXZpb3VzbHkgc3RvcmVkIHJvdXRlICovXG4gIGFic3RyYWN0IHJldHJpZXZlKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogRGV0YWNoZWRSb3V0ZUhhbmRsZSB8IG51bGw7XG5cbiAgLyoqIERldGVybWluZXMgaWYgYSByb3V0ZSBzaG91bGQgYmUgcmV1c2VkICovXG4gIGFic3RyYWN0IHNob3VsZFJldXNlUm91dGUoZnV0dXJlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBjdXJyOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBUaGlzIGJhc2Ugcm91dGUgcmV1c2Ugc3RyYXRlZ3kgb25seSByZXVzZXMgcm91dGVzIHdoZW4gdGhlIG1hdGNoZWQgcm91dGVyIGNvbmZpZ3MgYXJlXG4gKiBpZGVudGljYWwuIFRoaXMgcHJldmVudHMgY29tcG9uZW50cyBmcm9tIGJlaW5nIGRlc3Ryb3llZCBhbmQgcmVjcmVhdGVkXG4gKiB3aGVuIGp1c3QgdGhlIHJvdXRlIHBhcmFtZXRlcnMsIHF1ZXJ5IHBhcmFtZXRlcnMgb3IgZnJhZ21lbnQgY2hhbmdlXG4gKiAodGhhdCBpcywgdGhlIGV4aXN0aW5nIGNvbXBvbmVudCBpcyBfcmV1c2VkXykuXG4gKlxuICogVGhpcyBzdHJhdGVneSBkb2VzIG5vdCBzdG9yZSBhbnkgcm91dGVzIGZvciBsYXRlciByZXVzZS5cbiAqXG4gKiBBbmd1bGFyIHVzZXMgdGhpcyBzdHJhdGVneSBieSBkZWZhdWx0LlxuICpcbiAqXG4gKiBJdCBjYW4gYmUgdXNlZCBhcyBhIGJhc2UgY2xhc3MgZm9yIGN1c3RvbSByb3V0ZSByZXVzZSBzdHJhdGVnaWVzLCBpLmUuIHlvdSBjYW4gY3JlYXRlIHlvdXIgb3duXG4gKiBjbGFzcyB0aGF0IGV4dGVuZHMgdGhlIGBCYXNlUm91dGVSZXVzZVN0cmF0ZWd5YCBvbmUuXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBCYXNlUm91dGVSZXVzZVN0cmF0ZWd5IGltcGxlbWVudHMgUm91dGVSZXVzZVN0cmF0ZWd5IHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGdpdmVuIHJvdXRlIHNob3VsZCBkZXRhY2ggZm9yIGxhdGVyIHJldXNlLlxuICAgKiBBbHdheXMgcmV0dXJucyBmYWxzZSBmb3IgYEJhc2VSb3V0ZVJldXNlU3RyYXRlZ3lgLlxuICAgKiAqL1xuICBzaG91bGREZXRhY2gocm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQSBuby1vcDsgdGhlIHJvdXRlIGlzIG5ldmVyIHN0b3JlZCBzaW5jZSB0aGlzIHN0cmF0ZWd5IG5ldmVyIGRldGFjaGVzIHJvdXRlcyBmb3IgbGF0ZXIgcmUtdXNlLlxuICAgKi9cbiAgc3RvcmUocm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGRldGFjaGVkVHJlZTogRGV0YWNoZWRSb3V0ZUhhbmRsZSk6IHZvaWQge31cblxuICAvKiogUmV0dXJucyBgZmFsc2VgLCBtZWFuaW5nIHRoZSByb3V0ZSAoYW5kIGl0cyBzdWJ0cmVlKSBpcyBuZXZlciByZWF0dGFjaGVkICovXG4gIHNob3VsZEF0dGFjaChyb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIGBudWxsYCBiZWNhdXNlIHRoaXMgc3RyYXRlZ3kgZG9lcyBub3Qgc3RvcmUgcm91dGVzIGZvciBsYXRlciByZS11c2UuICovXG4gIHJldHJpZXZlKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogRGV0YWNoZWRSb3V0ZUhhbmRsZSB8IG51bGwge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgaWYgYSByb3V0ZSBzaG91bGQgYmUgcmV1c2VkLlxuICAgKiBUaGlzIHN0cmF0ZWd5IHJldHVybnMgYHRydWVgIHdoZW4gdGhlIGZ1dHVyZSByb3V0ZSBjb25maWcgYW5kIGN1cnJlbnQgcm91dGUgY29uZmlnIGFyZVxuICAgKiBpZGVudGljYWwuXG4gICAqL1xuICBzaG91bGRSZXVzZVJvdXRlKGZ1dHVyZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgY3VycjogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmdXR1cmUucm91dGVDb25maWcgPT09IGN1cnIucm91dGVDb25maWc7XG4gIH1cbn1cblxuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgRGVmYXVsdFJvdXRlUmV1c2VTdHJhdGVneSBleHRlbmRzIEJhc2VSb3V0ZVJldXNlU3RyYXRlZ3kge31cbiJdfQ==