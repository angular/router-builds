/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { LocationStrategy } from '@angular/common';
import { Attribute, Directive, ElementRef, HostBinding, HostListener, Input, isDevMode, Renderer2 } from '@angular/core';
import { NavigationEnd } from '../events';
import { Router } from '../router';
import { ActivatedRoute } from '../router_state';
import * as i0 from "@angular/core";
import * as i1 from "../router";
import * as i2 from "../router_state";
import * as i3 from "@angular/common";
/**
 * @description
 *
 * When applied to an element in a template, makes that element a link
 * that initiates navigation to a route. Navigation opens one or more routed components
 * in one or more `<router-outlet>` locations on the page.
 *
 * Given a route configuration `[{ path: 'user/:name', component: UserCmp }]`,
 * the following creates a static link to the route:
 * `<a routerLink="/user/bob">link to user component</a>`
 *
 * You can use dynamic values to generate the link.
 * For a dynamic link, pass an array of path segments,
 * followed by the params for each segment.
 * For example, `['/team', teamId, 'user', userName, {details: true}]`
 * generates a link to `/team/11/user/bob;details=true`.
 *
 * Multiple static segments can be merged into one term and combined with dynamic segements.
 * For example, `['/team/11/user', userName, {details: true}]`
 *
 * The input that you provide to the link is treated as a delta to the current URL.
 * For instance, suppose the current URL is `/user/(box//aux:team)`.
 * The link `<a [routerLink]="['/user/jim']">Jim</a>` creates the URL
 * `/user/(jim//aux:team)`.
 * See {@link Router#createUrlTree createUrlTree} for more information.
 *
 * @usageNotes
 *
 * You can use absolute or relative paths in a link, set query parameters,
 * control how parameters are handled, and keep a history of navigation states.
 *
 * ### Relative link paths
 *
 * The first segment name can be prepended with `/`, `./`, or `../`.
 * * If the first segment begins with `/`, the router looks up the route from the root of the
 *   app.
 * * If the first segment begins with `./`, or doesn't begin with a slash, the router
 *   looks in the children of the current activated route.
 * * If the first segment begins with `../`, the router goes up one level in the route tree.
 *
 * ### Setting and handling query params and fragments
 *
 * The following link adds a query parameter and a fragment to the generated URL:
 *
 * ```
 * <a [routerLink]="['/user/bob']" [queryParams]="{debug: true}" fragment="education">
 *   link to user component
 * </a>
 * ```
 * By default, the directive constructs the new URL using the given query parameters.
 * The example generates the link: `/user/bob?debug=true#education`.
 *
 * You can instruct the directive to handle query parameters differently
 * by specifying the `queryParamsHandling` option in the link.
 * Allowed values are:
 *
 *  - `'merge'`: Merge the given `queryParams` into the current query params.
 *  - `'preserve'`: Preserve the current query params.
 *
 * For example:
 *
 * ```
 * <a [routerLink]="['/user/bob']" [queryParams]="{debug: true}" queryParamsHandling="merge">
 *   link to user component
 * </a>
 * ```
 *
 * See {@link NavigationExtras.queryParamsHandling NavigationExtras#queryParamsHandling}.
 *
 * ### Preserving navigation history
 *
 * You can provide a `state` value to be persisted to the browser's
 * [`History.state` property](https://developer.mozilla.org/en-US/docs/Web/API/History#Properties).
 * For example:
 *
 * ```
 * <a [routerLink]="['/user/bob']" [state]="{tracingId: 123}">
 *   link to user component
 * </a>
 * ```
 *
 * Use {@link Router.getCurrentNavigation() Router#getCurrentNavigation} to retrieve a saved
 * navigation-state value. For example, to capture the `tracingId` during the `NavigationStart`
 * event:
 *
 * ```
 * // Get NavigationStart events
 * router.events.pipe(filter(e => e instanceof NavigationStart)).subscribe(e => {
 *   const navigation = router.getCurrentNavigation();
 *   tracingService.trace({id: navigation.extras.state.tracingId});
 * });
 * ```
 *
 * @ngModule RouterModule
 *
 * @publicApi
 */
export class RouterLink {
    constructor(router, route, tabIndex, renderer, el) {
        this.router = router;
        this.route = route;
        this.commands = [];
        if (tabIndex == null) {
            renderer.setAttribute(el.nativeElement, 'tabindex', '0');
        }
    }
    /**
     * Commands to pass to {@link Router#createUrlTree Router#createUrlTree}.
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
}
RouterLink.ɵfac = function RouterLink_Factory(t) { return new (t || RouterLink)(i0.ɵɵdirectiveInject(i1.Router), i0.ɵɵdirectiveInject(i2.ActivatedRoute), i0.ɵɵinjectAttribute('tabindex'), i0.ɵɵdirectiveInject(i0.Renderer2), i0.ɵɵdirectiveInject(i0.ElementRef)); };
RouterLink.ɵdir = i0.ɵɵdefineDirective({ type: RouterLink, selectors: [["", "routerLink", "", 5, "a", 5, "area"]], hostBindings: function RouterLink_HostBindings(rf, ctx) { if (rf & 1) {
        i0.ɵɵlistener("click", function RouterLink_click_HostBindingHandler() { return ctx.onClick(); });
    } }, inputs: { queryParams: "queryParams", fragment: "fragment", queryParamsHandling: "queryParamsHandling", preserveFragment: "preserveFragment", skipLocationChange: "skipLocationChange", replaceUrl: "replaceUrl", state: "state", routerLink: "routerLink", preserveQueryParams: "preserveQueryParams" } });
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RouterLink, [{
        type: Directive,
        args: [{ selector: ':not(a):not(area)[routerLink]' }]
    }], function () { return [{ type: i1.Router }, { type: i2.ActivatedRoute }, { type: undefined, decorators: [{
                type: Attribute,
                args: ['tabindex']
            }] }, { type: i0.Renderer2 }, { type: i0.ElementRef }]; }, { queryParams: [{
            type: Input
        }], fragment: [{
            type: Input
        }], queryParamsHandling: [{
            type: Input
        }], preserveFragment: [{
            type: Input
        }], skipLocationChange: [{
            type: Input
        }], replaceUrl: [{
            type: Input
        }], state: [{
            type: Input
        }], routerLink: [{
            type: Input
        }], preserveQueryParams: [{
            type: Input
        }], onClick: [{
            type: HostListener,
            args: ['click']
        }] }); })();
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
export class RouterLinkWithHref {
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
     * Commands to pass to {@link Router#createUrlTree Router#createUrlTree}.
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
}
RouterLinkWithHref.ɵfac = function RouterLinkWithHref_Factory(t) { return new (t || RouterLinkWithHref)(i0.ɵɵdirectiveInject(i1.Router), i0.ɵɵdirectiveInject(i2.ActivatedRoute), i0.ɵɵdirectiveInject(i3.LocationStrategy)); };
RouterLinkWithHref.ɵdir = i0.ɵɵdefineDirective({ type: RouterLinkWithHref, selectors: [["a", "routerLink", ""], ["area", "routerLink", ""]], hostVars: 2, hostBindings: function RouterLinkWithHref_HostBindings(rf, ctx) { if (rf & 1) {
        i0.ɵɵlistener("click", function RouterLinkWithHref_click_HostBindingHandler($event) { return ctx.onClick($event.button, $event.ctrlKey, $event.metaKey, $event.shiftKey); });
    } if (rf & 2) {
        i0.ɵɵhostProperty("href", ctx.href, i0.ɵɵsanitizeUrl);
        i0.ɵɵattribute("target", ctx.target);
    } }, inputs: { target: "target", queryParams: "queryParams", fragment: "fragment", queryParamsHandling: "queryParamsHandling", preserveFragment: "preserveFragment", skipLocationChange: "skipLocationChange", replaceUrl: "replaceUrl", state: "state", routerLink: "routerLink", preserveQueryParams: "preserveQueryParams" }, features: [i0.ɵɵNgOnChangesFeature] });
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RouterLinkWithHref, [{
        type: Directive,
        args: [{ selector: 'a[routerLink],area[routerLink]' }]
    }], function () { return [{ type: i1.Router }, { type: i2.ActivatedRoute }, { type: i3.LocationStrategy }]; }, { target: [{
            type: HostBinding,
            args: ['attr.target']
        }, {
            type: Input
        }], queryParams: [{
            type: Input
        }], fragment: [{
            type: Input
        }], queryParamsHandling: [{
            type: Input
        }], preserveFragment: [{
            type: Input
        }], skipLocationChange: [{
            type: Input
        }], replaceUrl: [{
            type: Input
        }], state: [{
            type: Input
        }], href: [{
            type: HostBinding
        }], routerLink: [{
            type: Input
        }], preserveQueryParams: [{
            type: Input
        }], onClick: [{
            type: HostListener,
            args: ['click', ['$event.button', '$event.ctrlKey', '$event.metaKey', '$event.shiftKey']]
        }] }); })();
function attrBoolValue(s) {
    return s === '' || !!s;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDakQsT0FBTyxFQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBd0IsU0FBUyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBSTdJLE9BQU8sRUFBUSxhQUFhLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDL0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUNqQyxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0saUJBQWlCLENBQUM7Ozs7O0FBSS9DOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnR0c7QUFFSCxNQUFNLE9BQU8sVUFBVTtJQW9EckIsWUFDWSxNQUFjLEVBQVUsS0FBcUIsRUFDOUIsUUFBZ0IsRUFBRSxRQUFtQixFQUFFLEVBQWM7UUFEcEUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUFVLFVBQUssR0FBTCxLQUFLLENBQWdCO1FBSmpELGFBQVEsR0FBVSxFQUFFLENBQUM7UUFNM0IsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO1lBQ3BCLFFBQVEsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDMUQ7SUFDSCxDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsSUFDSSxVQUFVLENBQUMsUUFBcUM7UUFDbEQsSUFBSSxRQUFRLElB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bUI7a0JBRHRCLEtBQUs7WUFnQk4sT0FBTztrQkFETixZQUFZO21CQUFDLE9BQU8sRUFBRSxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsQ0FBQzs7QUFtQ2pHLFNBQVMsYUFBYSxDQUFDLENBQU07SUFDM0IsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9uU3RyYXRlZ3l9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0F0dHJpYnV0ZSwgRGlyZWN0aXZlLCBFbGVtZW50UmVmLCBIb3N0QmluZGluZywgSG9zdExpc3RlbmVyLCBJbnB1dCwgaXNEZXZNb2RlLCBPbkNoYW5nZXMsIE9uRGVzdHJveSwgUmVuZGVyZXIyfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7U3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtRdWVyeVBhcmFtc0hhbmRsaW5nfSBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHtFdmVudCwgTmF2aWdhdGlvbkVuZH0gZnJvbSAnLi4vZXZlbnRzJztcbmltcG9ydCB7Um91dGVyfSBmcm9tICcuLi9yb3V0ZXInO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZX0gZnJvbSAnLi4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7VXJsVHJlZX0gZnJvbSAnLi4vdXJsX3RyZWUnO1xuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogV2hlbiBhcHBsaWVkIHRvIGFuIGVsZW1lbnQgaW4gYSB0ZW1wbGF0ZSwgbWFrZXMgdGhhdCBlbGVtZW50IGEgbGlua1xuICogdGhhdCBpbml0aWF0ZXMgbmF2aWdhdGlvbiB0byBhIHJvdXRlLiBOYXZpZ2F0aW9uIG9wZW5zIG9uZSBvciBtb3JlIHJvdXRlZCBjb21wb25lbnRzXG4gKiBpbiBvbmUgb3IgbW9yZSBgPHJvdXRlci1vdXRsZXQ+YCBsb2NhdGlvbnMgb24gdGhlIHBhZ2UuXG4gKlxuICogR2l2ZW4gYSByb3V0ZSBjb25maWd1cmF0aW9uIGBbeyBwYXRoOiAndXNlci86bmFtZScsIGNvbXBvbmVudDogVXNlckNtcCB9XWAsXG4gKiB0aGUgZm9sbG93aW5nIGNyZWF0ZXMgYSBzdGF0aWMgbGluayB0byB0aGUgcm91dGU6XG4gKiBgPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiPmxpbmsgdG8gdXNlciBjb21wb25lbnQ8L2E+YFxuICpcbiAqIFlvdSBjYW4gdXNlIGR5bmFtaWMgdmFsdWVzIHRvIGdlbmVyYXRlIHRoZSBsaW5rLlxuICogRm9yIGEgZHluYW1pYyBsaW5rLCBwYXNzIGFuIGFycmF5IG9mIHBhdGggc2VnbWVudHMsXG4gKiBmb2xsb3dlZCBieSB0aGUgcGFyYW1zIGZvciBlYWNoIHNlZ21lbnQuXG4gKiBGb3IgZXhhbXBsZSwgYFsnL3RlYW0nLCB0ZWFtSWQsICd1c2VyJywgdXNlck5hbWUsIHtkZXRhaWxzOiB0cnVlfV1gXG4gKiBnZW5lcmF0ZXMgYSBsaW5rIHRvIGAvdGVhbS8xMS91c2VyL2JvYjtkZXRhaWxzPXRydWVgLlxuICpcbiAqIE11bHRpcGxlIHN0YXRpYyBzZWdtZW50cyBjYW4gYmUgbWVyZ2VkIGludG8gb25lIHRlcm0gYW5kIGNvbWJpbmVkIHdpdGggZHluYW1pYyBzZWdlbWVudHMuXG4gKiBGb3IgZXhhbXBsZSwgYFsnL3RlYW0vMTEvdXNlcicsIHVzZXJOYW1lLCB7ZGV0YWlsczogdHJ1ZX1dYFxuICpcbiAqIFRoZSBpbnB1dCB0aGF0IHlvdSBwcm92aWRlIHRvIHRoZSBsaW5rIGlzIHRyZWF0ZWQgYXMgYSBkZWx0YSB0byB0aGUgY3VycmVudCBVUkwuXG4gKiBGb3IgaW5zdGFuY2UsIHN1cHBvc2UgdGhlIGN1cnJlbnQgVVJMIGlzIGAvdXNlci8oYm94Ly9hdXg6dGVhbSlgLlxuICogVGhlIGxpbmsgYDxhIFtyb3V0ZXJMaW5rXT1cIlsnL3VzZXIvamltJ11cIj5KaW08L2E+YCBjcmVhdGVzIHRoZSBVUkxcbiAqIGAvdXNlci8oamltLy9hdXg6dGVhbSlgLlxuICogU2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBjcmVhdGVVcmxUcmVlfSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIFlvdSBjYW4gdXNlIGFic29sdXRlIG9yIHJlbGF0aXZlIHBhdGhzIGluIGEgbGluaywgc2V0IHF1ZXJ5IHBhcmFtZXRlcnMsXG4gKiBjb250cm9sIGhvdyBwYXJhbWV0ZXJzIGFyZSBoYW5kbGVkLCBhbmQga2VlcCBhIGhpc3Rvcnkgb2YgbmF2aWdhdGlvbiBzdGF0ZXMuXG4gKlxuICogIyMjIFJlbGF0aXZlIGxpbmsgcGF0aHNcbiAqXG4gKiBUaGUgZmlyc3Qgc2VnbWVudCBuYW1lIGNhbiBiZSBwcmVwZW5kZWQgd2l0aCBgL2AsIGAuL2AsIG9yIGAuLi9gLlxuICogKiBJZiB0aGUgZmlyc3Qgc2VnbWVudCBiZWdpbnMgd2l0aCBgL2AsIHRoZSByb3V0ZXIgbG9va3MgdXAgdGhlIHJvdXRlIGZyb20gdGhlIHJvb3Qgb2YgdGhlXG4gKiAgIGFwcC5cbiAqICogSWYgdGhlIGZpcnN0IHNlZ21lbnQgYmVnaW5zIHdpdGggYC4vYCwgb3IgZG9lc24ndCBiZWdpbiB3aXRoIGEgc2xhc2gsIHRoZSByb3V0ZXJcbiAqICAgbG9va3MgaW4gdGhlIGNoaWxkcmVuIG9mIHRoZSBjdXJyZW50IGFjdGl2YXRlZCByb3V0ZS5cbiAqICogSWYgdGhlIGZpcnN0IHNlZ21lbnQgYmVnaW5zIHdpdGggYC4uL2AsIHRoZSByb3V0ZXIgZ29lcyB1cCBvbmUgbGV2ZWwgaW4gdGhlIHJvdXRlIHRyZWUuXG4gKlxuICogIyMjIFNldHRpbmcgYW5kIGhhbmRsaW5nIHF1ZXJ5IHBhcmFtcyBhbmQgZnJhZ21lbnRzXG4gKlxuICogVGhlIGZvbGxvd2luZyBsaW5rIGFkZHMgYSBxdWVyeSBwYXJhbWV0ZXIgYW5kIGEgZnJhZ21lbnQgdG8gdGhlIGdlbmVyYXRlZCBVUkw6XG4gKlxuICogYGBgXG4gKiA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2JvYiddXCIgW3F1ZXJ5UGFyYW1zXT1cIntkZWJ1ZzogdHJ1ZX1cIiBmcmFnbWVudD1cImVkdWNhdGlvblwiPlxuICogICBsaW5rIHRvIHVzZXIgY29tcG9uZW50XG4gKiA8L2E+XG4gKiBgYGBcbiAqIEJ5IGRlZmF1bHQsIHRoZSBkaXJlY3RpdmUgY29uc3RydWN0cyB0aGUgbmV3IFVSTCB1c2luZyB0aGUgZ2l2ZW4gcXVlcnkgcGFyYW1ldGVycy5cbiAqIFRoZSBleGFtcGxlIGdlbmVyYXRlcyB0aGUgbGluazogYC91c2VyL2JvYj9kZWJ1Zz10cnVlI2VkdWNhdGlvbmAuXG4gKlxuICogWW91IGNhbiBpbnN0cnVjdCB0aGUgZGlyZWN0aXZlIHRvIGhhbmRsZSBxdWVyeSBwYXJhbWV0ZXJzIGRpZmZlcmVudGx5XG4gKiBieSBzcGVjaWZ5aW5nIHRoZSBgcXVlcnlQYXJhbXNIYW5kbGluZ2Agb3B0aW9uIGluIHRoZSBsaW5rLlxuICogQWxsb3dlZCB2YWx1ZXMgYXJlOlxuICpcbiAqICAtIGAnbWVyZ2UnYDogTWVyZ2UgdGhlIGdpdmVuIGBxdWVyeVBhcmFtc2AgaW50byB0aGUgY3VycmVudCBxdWVyeSBwYXJhbXMuXG4gKiAgLSBgJ3ByZXNlcnZlJ2A6IFByZXNlcnZlIHRoZSBjdXJyZW50IHF1ZXJ5IHBhcmFtcy5cbiAqXG4gKiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIDxhIFtyb3V0ZXJMaW5rXT1cIlsnL3VzZXIvYm9iJ11cIiBbcXVlcnlQYXJhbXNdPVwie2RlYnVnOiB0cnVlfVwiIHF1ZXJ5UGFyYW1zSGFuZGxpbmc9XCJtZXJnZVwiPlxuICogICBsaW5rIHRvIHVzZXIgY29tcG9uZW50XG4gKiA8L2E+XG4gKiBgYGBcbiAqXG4gKiBTZWUge0BsaW5rIE5hdmlnYXRpb25FeHRyYXMucXVlcnlQYXJhbXNIYW5kbGluZyBOYXZpZ2F0aW9uRXh0cmFzI3F1ZXJ5UGFyYW1zSGFuZGxpbmd9LlxuICpcbiAqICMjIyBQcmVzZXJ2aW5nIG5hdmlnYXRpb24gaGlzdG9yeVxuICpcbiAqIFlvdSBjYW4gcHJvdmlkZSBhIGBzdGF0ZWAgdmFsdWUgdG8gYmUgcGVyc2lzdGVkIHRvIHRoZSBicm93c2VyJ3NcbiAqIFtgSGlzdG9yeS5zdGF0ZWAgcHJvcGVydHldKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9IaXN0b3J5I1Byb3BlcnRpZXMpLlxuICogRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2JvYiddXCIgW3N0YXRlXT1cInt0cmFjaW5nSWQ6IDEyM31cIj5cbiAqICAgbGluayB0byB1c2VyIGNvbXBvbmVudFxuICogPC9hPlxuICogYGBgXG4gKlxuICogVXNlIHtAbGluayBSb3V0ZXIuZ2V0Q3VycmVudE5hdmlnYXRpb24oKSBSb3V0ZXIjZ2V0Q3VycmVudE5hdmlnYXRpb259IHRvIHJldHJpZXZlIGEgc2F2ZWRcbiAqIG5hdmlnYXRpb24tc3RhdGUgdmFsdWUuIEZvciBleGFtcGxlLCB0byBjYXB0dXJlIHRoZSBgdHJhY2luZ0lkYCBkdXJpbmcgdGhlIGBOYXZpZ2F0aW9uU3RhcnRgXG4gKiBldmVudDpcbiAqXG4gKiBgYGBcbiAqIC8vIEdldCBOYXZpZ2F0aW9uU3RhcnQgZXZlbnRzXG4gKiByb3V0ZXIuZXZlbnRzLnBpcGUoZmlsdGVyKGUgPT4gZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25TdGFydCkpLnN1YnNjcmliZShlID0+IHtcbiAqICAgY29uc3QgbmF2aWdhdGlvbiA9IHJvdXRlci5nZXRDdXJyZW50TmF2aWdhdGlvbigpO1xuICogICB0cmFjaW5nU2VydmljZS50cmFjZSh7aWQ6IG5hdmlnYXRpb24uZXh0cmFzLnN0YXRlLnRyYWNpbmdJZH0pO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ARGlyZWN0aXZlKHtzZWxlY3RvcjogJzpub3QoYSk6bm90KGFyZWEpW3JvdXRlckxpbmtdJ30pXG5leHBvcnQgY2xhc3MgUm91dGVyTGluayB7XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZSBgTmF2aWdhdGlvbkV4dHJhc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25FeHRyYXMjcXVlcnlQYXJhbXMgTmF2aWdhdGlvbkV4dHJhcyNxdWVyeVBhcmFtc31cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgcXVlcnlQYXJhbXMhOiB7W2s6IHN0cmluZ106IGFueX07XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZSBgTmF2aWdhdGlvbkV4dHJhc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25FeHRyYXMjZnJhZ21lbnQgTmF2aWdhdGlvbkV4dHJhcyNmcmFnbWVudH1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgZnJhZ21lbnQhOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZSBgTmF2aWdhdGlvbkV4dHJhc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25FeHRyYXMjcXVlcnlQYXJhbXNIYW5kbGluZyBOYXZpZ2F0aW9uRXh0cmFzI3F1ZXJ5UGFyYW1zSGFuZGxpbmd9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHF1ZXJ5UGFyYW1zSGFuZGxpbmchOiBRdWVyeVBhcmFtc0hhbmRsaW5nO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGUgYE5hdmlnYXRpb25FeHRyYXNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uRXh0cmFzI3ByZXNlcnZlRnJhZ21lbnQgTmF2aWdhdGlvbkV4dHJhcyNwcmVzZXJ2ZUZyYWdtZW50fVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASW5wdXQoKSBwcmVzZXJ2ZUZyYWdtZW50ITogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlIGBOYXZpZ2F0aW9uRXh0cmFzYC5cbiAgICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkV4dHJhcyNza2lwTG9jYXRpb25DaGFuZ2UgTmF2aWdhdGlvbkV4dHJhcyNza2lwTG9jYXRpb25DaGFuZ2V9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHNraXBMb2NhdGlvbkNoYW5nZSE6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZSBgTmF2aWdhdGlvbkV4dHJhc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25FeHRyYXMjcmVwbGFjZVVybCBOYXZpZ2F0aW9uRXh0cmFzI3JlcGxhY2VVcmx9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHJlcGxhY2VVcmwhOiBib29sZWFuO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGUgYE5hdmlnYXRpb25FeHRyYXNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uRXh0cmFzI3N0YXRlIE5hdmlnYXRpb25FeHRyYXMjc3RhdGV9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgQElucHV0KCkgc3RhdGU/OiB7W2s6IHN0cmluZ106IGFueX07XG4gIHByaXZhdGUgY29tbWFuZHM6IGFueVtdID0gW107XG4gIHByaXZhdGUgcHJlc2VydmUhOiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZXI6IFJvdXRlciwgcHJpdmF0ZSByb3V0ZTogQWN0aXZhdGVkUm91dGUsXG4gICAgICBAQXR0cmlidXRlKCd0YWJpbmRleCcpIHRhYkluZGV4OiBzdHJpbmcsIHJlbmRlcmVyOiBSZW5kZXJlcjIsIGVsOiBFbGVtZW50UmVmKSB7XG4gICAgaWYgKHRhYkluZGV4ID09IG51bGwpIHtcbiAgICAgIHJlbmRlcmVyLnNldEF0dHJpYnV0ZShlbC5uYXRpdmVFbGVtZW50LCAndGFiaW5kZXgnLCAnMCcpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb21tYW5kcyB0byBwYXNzIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0uXG4gICAqICAgLSAqKmFycmF5Kio6IGNvbW1hbmRzIHRvIHBhc3MgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfS5cbiAgICogICAtICoqc3RyaW5nKio6IHNob3J0aGFuZCBmb3IgYXJyYXkgb2YgY29tbWFuZHMgd2l0aCBqdXN0IHRoZSBzdHJpbmcsIGkuZS4gYFsnL3JvdXRlJ11gXG4gICAqICAgLSAqKm51bGx8dW5kZWZpbmVkKio6IHNob3J0aGFuZCBmb3IgYW4gZW1wdHkgYXJyYXkgb2YgY29tbWFuZHMsIGkuZS4gYFtdYFxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpXG4gIHNldCByb3V0ZXJMaW5rKGNvbW1hbmRzOiBhbnlbXXxzdHJpbmd8bnVsbHx1bmRlZmluZWQpIHtcbiAgICBpZiAoY29tbWFuZHMgIT0gbnVsbCkge1xuICAgICAgdGhpcy5jb21tYW5kcyA9IEFycmF5LmlzQXJyYXkoY29tbWFuZHMpID8gY29tbWFuZHMgOiBbY29tbWFuZHNdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbW1hbmRzID0gW107XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBkZXByZWNhdGVkIEFzIG9mIEFuZ3VsYXIgdjQuMCB1c2UgYHF1ZXJ5UGFyYW1zSGFuZGxpbmdgIGluc3RlYWQuXG4gICAqL1xuICBASW5wdXQoKVxuICBzZXQgcHJlc2VydmVRdWVyeVBhcmFtcyh2YWx1ZTogYm9vbGVhbikge1xuICAgIGlmIChpc0Rldk1vZGUoKSAmJiA8YW55PmNvbnNvbGUgJiYgPGFueT5jb25zb2xlLndhcm4pIHtcbiAgICAgIGNvbnNvbGUud2FybigncHJlc2VydmVRdWVyeVBhcmFtcyBpcyBkZXByZWNhdGVkISwgdXNlIHF1ZXJ5UGFyYW1zSGFuZGxpbmcgaW5zdGVhZC4nKTtcbiAgICB9XG4gICAgdGhpcy5wcmVzZXJ2ZSA9IHZhbHVlO1xuICB9XG5cbiAgQEhvc3RMaXN0ZW5lcignY2xpY2snKVxuICBvbkNsaWNrKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGV4dHJhcyA9IHtcbiAgICAgIHNraXBMb2NhdGlvbkNoYW5nZTogYXR0ckJvb2xWYWx1ZSh0aGlzLnNraXBMb2NhdGlvbkNoYW5nZSksXG4gICAgICByZXBsYWNlVXJsOiBhdHRyQm9vbFZhbHVlKHRoaXMucmVwbGFjZVVybCksXG4gICAgICBzdGF0ZTogdGhpcy5zdGF0ZSxcbiAgICB9O1xuICAgIHRoaXMucm91dGVyLm5hdmlnYXRlQnlVcmwodGhpcy51cmxUcmVlLCBleHRyYXMpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZ2V0IHVybFRyZWUoKTogVXJsVHJlZSB7XG4gICAgcmV0dXJuIHRoaXMucm91dGVyLmNyZWF0ZVVybFRyZWUodGhpcy5jb21tYW5kcywge1xuICAgICAgcmVsYXRpdmVUbzogdGhpcy5yb3V0ZSxcbiAgICAgIHF1ZXJ5UGFyYW1zOiB0aGlzLnF1ZXJ5UGFyYW1zLFxuICAgICAgZnJhZ21lbnQ6IHRoaXMuZnJhZ21lbnQsXG4gICAgICBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zOiBhdHRyQm9vbFZhbHVlKHRoaXMucHJlc2VydmUpLFxuICAgICAgcXVlcnlQYXJhbXNIYW5kbGluZzogdGhpcy5xdWVyeVBhcmFtc0hhbmRsaW5nLFxuICAgICAgcHJlc2VydmVGcmFnbWVudDogYXR0ckJvb2xWYWx1ZSh0aGlzLnByZXNlcnZlRnJhZ21lbnQpLFxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogTGV0cyB5b3UgbGluayB0byBzcGVjaWZpYyByb3V0ZXMgaW4geW91ciBhcHAuXG4gKlxuICogU2VlIGBSb3V0ZXJMaW5rYCBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ARGlyZWN0aXZlKHtzZWxlY3RvcjogJ2Fbcm91dGVyTGlua10sYXJlYVtyb3V0ZXJMaW5rXSd9KVxuZXhwb3J0IGNsYXNzIFJvdXRlckxpbmtXaXRoSHJlZiBpbXBsZW1lbnRzIE9uQ2hhbmdlcywgT25EZXN0cm95IHtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBIb3N0QmluZGluZygnYXR0ci50YXJnZXQnKSBASW5wdXQoKSB0YXJnZXQhOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZSBgTmF2aWdhdGlvbkV4dHJhc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25FeHRyYXMjcXVlcnlQYXJhbXMgTmF2aWdhdGlvbkV4dHJhcyNxdWVyeVBhcmFtc31cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgcXVlcnlQYXJhbXMhOiB7W2s6IHN0cmluZ106IGFueX07XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZSBgTmF2aWdhdGlvbkV4dHJhc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25FeHRyYXMjZnJhZ21lbnQgTmF2aWdhdGlvbkV4dHJhcyNmcmFnbWVudH1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgZnJhZ21lbnQhOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZSBgTmF2aWdhdGlvbkV4dHJhc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25FeHRyYXMjcXVlcnlQYXJhbXNIYW5kbGluZyBOYXZpZ2F0aW9uRXh0cmFzI3F1ZXJ5UGFyYW1zSGFuZGxpbmd9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHF1ZXJ5UGFyYW1zSGFuZGxpbmchOiBRdWVyeVBhcmFtc0hhbmRsaW5nO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGUgYE5hdmlnYXRpb25FeHRyYXNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uRXh0cmFzI3ByZXNlcnZlRnJhZ21lbnQgTmF2aWdhdGlvbkV4dHJhcyNwcmVzZXJ2ZUZyYWdtZW50fVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASW5wdXQoKSBwcmVzZXJ2ZUZyYWdtZW50ITogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlIGBOYXZpZ2F0aW9uRXh0cmFzYC5cbiAgICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkV4dHJhcyNza2lwTG9jYXRpb25DaGFuZ2UgTmF2aWdhdGlvbkV4dHJhcyNza2lwTG9jYXRpb25DaGFuZ2V9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHNraXBMb2NhdGlvbkNoYW5nZSE6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZSBgTmF2aWdhdGlvbkV4dHJhc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25FeHRyYXMjcmVwbGFjZVVybCBOYXZpZ2F0aW9uRXh0cmFzI3JlcGxhY2VVcmx9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHJlcGxhY2VVcmwhOiBib29sZWFuO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGUgYE5hdmlnYXRpb25FeHRyYXNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uRXh0cmFzI3N0YXRlIE5hdmlnYXRpb25FeHRyYXMjc3RhdGV9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgQElucHV0KCkgc3RhdGU/OiB7W2s6IHN0cmluZ106IGFueX07XG4gIHByaXZhdGUgY29tbWFuZHM6IGFueVtdID0gW107XG4gIHByaXZhdGUgc3Vic2NyaXB0aW9uOiBTdWJzY3JpcHRpb247XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIHByZXNlcnZlITogYm9vbGVhbjtcblxuICAvLyB0aGUgdXJsIGRpc3BsYXllZCBvbiB0aGUgYW5jaG9yIGVsZW1lbnQuXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASG9zdEJpbmRpbmcoKSBocmVmITogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZXI6IFJvdXRlciwgcHJpdmF0ZSByb3V0ZTogQWN0aXZhdGVkUm91dGUsXG4gICAgICBwcml2YXRlIGxvY2F0aW9uU3RyYXRlZ3k6IExvY2F0aW9uU3RyYXRlZ3kpIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbiA9IHJvdXRlci5ldmVudHMuc3Vic2NyaWJlKChzOiBFdmVudCkgPT4ge1xuICAgICAgaWYgKHMgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICAgIHRoaXMudXBkYXRlVGFyZ2V0VXJsQW5kSHJlZigpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbW1hbmRzIHRvIHBhc3MgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfS5cbiAgICogICAtICoqYXJyYXkqKjogY29tbWFuZHMgdG8gcGFzcyB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9LlxuICAgKiAgIC0gKipzdHJpbmcqKjogc2hvcnRoYW5kIGZvciBhcnJheSBvZiBjb21tYW5kcyB3aXRoIGp1c3QgdGhlIHN0cmluZywgaS5lLiBgWycvcm91dGUnXWBcbiAgICogICAtICoqbnVsbHx1bmRlZmluZWQqKjogc2hvcnRoYW5kIGZvciBhbiBlbXB0eSBhcnJheSBvZiBjb21tYW5kcywgaS5lLiBgW11gXG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgQElucHV0KClcbiAgc2V0IHJvdXRlckxpbmsoY29tbWFuZHM6IGFueVtdfHN0cmluZ3xudWxsfHVuZGVmaW5lZCkge1xuICAgIGlmIChjb21tYW5kcyAhPSBudWxsKSB7XG4gICAgICB0aGlzLmNvbW1hbmRzID0gQXJyYXkuaXNBcnJheShjb21tYW5kcykgPyBjb21tYW5kcyA6IFtjb21tYW5kc107XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29tbWFuZHMgPSBbXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQGRlcHJlY2F0ZWQgQXMgb2YgQW5ndWxhciB2NC4wIHVzZSBgcXVlcnlQYXJhbXNIYW5kbGluZ2AgaW5zdGVhZC5cbiAgICovXG4gIEBJbnB1dCgpXG4gIHNldCBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zKHZhbHVlOiBib29sZWFuKSB7XG4gICAgaWYgKGlzRGV2TW9kZSgpICYmIDxhbnk+Y29uc29sZSAmJiA8YW55PmNvbnNvbGUud2Fybikge1xuICAgICAgY29uc29sZS53YXJuKCdwcmVzZXJ2ZVF1ZXJ5UGFyYW1zIGlzIGRlcHJlY2F0ZWQsIHVzZSBxdWVyeVBhcmFtc0hhbmRsaW5nIGluc3RlYWQuJyk7XG4gICAgfVxuICAgIHRoaXMucHJlc2VydmUgPSB2YWx1ZTtcbiAgfVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IHt9KTogYW55IHtcbiAgICB0aGlzLnVwZGF0ZVRhcmdldFVybEFuZEhyZWYoKTtcbiAgfVxuICBuZ09uRGVzdHJveSgpOiBhbnkge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBASG9zdExpc3RlbmVyKCdjbGljaycsIFsnJGV2ZW50LmJ1dHRvbicsICckZXZlbnQuY3RybEtleScsICckZXZlbnQubWV0YUtleScsICckZXZlbnQuc2hpZnRLZXknXSlcbiAgb25DbGljayhidXR0b246IG51bWJlciwgY3RybEtleTogYm9vbGVhbiwgbWV0YUtleTogYm9vbGVhbiwgc2hpZnRLZXk6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBpZiAoYnV0dG9uICE9PSAwIHx8IGN0cmxLZXkgfHwgbWV0YUtleSB8fCBzaGlmdEtleSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB0aGlzLnRhcmdldCA9PT0gJ3N0cmluZycgJiYgdGhpcy50YXJnZXQgIT0gJ19zZWxmJykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgY29uc3QgZXh0cmFzID0ge1xuICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiBhdHRyQm9vbFZhbHVlKHRoaXMuc2tpcExvY2F0aW9uQ2hhbmdlKSxcbiAgICAgIHJlcGxhY2VVcmw6IGF0dHJCb29sVmFsdWUodGhpcy5yZXBsYWNlVXJsKSxcbiAgICAgIHN0YXRlOiB0aGlzLnN0YXRlXG4gICAgfTtcbiAgICB0aGlzLnJvdXRlci5uYXZpZ2F0ZUJ5VXJsKHRoaXMudXJsVHJlZSwgZXh0cmFzKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZVRhcmdldFVybEFuZEhyZWYoKTogdm9pZCB7XG4gICAgdGhpcy5ocmVmID0gdGhpcy5sb2NhdGlvblN0cmF0ZWd5LnByZXBhcmVFeHRlcm5hbFVybCh0aGlzLnJvdXRlci5zZXJpYWxpemVVcmwodGhpcy51cmxUcmVlKSk7XG4gIH1cblxuICBnZXQgdXJsVHJlZSgpOiBVcmxUcmVlIHtcbiAgICByZXR1cm4gdGhpcy5yb3V0ZXIuY3JlYXRlVXJsVHJlZSh0aGlzLmNvbW1hbmRzLCB7XG4gICAgICByZWxhdGl2ZVRvOiB0aGlzLnJvdXRlLFxuICAgICAgcXVlcnlQYXJhbXM6IHRoaXMucXVlcnlQYXJhbXMsXG4gICAgICBmcmFnbWVudDogdGhpcy5mcmFnbWVudCxcbiAgICAgIHByZXNlcnZlUXVlcnlQYXJhbXM6IGF0dHJCb29sVmFsdWUodGhpcy5wcmVzZXJ2ZSksXG4gICAgICBxdWVyeVBhcmFtc0hhbmRsaW5nOiB0aGlzLnF1ZXJ5UGFyYW1zSGFuZGxpbmcsXG4gICAgICBwcmVzZXJ2ZUZyYWdtZW50OiBhdHRyQm9vbFZhbHVlKHRoaXMucHJlc2VydmVGcmFnbWVudCksXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYXR0ckJvb2xWYWx1ZShzOiBhbnkpOiBib29sZWFuIHtcbiAgcmV0dXJuIHMgPT09ICcnIHx8ICEhcztcbn1cbiJdfQ==