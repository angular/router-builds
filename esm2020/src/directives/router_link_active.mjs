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
RouterLinkActive.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.0-rc.0+sha-e9ac16a", ngImport: i0, type: RouterLinkActive, deps: [{ token: i1.Router }, { token: i0.ElementRef }, { token: i0.Renderer2 }, { token: i0.ChangeDetectorRef }, { token: i2.RouterLink, optional: true }, { token: i2.RouterLinkWithHref, optional: true }], target: i0.ɵɵFactoryTarget.Directive });
RouterLinkActive.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "14.2.0-rc.0+sha-e9ac16a", type: RouterLinkActive, isStandalone: true, selector: "[routerLinkActive]", inputs: { routerLinkActiveOptions: "routerLinkActiveOptions", ariaCurrentWhenActive: "ariaCurrentWhenActive", routerLinkActive: "routerLinkActive" }, outputs: { isActiveChange: "isActiveChange" }, queries: [{ propertyName: "links", predicate: RouterLink, descendants: true }, { propertyName: "linksWithHrefs", predicate: RouterLinkWithHref, descendants: true }], exportAs: ["routerLinkActive"], usesOnChanges: true, ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.0-rc.0+sha-e9ac16a", ngImport: i0, type: RouterLinkActive, decorators: [{
            type: Directive,
            args: [{
                    selector: '[routerLinkActive]',
                    exportAs: 'routerLinkActive',
                    standalone: true,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmtfYWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9kaXJlY3RpdmVzL3JvdXRlcl9saW5rX2FjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQW1CLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQXdCLFFBQVEsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBZ0IsTUFBTSxlQUFlLENBQUM7QUFDNU0sT0FBTyxFQUFDLElBQUksRUFBRSxFQUFFLEVBQWUsTUFBTSxNQUFNLENBQUM7QUFDNUMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRXhDLE9BQU8sRUFBUSxhQUFhLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDL0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUdqQyxPQUFPLEVBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFDLE1BQU0sZUFBZSxDQUFDOzs7O0FBRzdEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW9FRztBQU1ILE1BQU0sT0FBTyxnQkFBZ0I7SUErQzNCLFlBQ1ksTUFBYyxFQUFVLE9BQW1CLEVBQVUsUUFBbUIsRUFDL0QsR0FBc0IsRUFBc0IsSUFBaUIsRUFDMUQsWUFBaUM7UUFGN0MsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUFVLFlBQU8sR0FBUCxPQUFPLENBQVk7UUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFXO1FBQy9ELFFBQUcsR0FBSCxHQUFHLENBQW1CO1FBQXNCLFNBQUksR0FBSixJQUFJLENBQWE7UUFDMUQsaUJBQVksR0FBWixZQUFZLENBQXFCO1FBN0NqRCxZQUFPLEdB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SUFBSSxFQUFDO2dCQWUvQyx1QkFBdUI7c0JBQS9CLEtBQUs7Z0JBVUcscUJBQXFCO3NCQUE3QixLQUFLO2dCQWtCYSxjQUFjO3NCQUFoQyxNQUFNO2dCQW9DSCxnQkFBZ0I7c0JBRG5CLEtBQUs7O0FBNkRSOztHQUVHO0FBQ0gsU0FBUyxvQkFBb0IsQ0FBQyxPQUNvQjtJQUNoRCxPQUFPLENBQUMsQ0FBRSxPQUFnQyxDQUFDLEtBQUssQ0FBQztBQUNuRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QWZ0ZXJDb250ZW50SW5pdCwgQ2hhbmdlRGV0ZWN0b3JSZWYsIENvbnRlbnRDaGlsZHJlbiwgRGlyZWN0aXZlLCBFbGVtZW50UmVmLCBFdmVudEVtaXR0ZXIsIElucHV0LCBPbkNoYW5nZXMsIE9uRGVzdHJveSwgT3B0aW9uYWwsIE91dHB1dCwgUXVlcnlMaXN0LCBSZW5kZXJlcjIsIFNpbXBsZUNoYW5nZXN9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtmcm9tLCBvZiwgU3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzJztcbmltcG9ydCB7bWVyZ2VBbGx9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtFdmVudCwgTmF2aWdhdGlvbkVuZH0gZnJvbSAnLi4vZXZlbnRzJztcbmltcG9ydCB7Um91dGVyfSBmcm9tICcuLi9yb3V0ZXInO1xuaW1wb3J0IHtJc0FjdGl2ZU1hdGNoT3B0aW9uc30gZnJvbSAnLi4vdXJsX3RyZWUnO1xuXG5pbXBvcnQge1JvdXRlckxpbmssIFJvdXRlckxpbmtXaXRoSHJlZn0gZnJvbSAnLi9yb3V0ZXJfbGluayc7XG5cblxuLyoqXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogVHJhY2tzIHdoZXRoZXIgdGhlIGxpbmtlZCByb3V0ZSBvZiBhbiBlbGVtZW50IGlzIGN1cnJlbnRseSBhY3RpdmUsIGFuZCBhbGxvd3MgeW91XG4gKiB0byBzcGVjaWZ5IG9uZSBvciBtb3JlIENTUyBjbGFzc2VzIHRvIGFkZCB0byB0aGUgZWxlbWVudCB3aGVuIHRoZSBsaW5rZWQgcm91dGVcbiAqIGlzIGFjdGl2ZS5cbiAqXG4gKiBVc2UgdGhpcyBkaXJlY3RpdmUgdG8gY3JlYXRlIGEgdmlzdWFsIGRpc3RpbmN0aW9uIGZvciBlbGVtZW50cyBhc3NvY2lhdGVkIHdpdGggYW4gYWN0aXZlIHJvdXRlLlxuICogRm9yIGV4YW1wbGUsIHRoZSBmb2xsb3dpbmcgY29kZSBoaWdobGlnaHRzIHRoZSB3b3JkIFwiQm9iXCIgd2hlbiB0aGUgcm91dGVyXG4gKiBhY3RpdmF0ZXMgdGhlIGFzc29jaWF0ZWQgcm91dGU6XG4gKlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZS1saW5rXCI+Qm9iPC9hPlxuICogYGBgXG4gKlxuICogV2hlbmV2ZXIgdGhlIFVSTCBpcyBlaXRoZXIgJy91c2VyJyBvciAnL3VzZXIvYm9iJywgdGhlIFwiYWN0aXZlLWxpbmtcIiBjbGFzcyBpc1xuICogYWRkZWQgdG8gdGhlIGFuY2hvciB0YWcuIElmIHRoZSBVUkwgY2hhbmdlcywgdGhlIGNsYXNzIGlzIHJlbW92ZWQuXG4gKlxuICogWW91IGNhbiBzZXQgbW9yZSB0aGFuIG9uZSBjbGFzcyB1c2luZyBhIHNwYWNlLXNlcGFyYXRlZCBzdHJpbmcgb3IgYW4gYXJyYXkuXG4gKiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiByb3V0ZXJMaW5rQWN0aXZlPVwiY2xhc3MxIGNsYXNzMlwiPkJvYjwvYT5cbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiBbcm91dGVyTGlua0FjdGl2ZV09XCJbJ2NsYXNzMScsICdjbGFzczInXVwiPkJvYjwvYT5cbiAqIGBgYFxuICpcbiAqIFRvIGFkZCB0aGUgY2xhc3NlcyBvbmx5IHdoZW4gdGhlIFVSTCBtYXRjaGVzIHRoZSBsaW5rIGV4YWN0bHksIGFkZCB0aGUgb3B0aW9uIGBleGFjdDogdHJ1ZWA6XG4gKlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZS1saW5rXCIgW3JvdXRlckxpbmtBY3RpdmVPcHRpb25zXT1cIntleGFjdDpcbiAqIHRydWV9XCI+Qm9iPC9hPlxuICogYGBgXG4gKlxuICogVG8gZGlyZWN0bHkgY2hlY2sgdGhlIGBpc0FjdGl2ZWAgc3RhdHVzIG9mIHRoZSBsaW5rLCBhc3NpZ24gdGhlIGBSb3V0ZXJMaW5rQWN0aXZlYFxuICogaW5zdGFuY2UgdG8gYSB0ZW1wbGF0ZSB2YXJpYWJsZS5cbiAqIEZvciBleGFtcGxlLCB0aGUgZm9sbG93aW5nIGNoZWNrcyB0aGUgc3RhdHVzIHdpdGhvdXQgYXNzaWduaW5nIGFueSBDU1MgY2xhc3NlczpcbiAqXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiByb3V0ZXJMaW5rQWN0aXZlICNybGE9XCJyb3V0ZXJMaW5rQWN0aXZlXCI+XG4gKiAgIEJvYiB7eyBybGEuaXNBY3RpdmUgPyAnKGFscmVhZHkgb3BlbiknIDogJyd9fVxuICogPC9hPlxuICogYGBgXG4gKlxuICogWW91IGNhbiBhcHBseSB0aGUgYFJvdXRlckxpbmtBY3RpdmVgIGRpcmVjdGl2ZSB0byBhbiBhbmNlc3RvciBvZiBsaW5rZWQgZWxlbWVudHMuXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGZvbGxvd2luZyBzZXRzIHRoZSBhY3RpdmUtbGluayBjbGFzcyBvbiB0aGUgYDxkaXY+YCAgcGFyZW50IHRhZ1xuICogd2hlbiB0aGUgVVJMIGlzIGVpdGhlciAnL3VzZXIvamltJyBvciAnL3VzZXIvYm9iJy5cbiAqXG4gKiBgYGBcbiAqIDxkaXYgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZS1saW5rXCIgW3JvdXRlckxpbmtBY3RpdmVPcHRpb25zXT1cIntleGFjdDogdHJ1ZX1cIj5cbiAqICAgPGEgcm91dGVyTGluaz1cIi91c2VyL2ppbVwiPkppbTwvYT5cbiAqICAgPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiPkJvYjwvYT5cbiAqIDwvZGl2PlxuICogYGBgXG4gKlxuICogVGhlIGBSb3V0ZXJMaW5rQWN0aXZlYCBkaXJlY3RpdmUgY2FuIGFsc28gYmUgdXNlZCB0byBzZXQgdGhlIGFyaWEtY3VycmVudCBhdHRyaWJ1dGVcbiAqIHRvIHByb3ZpZGUgYW4gYWx0ZXJuYXRpdmUgZGlzdGluY3Rpb24gZm9yIGFjdGl2ZSBlbGVtZW50cyB0byB2aXN1YWxseSBpbXBhaXJlZCB1c2Vycy5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGZvbGxvd2luZyBjb2RlIGFkZHMgdGhlICdhY3RpdmUnIGNsYXNzIHRvIHRoZSBIb21lIFBhZ2UgbGluayB3aGVuIGl0IGlzXG4gKiBpbmRlZWQgYWN0aXZlIGFuZCBpbiBzdWNoIGNhc2UgYWxzbyBzZXRzIGl0cyBhcmlhLWN1cnJlbnQgYXR0cmlidXRlIHRvICdwYWdlJzpcbiAqXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvXCIgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZVwiIGFyaWFDdXJyZW50V2hlbkFjdGl2ZT1cInBhZ2VcIj5Ib21lIFBhZ2U8L2E+XG4gKiBgYGBcbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ARGlyZWN0aXZlKHtcbiAgc2VsZWN0b3I6ICdbcm91dGVyTGlua0FjdGl2ZV0nLFxuICBleHBvcnRBczogJ3JvdXRlckxpbmtBY3RpdmUnLFxuICBzdGFuZGFsb25lOiB0cnVlLFxufSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJMaW5rQWN0aXZlIGltcGxlbWVudHMgT25DaGFuZ2VzLCBPbkRlc3Ryb3ksIEFmdGVyQ29udGVudEluaXQge1xuICBAQ29udGVudENoaWxkcmVuKFJvdXRlckxpbmssIHtkZXNjZW5kYW50czogdHJ1ZX0pIGxpbmtzITogUXVlcnlMaXN0PFJvdXRlckxpbms+O1xuICBAQ29udGVudENoaWxkcmVuKFJvdXRlckxpbmtXaXRoSHJlZiwge2Rlc2NlbmRhbnRzOiB0cnVlfSlcbiAgbGlua3NXaXRoSHJlZnMhOiBRdWVyeUxpc3Q8Um91dGVyTGlua1dpdGhIcmVmPjtcblxuICBwcml2YXRlIGNsYXNzZXM6IHN0cmluZ1tdID0gW107XG4gIHByaXZhdGUgcm91dGVyRXZlbnRzU3Vic2NyaXB0aW9uOiBTdWJzY3JpcHRpb247XG4gIHByaXZhdGUgbGlua0lucHV0Q2hhbmdlc1N1YnNjcmlwdGlvbj86IFN1YnNjcmlwdGlvbjtcbiAgcHVibGljIHJlYWRvbmx5IGlzQWN0aXZlOiBib29sZWFuID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIE9wdGlvbnMgdG8gY29uZmlndXJlIGhvdyB0byBkZXRlcm1pbmUgaWYgdGhlIHJvdXRlciBsaW5rIGlzIGFjdGl2ZS5cbiAgICpcbiAgICogVGhlc2Ugb3B0aW9ucyBhcmUgcGFzc2VkIHRvIHRoZSBgUm91dGVyLmlzQWN0aXZlKClgIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAc2VlIFJvdXRlci5pc0FjdGl2ZVxuICAgKi9cbiAgQElucHV0KCkgcm91dGVyTGlua0FjdGl2ZU9wdGlvbnM6IHtleGFjdDogYm9vbGVhbn18SXNBY3RpdmVNYXRjaE9wdGlvbnMgPSB7ZXhhY3Q6IGZhbHNlfTtcblxuXG4gIC8qKlxuICAgKiBBcmlhLWN1cnJlbnQgYXR0cmlidXRlIHRvIGFwcGx5IHdoZW4gdGhlIHJvdXRlciBsaW5rIGlzIGFjdGl2ZS5cbiAgICpcbiAgICogUG9zc2libGUgdmFsdWVzOiBgJ3BhZ2UnYCB8IGAnc3RlcCdgIHwgYCdsb2NhdGlvbidgIHwgYCdkYXRlJ2AgfCBgJ3RpbWUnYCB8IGB0cnVlYCB8IGBmYWxzZWAuXG4gICAqXG4gICAqIEBzZWUge0BsaW5rIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FjY2Vzc2liaWxpdHkvQVJJQS9BdHRyaWJ1dGVzL2FyaWEtY3VycmVudH1cbiAgICovXG4gIEBJbnB1dCgpIGFyaWFDdXJyZW50V2hlbkFjdGl2ZT86ICdwYWdlJ3wnc3RlcCd8J2xvY2F0aW9uJ3wnZGF0ZSd8J3RpbWUnfHRydWV8ZmFsc2U7XG5cbiAgLyoqXG4gICAqXG4gICAqIFlvdSBjYW4gdXNlIHRoZSBvdXRwdXQgYGlzQWN0aXZlQ2hhbmdlYCB0byBnZXQgbm90aWZpZWQgZWFjaCB0aW1lIHRoZSBsaW5rIGJlY29tZXNcbiAgICogYWN0aXZlIG9yIGluYWN0aXZlLlxuICAgKlxuICAgKiBFbWl0czpcbiAgICogdHJ1ZSAgLT4gUm91dGUgaXMgYWN0aXZlXG4gICAqIGZhbHNlIC0+IFJvdXRlIGlzIGluYWN0aXZlXG4gICAqXG4gICAqIGBgYFxuICAgKiA8YVxuICAgKiAgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiXG4gICAqICByb3V0ZXJMaW5rQWN0aXZlPVwiYWN0aXZlLWxpbmtcIlxuICAgKiAgKGlzQWN0aXZlQ2hhbmdlKT1cInRoaXMub25Sb3V0ZXJMaW5rQWN0aXZlKCRldmVudClcIj5Cb2I8L2E+XG4gICAqIGBgYFxuICAgKi9cbiAgQE91dHB1dCgpIHJlYWRvbmx5IGlzQWN0aXZlQ2hhbmdlOiBFdmVudEVtaXR0ZXI8Ym9vbGVhbj4gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLCBwcml2YXRlIGVsZW1lbnQ6IEVsZW1lbnRSZWYsIHByaXZhdGUgcmVuZGVyZXI6IFJlbmRlcmVyMixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY2RyOiBDaGFuZ2VEZXRlY3RvclJlZiwgQE9wdGlvbmFsKCkgcHJpdmF0ZSBsaW5rPzogUm91dGVyTGluayxcbiAgICAgIEBPcHRpb25hbCgpIHByaXZhdGUgbGlua1dpdGhIcmVmPzogUm91dGVyTGlua1dpdGhIcmVmKSB7XG4gICAgdGhpcy5yb3V0ZXJFdmVudHNTdWJzY3JpcHRpb24gPSByb3V0ZXIuZXZlbnRzLnN1YnNjcmliZSgoczogRXZlbnQpID0+IHtcbiAgICAgIGlmIChzIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCkge1xuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ0FmdGVyQ29udGVudEluaXQoKTogdm9pZCB7XG4gICAgLy8gYG9mKG51bGwpYCBpcyB1c2VkIHRvIGZvcmNlIHN1YnNjcmliZSBib2R5IHRvIGV4ZWN1dGUgb25jZSBpbW1lZGlhdGVseSAobGlrZSBgc3RhcnRXaXRoYCkuXG4gICAgb2YodGhpcy5saW5rcy5jaGFuZ2VzLCB0aGlzLmxpbmtzV2l0aEhyZWZzLmNoYW5nZXMsIG9mKG51bGwpKS5waXBlKG1lcmdlQWxsKCkpLnN1YnNjcmliZShfID0+IHtcbiAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgICB0aGlzLnN1YnNjcmliZVRvRWFjaExpbmtPbkNoYW5nZXMoKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc3Vic2NyaWJlVG9FYWNoTGlua09uQ2hhbmdlcygpIHtcbiAgICB0aGlzLmxpbmtJbnB1dENoYW5nZXNTdWJzY3JpcHRpb24/LnVuc3Vic2NyaWJlKCk7XG4gICAgY29uc3QgYWxsTGlua0NoYW5nZXMgPVxuICAgICAgICBbLi4udGhpcy5saW5rcy50b0FycmF5KCksIC4uLnRoaXMubGlua3NXaXRoSHJlZnMudG9BcnJheSgpLCB0aGlzLmxpbmssIHRoaXMubGlua1dpdGhIcmVmXVxuICAgICAgICAgICAgLmZpbHRlcigobGluayk6IGxpbmsgaXMgUm91dGVyTGlua3xSb3V0ZXJMaW5rV2l0aEhyZWYgPT4gISFsaW5rKVxuICAgICAgICAgICAgLm1hcChsaW5rID0+IGxpbmsub25DaGFuZ2VzKTtcbiAgICB0aGlzLmxpbmtJbnB1dENoYW5nZXNTdWJzY3JpcHRpb24gPSBmcm9tKGFsbExpbmtDaGFuZ2VzKS5waXBlKG1lcmdlQWxsKCkpLnN1YnNjcmliZShsaW5rID0+IHtcbiAgICAgIGlmICh0aGlzLmlzQWN0aXZlICE9PSB0aGlzLmlzTGlua0FjdGl2ZSh0aGlzLnJvdXRlcikobGluaykpIHtcbiAgICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIEBJbnB1dCgpXG4gIHNldCByb3V0ZXJMaW5rQWN0aXZlKGRhdGE6IHN0cmluZ1tdfHN0cmluZykge1xuICAgIGNvbnN0IGNsYXNzZXMgPSBBcnJheS5pc0FycmF5KGRhdGEpID8gZGF0YSA6IGRhdGEuc3BsaXQoJyAnKTtcbiAgICB0aGlzLmNsYXNzZXMgPSBjbGFzc2VzLmZpbHRlcihjID0+ICEhYyk7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpOiB2b2lkIHtcbiAgICB0aGlzLnVwZGF0ZSgpO1xuICB9XG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5yb3V0ZXJFdmVudHNTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB0aGlzLmxpbmtJbnB1dENoYW5nZXNTdWJzY3JpcHRpb24/LnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZSgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMubGlua3MgfHwgIXRoaXMubGlua3NXaXRoSHJlZnMgfHwgIXRoaXMucm91dGVyLm5hdmlnYXRlZCkgcmV0dXJuO1xuICAgIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oKCkgPT4ge1xuICAgICAgY29uc3QgaGFzQWN0aXZlTGlua3MgPSB0aGlzLmhhc0FjdGl2ZUxpbmtzKCk7XG4gICAgICBpZiAodGhpcy5pc0FjdGl2ZSAhPT0gaGFzQWN0aXZlTGlua3MpIHtcbiAgICAgICAgKHRoaXMgYXMgYW55KS5pc0FjdGl2ZSA9IGhhc0FjdGl2ZUxpbmtzO1xuICAgICAgICB0aGlzLmNkci5tYXJrRm9yQ2hlY2soKTtcbiAgICAgICAgdGhpcy5jbGFzc2VzLmZvckVhY2goKGMpID0+IHtcbiAgICAgICAgICBpZiAoaGFzQWN0aXZlTGlua3MpIHtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyZXIuYWRkQ2xhc3ModGhpcy5lbGVtZW50Lm5hdGl2ZUVsZW1lbnQsIGMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcmVyLnJlbW92ZUNsYXNzKHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LCBjKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoaGFzQWN0aXZlTGlua3MgJiYgdGhpcy5hcmlhQ3VycmVudFdoZW5BY3RpdmUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRoaXMucmVuZGVyZXIuc2V0QXR0cmlidXRlKFxuICAgICAgICAgICAgICB0aGlzLmVsZW1lbnQubmF0aXZlRWxlbWVudCwgJ2FyaWEtY3VycmVudCcsIHRoaXMuYXJpYUN1cnJlbnRXaGVuQWN0aXZlLnRvU3RyaW5nKCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMucmVuZGVyZXIucmVtb3ZlQXR0cmlidXRlKHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LCAnYXJpYS1jdXJyZW50Jyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFbWl0IG9uIGlzQWN0aXZlQ2hhbmdlIGFmdGVyIGNsYXNzZXMgYXJlIHVwZGF0ZWRcbiAgICAgICAgdGhpcy5pc0FjdGl2ZUNoYW5nZS5lbWl0KGhhc0FjdGl2ZUxpbmtzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgaXNMaW5rQWN0aXZlKHJvdXRlcjogUm91dGVyKTogKGxpbms6IChSb3V0ZXJMaW5rfFJvdXRlckxpbmtXaXRoSHJlZikpID0+IGJvb2xlYW4ge1xuICAgIGNvbnN0IG9wdGlvbnM6IGJvb2xlYW58SXNBY3RpdmVNYXRjaE9wdGlvbnMgPVxuICAgICAgICBpc0FjdGl2ZU1hdGNoT3B0aW9ucyh0aGlzLnJvdXRlckxpbmtBY3RpdmVPcHRpb25zKSA/XG4gICAgICAgIHRoaXMucm91dGVyTGlua0FjdGl2ZU9wdGlvbnMgOlxuICAgICAgICAvLyBXaGlsZSB0aGUgdHlwZXMgc2hvdWxkIGRpc2FsbG93IGB1bmRlZmluZWRgIGhlcmUsIGl0J3MgcG9zc2libGUgd2l0aG91dCBzdHJpY3QgaW5wdXRzXG4gICAgICAgICh0aGlzLnJvdXRlckxpbmtBY3RpdmVPcHRpb25zLmV4YWN0IHx8IGZhbHNlKTtcbiAgICByZXR1cm4gKGxpbms6IFJvdXRlckxpbmt8Um91dGVyTGlua1dpdGhIcmVmKSA9PlxuICAgICAgICAgICAgICAgbGluay51cmxUcmVlID8gcm91dGVyLmlzQWN0aXZlKGxpbmsudXJsVHJlZSwgb3B0aW9ucykgOiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgaGFzQWN0aXZlTGlua3MoKTogYm9vbGVhbiB7XG4gICAgY29uc3QgaXNBY3RpdmVDaGVja0ZuID0gdGhpcy5pc0xpbmtBY3RpdmUodGhpcy5yb3V0ZXIpO1xuICAgIHJldHVybiB0aGlzLmxpbmsgJiYgaXNBY3RpdmVDaGVja0ZuKHRoaXMubGluaykgfHxcbiAgICAgICAgdGhpcy5saW5rV2l0aEhyZWYgJiYgaXNBY3RpdmVDaGVja0ZuKHRoaXMubGlua1dpdGhIcmVmKSB8fFxuICAgICAgICB0aGlzLmxpbmtzLnNvbWUoaXNBY3RpdmVDaGVja0ZuKSB8fCB0aGlzLmxpbmtzV2l0aEhyZWZzLnNvbWUoaXNBY3RpdmVDaGVja0ZuKTtcbiAgfVxufVxuXG4vKipcbiAqIFVzZSBpbnN0ZWFkIG9mIGAncGF0aHMnIGluIG9wdGlvbnNgIHRvIGJlIGNvbXBhdGlibGUgd2l0aCBwcm9wZXJ0eSByZW5hbWluZ1xuICovXG5mdW5jdGlvbiBpc0FjdGl2ZU1hdGNoT3B0aW9ucyhvcHRpb25zOiB7ZXhhY3Q6IGJvb2xlYW59fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXNBY3RpdmVNYXRjaE9wdGlvbnMpOiBvcHRpb25zIGlzIElzQWN0aXZlTWF0Y2hPcHRpb25zIHtcbiAgcmV0dXJuICEhKG9wdGlvbnMgYXMgSXNBY3RpdmVNYXRjaE9wdGlvbnMpLnBhdGhzO1xufVxuIl19