"use strict";
const common_1 = require('@angular/common');
const platform_browser_1 = require('@angular/platform-browser');
const common = require('./common_router_providers');
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
function provideRouter(config, opts = {}) {
    return [
        { provide: common_1.PlatformLocation, useClass: platform_browser_1.BrowserPlatformLocation },
        ...common.provideRouter(config, opts)
    ];
}
exports.provideRouter = provideRouter;
//# sourceMappingURL=router_providers.js.map