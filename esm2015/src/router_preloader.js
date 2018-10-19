/**
*@license
*Copyright Google Inc. All Rights Reserved.
*
*Use of this source code is governed by an MIT-style license that can be
*found in the LICENSE file at https://angular.io/license
*/
import * as tslib_1 from "tslib";
import { Compiler, Injectable, Injector, NgModuleFactoryLoader, NgModuleRef } from '@angular/core';
import { from, of } from 'rxjs';
import { catchError, concatMap, filter, map, mergeAll, mergeMap } from 'rxjs/operators';
import { NavigationEnd, RouteConfigLoadEnd, RouteConfigLoadStart } from './events';
import { Router } from './router';
import { RouterConfigLoader } from './router_config_loader';
/**
 * @description
 *
 * Provides a preloading strategy.
 *
 * @publicApi
 */
export class PreloadingStrategy {
}
/**
 * @description
 *
 * Provides a preloading strategy that preloads all modules as quickly as possible.
 *
 * ```
 * RouteModule.forRoot(ROUTES, {preloadingStrategy: PreloadAllModules})
 * ```
 *
 * @publicApi
 */
export class PreloadAllModules {
    preload(route, fn) {
        return fn().pipe(catchError(() => of(null)));
    }
}
/**
 * @description
 *
 * Provides a preloading strategy that does not preload any modules.
 *
 * This strategy is enabled by default.
 *
 * @publicApi
 */
export class NoPreloading {
    preload(route, fn) { return of(null); }
}
/**
 * The preloader optimistically loads all router configurations to
 * make navigations into lazily-loaded sections of the application faster.
 *
 * The preloader runs in the background. When the router bootstraps, the preloader
 * starts listening to all navigation events. After every such event, the preloader
 * will check if any configurations can be loaded lazily.
 *
 * If a route is protected by `canLoad` guards, the preloaded will not load it.
 *
 * @publicApi
 */
let RouterPreloader = class RouterPreloader {
    constructor(router, moduleLoader, compiler, injector, preloadingStrategy) {
        this.router = router;
        this.injector = injector;
        this.preloadingStrategy = preloadingStrategy;
        const onStartLoad = (r) => router.triggerEvent(new RouteConfigLoadStart(r));
        const onEndLoad = (r) => router.triggerEvent(new RouteConfigLoadEnd(r));
        this.loader = new RouterConfigLoader(moduleLoader, compiler, onStartLoad, onEndLoad);
    }
    setUpPreloading() {
        this.subscription =
            this.router.events
                .pipe(filter((e) => e instanceof NavigationEnd), concatMap(() => this.preload()))
                .subscribe(() => { });
    }
    preload() {
        const ngModule = this.injector.get(NgModuleRef);
        return this.processRoutes(ngModule, this.router.config);
    }
    // TODO(jasonaden): This class relies on code external to the class to call setUpPreloading. If
    // this hasn't been done, ngOnDestroy will fail as this.subscription will be undefined. This
    // should be refactored.
    ngOnDestroy() { this.subscription.unsubscribe(); }
    processRoutes(ngModule, routes) {
        const res = [];
        for (const route of routes) {
            // we already have the config loaded, just recurse
            if (route.loadChildren && !route.canLoad && route._loadedConfig) {
                const childConfig = route._loadedConfig;
                res.push(this.processRoutes(childConfig.module, childConfig.routes));
                // no config loaded, fetch the config
            }
            else if (route.loadChildren && !route.canLoad) {
                res.push(this.preloadConfig(ngModule, route));
                // recurse into children
            }
            else if (route.children) {
                res.push(this.processRoutes(ngModule, route.children));
            }
        }
        return from(res).pipe(mergeAll(), map((_) => void 0));
    }
    preloadConfig(ngModule, route) {
        return this.preloadingStrategy.preload(route, () => {
            const loaded$ = this.loader.load(ngModule.injector, route);
            return loaded$.pipe(mergeMap((config) => {
                route._loadedConfig = config;
                return this.processRoutes(config.module, config.routes);
            }));
        });
    }
};
RouterPreloader = tslib_1.__decorate([
    Injectable(),
    tslib_1.__metadata("design:paramtypes", [Router, NgModuleFactoryLoader, Compiler,
        Injector, PreloadingStrategy])
], RouterPreloader);
export { RouterPreloader };

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3ByZWxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX3ByZWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0VBTUU7O0FBRUYsT0FBTyxFQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLHFCQUFxQixFQUFFLFdBQVcsRUFBWSxNQUFNLGVBQWUsQ0FBQztBQUM1RyxPQUFPLEVBQTJCLElBQUksRUFBRSxFQUFFLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDekQsT0FBTyxFQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFHdEYsT0FBTyxFQUFRLGFBQWEsRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUN4RixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBRzFEOzs7Ozs7R0FNRztBQUNILE1BQU0sT0FBZ0Isa0JBQWtCO0NBRXZDO0FBRUQ7Ozs7Ozs7Ozs7R0FVRztBQUNILE1BQU0sT0FBTyxpQkFBaUI7SUFDNUIsT0FBTyxDQUFDLEtBQVksRUFBRSxFQUF5QjtRQUM3QyxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNoRCxDQUFDO0NBQ0Y7QUFFRDs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sT0FBTyxZQUFZO0lBQ3ZCLE9BQU8sQ0FBQyxLQUFZLEVBQUUsRUFBeUIsSUFBcUIsT0FBTyxFQUFFLENBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQ3hGO0FB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UUFDNUQsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7WUFDakQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMzRCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBMEIsRUFBRSxFQUFFO2dCQUMxRCxLQUFLLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQztnQkFDN0IsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFELENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRixDQUFBO0FBNURZLGVBQWU7SUFEM0IsVUFBVSxFQUFFOzZDQU9TLE1BQU0sRUFBZ0IscUJBQXFCLEVBQVksUUFBUTtRQUM3RCxRQUFRLEVBQThCLGtCQUFrQjtHQVBuRSxlQUFlLENBNEQzQjtTQTVEWSxlQUFlIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4qQGxpY2Vuc2VcbipDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbipcbipVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuKmZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiovXG5cbmltcG9ydCB7Q29tcGlsZXIsIEluamVjdGFibGUsIEluamVjdG9yLCBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIE5nTW9kdWxlUmVmLCBPbkRlc3Ryb3l9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBTdWJzY3JpcHRpb24sIGZyb20sIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NhdGNoRXJyb3IsIGNvbmNhdE1hcCwgZmlsdGVyLCBtYXAsIG1lcmdlQWxsLCBtZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0xvYWRlZFJvdXRlckNvbmZpZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtFdmVudCwgTmF2aWdhdGlvbkVuZCwgUm91dGVDb25maWdMb2FkRW5kLCBSb3V0ZUNvbmZpZ0xvYWRTdGFydH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJy4vcm91dGVyJztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIGEgcHJlbG9hZGluZyBzdHJhdGVneS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQcmVsb2FkaW5nU3RyYXRlZ3kge1xuICBhYnN0cmFjdCBwcmVsb2FkKHJvdXRlOiBSb3V0ZSwgZm46ICgpID0+IE9ic2VydmFibGU8YW55Pik6IE9ic2VydmFibGU8YW55Pjtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBQcm92aWRlcyBhIHByZWxvYWRpbmcgc3RyYXRlZ3kgdGhhdCBwcmVsb2FkcyBhbGwgbW9kdWxlcyBhcyBxdWlja2x5IGFzIHBvc3NpYmxlLlxuICpcbiAqIGBgYFxuICogUm91dGVNb2R1bGUuZm9yUm9vdChST1VURVMsIHtwcmVsb2FkaW5nU3RyYXRlZ3k6IFByZWxvYWRBbGxNb2R1bGVzfSlcbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFByZWxvYWRBbGxNb2R1bGVzIGltcGxlbWVudHMgUHJlbG9hZGluZ1N0cmF0ZWd5IHtcbiAgcHJlbG9hZChyb3V0ZTogUm91dGUsIGZuOiAoKSA9PiBPYnNlcnZhYmxlPGFueT4pOiBPYnNlcnZhYmxlPGFueT4ge1xuICAgIHJldHVybiBmbigpLnBpcGUoY2F0Y2hFcnJvcigoKSA9PiBvZiAobnVsbCkpKTtcbiAgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIGEgcHJlbG9hZGluZyBzdHJhdGVneSB0aGF0IGRvZXMgbm90IHByZWxvYWQgYW55IG1vZHVsZXMuXG4gKlxuICogVGhpcyBzdHJhdGVneSBpcyBlbmFibGVkIGJ5IGRlZmF1bHQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgTm9QcmVsb2FkaW5nIGltcGxlbWVudHMgUHJlbG9hZGluZ1N0cmF0ZWd5IHtcbiAgcHJlbG9hZChyb3V0ZTogUm91dGUsIGZuOiAoKSA9PiBPYnNlcnZhYmxlPGFueT4pOiBPYnNlcnZhYmxlPGFueT4geyByZXR1cm4gb2YgKG51bGwpOyB9XG59XG5cbi8qKlxuICogVGhlIHByZWxvYWRlciBvcHRpbWlzdGljYWxseSBsb2FkcyBhbGwgcm91dGVyIGNvbmZpZ3VyYXRpb25zIHRvXG4gKiBtYWtlIG5hdmlnYXRpb25zIGludG8gbGF6aWx5LWxvYWRlZCBzZWN0aW9ucyBvZiB0aGUgYXBwbGljYXRpb24gZmFzdGVyLlxuICpcbiAqIFRoZSBwcmVsb2FkZXIgcnVucyBpbiB0aGUgYmFja2dyb3VuZC4gV2hlbiB0aGUgcm91dGVyIGJvb3RzdHJhcHMsIHRoZSBwcmVsb2FkZXJcbiAqIHN0YXJ0cyBsaXN0ZW5pbmcgdG8gYWxsIG5hdmlnYXRpb24gZXZlbnRzLiBBZnRlciBldmVyeSBzdWNoIGV2ZW50LCB0aGUgcHJlbG9hZGVyXG4gKiB3aWxsIGNoZWNrIGlmIGFueSBjb25maWd1cmF0aW9ucyBjYW4gYmUgbG9hZGVkIGxhemlseS5cbiAqXG4gKiBJZiBhIHJvdXRlIGlzIHByb3RlY3RlZCBieSBgY2FuTG9hZGAgZ3VhcmRzLCB0aGUgcHJlbG9hZGVkIHdpbGwgbm90IGxvYWQgaXQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgUm91dGVyUHJlbG9hZGVyIGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgcHJpdmF0ZSBsb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcjtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgc3Vic2NyaXB0aW9uICE6IFN1YnNjcmlwdGlvbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsIG1vZHVsZUxvYWRlcjogTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBjb21waWxlcjogQ29tcGlsZXIsXG4gICAgICBwcml2YXRlIGluamVjdG9yOiBJbmplY3RvciwgcHJpdmF0ZSBwcmVsb2FkaW5nU3RyYXRlZ3k6IFByZWxvYWRpbmdTdHJhdGVneSkge1xuICAgIGNvbnN0IG9uU3RhcnRMb2FkID0gKHI6IFJvdXRlKSA9PiByb3V0ZXIudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRTdGFydChyKSk7XG4gICAgY29uc3Qgb25FbmRMb2FkID0gKHI6IFJvdXRlKSA9PiByb3V0ZXIudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRFbmQocikpO1xuXG4gICAgdGhpcy5sb2FkZXIgPSBuZXcgUm91dGVyQ29uZmlnTG9hZGVyKG1vZHVsZUxvYWRlciwgY29tcGlsZXIsIG9uU3RhcnRMb2FkLCBvbkVuZExvYWQpO1xuICB9XG5cbiAgc2V0VXBQcmVsb2FkaW5nKCk6IHZvaWQge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9uID1cbiAgICAgICAgdGhpcy5yb3V0ZXIuZXZlbnRzXG4gICAgICAgICAgICAucGlwZShmaWx0ZXIoKGU6IEV2ZW50KSA9PiBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCksIGNvbmNhdE1hcCgoKSA9PiB0aGlzLnByZWxvYWQoKSkpXG4gICAgICAgICAgICAuc3Vic2NyaWJlKCgpID0+IHt9KTtcbiAgfVxuXG4gIHByZWxvYWQoKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMuaW5qZWN0b3IuZ2V0KE5nTW9kdWxlUmVmKTtcbiAgICByZXR1cm4gdGhpcy5wcm9jZXNzUm91dGVzKG5nTW9kdWxlLCB0aGlzLnJvdXRlci5jb25maWcpO1xuICB9XG5cbiAgLy8gVE9ETyhqYXNvbmFkZW4pOiBUaGlzIGNsYXNzIHJlbGllcyBvbiBjb2RlIGV4dGVybmFsIHRvIHRoZSBjbGFzcyB0byBjYWxsIHNldFVwUHJlbG9hZGluZy4gSWZcbiAgLy8gdGhpcyBoYXNuJ3QgYmVlbiBkb25lLCBuZ09uRGVzdHJveSB3aWxsIGZhaWwgYXMgdGhpcy5zdWJzY3JpcHRpb24gd2lsbCBiZSB1bmRlZmluZWQuIFRoaXNcbiAgLy8gc2hvdWxkIGJlIHJlZmFjdG9yZWQuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQgeyB0aGlzLnN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpOyB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzUm91dGVzKG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+LCByb3V0ZXM6IFJvdXRlcyk6IE9ic2VydmFibGU8dm9pZD4ge1xuICAgIGNvbnN0IHJlczogT2JzZXJ2YWJsZTxhbnk+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHJvdXRlcykge1xuICAgICAgLy8gd2UgYWxyZWFkeSBoYXZlIHRoZSBjb25maWcgbG9hZGVkLCBqdXN0IHJlY3Vyc2VcbiAgICAgIGlmIChyb3V0ZS5sb2FkQ2hpbGRyZW4gJiYgIXJvdXRlLmNhbkxvYWQgJiYgcm91dGUuX2xvYWRlZENvbmZpZykge1xuICAgICAgICBjb25zdCBjaGlsZENvbmZpZyA9IHJvdXRlLl9sb2FkZWRDb25maWc7XG4gICAgICAgIHJlcy5wdXNoKHRoaXMucHJvY2Vzc1JvdXRlcyhjaGlsZENvbmZpZy5tb2R1bGUsIGNoaWxkQ29uZmlnLnJvdXRlcykpO1xuXG4gICAgICAgIC8vIG5vIGNvbmZpZyBsb2FkZWQsIGZldGNoIHRoZSBjb25maWdcbiAgICAgIH0gZWxzZSBpZiAocm91dGUubG9hZENoaWxkcmVuICYmICFyb3V0ZS5jYW5Mb2FkKSB7XG4gICAgICAgIHJlcy5wdXNoKHRoaXMucHJlbG9hZENvbmZpZyhuZ01vZHVsZSwgcm91dGUpKTtcblxuICAgICAgICAvLyByZWN1cnNlIGludG8gY2hpbGRyZW5cbiAgICAgIH0gZWxzZSBpZiAocm91dGUuY2hpbGRyZW4pIHtcbiAgICAgICAgcmVzLnB1c2godGhpcy5wcm9jZXNzUm91dGVzKG5nTW9kdWxlLCByb3V0ZS5jaGlsZHJlbikpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZnJvbShyZXMpLnBpcGUobWVyZ2VBbGwoKSwgbWFwKChfKSA9PiB2b2lkIDApKTtcbiAgfVxuXG4gIHByaXZhdGUgcHJlbG9hZENvbmZpZyhuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55Piwgcm91dGU6IFJvdXRlKTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMucHJlbG9hZGluZ1N0cmF0ZWd5LnByZWxvYWQocm91dGUsICgpID0+IHtcbiAgICAgIGNvbnN0IGxvYWRlZCQgPSB0aGlzLmxvYWRlci5sb2FkKG5nTW9kdWxlLmluamVjdG9yLCByb3V0ZSk7XG4gICAgICByZXR1cm4gbG9hZGVkJC5waXBlKG1lcmdlTWFwKChjb25maWc6IExvYWRlZFJvdXRlckNvbmZpZykgPT4ge1xuICAgICAgICByb3V0ZS5fbG9hZGVkQ29uZmlnID0gY29uZmlnO1xuICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzUm91dGVzKGNvbmZpZy5tb2R1bGUsIGNvbmZpZy5yb3V0ZXMpO1xuICAgICAgfSkpO1xuICAgIH0pO1xuICB9XG59XG4iXX0=