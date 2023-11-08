/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ViewportScroller } from '@angular/common';
import { Injectable, InjectionToken, NgZone } from '@angular/core';
import { NavigationEnd, NavigationSkipped, NavigationSkippedCode, NavigationStart, Scroll } from './events';
import { NavigationTransitions } from './navigation_transition';
import { UrlSerializer } from './url_tree';
import * as i0 from "@angular/core";
import * as i1 from "./url_tree";
import * as i2 from "./navigation_transition";
import * as i3 from "@angular/common";
export const ROUTER_SCROLLER = new InjectionToken('');
export class RouterScroller {
    /** @nodoc */
    constructor(urlSerializer, transitions, viewportScroller, zone, options = {}) {
        this.urlSerializer = urlSerializer;
        this.transitions = transitions;
        this.viewportScroller = viewportScroller;
        this.zone = zone;
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
        return this.transitions.events.subscribe(e => {
            if (e instanceof NavigationStart) {
                // store the scroll position of the current stable navigations.
                this.store[this.lastId] = this.viewportScroller.getScrollPosition();
                this.lastSource = e.navigationTrigger;
                this.restoredId = e.restoredState ? e.restoredState.navigationId : 0;
            }
            else if (e instanceof NavigationEnd) {
                this.lastId = e.id;
                this.scheduleScrollEvent(e, this.urlSerializer.parse(e.urlAfterRedirects).fragment);
            }
            else if (e instanceof NavigationSkipped &&
                e.code === NavigationSkippedCode.IgnoredSameUrlNavigation) {
                this.lastSource = undefined;
                this.restoredId = 0;
                this.scheduleScrollEvent(e, this.urlSerializer.parse(e.url).fragment);
            }
        });
    }
    consumeScrollEvents() {
        return this.transitions.events.subscribe(e => {
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
        this.zone.runOutsideAngular(() => {
            // The scroll event needs to be delayed until after change detection. Otherwise, we may
            // attempt to restore the scroll position before the router outlet has fully rendered the
            // component by executing its update block of the template function.
            setTimeout(() => {
                this.zone.run(() => {
                    this.transitions.events.next(new Scroll(routerEvent, this.lastSource === 'popstate' ? this.store[this.restoredId] : null, anchor));
                });
            }, 0);
        });
    }
    /** @nodoc */
    ngOnDestroy() {
        this.routerEventsSubscription?.unsubscribe();
        this.scrollEventsSubscription?.unsubscribe();
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-c745ca2", ngImport: i0, type: RouterScroller, deps: "invalid", target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-c745ca2", ngImport: i0, type: RouterScroller }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-c745ca2", ngImport: i0, type: RouterScroller, decorators: [{
            type: Injectable
        }], ctorParameters: () => [{ type: i1.UrlSerializer }, { type: i2.NavigationTransitions }, { type: i3.ViewportScroller }, { type: i0.NgZone }, { type: undefined }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Njcm9sbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXJfc2Nyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDakQsT0FBTyxFQUFDLFVBQVUsRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFZLE1BQU0sZUFBZSxDQUFDO0FBRzVFLE9BQU8sRUFBQyxhQUFhLEVBQUUsaUJBQWlCLEVBQUUscUJBQXFCLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUMxRyxPQUFPLEVBQUMscUJBQXFCLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RCxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sWUFBWSxDQUFDOzs7OztBQUV6QyxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsSUFBSSxjQUFjLENBQWlCLEVBQUUsQ0FBQyxDQUFDO0FBR3RFLE1BQU0sT0FBTyxjQUFjO0lBU3pCLGFBQWE7SUFDYixZQUNhLGFBQTRCLEVBQVUsV0FBa0MsRUFDakUsZ0JBQWtDLEVBQW1CLElBQVksRUFDekUsVUFHSixFQUFFO1FBTEcsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFBVSxnQkFBVyxHQUFYLFdBQVcsQ0FBdUI7UUFDakUscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUFtQixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ3pFLFlBQU8sR0FBUCxPQUFPLENBR1Q7UUFaRixXQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ1gsZUFBVSxHQUFtRCxZQUFZLENBQUM7UUFDMUUsZUFBVSxHQUFHLENBQUMsQ0FBQztRQUNmLFVBQUssR0FBc0MsRUFBRSxDQUFDO1FBVXBELHFDQUFxQztRQUNyQyxPQUFPLENBQUMseUJBQXlCLEdBQUcsT0FBTyxDQUFDLHlC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b29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1ZpZXdwb3J0U2Nyb2xsZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0luamVjdGFibGUsIEluamVjdGlvblRva2VuLCBOZ1pvbmUsIE9uRGVzdHJveX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge1Vuc3Vic2NyaWJhYmxlfSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtOYXZpZ2F0aW9uRW5kLCBOYXZpZ2F0aW9uU2tpcHBlZCwgTmF2aWdhdGlvblNraXBwZWRDb2RlLCBOYXZpZ2F0aW9uU3RhcnQsIFNjcm9sbH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtOYXZpZ2F0aW9uVHJhbnNpdGlvbnN9IGZyb20gJy4vbmF2aWdhdGlvbl90cmFuc2l0aW9uJztcbmltcG9ydCB7VXJsU2VyaWFsaXplcn0gZnJvbSAnLi91cmxfdHJlZSc7XG5cbmV4cG9ydCBjb25zdCBST1VURVJfU0NST0xMRVIgPSBuZXcgSW5qZWN0aW9uVG9rZW48Um91dGVyU2Nyb2xsZXI+KCcnKTtcblxuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIFJvdXRlclNjcm9sbGVyIGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgcHJpdmF0ZSByb3V0ZXJFdmVudHNTdWJzY3JpcHRpb24/OiBVbnN1YnNjcmliYWJsZTtcbiAgcHJpdmF0ZSBzY3JvbGxFdmVudHNTdWJzY3JpcHRpb24/OiBVbnN1YnNjcmliYWJsZTtcblxuICBwcml2YXRlIGxhc3RJZCA9IDA7XG4gIHByaXZhdGUgbGFzdFNvdXJjZTogJ2ltcGVyYXRpdmUnfCdwb3BzdGF0ZSd8J2hhc2hjaGFuZ2UnfHVuZGVmaW5lZCA9ICdpbXBlcmF0aXZlJztcbiAgcHJpdmF0ZSByZXN0b3JlZElkID0gMDtcbiAgcHJpdmF0ZSBzdG9yZToge1trZXk6IHN0cmluZ106IFtudW1iZXIsIG51bWJlcl19ID0ge307XG5cbiAgLyoqIEBub2RvYyAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIHByaXZhdGUgdHJhbnNpdGlvbnM6IE5hdmlnYXRpb25UcmFuc2l0aW9ucyxcbiAgICAgIHB1YmxpYyByZWFkb25seSB2aWV3cG9ydFNjcm9sbGVyOiBWaWV3cG9ydFNjcm9sbGVyLCBwcml2YXRlIHJlYWRvbmx5IHpvbmU6IE5nWm9uZSxcbiAgICAgIHByaXZhdGUgb3B0aW9uczoge1xuICAgICAgICBzY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uPzogJ2Rpc2FibGVkJ3wnZW5hYmxlZCd8J3RvcCcsXG4gICAgICAgIGFuY2hvclNjcm9sbGluZz86ICdkaXNhYmxlZCd8J2VuYWJsZWQnXG4gICAgICB9ID0ge30pIHtcbiAgICAvLyBEZWZhdWx0IGJvdGggb3B0aW9ucyB0byAnZGlzYWJsZWQnXG4gICAgb3B0aW9ucy5zY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uID0gb3B0aW9ucy5zY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uIHx8ICdkaXNhYmxlZCc7XG4gICAgb3B0aW9ucy5hbmNob3JTY3JvbGxpbmcgPSBvcHRpb25zLmFuY2hvclNjcm9sbGluZyB8fCAnZGlzYWJsZWQnO1xuICB9XG5cbiAgaW5pdCgpOiB2b2lkIHtcbiAgICAvLyB3ZSB3YW50IHRvIGRpc2FibGUgdGhlIGF1dG9tYXRpYyBzY3JvbGxpbmcgYmVjYXVzZSBoYXZpbmcgdHdvIHBsYWNlc1xuICAgIC8vIHJlc3BvbnNpYmxlIGZvciBzY3JvbGxpbmcgcmVzdWx0cyByYWNlIGNvbmRpdGlvbnMsIGVzcGVjaWFsbHkgZ2l2ZW5cbiAgICAvLyB0aGF0IGJyb3dzZXIgZG9uJ3QgaW1wbGVtZW50IHRoaXMgYmVoYXZpb3IgY29uc2lzdGVudGx5XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uICE9PSAnZGlzYWJsZWQnKSB7XG4gICAgICB0aGlzLnZpZXdwb3J0U2Nyb2xsZXIuc2V0SGlzdG9yeVNjcm9sbFJlc3RvcmF0aW9uKCdtYW51YWwnKTtcbiAgICB9XG4gICAgdGhpcy5yb3V0ZXJFdmVudHNTdWJzY3JpcHRpb24gPSB0aGlzLmNyZWF0ZVNjcm9sbEV2ZW50cygpO1xuICAgIHRoaXMuc2Nyb2xsRXZlbnRzU3Vic2NyaXB0aW9uID0gdGhpcy5jb25zdW1lU2Nyb2xsRXZlbnRzKCk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVNjcm9sbEV2ZW50cygpIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc2l0aW9ucy5ldmVudHMuc3Vic2NyaWJlKGUgPT4ge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uU3RhcnQpIHtcbiAgICAgICAgLy8gc3RvcmUgdGhlIHNjcm9sbCBwb3NpdGlvbiBvZiB0aGUgY3VycmVudCBzdGFibGUgbmF2aWdhdGlvbnMuXG4gICAgICAgIHRoaXMuc3RvcmVbdGhpcy5sYXN0SWRdID0gdGhpcy52aWV3cG9ydFNjcm9sbGVyLmdldFNjcm9sbFBvc2l0aW9uKCk7XG4gICAgICAgIHRoaXMubGFzdFNvdXJjZSA9IGUubmF2aWdhdGlvblRyaWdnZXI7XG4gICAgICAgIHRoaXMucmVzdG9yZWRJZCA9IGUucmVzdG9yZWRTdGF0ZSA/IGUucmVzdG9yZWRTdGF0ZS5uYXZpZ2F0aW9uSWQgOiAwO1xuICAgICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCkge1xuICAgICAgICB0aGlzLmxhc3RJZCA9IGUuaWQ7XG4gICAgICAgIHRoaXMuc2NoZWR1bGVTY3JvbGxFdmVudChlLCB0aGlzLnVybFNlcmlhbGl6ZXIucGFyc2UoZS51cmxBZnRlclJlZGlyZWN0cykuZnJhZ21lbnQpO1xuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICBlIGluc3RhbmNlb2YgTmF2aWdhdGlvblNraXBwZWQgJiZcbiAgICAgICAgICBlLmNvZGUgPT09IE5hdmlnYXRpb25Ta2lwcGVkQ29kZS5JZ25vcmVkU2FtZVVybE5hdmlnYXRpb24pIHtcbiAgICAgICAgdGhpcy5sYXN0U291cmNlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnJlc3RvcmVkSWQgPSAwO1xuICAgICAgICB0aGlzLnNjaGVkdWxlU2Nyb2xsRXZlbnQoZSwgdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKGUudXJsKS5mcmFnbWVudCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGNvbnN1bWVTY3JvbGxFdmVudHMoKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNpdGlvbnMuZXZlbnRzLnN1YnNjcmliZShlID0+IHtcbiAgICAgIGlmICghKGUgaW5zdGFuY2VvZiBTY3JvbGwpKSByZXR1cm47XG4gICAgICAvLyBhIHBvcHN0YXRlIGV2ZW50LiBUaGUgcG9wIHN0YXRlIGV2ZW50IHdpbGwgYWx3YXlzIGlnbm9yZSBhbmNob3Igc2Nyb2xsaW5nLlxuICAgICAgaWYgKGUucG9zaXRpb24pIHtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uID09PSAndG9wJykge1xuICAgICAgICAgIHRoaXMudmlld3BvcnRTY3JvbGxlci5zY3JvbGxUb1Bvc2l0aW9uKFswLCAwXSk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLnNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb24gPT09ICdlbmFibGVkJykge1xuICAgICAgICAgIHRoaXMudmlld3BvcnRTY3JvbGxlci5zY3JvbGxUb1Bvc2l0aW9uKGUucG9zaXRpb24pO1xuICAgICAgICB9XG4gICAgICAgIC8vIGltcGVyYXRpdmUgbmF2aWdhdGlvbiBcImZvcndhcmRcIlxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGUuYW5jaG9yICYmIHRoaXMub3B0aW9ucy5hbmNob3JTY3JvbGxpbmcgPT09ICdlbmFibGVkJykge1xuICAgICAgICAgIHRoaXMudmlld3BvcnRTY3JvbGxlci5zY3JvbGxUb0FuY2hvcihlLmFuY2hvcik7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLnNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb24gIT09ICdkaXNhYmxlZCcpIHtcbiAgICAgICAgICB0aGlzLnZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9Qb3NpdGlvbihbMCwgMF0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHNjaGVkdWxlU2Nyb2xsRXZlbnQocm91dGVyRXZlbnQ6IE5hdmlnYXRpb25FbmR8TmF2aWdhdGlvblNraXBwZWQsIGFuY2hvcjogc3RyaW5nfG51bGwpOlxuICAgICAgdm9pZCB7XG4gICAgdGhpcy56b25lLnJ1bk91dHNpZGVBbmd1bGFyKCgpID0+IHtcbiAgICAgIC8vIFRoZSBzY3JvbGwgZXZlbnQgbmVlZHMgdG8gYmUgZGVsYXllZCB1bnRpbCBhZnRlciBjaGFuZ2UgZGV0ZWN0aW9uLiBPdGhlcndpc2UsIHdlIG1heVxuICAgICAgLy8gYXR0ZW1wdCB0byByZXN0b3JlIHRoZSBzY3JvbGwgcG9zaXRpb24gYmVmb3JlIHRoZSByb3V0ZXIgb3V0bGV0IGhhcyBmdWxseSByZW5kZXJlZCB0aGVcbiAgICAgIC8vIGNvbXBvbmVudCBieSBleGVjdXRpbmcgaXRzIHVwZGF0ZSBibG9jayBvZiB0aGUgdGVtcGxhdGUgZnVuY3Rpb24uXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy56b25lLnJ1bigoKSA9PiB7XG4gICAgICAgICAgdGhpcy50cmFuc2l0aW9ucy5ldmVudHMubmV4dChuZXcgU2Nyb2xsKFxuICAgICAgICAgICAgICByb3V0ZXJFdmVudCwgdGhpcy5sYXN0U291cmNlID09PSAncG9wc3RhdGUnID8gdGhpcy5zdG9yZVt0aGlzLnJlc3RvcmVkSWRdIDogbnVsbCxcbiAgICAgICAgICAgICAgYW5jaG9yKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSwgMCk7XG4gICAgfSk7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25EZXN0cm95KCkge1xuICAgIHRoaXMucm91dGVyRXZlbnRzU3Vic2NyaXB0aW9uPy51bnN1YnNjcmliZSgpO1xuICAgIHRoaXMuc2Nyb2xsRXZlbnRzU3Vic2NyaXB0aW9uPy51bnN1YnNjcmliZSgpO1xuICB9XG59XG4iXX0=