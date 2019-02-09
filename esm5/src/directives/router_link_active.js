/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ContentChildren, Directive, ElementRef, Input, Optional, QueryList, Renderer2 } from '@angular/core';
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
    function RouterLinkActive(router, element, renderer, link, linkWithHref) {
        var _this = this;
        this.router = router;
        this.element = element;
        this.renderer = renderer;
        this.link = link;
        this.linkWithHref = linkWithHref;
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
        var isActiveCheckFn = this.isLinkActive(this.router);
        return this.link && isActiveCheckFn(this.link) ||
            this.linkWithHref && isActiveCheckFn(this.linkWithHref) ||
            this.links.some(isActiveCheckFn) || this.linksWithHrefs.some(isActiveCheckFn);
    };
    RouterLinkActive.ngDirectiveDef = i0.ɵdefineDirective({ type: RouterLinkActive, selectors: [["", "routerLinkActive", ""]], factory: function RouterLinkActive_Factory(t) { return new (t || RouterLinkActive)(i0.ɵdirectiveInject(Router), i0.ɵdirectiveInject(ElementRef), i0.ɵdirectiveInject(Renderer2), i0.ɵdirectiveInject(RouterLink, 8), i0.ɵdirectiveInject(RouterLinkWithHref, 8)); }, contentQueries: function RouterLinkActive_ContentQueries(dirIndex) { i0.ɵcontentQuery(dirIndex, RouterLink, true); i0.ɵcontentQuery(dirIndex, RouterLinkWithHref, true); }, contentQueriesRefresh: function RouterLinkActive_ContentQueriesRefresh(dirIndex) { var instance = i0.ɵload(dirIndex); var _t; (i0.ɵqueryRefresh((_t = i0.ɵloadContentQuery())) && (instance.links = _t)); (i0.ɵqueryRefresh((_t = i0.ɵloadContentQuery())) && (instance.linksWithHrefs = _t)); }, inputs: { routerLinkActiveOptions: "routerLinkActiveOptions", routerLinkActive: "routerLinkActive" }, exportAs: ["routerLinkActive"], features: [i0.ɵNgOnChangesFeature()] });
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
        type: RouterLink,
        decorators: [{
                type: Optional
            }]
    }, {
        type: RouterLinkWithHref,
        decorators: [{
                type: Optional
            }]
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2xpbmtfYWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9kaXJlY3RpdmVzL3JvdXRlcl9saW5rX2FjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQW1CLGVBQWUsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBd0IsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQWdCLE1BQU0sZUFBZSxDQUFDO0FBR25LLE9BQU8sRUFBQyxhQUFhLEVBQWMsTUFBTSxXQUFXLENBQUM7QUFDckQsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUVqQyxPQUFPLEVBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFDLE1BQU0sZUFBZSxDQUFDOztBQUc3RDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0F3REc7QUFDSDtJQW1CRSwwQkFDWSxNQUFjLEVBQVUsT0FBbUIsRUFBVSxRQUFtQixFQUM1RCxJQUFpQixFQUNqQixZQUFpQztRQUh6RCxpQkFTQztRQVJXLFdBQU0sR0FBTixNQUFNLENBQVE7UUFBVSxZQUFPLEdBQVAsT0FBTyxDQUFZO1FBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBVztRQUM1RCxTQUFJLEdBQUosSUFBSSxDQUFhO1FBQ2pCLGlCQUFZLEdBQVosWUFBWSxDQUFxQjtRQVRqRCxZQUFPLEdBQWEsRUFBRSxDQUFDO1FBRWYsYUFBUSxHQUFZLEtBQUssQ0FBQztRQUVqQyw0QkFBdUIsR0FBcUIsRUFBQyxLQUFLLEVBQUUsS0FBSyxFQUFDLENBQUM7UUFNbEUsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFDLENBQWM7WUFDekQsSUFBSSxDQUFDLFlBQVksYUFB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Y0FBYyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNwRixDQUFDO2tFQXJFVSxnQkFBZ0IsOEdBQWhCLGdCQUFnQixzQkFnQlAsTUFBTSx1QkFBbUIsVUFBVSx1QkFBb0IsU0FBUyx1QkFDckQsVUFBVSwwQkFDRixrQkFBa0IsMEdBZnhDLFVBQVUsb0NBR1Ysa0JBQWtCOzJCQXBGckM7Q0FvSkMsQUExRUQsSUEwRUM7U0F0RVksZ0JBQWdCO21DQUFoQixnQkFBZ0I7Y0FKNUIsU0FBUztlQUFDO2dCQUNULFFBQVEsRUFBRSxvQkFBb0I7Z0JBQzlCLFFBQVEsRUFBRSxrQkFBa0I7YUFDN0I7O2NBaUJxQixNQUFNOztjQUFtQixVQUFVOztjQUFvQixTQUFTOztjQUNyRCxVQUFVOztzQkFBcEMsUUFBUTs7O2NBQzBCLGtCQUFrQjs7c0JBQXBELFFBQVE7OztrQkFmWixlQUFlO21CQUFDLFVBQVUsRUFBRSxFQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUM7O2tCQUcvQyxlQUFlO21CQUFDLGtCQUFrQixFQUFFLEVBQUMsV0FBVyxFQUFFLElBQUksRUFBQzs7a0JBT3ZELEtBQUs7O2tCQW9CTCxLQUFLIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FmdGVyQ29udGVudEluaXQsIENvbnRlbnRDaGlsZHJlbiwgRGlyZWN0aXZlLCBFbGVtZW50UmVmLCBJbnB1dCwgT25DaGFuZ2VzLCBPbkRlc3Ryb3ksIE9wdGlvbmFsLCBRdWVyeUxpc3QsIFJlbmRlcmVyMiwgU2ltcGxlQ2hhbmdlc30gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge1N1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7TmF2aWdhdGlvbkVuZCwgUm91dGVyRXZlbnR9IGZyb20gJy4uL2V2ZW50cyc7XG5pbXBvcnQge1JvdXRlcn0gZnJvbSAnLi4vcm91dGVyJztcblxuaW1wb3J0IHtSb3V0ZXJMaW5rLCBSb3V0ZXJMaW5rV2l0aEhyZWZ9IGZyb20gJy4vcm91dGVyX2xpbmsnO1xuXG5cbi8qKlxuICpcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIExldHMgeW91IGFkZCBhIENTUyBjbGFzcyB0byBhbiBlbGVtZW50IHdoZW4gdGhlIGxpbmsncyByb3V0ZSBiZWNvbWVzIGFjdGl2ZS5cbiAqXG4gKiBUaGlzIGRpcmVjdGl2ZSBsZXRzIHlvdSBhZGQgYSBDU1MgY2xhc3MgdG8gYW4gZWxlbWVudCB3aGVuIHRoZSBsaW5rJ3Mgcm91dGVcbiAqIGJlY29tZXMgYWN0aXZlLlxuICpcbiAqIENvbnNpZGVyIHRoZSBmb2xsb3dpbmcgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiByb3V0ZXJMaW5rQWN0aXZlPVwiYWN0aXZlLWxpbmtcIj5Cb2I8L2E+XG4gKiBgYGBcbiAqXG4gKiBXaGVuIHRoZSB1cmwgaXMgZWl0aGVyICcvdXNlcicgb3IgJy91c2VyL2JvYicsIHRoZSBhY3RpdmUtbGluayBjbGFzcyB3aWxsXG4gKiBiZSBhZGRlZCB0byB0aGUgYGFgIHRhZy4gSWYgdGhlIHVybCBjaGFuZ2VzLCB0aGUgY2xhc3Mgd2lsbCBiZSByZW1vdmVkLlxuICpcbiAqIFlvdSBjYW4gc2V0IG1vcmUgdGhhbiBvbmUgY2xhc3MsIGFzIGZvbGxvd3M6XG4gKlxuICogYGBgXG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgcm91dGVyTGlua0FjdGl2ZT1cImNsYXNzMSBjbGFzczJcIj5Cb2I8L2E+XG4gKiA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCIgW3JvdXRlckxpbmtBY3RpdmVdPVwiWydjbGFzczEnLCAnY2xhc3MyJ11cIj5Cb2I8L2E+XG4gKiBgYGBcbiAqXG4gKiBZb3UgY2FuIGNvbmZpZ3VyZSBSb3V0ZXJMaW5rQWN0aXZlIGJ5IHBhc3NpbmcgYGV4YWN0OiB0cnVlYC4gVGhpcyB3aWxsIGFkZCB0aGUgY2xhc3Nlc1xuICogb25seSB3aGVuIHRoZSB1cmwgbWF0Y2hlcyB0aGUgbGluayBleGFjdGx5LlxuICpcbiAqIGBgYFxuICogPGEgcm91dGVyTGluaz1cIi91c2VyL2JvYlwiIHJvdXRlckxpbmtBY3RpdmU9XCJhY3RpdmUtbGlua1wiIFtyb3V0ZXJMaW5rQWN0aXZlT3B0aW9uc109XCJ7ZXhhY3Q6XG4gKiB0cnVlfVwiPkJvYjwvYT5cbiAqIGBgYFxuICpcbiAqIFlvdSBjYW4gYXNzaWduIHRoZSBSb3V0ZXJMaW5rQWN0aXZlIGluc3RhbmNlIHRvIGEgdGVtcGxhdGUgdmFyaWFibGUgYW5kIGRpcmVjdGx5IGNoZWNrXG4gKiB0aGUgYGlzQWN0aXZlYCBzdGF0dXMuXG4gKiBgYGBcbiAqIDxhIHJvdXRlckxpbms9XCIvdXNlci9ib2JcIiByb3V0ZXJMaW5rQWN0aXZlICNybGE9XCJyb3V0ZXJMaW5rQWN0aXZlXCI+XG4gKiAgIEJvYiB7eyBybGEuaXNBY3RpdmUgPyAnKGFscmVhZHkgb3BlbiknIDogJyd9fVxuICogPC9hPlxuICogYGBgXG4gKlxuICogRmluYWxseSwgeW91IGNhbiBhcHBseSB0aGUgUm91dGVyTGlua0FjdGl2ZSBkaXJlY3RpdmUgdG8gYW4gYW5jZXN0b3Igb2YgYSBSb3V0ZXJMaW5rLlxuICpcbiAqIGBgYFxuICogPGRpdiByb3V0ZXJMaW5rQWN0aXZlPVwiYWN0aXZlLWxpbmtcIiBbcm91dGVyTGlua0FjdGl2ZU9wdGlvbnNdPVwie2V4YWN0OiB0cnVlfVwiPlxuICogICA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvamltXCI+SmltPC9hPlxuICogICA8YSByb3V0ZXJMaW5rPVwiL3VzZXIvYm9iXCI+Qm9iPC9hPlxuICogPC9kaXY+XG4gKiBgYGBcbiAqXG4gKiBUaGlzIHdpbGwgc2V0IHRoZSBhY3RpdmUtbGluayBjbGFzcyBvbiB0aGUgZGl2IHRhZyBpZiB0aGUgdXJsIGlzIGVpdGhlciAnL3VzZXIvamltJyBvclxuICogJy91c2VyL2JvYicuXG4gKlxuICogQG5nTW9kdWxlIFJvdXRlck1vZHVsZVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQERpcmVjdGl2ZSh7XG4gIHNlbGVjdG9yOiAnW3JvdXRlckxpbmtBY3RpdmVdJyxcbiAgZXhwb3J0QXM6ICdyb3V0ZXJMaW5rQWN0aXZlJyxcbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyTGlua0FjdGl2ZSBpbXBsZW1lbnRzIE9uQ2hhbmdlcyxcbiAgICBPbkRlc3Ryb3ksIEFmdGVyQ29udGVudEluaXQge1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgQENvbnRlbnRDaGlsZHJlbihSb3V0ZXJMaW5rLCB7ZGVzY2VuZGFudHM6IHRydWV9KVxuICBsaW5rcyAhOiBRdWVyeUxpc3Q8Um91dGVyTGluaz47XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBAQ29udGVudENoaWxkcmVuKFJvdXRlckxpbmtXaXRoSHJlZiwge2Rlc2NlbmRhbnRzOiB0cnVlfSlcbiAgbGlua3NXaXRoSHJlZnMgITogUXVlcnlMaXN0PFJvdXRlckxpbmtXaXRoSHJlZj47XG5cbiAgcHJpdmF0ZSBjbGFzc2VzOiBzdHJpbmdbXSA9IFtdO1xuICBwcml2YXRlIHN1YnNjcmlwdGlvbjogU3Vic2NyaXB0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgaXNBY3RpdmU6IGJvb2xlYW4gPSBmYWxzZTtcblxuICBASW5wdXQoKSByb3V0ZXJMaW5rQWN0aXZlT3B0aW9uczoge2V4YWN0OiBib29sZWFufSA9IHtleGFjdDogZmFsc2V9O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZXI6IFJvdXRlciwgcHJpdmF0ZSBlbGVtZW50OiBFbGVtZW50UmVmLCBwcml2YXRlIHJlbmRlcmVyOiBSZW5kZXJlcjIsXG4gICAgICBAT3B0aW9uYWwoKSBwcml2YXRlIGxpbms/OiBSb3V0ZXJMaW5rLFxuICAgICAgQE9wdGlvbmFsKCkgcHJpdmF0ZSBsaW5rV2l0aEhyZWY/OiBSb3V0ZXJMaW5rV2l0aEhyZWYpIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbiA9IHJvdXRlci5ldmVudHMuc3Vic2NyaWJlKChzOiBSb3V0ZXJFdmVudCkgPT4ge1xuICAgICAgaWYgKHMgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuXG4gIG5nQWZ0ZXJDb250ZW50SW5pdCgpOiB2b2lkIHtcbiAgICB0aGlzLmxpbmtzLmNoYW5nZXMuc3Vic2NyaWJlKF8gPT4gdGhpcy51cGRhdGUoKSk7XG4gICAgdGhpcy5saW5rc1dpdGhIcmVmcy5jaGFuZ2VzLnN1YnNjcmliZShfID0+IHRoaXMudXBkYXRlKCkpO1xuICAgIHRoaXMudXBkYXRlKCk7XG4gIH1cblxuICBASW5wdXQoKVxuICBzZXQgcm91dGVyTGlua0FjdGl2ZShkYXRhOiBzdHJpbmdbXXxzdHJpbmcpIHtcbiAgICBjb25zdCBjbGFzc2VzID0gQXJyYXkuaXNBcnJheShkYXRhKSA/IGRhdGEgOiBkYXRhLnNwbGl0KCcgJyk7XG4gICAgdGhpcy5jbGFzc2VzID0gY2xhc3Nlcy5maWx0ZXIoYyA9PiAhIWMpO1xuICB9XG5cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcyk6IHZvaWQgeyB0aGlzLnVwZGF0ZSgpOyB9XG4gIG5nT25EZXN0cm95KCk6IHZvaWQgeyB0aGlzLnN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpOyB9XG5cbiAgcHJpdmF0ZSB1cGRhdGUoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmxpbmtzIHx8ICF0aGlzLmxpbmtzV2l0aEhyZWZzIHx8ICF0aGlzLnJvdXRlci5uYXZpZ2F0ZWQpIHJldHVybjtcbiAgICBQcm9taXNlLnJlc29sdmUoKS50aGVuKCgpID0+IHtcbiAgICAgIGNvbnN0IGhhc0FjdGl2ZUxpbmtzID0gdGhpcy5oYXNBY3RpdmVMaW5rcygpO1xuICAgICAgaWYgKHRoaXMuaXNBY3RpdmUgIT09IGhhc0FjdGl2ZUxpbmtzKSB7XG4gICAgICAgICh0aGlzIGFzIGFueSkuaXNBY3RpdmUgPSBoYXNBY3RpdmVMaW5rcztcbiAgICAgICAgdGhpcy5jbGFzc2VzLmZvckVhY2goKGMpID0+IHtcbiAgICAgICAgICBpZiAoaGFzQWN0aXZlTGlua3MpIHtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyZXIuYWRkQ2xhc3ModGhpcy5lbGVtZW50Lm5hdGl2ZUVsZW1lbnQsIGMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcmVyLnJlbW92ZUNsYXNzKHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LCBjKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBpc0xpbmtBY3RpdmUocm91dGVyOiBSb3V0ZXIpOiAobGluazogKFJvdXRlckxpbmt8Um91dGVyTGlua1dpdGhIcmVmKSkgPT4gYm9vbGVhbiB7XG4gICAgcmV0dXJuIChsaW5rOiBSb3V0ZXJMaW5rIHwgUm91dGVyTGlua1dpdGhIcmVmKSA9PlxuICAgICAgICAgICAgICAgcm91dGVyLmlzQWN0aXZlKGxpbmsudXJsVHJlZSwgdGhpcy5yb3V0ZXJMaW5rQWN0aXZlT3B0aW9ucy5leGFjdCk7XG4gIH1cblxuICBwcml2YXRlIGhhc0FjdGl2ZUxpbmtzKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGlzQWN0aXZlQ2hlY2tGbiA9IHRoaXMuaXNMaW5rQWN0aXZlKHRoaXMucm91dGVyKTtcbiAgICByZXR1cm4gdGhpcy5saW5rICYmIGlzQWN0aXZlQ2hlY2tGbih0aGlzLmxpbmspIHx8XG4gICAgICAgIHRoaXMubGlua1dpdGhIcmVmICYmIGlzQWN0aXZlQ2hlY2tGbih0aGlzLmxpbmtXaXRoSHJlZikgfHxcbiAgICAgICAgdGhpcy5saW5rcy5zb21lKGlzQWN0aXZlQ2hlY2tGbikgfHwgdGhpcy5saW5rc1dpdGhIcmVmcy5zb21lKGlzQWN0aXZlQ2hlY2tGbik7XG4gIH1cbn1cbiJdfQ==