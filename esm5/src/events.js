/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
/**
 * @description
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
 * @experimental
 */
var /**
 * @description
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
 * @experimental
 */
RouterEvent = /** @class */ (function () {
    function RouterEvent(/** @docsNotRequired */
    id, /** @docsNotRequired */
    url) {
        this.id = id;
        this.url = url;
    }
    return RouterEvent;
}());
/**
 * @description
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
 * @experimental
 */
export { RouterEvent };
/**
 * @description
 *
 * Represents an event triggered when a navigation starts.
 *
 *
 */
var /**
 * @description
 *
 * Represents an event triggered when a navigation starts.
 *
 *
 */
NavigationStart = /** @class */ (function (_super) {
    tslib_1.__extends(NavigationStart, _super);
    function NavigationStart(/** @docsNotRequired */
    /** @docsNotRequired */
    id, /** @docsNotRequired */
    /** @docsNotRequired */
    url, /** @docsNotRequired */
    /** @docsNotRequired */
    navigationTrigger, /** @docsNotRequired */
    /** @docsNotRequired */
    restoredState) {
        /** @docsNotRequired */
        if (navigationTrigger === void 0) { navigationTrigger = 'imperative'; }
        /** @docsNotRequired */
        if (restoredState === void 0) { restoredState = null; }
        var _this = _super.call(this, id, url) || this;
        _this.navigationTrigger = navigationTrigger;
        _this.restoredState = restoredState;
        return _this;
    }
    /** @docsNotRequired */
    /** @docsNotRequired */
    NavigationStart.prototype.toString = /** @docsNotRequired */
    function () { return "NavigationStart(id: " + this.id + ", url: '" + this.url + "')"; };
    return NavigationStart;
}(RouterEvent));
/**
 * @description
 *
 * Represents an event triggered when a navigation starts.
 *
 *
 */
export { NavigationStart };
/**
 * @description
 *
 * Represents an event triggered when a navigation ends successfully.
 *
 *
 */
var /**
 * @description
 *
 * Represents an event triggered when a navigation ends successfully.
 *
 *
 */
NavigationEnd = /** @class */ (function (_super) {
    tslib_1.__extends(NavigationEnd, _super);
    function NavigationEnd(/** @docsNotRequired */
    /** @docsNotRequired */
    id, /** @docsNotRequired */
    /** @docsNotRequired */
    url, /** @docsNotRequired */
    urlAfterRedirects) {
        var _this = _super.call(this, id, url) || this;
        _this.urlAfterRedirects = urlAfterRedirects;
        return _this;
    }
    /** @docsNotRequired */
    /** @docsNotRequired */
    NavigationEnd.prototype.toString = /** @docsNotRequired */
    function () {
        return "NavigationEnd(id: " + this.id + ", url: '" + this.url + "', urlAfterRedirects: '" + this.urlAfterRedirects + "')";
    };
    return NavigationEnd;
}(RouterEvent));
/**
 * @description
 *
 * Represents an event triggered when a navigation ends successfully.
 *
 *
 */
export { NavigationEnd };
/**
 * @description
 *
 * Represents an event triggered when a navigation is canceled.
 *
 *
 */
var /**
 * @description
 *
 * Represents an event triggered when a navigation is canceled.
 *
 *
 */
NavigationCancel = /** @class */ (function (_super) {
    tslib_1.__extends(NavigationCancel, _super);
    function NavigationCancel(/** @docsNotRequired */
    /** @docsNotRequired */
    id, /** @docsNotRequired */
    /** @docsNotRequired */
    url, /** @docsNotRequired */
    reason) {
        var _this = _super.call(this, id, url) || this;
        _this.reason = reason;
        return _this;
    }
    /** @docsNotRequired */
    /** @docsNotRequired */
    NavigationCancel.prototype.toString = /** @docsNotRequired */
    function () { return "NavigationCancel(id: " + this.id + ", url: '" + this.url + "')"; };
    return NavigationCancel;
}(RouterEvent));
/**
 * @description
 *
 * Represents an event triggered when a navigation is canceled.
 *
 *
 */
export { NavigationCancel };
/**
 * @description
 *
 * Represents an event triggered when a navigation fails due to an unexpected error.
 *
 *
 */
var /**
 * @description
 *
 * Represents an event triggered when a navigation fails due to an unexpected error.
 *
 *
 */
NavigationError = /** @class */ (function (_super) {
    tslib_1.__extends(NavigationError, _super);
    function NavigationError(/** @docsNotRequired */
    /** @docsNotRequired */
    id, /** @docsNotRequired */
    /** @docsNotRequired */
    url, /** @docsNotRequired */
    error) {
        var _this = _super.call(this, id, url) || this;
        _this.error = error;
        return _this;
    }
    /** @docsNotRequired */
    /** @docsNotRequired */
    NavigationError.prototype.toString = /** @docsNotRequired */
    function () {
        return "NavigationError(id: " + this.id + ", url: '" + this.url + "', error: " + this.error + ")";
    };
    return NavigationError;
}(RouterEvent));
/**
 * @description
 *
 * Represents an event triggered when a navigation fails due to an unexpected error.
 *
 *
 */
export { NavigationError };
/**
 * @description
 *
 * Represents an event triggered when routes are recognized.
 *
 *
 */
var /**
 * @description
 *
 * Represents an event triggered when routes are recognized.
 *
 *
 */
RoutesRecognized = /** @class */ (function (_super) {
    tslib_1.__extends(RoutesRecognized, _super);
    function RoutesRecognized(/** @docsNotRequired */
    /** @docsNotRequired */
    id, /** @docsNotRequired */
    /** @docsNotRequired */
    url, /** @docsNotRequired */
    urlAfterRedirects, /** @docsNotRequired */
    state) {
        var _this = _super.call(this, id, url) || this;
        _this.urlAfterRedirects = urlAfterRedirects;
        _this.state = state;
        return _this;
    }
    /** @docsNotRequired */
    /** @docsNotRequired */
    RoutesRecognized.prototype.toString = /** @docsNotRequired */
    function () {
        return "RoutesRecognized(id: " + this.id + ", url: '" + this.url + "', urlAfterRedirects: '" + this.urlAfterRedirects + "', state: " + this.state + ")";
    };
    return RoutesRecognized;
}(RouterEvent));
/**
 * @description
 *
 * Represents an event triggered when routes are recognized.
 *
 *
 */
export { RoutesRecognized };
/**
 * @description
 *
 * Represents the start of the Guard phase of routing.
 *
 * @experimental
 */
var /**
 * @description
 *
 * Represents the start of the Guard phase of routing.
 *
 * @experimental
 */
GuardsCheckStart = /** @class */ (function (_super) {
    tslib_1.__extends(GuardsCheckStart, _super);
    function GuardsCheckStart(/** @docsNotRequired */
    /** @docsNotRequired */
    id, /** @docsNotRequired */
    /** @docsNotRequired */
    url, /** @docsNotRequired */
    urlAfterRedirects, /** @docsNotRequired */
    state) {
        var _this = _super.call(this, id, url) || this;
        _this.urlAfterRedirects = urlAfterRedirects;
        _this.state = state;
        return _this;
    }
    GuardsCheckStart.prototype.toString = function () {
        return "GuardsCheckStart(id: " + this.id + ", url: '" + this.url + "', urlAfterRedirects: '" + this.urlAfterRedirects + "', state: " + this.state + ")";
    };
    return GuardsCheckStart;
}(RouterEvent));
/**
 * @description
 *
 * Represents the start of the Guard phase of routing.
 *
 * @experimental
 */
export { GuardsCheckStart };
/**
 * @description
 *
 * Represents the end of the Guard phase of routing.
 *
 * @experimental
 */
var /**
 * @description
 *
 * Represents the end of the Guard phase of routing.
 *
 * @experimental
 */
GuardsCheckEnd = /** @class */ (function (_super) {
    tslib_1.__extends(GuardsCheckEnd, _super);
    function GuardsCheckEnd(/** @docsNotRequired */
    /** @docsNotRequired */
    id, /** @docsNotRequired */
    /** @docsNotRequired */
    url, /** @docsNotRequired */
    urlAfterRedirects, /** @docsNotRequired */
    state, /** @docsNotRequired */
    shouldActivate) {
        var _this = _super.call(this, id, url) || this;
        _this.urlAfterRedirects = urlAfterRedirects;
        _this.state = state;
        _this.shouldActivate = shouldActivate;
        return _this;
    }
    GuardsCheckEnd.prototype.toString = function () {
        return "GuardsCheckEnd(id: " + this.id + ", url: '" + this.url + "', urlAfterRedirects: '" + this.urlAfterRedirects + "', state: " + this.state + ", shouldActivate: " + this.shouldActivate + ")";
    };
    return GuardsCheckEnd;
}(RouterEvent));
/**
 * @description
 *
 * Represents the end of the Guard phase of routing.
 *
 * @experimental
 */
export { GuardsCheckEnd };
/**
 * @description
 *
 * Represents the start of the Resolve phase of routing. The timing of this
 * event may change, thus it's experimental. In the current iteration it will run
 * in the "resolve" phase whether there's things to resolve or not. In the future this
 * behavior may change to only run when there are things to be resolved.
 *
 * @experimental
 */
var /**
 * @description
 *
 * Represents the start of the Resolve phase of routing. The timing of this
 * event may change, thus it's experimental. In the current iteration it will run
 * in the "resolve" phase whether there's things to resolve or not. In the future this
 * behavior may change to only run when there are things to be resolved.
 *
 * @experimental
 */
ResolveStart = /** @class */ (function (_super) {
    tslib_1.__extends(ResolveStart, _super);
    function ResolveStart(/** @docsNotRequired */
    /** @docsNotRequired */
    id, /** @docsNotRequired */
    /** @docsNotRequired */
    url, /** @docsNotRequired */
    urlAfterRedirects, /** @docsNotRequired */
    state) {
        var _this = _super.call(this, id, url) || this;
        _this.urlAfterRedirects = urlAfterRedirects;
        _this.state = state;
        return _this;
    }
    ResolveStart.prototype.toString = function () {
        return "ResolveStart(id: " + this.id + ", url: '" + this.url + "', urlAfterRedirects: '" + this.urlAfterRedirects + "', state: " + this.state + ")";
    };
    return ResolveStart;
}(RouterEvent));
/**
 * @description
 *
 * Represents the start of the Resolve phase of routing. The timing of this
 * event may change, thus it's experimental. In the current iteration it will run
 * in the "resolve" phase whether there's things to resolve or not. In the future this
 * behavior may change to only run when there are things to be resolved.
 *
 * @experimental
 */
export { ResolveStart };
/**
 * @description
 *
 * Represents the end of the Resolve phase of routing. See note on
 * `ResolveStart` for use of this experimental API.
 *
 * @experimental
 */
var /**
 * @description
 *
 * Represents the end of the Resolve phase of routing. See note on
 * `ResolveStart` for use of this experimental API.
 *
 * @experimental
 */
ResolveEnd = /** @class */ (function (_super) {
    tslib_1.__extends(ResolveEnd, _super);
    function ResolveEnd(/** @docsNotRequired */
    /** @docsNotRequired */
    id, /** @docsNotRequired */
    /** @docsNotRequired */
    url, /** @docsNotRequired */
    urlAfterRedirects, /** @docsNotRequired */
    state) {
        var _this = _super.call(this, id, url) || this;
        _this.urlAfterRedirects = urlAfterRedirects;
        _this.state = state;
        return _this;
    }
    ResolveEnd.prototype.toString = function () {
        return "ResolveEnd(id: " + this.id + ", url: '" + this.url + "', urlAfterRedirects: '" + this.urlAfterRedirects + "', state: " + this.state + ")";
    };
    return ResolveEnd;
}(RouterEvent));
/**
 * @description
 *
 * Represents the end of the Resolve phase of routing. See note on
 * `ResolveStart` for use of this experimental API.
 *
 * @experimental
 */
export { ResolveEnd };
/**
 * @description
 *
 * Represents an event triggered before lazy loading a route config.
 *
 * @experimental
 */
var /**
 * @description
 *
 * Represents an event triggered before lazy loading a route config.
 *
 * @experimental
 */
RouteConfigLoadStart = /** @class */ (function () {
    function RouteConfigLoadStart(/** @docsNotRequired */
    route) {
        this.route = route;
    }
    RouteConfigLoadStart.prototype.toString = function () { return "RouteConfigLoadStart(path: " + this.route.path + ")"; };
    return RouteConfigLoadStart;
}());
/**
 * @description
 *
 * Represents an event triggered before lazy loading a route config.
 *
 * @experimental
 */
export { RouteConfigLoadStart };
/**
 * @description
 *
 * Represents an event triggered when a route has been lazy loaded.
 *
 * @experimental
 */
var /**
 * @description
 *
 * Represents an event triggered when a route has been lazy loaded.
 *
 * @experimental
 */
RouteConfigLoadEnd = /** @class */ (function () {
    function RouteConfigLoadEnd(/** @docsNotRequired */
    route) {
        this.route = route;
    }
    RouteConfigLoadEnd.prototype.toString = function () { return "RouteConfigLoadEnd(path: " + this.route.path + ")"; };
    return RouteConfigLoadEnd;
}());
/**
 * @description
 *
 * Represents an event triggered when a route has been lazy loaded.
 *
 * @experimental
 */
export { RouteConfigLoadEnd };
/**
 * @description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ChildActivationEnd` for use of this experimental API.
 *
 * @experimental
 */
var /**
 * @description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ChildActivationEnd` for use of this experimental API.
 *
 * @experimental
 */
ChildActivationStart = /** @class */ (function () {
    function ChildActivationStart(/** @docsNotRequired */
    snapshot) {
        this.snapshot = snapshot;
    }
    ChildActivationStart.prototype.toString = function () {
        var path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return "ChildActivationStart(path: '" + path + "')";
    };
    return ChildActivationStart;
}());
/**
 * @description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ChildActivationEnd` for use of this experimental API.
 *
 * @experimental
 */
export { ChildActivationStart };
/**
 * @description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ChildActivationStart` for use of this experimental API.
 *
 * @experimental
 */
var /**
 * @description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ChildActivationStart` for use of this experimental API.
 *
 * @experimental
 */
ChildActivationEnd = /** @class */ (function () {
    function ChildActivationEnd(/** @docsNotRequired */
    snapshot) {
        this.snapshot = snapshot;
    }
    ChildActivationEnd.prototype.toString = function () {
        var path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return "ChildActivationEnd(path: '" + path + "')";
    };
    return ChildActivationEnd;
}());
/**
 * @description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ChildActivationStart` for use of this experimental API.
 *
 * @experimental
 */
export { ChildActivationEnd };
/**
 * @description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ActivationEnd` for use of this experimental API.
 *
 * @experimental
 */
var /**
 * @description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ActivationEnd` for use of this experimental API.
 *
 * @experimental
 */
ActivationStart = /** @class */ (function () {
    function ActivationStart(/** @docsNotRequired */
    snapshot) {
        this.snapshot = snapshot;
    }
    ActivationStart.prototype.toString = function () {
        var path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return "ActivationStart(path: '" + path + "')";
    };
    return ActivationStart;
}());
/**
 * @description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ActivationEnd` for use of this experimental API.
 *
 * @experimental
 */
export { ActivationStart };
/**
 * @description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ActivationStart` for use of this experimental API.
 *
 * @experimental
 */
var /**
 * @description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ActivationStart` for use of this experimental API.
 *
 * @experimental
 */
ActivationEnd = /** @class */ (function () {
    function ActivationEnd(/** @docsNotRequired */
    snapshot) {
        this.snapshot = snapshot;
    }
    ActivationEnd.prototype.toString = function () {
        var path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return "ActivationEnd(path: '" + path + "')";
    };
    return ActivationEnd;
}());
/**
 * @description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ActivationStart` for use of this experimental API.
 *
 * @experimental
 */
export { ActivationEnd };
/**
 * @description
 *
 * Represents a scrolling event.
 */
var /**
 * @description
 *
 * Represents a scrolling event.
 */
Scroll = /** @class */ (function () {
    function Scroll(/** @docsNotRequired */
    routerEvent, /** @docsNotRequired */
    position, /** @docsNotRequired */
    anchor) {
        this.routerEvent = routerEvent;
        this.position = position;
        this.anchor = anchor;
    }
    Scroll.prototype.toString = function () {
        var pos = this.position ? this.position[0] + ", " + this.position[1] : null;
        return "Scroll(anchor: '" + this.anchor + "', position: '" + pos + "')";
    };
    return Scroll;
}());
/**
 * @description
 *
 * Represents a scrolling event.
 */
export { Scroll };

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9ldmVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTRDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtJQUNFO0lBRVcsRUFBVTtJQUVWLEdBQVc7UUFGWCxPQUFFLEdBQUYsRUFBRSxDQUFRO1FBRVYsUUFBRyxHQUFILEdBQUcsQ0FBUTtLQUFJO3NCQWpENUI7SUFrREMsQ0FBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBTkQsdUJBTUM7Ozs7Ozs7O0FBU0Q7Ozs7Ozs7QUFBQTtJQUFxQywyQ0FBVztJQXdCOUM7SUFFSSxBQURBLHVCQUF1QjtJQUN2QixFQUFVO0lBRVYsQUFEQSx1QkFBdUI7SUFDdkIsR0FBVztJQUVYLEFBREEsdUJBQXVCO0lBQ3ZCLGlCQUFzRTtJQUV0RSxBQURBLHVCQUF1QjtJQUN2QixhQUFpRDtRQUhqRCx1QkFBdUI7UUFDdkIsa0NBQUEsRUFBQSxnQ0FBc0U7UUFDdEUsdUJBQXVCO1FBQ3ZCLDhCQUFBLEVBQUEsb0JBQWlEO1FBUnJELFlBU0Usa0JBQU0sRUFBRSxFQUFFLEdBQUcsQ0FBQyxTQUdmO1FBRkMsS0FBSSxDQUFDLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDO1FBQzNDLEtBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDOztLQUNwQztJQUVELHVCQUF1Qjs7SUFDdkIsa0NBQVE7SUFBUixjQUFxQixNQUFNLENBQUMseUJBQXVCLElBQUksQ0FBQyxFQUFFLGdCQUFXLElBQUksQ0FBQyxHQUFHLE9BQUksQ0FBQyxFQUFFOzBCQWxHdEY7RUEyRHFDLFdBQVcsRUF3Qy9DLENBQUE7Ozs7Ozs7O0FBeENELDJCQXdDQzs7Ozs7Ozs7QUFTRDs7Ozs7OztBQUFBO0lBQW1DLHlDQUFXO0lBQzVDO0lBRUksQUFEQSx1QkFBdUI7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QUFJLElBQUksRUFBRSxDQUFDO1FBQy9FLE1BQU0sQ0FBQywwQkFBd0IsSUFBSSxPQUFJLENBQUM7S0FDekM7d0JBaFpIO0lBaVpDLENBQUE7Ozs7Ozs7OztBQVJELHlCQVFDOzs7Ozs7QUFPRDs7Ozs7QUFBQTtJQUNFO0lBRWEsV0FBMEI7SUFHMUIsUUFBK0I7SUFHL0IsTUFBbUI7UUFObkIsZ0JBQVcsR0FBWCxXQUFXLENBQWU7UUFHMUIsYUFBUSxHQUFSLFFBQVEsQ0FBdUI7UUFHL0IsV0FBTSxHQUFOLE1BQU0sQ0FBYTtLQUFJO0lBRXBDLHlCQUFRLEdBQVI7UUFDRSxJQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxVQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUM5RSxNQUFNLENBQUMscUJBQW1CLElBQUksQ0FBQyxNQUFNLHNCQUFpQixHQUFHLE9BQUksQ0FBQztLQUMvRDtpQkF0YUg7SUF1YUMsQ0FBQTs7Ozs7O0FBZkQsa0JBZUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Um91dGV9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgUm91dGVyU3RhdGVTbmFwc2hvdH0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIElkZW50aWZpZXMgdGhlIHRyaWdnZXIgb2YgdGhlIG5hdmlnYXRpb24uXG4gKlxuICogKiAnaW1wZXJhdGl2ZSctLXRyaWdnZXJlZCBieSBgcm91dGVyLm5hdmlnYXRlQnlVcmxgIG9yIGByb3V0ZXIubmF2aWdhdGVgLlxuICogKiAncG9wc3RhdGUnLS10cmlnZ2VyZWQgYnkgYSBwb3BzdGF0ZSBldmVudFxuICogKiAnaGFzaGNoYW5nZSctLXRyaWdnZXJlZCBieSBhIGhhc2hjaGFuZ2UgZXZlbnRcbiAqXG4gKiBAZXhwZXJpbWVudGFsXG4gKi9cbmV4cG9ydCB0eXBlIE5hdmlnYXRpb25UcmlnZ2VyID0gJ2ltcGVyYXRpdmUnIHwgJ3BvcHN0YXRlJyB8ICdoYXNoY2hhbmdlJztcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBCYXNlIGZvciBldmVudHMgdGhlIFJvdXRlciBnb2VzIHRocm91Z2gsIGFzIG9wcG9zZWQgdG8gZXZlbnRzIHRpZWQgdG8gYSBzcGVjaWZpY1xuICogUm91dGUuIGBSb3V0ZXJFdmVudGBzIHdpbGwgb25seSBiZSBmaXJlZCBvbmUgdGltZSBmb3IgYW55IGdpdmVuIG5hdmlnYXRpb24uXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIGNsYXNzIE15U2VydmljZSB7XG4gKiAgIGNvbnN0cnVjdG9yKHB1YmxpYyByb3V0ZXI6IFJvdXRlciwgbG9nZ2VyOiBMb2dnZXIpIHtcbiAqICAgICByb3V0ZXIuZXZlbnRzLmZpbHRlcihlID0+IGUgaW5zdGFuY2VvZiBSb3V0ZXJFdmVudCkuc3Vic2NyaWJlKGUgPT4ge1xuICogICAgICAgbG9nZ2VyLmxvZyhlLmlkLCBlLnVybCk7XG4gKiAgICAgfSk7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBleHBlcmltZW50YWxcbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlckV2ZW50IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIGlkOiBudW1iZXIsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHVybDogc3RyaW5nKSB7fVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgYW4gZXZlbnQgdHJpZ2dlcmVkIHdoZW4gYSBuYXZpZ2F0aW9uIHN0YXJ0cy5cbiAqXG4gKlxuICovXG5leHBvcnQgY2xhc3MgTmF2aWdhdGlvblN0YXJ0IGV4dGVuZHMgUm91dGVyRXZlbnQge1xuICAvKipcbiAgICogSWRlbnRpZmllcyB0aGUgdHJpZ2dlciBvZiB0aGUgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogKiAnaW1wZXJhdGl2ZSctLXRyaWdnZXJlZCBieSBgcm91dGVyLm5hdmlnYXRlQnlVcmxgIG9yIGByb3V0ZXIubmF2aWdhdGVgLlxuICAgKiAqICdwb3BzdGF0ZSctLXRyaWdnZXJlZCBieSBhIHBvcHN0YXRlIGV2ZW50XG4gICAqICogJ2hhc2hjaGFuZ2UnLS10cmlnZ2VyZWQgYnkgYSBoYXNoY2hhbmdlIGV2ZW50XG4gICAqL1xuICBuYXZpZ2F0aW9uVHJpZ2dlcj86ICdpbXBlcmF0aXZlJ3wncG9wc3RhdGUnfCdoYXNoY2hhbmdlJztcblxuICAvKipcbiAgICogVGhpcyBjb250YWlucyB0aGUgbmF2aWdhdGlvbiBpZCB0aGF0IHB1c2hlZCB0aGUgaGlzdG9yeSByZWNvcmQgdGhhdCB0aGUgcm91dGVyIG5hdmlnYXRlc1xuICAgKiBiYWNrIHRvLiBUaGlzIGlzIG5vdCBudWxsIG9ubHkgd2hlbiB0aGUgbmF2aWdhdGlvbiBpcyB0cmlnZ2VyZWQgYnkgYSBwb3BzdGF0ZSBldmVudC5cbiAgICpcbiAgICogVGhlIHJvdXRlciBhc3NpZ25zIGEgbmF2aWdhdGlvbklkIHRvIGV2ZXJ5IHJvdXRlciB0cmFuc2l0aW9uL25hdmlnYXRpb24uIEV2ZW4gd2hlbiB0aGUgdXNlclxuICAgKiBjbGlja3Mgb24gdGhlIGJhY2sgYnV0dG9uIGluIHRoZSBicm93c2VyLCBhIG5ldyBuYXZpZ2F0aW9uIGlkIHdpbGwgYmUgY3JlYXRlZC4gU28gZnJvbVxuICAgKiB0aGUgcGVyc3BlY3RpdmUgb2YgdGhlIHJvdXRlciwgdGhlIHJvdXRlciBuZXZlciBcImdvZXMgYmFja1wiLiBCeSB1c2luZyB0aGUgYHJlc3RvcmVkU3RhdGVgXG4gICAqIGFuZCBpdHMgbmF2aWdhdGlvbklkLCB5b3UgY2FuIGltcGxlbWVudCBiZWhhdmlvciB0aGF0IGRpZmZlcmVudGlhdGVzIGJldHdlZW4gY3JlYXRpbmcgbmV3XG4gICAqIHN0YXRlc1xuICAgKiBhbmQgcG9wc3RhdGUgZXZlbnRzLiBJbiB0aGUgbGF0dGVyIGNhc2UgeW91IGNhbiByZXN0b3JlIHNvbWUgcmVtZW1iZXJlZCBzdGF0ZSAoZS5nLiwgc2Nyb2xsXG4gICAqIHBvc2l0aW9uKS5cbiAgICovXG4gIHJlc3RvcmVkU3RhdGU/OiB7bmF2aWdhdGlvbklkOiBudW1iZXJ9fG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBuYXZpZ2F0aW9uVHJpZ2dlcjogJ2ltcGVyYXRpdmUnfCdwb3BzdGF0ZSd8J2hhc2hjaGFuZ2UnID0gJ2ltcGVyYXRpdmUnLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHJlc3RvcmVkU3RhdGU6IHtuYXZpZ2F0aW9uSWQ6IG51bWJlcn18bnVsbCA9IG51bGwpIHtcbiAgICBzdXBlcihpZCwgdXJsKTtcbiAgICB0aGlzLm5hdmlnYXRpb25UcmlnZ2VyID0gbmF2aWdhdGlvblRyaWdnZXI7XG4gICAgdGhpcy5yZXN0b3JlZFN0YXRlID0gcmVzdG9yZWRTdGF0ZTtcbiAgfVxuXG4gIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7IHJldHVybiBgTmF2aWdhdGlvblN0YXJ0KGlkOiAke3RoaXMuaWR9LCB1cmw6ICcke3RoaXMudXJsfScpYDsgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgYW4gZXZlbnQgdHJpZ2dlcmVkIHdoZW4gYSBuYXZpZ2F0aW9uIGVuZHMgc3VjY2Vzc2Z1bGx5LlxuICpcbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBOYXZpZ2F0aW9uRW5kIGV4dGVuZHMgUm91dGVyRXZlbnQge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBpZDogbnVtYmVyLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHVybDogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyB1cmxBZnRlclJlZGlyZWN0czogc3RyaW5nKSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgTmF2aWdhdGlvbkVuZChpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nLCB1cmxBZnRlclJlZGlyZWN0czogJyR7dGhpcy51cmxBZnRlclJlZGlyZWN0c30nKWA7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIGFuIGV2ZW50IHRyaWdnZXJlZCB3aGVuIGEgbmF2aWdhdGlvbiBpcyBjYW5jZWxlZC5cbiAqXG4gKlxuICovXG5leHBvcnQgY2xhc3MgTmF2aWdhdGlvbkNhbmNlbCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgcmVhc29uOiBzdHJpbmcpIHtcbiAgICBzdXBlcihpZCwgdXJsKTtcbiAgfVxuXG4gIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7IHJldHVybiBgTmF2aWdhdGlvbkNhbmNlbChpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nKWA7IH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIGFuIGV2ZW50IHRyaWdnZXJlZCB3aGVuIGEgbmF2aWdhdGlvbiBmYWlscyBkdWUgdG8gYW4gdW5leHBlY3RlZCBlcnJvci5cbiAqXG4gKlxuICovXG5leHBvcnQgY2xhc3MgTmF2aWdhdGlvbkVycm9yIGV4dGVuZHMgUm91dGVyRXZlbnQge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBpZDogbnVtYmVyLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHVybDogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBlcnJvcjogYW55KSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgTmF2aWdhdGlvbkVycm9yKGlkOiAke3RoaXMuaWR9LCB1cmw6ICcke3RoaXMudXJsfScsIGVycm9yOiAke3RoaXMuZXJyb3J9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIGFuIGV2ZW50IHRyaWdnZXJlZCB3aGVuIHJvdXRlcyBhcmUgcmVjb2duaXplZC5cbiAqXG4gKlxuICovXG5leHBvcnQgY2xhc3MgUm91dGVzUmVjb2duaXplZCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgdXJsQWZ0ZXJSZWRpcmVjdHM6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgc3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QpIHtcbiAgICBzdXBlcihpZCwgdXJsKTtcbiAgfVxuXG4gIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBSb3V0ZXNSZWNvZ25pemVkKGlkOiAke3RoaXMuaWR9LCB1cmw6ICcke3RoaXMudXJsfScsIHVybEFmdGVyUmVkaXJlY3RzOiAnJHt0aGlzLnVybEFmdGVyUmVkaXJlY3RzfScsIHN0YXRlOiAke3RoaXMuc3RhdGV9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIHRoZSBzdGFydCBvZiB0aGUgR3VhcmQgcGhhc2Ugb2Ygcm91dGluZy5cbiAqXG4gKiBAZXhwZXJpbWVudGFsXG4gKi9cbmV4cG9ydCBjbGFzcyBHdWFyZHNDaGVja1N0YXJ0IGV4dGVuZHMgUm91dGVyRXZlbnQge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBpZDogbnVtYmVyLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHVybDogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyB1cmxBZnRlclJlZGlyZWN0czogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCkge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYEd1YXJkc0NoZWNrU3RhcnQoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke3RoaXMudXJsQWZ0ZXJSZWRpcmVjdHN9Jywgc3RhdGU6ICR7dGhpcy5zdGF0ZX0pYDtcbiAgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIGVuZCBvZiB0aGUgR3VhcmQgcGhhc2Ugb2Ygcm91dGluZy5cbiAqXG4gKiBAZXhwZXJpbWVudGFsXG4gKi9cbmV4cG9ydCBjbGFzcyBHdWFyZHNDaGVja0VuZCBleHRlbmRzIFJvdXRlckV2ZW50IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgaWQ6IG51bWJlcixcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICB1cmw6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgdXJsQWZ0ZXJSZWRpcmVjdHM6IHN0cmluZyxcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgc3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QsXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHNob3VsZEFjdGl2YXRlOiBib29sZWFuKSB7XG4gICAgc3VwZXIoaWQsIHVybCk7XG4gIH1cblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgR3VhcmRzQ2hlY2tFbmQoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke3RoaXMudXJsQWZ0ZXJSZWRpcmVjdHN9Jywgc3RhdGU6ICR7dGhpcy5zdGF0ZX0sIHNob3VsZEFjdGl2YXRlOiAke3RoaXMuc2hvdWxkQWN0aXZhdGV9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIHRoZSBzdGFydCBvZiB0aGUgUmVzb2x2ZSBwaGFzZSBvZiByb3V0aW5nLiBUaGUgdGltaW5nIG9mIHRoaXNcbiAqIGV2ZW50IG1heSBjaGFuZ2UsIHRodXMgaXQncyBleHBlcmltZW50YWwuIEluIHRoZSBjdXJyZW50IGl0ZXJhdGlvbiBpdCB3aWxsIHJ1blxuICogaW4gdGhlIFwicmVzb2x2ZVwiIHBoYXNlIHdoZXRoZXIgdGhlcmUncyB0aGluZ3MgdG8gcmVzb2x2ZSBvciBub3QuIEluIHRoZSBmdXR1cmUgdGhpc1xuICogYmVoYXZpb3IgbWF5IGNoYW5nZSB0byBvbmx5IHJ1biB3aGVuIHRoZXJlIGFyZSB0aGluZ3MgdG8gYmUgcmVzb2x2ZWQuXG4gKlxuICogQGV4cGVyaW1lbnRhbFxuICovXG5leHBvcnQgY2xhc3MgUmVzb2x2ZVN0YXJ0IGV4dGVuZHMgUm91dGVyRXZlbnQge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBpZDogbnVtYmVyLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHVybDogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyB1cmxBZnRlclJlZGlyZWN0czogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCkge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFJlc29sdmVTdGFydChpZDogJHt0aGlzLmlkfSwgdXJsOiAnJHt0aGlzLnVybH0nLCB1cmxBZnRlclJlZGlyZWN0czogJyR7dGhpcy51cmxBZnRlclJlZGlyZWN0c30nLCBzdGF0ZTogJHt0aGlzLnN0YXRlfSlgO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgZW5kIG9mIHRoZSBSZXNvbHZlIHBoYXNlIG9mIHJvdXRpbmcuIFNlZSBub3RlIG9uXG4gKiBgUmVzb2x2ZVN0YXJ0YCBmb3IgdXNlIG9mIHRoaXMgZXhwZXJpbWVudGFsIEFQSS5cbiAqXG4gKiBAZXhwZXJpbWVudGFsXG4gKi9cbmV4cG9ydCBjbGFzcyBSZXNvbHZlRW5kIGV4dGVuZHMgUm91dGVyRXZlbnQge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBpZDogbnVtYmVyLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHVybDogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyB1cmxBZnRlclJlZGlyZWN0czogc3RyaW5nLFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCkge1xuICAgIHN1cGVyKGlkLCB1cmwpO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFJlc29sdmVFbmQoaWQ6ICR7dGhpcy5pZH0sIHVybDogJyR7dGhpcy51cmx9JywgdXJsQWZ0ZXJSZWRpcmVjdHM6ICcke3RoaXMudXJsQWZ0ZXJSZWRpcmVjdHN9Jywgc3RhdGU6ICR7dGhpcy5zdGF0ZX0pYDtcbiAgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgYW4gZXZlbnQgdHJpZ2dlcmVkIGJlZm9yZSBsYXp5IGxvYWRpbmcgYSByb3V0ZSBjb25maWcuXG4gKlxuICogQGV4cGVyaW1lbnRhbFxuICovXG5leHBvcnQgY2xhc3MgUm91dGVDb25maWdMb2FkU3RhcnQge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgcm91dGU6IFJvdXRlKSB7fVxuICB0b1N0cmluZygpOiBzdHJpbmcgeyByZXR1cm4gYFJvdXRlQ29uZmlnTG9hZFN0YXJ0KHBhdGg6ICR7dGhpcy5yb3V0ZS5wYXRofSlgOyB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyBhbiBldmVudCB0cmlnZ2VyZWQgd2hlbiBhIHJvdXRlIGhhcyBiZWVuIGxhenkgbG9hZGVkLlxuICpcbiAqIEBleHBlcmltZW50YWxcbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlQ29uZmlnTG9hZEVuZCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyByb3V0ZTogUm91dGUpIHt9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7IHJldHVybiBgUm91dGVDb25maWdMb2FkRW5kKHBhdGg6ICR7dGhpcy5yb3V0ZS5wYXRofSlgOyB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgc3RhcnQgb2YgZW5kIG9mIHRoZSBSZXNvbHZlIHBoYXNlIG9mIHJvdXRpbmcuIFNlZSBub3RlIG9uXG4gKiBgQ2hpbGRBY3RpdmF0aW9uRW5kYCBmb3IgdXNlIG9mIHRoaXMgZXhwZXJpbWVudGFsIEFQSS5cbiAqXG4gKiBAZXhwZXJpbWVudGFsXG4gKi9cbmV4cG9ydCBjbGFzcyBDaGlsZEFjdGl2YXRpb25TdGFydCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCkge31cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy5zbmFwc2hvdC5yb3V0ZUNvbmZpZyAmJiB0aGlzLnNuYXBzaG90LnJvdXRlQ29uZmlnLnBhdGggfHwgJyc7XG4gICAgcmV0dXJuIGBDaGlsZEFjdGl2YXRpb25TdGFydChwYXRoOiAnJHtwYXRofScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIHN0YXJ0IG9mIGVuZCBvZiB0aGUgUmVzb2x2ZSBwaGFzZSBvZiByb3V0aW5nLiBTZWUgbm90ZSBvblxuICogYENoaWxkQWN0aXZhdGlvblN0YXJ0YCBmb3IgdXNlIG9mIHRoaXMgZXhwZXJpbWVudGFsIEFQSS5cbiAqXG4gKiBAZXhwZXJpbWVudGFsXG4gKi9cbmV4cG9ydCBjbGFzcyBDaGlsZEFjdGl2YXRpb25FbmQge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gICAgICBwdWJsaWMgc25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpIHt9XG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgY29uc3QgcGF0aCA9IHRoaXMuc25hcHNob3Qucm91dGVDb25maWcgJiYgdGhpcy5zbmFwc2hvdC5yb3V0ZUNvbmZpZy5wYXRoIHx8ICcnO1xuICAgIHJldHVybiBgQ2hpbGRBY3RpdmF0aW9uRW5kKHBhdGg6ICcke3BhdGh9JylgO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgc3RhcnQgb2YgZW5kIG9mIHRoZSBSZXNvbHZlIHBoYXNlIG9mIHJvdXRpbmcuIFNlZSBub3RlIG9uXG4gKiBgQWN0aXZhdGlvbkVuZGAgZm9yIHVzZSBvZiB0aGlzIGV4cGVyaW1lbnRhbCBBUEkuXG4gKlxuICogQGV4cGVyaW1lbnRhbFxuICovXG5leHBvcnQgY2xhc3MgQWN0aXZhdGlvblN0YXJ0IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcHVibGljIHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSB7fVxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBhdGggPSB0aGlzLnNuYXBzaG90LnJvdXRlQ29uZmlnICYmIHRoaXMuc25hcHNob3Qucm91dGVDb25maWcucGF0aCB8fCAnJztcbiAgICByZXR1cm4gYEFjdGl2YXRpb25TdGFydChwYXRoOiAnJHtwYXRofScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIHN0YXJ0IG9mIGVuZCBvZiB0aGUgUmVzb2x2ZSBwaGFzZSBvZiByb3V0aW5nLiBTZWUgbm90ZSBvblxuICogYEFjdGl2YXRpb25TdGFydGAgZm9yIHVzZSBvZiB0aGlzIGV4cGVyaW1lbnRhbCBBUEkuXG4gKlxuICogQGV4cGVyaW1lbnRhbFxuICovXG5leHBvcnQgY2xhc3MgQWN0aXZhdGlvbkVuZCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHB1YmxpYyBzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCkge31cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy5zbmFwc2hvdC5yb3V0ZUNvbmZpZyAmJiB0aGlzLnNuYXBzaG90LnJvdXRlQ29uZmlnLnBhdGggfHwgJyc7XG4gICAgcmV0dXJuIGBBY3RpdmF0aW9uRW5kKHBhdGg6ICcke3BhdGh9JylgO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyBhIHNjcm9sbGluZyBldmVudC5cbiAqL1xuZXhwb3J0IGNsYXNzIFNjcm9sbCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHJlYWRvbmx5IHJvdXRlckV2ZW50OiBOYXZpZ2F0aW9uRW5kLFxuXG4gICAgICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICAgICAgcmVhZG9ubHkgcG9zaXRpb246IFtudW1iZXIsIG51bWJlcl18bnVsbCxcblxuICAgICAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgICAgIHJlYWRvbmx5IGFuY2hvcjogc3RyaW5nfG51bGwpIHt9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCBwb3MgPSB0aGlzLnBvc2l0aW9uID8gYCR7dGhpcy5wb3NpdGlvblswXX0sICR7dGhpcy5wb3NpdGlvblsxXX1gIDogbnVsbDtcbiAgICByZXR1cm4gYFNjcm9sbChhbmNob3I6ICcke3RoaXMuYW5jaG9yfScsIHBvc2l0aW9uOiAnJHtwb3N9JylgO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyBhIHJvdXRlciBldmVudCwgYWxsb3dpbmcgeW91IHRvIHRyYWNrIHRoZSBsaWZlY3ljbGUgb2YgdGhlIHJvdXRlci5cbiAqXG4gKiBUaGUgc2VxdWVuY2Ugb2Ygcm91dGVyIGV2ZW50cyBpczpcbiAqXG4gKiAtIGBOYXZpZ2F0aW9uU3RhcnRgLFxuICogLSBgUm91dGVDb25maWdMb2FkU3RhcnRgLFxuICogLSBgUm91dGVDb25maWdMb2FkRW5kYCxcbiAqIC0gYFJvdXRlc1JlY29nbml6ZWRgLFxuICogLSBgR3VhcmRzQ2hlY2tTdGFydGAsXG4gKiAtIGBDaGlsZEFjdGl2YXRpb25TdGFydGAsXG4gKiAtIGBBY3RpdmF0aW9uU3RhcnRgLFxuICogLSBgR3VhcmRzQ2hlY2tFbmRgLFxuICogLSBgUmVzb2x2ZVN0YXJ0YCxcbiAqIC0gYFJlc29sdmVFbmRgLFxuICogLSBgQWN0aXZhdGlvbkVuZGBcbiAqIC0gYENoaWxkQWN0aXZhdGlvbkVuZGBcbiAqIC0gYE5hdmlnYXRpb25FbmRgLFxuICogLSBgTmF2aWdhdGlvbkNhbmNlbGAsXG4gKiAtIGBOYXZpZ2F0aW9uRXJyb3JgXG4gKiAtIGBTY3JvbGxgXG4gKlxuICpcbiAqL1xuZXhwb3J0IHR5cGUgRXZlbnQgPSBSb3V0ZXJFdmVudCB8IFJvdXRlQ29uZmlnTG9hZFN0YXJ0IHwgUm91dGVDb25maWdMb2FkRW5kIHwgQ2hpbGRBY3RpdmF0aW9uU3RhcnQgfFxuICAgIENoaWxkQWN0aXZhdGlvbkVuZCB8IEFjdGl2YXRpb25TdGFydCB8IEFjdGl2YXRpb25FbmQgfCBTY3JvbGw7XG4iXX0=