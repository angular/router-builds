/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { BeforeActivateRoutes, NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, NavigationStart, RoutesRecognized, } from '../events';
import { ROUTER_CONFIGURATION } from '../router_config';
import { createEmptyState } from '../router_state';
import { UrlHandlingStrategy } from '../url_handling_strategy';
import { UrlSerializer, UrlTree } from '../url_tree';
import * as i0 from "@angular/core";
export class StateManager {
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-dcc4a80", ngImport: i0, type: StateManager, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-dcc4a80", ngImport: i0, type: StateManager, providedIn: 'root', useFactory: () => inject(HistoryStateManager) }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-dcc4a80", ngImport: i0, type: StateManager, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root', useFactory: () => inject(HistoryStateManager) }]
        }] });
export class HistoryStateManager extends StateManager {
    constructor() {
        super(...arguments);
        this.location = inject(Location);
        this.urlSerializer = inject(UrlSerializer);
        this.options = inject(ROUTER_CONFIGURATION, { optional: true }) || {};
        this.canceledNavigationResolution = this.options.canceledNavigationResolution || 'replace';
        this.urlHandlingStrategy = inject(UrlHandlingStrategy);
        this.urlUpdateStrategy = this.options.urlUpdateStrategy || 'deferred';
        this.currentUrlTree = new UrlTree();
        this.rawUrlTree = this.currentUrlTree;
        /**
         * The id of the currently active page in the router.
         * Updated to the transition's target id on a successful navigation.
         *
         * This is used to track what page the router last activated. When an attempted navigation fails,
         * the router can then use this to compute how to restore the state back to the previously active
         * page.
         */
        this.currentPageId = 0;
        this.lastSuccessfulId = -1;
        this.routerState = createEmptyState(this.currentUrlTree, null);
        this.stateMemento = this.createStateMemento();
    }
    getCurrentUrlTree() {
        return this.currentUrlTree;
    }
    getRawUrlTree() {
        return this.rawUrlTree;
    }
    restoredState() {
        return this.location.getState();
    }
    /**
     * The ɵrouterPageId of whatever page is currently active in the browser history. This is
     * important for computing the target page id for new navigations because we need to ensure each
     * page id in the browser history is 1 more than the previous entry.
     */
    get browserPageId() {
        if (this.canceledNavigationResolution !== 'computed') {
            return this.currentPageId;
        }
        return this.restoredState()?.ɵrouterPageId ?? this.currentPageId;
    }
    getRouterState() {
        return this.routerState;
    }
    createStateMemento() {
        return {
            rawUrlTree: this.rawUrlTree,
            currentUrlTree: this.currentUrlTree,
            routerState: this.routerState,
        };
    }
    registerNonRouterCurrentEntryChangeListener(listener) {
        return this.location.subscribe(event => {
            if (event['type'] === 'popstate') {
                listener(event['url'], event.state);
            }
        });
    }
    handleRouterEvent(e, currentTransition) {
        if (e instanceof NavigationStart) {
            this.stateMemento = this.createStateMemento();
        }
        else if (e instanceof NavigationSkipped) {
            this.rawUrlTree = currentTransition.initialUrl;
        }
        else if (e instanceof RoutesRecognized) {
            if (this.urlUpdateStrategy === 'eager') {
                if (!currentTransition.extras.skipLocationChange) {
                    const rawUrl = this.urlHandlingStrategy.merge(currentTransition.finalUrl, currentTransition.initialUrl);
                    this.setBrowserUrl(rawUrl, currentTransition);
                }
            }
        }
        else if (e instanceof BeforeActivateRoutes) {
            this.currentUrlTree = currentTransition.finalUrl;
            this.rawUrlTree =
                this.urlHandlingStrategy.merge(currentTransition.finalUrl, currentTransition.initialUrl);
            this.routerState = currentTransition.targetRouterState;
            if (this.urlUpdateStrategy === 'deferred') {
                if (!currentTransition.extras.skipLocationChange) {
                    this.setBrowserUrl(this.rawUrlTree, currentTransition);
                }
            }
        }
        else if (e instanceof NavigationCancel &&
            (e.code === 3 /* NavigationCancellationCode.GuardRejected */ ||
                e.code === 2 /* NavigationCancellationCode.NoDataFromResolver */)) {
            this.restoreHistory(currentTransition);
        }
        else if (e instanceof NavigationError) {
            this.restoreHistory(currentTransition, true);
        }
        else if (e instanceof NavigationEnd) {
            this.lastSuccessfulId = e.id;
            this.currentPageId = this.browserPageId;
        }
    }
    setBrowserUrl(url, transition) {
        const path = this.urlSerializer.serialize(url);
        if (this.location.isCurrentPathEqualTo(path) || !!transition.extras.replaceUrl) {
            // replacements do not update the target page
            const currentBrowserPageId = this.browserPageId;
            const state = {
                ...transition.extras.state,
                ...this.generateNgRouterState(transition.id, currentBrowserPageId)
            };
            this.location.replaceState(path, '', state);
        }
        else {
            const state = {
                ...transition.extras.state,
                ...this.generateNgRouterState(transition.id, this.browserPageId + 1)
            };
            this.location.go(path, '', state);
        }
    }
    /**
     * Performs the necessary rollback action to restore the browser URL to the
     * state before the transition.
     */
    restoreHistory(navigation, restoringFromCaughtError = false) {
        if (this.canceledNavigationResolution === 'computed') {
            const currentBrowserPageId = this.browserPageId;
            const targetPagePosition = this.currentPageId - currentBrowserPageId;
            if (targetPagePosition !== 0) {
                this.location.historyGo(targetPagePosition);
            }
            else if (this.currentUrlTree === navigation.finalUrl && targetPagePosition === 0) {
                // We got to the activation stage (where currentUrlTree is set to the navigation's
                // finalUrl), but we weren't moving anywhere in history (skipLocationChange or replaceUrl).
                // We still need to reset the router state back to what it was when the navigation started.
                this.resetState(navigation);
                this.resetUrlToCurrentUrlTree();
            }
            else {
                // The browser URL and router state was not updated before the navigation cancelled so
                // there's no restoration needed.
            }
        }
        else if (this.canceledNavigationResolution === 'replace') {
            // TODO(atscott): It seems like we should _always_ reset the state here. It would be a no-op
            // for `deferred` navigations that haven't change the internal state yet because guards
            // reject. For 'eager' navigations, it seems like we also really should reset the state
            // because the navigation was cancelled. Investigate if this can be done by running TGP.
            if (restoringFromCaughtError) {
                this.resetState(navigation);
            }
            this.resetUrlToCurrentUrlTree();
        }
    }
    resetState(navigation) {
        this.routerState = this.stateMemento.routerState;
        this.currentUrlTree = this.stateMemento.currentUrlTree;
        // Note here that we use the urlHandlingStrategy to get the reset `rawUrlTree` because it may be
        // configured to handle only part of the navigation URL. This means we would only want to reset
        // the part of the navigation handled by the Angular router rather than the whole URL. In
        // addition, the URLHandlingStrategy may be configured to specifically preserve parts of the URL
        // when merging, such as the query params so they are not lost on a refresh.
        this.rawUrlTree =
            this.urlHandlingStrategy.merge(this.currentUrlTree, navigation.finalUrl ?? this.rawUrlTree);
    }
    resetUrlToCurrentUrlTree() {
        this.location.replaceState(this.urlSerializer.serialize(this.rawUrlTree), '', this.generateNgRouterState(this.lastSuccessfulId, this.currentPageId));
    }
    generateNgRouterState(navigationId, routerPageId) {
        if (this.canceledNavigationResolution === 'computed') {
            return { navigationId, ɵrouterPageId: routerPageId };
        }
        return { navigationId };
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-dcc4a80", ngImport: i0, type: HistoryStateManager, deps: null, target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-dcc4a80", ngImport: i0, type: HistoryStateManager, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-dcc4a80", ngImport: i0, type: HistoryStateManager, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGVfbWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvc3RhdGVtYW5hZ2VyL3N0YXRlX21hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxNQUFNLEVBQUUsVUFBVSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBR2pELE9BQU8sRUFBQyxvQkFBb0IsRUFBUyxnQkFBZ0IsRUFBOEIsYUFBYSxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxlQUFlLEVBQXVCLGdCQUFnQixHQUFFLE1BQU0sV0FBVyxDQUFDO0FBRWhOLE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3RELE9BQU8sRUFBQyxnQkFBZ0IsRUFBYyxNQUFNLGlCQUFpQixDQUFDO0FBQzlELE9BQU8sRUFBQyxtQkFBbUIsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQzdELE9BQU8sRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFDLE1BQU0sYUFBYSxDQUFDOztBQUduRCxNQUFNLE9BQWdCLFlBQVk7eUhBQVosWUFBWTs2SEFBWixZQUFZLGNBRFQsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQzs7c0dBQ3hELFlBQVk7a0JBRGpDLFVBQVU7bUJBQUMsRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsRUFBQzs7QUE4RC9FLE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxZQUFZO0lBRHJEOztRQUVtQixhQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzVCLGtCQUFhLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FB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LENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxZQUFvQixFQUFFLFlBQW9CO1FBQ3RFLElBQUksSUFBSSxDQUFDLDRCQUE0QixLQUFLLFVBQVUsRUFBRTtZQUNwRCxPQUFPLEVBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUMsQ0FBQztTQUNwRDtRQUNELE9BQU8sRUFBQyxZQUFZLEVBQUMsQ0FBQztJQUN4QixDQUFDO3lIQXhMVSxtQkFBbUI7NkhBQW5CLG1CQUFtQixjQURQLE1BQU07O3NHQUNsQixtQkFBbUI7a0JBRC9CLFVBQVU7bUJBQUMsRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge2luamVjdCwgSW5qZWN0YWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge1N1YnNjcmlwdGlvbkxpa2V9IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge0JlZm9yZUFjdGl2YXRlUm91dGVzLCBFdmVudCwgTmF2aWdhdGlvbkNhbmNlbCwgTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUsIE5hdmlnYXRpb25FbmQsIE5hdmlnYXRpb25FcnJvciwgTmF2aWdhdGlvblNraXBwZWQsIE5hdmlnYXRpb25TdGFydCwgUHJpdmF0ZVJvdXRlckV2ZW50cywgUm91dGVzUmVjb2duaXplZCx9IGZyb20gJy4uL2V2ZW50cyc7XG5pbXBvcnQge05hdmlnYXRpb24sIFJlc3RvcmVkU3RhdGV9IGZyb20gJy4uL25hdmlnYXRpb25fdHJhbnNpdGlvbic7XG5pbXBvcnQge1JPVVRFUl9DT05GSUdVUkFUSU9OfSBmcm9tICcuLi9yb3V0ZXJfY29uZmlnJztcbmltcG9ydCB7Y3JlYXRlRW1wdHlTdGF0ZSwgUm91dGVyU3RhdGV9IGZyb20gJy4uL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1VybEhhbmRsaW5nU3RyYXRlZ3l9IGZyb20gJy4uL3VybF9oYW5kbGluZ19zdHJhdGVneSc7XG5pbXBvcnQge1VybFNlcmlhbGl6ZXIsIFVybFRyZWV9IGZyb20gJy4uL3VybF90cmVlJztcblxuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290JywgdXNlRmFjdG9yeTogKCkgPT4gaW5qZWN0KEhpc3RvcnlTdGF0ZU1hbmFnZXIpfSlcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBTdGF0ZU1hbmFnZXIge1xuICAvKipcbiAgICogUmV0dXJucyB0aGUgY3VycmVudGx5IGFjdGl2YXRlZCBgVXJsVHJlZWAuXG4gICAqXG4gICAqIFRoaXMgYFVybFRyZWVgIHNob3dzIG9ubHkgVVJMcyB0aGF0IHRoZSBgUm91dGVyYCBpcyBjb25maWd1cmVkIHRvIGhhbmRsZSAodGhyb3VnaFxuICAgKiBgVXJsSGFuZGxpbmdTdHJhdGVneWApLlxuICAgKlxuICAgKiBUaGUgdmFsdWUgaXMgc2V0IGFmdGVyIGZpbmRpbmcgdGhlIHJvdXRlIGNvbmZpZyB0cmVlIHRvIGFjdGl2YXRlIGJ1dCBiZWZvcmUgYWN0aXZhdGluZyB0aGVcbiAgICogcm91dGUuXG4gICAqL1xuICBhYnN0cmFjdCBnZXRDdXJyZW50VXJsVHJlZSgpOiBVcmxUcmVlO1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgYFVybFRyZWVgIHRoYXQgaXMgcmVwcmVzZW50cyB3aGF0IHRoZSBicm93c2VyIGlzIGFjdHVhbGx5IHNob3dpbmcuXG4gICAqXG4gICAqIEluIHRoZSBsaWZlIG9mIGEgbmF2aWdhdGlvbiB0cmFuc2l0aW9uOlxuICAgKiAxLiBXaGVuIGEgbmF2aWdhdGlvbiBiZWdpbnMsIHRoZSByYXcgYFVybFRyZWVgIGlzIHVwZGF0ZWQgdG8gdGhlIGZ1bGwgVVJMIHRoYXQncyBiZWluZ1xuICAgKiBuYXZpZ2F0ZWQgdG8uXG4gICAqIDIuIER1cmluZyBhIG5hdmlnYXRpb24sIHJlZGlyZWN0cyBhcmUgYXBwbGllZCwgd2hpY2ggbWlnaHQgb25seSBhcHBseSB0byBfcGFydF8gb2YgdGhlIFVSTCAoZHVlXG4gICAqIHRvIGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCkuXG4gICAqIDMuIEp1c3QgYmVmb3JlIGFjdGl2YXRpb24sIHRoZSByYXcgYFVybFRyZWVgIGlzIHVwZGF0ZWQgdG8gaW5jbHVkZSB0aGUgcmVkaXJlY3RzIG9uIHRvcCBvZiB0aGVcbiAgICogb3JpZ2luYWwgcmF3IFVSTC5cbiAgICpcbiAgICogTm90ZSB0aGF0IHRoaXMgaXMgX29ubHlfIGhlcmUgdG8gc3VwcG9ydCBgVXJsSGFuZGxpbmdTdHJhdGVneS5leHRyYWN0YCBhbmRcbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybGAuIFdpdGhvdXQgdGhvc2UgQVBJcywgdGhlIGN1cnJlbnQgYFVybFRyZWVgIHdvdWxkIG5vdFxuICAgKiBkZXZpYXRlZCBmcm9tIHRoZSByYXcgYFVybFRyZWVgLlxuICAgKlxuICAgKiBGb3IgYGV4dHJhY3RgLCBhIHJhdyBgVXJsVHJlZWAgaXMgbmVlZGVkIGJlY2F1c2UgYGV4dHJhY3RgIG1heSBvbmx5IHJldHVybiBwYXJ0XG4gICAqIG9mIHRoZSBuYXZpZ2F0aW9uIFVSTC4gVGh1cywgdGhlIGN1cnJlbnQgYFVybFRyZWVgIG1heSBvbmx5IHJlcHJlc2VudCBfcGFydF8gb2YgdGhlIGJyb3dzZXJcbiAgICogVVJMLiBXaGVuIGEgbmF2aWdhdGlvbiBnZXRzIGNhbmNlbGxlZCBhbmQgdGhlIHJvdXRlciBuZWVkcyB0byByZXNldCB0aGUgVVJMIG9yIGEgbmV3IG5hdmlnYXRpb25cbiAgICogb2NjdXJzLCBpdCBuZWVkcyB0byBrbm93IHRoZSBfd2hvbGVfIGJyb3dzZXIgVVJMLCBub3QganVzdCB0aGUgcGFydCBoYW5kbGVkIGJ5XG4gICAqIGBVcmxIYW5kbGluZ1N0cmF0ZWd5YC5cbiAgICogRm9yIGBzaG91bGRQcm9jZXNzVXJsYCwgd2hlbiB0aGUgcmV0dXJuIGlzIGBmYWxzZWAsIHRoZSByb3V0ZXIgaWdub3JlcyB0aGUgbmF2aWdhdGlvbiBidXRcbiAgICogc3RpbGwgdXBkYXRlcyB0aGUgcmF3IGBVcmxUcmVlYCB3aXRoIHRoZSBhc3N1bXB0aW9uIHRoYXQgdGhlIG5hdmlnYXRpb24gd2FzIGNhdXNlZCBieSB0aGVcbiAgICogbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyIGR1ZSB0byBhIFVSTCB1cGRhdGUgYnkgdGhlIEFuZ3VsYXJKUyByb3V0ZXIuIEluIHRoaXMgY2FzZSwgdGhlIHJvdXRlclxuICAgKiBzdGlsbCBuZWVkIHRvIGtub3cgd2hhdCB0aGUgYnJvd3NlcidzIFVSTCBpcyBmb3IgZnV0dXJlIG5hdmlnYXRpb25zLlxuICAgKi9cbiAgYWJzdHJhY3QgZ2V0UmF3VXJsVHJlZSgpOiBVcmxUcmVlO1xuXG4gIC8qKiBSZXR1cm5zIHRoZSBjdXJyZW50IHN0YXRlIHN0b3JlZCBieSB0aGUgYnJvd3NlciBmb3IgdGhlIGN1cnJlbnQgaGlzdG9yeSBlbnRyeS4gKi9cbiAgYWJzdHJhY3QgcmVzdG9yZWRTdGF0ZSgpOiBSZXN0b3JlZFN0YXRlfG51bGx8dW5kZWZpbmVkO1xuXG4gIC8qKiBSZXR1cm5zIHRoZSBjdXJyZW50IFJvdXRlclN0YXRlLiAqL1xuICBhYnN0cmFjdCBnZXRSb3V0ZXJTdGF0ZSgpOiBSb3V0ZXJTdGF0ZTtcblxuICAvKipcbiAgICogUmVnaXN0ZXJzIGEgbGlzdGVuZXIgdGhhdCBpcyBjYWxsZWQgd2hlbmV2ZXIgdGhlIGN1cnJlbnQgaGlzdG9yeSBlbnRyeSBjaGFuZ2VzIGJ5IHNvbWUgQVBJXG4gICAqIG91dHNpZGUgdGhlIFJvdXRlci4gVGhpcyBpbmNsdWRlcyB1c2VyLWFjdGl2YXRlZCBjaGFuZ2VzIGxpa2UgYmFjayBidXR0b25zIGFuZCBsaW5rIGNsaWNrcywgYnV0XG4gICAqIGFsc28gaW5jbHVkZXMgcHJvZ3JhbW1hdGljIEFQSXMgY2FsbGVkIGJ5IG5vbi1Sb3V0ZXIgSmF2YVNjcmlwdC5cbiAgICovXG4gIGFic3RyYWN0IHJlZ2lzdGVyTm9uUm91dGVyQ3VycmVudEVudHJ5Q2hhbmdlTGlzdGVuZXIoXG4gICAgICBsaXN0ZW5lcjogKHVybDogc3RyaW5nLCBzdGF0ZTogUmVzdG9yZWRTdGF0ZXxudWxsfHVuZGVmaW5lZCkgPT4gdm9pZCk6IFN1YnNjcmlwdGlvbkxpa2U7XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgYSBuYXZpZ2F0aW9uIGV2ZW50IHNlbnQgZnJvbSB0aGUgUm91dGVyLiBUaGVzZSBhcmUgdHlwaWNhbGx5IGV2ZW50cyB0aGF0IGluZGljYXRlIGFcbiAgICogbmF2aWdhdGlvbiBoYXMgc3RhcnRlZCwgcHJvZ3Jlc3NlZCwgYmVlbiBjYW5jZWxsZWQsIG9yIGZpbmlzaGVkLlxuICAgKi9cbiAgYWJzdHJhY3QgaGFuZGxlUm91dGVyRXZlbnQoZTogRXZlbnR8UHJpdmF0ZVJvdXRlckV2ZW50cywgY3VycmVudFRyYW5zaXRpb246IE5hdmlnYXRpb24pOiB2b2lkO1xufVxuXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnfSlcbmV4cG9ydCBjbGFzcyBIaXN0b3J5U3RhdGVNYW5hZ2VyIGV4dGVuZHMgU3RhdGVNYW5hZ2VyIHtcbiAgcHJpdmF0ZSByZWFkb25seSBsb2NhdGlvbiA9IGluamVjdChMb2NhdGlvbik7XG4gIHByaXZhdGUgcmVhZG9ubHkgdXJsU2VyaWFsaXplciA9IGluamVjdChVcmxTZXJpYWxpemVyKTtcbiAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zID0gaW5qZWN0KFJPVVRFUl9DT05GSUdVUkFUSU9OLCB7b3B0aW9uYWw6IHRydWV9KSB8fCB7fTtcbiAgcHJpdmF0ZSByZWFkb25seSBjYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID1cbiAgICAgIHRoaXMub3B0aW9ucy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uIHx8ICdyZXBsYWNlJztcblxuICBwcml2YXRlIHVybEhhbmRsaW5nU3RyYXRlZ3kgPSBpbmplY3QoVXJsSGFuZGxpbmdTdHJhdGVneSk7XG4gIHByaXZhdGUgdXJsVXBkYXRlU3RyYXRlZ3kgPSB0aGlzLm9wdGlvbnMudXJsVXBkYXRlU3RyYXRlZ3kgfHwgJ2RlZmVycmVkJztcblxuICBwcml2YXRlIGN1cnJlbnRVcmxUcmVlID0gbmV3IFVybFRyZWUoKTtcblxuICBvdmVycmlkZSBnZXRDdXJyZW50VXJsVHJlZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50VXJsVHJlZTtcbiAgfVxuXG4gIHByaXZhdGUgcmF3VXJsVHJlZSA9IHRoaXMuY3VycmVudFVybFRyZWU7XG5cbiAgb3ZlcnJpZGUgZ2V0UmF3VXJsVHJlZSgpIHtcbiAgICByZXR1cm4gdGhpcy5yYXdVcmxUcmVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBpZCBvZiB0aGUgY3VycmVudGx5IGFjdGl2ZSBwYWdlIGluIHRoZSByb3V0ZXIuXG4gICAqIFVwZGF0ZWQgdG8gdGhlIHRyYW5zaXRpb24ncyB0YXJnZXQgaWQgb24gYSBzdWNjZXNzZnVsIG5hdmlnYXRpb24uXG4gICAqXG4gICAqIFRoaXMgaXMgdXNlZCB0byB0cmFjayB3aGF0IHBhZ2UgdGhlIHJvdXRlciBsYXN0IGFjdGl2YXRlZC4gV2hlbiBhbiBhdHRlbXB0ZWQgbmF2aWdhdGlvbiBmYWlscyxcbiAgICogdGhlIHJvdXRlciBjYW4gdGhlbiB1c2UgdGhpcyB0byBjb21wdXRlIGhvdyB0byByZXN0b3JlIHRoZSBzdGF0ZSBiYWNrIHRvIHRoZSBwcmV2aW91c2x5IGFjdGl2ZVxuICAgKiBwYWdlLlxuICAgKi9cbiAgcHJpdmF0ZSBjdXJyZW50UGFnZUlkOiBudW1iZXIgPSAwO1xuICBwcml2YXRlIGxhc3RTdWNjZXNzZnVsSWQ6IG51bWJlciA9IC0xO1xuXG4gIG92ZXJyaWRlIHJlc3RvcmVkU3RhdGUoKTogUmVzdG9yZWRTdGF0ZXxudWxsfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMubG9jYXRpb24uZ2V0U3RhdGUoKSBhcyBSZXN0b3JlZFN0YXRlIHwgbnVsbCB8IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgybVyb3V0ZXJQYWdlSWQgb2Ygd2hhdGV2ZXIgcGFnZSBpcyBjdXJyZW50bHkgYWN0aXZlIGluIHRoZSBicm93c2VyIGhpc3RvcnkuIFRoaXMgaXNcbiAgICogaW1wb3J0YW50IGZvciBjb21wdXRpbmcgdGhlIHRhcmdldCBwYWdlIGlkIGZvciBuZXcgbmF2aWdhdGlvbnMgYmVjYXVzZSB3ZSBuZWVkIHRvIGVuc3VyZSBlYWNoXG4gICAqIHBhZ2UgaWQgaW4gdGhlIGJyb3dzZXIgaGlzdG9yeSBpcyAxIG1vcmUgdGhhbiB0aGUgcHJldmlvdXMgZW50cnkuXG4gICAqL1xuICBwcml2YXRlIGdldCBicm93c2VyUGFnZUlkKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiAhPT0gJ2NvbXB1dGVkJykge1xuICAgICAgcmV0dXJuIHRoaXMuY3VycmVudFBhZ2VJZDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVzdG9yZWRTdGF0ZSgpPy7JtXJvdXRlclBhZ2VJZCA/PyB0aGlzLmN1cnJlbnRQYWdlSWQ7XG4gIH1cblxuICBwcml2YXRlIHJvdXRlclN0YXRlID0gY3JlYXRlRW1wdHlTdGF0ZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCBudWxsKTtcblxuICBvdmVycmlkZSBnZXRSb3V0ZXJTdGF0ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5yb3V0ZXJTdGF0ZTtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGVNZW1lbnRvID0gdGhpcy5jcmVhdGVTdGF0ZU1lbWVudG8oKTtcblxuICBwcml2YXRlIGNyZWF0ZVN0YXRlTWVtZW50bygpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmF3VXJsVHJlZTogdGhpcy5yYXdVcmxUcmVlLFxuICAgICAgY3VycmVudFVybFRyZWU6IHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICByb3V0ZXJTdGF0ZTogdGhpcy5yb3V0ZXJTdGF0ZSxcbiAgICB9O1xuICB9XG5cbiAgb3ZlcnJpZGUgcmVnaXN0ZXJOb25Sb3V0ZXJDdXJyZW50RW50cnlDaGFuZ2VMaXN0ZW5lcihcbiAgICAgIGxpc3RlbmVyOiAodXJsOiBzdHJpbmcsIHN0YXRlOiBSZXN0b3JlZFN0YXRlfG51bGx8dW5kZWZpbmVkKSA9PiB2b2lkKTogU3Vic2NyaXB0aW9uTGlrZSB7XG4gICAgcmV0dXJuIHRoaXMubG9jYXRpb24uc3Vic2NyaWJlKGV2ZW50ID0+IHtcbiAgICAgIGlmIChldmVudFsndHlwZSddID09PSAncG9wc3RhdGUnKSB7XG4gICAgICAgIGxpc3RlbmVyKGV2ZW50Wyd1cmwnXSEsIGV2ZW50LnN0YXRlIGFzIFJlc3RvcmVkU3RhdGUgfCBudWxsIHwgdW5kZWZpbmVkKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIG92ZXJyaWRlIGhhbmRsZVJvdXRlckV2ZW50KGU6IEV2ZW50fFByaXZhdGVSb3V0ZXJFdmVudHMsIGN1cnJlbnRUcmFuc2l0aW9uOiBOYXZpZ2F0aW9uKSB7XG4gICAgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uU3RhcnQpIHtcbiAgICAgIHRoaXMuc3RhdGVNZW1lbnRvID0gdGhpcy5jcmVhdGVTdGF0ZU1lbWVudG8oKTtcbiAgICB9IGVsc2UgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uU2tpcHBlZCkge1xuICAgICAgdGhpcy5yYXdVcmxUcmVlID0gY3VycmVudFRyYW5zaXRpb24uaW5pdGlhbFVybDtcbiAgICB9IGVsc2UgaWYgKGUgaW5zdGFuY2VvZiBSb3V0ZXNSZWNvZ25pemVkKSB7XG4gICAgICBpZiAodGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJykge1xuICAgICAgICBpZiAoIWN1cnJlbnRUcmFuc2l0aW9uLmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgICBjb25zdCByYXdVcmwgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UoXG4gICAgICAgICAgICAgIGN1cnJlbnRUcmFuc2l0aW9uLmZpbmFsVXJsISwgY3VycmVudFRyYW5zaXRpb24uaW5pdGlhbFVybCk7XG4gICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHJhd1VybCwgY3VycmVudFRyYW5zaXRpb24pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgQmVmb3JlQWN0aXZhdGVSb3V0ZXMpIHtcbiAgICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSBjdXJyZW50VHJhbnNpdGlvbi5maW5hbFVybCE7XG4gICAgICB0aGlzLnJhd1VybFRyZWUgPVxuICAgICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZShjdXJyZW50VHJhbnNpdGlvbi5maW5hbFVybCEsIGN1cnJlbnRUcmFuc2l0aW9uLmluaXRpYWxVcmwpO1xuICAgICAgdGhpcy5yb3V0ZXJTdGF0ZSA9IGN1cnJlbnRUcmFuc2l0aW9uLnRhcmdldFJvdXRlclN0YXRlITtcbiAgICAgIGlmICh0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZGVmZXJyZWQnKSB7XG4gICAgICAgIGlmICghY3VycmVudFRyYW5zaXRpb24uZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICAgIHRoaXMuc2V0QnJvd3NlclVybCh0aGlzLnJhd1VybFRyZWUsIGN1cnJlbnRUcmFuc2l0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uQ2FuY2VsICYmXG4gICAgICAgIChlLmNvZGUgPT09IE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLkd1YXJkUmVqZWN0ZWQgfHxcbiAgICAgICAgIGUuY29kZSA9PT0gTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuTm9EYXRhRnJvbVJlc29sdmVyKSkge1xuICAgICAgdGhpcy5yZXN0b3JlSGlzdG9yeShjdXJyZW50VHJhbnNpdGlvbik7XG4gICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVycm9yKSB7XG4gICAgICB0aGlzLnJlc3RvcmVIaXN0b3J5KGN1cnJlbnRUcmFuc2l0aW9uLCB0cnVlKTtcbiAgICB9IGVsc2UgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSBlLmlkO1xuICAgICAgdGhpcy5jdXJyZW50UGFnZUlkID0gdGhpcy5icm93c2VyUGFnZUlkO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc2V0QnJvd3NlclVybCh1cmw6IFVybFRyZWUsIHRyYW5zaXRpb246IE5hdmlnYXRpb24pIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICAgIGlmICh0aGlzLmxvY2F0aW9uLmlzQ3VycmVudFBhdGhFcXVhbFRvKHBhdGgpIHx8ICEhdHJhbnNpdGlvbi5leHRyYXMucmVwbGFjZVVybCkge1xuICAgICAgLy8gcmVwbGFjZW1lbnRzIGRvIG5vdCB1cGRhdGUgdGhlIHRhcmdldCBwYWdlXG4gICAgICBjb25zdCBjdXJyZW50QnJvd3NlclBhZ2VJZCA9IHRoaXMuYnJvd3NlclBhZ2VJZDtcbiAgICAgIGNvbnN0IHN0YXRlID0ge1xuICAgICAgICAuLi50cmFuc2l0aW9uLmV4dHJhcy5zdGF0ZSxcbiAgICAgICAgLi4udGhpcy5nZW5lcmF0ZU5nUm91dGVyU3RhdGUodHJhbnNpdGlvbi5pZCwgY3VycmVudEJyb3dzZXJQYWdlSWQpXG4gICAgICB9O1xuICAgICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUocGF0aCwgJycsIHN0YXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc3RhdGUgPSB7XG4gICAgICAgIC4uLnRyYW5zaXRpb24uZXh0cmFzLnN0YXRlLFxuICAgICAgICAuLi50aGlzLmdlbmVyYXRlTmdSb3V0ZXJTdGF0ZSh0cmFuc2l0aW9uLmlkLCB0aGlzLmJyb3dzZXJQYWdlSWQgKyAxKVxuICAgICAgfTtcbiAgICAgIHRoaXMubG9jYXRpb24uZ28ocGF0aCwgJycsIHN0YXRlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybXMgdGhlIG5lY2Vzc2FyeSByb2xsYmFjayBhY3Rpb24gdG8gcmVzdG9yZSB0aGUgYnJvd3NlciBVUkwgdG8gdGhlXG4gICAqIHN0YXRlIGJlZm9yZSB0aGUgdHJhbnNpdGlvbi5cbiAgICovXG4gIHByaXZhdGUgcmVzdG9yZUhpc3RvcnkobmF2aWdhdGlvbjogTmF2aWdhdGlvbiwgcmVzdG9yaW5nRnJvbUNhdWdodEVycm9yID0gZmFsc2UpIHtcbiAgICBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAnY29tcHV0ZWQnKSB7XG4gICAgICBjb25zdCBjdXJyZW50QnJvd3NlclBhZ2VJZCA9IHRoaXMuYnJvd3NlclBhZ2VJZDtcbiAgICAgIGNvbnN0IHRhcmdldFBhZ2VQb3NpdGlvbiA9IHRoaXMuY3VycmVudFBhZ2VJZCAtIGN1cnJlbnRCcm93c2VyUGFnZUlkO1xuICAgICAgaWYgKHRhcmdldFBhZ2VQb3NpdGlvbiAhPT0gMCkge1xuICAgICAgICB0aGlzLmxvY2F0aW9uLmhpc3RvcnlHbyh0YXJnZXRQYWdlUG9zaXRpb24pO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmN1cnJlbnRVcmxUcmVlID09PSBuYXZpZ2F0aW9uLmZpbmFsVXJsICYmIHRhcmdldFBhZ2VQb3NpdGlvbiA9PT0gMCkge1xuICAgICAgICAvLyBXZSBnb3QgdG8gdGhlIGFjdGl2YXRpb24gc3RhZ2UgKHdoZXJlIGN1cnJlbnRVcmxUcmVlIGlzIHNldCB0byB0aGUgbmF2aWdhdGlvbidzXG4gICAgICAgIC8vIGZpbmFsVXJsKSwgYnV0IHdlIHdlcmVuJ3QgbW92aW5nIGFueXdoZXJlIGluIGhpc3RvcnkgKHNraXBMb2NhdGlvbkNoYW5nZSBvciByZXBsYWNlVXJsKS5cbiAgICAgICAgLy8gV2Ugc3RpbGwgbmVlZCB0byByZXNldCB0aGUgcm91dGVyIHN0YXRlIGJhY2sgdG8gd2hhdCBpdCB3YXMgd2hlbiB0aGUgbmF2aWdhdGlvbiBzdGFydGVkLlxuICAgICAgICB0aGlzLnJlc2V0U3RhdGUobmF2aWdhdGlvbik7XG4gICAgICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBUaGUgYnJvd3NlciBVUkwgYW5kIHJvdXRlciBzdGF0ZSB3YXMgbm90IHVwZGF0ZWQgYmVmb3JlIHRoZSBuYXZpZ2F0aW9uIGNhbmNlbGxlZCBzb1xuICAgICAgICAvLyB0aGVyZSdzIG5vIHJlc3RvcmF0aW9uIG5lZWRlZC5cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ3JlcGxhY2UnKSB7XG4gICAgICAvLyBUT0RPKGF0c2NvdHQpOiBJdCBzZWVtcyBsaWtlIHdlIHNob3VsZCBfYWx3YXlzXyByZXNldCB0aGUgc3RhdGUgaGVyZS4gSXQgd291bGQgYmUgYSBuby1vcFxuICAgICAgLy8gZm9yIGBkZWZlcnJlZGAgbmF2aWdhdGlvbnMgdGhhdCBoYXZlbid0IGNoYW5nZSB0aGUgaW50ZXJuYWwgc3RhdGUgeWV0IGJlY2F1c2UgZ3VhcmRzXG4gICAgICAvLyByZWplY3QuIEZvciAnZWFnZXInIG5hdmlnYXRpb25zLCBpdCBzZWVtcyBsaWtlIHdlIGFsc28gcmVhbGx5IHNob3VsZCByZXNldCB0aGUgc3RhdGVcbiAgICAgIC8vIGJlY2F1c2UgdGhlIG5hdmlnYXRpb24gd2FzIGNhbmNlbGxlZC4gSW52ZXN0aWdhdGUgaWYgdGhpcyBjYW4gYmUgZG9uZSBieSBydW5uaW5nIFRHUC5cbiAgICAgIGlmIChyZXN0b3JpbmdGcm9tQ2F1Z2h0RXJyb3IpIHtcbiAgICAgICAgdGhpcy5yZXNldFN0YXRlKG5hdmlnYXRpb24pO1xuICAgICAgfVxuICAgICAgdGhpcy5yZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlc2V0U3RhdGUobmF2aWdhdGlvbjogTmF2aWdhdGlvbik6IHZvaWQge1xuICAgIHRoaXMucm91dGVyU3RhdGUgPSB0aGlzLnN0YXRlTWVtZW50by5yb3V0ZXJTdGF0ZTtcbiAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gdGhpcy5zdGF0ZU1lbWVudG8uY3VycmVudFVybFRyZWU7XG4gICAgLy8gTm90ZSBoZXJlIHRoYXQgd2UgdXNlIHRoZSB1cmxIYW5kbGluZ1N0cmF0ZWd5IHRvIGdldCB0aGUgcmVzZXQgYHJhd1VybFRyZWVgIGJlY2F1c2UgaXQgbWF5IGJlXG4gICAgLy8gY29uZmlndXJlZCB0byBoYW5kbGUgb25seSBwYXJ0IG9mIHRoZSBuYXZpZ2F0aW9uIFVSTC4gVGhpcyBtZWFucyB3ZSB3b3VsZCBvbmx5IHdhbnQgdG8gcmVzZXRcbiAgICAvLyB0aGUgcGFydCBvZiB0aGUgbmF2aWdhdGlvbiBoYW5kbGVkIGJ5IHRoZSBBbmd1bGFyIHJvdXRlciByYXRoZXIgdGhhbiB0aGUgd2hvbGUgVVJMLiBJblxuICAgIC8vIGFkZGl0aW9uLCB0aGUgVVJMSGFuZGxpbmdTdHJhdGVneSBtYXkgYmUgY29uZmlndXJlZCB0byBzcGVjaWZpY2FsbHkgcHJlc2VydmUgcGFydHMgb2YgdGhlIFVSTFxuICAgIC8vIHdoZW4gbWVyZ2luZywgc3VjaCBhcyB0aGUgcXVlcnkgcGFyYW1zIHNvIHRoZXkgYXJlIG5vdCBsb3N0IG9uIGEgcmVmcmVzaC5cbiAgICB0aGlzLnJhd1VybFRyZWUgPVxuICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UodGhpcy5jdXJyZW50VXJsVHJlZSwgbmF2aWdhdGlvbi5maW5hbFVybCA/PyB0aGlzLnJhd1VybFRyZWUpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTogdm9pZCB7XG4gICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUoXG4gICAgICAgIHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodGhpcy5yYXdVcmxUcmVlKSwgJycsXG4gICAgICAgIHRoaXMuZ2VuZXJhdGVOZ1JvdXRlclN0YXRlKHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCwgdGhpcy5jdXJyZW50UGFnZUlkKSk7XG4gIH1cblxuICBwcml2YXRlIGdlbmVyYXRlTmdSb3V0ZXJTdGF0ZShuYXZpZ2F0aW9uSWQ6IG51bWJlciwgcm91dGVyUGFnZUlkOiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAnY29tcHV0ZWQnKSB7XG4gICAgICByZXR1cm4ge25hdmlnYXRpb25JZCwgybVyb3V0ZXJQYWdlSWQ6IHJvdXRlclBhZ2VJZH07XG4gICAgfVxuICAgIHJldHVybiB7bmF2aWdhdGlvbklkfTtcbiAgfVxufVxuIl19