/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Njcm9sbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXJfc2Nyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOztBQUVILE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxVQUFVLEVBQVksTUFBTSxlQUFlLENBQUM7QUFHcEQsT0FBTyxFQUFDLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ2hFLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFHaEM7SUFBQSxJQUFhLGNBQWMsR0FBM0IsTUFBYSxjQUFjO1FBV3pCLFlBQ1ksTUFBYztRQUN0Qix1QkFBdUIsQ0FBaUIsZ0JBQWtDLEVBQVUsVUFHaEYsRUFBRTtZQUpFLFdBQU0sR0FBTixNQUFNLENBQVE7WUFDa0IscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtZQUFVLFlBQU8sR0FBUCxPQUFPLENBR3JGO1lBVkYsV0FBTSxHQUFHLENBQUMsQ0FBQztZQUNYLGVBQVUsR0FBbUQsWUFBWSxDQUFDO1lBQzFFLGVBQVUsR0FBRyxDQUFDLENBQUM7WUFDZixVQUFLLEdBQXNDLEVBQUUsQ0FBQztZQVFwRCxxQ0FBcUM7WUFDckMsT0FBTyxDQUFDLHlCQUF5QixHQUFHLE9BQU8sQ0FBQyx5QkFBeUIsSUFBSSxVQUFVLENBQUM7WUFDcEYsT0FBTyxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsZUFBZSxJQUFJLFVBQVUsQ0FBQztRQUNsRSxDQUFDO1FBRUQsSUFBSTtZQUNGLHVFQUF1RTtZQUN2RSxzRUFBc0U7WUFDdEUsMERBQTBEO1lBQzFELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsS0FBSyxVQUFVLEVBQUU7Z0JBQ3pELElBQUksQ0FBQyxnQkFBZ0Is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QUMsd0JBQXdCLEVBQUU7Z0JBQ2pDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQzthQUM3QztZQUNELElBQUksSUFBSSxDQUFDLHdCQUF3QixFQUFFO2dCQUNqQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsV0FBVyxFQUFFLENBQUM7YUFDN0M7UUFDSCxDQUFDO0tBQ0YsQ0FBQTtJQWpGWSxjQUFjO1FBRDFCLFVBQVUsRUFBRTt5Q0FhUyxNQUFNO1lBQ29DLGdCQUFnQjtPQWJuRSxjQUFjLENBaUYxQjtJQUFELHFCQUFDO0tBQUE7U0FqRlksY0FBYyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1ZpZXdwb3J0U2Nyb2xsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0luamVjdGFibGUsIE9uRGVzdHJveX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge1Vuc3Vic2NyaWJhYmxlfSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtOYXZpZ2F0aW9uRW5kLCBOYXZpZ2F0aW9uU3RhcnQsIFNjcm9sbH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJy4vcm91dGVyJztcblxuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIFJvdXRlclNjcm9sbGVyIGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgcm91dGVyRXZlbnRzU3Vic2NyaXB0aW9uITogVW5zdWJzY3JpYmFibGU7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIHNjcm9sbEV2ZW50c1N1YnNjcmlwdGlvbiE6IFVuc3Vic2NyaWJhYmxlO1xuXG4gIHByaXZhdGUgbGFzdElkID0gMDtcbiAgcHJpdmF0ZSBsYXN0U291cmNlOiAnaW1wZXJhdGl2ZSd8J3BvcHN0YXRlJ3wnaGFzaGNoYW5nZSd8dW5kZWZpbmVkID0gJ2ltcGVyYXRpdmUnO1xuICBwcml2YXRlIHJlc3RvcmVkSWQgPSAwO1xuICBwcml2YXRlIHN0b3JlOiB7W2tleTogc3RyaW5nXTogW251bWJlciwgbnVtYmVyXX0gPSB7fTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqLyBwdWJsaWMgcmVhZG9ubHkgdmlld3BvcnRTY3JvbGxlcjogVmlld3BvcnRTY3JvbGxlciwgcHJpdmF0ZSBvcHRpb25zOiB7XG4gICAgICAgIHNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb24/OiAnZGlzYWJsZWQnfCdlbmFibGVkJ3wndG9wJyxcbiAgICAgICAgYW5jaG9yU2Nyb2xsaW5nPzogJ2Rpc2FibGVkJ3wnZW5hYmxlZCdcbiAgICAgIH0gPSB7fSkge1xuICAgIC8vIERlZmF1bHQgYm90aCBvcHRpb25zIHRvICdkaXNhYmxlZCdcbiAgICBvcHRpb25zLnNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb24gPSBvcHRpb25zLnNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb24gfHwgJ2Rpc2FibGVkJztcbiAgICBvcHRpb25zLmFuY2hvclNjcm9sbGluZyA9IG9wdGlvbnMuYW5jaG9yU2Nyb2xsaW5nIHx8ICdkaXNhYmxlZCc7XG4gIH1cblxuICBpbml0KCk6IHZvaWQge1xuICAgIC8vIHdlIHdhbnQgdG8gZGlzYWJsZSB0aGUgYXV0b21hdGljIHNjcm9sbGluZyBiZWNhdXNlIGhhdmluZyB0d28gcGxhY2VzXG4gICAgLy8gcmVzcG9uc2libGUgZm9yIHNjcm9sbGluZyByZXN1bHRzIHJhY2UgY29uZGl0aW9ucywgZXNwZWNpYWxseSBnaXZlblxuICAgIC8vIHRoYXQgYnJvd3NlciBkb24ndCBpbXBsZW1lbnQgdGhpcyBiZWhhdmlvciBjb25zaXN0ZW50bHlcbiAgICBpZiAodGhpcy5vcHRpb25zLnNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb24gIT09ICdkaXNhYmxlZCcpIHtcbiAgICAgIHRoaXMudmlld3BvcnRTY3JvbGxlci5zZXRIaXN0b3J5U2Nyb2xsUmVzdG9yYXRpb24oJ21hbnVhbCcpO1xuICAgIH1cbiAgICB0aGlzLnJvdXRlckV2ZW50c1N1YnNjcmlwdGlvbiA9IHRoaXMuY3JlYXRlU2Nyb2xsRXZlbnRzKCk7XG4gICAgdGhpcy5zY3JvbGxFdmVudHNTdWJzY3JpcHRpb24gPSB0aGlzLmNvbnN1bWVTY3JvbGxFdmVudHMoKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlU2Nyb2xsRXZlbnRzKCkge1xuICAgIHJldHVybiB0aGlzLnJvdXRlci5ldmVudHMuc3Vic2NyaWJlKGUgPT4ge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uU3RhcnQpIHtcbiAgICAgICAgLy8gc3RvcmUgdGhlIHNjcm9sbCBwb3NpdGlvbiBvZiB0aGUgY3VycmVudCBzdGFibGUgbmF2aWdhdGlvbnMuXG4gICAgICAgIHRoaXMuc3RvcmVbdGhpcy5sYXN0SWRdID0gdGhpcy52aWV3cG9ydFNjcm9sbGVyLmdldFNjcm9sbFBvc2l0aW9uKCk7XG4gICAgICAgIHRoaXMubGFzdFNvdXJjZSA9IGUubmF2aWdhdGlvblRyaWdnZXI7XG4gICAgICAgIHRoaXMucmVzdG9yZWRJZCA9IGUucmVzdG9yZWRTdGF0ZSA/IGUucmVzdG9yZWRTdGF0ZS5uYXZpZ2F0aW9uSWQgOiAwO1xuICAgICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCkge1xuICAgICAgICB0aGlzLmxhc3RJZCA9IGUuaWQ7XG4gICAgICAgIHRoaXMuc2NoZWR1bGVTY3JvbGxFdmVudChlLCB0aGlzLnJvdXRlci5wYXJzZVVybChlLnVybEFmdGVyUmVkaXJlY3RzKS5mcmFnbWVudCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNvbnN1bWVTY3JvbGxFdmVudHMoKSB7XG4gICAgcmV0dXJuIHRoaXMucm91dGVyLmV2ZW50cy5zdWJzY3JpYmUoZSA9PiB7XG4gICAgICBpZiAoIShlIGluc3RhbmNlb2YgU2Nyb2xsKSkgcmV0dXJuO1xuICAgICAgLy8gYSBwb3BzdGF0ZSBldmVudC4gVGhlIHBvcCBzdGF0ZSBldmVudCB3aWxsIGFsd2F5cyBpZ25vcmUgYW5jaG9yIHNjcm9sbGluZy5cbiAgICAgIGlmIChlLnBvc2l0aW9uKSB7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvbiA9PT0gJ3RvcCcpIHtcbiAgICAgICAgICB0aGlzLnZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9Qb3NpdGlvbihbMCwgMF0pO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uID09PSAnZW5hYmxlZCcpIHtcbiAgICAgICAgICB0aGlzLnZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9Qb3NpdGlvbihlLnBvc2l0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBpbXBlcmF0aXZlIG5hdmlnYXRpb24gXCJmb3J3YXJkXCJcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChlLmFuY2hvciAmJiB0aGlzLm9wdGlvbnMuYW5jaG9yU2Nyb2xsaW5nID09PSAnZW5hYmxlZCcpIHtcbiAgICAgICAgICB0aGlzLnZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9BbmNob3IoZS5hbmNob3IpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uICE9PSAnZGlzYWJsZWQnKSB7XG4gICAgICAgICAgdGhpcy52aWV3cG9ydFNjcm9sbGVyLnNjcm9sbFRvUG9zaXRpb24oWzAsIDBdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzY2hlZHVsZVNjcm9sbEV2ZW50KHJvdXRlckV2ZW50OiBOYXZpZ2F0aW9uRW5kLCBhbmNob3I6IHN0cmluZ3xudWxsKTogdm9pZCB7XG4gICAgdGhpcy5yb3V0ZXIudHJpZ2dlckV2ZW50KG5ldyBTY3JvbGwoXG4gICAgICAgIHJvdXRlckV2ZW50LCB0aGlzLmxhc3RTb3VyY2UgPT09ICdwb3BzdGF0ZScgPyB0aGlzLnN0b3JlW3RoaXMucmVzdG9yZWRJZF0gOiBudWxsLCBhbmNob3IpKTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIGlmICh0aGlzLnJvdXRlckV2ZW50c1N1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5yb3V0ZXJFdmVudHNTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc2Nyb2xsRXZlbnRzU3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLnNjcm9sbEV2ZW50c1N1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIH1cbiAgfVxufVxuIl19