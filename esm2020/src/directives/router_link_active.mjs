/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ChangeDetectorRef, ContentChildren, Directive, ElementRef, EventEmitter, Input, Optional, Output, QueryList, Renderer2 } from '@angular/core';
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
 * The `RouterLinkActive` directive can also be used to set the aria-current attribute
 * to provide an alternative distinction for active elements to visually impaired users.
 *
 * For example, the following code adds the 'active' class to the Home Page link when it is
 * indeed active and in such case also sets its aria-current attribute to 'page':
 *
 * ```
 * <a routerLink="/" routerLinkActive="active" ariaCurrentWhenActive="page">Home Page</a>
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
        /**
         *
         * You can use the output `isActiveChange` to get notified each time the link becomes
         * active or inactive.
         *
         * Emits:
         * true  -> Route is active
         * false -> Route is inactive
         *
         * ```
         * <a
         *  routerLink="/user/bob"
         *  routerLinkActive="active-link"
         *  (isActiveChange)="this.onRouterLinkActive($event)">Bob</a>
         * ```
         */
        this.isActiveChange = new EventEmitter();
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
        this.linkInputChangesSubscription?.unsubscribe();
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
        this.routerEventsSubscription.unsubscribe();
        this.linkInputChangesSubscription?.unsubscribe();
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
                if (hasActiveLinks && this.ariaCurrentWhenActive !== undefined) {
                    this.renderer.setAttribute(this.element.nativeElement, 'aria-current', this.ariaCurrentWhenActive.toString());
                }
                else {
                    this.renderer.removeAttribute(this.element.nativeElement, 'aria-current');
                }
                // Emit on isActiveChange after classes are updated
                this.isActiveChange.emit(hasActiveLinks);
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
RouterLinkActive.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.0.0-next.15+sha-b596a50", ngImport: i0, type: RouterLinkActive, deps: [{ token: i1.Router }, { token: i0.ElementRef }, { token: i0.Renderer2 }, { token: i0.ChangeDetectorRef }, { token: i2.RouterLink, optional: true }, { token: i2.RouterLinkWithHref, optional: true }], target: i0.ɵɵFactoryTarget.Directive });
RouterLinkActive.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "12.0.0", version: "14.0.0-next.15+sha-b596a50", type: RouterLinkActive, selector: "[routerLinkActive]", inputs: { routerLinkActiveOptions: "routerLinkActiveOptions", ariaCurrentWhenActive: "ariaCurrentWhenActive", routerLinkActive: "routerLinkActive" }, outputs: { isActiveChange: "isActiveChange" }, queries: [{ propertyName: "links", predicate: RouterLink, descendants: true }, { propertyName: "linksWithHrefs", predicate: RouterLinkWithHref, descendants: true }], exportAs: ["routerLinkActive"], usesOnChanges: true, ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.0.0-next.15+sha-b596a50", ngImport: i0, type: RouterLinkActive, decorators: [{
            type: Directive,
            args: [{
                    selector: '[routerLinkActive]',
                    exportAs: 'routerLinkActive',
                }]
        }], ctorParameters: function () { return [{ type: i1.Router }, { type: i0.ElementRef }, { type: i0.Renderer2 }, { type: i0.ChangeDetectorRef }, { type: i2.RouterLink, decorators: [{
                    type: Optional
                }] }, { type: i2.RouterLinkWithHref, decorators: [{
                    type: Optional
                }] }]; }, propDecorators: { links: [{
                type: ContentChildren,
                args: [RouterLink, { descendants: true }]
            }], linksWithHrefs: [{
                type: ContentChildren,
                args: [RouterLinkWithHref, { descendants: true }]
            }], routerLinkActiveOptions: [{
                type: Input
            }], ariaCurrentWhenActive: [{
                type: Input
            }], isActiveChange: [{
                type: Output
            }], routerLinkActive: [{
                type: Input
            }] } });
/**
 * Use instead of `'paths' in options` to be compatible with property renaming
 */
function isActiveMatchOptions(options) {
    return !!options.paths;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmtfYWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9kaXJlY3RpdmVzL3JvdXRlcl9saW5rX2FjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQW1CLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQXdCLFFBQVEsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBZ0IsTUFBTSxlQUFlLENBQUM7QUFDNU0sT0FBTyxFQUFDLElBQUksRUFBRSxFQUFFLEVBQWUsTUFBTSxNQUFNLENBQUM7QUFDNUMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRXhDLE9BQU8sRUFBUSxhQUFhLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDL0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUdqQyxPQUFPLEVBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFDLE1BQU0sZUFBZSxDQUFDOzs7O0FBRzdEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW9FRztBQUtILE1BQU0sT0FBTyxnQkFBZ0I7SUErQzNCLFlBQ1ksTUFBYyxFQUFVLE9BQW1CLEVBQVUsUUFBbUIsRUFDL0QsR0FBc0IsRUFBc0IsSUFBaUIsRUFDMUQsWUFBaUM7UUFGN0MsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUFVLFlBQU8sR0FBUCxPQUFPLENBQVk7UUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFXO1FBQy9ELFFBQUcsR0FBSCxHQUFHLENBQW1CO1FBQXNCLFNBQUksR0FBSixJQUFJLENBQWE7UUFDMUQsaUJBQVksR0FBWixZQUFZLENBQXFCO1FBN0NqRCxZQUFPLEdBQWEsRUFBRSxDQUFDO1FBR2YsYUFBUSxHQUFZLEtBQUssQ0FBQztRQUUxQzs7Ozs7O1dBTUc7UUFDTSw0QkFBdUIsR0FBMEMsRUFBQyxLQUFLLEVBQUUsS0FBSyxFQUFDLENBQUM7UUFZekY7Ozs7Ozs7Ozs7Ozs7OztXQWVHO1FBQ2dCLG1CQUFjLEdBQTBCLElBQUksWUFBWSxFQUFFLENBQUM7UUFNNUUsSUFBSSxDQUFDLHdCQUF3QixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBUSxFQUFFLEVBQUU7WUFDbkUsSUFBSSxDQUFDLFlBQVksYUFBYSxFQUFFO2dCQUM5QixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDZjtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELGFBQWE7SUFDYixrQkFBa0I7UUFDaEIsNkZBQTZGO1FBQzdGLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDM0YsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUM7UUFDdEMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sNEJBQTRCO1FBQ2xDLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxXQUFXLEVBQUUsQ0FBQztRQUNqRCxNQUFNLGNBQWMsR0FDaEIsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQzthQUNwRixNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQXlDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO2FBQy9ELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsNEJBQTRCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN6RixJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzFELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUNmO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsSUFDSSxnQkFBZ0IsQ0FBQyxJQUFxQjtRQUN4QyxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRCxhQUFhO0lBQ2IsV0FBVyxDQUFDLE9BQXNCO1FBQ2hDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNoQixDQUFDO0lBQ0QsYUFBYTtJQUNiLFdBQVc7UUFDVCxJQUFJLENBQUMsd0JBQXdCLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDNUMsSUFBSSxDQUFDLDRCQUE0QixFQUFFLFdBQVcsRUFBRSxDQUFDO0lBQ25ELENBQUM7SUFFTyxNQUFNO1FBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTO1lBQUUsT0FBTztRQUMxRSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUMxQixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDN0MsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLGNBQWMsRUFBRTtnQkFDbkMsSUFBWSxDQUFDLFFBQVEsR0FBRyxjQUFjLENBQUM7Z0JBQ3hDLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQ3pCLElBQUksY0FBYyxFQUFFO3dCQUNsQixJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQztxQkFDdkQ7eUJBQU07d0JBQ0wsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUM7cUJBQzFEO2dCQUNILENBQUMsQ0FBQyxDQUFDO2dCQUNILElBQUksY0FBYyxJQUFJLElBQUksQ0FBQyxxQkFBcUIsS0FBSyxTQUFTLEVBQUU7b0JBQzlELElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxjQUFjLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7aUJBQ3hGO3FCQUFNO29CQUNMLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDO2lCQUMzRTtnQkFFRCxtREFBbUQ7Z0JBQ25ELElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO2FBQzFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sWUFBWSxDQUFDLE1BQWM7UUFDakMsTUFBTSxPQUFPLEdBQ1Qsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQztZQUNwRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztZQUM5Qix3RkFBd0Y7WUFDeEYsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxDQUFDO1FBQ2xELE9BQU8sQ0FBQyxJQUFtQyxFQUFFLEVBQUUsQ0FDcEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDM0UsQ0FBQztJQUVPLGNBQWM7UUFDcEIsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkQsT0FBTyxJQUFJLENBQUMsSUFBSSxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQzFDLElBQUksQ0FBQyxZQUFZLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDdkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDcEYsQ0FBQzs7d0hBMUlVLGdCQUFnQjs0R0FBaEIsZ0JBQWdCLHFSQUNWLFVBQVUsb0VBQ1Ysa0JBQWtCO3NHQUZ4QixnQkFBZ0I7a0JBSjVCLFNBQVM7bUJBQUM7b0JBQ1QsUUFBUSxFQUFFLG9CQUFvQjtvQkFDOUIsUUFBUSxFQUFFLGtCQUFrQjtpQkFDN0I7OzBCQWtEK0MsUUFBUTs7MEJBQ2pELFFBQVE7NENBakRxQyxLQUFLO3NCQUF0RCxlQUFlO3VCQUFDLFVBQVUsRUFBRSxFQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUM7Z0JBRWhELGNBQWM7c0JBRGIsZUFBZTt1QkFBQyxrQkFBa0IsRUFBRSxFQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUM7Z0JBZS9DLHVCQUF1QjtzQkFBL0IsS0FBSztnQkFVRyxxQkFBcUI7c0JBQTdCLEtBQUs7Z0JBa0JhLGNBQWM7c0JBQWhDLE1BQU07Z0JBb0NILGdCQUFnQjtzQkFEbkIsS0FBSzs7QUE2RFI7O0dBRUc7QUFDSCxTQUFTLG9CQUFvQixDQUFDLE9BQ29CO0lBQ2hELE9BQU8sQ0FBQyxDQUFFLE9BQWdDLENBQUMsS0FBSyxDQUFDO0FBQ25ELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBZnRlckNvbnRlbnRJbml0LCBDaGFuZ2VEZXRlY3RvclJlZiwgQ29udGVudENoaWxkcmVuLCBEaXJlY3RpdmUsIEVsZW1lbnRSZWYsIEV2ZW50RW1pdHRlciwgSW5wdXQsIE9uQ2hhbmdlcywgT25EZXN0cm95LCBPcHRpb25hbCwgT3V0cHV0LCBRdWVyeUxpc3QsIFJlbmRlcmVyMiwgU2ltcGxlQ2hhbmdlc30gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge2Zyb20sIG9mLCBTdWJzY3JpcHRpb259IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttZXJnZUFsbH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0V2ZW50LCBOYXZpZ2F0aW9uRW5kfSBmcm9tICcuLi9ldmVudHMnO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJy4uL3JvdXRlcic7XG5pbXBvcnQge0lzQWN0aXZlTWF0Y2hPcHRpb25zfSBmcm9tICcuLi91cmxfdHJlZSc7XG5cbmltcG9ydCB7Um91dGVyTGluaywgUm91dGVyTGlua1dpdGhIcmVmfSBmcm9tICcuL3JvdXRlcl9saW5rJztcblxuXG4vKipcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBUcmFja3Mgd2hldGhlciB0aGUgbGlua2VkIHJvdXRlIG9mIGFuIGVsZW1lbnQgaXMgY3VycmVudGx5IGFjdGl2ZSwgYW5kIGFsbG93cyB5b3VcbiAqIHRvIHNwZWNpZnkgb25lIG9yIG1vcmUgQ1NTIGNsYXNzZXMgdG8gYWRkIHRvIHRoZSBlbGVtZW50IHdoZW4gdGhlIGxpbmtlZCByb3V0ZVxuICogaXMgYWN0aXZlLlxuICpcbiAqIFVzZSB0aGlzIGRpcmVjdGl2ZSB0byBjcmVhdGUgYSB2aXN1YWwgZGlzdGluY3Rpb24gZm9yIGVsZW1lbnRzIGFzc29jaWF0ZWQgd2l0aCBhbiBhY3RpdmUgcm91dGUuXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGZvbGxvd2luZyBjb2RlIGhpZ2hsaWdodHMgdGhlIHdvcmQgXCJCb2JcIiB3aGVuIHRoZSByb3V0ZXJcbiAqIGFjdGl2YXRlcyB0aGUgYXNzb2NpYXRlZCByb3V0ZTpcbiAqXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiByb3V0ZXJMaW5rQWN0aXZlPVwiYWN0aXZlLWxpbmtcIj5Cb2I8L2E+XG4gKiBgYGBcbiAqXG4gKiBXaGVuZXZlciB0aGUgVVJMIGlzIGVpdGhlciAnL3VzZXInIG9yICcvdXNlci9ib2InLCB0aGUgXCJhY3RpdmUtbGlua1wiIGNsYXNzIGlzXG4gKiBhZGRlZCB0byB0aGUgYW5jaG9yIHRhZy4gSWYgdGhlIFVSTCBjaGFuZ2VzLCB0aGUgY2xhc3MgaXMgcmVtb3ZlZC5cbiAqXG4gKiBZb3UgY2FuIHNldCBtb3JlIHRoYW4gb25lIGNsYXNzIHVzaW5nIGEgc3BhY2Utc2VwYXJhdGVkIHN0cmluZyBvciBhbiBhcnJheS5cbiAqIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiIHJvdXRlckxpbmtBY3RpdmU9XCJjbGFzczEgY2xhc3MyXCI+Qm9iPC9hPlxuICogPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiIFtyb3V0ZXJMaW5rQWN0aXZlXT1cIlsnY2xhc3MxJywgJ2NsYXNzMiddXCI+Qm9iPC9hPlxuICogYGBgXG4gKlxuICogVG8gYWRkIHRoZSBjbGFzc2VzIG9ubHkgd2hlbiB0aGUgVVJMIG1hdGNoZXMgdGhlIGxpbmsgZXhhY3RseSwgYWRkIHRoZSBvcHRpb24gYGV4YWN0OiB0cnVlYDpcbiAqXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiByb3V0ZXJMaW5rQWN0aXZlPVwiYWN0aXZlLWxpbmtcIiBbcm91dGVyTGlua0FjdGl2ZU9wdGlvbnNdPVwie2V4YWN0OlxuICogdHJ1ZX1cIj5Cb2I8L2E+XG4gKiBgYGBcbiAqXG4gKiBUbyBkaXJlY3RseSBjaGVjayB0aGUgYGlzQWN0aXZlYCBzdGF0dXMgb2YgdGhlIGxpbmssIGFzc2lnbiB0aGUgYFJvdXRlckxpbmtBY3RpdmVgXG4gKiBpbnN0YW5jZSB0byBhIHRlbXBsYXRlIHZhcmlhYmxlLlxuICogRm9yIGV4YW1wbGUsIHRoZSBmb2xsb3dpbmcgY2hlY2tzIHRoZSBzdGF0dXMgd2l0aG91dCBhc3NpZ25pbmcgYW55IENTUyBjbGFzc2VzOlxuICpcbiAqIGBgYFxuICogPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiIHJvdXRlckxpbmtBY3RpdmUgI3JsYT1cInJvdXRlckxpbmtBY3RpdmVcIj5cbiAqICAgQm9iIHt7IHJsYS5pc0FjdGl2ZSA/ICcoYWxyZWFkeSBvcGVuKScgOiAnJ319XG4gKiA8L2E+XG4gKiBgYGBcbiAqXG4gKiBZb3UgY2FuIGFwcGx5IHRoZSBgUm91dGVyTGlua0FjdGl2ZWAgZGlyZWN0aXZlIHRvIGFuIGFuY2VzdG9yIG9mIGxpbmtlZCBlbGVtZW50cy5cbiAqIEZvciBleGFtcGxlLCB0aGUgZm9sbG93aW5nIHNldHMgdGhlIGFjdGl2ZS1saW5rIGNsYXNzIG9uIHRoZSBgPGRpdj5gICBwYXJlbnQgdGFnXG4gKiB3aGVuIHRoZSBVUkwgaXMgZWl0aGVyICcvdXNlci9qaW0nIG9yICcvdXNlci9ib2InLlxuICpcbiAqIGBgYFxuICogPGRpdiByb3V0ZXJMaW5rQWN0aXZlPVwiYWN0aXZlLWxpbmtcIiBbcm91dGVyTGlua0FjdGl2ZU9wdGlvbnNdPVwie2V4YWN0OiB0cnVlfVwiPlxuICogICA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvamltXCI+SmltPC9hPlxuICogICA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCI+Qm9iPC9hPlxuICogPC9kaXY+XG4gKiBgYGBcbiAqXG4gKiBUaGUgYFJvdXRlckxpbmtBY3RpdmVgIGRpcmVjdGl2ZSBjYW4gYWxzbyBiZSB1c2VkIHRvIHNldCB0aGUgYXJpYS1jdXJyZW50IGF0dHJpYnV0ZVxuICogdG8gcHJvdmlkZSBhbiBhbHRlcm5hdGl2ZSBkaXN0aW5jdGlvbiBmb3IgYWN0aXZlIGVsZW1lbnRzIHRvIHZpc3VhbGx5IGltcGFpcmVkIHVzZXJzLlxuICpcbiAqIEZvciBleGFtcGxlLCB0aGUgZm9sbG93aW5nIGNvZGUgYWRkcyB0aGUgJ2FjdGl2ZScgY2xhc3MgdG8gdGhlIEhvbWUgUGFnZSBsaW5rIHdoZW4gaXQgaXNcbiAqIGluZGVlZCBhY3RpdmUgYW5kIGluIHN1Y2ggY2FzZSBhbHNvIHNldHMgaXRzIGFyaWEtY3VycmVudCBhdHRyaWJ1dGUgdG8gJ3BhZ2UnOlxuICpcbiAqIGBgYFxuICogPGEgcm91dGVyTGluaz1cIi9cIiByb3V0ZXJMaW5rQWN0aXZlPVwiYWN0aXZlXCIgYXJpYUN1cnJlbnRXaGVuQWN0aXZlPVwicGFnZVwiPkhvbWUgUGFnZTwvYT5cbiAqIGBgYFxuICpcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBEaXJlY3RpdmUoe1xuICBzZWxlY3RvcjogJ1tyb3V0ZXJMaW5rQWN0aXZlXScsXG4gIGV4cG9ydEFzOiAncm91dGVyTGlua0FjdGl2ZScsXG59KVxuZXhwb3J0IGNsYXNzIFJvdXRlckxpbmtBY3RpdmUgaW1wbGVtZW50cyBPbkNoYW5nZXMsIE9uRGVzdHJveSwgQWZ0ZXJDb250ZW50SW5pdCB7XG4gIEBDb250ZW50Q2hpbGRyZW4oUm91dGVyTGluaywge2Rlc2NlbmRhbnRzOiB0cnVlfSkgbGlua3MhOiBRdWVyeUxpc3Q8Um91dGVyTGluaz47XG4gIEBDb250ZW50Q2hpbGRyZW4oUm91dGVyTGlua1dpdGhIcmVmLCB7ZGVzY2VuZGFudHM6IHRydWV9KVxuICBsaW5rc1dpdGhIcmVmcyE6IFF1ZXJ5TGlzdDxSb3V0ZXJMaW5rV2l0aEhyZWY+O1xuXG4gIHByaXZhdGUgY2xhc3Nlczogc3RyaW5nW10gPSBbXTtcbiAgcHJpdmF0ZSByb3V0ZXJFdmVudHNTdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvbjtcbiAgcHJpdmF0ZSBsaW5rSW5wdXRDaGFuZ2VzU3Vic2NyaXB0aW9uPzogU3Vic2NyaXB0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgaXNBY3RpdmU6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAvKipcbiAgICogT3B0aW9ucyB0byBjb25maWd1cmUgaG93IHRvIGRldGVybWluZSBpZiB0aGUgcm91dGVyIGxpbmsgaXMgYWN0aXZlLlxuICAgKlxuICAgKiBUaGVzZSBvcHRpb25zIGFyZSBwYXNzZWQgdG8gdGhlIGBSb3V0ZXIuaXNBY3RpdmUoKWAgZnVuY3Rpb24uXG4gICAqXG4gICAqIEBzZWUgUm91dGVyLmlzQWN0aXZlXG4gICAqL1xuICBASW5wdXQoKSByb3V0ZXJMaW5rQWN0aXZlT3B0aW9uczoge2V4YWN0OiBib29sZWFufXxJc0FjdGl2ZU1hdGNoT3B0aW9ucyA9IHtleGFjdDogZmFsc2V9O1xuXG5cbiAgLyoqXG4gICAqIEFyaWEtY3VycmVudCBhdHRyaWJ1dGUgdG8gYXBwbHkgd2hlbiB0aGUgcm91dGVyIGxpbmsgaXMgYWN0aXZlLlxuICAgKlxuICAgKiBQb3NzaWJsZSB2YWx1ZXM6IGAncGFnZSdgIHwgYCdzdGVwJ2AgfCBgJ2xvY2F0aW9uJ2AgfCBgJ2RhdGUnYCB8IGAndGltZSdgIHwgYHRydWVgIHwgYGZhbHNlYC5cbiAgICpcbiAgICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQWNjZXNzaWJpbGl0eS9BUklBL0F0dHJpYnV0ZXMvYXJpYS1jdXJyZW50fVxuICAgKi9cbiAgQElucHV0KCkgYXJpYUN1cnJlbnRXaGVuQWN0aXZlPzogJ3BhZ2UnfCdzdGVwJ3wnbG9jYXRpb24nfCdkYXRlJ3wndGltZSd8dHJ1ZXxmYWxzZTtcblxuICAvKipcbiAgICpcbiAgICogWW91IGNhbiB1c2UgdGhlIG91dHB1dCBgaXNBY3RpdmVDaGFuZ2VgIHRvIGdldCBub3RpZmllZCBlYWNoIHRpbWUgdGhlIGxpbmsgYmVjb21lc1xuICAgKiBhY3RpdmUgb3IgaW5hY3RpdmUuXG4gICAqXG4gICAqIEVtaXRzOlxuICAgKiB0cnVlICAtPiBSb3V0ZSBpcyBhY3RpdmVcbiAgICogZmFsc2UgLT4gUm91dGUgaXMgaW5hY3RpdmVcbiAgICpcbiAgICogYGBgXG4gICAqIDxhXG4gICAqICByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCJcbiAgICogIHJvdXRlckxpbmtBY3RpdmU9XCJhY3RpdmUtbGlua1wiXG4gICAqICAoaXNBY3RpdmVDaGFuZ2UpPVwidGhpcy5vblJvdXRlckxpbmtBY3RpdmUoJGV2ZW50KVwiPkJvYjwvYT5cbiAgICogYGBgXG4gICAqL1xuICBAT3V0cHV0KCkgcmVhZG9ubHkgaXNBY3RpdmVDaGFuZ2U6IEV2ZW50RW1pdHRlcjxib29sZWFuPiA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsIHByaXZhdGUgZWxlbWVudDogRWxlbWVudFJlZiwgcHJpdmF0ZSByZW5kZXJlcjogUmVuZGVyZXIyLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBjZHI6IENoYW5nZURldGVjdG9yUmVmLCBAT3B0aW9uYWwoKSBwcml2YXRlIGxpbms/OiBSb3V0ZXJMaW5rLFxuICAgICAgQE9wdGlvbmFsKCkgcHJpdmF0ZSBsaW5rV2l0aEhyZWY/OiBSb3V0ZXJMaW5rV2l0aEhyZWYpIHtcbiAgICB0aGlzLnJvdXRlckV2ZW50c1N1YnNjcmlwdGlvbiA9IHJvdXRlci5ldmVudHMuc3Vic2NyaWJlKChzOiBFdmVudCkgPT4ge1xuICAgICAgaWYgKHMgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nQWZ0ZXJDb250ZW50SW5pdCgpOiB2b2lkIHtcbiAgICAvLyBgb2YobnVsbClgIGlzIHVzZWQgdG8gZm9yY2Ugc3Vic2NyaWJlIGJvZHkgdG8gZXhlY3V0ZSBvbmNlIGltbWVkaWF0ZWx5IChsaWtlIGBzdGFydFdpdGhgKS5cbiAgICBvZih0aGlzLmxpbmtzLmNoYW5nZXMsIHRoaXMubGlua3NXaXRoSHJlZnMuY2hhbmdlcywgb2YobnVsbCkpLnBpcGUobWVyZ2VBbGwoKSkuc3Vic2NyaWJlKF8gPT4ge1xuICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICAgIHRoaXMuc3Vic2NyaWJlVG9FYWNoTGlua09uQ2hhbmdlcygpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzdWJzY3JpYmVUb0VhY2hMaW5rT25DaGFuZ2VzKCkge1xuICAgIHRoaXMubGlua0lucHV0Q2hhbmdlc1N1YnNjcmlwdGlvbj8udW5zdWJzY3JpYmUoKTtcbiAgICBjb25zdCBhbGxMaW5rQ2hhbmdlcyA9XG4gICAgICAgIFsuLi50aGlzLmxpbmtzLnRvQXJyYXkoKSwgLi4udGhpcy5saW5rc1dpdGhIcmVmcy50b0FycmF5KCksIHRoaXMubGluaywgdGhpcy5saW5rV2l0aEhyZWZdXG4gICAgICAgICAgICAuZmlsdGVyKChsaW5rKTogbGluayBpcyBSb3V0ZXJMaW5rfFJvdXRlckxpbmtXaXRoSHJlZiA9PiAhIWxpbmspXG4gICAgICAgICAgICAubWFwKGxpbmsgPT4gbGluay5vbkNoYW5nZXMpO1xuICAgIHRoaXMubGlua0lucHV0Q2hhbmdlc1N1YnNjcmlwdGlvbiA9IGZyb20oYWxsTGlua0NoYW5nZXMpLnBpcGUobWVyZ2VBbGwoKSkuc3Vic2NyaWJlKGxpbmsgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNBY3RpdmUgIT09IHRoaXMuaXNMaW5rQWN0aXZlKHRoaXMucm91dGVyKShsaW5rKSkge1xuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgQElucHV0KClcbiAgc2V0IHJvdXRlckxpbmtBY3RpdmUoZGF0YTogc3RyaW5nW118c3RyaW5nKSB7XG4gICAgY29uc3QgY2xhc3NlcyA9IEFycmF5LmlzQXJyYXkoZGF0YSkgPyBkYXRhIDogZGF0YS5zcGxpdCgnICcpO1xuICAgIHRoaXMuY2xhc3NlcyA9IGNsYXNzZXMuZmlsdGVyKGMgPT4gISFjKTtcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcyk6IHZvaWQge1xuICAgIHRoaXMudXBkYXRlKCk7XG4gIH1cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLnJvdXRlckV2ZW50c1N1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIHRoaXMubGlua0lucHV0Q2hhbmdlc1N1YnNjcmlwdGlvbj8udW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5saW5rcyB8fCAhdGhpcy5saW5rc1dpdGhIcmVmcyB8fCAhdGhpcy5yb3V0ZXIubmF2aWdhdGVkKSByZXR1cm47XG4gICAgUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG4gICAgICBjb25zdCBoYXNBY3RpdmVMaW5rcyA9IHRoaXMuaGFzQWN0aXZlTGlua3MoKTtcbiAgICAgIGlmICh0aGlzLmlzQWN0aXZlICE9PSBoYXNBY3RpdmVMaW5rcykge1xuICAgICAgICAodGhpcyBhcyBhbnkpLmlzQWN0aXZlID0gaGFzQWN0aXZlTGlua3M7XG4gICAgICAgIHRoaXMuY2RyLm1hcmtGb3JDaGVjaygpO1xuICAgICAgICB0aGlzLmNsYXNzZXMuZm9yRWFjaCgoYykgPT4ge1xuICAgICAgICAgIGlmIChoYXNBY3RpdmVMaW5rcykge1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJlci5hZGRDbGFzcyh0aGlzLmVsZW1lbnQubmF0aXZlRWxlbWVudCwgYyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyZXIucmVtb3ZlQ2xhc3ModGhpcy5lbGVtZW50Lm5hdGl2ZUVsZW1lbnQsIGMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChoYXNBY3RpdmVMaW5rcyAmJiB0aGlzLmFyaWFDdXJyZW50V2hlbkFjdGl2ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgIHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LCAnYXJpYS1jdXJyZW50JywgdGhpcy5hcmlhQ3VycmVudFdoZW5BY3RpdmUudG9TdHJpbmcoKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5yZW5kZXJlci5yZW1vdmVBdHRyaWJ1dGUodGhpcy5lbGVtZW50Lm5hdGl2ZUVsZW1lbnQsICdhcmlhLWN1cnJlbnQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEVtaXQgb24gaXNBY3RpdmVDaGFuZ2UgYWZ0ZXIgY2xhc3NlcyBhcmUgdXBkYXRlZFxuICAgICAgICB0aGlzLmlzQWN0aXZlQ2hhbmdlLmVtaXQoaGFzQWN0aXZlTGlua3MpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBpc0xpbmtBY3RpdmUocm91dGVyOiBSb3V0ZXIpOiAobGluazogKFJvdXRlckxpbmt8Um91dGVyTGlua1dpdGhIcmVmKSkgPT4gYm9vbGVhbiB7XG4gICAgY29uc3Qgb3B0aW9uczogYm9vbGVhbnxJc0FjdGl2ZU1hdGNoT3B0aW9ucyA9XG4gICAgICAgIGlzQWN0aXZlTWF0Y2hPcHRpb25zKHRoaXMucm91dGVyTGlua0FjdGl2ZU9wdGlvbnMpID9cbiAgICAgICAgdGhpcy5yb3V0ZXJMaW5rQWN0aXZlT3B0aW9ucyA6XG4gICAgICAgIC8vIFdoaWxlIHRoZSB0eXBlcyBzaG91bGQgZGlzYWxsb3cgYHVuZGVmaW5lZGAgaGVyZSwgaXQncyBwb3NzaWJsZSB3aXRob3V0IHN0cmljdCBpbnB1dHNcbiAgICAgICAgKHRoaXMucm91dGVyTGlua0FjdGl2ZU9wdGlvbnMuZXhhY3QgfHwgZmFsc2UpO1xuICAgIHJldHVybiAobGluazogUm91dGVyTGlua3xSb3V0ZXJMaW5rV2l0aEhyZWYpID0+XG4gICAgICAgICAgICAgICBsaW5rLnVybFRyZWUgPyByb3V0ZXIuaXNBY3RpdmUobGluay51cmxUcmVlLCBvcHRpb25zKSA6IGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBoYXNBY3RpdmVMaW5rcygpOiBib29sZWFuIHtcbiAgICBjb25zdCBpc0FjdGl2ZUNoZWNrRm4gPSB0aGlzLmlzTGlua0FjdGl2ZSh0aGlzLnJvdXRlcik7XG4gICAgcmV0dXJuIHRoaXMubGluayAmJiBpc0FjdGl2ZUNoZWNrRm4odGhpcy5saW5rKSB8fFxuICAgICAgICB0aGlzLmxpbmtXaXRoSHJlZiAmJiBpc0FjdGl2ZUNoZWNrRm4odGhpcy5saW5rV2l0aEhyZWYpIHx8XG4gICAgICAgIHRoaXMubGlua3Muc29tZShpc0FjdGl2ZUNoZWNrRm4pIHx8IHRoaXMubGlua3NXaXRoSHJlZnMuc29tZShpc0FjdGl2ZUNoZWNrRm4pO1xuICB9XG59XG5cbi8qKlxuICogVXNlIGluc3RlYWQgb2YgYCdwYXRocycgaW4gb3B0aW9uc2AgdG8gYmUgY29tcGF0aWJsZSB3aXRoIHByb3BlcnR5IHJlbmFtaW5nXG4gKi9cbmZ1bmN0aW9uIGlzQWN0aXZlTWF0Y2hPcHRpb25zKG9wdGlvbnM6IHtleGFjdDogYm9vbGVhbn18XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IG9wdGlvbnMgaXMgSXNBY3RpdmVNYXRjaE9wdGlvbnMge1xuICByZXR1cm4gISEob3B0aW9ucyBhcyBJc0FjdGl2ZU1hdGNoT3B0aW9ucykucGF0aHM7XG59XG4iXX0=