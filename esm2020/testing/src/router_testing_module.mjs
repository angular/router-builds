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
 * @deprecated Use `provideRouter` or `RouterTestingModule` instead.
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
}
RouterTestingModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.1+sha-41bed34", ngImport: i0, type: RouterTestingModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
RouterTestingModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "16.0.0-next.1+sha-41bed34", ngImport: i0, type: RouterTestingModule, exports: [RouterModule] });
RouterTestingModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "16.0.0-next.1+sha-41bed34", ngImport: i0, type: RouterTestingModule, providers: [
        ROUTER_PROVIDERS,
        provideLocationMocks(),
        withPreloading(NoPreloading).ɵproviders,
        { provide: ROUTES, multi: true, useValue: [] },
    ], imports: [RouterModule] });
export { RouterTestingModule };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.1+sha-41bed34", ngImport: i0, type: RouterTestingModule, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Rlc3RpbmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3Rlc3Rpbmcvc3JjL3JvdXRlcl90ZXN0aW5nX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDekMsT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDN0QsT0FBTyxFQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUF1QixRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDeEYsT0FBTyxFQUFDLHNCQUFzQixFQUFnQixZQUFZLEVBQVMsTUFBTSxFQUFFLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxNQUFNLEVBQVUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLGFBQWEsRUFBdUIsaUJBQWlCLElBQUksZ0JBQWdCLEVBQUUsZUFBZSxJQUFJLGNBQWMsRUFBQyxNQUFNLGlCQUFpQixDQUFDOztBQUU1VCxTQUFTLHFCQUFxQixDQUFDLElBQ21CO0lBQ2hELGlHQUFpRztJQUNqRyxXQUFXO0lBQ1gsT0FBTyxrQkFBa0IsSUFBSSxJQUFJLENBQUM7QUFDcEMsQ0FBQztBQUVELFNBQVMsdUJBQXVCLENBQUMsU0FBaUI7SUFDaEQsTUFBTSxJQUFJLEtBQUssQ0FDWCxhQUFhLFNBQVMscURBQXFEO1FBQzNFLGtHQUFrRyxDQUFDLENBQUM7QUFDMUcsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLGtCQUFrQixDQUM5QixhQUE0QixFQUFFLFFBQWdDLEVBQUUsUUFBa0IsRUFDbEYsUUFBa0IsRUFBRSxRQUFrQixFQUFFLE1BQWlCLEVBQ3pELElBQTRDLEVBQUUsbUJBQXlDLEVBQ3ZGLGtCQUF1QyxFQUFFLGFBQTZCO0lBQ3hFLG1GQUFt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QUU7d0JBQ3RCLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxVQUFVO3dCQUN2QyxFQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFDO3FCQUM3QztpQkFDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtwcm92aWRlTG9jYXRpb25Nb2Nrc30gZnJvbSAnQGFuZ3VsYXIvY29tbW9uL3Rlc3RpbmcnO1xuaW1wb3J0IHtDb21waWxlciwgaW5qZWN0LCBJbmplY3RvciwgTW9kdWxlV2l0aFByb3ZpZGVycywgTmdNb2R1bGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzLCBFeHRyYU9wdGlvbnMsIE5vUHJlbG9hZGluZywgUm91dGUsIFJvdXRlciwgUk9VVEVSX0NPTkZJR1VSQVRJT04sIFJvdXRlUmV1c2VTdHJhdGVneSwgUm91dGVyTW9kdWxlLCBST1VURVMsIFJvdXRlcywgVGl0bGVTdHJhdGVneSwgVXJsSGFuZGxpbmdTdHJhdGVneSwgVXJsU2VyaWFsaXplciwgybVmbGF0dGVuIGFzIGZsYXR0ZW4sIMm1Uk9VVEVSX1BST1ZJREVSUyBhcyBST1VURVJfUFJPVklERVJTLCDJtXdpdGhQcmVsb2FkaW5nIGFzIHdpdGhQcmVsb2FkaW5nfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xuXG5mdW5jdGlvbiBpc1VybEhhbmRsaW5nU3RyYXRlZ3kob3B0czogRXh0cmFPcHRpb25zfFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFVybEhhbmRsaW5nU3RyYXRlZ3kpOiBvcHRzIGlzIFVybEhhbmRsaW5nU3RyYXRlZ3kge1xuICAvLyBUaGlzIHByb3BlcnR5IGNoZWNrIGlzIG5lZWRlZCBiZWNhdXNlIFVybEhhbmRsaW5nU3RyYXRlZ3kgaXMgYW4gaW50ZXJmYWNlIGFuZCBkb2Vzbid0IGV4aXN0IGF0XG4gIC8vIHJ1bnRpbWUuXG4gIHJldHVybiAnc2hvdWxkUHJvY2Vzc1VybCcgaW4gb3B0cztcbn1cblxuZnVuY3Rpb24gdGhyb3dJbnZhbGlkQ29uZmlnRXJyb3IocGFyYW1ldGVyOiBzdHJpbmcpOiBuZXZlciB7XG4gIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBQYXJhbWV0ZXIgJHtwYXJhbWV0ZXJ9IGRvZXMgbm90IG1hdGNoIHRoZSBvbmUgYXZhaWxhYmxlIGluIHRoZSBpbmplY3Rvci4gYCArXG4gICAgICAnYHNldHVwVGVzdGluZ1JvdXRlcmAgaXMgbWVhbnQgdG8gYmUgdXNlZCBhcyBhIGZhY3RvcnkgZnVuY3Rpb24gd2l0aCBkZXBlbmRlbmNpZXMgY29taW5nIGZyb20gREkuJyk7XG59XG5cbi8qKlxuICogUm91dGVyIHNldHVwIGZhY3RvcnkgZnVuY3Rpb24gdXNlZCBmb3IgdGVzdGluZy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKiBAZGVwcmVjYXRlZCBVc2UgYHByb3ZpZGVSb3V0ZXJgIG9yIGBSb3V0ZXJUZXN0aW5nTW9kdWxlYCBpbnN0ZWFkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBUZXN0aW5nUm91dGVyKFxuICAgIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIGNvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLCBsb2NhdGlvbjogTG9jYXRpb24sXG4gICAgY29tcGlsZXI6IENvbXBpbGVyLCBpbmplY3RvcjogSW5qZWN0b3IsIHJvdXRlczogUm91dGVbXVtdLFxuICAgIG9wdHM/OiBFeHRyYU9wdGlvbnN8VXJsSGFuZGxpbmdTdHJhdGVneXxudWxsLCB1cmxIYW5kbGluZ1N0cmF0ZWd5PzogVXJsSGFuZGxpbmdTdHJhdGVneSxcbiAgICByb3V0ZVJldXNlU3RyYXRlZ3k/OiBSb3V0ZVJldXNlU3RyYXRlZ3ksIHRpdGxlU3RyYXRlZ3k/OiBUaXRsZVN0cmF0ZWd5KSB7XG4gIC8vIE5vdGU6IFRoZSBjaGVja3MgYmVsb3cgYXJlIHRvIGRldGVjdCBtaXNjb25maWd1cmVkIHByb3ZpZGVycyBhbmQgaW52YWxpZCB1c2VzIG9mXG4gIC8vIGBzZXR1cFRlc3RpbmdSb3V0ZXJgLiBUaGlzIGZ1bmN0aW9uIGlzIG5vdCB1c2VkIGludGVybmFsbHkgKG5laXRoZXIgaW4gcm91dGVyIGNvZGUgb3IgYW55d2hlcmVcbiAgLy8gaW4gZzMpLiBJdCBhcHBlYXJzIHRoaXMgZnVuY3Rpb24gd2FzIGV4cG9zZWQgYXMgcHVibGljQXBpIGJ5IG1pc3Rha2UgYW5kIHNob3VsZCBub3QgYmUgdXNlZFxuICAvLyBleHRlcm5hbGx5IGVpdGhlci4gSG93ZXZlciwgaWYgaXQgaXMsIHRoZSBkb2N1bWVudGVkIGludGVudCBpcyB0byBiZSB1c2VkIGFzIGEgZmFjdG9yeSBmdW5jdGlvblxuICAvLyBhbmQgcGFyYW1ldGVyIHZhbHVlcyBzaG91bGQgYWx3YXlzIG1hdGNoIHdoYXQncyBhdmFpbGFibGUgaW4gREkuXG4gIGlmICh1cmxTZXJpYWxpemVyICE9PSBpbmplY3QoVXJsU2VyaWFsaXplcikpIHtcbiAgICB0aHJvd0ludmFsaWRDb25maWdFcnJvcigndXJsU2VyaWFsaXplcicpO1xuICB9XG4gIGlmIChjb250ZXh0cyAhPT0gaW5qZWN0KENoaWxkcmVuT3V0bGV0Q29udGV4dHMpKSB7XG4gICAgdGhyb3dJbnZhbGlkQ29uZmlnRXJyb3IoJ2NvbnRleHRzJyk7XG4gIH1cbiAgaWYgKGxvY2F0aW9uICE9PSBpbmplY3QoTG9jYXRpb24pKSB7XG4gICAgdGhyb3dJbnZhbGlkQ29uZmlnRXJyb3IoJ2xvY2F0aW9uJyk7XG4gIH1cbiAgaWYgKGNvbXBpbGVyICE9PSBpbmplY3QoQ29tcGlsZXIpKSB7XG4gICAgdGhyb3dJbnZhbGlkQ29uZmlnRXJyb3IoJ2NvbXBpbGVyJyk7XG4gIH1cbiAgaWYgKGluamVjdG9yICE9PSBpbmplY3QoSW5qZWN0b3IpKSB7XG4gICAgdGhyb3dJbnZhbGlkQ29uZmlnRXJyb3IoJ2luamVjdG9yJyk7XG4gIH1cbiAgaWYgKHJvdXRlcyAhPT0gaW5qZWN0KFJPVVRFUykpIHtcbiAgICB0aHJvd0ludmFsaWRDb25maWdFcnJvcigncm91dGVzJyk7XG4gIH1cbiAgaWYgKG9wdHMpIHtcbiAgICAvLyBIYW5kbGUgZGVwcmVjYXRlZCBhcmd1bWVudCBvcmRlcmluZy5cbiAgICBpZiAoaXNVcmxIYW5kbGluZ1N0cmF0ZWd5KG9wdHMpKSB7XG4gICAgICBpZiAob3B0cyAhPT0gaW5qZWN0KFVybEhhbmRsaW5nU3RyYXRlZ3kpKSB7XG4gICAgICAgIHRocm93SW52YWxpZENvbmZpZ0Vycm9yKCdvcHRzIChVcmxIYW5kbGluZ1N0cmF0ZWd5KScpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAob3B0cyAhPT0gaW5qZWN0KFJPVVRFUl9DT05GSUdVUkFUSU9OKSkge1xuICAgICAgICB0aHJvd0ludmFsaWRDb25maWdFcnJvcignb3B0cyAoUk9VVEVSX0NPTkZJR1VSQVRJT04pJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKHVybEhhbmRsaW5nU3RyYXRlZ3kgIT09IGluamVjdChVcmxIYW5kbGluZ1N0cmF0ZWd5KSkge1xuICAgIHRocm93SW52YWxpZENvbmZpZ0Vycm9yKCd1cmxIYW5kbGluZ1N0cmF0ZWd5Jyk7XG4gIH1cblxuICBpZiAocm91dGVSZXVzZVN0cmF0ZWd5ICE9PSBpbmplY3QoUm91dGVSZXVzZVN0cmF0ZWd5KSkge1xuICAgIHRocm93SW52YWxpZENvbmZpZ0Vycm9yKCdyb3V0ZVJldXNlU3RyYXRlZ3knKTtcbiAgfVxuXG4gIGlmICh0aXRsZVN0cmF0ZWd5ICE9PSBpbmplY3QoVGl0bGVTdHJhdGVneSkpIHtcbiAgICB0aHJvd0ludmFsaWRDb25maWdFcnJvcigndGl0bGVTdHJhdGVneScpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBSb3V0ZXIoKTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBTZXRzIHVwIHRoZSByb3V0ZXIgdG8gYmUgdXNlZCBmb3IgdGVzdGluZy5cbiAqXG4gKiBUaGUgbW9kdWxlcyBzZXRzIHVwIHRoZSByb3V0ZXIgdG8gYmUgdXNlZCBmb3IgdGVzdGluZy5cbiAqIEl0IHByb3ZpZGVzIHNweSBpbXBsZW1lbnRhdGlvbnMgb2YgYExvY2F0aW9uYCBhbmQgYExvY2F0aW9uU3RyYXRlZ3lgLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYFxuICogYmVmb3JlRWFjaCgoKSA9PiB7XG4gKiAgIFRlc3RCZWQuY29uZmlndXJlVGVzdGluZ01vZHVsZSh7XG4gKiAgICAgaW1wb3J0czogW1xuICogICAgICAgUm91dGVyVGVzdGluZ01vZHVsZS53aXRoUm91dGVzKFxuICogICAgICAgICBbe3BhdGg6ICcnLCBjb21wb25lbnQ6IEJsYW5rQ21wfSwge3BhdGg6ICdzaW1wbGUnLCBjb21wb25lbnQ6IFNpbXBsZUNtcH1dXG4gKiAgICAgICApXG4gKiAgICAgXVxuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ATmdNb2R1bGUoe1xuICBleHBvcnRzOiBbUm91dGVyTW9kdWxlXSxcbiAgcHJvdmlkZXJzOiBbXG4gICAgUk9VVEVSX1BST1ZJREVSUyxcbiAgICBwcm92aWRlTG9jYXRpb25Nb2NrcygpLFxuICAgIHdpdGhQcmVsb2FkaW5nKE5vUHJlbG9hZGluZykuybVwcm92aWRlcnMsXG4gICAge3Byb3ZpZGU6IFJPVVRFUywgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiBbXX0sXG4gIF1cbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyVGVzdGluZ01vZHVsZSB7XG4gIHN0YXRpYyB3aXRoUm91dGVzKHJvdXRlczogUm91dGVzLCBjb25maWc/OiBFeHRyYU9wdGlvbnMpOlxuICAgICAgTW9kdWxlV2l0aFByb3ZpZGVyczxSb3V0ZXJUZXN0aW5nTW9kdWxlPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5nTW9kdWxlOiBSb3V0ZXJUZXN0aW5nTW9kdWxlLFxuICAgICAgcHJvdmlkZXJzOiBbXG4gICAgICAgIHtwcm92aWRlOiBST1VURVMsIG11bHRpOiB0cnVlLCB1c2VWYWx1ZTogcm91dGVzfSxcbiAgICAgICAge3Byb3ZpZGU6IFJPVVRFUl9DT05GSUdVUkFUSU9OLCB1c2VWYWx1ZTogY29uZmlnID8gY29uZmlnIDoge319LFxuICAgICAgXVxuICAgIH07XG4gIH1cbn1cbiJdfQ==