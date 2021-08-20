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
        const options = isActiveMatchOptions(this.routerLinkActiveOptions) ?
            this.routerLinkActiveOptions :
            // While the types should disallow `undefined` here, it's possible without strict inputs
            (this.routerLinkActiveOptions.exact || false);
        return (link) => link.urlTree ? router.isActive(link.urlTree, options) : false;
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
/**
 * Use instead of `'paths' in options` to be compatible with property renaming
 */
function isActiveMatchOptions(options) {
    return !!options.paths;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmtfYWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9kaXJlY3RpdmVzL3JvdXRlcl9saW5rX2FjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQW1CLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBd0IsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQWdCLE1BQU0sZUFBZSxDQUFDO0FBQ3RMLE9BQU8sRUFBQyxJQUFJLEVBQUUsRUFBRSxFQUFlLE1BQU0sTUFBTSxDQUFDO0FBQzVDLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUV4QyxPQUFPLEVBQVEsYUFBYSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQy9DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFHakMsT0FBTyxFQUFDLFVBQVUsRUFBRSxrQkFBa0IsRUFBQyxNQUFNLGVBQWUsQ0FBQzs7OztBQUc3RDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQTBERztBQUtILE1BQU0sT0FBTyxnQkFBZ0I7SUFvQjNCLFlBQ1ksTUFBYyxFQUFVLE9BQW1CLEVBQVUsUUFBbUIsRUFDL0QsR0FBc0IsRUFBc0IsSUFBaUIsRUFDMUQsWUFBaUM7UUFGN0MsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUFVLFlBQU8sR0FBUCxPQUFPLENBQVk7UUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFXO1FBQy9ELFFBQUcsR0FBSCxHQUFHLENBQW1CO1FBQXNCLFNBQUksR0FBSixJQUFJLENBQWE7UUFDMUQsaUJBQVksR0FBWixZQUFZLENBQXFCO1FBbEJqRCxZQUFPLEdBQWEsRUFBRSxDQUFDO1FBR2YsYUFBUSxHQUFZLEtBQUssQ0FBQztRQUUxQzs7Ozs7O1dBTUc7UUFDTSw0QkFBdUIsR0FBMEMsRUFBQyxLQUFLLEVBQUUsS0FBSyxFQUFDLENBQUM7UUFPdkYsSUFBSSxDQUFDLHdCQUF3QixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBUSxFQUFFLEVBQUU7WUFDbkUsSUFBSSxDQUFDLFlBQVksYUFBYSxFQUFFO2dCQUM5QixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDZjtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELGFBQWE7SUFDYixrQkFBa0I7UUFDaEIsNkZBQTZGO1FBQzdGLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDM0YsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUM7UUFDdEMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sNEJBQTRCOztRQUNsQyxNQUFBLElBQUksQ0FBQyw0QkFBNEIsMENBQUUsV0FBVyxFQUFFLENBQUM7UUFDakQsTUFBTSxjQUFjLEdBQ2hCLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUM7YUFDcEYsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUF5QyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQzthQUMvRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLDRCQUE0QixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDekYsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMxRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDZjtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELElBQ0ksZ0JBQWdCLENBQUMsSUFBcUI7UUFDeEMsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzdELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsYUFBYTtJQUNiLFdBQVcsQ0FBQyxPQUFzQjtRQUNoQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDaEIsQ0FBQztJQUNELGFBQWE7SUFDYixXQUFXOztRQUNULElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM1QyxNQUFBLElBQUksQ0FBQyw0QkFBNEIsMENBQUUsV0FBVyxFQUFFLENBQUM7SUFDbkQsQ0FBQztJQUVPLE1BQU07UUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVM7WUFBRSxPQUFPO1FBQzFFLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQzFCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUM3QyxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssY0FBYyxFQUFFO2dCQUNuQyxJQUFZLENBQUMsUUFBUSxHQUFHLGNBQWMsQ0FBQztnQkFDeEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtvQkFDekIsSUFBSSxjQUFjLEVBQUU7d0JBQ2xCLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO3FCQUN2RDt5QkFBTTt3QkFDTCxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQztxQkFDMUQ7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7YUFDSjtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLFlBQVksQ0FBQyxNQUFjO1FBQ2pDLE1BQU0sT0FBTyxHQUNULG9CQUFvQixDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7WUFDcEQsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7WUFDOUIsd0ZBQXdGO1lBQ3hGLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsQ0FBQztRQUNsRCxPQUFPLENBQUMsSUFBbUMsRUFBRSxFQUFFLENBQ3BDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQzNFLENBQUM7SUFFTyxjQUFjO1FBQ3BCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sSUFBSSxDQUFDLElBQUksSUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUMxQyxJQUFJLENBQUMsWUFBWSxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQ3ZELElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3BGLENBQUM7O2dGQXRHVSxnQkFBZ0I7bUVBQWhCLGdCQUFnQjtvQ0FDVixVQUFVO29DQUNWLGtCQUFrQjs7Ozs7O3VGQUZ4QixnQkFBZ0I7Y0FKNUIsU0FBUztlQUFDO2dCQUNULFFBQVEsRUFBRSxvQkFBb0I7Z0JBQzlCLFFBQVEsRUFBRSxrQkFBa0I7YUFDN0I7O3NCQXVCK0MsUUFBUTs7c0JBQ2pELFFBQVE7d0JBdEJxQyxLQUFLO2tCQUF0RCxlQUFlO21CQUFDLFVBQVUsRUFBRSxFQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUM7WUFFaEQsY0FBYztrQkFEYixlQUFlO21CQUFDLGtCQUFrQixFQUFFLEVBQUMsV0FBVyxFQUFFLElBQUksRUFBQztZQWUvQyx1QkFBdUI7a0JBQS9CLEtBQUs7WUFxQ0YsZ0JBQWdCO2tCQURuQixLQUFLOztBQW9EUjs7R0FFRztBQUNILFNBQVMsb0JBQW9CLENBQUMsT0FDb0I7SUFDaEQsT0FBTyxDQUFDLENBQUUsT0FBZ0MsQ0FBQyxLQUFLLENBQUM7QUFDbkQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FmdGVyQ29udGVudEluaXQsIENoYW5nZURldGVjdG9yUmVmLCBDb250ZW50Q2hpbGRyZW4sIERpcmVjdGl2ZSwgRWxlbWVudFJlZiwgSW5wdXQsIE9uQ2hhbmdlcywgT25EZXN0cm95LCBPcHRpb25hbCwgUXVlcnlMaXN0LCBSZW5kZXJlcjIsIFNpbXBsZUNoYW5nZXN9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtmcm9tLCBvZiwgU3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzJztcbmltcG9ydCB7bWVyZ2VBbGx9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtFdmVudCwgTmF2aWdhdGlvbkVuZH0gZnJvbSAnLi4vZXZlbnRzJztcbmltcG9ydCB7Um91dGVyfSBmcm9tICcuLi9yb3V0ZXInO1xuaW1wb3J0IHtJc0FjdGl2ZU1hdGNoT3B0aW9uc30gZnJvbSAnLi4vdXJsX3RyZWUnO1xuXG5pbXBvcnQge1JvdXRlckxpbmssIFJvdXRlckxpbmtXaXRoSHJlZn0gZnJvbSAnLi9yb3V0ZXJfbGluayc7XG5cblxuLyoqXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogVHJhY2tzIHdoZXRoZXIgdGhlIGxpbmtlZCByb3V0ZSBvZiBhbiBlbGVtZW50IGlzIGN1cnJlbnRseSBhY3RpdmUsIGFuZCBhbGxvd3MgeW91XG4gKiB0byBzcGVjaWZ5IG9uZSBvciBtb3JlIENTUyBjbGFzc2VzIHRvIGFkZCB0byB0aGUgZWxlbWVudCB3aGVuIHRoZSBsaW5rZWQgcm91dGVcbiAqIGlzIGFjdGl2ZS5cbiAqXG4gKiBVc2UgdGhpcyBkaXJlY3RpdmUgdG8gY3JlYXRlIGEgdmlzdWFsIGRpc3RpbmN0aW9uIGZvciBlbGVtZW50cyBhc3NvY2lhdGVkIHdpdGggYW4gYWN0aXZlIHJvdXRlLlxuICogRm9yIGV4YW1wbGUsIHRoZSBmb2xsb3dpbmcgY29kZSBoaWdobGlnaHRzIHRoZSB3b3JkIFwiQm9iXCIgd2hlbiB0aGUgcm91dGVyXG4gKiBhY3RpdmF0ZXMgdGhlIGFzc29jaWF0ZWQgcm91dGU6XG4gKlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZS1saW5rXCI+Qm9iPC9hPlxuICogYGBgXG4gKlxuICogV2hlbmV2ZXIgdGhlIFVSTCBpcyBlaXRoZXIgJy91c2VyJyBvciAnL3VzZXIvYm9iJywgdGhlIFwiYWN0aXZlLWxpbmtcIiBjbGFzcyBpc1xuICogYWRkZWQgdG8gdGhlIGFuY2hvciB0YWcuIElmIHRoZSBVUkwgY2hhbmdlcywgdGhlIGNsYXNzIGlzIHJlbW92ZWQuXG4gKlxuICogWW91IGNhbiBzZXQgbW9yZSB0aGFuIG9uZSBjbGFzcyB1c2luZyBhIHNwYWNlLXNlcGFyYXRlZCBzdHJpbmcgb3IgYW4gYXJyYXkuXG4gKiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiByb3V0ZXJMaW5rQWN0aXZlPVwiY2xhc3MxIGNsYXNzMlwiPkJvYjwvYT5cbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiBbcm91dGVyTGlua0FjdGl2ZV09XCJbJ2NsYXNzMScsICdjbGFzczInXVwiPkJvYjwvYT5cbiAqIGBgYFxuICpcbiAqIFRvIGFkZCB0aGUgY2xhc3NlcyBvbmx5IHdoZW4gdGhlIFVSTCBtYXRjaGVzIHRoZSBsaW5rIGV4YWN0bHksIGFkZCB0aGUgb3B0aW9uIGBleGFjdDogdHJ1ZWA6XG4gKlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZS1saW5rXCIgW3JvdXRlckxpbmtBY3RpdmVPcHRpb25zXT1cIntleGFjdDpcbiAqIHRydWV9XCI+Qm9iPC9hPlxuICogYGBgXG4gKlxuICogVG8gZGlyZWN0bHkgY2hlY2sgdGhlIGBpc0FjdGl2ZWAgc3RhdHVzIG9mIHRoZSBsaW5rLCBhc3NpZ24gdGhlIGBSb3V0ZXJMaW5rQWN0aXZlYFxuICogaW5zdGFuY2UgdG8gYSB0ZW1wbGF0ZSB2YXJpYWJsZS5cbiAqIEZvciBleGFtcGxlLCB0aGUgZm9sbG93aW5nIGNoZWNrcyB0aGUgc3RhdHVzIHdpdGhvdXQgYXNzaWduaW5nIGFueSBDU1MgY2xhc3NlczpcbiAqXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiByb3V0ZXJMaW5rQWN0aXZlICNybGE9XCJyb3V0ZXJMaW5rQWN0aXZlXCI+XG4gKiAgIEJvYiB7eyBybGEuaXNBY3RpdmUgPyAnKGFscmVhZHkgb3BlbiknIDogJyd9fVxuICogPC9hPlxuICogYGBgXG4gKlxuICogWW91IGNhbiBhcHBseSB0aGUgYFJvdXRlckxpbmtBY3RpdmVgIGRpcmVjdGl2ZSB0byBhbiBhbmNlc3RvciBvZiBsaW5rZWQgZWxlbWVudHMuXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGZvbGxvd2luZyBzZXRzIHRoZSBhY3RpdmUtbGluayBjbGFzcyBvbiB0aGUgYDxkaXY+YCAgcGFyZW50IHRhZ1xuICogd2hlbiB0aGUgVVJMIGlzIGVpdGhlciAnL3VzZXIvamltJyBvciAnL3VzZXIvYm9iJy5cbiAqXG4gKiBgYGBcbiAqIDxkaXYgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZS1saW5rXCIgW3JvdXRlckxpbmtBY3RpdmVPcHRpb25zXT1cIntleGFjdDogdHJ1ZX1cIj5cbiAqICAgPGEgcm91dGVyTGluaz1cIi91c2VyL2ppbVwiPkppbTwvYT5cbiAqICAgPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiPkJvYjwvYT5cbiAqIDwvZGl2PlxuICogYGBgXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQERpcmVjdGl2ZSh7XG4gIHNlbGVjdG9yOiAnW3JvdXRlckxpbmtBY3RpdmVdJyxcbiAgZXhwb3J0QXM6ICdyb3V0ZXJMaW5rQWN0aXZlJyxcbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyTGlua0FjdGl2ZSBpbXBsZW1lbnRzIE9uQ2hhbmdlcywgT25EZXN0cm95LCBBZnRlckNvbnRlbnRJbml0IHtcbiAgQENvbnRlbnRDaGlsZHJlbihSb3V0ZXJMaW5rLCB7ZGVzY2VuZGFudHM6IHRydWV9KSBsaW5rcyE6IFF1ZXJ5TGlzdDxSb3V0ZXJMaW5rPjtcbiAgQENvbnRlbnRDaGlsZHJlbihSb3V0ZXJMaW5rV2l0aEhyZWYsIHtkZXNjZW5kYW50czogdHJ1ZX0pXG4gIGxpbmtzV2l0aEhyZWZzITogUXVlcnlMaXN0PFJvdXRlckxpbmtXaXRoSHJlZj47XG5cbiAgcHJpdmF0ZSBjbGFzc2VzOiBzdHJpbmdbXSA9IFtdO1xuICBwcml2YXRlIHJvdXRlckV2ZW50c1N1YnNjcmlwdGlvbjogU3Vic2NyaXB0aW9uO1xuICBwcml2YXRlIGxpbmtJbnB1dENoYW5nZXNTdWJzY3JpcHRpb24/OiBTdWJzY3JpcHRpb247XG4gIHB1YmxpYyByZWFkb25seSBpc0FjdGl2ZTogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBPcHRpb25zIHRvIGNvbmZpZ3VyZSBob3cgdG8gZGV0ZXJtaW5lIGlmIHRoZSByb3V0ZXIgbGluayBpcyBhY3RpdmUuXG4gICAqXG4gICAqIFRoZXNlIG9wdGlvbnMgYXJlIHBhc3NlZCB0byB0aGUgYFJvdXRlci5pc0FjdGl2ZSgpYCBmdW5jdGlvbi5cbiAgICpcbiAgICogQHNlZSBSb3V0ZXIuaXNBY3RpdmVcbiAgICovXG4gIEBJbnB1dCgpIHJvdXRlckxpbmtBY3RpdmVPcHRpb25zOiB7ZXhhY3Q6IGJvb2xlYW59fElzQWN0aXZlTWF0Y2hPcHRpb25zID0ge2V4YWN0OiBmYWxzZX07XG5cblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsIHByaXZhdGUgZWxlbWVudDogRWxlbWVudFJlZiwgcHJpdmF0ZSByZW5kZXJlcjogUmVuZGVyZXIyLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBjZHI6IENoYW5nZURldGVjdG9yUmVmLCBAT3B0aW9uYWwoKSBwcml2YXRlIGxpbms/OiBSb3V0ZXJMaW5rLFxuICAgICAgQE9wdGlvbmFsKCkgcHJpdmF0ZSBsaW5rV2l0aEhyZWY/OiBSb3V0ZXJMaW5rV2l0aEhyZWYpIHtcbiAgICB0aGlzLnJvdXRlckV2ZW50c1N1YnNjcmlwdGlvbiA9IHJvdXRlci5ldmVudHMuc3Vic2NyaWJlKChzOiBFdmVudCkgPT4ge1xuICAgICAgaWYgKHMgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nQWZ0ZXJDb250ZW50SW5pdCgpOiB2b2lkIHtcbiAgICAvLyBgb2YobnVsbClgIGlzIHVzZWQgdG8gZm9yY2Ugc3Vic2NyaWJlIGJvZHkgdG8gZXhlY3V0ZSBvbmNlIGltbWVkaWF0ZWx5IChsaWtlIGBzdGFydFdpdGhgKS5cbiAgICBvZih0aGlzLmxpbmtzLmNoYW5nZXMsIHRoaXMubGlua3NXaXRoSHJlZnMuY2hhbmdlcywgb2YobnVsbCkpLnBpcGUobWVyZ2VBbGwoKSkuc3Vic2NyaWJlKF8gPT4ge1xuICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICAgIHRoaXMuc3Vic2NyaWJlVG9FYWNoTGlua09uQ2hhbmdlcygpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzdWJzY3JpYmVUb0VhY2hMaW5rT25DaGFuZ2VzKCkge1xuICAgIHRoaXMubGlua0lucHV0Q2hhbmdlc1N1YnNjcmlwdGlvbj8udW5zdWJzY3JpYmUoKTtcbiAgICBjb25zdCBhbGxMaW5rQ2hhbmdlcyA9XG4gICAgICAgIFsuLi50aGlzLmxpbmtzLnRvQXJyYXkoKSwgLi4udGhpcy5saW5rc1dpdGhIcmVmcy50b0FycmF5KCksIHRoaXMubGluaywgdGhpcy5saW5rV2l0aEhyZWZdXG4gICAgICAgICAgICAuZmlsdGVyKChsaW5rKTogbGluayBpcyBSb3V0ZXJMaW5rfFJvdXRlckxpbmtXaXRoSHJlZiA9PiAhIWxpbmspXG4gICAgICAgICAgICAubWFwKGxpbmsgPT4gbGluay5vbkNoYW5nZXMpO1xuICAgIHRoaXMubGlua0lucHV0Q2hhbmdlc1N1YnNjcmlwdGlvbiA9IGZyb20oYWxsTGlua0NoYW5nZXMpLnBpcGUobWVyZ2VBbGwoKSkuc3Vic2NyaWJlKGxpbmsgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNBY3RpdmUgIT09IHRoaXMuaXNMaW5rQWN0aXZlKHRoaXMucm91dGVyKShsaW5rKSkge1xuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgQElucHV0KClcbiAgc2V0IHJvdXRlckxpbmtBY3RpdmUoZGF0YTogc3RyaW5nW118c3RyaW5nKSB7XG4gICAgY29uc3QgY2xhc3NlcyA9IEFycmF5LmlzQXJyYXkoZGF0YSkgPyBkYXRhIDogZGF0YS5zcGxpdCgnICcpO1xuICAgIHRoaXMuY2xhc3NlcyA9IGNsYXNzZXMuZmlsdGVyKGMgPT4gISFjKTtcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcyk6IHZvaWQge1xuICAgIHRoaXMudXBkYXRlKCk7XG4gIH1cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLnJvdXRlckV2ZW50c1N1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIHRoaXMubGlua0lucHV0Q2hhbmdlc1N1YnNjcmlwdGlvbj8udW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5saW5rcyB8fCAhdGhpcy5saW5rc1dpdGhIcmVmcyB8fCAhdGhpcy5yb3V0ZXIubmF2aWdhdGVkKSByZXR1cm47XG4gICAgUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG4gICAgICBjb25zdCBoYXNBY3RpdmVMaW5rcyA9IHRoaXMuaGFzQWN0aXZlTGlua3MoKTtcbiAgICAgIGlmICh0aGlzLmlzQWN0aXZlICE9PSBoYXNBY3RpdmVMaW5rcykge1xuICAgICAgICAodGhpcyBhcyBhbnkpLmlzQWN0aXZlID0gaGFzQWN0aXZlTGlua3M7XG4gICAgICAgIHRoaXMuY2RyLm1hcmtGb3JDaGVjaygpO1xuICAgICAgICB0aGlzLmNsYXNzZXMuZm9yRWFjaCgoYykgPT4ge1xuICAgICAgICAgIGlmIChoYXNBY3RpdmVMaW5rcykge1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJlci5hZGRDbGFzcyh0aGlzLmVsZW1lbnQubmF0aXZlRWxlbWVudCwgYyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyZXIucmVtb3ZlQ2xhc3ModGhpcy5lbGVtZW50Lm5hdGl2ZUVsZW1lbnQsIGMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGlzTGlua0FjdGl2ZShyb3V0ZXI6IFJvdXRlcik6IChsaW5rOiAoUm91dGVyTGlua3xSb3V0ZXJMaW5rV2l0aEhyZWYpKSA9PiBib29sZWFuIHtcbiAgICBjb25zdCBvcHRpb25zOiBib29sZWFufElzQWN0aXZlTWF0Y2hPcHRpb25zID1cbiAgICAgICAgaXNBY3RpdmVNYXRjaE9wdGlvbnModGhpcy5yb3V0ZXJMaW5rQWN0aXZlT3B0aW9ucykgP1xuICAgICAgICB0aGlzLnJvdXRlckxpbmtBY3RpdmVPcHRpb25zIDpcbiAgICAgICAgLy8gV2hpbGUgdGhlIHR5cGVzIHNob3VsZCBkaXNhbGxvdyBgdW5kZWZpbmVkYCBoZXJlLCBpdCdzIHBvc3NpYmxlIHdpdGhvdXQgc3RyaWN0IGlucHV0c1xuICAgICAgICAodGhpcy5yb3V0ZXJMaW5rQWN0aXZlT3B0aW9ucy5leGFjdCB8fCBmYWxzZSk7XG4gICAgcmV0dXJuIChsaW5rOiBSb3V0ZXJMaW5rfFJvdXRlckxpbmtXaXRoSHJlZikgPT5cbiAgICAgICAgICAgICAgIGxpbmsudXJsVHJlZSA/IHJvdXRlci5pc0FjdGl2ZShsaW5rLnVybFRyZWUsIG9wdGlvbnMpIDogZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIGhhc0FjdGl2ZUxpbmtzKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGlzQWN0aXZlQ2hlY2tGbiA9IHRoaXMuaXNMaW5rQWN0aXZlKHRoaXMucm91dGVyKTtcbiAgICByZXR1cm4gdGhpcy5saW5rICYmIGlzQWN0aXZlQ2hlY2tGbih0aGlzLmxpbmspIHx8XG4gICAgICAgIHRoaXMubGlua1dpdGhIcmVmICYmIGlzQWN0aXZlQ2hlY2tGbih0aGlzLmxpbmtXaXRoSHJlZikgfHxcbiAgICAgICAgdGhpcy5saW5rcy5zb21lKGlzQWN0aXZlQ2hlY2tGbikgfHwgdGhpcy5saW5rc1dpdGhIcmVmcy5zb21lKGlzQWN0aXZlQ2hlY2tGbik7XG4gIH1cbn1cblxuLyoqXG4gKiBVc2UgaW5zdGVhZCBvZiBgJ3BhdGhzJyBpbiBvcHRpb25zYCB0byBiZSBjb21wYXRpYmxlIHdpdGggcHJvcGVydHkgcmVuYW1pbmdcbiAqL1xuZnVuY3Rpb24gaXNBY3RpdmVNYXRjaE9wdGlvbnMob3B0aW9uczoge2V4YWN0OiBib29sZWFufXxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIElzQWN0aXZlTWF0Y2hPcHRpb25zKTogb3B0aW9ucyBpcyBJc0FjdGl2ZU1hdGNoT3B0aW9ucyB7XG4gIHJldHVybiAhIShvcHRpb25zIGFzIElzQWN0aXZlTWF0Y2hPcHRpb25zKS5wYXRocztcbn1cbiJdfQ==