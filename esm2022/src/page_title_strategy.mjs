/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
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
 * @see [Page title guide](guide/router#setting-the-page-title)
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
            route = route.children.find(child => child.outlet === PRIMARY_OUTLET);
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.2.0-next.0+sha-25f91e3", ngImport: i0, type: TitleStrategy, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.2.0-next.0+sha-25f91e3", ngImport: i0, type: TitleStrategy, providedIn: 'root', useFactory: () => inject(DefaultTitleStrategy) }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.2.0-next.0+sha-25f91e3", ngImport: i0, type: TitleStrategy, decorators: [{
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.2.0-next.0+sha-25f91e3", ngImport: i0, type: DefaultTitleStrategy, deps: [{ token: i1.Title }], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.2.0-next.0+sha-25f91e3", ngImport: i0, type: DefaultTitleStrategy, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.2.0-next.0+sha-25f91e3", ngImport: i0, type: DefaultTitleStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: () => [{ type: i1.Title }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFnZV90aXRsZV9zdHJhdGVneS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcGFnZV90aXRsZV9zdHJhdGVneS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsTUFBTSxFQUFFLFVBQVUsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNqRCxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFHaEQsT0FBTyxFQUFDLGNBQWMsRUFBRSxhQUFhLEVBQUMsTUFBTSxVQUFVLENBQUM7OztBQUV2RDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXNCRztBQUVILE1BQU0sT0FBZ0IsYUFBYTtJQUlqQzs7T0FFRztJQUNILFVBQVUsQ0FBQyxRQUE2QjtRQUN0QyxJQUFJLFNBQTJCLENBQUM7UUFDaEMsSUFBSSxLQUFLLEdBQXFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFDNUQsT0FBTyxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDM0IsU0FBUyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxTQUFTLENBQUM7WUFDOUQsS0FBSyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxjQUFjLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQUVEOzs7T0FHRztJQUNILHdCQUF3QixDQUFDLFFBQWdDO1FBQ3ZELE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUN0QyxDQUFDO3lIQXZCbUIsYUFBYTs2SEFBYixhQUFhLGNBRFYsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQzs7c0dBQ3pELGFBQWE7a0JBRGxDLFVBQVU7bUJBQUMsRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsRUFBQzs7QUEyQmhGOztHQUVHO0FBRUgsTUFBTSxPQUFPLG9CQUFxQixTQUFRLGFBQWE7SUFDckQsWUFBcUIsS0FBWTtRQUMvQixLQUFLLEVBQUUsQ0FBQztRQURXLFVBQUssR0FBTCxLQUFLLENBQU87SUFFakMsQ0FBQztJQUVEOzs7O09BSUc7SUFDTSxXQUFXLENBQUMsUUFBNkI7UUFDaEQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4QyxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QixDQUFDO0lBQ0gsQ0FBQzt5SEFmVSxvQkFBb0I7NkhBQXBCLG9CQUFvQixjQURSLE1BQU07O3NHQUNsQixvQkFBb0I7a0JBRGhDLFVBQVU7bUJBQUMsRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7aW5qZWN0LCBJbmplY3RhYmxlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7VGl0bGV9IGZyb20gJ0Bhbmd1bGFyL3BsYXRmb3JtLWJyb3dzZXInO1xuXG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIFJvdXRlclN0YXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UFJJTUFSWV9PVVRMRVQsIFJvdXRlVGl0bGVLZXl9IGZyb20gJy4vc2hhcmVkJztcblxuLyoqXG4gKiBQcm92aWRlcyBhIHN0cmF0ZWd5IGZvciBzZXR0aW5nIHRoZSBwYWdlIHRpdGxlIGFmdGVyIGEgcm91dGVyIG5hdmlnYXRpb24uXG4gKlxuICogVGhlIGJ1aWx0LWluIGltcGxlbWVudGF0aW9uIHRyYXZlcnNlcyB0aGUgcm91dGVyIHN0YXRlIHNuYXBzaG90IGFuZCBmaW5kcyB0aGUgZGVlcGVzdCBwcmltYXJ5XG4gKiBvdXRsZXQgd2l0aCBgdGl0bGVgIHByb3BlcnR5LiBHaXZlbiB0aGUgYFJvdXRlc2AgYmVsb3csIG5hdmlnYXRpbmcgdG9cbiAqIGAvYmFzZS9jaGlsZChwb3B1cDphdXgpYCB3b3VsZCByZXN1bHQgaW4gdGhlIGRvY3VtZW50IHRpdGxlIGJlaW5nIHNldCB0byBcImNoaWxkXCIuXG4gKiBgYGBcbiAqIFtcbiAqICAge3BhdGg6ICdiYXNlJywgdGl0bGU6ICdiYXNlJywgY2hpbGRyZW46IFtcbiAqICAgICB7cGF0aDogJ2NoaWxkJywgdGl0bGU6ICdjaGlsZCd9LFxuICogICBdLFxuICogICB7cGF0aDogJ2F1eCcsIG91dGxldDogJ3BvcHVwJywgdGl0bGU6ICdwb3B1cFRpdGxlJ31cbiAqIF1cbiAqIGBgYFxuICpcbiAqIFRoaXMgY2xhc3MgY2FuIGJlIHVzZWQgYXMgYSBiYXNlIGNsYXNzIGZvciBjdXN0b20gdGl0bGUgc3RyYXRlZ2llcy4gVGhhdCBpcywgeW91IGNhbiBjcmVhdGUgeW91clxuICogb3duIGNsYXNzIHRoYXQgZXh0ZW5kcyB0aGUgYFRpdGxlU3RyYXRlZ3lgLiBOb3RlIHRoYXQgaW4gdGhlIGFib3ZlIGV4YW1wbGUsIHRoZSBgdGl0bGVgXG4gKiBmcm9tIHRoZSBuYW1lZCBvdXRsZXQgaXMgbmV2ZXIgdXNlZC4gSG93ZXZlciwgYSBjdXN0b20gc3RyYXRlZ3kgbWlnaHQgYmUgaW1wbGVtZW50ZWQgdG9cbiAqIGluY29ycG9yYXRlIHRpdGxlcyBpbiBuYW1lZCBvdXRsZXRzLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqIEBzZWUgW1BhZ2UgdGl0bGUgZ3VpZGVdKGd1aWRlL3JvdXRlciNzZXR0aW5nLXRoZS1wYWdlLXRpdGxlKVxuICovXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnLCB1c2VGYWN0b3J5OiAoKSA9PiBpbmplY3QoRGVmYXVsdFRpdGxlU3RyYXRlZ3kpfSlcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBUaXRsZVN0cmF0ZWd5IHtcbiAgLyoqIFBlcmZvcm1zIHRoZSBhcHBsaWNhdGlvbiB0aXRsZSB1cGRhdGUuICovXG4gIGFic3RyYWN0IHVwZGF0ZVRpdGxlKHNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90KTogdm9pZDtcblxuICAvKipcbiAgICogQHJldHVybnMgVGhlIGB0aXRsZWAgb2YgdGhlIGRlZXBlc3QgcHJpbWFyeSByb3V0ZS5cbiAgICovXG4gIGJ1aWxkVGl0bGUoc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QpOiBzdHJpbmd8dW5kZWZpbmVkIHtcbiAgICBsZXQgcGFnZVRpdGxlOiBzdHJpbmd8dW5kZWZpbmVkO1xuICAgIGxldCByb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdHx1bmRlZmluZWQgPSBzbmFwc2hvdC5yb290O1xuICAgIHdoaWxlIChyb3V0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBwYWdlVGl0bGUgPSB0aGlzLmdldFJlc29sdmVkVGl0bGVGb3JSb3V0ZShyb3V0ZSkgPz8gcGFnZVRpdGxlO1xuICAgICAgcm91dGUgPSByb3V0ZS5jaGlsZHJlbi5maW5kKGNoaWxkID0+IGNoaWxkLm91dGxldCA9PT0gUFJJTUFSWV9PVVRMRVQpO1xuICAgIH1cbiAgICByZXR1cm4gcGFnZVRpdGxlO1xuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGFuIGBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90YCwgcmV0dXJucyB0aGUgZmluYWwgdmFsdWUgb2YgdGhlXG4gICAqIGBSb3V0ZS50aXRsZWAgcHJvcGVydHksIHdoaWNoIGNhbiBlaXRoZXIgYmUgYSBzdGF0aWMgc3RyaW5nIG9yIGEgcmVzb2x2ZWQgdmFsdWUuXG4gICAqL1xuICBnZXRSZXNvbHZlZFRpdGxlRm9yUm91dGUoc25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpIHtcbiAgICByZXR1cm4gc25hcHNob3QuZGF0YVtSb3V0ZVRpdGxlS2V5XTtcbiAgfVxufVxuXG4vKipcbiAqIFRoZSBkZWZhdWx0IGBUaXRsZVN0cmF0ZWd5YCB1c2VkIGJ5IHRoZSByb3V0ZXIgdGhhdCB1cGRhdGVzIHRoZSB0aXRsZSB1c2luZyB0aGUgYFRpdGxlYCBzZXJ2aWNlLlxuICovXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnfSlcbmV4cG9ydCBjbGFzcyBEZWZhdWx0VGl0bGVTdHJhdGVneSBleHRlbmRzIFRpdGxlU3RyYXRlZ3kge1xuICBjb25zdHJ1Y3RvcihyZWFkb25seSB0aXRsZTogVGl0bGUpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHRpdGxlIG9mIHRoZSBicm93c2VyIHRvIHRoZSBnaXZlbiB2YWx1ZS5cbiAgICpcbiAgICogQHBhcmFtIHRpdGxlIFRoZSBgcGFnZVRpdGxlYCBmcm9tIHRoZSBkZWVwZXN0IHByaW1hcnkgcm91dGUuXG4gICAqL1xuICBvdmVycmlkZSB1cGRhdGVUaXRsZShzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCk6IHZvaWQge1xuICAgIGNvbnN0IHRpdGxlID0gdGhpcy5idWlsZFRpdGxlKHNuYXBzaG90KTtcbiAgICBpZiAodGl0bGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy50aXRsZS5zZXRUaXRsZSh0aXRsZSk7XG4gICAgfVxuICB9XG59XG4iXX0=