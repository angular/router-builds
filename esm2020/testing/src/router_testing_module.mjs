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
import { EXTRA_ROUTER_TESTING_PROVIDERS } from './extra_router_testing_providers';
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
RouterTestingModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.0.4+sha-d768fb7", ngImport: i0, type: RouterTestingModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
RouterTestingModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "15.0.4+sha-d768fb7", ngImport: i0, type: RouterTestingModule, exports: [RouterModule] });
RouterTestingModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "15.0.4+sha-d768fb7", ngImport: i0, type: RouterTestingModule, providers: [
        ROUTER_PROVIDERS,
        EXTRA_ROUTER_TESTING_PROVIDERS,
        provideLocationMocks(),
        withPreloading(NoPreloading).ɵproviders,
        { provide: ROUTES, multi: true, useValue: [] },
    ], imports: [RouterModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.0.4+sha-d768fb7", ngImport: i0, type: RouterTestingModule, decorators: [{
            type: NgModule,
            args: [{
                    exports: [RouterModule],
                    providers: [
                        ROUTER_PROVIDERS,
                        EXTRA_ROUTER_TESTING_PROVIDERS,
                        provideLocationMocks(),
                        withPreloading(NoPreloading).ɵproviders,
                        { provide: ROUTES, multi: true, useValue: [] },
                    ]
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Rlc3RpbmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3Rlc3Rpbmcvc3JjL3JvdXRlcl90ZXN0aW5nX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDekMsT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDN0QsT0FBTyxFQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUF1QixRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDeEYsT0FBTyxFQUFDLHNCQUFzQixFQUFnQixZQUFZLEVBQVMsTUFBTSxFQUFFLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxNQUFNLEVBQVUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLGFBQWEsRUFBdUIsaUJBQWlCLElBQUksZ0JBQWdCLEVBQUUsZUFBZSxJQUFJLGNBQWMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRTVULE9BQU8sRUFBQyw4QkFBOEIsRUFBQyxNQUFNLGtDQUFrQyxDQUFDOztBQUVoRixTQUFTLHFCQUFxQixDQUFDLElBQ21CO0lBQ2hELGlHQUFpRztJQUNqRyxXQUFXO0lBQ1gsT0FBTyxrQkFBa0IsSUFBSSxJQUFJLENBQUM7QUFDcEMsQ0FBQztBQUVELFNBQVMsdUJBQXVCLENBQUMsU0FBaUI7SUFDaEQsTUFBTSxJQUFJLEtBQUssQ0FDWCxhQUFhLFNBQVMscURBQXFEO1FBQzNFLGtHQUFrRyxDQUFDLENBQUM7QUFDMUcsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsa0JBQWtCLENBQzlCLGFBQTRCLEVBQUUsUUFBZ0MsRUFBRSxRQUFrQixFQUNsRixRQUFrQixFQUFFLFFBQWtCLEVBQUUsTUFBaUIsRUFDekQsSUFBNEMsRUFB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QUM7b0JBQ3ZCLFNBQVMsRUFBRTt3QkFDVCxnQkFBZ0I7d0JBQ2hCLDhCQUE4Qjt3QkFDOUIsb0JBQW9CLEVBQUU7d0JBQ3RCLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxVQUFVO3dCQUN2QyxFQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFDO3FCQUM3QztpQkFDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtwcm92aWRlTG9jYXRpb25Nb2Nrc30gZnJvbSAnQGFuZ3VsYXIvY29tbW9uL3Rlc3RpbmcnO1xuaW1wb3J0IHtDb21waWxlciwgaW5qZWN0LCBJbmplY3RvciwgTW9kdWxlV2l0aFByb3ZpZGVycywgTmdNb2R1bGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzLCBFeHRyYU9wdGlvbnMsIE5vUHJlbG9hZGluZywgUm91dGUsIFJvdXRlciwgUk9VVEVSX0NPTkZJR1VSQVRJT04sIFJvdXRlUmV1c2VTdHJhdGVneSwgUm91dGVyTW9kdWxlLCBST1VURVMsIFJvdXRlcywgVGl0bGVTdHJhdGVneSwgVXJsSGFuZGxpbmdTdHJhdGVneSwgVXJsU2VyaWFsaXplciwgybVmbGF0dGVuIGFzIGZsYXR0ZW4sIMm1Uk9VVEVSX1BST1ZJREVSUyBhcyBST1VURVJfUFJPVklERVJTLCDJtXdpdGhQcmVsb2FkaW5nIGFzIHdpdGhQcmVsb2FkaW5nfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xuXG5pbXBvcnQge0VYVFJBX1JPVVRFUl9URVNUSU5HX1BST1ZJREVSU30gZnJvbSAnLi9leHRyYV9yb3V0ZXJfdGVzdGluZ19wcm92aWRlcnMnO1xuXG5mdW5jdGlvbiBpc1VybEhhbmRsaW5nU3RyYXRlZ3kob3B0czogRXh0cmFPcHRpb25zfFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFVybEhhbmRsaW5nU3RyYXRlZ3kpOiBvcHRzIGlzIFVybEhhbmRsaW5nU3RyYXRlZ3kge1xuICAvLyBUaGlzIHByb3BlcnR5IGNoZWNrIGlzIG5lZWRlZCBiZWNhdXNlIFVybEhhbmRsaW5nU3RyYXRlZ3kgaXMgYW4gaW50ZXJmYWNlIGFuZCBkb2Vzbid0IGV4aXN0IGF0XG4gIC8vIHJ1bnRpbWUuXG4gIHJldHVybiAnc2hvdWxkUHJvY2Vzc1VybCcgaW4gb3B0cztcbn1cblxuZnVuY3Rpb24gdGhyb3dJbnZhbGlkQ29uZmlnRXJyb3IocGFyYW1ldGVyOiBzdHJpbmcpOiBuZXZlciB7XG4gIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBQYXJhbWV0ZXIgJHtwYXJhbWV0ZXJ9IGRvZXMgbm90IG1hdGNoIHRoZSBvbmUgYXZhaWxhYmxlIGluIHRoZSBpbmplY3Rvci4gYCArXG4gICAgICAnYHNldHVwVGVzdGluZ1JvdXRlcmAgaXMgbWVhbnQgdG8gYmUgdXNlZCBhcyBhIGZhY3RvcnkgZnVuY3Rpb24gd2l0aCBkZXBlbmRlbmNpZXMgY29taW5nIGZyb20gREkuJyk7XG59XG5cbi8qKlxuICogUm91dGVyIHNldHVwIGZhY3RvcnkgZnVuY3Rpb24gdXNlZCBmb3IgdGVzdGluZy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cFRlc3RpbmdSb3V0ZXIoXG4gICAgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgY29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIGxvY2F0aW9uOiBMb2NhdGlvbixcbiAgICBjb21waWxlcjogQ29tcGlsZXIsIGluamVjdG9yOiBJbmplY3Rvciwgcm91dGVzOiBSb3V0ZVtdW10sXG4gICAgb3B0cz86IEV4dHJhT3B0aW9uc3xVcmxIYW5kbGluZ1N0cmF0ZWd5fG51bGwsIHVybEhhbmRsaW5nU3RyYXRlZ3k/OiBVcmxIYW5kbGluZ1N0cmF0ZWd5LFxuICAgIHJvdXRlUmV1c2VTdHJhdGVneT86IFJvdXRlUmV1c2VTdHJhdGVneSwgdGl0bGVTdHJhdGVneT86IFRpdGxlU3RyYXRlZ3kpIHtcbiAgLy8gTm90ZTogVGhlIGNoZWNrcyBiZWxvdyBhcmUgdG8gZGV0ZWN0IG1pc2NvbmZpZ3VyZWQgcHJvdmlkZXJzIGFuZCBpbnZhbGlkIHVzZXMgb2ZcbiAgLy8gYHNldHVwVGVzdGluZ1JvdXRlcmAuIFRoaXMgZnVuY3Rpb24gaXMgbm90IHVzZWQgaW50ZXJuYWxseSAobmVpdGhlciBpbiByb3V0ZXIgY29kZSBvciBhbnl3aGVyZVxuICAvLyBpbiBnMykuIEl0IGFwcGVhcnMgdGhpcyBmdW5jdGlvbiB3YXMgZXhwb3NlZCBhcyBwdWJsaWNBcGkgYnkgbWlzdGFrZSBhbmQgc2hvdWxkIG5vdCBiZSB1c2VkXG4gIC8vIGV4dGVybmFsbHkgZWl0aGVyLiBIb3dldmVyLCBpZiBpdCBpcywgdGhlIGRvY3VtZW50ZWQgaW50ZW50IGlzIHRvIGJlIHVzZWQgYXMgYSBmYWN0b3J5IGZ1bmN0aW9uXG4gIC8vIGFuZCBwYXJhbWV0ZXIgdmFsdWVzIHNob3VsZCBhbHdheXMgbWF0Y2ggd2hhdCdzIGF2YWlsYWJsZSBpbiBESS5cbiAgaWYgKHVybFNlcmlhbGl6ZXIgIT09IGluamVjdChVcmxTZXJpYWxpemVyKSkge1xuICAgIHRocm93SW52YWxpZENvbmZpZ0Vycm9yKCd1cmxTZXJpYWxpemVyJyk7XG4gIH1cbiAgaWYgKGNvbnRleHRzICE9PSBpbmplY3QoQ2hpbGRyZW5PdXRsZXRDb250ZXh0cykpIHtcbiAgICB0aHJvd0ludmFsaWRDb25maWdFcnJvcignY29udGV4dHMnKTtcbiAgfVxuICBpZiAobG9jYXRpb24gIT09IGluamVjdChMb2NhdGlvbikpIHtcbiAgICB0aHJvd0ludmFsaWRDb25maWdFcnJvcignbG9jYXRpb24nKTtcbiAgfVxuICBpZiAoY29tcGlsZXIgIT09IGluamVjdChDb21waWxlcikpIHtcbiAgICB0aHJvd0ludmFsaWRDb25maWdFcnJvcignY29tcGlsZXInKTtcbiAgfVxuICBpZiAoaW5qZWN0b3IgIT09IGluamVjdChJbmplY3RvcikpIHtcbiAgICB0aHJvd0ludmFsaWRDb25maWdFcnJvcignaW5qZWN0b3InKTtcbiAgfVxuICBpZiAocm91dGVzICE9PSBpbmplY3QoUk9VVEVTKSkge1xuICAgIHRocm93SW52YWxpZENvbmZpZ0Vycm9yKCdyb3V0ZXMnKTtcbiAgfVxuICBpZiAob3B0cykge1xuICAgIC8vIEhhbmRsZSBkZXByZWNhdGVkIGFyZ3VtZW50IG9yZGVyaW5nLlxuICAgIGlmIChpc1VybEhhbmRsaW5nU3RyYXRlZ3kob3B0cykpIHtcbiAgICAgIGlmIChvcHRzICE9PSBpbmplY3QoVXJsSGFuZGxpbmdTdHJhdGVneSkpIHtcbiAgICAgICAgdGhyb3dJbnZhbGlkQ29uZmlnRXJyb3IoJ29wdHMgKFVybEhhbmRsaW5nU3RyYXRlZ3kpJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvcHRzICE9PSBpbmplY3QoUk9VVEVSX0NPTkZJR1VSQVRJT04pKSB7XG4gICAgICAgIHRocm93SW52YWxpZENvbmZpZ0Vycm9yKCdvcHRzIChST1VURVJfQ09ORklHVVJBVElPTiknKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAodXJsSGFuZGxpbmdTdHJhdGVneSAhPT0gaW5qZWN0KFVybEhhbmRsaW5nU3RyYXRlZ3kpKSB7XG4gICAgdGhyb3dJbnZhbGlkQ29uZmlnRXJyb3IoJ3VybEhhbmRsaW5nU3RyYXRlZ3knKTtcbiAgfVxuXG4gIGlmIChyb3V0ZVJldXNlU3RyYXRlZ3kgIT09IGluamVjdChSb3V0ZVJldXNlU3RyYXRlZ3kpKSB7XG4gICAgdGhyb3dJbnZhbGlkQ29uZmlnRXJyb3IoJ3JvdXRlUmV1c2VTdHJhdGVneScpO1xuICB9XG5cbiAgaWYgKHRpdGxlU3RyYXRlZ3kgIT09IGluamVjdChUaXRsZVN0cmF0ZWd5KSkge1xuICAgIHRocm93SW52YWxpZENvbmZpZ0Vycm9yKCd0aXRsZVN0cmF0ZWd5Jyk7XG4gIH1cblxuICByZXR1cm4gbmV3IFJvdXRlcigpO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFNldHMgdXAgdGhlIHJvdXRlciB0byBiZSB1c2VkIGZvciB0ZXN0aW5nLlxuICpcbiAqIFRoZSBtb2R1bGVzIHNldHMgdXAgdGhlIHJvdXRlciB0byBiZSB1c2VkIGZvciB0ZXN0aW5nLlxuICogSXQgcHJvdmlkZXMgc3B5IGltcGxlbWVudGF0aW9ucyBvZiBgTG9jYXRpb25gIGFuZCBgTG9jYXRpb25TdHJhdGVneWAuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqICMjIyBFeGFtcGxlXG4gKlxuICogYGBgXG4gKiBiZWZvcmVFYWNoKCgpID0+IHtcbiAqICAgVGVzdEJlZC5jb25maWd1cmVUZXN0aW5nTW9kdWxlKHtcbiAqICAgICBpbXBvcnRzOiBbXG4gKiAgICAgICBSb3V0ZXJUZXN0aW5nTW9kdWxlLndpdGhSb3V0ZXMoXG4gKiAgICAgICAgIFt7cGF0aDogJycsIGNvbXBvbmVudDogQmxhbmtDbXB9LCB7cGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wfV1cbiAqICAgICAgIClcbiAqICAgICBdXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBOZ01vZHVsZSh7XG4gIGV4cG9ydHM6IFtSb3V0ZXJNb2R1bGVdLFxuICBwcm92aWRlcnM6IFtcbiAgICBST1VURVJfUFJPVklERVJTLFxuICAgIEVYVFJBX1JPVVRFUl9URVNUSU5HX1BST1ZJREVSUyxcbiAgICBwcm92aWRlTG9jYXRpb25Nb2NrcygpLFxuICAgIHdpdGhQcmVsb2FkaW5nKE5vUHJlbG9hZGluZykuybVwcm92aWRlcnMsXG4gICAge3Byb3ZpZGU6IFJPVVRFUywgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiBbXX0sXG4gIF1cbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyVGVzdGluZ01vZHVsZSB7XG4gIHN0YXRpYyB3aXRoUm91dGVzKHJvdXRlczogUm91dGVzLCBjb25maWc/OiBFeHRyYU9wdGlvbnMpOlxuICAgICAgTW9kdWxlV2l0aFByb3ZpZGVyczxSb3V0ZXJUZXN0aW5nTW9kdWxlPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5nTW9kdWxlOiBSb3V0ZXJUZXN0aW5nTW9kdWxlLFxuICAgICAgcHJvdmlkZXJzOiBbXG4gICAgICAgIHtwcm92aWRlOiBST1VURVMsIG11bHRpOiB0cnVlLCB1c2VWYWx1ZTogcm91dGVzfSxcbiAgICAgICAge3Byb3ZpZGU6IFJPVVRFUl9DT05GSUdVUkFUSU9OLCB1c2VWYWx1ZTogY29uZmlnID8gY29uZmlnIDoge319LFxuICAgICAgXVxuICAgIH07XG4gIH1cbn1cbiJdfQ==