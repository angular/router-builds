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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.6+sha-70591e7", ngImport: i0, type: RouterTestingModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "18.2.6+sha-70591e7", ngImport: i0, type: RouterTestingModule, exports: [RouterModule] }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "18.2.6+sha-70591e7", ngImport: i0, type: RouterTestingModule, providers: [
            ROUTER_PROVIDERS,
            provideLocationMocks(),
            withPreloading(NoPreloading).ɵproviders,
            { provide: ROUTES, multi: true, useValue: [] },
        ], imports: [RouterModule] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.6+sha-70591e7", ngImport: i0, type: RouterTestingModule, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Rlc3RpbmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3Rlc3Rpbmcvc3JjL3JvdXRlcl90ZXN0aW5nX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFTQSxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUM3RCxPQUFPLEVBQWtELFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN4RixPQUFPLEVBR0wsWUFBWSxFQUdaLG9CQUFvQixFQUVwQixZQUFZLEVBQ1osTUFBTSxFQUtOLGNBQWMsRUFDZCxpQkFBaUIsSUFBSSxnQkFBZ0IsR0FDdEMsTUFBTSxpQkFBaUIsQ0FBQzs7QUFFekIsU0FBUyxxQkFBcUIsQ0FDNUIsSUFBd0M7SUFFeEMsaUdBQWlHO0lBQ2pHLFdBQVc7SUFDWCxPQUFPLGtCQUFrQixJQUFJLElBQUksQ0FBQztBQUNwQyxDQUFDO0FBRUQsU0FBUyx1QkFBdUIsQ0FBQyxTQUFpQjtJQUNoRCxNQUFNLElBQUksS0FBSyxDQUNiLGFBQWEsU0FBUyxxREFBcUQ7UUFDekUsa0dBQWtHLENBQ3JHLENBQUM7QUFDSixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBNkJHO0FBVUgsTUFBTSxPQUFPLG1CQUFtQjtJQUM5QixNQUFNLENBQUMsVUFBVSxDQUNmLE1BQWMsRUFDZCxNQUFxQjtRQUVyQixPQUFPO1lBQ0wsUUFBUSxFQUFFLG1CQUFtQjtZQUM3QixTQUFTLEVBQUU7Z0JBQ1QsRUFBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBQztnQkFDaEQsRUFBQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUM7YUFDaEU7U0FDRixDQUFDO0lBQ0osQ0FBQzt5SEFaVSxtQkFBbUI7MEhBQW5CLG1CQUFtQixZQVJwQixZQUFZOzBIQVFYLG1CQUFtQixhQVBuQjtZQUNULGdCQUFnQjtZQUNoQixvQkFBb0IsRUFBRTtZQUN0QixjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsVUFBVTtZQUN2QyxFQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFDO1NBQzdDLFlBTlMsWUFBWTs7c0dBUVgsbUJBQW1CO2tCQVQvQixRQUFRO21CQUFDO29CQUNSLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQztvQkFDdkIsU0FBUyxFQUFFO3dCQUNULGdCQUFnQjt3QkFDaEIsb0JBQW9CLEVBQUU7d0JBQ3RCLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxVQUFVO3dCQUN2QyxFQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFDO3FCQUM3QztpQkFDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmRldi9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7cHJvdmlkZUxvY2F0aW9uTW9ja3N9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbi90ZXN0aW5nJztcbmltcG9ydCB7Q29tcGlsZXIsIGluamVjdCwgSW5qZWN0b3IsIE1vZHVsZVdpdGhQcm92aWRlcnMsIE5nTW9kdWxlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7XG4gIENoaWxkcmVuT3V0bGV0Q29udGV4dHMsXG4gIEV4dHJhT3B0aW9ucyxcbiAgTm9QcmVsb2FkaW5nLFxuICBSb3V0ZSxcbiAgUm91dGVyLFxuICBST1VURVJfQ09ORklHVVJBVElPTixcbiAgUm91dGVSZXVzZVN0cmF0ZWd5LFxuICBSb3V0ZXJNb2R1bGUsXG4gIFJPVVRFUyxcbiAgUm91dGVzLFxuICBUaXRsZVN0cmF0ZWd5LFxuICBVcmxIYW5kbGluZ1N0cmF0ZWd5LFxuICBVcmxTZXJpYWxpemVyLFxuICB3aXRoUHJlbG9hZGluZyxcbiAgybVST1VURVJfUFJPVklERVJTIGFzIFJPVVRFUl9QUk9WSURFUlMsXG59IGZyb20gJ0Bhbmd1bGFyL3JvdXRlcic7XG5cbmZ1bmN0aW9uIGlzVXJsSGFuZGxpbmdTdHJhdGVneShcbiAgb3B0czogRXh0cmFPcHRpb25zIHwgVXJsSGFuZGxpbmdTdHJhdGVneSxcbik6IG9wdHMgaXMgVXJsSGFuZGxpbmdTdHJhdGVneSB7XG4gIC8vIFRoaXMgcHJvcGVydHkgY2hlY2sgaXMgbmVlZGVkIGJlY2F1c2UgVXJsSGFuZGxpbmdTdHJhdGVneSBpcyBhbiBpbnRlcmZhY2UgYW5kIGRvZXNuJ3QgZXhpc3QgYXRcbiAgLy8gcnVudGltZS5cbiAgcmV0dXJuICdzaG91bGRQcm9jZXNzVXJsJyBpbiBvcHRzO1xufVxuXG5mdW5jdGlvbiB0aHJvd0ludmFsaWRDb25maWdFcnJvcihwYXJhbWV0ZXI6IHN0cmluZyk6IG5ldmVyIHtcbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgIGBQYXJhbWV0ZXIgJHtwYXJhbWV0ZXJ9IGRvZXMgbm90IG1hdGNoIHRoZSBvbmUgYXZhaWxhYmxlIGluIHRoZSBpbmplY3Rvci4gYCArXG4gICAgICAnYHNldHVwVGVzdGluZ1JvdXRlcmAgaXMgbWVhbnQgdG8gYmUgdXNlZCBhcyBhIGZhY3RvcnkgZnVuY3Rpb24gd2l0aCBkZXBlbmRlbmNpZXMgY29taW5nIGZyb20gREkuJyxcbiAgKTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBTZXRzIHVwIHRoZSByb3V0ZXIgdG8gYmUgdXNlZCBmb3IgdGVzdGluZy5cbiAqXG4gKiBUaGUgbW9kdWxlcyBzZXRzIHVwIHRoZSByb3V0ZXIgdG8gYmUgdXNlZCBmb3IgdGVzdGluZy5cbiAqIEl0IHByb3ZpZGVzIHNweSBpbXBsZW1lbnRhdGlvbnMgb2YgYExvY2F0aW9uYCBhbmQgYExvY2F0aW9uU3RyYXRlZ3lgLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYFxuICogYmVmb3JlRWFjaCgoKSA9PiB7XG4gKiAgIFRlc3RCZWQuY29uZmlndXJlVGVzdGluZ01vZHVsZSh7XG4gKiAgICAgaW1wb3J0czogW1xuICogICAgICAgUm91dGVyTW9kdWxlLmZvclJvb3QoXG4gKiAgICAgICAgIFt7cGF0aDogJycsIGNvbXBvbmVudDogQmxhbmtDbXB9LCB7cGF0aDogJ3NpbXBsZScsIGNvbXBvbmVudDogU2ltcGxlQ21wfV1cbiAqICAgICAgIClcbiAqICAgICBdXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKiBAZGVwcmVjYXRlZCBVc2UgYHByb3ZpZGVSb3V0ZXJgIG9yIGBSb3V0ZXJNb2R1bGVgL2BSb3V0ZXJNb2R1bGUuZm9yUm9vdGAgaW5zdGVhZC5cbiAqIFRoaXMgbW9kdWxlIHdhcyBwcmV2aW91c2x5IHVzZWQgdG8gcHJvdmlkZSBhIGhlbHBmdWwgY29sbGVjdGlvbiBvZiB0ZXN0IGZha2VzLFxuICogbW9zdCBub3RhYmx5IHRob3NlIGZvciBgTG9jYXRpb25gIGFuZCBgTG9jYXRpb25TdHJhdGVneWAuICBUaGVzZSBhcmUgZ2VuZXJhbGx5IG5vdFxuICogcmVxdWlyZWQgYW55bW9yZSwgYXMgYE1vY2tQbGF0Zm9ybUxvY2F0aW9uYCBpcyBwcm92aWRlZCBpbiBgVGVzdEJlZGAgYnkgZGVmYXVsdC5cbiAqIEhvd2V2ZXIsIHlvdSBjYW4gdXNlIHRoZW0gZGlyZWN0bHkgd2l0aCBgcHJvdmlkZUxvY2F0aW9uTW9ja3NgLlxuICovXG5ATmdNb2R1bGUoe1xuICBleHBvcnRzOiBbUm91dGVyTW9kdWxlXSxcbiAgcHJvdmlkZXJzOiBbXG4gICAgUk9VVEVSX1BST1ZJREVSUyxcbiAgICBwcm92aWRlTG9jYXRpb25Nb2NrcygpLFxuICAgIHdpdGhQcmVsb2FkaW5nKE5vUHJlbG9hZGluZykuybVwcm92aWRlcnMsXG4gICAge3Byb3ZpZGU6IFJPVVRFUywgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiBbXX0sXG4gIF0sXG59KVxuZXhwb3J0IGNsYXNzIFJvdXRlclRlc3RpbmdNb2R1bGUge1xuICBzdGF0aWMgd2l0aFJvdXRlcyhcbiAgICByb3V0ZXM6IFJvdXRlcyxcbiAgICBjb25maWc/OiBFeHRyYU9wdGlvbnMsXG4gICk6IE1vZHVsZVdpdGhQcm92aWRlcnM8Um91dGVyVGVzdGluZ01vZHVsZT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuZ01vZHVsZTogUm91dGVyVGVzdGluZ01vZHVsZSxcbiAgICAgIHByb3ZpZGVyczogW1xuICAgICAgICB7cHJvdmlkZTogUk9VVEVTLCBtdWx0aTogdHJ1ZSwgdXNlVmFsdWU6IHJvdXRlc30sXG4gICAgICAgIHtwcm92aWRlOiBST1VURVJfQ09ORklHVVJBVElPTiwgdXNlVmFsdWU6IGNvbmZpZyA/IGNvbmZpZyA6IHt9fSxcbiAgICAgIF0sXG4gICAgfTtcbiAgfVxufVxuIl19