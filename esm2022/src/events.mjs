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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9ldmVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBZ0JILE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLFlBQVksQ0FBQztBQUVsRDs7OztHQUlHO0FBQ0gsTUFBTSxDQUFOLElBQVksU0FrQlg7QUFsQkQsV0FBWSxTQUFTO0lBQ25CLCtEQUFlLENBQUE7SUFDZiwyREFBYSxDQUFBO0lBQ2IsaUVBQWdCLENBQUE7SUFDaEIsK0RBQWUsQ0FBQTtJQUNmLGlFQUFnQixDQUFBO0lBQ2hCLHlEQUFZLENBQUE7SUFDWixxREFBVSxDQUFBO0lBQ1YsaUVBQWdCLENBQUE7SUFDaEIsNkRBQWMsQ0FBQTtJQUNkLHlFQUFvQixDQUFBO0lBQ3BCLHNFQUFrQixDQUFBO0lBQ2xCLDBFQUFvQixDQUFBO0lBQ3BCLHNFQUFrQixDQUFBO0lBQ2xCLGdFQUFlLENBQUE7SUFDZiw0REFBYSxDQUFBO0lBQ2IsOENBQU0sQ0FBQTtJQUNOLG9FQUFpQixDQUFBO0FBQ25CLENBQUMsRUFsQlcsU0FBUyxLQUFULFNBQVMsUUFrQnBCO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBdUJHO0FBQ0gsTUFBTSxPQUFPLFdBQVc7SUFDdEI7SUFDSSxzRUFBc0U7SUFDL0QsRUFBVTtJQUNqQiwyREFBMkQ7SUFDcEQsR0FBVztRQUZYLE9BQUUsR0FBRixFQUFFLENBQVE7UUFFVixRQUFHLEdBQUgsR0FBRyxDQUFRO0lBQUcsQ0FBQztDQUMzQjtBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxXQUFXO0lBZ0M5QztJQUNJLHVCQUF1QjtJQUN2QixFQUFVO0lBQ1YsdUJBQXVCO0lBQ3ZCLEdBQVc7SUFDWCx1QkFBdUI7SUFDdkIsb0JBQXVDLFlBQVk7SUFDbkQsdUJBQXVCO0lBQ3ZCLGdCQUErRCxJ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NEIsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQztRQUMvRCxLQUFLLFNBQVMsQ0FBQyxvQkFBb0I7WUFDakMsT0FBTyw4QkFBOEIsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQztRQUNqRSxLQUFLLFNBQVMsQ0FBQyxnQkFBZ0I7WUFDN0IsT0FBTyx3QkFBd0IsV0FBVyxDQUFDLEVBQUUsV0FDekMsV0FBVyxDQUFDLEdBQUcsMEJBQTBCLFdBQVcsQ0FBQyxpQkFBaUIsYUFDdEUsV0FBVyxDQUFDLEtBQUssR0FBRyxDQUFDO1FBQzNCLEtBQUssU0FBUyxDQUFDLE1BQU07WUFDbkIsTUFBTSxHQUFHLEdBQ0wsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzNGLE9BQU8sbUJBQW1CLFdBQVcsQ0FBQyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQztJQUN6RSxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1JvdXRlfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIFJvdXRlclN0YXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7VXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5cbi8qKlxuICogSWRlbnRpZmllcyB0aGUgY2FsbCBvciBldmVudCB0aGF0IHRyaWdnZXJlZCBhIG5hdmlnYXRpb24uXG4gKlxuICogKiAnaW1wZXJhdGl2ZSc6IFRyaWdnZXJlZCBieSBgcm91dGVyLm5hdmlnYXRlQnlVcmwoKWAgb3IgYHJvdXRlci5uYXZpZ2F0ZSgpYC5cbiAqICogJ3BvcHN0YXRlJyA6IFRyaWdnZXJlZCBieSBhIGBwb3BzdGF0ZWAgZXZlbnQuXG4gKiAqICdoYXNoY2hhbmdlJy06IFRyaWdnZXJlZCBieSBhIGBoYXNoY2hhbmdlYCBldmVudC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIE5hdmlnYXRpb25UcmlnZ2VyID0gJ2ltcGVyYXRpdmUnfCdwb3BzdGF0ZSd8J2hhc2hjaGFuZ2UnO1xuZXhwb3J0IGNvbnN0IElNUEVSQVRJVkVfTkFWSUdBVElPTiA9ICdpbXBlcmF0aXZlJztcblxuLyoqXG4gKiBJZGVudGlmaWVzIHRoZSB0eXBlIG9mIGEgcm91dGVyIGV2ZW50LlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGVudW0gRXZlbnRUeXBlIHtcbiAgTmF2aWdhdGlvblN0YXJ0LFxuICBOYXZpZ2F0aW9uRW5kLFxuICBOYXZpZ2F0aW9uQ2FuY2VsLFxuICBOYXZpZ2F0aW9uRXJyb3IsXG4gIFJvdXRlc1JlY29nbml6ZWQsXG4gIFJlc29sdmVTdGFydCxcbiAgUmVzb2x2ZUVuZCxcbiAgR3VhcmRzQ2hlY2tTdGFydCxcbiAgR3VhcmRzQ2hlY2tFbmQsXG4gIFJvdXRlQ29uZmlnTG9hZFN0YXJ0LFxuICBSb3V0ZUNvbmZpZ0xvYWRFbmQsXG4gIENoaWxkQWN0aXZhdGlvblN0YXJ0LFxuICBDaGlsZEFjdGl2YXRpb25FbmQsXG4gIEFjdGl2YXRpb25TdGFydCxcbiAgQWN0aXZhdGlvbkVuZCxcbiAgU2Nyb2xsLFxuICBOYXZpZ2F0aW9uU2tpcHBlZCxcbn1cblxuLyoqXG4gKiBCYXNlIGZvciBldmVudHMgdGhlIHJvdXRlciBnb2VzIHRocm91Z2gsIGFzIG9wcG9zZWQgdG8gZXZlbnRzIHRpZWQgdG8gYSBzcGVjaWZpY1xuICogcm91dGUuIEZpcmVkIG9uZSB0aW1lIGZvciBhbnkgZ2l2ZW4gbmF2aWdhdGlvbi5cbiAqXG4gKiBUaGUgZm9sbG93aW5nIGNvZGUgc2hvd3MgaG93IGEgY2xhc3Mgc3Vic2NyaWJlcyB0byByb3V0ZXIgZXZlbnRzLlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQge0V2ZW50LCBSb3V0ZXJFdmVudCwgUm91dGVyfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xuICpcbiAqIGNsYXNzIE15U2VydmljZSB7XG4gKiAgIGNvbnN0cnVjdG9yKHB1YmxpYyByb3V0ZXI6IFJvdXRlcikge1xuICogICAgIHJvdXRlci5ldmVudHMucGlwZShcbiAqICAgICAgICBmaWx0ZXIoKGU6IEV2ZW50IHwgUm91dGVyRXZlbnQpOiBlIGlzIFJvdXRlckV2ZW50ID0+IGUgaW5zdGFuY2VvZiBSb3V0ZXJFdmVudClcbiAqICAgICApLnN1YnNjcmliZSgoZTogUm91dGVyRXZlbnQpID0+IHtcbiAqICAgICAgIC8vIERvIHNvbWV0aGluZ1xuICogICAgIH0pO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBAc2VlIHtAbGluayBFdmVudH1cbiAqIEBzZWUgW1JvdXRlciBldmVudHMgc3VtbWFyeV0oZ3VpZGUvcm91dGVyLXJlZmVyZW5jZSNyb3V0ZXItZXZlbnRzKVxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgUm91dGVyRXZlbnQge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBBIHVuaXF1ZSBJRCB0aGF0IHRoZSByb3V0ZXIgYXNzaWducyB0byBldmVyeSByb3V0ZXIgbmF2aWdhdGlvbi4gKi9cbiAgICAgIHB1YmxpYyBpZDogbnVtYmVyLFxuICAgICAgLyoqIFRoZSBVUkwgdGhhdCBpcyB0aGUgZGVzdGluYXRpb24gZm9yIHRoaXMgbmF2aWdhdGlvbi4gKi9cbiAgICAgIHB1YmxpYyB1cmw6IHN0cmluZykge31cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgd2hlbiBhIG5hdmlnYXRpb24gc3RhcnRzLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIE5hdmlnYXRpb25TdGFydCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5OYXZpZ2F0aW9uU3RhcnQ7XG5cbiAgLyoqXG4gICAqIElkZW50aWZpZXMgdGhlIGNhbGwgb3IgZXZlbnQgdGhhdCB0cmlnZ2VyZWQgdGhlIG5hdmlnYXRpb24uXG4gICAqIEFuIGBpbXBlcmF0aXZlYCB0cmlnZ2VyIGlzIGEgY2FsbCB0byBgcm91dGVyLm5hdmlnYXRlQnlVcmwoKWAgb3IgYHJvdXRlci5uYXZpZ2F0ZSgpYC5cbiAgICpcbiAgICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkVuZH1cbiAgICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkNhbmNlbH1cbiAgICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkVycm9yfVxuICAgKi9cbiAgbmF2aWdhdGlvblRyaWdnZXI/OiBOYXZpZ2F0aW9uVHJpZ2dlcjtcblxuICAvKipcbiAgICogVGhlIG5hdmlnYXRpb24gc3RhdGUgdGhhdCB3YXMgcHJldmlvdXNseSBzdXBwbGllZCB0byB0aGUgYHB1c2hTdGF0ZWAgY2FsbCxcbiAgICogd2hlbiB0aGUgbmF2aWdhdGlvbiBpcyB0cmlnZ2VyZWQgYnkgYSBgcG9wc3RhdGVgIGV2ZW50LiBPdGhlcndpc2UgbnVsbC5cbiAgICpcbiAgICogVGhlIHN0YXRlIG9iamVjdCBpcyBkZWZpbmVkIGJ5IGBOYXZpZ2F0aW9uRXh0cmFzYCwgYW5kIGNvbnRhaW5zIGFueVxuICAgKiBkZXZlbG9wZXItZGVmaW5lZCBzdGF0ZSB2YWx1ZSwgYXMgd2VsbCBhcyBhIHVuaXF1ZSBJRCB0aGF0XG4gICAqIHRoZSByb3V0ZXIgYXNzaWducyB0byBldmVyeSByb3V0ZXIgdHJhbnNpdGlvbi9uYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBGcm9tIHRoZSBwZXJzcGVjdGl2ZSBvZiB0aGUgcm91dGVyLCB0aGUgcm91dGVyIG5ldmVyIFwiZ29lcyBiYWNrXCIuXG4gICAqIFdoZW4gdGhlIHVzZXIgY2xpY2tzIG9uIHRoZSBiYWNrIGJ1dHRvbiBpbiB0aGUgYnJvd3NlcixcbiAgICogYSBuZXcgbmF2aWdhdGlvbiBJRCBpcyBjcmVhdGVkLlxuICAgKlxuICAgKiBVc2UgdGhlIElEIGluIHRoaXMgcHJldmlvdXMtc3RhdGUgb2JqZWN0IHRvIGRpZmZlcmVudGlhdGUgYmV0d2VlbiBhIG5ld2x5IGNyZWF0ZWRcbiAgICogc3RhdGUgYW5kIG9uZSByZXR1cm5lZCB0byBieSBhIGBwb3BzdGF0ZWAgZXZlbnQsIHNvIHRoYXQgeW91IGNhbiByZXN0b3JlIHNvbWVcbiAgICogcmVtZW1iZXJlZCBzdGF0ZSwgc3VjaCBhcyBzY3JvbGwgcG9zaXRpb24uXG4gICAqXG4gICAqL1xuICByZXN0b3JlZFN0YXRlPzoge1trOiBzdHJpbmddOiBhbnksIG5hdmlnYXRpb25JZDogbnVtYmVyfXxudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgbmF2aWdhdGlvblRyaWdnZXI6IE5hdmlnYXRpb25UcmlnZ2VyID0gJ2ltcGVyYXRpdmUnLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHJlc3RvcmVkU3RhdGU6IHtbazogc3RyaW5nXTogYW55LCBuYXZpZ2F0aW9uSWQ6IG51bWJlcn18bnVsbCA9IG51bGwpIHtcbiAgICBzdXBlcihpZCwgdXJsKTtcbiAgICB0aGlzLm5hdmlnYXRpb25UcmlnZ2VyID0gbmF2aWdhdGlvblRyaWdnZXI7XG4gICAgdGhpcy5yZXN0b3JlZFN0YXRlID0gcmVzdG9yZWRTdGF0ZTtcbiAgfVxuXG4gIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gIG92ZXJyaWRlIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBOYXZpZ2F0aW9uU3RhcnQoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JylgO1xuICB9XG59XG5cbi8qKlxuICogQW4gZXZlbnQgdHJpZ2dlcmVkIHdoZW4gYSBuYXZpZ2F0aW9uIGVuZHMgc3VjY2Vzc2Z1bGx5LlxuICpcbiAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25TdGFydH1cbiAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25DYW5jZWx9XG4gKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uRXJyb3J9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgTmF2aWdhdGlvbkVuZCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5OYXZpZ2F0aW9uRW5kO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHVybEFmdGVyUmVkaXJlY3RzOiBzdHJpbmcpIHtcbiAgICBzdXBlcihpZCwgdXJsKTtcbiAgfVxuXG4gIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gIG92ZXJyaWRlIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBOYXZpZ2F0aW9uRW5kKGlkOiAke3RoaXMuaWR9LCB1cmw6ICcke3RoaXMudXJsfScsIHVybEFmdGVyUmVkaXJlY3RzOiAnJHtcbiAgICAgICAgdGhpcy51cmxBZnRlclJlZGlyZWN0c30nKWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGNvZGUgZm9yIHRoZSBgTmF2aWdhdGlvbkNhbmNlbGAgZXZlbnQgb2YgdGhlIGBSb3V0ZXJgIHRvIGluZGljYXRlIHRoZVxuICogcmVhc29uIGEgbmF2aWdhdGlvbiBmYWlsZWQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZW51bSBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZSB7XG4gIC8qKlxuICAgKiBBIG5hdmlnYXRpb24gZmFpbGVkIGJlY2F1c2UgYSBndWFyZCByZXR1cm5lZCBhIGBVcmxUcmVlYCB0byByZWRpcmVjdC5cbiAgICovXG4gIFJlZGlyZWN0LFxuICAvKipcbiAgICogQSBuYXZpZ2F0aW9uIGZhaWxlZCBiZWNhdXNlIGEgbW9yZSByZWNlbnQgbmF2aWdhdGlvbiBzdGFydGVkLlxuICAgKi9cbiAgU3VwZXJzZWRlZEJ5TmV3TmF2aWdhdGlvbixcbiAgLyoqXG4gICAqIEEgbmF2aWdhdGlvbiBmYWlsZWQgYmVjYXVzZSBvbmUgb2YgdGhlIHJlc29sdmVycyBjb21wbGV0ZWQgd2l0aG91dCBlbWl0dGluZyBhIHZhbHVlLlxuICAgKi9cbiAgTm9EYXRhRnJvbVJlc29sdmVyLFxuICAvKipcbiAgICogQSBuYXZpZ2F0aW9uIGZhaWxlZCBiZWNhdXNlIGEgZ3VhcmQgcmV0dXJuZWQgYGZhbHNlYC5cbiAgICovXG4gIEd1YXJkUmVqZWN0ZWQsXG59XG5cbi8qKlxuICogQSBjb2RlIGZvciB0aGUgYE5hdmlnYXRpb25Ta2lwcGVkYCBldmVudCBvZiB0aGUgYFJvdXRlcmAgdG8gaW5kaWNhdGUgdGhlXG4gKiByZWFzb24gYSBuYXZpZ2F0aW9uIHdhcyBza2lwcGVkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGVudW0gTmF2aWdhdGlvblNraXBwZWRDb2RlIHtcbiAgLyoqXG4gICAqIEEgbmF2aWdhdGlvbiB3YXMgc2tpcHBlZCBiZWNhdXNlIHRoZSBuYXZpZ2F0aW9uIFVSTCB3YXMgdGhlIHNhbWUgYXMgdGhlIGN1cnJlbnQgUm91dGVyIFVSTC5cbiAgICovXG4gIElnbm9yZWRTYW1lVXJsTmF2aWdhdGlvbixcbiAgLyoqXG4gICAqIEEgbmF2aWdhdGlvbiB3YXMgc2tpcHBlZCBiZWNhdXNlIHRoZSBjb25maWd1cmVkIGBVcmxIYW5kbGluZ1N0cmF0ZWd5YCByZXR1cm4gYGZhbHNlYCBmb3IgYm90aFxuICAgKiB0aGUgY3VycmVudCBSb3V0ZXIgVVJMIGFuZCB0aGUgdGFyZ2V0IG9mIHRoZSBuYXZpZ2F0aW9uLlxuICAgKlxuICAgKiBAc2VlIHtAbGluayBVcmxIYW5kbGluZ1N0cmF0ZWd5fVxuICAgKi9cbiAgSWdub3JlZEJ5VXJsSGFuZGxpbmdTdHJhdGVneSxcbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgd2hlbiBhIG5hdmlnYXRpb24gaXMgY2FuY2VsZWQsIGRpcmVjdGx5IG9yIGluZGlyZWN0bHkuXG4gKiBUaGlzIGNhbiBoYXBwZW4gZm9yIHNldmVyYWwgcmVhc29ucyBpbmNsdWRpbmcgd2hlbiBhIHJvdXRlIGd1YXJkXG4gKiByZXR1cm5zIGBmYWxzZWAgb3IgaW5pdGlhdGVzIGEgcmVkaXJlY3QgYnkgcmV0dXJuaW5nIGEgYFVybFRyZWVgLlxuICpcbiAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25TdGFydH1cbiAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25FbmR9XG4gKiBAc2VlIHtAbGluayBOYXZpZ2F0aW9uRXJyb3J9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgTmF2aWdhdGlvbkNhbmNlbCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5OYXZpZ2F0aW9uQ2FuY2VsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKipcbiAgICAgICAqIEEgZGVzY3JpcHRpb24gb2Ygd2h5IHRoZSBuYXZpZ2F0aW9uIHdhcyBjYW5jZWxsZWQuIEZvciBkZWJ1ZyBwdXJwb3NlcyBvbmx5LiBVc2UgYGNvZGVgXG4gICAgICAgKiBpbnN0ZWFkIGZvciBhIHN0YWJsZSBjYW5jZWxsYXRpb24gcmVhc29uIHRoYXQgY2FuIGJlIHVzZWQgaW4gcHJvZHVjdGlvbi5cbiAgICAgICAqL1xuICAgICAgcHVibGljIHJlYXNvbjogc3RyaW5nLFxuICAgICAgLyoqXG4gICAgICAgKiBBIGNvZGUgdG8gaW5kaWNhdGUgd2h5IHRoZSBuYXZpZ2F0aW9uIHdhcyBjYW5jZWxlZC4gVGhpcyBjYW5jZWxsYXRpb24gY29kZSBpcyBzdGFibGUgZm9yXG4gICAgICAgKiB0aGUgcmVhc29uIGFuZCBjYW4gYmUgcmVsaWVkIG9uIHdoZXJlYXMgdGhlIGByZWFzb25gIHN0cmluZyBjb3VsZCBjaGFuZ2UgYW5kIHNob3VsZCBub3QgYmVcbiAgICAgICAqIHVzZWQgaW4gcHJvZHVjdGlvbi5cbiAgICAgICAqL1xuICAgICAgcmVhZG9ubHkgY29kZT86IE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlKSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICBvdmVycmlkZSB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgTmF2aWdhdGlvbkNhbmNlbChpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nKWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgd2hlbiBhIG5hdmlnYXRpb24gaXMgc2tpcHBlZC5cbiAqIFRoaXMgY2FuIGhhcHBlbiBmb3IgYSBjb3VwbGUgcmVhc29ucyBpbmNsdWRpbmcgb25TYW1lVXJsSGFuZGxpbmdcbiAqIGlzIHNldCB0byBgaWdub3JlYCBhbmQgdGhlIG5hdmlnYXRpb24gVVJMIGlzIG5vdCBkaWZmZXJlbnQgdGhhbiB0aGVcbiAqIGN1cnJlbnQgc3RhdGUuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgTmF2aWdhdGlvblNraXBwZWQgZXh0ZW5kcyBSb3V0ZXJFdmVudCB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFdmVudFR5cGUuTmF2aWdhdGlvblNraXBwZWQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKlxuICAgICAgICogQSBkZXNjcmlwdGlvbiBvZiB3aHkgdGhlIG5hdmlnYXRpb24gd2FzIHNraXBwZWQuIEZvciBkZWJ1ZyBwdXJwb3NlcyBvbmx5LiBVc2UgYGNvZGVgXG4gICAgICAgKiBpbnN0ZWFkIGZvciBhIHN0YWJsZSBza2lwcGVkIHJlYXNvbiB0aGF0IGNhbiBiZSB1c2VkIGluIHByb2R1Y3Rpb24uXG4gICAgICAgKi9cbiAgICAgIHB1YmxpYyByZWFzb246IHN0cmluZyxcbiAgICAgIC8qKlxuICAgICAgICogQSBjb2RlIHRvIGluZGljYXRlIHdoeSB0aGUgbmF2aWdhdGlvbiB3YXMgc2tpcHBlZC4gVGhpcyBjb2RlIGlzIHN0YWJsZSBmb3JcbiAgICAgICAqIHRoZSByZWFzb24gYW5kIGNhbiBiZSByZWxpZWQgb24gd2hlcmVhcyB0aGUgYHJlYXNvbmAgc3RyaW5nIGNvdWxkIGNoYW5nZSBhbmQgc2hvdWxkIG5vdCBiZVxuICAgICAgICogdXNlZCBpbiBwcm9kdWN0aW9uLlxuICAgICAgICovXG4gICAgICByZWFkb25seSBjb2RlPzogTmF2aWdhdGlvblNraXBwZWRDb2RlKSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgd2hlbiBhIG5hdmlnYXRpb24gZmFpbHMgZHVlIHRvIGFuIHVuZXhwZWN0ZWQgZXJyb3IuXG4gKlxuICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvblN0YXJ0fVxuICogQHNlZSB7QGxpbmsgTmF2aWdhdGlvbkVuZH1cbiAqIEBzZWUge0BsaW5rIE5hdmlnYXRpb25DYW5jZWx9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgTmF2aWdhdGlvbkVycm9yIGV4dGVuZHMgUm91dGVyRXZlbnQge1xuICByZWFkb25seSB0eXBlID0gRXZlbnRUeXBlLk5hdmlnYXRpb25FcnJvcjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBpZDogbnVtYmVyLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHVybDogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBlcnJvcjogYW55LFxuICAgICAgLyoqXG4gICAgICAgKiBUaGUgdGFyZ2V0IG9mIHRoZSBuYXZpZ2F0aW9uIHdoZW4gdGhlIGVycm9yIG9jY3VycmVkLlxuICAgICAgICpcbiAgICAgICAqIE5vdGUgdGhhdCB0aGlzIGNhbiBiZSBgdW5kZWZpbmVkYCBiZWNhdXNlIGFuIGVycm9yIGNvdWxkIGhhdmUgb2NjdXJyZWQgYmVmb3JlIHRoZVxuICAgICAgICogYFJvdXRlclN0YXRlU25hcHNob3RgIHdhcyBjcmVhdGVkIGZvciB0aGUgbmF2aWdhdGlvbi5cbiAgICAgICAqL1xuICAgICAgcmVhZG9ubHkgdGFyZ2V0PzogUm91dGVyU3RhdGVTbmFwc2hvdCkge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgb3ZlcnJpZGUgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYE5hdmlnYXRpb25FcnJvcihpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nLCBlcnJvcjogJHt0aGlzLmVycm9yfSlgO1xuICB9XG59XG5cbi8qKlxuICogQW4gZXZlbnQgdHJpZ2dlcmVkIHdoZW4gcm91dGVzIGFyZSByZWNvZ25pemVkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlc1JlY29nbml6ZWQgZXh0ZW5kcyBSb3V0ZXJFdmVudCB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFdmVudFR5cGUuUm91dGVzUmVjb2duaXplZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBpZDogbnVtYmVyLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHVybDogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyB1cmxBZnRlclJlZGlyZWN0czogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCkge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgb3ZlcnJpZGUgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFJvdXRlc1JlY29nbml6ZWQoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke1xuICAgICAgICB0aGlzLnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3RoaXMuc3RhdGV9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgYXQgdGhlIHN0YXJ0IG9mIHRoZSBHdWFyZCBwaGFzZSBvZiByb3V0aW5nLlxuICpcbiAqIEBzZWUge0BsaW5rIEd1YXJkc0NoZWNrRW5kfVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIEd1YXJkc0NoZWNrU3RhcnQgZXh0ZW5kcyBSb3V0ZXJFdmVudCB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFdmVudFR5cGUuR3VhcmRzQ2hlY2tTdGFydDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBpZDogbnVtYmVyLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHVybDogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyB1cmxBZnRlclJlZGlyZWN0czogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCkge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgb3ZlcnJpZGUgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYEd1YXJkc0NoZWNrU3RhcnQoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke1xuICAgICAgICB0aGlzLnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3RoaXMuc3RhdGV9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgYXQgdGhlIGVuZCBvZiB0aGUgR3VhcmQgcGhhc2Ugb2Ygcm91dGluZy5cbiAqXG4gKiBAc2VlIHtAbGluayBHdWFyZHNDaGVja1N0YXJ0fVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIEd1YXJkc0NoZWNrRW5kIGV4dGVuZHMgUm91dGVyRXZlbnQge1xuICByZWFkb25seSB0eXBlID0gRXZlbnRUeXBlLkd1YXJkc0NoZWNrRW5kO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgdXJsOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHVybEFmdGVyUmVkaXJlY3RzOiBzdHJpbmcsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzaG91bGRBY3RpdmF0ZTogYm9vbGVhbikge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgb3ZlcnJpZGUgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYEd1YXJkc0NoZWNrRW5kKGlkOiAke3RoaXMuaWR9LCB1cmw6ICcke3RoaXMudXJsfScsIHVybEFmdGVyUmVkaXJlY3RzOiAnJHtcbiAgICAgICAgdGhpcy51cmxBZnRlclJlZGlyZWN0c30nLCBzdGF0ZTogJHt0aGlzLnN0YXRlfSwgc2hvdWxkQWN0aXZhdGU6ICR7dGhpcy5zaG91bGRBY3RpdmF0ZX0pYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCBhdCB0aGUgc3RhcnQgb2YgdGhlIFJlc29sdmUgcGhhc2Ugb2Ygcm91dGluZy5cbiAqXG4gKiBSdW5zIGluIHRoZSBcInJlc29sdmVcIiBwaGFzZSB3aGV0aGVyIG9yIG5vdCB0aGVyZSBpcyBhbnl0aGluZyB0byByZXNvbHZlLlxuICogSW4gZnV0dXJlLCBtYXkgY2hhbmdlIHRvIG9ubHkgcnVuIHdoZW4gdGhlcmUgYXJlIHRoaW5ncyB0byBiZSByZXNvbHZlZC5cbiAqXG4gKiBAc2VlIHtAbGluayBSZXNvbHZlRW5kfVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFJlc29sdmVTdGFydCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5SZXNvbHZlU3RhcnQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgdXJsQWZ0ZXJSZWRpcmVjdHM6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgc3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QpIHtcbiAgICBzdXBlcihpZCwgdXJsKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBSZXNvbHZlU3RhcnQoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke1xuICAgICAgICB0aGlzLnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3RoaXMuc3RhdGV9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgYXQgdGhlIGVuZCBvZiB0aGUgUmVzb2x2ZSBwaGFzZSBvZiByb3V0aW5nLlxuICogQHNlZSB7QGxpbmsgUmVzb2x2ZVN0YXJ0fVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFJlc29sdmVFbmQgZXh0ZW5kcyBSb3V0ZXJFdmVudCB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFdmVudFR5cGUuUmVzb2x2ZUVuZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBpZDogbnVtYmVyLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHVybDogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyB1cmxBZnRlclJlZGlyZWN0czogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCkge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgb3ZlcnJpZGUgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFJlc29sdmVFbmQoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke1xuICAgICAgICB0aGlzLnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3RoaXMuc3RhdGV9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgYmVmb3JlIGxhenkgbG9hZGluZyBhIHJvdXRlIGNvbmZpZ3VyYXRpb24uXG4gKlxuICogQHNlZSB7QGxpbmsgUm91dGVDb25maWdMb2FkRW5kfVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlQ29uZmlnTG9hZFN0YXJ0IHtcbiAgcmVhZG9ubHkgdHlwZSA9IEV2ZW50VHlwZS5Sb3V0ZUNvbmZpZ0xvYWRTdGFydDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgcm91dGU6IFJvdXRlKSB7fVxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgUm91dGVDb25maWdMb2FkU3RhcnQocGF0aDogJHt0aGlzLnJvdXRlLnBhdGh9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgd2hlbiBhIHJvdXRlIGhhcyBiZWVuIGxhenkgbG9hZGVkLlxuICpcbiAqIEBzZWUge0BsaW5rIFJvdXRlQ29uZmlnTG9hZFN0YXJ0fVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlQ29uZmlnTG9hZEVuZCB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFdmVudFR5cGUuUm91dGVDb25maWdMb2FkRW5kO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyByb3V0ZTogUm91dGUpIHt9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBSb3V0ZUNvbmZpZ0xvYWRFbmQocGF0aDogJHt0aGlzLnJvdXRlLnBhdGh9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgYXQgdGhlIHN0YXJ0IG9mIHRoZSBjaGlsZC1hY3RpdmF0aW9uXG4gKiBwYXJ0IG9mIHRoZSBSZXNvbHZlIHBoYXNlIG9mIHJvdXRpbmcuXG4gKiBAc2VlIHtAbGluayBDaGlsZEFjdGl2YXRpb25FbmR9XG4gKiBAc2VlIHtAbGluayBSZXNvbHZlU3RhcnR9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgQ2hpbGRBY3RpdmF0aW9uU3RhcnQge1xuICByZWFkb25seSB0eXBlID0gRXZlbnRUeXBlLkNoaWxkQWN0aXZhdGlvblN0YXJ0O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCkge31cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy5zbmFwc2hvdC5yb3V0ZUNvbmZpZyAmJiB0aGlzLnNuYXBzaG90LnJvdXRlQ29uZmlnLnBhdGggfHwgJyc7XG4gICAgcmV0dXJuIGBDaGlsZEFjdGl2YXRpb25TdGFydChwYXRoOiAnJHtwYXRofScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRyaWdnZXJlZCBhdCB0aGUgZW5kIG9mIHRoZSBjaGlsZC1hY3RpdmF0aW9uIHBhcnRcbiAqIG9mIHRoZSBSZXNvbHZlIHBoYXNlIG9mIHJvdXRpbmcuXG4gKiBAc2VlIHtAbGluayBDaGlsZEFjdGl2YXRpb25TdGFydH1cbiAqIEBzZWUge0BsaW5rIFJlc29sdmVTdGFydH1cbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIENoaWxkQWN0aXZhdGlvbkVuZCB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFdmVudFR5cGUuQ2hpbGRBY3RpdmF0aW9uRW5kO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCkge31cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy5zbmFwc2hvdC5yb3V0ZUNvbmZpZyAmJiB0aGlzLnNuYXBzaG90LnJvdXRlQ29uZmlnLnBhdGggfHwgJyc7XG4gICAgcmV0dXJuIGBDaGlsZEFjdGl2YXRpb25FbmQocGF0aDogJyR7cGF0aH0nKWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgYXQgdGhlIHN0YXJ0IG9mIHRoZSBhY3RpdmF0aW9uIHBhcnRcbiAqIG9mIHRoZSBSZXNvbHZlIHBoYXNlIG9mIHJvdXRpbmcuXG4gKiBAc2VlIHtAbGluayBBY3RpdmF0aW9uRW5kfVxuICogQHNlZSB7QGxpbmsgUmVzb2x2ZVN0YXJ0fVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIEFjdGl2YXRpb25TdGFydCB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFdmVudFR5cGUuQWN0aXZhdGlvblN0YXJ0O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCkge31cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy5zbmFwc2hvdC5yb3V0ZUNvbmZpZyAmJiB0aGlzLnNuYXBzaG90LnJvdXRlQ29uZmlnLnBhdGggfHwgJyc7XG4gICAgcmV0dXJuIGBBY3RpdmF0aW9uU3RhcnQocGF0aDogJyR7cGF0aH0nKWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgYXQgdGhlIGVuZCBvZiB0aGUgYWN0aXZhdGlvbiBwYXJ0XG4gKiBvZiB0aGUgUmVzb2x2ZSBwaGFzZSBvZiByb3V0aW5nLlxuICogQHNlZSB7QGxpbmsgQWN0aXZhdGlvblN0YXJ0fVxuICogQHNlZSB7QGxpbmsgUmVzb2x2ZVN0YXJ0fVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIEFjdGl2YXRpb25FbmQge1xuICByZWFkb25seSB0eXBlID0gRXZlbnRUeXBlLkFjdGl2YXRpb25FbmQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSB7fVxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBhdGggPSB0aGlzLnNuYXBzaG90LnJvdXRlQ29uZmlnICYmIHRoaXMuc25hcHNob3Qucm91dGVDb25maWcucGF0aCB8fCAnJztcbiAgICByZXR1cm4gYEFjdGl2YXRpb25FbmQocGF0aDogJyR7cGF0aH0nKWA7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBldmVudCB0cmlnZ2VyZWQgYnkgc2Nyb2xsaW5nLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFNjcm9sbCB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFdmVudFR5cGUuU2Nyb2xsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHJlYWRvbmx5IHJvdXRlckV2ZW50OiBOYXZpZ2F0aW9uRW5kfE5hdmlnYXRpb25Ta2lwcGVkLFxuXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcmVhZG9ubHkgcG9zaXRpb246IFtudW1iZXIsIG51bWJlcl18bnVsbCxcblxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHJlYWRvbmx5IGFuY2hvcjogc3RyaW5nfG51bGwpIHt9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwb3MgPSB0aGlzLnBvc2l0aW9uID8gYCR7dGhpcy5wb3NpdGlvblswXX0sICR7dGhpcy5wb3NpdGlvblsxXX1gIDogbnVsbDtcbiAgICByZXR1cm4gYFNjcm9sbChhbmNob3I6ICcke3RoaXMuYW5jaG9yfScsIHBvc2l0aW9uOiAnJHtwb3N9JylgO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBCZWZvcmVBY3RpdmF0ZVJvdXRlcyB7fVxuZXhwb3J0IGNsYXNzIFJlZGlyZWN0UmVxdWVzdCB7XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHVybDogVXJsVHJlZSkge31cbn1cbmV4cG9ydCB0eXBlIFByaXZhdGVSb3V0ZXJFdmVudHMgPSBCZWZvcmVBY3RpdmF0ZVJvdXRlc3xSZWRpcmVjdFJlcXVlc3Q7XG5cbi8qKlxuICogUm91dGVyIGV2ZW50cyB0aGF0IGFsbG93IHlvdSB0byB0cmFjayB0aGUgbGlmZWN5Y2xlIG9mIHRoZSByb3V0ZXIuXG4gKlxuICogVGhlIGV2ZW50cyBvY2N1ciBpbiB0aGUgZm9sbG93aW5nIHNlcXVlbmNlOlxuICpcbiAqICogW05hdmlnYXRpb25TdGFydF0oYXBpL3JvdXRlci9OYXZpZ2F0aW9uU3RhcnQpOiBOYXZpZ2F0aW9uIHN0YXJ0cy5cbiAqICogW1JvdXRlQ29uZmlnTG9hZFN0YXJ0XShhcGkvcm91dGVyL1JvdXRlQ29uZmlnTG9hZFN0YXJ0KTogQmVmb3JlXG4gKiB0aGUgcm91dGVyIFtsYXp5IGxvYWRzXSgvZ3VpZGUvcm91dGVyI2xhenktbG9hZGluZykgYSByb3V0ZSBjb25maWd1cmF0aW9uLlxuICogKiBbUm91dGVDb25maWdMb2FkRW5kXShhcGkvcm91dGVyL1JvdXRlQ29uZmlnTG9hZEVuZCk6IEFmdGVyIGEgcm91dGUgaGFzIGJlZW4gbGF6eSBsb2FkZWQuXG4gKiAqIFtSb3V0ZXNSZWNvZ25pemVkXShhcGkvcm91dGVyL1JvdXRlc1JlY29nbml6ZWQpOiBXaGVuIHRoZSByb3V0ZXIgcGFyc2VzIHRoZSBVUkxcbiAqIGFuZCB0aGUgcm91dGVzIGFyZSByZWNvZ25pemVkLlxuICogKiBbR3VhcmRzQ2hlY2tTdGFydF0oYXBpL3JvdXRlci9HdWFyZHNDaGVja1N0YXJ0KTogV2hlbiB0aGUgcm91dGVyIGJlZ2lucyB0aGUgKmd1YXJkcypcbiAqIHBoYXNlIG9mIHJvdXRpbmcuXG4gKiAqIFtDaGlsZEFjdGl2YXRpb25TdGFydF0oYXBpL3JvdXRlci9DaGlsZEFjdGl2YXRpb25TdGFydCk6IFdoZW4gdGhlIHJvdXRlclxuICogYmVnaW5zIGFjdGl2YXRpbmcgYSByb3V0ZSdzIGNoaWxkcmVuLlxuICogKiBbQWN0aXZhdGlvblN0YXJ0XShhcGkvcm91dGVyL0FjdGl2YXRpb25TdGFydCk6IFdoZW4gdGhlIHJvdXRlciBiZWdpbnMgYWN0aXZhdGluZyBhIHJvdXRlLlxuICogKiBbR3VhcmRzQ2hlY2tFbmRdKGFwaS9yb3V0ZXIvR3VhcmRzQ2hlY2tFbmQpOiBXaGVuIHRoZSByb3V0ZXIgZmluaXNoZXMgdGhlICpndWFyZHMqXG4gKiBwaGFzZSBvZiByb3V0aW5nIHN1Y2Nlc3NmdWxseS5cbiAqICogW1Jlc29sdmVTdGFydF0oYXBpL3JvdXRlci9SZXNvbHZlU3RhcnQpOiBXaGVuIHRoZSByb3V0ZXIgYmVnaW5zIHRoZSAqcmVzb2x2ZSpcbiAqIHBoYXNlIG9mIHJvdXRpbmcuXG4gKiAqIFtSZXNvbHZlRW5kXShhcGkvcm91dGVyL1Jlc29sdmVFbmQpOiBXaGVuIHRoZSByb3V0ZXIgZmluaXNoZXMgdGhlICpyZXNvbHZlKlxuICogcGhhc2Ugb2Ygcm91dGluZyBzdWNjZXNzZnVsbHkuXG4gKiAqIFtDaGlsZEFjdGl2YXRpb25FbmRdKGFwaS9yb3V0ZXIvQ2hpbGRBY3RpdmF0aW9uRW5kKTogV2hlbiB0aGUgcm91dGVyIGZpbmlzaGVzXG4gKiBhY3RpdmF0aW5nIGEgcm91dGUncyBjaGlsZHJlbi5cbiAqICogW0FjdGl2YXRpb25FbmRdKGFwaS9yb3V0ZXIvQWN0aXZhdGlvbkVuZCk6IFdoZW4gdGhlIHJvdXRlciBmaW5pc2hlcyBhY3RpdmF0aW5nIGEgcm91dGUuXG4gKiAqIFtOYXZpZ2F0aW9uRW5kXShhcGkvcm91dGVyL05hdmlnYXRpb25FbmQpOiBXaGVuIG5hdmlnYXRpb24gZW5kcyBzdWNjZXNzZnVsbHkuXG4gKiAqIFtOYXZpZ2F0aW9uQ2FuY2VsXShhcGkvcm91dGVyL05hdmlnYXRpb25DYW5jZWwpOiBXaGVuIG5hdmlnYXRpb24gaXMgY2FuY2VsZWQuXG4gKiAqIFtOYXZpZ2F0aW9uRXJyb3JdKGFwaS9yb3V0ZXIvTmF2aWdhdGlvbkVycm9yKTogV2hlbiBuYXZpZ2F0aW9uIGZhaWxzXG4gKiBkdWUgdG8gYW4gdW5leHBlY3RlZCBlcnJvci5cbiAqICogW1Njcm9sbF0oYXBpL3JvdXRlci9TY3JvbGwpOiBXaGVuIHRoZSB1c2VyIHNjcm9sbHMuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBFdmVudCA9IE5hdmlnYXRpb25TdGFydHxOYXZpZ2F0aW9uRW5kfE5hdmlnYXRpb25DYW5jZWx8TmF2aWdhdGlvbkVycm9yfFJvdXRlc1JlY29nbml6ZWR8XG4gICAgR3VhcmRzQ2hlY2tTdGFydHxHdWFyZHNDaGVja0VuZHxSb3V0ZUNvbmZpZ0xvYWRTdGFydHxSb3V0ZUNvbmZpZ0xvYWRFbmR8Q2hpbGRBY3RpdmF0aW9uU3RhcnR8XG4gICAgQ2hpbGRBY3RpdmF0aW9uRW5kfEFjdGl2YXRpb25TdGFydHxBY3RpdmF0aW9uRW5kfFNjcm9sbHxSZXNvbHZlU3RhcnR8UmVzb2x2ZUVuZHxcbiAgICBOYXZpZ2F0aW9uU2tpcHBlZDtcblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZ2lmeUV2ZW50KHJvdXRlckV2ZW50OiBFdmVudCk6IHN0cmluZyB7XG4gIHN3aXRjaCAocm91dGVyRXZlbnQudHlwZSkge1xuICAgIGNhc2UgRXZlbnRUeXBlLkFjdGl2YXRpb25FbmQ6XG4gICAgICByZXR1cm4gYEFjdGl2YXRpb25FbmQocGF0aDogJyR7cm91dGVyRXZlbnQuc25hcHNob3Qucm91dGVDb25maWc/LnBhdGggfHwgJyd9JylgO1xuICAgIGNhc2UgRXZlbnRUeXBlLkFjdGl2YXRpb25TdGFydDpcbiAgICAgIHJldHVybiBgQWN0aXZhdGlvblN0YXJ0KHBhdGg6ICcke3JvdXRlckV2ZW50LnNuYXBzaG90LnJvdXRlQ29uZmlnPy5wYXRoIHx8ICcnfScpYDtcbiAgICBjYXNlIEV2ZW50VHlwZS5DaGlsZEFjdGl2YXRpb25FbmQ6XG4gICAgICByZXR1cm4gYENoaWxkQWN0aXZhdGlvbkVuZChwYXRoOiAnJHtyb3V0ZXJFdmVudC5zbmFwc2hvdC5yb3V0ZUNvbmZpZz8ucGF0aCB8fCAnJ30nKWA7XG4gICAgY2FzZSBFdmVudFR5cGUuQ2hpbGRBY3RpdmF0aW9uU3RhcnQ6XG4gICAgICByZXR1cm4gYENoaWxkQWN0aXZhdGlvblN0YXJ0KHBhdGg6ICcke3JvdXRlckV2ZW50LnNuYXBzaG90LnJvdXRlQ29uZmlnPy5wYXRoIHx8ICcnfScpYDtcbiAgICBjYXNlIEV2ZW50VHlwZS5HdWFyZHNDaGVja0VuZDpcbiAgICAgIHJldHVybiBgR3VhcmRzQ2hlY2tFbmQoaWQ6ICR7cm91dGVyRXZlbnQuaWR9LCB1cmw6ICcke1xuICAgICAgICAgIHJvdXRlckV2ZW50LnVybH0nLCB1cmxBZnRlclJlZGlyZWN0czogJyR7cm91dGVyRXZlbnQudXJsQWZ0ZXJSZWRpcmVjdHN9Jywgc3RhdGU6ICR7XG4gICAgICAgICAgcm91dGVyRXZlbnQuc3RhdGV9LCBzaG91bGRBY3RpdmF0ZTogJHtyb3V0ZXJFdmVudC5zaG91bGRBY3RpdmF0ZX0pYDtcbiAgICBjYXNlIEV2ZW50VHlwZS5HdWFyZHNDaGVja1N0YXJ0OlxuICAgICAgcmV0dXJuIGBHdWFyZHNDaGVja1N0YXJ0KGlkOiAke3JvdXRlckV2ZW50LmlkfSwgdXJsOiAnJHtcbiAgICAgICAgICByb3V0ZXJFdmVudC51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke3JvdXRlckV2ZW50LnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke1xuICAgICAgICAgIHJvdXRlckV2ZW50LnN0YXRlfSlgO1xuICAgIGNhc2UgRXZlbnRUeXBlLk5hdmlnYXRpb25DYW5jZWw6XG4gICAgICByZXR1cm4gYE5hdmlnYXRpb25DYW5jZWwoaWQ6ICR7cm91dGVyRXZlbnQuaWR9LCB1cmw6ICcke3JvdXRlckV2ZW50LnVybH0nKWA7XG4gICAgY2FzZSBFdmVudFR5cGUuTmF2aWdhdGlvblNraXBwZWQ6XG4gICAgICByZXR1cm4gYE5hdmlnYXRpb25Ta2lwcGVkKGlkOiAke3JvdXRlckV2ZW50LmlkfSwgdXJsOiAnJHtyb3V0ZXJFdmVudC51cmx9JylgO1xuICAgIGNhc2UgRXZlbnRUeXBlLk5hdmlnYXRpb25FbmQ6XG4gICAgICByZXR1cm4gYE5hdmlnYXRpb25FbmQoaWQ6ICR7cm91dGVyRXZlbnQuaWR9LCB1cmw6ICcke3JvdXRlckV2ZW50LnVybH0nLCB1cmxBZnRlclJlZGlyZWN0czogJyR7XG4gICAgICAgICAgcm91dGVyRXZlbnQudXJsQWZ0ZXJSZWRpcmVjdHN9JylgO1xuICAgIGNhc2UgRXZlbnRUeXBlLk5hdmlnYXRpb25FcnJvcjpcbiAgICAgIHJldHVybiBgTmF2aWdhdGlvbkVycm9yKGlkOiAke3JvdXRlckV2ZW50LmlkfSwgdXJsOiAnJHtyb3V0ZXJFdmVudC51cmx9JywgZXJyb3I6ICR7XG4gICAgICAgICAgcm91dGVyRXZlbnQuZXJyb3J9KWA7XG4gICAgY2FzZSBFdmVudFR5cGUuTmF2aWdhdGlvblN0YXJ0OlxuICAgICAgcmV0dXJuIGBOYXZpZ2F0aW9uU3RhcnQoaWQ6ICR7cm91dGVyRXZlbnQuaWR9LCB1cmw6ICcke3JvdXRlckV2ZW50LnVybH0nKWA7XG4gICAgY2FzZSBFdmVudFR5cGUuUmVzb2x2ZUVuZDpcbiAgICAgIHJldHVybiBgUmVzb2x2ZUVuZChpZDogJHtyb3V0ZXJFdmVudC5pZH0sIHVybDogJyR7cm91dGVyRXZlbnQudXJsfScsIHVybEFmdGVyUmVkaXJlY3RzOiAnJHtcbiAgICAgICAgICByb3V0ZXJFdmVudC51cmxBZnRlclJlZGlyZWN0c30nLCBzdGF0ZTogJHtyb3V0ZXJFdmVudC5zdGF0ZX0pYDtcbiAgICBjYXNlIEV2ZW50VHlwZS5SZXNvbHZlU3RhcnQ6XG4gICAgICByZXR1cm4gYFJlc29sdmVTdGFydChpZDogJHtyb3V0ZXJFdmVudC5pZH0sIHVybDogJyR7cm91dGVyRXZlbnQudXJsfScsIHVybEFmdGVyUmVkaXJlY3RzOiAnJHtcbiAgICAgICAgICByb3V0ZXJFdmVudC51cmxBZnRlclJlZGlyZWN0c30nLCBzdGF0ZTogJHtyb3V0ZXJFdmVudC5zdGF0ZX0pYDtcbiAgICBjYXNlIEV2ZW50VHlwZS5Sb3V0ZUNvbmZpZ0xvYWRFbmQ6XG4gICAgICByZXR1cm4gYFJvdXRlQ29uZmlnTG9hZEVuZChwYXRoOiAke3JvdXRlckV2ZW50LnJvdXRlLnBhdGh9KWA7XG4gICAgY2FzZSBFdmVudFR5cGUuUm91dGVDb25maWdMb2FkU3RhcnQ6XG4gICAgICByZXR1cm4gYFJvdXRlQ29uZmlnTG9hZFN0YXJ0KHBhdGg6ICR7cm91dGVyRXZlbnQucm91dGUucGF0aH0pYDtcbiAgICBjYXNlIEV2ZW50VHlwZS5Sb3V0ZXNSZWNvZ25pemVkOlxuICAgICAgcmV0dXJuIGBSb3V0ZXNSZWNvZ25pemVkKGlkOiAke3JvdXRlckV2ZW50LmlkfSwgdXJsOiAnJHtcbiAgICAgICAgICByb3V0ZXJFdmVudC51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke3JvdXRlckV2ZW50LnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke1xuICAgICAgICAgIHJvdXRlckV2ZW50LnN0YXRlfSlgO1xuICAgIGNhc2UgRXZlbnRUeXBlLlNjcm9sbDpcbiAgICAgIGNvbnN0IHBvcyA9XG4gICAgICAgICAgcm91dGVyRXZlbnQucG9zaXRpb24gPyBgJHtyb3V0ZXJFdmVudC5wb3NpdGlvblswXX0sICR7cm91dGVyRXZlbnQucG9zaXRpb25bMV19YCA6IG51bGw7XG4gICAgICByZXR1cm4gYFNjcm9sbChhbmNob3I6ICcke3JvdXRlckV2ZW50LmFuY2hvcn0nLCBwb3NpdGlvbjogJyR7cG9zfScpYDtcbiAgfVxufVxuIl19