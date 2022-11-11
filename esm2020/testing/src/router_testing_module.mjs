/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Compiler, Injector, NgModule, Optional } from '@angular/core';
import { ChildrenOutletContexts, NoPreloading, Router, ROUTER_CONFIGURATION, RouteReuseStrategy, RouterModule, ROUTES, TitleStrategy, UrlHandlingStrategy, UrlSerializer, ɵassignExtraOptionsToRouter as assignExtraOptionsToRouter, ɵflatten as flatten, ɵROUTER_PROVIDERS as ROUTER_PROVIDERS, ɵwithPreloading as withPreloading } from '@angular/router';
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
                { provide: ROUTES, multi: true, useValue: routes },
                { provide: ROUTER_CONFIGURATION, useValue: config ? config : {} },
            ]
        };
    }
}
RouterTestingModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.0.0-rc.3+sha-0c0550b", ngImport: i0, type: RouterTestingModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
RouterTestingModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.0.0-rc.3+sha-0c0550b", ngImport: i0, type: RouterTestingModule, exports: [RouterModule] });
RouterTestingModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.0.0-rc.3+sha-0c0550b", ngImport: i0, type: RouterTestingModule, providers: [
        ROUTER_PROVIDERS,
        EXTRA_ROUTER_TESTING_PROVIDERS,
        provideLocationMocks(),
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
        { provide: ROUTES, multi: true, useValue: [] },
    ], imports: [RouterModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.0.0-rc.3+sha-0c0550b", ngImport: i0, type: RouterTestingModule, decorators: [{
            type: NgModule,
            args: [{
                    exports: [RouterModule],
                    providers: [
                        ROUTER_PROVIDERS,
                        EXTRA_ROUTER_TESTING_PROVIDERS,
                        provideLocationMocks(),
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
                        { provide: ROUTES, multi: true, useValue: [] },
                    ]
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Rlc3RpbmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3Rlc3Rpbmcvc3JjL3JvdXRlcl90ZXN0aW5nX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDekMsT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDN0QsT0FBTyxFQUFDLFFBQVEsRUFBRSxRQUFRLEVBQXVCLFFBQVEsRUFBRSxRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDMUYsT0FBTyxFQUFDLHNCQUFzQixFQUFnQixZQUFZLEVBQVMsTUFBTSxFQUFFLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxNQUFNLEVBQVUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLGFBQWEsRUFBRSwyQkFBMkIsSUFBSSwwQkFBMEIsRUFBRSxRQUFRLElBQUksT0FBTyxFQUFFLGlCQUFpQixJQUFJLGdCQUFnQixFQUFFLGVBQWUsSUFBSSxjQUFjLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUV2WCxPQUFPLEVBQUMsOEJBQThCLEVBQUMsTUFBTSxrQ0FBa0MsQ0FBQzs7QUFFaEYsU0FBUyxxQkFBcUIsQ0FBQyxJQUNtQjtJQUNoRCxpR0FBaUc7SUFDakcsV0FBVztJQUNYLE9BQU8sa0JBQWtCLElBQUksSUFBSSxDQUFDO0FBQ3BDLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsMEJBQTBCLENBQ3RDLGFBQTRCLEVBQzVCLFFBQWdDLEVBQ2hDLFFBQWtCLEVBQ2xCLFFBQWtCLEVBQ2xCLFFBQWtCLEVBQ2xCLE1BQWlCLEVBQ2pCLGFBQTRCLEVBQzVCLElBQXVDLEVBQ3ZDLG1CQUF5QyxFQUN6QyxrQkFBdUM7SUFFekMsT0FBTyxrQkFBa0IsQ0FDckIs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QUFFO2dDQUNKLGFBQWE7Z0NBQ2Isc0JBQXNCO2dDQUN0QixRQUFRO2dDQUNSLFFBQVE7Z0NBQ1IsUUFBUTtnQ0FDUixNQUFNO2dDQUNOLGFBQWE7Z0NBQ2Isb0JBQW9CO2dDQUNwQixDQUFDLG1CQUFtQixFQUFFLElBQUksUUFBUSxFQUFFLENBQUM7Z0NBQ3JDLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxRQUFRLEVBQUUsQ0FBQzs2QkFDckM7eUJBQ0Y7d0JBQ0QsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLFVBQVU7d0JBQ3ZDLEVBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUM7cUJBQzdDO2lCQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge3Byb3ZpZGVMb2NhdGlvbk1vY2tzfSBmcm9tICdAYW5ndWxhci9jb21tb24vdGVzdGluZyc7XG5pbXBvcnQge0NvbXBpbGVyLCBJbmplY3RvciwgTW9kdWxlV2l0aFByb3ZpZGVycywgTmdNb2R1bGUsIE9wdGlvbmFsfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0cywgRXh0cmFPcHRpb25zLCBOb1ByZWxvYWRpbmcsIFJvdXRlLCBSb3V0ZXIsIFJPVVRFUl9DT05GSUdVUkFUSU9OLCBSb3V0ZVJldXNlU3RyYXRlZ3ksIFJvdXRlck1vZHVsZSwgUk9VVEVTLCBSb3V0ZXMsIFRpdGxlU3RyYXRlZ3ksIFVybEhhbmRsaW5nU3RyYXRlZ3ksIFVybFNlcmlhbGl6ZXIsIMm1YXNzaWduRXh0cmFPcHRpb25zVG9Sb3V0ZXIgYXMgYXNzaWduRXh0cmFPcHRpb25zVG9Sb3V0ZXIsIMm1ZmxhdHRlbiBhcyBmbGF0dGVuLCDJtVJPVVRFUl9QUk9WSURFUlMgYXMgUk9VVEVSX1BST1ZJREVSUywgybV3aXRoUHJlbG9hZGluZyBhcyB3aXRoUHJlbG9hZGluZ30gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcblxuaW1wb3J0IHtFWFRSQV9ST1VURVJfVEVTVElOR19QUk9WSURFUlN9IGZyb20gJy4vZXh0cmFfcm91dGVyX3Rlc3RpbmdfcHJvdmlkZXJzJztcblxuZnVuY3Rpb24gaXNVcmxIYW5kbGluZ1N0cmF0ZWd5KG9wdHM6IEV4dHJhT3B0aW9uc3xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBVcmxIYW5kbGluZ1N0cmF0ZWd5KTogb3B0cyBpcyBVcmxIYW5kbGluZ1N0cmF0ZWd5IHtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBjaGVjayBpcyBuZWVkZWQgYmVjYXVzZSBVcmxIYW5kbGluZ1N0cmF0ZWd5IGlzIGFuIGludGVyZmFjZSBhbmQgZG9lc24ndCBleGlzdCBhdFxuICAvLyBydW50aW1lLlxuICByZXR1cm4gJ3Nob3VsZFByb2Nlc3NVcmwnIGluIG9wdHM7XG59XG5cbi8qKlxuICogUm91dGVyIHNldHVwIGZhY3RvcnkgZnVuY3Rpb24gdXNlZCBmb3IgdGVzdGluZy4gT25seSB1c2VkIGludGVybmFsbHkgdG8ga2VlcCB0aGUgZmFjdG9yeSB0aGF0J3NcbiAqIG1hcmtlZCBhcyBwdWJsaWNBcGkgY2xlYW5lciAoaS5lLiBub3QgaGF2aW5nIF9ib3RoXyBgVGl0bGVTdHJhdGVneWAgYW5kIGBEZWZhdWx0VGl0bGVTdHJhdGVneWApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBUZXN0aW5nUm91dGVySW50ZXJuYWwoXG4gICAgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICBjb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyxcbiAgICBsb2NhdGlvbjogTG9jYXRpb24sXG4gICAgY29tcGlsZXI6IENvbXBpbGVyLFxuICAgIGluamVjdG9yOiBJbmplY3RvcixcbiAgICByb3V0ZXM6IFJvdXRlW11bXSxcbiAgICB0aXRsZVN0cmF0ZWd5OiBUaXRsZVN0cmF0ZWd5LFxuICAgIG9wdHM/OiBFeHRyYU9wdGlvbnN8VXJsSGFuZGxpbmdTdHJhdGVneSxcbiAgICB1cmxIYW5kbGluZ1N0cmF0ZWd5PzogVXJsSGFuZGxpbmdTdHJhdGVneSxcbiAgICByb3V0ZVJldXNlU3RyYXRlZ3k/OiBSb3V0ZVJldXNlU3RyYXRlZ3ksXG4pIHtcbiAgcmV0dXJuIHNldHVwVGVzdGluZ1JvdXRlcihcbiAgICAgIHVybFNlcmlhbGl6ZXIsIGNvbnRleHRzLCBsb2NhdGlvbiwgY29tcGlsZXIsIGluamVjdG9yLCByb3V0ZXMsIG9wdHMsIHVybEhhbmRsaW5nU3RyYXRlZ3ksXG4gICAgICByb3V0ZVJldXNlU3RyYXRlZ3ksIHRpdGxlU3RyYXRlZ3kpO1xufVxuXG4vKipcbiAqIFJvdXRlciBzZXR1cCBmYWN0b3J5IGZ1bmN0aW9uIHVzZWQgZm9yIHRlc3RpbmcuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBUZXN0aW5nUm91dGVyKFxuICAgIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIGNvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLCBsb2NhdGlvbjogTG9jYXRpb24sXG4gICAgY29tcGlsZXI6IENvbXBpbGVyLCBpbmplY3RvcjogSW5qZWN0b3IsIHJvdXRlczogUm91dGVbXVtdLFxuICAgIG9wdHM/OiBFeHRyYU9wdGlvbnN8VXJsSGFuZGxpbmdTdHJhdGVneXxudWxsLCB1cmxIYW5kbGluZ1N0cmF0ZWd5PzogVXJsSGFuZGxpbmdTdHJhdGVneSxcbiAgICByb3V0ZVJldXNlU3RyYXRlZ3k/OiBSb3V0ZVJldXNlU3RyYXRlZ3ksIHRpdGxlU3RyYXRlZ3k/OiBUaXRsZVN0cmF0ZWd5KSB7XG4gIGNvbnN0IHJvdXRlciA9XG4gICAgICBuZXcgUm91dGVyKG51bGwhLCB1cmxTZXJpYWxpemVyLCBjb250ZXh0cywgbG9jYXRpb24sIGluamVjdG9yLCBjb21waWxlciwgZmxhdHRlbihyb3V0ZXMpKTtcbiAgaWYgKG9wdHMpIHtcbiAgICAvLyBIYW5kbGUgZGVwcmVjYXRlZCBhcmd1bWVudCBvcmRlcmluZy5cbiAgICBpZiAoaXNVcmxIYW5kbGluZ1N0cmF0ZWd5KG9wdHMpKSB7XG4gICAgICByb3V0ZXIudXJsSGFuZGxpbmdTdHJhdGVneSA9IG9wdHM7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEhhbmRsZSBFeHRyYU9wdGlvbnNcbiAgICAgIGFzc2lnbkV4dHJhT3B0aW9uc1RvUm91dGVyKG9wdHMsIHJvdXRlcik7XG4gICAgfVxuICB9XG5cbiAgaWYgKHVybEhhbmRsaW5nU3RyYXRlZ3kpIHtcbiAgICByb3V0ZXIudXJsSGFuZGxpbmdTdHJhdGVneSA9IHVybEhhbmRsaW5nU3RyYXRlZ3k7XG4gIH1cblxuICBpZiAocm91dGVSZXVzZVN0cmF0ZWd5KSB7XG4gICAgcm91dGVyLnJvdXRlUmV1c2VTdHJhdGVneSA9IHJvdXRlUmV1c2VTdHJhdGVneTtcbiAgfVxuXG4gIHJvdXRlci50aXRsZVN0cmF0ZWd5ID0gdGl0bGVTdHJhdGVneTtcblxuICByZXR1cm4gcm91dGVyO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFNldHMgdXAgdGhlIHJvdXRlciB0byBiZSB1c2VkIGZvciB0ZXN0aW5nLlxuICpcbiAqIFRoZSBtb2R1bGVzIHNldHMgdXAgdGhlIHJvdXRlciB0byBiZSB1c2VkIGZvciB0ZXN0aW5nLlxuICogSXQgcHJvdmlkZXMgc3B5IGltcGxlbWVudGF0aW9ucyBvZiBgTG9jYXRpb25gIGFuZCBgTG9jYXRpb25TdHJhdGVneWAuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqICMjIyBFeGFtcGxlXG4gKlxuICogYGBgXG4gKiBiZWZvcmVFYWNoKCgpID0+IHtcbiAqICAgVGVzdEJlZC5jb25maWd1cmVUZXN0aW5nTW9kdWxlKHtcbiAqICAgICBpbXBvcnRzOiBbXG4gKiAgICAgICBSb3V0ZXJUZXN0aW5nTW9kdWxlLndpdGhSb3V0ZXMoXG4gKiAgICAgICAgIFt7cGF0aDogJycsIGNvbXBvbmVudDogQmxhbmtDbXB9LCB7cGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wfV1cbiAqICAgICAgIClcbiAqICAgICBdXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBOZ01vZHVsZSh7XG4gIGV4cG9ydHM6IFtSb3V0ZXJNb2R1bGVdLFxuICBwcm92aWRlcnM6IFtcbiAgICBST1VURVJfUFJPVklERVJTLFxuICAgIEVYVFJBX1JPVVRFUl9URVNUSU5HX1BST1ZJREVSUyxcbiAgICBwcm92aWRlTG9jYXRpb25Nb2NrcygpLFxuICAgIHtcbiAgICAgIHByb3ZpZGU6IFJvdXRlcixcbiAgICAgIHVzZUZhY3Rvcnk6IHNldHVwVGVzdGluZ1JvdXRlckludGVybmFsLFxuICAgICAgZGVwczogW1xuICAgICAgICBVcmxTZXJpYWxpemVyLFxuICAgICAgICBDaGlsZHJlbk91dGxldENvbnRleHRzLFxuICAgICAgICBMb2NhdGlvbixcbiAgICAgICAgQ29tcGlsZXIsXG4gICAgICAgIEluamVjdG9yLFxuICAgICAgICBST1VURVMsXG4gICAgICAgIFRpdGxlU3RyYXRlZ3ksXG4gICAgICAgIFJPVVRFUl9DT05GSUdVUkFUSU9OLFxuICAgICAgICBbVXJsSGFuZGxpbmdTdHJhdGVneSwgbmV3IE9wdGlvbmFsKCldLFxuICAgICAgICBbUm91dGVSZXVzZVN0cmF0ZWd5LCBuZXcgT3B0aW9uYWwoKV0sXG4gICAgICBdXG4gICAgfSxcbiAgICB3aXRoUHJlbG9hZGluZyhOb1ByZWxvYWRpbmcpLsm1cHJvdmlkZXJzLFxuICAgIHtwcm92aWRlOiBST1VURVMsIG11bHRpOiB0cnVlLCB1c2VWYWx1ZTogW119LFxuICBdXG59KVxuZXhwb3J0IGNsYXNzIFJvdXRlclRlc3RpbmdNb2R1bGUge1xuICBzdGF0aWMgd2l0aFJvdXRlcyhyb3V0ZXM6IFJvdXRlcywgY29uZmlnPzogRXh0cmFPcHRpb25zKTpcbiAgICAgIE1vZHVsZVdpdGhQcm92aWRlcnM8Um91dGVyVGVzdGluZ01vZHVsZT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuZ01vZHVsZTogUm91dGVyVGVzdGluZ01vZHVsZSxcbiAgICAgIHByb3ZpZGVyczogW1xuICAgICAgICB7cHJvdmlkZTogUk9VVEVTLCBtdWx0aTogdHJ1ZSwgdXNlVmFsdWU6IHJvdXRlc30sXG4gICAgICAgIHtwcm92aWRlOiBST1VURVJfQ09ORklHVVJBVElPTiwgdXNlVmFsdWU6IGNvbmZpZyA/IGNvbmZpZyA6IHt9fSxcbiAgICAgIF1cbiAgICB9O1xuICB9XG59XG4iXX0=