/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { LocationStrategy } from '@angular/common';
import { Attribute, Directive, ElementRef, HostBinding, HostListener, inject, Input, Renderer2, ɵcoerceToBoolean as coerceToBoolean } from '@angular/core';
import { Subject } from 'rxjs';
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
 * Multiple static segments can be merged into one term and combined with dynamic segments.
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
 * See {@link UrlCreationOptions.queryParamsHandling UrlCreationOptions#queryParamsHandling}.
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
    constructor(router, route, tabIndexAttribute, renderer, el, locationStrategy) {
        this.router = router;
        this.route = route;
        this.tabIndexAttribute = tabIndexAttribute;
        this.renderer = renderer;
        this.el = el;
        this.locationStrategy = locationStrategy;
        this._preserveFragment = false;
        this._skipLocationChange = false;
        this._replaceUrl = false;
        /**
         * Base class property that represents an `href` attribute binding on
         * an `<a>` element. The property is overridden by the `RouterLinkWithHref`
         * class using a @HostBinding.
         */
        this.href = null;
        this.commands = null;
        /** @internal */
        this.onChanges = new Subject();
        const tagName = el.nativeElement.tagName;
        this.isAnchorElement = tagName === 'A' || tagName === 'AREA';
        if (this.isAnchorElement) {
            this.subscription = router.events.subscribe((s) => {
                if (s instanceof NavigationEnd) {
                    this.updateTargetUrlAndHref();
                }
            });
        }
        else {
            this.setTabIndexIfNotOnNativeEl('0');
        }
    }
    /**
     * Passed to {@link Router#createUrlTree Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * @see {@link UrlCreationOptions#preserveFragment UrlCreationOptions#preserveFragment}
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    set preserveFragment(preserveFragment) {
        this._preserveFragment = coerceToBoolean(preserveFragment);
    }
    get preserveFragment() {
        return this._preserveFragment;
    }
    /**
     * Passed to {@link Router#navigateByUrl Router#navigateByUrl} as part of the
     * `NavigationBehaviorOptions`.
     * @see {@link NavigationBehaviorOptions#skipLocationChange NavigationBehaviorOptions#skipLocationChange}
     * @see {@link Router#navigateByUrl Router#navigateByUrl}
     */
    set skipLocationChange(skipLocationChange) {
        this._skipLocationChange = coerceToBoolean(skipLocationChange);
    }
    get skipLocationChange() {
        return this._skipLocationChange;
    }
    /**
     * Passed to {@link Router#navigateByUrl Router#navigateByUrl} as part of the
     * `NavigationBehaviorOptions`.
     * @see {@link NavigationBehaviorOptions#replaceUrl NavigationBehaviorOptions#replaceUrl}
     * @see {@link Router#navigateByUrl Router#navigateByUrl}
     */
    set replaceUrl(replaceUrl) {
        this._replaceUrl = coerceToBoolean(replaceUrl);
    }
    get replaceUrl() {
        return this._replaceUrl;
    }
    /**
     * Modifies the tab index if there was not a tabindex attribute on the element during
     * instantiation.
     */
    setTabIndexIfNotOnNativeEl(newTabIndex) {
        if (this.tabIndexAttribute != null /* both `null` and `undefined` */ || this.isAnchorElement) {
            return;
        }
        const renderer = this.renderer;
        const nativeElement = this.el.nativeElement;
        if (newTabIndex !== null) {
            renderer.setAttribute(nativeElement, 'tabindex', newTabIndex);
        }
        else {
            renderer.removeAttribute(nativeElement, 'tabindex');
        }
    }
    /** @nodoc */
    ngOnChanges(changes) {
        if (this.isAnchorElement) {
            this.updateTargetUrlAndHref();
        }
        // This is subscribed to by `RouterLinkActive` so that it knows to update when there are changes
        // to the RouterLinks it's tracking.
        this.onChanges.next(this);
    }
    /**
     * Commands to pass to {@link Router#createUrlTree Router#createUrlTree}.
     *   - **array**: commands to pass to {@link Router#createUrlTree Router#createUrlTree}.
     *   - **string**: shorthand for array of commands with just the string, i.e. `['/route']`
     *   - **null|undefined**: effectively disables the `routerLink`
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    set routerLink(commands) {
        if (commands != null) {
            this.commands = Array.isArray(commands) ? commands : [commands];
            this.setTabIndexIfNotOnNativeEl('0');
        }
        else {
            this.commands = null;
            this.setTabIndexIfNotOnNativeEl(null);
        }
    }
    /** @nodoc */
    onClick(button, ctrlKey, shiftKey, altKey, metaKey) {
        if (this.urlTree === null) {
            return true;
        }
        if (this.isAnchorElement) {
            if (button !== 0 || ctrlKey || shiftKey || altKey || metaKey) {
                return true;
            }
            if (typeof this.target === 'string' && this.target != '_self') {
                return true;
            }
        }
        const extras = {
            skipLocationChange: this.skipLocationChange,
            replaceUrl: this.replaceUrl,
            state: this.state,
        };
        this.router.navigateByUrl(this.urlTree, extras);
        // Return `false` for `<a>` elements to prevent default action
        // and cancel the native behavior, since the navigation is handled
        // by the Router.
        return !this.isAnchorElement;
    }
    /** @nodoc */
    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }
    updateTargetUrlAndHref() {
        this.href = this.urlTree !== null && this.locationStrategy ?
            this.locationStrategy?.prepareExternalUrl(this.router.serializeUrl(this.urlTree)) :
            null;
    }
    get urlTree() {
        if (this.commands === null) {
            return null;
        }
        return this.router.createUrlTree(this.commands, {
            // If the `relativeTo` input is not defined, we want to use `this.route` by default.
            // Otherwise, we should use the value provided by the user in the input.
            relativeTo: this.relativeTo !== undefined ? this.relativeTo : this.route,
            queryParams: this.queryParams,
            fragment: this.fragment,
            queryParamsHandling: this.queryParamsHandling,
            preserveFragment: this.preserveFragment,
        });
    }
}
RouterLink.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.0.0-next.4+sha-c39a3a1", ngImport: i0, type: RouterLink, deps: [{ token: i1.Router }, { token: i2.ActivatedRoute }, { token: 'tabindex', attribute: true }, { token: i0.Renderer2 }, { token: i0.ElementRef }, { token: i3.LocationStrategy }], target: i0.ɵɵFactoryTarget.Directive });
RouterLink.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "15.0.0-next.4+sha-c39a3a1", type: RouterLink, isStandalone: true, selector: ":not(a):not(area)[routerLink]", inputs: { target: "target", queryParams: "queryParams", fragment: "fragment", queryParamsHandling: "queryParamsHandling", state: "state", relativeTo: "relativeTo", preserveFragment: "preserveFragment", skipLocationChange: "skipLocationChange", replaceUrl: "replaceUrl", routerLink: "routerLink" }, host: { listeners: { "click": "onClick($event.button,$event.ctrlKey,$event.shiftKey,$event.altKey,$event.metaKey)" }, properties: { "attr.target": "this.target" } }, usesOnChanges: true, ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.0.0-next.4+sha-c39a3a1", ngImport: i0, type: RouterLink, decorators: [{
            type: Directive,
            args: [{
                    selector: ':not(a):not(area)[routerLink]',
                    standalone: true,
                }]
        }], ctorParameters: function () { return [{ type: i1.Router }, { type: i2.ActivatedRoute }, { type: undefined, decorators: [{
                    type: Attribute,
                    args: ['tabindex']
                }] }, { type: i0.Renderer2 }, { type: i0.ElementRef }, { type: i3.LocationStrategy }]; }, propDecorators: { target: [{
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
            }], state: [{
                type: Input
            }], relativeTo: [{
                type: Input
            }], preserveFragment: [{
                type: Input
            }], skipLocationChange: [{
                type: Input
            }], replaceUrl: [{
                type: Input
            }], routerLink: [{
                type: Input
            }], onClick: [{
                type: HostListener,
                args: ['click',
                    ['$event.button', '$event.ctrlKey', '$event.shiftKey', '$event.altKey', '$event.metaKey']]
            }] } });
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
export class RouterLinkWithHref extends RouterLink {
    // For backwards compatibility, constructor arguments retained an old shape.
    constructor(router, route, locationStrategy) {
        super(router, route, undefined /* tabIndexAttribute */, inject(Renderer2), inject(ElementRef), locationStrategy);
        /**
         * The url displayed on the anchor element.
         * @HostBinding('attr.href') is used rather than @HostBinding() because
         * it removes the href attribute when it becomes `null`.
         *
         * Note: this host binding is retained in the `RouterLinkWithHref` to
         * make sure the right security context is selected (which also takes
         * into account an element name from the selector).
         */
        this.href = null;
    }
}
RouterLinkWithHref.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.0.0-next.4+sha-c39a3a1", ngImport: i0, type: RouterLinkWithHref, deps: [{ token: i1.Router }, { token: i2.ActivatedRoute }, { token: i3.LocationStrategy }], target: i0.ɵɵFactoryTarget.Directive });
RouterLinkWithHref.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "15.0.0-next.4+sha-c39a3a1", type: RouterLinkWithHref, isStandalone: true, selector: "a[routerLink],area[routerLink]", host: { properties: { "attr.href": "this.href" } }, usesInheritance: true, ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.0.0-next.4+sha-c39a3a1", ngImport: i0, type: RouterLinkWithHref, decorators: [{
            type: Directive,
            args: [{
                    selector: 'a[routerLink],area[routerLink]',
                    standalone: true,
                }]
        }], ctorParameters: function () { return [{ type: i1.Router }, { type: i2.ActivatedRoute }, { type: i3.LocationStrategy }]; }, propDecorators: { href: [{
                type: HostBinding,
                args: ['attr.href']
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDakQsT0FBTyxFQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBd0IsU0FBUyxFQUFpQixnQkFBZ0IsSUFBSSxlQUFlLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDOUwsT0FBTyxFQUFDLE9BQU8sRUFBZSxNQUFNLE1BQU0sQ0FBQztBQUUzQyxPQUFPLEVBQVEsYUFBYSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBRS9DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDakMsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLGlCQUFpQixDQUFDOzs7OztBQUsvQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBZ0dHO0FBS0gsTUFBTSxPQUFPLFVBQVU7SUFtRXJCLFlBQ1ksTUFBYyxFQUFVLEtBQXFCLEVBQ2IsaUJBQXdDLEVBQy9ELFFBQW1CLEVBQW1CLEVBQWMsRUFDN0QsZ0JBQW1DO1FBSG5DLFdBQU0sR0FBTixNQUFNLENBQVE7UUFBVSxVQUFLLEdBQUwsS0FBSyxDQUFnQjtRQUNiLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBdUI7UUFDL0QsYUFBUSxHQUFSLFFBQVEsQ0FBVztRQUFtQixPQUFFLEdBQUYsRUFBRSxDQUFZO1FBQzdELHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUF0RXZDLHNC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RyxtQkFBbUI7c0JBQTNCLEtBQUs7Z0JBT0csS0FBSztzQkFBYixLQUFLO2dCQVVHLFVBQVU7c0JBQWxCLEtBQUs7Z0JBc0NGLGdCQUFnQjtzQkFEbkIsS0FBSztnQkFnQkYsa0JBQWtCO3NCQURyQixLQUFLO2dCQWdCRixVQUFVO3NCQURiLEtBQUs7Z0JBNENGLFVBQVU7c0JBRGIsS0FBSztnQkFlTixPQUFPO3NCQUhOLFlBQVk7dUJBQ1QsT0FBTztvQkFDUCxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLENBQUM7O0FBeUQvRjs7Ozs7Ozs7OztHQVVHO0FBS0gsTUFBTSxPQUFPLGtCQUFtQixTQUFRLFVBQVU7SUFZaEQsNEVBQTRFO0lBQzVFLFlBQVksTUFBYyxFQUFFLEtBQXFCLEVBQUUsZ0JBQWtDO1FBQ25GLEtBQUssQ0FDRCxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyx1QkFBdUIsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUN2RixnQkFBZ0IsQ0FBQyxDQUFDO1FBZnhCOzs7Ozs7OztXQVFHO1FBQ2dDLFNBQUksR0FBZ0IsSUFBSSxDQUFDO0lBTzVELENBQUM7OzBIQWpCVSxrQkFBa0I7OEdBQWxCLGtCQUFrQjtzR0FBbEIsa0JBQWtCO2tCQUo5QixTQUFTO21CQUFDO29CQUNULFFBQVEsRUFBRSxnQ0FBZ0M7b0JBQzFDLFVBQVUsRUFBRSxJQUFJO2lCQUNqQjt5SkFXb0MsSUFBSTtzQkFBdEMsV0FBVzt1QkFBQyxXQUFXIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb25TdHJhdGVneX0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7QXR0cmlidXRlLCBEaXJlY3RpdmUsIEVsZW1lbnRSZWYsIEhvc3RCaW5kaW5nLCBIb3N0TGlzdGVuZXIsIGluamVjdCwgSW5wdXQsIE9uQ2hhbmdlcywgT25EZXN0cm95LCBSZW5kZXJlcjIsIFNpbXBsZUNoYW5nZXMsIMm1Y29lcmNlVG9Cb29sZWFuIGFzIGNvZXJjZVRvQm9vbGVhbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge1N1YmplY3QsIFN1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7RXZlbnQsIE5hdmlnYXRpb25FbmR9IGZyb20gJy4uL2V2ZW50cyc7XG5pbXBvcnQge1F1ZXJ5UGFyYW1zSGFuZGxpbmd9IGZyb20gJy4uL21vZGVscyc7XG5pbXBvcnQge1JvdXRlcn0gZnJvbSAnLi4vcm91dGVyJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGV9IGZyb20gJy4uL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BhcmFtc30gZnJvbSAnLi4vc2hhcmVkJztcbmltcG9ydCB7VXJsVHJlZX0gZnJvbSAnLi4vdXJsX3RyZWUnO1xuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogV2hlbiBhcHBsaWVkIHRvIGFuIGVsZW1lbnQgaW4gYSB0ZW1wbGF0ZSwgbWFrZXMgdGhhdCBlbGVtZW50IGEgbGlua1xuICogdGhhdCBpbml0aWF0ZXMgbmF2aWdhdGlvbiB0byBhIHJvdXRlLiBOYXZpZ2F0aW9uIG9wZW5zIG9uZSBvciBtb3JlIHJvdXRlZCBjb21wb25lbnRzXG4gKiBpbiBvbmUgb3IgbW9yZSBgPHJvdXRlci1vdXRsZXQ+YCBsb2NhdGlvbnMgb24gdGhlIHBhZ2UuXG4gKlxuICogR2l2ZW4gYSByb3V0ZSBjb25maWd1cmF0aW9uIGBbeyBwYXRoOiAndXNlci86bmFtZScsIGNvbXBvbmVudDogVXNlckNtcCB9XWAsXG4gKiB0aGUgZm9sbG93aW5nIGNyZWF0ZXMgYSBzdGF0aWMgbGluayB0byB0aGUgcm91dGU6XG4gKiBgPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiPmxpbmsgdG8gdXNlciBjb21wb25lbnQ8L2E+YFxuICpcbiAqIFlvdSBjYW4gdXNlIGR5bmFtaWMgdmFsdWVzIHRvIGdlbmVyYXRlIHRoZSBsaW5rLlxuICogRm9yIGEgZHluYW1pYyBsaW5rLCBwYXNzIGFuIGFycmF5IG9mIHBhdGggc2VnbWVudHMsXG4gKiBmb2xsb3dlZCBieSB0aGUgcGFyYW1zIGZvciBlYWNoIHNlZ21lbnQuXG4gKiBGb3IgZXhhbXBsZSwgYFsnL3RlYW0nLCB0ZWFtSWQsICd1c2VyJywgdXNlck5hbWUsIHtkZXRhaWxzOiB0cnVlfV1gXG4gKiBnZW5lcmF0ZXMgYSBsaW5rIHRvIGAvdGVhbS8xMS91c2VyL2JvYjtkZXRhaWxzPXRydWVgLlxuICpcbiAqIE11bHRpcGxlIHN0YXRpYyBzZWdtZW50cyBjYW4gYmUgbWVyZ2VkIGludG8gb25lIHRlcm0gYW5kIGNvbWJpbmVkIHdpdGggZHluYW1pYyBzZWdtZW50cy5cbiAqIEZvciBleGFtcGxlLCBgWycvdGVhbS8xMS91c2VyJywgdXNlck5hbWUsIHtkZXRhaWxzOiB0cnVlfV1gXG4gKlxuICogVGhlIGlucHV0IHRoYXQgeW91IHByb3ZpZGUgdG8gdGhlIGxpbmsgaXMgdHJlYXRlZCBhcyBhIGRlbHRhIHRvIHRoZSBjdXJyZW50IFVSTC5cbiAqIEZvciBpbnN0YW5jZSwgc3VwcG9zZSB0aGUgY3VycmVudCBVUkwgaXMgYC91c2VyLyhib3gvL2F1eDp0ZWFtKWAuXG4gKiBUaGUgbGluayBgPGEgW3JvdXRlckxpbmtdPVwiWycvdXNlci9qaW0nXVwiPkppbTwvYT5gIGNyZWF0ZXMgdGhlIFVSTFxuICogYC91c2VyLyhqaW0vL2F1eDp0ZWFtKWAuXG4gKiBTZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIGNyZWF0ZVVybFRyZWV9IGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogWW91IGNhbiB1c2UgYWJzb2x1dGUgb3IgcmVsYXRpdmUgcGF0aHMgaW4gYSBsaW5rLCBzZXQgcXVlcnkgcGFyYW1ldGVycyxcbiAqIGNvbnRyb2wgaG93IHBhcmFtZXRlcnMgYXJlIGhhbmRsZWQsIGFuZCBrZWVwIGEgaGlzdG9yeSBvZiBuYXZpZ2F0aW9uIHN0YXRlcy5cbiAqXG4gKiAjIyMgUmVsYXRpdmUgbGluayBwYXRoc1xuICpcbiAqIFRoZSBmaXJzdCBzZWdtZW50IG5hbWUgY2FuIGJlIHByZXBlbmRlZCB3aXRoIGAvYCwgYC4vYCwgb3IgYC4uL2AuXG4gKiAqIElmIHRoZSBmaXJzdCBzZWdtZW50IGJlZ2lucyB3aXRoIGAvYCwgdGhlIHJvdXRlciBsb29rcyB1cCB0aGUgcm91dGUgZnJvbSB0aGUgcm9vdCBvZiB0aGVcbiAqICAgYXBwLlxuICogKiBJZiB0aGUgZmlyc3Qgc2VnbWVudCBiZWdpbnMgd2l0aCBgLi9gLCBvciBkb2Vzbid0IGJlZ2luIHdpdGggYSBzbGFzaCwgdGhlIHJvdXRlclxuICogICBsb29rcyBpbiB0aGUgY2hpbGRyZW4gb2YgdGhlIGN1cnJlbnQgYWN0aXZhdGVkIHJvdXRlLlxuICogKiBJZiB0aGUgZmlyc3Qgc2VnbWVudCBiZWdpbnMgd2l0aCBgLi4vYCwgdGhlIHJvdXRlciBnb2VzIHVwIG9uZSBsZXZlbCBpbiB0aGUgcm91dGUgdHJlZS5cbiAqXG4gKiAjIyMgU2V0dGluZyBhbmQgaGFuZGxpbmcgcXVlcnkgcGFyYW1zIGFuZCBmcmFnbWVudHNcbiAqXG4gKiBUaGUgZm9sbG93aW5nIGxpbmsgYWRkcyBhIHF1ZXJ5IHBhcmFtZXRlciBhbmQgYSBmcmFnbWVudCB0byB0aGUgZ2VuZXJhdGVkIFVSTDpcbiAqXG4gKiBgYGBcbiAqIDxhIFtyb3V0ZXJMaW5rXT1cIlsnL3VzZXIvYm9iJ11cIiBbcXVlcnlQYXJhbXNdPVwie2RlYnVnOiB0cnVlfVwiIGZyYWdtZW50PVwiZWR1Y2F0aW9uXCI+XG4gKiAgIGxpbmsgdG8gdXNlciBjb21wb25lbnRcbiAqIDwvYT5cbiAqIGBgYFxuICogQnkgZGVmYXVsdCwgdGhlIGRpcmVjdGl2ZSBjb25zdHJ1Y3RzIHRoZSBuZXcgVVJMIHVzaW5nIHRoZSBnaXZlbiBxdWVyeSBwYXJhbWV0ZXJzLlxuICogVGhlIGV4YW1wbGUgZ2VuZXJhdGVzIHRoZSBsaW5rOiBgL3VzZXIvYm9iP2RlYnVnPXRydWUjZWR1Y2F0aW9uYC5cbiAqXG4gKiBZb3UgY2FuIGluc3RydWN0IHRoZSBkaXJlY3RpdmUgdG8gaGFuZGxlIHF1ZXJ5IHBhcmFtZXRlcnMgZGlmZmVyZW50bHlcbiAqIGJ5IHNwZWNpZnlpbmcgdGhlIGBxdWVyeVBhcmFtc0hhbmRsaW5nYCBvcHRpb24gaW4gdGhlIGxpbmsuXG4gKiBBbGxvd2VkIHZhbHVlcyBhcmU6XG4gKlxuICogIC0gYCdtZXJnZSdgOiBNZXJnZSB0aGUgZ2l2ZW4gYHF1ZXJ5UGFyYW1zYCBpbnRvIHRoZSBjdXJyZW50IHF1ZXJ5IHBhcmFtcy5cbiAqICAtIGAncHJlc2VydmUnYDogUHJlc2VydmUgdGhlIGN1cnJlbnQgcXVlcnkgcGFyYW1zLlxuICpcbiAqIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogPGEgW3JvdXRlckxpbmtdPVwiWycvdXNlci9ib2InXVwiIFtxdWVyeVBhcmFtc109XCJ7ZGVidWc6IHRydWV9XCIgcXVlcnlQYXJhbXNIYW5kbGluZz1cIm1lcmdlXCI+XG4gKiAgIGxpbmsgdG8gdXNlciBjb21wb25lbnRcbiAqIDwvYT5cbiAqIGBgYFxuICpcbiAqIFNlZSB7QGxpbmsgVXJsQ3JlYXRpb25PcHRpb25zLnF1ZXJ5UGFyYW1zSGFuZGxpbmcgVXJsQ3JlYXRpb25PcHRpb25zI3F1ZXJ5UGFyYW1zSGFuZGxpbmd9LlxuICpcbiAqICMjIyBQcmVzZXJ2aW5nIG5hdmlnYXRpb24gaGlzdG9yeVxuICpcbiAqIFlvdSBjYW4gcHJvdmlkZSBhIGBzdGF0ZWAgdmFsdWUgdG8gYmUgcGVyc2lzdGVkIHRvIHRoZSBicm93c2VyJ3NcbiAqIFtgSGlzdG9yeS5zdGF0ZWAgcHJvcGVydHldKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9IaXN0b3J5I1Byb3BlcnRpZXMpLlxuICogRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2JvYiddXCIgW3N0YXRlXT1cInt0cmFjaW5nSWQ6IDEyM31cIj5cbiAqICAgbGluayB0byB1c2VyIGNvbXBvbmVudFxuICogPC9hPlxuICogYGBgXG4gKlxuICogVXNlIHtAbGluayBSb3V0ZXIuZ2V0Q3VycmVudE5hdmlnYXRpb24oKSBSb3V0ZXIjZ2V0Q3VycmVudE5hdmlnYXRpb259IHRvIHJldHJpZXZlIGEgc2F2ZWRcbiAqIG5hdmlnYXRpb24tc3RhdGUgdmFsdWUuIEZvciBleGFtcGxlLCB0byBjYXB0dXJlIHRoZSBgdHJhY2luZ0lkYCBkdXJpbmcgdGhlIGBOYXZpZ2F0aW9uU3RhcnRgXG4gKiBldmVudDpcbiAqXG4gKiBgYGBcbiAqIC8vIEdldCBOYXZpZ2F0aW9uU3RhcnQgZXZlbnRzXG4gKiByb3V0ZXIuZXZlbnRzLnBpcGUoZmlsdGVyKGUgPT4gZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25TdGFydCkpLnN1YnNjcmliZShlID0+IHtcbiAqICAgY29uc3QgbmF2aWdhdGlvbiA9IHJvdXRlci5nZXRDdXJyZW50TmF2aWdhdGlvbigpO1xuICogICB0cmFjaW5nU2VydmljZS50cmFjZSh7aWQ6IG5hdmlnYXRpb24uZXh0cmFzLnN0YXRlLnRyYWNpbmdJZH0pO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ARGlyZWN0aXZlKHtcbiAgc2VsZWN0b3I6ICc6bm90KGEpOm5vdChhcmVhKVtyb3V0ZXJMaW5rXScsXG4gIHN0YW5kYWxvbmU6IHRydWUsXG59KVxuZXhwb3J0IGNsYXNzIFJvdXRlckxpbmsgaW1wbGVtZW50cyBPbkNoYW5nZXMsIE9uRGVzdHJveSB7XG4gIHByaXZhdGUgX3ByZXNlcnZlRnJhZ21lbnQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBfc2tpcExvY2F0aW9uQ2hhbmdlID0gZmFsc2U7XG4gIHByaXZhdGUgX3JlcGxhY2VVcmwgPSBmYWxzZTtcblxuICAvKipcbiAgICogQmFzZSBjbGFzcyBwcm9wZXJ0eSB0aGF0IHJlcHJlc2VudHMgYW4gYGhyZWZgIGF0dHJpYnV0ZSBiaW5kaW5nIG9uXG4gICAqIGFuIGA8YT5gIGVsZW1lbnQuIFRoZSBwcm9wZXJ0eSBpcyBvdmVycmlkZGVuIGJ5IHRoZSBgUm91dGVyTGlua1dpdGhIcmVmYFxuICAgKiBjbGFzcyB1c2luZyBhIEBIb3N0QmluZGluZy5cbiAgICovXG4gIGhyZWY6IHN0cmluZ3xudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogUmVwcmVzZW50cyB0aGUgYHRhcmdldGAgYXR0cmlidXRlIG9uIGEgaG9zdCBlbGVtZW50LlxuICAgKiBUaGlzIGlzIG9ubHkgdXNlZCB3aGVuIHRoZSBob3N0IGVsZW1lbnQgaXMgYW4gYDxhPmAgdGFnLlxuICAgKi9cbiAgQEhvc3RCaW5kaW5nKCdhdHRyLnRhcmdldCcpIEBJbnB1dCgpIHRhcmdldD86IHN0cmluZztcblxuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGVcbiAgICogYFVybENyZWF0aW9uT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNxdWVyeVBhcmFtcyBVcmxDcmVhdGlvbk9wdGlvbnMjcXVlcnlQYXJhbXN9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgQElucHV0KCkgcXVlcnlQYXJhbXM/OiBQYXJhbXN8bnVsbDtcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjZnJhZ21lbnQgVXJsQ3JlYXRpb25PcHRpb25zI2ZyYWdtZW50fVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpIGZyYWdtZW50Pzogc3RyaW5nO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGVcbiAgICogYFVybENyZWF0aW9uT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNxdWVyeVBhcmFtc0hhbmRsaW5nIFVybENyZWF0aW9uT3B0aW9ucyNxdWVyeVBhcmFtc0hhbmRsaW5nfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpIHF1ZXJ5UGFyYW1zSGFuZGxpbmc/OiBRdWVyeVBhcmFtc0hhbmRsaW5nfG51bGw7XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjc3RhdGUgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyNzdGF0ZX1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI25hdmlnYXRlQnlVcmwgUm91dGVyI25hdmlnYXRlQnlVcmx9XG4gICAqL1xuICBASW5wdXQoKSBzdGF0ZT86IHtbazogc3RyaW5nXTogYW55fTtcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiBTcGVjaWZ5IGEgdmFsdWUgaGVyZSB3aGVuIHlvdSBkbyBub3Qgd2FudCB0byB1c2UgdGhlIGRlZmF1bHQgdmFsdWVcbiAgICogZm9yIGByb3V0ZXJMaW5rYCwgd2hpY2ggaXMgdGhlIGN1cnJlbnQgYWN0aXZhdGVkIHJvdXRlLlxuICAgKiBOb3RlIHRoYXQgYSB2YWx1ZSBvZiBgdW5kZWZpbmVkYCBoZXJlIHdpbGwgdXNlIHRoZSBgcm91dGVyTGlua2AgZGVmYXVsdC5cbiAgICogQHNlZSB7QGxpbmsgVXJsQ3JlYXRpb25PcHRpb25zI3JlbGF0aXZlVG8gVXJsQ3JlYXRpb25PcHRpb25zI3JlbGF0aXZlVG99XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgQElucHV0KCkgcmVsYXRpdmVUbz86IEFjdGl2YXRlZFJvdXRlfG51bGw7XG5cbiAgcHJpdmF0ZSBjb21tYW5kczogYW55W118bnVsbCA9IG51bGw7XG5cbiAgLyoqIFdoZXRoZXIgYSBob3N0IGVsZW1lbnQgaXMgYW4gYDxhPmAgdGFnLiAqL1xuICBwcml2YXRlIGlzQW5jaG9yRWxlbWVudDogYm9vbGVhbjtcblxuICBwcml2YXRlIHN1YnNjcmlwdGlvbj86IFN1YnNjcmlwdGlvbjtcblxuICAvKiogQGludGVybmFsICovXG4gIG9uQ2hhbmdlcyA9IG5ldyBTdWJqZWN0PFJvdXRlckxpbms+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLCBwcml2YXRlIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSxcbiAgICAgIEBBdHRyaWJ1dGUoJ3RhYmluZGV4JykgcHJpdmF0ZSByZWFkb25seSB0YWJJbmRleEF0dHJpYnV0ZTogc3RyaW5nfG51bGx8dW5kZWZpbmVkLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSByZW5kZXJlcjogUmVuZGVyZXIyLCBwcml2YXRlIHJlYWRvbmx5IGVsOiBFbGVtZW50UmVmLFxuICAgICAgcHJpdmF0ZSBsb2NhdGlvblN0cmF0ZWd5PzogTG9jYXRpb25TdHJhdGVneSkge1xuICAgIGNvbnN0IHRhZ05hbWUgPSBlbC5uYXRpdmVFbGVtZW50LnRhZ05hbWU7XG4gICAgdGhpcy5pc0FuY2hvckVsZW1lbnQgPSB0YWdOYW1lID09PSAnQScgfHwgdGFnTmFtZSA9PT0gJ0FSRUEnO1xuXG4gICAgaWYgKHRoaXMuaXNBbmNob3JFbGVtZW50KSB7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbiA9IHJvdXRlci5ldmVudHMuc3Vic2NyaWJlKChzOiBFdmVudCkgPT4ge1xuICAgICAgICBpZiAocyBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZVRhcmdldFVybEFuZEhyZWYoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2V0VGFiSW5kZXhJZk5vdE9uTmF0aXZlRWwoJzAnKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGVcbiAgICogYFVybENyZWF0aW9uT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNwcmVzZXJ2ZUZyYWdtZW50IFVybENyZWF0aW9uT3B0aW9ucyNwcmVzZXJ2ZUZyYWdtZW50fVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpXG4gIHNldCBwcmVzZXJ2ZUZyYWdtZW50KHByZXNlcnZlRnJhZ21lbnQ6IGJvb2xlYW58c3RyaW5nfG51bGx8dW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fcHJlc2VydmVGcmFnbWVudCA9IGNvZXJjZVRvQm9vbGVhbihwcmVzZXJ2ZUZyYWdtZW50KTtcbiAgfVxuXG4gIGdldCBwcmVzZXJ2ZUZyYWdtZW50KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9wcmVzZXJ2ZUZyYWdtZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI25hdmlnYXRlQnlVcmwgUm91dGVyI25hdmlnYXRlQnlVcmx9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zYC5cbiAgICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyNza2lwTG9jYXRpb25DaGFuZ2UgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyNza2lwTG9jYXRpb25DaGFuZ2V9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfVxuICAgKi9cbiAgQElucHV0KClcbiAgc2V0IHNraXBMb2NhdGlvbkNoYW5nZShza2lwTG9jYXRpb25DaGFuZ2U6IGJvb2xlYW58c3RyaW5nfG51bGx8dW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fc2tpcExvY2F0aW9uQ2hhbmdlID0gY29lcmNlVG9Cb29sZWFuKHNraXBMb2NhdGlvbkNoYW5nZSk7XG4gIH1cblxuICBnZXQgc2tpcExvY2F0aW9uQ2hhbmdlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9za2lwTG9jYXRpb25DaGFuZ2U7XG4gIH1cblxuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybCBSb3V0ZXIjbmF2aWdhdGVCeVVybH0gYXMgcGFydCBvZiB0aGVcbiAgICogYE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zI3JlcGxhY2VVcmwgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyNyZXBsYWNlVXJsfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybCBSb3V0ZXIjbmF2aWdhdGVCeVVybH1cbiAgICovXG4gIEBJbnB1dCgpXG4gIHNldCByZXBsYWNlVXJsKHJlcGxhY2VVcmw6IGJvb2xlYW58c3RyaW5nfG51bGx8dW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fcmVwbGFjZVVybCA9IGNvZXJjZVRvQm9vbGVhbihyZXBsYWNlVXJsKTtcbiAgfVxuXG4gIGdldCByZXBsYWNlVXJsKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9yZXBsYWNlVXJsO1xuICB9XG5cbiAgLyoqXG4gICAqIE1vZGlmaWVzIHRoZSB0YWIgaW5kZXggaWYgdGhlcmUgd2FzIG5vdCBhIHRhYmluZGV4IGF0dHJpYnV0ZSBvbiB0aGUgZWxlbWVudCBkdXJpbmdcbiAgICogaW5zdGFudGlhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgc2V0VGFiSW5kZXhJZk5vdE9uTmF0aXZlRWwobmV3VGFiSW5kZXg6IHN0cmluZ3xudWxsKSB7XG4gICAgaWYgKHRoaXMudGFiSW5kZXhBdHRyaWJ1dGUgIT0gbnVsbCAvKiBib3RoIGBudWxsYCBhbmQgYHVuZGVmaW5lZGAgKi8gfHwgdGhpcy5pc0FuY2hvckVsZW1lbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcmVuZGVyZXIgPSB0aGlzLnJlbmRlcmVyO1xuICAgIGNvbnN0IG5hdGl2ZUVsZW1lbnQgPSB0aGlzLmVsLm5hdGl2ZUVsZW1lbnQ7XG4gICAgaWYgKG5ld1RhYkluZGV4ICE9PSBudWxsKSB7XG4gICAgICByZW5kZXJlci5zZXRBdHRyaWJ1dGUobmF0aXZlRWxlbWVudCwgJ3RhYmluZGV4JywgbmV3VGFiSW5kZXgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZW5kZXJlci5yZW1vdmVBdHRyaWJ1dGUobmF0aXZlRWxlbWVudCwgJ3RhYmluZGV4Jyk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7XG4gICAgaWYgKHRoaXMuaXNBbmNob3JFbGVtZW50KSB7XG4gICAgICB0aGlzLnVwZGF0ZVRhcmdldFVybEFuZEhyZWYoKTtcbiAgICB9XG4gICAgLy8gVGhpcyBpcyBzdWJzY3JpYmVkIHRvIGJ5IGBSb3V0ZXJMaW5rQWN0aXZlYCBzbyB0aGF0IGl0IGtub3dzIHRvIHVwZGF0ZSB3aGVuIHRoZXJlIGFyZSBjaGFuZ2VzXG4gICAgLy8gdG8gdGhlIFJvdXRlckxpbmtzIGl0J3MgdHJhY2tpbmcuXG4gICAgdGhpcy5vbkNoYW5nZXMubmV4dCh0aGlzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21tYW5kcyB0byBwYXNzIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0uXG4gICAqICAgLSAqKmFycmF5Kio6IGNvbW1hbmRzIHRvIHBhc3MgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfS5cbiAgICogICAtICoqc3RyaW5nKio6IHNob3J0aGFuZCBmb3IgYXJyYXkgb2YgY29tbWFuZHMgd2l0aCBqdXN0IHRoZSBzdHJpbmcsIGkuZS4gYFsnL3JvdXRlJ11gXG4gICAqICAgLSAqKm51bGx8dW5kZWZpbmVkKio6IGVmZmVjdGl2ZWx5IGRpc2FibGVzIHRoZSBgcm91dGVyTGlua2BcbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKVxuICBzZXQgcm91dGVyTGluayhjb21tYW5kczogYW55W118c3RyaW5nfG51bGx8dW5kZWZpbmVkKSB7XG4gICAgaWYgKGNvbW1hbmRzICE9IG51bGwpIHtcbiAgICAgIHRoaXMuY29tbWFuZHMgPSBBcnJheS5pc0FycmF5KGNvbW1hbmRzKSA/IGNvbW1hbmRzIDogW2NvbW1hbmRzXTtcbiAgICAgIHRoaXMuc2V0VGFiSW5kZXhJZk5vdE9uTmF0aXZlRWwoJzAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb21tYW5kcyA9IG51bGw7XG4gICAgICB0aGlzLnNldFRhYkluZGV4SWZOb3RPbk5hdGl2ZUVsKG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgQEhvc3RMaXN0ZW5lcihcbiAgICAgICdjbGljaycsXG4gICAgICBbJyRldmVudC5idXR0b24nLCAnJGV2ZW50LmN0cmxLZXknLCAnJGV2ZW50LnNoaWZ0S2V5JywgJyRldmVudC5hbHRLZXknLCAnJGV2ZW50Lm1ldGFLZXknXSlcbiAgb25DbGljayhidXR0b246IG51bWJlciwgY3RybEtleTogYm9vbGVhbiwgc2hpZnRLZXk6IGJvb2xlYW4sIGFsdEtleTogYm9vbGVhbiwgbWV0YUtleTogYm9vbGVhbik6XG4gICAgICBib29sZWFuIHtcbiAgICBpZiAodGhpcy51cmxUcmVlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc0FuY2hvckVsZW1lbnQpIHtcbiAgICAgIGlmIChidXR0b24gIT09IDAgfHwgY3RybEtleSB8fCBzaGlmdEtleSB8fCBhbHRLZXkgfHwgbWV0YUtleSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB0aGlzLnRhcmdldCA9PT0gJ3N0cmluZycgJiYgdGhpcy50YXJnZXQgIT0gJ19zZWxmJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBleHRyYXMgPSB7XG4gICAgICBza2lwTG9jYXRpb25DaGFuZ2U6IHRoaXMuc2tpcExvY2F0aW9uQ2hhbmdlLFxuICAgICAgcmVwbGFjZVVybDogdGhpcy5yZXBsYWNlVXJsLFxuICAgICAgc3RhdGU6IHRoaXMuc3RhdGUsXG4gICAgfTtcbiAgICB0aGlzLnJvdXRlci5uYXZpZ2F0ZUJ5VXJsKHRoaXMudXJsVHJlZSwgZXh0cmFzKTtcblxuICAgIC8vIFJldHVybiBgZmFsc2VgIGZvciBgPGE+YCBlbGVtZW50cyB0byBwcmV2ZW50IGRlZmF1bHQgYWN0aW9uXG4gICAgLy8gYW5kIGNhbmNlbCB0aGUgbmF0aXZlIGJlaGF2aW9yLCBzaW5jZSB0aGUgbmF2aWdhdGlvbiBpcyBoYW5kbGVkXG4gICAgLy8gYnkgdGhlIFJvdXRlci5cbiAgICByZXR1cm4gIXRoaXMuaXNBbmNob3JFbGVtZW50O1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiBhbnkge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9uPy51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGVUYXJnZXRVcmxBbmRIcmVmKCk6IHZvaWQge1xuICAgIHRoaXMuaHJlZiA9IHRoaXMudXJsVHJlZSAhPT0gbnVsbCAmJiB0aGlzLmxvY2F0aW9uU3RyYXRlZ3kgP1xuICAgICAgICB0aGlzLmxvY2F0aW9uU3RyYXRlZ3k/LnByZXBhcmVFeHRlcm5hbFVybCh0aGlzLnJvdXRlci5zZXJpYWxpemVVcmwodGhpcy51cmxUcmVlKSkgOlxuICAgICAgICBudWxsO1xuICB9XG5cbiAgZ2V0IHVybFRyZWUoKTogVXJsVHJlZXxudWxsIHtcbiAgICBpZiAodGhpcy5jb21tYW5kcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJvdXRlci5jcmVhdGVVcmxUcmVlKHRoaXMuY29tbWFuZHMsIHtcbiAgICAgIC8vIElmIHRoZSBgcmVsYXRpdmVUb2AgaW5wdXQgaXMgbm90IGRlZmluZWQsIHdlIHdhbnQgdG8gdXNlIGB0aGlzLnJvdXRlYCBieSBkZWZhdWx0LlxuICAgICAgLy8gT3RoZXJ3aXNlLCB3ZSBzaG91bGQgdXNlIHRoZSB2YWx1ZSBwcm92aWRlZCBieSB0aGUgdXNlciBpbiB0aGUgaW5wdXQuXG4gICAgICByZWxhdGl2ZVRvOiB0aGlzLnJlbGF0aXZlVG8gIT09IHVuZGVmaW5lZCA/IHRoaXMucmVsYXRpdmVUbyA6IHRoaXMucm91dGUsXG4gICAgICBxdWVyeVBhcmFtczogdGhpcy5xdWVyeVBhcmFtcyxcbiAgICAgIGZyYWdtZW50OiB0aGlzLmZyYWdtZW50LFxuICAgICAgcXVlcnlQYXJhbXNIYW5kbGluZzogdGhpcy5xdWVyeVBhcmFtc0hhbmRsaW5nLFxuICAgICAgcHJlc2VydmVGcmFnbWVudDogdGhpcy5wcmVzZXJ2ZUZyYWdtZW50LFxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogTGV0cyB5b3UgbGluayB0byBzcGVjaWZpYyByb3V0ZXMgaW4geW91ciBhcHAuXG4gKlxuICogU2VlIGBSb3V0ZXJMaW5rYCBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ARGlyZWN0aXZlKHtcbiAgc2VsZWN0b3I6ICdhW3JvdXRlckxpbmtdLGFyZWFbcm91dGVyTGlua10nLFxuICBzdGFuZGFsb25lOiB0cnVlLFxufSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJMaW5rV2l0aEhyZWYgZXh0ZW5kcyBSb3V0ZXJMaW5rIHtcbiAgLyoqXG4gICAqIFRoZSB1cmwgZGlzcGxheWVkIG9uIHRoZSBhbmNob3IgZWxlbWVudC5cbiAgICogQEhvc3RCaW5kaW5nKCdhdHRyLmhyZWYnKSBpcyB1c2VkIHJhdGhlciB0aGFuIEBIb3N0QmluZGluZygpIGJlY2F1c2VcbiAgICogaXQgcmVtb3ZlcyB0aGUgaHJlZiBhdHRyaWJ1dGUgd2hlbiBpdCBiZWNvbWVzIGBudWxsYC5cbiAgICpcbiAgICogTm90ZTogdGhpcyBob3N0IGJpbmRpbmcgaXMgcmV0YWluZWQgaW4gdGhlIGBSb3V0ZXJMaW5rV2l0aEhyZWZgIHRvXG4gICAqIG1ha2Ugc3VyZSB0aGUgcmlnaHQgc2VjdXJpdHkgY29udGV4dCBpcyBzZWxlY3RlZCAod2hpY2ggYWxzbyB0YWtlc1xuICAgKiBpbnRvIGFjY291bnQgYW4gZWxlbWVudCBuYW1lIGZyb20gdGhlIHNlbGVjdG9yKS5cbiAgICovXG4gIEBIb3N0QmluZGluZygnYXR0ci5ocmVmJykgb3ZlcnJpZGUgaHJlZjogc3RyaW5nfG51bGwgPSBudWxsO1xuXG4gIC8vIEZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSwgY29uc3RydWN0b3IgYXJndW1lbnRzIHJldGFpbmVkIGFuIG9sZCBzaGFwZS5cbiAgY29uc3RydWN0b3Iocm91dGVyOiBSb3V0ZXIsIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSwgbG9jYXRpb25TdHJhdGVneTogTG9jYXRpb25TdHJhdGVneSkge1xuICAgIHN1cGVyKFxuICAgICAgICByb3V0ZXIsIHJvdXRlLCB1bmRlZmluZWQgLyogdGFiSW5kZXhBdHRyaWJ1dGUgKi8sIGluamVjdChSZW5kZXJlcjIpLCBpbmplY3QoRWxlbWVudFJlZiksXG4gICAgICAgIGxvY2F0aW9uU3RyYXRlZ3kpO1xuICB9XG59XG4iXX0=