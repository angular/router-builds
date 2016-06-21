"use strict";
var common_1 = require('@angular/common');
var platform_browser_1 = require('@angular/platform-browser');
var common = require('./common_router_providers');
/**
 * A list of {@link Provider}s. To use the router, you must add this to your application.
 *
 * ### Example
 *
 * ```
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * class AppCmp {
 *   // ...
 * }
 *
 * const router = [
 *   {path: '/home', component: Home}
 * ];
 *
 * bootstrap(AppCmp, [provideRouter(router)]);
 * ```
 */
function provideRouter(config, opts) {
    if (opts === void 0) { opts = {}; }
    return [
        { provide: common_1.PlatformLocation, useClass: platform_browser_1.BrowserPlatformLocation }
    ].concat(common.provideRouter(config, opts));
}
exports.provideRouter = provideRouter;
//# sourceMappingURL=router_providers.js.map