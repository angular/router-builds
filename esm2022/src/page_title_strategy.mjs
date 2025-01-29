/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { PRIMARY_OUTLET, RouteTitleKey } from './shared';
import * as i0 from "@angular/core";
import * as i1 from "@angular/platform-browser";
/**
 * Provides a strategy for setting the page title after a router navigation.
 *
 * The built-in implementation traverses the router state snapshot and finds the deepest primary
 * outlet with `title` property. Given the `Routes` below, navigating to
 * `/base/child(popup:aux)` would result in the document title being set to "child".
 * ```
 * [
 *   {path: 'base', title: 'base', children: [
 *     {path: 'child', title: 'child'},
 *   ],
 *   {path: 'aux', outlet: 'popup', title: 'popupTitle'}
 * ]
 * ```
 *
 * This class can be used as a base class for custom title strategies. That is, you can create your
 * own class that extends the `TitleStrategy`. Note that in the above example, the `title`
 * from the named outlet is never used. However, a custom strategy might be implemented to
 * incorporate titles in named outlets.
 *
 * @publicApi
 * @see [Page title guide](guide/routing/common-router-tasks#setting-the-page-title)
 */
export class TitleStrategy {
    /**
     * @returns The `title` of the deepest primary route.
     */
    buildTitle(snapshot) {
        let pageTitle;
        let route = snapshot.root;
        while (route !== undefined) {
            pageTitle = this.getResolvedTitleForRoute(route) ?? pageTitle;
            route = route.children.find((child) => child.outlet === PRIMARY_OUTLET);
        }
        return pageTitle;
    }
    /**
     * Given an `ActivatedRouteSnapshot`, returns the final value of the
     * `Route.title` property, which can either be a static string or a resolved value.
     */
    getResolvedTitleForRoute(snapshot) {
        return snapshot.data[RouteTitleKey];
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.13+sha-32512de", ngImport: i0, type: TitleStrategy, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.2.13+sha-32512de", ngImport: i0, type: TitleStrategy, providedIn: 'root', useFactory: () => inject(DefaultTitleStrategy) }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.13+sha-32512de", ngImport: i0, type: TitleStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root', useFactory: () => inject(DefaultTitleStrategy) }]
        }] });
/**
 * The default `TitleStrategy` used by the router that updates the title using the `Title` service.
 */
export class DefaultTitleStrategy extends TitleStrategy {
    constructor(title) {
        super();
        this.title = title;
    }
    /**
     * Sets the title of the browser to the given value.
     *
     * @param title The `pageTitle` from the deepest primary route.
     */
    updateTitle(snapshot) {
        const title = this.buildTitle(snapshot);
        if (title !== undefined) {
            this.title.setTitle(title);
        }
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.13+sha-32512de", ngImport: i0, type: DefaultTitleStrategy, deps: [{ token: i1.Title }], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.2.13+sha-32512de", ngImport: i0, type: DefaultTitleStrategy, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.13+sha-32512de", ngImport: i0, type: DefaultTitleStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: () => [{ type: i1.Title }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFnZV90aXRsZV9zdHJhdGVneS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcGFnZV90aXRsZV9zdHJhdGVneS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsTUFBTSxFQUFFLFVBQVUsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNqRCxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFHaEQsT0FBTyxFQUFDLGNBQWMsRUFBRSxhQUFhLEVBQUMsTUFBTSxVQUFVLENBQUM7OztBQUV2RDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXNCRztBQUVILE1BQU0sT0FBZ0IsYUFBYTtJQUlqQzs7T0FFRztJQUNILFVBQVUsQ0FBQyxRQUE2QjtRQUN0QyxJQUFJLFNBQTZCLENBQUM7UUFDbEMsSUFBSSxLQUFLLEdBQXVDLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFDOUQsT0FBTyxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDM0IsU0FBUyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxTQUFTLENBQUM7WUFDOUQsS0FBSyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLGNBQWMsQ0FBQyxDQUFDO1FBQzFFLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsd0JBQXdCLENBQUMsUUFBZ0M7UUFDdkQsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7eUhBdkJtQixhQUFhOzZIQUFiLGFBQWEsY0FEVixNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDOztzR0FDekQsYUFBYTtrQkFEbEMsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxFQUFDOztBQTJCaEY7O0dBRUc7QUFFSCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsYUFBYTtJQUNyRCxZQUFxQixLQUFZO1FBQy9CLEtBQUssRUFBRSxDQUFDO1FBRFcsVUFBSyxHQUFMLEtBQUssQ0FBTztJQUVqQyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNNLFdBQVcsQ0FBQyxRQUE2QjtRQUNoRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hDLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdCLENBQUM7SUFDSCxDQUFDO3lIQWZVLG9CQUFvQjs2SEFBcEIsb0JBQW9CLGNBRFIsTUFBTTs7c0dBQ2xCLG9CQUFvQjtrQkFEaEMsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5kZXYvbGljZW5zZVxuICovXG5cbmltcG9ydCB7aW5qZWN0LCBJbmplY3RhYmxlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7VGl0bGV9IGZyb20gJ0Bhbmd1bGFyL3BsYXRmb3JtLWJyb3dzZXInO1xuXG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIFJvdXRlclN0YXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UFJJTUFSWV9PVVRMRVQsIFJvdXRlVGl0bGVLZXl9IGZyb20gJy4vc2hhcmVkJztcblxuLyoqXG4gKiBQcm92aWRlcyBhIHN0cmF0ZWd5IGZvciBzZXR0aW5nIHRoZSBwYWdlIHRpdGxlIGFmdGVyIGEgcm91dGVyIG5hdmlnYXRpb24uXG4gKlxuICogVGhlIGJ1aWx0LWluIGltcGxlbWVudGF0aW9uIHRyYXZlcnNlcyB0aGUgcm91dGVyIHN0YXRlIHNuYXBzaG90IGFuZCBmaW5kcyB0aGUgZGVlcGVzdCBwcmltYXJ5XG4gKiBvdXRsZXQgd2l0aCBgdGl0bGVgIHByb3BlcnR5LiBHaXZlbiB0aGUgYFJvdXRlc2AgYmVsb3csIG5hdmlnYXRpbmcgdG9cbiAqIGAvYmFzZS9jaGlsZChwb3B1cDphdXgpYCB3b3VsZCByZXN1bHQgaW4gdGhlIGRvY3VtZW50IHRpdGxlIGJlaW5nIHNldCB0byBcImNoaWxkXCIuXG4gKiBgYGBcbiAqIFtcbiAqICAge3BhdGg6ICdiYXNlJywgdGl0bGU6ICdiYXNlJywgY2hpbGRyZW46IFtcbiAqICAgICB7cGF0aDogJ2NoaWxkJywgdGl0bGU6ICdjaGlsZCd9LFxuICogICBdLFxuICogICB7cGF0aDogJ2F1eCcsIG91dGxldDogJ3BvcHVwJywgdGl0bGU6ICdwb3B1cFRpdGxlJ31cbiAqIF1cbiAqIGBgYFxuICpcbiAqIFRoaXMgY2xhc3MgY2FuIGJlIHVzZWQgYXMgYSBiYXNlIGNsYXNzIGZvciBjdXN0b20gdGl0bGUgc3RyYXRlZ2llcy4gVGhhdCBpcywgeW91IGNhbiBjcmVhdGUgeW91clxuICogb3duIGNsYXNzIHRoYXQgZXh0ZW5kcyB0aGUgYFRpdGxlU3RyYXRlZ3lgLiBOb3RlIHRoYXQgaW4gdGhlIGFib3ZlIGV4YW1wbGUsIHRoZSBgdGl0bGVgXG4gKiBmcm9tIHRoZSBuYW1lZCBvdXRsZXQgaXMgbmV2ZXIgdXNlZC4gSG93ZXZlciwgYSBjdXN0b20gc3RyYXRlZ3kgbWlnaHQgYmUgaW1wbGVtZW50ZWQgdG9cbiAqIGluY29ycG9yYXRlIHRpdGxlcyBpbiBuYW1lZCBvdXRsZXRzLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqIEBzZWUgW1BhZ2UgdGl0bGUgZ3VpZGVdKGd1aWRlL3JvdXRpbmcvY29tbW9uLXJvdXRlci10YXNrcyNzZXR0aW5nLXRoZS1wYWdlLXRpdGxlKVxuICovXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnLCB1c2VGYWN0b3J5OiAoKSA9PiBpbmplY3QoRGVmYXVsdFRpdGxlU3RyYXRlZ3kpfSlcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBUaXRsZVN0cmF0ZWd5IHtcbiAgLyoqIFBlcmZvcm1zIHRoZSBhcHBsaWNhdGlvbiB0aXRsZSB1cGRhdGUuICovXG4gIGFic3RyYWN0IHVwZGF0ZVRpdGxlKHNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90KTogdm9pZDtcblxuICAvKipcbiAgICogQHJldHVybnMgVGhlIGB0aXRsZWAgb2YgdGhlIGRlZXBlc3QgcHJpbWFyeSByb3V0ZS5cbiAgICovXG4gIGJ1aWxkVGl0bGUoc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGxldCBwYWdlVGl0bGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBsZXQgcm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QgfCB1bmRlZmluZWQgPSBzbmFwc2hvdC5yb290O1xuICAgIHdoaWxlIChyb3V0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBwYWdlVGl0bGUgPSB0aGlzLmdldFJlc29sdmVkVGl0bGVGb3JSb3V0ZShyb3V0ZSkgPz8gcGFnZVRpdGxlO1xuICAgICAgcm91dGUgPSByb3V0ZS5jaGlsZHJlbi5maW5kKChjaGlsZCkgPT4gY2hpbGQub3V0bGV0ID09PSBQUklNQVJZX09VVExFVCk7XG4gICAgfVxuICAgIHJldHVybiBwYWdlVGl0bGU7XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYW4gYEFjdGl2YXRlZFJvdXRlU25hcHNob3RgLCByZXR1cm5zIHRoZSBmaW5hbCB2YWx1ZSBvZiB0aGVcbiAgICogYFJvdXRlLnRpdGxlYCBwcm9wZXJ0eSwgd2hpY2ggY2FuIGVpdGhlciBiZSBhIHN0YXRpYyBzdHJpbmcgb3IgYSByZXNvbHZlZCB2YWx1ZS5cbiAgICovXG4gIGdldFJlc29sdmVkVGl0bGVGb3JSb3V0ZShzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCkge1xuICAgIHJldHVybiBzbmFwc2hvdC5kYXRhW1JvdXRlVGl0bGVLZXldO1xuICB9XG59XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgYFRpdGxlU3RyYXRlZ3lgIHVzZWQgYnkgdGhlIHJvdXRlciB0aGF0IHVwZGF0ZXMgdGhlIHRpdGxlIHVzaW5nIHRoZSBgVGl0bGVgIHNlcnZpY2UuXG4gKi9cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCd9KVxuZXhwb3J0IGNsYXNzIERlZmF1bHRUaXRsZVN0cmF0ZWd5IGV4dGVuZHMgVGl0bGVTdHJhdGVneSB7XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHRpdGxlOiBUaXRsZSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgdGl0bGUgb2YgdGhlIGJyb3dzZXIgdG8gdGhlIGdpdmVuIHZhbHVlLlxuICAgKlxuICAgKiBAcGFyYW0gdGl0bGUgVGhlIGBwYWdlVGl0bGVgIGZyb20gdGhlIGRlZXBlc3QgcHJpbWFyeSByb3V0ZS5cbiAgICovXG4gIG92ZXJyaWRlIHVwZGF0ZVRpdGxlKHNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90KTogdm9pZCB7XG4gICAgY29uc3QgdGl0bGUgPSB0aGlzLmJ1aWxkVGl0bGUoc25hcHNob3QpO1xuICAgIGlmICh0aXRsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLnRpdGxlLnNldFRpdGxlKHRpdGxlKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==