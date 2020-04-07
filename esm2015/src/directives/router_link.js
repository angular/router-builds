/**
 * @fileoverview added by tsickle
 * Generated from: packages/router/src/directives/router_link.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
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
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * \@description
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
 * Same options for {\@link NavigationExtras#queryParamsHandling
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
 * See {\@link Router#createUrlTree createUrlTree} for more information.
 *
 * \@ngModule RouterModule
 *
 * \@publicApi
 */
export class RouterLink {
    /**
     * @param {?} router
     * @param {?} route
     * @param {?} tabIndex
     * @param {?} renderer
     * @param {?} el
     */
    constructor(router, route, tabIndex, renderer, el) {
        this.router = router;
        this.route = route;
        this.commands = [];
        if (tabIndex == null) {
            renderer.setAttribute(el.nativeElement, 'tabindex', '0');
        }
    }
    /**
     * @param {?} commands
     * @return {?}
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
     * @deprecated 4.0.0 use `queryParamsHandling` instead.
     * @param {?} value
     * @return {?}
     */
    set preserveQueryParams(value) {
        if (isDevMode() && (/** @type {?} */ (console)) && (/** @type {?} */ (console.warn))) {
            console.warn('preserveQueryParams is deprecated!, use queryParamsHandling instead.');
        }
        this.preserve = value;
    }
    /**
     * @return {?}
     */
    onClick() {
        /** @type {?} */
        const extras = {
            skipLocationChange: attrBoolValue(this.skipLocationChange),
            replaceUrl: attrBoolValue(this.replaceUrl),
            state: this.state,
        };
        this.router.navigateByUrl(this.urlTree, extras);
        return true;
    }
    /**
     * @return {?}
     */
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
RouterLink.decorators = [
    { type: Directive, args: [{ selector: ':not(a):not(area)[routerLink]' },] },
];
/** @nocollapse */
RouterLink.ctorParameters = () => [
    { type: Router },
    { type: ActivatedRoute },
    { type: String, decorators: [{ type: Attribute, args: ['tabindex',] }] },
    { type: Renderer2 },
    { type: ElementRef }
];
RouterLink.propDecorators = {
    queryParams: [{ type: Input }],
    fragment: [{ type: Input }],
    queryParamsHandling: [{ type: Input }],
    preserveFragment: [{ type: Input }],
    skipLocationChange: [{ type: Input }],
    replaceUrl: [{ type: Input }],
    state: [{ type: Input }],
    routerLink: [{ type: Input }],
    preserveQueryParams: [{ type: Input }],
    onClick: [{ type: HostListener, args: ['click',] }]
};
/** @nocollapse */ RouterLink.ɵfac = function RouterLink_Factory(t) { return new (t || RouterLink)(i0.ɵɵdirectiveInject(i1.Router), i0.ɵɵdirectiveInject(i2.ActivatedRoute), i0.ɵɵinjectAttribute('tabindex'), i0.ɵɵdirectiveInject(i0.Renderer2), i0.ɵɵdirectiveInject(i0.ElementRef)); };
/** @nocollapse */ RouterLink.ɵdir = i0.ɵɵdefineDirective({ type: RouterLink, selectors: [["", "routerLink", "", 5, "a", 5, "area"]], hostBindings: function RouterLink_HostBindings(rf, ctx) { if (rf & 1) {
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
if (false) {
    /** @type {?} */
    RouterLink.prototype.queryParams;
    /** @type {?} */
    RouterLink.prototype.fragment;
    /** @type {?} */
    RouterLink.prototype.queryParamsHandling;
    /** @type {?} */
    RouterLink.prototype.preserveFragment;
    /** @type {?} */
    RouterLink.prototype.skipLocationChange;
    /** @type {?} */
    RouterLink.prototype.replaceUrl;
    /** @type {?} */
    RouterLink.prototype.state;
    /**
     * @type {?}
     * @private
     */
    RouterLink.prototype.commands;
    /**
     * @type {?}
     * @private
     */
    RouterLink.prototype.preserve;
    /**
     * @type {?}
     * @private
     */
    RouterLink.prototype.router;
    /**
     * @type {?}
     * @private
     */
    RouterLink.prototype.route;
}
/**
 * \@description
 *
 * Lets you link to specific routes in your app.
 *
 * See `RouterLink` for more information.
 *
 * \@ngModule RouterModule
 *
 * \@publicApi
 */
export class RouterLinkWithHref {
    /**
     * @param {?} router
     * @param {?} route
     * @param {?} locationStrategy
     */
    constructor(router, route, locationStrategy) {
        this.router = router;
        this.route = route;
        this.locationStrategy = locationStrategy;
        this.commands = [];
        this.subscription = router.events.subscribe((/**
         * @param {?} s
         * @return {?}
         */
        (s) => {
            if (s instanceof NavigationEnd) {
                this.updateTargetUrlAndHref();
            }
        }));
    }
    /**
     * @param {?} commands
     * @return {?}
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
     * @param {?} value
     * @return {?}
     */
    set preserveQueryParams(value) {
        if (isDevMode() && (/** @type {?} */ (console)) && (/** @type {?} */ (console.warn))) {
            console.warn('preserveQueryParams is deprecated, use queryParamsHandling instead.');
        }
        this.preserve = value;
    }
    /**
     * @param {?} changes
     * @return {?}
     */
    ngOnChanges(changes) {
        this.updateTargetUrlAndHref();
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
    /**
     * @param {?} button
     * @param {?} ctrlKey
     * @param {?} metaKey
     * @param {?} shiftKey
     * @return {?}
     */
    onClick(button, ctrlKey, metaKey, shiftKey) {
        if (button !== 0 || ctrlKey || metaKey || shiftKey) {
            return true;
        }
        if (typeof this.target === 'string' && this.target != '_self') {
            return true;
        }
        /** @type {?} */
        const extras = {
            skipLocationChange: attrBoolValue(this.skipLocationChange),
            replaceUrl: attrBoolValue(this.replaceUrl),
            state: this.state
        };
        this.router.navigateByUrl(this.urlTree, extras);
        return false;
    }
    /**
     * @private
     * @return {?}
     */
    updateTargetUrlAndHref() {
        this.href = this.locationStrategy.prepareExternalUrl(this.router.serializeUrl(this.urlTree));
    }
    /**
     * @return {?}
     */
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
RouterLinkWithHref.decorators = [
    { type: Directive, args: [{ selector: 'a[routerLink],area[routerLink]' },] },
];
/** @nocollapse */
RouterLinkWithHref.ctorParameters = () => [
    { type: Router },
    { type: ActivatedRoute },
    { type: LocationStrategy }
];
RouterLinkWithHref.propDecorators = {
    target: [{ type: HostBinding, args: ['attr.target',] }, { type: Input }],
    queryParams: [{ type: Input }],
    fragment: [{ type: Input }],
    queryParamsHandling: [{ type: Input }],
    preserveFragment: [{ type: Input }],
    skipLocationChange: [{ type: Input }],
    replaceUrl: [{ type: Input }],
    state: [{ type: Input }],
    href: [{ type: HostBinding }],
    routerLink: [{ type: Input }],
    preserveQueryParams: [{ type: Input }],
    onClick: [{ type: HostListener, args: ['click', ['$event.button', '$event.ctrlKey', '$event.metaKey', '$event.shiftKey'],] }]
};
/** @nocollapse */ RouterLinkWithHref.ɵfac = function RouterLinkWithHref_Factory(t) { return new (t || RouterLinkWithHref)(i0.ɵɵdirectiveInject(i1.Router), i0.ɵɵdirectiveInject(i2.ActivatedRoute), i0.ɵɵdirectiveInject(i3.LocationStrategy)); };
/** @nocollapse */ RouterLinkWithHref.ɵdir = i0.ɵɵdefineDirective({ type: RouterLinkWithHref, selectors: [["a", "routerLink", ""], ["area", "routerLink", ""]], hostVars: 2, hostBindings: function RouterLinkWithHref_HostBindings(rf, ctx) { if (rf & 1) {
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
if (false) {
    /** @type {?} */
    RouterLinkWithHref.prototype.target;
    /** @type {?} */
    RouterLinkWithHref.prototype.queryParams;
    /** @type {?} */
    RouterLinkWithHref.prototype.fragment;
    /** @type {?} */
    RouterLinkWithHref.prototype.queryParamsHandling;
    /** @type {?} */
    RouterLinkWithHref.prototype.preserveFragment;
    /** @type {?} */
    RouterLinkWithHref.prototype.skipLocationChange;
    /** @type {?} */
    RouterLinkWithHref.prototype.replaceUrl;
    /** @type {?} */
    RouterLinkWithHref.prototype.state;
    /**
     * @type {?}
     * @private
     */
    RouterLinkWithHref.prototype.commands;
    /**
     * @type {?}
     * @private
     */
    RouterLinkWithHref.prototype.subscription;
    /**
     * @type {?}
     * @private
     */
    RouterLinkWithHref.prototype.preserve;
    /** @type {?} */
    RouterLinkWithHref.prototype.href;
    /**
     * @type {?}
     * @private
     */
    RouterLinkWithHref.prototype.router;
    /**
     * @type {?}
     * @private
     */
    RouterLinkWithHref.prototype.route;
    /**
     * @type {?}
     * @private
     */
    RouterLinkWithHref.prototype.locationStrategy;
}
/**
 * @param {?} s
 * @return {?}
 */
function attrBoolValue(s) {
    return s === '' || !!s;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFRQSxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUNqRCxPQUFPLEVBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUF3QixTQUFTLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFJN0ksT0FBTyxFQUFRLGFBQWEsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUMvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQ2pDLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW1HL0MsTUFBTSxPQUFPLFVBQVU7Ozs7Ozs7O0lBa0JyQixZQUNZLE1BQWMsRUFBVSxLQUFxQixFQUM5QixRQUFnQixFQUFFLFFBQW1CLEVBQUUsRUFBYztRQURwRSxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQVUsVUFBSyxHQUFMLEtBQUssQ0FBZ0I7UUFMakQsYUFBUSxHQUFVLEVBQUUsQ0FBQztRQU8zQixJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUU7WUFDcEIsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsYUFBYSxFQUFFLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUMxRDtJQUNILENBQUM7Ozs7O0lBRUQsSUFDSSxVQUFVLENBQUMsUUFBc0I7UUFDbkMsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO1lBQ3BC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LENBQUM7QUFDekIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvblN0cmF0ZWd5fSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtBdHRyaWJ1dGUsIERpcmVjdGl2ZSwgRWxlbWVudFJlZiwgSG9zdEJpbmRpbmcsIEhvc3RMaXN0ZW5lciwgSW5wdXQsIGlzRGV2TW9kZSwgT25DaGFuZ2VzLCBPbkRlc3Ryb3ksIFJlbmRlcmVyMn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge1N1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7UXVlcnlQYXJhbXNIYW5kbGluZ30gZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7RXZlbnQsIE5hdmlnYXRpb25FbmR9IGZyb20gJy4uL2V2ZW50cyc7XG5pbXBvcnQge1JvdXRlcn0gZnJvbSAnLi4vcm91dGVyJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGV9IGZyb20gJy4uL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1VybFRyZWV9IGZyb20gJy4uL3VybF90cmVlJztcblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIExldHMgeW91IGxpbmsgdG8gc3BlY2lmaWMgcm91dGVzIGluIHlvdXIgYXBwLlxuICpcbiAqIENvbnNpZGVyIHRoZSBmb2xsb3dpbmcgcm91dGUgY29uZmlndXJhdGlvbjpcbiAqIGBbeyBwYXRoOiAndXNlci86bmFtZScsIGNvbXBvbmVudDogVXNlckNtcCB9XWAuXG4gKiBXaGVuIGxpbmtpbmcgdG8gdGhpcyBgdXNlci86bmFtZWAgcm91dGUsIHlvdSB1c2UgdGhlIGBSb3V0ZXJMaW5rYCBkaXJlY3RpdmUuXG4gKlxuICogSWYgdGhlIGxpbmsgaXMgc3RhdGljLCB5b3UgY2FuIHVzZSB0aGUgZGlyZWN0aXZlIGFzIGZvbGxvd3M6XG4gKiBgPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiPmxpbmsgdG8gdXNlciBjb21wb25lbnQ8L2E+YFxuICpcbiAqIElmIHlvdSB1c2UgZHluYW1pYyB2YWx1ZXMgdG8gZ2VuZXJhdGUgdGhlIGxpbmssIHlvdSBjYW4gcGFzcyBhbiBhcnJheSBvZiBwYXRoXG4gKiBzZWdtZW50cywgZm9sbG93ZWQgYnkgdGhlIHBhcmFtcyBmb3IgZWFjaCBzZWdtZW50LlxuICpcbiAqIEZvciBpbnN0YW5jZSBgWycvdGVhbScsIHRlYW1JZCwgJ3VzZXInLCB1c2VyTmFtZSwge2RldGFpbHM6IHRydWV9XWBcbiAqIG1lYW5zIHRoYXQgd2Ugd2FudCB0byBnZW5lcmF0ZSBhIGxpbmsgdG8gYC90ZWFtLzExL3VzZXIvYm9iO2RldGFpbHM9dHJ1ZWAuXG4gKlxuICogTXVsdGlwbGUgc3RhdGljIHNlZ21lbnRzIGNhbiBiZSBtZXJnZWQgaW50byBvbmVcbiAqIChlLmcuLCBgWycvdGVhbS8xMS91c2VyJywgdXNlck5hbWUsIHtkZXRhaWxzOiB0cnVlfV1gKS5cbiAqXG4gKiBUaGUgZmlyc3Qgc2VnbWVudCBuYW1lIGNhbiBiZSBwcmVwZW5kZWQgd2l0aCBgL2AsIGAuL2AsIG9yIGAuLi9gOlxuICogKiBJZiB0aGUgZmlyc3Qgc2VnbWVudCBiZWdpbnMgd2l0aCBgL2AsIHRoZSByb3V0ZXIgd2lsbCBsb29rIHVwIHRoZSByb3V0ZSBmcm9tIHRoZSByb290IG9mIHRoZVxuICogICBhcHAuXG4gKiAqIElmIHRoZSBmaXJzdCBzZWdtZW50IGJlZ2lucyB3aXRoIGAuL2AsIG9yIGRvZXNuJ3QgYmVnaW4gd2l0aCBhIHNsYXNoLCB0aGUgcm91dGVyIHdpbGxcbiAqICAgaW5zdGVhZCBsb29rIGluIHRoZSBjaGlsZHJlbiBvZiB0aGUgY3VycmVudCBhY3RpdmF0ZWQgcm91dGUuXG4gKiAqIEFuZCBpZiB0aGUgZmlyc3Qgc2VnbWVudCBiZWdpbnMgd2l0aCBgLi4vYCwgdGhlIHJvdXRlciB3aWxsIGdvIHVwIG9uZSBsZXZlbC5cbiAqXG4gKiBZb3UgY2FuIHNldCBxdWVyeSBwYXJhbXMgYW5kIGZyYWdtZW50IGFzIGZvbGxvd3M6XG4gKlxuICogYGBgXG4gKiA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2JvYiddXCIgW3F1ZXJ5UGFyYW1zXT1cIntkZWJ1ZzogdHJ1ZX1cIiBmcmFnbWVudD1cImVkdWNhdGlvblwiPlxuICogICBsaW5rIHRvIHVzZXIgY29tcG9uZW50XG4gKiA8L2E+XG4gKiBgYGBcbiAqIFJvdXRlckxpbmsgd2lsbCB1c2UgdGhlc2UgdG8gZ2VuZXJhdGUgdGhpcyBsaW5rOiBgL3VzZXIvYm9iI2VkdWNhdGlvbj9kZWJ1Zz10cnVlYC5cbiAqXG4gKiAoRGVwcmVjYXRlZCBpbiB2NC4wLjAgdXNlIGBxdWVyeVBhcmFtc0hhbmRsaW5nYCBpbnN0ZWFkKSBZb3UgY2FuIGFsc28gdGVsbCB0aGVcbiAqIGRpcmVjdGl2ZSB0byBwcmVzZXJ2ZSB0aGUgY3VycmVudCBxdWVyeSBwYXJhbXMgYW5kIGZyYWdtZW50OlxuICpcbiAqIGBgYFxuICogPGEgW3JvdXRlckxpbmtdPVwiWycvdXNlci9ib2InXVwiIHByZXNlcnZlUXVlcnlQYXJhbXMgcHJlc2VydmVGcmFnbWVudD5cbiAqICAgbGluayB0byB1c2VyIGNvbXBvbmVudFxuICogPC9hPlxuICogYGBgXG4gKlxuICogWW91IGNhbiB0ZWxsIHRoZSBkaXJlY3RpdmUgaG93IHRvIGhhbmRsZSBxdWVyeVBhcmFtcy4gQXZhaWxhYmxlIG9wdGlvbnMgYXJlOlxuICogIC0gYCdtZXJnZSdgOiBtZXJnZSB0aGUgcXVlcnlQYXJhbXMgaW50byB0aGUgY3VycmVudCBxdWVyeVBhcmFtc1xuICogIC0gYCdwcmVzZXJ2ZSdgOiBwcmVzZXJ2ZSB0aGUgY3VycmVudCBxdWVyeVBhcmFtc1xuICogIC0gZGVmYXVsdC9gJydgOiB1c2UgdGhlIHF1ZXJ5UGFyYW1zIG9ubHlcbiAqXG4gKiBTYW1lIG9wdGlvbnMgZm9yIHtAbGluayBOYXZpZ2F0aW9uRXh0cmFzI3F1ZXJ5UGFyYW1zSGFuZGxpbmdcbiAqIE5hdmlnYXRpb25FeHRyYXMjcXVlcnlQYXJhbXNIYW5kbGluZ30uXG4gKlxuICogYGBgXG4gKiA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2JvYiddXCIgW3F1ZXJ5UGFyYW1zXT1cIntkZWJ1ZzogdHJ1ZX1cIiBxdWVyeVBhcmFtc0hhbmRsaW5nPVwibWVyZ2VcIj5cbiAqICAgbGluayB0byB1c2VyIGNvbXBvbmVudFxuICogPC9hPlxuICogYGBgXG4gKlxuICogWW91IGNhbiBwcm92aWRlIGEgYHN0YXRlYCB2YWx1ZSB0byBiZSBwZXJzaXN0ZWQgdG8gdGhlIGJyb3dzZXIncyBIaXN0b3J5LnN0YXRlXG4gKiBwcm9wZXJ0eSAoU2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9IaXN0b3J5I1Byb3BlcnRpZXMpLiBJdCdzXG4gKiB1c2VkIGFzIGZvbGxvd3M6XG4gKlxuICogYGBgXG4gKiA8YSBbcm91dGVyTGlua109XCJbJy91c2VyL2JvYiddXCIgW3N0YXRlXT1cInt0cmFjaW5nSWQ6IDEyM31cIj5cbiAqICAgbGluayB0byB1c2VyIGNvbXBvbmVudFxuICogPC9hPlxuICogYGBgXG4gKlxuICogQW5kIGxhdGVyIHRoZSB2YWx1ZSBjYW4gYmUgcmVhZCBmcm9tIHRoZSByb3V0ZXIgdGhyb3VnaCBgcm91dGVyLmdldEN1cnJlbnROYXZpZ2F0aW9uYC5cbiAqIEZvciBleGFtcGxlLCB0byBjYXB0dXJlIHRoZSBgdHJhY2luZ0lkYCBhYm92ZSBkdXJpbmcgdGhlIGBOYXZpZ2F0aW9uU3RhcnRgIGV2ZW50OlxuICpcbiAqIGBgYFxuICogLy8gR2V0IE5hdmlnYXRpb25TdGFydCBldmVudHNcbiAqIHJvdXRlci5ldmVudHMucGlwZShmaWx0ZXIoZSA9PiBlIGluc3RhbmNlb2YgTmF2aWdhdGlvblN0YXJ0KSkuc3Vic2NyaWJlKGUgPT4ge1xuICogICBjb25zdCBuYXZpZ2F0aW9uID0gcm91dGVyLmdldEN1cnJlbnROYXZpZ2F0aW9uKCk7XG4gKiAgIHRyYWNpbmdTZXJ2aWNlLnRyYWNlKHtpZDogbmF2aWdhdGlvbi5leHRyYXMuc3RhdGUudHJhY2luZ0lkfSk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIFRoZSByb3V0ZXIgbGluayBkaXJlY3RpdmUgYWx3YXlzIHRyZWF0cyB0aGUgcHJvdmlkZWQgaW5wdXQgYXMgYSBkZWx0YSB0byB0aGUgY3VycmVudCB1cmwuXG4gKlxuICogRm9yIGluc3RhbmNlLCBpZiB0aGUgY3VycmVudCB1cmwgaXMgYC91c2VyLyhib3gvL2F1eDp0ZWFtKWAuXG4gKlxuICogVGhlbiB0aGUgZm9sbG93aW5nIGxpbmsgYDxhIFtyb3V0ZXJMaW5rXT1cIlsnL3VzZXIvamltJ11cIj5KaW08L2E+YCB3aWxsIGdlbmVyYXRlIHRoZSBsaW5rXG4gKiBgL3VzZXIvKGppbS8vYXV4OnRlYW0pYC5cbiAqXG4gKiBTZWUge0BsaW5rIFJvdXRlciNjcmVhdGVVcmxUcmVlIGNyZWF0ZVVybFRyZWV9IGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICpcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBEaXJlY3RpdmUoe3NlbGVjdG9yOiAnOm5vdChhKTpub3QoYXJlYSlbcm91dGVyTGlua10nfSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJMaW5rIHtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHF1ZXJ5UGFyYW1zIToge1trOiBzdHJpbmddOiBhbnl9O1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgZnJhZ21lbnQhOiBzdHJpbmc7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASW5wdXQoKSBxdWVyeVBhcmFtc0hhbmRsaW5nITogUXVlcnlQYXJhbXNIYW5kbGluZztcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHByZXNlcnZlRnJhZ21lbnQhOiBib29sZWFuO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgc2tpcExvY2F0aW9uQ2hhbmdlITogYm9vbGVhbjtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHJlcGxhY2VVcmwhOiBib29sZWFuO1xuICBASW5wdXQoKSBzdGF0ZT86IHtbazogc3RyaW5nXTogYW55fTtcbiAgcHJpdmF0ZSBjb21tYW5kczogYW55W10gPSBbXTtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgcHJlc2VydmUhOiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZXI6IFJvdXRlciwgcHJpdmF0ZSByb3V0ZTogQWN0aXZhdGVkUm91dGUsXG4gICAgICBAQXR0cmlidXRlKCd0YWJpbmRleCcpIHRhYkluZGV4OiBzdHJpbmcsIHJlbmRlcmVyOiBSZW5kZXJlcjIsIGVsOiBFbGVtZW50UmVmKSB7XG4gICAgaWYgKHRhYkluZGV4ID09IG51bGwpIHtcbiAgICAgIHJlbmRlcmVyLnNldEF0dHJpYnV0ZShlbC5uYXRpdmVFbGVtZW50LCAndGFiaW5kZXgnLCAnMCcpO1xuICAgIH1cbiAgfVxuXG4gIEBJbnB1dCgpXG4gIHNldCByb3V0ZXJMaW5rKGNvbW1hbmRzOiBhbnlbXXxzdHJpbmcpIHtcbiAgICBpZiAoY29tbWFuZHMgIT0gbnVsbCkge1xuICAgICAgdGhpcy5jb21tYW5kcyA9IEFycmF5LmlzQXJyYXkoY29tbWFuZHMpID8gY29tbWFuZHMgOiBbY29tbWFuZHNdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbW1hbmRzID0gW107XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBkZXByZWNhdGVkIDQuMC4wIHVzZSBgcXVlcnlQYXJhbXNIYW5kbGluZ2AgaW5zdGVhZC5cbiAgICovXG4gIEBJbnB1dCgpXG4gIHNldCBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zKHZhbHVlOiBib29sZWFuKSB7XG4gICAgaWYgKGlzRGV2TW9kZSgpICYmIDxhbnk+Y29uc29sZSAmJiA8YW55PmNvbnNvbGUud2Fybikge1xuICAgICAgY29uc29sZS53YXJuKCdwcmVzZXJ2ZVF1ZXJ5UGFyYW1zIGlzIGRlcHJlY2F0ZWQhLCB1c2UgcXVlcnlQYXJhbXNIYW5kbGluZyBpbnN0ZWFkLicpO1xuICAgIH1cbiAgICB0aGlzLnByZXNlcnZlID0gdmFsdWU7XG4gIH1cblxuICBASG9zdExpc3RlbmVyKCdjbGljaycpXG4gIG9uQ2xpY2soKTogYm9vbGVhbiB7XG4gICAgY29uc3QgZXh0cmFzID0ge1xuICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiBhdHRyQm9vbFZhbHVlKHRoaXMuc2tpcExvY2F0aW9uQ2hhbmdlKSxcbiAgICAgIHJlcGxhY2VVcmw6IGF0dHJCb29sVmFsdWUodGhpcy5yZXBsYWNlVXJsKSxcbiAgICAgIHN0YXRlOiB0aGlzLnN0YXRlLFxuICAgIH07XG4gICAgdGhpcy5yb3V0ZXIubmF2aWdhdGVCeVVybCh0aGlzLnVybFRyZWUsIGV4dHJhcyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBnZXQgdXJsVHJlZSgpOiBVcmxUcmVlIHtcbiAgICByZXR1cm4gdGhpcy5yb3V0ZXIuY3JlYXRlVXJsVHJlZSh0aGlzLmNvbW1hbmRzLCB7XG4gICAgICByZWxhdGl2ZVRvOiB0aGlzLnJvdXRlLFxuICAgICAgcXVlcnlQYXJhbXM6IHRoaXMucXVlcnlQYXJhbXMsXG4gICAgICBmcmFnbWVudDogdGhpcy5mcmFnbWVudCxcbiAgICAgIHByZXNlcnZlUXVlcnlQYXJhbXM6IGF0dHJCb29sVmFsdWUodGhpcy5wcmVzZXJ2ZSksXG4gICAgICBxdWVyeVBhcmFtc0hhbmRsaW5nOiB0aGlzLnF1ZXJ5UGFyYW1zSGFuZGxpbmcsXG4gICAgICBwcmVzZXJ2ZUZyYWdtZW50OiBhdHRyQm9vbFZhbHVlKHRoaXMucHJlc2VydmVGcmFnbWVudCksXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBMZXRzIHlvdSBsaW5rIHRvIHNwZWNpZmljIHJvdXRlcyBpbiB5b3VyIGFwcC5cbiAqXG4gKiBTZWUgYFJvdXRlckxpbmtgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICpcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBEaXJlY3RpdmUoe3NlbGVjdG9yOiAnYVtyb3V0ZXJMaW5rXSxhcmVhW3JvdXRlckxpbmtdJ30pXG5leHBvcnQgY2xhc3MgUm91dGVyTGlua1dpdGhIcmVmIGltcGxlbWVudHMgT25DaGFuZ2VzLCBPbkRlc3Ryb3kge1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQEhvc3RCaW5kaW5nKCdhdHRyLnRhcmdldCcpIEBJbnB1dCgpIHRhcmdldCE6IHN0cmluZztcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHF1ZXJ5UGFyYW1zIToge1trOiBzdHJpbmddOiBhbnl9O1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgZnJhZ21lbnQhOiBzdHJpbmc7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBASW5wdXQoKSBxdWVyeVBhcmFtc0hhbmRsaW5nITogUXVlcnlQYXJhbXNIYW5kbGluZztcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHByZXNlcnZlRnJhZ21lbnQhOiBib29sZWFuO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQElucHV0KCkgc2tpcExvY2F0aW9uQ2hhbmdlITogYm9vbGVhbjtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBJbnB1dCgpIHJlcGxhY2VVcmwhOiBib29sZWFuO1xuICBASW5wdXQoKSBzdGF0ZT86IHtbazogc3RyaW5nXTogYW55fTtcbiAgcHJpdmF0ZSBjb21tYW5kczogYW55W10gPSBbXTtcbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvbjtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgcHJlc2VydmUhOiBib29sZWFuO1xuXG4gIC8vIHRoZSB1cmwgZGlzcGxheWVkIG9uIHRoZSBhbmNob3IgZWxlbWVudC5cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBIb3N0QmluZGluZygpIGhyZWYhOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLCBwcml2YXRlIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSxcbiAgICAgIHByaXZhdGUgbG9jYXRpb25TdHJhdGVneTogTG9jYXRpb25TdHJhdGVneSkge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9uID0gcm91dGVyLmV2ZW50cy5zdWJzY3JpYmUoKHM6IEV2ZW50KSA9PiB7XG4gICAgICBpZiAocyBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpIHtcbiAgICAgICAgdGhpcy51cGRhdGVUYXJnZXRVcmxBbmRIcmVmKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBASW5wdXQoKVxuICBzZXQgcm91dGVyTGluayhjb21tYW5kczogYW55W118c3RyaW5nKSB7XG4gICAgaWYgKGNvbW1hbmRzICE9IG51bGwpIHtcbiAgICAgIHRoaXMuY29tbWFuZHMgPSBBcnJheS5pc0FycmF5KGNvbW1hbmRzKSA/IGNvbW1hbmRzIDogW2NvbW1hbmRzXTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb21tYW5kcyA9IFtdO1xuICAgIH1cbiAgfVxuXG4gIEBJbnB1dCgpXG4gIHNldCBwcmVzZXJ2ZVF1ZXJ5UGFyYW1zKHZhbHVlOiBib29sZWFuKSB7XG4gICAgaWYgKGlzRGV2TW9kZSgpICYmIDxhbnk+Y29uc29sZSAmJiA8YW55PmNvbnNvbGUud2Fybikge1xuICAgICAgY29uc29sZS53YXJuKCdwcmVzZXJ2ZVF1ZXJ5UGFyYW1zIGlzIGRlcHJlY2F0ZWQsIHVzZSBxdWVyeVBhcmFtc0hhbmRsaW5nIGluc3RlYWQuJyk7XG4gICAgfVxuICAgIHRoaXMucHJlc2VydmUgPSB2YWx1ZTtcbiAgfVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IHt9KTogYW55IHtcbiAgICB0aGlzLnVwZGF0ZVRhcmdldFVybEFuZEhyZWYoKTtcbiAgfVxuICBuZ09uRGVzdHJveSgpOiBhbnkge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBASG9zdExpc3RlbmVyKCdjbGljaycsIFsnJGV2ZW50LmJ1dHRvbicsICckZXZlbnQuY3RybEtleScsICckZXZlbnQubWV0YUtleScsICckZXZlbnQuc2hpZnRLZXknXSlcbiAgb25DbGljayhidXR0b246IG51bWJlciwgY3RybEtleTogYm9vbGVhbiwgbWV0YUtleTogYm9vbGVhbiwgc2hpZnRLZXk6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBpZiAoYnV0dG9uICE9PSAwIHx8IGN0cmxLZXkgfHwgbWV0YUtleSB8fCBzaGlmdEtleSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB0aGlzLnRhcmdldCA9PT0gJ3N0cmluZycgJiYgdGhpcy50YXJnZXQgIT0gJ19zZWxmJykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgY29uc3QgZXh0cmFzID0ge1xuICAgICAgc2tpcExvY2F0aW9uQ2hhbmdlOiBhdHRyQm9vbFZhbHVlKHRoaXMuc2tpcExvY2F0aW9uQ2hhbmdlKSxcbiAgICAgIHJlcGxhY2VVcmw6IGF0dHJCb29sVmFsdWUodGhpcy5yZXBsYWNlVXJsKSxcbiAgICAgIHN0YXRlOiB0aGlzLnN0YXRlXG4gICAgfTtcbiAgICB0aGlzLnJvdXRlci5uYXZpZ2F0ZUJ5VXJsKHRoaXMudXJsVHJlZSwgZXh0cmFzKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZVRhcmdldFVybEFuZEhyZWYoKTogdm9pZCB7XG4gICAgdGhpcy5ocmVmID0gdGhpcy5sb2NhdGlvblN0cmF0ZWd5LnByZXBhcmVFeHRlcm5hbFVybCh0aGlzLnJvdXRlci5zZXJpYWxpemVVcmwodGhpcy51cmxUcmVlKSk7XG4gIH1cblxuICBnZXQgdXJsVHJlZSgpOiBVcmxUcmVlIHtcbiAgICByZXR1cm4gdGhpcy5yb3V0ZXIuY3JlYXRlVXJsVHJlZSh0aGlzLmNvbW1hbmRzLCB7XG4gICAgICByZWxhdGl2ZVRvOiB0aGlzLnJvdXRlLFxuICAgICAgcXVlcnlQYXJhbXM6IHRoaXMucXVlcnlQYXJhbXMsXG4gICAgICBmcmFnbWVudDogdGhpcy5mcmFnbWVudCxcbiAgICAgIHByZXNlcnZlUXVlcnlQYXJhbXM6IGF0dHJCb29sVmFsdWUodGhpcy5wcmVzZXJ2ZSksXG4gICAgICBxdWVyeVBhcmFtc0hhbmRsaW5nOiB0aGlzLnF1ZXJ5UGFyYW1zSGFuZGxpbmcsXG4gICAgICBwcmVzZXJ2ZUZyYWdtZW50OiBhdHRyQm9vbFZhbHVlKHRoaXMucHJlc2VydmVGcmFnbWVudCksXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYXR0ckJvb2xWYWx1ZShzOiBhbnkpOiBib29sZWFuIHtcbiAgcmV0dXJuIHMgPT09ICcnIHx8ICEhcztcbn1cbiJdfQ==