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
class TitleStrategy {
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
}
TitleStrategy.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.1+sha-c41a216", ngImport: i0, type: TitleStrategy, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
TitleStrategy.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.0.0-next.1+sha-c41a216", ngImport: i0, type: TitleStrategy, providedIn: 'root', useFactory: () => inject(DefaultTitleStrategy) });
export { TitleStrategy };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.1+sha-c41a216", ngImport: i0, type: TitleStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root', useFactory: () => inject(DefaultTitleStrategy) }]
        }] });
/**
 * The default `TitleStrategy` used by the router that updates the title using the `Title` service.
 */
class DefaultTitleStrategy extends TitleStrategy {
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
DefaultTitleStrategy.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.1+sha-c41a216", ngImport: i0, type: DefaultTitleStrategy, deps: [{ token: i1.Title }], target: i0.ɵɵFactoryTarget.Injectable });
DefaultTitleStrategy.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.0.0-next.1+sha-c41a216", ngImport: i0, type: DefaultTitleStrategy, providedIn: 'root' });
export { DefaultTitleStrategy };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.1+sha-c41a216", ngImport: i0, type: DefaultTitleStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: function () { return [{ type: i1.Title }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFnZV90aXRsZV9zdHJhdGVneS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcGFnZV90aXRsZV9zdHJhdGVneS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsTUFBTSxFQUFFLFVBQVUsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNqRCxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFHaEQsT0FBTyxFQUFDLGNBQWMsRUFBRSxhQUFhLEVBQUMsTUFBTSxVQUFVLENBQUM7OztBQUV2RDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXNCRztBQUNILE1BQ3NCLGFBQWE7SUFJakM7O09BRUc7SUFDSCxVQUFVLENBQUMsUUFBNkI7UUFDdEMsSUFBSSxTQUEyQixDQUFDO1FBQ2hDLElBQUksS0FBSyxHQUFxQyxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQzVELE9BQU8sS0FBSyxLQUFLLFNBQVMsRUFBRTtZQUMxQixTQUFTLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxJQUFJLFNBQVMsQ0FBQztZQUM5RCxLQUFLLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLGNBQWMsQ0FBQyxDQUFDO1NBQ3ZFO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQUVEOzs7T0FHRztJQUNILHdCQUF3QixDQUFDLFFBQWdDO1FBQ3ZELE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUN0QyxDQUFDOztxSEF2Qm1CLGFBQWE7eUhBQWIsYUFBYSxjQURWLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUM7U0FDekQsYUFBYTtzR0FBYixhQUFhO2tCQURsQyxVQUFVO21CQUFDLEVBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLEVBQUM7O0FBMkJoRjs7R0FFRztBQUNILE1BQ2Esb0JBQXFCLFNBQVEsYUFBYTtJQUNyRCxZQUFxQixLQUFZO1FBQy9CLEtBQUssRUFBRSxDQUFDO1FBRFcsVUFBSyxHQUFMLEtBQUssQ0FBTztJQUVqQyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNNLFdBQVcsQ0FBQyxRQUE2QjtRQUNoRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hDLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRTtZQUN2QixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUM1QjtJQUNILENBQUM7OzRIQWZVLG9CQUFvQjtnSUFBcEIsb0JBQW9CLGNBRFIsTUFBTTtTQUNsQixvQkFBb0I7c0dBQXBCLG9CQUFvQjtrQkFEaEMsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtpbmplY3QsIEluamVjdGFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtUaXRsZX0gZnJvbSAnQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3Nlcic7XG5cbmltcG9ydCB7QWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgUm91dGVyU3RhdGVTbmFwc2hvdH0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQUklNQVJZX09VVExFVCwgUm91dGVUaXRsZUtleX0gZnJvbSAnLi9zaGFyZWQnO1xuXG4vKipcbiAqIFByb3ZpZGVzIGEgc3RyYXRlZ3kgZm9yIHNldHRpbmcgdGhlIHBhZ2UgdGl0bGUgYWZ0ZXIgYSByb3V0ZXIgbmF2aWdhdGlvbi5cbiAqXG4gKiBUaGUgYnVpbHQtaW4gaW1wbGVtZW50YXRpb24gdHJhdmVyc2VzIHRoZSByb3V0ZXIgc3RhdGUgc25hcHNob3QgYW5kIGZpbmRzIHRoZSBkZWVwZXN0IHByaW1hcnlcbiAqIG91dGxldCB3aXRoIGB0aXRsZWAgcHJvcGVydHkuIEdpdmVuIHRoZSBgUm91dGVzYCBiZWxvdywgbmF2aWdhdGluZyB0b1xuICogYC9iYXNlL2NoaWxkKHBvcHVwOmF1eClgIHdvdWxkIHJlc3VsdCBpbiB0aGUgZG9jdW1lbnQgdGl0bGUgYmVpbmcgc2V0IHRvIFwiY2hpbGRcIi5cbiAqIGBgYFxuICogW1xuICogICB7cGF0aDogJ2Jhc2UnLCB0aXRsZTogJ2Jhc2UnLCBjaGlsZHJlbjogW1xuICogICAgIHtwYXRoOiAnY2hpbGQnLCB0aXRsZTogJ2NoaWxkJ30sXG4gKiAgIF0sXG4gKiAgIHtwYXRoOiAnYXV4Jywgb3V0bGV0OiAncG9wdXAnLCB0aXRsZTogJ3BvcHVwVGl0bGUnfVxuICogXVxuICogYGBgXG4gKlxuICogVGhpcyBjbGFzcyBjYW4gYmUgdXNlZCBhcyBhIGJhc2UgY2xhc3MgZm9yIGN1c3RvbSB0aXRsZSBzdHJhdGVnaWVzLiBUaGF0IGlzLCB5b3UgY2FuIGNyZWF0ZSB5b3VyXG4gKiBvd24gY2xhc3MgdGhhdCBleHRlbmRzIHRoZSBgVGl0bGVTdHJhdGVneWAuIE5vdGUgdGhhdCBpbiB0aGUgYWJvdmUgZXhhbXBsZSwgdGhlIGB0aXRsZWBcbiAqIGZyb20gdGhlIG5hbWVkIG91dGxldCBpcyBuZXZlciB1c2VkLiBIb3dldmVyLCBhIGN1c3RvbSBzdHJhdGVneSBtaWdodCBiZSBpbXBsZW1lbnRlZCB0b1xuICogaW5jb3Jwb3JhdGUgdGl0bGVzIGluIG5hbWVkIG91dGxldHMuXG4gKlxuICogQHB1YmxpY0FwaVxuICogQHNlZSBbUGFnZSB0aXRsZSBndWlkZV0oZ3VpZGUvcm91dGVyI3NldHRpbmctdGhlLXBhZ2UtdGl0bGUpXG4gKi9cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCcsIHVzZUZhY3Rvcnk6ICgpID0+IGluamVjdChEZWZhdWx0VGl0bGVTdHJhdGVneSl9KVxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFRpdGxlU3RyYXRlZ3kge1xuICAvKiogUGVyZm9ybXMgdGhlIGFwcGxpY2F0aW9uIHRpdGxlIHVwZGF0ZS4gKi9cbiAgYWJzdHJhY3QgdXBkYXRlVGl0bGUoc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QpOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBUaGUgYHRpdGxlYCBvZiB0aGUgZGVlcGVzdCBwcmltYXJ5IHJvdXRlLlxuICAgKi9cbiAgYnVpbGRUaXRsZShzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCk6IHN0cmluZ3x1bmRlZmluZWQge1xuICAgIGxldCBwYWdlVGl0bGU6IHN0cmluZ3x1bmRlZmluZWQ7XG4gICAgbGV0IHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90fHVuZGVmaW5lZCA9IHNuYXBzaG90LnJvb3Q7XG4gICAgd2hpbGUgKHJvdXRlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHBhZ2VUaXRsZSA9IHRoaXMuZ2V0UmVzb2x2ZWRUaXRsZUZvclJvdXRlKHJvdXRlKSA/PyBwYWdlVGl0bGU7XG4gICAgICByb3V0ZSA9IHJvdXRlLmNoaWxkcmVuLmZpbmQoY2hpbGQgPT4gY2hpbGQub3V0bGV0ID09PSBQUklNQVJZX09VVExFVCk7XG4gICAgfVxuICAgIHJldHVybiBwYWdlVGl0bGU7XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYW4gYEFjdGl2YXRlZFJvdXRlU25hcHNob3RgLCByZXR1cm5zIHRoZSBmaW5hbCB2YWx1ZSBvZiB0aGVcbiAgICogYFJvdXRlLnRpdGxlYCBwcm9wZXJ0eSwgd2hpY2ggY2FuIGVpdGhlciBiZSBhIHN0YXRpYyBzdHJpbmcgb3IgYSByZXNvbHZlZCB2YWx1ZS5cbiAgICovXG4gIGdldFJlc29sdmVkVGl0bGVGb3JSb3V0ZShzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCkge1xuICAgIHJldHVybiBzbmFwc2hvdC5kYXRhW1JvdXRlVGl0bGVLZXldO1xuICB9XG59XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgYFRpdGxlU3RyYXRlZ3lgIHVzZWQgYnkgdGhlIHJvdXRlciB0aGF0IHVwZGF0ZXMgdGhlIHRpdGxlIHVzaW5nIHRoZSBgVGl0bGVgIHNlcnZpY2UuXG4gKi9cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCd9KVxuZXhwb3J0IGNsYXNzIERlZmF1bHRUaXRsZVN0cmF0ZWd5IGV4dGVuZHMgVGl0bGVTdHJhdGVneSB7XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHRpdGxlOiBUaXRsZSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgdGl0bGUgb2YgdGhlIGJyb3dzZXIgdG8gdGhlIGdpdmVuIHZhbHVlLlxuICAgKlxuICAgKiBAcGFyYW0gdGl0bGUgVGhlIGBwYWdlVGl0bGVgIGZyb20gdGhlIGRlZXBlc3QgcHJpbWFyeSByb3V0ZS5cbiAgICovXG4gIG92ZXJyaWRlIHVwZGF0ZVRpdGxlKHNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90KTogdm9pZCB7XG4gICAgY29uc3QgdGl0bGUgPSB0aGlzLmJ1aWxkVGl0bGUoc25hcHNob3QpO1xuICAgIGlmICh0aXRsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLnRpdGxlLnNldFRpdGxlKHRpdGxlKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==