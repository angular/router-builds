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
    NoPreloading.prototype.preload = function (route, fn) {
        return of(null);
    };
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
    RouterPreloader.prototype.ngOnDestroy = function () {
        this.subscription.unsubscribe();
    };
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
    RouterPreloader.ɵprov = i0.ɵɵdefineInjectable({ token: RouterPreloader, factory: RouterPreloader.ɵfac });
    return RouterPreloader;
}());
export { RouterPreloader };
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RouterPreloader, [{
        type: Injectable
    }], function () { return [{ type: i1.Router }, { type: i0.NgModuleFactoryLoader }, { type: i0.Compiler }, { type: i0.Injector }, { type: PreloadingStrategy }]; }, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3ByZWxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX3ByZWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLHFCQUFxQixFQUFFLFdBQVcsRUFBWSxNQUFNLGVBQWUsQ0FBQztBQUM1RyxPQUFPLEVBQUMsSUFBSSxFQUFjLEVBQUUsRUFBZSxNQUFNLE1BQU0sQ0FBQztBQUN4RCxPQUFPLEVBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUd0RixPQUFPLEVBQVEsYUFBYSxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ3hGLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDaEMsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sd0JBQXdCLENBQUM7OztBQUcxRDs7Ozs7O0dBTUc7QUFDSDtJQUFBO0lBRUEsQ0FBQztJQUFELHlCQUFDO0FBQUQsQ0FBQyxBQUZELElBRUM7O0FBRUQ7Ozs7Ozs7Ozs7R0FVRztBQUNIO0lBQUE7SUFJQSxDQUFDO0lBSEMsbUNBQU8sR0FBUCxVQUFRLEtBQVksRUFBRSxFQUF5QjtRQUM3QyxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBTSxPQUFBLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBUixDQUFRLENBQUMsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFDSCx3QkFBQztBQUFELENBQUMsQUFKRCxJQUlDOztBQUVEOzs7Ozs7OztHQVFHO0FBQ0g7SUFBQTtJQUlBLENBQUM7SUFIQyw4QkFBTyxHQUFQLFVB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RDthQUNGOzs7Ozs7Ozs7UUFDRCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxDQUFDLFVBQUMsQ0FBQyxJQUFLLE9BQUEsS0FBSyxDQUFDLEVBQU4sQ0FBTSxDQUFDLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRU8sdUNBQWEsR0FBckIsVUFBc0IsUUFBMEIsRUFBRSxLQUFZO1FBQTlELGlCQVFDO1FBUEMsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRTtZQUM1QyxJQUFNLE9BQU8sR0FBRyxLQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBQyxNQUEwQjtnQkFDdEQsS0FBSyxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUM7Z0JBQzdCLE9BQU8sS0FBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ04sQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO2tGQTdEVSxlQUFlLGlJQU9rQyxrQkFBa0I7MkRBUG5FLGVBQWUsV0FBZixlQUFlOzBCQTFFNUI7Q0F3SUMsQUEvREQsSUErREM7U0E5RFksZUFBZTtrREFBZixlQUFlO2NBRDNCLFVBQVU7NklBUW1ELGtCQUFrQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICpAbGljZW5zZVxuICpDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKlVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKmZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbXBpbGVyLCBJbmplY3RhYmxlLCBJbmplY3RvciwgTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBOZ01vZHVsZVJlZiwgT25EZXN0cm95fSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ZnJvbSwgT2JzZXJ2YWJsZSwgb2YsIFN1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NhdGNoRXJyb3IsIGNvbmNhdE1hcCwgZmlsdGVyLCBtYXAsIG1lcmdlQWxsLCBtZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0xvYWRlZFJvdXRlckNvbmZpZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtFdmVudCwgTmF2aWdhdGlvbkVuZCwgUm91dGVDb25maWdMb2FkRW5kLCBSb3V0ZUNvbmZpZ0xvYWRTdGFydH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJy4vcm91dGVyJztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIGEgcHJlbG9hZGluZyBzdHJhdGVneS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQcmVsb2FkaW5nU3RyYXRlZ3kge1xuICBhYnN0cmFjdCBwcmVsb2FkKHJvdXRlOiBSb3V0ZSwgZm46ICgpID0+IE9ic2VydmFibGU8YW55Pik6IE9ic2VydmFibGU8YW55Pjtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBQcm92aWRlcyBhIHByZWxvYWRpbmcgc3RyYXRlZ3kgdGhhdCBwcmVsb2FkcyBhbGwgbW9kdWxlcyBhcyBxdWlja2x5IGFzIHBvc3NpYmxlLlxuICpcbiAqIGBgYFxuICogUm91dGVNb2R1bGUuZm9yUm9vdChST1VURVMsIHtwcmVsb2FkaW5nU3RyYXRlZ3k6IFByZWxvYWRBbGxNb2R1bGVzfSlcbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFByZWxvYWRBbGxNb2R1bGVzIGltcGxlbWVudHMgUHJlbG9hZGluZ1N0cmF0ZWd5IHtcbiAgcHJlbG9hZChyb3V0ZTogUm91dGUsIGZuOiAoKSA9PiBPYnNlcnZhYmxlPGFueT4pOiBPYnNlcnZhYmxlPGFueT4ge1xuICAgIHJldHVybiBmbigpLnBpcGUoY2F0Y2hFcnJvcigoKSA9PiBvZihudWxsKSkpO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUHJvdmlkZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5IHRoYXQgZG9lcyBub3QgcHJlbG9hZCBhbnkgbW9kdWxlcy5cbiAqXG4gKiBUaGlzIHN0cmF0ZWd5IGlzIGVuYWJsZWQgYnkgZGVmYXVsdC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBOb1ByZWxvYWRpbmcgaW1wbGVtZW50cyBQcmVsb2FkaW5nU3RyYXRlZ3kge1xuICBwcmVsb2FkKHJvdXRlOiBSb3V0ZSwgZm46ICgpID0+IE9ic2VydmFibGU8YW55Pik6IE9ic2VydmFibGU8YW55PiB7XG4gICAgcmV0dXJuIG9mKG51bGwpO1xuICB9XG59XG5cbi8qKlxuICogVGhlIHByZWxvYWRlciBvcHRpbWlzdGljYWxseSBsb2FkcyBhbGwgcm91dGVyIGNvbmZpZ3VyYXRpb25zIHRvXG4gKiBtYWtlIG5hdmlnYXRpb25zIGludG8gbGF6aWx5LWxvYWRlZCBzZWN0aW9ucyBvZiB0aGUgYXBwbGljYXRpb24gZmFzdGVyLlxuICpcbiAqIFRoZSBwcmVsb2FkZXIgcnVucyBpbiB0aGUgYmFja2dyb3VuZC4gV2hlbiB0aGUgcm91dGVyIGJvb3RzdHJhcHMsIHRoZSBwcmVsb2FkZXJcbiAqIHN0YXJ0cyBsaXN0ZW5pbmcgdG8gYWxsIG5hdmlnYXRpb24gZXZlbnRzLiBBZnRlciBldmVyeSBzdWNoIGV2ZW50LCB0aGUgcHJlbG9hZGVyXG4gKiB3aWxsIGNoZWNrIGlmIGFueSBjb25maWd1cmF0aW9ucyBjYW4gYmUgbG9hZGVkIGxhemlseS5cbiAqXG4gKiBJZiBhIHJvdXRlIGlzIHByb3RlY3RlZCBieSBgY2FuTG9hZGAgZ3VhcmRzLCB0aGUgcHJlbG9hZGVkIHdpbGwgbm90IGxvYWQgaXQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgUm91dGVyUHJlbG9hZGVyIGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgcHJpdmF0ZSBsb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcjtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgc3Vic2NyaXB0aW9uITogU3Vic2NyaXB0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZXI6IFJvdXRlciwgbW9kdWxlTG9hZGVyOiBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIGNvbXBpbGVyOiBDb21waWxlcixcbiAgICAgIHByaXZhdGUgaW5qZWN0b3I6IEluamVjdG9yLCBwcml2YXRlIHByZWxvYWRpbmdTdHJhdGVneTogUHJlbG9hZGluZ1N0cmF0ZWd5KSB7XG4gICAgY29uc3Qgb25TdGFydExvYWQgPSAocjogUm91dGUpID0+IHJvdXRlci50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZFN0YXJ0KHIpKTtcbiAgICBjb25zdCBvbkVuZExvYWQgPSAocjogUm91dGUpID0+IHJvdXRlci50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZEVuZChyKSk7XG5cbiAgICB0aGlzLmxvYWRlciA9IG5ldyBSb3V0ZXJDb25maWdMb2FkZXIobW9kdWxlTG9hZGVyLCBjb21waWxlciwgb25TdGFydExvYWQsIG9uRW5kTG9hZCk7XG4gIH1cblxuICBzZXRVcFByZWxvYWRpbmcoKTogdm9pZCB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb24gPVxuICAgICAgICB0aGlzLnJvdXRlci5ldmVudHNcbiAgICAgICAgICAgIC5waXBlKGZpbHRlcigoZTogRXZlbnQpID0+IGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSwgY29uY2F0TWFwKCgpID0+IHRoaXMucHJlbG9hZCgpKSlcbiAgICAgICAgICAgIC5zdWJzY3JpYmUoKCkgPT4ge30pO1xuICB9XG5cbiAgcHJlbG9hZCgpOiBPYnNlcnZhYmxlPGFueT4ge1xuICAgIGNvbnN0IG5nTW9kdWxlID0gdGhpcy5pbmplY3Rvci5nZXQoTmdNb2R1bGVSZWYpO1xuICAgIHJldHVybiB0aGlzLnByb2Nlc3NSb3V0ZXMobmdNb2R1bGUsIHRoaXMucm91dGVyLmNvbmZpZyk7XG4gIH1cblxuICAvLyBUT0RPKGphc29uYWRlbik6IFRoaXMgY2xhc3MgcmVsaWVzIG9uIGNvZGUgZXh0ZXJuYWwgdG8gdGhlIGNsYXNzIHRvIGNhbGwgc2V0VXBQcmVsb2FkaW5nLiBJZlxuICAvLyB0aGlzIGhhc24ndCBiZWVuIGRvbmUsIG5nT25EZXN0cm95IHdpbGwgZmFpbCBhcyB0aGlzLnN1YnNjcmlwdGlvbiB3aWxsIGJlIHVuZGVmaW5lZC4gVGhpc1xuICAvLyBzaG91bGQgYmUgcmVmYWN0b3JlZC5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc1JvdXRlcyhuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55Piwgcm91dGVzOiBSb3V0ZXMpOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgICBjb25zdCByZXM6IE9ic2VydmFibGU8YW55PltdID0gW107XG4gICAgZm9yIChjb25zdCByb3V0ZSBvZiByb3V0ZXMpIHtcbiAgICAgIC8vIHdlIGFscmVhZHkgaGF2ZSB0aGUgY29uZmlnIGxvYWRlZCwganVzdCByZWN1cnNlXG4gICAgICBpZiAocm91dGUubG9hZENoaWxkcmVuICYmICFyb3V0ZS5jYW5Mb2FkICYmIHJvdXRlLl9sb2FkZWRDb25maWcpIHtcbiAgICAgICAgY29uc3QgY2hpbGRDb25maWcgPSByb3V0ZS5fbG9hZGVkQ29uZmlnO1xuICAgICAgICByZXMucHVzaCh0aGlzLnByb2Nlc3NSb3V0ZXMoY2hpbGRDb25maWcubW9kdWxlLCBjaGlsZENvbmZpZy5yb3V0ZXMpKTtcblxuICAgICAgICAvLyBubyBjb25maWcgbG9hZGVkLCBmZXRjaCB0aGUgY29uZmlnXG4gICAgICB9IGVsc2UgaWYgKHJvdXRlLmxvYWRDaGlsZHJlbiAmJiAhcm91dGUuY2FuTG9hZCkge1xuICAgICAgICByZXMucHVzaCh0aGlzLnByZWxvYWRDb25maWcobmdNb2R1bGUsIHJvdXRlKSk7XG5cbiAgICAgICAgLy8gcmVjdXJzZSBpbnRvIGNoaWxkcmVuXG4gICAgICB9IGVsc2UgaWYgKHJvdXRlLmNoaWxkcmVuKSB7XG4gICAgICAgIHJlcy5wdXNoKHRoaXMucHJvY2Vzc1JvdXRlcyhuZ01vZHVsZSwgcm91dGUuY2hpbGRyZW4pKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZyb20ocmVzKS5waXBlKG1lcmdlQWxsKCksIG1hcCgoXykgPT4gdm9pZCAwKSk7XG4gIH1cblxuICBwcml2YXRlIHByZWxvYWRDb25maWcobmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT4sIHJvdXRlOiBSb3V0ZSk6IE9ic2VydmFibGU8dm9pZD4ge1xuICAgIHJldHVybiB0aGlzLnByZWxvYWRpbmdTdHJhdGVneS5wcmVsb2FkKHJvdXRlLCAoKSA9PiB7XG4gICAgICBjb25zdCBsb2FkZWQkID0gdGhpcy5sb2FkZXIubG9hZChuZ01vZHVsZS5pbmplY3Rvciwgcm91dGUpO1xuICAgICAgcmV0dXJuIGxvYWRlZCQucGlwZShtZXJnZU1hcCgoY29uZmlnOiBMb2FkZWRSb3V0ZXJDb25maWcpID0+IHtcbiAgICAgICAgcm91dGUuX2xvYWRlZENvbmZpZyA9IGNvbmZpZztcbiAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1JvdXRlcyhjb25maWcubW9kdWxlLCBjb25maWcucm91dGVzKTtcbiAgICAgIH0pKTtcbiAgICB9KTtcbiAgfVxufVxuIl19