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
import { ChildrenOutletContexts, NoPreloading, Router, ROUTER_CONFIGURATION, RouteReuseStrategy, RouterModule, ROUTES, TitleStrategy, UrlHandlingStrategy, UrlSerializer, withPreloading, ɵROUTER_PROVIDERS as ROUTER_PROVIDERS } from '@angular/router';
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.1.0-next.3+sha-57d47b3", ngImport: i0, type: RouterTestingModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "16.1.0-next.3+sha-57d47b3", ngImport: i0, type: RouterTestingModule, exports: [RouterModule] }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "16.1.0-next.3+sha-57d47b3", ngImport: i0, type: RouterTestingModule, providers: [
            ROUTER_PROVIDERS,
            provideLocationMocks(),
            withPreloading(NoPreloading).ɵproviders,
            { provide: ROUTES, multi: true, useValue: [] },
        ], imports: [RouterModule] }); }
}
export { RouterTestingModule };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.1.0-next.3+sha-57d47b3", ngImport: i0, type: RouterTestingModule, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Rlc3RpbmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3Rlc3Rpbmcvc3JjL3JvdXRlcl90ZXN0aW5nX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDekMsT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDN0QsT0FBTyxFQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUF1QixRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDeEYsT0FBTyxFQUFDLHNCQUFzQixFQUFnQixZQUFZLEVBQVMsTUFBTSxFQUFFLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxNQUFNLEVBQVUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLElBQUksZ0JBQWdCLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQzs7QUFFcFIsU0FBUyxxQkFBcUIsQ0FBQyxJQUNtQjtJQUNoRCxpR0FBaUc7SUFDakcsV0FBVztJQUNYLE9BQU8sa0JBQWtCLElBQUksSUFBSSxDQUFDO0FBQ3BDLENBQUM7QUFFRCxTQUFTLHVCQUF1QixDQUFDLFNBQWlCO0lBQ2hELE1BQU0sSUFBSSxLQUFLLENBQ1gsYUFBYSxTQUFTLHFEQUFxRDtRQUMzRSxrR0FBa0csQ0FBQyxDQUFDO0FBQzFHLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxrQkFBa0IsQ0FDOUIsYUFBNEIsRUFBRSxRQUFnQyxFQUFFLFFBQWtCLEVBQ2xGLFFBQWtCLEVBQUUsUUFBa0IsRUFBRSxNQUFpQixFQUN6RCxJQUE0QyxFQUFFLG1CQUF5QyxFQUN2RixrQkFBdUMsRUFBRSxhQUE2QjtJQUN4RSxtRkFBbUY7SUFDbkYsaUdB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QUFjLENBQUMsWUFBWSxDQUFDLENBQUMsVUFBVTt3QkFDdkMsRUFBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBQztxQkFDN0M7aUJBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7cHJvdmlkZUxvY2F0aW9uTW9ja3N9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbi90ZXN0aW5nJztcbmltcG9ydCB7Q29tcGlsZXIsIGluamVjdCwgSW5qZWN0b3IsIE1vZHVsZVdpdGhQcm92aWRlcnMsIE5nTW9kdWxlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0cywgRXh0cmFPcHRpb25zLCBOb1ByZWxvYWRpbmcsIFJvdXRlLCBSb3V0ZXIsIFJPVVRFUl9DT05GSUdVUkFUSU9OLCBSb3V0ZVJldXNlU3RyYXRlZ3ksIFJvdXRlck1vZHVsZSwgUk9VVEVTLCBSb3V0ZXMsIFRpdGxlU3RyYXRlZ3ksIFVybEhhbmRsaW5nU3RyYXRlZ3ksIFVybFNlcmlhbGl6ZXIsIHdpdGhQcmVsb2FkaW5nLCDJtVJPVVRFUl9QUk9WSURFUlMgYXMgUk9VVEVSX1BST1ZJREVSU30gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcblxuZnVuY3Rpb24gaXNVcmxIYW5kbGluZ1N0cmF0ZWd5KG9wdHM6IEV4dHJhT3B0aW9uc3xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBVcmxIYW5kbGluZ1N0cmF0ZWd5KTogb3B0cyBpcyBVcmxIYW5kbGluZ1N0cmF0ZWd5IHtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBjaGVjayBpcyBuZWVkZWQgYmVjYXVzZSBVcmxIYW5kbGluZ1N0cmF0ZWd5IGlzIGFuIGludGVyZmFjZSBhbmQgZG9lc24ndCBleGlzdCBhdFxuICAvLyBydW50aW1lLlxuICByZXR1cm4gJ3Nob3VsZFByb2Nlc3NVcmwnIGluIG9wdHM7XG59XG5cbmZ1bmN0aW9uIHRocm93SW52YWxpZENvbmZpZ0Vycm9yKHBhcmFtZXRlcjogc3RyaW5nKTogbmV2ZXIge1xuICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgUGFyYW1ldGVyICR7cGFyYW1ldGVyfSBkb2VzIG5vdCBtYXRjaCB0aGUgb25lIGF2YWlsYWJsZSBpbiB0aGUgaW5qZWN0b3IuIGAgK1xuICAgICAgJ2BzZXR1cFRlc3RpbmdSb3V0ZXJgIGlzIG1lYW50IHRvIGJlIHVzZWQgYXMgYSBmYWN0b3J5IGZ1bmN0aW9uIHdpdGggZGVwZW5kZW5jaWVzIGNvbWluZyBmcm9tIERJLicpO1xufVxuXG4vKipcbiAqIFJvdXRlciBzZXR1cCBmYWN0b3J5IGZ1bmN0aW9uIHVzZWQgZm9yIHRlc3RpbmcuXG4gKlxuICogQHB1YmxpY0FwaVxuICogQGRlcHJlY2F0ZWQgVXNlIGBwcm92aWRlUm91dGVyYCBvciBgUm91dGVyTW9kdWxlYCBpbnN0ZWFkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBUZXN0aW5nUm91dGVyKFxuICAgIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIGNvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLCBsb2NhdGlvbjogTG9jYXRpb24sXG4gICAgY29tcGlsZXI6IENvbXBpbGVyLCBpbmplY3RvcjogSW5qZWN0b3IsIHJvdXRlczogUm91dGVbXVtdLFxuICAgIG9wdHM/OiBFeHRyYU9wdGlvbnN8VXJsSGFuZGxpbmdTdHJhdGVneXxudWxsLCB1cmxIYW5kbGluZ1N0cmF0ZWd5PzogVXJsSGFuZGxpbmdTdHJhdGVneSxcbiAgICByb3V0ZVJldXNlU3RyYXRlZ3k/OiBSb3V0ZVJldXNlU3RyYXRlZ3ksIHRpdGxlU3RyYXRlZ3k/OiBUaXRsZVN0cmF0ZWd5KSB7XG4gIC8vIE5vdGU6IFRoZSBjaGVja3MgYmVsb3cgYXJlIHRvIGRldGVjdCBtaXNjb25maWd1cmVkIHByb3ZpZGVycyBhbmQgaW52YWxpZCB1c2VzIG9mXG4gIC8vIGBzZXR1cFRlc3RpbmdSb3V0ZXJgLiBUaGlzIGZ1bmN0aW9uIGlzIG5vdCB1c2VkIGludGVybmFsbHkgKG5laXRoZXIgaW4gcm91dGVyIGNvZGUgb3IgYW55d2hlcmVcbiAgLy8gaW4gZzMpLiBJdCBhcHBlYXJzIHRoaXMgZnVuY3Rpb24gd2FzIGV4cG9zZWQgYXMgcHVibGljQXBpIGJ5IG1pc3Rha2UgYW5kIHNob3VsZCBub3QgYmUgdXNlZFxuICAvLyBleHRlcm5hbGx5IGVpdGhlci4gSG93ZXZlciwgaWYgaXQgaXMsIHRoZSBkb2N1bWVudGVkIGludGVudCBpcyB0byBiZSB1c2VkIGFzIGEgZmFjdG9yeSBmdW5jdGlvblxuICAvLyBhbmQgcGFyYW1ldGVyIHZhbHVlcyBzaG91bGQgYWx3YXlzIG1hdGNoIHdoYXQncyBhdmFpbGFibGUgaW4gREkuXG4gIGlmICh1cmxTZXJpYWxpemVyICE9PSBpbmplY3QoVXJsU2VyaWFsaXplcikpIHtcbiAgICB0aHJvd0ludmFsaWRDb25maWdFcnJvcigndXJsU2VyaWFsaXplcicpO1xuICB9XG4gIGlmIChjb250ZXh0cyAhPT0gaW5qZWN0KENoaWxkcmVuT3V0bGV0Q29udGV4dHMpKSB7XG4gICAgdGhyb3dJbnZhbGlkQ29uZmlnRXJyb3IoJ2NvbnRleHRzJyk7XG4gIH1cbiAgaWYgKGxvY2F0aW9uICE9PSBpbmplY3QoTG9jYXRpb24pKSB7XG4gICAgdGhyb3dJbnZhbGlkQ29uZmlnRXJyb3IoJ2xvY2F0aW9uJyk7XG4gIH1cbiAgaWYgKGNvbXBpbGVyICE9PSBpbmplY3QoQ29tcGlsZXIpKSB7XG4gICAgdGhyb3dJbnZhbGlkQ29uZmlnRXJyb3IoJ2NvbXBpbGVyJyk7XG4gIH1cbiAgaWYgKGluamVjdG9yICE9PSBpbmplY3QoSW5qZWN0b3IpKSB7XG4gICAgdGhyb3dJbnZhbGlkQ29uZmlnRXJyb3IoJ2luamVjdG9yJyk7XG4gIH1cbiAgaWYgKHJvdXRlcyAhPT0gaW5qZWN0KFJPVVRFUykpIHtcbiAgICB0aHJvd0ludmFsaWRDb25maWdFcnJvcigncm91dGVzJyk7XG4gIH1cbiAgaWYgKG9wdHMpIHtcbiAgICAvLyBIYW5kbGUgZGVwcmVjYXRlZCBhcmd1bWVudCBvcmRlcmluZy5cbiAgICBpZiAoaXNVcmxIYW5kbGluZ1N0cmF0ZWd5KG9wdHMpKSB7XG4gICAgICBpZiAob3B0cyAhPT0gaW5qZWN0KFVybEhhbmRsaW5nU3RyYXRlZ3kpKSB7XG4gICAgICAgIHRocm93SW52YWxpZENvbmZpZ0Vycm9yKCdvcHRzIChVcmxIYW5kbGluZ1N0cmF0ZWd5KScpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAob3B0cyAhPT0gaW5qZWN0KFJPVVRFUl9DT05GSUdVUkFUSU9OKSkge1xuICAgICAgICB0aHJvd0ludmFsaWRDb25maWdFcnJvcignb3B0cyAoUk9VVEVSX0NPTkZJR1VSQVRJT04pJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKHVybEhhbmRsaW5nU3RyYXRlZ3kgIT09IGluamVjdChVcmxIYW5kbGluZ1N0cmF0ZWd5KSkge1xuICAgIHRocm93SW52YWxpZENvbmZpZ0Vycm9yKCd1cmxIYW5kbGluZ1N0cmF0ZWd5Jyk7XG4gIH1cblxuICBpZiAocm91dGVSZXVzZVN0cmF0ZWd5ICE9PSBpbmplY3QoUm91dGVSZXVzZVN0cmF0ZWd5KSkge1xuICAgIHRocm93SW52YWxpZENvbmZpZ0Vycm9yKCdyb3V0ZVJldXNlU3RyYXRlZ3knKTtcbiAgfVxuXG4gIGlmICh0aXRsZVN0cmF0ZWd5ICE9PSBpbmplY3QoVGl0bGVTdHJhdGVneSkpIHtcbiAgICB0aHJvd0ludmFsaWRDb25maWdFcnJvcigndGl0bGVTdHJhdGVneScpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBSb3V0ZXIoKTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBTZXRzIHVwIHRoZSByb3V0ZXIgdG8gYmUgdXNlZCBmb3IgdGVzdGluZy5cbiAqXG4gKiBUaGUgbW9kdWxlcyBzZXRzIHVwIHRoZSByb3V0ZXIgdG8gYmUgdXNlZCBmb3IgdGVzdGluZy5cbiAqIEl0IHByb3ZpZGVzIHNweSBpbXBsZW1lbnRhdGlvbnMgb2YgYExvY2F0aW9uYCBhbmQgYExvY2F0aW9uU3RyYXRlZ3lgLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYFxuICogYmVmb3JlRWFjaCgoKSA9PiB7XG4gKiAgIFRlc3RCZWQuY29uZmlndXJlVGVzdGluZ01vZHVsZSh7XG4gKiAgICAgaW1wb3J0czogW1xuICogICAgICAgUm91dGVyTW9kdWxlLmZvclJvb3QoXG4gKiAgICAgICAgIFt7cGF0aDogJycsIGNvbXBvbmVudDogQmxhbmtDbXB9LCB7cGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wfV1cbiAqICAgICAgIClcbiAqICAgICBdXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBOZ01vZHVsZSh7XG4gIGV4cG9ydHM6IFtSb3V0ZXJNb2R1bGVdLFxuICBwcm92aWRlcnM6IFtcbiAgICBST1VURVJfUFJPVklERVJTLFxuICAgIHByb3ZpZGVMb2NhdGlvbk1vY2tzKCksXG4gICAgd2l0aFByZWxvYWRpbmcoTm9QcmVsb2FkaW5nKS7JtXByb3ZpZGVycyxcbiAgICB7cHJvdmlkZTogUk9VVEVTLCBtdWx0aTogdHJ1ZSwgdXNlVmFsdWU6IFtdfSxcbiAgXVxufSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJUZXN0aW5nTW9kdWxlIHtcbiAgc3RhdGljIHdpdGhSb3V0ZXMocm91dGVzOiBSb3V0ZXMsIGNvbmZpZz86IEV4dHJhT3B0aW9ucyk6XG4gICAgICBNb2R1bGVXaXRoUHJvdmlkZXJzPFJvdXRlclRlc3RpbmdNb2R1bGU+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmdNb2R1bGU6IFJvdXRlclRlc3RpbmdNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFtcbiAgICAgICAge3Byb3ZpZGU6IFJPVVRFUywgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiByb3V0ZXN9LFxuICAgICAgICB7cHJvdmlkZTogUk9VVEVSX0NPTkZJR1VSQVRJT04sIHVzZVZhbHVlOiBjb25maWcgPyBjb25maWcgOiB7fX0sXG4gICAgICBdXG4gICAgfTtcbiAgfVxufVxuIl19