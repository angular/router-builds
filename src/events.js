/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * \@whatItDoes Represents an event triggered when a navigation starts.
 *
 * \@stable
 */
var NavigationStart = (function () {
    /**
     * @param {?} id
     * @param {?} url
     */
    function NavigationStart(id, url) {
        this.id = id;
        this.url = url;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    NavigationStart.prototype.toString = function () { return "NavigationStart(id: " + this.id + ", url: '" + this.url + "')"; };
    return NavigationStart;
}());
export { NavigationStart };
function NavigationStart_tsickle_Closure_declarations() {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationStart.prototype.id;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationStart.prototype.url;
}
/**
 * \@whatItDoes Represents an event triggered when a navigation ends successfully.
 *
 * \@stable
 */
var NavigationEnd = (function () {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     */
    function NavigationEnd(id, url, urlAfterRedirects) {
        this.id = id;
        this.url = url;
        this.urlAfterRedirects = urlAfterRedirects;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    NavigationEnd.prototype.toString = function () {
        return "NavigationEnd(id: " + this.id + ", url: '" + this.url + "', urlAfterRedirects: '" + this.urlAfterRedirects + "')";
    };
    return NavigationEnd;
}());
export { NavigationEnd };
function NavigationEnd_tsickle_Closure_declarations() {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationEnd.prototype.id;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationEnd.prototype.url;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationEnd.prototype.urlAfterRedirects;
}
/**
 * \@whatItDoes Represents an event triggered when a navigation is canceled.
 *
 * \@stable
 */
var NavigationCancel = (function () {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} reason
     */
    function NavigationCancel(id, url, reason) {
        this.id = id;
        this.url = url;
        this.reason = reason;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    NavigationCancel.prototype.toString = function () { return "NavigationCancel(id: " + this.id + ", url: '" + this.url + "')"; };
    return NavigationCancel;
}());
export { NavigationCancel };
function NavigationCancel_tsickle_Closure_declarations() {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationCancel.prototype.id;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationCancel.prototype.url;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationCancel.prototype.reason;
}
/**
 * \@whatItDoes Represents an event triggered when a navigation fails due to an unexpected error.
 *
 * \@stable
 */
var NavigationError = (function () {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} error
     */
    function NavigationError(id, url, error) {
        this.id = id;
        this.url = url;
        this.error = error;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    NavigationError.prototype.toString = function () {
        return "NavigationError(id: " + this.id + ", url: '" + this.url + "', error: " + this.error + ")";
    };
    return NavigationError;
}());
export { NavigationError };
function NavigationError_tsickle_Closure_declarations() {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationError.prototype.id;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationError.prototype.url;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    NavigationError.prototype.error;
}
/**
 * \@whatItDoes Represents an event triggered when routes are recognized.
 *
 * \@stable
 */
var RoutesRecognized = (function () {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     * @param {?} state
     */
    function RoutesRecognized(id, url, urlAfterRedirects, state) {
        this.id = id;
        this.url = url;
        this.urlAfterRedirects = urlAfterRedirects;
        this.state = state;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    RoutesRecognized.prototype.toString = function () {
        return "RoutesRecognized(id: " + this.id + ", url: '" + this.url + "', urlAfterRedirects: '" + this.urlAfterRedirects + "', state: " + this.state + ")";
    };
    return RoutesRecognized;
}());
export { RoutesRecognized };
function RoutesRecognized_tsickle_Closure_declarations() {
    /**
     * \@docsNotRequired
     * @type {?}
     */
    RoutesRecognized.prototype.id;
    /**
     * \@docsNotRequired
     * @type {?}
     */
    RoutesRecognized.prototype.url;
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
 * \@whatItDoes Represents an event triggered before lazy loading a route config.
 *
 * \@experimental
 */
var RouteConfigLoadStart = (function () {
    /**
     * @param {?} route
     */
    function RouteConfigLoadStart(route) {
        this.route = route;
    }
    /**
     * @return {?}
     */
    RouteConfigLoadStart.prototype.toString = function () { return "RouteConfigLoadStart(path: " + this.route.path + ")"; };
    return RouteConfigLoadStart;
}());
export { RouteConfigLoadStart };
function RouteConfigLoadStart_tsickle_Closure_declarations() {
    /** @type {?} */
    RouteConfigLoadStart.prototype.route;
}
/**
 * \@whatItDoes Represents an event triggered when a route has been lazy loaded.
 *
 * \@experimental
 */
var RouteConfigLoadEnd = (function () {
    /**
     * @param {?} route
     */
    function RouteConfigLoadEnd(route) {
        this.route = route;
    }
    /**
     * @return {?}
     */
    RouteConfigLoadEnd.prototype.toString = function () { return "RouteConfigLoadEnd(path: " + this.route.path + ")"; };
    return RouteConfigLoadEnd;
}());
export { RouteConfigLoadEnd };
function RouteConfigLoadEnd_tsickle_Closure_declarations() {
    /** @type {?} */
    RouteConfigLoadEnd.prototype.route;
}
//# sourceMappingURL=events.js.map