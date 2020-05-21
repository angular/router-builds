/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { __decorate, __metadata, __param } from "tslib";
import { LocationStrategy } from '@angular/common';
import { Attribute, Directive, ElementRef, HostBinding, HostListener, Input, isDevMode, Renderer2 } from '@angular/core';
import { NavigationEnd } from '../events';
import { Router } from '../router';
import { ActivatedRoute } from '../router_state';
/**
 * @description
 *
 * Lets you link to specific routes in your app.
 *
 * Consider the following route configuration:
 * `[{ path: 'user/:name', component: UserCmp }]`.
 * When linking to this `user/:name` route, you use the `RouterLink` directive.
 *
 * If the link is static, you can use the directive as follows:
 * `<a routerLink="/user/bob">link to user component</a>`
 *
 * If you use dynamic values to generate the link, you can pass an array of path
 * segments, followed by the params for each segment.
 *
 * For instance `['/team', teamId, 'user', userName, {details: true}]`
 * means that we want to generate a link to `/team/11/user/bob;details=true`.
 *
 * Multiple static segments can be merged into one
 * (e.g., `['/team/11/user', userName, {details: true}]`).
 *
 * The first segment name can be prepended with `/`, `./`, or `../`:
 * * If the first segment begins with `/`, the router will look up the route from the root of the
 *   app.
 * * If the first segment begins with `./`, or doesn't begin with a slash, the router will
 *   instead look in the children of the current activated route.
 * * And if the first segment begins with `../`, the router will go up one level.
 *
 * You can set query params and fragment as follows:
 *
 * ```
 * <a [routerLink]="['/user/bob']" [queryParams]="{debug: true}" fragment="education">
 *   link to user component
 * </a>
 * ```
 * RouterLink will use these to generate this link: `/user/bob#education?debug=true`.
 *
 * (Deprecated in v4.0.0 use `queryParamsHandling` instead) You can also tell the
 * directive to preserve the current query params and fragment:
 *
 * ```
 * <a [routerLink]="['/user/bob']" preserveQueryParams preserveFragment>
 *   link to user component
 * </a>
 * ```
 *
 * You can tell the directive how to handle queryParams. Available options are:
 *  - `'merge'`: merge the queryParams into the current queryParams
 *  - `'preserve'`: preserve the current queryParams
 *  - default/`''`: use the queryParams only
 *
 * Same options for {@link NavigationExtras#queryParamsHandling
 * NavigationExtras#queryParamsHandling}.
 *
 * ```
 * <a [routerLink]="['/user/bob']" [queryParams]="{debug: true}" queryParamsHandling="merge">
 *   link to user component
 * </a>
 * ```
 *
 * You can provide a `state` value to be persisted to the browser's History.state
 * property (See https://developer.mozilla.org/en-US/docs/Web/API/History#Properties). It's
 * used as follows:
 *
 * ```
 * <a [routerLink]="['/user/bob']" [state]="{tracingId: 123}">
 *   link to user component
 * </a>
 * ```
 *
 * And later the value can be read from the router through `router.getCurrentNavigation`.
 * For example, to capture the `tracingId` above during the `NavigationStart` event:
 *
 * ```
 * // Get NavigationStart events
 * router.events.pipe(filter(e => e instanceof NavigationStart)).subscribe(e => {
 *   const navigation = router.getCurrentNavigation();
 *   tracingService.trace({id: navigation.extras.state.tracingId});
 * });
 * ```
 *
 * The router link directive always treats the provided input as a delta to the current url.
 *
 * For instance, if the current url is `/user/(box//aux:team)`.
 *
 * Then the following link `<a [routerLink]="['/user/jim']">Jim</a>` will generate the link
 * `/user/(jim//aux:team)`.
 *
 * See {@link Router#createUrlTree createUrlTree} for more information.
 *
 * @ngModule RouterModule
 *
 * @publicApi
 */
let RouterLink = /** @class */ (() => {
    let RouterLink = class RouterLink {
        constructor(router, route, tabIndex, renderer, el) {
            this.router = router;
            this.route = route;
            this.commands = [];
            if (tabIndex == null) {
                renderer.setAttribute(el.nativeElement, 'tabindex', '0');
            }
        }
        /**
         * @param commands An array of commands to pass to {@link Router#createUrlTree
         *     Router#createUrlTree}.
         *   - **array**: commands to pass to {@link Router#createUrlTree Router#createUrlTree}.
         *   - **string**: shorthand for array of commands with just the string, i.e. `['/route']`
         *   - **null|undefined**: shorthand for an empty array of commands, i.e. `[]`
         * @see {@link Router#createUrlTree Router#createUrlTree}
         */
        set routerLink(commands) {
            if (commands != null) {
                this.commands = Array.isArray(commands) ? commands : [commands];
            }
            else {
                this.commands = [];
            }
        }
        /**
         * @deprecated As of Angular v4.0 use `queryParamsHandling` instead.
         */
        set preserveQueryParams(value) {
            if (isDevMode() && console && console.warn) {
                console.warn('preserveQueryParams is deprecated!, use queryParamsHandling instead.');
            }
            this.preserve = value;
        }
        onClick() {
            const extras = {
                skipLocationChange: attrBoolValue(this.skipLocationChange),
                replaceUrl: attrBoolValue(this.replaceUrl),
                state: this.state,
            };
            this.router.navigateByUrl(this.urlTree, extras);
            return true;
        }
        get urlTree() {
            return this.router.createUrlTree(this.commands, {
                relativeTo: this.route,
                queryParams: this.queryParams,
                fragment: this.fragment,
                preserveQueryParams: attrBoolValue(this.preserve),
                queryParamsHandling: this.queryParamsHandling,
                preserveFragment: attrBoolValue(this.preserveFragment),
            });
        }
    };
    __decorate([
        Input(),
        __metadata("design:type", Object)
    ], RouterLink.prototype, "queryParams", void 0);
    __decorate([
        Input(),
        __metadata("design:type", String)
    ], RouterLink.prototype, "fragment", void 0);
    __decorate([
        Input(),
        __metadata("design:type", String)
    ], RouterLink.prototype, "queryParamsHandling", void 0);
    __decorate([
        Input(),
        __metadata("design:type", Boolean)
    ], RouterLink.prototype, "preserveFragment", void 0);
    __decorate([
        Input(),
        __metadata("design:type", Boolean)
    ], RouterLink.prototype, "skipLocationChange", void 0);
    __decorate([
        Input(),
        __metadata("design:type", Boolean)
    ], RouterLink.prototype, "replaceUrl", void 0);
    __decorate([
        Input(),
        __metadata("design:type", Object)
    ], RouterLink.prototype, "state", void 0);
    __decorate([
        Input(),
        __metadata("design:type", Object),
        __metadata("design:paramtypes", [Object])
    ], RouterLink.prototype, "routerLink", null);
    __decorate([
        Input(),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], RouterLink.prototype, "preserveQueryParams", null);
    __decorate([
        HostListener('click'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Boolean)
    ], RouterLink.prototype, "onClick", null);
    RouterLink = __decorate([
        Directive({ selector: ':not(a):not(area)[routerLink]' }),
        __param(2, Attribute('tabindex')),
        __metadata("design:paramtypes", [Router, ActivatedRoute, String, Renderer2, ElementRef])
    ], RouterLink);
    return RouterLink;
})();
export { RouterLink };
/**
 * @description
 *
 * Lets you link to specific routes in your app.
 *
 * See `RouterLink` for more information.
 *
 * @ngModule RouterModule
 *
 * @publicApi
 */
let RouterLinkWithHref = /** @class */ (() => {
    let RouterLinkWithHref = class RouterLinkWithHref {
        constructor(router, route, locationStrategy) {
            this.router = router;
            this.route = route;
            this.locationStrategy = locationStrategy;
            this.commands = [];
            this.subscription = router.events.subscribe((s) => {
                if (s instanceof NavigationEnd) {
                    this.updateTargetUrlAndHref();
                }
            });
        }
        /**
         * @param commands An array of commands to pass to {@link Router#createUrlTree
         *     Router#createUrlTree}.
         *   - **array**: commands to pass to {@link Router#createUrlTree Router#createUrlTree}.
         *   - **string**: shorthand for array of commands with just the string, i.e. `['/route']`
         *   - **null|undefined**: shorthand for an empty array of commands, i.e. `[]`
         * @see {@link Router#createUrlTree Router#createUrlTree}
         */
        set routerLink(commands) {
            if (commands != null) {
                this.commands = Array.isArray(commands) ? commands : [commands];
            }
            else {
                this.commands = [];
            }
        }
        /**
         * @deprecated As of Angular v4.0 use `queryParamsHandling` instead.
         */
        set preserveQueryParams(value) {
            if (isDevMode() && console && console.warn) {
                console.warn('preserveQueryParams is deprecated, use queryParamsHandling instead.');
            }
            this.preserve = value;
        }
        ngOnChanges(changes) {
            this.updateTargetUrlAndHref();
        }
        ngOnDestroy() {
            this.subscription.unsubscribe();
        }
        onClick(button, ctrlKey, metaKey, shiftKey) {
            if (button !== 0 || ctrlKey || metaKey || shiftKey) {
                return true;
            }
            if (typeof this.target === 'string' && this.target != '_self') {
                return true;
            }
            const extras = {
                skipLocationChange: attrBoolValue(this.skipLocationChange),
                replaceUrl: attrBoolValue(this.replaceUrl),
                state: this.state
            };
            this.router.navigateByUrl(this.urlTree, extras);
            return false;
        }
        updateTargetUrlAndHref() {
            this.href = this.locationStrategy.prepareExternalUrl(this.router.serializeUrl(this.urlTree));
        }
        get urlTree() {
            return this.router.createUrlTree(this.commands, {
                relativeTo: this.route,
                queryParams: this.queryParams,
                fragment: this.fragment,
                preserveQueryParams: attrBoolValue(this.preserve),
                queryParamsHandling: this.queryParamsHandling,
                preserveFragment: attrBoolValue(this.preserveFragment),
            });
        }
    };
    __decorate([
        HostBinding('attr.target'),
        Input(),
        __metadata("design:type", String)
    ], RouterLinkWithHref.prototype, "target", void 0);
    __decorate([
        Input(),
        __metadata("design:type", Object)
    ], RouterLinkWithHref.prototype, "queryParams", void 0);
    __decorate([
        Input(),
        __metadata("design:type", String)
    ], RouterLinkWithHref.prototype, "fragment", void 0);
    __decorate([
        Input(),
        __metadata("design:type", String)
    ], RouterLinkWithHref.prototype, "queryParamsHandling", void 0);
    __decorate([
        Input(),
        __metadata("design:type", Boolean)
    ], RouterLinkWithHref.prototype, "preserveFragment", void 0);
    __decorate([
        Input(),
        __metadata("design:type", Boolean)
    ], RouterLinkWithHref.prototype, "skipLocationChange", void 0);
    __decorate([
        Input(),
        __metadata("design:type", Boolean)
    ], RouterLinkWithHref.prototype, "replaceUrl", void 0);
    __decorate([
        Input(),
        __metadata("design:type", Object)
    ], RouterLinkWithHref.prototype, "state", void 0);
    __decorate([
        HostBinding(),
        __metadata("design:type", String)
    ], RouterLinkWithHref.prototype, "href", void 0);
    __decorate([
        Input(),
        __metadata("design:type", Object),
        __metadata("design:paramtypes", [Object])
    ], RouterLinkWithHref.prototype, "routerLink", null);
    __decorate([
        Input(),
        __metadata("design:type", Boolean),
        __metadata("design:paramtypes", [Boolean])
    ], RouterLinkWithHref.prototype, "preserveQueryParams", null);
    __decorate([
        HostListener('click', ['$event.button', '$event.ctrlKey', '$event.metaKey', '$event.shiftKey']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Number, Boolean, Boolean, Boolean]),
        __metadata("design:returntype", Boolean)
    ], RouterLinkWithHref.prototype, "onClick", null);
    RouterLinkWithHref = __decorate([
        Directive({ selector: 'a[routerLink],area[routerLink]' }),
        __metadata("design:paramtypes", [Router, ActivatedRoute,
            LocationStrategy])
    ], RouterLinkWithHref);
    return RouterLinkWithHref;
})();
export { RouterLinkWithHref };
function attrBoolValue(s) {
    return s === '' || !!s;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOztBQUVILE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQXdCLFNBQVMsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUk3SSxPQUFPLEVBQVEsYUFBYSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQy9DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDakMsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBSS9DOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0E2Rkc7QUFFSDtJQUFBLElBQWEsVUFBVSxHQUF2QixNQUFhLFVBQVU7UUFvRHJCLFlBQ1ksTUFBYyxFQUFVLEtBQXFCLEVBQzlCLFFBQWdCLEVBQUUsUUFBbUIsRUFBRSxFQUFjO1lBRHBFLFdBQU0sR0FBTixNQUFNLENBQVE7WUFBVSxVQUFLLEdBQUwsS0FBSyxDQUFnQjtZQUpqRCxhQUFRLEdBQVUsRUFBRSxDQUFDO1lBTTNCLElBQUksUUFBUSxJQUFJLElBQUksRUFBRTtnQkFDcEIsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsYUFBYSxFQUFFLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQzthQUMxRDtRQUNILENBQUM7UUFFRDs7Ozs7OztXQU9HO1FBRUgsSUFBSSxVQUFVLENBQUMsUUFBcUM7WUFDbEQs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Z0VBQTRCO0lBTzNCO1FBQVIsS0FBSyxFQUFFOztrRUFBOEI7SUFPN0I7UUFBUixLQUFLLEVBQUU7OzBEQUFzQjtJQU1yQjtRQUFSLEtBQUssRUFBRTs7cURBQTRCO0lBUXJCO1FBQWQsV0FBVyxFQUFFOztvREFBZTtJQXFCN0I7UUFEQyxLQUFLLEVBQUU7Ozt3REFPUDtJQU1EO1FBREMsS0FBSyxFQUFFOzs7aUVBTVA7SUFVRDtRQURDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQzs7OztxREFpQi9GO0lBMUhVLGtCQUFrQjtRQUQ5QixTQUFTLENBQUMsRUFBQyxRQUFRLEVBQUUsZ0NBQWdDLEVBQUMsQ0FBQzt5Q0E4RGxDLE1BQU0sRUFBaUIsY0FBYztZQUMzQixnQkFBZ0I7T0E5RG5DLGtCQUFrQixDQTBJOUI7SUFBRCx5QkFBQztLQUFBO1NBMUlZLGtCQUFrQjtBQTRJL0IsU0FBUyxhQUFhLENBQUMsQ0FBTTtJQUMzQixPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9uU3RyYXRlZ3l9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0F0dHJpYnV0ZSwgRGlyZWN0aXZlLCBFbGVtZW50UmVmLCBIb3N0QmluZGluZywgSG9zdExpc3RlbmVyLCBJbnB1dCwgaXNEZXZNb2RlLCBPbkNoYW5nZXMsIE9uRGVzdHJveSwgUmVuZGVyZXIyfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7U3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtRdWVyeVBhcmFtc0hhbmRsaW5nfSBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHtFdmVudCwgTmF2aWdhdGlvbkVuZH0gZnJvbSAnLi4vZXZlbnRzJztcbmltcG9ydCB7Um91dGVyfSBmcm9tICcuLi9yb3V0ZXInO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZX0gZnJvbSAnLi4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7VXJsVHJlZX0gZnJvbSAnLi4vdXJsX3RyZWUnO1xuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogTGV0cyB5b3UgbGluayB0byBzcGVjaWZpYyByb3V0ZXMgaW4geW91ciBhcHAuXG4gKlxuICogQ29uc2lkZXIgdGhlIGZvbGxvd2luZyByb3V0ZSBjb25maWd1cmF0aW9uOlxuICogYFt7IHBhdGg6ICd1c2VyLzpuYW1lJywgY29tcG9uZW50OiBVc2VyQ21wIH1dYC5cbiAqIFdoZW4gbGlua2luZyB0byB0aGlzIGB1c2VyLzpuYW1lYCByb3V0ZSwgeW91IHVzZSB0aGUgYFJvdXRlckxpbmtgIGRpcmVjdGl2ZS5cbiAqXG4gKiBJZiB0aGUgbGluayBpcyBzdGF0aWMsIHlvdSBjYW4gdXNlIHRoZSBkaXJlY3RpdmUgYXMgZm9sbG93czpcbiAqIGA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCI+bGluayB0byB1c2VyIGNvbXBvbmVudDwvYT5gXG4gKlxuICogSWYgeW91IHVzZSBkeW5hbWljIHZhbHVlcyB0byBnZW5lcmF0ZSB0aGUgbGluaywgeW91IGNhbiBwYXNzIGFuIGFycmF5IG9mIHBhdGhcbiAqIHNlZ21lbnRzLCBmb2xsb3dlZCBieSB0aGUgcGFyYW1zIGZvciBlYWNoIHNlZ21lbnQuXG4gKlxuICogRm9yIGluc3RhbmNlIGBbJy90ZWFtJywgdGVhbUlkLCAndXNlcicsIHVzZXJOYW1lLCB7ZGV0YWlsczogdHJ1ZX1dYFxuICogbWVhbnMgdGhhdCB3ZSB3YW50IHRvIGdlbmVyYXRlIGEgbGluayB0byBgL3RlYW0vMTEvdXNlci9ib2I7ZGV0YWlscz10cnVlYC5cbiAqXG4gKiBNdWx0aXBsZSBzdGF0aWMgc2VnbWVudHMgY2FuIGJlIG1lcmdlZCBpbnRvIG9uZVxuICogKGUuZy4sIGBbJy90ZWFtLzExL3VzZXInLCB1c2VyTmFtZSwge2RldGFpbHM6IHRydWV9XWApLlxuICpcbiAqIFRoZSBmaXJzdCBzZWdtZW50IG5hbWUgY2FuIGJlIHByZXBlbmRlZCB3aXRoIGAvYCwgYC4vYCwgb3IgYC4uL2A6XG4gKiAqIElmIHRoZSBmaXJzdCBzZWdtZW50IGJlZ2lucyB3aXRoIGAvYCwgdGhlIHJvdXRlciB3aWxsIGxvb2sgdXAgdGhlIHJvdXRlIGZyb20gdGhlIHJvb3Qgb2YgdGhlXG4gKiAgIGFwcC5cbiAqICogSWYgdGhlIGZpcnN0IHNlZ21lbnQgYmVnaW5zIHdpdGggYC4vYCwgb3IgZG9lc24ndCBiZWdpbiB3aXRoIGEgc2xhc2gsIHRoZSByb3V0ZXIgd2lsbFxuICogICBpbnN0ZWFkIGxvb2sgaW4gdGhlIGNoaWxkcmVuIG9mIHRoZSBjdXJyZW50IGFjdGl2YXRlZCByb3V0ZS5cbiAqICogQW5kIGlmIHRoZSBmaXJzdCBzZWdtZW50IGJlZ2lucyB3aXRoIGAuLi9gLCB0aGUgcm91dGVyIHdpbGwgZ28gdXAgb25lIGxldmVsLlxuICpcbiAqIFlvdSBjYW4gc2V0IHF1ZXJ5IHBhcmFtcyBhbmQgZnJhZ21lbnQgYXMgZm9sbG93czpcbiAqXG4gKiBgYGBcbiAqIDxhIFtyb3V0ZXJMaW5rXT1cIlsnL3VzZXIvYm9iJ11cIiBbcXVlcnlQYXJhbXNdPVwie2RlYnVnOiB0cnVlfVwiIGZyYWdtZW50PVwiZWR1Y2F0aW9uXCI+XG4gKiAgIGxpbmsgdG8gdXNlciBjb21wb25lbnRcbiAqIDwvYT5cbiAqIGBgYFxuICogUm91dGVyTGluayB3aWxsIHVzZSB0aGVzZSB0byBnZW5lcmF0ZSB0aGlzIGxpbms6IGAvdXNlci9ib2IjZWR1Y2F0aW9uP2RlYnVnPXRydWVgLlxuICpcbiAqIChEZXByZWNhdGVkIGluIHY0LjAuMCB1c2UgYHF1ZXJ5UGFyYW1zSGFuZGxpbmdgIGluc3RlYWQpIFlvdSBjYW4gYWxzbyB0ZWxsIHRoZVxuICogZGlyZWN0aXZlIHRvIHByZXNlcnZlIHRoZSBjdXJyZW50IHF1ZXJ5IHBhcmFtcyBhbmQgZnJhZ21lbnQ6XG4gKlxuICogYGBgXG4gKiA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2JvYiddXCIgcHJlc2VydmVRdWVyeVBhcmFtcyBwcmVzZXJ2ZUZyYWdtZW50PlxuICogICBsaW5rIHRvIHVzZXIgY29tcG9uZW50XG4gKiA8L2E+XG4gKiBgYGBcbiAqXG4gKiBZb3UgY2FuIHRlbGwgdGhlIGRpcmVjdGl2ZSBob3cgdG8gaGFuZGxlIHF1ZXJ5UGFyYW1zLiBBdmFpbGFibGUgb3B0aW9ucyBhcmU6XG4gKiAgLSBgJ21lcmdlJ2A6IG1lcmdlIHRoZSBxdWVyeVBhcmFtcyBpbnRvIHRoZSBjdXJyZW50IHF1ZXJ5UGFyYW1zXG4gKiAgLSBgJ3ByZXNlcnZlJ2A6IHByZXNlcnZlIHRoZSBjdXJyZW50IHF1ZXJ5UGFyYW1zXG4gKiAgLSBkZWZhdWx0L2AnJ2A6IHVzZSB0aGUgcXVlcnlQYXJhbXMgb25seVxuICpcbiAqIFNhbWUgb3B0aW9ucyBmb3Ige0BsaW5rIE5hdmlnYXRpb25FeHRyYXMjcXVlcnlQYXJhbXNIYW5kbGluZ1xuICogTmF2aWdhdGlvbkV4dHJhcyNxdWVyeVBhcmFtc0hhbmRsaW5nfS5cbiAqXG4gKiBgYGBcbiAqIDxhIFtyb3V0ZXJMaW5rXT1cIlsnL3VzZXIvYm9iJ11cIiBbcXVlcnlQYXJhbXNdPVwie2RlYnVnOiB0cnVlfVwiIHF1ZXJ5UGFyYW1zSGFuZGxpbmc9XCJtZXJnZVwiPlxuICogICBsaW5rIHRvIHVzZXIgY29tcG9uZW50XG4gKiA8L2E+XG4gKiBgYGBcbiAqXG4gKiBZb3UgY2FuIHByb3ZpZGUgYSBgc3RhdGVgIHZhbHVlIHRvIGJlIHBlcnNpc3RlZCB0byB0aGUgYnJvd3NlcidzIEhpc3Rvcnkuc3RhdGVcbiAqIHByb3BlcnR5IChTZWUgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0hpc3RvcnkjUHJvcGVydGllcykuIEl0J3NcbiAqIHVzZWQgYXMgZm9sbG93czpcbiAqXG4gKiBgYGBcbiAqIDxhIFtyb3V0ZXJMaW5rXT1cIlsnL3VzZXIvYm9iJ11cIiBbc3RhdGVdPVwie3RyYWNpbmdJZDogMTIzfVwiPlxuICogICBsaW5rIHRvIHVzZXIgY29tcG9uZW50XG4gKiA8L2E+XG4gKiBgYGBcbiAqXG4gKiBBbmQgbGF0ZXIgdGhlIHZhbHVlIGNhbiBiZSByZWFkIGZyb20gdGhlIHJvdXRlciB0aHJvdWdoIGByb3V0ZXIuZ2V0Q3VycmVudE5hdmlnYXRpb25gLlxuICogRm9yIGV4YW1wbGUsIHRvIGNhcHR1cmUgdGhlIGB0cmFjaW5nSWRgIGFib3ZlIGR1cmluZyB0aGUgYE5hdmlnYXRpb25TdGFydGAgZXZlbnQ6XG4gKlxuICogYGBgXG4gKiAvLyBHZXQgTmF2aWdhdGlvblN0YXJ0IGV2ZW50c1xuICogcm91dGVyLmV2ZW50cy5waXBlKGZpbHRlcihlID0+IGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uU3RhcnQpKS5zdWJzY3JpYmUoZSA9PiB7XG4gKiAgIGNvbnN0IG5hdmlnYXRpb24gPSByb3V0ZXIuZ2V0Q3VycmVudE5hdmlnYXRpb24oKTtcbiAqICAgdHJhY2luZ1NlcnZpY2UudHJhY2Uoe2lkOiBuYXZpZ2F0aW9uLmV4dHJhcy5zdGF0ZS50cmFjaW5nSWR9KTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogVGhlIHJvdXRlciBsaW5rIGRpcmVjdGl2ZSBhbHdheXMgdHJlYXRzIHRoZSBwcm92aWRlZCBpbnB1dCBhcyBhIGRlbHRhIHRvIHRoZSBjdXJyZW50IHVybC5cbiAqXG4gKiBGb3IgaW5zdGFuY2UsIGlmIHRoZSBjdXJyZW50IHVybCBpcyBgL3VzZXIvKGJveC8vYXV4OnRlYW0pYC5cbiAqXG4gKiBUaGVuIHRoZSBmb2xsb3dpbmcgbGluayBgPGEgW3JvdXRlckxpbmtdPVwiWycvdXNlci9qaW0nXVwiPkppbTwvYT5gIHdpbGwgZ2VuZXJhdGUgdGhlIGxpbmtcbiAqIGAvdXNlci8oamltLy9hdXg6dGVhbSlgLlxuICpcbiAqIFNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgY3JlYXRlVXJsVHJlZX0gZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQERpcmVjdGl2ZSh7c2VsZWN0b3I6ICc6bm90KGEpOm5vdChhcmVhKVtyb3V0ZXJMaW5rXSd9KVxuZXhwb3J0IGNsYXNzIFJvdXRlckxpbmsge1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGUgYE5hdmlnYXRpb25FeHRyYXNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uRXh0cmFzI3F1ZXJ5UGFyYW1zIE5hdmlnYXRpb25FeHRyYXMjcXVlcnlQYXJhbXN9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHF1ZXJ5UGFyYW1zIToge1trOiBzdHJpbmddOiBhbnl9O1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGUgYE5hdmlnYXRpb25FeHRyYXNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uRXh0cmFzI2ZyYWdtZW50IE5hdmlnYXRpb25FeHRyYXMjZnJhZ21lbnR9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIGZyYWdtZW50ITogc3RyaW5nO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGUgYE5hdmlnYXRpb25FeHRyYXNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uRXh0cmFzI3F1ZXJ5UGFyYW1zSGFuZGxpbmcgTmF2aWdhdGlvbkV4dHJhcyNxdWVyeVBhcmFtc0hhbmRsaW5nfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASW5wdXQoKSBxdWVyeVBhcmFtc0hhbmRsaW5nITogUXVlcnlQYXJhbXNIYW5kbGluZztcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlIGBOYXZpZ2F0aW9uRXh0cmFzYC5cbiAgICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkV4dHJhcyNwcmVzZXJ2ZUZyYWdtZW50IE5hdmlnYXRpb25FeHRyYXMjcHJlc2VydmVGcmFnbWVudH1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgcHJlc2VydmVGcmFnbWVudCE6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZSBgTmF2aWdhdGlvbkV4dHJhc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25FeHRyYXMjc2tpcExvY2F0aW9uQ2hhbmdlIE5hdmlnYXRpb25FeHRyYXMjc2tpcExvY2F0aW9uQ2hhbmdlfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASW5wdXQoKSBza2lwTG9jYXRpb25DaGFuZ2UhOiBib29sZWFuO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGUgYE5hdmlnYXRpb25FeHRyYXNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uRXh0cmFzI3JlcGxhY2VVcmwgTmF2aWdhdGlvbkV4dHJhcyNyZXBsYWNlVXJsfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASW5wdXQoKSByZXBsYWNlVXJsITogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlIGBOYXZpZ2F0aW9uRXh0cmFzYC5cbiAgICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkV4dHJhcyNzdGF0ZSBOYXZpZ2F0aW9uRXh0cmFzI3N0YXRlfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpIHN0YXRlPzoge1trOiBzdHJpbmddOiBhbnl9O1xuICBwcml2YXRlIGNvbW1hbmRzOiBhbnlbXSA9IFtdO1xuICBwcml2YXRlIHByZXNlcnZlITogYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsIHByaXZhdGUgcm91dGU6IEFjdGl2YXRlZFJvdXRlLFxuICAgICAgQEF0dHJpYnV0ZSgndGFiaW5kZXgnKSB0YWJJbmRleDogc3RyaW5nLCByZW5kZXJlcjogUmVuZGVyZXIyLCBlbDogRWxlbWVudFJlZikge1xuICAgIGlmICh0YWJJbmRleCA9PSBudWxsKSB7XG4gICAgICByZW5kZXJlci5zZXRBdHRyaWJ1dGUoZWwubmF0aXZlRWxlbWVudCwgJ3RhYmluZGV4JywgJzAnKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIGNvbW1hbmRzIEFuIGFycmF5IG9mIGNvbW1hbmRzIHRvIHBhc3MgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlXG4gICAqICAgICBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0uXG4gICAqICAgLSAqKmFycmF5Kio6IGNvbW1hbmRzIHRvIHBhc3MgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfS5cbiAgICogICAtICoqc3RyaW5nKio6IHNob3J0aGFuZCBmb3IgYXJyYXkgb2YgY29tbWFuZHMgd2l0aCBqdXN0IHRoZSBzdHJpbmcsIGkuZS4gYFsnL3JvdXRlJ11gXG4gICAqICAgLSAqKm51bGx8dW5kZWZpbmVkKio6IHNob3J0aGFuZCBmb3IgYW4gZW1wdHkgYXJyYXkgb2YgY29tbWFuZHMsIGkuZS4gYFtdYFxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpXG4gIHNldCByb3V0ZXJMaW5rKGNvbW1hbmRzOiBhbnlbXXxzdHJpbmd8bnVsbHx1bmRlZmluZWQpIHtcbiAgICBpZiAoY29tbWFuZHMgIT0gbnVsbCkge1xuICAgICAgdGhpcy5jb21tYW5kcyA9IEFycmF5LmlzQXJyYXkoY29tbWFuZHMpID8gY29tbWFuZHMgOiBbY29tbWFuZHNdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbW1hbmRzID0gW107XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBkZXByZWNhdGVkIEFzIG9mIEFuZ3VsYXIgdjQuMCB1c2UgYHF1ZXJ5UGFyYW1zSGFuZGxpbmdgIGluc3RlYWQuXG4gICAqL1xuICBASW5wdXQoKVxuICBzZXQgcHJlc2VydmVRdWVyeVBhcmFtcyh2YWx1ZTogYm9vbGVhbikge1xuICAgIGlmIChpc0Rldk1vZGUoKSAmJiA8YW55PmNvbnNvbGUgJiYgPGFueT5jb25zb2xlLndhcm4pIHtcbiAgICAgIGNvbnNvbGUud2FybigncHJlc2VydmVRdWVyeVBhcmFtcyBpcyBkZXByZWNhdGVkISwgdXNlIHF1ZXJ5UGFyYW1zSGFuZGxpbmcgaW5zdGVhZC4nKTtcbiAgICB9XG4gICAgdGhpcy5wcmVzZXJ2ZSA9IHZhbHVlO1xuICB9XG5cbiAgQEhvc3RMaXN0ZW5lcignY2xpY2snKVxuICBvbkNsaWNrKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGV4dHJhcyA9IHtcbiAgICAgIHNraXBMb2NhdGlvbkNoYW5nZTogYXR0ckJvb2xWYWx1ZSh0aGlzLnNraXBMb2NhdGlvbkNoYW5nZSksXG4gICAgICByZXBsYWNlVXJsOiBhdHRyQm9vbFZhbHVlKHRoaXMucmVwbGFjZVVybCksXG4gICAgICBzdGF0ZTogdGhpcy5zdGF0ZSxcbiAgICB9O1xuICAgIHRoaXMucm91dGVyLm5hdmlnYXRlQnlVcmwodGhpcy51cmxUcmVlLCBleHRyYXMpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZ2V0IHVybFRyZWUoKTogVXJsVHJlZSB7XG4gICAgcmV0dXJuIHRoaXMucm91dGVyLmNyZWF0ZVVybFRyZWUodGhpcy5jb21tYW5kcywge1xuICAgICAgcmVsYXRpdmVUbzogdGhpcy5yb3V0ZSxcbiAgICAgIHF1ZXJ5UGFyYW1zOiB0aGlzLnF1ZXJ5UGFyYW1zLFxuICAgICAgZnJhZ21lbnQ6IHRoaXMuZnJhZ21lbnQsXG4gICAgICBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zOiBhdHRyQm9vbFZhbHVlKHRoaXMucHJlc2VydmUpLFxuICAgICAgcXVlcnlQYXJhbXNIYW5kbGluZzogdGhpcy5xdWVyeVBhcmFtc0hhbmRsaW5nLFxuICAgICAgcHJlc2VydmVGcmFnbWVudDogYXR0ckJvb2xWYWx1ZSh0aGlzLnByZXNlcnZlRnJhZ21lbnQpLFxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogTGV0cyB5b3UgbGluayB0byBzcGVjaWZpYyByb3V0ZXMgaW4geW91ciBhcHAuXG4gKlxuICogU2VlIGBSb3V0ZXJMaW5rYCBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ARGlyZWN0aXZlKHtzZWxlY3RvcjogJ2Fbcm91dGVyTGlua10sYXJlYVtyb3V0ZXJMaW5rXSd9KVxuZXhwb3J0IGNsYXNzIFJvdXRlckxpbmtXaXRoSHJlZiBpbXBsZW1lbnRzIE9uQ2hhbmdlcywgT25EZXN0cm95IHtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBIb3N0QmluZGluZygnYXR0ci50YXJnZXQnKSBASW5wdXQoKSB0YXJnZXQhOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZSBgTmF2aWdhdGlvbkV4dHJhc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25FeHRyYXMjcXVlcnlQYXJhbXMgTmF2aWdhdGlvbkV4dHJhcyNxdWVyeVBhcmFtc31cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgcXVlcnlQYXJhbXMhOiB7W2s6IHN0cmluZ106IGFueX07XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZSBgTmF2aWdhdGlvbkV4dHJhc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25FeHRyYXMjZnJhZ21lbnQgTmF2aWdhdGlvbkV4dHJhcyNmcmFnbWVudH1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgZnJhZ21lbnQhOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZSBgTmF2aWdhdGlvbkV4dHJhc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25FeHRyYXMjcXVlcnlQYXJhbXNIYW5kbGluZyBOYXZpZ2F0aW9uRXh0cmFzI3F1ZXJ5UGFyYW1zSGFuZGxpbmd9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHF1ZXJ5UGFyYW1zSGFuZGxpbmchOiBRdWVyeVBhcmFtc0hhbmRsaW5nO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGUgYE5hdmlnYXRpb25FeHRyYXNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uRXh0cmFzI3ByZXNlcnZlRnJhZ21lbnQgTmF2aWdhdGlvbkV4dHJhcyNwcmVzZXJ2ZUZyYWdtZW50fVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASW5wdXQoKSBwcmVzZXJ2ZUZyYWdtZW50ITogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlIGBOYXZpZ2F0aW9uRXh0cmFzYC5cbiAgICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkV4dHJhcyNza2lwTG9jYXRpb25DaGFuZ2UgTmF2aWdhdGlvbkV4dHJhcyNza2lwTG9jYXRpb25DaGFuZ2V9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHNraXBMb2NhdGlvbkNoYW5nZSE6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZSBgTmF2aWdhdGlvbkV4dHJhc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25FeHRyYXMjcmVwbGFjZVVybCBOYXZpZ2F0aW9uRXh0cmFzI3JlcGxhY2VVcmx9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHJlcGxhY2VVcmwhOiBib29sZWFuO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGUgYE5hdmlnYXRpb25FeHRyYXNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uRXh0cmFzI3N0YXRlIE5hdmlnYXRpb25FeHRyYXMjc3RhdGV9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgQElucHV0KCkgc3RhdGU/OiB7W2s6IHN0cmluZ106IGFueX07XG4gIHByaXZhdGUgY29tbWFuZHM6IGFueVtdID0gW107XG4gIHByaXZhdGUgc3Vic2NyaXB0aW9uOiBTdWJzY3JpcHRpb247XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIHByZXNlcnZlITogYm9vbGVhbjtcblxuICAvLyB0aGUgdXJsIGRpc3BsYXllZCBvbiB0aGUgYW5jaG9yIGVsZW1lbnQuXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASG9zdEJpbmRpbmcoKSBocmVmITogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZXI6IFJvdXRlciwgcHJpdmF0ZSByb3V0ZTogQWN0aXZhdGVkUm91dGUsXG4gICAgICBwcml2YXRlIGxvY2F0aW9uU3RyYXRlZ3k6IExvY2F0aW9uU3RyYXRlZ3kpIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbiA9IHJvdXRlci5ldmVudHMuc3Vic2NyaWJlKChzOiBFdmVudCkgPT4ge1xuICAgICAgaWYgKHMgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICAgIHRoaXMudXBkYXRlVGFyZ2V0VXJsQW5kSHJlZigpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSBjb21tYW5kcyBBbiBhcnJheSBvZiBjb21tYW5kcyB0byBwYXNzIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZVxuICAgKiAgICAgUm91dGVyI2NyZWF0ZVVybFRyZWV9LlxuICAgKiAgIC0gKiphcnJheSoqOiBjb21tYW5kcyB0byBwYXNzIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0uXG4gICAqICAgLSAqKnN0cmluZyoqOiBzaG9ydGhhbmQgZm9yIGFycmF5IG9mIGNvbW1hbmRzIHdpdGgganVzdCB0aGUgc3RyaW5nLCBpLmUuIGBbJy9yb3V0ZSddYFxuICAgKiAgIC0gKipudWxsfHVuZGVmaW5lZCoqOiBzaG9ydGhhbmQgZm9yIGFuIGVtcHR5IGFycmF5IG9mIGNvbW1hbmRzLCBpLmUuIGBbXWBcbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKVxuICBzZXQgcm91dGVyTGluayhjb21tYW5kczogYW55W118c3RyaW5nfG51bGx8dW5kZWZpbmVkKSB7XG4gICAgaWYgKGNvbW1hbmRzICE9IG51bGwpIHtcbiAgICAgIHRoaXMuY29tbWFuZHMgPSBBcnJheS5pc0FycmF5KGNvbW1hbmRzKSA/IGNvbW1hbmRzIDogW2NvbW1hbmRzXTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb21tYW5kcyA9IFtdO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAZGVwcmVjYXRlZCBBcyBvZiBBbmd1bGFyIHY0LjAgdXNlIGBxdWVyeVBhcmFtc0hhbmRsaW5nYCBpbnN0ZWFkLlxuICAgKi9cbiAgQElucHV0KClcbiAgc2V0IHByZXNlcnZlUXVlcnlQYXJhbXModmFsdWU6IGJvb2xlYW4pIHtcbiAgICBpZiAoaXNEZXZNb2RlKCkgJiYgPGFueT5jb25zb2xlICYmIDxhbnk+Y29uc29sZS53YXJuKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ3ByZXNlcnZlUXVlcnlQYXJhbXMgaXMgZGVwcmVjYXRlZCwgdXNlIHF1ZXJ5UGFyYW1zSGFuZGxpbmcgaW5zdGVhZC4nKTtcbiAgICB9XG4gICAgdGhpcy5wcmVzZXJ2ZSA9IHZhbHVlO1xuICB9XG5cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczoge30pOiBhbnkge1xuICAgIHRoaXMudXBkYXRlVGFyZ2V0VXJsQW5kSHJlZigpO1xuICB9XG4gIG5nT25EZXN0cm95KCk6IGFueSB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIEBIb3N0TGlzdGVuZXIoJ2NsaWNrJywgWyckZXZlbnQuYnV0dG9uJywgJyRldmVudC5jdHJsS2V5JywgJyRldmVudC5tZXRhS2V5JywgJyRldmVudC5zaGlmdEtleSddKVxuICBvbkNsaWNrKGJ1dHRvbjogbnVtYmVyLCBjdHJsS2V5OiBib29sZWFuLCBtZXRhS2V5OiBib29sZWFuLCBzaGlmdEtleTogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgIGlmIChidXR0b24gIT09IDAgfHwgY3RybEtleSB8fCBtZXRhS2V5IHx8IHNoaWZ0S2V5KSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHRoaXMudGFyZ2V0ID09PSAnc3RyaW5nJyAmJiB0aGlzLnRhcmdldCAhPSAnX3NlbGYnKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBjb25zdCBleHRyYXMgPSB7XG4gICAgICBza2lwTG9jYXRpb25DaGFuZ2U6IGF0dHJCb29sVmFsdWUodGhpcy5za2lwTG9jYXRpb25DaGFuZ2UpLFxuICAgICAgcmVwbGFjZVVybDogYXR0ckJvb2xWYWx1ZSh0aGlzLnJlcGxhY2VVcmwpLFxuICAgICAgc3RhdGU6IHRoaXMuc3RhdGVcbiAgICB9O1xuICAgIHRoaXMucm91dGVyLm5hdmlnYXRlQnlVcmwodGhpcy51cmxUcmVlLCBleHRyYXMpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlVGFyZ2V0VXJsQW5kSHJlZigpOiB2b2lkIHtcbiAgICB0aGlzLmhyZWYgPSB0aGlzLmxvY2F0aW9uU3RyYXRlZ3kucHJlcGFyZUV4dGVybmFsVXJsKHRoaXMucm91dGVyLnNlcmlhbGl6ZVVybCh0aGlzLnVybFRyZWUpKTtcbiAgfVxuXG4gIGdldCB1cmxUcmVlKCk6IFVybFRyZWUge1xuICAgIHJldHVybiB0aGlzLnJvdXRlci5jcmVhdGVVcmxUcmVlKHRoaXMuY29tbWFuZHMsIHtcbiAgICAgIHJlbGF0aXZlVG86IHRoaXMucm91dGUsXG4gICAgICBxdWVyeVBhcmFtczogdGhpcy5xdWVyeVBhcmFtcyxcbiAgICAgIGZyYWdtZW50OiB0aGlzLmZyYWdtZW50LFxuICAgICAgcHJlc2VydmVRdWVyeVBhcmFtczogYXR0ckJvb2xWYWx1ZSh0aGlzLnByZXNlcnZlKSxcbiAgICAgIHF1ZXJ5UGFyYW1zSGFuZGxpbmc6IHRoaXMucXVlcnlQYXJhbXNIYW5kbGluZyxcbiAgICAgIHByZXNlcnZlRnJhZ21lbnQ6IGF0dHJCb29sVmFsdWUodGhpcy5wcmVzZXJ2ZUZyYWdtZW50KSxcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhdHRyQm9vbFZhbHVlKHM6IGFueSk6IGJvb2xlYW4ge1xuICByZXR1cm4gcyA9PT0gJycgfHwgISFzO1xufVxuIl19