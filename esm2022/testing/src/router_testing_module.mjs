import { provideLocationMocks } from '@angular/common/testing';
import { NgModule } from '@angular/core';
import { NoPreloading, ROUTER_CONFIGURATION, RouterModule, ROUTES, withPreloading, ɵROUTER_PROVIDERS as ROUTER_PROVIDERS, } from '@angular/router';
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
 * @deprecated Use `provideRouter` or `RouterModule`/`RouterModule.forRoot` instead.
 * This module was previously used to provide a helpful collection of test fakes,
 * most notably those for `Location` and `LocationStrategy`.  These are generally not
 * required anymore, as `MockPlatformLocation` is provided in `TestBed` by default.
 * However, you can use them directly with `provideLocationMocks`.
 */
export class RouterTestingModule {
    static withRoutes(routes, config) {
        return {
            ngModule: RouterTestingModule,
            providers: [
                { provide: ROUTES, multi: true, useValue: routes },
                { provide: ROUTER_CONFIGURATION, useValue: config ? config : {} },
            ],
        };
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: RouterTestingModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: RouterTestingModule, exports: [RouterModule] }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: RouterTestingModule, providers: [
            ROUTER_PROVIDERS,
            provideLocationMocks(),
            withPreloading(NoPreloading).ɵproviders,
            { provide: ROUTES, multi: true, useValue: [] },
        ], imports: [RouterModule] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "19.0.0-next.0+sha-f271021", ngImport: i0, type: RouterTestingModule, decorators: [{
            type: NgModule,
            args: [{
                    exports: [RouterModule],
                    providers: [
                        ROUTER_PROVIDERS,
                        provideLocationMocks(),
                        withPreloading(NoPreloading).ɵproviders,
                        { provide: ROUTES, multi: true, useValue: [] },
                    ],
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Rlc3RpbmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3Rlc3Rpbmcvc3JjL3JvdXRlcl90ZXN0aW5nX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFTQSxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUM3RCxPQUFPLEVBQWtELFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN4RixPQUFPLEVBR0wsWUFBWSxFQUdaLG9CQUFvQixFQUVwQixZQUFZLEVBQ1osTUFBTSxFQUtOLGNBQWMsRUFDZCxpQkFBaUIsSUFBSSxnQkFBZ0IsR0FDdEMsTUFBTSxpQkFBaUIsQ0FBQzs7QUFFekIsU0FBUyxxQkFBcUIsQ0FDNUIsSUFBd0M7SUFFeEMsaUdBQWlHO0lBQ2pHLFdBQVc7SUFDWCxPQUFPLGtCQUFrQixJQUFJLElBQUksQ0FBQztBQUNwQyxDQUFDO0FBRUQsU0FBUyx1QkFBdUIsQ0FBQyxTQUFpQjtJQUNoRCxNQUFNLElBQUksS0FBSyxDQUNiLGFBQWEsU0FBUyxxREFBcUQ7UUFDekUsa0dBQWtHLENBQ3JHLENBQUM7QUFDSixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBNkJHO0FBVUgsTUFBTSxPQUFPLG1CQUFtQjtJQUM5QixNQUFNLENBQUMsVUFBVSxDQUNmLE1BQWMsRUFDZCxNQUFxQjtRQUVyQixPQUFPO1lBQ0wsUUFBUSxFQUFFLG1CQUFtQjtZQUM3QixTQUFTLEVBQUU7Z0JBQ1QsRUFBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBQztnQkFDaEQsRUFBQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUM7YUFDaEU7U0FDRixDQUFDO0lBQ0osQ0FBQzt5SEFaVSxtQkFBbUI7MEhBQW5CLG1CQUFtQixZQVJwQixZQUFZOzBIQVFYLG1CQUFtQixhQVBuQjtZQUNULGdCQUFnQjtZQUNoQixvQkFBb0IsRUFBRTtZQUN0QixjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsVUFBVTtZQUN2QyxFQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFDO1NBQzdDLFlBTlMsWUFBWTs7c0dBUVgsbUJBQW1CO2tCQVQvQixRQUFRO21CQUFDO29CQUNSLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQztvQkFDdkIsU0FBUyxFQUFFO3dCQUNULGdCQUFnQjt3QkFDaEIsb0JBQW9CLEVBQUU7d0JBQ3RCLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxVQUFVO3dCQUN2QyxFQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFDO3FCQUM3QztpQkFDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtwcm92aWRlTG9jYXRpb25Nb2Nrc30gZnJvbSAnQGFuZ3VsYXIvY29tbW9uL3Rlc3RpbmcnO1xuaW1wb3J0IHtDb21waWxlciwgaW5qZWN0LCBJbmplY3RvciwgTW9kdWxlV2l0aFByb3ZpZGVycywgTmdNb2R1bGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtcbiAgQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyxcbiAgRXh0cmFPcHRpb25zLFxuICBOb1ByZWxvYWRpbmcsXG4gIFJvdXRlLFxuICBSb3V0ZXIsXG4gIFJPVVRFUl9DT05GSUdVUkFUSU9OLFxuICBSb3V0ZVJldXNlU3RyYXRlZ3ksXG4gIFJvdXRlck1vZHVsZSxcbiAgUk9VVEVTLFxuICBSb3V0ZXMsXG4gIFRpdGxlU3RyYXRlZ3ksXG4gIFVybEhhbmRsaW5nU3RyYXRlZ3ksXG4gIFVybFNlcmlhbGl6ZXIsXG4gIHdpdGhQcmVsb2FkaW5nLFxuICDJtVJPVVRFUl9QUk9WSURFUlMgYXMgUk9VVEVSX1BST1ZJREVSUyxcbn0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcblxuZnVuY3Rpb24gaXNVcmxIYW5kbGluZ1N0cmF0ZWd5KFxuICBvcHRzOiBFeHRyYU9wdGlvbnMgfCBVcmxIYW5kbGluZ1N0cmF0ZWd5LFxuKTogb3B0cyBpcyBVcmxIYW5kbGluZ1N0cmF0ZWd5IHtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBjaGVjayBpcyBuZWVkZWQgYmVjYXVzZSBVcmxIYW5kbGluZ1N0cmF0ZWd5IGlzIGFuIGludGVyZmFjZSBhbmQgZG9lc24ndCBleGlzdCBhdFxuICAvLyBydW50aW1lLlxuICByZXR1cm4gJ3Nob3VsZFByb2Nlc3NVcmwnIGluIG9wdHM7XG59XG5cbmZ1bmN0aW9uIHRocm93SW52YWxpZENvbmZpZ0Vycm9yKHBhcmFtZXRlcjogc3RyaW5nKTogbmV2ZXIge1xuICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgYFBhcmFtZXRlciAke3BhcmFtZXRlcn0gZG9lcyBub3QgbWF0Y2ggdGhlIG9uZSBhdmFpbGFibGUgaW4gdGhlIGluamVjdG9yLiBgICtcbiAgICAgICdgc2V0dXBUZXN0aW5nUm91dGVyYCBpcyBtZWFudCB0byBiZSB1c2VkIGFzIGEgZmFjdG9yeSBmdW5jdGlvbiB3aXRoIGRlcGVuZGVuY2llcyBjb21pbmcgZnJvbSBESS4nLFxuICApO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFNldHMgdXAgdGhlIHJvdXRlciB0byBiZSB1c2VkIGZvciB0ZXN0aW5nLlxuICpcbiAqIFRoZSBtb2R1bGVzIHNldHMgdXAgdGhlIHJvdXRlciB0byBiZSB1c2VkIGZvciB0ZXN0aW5nLlxuICogSXQgcHJvdmlkZXMgc3B5IGltcGxlbWVudGF0aW9ucyBvZiBgTG9jYXRpb25gIGFuZCBgTG9jYXRpb25TdHJhdGVneWAuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqICMjIyBFeGFtcGxlXG4gKlxuICogYGBgXG4gKiBiZWZvcmVFYWNoKCgpID0+IHtcbiAqICAgVGVzdEJlZC5jb25maWd1cmVUZXN0aW5nTW9kdWxlKHtcbiAqICAgICBpbXBvcnRzOiBbXG4gKiAgICAgICBSb3V0ZXJNb2R1bGUuZm9yUm9vdChcbiAqICAgICAgICAgW3twYXRoOiAnJywgY29tcG9uZW50OiBCbGFua0NtcH0sIHtwYXRoOiAnc2ltcGxlJywgY29tcG9uZW50OiBTaW1wbGVDbXB9XVxuICogICAgICAgKVxuICogICAgIF1cbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqIEBkZXByZWNhdGVkIFVzZSBgcHJvdmlkZVJvdXRlcmAgb3IgYFJvdXRlck1vZHVsZWAvYFJvdXRlck1vZHVsZS5mb3JSb290YCBpbnN0ZWFkLlxuICogVGhpcyBtb2R1bGUgd2FzIHByZXZpb3VzbHkgdXNlZCB0byBwcm92aWRlIGEgaGVscGZ1bCBjb2xsZWN0aW9uIG9mIHRlc3QgZmFrZXMsXG4gKiBtb3N0IG5vdGFibHkgdGhvc2UgZm9yIGBMb2NhdGlvbmAgYW5kIGBMb2NhdGlvblN0cmF0ZWd5YC4gIFRoZXNlIGFyZSBnZW5lcmFsbHkgbm90XG4gKiByZXF1aXJlZCBhbnltb3JlLCBhcyBgTW9ja1BsYXRmb3JtTG9jYXRpb25gIGlzIHByb3ZpZGVkIGluIGBUZXN0QmVkYCBieSBkZWZhdWx0LlxuICogSG93ZXZlciwgeW91IGNhbiB1c2UgdGhlbSBkaXJlY3RseSB3aXRoIGBwcm92aWRlTG9jYXRpb25Nb2Nrc2AuXG4gKi9cbkBOZ01vZHVsZSh7XG4gIGV4cG9ydHM6IFtSb3V0ZXJNb2R1bGVdLFxuICBwcm92aWRlcnM6IFtcbiAgICBST1VURVJfUFJPVklERVJTLFxuICAgIHByb3ZpZGVMb2NhdGlvbk1vY2tzKCksXG4gICAgd2l0aFByZWxvYWRpbmcoTm9QcmVsb2FkaW5nKS7JtXByb3ZpZGVycyxcbiAgICB7cHJvdmlkZTogUk9VVEVTLCBtdWx0aTogdHJ1ZSwgdXNlVmFsdWU6IFtdfSxcbiAgXSxcbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyVGVzdGluZ01vZHVsZSB7XG4gIHN0YXRpYyB3aXRoUm91dGVzKFxuICAgIHJvdXRlczogUm91dGVzLFxuICAgIGNvbmZpZz86IEV4dHJhT3B0aW9ucyxcbiAgKTogTW9kdWxlV2l0aFByb3ZpZGVyczxSb3V0ZXJUZXN0aW5nTW9kdWxlPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5nTW9kdWxlOiBSb3V0ZXJUZXN0aW5nTW9kdWxlLFxuICAgICAgcHJvdmlkZXJzOiBbXG4gICAgICAgIHtwcm92aWRlOiBST1VURVMsIG11bHRpOiB0cnVlLCB1c2VWYWx1ZTogcm91dGVzfSxcbiAgICAgICAge3Byb3ZpZGU6IFJPVVRFUl9DT05GSUdVUkFUSU9OLCB1c2VWYWx1ZTogY29uZmlnID8gY29uZmlnIDoge319LFxuICAgICAgXSxcbiAgICB9O1xuICB9XG59XG4iXX0=