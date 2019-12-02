import { __values } from "tslib";
/**
*@license
*Copyright Google Inc. All Rights Reserved.
*
*Use of this source code is governed by an MIT-style license that can be
*found in the LICENSE file at https://angular.io/license
*/
import { Compiler, Injectable, Injector, NgModuleFactoryLoader, NgModuleRef } from '@angular/core';
import { from, of } from 'rxjs';
import { catchError, concatMap, filter, map, mergeAll, mergeMap } from 'rxjs/operators';
import { NavigationEnd, RouteConfigLoadEnd, RouteConfigLoadStart } from './events';
import { Router } from './router';
import { RouterConfigLoader } from './router_config_loader';
import * as i0 from "@angular/core";
import * as i1 from "./router";
/**
 * @description
 *
 * Provides a preloading strategy.
 *
 * @publicApi
 */
var PreloadingStrategy = /** @class */ (function () {
    function PreloadingStrategy() {
    }
    return PreloadingStrategy;
}());
export { PreloadingStrategy };
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
var PreloadAllModules = /** @class */ (function () {
    function PreloadAllModules() {
    }
    PreloadAllModules.prototype.preload = function (route, fn) {
        return fn().pipe(catchError(function () { return of(null); }));
    };
    return PreloadAllModules;
}());
export { PreloadAllModules };
/**
 * @description
 *
 * Provides a preloading strategy that does not preload any modules.
 *
 * This strategy is enabled by default.
 *
 * @publicApi
 */
var NoPreloading = /** @class */ (function () {
    function NoPreloading() {
    }
    NoPreloading.prototype.preload = function (route, fn) { return of(null); };
    return NoPreloading;
}());
export { NoPreloading };
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
var RouterPreloader = /** @class */ (function () {
    function RouterPreloader(router, moduleLoader, compiler, injector, preloadingStrategy) {
        this.router = router;
        this.injector = injector;
        this.preloadingStrategy = preloadingStrategy;
        var onStartLoad = function (r) { return router.triggerEvent(new RouteConfigLoadStart(r)); };
        var onEndLoad = function (r) { return router.triggerEvent(new RouteConfigLoadEnd(r)); };
        this.loader = new RouterConfigLoader(moduleLoader, compiler, onStartLoad, onEndLoad);
    }
    RouterPreloader.prototype.setUpPreloading = function () {
        var _this = this;
        this.subscription =
            this.router.events
                .pipe(filter(function (e) { return e instanceof NavigationEnd; }), concatMap(function () { return _this.preload(); }))
                .subscribe(function () { });
    };
    RouterPreloader.prototype.preload = function () {
        var ngModule = this.injector.get(NgModuleRef);
        return this.processRoutes(ngModule, this.router.config);
    };
    // TODO(jasonaden): This class relies on code external to the class to call setUpPreloading. If
    // this hasn't been done, ngOnDestroy will fail as this.subscription will be undefined. This
    // should be refactored.
    RouterPreloader.prototype.ngOnDestroy = function () { this.subscription.unsubscribe(); };
    RouterPreloader.prototype.processRoutes = function (ngModule, routes) {
        var e_1, _a;
        var res = [];
        try {
            for (var routes_1 = __values(routes), routes_1_1 = routes_1.next(); !routes_1_1.done; routes_1_1 = routes_1.next()) {
                var route = routes_1_1.value;
                // we already have the config loaded, just recurse
                if (route.loadChildren && !route.canLoad && route._loadedConfig) {
                    var childConfig = route._loadedConfig;
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
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (routes_1_1 && !routes_1_1.done && (_a = routes_1.return)) _a.call(routes_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return from(res).pipe(mergeAll(), map(function (_) { return void 0; }));
    };
    RouterPreloader.prototype.preloadConfig = function (ngModule, route) {
        var _this = this;
        return this.preloadingStrategy.preload(route, function () {
            var loaded$ = _this.loader.load(ngModule.injector, route);
            return loaded$.pipe(mergeMap(function (config) {
                route._loadedConfig = config;
                return _this.processRoutes(config.module, config.routes);
            }));
        });
    };
    RouterPreloader.ɵfac = function RouterPreloader_Factory(t) { return new (t || RouterPreloader)(i0.ɵɵinject(i1.Router), i0.ɵɵinject(i0.NgModuleFactoryLoader), i0.ɵɵinject(i0.Compiler), i0.ɵɵinject(i0.Injector), i0.ɵɵinject(PreloadingStrategy)); };
    RouterPreloader.ɵprov = i0.ɵɵdefineInjectable({ token: RouterPreloader, factory: RouterPreloader.ɵfac, providedIn: null });
    return RouterPreloader;
}());
export { RouterPreloader };
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RouterPreloader, [{
        type: Injectable
    }], function () { return [{ type: i1.Router }, { type: i0.NgModuleFactoryLoader }, { type: i0.Compiler }, { type: i0.Injector }, { type: PreloadingStrategy }]; }, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3ByZWxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX3ByZWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztFQU1FO0FBRUYsT0FBTyxFQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLHFCQUFxQixFQUFFLFdBQVcsRUFBWSxNQUFNLGVBQWUsQ0FBQztBQUM1RyxPQUFPLEVBQTJCLElBQUksRUFBRSxFQUFFLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDekQsT0FBTyxFQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFHdEYsT0FBTyxFQUFRLGFBQWEsRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUN4RixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHdCQUF3QixDQUFDOzs7QUFHMUQ7Ozs7OztHQU1HO0FBQ0g7SUFBQTtJQUVBLENBQUM7SUFBRCx5QkFBQztBQUFELENBQUMsQUFGRCxJQUVDOztBQUVEOzs7Ozs7Ozs7O0dBVUc7QUFDSDtJQUFBO0lBSUEsQ0FBQztJQUhDLG1DQUFPLEdBQVAsVUFBUSxLQUFZLEVBQUUsRUFBeUI7UUFDN0MsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQU0sT0FBQSxFQUFFLENBQUUsSUFBSSxDQUFDLEVBQVQsQ0FBUyxDQUFDLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBQ0gsd0JBQUM7QUFBRCxDQUFDLEFBSkQsSUFJQzs7QUFFRDs7Ozs7Ozs7R0FRRztBQUNIO0lBQUE7SUFFQSxDQUFDO0lBREMsOEJBQU8sR0FBUCxV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Q3hEO2FBQ0Y7Ozs7Ozs7OztRQUNELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUMsVUFBQyxDQUFDLElBQUssT0FBQSxLQUFLLENBQUMsRUFBTixDQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFTyx1Q0FBYSxHQUFyQixVQUFzQixRQUEwQixFQUFFLEtBQVk7UUFBOUQsaUJBUUM7UUFQQyxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFO1lBQzVDLElBQU0sT0FBTyxHQUFHLEtBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0QsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFDLE1BQTBCO2dCQUN0RCxLQUFLLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQztnQkFDN0IsT0FBTyxLQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFELENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7a0ZBM0RVLGVBQWUsaUlBT2tDLGtCQUFrQjsyREFQbkUsZUFBZSxXQUFmLGVBQWU7MEJBeEU1QjtDQW9JQyxBQTdERCxJQTZEQztTQTVEWSxlQUFlO2tEQUFmLGVBQWU7Y0FEM0IsVUFBVTs2SUFRbUQsa0JBQWtCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4qQGxpY2Vuc2VcbipDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbipcbipVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuKmZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiovXG5cbmltcG9ydCB7Q29tcGlsZXIsIEluamVjdGFibGUsIEluamVjdG9yLCBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIE5nTW9kdWxlUmVmLCBPbkRlc3Ryb3l9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBTdWJzY3JpcHRpb24sIGZyb20sIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NhdGNoRXJyb3IsIGNvbmNhdE1hcCwgZmlsdGVyLCBtYXAsIG1lcmdlQWxsLCBtZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0xvYWRlZFJvdXRlckNvbmZpZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtFdmVudCwgTmF2aWdhdGlvbkVuZCwgUm91dGVDb25maWdMb2FkRW5kLCBSb3V0ZUNvbmZpZ0xvYWRTdGFydH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJy4vcm91dGVyJztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIGEgcHJlbG9hZGluZyBzdHJhdGVneS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQcmVsb2FkaW5nU3RyYXRlZ3kge1xuICBhYnN0cmFjdCBwcmVsb2FkKHJvdXRlOiBSb3V0ZSwgZm46ICgpID0+IE9ic2VydmFibGU8YW55Pik6IE9ic2VydmFibGU8YW55Pjtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBQcm92aWRlcyBhIHByZWxvYWRpbmcgc3RyYXRlZ3kgdGhhdCBwcmVsb2FkcyBhbGwgbW9kdWxlcyBhcyBxdWlja2x5IGFzIHBvc3NpYmxlLlxuICpcbiAqIGBgYFxuICogUm91dGVNb2R1bGUuZm9yUm9vdChST1VURVMsIHtwcmVsb2FkaW5nU3RyYXRlZ3k6IFByZWxvYWRBbGxNb2R1bGVzfSlcbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFByZWxvYWRBbGxNb2R1bGVzIGltcGxlbWVudHMgUHJlbG9hZGluZ1N0cmF0ZWd5IHtcbiAgcHJlbG9hZChyb3V0ZTogUm91dGUsIGZuOiAoKSA9PiBPYnNlcnZhYmxlPGFueT4pOiBPYnNlcnZhYmxlPGFueT4ge1xuICAgIHJldHVybiBmbigpLnBpcGUoY2F0Y2hFcnJvcigoKSA9PiBvZiAobnVsbCkpKTtcbiAgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIGEgcHJlbG9hZGluZyBzdHJhdGVneSB0aGF0IGRvZXMgbm90IHByZWxvYWQgYW55IG1vZHVsZXMuXG4gKlxuICogVGhpcyBzdHJhdGVneSBpcyBlbmFibGVkIGJ5IGRlZmF1bHQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgTm9QcmVsb2FkaW5nIGltcGxlbWVudHMgUHJlbG9hZGluZ1N0cmF0ZWd5IHtcbiAgcHJlbG9hZChyb3V0ZTogUm91dGUsIGZuOiAoKSA9PiBPYnNlcnZhYmxlPGFueT4pOiBPYnNlcnZhYmxlPGFueT4geyByZXR1cm4gb2YgKG51bGwpOyB9XG59XG5cbi8qKlxuICogVGhlIHByZWxvYWRlciBvcHRpbWlzdGljYWxseSBsb2FkcyBhbGwgcm91dGVyIGNvbmZpZ3VyYXRpb25zIHRvXG4gKiBtYWtlIG5hdmlnYXRpb25zIGludG8gbGF6aWx5LWxvYWRlZCBzZWN0aW9ucyBvZiB0aGUgYXBwbGljYXRpb24gZmFzdGVyLlxuICpcbiAqIFRoZSBwcmVsb2FkZXIgcnVucyBpbiB0aGUgYmFja2dyb3VuZC4gV2hlbiB0aGUgcm91dGVyIGJvb3RzdHJhcHMsIHRoZSBwcmVsb2FkZXJcbiAqIHN0YXJ0cyBsaXN0ZW5pbmcgdG8gYWxsIG5hdmlnYXRpb24gZXZlbnRzLiBBZnRlciBldmVyeSBzdWNoIGV2ZW50LCB0aGUgcHJlbG9hZGVyXG4gKiB3aWxsIGNoZWNrIGlmIGFueSBjb25maWd1cmF0aW9ucyBjYW4gYmUgbG9hZGVkIGxhemlseS5cbiAqXG4gKiBJZiBhIHJvdXRlIGlzIHByb3RlY3RlZCBieSBgY2FuTG9hZGAgZ3VhcmRzLCB0aGUgcHJlbG9hZGVkIHdpbGwgbm90IGxvYWQgaXQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgUm91dGVyUHJlbG9hZGVyIGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgcHJpdmF0ZSBsb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcjtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgc3Vic2NyaXB0aW9uICE6IFN1YnNjcmlwdGlvbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsIG1vZHVsZUxvYWRlcjogTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBjb21waWxlcjogQ29tcGlsZXIsXG4gICAgICBwcml2YXRlIGluamVjdG9yOiBJbmplY3RvciwgcHJpdmF0ZSBwcmVsb2FkaW5nU3RyYXRlZ3k6IFByZWxvYWRpbmdTdHJhdGVneSkge1xuICAgIGNvbnN0IG9uU3RhcnRMb2FkID0gKHI6IFJvdXRlKSA9PiByb3V0ZXIudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRTdGFydChyKSk7XG4gICAgY29uc3Qgb25FbmRMb2FkID0gKHI6IFJvdXRlKSA9PiByb3V0ZXIudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRFbmQocikpO1xuXG4gICAgdGhpcy5sb2FkZXIgPSBuZXcgUm91dGVyQ29uZmlnTG9hZGVyKG1vZHVsZUxvYWRlciwgY29tcGlsZXIsIG9uU3RhcnRMb2FkLCBvbkVuZExvYWQpO1xuICB9XG5cbiAgc2V0VXBQcmVsb2FkaW5nKCk6IHZvaWQge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9uID1cbiAgICAgICAgdGhpcy5yb3V0ZXIuZXZlbnRzXG4gICAgICAgICAgICAucGlwZShmaWx0ZXIoKGU6IEV2ZW50KSA9PiBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCksIGNvbmNhdE1hcCgoKSA9PiB0aGlzLnByZWxvYWQoKSkpXG4gICAgICAgICAgICAuc3Vic2NyaWJlKCgpID0+IHt9KTtcbiAgfVxuXG4gIHByZWxvYWQoKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMuaW5qZWN0b3IuZ2V0KE5nTW9kdWxlUmVmKTtcbiAgICByZXR1cm4gdGhpcy5wcm9jZXNzUm91dGVzKG5nTW9kdWxlLCB0aGlzLnJvdXRlci5jb25maWcpO1xuICB9XG5cbiAgLy8gVE9ETyhqYXNvbmFkZW4pOiBUaGlzIGNsYXNzIHJlbGllcyBvbiBjb2RlIGV4dGVybmFsIHRvIHRoZSBjbGFzcyB0byBjYWxsIHNldFVwUHJlbG9hZGluZy4gSWZcbiAgLy8gdGhpcyBoYXNuJ3QgYmVlbiBkb25lLCBuZ09uRGVzdHJveSB3aWxsIGZhaWwgYXMgdGhpcy5zdWJzY3JpcHRpb24gd2lsbCBiZSB1bmRlZmluZWQuIFRoaXNcbiAgLy8gc2hvdWxkIGJlIHJlZmFjdG9yZWQuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQgeyB0aGlzLnN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpOyB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzUm91dGVzKG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+LCByb3V0ZXM6IFJvdXRlcyk6IE9ic2VydmFibGU8dm9pZD4ge1xuICAgIGNvbnN0IHJlczogT2JzZXJ2YWJsZTxhbnk+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHJvdXRlcykge1xuICAgICAgLy8gd2UgYWxyZWFkeSBoYXZlIHRoZSBjb25maWcgbG9hZGVkLCBqdXN0IHJlY3Vyc2VcbiAgICAgIGlmIChyb3V0ZS5sb2FkQ2hpbGRyZW4gJiYgIXJvdXRlLmNhbkxvYWQgJiYgcm91dGUuX2xvYWRlZENvbmZpZykge1xuICAgICAgICBjb25zdCBjaGlsZENvbmZpZyA9IHJvdXRlLl9sb2FkZWRDb25maWc7XG4gICAgICAgIHJlcy5wdXNoKHRoaXMucHJvY2Vzc1JvdXRlcyhjaGlsZENvbmZpZy5tb2R1bGUsIGNoaWxkQ29uZmlnLnJvdXRlcykpO1xuXG4gICAgICAgIC8vIG5vIGNvbmZpZyBsb2FkZWQsIGZldGNoIHRoZSBjb25maWdcbiAgICAgIH0gZWxzZSBpZiAocm91dGUubG9hZENoaWxkcmVuICYmICFyb3V0ZS5jYW5Mb2FkKSB7XG4gICAgICAgIHJlcy5wdXNoKHRoaXMucHJlbG9hZENvbmZpZyhuZ01vZHVsZSwgcm91dGUpKTtcblxuICAgICAgICAvLyByZWN1cnNlIGludG8gY2hpbGRyZW5cbiAgICAgIH0gZWxzZSBpZiAocm91dGUuY2hpbGRyZW4pIHtcbiAgICAgICAgcmVzLnB1c2godGhpcy5wcm9jZXNzUm91dGVzKG5nTW9kdWxlLCByb3V0ZS5jaGlsZHJlbikpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZnJvbShyZXMpLnBpcGUobWVyZ2VBbGwoKSwgbWFwKChfKSA9PiB2b2lkIDApKTtcbiAgfVxuXG4gIHByaXZhdGUgcHJlbG9hZENvbmZpZyhuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55Piwgcm91dGU6IFJvdXRlKTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMucHJlbG9hZGluZ1N0cmF0ZWd5LnByZWxvYWQocm91dGUsICgpID0+IHtcbiAgICAgIGNvbnN0IGxvYWRlZCQgPSB0aGlzLmxvYWRlci5sb2FkKG5nTW9kdWxlLmluamVjdG9yLCByb3V0ZSk7XG4gICAgICByZXR1cm4gbG9hZGVkJC5waXBlKG1lcmdlTWFwKChjb25maWc6IExvYWRlZFJvdXRlckNvbmZpZykgPT4ge1xuICAgICAgICByb3V0ZS5fbG9hZGVkQ29uZmlnID0gY29uZmlnO1xuICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzUm91dGVzKGNvbmZpZy5tb2R1bGUsIGNvbmZpZy5yb3V0ZXMpO1xuICAgICAgfSkpO1xuICAgIH0pO1xuICB9XG59XG4iXX0=