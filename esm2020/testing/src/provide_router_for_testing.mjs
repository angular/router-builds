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
        provideRouter(routes, ...features),
        { provide: Location, useClass: SpyLocation },
        { provide: LocationStrategy, useClass: MockLocationStrategy },
    ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZV9yb3V0ZXJfZm9yX3Rlc3RpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvdGVzdGluZy9zcmMvcHJvdmlkZV9yb3V0ZXJfZm9yX3Rlc3RpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzNELE9BQU8sRUFBQyxvQkFBb0IsRUFBRSxXQUFXLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUUxRSxPQUFPLEVBQUMsYUFBYSxFQUF5QixNQUFNLGlCQUFpQixDQUFDO0FBR3RFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWdDRztBQUNILE1BQU0sVUFBVSx1QkFBdUIsQ0FDbkMsU0FBaUIsRUFBRSxFQUFFLEdBQUcsUUFBMEI7SUFDcEQsT0FBTztRQUNMLGFBQWEsQ0FBQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUM7UUFDbEMsRUFBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUM7UUFDMUMsRUFBQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFDO0tBQzVELENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb24sIExvY2F0aW9uU3RyYXRlZ3l9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge01vY2tMb2NhdGlvblN0cmF0ZWd5LCBTcHlMb2NhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uL3Rlc3RpbmcnO1xuaW1wb3J0IHtFbnZpcm9ubWVudFByb3ZpZGVycywgUHJvdmlkZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtwcm92aWRlUm91dGVyLCBSb3V0ZXJGZWF0dXJlcywgUm91dGVzfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xuXG5cbi8qKlxuICogU2V0cyB1cCBwcm92aWRlcnMgbmVjZXNzYXJ5IHRvIGVuYWJsZSBgUm91dGVyYCBmdW5jdGlvbmFsaXR5IGZvciB0ZXN0cy5cbiAqXG4gKiBBbGxvd3MgdG8gY29uZmlndXJlIGEgc2V0IG9mIHJvdXRlcyBhcyB3ZWxsIGFzIGV4dHJhIGZlYXR1cmVzIHRoYXQgc2hvdWxkIGJlIGVuYWJsZWQuXG4gKiBQcm92aWRlcyBzcHkgaW1wbGVtZW50YXRpb25zIG9mIGBMb2NhdGlvbmAgYW5kIGBMb2NhdGlvblN0cmF0ZWd5YCBpbnRlcmZhY2VzLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYFxuICogY29uc3QgdGVzdFJvdXRlczogUm91dGVzID0gW1xuICogICB7cGF0aDogJycsIGNvbXBvbmVudDogQmxhbmtDbXB9LFxuICogICB7cGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wfVxuICogXTtcbiAqXG4gKiBiZWZvcmVFYWNoKCgpID0+IHtcbiAqICAgVGVzdEJlZC5jb25maWd1cmVUZXN0aW5nTW9kdWxlKHtcbiAqICAgICBwcm92aWRlcnM6IFtcbiAqICAgICAgIHByb3ZpZGVSb3V0ZXJGb3JUZXN0aW5nKHRlc3RSb3V0ZXMsXG4gKiAgICAgICAgIHdpdGhEZWJ1Z1RyYWNpbmcoKSxcbiAqICAgICAgICAgd2l0aFJvdXRlckNvbmZpZyh7cGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogJ2Fsd2F5cyd9KSxcbiAqICAgICAgIClcbiAqICAgICBdXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBAc2VlIGBwcm92aWRlUm91dGVyYFxuICpcbiAqIEBwYXJhbSByb3V0ZXMgQSBzZXQgb2YgYFJvdXRlYHMgdG8gdXNlIGR1cmluZyB0aGUgdGVzdC5cbiAqIEBwYXJhbSBmZWF0dXJlcyBPcHRpb25hbCBmZWF0dXJlcyB0byBjb25maWd1cmUgYWRkaXRpb25hbCByb3V0ZXIgYmVoYXZpb3JzLlxuICogQHJldHVybnMgQSBzZXQgb2YgcHJvdmlkZXJzIHRvIHNldHVwIFJvdXRlciBmb3IgdGVzdGluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVSb3V0ZXJGb3JUZXN0aW5nKFxuICAgIHJvdXRlczogUm91dGVzID0gW10sIC4uLmZlYXR1cmVzOiBSb3V0ZXJGZWF0dXJlc1tdKTogKFByb3ZpZGVyfEVudmlyb25tZW50UHJvdmlkZXJzKVtdIHtcbiAgcmV0dXJuIFtcbiAgICBwcm92aWRlUm91dGVyKHJvdXRlcywgLi4uZmVhdHVyZXMpLFxuICAgIHtwcm92aWRlOiBMb2NhdGlvbiwgdXNlQ2xhc3M6IFNweUxvY2F0aW9ufSxcbiAgICB7cHJvdmlkZTogTG9jYXRpb25TdHJhdGVneSwgdXNlQ2xhc3M6IE1vY2tMb2NhdGlvblN0cmF0ZWd5fSxcbiAgXTtcbn1cbiJdfQ==