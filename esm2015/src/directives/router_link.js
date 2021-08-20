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
RouterLink.ɵfac = function RouterLink_Factory(t) { return new (t || RouterLink)(i0.ɵɵdirectiveInject(i1.Router), i0.ɵɵdirectiveInject(i2.ActivatedRoute), i0.ɵɵinjectAttribute('tabindex'), i0.ɵɵdirectiveInject(i0.Renderer2), i0.ɵɵdirectiveInject(i0.ElementRef)); };
RouterLink.ɵdir = /*@__PURE__*/ i0.ɵɵdefineDirective({ type: RouterLink, selectors: [["", "routerLink", "", 5, "a", 5, "area"]], hostBindings: function RouterLink_HostBindings(rf, ctx) { if (rf & 1) {
        i0.ɵɵlistener("click", function RouterLink_click_HostBindingHandler() { return ctx.onClick(); });
    } }, inputs: { queryParams: "queryParams", fragment: "fragment", queryParamsHandling: "queryParamsHandling", preserveFragment: "preserveFragment", skipLocationChange: "skipLocationChange", replaceUrl: "replaceUrl", state: "state", relativeTo: "relativeTo", routerLink: "routerLink" }, features: [i0.ɵɵNgOnChangesFeature] });
(function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(RouterLink, [{
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
        }], relativeTo: [{
            type: Input
        }], routerLink: [{
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
RouterLinkWithHref.ɵfac = function RouterLinkWithHref_Factory(t) { return new (t || RouterLinkWithHref)(i0.ɵɵdirectiveInject(i1.Router), i0.ɵɵdirectiveInject(i2.ActivatedRoute), i0.ɵɵdirectiveInject(i3.LocationStrategy)); };
RouterLinkWithHref.ɵdir = /*@__PURE__*/ i0.ɵɵdefineDirective({ type: RouterLinkWithHref, selectors: [["a", "routerLink", ""], ["area", "routerLink", ""]], hostVars: 2, hostBindings: function RouterLinkWithHref_HostBindings(rf, ctx) { if (rf & 1) {
        i0.ɵɵlistener("click", function RouterLinkWithHref_click_HostBindingHandler($event) { return ctx.onClick($event.button, $event.ctrlKey, $event.shiftKey, $event.altKey, $event.metaKey); });
    } if (rf & 2) {
        i0.ɵɵattribute("target", ctx.target)("href", ctx.href, i0.ɵɵsanitizeUrl);
    } }, inputs: { target: "target", queryParams: "queryParams", fragment: "fragment", queryParamsHandling: "queryParamsHandling", preserveFragment: "preserveFragment", skipLocationChange: "skipLocationChange", replaceUrl: "replaceUrl", state: "state", relativeTo: "relativeTo", routerLink: "routerLink" }, features: [i0.ɵɵNgOnChangesFeature] });
(function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(RouterLinkWithHref, [{
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
        }] }); })();
function attrBoolValue(s) {
    return s === '' || !!s;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDakQsT0FBTyxFQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUF3QixTQUFTLEVBQWdCLE1BQU0sZUFBZSxDQUFDO0FBQ2pKLE9BQU8sRUFBQyxPQUFPLEVBQWUsTUFBTSxNQUFNLENBQUM7QUFHM0MsT0FBTyxFQUFRLGFBQWEsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUMvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQ2pDLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQzs7Ozs7QUFLL0M7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWdHRztBQUVILE1BQU0sT0FBTyxVQUFVO0lBcUVyQixZQUNZLE1BQWMsRUFBVSxLQUFxQixFQUNiLGlCQUF3QyxFQUMvRCxRQUFtQixFQUFtQixFQUFjO1FBRjdELFdBQU0sR0FBTixNQUFNLENBQVE7UUFBVSxVQUFLLEdBQUwsS0FBSyxDQUFnQjtRQUNiLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBdUI7UUFDL0QsYUFBUSxHQUFSLFFBQVEsQ0FBVztRQUFtQixPQUFFLEdBQUYsRUFBRSxDQUFZO1FBUmpFLGFBQVEsR0FBZSxJQUFJLENBQUM7UUFFcEMsZ0JBQWdCO1FBQ2hCLGNBQVMsR0FBRyxJQUFJLE9BQU8sRUFBYyxDQUFDO1FBTXBDLElBQUks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QUFDLFdBQVc7WUF1QnBCLFVBQVU7a0JBRGIsS0FBSztZQXVCTixPQUFPO2tCQUhOLFlBQVk7bUJBQ1QsT0FBTztnQkFDUCxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLENBQUM7O0FBMEMvRixTQUFTLGFBQWEsQ0FBQyxDQUFNO0lBQzNCLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvblN0cmF0ZWd5fSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtBdHRyaWJ1dGUsIERpcmVjdGl2ZSwgRWxlbWVudFJlZiwgSG9zdEJpbmRpbmcsIEhvc3RMaXN0ZW5lciwgSW5wdXQsIE9uQ2hhbmdlcywgT25EZXN0cm95LCBSZW5kZXJlcjIsIFNpbXBsZUNoYW5nZXN9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtTdWJqZWN0LCBTdWJzY3JpcHRpb259IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge1F1ZXJ5UGFyYW1zSGFuZGxpbmd9IGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQge0V2ZW50LCBOYXZpZ2F0aW9uRW5kfSBmcm9tICcuLi9ldmVudHMnO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJy4uL3JvdXRlcic7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlfSBmcm9tICcuLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQYXJhbXN9IGZyb20gJy4uL3NoYXJlZCc7XG5pbXBvcnQge1VybFRyZWV9IGZyb20gJy4uL3VybF90cmVlJztcblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFdoZW4gYXBwbGllZCB0byBhbiBlbGVtZW50IGluIGEgdGVtcGxhdGUsIG1ha2VzIHRoYXQgZWxlbWVudCBhIGxpbmtcbiAqIHRoYXQgaW5pdGlhdGVzIG5hdmlnYXRpb24gdG8gYSByb3V0ZS4gTmF2aWdhdGlvbiBvcGVucyBvbmUgb3IgbW9yZSByb3V0ZWQgY29tcG9uZW50c1xuICogaW4gb25lIG9yIG1vcmUgYDxyb3V0ZXItb3V0bGV0PmAgbG9jYXRpb25zIG9uIHRoZSBwYWdlLlxuICpcbiAqIEdpdmVuIGEgcm91dGUgY29uZmlndXJhdGlvbiBgW3sgcGF0aDogJ3VzZXIvOm5hbWUnLCBjb21wb25lbnQ6IFVzZXJDbXAgfV1gLFxuICogdGhlIGZvbGxvd2luZyBjcmVhdGVzIGEgc3RhdGljIGxpbmsgdG8gdGhlIHJvdXRlOlxuICogYDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIj5saW5rIHRvIHVzZXIgY29tcG9uZW50PC9hPmBcbiAqXG4gKiBZb3UgY2FuIHVzZSBkeW5hbWljIHZhbHVlcyB0byBnZW5lcmF0ZSB0aGUgbGluay5cbiAqIEZvciBhIGR5bmFtaWMgbGluaywgcGFzcyBhbiBhcnJheSBvZiBwYXRoIHNlZ21lbnRzLFxuICogZm9sbG93ZWQgYnkgdGhlIHBhcmFtcyBmb3IgZWFjaCBzZWdtZW50LlxuICogRm9yIGV4YW1wbGUsIGBbJy90ZWFtJywgdGVhbUlkLCAndXNlcicsIHVzZXJOYW1lLCB7ZGV0YWlsczogdHJ1ZX1dYFxuICogZ2VuZXJhdGVzIGEgbGluayB0byBgL3RlYW0vMTEvdXNlci9ib2I7ZGV0YWlscz10cnVlYC5cbiAqXG4gKiBNdWx0aXBsZSBzdGF0aWMgc2VnbWVudHMgY2FuIGJlIG1lcmdlZCBpbnRvIG9uZSB0ZXJtIGFuZCBjb21iaW5lZCB3aXRoIGR5bmFtaWMgc2VnZW1lbnRzLlxuICogRm9yIGV4YW1wbGUsIGBbJy90ZWFtLzExL3VzZXInLCB1c2VyTmFtZSwge2RldGFpbHM6IHRydWV9XWBcbiAqXG4gKiBUaGUgaW5wdXQgdGhhdCB5b3UgcHJvdmlkZSB0byB0aGUgbGluayBpcyB0cmVhdGVkIGFzIGEgZGVsdGEgdG8gdGhlIGN1cnJlbnQgVVJMLlxuICogRm9yIGluc3RhbmNlLCBzdXBwb3NlIHRoZSBjdXJyZW50IFVSTCBpcyBgL3VzZXIvKGJveC8vYXV4OnRlYW0pYC5cbiAqIFRoZSBsaW5rIGA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2ppbSddXCI+SmltPC9hPmAgY3JlYXRlcyB0aGUgVVJMXG4gKiBgL3VzZXIvKGppbS8vYXV4OnRlYW0pYC5cbiAqIFNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgY3JlYXRlVXJsVHJlZX0gZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBZb3UgY2FuIHVzZSBhYnNvbHV0ZSBvciByZWxhdGl2ZSBwYXRocyBpbiBhIGxpbmssIHNldCBxdWVyeSBwYXJhbWV0ZXJzLFxuICogY29udHJvbCBob3cgcGFyYW1ldGVycyBhcmUgaGFuZGxlZCwgYW5kIGtlZXAgYSBoaXN0b3J5IG9mIG5hdmlnYXRpb24gc3RhdGVzLlxuICpcbiAqICMjIyBSZWxhdGl2ZSBsaW5rIHBhdGhzXG4gKlxuICogVGhlIGZpcnN0IHNlZ21lbnQgbmFtZSBjYW4gYmUgcHJlcGVuZGVkIHdpdGggYC9gLCBgLi9gLCBvciBgLi4vYC5cbiAqICogSWYgdGhlIGZpcnN0IHNlZ21lbnQgYmVnaW5zIHdpdGggYC9gLCB0aGUgcm91dGVyIGxvb2tzIHVwIHRoZSByb3V0ZSBmcm9tIHRoZSByb290IG9mIHRoZVxuICogICBhcHAuXG4gKiAqIElmIHRoZSBmaXJzdCBzZWdtZW50IGJlZ2lucyB3aXRoIGAuL2AsIG9yIGRvZXNuJ3QgYmVnaW4gd2l0aCBhIHNsYXNoLCB0aGUgcm91dGVyXG4gKiAgIGxvb2tzIGluIHRoZSBjaGlsZHJlbiBvZiB0aGUgY3VycmVudCBhY3RpdmF0ZWQgcm91dGUuXG4gKiAqIElmIHRoZSBmaXJzdCBzZWdtZW50IGJlZ2lucyB3aXRoIGAuLi9gLCB0aGUgcm91dGVyIGdvZXMgdXAgb25lIGxldmVsIGluIHRoZSByb3V0ZSB0cmVlLlxuICpcbiAqICMjIyBTZXR0aW5nIGFuZCBoYW5kbGluZyBxdWVyeSBwYXJhbXMgYW5kIGZyYWdtZW50c1xuICpcbiAqIFRoZSBmb2xsb3dpbmcgbGluayBhZGRzIGEgcXVlcnkgcGFyYW1ldGVyIGFuZCBhIGZyYWdtZW50IHRvIHRoZSBnZW5lcmF0ZWQgVVJMOlxuICpcbiAqIGBgYFxuICogPGEgW3JvdXRlckxpbmtdPVwiWycvdXNlci9ib2InXVwiIFtxdWVyeVBhcmFtc109XCJ7ZGVidWc6IHRydWV9XCIgZnJhZ21lbnQ9XCJlZHVjYXRpb25cIj5cbiAqICAgbGluayB0byB1c2VyIGNvbXBvbmVudFxuICogPC9hPlxuICogYGBgXG4gKiBCeSBkZWZhdWx0LCB0aGUgZGlyZWN0aXZlIGNvbnN0cnVjdHMgdGhlIG5ldyBVUkwgdXNpbmcgdGhlIGdpdmVuIHF1ZXJ5IHBhcmFtZXRlcnMuXG4gKiBUaGUgZXhhbXBsZSBnZW5lcmF0ZXMgdGhlIGxpbms6IGAvdXNlci9ib2I/ZGVidWc9dHJ1ZSNlZHVjYXRpb25gLlxuICpcbiAqIFlvdSBjYW4gaW5zdHJ1Y3QgdGhlIGRpcmVjdGl2ZSB0byBoYW5kbGUgcXVlcnkgcGFyYW1ldGVycyBkaWZmZXJlbnRseVxuICogYnkgc3BlY2lmeWluZyB0aGUgYHF1ZXJ5UGFyYW1zSGFuZGxpbmdgIG9wdGlvbiBpbiB0aGUgbGluay5cbiAqIEFsbG93ZWQgdmFsdWVzIGFyZTpcbiAqXG4gKiAgLSBgJ21lcmdlJ2A6IE1lcmdlIHRoZSBnaXZlbiBgcXVlcnlQYXJhbXNgIGludG8gdGhlIGN1cnJlbnQgcXVlcnkgcGFyYW1zLlxuICogIC0gYCdwcmVzZXJ2ZSdgOiBQcmVzZXJ2ZSB0aGUgY3VycmVudCBxdWVyeSBwYXJhbXMuXG4gKlxuICogRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2JvYiddXCIgW3F1ZXJ5UGFyYW1zXT1cIntkZWJ1ZzogdHJ1ZX1cIiBxdWVyeVBhcmFtc0hhbmRsaW5nPVwibWVyZ2VcIj5cbiAqICAgbGluayB0byB1c2VyIGNvbXBvbmVudFxuICogPC9hPlxuICogYGBgXG4gKlxuICogU2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMucXVlcnlQYXJhbXNIYW5kbGluZyBVcmxDcmVhdGlvbk9wdGlvbnMjcXVlcnlQYXJhbXNIYW5kbGluZ30uXG4gKlxuICogIyMjIFByZXNlcnZpbmcgbmF2aWdhdGlvbiBoaXN0b3J5XG4gKlxuICogWW91IGNhbiBwcm92aWRlIGEgYHN0YXRlYCB2YWx1ZSB0byBiZSBwZXJzaXN0ZWQgdG8gdGhlIGJyb3dzZXInc1xuICogW2BIaXN0b3J5LnN0YXRlYCBwcm9wZXJ0eV0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0hpc3RvcnkjUHJvcGVydGllcykuXG4gKiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIDxhIFtyb3V0ZXJMaW5rXT1cIlsnL3VzZXIvYm9iJ11cIiBbc3RhdGVdPVwie3RyYWNpbmdJZDogMTIzfVwiPlxuICogICBsaW5rIHRvIHVzZXIgY29tcG9uZW50XG4gKiA8L2E+XG4gKiBgYGBcbiAqXG4gKiBVc2Uge0BsaW5rIFJvdXRlci5nZXRDdXJyZW50TmF2aWdhdGlvbigpIFJvdXRlciNnZXRDdXJyZW50TmF2aWdhdGlvbn0gdG8gcmV0cmlldmUgYSBzYXZlZFxuICogbmF2aWdhdGlvbi1zdGF0ZSB2YWx1ZS4gRm9yIGV4YW1wbGUsIHRvIGNhcHR1cmUgdGhlIGB0cmFjaW5nSWRgIGR1cmluZyB0aGUgYE5hdmlnYXRpb25TdGFydGBcbiAqIGV2ZW50OlxuICpcbiAqIGBgYFxuICogLy8gR2V0IE5hdmlnYXRpb25TdGFydCBldmVudHNcbiAqIHJvdXRlci5ldmVudHMucGlwZShmaWx0ZXIoZSA9PiBlIGluc3RhbmNlb2YgTmF2aWdhdGlvblN0YXJ0KSkuc3Vic2NyaWJlKGUgPT4ge1xuICogICBjb25zdCBuYXZpZ2F0aW9uID0gcm91dGVyLmdldEN1cnJlbnROYXZpZ2F0aW9uKCk7XG4gKiAgIHRyYWNpbmdTZXJ2aWNlLnRyYWNlKHtpZDogbmF2aWdhdGlvbi5leHRyYXMuc3RhdGUudHJhY2luZ0lkfSk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBEaXJlY3RpdmUoe3NlbGVjdG9yOiAnOm5vdChhKTpub3QoYXJlYSlbcm91dGVyTGlua10nfSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJMaW5rIGltcGxlbWVudHMgT25DaGFuZ2VzIHtcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcXVlcnlQYXJhbXMgVXJsQ3JlYXRpb25PcHRpb25zI3F1ZXJ5UGFyYW1zfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpIHF1ZXJ5UGFyYW1zPzogUGFyYW1zfG51bGw7XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgVXJsQ3JlYXRpb25PcHRpb25zYC5cbiAgICogQHNlZSB7QGxpbmsgVXJsQ3JlYXRpb25PcHRpb25zI2ZyYWdtZW50IFVybENyZWF0aW9uT3B0aW9ucyNmcmFnbWVudH1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKSBmcmFnbWVudD86IHN0cmluZztcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcXVlcnlQYXJhbXNIYW5kbGluZyBVcmxDcmVhdGlvbk9wdGlvbnMjcXVlcnlQYXJhbXNIYW5kbGluZ31cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKSBxdWVyeVBhcmFtc0hhbmRsaW5nPzogUXVlcnlQYXJhbXNIYW5kbGluZ3xudWxsO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGVcbiAgICogYFVybENyZWF0aW9uT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNwcmVzZXJ2ZUZyYWdtZW50IFVybENyZWF0aW9uT3B0aW9ucyNwcmVzZXJ2ZUZyYWdtZW50fVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASW5wdXQoKSBwcmVzZXJ2ZUZyYWdtZW50ITogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI25hdmlnYXRlQnlVcmwgUm91dGVyI25hdmlnYXRlQnlVcmx9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zYC5cbiAgICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyNza2lwTG9jYXRpb25DaGFuZ2UgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyNza2lwTG9jYXRpb25DaGFuZ2V9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfVxuICAgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHNraXBMb2NhdGlvbkNoYW5nZSE6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjcmVwbGFjZVVybCBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zI3JlcGxhY2VVcmx9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfVxuICAgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHJlcGxhY2VVcmwhOiBib29sZWFuO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybCBSb3V0ZXIjbmF2aWdhdGVCeVVybH0gYXMgcGFydCBvZiB0aGVcbiAgICogYE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zI3N0YXRlIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjc3RhdGV9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfVxuICAgKi9cbiAgQElucHV0KCkgc3RhdGU/OiB7W2s6IHN0cmluZ106IGFueX07XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgVXJsQ3JlYXRpb25PcHRpb25zYC5cbiAgICogU3BlY2lmeSBhIHZhbHVlIGhlcmUgd2hlbiB5b3UgZG8gbm90IHdhbnQgdG8gdXNlIHRoZSBkZWZhdWx0IHZhbHVlXG4gICAqIGZvciBgcm91dGVyTGlua2AsIHdoaWNoIGlzIHRoZSBjdXJyZW50IGFjdGl2YXRlZCByb3V0ZS5cbiAgICogTm90ZSB0aGF0IGEgdmFsdWUgb2YgYHVuZGVmaW5lZGAgaGVyZSB3aWxsIHVzZSB0aGUgYHJvdXRlckxpbmtgIGRlZmF1bHQuXG4gICAqIEBzZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNyZWxhdGl2ZVRvIFVybENyZWF0aW9uT3B0aW9ucyNyZWxhdGl2ZVRvfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpIHJlbGF0aXZlVG8/OiBBY3RpdmF0ZWRSb3V0ZXxudWxsO1xuXG4gIHByaXZhdGUgY29tbWFuZHM6IGFueVtdfG51bGwgPSBudWxsO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgb25DaGFuZ2VzID0gbmV3IFN1YmplY3Q8Um91dGVyTGluaz4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsIHByaXZhdGUgcm91dGU6IEFjdGl2YXRlZFJvdXRlLFxuICAgICAgQEF0dHJpYnV0ZSgndGFiaW5kZXgnKSBwcml2YXRlIHJlYWRvbmx5IHRhYkluZGV4QXR0cmlidXRlOiBzdHJpbmd8bnVsbHx1bmRlZmluZWQsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHJlbmRlcmVyOiBSZW5kZXJlcjIsIHByaXZhdGUgcmVhZG9ubHkgZWw6IEVsZW1lbnRSZWYpIHtcbiAgICB0aGlzLnNldFRhYkluZGV4SWZOb3RPbk5hdGl2ZUVsKCcwJyk7XG4gIH1cblxuICAvKipcbiAgICogTW9kaWZpZXMgdGhlIHRhYiBpbmRleCBpZiB0aGVyZSB3YXMgbm90IGEgdGFiaW5kZXggYXR0cmlidXRlIG9uIHRoZSBlbGVtZW50IGR1cmluZ1xuICAgKiBpbnN0YW50aWF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBzZXRUYWJJbmRleElmTm90T25OYXRpdmVFbChuZXdUYWJJbmRleDogc3RyaW5nfG51bGwpIHtcbiAgICBpZiAodGhpcy50YWJJbmRleEF0dHJpYnV0ZSAhPSBudWxsIC8qIGJvdGggYG51bGxgIGFuZCBgdW5kZWZpbmVkYCAqLykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCByZW5kZXJlciA9IHRoaXMucmVuZGVyZXI7XG4gICAgY29uc3QgbmF0aXZlRWxlbWVudCA9IHRoaXMuZWwubmF0aXZlRWxlbWVudDtcbiAgICBpZiAobmV3VGFiSW5kZXggIT09IG51bGwpIHtcbiAgICAgIHJlbmRlcmVyLnNldEF0dHJpYnV0ZShuYXRpdmVFbGVtZW50LCAndGFiaW5kZXgnLCBuZXdUYWJJbmRleCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlbmRlcmVyLnJlbW92ZUF0dHJpYnV0ZShuYXRpdmVFbGVtZW50LCAndGFiaW5kZXgnKTtcbiAgICB9XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpIHtcbiAgICAvLyBUaGlzIGlzIHN1YnNjcmliZWQgdG8gYnkgYFJvdXRlckxpbmtBY3RpdmVgIHNvIHRoYXQgaXQga25vd3MgdG8gdXBkYXRlIHdoZW4gdGhlcmUgYXJlIGNoYW5nZXNcbiAgICAvLyB0byB0aGUgUm91dGVyTGlua3MgaXQncyB0cmFja2luZy5cbiAgICB0aGlzLm9uQ2hhbmdlcy5uZXh0KHRoaXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbW1hbmRzIHRvIHBhc3MgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfS5cbiAgICogICAtICoqYXJyYXkqKjogY29tbWFuZHMgdG8gcGFzcyB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9LlxuICAgKiAgIC0gKipzdHJpbmcqKjogc2hvcnRoYW5kIGZvciBhcnJheSBvZiBjb21tYW5kcyB3aXRoIGp1c3QgdGhlIHN0cmluZywgaS5lLiBgWycvcm91dGUnXWBcbiAgICogICAtICoqbnVsbHx1bmRlZmluZWQqKjogZWZmZWN0aXZlbHkgZGlzYWJsZXMgdGhlIGByb3V0ZXJMaW5rYFxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpXG4gIHNldCByb3V0ZXJMaW5rKGNvbW1hbmRzOiBhbnlbXXxzdHJpbmd8bnVsbHx1bmRlZmluZWQpIHtcbiAgICBpZiAoY29tbWFuZHMgIT0gbnVsbCkge1xuICAgICAgdGhpcy5jb21tYW5kcyA9IEFycmF5LmlzQXJyYXkoY29tbWFuZHMpID8gY29tbWFuZHMgOiBbY29tbWFuZHNdO1xuICAgICAgdGhpcy5zZXRUYWJJbmRleElmTm90T25OYXRpdmVFbCgnMCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbW1hbmRzID0gbnVsbDtcbiAgICAgIHRoaXMuc2V0VGFiSW5kZXhJZk5vdE9uTmF0aXZlRWwobnVsbCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBASG9zdExpc3RlbmVyKCdjbGljaycpXG4gIG9uQ2xpY2soKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMudXJsVHJlZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgY29uc3QgZXh0cmFzID0ge1xuICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiBhdHRyQm9vbFZhbHVlKHRoaXMuc2tpcExvY2F0aW9uQ2hhbmdlKSxcbiAgICAgIHJlcGxhY2VVcmw6IGF0dHJCb29sVmFsdWUodGhpcy5yZXBsYWNlVXJsKSxcbiAgICAgIHN0YXRlOiB0aGlzLnN0YXRlLFxuICAgIH07XG4gICAgdGhpcy5yb3V0ZXIubmF2aWdhdGVCeVVybCh0aGlzLnVybFRyZWUsIGV4dHJhcyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBnZXQgdXJsVHJlZSgpOiBVcmxUcmVlfG51bGwge1xuICAgIGlmICh0aGlzLmNvbW1hbmRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucm91dGVyLmNyZWF0ZVVybFRyZWUodGhpcy5jb21tYW5kcywge1xuICAgICAgLy8gSWYgdGhlIGByZWxhdGl2ZVRvYCBpbnB1dCBpcyBub3QgZGVmaW5lZCwgd2Ugd2FudCB0byB1c2UgYHRoaXMucm91dGVgIGJ5IGRlZmF1bHQuXG4gICAgICAvLyBPdGhlcndpc2UsIHdlIHNob3VsZCB1c2UgdGhlIHZhbHVlIHByb3ZpZGVkIGJ5IHRoZSB1c2VyIGluIHRoZSBpbnB1dC5cbiAgICAgIHJlbGF0aXZlVG86IHRoaXMucmVsYXRpdmVUbyAhPT0gdW5kZWZpbmVkID8gdGhpcy5yZWxhdGl2ZVRvIDogdGhpcy5yb3V0ZSxcbiAgICAgIHF1ZXJ5UGFyYW1zOiB0aGlzLnF1ZXJ5UGFyYW1zLFxuICAgICAgZnJhZ21lbnQ6IHRoaXMuZnJhZ21lbnQsXG4gICAgICBxdWVyeVBhcmFtc0hhbmRsaW5nOiB0aGlzLnF1ZXJ5UGFyYW1zSGFuZGxpbmcsXG4gICAgICBwcmVzZXJ2ZUZyYWdtZW50OiBhdHRyQm9vbFZhbHVlKHRoaXMucHJlc2VydmVGcmFnbWVudCksXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBMZXRzIHlvdSBsaW5rIHRvIHNwZWNpZmljIHJvdXRlcyBpbiB5b3VyIGFwcC5cbiAqXG4gKiBTZWUgYFJvdXRlckxpbmtgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICpcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBEaXJlY3RpdmUoe3NlbGVjdG9yOiAnYVtyb3V0ZXJMaW5rXSxhcmVhW3JvdXRlckxpbmtdJ30pXG5leHBvcnQgY2xhc3MgUm91dGVyTGlua1dpdGhIcmVmIGltcGxlbWVudHMgT25DaGFuZ2VzLCBPbkRlc3Ryb3kge1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQEhvc3RCaW5kaW5nKCdhdHRyLnRhcmdldCcpIEBJbnB1dCgpIHRhcmdldCE6IHN0cmluZztcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcXVlcnlQYXJhbXMgVXJsQ3JlYXRpb25PcHRpb25zI3F1ZXJ5UGFyYW1zfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpIHF1ZXJ5UGFyYW1zPzogUGFyYW1zfG51bGw7XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgVXJsQ3JlYXRpb25PcHRpb25zYC5cbiAgICogQHNlZSB7QGxpbmsgVXJsQ3JlYXRpb25PcHRpb25zI2ZyYWdtZW50IFVybENyZWF0aW9uT3B0aW9ucyNmcmFnbWVudH1cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKSBmcmFnbWVudD86IHN0cmluZztcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBVcmxDcmVhdGlvbk9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBVcmxDcmVhdGlvbk9wdGlvbnMjcXVlcnlQYXJhbXNIYW5kbGluZyBVcmxDcmVhdGlvbk9wdGlvbnMjcXVlcnlQYXJhbXNIYW5kbGluZ31cbiAgICogQHNlZSB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9XG4gICAqL1xuICBASW5wdXQoKSBxdWVyeVBhcmFtc0hhbmRsaW5nPzogUXVlcnlQYXJhbXNIYW5kbGluZ3xudWxsO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0gYXMgcGFydCBvZiB0aGVcbiAgICogYFVybENyZWF0aW9uT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNwcmVzZXJ2ZUZyYWdtZW50IFVybENyZWF0aW9uT3B0aW9ucyNwcmVzZXJ2ZUZyYWdtZW50fVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASW5wdXQoKSBwcmVzZXJ2ZUZyYWdtZW50ITogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFBhc3NlZCB0byB7QGxpbmsgUm91dGVyI25hdmlnYXRlQnlVcmwgUm91dGVyI25hdmlnYXRlQnlVcmx9IGFzIHBhcnQgb2YgdGhlXG4gICAqIGBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zYC5cbiAgICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyNza2lwTG9jYXRpb25DaGFuZ2UgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyNza2lwTG9jYXRpb25DaGFuZ2V9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfVxuICAgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHNraXBMb2NhdGlvbkNoYW5nZSE6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9uc2AuXG4gICAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjcmVwbGFjZVVybCBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zI3JlcGxhY2VVcmx9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfVxuICAgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHJlcGxhY2VVcmwhOiBib29sZWFuO1xuICAvKipcbiAgICogUGFzc2VkIHRvIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeVVybCBSb3V0ZXIjbmF2aWdhdGVCeVVybH0gYXMgcGFydCBvZiB0aGVcbiAgICogYE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnNgLlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zI3N0YXRlIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMjc3RhdGV9XG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsIFJvdXRlciNuYXZpZ2F0ZUJ5VXJsfVxuICAgKi9cbiAgQElucHV0KCkgc3RhdGU/OiB7W2s6IHN0cmluZ106IGFueX07XG4gIC8qKlxuICAgKiBQYXNzZWQgdG8ge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfSBhcyBwYXJ0IG9mIHRoZVxuICAgKiBgVXJsQ3JlYXRpb25PcHRpb25zYC5cbiAgICogU3BlY2lmeSBhIHZhbHVlIGhlcmUgd2hlbiB5b3UgZG8gbm90IHdhbnQgdG8gdXNlIHRoZSBkZWZhdWx0IHZhbHVlXG4gICAqIGZvciBgcm91dGVyTGlua2AsIHdoaWNoIGlzIHRoZSBjdXJyZW50IGFjdGl2YXRlZCByb3V0ZS5cbiAgICogTm90ZSB0aGF0IGEgdmFsdWUgb2YgYHVuZGVmaW5lZGAgaGVyZSB3aWxsIHVzZSB0aGUgYHJvdXRlckxpbmtgIGRlZmF1bHQuXG4gICAqIEBzZWUge0BsaW5rIFVybENyZWF0aW9uT3B0aW9ucyNyZWxhdGl2ZVRvIFVybENyZWF0aW9uT3B0aW9ucyNyZWxhdGl2ZVRvfVxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX1cbiAgICovXG4gIEBJbnB1dCgpIHJlbGF0aXZlVG8/OiBBY3RpdmF0ZWRSb3V0ZXxudWxsO1xuXG4gIHByaXZhdGUgY29tbWFuZHM6IGFueVtdfG51bGwgPSBudWxsO1xuICBwcml2YXRlIHN1YnNjcmlwdGlvbjogU3Vic2NyaXB0aW9uO1xuXG4gIC8vIHRoZSB1cmwgZGlzcGxheWVkIG9uIHRoZSBhbmNob3IgZWxlbWVudC5cbiAgLy8gQEhvc3RCaW5kaW5nKCdhdHRyLmhyZWYnKSBpcyB1c2VkIHJhdGhlciB0aGFuIEBIb3N0QmluZGluZygpIGJlY2F1c2UgaXQgcmVtb3ZlcyB0aGVcbiAgLy8gaHJlZiBhdHRyaWJ1dGUgd2hlbiBpdCBiZWNvbWVzIGBudWxsYC5cbiAgQEhvc3RCaW5kaW5nKCdhdHRyLmhyZWYnKSBocmVmOiBzdHJpbmd8bnVsbCA9IG51bGw7XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBvbkNoYW5nZXMgPSBuZXcgU3ViamVjdDxSb3V0ZXJMaW5rV2l0aEhyZWY+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLCBwcml2YXRlIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSxcbiAgICAgIHByaXZhdGUgbG9jYXRpb25TdHJhdGVneTogTG9jYXRpb25TdHJhdGVneSkge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9uID0gcm91dGVyLmV2ZW50cy5zdWJzY3JpYmUoKHM6IEV2ZW50KSA9PiB7XG4gICAgICBpZiAocyBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpIHtcbiAgICAgICAgdGhpcy51cGRhdGVUYXJnZXRVcmxBbmRIcmVmKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ29tbWFuZHMgdG8gcGFzcyB0byB7QGxpbmsgUm91dGVyI2NyZWF0ZVVybFRyZWUgUm91dGVyI2NyZWF0ZVVybFRyZWV9LlxuICAgKiAgIC0gKiphcnJheSoqOiBjb21tYW5kcyB0byBwYXNzIHRvIHtAbGluayBSb3V0ZXIjY3JlYXRlVXJsVHJlZSBSb3V0ZXIjY3JlYXRlVXJsVHJlZX0uXG4gICAqICAgLSAqKnN0cmluZyoqOiBzaG9ydGhhbmQgZm9yIGFycmF5IG9mIGNvbW1hbmRzIHdpdGgganVzdCB0aGUgc3RyaW5nLCBpLmUuIGBbJy9yb3V0ZSddYFxuICAgKiAgIC0gKipudWxsfHVuZGVmaW5lZCoqOiBEaXNhYmxlcyB0aGUgbGluayBieSByZW1vdmluZyB0aGUgYGhyZWZgXG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIFJvdXRlciNjcmVhdGVVcmxUcmVlfVxuICAgKi9cbiAgQElucHV0KClcbiAgc2V0IHJvdXRlckxpbmsoY29tbWFuZHM6IGFueVtdfHN0cmluZ3xudWxsfHVuZGVmaW5lZCkge1xuICAgIGlmIChjb21tYW5kcyAhPSBudWxsKSB7XG4gICAgICB0aGlzLmNvbW1hbmRzID0gQXJyYXkuaXNBcnJheShjb21tYW5kcykgPyBjb21tYW5kcyA6IFtjb21tYW5kc107XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29tbWFuZHMgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcyk6IGFueSB7XG4gICAgdGhpcy51cGRhdGVUYXJnZXRVcmxBbmRIcmVmKCk7XG4gICAgdGhpcy5vbkNoYW5nZXMubmV4dCh0aGlzKTtcbiAgfVxuICAvKiogQG5vZG9jICovXG4gIG5nT25EZXN0cm95KCk6IGFueSB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgQEhvc3RMaXN0ZW5lcihcbiAgICAgICdjbGljaycsXG4gICAgICBbJyRldmVudC5idXR0b24nLCAnJGV2ZW50LmN0cmxLZXknLCAnJGV2ZW50LnNoaWZ0S2V5JywgJyRldmVudC5hbHRLZXknLCAnJGV2ZW50Lm1ldGFLZXknXSlcbiAgb25DbGljayhidXR0b246IG51bWJlciwgY3RybEtleTogYm9vbGVhbiwgc2hpZnRLZXk6IGJvb2xlYW4sIGFsdEtleTogYm9vbGVhbiwgbWV0YUtleTogYm9vbGVhbik6XG4gICAgICBib29sZWFuIHtcbiAgICBpZiAoYnV0dG9uICE9PSAwIHx8IGN0cmxLZXkgfHwgc2hpZnRLZXkgfHwgYWx0S2V5IHx8IG1ldGFLZXkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdGhpcy50YXJnZXQgPT09ICdzdHJpbmcnICYmIHRoaXMudGFyZ2V0ICE9ICdfc2VsZicgfHwgdGhpcy51cmxUcmVlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBjb25zdCBleHRyYXMgPSB7XG4gICAgICBza2lwTG9jYXRpb25DaGFuZ2U6IGF0dHJCb29sVmFsdWUodGhpcy5za2lwTG9jYXRpb25DaGFuZ2UpLFxuICAgICAgcmVwbGFjZVVybDogYXR0ckJvb2xWYWx1ZSh0aGlzLnJlcGxhY2VVcmwpLFxuICAgICAgc3RhdGU6IHRoaXMuc3RhdGVcbiAgICB9O1xuICAgIHRoaXMucm91dGVyLm5hdmlnYXRlQnlVcmwodGhpcy51cmxUcmVlLCBleHRyYXMpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlVGFyZ2V0VXJsQW5kSHJlZigpOiB2b2lkIHtcbiAgICB0aGlzLmhyZWYgPSB0aGlzLnVybFRyZWUgIT09IG51bGwgP1xuICAgICAgICB0aGlzLmxvY2F0aW9uU3RyYXRlZ3kucHJlcGFyZUV4dGVybmFsVXJsKHRoaXMucm91dGVyLnNlcmlhbGl6ZVVybCh0aGlzLnVybFRyZWUpKSA6XG4gICAgICAgIG51bGw7XG4gIH1cblxuICBnZXQgdXJsVHJlZSgpOiBVcmxUcmVlfG51bGwge1xuICAgIGlmICh0aGlzLmNvbW1hbmRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucm91dGVyLmNyZWF0ZVVybFRyZWUodGhpcy5jb21tYW5kcywge1xuICAgICAgLy8gSWYgdGhlIGByZWxhdGl2ZVRvYCBpbnB1dCBpcyBub3QgZGVmaW5lZCwgd2Ugd2FudCB0byB1c2UgYHRoaXMucm91dGVgIGJ5IGRlZmF1bHQuXG4gICAgICAvLyBPdGhlcndpc2UsIHdlIHNob3VsZCB1c2UgdGhlIHZhbHVlIHByb3ZpZGVkIGJ5IHRoZSB1c2VyIGluIHRoZSBpbnB1dC5cbiAgICAgIHJlbGF0aXZlVG86IHRoaXMucmVsYXRpdmVUbyAhPT0gdW5kZWZpbmVkID8gdGhpcy5yZWxhdGl2ZVRvIDogdGhpcy5yb3V0ZSxcbiAgICAgIHF1ZXJ5UGFyYW1zOiB0aGlzLnF1ZXJ5UGFyYW1zLFxuICAgICAgZnJhZ21lbnQ6IHRoaXMuZnJhZ21lbnQsXG4gICAgICBxdWVyeVBhcmFtc0hhbmRsaW5nOiB0aGlzLnF1ZXJ5UGFyYW1zSGFuZGxpbmcsXG4gICAgICBwcmVzZXJ2ZUZyYWdtZW50OiBhdHRyQm9vbFZhbHVlKHRoaXMucHJlc2VydmVGcmFnbWVudCksXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYXR0ckJvb2xWYWx1ZShzOiBhbnkpOiBib29sZWFuIHtcbiAgcmV0dXJuIHMgPT09ICcnIHx8ICEhcztcbn1cbiJdfQ==