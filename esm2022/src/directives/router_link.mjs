/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { LocationStrategy } from '@angular/common';
import { Attribute, booleanAttribute, Directive, ElementRef, HostBinding, HostListener, Input, Renderer2, ɵɵsanitizeUrlOrResourceUrl } from '@angular/core';
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
        this.commands = null;
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
    ngOnChanges(changes) {
        if (this.isAnchorElement) {
            this.updateHref();
        }
        // This is subscribed to by `RouterLinkActive` so that it knows to update when there are changes
        // to the RouterLinks it's tracking.
        this.onChanges.next(this);
    }
    /**
     * Commands to pass to {@link Router#createUrlTree}.
     *   - **array**: commands to pass to {@link Router#createUrlTree}.
     *   - **string**: shorthand for array of commands with just the string, i.e. `['/route']`
     *   - **null|undefined**: effectively disables the `routerLink`
     * @see {@link Router#createUrlTree}
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
            info: this.info,
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.2.0-next.0+sha-9f18227", ngImport: i0, type: RouterLink, deps: [{ token: i1.Router }, { token: i2.ActivatedRoute }, { token: 'tabindex', attribute: true }, { token: i0.Renderer2 }, { token: i0.ElementRef }, { token: i3.LocationStrategy }], target: i0.ɵɵFactoryTarget.Directive }); }
    static { this.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "16.1.0", version: "17.2.0-next.0+sha-9f18227", type: RouterLink, isStandalone: true, selector: "[routerLink]", inputs: { target: "target", queryParams: "queryParams", fragment: "fragment", queryParamsHandling: "queryParamsHandling", state: "state", info: "info", relativeTo: "relativeTo", preserveFragment: ["preserveFragment", "preserveFragment", booleanAttribute], skipLocationChange: ["skipLocationChange", "skipLocationChange", booleanAttribute], replaceUrl: ["replaceUrl", "replaceUrl", booleanAttribute], routerLink: "routerLink" }, host: { listeners: { "click": "onClick($event.button,$event.ctrlKey,$event.shiftKey,$event.altKey,$event.metaKey)" }, properties: { "attr.target": "this.target" } }, usesOnChanges: true, ngImport: i0 }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.2.0-next.0+sha-9f18227", ngImport: i0, type: RouterLink, decorators: [{
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
                args: ['click',
                    ['$event.button', '$event.ctrlKey', '$event.shiftKey', '$event.altKey', '$event.metaKey']]
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDakQsT0FBTyxFQUFDLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUF3QixTQUFTLEVBQWlCLDBCQUEwQixFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQy9MLE9BQU8sRUFBQyxPQUFPLEVBQWUsTUFBTSxNQUFNLENBQUM7QUFFM0MsT0FBTyxFQUFRLGFBQWEsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUUvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQ2pDLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQzs7Ozs7QUFLL0M7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWdHRztBQUtILE1BQU0sT0FBTyxVQUFVO0lBcUVyQixZQUNZLE1BQWMsRUFBVSxLQUFxQixFQUNiLGlCQUF3QyxFQUMvRCxRQUFtQixFQUFtQixFQUFjLEVBQzdELGdCQUFtQztRQUhuQyxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQVUsVUFBSyxHQUFMLEtBQUssQ0FBZ0I7UUFDYixzQkFBaUIsR0FBakIsaUJBQWlCLENBQXVCO1FBQy9ELGFBQVEsR0FBUixRQUFRLENBQVc7UUFBbUIsT0FBRSxHQUFGLEVBQUUsQ0FBWTtRQUM3RCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBeEUvQzs7O1dBR0c7UUFD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QkFBZ0IsNENBUWhCLGdCQUFnQjs7c0dBOUd4QixVQUFVO2tCQUp0QixTQUFTO21CQUFDO29CQUNULFFBQVEsRUFBRSxjQUFjO29CQUN4QixVQUFVLEVBQUUsSUFBSTtpQkFDakI7OzBCQXdFTSxTQUFTOzJCQUFDLFVBQVU7eUhBNURZLE1BQU07c0JBQTFDLFdBQVc7dUJBQUMsYUFBYTs7c0JBQUcsS0FBSztnQkFRekIsV0FBVztzQkFBbkIsS0FBSztnQkFPRyxRQUFRO3NCQUFoQixLQUFLO2dCQU9HLG1CQUFtQjtzQkFBM0IsS0FBSztnQkFPRyxLQUFLO3NCQUFiLEtBQUs7Z0JBT0csSUFBSTtzQkFBWixLQUFLO2dCQVVHLFVBQVU7c0JBQWxCLEtBQUs7Z0JBcUNnQyxnQkFBZ0I7c0JBQXJELEtBQUs7dUJBQUMsRUFBQyxTQUFTLEVBQUUsZ0JBQWdCLEVBQUM7Z0JBUUUsa0JBQWtCO3NCQUF2RCxLQUFLO3VCQUFDLEVBQUMsU0FBUyxFQUFFLGdCQUFnQixFQUFDO2dCQVFFLFVBQVU7c0JBQS9DLEtBQUs7dUJBQUMsRUFBQyxTQUFTLEVBQUUsZ0JBQWdCLEVBQUM7Z0JBK0JoQyxVQUFVO3NCQURiLEtBQUs7Z0JBZU4sT0FBTztzQkFITixZQUFZO3VCQUNULE9BQU87b0JBQ1AsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixDQUFDOztBQW1GL0Y7Ozs7Ozs7R0FPRztBQUNILE9BQU8sRUFBQyxVQUFVLElBQUksa0JBQWtCLEVBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9uU3RyYXRlZ3l9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0F0dHJpYnV0ZSwgYm9vbGVhbkF0dHJpYnV0ZSwgRGlyZWN0aXZlLCBFbGVtZW50UmVmLCBIb3N0QmluZGluZywgSG9zdExpc3RlbmVyLCBJbnB1dCwgT25DaGFuZ2VzLCBPbkRlc3Ryb3ksIFJlbmRlcmVyMiwgU2ltcGxlQ2hhbmdlcywgybXJtXNhbml0aXplVXJsT3JSZXNvdXJjZVVybH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge1N1YmplY3QsIFN1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7RXZlbnQsIE5hdmlnYXRpb25FbmR9IGZyb20gJy4uL2V2ZW50cyc7XG5pbXBvcnQge1F1ZXJ5UGFyYW1zSGFuZGxpbmd9IGZyb20gJy4uL21vZGVscyc7XG5pbXBvcnQge1JvdXRlcn0gZnJvbSAnLi4vcm91dGVyJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGV9IGZyb20gJy4uL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BhcmFtc30gZnJvbSAnLi4vc2hhcmVkJztcbmltcG9ydCB7VXJsVHJlZX0gZnJvbSAnLi4vdXJsX3RyZWUnO1xuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogV2hlbiBhcHBsaWVkIHRvIGFuIGVsZW1lbnQgaW4gYSB0ZW1wbGF0ZSwgbWFrZXMgdGhhdCBlbGVtZW50IGEgbGlua1xuICogdGhhdCBpbml0aWF0ZXMgbmF2aWdhdGlvbiB0byBhIHJvdXRlLiBOYXZpZ2F0aW9uIG9wZW5zIG9uZSBvciBtb3JlIHJvdXRlZCBjb21wb25lbnRzXG4gKiBpbiBvbmUgb3IgbW9yZSBgPHJvdXRlci1vdXRsZXQ+YCBsb2NhdGlvbnMgb24gdGhlIHBhZ2UuXG4gKlxuICogR2l2ZW4gYSByb3V0ZSBjb25maWd1cmF0aW9uIGBbeyBwYXRoOiAndXNlci86bmFtZScsIGNvbXBvbmVudDogVXNlckNtcCB9XWAsXG4gKiB0aGUgZm9sbG93aW5nIGNyZWF0ZXMgYSBzdGF0aWMgbGluayB0byB0aGUgcm91dGU6XG4gKiBgPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiPmxpbmsgdG8gdXNlciBjb21wb25lbnQ8L2E+YFxuICpcbiAqIFlvdSBjYW4gdXNlIGR5bmFtaWMgdmFsdWVzIHRvIGdlbmVyYXRlIHRoZSBsaW5rLlxuICogRm9yIGEgZHluYW1pYyBsaW5rLCBwYXNzIGFuIGFycmF5IG9mIHBhdGggc2VnbWVudHMsXG4gKiBmb2xsb3dlZCBieSB0aGUgcGFyYW1zIGZvciBlYWNoIHNlZ21lbnQuXG4gKiBGb3IgZXhhbXBsZSwgYFsnL3RlYW0nLCB0ZWFtSWQsICd1c2VyJywgdXNlck5hbWUsIHtkZXRhaWxzOiB0cnVlfV1gXG4gKiBnZW5lcmF0ZXMgYSBsaW5rIHRvIGAvdGVhbS8xMS91c2VyL2JvYjtkZXRhaWxzPXRydWVgLlxuICpcbiAqIE11bHRpcGxlIHN0YXRpYyBzZWdtZW50cyBjYW4gYmUgbWVyZ2VkIGludG8gb25lIHRlcm0gYW5kIGNvbWJpbmVkIHdpdGggZHluYW1pYyBzZWdtZW50cy5cbiAqIEZvciBleGFtcGxlLCBgWycvdGVhbS8xMS91c2VyJywgdXNlck5hbWUsIHtkZXRhaWxzOiB0cnVlfV1gXG4gKlxuICogVGhlIGlucHV0IHRoYXQgeW91IHByb3ZpZGUgdG8gdGhlIGxpbmsgaXMgdHJlYXRlZCBhcyBhIGRlbHRhIHRvIHRoZSBjdXJyZW50IFVSTC5cbiAqIEZvciBpbnN0YW5jZSwgc3VwcG9zZSB0aGUgY3VycmVudCBVUkwgaXMgYC91c2VyLyhib3gvL2F1eDp0ZWFtKWAuXG4gKiBUaGUgbGluayBgPGEgW3JvdXRlckxpbmtdPVwiWycvdXNlci9qaW0nXVwiPkppbTwvYT5gIGNyZWF0ZXMgdGhlIFVSTFxuICogYC91c2VyLyhqaW0vL2F1eDp0ZWFtKWAuXG4gKiBTZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIFlvdSBjYW4gdXNlIGFic29sdXRlIG9yIHJlbGF0aXZlIHBhdGhzIGluIGEgbGluaywgc2V0IHF1ZXJ5IHBhcmFtZXRlcnMsXG4gKiBjb250cm9sIGhvdyBwYXJhbWV0ZXJzIGFyZSBoYW5kbGVkLCBhbmQga2VlcCBhIGhpc3Rvcnkgb2YgbmF2aWdhdGlvbiBzdGF0ZXMuXG4gKlxuICogIyMjIFJlbGF0aXZlIGxpbmsgcGF0aHNcbiAqXG4gKiBUaGUgZmlyc3Qgc2VnbWVudCBuYW1lIGNhbiBiZSBwcmVwZW5kZWQgd2l0aCBgL2AsIGAuL2AsIG9yIGAuLi9gLlxuICogKiBJZiB0aGUgZmlyc3Qgc2VnbWVudCBiZWdpbnMgd2l0aCBgL2AsIHRoZSByb3V0ZXIgbG9va3MgdXAgdGhlIHJvdXRlIGZyb20gdGhlIHJvb3Qgb2YgdGhlXG4gKiAgIGFwcC5cbiAqICogSWYgdGhlIGZpcnN0IHNlZ21lbnQgYmVnaW5zIHdpdGggYC4vYCwgb3IgZG9lc24ndCBiZWdpbiB3aXRoIGEgc2xhc2gsIHRoZSByb3V0ZXJcbiAqICAgbG9va3MgaW4gdGhlIGNoaWxkcmVuIG9mIHRoZSBjdXJyZW50IGFjdGl2YXRlZCByb3V0ZS5cbiAqICogSWYgdGhlIGZpcnN0IHNlZ21lbnQgYmVnaW5zIHdpdGggYC4uL2AsIHRoZSByb3V0ZXIgZ29lcyB1cCBvbmUgbGV2ZWwgaW4gdGhlIHJvdXRlIHRyZWUuXG4gKlxuICogIyMjIFNldHRpbmcgYW5kIGhhbmRsaW5nIHF1ZXJ5IHBhcmFtcyBhbmQgZnJhZ21lbnRzXG4gKlxuICogVGhlIGZvbGxvd2luZyBsaW5rIGFkZHMgYSBxdWVyeSBwYXJhbWV0ZXIgYW5kIGEgZnJhZ21lbnQgdG8gdGhlIGdlbmVyYXRlZCBVUkw6XG4gKlxuICogYGBgXG4gKiA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2JvYiddXCIgW3F1ZXJ5UGFyYW1zXT1cIntkZWJ1ZzogdHJ1ZX1cIiBmcmFnbWVudD1cImVkdWNhdGlvblwiPlxuICogICBsaW5rIHRvIHVzZXIgY29tcG9uZW50XG4gKiA8L2E+XG4gKiBgYGBcbiAqIEJ5IGRlZmF1bHQsIHRoZSBkaXJlY3RpdmUgY29uc3RydWN0cyB0aGUgbmV3IFVSTCB1c2luZyB0aGUgZ2l2ZW4gcXVlcnkgcGFyYW1ldGVycy5cbiAqIFRoZSBleGFtcGxlIGdlbmVyYXRlcyB0aGUgbGluazogYC91c2VyL2JvYj9kZWJ1Zz10cnVlI2VkdWNhdGlvbmAuXG4gKlxuICogWW91IGNhbiBpbnN0cnVjdCB0aGUgZGlyZWN0aXZlIHRvIGhhbmRsZSBxdWVyeSBwYXJhbWV0ZXJzIGRpZmZlcmVudGx5XG4gKiBieSBzcGVjaWZ5aW5nIHRoZSBgcXVlcnlQYXJhbXNIYW5kbGluZ2Agb3B0aW9uIGluIHRoZSBsaW5rLlxuICogQWxsb3dlZCB2YWx1ZXMgYXJlOlxuICpcbiAqICAtIGAnbWVyZ2UnYDogTWVyZ2UgdGhlIGdpdmVuIGBxdWVyeVBhcmFtc2AgaW50byB0aGUgY3VycmVudCBxdWVyeSBwYXJhbXMuXG4gKiAgLSBgJ3ByZXNlcnZlJ2A6IFByZXNlcnZlIHRoZSBjdXJyZW50IHF1ZXJ5IHBhcmFtcy5cbiAqXG4gKiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIDxhIFtyb3V0ZXJMaW5rXT1cIlsnL3VzZXIvYm9iJ11cIiBbcXVlcnlQYXJhbXNdPVwie2RlYnVnOiB0cnVlfVwiIHF1ZXJ5UGFyYW1zSGFuZGxpbmc9XCJtZXJnZVwiPlxuICogICBsaW5rIHRvIHVzZXIgY29tcG9uZW50XG4gKiA8L2E+XG4gKiBgYGBcbiAqXG4gKiBTZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNxdWVyeVBhcmFtc0hhbmRsaW5nfS5cbiAqXG4gKiAjIyMgUHJlc2VydmluZyBuYXZpZ2F0aW9uIGhpc3RvcnlcbiAqXG4gKiBZb3UgY2FuIHByb3ZpZGUgYSBgc3RhdGVgIHZhbHVlIHRvIGJlIHBlcnNpc3RlZCB0byB0aGUgYnJvd3NlcidzXG4gKiBbYEhpc3Rvcnkuc3RhdGVgIHByb3BlcnR5XShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvSGlzdG9yeSNQcm9wZXJ0aWVzKS5cbiAqIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogPGEgW3JvdXRlckxpbmtdPVwiWycvdXNlci9ib2InXVwiIFtzdGF0ZV09XCJ7dHJhY2luZ0lkOiAxMjN9XCI+XG4gKiAgIGxpbmsgdG8gdXNlciBjb21wb25lbnRcbiAqIDwvYT5cbiAqIGBgYFxuICpcbiAqIFVzZSB7QGxpbmsgUm91dGVyI2dldEN1cnJlbnROYXZpZ2F0aW9ufSB0byByZXRyaWV2ZSBhIHNhdmVkXG4gKiBuYXZpZ2F0aW9uLXN0YXRlIHZhbHVlLiBGb3IgZXhhbXBsZSwgdG8gY2FwdHVyZSB0aGUgYHRyYWNpbmdJZGAgZHVyaW5nIHRoZSBgTmF2aWdhdGlvblN0YXJ0YFxuICogZXZlbnQ6XG4gKlxuICogYGBgXG4gKiAvLyBHZXQgTmF2aWdhdGlvblN0YXJ0IGV2ZW50c1xuICogcm91dGVyLmV2ZW50cy5waXBlKGZpbHRlcihlID0+IGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uU3RhcnQpKS5zdWJzY3JpYmUoZSA9PiB7XG4gKiAgIGNvbnN0IG5hdmlnYXRpb24gPSByb3V0ZXIuZ2V0Q3VycmVudE5hdmlnYXRpb24oKTtcbiAqICAgdHJhY2luZ1NlcnZpY2UudHJhY2Uoe2lkOiBuYXZpZ2F0aW9uLmV4dHJhcy5zdGF0ZS50cmFjaW5nSWR9KTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQERpcmVjdGl2ZSh7XG4gIHNlbGVjdG9yOiAnW3JvdXRlckxpbmtdJyxcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyTGluayBpbXBsZW1lbnRzIE9uQ2hhbmdlcywgT25EZXN0cm95IHtcbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgYW4gYGhyZWZgIGF0dHJpYnV0ZSB2YWx1ZSBhcHBsaWVkIHRvIGEgaG9zdCBlbGVtZW50LFxuICAgKiB3aGVuIGEgaG9zdCBlbGVtZW50IGlzIGA8YT5gLiBGb3Igb3RoZXIgdGFncywgdGhlIHZhbHVlIGlzIGBudWxsYC5cbiAgICovXG4gIGhyZWY6IHN0cmluZ3xudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogUmVwcmVzZW50cyB0aGUgYHRhcmdldGAgYXR0cmlidXRlIG9uIGEgaG9zdCBlbGVtZW50LlxuICAgKiBUaGlzIGlzIG9ubHkgdXNlZCB3aGVuIHRoZSBob3N0IGVsZW1lbnQgaXMgYW4gYDxhPmAgdGFnLlxuICAgKi9cbiAgQEhvc3RCaW5kaW5nKCdhdHRyLnRhcmdldCcpIEBJbnB1dCgpIHRhcmdldD86IHN0cmluZztcblxuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGVcbiAgICogYFVybENyZWF0aW9uT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNxdWVyeVBhcmFtc31cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKSBxdWVyeVBhcmFtcz86IFBhcmFtc3xudWxsO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGVcbiAgICogYFVybENyZWF0aW9uT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNmcmFnbWVudH1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKSBmcmFnbWVudD86IHN0cmluZztcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcXVlcnlQYXJhbXNIYW5kbGluZ31cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKSBxdWVyeVBhcmFtc0hhbmRsaW5nPzogUXVlcnlQYXJhbXNIYW5kbGluZ3xudWxsO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybH0gYXMgcGFydCBvZiB0aGVcbiAgICogYE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zI3N0YXRlfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybH1cbiAgICovXG4gIEBJbnB1dCgpIHN0YXRlPzoge1trOiBzdHJpbmddOiBhbnl9O1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybH0gYXMgcGFydCBvZiB0aGVcbiAgICogYE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zI2luZm99XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfVxuICAgKi9cbiAgQElucHV0KCkgaW5mbz86IHVua25vd247XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgVXJsQ3JlYXRpb25PcHRpb25zYC5cbiAgICogU3BlY2lmeSBhIHZhbHVlIGhlcmUgd2hlbiB5b3UgZG8gbm90IHdhbnQgdG8gdXNlIHRoZSBkZWZhdWx0IHZhbHVlXG4gICAqIGZvciBgcm91dGVyTGlua2AsIHdoaWNoIGlzIHRoZSBjdXJyZW50IGFjdGl2YXRlZCByb3V0ZS5cbiAgICogTm90ZSB0aGF0IGEgdmFsdWUgb2YgYHVuZGVmaW5lZGAgaGVyZSB3aWxsIHVzZSB0aGUgYHJvdXRlckxpbmtgIGRlZmF1bHQuXG4gICAqIEBzZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNyZWxhdGl2ZVRvfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpIHJlbGF0aXZlVG8/OiBBY3RpdmF0ZWRSb3V0ZXxudWxsO1xuXG4gIHByaXZhdGUgY29tbWFuZHM6IGFueVtdfG51bGwgPSBudWxsO1xuXG4gIC8qKiBXaGV0aGVyIGEgaG9zdCBlbGVtZW50IGlzIGFuIGA8YT5gIHRhZy4gKi9cbiAgcHJpdmF0ZSBpc0FuY2hvckVsZW1lbnQ6IGJvb2xlYW47XG5cbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb24/OiBTdWJzY3JpcHRpb247XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBvbkNoYW5nZXMgPSBuZXcgU3ViamVjdDxSb3V0ZXJMaW5rPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZXI6IFJvdXRlciwgcHJpdmF0ZSByb3V0ZTogQWN0aXZhdGVkUm91dGUsXG4gICAgICBAQXR0cmlidXRlKCd0YWJpbmRleCcpIHByaXZhdGUgcmVhZG9ubHkgdGFiSW5kZXhBdHRyaWJ1dGU6IHN0cmluZ3xudWxsfHVuZGVmaW5lZCxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgcmVuZGVyZXI6IFJlbmRlcmVyMiwgcHJpdmF0ZSByZWFkb25seSBlbDogRWxlbWVudFJlZixcbiAgICAgIHByaXZhdGUgbG9jYXRpb25TdHJhdGVneT86IExvY2F0aW9uU3RyYXRlZ3kpIHtcbiAgICBjb25zdCB0YWdOYW1lID0gZWwubmF0aXZlRWxlbWVudC50YWdOYW1lPy50b0xvd2VyQ2FzZSgpO1xuICAgIHRoaXMuaXNBbmNob3JFbGVtZW50ID0gdGFnTmFtZSA9PT0gJ2EnIHx8IHRhZ05hbWUgPT09ICdhcmVhJztcblxuICAgIGlmICh0aGlzLmlzQW5jaG9yRWxlbWVudCkge1xuICAgICAgdGhpcy5zdWJzY3JpcHRpb24gPSByb3V0ZXIuZXZlbnRzLnN1YnNjcmliZSgoczogRXZlbnQpID0+IHtcbiAgICAgICAgaWYgKHMgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICAgICAgdGhpcy51cGRhdGVIcmVmKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNldFRhYkluZGV4SWZOb3RPbk5hdGl2ZUVsKCcwJyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcHJlc2VydmVGcmFnbWVudH1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoe3RyYW5zZm9ybTogYm9vbGVhbkF0dHJpYnV0ZX0pIHByZXNlcnZlRnJhZ21lbnQ6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybH0gYXMgcGFydCBvZiB0aGVcbiAgICogYE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zI3NraXBMb2NhdGlvbkNoYW5nZX1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI25hdmlnYXRlQnlVcmx9XG4gICAqL1xuICBASW5wdXQoe3RyYW5zZm9ybTogYm9vbGVhbkF0dHJpYnV0ZX0pIHNraXBMb2NhdGlvbkNoYW5nZTogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjcmVwbGFjZVVybH1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI25hdmlnYXRlQnlVcmx9XG4gICAqL1xuICBASW5wdXQoe3RyYW5zZm9ybTogYm9vbGVhbkF0dHJpYnV0ZX0pIHJlcGxhY2VVcmw6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAvKipcbiAgICogTW9kaWZpZXMgdGhlIHRhYiBpbmRleCBpZiB0aGVyZSB3YXMgbm90IGEgdGFiaW5kZXggYXR0cmlidXRlIG9uIHRoZSBlbGVtZW50IGR1cmluZ1xuICAgKiBpbnN0YW50aWF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBzZXRUYWJJbmRleElmTm90T25OYXRpdmVFbChuZXdUYWJJbmRleDogc3RyaW5nfG51bGwpIHtcbiAgICBpZiAodGhpcy50YWJJbmRleEF0dHJpYnV0ZSAhPSBudWxsIC8qIGJvdGggYG51bGxgIGFuZCBgdW5kZWZpbmVkYCAqLyB8fCB0aGlzLmlzQW5jaG9yRWxlbWVudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmFwcGx5QXR0cmlidXRlVmFsdWUoJ3RhYmluZGV4JywgbmV3VGFiSW5kZXgpO1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7XG4gICAgaWYgKHRoaXMuaXNBbmNob3JFbGVtZW50KSB7XG4gICAgICB0aGlzLnVwZGF0ZUhyZWYoKTtcbiAgICB9XG4gICAgLy8gVGhpcyBpcyBzdWJzY3JpYmVkIHRvIGJ5IGBSb3V0ZXJMaW5rQWN0aXZlYCBzbyB0aGF0IGl0IGtub3dzIHRvIHVwZGF0ZSB3aGVuIHRoZXJlIGFyZSBjaGFuZ2VzXG4gICAgLy8gdG8gdGhlIFJvdXRlckxpbmtzIGl0J3MgdHJhY2tpbmcuXG4gICAgdGhpcy5vbkNoYW5nZXMubmV4dCh0aGlzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21tYW5kcyB0byBwYXNzIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0uXG4gICAqICAgLSAqKmFycmF5Kio6IGNvbW1hbmRzIHRvIHBhc3MgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlfS5cbiAgICogICAtICoqc3RyaW5nKio6IHNob3J0aGFuZCBmb3IgYXJyYXkgb2YgY29tbWFuZHMgd2l0aCBqdXN0IHRoZSBzdHJpbmcsIGkuZS4gYFsnL3JvdXRlJ11gXG4gICAqICAgLSAqKm51bGx8dW5kZWZpbmVkKio6IGVmZmVjdGl2ZWx5IGRpc2FibGVzIHRoZSBgcm91dGVyTGlua2BcbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKVxuICBzZXQgcm91dGVyTGluayhjb21tYW5kczogYW55W118c3RyaW5nfG51bGx8dW5kZWZpbmVkKSB7XG4gICAgaWYgKGNvbW1hbmRzICE9IG51bGwpIHtcbiAgICAgIHRoaXMuY29tbWFuZHMgPSBBcnJheS5pc0FycmF5KGNvbW1hbmRzKSA/IGNvbW1hbmRzIDogW2NvbW1hbmRzXTtcbiAgICAgIHRoaXMuc2V0VGFiSW5kZXhJZk5vdE9uTmF0aXZlRWwoJzAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb21tYW5kcyA9IG51bGw7XG4gICAgICB0aGlzLnNldFRhYkluZGV4SWZOb3RPbk5hdGl2ZUVsKG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgQEhvc3RMaXN0ZW5lcihcbiAgICAgICdjbGljaycsXG4gICAgICBbJyRldmVudC5idXR0b24nLCAnJGV2ZW50LmN0cmxLZXknLCAnJGV2ZW50LnNoaWZ0S2V5JywgJyRldmVudC5hbHRLZXknLCAnJGV2ZW50Lm1ldGFLZXknXSlcbiAgb25DbGljayhidXR0b246IG51bWJlciwgY3RybEtleTogYm9vbGVhbiwgc2hpZnRLZXk6IGJvb2xlYW4sIGFsdEtleTogYm9vbGVhbiwgbWV0YUtleTogYm9vbGVhbik6XG4gICAgICBib29sZWFuIHtcbiAgICBpZiAodGhpcy51cmxUcmVlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc0FuY2hvckVsZW1lbnQpIHtcbiAgICAgIGlmIChidXR0b24gIT09IDAgfHwgY3RybEtleSB8fCBzaGlmdEtleSB8fCBhbHRLZXkgfHwgbWV0YUtleSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB0aGlzLnRhcmdldCA9PT0gJ3N0cmluZycgJiYgdGhpcy50YXJnZXQgIT0gJ19zZWxmJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBleHRyYXMgPSB7XG4gICAgICBza2lwTG9jYXRpb25DaGFuZ2U6IHRoaXMuc2tpcExvY2F0aW9uQ2hhbmdlLFxuICAgICAgcmVwbGFjZVVybDogdGhpcy5yZXBsYWNlVXJsLFxuICAgICAgc3RhdGU6IHRoaXMuc3RhdGUsXG4gICAgICBpbmZvOiB0aGlzLmluZm8sXG4gICAgfTtcbiAgICB0aGlzLnJvdXRlci5uYXZpZ2F0ZUJ5VXJsKHRoaXMudXJsVHJlZSwgZXh0cmFzKTtcblxuICAgIC8vIFJldHVybiBgZmFsc2VgIGZvciBgPGE+YCBlbGVtZW50cyB0byBwcmV2ZW50IGRlZmF1bHQgYWN0aW9uXG4gICAgLy8gYW5kIGNhbmNlbCB0aGUgbmF0aXZlIGJlaGF2aW9yLCBzaW5jZSB0aGUgbmF2aWdhdGlvbiBpcyBoYW5kbGVkXG4gICAgLy8gYnkgdGhlIFJvdXRlci5cbiAgICByZXR1cm4gIXRoaXMuaXNBbmNob3JFbGVtZW50O1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiBhbnkge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9uPy51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGVIcmVmKCk6IHZvaWQge1xuICAgIHRoaXMuaHJlZiA9IHRoaXMudXJsVHJlZSAhPT0gbnVsbCAmJiB0aGlzLmxvY2F0aW9uU3RyYXRlZ3kgP1xuICAgICAgICB0aGlzLmxvY2F0aW9uU3RyYXRlZ3k/LnByZXBhcmVFeHRlcm5hbFVybCh0aGlzLnJvdXRlci5zZXJpYWxpemVVcmwodGhpcy51cmxUcmVlKSkgOlxuICAgICAgICBudWxsO1xuXG4gICAgY29uc3Qgc2FuaXRpemVkVmFsdWUgPSB0aGlzLmhyZWYgPT09IG51bGwgP1xuICAgICAgICBudWxsIDpcbiAgICAgICAgLy8gVGhpcyBjbGFzcyByZXByZXNlbnRzIGEgZGlyZWN0aXZlIHRoYXQgY2FuIGJlIGFkZGVkIHRvIGJvdGggYDxhPmAgZWxlbWVudHMsXG4gICAgICAgIC8vIGFzIHdlbGwgYXMgb3RoZXIgZWxlbWVudHMuIEFzIGEgcmVzdWx0LCB3ZSBjYW4ndCBkZWZpbmUgc2VjdXJpdHkgY29udGV4dCBhdFxuICAgICAgICAvLyBjb21waWxlIHRpbWUuIFNvIHRoZSBzZWN1cml0eSBjb250ZXh0IGlzIGRlZmVycmVkIHRvIHJ1bnRpbWUuXG4gICAgICAgIC8vIFRoZSBgybXJtXNhbml0aXplVXJsT3JSZXNvdXJjZVVybGAgc2VsZWN0cyB0aGUgbmVjZXNzYXJ5IHNhbml0aXplciBmdW5jdGlvblxuICAgICAgICAvLyBiYXNlZCBvbiB0aGUgdGFnIGFuZCBwcm9wZXJ0eSBuYW1lcy4gVGhlIGxvZ2ljIG1pbWljcyB0aGUgb25lIGZyb21cbiAgICAgICAgLy8gYHBhY2thZ2VzL2NvbXBpbGVyL3NyYy9zY2hlbWEvZG9tX3NlY3VyaXR5X3NjaGVtYS50c2AsIHdoaWNoIGlzIHVzZWQgYXQgY29tcGlsZSB0aW1lLlxuICAgICAgICAvL1xuICAgICAgICAvLyBOb3RlOiB3ZSBzaG91bGQgaW52ZXN0aWdhdGUgd2hldGhlciB3ZSBjYW4gc3dpdGNoIHRvIHVzaW5nIGBASG9zdEJpbmRpbmcoJ2F0dHIuaHJlZicpYFxuICAgICAgICAvLyBpbnN0ZWFkIG9mIGFwcGx5aW5nIGEgdmFsdWUgdmlhIGEgcmVuZGVyZXIsIGFmdGVyIGEgZmluYWwgbWVyZ2Ugb2YgdGhlXG4gICAgICAgIC8vIGBSb3V0ZXJMaW5rV2l0aEhyZWZgIGRpcmVjdGl2ZS5cbiAgICAgICAgybXJtXNhbml0aXplVXJsT3JSZXNvdXJjZVVybCh0aGlzLmhyZWYsIHRoaXMuZWwubmF0aXZlRWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCksICdocmVmJyk7XG4gICAgdGhpcy5hcHBseUF0dHJpYnV0ZVZhbHVlKCdocmVmJywgc2FuaXRpemVkVmFsdWUpO1xuICB9XG5cbiAgcHJpdmF0ZSBhcHBseUF0dHJpYnV0ZVZhbHVlKGF0dHJOYW1lOiBzdHJpbmcsIGF0dHJWYWx1ZTogc3RyaW5nfG51bGwpIHtcbiAgICBjb25zdCByZW5kZXJlciA9IHRoaXMucmVuZGVyZXI7XG4gICAgY29uc3QgbmF0aXZlRWxlbWVudCA9IHRoaXMuZWwubmF0aXZlRWxlbWVudDtcbiAgICBpZiAoYXR0clZhbHVlICE9PSBudWxsKSB7XG4gICAgICByZW5kZXJlci5zZXRBdHRyaWJ1dGUobmF0aXZlRWxlbWVudCwgYXR0ck5hbWUsIGF0dHJWYWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlbmRlcmVyLnJlbW92ZUF0dHJpYnV0ZShuYXRpdmVFbGVtZW50LCBhdHRyTmFtZSk7XG4gICAgfVxuICB9XG5cbiAgZ2V0IHVybFRyZWUoKTogVXJsVHJlZXxudWxsIHtcbiAgICBpZiAodGhpcy5jb21tYW5kcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJvdXRlci5jcmVhdGVVcmxUcmVlKHRoaXMuY29tbWFuZHMsIHtcbiAgICAgIC8vIElmIHRoZSBgcmVsYXRpdmVUb2AgaW5wdXQgaXMgbm90IGRlZmluZWQsIHdlIHdhbnQgdG8gdXNlIGB0aGlzLnJvdXRlYCBieSBkZWZhdWx0LlxuICAgICAgLy8gT3RoZXJ3aXNlLCB3ZSBzaG91bGQgdXNlIHRoZSB2YWx1ZSBwcm92aWRlZCBieSB0aGUgdXNlciBpbiB0aGUgaW5wdXQuXG4gICAgICByZWxhdGl2ZVRvOiB0aGlzLnJlbGF0aXZlVG8gIT09IHVuZGVmaW5lZCA/IHRoaXMucmVsYXRpdmVUbyA6IHRoaXMucm91dGUsXG4gICAgICBxdWVyeVBhcmFtczogdGhpcy5xdWVyeVBhcmFtcyxcbiAgICAgIGZyYWdtZW50OiB0aGlzLmZyYWdtZW50LFxuICAgICAgcXVlcnlQYXJhbXNIYW5kbGluZzogdGhpcy5xdWVyeVBhcmFtc0hhbmRsaW5nLFxuICAgICAgcHJlc2VydmVGcmFnbWVudDogdGhpcy5wcmVzZXJ2ZUZyYWdtZW50LFxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBBbiBhbGlhcyBmb3IgdGhlIGBSb3V0ZXJMaW5rYCBkaXJlY3RpdmUuXG4gKiBEZXByZWNhdGVkIHNpbmNlIHYxNSwgdXNlIGBSb3V0ZXJMaW5rYCBkaXJlY3RpdmUgaW5zdGVhZC5cbiAqXG4gKiBAZGVwcmVjYXRlZCB1c2UgYFJvdXRlckxpbmtgIGRpcmVjdGl2ZSBpbnN0ZWFkLlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQge1JvdXRlckxpbmsgYXMgUm91dGVyTGlua1dpdGhIcmVmfTtcbiJdfQ==