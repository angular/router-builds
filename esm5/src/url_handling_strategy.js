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
/**
 * \@description
 *
 * Provides a way to migrate AngularJS applications to Angular.
 *
 * \@experimental
 * @abstract
 */
var /**
 * \@description
 *
 * Provides a way to migrate AngularJS applications to Angular.
 *
 * \@experimental
 * @abstract
 */
UrlHandlingStrategy = /** @class */ (function () {
    function UrlHandlingStrategy() {
    }
    return UrlHandlingStrategy;
}());
/**
 * \@description
 *
 * Provides a way to migrate AngularJS applications to Angular.
 *
 * \@experimental
 * @abstract
 */
export { UrlHandlingStrategy };
function UrlHandlingStrategy_tsickle_Closure_declarations() {
    /**
     * Tells the router if this URL should be processed.
     *
     * When it returns true, the router will execute the regular navigation.
     * When it returns false, the router will set the router state to an empty state.
     * As a result, all the active components will be destroyed.
     *
     * @abstract
     * @param {?} url
     * @return {?}
     */
    UrlHandlingStrategy.prototype.shouldProcessUrl = function (url) { };
    /**
     * Extracts the part of the URL that should be handled by the router.
     * The rest of the URL will remain untouched.
     * @abstract
     * @param {?} url
     * @return {?}
     */
    UrlHandlingStrategy.prototype.extract = function (url) { };
    /**
     * Merges the URL fragment with the rest of the URL.
     * @abstract
     * @param {?} newUrlPart
     * @param {?} rawUrl
     * @return {?}
     */
    UrlHandlingStrategy.prototype.merge = function (newUrlPart, rawUrl) { };
}
/**
 * \@experimental
 */
var /**
 * \@experimental
 */
DefaultUrlHandlingStrategy = /** @class */ (function () {
    function DefaultUrlHandlingStrategy() {
    }
    /**
     * @param {?} url
     * @return {?}
     */
    DefaultUrlHandlingStrategy.prototype.shouldProcessUrl = /**
     * @param {?} url
     * @return {?}
     */
    function (url) { return true; };
    /**
     * @param {?} url
     * @return {?}
     */
    DefaultUrlHandlingStrategy.prototype.extract = /**
     * @param {?} url
     * @return {?}
     */
    function (url) { return url; };
    /**
     * @param {?} newUrlPart
     * @param {?} wholeUrl
     * @return {?}
     */
    DefaultUrlHandlingStrategy.prototype.merge = /**
     * @param {?} newUrlPart
     * @param {?} wholeUrl
     * @return {?}
     */
    function (newUrlPart, wholeUrl) { return newUrlPart; };
    return DefaultUrlHandlingStrategy;
}());
/**
 * \@experimental
 */
export { DefaultUrlHandlingStrategy };
//# sourceMappingURL=url_handling_strategy.js.map