/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { __decorate, __metadata } from "tslib";
import { ViewportScroller } from '@angular/common';
import { Injectable } from '@angular/core';
import { NavigationEnd, NavigationStart, Scroll } from './events';
import { Router } from './router';
let RouterScroller = /** @class */ (() => {
    let RouterScroller = class RouterScroller {
        constructor(router, 
        /** @docsNotRequired */ viewportScroller, options = {}) {
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
        createScrollEvents() {
            return this.router.events.subscribe(e => {
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
            });
        }
        consumeScrollEvents() {
            return this.router.events.subscribe(e => {
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
            });
        }
        scheduleScrollEvent(routerEvent, anchor) {
            this.router.triggerEvent(new Scroll(routerEvent, this.lastSource === 'popstate' ? this.store[this.restoredId] : null, anchor));
        }
        ngOnDestroy() {
            if (this.routerEventsSubscription) {
                this.routerEventsSubscription.unsubscribe();
            }
            if (this.scrollEventsSubscription) {
                this.scrollEventsSubscription.unsubscribe();
            }
        }
    };
    RouterScroller = __decorate([
        Injectable(),
        __metadata("design:paramtypes", [Router,
            ViewportScroller, Object])
    ], RouterScroller);
    return RouterScroller;
})();
export { RouterScroller };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Njcm9sbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXJfc2Nyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOztBQUVILE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxVQUFVLEVBQVksTUFBTSxlQUFlLENBQUM7QUFHcEQsT0FBTyxFQUFDLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ2hFLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFHaEM7SUFBQSxJQUFhLGNBQWMsR0FBM0IsTUFBYSxjQUFjO1FBV3pCLFlBQ1ksTUFBYztRQUN0Qix1QkFBdUIsQ0FBaUIsZ0JBQWtDLEVBQVUsVUFHaEYsRUFBRTtZQUpFLFdBQU0sR0FBTixNQUFNLENBQVE7WUFDa0IscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtZQUFVLFlBQU8sR0FBUCxPQUFPLENBR3JGO1lBVkYsV0FBTSxHQUFHLENBQUMsQ0FBQztZQUNYLGVBQVUsR0FBbUQsWUFBWSxDQUFDO1lBQzFFLGVBQVUsR0FBRyxDQUFDLENBQUM7WUFDZixVQUFLLEdBQXNDLEVBQUUsQ0FBQztZQVFwRCxxQ0FBcUM7WUFDckMsT0FBTyxDQUFDLHlCQUF5QixHQUFHLE9BQU8sQ0FBQyx5QkFBeUIsSUFBSSxVQUFVLENBQUM7WUFDcEYsT0FBTyxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsZUFBZSxJQUFJLFVBQVUsQ0FBQztRQUNsRSxDQUFDO1FBRUQsSUFBSTtZQUNGLHVFQUF1RTtZQUN2RSxzRUFBc0U7WUFDdEUsMERBQTBEO1lBQzFELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsS0FBSyxVQUFVLEVBQUU7Z0JBQ3pELElBQUksQ0FBQyxnQkFBZ0Is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QUMsd0JBQXdCLEVBQUU7Z0JBQ2pDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQzthQUM3QztZQUNELElBQUksSUFBSSxDQUFDLHdCQUF3QixFQUFFO2dCQUNqQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsV0FBVyxFQUFFLENBQUM7YUFDN0M7UUFDSCxDQUFDO0tBQ0YsQ0FBQTtJQWpGWSxjQUFjO1FBRDFCLFVBQVUsRUFBRTt5Q0FhUyxNQUFNO1lBQ29DLGdCQUFnQjtPQWJuRSxjQUFjLENBaUYxQjtJQUFELHFCQUFDO0tBQUE7U0FqRlksY0FBYyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtWaWV3cG9ydFNjcm9sbGVyfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtJbmplY3RhYmxlLCBPbkRlc3Ryb3l9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtVbnN1YnNjcmliYWJsZX0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7TmF2aWdhdGlvbkVuZCwgTmF2aWdhdGlvblN0YXJ0LCBTY3JvbGx9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7Um91dGVyfSBmcm9tICcuL3JvdXRlcic7XG5cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBSb3V0ZXJTY3JvbGxlciBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIHJvdXRlckV2ZW50c1N1YnNjcmlwdGlvbiE6IFVuc3Vic2NyaWJhYmxlO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBzY3JvbGxFdmVudHNTdWJzY3JpcHRpb24hOiBVbnN1YnNjcmliYWJsZTtcblxuICBwcml2YXRlIGxhc3RJZCA9IDA7XG4gIHByaXZhdGUgbGFzdFNvdXJjZTogJ2ltcGVyYXRpdmUnfCdwb3BzdGF0ZSd8J2hhc2hjaGFuZ2UnfHVuZGVmaW5lZCA9ICdpbXBlcmF0aXZlJztcbiAgcHJpdmF0ZSByZXN0b3JlZElkID0gMDtcbiAgcHJpdmF0ZSBzdG9yZToge1trZXk6IHN0cmluZ106IFtudW1iZXIsIG51bWJlcl19ID0ge307XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi8gcHVibGljIHJlYWRvbmx5IHZpZXdwb3J0U2Nyb2xsZXI6IFZpZXdwb3J0U2Nyb2xsZXIsIHByaXZhdGUgb3B0aW9uczoge1xuICAgICAgICBzY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uPzogJ2Rpc2FibGVkJ3wnZW5hYmxlZCd8J3RvcCcsXG4gICAgICAgIGFuY2hvclNjcm9sbGluZz86ICdkaXNhYmxlZCd8J2VuYWJsZWQnXG4gICAgICB9ID0ge30pIHtcbiAgICAvLyBEZWZhdWx0IGJvdGggb3B0aW9ucyB0byAnZGlzYWJsZWQnXG4gICAgb3B0aW9ucy5zY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uID0gb3B0aW9ucy5zY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uIHx8ICdkaXNhYmxlZCc7XG4gICAgb3B0aW9ucy5hbmNob3JTY3JvbGxpbmcgPSBvcHRpb25zLmFuY2hvclNjcm9sbGluZyB8fCAnZGlzYWJsZWQnO1xuICB9XG5cbiAgaW5pdCgpOiB2b2lkIHtcbiAgICAvLyB3ZSB3YW50IHRvIGRpc2FibGUgdGhlIGF1dG9tYXRpYyBzY3JvbGxpbmcgYmVjYXVzZSBoYXZpbmcgdHdvIHBsYWNlc1xuICAgIC8vIHJlc3BvbnNpYmxlIGZvciBzY3JvbGxpbmcgcmVzdWx0cyByYWNlIGNvbmRpdGlvbnMsIGVzcGVjaWFsbHkgZ2l2ZW5cbiAgICAvLyB0aGF0IGJyb3dzZXIgZG9uJ3QgaW1wbGVtZW50IHRoaXMgYmVoYXZpb3IgY29uc2lzdGVudGx5XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uICE9PSAnZGlzYWJsZWQnKSB7XG4gICAgICB0aGlzLnZpZXdwb3J0U2Nyb2xsZXIuc2V0SGlzdG9yeVNjcm9sbFJlc3RvcmF0aW9uKCdtYW51YWwnKTtcbiAgICB9XG4gICAgdGhpcy5yb3V0ZXJFdmVudHNTdWJzY3JpcHRpb24gPSB0aGlzLmNyZWF0ZVNjcm9sbEV2ZW50cygpO1xuICAgIHRoaXMuc2Nyb2xsRXZlbnRzU3Vic2NyaXB0aW9uID0gdGhpcy5jb25zdW1lU2Nyb2xsRXZlbnRzKCk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVNjcm9sbEV2ZW50cygpIHtcbiAgICByZXR1cm4gdGhpcy5yb3V0ZXIuZXZlbnRzLnN1YnNjcmliZShlID0+IHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvblN0YXJ0KSB7XG4gICAgICAgIC8vIHN0b3JlIHRoZSBzY3JvbGwgcG9zaXRpb24gb2YgdGhlIGN1cnJlbnQgc3RhYmxlIG5hdmlnYXRpb25zLlxuICAgICAgICB0aGlzLnN0b3JlW3RoaXMubGFzdElkXSA9IHRoaXMudmlld3BvcnRTY3JvbGxlci5nZXRTY3JvbGxQb3NpdGlvbigpO1xuICAgICAgICB0aGlzLmxhc3RTb3VyY2UgPSBlLm5hdmlnYXRpb25UcmlnZ2VyO1xuICAgICAgICB0aGlzLnJlc3RvcmVkSWQgPSBlLnJlc3RvcmVkU3RhdGUgPyBlLnJlc3RvcmVkU3RhdGUubmF2aWdhdGlvbklkIDogMDtcbiAgICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpIHtcbiAgICAgICAgdGhpcy5sYXN0SWQgPSBlLmlkO1xuICAgICAgICB0aGlzLnNjaGVkdWxlU2Nyb2xsRXZlbnQoZSwgdGhpcy5yb3V0ZXIucGFyc2VVcmwoZS51cmxBZnRlclJlZGlyZWN0cykuZnJhZ21lbnQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjb25zdW1lU2Nyb2xsRXZlbnRzKCkge1xuICAgIHJldHVybiB0aGlzLnJvdXRlci5ldmVudHMuc3Vic2NyaWJlKGUgPT4ge1xuICAgICAgaWYgKCEoZSBpbnN0YW5jZW9mIFNjcm9sbCkpIHJldHVybjtcbiAgICAgIC8vIGEgcG9wc3RhdGUgZXZlbnQuIFRoZSBwb3Agc3RhdGUgZXZlbnQgd2lsbCBhbHdheXMgaWdub3JlIGFuY2hvciBzY3JvbGxpbmcuXG4gICAgICBpZiAoZS5wb3NpdGlvbikge1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb24gPT09ICd0b3AnKSB7XG4gICAgICAgICAgdGhpcy52aWV3cG9ydFNjcm9sbGVyLnNjcm9sbFRvUG9zaXRpb24oWzAsIDBdKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuc2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvbiA9PT0gJ2VuYWJsZWQnKSB7XG4gICAgICAgICAgdGhpcy52aWV3cG9ydFNjcm9sbGVyLnNjcm9sbFRvUG9zaXRpb24oZS5wb3NpdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gaW1wZXJhdGl2ZSBuYXZpZ2F0aW9uIFwiZm9yd2FyZFwiXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZS5hbmNob3IgJiYgdGhpcy5vcHRpb25zLmFuY2hvclNjcm9sbGluZyA9PT0gJ2VuYWJsZWQnKSB7XG4gICAgICAgICAgdGhpcy52aWV3cG9ydFNjcm9sbGVyLnNjcm9sbFRvQW5jaG9yKGUuYW5jaG9yKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuc2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvbiAhPT0gJ2Rpc2FibGVkJykge1xuICAgICAgICAgIHRoaXMudmlld3BvcnRTY3JvbGxlci5zY3JvbGxUb1Bvc2l0aW9uKFswLCAwXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2NoZWR1bGVTY3JvbGxFdmVudChyb3V0ZXJFdmVudDogTmF2aWdhdGlvbkVuZCwgYW5jaG9yOiBzdHJpbmd8bnVsbCk6IHZvaWQge1xuICAgIHRoaXMucm91dGVyLnRyaWdnZXJFdmVudChuZXcgU2Nyb2xsKFxuICAgICAgICByb3V0ZXJFdmVudCwgdGhpcy5sYXN0U291cmNlID09PSAncG9wc3RhdGUnID8gdGhpcy5zdG9yZVt0aGlzLnJlc3RvcmVkSWRdIDogbnVsbCwgYW5jaG9yKSk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpIHtcbiAgICBpZiAodGhpcy5yb3V0ZXJFdmVudHNTdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMucm91dGVyRXZlbnRzU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnNjcm9sbEV2ZW50c1N1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5zY3JvbGxFdmVudHNTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==