/**
 * @fileoverview added by tsickle
 * Generated from: packages/router/src/router_scroller.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { ViewportScroller } from '@angular/common';
import { Injectable } from '@angular/core';
import { NavigationEnd, NavigationStart, Scroll } from './events';
import { Router } from './router';
import * as i0 from "@angular/core";
import * as i1 from "./router";
import * as i2 from "@angular/common";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
let RouterScroller = /** @class */ (() => {
    class RouterScroller {
        /**
         * @param {?} router
         * @param {?} viewportScroller
         * @param {?=} options
         */
        constructor(router, viewportScroller, options = {}) {
            this.router = router;
            this.viewportScroller = viewportScroller;
            this.options = options;
            this.lastId = 0;
            this.lastSource = 'imperative';
            this.restoredId = 0;
            this.store = {};
            // Default both options to 'disabled'
            options.scrollPositionRestoration = options.scrollPositionRestoration || 'disabled';
            options.anchorScrolling = options.anchorScrolling || 'disabled';
        }
        /**
         * @return {?}
         */
        init() {
            // we want to disable the automatic scrolling because having two places
            // responsible for scrolling results race conditions, especially given
            // that browser don't implement this behavior consistently
            if (this.options.scrollPositionRestoration !== 'disabled') {
                this.viewportScroller.setHistoryScrollRestoration('manual');
            }
            this.routerEventsSubscription = this.createScrollEvents();
            this.scrollEventsSubscription = this.consumeScrollEvents();
        }
        /**
         * @private
         * @return {?}
         */
        createScrollEvents() {
            return this.router.events.subscribe((/**
             * @param {?} e
             * @return {?}
             */
            e => {
                if (e instanceof NavigationStart) {
                    // store the scroll position of the current stable navigations.
                    this.store[this.lastId] = this.viewportScroller.getScrollPosition();
                    this.lastSource = e.navigationTrigger;
                    this.restoredId = e.restoredState ? e.restoredState.navigationId : 0;
                }
                else if (e instanceof NavigationEnd) {
                    this.lastId = e.id;
                    this.scheduleScrollEvent(e, this.router.parseUrl(e.urlAfterRedirects).fragment);
                }
            }));
        }
        /**
         * @private
         * @return {?}
         */
        consumeScrollEvents() {
            return this.router.events.subscribe((/**
             * @param {?} e
             * @return {?}
             */
            e => {
                if (!(e instanceof Scroll))
                    return;
                // a popstate event. The pop state event will always ignore anchor scrolling.
                if (e.position) {
                    if (this.options.scrollPositionRestoration === 'top') {
                        this.viewportScroller.scrollToPosition([0, 0]);
                    }
                    else if (this.options.scrollPositionRestoration === 'enabled') {
                        this.viewportScroller.scrollToPosition(e.position);
                    }
                    // imperative navigation "forward"
                }
                else {
                    if (e.anchor && this.options.anchorScrolling === 'enabled') {
                        this.viewportScroller.scrollToAnchor(e.anchor);
                    }
                    else if (this.options.scrollPositionRestoration !== 'disabled') {
                        this.viewportScroller.scrollToPosition([0, 0]);
                    }
                }
            }));
        }
        /**
         * @private
         * @param {?} routerEvent
         * @param {?} anchor
         * @return {?}
         */
        scheduleScrollEvent(routerEvent, anchor) {
            this.router.triggerEvent(new Scroll(routerEvent, this.lastSource === 'popstate' ? this.store[this.restoredId] : null, anchor));
        }
        /**
         * @return {?}
         */
        ngOnDestroy() {
            if (this.routerEventsSubscription) {
                this.routerEventsSubscription.unsubscribe();
            }
            if (this.scrollEventsSubscription) {
                this.scrollEventsSubscription.unsubscribe();
            }
        }
    }
    RouterScroller.decorators = [
        { type: Injectable },
    ];
    /** @nocollapse */
    RouterScroller.ctorParameters = () => [
        { type: Router },
        { type: ViewportScroller },
        { type: undefined }
    ];
    /** @nocollapse */ RouterScroller.ɵfac = function RouterScroller_Factory(t) { i0.ɵɵinvalidFactory(); };
    /** @nocollapse */ RouterScroller.ɵprov = i0.ɵɵdefineInjectable({ token: RouterScroller, factory: RouterScroller.ɵfac });
    return RouterScroller;
})();
export { RouterScroller };
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RouterScroller, [{
        type: Injectable
    }], function () { return [{ type: i1.Router }, { type: i2.ViewportScroller }, { type: undefined }]; }, null); })();
if (false) {
    /**
     * @type {?}
     * @private
     */
    RouterScroller.prototype.routerEventsSubscription;
    /**
     * @type {?}
     * @private
     */
    RouterScroller.prototype.scrollEventsSubscription;
    /**
     * @type {?}
     * @private
     */
    RouterScroller.prototype.lastId;
    /**
     * @type {?}
     * @private
     */
    RouterScroller.prototype.lastSource;
    /**
     * @type {?}
     * @private
     */
    RouterScroller.prototype.restoredId;
    /**
     * @type {?}
     * @private
     */
    RouterScroller.prototype.store;
    /**
     * @type {?}
     * @private
     */
    RouterScroller.prototype.router;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    RouterScroller.prototype.viewportScroller;
    /**
     * @type {?}
     * @private
     */
    RouterScroller.prototype.options;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Njcm9sbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXJfc2Nyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFRQSxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUNqRCxPQUFPLEVBQUMsVUFBVSxFQUFZLE1BQU0sZUFBZSxDQUFDO0FBR3BELE9BQU8sRUFBQyxhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNoRSxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sVUFBVSxDQUFDOzs7Ozs7Ozs7OztBQUVoQztJQUFBLE1BQ2EsY0FBYzs7Ozs7O1FBV3pCLFlBQ1ksTUFBYyxFQUNrQixnQkFBa0MsRUFBVSxVQUdoRixFQUFFO1lBSkUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUNrQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1lBQVUsWUFBTyxHQUFQLE9BQU8sQ0FHckY7WUFWRixXQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQ1gsZUFBVSxHQUFtRCxZQUFZLENBQUM7WUFDMUUsZUFBVSxHQUFHLENBQUMsQ0FBQztZQUNmLFVBQUssR0FBc0MsRUFBRSxDQUFDO1lBUXBELHFDQUFxQztZQUNyQyxPQUFPLENBQUMseUJBQXlCLEdBQUcsT0FBTyxDQUFDLHlCQUF5QixJQUFJLFVBQVUsQ0FBQztZQUNwRixPQUFPLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQyxlQUFlLElBQUksVUFBVSxDQUFDO1FBQ2xFLENBQUM7Ozs7UUFFRCxJQUFJO1lBQ0YsdUVBQXVFO1lBQ3ZFLHNFQUFzRTtZQUN0RSwwREFBMEQ7WUFDMUQsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLHlCQUF5QixLQUFLLFVBQVUsRUFBRTtnQkFDekQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLDJCQUEyQixDQUFDLFFBQVEs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QUFDLHdCQUF3QixFQUFFO2dCQUNqQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsV0FBVyxFQUFFLENBQUM7YUFDN0M7WUFDRCxJQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtnQkFDakMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFdBQVcsRUFBRSxDQUFDO2FBQzdDO1FBQ0gsQ0FBQzs7O2dCQWpGRixVQUFVOzs7O2dCQUZILE1BQU07Z0JBTE4sZ0JBQWdCOzs7OzZFQVFYLGNBQWMsV0FBZCxjQUFjO3lCQWhCM0I7S0FpR0M7U0FqRlksY0FBYztrREFBZCxjQUFjO2NBRDFCLFVBQVU7Ozs7Ozs7SUFHVCxrREFBa0Q7Ozs7O0lBRWxELGtEQUFrRDs7Ozs7SUFFbEQsZ0NBQW1COzs7OztJQUNuQixvQ0FBa0Y7Ozs7O0lBQ2xGLG9DQUF1Qjs7Ozs7SUFDdkIsK0JBQXNEOzs7OztJQUdsRCxnQ0FBc0I7Ozs7O0lBQ0UsMENBQWtEOzs7OztJQUFFLGlDQUd0RSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtWaWV3cG9ydFNjcm9sbGVyfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtJbmplY3RhYmxlLCBPbkRlc3Ryb3l9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtVbnN1YnNjcmliYWJsZX0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7TmF2aWdhdGlvbkVuZCwgTmF2aWdhdGlvblN0YXJ0LCBTY3JvbGx9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7Um91dGVyfSBmcm9tICcuL3JvdXRlcic7XG5cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBSb3V0ZXJTY3JvbGxlciBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIHJvdXRlckV2ZW50c1N1YnNjcmlwdGlvbiE6IFVuc3Vic2NyaWJhYmxlO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBzY3JvbGxFdmVudHNTdWJzY3JpcHRpb24hOiBVbnN1YnNjcmliYWJsZTtcblxuICBwcml2YXRlIGxhc3RJZCA9IDA7XG4gIHByaXZhdGUgbGFzdFNvdXJjZTogJ2ltcGVyYXRpdmUnfCdwb3BzdGF0ZSd8J2hhc2hjaGFuZ2UnfHVuZGVmaW5lZCA9ICdpbXBlcmF0aXZlJztcbiAgcHJpdmF0ZSByZXN0b3JlZElkID0gMDtcbiAgcHJpdmF0ZSBzdG9yZToge1trZXk6IHN0cmluZ106IFtudW1iZXIsIG51bWJlcl19ID0ge307XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi8gcHVibGljIHJlYWRvbmx5IHZpZXdwb3J0U2Nyb2xsZXI6IFZpZXdwb3J0U2Nyb2xsZXIsIHByaXZhdGUgb3B0aW9uczoge1xuICAgICAgICBzY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uPzogJ2Rpc2FibGVkJ3wnZW5hYmxlZCd8J3RvcCcsXG4gICAgICAgIGFuY2hvclNjcm9sbGluZz86ICdkaXNhYmxlZCd8J2VuYWJsZWQnXG4gICAgICB9ID0ge30pIHtcbiAgICAvLyBEZWZhdWx0IGJvdGggb3B0aW9ucyB0byAnZGlzYWJsZWQnXG4gICAgb3B0aW9ucy5zY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uID0gb3B0aW9ucy5zY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uIHx8ICdkaXNhYmxlZCc7XG4gICAgb3B0aW9ucy5hbmNob3JTY3JvbGxpbmcgPSBvcHRpb25zLmFuY2hvclNjcm9sbGluZyB8fCAnZGlzYWJsZWQnO1xuICB9XG5cbiAgaW5pdCgpOiB2b2lkIHtcbiAgICAvLyB3ZSB3YW50IHRvIGRpc2FibGUgdGhlIGF1dG9tYXRpYyBzY3JvbGxpbmcgYmVjYXVzZSBoYXZpbmcgdHdvIHBsYWNlc1xuICAgIC8vIHJlc3BvbnNpYmxlIGZvciBzY3JvbGxpbmcgcmVzdWx0cyByYWNlIGNvbmRpdGlvbnMsIGVzcGVjaWFsbHkgZ2l2ZW5cbiAgICAvLyB0aGF0IGJyb3dzZXIgZG9uJ3QgaW1wbGVtZW50IHRoaXMgYmVoYXZpb3IgY29uc2lzdGVudGx5XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uICE9PSAnZGlzYWJsZWQnKSB7XG4gICAgICB0aGlzLnZpZXdwb3J0U2Nyb2xsZXIuc2V0SGlzdG9yeVNjcm9sbFJlc3RvcmF0aW9uKCdtYW51YWwnKTtcbiAgICB9XG4gICAgdGhpcy5yb3V0ZXJFdmVudHNTdWJzY3JpcHRpb24gPSB0aGlzLmNyZWF0ZVNjcm9sbEV2ZW50cygpO1xuICAgIHRoaXMuc2Nyb2xsRXZlbnRzU3Vic2NyaXB0aW9uID0gdGhpcy5jb25zdW1lU2Nyb2xsRXZlbnRzKCk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVNjcm9sbEV2ZW50cygpIHtcbiAgICByZXR1cm4gdGhpcy5yb3V0ZXIuZXZlbnRzLnN1YnNjcmliZShlID0+IHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvblN0YXJ0KSB7XG4gICAgICAgIC8vIHN0b3JlIHRoZSBzY3JvbGwgcG9zaXRpb24gb2YgdGhlIGN1cnJlbnQgc3RhYmxlIG5hdmlnYXRpb25zLlxuICAgICAgICB0aGlzLnN0b3JlW3RoaXMubGFzdElkXSA9IHRoaXMudmlld3BvcnRTY3JvbGxlci5nZXRTY3JvbGxQb3NpdGlvbigpO1xuICAgICAgICB0aGlzLmxhc3RTb3VyY2UgPSBlLm5hdmlnYXRpb25UcmlnZ2VyO1xuICAgICAgICB0aGlzLnJlc3RvcmVkSWQgPSBlLnJlc3RvcmVkU3RhdGUgPyBlLnJlc3RvcmVkU3RhdGUubmF2aWdhdGlvbklkIDogMDtcbiAgICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpIHtcbiAgICAgICAgdGhpcy5sYXN0SWQgPSBlLmlkO1xuICAgICAgICB0aGlzLnNjaGVkdWxlU2Nyb2xsRXZlbnQoZSwgdGhpcy5yb3V0ZXIucGFyc2VVcmwoZS51cmxBZnRlclJlZGlyZWN0cykuZnJhZ21lbnQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjb25zdW1lU2Nyb2xsRXZlbnRzKCkge1xuICAgIHJldHVybiB0aGlzLnJvdXRlci5ldmVudHMuc3Vic2NyaWJlKGUgPT4ge1xuICAgICAgaWYgKCEoZSBpbnN0YW5jZW9mIFNjcm9sbCkpIHJldHVybjtcbiAgICAgIC8vIGEgcG9wc3RhdGUgZXZlbnQuIFRoZSBwb3Agc3RhdGUgZXZlbnQgd2lsbCBhbHdheXMgaWdub3JlIGFuY2hvciBzY3JvbGxpbmcuXG4gICAgICBpZiAoZS5wb3NpdGlvbikge1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb24gPT09ICd0b3AnKSB7XG4gICAgICAgICAgdGhpcy52aWV3cG9ydFNjcm9sbGVyLnNjcm9sbFRvUG9zaXRpb24oWzAsIDBdKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuc2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvbiA9PT0gJ2VuYWJsZWQnKSB7XG4gICAgICAgICAgdGhpcy52aWV3cG9ydFNjcm9sbGVyLnNjcm9sbFRvUG9zaXRpb24oZS5wb3NpdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gaW1wZXJhdGl2ZSBuYXZpZ2F0aW9uIFwiZm9yd2FyZFwiXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZS5hbmNob3IgJiYgdGhpcy5vcHRpb25zLmFuY2hvclNjcm9sbGluZyA9PT0gJ2VuYWJsZWQnKSB7XG4gICAgICAgICAgdGhpcy52aWV3cG9ydFNjcm9sbGVyLnNjcm9sbFRvQW5jaG9yKGUuYW5jaG9yKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuc2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvbiAhPT0gJ2Rpc2FibGVkJykge1xuICAgICAgICAgIHRoaXMudmlld3BvcnRTY3JvbGxlci5zY3JvbGxUb1Bvc2l0aW9uKFswLCAwXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2NoZWR1bGVTY3JvbGxFdmVudChyb3V0ZXJFdmVudDogTmF2aWdhdGlvbkVuZCwgYW5jaG9yOiBzdHJpbmd8bnVsbCk6IHZvaWQge1xuICAgIHRoaXMucm91dGVyLnRyaWdnZXJFdmVudChuZXcgU2Nyb2xsKFxuICAgICAgICByb3V0ZXJFdmVudCwgdGhpcy5sYXN0U291cmNlID09PSAncG9wc3RhdGUnID8gdGhpcy5zdG9yZVt0aGlzLnJlc3RvcmVkSWRdIDogbnVsbCwgYW5jaG9yKSk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpIHtcbiAgICBpZiAodGhpcy5yb3V0ZXJFdmVudHNTdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMucm91dGVyRXZlbnRzU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnNjcm9sbEV2ZW50c1N1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5zY3JvbGxFdmVudHNTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==