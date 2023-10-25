/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export const IMPERATIVE_NAVIGATION = 'imperative';
/**
 * Identifies the type of a router event.
 *
 * @publicApi
 */
export var EventType;
(function (EventType) {
    EventType[EventType["NavigationStart"] = 0] = "NavigationStart";
    EventType[EventType["NavigationEnd"] = 1] = "NavigationEnd";
    EventType[EventType["NavigationCancel"] = 2] = "NavigationCancel";
    EventType[EventType["NavigationError"] = 3] = "NavigationError";
    EventType[EventType["RoutesRecognized"] = 4] = "RoutesRecognized";
    EventType[EventType["ResolveStart"] = 5] = "ResolveStart";
    EventType[EventType["ResolveEnd"] = 6] = "ResolveEnd";
    EventType[EventType["GuardsCheckStart"] = 7] = "GuardsCheckStart";
    EventType[EventType["GuardsCheckEnd"] = 8] = "GuardsCheckEnd";
    EventType[EventType["RouteConfigLoadStart"] = 9] = "RouteConfigLoadStart";
    EventType[EventType["RouteConfigLoadEnd"] = 10] = "RouteConfigLoadEnd";
    EventType[EventType["ChildActivationStart"] = 11] = "ChildActivationStart";
    EventType[EventType["ChildActivationEnd"] = 12] = "ChildActivationEnd";
    EventType[EventType["ActivationStart"] = 13] = "ActivationStart";
    EventType[EventType["ActivationEnd"] = 14] = "ActivationEnd";
    EventType[EventType["Scroll"] = 15] = "Scroll";
    EventType[EventType["NavigationSkipped"] = 16] = "NavigationSkipped";
})(EventType || (EventType = {}));
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
 *        filter((e: Event | RouterEvent): e is RouterEvent => e instanceof RouterEvent)
 *     ).subscribe((e: RouterEvent) => {
 *       // Do something
 *     });
 *   }
 * }
 * ```
 *
 * @see {@link Event}
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
        this.type = EventType.NavigationStart;
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
 * @see {@link NavigationStart}
 * @see {@link NavigationCancel}
 * @see {@link NavigationError}
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
        this.type = EventType.NavigationEnd;
    }
    /** @docsNotRequired */
    toString() {
        return `NavigationEnd(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}')`;
    }
}
/**
 * A code for the `NavigationCancel` event of the `Router` to indicate the
 * reason a navigation failed.
 *
 * @publicApi
 */
export var NavigationCancellationCode;
(function (NavigationCancellationCode) {
    /**
     * A navigation failed because a guard returned a `UrlTree` to redirect.
     */
    NavigationCancellationCode[NavigationCancellationCode["Redirect"] = 0] = "Redirect";
    /**
     * A navigation failed because a more recent navigation started.
     */
    NavigationCancellationCode[NavigationCancellationCode["SupersededByNewNavigation"] = 1] = "SupersededByNewNavigation";
    /**
     * A navigation failed because one of the resolvers completed without emitting a value.
     */
    NavigationCancellationCode[NavigationCancellationCode["NoDataFromResolver"] = 2] = "NoDataFromResolver";
    /**
     * A navigation failed because a guard returned `false`.
     */
    NavigationCancellationCode[NavigationCancellationCode["GuardRejected"] = 3] = "GuardRejected";
})(NavigationCancellationCode || (NavigationCancellationCode = {}));
/**
 * A code for the `NavigationSkipped` event of the `Router` to indicate the
 * reason a navigation was skipped.
 *
 * @publicApi
 */
export var NavigationSkippedCode;
(function (NavigationSkippedCode) {
    /**
     * A navigation was skipped because the navigation URL was the same as the current Router URL.
     */
    NavigationSkippedCode[NavigationSkippedCode["IgnoredSameUrlNavigation"] = 0] = "IgnoredSameUrlNavigation";
    /**
     * A navigation was skipped because the configured `UrlHandlingStrategy` return `false` for both
     * the current Router URL and the target of the navigation.
     *
     * @see {@link UrlHandlingStrategy}
     */
    NavigationSkippedCode[NavigationSkippedCode["IgnoredByUrlHandlingStrategy"] = 1] = "IgnoredByUrlHandlingStrategy";
})(NavigationSkippedCode || (NavigationSkippedCode = {}));
/**
 * An event triggered when a navigation is canceled, directly or indirectly.
 * This can happen for several reasons including when a route guard
 * returns `false` or initiates a redirect by returning a `UrlTree`.
 *
 * @see {@link NavigationStart}
 * @see {@link NavigationEnd}
 * @see {@link NavigationError}
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
        this.type = EventType.NavigationCancel;
    }
    /** @docsNotRequired */
    toString() {
        return `NavigationCancel(id: ${this.id}, url: '${this.url}')`;
    }
}
/**
 * An event triggered when a navigation is skipped.
 * This can happen for a couple reasons including onSameUrlHandling
 * is set to `ignore` and the navigation URL is not different than the
 * current state.
 *
 * @publicApi
 */
export class NavigationSkipped extends RouterEvent {
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /**
     * A description of why the navigation was skipped. For debug purposes only. Use `code`
     * instead for a stable skipped reason that can be used in production.
     */
    reason, 
    /**
     * A code to indicate why the navigation was skipped. This code is stable for
     * the reason and can be relied on whereas the `reason` string could change and should not be
     * used in production.
     */
    code) {
        super(id, url);
        this.reason = reason;
        this.code = code;
        this.type = EventType.NavigationSkipped;
    }
}
/**
 * An event triggered when a navigation fails due to an unexpected error.
 *
 * @see {@link NavigationStart}
 * @see {@link NavigationEnd}
 * @see {@link NavigationCancel}
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
        this.type = EventType.NavigationError;
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
        this.type = EventType.RoutesRecognized;
    }
    /** @docsNotRequired */
    toString() {
        return `RoutesRecognized(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`;
    }
}
/**
 * An event triggered at the start of the Guard phase of routing.
 *
 * @see {@link GuardsCheckEnd}
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
        this.type = EventType.GuardsCheckStart;
    }
    toString() {
        return `GuardsCheckStart(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`;
    }
}
/**
 * An event triggered at the end of the Guard phase of routing.
 *
 * @see {@link GuardsCheckStart}
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
        this.type = EventType.GuardsCheckEnd;
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
 * @see {@link ResolveEnd}
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
        this.type = EventType.ResolveStart;
    }
    toString() {
        return `ResolveStart(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`;
    }
}
/**
 * An event triggered at the end of the Resolve phase of routing.
 * @see {@link ResolveStart}
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
        this.type = EventType.ResolveEnd;
    }
    toString() {
        return `ResolveEnd(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`;
    }
}
/**
 * An event triggered before lazy loading a route configuration.
 *
 * @see {@link RouteConfigLoadEnd}
 *
 * @publicApi
 */
export class RouteConfigLoadStart {
    constructor(
    /** @docsNotRequired */
    route) {
        this.route = route;
        this.type = EventType.RouteConfigLoadStart;
    }
    toString() {
        return `RouteConfigLoadStart(path: ${this.route.path})`;
    }
}
/**
 * An event triggered when a route has been lazy loaded.
 *
 * @see {@link RouteConfigLoadStart}
 *
 * @publicApi
 */
export class RouteConfigLoadEnd {
    constructor(
    /** @docsNotRequired */
    route) {
        this.route = route;
        this.type = EventType.RouteConfigLoadEnd;
    }
    toString() {
        return `RouteConfigLoadEnd(path: ${this.route.path})`;
    }
}
/**
 * An event triggered at the start of the child-activation
 * part of the Resolve phase of routing.
 * @see {@link ChildActivationEnd}
 * @see {@link ResolveStart}
 *
 * @publicApi
 */
export class ChildActivationStart {
    constructor(
    /** @docsNotRequired */
    snapshot) {
        this.snapshot = snapshot;
        this.type = EventType.ChildActivationStart;
    }
    toString() {
        const path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return `ChildActivationStart(path: '${path}')`;
    }
}
/**
 * An event triggered at the end of the child-activation part
 * of the Resolve phase of routing.
 * @see {@link ChildActivationStart}
 * @see {@link ResolveStart}
 * @publicApi
 */
export class ChildActivationEnd {
    constructor(
    /** @docsNotRequired */
    snapshot) {
        this.snapshot = snapshot;
        this.type = EventType.ChildActivationEnd;
    }
    toString() {
        const path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return `ChildActivationEnd(path: '${path}')`;
    }
}
/**
 * An event triggered at the start of the activation part
 * of the Resolve phase of routing.
 * @see {@link ActivationEnd}
 * @see {@link ResolveStart}
 *
 * @publicApi
 */
export class ActivationStart {
    constructor(
    /** @docsNotRequired */
    snapshot) {
        this.snapshot = snapshot;
        this.type = EventType.ActivationStart;
    }
    toString() {
        const path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return `ActivationStart(path: '${path}')`;
    }
}
/**
 * An event triggered at the end of the activation part
 * of the Resolve phase of routing.
 * @see {@link ActivationStart}
 * @see {@link ResolveStart}
 *
 * @publicApi
 */
export class ActivationEnd {
    constructor(
    /** @docsNotRequired */
    snapshot) {
        this.snapshot = snapshot;
        this.type = EventType.ActivationEnd;
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
        this.type = EventType.Scroll;
    }
    toString() {
        const pos = this.position ? `${this.position[0]}, ${this.position[1]}` : null;
        return `Scroll(anchor: '${this.anchor}', position: '${pos}')`;
    }
}
export class BeforeActivateRoutes {
}
export class RedirectRequest {
    constructor(url) {
        this.url = url;
    }
}
export function stringifyEvent(routerEvent) {
    switch (routerEvent.type) {
        case EventType.ActivationEnd:
            return `ActivationEnd(path: '${routerEvent.snapshot.routeConfig?.path || ''}')`;
        case EventType.ActivationStart:
            return `ActivationStart(path: '${routerEvent.snapshot.routeConfig?.path || ''}')`;
        case EventType.ChildActivationEnd:
            return `ChildActivationEnd(path: '${routerEvent.snapshot.routeConfig?.path || ''}')`;
        case EventType.ChildActivationStart:
            return `ChildActivationStart(path: '${routerEvent.snapshot.routeConfig?.path || ''}')`;
        case EventType.GuardsCheckEnd:
            return `GuardsCheckEnd(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state}, shouldActivate: ${routerEvent.shouldActivate})`;
        case EventType.GuardsCheckStart:
            return `GuardsCheckStart(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state})`;
        case EventType.NavigationCancel:
            return `NavigationCancel(id: ${routerEvent.id}, url: '${routerEvent.url}')`;
        case EventType.NavigationSkipped:
            return `NavigationSkipped(id: ${routerEvent.id}, url: '${routerEvent.url}')`;
        case EventType.NavigationEnd:
            return `NavigationEnd(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}')`;
        case EventType.NavigationError:
            return `NavigationError(id: ${routerEvent.id}, url: '${routerEvent.url}', error: ${routerEvent.error})`;
        case EventType.NavigationStart:
            return `NavigationStart(id: ${routerEvent.id}, url: '${routerEvent.url}')`;
        case EventType.ResolveEnd:
            return `ResolveEnd(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state})`;
        case EventType.ResolveStart:
            return `ResolveStart(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state})`;
        case EventType.RouteConfigLoadEnd:
            return `RouteConfigLoadEnd(path: ${routerEvent.route.path})`;
        case EventType.RouteConfigLoadStart:
            return `RouteConfigLoadStart(path: ${routerEvent.route.path})`;
        case EventType.RoutesRecognized:
            return `RoutesRecognized(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state})`;
        case EventType.Scroll:
            const pos = routerEvent.position ? `${routerEvent.position[0]}, ${routerEvent.position[1]}` : null;
            return `Scroll(anchor: '${routerEvent.anchor}', position: '${pos}')`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9ldmVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBZ0JILE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLFlBQVksQ0FBQztBQUVsRDs7OztHQUlHO0FBQ0gsTUFBTSxDQUFOLElBQVksU0FrQlg7QUFsQkQsV0FBWSxTQUFTO0lBQ25CLCtEQUFlLENBQUE7SUFDZiwyREFBYSxDQUFBO0lBQ2IsaUVBQWdCLENBQUE7SUFDaEIsK0RBQWUsQ0FBQTtJQUNmLGlFQUFnQixDQUFBO0lBQ2hCLHlEQUFZLENBQUE7SUFDWixxREFBVSxDQUFBO0lBQ1YsaUVBQWdCLENBQUE7SUFDaEIsNkRBQWMsQ0FBQTtJQUNkLHlFQUFvQixDQUFBO0lBQ3BCLHNFQUFrQixDQUFBO0lBQ2xCLDBFQUFvQixDQUFBO0lBQ3BCLHNFQUFrQixDQUFBO0lBQ2xCLGdFQUFlLENBQUE7SUFDZiw0REFBYSxDQUFBO0lBQ2IsOENBQU0sQ0FBQTtJQUNOLG9FQUFpQixDQUFBO0FBQ25CLENBQUMsRUFsQlcsU0FBUyxLQUFULFNBQVMsUUFrQnBCO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBdUJHO0FBQ0gsTUFBTSxPQUFPLFdBQVc7SUFDdEI7SUFDSSxzRUFBc0U7SUFDL0QsRUFBVTtJQUNqQiwyREFBMkQ7SUFDcEQsR0FBVztRQUZYLE9BQUUsR0FBRixFQUFFLENBQVE7UUFFVixRQUFHLEdBQUgsR0FBRyxDQUFRO0lBQUcsQ0FBQztDQUMzQjtBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxXQUFXO0lBZ0M5QztJQUNJLHVCQUF1QjtJQUN2QixFQUFVO0lBQ1YsdUJBQXVCO0lBQ3ZCLEdBQVc7SUFDWCx1QkFBdUI7SUFDdkIsb0JBQXVDLFlBQVk7SUFDbkQsdUJBQXVCO0lBQ3ZCLGdCQUErRCxJ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QVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUM7UUFDL0QsS0FBSyxTQUFTLENBQUMsb0JBQW9CO1lBQ2pDLE9BQU8sOEJBQThCLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUM7UUFDakUsS0FBSyxTQUFTLENBQUMsZ0JBQWdCO1lBQzdCLE9BQU8sd0JBQXdCLFdBQVcsQ0FBQyxFQUFFLFdBQ3pDLFdBQVcsQ0FBQyxHQUFHLDBCQUEwQixXQUFXLENBQUMsaUJBQWlCLGFBQ3RFLFdBQVcsQ0FBQyxLQUFLLEdBQUcsQ0FBQztRQUMzQixLQUFLLFNBQVMsQ0FBQyxNQUFNO1lBQ25CLE1BQU0sR0FBRyxHQUNMLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMzRixPQUFPLG1CQUFtQixXQUFXLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUM7S0FDeEU7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Um91dGV9IGZyb20gJy4vbW9kZWxzJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgUm91dGVyU3RhdGVTbmFwc2hvdH0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcblxuLyoqXG4gKiBJZGVudGlmaWVzIHRoZSBjYWxsIG9yIGV2ZW50IHRoYXQgdHJpZ2dlcmVkIGEgbmF2aWdhdGlvbi5cbiAqXG4gKiAqICdpbXBlcmF0aXZlJzogVHJpZ2dlcmVkIGJ5IGByb3V0ZXIubmF2aWdhdGVCeVVybCgpYCBvciBgcm91dGVyLm5hdmlnYXRlKClgLlxuICogKiAncG9wc3RhdGUnIDogVHJpZ2dlcmVkIGJ5IGEgYHBvcHN0YXRlYCBldmVudC5cbiAqICogJ2hhc2hjaGFuZ2UnLTogVHJpZ2dlcmVkIGJ5IGEgYGhhc2hjaGFuZ2VgIGV2ZW50LlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgTmF2aWdhdGlvblRyaWdnZXIgPSAnaW1wZXJhdGl2ZSd8J3BvcHN0YXRlJ3wnaGFzaGNoYW5nZSc7XG5leHBvcnQgY29uc3QgSU1QRVJBVElWRV9OQVZJR0FUSU9OID0gJ2ltcGVyYXRpdmUnO1xuXG4vKipcbiAqIElkZW50aWZpZXMgdGhlIHR5cGUgb2YgYSByb3V0ZXIgZXZlbnQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZW51bSBFdmVudFR5cGUge1xuICBOYXZpZ2F0aW9uU3RhcnQsXG4gIE5hdmlnYXRpb25FbmQsXG4gIE5hdmlnYXRpb25DYW5jZWwsXG4gIE5hdmlnYXRpb25FcnJvcixcbiAgUm91dGVzUmVjb2duaXplZCxcbiAgUmVzb2x2ZVN0YXJ0LFxuICBSZXNvbHZlRW5kLFxuICBHdWFyZHNDaGVja1N0YXJ0LFxuICBHdWFyZHNDaGVja0VuZCxcbiAgUm91dGVDb25maWdMb2FkU3RhcnQsXG4gIFJvdXRlQ29uZmlnTG9hZEVuZCxcbiAgQ2hpbGRBY3RpdmF0aW9uU3RhcnQsXG4gIENoaWxkQWN0aXZhdGlvbkVuZCxcbiAgQWN0aXZhdGlvblN0YXJ0LFxuICBBY3RpdmF0aW9uRW5kLFxuICBTY3JvbGwsXG4gIE5hdmlnYXRpb25Ta2lwcGVkLFxufVxuXG4vKipcbiAqIEJhc2UgZm9yIGV2ZW50cyB0aGUgcm91dGVyIGdvZXMgdGhyb3VnaCwgYXMgb3Bwb3NlZCB0byBldmVudHMgdGllZCB0byBhIHNwZWNpZmljXG4gKiByb3V0ZS4gRmlyZWQgb25lIHRpbWUgZm9yIGFueSBnaXZlbiBuYXZpZ2F0aW9uLlxuICpcbiAqIFRoZSBmb2xsb3dpbmcgY29kZSBzaG93cyBob3cgYSBjbGFzcyBzdWJzY3JpYmVzIHRvIHJvdXRlciBldmVudHMuXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7RXZlbnQsIFJvdXRlckV2ZW50LCBSb3V0ZXJ9IGZyb20gJ0Bhbmd1bGFyL3JvdXRlcic7XG4gKlxuICogY2xhc3MgTXlTZXJ2aWNlIHtcbiAqICAgY29uc3RydWN0b3IocHVibGljIHJvdXRlcjogUm91dGVyKSB7XG4gKiAgICAgcm91dGVyLmV2ZW50cy5waXBlKFxuICogICAgICAgIGZpbHRlcigoZTogRXZlbnQgfCBSb3V0ZXJFdmVudCk6IGUgaXMgUm91dGVyRXZlbnQgPT4gZSBpbnN0YW5jZW9mIFJvdXRlckV2ZW50KVxuICogICAgICkuc3Vic2NyaWJlKChlOiBSb3V0ZXJFdmVudCkgPT4ge1xuICogICAgICAgLy8gRG8gc29tZXRoaW5nXG4gKiAgICAgfSk7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBzZWUge0BsaW5rIEV2ZW50fVxuICogQHNlZSBbUm91dGVyIGV2ZW50cyBzdW1tYXJ5XShndWlkZS9yb3V0ZXItcmVmZXJlbmNlI3JvdXRlci1ldmVudHMpXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZXJFdmVudCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEEgdW5pcXVlIElEIHRoYXQgdGhlIHJvdXRlciBhc3NpZ25zIHRvIGV2ZXJ5IHJvdXRlciBuYXZpZ2F0aW9uLiAqL1xuICAgICAgcHVibGljIGlkOiBudW1iZXIsXG4gICAgICAvKiogVGhlIFVSTCB0aGF0IGlzIHRoZSBkZXN0aW5hdGlvbiBmb3IgdGhpcyBuYXZpZ2F0aW9uLiAqL1xuICAgICAgcHVibGljIHVybDogc3RyaW5nKSB7fVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCB3aGVuIGEgbmF2aWdhdGlvbiBzdGFydHMuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgTmF2aWdhdGlvblN0YXJ0IGV4dGVuZHMgUm91dGVyRXZlbnQge1xuICByZWFkb25seSB0eXBlID0gRXZlbnRUeXBlLk5hdmlnYXRpb25TdGFydDtcblxuICAvKipcbiAgICogSWRlbnRpZmllcyB0aGUgY2FsbCBvciBldmVudCB0aGF0IHRyaWdnZXJlZCB0aGUgbmF2aWdhdGlvbi5cbiAgICogQW4gYGltcGVyYXRpdmVgIHRyaWdnZXIgaXMgYSBjYWxsIHRvIGByb3V0ZXIubmF2aWdhdGVCeVVybCgpYCBvciBgcm91dGVyLm5hdmlnYXRlKClgLlxuICAgKlxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uRW5kfVxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uQ2FuY2VsfVxuICAgKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uRXJyb3J9XG4gICAqL1xuICBuYXZpZ2F0aW9uVHJpZ2dlcj86IE5hdmlnYXRpb25UcmlnZ2VyO1xuXG4gIC8qKlxuICAgKiBUaGUgbmF2aWdhdGlvbiBzdGF0ZSB0aGF0IHdhcyBwcmV2aW91c2x5IHN1cHBsaWVkIHRvIHRoZSBgcHVzaFN0YXRlYCBjYWxsLFxuICAgKiB3aGVuIHRoZSBuYXZpZ2F0aW9uIGlzIHRyaWdnZXJlZCBieSBhIGBwb3BzdGF0ZWAgZXZlbnQuIE90aGVyd2lzZSBudWxsLlxuICAgKlxuICAgKiBUaGUgc3RhdGUgb2JqZWN0IGlzIGRlZmluZWQgYnkgYE5hdmlnYXRpb25FeHRyYXNgLCBhbmQgY29udGFpbnMgYW55XG4gICAqIGRldmVsb3Blci1kZWZpbmVkIHN0YXRlIHZhbHVlLCBhcyB3ZWxsIGFzIGEgdW5pcXVlIElEIHRoYXRcbiAgICogdGhlIHJvdXRlciBhc3NpZ25zIHRvIGV2ZXJ5IHJvdXRlciB0cmFuc2l0aW9uL25hdmlnYXRpb24uXG4gICAqXG4gICAqIEZyb20gdGhlIHBlcnNwZWN0aXZlIG9mIHRoZSByb3V0ZXIsIHRoZSByb3V0ZXIgbmV2ZXIgXCJnb2VzIGJhY2tcIi5cbiAgICogV2hlbiB0aGUgdXNlciBjbGlja3Mgb24gdGhlIGJhY2sgYnV0dG9uIGluIHRoZSBicm93c2VyLFxuICAgKiBhIG5ldyBuYXZpZ2F0aW9uIElEIGlzIGNyZWF0ZWQuXG4gICAqXG4gICAqIFVzZSB0aGUgSUQgaW4gdGhpcyBwcmV2aW91cy1zdGF0ZSBvYmplY3QgdG8gZGlmZmVyZW50aWF0ZSBiZXR3ZWVuIGEgbmV3bHkgY3JlYXRlZFxuICAgKiBzdGF0ZSBhbmQgb25lIHJldHVybmVkIHRvIGJ5IGEgYHBvcHN0YXRlYCBldmVudCwgc28gdGhhdCB5b3UgY2FuIHJlc3RvcmUgc29tZVxuICAgKiByZW1lbWJlcmVkIHN0YXRlLCBzdWNoIGFzIHNjcm9sbCBwb3NpdGlvbi5cbiAgICpcbiAgICovXG4gIHJlc3RvcmVkU3RhdGU/OiB7W2s6IHN0cmluZ106IGFueSwgbmF2aWdhdGlvbklkOiBudW1iZXJ9fG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBuYXZpZ2F0aW9uVHJpZ2dlcjogTmF2aWdhdGlvblRyaWdnZXIgPSAnaW1wZXJhdGl2ZScsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcmVzdG9yZWRTdGF0ZToge1trOiBzdHJpbmddOiBhbnksIG5hdmlnYXRpb25JZDogbnVtYmVyfXxudWxsID0gbnVsbCkge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICAgIHRoaXMubmF2aWdhdGlvblRyaWdnZXIgPSBuYXZpZ2F0aW9uVHJpZ2dlcjtcbiAgICB0aGlzLnJlc3RvcmVkU3RhdGUgPSByZXN0b3JlZFN0YXRlO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgb3ZlcnJpZGUgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYE5hdmlnYXRpb25TdGFydChpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nKWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgd2hlbiBhIG5hdmlnYXRpb24gZW5kcyBzdWNjZXNzZnVsbHkuXG4gKlxuICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvblN0YXJ0fVxuICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkNhbmNlbH1cbiAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25FcnJvcn1cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBOYXZpZ2F0aW9uRW5kIGV4dGVuZHMgUm91dGVyRXZlbnQge1xuICByZWFkb25seSB0eXBlID0gRXZlbnRUeXBlLk5hdmlnYXRpb25FbmQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgdXJsQWZ0ZXJSZWRpcmVjdHM6IHN0cmluZykge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgb3ZlcnJpZGUgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYE5hdmlnYXRpb25FbmQoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke1xuICAgICAgICB0aGlzLnVybEFmdGVyUmVkaXJlY3RzfScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEEgY29kZSBmb3IgdGhlIGBOYXZpZ2F0aW9uQ2FuY2VsYCBldmVudCBvZiB0aGUgYFJvdXRlcmAgdG8gaW5kaWNhdGUgdGhlXG4gKiByZWFzb24gYSBuYXZpZ2F0aW9uIGZhaWxlZC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBlbnVtIE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlIHtcbiAgLyoqXG4gICAqIEEgbmF2aWdhdGlvbiBmYWlsZWQgYmVjYXVzZSBhIGd1YXJkIHJldHVybmVkIGEgYFVybFRyZWVgIHRvIHJlZGlyZWN0LlxuICAgKi9cbiAgUmVkaXJlY3QsXG4gIC8qKlxuICAgKiBBIG5hdmlnYXRpb24gZmFpbGVkIGJlY2F1c2UgYSBtb3JlIHJlY2VudCBuYXZpZ2F0aW9uIHN0YXJ0ZWQuXG4gICAqL1xuICBTdXBlcnNlZGVkQnlOZXdOYXZpZ2F0aW9uLFxuICAvKipcbiAgICogQSBuYXZpZ2F0aW9uIGZhaWxlZCBiZWNhdXNlIG9uZSBvZiB0aGUgcmVzb2x2ZXJzIGNvbXBsZXRlZCB3aXRob3V0IGVtaXR0aW5nIGEgdmFsdWUuXG4gICAqL1xuICBOb0RhdGFGcm9tUmVzb2x2ZXIsXG4gIC8qKlxuICAgKiBBIG5hdmlnYXRpb24gZmFpbGVkIGJlY2F1c2UgYSBndWFyZCByZXR1cm5lZCBgZmFsc2VgLlxuICAgKi9cbiAgR3VhcmRSZWplY3RlZCxcbn1cblxuLyoqXG4gKiBBIGNvZGUgZm9yIHRoZSBgTmF2aWdhdGlvblNraXBwZWRgIGV2ZW50IG9mIHRoZSBgUm91dGVyYCB0byBpbmRpY2F0ZSB0aGVcbiAqIHJlYXNvbiBhIG5hdmlnYXRpb24gd2FzIHNraXBwZWQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZW51bSBOYXZpZ2F0aW9uU2tpcHBlZENvZGUge1xuICAvKipcbiAgICogQSBuYXZpZ2F0aW9uIHdhcyBza2lwcGVkIGJlY2F1c2UgdGhlIG5hdmlnYXRpb24gVVJMIHdhcyB0aGUgc2FtZSBhcyB0aGUgY3VycmVudCBSb3V0ZXIgVVJMLlxuICAgKi9cbiAgSWdub3JlZFNhbWVVcmxOYXZpZ2F0aW9uLFxuICAvKipcbiAgICogQSBuYXZpZ2F0aW9uIHdhcyBza2lwcGVkIGJlY2F1c2UgdGhlIGNvbmZpZ3VyZWQgYFVybEhhbmRsaW5nU3RyYXRlZ3lgIHJldHVybiBgZmFsc2VgIGZvciBib3RoXG4gICAqIHRoZSBjdXJyZW50IFJvdXRlciBVUkwgYW5kIHRoZSB0YXJnZXQgb2YgdGhlIG5hdmlnYXRpb24uXG4gICAqXG4gICAqIEBzZWUge0BsaW5rIFVybEhhbmRsaW5nU3RyYXRlZ3l9XG4gICAqL1xuICBJZ25vcmVkQnlVcmxIYW5kbGluZ1N0cmF0ZWd5LFxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCB3aGVuIGEgbmF2aWdhdGlvbiBpcyBjYW5jZWxlZCwgZGlyZWN0bHkgb3IgaW5kaXJlY3RseS5cbiAqIFRoaXMgY2FuIGhhcHBlbiBmb3Igc2V2ZXJhbCByZWFzb25zIGluY2x1ZGluZyB3aGVuIGEgcm91dGUgZ3VhcmRcbiAqIHJldHVybnMgYGZhbHNlYCBvciBpbml0aWF0ZXMgYSByZWRpcmVjdCBieSByZXR1cm5pbmcgYSBgVXJsVHJlZWAuXG4gKlxuICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvblN0YXJ0fVxuICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkVuZH1cbiAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25FcnJvcn1cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBOYXZpZ2F0aW9uQ2FuY2VsIGV4dGVuZHMgUm91dGVyRXZlbnQge1xuICByZWFkb25seSB0eXBlID0gRXZlbnRUeXBlLk5hdmlnYXRpb25DYW5jZWw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKlxuICAgICAgICogQSBkZXNjcmlwdGlvbiBvZiB3aHkgdGhlIG5hdmlnYXRpb24gd2FzIGNhbmNlbGxlZC4gRm9yIGRlYnVnIHB1cnBvc2VzIG9ubHkuIFVzZSBgY29kZWBcbiAgICAgICAqIGluc3RlYWQgZm9yIGEgc3RhYmxlIGNhbmNlbGxhdGlvbiByZWFzb24gdGhhdCBjYW4gYmUgdXNlZCBpbiBwcm9kdWN0aW9uLlxuICAgICAgICovXG4gICAgICBwdWJsaWMgcmVhc29uOiBzdHJpbmcsXG4gICAgICAvKipcbiAgICAgICAqIEEgY29kZSB0byBpbmRpY2F0ZSB3aHkgdGhlIG5hdmlnYXRpb24gd2FzIGNhbmNlbGVkLiBUaGlzIGNhbmNlbGxhdGlvbiBjb2RlIGlzIHN0YWJsZSBmb3JcbiAgICAgICAqIHRoZSByZWFzb24gYW5kIGNhbiBiZSByZWxpZWQgb24gd2hlcmVhcyB0aGUgYHJlYXNvbmAgc3RyaW5nIGNvdWxkIGNoYW5nZSBhbmQgc2hvdWxkIG5vdCBiZVxuICAgICAgICogdXNlZCBpbiBwcm9kdWN0aW9uLlxuICAgICAgICovXG4gICAgICByZWFkb25seSBjb2RlPzogTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUpIHtcbiAgICBzdXBlcihpZCwgdXJsKTtcbiAgfVxuXG4gIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gIG92ZXJyaWRlIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBOYXZpZ2F0aW9uQ2FuY2VsKGlkOiAke3RoaXMuaWR9LCB1cmw6ICcke3RoaXMudXJsfScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCB3aGVuIGEgbmF2aWdhdGlvbiBpcyBza2lwcGVkLlxuICogVGhpcyBjYW4gaGFwcGVuIGZvciBhIGNvdXBsZSByZWFzb25zIGluY2x1ZGluZyBvblNhbWVVcmxIYW5kbGluZ1xuICogaXMgc2V0IHRvIGBpZ25vcmVgIGFuZCB0aGUgbmF2aWdhdGlvbiBVUkwgaXMgbm90IGRpZmZlcmVudCB0aGFuIHRoZVxuICogY3VycmVudCBzdGF0ZS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBOYXZpZ2F0aW9uU2tpcHBlZCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5OYXZpZ2F0aW9uU2tpcHBlZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBpZDogbnVtYmVyLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHVybDogc3RyaW5nLFxuICAgICAgLyoqXG4gICAgICAgKiBBIGRlc2NyaXB0aW9uIG9mIHdoeSB0aGUgbmF2aWdhdGlvbiB3YXMgc2tpcHBlZC4gRm9yIGRlYnVnIHB1cnBvc2VzIG9ubHkuIFVzZSBgY29kZWBcbiAgICAgICAqIGluc3RlYWQgZm9yIGEgc3RhYmxlIHNraXBwZWQgcmVhc29uIHRoYXQgY2FuIGJlIHVzZWQgaW4gcHJvZHVjdGlvbi5cbiAgICAgICAqL1xuICAgICAgcHVibGljIHJlYXNvbjogc3RyaW5nLFxuICAgICAgLyoqXG4gICAgICAgKiBBIGNvZGUgdG8gaW5kaWNhdGUgd2h5IHRoZSBuYXZpZ2F0aW9uIHdhcyBza2lwcGVkLiBUaGlzIGNvZGUgaXMgc3RhYmxlIGZvclxuICAgICAgICogdGhlIHJlYXNvbiBhbmQgY2FuIGJlIHJlbGllZCBvbiB3aGVyZWFzIHRoZSBgcmVhc29uYCBzdHJpbmcgY291bGQgY2hhbmdlIGFuZCBzaG91bGQgbm90IGJlXG4gICAgICAgKiB1c2VkIGluIHByb2R1Y3Rpb24uXG4gICAgICAgKi9cbiAgICAgIHJlYWRvbmx5IGNvZGU/OiBOYXZpZ2F0aW9uU2tpcHBlZENvZGUpIHtcbiAgICBzdXBlcihpZCwgdXJsKTtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCB3aGVuIGEgbmF2aWdhdGlvbiBmYWlscyBkdWUgdG8gYW4gdW5leHBlY3RlZCBlcnJvci5cbiAqXG4gKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uU3RhcnR9XG4gKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uRW5kfVxuICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkNhbmNlbH1cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBOYXZpZ2F0aW9uRXJyb3IgZXh0ZW5kcyBSb3V0ZXJFdmVudCB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFdmVudFR5cGUuTmF2aWdhdGlvbkVycm9yO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIGVycm9yOiBhbnksXG4gICAgICAvKipcbiAgICAgICAqIFRoZSB0YXJnZXQgb2YgdGhlIG5hdmlnYXRpb24gd2hlbiB0aGUgZXJyb3Igb2NjdXJyZWQuXG4gICAgICAgKlxuICAgICAgICogTm90ZSB0aGF0IHRoaXMgY2FuIGJlIGB1bmRlZmluZWRgIGJlY2F1c2UgYW4gZXJyb3IgY291bGQgaGF2ZSBvY2N1cnJlZCBiZWZvcmUgdGhlXG4gICAgICAgKiBgUm91dGVyU3RhdGVTbmFwc2hvdGAgd2FzIGNyZWF0ZWQgZm9yIHRoZSBuYXZpZ2F0aW9uLlxuICAgICAgICovXG4gICAgICByZWFkb25seSB0YXJnZXQ/OiBSb3V0ZXJTdGF0ZVNuYXBzaG90KSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICBvdmVycmlkZSB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgTmF2aWdhdGlvbkVycm9yKGlkOiAke3RoaXMuaWR9LCB1cmw6ICcke3RoaXMudXJsfScsIGVycm9yOiAke3RoaXMuZXJyb3J9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgd2hlbiByb3V0ZXMgYXJlIHJlY29nbml6ZWQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgUm91dGVzUmVjb2duaXplZCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5Sb3V0ZXNSZWNvZ25pemVkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHVybEFmdGVyUmVkaXJlY3RzOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90KSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICBvdmVycmlkZSB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgUm91dGVzUmVjb2duaXplZChpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nLCB1cmxBZnRlclJlZGlyZWN0czogJyR7XG4gICAgICAgIHRoaXMudXJsQWZ0ZXJSZWRpcmVjdHN9Jywgc3RhdGU6ICR7dGhpcy5zdGF0ZX0pYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCBhdCB0aGUgc3RhcnQgb2YgdGhlIEd1YXJkIHBoYXNlIG9mIHJvdXRpbmcuXG4gKlxuICogQHNlZSB7QGxpbmsgR3VhcmRzQ2hlY2tFbmR9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgR3VhcmRzQ2hlY2tTdGFydCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5HdWFyZHNDaGVja1N0YXJ0O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHVybEFmdGVyUmVkaXJlY3RzOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90KSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICBvdmVycmlkZSB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgR3VhcmRzQ2hlY2tTdGFydChpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nLCB1cmxBZnRlclJlZGlyZWN0czogJyR7XG4gICAgICAgIHRoaXMudXJsQWZ0ZXJSZWRpcmVjdHN9Jywgc3RhdGU6ICR7dGhpcy5zdGF0ZX0pYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCBhdCB0aGUgZW5kIG9mIHRoZSBHdWFyZCBwaGFzZSBvZiByb3V0aW5nLlxuICpcbiAqIEBzZWUge0BsaW5rIEd1YXJkc0NoZWNrU3RhcnR9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgR3VhcmRzQ2hlY2tFbmQgZXh0ZW5kcyBSb3V0ZXJFdmVudCB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFdmVudFR5cGUuR3VhcmRzQ2hlY2tFbmQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgdXJsQWZ0ZXJSZWRpcmVjdHM6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgc3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHNob3VsZEFjdGl2YXRlOiBib29sZWFuKSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICBvdmVycmlkZSB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgR3VhcmRzQ2hlY2tFbmQoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke1xuICAgICAgICB0aGlzLnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3RoaXMuc3RhdGV9LCBzaG91bGRBY3RpdmF0ZTogJHt0aGlzLnNob3VsZEFjdGl2YXRlfSlgO1xuICB9XG59XG5cbi8qKlxuICogQW4gZXZlbnQgdHJpZ2dlcmVkIGF0IHRoZSBzdGFydCBvZiB0aGUgUmVzb2x2ZSBwaGFzZSBvZiByb3V0aW5nLlxuICpcbiAqIFJ1bnMgaW4gdGhlIFwicmVzb2x2ZVwiIHBoYXNlIHdoZXRoZXIgb3Igbm90IHRoZXJlIGlzIGFueXRoaW5nIHRvIHJlc29sdmUuXG4gKiBJbiBmdXR1cmUsIG1heSBjaGFuZ2UgdG8gb25seSBydW4gd2hlbiB0aGVyZSBhcmUgdGhpbmdzIHRvIGJlIHJlc29sdmVkLlxuICpcbiAqIEBzZWUge0BsaW5rIFJlc29sdmVFbmR9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgUmVzb2x2ZVN0YXJ0IGV4dGVuZHMgUm91dGVyRXZlbnQge1xuICByZWFkb25seSB0eXBlID0gRXZlbnRUeXBlLlJlc29sdmVTdGFydDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBpZDogbnVtYmVyLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHVybDogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyB1cmxBZnRlclJlZGlyZWN0czogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCkge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgb3ZlcnJpZGUgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFJlc29sdmVTdGFydChpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nLCB1cmxBZnRlclJlZGlyZWN0czogJyR7XG4gICAgICAgIHRoaXMudXJsQWZ0ZXJSZWRpcmVjdHN9Jywgc3RhdGU6ICR7dGhpcy5zdGF0ZX0pYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCBhdCB0aGUgZW5kIG9mIHRoZSBSZXNvbHZlIHBoYXNlIG9mIHJvdXRpbmcuXG4gKiBAc2VlIHtAbGluayBSZXNvbHZlU3RhcnR9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgUmVzb2x2ZUVuZCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5SZXNvbHZlRW5kO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHVybEFmdGVyUmVkaXJlY3RzOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90KSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICBvdmVycmlkZSB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgUmVzb2x2ZUVuZChpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nLCB1cmxBZnRlclJlZGlyZWN0czogJyR7XG4gICAgICAgIHRoaXMudXJsQWZ0ZXJSZWRpcmVjdHN9Jywgc3RhdGU6ICR7dGhpcy5zdGF0ZX0pYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCBiZWZvcmUgbGF6eSBsb2FkaW5nIGEgcm91dGUgY29uZmlndXJhdGlvbi5cbiAqXG4gKiBAc2VlIHtAbGluayBSb3V0ZUNvbmZpZ0xvYWRFbmR9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgUm91dGVDb25maWdMb2FkU3RhcnQge1xuICByZWFkb25seSB0eXBlID0gRXZlbnRUeXBlLlJvdXRlQ29uZmlnTG9hZFN0YXJ0O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyByb3V0ZTogUm91dGUpIHt9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBSb3V0ZUNvbmZpZ0xvYWRTdGFydChwYXRoOiAke3RoaXMucm91dGUucGF0aH0pYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCB3aGVuIGEgcm91dGUgaGFzIGJlZW4gbGF6eSBsb2FkZWQuXG4gKlxuICogQHNlZSB7QGxpbmsgUm91dGVDb25maWdMb2FkU3RhcnR9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgUm91dGVDb25maWdMb2FkRW5kIHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5Sb3V0ZUNvbmZpZ0xvYWRFbmQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHJvdXRlOiBSb3V0ZSkge31cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFJvdXRlQ29uZmlnTG9hZEVuZChwYXRoOiAke3RoaXMucm91dGUucGF0aH0pYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCBhdCB0aGUgc3RhcnQgb2YgdGhlIGNoaWxkLWFjdGl2YXRpb25cbiAqIHBhcnQgb2YgdGhlIFJlc29sdmUgcGhhc2Ugb2Ygcm91dGluZy5cbiAqIEBzZWUge0BsaW5rIENoaWxkQWN0aXZhdGlvbkVuZH1cbiAqIEBzZWUge0BsaW5rIFJlc29sdmVTdGFydH1cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBDaGlsZEFjdGl2YXRpb25TdGFydCB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFdmVudFR5cGUuQ2hpbGRBY3RpdmF0aW9uU3RhcnQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSB7fVxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBhdGggPSB0aGlzLnNuYXBzaG90LnJvdXRlQ29uZmlnICYmIHRoaXMuc25hcHNob3Qucm91dGVDb25maWcucGF0aCB8fCAnJztcbiAgICByZXR1cm4gYENoaWxkQWN0aXZhdGlvblN0YXJ0KHBhdGg6ICcke3BhdGh9JylgO1xuICB9XG59XG5cbi8qKlxuICogQW4gZXZlbnQgdHJpZ2dlcmVkIGF0IHRoZSBlbmQgb2YgdGhlIGNoaWxkLWFjdGl2YXRpb24gcGFydFxuICogb2YgdGhlIFJlc29sdmUgcGhhc2Ugb2Ygcm91dGluZy5cbiAqIEBzZWUge0BsaW5rIENoaWxkQWN0aXZhdGlvblN0YXJ0fVxuICogQHNlZSB7QGxpbmsgUmVzb2x2ZVN0YXJ0fVxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgQ2hpbGRBY3RpdmF0aW9uRW5kIHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5DaGlsZEFjdGl2YXRpb25FbmQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSB7fVxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBhdGggPSB0aGlzLnNuYXBzaG90LnJvdXRlQ29uZmlnICYmIHRoaXMuc25hcHNob3Qucm91dGVDb25maWcucGF0aCB8fCAnJztcbiAgICByZXR1cm4gYENoaWxkQWN0aXZhdGlvbkVuZChwYXRoOiAnJHtwYXRofScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCBhdCB0aGUgc3RhcnQgb2YgdGhlIGFjdGl2YXRpb24gcGFydFxuICogb2YgdGhlIFJlc29sdmUgcGhhc2Ugb2Ygcm91dGluZy5cbiAqIEBzZWUge0BsaW5rIEFjdGl2YXRpb25FbmR9XG4gKiBAc2VlIHtAbGluayBSZXNvbHZlU3RhcnR9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgQWN0aXZhdGlvblN0YXJ0IHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5BY3RpdmF0aW9uU3RhcnQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSB7fVxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBhdGggPSB0aGlzLnNuYXBzaG90LnJvdXRlQ29uZmlnICYmIHRoaXMuc25hcHNob3Qucm91dGVDb25maWcucGF0aCB8fCAnJztcbiAgICByZXR1cm4gYEFjdGl2YXRpb25TdGFydChwYXRoOiAnJHtwYXRofScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCBhdCB0aGUgZW5kIG9mIHRoZSBhY3RpdmF0aW9uIHBhcnRcbiAqIG9mIHRoZSBSZXNvbHZlIHBoYXNlIG9mIHJvdXRpbmcuXG4gKiBAc2VlIHtAbGluayBBY3RpdmF0aW9uU3RhcnR9XG4gKiBAc2VlIHtAbGluayBSZXNvbHZlU3RhcnR9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgQWN0aXZhdGlvbkVuZCB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFdmVudFR5cGUuQWN0aXZhdGlvbkVuZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgc25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpIHt9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgY29uc3QgcGF0aCA9IHRoaXMuc25hcHNob3Qucm91dGVDb25maWcgJiYgdGhpcy5zbmFwc2hvdC5yb3V0ZUNvbmZpZy5wYXRoIHx8ICcnO1xuICAgIHJldHVybiBgQWN0aXZhdGlvbkVuZChwYXRoOiAnJHtwYXRofScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCBieSBzY3JvbGxpbmcuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgU2Nyb2xsIHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5TY3JvbGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcmVhZG9ubHkgcm91dGVyRXZlbnQ6IE5hdmlnYXRpb25FbmR8TmF2aWdhdGlvblNraXBwZWQsXG5cbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICByZWFkb25seSBwb3NpdGlvbjogW251bWJlciwgbnVtYmVyXXxudWxsLFxuXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcmVhZG9ubHkgYW5jaG9yOiBzdHJpbmd8bnVsbCkge31cblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBvcyA9IHRoaXMucG9zaXRpb24gPyBgJHt0aGlzLnBvc2l0aW9uWzBdfSwgJHt0aGlzLnBvc2l0aW9uWzFdfWAgOiBudWxsO1xuICAgIHJldHVybiBgU2Nyb2xsKGFuY2hvcjogJyR7dGhpcy5hbmNob3J9JywgcG9zaXRpb246ICcke3Bvc30nKWA7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEJlZm9yZUFjdGl2YXRlUm91dGVzIHt9XG5leHBvcnQgY2xhc3MgUmVkaXJlY3RSZXF1ZXN0IHtcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgdXJsOiBVcmxUcmVlKSB7fVxufVxuZXhwb3J0IHR5cGUgUHJpdmF0ZVJvdXRlckV2ZW50cyA9IEJlZm9yZUFjdGl2YXRlUm91dGVzfFJlZGlyZWN0UmVxdWVzdDtcblxuLyoqXG4gKiBSb3V0ZXIgZXZlbnRzIHRoYXQgYWxsb3cgeW91IHRvIHRyYWNrIHRoZSBsaWZlY3ljbGUgb2YgdGhlIHJvdXRlci5cbiAqXG4gKiBUaGUgZXZlbnRzIG9jY3VyIGluIHRoZSBmb2xsb3dpbmcgc2VxdWVuY2U6XG4gKlxuICogKiBbTmF2aWdhdGlvblN0YXJ0XShhcGkvcm91dGVyL05hdmlnYXRpb25TdGFydCk6IE5hdmlnYXRpb24gc3RhcnRzLlxuICogKiBbUm91dGVDb25maWdMb2FkU3RhcnRdKGFwaS9yb3V0ZXIvUm91dGVDb25maWdMb2FkU3RhcnQpOiBCZWZvcmVcbiAqIHRoZSByb3V0ZXIgW2xhenkgbG9hZHNdKC9ndWlkZS9yb3V0ZXIjbGF6eS1sb2FkaW5nKSBhIHJvdXRlIGNvbmZpZ3VyYXRpb24uXG4gKiAqIFtSb3V0ZUNvbmZpZ0xvYWRFbmRdKGFwaS9yb3V0ZXIvUm91dGVDb25maWdMb2FkRW5kKTogQWZ0ZXIgYSByb3V0ZSBoYXMgYmVlbiBsYXp5IGxvYWRlZC5cbiAqICogW1JvdXRlc1JlY29nbml6ZWRdKGFwaS9yb3V0ZXIvUm91dGVzUmVjb2duaXplZCk6IFdoZW4gdGhlIHJvdXRlciBwYXJzZXMgdGhlIFVSTFxuICogYW5kIHRoZSByb3V0ZXMgYXJlIHJlY29nbml6ZWQuXG4gKiAqIFtHdWFyZHNDaGVja1N0YXJ0XShhcGkvcm91dGVyL0d1YXJkc0NoZWNrU3RhcnQpOiBXaGVuIHRoZSByb3V0ZXIgYmVnaW5zIHRoZSAqZ3VhcmRzKlxuICogcGhhc2Ugb2Ygcm91dGluZy5cbiAqICogW0NoaWxkQWN0aXZhdGlvblN0YXJ0XShhcGkvcm91dGVyL0NoaWxkQWN0aXZhdGlvblN0YXJ0KTogV2hlbiB0aGUgcm91dGVyXG4gKiBiZWdpbnMgYWN0aXZhdGluZyBhIHJvdXRlJ3MgY2hpbGRyZW4uXG4gKiAqIFtBY3RpdmF0aW9uU3RhcnRdKGFwaS9yb3V0ZXIvQWN0aXZhdGlvblN0YXJ0KTogV2hlbiB0aGUgcm91dGVyIGJlZ2lucyBhY3RpdmF0aW5nIGEgcm91dGUuXG4gKiAqIFtHdWFyZHNDaGVja0VuZF0oYXBpL3JvdXRlci9HdWFyZHNDaGVja0VuZCk6IFdoZW4gdGhlIHJvdXRlciBmaW5pc2hlcyB0aGUgKmd1YXJkcypcbiAqIHBoYXNlIG9mIHJvdXRpbmcgc3VjY2Vzc2Z1bGx5LlxuICogKiBbUmVzb2x2ZVN0YXJ0XShhcGkvcm91dGVyL1Jlc29sdmVTdGFydCk6IFdoZW4gdGhlIHJvdXRlciBiZWdpbnMgdGhlICpyZXNvbHZlKlxuICogcGhhc2Ugb2Ygcm91dGluZy5cbiAqICogW1Jlc29sdmVFbmRdKGFwaS9yb3V0ZXIvUmVzb2x2ZUVuZCk6IFdoZW4gdGhlIHJvdXRlciBmaW5pc2hlcyB0aGUgKnJlc29sdmUqXG4gKiBwaGFzZSBvZiByb3V0aW5nIHN1Y2Nlc3NmdWxseS5cbiAqICogW0NoaWxkQWN0aXZhdGlvbkVuZF0oYXBpL3JvdXRlci9DaGlsZEFjdGl2YXRpb25FbmQpOiBXaGVuIHRoZSByb3V0ZXIgZmluaXNoZXNcbiAqIGFjdGl2YXRpbmcgYSByb3V0ZSdzIGNoaWxkcmVuLlxuICogKiBbQWN0aXZhdGlvbkVuZF0oYXBpL3JvdXRlci9BY3RpdmF0aW9uRW5kKTogV2hlbiB0aGUgcm91dGVyIGZpbmlzaGVzIGFjdGl2YXRpbmcgYSByb3V0ZS5cbiAqICogW05hdmlnYXRpb25FbmRdKGFwaS9yb3V0ZXIvTmF2aWdhdGlvbkVuZCk6IFdoZW4gbmF2aWdhdGlvbiBlbmRzIHN1Y2Nlc3NmdWxseS5cbiAqICogW05hdmlnYXRpb25DYW5jZWxdKGFwaS9yb3V0ZXIvTmF2aWdhdGlvbkNhbmNlbCk6IFdoZW4gbmF2aWdhdGlvbiBpcyBjYW5jZWxlZC5cbiAqICogW05hdmlnYXRpb25FcnJvcl0oYXBpL3JvdXRlci9OYXZpZ2F0aW9uRXJyb3IpOiBXaGVuIG5hdmlnYXRpb24gZmFpbHNcbiAqIGR1ZSB0byBhbiB1bmV4cGVjdGVkIGVycm9yLlxuICogKiBbU2Nyb2xsXShhcGkvcm91dGVyL1Njcm9sbCk6IFdoZW4gdGhlIHVzZXIgc2Nyb2xscy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIEV2ZW50ID0gTmF2aWdhdGlvblN0YXJ0fE5hdmlnYXRpb25FbmR8TmF2aWdhdGlvbkNhbmNlbHxOYXZpZ2F0aW9uRXJyb3J8Um91dGVzUmVjb2duaXplZHxcbiAgICBHdWFyZHNDaGVja1N0YXJ0fEd1YXJkc0NoZWNrRW5kfFJvdXRlQ29uZmlnTG9hZFN0YXJ0fFJvdXRlQ29uZmlnTG9hZEVuZHxDaGlsZEFjdGl2YXRpb25TdGFydHxcbiAgICBDaGlsZEFjdGl2YXRpb25FbmR8QWN0aXZhdGlvblN0YXJ0fEFjdGl2YXRpb25FbmR8U2Nyb2xsfFJlc29sdmVTdGFydHxSZXNvbHZlRW5kfFxuICAgIE5hdmlnYXRpb25Ta2lwcGVkO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5naWZ5RXZlbnQocm91dGVyRXZlbnQ6IEV2ZW50KTogc3RyaW5nIHtcbiAgc3dpdGNoIChyb3V0ZXJFdmVudC50eXBlKSB7XG4gICAgY2FzZSBFdmVudFR5cGUuQWN0aXZhdGlvbkVuZDpcbiAgICAgIHJldHVybiBgQWN0aXZhdGlvbkVuZChwYXRoOiAnJHtyb3V0ZXJFdmVudC5zbmFwc2hvdC5yb3V0ZUNvbmZpZz8ucGF0aCB8fCAnJ30nKWA7XG4gICAgY2FzZSBFdmVudFR5cGUuQWN0aXZhdGlvblN0YXJ0OlxuICAgICAgcmV0dXJuIGBBY3RpdmF0aW9uU3RhcnQocGF0aDogJyR7cm91dGVyRXZlbnQuc25hcHNob3Qucm91dGVDb25maWc/LnBhdGggfHwgJyd9JylgO1xuICAgIGNhc2UgRXZlbnRUeXBlLkNoaWxkQWN0aXZhdGlvbkVuZDpcbiAgICAgIHJldHVybiBgQ2hpbGRBY3RpdmF0aW9uRW5kKHBhdGg6ICcke3JvdXRlckV2ZW50LnNuYXBzaG90LnJvdXRlQ29uZmlnPy5wYXRoIHx8ICcnfScpYDtcbiAgICBjYXNlIEV2ZW50VHlwZS5DaGlsZEFjdGl2YXRpb25TdGFydDpcbiAgICAgIHJldHVybiBgQ2hpbGRBY3RpdmF0aW9uU3RhcnQocGF0aDogJyR7cm91dGVyRXZlbnQuc25hcHNob3Qucm91dGVDb25maWc/LnBhdGggfHwgJyd9JylgO1xuICAgIGNhc2UgRXZlbnRUeXBlLkd1YXJkc0NoZWNrRW5kOlxuICAgICAgcmV0dXJuIGBHdWFyZHNDaGVja0VuZChpZDogJHtyb3V0ZXJFdmVudC5pZH0sIHVybDogJyR7XG4gICAgICAgICAgcm91dGVyRXZlbnQudXJsfScsIHVybEFmdGVyUmVkaXJlY3RzOiAnJHtyb3V0ZXJFdmVudC51cmxBZnRlclJlZGlyZWN0c30nLCBzdGF0ZTogJHtcbiAgICAgICAgICByb3V0ZXJFdmVudC5zdGF0ZX0sIHNob3VsZEFjdGl2YXRlOiAke3JvdXRlckV2ZW50LnNob3VsZEFjdGl2YXRlfSlgO1xuICAgIGNhc2UgRXZlbnRUeXBlLkd1YXJkc0NoZWNrU3RhcnQ6XG4gICAgICByZXR1cm4gYEd1YXJkc0NoZWNrU3RhcnQoaWQ6ICR7cm91dGVyRXZlbnQuaWR9LCB1cmw6ICcke1xuICAgICAgICAgIHJvdXRlckV2ZW50LnVybH0nLCB1cmxBZnRlclJlZGlyZWN0czogJyR7cm91dGVyRXZlbnQudXJsQWZ0ZXJSZWRpcmVjdHN9Jywgc3RhdGU6ICR7XG4gICAgICAgICAgcm91dGVyRXZlbnQuc3RhdGV9KWA7XG4gICAgY2FzZSBFdmVudFR5cGUuTmF2aWdhdGlvbkNhbmNlbDpcbiAgICAgIHJldHVybiBgTmF2aWdhdGlvbkNhbmNlbChpZDogJHtyb3V0ZXJFdmVudC5pZH0sIHVybDogJyR7cm91dGVyRXZlbnQudXJsfScpYDtcbiAgICBjYXNlIEV2ZW50VHlwZS5OYXZpZ2F0aW9uU2tpcHBlZDpcbiAgICAgIHJldHVybiBgTmF2aWdhdGlvblNraXBwZWQoaWQ6ICR7cm91dGVyRXZlbnQuaWR9LCB1cmw6ICcke3JvdXRlckV2ZW50LnVybH0nKWA7XG4gICAgY2FzZSBFdmVudFR5cGUuTmF2aWdhdGlvbkVuZDpcbiAgICAgIHJldHVybiBgTmF2aWdhdGlvbkVuZChpZDogJHtyb3V0ZXJFdmVudC5pZH0sIHVybDogJyR7cm91dGVyRXZlbnQudXJsfScsIHVybEFmdGVyUmVkaXJlY3RzOiAnJHtcbiAgICAgICAgICByb3V0ZXJFdmVudC51cmxBZnRlclJlZGlyZWN0c30nKWA7XG4gICAgY2FzZSBFdmVudFR5cGUuTmF2aWdhdGlvbkVycm9yOlxuICAgICAgcmV0dXJuIGBOYXZpZ2F0aW9uRXJyb3IoaWQ6ICR7cm91dGVyRXZlbnQuaWR9LCB1cmw6ICcke3JvdXRlckV2ZW50LnVybH0nLCBlcnJvcjogJHtcbiAgICAgICAgICByb3V0ZXJFdmVudC5lcnJvcn0pYDtcbiAgICBjYXNlIEV2ZW50VHlwZS5OYXZpZ2F0aW9uU3RhcnQ6XG4gICAgICByZXR1cm4gYE5hdmlnYXRpb25TdGFydChpZDogJHtyb3V0ZXJFdmVudC5pZH0sIHVybDogJyR7cm91dGVyRXZlbnQudXJsfScpYDtcbiAgICBjYXNlIEV2ZW50VHlwZS5SZXNvbHZlRW5kOlxuICAgICAgcmV0dXJuIGBSZXNvbHZlRW5kKGlkOiAke3JvdXRlckV2ZW50LmlkfSwgdXJsOiAnJHtyb3V0ZXJFdmVudC51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke1xuICAgICAgICAgIHJvdXRlckV2ZW50LnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3JvdXRlckV2ZW50LnN0YXRlfSlgO1xuICAgIGNhc2UgRXZlbnRUeXBlLlJlc29sdmVTdGFydDpcbiAgICAgIHJldHVybiBgUmVzb2x2ZVN0YXJ0KGlkOiAke3JvdXRlckV2ZW50LmlkfSwgdXJsOiAnJHtyb3V0ZXJFdmVudC51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke1xuICAgICAgICAgIHJvdXRlckV2ZW50LnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3JvdXRlckV2ZW50LnN0YXRlfSlgO1xuICAgIGNhc2UgRXZlbnRUeXBlLlJvdXRlQ29uZmlnTG9hZEVuZDpcbiAgICAgIHJldHVybiBgUm91dGVDb25maWdMb2FkRW5kKHBhdGg6ICR7cm91dGVyRXZlbnQucm91dGUucGF0aH0pYDtcbiAgICBjYXNlIEV2ZW50VHlwZS5Sb3V0ZUNvbmZpZ0xvYWRTdGFydDpcbiAgICAgIHJldHVybiBgUm91dGVDb25maWdMb2FkU3RhcnQocGF0aDogJHtyb3V0ZXJFdmVudC5yb3V0ZS5wYXRofSlgO1xuICAgIGNhc2UgRXZlbnRUeXBlLlJvdXRlc1JlY29nbml6ZWQ6XG4gICAgICByZXR1cm4gYFJvdXRlc1JlY29nbml6ZWQoaWQ6ICR7cm91dGVyRXZlbnQuaWR9LCB1cmw6ICcke1xuICAgICAgICAgIHJvdXRlckV2ZW50LnVybH0nLCB1cmxBZnRlclJlZGlyZWN0czogJyR7cm91dGVyRXZlbnQudXJsQWZ0ZXJSZWRpcmVjdHN9Jywgc3RhdGU6ICR7XG4gICAgICAgICAgcm91dGVyRXZlbnQuc3RhdGV9KWA7XG4gICAgY2FzZSBFdmVudFR5cGUuU2Nyb2xsOlxuICAgICAgY29uc3QgcG9zID1cbiAgICAgICAgICByb3V0ZXJFdmVudC5wb3NpdGlvbiA/IGAke3JvdXRlckV2ZW50LnBvc2l0aW9uWzBdfSwgJHtyb3V0ZXJFdmVudC5wb3NpdGlvblsxXX1gIDogbnVsbDtcbiAgICAgIHJldHVybiBgU2Nyb2xsKGFuY2hvcjogJyR7cm91dGVyRXZlbnQuYW5jaG9yfScsIHBvc2l0aW9uOiAnJHtwb3N9JylgO1xuICB9XG59XG4iXX0=