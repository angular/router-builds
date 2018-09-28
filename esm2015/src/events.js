/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** @typedef {?} */
var NavigationTrigger;
export { NavigationTrigger };
/**
 * \@description
 *
 * Base for events the Router goes through, as opposed to events tied to a specific
 * Route. `RouterEvent`s will only be fired one time for any given navigation.
 *
 * Example:
 *
 * ```
 * class MyService {
 *   constructor(public router: Router, logger: Logger) {
 *     router.events.filter(e => e instanceof RouterEvent).subscribe(e => {
 *       logger.log(e.id, e.url);
 *     });
 *   }
 * }
 * ```
 *
 * \@experimental
 */
export class RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     */
    constructor(id, url) {
        this.id = id;
        this.url = url;
    }
}
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    RouterEvent.prototype.id;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    RouterEvent.prototype.url;
}
/**
 * \@description
 *
 * Represents an event triggered when a navigation starts.
 *
 *
 */
export class NavigationStart extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?=} navigationTrigger
     * @param {?=} restoredState
     */
    constructor(/** @docsNotRequired */
    id, /** @docsNotRequired */
    url, /** @docsNotRequired */
    navigationTrigger = 'imperative', /** @docsNotRequired */
    restoredState = null) {
        super(id, url);
        this.navigationTrigger = navigationTrigger;
        this.restoredState = restoredState;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    toString() { return `NavigationStart(id: ${this.id}, url: '${this.url}')`; }
}
if (false) {
    /**
     * Identifies the trigger of the navigation.
     *
     * * 'imperative'--triggered by `router.navigateByUrl` or `router.navigate`.
     * * 'popstate'--triggered by a popstate event
     * * 'hashchange'--triggered by a hashchange event
     * @type {?}
     */
    NavigationStart.prototype.navigationTrigger;
    /**
     * This contains the navigation id that pushed the history record that the router navigates
     * back to. This is not null only when the navigation is triggered by a popstate event.
     *
     * The router assigns a navigationId to every router transition/navigation. Even when the user
     * clicks on the back button in the browser, a new navigation id will be created. So from
     * the perspective of the router, the router never "goes back". By using the `restoredState`
     * and its navigationId, you can implement behavior that differentiates between creating new
     * states
     * and popstate events. In the latter case you can restore some remembered state (e.g., scroll
     * position).
     * @type {?}
     */
    NavigationStart.prototype.restoredState;
}
/**
 * \@description
 *
 * Represents an event triggered when a navigation ends successfully.
 *
 *
 */
export class NavigationEnd extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     */
    constructor(/** @docsNotRequired */
    id, /** @docsNotRequired */
    url, urlAfterRedirects) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    toString() {
        return `NavigationEnd(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}')`;
    }
}
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationEnd.prototype.urlAfterRedirects;
}
/**
 * \@description
 *
 * Represents an event triggered when a navigation is canceled.
 *
 *
 */
export class NavigationCancel extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} reason
     */
    constructor(/** @docsNotRequired */
    id, /** @docsNotRequired */
    url, reason) {
        super(id, url);
        this.reason = reason;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    toString() { return `NavigationCancel(id: ${this.id}, url: '${this.url}')`; }
}
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationCancel.prototype.reason;
}
/**
 * \@description
 *
 * Represents an event triggered when a navigation fails due to an unexpected error.
 *
 *
 */
export class NavigationError extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} error
     */
    constructor(/** @docsNotRequired */
    id, /** @docsNotRequired */
    url, error) {
        super(id, url);
        this.error = error;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    toString() {
        return `NavigationError(id: ${this.id}, url: '${this.url}', error: ${this.error})`;
    }
}
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationError.prototype.error;
}
/**
 * \@description
 *
 * Represents an event triggered when routes are recognized.
 *
 *
 */
export class RoutesRecognized extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     * @param {?} state
     */
    constructor(/** @docsNotRequired */
    id, /** @docsNotRequired */
    url, urlAfterRedirects, state) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
        this.state = state;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    toString() {
        return `RoutesRecognized(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`;
    }
}
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    RoutesRecognized.prototype.urlAfterRedirects;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    RoutesRecognized.prototype.state;
}
/**
 * \@description
 *
 * Represents the start of the Guard phase of routing.
 *
 * \@experimental
 */
export class GuardsCheckStart extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     * @param {?} state
     */
    constructor(/** @docsNotRequired */
    id, /** @docsNotRequired */
    url, urlAfterRedirects, state) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
        this.state = state;
    }
    /**
     * @return {?}
     */
    toString() {
        return `GuardsCheckStart(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`;
    }
}
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    GuardsCheckStart.prototype.urlAfterRedirects;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    GuardsCheckStart.prototype.state;
}
/**
 * \@description
 *
 * Represents the end of the Guard phase of routing.
 *
 * \@experimental
 */
export class GuardsCheckEnd extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     * @param {?} state
     * @param {?} shouldActivate
     */
    constructor(/** @docsNotRequired */
    id, /** @docsNotRequired */
    url, urlAfterRedirects, state, shouldActivate) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
        this.state = state;
        this.shouldActivate = shouldActivate;
    }
    /**
     * @return {?}
     */
    toString() {
        return `GuardsCheckEnd(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state}, shouldActivate: ${this.shouldActivate})`;
    }
}
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    GuardsCheckEnd.prototype.urlAfterRedirects;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    GuardsCheckEnd.prototype.state;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    GuardsCheckEnd.prototype.shouldActivate;
}
/**
 * \@description
 *
 * Represents the start of the Resolve phase of routing. The timing of this
 * event may change, thus it's experimental. In the current iteration it will run
 * in the "resolve" phase whether there's things to resolve or not. In the future this
 * behavior may change to only run when there are things to be resolved.
 *
 * \@experimental
 */
export class ResolveStart extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     * @param {?} state
     */
    constructor(/** @docsNotRequired */
    id, /** @docsNotRequired */
    url, urlAfterRedirects, state) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
        this.state = state;
    }
    /**
     * @return {?}
     */
    toString() {
        return `ResolveStart(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`;
    }
}
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    ResolveStart.prototype.urlAfterRedirects;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    ResolveStart.prototype.state;
}
/**
 * \@description
 *
 * Represents the end of the Resolve phase of routing. See note on
 * `ResolveStart` for use of this experimental API.
 *
 * \@experimental
 */
export class ResolveEnd extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     * @param {?} state
     */
    constructor(/** @docsNotRequired */
    id, /** @docsNotRequired */
    url, urlAfterRedirects, state) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
        this.state = state;
    }
    /**
     * @return {?}
     */
    toString() {
        return `ResolveEnd(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`;
    }
}
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    ResolveEnd.prototype.urlAfterRedirects;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    ResolveEnd.prototype.state;
}
/**
 * \@description
 *
 * Represents an event triggered before lazy loading a route config.
 *
 * \@experimental
 */
export class RouteConfigLoadStart {
    /**
     * @param {?} route
     */
    constructor(route) {
        this.route = route;
    }
    /**
     * @return {?}
     */
    toString() { return `RouteConfigLoadStart(path: ${this.route.path})`; }
}
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    RouteConfigLoadStart.prototype.route;
}
/**
 * \@description
 *
 * Represents an event triggered when a route has been lazy loaded.
 *
 * \@experimental
 */
export class RouteConfigLoadEnd {
    /**
     * @param {?} route
     */
    constructor(route) {
        this.route = route;
    }
    /**
     * @return {?}
     */
    toString() { return `RouteConfigLoadEnd(path: ${this.route.path})`; }
}
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    RouteConfigLoadEnd.prototype.route;
}
/**
 * \@description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ChildActivationEnd` for use of this experimental API.
 *
 * \@experimental
 */
export class ChildActivationStart {
    /**
     * @param {?} snapshot
     */
    constructor(snapshot) {
        this.snapshot = snapshot;
    }
    /**
     * @return {?}
     */
    toString() {
        /** @type {?} */
        const path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return `ChildActivationStart(path: '${path}')`;
    }
}
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    ChildActivationStart.prototype.snapshot;
}
/**
 * \@description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ChildActivationStart` for use of this experimental API.
 *
 * \@experimental
 */
export class ChildActivationEnd {
    /**
     * @param {?} snapshot
     */
    constructor(snapshot) {
        this.snapshot = snapshot;
    }
    /**
     * @return {?}
     */
    toString() {
        /** @type {?} */
        const path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return `ChildActivationEnd(path: '${path}')`;
    }
}
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    ChildActivationEnd.prototype.snapshot;
}
/**
 * \@description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ActivationEnd` for use of this experimental API.
 *
 * \@experimental
 */
export class ActivationStart {
    /**
     * @param {?} snapshot
     */
    constructor(snapshot) {
        this.snapshot = snapshot;
    }
    /**
     * @return {?}
     */
    toString() {
        /** @type {?} */
        const path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return `ActivationStart(path: '${path}')`;
    }
}
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    ActivationStart.prototype.snapshot;
}
/**
 * \@description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ActivationStart` for use of this experimental API.
 *
 * \@experimental
 */
export class ActivationEnd {
    /**
     * @param {?} snapshot
     */
    constructor(snapshot) {
        this.snapshot = snapshot;
    }
    /**
     * @return {?}
     */
    toString() {
        /** @type {?} */
        const path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return `ActivationEnd(path: '${path}')`;
    }
}
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    ActivationEnd.prototype.snapshot;
}
/**
 * \@description
 *
 * Represents a scrolling event.
 */
export class Scroll {
    /**
     * @param {?} routerEvent
     * @param {?} position
     * @param {?} anchor
     */
    constructor(/** @docsNotRequired */
    routerEvent, /** @docsNotRequired */
    position, /** @docsNotRequired */
    anchor) {
        this.routerEvent = routerEvent;
        this.position = position;
        this.anchor = anchor;
    }
    /**
     * @return {?}
     */
    toString() {
        /** @type {?} */
        const pos = this.position ? `${this.position[0]}, ${this.position[1]}` : null;
        return `Scroll(anchor: '${this.anchor}', position: '${pos}')`;
    }
}
if (false) {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    Scroll.prototype.routerEvent;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    Scroll.prototype.position;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    Scroll.prototype.anchor;
}
/** @typedef {?} */
var Event;
export { Event };

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9ldmVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTRDQSxNQUFNLE9BQU8sV0FBVzs7Ozs7SUFDdEIsWUFFVyxJQUVBO1FBRkEsT0FBRSxHQUFGLEVBQUU7UUFFRixRQUFHLEdBQUgsR0FBRztLQUFZO0NBQzNCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQVNELE1BQU0sT0FBTyxlQUFnQixTQUFRLFdBQVc7Ozs7Ozs7SUF3QjlDO0lBRUksRUFBVTtJQUVWLEdBQVc7SUFFWCxvQkFBMEQsWUFBWTtJQUV0RSxnQkFBNkMsSUFBSTtRQUNuRCxLQUFLLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDO1FBQzNDLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO0tBQ3BDOzs7OztJQUdELFFBQVEsS0FBYSxPQUFPLHVCQUF1QixJQUFJLENBQUMsRUFBRSxXQUFXLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFO0NBQ3JGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFTRCxNQUFNLE9BQU8sYUFBYyxTQUFRLFdBQVc7Ozs7OztJQUM1QztJQUVJLEVBQVU7SUFFVixHQUFXLEVBRUo7UUFDVCxLQUFLLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRE4sc0JBQWlCLEdBQWpCLGlCQUFpQjtLQUUzQjs7Ozs7SUFHRCxRQUFRO1FBQ04sT0FBTyxxQkFBcUIsSUFBSSxDQUFDLEVBQUUsV0FBVyxJQUFJLENBQUMsR0FBRywwQkFBMEIsSUFBSSxDQUFDLGlCQUFpQixJQUFJLENBQUM7S0FDNUc7Q0FDRjs7Ozs7Ozs7Ozs7Ozs7O0FBU0QsTUFBTSxPQUFPLGdCQUFp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Q0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQzlFLE9BQU8sbUJBQW1CLElBQUksQ0FBQyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQztLQUMvRDtDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1JvdXRlfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIFJvdXRlclN0YXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBJZGVudGlmaWVzIHRoZSB0cmlnZ2VyIG9mIHRoZSBuYXZpZ2F0aW9uLlxuICpcbiAqICogJ2ltcGVyYXRpdmUnLS10cmlnZ2VyZWQgYnkgYHJvdXRlci5uYXZpZ2F0ZUJ5VXJsYCBvciBgcm91dGVyLm5hdmlnYXRlYC5cbiAqICogJ3BvcHN0YXRlJy0tdHJpZ2dlcmVkIGJ5IGEgcG9wc3RhdGUgZXZlbnRcbiAqICogJ2hhc2hjaGFuZ2UnLS10cmlnZ2VyZWQgYnkgYSBoYXNoY2hhbmdlIGV2ZW50XG4gKlxuICogQGV4cGVyaW1lbnRhbFxuICovXG5leHBvcnQgdHlwZSBOYXZpZ2F0aW9uVHJpZ2dlciA9ICdpbXBlcmF0aXZlJyB8ICdwb3BzdGF0ZScgfCAnaGFzaGNoYW5nZSc7XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQmFzZSBmb3IgZXZlbnRzIHRoZSBSb3V0ZXIgZ29lcyB0aHJvdWdoLCBhcyBvcHBvc2VkIHRvIGV2ZW50cyB0aWVkIHRvIGEgc3BlY2lmaWNcbiAqIFJvdXRlLiBgUm91dGVyRXZlbnRgcyB3aWxsIG9ubHkgYmUgZmlyZWQgb25lIHRpbWUgZm9yIGFueSBnaXZlbiBuYXZpZ2F0aW9uLlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiBjbGFzcyBNeVNlcnZpY2Uge1xuICogICBjb25zdHJ1Y3RvcihwdWJsaWMgcm91dGVyOiBSb3V0ZXIsIGxvZ2dlcjogTG9nZ2VyKSB7XG4gKiAgICAgcm91dGVyLmV2ZW50cy5maWx0ZXIoZSA9PiBlIGluc3RhbmNlb2YgUm91dGVyRXZlbnQpLnN1YnNjcmliZShlID0+IHtcbiAqICAgICAgIGxvZ2dlci5sb2coZS5pZCwgZS51cmwpO1xuICogICAgIH0pO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBAZXhwZXJpbWVudGFsXG4gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZXJFdmVudCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBpZDogbnVtYmVyLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyB1cmw6IHN0cmluZykge31cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIGFuIGV2ZW50IHRyaWdnZXJlZCB3aGVuIGEgbmF2aWdhdGlvbiBzdGFydHMuXG4gKlxuICpcbiAqL1xuZXhwb3J0IGNsYXNzIE5hdmlnYXRpb25TdGFydCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgLyoqXG4gICAqIElkZW50aWZpZXMgdGhlIHRyaWdnZXIgb2YgdGhlIG5hdmlnYXRpb24uXG4gICAqXG4gICAqICogJ2ltcGVyYXRpdmUnLS10cmlnZ2VyZWQgYnkgYHJvdXRlci5uYXZpZ2F0ZUJ5VXJsYCBvciBgcm91dGVyLm5hdmlnYXRlYC5cbiAgICogKiAncG9wc3RhdGUnLS10cmlnZ2VyZWQgYnkgYSBwb3BzdGF0ZSBldmVudFxuICAgKiAqICdoYXNoY2hhbmdlJy0tdHJpZ2dlcmVkIGJ5IGEgaGFzaGNoYW5nZSBldmVudFxuICAgKi9cbiAgbmF2aWdhdGlvblRyaWdnZXI/OiAnaW1wZXJhdGl2ZSd8J3BvcHN0YXRlJ3wnaGFzaGNoYW5nZSc7XG5cbiAgLyoqXG4gICAqIFRoaXMgY29udGFpbnMgdGhlIG5hdmlnYXRpb24gaWQgdGhhdCBwdXNoZWQgdGhlIGhpc3RvcnkgcmVjb3JkIHRoYXQgdGhlIHJvdXRlciBuYXZpZ2F0ZXNcbiAgICogYmFjayB0by4gVGhpcyBpcyBub3QgbnVsbCBvbmx5IHdoZW4gdGhlIG5hdmlnYXRpb24gaXMgdHJpZ2dlcmVkIGJ5IGEgcG9wc3RhdGUgZXZlbnQuXG4gICAqXG4gICAqIFRoZSByb3V0ZXIgYXNzaWducyBhIG5hdmlnYXRpb25JZCB0byBldmVyeSByb3V0ZXIgdHJhbnNpdGlvbi9uYXZpZ2F0aW9uLiBFdmVuIHdoZW4gdGhlIHVzZXJcbiAgICogY2xpY2tzIG9uIHRoZSBiYWNrIGJ1dHRvbiBpbiB0aGUgYnJvd3NlciwgYSBuZXcgbmF2aWdhdGlvbiBpZCB3aWxsIGJlIGNyZWF0ZWQuIFNvIGZyb21cbiAgICogdGhlIHBlcnNwZWN0aXZlIG9mIHRoZSByb3V0ZXIsIHRoZSByb3V0ZXIgbmV2ZXIgXCJnb2VzIGJhY2tcIi4gQnkgdXNpbmcgdGhlIGByZXN0b3JlZFN0YXRlYFxuICAgKiBhbmQgaXRzIG5hdmlnYXRpb25JZCwgeW91IGNhbiBpbXBsZW1lbnQgYmVoYXZpb3IgdGhhdCBkaWZmZXJlbnRpYXRlcyBiZXR3ZWVuIGNyZWF0aW5nIG5ld1xuICAgKiBzdGF0ZXNcbiAgICogYW5kIHBvcHN0YXRlIGV2ZW50cy4gSW4gdGhlIGxhdHRlciBjYXNlIHlvdSBjYW4gcmVzdG9yZSBzb21lIHJlbWVtYmVyZWQgc3RhdGUgKGUuZy4sIHNjcm9sbFxuICAgKiBwb3NpdGlvbikuXG4gICAqL1xuICByZXN0b3JlZFN0YXRlPzoge25hdmlnYXRpb25JZDogbnVtYmVyfXxudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgbmF2aWdhdGlvblRyaWdnZXI6ICdpbXBlcmF0aXZlJ3wncG9wc3RhdGUnfCdoYXNoY2hhbmdlJyA9ICdpbXBlcmF0aXZlJyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICByZXN0b3JlZFN0YXRlOiB7bmF2aWdhdGlvbklkOiBudW1iZXJ9fG51bGwgPSBudWxsKSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gICAgdGhpcy5uYXZpZ2F0aW9uVHJpZ2dlciA9IG5hdmlnYXRpb25UcmlnZ2VyO1xuICAgIHRoaXMucmVzdG9yZWRTdGF0ZSA9IHJlc3RvcmVkU3RhdGU7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICB0b1N0cmluZygpOiBzdHJpbmcgeyByZXR1cm4gYE5hdmlnYXRpb25TdGFydChpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nKWA7IH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIGFuIGV2ZW50IHRyaWdnZXJlZCB3aGVuIGEgbmF2aWdhdGlvbiBlbmRzIHN1Y2Nlc3NmdWxseS5cbiAqXG4gKlxuICovXG5leHBvcnQgY2xhc3MgTmF2aWdhdGlvbkVuZCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgdXJsQWZ0ZXJSZWRpcmVjdHM6IHN0cmluZykge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYE5hdmlnYXRpb25FbmQoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke3RoaXMudXJsQWZ0ZXJSZWRpcmVjdHN9JylgO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyBhbiBldmVudCB0cmlnZ2VyZWQgd2hlbiBhIG5hdmlnYXRpb24gaXMgY2FuY2VsZWQuXG4gKlxuICpcbiAqL1xuZXhwb3J0IGNsYXNzIE5hdmlnYXRpb25DYW5jZWwgZXh0ZW5kcyBSb3V0ZXJFdmVudCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHJlYXNvbjogc3RyaW5nKSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICB0b1N0cmluZygpOiBzdHJpbmcgeyByZXR1cm4gYE5hdmlnYXRpb25DYW5jZWwoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JylgOyB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyBhbiBldmVudCB0cmlnZ2VyZWQgd2hlbiBhIG5hdmlnYXRpb24gZmFpbHMgZHVlIHRvIGFuIHVuZXhwZWN0ZWQgZXJyb3IuXG4gKlxuICpcbiAqL1xuZXhwb3J0IGNsYXNzIE5hdmlnYXRpb25FcnJvciBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgZXJyb3I6IGFueSkge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYE5hdmlnYXRpb25FcnJvcihpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nLCBlcnJvcjogJHt0aGlzLmVycm9yfSlgO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyBhbiBldmVudCB0cmlnZ2VyZWQgd2hlbiByb3V0ZXMgYXJlIHJlY29nbml6ZWQuXG4gKlxuICpcbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlc1JlY29nbml6ZWQgZXh0ZW5kcyBSb3V0ZXJFdmVudCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHVybEFmdGVyUmVkaXJlY3RzOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90KSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgUm91dGVzUmVjb2duaXplZChpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nLCB1cmxBZnRlclJlZGlyZWN0czogJyR7dGhpcy51cmxBZnRlclJlZGlyZWN0c30nLCBzdGF0ZTogJHt0aGlzLnN0YXRlfSlgO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgc3RhcnQgb2YgdGhlIEd1YXJkIHBoYXNlIG9mIHJvdXRpbmcuXG4gKlxuICogQGV4cGVyaW1lbnRhbFxuICovXG5leHBvcnQgY2xhc3MgR3VhcmRzQ2hlY2tTdGFydCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgdXJsQWZ0ZXJSZWRpcmVjdHM6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgc3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QpIHtcbiAgICBzdXBlcihpZCwgdXJsKTtcbiAgfVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBHdWFyZHNDaGVja1N0YXJ0KGlkOiAke3RoaXMuaWR9LCB1cmw6ICcke3RoaXMudXJsfScsIHVybEFmdGVyUmVkaXJlY3RzOiAnJHt0aGlzLnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3RoaXMuc3RhdGV9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIHRoZSBlbmQgb2YgdGhlIEd1YXJkIHBoYXNlIG9mIHJvdXRpbmcuXG4gKlxuICogQGV4cGVyaW1lbnRhbFxuICovXG5leHBvcnQgY2xhc3MgR3VhcmRzQ2hlY2tFbmQgZXh0ZW5kcyBSb3V0ZXJFdmVudCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHVybEFmdGVyUmVkaXJlY3RzOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzaG91bGRBY3RpdmF0ZTogYm9vbGVhbikge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYEd1YXJkc0NoZWNrRW5kKGlkOiAke3RoaXMuaWR9LCB1cmw6ICcke3RoaXMudXJsfScsIHVybEFmdGVyUmVkaXJlY3RzOiAnJHt0aGlzLnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3RoaXMuc3RhdGV9LCBzaG91bGRBY3RpdmF0ZTogJHt0aGlzLnNob3VsZEFjdGl2YXRlfSlgO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgc3RhcnQgb2YgdGhlIFJlc29sdmUgcGhhc2Ugb2Ygcm91dGluZy4gVGhlIHRpbWluZyBvZiB0aGlzXG4gKiBldmVudCBtYXkgY2hhbmdlLCB0aHVzIGl0J3MgZXhwZXJpbWVudGFsLiBJbiB0aGUgY3VycmVudCBpdGVyYXRpb24gaXQgd2lsbCBydW5cbiAqIGluIHRoZSBcInJlc29sdmVcIiBwaGFzZSB3aGV0aGVyIHRoZXJlJ3MgdGhpbmdzIHRvIHJlc29sdmUgb3Igbm90LiBJbiB0aGUgZnV0dXJlIHRoaXNcbiAqIGJlaGF2aW9yIG1heSBjaGFuZ2UgdG8gb25seSBydW4gd2hlbiB0aGVyZSBhcmUgdGhpbmdzIHRvIGJlIHJlc29sdmVkLlxuICpcbiAqIEBleHBlcmltZW50YWxcbiAqL1xuZXhwb3J0IGNsYXNzIFJlc29sdmVTdGFydCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgdXJsQWZ0ZXJSZWRpcmVjdHM6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgc3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QpIHtcbiAgICBzdXBlcihpZCwgdXJsKTtcbiAgfVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBSZXNvbHZlU3RhcnQoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke3RoaXMudXJsQWZ0ZXJSZWRpcmVjdHN9Jywgc3RhdGU6ICR7dGhpcy5zdGF0ZX0pYDtcbiAgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIGVuZCBvZiB0aGUgUmVzb2x2ZSBwaGFzZSBvZiByb3V0aW5nLiBTZWUgbm90ZSBvblxuICogYFJlc29sdmVTdGFydGAgZm9yIHVzZSBvZiB0aGlzIGV4cGVyaW1lbnRhbCBBUEkuXG4gKlxuICogQGV4cGVyaW1lbnRhbFxuICovXG5leHBvcnQgY2xhc3MgUmVzb2x2ZUVuZCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgdXJsQWZ0ZXJSZWRpcmVjdHM6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgc3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QpIHtcbiAgICBzdXBlcihpZCwgdXJsKTtcbiAgfVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBSZXNvbHZlRW5kKGlkOiAke3RoaXMuaWR9LCB1cmw6ICcke3RoaXMudXJsfScsIHVybEFmdGVyUmVkaXJlY3RzOiAnJHt0aGlzLnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3RoaXMuc3RhdGV9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIGFuIGV2ZW50IHRyaWdnZXJlZCBiZWZvcmUgbGF6eSBsb2FkaW5nIGEgcm91dGUgY29uZmlnLlxuICpcbiAqIEBleHBlcmltZW50YWxcbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlQ29uZmlnTG9hZFN0YXJ0IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHJvdXRlOiBSb3V0ZSkge31cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHsgcmV0dXJuIGBSb3V0ZUNvbmZpZ0xvYWRTdGFydChwYXRoOiAke3RoaXMucm91dGUucGF0aH0pYDsgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgYW4gZXZlbnQgdHJpZ2dlcmVkIHdoZW4gYSByb3V0ZSBoYXMgYmVlbiBsYXp5IGxvYWRlZC5cbiAqXG4gKiBAZXhwZXJpbWVudGFsXG4gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZUNvbmZpZ0xvYWRFbmQge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgcm91dGU6IFJvdXRlKSB7fVxuICB0b1N0cmluZygpOiBzdHJpbmcgeyByZXR1cm4gYFJvdXRlQ29uZmlnTG9hZEVuZChwYXRoOiAke3RoaXMucm91dGUucGF0aH0pYDsgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIHN0YXJ0IG9mIGVuZCBvZiB0aGUgUmVzb2x2ZSBwaGFzZSBvZiByb3V0aW5nLiBTZWUgbm90ZSBvblxuICogYENoaWxkQWN0aXZhdGlvbkVuZGAgZm9yIHVzZSBvZiB0aGlzIGV4cGVyaW1lbnRhbCBBUEkuXG4gKlxuICogQGV4cGVyaW1lbnRhbFxuICovXG5leHBvcnQgY2xhc3MgQ2hpbGRBY3RpdmF0aW9uU3RhcnQge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgc25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpIHt9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgY29uc3QgcGF0aCA9IHRoaXMuc25hcHNob3Qucm91dGVDb25maWcgJiYgdGhpcy5zbmFwc2hvdC5yb3V0ZUNvbmZpZy5wYXRoIHx8ICcnO1xuICAgIHJldHVybiBgQ2hpbGRBY3RpdmF0aW9uU3RhcnQocGF0aDogJyR7cGF0aH0nKWA7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIHRoZSBzdGFydCBvZiBlbmQgb2YgdGhlIFJlc29sdmUgcGhhc2Ugb2Ygcm91dGluZy4gU2VlIG5vdGUgb25cbiAqIGBDaGlsZEFjdGl2YXRpb25TdGFydGAgZm9yIHVzZSBvZiB0aGlzIGV4cGVyaW1lbnRhbCBBUEkuXG4gKlxuICogQGV4cGVyaW1lbnRhbFxuICovXG5leHBvcnQgY2xhc3MgQ2hpbGRBY3RpdmF0aW9uRW5kIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSB7fVxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBhdGggPSB0aGlzLnNuYXBzaG90LnJvdXRlQ29uZmlnICYmIHRoaXMuc25hcHNob3Qucm91dGVDb25maWcucGF0aCB8fCAnJztcbiAgICByZXR1cm4gYENoaWxkQWN0aXZhdGlvbkVuZChwYXRoOiAnJHtwYXRofScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIHN0YXJ0IG9mIGVuZCBvZiB0aGUgUmVzb2x2ZSBwaGFzZSBvZiByb3V0aW5nLiBTZWUgbm90ZSBvblxuICogYEFjdGl2YXRpb25FbmRgIGZvciB1c2Ugb2YgdGhpcyBleHBlcmltZW50YWwgQVBJLlxuICpcbiAqIEBleHBlcmltZW50YWxcbiAqL1xuZXhwb3J0IGNsYXNzIEFjdGl2YXRpb25TdGFydCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCkge31cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy5zbmFwc2hvdC5yb3V0ZUNvbmZpZyAmJiB0aGlzLnNuYXBzaG90LnJvdXRlQ29uZmlnLnBhdGggfHwgJyc7XG4gICAgcmV0dXJuIGBBY3RpdmF0aW9uU3RhcnQocGF0aDogJyR7cGF0aH0nKWA7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIHRoZSBzdGFydCBvZiBlbmQgb2YgdGhlIFJlc29sdmUgcGhhc2Ugb2Ygcm91dGluZy4gU2VlIG5vdGUgb25cbiAqIGBBY3RpdmF0aW9uU3RhcnRgIGZvciB1c2Ugb2YgdGhpcyBleHBlcmltZW50YWwgQVBJLlxuICpcbiAqIEBleHBlcmltZW50YWxcbiAqL1xuZXhwb3J0IGNsYXNzIEFjdGl2YXRpb25FbmQge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgc25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpIHt9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgY29uc3QgcGF0aCA9IHRoaXMuc25hcHNob3Qucm91dGVDb25maWcgJiYgdGhpcy5zbmFwc2hvdC5yb3V0ZUNvbmZpZy5wYXRoIHx8ICcnO1xuICAgIHJldHVybiBgQWN0aXZhdGlvbkVuZChwYXRoOiAnJHtwYXRofScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgYSBzY3JvbGxpbmcgZXZlbnQuXG4gKi9cbmV4cG9ydCBjbGFzcyBTY3JvbGwge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICByZWFkb25seSByb3V0ZXJFdmVudDogTmF2aWdhdGlvbkVuZCxcblxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHJlYWRvbmx5IHBvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdfG51bGwsXG5cbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICByZWFkb25seSBhbmNob3I6IHN0cmluZ3xudWxsKSB7fVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgY29uc3QgcG9zID0gdGhpcy5wb3NpdGlvbiA/IGAke3RoaXMucG9zaXRpb25bMF19LCAke3RoaXMucG9zaXRpb25bMV19YCA6IG51bGw7XG4gICAgcmV0dXJuIGBTY3JvbGwoYW5jaG9yOiAnJHt0aGlzLmFuY2hvcn0nLCBwb3NpdGlvbjogJyR7cG9zfScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgYSByb3V0ZXIgZXZlbnQsIGFsbG93aW5nIHlvdSB0byB0cmFjayB0aGUgbGlmZWN5Y2xlIG9mIHRoZSByb3V0ZXIuXG4gKlxuICogVGhlIHNlcXVlbmNlIG9mIHJvdXRlciBldmVudHMgaXM6XG4gKlxuICogLSBgTmF2aWdhdGlvblN0YXJ0YCxcbiAqIC0gYFJvdXRlQ29uZmlnTG9hZFN0YXJ0YCxcbiAqIC0gYFJvdXRlQ29uZmlnTG9hZEVuZGAsXG4gKiAtIGBSb3V0ZXNSZWNvZ25pemVkYCxcbiAqIC0gYEd1YXJkc0NoZWNrU3RhcnRgLFxuICogLSBgQ2hpbGRBY3RpdmF0aW9uU3RhcnRgLFxuICogLSBgQWN0aXZhdGlvblN0YXJ0YCxcbiAqIC0gYEd1YXJkc0NoZWNrRW5kYCxcbiAqIC0gYFJlc29sdmVTdGFydGAsXG4gKiAtIGBSZXNvbHZlRW5kYCxcbiAqIC0gYEFjdGl2YXRpb25FbmRgXG4gKiAtIGBDaGlsZEFjdGl2YXRpb25FbmRgXG4gKiAtIGBOYXZpZ2F0aW9uRW5kYCxcbiAqIC0gYE5hdmlnYXRpb25DYW5jZWxgLFxuICogLSBgTmF2aWdhdGlvbkVycm9yYFxuICogLSBgU2Nyb2xsYFxuICpcbiAqXG4gKi9cbmV4cG9ydCB0eXBlIEV2ZW50ID0gUm91dGVyRXZlbnQgfCBSb3V0ZUNvbmZpZ0xvYWRTdGFydCB8IFJvdXRlQ29uZmlnTG9hZEVuZCB8IENoaWxkQWN0aXZhdGlvblN0YXJ0IHxcbiAgICBDaGlsZEFjdGl2YXRpb25FbmQgfCBBY3RpdmF0aW9uU3RhcnQgfCBBY3RpdmF0aW9uRW5kIHwgU2Nyb2xsO1xuIl19