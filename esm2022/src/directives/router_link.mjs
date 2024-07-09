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
    // TODO(atscott): Remove changes parameter in major version as a breaking change.
    ngOnChanges(changes) {
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.0-next.0+sha-31b235b", ngImport: i0, type: RouterLink, deps: [{ token: i1.Router }, { token: i2.ActivatedRoute }, { token: 'tabindex', attribute: true }, { token: i0.Renderer2 }, { token: i0.ElementRef }, { token: i3.LocationStrategy }], target: i0.ɵɵFactoryTarget.Directive }); }
    static { this.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "16.1.0", version: "18.2.0-next.0+sha-31b235b", type: RouterLink, isStandalone: true, selector: "[routerLink]", inputs: { target: "target", queryParams: "queryParams", fragment: "fragment", queryParamsHandling: "queryParamsHandling", state: "state", info: "info", relativeTo: "relativeTo", preserveFragment: ["preserveFragment", "preserveFragment", booleanAttribute], skipLocationChange: ["skipLocationChange", "skipLocationChange", booleanAttribute], replaceUrl: ["replaceUrl", "replaceUrl", booleanAttribute], routerLink: "routerLink" }, host: { listeners: { "click": "onClick($event.button,$event.ctrlKey,$event.shiftKey,$event.altKey,$event.metaKey)" }, properties: { "attr.target": "this.target" } }, usesOnChanges: true, ngImport: i0 }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.0-next.0+sha-31b235b", ngImport: i0, type: RouterLink, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDakQsT0FBTyxFQUNMLFNBQVMsRUFDVCxnQkFBZ0IsRUFDaEIsU0FBUyxFQUNULFVBQVUsRUFDVixXQUFXLEVBQ1gsWUFBWSxFQUNaLEtBQUssRUFHTCxTQUFTLEVBQ1QsYUFBYSxJQUFJLFlBQVksRUFFN0IsMEJBQTBCLEdBQzNCLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBQyxPQUFPLEVBQWUsTUFBTSxNQUFNLENBQUM7QUFFM0MsT0FBTyxFQUFRLGFBQWEsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUUvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQ2pDLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUUvQyxPQUFPLEVBQUMsU0FBUyxFQUFVLE1BQU0sYUFBYSxDQUFDOzs7OztBQUcvQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBbUdHO0FBS0gsTUFBTSxPQUFPLFVBQVU7SUFtRXJCLFlBQ1UsTUFBYyxFQUNkLEtBQXFCLEVBQ1csaUJBQTRDLEVBQ25FLFFBQW1CLEVBQ25CLEVBQWMsRUFDdkIsZ0JBQW1DO1FBTG5DLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxVQUFLLEdBQUwsS0FBSyxDQUFnQjtRQUNXLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBMkI7UUFDbkUsYUFBUSxHQUFSLFFBQVEsQ0FBVztRQUNuQixPQUFF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QVVHLFVBQVU7c0JBQWxCLEtBQUs7Z0JBc0NnQyxnQkFBZ0I7c0JBQXJELEtBQUs7dUJBQUMsRUFBQyxTQUFTLEVBQUUsZ0JBQWdCLEVBQUM7Z0JBUUUsa0JBQWtCO3NCQUF2RCxLQUFLO3VCQUFDLEVBQUMsU0FBUyxFQUFFLGdCQUFnQixFQUFDO2dCQVFFLFVBQVU7c0JBQS9DLEtBQUs7dUJBQUMsRUFBQyxTQUFTLEVBQUUsZ0JBQWdCLEVBQUM7Z0JBa0RoQyxVQUFVO3NCQURiLEtBQUs7Z0JBeUJOLE9BQU87c0JBUE4sWUFBWTt1QkFBQyxPQUFPLEVBQUU7d0JBQ3JCLGVBQWU7d0JBQ2YsZ0JBQWdCO3dCQUNoQixpQkFBaUI7d0JBQ2pCLGVBQWU7d0JBQ2YsZ0JBQWdCO3FCQUNqQjs7QUFtR0g7Ozs7Ozs7R0FPRztBQUNILE9BQU8sRUFBQyxVQUFVLElBQUksa0JBQWtCLEVBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9uU3RyYXRlZ3l9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge1xuICBBdHRyaWJ1dGUsXG4gIGJvb2xlYW5BdHRyaWJ1dGUsXG4gIERpcmVjdGl2ZSxcbiAgRWxlbWVudFJlZixcbiAgSG9zdEJpbmRpbmcsXG4gIEhvc3RMaXN0ZW5lcixcbiAgSW5wdXQsXG4gIE9uQ2hhbmdlcyxcbiAgT25EZXN0cm95LFxuICBSZW5kZXJlcjIsXG4gIMm1UnVudGltZUVycm9yIGFzIFJ1bnRpbWVFcnJvcixcbiAgU2ltcGxlQ2hhbmdlcyxcbiAgybXJtXNhbml0aXplVXJsT3JSZXNvdXJjZVVybCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge1N1YmplY3QsIFN1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7RXZlbnQsIE5hdmlnYXRpb25FbmR9IGZyb20gJy4uL2V2ZW50cyc7XG5pbXBvcnQge1F1ZXJ5UGFyYW1zSGFuZGxpbmd9IGZyb20gJy4uL21vZGVscyc7XG5pbXBvcnQge1JvdXRlcn0gZnJvbSAnLi4vcm91dGVyJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGV9IGZyb20gJy4uL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BhcmFtc30gZnJvbSAnLi4vc2hhcmVkJztcbmltcG9ydCB7aXNVcmxUcmVlLCBVcmxUcmVlfSBmcm9tICcuLi91cmxfdHJlZSc7XG5pbXBvcnQge1J1bnRpbWVFcnJvckNvZGV9IGZyb20gJy4uL2Vycm9ycyc7XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogV2hlbiBhcHBsaWVkIHRvIGFuIGVsZW1lbnQgaW4gYSB0ZW1wbGF0ZSwgbWFrZXMgdGhhdCBlbGVtZW50IGEgbGlua1xuICogdGhhdCBpbml0aWF0ZXMgbmF2aWdhdGlvbiB0byBhIHJvdXRlLiBOYXZpZ2F0aW9uIG9wZW5zIG9uZSBvciBtb3JlIHJvdXRlZCBjb21wb25lbnRzXG4gKiBpbiBvbmUgb3IgbW9yZSBgPHJvdXRlci1vdXRsZXQ+YCBsb2NhdGlvbnMgb24gdGhlIHBhZ2UuXG4gKlxuICogR2l2ZW4gYSByb3V0ZSBjb25maWd1cmF0aW9uIGBbeyBwYXRoOiAndXNlci86bmFtZScsIGNvbXBvbmVudDogVXNlckNtcCB9XWAsXG4gKiB0aGUgZm9sbG93aW5nIGNyZWF0ZXMgYSBzdGF0aWMgbGluayB0byB0aGUgcm91dGU6XG4gKiBgPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiPmxpbmsgdG8gdXNlciBjb21wb25lbnQ8L2E+YFxuICpcbiAqIFlvdSBjYW4gdXNlIGR5bmFtaWMgdmFsdWVzIHRvIGdlbmVyYXRlIHRoZSBsaW5rLlxuICogRm9yIGEgZHluYW1pYyBsaW5rLCBwYXNzIGFuIGFycmF5IG9mIHBhdGggc2VnbWVudHMsXG4gKiBmb2xsb3dlZCBieSB0aGUgcGFyYW1zIGZvciBlYWNoIHNlZ21lbnQuXG4gKiBGb3IgZXhhbXBsZSwgYFsnL3RlYW0nLCB0ZWFtSWQsICd1c2VyJywgdXNlck5hbWUsIHtkZXRhaWxzOiB0cnVlfV1gXG4gKiBnZW5lcmF0ZXMgYSBsaW5rIHRvIGAvdGVhbS8xMS91c2VyL2JvYjtkZXRhaWxzPXRydWVgLlxuICpcbiAqIE11bHRpcGxlIHN0YXRpYyBzZWdtZW50cyBjYW4gYmUgbWVyZ2VkIGludG8gb25lIHRlcm0gYW5kIGNvbWJpbmVkIHdpdGggZHluYW1pYyBzZWdtZW50cy5cbiAqIEZvciBleGFtcGxlLCBgWycvdGVhbS8xMS91c2VyJywgdXNlck5hbWUsIHtkZXRhaWxzOiB0cnVlfV1gXG4gKlxuICogVGhlIGlucHV0IHRoYXQgeW91IHByb3ZpZGUgdG8gdGhlIGxpbmsgaXMgdHJlYXRlZCBhcyBhIGRlbHRhIHRvIHRoZSBjdXJyZW50IFVSTC5cbiAqIEZvciBpbnN0YW5jZSwgc3VwcG9zZSB0aGUgY3VycmVudCBVUkwgaXMgYC91c2VyLyhib3gvL2F1eDp0ZWFtKWAuXG4gKiBUaGUgbGluayBgPGEgW3JvdXRlckxpbmtdPVwiWycvdXNlci9qaW0nXVwiPkppbTwvYT5gIGNyZWF0ZXMgdGhlIFVSTFxuICogYC91c2VyLyhqaW0vL2F1eDp0ZWFtKWAuXG4gKiBTZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIFlvdSBjYW4gdXNlIGFic29sdXRlIG9yIHJlbGF0aXZlIHBhdGhzIGluIGEgbGluaywgc2V0IHF1ZXJ5IHBhcmFtZXRlcnMsXG4gKiBjb250cm9sIGhvdyBwYXJhbWV0ZXJzIGFyZSBoYW5kbGVkLCBhbmQga2VlcCBhIGhpc3Rvcnkgb2YgbmF2aWdhdGlvbiBzdGF0ZXMuXG4gKlxuICogIyMjIFJlbGF0aXZlIGxpbmsgcGF0aHNcbiAqXG4gKiBUaGUgZmlyc3Qgc2VnbWVudCBuYW1lIGNhbiBiZSBwcmVwZW5kZWQgd2l0aCBgL2AsIGAuL2AsIG9yIGAuLi9gLlxuICogKiBJZiB0aGUgZmlyc3Qgc2VnbWVudCBiZWdpbnMgd2l0aCBgL2AsIHRoZSByb3V0ZXIgbG9va3MgdXAgdGhlIHJvdXRlIGZyb20gdGhlIHJvb3Qgb2YgdGhlXG4gKiAgIGFwcC5cbiAqICogSWYgdGhlIGZpcnN0IHNlZ21lbnQgYmVnaW5zIHdpdGggYC4vYCwgb3IgZG9lc24ndCBiZWdpbiB3aXRoIGEgc2xhc2gsIHRoZSByb3V0ZXJcbiAqICAgbG9va3MgaW4gdGhlIGNoaWxkcmVuIG9mIHRoZSBjdXJyZW50IGFjdGl2YXRlZCByb3V0ZS5cbiAqICogSWYgdGhlIGZpcnN0IHNlZ21lbnQgYmVnaW5zIHdpdGggYC4uL2AsIHRoZSByb3V0ZXIgZ29lcyB1cCBvbmUgbGV2ZWwgaW4gdGhlIHJvdXRlIHRyZWUuXG4gKlxuICogIyMjIFNldHRpbmcgYW5kIGhhbmRsaW5nIHF1ZXJ5IHBhcmFtcyBhbmQgZnJhZ21lbnRzXG4gKlxuICogVGhlIGZvbGxvd2luZyBsaW5rIGFkZHMgYSBxdWVyeSBwYXJhbWV0ZXIgYW5kIGEgZnJhZ21lbnQgdG8gdGhlIGdlbmVyYXRlZCBVUkw6XG4gKlxuICogYGBgXG4gKiA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2JvYiddXCIgW3F1ZXJ5UGFyYW1zXT1cIntkZWJ1ZzogdHJ1ZX1cIiBmcmFnbWVudD1cImVkdWNhdGlvblwiPlxuICogICBsaW5rIHRvIHVzZXIgY29tcG9uZW50XG4gKiA8L2E+XG4gKiBgYGBcbiAqIEJ5IGRlZmF1bHQsIHRoZSBkaXJlY3RpdmUgY29uc3RydWN0cyB0aGUgbmV3IFVSTCB1c2luZyB0aGUgZ2l2ZW4gcXVlcnkgcGFyYW1ldGVycy5cbiAqIFRoZSBleGFtcGxlIGdlbmVyYXRlcyB0aGUgbGluazogYC91c2VyL2JvYj9kZWJ1Zz10cnVlI2VkdWNhdGlvbmAuXG4gKlxuICogWW91IGNhbiBpbnN0cnVjdCB0aGUgZGlyZWN0aXZlIHRvIGhhbmRsZSBxdWVyeSBwYXJhbWV0ZXJzIGRpZmZlcmVudGx5XG4gKiBieSBzcGVjaWZ5aW5nIHRoZSBgcXVlcnlQYXJhbXNIYW5kbGluZ2Agb3B0aW9uIGluIHRoZSBsaW5rLlxuICogQWxsb3dlZCB2YWx1ZXMgYXJlOlxuICpcbiAqICAtIGAnbWVyZ2UnYDogTWVyZ2UgdGhlIGdpdmVuIGBxdWVyeVBhcmFtc2AgaW50byB0aGUgY3VycmVudCBxdWVyeSBwYXJhbXMuXG4gKiAgLSBgJ3ByZXNlcnZlJ2A6IFByZXNlcnZlIHRoZSBjdXJyZW50IHF1ZXJ5IHBhcmFtcy5cbiAqXG4gKiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIDxhIFtyb3V0ZXJMaW5rXT1cIlsnL3VzZXIvYm9iJ11cIiBbcXVlcnlQYXJhbXNdPVwie2RlYnVnOiB0cnVlfVwiIHF1ZXJ5UGFyYW1zSGFuZGxpbmc9XCJtZXJnZVwiPlxuICogICBsaW5rIHRvIHVzZXIgY29tcG9uZW50XG4gKiA8L2E+XG4gKiBgYGBcbiAqXG4gKiBgcXVlcnlQYXJhbXNgLCBgZnJhZ21lbnRgLCBgcXVlcnlQYXJhbXNIYW5kbGluZ2AsIGBwcmVzZXJ2ZUZyYWdtZW50YCwgYW5kIGByZWxhdGl2ZVRvYFxuICogY2Fubm90IGJlIHVzZWQgd2hlbiB0aGUgYHJvdXRlckxpbmtgIGlucHV0IGlzIGEgYFVybFRyZWVgLlxuICpcbiAqIFNlZSB7QGxpbmsgVXJsQ3JlYXRpb25PcHRpb25zI3F1ZXJ5UGFyYW1zSGFuZGxpbmd9LlxuICpcbiAqICMjIyBQcmVzZXJ2aW5nIG5hdmlnYXRpb24gaGlzdG9yeVxuICpcbiAqIFlvdSBjYW4gcHJvdmlkZSBhIGBzdGF0ZWAgdmFsdWUgdG8gYmUgcGVyc2lzdGVkIHRvIHRoZSBicm93c2VyJ3NcbiAqIFtgSGlzdG9yeS5zdGF0ZWAgcHJvcGVydHldKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9IaXN0b3J5I1Byb3BlcnRpZXMpLlxuICogRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2JvYiddXCIgW3N0YXRlXT1cInt0cmFjaW5nSWQ6IDEyM31cIj5cbiAqICAgbGluayB0byB1c2VyIGNvbXBvbmVudFxuICogPC9hPlxuICogYGBgXG4gKlxuICogVXNlIHtAbGluayBSb3V0ZXIjZ2V0Q3VycmVudE5hdmlnYXRpb259IHRvIHJldHJpZXZlIGEgc2F2ZWRcbiAqIG5hdmlnYXRpb24tc3RhdGUgdmFsdWUuIEZvciBleGFtcGxlLCB0byBjYXB0dXJlIHRoZSBgdHJhY2luZ0lkYCBkdXJpbmcgdGhlIGBOYXZpZ2F0aW9uU3RhcnRgXG4gKiBldmVudDpcbiAqXG4gKiBgYGBcbiAqIC8vIEdldCBOYXZpZ2F0aW9uU3RhcnQgZXZlbnRzXG4gKiByb3V0ZXIuZXZlbnRzLnBpcGUoZmlsdGVyKGUgPT4gZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25TdGFydCkpLnN1YnNjcmliZShlID0+IHtcbiAqICAgY29uc3QgbmF2aWdhdGlvbiA9IHJvdXRlci5nZXRDdXJyZW50TmF2aWdhdGlvbigpO1xuICogICB0cmFjaW5nU2VydmljZS50cmFjZSh7aWQ6IG5hdmlnYXRpb24uZXh0cmFzLnN0YXRlLnRyYWNpbmdJZH0pO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ARGlyZWN0aXZlKHtcbiAgc2VsZWN0b3I6ICdbcm91dGVyTGlua10nLFxuICBzdGFuZGFsb25lOiB0cnVlLFxufSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJMaW5rIGltcGxlbWVudHMgT25DaGFuZ2VzLCBPbkRlc3Ryb3kge1xuICAvKipcbiAgICogUmVwcmVzZW50cyBhbiBgaHJlZmAgYXR0cmlidXRlIHZhbHVlIGFwcGxpZWQgdG8gYSBob3N0IGVsZW1lbnQsXG4gICAqIHdoZW4gYSBob3N0IGVsZW1lbnQgaXMgYDxhPmAuIEZvciBvdGhlciB0YWdzLCB0aGUgdmFsdWUgaXMgYG51bGxgLlxuICAgKi9cbiAgaHJlZjogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgdGhlIGB0YXJnZXRgIGF0dHJpYnV0ZSBvbiBhIGhvc3QgZWxlbWVudC5cbiAgICogVGhpcyBpcyBvbmx5IHVzZWQgd2hlbiB0aGUgaG9zdCBlbGVtZW50IGlzIGFuIGA8YT5gIHRhZy5cbiAgICovXG4gIEBIb3N0QmluZGluZygnYXR0ci50YXJnZXQnKSBASW5wdXQoKSB0YXJnZXQ/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcXVlcnlQYXJhbXN9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgQElucHV0KCkgcXVlcnlQYXJhbXM/OiBQYXJhbXMgfCBudWxsO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGVcbiAgICogYFVybENyZWF0aW9uT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNmcmFnbWVudH1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKSBmcmFnbWVudD86IHN0cmluZztcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcXVlcnlQYXJhbXNIYW5kbGluZ31cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKSBxdWVyeVBhcmFtc0hhbmRsaW5nPzogUXVlcnlQYXJhbXNIYW5kbGluZyB8IG51bGw7XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjc3RhdGV9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfVxuICAgKi9cbiAgQElucHV0KCkgc3RhdGU/OiB7W2s6IHN0cmluZ106IGFueX07XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjaW5mb31cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI25hdmlnYXRlQnlVcmx9XG4gICAqL1xuICBASW5wdXQoKSBpbmZvPzogdW5rbm93bjtcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiBTcGVjaWZ5IGEgdmFsdWUgaGVyZSB3aGVuIHlvdSBkbyBub3Qgd2FudCB0byB1c2UgdGhlIGRlZmF1bHQgdmFsdWVcbiAgICogZm9yIGByb3V0ZXJMaW5rYCwgd2hpY2ggaXMgdGhlIGN1cnJlbnQgYWN0aXZhdGVkIHJvdXRlLlxuICAgKiBOb3RlIHRoYXQgYSB2YWx1ZSBvZiBgdW5kZWZpbmVkYCBoZXJlIHdpbGwgdXNlIHRoZSBgcm91dGVyTGlua2AgZGVmYXVsdC5cbiAgICogQHNlZSB7QGxpbmsgVXJsQ3JlYXRpb25PcHRpb25zI3JlbGF0aXZlVG99XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgQElucHV0KCkgcmVsYXRpdmVUbz86IEFjdGl2YXRlZFJvdXRlIHwgbnVsbDtcblxuICAvKiogV2hldGhlciBhIGhvc3QgZWxlbWVudCBpcyBhbiBgPGE+YCB0YWcuICovXG4gIHByaXZhdGUgaXNBbmNob3JFbGVtZW50OiBib29sZWFuO1xuXG4gIHByaXZhdGUgc3Vic2NyaXB0aW9uPzogU3Vic2NyaXB0aW9uO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgb25DaGFuZ2VzID0gbmV3IFN1YmplY3Q8Um91dGVyTGluaz4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLFxuICAgIHByaXZhdGUgcm91dGU6IEFjdGl2YXRlZFJvdXRlLFxuICAgIEBBdHRyaWJ1dGUoJ3RhYmluZGV4JykgcHJpdmF0ZSByZWFkb25seSB0YWJJbmRleEF0dHJpYnV0ZTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJlbmRlcmVyOiBSZW5kZXJlcjIsXG4gICAgcHJpdmF0ZSByZWFkb25seSBlbDogRWxlbWVudFJlZixcbiAgICBwcml2YXRlIGxvY2F0aW9uU3RyYXRlZ3k/OiBMb2NhdGlvblN0cmF0ZWd5LFxuICApIHtcbiAgICBjb25zdCB0YWdOYW1lID0gZWwubmF0aXZlRWxlbWVudC50YWdOYW1lPy50b0xvd2VyQ2FzZSgpO1xuICAgIHRoaXMuaXNBbmNob3JFbGVtZW50ID0gdGFnTmFtZSA9PT0gJ2EnIHx8IHRhZ05hbWUgPT09ICdhcmVhJztcblxuICAgIGlmICh0aGlzLmlzQW5jaG9yRWxlbWVudCkge1xuICAgICAgdGhpcy5zdWJzY3JpcHRpb24gPSByb3V0ZXIuZXZlbnRzLnN1YnNjcmliZSgoczogRXZlbnQpID0+IHtcbiAgICAgICAgaWYgKHMgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICAgICAgdGhpcy51cGRhdGVIcmVmKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNldFRhYkluZGV4SWZOb3RPbk5hdGl2ZUVsKCcwJyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcHJlc2VydmVGcmFnbWVudH1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoe3RyYW5zZm9ybTogYm9vbGVhbkF0dHJpYnV0ZX0pIHByZXNlcnZlRnJhZ21lbnQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybH0gYXMgcGFydCBvZiB0aGVcbiAgICogYE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zI3NraXBMb2NhdGlvbkNoYW5nZX1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI25hdmlnYXRlQnlVcmx9XG4gICAqL1xuICBASW5wdXQoe3RyYW5zZm9ybTogYm9vbGVhbkF0dHJpYnV0ZX0pIHNraXBMb2NhdGlvbkNoYW5nZTogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjcmVwbGFjZVVybH1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI25hdmlnYXRlQnlVcmx9XG4gICAqL1xuICBASW5wdXQoe3RyYW5zZm9ybTogYm9vbGVhbkF0dHJpYnV0ZX0pIHJlcGxhY2VVcmw6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAvKipcbiAgICogTW9kaWZpZXMgdGhlIHRhYiBpbmRleCBpZiB0aGVyZSB3YXMgbm90IGEgdGFiaW5kZXggYXR0cmlidXRlIG9uIHRoZSBlbGVtZW50IGR1cmluZ1xuICAgKiBpbnN0YW50aWF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBzZXRUYWJJbmRleElmTm90T25OYXRpdmVFbChuZXdUYWJJbmRleDogc3RyaW5nIHwgbnVsbCkge1xuICAgIGlmICh0aGlzLnRhYkluZGV4QXR0cmlidXRlICE9IG51bGwgLyogYm90aCBgbnVsbGAgYW5kIGB1bmRlZmluZWRgICovIHx8IHRoaXMuaXNBbmNob3JFbGVtZW50KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuYXBwbHlBdHRyaWJ1dGVWYWx1ZSgndGFiaW5kZXgnLCBuZXdUYWJJbmRleCk7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIC8vIFRPRE8oYXRzY290dCk6IFJlbW92ZSBjaGFuZ2VzIHBhcmFtZXRlciBpbiBtYWpvciB2ZXJzaW9uIGFzIGEgYnJlYWtpbmcgY2hhbmdlLlxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzPzogU2ltcGxlQ2hhbmdlcykge1xuICAgIGlmIChcbiAgICAgIG5nRGV2TW9kZSAmJlxuICAgICAgaXNVcmxUcmVlKHRoaXMucm91dGVyTGlua0lucHV0KSAmJlxuICAgICAgKHRoaXMuZnJhZ21lbnQgIT09IHVuZGVmaW5lZCB8fFxuICAgICAgICB0aGlzLnF1ZXJ5UGFyYW1zIHx8XG4gICAgICAgIHRoaXMucXVlcnlQYXJhbXNIYW5kbGluZyB8fFxuICAgICAgICB0aGlzLnByZXNlcnZlRnJhZ21lbnQgfHxcbiAgICAgICAgdGhpcy5yZWxhdGl2ZVRvKVxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgUnVudGltZUVycm9yQ29kZS5JTlZBTElEX1JPVVRFUl9MSU5LX0lOUFVUUyxcbiAgICAgICAgJ0Nhbm5vdCBjb25maWd1cmUgcXVlcnlQYXJhbXMgb3IgZnJhZ21lbnQgd2hlbiB1c2luZyBhIFVybFRyZWUgYXMgdGhlIHJvdXRlckxpbmsgaW5wdXQgdmFsdWUuJyxcbiAgICAgICk7XG4gICAgfVxuICAgIGlmICh0aGlzLmlzQW5jaG9yRWxlbWVudCkge1xuICAgICAgdGhpcy51cGRhdGVIcmVmKCk7XG4gICAgfVxuICAgIC8vIFRoaXMgaXMgc3Vic2NyaWJlZCB0byBieSBgUm91dGVyTGlua0FjdGl2ZWAgc28gdGhhdCBpdCBrbm93cyB0byB1cGRhdGUgd2hlbiB0aGVyZSBhcmUgY2hhbmdlc1xuICAgIC8vIHRvIHRoZSBSb3V0ZXJMaW5rcyBpdCdzIHRyYWNraW5nLlxuICAgIHRoaXMub25DaGFuZ2VzLm5leHQodGhpcyk7XG4gIH1cblxuICBwcml2YXRlIHJvdXRlckxpbmtJbnB1dDogYW55W10gfCBVcmxUcmVlIHwgbnVsbCA9IG51bGw7XG5cbiAgLyoqXG4gICAqIENvbW1hbmRzIHRvIHBhc3MgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBvciBhIGBVcmxUcmVlYC5cbiAgICogICAtICoqYXJyYXkqKjogY29tbWFuZHMgdG8gcGFzcyB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9LlxuICAgKiAgIC0gKipzdHJpbmcqKjogc2hvcnRoYW5kIGZvciBhcnJheSBvZiBjb21tYW5kcyB3aXRoIGp1c3QgdGhlIHN0cmluZywgaS5lLiBgWycvcm91dGUnXWBcbiAgICogICAtICoqVXJsVHJlZSoqOiBhIGBVcmxUcmVlYCBmb3IgdGhpcyBsaW5rIHJhdGhlciB0aGFuIGNyZWF0aW5nIG9uZSBmcm9tIHRoZSBjb21tYW5kc1xuICAgKiAgICAgYW5kIG90aGVyIGlucHV0cyB0aGF0IGNvcnJlc3BvbmQgdG8gcHJvcGVydGllcyBvZiBgVXJsQ3JlYXRpb25PcHRpb25zYC5cbiAgICogICAtICoqbnVsbHx1bmRlZmluZWQqKjogZWZmZWN0aXZlbHkgZGlzYWJsZXMgdGhlIGByb3V0ZXJMaW5rYFxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpXG4gIHNldCByb3V0ZXJMaW5rKGNvbW1hbmRzT3JVcmxUcmVlOiBhbnlbXSB8IHN0cmluZyB8IFVybFRyZWUgfCBudWxsIHwgdW5kZWZpbmVkKSB7XG4gICAgaWYgKGNvbW1hbmRzT3JVcmxUcmVlID09IG51bGwpIHtcbiAgICAgIHRoaXMucm91dGVyTGlua0lucHV0ID0gbnVsbDtcbiAgICAgIHRoaXMuc2V0VGFiSW5kZXhJZk5vdE9uTmF0aXZlRWwobnVsbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChpc1VybFRyZWUoY29tbWFuZHNPclVybFRyZWUpKSB7XG4gICAgICAgIHRoaXMucm91dGVyTGlua0lucHV0ID0gY29tbWFuZHNPclVybFRyZWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJvdXRlckxpbmtJbnB1dCA9IEFycmF5LmlzQXJyYXkoY29tbWFuZHNPclVybFRyZWUpXG4gICAgICAgICAgPyBjb21tYW5kc09yVXJsVHJlZVxuICAgICAgICAgIDogW2NvbW1hbmRzT3JVcmxUcmVlXTtcbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0VGFiSW5kZXhJZk5vdE9uTmF0aXZlRWwoJzAnKTtcbiAgICB9XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIEBIb3N0TGlzdGVuZXIoJ2NsaWNrJywgW1xuICAgICckZXZlbnQuYnV0dG9uJyxcbiAgICAnJGV2ZW50LmN0cmxLZXknLFxuICAgICckZXZlbnQuc2hpZnRLZXknLFxuICAgICckZXZlbnQuYWx0S2V5JyxcbiAgICAnJGV2ZW50Lm1ldGFLZXknLFxuICBdKVxuICBvbkNsaWNrKFxuICAgIGJ1dHRvbjogbnVtYmVyLFxuICAgIGN0cmxLZXk6IGJvb2xlYW4sXG4gICAgc2hpZnRLZXk6IGJvb2xlYW4sXG4gICAgYWx0S2V5OiBib29sZWFuLFxuICAgIG1ldGFLZXk6IGJvb2xlYW4sXG4gICk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHVybFRyZWUgPSB0aGlzLnVybFRyZWU7XG5cbiAgICBpZiAodXJsVHJlZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuaXNBbmNob3JFbGVtZW50KSB7XG4gICAgICBpZiAoYnV0dG9uICE9PSAwIHx8IGN0cmxLZXkgfHwgc2hpZnRLZXkgfHwgYWx0S2V5IHx8IG1ldGFLZXkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgdGhpcy50YXJnZXQgPT09ICdzdHJpbmcnICYmIHRoaXMudGFyZ2V0ICE9ICdfc2VsZicpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZXh0cmFzID0ge1xuICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiB0aGlzLnNraXBMb2NhdGlvbkNoYW5nZSxcbiAgICAgIHJlcGxhY2VVcmw6IHRoaXMucmVwbGFjZVVybCxcbiAgICAgIHN0YXRlOiB0aGlzLnN0YXRlLFxuICAgICAgaW5mbzogdGhpcy5pbmZvLFxuICAgIH07XG4gICAgdGhpcy5yb3V0ZXIubmF2aWdhdGVCeVVybCh1cmxUcmVlLCBleHRyYXMpO1xuXG4gICAgLy8gUmV0dXJuIGBmYWxzZWAgZm9yIGA8YT5gIGVsZW1lbnRzIHRvIHByZXZlbnQgZGVmYXVsdCBhY3Rpb25cbiAgICAvLyBhbmQgY2FuY2VsIHRoZSBuYXRpdmUgYmVoYXZpb3IsIHNpbmNlIHRoZSBuYXZpZ2F0aW9uIGlzIGhhbmRsZWRcbiAgICAvLyBieSB0aGUgUm91dGVyLlxuICAgIHJldHVybiAhdGhpcy5pc0FuY2hvckVsZW1lbnQ7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25EZXN0cm95KCk6IGFueSB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb24/LnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZUhyZWYoKTogdm9pZCB7XG4gICAgY29uc3QgdXJsVHJlZSA9IHRoaXMudXJsVHJlZTtcbiAgICB0aGlzLmhyZWYgPVxuICAgICAgdXJsVHJlZSAhPT0gbnVsbCAmJiB0aGlzLmxvY2F0aW9uU3RyYXRlZ3lcbiAgICAgICAgPyB0aGlzLmxvY2F0aW9uU3RyYXRlZ3k/LnByZXBhcmVFeHRlcm5hbFVybCh0aGlzLnJvdXRlci5zZXJpYWxpemVVcmwodXJsVHJlZSkpXG4gICAgICAgIDogbnVsbDtcblxuICAgIGNvbnN0IHNhbml0aXplZFZhbHVlID1cbiAgICAgIHRoaXMuaHJlZiA9PT0gbnVsbFxuICAgICAgICA/IG51bGxcbiAgICAgICAgOiAvLyBUaGlzIGNsYXNzIHJlcHJlc2VudHMgYSBkaXJlY3RpdmUgdGhhdCBjYW4gYmUgYWRkZWQgdG8gYm90aCBgPGE+YCBlbGVtZW50cyxcbiAgICAgICAgICAvLyBhcyB3ZWxsIGFzIG90aGVyIGVsZW1lbnRzLiBBcyBhIHJlc3VsdCwgd2UgY2FuJ3QgZGVmaW5lIHNlY3VyaXR5IGNvbnRleHQgYXRcbiAgICAgICAgICAvLyBjb21waWxlIHRpbWUuIFNvIHRoZSBzZWN1cml0eSBjb250ZXh0IGlzIGRlZmVycmVkIHRvIHJ1bnRpbWUuXG4gICAgICAgICAgLy8gVGhlIGDJtcm1c2FuaXRpemVVcmxPclJlc291cmNlVXJsYCBzZWxlY3RzIHRoZSBuZWNlc3Nhcnkgc2FuaXRpemVyIGZ1bmN0aW9uXG4gICAgICAgICAgLy8gYmFzZWQgb24gdGhlIHRhZyBhbmQgcHJvcGVydHkgbmFtZXMuIFRoZSBsb2dpYyBtaW1pY3MgdGhlIG9uZSBmcm9tXG4gICAgICAgICAgLy8gYHBhY2thZ2VzL2NvbXBpbGVyL3NyYy9zY2hlbWEvZG9tX3NlY3VyaXR5X3NjaGVtYS50c2AsIHdoaWNoIGlzIHVzZWQgYXQgY29tcGlsZSB0aW1lLlxuICAgICAgICAgIC8vXG4gICAgICAgICAgLy8gTm90ZTogd2Ugc2hvdWxkIGludmVzdGlnYXRlIHdoZXRoZXIgd2UgY2FuIHN3aXRjaCB0byB1c2luZyBgQEhvc3RCaW5kaW5nKCdhdHRyLmhyZWYnKWBcbiAgICAgICAgICAvLyBpbnN0ZWFkIG9mIGFwcGx5aW5nIGEgdmFsdWUgdmlhIGEgcmVuZGVyZXIsIGFmdGVyIGEgZmluYWwgbWVyZ2Ugb2YgdGhlXG4gICAgICAgICAgLy8gYFJvdXRlckxpbmtXaXRoSHJlZmAgZGlyZWN0aXZlLlxuICAgICAgICAgIMm1ybVzYW5pdGl6ZVVybE9yUmVzb3VyY2VVcmwoXG4gICAgICAgICAgICB0aGlzLmhyZWYsXG4gICAgICAgICAgICB0aGlzLmVsLm5hdGl2ZUVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpLFxuICAgICAgICAgICAgJ2hyZWYnLFxuICAgICAgICAgICk7XG4gICAgdGhpcy5hcHBseUF0dHJpYnV0ZVZhbHVlKCdocmVmJywgc2FuaXRpemVkVmFsdWUpO1xuICB9XG5cbiAgcHJpdmF0ZSBhcHBseUF0dHJpYnV0ZVZhbHVlKGF0dHJOYW1lOiBzdHJpbmcsIGF0dHJWYWx1ZTogc3RyaW5nIHwgbnVsbCkge1xuICAgIGNvbnN0IHJlbmRlcmVyID0gdGhpcy5yZW5kZXJlcjtcbiAgICBjb25zdCBuYXRpdmVFbGVtZW50ID0gdGhpcy5lbC5uYXRpdmVFbGVtZW50O1xuICAgIGlmIChhdHRyVmFsdWUgIT09IG51bGwpIHtcbiAgICAgIHJlbmRlcmVyLnNldEF0dHJpYnV0ZShuYXRpdmVFbGVtZW50LCBhdHRyTmFtZSwgYXR0clZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVuZGVyZXIucmVtb3ZlQXR0cmlidXRlKG5hdGl2ZUVsZW1lbnQsIGF0dHJOYW1lKTtcbiAgICB9XG4gIH1cblxuICBnZXQgdXJsVHJlZSgpOiBVcmxUcmVlIHwgbnVsbCB7XG4gICAgaWYgKHRoaXMucm91dGVyTGlua0lucHV0ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKGlzVXJsVHJlZSh0aGlzLnJvdXRlckxpbmtJbnB1dCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnJvdXRlckxpbmtJbnB1dDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucm91dGVyLmNyZWF0ZVVybFRyZWUodGhpcy5yb3V0ZXJMaW5rSW5wdXQsIHtcbiAgICAgIC8vIElmIHRoZSBgcmVsYXRpdmVUb2AgaW5wdXQgaXMgbm90IGRlZmluZWQsIHdlIHdhbnQgdG8gdXNlIGB0aGlzLnJvdXRlYCBieSBkZWZhdWx0LlxuICAgICAgLy8gT3RoZXJ3aXNlLCB3ZSBzaG91bGQgdXNlIHRoZSB2YWx1ZSBwcm92aWRlZCBieSB0aGUgdXNlciBpbiB0aGUgaW5wdXQuXG4gICAgICByZWxhdGl2ZVRvOiB0aGlzLnJlbGF0aXZlVG8gIT09IHVuZGVmaW5lZCA/IHRoaXMucmVsYXRpdmVUbyA6IHRoaXMucm91dGUsXG4gICAgICBxdWVyeVBhcmFtczogdGhpcy5xdWVyeVBhcmFtcyxcbiAgICAgIGZyYWdtZW50OiB0aGlzLmZyYWdtZW50LFxuICAgICAgcXVlcnlQYXJhbXNIYW5kbGluZzogdGhpcy5xdWVyeVBhcmFtc0hhbmRsaW5nLFxuICAgICAgcHJlc2VydmVGcmFnbWVudDogdGhpcy5wcmVzZXJ2ZUZyYWdtZW50LFxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBBbiBhbGlhcyBmb3IgdGhlIGBSb3V0ZXJMaW5rYCBkaXJlY3RpdmUuXG4gKiBEZXByZWNhdGVkIHNpbmNlIHYxNSwgdXNlIGBSb3V0ZXJMaW5rYCBkaXJlY3RpdmUgaW5zdGVhZC5cbiAqXG4gKiBAZGVwcmVjYXRlZCB1c2UgYFJvdXRlckxpbmtgIGRpcmVjdGl2ZSBpbnN0ZWFkLlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQge1JvdXRlckxpbmsgYXMgUm91dGVyTGlua1dpdGhIcmVmfTtcbiJdfQ==