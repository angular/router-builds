/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location, LocationStrategy } from '@angular/common';
import { MockLocationStrategy, SpyLocation } from '@angular/common/testing';
import { provideRouter } from '@angular/router';
/**
 * Sets up providers necessary to enable `Router` functionality for tests.
 *
 * Allows to configure a set of routes as well as extra features that should be enabled.
 * Provides spy implementations of `Location` and `LocationStrategy` interfaces.
 *
 * @usageNotes
 * ### Example
 *
 * ```
 * const testRoutes: Routes = [
 *   {path: '', component: BlankCmp},
 *   {path: 'simple', component: SimpleCmp}
 * ];
 *
 * beforeEach(() => {
 *   TestBed.configureTestingModule({
 *     providers: [
 *       provideRouterForTesting(testRoutes,
 *         withDebugTracing(),
 *         withRouterConfig({paramsInheritanceStrategy: 'always'}),
 *       )
 *     ]
 *   });
 * });
 * ```
 *
 * @see `provideRouter`
 *
 * @param routes A set of `Route`s to use during the test.
 * @param features Optional features to configure additional router behaviors.
 * @returns A set of providers to setup Router for testing.
 */
export function provideRouterForTesting(routes = [], ...features) {
    return [
        ...provideRouter(routes, ...features),
        { provide: Location, useClass: SpyLocation },
        { provide: LocationStrategy, useClass: MockLocationStrategy },
    ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZV9yb3V0ZXJfZm9yX3Rlc3RpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvdGVzdGluZy9zcmMvcHJvdmlkZV9yb3V0ZXJfZm9yX3Rlc3RpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzNELE9BQU8sRUFBQyxvQkFBb0IsRUFBRSxXQUFXLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUUxRSxPQUFPLEVBQUMsYUFBYSxFQUF5QixNQUFNLGlCQUFpQixDQUFDO0FBR3RFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWdDRztBQUNILE1BQU0sVUFBVSx1QkFBdUIsQ0FDbkMsU0FBaUIsRUFBRSxFQUFFLEdBQUcsUUFBMEI7SUFDcEQsT0FBTztRQUNMLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQztRQUNyQyxFQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBQztRQUMxQyxFQUFDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsb0JBQW9CLEVBQUM7S0FDNUQsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvbiwgTG9jYXRpb25TdHJhdGVneX0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7TW9ja0xvY2F0aW9uU3RyYXRlZ3ksIFNweUxvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24vdGVzdGluZyc7XG5pbXBvcnQge1Byb3ZpZGVyfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7cHJvdmlkZVJvdXRlciwgUm91dGVyRmVhdHVyZXMsIFJvdXRlc30gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcblxuXG4vKipcbiAqIFNldHMgdXAgcHJvdmlkZXJzIG5lY2Vzc2FyeSB0byBlbmFibGUgYFJvdXRlcmAgZnVuY3Rpb25hbGl0eSBmb3IgdGVzdHMuXG4gKlxuICogQWxsb3dzIHRvIGNvbmZpZ3VyZSBhIHNldCBvZiByb3V0ZXMgYXMgd2VsbCBhcyBleHRyYSBmZWF0dXJlcyB0aGF0IHNob3VsZCBiZSBlbmFibGVkLlxuICogUHJvdmlkZXMgc3B5IGltcGxlbWVudGF0aW9ucyBvZiBgTG9jYXRpb25gIGFuZCBgTG9jYXRpb25TdHJhdGVneWAgaW50ZXJmYWNlcy5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICogIyMjIEV4YW1wbGVcbiAqXG4gKiBgYGBcbiAqIGNvbnN0IHRlc3RSb3V0ZXM6IFJvdXRlcyA9IFtcbiAqICAge3BhdGg6ICcnLCBjb21wb25lbnQ6IEJsYW5rQ21wfSxcbiAqICAge3BhdGg6ICdzaW1wbGUnLCBjb21wb25lbnQ6IFNpbXBsZUNtcH1cbiAqIF07XG4gKlxuICogYmVmb3JlRWFjaCgoKSA9PiB7XG4gKiAgIFRlc3RCZWQuY29uZmlndXJlVGVzdGluZ01vZHVsZSh7XG4gKiAgICAgcHJvdmlkZXJzOiBbXG4gKiAgICAgICBwcm92aWRlUm91dGVyRm9yVGVzdGluZyh0ZXN0Um91dGVzLFxuICogICAgICAgICB3aXRoRGVidWdUcmFjaW5nKCksXG4gKiAgICAgICAgIHdpdGhSb3V0ZXJDb25maWcoe3BhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6ICdhbHdheXMnfSksXG4gKiAgICAgICApXG4gKiAgICAgXVxuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogQHNlZSBgcHJvdmlkZVJvdXRlcmBcbiAqXG4gKiBAcGFyYW0gcm91dGVzIEEgc2V0IG9mIGBSb3V0ZWBzIHRvIHVzZSBkdXJpbmcgdGhlIHRlc3QuXG4gKiBAcGFyYW0gZmVhdHVyZXMgT3B0aW9uYWwgZmVhdHVyZXMgdG8gY29uZmlndXJlIGFkZGl0aW9uYWwgcm91dGVyIGJlaGF2aW9ycy5cbiAqIEByZXR1cm5zIEEgc2V0IG9mIHByb3ZpZGVycyB0byBzZXR1cCBSb3V0ZXIgZm9yIHRlc3RpbmcuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm92aWRlUm91dGVyRm9yVGVzdGluZyhcbiAgICByb3V0ZXM6IFJvdXRlcyA9IFtdLCAuLi5mZWF0dXJlczogUm91dGVyRmVhdHVyZXNbXSk6IFByb3ZpZGVyW10ge1xuICByZXR1cm4gW1xuICAgIC4uLnByb3ZpZGVSb3V0ZXIocm91dGVzLCAuLi5mZWF0dXJlcyksXG4gICAge3Byb3ZpZGU6IExvY2F0aW9uLCB1c2VDbGFzczogU3B5TG9jYXRpb259LFxuICAgIHtwcm92aWRlOiBMb2NhdGlvblN0cmF0ZWd5LCB1c2VDbGFzczogTW9ja0xvY2F0aW9uU3RyYXRlZ3l9LFxuICBdO1xufVxuIl19