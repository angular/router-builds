/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ChangeDetectorRef, ContentChildren, Directive, ElementRef, Input, QueryList, Renderer2 } from '@angular/core';
import { NavigationEnd } from '../events';
import { Router } from '../router';
import { RouterLink, RouterLinkWithHref } from './router_link';
import * as i0 from "@angular/core";
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
 * @publicApi
 */
var RouterLinkActive = /** @class */ (function () {
    function RouterLinkActive(router, element, renderer, cdr) {
        var _this = this;
        this.router = router;
        this.element = element;
        this.renderer = renderer;
        this.cdr = cdr;
        this.classes = [];
        this.isActive = false;
        this.routerLinkActiveOptions = { exact: false };
        this.subscription = router.events.subscribe(function (s) {
            if (s instanceof NavigationEnd) {
                _this.update();
            }
        });
    }
    RouterLinkActive.prototype.ngAfterContentInit = function () {
        var _this = this;
        this.links.changes.subscribe(function (_) { return _this.update(); });
        this.linksWithHrefs.changes.subscribe(function (_) { return _this.update(); });
        this.update();
    };
    Object.defineProperty(RouterLinkActive.prototype, "routerLinkActive", {
        set: function (data) {
            var classes = Array.isArray(data) ? data : data.split(' ');
            this.classes = classes.filter(function (c) { return !!c; });
        },
        enumerable: true,
        configurable: true
    });
    RouterLinkActive.prototype.ngOnChanges = function (changes) { this.update(); };
    RouterLinkActive.prototype.ngOnDestroy = function () { this.subscription.unsubscribe(); };
    RouterLinkActive.prototype.update = function () {
        var _this = this;
        if (!this.links || !this.linksWithHrefs || !this.router.navigated)
            return;
        Promise.resolve().then(function () {
            var hasActiveLinks = _this.hasActiveLinks();
            if (_this.isActive !== hasActiveLinks) {
                _this.isActive = hasActiveLinks;
                _this.classes.forEach(function (c) {
                    if (hasActiveLinks) {
                        _this.renderer.addClass(_this.element.nativeElement, c);
                    }
                    else {
                        _this.renderer.removeClass(_this.element.nativeElement, c);
                    }
                });
            }
        });
    };
    RouterLinkActive.prototype.isLinkActive = function (router) {
        var _this = this;
        return function (link) {
            return router.isActive(link.urlTree, _this.routerLinkActiveOptions.exact);
        };
    };
    RouterLinkActive.prototype.hasActiveLinks = function () {
        return this.links.some(this.isLinkActive(this.router)) ||
            this.linksWithHrefs.some(this.isLinkActive(this.router));
    };
    RouterLinkActive.ngDirectiveDef = i0.ɵdefineDirective({ type: RouterLinkActive, selectors: [["", "routerLinkActive", ""]], factory: function RouterLinkActive_Factory(t) { return new (t || RouterLinkActive)(i0.ɵdirectiveInject(Router), i0.ɵdirectiveInject(ElementRef), i0.ɵdirectiveInject(Renderer2), i0.ɵdirectiveInject(ChangeDetectorRef)); }, contentQueries: function RouterLinkActive_ContentQueries(dirIndex) { i0.ɵregisterContentQuery(i0.ɵquery(null, RouterLink, true), dirIndex); i0.ɵregisterContentQuery(i0.ɵquery(null, RouterLinkWithHref, true), dirIndex); }, contentQueriesRefresh: function RouterLinkActive_ContentQueriesRefresh(dirIndex, queryStartIndex) { var instance = i0.ɵload(dirIndex); var _t; (i0.ɵqueryRefresh((_t = i0.ɵloadQueryList(queryStartIndex))) && (instance.links = _t)); (i0.ɵqueryRefresh((_t = i0.ɵloadQueryList((queryStartIndex + 1)))) && (instance.linksWithHrefs = _t)); }, inputs: { routerLinkActiveOptions: "routerLinkActiveOptions", routerLinkActive: "routerLinkActive" }, exportAs: "routerLinkActive", features: [i0.ɵNgOnChangesFeature] });
    return RouterLinkActive;
}());
export { RouterLinkActive };
/*@__PURE__*/ i0.ɵsetClassMetadata(RouterLinkActive, [{
        type: Directive,
        args: [{
                selector: '[routerLinkActive]',
                exportAs: 'routerLinkActive',
            }]
    }], function () { return [{
        type: Router
    }, {
        type: ElementRef
    }, {
        type: Renderer2
    }, {
        type: ChangeDetectorRef
    }]; }, { links: [{
            type: ContentChildren,
            args: [RouterLink, { descendants: true }]
        }], linksWithHrefs: [{
            type: ContentChildren,
            args: [RouterLinkWithHref, { descendants: true }]
        }], routerLinkActiveOptions: [{
            type: Input
        }], routerLinkActive: [{
            type: Input
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmtfYWN0aXZlLmpzIiwic291cmNlUm9vdCI6Ii4uLy4uLyIsInNvdXJjZXMiOlsicGFja2FnZXMvcm91dGVyL3NyYy9kaXJlY3RpdmVzL3JvdXRlcl9saW5rX2FjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQW1CLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBd0IsU0FBUyxFQUFFLFNBQVMsRUFBZ0IsTUFBTSxlQUFlLENBQUM7QUFHNUssT0FBTyxFQUFDLGFBQWEsRUFBYyxNQUFNLFdBQVcsQ0FBQztBQUNyRCxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBRWpDLE9BQU8sRUFBQyxVQUFVLEVBQUUsa0JBQWtCLEVBQUMsTUFBTSxlQUFlLENBQUM7O0FBRzdEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXdERztBQUNIO0lBbUJFLDBCQUNZLE1BQWMsRUFBVSxPQUFtQixFQUFVLFFBQW1CLEVBQ3hFLEdBQXNCO1FBRmxDLGlCQVFDO1FBUFcsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUFVLFlBQU8sR0FBUCxPQUFPLENBQVk7UUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFXO1FBQ3hFLFFBQUcsR0FBSCxHQUFHLENBQW1CO1FBUjFCLFlBQU8sR0FBYSxFQUFFLENBQUM7UUFFZixhQUFRLEdBQVksS0FBSyxDQUFDO1FBRWpDLDRCQUF1QixHQUFxQixFQUFDLEtBQUssRUFBRSxLQUFLLEVBQUMsQ0FBQztRQUtsRSxJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQUMsQ0FBYztZQUN6RCxJQUFJLENBQUMsWUFBWSxhQUFhLEVBQUU7Z0JBQzlCLEtBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUNmO1FBQ0gsQ0FBQyxDQUFDLENB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LElBdUVDO1NBbkVZLGdCQUFnQjttQ0FBaEIsZ0JBQWdCO2NBSjVCLFNBQVM7ZUFBQztnQkFDVCxRQUFRLEVBQUUsb0JBQW9CO2dCQUM5QixRQUFRLEVBQUUsa0JBQWtCO2FBQzdCOztjQWlCcUIsTUFBTTs7Y0FBbUIsVUFBVTs7Y0FBb0IsU0FBUzs7Y0FDbkUsaUJBQWlCOztrQkFkakMsZUFBZTttQkFBQyxVQUFVLEVBQUUsRUFBQyxXQUFXLEVBQUUsSUFBSSxFQUFDOztrQkFHL0MsZUFBZTttQkFBQyxrQkFBa0IsRUFBRSxFQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUM7O2tCQU92RCxLQUFLOztrQkFtQkwsS0FBSyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBZnRlckNvbnRlbnRJbml0LCBDaGFuZ2VEZXRlY3RvclJlZiwgQ29udGVudENoaWxkcmVuLCBEaXJlY3RpdmUsIEVsZW1lbnRSZWYsIElucHV0LCBPbkNoYW5nZXMsIE9uRGVzdHJveSwgUXVlcnlMaXN0LCBSZW5kZXJlcjIsIFNpbXBsZUNoYW5nZXN9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtTdWJzY3JpcHRpb259IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge05hdmlnYXRpb25FbmQsIFJvdXRlckV2ZW50fSBmcm9tICcuLi9ldmVudHMnO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJy4uL3JvdXRlcic7XG5cbmltcG9ydCB7Um91dGVyTGluaywgUm91dGVyTGlua1dpdGhIcmVmfSBmcm9tICcuL3JvdXRlcl9saW5rJztcblxuXG4vKipcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBMZXRzIHlvdSBhZGQgYSBDU1MgY2xhc3MgdG8gYW4gZWxlbWVudCB3aGVuIHRoZSBsaW5rJ3Mgcm91dGUgYmVjb21lcyBhY3RpdmUuXG4gKlxuICogVGhpcyBkaXJlY3RpdmUgbGV0cyB5b3UgYWRkIGEgQ1NTIGNsYXNzIHRvIGFuIGVsZW1lbnQgd2hlbiB0aGUgbGluaydzIHJvdXRlXG4gKiBiZWNvbWVzIGFjdGl2ZS5cbiAqXG4gKiBDb25zaWRlciB0aGUgZm9sbG93aW5nIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZS1saW5rXCI+Qm9iPC9hPlxuICogYGBgXG4gKlxuICogV2hlbiB0aGUgdXJsIGlzIGVpdGhlciAnL3VzZXInIG9yICcvdXNlci9ib2InLCB0aGUgYWN0aXZlLWxpbmsgY2xhc3Mgd2lsbFxuICogYmUgYWRkZWQgdG8gdGhlIGBhYCB0YWcuIElmIHRoZSB1cmwgY2hhbmdlcywgdGhlIGNsYXNzIHdpbGwgYmUgcmVtb3ZlZC5cbiAqXG4gKiBZb3UgY2FuIHNldCBtb3JlIHRoYW4gb25lIGNsYXNzLCBhcyBmb2xsb3dzOlxuICpcbiAqIGBgYFxuICogPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiIHJvdXRlckxpbmtBY3RpdmU9XCJjbGFzczEgY2xhc3MyXCI+Qm9iPC9hPlxuICogPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiIFtyb3V0ZXJMaW5rQWN0aXZlXT1cIlsnY2xhc3MxJywgJ2NsYXNzMiddXCI+Qm9iPC9hPlxuICogYGBgXG4gKlxuICogWW91IGNhbiBjb25maWd1cmUgUm91dGVyTGlua0FjdGl2ZSBieSBwYXNzaW5nIGBleGFjdDogdHJ1ZWAuIFRoaXMgd2lsbCBhZGQgdGhlIGNsYXNzZXNcbiAqIG9ubHkgd2hlbiB0aGUgdXJsIG1hdGNoZXMgdGhlIGxpbmsgZXhhY3RseS5cbiAqXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiByb3V0ZXJMaW5rQWN0aXZlPVwiYWN0aXZlLWxpbmtcIiBbcm91dGVyTGlua0FjdGl2ZU9wdGlvbnNdPVwie2V4YWN0OlxuICogdHJ1ZX1cIj5Cb2I8L2E+XG4gKiBgYGBcbiAqXG4gKiBZb3UgY2FuIGFzc2lnbiB0aGUgUm91dGVyTGlua0FjdGl2ZSBpbnN0YW5jZSB0byBhIHRlbXBsYXRlIHZhcmlhYmxlIGFuZCBkaXJlY3RseSBjaGVja1xuICogdGhlIGBpc0FjdGl2ZWAgc3RhdHVzLlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZSAjcmxhPVwicm91dGVyTGlua0FjdGl2ZVwiPlxuICogICBCb2Ige3sgcmxhLmlzQWN0aXZlID8gJyhhbHJlYWR5IG9wZW4pJyA6ICcnfX1cbiAqIDwvYT5cbiAqIGBgYFxuICpcbiAqIEZpbmFsbHksIHlvdSBjYW4gYXBwbHkgdGhlIFJvdXRlckxpbmtBY3RpdmUgZGlyZWN0aXZlIHRvIGFuIGFuY2VzdG9yIG9mIGEgUm91dGVyTGluay5cbiAqXG4gKiBgYGBcbiAqIDxkaXYgcm91dGVyTGlua0FjdGl2ZT1cImFjdGl2ZS1saW5rXCIgW3JvdXRlckxpbmtBY3RpdmVPcHRpb25zXT1cIntleGFjdDogdHJ1ZX1cIj5cbiAqICAgPGEgcm91dGVyTGluaz1cIi91c2VyL2ppbVwiPkppbTwvYT5cbiAqICAgPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiPkJvYjwvYT5cbiAqIDwvZGl2PlxuICogYGBgXG4gKlxuICogVGhpcyB3aWxsIHNldCB0aGUgYWN0aXZlLWxpbmsgY2xhc3Mgb24gdGhlIGRpdiB0YWcgaWYgdGhlIHVybCBpcyBlaXRoZXIgJy91c2VyL2ppbScgb3JcbiAqICcvdXNlci9ib2InLlxuICpcbiAqIEBuZ01vZHVsZSBSb3V0ZXJNb2R1bGVcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBEaXJlY3RpdmUoe1xuICBzZWxlY3RvcjogJ1tyb3V0ZXJMaW5rQWN0aXZlXScsXG4gIGV4cG9ydEFzOiAncm91dGVyTGlua0FjdGl2ZScsXG59KVxuZXhwb3J0IGNsYXNzIFJvdXRlckxpbmtBY3RpdmUgaW1wbGVtZW50cyBPbkNoYW5nZXMsXG4gICAgT25EZXN0cm95LCBBZnRlckNvbnRlbnRJbml0IHtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIEBDb250ZW50Q2hpbGRyZW4oUm91dGVyTGluaywge2Rlc2NlbmRhbnRzOiB0cnVlfSlcbiAgbGlua3MgITogUXVlcnlMaXN0PFJvdXRlckxpbms+O1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQENvbnRlbnRDaGlsZHJlbihSb3V0ZXJMaW5rV2l0aEhyZWYsIHtkZXNjZW5kYW50czogdHJ1ZX0pXG4gIGxpbmtzV2l0aEhyZWZzICE6IFF1ZXJ5TGlzdDxSb3V0ZXJMaW5rV2l0aEhyZWY+O1xuXG4gIHByaXZhdGUgY2xhc3Nlczogc3RyaW5nW10gPSBbXTtcbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvbjtcbiAgcHVibGljIHJlYWRvbmx5IGlzQWN0aXZlOiBib29sZWFuID0gZmFsc2U7XG5cbiAgQElucHV0KCkgcm91dGVyTGlua0FjdGl2ZU9wdGlvbnM6IHtleGFjdDogYm9vbGVhbn0gPSB7ZXhhY3Q6IGZhbHNlfTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsIHByaXZhdGUgZWxlbWVudDogRWxlbWVudFJlZiwgcHJpdmF0ZSByZW5kZXJlcjogUmVuZGVyZXIyLFxuICAgICAgcHJpdmF0ZSBjZHI6IENoYW5nZURldGVjdG9yUmVmKSB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb24gPSByb3V0ZXIuZXZlbnRzLnN1YnNjcmliZSgoczogUm91dGVyRXZlbnQpID0+IHtcbiAgICAgIGlmIChzIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCkge1xuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cblxuICBuZ0FmdGVyQ29udGVudEluaXQoKTogdm9pZCB7XG4gICAgdGhpcy5saW5rcy5jaGFuZ2VzLnN1YnNjcmliZShfID0+IHRoaXMudXBkYXRlKCkpO1xuICAgIHRoaXMubGlua3NXaXRoSHJlZnMuY2hhbmdlcy5zdWJzY3JpYmUoXyA9PiB0aGlzLnVwZGF0ZSgpKTtcbiAgICB0aGlzLnVwZGF0ZSgpO1xuICB9XG5cbiAgQElucHV0KClcbiAgc2V0IHJvdXRlckxpbmtBY3RpdmUoZGF0YTogc3RyaW5nW118c3RyaW5nKSB7XG4gICAgY29uc3QgY2xhc3NlcyA9IEFycmF5LmlzQXJyYXkoZGF0YSkgPyBkYXRhIDogZGF0YS5zcGxpdCgnICcpO1xuICAgIHRoaXMuY2xhc3NlcyA9IGNsYXNzZXMuZmlsdGVyKGMgPT4gISFjKTtcbiAgfVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpOiB2b2lkIHsgdGhpcy51cGRhdGUoKTsgfVxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHsgdGhpcy5zdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTsgfVxuXG4gIHByaXZhdGUgdXBkYXRlKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5saW5rcyB8fCAhdGhpcy5saW5rc1dpdGhIcmVmcyB8fCAhdGhpcy5yb3V0ZXIubmF2aWdhdGVkKSByZXR1cm47XG4gICAgUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG4gICAgICBjb25zdCBoYXNBY3RpdmVMaW5rcyA9IHRoaXMuaGFzQWN0aXZlTGlua3MoKTtcbiAgICAgIGlmICh0aGlzLmlzQWN0aXZlICE9PSBoYXNBY3RpdmVMaW5rcykge1xuICAgICAgICAodGhpcyBhcyBhbnkpLmlzQWN0aXZlID0gaGFzQWN0aXZlTGlua3M7XG4gICAgICAgIHRoaXMuY2xhc3Nlcy5mb3JFYWNoKChjKSA9PiB7XG4gICAgICAgICAgaWYgKGhhc0FjdGl2ZUxpbmtzKSB7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcmVyLmFkZENsYXNzKHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LCBjKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJlci5yZW1vdmVDbGFzcyh0aGlzLmVsZW1lbnQubmF0aXZlRWxlbWVudCwgYyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgaXNMaW5rQWN0aXZlKHJvdXRlcjogUm91dGVyKTogKGxpbms6IChSb3V0ZXJMaW5rfFJvdXRlckxpbmtXaXRoSHJlZikpID0+IGJvb2xlYW4ge1xuICAgIHJldHVybiAobGluazogUm91dGVyTGluayB8IFJvdXRlckxpbmtXaXRoSHJlZikgPT5cbiAgICAgICAgICAgICAgIHJvdXRlci5pc0FjdGl2ZShsaW5rLnVybFRyZWUsIHRoaXMucm91dGVyTGlua0FjdGl2ZU9wdGlvbnMuZXhhY3QpO1xuICB9XG5cbiAgcHJpdmF0ZSBoYXNBY3RpdmVMaW5rcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5saW5rcy5zb21lKHRoaXMuaXNMaW5rQWN0aXZlKHRoaXMucm91dGVyKSkgfHxcbiAgICAgICAgdGhpcy5saW5rc1dpdGhIcmVmcy5zb21lKHRoaXMuaXNMaW5rQWN0aXZlKHRoaXMucm91dGVyKSk7XG4gIH1cbn1cbiJdfQ==