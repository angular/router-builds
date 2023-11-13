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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-9e2c3bb", ngImport: i0, type: StateManager, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-9e2c3bb", ngImport: i0, type: StateManager, providedIn: 'root', useFactory: () => inject(HistoryStateManager) }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-9e2c3bb", ngImport: i0, type: StateManager, decorators: [{
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-9e2c3bb", ngImport: i0, type: HistoryStateManager, deps: null, target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-9e2c3bb", ngImport: i0, type: HistoryStateManager, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.1.0-next.0+sha-9e2c3bb", ngImport: i0, type: HistoryStateManager, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGVfbWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvc3RhdGVtYW5hZ2VyL3N0YXRlX21hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxNQUFNLEVBQUUsVUFBVSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBR2pELE9BQU8sRUFBQyxvQkFBb0IsRUFBUyxnQkFBZ0IsRUFBRSwwQkFBMEIsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBdUIsZ0JBQWdCLEdBQUUsTUFBTSxXQUFXLENBQUM7QUFFaE4sT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDdEQsT0FBTyxFQUFDLGdCQUFnQixFQUFjLE1BQU0saUJBQWlCLENBQUM7QUFDOUQsT0FBTyxFQUFDLG1CQUFtQixFQUFDLE1BQU0sMEJBQTBCLENBQUM7QUFDN0QsT0FBTyxFQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUMsTUFBTSxhQUFhLENBQUM7O0FBR25ELE1BQU0sT0FBZ0IsWUFBWTt5SEFBWixZQUFZOzZIQUFaLFlBQVksY0FEVCxNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDOztzR0FDeEQsWUFBWTtrQkFEakMsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxFQUFDOztBQThEL0UsTUFBTSxPQUFPLG1CQUFvQixTQUFRLFlBQVk7SUFEckQ7O1FBRW1CLGFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUIsa0JBQWEsR0FBRyxNQUFNLENBQUMsYUFBYSxD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QUFDLFVBQVU7WUFDWCxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDbEcsQ0FBQztJQUVPLHdCQUF3QjtRQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FDdEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsRUFDakQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBRU8scUJBQXFCLENBQUMsWUFBb0IsRUFBRSxZQUFvQjtRQUN0RSxJQUFJLElBQUksQ0FBQyw0QkFBNEIsS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNyRCxPQUFPLEVBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUMsQ0FBQztRQUNyRCxDQUFDO1FBQ0QsT0FBTyxFQUFDLFlBQVksRUFBQyxDQUFDO0lBQ3hCLENBQUM7eUhBeExVLG1CQUFtQjs2SEFBbkIsbUJBQW1CLGNBRFAsTUFBTTs7c0dBQ2xCLG1CQUFtQjtrQkFEL0IsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7aW5qZWN0LCBJbmplY3RhYmxlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7U3Vic2NyaXB0aW9uTGlrZX0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7QmVmb3JlQWN0aXZhdGVSb3V0ZXMsIEV2ZW50LCBOYXZpZ2F0aW9uQ2FuY2VsLCBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZSwgTmF2aWdhdGlvbkVuZCwgTmF2aWdhdGlvbkVycm9yLCBOYXZpZ2F0aW9uU2tpcHBlZCwgTmF2aWdhdGlvblN0YXJ0LCBQcml2YXRlUm91dGVyRXZlbnRzLCBSb3V0ZXNSZWNvZ25pemVkLH0gZnJvbSAnLi4vZXZlbnRzJztcbmltcG9ydCB7TmF2aWdhdGlvbiwgUmVzdG9yZWRTdGF0ZX0gZnJvbSAnLi4vbmF2aWdhdGlvbl90cmFuc2l0aW9uJztcbmltcG9ydCB7Uk9VVEVSX0NPTkZJR1VSQVRJT059IGZyb20gJy4uL3JvdXRlcl9jb25maWcnO1xuaW1wb3J0IHtjcmVhdGVFbXB0eVN0YXRlLCBSb3V0ZXJTdGF0ZX0gZnJvbSAnLi4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7VXJsSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi4vdXJsX2hhbmRsaW5nX3N0cmF0ZWd5JztcbmltcG9ydCB7VXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi4vdXJsX3RyZWUnO1xuXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnLCB1c2VGYWN0b3J5OiAoKSA9PiBpbmplY3QoSGlzdG9yeVN0YXRlTWFuYWdlcil9KVxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFN0YXRlTWFuYWdlciB7XG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50bHkgYWN0aXZhdGVkIGBVcmxUcmVlYC5cbiAgICpcbiAgICogVGhpcyBgVXJsVHJlZWAgc2hvd3Mgb25seSBVUkxzIHRoYXQgdGhlIGBSb3V0ZXJgIGlzIGNvbmZpZ3VyZWQgdG8gaGFuZGxlICh0aHJvdWdoXG4gICAqIGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCkuXG4gICAqXG4gICAqIFRoZSB2YWx1ZSBpcyBzZXQgYWZ0ZXIgZmluZGluZyB0aGUgcm91dGUgY29uZmlnIHRyZWUgdG8gYWN0aXZhdGUgYnV0IGJlZm9yZSBhY3RpdmF0aW5nIHRoZVxuICAgKiByb3V0ZS5cbiAgICovXG4gIGFic3RyYWN0IGdldEN1cnJlbnRVcmxUcmVlKCk6IFVybFRyZWU7XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBgVXJsVHJlZWAgdGhhdCBpcyByZXByZXNlbnRzIHdoYXQgdGhlIGJyb3dzZXIgaXMgYWN0dWFsbHkgc2hvd2luZy5cbiAgICpcbiAgICogSW4gdGhlIGxpZmUgb2YgYSBuYXZpZ2F0aW9uIHRyYW5zaXRpb246XG4gICAqIDEuIFdoZW4gYSBuYXZpZ2F0aW9uIGJlZ2lucywgdGhlIHJhdyBgVXJsVHJlZWAgaXMgdXBkYXRlZCB0byB0aGUgZnVsbCBVUkwgdGhhdCdzIGJlaW5nXG4gICAqIG5hdmlnYXRlZCB0by5cbiAgICogMi4gRHVyaW5nIGEgbmF2aWdhdGlvbiwgcmVkaXJlY3RzIGFyZSBhcHBsaWVkLCB3aGljaCBtaWdodCBvbmx5IGFwcGx5IHRvIF9wYXJ0XyBvZiB0aGUgVVJMIChkdWVcbiAgICogdG8gYFVybEhhbmRsaW5nU3RyYXRlZ3lgKS5cbiAgICogMy4gSnVzdCBiZWZvcmUgYWN0aXZhdGlvbiwgdGhlIHJhdyBgVXJsVHJlZWAgaXMgdXBkYXRlZCB0byBpbmNsdWRlIHRoZSByZWRpcmVjdHMgb24gdG9wIG9mIHRoZVxuICAgKiBvcmlnaW5hbCByYXcgVVJMLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdGhpcyBpcyBfb25seV8gaGVyZSB0byBzdXBwb3J0IGBVcmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3RgIGFuZFxuICAgKiBgVXJsSGFuZGxpbmdTdHJhdGVneS5zaG91bGRQcm9jZXNzVXJsYC4gV2l0aG91dCB0aG9zZSBBUElzLCB0aGUgY3VycmVudCBgVXJsVHJlZWAgd291bGQgbm90XG4gICAqIGRldmlhdGVkIGZyb20gdGhlIHJhdyBgVXJsVHJlZWAuXG4gICAqXG4gICAqIEZvciBgZXh0cmFjdGAsIGEgcmF3IGBVcmxUcmVlYCBpcyBuZWVkZWQgYmVjYXVzZSBgZXh0cmFjdGAgbWF5IG9ubHkgcmV0dXJuIHBhcnRcbiAgICogb2YgdGhlIG5hdmlnYXRpb24gVVJMLiBUaHVzLCB0aGUgY3VycmVudCBgVXJsVHJlZWAgbWF5IG9ubHkgcmVwcmVzZW50IF9wYXJ0XyBvZiB0aGUgYnJvd3NlclxuICAgKiBVUkwuIFdoZW4gYSBuYXZpZ2F0aW9uIGdldHMgY2FuY2VsbGVkIGFuZCB0aGUgcm91dGVyIG5lZWRzIHRvIHJlc2V0IHRoZSBVUkwgb3IgYSBuZXcgbmF2aWdhdGlvblxuICAgKiBvY2N1cnMsIGl0IG5lZWRzIHRvIGtub3cgdGhlIF93aG9sZV8gYnJvd3NlciBVUkwsIG5vdCBqdXN0IHRoZSBwYXJ0IGhhbmRsZWQgYnlcbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3lgLlxuICAgKiBGb3IgYHNob3VsZFByb2Nlc3NVcmxgLCB3aGVuIHRoZSByZXR1cm4gaXMgYGZhbHNlYCwgdGhlIHJvdXRlciBpZ25vcmVzIHRoZSBuYXZpZ2F0aW9uIGJ1dFxuICAgKiBzdGlsbCB1cGRhdGVzIHRoZSByYXcgYFVybFRyZWVgIHdpdGggdGhlIGFzc3VtcHRpb24gdGhhdCB0aGUgbmF2aWdhdGlvbiB3YXMgY2F1c2VkIGJ5IHRoZVxuICAgKiBsb2NhdGlvbiBjaGFuZ2UgbGlzdGVuZXIgZHVlIHRvIGEgVVJMIHVwZGF0ZSBieSB0aGUgQW5ndWxhckpTIHJvdXRlci4gSW4gdGhpcyBjYXNlLCB0aGUgcm91dGVyXG4gICAqIHN0aWxsIG5lZWQgdG8ga25vdyB3aGF0IHRoZSBicm93c2VyJ3MgVVJMIGlzIGZvciBmdXR1cmUgbmF2aWdhdGlvbnMuXG4gICAqL1xuICBhYnN0cmFjdCBnZXRSYXdVcmxUcmVlKCk6IFVybFRyZWU7XG5cbiAgLyoqIFJldHVybnMgdGhlIGN1cnJlbnQgc3RhdGUgc3RvcmVkIGJ5IHRoZSBicm93c2VyIGZvciB0aGUgY3VycmVudCBoaXN0b3J5IGVudHJ5LiAqL1xuICBhYnN0cmFjdCByZXN0b3JlZFN0YXRlKCk6IFJlc3RvcmVkU3RhdGV8bnVsbHx1bmRlZmluZWQ7XG5cbiAgLyoqIFJldHVybnMgdGhlIGN1cnJlbnQgUm91dGVyU3RhdGUuICovXG4gIGFic3RyYWN0IGdldFJvdXRlclN0YXRlKCk6IFJvdXRlclN0YXRlO1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSBsaXN0ZW5lciB0aGF0IGlzIGNhbGxlZCB3aGVuZXZlciB0aGUgY3VycmVudCBoaXN0b3J5IGVudHJ5IGNoYW5nZXMgYnkgc29tZSBBUElcbiAgICogb3V0c2lkZSB0aGUgUm91dGVyLiBUaGlzIGluY2x1ZGVzIHVzZXItYWN0aXZhdGVkIGNoYW5nZXMgbGlrZSBiYWNrIGJ1dHRvbnMgYW5kIGxpbmsgY2xpY2tzLCBidXRcbiAgICogYWxzbyBpbmNsdWRlcyBwcm9ncmFtbWF0aWMgQVBJcyBjYWxsZWQgYnkgbm9uLVJvdXRlciBKYXZhU2NyaXB0LlxuICAgKi9cbiAgYWJzdHJhY3QgcmVnaXN0ZXJOb25Sb3V0ZXJDdXJyZW50RW50cnlDaGFuZ2VMaXN0ZW5lcihcbiAgICAgIGxpc3RlbmVyOiAodXJsOiBzdHJpbmcsIHN0YXRlOiBSZXN0b3JlZFN0YXRlfG51bGx8dW5kZWZpbmVkKSA9PiB2b2lkKTogU3Vic2NyaXB0aW9uTGlrZTtcblxuICAvKipcbiAgICogSGFuZGxlcyBhIG5hdmlnYXRpb24gZXZlbnQgc2VudCBmcm9tIHRoZSBSb3V0ZXIuIFRoZXNlIGFyZSB0eXBpY2FsbHkgZXZlbnRzIHRoYXQgaW5kaWNhdGUgYVxuICAgKiBuYXZpZ2F0aW9uIGhhcyBzdGFydGVkLCBwcm9ncmVzc2VkLCBiZWVuIGNhbmNlbGxlZCwgb3IgZmluaXNoZWQuXG4gICAqL1xuICBhYnN0cmFjdCBoYW5kbGVSb3V0ZXJFdmVudChlOiBFdmVudHxQcml2YXRlUm91dGVyRXZlbnRzLCBjdXJyZW50VHJhbnNpdGlvbjogTmF2aWdhdGlvbik6IHZvaWQ7XG59XG5cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCd9KVxuZXhwb3J0IGNsYXNzIEhpc3RvcnlTdGF0ZU1hbmFnZXIgZXh0ZW5kcyBTdGF0ZU1hbmFnZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IGxvY2F0aW9uID0gaW5qZWN0KExvY2F0aW9uKTtcbiAgcHJpdmF0ZSByZWFkb25seSB1cmxTZXJpYWxpemVyID0gaW5qZWN0KFVybFNlcmlhbGl6ZXIpO1xuICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnMgPSBpbmplY3QoUk9VVEVSX0NPTkZJR1VSQVRJT04sIHtvcHRpb25hbDogdHJ1ZX0pIHx8IHt9O1xuICBwcml2YXRlIHJlYWRvbmx5IGNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPVxuICAgICAgdGhpcy5vcHRpb25zLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gfHwgJ3JlcGxhY2UnO1xuXG4gIHByaXZhdGUgdXJsSGFuZGxpbmdTdHJhdGVneSA9IGluamVjdChVcmxIYW5kbGluZ1N0cmF0ZWd5KTtcbiAgcHJpdmF0ZSB1cmxVcGRhdGVTdHJhdGVneSA9IHRoaXMub3B0aW9ucy51cmxVcGRhdGVTdHJhdGVneSB8fCAnZGVmZXJyZWQnO1xuXG4gIHByaXZhdGUgY3VycmVudFVybFRyZWUgPSBuZXcgVXJsVHJlZSgpO1xuXG4gIG92ZXJyaWRlIGdldEN1cnJlbnRVcmxUcmVlKCkge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRVcmxUcmVlO1xuICB9XG5cbiAgcHJpdmF0ZSByYXdVcmxUcmVlID0gdGhpcy5jdXJyZW50VXJsVHJlZTtcblxuICBvdmVycmlkZSBnZXRSYXdVcmxUcmVlKCkge1xuICAgIHJldHVybiB0aGlzLnJhd1VybFRyZWU7XG4gIH1cblxuICAvKipcbiAgICogVGhlIGlkIG9mIHRoZSBjdXJyZW50bHkgYWN0aXZlIHBhZ2UgaW4gdGhlIHJvdXRlci5cbiAgICogVXBkYXRlZCB0byB0aGUgdHJhbnNpdGlvbidzIHRhcmdldCBpZCBvbiBhIHN1Y2Nlc3NmdWwgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogVGhpcyBpcyB1c2VkIHRvIHRyYWNrIHdoYXQgcGFnZSB0aGUgcm91dGVyIGxhc3QgYWN0aXZhdGVkLiBXaGVuIGFuIGF0dGVtcHRlZCBuYXZpZ2F0aW9uIGZhaWxzLFxuICAgKiB0aGUgcm91dGVyIGNhbiB0aGVuIHVzZSB0aGlzIHRvIGNvbXB1dGUgaG93IHRvIHJlc3RvcmUgdGhlIHN0YXRlIGJhY2sgdG8gdGhlIHByZXZpb3VzbHkgYWN0aXZlXG4gICAqIHBhZ2UuXG4gICAqL1xuICBwcml2YXRlIGN1cnJlbnRQYWdlSWQ6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgbGFzdFN1Y2Nlc3NmdWxJZDogbnVtYmVyID0gLTE7XG5cbiAgb3ZlcnJpZGUgcmVzdG9yZWRTdGF0ZSgpOiBSZXN0b3JlZFN0YXRlfG51bGx8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5sb2NhdGlvbi5nZXRTdGF0ZSgpIGFzIFJlc3RvcmVkU3RhdGUgfCBudWxsIHwgdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSDJtXJvdXRlclBhZ2VJZCBvZiB3aGF0ZXZlciBwYWdlIGlzIGN1cnJlbnRseSBhY3RpdmUgaW4gdGhlIGJyb3dzZXIgaGlzdG9yeS4gVGhpcyBpc1xuICAgKiBpbXBvcnRhbnQgZm9yIGNvbXB1dGluZyB0aGUgdGFyZ2V0IHBhZ2UgaWQgZm9yIG5ldyBuYXZpZ2F0aW9ucyBiZWNhdXNlIHdlIG5lZWQgdG8gZW5zdXJlIGVhY2hcbiAgICogcGFnZSBpZCBpbiB0aGUgYnJvd3NlciBoaXN0b3J5IGlzIDEgbW9yZSB0aGFuIHRoZSBwcmV2aW91cyBlbnRyeS5cbiAgICovXG4gIHByaXZhdGUgZ2V0IGJyb3dzZXJQYWdlSWQoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uICE9PSAnY29tcHV0ZWQnKSB7XG4gICAgICByZXR1cm4gdGhpcy5jdXJyZW50UGFnZUlkO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXN0b3JlZFN0YXRlKCk/Lsm1cm91dGVyUGFnZUlkID8/IHRoaXMuY3VycmVudFBhZ2VJZDtcbiAgfVxuXG4gIHByaXZhdGUgcm91dGVyU3RhdGUgPSBjcmVhdGVFbXB0eVN0YXRlKHRoaXMuY3VycmVudFVybFRyZWUsIG51bGwpO1xuXG4gIG92ZXJyaWRlIGdldFJvdXRlclN0YXRlKCkge1xuICAgIHJldHVybiB0aGlzLnJvdXRlclN0YXRlO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0ZU1lbWVudG8gPSB0aGlzLmNyZWF0ZVN0YXRlTWVtZW50bygpO1xuXG4gIHByaXZhdGUgY3JlYXRlU3RhdGVNZW1lbnRvKCkge1xuICAgIHJldHVybiB7XG4gICAgICByYXdVcmxUcmVlOiB0aGlzLnJhd1VybFRyZWUsXG4gICAgICBjdXJyZW50VXJsVHJlZTogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIHJvdXRlclN0YXRlOiB0aGlzLnJvdXRlclN0YXRlLFxuICAgIH07XG4gIH1cblxuICBvdmVycmlkZSByZWdpc3Rlck5vblJvdXRlckN1cnJlbnRFbnRyeUNoYW5nZUxpc3RlbmVyKFxuICAgICAgbGlzdGVuZXI6ICh1cmw6IHN0cmluZywgc3RhdGU6IFJlc3RvcmVkU3RhdGV8bnVsbHx1bmRlZmluZWQpID0+IHZvaWQpOiBTdWJzY3JpcHRpb25MaWtlIHtcbiAgICByZXR1cm4gdGhpcy5sb2NhdGlvbi5zdWJzY3JpYmUoZXZlbnQgPT4ge1xuICAgICAgaWYgKGV2ZW50Wyd0eXBlJ10gPT09ICdwb3BzdGF0ZScpIHtcbiAgICAgICAgbGlzdGVuZXIoZXZlbnRbJ3VybCddISwgZXZlbnQuc3RhdGUgYXMgUmVzdG9yZWRTdGF0ZSB8IG51bGwgfCB1bmRlZmluZWQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgaGFuZGxlUm91dGVyRXZlbnQoZTogRXZlbnR8UHJpdmF0ZVJvdXRlckV2ZW50cywgY3VycmVudFRyYW5zaXRpb246IE5hdmlnYXRpb24pIHtcbiAgICBpZiAoZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25TdGFydCkge1xuICAgICAgdGhpcy5zdGF0ZU1lbWVudG8gPSB0aGlzLmNyZWF0ZVN0YXRlTWVtZW50bygpO1xuICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25Ta2lwcGVkKSB7XG4gICAgICB0aGlzLnJhd1VybFRyZWUgPSBjdXJyZW50VHJhbnNpdGlvbi5pbml0aWFsVXJsO1xuICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIFJvdXRlc1JlY29nbml6ZWQpIHtcbiAgICAgIGlmICh0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZWFnZXInKSB7XG4gICAgICAgIGlmICghY3VycmVudFRyYW5zaXRpb24uZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICAgIGNvbnN0IHJhd1VybCA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZShcbiAgICAgICAgICAgICAgY3VycmVudFRyYW5zaXRpb24uZmluYWxVcmwhLCBjdXJyZW50VHJhbnNpdGlvbi5pbml0aWFsVXJsKTtcbiAgICAgICAgICB0aGlzLnNldEJyb3dzZXJVcmwocmF3VXJsLCBjdXJyZW50VHJhbnNpdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGUgaW5zdGFuY2VvZiBCZWZvcmVBY3RpdmF0ZVJvdXRlcykge1xuICAgICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IGN1cnJlbnRUcmFuc2l0aW9uLmZpbmFsVXJsITtcbiAgICAgIHRoaXMucmF3VXJsVHJlZSA9XG4gICAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKGN1cnJlbnRUcmFuc2l0aW9uLmZpbmFsVXJsISwgY3VycmVudFRyYW5zaXRpb24uaW5pdGlhbFVybCk7XG4gICAgICB0aGlzLnJvdXRlclN0YXRlID0gY3VycmVudFRyYW5zaXRpb24udGFyZ2V0Um91dGVyU3RhdGUhO1xuICAgICAgaWYgKHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdkZWZlcnJlZCcpIHtcbiAgICAgICAgaWYgKCFjdXJyZW50VHJhbnNpdGlvbi5leHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHRoaXMucmF3VXJsVHJlZSwgY3VycmVudFRyYW5zaXRpb24pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25DYW5jZWwgJiZcbiAgICAgICAgKGUuY29kZSA9PT0gTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuR3VhcmRSZWplY3RlZCB8fFxuICAgICAgICAgZS5jb2RlID09PSBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZS5Ob0RhdGFGcm9tUmVzb2x2ZXIpKSB7XG4gICAgICB0aGlzLnJlc3RvcmVIaXN0b3J5KGN1cnJlbnRUcmFuc2l0aW9uKTtcbiAgICB9IGVsc2UgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRXJyb3IpIHtcbiAgICAgIHRoaXMucmVzdG9yZUhpc3RvcnkoY3VycmVudFRyYW5zaXRpb24sIHRydWUpO1xuICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpIHtcbiAgICAgIHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCA9IGUuaWQ7XG4gICAgICB0aGlzLmN1cnJlbnRQYWdlSWQgPSB0aGlzLmJyb3dzZXJQYWdlSWQ7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzZXRCcm93c2VyVXJsKHVybDogVXJsVHJlZSwgdHJhbnNpdGlvbjogTmF2aWdhdGlvbikge1xuICAgIGNvbnN0IHBhdGggPSB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHVybCk7XG4gICAgaWYgKHRoaXMubG9jYXRpb24uaXNDdXJyZW50UGF0aEVxdWFsVG8ocGF0aCkgfHwgISF0cmFuc2l0aW9uLmV4dHJhcy5yZXBsYWNlVXJsKSB7XG4gICAgICAvLyByZXBsYWNlbWVudHMgZG8gbm90IHVwZGF0ZSB0aGUgdGFyZ2V0IHBhZ2VcbiAgICAgIGNvbnN0IGN1cnJlbnRCcm93c2VyUGFnZUlkID0gdGhpcy5icm93c2VyUGFnZUlkO1xuICAgICAgY29uc3Qgc3RhdGUgPSB7XG4gICAgICAgIC4uLnRyYW5zaXRpb24uZXh0cmFzLnN0YXRlLFxuICAgICAgICAuLi50aGlzLmdlbmVyYXRlTmdSb3V0ZXJTdGF0ZSh0cmFuc2l0aW9uLmlkLCBjdXJyZW50QnJvd3NlclBhZ2VJZClcbiAgICAgIH07XG4gICAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShwYXRoLCAnJywgc3RhdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzdGF0ZSA9IHtcbiAgICAgICAgLi4udHJhbnNpdGlvbi5leHRyYXMuc3RhdGUsXG4gICAgICAgIC4uLnRoaXMuZ2VuZXJhdGVOZ1JvdXRlclN0YXRlKHRyYW5zaXRpb24uaWQsIHRoaXMuYnJvd3NlclBhZ2VJZCArIDEpXG4gICAgICB9O1xuICAgICAgdGhpcy5sb2NhdGlvbi5nbyhwYXRoLCAnJywgc3RhdGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtcyB0aGUgbmVjZXNzYXJ5IHJvbGxiYWNrIGFjdGlvbiB0byByZXN0b3JlIHRoZSBicm93c2VyIFVSTCB0byB0aGVcbiAgICogc3RhdGUgYmVmb3JlIHRoZSB0cmFuc2l0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSByZXN0b3JlSGlzdG9yeShuYXZpZ2F0aW9uOiBOYXZpZ2F0aW9uLCByZXN0b3JpbmdGcm9tQ2F1Z2h0RXJyb3IgPSBmYWxzZSkge1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdjb21wdXRlZCcpIHtcbiAgICAgIGNvbnN0IGN1cnJlbnRCcm93c2VyUGFnZUlkID0gdGhpcy5icm93c2VyUGFnZUlkO1xuICAgICAgY29uc3QgdGFyZ2V0UGFnZVBvc2l0aW9uID0gdGhpcy5jdXJyZW50UGFnZUlkIC0gY3VycmVudEJyb3dzZXJQYWdlSWQ7XG4gICAgICBpZiAodGFyZ2V0UGFnZVBvc2l0aW9uICE9PSAwKSB7XG4gICAgICAgIHRoaXMubG9jYXRpb24uaGlzdG9yeUdvKHRhcmdldFBhZ2VQb3NpdGlvbik7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuY3VycmVudFVybFRyZWUgPT09IG5hdmlnYXRpb24uZmluYWxVcmwgJiYgdGFyZ2V0UGFnZVBvc2l0aW9uID09PSAwKSB7XG4gICAgICAgIC8vIFdlIGdvdCB0byB0aGUgYWN0aXZhdGlvbiBzdGFnZSAod2hlcmUgY3VycmVudFVybFRyZWUgaXMgc2V0IHRvIHRoZSBuYXZpZ2F0aW9uJ3NcbiAgICAgICAgLy8gZmluYWxVcmwpLCBidXQgd2Ugd2VyZW4ndCBtb3ZpbmcgYW55d2hlcmUgaW4gaGlzdG9yeSAoc2tpcExvY2F0aW9uQ2hhbmdlIG9yIHJlcGxhY2VVcmwpLlxuICAgICAgICAvLyBXZSBzdGlsbCBuZWVkIHRvIHJlc2V0IHRoZSByb3V0ZXIgc3RhdGUgYmFjayB0byB3aGF0IGl0IHdhcyB3aGVuIHRoZSBuYXZpZ2F0aW9uIHN0YXJ0ZWQuXG4gICAgICAgIHRoaXMucmVzZXRTdGF0ZShuYXZpZ2F0aW9uKTtcbiAgICAgICAgdGhpcy5yZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoZSBicm93c2VyIFVSTCBhbmQgcm91dGVyIHN0YXRlIHdhcyBub3QgdXBkYXRlZCBiZWZvcmUgdGhlIG5hdmlnYXRpb24gY2FuY2VsbGVkIHNvXG4gICAgICAgIC8vIHRoZXJlJ3Mgbm8gcmVzdG9yYXRpb24gbmVlZGVkLlxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAncmVwbGFjZScpIHtcbiAgICAgIC8vIFRPRE8oYXRzY290dCk6IEl0IHNlZW1zIGxpa2Ugd2Ugc2hvdWxkIF9hbHdheXNfIHJlc2V0IHRoZSBzdGF0ZSBoZXJlLiBJdCB3b3VsZCBiZSBhIG5vLW9wXG4gICAgICAvLyBmb3IgYGRlZmVycmVkYCBuYXZpZ2F0aW9ucyB0aGF0IGhhdmVuJ3QgY2hhbmdlIHRoZSBpbnRlcm5hbCBzdGF0ZSB5ZXQgYmVjYXVzZSBndWFyZHNcbiAgICAgIC8vIHJlamVjdC4gRm9yICdlYWdlcicgbmF2aWdhdGlvbnMsIGl0IHNlZW1zIGxpa2Ugd2UgYWxzbyByZWFsbHkgc2hvdWxkIHJlc2V0IHRoZSBzdGF0ZVxuICAgICAgLy8gYmVjYXVzZSB0aGUgbmF2aWdhdGlvbiB3YXMgY2FuY2VsbGVkLiBJbnZlc3RpZ2F0ZSBpZiB0aGlzIGNhbiBiZSBkb25lIGJ5IHJ1bm5pbmcgVEdQLlxuICAgICAgaWYgKHJlc3RvcmluZ0Zyb21DYXVnaHRFcnJvcikge1xuICAgICAgICB0aGlzLnJlc2V0U3RhdGUobmF2aWdhdGlvbik7XG4gICAgICB9XG4gICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRTdGF0ZShuYXZpZ2F0aW9uOiBOYXZpZ2F0aW9uKTogdm9pZCB7XG4gICAgdGhpcy5yb3V0ZXJTdGF0ZSA9IHRoaXMuc3RhdGVNZW1lbnRvLnJvdXRlclN0YXRlO1xuICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSB0aGlzLnN0YXRlTWVtZW50by5jdXJyZW50VXJsVHJlZTtcbiAgICAvLyBOb3RlIGhlcmUgdGhhdCB3ZSB1c2UgdGhlIHVybEhhbmRsaW5nU3RyYXRlZ3kgdG8gZ2V0IHRoZSByZXNldCBgcmF3VXJsVHJlZWAgYmVjYXVzZSBpdCBtYXkgYmVcbiAgICAvLyBjb25maWd1cmVkIHRvIGhhbmRsZSBvbmx5IHBhcnQgb2YgdGhlIG5hdmlnYXRpb24gVVJMLiBUaGlzIG1lYW5zIHdlIHdvdWxkIG9ubHkgd2FudCB0byByZXNldFxuICAgIC8vIHRoZSBwYXJ0IG9mIHRoZSBuYXZpZ2F0aW9uIGhhbmRsZWQgYnkgdGhlIEFuZ3VsYXIgcm91dGVyIHJhdGhlciB0aGFuIHRoZSB3aG9sZSBVUkwuIEluXG4gICAgLy8gYWRkaXRpb24sIHRoZSBVUkxIYW5kbGluZ1N0cmF0ZWd5IG1heSBiZSBjb25maWd1cmVkIHRvIHNwZWNpZmljYWxseSBwcmVzZXJ2ZSBwYXJ0cyBvZiB0aGUgVVJMXG4gICAgLy8gd2hlbiBtZXJnaW5nLCBzdWNoIGFzIHRoZSBxdWVyeSBwYXJhbXMgc28gdGhleSBhcmUgbm90IGxvc3Qgb24gYSByZWZyZXNoLlxuICAgIHRoaXMucmF3VXJsVHJlZSA9XG4gICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCBuYXZpZ2F0aW9uLmZpbmFsVXJsID8/IHRoaXMucmF3VXJsVHJlZSk7XG4gIH1cblxuICBwcml2YXRlIHJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpOiB2b2lkIHtcbiAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShcbiAgICAgICAgdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh0aGlzLnJhd1VybFRyZWUpLCAnJyxcbiAgICAgICAgdGhpcy5nZW5lcmF0ZU5nUm91dGVyU3RhdGUodGhpcy5sYXN0U3VjY2Vzc2Z1bElkLCB0aGlzLmN1cnJlbnRQYWdlSWQpKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2VuZXJhdGVOZ1JvdXRlclN0YXRlKG5hdmlnYXRpb25JZDogbnVtYmVyLCByb3V0ZXJQYWdlSWQ6IG51bWJlcikge1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdjb21wdXRlZCcpIHtcbiAgICAgIHJldHVybiB7bmF2aWdhdGlvbklkLCDJtXJvdXRlclBhZ2VJZDogcm91dGVyUGFnZUlkfTtcbiAgICB9XG4gICAgcmV0dXJuIHtuYXZpZ2F0aW9uSWR9O1xuICB9XG59XG4iXX0=