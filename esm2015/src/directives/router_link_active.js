/**
 * @fileoverview added by tsickle
 * Generated from: packages/router/src/directives/router_link_active.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { ContentChildren, Directive, ElementRef, Input, Optional, QueryList, Renderer2 } from '@angular/core';
import { NavigationEnd } from '../events';
import { Router } from '../router';
import { RouterLink, RouterLinkWithHref } from './router_link';
import * as i0 from "@angular/core";
import * as i1 from "../router";
import * as i2 from "./router_link";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 *
 * \@description
 *
 * Lets you add a CSS class to an element when the link's route becomes active.
 *
 * This directive lets you add a CSS class to an element when the link's route
 * becomes active.
 *
 * Consider the following example:
 *
 * ```
 * <a routerLink="/user/bob" routerLinkActive="active-link">Bob</a>
 * ```
 *
 * When the url is either '/user' or '/user/bob', the active-link class will
 * be added to the `a` tag. If the url changes, the class will be removed.
 *
 * You can set more than one class, as follows:
 *
 * ```
 * <a routerLink="/user/bob" routerLinkActive="class1 class2">Bob</a>
 * <a routerLink="/user/bob" [routerLinkActive]="['class1', 'class2']">Bob</a>
 * ```
 *
 * You can configure RouterLinkActive by passing `exact: true`. This will add the classes
 * only when the url matches the link exactly.
 *
 * ```
 * <a routerLink="/user/bob" routerLinkActive="active-link" [routerLinkActiveOptions]="{exact:
 * true}">Bob</a>
 * ```
 *
 * You can assign the RouterLinkActive instance to a template variable and directly check
 * the `isActive` status.
 * ```
 * <a routerLink="/user/bob" routerLinkActive #rla="routerLinkActive">
 *   Bob {{ rla.isActive ? '(already open)' : ''}}
 * </a>
 * ```
 *
 * Finally, you can apply the RouterLinkActive directive to an ancestor of a RouterLink.
 *
 * ```
 * <div routerLinkActive="active-link" [routerLinkActiveOptions]="{exact: true}">
 *   <a routerLink="/user/jim">Jim</a>
 *   <a routerLink="/user/bob">Bob</a>
 * </div>
 * ```
 *
 * This will set the active-link class on the div tag if the url is either '/user/jim' or
 * '/user/bob'.
 *
 * \@ngModule RouterModule
 *
 * \@publicApi
 */
let RouterLinkActive = /** @class */ (() => {
    /**
     *
     * \@description
     *
     * Lets you add a CSS class to an element when the link's route becomes active.
     *
     * This directive lets you add a CSS class to an element when the link's route
     * becomes active.
     *
     * Consider the following example:
     *
     * ```
     * <a routerLink="/user/bob" routerLinkActive="active-link">Bob</a>
     * ```
     *
     * When the url is either '/user' or '/user/bob', the active-link class will
     * be added to the `a` tag. If the url changes, the class will be removed.
     *
     * You can set more than one class, as follows:
     *
     * ```
     * <a routerLink="/user/bob" routerLinkActive="class1 class2">Bob</a>
     * <a routerLink="/user/bob" [routerLinkActive]="['class1', 'class2']">Bob</a>
     * ```
     *
     * You can configure RouterLinkActive by passing `exact: true`. This will add the classes
     * only when the url matches the link exactly.
     *
     * ```
     * <a routerLink="/user/bob" routerLinkActive="active-link" [routerLinkActiveOptions]="{exact:
     * true}">Bob</a>
     * ```
     *
     * You can assign the RouterLinkActive instance to a template variable and directly check
     * the `isActive` status.
     * ```
     * <a routerLink="/user/bob" routerLinkActive #rla="routerLinkActive">
     *   Bob {{ rla.isActive ? '(already open)' : ''}}
     * </a>
     * ```
     *
     * Finally, you can apply the RouterLinkActive directive to an ancestor of a RouterLink.
     *
     * ```
     * <div routerLinkActive="active-link" [routerLinkActiveOptions]="{exact: true}">
     *   <a routerLink="/user/jim">Jim</a>
     *   <a routerLink="/user/bob">Bob</a>
     * </div>
     * ```
     *
     * This will set the active-link class on the div tag if the url is either '/user/jim' or
     * '/user/bob'.
     *
     * \@ngModule RouterModule
     *
     * \@publicApi
     */
    class RouterLinkActive {
        /**
         * @param {?} router
         * @param {?} element
         * @param {?} renderer
         * @param {?=} link
         * @param {?=} linkWithHref
         */
        constructor(router, element, renderer, link, linkWithHref) {
            this.router = router;
            this.element = element;
            this.renderer = renderer;
            this.link = link;
            this.linkWithHref = linkWithHref;
            this.classes = [];
            this.isActive = false;
            this.routerLinkActiveOptions = { exact: false };
            this.subscription = router.events.subscribe((/**
             * @param {?} s
             * @return {?}
             */
            (s) => {
                if (s instanceof NavigationEnd) {
                    this.update();
                }
            }));
        }
        /**
         * @return {?}
         */
        ngAfterContentInit() {
            this.links.changes.subscribe((/**
             * @param {?} _
             * @return {?}
             */
            _ => this.update()));
            this.linksWithHrefs.changes.subscribe((/**
             * @param {?} _
             * @return {?}
             */
            _ => this.update()));
            this.update();
        }
        /**
         * @param {?} data
         * @return {?}
         */
        set routerLinkActive(data) {
            /** @type {?} */
            const classes = Array.isArray(data) ? data : data.split(' ');
            this.classes = classes.filter((/**
             * @param {?} c
             * @return {?}
             */
            c => !!c));
        }
        /**
         * @param {?} changes
         * @return {?}
         */
        ngOnChanges(changes) {
            this.update();
        }
        /**
         * @return {?}
         */
        ngOnDestroy() {
            this.subscription.unsubscribe();
        }
        /**
         * @private
         * @return {?}
         */
        update() {
            if (!this.links || !this.linksWithHrefs || !this.router.navigated)
                return;
            Promise.resolve().then((/**
             * @return {?}
             */
            () => {
                /** @type {?} */
                const hasActiveLinks = this.hasActiveLinks();
                if (this.isActive !== hasActiveLinks) {
                    ((/** @type {?} */ (this))).isActive = hasActiveLinks;
                    this.classes.forEach((/**
                     * @param {?} c
                     * @return {?}
                     */
                    (c) => {
                        if (hasActiveLinks) {
                            this.renderer.addClass(this.element.nativeElement, c);
                        }
                        else {
                            this.renderer.removeClass(this.element.nativeElement, c);
                        }
                    }));
                }
            }));
        }
        /**
         * @private
         * @param {?} router
         * @return {?}
         */
        isLinkActive(router) {
            return (/**
             * @param {?} link
             * @return {?}
             */
            (link) => router.isActive(link.urlTree, this.routerLinkActiveOptions.exact));
        }
        /**
         * @private
         * @return {?}
         */
        hasActiveLinks() {
            /** @type {?} */
            const isActiveCheckFn = this.isLinkActive(this.router);
            return this.link && isActiveCheckFn(this.link) ||
                this.linkWithHref && isActiveCheckFn(this.linkWithHref) ||
                this.links.some(isActiveCheckFn) || this.linksWithHrefs.some(isActiveCheckFn);
        }
    }
    RouterLinkActive.decorators = [
        { type: Directive, args: [{
                    selector: '[routerLinkActive]',
                    exportAs: 'routerLinkActive',
                },] },
    ];
    /** @nocollapse */
    RouterLinkActive.ctorParameters = () => [
        { type: Router },
        { type: ElementRef },
        { type: Renderer2 },
        { type: RouterLink, decorators: [{ type: Optional }] },
        { type: RouterLinkWithHref, decorators: [{ type: Optional }] }
    ];
    RouterLinkActive.propDecorators = {
        links: [{ type: ContentChildren, args: [RouterLink, { descendants: true },] }],
        linksWithHrefs: [{ type: ContentChildren, args: [RouterLinkWithHref, { descendants: true },] }],
        routerLinkActiveOptions: [{ type: Input }],
        routerLinkActive: [{ type: Input }]
    };
    /** @nocollapse */ RouterLinkActive.ɵfac = function RouterLinkActive_Factory(t) { return new (t || RouterLinkActive)(i0.ɵɵdirectiveInject(i1.Router), i0.ɵɵdirectiveInject(i0.ElementRef), i0.ɵɵdirectiveInject(i0.Renderer2), i0.ɵɵdirectiveInject(i2.RouterLink, 8), i0.ɵɵdirectiveInject(i2.RouterLinkWithHref, 8)); };
    /** @nocollapse */ RouterLinkActive.ɵdir = i0.ɵɵdefineDirective({ type: RouterLinkActive, selectors: [["", "routerLinkActive", ""]], contentQueries: function RouterLinkActive_ContentQueries(rf, ctx, dirIndex) { if (rf & 1) {
            i0.ɵɵcontentQuery(dirIndex, RouterLink, true);
            i0.ɵɵcontentQuery(dirIndex, RouterLinkWithHref, true);
        } if (rf & 2) {
            var _t;
            i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.links = _t);
            i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.linksWithHrefs = _t);
        } }, inputs: { routerLinkActiveOptions: "routerLinkActiveOptions", routerLinkActive: "routerLinkActive" }, exportAs: ["routerLinkActive"], features: [i0.ɵɵNgOnChangesFeature] });
    return RouterLinkActive;
})();
export { RouterLinkActive };
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RouterLinkActive, [{
        type: Directive,
        args: [{
                selector: '[routerLinkActive]',
                exportAs: 'routerLinkActive',
            }]
    }], function () { return [{ type: i1.Router }, { type: i0.ElementRef }, { type: i0.Renderer2 }, { type: i2.RouterLink, decorators: [{
                type: Optional
            }] }, { type: i2.RouterLinkWithHref, decorators: [{
                type: Optional
            }] }]; }, { links: [{
            type: ContentChildren,
            args: [RouterLink, { descendants: true }]
        }], linksWithHrefs: [{
            type: ContentChildren,
            args: [RouterLinkWithHref, { descendants: true }]
        }], routerLinkActiveOptions: [{
            type: Input
        }], routerLinkActive: [{
            type: Input
        }] }); })();
if (false) {
    /** @type {?} */
    RouterLinkActive.prototype.links;
    /** @type {?} */
    RouterLinkActive.prototype.linksWithHrefs;
    /**
     * @type {?}
     * @private
     */
    RouterLinkActive.prototype.classes;
    /**
     * @type {?}
     * @private
     */
    RouterLinkActive.prototype.subscription;
    /** @type {?} */
    RouterLinkActive.prototype.isActive;
    /** @type {?} */
    RouterLinkActive.prototype.routerLinkActiveOptions;
    /**
     * @type {?}
     * @private
     */
    RouterLinkActive.prototype.router;
    /**
     * @type {?}
     * @private
     */
    RouterLinkActive.prototype.element;
    /**
     * @type {?}
     * @private
     */
    RouterLinkActive.prototype.renderer;
    /**
     * @type {?}
     * @private
     */
    RouterLinkActive.prototype.link;
    /**
     * @type {?}
     * @private
     */
    RouterLinkActive.prototype.linkWithHref;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmtfYWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9kaXJlY3RpdmVzL3JvdXRlcl9saW5rX2FjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQVFBLE9BQU8sRUFBbUIsZUFBZSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUF3QixRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBZ0IsTUFBTSxlQUFlLENBQUM7QUFHbkssT0FBTyxFQUFRLGFBQWEsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUMvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBRWpDLE9BQU8sRUFBQyxVQUFVLEVBQUUsa0JBQWtCLEVBQUMsTUFBTSxlQUFlLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBNEQ3RDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUFBLE1BSWEsZ0JBQWdCOzs7Ozs7OztRQWEzQixZQUNZLE1BQWMsRUFBVSxPQUFtQixFQUFVLFFBQW1CLEVBQzVELElBQWlCLEVBQ2pCLFlBQWlDO1lBRjdDLFdBQU0sR0FBTixNQUFNLENBQVE7WUFBVSxZQUFPLEdBQVAsT0FBTyxDQUFZO1lBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBVztZQUM1RCxTQUFJLEdBQUosSUFBSSxDQUFhO1lBQ2pCLGlCQUFZLEdBQVosWUFBWSxDQUFxQjtZQVRqRCxZQUFPLEdBQWEsRUFBRSxDQUFDO1lBRWYsYUFBUSxHQUFZLEtBQUssQ0FBQztZQUVqQyw0QkFBdUIsR0FBcUIsRUFBQyxLQUFLLEVBQUUsS0FBSyxFQUFDLENBQUM7WUFNbEUsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsTUFB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Z2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FmdGVyQ29udGVudEluaXQsIENvbnRlbnRDaGlsZHJlbiwgRGlyZWN0aXZlLCBFbGVtZW50UmVmLCBJbnB1dCwgT25DaGFuZ2VzLCBPbkRlc3Ryb3ksIE9wdGlvbmFsLCBRdWVyeUxpc3QsIFJlbmRlcmVyMiwgU2ltcGxlQ2hhbmdlc30gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge1N1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7RXZlbnQsIE5hdmlnYXRpb25FbmR9IGZyb20gJy4uL2V2ZW50cyc7XG5pbXBvcnQge1JvdXRlcn0gZnJvbSAnLi4vcm91dGVyJztcblxuaW1wb3J0IHtSb3V0ZXJMaW5rLCBSb3V0ZXJMaW5rV2l0aEhyZWZ9IGZyb20gJy4vcm91dGVyX2xpbmsnO1xuXG5cbi8qKlxuICpcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIExldHMgeW91IGFkZCBhIENTUyBjbGFzcyB0byBhbiBlbGVtZW50IHdoZW4gdGhlIGxpbmsncyByb3V0ZSBiZWNvbWVzIGFjdGl2ZS5cbiAqXG4gKiBUaGlzIGRpcmVjdGl2ZSBsZXRzIHlvdSBhZGQgYSBDU1MgY2xhc3MgdG8gYW4gZWxlbWVudCB3aGVuIHRoZSBsaW5rJ3Mgcm91dGVcbiAqIGJlY29tZXMgYWN0aXZlLlxuICpcbiAqIENvbnNpZGVyIHRoZSBmb2xsb3dpbmcgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiByb3V0ZXJMaW5rQWN0aXZlPVwiYWN0aXZlLWxpbmtcIj5Cb2I8L2E+XG4gKiBgYGBcbiAqXG4gKiBXaGVuIHRoZSB1cmwgaXMgZWl0aGVyICcvdXNlcicgb3IgJy91c2VyL2JvYicsIHRoZSBhY3RpdmUtbGluayBjbGFzcyB3aWxsXG4gKiBiZSBhZGRlZCB0byB0aGUgYGFgIHRhZy4gSWYgdGhlIHVybCBjaGFuZ2VzLCB0aGUgY2xhc3Mgd2lsbCBiZSByZW1vdmVkLlxuICpcbiAqIFlvdSBjYW4gc2V0IG1vcmUgdGhhbiBvbmUgY2xhc3MsIGFzIGZvbGxvd3M6XG4gKlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZT1cImNsYXNzMSBjbGFzczJcIj5Cb2I8L2E+XG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgW3JvdXRlckxpbmtBY3RpdmVdPVwiWydjbGFzczEnLCAnY2xhc3MyJ11cIj5Cb2I8L2E+XG4gKiBgYGBcbiAqXG4gKiBZb3UgY2FuIGNvbmZpZ3VyZSBSb3V0ZXJMaW5rQWN0aXZlIGJ5IHBhc3NpbmcgYGV4YWN0OiB0cnVlYC4gVGhpcyB3aWxsIGFkZCB0aGUgY2xhc3Nlc1xuICogb25seSB3aGVuIHRoZSB1cmwgbWF0Y2hlcyB0aGUgbGluayBleGFjdGx5LlxuICpcbiAqIGBgYFxuICogPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiIHJvdXRlckxpbmtBY3RpdmU9XCJhY3RpdmUtbGlua1wiIFtyb3V0ZXJMaW5rQWN0aXZlT3B0aW9uc109XCJ7ZXhhY3Q6XG4gKiB0cnVlfVwiPkJvYjwvYT5cbiAqIGBgYFxuICpcbiAqIFlvdSBjYW4gYXNzaWduIHRoZSBSb3V0ZXJMaW5rQWN0aXZlIGluc3RhbmNlIHRvIGEgdGVtcGxhdGUgdmFyaWFibGUgYW5kIGRpcmVjdGx5IGNoZWNrXG4gKiB0aGUgYGlzQWN0aXZlYCBzdGF0dXMuXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiByb3V0ZXJMaW5rQWN0aXZlICNybGE9XCJyb3V0ZXJMaW5rQWN0aXZlXCI+XG4gKiAgIEJvYiB7eyBybGEuaXNBY3RpdmUgPyAnKGFscmVhZHkgb3BlbiknIDogJyd9fVxuICogPC9hPlxuICogYGBgXG4gKlxuICogRmluYWxseSwgeW91IGNhbiBhcHBseSB0aGUgUm91dGVyTGlua0FjdGl2ZSBkaXJlY3RpdmUgdG8gYW4gYW5jZXN0b3Igb2YgYSBSb3V0ZXJMaW5rLlxuICpcbiAqIGBgYFxuICogPGRpdiByb3V0ZXJMaW5rQWN0aXZlPVwiYWN0aXZlLWxpbmtcIiBbcm91dGVyTGlua0FjdGl2ZU9wdGlvbnNdPVwie2V4YWN0OiB0cnVlfVwiPlxuICogICA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvamltXCI+SmltPC9hPlxuICogICA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCI+Qm9iPC9hPlxuICogPC9kaXY+XG4gKiBgYGBcbiAqXG4gKiBUaGlzIHdpbGwgc2V0IHRoZSBhY3RpdmUtbGluayBjbGFzcyBvbiB0aGUgZGl2IHRhZyBpZiB0aGUgdXJsIGlzIGVpdGhlciAnL3VzZXIvamltJyBvclxuICogJy91c2VyL2JvYicuXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQERpcmVjdGl2ZSh7XG4gIHNlbGVjdG9yOiAnW3JvdXRlckxpbmtBY3RpdmVdJyxcbiAgZXhwb3J0QXM6ICdyb3V0ZXJMaW5rQWN0aXZlJyxcbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyTGlua0FjdGl2ZSBpbXBsZW1lbnRzIE9uQ2hhbmdlcywgT25EZXN0cm95LCBBZnRlckNvbnRlbnRJbml0IHtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBDb250ZW50Q2hpbGRyZW4oUm91dGVyTGluaywge2Rlc2NlbmRhbnRzOiB0cnVlfSkgbGlua3MhOiBRdWVyeUxpc3Q8Um91dGVyTGluaz47XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBAQ29udGVudENoaWxkcmVuKFJvdXRlckxpbmtXaXRoSHJlZiwge2Rlc2NlbmRhbnRzOiB0cnVlfSlcbiAgbGlua3NXaXRoSHJlZnMhOiBRdWVyeUxpc3Q8Um91dGVyTGlua1dpdGhIcmVmPjtcblxuICBwcml2YXRlIGNsYXNzZXM6IHN0cmluZ1tdID0gW107XG4gIHByaXZhdGUgc3Vic2NyaXB0aW9uOiBTdWJzY3JpcHRpb247XG4gIHB1YmxpYyByZWFkb25seSBpc0FjdGl2ZTogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIEBJbnB1dCgpIHJvdXRlckxpbmtBY3RpdmVPcHRpb25zOiB7ZXhhY3Q6IGJvb2xlYW59ID0ge2V4YWN0OiBmYWxzZX07XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLCBwcml2YXRlIGVsZW1lbnQ6IEVsZW1lbnRSZWYsIHByaXZhdGUgcmVuZGVyZXI6IFJlbmRlcmVyMixcbiAgICAgIEBPcHRpb25hbCgpIHByaXZhdGUgbGluaz86IFJvdXRlckxpbmssXG4gICAgICBAT3B0aW9uYWwoKSBwcml2YXRlIGxpbmtXaXRoSHJlZj86IFJvdXRlckxpbmtXaXRoSHJlZikge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9uID0gcm91dGVyLmV2ZW50cy5zdWJzY3JpYmUoKHM6IEV2ZW50KSA9PiB7XG4gICAgICBpZiAocyBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpIHtcbiAgICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG5cbiAgbmdBZnRlckNvbnRlbnRJbml0KCk6IHZvaWQge1xuICAgIHRoaXMubGlua3MuY2hhbmdlcy5zdWJzY3JpYmUoXyA9PiB0aGlzLnVwZGF0ZSgpKTtcbiAgICB0aGlzLmxpbmtzV2l0aEhyZWZzLmNoYW5nZXMuc3Vic2NyaWJlKF8gPT4gdGhpcy51cGRhdGUoKSk7XG4gICAgdGhpcy51cGRhdGUoKTtcbiAgfVxuXG4gIEBJbnB1dCgpXG4gIHNldCByb3V0ZXJMaW5rQWN0aXZlKGRhdGE6IHN0cmluZ1tdfHN0cmluZykge1xuICAgIGNvbnN0IGNsYXNzZXMgPSBBcnJheS5pc0FycmF5KGRhdGEpID8gZGF0YSA6IGRhdGEuc3BsaXQoJyAnKTtcbiAgICB0aGlzLmNsYXNzZXMgPSBjbGFzc2VzLmZpbHRlcihjID0+ICEhYyk7XG4gIH1cblxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKTogdm9pZCB7XG4gICAgdGhpcy51cGRhdGUoKTtcbiAgfVxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGUoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmxpbmtzIHx8ICF0aGlzLmxpbmtzV2l0aEhyZWZzIHx8ICF0aGlzLnJvdXRlci5uYXZpZ2F0ZWQpIHJldHVybjtcbiAgICBQcm9taXNlLnJlc29sdmUoKS50aGVuKCgpID0+IHtcbiAgICAgIGNvbnN0IGhhc0FjdGl2ZUxpbmtzID0gdGhpcy5oYXNBY3RpdmVMaW5rcygpO1xuICAgICAgaWYgKHRoaXMuaXNBY3RpdmUgIT09IGhhc0FjdGl2ZUxpbmtzKSB7XG4gICAgICAgICh0aGlzIGFzIGFueSkuaXNBY3RpdmUgPSBoYXNBY3RpdmVMaW5rcztcbiAgICAgICAgdGhpcy5jbGFzc2VzLmZvckVhY2goKGMpID0+IHtcbiAgICAgICAgICBpZiAoaGFzQWN0aXZlTGlua3MpIHtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyZXIuYWRkQ2xhc3ModGhpcy5lbGVtZW50Lm5hdGl2ZUVsZW1lbnQsIGMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcmVyLnJlbW92ZUNsYXNzKHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LCBjKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBpc0xpbmtBY3RpdmUocm91dGVyOiBSb3V0ZXIpOiAobGluazogKFJvdXRlckxpbmt8Um91dGVyTGlua1dpdGhIcmVmKSkgPT4gYm9vbGVhbiB7XG4gICAgcmV0dXJuIChsaW5rOiBSb3V0ZXJMaW5rfFJvdXRlckxpbmtXaXRoSHJlZikgPT5cbiAgICAgICAgICAgICAgIHJvdXRlci5pc0FjdGl2ZShsaW5rLnVybFRyZWUsIHRoaXMucm91dGVyTGlua0FjdGl2ZU9wdGlvbnMuZXhhY3QpO1xuICB9XG5cbiAgcHJpdmF0ZSBoYXNBY3RpdmVMaW5rcygpOiBib29sZWFuIHtcbiAgICBjb25zdCBpc0FjdGl2ZUNoZWNrRm4gPSB0aGlzLmlzTGlua0FjdGl2ZSh0aGlzLnJvdXRlcik7XG4gICAgcmV0dXJuIHRoaXMubGluayAmJiBpc0FjdGl2ZUNoZWNrRm4odGhpcy5saW5rKSB8fFxuICAgICAgICB0aGlzLmxpbmtXaXRoSHJlZiAmJiBpc0FjdGl2ZUNoZWNrRm4odGhpcy5saW5rV2l0aEhyZWYpIHx8XG4gICAgICAgIHRoaXMubGlua3Muc29tZShpc0FjdGl2ZUNoZWNrRm4pIHx8IHRoaXMubGlua3NXaXRoSHJlZnMuc29tZShpc0FjdGl2ZUNoZWNrRm4pO1xuICB9XG59XG4iXX0=