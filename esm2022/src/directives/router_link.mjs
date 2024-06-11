/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { LocationStrategy } from '@angular/common';
import { Attribute, booleanAttribute, Directive, ElementRef, HostBinding, HostListener, Input, Renderer2, ɵRuntimeError as RuntimeError, ɵɵsanitizeUrlOrResourceUrl, } from '@angular/core';
import { Subject } from 'rxjs';
import { NavigationEnd } from '../events';
import { Router } from '../router';
import { ActivatedRoute } from '../router_state';
import { isUrlTree } from '../url_tree';
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
 * See {@link Router#createUrlTree} for more information.
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
 * `queryParams`, `fragment`, `queryParamsHandling`, `preserveFragment`, and `relativeTo`
 * cannot be used when the `routerLink` input is a `UrlTree`.
 *
 * See {@link UrlCreationOptions#queryParamsHandling}.
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
 * Use {@link Router#getCurrentNavigation} to retrieve a saved
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
        /**
         * Represents an `href` attribute value applied to a host element,
         * when a host element is `<a>`. For other tags, the value is `null`.
         */
        this.href = null;
        /** @internal */
        this.onChanges = new Subject();
        /**
         * Passed to {@link Router#createUrlTree} as part of the
         * `UrlCreationOptions`.
         * @see {@link UrlCreationOptions#preserveFragment}
         * @see {@link Router#createUrlTree}
         */
        this.preserveFragment = false;
        /**
         * Passed to {@link Router#navigateByUrl} as part of the
         * `NavigationBehaviorOptions`.
         * @see {@link NavigationBehaviorOptions#skipLocationChange}
         * @see {@link Router#navigateByUrl}
         */
        this.skipLocationChange = false;
        /**
         * Passed to {@link Router#navigateByUrl} as part of the
         * `NavigationBehaviorOptions`.
         * @see {@link NavigationBehaviorOptions#replaceUrl}
         * @see {@link Router#navigateByUrl}
         */
        this.replaceUrl = false;
        this.routerLinkInput = null;
        const tagName = el.nativeElement.tagName?.toLowerCase();
        this.isAnchorElement = tagName === 'a' || tagName === 'area';
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
    ngOnChanges() {
        if (ngDevMode &&
            isUrlTree(this.routerLinkInput) &&
            (this.fragment !== undefined ||
                this.queryParams ||
                this.queryParamsHandling ||
                this.preserveFragment ||
                this.relativeTo)) {
            throw new RuntimeError(4016 /* RuntimeErrorCode.INVALID_ROUTER_LINK_INPUTS */, 'Cannot configure queryParams or fragment when using a UrlTree as the routerLink input value.');
        }
        if (this.isAnchorElement) {
            this.updateHref();
        }
        // This is subscribed to by `RouterLinkActive` so that it knows to update when there are changes
        // to the RouterLinks it's tracking.
        this.onChanges.next(this);
    }
    /**
     * Commands to pass to {@link Router#createUrlTree} or a `UrlTree`.
     *   - **array**: commands to pass to {@link Router#createUrlTree}.
     *   - **string**: shorthand for array of commands with just the string, i.e. `['/route']`
     *   - **UrlTree**: a `UrlTree` for this link rather than creating one from the commands
     *     and other inputs that correspond to properties of `UrlCreationOptions`.
     *   - **null|undefined**: effectively disables the `routerLink`
     * @see {@link Router#createUrlTree}
     */
    set routerLink(commandsOrUrlTree) {
        if (commandsOrUrlTree == null) {
            this.routerLinkInput = null;
            this.setTabIndexIfNotOnNativeEl(null);
        }
        else {
            if (isUrlTree(commandsOrUrlTree)) {
                this.routerLinkInput = commandsOrUrlTree;
            }
            else {
                this.routerLinkInput = Array.isArray(commandsOrUrlTree)
                    ? commandsOrUrlTree
                    : [commandsOrUrlTree];
            }
            this.setTabIndexIfNotOnNativeEl('0');
        }
    }
    /** @nodoc */
    onClick(button, ctrlKey, shiftKey, altKey, metaKey) {
        const urlTree = this.urlTree;
        if (urlTree === null) {
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
            info: this.info,
        };
        this.router.navigateByUrl(urlTree, extras);
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
        const urlTree = this.urlTree;
        this.href =
            urlTree !== null && this.locationStrategy
                ? this.locationStrategy?.prepareExternalUrl(this.router.serializeUrl(urlTree))
                : null;
        const sanitizedValue = this.href === null
            ? null
            : // This class represents a directive that can be added to both `<a>` elements,
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
        if (this.routerLinkInput === null) {
            return null;
        }
        else if (isUrlTree(this.routerLinkInput)) {
            return this.routerLinkInput;
        }
        return this.router.createUrlTree(this.routerLinkInput, {
            // If the `relativeTo` input is not defined, we want to use `this.route` by default.
            // Otherwise, we should use the value provided by the user in the input.
            relativeTo: this.relativeTo !== undefined ? this.relativeTo : this.route,
            queryParams: this.queryParams,
            fragment: this.fragment,
            queryParamsHandling: this.queryParamsHandling,
            preserveFragment: this.preserveFragment,
        });
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.1.0-next.1+sha-567c2f6", ngImport: i0, type: RouterLink, deps: [{ token: i1.Router }, { token: i2.ActivatedRoute }, { token: 'tabindex', attribute: true }, { token: i0.Renderer2 }, { token: i0.ElementRef }, { token: i3.LocationStrategy }], target: i0.ɵɵFactoryTarget.Directive }); }
    static { this.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "16.1.0", version: "18.1.0-next.1+sha-567c2f6", type: RouterLink, isStandalone: true, selector: "[routerLink]", inputs: { target: "target", queryParams: "queryParams", fragment: "fragment", queryParamsHandling: "queryParamsHandling", state: "state", info: "info", relativeTo: "relativeTo", preserveFragment: ["preserveFragment", "preserveFragment", booleanAttribute], skipLocationChange: ["skipLocationChange", "skipLocationChange", booleanAttribute], replaceUrl: ["replaceUrl", "replaceUrl", booleanAttribute], routerLink: "routerLink" }, host: { listeners: { "click": "onClick($event.button,$event.ctrlKey,$event.shiftKey,$event.altKey,$event.metaKey)" }, properties: { "attr.target": "this.target" } }, usesOnChanges: true, ngImport: i0 }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.1.0-next.1+sha-567c2f6", ngImport: i0, type: RouterLink, decorators: [{
            type: Directive,
            args: [{
                    selector: '[routerLink]',
                    standalone: true,
                }]
        }], ctorParameters: () => [{ type: i1.Router }, { type: i2.ActivatedRoute }, { type: undefined, decorators: [{
                    type: Attribute,
                    args: ['tabindex']
                }] }, { type: i0.Renderer2 }, { type: i0.ElementRef }, { type: i3.LocationStrategy }], propDecorators: { target: [{
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
            }], info: [{
                type: Input
            }], relativeTo: [{
                type: Input
            }], preserveFragment: [{
                type: Input,
                args: [{ transform: booleanAttribute }]
            }], skipLocationChange: [{
                type: Input,
                args: [{ transform: booleanAttribute }]
            }], replaceUrl: [{
                type: Input,
                args: [{ transform: booleanAttribute }]
            }], routerLink: [{
                type: Input
            }], onClick: [{
                type: HostListener,
                args: ['click', [
                        '$event.button',
                        '$event.ctrlKey',
                        '$event.shiftKey',
                        '$event.altKey',
                        '$event.metaKey',
                    ]]
            }] } });
/**
 * @description
 * An alias for the `RouterLink` directive.
 * Deprecated since v15, use `RouterLink` directive instead.
 *
 * @deprecated use `RouterLink` directive instead.
 * @publicApi
 */
export { RouterLink as RouterLinkWithHref };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDakQsT0FBTyxFQUNMLFNBQVMsRUFDVCxnQkFBZ0IsRUFDaEIsU0FBUyxFQUNULFVBQVUsRUFDVixXQUFXLEVBQ1gsWUFBWSxFQUNaLEtBQUssRUFHTCxTQUFTLEVBQ1QsYUFBYSxJQUFJLFlBQVksRUFDN0IsMEJBQTBCLEdBQzNCLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBQyxPQUFPLEVBQWUsTUFBTSxNQUFNLENBQUM7QUFFM0MsT0FBTyxFQUFRLGFBQWEsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUUvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQ2pDLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUUvQyxPQUFPLEVBQUMsU0FBUyxFQUFVLE1BQU0sYUFBYSxDQUFDOzs7OztBQUcvQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBbUdHO0FBS0gsTUFBTSxPQUFPLFVBQVU7SUFtRXJCLFlBQ1UsTUFBYyxFQUNkLEtBQXFCLEVBQ1csaUJBQTRDLEVBQ25FLFFBQW1CLEVBQ25CLEVBQWMsRUFDdkIsZ0JBQW1DO1FBTG5DLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxVQUFLLEdBQUwsS0FBSyxDQUFnQjtRQUNXLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBMkI7UUFDbkUsYUFBUSxHQUFSLFFBQVEsQ0FBVztRQUNuQixPQUFF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Q2dDLGdCQUFnQjtzQkFBckQsS0FBSzt1QkFBQyxFQUFDLFNBQVMsRUFBRSxnQkFBZ0IsRUFBQztnQkFRRSxrQkFBa0I7c0JBQXZELEtBQUs7dUJBQUMsRUFBQyxTQUFTLEVBQUUsZ0JBQWdCLEVBQUM7Z0JBUUUsVUFBVTtzQkFBL0MsS0FBSzt1QkFBQyxFQUFDLFNBQVMsRUFBRSxnQkFBZ0IsRUFBQztnQkFpRGhDLFVBQVU7c0JBRGIsS0FBSztnQkF5Qk4sT0FBTztzQkFQTixZQUFZO3VCQUFDLE9BQU8sRUFBRTt3QkFDckIsZUFBZTt3QkFDZixnQkFBZ0I7d0JBQ2hCLGlCQUFpQjt3QkFDakIsZUFBZTt3QkFDZixnQkFBZ0I7cUJBQ2pCOztBQW1HSDs7Ozs7OztHQU9HO0FBQ0gsT0FBTyxFQUFDLFVBQVUsSUFBSSxrQkFBa0IsRUFBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb25TdHJhdGVneX0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7XG4gIEF0dHJpYnV0ZSxcbiAgYm9vbGVhbkF0dHJpYnV0ZSxcbiAgRGlyZWN0aXZlLFxuICBFbGVtZW50UmVmLFxuICBIb3N0QmluZGluZyxcbiAgSG9zdExpc3RlbmVyLFxuICBJbnB1dCxcbiAgT25DaGFuZ2VzLFxuICBPbkRlc3Ryb3ksXG4gIFJlbmRlcmVyMixcbiAgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yLFxuICDJtcm1c2FuaXRpemVVcmxPclJlc291cmNlVXJsLFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7U3ViamVjdCwgU3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtFdmVudCwgTmF2aWdhdGlvbkVuZH0gZnJvbSAnLi4vZXZlbnRzJztcbmltcG9ydCB7UXVlcnlQYXJhbXNIYW5kbGluZ30gZnJvbSAnLi4vbW9kZWxzJztcbmltcG9ydCB7Um91dGVyfSBmcm9tICcuLi9yb3V0ZXInO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZX0gZnJvbSAnLi4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UGFyYW1zfSBmcm9tICcuLi9zaGFyZWQnO1xuaW1wb3J0IHtpc1VybFRyZWUsIFVybFRyZWV9IGZyb20gJy4uL3VybF90cmVlJztcbmltcG9ydCB7UnVudGltZUVycm9yQ29kZX0gZnJvbSAnLi4vZXJyb3JzJztcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBXaGVuIGFwcGxpZWQgdG8gYW4gZWxlbWVudCBpbiBhIHRlbXBsYXRlLCBtYWtlcyB0aGF0IGVsZW1lbnQgYSBsaW5rXG4gKiB0aGF0IGluaXRpYXRlcyBuYXZpZ2F0aW9uIHRvIGEgcm91dGUuIE5hdmlnYXRpb24gb3BlbnMgb25lIG9yIG1vcmUgcm91dGVkIGNvbXBvbmVudHNcbiAqIGluIG9uZSBvciBtb3JlIGA8cm91dGVyLW91dGxldD5gIGxvY2F0aW9ucyBvbiB0aGUgcGFnZS5cbiAqXG4gKiBHaXZlbiBhIHJvdXRlIGNvbmZpZ3VyYXRpb24gYFt7IHBhdGg6ICd1c2VyLzpuYW1lJywgY29tcG9uZW50OiBVc2VyQ21wIH1dYCxcbiAqIHRoZSBmb2xsb3dpbmcgY3JlYXRlcyBhIHN0YXRpYyBsaW5rIHRvIHRoZSByb3V0ZTpcbiAqIGA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCI+bGluayB0byB1c2VyIGNvbXBvbmVudDwvYT5gXG4gKlxuICogWW91IGNhbiB1c2UgZHluYW1pYyB2YWx1ZXMgdG8gZ2VuZXJhdGUgdGhlIGxpbmsuXG4gKiBGb3IgYSBkeW5hbWljIGxpbmssIHBhc3MgYW4gYXJyYXkgb2YgcGF0aCBzZWdtZW50cyxcbiAqIGZvbGxvd2VkIGJ5IHRoZSBwYXJhbXMgZm9yIGVhY2ggc2VnbWVudC5cbiAqIEZvciBleGFtcGxlLCBgWycvdGVhbScsIHRlYW1JZCwgJ3VzZXInLCB1c2VyTmFtZSwge2RldGFpbHM6IHRydWV9XWBcbiAqIGdlbmVyYXRlcyBhIGxpbmsgdG8gYC90ZWFtLzExL3VzZXIvYm9iO2RldGFpbHM9dHJ1ZWAuXG4gKlxuICogTXVsdGlwbGUgc3RhdGljIHNlZ21lbnRzIGNhbiBiZSBtZXJnZWQgaW50byBvbmUgdGVybSBhbmQgY29tYmluZWQgd2l0aCBkeW5hbWljIHNlZ21lbnRzLlxuICogRm9yIGV4YW1wbGUsIGBbJy90ZWFtLzExL3VzZXInLCB1c2VyTmFtZSwge2RldGFpbHM6IHRydWV9XWBcbiAqXG4gKiBUaGUgaW5wdXQgdGhhdCB5b3UgcHJvdmlkZSB0byB0aGUgbGluayBpcyB0cmVhdGVkIGFzIGEgZGVsdGEgdG8gdGhlIGN1cnJlbnQgVVJMLlxuICogRm9yIGluc3RhbmNlLCBzdXBwb3NlIHRoZSBjdXJyZW50IFVSTCBpcyBgL3VzZXIvKGJveC8vYXV4OnRlYW0pYC5cbiAqIFRoZSBsaW5rIGA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2ppbSddXCI+SmltPC9hPmAgY3JlYXRlcyB0aGUgVVJMXG4gKiBgL3VzZXIvKGppbS8vYXV4OnRlYW0pYC5cbiAqIFNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogWW91IGNhbiB1c2UgYWJzb2x1dGUgb3IgcmVsYXRpdmUgcGF0aHMgaW4gYSBsaW5rLCBzZXQgcXVlcnkgcGFyYW1ldGVycyxcbiAqIGNvbnRyb2wgaG93IHBhcmFtZXRlcnMgYXJlIGhhbmRsZWQsIGFuZCBrZWVwIGEgaGlzdG9yeSBvZiBuYXZpZ2F0aW9uIHN0YXRlcy5cbiAqXG4gKiAjIyMgUmVsYXRpdmUgbGluayBwYXRoc1xuICpcbiAqIFRoZSBmaXJzdCBzZWdtZW50IG5hbWUgY2FuIGJlIHByZXBlbmRlZCB3aXRoIGAvYCwgYC4vYCwgb3IgYC4uL2AuXG4gKiAqIElmIHRoZSBmaXJzdCBzZWdtZW50IGJlZ2lucyB3aXRoIGAvYCwgdGhlIHJvdXRlciBsb29rcyB1cCB0aGUgcm91dGUgZnJvbSB0aGUgcm9vdCBvZiB0aGVcbiAqICAgYXBwLlxuICogKiBJZiB0aGUgZmlyc3Qgc2VnbWVudCBiZWdpbnMgd2l0aCBgLi9gLCBvciBkb2Vzbid0IGJlZ2luIHdpdGggYSBzbGFzaCwgdGhlIHJvdXRlclxuICogICBsb29rcyBpbiB0aGUgY2hpbGRyZW4gb2YgdGhlIGN1cnJlbnQgYWN0aXZhdGVkIHJvdXRlLlxuICogKiBJZiB0aGUgZmlyc3Qgc2VnbWVudCBiZWdpbnMgd2l0aCBgLi4vYCwgdGhlIHJvdXRlciBnb2VzIHVwIG9uZSBsZXZlbCBpbiB0aGUgcm91dGUgdHJlZS5cbiAqXG4gKiAjIyMgU2V0dGluZyBhbmQgaGFuZGxpbmcgcXVlcnkgcGFyYW1zIGFuZCBmcmFnbWVudHNcbiAqXG4gKiBUaGUgZm9sbG93aW5nIGxpbmsgYWRkcyBhIHF1ZXJ5IHBhcmFtZXRlciBhbmQgYSBmcmFnbWVudCB0byB0aGUgZ2VuZXJhdGVkIFVSTDpcbiAqXG4gKiBgYGBcbiAqIDxhIFtyb3V0ZXJMaW5rXT1cIlsnL3VzZXIvYm9iJ11cIiBbcXVlcnlQYXJhbXNdPVwie2RlYnVnOiB0cnVlfVwiIGZyYWdtZW50PVwiZWR1Y2F0aW9uXCI+XG4gKiAgIGxpbmsgdG8gdXNlciBjb21wb25lbnRcbiAqIDwvYT5cbiAqIGBgYFxuICogQnkgZGVmYXVsdCwgdGhlIGRpcmVjdGl2ZSBjb25zdHJ1Y3RzIHRoZSBuZXcgVVJMIHVzaW5nIHRoZSBnaXZlbiBxdWVyeSBwYXJhbWV0ZXJzLlxuICogVGhlIGV4YW1wbGUgZ2VuZXJhdGVzIHRoZSBsaW5rOiBgL3VzZXIvYm9iP2RlYnVnPXRydWUjZWR1Y2F0aW9uYC5cbiAqXG4gKiBZb3UgY2FuIGluc3RydWN0IHRoZSBkaXJlY3RpdmUgdG8gaGFuZGxlIHF1ZXJ5IHBhcmFtZXRlcnMgZGlmZmVyZW50bHlcbiAqIGJ5IHNwZWNpZnlpbmcgdGhlIGBxdWVyeVBhcmFtc0hhbmRsaW5nYCBvcHRpb24gaW4gdGhlIGxpbmsuXG4gKiBBbGxvd2VkIHZhbHVlcyBhcmU6XG4gKlxuICogIC0gYCdtZXJnZSdgOiBNZXJnZSB0aGUgZ2l2ZW4gYHF1ZXJ5UGFyYW1zYCBpbnRvIHRoZSBjdXJyZW50IHF1ZXJ5IHBhcmFtcy5cbiAqICAtIGAncHJlc2VydmUnYDogUHJlc2VydmUgdGhlIGN1cnJlbnQgcXVlcnkgcGFyYW1zLlxuICpcbiAqIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogPGEgW3JvdXRlckxpbmtdPVwiWycvdXNlci9ib2InXVwiIFtxdWVyeVBhcmFtc109XCJ7ZGVidWc6IHRydWV9XCIgcXVlcnlQYXJhbXNIYW5kbGluZz1cIm1lcmdlXCI+XG4gKiAgIGxpbmsgdG8gdXNlciBjb21wb25lbnRcbiAqIDwvYT5cbiAqIGBgYFxuICpcbiAqIGBxdWVyeVBhcmFtc2AsIGBmcmFnbWVudGAsIGBxdWVyeVBhcmFtc0hhbmRsaW5nYCwgYHByZXNlcnZlRnJhZ21lbnRgLCBhbmQgYHJlbGF0aXZlVG9gXG4gKiBjYW5ub3QgYmUgdXNlZCB3aGVuIHRoZSBgcm91dGVyTGlua2AgaW5wdXQgaXMgYSBgVXJsVHJlZWAuXG4gKlxuICogU2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcXVlcnlQYXJhbXNIYW5kbGluZ30uXG4gKlxuICogIyMjIFByZXNlcnZpbmcgbmF2aWdhdGlvbiBoaXN0b3J5XG4gKlxuICogWW91IGNhbiBwcm92aWRlIGEgYHN0YXRlYCB2YWx1ZSB0byBiZSBwZXJzaXN0ZWQgdG8gdGhlIGJyb3dzZXInc1xuICogW2BIaXN0b3J5LnN0YXRlYCBwcm9wZXJ0eV0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0hpc3RvcnkjUHJvcGVydGllcykuXG4gKiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIDxhIFtyb3V0ZXJMaW5rXT1cIlsnL3VzZXIvYm9iJ11cIiBbc3RhdGVdPVwie3RyYWNpbmdJZDogMTIzfVwiPlxuICogICBsaW5rIHRvIHVzZXIgY29tcG9uZW50XG4gKiA8L2E+XG4gKiBgYGBcbiAqXG4gKiBVc2Uge0BsaW5rIFJvdXRlciNnZXRDdXJyZW50TmF2aWdhdGlvbn0gdG8gcmV0cmlldmUgYSBzYXZlZFxuICogbmF2aWdhdGlvbi1zdGF0ZSB2YWx1ZS4gRm9yIGV4YW1wbGUsIHRvIGNhcHR1cmUgdGhlIGB0cmFjaW5nSWRgIGR1cmluZyB0aGUgYE5hdmlnYXRpb25TdGFydGBcbiAqIGV2ZW50OlxuICpcbiAqIGBgYFxuICogLy8gR2V0IE5hdmlnYXRpb25TdGFydCBldmVudHNcbiAqIHJvdXRlci5ldmVudHMucGlwZShmaWx0ZXIoZSA9PiBlIGluc3RhbmNlb2YgTmF2aWdhdGlvblN0YXJ0KSkuc3Vic2NyaWJlKGUgPT4ge1xuICogICBjb25zdCBuYXZpZ2F0aW9uID0gcm91dGVyLmdldEN1cnJlbnROYXZpZ2F0aW9uKCk7XG4gKiAgIHRyYWNpbmdTZXJ2aWNlLnRyYWNlKHtpZDogbmF2aWdhdGlvbi5leHRyYXMuc3RhdGUudHJhY2luZ0lkfSk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBEaXJlY3RpdmUoe1xuICBzZWxlY3RvcjogJ1tyb3V0ZXJMaW5rXScsXG4gIHN0YW5kYWxvbmU6IHRydWUsXG59KVxuZXhwb3J0IGNsYXNzIFJvdXRlckxpbmsgaW1wbGVtZW50cyBPbkNoYW5nZXMsIE9uRGVzdHJveSB7XG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIGFuIGBocmVmYCBhdHRyaWJ1dGUgdmFsdWUgYXBwbGllZCB0byBhIGhvc3QgZWxlbWVudCxcbiAgICogd2hlbiBhIGhvc3QgZWxlbWVudCBpcyBgPGE+YC4gRm9yIG90aGVyIHRhZ3MsIHRoZSB2YWx1ZSBpcyBgbnVsbGAuXG4gICAqL1xuICBocmVmOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogUmVwcmVzZW50cyB0aGUgYHRhcmdldGAgYXR0cmlidXRlIG9uIGEgaG9zdCBlbGVtZW50LlxuICAgKiBUaGlzIGlzIG9ubHkgdXNlZCB3aGVuIHRoZSBob3N0IGVsZW1lbnQgaXMgYW4gYDxhPmAgdGFnLlxuICAgKi9cbiAgQEhvc3RCaW5kaW5nKCdhdHRyLnRhcmdldCcpIEBJbnB1dCgpIHRhcmdldD86IHN0cmluZztcblxuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGVcbiAgICogYFVybENyZWF0aW9uT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNxdWVyeVBhcmFtc31cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKSBxdWVyeVBhcmFtcz86IFBhcmFtcyB8IG51bGw7XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgVXJsQ3JlYXRpb25PcHRpb25zYC5cbiAgICogQHNlZSB7QGxpbmsgVXJsQ3JlYXRpb25PcHRpb25zI2ZyYWdtZW50fVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpIGZyYWdtZW50Pzogc3RyaW5nO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGVcbiAgICogYFVybENyZWF0aW9uT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNxdWVyeVBhcmFtc0hhbmRsaW5nfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpIHF1ZXJ5UGFyYW1zSGFuZGxpbmc/OiBRdWVyeVBhcmFtc0hhbmRsaW5nIHwgbnVsbDtcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI25hdmlnYXRlQnlVcmx9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zYC5cbiAgICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyNzdGF0ZX1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI25hdmlnYXRlQnlVcmx9XG4gICAqL1xuICBASW5wdXQoKSBzdGF0ZT86IHtbazogc3RyaW5nXTogYW55fTtcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI25hdmlnYXRlQnlVcmx9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zYC5cbiAgICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyNpbmZvfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybH1cbiAgICovXG4gIEBJbnB1dCgpIGluZm8/OiB1bmtub3duO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGVcbiAgICogYFVybENyZWF0aW9uT3B0aW9uc2AuXG4gICAqIFNwZWNpZnkgYSB2YWx1ZSBoZXJlIHdoZW4geW91IGRvIG5vdCB3YW50IHRvIHVzZSB0aGUgZGVmYXVsdCB2YWx1ZVxuICAgKiBmb3IgYHJvdXRlckxpbmtgLCB3aGljaCBpcyB0aGUgY3VycmVudCBhY3RpdmF0ZWQgcm91dGUuXG4gICAqIE5vdGUgdGhhdCBhIHZhbHVlIG9mIGB1bmRlZmluZWRgIGhlcmUgd2lsbCB1c2UgdGhlIGByb3V0ZXJMaW5rYCBkZWZhdWx0LlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcmVsYXRpdmVUb31cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKSByZWxhdGl2ZVRvPzogQWN0aXZhdGVkUm91dGUgfCBudWxsO1xuXG4gIC8qKiBXaGV0aGVyIGEgaG9zdCBlbGVtZW50IGlzIGFuIGA8YT5gIHRhZy4gKi9cbiAgcHJpdmF0ZSBpc0FuY2hvckVsZW1lbnQ6IGJvb2xlYW47XG5cbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb24/OiBTdWJzY3JpcHRpb247XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBvbkNoYW5nZXMgPSBuZXcgU3ViamVjdDxSb3V0ZXJMaW5rPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsXG4gICAgcHJpdmF0ZSByb3V0ZTogQWN0aXZhdGVkUm91dGUsXG4gICAgQEF0dHJpYnV0ZSgndGFiaW5kZXgnKSBwcml2YXRlIHJlYWRvbmx5IHRhYkluZGV4QXR0cmlidXRlOiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmVuZGVyZXI6IFJlbmRlcmVyMixcbiAgICBwcml2YXRlIHJlYWRvbmx5IGVsOiBFbGVtZW50UmVmLFxuICAgIHByaXZhdGUgbG9jYXRpb25TdHJhdGVneT86IExvY2F0aW9uU3RyYXRlZ3ksXG4gICkge1xuICAgIGNvbnN0IHRhZ05hbWUgPSBlbC5uYXRpdmVFbGVtZW50LnRhZ05hbWU/LnRvTG93ZXJDYXNlKCk7XG4gICAgdGhpcy5pc0FuY2hvckVsZW1lbnQgPSB0YWdOYW1lID09PSAnYScgfHwgdGFnTmFtZSA9PT0gJ2FyZWEnO1xuXG4gICAgaWYgKHRoaXMuaXNBbmNob3JFbGVtZW50KSB7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbiA9IHJvdXRlci5ldmVudHMuc3Vic2NyaWJlKChzOiBFdmVudCkgPT4ge1xuICAgICAgICBpZiAocyBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZUhyZWYoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2V0VGFiSW5kZXhJZk5vdE9uTmF0aXZlRWwoJzAnKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGVcbiAgICogYFVybENyZWF0aW9uT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNwcmVzZXJ2ZUZyYWdtZW50fVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCh7dHJhbnNmb3JtOiBib29sZWFuQXR0cmlidXRlfSkgcHJlc2VydmVGcmFnbWVudDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjc2tpcExvY2F0aW9uQ2hhbmdlfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybH1cbiAgICovXG4gIEBJbnB1dCh7dHJhbnNmb3JtOiBib29sZWFuQXR0cmlidXRlfSkgc2tpcExvY2F0aW9uQ2hhbmdlOiBib29sZWFuID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI25hdmlnYXRlQnlVcmx9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zYC5cbiAgICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyNyZXBsYWNlVXJsfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybH1cbiAgICovXG4gIEBJbnB1dCh7dHJhbnNmb3JtOiBib29sZWFuQXR0cmlidXRlfSkgcmVwbGFjZVVybDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBNb2RpZmllcyB0aGUgdGFiIGluZGV4IGlmIHRoZXJlIHdhcyBub3QgYSB0YWJpbmRleCBhdHRyaWJ1dGUgb24gdGhlIGVsZW1lbnQgZHVyaW5nXG4gICAqIGluc3RhbnRpYXRpb24uXG4gICAqL1xuICBwcml2YXRlIHNldFRhYkluZGV4SWZOb3RPbk5hdGl2ZUVsKG5ld1RhYkluZGV4OiBzdHJpbmcgfCBudWxsKSB7XG4gICAgaWYgKHRoaXMudGFiSW5kZXhBdHRyaWJ1dGUgIT0gbnVsbCAvKiBib3RoIGBudWxsYCBhbmQgYHVuZGVmaW5lZGAgKi8gfHwgdGhpcy5pc0FuY2hvckVsZW1lbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5hcHBseUF0dHJpYnV0ZVZhbHVlKCd0YWJpbmRleCcsIG5ld1RhYkluZGV4KTtcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkNoYW5nZXMoKSB7XG4gICAgaWYgKFxuICAgICAgbmdEZXZNb2RlICYmXG4gICAgICBpc1VybFRyZWUodGhpcy5yb3V0ZXJMaW5rSW5wdXQpICYmXG4gICAgICAodGhpcy5mcmFnbWVudCAhPT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIHRoaXMucXVlcnlQYXJhbXMgfHxcbiAgICAgICAgdGhpcy5xdWVyeVBhcmFtc0hhbmRsaW5nIHx8XG4gICAgICAgIHRoaXMucHJlc2VydmVGcmFnbWVudCB8fFxuICAgICAgICB0aGlzLnJlbGF0aXZlVG8pXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICBSdW50aW1lRXJyb3JDb2RlLklOVkFMSURfUk9VVEVSX0xJTktfSU5QVVRTLFxuICAgICAgICAnQ2Fubm90IGNvbmZpZ3VyZSBxdWVyeVBhcmFtcyBvciBmcmFnbWVudCB3aGVuIHVzaW5nIGEgVXJsVHJlZSBhcyB0aGUgcm91dGVyTGluayBpbnB1dCB2YWx1ZS4nLFxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuaXNBbmNob3JFbGVtZW50KSB7XG4gICAgICB0aGlzLnVwZGF0ZUhyZWYoKTtcbiAgICB9XG4gICAgLy8gVGhpcyBpcyBzdWJzY3JpYmVkIHRvIGJ5IGBSb3V0ZXJMaW5rQWN0aXZlYCBzbyB0aGF0IGl0IGtub3dzIHRvIHVwZGF0ZSB3aGVuIHRoZXJlIGFyZSBjaGFuZ2VzXG4gICAgLy8gdG8gdGhlIFJvdXRlckxpbmtzIGl0J3MgdHJhY2tpbmcuXG4gICAgdGhpcy5vbkNoYW5nZXMubmV4dCh0aGlzKTtcbiAgfVxuXG4gIHByaXZhdGUgcm91dGVyTGlua0lucHV0OiBhbnlbXSB8IFVybFRyZWUgfCBudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogQ29tbWFuZHMgdG8gcGFzcyB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9IG9yIGEgYFVybFRyZWVgLlxuICAgKiAgIC0gKiphcnJheSoqOiBjb21tYW5kcyB0byBwYXNzIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0uXG4gICAqICAgLSAqKnN0cmluZyoqOiBzaG9ydGhhbmQgZm9yIGFycmF5IG9mIGNvbW1hbmRzIHdpdGgganVzdCB0aGUgc3RyaW5nLCBpLmUuIGBbJy9yb3V0ZSddYFxuICAgKiAgIC0gKipVcmxUcmVlKio6IGEgYFVybFRyZWVgIGZvciB0aGlzIGxpbmsgcmF0aGVyIHRoYW4gY3JlYXRpbmcgb25lIGZyb20gdGhlIGNvbW1hbmRzXG4gICAqICAgICBhbmQgb3RoZXIgaW5wdXRzIHRoYXQgY29ycmVzcG9uZCB0byBwcm9wZXJ0aWVzIG9mIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiAgIC0gKipudWxsfHVuZGVmaW5lZCoqOiBlZmZlY3RpdmVseSBkaXNhYmxlcyB0aGUgYHJvdXRlckxpbmtgXG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgQElucHV0KClcbiAgc2V0IHJvdXRlckxpbmsoY29tbWFuZHNPclVybFRyZWU6IGFueVtdIHwgc3RyaW5nIHwgVXJsVHJlZSB8IG51bGwgfCB1bmRlZmluZWQpIHtcbiAgICBpZiAoY29tbWFuZHNPclVybFRyZWUgPT0gbnVsbCkge1xuICAgICAgdGhpcy5yb3V0ZXJMaW5rSW5wdXQgPSBudWxsO1xuICAgICAgdGhpcy5zZXRUYWJJbmRleElmTm90T25OYXRpdmVFbChudWxsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGlzVXJsVHJlZShjb21tYW5kc09yVXJsVHJlZSkpIHtcbiAgICAgICAgdGhpcy5yb3V0ZXJMaW5rSW5wdXQgPSBjb21tYW5kc09yVXJsVHJlZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucm91dGVyTGlua0lucHV0ID0gQXJyYXkuaXNBcnJheShjb21tYW5kc09yVXJsVHJlZSlcbiAgICAgICAgICA/IGNvbW1hbmRzT3JVcmxUcmVlXG4gICAgICAgICAgOiBbY29tbWFuZHNPclVybFRyZWVdO1xuICAgICAgfVxuICAgICAgdGhpcy5zZXRUYWJJbmRleElmTm90T25OYXRpdmVFbCgnMCcpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgQEhvc3RMaXN0ZW5lcignY2xpY2snLCBbXG4gICAgJyRldmVudC5idXR0b24nLFxuICAgICckZXZlbnQuY3RybEtleScsXG4gICAgJyRldmVudC5zaGlmdEtleScsXG4gICAgJyRldmVudC5hbHRLZXknLFxuICAgICckZXZlbnQubWV0YUtleScsXG4gIF0pXG4gIG9uQ2xpY2soXG4gICAgYnV0dG9uOiBudW1iZXIsXG4gICAgY3RybEtleTogYm9vbGVhbixcbiAgICBzaGlmdEtleTogYm9vbGVhbixcbiAgICBhbHRLZXk6IGJvb2xlYW4sXG4gICAgbWV0YUtleTogYm9vbGVhbixcbiAgKTogYm9vbGVhbiB7XG4gICAgY29uc3QgdXJsVHJlZSA9IHRoaXMudXJsVHJlZTtcblxuICAgIGlmICh1cmxUcmVlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc0FuY2hvckVsZW1lbnQpIHtcbiAgICAgIGlmIChidXR0b24gIT09IDAgfHwgY3RybEtleSB8fCBzaGlmdEtleSB8fCBhbHRLZXkgfHwgbWV0YUtleSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB0aGlzLnRhcmdldCA9PT0gJ3N0cmluZycgJiYgdGhpcy50YXJnZXQgIT0gJ19zZWxmJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBleHRyYXMgPSB7XG4gICAgICBza2lwTG9jYXRpb25DaGFuZ2U6IHRoaXMuc2tpcExvY2F0aW9uQ2hhbmdlLFxuICAgICAgcmVwbGFjZVVybDogdGhpcy5yZXBsYWNlVXJsLFxuICAgICAgc3RhdGU6IHRoaXMuc3RhdGUsXG4gICAgICBpbmZvOiB0aGlzLmluZm8sXG4gICAgfTtcbiAgICB0aGlzLnJvdXRlci5uYXZpZ2F0ZUJ5VXJsKHVybFRyZWUsIGV4dHJhcyk7XG5cbiAgICAvLyBSZXR1cm4gYGZhbHNlYCBmb3IgYDxhPmAgZWxlbWVudHMgdG8gcHJldmVudCBkZWZhdWx0IGFjdGlvblxuICAgIC8vIGFuZCBjYW5jZWwgdGhlIG5hdGl2ZSBiZWhhdmlvciwgc2luY2UgdGhlIG5hdmlnYXRpb24gaXMgaGFuZGxlZFxuICAgIC8vIGJ5IHRoZSBSb3V0ZXIuXG4gICAgcmV0dXJuICF0aGlzLmlzQW5jaG9yRWxlbWVudDtcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkRlc3Ryb3koKTogYW55IHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbj8udW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlSHJlZigpOiB2b2lkIHtcbiAgICBjb25zdCB1cmxUcmVlID0gdGhpcy51cmxUcmVlO1xuICAgIHRoaXMuaHJlZiA9XG4gICAgICB1cmxUcmVlICE9PSBudWxsICYmIHRoaXMubG9jYXRpb25TdHJhdGVneVxuICAgICAgICA/IHRoaXMubG9jYXRpb25TdHJhdGVneT8ucHJlcGFyZUV4dGVybmFsVXJsKHRoaXMucm91dGVyLnNlcmlhbGl6ZVVybCh1cmxUcmVlKSlcbiAgICAgICAgOiBudWxsO1xuXG4gICAgY29uc3Qgc2FuaXRpemVkVmFsdWUgPVxuICAgICAgdGhpcy5ocmVmID09PSBudWxsXG4gICAgICAgID8gbnVsbFxuICAgICAgICA6IC8vIFRoaXMgY2xhc3MgcmVwcmVzZW50cyBhIGRpcmVjdGl2ZSB0aGF0IGNhbiBiZSBhZGRlZCB0byBib3RoIGA8YT5gIGVsZW1lbnRzLFxuICAgICAgICAgIC8vIGFzIHdlbGwgYXMgb3RoZXIgZWxlbWVudHMuIEFzIGEgcmVzdWx0LCB3ZSBjYW4ndCBkZWZpbmUgc2VjdXJpdHkgY29udGV4dCBhdFxuICAgICAgICAgIC8vIGNvbXBpbGUgdGltZS4gU28gdGhlIHNlY3VyaXR5IGNvbnRleHQgaXMgZGVmZXJyZWQgdG8gcnVudGltZS5cbiAgICAgICAgICAvLyBUaGUgYMm1ybVzYW5pdGl6ZVVybE9yUmVzb3VyY2VVcmxgIHNlbGVjdHMgdGhlIG5lY2Vzc2FyeSBzYW5pdGl6ZXIgZnVuY3Rpb25cbiAgICAgICAgICAvLyBiYXNlZCBvbiB0aGUgdGFnIGFuZCBwcm9wZXJ0eSBuYW1lcy4gVGhlIGxvZ2ljIG1pbWljcyB0aGUgb25lIGZyb21cbiAgICAgICAgICAvLyBgcGFja2FnZXMvY29tcGlsZXIvc3JjL3NjaGVtYS9kb21fc2VjdXJpdHlfc2NoZW1hLnRzYCwgd2hpY2ggaXMgdXNlZCBhdCBjb21waWxlIHRpbWUuXG4gICAgICAgICAgLy9cbiAgICAgICAgICAvLyBOb3RlOiB3ZSBzaG91bGQgaW52ZXN0aWdhdGUgd2hldGhlciB3ZSBjYW4gc3dpdGNoIHRvIHVzaW5nIGBASG9zdEJpbmRpbmcoJ2F0dHIuaHJlZicpYFxuICAgICAgICAgIC8vIGluc3RlYWQgb2YgYXBwbHlpbmcgYSB2YWx1ZSB2aWEgYSByZW5kZXJlciwgYWZ0ZXIgYSBmaW5hbCBtZXJnZSBvZiB0aGVcbiAgICAgICAgICAvLyBgUm91dGVyTGlua1dpdGhIcmVmYCBkaXJlY3RpdmUuXG4gICAgICAgICAgybXJtXNhbml0aXplVXJsT3JSZXNvdXJjZVVybChcbiAgICAgICAgICAgIHRoaXMuaHJlZixcbiAgICAgICAgICAgIHRoaXMuZWwubmF0aXZlRWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCksXG4gICAgICAgICAgICAnaHJlZicsXG4gICAgICAgICAgKTtcbiAgICB0aGlzLmFwcGx5QXR0cmlidXRlVmFsdWUoJ2hyZWYnLCBzYW5pdGl6ZWRWYWx1ZSk7XG4gIH1cblxuICBwcml2YXRlIGFwcGx5QXR0cmlidXRlVmFsdWUoYXR0ck5hbWU6IHN0cmluZywgYXR0clZhbHVlOiBzdHJpbmcgfCBudWxsKSB7XG4gICAgY29uc3QgcmVuZGVyZXIgPSB0aGlzLnJlbmRlcmVyO1xuICAgIGNvbnN0IG5hdGl2ZUVsZW1lbnQgPSB0aGlzLmVsLm5hdGl2ZUVsZW1lbnQ7XG4gICAgaWYgKGF0dHJWYWx1ZSAhPT0gbnVsbCkge1xuICAgICAgcmVuZGVyZXIuc2V0QXR0cmlidXRlKG5hdGl2ZUVsZW1lbnQsIGF0dHJOYW1lLCBhdHRyVmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZW5kZXJlci5yZW1vdmVBdHRyaWJ1dGUobmF0aXZlRWxlbWVudCwgYXR0ck5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIGdldCB1cmxUcmVlKCk6IFVybFRyZWUgfCBudWxsIHtcbiAgICBpZiAodGhpcy5yb3V0ZXJMaW5rSW5wdXQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoaXNVcmxUcmVlKHRoaXMucm91dGVyTGlua0lucHV0KSkge1xuICAgICAgcmV0dXJuIHRoaXMucm91dGVyTGlua0lucHV0O1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yb3V0ZXIuY3JlYXRlVXJsVHJlZSh0aGlzLnJvdXRlckxpbmtJbnB1dCwge1xuICAgICAgLy8gSWYgdGhlIGByZWxhdGl2ZVRvYCBpbnB1dCBpcyBub3QgZGVmaW5lZCwgd2Ugd2FudCB0byB1c2UgYHRoaXMucm91dGVgIGJ5IGRlZmF1bHQuXG4gICAgICAvLyBPdGhlcndpc2UsIHdlIHNob3VsZCB1c2UgdGhlIHZhbHVlIHByb3ZpZGVkIGJ5IHRoZSB1c2VyIGluIHRoZSBpbnB1dC5cbiAgICAgIHJlbGF0aXZlVG86IHRoaXMucmVsYXRpdmVUbyAhPT0gdW5kZWZpbmVkID8gdGhpcy5yZWxhdGl2ZVRvIDogdGhpcy5yb3V0ZSxcbiAgICAgIHF1ZXJ5UGFyYW1zOiB0aGlzLnF1ZXJ5UGFyYW1zLFxuICAgICAgZnJhZ21lbnQ6IHRoaXMuZnJhZ21lbnQsXG4gICAgICBxdWVyeVBhcmFtc0hhbmRsaW5nOiB0aGlzLnF1ZXJ5UGFyYW1zSGFuZGxpbmcsXG4gICAgICBwcmVzZXJ2ZUZyYWdtZW50OiB0aGlzLnByZXNlcnZlRnJhZ21lbnQsXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEFuIGFsaWFzIGZvciB0aGUgYFJvdXRlckxpbmtgIGRpcmVjdGl2ZS5cbiAqIERlcHJlY2F0ZWQgc2luY2UgdjE1LCB1c2UgYFJvdXRlckxpbmtgIGRpcmVjdGl2ZSBpbnN0ZWFkLlxuICpcbiAqIEBkZXByZWNhdGVkIHVzZSBgUm91dGVyTGlua2AgZGlyZWN0aXZlIGluc3RlYWQuXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB7Um91dGVyTGluayBhcyBSb3V0ZXJMaW5rV2l0aEhyZWZ9O1xuIl19