/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ChangeDetectorRef, ContentChildren, Directive, ElementRef, EventEmitter, Input, Optional, Output, QueryList, Renderer2, } from '@angular/core';
import { from, of } from 'rxjs';
import { mergeAll } from 'rxjs/operators';
import { NavigationEnd } from '../events';
import { Router } from '../router';
import { RouterLink } from './router_link';
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
    get isActive() {
        return this._isActive;
    }
    constructor(router, element, renderer, cdr, link) {
        this.router = router;
        this.element = element;
        this.renderer = renderer;
        this.cdr = cdr;
        this.link = link;
        this.classes = [];
        this._isActive = false;
        /**
         * Options to configure how to determine if the router link is active.
         *
         * These options are passed to the `Router.isActive()` function.
         *
         * @see {@link Router#isActive}
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
        of(this.links.changes, of(null))
            .pipe(mergeAll())
            .subscribe((_) => {
            this.update();
            this.subscribeToEachLinkOnChanges();
        });
    }
    subscribeToEachLinkOnChanges() {
        this.linkInputChangesSubscription?.unsubscribe();
        const allLinkChanges = [...this.links.toArray(), this.link]
            .filter((link) => !!link)
            .map((link) => link.onChanges);
        this.linkInputChangesSubscription = from(allLinkChanges)
            .pipe(mergeAll())
            .subscribe((link) => {
            if (this._isActive !== this.isLinkActive(this.router)(link)) {
                this.update();
            }
        });
    }
    set routerLinkActive(data) {
        const classes = Array.isArray(data) ? data : data.split(' ');
        this.classes = classes.filter((c) => !!c);
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
        if (!this.links || !this.router.navigated)
            return;
        queueMicrotask(() => {
            const hasActiveLinks = this.hasActiveLinks();
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
            // Only emit change if the active state changed.
            if (this._isActive !== hasActiveLinks) {
                this._isActive = hasActiveLinks;
                this.cdr.markForCheck();
                // Emit on isActiveChange after classes are updated
                this.isActiveChange.emit(hasActiveLinks);
            }
        });
    }
    isLinkActive(router) {
        const options = isActiveMatchOptions(this.routerLinkActiveOptions)
            ? this.routerLinkActiveOptions
            : // While the types should disallow `undefined` here, it's possible without strict inputs
                this.routerLinkActiveOptions.exact || false;
        return (link) => {
            const urlTree = link.urlTree;
            return urlTree ? router.isActive(urlTree, options) : false;
        };
    }
    hasActiveLinks() {
        const isActiveCheckFn = this.isLinkActive(this.router);
        return (this.link && isActiveCheckFn(this.link)) || this.links.some(isActiveCheckFn);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: RouterLinkActive, deps: [{ token: i1.Router }, { token: i0.ElementRef }, { token: i0.Renderer2 }, { token: i0.ChangeDetectorRef }, { token: i2.RouterLink, optional: true }], target: i0.ɵɵFactoryTarget.Directive }); }
    static { this.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "19.0.0-next.0+sha-f271021", type: RouterLinkActive, isStandalone: true, selector: "[routerLinkActive]", inputs: { routerLinkActiveOptions: "routerLinkActiveOptions", ariaCurrentWhenActive: "ariaCurrentWhenActive", routerLinkActive: "routerLinkActive" }, outputs: { isActiveChange: "isActiveChange" }, queries: [{ propertyName: "links", predicate: RouterLink, descendants: true }], exportAs: ["routerLinkActive"], usesOnChanges: true, ngImport: i0 }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: RouterLinkActive, decorators: [{
            type: Directive,
            args: [{
                    selector: '[routerLinkActive]',
                    exportAs: 'routerLinkActive',
                    standalone: true,
                }]
        }], ctorParameters: () => [{ type: i1.Router }, { type: i0.ElementRef }, { type: i0.Renderer2 }, { type: i0.ChangeDetectorRef }, { type: i2.RouterLink, decorators: [{
                    type: Optional
                }] }], propDecorators: { links: [{
                type: ContentChildren,
                args: [RouterLink, { descendants: true }]
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmtfYWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9kaXJlY3RpdmVzL3JvdXRlcl9saW5rX2FjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBRUwsaUJBQWlCLEVBQ2pCLGVBQWUsRUFDZixTQUFTLEVBQ1QsVUFBVSxFQUNWLFlBQVksRUFDWixLQUFLLEVBR0wsUUFBUSxFQUNSLE1BQU0sRUFDTixTQUFTLEVBQ1QsU0FBUyxHQUVWLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBQyxJQUFJLEVBQUUsRUFBRSxFQUFlLE1BQU0sTUFBTSxDQUFDO0FBQzVDLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUV4QyxPQUFPLEVBQVEsYUFBYSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQy9DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFHakMsT0FBTyxFQUFDLFVBQVUsRUFBQyxNQUFNLGVBQWUsQ0FBQzs7OztBQUV6Qzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FvRUc7QUFNSCxNQUFNLE9BQU8sZ0JBQWdCO0lBUTNCLElBQUksUUFBUTtRQUNWLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN4QixDQUFDO0lBc0NELFlBQ1UsTUFBYyxFQUNkLE9BQW1CLEVBQ25CLFFBQW1CLEVBQ1YsR0FBc0IsRUFDbkIsSUFBaUI7UUFKN0IsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLFlBQU8sR0FBUCxPQUFPLENBQVk7UUFDbkIsYUFBUSxHQUFSLFFBQVEsQ0FBVztRQUNWLFFBQUcsR0FBSCxHQUFHLENBQW1CO1FBQ25CLFNBQUksR0FBSixJQUFJLENBQWE7UUFsRC9CLFlBQU8s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LEtBQUssQ0FBQztBQUNuRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIEFmdGVyQ29udGVudEluaXQsXG4gIENoYW5nZURldGVjdG9yUmVmLFxuICBDb250ZW50Q2hpbGRyZW4sXG4gIERpcmVjdGl2ZSxcbiAgRWxlbWVudFJlZixcbiAgRXZlbnRFbWl0dGVyLFxuICBJbnB1dCxcbiAgT25DaGFuZ2VzLFxuICBPbkRlc3Ryb3ksXG4gIE9wdGlvbmFsLFxuICBPdXRwdXQsXG4gIFF1ZXJ5TGlzdCxcbiAgUmVuZGVyZXIyLFxuICBTaW1wbGVDaGFuZ2VzLFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ZnJvbSwgb2YsIFN1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge21lcmdlQWxsfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7RXZlbnQsIE5hdmlnYXRpb25FbmR9IGZyb20gJy4uL2V2ZW50cyc7XG5pbXBvcnQge1JvdXRlcn0gZnJvbSAnLi4vcm91dGVyJztcbmltcG9ydCB7SXNBY3RpdmVNYXRjaE9wdGlvbnN9IGZyb20gJy4uL3VybF90cmVlJztcblxuaW1wb3J0IHtSb3V0ZXJMaW5rfSBmcm9tICcuL3JvdXRlcl9saW5rJztcblxuLyoqXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogVHJhY2tzIHdoZXRoZXIgdGhlIGxpbmtlZCByb3V0ZSBvZiBhbiBlbGVtZW50IGlzIGN1cnJlbnRseSBhY3RpdmUsIGFuZCBhbGxvd3MgeW91XG4gKiB0byBzcGVjaWZ5IG9uZSBvciBtb3JlIENTUyBjbGFzc2VzIHRvIGFkZCB0byB0aGUgZWxlbWVudCB3aGVuIHRoZSBsaW5rZWQgcm91dGVcbiAqIGlzIGFjdGl2ZS5cbiAqXG4gKiBVc2UgdGhpcyBkaXJlY3RpdmUgdG8gY3JlYXRlIGEgdmlzdWFsIGRpc3RpbmN0aW9uIGZvciBlbGVtZW50cyBhc3NvY2lhdGVkIHdpdGggYW4gYWN0aXZlIHJvdXRlLlxuICogRm9yIGV4YW1wbGUsIHRoZSBmb2xsb3dpbmcgY29kZSBoaWdobGlnaHRzIHRoZSB3b3JkIFwiQm9iXCIgd2hlbiB0aGUgcm91dGVyXG4gKiBhY3RpdmF0ZXMgdGhlIGFzc29jaWF0ZWQgcm91dGU6XG4gKlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZS1saW5rXCI+Qm9iPC9hPlxuICogYGBgXG4gKlxuICogV2hlbmV2ZXIgdGhlIFVSTCBpcyBlaXRoZXIgJy91c2VyJyBvciAnL3VzZXIvYm9iJywgdGhlIFwiYWN0aXZlLWxpbmtcIiBjbGFzcyBpc1xuICogYWRkZWQgdG8gdGhlIGFuY2hvciB0YWcuIElmIHRoZSBVUkwgY2hhbmdlcywgdGhlIGNsYXNzIGlzIHJlbW92ZWQuXG4gKlxuICogWW91IGNhbiBzZXQgbW9yZSB0aGFuIG9uZSBjbGFzcyB1c2luZyBhIHNwYWNlLXNlcGFyYXRlZCBzdHJpbmcgb3IgYW4gYXJyYXkuXG4gKiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiByb3V0ZXJMaW5rQWN0aXZlPVwiY2xhc3MxIGNsYXNzMlwiPkJvYjwvYT5cbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiBbcm91dGVyTGlua0FjdGl2ZV09XCJbJ2NsYXNzMScsICdjbGFzczInXVwiPkJvYjwvYT5cbiAqIGBgYFxuICpcbiAqIFRvIGFkZCB0aGUgY2xhc3NlcyBvbmx5IHdoZW4gdGhlIFVSTCBtYXRjaGVzIHRoZSBsaW5rIGV4YWN0bHksIGFkZCB0aGUgb3B0aW9uIGBleGFjdDogdHJ1ZWA6XG4gKlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZS1saW5rXCIgW3JvdXRlckxpbmtBY3RpdmVPcHRpb25zXT1cIntleGFjdDpcbiAqIHRydWV9XCI+Qm9iPC9hPlxuICogYGBgXG4gKlxuICogVG8gZGlyZWN0bHkgY2hlY2sgdGhlIGBpc0FjdGl2ZWAgc3RhdHVzIG9mIHRoZSBsaW5rLCBhc3NpZ24gdGhlIGBSb3V0ZXJMaW5rQWN0aXZlYFxuICogaW5zdGFuY2UgdG8gYSB0ZW1wbGF0ZSB2YXJpYWJsZS5cbiAqIEZvciBleGFtcGxlLCB0aGUgZm9sbG93aW5nIGNoZWNrcyB0aGUgc3RhdHVzIHdpdGhvdXQgYXNzaWduaW5nIGFueSBDU1MgY2xhc3NlczpcbiAqXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiByb3V0ZXJMaW5rQWN0aXZlICNybGE9XCJyb3V0ZXJMaW5rQWN0aXZlXCI+XG4gKiAgIEJvYiB7eyBybGEuaXNBY3RpdmUgPyAnKGFscmVhZHkgb3BlbiknIDogJyd9fVxuICogPC9hPlxuICogYGBgXG4gKlxuICogWW91IGNhbiBhcHBseSB0aGUgYFJvdXRlckxpbmtBY3RpdmVgIGRpcmVjdGl2ZSB0byBhbiBhbmNlc3RvciBvZiBsaW5rZWQgZWxlbWVudHMuXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGZvbGxvd2luZyBzZXRzIHRoZSBhY3RpdmUtbGluayBjbGFzcyBvbiB0aGUgYDxkaXY+YCAgcGFyZW50IHRhZ1xuICogd2hlbiB0aGUgVVJMIGlzIGVpdGhlciAnL3VzZXIvamltJyBvciAnL3VzZXIvYm9iJy5cbiAqXG4gKiBgYGBcbiAqIDxkaXYgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZS1saW5rXCIgW3JvdXRlckxpbmtBY3RpdmVPcHRpb25zXT1cIntleGFjdDogdHJ1ZX1cIj5cbiAqICAgPGEgcm91dGVyTGluaz1cIi91c2VyL2ppbVwiPkppbTwvYT5cbiAqICAgPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiPkJvYjwvYT5cbiAqIDwvZGl2PlxuICogYGBgXG4gKlxuICogVGhlIGBSb3V0ZXJMaW5rQWN0aXZlYCBkaXJlY3RpdmUgY2FuIGFsc28gYmUgdXNlZCB0byBzZXQgdGhlIGFyaWEtY3VycmVudCBhdHRyaWJ1dGVcbiAqIHRvIHByb3ZpZGUgYW4gYWx0ZXJuYXRpdmUgZGlzdGluY3Rpb24gZm9yIGFjdGl2ZSBlbGVtZW50cyB0byB2aXN1YWxseSBpbXBhaXJlZCB1c2Vycy5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGZvbGxvd2luZyBjb2RlIGFkZHMgdGhlICdhY3RpdmUnIGNsYXNzIHRvIHRoZSBIb21lIFBhZ2UgbGluayB3aGVuIGl0IGlzXG4gKiBpbmRlZWQgYWN0aXZlIGFuZCBpbiBzdWNoIGNhc2UgYWxzbyBzZXRzIGl0cyBhcmlhLWN1cnJlbnQgYXR0cmlidXRlIHRvICdwYWdlJzpcbiAqXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvXCIgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZVwiIGFyaWFDdXJyZW50V2hlbkFjdGl2ZT1cInBhZ2VcIj5Ib21lIFBhZ2U8L2E+XG4gKiBgYGBcbiAqXG4gKiBAbmdNb2R1bGUgUm91dGVyTW9kdWxlXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ARGlyZWN0aXZlKHtcbiAgc2VsZWN0b3I6ICdbcm91dGVyTGlua0FjdGl2ZV0nLFxuICBleHBvcnRBczogJ3JvdXRlckxpbmtBY3RpdmUnLFxuICBzdGFuZGFsb25lOiB0cnVlLFxufSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJMaW5rQWN0aXZlIGltcGxlbWVudHMgT25DaGFuZ2VzLCBPbkRlc3Ryb3ksIEFmdGVyQ29udGVudEluaXQge1xuICBAQ29udGVudENoaWxkcmVuKFJvdXRlckxpbmssIHtkZXNjZW5kYW50czogdHJ1ZX0pIGxpbmtzITogUXVlcnlMaXN0PFJvdXRlckxpbms+O1xuXG4gIHByaXZhdGUgY2xhc3Nlczogc3RyaW5nW10gPSBbXTtcbiAgcHJpdmF0ZSByb3V0ZXJFdmVudHNTdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvbjtcbiAgcHJpdmF0ZSBsaW5rSW5wdXRDaGFuZ2VzU3Vic2NyaXB0aW9uPzogU3Vic2NyaXB0aW9uO1xuICBwcml2YXRlIF9pc0FjdGl2ZSA9IGZhbHNlO1xuXG4gIGdldCBpc0FjdGl2ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5faXNBY3RpdmU7XG4gIH1cblxuICAvKipcbiAgICogT3B0aW9ucyB0byBjb25maWd1cmUgaG93IHRvIGRldGVybWluZSBpZiB0aGUgcm91dGVyIGxpbmsgaXMgYWN0aXZlLlxuICAgKlxuICAgKiBUaGVzZSBvcHRpb25zIGFyZSBwYXNzZWQgdG8gdGhlIGBSb3V0ZXIuaXNBY3RpdmUoKWAgZnVuY3Rpb24uXG4gICAqXG4gICAqIEBzZWUge0BsaW5rIFJvdXRlciNpc0FjdGl2ZX1cbiAgICovXG4gIEBJbnB1dCgpIHJvdXRlckxpbmtBY3RpdmVPcHRpb25zOiB7ZXhhY3Q6IGJvb2xlYW59IHwgSXNBY3RpdmVNYXRjaE9wdGlvbnMgPSB7ZXhhY3Q6IGZhbHNlfTtcblxuICAvKipcbiAgICogQXJpYS1jdXJyZW50IGF0dHJpYnV0ZSB0byBhcHBseSB3aGVuIHRoZSByb3V0ZXIgbGluayBpcyBhY3RpdmUuXG4gICAqXG4gICAqIFBvc3NpYmxlIHZhbHVlczogYCdwYWdlJ2AgfCBgJ3N0ZXAnYCB8IGAnbG9jYXRpb24nYCB8IGAnZGF0ZSdgIHwgYCd0aW1lJ2AgfCBgdHJ1ZWAgfCBgZmFsc2VgLlxuICAgKlxuICAgKiBAc2VlIHtAbGluayBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BY2Nlc3NpYmlsaXR5L0FSSUEvQXR0cmlidXRlcy9hcmlhLWN1cnJlbnR9XG4gICAqL1xuICBASW5wdXQoKSBhcmlhQ3VycmVudFdoZW5BY3RpdmU/OiAncGFnZScgfCAnc3RlcCcgfCAnbG9jYXRpb24nIHwgJ2RhdGUnIHwgJ3RpbWUnIHwgdHJ1ZSB8IGZhbHNlO1xuXG4gIC8qKlxuICAgKlxuICAgKiBZb3UgY2FuIHVzZSB0aGUgb3V0cHV0IGBpc0FjdGl2ZUNoYW5nZWAgdG8gZ2V0IG5vdGlmaWVkIGVhY2ggdGltZSB0aGUgbGluayBiZWNvbWVzXG4gICAqIGFjdGl2ZSBvciBpbmFjdGl2ZS5cbiAgICpcbiAgICogRW1pdHM6XG4gICAqIHRydWUgIC0+IFJvdXRlIGlzIGFjdGl2ZVxuICAgKiBmYWxzZSAtPiBSb3V0ZSBpcyBpbmFjdGl2ZVxuICAgKlxuICAgKiBgYGBcbiAgICogPGFcbiAgICogIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIlxuICAgKiAgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZS1saW5rXCJcbiAgICogIChpc0FjdGl2ZUNoYW5nZSk9XCJ0aGlzLm9uUm91dGVyTGlua0FjdGl2ZSgkZXZlbnQpXCI+Qm9iPC9hPlxuICAgKiBgYGBcbiAgICovXG4gIEBPdXRwdXQoKSByZWFkb25seSBpc0FjdGl2ZUNoYW5nZTogRXZlbnRFbWl0dGVyPGJvb2xlYW4+ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsXG4gICAgcHJpdmF0ZSBlbGVtZW50OiBFbGVtZW50UmVmLFxuICAgIHByaXZhdGUgcmVuZGVyZXI6IFJlbmRlcmVyMixcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNkcjogQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gICAgQE9wdGlvbmFsKCkgcHJpdmF0ZSBsaW5rPzogUm91dGVyTGluayxcbiAgKSB7XG4gICAgdGhpcy5yb3V0ZXJFdmVudHNTdWJzY3JpcHRpb24gPSByb3V0ZXIuZXZlbnRzLnN1YnNjcmliZSgoczogRXZlbnQpID0+IHtcbiAgICAgIGlmIChzIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCkge1xuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ0FmdGVyQ29udGVudEluaXQoKTogdm9pZCB7XG4gICAgLy8gYG9mKG51bGwpYCBpcyB1c2VkIHRvIGZvcmNlIHN1YnNjcmliZSBib2R5IHRvIGV4ZWN1dGUgb25jZSBpbW1lZGlhdGVseSAobGlrZSBgc3RhcnRXaXRoYCkuXG4gICAgb2YodGhpcy5saW5rcy5jaGFuZ2VzLCBvZihudWxsKSlcbiAgICAgIC5waXBlKG1lcmdlQWxsKCkpXG4gICAgICAuc3Vic2NyaWJlKChfKSA9PiB7XG4gICAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgICAgIHRoaXMuc3Vic2NyaWJlVG9FYWNoTGlua09uQ2hhbmdlcygpO1xuICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHN1YnNjcmliZVRvRWFjaExpbmtPbkNoYW5nZXMoKSB7XG4gICAgdGhpcy5saW5rSW5wdXRDaGFuZ2VzU3Vic2NyaXB0aW9uPy51bnN1YnNjcmliZSgpO1xuICAgIGNvbnN0IGFsbExpbmtDaGFuZ2VzID0gWy4uLnRoaXMubGlua3MudG9BcnJheSgpLCB0aGlzLmxpbmtdXG4gICAgICAuZmlsdGVyKChsaW5rKTogbGluayBpcyBSb3V0ZXJMaW5rID0+ICEhbGluaylcbiAgICAgIC5tYXAoKGxpbmspID0+IGxpbmsub25DaGFuZ2VzKTtcbiAgICB0aGlzLmxpbmtJbnB1dENoYW5nZXNTdWJzY3JpcHRpb24gPSBmcm9tKGFsbExpbmtDaGFuZ2VzKVxuICAgICAgLnBpcGUobWVyZ2VBbGwoKSlcbiAgICAgIC5zdWJzY3JpYmUoKGxpbmspID0+IHtcbiAgICAgICAgaWYgKHRoaXMuX2lzQWN0aXZlICE9PSB0aGlzLmlzTGlua0FjdGl2ZSh0aGlzLnJvdXRlcikobGluaykpIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgfVxuXG4gIEBJbnB1dCgpXG4gIHNldCByb3V0ZXJMaW5rQWN0aXZlKGRhdGE6IHN0cmluZ1tdIHwgc3RyaW5nKSB7XG4gICAgY29uc3QgY2xhc3NlcyA9IEFycmF5LmlzQXJyYXkoZGF0YSkgPyBkYXRhIDogZGF0YS5zcGxpdCgnICcpO1xuICAgIHRoaXMuY2xhc3NlcyA9IGNsYXNzZXMuZmlsdGVyKChjKSA9PiAhIWMpO1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKTogdm9pZCB7XG4gICAgdGhpcy51cGRhdGUoKTtcbiAgfVxuICAvKiogQG5vZG9jICovXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMucm91dGVyRXZlbnRzU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgdGhpcy5saW5rSW5wdXRDaGFuZ2VzU3Vic2NyaXB0aW9uPy51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGUoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmxpbmtzIHx8ICF0aGlzLnJvdXRlci5uYXZpZ2F0ZWQpIHJldHVybjtcblxuICAgIHF1ZXVlTWljcm90YXNrKCgpID0+IHtcbiAgICAgIGNvbnN0IGhhc0FjdGl2ZUxpbmtzID0gdGhpcy5oYXNBY3RpdmVMaW5rcygpO1xuICAgICAgdGhpcy5jbGFzc2VzLmZvckVhY2goKGMpID0+IHtcbiAgICAgICAgaWYgKGhhc0FjdGl2ZUxpbmtzKSB7XG4gICAgICAgICAgdGhpcy5yZW5kZXJlci5hZGRDbGFzcyh0aGlzLmVsZW1lbnQubmF0aXZlRWxlbWVudCwgYyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5yZW5kZXJlci5yZW1vdmVDbGFzcyh0aGlzLmVsZW1lbnQubmF0aXZlRWxlbWVudCwgYyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgaWYgKGhhc0FjdGl2ZUxpbmtzICYmIHRoaXMuYXJpYUN1cnJlbnRXaGVuQWN0aXZlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgdGhpcy5lbGVtZW50Lm5hdGl2ZUVsZW1lbnQsXG4gICAgICAgICAgJ2FyaWEtY3VycmVudCcsXG4gICAgICAgICAgdGhpcy5hcmlhQ3VycmVudFdoZW5BY3RpdmUudG9TdHJpbmcoKSxcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucmVuZGVyZXIucmVtb3ZlQXR0cmlidXRlKHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LCAnYXJpYS1jdXJyZW50Jyk7XG4gICAgICB9XG5cbiAgICAgIC8vIE9ubHkgZW1pdCBjaGFuZ2UgaWYgdGhlIGFjdGl2ZSBzdGF0ZSBjaGFuZ2VkLlxuICAgICAgaWYgKHRoaXMuX2lzQWN0aXZlICE9PSBoYXNBY3RpdmVMaW5rcykge1xuICAgICAgICB0aGlzLl9pc0FjdGl2ZSA9IGhhc0FjdGl2ZUxpbmtzO1xuICAgICAgICB0aGlzLmNkci5tYXJrRm9yQ2hlY2soKTtcbiAgICAgICAgLy8gRW1pdCBvbiBpc0FjdGl2ZUNoYW5nZSBhZnRlciBjbGFzc2VzIGFyZSB1cGRhdGVkXG4gICAgICAgIHRoaXMuaXNBY3RpdmVDaGFuZ2UuZW1pdChoYXNBY3RpdmVMaW5rcyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGlzTGlua0FjdGl2ZShyb3V0ZXI6IFJvdXRlcik6IChsaW5rOiBSb3V0ZXJMaW5rKSA9PiBib29sZWFuIHtcbiAgICBjb25zdCBvcHRpb25zOiBib29sZWFuIHwgSXNBY3RpdmVNYXRjaE9wdGlvbnMgPSBpc0FjdGl2ZU1hdGNoT3B0aW9ucyhcbiAgICAgIHRoaXMucm91dGVyTGlua0FjdGl2ZU9wdGlvbnMsXG4gICAgKVxuICAgICAgPyB0aGlzLnJvdXRlckxpbmtBY3RpdmVPcHRpb25zXG4gICAgICA6IC8vIFdoaWxlIHRoZSB0eXBlcyBzaG91bGQgZGlzYWxsb3cgYHVuZGVmaW5lZGAgaGVyZSwgaXQncyBwb3NzaWJsZSB3aXRob3V0IHN0cmljdCBpbnB1dHNcbiAgICAgICAgdGhpcy5yb3V0ZXJMaW5rQWN0aXZlT3B0aW9ucy5leGFjdCB8fCBmYWxzZTtcbiAgICByZXR1cm4gKGxpbms6IFJvdXRlckxpbmspID0+IHtcbiAgICAgIGNvbnN0IHVybFRyZWUgPSBsaW5rLnVybFRyZWU7XG4gICAgICByZXR1cm4gdXJsVHJlZSA/IHJvdXRlci5pc0FjdGl2ZSh1cmxUcmVlLCBvcHRpb25zKSA6IGZhbHNlO1xuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGhhc0FjdGl2ZUxpbmtzKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGlzQWN0aXZlQ2hlY2tGbiA9IHRoaXMuaXNMaW5rQWN0aXZlKHRoaXMucm91dGVyKTtcbiAgICByZXR1cm4gKHRoaXMubGluayAmJiBpc0FjdGl2ZUNoZWNrRm4odGhpcy5saW5rKSkgfHwgdGhpcy5saW5rcy5zb21lKGlzQWN0aXZlQ2hlY2tGbik7XG4gIH1cbn1cblxuLyoqXG4gKiBVc2UgaW5zdGVhZCBvZiBgJ3BhdGhzJyBpbiBvcHRpb25zYCB0byBiZSBjb21wYXRpYmxlIHdpdGggcHJvcGVydHkgcmVuYW1pbmdcbiAqL1xuZnVuY3Rpb24gaXNBY3RpdmVNYXRjaE9wdGlvbnMoXG4gIG9wdGlvbnM6IHtleGFjdDogYm9vbGVhbn0gfCBJc0FjdGl2ZU1hdGNoT3B0aW9ucyxcbik6IG9wdGlvbnMgaXMgSXNBY3RpdmVNYXRjaE9wdGlvbnMge1xuICByZXR1cm4gISEob3B0aW9ucyBhcyBJc0FjdGl2ZU1hdGNoT3B0aW9ucykucGF0aHM7XG59XG4iXX0=