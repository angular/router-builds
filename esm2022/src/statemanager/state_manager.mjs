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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.0-rc.0+sha-cea3e4b", ngImport: i0, type: StateManager, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.2.0-rc.0+sha-cea3e4b", ngImport: i0, type: StateManager, providedIn: 'root', useFactory: () => inject(HistoryStateManager) }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.0-rc.0+sha-cea3e4b", ngImport: i0, type: StateManager, decorators: [{
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
                    this.setBrowserUrl(currentTransition.targetBrowserUrl ?? rawUrl, currentTransition);
                }
            }
        }
        else if (e instanceof BeforeActivateRoutes) {
            this.currentUrlTree = currentTransition.finalUrl;
            this.rawUrlTree = this.urlHandlingStrategy.merge(currentTransition.finalUrl, currentTransition.initialUrl);
            this.routerState = currentTransition.targetRouterState;
            if (this.urlUpdateStrategy === 'deferred' && !currentTransition.extras.skipLocationChange) {
                this.setBrowserUrl(currentTransition.targetBrowserUrl ?? this.rawUrlTree, currentTransition);
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
        const path = url instanceof UrlTree ? this.urlSerializer.serialize(url) : url;
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.0-rc.0+sha-cea3e4b", ngImport: i0, type: HistoryStateManager, deps: null, target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.2.0-rc.0+sha-cea3e4b", ngImport: i0, type: HistoryStateManager, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.0-rc.0+sha-cea3e4b", ngImport: i0, type: HistoryStateManager, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGVfbWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvc3RhdGVtYW5hZ2VyL3N0YXRlX21hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxNQUFNLEVBQUUsVUFBVSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBR2pELE9BQU8sRUFDTCxvQkFBb0IsRUFFcEIsZ0JBQWdCLEVBQ2hCLDBCQUEwQixFQUMxQixhQUFhLEVBQ2IsZUFBZSxFQUNmLGlCQUFpQixFQUNqQixlQUFlLEVBRWYsZ0JBQWdCLEdBQ2pCLE1BQU0sV0FBVyxDQUFDO0FBRW5CLE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ3RELE9BQU8sRUFBQyxnQkFBZ0IsRUFBYyxNQUFNLGlCQUFpQixDQUFDO0FBQzlELE9BQU8sRUFBQyxtQkFBbUIsRUFBQyxNQUFNLDBCQUEwQixDQUFDO0FBQzdELE9BQU8sRUFBQyxhQUFhLEVBQUUsT0FBTyxFQUFDLE1BQU0sYUFBYSxDQUFDOztBQUduRCxNQUFNLE9BQWdCLFlBQVk7eUhBQVosWUFBWTs2SEFBWixZQUFZLGNBRFQsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQzs7c0dBQ3hELFlBQVk7a0JBRGpDLFVBQVU7bUJBQUMsRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsRUFBQzs7QUErRC9FLE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxZQUFZO0lBRHJEOztRQUVtQixhQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzVCLGtCQUFhLEdBQUcsTUFBTSxDQUFDLGFB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UUFDaEcsK0ZBQStGO1FBQy9GLHlGQUF5RjtRQUN6RixnR0FBZ0c7UUFDaEcsNEVBQTRFO1FBQzVFLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FDOUMsSUFBSSxDQUFDLGNBQWMsRUFDbkIsVUFBVSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUN2QyxDQUFDO0lBQ0osQ0FBQztJQUVPLHdCQUF3QjtRQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FDeEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUM3QyxFQUFFLEVBQ0YsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQ3RFLENBQUM7SUFDSixDQUFDO0lBRU8scUJBQXFCLENBQUMsWUFBb0IsRUFBRSxZQUFvQjtRQUN0RSxJQUFJLElBQUksQ0FBQyw0QkFBNEIsS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNyRCxPQUFPLEVBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUMsQ0FBQztRQUNyRCxDQUFDO1FBQ0QsT0FBTyxFQUFDLFlBQVksRUFBQyxDQUFDO0lBQ3hCLENBQUM7eUhBbk1VLG1CQUFtQjs2SEFBbkIsbUJBQW1CLGNBRFAsTUFBTTs7c0dBQ2xCLG1CQUFtQjtrQkFEL0IsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7aW5qZWN0LCBJbmplY3RhYmxlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7U3Vic2NyaXB0aW9uTGlrZX0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7XG4gIEJlZm9yZUFjdGl2YXRlUm91dGVzLFxuICBFdmVudCxcbiAgTmF2aWdhdGlvbkNhbmNlbCxcbiAgTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUsXG4gIE5hdmlnYXRpb25FbmQsXG4gIE5hdmlnYXRpb25FcnJvcixcbiAgTmF2aWdhdGlvblNraXBwZWQsXG4gIE5hdmlnYXRpb25TdGFydCxcbiAgUHJpdmF0ZVJvdXRlckV2ZW50cyxcbiAgUm91dGVzUmVjb2duaXplZCxcbn0gZnJvbSAnLi4vZXZlbnRzJztcbmltcG9ydCB7TmF2aWdhdGlvbiwgUmVzdG9yZWRTdGF0ZX0gZnJvbSAnLi4vbmF2aWdhdGlvbl90cmFuc2l0aW9uJztcbmltcG9ydCB7Uk9VVEVSX0NPTkZJR1VSQVRJT059IGZyb20gJy4uL3JvdXRlcl9jb25maWcnO1xuaW1wb3J0IHtjcmVhdGVFbXB0eVN0YXRlLCBSb3V0ZXJTdGF0ZX0gZnJvbSAnLi4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7VXJsSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi4vdXJsX2hhbmRsaW5nX3N0cmF0ZWd5JztcbmltcG9ydCB7VXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi4vdXJsX3RyZWUnO1xuXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnLCB1c2VGYWN0b3J5OiAoKSA9PiBpbmplY3QoSGlzdG9yeVN0YXRlTWFuYWdlcil9KVxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFN0YXRlTWFuYWdlciB7XG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50bHkgYWN0aXZhdGVkIGBVcmxUcmVlYC5cbiAgICpcbiAgICogVGhpcyBgVXJsVHJlZWAgc2hvd3Mgb25seSBVUkxzIHRoYXQgdGhlIGBSb3V0ZXJgIGlzIGNvbmZpZ3VyZWQgdG8gaGFuZGxlICh0aHJvdWdoXG4gICAqIGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCkuXG4gICAqXG4gICAqIFRoZSB2YWx1ZSBpcyBzZXQgYWZ0ZXIgZmluZGluZyB0aGUgcm91dGUgY29uZmlnIHRyZWUgdG8gYWN0aXZhdGUgYnV0IGJlZm9yZSBhY3RpdmF0aW5nIHRoZVxuICAgKiByb3V0ZS5cbiAgICovXG4gIGFic3RyYWN0IGdldEN1cnJlbnRVcmxUcmVlKCk6IFVybFRyZWU7XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBgVXJsVHJlZWAgdGhhdCBpcyByZXByZXNlbnRzIHdoYXQgdGhlIGJyb3dzZXIgaXMgYWN0dWFsbHkgc2hvd2luZy5cbiAgICpcbiAgICogSW4gdGhlIGxpZmUgb2YgYSBuYXZpZ2F0aW9uIHRyYW5zaXRpb246XG4gICAqIDEuIFdoZW4gYSBuYXZpZ2F0aW9uIGJlZ2lucywgdGhlIHJhdyBgVXJsVHJlZWAgaXMgdXBkYXRlZCB0byB0aGUgZnVsbCBVUkwgdGhhdCdzIGJlaW5nXG4gICAqIG5hdmlnYXRlZCB0by5cbiAgICogMi4gRHVyaW5nIGEgbmF2aWdhdGlvbiwgcmVkaXJlY3RzIGFyZSBhcHBsaWVkLCB3aGljaCBtaWdodCBvbmx5IGFwcGx5IHRvIF9wYXJ0XyBvZiB0aGUgVVJMIChkdWVcbiAgICogdG8gYFVybEhhbmRsaW5nU3RyYXRlZ3lgKS5cbiAgICogMy4gSnVzdCBiZWZvcmUgYWN0aXZhdGlvbiwgdGhlIHJhdyBgVXJsVHJlZWAgaXMgdXBkYXRlZCB0byBpbmNsdWRlIHRoZSByZWRpcmVjdHMgb24gdG9wIG9mIHRoZVxuICAgKiBvcmlnaW5hbCByYXcgVVJMLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdGhpcyBpcyBfb25seV8gaGVyZSB0byBzdXBwb3J0IGBVcmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3RgIGFuZFxuICAgKiBgVXJsSGFuZGxpbmdTdHJhdGVneS5zaG91bGRQcm9jZXNzVXJsYC4gV2l0aG91dCB0aG9zZSBBUElzLCB0aGUgY3VycmVudCBgVXJsVHJlZWAgd291bGQgbm90XG4gICAqIGRldmlhdGVkIGZyb20gdGhlIHJhdyBgVXJsVHJlZWAuXG4gICAqXG4gICAqIEZvciBgZXh0cmFjdGAsIGEgcmF3IGBVcmxUcmVlYCBpcyBuZWVkZWQgYmVjYXVzZSBgZXh0cmFjdGAgbWF5IG9ubHkgcmV0dXJuIHBhcnRcbiAgICogb2YgdGhlIG5hdmlnYXRpb24gVVJMLiBUaHVzLCB0aGUgY3VycmVudCBgVXJsVHJlZWAgbWF5IG9ubHkgcmVwcmVzZW50IF9wYXJ0XyBvZiB0aGUgYnJvd3NlclxuICAgKiBVUkwuIFdoZW4gYSBuYXZpZ2F0aW9uIGdldHMgY2FuY2VsbGVkIGFuZCB0aGUgcm91dGVyIG5lZWRzIHRvIHJlc2V0IHRoZSBVUkwgb3IgYSBuZXcgbmF2aWdhdGlvblxuICAgKiBvY2N1cnMsIGl0IG5lZWRzIHRvIGtub3cgdGhlIF93aG9sZV8gYnJvd3NlciBVUkwsIG5vdCBqdXN0IHRoZSBwYXJ0IGhhbmRsZWQgYnlcbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3lgLlxuICAgKiBGb3IgYHNob3VsZFByb2Nlc3NVcmxgLCB3aGVuIHRoZSByZXR1cm4gaXMgYGZhbHNlYCwgdGhlIHJvdXRlciBpZ25vcmVzIHRoZSBuYXZpZ2F0aW9uIGJ1dFxuICAgKiBzdGlsbCB1cGRhdGVzIHRoZSByYXcgYFVybFRyZWVgIHdpdGggdGhlIGFzc3VtcHRpb24gdGhhdCB0aGUgbmF2aWdhdGlvbiB3YXMgY2F1c2VkIGJ5IHRoZVxuICAgKiBsb2NhdGlvbiBjaGFuZ2UgbGlzdGVuZXIgZHVlIHRvIGEgVVJMIHVwZGF0ZSBieSB0aGUgQW5ndWxhckpTIHJvdXRlci4gSW4gdGhpcyBjYXNlLCB0aGUgcm91dGVyXG4gICAqIHN0aWxsIG5lZWQgdG8ga25vdyB3aGF0IHRoZSBicm93c2VyJ3MgVVJMIGlzIGZvciBmdXR1cmUgbmF2aWdhdGlvbnMuXG4gICAqL1xuICBhYnN0cmFjdCBnZXRSYXdVcmxUcmVlKCk6IFVybFRyZWU7XG5cbiAgLyoqIFJldHVybnMgdGhlIGN1cnJlbnQgc3RhdGUgc3RvcmVkIGJ5IHRoZSBicm93c2VyIGZvciB0aGUgY3VycmVudCBoaXN0b3J5IGVudHJ5LiAqL1xuICBhYnN0cmFjdCByZXN0b3JlZFN0YXRlKCk6IFJlc3RvcmVkU3RhdGUgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG4gIC8qKiBSZXR1cm5zIHRoZSBjdXJyZW50IFJvdXRlclN0YXRlLiAqL1xuICBhYnN0cmFjdCBnZXRSb3V0ZXJTdGF0ZSgpOiBSb3V0ZXJTdGF0ZTtcblxuICAvKipcbiAgICogUmVnaXN0ZXJzIGEgbGlzdGVuZXIgdGhhdCBpcyBjYWxsZWQgd2hlbmV2ZXIgdGhlIGN1cnJlbnQgaGlzdG9yeSBlbnRyeSBjaGFuZ2VzIGJ5IHNvbWUgQVBJXG4gICAqIG91dHNpZGUgdGhlIFJvdXRlci4gVGhpcyBpbmNsdWRlcyB1c2VyLWFjdGl2YXRlZCBjaGFuZ2VzIGxpa2UgYmFjayBidXR0b25zIGFuZCBsaW5rIGNsaWNrcywgYnV0XG4gICAqIGFsc28gaW5jbHVkZXMgcHJvZ3JhbW1hdGljIEFQSXMgY2FsbGVkIGJ5IG5vbi1Sb3V0ZXIgSmF2YVNjcmlwdC5cbiAgICovXG4gIGFic3RyYWN0IHJlZ2lzdGVyTm9uUm91dGVyQ3VycmVudEVudHJ5Q2hhbmdlTGlzdGVuZXIoXG4gICAgbGlzdGVuZXI6ICh1cmw6IHN0cmluZywgc3RhdGU6IFJlc3RvcmVkU3RhdGUgfCBudWxsIHwgdW5kZWZpbmVkKSA9PiB2b2lkLFxuICApOiBTdWJzY3JpcHRpb25MaWtlO1xuXG4gIC8qKlxuICAgKiBIYW5kbGVzIGEgbmF2aWdhdGlvbiBldmVudCBzZW50IGZyb20gdGhlIFJvdXRlci4gVGhlc2UgYXJlIHR5cGljYWxseSBldmVudHMgdGhhdCBpbmRpY2F0ZSBhXG4gICAqIG5hdmlnYXRpb24gaGFzIHN0YXJ0ZWQsIHByb2dyZXNzZWQsIGJlZW4gY2FuY2VsbGVkLCBvciBmaW5pc2hlZC5cbiAgICovXG4gIGFic3RyYWN0IGhhbmRsZVJvdXRlckV2ZW50KGU6IEV2ZW50IHwgUHJpdmF0ZVJvdXRlckV2ZW50cywgY3VycmVudFRyYW5zaXRpb246IE5hdmlnYXRpb24pOiB2b2lkO1xufVxuXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnfSlcbmV4cG9ydCBjbGFzcyBIaXN0b3J5U3RhdGVNYW5hZ2VyIGV4dGVuZHMgU3RhdGVNYW5hZ2VyIHtcbiAgcHJpdmF0ZSByZWFkb25seSBsb2NhdGlvbiA9IGluamVjdChMb2NhdGlvbik7XG4gIHByaXZhdGUgcmVhZG9ubHkgdXJsU2VyaWFsaXplciA9IGluamVjdChVcmxTZXJpYWxpemVyKTtcbiAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zID0gaW5qZWN0KFJPVVRFUl9DT05GSUdVUkFUSU9OLCB7b3B0aW9uYWw6IHRydWV9KSB8fCB7fTtcbiAgcHJpdmF0ZSByZWFkb25seSBjYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID1cbiAgICB0aGlzLm9wdGlvbnMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiB8fCAncmVwbGFjZSc7XG5cbiAgcHJpdmF0ZSB1cmxIYW5kbGluZ1N0cmF0ZWd5ID0gaW5qZWN0KFVybEhhbmRsaW5nU3RyYXRlZ3kpO1xuICBwcml2YXRlIHVybFVwZGF0ZVN0cmF0ZWd5ID0gdGhpcy5vcHRpb25zLnVybFVwZGF0ZVN0cmF0ZWd5IHx8ICdkZWZlcnJlZCc7XG5cbiAgcHJpdmF0ZSBjdXJyZW50VXJsVHJlZSA9IG5ldyBVcmxUcmVlKCk7XG5cbiAgb3ZlcnJpZGUgZ2V0Q3VycmVudFVybFRyZWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY3VycmVudFVybFRyZWU7XG4gIH1cblxuICBwcml2YXRlIHJhd1VybFRyZWUgPSB0aGlzLmN1cnJlbnRVcmxUcmVlO1xuXG4gIG92ZXJyaWRlIGdldFJhd1VybFRyZWUoKSB7XG4gICAgcmV0dXJuIHRoaXMucmF3VXJsVHJlZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgaWQgb2YgdGhlIGN1cnJlbnRseSBhY3RpdmUgcGFnZSBpbiB0aGUgcm91dGVyLlxuICAgKiBVcGRhdGVkIHRvIHRoZSB0cmFuc2l0aW9uJ3MgdGFyZ2V0IGlkIG9uIGEgc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBUaGlzIGlzIHVzZWQgdG8gdHJhY2sgd2hhdCBwYWdlIHRoZSByb3V0ZXIgbGFzdCBhY3RpdmF0ZWQuIFdoZW4gYW4gYXR0ZW1wdGVkIG5hdmlnYXRpb24gZmFpbHMsXG4gICAqIHRoZSByb3V0ZXIgY2FuIHRoZW4gdXNlIHRoaXMgdG8gY29tcHV0ZSBob3cgdG8gcmVzdG9yZSB0aGUgc3RhdGUgYmFjayB0byB0aGUgcHJldmlvdXNseSBhY3RpdmVcbiAgICogcGFnZS5cbiAgICovXG4gIHByaXZhdGUgY3VycmVudFBhZ2VJZDogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBsYXN0U3VjY2Vzc2Z1bElkOiBudW1iZXIgPSAtMTtcblxuICBvdmVycmlkZSByZXN0b3JlZFN0YXRlKCk6IFJlc3RvcmVkU3RhdGUgfCBudWxsIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5sb2NhdGlvbi5nZXRTdGF0ZSgpIGFzIFJlc3RvcmVkU3RhdGUgfCBudWxsIHwgdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSDJtXJvdXRlclBhZ2VJZCBvZiB3aGF0ZXZlciBwYWdlIGlzIGN1cnJlbnRseSBhY3RpdmUgaW4gdGhlIGJyb3dzZXIgaGlzdG9yeS4gVGhpcyBpc1xuICAgKiBpbXBvcnRhbnQgZm9yIGNvbXB1dGluZyB0aGUgdGFyZ2V0IHBhZ2UgaWQgZm9yIG5ldyBuYXZpZ2F0aW9ucyBiZWNhdXNlIHdlIG5lZWQgdG8gZW5zdXJlIGVhY2hcbiAgICogcGFnZSBpZCBpbiB0aGUgYnJvd3NlciBoaXN0b3J5IGlzIDEgbW9yZSB0aGFuIHRoZSBwcmV2aW91cyBlbnRyeS5cbiAgICovXG4gIHByaXZhdGUgZ2V0IGJyb3dzZXJQYWdlSWQoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uICE9PSAnY29tcHV0ZWQnKSB7XG4gICAgICByZXR1cm4gdGhpcy5jdXJyZW50UGFnZUlkO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXN0b3JlZFN0YXRlKCk/Lsm1cm91dGVyUGFnZUlkID8/IHRoaXMuY3VycmVudFBhZ2VJZDtcbiAgfVxuXG4gIHByaXZhdGUgcm91dGVyU3RhdGUgPSBjcmVhdGVFbXB0eVN0YXRlKG51bGwpO1xuXG4gIG92ZXJyaWRlIGdldFJvdXRlclN0YXRlKCkge1xuICAgIHJldHVybiB0aGlzLnJvdXRlclN0YXRlO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0ZU1lbWVudG8gPSB0aGlzLmNyZWF0ZVN0YXRlTWVtZW50bygpO1xuXG4gIHByaXZhdGUgY3JlYXRlU3RhdGVNZW1lbnRvKCkge1xuICAgIHJldHVybiB7XG4gICAgICByYXdVcmxUcmVlOiB0aGlzLnJhd1VybFRyZWUsXG4gICAgICBjdXJyZW50VXJsVHJlZTogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIHJvdXRlclN0YXRlOiB0aGlzLnJvdXRlclN0YXRlLFxuICAgIH07XG4gIH1cblxuICBvdmVycmlkZSByZWdpc3Rlck5vblJvdXRlckN1cnJlbnRFbnRyeUNoYW5nZUxpc3RlbmVyKFxuICAgIGxpc3RlbmVyOiAodXJsOiBzdHJpbmcsIHN0YXRlOiBSZXN0b3JlZFN0YXRlIHwgbnVsbCB8IHVuZGVmaW5lZCkgPT4gdm9pZCxcbiAgKTogU3Vic2NyaXB0aW9uTGlrZSB7XG4gICAgcmV0dXJuIHRoaXMubG9jYXRpb24uc3Vic2NyaWJlKChldmVudCkgPT4ge1xuICAgICAgaWYgKGV2ZW50Wyd0eXBlJ10gPT09ICdwb3BzdGF0ZScpIHtcbiAgICAgICAgbGlzdGVuZXIoZXZlbnRbJ3VybCddISwgZXZlbnQuc3RhdGUgYXMgUmVzdG9yZWRTdGF0ZSB8IG51bGwgfCB1bmRlZmluZWQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgaGFuZGxlUm91dGVyRXZlbnQoZTogRXZlbnQgfCBQcml2YXRlUm91dGVyRXZlbnRzLCBjdXJyZW50VHJhbnNpdGlvbjogTmF2aWdhdGlvbikge1xuICAgIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvblN0YXJ0KSB7XG4gICAgICB0aGlzLnN0YXRlTWVtZW50byA9IHRoaXMuY3JlYXRlU3RhdGVNZW1lbnRvKCk7XG4gICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvblNraXBwZWQpIHtcbiAgICAgIHRoaXMucmF3VXJsVHJlZSA9IGN1cnJlbnRUcmFuc2l0aW9uLmluaXRpYWxVcmw7XG4gICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgUm91dGVzUmVjb2duaXplZCkge1xuICAgICAgaWYgKHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdlYWdlcicpIHtcbiAgICAgICAgaWYgKCFjdXJyZW50VHJhbnNpdGlvbi5leHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgICAgY29uc3QgcmF3VXJsID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKFxuICAgICAgICAgICAgY3VycmVudFRyYW5zaXRpb24uZmluYWxVcmwhLFxuICAgICAgICAgICAgY3VycmVudFRyYW5zaXRpb24uaW5pdGlhbFVybCxcbiAgICAgICAgICApO1xuICAgICAgICAgIHRoaXMuc2V0QnJvd3NlclVybChjdXJyZW50VHJhbnNpdGlvbi50YXJnZXRCcm93c2VyVXJsID8/IHJhd1VybCwgY3VycmVudFRyYW5zaXRpb24pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgQmVmb3JlQWN0aXZhdGVSb3V0ZXMpIHtcbiAgICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSBjdXJyZW50VHJhbnNpdGlvbi5maW5hbFVybCE7XG4gICAgICB0aGlzLnJhd1VybFRyZWUgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UoXG4gICAgICAgIGN1cnJlbnRUcmFuc2l0aW9uLmZpbmFsVXJsISxcbiAgICAgICAgY3VycmVudFRyYW5zaXRpb24uaW5pdGlhbFVybCxcbiAgICAgICk7XG4gICAgICB0aGlzLnJvdXRlclN0YXRlID0gY3VycmVudFRyYW5zaXRpb24udGFyZ2V0Um91dGVyU3RhdGUhO1xuICAgICAgaWYgKHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdkZWZlcnJlZCcgJiYgIWN1cnJlbnRUcmFuc2l0aW9uLmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKFxuICAgICAgICAgIGN1cnJlbnRUcmFuc2l0aW9uLnRhcmdldEJyb3dzZXJVcmwgPz8gdGhpcy5yYXdVcmxUcmVlLFxuICAgICAgICAgIGN1cnJlbnRUcmFuc2l0aW9uLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoXG4gICAgICBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkNhbmNlbCAmJlxuICAgICAgKGUuY29kZSA9PT0gTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuR3VhcmRSZWplY3RlZCB8fFxuICAgICAgICBlLmNvZGUgPT09IE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLk5vRGF0YUZyb21SZXNvbHZlcilcbiAgICApIHtcbiAgICAgIHRoaXMucmVzdG9yZUhpc3RvcnkoY3VycmVudFRyYW5zaXRpb24pO1xuICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FcnJvcikge1xuICAgICAgdGhpcy5yZXN0b3JlSGlzdG9yeShjdXJyZW50VHJhbnNpdGlvbiwgdHJ1ZSk7XG4gICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCkge1xuICAgICAgdGhpcy5sYXN0U3VjY2Vzc2Z1bElkID0gZS5pZDtcbiAgICAgIHRoaXMuY3VycmVudFBhZ2VJZCA9IHRoaXMuYnJvd3NlclBhZ2VJZDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHNldEJyb3dzZXJVcmwodXJsOiBVcmxUcmVlIHwgc3RyaW5nLCB0cmFuc2l0aW9uOiBOYXZpZ2F0aW9uKSB7XG4gICAgY29uc3QgcGF0aCA9IHVybCBpbnN0YW5jZW9mIFVybFRyZWUgPyB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHVybCkgOiB1cmw7XG4gICAgaWYgKHRoaXMubG9jYXRpb24uaXNDdXJyZW50UGF0aEVxdWFsVG8ocGF0aCkgfHwgISF0cmFuc2l0aW9uLmV4dHJhcy5yZXBsYWNlVXJsKSB7XG4gICAgICAvLyByZXBsYWNlbWVudHMgZG8gbm90IHVwZGF0ZSB0aGUgdGFyZ2V0IHBhZ2VcbiAgICAgIGNvbnN0IGN1cnJlbnRCcm93c2VyUGFnZUlkID0gdGhpcy5icm93c2VyUGFnZUlkO1xuICAgICAgY29uc3Qgc3RhdGUgPSB7XG4gICAgICAgIC4uLnRyYW5zaXRpb24uZXh0cmFzLnN0YXRlLFxuICAgICAgICAuLi50aGlzLmdlbmVyYXRlTmdSb3V0ZXJTdGF0ZSh0cmFuc2l0aW9uLmlkLCBjdXJyZW50QnJvd3NlclBhZ2VJZCksXG4gICAgICB9O1xuICAgICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUocGF0aCwgJycsIHN0YXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc3RhdGUgPSB7XG4gICAgICAgIC4uLnRyYW5zaXRpb24uZXh0cmFzLnN0YXRlLFxuICAgICAgICAuLi50aGlzLmdlbmVyYXRlTmdSb3V0ZXJTdGF0ZSh0cmFuc2l0aW9uLmlkLCB0aGlzLmJyb3dzZXJQYWdlSWQgKyAxKSxcbiAgICAgIH07XG4gICAgICB0aGlzLmxvY2F0aW9uLmdvKHBhdGgsICcnLCBzdGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBlcmZvcm1zIHRoZSBuZWNlc3Nhcnkgcm9sbGJhY2sgYWN0aW9uIHRvIHJlc3RvcmUgdGhlIGJyb3dzZXIgVVJMIHRvIHRoZVxuICAgKiBzdGF0ZSBiZWZvcmUgdGhlIHRyYW5zaXRpb24uXG4gICAqL1xuICBwcml2YXRlIHJlc3RvcmVIaXN0b3J5KG5hdmlnYXRpb246IE5hdmlnYXRpb24sIHJlc3RvcmluZ0Zyb21DYXVnaHRFcnJvciA9IGZhbHNlKSB7XG4gICAgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ2NvbXB1dGVkJykge1xuICAgICAgY29uc3QgY3VycmVudEJyb3dzZXJQYWdlSWQgPSB0aGlzLmJyb3dzZXJQYWdlSWQ7XG4gICAgICBjb25zdCB0YXJnZXRQYWdlUG9zaXRpb24gPSB0aGlzLmN1cnJlbnRQYWdlSWQgLSBjdXJyZW50QnJvd3NlclBhZ2VJZDtcbiAgICAgIGlmICh0YXJnZXRQYWdlUG9zaXRpb24gIT09IDApIHtcbiAgICAgICAgdGhpcy5sb2NhdGlvbi5oaXN0b3J5R28odGFyZ2V0UGFnZVBvc2l0aW9uKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5jdXJyZW50VXJsVHJlZSA9PT0gbmF2aWdhdGlvbi5maW5hbFVybCAmJiB0YXJnZXRQYWdlUG9zaXRpb24gPT09IDApIHtcbiAgICAgICAgLy8gV2UgZ290IHRvIHRoZSBhY3RpdmF0aW9uIHN0YWdlICh3aGVyZSBjdXJyZW50VXJsVHJlZSBpcyBzZXQgdG8gdGhlIG5hdmlnYXRpb24nc1xuICAgICAgICAvLyBmaW5hbFVybCksIGJ1dCB3ZSB3ZXJlbid0IG1vdmluZyBhbnl3aGVyZSBpbiBoaXN0b3J5IChza2lwTG9jYXRpb25DaGFuZ2Ugb3IgcmVwbGFjZVVybCkuXG4gICAgICAgIC8vIFdlIHN0aWxsIG5lZWQgdG8gcmVzZXQgdGhlIHJvdXRlciBzdGF0ZSBiYWNrIHRvIHdoYXQgaXQgd2FzIHdoZW4gdGhlIG5hdmlnYXRpb24gc3RhcnRlZC5cbiAgICAgICAgdGhpcy5yZXNldFN0YXRlKG5hdmlnYXRpb24pO1xuICAgICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhlIGJyb3dzZXIgVVJMIGFuZCByb3V0ZXIgc3RhdGUgd2FzIG5vdCB1cGRhdGVkIGJlZm9yZSB0aGUgbmF2aWdhdGlvbiBjYW5jZWxsZWQgc29cbiAgICAgICAgLy8gdGhlcmUncyBubyByZXN0b3JhdGlvbiBuZWVkZWQuXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdyZXBsYWNlJykge1xuICAgICAgLy8gVE9ETyhhdHNjb3R0KTogSXQgc2VlbXMgbGlrZSB3ZSBzaG91bGQgX2Fsd2F5c18gcmVzZXQgdGhlIHN0YXRlIGhlcmUuIEl0IHdvdWxkIGJlIGEgbm8tb3BcbiAgICAgIC8vIGZvciBgZGVmZXJyZWRgIG5hdmlnYXRpb25zIHRoYXQgaGF2ZW4ndCBjaGFuZ2UgdGhlIGludGVybmFsIHN0YXRlIHlldCBiZWNhdXNlIGd1YXJkc1xuICAgICAgLy8gcmVqZWN0LiBGb3IgJ2VhZ2VyJyBuYXZpZ2F0aW9ucywgaXQgc2VlbXMgbGlrZSB3ZSBhbHNvIHJlYWxseSBzaG91bGQgcmVzZXQgdGhlIHN0YXRlXG4gICAgICAvLyBiZWNhdXNlIHRoZSBuYXZpZ2F0aW9uIHdhcyBjYW5jZWxsZWQuIEludmVzdGlnYXRlIGlmIHRoaXMgY2FuIGJlIGRvbmUgYnkgcnVubmluZyBUR1AuXG4gICAgICBpZiAocmVzdG9yaW5nRnJvbUNhdWdodEVycm9yKSB7XG4gICAgICAgIHRoaXMucmVzZXRTdGF0ZShuYXZpZ2F0aW9uKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZXNldFN0YXRlKG5hdmlnYXRpb246IE5hdmlnYXRpb24pOiB2b2lkIHtcbiAgICB0aGlzLnJvdXRlclN0YXRlID0gdGhpcy5zdGF0ZU1lbWVudG8ucm91dGVyU3RhdGU7XG4gICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IHRoaXMuc3RhdGVNZW1lbnRvLmN1cnJlbnRVcmxUcmVlO1xuICAgIC8vIE5vdGUgaGVyZSB0aGF0IHdlIHVzZSB0aGUgdXJsSGFuZGxpbmdTdHJhdGVneSB0byBnZXQgdGhlIHJlc2V0IGByYXdVcmxUcmVlYCBiZWNhdXNlIGl0IG1heSBiZVxuICAgIC8vIGNvbmZpZ3VyZWQgdG8gaGFuZGxlIG9ubHkgcGFydCBvZiB0aGUgbmF2aWdhdGlvbiBVUkwuIFRoaXMgbWVhbnMgd2Ugd291bGQgb25seSB3YW50IHRvIHJlc2V0XG4gICAgLy8gdGhlIHBhcnQgb2YgdGhlIG5hdmlnYXRpb24gaGFuZGxlZCBieSB0aGUgQW5ndWxhciByb3V0ZXIgcmF0aGVyIHRoYW4gdGhlIHdob2xlIFVSTC4gSW5cbiAgICAvLyBhZGRpdGlvbiwgdGhlIFVSTEhhbmRsaW5nU3RyYXRlZ3kgbWF5IGJlIGNvbmZpZ3VyZWQgdG8gc3BlY2lmaWNhbGx5IHByZXNlcnZlIHBhcnRzIG9mIHRoZSBVUkxcbiAgICAvLyB3aGVuIG1lcmdpbmcsIHN1Y2ggYXMgdGhlIHF1ZXJ5IHBhcmFtcyBzbyB0aGV5IGFyZSBub3QgbG9zdCBvbiBhIHJlZnJlc2guXG4gICAgdGhpcy5yYXdVcmxUcmVlID0gdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKFxuICAgICAgdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIG5hdmlnYXRpb24uZmluYWxVcmwgPz8gdGhpcy5yYXdVcmxUcmVlLFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIHJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpOiB2b2lkIHtcbiAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShcbiAgICAgIHRoaXMudXJsU2VyaWFsaXplci5zZXJpYWxpemUodGhpcy5yYXdVcmxUcmVlKSxcbiAgICAgICcnLFxuICAgICAgdGhpcy5nZW5lcmF0ZU5nUm91dGVyU3RhdGUodGhpcy5sYXN0U3VjY2Vzc2Z1bElkLCB0aGlzLmN1cnJlbnRQYWdlSWQpLFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIGdlbmVyYXRlTmdSb3V0ZXJTdGF0ZShuYXZpZ2F0aW9uSWQ6IG51bWJlciwgcm91dGVyUGFnZUlkOiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAnY29tcHV0ZWQnKSB7XG4gICAgICByZXR1cm4ge25hdmlnYXRpb25JZCwgybVyb3V0ZXJQYWdlSWQ6IHJvdXRlclBhZ2VJZH07XG4gICAgfVxuICAgIHJldHVybiB7bmF2aWdhdGlvbklkfTtcbiAgfVxufVxuIl19