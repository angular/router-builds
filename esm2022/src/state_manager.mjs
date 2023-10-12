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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.0.0-next.8+sha-0792424", ngImport: i0, type: StateManager, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.0.0-next.8+sha-0792424", ngImport: i0, type: StateManager, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.0.0-next.8+sha-0792424", ngImport: i0, type: StateManager, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGVfbWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvc3RhdGVfbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDekMsT0FBTyxFQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFHakQsT0FBTyxFQUFDLG9CQUFvQixFQUFTLGdCQUFnQixFQUE4QixhQUFhLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBdUIsZ0JBQWdCLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFFOU0sT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDckQsT0FBTyxFQUFDLGdCQUFnQixFQUFjLE1BQU0sZ0JBQWdCLENBQUM7QUFDN0QsT0FBTyxFQUFDLG1CQUFtQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDNUQsT0FBTyxFQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUMsTUFBTSxZQUFZLENBQUM7O0FBS2xELE1BQU0sT0FBTyxZQUFZO0lBRHpCO1FBRW1CLGFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUIsa0JBQWEsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDdEMsWUFBTyxHQUFHLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMvRCxpQ0FBNEIsR0FDekMsSUFBSSxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsSUFBSSxTQUFTLENBQUM7UUFFM0QsK0ZBQStGO1FBQy9GLG9DQUFvQztRQUNwQyx3QkFBbUIsR0FBRyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNsRCxzQkFBaUIsR0FBRyxJQUFJ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QUMsRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge2luamVjdCwgSW5qZWN0YWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge1N1YnNjcmlwdGlvbkxpa2V9IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge0JlZm9yZUFjdGl2YXRlUm91dGVzLCBFdmVudCwgTmF2aWdhdGlvbkNhbmNlbCwgTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUsIE5hdmlnYXRpb25FbmQsIE5hdmlnYXRpb25FcnJvciwgTmF2aWdhdGlvblNraXBwZWQsIE5hdmlnYXRpb25TdGFydCwgUHJpdmF0ZVJvdXRlckV2ZW50cywgUm91dGVzUmVjb2duaXplZH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtpc0Jyb3dzZXJUcmlnZ2VyZWROYXZpZ2F0aW9uLCBOYXZpZ2F0aW9uLCBSZXN0b3JlZFN0YXRlfSBmcm9tICcuL25hdmlnYXRpb25fdHJhbnNpdGlvbic7XG5pbXBvcnQge1JPVVRFUl9DT05GSUdVUkFUSU9OfSBmcm9tICcuL3JvdXRlcl9jb25maWcnO1xuaW1wb3J0IHtjcmVhdGVFbXB0eVN0YXRlLCBSb3V0ZXJTdGF0ZX0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtVcmxIYW5kbGluZ1N0cmF0ZWd5fSBmcm9tICcuL3VybF9oYW5kbGluZ19zdHJhdGVneSc7XG5pbXBvcnQge1VybFNlcmlhbGl6ZXIsIFVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuXG5cblxuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgU3RhdGVNYW5hZ2VyIHtcbiAgcHJpdmF0ZSByZWFkb25seSBsb2NhdGlvbiA9IGluamVjdChMb2NhdGlvbik7XG4gIHByaXZhdGUgcmVhZG9ubHkgdXJsU2VyaWFsaXplciA9IGluamVjdChVcmxTZXJpYWxpemVyKTtcbiAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zID0gaW5qZWN0KFJPVVRFUl9DT05GSUdVUkFUSU9OLCB7b3B0aW9uYWw6IHRydWV9KSB8fCB7fTtcbiAgcHJpdmF0ZSByZWFkb25seSBjYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID1cbiAgICAgIHRoaXMub3B0aW9ucy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uIHx8ICdyZXBsYWNlJztcblxuICAvLyBUaGVzZSBhcmUgY3VycmVudGx5IHdyaXRhYmxlIHZpYSB0aGUgUm91dGVyIHB1YmxpYyBBUEkgYnV0IGFyZSBkZXByZWNhdGVkIGFuZCBzaG91bGQgYmUgbWFkZVxuICAvLyBgcHJpdmF0ZSByZWFkb25seWAgaW4gdGhlIGZ1dHVyZS5cbiAgdXJsSGFuZGxpbmdTdHJhdGVneSA9IGluamVjdChVcmxIYW5kbGluZ1N0cmF0ZWd5KTtcbiAgdXJsVXBkYXRlU3RyYXRlZ3kgPSB0aGlzLm9wdGlvbnMudXJsVXBkYXRlU3RyYXRlZ3kgfHwgJ2RlZmVycmVkJztcblxuICAvKipcbiAgICogUmVwcmVzZW50cyB0aGUgYWN0aXZhdGVkIGBVcmxUcmVlYCB0aGF0IHRoZSBgUm91dGVyYCBpcyBjb25maWd1cmVkIHRvIGhhbmRsZSAodGhyb3VnaFxuICAgKiBgVXJsSGFuZGxpbmdTdHJhdGVneWApLiBUaGF0IGlzLCBhZnRlciB3ZSBmaW5kIHRoZSByb3V0ZSBjb25maWcgdHJlZSB0aGF0IHdlJ3JlIGdvaW5nIHRvXG4gICAqIGFjdGl2YXRlLCBydW4gZ3VhcmRzLCBhbmQgYXJlIGp1c3QgYWJvdXQgdG8gYWN0aXZhdGUgdGhlIHJvdXRlLCB3ZSBzZXQgdGhlIGN1cnJlbnRVcmxUcmVlLlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGN1cnJlbnRVcmxUcmVlID0gbmV3IFVybFRyZWUoKTtcbiAgLyoqXG4gICAqIE1lYW50IHRvIHJlcHJlc2VudCB0aGUgZW50aXJlIGJyb3dzZXIgdXJsIGFmdGVyIGEgc3VjY2Vzc2Z1bCBuYXZpZ2F0aW9uLiBJbiB0aGUgbGlmZSBvZiBhXG4gICAqIG5hdmlnYXRpb24gdHJhbnNpdGlvbjpcbiAgICogMS4gVGhlIHJhd1VybCByZXByZXNlbnRzIHRoZSBmdWxsIFVSTCB0aGF0J3MgYmVpbmcgbmF2aWdhdGVkIHRvXG4gICAqIDIuIFdlIGFwcGx5IHJlZGlyZWN0cywgd2hpY2ggbWlnaHQgb25seSBhcHBseSB0byBfcGFydF8gb2YgdGhlIFVSTCAoZHVlIHRvXG4gICAqIGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCkuXG4gICAqIDMuIFJpZ2h0IGJlZm9yZSBhY3RpdmF0aW9uIChiZWNhdXNlIHdlIGFzc3VtZSBhY3RpdmF0aW9uIHdpbGwgc3VjY2VlZCksIHdlIHVwZGF0ZSB0aGVcbiAgICogcmF3VXJsVHJlZSB0byBiZSBhIGNvbWJpbmF0aW9uIG9mIHRoZSB1cmxBZnRlclJlZGlyZWN0cyAoYWdhaW4sIHRoaXMgbWlnaHQgb25seSBhcHBseSB0byBwYXJ0XG4gICAqIG9mIHRoZSBpbml0aWFsIHVybCkgYW5kIHRoZSByYXdVcmwgb2YgdGhlIHRyYW5zaXRpb24gKHdoaWNoIHdhcyB0aGUgb3JpZ2luYWwgbmF2aWdhdGlvbiB1cmwgaW5cbiAgICogaXRzIGZ1bGwgZm9ybSkuXG4gICAqIEBpbnRlcm5hbFxuICAgKlxuICAgKiBOb3RlIHRoYXQgdGhpcyBpcyBfb25seV8gaGVyZSB0byBzdXBwb3J0IGBVcmxIYW5kbGluZ1N0cmF0ZWd5LmV4dHJhY3RgIGFuZFxuICAgKiBgVXJsSGFuZGxpbmdTdHJhdGVneS5zaG91bGRQcm9jZXNzVXJsYC4gSWYgdGhvc2UgZGlkbid0IGV4aXN0LCB3ZSBjb3VsZCBnZXQgYnkgd2l0aFxuICAgKiBgY3VycmVudFVybFRyZWVgIGFsb25lLiBJZiBhIG5ldyBSb3V0ZXIgd2VyZSB0byBiZSBwcm92aWRlZCAoaS5lLiBvbmUgdGhhdCB3b3JrcyB3aXRoIHRoZVxuICAgKiBicm93c2VyIG5hdmlnYXRpb24gQVBJKSwgd2Ugc2hvdWxkIHRoaW5rIGFib3V0IHdoZXRoZXIgdGhpcyBjb21wbGV4aXR5IHNob3VsZCBiZSBjYXJyaWVkIG92ZXIuXG4gICAqXG4gICAqIC0gZXh0cmFjdDogYHJhd1VybFRyZWVgIGlzIG5lZWRlZCBiZWNhdXNlIGBleHRyYWN0YCBtYXkgb25seSByZXR1cm4gcGFydFxuICAgKiBvZiB0aGUgbmF2aWdhdGlvbiBVUkwuIFRodXMsIGBjdXJyZW50VXJsVHJlZWAgbWF5IG9ubHkgcmVwcmVzZW50IF9wYXJ0XyBvZiB0aGUgYnJvd3NlciBVUkwuXG4gICAqIFdoZW4gYSBuYXZpZ2F0aW9uIGdldHMgY2FuY2VsbGVkIGFuZCB3ZSBuZWVkIHRvIHJlc2V0IHRoZSBVUkwgb3IgYSBuZXcgbmF2aWdhdGlvbiBvY2N1cnMsIHdlXG4gICAqIG5lZWQgdG8ga25vdyB0aGUgX3dob2xlXyBicm93c2VyIFVSTCwgbm90IGp1c3QgdGhlIHBhcnQgaGFuZGxlZCBieSBVcmxIYW5kbGluZ1N0cmF0ZWd5LlxuICAgKiAtIHNob3VsZFByb2Nlc3NVcmw6IFdoZW4gdGhpcyByZXR1cm5zIGBmYWxzZWAsIHRoZSByb3V0ZXIganVzdCBpZ25vcmVzIHRoZSBuYXZpZ2F0aW9uIGJ1dCBzdGlsbFxuICAgKiB1cGRhdGVzIHRoZSBgcmF3VXJsVHJlZWAgd2l0aCB0aGUgYXNzdW1wdGlvbiB0aGF0IHRoZSBuYXZpZ2F0aW9uIHdhcyBjYXVzZWQgYnkgdGhlIGxvY2F0aW9uXG4gICAqIGNoYW5nZSBsaXN0ZW5lciBkdWUgdG8gYSBVUkwgdXBkYXRlIGJ5IHRoZSBBbmd1bGFySlMgcm91dGVyLiBJbiB0aGlzIGNhc2UsIHdlIHN0aWxsIG5lZWQgdG9cbiAgICoga25vdyB3aGF0IHRoZSBicm93c2VyJ3MgVVJMIGlzIGZvciBmdXR1cmUgbmF2aWdhdGlvbnMuXG4gICAqXG4gICAqL1xuICByYXdVcmxUcmVlID0gdGhpcy5jdXJyZW50VXJsVHJlZTtcbiAgLyoqXG4gICAqIFRoZSBpZCBvZiB0aGUgY3VycmVudGx5IGFjdGl2ZSBwYWdlIGluIHRoZSByb3V0ZXIuXG4gICAqIFVwZGF0ZWQgdG8gdGhlIHRyYW5zaXRpb24ncyB0YXJnZXQgaWQgb24gYSBzdWNjZXNzZnVsIG5hdmlnYXRpb24uXG4gICAqXG4gICAqIFRoaXMgaXMgdXNlZCB0byB0cmFjayB3aGF0IHBhZ2UgdGhlIHJvdXRlciBsYXN0IGFjdGl2YXRlZC4gV2hlbiBhbiBhdHRlbXB0ZWQgbmF2aWdhdGlvbiBmYWlscyxcbiAgICogdGhlIHJvdXRlciBjYW4gdGhlbiB1c2UgdGhpcyB0byBjb21wdXRlIGhvdyB0byByZXN0b3JlIHRoZSBzdGF0ZSBiYWNrIHRvIHRoZSBwcmV2aW91c2x5IGFjdGl2ZVxuICAgKiBwYWdlLlxuICAgKi9cbiAgcHJpdmF0ZSBjdXJyZW50UGFnZUlkOiBudW1iZXIgPSAwO1xuICBsYXN0U3VjY2Vzc2Z1bElkOiBudW1iZXIgPSAtMTtcblxuICAvKiogUmV0dXJucyB0aGUgY3VycmVudCBzdGF0ZSBmcm9tIHRoZSBicm93c2VyLiAqL1xuICByZXN0b3JlZFN0YXRlKCk6IFJlc3RvcmVkU3RhdGV8bnVsbHx1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmxvY2F0aW9uLmdldFN0YXRlKCkgYXMgUmVzdG9yZWRTdGF0ZSB8IG51bGwgfCB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogVGhlIMm1cm91dGVyUGFnZUlkIG9mIHdoYXRldmVyIHBhZ2UgaXMgY3VycmVudGx5IGFjdGl2ZSBpbiB0aGUgYnJvd3NlciBoaXN0b3J5LiBUaGlzIGlzXG4gICAqIGltcG9ydGFudCBmb3IgY29tcHV0aW5nIHRoZSB0YXJnZXQgcGFnZSBpZCBmb3IgbmV3IG5hdmlnYXRpb25zIGJlY2F1c2Ugd2UgbmVlZCB0byBlbnN1cmUgZWFjaFxuICAgKiBwYWdlIGlkIGluIHRoZSBicm93c2VyIGhpc3RvcnkgaXMgMSBtb3JlIHRoYW4gdGhlIHByZXZpb3VzIGVudHJ5LlxuICAgKi9cbiAgcHJpdmF0ZSBnZXQgYnJvd3NlclBhZ2VJZCgpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gIT09ICdjb21wdXRlZCcpIHtcbiAgICAgIHJldHVybiB0aGlzLmN1cnJlbnRQYWdlSWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlc3RvcmVkU3RhdGUoKT8uybVyb3V0ZXJQYWdlSWQgPz8gdGhpcy5jdXJyZW50UGFnZUlkO1xuICB9XG5cbiAgcm91dGVyU3RhdGUgPSBjcmVhdGVFbXB0eVN0YXRlKHRoaXMuY3VycmVudFVybFRyZWUsIG51bGwpO1xuICBwcml2YXRlIHN0YXRlTWVtZW50byA9IHRoaXMuY3JlYXRlU3RhdGVNZW1lbnRvKCk7XG5cbiAgcHJpdmF0ZSBjcmVhdGVTdGF0ZU1lbWVudG8oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJhd1VybFRyZWU6IHRoaXMucmF3VXJsVHJlZSxcbiAgICAgIGN1cnJlbnRVcmxUcmVlOiB0aGlzLmN1cnJlbnRVcmxUcmVlLFxuICAgICAgcm91dGVyU3RhdGU6IHRoaXMucm91dGVyU3RhdGUsXG4gICAgfTtcbiAgfVxuXG4gIG5vblJvdXRlckN1cnJlbnRFbnRyeUNoYW5nZShsaXN0ZW5lcjogKHVybDogc3RyaW5nLCBzdGF0ZTogUmVzdG9yZWRTdGF0ZXxudWxsfHVuZGVmaW5lZCkgPT4gdm9pZCk6XG4gICAgICBTdWJzY3JpcHRpb25MaWtlIHtcbiAgICByZXR1cm4gdGhpcy5sb2NhdGlvbi5zdWJzY3JpYmUoZXZlbnQgPT4ge1xuICAgICAgaWYgKGV2ZW50Wyd0eXBlJ10gPT09ICdwb3BzdGF0ZScpIHtcbiAgICAgICAgbGlzdGVuZXIoZXZlbnRbJ3VybCddISwgZXZlbnQuc3RhdGUgYXMgUmVzdG9yZWRTdGF0ZSB8IG51bGwgfCB1bmRlZmluZWQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgaGFuZGxlTmF2aWdhdGlvbkV2ZW50KGU6IEV2ZW50fFByaXZhdGVSb3V0ZXJFdmVudHMsIGN1cnJlbnRUcmFuc2l0aW9uOiBOYXZpZ2F0aW9uKSB7XG4gICAgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uU3RhcnQpIHtcbiAgICAgIHRoaXMuc3RhdGVNZW1lbnRvID0gdGhpcy5jcmVhdGVTdGF0ZU1lbWVudG8oKTtcbiAgICB9IGVsc2UgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uU2tpcHBlZCkge1xuICAgICAgdGhpcy5yYXdVcmxUcmVlID0gY3VycmVudFRyYW5zaXRpb24uaW5pdGlhbFVybDtcbiAgICB9IGVsc2UgaWYgKGUgaW5zdGFuY2VvZiBSb3V0ZXNSZWNvZ25pemVkKSB7XG4gICAgICBpZiAodGhpcy51cmxVcGRhdGVTdHJhdGVneSA9PT0gJ2VhZ2VyJykge1xuICAgICAgICBpZiAoIWN1cnJlbnRUcmFuc2l0aW9uLmV4dHJhcy5za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgICBjb25zdCByYXdVcmwgPSB0aGlzLnVybEhhbmRsaW5nU3RyYXRlZ3kubWVyZ2UoXG4gICAgICAgICAgICAgIGN1cnJlbnRUcmFuc2l0aW9uLmZpbmFsVXJsISwgY3VycmVudFRyYW5zaXRpb24uaW5pdGlhbFVybCk7XG4gICAgICAgICAgdGhpcy5zZXRCcm93c2VyVXJsKHJhd1VybCwgY3VycmVudFRyYW5zaXRpb24pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgQmVmb3JlQWN0aXZhdGVSb3V0ZXMpIHtcbiAgICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSBjdXJyZW50VHJhbnNpdGlvbi5maW5hbFVybCE7XG4gICAgICB0aGlzLnJhd1VybFRyZWUgPVxuICAgICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZShjdXJyZW50VHJhbnNpdGlvbi5maW5hbFVybCEsIGN1cnJlbnRUcmFuc2l0aW9uLmluaXRpYWxVcmwpO1xuICAgICAgdGhpcy5yb3V0ZXJTdGF0ZSA9IGN1cnJlbnRUcmFuc2l0aW9uLnRhcmdldFJvdXRlclN0YXRlITtcbiAgICAgIGlmICh0aGlzLnVybFVwZGF0ZVN0cmF0ZWd5ID09PSAnZGVmZXJyZWQnKSB7XG4gICAgICAgIGlmICghY3VycmVudFRyYW5zaXRpb24uZXh0cmFzLnNraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICAgIHRoaXMuc2V0QnJvd3NlclVybCh0aGlzLnJhd1VybFRyZWUsIGN1cnJlbnRUcmFuc2l0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uQ2FuY2VsICYmXG4gICAgICAgIChlLmNvZGUgPT09IE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLkd1YXJkUmVqZWN0ZWQgfHxcbiAgICAgICAgIGUuY29kZSA9PT0gTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuTm9EYXRhRnJvbVJlc29sdmVyKSkge1xuICAgICAgdGhpcy5yZXN0b3JlSGlzdG9yeShjdXJyZW50VHJhbnNpdGlvbik7XG4gICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVycm9yKSB7XG4gICAgICB0aGlzLnJlc3RvcmVIaXN0b3J5KGN1cnJlbnRUcmFuc2l0aW9uLCB0cnVlKTtcbiAgICB9IGVsc2UgaWYgKGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSB7XG4gICAgICB0aGlzLmxhc3RTdWNjZXNzZnVsSWQgPSBlLmlkO1xuICAgICAgdGhpcy5jdXJyZW50UGFnZUlkID0gdGhpcy5icm93c2VyUGFnZUlkO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc2V0QnJvd3NlclVybCh1cmw6IFVybFRyZWUsIHRyYW5zaXRpb246IE5hdmlnYXRpb24pIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh1cmwpO1xuICAgIGlmICh0aGlzLmxvY2F0aW9uLmlzQ3VycmVudFBhdGhFcXVhbFRvKHBhdGgpIHx8ICEhdHJhbnNpdGlvbi5leHRyYXMucmVwbGFjZVVybCkge1xuICAgICAgLy8gcmVwbGFjZW1lbnRzIGRvIG5vdCB1cGRhdGUgdGhlIHRhcmdldCBwYWdlXG4gICAgICBjb25zdCBjdXJyZW50QnJvd3NlclBhZ2VJZCA9IHRoaXMuYnJvd3NlclBhZ2VJZDtcbiAgICAgIGNvbnN0IHN0YXRlID0ge1xuICAgICAgICAuLi50cmFuc2l0aW9uLmV4dHJhcy5zdGF0ZSxcbiAgICAgICAgLi4udGhpcy5nZW5lcmF0ZU5nUm91dGVyU3RhdGUodHJhbnNpdGlvbi5pZCwgY3VycmVudEJyb3dzZXJQYWdlSWQpXG4gICAgICB9O1xuICAgICAgdGhpcy5sb2NhdGlvbi5yZXBsYWNlU3RhdGUocGF0aCwgJycsIHN0YXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc3RhdGUgPSB7XG4gICAgICAgIC4uLnRyYW5zaXRpb24uZXh0cmFzLnN0YXRlLFxuICAgICAgICAuLi50aGlzLmdlbmVyYXRlTmdSb3V0ZXJTdGF0ZSh0cmFuc2l0aW9uLmlkLCB0aGlzLmJyb3dzZXJQYWdlSWQgKyAxKVxuICAgICAgfTtcbiAgICAgIHRoaXMubG9jYXRpb24uZ28ocGF0aCwgJycsIHN0YXRlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybXMgdGhlIG5lY2Vzc2FyeSByb2xsYmFjayBhY3Rpb24gdG8gcmVzdG9yZSB0aGUgYnJvd3NlciBVUkwgdG8gdGhlXG4gICAqIHN0YXRlIGJlZm9yZSB0aGUgdHJhbnNpdGlvbi5cbiAgICogQGludGVybmFsXG4gICAqL1xuICByZXN0b3JlSGlzdG9yeShuYXZpZ2F0aW9uOiBOYXZpZ2F0aW9uLCByZXN0b3JpbmdGcm9tQ2F1Z2h0RXJyb3IgPSBmYWxzZSkge1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdjb21wdXRlZCcpIHtcbiAgICAgIGNvbnN0IGN1cnJlbnRCcm93c2VyUGFnZUlkID0gdGhpcy5icm93c2VyUGFnZUlkO1xuICAgICAgY29uc3QgdGFyZ2V0UGFnZVBvc2l0aW9uID0gdGhpcy5jdXJyZW50UGFnZUlkIC0gY3VycmVudEJyb3dzZXJQYWdlSWQ7XG4gICAgICBpZiAodGFyZ2V0UGFnZVBvc2l0aW9uICE9PSAwKSB7XG4gICAgICAgIHRoaXMubG9jYXRpb24uaGlzdG9yeUdvKHRhcmdldFBhZ2VQb3NpdGlvbik7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuY3VycmVudFVybFRyZWUgPT09IG5hdmlnYXRpb24uZmluYWxVcmwgJiYgdGFyZ2V0UGFnZVBvc2l0aW9uID09PSAwKSB7XG4gICAgICAgIC8vIFdlIGdvdCB0byB0aGUgYWN0aXZhdGlvbiBzdGFnZSAod2hlcmUgY3VycmVudFVybFRyZWUgaXMgc2V0IHRvIHRoZSBuYXZpZ2F0aW9uJ3NcbiAgICAgICAgLy8gZmluYWxVcmwpLCBidXQgd2Ugd2VyZW4ndCBtb3ZpbmcgYW55d2hlcmUgaW4gaGlzdG9yeSAoc2tpcExvY2F0aW9uQ2hhbmdlIG9yIHJlcGxhY2VVcmwpLlxuICAgICAgICAvLyBXZSBzdGlsbCBuZWVkIHRvIHJlc2V0IHRoZSByb3V0ZXIgc3RhdGUgYmFjayB0byB3aGF0IGl0IHdhcyB3aGVuIHRoZSBuYXZpZ2F0aW9uIHN0YXJ0ZWQuXG4gICAgICAgIHRoaXMucmVzZXRTdGF0ZShuYXZpZ2F0aW9uKTtcbiAgICAgICAgdGhpcy5yZXNldFVybFRvQ3VycmVudFVybFRyZWUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoZSBicm93c2VyIFVSTCBhbmQgcm91dGVyIHN0YXRlIHdhcyBub3QgdXBkYXRlZCBiZWZvcmUgdGhlIG5hdmlnYXRpb24gY2FuY2VsbGVkIHNvXG4gICAgICAgIC8vIHRoZXJlJ3Mgbm8gcmVzdG9yYXRpb24gbmVlZGVkLlxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy5jYW5jZWxlZE5hdmlnYXRpb25SZXNvbHV0aW9uID09PSAncmVwbGFjZScpIHtcbiAgICAgIC8vIFRPRE8oYXRzY290dCk6IEl0IHNlZW1zIGxpa2Ugd2Ugc2hvdWxkIF9hbHdheXNfIHJlc2V0IHRoZSBzdGF0ZSBoZXJlLiBJdCB3b3VsZCBiZSBhIG5vLW9wXG4gICAgICAvLyBmb3IgYGRlZmVycmVkYCBuYXZpZ2F0aW9ucyB0aGF0IGhhdmVuJ3QgY2hhbmdlIHRoZSBpbnRlcm5hbCBzdGF0ZSB5ZXQgYmVjYXVzZSBndWFyZHNcbiAgICAgIC8vIHJlamVjdC4gRm9yICdlYWdlcicgbmF2aWdhdGlvbnMsIGl0IHNlZW1zIGxpa2Ugd2UgYWxzbyByZWFsbHkgc2hvdWxkIHJlc2V0IHRoZSBzdGF0ZVxuICAgICAgLy8gYmVjYXVzZSB0aGUgbmF2aWdhdGlvbiB3YXMgY2FuY2VsbGVkLiBJbnZlc3RpZ2F0ZSBpZiB0aGlzIGNhbiBiZSBkb25lIGJ5IHJ1bm5pbmcgVEdQLlxuICAgICAgaWYgKHJlc3RvcmluZ0Zyb21DYXVnaHRFcnJvcikge1xuICAgICAgICB0aGlzLnJlc2V0U3RhdGUobmF2aWdhdGlvbik7XG4gICAgICB9XG4gICAgICB0aGlzLnJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRTdGF0ZShuYXZpZ2F0aW9uOiBOYXZpZ2F0aW9uKTogdm9pZCB7XG4gICAgdGhpcy5yb3V0ZXJTdGF0ZSA9IHRoaXMuc3RhdGVNZW1lbnRvLnJvdXRlclN0YXRlO1xuICAgIHRoaXMuY3VycmVudFVybFRyZWUgPSB0aGlzLnN0YXRlTWVtZW50by5jdXJyZW50VXJsVHJlZTtcbiAgICAvLyBOb3RlIGhlcmUgdGhhdCB3ZSB1c2UgdGhlIHVybEhhbmRsaW5nU3RyYXRlZ3kgdG8gZ2V0IHRoZSByZXNldCBgcmF3VXJsVHJlZWAgYmVjYXVzZSBpdCBtYXkgYmVcbiAgICAvLyBjb25maWd1cmVkIHRvIGhhbmRsZSBvbmx5IHBhcnQgb2YgdGhlIG5hdmlnYXRpb24gVVJMLiBUaGlzIG1lYW5zIHdlIHdvdWxkIG9ubHkgd2FudCB0byByZXNldFxuICAgIC8vIHRoZSBwYXJ0IG9mIHRoZSBuYXZpZ2F0aW9uIGhhbmRsZWQgYnkgdGhlIEFuZ3VsYXIgcm91dGVyIHJhdGhlciB0aGFuIHRoZSB3aG9sZSBVUkwuIEluXG4gICAgLy8gYWRkaXRpb24sIHRoZSBVUkxIYW5kbGluZ1N0cmF0ZWd5IG1heSBiZSBjb25maWd1cmVkIHRvIHNwZWNpZmljYWxseSBwcmVzZXJ2ZSBwYXJ0cyBvZiB0aGUgVVJMXG4gICAgLy8gd2hlbiBtZXJnaW5nLCBzdWNoIGFzIHRoZSBxdWVyeSBwYXJhbXMgc28gdGhleSBhcmUgbm90IGxvc3Qgb24gYSByZWZyZXNoLlxuICAgIHRoaXMucmF3VXJsVHJlZSA9XG4gICAgICAgIHRoaXMudXJsSGFuZGxpbmdTdHJhdGVneS5tZXJnZSh0aGlzLmN1cnJlbnRVcmxUcmVlLCBuYXZpZ2F0aW9uLmZpbmFsVXJsID8/IHRoaXMucmF3VXJsVHJlZSk7XG4gIH1cblxuICBwcml2YXRlIHJlc2V0VXJsVG9DdXJyZW50VXJsVHJlZSgpOiB2b2lkIHtcbiAgICB0aGlzLmxvY2F0aW9uLnJlcGxhY2VTdGF0ZShcbiAgICAgICAgdGhpcy51cmxTZXJpYWxpemVyLnNlcmlhbGl6ZSh0aGlzLnJhd1VybFRyZWUpLCAnJyxcbiAgICAgICAgdGhpcy5nZW5lcmF0ZU5nUm91dGVyU3RhdGUodGhpcy5sYXN0U3VjY2Vzc2Z1bElkLCB0aGlzLmN1cnJlbnRQYWdlSWQpKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2VuZXJhdGVOZ1JvdXRlclN0YXRlKG5hdmlnYXRpb25JZDogbnVtYmVyLCByb3V0ZXJQYWdlSWQ6IG51bWJlcikge1xuICAgIGlmICh0aGlzLmNhbmNlbGVkTmF2aWdhdGlvblJlc29sdXRpb24gPT09ICdjb21wdXRlZCcpIHtcbiAgICAgIHJldHVybiB7bmF2aWdhdGlvbklkLCDJtXJvdXRlclBhZ2VJZDogcm91dGVyUGFnZUlkfTtcbiAgICB9XG4gICAgcmV0dXJuIHtuYXZpZ2F0aW9uSWR9O1xuICB9XG59XG4iXX0=