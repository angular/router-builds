/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ChangeDetectorRef, ContentChildren, Directive, ElementRef, Input, Optional, QueryList, Renderer2 } from '@angular/core';
import { from, of } from 'rxjs';
import { mergeAll } from 'rxjs/operators';
import { NavigationEnd } from '../events';
import { Router } from '../router';
import { RouterLink, RouterLinkWithHref } from './router_link';
import * as i0 from "@angular/core";
import * as i1 from "../router";
import * as i2 from "./router_link";
/**
 *
 * @description
 *
 * Tracks whether the linked route of an element is currently active, and allows you
 * to specify one or more CSS classes to add to the element when the linked route
 * is active.
 *
 * Use this directive to create a visual distinction for elements associated with an active route.
 * For example, the following code highlights the word "Bob" when the router
 * activates the associated route:
 *
 * ```
 * <a routerLink="/user/bob" routerLinkActive="active-link">Bob</a>
 * ```
 *
 * Whenever the URL is either '/user' or '/user/bob', the "active-link" class is
 * added to the anchor tag. If the URL changes, the class is removed.
 *
 * You can set more than one class using a space-separated string or an array.
 * For example:
 *
 * ```
 * <a routerLink="/user/bob" routerLinkActive="class1 class2">Bob</a>
 * <a routerLink="/user/bob" [routerLinkActive]="['class1', 'class2']">Bob</a>
 * ```
 *
 * To add the classes only when the URL matches the link exactly, add the option `exact: true`:
 *
 * ```
 * <a routerLink="/user/bob" routerLinkActive="active-link" [routerLinkActiveOptions]="{exact:
 * true}">Bob</a>
 * ```
 *
 * To directly check the `isActive` status of the link, assign the `RouterLinkActive`
 * instance to a template variable.
 * For example, the following checks the status without assigning any CSS classes:
 *
 * ```
 * <a routerLink="/user/bob" routerLinkActive #rla="routerLinkActive">
 *   Bob {{ rla.isActive ? '(already open)' : ''}}
 * </a>
 * ```
 *
 * You can apply the `RouterLinkActive` directive to an ancestor of linked elements.
 * For example, the following sets the active-link class on the `<div>`  parent tag
 * when the URL is either '/user/jim' or '/user/bob'.
 *
 * ```
 * <div routerLinkActive="active-link" [routerLinkActiveOptions]="{exact: true}">
 *   <a routerLink="/user/jim">Jim</a>
 *   <a routerLink="/user/bob">Bob</a>
 * </div>
 * ```
 *
 * @ngModule RouterModule
 *
 * @publicApi
 */
export class RouterLinkActive {
    constructor(router, element, renderer, cdr, link, linkWithHref) {
        this.router = router;
        this.element = element;
        this.renderer = renderer;
        this.cdr = cdr;
        this.link = link;
        this.linkWithHref = linkWithHref;
        this.classes = [];
        this.isActive = false;
        /**
         * Options to configure how to determine if the router link is active.
         *
         * These options are passed to the `Router.isActive()` function.
         *
         * @see Router.isActive
         */
        this.routerLinkActiveOptions = { exact: false };
        this.routerEventsSubscription = router.events.subscribe((s) => {
            if (s instanceof NavigationEnd) {
                this.update();
            }
        });
    }
    /** @nodoc */
    ngAfterContentInit() {
        // `of(null)` is used to force subscribe body to execute once immediately (like `startWith`).
        of(this.links.changes, this.linksWithHrefs.changes, of(null)).pipe(mergeAll()).subscribe(_ => {
            this.update();
            this.subscribeToEachLinkOnChanges();
        });
    }
    subscribeToEachLinkOnChanges() {
        var _a;
        (_a = this.linkInputChangesSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
        const allLinkChanges = [...this.links.toArray(), ...this.linksWithHrefs.toArray(), this.link, this.linkWithHref]
            .filter((link) => !!link)
            .map(link => link.onChanges);
        this.linkInputChangesSubscription = from(allLinkChanges).pipe(mergeAll()).subscribe(link => {
            if (this.isActive !== this.isLinkActive(this.router)(link)) {
                this.update();
            }
        });
    }
    set routerLinkActive(data) {
        const classes = Array.isArray(data) ? data : data.split(' ');
        this.classes = classes.filter(c => !!c);
    }
    /** @nodoc */
    ngOnChanges(changes) {
        this.update();
    }
    /** @nodoc */
    ngOnDestroy() {
        var _a;
        this.routerEventsSubscription.unsubscribe();
        (_a = this.linkInputChangesSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
    }
    update() {
        if (!this.links || !this.linksWithHrefs || !this.router.navigated)
            return;
        Promise.resolve().then(() => {
            const hasActiveLinks = this.hasActiveLinks();
            if (this.isActive !== hasActiveLinks) {
                this.isActive = hasActiveLinks;
                this.cdr.markForCheck();
                this.classes.forEach((c) => {
                    if (hasActiveLinks) {
                        this.renderer.addClass(this.element.nativeElement, c);
                    }
                    else {
                        this.renderer.removeClass(this.element.nativeElement, c);
                    }
                });
            }
        });
    }
    isLinkActive(router) {
        const options = 'paths' in this.routerLinkActiveOptions ?
            this.routerLinkActiveOptions :
            // While the types should disallow `undefined` here, it's possible without strict inputs
            (this.routerLinkActiveOptions.exact || false);
        return (link) => router.isActive(link.urlTree, options);
    }
    hasActiveLinks() {
        const isActiveCheckFn = this.isLinkActive(this.router);
        return this.link && isActiveCheckFn(this.link) ||
            this.linkWithHref && isActiveCheckFn(this.linkWithHref) ||
            this.links.some(isActiveCheckFn) || this.linksWithHrefs.some(isActiveCheckFn);
    }
}
RouterLinkActive.ɵfac = function RouterLinkActive_Factory(t) { return new (t || RouterLinkActive)(i0.ɵɵdirectiveInject(i1.Router), i0.ɵɵdirectiveInject(i0.ElementRef), i0.ɵɵdirectiveInject(i0.Renderer2), i0.ɵɵdirectiveInject(i0.ChangeDetectorRef), i0.ɵɵdirectiveInject(i2.RouterLink, 8), i0.ɵɵdirectiveInject(i2.RouterLinkWithHref, 8)); };
RouterLinkActive.ɵdir = /*@__PURE__*/ i0.ɵɵdefineDirective({ type: RouterLinkActive, selectors: [["", "routerLinkActive", ""]], contentQueries: function RouterLinkActive_ContentQueries(rf, ctx, dirIndex) { if (rf & 1) {
        i0.ɵɵcontentQuery(dirIndex, RouterLink, 5);
        i0.ɵɵcontentQuery(dirIndex, RouterLinkWithHref, 5);
    } if (rf & 2) {
        let _t;
        i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.links = _t);
        i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.linksWithHrefs = _t);
    } }, inputs: { routerLinkActiveOptions: "routerLinkActiveOptions", routerLinkActive: "routerLinkActive" }, exportAs: ["routerLinkActive"], features: [i0.ɵɵNgOnChangesFeature] });
(function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(RouterLinkActive, [{
        type: Directive,
        args: [{
                selector: '[routerLinkActive]',
                exportAs: 'routerLinkActive',
            }]
    }], function () { return [{ type: i1.Router }, { type: i0.ElementRef }, { type: i0.Renderer2 }, { type: i0.ChangeDetectorRef }, { type: i2.RouterLink, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmtfYWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9kaXJlY3RpdmVzL3JvdXRlcl9saW5rX2FjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQW1CLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBd0IsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQWdCLE1BQU0sZUFBZSxDQUFDO0FBQ3RMLE9BQU8sRUFBQyxJQUFJLEVBQUUsRUFBRSxFQUFlLE1BQU0sTUFBTSxDQUFDO0FBQzVDLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUV4QyxPQUFPLEVBQVEsYUFBYSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQy9DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFHakMsT0FBTyxFQUFDLFVBQVUsRUFBRSxrQkFBa0IsRUFBQyxNQUFNLGVBQWUsQ0FBQzs7OztBQUc3RDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQTBERztBQUtILE1BQU0sT0FBTyxnQkFBZ0I7SUFvQjNCLFlBQ1ksTUFBYyxFQUFVLE9BQW1CLEVBQVUsUUFBbUIsRUFDL0QsR0FBc0IsRUFBc0IsSUFBaUIsRUFDMUQsWUFBaUM7UUFGN0MsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUFVLFlBQU8sR0FBUCxPQUFPLENBQVk7UUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFXO1FBQy9ELFFBQUcsR0FBSCxHQUFHLENBQW1CO1FBQXNCLFNBQUksR0FBSixJQUFJLENBQWE7UUFDMUQsaUJBQVksR0FBWixZQUFZLENBQXFCO1FBbEJqRCxZQUFPLEdBQWEsRUFBRSxDQUFDO1FBR2YsYUFBUSxHQUFZLEtB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LENBQUM7WUFDdkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDcEYsQ0FBQzs7Z0ZBcEdVLGdCQUFnQjttRUFBaEIsZ0JBQWdCO29DQUNWLFVBQVU7b0NBQ1Ysa0JBQWtCOzs7Ozs7dUZBRnhCLGdCQUFnQjtjQUo1QixTQUFTO2VBQUM7Z0JBQ1QsUUFBUSxFQUFFLG9CQUFvQjtnQkFDOUIsUUFBUSxFQUFFLGtCQUFrQjthQUM3Qjs7c0JBdUIrQyxRQUFROztzQkFDakQsUUFBUTt3QkF0QnFDLEtBQUs7a0JBQXRELGVBQWU7bUJBQUMsVUFBVSxFQUFFLEVBQUMsV0FBVyxFQUFFLElBQUksRUFBQztZQUVoRCxjQUFjO2tCQURiLGVBQWU7bUJBQUMsa0JBQWtCLEVBQUUsRUFBQyxXQUFXLEVBQUUsSUFBSSxFQUFDO1lBZS9DLHVCQUF1QjtrQkFBL0IsS0FBSztZQXFDRixnQkFBZ0I7a0JBRG5CLEtBQUsiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBZnRlckNvbnRlbnRJbml0LCBDaGFuZ2VEZXRlY3RvclJlZiwgQ29udGVudENoaWxkcmVuLCBEaXJlY3RpdmUsIEVsZW1lbnRSZWYsIElucHV0LCBPbkNoYW5nZXMsIE9uRGVzdHJveSwgT3B0aW9uYWwsIFF1ZXJ5TGlzdCwgUmVuZGVyZXIyLCBTaW1wbGVDaGFuZ2VzfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ZnJvbSwgb2YsIFN1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge21lcmdlQWxsfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7RXZlbnQsIE5hdmlnYXRpb25FbmR9IGZyb20gJy4uL2V2ZW50cyc7XG5pbXBvcnQge1JvdXRlcn0gZnJvbSAnLi4vcm91dGVyJztcbmltcG9ydCB7SXNBY3RpdmVNYXRjaE9wdGlvbnN9IGZyb20gJy4uL3VybF90cmVlJztcblxuaW1wb3J0IHtSb3V0ZXJMaW5rLCBSb3V0ZXJMaW5rV2l0aEhyZWZ9IGZyb20gJy4vcm91dGVyX2xpbmsnO1xuXG5cbi8qKlxuICpcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFRyYWNrcyB3aGV0aGVyIHRoZSBsaW5rZWQgcm91dGUgb2YgYW4gZWxlbWVudCBpcyBjdXJyZW50bHkgYWN0aXZlLCBhbmQgYWxsb3dzIHlvdVxuICogdG8gc3BlY2lmeSBvbmUgb3IgbW9yZSBDU1MgY2xhc3NlcyB0byBhZGQgdG8gdGhlIGVsZW1lbnQgd2hlbiB0aGUgbGlua2VkIHJvdXRlXG4gKiBpcyBhY3RpdmUuXG4gKlxuICogVXNlIHRoaXMgZGlyZWN0aXZlIHRvIGNyZWF0ZSBhIHZpc3VhbCBkaXN0aW5jdGlvbiBmb3IgZWxlbWVudHMgYXNzb2NpYXRlZCB3aXRoIGFuIGFjdGl2ZSByb3V0ZS5cbiAqIEZvciBleGFtcGxlLCB0aGUgZm9sbG93aW5nIGNvZGUgaGlnaGxpZ2h0cyB0aGUgd29yZCBcIkJvYlwiIHdoZW4gdGhlIHJvdXRlclxuICogYWN0aXZhdGVzIHRoZSBhc3NvY2lhdGVkIHJvdXRlOlxuICpcbiAqIGBgYFxuICogPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiIHJvdXRlckxpbmtBY3RpdmU9XCJhY3RpdmUtbGlua1wiPkJvYjwvYT5cbiAqIGBgYFxuICpcbiAqIFdoZW5ldmVyIHRoZSBVUkwgaXMgZWl0aGVyICcvdXNlcicgb3IgJy91c2VyL2JvYicsIHRoZSBcImFjdGl2ZS1saW5rXCIgY2xhc3MgaXNcbiAqIGFkZGVkIHRvIHRoZSBhbmNob3IgdGFnLiBJZiB0aGUgVVJMIGNoYW5nZXMsIHRoZSBjbGFzcyBpcyByZW1vdmVkLlxuICpcbiAqIFlvdSBjYW4gc2V0IG1vcmUgdGhhbiBvbmUgY2xhc3MgdXNpbmcgYSBzcGFjZS1zZXBhcmF0ZWQgc3RyaW5nIG9yIGFuIGFycmF5LlxuICogRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZT1cImNsYXNzMSBjbGFzczJcIj5Cb2I8L2E+XG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgW3JvdXRlckxpbmtBY3RpdmVdPVwiWydjbGFzczEnLCAnY2xhc3MyJ11cIj5Cb2I8L2E+XG4gKiBgYGBcbiAqXG4gKiBUbyBhZGQgdGhlIGNsYXNzZXMgb25seSB3aGVuIHRoZSBVUkwgbWF0Y2hlcyB0aGUgbGluayBleGFjdGx5LCBhZGQgdGhlIG9wdGlvbiBgZXhhY3Q6IHRydWVgOlxuICpcbiAqIGBgYFxuICogPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiIHJvdXRlckxpbmtBY3RpdmU9XCJhY3RpdmUtbGlua1wiIFtyb3V0ZXJMaW5rQWN0aXZlT3B0aW9uc109XCJ7ZXhhY3Q6XG4gKiB0cnVlfVwiPkJvYjwvYT5cbiAqIGBgYFxuICpcbiAqIFRvIGRpcmVjdGx5IGNoZWNrIHRoZSBgaXNBY3RpdmVgIHN0YXR1cyBvZiB0aGUgbGluaywgYXNzaWduIHRoZSBgUm91dGVyTGlua0FjdGl2ZWBcbiAqIGluc3RhbmNlIHRvIGEgdGVtcGxhdGUgdmFyaWFibGUuXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGZvbGxvd2luZyBjaGVja3MgdGhlIHN0YXR1cyB3aXRob3V0IGFzc2lnbmluZyBhbnkgQ1NTIGNsYXNzZXM6XG4gKlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZSAjcmxhPVwicm91dGVyTGlua0FjdGl2ZVwiPlxuICogICBCb2Ige3sgcmxhLmlzQWN0aXZlID8gJyhhbHJlYWR5IG9wZW4pJyA6ICcnfX1cbiAqIDwvYT5cbiAqIGBgYFxuICpcbiAqIFlvdSBjYW4gYXBwbHkgdGhlIGBSb3V0ZXJMaW5rQWN0aXZlYCBkaXJlY3RpdmUgdG8gYW4gYW5jZXN0b3Igb2YgbGlua2VkIGVsZW1lbnRzLlxuICogRm9yIGV4YW1wbGUsIHRoZSBmb2xsb3dpbmcgc2V0cyB0aGUgYWN0aXZlLWxpbmsgY2xhc3Mgb24gdGhlIGA8ZGl2PmAgIHBhcmVudCB0YWdcbiAqIHdoZW4gdGhlIFVSTCBpcyBlaXRoZXIgJy91c2VyL2ppbScgb3IgJy91c2VyL2JvYicuXG4gKlxuICogYGBgXG4gKiA8ZGl2IHJvdXRlckxpbmtBY3RpdmU9XCJhY3RpdmUtbGlua1wiIFtyb3V0ZXJMaW5rQWN0aXZlT3B0aW9uc109XCJ7ZXhhY3Q6IHRydWV9XCI+XG4gKiAgIDxhIHJvdXRlckxpbms9XCIvdXNlci9qaW1cIj5KaW08L2E+XG4gKiAgIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIj5Cb2I8L2E+XG4gKiA8L2Rpdj5cbiAqIGBgYFxuICpcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBEaXJlY3RpdmUoe1xuICBzZWxlY3RvcjogJ1tyb3V0ZXJMaW5rQWN0aXZlXScsXG4gIGV4cG9ydEFzOiAncm91dGVyTGlua0FjdGl2ZScsXG59KVxuZXhwb3J0IGNsYXNzIFJvdXRlckxpbmtBY3RpdmUgaW1wbGVtZW50cyBPbkNoYW5nZXMsIE9uRGVzdHJveSwgQWZ0ZXJDb250ZW50SW5pdCB7XG4gIEBDb250ZW50Q2hpbGRyZW4oUm91dGVyTGluaywge2Rlc2NlbmRhbnRzOiB0cnVlfSkgbGlua3MhOiBRdWVyeUxpc3Q8Um91dGVyTGluaz47XG4gIEBDb250ZW50Q2hpbGRyZW4oUm91dGVyTGlua1dpdGhIcmVmLCB7ZGVzY2VuZGFudHM6IHRydWV9KVxuICBsaW5rc1dpdGhIcmVmcyE6IFF1ZXJ5TGlzdDxSb3V0ZXJMaW5rV2l0aEhyZWY+O1xuXG4gIHByaXZhdGUgY2xhc3Nlczogc3RyaW5nW10gPSBbXTtcbiAgcHJpdmF0ZSByb3V0ZXJFdmVudHNTdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvbjtcbiAgcHJpdmF0ZSBsaW5rSW5wdXRDaGFuZ2VzU3Vic2NyaXB0aW9uPzogU3Vic2NyaXB0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgaXNBY3RpdmU6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAvKipcbiAgICogT3B0aW9ucyB0byBjb25maWd1cmUgaG93IHRvIGRldGVybWluZSBpZiB0aGUgcm91dGVyIGxpbmsgaXMgYWN0aXZlLlxuICAgKlxuICAgKiBUaGVzZSBvcHRpb25zIGFyZSBwYXNzZWQgdG8gdGhlIGBSb3V0ZXIuaXNBY3RpdmUoKWAgZnVuY3Rpb24uXG4gICAqXG4gICAqIEBzZWUgUm91dGVyLmlzQWN0aXZlXG4gICAqL1xuICBASW5wdXQoKSByb3V0ZXJMaW5rQWN0aXZlT3B0aW9uczoge2V4YWN0OiBib29sZWFufXxJc0FjdGl2ZU1hdGNoT3B0aW9ucyA9IHtleGFjdDogZmFsc2V9O1xuXG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLCBwcml2YXRlIGVsZW1lbnQ6IEVsZW1lbnRSZWYsIHByaXZhdGUgcmVuZGVyZXI6IFJlbmRlcmVyMixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY2RyOiBDaGFuZ2VEZXRlY3RvclJlZiwgQE9wdGlvbmFsKCkgcHJpdmF0ZSBsaW5rPzogUm91dGVyTGluayxcbiAgICAgIEBPcHRpb25hbCgpIHByaXZhdGUgbGlua1dpdGhIcmVmPzogUm91dGVyTGlua1dpdGhIcmVmKSB7XG4gICAgdGhpcy5yb3V0ZXJFdmVudHNTdWJzY3JpcHRpb24gPSByb3V0ZXIuZXZlbnRzLnN1YnNjcmliZSgoczogRXZlbnQpID0+IHtcbiAgICAgIGlmIChzIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCkge1xuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ0FmdGVyQ29udGVudEluaXQoKTogdm9pZCB7XG4gICAgLy8gYG9mKG51bGwpYCBpcyB1c2VkIHRvIGZvcmNlIHN1YnNjcmliZSBib2R5IHRvIGV4ZWN1dGUgb25jZSBpbW1lZGlhdGVseSAobGlrZSBgc3RhcnRXaXRoYCkuXG4gICAgb2YodGhpcy5saW5rcy5jaGFuZ2VzLCB0aGlzLmxpbmtzV2l0aEhyZWZzLmNoYW5nZXMsIG9mKG51bGwpKS5waXBlKG1lcmdlQWxsKCkpLnN1YnNjcmliZShfID0+IHtcbiAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgICB0aGlzLnN1YnNjcmliZVRvRWFjaExpbmtPbkNoYW5nZXMoKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc3Vic2NyaWJlVG9FYWNoTGlua09uQ2hhbmdlcygpIHtcbiAgICB0aGlzLmxpbmtJbnB1dENoYW5nZXNTdWJzY3JpcHRpb24/LnVuc3Vic2NyaWJlKCk7XG4gICAgY29uc3QgYWxsTGlua0NoYW5nZXMgPVxuICAgICAgICBbLi4udGhpcy5saW5rcy50b0FycmF5KCksIC4uLnRoaXMubGlua3NXaXRoSHJlZnMudG9BcnJheSgpLCB0aGlzLmxpbmssIHRoaXMubGlua1dpdGhIcmVmXVxuICAgICAgICAgICAgLmZpbHRlcigobGluayk6IGxpbmsgaXMgUm91dGVyTGlua3xSb3V0ZXJMaW5rV2l0aEhyZWYgPT4gISFsaW5rKVxuICAgICAgICAgICAgLm1hcChsaW5rID0+IGxpbmsub25DaGFuZ2VzKTtcbiAgICB0aGlzLmxpbmtJbnB1dENoYW5nZXNTdWJzY3JpcHRpb24gPSBmcm9tKGFsbExpbmtDaGFuZ2VzKS5waXBlKG1lcmdlQWxsKCkpLnN1YnNjcmliZShsaW5rID0+IHtcbiAgICAgIGlmICh0aGlzLmlzQWN0aXZlICE9PSB0aGlzLmlzTGlua0FjdGl2ZSh0aGlzLnJvdXRlcikobGluaykpIHtcbiAgICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIEBJbnB1dCgpXG4gIHNldCByb3V0ZXJMaW5rQWN0aXZlKGRhdGE6IHN0cmluZ1tdfHN0cmluZykge1xuICAgIGNvbnN0IGNsYXNzZXMgPSBBcnJheS5pc0FycmF5KGRhdGEpID8gZGF0YSA6IGRhdGEuc3BsaXQoJyAnKTtcbiAgICB0aGlzLmNsYXNzZXMgPSBjbGFzc2VzLmZpbHRlcihjID0+ICEhYyk7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpOiB2b2lkIHtcbiAgICB0aGlzLnVwZGF0ZSgpO1xuICB9XG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5yb3V0ZXJFdmVudHNTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB0aGlzLmxpbmtJbnB1dENoYW5nZXNTdWJzY3JpcHRpb24/LnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZSgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMubGlua3MgfHwgIXRoaXMubGlua3NXaXRoSHJlZnMgfHwgIXRoaXMucm91dGVyLm5hdmlnYXRlZCkgcmV0dXJuO1xuICAgIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oKCkgPT4ge1xuICAgICAgY29uc3QgaGFzQWN0aXZlTGlua3MgPSB0aGlzLmhhc0FjdGl2ZUxpbmtzKCk7XG4gICAgICBpZiAodGhpcy5pc0FjdGl2ZSAhPT0gaGFzQWN0aXZlTGlua3MpIHtcbiAgICAgICAgKHRoaXMgYXMgYW55KS5pc0FjdGl2ZSA9IGhhc0FjdGl2ZUxpbmtzO1xuICAgICAgICB0aGlzLmNkci5tYXJrRm9yQ2hlY2soKTtcbiAgICAgICAgdGhpcy5jbGFzc2VzLmZvckVhY2goKGMpID0+IHtcbiAgICAgICAgICBpZiAoaGFzQWN0aXZlTGlua3MpIHtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyZXIuYWRkQ2xhc3ModGhpcy5lbGVtZW50Lm5hdGl2ZUVsZW1lbnQsIGMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcmVyLnJlbW92ZUNsYXNzKHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LCBjKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBpc0xpbmtBY3RpdmUocm91dGVyOiBSb3V0ZXIpOiAobGluazogKFJvdXRlckxpbmt8Um91dGVyTGlua1dpdGhIcmVmKSkgPT4gYm9vbGVhbiB7XG4gICAgY29uc3Qgb3B0aW9ucyA9ICdwYXRocycgaW4gdGhpcy5yb3V0ZXJMaW5rQWN0aXZlT3B0aW9ucyA/XG4gICAgICAgIHRoaXMucm91dGVyTGlua0FjdGl2ZU9wdGlvbnMgOlxuICAgICAgICAvLyBXaGlsZSB0aGUgdHlwZXMgc2hvdWxkIGRpc2FsbG93IGB1bmRlZmluZWRgIGhlcmUsIGl0J3MgcG9zc2libGUgd2l0aG91dCBzdHJpY3QgaW5wdXRzXG4gICAgICAgICh0aGlzLnJvdXRlckxpbmtBY3RpdmVPcHRpb25zLmV4YWN0IHx8IGZhbHNlKTtcbiAgICByZXR1cm4gKGxpbms6IFJvdXRlckxpbmt8Um91dGVyTGlua1dpdGhIcmVmKSA9PiByb3V0ZXIuaXNBY3RpdmUobGluay51cmxUcmVlLCBvcHRpb25zKTtcbiAgfVxuXG4gIHByaXZhdGUgaGFzQWN0aXZlTGlua3MoKTogYm9vbGVhbiB7XG4gICAgY29uc3QgaXNBY3RpdmVDaGVja0ZuID0gdGhpcy5pc0xpbmtBY3RpdmUodGhpcy5yb3V0ZXIpO1xuICAgIHJldHVybiB0aGlzLmxpbmsgJiYgaXNBY3RpdmVDaGVja0ZuKHRoaXMubGluaykgfHxcbiAgICAgICAgdGhpcy5saW5rV2l0aEhyZWYgJiYgaXNBY3RpdmVDaGVja0ZuKHRoaXMubGlua1dpdGhIcmVmKSB8fFxuICAgICAgICB0aGlzLmxpbmtzLnNvbWUoaXNBY3RpdmVDaGVja0ZuKSB8fCB0aGlzLmxpbmtzV2l0aEhyZWZzLnNvbWUoaXNBY3RpdmVDaGVja0ZuKTtcbiAgfVxufVxuIl19