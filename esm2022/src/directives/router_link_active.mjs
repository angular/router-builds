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
            if (this._isActive !== hasActiveLinks) {
                this._isActive = hasActiveLinks;
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.0-next.1+sha-0d98972", ngImport: i0, type: RouterLinkActive, deps: [{ token: i1.Router }, { token: i0.ElementRef }, { token: i0.Renderer2 }, { token: i0.ChangeDetectorRef }, { token: i2.RouterLink, optional: true }], target: i0.ɵɵFactoryTarget.Directive }); }
    static { this.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "17.3.0-next.1+sha-0d98972", type: RouterLinkActive, isStandalone: true, selector: "[routerLinkActive]", inputs: { routerLinkActiveOptions: "routerLinkActiveOptions", ariaCurrentWhenActive: "ariaCurrentWhenActive", routerLinkActive: "routerLinkActive" }, outputs: { isActiveChange: "isActiveChange" }, queries: [{ propertyName: "links", predicate: RouterLink, descendants: true }], exportAs: ["routerLinkActive"], usesOnChanges: true, ngImport: i0 }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.0-next.1+sha-0d98972", ngImport: i0, type: RouterLinkActive, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmtfYWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9kaXJlY3RpdmVzL3JvdXRlcl9saW5rX2FjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBRUwsaUJBQWlCLEVBQ2pCLGVBQWUsRUFDZixTQUFTLEVBQ1QsVUFBVSxFQUNWLFlBQVksRUFDWixLQUFLLEVBR0wsUUFBUSxFQUNSLE1BQU0sRUFDTixTQUFTLEVBQ1QsU0FBUyxHQUVWLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBQyxJQUFJLEVBQUUsRUFBRSxFQUFlLE1BQU0sTUFBTSxDQUFDO0FBQzVDLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUV4QyxPQUFPLEVBQVEsYUFBYSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQy9DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFHakMsT0FBTyxFQUFDLFVBQVUsRUFBQyxNQUFNLGVBQWUsQ0FBQzs7OztBQUV6Qzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FvRUc7QUFNSCxNQUFNLE9BQU8sZ0JBQWdCO0lBUTNCLElBQUksUUFBUTtRQUNWLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN4QixDQUFDO0lBc0NELFlBQ1UsTUFBYyxFQUNkLE9BQW1CLEVBQ25CLFFBQW1CLEVBQ1YsR0FBc0IsRUFDbkIsSUFBaUI7UUFKN0IsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLFlBQU8sR0FBUCxPQUFPLENBQVk7UUFDbkIsYUFBUSxHQUFSLFFBQVEsQ0FBVztRQUNWLFFBQUcsR0FBSCxHQUFHLENBQW1CO1FBQ25CLFNBQUksR0FBSixJQUFJLENBQWE7UUFsRC9CLFlBQU8s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QUM7QUFDbkQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1xuICBBZnRlckNvbnRlbnRJbml0LFxuICBDaGFuZ2VEZXRlY3RvclJlZixcbiAgQ29udGVudENoaWxkcmVuLFxuICBEaXJlY3RpdmUsXG4gIEVsZW1lbnRSZWYsXG4gIEV2ZW50RW1pdHRlcixcbiAgSW5wdXQsXG4gIE9uQ2hhbmdlcyxcbiAgT25EZXN0cm95LFxuICBPcHRpb25hbCxcbiAgT3V0cHV0LFxuICBRdWVyeUxpc3QsXG4gIFJlbmRlcmVyMixcbiAgU2ltcGxlQ2hhbmdlcyxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge2Zyb20sIG9mLCBTdWJzY3JpcHRpb259IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttZXJnZUFsbH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0V2ZW50LCBOYXZpZ2F0aW9uRW5kfSBmcm9tICcuLi9ldmVudHMnO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJy4uL3JvdXRlcic7XG5pbXBvcnQge0lzQWN0aXZlTWF0Y2hPcHRpb25zfSBmcm9tICcuLi91cmxfdHJlZSc7XG5cbmltcG9ydCB7Um91dGVyTGlua30gZnJvbSAnLi9yb3V0ZXJfbGluayc7XG5cbi8qKlxuICpcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFRyYWNrcyB3aGV0aGVyIHRoZSBsaW5rZWQgcm91dGUgb2YgYW4gZWxlbWVudCBpcyBjdXJyZW50bHkgYWN0aXZlLCBhbmQgYWxsb3dzIHlvdVxuICogdG8gc3BlY2lmeSBvbmUgb3IgbW9yZSBDU1MgY2xhc3NlcyB0byBhZGQgdG8gdGhlIGVsZW1lbnQgd2hlbiB0aGUgbGlua2VkIHJvdXRlXG4gKiBpcyBhY3RpdmUuXG4gKlxuICogVXNlIHRoaXMgZGlyZWN0aXZlIHRvIGNyZWF0ZSBhIHZpc3VhbCBkaXN0aW5jdGlvbiBmb3IgZWxlbWVudHMgYXNzb2NpYXRlZCB3aXRoIGFuIGFjdGl2ZSByb3V0ZS5cbiAqIEZvciBleGFtcGxlLCB0aGUgZm9sbG93aW5nIGNvZGUgaGlnaGxpZ2h0cyB0aGUgd29yZCBcIkJvYlwiIHdoZW4gdGhlIHJvdXRlclxuICogYWN0aXZhdGVzIHRoZSBhc3NvY2lhdGVkIHJvdXRlOlxuICpcbiAqIGBgYFxuICogPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiIHJvdXRlckxpbmtBY3RpdmU9XCJhY3RpdmUtbGlua1wiPkJvYjwvYT5cbiAqIGBgYFxuICpcbiAqIFdoZW5ldmVyIHRoZSBVUkwgaXMgZWl0aGVyICcvdXNlcicgb3IgJy91c2VyL2JvYicsIHRoZSBcImFjdGl2ZS1saW5rXCIgY2xhc3MgaXNcbiAqIGFkZGVkIHRvIHRoZSBhbmNob3IgdGFnLiBJZiB0aGUgVVJMIGNoYW5nZXMsIHRoZSBjbGFzcyBpcyByZW1vdmVkLlxuICpcbiAqIFlvdSBjYW4gc2V0IG1vcmUgdGhhbiBvbmUgY2xhc3MgdXNpbmcgYSBzcGFjZS1zZXBhcmF0ZWQgc3RyaW5nIG9yIGFuIGFycmF5LlxuICogRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZT1cImNsYXNzMSBjbGFzczJcIj5Cb2I8L2E+XG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgW3JvdXRlckxpbmtBY3RpdmVdPVwiWydjbGFzczEnLCAnY2xhc3MyJ11cIj5Cb2I8L2E+XG4gKiBgYGBcbiAqXG4gKiBUbyBhZGQgdGhlIGNsYXNzZXMgb25seSB3aGVuIHRoZSBVUkwgbWF0Y2hlcyB0aGUgbGluayBleGFjdGx5LCBhZGQgdGhlIG9wdGlvbiBgZXhhY3Q6IHRydWVgOlxuICpcbiAqIGBgYFxuICogPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiIHJvdXRlckxpbmtBY3RpdmU9XCJhY3RpdmUtbGlua1wiIFtyb3V0ZXJMaW5rQWN0aXZlT3B0aW9uc109XCJ7ZXhhY3Q6XG4gKiB0cnVlfVwiPkJvYjwvYT5cbiAqIGBgYFxuICpcbiAqIFRvIGRpcmVjdGx5IGNoZWNrIHRoZSBgaXNBY3RpdmVgIHN0YXR1cyBvZiB0aGUgbGluaywgYXNzaWduIHRoZSBgUm91dGVyTGlua0FjdGl2ZWBcbiAqIGluc3RhbmNlIHRvIGEgdGVtcGxhdGUgdmFyaWFibGUuXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGZvbGxvd2luZyBjaGVja3MgdGhlIHN0YXR1cyB3aXRob3V0IGFzc2lnbmluZyBhbnkgQ1NTIGNsYXNzZXM6XG4gKlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZSAjcmxhPVwicm91dGVyTGlua0FjdGl2ZVwiPlxuICogICBCb2Ige3sgcmxhLmlzQWN0aXZlID8gJyhhbHJlYWR5IG9wZW4pJyA6ICcnfX1cbiAqIDwvYT5cbiAqIGBgYFxuICpcbiAqIFlvdSBjYW4gYXBwbHkgdGhlIGBSb3V0ZXJMaW5rQWN0aXZlYCBkaXJlY3RpdmUgdG8gYW4gYW5jZXN0b3Igb2YgbGlua2VkIGVsZW1lbnRzLlxuICogRm9yIGV4YW1wbGUsIHRoZSBmb2xsb3dpbmcgc2V0cyB0aGUgYWN0aXZlLWxpbmsgY2xhc3Mgb24gdGhlIGA8ZGl2PmAgIHBhcmVudCB0YWdcbiAqIHdoZW4gdGhlIFVSTCBpcyBlaXRoZXIgJy91c2VyL2ppbScgb3IgJy91c2VyL2JvYicuXG4gKlxuICogYGBgXG4gKiA8ZGl2IHJvdXRlckxpbmtBY3RpdmU9XCJhY3RpdmUtbGlua1wiIFtyb3V0ZXJMaW5rQWN0aXZlT3B0aW9uc109XCJ7ZXhhY3Q6IHRydWV9XCI+XG4gKiAgIDxhIHJvdXRlckxpbms9XCIvdXNlci9qaW1cIj5KaW08L2E+XG4gKiAgIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIj5Cb2I8L2E+XG4gKiA8L2Rpdj5cbiAqIGBgYFxuICpcbiAqIFRoZSBgUm91dGVyTGlua0FjdGl2ZWAgZGlyZWN0aXZlIGNhbiBhbHNvIGJlIHVzZWQgdG8gc2V0IHRoZSBhcmlhLWN1cnJlbnQgYXR0cmlidXRlXG4gKiB0byBwcm92aWRlIGFuIGFsdGVybmF0aXZlIGRpc3RpbmN0aW9uIGZvciBhY3RpdmUgZWxlbWVudHMgdG8gdmlzdWFsbHkgaW1wYWlyZWQgdXNlcnMuXG4gKlxuICogRm9yIGV4YW1wbGUsIHRoZSBmb2xsb3dpbmcgY29kZSBhZGRzIHRoZSAnYWN0aXZlJyBjbGFzcyB0byB0aGUgSG9tZSBQYWdlIGxpbmsgd2hlbiBpdCBpc1xuICogaW5kZWVkIGFjdGl2ZSBhbmQgaW4gc3VjaCBjYXNlIGFsc28gc2V0cyBpdHMgYXJpYS1jdXJyZW50IGF0dHJpYnV0ZSB0byAncGFnZSc6XG4gKlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL1wiIHJvdXRlckxpbmtBY3RpdmU9XCJhY3RpdmVcIiBhcmlhQ3VycmVudFdoZW5BY3RpdmU9XCJwYWdlXCI+SG9tZSBQYWdlPC9hPlxuICogYGBgXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQERpcmVjdGl2ZSh7XG4gIHNlbGVjdG9yOiAnW3JvdXRlckxpbmtBY3RpdmVdJyxcbiAgZXhwb3J0QXM6ICdyb3V0ZXJMaW5rQWN0aXZlJyxcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyTGlua0FjdGl2ZSBpbXBsZW1lbnRzIE9uQ2hhbmdlcywgT25EZXN0cm95LCBBZnRlckNvbnRlbnRJbml0IHtcbiAgQENvbnRlbnRDaGlsZHJlbihSb3V0ZXJMaW5rLCB7ZGVzY2VuZGFudHM6IHRydWV9KSBsaW5rcyE6IFF1ZXJ5TGlzdDxSb3V0ZXJMaW5rPjtcblxuICBwcml2YXRlIGNsYXNzZXM6IHN0cmluZ1tdID0gW107XG4gIHByaXZhdGUgcm91dGVyRXZlbnRzU3Vic2NyaXB0aW9uOiBTdWJzY3JpcHRpb247XG4gIHByaXZhdGUgbGlua0lucHV0Q2hhbmdlc1N1YnNjcmlwdGlvbj86IFN1YnNjcmlwdGlvbjtcbiAgcHJpdmF0ZSBfaXNBY3RpdmUgPSBmYWxzZTtcblxuICBnZXQgaXNBY3RpdmUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lzQWN0aXZlO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wdGlvbnMgdG8gY29uZmlndXJlIGhvdyB0byBkZXRlcm1pbmUgaWYgdGhlIHJvdXRlciBsaW5rIGlzIGFjdGl2ZS5cbiAgICpcbiAgICogVGhlc2Ugb3B0aW9ucyBhcmUgcGFzc2VkIHRvIHRoZSBgUm91dGVyLmlzQWN0aXZlKClgIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAc2VlIHtAbGluayBSb3V0ZXIjaXNBY3RpdmV9XG4gICAqL1xuICBASW5wdXQoKSByb3V0ZXJMaW5rQWN0aXZlT3B0aW9uczoge2V4YWN0OiBib29sZWFufSB8IElzQWN0aXZlTWF0Y2hPcHRpb25zID0ge2V4YWN0OiBmYWxzZX07XG5cbiAgLyoqXG4gICAqIEFyaWEtY3VycmVudCBhdHRyaWJ1dGUgdG8gYXBwbHkgd2hlbiB0aGUgcm91dGVyIGxpbmsgaXMgYWN0aXZlLlxuICAgKlxuICAgKiBQb3NzaWJsZSB2YWx1ZXM6IGAncGFnZSdgIHwgYCdzdGVwJ2AgfCBgJ2xvY2F0aW9uJ2AgfCBgJ2RhdGUnYCB8IGAndGltZSdgIHwgYHRydWVgIHwgYGZhbHNlYC5cbiAgICpcbiAgICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQWNjZXNzaWJpbGl0eS9BUklBL0F0dHJpYnV0ZXMvYXJpYS1jdXJyZW50fVxuICAgKi9cbiAgQElucHV0KCkgYXJpYUN1cnJlbnRXaGVuQWN0aXZlPzogJ3BhZ2UnIHwgJ3N0ZXAnIHwgJ2xvY2F0aW9uJyB8ICdkYXRlJyB8ICd0aW1lJyB8IHRydWUgfCBmYWxzZTtcblxuICAvKipcbiAgICpcbiAgICogWW91IGNhbiB1c2UgdGhlIG91dHB1dCBgaXNBY3RpdmVDaGFuZ2VgIHRvIGdldCBub3RpZmllZCBlYWNoIHRpbWUgdGhlIGxpbmsgYmVjb21lc1xuICAgKiBhY3RpdmUgb3IgaW5hY3RpdmUuXG4gICAqXG4gICAqIEVtaXRzOlxuICAgKiB0cnVlICAtPiBSb3V0ZSBpcyBhY3RpdmVcbiAgICogZmFsc2UgLT4gUm91dGUgaXMgaW5hY3RpdmVcbiAgICpcbiAgICogYGBgXG4gICAqIDxhXG4gICAqICByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCJcbiAgICogIHJvdXRlckxpbmtBY3RpdmU9XCJhY3RpdmUtbGlua1wiXG4gICAqICAoaXNBY3RpdmVDaGFuZ2UpPVwidGhpcy5vblJvdXRlckxpbmtBY3RpdmUoJGV2ZW50KVwiPkJvYjwvYT5cbiAgICogYGBgXG4gICAqL1xuICBAT3V0cHV0KCkgcmVhZG9ubHkgaXNBY3RpdmVDaGFuZ2U6IEV2ZW50RW1pdHRlcjxib29sZWFuPiA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLFxuICAgIHByaXZhdGUgZWxlbWVudDogRWxlbWVudFJlZixcbiAgICBwcml2YXRlIHJlbmRlcmVyOiBSZW5kZXJlcjIsXG4gICAgcHJpdmF0ZSByZWFkb25seSBjZHI6IENoYW5nZURldGVjdG9yUmVmLFxuICAgIEBPcHRpb25hbCgpIHByaXZhdGUgbGluaz86IFJvdXRlckxpbmssXG4gICkge1xuICAgIHRoaXMucm91dGVyRXZlbnRzU3Vic2NyaXB0aW9uID0gcm91dGVyLmV2ZW50cy5zdWJzY3JpYmUoKHM6IEV2ZW50KSA9PiB7XG4gICAgICBpZiAocyBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpIHtcbiAgICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdBZnRlckNvbnRlbnRJbml0KCk6IHZvaWQge1xuICAgIC8vIGBvZihudWxsKWAgaXMgdXNlZCB0byBmb3JjZSBzdWJzY3JpYmUgYm9keSB0byBleGVjdXRlIG9uY2UgaW1tZWRpYXRlbHkgKGxpa2UgYHN0YXJ0V2l0aGApLlxuICAgIG9mKHRoaXMubGlua3MuY2hhbmdlcywgb2YobnVsbCkpXG4gICAgICAucGlwZShtZXJnZUFsbCgpKVxuICAgICAgLnN1YnNjcmliZSgoXykgPT4ge1xuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgICB0aGlzLnN1YnNjcmliZVRvRWFjaExpbmtPbkNoYW5nZXMoKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzdWJzY3JpYmVUb0VhY2hMaW5rT25DaGFuZ2VzKCkge1xuICAgIHRoaXMubGlua0lucHV0Q2hhbmdlc1N1YnNjcmlwdGlvbj8udW5zdWJzY3JpYmUoKTtcbiAgICBjb25zdCBhbGxMaW5rQ2hhbmdlcyA9IFsuLi50aGlzLmxpbmtzLnRvQXJyYXkoKSwgdGhpcy5saW5rXVxuICAgICAgLmZpbHRlcigobGluayk6IGxpbmsgaXMgUm91dGVyTGluayA9PiAhIWxpbmspXG4gICAgICAubWFwKChsaW5rKSA9PiBsaW5rLm9uQ2hhbmdlcyk7XG4gICAgdGhpcy5saW5rSW5wdXRDaGFuZ2VzU3Vic2NyaXB0aW9uID0gZnJvbShhbGxMaW5rQ2hhbmdlcylcbiAgICAgIC5waXBlKG1lcmdlQWxsKCkpXG4gICAgICAuc3Vic2NyaWJlKChsaW5rKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLl9pc0FjdGl2ZSAhPT0gdGhpcy5pc0xpbmtBY3RpdmUodGhpcy5yb3V0ZXIpKGxpbmspKSB7XG4gICAgICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gIH1cblxuICBASW5wdXQoKVxuICBzZXQgcm91dGVyTGlua0FjdGl2ZShkYXRhOiBzdHJpbmdbXSB8IHN0cmluZykge1xuICAgIGNvbnN0IGNsYXNzZXMgPSBBcnJheS5pc0FycmF5KGRhdGEpID8gZGF0YSA6IGRhdGEuc3BsaXQoJyAnKTtcbiAgICB0aGlzLmNsYXNzZXMgPSBjbGFzc2VzLmZpbHRlcigoYykgPT4gISFjKTtcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcyk6IHZvaWQge1xuICAgIHRoaXMudXBkYXRlKCk7XG4gIH1cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLnJvdXRlckV2ZW50c1N1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIHRoaXMubGlua0lucHV0Q2hhbmdlc1N1YnNjcmlwdGlvbj8udW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5saW5rcyB8fCAhdGhpcy5yb3V0ZXIubmF2aWdhdGVkKSByZXR1cm47XG4gICAgcXVldWVNaWNyb3Rhc2soKCkgPT4ge1xuICAgICAgY29uc3QgaGFzQWN0aXZlTGlua3MgPSB0aGlzLmhhc0FjdGl2ZUxpbmtzKCk7XG4gICAgICBpZiAodGhpcy5faXNBY3RpdmUgIT09IGhhc0FjdGl2ZUxpbmtzKSB7XG4gICAgICAgIHRoaXMuX2lzQWN0aXZlID0gaGFzQWN0aXZlTGlua3M7XG4gICAgICAgIHRoaXMuY2RyLm1hcmtGb3JDaGVjaygpO1xuICAgICAgICB0aGlzLmNsYXNzZXMuZm9yRWFjaCgoYykgPT4ge1xuICAgICAgICAgIGlmIChoYXNBY3RpdmVMaW5rcykge1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJlci5hZGRDbGFzcyh0aGlzLmVsZW1lbnQubmF0aXZlRWxlbWVudCwgYyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyZXIucmVtb3ZlQ2xhc3ModGhpcy5lbGVtZW50Lm5hdGl2ZUVsZW1lbnQsIGMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChoYXNBY3RpdmVMaW5rcyAmJiB0aGlzLmFyaWFDdXJyZW50V2hlbkFjdGl2ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQubmF0aXZlRWxlbWVudCxcbiAgICAgICAgICAgICdhcmlhLWN1cnJlbnQnLFxuICAgICAgICAgICAgdGhpcy5hcmlhQ3VycmVudFdoZW5BY3RpdmUudG9TdHJpbmcoKSxcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMucmVuZGVyZXIucmVtb3ZlQXR0cmlidXRlKHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LCAnYXJpYS1jdXJyZW50Jyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFbWl0IG9uIGlzQWN0aXZlQ2hhbmdlIGFmdGVyIGNsYXNzZXMgYXJlIHVwZGF0ZWRcbiAgICAgICAgdGhpcy5pc0FjdGl2ZUNoYW5nZS5lbWl0KGhhc0FjdGl2ZUxpbmtzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgaXNMaW5rQWN0aXZlKHJvdXRlcjogUm91dGVyKTogKGxpbms6IFJvdXRlckxpbmspID0+IGJvb2xlYW4ge1xuICAgIGNvbnN0IG9wdGlvbnM6IGJvb2xlYW4gfCBJc0FjdGl2ZU1hdGNoT3B0aW9ucyA9IGlzQWN0aXZlTWF0Y2hPcHRpb25zKFxuICAgICAgdGhpcy5yb3V0ZXJMaW5rQWN0aXZlT3B0aW9ucyxcbiAgICApXG4gICAgICA/IHRoaXMucm91dGVyTGlua0FjdGl2ZU9wdGlvbnNcbiAgICAgIDogLy8gV2hpbGUgdGhlIHR5cGVzIHNob3VsZCBkaXNhbGxvdyBgdW5kZWZpbmVkYCBoZXJlLCBpdCdzIHBvc3NpYmxlIHdpdGhvdXQgc3RyaWN0IGlucHV0c1xuICAgICAgICB0aGlzLnJvdXRlckxpbmtBY3RpdmVPcHRpb25zLmV4YWN0IHx8IGZhbHNlO1xuICAgIHJldHVybiAobGluazogUm91dGVyTGluaykgPT4ge1xuICAgICAgY29uc3QgdXJsVHJlZSA9IGxpbmsudXJsVHJlZTtcbiAgICAgIHJldHVybiB1cmxUcmVlID8gcm91dGVyLmlzQWN0aXZlKHVybFRyZWUsIG9wdGlvbnMpIDogZmFsc2U7XG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgaGFzQWN0aXZlTGlua3MoKTogYm9vbGVhbiB7XG4gICAgY29uc3QgaXNBY3RpdmVDaGVja0ZuID0gdGhpcy5pc0xpbmtBY3RpdmUodGhpcy5yb3V0ZXIpO1xuICAgIHJldHVybiAodGhpcy5saW5rICYmIGlzQWN0aXZlQ2hlY2tGbih0aGlzLmxpbmspKSB8fCB0aGlzLmxpbmtzLnNvbWUoaXNBY3RpdmVDaGVja0ZuKTtcbiAgfVxufVxuXG4vKipcbiAqIFVzZSBpbnN0ZWFkIG9mIGAncGF0aHMnIGluIG9wdGlvbnNgIHRvIGJlIGNvbXBhdGlibGUgd2l0aCBwcm9wZXJ0eSByZW5hbWluZ1xuICovXG5mdW5jdGlvbiBpc0FjdGl2ZU1hdGNoT3B0aW9ucyhcbiAgb3B0aW9uczoge2V4YWN0OiBib29sZWFufSB8IElzQWN0aXZlTWF0Y2hPcHRpb25zLFxuKTogb3B0aW9ucyBpcyBJc0FjdGl2ZU1hdGNoT3B0aW9ucyB7XG4gIHJldHVybiAhIShvcHRpb25zIGFzIElzQWN0aXZlTWF0Y2hPcHRpb25zKS5wYXRocztcbn1cbiJdfQ==