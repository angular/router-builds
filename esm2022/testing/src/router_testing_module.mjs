/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Compiler, inject, Injector, NgModule } from '@angular/core';
import { ChildrenOutletContexts, NoPreloading, Router, ROUTER_CONFIGURATION, RouteReuseStrategy, RouterModule, ROUTES, TitleStrategy, UrlHandlingStrategy, UrlSerializer, ɵROUTER_PROVIDERS as ROUTER_PROVIDERS, ɵwithPreloading as withPreloading } from '@angular/router';
import * as i0 from "@angular/core";
function isUrlHandlingStrategy(opts) {
    // This property check is needed because UrlHandlingStrategy is an interface and doesn't exist at
    // runtime.
    return 'shouldProcessUrl' in opts;
}
function throwInvalidConfigError(parameter) {
    throw new Error(`Parameter ${parameter} does not match the one available in the injector. ` +
        '`setupTestingRouter` is meant to be used as a factory function with dependencies coming from DI.');
}
/**
 * Router setup factory function used for testing.
 *
 * @publicApi
 * @deprecated Use `provideRouter` or `RouterModule` instead.
 */
export function setupTestingRouter(urlSerializer, contexts, location, compiler, injector, routes, opts, urlHandlingStrategy, routeReuseStrategy, titleStrategy) {
    // Note: The checks below are to detect misconfigured providers and invalid uses of
    // `setupTestingRouter`. This function is not used internally (neither in router code or anywhere
    // in g3). It appears this function was exposed as publicApi by mistake and should not be used
    // externally either. However, if it is, the documented intent is to be used as a factory function
    // and parameter values should always match what's available in DI.
    if (urlSerializer !== inject(UrlSerializer)) {
        throwInvalidConfigError('urlSerializer');
    }
    if (contexts !== inject(ChildrenOutletContexts)) {
        throwInvalidConfigError('contexts');
    }
    if (location !== inject(Location)) {
        throwInvalidConfigError('location');
    }
    if (compiler !== inject(Compiler)) {
        throwInvalidConfigError('compiler');
    }
    if (injector !== inject(Injector)) {
        throwInvalidConfigError('injector');
    }
    if (routes !== inject(ROUTES)) {
        throwInvalidConfigError('routes');
    }
    if (opts) {
        // Handle deprecated argument ordering.
        if (isUrlHandlingStrategy(opts)) {
            if (opts !== inject(UrlHandlingStrategy)) {
                throwInvalidConfigError('opts (UrlHandlingStrategy)');
            }
        }
        else {
            if (opts !== inject(ROUTER_CONFIGURATION)) {
                throwInvalidConfigError('opts (ROUTER_CONFIGURATION)');
            }
        }
    }
    if (urlHandlingStrategy !== inject(UrlHandlingStrategy)) {
        throwInvalidConfigError('urlHandlingStrategy');
    }
    if (routeReuseStrategy !== inject(RouteReuseStrategy)) {
        throwInvalidConfigError('routeReuseStrategy');
    }
    if (titleStrategy !== inject(TitleStrategy)) {
        throwInvalidConfigError('titleStrategy');
    }
    return new Router();
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
 *       RouterModule.forRoot(
 *         [{path: '', component: BlankCmp}, {path: 'simple', component: SimpleCmp}]
 *       )
 *     ]
 *   });
 * });
 * ```
 *
 * @publicApi
 */
class RouterTestingModule {
    static withRoutes(routes, config) {
        return {
            ngModule: RouterTestingModule,
            providers: [
                { provide: ROUTES, multi: true, useValue: routes },
                { provide: ROUTER_CONFIGURATION, useValue: config ? config : {} },
            ]
        };
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-rc.3+sha-d6d347f", ngImport: i0, type: RouterTestingModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "16.0.0-rc.3+sha-d6d347f", ngImport: i0, type: RouterTestingModule, exports: [RouterModule] }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "16.0.0-rc.3+sha-d6d347f", ngImport: i0, type: RouterTestingModule, providers: [
            ROUTER_PROVIDERS,
            provideLocationMocks(),
            withPreloading(NoPreloading).ɵproviders,
            { provide: ROUTES, multi: true, useValue: [] },
        ], imports: [RouterModule] }); }
}
export { RouterTestingModule };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-rc.3+sha-d6d347f", ngImport: i0, type: RouterTestingModule, decorators: [{
            type: NgModule,
            args: [{
                    exports: [RouterModule],
                    providers: [
                        ROUTER_PROVIDERS,
                        provideLocationMocks(),
                        withPreloading(NoPreloading).ɵproviders,
                        { provide: ROUTES, multi: true, useValue: [] },
                    ]
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Rlc3RpbmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3Rlc3Rpbmcvc3JjL3JvdXRlcl90ZXN0aW5nX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDekMsT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDN0QsT0FBTyxFQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUF1QixRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDeEYsT0FBTyxFQUFDLHNCQUFzQixFQUFnQixZQUFZLEVBQVMsTUFBTSxFQUFFLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxNQUFNLEVBQVUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLGFBQWEsRUFBRSxpQkFBaUIsSUFBSSxnQkFBZ0IsRUFBRSxlQUFlLElBQUksY0FBYyxFQUFDLE1BQU0saUJBQWlCLENBQUM7O0FBRXZTLFNBQVMscUJBQXFCLENBQUMsSUFDbUI7SUFDaEQsaUdBQWlHO0lBQ2pHLFdBQVc7SUFDWCxPQUFPLGtCQUFrQixJQUFJLElBQUksQ0FBQztBQUNwQyxDQUFDO0FBRUQsU0FBUyx1QkFBdUIsQ0FBQyxTQUFpQjtJQUNoRCxNQUFNLElBQUksS0FBSyxDQUNYLGFBQWEsU0FBUyxxREFBcUQ7UUFDM0Usa0dBQWtHLENBQUMsQ0FBQztBQUMxRyxDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsa0JBQWtCLENBQzlCLGFBQTRCLEVBQUUsUUFBZ0MsRUFBRSxRQUFrQixFQUNsRixRQUFrQixFQUFFLFFBQWtCLEVBQUUsTUFBaUIsRUFDekQsSUFBNEMsRUFBRSxtQkFBeUMsRUFDdkYsa0JBQXVDLEVBQUUsYUFBNkI7SUFDeEUsbUZBQW1G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RTt3QkFDdEIsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLFVBQVU7d0JBQ3ZDLEVBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUM7cUJBQzdDO2lCQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge3Byb3ZpZGVMb2NhdGlvbk1vY2tzfSBmcm9tICdAYW5ndWxhci9jb21tb24vdGVzdGluZyc7XG5pbXBvcnQge0NvbXBpbGVyLCBpbmplY3QsIEluamVjdG9yLCBNb2R1bGVXaXRoUHJvdmlkZXJzLCBOZ01vZHVsZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0NoaWxkcmVuT3V0bGV0Q29udGV4dHMsIEV4dHJhT3B0aW9ucywgTm9QcmVsb2FkaW5nLCBSb3V0ZSwgUm91dGVyLCBST1VURVJfQ09ORklHVVJBVElPTiwgUm91dGVSZXVzZVN0cmF0ZWd5LCBSb3V0ZXJNb2R1bGUsIFJPVVRFUywgUm91dGVzLCBUaXRsZVN0cmF0ZWd5LCBVcmxIYW5kbGluZ1N0cmF0ZWd5LCBVcmxTZXJpYWxpemVyLCDJtVJPVVRFUl9QUk9WSURFUlMgYXMgUk9VVEVSX1BST1ZJREVSUywgybV3aXRoUHJlbG9hZGluZyBhcyB3aXRoUHJlbG9hZGluZ30gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcblxuZnVuY3Rpb24gaXNVcmxIYW5kbGluZ1N0cmF0ZWd5KG9wdHM6IEV4dHJhT3B0aW9uc3xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBVcmxIYW5kbGluZ1N0cmF0ZWd5KTogb3B0cyBpcyBVcmxIYW5kbGluZ1N0cmF0ZWd5IHtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBjaGVjayBpcyBuZWVkZWQgYmVjYXVzZSBVcmxIYW5kbGluZ1N0cmF0ZWd5IGlzIGFuIGludGVyZmFjZSBhbmQgZG9lc24ndCBleGlzdCBhdFxuICAvLyBydW50aW1lLlxuICByZXR1cm4gJ3Nob3VsZFByb2Nlc3NVcmwnIGluIG9wdHM7XG59XG5cbmZ1bmN0aW9uIHRocm93SW52YWxpZENvbmZpZ0Vycm9yKHBhcmFtZXRlcjogc3RyaW5nKTogbmV2ZXIge1xuICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgUGFyYW1ldGVyICR7cGFyYW1ldGVyfSBkb2VzIG5vdCBtYXRjaCB0aGUgb25lIGF2YWlsYWJsZSBpbiB0aGUgaW5qZWN0b3IuIGAgK1xuICAgICAgJ2BzZXR1cFRlc3RpbmdSb3V0ZXJgIGlzIG1lYW50IHRvIGJlIHVzZWQgYXMgYSBmYWN0b3J5IGZ1bmN0aW9uIHdpdGggZGVwZW5kZW5jaWVzIGNvbWluZyBmcm9tIERJLicpO1xufVxuXG4vKipcbiAqIFJvdXRlciBzZXR1cCBmYWN0b3J5IGZ1bmN0aW9uIHVzZWQgZm9yIHRlc3RpbmcuXG4gKlxuICogQHB1YmxpY0FwaVxuICogQGRlcHJlY2F0ZWQgVXNlIGBwcm92aWRlUm91dGVyYCBvciBgUm91dGVyTW9kdWxlYCBpbnN0ZWFkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBUZXN0aW5nUm91dGVyKFxuICAgIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIGNvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLCBsb2NhdGlvbjogTG9jYXRpb24sXG4gICAgY29tcGlsZXI6IENvbXBpbGVyLCBpbmplY3RvcjogSW5qZWN0b3IsIHJvdXRlczogUm91dGVbXVtdLFxuICAgIG9wdHM/OiBFeHRyYU9wdGlvbnN8VXJsSGFuZGxpbmdTdHJhdGVneXxudWxsLCB1cmxIYW5kbGluZ1N0cmF0ZWd5PzogVXJsSGFuZGxpbmdTdHJhdGVneSxcbiAgICByb3V0ZVJldXNlU3RyYXRlZ3k/OiBSb3V0ZVJldXNlU3RyYXRlZ3ksIHRpdGxlU3RyYXRlZ3k/OiBUaXRsZVN0cmF0ZWd5KSB7XG4gIC8vIE5vdGU6IFRoZSBjaGVja3MgYmVsb3cgYXJlIHRvIGRldGVjdCBtaXNjb25maWd1cmVkIHByb3ZpZGVycyBhbmQgaW52YWxpZCB1c2VzIG9mXG4gIC8vIGBzZXR1cFRlc3RpbmdSb3V0ZXJgLiBUaGlzIGZ1bmN0aW9uIGlzIG5vdCB1c2VkIGludGVybmFsbHkgKG5laXRoZXIgaW4gcm91dGVyIGNvZGUgb3IgYW55d2hlcmVcbiAgLy8gaW4gZzMpLiBJdCBhcHBlYXJzIHRoaXMgZnVuY3Rpb24gd2FzIGV4cG9zZWQgYXMgcHVibGljQXBpIGJ5IG1pc3Rha2UgYW5kIHNob3VsZCBub3QgYmUgdXNlZFxuICAvLyBleHRlcm5hbGx5IGVpdGhlci4gSG93ZXZlciwgaWYgaXQgaXMsIHRoZSBkb2N1bWVudGVkIGludGVudCBpcyB0byBiZSB1c2VkIGFzIGEgZmFjdG9yeSBmdW5jdGlvblxuICAvLyBhbmQgcGFyYW1ldGVyIHZhbHVlcyBzaG91bGQgYWx3YXlzIG1hdGNoIHdoYXQncyBhdmFpbGFibGUgaW4gREkuXG4gIGlmICh1cmxTZXJpYWxpemVyICE9PSBpbmplY3QoVXJsU2VyaWFsaXplcikpIHtcbiAgICB0aHJvd0ludmFsaWRDb25maWdFcnJvcigndXJsU2VyaWFsaXplcicpO1xuICB9XG4gIGlmIChjb250ZXh0cyAhPT0gaW5qZWN0KENoaWxkcmVuT3V0bGV0Q29udGV4dHMpKSB7XG4gICAgdGhyb3dJbnZhbGlkQ29uZmlnRXJyb3IoJ2NvbnRleHRzJyk7XG4gIH1cbiAgaWYgKGxvY2F0aW9uICE9PSBpbmplY3QoTG9jYXRpb24pKSB7XG4gICAgdGhyb3dJbnZhbGlkQ29uZmlnRXJyb3IoJ2xvY2F0aW9uJyk7XG4gIH1cbiAgaWYgKGNvbXBpbGVyICE9PSBpbmplY3QoQ29tcGlsZXIpKSB7XG4gICAgdGhyb3dJbnZhbGlkQ29uZmlnRXJyb3IoJ2NvbXBpbGVyJyk7XG4gIH1cbiAgaWYgKGluamVjdG9yICE9PSBpbmplY3QoSW5qZWN0b3IpKSB7XG4gICAgdGhyb3dJbnZhbGlkQ29uZmlnRXJyb3IoJ2luamVjdG9yJyk7XG4gIH1cbiAgaWYgKHJvdXRlcyAhPT0gaW5qZWN0KFJPVVRFUykpIHtcbiAgICB0aHJvd0ludmFsaWRDb25maWdFcnJvcigncm91dGVzJyk7XG4gIH1cbiAgaWYgKG9wdHMpIHtcbiAgICAvLyBIYW5kbGUgZGVwcmVjYXRlZCBhcmd1bWVudCBvcmRlcmluZy5cbiAgICBpZiAoaXNVcmxIYW5kbGluZ1N0cmF0ZWd5KG9wdHMpKSB7XG4gICAgICBpZiAob3B0cyAhPT0gaW5qZWN0KFVybEhhbmRsaW5nU3RyYXRlZ3kpKSB7XG4gICAgICAgIHRocm93SW52YWxpZENvbmZpZ0Vycm9yKCdvcHRzIChVcmxIYW5kbGluZ1N0cmF0ZWd5KScpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAob3B0cyAhPT0gaW5qZWN0KFJPVVRFUl9DT05GSUdVUkFUSU9OKSkge1xuICAgICAgICB0aHJvd0ludmFsaWRDb25maWdFcnJvcignb3B0cyAoUk9VVEVSX0NPTkZJR1VSQVRJT04pJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKHVybEhhbmRsaW5nU3RyYXRlZ3kgIT09IGluamVjdChVcmxIYW5kbGluZ1N0cmF0ZWd5KSkge1xuICAgIHRocm93SW52YWxpZENvbmZpZ0Vycm9yKCd1cmxIYW5kbGluZ1N0cmF0ZWd5Jyk7XG4gIH1cblxuICBpZiAocm91dGVSZXVzZVN0cmF0ZWd5ICE9PSBpbmplY3QoUm91dGVSZXVzZVN0cmF0ZWd5KSkge1xuICAgIHRocm93SW52YWxpZENvbmZpZ0Vycm9yKCdyb3V0ZVJldXNlU3RyYXRlZ3knKTtcbiAgfVxuXG4gIGlmICh0aXRsZVN0cmF0ZWd5ICE9PSBpbmplY3QoVGl0bGVTdHJhdGVneSkpIHtcbiAgICB0aHJvd0ludmFsaWRDb25maWdFcnJvcigndGl0bGVTdHJhdGVneScpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBSb3V0ZXIoKTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBTZXRzIHVwIHRoZSByb3V0ZXIgdG8gYmUgdXNlZCBmb3IgdGVzdGluZy5cbiAqXG4gKiBUaGUgbW9kdWxlcyBzZXRzIHVwIHRoZSByb3V0ZXIgdG8gYmUgdXNlZCBmb3IgdGVzdGluZy5cbiAqIEl0IHByb3ZpZGVzIHNweSBpbXBsZW1lbnRhdGlvbnMgb2YgYExvY2F0aW9uYCBhbmQgYExvY2F0aW9uU3RyYXRlZ3lgLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYFxuICogYmVmb3JlRWFjaCgoKSA9PiB7XG4gKiAgIFRlc3RCZWQuY29uZmlndXJlVGVzdGluZ01vZHVsZSh7XG4gKiAgICAgaW1wb3J0czogW1xuICogICAgICAgUm91dGVyTW9kdWxlLmZvclJvb3QoXG4gKiAgICAgICAgIFt7cGF0aDogJycsIGNvbXBvbmVudDogQmxhbmtDbXB9LCB7cGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wfV1cbiAqICAgICAgIClcbiAqICAgICBdXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBOZ01vZHVsZSh7XG4gIGV4cG9ydHM6IFtSb3V0ZXJNb2R1bGVdLFxuICBwcm92aWRlcnM6IFtcbiAgICBST1VURVJfUFJPVklERVJTLFxuICAgIHByb3ZpZGVMb2NhdGlvbk1vY2tzKCksXG4gICAgd2l0aFByZWxvYWRpbmcoTm9QcmVsb2FkaW5nKS7JtXByb3ZpZGVycyxcbiAgICB7cHJvdmlkZTogUk9VVEVTLCBtdWx0aTogdHJ1ZSwgdXNlVmFsdWU6IFtdfSxcbiAgXVxufSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJUZXN0aW5nTW9kdWxlIHtcbiAgc3RhdGljIHdpdGhSb3V0ZXMocm91dGVzOiBSb3V0ZXMsIGNvbmZpZz86IEV4dHJhT3B0aW9ucyk6XG4gICAgICBNb2R1bGVXaXRoUHJvdmlkZXJzPFJvdXRlclRlc3RpbmdNb2R1bGU+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmdNb2R1bGU6IFJvdXRlclRlc3RpbmdNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFtcbiAgICAgICAge3Byb3ZpZGU6IFJPVVRFUywgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiByb3V0ZXN9LFxuICAgICAgICB7cHJvdmlkZTogUk9VVEVSX0NPTkZJR1VSQVRJT04sIHVzZVZhbHVlOiBjb25maWcgPyBjb25maWcgOiB7fX0sXG4gICAgICBdXG4gICAgfTtcbiAgfVxufVxuIl19