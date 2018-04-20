/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
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
var /**
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
RouterEvent = /** @class */ (function () {
    function RouterEvent(id, url) {
        this.id = id;
        this.url = url;
    }
    return RouterEvent;
}());
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
export { RouterEvent };
function RouterEvent_tsickle_Closure_declarations() {
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
var /**
 * \@description
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
    /**
     * \@docsNotRequired
     * @return {?}
     */
    NavigationStart.prototype.toString = /**
     * \@docsNotRequired
     * @return {?}
     */
    function () { return "NavigationStart(id: " + this.id + ", url: '" + this.url + "')"; };
    return NavigationStart;
}(RouterEvent));
/**
 * \@description
 *
 * Represents an event triggered when a navigation starts.
 *
 *
 */
export { NavigationStart };
function NavigationStart_tsickle_Closure_declarations() {
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
var /**
 * \@description
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
    url, urlAfterRedirects) {
        var _this = _super.call(this, id, url) || this;
        _this.urlAfterRedirects = urlAfterRedirects;
        return _this;
    }
    /** @docsNotRequired */
    /**
     * \@docsNotRequired
     * @return {?}
     */
    NavigationEnd.prototype.toString = /**
     * \@docsNotRequired
     * @return {?}
     */
    function () {
        return "NavigationEnd(id: " + this.id + ", url: '" + this.url + "', urlAfterRedirects: '" + this.urlAfterRedirects + "')";
    };
    return NavigationEnd;
}(RouterEvent));
/**
 * \@description
 *
 * Represents an event triggered when a navigation ends successfully.
 *
 *
 */
export { NavigationEnd };
function NavigationEnd_tsickle_Closure_declarations() {
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
var /**
 * \@description
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
    url, reason) {
        var _this = _super.call(this, id, url) || this;
        _this.reason = reason;
        return _this;
    }
    /** @docsNotRequired */
    /**
     * \@docsNotRequired
     * @return {?}
     */
    NavigationCancel.prototype.toString = /**
     * \@docsNotRequired
     * @return {?}
     */
    function () { return "NavigationCancel(id: " + this.id + ", url: '" + this.url + "')"; };
    return NavigationCancel;
}(RouterEvent));
/**
 * \@description
 *
 * Represents an event triggered when a navigation is canceled.
 *
 *
 */
export { NavigationCancel };
function NavigationCancel_tsickle_Closure_declarations() {
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
var /**
 * \@description
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
    url, error) {
        var _this = _super.call(this, id, url) || this;
        _this.error = error;
        return _this;
    }
    /** @docsNotRequired */
    /**
     * \@docsNotRequired
     * @return {?}
     */
    NavigationError.prototype.toString = /**
     * \@docsNotRequired
     * @return {?}
     */
    function () {
        return "NavigationError(id: " + this.id + ", url: '" + this.url + "', error: " + this.error + ")";
    };
    return NavigationError;
}(RouterEvent));
/**
 * \@description
 *
 * Represents an event triggered when a navigation fails due to an unexpected error.
 *
 *
 */
export { NavigationError };
function NavigationError_tsickle_Closure_declarations() {
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
var /**
 * \@description
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
    url, urlAfterRedirects, state) {
        var _this = _super.call(this, id, url) || this;
        _this.urlAfterRedirects = urlAfterRedirects;
        _this.state = state;
        return _this;
    }
    /** @docsNotRequired */
    /**
     * \@docsNotRequired
     * @return {?}
     */
    RoutesRecognized.prototype.toString = /**
     * \@docsNotRequired
     * @return {?}
     */
    function () {
        return "RoutesRecognized(id: " + this.id + ", url: '" + this.url + "', urlAfterRedirects: '" + this.urlAfterRedirects + "', state: " + this.state + ")";
    };
    return RoutesRecognized;
}(RouterEvent));
/**
 * \@description
 *
 * Represents an event triggered when routes are recognized.
 *
 *
 */
export { RoutesRecognized };
function RoutesRecognized_tsickle_Closure_declarations() {
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
var /**
 * \@description
 *
 * Represents the start of the Guard phase of routing.
 *
 * \@experimental
 */
GuardsCheckStart = /** @class */ (function (_super) {
    tslib_1.__extends(GuardsCheckStart, _super);
    function GuardsCheckStart(/** @docsNotRequired */
    /** @docsNotRequired */
    id, /** @docsNotRequired */
    /** @docsNotRequired */
    url, urlAfterRedirects, state) {
        var _this = _super.call(this, id, url) || this;
        _this.urlAfterRedirects = urlAfterRedirects;
        _this.state = state;
        return _this;
    }
    /**
     * @return {?}
     */
    GuardsCheckStart.prototype.toString = /**
     * @return {?}
     */
    function () {
        return "GuardsCheckStart(id: " + this.id + ", url: '" + this.url + "', urlAfterRedirects: '" + this.urlAfterRedirects + "', state: " + this.state + ")";
    };
    return GuardsCheckStart;
}(RouterEvent));
/**
 * \@description
 *
 * Represents the start of the Guard phase of routing.
 *
 * \@experimental
 */
export { GuardsCheckStart };
function GuardsCheckStart_tsickle_Closure_declarations() {
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
var /**
 * \@description
 *
 * Represents the end of the Guard phase of routing.
 *
 * \@experimental
 */
GuardsCheckEnd = /** @class */ (function (_super) {
    tslib_1.__extends(GuardsCheckEnd, _super);
    function GuardsCheckEnd(/** @docsNotRequired */
    /** @docsNotRequired */
    id, /** @docsNotRequired */
    /** @docsNotRequired */
    url, urlAfterRedirects, state, shouldActivate) {
        var _this = _super.call(this, id, url) || this;
        _this.urlAfterRedirects = urlAfterRedirects;
        _this.state = state;
        _this.shouldActivate = shouldActivate;
        return _this;
    }
    /**
     * @return {?}
     */
    GuardsCheckEnd.prototype.toString = /**
     * @return {?}
     */
    function () {
        return "GuardsCheckEnd(id: " + this.id + ", url: '" + this.url + "', urlAfterRedirects: '" + this.urlAfterRedirects + "', state: " + this.state + ", shouldActivate: " + this.shouldActivate + ")";
    };
    return GuardsCheckEnd;
}(RouterEvent));
/**
 * \@description
 *
 * Represents the end of the Guard phase of routing.
 *
 * \@experimental
 */
export { GuardsCheckEnd };
function GuardsCheckEnd_tsickle_Closure_declarations() {
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
var /**
 * \@description
 *
 * Represents the start of the Resolve phase of routing. The timing of this
 * event may change, thus it's experimental. In the current iteration it will run
 * in the "resolve" phase whether there's things to resolve or not. In the future this
 * behavior may change to only run when there are things to be resolved.
 *
 * \@experimental
 */
ResolveStart = /** @class */ (function (_super) {
    tslib_1.__extends(ResolveStart, _super);
    function ResolveStart(/** @docsNotRequired */
    /** @docsNotRequired */
    id, /** @docsNotRequired */
    /** @docsNotRequired */
    url, urlAfterRedirects, state) {
        var _this = _super.call(this, id, url) || this;
        _this.urlAfterRedirects = urlAfterRedirects;
        _this.state = state;
        return _this;
    }
    /**
     * @return {?}
     */
    ResolveStart.prototype.toString = /**
     * @return {?}
     */
    function () {
        return "ResolveStart(id: " + this.id + ", url: '" + this.url + "', urlAfterRedirects: '" + this.urlAfterRedirects + "', state: " + this.state + ")";
    };
    return ResolveStart;
}(RouterEvent));
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
export { ResolveStart };
function ResolveStart_tsickle_Closure_declarations() {
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
var /**
 * \@description
 *
 * Represents the end of the Resolve phase of routing. See note on
 * `ResolveStart` for use of this experimental API.
 *
 * \@experimental
 */
ResolveEnd = /** @class */ (function (_super) {
    tslib_1.__extends(ResolveEnd, _super);
    function ResolveEnd(/** @docsNotRequired */
    /** @docsNotRequired */
    id, /** @docsNotRequired */
    /** @docsNotRequired */
    url, urlAfterRedirects, state) {
        var _this = _super.call(this, id, url) || this;
        _this.urlAfterRedirects = urlAfterRedirects;
        _this.state = state;
        return _this;
    }
    /**
     * @return {?}
     */
    ResolveEnd.prototype.toString = /**
     * @return {?}
     */
    function () {
        return "ResolveEnd(id: " + this.id + ", url: '" + this.url + "', urlAfterRedirects: '" + this.urlAfterRedirects + "', state: " + this.state + ")";
    };
    return ResolveEnd;
}(RouterEvent));
/**
 * \@description
 *
 * Represents the end of the Resolve phase of routing. See note on
 * `ResolveStart` for use of this experimental API.
 *
 * \@experimental
 */
export { ResolveEnd };
function ResolveEnd_tsickle_Closure_declarations() {
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
var /**
 * \@description
 *
 * Represents an event triggered before lazy loading a route config.
 *
 * \@experimental
 */
RouteConfigLoadStart = /** @class */ (function () {
    function RouteConfigLoadStart(route) {
        this.route = route;
    }
    /**
     * @return {?}
     */
    RouteConfigLoadStart.prototype.toString = /**
     * @return {?}
     */
    function () { return "RouteConfigLoadStart(path: " + this.route.path + ")"; };
    return RouteConfigLoadStart;
}());
/**
 * \@description
 *
 * Represents an event triggered before lazy loading a route config.
 *
 * \@experimental
 */
export { RouteConfigLoadStart };
function RouteConfigLoadStart_tsickle_Closure_declarations() {
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
var /**
 * \@description
 *
 * Represents an event triggered when a route has been lazy loaded.
 *
 * \@experimental
 */
RouteConfigLoadEnd = /** @class */ (function () {
    function RouteConfigLoadEnd(route) {
        this.route = route;
    }
    /**
     * @return {?}
     */
    RouteConfigLoadEnd.prototype.toString = /**
     * @return {?}
     */
    function () { return "RouteConfigLoadEnd(path: " + this.route.path + ")"; };
    return RouteConfigLoadEnd;
}());
/**
 * \@description
 *
 * Represents an event triggered when a route has been lazy loaded.
 *
 * \@experimental
 */
export { RouteConfigLoadEnd };
function RouteConfigLoadEnd_tsickle_Closure_declarations() {
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
var /**
 * \@description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ChildActivationEnd` for use of this experimental API.
 *
 * \@experimental
 */
ChildActivationStart = /** @class */ (function () {
    function ChildActivationStart(snapshot) {
        this.snapshot = snapshot;
    }
    /**
     * @return {?}
     */
    ChildActivationStart.prototype.toString = /**
     * @return {?}
     */
    function () {
        var /** @type {?} */ path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return "ChildActivationStart(path: '" + path + "')";
    };
    return ChildActivationStart;
}());
/**
 * \@description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ChildActivationEnd` for use of this experimental API.
 *
 * \@experimental
 */
export { ChildActivationStart };
function ChildActivationStart_tsickle_Closure_declarations() {
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
var /**
 * \@description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ChildActivationStart` for use of this experimental API.
 *
 * \@experimental
 */
ChildActivationEnd = /** @class */ (function () {
    function ChildActivationEnd(snapshot) {
        this.snapshot = snapshot;
    }
    /**
     * @return {?}
     */
    ChildActivationEnd.prototype.toString = /**
     * @return {?}
     */
    function () {
        var /** @type {?} */ path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return "ChildActivationEnd(path: '" + path + "')";
    };
    return ChildActivationEnd;
}());
/**
 * \@description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ChildActivationStart` for use of this experimental API.
 *
 * \@experimental
 */
export { ChildActivationEnd };
function ChildActivationEnd_tsickle_Closure_declarations() {
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
var /**
 * \@description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ActivationEnd` for use of this experimental API.
 *
 * \@experimental
 */
ActivationStart = /** @class */ (function () {
    function ActivationStart(snapshot) {
        this.snapshot = snapshot;
    }
    /**
     * @return {?}
     */
    ActivationStart.prototype.toString = /**
     * @return {?}
     */
    function () {
        var /** @type {?} */ path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return "ActivationStart(path: '" + path + "')";
    };
    return ActivationStart;
}());
/**
 * \@description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ActivationEnd` for use of this experimental API.
 *
 * \@experimental
 */
export { ActivationStart };
function ActivationStart_tsickle_Closure_declarations() {
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
var /**
 * \@description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ActivationStart` for use of this experimental API.
 *
 * \@experimental
 */
ActivationEnd = /** @class */ (function () {
    function ActivationEnd(snapshot) {
        this.snapshot = snapshot;
    }
    /**
     * @return {?}
     */
    ActivationEnd.prototype.toString = /**
     * @return {?}
     */
    function () {
        var /** @type {?} */ path = this.snapshot.routeConfig && this.snapshot.routeConfig.path || '';
        return "ActivationEnd(path: '" + path + "')";
    };
    return ActivationEnd;
}());
/**
 * \@description
 *
 * Represents the start of end of the Resolve phase of routing. See note on
 * `ActivationStart` for use of this experimental API.
 *
 * \@experimental
 */
export { ActivationEnd };
function ActivationEnd_tsickle_Closure_declarations() {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    ActivationEnd.prototype.snapshot;
}
//# sourceMappingURL=events.js.map