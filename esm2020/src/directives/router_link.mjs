/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { LocationStrategy } from '@angular/common';
import { Attribute, Directive, ElementRef, HostBinding, HostListener, inject, Input, Renderer2, ɵcoerceToBoolean as coerceToBoolean, ɵɵsanitizeUrlOrResourceUrl } from '@angular/core';
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
         * Represents an `href` attribute value applied to a host element,
         * when a host element is `<a>`. For other tags, the value is `null`.
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
                    this.updateHref();
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
        this.applyAttributeValue('tabindex', newTabIndex);
    }
    /** @nodoc */
    ngOnChanges(changes) {
        if (this.isAnchorElement) {
            this.updateHref();
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
    updateHref() {
        this.href = this.urlTree !== null && this.locationStrategy ?
            this.locationStrategy?.prepareExternalUrl(this.router.serializeUrl(this.urlTree)) :
            null;
        const sanitizedValue = this.href === null ?
            null :
            // This class represents a directive that can be added to both `<a>` elements,
            // as well as other elements. As a result, we can't define security context at
            // compile time. So the security context is deferred to runtime.
            // The `ɵɵsanitizeUrlOrResourceUrl` selects the necessary sanitizer function
            // based on the tag and property names. The logic mimics the one from
            // `packages/compiler/src/schema/dom_security_schema.ts`, which is used at compile time.
            //
            // Note: we should investigate whether we can switch to using `@HostBinding('attr.href')`
            // instead of applying a value via a renderer, after a final merge of the
            // `RouterLinkWithHref` directive.
            ɵɵsanitizeUrlOrResourceUrl(this.href, this.el.nativeElement.tagName.toLowerCase(), 'href');
        this.applyAttributeValue('href', sanitizedValue);
    }
    applyAttributeValue(attrName, attrValue) {
        const renderer = this.renderer;
        const nativeElement = this.el.nativeElement;
        if (attrValue !== null) {
            renderer.setAttribute(nativeElement, attrName, attrValue);
        }
        else {
            renderer.removeAttribute(nativeElement, attrName);
        }
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
RouterLink.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.0.0-next.4+sha-400a6b5", ngImport: i0, type: RouterLink, deps: [{ token: i1.Router }, { token: i2.ActivatedRoute }, { token: 'tabindex', attribute: true }, { token: i0.Renderer2 }, { token: i0.ElementRef }, { token: i3.LocationStrategy }], target: i0.ɵɵFactoryTarget.Directive });
RouterLink.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "15.0.0-next.4+sha-400a6b5", type: RouterLink, isStandalone: true, selector: ":not(a):not(area)[routerLink]", inputs: { target: "target", queryParams: "queryParams", fragment: "fragment", queryParamsHandling: "queryParamsHandling", state: "state", relativeTo: "relativeTo", preserveFragment: "preserveFragment", skipLocationChange: "skipLocationChange", replaceUrl: "replaceUrl", routerLink: "routerLink" }, host: { listeners: { "click": "onClick($event.button,$event.ctrlKey,$event.shiftKey,$event.altKey,$event.metaKey)" }, properties: { "attr.target": "this.target" } }, usesOnChanges: true, ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.0.0-next.4+sha-400a6b5", ngImport: i0, type: RouterLink, decorators: [{
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
    }
}
RouterLinkWithHref.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.0.0-next.4+sha-400a6b5", ngImport: i0, type: RouterLinkWithHref, deps: [{ token: i1.Router }, { token: i2.ActivatedRoute }, { token: i3.LocationStrategy }], target: i0.ɵɵFactoryTarget.Directive });
RouterLinkWithHref.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "15.0.0-next.4+sha-400a6b5", type: RouterLinkWithHref, isStandalone: true, selector: "a[routerLink],area[routerLink]", usesInheritance: true, ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.0.0-next.4+sha-400a6b5", ngImport: i0, type: RouterLinkWithHref, decorators: [{
            type: Directive,
            args: [{
                    selector: 'a[routerLink],area[routerLink]',
                    standalone: true,
                }]
        }], ctorParameters: function () { return [{ type: i1.Router }, { type: i2.ActivatedRoute }, { type: i3.LocationStrategy }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDakQsT0FBTyxFQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBd0IsU0FBUyxFQUFpQixnQkFBZ0IsSUFBSSxlQUFlLEVBQUUsMEJBQTBCLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDMU4sT0FBTyxFQUFDLE9BQU8sRUFBZSxNQUFNLE1BQU0sQ0FBQztBQUUzQyxPQUFPLEVBQVEsYUFBYSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBRS9DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDakMsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLGlCQUFpQixDQUFDOzs7OztBQUsvQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBZ0dHO0FBS0gsTUFBTSxPQUFPLFVBQVU7SUFrRXJCLFlBQ1ksTUFBYyxFQUFVLEtBQXFCLEVBQ2IsaUJBQXdDLEVBQy9ELFFBQW1CLEVBQW1CLEVBQWMsRUFDN0QsZ0JBQW1DO1FBSG5DLFdBQU0sR0FBTixNQUFNLENBQVE7UUFBVSxVQUFLLEdBQUwsS0FBSyxDQUFnQjtRQUNiLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBdUI7UUFDL0QsYUFBUSxHQUFSLFFBQVEsQ0FBVztRQUFtQixPQUFFLEdBQUYsRUFBRSxDQUFZO1FBQzdELHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FB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Q0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQ3ZGLGdCQUFnQixDQUFDLENBQUM7SUFDeEIsQ0FBQzs7MEhBTlUsa0JBQWtCOzhHQUFsQixrQkFBa0I7c0dBQWxCLGtCQUFrQjtrQkFKOUIsU0FBUzttQkFBQztvQkFDVCxRQUFRLEVBQUUsZ0NBQWdDO29CQUMxQyxVQUFVLEVBQUUsSUFBSTtpQkFDakIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvblN0cmF0ZWd5fSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtBdHRyaWJ1dGUsIERpcmVjdGl2ZSwgRWxlbWVudFJlZiwgSG9zdEJpbmRpbmcsIEhvc3RMaXN0ZW5lciwgaW5qZWN0LCBJbnB1dCwgT25DaGFuZ2VzLCBPbkRlc3Ryb3ksIFJlbmRlcmVyMiwgU2ltcGxlQ2hhbmdlcywgybVjb2VyY2VUb0Jvb2xlYW4gYXMgY29lcmNlVG9Cb29sZWFuLCDJtcm1c2FuaXRpemVVcmxPclJlc291cmNlVXJsfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7U3ViamVjdCwgU3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtFdmVudCwgTmF2aWdhdGlvbkVuZH0gZnJvbSAnLi4vZXZlbnRzJztcbmltcG9ydCB7UXVlcnlQYXJhbXNIYW5kbGluZ30gZnJvbSAnLi4vbW9kZWxzJztcbmltcG9ydCB7Um91dGVyfSBmcm9tICcuLi9yb3V0ZXInO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZX0gZnJvbSAnLi4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UGFyYW1zfSBmcm9tICcuLi9zaGFyZWQnO1xuaW1wb3J0IHtVcmxUcmVlfSBmcm9tICcuLi91cmxfdHJlZSc7XG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBXaGVuIGFwcGxpZWQgdG8gYW4gZWxlbWVudCBpbiBhIHRlbXBsYXRlLCBtYWtlcyB0aGF0IGVsZW1lbnQgYSBsaW5rXG4gKiB0aGF0IGluaXRpYXRlcyBuYXZpZ2F0aW9uIHRvIGEgcm91dGUuIE5hdmlnYXRpb24gb3BlbnMgb25lIG9yIG1vcmUgcm91dGVkIGNvbXBvbmVudHNcbiAqIGluIG9uZSBvciBtb3JlIGA8cm91dGVyLW91dGxldD5gIGxvY2F0aW9ucyBvbiB0aGUgcGFnZS5cbiAqXG4gKiBHaXZlbiBhIHJvdXRlIGNvbmZpZ3VyYXRpb24gYFt7IHBhdGg6ICd1c2VyLzpuYW1lJywgY29tcG9uZW50OiBVc2VyQ21wIH1dYCxcbiAqIHRoZSBmb2xsb3dpbmcgY3JlYXRlcyBhIHN0YXRpYyBsaW5rIHRvIHRoZSByb3V0ZTpcbiAqIGA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCI+bGluayB0byB1c2VyIGNvbXBvbmVudDwvYT5gXG4gKlxuICogWW91IGNhbiB1c2UgZHluYW1pYyB2YWx1ZXMgdG8gZ2VuZXJhdGUgdGhlIGxpbmsuXG4gKiBGb3IgYSBkeW5hbWljIGxpbmssIHBhc3MgYW4gYXJyYXkgb2YgcGF0aCBzZWdtZW50cyxcbiAqIGZvbGxvd2VkIGJ5IHRoZSBwYXJhbXMgZm9yIGVhY2ggc2VnbWVudC5cbiAqIEZvciBleGFtcGxlLCBgWycvdGVhbScsIHRlYW1JZCwgJ3VzZXInLCB1c2VyTmFtZSwge2RldGFpbHM6IHRydWV9XWBcbiAqIGdlbmVyYXRlcyBhIGxpbmsgdG8gYC90ZWFtLzExL3VzZXIvYm9iO2RldGFpbHM9dHJ1ZWAuXG4gKlxuICogTXVsdGlwbGUgc3RhdGljIHNlZ21lbnRzIGNhbiBiZSBtZXJnZWQgaW50byBvbmUgdGVybSBhbmQgY29tYmluZWQgd2l0aCBkeW5hbWljIHNlZ21lbnRzLlxuICogRm9yIGV4YW1wbGUsIGBbJy90ZWFtLzExL3VzZXInLCB1c2VyTmFtZSwge2RldGFpbHM6IHRydWV9XWBcbiAqXG4gKiBUaGUgaW5wdXQgdGhhdCB5b3UgcHJvdmlkZSB0byB0aGUgbGluayBpcyB0cmVhdGVkIGFzIGEgZGVsdGEgdG8gdGhlIGN1cnJlbnQgVVJMLlxuICogRm9yIGluc3RhbmNlLCBzdXBwb3NlIHRoZSBjdXJyZW50IFVSTCBpcyBgL3VzZXIvKGJveC8vYXV4OnRlYW0pYC5cbiAqIFRoZSBsaW5rIGA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2ppbSddXCI+SmltPC9hPmAgY3JlYXRlcyB0aGUgVVJMXG4gKiBgL3VzZXIvKGppbS8vYXV4OnRlYW0pYC5cbiAqIFNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgY3JlYXRlVXJsVHJlZX0gZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBZb3UgY2FuIHVzZSBhYnNvbHV0ZSBvciByZWxhdGl2ZSBwYXRocyBpbiBhIGxpbmssIHNldCBxdWVyeSBwYXJhbWV0ZXJzLFxuICogY29udHJvbCBob3cgcGFyYW1ldGVycyBhcmUgaGFuZGxlZCwgYW5kIGtlZXAgYSBoaXN0b3J5IG9mIG5hdmlnYXRpb24gc3RhdGVzLlxuICpcbiAqICMjIyBSZWxhdGl2ZSBsaW5rIHBhdGhzXG4gKlxuICogVGhlIGZpcnN0IHNlZ21lbnQgbmFtZSBjYW4gYmUgcHJlcGVuZGVkIHdpdGggYC9gLCBgLi9gLCBvciBgLi4vYC5cbiAqICogSWYgdGhlIGZpcnN0IHNlZ21lbnQgYmVnaW5zIHdpdGggYC9gLCB0aGUgcm91dGVyIGxvb2tzIHVwIHRoZSByb3V0ZSBmcm9tIHRoZSByb290IG9mIHRoZVxuICogICBhcHAuXG4gKiAqIElmIHRoZSBmaXJzdCBzZWdtZW50IGJlZ2lucyB3aXRoIGAuL2AsIG9yIGRvZXNuJ3QgYmVnaW4gd2l0aCBhIHNsYXNoLCB0aGUgcm91dGVyXG4gKiAgIGxvb2tzIGluIHRoZSBjaGlsZHJlbiBvZiB0aGUgY3VycmVudCBhY3RpdmF0ZWQgcm91dGUuXG4gKiAqIElmIHRoZSBmaXJzdCBzZWdtZW50IGJlZ2lucyB3aXRoIGAuLi9gLCB0aGUgcm91dGVyIGdvZXMgdXAgb25lIGxldmVsIGluIHRoZSByb3V0ZSB0cmVlLlxuICpcbiAqICMjIyBTZXR0aW5nIGFuZCBoYW5kbGluZyBxdWVyeSBwYXJhbXMgYW5kIGZyYWdtZW50c1xuICpcbiAqIFRoZSBmb2xsb3dpbmcgbGluayBhZGRzIGEgcXVlcnkgcGFyYW1ldGVyIGFuZCBhIGZyYWdtZW50IHRvIHRoZSBnZW5lcmF0ZWQgVVJMOlxuICpcbiAqIGBgYFxuICogPGEgW3JvdXRlckxpbmtdPVwiWycvdXNlci9ib2InXVwiIFtxdWVyeVBhcmFtc109XCJ7ZGVidWc6IHRydWV9XCIgZnJhZ21lbnQ9XCJlZHVjYXRpb25cIj5cbiAqICAgbGluayB0byB1c2VyIGNvbXBvbmVudFxuICogPC9hPlxuICogYGBgXG4gKiBCeSBkZWZhdWx0LCB0aGUgZGlyZWN0aXZlIGNvbnN0cnVjdHMgdGhlIG5ldyBVUkwgdXNpbmcgdGhlIGdpdmVuIHF1ZXJ5IHBhcmFtZXRlcnMuXG4gKiBUaGUgZXhhbXBsZSBnZW5lcmF0ZXMgdGhlIGxpbms6IGAvdXNlci9ib2I/ZGVidWc9dHJ1ZSNlZHVjYXRpb25gLlxuICpcbiAqIFlvdSBjYW4gaW5zdHJ1Y3QgdGhlIGRpcmVjdGl2ZSB0byBoYW5kbGUgcXVlcnkgcGFyYW1ldGVycyBkaWZmZXJlbnRseVxuICogYnkgc3BlY2lmeWluZyB0aGUgYHF1ZXJ5UGFyYW1zSGFuZGxpbmdgIG9wdGlvbiBpbiB0aGUgbGluay5cbiAqIEFsbG93ZWQgdmFsdWVzIGFyZTpcbiAqXG4gKiAgLSBgJ21lcmdlJ2A6IE1lcmdlIHRoZSBnaXZlbiBgcXVlcnlQYXJhbXNgIGludG8gdGhlIGN1cnJlbnQgcXVlcnkgcGFyYW1zLlxuICogIC0gYCdwcmVzZXJ2ZSdgOiBQcmVzZXJ2ZSB0aGUgY3VycmVudCBxdWVyeSBwYXJhbXMuXG4gKlxuICogRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2JvYiddXCIgW3F1ZXJ5UGFyYW1zXT1cIntkZWJ1ZzogdHJ1ZX1cIiBxdWVyeVBhcmFtc0hhbmRsaW5nPVwibWVyZ2VcIj5cbiAqICAgbGluayB0byB1c2VyIGNvbXBvbmVudFxuICogPC9hPlxuICogYGBgXG4gKlxuICogU2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMucXVlcnlQYXJhbXNIYW5kbGluZyBVcmxDcmVhdGlvbk9wdGlvbnMjcXVlcnlQYXJhbXNIYW5kbGluZ30uXG4gKlxuICogIyMjIFByZXNlcnZpbmcgbmF2aWdhdGlvbiBoaXN0b3J5XG4gKlxuICogWW91IGNhbiBwcm92aWRlIGEgYHN0YXRlYCB2YWx1ZSB0byBiZSBwZXJzaXN0ZWQgdG8gdGhlIGJyb3dzZXInc1xuICogW2BIaXN0b3J5LnN0YXRlYCBwcm9wZXJ0eV0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0hpc3RvcnkjUHJvcGVydGllcykuXG4gKiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIDxhIFtyb3V0ZXJMaW5rXT1cIlsnL3VzZXIvYm9iJ11cIiBbc3RhdGVdPVwie3RyYWNpbmdJZDogMTIzfVwiPlxuICogICBsaW5rIHRvIHVzZXIgY29tcG9uZW50XG4gKiA8L2E+XG4gKiBgYGBcbiAqXG4gKiBVc2Uge0BsaW5rIFJvdXRlci5nZXRDdXJyZW50TmF2aWdhdGlvbigpIFJvdXRlciNnZXRDdXJyZW50TmF2aWdhdGlvbn0gdG8gcmV0cmlldmUgYSBzYXZlZFxuICogbmF2aWdhdGlvbi1zdGF0ZSB2YWx1ZS4gRm9yIGV4YW1wbGUsIHRvIGNhcHR1cmUgdGhlIGB0cmFjaW5nSWRgIGR1cmluZyB0aGUgYE5hdmlnYXRpb25TdGFydGBcbiAqIGV2ZW50OlxuICpcbiAqIGBgYFxuICogLy8gR2V0IE5hdmlnYXRpb25TdGFydCBldmVudHNcbiAqIHJvdXRlci5ldmVudHMucGlwZShmaWx0ZXIoZSA9PiBlIGluc3RhbmNlb2YgTmF2aWdhdGlvblN0YXJ0KSkuc3Vic2NyaWJlKGUgPT4ge1xuICogICBjb25zdCBuYXZpZ2F0aW9uID0gcm91dGVyLmdldEN1cnJlbnROYXZpZ2F0aW9uKCk7XG4gKiAgIHRyYWNpbmdTZXJ2aWNlLnRyYWNlKHtpZDogbmF2aWdhdGlvbi5leHRyYXMuc3RhdGUudHJhY2luZ0lkfSk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBEaXJlY3RpdmUoe1xuICBzZWxlY3RvcjogJzpub3QoYSk6bm90KGFyZWEpW3JvdXRlckxpbmtdJyxcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyTGluayBpbXBsZW1lbnRzIE9uQ2hhbmdlcywgT25EZXN0cm95IHtcbiAgcHJpdmF0ZSBfcHJlc2VydmVGcmFnbWVudCA9IGZhbHNlO1xuICBwcml2YXRlIF9za2lwTG9jYXRpb25DaGFuZ2UgPSBmYWxzZTtcbiAgcHJpdmF0ZSBfcmVwbGFjZVVybCA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIGFuIGBocmVmYCBhdHRyaWJ1dGUgdmFsdWUgYXBwbGllZCB0byBhIGhvc3QgZWxlbWVudCxcbiAgICogd2hlbiBhIGhvc3QgZWxlbWVudCBpcyBgPGE+YC4gRm9yIG90aGVyIHRhZ3MsIHRoZSB2YWx1ZSBpcyBgbnVsbGAuXG4gICAqL1xuICBocmVmOiBzdHJpbmd8bnVsbCA9IG51bGw7XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgdGhlIGB0YXJnZXRgIGF0dHJpYnV0ZSBvbiBhIGhvc3QgZWxlbWVudC5cbiAgICogVGhpcyBpcyBvbmx5IHVzZWQgd2hlbiB0aGUgaG9zdCBlbGVtZW50IGlzIGFuIGA8YT5gIHRhZy5cbiAgICovXG4gIEBIb3N0QmluZGluZygnYXR0ci50YXJnZXQnKSBASW5wdXQoKSB0YXJnZXQ/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcXVlcnlQYXJhbXMgVXJsQ3JlYXRpb25PcHRpb25zI3F1ZXJ5UGFyYW1zfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpIHF1ZXJ5UGFyYW1zPzogUGFyYW1zfG51bGw7XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgVXJsQ3JlYXRpb25PcHRpb25zYC5cbiAgICogQHNlZSB7QGxpbmsgVXJsQ3JlYXRpb25PcHRpb25zI2ZyYWdtZW50IFVybENyZWF0aW9uT3B0aW9ucyNmcmFnbWVudH1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKSBmcmFnbWVudD86IHN0cmluZztcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcXVlcnlQYXJhbXNIYW5kbGluZyBVcmxDcmVhdGlvbk9wdGlvbnMjcXVlcnlQYXJhbXNIYW5kbGluZ31cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKSBxdWVyeVBhcmFtc0hhbmRsaW5nPzogUXVlcnlQYXJhbXNIYW5kbGluZ3xudWxsO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybCBSb3V0ZXIjbmF2aWdhdGVCeVVybH0gYXMgcGFydCBvZiB0aGVcbiAgICogYE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zI3N0YXRlIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjc3RhdGV9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfVxuICAgKi9cbiAgQElucHV0KCkgc3RhdGU/OiB7W2s6IHN0cmluZ106IGFueX07XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgVXJsQ3JlYXRpb25PcHRpb25zYC5cbiAgICogU3BlY2lmeSBhIHZhbHVlIGhlcmUgd2hlbiB5b3UgZG8gbm90IHdhbnQgdG8gdXNlIHRoZSBkZWZhdWx0IHZhbHVlXG4gICAqIGZvciBgcm91dGVyTGlua2AsIHdoaWNoIGlzIHRoZSBjdXJyZW50IGFjdGl2YXRlZCByb3V0ZS5cbiAgICogTm90ZSB0aGF0IGEgdmFsdWUgb2YgYHVuZGVmaW5lZGAgaGVyZSB3aWxsIHVzZSB0aGUgYHJvdXRlckxpbmtgIGRlZmF1bHQuXG4gICAqIEBzZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNyZWxhdGl2ZVRvIFVybENyZWF0aW9uT3B0aW9ucyNyZWxhdGl2ZVRvfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpIHJlbGF0aXZlVG8/OiBBY3RpdmF0ZWRSb3V0ZXxudWxsO1xuXG4gIHByaXZhdGUgY29tbWFuZHM6IGFueVtdfG51bGwgPSBudWxsO1xuXG4gIC8qKiBXaGV0aGVyIGEgaG9zdCBlbGVtZW50IGlzIGFuIGA8YT5gIHRhZy4gKi9cbiAgcHJpdmF0ZSBpc0FuY2hvckVsZW1lbnQ6IGJvb2xlYW47XG5cbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb24/OiBTdWJzY3JpcHRpb247XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBvbkNoYW5nZXMgPSBuZXcgU3ViamVjdDxSb3V0ZXJMaW5rPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZXI6IFJvdXRlciwgcHJpdmF0ZSByb3V0ZTogQWN0aXZhdGVkUm91dGUsXG4gICAgICBAQXR0cmlidXRlKCd0YWJpbmRleCcpIHByaXZhdGUgcmVhZG9ubHkgdGFiSW5kZXhBdHRyaWJ1dGU6IHN0cmluZ3xudWxsfHVuZGVmaW5lZCxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgcmVuZGVyZXI6IFJlbmRlcmVyMiwgcHJpdmF0ZSByZWFkb25seSBlbDogRWxlbWVudFJlZixcbiAgICAgIHByaXZhdGUgbG9jYXRpb25TdHJhdGVneT86IExvY2F0aW9uU3RyYXRlZ3kpIHtcbiAgICBjb25zdCB0YWdOYW1lID0gZWwubmF0aXZlRWxlbWVudC50YWdOYW1lO1xuICAgIHRoaXMuaXNBbmNob3JFbGVtZW50ID0gdGFnTmFtZSA9PT0gJ0EnIHx8IHRhZ05hbWUgPT09ICdBUkVBJztcblxuICAgIGlmICh0aGlzLmlzQW5jaG9yRWxlbWVudCkge1xuICAgICAgdGhpcy5zdWJzY3JpcHRpb24gPSByb3V0ZXIuZXZlbnRzLnN1YnNjcmliZSgoczogRXZlbnQpID0+IHtcbiAgICAgICAgaWYgKHMgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICAgICAgdGhpcy51cGRhdGVIcmVmKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNldFRhYkluZGV4SWZOb3RPbk5hdGl2ZUVsKCcwJyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcHJlc2VydmVGcmFnbWVudCBVcmxDcmVhdGlvbk9wdGlvbnMjcHJlc2VydmVGcmFnbWVudH1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKVxuICBzZXQgcHJlc2VydmVGcmFnbWVudChwcmVzZXJ2ZUZyYWdtZW50OiBib29sZWFufHN0cmluZ3xudWxsfHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3ByZXNlcnZlRnJhZ21lbnQgPSBjb2VyY2VUb0Jvb2xlYW4ocHJlc2VydmVGcmFnbWVudCk7XG4gIH1cblxuICBnZXQgcHJlc2VydmVGcmFnbWVudCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fcHJlc2VydmVGcmFnbWVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjc2tpcExvY2F0aW9uQ2hhbmdlIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjc2tpcExvY2F0aW9uQ2hhbmdlfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybCBSb3V0ZXIjbmF2aWdhdGVCeVVybH1cbiAgICovXG4gIEBJbnB1dCgpXG4gIHNldCBza2lwTG9jYXRpb25DaGFuZ2Uoc2tpcExvY2F0aW9uQ2hhbmdlOiBib29sZWFufHN0cmluZ3xudWxsfHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3NraXBMb2NhdGlvbkNoYW5nZSA9IGNvZXJjZVRvQm9vbGVhbihza2lwTG9jYXRpb25DaGFuZ2UpO1xuICB9XG5cbiAgZ2V0IHNraXBMb2NhdGlvbkNoYW5nZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fc2tpcExvY2F0aW9uQ2hhbmdlO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI25hdmlnYXRlQnlVcmwgUm91dGVyI25hdmlnYXRlQnlVcmx9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zYC5cbiAgICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyNyZXBsYWNlVXJsIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjcmVwbGFjZVVybH1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI25hdmlnYXRlQnlVcmwgUm91dGVyI25hdmlnYXRlQnlVcmx9XG4gICAqL1xuICBASW5wdXQoKVxuICBzZXQgcmVwbGFjZVVybChyZXBsYWNlVXJsOiBib29sZWFufHN0cmluZ3xudWxsfHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3JlcGxhY2VVcmwgPSBjb2VyY2VUb0Jvb2xlYW4ocmVwbGFjZVVybCk7XG4gIH1cblxuICBnZXQgcmVwbGFjZVVybCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fcmVwbGFjZVVybDtcbiAgfVxuXG4gIC8qKlxuICAgKiBNb2RpZmllcyB0aGUgdGFiIGluZGV4IGlmIHRoZXJlIHdhcyBub3QgYSB0YWJpbmRleCBhdHRyaWJ1dGUgb24gdGhlIGVsZW1lbnQgZHVyaW5nXG4gICAqIGluc3RhbnRpYXRpb24uXG4gICAqL1xuICBwcml2YXRlIHNldFRhYkluZGV4SWZOb3RPbk5hdGl2ZUVsKG5ld1RhYkluZGV4OiBzdHJpbmd8bnVsbCkge1xuICAgIGlmICh0aGlzLnRhYkluZGV4QXR0cmlidXRlICE9IG51bGwgLyogYm90aCBgbnVsbGAgYW5kIGB1bmRlZmluZWRgICovIHx8IHRoaXMuaXNBbmNob3JFbGVtZW50KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuYXBwbHlBdHRyaWJ1dGVWYWx1ZSgndGFiaW5kZXgnLCBuZXdUYWJJbmRleCk7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpIHtcbiAgICBpZiAodGhpcy5pc0FuY2hvckVsZW1lbnQpIHtcbiAgICAgIHRoaXMudXBkYXRlSHJlZigpO1xuICAgIH1cbiAgICAvLyBUaGlzIGlzIHN1YnNjcmliZWQgdG8gYnkgYFJvdXRlckxpbmtBY3RpdmVgIHNvIHRoYXQgaXQga25vd3MgdG8gdXBkYXRlIHdoZW4gdGhlcmUgYXJlIGNoYW5nZXNcbiAgICAvLyB0byB0aGUgUm91dGVyTGlua3MgaXQncyB0cmFja2luZy5cbiAgICB0aGlzLm9uQ2hhbmdlcy5uZXh0KHRoaXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbW1hbmRzIHRvIHBhc3MgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfS5cbiAgICogICAtICoqYXJyYXkqKjogY29tbWFuZHMgdG8gcGFzcyB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9LlxuICAgKiAgIC0gKipzdHJpbmcqKjogc2hvcnRoYW5kIGZvciBhcnJheSBvZiBjb21tYW5kcyB3aXRoIGp1c3QgdGhlIHN0cmluZywgaS5lLiBgWycvcm91dGUnXWBcbiAgICogICAtICoqbnVsbHx1bmRlZmluZWQqKjogZWZmZWN0aXZlbHkgZGlzYWJsZXMgdGhlIGByb3V0ZXJMaW5rYFxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpXG4gIHNldCByb3V0ZXJMaW5rKGNvbW1hbmRzOiBhbnlbXXxzdHJpbmd8bnVsbHx1bmRlZmluZWQpIHtcbiAgICBpZiAoY29tbWFuZHMgIT0gbnVsbCkge1xuICAgICAgdGhpcy5jb21tYW5kcyA9IEFycmF5LmlzQXJyYXkoY29tbWFuZHMpID8gY29tbWFuZHMgOiBbY29tbWFuZHNdO1xuICAgICAgdGhpcy5zZXRUYWJJbmRleElmTm90T25OYXRpdmVFbCgnMCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbW1hbmRzID0gbnVsbDtcbiAgICAgIHRoaXMuc2V0VGFiSW5kZXhJZk5vdE9uTmF0aXZlRWwobnVsbCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBASG9zdExpc3RlbmVyKFxuICAgICAgJ2NsaWNrJyxcbiAgICAgIFsnJGV2ZW50LmJ1dHRvbicsICckZXZlbnQuY3RybEtleScsICckZXZlbnQuc2hpZnRLZXknLCAnJGV2ZW50LmFsdEtleScsICckZXZlbnQubWV0YUtleSddKVxuICBvbkNsaWNrKGJ1dHRvbjogbnVtYmVyLCBjdHJsS2V5OiBib29sZWFuLCBzaGlmdEtleTogYm9vbGVhbiwgYWx0S2V5OiBib29sZWFuLCBtZXRhS2V5OiBib29sZWFuKTpcbiAgICAgIGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLnVybFRyZWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzQW5jaG9yRWxlbWVudCkge1xuICAgICAgaWYgKGJ1dHRvbiAhPT0gMCB8fCBjdHJsS2V5IHx8IHNoaWZ0S2V5IHx8IGFsdEtleSB8fCBtZXRhS2V5KSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHRoaXMudGFyZ2V0ID09PSAnc3RyaW5nJyAmJiB0aGlzLnRhcmdldCAhPSAnX3NlbGYnKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGV4dHJhcyA9IHtcbiAgICAgIHNraXBMb2NhdGlvbkNoYW5nZTogdGhpcy5za2lwTG9jYXRpb25DaGFuZ2UsXG4gICAgICByZXBsYWNlVXJsOiB0aGlzLnJlcGxhY2VVcmwsXG4gICAgICBzdGF0ZTogdGhpcy5zdGF0ZSxcbiAgICB9O1xuICAgIHRoaXMucm91dGVyLm5hdmlnYXRlQnlVcmwodGhpcy51cmxUcmVlLCBleHRyYXMpO1xuXG4gICAgLy8gUmV0dXJuIGBmYWxzZWAgZm9yIGA8YT5gIGVsZW1lbnRzIHRvIHByZXZlbnQgZGVmYXVsdCBhY3Rpb25cbiAgICAvLyBhbmQgY2FuY2VsIHRoZSBuYXRpdmUgYmVoYXZpb3IsIHNpbmNlIHRoZSBuYXZpZ2F0aW9uIGlzIGhhbmRsZWRcbiAgICAvLyBieSB0aGUgUm91dGVyLlxuICAgIHJldHVybiAhdGhpcy5pc0FuY2hvckVsZW1lbnQ7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25EZXN0cm95KCk6IGFueSB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb24/LnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZUhyZWYoKTogdm9pZCB7XG4gICAgdGhpcy5ocmVmID0gdGhpcy51cmxUcmVlICE9PSBudWxsICYmIHRoaXMubG9jYXRpb25TdHJhdGVneSA/XG4gICAgICAgIHRoaXMubG9jYXRpb25TdHJhdGVneT8ucHJlcGFyZUV4dGVybmFsVXJsKHRoaXMucm91dGVyLnNlcmlhbGl6ZVVybCh0aGlzLnVybFRyZWUpKSA6XG4gICAgICAgIG51bGw7XG5cbiAgICBjb25zdCBzYW5pdGl6ZWRWYWx1ZSA9IHRoaXMuaHJlZiA9PT0gbnVsbCA/XG4gICAgICAgIG51bGwgOlxuICAgICAgICAvLyBUaGlzIGNsYXNzIHJlcHJlc2VudHMgYSBkaXJlY3RpdmUgdGhhdCBjYW4gYmUgYWRkZWQgdG8gYm90aCBgPGE+YCBlbGVtZW50cyxcbiAgICAgICAgLy8gYXMgd2VsbCBhcyBvdGhlciBlbGVtZW50cy4gQXMgYSByZXN1bHQsIHdlIGNhbid0IGRlZmluZSBzZWN1cml0eSBjb250ZXh0IGF0XG4gICAgICAgIC8vIGNvbXBpbGUgdGltZS4gU28gdGhlIHNlY3VyaXR5IGNvbnRleHQgaXMgZGVmZXJyZWQgdG8gcnVudGltZS5cbiAgICAgICAgLy8gVGhlIGDJtcm1c2FuaXRpemVVcmxPclJlc291cmNlVXJsYCBzZWxlY3RzIHRoZSBuZWNlc3Nhcnkgc2FuaXRpemVyIGZ1bmN0aW9uXG4gICAgICAgIC8vIGJhc2VkIG9uIHRoZSB0YWcgYW5kIHByb3BlcnR5IG5hbWVzLiBUaGUgbG9naWMgbWltaWNzIHRoZSBvbmUgZnJvbVxuICAgICAgICAvLyBgcGFja2FnZXMvY29tcGlsZXIvc3JjL3NjaGVtYS9kb21fc2VjdXJpdHlfc2NoZW1hLnRzYCwgd2hpY2ggaXMgdXNlZCBhdCBjb21waWxlIHRpbWUuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIE5vdGU6IHdlIHNob3VsZCBpbnZlc3RpZ2F0ZSB3aGV0aGVyIHdlIGNhbiBzd2l0Y2ggdG8gdXNpbmcgYEBIb3N0QmluZGluZygnYXR0ci5ocmVmJylgXG4gICAgICAgIC8vIGluc3RlYWQgb2YgYXBwbHlpbmcgYSB2YWx1ZSB2aWEgYSByZW5kZXJlciwgYWZ0ZXIgYSBmaW5hbCBtZXJnZSBvZiB0aGVcbiAgICAgICAgLy8gYFJvdXRlckxpbmtXaXRoSHJlZmAgZGlyZWN0aXZlLlxuICAgICAgICDJtcm1c2FuaXRpemVVcmxPclJlc291cmNlVXJsKHRoaXMuaHJlZiwgdGhpcy5lbC5uYXRpdmVFbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKSwgJ2hyZWYnKTtcbiAgICB0aGlzLmFwcGx5QXR0cmlidXRlVmFsdWUoJ2hyZWYnLCBzYW5pdGl6ZWRWYWx1ZSk7XG4gIH1cblxuICBwcml2YXRlIGFwcGx5QXR0cmlidXRlVmFsdWUoYXR0ck5hbWU6IHN0cmluZywgYXR0clZhbHVlOiBzdHJpbmd8bnVsbCkge1xuICAgIGNvbnN0IHJlbmRlcmVyID0gdGhpcy5yZW5kZXJlcjtcbiAgICBjb25zdCBuYXRpdmVFbGVtZW50ID0gdGhpcy5lbC5uYXRpdmVFbGVtZW50O1xuICAgIGlmIChhdHRyVmFsdWUgIT09IG51bGwpIHtcbiAgICAgIHJlbmRlcmVyLnNldEF0dHJpYnV0ZShuYXRpdmVFbGVtZW50LCBhdHRyTmFtZSwgYXR0clZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVuZGVyZXIucmVtb3ZlQXR0cmlidXRlKG5hdGl2ZUVsZW1lbnQsIGF0dHJOYW1lKTtcbiAgICB9XG4gIH1cblxuICBnZXQgdXJsVHJlZSgpOiBVcmxUcmVlfG51bGwge1xuICAgIGlmICh0aGlzLmNvbW1hbmRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucm91dGVyLmNyZWF0ZVVybFRyZWUodGhpcy5jb21tYW5kcywge1xuICAgICAgLy8gSWYgdGhlIGByZWxhdGl2ZVRvYCBpbnB1dCBpcyBub3QgZGVmaW5lZCwgd2Ugd2FudCB0byB1c2UgYHRoaXMucm91dGVgIGJ5IGRlZmF1bHQuXG4gICAgICAvLyBPdGhlcndpc2UsIHdlIHNob3VsZCB1c2UgdGhlIHZhbHVlIHByb3ZpZGVkIGJ5IHRoZSB1c2VyIGluIHRoZSBpbnB1dC5cbiAgICAgIHJlbGF0aXZlVG86IHRoaXMucmVsYXRpdmVUbyAhPT0gdW5kZWZpbmVkID8gdGhpcy5yZWxhdGl2ZVRvIDogdGhpcy5yb3V0ZSxcbiAgICAgIHF1ZXJ5UGFyYW1zOiB0aGlzLnF1ZXJ5UGFyYW1zLFxuICAgICAgZnJhZ21lbnQ6IHRoaXMuZnJhZ21lbnQsXG4gICAgICBxdWVyeVBhcmFtc0hhbmRsaW5nOiB0aGlzLnF1ZXJ5UGFyYW1zSGFuZGxpbmcsXG4gICAgICBwcmVzZXJ2ZUZyYWdtZW50OiB0aGlzLnByZXNlcnZlRnJhZ21lbnQsXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBMZXRzIHlvdSBsaW5rIHRvIHNwZWNpZmljIHJvdXRlcyBpbiB5b3VyIGFwcC5cbiAqXG4gKiBTZWUgYFJvdXRlckxpbmtgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICpcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBEaXJlY3RpdmUoe1xuICBzZWxlY3RvcjogJ2Fbcm91dGVyTGlua10sYXJlYVtyb3V0ZXJMaW5rXScsXG4gIHN0YW5kYWxvbmU6IHRydWUsXG59KVxuZXhwb3J0IGNsYXNzIFJvdXRlckxpbmtXaXRoSHJlZiBleHRlbmRzIFJvdXRlckxpbmsge1xuICAvLyBGb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHksIGNvbnN0cnVjdG9yIGFyZ3VtZW50cyByZXRhaW5lZCBhbiBvbGQgc2hhcGUuXG4gIGNvbnN0cnVjdG9yKHJvdXRlcjogUm91dGVyLCByb3V0ZTogQWN0aXZhdGVkUm91dGUsIGxvY2F0aW9uU3RyYXRlZ3k6IExvY2F0aW9uU3RyYXRlZ3kpIHtcbiAgICBzdXBlcihcbiAgICAgICAgcm91dGVyLCByb3V0ZSwgdW5kZWZpbmVkIC8qIHRhYkluZGV4QXR0cmlidXRlICovLCBpbmplY3QoUmVuZGVyZXIyKSwgaW5qZWN0KEVsZW1lbnRSZWYpLFxuICAgICAgICBsb2NhdGlvblN0cmF0ZWd5KTtcbiAgfVxufVxuIl19