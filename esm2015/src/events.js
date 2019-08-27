/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Base for events the router goes through, as opposed to events tied to a specific
 * route. Fired one time for any given navigation.
 *
 * \@usageNotes
 *
 * ```ts
 * class MyService {
 *   constructor(public router: Router, logger: Logger) {
 *     router.events.pipe(
 *       filter(e => e instanceof RouterEvent)
 *     ).subscribe(e => {
 *       logger.log(e.id, e.url);
 *     });
 *   }
 * }
 * ```
 *
 * @see `Event`
 * \@publicApi
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
     * A unique ID that the router assigns to every router navigation.
     * @type {?}
     */
    RouterEvent.prototype.id;
    /**
     * The URL that is the destination for this navigation.
     * @type {?}
     */
    RouterEvent.prototype.url;
}
/**
 * An event triggered when a navigation starts.
 *
 * \@publicApi
 */
export class NavigationStart extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?=} navigationTrigger
     * @param {?=} restoredState
     */
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /** @docsNotRequired */
    navigationTrigger = 'imperative', 
    /** @docsNotRequired */
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
     * Identifies the call or event that triggered the navigation.
     * An `imperative` trigger is a call to `router.navigateByUrl()` or `router.navigate()`.
     *
     * @type {?}
     */
    NavigationStart.prototype.navigationTrigger;
    /**
     * The navigation state that was previously supplied to the `pushState` call,
     * when the navigation is triggered by a `popstate` event. Otherwise null.
     *
     * The state object is defined by `NavigationExtras`, and contains any
     * developer-defined state value, as well as a unique ID that
     * the router assigns to every router transition/navigation.
     *
     * From the perspective of the router, the router never "goes back".
     * When the user clicks on the back button in the browser,
     * a new navigation ID is created.
     *
     * Use the ID in this previous-state object to differentiate between a newly created
     * state and one returned to by a `popstate` event, so that you can restore some
     * remembered state, such as scroll position.
     *
     * @type {?}
     */
    NavigationStart.prototype.restoredState;
}
/**
 * An event triggered when a navigation ends successfully.
 *
 * \@publicApi
 */
export class NavigationEnd extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     */
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
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
 * An event triggered when a navigation is canceled.
 *
 * \@publicApi
 */
export class NavigationCancel extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} reason
     */
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
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
 * An event triggered when a navigation fails due to an unexpected error.
 *
 * \@publicApi
 */
export class NavigationError extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} error
     */
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
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
 * An event triggered when routes are recognized.
 *
 * \@publicApi
 */
export class RoutesRecognized extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     * @param {?} state
     */
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
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
 * An event triggered at the start of the Guard phase of routing.
 *
 * \@publicApi
 */
export class GuardsCheckStart extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     * @param {?} state
     */
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
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
 * An event triggered at the end of the Guard phase of routing.
 *
 * \@publicApi
 */
export class GuardsCheckEnd extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     * @param {?} state
     * @param {?} shouldActivate
     */
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
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
 * An event triggered at the the start of the Resolve phase of routing.
 *
 * Runs in the "resolve" phase whether or not there is anything to resolve.
 * In future, may change to only run when there are things to be resolved.
 *
 * \@publicApi
 */
export class ResolveStart extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     * @param {?} state
     */
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
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
 * An event triggered at the end of the Resolve phase of routing.
 * @see `ResolveStart`.
 *
 * \@publicApi
 */
export class ResolveEnd extends RouterEvent {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     * @param {?} state
     */
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
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
 * An event triggered before lazy loading a route configuration.
 *
 * \@publicApi
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
 * An event triggered when a route has been lazy loaded.
 *
 * \@publicApi
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
 * An event triggered at the start of the child-activation
 * part of the Resolve phase of routing.
 * @see `ChildActivationEnd`
 * @see `ResolveStart`
 *
 * \@publicApi
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
 * An event triggered at the end of the child-activation part
 * of the Resolve phase of routing.
 * @see `ChildActivationStart`
 * @see `ResolveStart` *
 * \@publicApi
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
 * An event triggered at the start of the activation part
 * of the Resolve phase of routing.
 * @see ActivationEnd`
 * @see `ResolveStart`
 *
 * \@publicApi
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
 * An event triggered at the end of the activation part
 * of the Resolve phase of routing.
 * @see `ActivationStart`
 * @see `ResolveStart`
 *
 * \@publicApi
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
 * An event triggered by scrolling.
 *
 * \@publicApi
 */
export class Scroll {
    /**
     * @param {?} routerEvent
     * @param {?} position
     * @param {?} anchor
     */
    constructor(routerEvent, position, anchor) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9ldmVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUEyQ0EsTUFBTSxPQUFPLFdBQVc7Ozs7O0lBQ3RCLFlBRVcsRUFBVSxFQUVWLEdBQVc7UUFGWCxPQUFFLEdBQUYsRUFBRSxDQUFRO1FBRVYsUUFBRyxHQUFILEdBQUcsQ0FBUTtJQUFHLENBQUM7Q0FDM0I7Ozs7OztJQUhLLHlCQUFpQjs7Ozs7SUFFakIsMEJBQWtCOzs7Ozs7O0FBUXhCLE1BQU0sT0FBTyxlQUFnQixTQUFRLFdBQVc7Ozs7Ozs7SUEyQjlDO0lBQ0ksdUJBQXVCO0lBQ3ZCLEVBQVU7SUFDVix1QkFBdUI7SUFDdkIsR0FBVztJQUNYLHVCQUF1QjtJQUN2QixvQkFBMEQsWUFBWTtJQUN0RSx1QkFBdUI7SUFDdkIsZ0JBQStELElBQUk7UUFDckUsS0FBSyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNmLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQztRQUMzQyxJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQztJQUNyQyxDQUFDOzs7OztJQUdELFFBQVEsS0FBYSxPQUFPLHVCQUF1QixJQUFJLENBQUMsRUFBRSxXQUFXLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDckY7Ozs7Ozs7O0lBckNDLDRDQUF5RDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQW1CekQsd0NBQThEOzs7Ozs7O0FBeUJoRSxNQUFNLE9BQU8sYUFBYyxTQUFRLFdBQVc7Ozs7OztJQUM1QztJQUNJLHVCQUF1QjtJQUN2QixFQUFVO0lBQ1YsdUJBQXVCO0lBQ3ZCLEdBQVcsRUFFSixpQkFBeUI7UUFDbEMsS0FBSyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUROLHNC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LEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJO1FBQzdFLE9BQU8sbUJBQW1CLElBQUksQ0FBQyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQztJQUNoRSxDQUFDO0NBQ0Y7Ozs7OztJQVpLLDZCQUFtQzs7Ozs7SUFHbkMsMEJBQXdDOzs7OztJQUd4Qyx3QkFBNEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Um91dGV9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgUm91dGVyU3RhdGVTbmFwc2hvdH0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuXG4vKipcbiAqIElkZW50aWZpZXMgdGhlIGNhbGwgb3IgZXZlbnQgdGhhdCB0cmlnZ2VyZWQgYSBuYXZpZ2F0aW9uLlxuICpcbiAqICogJ2ltcGVyYXRpdmUnOiBUcmlnZ2VyZWQgYnkgYHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKClgIG9yIGByb3V0ZXIubmF2aWdhdGUoKWAuXG4gKiAqICdwb3BzdGF0ZScgOiBUcmlnZ2VyZWQgYnkgYSBgcG9wc3RhdGVgIGV2ZW50LlxuICogKiAnaGFzaGNoYW5nZSctOiBUcmlnZ2VyZWQgYnkgYSBgaGFzaGNoYW5nZWAgZXZlbnQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBOYXZpZ2F0aW9uVHJpZ2dlciA9ICdpbXBlcmF0aXZlJyB8ICdwb3BzdGF0ZScgfCAnaGFzaGNoYW5nZSc7XG5cbi8qKlxuICogQmFzZSBmb3IgZXZlbnRzIHRoZSByb3V0ZXIgZ29lcyB0aHJvdWdoLCBhcyBvcHBvc2VkIHRvIGV2ZW50cyB0aWVkIHRvIGEgc3BlY2lmaWNcbiAqIHJvdXRlLiBGaXJlZCBvbmUgdGltZSBmb3IgYW55IGdpdmVuIG5hdmlnYXRpb24uXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBgYGB0c1xuICogY2xhc3MgTXlTZXJ2aWNlIHtcbiAqICAgY29uc3RydWN0b3IocHVibGljIHJvdXRlcjogUm91dGVyLCBsb2dnZXI6IExvZ2dlcikge1xuICogICAgIHJvdXRlci5ldmVudHMucGlwZShcbiAqICAgICAgIGZpbHRlcihlID0+IGUgaW5zdGFuY2VvZiBSb3V0ZXJFdmVudClcbiAqICAgICApLnN1YnNjcmliZShlID0+IHtcbiAqICAgICAgIGxvZ2dlci5sb2coZS5pZCwgZS51cmwpO1xuICogICAgIH0pO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBAc2VlIGBFdmVudGBcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlckV2ZW50IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQSB1bmlxdWUgSUQgdGhhdCB0aGUgcm91dGVyIGFzc2lnbnMgdG8gZXZlcnkgcm91dGVyIG5hdmlnYXRpb24uICovXG4gICAgICBwdWJsaWMgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBUaGUgVVJMIHRoYXQgaXMgdGhlIGRlc3RpbmF0aW9uIGZvciB0aGlzIG5hdmlnYXRpb24uICovXG4gICAgICBwdWJsaWMgdXJsOiBzdHJpbmcpIHt9XG59XG5cbi8qKlxuICogQW4gZXZlbnQgdHJpZ2dlcmVkIHdoZW4gYSBuYXZpZ2F0aW9uIHN0YXJ0cy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBOYXZpZ2F0aW9uU3RhcnQgZXh0ZW5kcyBSb3V0ZXJFdmVudCB7XG4gIC8qKlxuICAgKiBJZGVudGlmaWVzIHRoZSBjYWxsIG9yIGV2ZW50IHRoYXQgdHJpZ2dlcmVkIHRoZSBuYXZpZ2F0aW9uLlxuICAgKiBBbiBgaW1wZXJhdGl2ZWAgdHJpZ2dlciBpcyBhIGNhbGwgdG8gYHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKClgIG9yIGByb3V0ZXIubmF2aWdhdGUoKWAuXG4gICAqXG4gICAqL1xuICBuYXZpZ2F0aW9uVHJpZ2dlcj86ICdpbXBlcmF0aXZlJ3wncG9wc3RhdGUnfCdoYXNoY2hhbmdlJztcblxuICAvKipcbiAgICogVGhlIG5hdmlnYXRpb24gc3RhdGUgdGhhdCB3YXMgcHJldmlvdXNseSBzdXBwbGllZCB0byB0aGUgYHB1c2hTdGF0ZWAgY2FsbCxcbiAgICogd2hlbiB0aGUgbmF2aWdhdGlvbiBpcyB0cmlnZ2VyZWQgYnkgYSBgcG9wc3RhdGVgIGV2ZW50LiBPdGhlcndpc2UgbnVsbC5cbiAgICpcbiAgICogVGhlIHN0YXRlIG9iamVjdCBpcyBkZWZpbmVkIGJ5IGBOYXZpZ2F0aW9uRXh0cmFzYCwgYW5kIGNvbnRhaW5zIGFueVxuICAgKiBkZXZlbG9wZXItZGVmaW5lZCBzdGF0ZSB2YWx1ZSwgYXMgd2VsbCBhcyBhIHVuaXF1ZSBJRCB0aGF0XG4gICAqIHRoZSByb3V0ZXIgYXNzaWducyB0byBldmVyeSByb3V0ZXIgdHJhbnNpdGlvbi9uYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBGcm9tIHRoZSBwZXJzcGVjdGl2ZSBvZiB0aGUgcm91dGVyLCB0aGUgcm91dGVyIG5ldmVyIFwiZ29lcyBiYWNrXCIuXG4gICAqIFdoZW4gdGhlIHVzZXIgY2xpY2tzIG9uIHRoZSBiYWNrIGJ1dHRvbiBpbiB0aGUgYnJvd3NlcixcbiAgICogYSBuZXcgbmF2aWdhdGlvbiBJRCBpcyBjcmVhdGVkLlxuICAgKlxuICAgKiBVc2UgdGhlIElEIGluIHRoaXMgcHJldmlvdXMtc3RhdGUgb2JqZWN0IHRvIGRpZmZlcmVudGlhdGUgYmV0d2VlbiBhIG5ld2x5IGNyZWF0ZWRcbiAgICogc3RhdGUgYW5kIG9uZSByZXR1cm5lZCB0byBieSBhIGBwb3BzdGF0ZWAgZXZlbnQsIHNvIHRoYXQgeW91IGNhbiByZXN0b3JlIHNvbWVcbiAgICogcmVtZW1iZXJlZCBzdGF0ZSwgc3VjaCBhcyBzY3JvbGwgcG9zaXRpb24uXG4gICAqXG4gICAqL1xuICByZXN0b3JlZFN0YXRlPzoge1trOiBzdHJpbmddOiBhbnksIG5hdmlnYXRpb25JZDogbnVtYmVyfXxudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgbmF2aWdhdGlvblRyaWdnZXI6ICdpbXBlcmF0aXZlJ3wncG9wc3RhdGUnfCdoYXNoY2hhbmdlJyA9ICdpbXBlcmF0aXZlJyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICByZXN0b3JlZFN0YXRlOiB7W2s6IHN0cmluZ106IGFueSwgbmF2aWdhdGlvbklkOiBudW1iZXJ9fG51bGwgPSBudWxsKSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gICAgdGhpcy5uYXZpZ2F0aW9uVHJpZ2dlciA9IG5hdmlnYXRpb25UcmlnZ2VyO1xuICAgIHRoaXMucmVzdG9yZWRTdGF0ZSA9IHJlc3RvcmVkU3RhdGU7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICB0b1N0cmluZygpOiBzdHJpbmcgeyByZXR1cm4gYE5hdmlnYXRpb25TdGFydChpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nKWA7IH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgd2hlbiBhIG5hdmlnYXRpb24gZW5kcyBzdWNjZXNzZnVsbHkuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgTmF2aWdhdGlvbkVuZCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgdXJsQWZ0ZXJSZWRpcmVjdHM6IHN0cmluZykge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYE5hdmlnYXRpb25FbmQoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke3RoaXMudXJsQWZ0ZXJSZWRpcmVjdHN9JylgO1xuICB9XG59XG5cbi8qKlxuICogQW4gZXZlbnQgdHJpZ2dlcmVkIHdoZW4gYSBuYXZpZ2F0aW9uIGlzIGNhbmNlbGVkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIE5hdmlnYXRpb25DYW5jZWwgZXh0ZW5kcyBSb3V0ZXJFdmVudCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHJlYXNvbjogc3RyaW5nKSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICB0b1N0cmluZygpOiBzdHJpbmcgeyByZXR1cm4gYE5hdmlnYXRpb25DYW5jZWwoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JylgOyB9XG59XG5cbi8qKlxuICogQW4gZXZlbnQgdHJpZ2dlcmVkIHdoZW4gYSBuYXZpZ2F0aW9uIGZhaWxzIGR1ZSB0byBhbiB1bmV4cGVjdGVkIGVycm9yLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIE5hdmlnYXRpb25FcnJvciBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgZXJyb3I6IGFueSkge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYE5hdmlnYXRpb25FcnJvcihpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nLCBlcnJvcjogJHt0aGlzLmVycm9yfSlgO1xuICB9XG59XG5cbi8qKlxuICpBbiBldmVudCB0cmlnZ2VyZWQgd2hlbiByb3V0ZXMgYXJlIHJlY29nbml6ZWQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgUm91dGVzUmVjb2duaXplZCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgdXJsQWZ0ZXJSZWRpcmVjdHM6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgc3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QpIHtcbiAgICBzdXBlcihpZCwgdXJsKTtcbiAgfVxuXG4gIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBSb3V0ZXNSZWNvZ25pemVkKGlkOiAke3RoaXMuaWR9LCB1cmw6ICcke3RoaXMudXJsfScsIHVybEFmdGVyUmVkaXJlY3RzOiAnJHt0aGlzLnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3RoaXMuc3RhdGV9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgYXQgdGhlIHN0YXJ0IG9mIHRoZSBHdWFyZCBwaGFzZSBvZiByb3V0aW5nLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIEd1YXJkc0NoZWNrU3RhcnQgZXh0ZW5kcyBSb3V0ZXJFdmVudCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHVybEFmdGVyUmVkaXJlY3RzOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90KSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgR3VhcmRzQ2hlY2tTdGFydChpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nLCB1cmxBZnRlclJlZGlyZWN0czogJyR7dGhpcy51cmxBZnRlclJlZGlyZWN0c30nLCBzdGF0ZTogJHt0aGlzLnN0YXRlfSlgO1xuICB9XG59XG5cbi8qKlxuICogQW4gZXZlbnQgdHJpZ2dlcmVkIGF0IHRoZSBlbmQgb2YgdGhlIEd1YXJkIHBoYXNlIG9mIHJvdXRpbmcuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgR3VhcmRzQ2hlY2tFbmQgZXh0ZW5kcyBSb3V0ZXJFdmVudCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHVybEFmdGVyUmVkaXJlY3RzOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzaG91bGRBY3RpdmF0ZTogYm9vbGVhbikge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYEd1YXJkc0NoZWNrRW5kKGlkOiAke3RoaXMuaWR9LCB1cmw6ICcke3RoaXMudXJsfScsIHVybEFmdGVyUmVkaXJlY3RzOiAnJHt0aGlzLnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3RoaXMuc3RhdGV9LCBzaG91bGRBY3RpdmF0ZTogJHt0aGlzLnNob3VsZEFjdGl2YXRlfSlgO1xuICB9XG59XG5cbi8qKlxuICogQW4gZXZlbnQgdHJpZ2dlcmVkIGF0IHRoZSB0aGUgc3RhcnQgb2YgdGhlIFJlc29sdmUgcGhhc2Ugb2Ygcm91dGluZy5cbiAqXG4gKiBSdW5zIGluIHRoZSBcInJlc29sdmVcIiBwaGFzZSB3aGV0aGVyIG9yIG5vdCB0aGVyZSBpcyBhbnl0aGluZyB0byByZXNvbHZlLlxuICogSW4gZnV0dXJlLCBtYXkgY2hhbmdlIHRvIG9ubHkgcnVuIHdoZW4gdGhlcmUgYXJlIHRoaW5ncyB0byBiZSByZXNvbHZlZC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBSZXNvbHZlU3RhcnQgZXh0ZW5kcyBSb3V0ZXJFdmVudCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHVybEFmdGVyUmVkaXJlY3RzOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90KSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgUmVzb2x2ZVN0YXJ0KGlkOiAke3RoaXMuaWR9LCB1cmw6ICcke3RoaXMudXJsfScsIHVybEFmdGVyUmVkaXJlY3RzOiAnJHt0aGlzLnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3RoaXMuc3RhdGV9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgYXQgdGhlIGVuZCBvZiB0aGUgUmVzb2x2ZSBwaGFzZSBvZiByb3V0aW5nLlxuICogQHNlZSBgUmVzb2x2ZVN0YXJ0YC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBSZXNvbHZlRW5kIGV4dGVuZHMgUm91dGVyRXZlbnQge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBpZDogbnVtYmVyLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHVybDogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyB1cmxBZnRlclJlZGlyZWN0czogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCkge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFJlc29sdmVFbmQoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke3RoaXMudXJsQWZ0ZXJSZWRpcmVjdHN9Jywgc3RhdGU6ICR7dGhpcy5zdGF0ZX0pYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCBiZWZvcmUgbGF6eSBsb2FkaW5nIGEgcm91dGUgY29uZmlndXJhdGlvbi5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZUNvbmZpZ0xvYWRTdGFydCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyByb3V0ZTogUm91dGUpIHt9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7IHJldHVybiBgUm91dGVDb25maWdMb2FkU3RhcnQocGF0aDogJHt0aGlzLnJvdXRlLnBhdGh9KWA7IH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgd2hlbiBhIHJvdXRlIGhhcyBiZWVuIGxhenkgbG9hZGVkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlQ29uZmlnTG9hZEVuZCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyByb3V0ZTogUm91dGUpIHt9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7IHJldHVybiBgUm91dGVDb25maWdMb2FkRW5kKHBhdGg6ICR7dGhpcy5yb3V0ZS5wYXRofSlgOyB9XG59XG5cbi8qKlxuICogQW4gZXZlbnQgdHJpZ2dlcmVkIGF0IHRoZSBzdGFydCBvZiB0aGUgY2hpbGQtYWN0aXZhdGlvblxuICogcGFydCBvZiB0aGUgUmVzb2x2ZSBwaGFzZSBvZiByb3V0aW5nLlxuICogQHNlZSAgYENoaWxkQWN0aXZhdGlvbkVuZGBcbiAqIEBzZWUgYFJlc29sdmVTdGFydGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBDaGlsZEFjdGl2YXRpb25TdGFydCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCkge31cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy5zbmFwc2hvdC5yb3V0ZUNvbmZpZyAmJiB0aGlzLnNuYXBzaG90LnJvdXRlQ29uZmlnLnBhdGggfHwgJyc7XG4gICAgcmV0dXJuIGBDaGlsZEFjdGl2YXRpb25TdGFydChwYXRoOiAnJHtwYXRofScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCBhdCB0aGUgZW5kIG9mIHRoZSBjaGlsZC1hY3RpdmF0aW9uIHBhcnRcbiAqIG9mIHRoZSBSZXNvbHZlIHBoYXNlIG9mIHJvdXRpbmcuXG4gKiBAc2VlIGBDaGlsZEFjdGl2YXRpb25TdGFydGBcbiAqIEBzZWUgYFJlc29sdmVTdGFydGAgKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgQ2hpbGRBY3RpdmF0aW9uRW5kIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSB7fVxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBhdGggPSB0aGlzLnNuYXBzaG90LnJvdXRlQ29uZmlnICYmIHRoaXMuc25hcHNob3Qucm91dGVDb25maWcucGF0aCB8fCAnJztcbiAgICByZXR1cm4gYENoaWxkQWN0aXZhdGlvbkVuZChwYXRoOiAnJHtwYXRofScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCBhdCB0aGUgc3RhcnQgb2YgdGhlIGFjdGl2YXRpb24gcGFydFxuICogb2YgdGhlIFJlc29sdmUgcGhhc2Ugb2Ygcm91dGluZy5cbiAqIEBzZWUgQWN0aXZhdGlvbkVuZGBcbiAqIEBzZWUgYFJlc29sdmVTdGFydGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBBY3RpdmF0aW9uU3RhcnQge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgc25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpIHt9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgY29uc3QgcGF0aCA9IHRoaXMuc25hcHNob3Qucm91dGVDb25maWcgJiYgdGhpcy5zbmFwc2hvdC5yb3V0ZUNvbmZpZy5wYXRoIHx8ICcnO1xuICAgIHJldHVybiBgQWN0aXZhdGlvblN0YXJ0KHBhdGg6ICcke3BhdGh9JylgO1xuICB9XG59XG5cbi8qKlxuICogQW4gZXZlbnQgdHJpZ2dlcmVkIGF0IHRoZSBlbmQgb2YgdGhlIGFjdGl2YXRpb24gcGFydFxuICogb2YgdGhlIFJlc29sdmUgcGhhc2Ugb2Ygcm91dGluZy5cbiAqIEBzZWUgYEFjdGl2YXRpb25TdGFydGBcbiAqIEBzZWUgYFJlc29sdmVTdGFydGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBBY3RpdmF0aW9uRW5kIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSB7fVxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBhdGggPSB0aGlzLnNuYXBzaG90LnJvdXRlQ29uZmlnICYmIHRoaXMuc25hcHNob3Qucm91dGVDb25maWcucGF0aCB8fCAnJztcbiAgICByZXR1cm4gYEFjdGl2YXRpb25FbmQocGF0aDogJyR7cGF0aH0nKWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgYnkgc2Nyb2xsaW5nLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFNjcm9sbCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHJlYWRvbmx5IHJvdXRlckV2ZW50OiBOYXZpZ2F0aW9uRW5kLFxuXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcmVhZG9ubHkgcG9zaXRpb246IFtudW1iZXIsIG51bWJlcl18bnVsbCxcblxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHJlYWRvbmx5IGFuY2hvcjogc3RyaW5nfG51bGwpIHt9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwb3MgPSB0aGlzLnBvc2l0aW9uID8gYCR7dGhpcy5wb3NpdGlvblswXX0sICR7dGhpcy5wb3NpdGlvblsxXX1gIDogbnVsbDtcbiAgICByZXR1cm4gYFNjcm9sbChhbmNob3I6ICcke3RoaXMuYW5jaG9yfScsIHBvc2l0aW9uOiAnJHtwb3N9JylgO1xuICB9XG59XG5cbi8qKlxuICogUm91dGVyIGV2ZW50cyB0aGF0IGFsbG93IHlvdSB0byB0cmFjayB0aGUgbGlmZWN5Y2xlIG9mIHRoZSByb3V0ZXIuXG4gKlxuICogVGhlIHNlcXVlbmNlIG9mIHJvdXRlciBldmVudHMgaXMgYXMgZm9sbG93czpcbiAqXG4gKiAtIGBOYXZpZ2F0aW9uU3RhcnRgLFxuICogLSBgUm91dGVDb25maWdMb2FkU3RhcnRgLFxuICogLSBgUm91dGVDb25maWdMb2FkRW5kYCxcbiAqIC0gYFJvdXRlc1JlY29nbml6ZWRgLFxuICogLSBgR3VhcmRzQ2hlY2tTdGFydGAsXG4gKiAtIGBDaGlsZEFjdGl2YXRpb25TdGFydGAsXG4gKiAtIGBBY3RpdmF0aW9uU3RhcnRgLFxuICogLSBgR3VhcmRzQ2hlY2tFbmRgLFxuICogLSBgUmVzb2x2ZVN0YXJ0YCxcbiAqIC0gYFJlc29sdmVFbmRgLFxuICogLSBgQWN0aXZhdGlvbkVuZGBcbiAqIC0gYENoaWxkQWN0aXZhdGlvbkVuZGBcbiAqIC0gYE5hdmlnYXRpb25FbmRgLFxuICogLSBgTmF2aWdhdGlvbkNhbmNlbGAsXG4gKiAtIGBOYXZpZ2F0aW9uRXJyb3JgXG4gKiAtIGBTY3JvbGxgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBFdmVudCA9IFJvdXRlckV2ZW50IHwgUm91dGVDb25maWdMb2FkU3RhcnQgfCBSb3V0ZUNvbmZpZ0xvYWRFbmQgfCBDaGlsZEFjdGl2YXRpb25TdGFydCB8XG4gICAgQ2hpbGRBY3RpdmF0aW9uRW5kIHwgQWN0aXZhdGlvblN0YXJ0IHwgQWN0aXZhdGlvbkVuZCB8IFNjcm9sbDtcbiJdfQ==