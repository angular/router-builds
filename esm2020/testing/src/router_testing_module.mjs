/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location, LocationStrategy } from '@angular/common';
import { MockLocationStrategy, SpyLocation } from '@angular/common/testing';
import { Compiler, Injector, NgModule, Optional } from '@angular/core';
import { ChildrenOutletContexts, NoPreloading, provideRoutes, Router, ROUTER_CONFIGURATION, RouteReuseStrategy, RouterModule, ROUTES, TitleStrategy, UrlHandlingStrategy, UrlSerializer, ɵassignExtraOptionsToRouter as assignExtraOptionsToRouter, ɵflatten as flatten, ɵROUTER_PROVIDERS as ROUTER_PROVIDERS, ɵwithPreloading as withPreloading } from '@angular/router';
import { EXTRA_ROUTER_TESTING_PROVIDERS } from './extra_router_testing_providers';
import * as i0 from "@angular/core";
function isUrlHandlingStrategy(opts) {
    // This property check is needed because UrlHandlingStrategy is an interface and doesn't exist at
    // runtime.
    return 'shouldProcessUrl' in opts;
}
/**
 * Router setup factory function used for testing. Only used internally to keep the factory that's
 * marked as publicApi cleaner (i.e. not having _both_ `TitleStrategy` and `DefaultTitleStrategy`).
 */
export function setupTestingRouterInternal(urlSerializer, contexts, location, compiler, injector, routes, titleStrategy, opts, urlHandlingStrategy, routeReuseStrategy) {
    return setupTestingRouter(urlSerializer, contexts, location, compiler, injector, routes, opts, urlHandlingStrategy, routeReuseStrategy, titleStrategy);
}
/**
 * Router setup factory function used for testing.
 *
 * @publicApi
 */
export function setupTestingRouter(urlSerializer, contexts, location, compiler, injector, routes, opts, urlHandlingStrategy, routeReuseStrategy, titleStrategy) {
    const router = new Router(null, urlSerializer, contexts, location, injector, compiler, flatten(routes));
    if (opts) {
        // Handle deprecated argument ordering.
        if (isUrlHandlingStrategy(opts)) {
            router.urlHandlingStrategy = opts;
        }
        else {
            // Handle ExtraOptions
            assignExtraOptionsToRouter(opts, router);
        }
    }
    if (urlHandlingStrategy) {
        router.urlHandlingStrategy = urlHandlingStrategy;
    }
    if (routeReuseStrategy) {
        router.routeReuseStrategy = routeReuseStrategy;
    }
    router.titleStrategy = titleStrategy;
    return router;
}
/**
 * @description
 *
 * Sets up the router to be used for testing.
 *
 * The modules sets up the router to be used for testing.
 * It provides spy implementations of `Location` and `LocationStrategy`.
 *
 * @usageNotes
 * ### Example
 *
 * ```
 * beforeEach(() => {
 *   TestBed.configureTestingModule({
 *     imports: [
 *       RouterTestingModule.withRoutes(
 *         [{path: '', component: BlankCmp}, {path: 'simple', component: SimpleCmp}]
 *       )
 *     ]
 *   });
 * });
 * ```
 *
 * @publicApi
 */
export class RouterTestingModule {
    static withRoutes(routes, config) {
        return {
            ngModule: RouterTestingModule,
            providers: [
                provideRoutes(routes),
                { provide: ROUTER_CONFIGURATION, useValue: config ? config : {} },
            ]
        };
    }
}
RouterTestingModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.6+sha-64d6a4f", ngImport: i0, type: RouterTestingModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
RouterTestingModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "14.2.6+sha-64d6a4f", ngImport: i0, type: RouterTestingModule, exports: [RouterModule] });
RouterTestingModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "14.2.6+sha-64d6a4f", ngImport: i0, type: RouterTestingModule, providers: [
        ROUTER_PROVIDERS,
        EXTRA_ROUTER_TESTING_PROVIDERS,
        { provide: Location, useClass: SpyLocation },
        { provide: LocationStrategy, useClass: MockLocationStrategy },
        {
            provide: Router,
            useFactory: setupTestingRouterInternal,
            deps: [
                UrlSerializer,
                ChildrenOutletContexts,
                Location,
                Compiler,
                Injector,
                ROUTES,
                TitleStrategy,
                ROUTER_CONFIGURATION,
                [UrlHandlingStrategy, new Optional()],
                [RouteReuseStrategy, new Optional()],
            ]
        },
        withPreloading(NoPreloading).ɵproviders,
        provideRoutes([]),
    ], imports: [RouterModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.6+sha-64d6a4f", ngImport: i0, type: RouterTestingModule, decorators: [{
            type: NgModule,
            args: [{
                    exports: [RouterModule],
                    providers: [
                        ROUTER_PROVIDERS,
                        EXTRA_ROUTER_TESTING_PROVIDERS,
                        { provide: Location, useClass: SpyLocation },
                        { provide: LocationStrategy, useClass: MockLocationStrategy },
                        {
                            provide: Router,
                            useFactory: setupTestingRouterInternal,
                            deps: [
                                UrlSerializer,
                                ChildrenOutletContexts,
                                Location,
                                Compiler,
                                Injector,
                                ROUTES,
                                TitleStrategy,
                                ROUTER_CONFIGURATION,
                                [UrlHandlingStrategy, new Optional()],
                                [RouteReuseStrategy, new Optional()],
                            ]
                        },
                        withPreloading(NoPreloading).ɵproviders,
                        provideRoutes([]),
                    ]
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Rlc3RpbmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3Rlc3Rpbmcvc3JjL3JvdXRlcl90ZXN0aW5nX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsUUFBUSxFQUFFLGdCQUFnQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDM0QsT0FBTyxFQUFDLG9CQUFvQixFQUFFLFdBQVcsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQzFFLE9BQU8sRUFBQyxRQUFRLEVBQUUsUUFBUSxFQUF1QixRQUFRLEVBQUUsUUFBUSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQzFGLE9BQU8sRUFBQyxzQkFBc0IsRUFBZ0IsWUFBWSxFQUFFLGFBQWEsRUFBUyxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBVSxhQUFhLEVBQUUsbUJBQW1CLEVBQUUsYUFBYSxFQUFFLDJCQUEyQixJQUFJLDBCQUEwQixFQUFFLFFBQVEsSUFBSSxPQUFPLEVBQUUsaUJBQWlCLElBQUksZ0JBQWdCLEVBQUUsZUFBZSxJQUFJLGNBQWMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRXRZLE9BQU8sRUFBQyw4QkFBOEIsRUFBQyxNQUFNLGtDQUFrQyxDQUFDOztBQUVoRixTQUFTLHFCQUFxQixDQUFDLElBQ21CO0lBQ2hELGlHQUFpRztJQUNqRyxXQUFXO0lBQ1gsT0FBTyxrQkFBa0IsSUFBSSxJQUFJLENBQUM7QUFDcEMsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSwwQkFBMEIsQ0FDdEMsYUFBNEIsRUFDNUIsUUFBZ0MsRUFDaEMsUUFBa0IsRUFDbEIsUUFBa0IsRUFDbEIsUUFBa0IsRUFDbEIsTUFBaUIsRUFDakIsYUFBNEIsRUFDNUIsSUFBdUMsRUFDdkMsbUJBQXlDLEVBQ3pD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QkFDMUMsRUFBQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFDO3dCQUMzRDs0QkFDRSxPQUFPLEVBQUUsTUFBTTs0QkFDZixVQUFVLEVBQUUsMEJBQTBCOzRCQUN0QyxJQUFJLEVBQUU7Z0NBQ0osYUFBYTtnQ0FDYixzQkFBc0I7Z0NBQ3RCLFFBQVE7Z0NBQ1IsUUFBUTtnQ0FDUixRQUFRO2dDQUNSLE1BQU07Z0NBQ04sYUFBYTtnQ0FDYixvQkFBb0I7Z0NBQ3BCLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQ0FDckMsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLFFBQVEsRUFBRSxDQUFDOzZCQUNyQzt5QkFDRjt3QkFDRCxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsVUFBVTt3QkFDdkMsYUFBYSxDQUFDLEVBQUUsQ0FBQztxQkFDbEI7aUJBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvbiwgTG9jYXRpb25TdHJhdGVneX0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7TW9ja0xvY2F0aW9uU3RyYXRlZ3ksIFNweUxvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24vdGVzdGluZyc7XG5pbXBvcnQge0NvbXBpbGVyLCBJbmplY3RvciwgTW9kdWxlV2l0aFByb3ZpZGVycywgTmdNb2R1bGUsIE9wdGlvbmFsfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0cywgRXh0cmFPcHRpb25zLCBOb1ByZWxvYWRpbmcsIHByb3ZpZGVSb3V0ZXMsIFJvdXRlLCBSb3V0ZXIsIFJPVVRFUl9DT05GSUdVUkFUSU9OLCBSb3V0ZVJldXNlU3RyYXRlZ3ksIFJvdXRlck1vZHVsZSwgUk9VVEVTLCBSb3V0ZXMsIFRpdGxlU3RyYXRlZ3ksIFVybEhhbmRsaW5nU3RyYXRlZ3ksIFVybFNlcmlhbGl6ZXIsIMm1YXNzaWduRXh0cmFPcHRpb25zVG9Sb3V0ZXIgYXMgYXNzaWduRXh0cmFPcHRpb25zVG9Sb3V0ZXIsIMm1ZmxhdHRlbiBhcyBmbGF0dGVuLCDJtVJPVVRFUl9QUk9WSURFUlMgYXMgUk9VVEVSX1BST1ZJREVSUywgybV3aXRoUHJlbG9hZGluZyBhcyB3aXRoUHJlbG9hZGluZ30gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcblxuaW1wb3J0IHtFWFRSQV9ST1VURVJfVEVTVElOR19QUk9WSURFUlN9IGZyb20gJy4vZXh0cmFfcm91dGVyX3Rlc3RpbmdfcHJvdmlkZXJzJztcblxuZnVuY3Rpb24gaXNVcmxIYW5kbGluZ1N0cmF0ZWd5KG9wdHM6IEV4dHJhT3B0aW9uc3xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBVcmxIYW5kbGluZ1N0cmF0ZWd5KTogb3B0cyBpcyBVcmxIYW5kbGluZ1N0cmF0ZWd5IHtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBjaGVjayBpcyBuZWVkZWQgYmVjYXVzZSBVcmxIYW5kbGluZ1N0cmF0ZWd5IGlzIGFuIGludGVyZmFjZSBhbmQgZG9lc24ndCBleGlzdCBhdFxuICAvLyBydW50aW1lLlxuICByZXR1cm4gJ3Nob3VsZFByb2Nlc3NVcmwnIGluIG9wdHM7XG59XG5cbi8qKlxuICogUm91dGVyIHNldHVwIGZhY3RvcnkgZnVuY3Rpb24gdXNlZCBmb3IgdGVzdGluZy4gT25seSB1c2VkIGludGVybmFsbHkgdG8ga2VlcCB0aGUgZmFjdG9yeSB0aGF0J3NcbiAqIG1hcmtlZCBhcyBwdWJsaWNBcGkgY2xlYW5lciAoaS5lLiBub3QgaGF2aW5nIF9ib3RoXyBgVGl0bGVTdHJhdGVneWAgYW5kIGBEZWZhdWx0VGl0bGVTdHJhdGVneWApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBUZXN0aW5nUm91dGVySW50ZXJuYWwoXG4gICAgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICBjb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyxcbiAgICBsb2NhdGlvbjogTG9jYXRpb24sXG4gICAgY29tcGlsZXI6IENvbXBpbGVyLFxuICAgIGluamVjdG9yOiBJbmplY3RvcixcbiAgICByb3V0ZXM6IFJvdXRlW11bXSxcbiAgICB0aXRsZVN0cmF0ZWd5OiBUaXRsZVN0cmF0ZWd5LFxuICAgIG9wdHM/OiBFeHRyYU9wdGlvbnN8VXJsSGFuZGxpbmdTdHJhdGVneSxcbiAgICB1cmxIYW5kbGluZ1N0cmF0ZWd5PzogVXJsSGFuZGxpbmdTdHJhdGVneSxcbiAgICByb3V0ZVJldXNlU3RyYXRlZ3k/OiBSb3V0ZVJldXNlU3RyYXRlZ3ksXG4pIHtcbiAgcmV0dXJuIHNldHVwVGVzdGluZ1JvdXRlcihcbiAgICAgIHVybFNlcmlhbGl6ZXIsIGNvbnRleHRzLCBsb2NhdGlvbiwgY29tcGlsZXIsIGluamVjdG9yLCByb3V0ZXMsIG9wdHMsIHVybEhhbmRsaW5nU3RyYXRlZ3ksXG4gICAgICByb3V0ZVJldXNlU3RyYXRlZ3ksIHRpdGxlU3RyYXRlZ3kpO1xufVxuXG4vKipcbiAqIFJvdXRlciBzZXR1cCBmYWN0b3J5IGZ1bmN0aW9uIHVzZWQgZm9yIHRlc3RpbmcuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBUZXN0aW5nUm91dGVyKFxuICAgIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIGNvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLCBsb2NhdGlvbjogTG9jYXRpb24sXG4gICAgY29tcGlsZXI6IENvbXBpbGVyLCBpbmplY3RvcjogSW5qZWN0b3IsIHJvdXRlczogUm91dGVbXVtdLFxuICAgIG9wdHM/OiBFeHRyYU9wdGlvbnN8VXJsSGFuZGxpbmdTdHJhdGVneXxudWxsLCB1cmxIYW5kbGluZ1N0cmF0ZWd5PzogVXJsSGFuZGxpbmdTdHJhdGVneSxcbiAgICByb3V0ZVJldXNlU3RyYXRlZ3k/OiBSb3V0ZVJldXNlU3RyYXRlZ3ksIHRpdGxlU3RyYXRlZ3k/OiBUaXRsZVN0cmF0ZWd5KSB7XG4gIGNvbnN0IHJvdXRlciA9XG4gICAgICBuZXcgUm91dGVyKG51bGwhLCB1cmxTZXJpYWxpemVyLCBjb250ZXh0cywgbG9jYXRpb24sIGluamVjdG9yLCBjb21waWxlciwgZmxhdHRlbihyb3V0ZXMpKTtcbiAgaWYgKG9wdHMpIHtcbiAgICAvLyBIYW5kbGUgZGVwcmVjYXRlZCBhcmd1bWVudCBvcmRlcmluZy5cbiAgICBpZiAoaXNVcmxIYW5kbGluZ1N0cmF0ZWd5KG9wdHMpKSB7XG4gICAgICByb3V0ZXIudXJsSGFuZGxpbmdTdHJhdGVneSA9IG9wdHM7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEhhbmRsZSBFeHRyYU9wdGlvbnNcbiAgICAgIGFzc2lnbkV4dHJhT3B0aW9uc1RvUm91dGVyKG9wdHMsIHJvdXRlcik7XG4gICAgfVxuICB9XG5cbiAgaWYgKHVybEhhbmRsaW5nU3RyYXRlZ3kpIHtcbiAgICByb3V0ZXIudXJsSGFuZGxpbmdTdHJhdGVneSA9IHVybEhhbmRsaW5nU3RyYXRlZ3k7XG4gIH1cblxuICBpZiAocm91dGVSZXVzZVN0cmF0ZWd5KSB7XG4gICAgcm91dGVyLnJvdXRlUmV1c2VTdHJhdGVneSA9IHJvdXRlUmV1c2VTdHJhdGVneTtcbiAgfVxuXG4gIHJvdXRlci50aXRsZVN0cmF0ZWd5ID0gdGl0bGVTdHJhdGVneTtcblxuICByZXR1cm4gcm91dGVyO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFNldHMgdXAgdGhlIHJvdXRlciB0byBiZSB1c2VkIGZvciB0ZXN0aW5nLlxuICpcbiAqIFRoZSBtb2R1bGVzIHNldHMgdXAgdGhlIHJvdXRlciB0byBiZSB1c2VkIGZvciB0ZXN0aW5nLlxuICogSXQgcHJvdmlkZXMgc3B5IGltcGxlbWVudGF0aW9ucyBvZiBgTG9jYXRpb25gIGFuZCBgTG9jYXRpb25TdHJhdGVneWAuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqICMjIyBFeGFtcGxlXG4gKlxuICogYGBgXG4gKiBiZWZvcmVFYWNoKCgpID0+IHtcbiAqICAgVGVzdEJlZC5jb25maWd1cmVUZXN0aW5nTW9kdWxlKHtcbiAqICAgICBpbXBvcnRzOiBbXG4gKiAgICAgICBSb3V0ZXJUZXN0aW5nTW9kdWxlLndpdGhSb3V0ZXMoXG4gKiAgICAgICAgIFt7cGF0aDogJycsIGNvbXBvbmVudDogQmxhbmtDbXB9LCB7cGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wfV1cbiAqICAgICAgIClcbiAqICAgICBdXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBOZ01vZHVsZSh7XG4gIGV4cG9ydHM6IFtSb3V0ZXJNb2R1bGVdLFxuICBwcm92aWRlcnM6IFtcbiAgICBST1VURVJfUFJPVklERVJTLFxuICAgIEVYVFJBX1JPVVRFUl9URVNUSU5HX1BST1ZJREVSUyxcbiAgICB7cHJvdmlkZTogTG9jYXRpb24sIHVzZUNsYXNzOiBTcHlMb2NhdGlvbn0sXG4gICAge3Byb3ZpZGU6IExvY2F0aW9uU3RyYXRlZ3ksIHVzZUNsYXNzOiBNb2NrTG9jYXRpb25TdHJhdGVneX0sXG4gICAge1xuICAgICAgcHJvdmlkZTogUm91dGVyLFxuICAgICAgdXNlRmFjdG9yeTogc2V0dXBUZXN0aW5nUm91dGVySW50ZXJuYWwsXG4gICAgICBkZXBzOiBbXG4gICAgICAgIFVybFNlcmlhbGl6ZXIsXG4gICAgICAgIENoaWxkcmVuT3V0bGV0Q29udGV4dHMsXG4gICAgICAgIExvY2F0aW9uLFxuICAgICAgICBDb21waWxlcixcbiAgICAgICAgSW5qZWN0b3IsXG4gICAgICAgIFJPVVRFUyxcbiAgICAgICAgVGl0bGVTdHJhdGVneSxcbiAgICAgICAgUk9VVEVSX0NPTkZJR1VSQVRJT04sXG4gICAgICAgIFtVcmxIYW5kbGluZ1N0cmF0ZWd5LCBuZXcgT3B0aW9uYWwoKV0sXG4gICAgICAgIFtSb3V0ZVJldXNlU3RyYXRlZ3ksIG5ldyBPcHRpb25hbCgpXSxcbiAgICAgIF1cbiAgICB9LFxuICAgIHdpdGhQcmVsb2FkaW5nKE5vUHJlbG9hZGluZykuybVwcm92aWRlcnMsXG4gICAgcHJvdmlkZVJvdXRlcyhbXSksXG4gIF1cbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyVGVzdGluZ01vZHVsZSB7XG4gIHN0YXRpYyB3aXRoUm91dGVzKHJvdXRlczogUm91dGVzLCBjb25maWc/OiBFeHRyYU9wdGlvbnMpOlxuICAgICAgTW9kdWxlV2l0aFByb3ZpZGVyczxSb3V0ZXJUZXN0aW5nTW9kdWxlPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5nTW9kdWxlOiBSb3V0ZXJUZXN0aW5nTW9kdWxlLFxuICAgICAgcHJvdmlkZXJzOiBbXG4gICAgICAgIHByb3ZpZGVSb3V0ZXMocm91dGVzKSxcbiAgICAgICAge3Byb3ZpZGU6IFJPVVRFUl9DT05GSUdVUkFUSU9OLCB1c2VWYWx1ZTogY29uZmlnID8gY29uZmlnIDoge319LFxuICAgICAgXVxuICAgIH07XG4gIH1cbn1cbiJdfQ==