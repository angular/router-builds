/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouteTitle as TitleKey } from './operators/resolve_data';
import { PRIMARY_OUTLET } from './shared';
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
        return snapshot.data[TitleKey];
    }
}
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
}
DefaultTitleStrategy.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.0.6+sha-f8a25f7", ngImport: i0, type: DefaultTitleStrategy, deps: [{ token: i1.Title }], target: i0.ɵɵFactoryTarget.Injectable });
DefaultTitleStrategy.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.0.6+sha-f8a25f7", ngImport: i0, type: DefaultTitleStrategy, providedIn: 'root' });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.0.6+sha-f8a25f7", ngImport: i0, type: DefaultTitleStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: function () { return [{ type: i1.Title }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFnZV90aXRsZV9zdHJhdGVneS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcGFnZV90aXRsZV9zdHJhdGVneS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3pDLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUVoRCxPQUFPLEVBQUMsVUFBVSxJQUFJLFFBQVEsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBRWhFLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7OztBQUV4Qzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXNCRztBQUNILE1BQU0sT0FBZ0IsYUFBYTtJQUlqQzs7T0FFRztJQUNILFVBQVUsQ0FBQyxRQUE2QjtRQUN0QyxJQUFJLFNBQTJCLENBQUM7UUFDaEMsSUFBSSxLQUFLLEdBQXFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFDNUQsT0FBTyxLQUFLLEtBQUssU0FBUyxFQUFFO1lBQzFCLFNBQVMsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLElBQUksU0FBUyxDQUFDO1lBQzlELEtBQUssR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssY0FBYyxDQUFDLENBQUM7U0FDdkU7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsd0JBQXdCLENBQUMsUUFBZ0M7UUFDdkQsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7Q0FDRjtBQUVEOztHQUVHO0FBRUgsTUFBTSxPQUFPLG9CQUFxQixTQUFRLGFBQWE7SUFDckQsWUFBcUIsS0FBWTtRQUMvQixLQUFLLEVBQUUsQ0FBQztRQURXLFVBQUssR0FBTCxLQUFLLENBQU87SUFFakMsQ0FBQztJQUVEOzs7O09BSUc7SUFDTSxXQUFXLENBQUMsUUFBNkI7UUFDaEQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4QyxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7WUFDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDNUI7SUFDSCxDQUFDOzs0SEFmVSxvQkFBb0I7Z0lBQXBCLG9CQUFvQixjQURSLE1BQU07c0dBQ2xCLG9CQUFvQjtrQkFEaEMsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtJbmplY3RhYmxlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7VGl0bGV9IGZyb20gJ0Bhbmd1bGFyL3BsYXRmb3JtLWJyb3dzZXInO1xuXG5pbXBvcnQge1JvdXRlVGl0bGUgYXMgVGl0bGVLZXl9IGZyb20gJy4vb3BlcmF0b3JzL3Jlc29sdmVfZGF0YSc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIFJvdXRlclN0YXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UFJJTUFSWV9PVVRMRVR9IGZyb20gJy4vc2hhcmVkJztcblxuLyoqXG4gKiBQcm92aWRlcyBhIHN0cmF0ZWd5IGZvciBzZXR0aW5nIHRoZSBwYWdlIHRpdGxlIGFmdGVyIGEgcm91dGVyIG5hdmlnYXRpb24uXG4gKlxuICogVGhlIGJ1aWx0LWluIGltcGxlbWVudGF0aW9uIHRyYXZlcnNlcyB0aGUgcm91dGVyIHN0YXRlIHNuYXBzaG90IGFuZCBmaW5kcyB0aGUgZGVlcGVzdCBwcmltYXJ5XG4gKiBvdXRsZXQgd2l0aCBgdGl0bGVgIHByb3BlcnR5LiBHaXZlbiB0aGUgYFJvdXRlc2AgYmVsb3csIG5hdmlnYXRpbmcgdG9cbiAqIGAvYmFzZS9jaGlsZChwb3B1cDphdXgpYCB3b3VsZCByZXN1bHQgaW4gdGhlIGRvY3VtZW50IHRpdGxlIGJlaW5nIHNldCB0byBcImNoaWxkXCIuXG4gKiBgYGBcbiAqIFtcbiAqICAge3BhdGg6ICdiYXNlJywgdGl0bGU6ICdiYXNlJywgY2hpbGRyZW46IFtcbiAqICAgICB7cGF0aDogJ2NoaWxkJywgdGl0bGU6ICdjaGlsZCd9LFxuICogICBdLFxuICogICB7cGF0aDogJ2F1eCcsIG91dGxldDogJ3BvcHVwJywgdGl0bGU6ICdwb3B1cFRpdGxlJ31cbiAqIF1cbiAqIGBgYFxuICpcbiAqIFRoaXMgY2xhc3MgY2FuIGJlIHVzZWQgYXMgYSBiYXNlIGNsYXNzIGZvciBjdXN0b20gdGl0bGUgc3RyYXRlZ2llcy4gVGhhdCBpcywgeW91IGNhbiBjcmVhdGUgeW91clxuICogb3duIGNsYXNzIHRoYXQgZXh0ZW5kcyB0aGUgYFRpdGxlU3RyYXRlZ3lgLiBOb3RlIHRoYXQgaW4gdGhlIGFib3ZlIGV4YW1wbGUsIHRoZSBgdGl0bGVgXG4gKiBmcm9tIHRoZSBuYW1lZCBvdXRsZXQgaXMgbmV2ZXIgdXNlZC4gSG93ZXZlciwgYSBjdXN0b20gc3RyYXRlZ3kgbWlnaHQgYmUgaW1wbGVtZW50ZWQgdG9cbiAqIGluY29ycG9yYXRlIHRpdGxlcyBpbiBuYW1lZCBvdXRsZXRzLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqIEBzZWUgW1BhZ2UgdGl0bGUgZ3VpZGVdKGd1aWRlL3JvdXRlciNzZXR0aW5nLXRoZS1wYWdlLXRpdGxlKVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgVGl0bGVTdHJhdGVneSB7XG4gIC8qKiBQZXJmb3JtcyB0aGUgYXBwbGljYXRpb24gdGl0bGUgdXBkYXRlLiAqL1xuICBhYnN0cmFjdCB1cGRhdGVUaXRsZShzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIEByZXR1cm5zIFRoZSBgdGl0bGVgIG9mIHRoZSBkZWVwZXN0IHByaW1hcnkgcm91dGUuXG4gICAqL1xuICBidWlsZFRpdGxlKHNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90KTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgbGV0IHBhZ2VUaXRsZTogc3RyaW5nfHVuZGVmaW5lZDtcbiAgICBsZXQgcm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3R8dW5kZWZpbmVkID0gc25hcHNob3Qucm9vdDtcbiAgICB3aGlsZSAocm91dGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcGFnZVRpdGxlID0gdGhpcy5nZXRSZXNvbHZlZFRpdGxlRm9yUm91dGUocm91dGUpID8/IHBhZ2VUaXRsZTtcbiAgICAgIHJvdXRlID0gcm91dGUuY2hpbGRyZW4uZmluZChjaGlsZCA9PiBjaGlsZC5vdXRsZXQgPT09IFBSSU1BUllfT1VUTEVUKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhZ2VUaXRsZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhbiBgQWN0aXZhdGVkUm91dGVTbmFwc2hvdGAsIHJldHVybnMgdGhlIGZpbmFsIHZhbHVlIG9mIHRoZVxuICAgKiBgUm91dGUudGl0bGVgIHByb3BlcnR5LCB3aGljaCBjYW4gZWl0aGVyIGJlIGEgc3RhdGljIHN0cmluZyBvciBhIHJlc29sdmVkIHZhbHVlLlxuICAgKi9cbiAgZ2V0UmVzb2x2ZWRUaXRsZUZvclJvdXRlKHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSB7XG4gICAgcmV0dXJuIHNuYXBzaG90LmRhdGFbVGl0bGVLZXldO1xuICB9XG59XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgYFRpdGxlU3RyYXRlZ3lgIHVzZWQgYnkgdGhlIHJvdXRlciB0aGF0IHVwZGF0ZXMgdGhlIHRpdGxlIHVzaW5nIHRoZSBgVGl0bGVgIHNlcnZpY2UuXG4gKi9cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCd9KVxuZXhwb3J0IGNsYXNzIERlZmF1bHRUaXRsZVN0cmF0ZWd5IGV4dGVuZHMgVGl0bGVTdHJhdGVneSB7XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHRpdGxlOiBUaXRsZSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgdGl0bGUgb2YgdGhlIGJyb3dzZXIgdG8gdGhlIGdpdmVuIHZhbHVlLlxuICAgKlxuICAgKiBAcGFyYW0gdGl0bGUgVGhlIGBwYWdlVGl0bGVgIGZyb20gdGhlIGRlZXBlc3QgcHJpbWFyeSByb3V0ZS5cbiAgICovXG4gIG92ZXJyaWRlIHVwZGF0ZVRpdGxlKHNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90KTogdm9pZCB7XG4gICAgY29uc3QgdGl0bGUgPSB0aGlzLmJ1aWxkVGl0bGUoc25hcHNob3QpO1xuICAgIGlmICh0aXRsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLnRpdGxlLnNldFRpdGxlKHRpdGxlKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==