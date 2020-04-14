/**
 * @fileoverview added by tsickle
 * Generated from: packages/router/src/router_preloader.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
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
 *@license
 *Copyright Google Inc. All Rights Reserved.
 *
 *Use of this source code is governed by an MIT-style license that can be
 *found in the LICENSE file at https://angular.io/license
 */
/**
 * \@description
 *
 * Provides a preloading strategy.
 *
 * \@publicApi
 * @abstract
 */
export class PreloadingStrategy {
}
if (false) {
    /**
     * @abstract
     * @param {?} route
     * @param {?} fn
     * @return {?}
     */
    PreloadingStrategy.prototype.preload = function (route, fn) { };
}
/**
 * \@description
 *
 * Provides a preloading strategy that preloads all modules as quickly as possible.
 *
 * ```
 * RouteModule.forRoot(ROUTES, {preloadingStrategy: PreloadAllModules})
 * ```
 *
 * \@publicApi
 */
export class PreloadAllModules {
    /**
     * @param {?} route
     * @param {?} fn
     * @return {?}
     */
    preload(route, fn) {
        return fn().pipe(catchError((/**
         * @return {?}
         */
        () => of(null))));
    }
}
/**
 * \@description
 *
 * Provides a preloading strategy that does not preload any modules.
 *
 * This strategy is enabled by default.
 *
 * \@publicApi
 */
export class NoPreloading {
    /**
     * @param {?} route
     * @param {?} fn
     * @return {?}
     */
    preload(route, fn) {
        return of(null);
    }
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
 * \@publicApi
 */
export class RouterPreloader {
    /**
     * @param {?} router
     * @param {?} moduleLoader
     * @param {?} compiler
     * @param {?} injector
     * @param {?} preloadingStrategy
     */
    constructor(router, moduleLoader, compiler, injector, preloadingStrategy) {
        this.router = router;
        this.injector = injector;
        this.preloadingStrategy = preloadingStrategy;
        /** @type {?} */
        const onStartLoad = (/**
         * @param {?} r
         * @return {?}
         */
        (r) => router.triggerEvent(new RouteConfigLoadStart(r)));
        /** @type {?} */
        const onEndLoad = (/**
         * @param {?} r
         * @return {?}
         */
        (r) => router.triggerEvent(new RouteConfigLoadEnd(r)));
        this.loader = new RouterConfigLoader(moduleLoader, compiler, onStartLoad, onEndLoad);
    }
    /**
     * @return {?}
     */
    setUpPreloading() {
        this.subscription =
            this.router.events
                .pipe(filter((/**
             * @param {?} e
             * @return {?}
             */
            (e) => e instanceof NavigationEnd)), concatMap((/**
             * @return {?}
             */
            () => this.preload())))
                .subscribe((/**
             * @return {?}
             */
            () => { }));
    }
    /**
     * @return {?}
     */
    preload() {
        /** @type {?} */
        const ngModule = this.injector.get(NgModuleRef);
        return this.processRoutes(ngModule, this.router.config);
    }
    // TODO(jasonaden): This class relies on code external to the class to call setUpPreloading. If
    // this hasn't been done, ngOnDestroy will fail as this.subscription will be undefined. This
    // should be refactored.
    /**
     * @return {?}
     */
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
    /**
     * @private
     * @param {?} ngModule
     * @param {?} routes
     * @return {?}
     */
    processRoutes(ngModule, routes) {
        /** @type {?} */
        const res = [];
        for (const route of routes) {
            // we already have the config loaded, just recurse
            if (route.loadChildren && !route.canLoad && route._loadedConfig) {
                /** @type {?} */
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
        return from(res).pipe(mergeAll(), map((/**
         * @param {?} _
         * @return {?}
         */
        (_) => void 0)));
    }
    /**
     * @private
     * @param {?} ngModule
     * @param {?} route
     * @return {?}
     */
    preloadConfig(ngModule, route) {
        return this.preloadingStrategy.preload(route, (/**
         * @return {?}
         */
        () => {
            /** @type {?} */
            const loaded$ = this.loader.load(ngModule.injector, route);
            return loaded$.pipe(mergeMap((/**
             * @param {?} config
             * @return {?}
             */
            (config) => {
                route._loadedConfig = config;
                return this.processRoutes(config.module, config.routes);
            })));
        }));
    }
}
RouterPreloader.decorators = [
    { type: Injectable },
];
/** @nocollapse */
RouterPreloader.ctorParameters = () => [
    { type: Router },
    { type: NgModuleFactoryLoader },
    { type: Compiler },
    { type: Injector },
    { type: PreloadingStrategy }
];
/** @nocollapse */ RouterPreloader.ɵfac = function RouterPreloader_Factory(t) { return new (t || RouterPreloader)(i0.ɵɵinject(i1.Router), i0.ɵɵinject(i0.NgModuleFactoryLoader), i0.ɵɵinject(i0.Compiler), i0.ɵɵinject(i0.Injector), i0.ɵɵinject(PreloadingStrategy)); };
/** @nocollapse */ RouterPreloader.ɵprov = i0.ɵɵdefineInjectable({ token: RouterPreloader, factory: RouterPreloader.ɵfac });
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RouterPreloader, [{
        type: Injectable
    }], function () { return [{ type: i1.Router }, { type: i0.NgModuleFactoryLoader }, { type: i0.Compiler }, { type: i0.Injector }, { type: PreloadingStrategy }]; }, null); })();
if (false) {
    /**
     * @type {?}
     * @private
     */
    RouterPreloader.prototype.loader;
    /**
     * @type {?}
     * @private
     */
    RouterPreloader.prototype.subscription;
    /**
     * @type {?}
     * @private
     */
    RouterPreloader.prototype.router;
    /**
     * @type {?}
     * @private
     */
    RouterPreloader.prototype.injector;
    /**
     * @type {?}
     * @private
     */
    RouterPreloader.prototype.preloadingStrategy;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3ByZWxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX3ByZWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQVFBLE9BQU8sRUFBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxxQkFBcUIsRUFBRSxXQUFXLEVBQVksTUFBTSxlQUFlLENBQUM7QUFDNUcsT0FBTyxFQUFDLElBQUksRUFBYyxFQUFFLEVBQWUsTUFBTSxNQUFNLENBQUM7QUFDeEQsT0FBTyxFQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFHdEYsT0FBTyxFQUFRLGFBQWEsRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUN4RixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHdCQUF3QixDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFVMUQsTUFBTSxPQUFnQixrQkFBa0I7Q0FFdkM7Ozs7Ozs7O0lBREMsZ0VBQTJFOzs7Ozs7Ozs7Ozs7O0FBYzdFLE1BQU0sT0FBTyxpQkFBaUI7Ozs7OztJQUM1QixPQUFPLENBQUMsS0FBWSxFQUFFLEVBQXlCO1FBQzdDLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVU7OztRQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQztDQUNGOzs7Ozs7Ozs7O0FBV0QsTUFBTSxPQUFPLFlBQVk7Ozs7OztJQUN2QixPQUFPLENBQUMsS0FBWSxFQUFFLEVBQXlCO1FBQzdDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLENBQUM7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QUFDLEtBQUs7OztRQUFFLEdBQUcsRUFBRTs7a0JBQzNDLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQztZQUMxRCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUTs7OztZQUFDLENBQUMsTUFBMEIsRUFBRSxFQUFFO2dCQUMxRCxLQUFLLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQztnQkFDN0IsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFELENBQUMsRUFBQyxDQUFDLENBQUM7UUFDTixDQUFDLEVBQUMsQ0FBQztJQUNMLENBQUM7OztZQTlERixVQUFVOzs7O1lBM0RILE1BQU07WUFOMEIscUJBQXFCO1lBQXJELFFBQVE7WUFBYyxRQUFRO1lBeUV3QixrQkFBa0I7O2lHQVBuRSxlQUFlLGlJQU9rQyxrQkFBa0I7MEVBUG5FLGVBQWUsV0FBZixlQUFlO2tEQUFmLGVBQWU7Y0FEM0IsVUFBVTs2SUFRbUQsa0JBQWtCOzs7Ozs7SUFOOUUsaUNBQW1DOzs7OztJQUVuQyx1Q0FBb0M7Ozs7O0lBR2hDLGlDQUFzQjs7Ozs7SUFDdEIsbUNBQTBCOzs7OztJQUFFLDZDQUE4QyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICpAbGljZW5zZVxuICpDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKlVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKmZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbXBpbGVyLCBJbmplY3RhYmxlLCBJbmplY3RvciwgTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBOZ01vZHVsZVJlZiwgT25EZXN0cm95fSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ZnJvbSwgT2JzZXJ2YWJsZSwgb2YsIFN1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NhdGNoRXJyb3IsIGNvbmNhdE1hcCwgZmlsdGVyLCBtYXAsIG1lcmdlQWxsLCBtZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0xvYWRlZFJvdXRlckNvbmZpZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtFdmVudCwgTmF2aWdhdGlvbkVuZCwgUm91dGVDb25maWdMb2FkRW5kLCBSb3V0ZUNvbmZpZ0xvYWRTdGFydH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJy4vcm91dGVyJztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIGEgcHJlbG9hZGluZyBzdHJhdGVneS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQcmVsb2FkaW5nU3RyYXRlZ3kge1xuICBhYnN0cmFjdCBwcmVsb2FkKHJvdXRlOiBSb3V0ZSwgZm46ICgpID0+IE9ic2VydmFibGU8YW55Pik6IE9ic2VydmFibGU8YW55Pjtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBQcm92aWRlcyBhIHByZWxvYWRpbmcgc3RyYXRlZ3kgdGhhdCBwcmVsb2FkcyBhbGwgbW9kdWxlcyBhcyBxdWlja2x5IGFzIHBvc3NpYmxlLlxuICpcbiAqIGBgYFxuICogUm91dGVNb2R1bGUuZm9yUm9vdChST1VURVMsIHtwcmVsb2FkaW5nU3RyYXRlZ3k6IFByZWxvYWRBbGxNb2R1bGVzfSlcbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFByZWxvYWRBbGxNb2R1bGVzIGltcGxlbWVudHMgUHJlbG9hZGluZ1N0cmF0ZWd5IHtcbiAgcHJlbG9hZChyb3V0ZTogUm91dGUsIGZuOiAoKSA9PiBPYnNlcnZhYmxlPGFueT4pOiBPYnNlcnZhYmxlPGFueT4ge1xuICAgIHJldHVybiBmbigpLnBpcGUoY2F0Y2hFcnJvcigoKSA9PiBvZihudWxsKSkpO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUHJvdmlkZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5IHRoYXQgZG9lcyBub3QgcHJlbG9hZCBhbnkgbW9kdWxlcy5cbiAqXG4gKiBUaGlzIHN0cmF0ZWd5IGlzIGVuYWJsZWQgYnkgZGVmYXVsdC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBOb1ByZWxvYWRpbmcgaW1wbGVtZW50cyBQcmVsb2FkaW5nU3RyYXRlZ3kge1xuICBwcmVsb2FkKHJvdXRlOiBSb3V0ZSwgZm46ICgpID0+IE9ic2VydmFibGU8YW55Pik6IE9ic2VydmFibGU8YW55PiB7XG4gICAgcmV0dXJuIG9mKG51bGwpO1xuICB9XG59XG5cbi8qKlxuICogVGhlIHByZWxvYWRlciBvcHRpbWlzdGljYWxseSBsb2FkcyBhbGwgcm91dGVyIGNvbmZpZ3VyYXRpb25zIHRvXG4gKiBtYWtlIG5hdmlnYXRpb25zIGludG8gbGF6aWx5LWxvYWRlZCBzZWN0aW9ucyBvZiB0aGUgYXBwbGljYXRpb24gZmFzdGVyLlxuICpcbiAqIFRoZSBwcmVsb2FkZXIgcnVucyBpbiB0aGUgYmFja2dyb3VuZC4gV2hlbiB0aGUgcm91dGVyIGJvb3RzdHJhcHMsIHRoZSBwcmVsb2FkZXJcbiAqIHN0YXJ0cyBsaXN0ZW5pbmcgdG8gYWxsIG5hdmlnYXRpb24gZXZlbnRzLiBBZnRlciBldmVyeSBzdWNoIGV2ZW50LCB0aGUgcHJlbG9hZGVyXG4gKiB3aWxsIGNoZWNrIGlmIGFueSBjb25maWd1cmF0aW9ucyBjYW4gYmUgbG9hZGVkIGxhemlseS5cbiAqXG4gKiBJZiBhIHJvdXRlIGlzIHByb3RlY3RlZCBieSBgY2FuTG9hZGAgZ3VhcmRzLCB0aGUgcHJlbG9hZGVkIHdpbGwgbm90IGxvYWQgaXQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgUm91dGVyUHJlbG9hZGVyIGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgcHJpdmF0ZSBsb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcjtcbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIHByaXZhdGUgc3Vic2NyaXB0aW9uITogU3Vic2NyaXB0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZXI6IFJvdXRlciwgbW9kdWxlTG9hZGVyOiBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIGNvbXBpbGVyOiBDb21waWxlcixcbiAgICAgIHByaXZhdGUgaW5qZWN0b3I6IEluamVjdG9yLCBwcml2YXRlIHByZWxvYWRpbmdTdHJhdGVneTogUHJlbG9hZGluZ1N0cmF0ZWd5KSB7XG4gICAgY29uc3Qgb25TdGFydExvYWQgPSAocjogUm91dGUpID0+IHJvdXRlci50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZFN0YXJ0KHIpKTtcbiAgICBjb25zdCBvbkVuZExvYWQgPSAocjogUm91dGUpID0+IHJvdXRlci50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZEVuZChyKSk7XG5cbiAgICB0aGlzLmxvYWRlciA9IG5ldyBSb3V0ZXJDb25maWdMb2FkZXIobW9kdWxlTG9hZGVyLCBjb21waWxlciwgb25TdGFydExvYWQsIG9uRW5kTG9hZCk7XG4gIH1cblxuICBzZXRVcFByZWxvYWRpbmcoKTogdm9pZCB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb24gPVxuICAgICAgICB0aGlzLnJvdXRlci5ldmVudHNcbiAgICAgICAgICAgIC5waXBlKGZpbHRlcigoZTogRXZlbnQpID0+IGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSwgY29uY2F0TWFwKCgpID0+IHRoaXMucHJlbG9hZCgpKSlcbiAgICAgICAgICAgIC5zdWJzY3JpYmUoKCkgPT4ge30pO1xuICB9XG5cbiAgcHJlbG9hZCgpOiBPYnNlcnZhYmxlPGFueT4ge1xuICAgIGNvbnN0IG5nTW9kdWxlID0gdGhpcy5pbmplY3Rvci5nZXQoTmdNb2R1bGVSZWYpO1xuICAgIHJldHVybiB0aGlzLnByb2Nlc3NSb3V0ZXMobmdNb2R1bGUsIHRoaXMucm91dGVyLmNvbmZpZyk7XG4gIH1cblxuICAvLyBUT0RPKGphc29uYWRlbik6IFRoaXMgY2xhc3MgcmVsaWVzIG9uIGNvZGUgZXh0ZXJuYWwgdG8gdGhlIGNsYXNzIHRvIGNhbGwgc2V0VXBQcmVsb2FkaW5nLiBJZlxuICAvLyB0aGlzIGhhc24ndCBiZWVuIGRvbmUsIG5nT25EZXN0cm95IHdpbGwgZmFpbCBhcyB0aGlzLnN1YnNjcmlwdGlvbiB3aWxsIGJlIHVuZGVmaW5lZC4gVGhpc1xuICAvLyBzaG91bGQgYmUgcmVmYWN0b3JlZC5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc1JvdXRlcyhuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55Piwgcm91dGVzOiBSb3V0ZXMpOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgICBjb25zdCByZXM6IE9ic2VydmFibGU8YW55PltdID0gW107XG4gICAgZm9yIChjb25zdCByb3V0ZSBvZiByb3V0ZXMpIHtcbiAgICAgIC8vIHdlIGFscmVhZHkgaGF2ZSB0aGUgY29uZmlnIGxvYWRlZCwganVzdCByZWN1cnNlXG4gICAgICBpZiAocm91dGUubG9hZENoaWxkcmVuICYmICFyb3V0ZS5jYW5Mb2FkICYmIHJvdXRlLl9sb2FkZWRDb25maWcpIHtcbiAgICAgICAgY29uc3QgY2hpbGRDb25maWcgPSByb3V0ZS5fbG9hZGVkQ29uZmlnO1xuICAgICAgICByZXMucHVzaCh0aGlzLnByb2Nlc3NSb3V0ZXMoY2hpbGRDb25maWcubW9kdWxlLCBjaGlsZENvbmZpZy5yb3V0ZXMpKTtcblxuICAgICAgICAvLyBubyBjb25maWcgbG9hZGVkLCBmZXRjaCB0aGUgY29uZmlnXG4gICAgICB9IGVsc2UgaWYgKHJvdXRlLmxvYWRDaGlsZHJlbiAmJiAhcm91dGUuY2FuTG9hZCkge1xuICAgICAgICByZXMucHVzaCh0aGlzLnByZWxvYWRDb25maWcobmdNb2R1bGUsIHJvdXRlKSk7XG5cbiAgICAgICAgLy8gcmVjdXJzZSBpbnRvIGNoaWxkcmVuXG4gICAgICB9IGVsc2UgaWYgKHJvdXRlLmNoaWxkcmVuKSB7XG4gICAgICAgIHJlcy5wdXNoKHRoaXMucHJvY2Vzc1JvdXRlcyhuZ01vZHVsZSwgcm91dGUuY2hpbGRyZW4pKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZyb20ocmVzKS5waXBlKG1lcmdlQWxsKCksIG1hcCgoXykgPT4gdm9pZCAwKSk7XG4gIH1cblxuICBwcml2YXRlIHByZWxvYWRDb25maWcobmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT4sIHJvdXRlOiBSb3V0ZSk6IE9ic2VydmFibGU8dm9pZD4ge1xuICAgIHJldHVybiB0aGlzLnByZWxvYWRpbmdTdHJhdGVneS5wcmVsb2FkKHJvdXRlLCAoKSA9PiB7XG4gICAgICBjb25zdCBsb2FkZWQkID0gdGhpcy5sb2FkZXIubG9hZChuZ01vZHVsZS5pbmplY3Rvciwgcm91dGUpO1xuICAgICAgcmV0dXJuIGxvYWRlZCQucGlwZShtZXJnZU1hcCgoY29uZmlnOiBMb2FkZWRSb3V0ZXJDb25maWcpID0+IHtcbiAgICAgICAgcm91dGUuX2xvYWRlZENvbmZpZyA9IGNvbmZpZztcbiAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1JvdXRlcyhjb25maWcubW9kdWxlLCBjb25maWcucm91dGVzKTtcbiAgICAgIH0pKTtcbiAgICB9KTtcbiAgfVxufVxuIl19