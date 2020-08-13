/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ChangeDetectorRef, ContentChildren, Directive, ElementRef, Input, Optional, QueryList, Renderer2 } from '@angular/core';
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
 * For example, the following code highlights the word "Bob" when the the router
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
        this.routerLinkActiveOptions = { exact: false };
        this.subscription = router.events.subscribe((s) => {
            if (s instanceof NavigationEnd) {
                this.update();
            }
        });
    }
    /** @nodoc */
    ngAfterContentInit() {
        this.links.changes.subscribe(_ => this.update());
        this.linksWithHrefs.changes.subscribe(_ => this.update());
        this.update();
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
        this.subscription.unsubscribe();
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
        return (link) => router.isActive(link.urlTree, this.routerLinkActiveOptions.exact);
    }
    hasActiveLinks() {
        const isActiveCheckFn = this.isLinkActive(this.router);
        return this.link && isActiveCheckFn(this.link) ||
            this.linkWithHref && isActiveCheckFn(this.linkWithHref) ||
            this.links.some(isActiveCheckFn) || this.linksWithHrefs.some(isActiveCheckFn);
    }
}
RouterLinkActive.ɵfac = function RouterLinkActive_Factory(t) { return new (t || RouterLinkActive)(i0.ɵɵdirectiveInject(i1.Router), i0.ɵɵdirectiveInject(i0.ElementRef), i0.ɵɵdirectiveInject(i0.Renderer2), i0.ɵɵdirectiveInject(i0.ChangeDetectorRef), i0.ɵɵdirectiveInject(i2.RouterLink, 8), i0.ɵɵdirectiveInject(i2.RouterLinkWithHref, 8)); };
RouterLinkActive.ɵdir = i0.ɵɵdefineDirective({ type: RouterLinkActive, selectors: [["", "routerLinkActive", ""]], contentQueries: function RouterLinkActive_ContentQueries(rf, ctx, dirIndex) { if (rf & 1) {
        i0.ɵɵcontentQuery(dirIndex, RouterLink, true);
        i0.ɵɵcontentQuery(dirIndex, RouterLinkWithHref, true);
    } if (rf & 2) {
        var _t;
        i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.links = _t);
        i0.ɵɵqueryRefresh(_t = i0.ɵɵloadQuery()) && (ctx.linksWithHrefs = _t);
    } }, inputs: { routerLinkActiveOptions: "routerLinkActiveOptions", routerLinkActive: "routerLinkActive" }, exportAs: ["routerLinkActive"], features: [i0.ɵɵNgOnChangesFeature] });
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RouterLinkActive, [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmtfYWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9kaXJlY3RpdmVzL3JvdXRlcl9saW5rX2FjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQW1CLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBd0IsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQWdCLE1BQU0sZUFBZSxDQUFDO0FBR3RMLE9BQU8sRUFBUSxhQUFhLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDL0MsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUVqQyxPQUFPLEVBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFDLE1BQU0sZUFBZSxDQUFDOzs7O0FBRzdEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBMERHO0FBS0gsTUFBTSxPQUFPLGdCQUFnQjtJQWEzQixZQUNZLE1BQWMsRUFBVSxPQUFtQixFQUFVLFFBQW1CLEVBQy9ELEdBQXNCLEVBQXNCLElBQWlCLEVBQzFELFlBQWlDO1FBRjdDLFdBQU0sR0FBTixNQUFNLENBQVE7UUFBVSxZQUFPLEdBQVAsT0FBTyxDQUFZO1FBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBVztRQUMvRCxRQUFHLEdBQUgsR0FBRyxDQUFtQjtRQUFzQixTQUFJLEdBQUosSUFBSSxDQUFhO1FBQzFELGlCQUFZLEdBQVosWUFBWSxDQUFxQjtRQVRqRCxZQUFPLEdBQWEsRUFBRSxDQUFDO1FBRWYsYUFBUSxHQUFZLEtBQUssQ0FBQztRQUVqQyw0QkFBdUIsR0FBcUIsRUFBQyxLQUFLLEVBQUUsS0FBSyxFQUFDLENBQUM7UUFNbEUsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsTUFB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LENBQUMsZUFBZSxDQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDcEYsQ0FBQzs7Z0ZBMUVVLGdCQUFnQjtxREFBaEIsZ0JBQWdCO29DQUVWLFVBQVU7b0NBRVYsa0JBQWtCOzs7Ozs7a0RBSnhCLGdCQUFnQjtjQUo1QixTQUFTO2VBQUM7Z0JBQ1QsUUFBUSxFQUFFLG9CQUFvQjtnQkFDOUIsUUFBUSxFQUFFLGtCQUFrQjthQUM3Qjs7c0JBZ0IrQyxRQUFROztzQkFDakQsUUFBUTt3QkFkcUMsS0FBSztrQkFBdEQsZUFBZTttQkFBQyxVQUFVLEVBQUUsRUFBQyxXQUFXLEVBQUUsSUFBSSxFQUFDO1lBR2hELGNBQWM7a0JBRGIsZUFBZTttQkFBQyxrQkFBa0IsRUFBRSxFQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUM7WUFPL0MsdUJBQXVCO2tCQUEvQixLQUFLO1lBcUJGLGdCQUFnQjtrQkFEbkIsS0FBSyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FmdGVyQ29udGVudEluaXQsIENoYW5nZURldGVjdG9yUmVmLCBDb250ZW50Q2hpbGRyZW4sIERpcmVjdGl2ZSwgRWxlbWVudFJlZiwgSW5wdXQsIE9uQ2hhbmdlcywgT25EZXN0cm95LCBPcHRpb25hbCwgUXVlcnlMaXN0LCBSZW5kZXJlcjIsIFNpbXBsZUNoYW5nZXN9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtTdWJzY3JpcHRpb259IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge0V2ZW50LCBOYXZpZ2F0aW9uRW5kfSBmcm9tICcuLi9ldmVudHMnO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJy4uL3JvdXRlcic7XG5cbmltcG9ydCB7Um91dGVyTGluaywgUm91dGVyTGlua1dpdGhIcmVmfSBmcm9tICcuL3JvdXRlcl9saW5rJztcblxuXG4vKipcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBUcmFja3Mgd2hldGhlciB0aGUgbGlua2VkIHJvdXRlIG9mIGFuIGVsZW1lbnQgaXMgY3VycmVudGx5IGFjdGl2ZSwgYW5kIGFsbG93cyB5b3VcbiAqIHRvIHNwZWNpZnkgb25lIG9yIG1vcmUgQ1NTIGNsYXNzZXMgdG8gYWRkIHRvIHRoZSBlbGVtZW50IHdoZW4gdGhlIGxpbmtlZCByb3V0ZVxuICogaXMgYWN0aXZlLlxuICpcbiAqIFVzZSB0aGlzIGRpcmVjdGl2ZSB0byBjcmVhdGUgYSB2aXN1YWwgZGlzdGluY3Rpb24gZm9yIGVsZW1lbnRzIGFzc29jaWF0ZWQgd2l0aCBhbiBhY3RpdmUgcm91dGUuXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGZvbGxvd2luZyBjb2RlIGhpZ2hsaWdodHMgdGhlIHdvcmQgXCJCb2JcIiB3aGVuIHRoZSB0aGUgcm91dGVyXG4gKiBhY3RpdmF0ZXMgdGhlIGFzc29jaWF0ZWQgcm91dGU6XG4gKlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZS1saW5rXCI+Qm9iPC9hPlxuICogYGBgXG4gKlxuICogV2hlbmV2ZXIgdGhlIFVSTCBpcyBlaXRoZXIgJy91c2VyJyBvciAnL3VzZXIvYm9iJywgdGhlIFwiYWN0aXZlLWxpbmtcIiBjbGFzcyBpc1xuICogYWRkZWQgdG8gdGhlIGFuY2hvciB0YWcuIElmIHRoZSBVUkwgY2hhbmdlcywgdGhlIGNsYXNzIGlzIHJlbW92ZWQuXG4gKlxuICogWW91IGNhbiBzZXQgbW9yZSB0aGFuIG9uZSBjbGFzcyB1c2luZyBhIHNwYWNlLXNlcGFyYXRlZCBzdHJpbmcgb3IgYW4gYXJyYXkuXG4gKiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiByb3V0ZXJMaW5rQWN0aXZlPVwiY2xhc3MxIGNsYXNzMlwiPkJvYjwvYT5cbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiBbcm91dGVyTGlua0FjdGl2ZV09XCJbJ2NsYXNzMScsICdjbGFzczInXVwiPkJvYjwvYT5cbiAqIGBgYFxuICpcbiAqIFRvIGFkZCB0aGUgY2xhc3NlcyBvbmx5IHdoZW4gdGhlIFVSTCBtYXRjaGVzIHRoZSBsaW5rIGV4YWN0bHksIGFkZCB0aGUgb3B0aW9uIGBleGFjdDogdHJ1ZWA6XG4gKlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZS1saW5rXCIgW3JvdXRlckxpbmtBY3RpdmVPcHRpb25zXT1cIntleGFjdDpcbiAqIHRydWV9XCI+Qm9iPC9hPlxuICogYGBgXG4gKlxuICogVG8gZGlyZWN0bHkgY2hlY2sgdGhlIGBpc0FjdGl2ZWAgc3RhdHVzIG9mIHRoZSBsaW5rLCBhc3NpZ24gdGhlIGBSb3V0ZXJMaW5rQWN0aXZlYFxuICogaW5zdGFuY2UgdG8gYSB0ZW1wbGF0ZSB2YXJpYWJsZS5cbiAqIEZvciBleGFtcGxlLCB0aGUgZm9sbG93aW5nIGNoZWNrcyB0aGUgc3RhdHVzIHdpdGhvdXQgYXNzaWduaW5nIGFueSBDU1MgY2xhc3NlczpcbiAqXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiByb3V0ZXJMaW5rQWN0aXZlICNybGE9XCJyb3V0ZXJMaW5rQWN0aXZlXCI+XG4gKiAgIEJvYiB7eyBybGEuaXNBY3RpdmUgPyAnKGFscmVhZHkgb3BlbiknIDogJyd9fVxuICogPC9hPlxuICogYGBgXG4gKlxuICogWW91IGNhbiBhcHBseSB0aGUgYFJvdXRlckxpbmtBY3RpdmVgIGRpcmVjdGl2ZSB0byBhbiBhbmNlc3RvciBvZiBsaW5rZWQgZWxlbWVudHMuXG4gKiBGb3IgZXhhbXBsZSwgdGhlIGZvbGxvd2luZyBzZXRzIHRoZSBhY3RpdmUtbGluayBjbGFzcyBvbiB0aGUgYDxkaXY+YCAgcGFyZW50IHRhZ1xuICogd2hlbiB0aGUgVVJMIGlzIGVpdGhlciAnL3VzZXIvamltJyBvciAnL3VzZXIvYm9iJy5cbiAqXG4gKiBgYGBcbiAqIDxkaXYgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZS1saW5rXCIgW3JvdXRlckxpbmtBY3RpdmVPcHRpb25zXT1cIntleGFjdDogdHJ1ZX1cIj5cbiAqICAgPGEgcm91dGVyTGluaz1cIi91c2VyL2ppbVwiPkppbTwvYT5cbiAqICAgPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiPkJvYjwvYT5cbiAqIDwvZGl2PlxuICogYGBgXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQERpcmVjdGl2ZSh7XG4gIHNlbGVjdG9yOiAnW3JvdXRlckxpbmtBY3RpdmVdJyxcbiAgZXhwb3J0QXM6ICdyb3V0ZXJMaW5rQWN0aXZlJyxcbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyTGlua0FjdGl2ZSBpbXBsZW1lbnRzIE9uQ2hhbmdlcywgT25EZXN0cm95LCBBZnRlckNvbnRlbnRJbml0IHtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBDb250ZW50Q2hpbGRyZW4oUm91dGVyTGluaywge2Rlc2NlbmRhbnRzOiB0cnVlfSkgbGlua3MhOiBRdWVyeUxpc3Q8Um91dGVyTGluaz47XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBAQ29udGVudENoaWxkcmVuKFJvdXRlckxpbmtXaXRoSHJlZiwge2Rlc2NlbmRhbnRzOiB0cnVlfSlcbiAgbGlua3NXaXRoSHJlZnMhOiBRdWVyeUxpc3Q8Um91dGVyTGlua1dpdGhIcmVmPjtcblxuICBwcml2YXRlIGNsYXNzZXM6IHN0cmluZ1tdID0gW107XG4gIHByaXZhdGUgc3Vic2NyaXB0aW9uOiBTdWJzY3JpcHRpb247XG4gIHB1YmxpYyByZWFkb25seSBpc0FjdGl2ZTogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIEBJbnB1dCgpIHJvdXRlckxpbmtBY3RpdmVPcHRpb25zOiB7ZXhhY3Q6IGJvb2xlYW59ID0ge2V4YWN0OiBmYWxzZX07XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLCBwcml2YXRlIGVsZW1lbnQ6IEVsZW1lbnRSZWYsIHByaXZhdGUgcmVuZGVyZXI6IFJlbmRlcmVyMixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY2RyOiBDaGFuZ2VEZXRlY3RvclJlZiwgQE9wdGlvbmFsKCkgcHJpdmF0ZSBsaW5rPzogUm91dGVyTGluayxcbiAgICAgIEBPcHRpb25hbCgpIHByaXZhdGUgbGlua1dpdGhIcmVmPzogUm91dGVyTGlua1dpdGhIcmVmKSB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb24gPSByb3V0ZXIuZXZlbnRzLnN1YnNjcmliZSgoczogRXZlbnQpID0+IHtcbiAgICAgIGlmIChzIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCkge1xuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ0FmdGVyQ29udGVudEluaXQoKTogdm9pZCB7XG4gICAgdGhpcy5saW5rcy5jaGFuZ2VzLnN1YnNjcmliZShfID0+IHRoaXMudXBkYXRlKCkpO1xuICAgIHRoaXMubGlua3NXaXRoSHJlZnMuY2hhbmdlcy5zdWJzY3JpYmUoXyA9PiB0aGlzLnVwZGF0ZSgpKTtcbiAgICB0aGlzLnVwZGF0ZSgpO1xuICB9XG5cbiAgQElucHV0KClcbiAgc2V0IHJvdXRlckxpbmtBY3RpdmUoZGF0YTogc3RyaW5nW118c3RyaW5nKSB7XG4gICAgY29uc3QgY2xhc3NlcyA9IEFycmF5LmlzQXJyYXkoZGF0YSkgPyBkYXRhIDogZGF0YS5zcGxpdCgnICcpO1xuICAgIHRoaXMuY2xhc3NlcyA9IGNsYXNzZXMuZmlsdGVyKGMgPT4gISFjKTtcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcyk6IHZvaWQge1xuICAgIHRoaXMudXBkYXRlKCk7XG4gIH1cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGUoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmxpbmtzIHx8ICF0aGlzLmxpbmtzV2l0aEhyZWZzIHx8ICF0aGlzLnJvdXRlci5uYXZpZ2F0ZWQpIHJldHVybjtcbiAgICBQcm9taXNlLnJlc29sdmUoKS50aGVuKCgpID0+IHtcbiAgICAgIGNvbnN0IGhhc0FjdGl2ZUxpbmtzID0gdGhpcy5oYXNBY3RpdmVMaW5rcygpO1xuICAgICAgaWYgKHRoaXMuaXNBY3RpdmUgIT09IGhhc0FjdGl2ZUxpbmtzKSB7XG4gICAgICAgICh0aGlzIGFzIGFueSkuaXNBY3RpdmUgPSBoYXNBY3RpdmVMaW5rcztcbiAgICAgICAgdGhpcy5jZHIubWFya0ZvckNoZWNrKCk7XG4gICAgICAgIHRoaXMuY2xhc3Nlcy5mb3JFYWNoKChjKSA9PiB7XG4gICAgICAgICAgaWYgKGhhc0FjdGl2ZUxpbmtzKSB7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcmVyLmFkZENsYXNzKHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LCBjKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJlci5yZW1vdmVDbGFzcyh0aGlzLmVsZW1lbnQubmF0aXZlRWxlbWVudCwgYyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgaXNMaW5rQWN0aXZlKHJvdXRlcjogUm91dGVyKTogKGxpbms6IChSb3V0ZXJMaW5rfFJvdXRlckxpbmtXaXRoSHJlZikpID0+IGJvb2xlYW4ge1xuICAgIHJldHVybiAobGluazogUm91dGVyTGlua3xSb3V0ZXJMaW5rV2l0aEhyZWYpID0+XG4gICAgICAgICAgICAgICByb3V0ZXIuaXNBY3RpdmUobGluay51cmxUcmVlLCB0aGlzLnJvdXRlckxpbmtBY3RpdmVPcHRpb25zLmV4YWN0KTtcbiAgfVxuXG4gIHByaXZhdGUgaGFzQWN0aXZlTGlua3MoKTogYm9vbGVhbiB7XG4gICAgY29uc3QgaXNBY3RpdmVDaGVja0ZuID0gdGhpcy5pc0xpbmtBY3RpdmUodGhpcy5yb3V0ZXIpO1xuICAgIHJldHVybiB0aGlzLmxpbmsgJiYgaXNBY3RpdmVDaGVja0ZuKHRoaXMubGluaykgfHxcbiAgICAgICAgdGhpcy5saW5rV2l0aEhyZWYgJiYgaXNBY3RpdmVDaGVja0ZuKHRoaXMubGlua1dpdGhIcmVmKSB8fFxuICAgICAgICB0aGlzLmxpbmtzLnNvbWUoaXNBY3RpdmVDaGVja0ZuKSB8fCB0aGlzLmxpbmtzV2l0aEhyZWZzLnNvbWUoaXNBY3RpdmVDaGVja0ZuKTtcbiAgfVxufVxuIl19