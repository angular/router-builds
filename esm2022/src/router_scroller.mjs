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
        options.scrollPositionRestoration ||= 'disabled';
        options.anchorScrolling ||= 'disabled';
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.1.2+sha-9e3d54c", ngImport: i0, type: RouterScroller, deps: "invalid", target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.1.2+sha-9e3d54c", ngImport: i0, type: RouterScroller }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.1.2+sha-9e3d54c", ngImport: i0, type: RouterScroller, decorators: [{
            type: Injectable
        }], ctorParameters: () => [{ type: i1.UrlSerializer }, { type: i2.NavigationTransitions }, { type: i3.ViewportScroller }, { type: i0.NgZone }, { type: undefined }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Njcm9sbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXJfc2Nyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDakQsT0FBTyxFQUFDLFVBQVUsRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFZLE1BQU0sZUFBZSxDQUFDO0FBRzVFLE9BQU8sRUFBQyxhQUFhLEVBQUUsaUJBQWlCLEVBQUUscUJBQXFCLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUMxRyxPQUFPLEVBQUMscUJBQXFCLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RCxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0sWUFBWSxDQUFDOzs7OztBQUV6QyxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsSUFBSSxjQUFjLENBQWlCLEVBQUUsQ0FBQyxDQUFDO0FBR3RFLE1BQU0sT0FBTyxjQUFjO0lBU3pCLGFBQWE7SUFDYixZQUNhLGFBQTRCLEVBQVUsV0FBa0MsRUFDakUsZ0JBQWtDLEVBQW1CLElBQVksRUFDekUsVUFHSixFQUFFO1FBTEcsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFBVSxnQkFBVyxHQUFYLFdBQVcsQ0FBdUI7UUFDakUscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUFtQixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ3pFLFlBQU8sR0FBUCxPQUFPLENBR1Q7UUFaRixXQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ1gsZUFBVSxHQUFtRCxZQUFZLENBQUM7UUFDMUUsZUFBVSxHQUFHLENBQUMsQ0FBQztRQUNmLFVBQUssR0FBc0MsRUFBRSxDQUFDO1FBVXBELHFDQUFxQztRQUNyQyxPQUFPLENBQUMseUJBQXlCLEtBQUssVUFBVSxDQUFDO1FB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LFVBQVUiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtWaWV3cG9ydFNjcm9sbGVyfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtJbmplY3RhYmxlLCBJbmplY3Rpb25Ub2tlbiwgTmdab25lLCBPbkRlc3Ryb3l9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtVbnN1YnNjcmliYWJsZX0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7TmF2aWdhdGlvbkVuZCwgTmF2aWdhdGlvblNraXBwZWQsIE5hdmlnYXRpb25Ta2lwcGVkQ29kZSwgTmF2aWdhdGlvblN0YXJ0LCBTY3JvbGx9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7TmF2aWdhdGlvblRyYW5zaXRpb25zfSBmcm9tICcuL25hdmlnYXRpb25fdHJhbnNpdGlvbic7XG5pbXBvcnQge1VybFNlcmlhbGl6ZXJ9IGZyb20gJy4vdXJsX3RyZWUnO1xuXG5leHBvcnQgY29uc3QgUk9VVEVSX1NDUk9MTEVSID0gbmV3IEluamVjdGlvblRva2VuPFJvdXRlclNjcm9sbGVyPignJyk7XG5cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBSb3V0ZXJTY3JvbGxlciBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIHByaXZhdGUgcm91dGVyRXZlbnRzU3Vic2NyaXB0aW9uPzogVW5zdWJzY3JpYmFibGU7XG4gIHByaXZhdGUgc2Nyb2xsRXZlbnRzU3Vic2NyaXB0aW9uPzogVW5zdWJzY3JpYmFibGU7XG5cbiAgcHJpdmF0ZSBsYXN0SWQgPSAwO1xuICBwcml2YXRlIGxhc3RTb3VyY2U6ICdpbXBlcmF0aXZlJ3wncG9wc3RhdGUnfCdoYXNoY2hhbmdlJ3x1bmRlZmluZWQgPSAnaW1wZXJhdGl2ZSc7XG4gIHByaXZhdGUgcmVzdG9yZWRJZCA9IDA7XG4gIHByaXZhdGUgc3RvcmU6IHtba2V5OiBzdHJpbmddOiBbbnVtYmVyLCBudW1iZXJdfSA9IHt9O1xuXG4gIC8qKiBAbm9kb2MgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLCBwcml2YXRlIHRyYW5zaXRpb25zOiBOYXZpZ2F0aW9uVHJhbnNpdGlvbnMsXG4gICAgICBwdWJsaWMgcmVhZG9ubHkgdmlld3BvcnRTY3JvbGxlcjogVmlld3BvcnRTY3JvbGxlciwgcHJpdmF0ZSByZWFkb25seSB6b25lOiBOZ1pvbmUsXG4gICAgICBwcml2YXRlIG9wdGlvbnM6IHtcbiAgICAgICAgc2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvbj86ICdkaXNhYmxlZCd8J2VuYWJsZWQnfCd0b3AnLFxuICAgICAgICBhbmNob3JTY3JvbGxpbmc/OiAnZGlzYWJsZWQnfCdlbmFibGVkJ1xuICAgICAgfSA9IHt9KSB7XG4gICAgLy8gRGVmYXVsdCBib3RoIG9wdGlvbnMgdG8gJ2Rpc2FibGVkJ1xuICAgIG9wdGlvbnMuc2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvbiB8fD0gJ2Rpc2FibGVkJztcbiAgICBvcHRpb25zLmFuY2hvclNjcm9sbGluZyB8fD0gJ2Rpc2FibGVkJztcbiAgfVxuXG4gIGluaXQoKTogdm9pZCB7XG4gICAgLy8gd2Ugd2FudCB0byBkaXNhYmxlIHRoZSBhdXRvbWF0aWMgc2Nyb2xsaW5nIGJlY2F1c2UgaGF2aW5nIHR3byBwbGFjZXNcbiAgICAvLyByZXNwb25zaWJsZSBmb3Igc2Nyb2xsaW5nIHJlc3VsdHMgcmFjZSBjb25kaXRpb25zLCBlc3BlY2lhbGx5IGdpdmVuXG4gICAgLy8gdGhhdCBicm93c2VyIGRvbid0IGltcGxlbWVudCB0aGlzIGJlaGF2aW9yIGNvbnNpc3RlbnRseVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvbiAhPT0gJ2Rpc2FibGVkJykge1xuICAgICAgdGhpcy52aWV3cG9ydFNjcm9sbGVyLnNldEhpc3RvcnlTY3JvbGxSZXN0b3JhdGlvbignbWFudWFsJyk7XG4gICAgfVxuICAgIHRoaXMucm91dGVyRXZlbnRzU3Vic2NyaXB0aW9uID0gdGhpcy5jcmVhdGVTY3JvbGxFdmVudHMoKTtcbiAgICB0aGlzLnNjcm9sbEV2ZW50c1N1YnNjcmlwdGlvbiA9IHRoaXMuY29uc3VtZVNjcm9sbEV2ZW50cygpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVTY3JvbGxFdmVudHMoKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNpdGlvbnMuZXZlbnRzLnN1YnNjcmliZShlID0+IHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvblN0YXJ0KSB7XG4gICAgICAgIC8vIHN0b3JlIHRoZSBzY3JvbGwgcG9zaXRpb24gb2YgdGhlIGN1cnJlbnQgc3RhYmxlIG5hdmlnYXRpb25zLlxuICAgICAgICB0aGlzLnN0b3JlW3RoaXMubGFzdElkXSA9IHRoaXMudmlld3BvcnRTY3JvbGxlci5nZXRTY3JvbGxQb3NpdGlvbigpO1xuICAgICAgICB0aGlzLmxhc3RTb3VyY2UgPSBlLm5hdmlnYXRpb25UcmlnZ2VyO1xuICAgICAgICB0aGlzLnJlc3RvcmVkSWQgPSBlLnJlc3RvcmVkU3RhdGUgPyBlLnJlc3RvcmVkU3RhdGUubmF2aWdhdGlvbklkIDogMDtcbiAgICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpIHtcbiAgICAgICAgdGhpcy5sYXN0SWQgPSBlLmlkO1xuICAgICAgICB0aGlzLnNjaGVkdWxlU2Nyb2xsRXZlbnQoZSwgdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKGUudXJsQWZ0ZXJSZWRpcmVjdHMpLmZyYWdtZW50KTtcbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25Ta2lwcGVkICYmXG4gICAgICAgICAgZS5jb2RlID09PSBOYXZpZ2F0aW9uU2tpcHBlZENvZGUuSWdub3JlZFNhbWVVcmxOYXZpZ2F0aW9uKSB7XG4gICAgICAgIHRoaXMubGFzdFNvdXJjZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5yZXN0b3JlZElkID0gMDtcbiAgICAgICAgdGhpcy5zY2hlZHVsZVNjcm9sbEV2ZW50KGUsIHRoaXMudXJsU2VyaWFsaXplci5wYXJzZShlLnVybCkuZnJhZ21lbnQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjb25zdW1lU2Nyb2xsRXZlbnRzKCkge1xuICAgIHJldHVybiB0aGlzLnRyYW5zaXRpb25zLmV2ZW50cy5zdWJzY3JpYmUoZSA9PiB7XG4gICAgICBpZiAoIShlIGluc3RhbmNlb2YgU2Nyb2xsKSkgcmV0dXJuO1xuICAgICAgLy8gYSBwb3BzdGF0ZSBldmVudC4gVGhlIHBvcCBzdGF0ZSBldmVudCB3aWxsIGFsd2F5cyBpZ25vcmUgYW5jaG9yIHNjcm9sbGluZy5cbiAgICAgIGlmIChlLnBvc2l0aW9uKSB7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvbiA9PT0gJ3RvcCcpIHtcbiAgICAgICAgICB0aGlzLnZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9Qb3NpdGlvbihbMCwgMF0pO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uID09PSAnZW5hYmxlZCcpIHtcbiAgICAgICAgICB0aGlzLnZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9Qb3NpdGlvbihlLnBvc2l0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBpbXBlcmF0aXZlIG5hdmlnYXRpb24gXCJmb3J3YXJkXCJcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChlLmFuY2hvciAmJiB0aGlzLm9wdGlvbnMuYW5jaG9yU2Nyb2xsaW5nID09PSAnZW5hYmxlZCcpIHtcbiAgICAgICAgICB0aGlzLnZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9BbmNob3IoZS5hbmNob3IpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uICE9PSAnZGlzYWJsZWQnKSB7XG4gICAgICAgICAgdGhpcy52aWV3cG9ydFNjcm9sbGVyLnNjcm9sbFRvUG9zaXRpb24oWzAsIDBdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzY2hlZHVsZVNjcm9sbEV2ZW50KHJvdXRlckV2ZW50OiBOYXZpZ2F0aW9uRW5kfE5hdmlnYXRpb25Ta2lwcGVkLCBhbmNob3I6IHN0cmluZ3xudWxsKTpcbiAgICAgIHZvaWQge1xuICAgIHRoaXMuem9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiB7XG4gICAgICAvLyBUaGUgc2Nyb2xsIGV2ZW50IG5lZWRzIHRvIGJlIGRlbGF5ZWQgdW50aWwgYWZ0ZXIgY2hhbmdlIGRldGVjdGlvbi4gT3RoZXJ3aXNlLCB3ZSBtYXlcbiAgICAgIC8vIGF0dGVtcHQgdG8gcmVzdG9yZSB0aGUgc2Nyb2xsIHBvc2l0aW9uIGJlZm9yZSB0aGUgcm91dGVyIG91dGxldCBoYXMgZnVsbHkgcmVuZGVyZWQgdGhlXG4gICAgICAvLyBjb21wb25lbnQgYnkgZXhlY3V0aW5nIGl0cyB1cGRhdGUgYmxvY2sgb2YgdGhlIHRlbXBsYXRlIGZ1bmN0aW9uLlxuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMuem9uZS5ydW4oKCkgPT4ge1xuICAgICAgICAgIHRoaXMudHJhbnNpdGlvbnMuZXZlbnRzLm5leHQobmV3IFNjcm9sbChcbiAgICAgICAgICAgICAgcm91dGVyRXZlbnQsIHRoaXMubGFzdFNvdXJjZSA9PT0gJ3BvcHN0YXRlJyA/IHRoaXMuc3RvcmVbdGhpcy5yZXN0b3JlZElkXSA6IG51bGwsXG4gICAgICAgICAgICAgIGFuY2hvcikpO1xuICAgICAgICB9KTtcbiAgICAgIH0sIDApO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpIHtcbiAgICB0aGlzLnJvdXRlckV2ZW50c1N1YnNjcmlwdGlvbj8udW5zdWJzY3JpYmUoKTtcbiAgICB0aGlzLnNjcm9sbEV2ZW50c1N1YnNjcmlwdGlvbj8udW5zdWJzY3JpYmUoKTtcbiAgfVxufVxuIl19