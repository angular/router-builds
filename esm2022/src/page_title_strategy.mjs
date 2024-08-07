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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: TitleStrategy, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: TitleStrategy, providedIn: 'root', useFactory: () => inject(DefaultTitleStrategy) }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: TitleStrategy, decorators: [{
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: DefaultTitleStrategy, deps: [{ token: i1.Title }], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: DefaultTitleStrategy, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: DefaultTitleStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: () => [{ type: i1.Title }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFnZV90aXRsZV9zdHJhdGVneS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcGFnZV90aXRsZV9zdHJhdGVneS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsTUFBTSxFQUFFLFVBQVUsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNqRCxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFHaEQsT0FBTyxFQUFDLGNBQWMsRUFBRSxhQUFhLEVBQUMsTUFBTSxVQUFVLENBQUM7OztBQUV2RDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXNCRztBQUVILE1BQU0sT0FBZ0IsYUFBYTtJQUlqQzs7T0FFRztJQUNILFVBQVUsQ0FBQyxRQUE2QjtRQUN0QyxJQUFJLFNBQTZCLENBQUM7UUFDbEMsSUFBSSxLQUFLLEdBQXVDLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFDOUQsT0FBTyxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDM0IsU0FBUyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxTQUFTLENBQUM7WUFDOUQsS0FBSyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLGNBQWMsQ0FBQyxDQUFDO1FBQzFFLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsd0JBQXdCLENBQUMsUUFBZ0M7UUFDdkQsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7eUhBdkJtQixhQUFhOzZIQUFiLGFBQWEsY0FEVixNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDOztzR0FDekQsYUFBYTtrQkFEbEMsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxFQUFDOztBQTJCaEY7O0dBRUc7QUFFSCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsYUFBYTtJQUNyRCxZQUFxQixLQUFZO1FBQy9CLEtBQUssRUFBRSxDQUFDO1FBRFcsVUFBSyxHQUFMLEtBQUssQ0FBTztJQUVqQyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNNLFdBQVcsQ0FBQyxRQUE2QjtRQUNoRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hDLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdCLENBQUM7SUFDSCxDQUFDO3lIQWZVLG9CQUFvQjs2SEFBcEIsb0JBQW9CLGNBRFIsTUFBTTs7c0dBQ2xCLG9CQUFvQjtrQkFEaEMsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtpbmplY3QsIEluamVjdGFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtUaXRsZX0gZnJvbSAnQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3Nlcic7XG5cbmltcG9ydCB7QWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgUm91dGVyU3RhdGVTbmFwc2hvdH0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQUklNQVJZX09VVExFVCwgUm91dGVUaXRsZUtleX0gZnJvbSAnLi9zaGFyZWQnO1xuXG4vKipcbiAqIFByb3ZpZGVzIGEgc3RyYXRlZ3kgZm9yIHNldHRpbmcgdGhlIHBhZ2UgdGl0bGUgYWZ0ZXIgYSByb3V0ZXIgbmF2aWdhdGlvbi5cbiAqXG4gKiBUaGUgYnVpbHQtaW4gaW1wbGVtZW50YXRpb24gdHJhdmVyc2VzIHRoZSByb3V0ZXIgc3RhdGUgc25hcHNob3QgYW5kIGZpbmRzIHRoZSBkZWVwZXN0IHByaW1hcnlcbiAqIG91dGxldCB3aXRoIGB0aXRsZWAgcHJvcGVydHkuIEdpdmVuIHRoZSBgUm91dGVzYCBiZWxvdywgbmF2aWdhdGluZyB0b1xuICogYC9iYXNlL2NoaWxkKHBvcHVwOmF1eClgIHdvdWxkIHJlc3VsdCBpbiB0aGUgZG9jdW1lbnQgdGl0bGUgYmVpbmcgc2V0IHRvIFwiY2hpbGRcIi5cbiAqIGBgYFxuICogW1xuICogICB7cGF0aDogJ2Jhc2UnLCB0aXRsZTogJ2Jhc2UnLCBjaGlsZHJlbjogW1xuICogICAgIHtwYXRoOiAnY2hpbGQnLCB0aXRsZTogJ2NoaWxkJ30sXG4gKiAgIF0sXG4gKiAgIHtwYXRoOiAnYXV4Jywgb3V0bGV0OiAncG9wdXAnLCB0aXRsZTogJ3BvcHVwVGl0bGUnfVxuICogXVxuICogYGBgXG4gKlxuICogVGhpcyBjbGFzcyBjYW4gYmUgdXNlZCBhcyBhIGJhc2UgY2xhc3MgZm9yIGN1c3RvbSB0aXRsZSBzdHJhdGVnaWVzLiBUaGF0IGlzLCB5b3UgY2FuIGNyZWF0ZSB5b3VyXG4gKiBvd24gY2xhc3MgdGhhdCBleHRlbmRzIHRoZSBgVGl0bGVTdHJhdGVneWAuIE5vdGUgdGhhdCBpbiB0aGUgYWJvdmUgZXhhbXBsZSwgdGhlIGB0aXRsZWBcbiAqIGZyb20gdGhlIG5hbWVkIG91dGxldCBpcyBuZXZlciB1c2VkLiBIb3dldmVyLCBhIGN1c3RvbSBzdHJhdGVneSBtaWdodCBiZSBpbXBsZW1lbnRlZCB0b1xuICogaW5jb3Jwb3JhdGUgdGl0bGVzIGluIG5hbWVkIG91dGxldHMuXG4gKlxuICogQHB1YmxpY0FwaVxuICogQHNlZSBbUGFnZSB0aXRsZSBndWlkZV0oZ3VpZGUvcm91dGluZy9jb21tb24tcm91dGVyLXRhc2tzI3NldHRpbmctdGhlLXBhZ2UtdGl0bGUpXG4gKi9cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCcsIHVzZUZhY3Rvcnk6ICgpID0+IGluamVjdChEZWZhdWx0VGl0bGVTdHJhdGVneSl9KVxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFRpdGxlU3RyYXRlZ3kge1xuICAvKiogUGVyZm9ybXMgdGhlIGFwcGxpY2F0aW9uIHRpdGxlIHVwZGF0ZS4gKi9cbiAgYWJzdHJhY3QgdXBkYXRlVGl0bGUoc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBUaGUgYHRpdGxlYCBvZiB0aGUgZGVlcGVzdCBwcmltYXJ5IHJvdXRlLlxuICAgKi9cbiAgYnVpbGRUaXRsZShzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgbGV0IHBhZ2VUaXRsZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGxldCByb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCB8IHVuZGVmaW5lZCA9IHNuYXBzaG90LnJvb3Q7XG4gICAgd2hpbGUgKHJvdXRlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHBhZ2VUaXRsZSA9IHRoaXMuZ2V0UmVzb2x2ZWRUaXRsZUZvclJvdXRlKHJvdXRlKSA/PyBwYWdlVGl0bGU7XG4gICAgICByb3V0ZSA9IHJvdXRlLmNoaWxkcmVuLmZpbmQoKGNoaWxkKSA9PiBjaGlsZC5vdXRsZXQgPT09IFBSSU1BUllfT1VUTEVUKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhZ2VUaXRsZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhbiBgQWN0aXZhdGVkUm91dGVTbmFwc2hvdGAsIHJldHVybnMgdGhlIGZpbmFsIHZhbHVlIG9mIHRoZVxuICAgKiBgUm91dGUudGl0bGVgIHByb3BlcnR5LCB3aGljaCBjYW4gZWl0aGVyIGJlIGEgc3RhdGljIHN0cmluZyBvciBhIHJlc29sdmVkIHZhbHVlLlxuICAgKi9cbiAgZ2V0UmVzb2x2ZWRUaXRsZUZvclJvdXRlKHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSB7XG4gICAgcmV0dXJuIHNuYXBzaG90LmRhdGFbUm91dGVUaXRsZUtleV07XG4gIH1cbn1cblxuLyoqXG4gKiBUaGUgZGVmYXVsdCBgVGl0bGVTdHJhdGVneWAgdXNlZCBieSB0aGUgcm91dGVyIHRoYXQgdXBkYXRlcyB0aGUgdGl0bGUgdXNpbmcgdGhlIGBUaXRsZWAgc2VydmljZS5cbiAqL1xuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgRGVmYXVsdFRpdGxlU3RyYXRlZ3kgZXh0ZW5kcyBUaXRsZVN0cmF0ZWd5IHtcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgdGl0bGU6IFRpdGxlKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSB0aXRsZSBvZiB0aGUgYnJvd3NlciB0byB0aGUgZ2l2ZW4gdmFsdWUuXG4gICAqXG4gICAqIEBwYXJhbSB0aXRsZSBUaGUgYHBhZ2VUaXRsZWAgZnJvbSB0aGUgZGVlcGVzdCBwcmltYXJ5IHJvdXRlLlxuICAgKi9cbiAgb3ZlcnJpZGUgdXBkYXRlVGl0bGUoc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QpOiB2b2lkIHtcbiAgICBjb25zdCB0aXRsZSA9IHRoaXMuYnVpbGRUaXRsZShzbmFwc2hvdCk7XG4gICAgaWYgKHRpdGxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMudGl0bGUuc2V0VGl0bGUodGl0bGUpO1xuICAgIH1cbiAgfVxufVxuIl19