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
RouterTestingModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.0.0-next.6+sha-e13d97c", ngImport: i0, type: RouterTestingModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
RouterTestingModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.0.0-next.6+sha-e13d97c", ngImport: i0, type: RouterTestingModule, exports: [RouterModule] });
RouterTestingModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.0.0-next.6+sha-e13d97c", ngImport: i0, type: RouterTestingModule, providers: [
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
        provideRoutes([]),
    ], imports: [RouterModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.0.0-next.6+sha-e13d97c", ngImport: i0, type: RouterTestingModule, decorators: [{
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
                        provideRoutes([]),
                    ]
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Rlc3RpbmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3Rlc3Rpbmcvc3JjL3JvdXRlcl90ZXN0aW5nX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDekMsT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDN0QsT0FBTyxFQUFDLFFBQVEsRUFBRSxRQUFRLEVBQXVCLFFBQVEsRUFBRSxRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDMUYsT0FBTyxFQUFDLHNCQUFzQixFQUFnQixZQUFZLEVBQUUsYUFBYSxFQUFTLE1BQU0sRUFBRSxvQkFBb0IsRUFBRSxrQkFBa0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFVLGFBQWEsRUFBRSxtQkFBbUIsRUFBRSxhQUFhLEVBQUUsMkJBQTJCLElBQUksMEJBQTBCLEVBQUUsUUFBUSxJQUFJLE9BQU8sRUFBRSxpQkFBaUIsSUFBSSxnQkFBZ0IsRUFBRSxlQUFlLElBQUksY0FBYyxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFFdFksT0FBTyxFQUFDLDhCQUE4QixFQUFDLE1BQU0sa0NBQWtDLENBQUM7O0FBRWhGLFNBQVMscUJBQXFCLENBQUMsSUFDbUI7SUFDaEQsaUdBQWlHO0lBQ2pHLFdBQVc7SUFDWCxPQUFPLGtCQUFrQixJQUFJLElBQUksQ0FBQztBQUNwQyxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLDBCQUEwQixDQUN0QyxhQUE0QixFQUM1QixRQUFnQyxFQUNoQyxRQUFrQixFQUNsQixRQUFrQixFQUNsQixRQUFrQixFQUNsQixNQUFpQixFQUNqQixhQUE0QixFQUM1QixJQUF1QyxFQUN2QyxtQkFBeUMsRUFDekMsa0JBQXVDO0lBRXpDLE9BQU8sa0JB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QUFhO2dDQUNiLG9CQUFvQjtnQ0FDcEIsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLFFBQVEsRUFBRSxDQUFDO2dDQUNyQyxDQUFDLGtCQUFrQixFQUFFLElBQUksUUFBUSxFQUFFLENBQUM7NkJBQ3JDO3lCQUNGO3dCQUNELGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxVQUFVO3dCQUN2QyxhQUFhLENBQUMsRUFBRSxDQUFDO3FCQUNsQjtpQkFDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtwcm92aWRlTG9jYXRpb25Nb2Nrc30gZnJvbSAnQGFuZ3VsYXIvY29tbW9uL3Rlc3RpbmcnO1xuaW1wb3J0IHtDb21waWxlciwgSW5qZWN0b3IsIE1vZHVsZVdpdGhQcm92aWRlcnMsIE5nTW9kdWxlLCBPcHRpb25hbH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0NoaWxkcmVuT3V0bGV0Q29udGV4dHMsIEV4dHJhT3B0aW9ucywgTm9QcmVsb2FkaW5nLCBwcm92aWRlUm91dGVzLCBSb3V0ZSwgUm91dGVyLCBST1VURVJfQ09ORklHVVJBVElPTiwgUm91dGVSZXVzZVN0cmF0ZWd5LCBSb3V0ZXJNb2R1bGUsIFJPVVRFUywgUm91dGVzLCBUaXRsZVN0cmF0ZWd5LCBVcmxIYW5kbGluZ1N0cmF0ZWd5LCBVcmxTZXJpYWxpemVyLCDJtWFzc2lnbkV4dHJhT3B0aW9uc1RvUm91dGVyIGFzIGFzc2lnbkV4dHJhT3B0aW9uc1RvUm91dGVyLCDJtWZsYXR0ZW4gYXMgZmxhdHRlbiwgybVST1VURVJfUFJPVklERVJTIGFzIFJPVVRFUl9QUk9WSURFUlMsIMm1d2l0aFByZWxvYWRpbmcgYXMgd2l0aFByZWxvYWRpbmd9IGZyb20gJ0Bhbmd1bGFyL3JvdXRlcic7XG5cbmltcG9ydCB7RVhUUkFfUk9VVEVSX1RFU1RJTkdfUFJPVklERVJTfSBmcm9tICcuL2V4dHJhX3JvdXRlcl90ZXN0aW5nX3Byb3ZpZGVycyc7XG5cbmZ1bmN0aW9uIGlzVXJsSGFuZGxpbmdTdHJhdGVneShvcHRzOiBFeHRyYU9wdGlvbnN8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVXJsSGFuZGxpbmdTdHJhdGVneSk6IG9wdHMgaXMgVXJsSGFuZGxpbmdTdHJhdGVneSB7XG4gIC8vIFRoaXMgcHJvcGVydHkgY2hlY2sgaXMgbmVlZGVkIGJlY2F1c2UgVXJsSGFuZGxpbmdTdHJhdGVneSBpcyBhbiBpbnRlcmZhY2UgYW5kIGRvZXNuJ3QgZXhpc3QgYXRcbiAgLy8gcnVudGltZS5cbiAgcmV0dXJuICdzaG91bGRQcm9jZXNzVXJsJyBpbiBvcHRzO1xufVxuXG4vKipcbiAqIFJvdXRlciBzZXR1cCBmYWN0b3J5IGZ1bmN0aW9uIHVzZWQgZm9yIHRlc3RpbmcuIE9ubHkgdXNlZCBpbnRlcm5hbGx5IHRvIGtlZXAgdGhlIGZhY3RvcnkgdGhhdCdzXG4gKiBtYXJrZWQgYXMgcHVibGljQXBpIGNsZWFuZXIgKGkuZS4gbm90IGhhdmluZyBfYm90aF8gYFRpdGxlU3RyYXRlZ3lgIGFuZCBgRGVmYXVsdFRpdGxlU3RyYXRlZ3lgKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwVGVzdGluZ1JvdXRlckludGVybmFsKFxuICAgIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgY29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsXG4gICAgbG9jYXRpb246IExvY2F0aW9uLFxuICAgIGNvbXBpbGVyOiBDb21waWxlcixcbiAgICBpbmplY3RvcjogSW5qZWN0b3IsXG4gICAgcm91dGVzOiBSb3V0ZVtdW10sXG4gICAgdGl0bGVTdHJhdGVneTogVGl0bGVTdHJhdGVneSxcbiAgICBvcHRzPzogRXh0cmFPcHRpb25zfFVybEhhbmRsaW5nU3RyYXRlZ3ksXG4gICAgdXJsSGFuZGxpbmdTdHJhdGVneT86IFVybEhhbmRsaW5nU3RyYXRlZ3ksXG4gICAgcm91dGVSZXVzZVN0cmF0ZWd5PzogUm91dGVSZXVzZVN0cmF0ZWd5LFxuKSB7XG4gIHJldHVybiBzZXR1cFRlc3RpbmdSb3V0ZXIoXG4gICAgICB1cmxTZXJpYWxpemVyLCBjb250ZXh0cywgbG9jYXRpb24sIGNvbXBpbGVyLCBpbmplY3Rvciwgcm91dGVzLCBvcHRzLCB1cmxIYW5kbGluZ1N0cmF0ZWd5LFxuICAgICAgcm91dGVSZXVzZVN0cmF0ZWd5LCB0aXRsZVN0cmF0ZWd5KTtcbn1cblxuLyoqXG4gKiBSb3V0ZXIgc2V0dXAgZmFjdG9yeSBmdW5jdGlvbiB1c2VkIGZvciB0ZXN0aW5nLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwVGVzdGluZ1JvdXRlcihcbiAgICB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLCBjb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cywgbG9jYXRpb246IExvY2F0aW9uLFxuICAgIGNvbXBpbGVyOiBDb21waWxlciwgaW5qZWN0b3I6IEluamVjdG9yLCByb3V0ZXM6IFJvdXRlW11bXSxcbiAgICBvcHRzPzogRXh0cmFPcHRpb25zfFVybEhhbmRsaW5nU3RyYXRlZ3l8bnVsbCwgdXJsSGFuZGxpbmdTdHJhdGVneT86IFVybEhhbmRsaW5nU3RyYXRlZ3ksXG4gICAgcm91dGVSZXVzZVN0cmF0ZWd5PzogUm91dGVSZXVzZVN0cmF0ZWd5LCB0aXRsZVN0cmF0ZWd5PzogVGl0bGVTdHJhdGVneSkge1xuICBjb25zdCByb3V0ZXIgPVxuICAgICAgbmV3IFJvdXRlcihudWxsISwgdXJsU2VyaWFsaXplciwgY29udGV4dHMsIGxvY2F0aW9uLCBpbmplY3RvciwgY29tcGlsZXIsIGZsYXR0ZW4ocm91dGVzKSk7XG4gIGlmIChvcHRzKSB7XG4gICAgLy8gSGFuZGxlIGRlcHJlY2F0ZWQgYXJndW1lbnQgb3JkZXJpbmcuXG4gICAgaWYgKGlzVXJsSGFuZGxpbmdTdHJhdGVneShvcHRzKSkge1xuICAgICAgcm91dGVyLnVybEhhbmRsaW5nU3RyYXRlZ3kgPSBvcHRzO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBIYW5kbGUgRXh0cmFPcHRpb25zXG4gICAgICBhc3NpZ25FeHRyYU9wdGlvbnNUb1JvdXRlcihvcHRzLCByb3V0ZXIpO1xuICAgIH1cbiAgfVxuXG4gIGlmICh1cmxIYW5kbGluZ1N0cmF0ZWd5KSB7XG4gICAgcm91dGVyLnVybEhhbmRsaW5nU3RyYXRlZ3kgPSB1cmxIYW5kbGluZ1N0cmF0ZWd5O1xuICB9XG5cbiAgaWYgKHJvdXRlUmV1c2VTdHJhdGVneSkge1xuICAgIHJvdXRlci5yb3V0ZVJldXNlU3RyYXRlZ3kgPSByb3V0ZVJldXNlU3RyYXRlZ3k7XG4gIH1cblxuICByb3V0ZXIudGl0bGVTdHJhdGVneSA9IHRpdGxlU3RyYXRlZ3k7XG5cbiAgcmV0dXJuIHJvdXRlcjtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBTZXRzIHVwIHRoZSByb3V0ZXIgdG8gYmUgdXNlZCBmb3IgdGVzdGluZy5cbiAqXG4gKiBUaGUgbW9kdWxlcyBzZXRzIHVwIHRoZSByb3V0ZXIgdG8gYmUgdXNlZCBmb3IgdGVzdGluZy5cbiAqIEl0IHByb3ZpZGVzIHNweSBpbXBsZW1lbnRhdGlvbnMgb2YgYExvY2F0aW9uYCBhbmQgYExvY2F0aW9uU3RyYXRlZ3lgLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYFxuICogYmVmb3JlRWFjaCgoKSA9PiB7XG4gKiAgIFRlc3RCZWQuY29uZmlndXJlVGVzdGluZ01vZHVsZSh7XG4gKiAgICAgaW1wb3J0czogW1xuICogICAgICAgUm91dGVyVGVzdGluZ01vZHVsZS53aXRoUm91dGVzKFxuICogICAgICAgICBbe3BhdGg6ICcnLCBjb21wb25lbnQ6IEJsYW5rQ21wfSwge3BhdGg6ICdzaW1wbGUnLCBjb21wb25lbnQ6IFNpbXBsZUNtcH1dXG4gKiAgICAgICApXG4gKiAgICAgXVxuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ATmdNb2R1bGUoe1xuICBleHBvcnRzOiBbUm91dGVyTW9kdWxlXSxcbiAgcHJvdmlkZXJzOiBbXG4gICAgUk9VVEVSX1BST1ZJREVSUyxcbiAgICBFWFRSQV9ST1VURVJfVEVTVElOR19QUk9WSURFUlMsXG4gICAgcHJvdmlkZUxvY2F0aW9uTW9ja3MoKSxcbiAgICB7XG4gICAgICBwcm92aWRlOiBSb3V0ZXIsXG4gICAgICB1c2VGYWN0b3J5OiBzZXR1cFRlc3RpbmdSb3V0ZXJJbnRlcm5hbCxcbiAgICAgIGRlcHM6IFtcbiAgICAgICAgVXJsU2VyaWFsaXplcixcbiAgICAgICAgQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyxcbiAgICAgICAgTG9jYXRpb24sXG4gICAgICAgIENvbXBpbGVyLFxuICAgICAgICBJbmplY3RvcixcbiAgICAgICAgUk9VVEVTLFxuICAgICAgICBUaXRsZVN0cmF0ZWd5LFxuICAgICAgICBST1VURVJfQ09ORklHVVJBVElPTixcbiAgICAgICAgW1VybEhhbmRsaW5nU3RyYXRlZ3ksIG5ldyBPcHRpb25hbCgpXSxcbiAgICAgICAgW1JvdXRlUmV1c2VTdHJhdGVneSwgbmV3IE9wdGlvbmFsKCldLFxuICAgICAgXVxuICAgIH0sXG4gICAgd2l0aFByZWxvYWRpbmcoTm9QcmVsb2FkaW5nKS7JtXByb3ZpZGVycyxcbiAgICBwcm92aWRlUm91dGVzKFtdKSxcbiAgXVxufSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJUZXN0aW5nTW9kdWxlIHtcbiAgc3RhdGljIHdpdGhSb3V0ZXMocm91dGVzOiBSb3V0ZXMsIGNvbmZpZz86IEV4dHJhT3B0aW9ucyk6XG4gICAgICBNb2R1bGVXaXRoUHJvdmlkZXJzPFJvdXRlclRlc3RpbmdNb2R1bGU+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmdNb2R1bGU6IFJvdXRlclRlc3RpbmdNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFtcbiAgICAgICAgcHJvdmlkZVJvdXRlcyhyb3V0ZXMpLFxuICAgICAgICB7cHJvdmlkZTogUk9VVEVSX0NPTkZJR1VSQVRJT04sIHVzZVZhbHVlOiBjb25maWcgPyBjb25maWcgOiB7fX0sXG4gICAgICBdXG4gICAgfTtcbiAgfVxufVxuIl19