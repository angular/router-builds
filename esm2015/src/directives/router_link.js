/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
import { LocationStrategy } from '@angular/common';
import { Attribute, Directive, ElementRef, HostBinding, HostListener, Input, Renderer2, isDevMode } from '@angular/core';
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
 * You can tell the directive to how to handle queryParams, available options are:
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
 *
 */
let RouterLink = class RouterLink {
    constructor(router, route, tabIndex, renderer, el) {
        this.router = router;
        this.route = route;
        this.commands = [];
        if (tabIndex == null) {
            renderer.setAttribute(el.nativeElement, 'tabindex', '0');
        }
    }
    set routerLink(commands) {
        if (commands != null) {
            this.commands = Array.isArray(commands) ? commands : [commands];
        }
        else {
            this.commands = [];
        }
    }
    /**
     * @deprecated 4.0.0 use `queryParamsHandling` instead.
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
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", Object)
], RouterLink.prototype, "queryParams", void 0);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", String)
], RouterLink.prototype, "fragment", void 0);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", String)
], RouterLink.prototype, "queryParamsHandling", void 0);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", Boolean)
], RouterLink.prototype, "preserveFragment", void 0);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", Boolean)
], RouterLink.prototype, "skipLocationChange", void 0);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", Boolean)
], RouterLink.prototype, "replaceUrl", void 0);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], RouterLink.prototype, "routerLink", null);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", Boolean),
    tslib_1.__metadata("design:paramtypes", [Boolean])
], RouterLink.prototype, "preserveQueryParams", null);
tslib_1.__decorate([
    HostListener('click'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Boolean)
], RouterLink.prototype, "onClick", null);
RouterLink = tslib_1.__decorate([
    Directive({ selector: ':not(a)[routerLink]' }),
    tslib_1.__param(2, Attribute('tabindex')),
    tslib_1.__metadata("design:paramtypes", [Router, ActivatedRoute, String, Renderer2, ElementRef])
], RouterLink);
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
 *
 */
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
    set routerLink(commands) {
        if (commands != null) {
            this.commands = Array.isArray(commands) ? commands : [commands];
        }
        else {
            this.commands = [];
        }
    }
    set preserveQueryParams(value) {
        if (isDevMode() && console && console.warn) {
            console.warn('preserveQueryParams is deprecated, use queryParamsHandling instead.');
        }
        this.preserve = value;
    }
    ngOnChanges(changes) { this.updateTargetUrlAndHref(); }
    ngOnDestroy() { this.subscription.unsubscribe(); }
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
tslib_1.__decorate([
    HostBinding('attr.target'), Input(),
    tslib_1.__metadata("design:type", String)
], RouterLinkWithHref.prototype, "target", void 0);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", Object)
], RouterLinkWithHref.prototype, "queryParams", void 0);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", String)
], RouterLinkWithHref.prototype, "fragment", void 0);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", String)
], RouterLinkWithHref.prototype, "queryParamsHandling", void 0);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", Boolean)
], RouterLinkWithHref.prototype, "preserveFragment", void 0);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", Boolean)
], RouterLinkWithHref.prototype, "skipLocationChange", void 0);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", Boolean)
], RouterLinkWithHref.prototype, "replaceUrl", void 0);
tslib_1.__decorate([
    HostBinding(),
    tslib_1.__metadata("design:type", String)
], RouterLinkWithHref.prototype, "href", void 0);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], RouterLinkWithHref.prototype, "routerLink", null);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", Boolean),
    tslib_1.__metadata("design:paramtypes", [Boolean])
], RouterLinkWithHref.prototype, "preserveQueryParams", null);
tslib_1.__decorate([
    HostListener('click', ['$event.button', '$event.ctrlKey', '$event.metaKey', '$event.shiftKey']),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, Boolean, Boolean, Boolean]),
    tslib_1.__metadata("design:returntype", Boolean)
], RouterLinkWithHref.prototype, "onClick", null);
RouterLinkWithHref = tslib_1.__decorate([
    Directive({ selector: 'a[routerLink]' }),
    tslib_1.__metadata("design:paramtypes", [Router, ActivatedRoute,
        LocationStrategy])
], RouterLinkWithHref);
export { RouterLinkWithHref };
function attrBoolValue(s) {
    return s === '' || !!s;
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOztBQUVILE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBd0IsU0FBUyxFQUFFLFNBQVMsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUk3SSxPQUFPLEVBQUMsYUFBYSxFQUFjLE1BQU0sV0FBVyxDQUFDO0FBQ3JELE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDakMsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBSS9DOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0F3RUc7QUFFSCxJQUFhLFVBQVUsR0FBdkIsTUFBYSxVQUFVO0lBaUJyQixZQUNZLE1BQWMsRUFBVSxLQUFxQixFQUM5QixRQUFnQixFQUFFLFFBQW1CLEVBQUUsRUFBYztRQURwRSxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQVUsVUFBSyxHQUFMLEtBQUssQ0FBZ0I7UUFMakQsYUFBUSxHQUFVLEVBQUUsQ0FBQztRQU8zQixJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUU7WUFDcEIsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsYUFBYSxFQUFFLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUMxRDtJQUNILENBQUM7SUFHRCxJQUFJLFVBQVUsQ0FBQyxRQUFzQjtRQUNuQyxJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUU7WUFDcEIsSUFBSSxDQUFDLFFB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QixFQUFFLGlCQUFpQixDQUFDLENBQUM7Ozs7aURBZ0IvRjtBQXRFVSxrQkFBa0I7SUFEOUIsU0FBUyxDQUFDLEVBQUMsUUFBUSxFQUFFLGVBQWUsRUFBQyxDQUFDOzZDQTBCakIsTUFBTSxFQUFpQixjQUFjO1FBQzNCLGdCQUFnQjtHQTFCbkMsa0JBQWtCLENBc0Y5QjtTQXRGWSxrQkFBa0I7QUF3Ri9CLFNBQVMsYUFBYSxDQUFDLENBQU07SUFDM0IsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvblN0cmF0ZWd5fSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtBdHRyaWJ1dGUsIERpcmVjdGl2ZSwgRWxlbWVudFJlZiwgSG9zdEJpbmRpbmcsIEhvc3RMaXN0ZW5lciwgSW5wdXQsIE9uQ2hhbmdlcywgT25EZXN0cm95LCBSZW5kZXJlcjIsIGlzRGV2TW9kZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge1N1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7UXVlcnlQYXJhbXNIYW5kbGluZ30gZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7TmF2aWdhdGlvbkVuZCwgUm91dGVyRXZlbnR9IGZyb20gJy4uL2V2ZW50cyc7XG5pbXBvcnQge1JvdXRlcn0gZnJvbSAnLi4vcm91dGVyJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGV9IGZyb20gJy4uL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1VybFRyZWV9IGZyb20gJy4uL3VybF90cmVlJztcblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIExldHMgeW91IGxpbmsgdG8gc3BlY2lmaWMgcm91dGVzIGluIHlvdXIgYXBwLlxuICpcbiAqIENvbnNpZGVyIHRoZSBmb2xsb3dpbmcgcm91dGUgY29uZmlndXJhdGlvbjpcbiAqIGBbeyBwYXRoOiAndXNlci86bmFtZScsIGNvbXBvbmVudDogVXNlckNtcCB9XWAuXG4gKiBXaGVuIGxpbmtpbmcgdG8gdGhpcyBgdXNlci86bmFtZWAgcm91dGUsIHlvdSB1c2UgdGhlIGBSb3V0ZXJMaW5rYCBkaXJlY3RpdmUuXG4gKlxuICogSWYgdGhlIGxpbmsgaXMgc3RhdGljLCB5b3UgY2FuIHVzZSB0aGUgZGlyZWN0aXZlIGFzIGZvbGxvd3M6XG4gKiBgPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiPmxpbmsgdG8gdXNlciBjb21wb25lbnQ8L2E+YFxuICpcbiAqIElmIHlvdSB1c2UgZHluYW1pYyB2YWx1ZXMgdG8gZ2VuZXJhdGUgdGhlIGxpbmssIHlvdSBjYW4gcGFzcyBhbiBhcnJheSBvZiBwYXRoXG4gKiBzZWdtZW50cywgZm9sbG93ZWQgYnkgdGhlIHBhcmFtcyBmb3IgZWFjaCBzZWdtZW50LlxuICpcbiAqIEZvciBpbnN0YW5jZSBgWycvdGVhbScsIHRlYW1JZCwgJ3VzZXInLCB1c2VyTmFtZSwge2RldGFpbHM6IHRydWV9XWBcbiAqIG1lYW5zIHRoYXQgd2Ugd2FudCB0byBnZW5lcmF0ZSBhIGxpbmsgdG8gYC90ZWFtLzExL3VzZXIvYm9iO2RldGFpbHM9dHJ1ZWAuXG4gKlxuICogTXVsdGlwbGUgc3RhdGljIHNlZ21lbnRzIGNhbiBiZSBtZXJnZWQgaW50byBvbmVcbiAqIChlLmcuLCBgWycvdGVhbS8xMS91c2VyJywgdXNlck5hbWUsIHtkZXRhaWxzOiB0cnVlfV1gKS5cbiAqXG4gKiBUaGUgZmlyc3Qgc2VnbWVudCBuYW1lIGNhbiBiZSBwcmVwZW5kZWQgd2l0aCBgL2AsIGAuL2AsIG9yIGAuLi9gOlxuICogKiBJZiB0aGUgZmlyc3Qgc2VnbWVudCBiZWdpbnMgd2l0aCBgL2AsIHRoZSByb3V0ZXIgd2lsbCBsb29rIHVwIHRoZSByb3V0ZSBmcm9tIHRoZSByb290IG9mIHRoZVxuICogICBhcHAuXG4gKiAqIElmIHRoZSBmaXJzdCBzZWdtZW50IGJlZ2lucyB3aXRoIGAuL2AsIG9yIGRvZXNuJ3QgYmVnaW4gd2l0aCBhIHNsYXNoLCB0aGUgcm91dGVyIHdpbGxcbiAqICAgaW5zdGVhZCBsb29rIGluIHRoZSBjaGlsZHJlbiBvZiB0aGUgY3VycmVudCBhY3RpdmF0ZWQgcm91dGUuXG4gKiAqIEFuZCBpZiB0aGUgZmlyc3Qgc2VnbWVudCBiZWdpbnMgd2l0aCBgLi4vYCwgdGhlIHJvdXRlciB3aWxsIGdvIHVwIG9uZSBsZXZlbC5cbiAqXG4gKiBZb3UgY2FuIHNldCBxdWVyeSBwYXJhbXMgYW5kIGZyYWdtZW50IGFzIGZvbGxvd3M6XG4gKlxuICogYGBgXG4gKiA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2JvYiddXCIgW3F1ZXJ5UGFyYW1zXT1cIntkZWJ1ZzogdHJ1ZX1cIiBmcmFnbWVudD1cImVkdWNhdGlvblwiPlxuICogICBsaW5rIHRvIHVzZXIgY29tcG9uZW50XG4gKiA8L2E+XG4gKiBgYGBcbiAqIFJvdXRlckxpbmsgd2lsbCB1c2UgdGhlc2UgdG8gZ2VuZXJhdGUgdGhpcyBsaW5rOiBgL3VzZXIvYm9iI2VkdWNhdGlvbj9kZWJ1Zz10cnVlYC5cbiAqXG4gKiAoRGVwcmVjYXRlZCBpbiB2NC4wLjAgdXNlIGBxdWVyeVBhcmFtc0hhbmRsaW5nYCBpbnN0ZWFkKSBZb3UgY2FuIGFsc28gdGVsbCB0aGVcbiAqIGRpcmVjdGl2ZSB0byBwcmVzZXJ2ZSB0aGUgY3VycmVudCBxdWVyeSBwYXJhbXMgYW5kIGZyYWdtZW50OlxuICpcbiAqIGBgYFxuICogPGEgW3JvdXRlckxpbmtdPVwiWycvdXNlci9ib2InXVwiIHByZXNlcnZlUXVlcnlQYXJhbXMgcHJlc2VydmVGcmFnbWVudD5cbiAqICAgbGluayB0byB1c2VyIGNvbXBvbmVudFxuICogPC9hPlxuICogYGBgXG4gKlxuICogWW91IGNhbiB0ZWxsIHRoZSBkaXJlY3RpdmUgdG8gaG93IHRvIGhhbmRsZSBxdWVyeVBhcmFtcywgYXZhaWxhYmxlIG9wdGlvbnMgYXJlOlxuICogIC0gYCdtZXJnZSdgOiBtZXJnZSB0aGUgcXVlcnlQYXJhbXMgaW50byB0aGUgY3VycmVudCBxdWVyeVBhcmFtc1xuICogIC0gYCdwcmVzZXJ2ZSdgOiBwcmVzZXJ2ZSB0aGUgY3VycmVudCBxdWVyeVBhcmFtc1xuICogIC0gZGVmYXVsdC9gJydgOiB1c2UgdGhlIHF1ZXJ5UGFyYW1zIG9ubHlcbiAqXG4gKiBTYW1lIG9wdGlvbnMgZm9yIHtAbGluayBOYXZpZ2F0aW9uRXh0cmFzI3F1ZXJ5UGFyYW1zSGFuZGxpbmdcbiAqIE5hdmlnYXRpb25FeHRyYXMjcXVlcnlQYXJhbXNIYW5kbGluZ30uXG4gKlxuICogYGBgXG4gKiA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2JvYiddXCIgW3F1ZXJ5UGFyYW1zXT1cIntkZWJ1ZzogdHJ1ZX1cIiBxdWVyeVBhcmFtc0hhbmRsaW5nPVwibWVyZ2VcIj5cbiAqICAgbGluayB0byB1c2VyIGNvbXBvbmVudFxuICogPC9hPlxuICogYGBgXG4gKlxuICogVGhlIHJvdXRlciBsaW5rIGRpcmVjdGl2ZSBhbHdheXMgdHJlYXRzIHRoZSBwcm92aWRlZCBpbnB1dCBhcyBhIGRlbHRhIHRvIHRoZSBjdXJyZW50IHVybC5cbiAqXG4gKiBGb3IgaW5zdGFuY2UsIGlmIHRoZSBjdXJyZW50IHVybCBpcyBgL3VzZXIvKGJveC8vYXV4OnRlYW0pYC5cbiAqXG4gKiBUaGVuIHRoZSBmb2xsb3dpbmcgbGluayBgPGEgW3JvdXRlckxpbmtdPVwiWycvdXNlci9qaW0nXVwiPkppbTwvYT5gIHdpbGwgZ2VuZXJhdGUgdGhlIGxpbmtcbiAqIGAvdXNlci8oamltLy9hdXg6dGVhbSlgLlxuICpcbiAqIFNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgY3JlYXRlVXJsVHJlZX0gZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqXG4gKi9cbkBEaXJlY3RpdmUoe3NlbGVjdG9yOiAnOm5vdChhKVtyb3V0ZXJMaW5rXSd9KVxuZXhwb3J0IGNsYXNzIFJvdXRlckxpbmsge1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgcXVlcnlQYXJhbXMgIToge1trOiBzdHJpbmddOiBhbnl9O1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgZnJhZ21lbnQgITogc3RyaW5nO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgcXVlcnlQYXJhbXNIYW5kbGluZyAhOiBRdWVyeVBhcmFtc0hhbmRsaW5nO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgcHJlc2VydmVGcmFnbWVudCAhOiBib29sZWFuO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgc2tpcExvY2F0aW9uQ2hhbmdlICE6IGJvb2xlYW47XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASW5wdXQoKSByZXBsYWNlVXJsICE6IGJvb2xlYW47XG4gIHByaXZhdGUgY29tbWFuZHM6IGFueVtdID0gW107XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIHByZXNlcnZlICE6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLCBwcml2YXRlIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSxcbiAgICAgIEBBdHRyaWJ1dGUoJ3RhYmluZGV4JykgdGFiSW5kZXg6IHN0cmluZywgcmVuZGVyZXI6IFJlbmRlcmVyMiwgZWw6IEVsZW1lbnRSZWYpIHtcbiAgICBpZiAodGFiSW5kZXggPT0gbnVsbCkge1xuICAgICAgcmVuZGVyZXIuc2V0QXR0cmlidXRlKGVsLm5hdGl2ZUVsZW1lbnQsICd0YWJpbmRleCcsICcwJyk7XG4gICAgfVxuICB9XG5cbiAgQElucHV0KClcbiAgc2V0IHJvdXRlckxpbmsoY29tbWFuZHM6IGFueVtdfHN0cmluZykge1xuICAgIGlmIChjb21tYW5kcyAhPSBudWxsKSB7XG4gICAgICB0aGlzLmNvbW1hbmRzID0gQXJyYXkuaXNBcnJheShjb21tYW5kcykgPyBjb21tYW5kcyA6IFtjb21tYW5kc107XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29tbWFuZHMgPSBbXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQGRlcHJlY2F0ZWQgNC4wLjAgdXNlIGBxdWVyeVBhcmFtc0hhbmRsaW5nYCBpbnN0ZWFkLlxuICAgKi9cbiAgQElucHV0KClcbiAgc2V0IHByZXNlcnZlUXVlcnlQYXJhbXModmFsdWU6IGJvb2xlYW4pIHtcbiAgICBpZiAoaXNEZXZNb2RlKCkgJiYgPGFueT5jb25zb2xlICYmIDxhbnk+Y29uc29sZS53YXJuKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ3ByZXNlcnZlUXVlcnlQYXJhbXMgaXMgZGVwcmVjYXRlZCEsIHVzZSBxdWVyeVBhcmFtc0hhbmRsaW5nIGluc3RlYWQuJyk7XG4gICAgfVxuICAgIHRoaXMucHJlc2VydmUgPSB2YWx1ZTtcbiAgfVxuXG4gIEBIb3N0TGlzdGVuZXIoJ2NsaWNrJylcbiAgb25DbGljaygpOiBib29sZWFuIHtcbiAgICBjb25zdCBleHRyYXMgPSB7XG4gICAgICBza2lwTG9jYXRpb25DaGFuZ2U6IGF0dHJCb29sVmFsdWUodGhpcy5za2lwTG9jYXRpb25DaGFuZ2UpLFxuICAgICAgcmVwbGFjZVVybDogYXR0ckJvb2xWYWx1ZSh0aGlzLnJlcGxhY2VVcmwpLFxuICAgIH07XG4gICAgdGhpcy5yb3V0ZXIubmF2aWdhdGVCeVVybCh0aGlzLnVybFRyZWUsIGV4dHJhcyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBnZXQgdXJsVHJlZSgpOiBVcmxUcmVlIHtcbiAgICByZXR1cm4gdGhpcy5yb3V0ZXIuY3JlYXRlVXJsVHJlZSh0aGlzLmNvbW1hbmRzLCB7XG4gICAgICByZWxhdGl2ZVRvOiB0aGlzLnJvdXRlLFxuICAgICAgcXVlcnlQYXJhbXM6IHRoaXMucXVlcnlQYXJhbXMsXG4gICAgICBmcmFnbWVudDogdGhpcy5mcmFnbWVudCxcbiAgICAgIHByZXNlcnZlUXVlcnlQYXJhbXM6IGF0dHJCb29sVmFsdWUodGhpcy5wcmVzZXJ2ZSksXG4gICAgICBxdWVyeVBhcmFtc0hhbmRsaW5nOiB0aGlzLnF1ZXJ5UGFyYW1zSGFuZGxpbmcsXG4gICAgICBwcmVzZXJ2ZUZyYWdtZW50OiBhdHRyQm9vbFZhbHVlKHRoaXMucHJlc2VydmVGcmFnbWVudCksXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBMZXRzIHlvdSBsaW5rIHRvIHNwZWNpZmljIHJvdXRlcyBpbiB5b3VyIGFwcC5cbiAqXG4gKiBTZWUgYFJvdXRlckxpbmtgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICpcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKlxuICovXG5ARGlyZWN0aXZlKHtzZWxlY3RvcjogJ2Fbcm91dGVyTGlua10nfSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJMaW5rV2l0aEhyZWYgaW1wbGVtZW50cyBPbkNoYW5nZXMsIE9uRGVzdHJveSB7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASG9zdEJpbmRpbmcoJ2F0dHIudGFyZ2V0JykgQElucHV0KCkgdGFyZ2V0ICE6IHN0cmluZztcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHF1ZXJ5UGFyYW1zICE6IHtbazogc3RyaW5nXTogYW55fTtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIGZyYWdtZW50ICE6IHN0cmluZztcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHF1ZXJ5UGFyYW1zSGFuZGxpbmcgITogUXVlcnlQYXJhbXNIYW5kbGluZztcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHByZXNlcnZlRnJhZ21lbnQgITogYm9vbGVhbjtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHNraXBMb2NhdGlvbkNoYW5nZSAhOiBib29sZWFuO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgcmVwbGFjZVVybCAhOiBib29sZWFuO1xuICBwcml2YXRlIGNvbW1hbmRzOiBhbnlbXSA9IFtdO1xuICBwcml2YXRlIHN1YnNjcmlwdGlvbjogU3Vic2NyaXB0aW9uO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBwcmVzZXJ2ZSAhOiBib29sZWFuO1xuXG4gIC8vIHRoZSB1cmwgZGlzcGxheWVkIG9uIHRoZSBhbmNob3IgZWxlbWVudC5cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBIb3N0QmluZGluZygpIGhyZWYgITogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZXI6IFJvdXRlciwgcHJpdmF0ZSByb3V0ZTogQWN0aXZhdGVkUm91dGUsXG4gICAgICBwcml2YXRlIGxvY2F0aW9uU3RyYXRlZ3k6IExvY2F0aW9uU3RyYXRlZ3kpIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbiA9IHJvdXRlci5ldmVudHMuc3Vic2NyaWJlKChzOiBSb3V0ZXJFdmVudCkgPT4ge1xuICAgICAgaWYgKHMgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICAgIHRoaXMudXBkYXRlVGFyZ2V0VXJsQW5kSHJlZigpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgQElucHV0KClcbiAgc2V0IHJvdXRlckxpbmsoY29tbWFuZHM6IGFueVtdfHN0cmluZykge1xuICAgIGlmIChjb21tYW5kcyAhPSBudWxsKSB7XG4gICAgICB0aGlzLmNvbW1hbmRzID0gQXJyYXkuaXNBcnJheShjb21tYW5kcykgPyBjb21tYW5kcyA6IFtjb21tYW5kc107XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29tbWFuZHMgPSBbXTtcbiAgICB9XG4gIH1cblxuICBASW5wdXQoKVxuICBzZXQgcHJlc2VydmVRdWVyeVBhcmFtcyh2YWx1ZTogYm9vbGVhbikge1xuICAgIGlmIChpc0Rldk1vZGUoKSAmJiA8YW55PmNvbnNvbGUgJiYgPGFueT5jb25zb2xlLndhcm4pIHtcbiAgICAgIGNvbnNvbGUud2FybigncHJlc2VydmVRdWVyeVBhcmFtcyBpcyBkZXByZWNhdGVkLCB1c2UgcXVlcnlQYXJhbXNIYW5kbGluZyBpbnN0ZWFkLicpO1xuICAgIH1cbiAgICB0aGlzLnByZXNlcnZlID0gdmFsdWU7XG4gIH1cblxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiB7fSk6IGFueSB7IHRoaXMudXBkYXRlVGFyZ2V0VXJsQW5kSHJlZigpOyB9XG4gIG5nT25EZXN0cm95KCk6IGFueSB7IHRoaXMuc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7IH1cblxuICBASG9zdExpc3RlbmVyKCdjbGljaycsIFsnJGV2ZW50LmJ1dHRvbicsICckZXZlbnQuY3RybEtleScsICckZXZlbnQubWV0YUtleScsICckZXZlbnQuc2hpZnRLZXknXSlcbiAgb25DbGljayhidXR0b246IG51bWJlciwgY3RybEtleTogYm9vbGVhbiwgbWV0YUtleTogYm9vbGVhbiwgc2hpZnRLZXk6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBpZiAoYnV0dG9uICE9PSAwIHx8IGN0cmxLZXkgfHwgbWV0YUtleSB8fCBzaGlmdEtleSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB0aGlzLnRhcmdldCA9PT0gJ3N0cmluZycgJiYgdGhpcy50YXJnZXQgIT0gJ19zZWxmJykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgY29uc3QgZXh0cmFzID0ge1xuICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiBhdHRyQm9vbFZhbHVlKHRoaXMuc2tpcExvY2F0aW9uQ2hhbmdlKSxcbiAgICAgIHJlcGxhY2VVcmw6IGF0dHJCb29sVmFsdWUodGhpcy5yZXBsYWNlVXJsKSxcbiAgICB9O1xuICAgIHRoaXMucm91dGVyLm5hdmlnYXRlQnlVcmwodGhpcy51cmxUcmVlLCBleHRyYXMpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlVGFyZ2V0VXJsQW5kSHJlZigpOiB2b2lkIHtcbiAgICB0aGlzLmhyZWYgPSB0aGlzLmxvY2F0aW9uU3RyYXRlZ3kucHJlcGFyZUV4dGVybmFsVXJsKHRoaXMucm91dGVyLnNlcmlhbGl6ZVVybCh0aGlzLnVybFRyZWUpKTtcbiAgfVxuXG4gIGdldCB1cmxUcmVlKCk6IFVybFRyZWUge1xuICAgIHJldHVybiB0aGlzLnJvdXRlci5jcmVhdGVVcmxUcmVlKHRoaXMuY29tbWFuZHMsIHtcbiAgICAgIHJlbGF0aXZlVG86IHRoaXMucm91dGUsXG4gICAgICBxdWVyeVBhcmFtczogdGhpcy5xdWVyeVBhcmFtcyxcbiAgICAgIGZyYWdtZW50OiB0aGlzLmZyYWdtZW50LFxuICAgICAgcHJlc2VydmVRdWVyeVBhcmFtczogYXR0ckJvb2xWYWx1ZSh0aGlzLnByZXNlcnZlKSxcbiAgICAgIHF1ZXJ5UGFyYW1zSGFuZGxpbmc6IHRoaXMucXVlcnlQYXJhbXNIYW5kbGluZyxcbiAgICAgIHByZXNlcnZlRnJhZ21lbnQ6IGF0dHJCb29sVmFsdWUodGhpcy5wcmVzZXJ2ZUZyYWdtZW50KSxcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhdHRyQm9vbFZhbHVlKHM6IGFueSk6IGJvb2xlYW4ge1xuICByZXR1cm4gcyA9PT0gJycgfHwgISFzO1xufVxuIl19