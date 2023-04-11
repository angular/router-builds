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
class RouteReuseStrategy {
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.1.0-next.0+sha-8272b5b", ngImport: i0, type: RouteReuseStrategy, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.1.0-next.0+sha-8272b5b", ngImport: i0, type: RouteReuseStrategy, providedIn: 'root', useFactory: () => inject(DefaultRouteReuseStrategy) }); }
}
export { RouteReuseStrategy };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.1.0-next.0+sha-8272b5b", ngImport: i0, type: RouteReuseStrategy, decorators: [{
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
class DefaultRouteReuseStrategy extends BaseRouteReuseStrategy {
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.1.0-next.0+sha-8272b5b", ngImport: i0, type: DefaultRouteReuseStrategy, deps: null, target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.1.0-next.0+sha-8272b5b", ngImport: i0, type: DefaultRouteReuseStrategy, providedIn: 'root' }); }
}
export { DefaultRouteReuseStrategy };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.1.0-next.0+sha-8272b5b", ngImport: i0, type: DefaultRouteReuseStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVfcmV1c2Vfc3RyYXRlZ3kuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3JvdXRlX3JldXNlX3N0cmF0ZWd5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBZSxNQUFNLEVBQUUsVUFBVSxFQUFDLE1BQU0sZUFBZSxDQUFDOztBQXlCL0Q7Ozs7OztHQU1HO0FBQ0gsTUFDc0Isa0JBQWtCO3lIQUFsQixrQkFBa0I7NkhBQWxCLGtCQUFrQixjQURmLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUM7O1NBQzlELGtCQUFrQjtzR0FBbEIsa0JBQWtCO2tCQUR2QyxVQUFVO21CQUFDLEVBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLHlCQUF5QixDQUFDLEVBQUM7O0FBc0JyRjs7Ozs7Ozs7Ozs7Ozs7OztHQWdCRztBQUNILE1BQU0sT0FBZ0Isc0JBQXNCO0lBQzFDOzs7U0FHSztJQUNMLFlBQVksQ0FBQyxLQUE2QjtRQUN4QyxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxLQUE2QixFQUFFLFlBQWlDLElBQVMsQ0FBQztJQUVoRiwrRUFBK0U7SUFDL0UsWUFBWSxDQUFDLEtBQTZCO1FBQ3hDLE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVELG1GQUFtRjtJQUNuRixRQUFRLENBQUMsS0FBNkI7UUFDcEMsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILGdCQUFnQixDQUFDLE1BQThCLEVBQUUsSUFBNEI7UUFDM0UsT0FBTyxNQUFNLENBQUMsV0FBVyxLQUFLLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDakQsQ0FBQztDQUNGO0FBRUQsTUFDYSx5QkFBMEIsU0FBUSxzQkFBc0I7eUhBQXhELHlCQUF5Qjs2SEFBekIseUJBQXlCLGNBRGIsTUFBTTs7U0FDbEIseUJBQXlCO3NHQUF6Qix5QkFBeUI7a0JBRHJDLFVBQVU7bUJBQUMsRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29tcG9uZW50UmVmLCBpbmplY3QsIEluamVjdGFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQge091dGxldENvbnRleHR9IGZyb20gJy4vcm91dGVyX291dGxldF9jb250ZXh0JztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGUsIEFjdGl2YXRlZFJvdXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7VHJlZU5vZGV9IGZyb20gJy4vdXRpbHMvdHJlZSc7XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgZGV0YWNoZWQgcm91dGUgdHJlZS5cbiAqXG4gKiBUaGlzIGlzIGFuIG9wYXF1ZSB2YWx1ZSB0aGUgcm91dGVyIHdpbGwgZ2l2ZSB0byBhIGN1c3RvbSByb3V0ZSByZXVzZSBzdHJhdGVneVxuICogdG8gc3RvcmUgYW5kIHJldHJpZXZlIGxhdGVyIG9uLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgRGV0YWNoZWRSb3V0ZUhhbmRsZSA9IHt9O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBEZXRhY2hlZFJvdXRlSGFuZGxlSW50ZXJuYWwgPSB7XG4gIGNvbnRleHRzOiBNYXA8c3RyaW5nLCBPdXRsZXRDb250ZXh0PixcbiAgY29tcG9uZW50UmVmOiBDb21wb25lbnRSZWY8YW55PixcbiAgcm91dGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPixcbn07XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUHJvdmlkZXMgYSB3YXkgdG8gY3VzdG9taXplIHdoZW4gYWN0aXZhdGVkIHJvdXRlcyBnZXQgcmV1c2VkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290JywgdXNlRmFjdG9yeTogKCkgPT4gaW5qZWN0KERlZmF1bHRSb3V0ZVJldXNlU3RyYXRlZ3kpfSlcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBSb3V0ZVJldXNlU3RyYXRlZ3kge1xuICAvKiogRGV0ZXJtaW5lcyBpZiB0aGlzIHJvdXRlIChhbmQgaXRzIHN1YnRyZWUpIHNob3VsZCBiZSBkZXRhY2hlZCB0byBiZSByZXVzZWQgbGF0ZXIgKi9cbiAgYWJzdHJhY3Qgc2hvdWxkRGV0YWNoKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogYm9vbGVhbjtcblxuICAvKipcbiAgICogU3RvcmVzIHRoZSBkZXRhY2hlZCByb3V0ZS5cbiAgICpcbiAgICogU3RvcmluZyBhIGBudWxsYCB2YWx1ZSBzaG91bGQgZXJhc2UgdGhlIHByZXZpb3VzbHkgc3RvcmVkIHZhbHVlLlxuICAgKi9cbiAgYWJzdHJhY3Qgc3RvcmUocm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGhhbmRsZTogRGV0YWNoZWRSb3V0ZUhhbmRsZXxudWxsKTogdm9pZDtcblxuICAvKiogRGV0ZXJtaW5lcyBpZiB0aGlzIHJvdXRlIChhbmQgaXRzIHN1YnRyZWUpIHNob3VsZCBiZSByZWF0dGFjaGVkICovXG4gIGFic3RyYWN0IHNob3VsZEF0dGFjaChyb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IGJvb2xlYW47XG5cbiAgLyoqIFJldHJpZXZlcyB0aGUgcHJldmlvdXNseSBzdG9yZWQgcm91dGUgKi9cbiAgYWJzdHJhY3QgcmV0cmlldmUocm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBEZXRhY2hlZFJvdXRlSGFuZGxlfG51bGw7XG5cbiAgLyoqIERldGVybWluZXMgaWYgYSByb3V0ZSBzaG91bGQgYmUgcmV1c2VkICovXG4gIGFic3RyYWN0IHNob3VsZFJldXNlUm91dGUoZnV0dXJlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBjdXJyOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBUaGlzIGJhc2Ugcm91dGUgcmV1c2Ugc3RyYXRlZ3kgb25seSByZXVzZXMgcm91dGVzIHdoZW4gdGhlIG1hdGNoZWQgcm91dGVyIGNvbmZpZ3MgYXJlXG4gKiBpZGVudGljYWwuIFRoaXMgcHJldmVudHMgY29tcG9uZW50cyBmcm9tIGJlaW5nIGRlc3Ryb3llZCBhbmQgcmVjcmVhdGVkXG4gKiB3aGVuIGp1c3QgdGhlIHJvdXRlIHBhcmFtZXRlcnMsIHF1ZXJ5IHBhcmFtZXRlcnMgb3IgZnJhZ21lbnQgY2hhbmdlXG4gKiAodGhhdCBpcywgdGhlIGV4aXN0aW5nIGNvbXBvbmVudCBpcyBfcmV1c2VkXykuXG4gKlxuICogVGhpcyBzdHJhdGVneSBkb2VzIG5vdCBzdG9yZSBhbnkgcm91dGVzIGZvciBsYXRlciByZXVzZS5cbiAqXG4gKiBBbmd1bGFyIHVzZXMgdGhpcyBzdHJhdGVneSBieSBkZWZhdWx0LlxuICpcbiAqXG4gKiBJdCBjYW4gYmUgdXNlZCBhcyBhIGJhc2UgY2xhc3MgZm9yIGN1c3RvbSByb3V0ZSByZXVzZSBzdHJhdGVnaWVzLCBpLmUuIHlvdSBjYW4gY3JlYXRlIHlvdXIgb3duXG4gKiBjbGFzcyB0aGF0IGV4dGVuZHMgdGhlIGBCYXNlUm91dGVSZXVzZVN0cmF0ZWd5YCBvbmUuXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBCYXNlUm91dGVSZXVzZVN0cmF0ZWd5IGltcGxlbWVudHMgUm91dGVSZXVzZVN0cmF0ZWd5IHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGdpdmVuIHJvdXRlIHNob3VsZCBkZXRhY2ggZm9yIGxhdGVyIHJldXNlLlxuICAgKiBBbHdheXMgcmV0dXJucyBmYWxzZSBmb3IgYEJhc2VSb3V0ZVJldXNlU3RyYXRlZ3lgLlxuICAgKiAqL1xuICBzaG91bGREZXRhY2gocm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQSBuby1vcDsgdGhlIHJvdXRlIGlzIG5ldmVyIHN0b3JlZCBzaW5jZSB0aGlzIHN0cmF0ZWd5IG5ldmVyIGRldGFjaGVzIHJvdXRlcyBmb3IgbGF0ZXIgcmUtdXNlLlxuICAgKi9cbiAgc3RvcmUocm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGRldGFjaGVkVHJlZTogRGV0YWNoZWRSb3V0ZUhhbmRsZSk6IHZvaWQge31cblxuICAvKiogUmV0dXJucyBgZmFsc2VgLCBtZWFuaW5nIHRoZSByb3V0ZSAoYW5kIGl0cyBzdWJ0cmVlKSBpcyBuZXZlciByZWF0dGFjaGVkICovXG4gIHNob3VsZEF0dGFjaChyb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIGBudWxsYCBiZWNhdXNlIHRoaXMgc3RyYXRlZ3kgZG9lcyBub3Qgc3RvcmUgcm91dGVzIGZvciBsYXRlciByZS11c2UuICovXG4gIHJldHJpZXZlKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogRGV0YWNoZWRSb3V0ZUhhbmRsZXxudWxsIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIGlmIGEgcm91dGUgc2hvdWxkIGJlIHJldXNlZC5cbiAgICogVGhpcyBzdHJhdGVneSByZXR1cm5zIGB0cnVlYCB3aGVuIHRoZSBmdXR1cmUgcm91dGUgY29uZmlnIGFuZCBjdXJyZW50IHJvdXRlIGNvbmZpZyBhcmVcbiAgICogaWRlbnRpY2FsLlxuICAgKi9cbiAgc2hvdWxkUmV1c2VSb3V0ZShmdXR1cmU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGN1cnI6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZnV0dXJlLnJvdXRlQ29uZmlnID09PSBjdXJyLnJvdXRlQ29uZmlnO1xuICB9XG59XG5cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCd9KVxuZXhwb3J0IGNsYXNzIERlZmF1bHRSb3V0ZVJldXNlU3RyYXRlZ3kgZXh0ZW5kcyBCYXNlUm91dGVSZXVzZVN0cmF0ZWd5IHtcbn1cbiJdfQ==