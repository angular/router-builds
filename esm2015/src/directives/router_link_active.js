/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
import { ChangeDetectorRef, ContentChildren, Directive, ElementRef, Input, QueryList, Renderer2 } from '@angular/core';
import { NavigationEnd } from '../events';
import { Router } from '../router';
import { RouterLink, RouterLinkWithHref } from './router_link';
/**
 *
 * @description
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
 * @ngModule RouterModule
 *
 *
 */
let RouterLinkActive = class RouterLinkActive {
    constructor(router, element, renderer, cdr) {
        this.router = router;
        this.element = element;
        this.renderer = renderer;
        this.cdr = cdr;
        this.classes = [];
        this.isActive = false;
        this.routerLinkActiveOptions = { exact: false };
        this.subscription = router.events.subscribe((s) => {
            if (s instanceof NavigationEnd) {
                this.update();
            }
        });
    }
    ngAfterContentInit() {
        this.links.changes.subscribe(_ => this.update());
        this.linksWithHrefs.changes.subscribe(_ => this.update());
        this.update();
    }
    set routerLinkActive(data) {
        const classes = Array.isArray(data) ? data : data.split(' ');
        this.classes = classes.filter(c => !!c);
    }
    ngOnChanges(changes) { this.update(); }
    ngOnDestroy() { this.subscription.unsubscribe(); }
    update() {
        if (!this.links || !this.linksWithHrefs || !this.router.navigated)
            return;
        Promise.resolve().then(() => {
            const hasActiveLinks = this.hasActiveLinks();
            if (this.isActive !== hasActiveLinks) {
                this.isActive = hasActiveLinks;
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
        return this.links.some(this.isLinkActive(this.router)) ||
            this.linksWithHrefs.some(this.isLinkActive(this.router));
    }
};
tslib_1.__decorate([
    ContentChildren(RouterLink, { descendants: true }),
    tslib_1.__metadata("design:type", QueryList)
], RouterLinkActive.prototype, "links", void 0);
tslib_1.__decorate([
    ContentChildren(RouterLinkWithHref, { descendants: true }),
    tslib_1.__metadata("design:type", QueryList)
], RouterLinkActive.prototype, "linksWithHrefs", void 0);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", Object)
], RouterLinkActive.prototype, "routerLinkActiveOptions", void 0);
tslib_1.__decorate([
    Input(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], RouterLinkActive.prototype, "routerLinkActive", null);
RouterLinkActive = tslib_1.__decorate([
    Directive({
        selector: '[routerLinkActive]',
        exportAs: 'routerLinkActive',
    }),
    tslib_1.__metadata("design:paramtypes", [Router, ElementRef, Renderer2,
        ChangeDetectorRef])
], RouterLinkActive);
export { RouterLinkActive };

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmtfYWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9kaXJlY3RpdmVzL3JvdXRlcl9saW5rX2FjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7O0FBRUgsT0FBTyxFQUFtQixpQkFBaUIsRUFBRSxlQUFlLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQXdCLFNBQVMsRUFBRSxTQUFTLEVBQWdCLE1BQU0sZUFBZSxDQUFDO0FBRzVLLE9BQU8sRUFBQyxhQUFhLEVBQWMsTUFBTSxXQUFXLENBQUM7QUFDckQsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUVqQyxPQUFPLEVBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFDLE1BQU0sZUFBZSxDQUFDO0FBRzdEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXdERztBQUtILElBQWEsZ0JBQWdCLEdBQTdCLE1BQWEsZ0JBQWdCO0lBZTNCLFlBQ1ksTUFBYyxFQUFVLE9BQW1CLEVBQVUsUUFBbUIsRUFDeEUsR0FBc0I7UUFEdEIsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUFVLFlBQU8sR0FBUCxPQUFPLENBQVk7UUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFXO1FBQ3hFLFFBQUcsR0FBSCxHQUFHLENBQW1CO1FBUjFCLFlBQU8sR0FBYSxFQUFFLENBQUM7UUFFZixhQUFRLEdBQVksS0FBSyxDQUFDO1FBRWpDLDRCQUF1QixHQUFxQixFQUFDLEtBQUssRUFBRSxLQUFLLEVBQUMsQ0FBQztRQUtsRSxJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBYyxFQUFFLEVBQUU7WUFDN0QsSUFBSSxDQUFDLFlBQVksYUFBYSxFQUFFO2dCQUM5QixJQUFJ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S0FBSyxFQUFFOztpRUFBNEQ7QUFvQnBFO0lBREMsS0FBSyxFQUFFOzs7d0RBSVA7QUFwQ1UsZ0JBQWdCO0lBSjVCLFNBQVMsQ0FBQztRQUNULFFBQVEsRUFBRSxvQkFBb0I7UUFDOUIsUUFBUSxFQUFFLGtCQUFrQjtLQUM3QixDQUFDOzZDQWlCb0IsTUFBTSxFQUFtQixVQUFVLEVBQW9CLFNBQVM7UUFDbkUsaUJBQWlCO0dBakJ2QixnQkFBZ0IsQ0FtRTVCO1NBbkVZLGdCQUFnQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBZnRlckNvbnRlbnRJbml0LCBDaGFuZ2VEZXRlY3RvclJlZiwgQ29udGVudENoaWxkcmVuLCBEaXJlY3RpdmUsIEVsZW1lbnRSZWYsIElucHV0LCBPbkNoYW5nZXMsIE9uRGVzdHJveSwgUXVlcnlMaXN0LCBSZW5kZXJlcjIsIFNpbXBsZUNoYW5nZXN9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtTdWJzY3JpcHRpb259IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge05hdmlnYXRpb25FbmQsIFJvdXRlckV2ZW50fSBmcm9tICcuLi9ldmVudHMnO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJy4uL3JvdXRlcic7XG5cbmltcG9ydCB7Um91dGVyTGluaywgUm91dGVyTGlua1dpdGhIcmVmfSBmcm9tICcuL3JvdXRlcl9saW5rJztcblxuXG4vKipcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBMZXRzIHlvdSBhZGQgYSBDU1MgY2xhc3MgdG8gYW4gZWxlbWVudCB3aGVuIHRoZSBsaW5rJ3Mgcm91dGUgYmVjb21lcyBhY3RpdmUuXG4gKlxuICogVGhpcyBkaXJlY3RpdmUgbGV0cyB5b3UgYWRkIGEgQ1NTIGNsYXNzIHRvIGFuIGVsZW1lbnQgd2hlbiB0aGUgbGluaydzIHJvdXRlXG4gKiBiZWNvbWVzIGFjdGl2ZS5cbiAqXG4gKiBDb25zaWRlciB0aGUgZm9sbG93aW5nIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZS1saW5rXCI+Qm9iPC9hPlxuICogYGBgXG4gKlxuICogV2hlbiB0aGUgdXJsIGlzIGVpdGhlciAnL3VzZXInIG9yICcvdXNlci9ib2InLCB0aGUgYWN0aXZlLWxpbmsgY2xhc3Mgd2lsbFxuICogYmUgYWRkZWQgdG8gdGhlIGBhYCB0YWcuIElmIHRoZSB1cmwgY2hhbmdlcywgdGhlIGNsYXNzIHdpbGwgYmUgcmVtb3ZlZC5cbiAqXG4gKiBZb3UgY2FuIHNldCBtb3JlIHRoYW4gb25lIGNsYXNzLCBhcyBmb2xsb3dzOlxuICpcbiAqIGBgYFxuICogPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiIHJvdXRlckxpbmtBY3RpdmU9XCJjbGFzczEgY2xhc3MyXCI+Qm9iPC9hPlxuICogPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiIFtyb3V0ZXJMaW5rQWN0aXZlXT1cIlsnY2xhc3MxJywgJ2NsYXNzMiddXCI+Qm9iPC9hPlxuICogYGBgXG4gKlxuICogWW91IGNhbiBjb25maWd1cmUgUm91dGVyTGlua0FjdGl2ZSBieSBwYXNzaW5nIGBleGFjdDogdHJ1ZWAuIFRoaXMgd2lsbCBhZGQgdGhlIGNsYXNzZXNcbiAqIG9ubHkgd2hlbiB0aGUgdXJsIG1hdGNoZXMgdGhlIGxpbmsgZXhhY3RseS5cbiAqXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiByb3V0ZXJMaW5rQWN0aXZlPVwiYWN0aXZlLWxpbmtcIiBbcm91dGVyTGlua0FjdGl2ZU9wdGlvbnNdPVwie2V4YWN0OlxuICogdHJ1ZX1cIj5Cb2I8L2E+XG4gKiBgYGBcbiAqXG4gKiBZb3UgY2FuIGFzc2lnbiB0aGUgUm91dGVyTGlua0FjdGl2ZSBpbnN0YW5jZSB0byBhIHRlbXBsYXRlIHZhcmlhYmxlIGFuZCBkaXJlY3RseSBjaGVja1xuICogdGhlIGBpc0FjdGl2ZWAgc3RhdHVzLlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZSAjcmxhPVwicm91dGVyTGlua0FjdGl2ZVwiPlxuICogICBCb2Ige3sgcmxhLmlzQWN0aXZlID8gJyhhbHJlYWR5IG9wZW4pJyA6ICcnfX1cbiAqIDwvYT5cbiAqIGBgYFxuICpcbiAqIEZpbmFsbHksIHlvdSBjYW4gYXBwbHkgdGhlIFJvdXRlckxpbmtBY3RpdmUgZGlyZWN0aXZlIHRvIGFuIGFuY2VzdG9yIG9mIGEgUm91dGVyTGluay5cbiAqXG4gKiBgYGBcbiAqIDxkaXYgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZS1saW5rXCIgW3JvdXRlckxpbmtBY3RpdmVPcHRpb25zXT1cIntleGFjdDogdHJ1ZX1cIj5cbiAqICAgPGEgcm91dGVyTGluaz1cIi91c2VyL2ppbVwiPkppbTwvYT5cbiAqICAgPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiPkJvYjwvYT5cbiAqIDwvZGl2PlxuICogYGBgXG4gKlxuICogVGhpcyB3aWxsIHNldCB0aGUgYWN0aXZlLWxpbmsgY2xhc3Mgb24gdGhlIGRpdiB0YWcgaWYgdGhlIHVybCBpcyBlaXRoZXIgJy91c2VyL2ppbScgb3JcbiAqICcvdXNlci9ib2InLlxuICpcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKlxuICovXG5ARGlyZWN0aXZlKHtcbiAgc2VsZWN0b3I6ICdbcm91dGVyTGlua0FjdGl2ZV0nLFxuICBleHBvcnRBczogJ3JvdXRlckxpbmtBY3RpdmUnLFxufSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJMaW5rQWN0aXZlIGltcGxlbWVudHMgT25DaGFuZ2VzLFxuICAgIE9uRGVzdHJveSwgQWZ0ZXJDb250ZW50SW5pdCB7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBAQ29udGVudENoaWxkcmVuKFJvdXRlckxpbmssIHtkZXNjZW5kYW50czogdHJ1ZX0pXG4gIGxpbmtzICE6IFF1ZXJ5TGlzdDxSb3V0ZXJMaW5rPjtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBDb250ZW50Q2hpbGRyZW4oUm91dGVyTGlua1dpdGhIcmVmLCB7ZGVzY2VuZGFudHM6IHRydWV9KVxuICBsaW5rc1dpdGhIcmVmcyAhOiBRdWVyeUxpc3Q8Um91dGVyTGlua1dpdGhIcmVmPjtcblxuICBwcml2YXRlIGNsYXNzZXM6IHN0cmluZ1tdID0gW107XG4gIHByaXZhdGUgc3Vic2NyaXB0aW9uOiBTdWJzY3JpcHRpb247XG4gIHB1YmxpYyByZWFkb25seSBpc0FjdGl2ZTogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIEBJbnB1dCgpIHJvdXRlckxpbmtBY3RpdmVPcHRpb25zOiB7ZXhhY3Q6IGJvb2xlYW59ID0ge2V4YWN0OiBmYWxzZX07XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLCBwcml2YXRlIGVsZW1lbnQ6IEVsZW1lbnRSZWYsIHByaXZhdGUgcmVuZGVyZXI6IFJlbmRlcmVyMixcbiAgICAgIHByaXZhdGUgY2RyOiBDaGFuZ2VEZXRlY3RvclJlZikge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9uID0gcm91dGVyLmV2ZW50cy5zdWJzY3JpYmUoKHM6IFJvdXRlckV2ZW50KSA9PiB7XG4gICAgICBpZiAocyBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpIHtcbiAgICAgICAgdGhpcy51cGRhdGUoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG5cbiAgbmdBZnRlckNvbnRlbnRJbml0KCk6IHZvaWQge1xuICAgIHRoaXMubGlua3MuY2hhbmdlcy5zdWJzY3JpYmUoXyA9PiB0aGlzLnVwZGF0ZSgpKTtcbiAgICB0aGlzLmxpbmtzV2l0aEhyZWZzLmNoYW5nZXMuc3Vic2NyaWJlKF8gPT4gdGhpcy51cGRhdGUoKSk7XG4gICAgdGhpcy51cGRhdGUoKTtcbiAgfVxuXG4gIEBJbnB1dCgpXG4gIHNldCByb3V0ZXJMaW5rQWN0aXZlKGRhdGE6IHN0cmluZ1tdfHN0cmluZykge1xuICAgIGNvbnN0IGNsYXNzZXMgPSBBcnJheS5pc0FycmF5KGRhdGEpID8gZGF0YSA6IGRhdGEuc3BsaXQoJyAnKTtcbiAgICB0aGlzLmNsYXNzZXMgPSBjbGFzc2VzLmZpbHRlcihjID0+ICEhYyk7XG4gIH1cblxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKTogdm9pZCB7IHRoaXMudXBkYXRlKCk7IH1cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7IHRoaXMuc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7IH1cblxuICBwcml2YXRlIHVwZGF0ZSgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMubGlua3MgfHwgIXRoaXMubGlua3NXaXRoSHJlZnMgfHwgIXRoaXMucm91dGVyLm5hdmlnYXRlZCkgcmV0dXJuO1xuICAgIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oKCkgPT4ge1xuICAgICAgY29uc3QgaGFzQWN0aXZlTGlua3MgPSB0aGlzLmhhc0FjdGl2ZUxpbmtzKCk7XG4gICAgICBpZiAodGhpcy5pc0FjdGl2ZSAhPT0gaGFzQWN0aXZlTGlua3MpIHtcbiAgICAgICAgKHRoaXMgYXMgYW55KS5pc0FjdGl2ZSA9IGhhc0FjdGl2ZUxpbmtzO1xuICAgICAgICB0aGlzLmNsYXNzZXMuZm9yRWFjaCgoYykgPT4ge1xuICAgICAgICAgIGlmIChoYXNBY3RpdmVMaW5rcykge1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJlci5hZGRDbGFzcyh0aGlzLmVsZW1lbnQubmF0aXZlRWxlbWVudCwgYyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyZXIucmVtb3ZlQ2xhc3ModGhpcy5lbGVtZW50Lm5hdGl2ZUVsZW1lbnQsIGMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGlzTGlua0FjdGl2ZShyb3V0ZXI6IFJvdXRlcik6IChsaW5rOiAoUm91dGVyTGlua3xSb3V0ZXJMaW5rV2l0aEhyZWYpKSA9PiBib29sZWFuIHtcbiAgICByZXR1cm4gKGxpbms6IFJvdXRlckxpbmsgfCBSb3V0ZXJMaW5rV2l0aEhyZWYpID0+XG4gICAgICAgICAgICAgICByb3V0ZXIuaXNBY3RpdmUobGluay51cmxUcmVlLCB0aGlzLnJvdXRlckxpbmtBY3RpdmVPcHRpb25zLmV4YWN0KTtcbiAgfVxuXG4gIHByaXZhdGUgaGFzQWN0aXZlTGlua3MoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMubGlua3Muc29tZSh0aGlzLmlzTGlua0FjdGl2ZSh0aGlzLnJvdXRlcikpIHx8XG4gICAgICAgIHRoaXMubGlua3NXaXRoSHJlZnMuc29tZSh0aGlzLmlzTGlua0FjdGl2ZSh0aGlzLnJvdXRlcikpO1xuICB9XG59XG4iXX0=