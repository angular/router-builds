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
export class NavigationStart {
    /**
     * @param {?} id
     * @param {?} url
     */
    constructor(id, url) {
        this.id = id;
        this.url = url;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    toString() { return `NavigationStart(id: ${this.id}, url: '${this.url}')`; }
}
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
export class NavigationEnd {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     */
    constructor(id, url, urlAfterRedirects) {
        this.id = id;
        this.url = url;
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
export class NavigationCancel {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} reason
     */
    constructor(id, url, reason) {
        this.id = id;
        this.url = url;
        this.reason = reason;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    toString() { return `NavigationCancel(id: ${this.id}, url: '${this.url}')`; }
}
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
export class NavigationError {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} error
     */
    constructor(id, url, error) {
        this.id = id;
        this.url = url;
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
export class RoutesRecognized {
    /**
     * @param {?} id
     * @param {?} url
     * @param {?} urlAfterRedirects
     * @param {?} state
     */
    constructor(id, url, urlAfterRedirects, state) {
        this.id = id;
        this.url = url;
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
function RouteConfigLoadStart_tsickle_Closure_declarations() {
    /** @type {?} */
    RouteConfigLoadStart.prototype.route;
}
/**
 * \@whatItDoes Represents an event triggered when a route has been lazy loaded.
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
function RouteConfigLoadEnd_tsickle_Closure_declarations() {
    /** @type {?} */
    RouteConfigLoadEnd.prototype.route;
}
//# sourceMappingURL=events.js.map