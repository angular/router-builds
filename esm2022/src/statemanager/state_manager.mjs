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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.0-next.2+sha-914e453", ngImport: i0, type: StateManager, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.0.0-next.2+sha-914e453", ngImport: i0, type: StateManager, providedIn: 'root', useFactory: () => inject(HistoryStateManager) }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.0-next.2+sha-914e453", ngImport: i0, type: StateManager, decorators: [{
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
        this.routerState = createEmptyState(null);
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
        return this.location.subscribe((event) => {
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
            this.rawUrlTree = this.urlHandlingStrategy.merge(currentTransition.finalUrl, currentTransition.initialUrl);
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
                ...this.generateNgRouterState(transition.id, currentBrowserPageId),
            };
            this.location.replaceState(path, '', state);
        }
        else {
            const state = {
                ...transition.extras.state,
                ...this.generateNgRouterState(transition.id, this.browserPageId + 1),
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
        this.rawUrlTree = this.urlHandlingStrategy.merge(this.currentUrlTree, navigation.finalUrl ?? this.rawUrlTree);
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.0-next.2+sha-914e453", ngImport: i0, type: HistoryStateManager, deps: null, target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.0.0-next.2+sha-914e453", ngImport: i0, type: HistoryStateManager, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.0-next.2+sha-914e453", ngImport: i0, type: HistoryStateManager, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGVfbWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvc3RhdGVtYW5hZ2VyL3N0YXRlX21hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxNQUFNLEVBQUUsVUFBVSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBR2pELE9BQU8sRUFDTCxvQkFBb0IsRUFFcEIsZ0JBQWdCLEVBQ2hCLDBCQUEwQixFQUMxQixhQUFhLEVBQ2IsZUFBZSxFQUNmLGlCQUFpQixFQUNqQixlQUFlLEVBRWYsZ0JBQWdCLEdBQ2pCLE1BQU0sV0FBVyxDQUFDO0FBRW5CLE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3RELE9BQU8sRUFBQyxnQkFBZ0IsRUFBYyxNQUFNLGlCQUFpQixDQUFDO0FBQzlELE9BQU8sRUFBQyxtQkFBbUIsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQzdELE9BQU8sRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFDLE1BQU0sYUFBYSxDQUFDOztBQUduRCxNQUFNLE9BQWdCLFlBQVk7eUhBQVosWUFBWTs2SEFBWixZQUFZLGNBRFQsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQzs7c0dBQ3hELFlBQVk7a0JBRGpDLFVBQVU7bUJBQUMsRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsRUFBQzs7QUErRC9FLE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxZQUFZO0lBRHJEOztRQUVtQixhQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzVCLGtCQUFhLEdBQUcsTUFBTSxDQUFDLGFB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R0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUM5QyxJQUFJLENBQUMsY0FBYyxFQUNuQixVQUFVLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQ3ZDLENBQUM7SUFDSixDQUFDO0lBRU8sd0JBQXdCO1FBQzlCLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUN4QixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQzdDLEVBQUUsRUFDRixJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FDdEUsQ0FBQztJQUNKLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxZQUFvQixFQUFFLFlBQW9CO1FBQ3RFLElBQUksSUFBSSxDQUFDLDRCQUE0QixLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ3JELE9BQU8sRUFBQyxZQUFZLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBQyxDQUFDO1FBQ3JELENBQUM7UUFDRCxPQUFPLEVBQUMsWUFBWSxFQUFDLENBQUM7SUFDeEIsQ0FBQzt5SEFsTVUsbUJBQW1COzZIQUFuQixtQkFBbUIsY0FEUCxNQUFNOztzR0FDbEIsbUJBQW1CO2tCQUQvQixVQUFVO21CQUFDLEVBQUMsVUFBVSxFQUFFLE1BQU0sRUFBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtpbmplY3QsIEluamVjdGFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtTdWJzY3JpcHRpb25MaWtlfSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtcbiAgQmVmb3JlQWN0aXZhdGVSb3V0ZXMsXG4gIEV2ZW50LFxuICBOYXZpZ2F0aW9uQ2FuY2VsLFxuICBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZSxcbiAgTmF2aWdhdGlvbkVuZCxcbiAgTmF2aWdhdGlvbkVycm9yLFxuICBOYXZpZ2F0aW9uU2tpcHBlZCxcbiAgTmF2aWdhdGlvblN0YXJ0LFxuICBQcml2YXRlUm91dGVyRXZlbnRzLFxuICBSb3V0ZXNSZWNvZ25pemVkLFxufSBmcm9tICcuLi9ldmVudHMnO1xuaW1wb3J0IHtOYXZpZ2F0aW9uLCBSZXN0b3JlZFN0YXRlfSBmcm9tICcuLi9uYXZpZ2F0aW9uX3RyYW5zaXRpb24nO1xuaW1wb3J0IHtST1VURVJfQ09ORklHVVJBVElPTn0gZnJvbSAnLi4vcm91dGVyX2NvbmZpZyc7XG5pbXBvcnQge2NyZWF0ZUVtcHR5U3RhdGUsIFJvdXRlclN0YXRlfSBmcm9tICcuLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtVcmxIYW5kbGluZ1N0cmF0ZWd5fSBmcm9tICcuLi91cmxfaGFuZGxpbmdfc3RyYXRlZ3knO1xuaW1wb3J0IHtVcmxTZXJpYWxpemVyLCBVcmxUcmVlfSBmcm9tICcuLi91cmxfdHJlZSc7XG5cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCcsIHVzZUZhY3Rvcnk6ICgpID0+IGluamVjdChIaXN0b3J5U3RhdGVNYW5hZ2VyKX0pXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgU3RhdGVNYW5hZ2VyIHtcbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGN1cnJlbnRseSBhY3RpdmF0ZWQgYFVybFRyZWVgLlxuICAgKlxuICAgKiBUaGlzIGBVcmxUcmVlYCBzaG93cyBvbmx5IFVSTHMgdGhhdCB0aGUgYFJvdXRlcmAgaXMgY29uZmlndXJlZCB0byBoYW5kbGUgKHRocm91Z2hcbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3lgKS5cbiAgICpcbiAgICogVGhlIHZhbHVlIGlzIHNldCBhZnRlciBmaW5kaW5nIHRoZSByb3V0ZSBjb25maWcgdHJlZSB0byBhY3RpdmF0ZSBidXQgYmVmb3JlIGFjdGl2YXRpbmcgdGhlXG4gICAqIHJvdXRlLlxuICAgKi9cbiAgYWJzdHJhY3QgZ2V0Q3VycmVudFVybFRyZWUoKTogVXJsVHJlZTtcblxuICAvKipcbiAgICogUmV0dXJucyBhIGBVcmxUcmVlYCB0aGF0IGlzIHJlcHJlc2VudHMgd2hhdCB0aGUgYnJvd3NlciBpcyBhY3R1YWxseSBzaG93aW5nLlxuICAgKlxuICAgKiBJbiB0aGUgbGlmZSBvZiBhIG5hdmlnYXRpb24gdHJhbnNpdGlvbjpcbiAgICogMS4gV2hlbiBhIG5hdmlnYXRpb24gYmVnaW5zLCB0aGUgcmF3IGBVcmxUcmVlYCBpcyB1cGRhdGVkIHRvIHRoZSBmdWxsIFVSTCB0aGF0J3MgYmVpbmdcbiAgICogbmF2aWdhdGVkIHRvLlxuICAgKiAyLiBEdXJpbmcgYSBuYXZpZ2F0aW9uLCByZWRpcmVjdHMgYXJlIGFwcGxpZWQsIHdoaWNoIG1pZ2h0IG9ubHkgYXBwbHkgdG8gX3BhcnRfIG9mIHRoZSBVUkwgKGR1ZVxuICAgKiB0byBgVXJsSGFuZGxpbmdTdHJhdGVneWApLlxuICAgKiAzLiBKdXN0IGJlZm9yZSBhY3RpdmF0aW9uLCB0aGUgcmF3IGBVcmxUcmVlYCBpcyB1cGRhdGVkIHRvIGluY2x1ZGUgdGhlIHJlZGlyZWN0cyBvbiB0b3Agb2YgdGhlXG4gICAqIG9yaWdpbmFsIHJhdyBVUkwuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGlzIGlzIF9vbmx5XyBoZXJlIHRvIHN1cHBvcnQgYFVybEhhbmRsaW5nU3RyYXRlZ3kuZXh0cmFjdGAgYW5kXG4gICAqIGBVcmxIYW5kbGluZ1N0cmF0ZWd5LnNob3VsZFByb2Nlc3NVcmxgLiBXaXRob3V0IHRob3NlIEFQSXMsIHRoZSBjdXJyZW50IGBVcmxUcmVlYCB3b3VsZCBub3RcbiAgICogZGV2aWF0ZWQgZnJvbSB0aGUgcmF3IGBVcmxUcmVlYC5cbiAgICpcbiAgICogRm9yIGBleHRyYWN0YCwgYSByYXcgYFVybFRyZWVgIGlzIG5lZWRlZCBiZWNhdXNlIGBleHRyYWN0YCBtYXkgb25seSByZXR1cm4gcGFydFxuICAgKiBvZiB0aGUgbmF2aWdhdGlvbiBVUkwuIFRodXMsIHRoZSBjdXJyZW50IGBVcmxUcmVlYCBtYXkgb25seSByZXByZXNlbnQgX3BhcnRfIG9mIHRoZSBicm93c2VyXG4gICAqIFVSTC4gV2hlbiBhIG5hdmlnYXRpb24gZ2V0cyBjYW5jZWxsZWQgYW5kIHRoZSByb3V0ZXIgbmVlZHMgdG8gcmVzZXQgdGhlIFVSTCBvciBhIG5ldyBuYXZpZ2F0aW9uXG4gICAqIG9jY3VycywgaXQgbmVlZHMgdG8ga25vdyB0aGUgX3dob2xlXyBicm93c2VyIFVSTCwgbm90IGp1c3QgdGhlIHBhcnQgaGFuZGxlZCBieVxuICAgKiBgVXJsSGFuZGxpbmdTdHJhdGVneWAuXG4gICAqIEZvciBgc2hvdWxkUHJvY2Vzc1VybGAsIHdoZW4gdGhlIHJldHVybiBpcyBgZmFsc2VgLCB0aGUgcm91dGVyIGlnbm9yZXMgdGhlIG5hdmlnYXRpb24gYnV0XG4gICAqIHN0aWxsIHVwZGF0ZXMgdGhlIHJhdyBgVXJsVHJlZWAgd2l0aCB0aGUgYXNzdW1wdGlvbiB0aGF0IHRoZSBuYXZpZ2F0aW9uIHdhcyBjYXVzZWQgYnkgdGhlXG4gICAqIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lciBkdWUgdG8gYSBVUkwgdXBkYXRlIGJ5IHRoZSBBbmd1bGFySlMgcm91dGVyLiBJbiB0aGlzIGNhc2UsIHRoZSByb3V0ZXJcbiAgICogc3RpbGwgbmVlZCB0byBrbm93IHdoYXQgdGhlIGJyb3dzZXIncyBVUkwgaXMgZm9yIGZ1dHVyZSBuYXZpZ2F0aW9ucy5cbiAgICovXG4gIGFic3RyYWN0IGdldFJhd1VybFRyZWUoKTogVXJsVHJlZTtcblxuICAvKiogUmV0dXJucyB0aGUgY3VycmVudCBzdGF0ZSBzdG9yZWQgYnkgdGhlIGJyb3dzZXIgZm9yIHRoZSBjdXJyZW50IGhpc3RvcnkgZW50cnkuICovXG4gIGFic3RyYWN0IHJlc3RvcmVkU3RhdGUoKTogUmVzdG9yZWRTdGF0ZSB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbiAgLyoqIFJldHVybnMgdGhlIGN1cnJlbnQgUm91dGVyU3RhdGUuICovXG4gIGFic3RyYWN0IGdldFJvdXRlclN0YXRlKCk6IFJvdXRlclN0YXRlO1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSBsaXN0ZW5lciB0aGF0IGlzIGNhbGxlZCB3aGVuZXZlciB0aGUgY3VycmVudCBoaXN0b3J5IGVudHJ5IGNoYW5nZXMgYnkgc29tZSBBUElcbiAgICogb3V0c2lkZSB0aGUgUm91dGVyLiBUaGlzIGluY2x1ZGVzIHVzZXItYWN0aXZhdGVkIGNoYW5nZXMgbGlrZSBiYWNrIGJ1dHRvbnMgYW5kIGxpbmsgY2xpY2tzLCBidXRcbiAgICogYWxzbyBpbmNsdWRlcyBwcm9ncmFtbWF0aWMgQVBJcyBjYWxsZWQgYnkgbm9uLVJvdXRlciBKYXZhU2NyaXB0LlxuICAgKi9cbiAgYWJzdHJhY3QgcmVnaXN0ZXJOb25Sb3V0ZXJDdXJyZW50RW50cnlDaGFuZ2VMaXN0ZW5lcihcbiAgICBsaXN0ZW5lcjogKHVybDogc3RyaW5nLCBzdGF0ZTogUmVzdG9yZWRTdGF0ZSB8IG51bGwgfCB1bmRlZmluZWQpID0+IHZvaWQsXG4gICk6IFN1YnNjcmlwdGlvbkxpa2U7XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgYSBuYXZpZ2F0aW9uIGV2ZW50IHNlbnQgZnJvbSB0aGUgUm91dGVyLiBUaGVzZSBhcmUgdHlwaWNhbGx5IGV2ZW50cyB0aGF0IGluZGljYXRlIGFcbiAgICogbmF2aWdhdGlvbiBoYXMgc3RhcnRlZCwgcHJvZ3Jlc3NlZCwgYmVlbiBjYW5jZWxsZWQsIG9yIGZpbmlzaGVkLlxuICAgKi9cbiAgYWJzdHJhY3QgaGFuZGxlUm91dGVyRXZlbnQoZTogRXZlbnQgfCBQcml2YXRlUm91dGVyRXZlbnRzLCBjdXJyZW50VHJhbnNpdGlvbjogTmF2aWdhdGlvbik6IHZvaWQ7XG59XG5cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCd9KVxuZXhwb3J0IGNsYXNzIEhpc3RvcnlTdGF0ZU1hbmFnZXIgZXh0ZW5kcyBTdGF0ZU1hbmFnZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IGxvY2F0aW9uID0gaW5qZWN0KExvY2F0aW9uKTtcbiAgcHJpdmF0ZSByZWFkb25seSB1cmxTZXJpYWxpemVyID0gaW5qZWN0KFVybFNlcmlhbGl6ZXIpO1xuICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnMgPSBpbmplY3QoUk9VVEVSX0NPTkZJR1VSQVRJT04sIHtvcHRpb25hbDogdHJ1ZX0pIHx8IHt9O1xuICBwcml2YXRlIHJlYWRvbmx5IGNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPVxuICAgIHRoaXMub3B0aW9ucy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uIHx8ICdyZXBsYWNlJztcblxuICBwcml2YXRlIHVybEhhbmRsaW5nU3RyYXRlZ3kgPSBpbmplY3QoVXJsSGFuZGxpbmdTdHJhdGVneSk7XG4gIHByaXZhdGUgdXJsVXBkYXRlU3RyYXRlZ3kgPSB0aGlzLm9wdGlvbnMudXJsVXBkYXRlU3RyYXRlZ3kgfHwgJ2RlZmVycmVkJztcblxuICBwcml2YXRlIGN1cnJlbnRVcmxUcmVlID0gbmV3IFVybFRyZWUoKTtcblxuICBvdmVycmlkZSBnZXRDdXJyZW50VXJsVHJlZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50VXJsVHJlZTtcbiAgfVxuXG4gIHByaXZhdGUgcmF3VXJsVHJlZSA9IHRoaXMuY3VycmVudFVybFRyZWU7XG5cbiAgb3ZlcnJpZGUgZ2V0UmF3VXJsVHJlZSgpIHtcbiAgICByZXR1cm4gdGhpcy5yYXdVcmxUcmVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBpZCBvZiB0aGUgY3VycmVudGx5IGFjdGl2ZSBwYWdlIGluIHRoZSByb3V0ZXIuXG4gICAqIFVwZGF0ZWQgdG8gdGhlIHRyYW5zaXRpb24ncyB0YXJnZXQgaWQgb24gYSBzdWNjZXNzZnVsIG5hdmlnYXRpb24uXG4gICAqXG4gICAqIFRoaXMgaXMgdXNlZCB0byB0cmFjayB3aGF0IHBhZ2UgdGhlIHJvdXRlciBsYXN0IGFjdGl2YXRlZC4gV2hlbiBhbiBhdHRlbXB0ZWQgbmF2aWdhdGlvbiBmYWlscyxcbiAgICogdGhlIHJvdXRlciBjYW4gdGhlbiB1c2UgdGhpcyB0byBjb21wdXRlIGhvdyB0byByZXN0b3JlIHRoZSBzdGF0ZSBiYWNrIHRvIHRoZSBwcmV2aW91c2x5IGFjdGl2ZVxuICAgKiBwYWdlLlxuICAgKi9cbiAgcHJpdmF0ZSBjdXJyZW50UGFnZUlkOiBudW1iZXIgPSAwO1xuICBwcml2YXRlIGxhc3RTdWNjZXNzZnVsSWQ6IG51bWJlciA9IC0xO1xuXG4gIG92ZXJyaWRlIHJlc3RvcmVkU3RhdGUoKTogUmVzdG9yZWRTdGF0ZSB8IG51bGwgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmxvY2F0aW9uLmdldFN0YXRlKCkgYXMgUmVzdG9yZWRTdGF0ZSB8IG51bGwgfCB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogVGhlIMm1cm91dGVyUGFnZUlkIG9mIHdoYXRldmVyIHBhZ2UgaXMgY3VycmVudGx5IGFjdGl2ZSBpbiB0aGUgYnJvd3NlciBoaXN0b3J5LiBUaGlzIGlzXG4gICAqIGltcG9ydGFudCBmb3IgY29tcHV0aW5nIHRoZSB0YXJnZXQgcGFnZSBpZCBmb3IgbmV3IG5hdmlnYXRpb25zIGJlY2F1c2Ugd2UgbmVlZCB0byBlbnN1cmUgZWFjaFxuICAgKiBwYWdlIGlkIGluIHRoZSBicm93c2VyIGhpc3RvcnkgaXMgMSBtb3JlIHRoYW4gdGhlIHByZXZpb3VzIGVudHJ5LlxuICAgKi9cbiAgcHJpdmF0ZSBnZXQgYnJvd3NlclBhZ2VJZCgpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gIT09ICdjb21wdXRlZCcpIHtcbiAgICAgIHJldHVybiB0aGlzLmN1cnJlbnRQYWdlSWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlc3RvcmVkU3RhdGUoKT8uybVyb3V0ZXJQYWdlSWQgPz8gdGhpcy5jdXJyZW50UGFnZUlkO1xuICB9XG5cbiAgcHJpdmF0ZSByb3V0ZXJTdGF0ZSA9IGNyZWF0ZUVtcHR5U3RhdGUobnVsbCk7XG5cbiAgb3ZlcnJpZGUgZ2V0Um91dGVyU3RhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMucm91dGVyU3RhdGU7XG4gIH1cblxuICBwcml2YXRlIHN0YXRlTWVtZW50byA9IHRoaXMuY3JlYXRlU3RhdGVNZW1lbnRvKCk7XG5cbiAgcHJpdmF0ZSBjcmVhdGVTdGF0ZU1lbWVudG8oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJhd1VybFRyZWU6IHRoaXMucmF3VXJsVHJlZSxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgcm91dGVyU3RhdGU6IHRoaXMucm91dGVyU3RhdGUsXG4gICAgfTtcbiAgfVxuXG4gIG92ZXJyaWRlIHJlZ2lzdGVyTm9uUm91dGVyQ3VycmVudEVudHJ5Q2hhbmdlTGlzdGVuZXIoXG4gICAgbGlzdGVuZXI6ICh1cmw6IHN0cmluZywgc3RhdGU6IFJlc3RvcmVkU3RhdGUgfCBudWxsIHwgdW5kZWZpbmVkKSA9PiB2b2lkLFxuICApOiBTdWJzY3JpcHRpb25MaWtlIHtcbiAgICByZXR1cm4gdGhpcy5sb2NhdGlvbi5zdWJzY3JpYmUoKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoZXZlbnRbJ3R5cGUnXSA9PT0gJ3BvcHN0YXRlJykge1xuICAgICAgICBsaXN0ZW5lcihldmVudFsndXJsJ10hLCBldmVudC5zdGF0ZSBhcyBSZXN0b3JlZFN0YXRlIHwgbnVsbCB8IHVuZGVmaW5lZCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBvdmVycmlkZSBoYW5kbGVSb3V0ZXJFdmVudChlOiBFdmVudCB8IFByaXZhdGVSb3V0ZXJFdmVudHMsIGN1cnJlbnRUcmFuc2l0aW9uOiBOYXZpZ2F0aW9uKSB7XG4gICAgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uU3RhcnQpIHtcbiAgICAgIHRoaXMuc3RhdGVNZW1lbnRvID0gdGhpcy5jcmVhdGVTdGF0ZU1lbWVudG8oKTtcbiAgICB9IGVsc2UgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uU2tpcHBlZCkge1xuICAgICAgdGhpcy5yYXdVcmxUcmVlID0gY3VycmVudFRyYW5zaXRpb24uaW5pdGlhbFVybDtcbiAgICB9IGVsc2UgaWYgKGUgaW5zdGFuY2VvZiBSb3V0ZXNSZWNvZ25pemVkKSB7XG4gICAgICBpZiAodGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJykge1xuICAgICAgICBpZiAoIWN1cnJlbnRUcmFuc2l0aW9uLmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgICBjb25zdCByYXdVcmwgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UoXG4gICAgICAgICAgICBjdXJyZW50VHJhbnNpdGlvbi5maW5hbFVybCEsXG4gICAgICAgICAgICBjdXJyZW50VHJhbnNpdGlvbi5pbml0aWFsVXJsLFxuICAgICAgICAgICk7XG4gICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHJhd1VybCwgY3VycmVudFRyYW5zaXRpb24pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgQmVmb3JlQWN0aXZhdGVSb3V0ZXMpIHtcbiAgICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSBjdXJyZW50VHJhbnNpdGlvbi5maW5hbFVybCE7XG4gICAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UoXG4gICAgICAgIGN1cnJlbnRUcmFuc2l0aW9uLmZpbmFsVXJsISxcbiAgICAgICAgY3VycmVudFRyYW5zaXRpb24uaW5pdGlhbFVybCxcbiAgICAgICk7XG4gICAgICB0aGlzLnJvdXRlclN0YXRlID0gY3VycmVudFRyYW5zaXRpb24udGFyZ2V0Um91dGVyU3RhdGUhO1xuICAgICAgaWYgKHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdkZWZlcnJlZCcpIHtcbiAgICAgICAgaWYgKCFjdXJyZW50VHJhbnNpdGlvbi5leHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHRoaXMucmF3VXJsVHJlZSwgY3VycmVudFRyYW5zaXRpb24pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uQ2FuY2VsICYmXG4gICAgICAoZS5jb2RlID09PSBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZS5HdWFyZFJlamVjdGVkIHx8XG4gICAgICAgIGUuY29kZSA9PT0gTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuTm9EYXRhRnJvbVJlc29sdmVyKVxuICAgICkge1xuICAgICAgdGhpcy5yZXN0b3JlSGlzdG9yeShjdXJyZW50VHJhbnNpdGlvbik7XG4gICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVycm9yKSB7XG4gICAgICB0aGlzLnJlc3RvcmVIaXN0b3J5KGN1cnJlbnRUcmFuc2l0aW9uLCB0cnVlKTtcbiAgICB9IGVsc2UgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSBlLmlkO1xuICAgICAgdGhpcy5jdXJyZW50UGFnZUlkID0gdGhpcy5icm93c2VyUGFnZUlkO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc2V0QnJvd3NlclVybCh1cmw6IFVybFRyZWUsIHRyYW5zaXRpb246IE5hdmlnYXRpb24pIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICAgIGlmICh0aGlzLmxvY2F0aW9uLmlzQ3VycmVudFBhdGhFcXVhbFRvKHBhdGgpIHx8ICEhdHJhbnNpdGlvbi5leHRyYXMucmVwbGFjZVVybCkge1xuICAgICAgLy8gcmVwbGFjZW1lbnRzIGRvIG5vdCB1cGRhdGUgdGhlIHRhcmdldCBwYWdlXG4gICAgICBjb25zdCBjdXJyZW50QnJvd3NlclBhZ2VJZCA9IHRoaXMuYnJvd3NlclBhZ2VJZDtcbiAgICAgIGNvbnN0IHN0YXRlID0ge1xuICAgICAgICAuLi50cmFuc2l0aW9uLmV4dHJhcy5zdGF0ZSxcbiAgICAgICAgLi4udGhpcy5nZW5lcmF0ZU5nUm91dGVyU3RhdGUodHJhbnNpdGlvbi5pZCwgY3VycmVudEJyb3dzZXJQYWdlSWQpLFxuICAgICAgfTtcbiAgICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKHBhdGgsICcnLCBzdGF0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHN0YXRlID0ge1xuICAgICAgICAuLi50cmFuc2l0aW9uLmV4dHJhcy5zdGF0ZSxcbiAgICAgICAgLi4udGhpcy5nZW5lcmF0ZU5nUm91dGVyU3RhdGUodHJhbnNpdGlvbi5pZCwgdGhpcy5icm93c2VyUGFnZUlkICsgMSksXG4gICAgICB9O1xuICAgICAgdGhpcy5sb2NhdGlvbi5nbyhwYXRoLCAnJywgc3RhdGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtcyB0aGUgbmVjZXNzYXJ5IHJvbGxiYWNrIGFjdGlvbiB0byByZXN0b3JlIHRoZSBicm93c2VyIFVSTCB0byB0aGVcbiAgICogc3RhdGUgYmVmb3JlIHRoZSB0cmFuc2l0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSByZXN0b3JlSGlzdG9yeShuYXZpZ2F0aW9uOiBOYXZpZ2F0aW9uLCByZXN0b3JpbmdGcm9tQ2F1Z2h0RXJyb3IgPSBmYWxzZSkge1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdjb21wdXRlZCcpIHtcbiAgICAgIGNvbnN0IGN1cnJlbnRCcm93c2VyUGFnZUlkID0gdGhpcy5icm93c2VyUGFnZUlkO1xuICAgICAgY29uc3QgdGFyZ2V0UGFnZVBvc2l0aW9uID0gdGhpcy5jdXJyZW50UGFnZUlkIC0gY3VycmVudEJyb3dzZXJQYWdlSWQ7XG4gICAgICBpZiAodGFyZ2V0UGFnZVBvc2l0aW9uICE9PSAwKSB7XG4gICAgICAgIHRoaXMubG9jYXRpb24uaGlzdG9yeUdvKHRhcmdldFBhZ2VQb3NpdGlvbik7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuY3VycmVudFVybFRyZWUgPT09IG5hdmlnYXRpb24uZmluYWxVcmwgJiYgdGFyZ2V0UGFnZVBvc2l0aW9uID09PSAwKSB7XG4gICAgICAgIC8vIFdlIGdvdCB0byB0aGUgYWN0aXZhdGlvbiBzdGFnZSAod2hlcmUgY3VycmVudFVybFRyZWUgaXMgc2V0IHRvIHRoZSBuYXZpZ2F0aW9uJ3NcbiAgICAgICAgLy8gZmluYWxVcmwpLCBidXQgd2Ugd2VyZW4ndCBtb3ZpbmcgYW55d2hlcmUgaW4gaGlzdG9yeSAoc2tpcExvY2F0aW9uQ2hhbmdlIG9yIHJlcGxhY2VVcmwpLlxuICAgICAgICAvLyBXZSBzdGlsbCBuZWVkIHRvIHJlc2V0IHRoZSByb3V0ZXIgc3RhdGUgYmFjayB0byB3aGF0IGl0IHdhcyB3aGVuIHRoZSBuYXZpZ2F0aW9uIHN0YXJ0ZWQuXG4gICAgICAgIHRoaXMucmVzZXRTdGF0ZShuYXZpZ2F0aW9uKTtcbiAgICAgICAgdGhpcy5yZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoZSBicm93c2VyIFVSTCBhbmQgcm91dGVyIHN0YXRlIHdhcyBub3QgdXBkYXRlZCBiZWZvcmUgdGhlIG5hdmlnYXRpb24gY2FuY2VsbGVkIHNvXG4gICAgICAgIC8vIHRoZXJlJ3Mgbm8gcmVzdG9yYXRpb24gbmVlZGVkLlxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAncmVwbGFjZScpIHtcbiAgICAgIC8vIFRPRE8oYXRzY290dCk6IEl0IHNlZW1zIGxpa2Ugd2Ugc2hvdWxkIF9hbHdheXNfIHJlc2V0IHRoZSBzdGF0ZSBoZXJlLiBJdCB3b3VsZCBiZSBhIG5vLW9wXG4gICAgICAvLyBmb3IgYGRlZmVycmVkYCBuYXZpZ2F0aW9ucyB0aGF0IGhhdmVuJ3QgY2hhbmdlIHRoZSBpbnRlcm5hbCBzdGF0ZSB5ZXQgYmVjYXVzZSBndWFyZHNcbiAgICAgIC8vIHJlamVjdC4gRm9yICdlYWdlcicgbmF2aWdhdGlvbnMsIGl0IHNlZW1zIGxpa2Ugd2UgYWxzbyByZWFsbHkgc2hvdWxkIHJlc2V0IHRoZSBzdGF0ZVxuICAgICAgLy8gYmVjYXVzZSB0aGUgbmF2aWdhdGlvbiB3YXMgY2FuY2VsbGVkLiBJbnZlc3RpZ2F0ZSBpZiB0aGlzIGNhbiBiZSBkb25lIGJ5IHJ1bm5pbmcgVEdQLlxuICAgICAgaWYgKHJlc3RvcmluZ0Zyb21DYXVnaHRFcnJvcikge1xuICAgICAgICB0aGlzLnJlc2V0U3RhdGUobmF2aWdhdGlvbik7XG4gICAgICB9XG4gICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRTdGF0ZShuYXZpZ2F0aW9uOiBOYXZpZ2F0aW9uKTogdm9pZCB7XG4gICAgdGhpcy5yb3V0ZXJTdGF0ZSA9IHRoaXMuc3RhdGVNZW1lbnRvLnJvdXRlclN0YXRlO1xuICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSB0aGlzLnN0YXRlTWVtZW50by5jdXJyZW50VXJsVHJlZTtcbiAgICAvLyBOb3RlIGhlcmUgdGhhdCB3ZSB1c2UgdGhlIHVybEhhbmRsaW5nU3RyYXRlZ3kgdG8gZ2V0IHRoZSByZXNldCBgcmF3VXJsVHJlZWAgYmVjYXVzZSBpdCBtYXkgYmVcbiAgICAvLyBjb25maWd1cmVkIHRvIGhhbmRsZSBvbmx5IHBhcnQgb2YgdGhlIG5hdmlnYXRpb24gVVJMLiBUaGlzIG1lYW5zIHdlIHdvdWxkIG9ubHkgd2FudCB0byByZXNldFxuICAgIC8vIHRoZSBwYXJ0IG9mIHRoZSBuYXZpZ2F0aW9uIGhhbmRsZWQgYnkgdGhlIEFuZ3VsYXIgcm91dGVyIHJhdGhlciB0aGFuIHRoZSB3aG9sZSBVUkwuIEluXG4gICAgLy8gYWRkaXRpb24sIHRoZSBVUkxIYW5kbGluZ1N0cmF0ZWd5IG1heSBiZSBjb25maWd1cmVkIHRvIHNwZWNpZmljYWxseSBwcmVzZXJ2ZSBwYXJ0cyBvZiB0aGUgVVJMXG4gICAgLy8gd2hlbiBtZXJnaW5nLCBzdWNoIGFzIHRoZSBxdWVyeSBwYXJhbXMgc28gdGhleSBhcmUgbm90IGxvc3Qgb24gYSByZWZyZXNoLlxuICAgIHRoaXMucmF3VXJsVHJlZSA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZShcbiAgICAgIHRoaXMuY3VycmVudFVybFRyZWUsXG4gICAgICBuYXZpZ2F0aW9uLmZpbmFsVXJsID8/IHRoaXMucmF3VXJsVHJlZSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTogdm9pZCB7XG4gICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUoXG4gICAgICB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHRoaXMucmF3VXJsVHJlZSksXG4gICAgICAnJyxcbiAgICAgIHRoaXMuZ2VuZXJhdGVOZ1JvdXRlclN0YXRlKHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCwgdGhpcy5jdXJyZW50UGFnZUlkKSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZU5nUm91dGVyU3RhdGUobmF2aWdhdGlvbklkOiBudW1iZXIsIHJvdXRlclBhZ2VJZDogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ2NvbXB1dGVkJykge1xuICAgICAgcmV0dXJuIHtuYXZpZ2F0aW9uSWQsIMm1cm91dGVyUGFnZUlkOiByb3V0ZXJQYWdlSWR9O1xuICAgIH1cbiAgICByZXR1cm4ge25hdmlnYXRpb25JZH07XG4gIH1cbn1cbiJdfQ==