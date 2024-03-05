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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.2.3+sha-6148d76", ngImport: i0, type: RouterTestingModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "17.2.3+sha-6148d76", ngImport: i0, type: RouterTestingModule, exports: [RouterModule] }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "17.2.3+sha-6148d76", ngImport: i0, type: RouterTestingModule, providers: [
            ROUTER_PROVIDERS,
            provideLocationMocks(),
            withPreloading(NoPreloading).ɵproviders,
            { provide: ROUTES, multi: true, useValue: [] },
        ], imports: [RouterModule] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.2.3+sha-6148d76", ngImport: i0, type: RouterTestingModule, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Rlc3RpbmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3Rlc3Rpbmcvc3JjL3JvdXRlcl90ZXN0aW5nX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFTQSxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUM3RCxPQUFPLEVBQWtELFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN4RixPQUFPLEVBR0wsWUFBWSxFQUdaLG9CQUFvQixFQUVwQixZQUFZLEVBQ1osTUFBTSxFQUtOLGNBQWMsRUFDZCxpQkFBaUIsSUFBSSxnQkFBZ0IsR0FDdEMsTUFBTSxpQkFBaUIsQ0FBQzs7QUFFekIsU0FBUyxxQkFBcUIsQ0FDNUIsSUFBd0M7SUFFeEMsaUdBQWlHO0lBQ2pHLFdBQVc7SUFDWCxPQUFPLGtCQUFrQixJQUFJLElBQUksQ0FBQztBQUNwQyxDQUFDO0FBRUQsU0FBUyx1QkFBdUIsQ0FBQyxTQUFpQjtJQUNoRCxNQUFNLElBQUksS0FBSyxDQUNiLGFBQWEsU0FBUyxxREFBcUQ7UUFDekUsa0dBQWtHLENBQ3JHLENBQUM7QUFDSixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXdCRztBQVVILE1BQU0sT0FBTyxtQkFBbUI7SUFDOUIsTUFBTSxDQUFDLFVBQVUsQ0FDZixNQUFjLEVBQ2QsTUFBcUI7UUFFckIsT0FBTztZQUNMLFFBQVEsRUFBRSxtQkFBbUI7WUFDN0IsU0FBUyxFQUFFO2dCQUNULEVBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUM7Z0JBQ2hELEVBQUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDO2FBQ2hFO1NBQ0YsQ0FBQztJQUNKLENBQUM7eUhBWlUsbUJBQW1COzBIQUFuQixtQkFBbUIsWUFScEIsWUFBWTswSEFRWCxtQkFBbUIsYUFQbkI7WUFDVCxnQkFBZ0I7WUFDaEIsb0JBQW9CLEVBQUU7WUFDdEIsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLFVBQVU7WUFDdkMsRUFBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBQztTQUM3QyxZQU5TLFlBQVk7O3NHQVFYLG1CQUFtQjtrQkFUL0IsUUFBUTttQkFBQztvQkFDUixPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUM7b0JBQ3ZCLFNBQVMsRUFBRTt3QkFDVCxnQkFBZ0I7d0JBQ2hCLG9CQUFvQixFQUFFO3dCQUN0QixjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsVUFBVTt3QkFDdkMsRUFBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBQztxQkFDN0M7aUJBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7cHJvdmlkZUxvY2F0aW9uTW9ja3N9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbi90ZXN0aW5nJztcbmltcG9ydCB7Q29tcGlsZXIsIGluamVjdCwgSW5qZWN0b3IsIE1vZHVsZVdpdGhQcm92aWRlcnMsIE5nTW9kdWxlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7XG4gIENoaWxkcmVuT3V0bGV0Q29udGV4dHMsXG4gIEV4dHJhT3B0aW9ucyxcbiAgTm9QcmVsb2FkaW5nLFxuICBSb3V0ZSxcbiAgUm91dGVyLFxuICBST1VURVJfQ09ORklHVVJBVElPTixcbiAgUm91dGVSZXVzZVN0cmF0ZWd5LFxuICBSb3V0ZXJNb2R1bGUsXG4gIFJPVVRFUyxcbiAgUm91dGVzLFxuICBUaXRsZVN0cmF0ZWd5LFxuICBVcmxIYW5kbGluZ1N0cmF0ZWd5LFxuICBVcmxTZXJpYWxpemVyLFxuICB3aXRoUHJlbG9hZGluZyxcbiAgybVST1VURVJfUFJPVklERVJTIGFzIFJPVVRFUl9QUk9WSURFUlMsXG59IGZyb20gJ0Bhbmd1bGFyL3JvdXRlcic7XG5cbmZ1bmN0aW9uIGlzVXJsSGFuZGxpbmdTdHJhdGVneShcbiAgb3B0czogRXh0cmFPcHRpb25zIHwgVXJsSGFuZGxpbmdTdHJhdGVneSxcbik6IG9wdHMgaXMgVXJsSGFuZGxpbmdTdHJhdGVneSB7XG4gIC8vIFRoaXMgcHJvcGVydHkgY2hlY2sgaXMgbmVlZGVkIGJlY2F1c2UgVXJsSGFuZGxpbmdTdHJhdGVneSBpcyBhbiBpbnRlcmZhY2UgYW5kIGRvZXNuJ3QgZXhpc3QgYXRcbiAgLy8gcnVudGltZS5cbiAgcmV0dXJuICdzaG91bGRQcm9jZXNzVXJsJyBpbiBvcHRzO1xufVxuXG5mdW5jdGlvbiB0aHJvd0ludmFsaWRDb25maWdFcnJvcihwYXJhbWV0ZXI6IHN0cmluZyk6IG5ldmVyIHtcbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgIGBQYXJhbWV0ZXIgJHtwYXJhbWV0ZXJ9IGRvZXMgbm90IG1hdGNoIHRoZSBvbmUgYXZhaWxhYmxlIGluIHRoZSBpbmplY3Rvci4gYCArXG4gICAgICAnYHNldHVwVGVzdGluZ1JvdXRlcmAgaXMgbWVhbnQgdG8gYmUgdXNlZCBhcyBhIGZhY3RvcnkgZnVuY3Rpb24gd2l0aCBkZXBlbmRlbmNpZXMgY29taW5nIGZyb20gREkuJyxcbiAgKTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBTZXRzIHVwIHRoZSByb3V0ZXIgdG8gYmUgdXNlZCBmb3IgdGVzdGluZy5cbiAqXG4gKiBUaGUgbW9kdWxlcyBzZXRzIHVwIHRoZSByb3V0ZXIgdG8gYmUgdXNlZCBmb3IgdGVzdGluZy5cbiAqIEl0IHByb3ZpZGVzIHNweSBpbXBsZW1lbnRhdGlvbnMgb2YgYExvY2F0aW9uYCBhbmQgYExvY2F0aW9uU3RyYXRlZ3lgLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYFxuICogYmVmb3JlRWFjaCgoKSA9PiB7XG4gKiAgIFRlc3RCZWQuY29uZmlndXJlVGVzdGluZ01vZHVsZSh7XG4gKiAgICAgaW1wb3J0czogW1xuICogICAgICAgUm91dGVyTW9kdWxlLmZvclJvb3QoXG4gKiAgICAgICAgIFt7cGF0aDogJycsIGNvbXBvbmVudDogQmxhbmtDbXB9LCB7cGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wfV1cbiAqICAgICAgIClcbiAqICAgICBdXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBOZ01vZHVsZSh7XG4gIGV4cG9ydHM6IFtSb3V0ZXJNb2R1bGVdLFxuICBwcm92aWRlcnM6IFtcbiAgICBST1VURVJfUFJPVklERVJTLFxuICAgIHByb3ZpZGVMb2NhdGlvbk1vY2tzKCksXG4gICAgd2l0aFByZWxvYWRpbmcoTm9QcmVsb2FkaW5nKS7JtXByb3ZpZGVycyxcbiAgICB7cHJvdmlkZTogUk9VVEVTLCBtdWx0aTogdHJ1ZSwgdXNlVmFsdWU6IFtdfSxcbiAgXSxcbn0pXG5leHBvcnQgY2xhc3MgUm91dGVyVGVzdGluZ01vZHVsZSB7XG4gIHN0YXRpYyB3aXRoUm91dGVzKFxuICAgIHJvdXRlczogUm91dGVzLFxuICAgIGNvbmZpZz86IEV4dHJhT3B0aW9ucyxcbiAgKTogTW9kdWxlV2l0aFByb3ZpZGVyczxSb3V0ZXJUZXN0aW5nTW9kdWxlPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5nTW9kdWxlOiBSb3V0ZXJUZXN0aW5nTW9kdWxlLFxuICAgICAgcHJvdmlkZXJzOiBbXG4gICAgICAgIHtwcm92aWRlOiBST1VURVMsIG11bHRpOiB0cnVlLCB1c2VWYWx1ZTogcm91dGVzfSxcbiAgICAgICAge3Byb3ZpZGU6IFJPVVRFUl9DT05GSUdVUkFUSU9OLCB1c2VWYWx1ZTogY29uZmlnID8gY29uZmlnIDoge319LFxuICAgICAgXSxcbiAgICB9O1xuICB9XG59XG4iXX0=