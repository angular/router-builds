/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.7+sha-10081a9", ngImport: i0, type: RouteReuseStrategy, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.2.7+sha-10081a9", ngImport: i0, type: RouteReuseStrategy, providedIn: 'root', useFactory: () => inject(DefaultRouteReuseStrategy) }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.7+sha-10081a9", ngImport: i0, type: RouteReuseStrategy, decorators: [{
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.7+sha-10081a9", ngImport: i0, type: DefaultRouteReuseStrategy, deps: null, target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.2.7+sha-10081a9", ngImport: i0, type: DefaultRouteReuseStrategy, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.7+sha-10081a9", ngImport: i0, type: DefaultRouteReuseStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVfcmV1c2Vfc3RyYXRlZ3kuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3JvdXRlX3JldXNlX3N0cmF0ZWd5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBZSxNQUFNLEVBQUUsVUFBVSxFQUFDLE1BQU0sZUFBZSxDQUFDOztBQXlCL0Q7Ozs7OztHQU1HO0FBRUgsTUFBTSxPQUFnQixrQkFBa0I7eUhBQWxCLGtCQUFrQjs2SEFBbEIsa0JBQWtCLGNBRGYsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQzs7c0dBQzlELGtCQUFrQjtrQkFEdkMsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxFQUFDOztBQXNCckY7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQkc7QUFDSCxNQUFNLE9BQWdCLHNCQUFzQjtJQUMxQzs7O1NBR0s7SUFDTCxZQUFZLENBQUMsS0FBNkI7UUFDeEMsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsS0FBNkIsRUFBRSxZQUFpQyxJQUFTLENBQUM7SUFFaEYsK0VBQStFO0lBQy9FLFlBQVksQ0FBQyxLQUE2QjtRQUN4QyxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxtRkFBbUY7SUFDbkYsUUFBUSxDQUFDLEtBQTZCO1FBQ3BDLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxnQkFBZ0IsQ0FBQyxNQUE4QixFQUFFLElBQTRCO1FBQzNFLE9BQU8sTUFBTSxDQUFDLFdBQVcsS0FBSyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ2pELENBQUM7Q0FDRjtBQUdELE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxzQkFBc0I7eUhBQXhELHlCQUF5Qjs2SEFBekIseUJBQXlCLGNBRGIsTUFBTTs7c0dBQ2xCLHlCQUF5QjtrQkFEckMsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5kZXYvbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29tcG9uZW50UmVmLCBpbmplY3QsIEluamVjdGFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQge091dGxldENvbnRleHR9IGZyb20gJy4vcm91dGVyX291dGxldF9jb250ZXh0JztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGUsIEFjdGl2YXRlZFJvdXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7VHJlZU5vZGV9IGZyb20gJy4vdXRpbHMvdHJlZSc7XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgZGV0YWNoZWQgcm91dGUgdHJlZS5cbiAqXG4gKiBUaGlzIGlzIGFuIG9wYXF1ZSB2YWx1ZSB0aGUgcm91dGVyIHdpbGwgZ2l2ZSB0byBhIGN1c3RvbSByb3V0ZSByZXVzZSBzdHJhdGVneVxuICogdG8gc3RvcmUgYW5kIHJldHJpZXZlIGxhdGVyIG9uLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgRGV0YWNoZWRSb3V0ZUhhbmRsZSA9IHt9O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBEZXRhY2hlZFJvdXRlSGFuZGxlSW50ZXJuYWwgPSB7XG4gIGNvbnRleHRzOiBNYXA8c3RyaW5nLCBPdXRsZXRDb250ZXh0PjtcbiAgY29tcG9uZW50UmVmOiBDb21wb25lbnRSZWY8YW55PjtcbiAgcm91dGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPjtcbn07XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUHJvdmlkZXMgYSB3YXkgdG8gY3VzdG9taXplIHdoZW4gYWN0aXZhdGVkIHJvdXRlcyBnZXQgcmV1c2VkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290JywgdXNlRmFjdG9yeTogKCkgPT4gaW5qZWN0KERlZmF1bHRSb3V0ZVJldXNlU3RyYXRlZ3kpfSlcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBSb3V0ZVJldXNlU3RyYXRlZ3kge1xuICAvKiogRGV0ZXJtaW5lcyBpZiB0aGlzIHJvdXRlIChhbmQgaXRzIHN1YnRyZWUpIHNob3VsZCBiZSBkZXRhY2hlZCB0byBiZSByZXVzZWQgbGF0ZXIgKi9cbiAgYWJzdHJhY3Qgc2hvdWxkRGV0YWNoKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogYm9vbGVhbjtcblxuICAvKipcbiAgICogU3RvcmVzIHRoZSBkZXRhY2hlZCByb3V0ZS5cbiAgICpcbiAgICogU3RvcmluZyBhIGBudWxsYCB2YWx1ZSBzaG91bGQgZXJhc2UgdGhlIHByZXZpb3VzbHkgc3RvcmVkIHZhbHVlLlxuICAgKi9cbiAgYWJzdHJhY3Qgc3RvcmUocm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGhhbmRsZTogRGV0YWNoZWRSb3V0ZUhhbmRsZSB8IG51bGwpOiB2b2lkO1xuXG4gIC8qKiBEZXRlcm1pbmVzIGlmIHRoaXMgcm91dGUgKGFuZCBpdHMgc3VidHJlZSkgc2hvdWxkIGJlIHJlYXR0YWNoZWQgKi9cbiAgYWJzdHJhY3Qgc2hvdWxkQXR0YWNoKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogYm9vbGVhbjtcblxuICAvKiogUmV0cmlldmVzIHRoZSBwcmV2aW91c2x5IHN0b3JlZCByb3V0ZSAqL1xuICBhYnN0cmFjdCByZXRyaWV2ZShyb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IERldGFjaGVkUm91dGVIYW5kbGUgfCBudWxsO1xuXG4gIC8qKiBEZXRlcm1pbmVzIGlmIGEgcm91dGUgc2hvdWxkIGJlIHJldXNlZCAqL1xuICBhYnN0cmFjdCBzaG91bGRSZXVzZVJvdXRlKGZ1dHVyZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgY3VycjogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogVGhpcyBiYXNlIHJvdXRlIHJldXNlIHN0cmF0ZWd5IG9ubHkgcmV1c2VzIHJvdXRlcyB3aGVuIHRoZSBtYXRjaGVkIHJvdXRlciBjb25maWdzIGFyZVxuICogaWRlbnRpY2FsLiBUaGlzIHByZXZlbnRzIGNvbXBvbmVudHMgZnJvbSBiZWluZyBkZXN0cm95ZWQgYW5kIHJlY3JlYXRlZFxuICogd2hlbiBqdXN0IHRoZSByb3V0ZSBwYXJhbWV0ZXJzLCBxdWVyeSBwYXJhbWV0ZXJzIG9yIGZyYWdtZW50IGNoYW5nZVxuICogKHRoYXQgaXMsIHRoZSBleGlzdGluZyBjb21wb25lbnQgaXMgX3JldXNlZF8pLlxuICpcbiAqIFRoaXMgc3RyYXRlZ3kgZG9lcyBub3Qgc3RvcmUgYW55IHJvdXRlcyBmb3IgbGF0ZXIgcmV1c2UuXG4gKlxuICogQW5ndWxhciB1c2VzIHRoaXMgc3RyYXRlZ3kgYnkgZGVmYXVsdC5cbiAqXG4gKlxuICogSXQgY2FuIGJlIHVzZWQgYXMgYSBiYXNlIGNsYXNzIGZvciBjdXN0b20gcm91dGUgcmV1c2Ugc3RyYXRlZ2llcywgaS5lLiB5b3UgY2FuIGNyZWF0ZSB5b3VyIG93blxuICogY2xhc3MgdGhhdCBleHRlbmRzIHRoZSBgQmFzZVJvdXRlUmV1c2VTdHJhdGVneWAgb25lLlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQmFzZVJvdXRlUmV1c2VTdHJhdGVneSBpbXBsZW1lbnRzIFJvdXRlUmV1c2VTdHJhdGVneSB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBnaXZlbiByb3V0ZSBzaG91bGQgZGV0YWNoIGZvciBsYXRlciByZXVzZS5cbiAgICogQWx3YXlzIHJldHVybnMgZmFsc2UgZm9yIGBCYXNlUm91dGVSZXVzZVN0cmF0ZWd5YC5cbiAgICogKi9cbiAgc2hvdWxkRGV0YWNoKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgbm8tb3A7IHRoZSByb3V0ZSBpcyBuZXZlciBzdG9yZWQgc2luY2UgdGhpcyBzdHJhdGVneSBuZXZlciBkZXRhY2hlcyByb3V0ZXMgZm9yIGxhdGVyIHJlLXVzZS5cbiAgICovXG4gIHN0b3JlKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBkZXRhY2hlZFRyZWU6IERldGFjaGVkUm91dGVIYW5kbGUpOiB2b2lkIHt9XG5cbiAgLyoqIFJldHVybnMgYGZhbHNlYCwgbWVhbmluZyB0aGUgcm91dGUgKGFuZCBpdHMgc3VidHJlZSkgaXMgbmV2ZXIgcmVhdHRhY2hlZCAqL1xuICBzaG91bGRBdHRhY2gocm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKiogUmV0dXJucyBgbnVsbGAgYmVjYXVzZSB0aGlzIHN0cmF0ZWd5IGRvZXMgbm90IHN0b3JlIHJvdXRlcyBmb3IgbGF0ZXIgcmUtdXNlLiAqL1xuICByZXRyaWV2ZShyb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IERldGFjaGVkUm91dGVIYW5kbGUgfCBudWxsIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIGlmIGEgcm91dGUgc2hvdWxkIGJlIHJldXNlZC5cbiAgICogVGhpcyBzdHJhdGVneSByZXR1cm5zIGB0cnVlYCB3aGVuIHRoZSBmdXR1cmUgcm91dGUgY29uZmlnIGFuZCBjdXJyZW50IHJvdXRlIGNvbmZpZyBhcmVcbiAgICogaWRlbnRpY2FsLlxuICAgKi9cbiAgc2hvdWxkUmV1c2VSb3V0ZShmdXR1cmU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGN1cnI6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZnV0dXJlLnJvdXRlQ29uZmlnID09PSBjdXJyLnJvdXRlQ29uZmlnO1xuICB9XG59XG5cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCd9KVxuZXhwb3J0IGNsYXNzIERlZmF1bHRSb3V0ZVJldXNlU3RyYXRlZ3kgZXh0ZW5kcyBCYXNlUm91dGVSZXVzZVN0cmF0ZWd5IHt9XG4iXX0=