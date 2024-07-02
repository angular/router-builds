/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ViewportScroller } from '@angular/common';
import { EnvironmentInjector, Injectable, InjectionToken, NgZone, afterNextRender, inject, } from '@angular/core';
import { NavigationEnd, NavigationSkipped, NavigationSkippedCode, NavigationStart, Scroll, } from './events';
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
        this.environmentInjector = inject(EnvironmentInjector);
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
        return this.transitions.events.subscribe((e) => {
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
        return this.transitions.events.subscribe((e) => {
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
        this.zone.runOutsideAngular(async () => {
            // The scroll event needs to be delayed until after change detection. Otherwise we may
            // attempt to restore the scroll position before the router outlet has fully rendered the
            // component by executing its update block of the template function.
            await new Promise((resolve) => {
                // TODO(atscott): Attempt to remove the setTimeout in a future PR.
                setTimeout(() => {
                    resolve();
                });
                afterNextRender(() => {
                    resolve();
                }, { injector: this.environmentInjector });
            });
            this.zone.run(() => {
                this.transitions.events.next(new Scroll(routerEvent, this.lastSource === 'popstate' ? this.store[this.restoredId] : null, anchor));
            });
        });
    }
    /** @nodoc */
    ngOnDestroy() {
        this.routerEventsSubscription?.unsubscribe();
        this.scrollEventsSubscription?.unsubscribe();
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.5+sha-19c70d8", ngImport: i0, type: RouterScroller, deps: "invalid", target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.0.5+sha-19c70d8", ngImport: i0, type: RouterScroller }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.5+sha-19c70d8", ngImport: i0, type: RouterScroller, decorators: [{
            type: Injectable
        }], ctorParameters: () => [{ type: i1.UrlSerializer }, { type: i2.NavigationTransitions }, { type: i3.ViewportScroller }, { type: i0.NgZone }, { type: undefined }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Njcm9sbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXJfc2Nyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDakQsT0FBTyxFQUNMLG1CQUFtQixFQUNuQixVQUFVLEVBQ1YsY0FBYyxFQUNkLE1BQU0sRUFFTixlQUFlLEVBQ2YsTUFBTSxHQUNQLE1BQU0sZUFBZSxDQUFDO0FBR3ZCLE9BQU8sRUFDTCxhQUFhLEVBQ2IsaUJBQWlCLEVBQ2pCLHFCQUFxQixFQUNyQixlQUFlLEVBQ2YsTUFBTSxHQUNQLE1BQU0sVUFBVSxDQUFDO0FBQ2xCLE9BQU8sRUFBQyxxQkFBcUIsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQzlELE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSxZQUFZLENBQUM7Ozs7O0FBRXpDLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxJQUFJLGNBQWMsQ0FBaUIsRUFBRSxDQUFDLENBQUM7QUFHdEUsTUFBTSxPQUFPLGNBQWM7SUFVekIsYUFBYTtJQUNiLFlBQ1csYUFBNEIsRUFDN0IsV0FBa0MsRUFDMUIsZ0JBQWtDLEVBQ2pDLElBQVksRUFDckIsVUFHSixFQUFFO1FBUEcsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDN0IsZ0JBQVcsR0FBWCxXQUFXLENBQXVCO1FBQzFCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDakMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNyQixZQUFPLEdBQVAsT0FBTyxDQUdUO1FBZkEsV0FBTSxHQUFHLENBQUMsQ0FBQztRQUNYLGVBQVUsR0FBeUQsWUFBWSxDQUFDO1FBQ2hGLGVBQVUsR0FBRyxDQUFDLENBQUM7UUFDZixVQUFLLEdBQXNDLEVBQUUsQ0FBQztRQUNyQyx3QkFBbUIsR0FB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QUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUNuRSxNQUFNLENBQ1AsQ0FDRixDQUFDO1lBQ0osQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxhQUFhO0lBQ2IsV0FBVztRQUNULElBQUksQ0FBQyx3QkFBd0IsRUFBRSxXQUFXLEVBQUUsQ0FBQztRQUM3QyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsV0FBVyxFQUFFLENBQUM7SUFDL0MsQ0FBQzt5SEFwSFUsY0FBYzs2SEFBZCxjQUFjOztzR0FBZCxjQUFjO2tCQUQxQixVQUFVIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Vmlld3BvcnRTY3JvbGxlcn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7XG4gIEVudmlyb25tZW50SW5qZWN0b3IsXG4gIEluamVjdGFibGUsXG4gIEluamVjdGlvblRva2VuLFxuICBOZ1pvbmUsXG4gIE9uRGVzdHJveSxcbiAgYWZ0ZXJOZXh0UmVuZGVyLFxuICBpbmplY3QsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtVbnN1YnNjcmliYWJsZX0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7XG4gIE5hdmlnYXRpb25FbmQsXG4gIE5hdmlnYXRpb25Ta2lwcGVkLFxuICBOYXZpZ2F0aW9uU2tpcHBlZENvZGUsXG4gIE5hdmlnYXRpb25TdGFydCxcbiAgU2Nyb2xsLFxufSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge05hdmlnYXRpb25UcmFuc2l0aW9uc30gZnJvbSAnLi9uYXZpZ2F0aW9uX3RyYW5zaXRpb24nO1xuaW1wb3J0IHtVcmxTZXJpYWxpemVyfSBmcm9tICcuL3VybF90cmVlJztcblxuZXhwb3J0IGNvbnN0IFJPVVRFUl9TQ1JPTExFUiA9IG5ldyBJbmplY3Rpb25Ub2tlbjxSb3V0ZXJTY3JvbGxlcj4oJycpO1xuXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgUm91dGVyU2Nyb2xsZXIgaW1wbGVtZW50cyBPbkRlc3Ryb3kge1xuICBwcml2YXRlIHJvdXRlckV2ZW50c1N1YnNjcmlwdGlvbj86IFVuc3Vic2NyaWJhYmxlO1xuICBwcml2YXRlIHNjcm9sbEV2ZW50c1N1YnNjcmlwdGlvbj86IFVuc3Vic2NyaWJhYmxlO1xuXG4gIHByaXZhdGUgbGFzdElkID0gMDtcbiAgcHJpdmF0ZSBsYXN0U291cmNlOiAnaW1wZXJhdGl2ZScgfCAncG9wc3RhdGUnIHwgJ2hhc2hjaGFuZ2UnIHwgdW5kZWZpbmVkID0gJ2ltcGVyYXRpdmUnO1xuICBwcml2YXRlIHJlc3RvcmVkSWQgPSAwO1xuICBwcml2YXRlIHN0b3JlOiB7W2tleTogc3RyaW5nXTogW251bWJlciwgbnVtYmVyXX0gPSB7fTtcbiAgcHJpdmF0ZSByZWFkb25seSBlbnZpcm9ubWVudEluamVjdG9yID0gaW5qZWN0KEVudmlyb25tZW50SW5qZWN0b3IpO1xuXG4gIC8qKiBAbm9kb2MgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgcmVhZG9ubHkgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICBwcml2YXRlIHRyYW5zaXRpb25zOiBOYXZpZ2F0aW9uVHJhbnNpdGlvbnMsXG4gICAgcHVibGljIHJlYWRvbmx5IHZpZXdwb3J0U2Nyb2xsZXI6IFZpZXdwb3J0U2Nyb2xsZXIsXG4gICAgcHJpdmF0ZSByZWFkb25seSB6b25lOiBOZ1pvbmUsXG4gICAgcHJpdmF0ZSBvcHRpb25zOiB7XG4gICAgICBzY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uPzogJ2Rpc2FibGVkJyB8ICdlbmFibGVkJyB8ICd0b3AnO1xuICAgICAgYW5jaG9yU2Nyb2xsaW5nPzogJ2Rpc2FibGVkJyB8ICdlbmFibGVkJztcbiAgICB9ID0ge30sXG4gICkge1xuICAgIC8vIERlZmF1bHQgYm90aCBvcHRpb25zIHRvICdkaXNhYmxlZCdcbiAgICBvcHRpb25zLnNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb24gfHw9ICdkaXNhYmxlZCc7XG4gICAgb3B0aW9ucy5hbmNob3JTY3JvbGxpbmcgfHw9ICdkaXNhYmxlZCc7XG4gIH1cblxuICBpbml0KCk6IHZvaWQge1xuICAgIC8vIHdlIHdhbnQgdG8gZGlzYWJsZSB0aGUgYXV0b21hdGljIHNjcm9sbGluZyBiZWNhdXNlIGhhdmluZyB0d28gcGxhY2VzXG4gICAgLy8gcmVzcG9uc2libGUgZm9yIHNjcm9sbGluZyByZXN1bHRzIHJhY2UgY29uZGl0aW9ucywgZXNwZWNpYWxseSBnaXZlblxuICAgIC8vIHRoYXQgYnJvd3NlciBkb24ndCBpbXBsZW1lbnQgdGhpcyBiZWhhdmlvciBjb25zaXN0ZW50bHlcbiAgICBpZiAodGhpcy5vcHRpb25zLnNjcm9sbFBvc2l0aW9uUmVzdG9yYXRpb24gIT09ICdkaXNhYmxlZCcpIHtcbiAgICAgIHRoaXMudmlld3BvcnRTY3JvbGxlci5zZXRIaXN0b3J5U2Nyb2xsUmVzdG9yYXRpb24oJ21hbnVhbCcpO1xuICAgIH1cbiAgICB0aGlzLnJvdXRlckV2ZW50c1N1YnNjcmlwdGlvbiA9IHRoaXMuY3JlYXRlU2Nyb2xsRXZlbnRzKCk7XG4gICAgdGhpcy5zY3JvbGxFdmVudHNTdWJzY3JpcHRpb24gPSB0aGlzLmNvbnN1bWVTY3JvbGxFdmVudHMoKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlU2Nyb2xsRXZlbnRzKCkge1xuICAgIHJldHVybiB0aGlzLnRyYW5zaXRpb25zLmV2ZW50cy5zdWJzY3JpYmUoKGUpID0+IHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvblN0YXJ0KSB7XG4gICAgICAgIC8vIHN0b3JlIHRoZSBzY3JvbGwgcG9zaXRpb24gb2YgdGhlIGN1cnJlbnQgc3RhYmxlIG5hdmlnYXRpb25zLlxuICAgICAgICB0aGlzLnN0b3JlW3RoaXMubGFzdElkXSA9IHRoaXMudmlld3BvcnRTY3JvbGxlci5nZXRTY3JvbGxQb3NpdGlvbigpO1xuICAgICAgICB0aGlzLmxhc3RTb3VyY2UgPSBlLm5hdmlnYXRpb25UcmlnZ2VyO1xuICAgICAgICB0aGlzLnJlc3RvcmVkSWQgPSBlLnJlc3RvcmVkU3RhdGUgPyBlLnJlc3RvcmVkU3RhdGUubmF2aWdhdGlvbklkIDogMDtcbiAgICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpIHtcbiAgICAgICAgdGhpcy5sYXN0SWQgPSBlLmlkO1xuICAgICAgICB0aGlzLnNjaGVkdWxlU2Nyb2xsRXZlbnQoZSwgdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKGUudXJsQWZ0ZXJSZWRpcmVjdHMpLmZyYWdtZW50KTtcbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uU2tpcHBlZCAmJlxuICAgICAgICBlLmNvZGUgPT09IE5hdmlnYXRpb25Ta2lwcGVkQ29kZS5JZ25vcmVkU2FtZVVybE5hdmlnYXRpb25cbiAgICAgICkge1xuICAgICAgICB0aGlzLmxhc3RTb3VyY2UgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMucmVzdG9yZWRJZCA9IDA7XG4gICAgICAgIHRoaXMuc2NoZWR1bGVTY3JvbGxFdmVudChlLCB0aGlzLnVybFNlcmlhbGl6ZXIucGFyc2UoZS51cmwpLmZyYWdtZW50KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY29uc3VtZVNjcm9sbEV2ZW50cygpIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc2l0aW9ucy5ldmVudHMuc3Vic2NyaWJlKChlKSA9PiB7XG4gICAgICBpZiAoIShlIGluc3RhbmNlb2YgU2Nyb2xsKSkgcmV0dXJuO1xuICAgICAgLy8gYSBwb3BzdGF0ZSBldmVudC4gVGhlIHBvcCBzdGF0ZSBldmVudCB3aWxsIGFsd2F5cyBpZ25vcmUgYW5jaG9yIHNjcm9sbGluZy5cbiAgICAgIGlmIChlLnBvc2l0aW9uKSB7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2Nyb2xsUG9zaXRpb25SZXN0b3JhdGlvbiA9PT0gJ3RvcCcpIHtcbiAgICAgICAgICB0aGlzLnZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9Qb3NpdGlvbihbMCwgMF0pO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uID09PSAnZW5hYmxlZCcpIHtcbiAgICAgICAgICB0aGlzLnZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9Qb3NpdGlvbihlLnBvc2l0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBpbXBlcmF0aXZlIG5hdmlnYXRpb24gXCJmb3J3YXJkXCJcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChlLmFuY2hvciAmJiB0aGlzLm9wdGlvbnMuYW5jaG9yU2Nyb2xsaW5nID09PSAnZW5hYmxlZCcpIHtcbiAgICAgICAgICB0aGlzLnZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9BbmNob3IoZS5hbmNob3IpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uICE9PSAnZGlzYWJsZWQnKSB7XG4gICAgICAgICAgdGhpcy52aWV3cG9ydFNjcm9sbGVyLnNjcm9sbFRvUG9zaXRpb24oWzAsIDBdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBzY2hlZHVsZVNjcm9sbEV2ZW50KFxuICAgIHJvdXRlckV2ZW50OiBOYXZpZ2F0aW9uRW5kIHwgTmF2aWdhdGlvblNraXBwZWQsXG4gICAgYW5jaG9yOiBzdHJpbmcgfCBudWxsLFxuICApOiB2b2lkIHtcbiAgICB0aGlzLnpvbmUucnVuT3V0c2lkZUFuZ3VsYXIoYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gVGhlIHNjcm9sbCBldmVudCBuZWVkcyB0byBiZSBkZWxheWVkIHVudGlsIGFmdGVyIGNoYW5nZSBkZXRlY3Rpb24uIE90aGVyd2lzZSB3ZSBtYXlcbiAgICAgIC8vIGF0dGVtcHQgdG8gcmVzdG9yZSB0aGUgc2Nyb2xsIHBvc2l0aW9uIGJlZm9yZSB0aGUgcm91dGVyIG91dGxldCBoYXMgZnVsbHkgcmVuZGVyZWQgdGhlXG4gICAgICAvLyBjb21wb25lbnQgYnkgZXhlY3V0aW5nIGl0cyB1cGRhdGUgYmxvY2sgb2YgdGhlIHRlbXBsYXRlIGZ1bmN0aW9uLlxuICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHtcbiAgICAgICAgLy8gVE9ETyhhdHNjb3R0KTogQXR0ZW1wdCB0byByZW1vdmUgdGhlIHNldFRpbWVvdXQgaW4gYSBmdXR1cmUgUFIuXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGFmdGVyTmV4dFJlbmRlcihcbiAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICB7aW5qZWN0b3I6IHRoaXMuZW52aXJvbm1lbnRJbmplY3Rvcn0sXG4gICAgICAgICk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy56b25lLnJ1bigoKSA9PiB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvbnMuZXZlbnRzLm5leHQoXG4gICAgICAgICAgbmV3IFNjcm9sbChcbiAgICAgICAgICAgIHJvdXRlckV2ZW50LFxuICAgICAgICAgICAgdGhpcy5sYXN0U291cmNlID09PSAncG9wc3RhdGUnID8gdGhpcy5zdG9yZVt0aGlzLnJlc3RvcmVkSWRdIDogbnVsbCxcbiAgICAgICAgICAgIGFuY2hvcixcbiAgICAgICAgICApLFxuICAgICAgICApO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKiogQG5vZG9jICovXG4gIG5nT25EZXN0cm95KCkge1xuICAgIHRoaXMucm91dGVyRXZlbnRzU3Vic2NyaXB0aW9uPy51bnN1YnNjcmliZSgpO1xuICAgIHRoaXMuc2Nyb2xsRXZlbnRzU3Vic2NyaXB0aW9uPy51bnN1YnNjcmliZSgpO1xuICB9XG59XG4iXX0=