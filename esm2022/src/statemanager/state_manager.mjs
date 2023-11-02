/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { BeforeActivateRoutes, NavigationCancel, NavigationCancellationCode, NavigationEnd, NavigationError, NavigationSkipped, NavigationStart, RoutesRecognized, } from '../events';
import { ROUTER_CONFIGURATION } from '../router_config';
import { createEmptyState } from '../router_state';
import { UrlHandlingStrategy } from '../url_handling_strategy';
import { UrlSerializer, UrlTree } from '../url_tree';
import * as i0 from "@angular/core";
export class StateManager {
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-57cad0e", ngImport: i0, type: StateManager, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-57cad0e", ngImport: i0, type: StateManager, providedIn: 'root', useFactory: () => inject(HistoryStateManager) }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-57cad0e", ngImport: i0, type: StateManager, decorators: [{
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
            (e.code === NavigationCancellationCode.GuardRejected ||
                e.code === NavigationCancellationCode.NoDataFromResolver)) {
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-57cad0e", ngImport: i0, type: HistoryStateManager, deps: null, target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-57cad0e", ngImport: i0, type: HistoryStateManager, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-57cad0e", ngImport: i0, type: HistoryStateManager, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGVfbWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvc3RhdGVtYW5hZ2VyL3N0YXRlX21hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxNQUFNLEVBQUUsVUFBVSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBR2pELE9BQU8sRUFBQyxvQkFBb0IsRUFBUyxnQkFBZ0IsRUFBRSwwQkFBMEIsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBdUIsZ0JBQWdCLEdBQUUsTUFBTSxXQUFXLENBQUM7QUFFaE4sT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDdEQsT0FBTyxFQUFDLGdCQUFnQixFQUFjLE1BQU0saUJBQWlCLENBQUM7QUFDOUQsT0FBTyxFQUFDLG1CQUFtQixFQUFDLE1BQU0sMEJBQTBCLENBQUM7QUFDN0QsT0FBTyxFQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUMsTUFBTSxhQUFhLENBQUM7O0FBR25ELE1BQU0sT0FBZ0IsWUFBWTt5SEFBWixZQUFZOzZIQUFaLFlBQVksY0FEVCxNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDOztzR0FDeEQsWUFBWTtrQkFEakMsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxFQUFDOztBQThEL0UsTUFBTSxPQUFPLG1CQUFvQixTQUFRLFlBQVk7SUFEckQ7O1FBRW1CLGFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUIsa0JBQWEsR0FBRyxNQUFNLENBQUMsYUFBYSxD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LFVBQVUsQ0FBQyxFQUFFLEVBQUUsRUFDakQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBRU8scUJBQXFCLENBQUMsWUFBb0IsRUFBRSxZQUFvQjtRQUN0RSxJQUFJLElBQUksQ0FBQyw0QkFBNEIsS0FBSyxVQUFVLEVBQUU7WUFDcEQsT0FBTyxFQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFDLENBQUM7U0FDcEQ7UUFDRCxPQUFPLEVBQUMsWUFBWSxFQUFDLENBQUM7SUFDeEIsQ0FBQzt5SEF4TFUsbUJBQW1COzZIQUFuQixtQkFBbUIsY0FEUCxNQUFNOztzR0FDbEIsbUJBQW1CO2tCQUQvQixVQUFVO21CQUFDLEVBQUMsVUFBVSxFQUFFLE1BQU0sRUFBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtpbmplY3QsIEluamVjdGFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtTdWJzY3JpcHRpb25MaWtlfSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtCZWZvcmVBY3RpdmF0ZVJvdXRlcywgRXZlbnQsIE5hdmlnYXRpb25DYW5jZWwsIE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLCBOYXZpZ2F0aW9uRW5kLCBOYXZpZ2F0aW9uRXJyb3IsIE5hdmlnYXRpb25Ta2lwcGVkLCBOYXZpZ2F0aW9uU3RhcnQsIFByaXZhdGVSb3V0ZXJFdmVudHMsIFJvdXRlc1JlY29nbml6ZWQsfSBmcm9tICcuLi9ldmVudHMnO1xuaW1wb3J0IHtOYXZpZ2F0aW9uLCBSZXN0b3JlZFN0YXRlfSBmcm9tICcuLi9uYXZpZ2F0aW9uX3RyYW5zaXRpb24nO1xuaW1wb3J0IHtST1VURVJfQ09ORklHVVJBVElPTn0gZnJvbSAnLi4vcm91dGVyX2NvbmZpZyc7XG5pbXBvcnQge2NyZWF0ZUVtcHR5U3RhdGUsIFJvdXRlclN0YXRlfSBmcm9tICcuLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtVcmxIYW5kbGluZ1N0cmF0ZWd5fSBmcm9tICcuLi91cmxfaGFuZGxpbmdfc3RyYXRlZ3knO1xuaW1wb3J0IHtVcmxTZXJpYWxpemVyLCBVcmxUcmVlfSBmcm9tICcuLi91cmxfdHJlZSc7XG5cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCcsIHVzZUZhY3Rvcnk6ICgpID0+IGluamVjdChIaXN0b3J5U3RhdGVNYW5hZ2VyKX0pXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgU3RhdGVNYW5hZ2VyIHtcbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGN1cnJlbnRseSBhY3RpdmF0ZWQgYFVybFRyZWVgLlxuICAgKlxuICAgKiBUaGlzIGBVcmxUcmVlYCBzaG93cyBvbmx5IFVSTHMgdGhhdCB0aGUgYFJvdXRlcmAgaXMgY29uZmlndXJlZCB0byBoYW5kbGUgKHRocm91Z2hcbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3lgKS5cbiAgICpcbiAgICogVGhlIHZhbHVlIGlzIHNldCBhZnRlciBmaW5kaW5nIHRoZSByb3V0ZSBjb25maWcgdHJlZSB0byBhY3RpdmF0ZSBidXQgYmVmb3JlIGFjdGl2YXRpbmcgdGhlXG4gICAqIHJvdXRlLlxuICAgKi9cbiAgYWJzdHJhY3QgZ2V0Q3VycmVudFVybFRyZWUoKTogVXJsVHJlZTtcblxuICAvKipcbiAgICogUmV0dXJucyBhIGBVcmxUcmVlYCB0aGF0IGlzIHJlcHJlc2VudHMgd2hhdCB0aGUgYnJvd3NlciBpcyBhY3R1YWxseSBzaG93aW5nLlxuICAgKlxuICAgKiBJbiB0aGUgbGlmZSBvZiBhIG5hdmlnYXRpb24gdHJhbnNpdGlvbjpcbiAgICogMS4gV2hlbiBhIG5hdmlnYXRpb24gYmVnaW5zLCB0aGUgcmF3IGBVcmxUcmVlYCBpcyB1cGRhdGVkIHRvIHRoZSBmdWxsIFVSTCB0aGF0J3MgYmVpbmdcbiAgICogbmF2aWdhdGVkIHRvLlxuICAgKiAyLiBEdXJpbmcgYSBuYXZpZ2F0aW9uLCByZWRpcmVjdHMgYXJlIGFwcGxpZWQsIHdoaWNoIG1pZ2h0IG9ubHkgYXBwbHkgdG8gX3BhcnRfIG9mIHRoZSBVUkwgKGR1ZVxuICAgKiB0byBgVXJsSGFuZGxpbmdTdHJhdGVneWApLlxuICAgKiAzLiBKdXN0IGJlZm9yZSBhY3RpdmF0aW9uLCB0aGUgcmF3IGBVcmxUcmVlYCBpcyB1cGRhdGVkIHRvIGluY2x1ZGUgdGhlIHJlZGlyZWN0cyBvbiB0b3Agb2YgdGhlXG4gICAqIG9yaWdpbmFsIHJhdyBVUkwuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGlzIGlzIF9vbmx5XyBoZXJlIHRvIHN1cHBvcnQgYFVybEhhbmRsaW5nU3RyYXRlZ3kuZXh0cmFjdGAgYW5kXG4gICAqIGBVcmxIYW5kbGluZ1N0cmF0ZWd5LnNob3VsZFByb2Nlc3NVcmxgLiBXaXRob3V0IHRob3NlIEFQSXMsIHRoZSBjdXJyZW50IGBVcmxUcmVlYCB3b3VsZCBub3RcbiAgICogZGV2aWF0ZWQgZnJvbSB0aGUgcmF3IGBVcmxUcmVlYC5cbiAgICpcbiAgICogRm9yIGBleHRyYWN0YCwgYSByYXcgYFVybFRyZWVgIGlzIG5lZWRlZCBiZWNhdXNlIGBleHRyYWN0YCBtYXkgb25seSByZXR1cm4gcGFydFxuICAgKiBvZiB0aGUgbmF2aWdhdGlvbiBVUkwuIFRodXMsIHRoZSBjdXJyZW50IGBVcmxUcmVlYCBtYXkgb25seSByZXByZXNlbnQgX3BhcnRfIG9mIHRoZSBicm93c2VyXG4gICAqIFVSTC4gV2hlbiBhIG5hdmlnYXRpb24gZ2V0cyBjYW5jZWxsZWQgYW5kIHRoZSByb3V0ZXIgbmVlZHMgdG8gcmVzZXQgdGhlIFVSTCBvciBhIG5ldyBuYXZpZ2F0aW9uXG4gICAqIG9jY3VycywgaXQgbmVlZHMgdG8ga25vdyB0aGUgX3dob2xlXyBicm93c2VyIFVSTCwgbm90IGp1c3QgdGhlIHBhcnQgaGFuZGxlZCBieVxuICAgKiBgVXJsSGFuZGxpbmdTdHJhdGVneWAuXG4gICAqIEZvciBgc2hvdWxkUHJvY2Vzc1VybGAsIHdoZW4gdGhlIHJldHVybiBpcyBgZmFsc2VgLCB0aGUgcm91dGVyIGlnbm9yZXMgdGhlIG5hdmlnYXRpb24gYnV0XG4gICAqIHN0aWxsIHVwZGF0ZXMgdGhlIHJhdyBgVXJsVHJlZWAgd2l0aCB0aGUgYXNzdW1wdGlvbiB0aGF0IHRoZSBuYXZpZ2F0aW9uIHdhcyBjYXVzZWQgYnkgdGhlXG4gICAqIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lciBkdWUgdG8gYSBVUkwgdXBkYXRlIGJ5IHRoZSBBbmd1bGFySlMgcm91dGVyLiBJbiB0aGlzIGNhc2UsIHRoZSByb3V0ZXJcbiAgICogc3RpbGwgbmVlZCB0byBrbm93IHdoYXQgdGhlIGJyb3dzZXIncyBVUkwgaXMgZm9yIGZ1dHVyZSBuYXZpZ2F0aW9ucy5cbiAgICovXG4gIGFic3RyYWN0IGdldFJhd1VybFRyZWUoKTogVXJsVHJlZTtcblxuICAvKiogUmV0dXJucyB0aGUgY3VycmVudCBzdGF0ZSBzdG9yZWQgYnkgdGhlIGJyb3dzZXIgZm9yIHRoZSBjdXJyZW50IGhpc3RvcnkgZW50cnkuICovXG4gIGFic3RyYWN0IHJlc3RvcmVkU3RhdGUoKTogUmVzdG9yZWRTdGF0ZXxudWxsfHVuZGVmaW5lZDtcblxuICAvKiogUmV0dXJucyB0aGUgY3VycmVudCBSb3V0ZXJTdGF0ZS4gKi9cbiAgYWJzdHJhY3QgZ2V0Um91dGVyU3RhdGUoKTogUm91dGVyU3RhdGU7XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBhIGxpc3RlbmVyIHRoYXQgaXMgY2FsbGVkIHdoZW5ldmVyIHRoZSBjdXJyZW50IGhpc3RvcnkgZW50cnkgY2hhbmdlcyBieSBzb21lIEFQSVxuICAgKiBvdXRzaWRlIHRoZSBSb3V0ZXIuIFRoaXMgaW5jbHVkZXMgdXNlci1hY3RpdmF0ZWQgY2hhbmdlcyBsaWtlIGJhY2sgYnV0dG9ucyBhbmQgbGluayBjbGlja3MsIGJ1dFxuICAgKiBhbHNvIGluY2x1ZGVzIHByb2dyYW1tYXRpYyBBUElzIGNhbGxlZCBieSBub24tUm91dGVyIEphdmFTY3JpcHQuXG4gICAqL1xuICBhYnN0cmFjdCByZWdpc3Rlck5vblJvdXRlckN1cnJlbnRFbnRyeUNoYW5nZUxpc3RlbmVyKFxuICAgICAgbGlzdGVuZXI6ICh1cmw6IHN0cmluZywgc3RhdGU6IFJlc3RvcmVkU3RhdGV8bnVsbHx1bmRlZmluZWQpID0+IHZvaWQpOiBTdWJzY3JpcHRpb25MaWtlO1xuXG4gIC8qKlxuICAgKiBIYW5kbGVzIGEgbmF2aWdhdGlvbiBldmVudCBzZW50IGZyb20gdGhlIFJvdXRlci4gVGhlc2UgYXJlIHR5cGljYWxseSBldmVudHMgdGhhdCBpbmRpY2F0ZSBhXG4gICAqIG5hdmlnYXRpb24gaGFzIHN0YXJ0ZWQsIHByb2dyZXNzZWQsIGJlZW4gY2FuY2VsbGVkLCBvciBmaW5pc2hlZC5cbiAgICovXG4gIGFic3RyYWN0IGhhbmRsZVJvdXRlckV2ZW50KGU6IEV2ZW50fFByaXZhdGVSb3V0ZXJFdmVudHMsIGN1cnJlbnRUcmFuc2l0aW9uOiBOYXZpZ2F0aW9uKTogdm9pZDtcbn1cblxuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgSGlzdG9yeVN0YXRlTWFuYWdlciBleHRlbmRzIFN0YXRlTWFuYWdlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgbG9jYXRpb24gPSBpbmplY3QoTG9jYXRpb24pO1xuICBwcml2YXRlIHJlYWRvbmx5IHVybFNlcmlhbGl6ZXIgPSBpbmplY3QoVXJsU2VyaWFsaXplcik7XG4gIHByaXZhdGUgcmVhZG9ubHkgb3B0aW9ucyA9IGluamVjdChST1VURVJfQ09ORklHVVJBVElPTiwge29wdGlvbmFsOiB0cnVlfSkgfHwge307XG4gIHByaXZhdGUgcmVhZG9ubHkgY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9XG4gICAgICB0aGlzLm9wdGlvbnMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiB8fCAncmVwbGFjZSc7XG5cbiAgcHJpdmF0ZSB1cmxIYW5kbGluZ1N0cmF0ZWd5ID0gaW5qZWN0KFVybEhhbmRsaW5nU3RyYXRlZ3kpO1xuICBwcml2YXRlIHVybFVwZGF0ZVN0cmF0ZWd5ID0gdGhpcy5vcHRpb25zLnVybFVwZGF0ZVN0cmF0ZWd5IHx8ICdkZWZlcnJlZCc7XG5cbiAgcHJpdmF0ZSBjdXJyZW50VXJsVHJlZSA9IG5ldyBVcmxUcmVlKCk7XG5cbiAgb3ZlcnJpZGUgZ2V0Q3VycmVudFVybFRyZWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY3VycmVudFVybFRyZWU7XG4gIH1cblxuICBwcml2YXRlIHJhd1VybFRyZWUgPSB0aGlzLmN1cnJlbnRVcmxUcmVlO1xuXG4gIG92ZXJyaWRlIGdldFJhd1VybFRyZWUoKSB7XG4gICAgcmV0dXJuIHRoaXMucmF3VXJsVHJlZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgaWQgb2YgdGhlIGN1cnJlbnRseSBhY3RpdmUgcGFnZSBpbiB0aGUgcm91dGVyLlxuICAgKiBVcGRhdGVkIHRvIHRoZSB0cmFuc2l0aW9uJ3MgdGFyZ2V0IGlkIG9uIGEgc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBUaGlzIGlzIHVzZWQgdG8gdHJhY2sgd2hhdCBwYWdlIHRoZSByb3V0ZXIgbGFzdCBhY3RpdmF0ZWQuIFdoZW4gYW4gYXR0ZW1wdGVkIG5hdmlnYXRpb24gZmFpbHMsXG4gICAqIHRoZSByb3V0ZXIgY2FuIHRoZW4gdXNlIHRoaXMgdG8gY29tcHV0ZSBob3cgdG8gcmVzdG9yZSB0aGUgc3RhdGUgYmFjayB0byB0aGUgcHJldmlvdXNseSBhY3RpdmVcbiAgICogcGFnZS5cbiAgICovXG4gIHByaXZhdGUgY3VycmVudFBhZ2VJZDogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBsYXN0U3VjY2Vzc2Z1bElkOiBudW1iZXIgPSAtMTtcblxuICBvdmVycmlkZSByZXN0b3JlZFN0YXRlKCk6IFJlc3RvcmVkU3RhdGV8bnVsbHx1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmxvY2F0aW9uLmdldFN0YXRlKCkgYXMgUmVzdG9yZWRTdGF0ZSB8IG51bGwgfCB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogVGhlIMm1cm91dGVyUGFnZUlkIG9mIHdoYXRldmVyIHBhZ2UgaXMgY3VycmVudGx5IGFjdGl2ZSBpbiB0aGUgYnJvd3NlciBoaXN0b3J5LiBUaGlzIGlzXG4gICAqIGltcG9ydGFudCBmb3IgY29tcHV0aW5nIHRoZSB0YXJnZXQgcGFnZSBpZCBmb3IgbmV3IG5hdmlnYXRpb25zIGJlY2F1c2Ugd2UgbmVlZCB0byBlbnN1cmUgZWFjaFxuICAgKiBwYWdlIGlkIGluIHRoZSBicm93c2VyIGhpc3RvcnkgaXMgMSBtb3JlIHRoYW4gdGhlIHByZXZpb3VzIGVudHJ5LlxuICAgKi9cbiAgcHJpdmF0ZSBnZXQgYnJvd3NlclBhZ2VJZCgpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gIT09ICdjb21wdXRlZCcpIHtcbiAgICAgIHJldHVybiB0aGlzLmN1cnJlbnRQYWdlSWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlc3RvcmVkU3RhdGUoKT8uybVyb3V0ZXJQYWdlSWQgPz8gdGhpcy5jdXJyZW50UGFnZUlkO1xuICB9XG5cbiAgcHJpdmF0ZSByb3V0ZXJTdGF0ZSA9IGNyZWF0ZUVtcHR5U3RhdGUodGhpcy5jdXJyZW50VXJsVHJlZSwgbnVsbCk7XG5cbiAgb3ZlcnJpZGUgZ2V0Um91dGVyU3RhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMucm91dGVyU3RhdGU7XG4gIH1cblxuICBwcml2YXRlIHN0YXRlTWVtZW50byA9IHRoaXMuY3JlYXRlU3RhdGVNZW1lbnRvKCk7XG5cbiAgcHJpdmF0ZSBjcmVhdGVTdGF0ZU1lbWVudG8oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJhd1VybFRyZWU6IHRoaXMucmF3VXJsVHJlZSxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgcm91dGVyU3RhdGU6IHRoaXMucm91dGVyU3RhdGUsXG4gICAgfTtcbiAgfVxuXG4gIG92ZXJyaWRlIHJlZ2lzdGVyTm9uUm91dGVyQ3VycmVudEVudHJ5Q2hhbmdlTGlzdGVuZXIoXG4gICAgICBsaXN0ZW5lcjogKHVybDogc3RyaW5nLCBzdGF0ZTogUmVzdG9yZWRTdGF0ZXxudWxsfHVuZGVmaW5lZCkgPT4gdm9pZCk6IFN1YnNjcmlwdGlvbkxpa2Uge1xuICAgIHJldHVybiB0aGlzLmxvY2F0aW9uLnN1YnNjcmliZShldmVudCA9PiB7XG4gICAgICBpZiAoZXZlbnRbJ3R5cGUnXSA9PT0gJ3BvcHN0YXRlJykge1xuICAgICAgICBsaXN0ZW5lcihldmVudFsndXJsJ10hLCBldmVudC5zdGF0ZSBhcyBSZXN0b3JlZFN0YXRlIHwgbnVsbCB8IHVuZGVmaW5lZCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBvdmVycmlkZSBoYW5kbGVSb3V0ZXJFdmVudChlOiBFdmVudHxQcml2YXRlUm91dGVyRXZlbnRzLCBjdXJyZW50VHJhbnNpdGlvbjogTmF2aWdhdGlvbikge1xuICAgIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvblN0YXJ0KSB7XG4gICAgICB0aGlzLnN0YXRlTWVtZW50byA9IHRoaXMuY3JlYXRlU3RhdGVNZW1lbnRvKCk7XG4gICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvblNraXBwZWQpIHtcbiAgICAgIHRoaXMucmF3VXJsVHJlZSA9IGN1cnJlbnRUcmFuc2l0aW9uLmluaXRpYWxVcmw7XG4gICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgUm91dGVzUmVjb2duaXplZCkge1xuICAgICAgaWYgKHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcicpIHtcbiAgICAgICAgaWYgKCFjdXJyZW50VHJhbnNpdGlvbi5leHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgICAgY29uc3QgcmF3VXJsID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKFxuICAgICAgICAgICAgICBjdXJyZW50VHJhbnNpdGlvbi5maW5hbFVybCEsIGN1cnJlbnRUcmFuc2l0aW9uLmluaXRpYWxVcmwpO1xuICAgICAgICAgIHRoaXMuc2V0QnJvd3NlclVybChyYXdVcmwsIGN1cnJlbnRUcmFuc2l0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIEJlZm9yZUFjdGl2YXRlUm91dGVzKSB7XG4gICAgICB0aGlzLmN1cnJlbnRVcmxUcmVlID0gY3VycmVudFRyYW5zaXRpb24uZmluYWxVcmwhO1xuICAgICAgdGhpcy5yYXdVcmxUcmVlID1cbiAgICAgICAgICB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UoY3VycmVudFRyYW5zaXRpb24uZmluYWxVcmwhLCBjdXJyZW50VHJhbnNpdGlvbi5pbml0aWFsVXJsKTtcbiAgICAgIHRoaXMucm91dGVyU3RhdGUgPSBjdXJyZW50VHJhbnNpdGlvbi50YXJnZXRSb3V0ZXJTdGF0ZSE7XG4gICAgICBpZiAodGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2RlZmVycmVkJykge1xuICAgICAgICBpZiAoIWN1cnJlbnRUcmFuc2l0aW9uLmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgICB0aGlzLnNldEJyb3dzZXJVcmwodGhpcy5yYXdVcmxUcmVlLCBjdXJyZW50VHJhbnNpdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkNhbmNlbCAmJlxuICAgICAgICAoZS5jb2RlID09PSBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZS5HdWFyZFJlamVjdGVkIHx8XG4gICAgICAgICBlLmNvZGUgPT09IE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLk5vRGF0YUZyb21SZXNvbHZlcikpIHtcbiAgICAgIHRoaXMucmVzdG9yZUhpc3RvcnkoY3VycmVudFRyYW5zaXRpb24pO1xuICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FcnJvcikge1xuICAgICAgdGhpcy5yZXN0b3JlSGlzdG9yeShjdXJyZW50VHJhbnNpdGlvbiwgdHJ1ZSk7XG4gICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCkge1xuICAgICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bElkID0gZS5pZDtcbiAgICAgIHRoaXMuY3VycmVudFBhZ2VJZCA9IHRoaXMuYnJvd3NlclBhZ2VJZDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHNldEJyb3dzZXJVcmwodXJsOiBVcmxUcmVlLCB0cmFuc2l0aW9uOiBOYXZpZ2F0aW9uKSB7XG4gICAgY29uc3QgcGF0aCA9IHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodXJsKTtcbiAgICBpZiAodGhpcy5sb2NhdGlvbi5pc0N1cnJlbnRQYXRoRXF1YWxUbyhwYXRoKSB8fCAhIXRyYW5zaXRpb24uZXh0cmFzLnJlcGxhY2VVcmwpIHtcbiAgICAgIC8vIHJlcGxhY2VtZW50cyBkbyBub3QgdXBkYXRlIHRoZSB0YXJnZXQgcGFnZVxuICAgICAgY29uc3QgY3VycmVudEJyb3dzZXJQYWdlSWQgPSB0aGlzLmJyb3dzZXJQYWdlSWQ7XG4gICAgICBjb25zdCBzdGF0ZSA9IHtcbiAgICAgICAgLi4udHJhbnNpdGlvbi5leHRyYXMuc3RhdGUsXG4gICAgICAgIC4uLnRoaXMuZ2VuZXJhdGVOZ1JvdXRlclN0YXRlKHRyYW5zaXRpb24uaWQsIGN1cnJlbnRCcm93c2VyUGFnZUlkKVxuICAgICAgfTtcbiAgICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKHBhdGgsICcnLCBzdGF0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHN0YXRlID0ge1xuICAgICAgICAuLi50cmFuc2l0aW9uLmV4dHJhcy5zdGF0ZSxcbiAgICAgICAgLi4udGhpcy5nZW5lcmF0ZU5nUm91dGVyU3RhdGUodHJhbnNpdGlvbi5pZCwgdGhpcy5icm93c2VyUGFnZUlkICsgMSlcbiAgICAgIH07XG4gICAgICB0aGlzLmxvY2F0aW9uLmdvKHBhdGgsICcnLCBzdGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBlcmZvcm1zIHRoZSBuZWNlc3Nhcnkgcm9sbGJhY2sgYWN0aW9uIHRvIHJlc3RvcmUgdGhlIGJyb3dzZXIgVVJMIHRvIHRoZVxuICAgKiBzdGF0ZSBiZWZvcmUgdGhlIHRyYW5zaXRpb24uXG4gICAqL1xuICBwcml2YXRlIHJlc3RvcmVIaXN0b3J5KG5hdmlnYXRpb246IE5hdmlnYXRpb24sIHJlc3RvcmluZ0Zyb21DYXVnaHRFcnJvciA9IGZhbHNlKSB7XG4gICAgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ2NvbXB1dGVkJykge1xuICAgICAgY29uc3QgY3VycmVudEJyb3dzZXJQYWdlSWQgPSB0aGlzLmJyb3dzZXJQYWdlSWQ7XG4gICAgICBjb25zdCB0YXJnZXRQYWdlUG9zaXRpb24gPSB0aGlzLmN1cnJlbnRQYWdlSWQgLSBjdXJyZW50QnJvd3NlclBhZ2VJZDtcbiAgICAgIGlmICh0YXJnZXRQYWdlUG9zaXRpb24gIT09IDApIHtcbiAgICAgICAgdGhpcy5sb2NhdGlvbi5oaXN0b3J5R28odGFyZ2V0UGFnZVBvc2l0aW9uKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5jdXJyZW50VXJsVHJlZSA9PT0gbmF2aWdhdGlvbi5maW5hbFVybCAmJiB0YXJnZXRQYWdlUG9zaXRpb24gPT09IDApIHtcbiAgICAgICAgLy8gV2UgZ290IHRvIHRoZSBhY3RpdmF0aW9uIHN0YWdlICh3aGVyZSBjdXJyZW50VXJsVHJlZSBpcyBzZXQgdG8gdGhlIG5hdmlnYXRpb24nc1xuICAgICAgICAvLyBmaW5hbFVybCksIGJ1dCB3ZSB3ZXJlbid0IG1vdmluZyBhbnl3aGVyZSBpbiBoaXN0b3J5IChza2lwTG9jYXRpb25DaGFuZ2Ugb3IgcmVwbGFjZVVybCkuXG4gICAgICAgIC8vIFdlIHN0aWxsIG5lZWQgdG8gcmVzZXQgdGhlIHJvdXRlciBzdGF0ZSBiYWNrIHRvIHdoYXQgaXQgd2FzIHdoZW4gdGhlIG5hdmlnYXRpb24gc3RhcnRlZC5cbiAgICAgICAgdGhpcy5yZXNldFN0YXRlKG5hdmlnYXRpb24pO1xuICAgICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhlIGJyb3dzZXIgVVJMIGFuZCByb3V0ZXIgc3RhdGUgd2FzIG5vdCB1cGRhdGVkIGJlZm9yZSB0aGUgbmF2aWdhdGlvbiBjYW5jZWxsZWQgc29cbiAgICAgICAgLy8gdGhlcmUncyBubyByZXN0b3JhdGlvbiBuZWVkZWQuXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdyZXBsYWNlJykge1xuICAgICAgLy8gVE9ETyhhdHNjb3R0KTogSXQgc2VlbXMgbGlrZSB3ZSBzaG91bGQgX2Fsd2F5c18gcmVzZXQgdGhlIHN0YXRlIGhlcmUuIEl0IHdvdWxkIGJlIGEgbm8tb3BcbiAgICAgIC8vIGZvciBgZGVmZXJyZWRgIG5hdmlnYXRpb25zIHRoYXQgaGF2ZW4ndCBjaGFuZ2UgdGhlIGludGVybmFsIHN0YXRlIHlldCBiZWNhdXNlIGd1YXJkc1xuICAgICAgLy8gcmVqZWN0LiBGb3IgJ2VhZ2VyJyBuYXZpZ2F0aW9ucywgaXQgc2VlbXMgbGlrZSB3ZSBhbHNvIHJlYWxseSBzaG91bGQgcmVzZXQgdGhlIHN0YXRlXG4gICAgICAvLyBiZWNhdXNlIHRoZSBuYXZpZ2F0aW9uIHdhcyBjYW5jZWxsZWQuIEludmVzdGlnYXRlIGlmIHRoaXMgY2FuIGJlIGRvbmUgYnkgcnVubmluZyBUR1AuXG4gICAgICBpZiAocmVzdG9yaW5nRnJvbUNhdWdodEVycm9yKSB7XG4gICAgICAgIHRoaXMucmVzZXRTdGF0ZShuYXZpZ2F0aW9uKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZXNldFN0YXRlKG5hdmlnYXRpb246IE5hdmlnYXRpb24pOiB2b2lkIHtcbiAgICB0aGlzLnJvdXRlclN0YXRlID0gdGhpcy5zdGF0ZU1lbWVudG8ucm91dGVyU3RhdGU7XG4gICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IHRoaXMuc3RhdGVNZW1lbnRvLmN1cnJlbnRVcmxUcmVlO1xuICAgIC8vIE5vdGUgaGVyZSB0aGF0IHdlIHVzZSB0aGUgdXJsSGFuZGxpbmdTdHJhdGVneSB0byBnZXQgdGhlIHJlc2V0IGByYXdVcmxUcmVlYCBiZWNhdXNlIGl0IG1heSBiZVxuICAgIC8vIGNvbmZpZ3VyZWQgdG8gaGFuZGxlIG9ubHkgcGFydCBvZiB0aGUgbmF2aWdhdGlvbiBVUkwuIFRoaXMgbWVhbnMgd2Ugd291bGQgb25seSB3YW50IHRvIHJlc2V0XG4gICAgLy8gdGhlIHBhcnQgb2YgdGhlIG5hdmlnYXRpb24gaGFuZGxlZCBieSB0aGUgQW5ndWxhciByb3V0ZXIgcmF0aGVyIHRoYW4gdGhlIHdob2xlIFVSTC4gSW5cbiAgICAvLyBhZGRpdGlvbiwgdGhlIFVSTEhhbmRsaW5nU3RyYXRlZ3kgbWF5IGJlIGNvbmZpZ3VyZWQgdG8gc3BlY2lmaWNhbGx5IHByZXNlcnZlIHBhcnRzIG9mIHRoZSBVUkxcbiAgICAvLyB3aGVuIG1lcmdpbmcsIHN1Y2ggYXMgdGhlIHF1ZXJ5IHBhcmFtcyBzbyB0aGV5IGFyZSBub3QgbG9zdCBvbiBhIHJlZnJlc2guXG4gICAgdGhpcy5yYXdVcmxUcmVlID1cbiAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHRoaXMuY3VycmVudFVybFRyZWUsIG5hdmlnYXRpb24uZmluYWxVcmwgPz8gdGhpcy5yYXdVcmxUcmVlKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk6IHZvaWQge1xuICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKFxuICAgICAgICB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHRoaXMucmF3VXJsVHJlZSksICcnLFxuICAgICAgICB0aGlzLmdlbmVyYXRlTmdSb3V0ZXJTdGF0ZSh0aGlzLmxhc3RTdWNjZXNzZnVsSWQsIHRoaXMuY3VycmVudFBhZ2VJZCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZU5nUm91dGVyU3RhdGUobmF2aWdhdGlvbklkOiBudW1iZXIsIHJvdXRlclBhZ2VJZDogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ2NvbXB1dGVkJykge1xuICAgICAgcmV0dXJuIHtuYXZpZ2F0aW9uSWQsIMm1cm91dGVyUGFnZUlkOiByb3V0ZXJQYWdlSWR9O1xuICAgIH1cbiAgICByZXR1cm4ge25hdmlnYXRpb25JZH07XG4gIH1cbn1cbiJdfQ==