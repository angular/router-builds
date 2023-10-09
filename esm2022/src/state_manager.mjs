/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { BeforeActivateRoutes, NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, NavigationStart, RoutesRecognized } from './events';
import { ROUTER_CONFIGURATION } from './router_config';
import { createEmptyState } from './router_state';
import { UrlHandlingStrategy } from './url_handling_strategy';
import { UrlSerializer, UrlTree } from './url_tree';
import * as i0 from "@angular/core";
export class StateManager {
    constructor() {
        this.location = inject(Location);
        this.urlSerializer = inject(UrlSerializer);
        this.options = inject(ROUTER_CONFIGURATION, { optional: true }) || {};
        this.canceledNavigationResolution = this.options.canceledNavigationResolution || 'replace';
        // These are currently writable via the Router public API but are deprecated and should be made
        // `private readonly` in the future.
        this.urlHandlingStrategy = inject(UrlHandlingStrategy);
        this.urlUpdateStrategy = this.options.urlUpdateStrategy || 'deferred';
        /**
         * Represents the activated `UrlTree` that the `Router` is configured to handle (through
         * `UrlHandlingStrategy`). That is, after we find the route config tree that we're going to
         * activate, run guards, and are just about to activate the route, we set the currentUrlTree.
         * @internal
         */
        this.currentUrlTree = new UrlTree();
        /**
         * Meant to represent the entire browser url after a successful navigation. In the life of a
         * navigation transition:
         * 1. The rawUrl represents the full URL that's being navigated to
         * 2. We apply redirects, which might only apply to _part_ of the URL (due to
         * `UrlHandlingStrategy`).
         * 3. Right before activation (because we assume activation will succeed), we update the
         * rawUrlTree to be a combination of the urlAfterRedirects (again, this might only apply to part
         * of the initial url) and the rawUrl of the transition (which was the original navigation url in
         * its full form).
         * @internal
         *
         * Note that this is _only_ here to support `UrlHandlingStrategy.extract` and
         * `UrlHandlingStrategy.shouldProcessUrl`. If those didn't exist, we could get by with
         * `currentUrlTree` alone. If a new Router were to be provided (i.e. one that works with the
         * browser navigation API), we should think about whether this complexity should be carried over.
         *
         * - extract: `rawUrlTree` is needed because `extract` may only return part
         * of the navigation URL. Thus, `currentUrlTree` may only represent _part_ of the browser URL.
         * When a navigation gets cancelled and we need to reset the URL or a new navigation occurs, we
         * need to know the _whole_ browser URL, not just the part handled by UrlHandlingStrategy.
         * - shouldProcessUrl: When this returns `false`, the router just ignores the navigation but still
         * updates the `rawUrlTree` with the assumption that the navigation was caused by the location
         * change listener due to a URL update by the AngularJS router. In this case, we still need to
         * know what the browser's URL is for future navigations.
         *
         */
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
    /** Returns the current state from the browser. */
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
    createStateMemento() {
        return {
            rawUrlTree: this.rawUrlTree,
            currentUrlTree: this.currentUrlTree,
            routerState: this.routerState,
        };
    }
    nonRouterCurrentEntryChange(listener) {
        return this.location.subscribe(event => {
            if (event['type'] === 'popstate') {
                listener(event['url'], event.state);
            }
        });
    }
    handleNavigationEvent(e, currentTransition) {
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
     * @internal
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.0.0-next.7+sha-11bb19c", ngImport: i0, type: StateManager, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.0.0-next.7+sha-11bb19c", ngImport: i0, type: StateManager, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.0.0-next.7+sha-11bb19c", ngImport: i0, type: StateManager, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGVfbWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvc3RhdGVfbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDekMsT0FBTyxFQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFHakQsT0FBTyxFQUFDLG9CQUFvQixFQUFTLGdCQUFnQixFQUE4QixhQUFhLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBdUIsZ0JBQWdCLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFFOU0sT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDckQsT0FBTyxFQUFDLGdCQUFnQixFQUFjLE1BQU0sZ0JBQWdCLENBQUM7QUFDN0QsT0FBTyxFQUFDLG1CQUFtQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDNUQsT0FBTyxFQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUMsTUFBTSxZQUFZLENBQUM7O0FBS2xELE1BQU0sT0FBTyxZQUFZO0lBRHpCO1FBRW1CLGFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUIsa0JBQWEsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDdEMsWUFBTyxHQUFHLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMvRCxpQ0FBNEIsR0FDekMsSUFBSSxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsSUFBSSxTQUFTLENBQUM7UUFFM0QsK0ZBQStGO1FBQy9GLG9DQUFvQztRQUNwQyx3QkFBbUIsR0FBRyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNsRCxzQkFBaUIsR0FBRyxJQUFJ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QUFDLEVBQUMsVUFBVSxFQUFFLE1BQU0sRUFBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtpbmplY3QsIEluamVjdGFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtTdWJzY3JpcHRpb25MaWtlfSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtCZWZvcmVBY3RpdmF0ZVJvdXRlcywgRXZlbnQsIE5hdmlnYXRpb25DYW5jZWwsIE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLCBOYXZpZ2F0aW9uRW5kLCBOYXZpZ2F0aW9uRXJyb3IsIE5hdmlnYXRpb25Ta2lwcGVkLCBOYXZpZ2F0aW9uU3RhcnQsIFByaXZhdGVSb3V0ZXJFdmVudHMsIFJvdXRlc1JlY29nbml6ZWR9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7aXNCcm93c2VyVHJpZ2dlcmVkTmF2aWdhdGlvbiwgTmF2aWdhdGlvbiwgUmVzdG9yZWRTdGF0ZX0gZnJvbSAnLi9uYXZpZ2F0aW9uX3RyYW5zaXRpb24nO1xuaW1wb3J0IHtST1VURVJfQ09ORklHVVJBVElPTn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnJztcbmltcG9ydCB7Y3JlYXRlRW1wdHlTdGF0ZSwgUm91dGVyU3RhdGV9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7VXJsSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi91cmxfaGFuZGxpbmdfc3RyYXRlZ3knO1xuaW1wb3J0IHtVcmxTZXJpYWxpemVyLCBVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcblxuXG5cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCd9KVxuZXhwb3J0IGNsYXNzIFN0YXRlTWFuYWdlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgbG9jYXRpb24gPSBpbmplY3QoTG9jYXRpb24pO1xuICBwcml2YXRlIHJlYWRvbmx5IHVybFNlcmlhbGl6ZXIgPSBpbmplY3QoVXJsU2VyaWFsaXplcik7XG4gIHByaXZhdGUgcmVhZG9ubHkgb3B0aW9ucyA9IGluamVjdChST1VURVJfQ09ORklHVVJBVElPTiwge29wdGlvbmFsOiB0cnVlfSkgfHwge307XG4gIHByaXZhdGUgcmVhZG9ubHkgY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9XG4gICAgICB0aGlzLm9wdGlvbnMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiB8fCAncmVwbGFjZSc7XG5cbiAgLy8gVGhlc2UgYXJlIGN1cnJlbnRseSB3cml0YWJsZSB2aWEgdGhlIFJvdXRlciBwdWJsaWMgQVBJIGJ1dCBhcmUgZGVwcmVjYXRlZCBhbmQgc2hvdWxkIGJlIG1hZGVcbiAgLy8gYHByaXZhdGUgcmVhZG9ubHlgIGluIHRoZSBmdXR1cmUuXG4gIHVybEhhbmRsaW5nU3RyYXRlZ3kgPSBpbmplY3QoVXJsSGFuZGxpbmdTdHJhdGVneSk7XG4gIHVybFVwZGF0ZVN0cmF0ZWd5ID0gdGhpcy5vcHRpb25zLnVybFVwZGF0ZVN0cmF0ZWd5IHx8ICdkZWZlcnJlZCc7XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgdGhlIGFjdGl2YXRlZCBgVXJsVHJlZWAgdGhhdCB0aGUgYFJvdXRlcmAgaXMgY29uZmlndXJlZCB0byBoYW5kbGUgKHRocm91Z2hcbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3lgKS4gVGhhdCBpcywgYWZ0ZXIgd2UgZmluZCB0aGUgcm91dGUgY29uZmlnIHRyZWUgdGhhdCB3ZSdyZSBnb2luZyB0b1xuICAgKiBhY3RpdmF0ZSwgcnVuIGd1YXJkcywgYW5kIGFyZSBqdXN0IGFib3V0IHRvIGFjdGl2YXRlIHRoZSByb3V0ZSwgd2Ugc2V0IHRoZSBjdXJyZW50VXJsVHJlZS5cbiAgICogQGludGVybmFsXG4gICAqL1xuICBjdXJyZW50VXJsVHJlZSA9IG5ldyBVcmxUcmVlKCk7XG4gIC8qKlxuICAgKiBNZWFudCB0byByZXByZXNlbnQgdGhlIGVudGlyZSBicm93c2VyIHVybCBhZnRlciBhIHN1Y2Nlc3NmdWwgbmF2aWdhdGlvbi4gSW4gdGhlIGxpZmUgb2YgYVxuICAgKiBuYXZpZ2F0aW9uIHRyYW5zaXRpb246XG4gICAqIDEuIFRoZSByYXdVcmwgcmVwcmVzZW50cyB0aGUgZnVsbCBVUkwgdGhhdCdzIGJlaW5nIG5hdmlnYXRlZCB0b1xuICAgKiAyLiBXZSBhcHBseSByZWRpcmVjdHMsIHdoaWNoIG1pZ2h0IG9ubHkgYXBwbHkgdG8gX3BhcnRfIG9mIHRoZSBVUkwgKGR1ZSB0b1xuICAgKiBgVXJsSGFuZGxpbmdTdHJhdGVneWApLlxuICAgKiAzLiBSaWdodCBiZWZvcmUgYWN0aXZhdGlvbiAoYmVjYXVzZSB3ZSBhc3N1bWUgYWN0aXZhdGlvbiB3aWxsIHN1Y2NlZWQpLCB3ZSB1cGRhdGUgdGhlXG4gICAqIHJhd1VybFRyZWUgdG8gYmUgYSBjb21iaW5hdGlvbiBvZiB0aGUgdXJsQWZ0ZXJSZWRpcmVjdHMgKGFnYWluLCB0aGlzIG1pZ2h0IG9ubHkgYXBwbHkgdG8gcGFydFxuICAgKiBvZiB0aGUgaW5pdGlhbCB1cmwpIGFuZCB0aGUgcmF3VXJsIG9mIHRoZSB0cmFuc2l0aW9uICh3aGljaCB3YXMgdGhlIG9yaWdpbmFsIG5hdmlnYXRpb24gdXJsIGluXG4gICAqIGl0cyBmdWxsIGZvcm0pLlxuICAgKiBAaW50ZXJuYWxcbiAgICpcbiAgICogTm90ZSB0aGF0IHRoaXMgaXMgX29ubHlfIGhlcmUgdG8gc3VwcG9ydCBgVXJsSGFuZGxpbmdTdHJhdGVneS5leHRyYWN0YCBhbmRcbiAgICogYFVybEhhbmRsaW5nU3RyYXRlZ3kuc2hvdWxkUHJvY2Vzc1VybGAuIElmIHRob3NlIGRpZG4ndCBleGlzdCwgd2UgY291bGQgZ2V0IGJ5IHdpdGhcbiAgICogYGN1cnJlbnRVcmxUcmVlYCBhbG9uZS4gSWYgYSBuZXcgUm91dGVyIHdlcmUgdG8gYmUgcHJvdmlkZWQgKGkuZS4gb25lIHRoYXQgd29ya3Mgd2l0aCB0aGVcbiAgICogYnJvd3NlciBuYXZpZ2F0aW9uIEFQSSksIHdlIHNob3VsZCB0aGluayBhYm91dCB3aGV0aGVyIHRoaXMgY29tcGxleGl0eSBzaG91bGQgYmUgY2FycmllZCBvdmVyLlxuICAgKlxuICAgKiAtIGV4dHJhY3Q6IGByYXdVcmxUcmVlYCBpcyBuZWVkZWQgYmVjYXVzZSBgZXh0cmFjdGAgbWF5IG9ubHkgcmV0dXJuIHBhcnRcbiAgICogb2YgdGhlIG5hdmlnYXRpb24gVVJMLiBUaHVzLCBgY3VycmVudFVybFRyZWVgIG1heSBvbmx5IHJlcHJlc2VudCBfcGFydF8gb2YgdGhlIGJyb3dzZXIgVVJMLlxuICAgKiBXaGVuIGEgbmF2aWdhdGlvbiBnZXRzIGNhbmNlbGxlZCBhbmQgd2UgbmVlZCB0byByZXNldCB0aGUgVVJMIG9yIGEgbmV3IG5hdmlnYXRpb24gb2NjdXJzLCB3ZVxuICAgKiBuZWVkIHRvIGtub3cgdGhlIF93aG9sZV8gYnJvd3NlciBVUkwsIG5vdCBqdXN0IHRoZSBwYXJ0IGhhbmRsZWQgYnkgVXJsSGFuZGxpbmdTdHJhdGVneS5cbiAgICogLSBzaG91bGRQcm9jZXNzVXJsOiBXaGVuIHRoaXMgcmV0dXJucyBgZmFsc2VgLCB0aGUgcm91dGVyIGp1c3QgaWdub3JlcyB0aGUgbmF2aWdhdGlvbiBidXQgc3RpbGxcbiAgICogdXBkYXRlcyB0aGUgYHJhd1VybFRyZWVgIHdpdGggdGhlIGFzc3VtcHRpb24gdGhhdCB0aGUgbmF2aWdhdGlvbiB3YXMgY2F1c2VkIGJ5IHRoZSBsb2NhdGlvblxuICAgKiBjaGFuZ2UgbGlzdGVuZXIgZHVlIHRvIGEgVVJMIHVwZGF0ZSBieSB0aGUgQW5ndWxhckpTIHJvdXRlci4gSW4gdGhpcyBjYXNlLCB3ZSBzdGlsbCBuZWVkIHRvXG4gICAqIGtub3cgd2hhdCB0aGUgYnJvd3NlcidzIFVSTCBpcyBmb3IgZnV0dXJlIG5hdmlnYXRpb25zLlxuICAgKlxuICAgKi9cbiAgcmF3VXJsVHJlZSA9IHRoaXMuY3VycmVudFVybFRyZWU7XG4gIC8qKlxuICAgKiBUaGUgaWQgb2YgdGhlIGN1cnJlbnRseSBhY3RpdmUgcGFnZSBpbiB0aGUgcm91dGVyLlxuICAgKiBVcGRhdGVkIHRvIHRoZSB0cmFuc2l0aW9uJ3MgdGFyZ2V0IGlkIG9uIGEgc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBUaGlzIGlzIHVzZWQgdG8gdHJhY2sgd2hhdCBwYWdlIHRoZSByb3V0ZXIgbGFzdCBhY3RpdmF0ZWQuIFdoZW4gYW4gYXR0ZW1wdGVkIG5hdmlnYXRpb24gZmFpbHMsXG4gICAqIHRoZSByb3V0ZXIgY2FuIHRoZW4gdXNlIHRoaXMgdG8gY29tcHV0ZSBob3cgdG8gcmVzdG9yZSB0aGUgc3RhdGUgYmFjayB0byB0aGUgcHJldmlvdXNseSBhY3RpdmVcbiAgICogcGFnZS5cbiAgICovXG4gIHByaXZhdGUgY3VycmVudFBhZ2VJZDogbnVtYmVyID0gMDtcbiAgbGFzdFN1Y2Nlc3NmdWxJZDogbnVtYmVyID0gLTE7XG5cbiAgLyoqIFJldHVybnMgdGhlIGN1cnJlbnQgc3RhdGUgZnJvbSB0aGUgYnJvd3Nlci4gKi9cbiAgcmVzdG9yZWRTdGF0ZSgpOiBSZXN0b3JlZFN0YXRlfG51bGx8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5sb2NhdGlvbi5nZXRTdGF0ZSgpIGFzIFJlc3RvcmVkU3RhdGUgfCBudWxsIHwgdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSDJtXJvdXRlclBhZ2VJZCBvZiB3aGF0ZXZlciBwYWdlIGlzIGN1cnJlbnRseSBhY3RpdmUgaW4gdGhlIGJyb3dzZXIgaGlzdG9yeS4gVGhpcyBpc1xuICAgKiBpbXBvcnRhbnQgZm9yIGNvbXB1dGluZyB0aGUgdGFyZ2V0IHBhZ2UgaWQgZm9yIG5ldyBuYXZpZ2F0aW9ucyBiZWNhdXNlIHdlIG5lZWQgdG8gZW5zdXJlIGVhY2hcbiAgICogcGFnZSBpZCBpbiB0aGUgYnJvd3NlciBoaXN0b3J5IGlzIDEgbW9yZSB0aGFuIHRoZSBwcmV2aW91cyBlbnRyeS5cbiAgICovXG4gIHByaXZhdGUgZ2V0IGJyb3dzZXJQYWdlSWQoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uICE9PSAnY29tcHV0ZWQnKSB7XG4gICAgICByZXR1cm4gdGhpcy5jdXJyZW50UGFnZUlkO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXN0b3JlZFN0YXRlKCk/Lsm1cm91dGVyUGFnZUlkID8/IHRoaXMuY3VycmVudFBhZ2VJZDtcbiAgfVxuXG4gIHJvdXRlclN0YXRlID0gY3JlYXRlRW1wdHlTdGF0ZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCBudWxsKTtcbiAgcHJpdmF0ZSBzdGF0ZU1lbWVudG8gPSB0aGlzLmNyZWF0ZVN0YXRlTWVtZW50bygpO1xuXG4gIHByaXZhdGUgY3JlYXRlU3RhdGVNZW1lbnRvKCkge1xuICAgIHJldHVybiB7XG4gICAgICByYXdVcmxUcmVlOiB0aGlzLnJhd1VybFRyZWUsXG4gICAgICBjdXJyZW50VXJsVHJlZTogdGhpcy5jdXJyZW50VXJsVHJlZSxcbiAgICAgIHJvdXRlclN0YXRlOiB0aGlzLnJvdXRlclN0YXRlLFxuICAgIH07XG4gIH1cblxuICBub25Sb3V0ZXJDdXJyZW50RW50cnlDaGFuZ2UoXG4gICAgICBsaXN0ZW5lcjogKHVybDogc3RyaW5nLCBzdGF0ZTogUmVzdG9yZWRTdGF0ZXxudWxsfHVuZGVmaW5lZCkgPT4gdm9pZCk6IFN1YnNjcmlwdGlvbkxpa2Uge1xuICAgIHJldHVybiB0aGlzLmxvY2F0aW9uLnN1YnNjcmliZShldmVudCA9PiB7XG4gICAgICBpZiAoZXZlbnRbJ3R5cGUnXSA9PT0gJ3BvcHN0YXRlJykge1xuICAgICAgICBsaXN0ZW5lcihldmVudFsndXJsJ10hLCBldmVudC5zdGF0ZSBhcyBSZXN0b3JlZFN0YXRlIHwgbnVsbCB8IHVuZGVmaW5lZCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBoYW5kbGVOYXZpZ2F0aW9uRXZlbnQoZTogRXZlbnR8UHJpdmF0ZVJvdXRlckV2ZW50cywgY3VycmVudFRyYW5zaXRpb246IE5hdmlnYXRpb24pIHtcbiAgICBpZiAoZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25TdGFydCkge1xuICAgICAgdGhpcy5zdGF0ZU1lbWVudG8gPSB0aGlzLmNyZWF0ZVN0YXRlTWVtZW50bygpO1xuICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25Ta2lwcGVkKSB7XG4gICAgICB0aGlzLnJhd1VybFRyZWUgPSBjdXJyZW50VHJhbnNpdGlvbi5pbml0aWFsVXJsO1xuICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIFJvdXRlc1JlY29nbml6ZWQpIHtcbiAgICAgIGlmICh0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZWFnZXInKSB7XG4gICAgICAgIGlmICghY3VycmVudFRyYW5zaXRpb24uZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICAgIGNvbnN0IHJhd1VybCA9IHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZShcbiAgICAgICAgICAgICAgY3VycmVudFRyYW5zaXRpb24uZmluYWxVcmwhLCBjdXJyZW50VHJhbnNpdGlvbi5pbml0aWFsVXJsKTtcbiAgICAgICAgICB0aGlzLnNldEJyb3dzZXJVcmwocmF3VXJsLCBjdXJyZW50VHJhbnNpdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGUgaW5zdGFuY2VvZiBCZWZvcmVBY3RpdmF0ZVJvdXRlcykge1xuICAgICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IGN1cnJlbnRUcmFuc2l0aW9uLmZpbmFsVXJsITtcbiAgICAgIHRoaXMucmF3VXJsVHJlZSA9XG4gICAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKGN1cnJlbnRUcmFuc2l0aW9uLmZpbmFsVXJsISwgY3VycmVudFRyYW5zaXRpb24uaW5pdGlhbFVybCk7XG4gICAgICB0aGlzLnJvdXRlclN0YXRlID0gY3VycmVudFRyYW5zaXRpb24udGFyZ2V0Um91dGVyU3RhdGUhO1xuICAgICAgaWYgKHRoaXMudXJsVXBkYXRlU3RyYXRlZ3kgPT09ICdkZWZlcnJlZCcpIHtcbiAgICAgICAgaWYgKCFjdXJyZW50VHJhbnNpdGlvbi5leHRyYXMuc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHRoaXMucmF3VXJsVHJlZSwgY3VycmVudFRyYW5zaXRpb24pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25DYW5jZWwgJiZcbiAgICAgICAgKGUuY29kZSA9PT0gTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuR3VhcmRSZWplY3RlZCB8fFxuICAgICAgICAgZS5jb2RlID09PSBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZS5Ob0RhdGFGcm9tUmVzb2x2ZXIpKSB7XG4gICAgICB0aGlzLnJlc3RvcmVIaXN0b3J5KGN1cnJlbnRUcmFuc2l0aW9uKTtcbiAgICB9IGVsc2UgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRXJyb3IpIHtcbiAgICAgIHRoaXMucmVzdG9yZUhpc3RvcnkoY3VycmVudFRyYW5zaXRpb24sIHRydWUpO1xuICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpIHtcbiAgICAgIHRoaXMubGFzdFN1Y2Nlc3NmdWxJZCA9IGUuaWQ7XG4gICAgICB0aGlzLmN1cnJlbnRQYWdlSWQgPSB0aGlzLmJyb3dzZXJQYWdlSWQ7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzZXRCcm93c2VyVXJsKHVybDogVXJsVHJlZSwgdHJhbnNpdGlvbjogTmF2aWdhdGlvbikge1xuICAgIGNvbnN0IHBhdGggPSB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHVybCk7XG4gICAgaWYgKHRoaXMubG9jYXRpb24uaXNDdXJyZW50UGF0aEVxdWFsVG8ocGF0aCkgfHwgISF0cmFuc2l0aW9uLmV4dHJhcy5yZXBsYWNlVXJsKSB7XG4gICAgICAvLyByZXBsYWNlbWVudHMgZG8gbm90IHVwZGF0ZSB0aGUgdGFyZ2V0IHBhZ2VcbiAgICAgIGNvbnN0IGN1cnJlbnRCcm93c2VyUGFnZUlkID0gdGhpcy5icm93c2VyUGFnZUlkO1xuICAgICAgY29uc3Qgc3RhdGUgPSB7XG4gICAgICAgIC4uLnRyYW5zaXRpb24uZXh0cmFzLnN0YXRlLFxuICAgICAgICAuLi50aGlzLmdlbmVyYXRlTmdSb3V0ZXJTdGF0ZSh0cmFuc2l0aW9uLmlkLCBjdXJyZW50QnJvd3NlclBhZ2VJZClcbiAgICAgIH07XG4gICAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShwYXRoLCAnJywgc3RhdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzdGF0ZSA9IHtcbiAgICAgICAgLi4udHJhbnNpdGlvbi5leHRyYXMuc3RhdGUsXG4gICAgICAgIC4uLnRoaXMuZ2VuZXJhdGVOZ1JvdXRlclN0YXRlKHRyYW5zaXRpb24uaWQsIHRoaXMuYnJvd3NlclBhZ2VJZCArIDEpXG4gICAgICB9O1xuICAgICAgdGhpcy5sb2NhdGlvbi5nbyhwYXRoLCAnJywgc3RhdGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtcyB0aGUgbmVjZXNzYXJ5IHJvbGxiYWNrIGFjdGlvbiB0byByZXN0b3JlIHRoZSBicm93c2VyIFVSTCB0byB0aGVcbiAgICogc3RhdGUgYmVmb3JlIHRoZSB0cmFuc2l0aW9uLlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHJlc3RvcmVIaXN0b3J5KG5hdmlnYXRpb246IE5hdmlnYXRpb24sIHJlc3RvcmluZ0Zyb21DYXVnaHRFcnJvciA9IGZhbHNlKSB7XG4gICAgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ2NvbXB1dGVkJykge1xuICAgICAgY29uc3QgY3VycmVudEJyb3dzZXJQYWdlSWQgPSB0aGlzLmJyb3dzZXJQYWdlSWQ7XG4gICAgICBjb25zdCB0YXJnZXRQYWdlUG9zaXRpb24gPSB0aGlzLmN1cnJlbnRQYWdlSWQgLSBjdXJyZW50QnJvd3NlclBhZ2VJZDtcbiAgICAgIGlmICh0YXJnZXRQYWdlUG9zaXRpb24gIT09IDApIHtcbiAgICAgICAgdGhpcy5sb2NhdGlvbi5oaXN0b3J5R28odGFyZ2V0UGFnZVBvc2l0aW9uKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5jdXJyZW50VXJsVHJlZSA9PT0gbmF2aWdhdGlvbi5maW5hbFVybCAmJiB0YXJnZXRQYWdlUG9zaXRpb24gPT09IDApIHtcbiAgICAgICAgLy8gV2UgZ290IHRvIHRoZSBhY3RpdmF0aW9uIHN0YWdlICh3aGVyZSBjdXJyZW50VXJsVHJlZSBpcyBzZXQgdG8gdGhlIG5hdmlnYXRpb24nc1xuICAgICAgICAvLyBmaW5hbFVybCksIGJ1dCB3ZSB3ZXJlbid0IG1vdmluZyBhbnl3aGVyZSBpbiBoaXN0b3J5IChza2lwTG9jYXRpb25DaGFuZ2Ugb3IgcmVwbGFjZVVybCkuXG4gICAgICAgIC8vIFdlIHN0aWxsIG5lZWQgdG8gcmVzZXQgdGhlIHJvdXRlciBzdGF0ZSBiYWNrIHRvIHdoYXQgaXQgd2FzIHdoZW4gdGhlIG5hdmlnYXRpb24gc3RhcnRlZC5cbiAgICAgICAgdGhpcy5yZXNldFN0YXRlKG5hdmlnYXRpb24pO1xuICAgICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhlIGJyb3dzZXIgVVJMIGFuZCByb3V0ZXIgc3RhdGUgd2FzIG5vdCB1cGRhdGVkIGJlZm9yZSB0aGUgbmF2aWdhdGlvbiBjYW5jZWxsZWQgc29cbiAgICAgICAgLy8gdGhlcmUncyBubyByZXN0b3JhdGlvbiBuZWVkZWQuXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdyZXBsYWNlJykge1xuICAgICAgLy8gVE9ETyhhdHNjb3R0KTogSXQgc2VlbXMgbGlrZSB3ZSBzaG91bGQgX2Fsd2F5c18gcmVzZXQgdGhlIHN0YXRlIGhlcmUuIEl0IHdvdWxkIGJlIGEgbm8tb3BcbiAgICAgIC8vIGZvciBgZGVmZXJyZWRgIG5hdmlnYXRpb25zIHRoYXQgaGF2ZW4ndCBjaGFuZ2UgdGhlIGludGVybmFsIHN0YXRlIHlldCBiZWNhdXNlIGd1YXJkc1xuICAgICAgLy8gcmVqZWN0LiBGb3IgJ2VhZ2VyJyBuYXZpZ2F0aW9ucywgaXQgc2VlbXMgbGlrZSB3ZSBhbHNvIHJlYWxseSBzaG91bGQgcmVzZXQgdGhlIHN0YXRlXG4gICAgICAvLyBiZWNhdXNlIHRoZSBuYXZpZ2F0aW9uIHdhcyBjYW5jZWxsZWQuIEludmVzdGlnYXRlIGlmIHRoaXMgY2FuIGJlIGRvbmUgYnkgcnVubmluZyBUR1AuXG4gICAgICBpZiAocmVzdG9yaW5nRnJvbUNhdWdodEVycm9yKSB7XG4gICAgICAgIHRoaXMucmVzZXRTdGF0ZShuYXZpZ2F0aW9uKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZXNldFN0YXRlKG5hdmlnYXRpb246IE5hdmlnYXRpb24pOiB2b2lkIHtcbiAgICB0aGlzLnJvdXRlclN0YXRlID0gdGhpcy5zdGF0ZU1lbWVudG8ucm91dGVyU3RhdGU7XG4gICAgdGhpcy5jdXJyZW50VXJsVHJlZSA9IHRoaXMuc3RhdGVNZW1lbnRvLmN1cnJlbnRVcmxUcmVlO1xuICAgIC8vIE5vdGUgaGVyZSB0aGF0IHdlIHVzZSB0aGUgdXJsSGFuZGxpbmdTdHJhdGVneSB0byBnZXQgdGhlIHJlc2V0IGByYXdVcmxUcmVlYCBiZWNhdXNlIGl0IG1heSBiZVxuICAgIC8vIGNvbmZpZ3VyZWQgdG8gaGFuZGxlIG9ubHkgcGFydCBvZiB0aGUgbmF2aWdhdGlvbiBVUkwuIFRoaXMgbWVhbnMgd2Ugd291bGQgb25seSB3YW50IHRvIHJlc2V0XG4gICAgLy8gdGhlIHBhcnQgb2YgdGhlIG5hdmlnYXRpb24gaGFuZGxlZCBieSB0aGUgQW5ndWxhciByb3V0ZXIgcmF0aGVyIHRoYW4gdGhlIHdob2xlIFVSTC4gSW5cbiAgICAvLyBhZGRpdGlvbiwgdGhlIFVSTEhhbmRsaW5nU3RyYXRlZ3kgbWF5IGJlIGNvbmZpZ3VyZWQgdG8gc3BlY2lmaWNhbGx5IHByZXNlcnZlIHBhcnRzIG9mIHRoZSBVUkxcbiAgICAvLyB3aGVuIG1lcmdpbmcsIHN1Y2ggYXMgdGhlIHF1ZXJ5IHBhcmFtcyBzbyB0aGV5IGFyZSBub3QgbG9zdCBvbiBhIHJlZnJlc2guXG4gICAgdGhpcy5yYXdVcmxUcmVlID1cbiAgICAgICAgdGhpcy51cmxIYW5kbGluZ1N0cmF0ZWd5Lm1lcmdlKHRoaXMuY3VycmVudFVybFRyZWUsIG5hdmlnYXRpb24uZmluYWxVcmwgPz8gdGhpcy5yYXdVcmxUcmVlKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRVcmxUb0N1cnJlbnRVcmxUcmVlKCk6IHZvaWQge1xuICAgIHRoaXMubG9jYXRpb24ucmVwbGFjZVN0YXRlKFxuICAgICAgICB0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHRoaXMucmF3VXJsVHJlZSksICcnLFxuICAgICAgICB0aGlzLmdlbmVyYXRlTmdSb3V0ZXJTdGF0ZSh0aGlzLmxhc3RTdWNjZXNzZnVsSWQsIHRoaXMuY3VycmVudFBhZ2VJZCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZU5nUm91dGVyU3RhdGUobmF2aWdhdGlvbklkOiBudW1iZXIsIHJvdXRlclBhZ2VJZDogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuY2FuY2VsZWROYXZpZ2F0aW9uUmVzb2x1dGlvbiA9PT0gJ2NvbXB1dGVkJykge1xuICAgICAgcmV0dXJuIHtuYXZpZ2F0aW9uSWQsIMm1cm91dGVyUGFnZUlkOiByb3V0ZXJQYWdlSWR9O1xuICAgIH1cbiAgICByZXR1cm4ge25hdmlnYXRpb25JZH07XG4gIH1cbn1cbiJdfQ==