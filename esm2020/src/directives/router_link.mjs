/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { LocationStrategy } from '@angular/common';
import { Attribute, Directive, ElementRef, HostBinding, HostListener, Input, Renderer2 } from '@angular/core';
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
    constructor(router, route, tabIndexAttribute, renderer, el) {
        this.router = router;
        this.route = route;
        this.tabIndexAttribute = tabIndexAttribute;
        this.renderer = renderer;
        this.el = el;
        this.commands = null;
        /** @internal */
        this.onChanges = new Subject();
        this.setTabIndexIfNotOnNativeEl('0');
    }
    /**
     * Modifies the tab index if there was not a tabindex attribute on the element during
     * instantiation.
     */
    setTabIndexIfNotOnNativeEl(newTabIndex) {
        if (this.tabIndexAttribute != null /* both `null` and `undefined` */) {
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
    onClick() {
        if (this.urlTree === null) {
            return true;
        }
        const extras = {
            skipLocationChange: attrBoolValue(this.skipLocationChange),
            replaceUrl: attrBoolValue(this.replaceUrl),
            state: this.state,
        };
        this.router.navigateByUrl(this.urlTree, extras);
        return true;
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
            preserveFragment: attrBoolValue(this.preserveFragment),
        });
    }
}
RouterLink.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.2.0-next.1+63.sha-ea91edb.with-local-changes", ngImport: i0, type: RouterLink, deps: [{ token: i1.Router }, { token: i2.ActivatedRoute }, { token: 'tabindex', attribute: true }, { token: i0.Renderer2 }, { token: i0.ElementRef }], target: i0.ɵɵFactoryTarget.Directive });
RouterLink.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "12.0.0", version: "13.2.0-next.1+63.sha-ea91edb.with-local-changes", type: RouterLink, selector: ":not(a):not(area)[routerLink]", inputs: { queryParams: "queryParams", fragment: "fragment", queryParamsHandling: "queryParamsHandling", preserveFragment: "preserveFragment", skipLocationChange: "skipLocationChange", replaceUrl: "replaceUrl", state: "state", relativeTo: "relativeTo", routerLink: "routerLink" }, host: { listeners: { "click": "onClick()" } }, usesOnChanges: true, ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.2.0-next.1+63.sha-ea91edb.with-local-changes", ngImport: i0, type: RouterLink, decorators: [{
            type: Directive,
            args: [{ selector: ':not(a):not(area)[routerLink]' }]
        }], ctorParameters: function () { return [{ type: i1.Router }, { type: i2.ActivatedRoute }, { type: undefined, decorators: [{
                    type: Attribute,
                    args: ['tabindex']
                }] }, { type: i0.Renderer2 }, { type: i0.ElementRef }]; }, propDecorators: { queryParams: [{
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
            }], relativeTo: [{
                type: Input
            }], routerLink: [{
                type: Input
            }], onClick: [{
                type: HostListener,
                args: ['click']
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
export class RouterLinkWithHref {
    constructor(router, route, locationStrategy) {
        this.router = router;
        this.route = route;
        this.locationStrategy = locationStrategy;
        this.commands = null;
        // the url displayed on the anchor element.
        // @HostBinding('attr.href') is used rather than @HostBinding() because it removes the
        // href attribute when it becomes `null`.
        this.href = null;
        /** @internal */
        this.onChanges = new Subject();
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
     *   - **null|undefined**: Disables the link by removing the `href`
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    set routerLink(commands) {
        if (commands != null) {
            this.commands = Array.isArray(commands) ? commands : [commands];
        }
        else {
            this.commands = null;
        }
    }
    /** @nodoc */
    ngOnChanges(changes) {
        this.updateTargetUrlAndHref();
        this.onChanges.next(this);
    }
    /** @nodoc */
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
    /** @nodoc */
    onClick(button, ctrlKey, shiftKey, altKey, metaKey) {
        if (button !== 0 || ctrlKey || shiftKey || altKey || metaKey) {
            return true;
        }
        if (typeof this.target === 'string' && this.target != '_self' || this.urlTree === null) {
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
        this.href = this.urlTree !== null ?
            this.locationStrategy.prepareExternalUrl(this.router.serializeUrl(this.urlTree)) :
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
            preserveFragment: attrBoolValue(this.preserveFragment),
        });
    }
}
RouterLinkWithHref.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.2.0-next.1+63.sha-ea91edb.with-local-changes", ngImport: i0, type: RouterLinkWithHref, deps: [{ token: i1.Router }, { token: i2.ActivatedRoute }, { token: i3.LocationStrategy }], target: i0.ɵɵFactoryTarget.Directive });
RouterLinkWithHref.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "12.0.0", version: "13.2.0-next.1+63.sha-ea91edb.with-local-changes", type: RouterLinkWithHref, selector: "a[routerLink],area[routerLink]", inputs: { target: "target", queryParams: "queryParams", fragment: "fragment", queryParamsHandling: "queryParamsHandling", preserveFragment: "preserveFragment", skipLocationChange: "skipLocationChange", replaceUrl: "replaceUrl", state: "state", relativeTo: "relativeTo", routerLink: "routerLink" }, host: { listeners: { "click": "onClick($event.button,$event.ctrlKey,$event.shiftKey,$event.altKey,$event.metaKey)" }, properties: { "attr.target": "this.target", "attr.href": "this.href" } }, usesOnChanges: true, ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.2.0-next.1+63.sha-ea91edb.with-local-changes", ngImport: i0, type: RouterLinkWithHref, decorators: [{
            type: Directive,
            args: [{ selector: 'a[routerLink],area[routerLink]' }]
        }], ctorParameters: function () { return [{ type: i1.Router }, { type: i2.ActivatedRoute }, { type: i3.LocationStrategy }]; }, propDecorators: { target: [{
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
            }], relativeTo: [{
                type: Input
            }], href: [{
                type: HostBinding,
                args: ['attr.href']
            }], routerLink: [{
                type: Input
            }], onClick: [{
                type: HostListener,
                args: ['click',
                    ['$event.button', '$event.ctrlKey', '$event.shiftKey', '$event.altKey', '$event.metaKey']]
            }] } });
function attrBoolValue(s) {
    return s === '' || !!s;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDakQsT0FBTyxFQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUF3QixTQUFTLEVBQWdCLE1BQU0sZUFBZSxDQUFDO0FBQ2pKLE9BQU8sRUFBQyxPQUFPLEVBQWUsTUFBTSxNQUFNLENBQUM7QUFHM0MsT0FBTyxFQUFRLGFBQWEsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUMvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQ2pDLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQzs7Ozs7QUFLL0M7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWdHRztBQUVILE1BQU0sT0FBTyxVQUFVO0lBcUVyQixZQUNZLE1BQWMsRUFBVSxLQUFxQixFQUNiLGlCQUF3QyxFQUMvRCxRQUFtQixFQUFtQixFQUFjO1FBRjdELFdBQU0sR0FBTixNQUFNLENBQVE7UUFBVSxVQUFLLEdBQUwsS0FBSyxDQUFnQjtRQUNiLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBdUI7UUFDL0QsYUFBUSxHQUFSLFFBQVEsQ0FBVztRQUFtQixPQUFFLEdBQUYsRUFBRSxDQUFZO1FBUmpFLGFBQVEsR0FBZSxJQUFJLENBQUM7UUFFcEMsZ0JBQWdCO1FBQ2hCLGNBQVMsR0FBRyxJQUFJLE9BQU8sRUFBYyxDQUFDO1FBTXBDLElBQUks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VztnQkF1QnBCLFVBQVU7c0JBRGIsS0FBSztnQkF1Qk4sT0FBTztzQkFITixZQUFZO3VCQUNULE9BQU87b0JBQ1AsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixDQUFDOztBQTBDL0YsU0FBUyxhQUFhLENBQUMsQ0FBTTtJQUMzQixPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb25TdHJhdGVneX0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7QXR0cmlidXRlLCBEaXJlY3RpdmUsIEVsZW1lbnRSZWYsIEhvc3RCaW5kaW5nLCBIb3N0TGlzdGVuZXIsIElucHV0LCBPbkNoYW5nZXMsIE9uRGVzdHJveSwgUmVuZGVyZXIyLCBTaW1wbGVDaGFuZ2VzfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7U3ViamVjdCwgU3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtRdWVyeVBhcmFtc0hhbmRsaW5nfSBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHtFdmVudCwgTmF2aWdhdGlvbkVuZH0gZnJvbSAnLi4vZXZlbnRzJztcbmltcG9ydCB7Um91dGVyfSBmcm9tICcuLi9yb3V0ZXInO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZX0gZnJvbSAnLi4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UGFyYW1zfSBmcm9tICcuLi9zaGFyZWQnO1xuaW1wb3J0IHtVcmxUcmVlfSBmcm9tICcuLi91cmxfdHJlZSc7XG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBXaGVuIGFwcGxpZWQgdG8gYW4gZWxlbWVudCBpbiBhIHRlbXBsYXRlLCBtYWtlcyB0aGF0IGVsZW1lbnQgYSBsaW5rXG4gKiB0aGF0IGluaXRpYXRlcyBuYXZpZ2F0aW9uIHRvIGEgcm91dGUuIE5hdmlnYXRpb24gb3BlbnMgb25lIG9yIG1vcmUgcm91dGVkIGNvbXBvbmVudHNcbiAqIGluIG9uZSBvciBtb3JlIGA8cm91dGVyLW91dGxldD5gIGxvY2F0aW9ucyBvbiB0aGUgcGFnZS5cbiAqXG4gKiBHaXZlbiBhIHJvdXRlIGNvbmZpZ3VyYXRpb24gYFt7IHBhdGg6ICd1c2VyLzpuYW1lJywgY29tcG9uZW50OiBVc2VyQ21wIH1dYCxcbiAqIHRoZSBmb2xsb3dpbmcgY3JlYXRlcyBhIHN0YXRpYyBsaW5rIHRvIHRoZSByb3V0ZTpcbiAqIGA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCI+bGluayB0byB1c2VyIGNvbXBvbmVudDwvYT5gXG4gKlxuICogWW91IGNhbiB1c2UgZHluYW1pYyB2YWx1ZXMgdG8gZ2VuZXJhdGUgdGhlIGxpbmsuXG4gKiBGb3IgYSBkeW5hbWljIGxpbmssIHBhc3MgYW4gYXJyYXkgb2YgcGF0aCBzZWdtZW50cyxcbiAqIGZvbGxvd2VkIGJ5IHRoZSBwYXJhbXMgZm9yIGVhY2ggc2VnbWVudC5cbiAqIEZvciBleGFtcGxlLCBgWycvdGVhbScsIHRlYW1JZCwgJ3VzZXInLCB1c2VyTmFtZSwge2RldGFpbHM6IHRydWV9XWBcbiAqIGdlbmVyYXRlcyBhIGxpbmsgdG8gYC90ZWFtLzExL3VzZXIvYm9iO2RldGFpbHM9dHJ1ZWAuXG4gKlxuICogTXVsdGlwbGUgc3RhdGljIHNlZ21lbnRzIGNhbiBiZSBtZXJnZWQgaW50byBvbmUgdGVybSBhbmQgY29tYmluZWQgd2l0aCBkeW5hbWljIHNlZ2VtZW50cy5cbiAqIEZvciBleGFtcGxlLCBgWycvdGVhbS8xMS91c2VyJywgdXNlck5hbWUsIHtkZXRhaWxzOiB0cnVlfV1gXG4gKlxuICogVGhlIGlucHV0IHRoYXQgeW91IHByb3ZpZGUgdG8gdGhlIGxpbmsgaXMgdHJlYXRlZCBhcyBhIGRlbHRhIHRvIHRoZSBjdXJyZW50IFVSTC5cbiAqIEZvciBpbnN0YW5jZSwgc3VwcG9zZSB0aGUgY3VycmVudCBVUkwgaXMgYC91c2VyLyhib3gvL2F1eDp0ZWFtKWAuXG4gKiBUaGUgbGluayBgPGEgW3JvdXRlckxpbmtdPVwiWycvdXNlci9qaW0nXVwiPkppbTwvYT5gIGNyZWF0ZXMgdGhlIFVSTFxuICogYC91c2VyLyhqaW0vL2F1eDp0ZWFtKWAuXG4gKiBTZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIGNyZWF0ZVVybFRyZWV9IGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogWW91IGNhbiB1c2UgYWJzb2x1dGUgb3IgcmVsYXRpdmUgcGF0aHMgaW4gYSBsaW5rLCBzZXQgcXVlcnkgcGFyYW1ldGVycyxcbiAqIGNvbnRyb2wgaG93IHBhcmFtZXRlcnMgYXJlIGhhbmRsZWQsIGFuZCBrZWVwIGEgaGlzdG9yeSBvZiBuYXZpZ2F0aW9uIHN0YXRlcy5cbiAqXG4gKiAjIyMgUmVsYXRpdmUgbGluayBwYXRoc1xuICpcbiAqIFRoZSBmaXJzdCBzZWdtZW50IG5hbWUgY2FuIGJlIHByZXBlbmRlZCB3aXRoIGAvYCwgYC4vYCwgb3IgYC4uL2AuXG4gKiAqIElmIHRoZSBmaXJzdCBzZWdtZW50IGJlZ2lucyB3aXRoIGAvYCwgdGhlIHJvdXRlciBsb29rcyB1cCB0aGUgcm91dGUgZnJvbSB0aGUgcm9vdCBvZiB0aGVcbiAqICAgYXBwLlxuICogKiBJZiB0aGUgZmlyc3Qgc2VnbWVudCBiZWdpbnMgd2l0aCBgLi9gLCBvciBkb2Vzbid0IGJlZ2luIHdpdGggYSBzbGFzaCwgdGhlIHJvdXRlclxuICogICBsb29rcyBpbiB0aGUgY2hpbGRyZW4gb2YgdGhlIGN1cnJlbnQgYWN0aXZhdGVkIHJvdXRlLlxuICogKiBJZiB0aGUgZmlyc3Qgc2VnbWVudCBiZWdpbnMgd2l0aCBgLi4vYCwgdGhlIHJvdXRlciBnb2VzIHVwIG9uZSBsZXZlbCBpbiB0aGUgcm91dGUgdHJlZS5cbiAqXG4gKiAjIyMgU2V0dGluZyBhbmQgaGFuZGxpbmcgcXVlcnkgcGFyYW1zIGFuZCBmcmFnbWVudHNcbiAqXG4gKiBUaGUgZm9sbG93aW5nIGxpbmsgYWRkcyBhIHF1ZXJ5IHBhcmFtZXRlciBhbmQgYSBmcmFnbWVudCB0byB0aGUgZ2VuZXJhdGVkIFVSTDpcbiAqXG4gKiBgYGBcbiAqIDxhIFtyb3V0ZXJMaW5rXT1cIlsnL3VzZXIvYm9iJ11cIiBbcXVlcnlQYXJhbXNdPVwie2RlYnVnOiB0cnVlfVwiIGZyYWdtZW50PVwiZWR1Y2F0aW9uXCI+XG4gKiAgIGxpbmsgdG8gdXNlciBjb21wb25lbnRcbiAqIDwvYT5cbiAqIGBgYFxuICogQnkgZGVmYXVsdCwgdGhlIGRpcmVjdGl2ZSBjb25zdHJ1Y3RzIHRoZSBuZXcgVVJMIHVzaW5nIHRoZSBnaXZlbiBxdWVyeSBwYXJhbWV0ZXJzLlxuICogVGhlIGV4YW1wbGUgZ2VuZXJhdGVzIHRoZSBsaW5rOiBgL3VzZXIvYm9iP2RlYnVnPXRydWUjZWR1Y2F0aW9uYC5cbiAqXG4gKiBZb3UgY2FuIGluc3RydWN0IHRoZSBkaXJlY3RpdmUgdG8gaGFuZGxlIHF1ZXJ5IHBhcmFtZXRlcnMgZGlmZmVyZW50bHlcbiAqIGJ5IHNwZWNpZnlpbmcgdGhlIGBxdWVyeVBhcmFtc0hhbmRsaW5nYCBvcHRpb24gaW4gdGhlIGxpbmsuXG4gKiBBbGxvd2VkIHZhbHVlcyBhcmU6XG4gKlxuICogIC0gYCdtZXJnZSdgOiBNZXJnZSB0aGUgZ2l2ZW4gYHF1ZXJ5UGFyYW1zYCBpbnRvIHRoZSBjdXJyZW50IHF1ZXJ5IHBhcmFtcy5cbiAqICAtIGAncHJlc2VydmUnYDogUHJlc2VydmUgdGhlIGN1cnJlbnQgcXVlcnkgcGFyYW1zLlxuICpcbiAqIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogPGEgW3JvdXRlckxpbmtdPVwiWycvdXNlci9ib2InXVwiIFtxdWVyeVBhcmFtc109XCJ7ZGVidWc6IHRydWV9XCIgcXVlcnlQYXJhbXNIYW5kbGluZz1cIm1lcmdlXCI+XG4gKiAgIGxpbmsgdG8gdXNlciBjb21wb25lbnRcbiAqIDwvYT5cbiAqIGBgYFxuICpcbiAqIFNlZSB7QGxpbmsgVXJsQ3JlYXRpb25PcHRpb25zLnF1ZXJ5UGFyYW1zSGFuZGxpbmcgVXJsQ3JlYXRpb25PcHRpb25zI3F1ZXJ5UGFyYW1zSGFuZGxpbmd9LlxuICpcbiAqICMjIyBQcmVzZXJ2aW5nIG5hdmlnYXRpb24gaGlzdG9yeVxuICpcbiAqIFlvdSBjYW4gcHJvdmlkZSBhIGBzdGF0ZWAgdmFsdWUgdG8gYmUgcGVyc2lzdGVkIHRvIHRoZSBicm93c2VyJ3NcbiAqIFtgSGlzdG9yeS5zdGF0ZWAgcHJvcGVydHldKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9IaXN0b3J5I1Byb3BlcnRpZXMpLlxuICogRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2JvYiddXCIgW3N0YXRlXT1cInt0cmFjaW5nSWQ6IDEyM31cIj5cbiAqICAgbGluayB0byB1c2VyIGNvbXBvbmVudFxuICogPC9hPlxuICogYGBgXG4gKlxuICogVXNlIHtAbGluayBSb3V0ZXIuZ2V0Q3VycmVudE5hdmlnYXRpb24oKSBSb3V0ZXIjZ2V0Q3VycmVudE5hdmlnYXRpb259IHRvIHJldHJpZXZlIGEgc2F2ZWRcbiAqIG5hdmlnYXRpb24tc3RhdGUgdmFsdWUuIEZvciBleGFtcGxlLCB0byBjYXB0dXJlIHRoZSBgdHJhY2luZ0lkYCBkdXJpbmcgdGhlIGBOYXZpZ2F0aW9uU3RhcnRgXG4gKiBldmVudDpcbiAqXG4gKiBgYGBcbiAqIC8vIEdldCBOYXZpZ2F0aW9uU3RhcnQgZXZlbnRzXG4gKiByb3V0ZXIuZXZlbnRzLnBpcGUoZmlsdGVyKGUgPT4gZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25TdGFydCkpLnN1YnNjcmliZShlID0+IHtcbiAqICAgY29uc3QgbmF2aWdhdGlvbiA9IHJvdXRlci5nZXRDdXJyZW50TmF2aWdhdGlvbigpO1xuICogICB0cmFjaW5nU2VydmljZS50cmFjZSh7aWQ6IG5hdmlnYXRpb24uZXh0cmFzLnN0YXRlLnRyYWNpbmdJZH0pO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ARGlyZWN0aXZlKHtzZWxlY3RvcjogJzpub3QoYSk6bm90KGFyZWEpW3JvdXRlckxpbmtdJ30pXG5leHBvcnQgY2xhc3MgUm91dGVyTGluayBpbXBsZW1lbnRzIE9uQ2hhbmdlcyB7XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgVXJsQ3JlYXRpb25PcHRpb25zYC5cbiAgICogQHNlZSB7QGxpbmsgVXJsQ3JlYXRpb25PcHRpb25zI3F1ZXJ5UGFyYW1zIFVybENyZWF0aW9uT3B0aW9ucyNxdWVyeVBhcmFtc31cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKSBxdWVyeVBhcmFtcz86IFBhcmFtc3xudWxsO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGVcbiAgICogYFVybENyZWF0aW9uT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNmcmFnbWVudCBVcmxDcmVhdGlvbk9wdGlvbnMjZnJhZ21lbnR9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgQElucHV0KCkgZnJhZ21lbnQ/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgVXJsQ3JlYXRpb25PcHRpb25zYC5cbiAgICogQHNlZSB7QGxpbmsgVXJsQ3JlYXRpb25PcHRpb25zI3F1ZXJ5UGFyYW1zSGFuZGxpbmcgVXJsQ3JlYXRpb25PcHRpb25zI3F1ZXJ5UGFyYW1zSGFuZGxpbmd9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgQElucHV0KCkgcXVlcnlQYXJhbXNIYW5kbGluZz86IFF1ZXJ5UGFyYW1zSGFuZGxpbmd8bnVsbDtcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcHJlc2VydmVGcmFnbWVudCBVcmxDcmVhdGlvbk9wdGlvbnMjcHJlc2VydmVGcmFnbWVudH1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgcHJlc2VydmVGcmFnbWVudCE6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjc2tpcExvY2F0aW9uQ2hhbmdlIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjc2tpcExvY2F0aW9uQ2hhbmdlfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybCBSb3V0ZXIjbmF2aWdhdGVCeVVybH1cbiAgICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASW5wdXQoKSBza2lwTG9jYXRpb25DaGFuZ2UhOiBib29sZWFuO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybCBSb3V0ZXIjbmF2aWdhdGVCeVVybH0gYXMgcGFydCBvZiB0aGVcbiAgICogYE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zI3JlcGxhY2VVcmwgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyNyZXBsYWNlVXJsfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybCBSb3V0ZXIjbmF2aWdhdGVCeVVybH1cbiAgICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASW5wdXQoKSByZXBsYWNlVXJsITogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI25hdmlnYXRlQnlVcmwgUm91dGVyI25hdmlnYXRlQnlVcmx9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zYC5cbiAgICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyNzdGF0ZSBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zI3N0YXRlfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybCBSb3V0ZXIjbmF2aWdhdGVCeVVybH1cbiAgICovXG4gIEBJbnB1dCgpIHN0YXRlPzoge1trOiBzdHJpbmddOiBhbnl9O1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGVcbiAgICogYFVybENyZWF0aW9uT3B0aW9uc2AuXG4gICAqIFNwZWNpZnkgYSB2YWx1ZSBoZXJlIHdoZW4geW91IGRvIG5vdCB3YW50IHRvIHVzZSB0aGUgZGVmYXVsdCB2YWx1ZVxuICAgKiBmb3IgYHJvdXRlckxpbmtgLCB3aGljaCBpcyB0aGUgY3VycmVudCBhY3RpdmF0ZWQgcm91dGUuXG4gICAqIE5vdGUgdGhhdCBhIHZhbHVlIG9mIGB1bmRlZmluZWRgIGhlcmUgd2lsbCB1c2UgdGhlIGByb3V0ZXJMaW5rYCBkZWZhdWx0LlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcmVsYXRpdmVUbyBVcmxDcmVhdGlvbk9wdGlvbnMjcmVsYXRpdmVUb31cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKSByZWxhdGl2ZVRvPzogQWN0aXZhdGVkUm91dGV8bnVsbDtcblxuICBwcml2YXRlIGNvbW1hbmRzOiBhbnlbXXxudWxsID0gbnVsbDtcblxuICAvKiogQGludGVybmFsICovXG4gIG9uQ2hhbmdlcyA9IG5ldyBTdWJqZWN0PFJvdXRlckxpbms+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLCBwcml2YXRlIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSxcbiAgICAgIEBBdHRyaWJ1dGUoJ3RhYmluZGV4JykgcHJpdmF0ZSByZWFkb25seSB0YWJJbmRleEF0dHJpYnV0ZTogc3RyaW5nfG51bGx8dW5kZWZpbmVkLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSByZW5kZXJlcjogUmVuZGVyZXIyLCBwcml2YXRlIHJlYWRvbmx5IGVsOiBFbGVtZW50UmVmKSB7XG4gICAgdGhpcy5zZXRUYWJJbmRleElmTm90T25OYXRpdmVFbCgnMCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIE1vZGlmaWVzIHRoZSB0YWIgaW5kZXggaWYgdGhlcmUgd2FzIG5vdCBhIHRhYmluZGV4IGF0dHJpYnV0ZSBvbiB0aGUgZWxlbWVudCBkdXJpbmdcbiAgICogaW5zdGFudGlhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgc2V0VGFiSW5kZXhJZk5vdE9uTmF0aXZlRWwobmV3VGFiSW5kZXg6IHN0cmluZ3xudWxsKSB7XG4gICAgaWYgKHRoaXMudGFiSW5kZXhBdHRyaWJ1dGUgIT0gbnVsbCAvKiBib3RoIGBudWxsYCBhbmQgYHVuZGVmaW5lZGAgKi8pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcmVuZGVyZXIgPSB0aGlzLnJlbmRlcmVyO1xuICAgIGNvbnN0IG5hdGl2ZUVsZW1lbnQgPSB0aGlzLmVsLm5hdGl2ZUVsZW1lbnQ7XG4gICAgaWYgKG5ld1RhYkluZGV4ICE9PSBudWxsKSB7XG4gICAgICByZW5kZXJlci5zZXRBdHRyaWJ1dGUobmF0aXZlRWxlbWVudCwgJ3RhYmluZGV4JywgbmV3VGFiSW5kZXgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZW5kZXJlci5yZW1vdmVBdHRyaWJ1dGUobmF0aXZlRWxlbWVudCwgJ3RhYmluZGV4Jyk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7XG4gICAgLy8gVGhpcyBpcyBzdWJzY3JpYmVkIHRvIGJ5IGBSb3V0ZXJMaW5rQWN0aXZlYCBzbyB0aGF0IGl0IGtub3dzIHRvIHVwZGF0ZSB3aGVuIHRoZXJlIGFyZSBjaGFuZ2VzXG4gICAgLy8gdG8gdGhlIFJvdXRlckxpbmtzIGl0J3MgdHJhY2tpbmcuXG4gICAgdGhpcy5vbkNoYW5nZXMubmV4dCh0aGlzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21tYW5kcyB0byBwYXNzIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0uXG4gICAqICAgLSAqKmFycmF5Kio6IGNvbW1hbmRzIHRvIHBhc3MgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfS5cbiAgICogICAtICoqc3RyaW5nKio6IHNob3J0aGFuZCBmb3IgYXJyYXkgb2YgY29tbWFuZHMgd2l0aCBqdXN0IHRoZSBzdHJpbmcsIGkuZS4gYFsnL3JvdXRlJ11gXG4gICAqICAgLSAqKm51bGx8dW5kZWZpbmVkKio6IGVmZmVjdGl2ZWx5IGRpc2FibGVzIHRoZSBgcm91dGVyTGlua2BcbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKVxuICBzZXQgcm91dGVyTGluayhjb21tYW5kczogYW55W118c3RyaW5nfG51bGx8dW5kZWZpbmVkKSB7XG4gICAgaWYgKGNvbW1hbmRzICE9IG51bGwpIHtcbiAgICAgIHRoaXMuY29tbWFuZHMgPSBBcnJheS5pc0FycmF5KGNvbW1hbmRzKSA/IGNvbW1hbmRzIDogW2NvbW1hbmRzXTtcbiAgICAgIHRoaXMuc2V0VGFiSW5kZXhJZk5vdE9uTmF0aXZlRWwoJzAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb21tYW5kcyA9IG51bGw7XG4gICAgICB0aGlzLnNldFRhYkluZGV4SWZOb3RPbk5hdGl2ZUVsKG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgQEhvc3RMaXN0ZW5lcignY2xpY2snKVxuICBvbkNsaWNrKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLnVybFRyZWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGV4dHJhcyA9IHtcbiAgICAgIHNraXBMb2NhdGlvbkNoYW5nZTogYXR0ckJvb2xWYWx1ZSh0aGlzLnNraXBMb2NhdGlvbkNoYW5nZSksXG4gICAgICByZXBsYWNlVXJsOiBhdHRyQm9vbFZhbHVlKHRoaXMucmVwbGFjZVVybCksXG4gICAgICBzdGF0ZTogdGhpcy5zdGF0ZSxcbiAgICB9O1xuICAgIHRoaXMucm91dGVyLm5hdmlnYXRlQnlVcmwodGhpcy51cmxUcmVlLCBleHRyYXMpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZ2V0IHVybFRyZWUoKTogVXJsVHJlZXxudWxsIHtcbiAgICBpZiAodGhpcy5jb21tYW5kcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJvdXRlci5jcmVhdGVVcmxUcmVlKHRoaXMuY29tbWFuZHMsIHtcbiAgICAgIC8vIElmIHRoZSBgcmVsYXRpdmVUb2AgaW5wdXQgaXMgbm90IGRlZmluZWQsIHdlIHdhbnQgdG8gdXNlIGB0aGlzLnJvdXRlYCBieSBkZWZhdWx0LlxuICAgICAgLy8gT3RoZXJ3aXNlLCB3ZSBzaG91bGQgdXNlIHRoZSB2YWx1ZSBwcm92aWRlZCBieSB0aGUgdXNlciBpbiB0aGUgaW5wdXQuXG4gICAgICByZWxhdGl2ZVRvOiB0aGlzLnJlbGF0aXZlVG8gIT09IHVuZGVmaW5lZCA/IHRoaXMucmVsYXRpdmVUbyA6IHRoaXMucm91dGUsXG4gICAgICBxdWVyeVBhcmFtczogdGhpcy5xdWVyeVBhcmFtcyxcbiAgICAgIGZyYWdtZW50OiB0aGlzLmZyYWdtZW50LFxuICAgICAgcXVlcnlQYXJhbXNIYW5kbGluZzogdGhpcy5xdWVyeVBhcmFtc0hhbmRsaW5nLFxuICAgICAgcHJlc2VydmVGcmFnbWVudDogYXR0ckJvb2xWYWx1ZSh0aGlzLnByZXNlcnZlRnJhZ21lbnQpLFxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogTGV0cyB5b3UgbGluayB0byBzcGVjaWZpYyByb3V0ZXMgaW4geW91ciBhcHAuXG4gKlxuICogU2VlIGBSb3V0ZXJMaW5rYCBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ARGlyZWN0aXZlKHtzZWxlY3RvcjogJ2Fbcm91dGVyTGlua10sYXJlYVtyb3V0ZXJMaW5rXSd9KVxuZXhwb3J0IGNsYXNzIFJvdXRlckxpbmtXaXRoSHJlZiBpbXBsZW1lbnRzIE9uQ2hhbmdlcywgT25EZXN0cm95IHtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBIb3N0QmluZGluZygnYXR0ci50YXJnZXQnKSBASW5wdXQoKSB0YXJnZXQhOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgVXJsQ3JlYXRpb25PcHRpb25zYC5cbiAgICogQHNlZSB7QGxpbmsgVXJsQ3JlYXRpb25PcHRpb25zI3F1ZXJ5UGFyYW1zIFVybENyZWF0aW9uT3B0aW9ucyNxdWVyeVBhcmFtc31cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKSBxdWVyeVBhcmFtcz86IFBhcmFtc3xudWxsO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGVcbiAgICogYFVybENyZWF0aW9uT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNmcmFnbWVudCBVcmxDcmVhdGlvbk9wdGlvbnMjZnJhZ21lbnR9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgQElucHV0KCkgZnJhZ21lbnQ/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgVXJsQ3JlYXRpb25PcHRpb25zYC5cbiAgICogQHNlZSB7QGxpbmsgVXJsQ3JlYXRpb25PcHRpb25zI3F1ZXJ5UGFyYW1zSGFuZGxpbmcgVXJsQ3JlYXRpb25PcHRpb25zI3F1ZXJ5UGFyYW1zSGFuZGxpbmd9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgQElucHV0KCkgcXVlcnlQYXJhbXNIYW5kbGluZz86IFF1ZXJ5UGFyYW1zSGFuZGxpbmd8bnVsbDtcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcHJlc2VydmVGcmFnbWVudCBVcmxDcmVhdGlvbk9wdGlvbnMjcHJlc2VydmVGcmFnbWVudH1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgcHJlc2VydmVGcmFnbWVudCE6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjc2tpcExvY2F0aW9uQ2hhbmdlIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjc2tpcExvY2F0aW9uQ2hhbmdlfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybCBSb3V0ZXIjbmF2aWdhdGVCeVVybH1cbiAgICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASW5wdXQoKSBza2lwTG9jYXRpb25DaGFuZ2UhOiBib29sZWFuO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybCBSb3V0ZXIjbmF2aWdhdGVCeVVybH0gYXMgcGFydCBvZiB0aGVcbiAgICogYE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zI3JlcGxhY2VVcmwgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyNyZXBsYWNlVXJsfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybCBSb3V0ZXIjbmF2aWdhdGVCeVVybH1cbiAgICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASW5wdXQoKSByZXBsYWNlVXJsITogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI25hdmlnYXRlQnlVcmwgUm91dGVyI25hdmlnYXRlQnlVcmx9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zYC5cbiAgICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyNzdGF0ZSBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zI3N0YXRlfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybCBSb3V0ZXIjbmF2aWdhdGVCeVVybH1cbiAgICovXG4gIEBJbnB1dCgpIHN0YXRlPzoge1trOiBzdHJpbmddOiBhbnl9O1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGVcbiAgICogYFVybENyZWF0aW9uT3B0aW9uc2AuXG4gICAqIFNwZWNpZnkgYSB2YWx1ZSBoZXJlIHdoZW4geW91IGRvIG5vdCB3YW50IHRvIHVzZSB0aGUgZGVmYXVsdCB2YWx1ZVxuICAgKiBmb3IgYHJvdXRlckxpbmtgLCB3aGljaCBpcyB0aGUgY3VycmVudCBhY3RpdmF0ZWQgcm91dGUuXG4gICAqIE5vdGUgdGhhdCBhIHZhbHVlIG9mIGB1bmRlZmluZWRgIGhlcmUgd2lsbCB1c2UgdGhlIGByb3V0ZXJMaW5rYCBkZWZhdWx0LlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcmVsYXRpdmVUbyBVcmxDcmVhdGlvbk9wdGlvbnMjcmVsYXRpdmVUb31cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKSByZWxhdGl2ZVRvPzogQWN0aXZhdGVkUm91dGV8bnVsbDtcblxuICBwcml2YXRlIGNvbW1hbmRzOiBhbnlbXXxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvbjtcblxuICAvLyB0aGUgdXJsIGRpc3BsYXllZCBvbiB0aGUgYW5jaG9yIGVsZW1lbnQuXG4gIC8vIEBIb3N0QmluZGluZygnYXR0ci5ocmVmJykgaXMgdXNlZCByYXRoZXIgdGhhbiBASG9zdEJpbmRpbmcoKSBiZWNhdXNlIGl0IHJlbW92ZXMgdGhlXG4gIC8vIGhyZWYgYXR0cmlidXRlIHdoZW4gaXQgYmVjb21lcyBgbnVsbGAuXG4gIEBIb3N0QmluZGluZygnYXR0ci5ocmVmJykgaHJlZjogc3RyaW5nfG51bGwgPSBudWxsO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgb25DaGFuZ2VzID0gbmV3IFN1YmplY3Q8Um91dGVyTGlua1dpdGhIcmVmPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZXI6IFJvdXRlciwgcHJpdmF0ZSByb3V0ZTogQWN0aXZhdGVkUm91dGUsXG4gICAgICBwcml2YXRlIGxvY2F0aW9uU3RyYXRlZ3k6IExvY2F0aW9uU3RyYXRlZ3kpIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbiA9IHJvdXRlci5ldmVudHMuc3Vic2NyaWJlKChzOiBFdmVudCkgPT4ge1xuICAgICAgaWYgKHMgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICAgIHRoaXMudXBkYXRlVGFyZ2V0VXJsQW5kSHJlZigpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbW1hbmRzIHRvIHBhc3MgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfS5cbiAgICogICAtICoqYXJyYXkqKjogY29tbWFuZHMgdG8gcGFzcyB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9LlxuICAgKiAgIC0gKipzdHJpbmcqKjogc2hvcnRoYW5kIGZvciBhcnJheSBvZiBjb21tYW5kcyB3aXRoIGp1c3QgdGhlIHN0cmluZywgaS5lLiBgWycvcm91dGUnXWBcbiAgICogICAtICoqbnVsbHx1bmRlZmluZWQqKjogRGlzYWJsZXMgdGhlIGxpbmsgYnkgcmVtb3ZpbmcgdGhlIGBocmVmYFxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpXG4gIHNldCByb3V0ZXJMaW5rKGNvbW1hbmRzOiBhbnlbXXxzdHJpbmd8bnVsbHx1bmRlZmluZWQpIHtcbiAgICBpZiAoY29tbWFuZHMgIT0gbnVsbCkge1xuICAgICAgdGhpcy5jb21tYW5kcyA9IEFycmF5LmlzQXJyYXkoY29tbWFuZHMpID8gY29tbWFuZHMgOiBbY29tbWFuZHNdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbW1hbmRzID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpOiBhbnkge1xuICAgIHRoaXMudXBkYXRlVGFyZ2V0VXJsQW5kSHJlZigpO1xuICAgIHRoaXMub25DaGFuZ2VzLm5leHQodGhpcyk7XG4gIH1cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiBhbnkge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIEBIb3N0TGlzdGVuZXIoXG4gICAgICAnY2xpY2snLFxuICAgICAgWyckZXZlbnQuYnV0dG9uJywgJyRldmVudC5jdHJsS2V5JywgJyRldmVudC5zaGlmdEtleScsICckZXZlbnQuYWx0S2V5JywgJyRldmVudC5tZXRhS2V5J10pXG4gIG9uQ2xpY2soYnV0dG9uOiBudW1iZXIsIGN0cmxLZXk6IGJvb2xlYW4sIHNoaWZ0S2V5OiBib29sZWFuLCBhbHRLZXk6IGJvb2xlYW4sIG1ldGFLZXk6IGJvb2xlYW4pOlxuICAgICAgYm9vbGVhbiB7XG4gICAgaWYgKGJ1dHRvbiAhPT0gMCB8fCBjdHJsS2V5IHx8IHNoaWZ0S2V5IHx8IGFsdEtleSB8fCBtZXRhS2V5KSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHRoaXMudGFyZ2V0ID09PSAnc3RyaW5nJyAmJiB0aGlzLnRhcmdldCAhPSAnX3NlbGYnIHx8IHRoaXMudXJsVHJlZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgY29uc3QgZXh0cmFzID0ge1xuICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiBhdHRyQm9vbFZhbHVlKHRoaXMuc2tpcExvY2F0aW9uQ2hhbmdlKSxcbiAgICAgIHJlcGxhY2VVcmw6IGF0dHJCb29sVmFsdWUodGhpcy5yZXBsYWNlVXJsKSxcbiAgICAgIHN0YXRlOiB0aGlzLnN0YXRlXG4gICAgfTtcbiAgICB0aGlzLnJvdXRlci5uYXZpZ2F0ZUJ5VXJsKHRoaXMudXJsVHJlZSwgZXh0cmFzKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZVRhcmdldFVybEFuZEhyZWYoKTogdm9pZCB7XG4gICAgdGhpcy5ocmVmID0gdGhpcy51cmxUcmVlICE9PSBudWxsID9cbiAgICAgICAgdGhpcy5sb2NhdGlvblN0cmF0ZWd5LnByZXBhcmVFeHRlcm5hbFVybCh0aGlzLnJvdXRlci5zZXJpYWxpemVVcmwodGhpcy51cmxUcmVlKSkgOlxuICAgICAgICBudWxsO1xuICB9XG5cbiAgZ2V0IHVybFRyZWUoKTogVXJsVHJlZXxudWxsIHtcbiAgICBpZiAodGhpcy5jb21tYW5kcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJvdXRlci5jcmVhdGVVcmxUcmVlKHRoaXMuY29tbWFuZHMsIHtcbiAgICAgIC8vIElmIHRoZSBgcmVsYXRpdmVUb2AgaW5wdXQgaXMgbm90IGRlZmluZWQsIHdlIHdhbnQgdG8gdXNlIGB0aGlzLnJvdXRlYCBieSBkZWZhdWx0LlxuICAgICAgLy8gT3RoZXJ3aXNlLCB3ZSBzaG91bGQgdXNlIHRoZSB2YWx1ZSBwcm92aWRlZCBieSB0aGUgdXNlciBpbiB0aGUgaW5wdXQuXG4gICAgICByZWxhdGl2ZVRvOiB0aGlzLnJlbGF0aXZlVG8gIT09IHVuZGVmaW5lZCA/IHRoaXMucmVsYXRpdmVUbyA6IHRoaXMucm91dGUsXG4gICAgICBxdWVyeVBhcmFtczogdGhpcy5xdWVyeVBhcmFtcyxcbiAgICAgIGZyYWdtZW50OiB0aGlzLmZyYWdtZW50LFxuICAgICAgcXVlcnlQYXJhbXNIYW5kbGluZzogdGhpcy5xdWVyeVBhcmFtc0hhbmRsaW5nLFxuICAgICAgcHJlc2VydmVGcmFnbWVudDogYXR0ckJvb2xWYWx1ZSh0aGlzLnByZXNlcnZlRnJhZ21lbnQpLFxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGF0dHJCb29sVmFsdWUoczogYW55KTogYm9vbGVhbiB7XG4gIHJldHVybiBzID09PSAnJyB8fCAhIXM7XG59XG4iXX0=