/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Base for events the router goes through, as opposed to events tied to a specific
 * route. Fired one time for any given navigation.
 *
 * The following code shows how a class subscribes to router events.
 *
 * ```ts
 * import {Event, RouterEvent, Router} from '@angular/router';
 *
 * class MyService {
 *   constructor(public router: Router) {
 *     router.events.pipe(
 *        filter((e: Event): e is RouterEvent => e instanceof RouterEvent)
 *     ).subscribe((e: RouterEvent) => {
 *       // Do something
 *     });
 *   }
 * }
 * ```
 *
 * @see `Event`
 * @see [Router events summary](guide/router-reference#router-events)
 * @publicApi
 */
export class RouterEvent {
    constructor(
    /** A unique ID that the router assigns to every router navigation. */
    id, 
    /** The URL that is the destination for this navigation. */
    url) {
        this.id = id;
        this.url = url;
    }
}
/**
 * An event triggered when a navigation starts.
 *
 * @publicApi
 */
export class NavigationStart extends RouterEvent {
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
        this.type = 0 /* EventType.NavigationStart */;
        this.navigationTrigger = navigationTrigger;
        this.restoredState = restoredState;
    }
    /** @docsNotRequired */
    toString() {
        return `NavigationStart(id: ${this.id}, url: '${this.url}')`;
    }
}
/**
 * An event triggered when a navigation ends successfully.
 *
 * @see `NavigationStart`
 * @see `NavigationCancel`
 * @see `NavigationError`
 *
 * @publicApi
 */
export class NavigationEnd extends RouterEvent {
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /** @docsNotRequired */
    urlAfterRedirects) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
        this.type = 1 /* EventType.NavigationEnd */;
    }
    /** @docsNotRequired */
    toString() {
        return `NavigationEnd(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}')`;
    }
}
/**
 * An event triggered when a navigation is canceled, directly or indirectly.
 * This can happen for several reasons including when a route guard
 * returns `false` or initiates a redirect by returning a `UrlTree`.
 *
 * @see `NavigationStart`
 * @see `NavigationEnd`
 * @see `NavigationError`
 *
 * @publicApi
 */
export class NavigationCancel extends RouterEvent {
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /**
     * A description of why the navigation was cancelled. For debug purposes only. Use `code`
     * instead for a stable cancellation reason that can be used in production.
     */
    reason, 
    /**
     * A code to indicate why the navigation was canceled. This cancellation code is stable for
     * the reason and can be relied on whereas the `reason` string could change and should not be
     * used in production.
     */
    code) {
        super(id, url);
        this.reason = reason;
        this.code = code;
        this.type = 2 /* EventType.NavigationCancel */;
    }
    /** @docsNotRequired */
    toString() {
        return `NavigationCancel(id: ${this.id}, url: '${this.url}')`;
    }
}
/**
 * An event triggered when a navigation fails due to an unexpected error.
 *
 * @see `NavigationStart`
 * @see `NavigationEnd`
 * @see `NavigationCancel`
 *
 * @publicApi
 */
export class NavigationError extends RouterEvent {
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /** @docsNotRequired */
    error, 
    /**
     * The target of the navigation when the error occurred.
     *
     * Note that this can be `undefined` because an error could have occurred before the
     * `RouterStateSnapshot` was created for the navigation.
     */
    target) {
        super(id, url);
        this.error = error;
        this.target = target;
        this.type = 3 /* EventType.NavigationError */;
    }
    /** @docsNotRequired */
    toString() {
        return `NavigationError(id: ${this.id}, url: '${this.url}', error: ${this.error})`;
    }
}
/**
 * An event triggered when routes are recognized.
 *
 * @publicApi
 */
export class RoutesRecognized extends RouterEvent {
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /** @docsNotRequired */
    urlAfterRedirects, 
    /** @docsNotRequired */
    state) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
        this.state = state;
        this.type = 4 /* EventType.RoutesRecognized */;
    }
    /** @docsNotRequired */
    toString() {
        return `RoutesRecognized(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`;
    }
}
/**
 * An event triggered at the start of the Guard phase of routing.
 *
 * @see `GuardsCheckEnd`
 *
 * @publicApi
 */
export class GuardsCheckStart extends RouterEvent {
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /** @docsNotRequired */
    urlAfterRedirects, 
    /** @docsNotRequired */
    state) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
        this.state = state;
        this.type = 7 /* EventType.GuardsCheckStart */;
    }
    toString() {
        return `GuardsCheckStart(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`;
    }
}
/**
 * An event triggered at the end of the Guard phase of routing.
 *
 * @see `GuardsCheckStart`
 *
 * @publicApi
 */
export class GuardsCheckEnd extends RouterEvent {
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /** @docsNotRequired */
    urlAfterRedirects, 
    /** @docsNotRequired */
    state, 
    /** @docsNotRequired */
    shouldActivate) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
        this.state = state;
        this.shouldActivate = shouldActivate;
        this.type = 8 /* EventType.GuardsCheckEnd */;
    }
    toString() {
        return `GuardsCheckEnd(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state}, shouldActivate: ${this.shouldActivate})`;
    }
}
/**
 * An event triggered at the start of the Resolve phase of routing.
 *
 * Runs in the "resolve" phase whether or not there is anything to resolve.
 * In future, may change to only run when there are things to be resolved.
 *
 * @see `ResolveEnd`
 *
 * @publicApi
 */
export class ResolveStart extends RouterEvent {
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /** @docsNotRequired */
    urlAfterRedirects, 
    /** @docsNotRequired */
    state) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
        this.state = state;
        this.type = 5 /* EventType.ResolveStart */;
    }
    toString() {
        return `ResolveStart(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`;
    }
}
/**
 * An event triggered at the end of the Resolve phase of routing.
 * @see `ResolveStart`.
 *
 * @publicApi
 */
export class ResolveEnd extends RouterEvent {
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /** @docsNotRequired */
    urlAfterRedirects, 
    /** @docsNotRequired */
    state) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
        this.state = state;
        this.type = 6 /* EventType.ResolveEnd */;
    }
    toString() {
        return `ResolveEnd(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`;
    }
}
/**
 * An event triggered before lazy loading a route configuration.
 *
 * @see `RouteConfigLoadEnd`
 *
 * @publicApi
 */
export class RouteConfigLoadStart {
    constructor(
    /** @docsNotRequired */
    route) {
        this.route = route;
        this.type = 9 /* EventType.RouteConfigLoadStart */;
    }
    toString() {
        return `RouteConfigLoadStart(path: ${this.route.path})`;
    }
}
/**
 * An event triggered when a route has been lazy loaded.
 *
 * @see `RouteConfigLoadStart`
 *
 * @publicApi
 */
export class RouteConfigLoadEnd {
    constructor(
    /** @docsNotRequired */
    route) {
        this.route = route;
        this.type = 10 /* EventType.RouteConfigLoadEnd */;
    }
    toString() {
        return `RouteConfigLoadEnd(path: ${this.route.path})`;
    }
}
/**
 * An event triggered at the start of the child-activation
 * part of the Resolve phase of routing.
 * @see  `ChildActivationEnd`
 * @see `ResolveStart`
 *
 * @publicApi
 */
export class ChildActivationStart {
    constructor(
    /** @docsNotRequired */
    snapshot) {
        this.snapshot = snapshot;
        this.type = 11 /* EventType.ChildActivationStart */;
    }
    toString() {
        const path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return `ChildActivationStart(path: '${path}')`;
    }
}
/**
 * An event triggered at the end of the child-activation part
 * of the Resolve phase of routing.
 * @see `ChildActivationStart`
 * @see `ResolveStart`
 * @publicApi
 */
export class ChildActivationEnd {
    constructor(
    /** @docsNotRequired */
    snapshot) {
        this.snapshot = snapshot;
        this.type = 12 /* EventType.ChildActivationEnd */;
    }
    toString() {
        const path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return `ChildActivationEnd(path: '${path}')`;
    }
}
/**
 * An event triggered at the start of the activation part
 * of the Resolve phase of routing.
 * @see `ActivationEnd`
 * @see `ResolveStart`
 *
 * @publicApi
 */
export class ActivationStart {
    constructor(
    /** @docsNotRequired */
    snapshot) {
        this.snapshot = snapshot;
        this.type = 13 /* EventType.ActivationStart */;
    }
    toString() {
        const path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return `ActivationStart(path: '${path}')`;
    }
}
/**
 * An event triggered at the end of the activation part
 * of the Resolve phase of routing.
 * @see `ActivationStart`
 * @see `ResolveStart`
 *
 * @publicApi
 */
export class ActivationEnd {
    constructor(
    /** @docsNotRequired */
    snapshot) {
        this.snapshot = snapshot;
        this.type = 14 /* EventType.ActivationEnd */;
    }
    toString() {
        const path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return `ActivationEnd(path: '${path}')`;
    }
}
/**
 * An event triggered by scrolling.
 *
 * @publicApi
 */
export class Scroll {
    constructor(
    /** @docsNotRequired */
    routerEvent, 
    /** @docsNotRequired */
    position, 
    /** @docsNotRequired */
    anchor) {
        this.routerEvent = routerEvent;
        this.position = position;
        this.anchor = anchor;
        this.type = 15 /* EventType.Scroll */;
    }
    toString() {
        const pos = this.position ? `${this.position[0]}, ${this.position[1]}` : null;
        return `Scroll(anchor: '${this.anchor}', position: '${pos}')`;
    }
}
export function stringifyEvent(routerEvent) {
    if (!('type' in routerEvent)) {
        return `Unknown Router Event: ${routerEvent.constructor.name}`;
    }
    switch (routerEvent.type) {
        case 14 /* EventType.ActivationEnd */:
            return `ActivationEnd(path: '${routerEvent.snapshot.routeConfig?.path || ''}')`;
        case 13 /* EventType.ActivationStart */:
            return `ActivationStart(path: '${routerEvent.snapshot.routeConfig?.path || ''}')`;
        case 12 /* EventType.ChildActivationEnd */:
            return `ChildActivationEnd(path: '${routerEvent.snapshot.routeConfig?.path || ''}')`;
        case 11 /* EventType.ChildActivationStart */:
            return `ChildActivationStart(path: '${routerEvent.snapshot.routeConfig?.path || ''}')`;
        case 8 /* EventType.GuardsCheckEnd */:
            return `GuardsCheckEnd(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state}, shouldActivate: ${routerEvent.shouldActivate})`;
        case 7 /* EventType.GuardsCheckStart */:
            return `GuardsCheckStart(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state})`;
        case 2 /* EventType.NavigationCancel */:
            return `NavigationCancel(id: ${routerEvent.id}, url: '${routerEvent.url}')`;
        case 1 /* EventType.NavigationEnd */:
            return `NavigationEnd(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}')`;
        case 3 /* EventType.NavigationError */:
            return `NavigationError(id: ${routerEvent.id}, url: '${routerEvent.url}', error: ${routerEvent.error})`;
        case 0 /* EventType.NavigationStart */:
            return `NavigationStart(id: ${routerEvent.id}, url: '${routerEvent.url}')`;
        case 6 /* EventType.ResolveEnd */:
            return `ResolveEnd(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state})`;
        case 5 /* EventType.ResolveStart */:
            return `ResolveStart(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state})`;
        case 10 /* EventType.RouteConfigLoadEnd */:
            return `RouteConfigLoadEnd(path: ${routerEvent.route.path})`;
        case 9 /* EventType.RouteConfigLoadStart */:
            return `RouteConfigLoadStart(path: ${routerEvent.route.path})`;
        case 4 /* EventType.RoutesRecognized */:
            return `RoutesRecognized(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state})`;
        case 15 /* EventType.Scroll */:
            const pos = routerEvent.position ? `${routerEvent.position[0]}, ${routerEvent.position[1]}` : null;
            return `Scroll(anchor: '${routerEvent.anchor}', position: '${pos}')`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9ldmVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBd0NIOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXVCRztBQUNILE1BQU0sT0FBTyxXQUFXO0lBQ3RCO0lBQ0ksc0VBQXNFO0lBQy9ELEVBQVU7SUFDakIsMkRBQTJEO0lBQ3BELEdBQVc7UUFGWCxPQUFFLEdBQUYsRUFBRSxDQUFRO1FBRVYsUUFBRyxHQUFILEdBQUcsQ0FBUTtJQUFHLENBQUM7Q0FDM0I7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLGVBQWdCLFNBQVEsV0FBVztJQWdDOUM7SUFDSSx1QkFBdUI7SUFDdkIsRUFBVTtJQUNWLHVCQUF1QjtJQUN2QixHQUFXO0lBQ1gsdUJBQXVCO0lBQ3ZCLG9CQUF1QyxZQUFZO0lBQ25ELHVCQUF1QjtJQUN2QixnQkFBK0QsSUFBSTtRQUNyRSxLQUFLLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBeENSLFNBQUkscUNBQTZCO1FBeUN4QyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUM7UUFDM0MsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7SUFDckMsQ0FBQztJQUVELHVCQUF1QjtJQUNkLFFBQVE7UUFDZixPQUFPLHVCQUF1QixJQUFJLENBQUMsRUFBRSxXQUFXLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUMvRCxDQUFDO0NBQ0Y7QUFFRDs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sT0FBTyxhQUFjLFNBQVEsV0FBVztJQUc1QztJQUNJLHVCQUF1QjtJQUN2QixFQUFVO0lBQ1YsdUJBQXVCO0lBQ3ZCLEdBQVc7SUFDWCx1QkFBdUI7SUFDaEIsaUJBQXlCO1FBQ2xDLEtBQUssQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFETixzQkFB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QztRQUNyRTtZQUNFLE9BQU8sNEJBQTRCLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUM7UUFDL0Q7WUFDRSxPQUFPLDhCQUE4QixXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDO1FBQ2pFO1lBQ0UsT0FBTyx3QkFBd0IsV0FBVyxDQUFDLEVBQUUsV0FDekMsV0FBVyxDQUFDLEdBQUcsMEJBQTBCLFdBQVcsQ0FBQyxpQkFBaUIsYUFDdEUsV0FBVyxDQUFDLEtBQUssR0FBRyxDQUFDO1FBQzNCO1lBQ0UsTUFBTSxHQUFHLEdBQ0wsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzNGLE9BQU8sbUJBQW1CLFdBQVcsQ0FBQyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQztLQUN4RTtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtSb3V0ZX0gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBSb3V0ZXJTdGF0ZVNuYXBzaG90fSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5cbi8qKlxuICogSWRlbnRpZmllcyB0aGUgY2FsbCBvciBldmVudCB0aGF0IHRyaWdnZXJlZCBhIG5hdmlnYXRpb24uXG4gKlxuICogKiAnaW1wZXJhdGl2ZSc6IFRyaWdnZXJlZCBieSBgcm91dGVyLm5hdmlnYXRlQnlVcmwoKWAgb3IgYHJvdXRlci5uYXZpZ2F0ZSgpYC5cbiAqICogJ3BvcHN0YXRlJyA6IFRyaWdnZXJlZCBieSBhIGBwb3BzdGF0ZWAgZXZlbnQuXG4gKiAqICdoYXNoY2hhbmdlJy06IFRyaWdnZXJlZCBieSBhIGBoYXNoY2hhbmdlYCBldmVudC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIE5hdmlnYXRpb25UcmlnZ2VyID0gJ2ltcGVyYXRpdmUnfCdwb3BzdGF0ZSd8J2hhc2hjaGFuZ2UnO1xuXG4vKipcbiAqIElkZW50aWZpZXMgdGhlIHR5cGUgb2YgYSByb3V0ZXIgZXZlbnQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY29uc3QgZW51bSBFdmVudFR5cGUge1xuICBOYXZpZ2F0aW9uU3RhcnQsXG4gIE5hdmlnYXRpb25FbmQsXG4gIE5hdmlnYXRpb25DYW5jZWwsXG4gIE5hdmlnYXRpb25FcnJvcixcbiAgUm91dGVzUmVjb2duaXplZCxcbiAgUmVzb2x2ZVN0YXJ0LFxuICBSZXNvbHZlRW5kLFxuICBHdWFyZHNDaGVja1N0YXJ0LFxuICBHdWFyZHNDaGVja0VuZCxcbiAgUm91dGVDb25maWdMb2FkU3RhcnQsXG4gIFJvdXRlQ29uZmlnTG9hZEVuZCxcbiAgQ2hpbGRBY3RpdmF0aW9uU3RhcnQsXG4gIENoaWxkQWN0aXZhdGlvbkVuZCxcbiAgQWN0aXZhdGlvblN0YXJ0LFxuICBBY3RpdmF0aW9uRW5kLFxuICBTY3JvbGwsXG59XG5cbi8qKlxuICogQmFzZSBmb3IgZXZlbnRzIHRoZSByb3V0ZXIgZ29lcyB0aHJvdWdoLCBhcyBvcHBvc2VkIHRvIGV2ZW50cyB0aWVkIHRvIGEgc3BlY2lmaWNcbiAqIHJvdXRlLiBGaXJlZCBvbmUgdGltZSBmb3IgYW55IGdpdmVuIG5hdmlnYXRpb24uXG4gKlxuICogVGhlIGZvbGxvd2luZyBjb2RlIHNob3dzIGhvdyBhIGNsYXNzIHN1YnNjcmliZXMgdG8gcm91dGVyIGV2ZW50cy5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHtFdmVudCwgUm91dGVyRXZlbnQsIFJvdXRlcn0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcbiAqXG4gKiBjbGFzcyBNeVNlcnZpY2Uge1xuICogICBjb25zdHJ1Y3RvcihwdWJsaWMgcm91dGVyOiBSb3V0ZXIpIHtcbiAqICAgICByb3V0ZXIuZXZlbnRzLnBpcGUoXG4gKiAgICAgICAgZmlsdGVyKChlOiBFdmVudCk6IGUgaXMgUm91dGVyRXZlbnQgPT4gZSBpbnN0YW5jZW9mIFJvdXRlckV2ZW50KVxuICogICAgICkuc3Vic2NyaWJlKChlOiBSb3V0ZXJFdmVudCkgPT4ge1xuICogICAgICAgLy8gRG8gc29tZXRoaW5nXG4gKiAgICAgfSk7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBzZWUgYEV2ZW50YFxuICogQHNlZSBbUm91dGVyIGV2ZW50cyBzdW1tYXJ5XShndWlkZS9yb3V0ZXItcmVmZXJlbmNlI3JvdXRlci1ldmVudHMpXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZXJFdmVudCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEEgdW5pcXVlIElEIHRoYXQgdGhlIHJvdXRlciBhc3NpZ25zIHRvIGV2ZXJ5IHJvdXRlciBuYXZpZ2F0aW9uLiAqL1xuICAgICAgcHVibGljIGlkOiBudW1iZXIsXG4gICAgICAvKiogVGhlIFVSTCB0aGF0IGlzIHRoZSBkZXN0aW5hdGlvbiBmb3IgdGhpcyBuYXZpZ2F0aW9uLiAqL1xuICAgICAgcHVibGljIHVybDogc3RyaW5nKSB7fVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCB3aGVuIGEgbmF2aWdhdGlvbiBzdGFydHMuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgTmF2aWdhdGlvblN0YXJ0IGV4dGVuZHMgUm91dGVyRXZlbnQge1xuICByZWFkb25seSB0eXBlID0gRXZlbnRUeXBlLk5hdmlnYXRpb25TdGFydDtcblxuICAvKipcbiAgICogSWRlbnRpZmllcyB0aGUgY2FsbCBvciBldmVudCB0aGF0IHRyaWdnZXJlZCB0aGUgbmF2aWdhdGlvbi5cbiAgICogQW4gYGltcGVyYXRpdmVgIHRyaWdnZXIgaXMgYSBjYWxsIHRvIGByb3V0ZXIubmF2aWdhdGVCeVVybCgpYCBvciBgcm91dGVyLm5hdmlnYXRlKClgLlxuICAgKlxuICAgKiBAc2VlIGBOYXZpZ2F0aW9uRW5kYFxuICAgKiBAc2VlIGBOYXZpZ2F0aW9uQ2FuY2VsYFxuICAgKiBAc2VlIGBOYXZpZ2F0aW9uRXJyb3JgXG4gICAqL1xuICBuYXZpZ2F0aW9uVHJpZ2dlcj86IE5hdmlnYXRpb25UcmlnZ2VyO1xuXG4gIC8qKlxuICAgKiBUaGUgbmF2aWdhdGlvbiBzdGF0ZSB0aGF0IHdhcyBwcmV2aW91c2x5IHN1cHBsaWVkIHRvIHRoZSBgcHVzaFN0YXRlYCBjYWxsLFxuICAgKiB3aGVuIHRoZSBuYXZpZ2F0aW9uIGlzIHRyaWdnZXJlZCBieSBhIGBwb3BzdGF0ZWAgZXZlbnQuIE90aGVyd2lzZSBudWxsLlxuICAgKlxuICAgKiBUaGUgc3RhdGUgb2JqZWN0IGlzIGRlZmluZWQgYnkgYE5hdmlnYXRpb25FeHRyYXNgLCBhbmQgY29udGFpbnMgYW55XG4gICAqIGRldmVsb3Blci1kZWZpbmVkIHN0YXRlIHZhbHVlLCBhcyB3ZWxsIGFzIGEgdW5pcXVlIElEIHRoYXRcbiAgICogdGhlIHJvdXRlciBhc3NpZ25zIHRvIGV2ZXJ5IHJvdXRlciB0cmFuc2l0aW9uL25hdmlnYXRpb24uXG4gICAqXG4gICAqIEZyb20gdGhlIHBlcnNwZWN0aXZlIG9mIHRoZSByb3V0ZXIsIHRoZSByb3V0ZXIgbmV2ZXIgXCJnb2VzIGJhY2tcIi5cbiAgICogV2hlbiB0aGUgdXNlciBjbGlja3Mgb24gdGhlIGJhY2sgYnV0dG9uIGluIHRoZSBicm93c2VyLFxuICAgKiBhIG5ldyBuYXZpZ2F0aW9uIElEIGlzIGNyZWF0ZWQuXG4gICAqXG4gICAqIFVzZSB0aGUgSUQgaW4gdGhpcyBwcmV2aW91cy1zdGF0ZSBvYmplY3QgdG8gZGlmZmVyZW50aWF0ZSBiZXR3ZWVuIGEgbmV3bHkgY3JlYXRlZFxuICAgKiBzdGF0ZSBhbmQgb25lIHJldHVybmVkIHRvIGJ5IGEgYHBvcHN0YXRlYCBldmVudCwgc28gdGhhdCB5b3UgY2FuIHJlc3RvcmUgc29tZVxuICAgKiByZW1lbWJlcmVkIHN0YXRlLCBzdWNoIGFzIHNjcm9sbCBwb3NpdGlvbi5cbiAgICpcbiAgICovXG4gIHJlc3RvcmVkU3RhdGU/OiB7W2s6IHN0cmluZ106IGFueSwgbmF2aWdhdGlvbklkOiBudW1iZXJ9fG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBuYXZpZ2F0aW9uVHJpZ2dlcjogTmF2aWdhdGlvblRyaWdnZXIgPSAnaW1wZXJhdGl2ZScsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcmVzdG9yZWRTdGF0ZToge1trOiBzdHJpbmddOiBhbnksIG5hdmlnYXRpb25JZDogbnVtYmVyfXxudWxsID0gbnVsbCkge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICAgIHRoaXMubmF2aWdhdGlvblRyaWdnZXIgPSBuYXZpZ2F0aW9uVHJpZ2dlcjtcbiAgICB0aGlzLnJlc3RvcmVkU3RhdGUgPSByZXN0b3JlZFN0YXRlO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgb3ZlcnJpZGUgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYE5hdmlnYXRpb25TdGFydChpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nKWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgd2hlbiBhIG5hdmlnYXRpb24gZW5kcyBzdWNjZXNzZnVsbHkuXG4gKlxuICogQHNlZSBgTmF2aWdhdGlvblN0YXJ0YFxuICogQHNlZSBgTmF2aWdhdGlvbkNhbmNlbGBcbiAqIEBzZWUgYE5hdmlnYXRpb25FcnJvcmBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBOYXZpZ2F0aW9uRW5kIGV4dGVuZHMgUm91dGVyRXZlbnQge1xuICByZWFkb25seSB0eXBlID0gRXZlbnRUeXBlLk5hdmlnYXRpb25FbmQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgdXJsQWZ0ZXJSZWRpcmVjdHM6IHN0cmluZykge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgb3ZlcnJpZGUgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYE5hdmlnYXRpb25FbmQoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke1xuICAgICAgICB0aGlzLnVybEFmdGVyUmVkaXJlY3RzfScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEEgY29kZSBmb3IgdGhlIGBOYXZpZ2F0aW9uQ2FuY2VsYCBldmVudCBvZiB0aGUgYFJvdXRlcmAgdG8gaW5kaWNhdGUgdGhlXG4gKiByZWFzb24gYSBuYXZpZ2F0aW9uIGZhaWxlZC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlIHtcbiAgLyoqXG4gICAqIEEgbmF2aWdhdGlvbiBmYWlsZWQgYmVjYXVzZSBhIGd1YXJkIHJldHVybmVkIGEgYFVybFRyZWVgIHRvIHJlZGlyZWN0LlxuICAgKi9cbiAgUmVkaXJlY3QsXG4gIC8qKlxuICAgKiBBIG5hdmlnYXRpb24gZmFpbGVkIGJlY2F1c2UgYSBtb3JlIHJlY2VudCBuYXZpZ2F0aW9uIHN0YXJ0ZWQuXG4gICAqL1xuICBTdXBlcnNlZGVkQnlOZXdOYXZpZ2F0aW9uLFxuICAvKipcbiAgICogQSBuYXZpZ2F0aW9uIGZhaWxlZCBiZWNhdXNlIG9uZSBvZiB0aGUgcmVzb2x2ZXJzIGNvbXBsZXRlZCB3aXRob3V0IGVtaXRpbmcgYSB2YWx1ZS5cbiAgICovXG4gIE5vRGF0YUZyb21SZXNvbHZlcixcbiAgLyoqXG4gICAqIEEgbmF2aWdhdGlvbiBmYWlsZWQgYmVjYXVzZSBhIGd1YXJkIHJldHVybmVkIGBmYWxzZWAuXG4gICAqL1xuICBHdWFyZFJlamVjdGVkLFxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCB3aGVuIGEgbmF2aWdhdGlvbiBpcyBjYW5jZWxlZCwgZGlyZWN0bHkgb3IgaW5kaXJlY3RseS5cbiAqIFRoaXMgY2FuIGhhcHBlbiBmb3Igc2V2ZXJhbCByZWFzb25zIGluY2x1ZGluZyB3aGVuIGEgcm91dGUgZ3VhcmRcbiAqIHJldHVybnMgYGZhbHNlYCBvciBpbml0aWF0ZXMgYSByZWRpcmVjdCBieSByZXR1cm5pbmcgYSBgVXJsVHJlZWAuXG4gKlxuICogQHNlZSBgTmF2aWdhdGlvblN0YXJ0YFxuICogQHNlZSBgTmF2aWdhdGlvbkVuZGBcbiAqIEBzZWUgYE5hdmlnYXRpb25FcnJvcmBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBOYXZpZ2F0aW9uQ2FuY2VsIGV4dGVuZHMgUm91dGVyRXZlbnQge1xuICByZWFkb25seSB0eXBlID0gRXZlbnRUeXBlLk5hdmlnYXRpb25DYW5jZWw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKlxuICAgICAgICogQSBkZXNjcmlwdGlvbiBvZiB3aHkgdGhlIG5hdmlnYXRpb24gd2FzIGNhbmNlbGxlZC4gRm9yIGRlYnVnIHB1cnBvc2VzIG9ubHkuIFVzZSBgY29kZWBcbiAgICAgICAqIGluc3RlYWQgZm9yIGEgc3RhYmxlIGNhbmNlbGxhdGlvbiByZWFzb24gdGhhdCBjYW4gYmUgdXNlZCBpbiBwcm9kdWN0aW9uLlxuICAgICAgICovXG4gICAgICBwdWJsaWMgcmVhc29uOiBzdHJpbmcsXG4gICAgICAvKipcbiAgICAgICAqIEEgY29kZSB0byBpbmRpY2F0ZSB3aHkgdGhlIG5hdmlnYXRpb24gd2FzIGNhbmNlbGVkLiBUaGlzIGNhbmNlbGxhdGlvbiBjb2RlIGlzIHN0YWJsZSBmb3JcbiAgICAgICAqIHRoZSByZWFzb24gYW5kIGNhbiBiZSByZWxpZWQgb24gd2hlcmVhcyB0aGUgYHJlYXNvbmAgc3RyaW5nIGNvdWxkIGNoYW5nZSBhbmQgc2hvdWxkIG5vdCBiZVxuICAgICAgICogdXNlZCBpbiBwcm9kdWN0aW9uLlxuICAgICAgICovXG4gICAgICByZWFkb25seSBjb2RlPzogTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUpIHtcbiAgICBzdXBlcihpZCwgdXJsKTtcbiAgfVxuXG4gIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gIG92ZXJyaWRlIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBOYXZpZ2F0aW9uQ2FuY2VsKGlkOiAke3RoaXMuaWR9LCB1cmw6ICcke3RoaXMudXJsfScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCB3aGVuIGEgbmF2aWdhdGlvbiBmYWlscyBkdWUgdG8gYW4gdW5leHBlY3RlZCBlcnJvci5cbiAqXG4gKiBAc2VlIGBOYXZpZ2F0aW9uU3RhcnRgXG4gKiBAc2VlIGBOYXZpZ2F0aW9uRW5kYFxuICogQHNlZSBgTmF2aWdhdGlvbkNhbmNlbGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBOYXZpZ2F0aW9uRXJyb3IgZXh0ZW5kcyBSb3V0ZXJFdmVudCB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFdmVudFR5cGUuTmF2aWdhdGlvbkVycm9yO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIGVycm9yOiBhbnksXG4gICAgICAvKipcbiAgICAgICAqIFRoZSB0YXJnZXQgb2YgdGhlIG5hdmlnYXRpb24gd2hlbiB0aGUgZXJyb3Igb2NjdXJyZWQuXG4gICAgICAgKlxuICAgICAgICogTm90ZSB0aGF0IHRoaXMgY2FuIGJlIGB1bmRlZmluZWRgIGJlY2F1c2UgYW4gZXJyb3IgY291bGQgaGF2ZSBvY2N1cnJlZCBiZWZvcmUgdGhlXG4gICAgICAgKiBgUm91dGVyU3RhdGVTbmFwc2hvdGAgd2FzIGNyZWF0ZWQgZm9yIHRoZSBuYXZpZ2F0aW9uLlxuICAgICAgICovXG4gICAgICByZWFkb25seSB0YXJnZXQ/OiBSb3V0ZXJTdGF0ZVNuYXBzaG90KSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICBvdmVycmlkZSB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgTmF2aWdhdGlvbkVycm9yKGlkOiAke3RoaXMuaWR9LCB1cmw6ICcke3RoaXMudXJsfScsIGVycm9yOiAke3RoaXMuZXJyb3J9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgd2hlbiByb3V0ZXMgYXJlIHJlY29nbml6ZWQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgUm91dGVzUmVjb2duaXplZCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5Sb3V0ZXNSZWNvZ25pemVkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHVybEFmdGVyUmVkaXJlY3RzOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90KSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICBvdmVycmlkZSB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgUm91dGVzUmVjb2duaXplZChpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nLCB1cmxBZnRlclJlZGlyZWN0czogJyR7XG4gICAgICAgIHRoaXMudXJsQWZ0ZXJSZWRpcmVjdHN9Jywgc3RhdGU6ICR7dGhpcy5zdGF0ZX0pYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCBhdCB0aGUgc3RhcnQgb2YgdGhlIEd1YXJkIHBoYXNlIG9mIHJvdXRpbmcuXG4gKlxuICogQHNlZSBgR3VhcmRzQ2hlY2tFbmRgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgR3VhcmRzQ2hlY2tTdGFydCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5HdWFyZHNDaGVja1N0YXJ0O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHVybEFmdGVyUmVkaXJlY3RzOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90KSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICBvdmVycmlkZSB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgR3VhcmRzQ2hlY2tTdGFydChpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nLCB1cmxBZnRlclJlZGlyZWN0czogJyR7XG4gICAgICAgIHRoaXMudXJsQWZ0ZXJSZWRpcmVjdHN9Jywgc3RhdGU6ICR7dGhpcy5zdGF0ZX0pYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCBhdCB0aGUgZW5kIG9mIHRoZSBHdWFyZCBwaGFzZSBvZiByb3V0aW5nLlxuICpcbiAqIEBzZWUgYEd1YXJkc0NoZWNrU3RhcnRgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgR3VhcmRzQ2hlY2tFbmQgZXh0ZW5kcyBSb3V0ZXJFdmVudCB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFdmVudFR5cGUuR3VhcmRzQ2hlY2tFbmQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgdXJsQWZ0ZXJSZWRpcmVjdHM6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgc3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHNob3VsZEFjdGl2YXRlOiBib29sZWFuKSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICBvdmVycmlkZSB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgR3VhcmRzQ2hlY2tFbmQoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke1xuICAgICAgICB0aGlzLnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3RoaXMuc3RhdGV9LCBzaG91bGRBY3RpdmF0ZTogJHt0aGlzLnNob3VsZEFjdGl2YXRlfSlgO1xuICB9XG59XG5cbi8qKlxuICogQW4gZXZlbnQgdHJpZ2dlcmVkIGF0IHRoZSBzdGFydCBvZiB0aGUgUmVzb2x2ZSBwaGFzZSBvZiByb3V0aW5nLlxuICpcbiAqIFJ1bnMgaW4gdGhlIFwicmVzb2x2ZVwiIHBoYXNlIHdoZXRoZXIgb3Igbm90IHRoZXJlIGlzIGFueXRoaW5nIHRvIHJlc29sdmUuXG4gKiBJbiBmdXR1cmUsIG1heSBjaGFuZ2UgdG8gb25seSBydW4gd2hlbiB0aGVyZSBhcmUgdGhpbmdzIHRvIGJlIHJlc29sdmVkLlxuICpcbiAqIEBzZWUgYFJlc29sdmVFbmRgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgUmVzb2x2ZVN0YXJ0IGV4dGVuZHMgUm91dGVyRXZlbnQge1xuICByZWFkb25seSB0eXBlID0gRXZlbnRUeXBlLlJlc29sdmVTdGFydDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBpZDogbnVtYmVyLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHVybDogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyB1cmxBZnRlclJlZGlyZWN0czogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCkge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgb3ZlcnJpZGUgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFJlc29sdmVTdGFydChpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nLCB1cmxBZnRlclJlZGlyZWN0czogJyR7XG4gICAgICAgIHRoaXMudXJsQWZ0ZXJSZWRpcmVjdHN9Jywgc3RhdGU6ICR7dGhpcy5zdGF0ZX0pYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCBhdCB0aGUgZW5kIG9mIHRoZSBSZXNvbHZlIHBoYXNlIG9mIHJvdXRpbmcuXG4gKiBAc2VlIGBSZXNvbHZlU3RhcnRgLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFJlc29sdmVFbmQgZXh0ZW5kcyBSb3V0ZXJFdmVudCB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFdmVudFR5cGUuUmVzb2x2ZUVuZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBpZDogbnVtYmVyLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHVybDogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyB1cmxBZnRlclJlZGlyZWN0czogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCkge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgb3ZlcnJpZGUgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFJlc29sdmVFbmQoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke1xuICAgICAgICB0aGlzLnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3RoaXMuc3RhdGV9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgYmVmb3JlIGxhenkgbG9hZGluZyBhIHJvdXRlIGNvbmZpZ3VyYXRpb24uXG4gKlxuICogQHNlZSBgUm91dGVDb25maWdMb2FkRW5kYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlQ29uZmlnTG9hZFN0YXJ0IHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5Sb3V0ZUNvbmZpZ0xvYWRTdGFydDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgcm91dGU6IFJvdXRlKSB7fVxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgUm91dGVDb25maWdMb2FkU3RhcnQocGF0aDogJHt0aGlzLnJvdXRlLnBhdGh9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgd2hlbiBhIHJvdXRlIGhhcyBiZWVuIGxhenkgbG9hZGVkLlxuICpcbiAqIEBzZWUgYFJvdXRlQ29uZmlnTG9hZFN0YXJ0YFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlQ29uZmlnTG9hZEVuZCB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFdmVudFR5cGUuUm91dGVDb25maWdMb2FkRW5kO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyByb3V0ZTogUm91dGUpIHt9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBSb3V0ZUNvbmZpZ0xvYWRFbmQocGF0aDogJHt0aGlzLnJvdXRlLnBhdGh9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgYXQgdGhlIHN0YXJ0IG9mIHRoZSBjaGlsZC1hY3RpdmF0aW9uXG4gKiBwYXJ0IG9mIHRoZSBSZXNvbHZlIHBoYXNlIG9mIHJvdXRpbmcuXG4gKiBAc2VlICBgQ2hpbGRBY3RpdmF0aW9uRW5kYFxuICogQHNlZSBgUmVzb2x2ZVN0YXJ0YFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIENoaWxkQWN0aXZhdGlvblN0YXJ0IHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5DaGlsZEFjdGl2YXRpb25TdGFydDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgc25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpIHt9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgY29uc3QgcGF0aCA9IHRoaXMuc25hcHNob3Qucm91dGVDb25maWcgJiYgdGhpcy5zbmFwc2hvdC5yb3V0ZUNvbmZpZy5wYXRoIHx8ICcnO1xuICAgIHJldHVybiBgQ2hpbGRBY3RpdmF0aW9uU3RhcnQocGF0aDogJyR7cGF0aH0nKWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgYXQgdGhlIGVuZCBvZiB0aGUgY2hpbGQtYWN0aXZhdGlvbiBwYXJ0XG4gKiBvZiB0aGUgUmVzb2x2ZSBwaGFzZSBvZiByb3V0aW5nLlxuICogQHNlZSBgQ2hpbGRBY3RpdmF0aW9uU3RhcnRgXG4gKiBAc2VlIGBSZXNvbHZlU3RhcnRgXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBDaGlsZEFjdGl2YXRpb25FbmQge1xuICByZWFkb25seSB0eXBlID0gRXZlbnRUeXBlLkNoaWxkQWN0aXZhdGlvbkVuZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgc25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpIHt9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgY29uc3QgcGF0aCA9IHRoaXMuc25hcHNob3Qucm91dGVDb25maWcgJiYgdGhpcy5zbmFwc2hvdC5yb3V0ZUNvbmZpZy5wYXRoIHx8ICcnO1xuICAgIHJldHVybiBgQ2hpbGRBY3RpdmF0aW9uRW5kKHBhdGg6ICcke3BhdGh9JylgO1xuICB9XG59XG5cbi8qKlxuICogQW4gZXZlbnQgdHJpZ2dlcmVkIGF0IHRoZSBzdGFydCBvZiB0aGUgYWN0aXZhdGlvbiBwYXJ0XG4gKiBvZiB0aGUgUmVzb2x2ZSBwaGFzZSBvZiByb3V0aW5nLlxuICogQHNlZSBgQWN0aXZhdGlvbkVuZGBcbiAqIEBzZWUgYFJlc29sdmVTdGFydGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBBY3RpdmF0aW9uU3RhcnQge1xuICByZWFkb25seSB0eXBlID0gRXZlbnRUeXBlLkFjdGl2YXRpb25TdGFydDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgc25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpIHt9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgY29uc3QgcGF0aCA9IHRoaXMuc25hcHNob3Qucm91dGVDb25maWcgJiYgdGhpcy5zbmFwc2hvdC5yb3V0ZUNvbmZpZy5wYXRoIHx8ICcnO1xuICAgIHJldHVybiBgQWN0aXZhdGlvblN0YXJ0KHBhdGg6ICcke3BhdGh9JylgO1xuICB9XG59XG5cbi8qKlxuICogQW4gZXZlbnQgdHJpZ2dlcmVkIGF0IHRoZSBlbmQgb2YgdGhlIGFjdGl2YXRpb24gcGFydFxuICogb2YgdGhlIFJlc29sdmUgcGhhc2Ugb2Ygcm91dGluZy5cbiAqIEBzZWUgYEFjdGl2YXRpb25TdGFydGBcbiAqIEBzZWUgYFJlc29sdmVTdGFydGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBBY3RpdmF0aW9uRW5kIHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5BY3RpdmF0aW9uRW5kO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCkge31cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy5zbmFwc2hvdC5yb3V0ZUNvbmZpZyAmJiB0aGlzLnNuYXBzaG90LnJvdXRlQ29uZmlnLnBhdGggfHwgJyc7XG4gICAgcmV0dXJuIGBBY3RpdmF0aW9uRW5kKHBhdGg6ICcke3BhdGh9JylgO1xuICB9XG59XG5cbi8qKlxuICogQW4gZXZlbnQgdHJpZ2dlcmVkIGJ5IHNjcm9sbGluZy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBTY3JvbGwge1xuICByZWFkb25seSB0eXBlID0gRXZlbnRUeXBlLlNjcm9sbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICByZWFkb25seSByb3V0ZXJFdmVudDogTmF2aWdhdGlvbkVuZCxcblxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHJlYWRvbmx5IHBvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdfG51bGwsXG5cbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICByZWFkb25seSBhbmNob3I6IHN0cmluZ3xudWxsKSB7fVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgY29uc3QgcG9zID0gdGhpcy5wb3NpdGlvbiA/IGAke3RoaXMucG9zaXRpb25bMF19LCAke3RoaXMucG9zaXRpb25bMV19YCA6IG51bGw7XG4gICAgcmV0dXJuIGBTY3JvbGwoYW5jaG9yOiAnJHt0aGlzLmFuY2hvcn0nLCBwb3NpdGlvbjogJyR7cG9zfScpYDtcbiAgfVxufVxuXG4vKipcbiAqIFJvdXRlciBldmVudHMgdGhhdCBhbGxvdyB5b3UgdG8gdHJhY2sgdGhlIGxpZmVjeWNsZSBvZiB0aGUgcm91dGVyLlxuICpcbiAqIFRoZSBldmVudHMgb2NjdXIgaW4gdGhlIGZvbGxvd2luZyBzZXF1ZW5jZTpcbiAqXG4gKiAqIFtOYXZpZ2F0aW9uU3RhcnRdKGFwaS9yb3V0ZXIvTmF2aWdhdGlvblN0YXJ0KTogTmF2aWdhdGlvbiBzdGFydHMuXG4gKiAqIFtSb3V0ZUNvbmZpZ0xvYWRTdGFydF0oYXBpL3JvdXRlci9Sb3V0ZUNvbmZpZ0xvYWRTdGFydCk6IEJlZm9yZVxuICogdGhlIHJvdXRlciBbbGF6eSBsb2Fkc10oL2d1aWRlL3JvdXRlciNsYXp5LWxvYWRpbmcpIGEgcm91dGUgY29uZmlndXJhdGlvbi5cbiAqICogW1JvdXRlQ29uZmlnTG9hZEVuZF0oYXBpL3JvdXRlci9Sb3V0ZUNvbmZpZ0xvYWRFbmQpOiBBZnRlciBhIHJvdXRlIGhhcyBiZWVuIGxhenkgbG9hZGVkLlxuICogKiBbUm91dGVzUmVjb2duaXplZF0oYXBpL3JvdXRlci9Sb3V0ZXNSZWNvZ25pemVkKTogV2hlbiB0aGUgcm91dGVyIHBhcnNlcyB0aGUgVVJMXG4gKiBhbmQgdGhlIHJvdXRlcyBhcmUgcmVjb2duaXplZC5cbiAqICogW0d1YXJkc0NoZWNrU3RhcnRdKGFwaS9yb3V0ZXIvR3VhcmRzQ2hlY2tTdGFydCk6IFdoZW4gdGhlIHJvdXRlciBiZWdpbnMgdGhlICpndWFyZHMqXG4gKiBwaGFzZSBvZiByb3V0aW5nLlxuICogKiBbQ2hpbGRBY3RpdmF0aW9uU3RhcnRdKGFwaS9yb3V0ZXIvQ2hpbGRBY3RpdmF0aW9uU3RhcnQpOiBXaGVuIHRoZSByb3V0ZXJcbiAqIGJlZ2lucyBhY3RpdmF0aW5nIGEgcm91dGUncyBjaGlsZHJlbi5cbiAqICogW0FjdGl2YXRpb25TdGFydF0oYXBpL3JvdXRlci9BY3RpdmF0aW9uU3RhcnQpOiBXaGVuIHRoZSByb3V0ZXIgYmVnaW5zIGFjdGl2YXRpbmcgYSByb3V0ZS5cbiAqICogW0d1YXJkc0NoZWNrRW5kXShhcGkvcm91dGVyL0d1YXJkc0NoZWNrRW5kKTogV2hlbiB0aGUgcm91dGVyIGZpbmlzaGVzIHRoZSAqZ3VhcmRzKlxuICogcGhhc2Ugb2Ygcm91dGluZyBzdWNjZXNzZnVsbHkuXG4gKiAqIFtSZXNvbHZlU3RhcnRdKGFwaS9yb3V0ZXIvUmVzb2x2ZVN0YXJ0KTogV2hlbiB0aGUgcm91dGVyIGJlZ2lucyB0aGUgKnJlc29sdmUqXG4gKiBwaGFzZSBvZiByb3V0aW5nLlxuICogKiBbUmVzb2x2ZUVuZF0oYXBpL3JvdXRlci9SZXNvbHZlRW5kKTogV2hlbiB0aGUgcm91dGVyIGZpbmlzaGVzIHRoZSAqcmVzb2x2ZSpcbiAqIHBoYXNlIG9mIHJvdXRpbmcgc3VjY2Vzc2Z1bGx5LlxuICogKiBbQ2hpbGRBY3RpdmF0aW9uRW5kXShhcGkvcm91dGVyL0NoaWxkQWN0aXZhdGlvbkVuZCk6IFdoZW4gdGhlIHJvdXRlciBmaW5pc2hlc1xuICogYWN0aXZhdGluZyBhIHJvdXRlJ3MgY2hpbGRyZW4uXG4gKiAqIFtBY3RpdmF0aW9uRW5kXShhcGkvcm91dGVyL0FjdGl2YXRpb25FbmQpOiBXaGVuIHRoZSByb3V0ZXIgZmluaXNoZXMgYWN0aXZhdGluZyBhIHJvdXRlLlxuICogKiBbTmF2aWdhdGlvbkVuZF0oYXBpL3JvdXRlci9OYXZpZ2F0aW9uRW5kKTogV2hlbiBuYXZpZ2F0aW9uIGVuZHMgc3VjY2Vzc2Z1bGx5LlxuICogKiBbTmF2aWdhdGlvbkNhbmNlbF0oYXBpL3JvdXRlci9OYXZpZ2F0aW9uQ2FuY2VsKTogV2hlbiBuYXZpZ2F0aW9uIGlzIGNhbmNlbGVkLlxuICogKiBbTmF2aWdhdGlvbkVycm9yXShhcGkvcm91dGVyL05hdmlnYXRpb25FcnJvcik6IFdoZW4gbmF2aWdhdGlvbiBmYWlsc1xuICogZHVlIHRvIGFuIHVuZXhwZWN0ZWQgZXJyb3IuXG4gKiAqIFtTY3JvbGxdKGFwaS9yb3V0ZXIvU2Nyb2xsKTogV2hlbiB0aGUgdXNlciBzY3JvbGxzLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgRXZlbnQgPVxuICAgIFJvdXRlckV2ZW50fE5hdmlnYXRpb25TdGFydHxOYXZpZ2F0aW9uRW5kfE5hdmlnYXRpb25DYW5jZWx8TmF2aWdhdGlvbkVycm9yfFJvdXRlc1JlY29nbml6ZWR8XG4gICAgR3VhcmRzQ2hlY2tTdGFydHxHdWFyZHNDaGVja0VuZHxSb3V0ZUNvbmZpZ0xvYWRTdGFydHxSb3V0ZUNvbmZpZ0xvYWRFbmR8Q2hpbGRBY3RpdmF0aW9uU3RhcnR8XG4gICAgQ2hpbGRBY3RpdmF0aW9uRW5kfEFjdGl2YXRpb25TdGFydHxBY3RpdmF0aW9uRW5kfFNjcm9sbHxSZXNvbHZlU3RhcnR8UmVzb2x2ZUVuZDtcblxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5naWZ5RXZlbnQocm91dGVyRXZlbnQ6IEV2ZW50KTogc3RyaW5nIHtcbiAgaWYgKCEoJ3R5cGUnIGluIHJvdXRlckV2ZW50KSkge1xuICAgIHJldHVybiBgVW5rbm93biBSb3V0ZXIgRXZlbnQ6ICR7cm91dGVyRXZlbnQuY29uc3RydWN0b3IubmFtZX1gO1xuICB9XG4gIHN3aXRjaCAocm91dGVyRXZlbnQudHlwZSkge1xuICAgIGNhc2UgRXZlbnRUeXBlLkFjdGl2YXRpb25FbmQ6XG4gICAgICByZXR1cm4gYEFjdGl2YXRpb25FbmQocGF0aDogJyR7cm91dGVyRXZlbnQuc25hcHNob3Qucm91dGVDb25maWc/LnBhdGggfHwgJyd9JylgO1xuICAgIGNhc2UgRXZlbnRUeXBlLkFjdGl2YXRpb25TdGFydDpcbiAgICAgIHJldHVybiBgQWN0aXZhdGlvblN0YXJ0KHBhdGg6ICcke3JvdXRlckV2ZW50LnNuYXBzaG90LnJvdXRlQ29uZmlnPy5wYXRoIHx8ICcnfScpYDtcbiAgICBjYXNlIEV2ZW50VHlwZS5DaGlsZEFjdGl2YXRpb25FbmQ6XG4gICAgICByZXR1cm4gYENoaWxkQWN0aXZhdGlvbkVuZChwYXRoOiAnJHtyb3V0ZXJFdmVudC5zbmFwc2hvdC5yb3V0ZUNvbmZpZz8ucGF0aCB8fCAnJ30nKWA7XG4gICAgY2FzZSBFdmVudFR5cGUuQ2hpbGRBY3RpdmF0aW9uU3RhcnQ6XG4gICAgICByZXR1cm4gYENoaWxkQWN0aXZhdGlvblN0YXJ0KHBhdGg6ICcke3JvdXRlckV2ZW50LnNuYXBzaG90LnJvdXRlQ29uZmlnPy5wYXRoIHx8ICcnfScpYDtcbiAgICBjYXNlIEV2ZW50VHlwZS5HdWFyZHNDaGVja0VuZDpcbiAgICAgIHJldHVybiBgR3VhcmRzQ2hlY2tFbmQoaWQ6ICR7cm91dGVyRXZlbnQuaWR9LCB1cmw6ICcke1xuICAgICAgICAgIHJvdXRlckV2ZW50LnVybH0nLCB1cmxBZnRlclJlZGlyZWN0czogJyR7cm91dGVyRXZlbnQudXJsQWZ0ZXJSZWRpcmVjdHN9Jywgc3RhdGU6ICR7XG4gICAgICAgICAgcm91dGVyRXZlbnQuc3RhdGV9LCBzaG91bGRBY3RpdmF0ZTogJHtyb3V0ZXJFdmVudC5zaG91bGRBY3RpdmF0ZX0pYDtcbiAgICBjYXNlIEV2ZW50VHlwZS5HdWFyZHNDaGVja1N0YXJ0OlxuICAgICAgcmV0dXJuIGBHdWFyZHNDaGVja1N0YXJ0KGlkOiAke3JvdXRlckV2ZW50LmlkfSwgdXJsOiAnJHtcbiAgICAgICAgICByb3V0ZXJFdmVudC51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke3JvdXRlckV2ZW50LnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke1xuICAgICAgICAgIHJvdXRlckV2ZW50LnN0YXRlfSlgO1xuICAgIGNhc2UgRXZlbnRUeXBlLk5hdmlnYXRpb25DYW5jZWw6XG4gICAgICByZXR1cm4gYE5hdmlnYXRpb25DYW5jZWwoaWQ6ICR7cm91dGVyRXZlbnQuaWR9LCB1cmw6ICcke3JvdXRlckV2ZW50LnVybH0nKWA7XG4gICAgY2FzZSBFdmVudFR5cGUuTmF2aWdhdGlvbkVuZDpcbiAgICAgIHJldHVybiBgTmF2aWdhdGlvbkVuZChpZDogJHtyb3V0ZXJFdmVudC5pZH0sIHVybDogJyR7cm91dGVyRXZlbnQudXJsfScsIHVybEFmdGVyUmVkaXJlY3RzOiAnJHtcbiAgICAgICAgICByb3V0ZXJFdmVudC51cmxBZnRlclJlZGlyZWN0c30nKWA7XG4gICAgY2FzZSBFdmVudFR5cGUuTmF2aWdhdGlvbkVycm9yOlxuICAgICAgcmV0dXJuIGBOYXZpZ2F0aW9uRXJyb3IoaWQ6ICR7cm91dGVyRXZlbnQuaWR9LCB1cmw6ICcke3JvdXRlckV2ZW50LnVybH0nLCBlcnJvcjogJHtcbiAgICAgICAgICByb3V0ZXJFdmVudC5lcnJvcn0pYDtcbiAgICBjYXNlIEV2ZW50VHlwZS5OYXZpZ2F0aW9uU3RhcnQ6XG4gICAgICByZXR1cm4gYE5hdmlnYXRpb25TdGFydChpZDogJHtyb3V0ZXJFdmVudC5pZH0sIHVybDogJyR7cm91dGVyRXZlbnQudXJsfScpYDtcbiAgICBjYXNlIEV2ZW50VHlwZS5SZXNvbHZlRW5kOlxuICAgICAgcmV0dXJuIGBSZXNvbHZlRW5kKGlkOiAke3JvdXRlckV2ZW50LmlkfSwgdXJsOiAnJHtyb3V0ZXJFdmVudC51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke1xuICAgICAgICAgIHJvdXRlckV2ZW50LnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3JvdXRlckV2ZW50LnN0YXRlfSlgO1xuICAgIGNhc2UgRXZlbnRUeXBlLlJlc29sdmVTdGFydDpcbiAgICAgIHJldHVybiBgUmVzb2x2ZVN0YXJ0KGlkOiAke3JvdXRlckV2ZW50LmlkfSwgdXJsOiAnJHtyb3V0ZXJFdmVudC51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke1xuICAgICAgICAgIHJvdXRlckV2ZW50LnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3JvdXRlckV2ZW50LnN0YXRlfSlgO1xuICAgIGNhc2UgRXZlbnRUeXBlLlJvdXRlQ29uZmlnTG9hZEVuZDpcbiAgICAgIHJldHVybiBgUm91dGVDb25maWdMb2FkRW5kKHBhdGg6ICR7cm91dGVyRXZlbnQucm91dGUucGF0aH0pYDtcbiAgICBjYXNlIEV2ZW50VHlwZS5Sb3V0ZUNvbmZpZ0xvYWRTdGFydDpcbiAgICAgIHJldHVybiBgUm91dGVDb25maWdMb2FkU3RhcnQocGF0aDogJHtyb3V0ZXJFdmVudC5yb3V0ZS5wYXRofSlgO1xuICAgIGNhc2UgRXZlbnRUeXBlLlJvdXRlc1JlY29nbml6ZWQ6XG4gICAgICByZXR1cm4gYFJvdXRlc1JlY29nbml6ZWQoaWQ6ICR7cm91dGVyRXZlbnQuaWR9LCB1cmw6ICcke1xuICAgICAgICAgIHJvdXRlckV2ZW50LnVybH0nLCB1cmxBZnRlclJlZGlyZWN0czogJyR7cm91dGVyRXZlbnQudXJsQWZ0ZXJSZWRpcmVjdHN9Jywgc3RhdGU6ICR7XG4gICAgICAgICAgcm91dGVyRXZlbnQuc3RhdGV9KWA7XG4gICAgY2FzZSBFdmVudFR5cGUuU2Nyb2xsOlxuICAgICAgY29uc3QgcG9zID1cbiAgICAgICAgICByb3V0ZXJFdmVudC5wb3NpdGlvbiA/IGAke3JvdXRlckV2ZW50LnBvc2l0aW9uWzBdfSwgJHtyb3V0ZXJFdmVudC5wb3NpdGlvblsxXX1gIDogbnVsbDtcbiAgICAgIHJldHVybiBgU2Nyb2xsKGFuY2hvcjogJyR7cm91dGVyRXZlbnQuYW5jaG9yfScsIHBvc2l0aW9uOiAnJHtwb3N9JylgO1xuICB9XG59XG4iXX0=