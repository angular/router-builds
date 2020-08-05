/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
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
 * @publicApi
 */
export class RouterPreloader {
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
    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
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
}
RouterPreloader.ɵfac = function RouterPreloader_Factory(t) { return new (t || RouterPreloader)(i0.ɵɵinject(i1.Router), i0.ɵɵinject(i0.NgModuleFactoryLoader), i0.ɵɵinject(i0.Compiler), i0.ɵɵinject(i0.Injector), i0.ɵɵinject(PreloadingStrategy)); };
RouterPreloader.ɵprov = i0.ɵɵdefineInjectable({ token: RouterPreloader, factory: RouterPreloader.ɵfac });
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RouterPreloader, [{
        type: Injectable
    }], function () { return [{ type: i1.Router }, { type: i0.NgModuleFactoryLoader }, { type: i0.Compiler }, { type: i0.Injector }, { type: PreloadingStrategy }]; }, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3ByZWxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX3ByZWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUscUJBQXFCLEVBQUUsV0FBVyxFQUFZLE1BQU0sZUFBZSxDQUFDO0FBQzVHLE9BQU8sRUFBQyxJQUFJLEVBQWMsRUFBRSxFQUFlLE1BQU0sTUFBTSxDQUFDO0FBQ3hELE9BQU8sRUFBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBR3RGLE9BQU8sRUFBUSxhQUFhLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDeEYsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQzs7O0FBRzFEOzs7Ozs7R0FNRztBQUNILE1BQU0sT0FBZ0Isa0JBQWtCO0NBRXZDO0FBRUQ7Ozs7Ozs7Ozs7R0FVRztBQUNILE1BQU0sT0FBTyxpQkFBaUI7SUFDNUIsT0FBTyxDQUFDLEtBQVksRUFBRSxFQUF5QjtRQUM3QyxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQyxDQUFDO0NBQ0Y7QUFFRDs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sT0FBTyxZQUFZO0lBQ3ZCLE9BQU8sQ0FBQyxLQUFZLEVBQUUsRUFBeUI7UUFDN0MsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsQ0FBQztDQUNGO0FB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SSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO1lBQ2pELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0QsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQTBCLEVBQUUsRUFBRTtnQkFDMUQsS0FBSyxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUM7Z0JBQzdCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ04sQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDOzs4RUEzRFUsZUFBZSxpSUFNa0Msa0JBQWtCO3VEQU5uRSxlQUFlLFdBQWYsZUFBZTtrREFBZixlQUFlO2NBRDNCLFVBQVU7NklBT21ELGtCQUFrQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbXBpbGVyLCBJbmplY3RhYmxlLCBJbmplY3RvciwgTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBOZ01vZHVsZVJlZiwgT25EZXN0cm95fSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ZnJvbSwgT2JzZXJ2YWJsZSwgb2YsIFN1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NhdGNoRXJyb3IsIGNvbmNhdE1hcCwgZmlsdGVyLCBtYXAsIG1lcmdlQWxsLCBtZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0xvYWRlZFJvdXRlckNvbmZpZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtFdmVudCwgTmF2aWdhdGlvbkVuZCwgUm91dGVDb25maWdMb2FkRW5kLCBSb3V0ZUNvbmZpZ0xvYWRTdGFydH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJy4vcm91dGVyJztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIGEgcHJlbG9hZGluZyBzdHJhdGVneS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQcmVsb2FkaW5nU3RyYXRlZ3kge1xuICBhYnN0cmFjdCBwcmVsb2FkKHJvdXRlOiBSb3V0ZSwgZm46ICgpID0+IE9ic2VydmFibGU8YW55Pik6IE9ic2VydmFibGU8YW55Pjtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBQcm92aWRlcyBhIHByZWxvYWRpbmcgc3RyYXRlZ3kgdGhhdCBwcmVsb2FkcyBhbGwgbW9kdWxlcyBhcyBxdWlja2x5IGFzIHBvc3NpYmxlLlxuICpcbiAqIGBgYFxuICogUm91dGVNb2R1bGUuZm9yUm9vdChST1VURVMsIHtwcmVsb2FkaW5nU3RyYXRlZ3k6IFByZWxvYWRBbGxNb2R1bGVzfSlcbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFByZWxvYWRBbGxNb2R1bGVzIGltcGxlbWVudHMgUHJlbG9hZGluZ1N0cmF0ZWd5IHtcbiAgcHJlbG9hZChyb3V0ZTogUm91dGUsIGZuOiAoKSA9PiBPYnNlcnZhYmxlPGFueT4pOiBPYnNlcnZhYmxlPGFueT4ge1xuICAgIHJldHVybiBmbigpLnBpcGUoY2F0Y2hFcnJvcigoKSA9PiBvZihudWxsKSkpO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUHJvdmlkZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5IHRoYXQgZG9lcyBub3QgcHJlbG9hZCBhbnkgbW9kdWxlcy5cbiAqXG4gKiBUaGlzIHN0cmF0ZWd5IGlzIGVuYWJsZWQgYnkgZGVmYXVsdC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBOb1ByZWxvYWRpbmcgaW1wbGVtZW50cyBQcmVsb2FkaW5nU3RyYXRlZ3kge1xuICBwcmVsb2FkKHJvdXRlOiBSb3V0ZSwgZm46ICgpID0+IE9ic2VydmFibGU8YW55Pik6IE9ic2VydmFibGU8YW55PiB7XG4gICAgcmV0dXJuIG9mKG51bGwpO1xuICB9XG59XG5cbi8qKlxuICogVGhlIHByZWxvYWRlciBvcHRpbWlzdGljYWxseSBsb2FkcyBhbGwgcm91dGVyIGNvbmZpZ3VyYXRpb25zIHRvXG4gKiBtYWtlIG5hdmlnYXRpb25zIGludG8gbGF6aWx5LWxvYWRlZCBzZWN0aW9ucyBvZiB0aGUgYXBwbGljYXRpb24gZmFzdGVyLlxuICpcbiAqIFRoZSBwcmVsb2FkZXIgcnVucyBpbiB0aGUgYmFja2dyb3VuZC4gV2hlbiB0aGUgcm91dGVyIGJvb3RzdHJhcHMsIHRoZSBwcmVsb2FkZXJcbiAqIHN0YXJ0cyBsaXN0ZW5pbmcgdG8gYWxsIG5hdmlnYXRpb24gZXZlbnRzLiBBZnRlciBldmVyeSBzdWNoIGV2ZW50LCB0aGUgcHJlbG9hZGVyXG4gKiB3aWxsIGNoZWNrIGlmIGFueSBjb25maWd1cmF0aW9ucyBjYW4gYmUgbG9hZGVkIGxhemlseS5cbiAqXG4gKiBJZiBhIHJvdXRlIGlzIHByb3RlY3RlZCBieSBgY2FuTG9hZGAgZ3VhcmRzLCB0aGUgcHJlbG9hZGVkIHdpbGwgbm90IGxvYWQgaXQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgUm91dGVyUHJlbG9hZGVyIGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgcHJpdmF0ZSBsb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcjtcbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb24/OiBTdWJzY3JpcHRpb247XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLCBtb2R1bGVMb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLFxuICAgICAgcHJpdmF0ZSBpbmplY3RvcjogSW5qZWN0b3IsIHByaXZhdGUgcHJlbG9hZGluZ1N0cmF0ZWd5OiBQcmVsb2FkaW5nU3RyYXRlZ3kpIHtcbiAgICBjb25zdCBvblN0YXJ0TG9hZCA9IChyOiBSb3V0ZSkgPT4gcm91dGVyLnRyaWdnZXJFdmVudChuZXcgUm91dGVDb25maWdMb2FkU3RhcnQocikpO1xuICAgIGNvbnN0IG9uRW5kTG9hZCA9IChyOiBSb3V0ZSkgPT4gcm91dGVyLnRyaWdnZXJFdmVudChuZXcgUm91dGVDb25maWdMb2FkRW5kKHIpKTtcblxuICAgIHRoaXMubG9hZGVyID0gbmV3IFJvdXRlckNvbmZpZ0xvYWRlcihtb2R1bGVMb2FkZXIsIGNvbXBpbGVyLCBvblN0YXJ0TG9hZCwgb25FbmRMb2FkKTtcbiAgfVxuXG4gIHNldFVwUHJlbG9hZGluZygpOiB2b2lkIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbiA9XG4gICAgICAgIHRoaXMucm91dGVyLmV2ZW50c1xuICAgICAgICAgICAgLnBpcGUoZmlsdGVyKChlOiBFdmVudCkgPT4gZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpLCBjb25jYXRNYXAoKCkgPT4gdGhpcy5wcmVsb2FkKCkpKVxuICAgICAgICAgICAgLnN1YnNjcmliZSgoKSA9PiB7fSk7XG4gIH1cblxuICBwcmVsb2FkKCk6IE9ic2VydmFibGU8YW55PiB7XG4gICAgY29uc3QgbmdNb2R1bGUgPSB0aGlzLmluamVjdG9yLmdldChOZ01vZHVsZVJlZik7XG4gICAgcmV0dXJuIHRoaXMucHJvY2Vzc1JvdXRlcyhuZ01vZHVsZSwgdGhpcy5yb3V0ZXIuY29uZmlnKTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnN1YnNjcmlwdGlvbikge1xuICAgICAgdGhpcy5zdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NSb3V0ZXMobmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT4sIHJvdXRlczogUm91dGVzKTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gICAgY29uc3QgcmVzOiBPYnNlcnZhYmxlPGFueT5bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgcm91dGUgb2Ygcm91dGVzKSB7XG4gICAgICAvLyB3ZSBhbHJlYWR5IGhhdmUgdGhlIGNvbmZpZyBsb2FkZWQsIGp1c3QgcmVjdXJzZVxuICAgICAgaWYgKHJvdXRlLmxvYWRDaGlsZHJlbiAmJiAhcm91dGUuY2FuTG9hZCAmJiByb3V0ZS5fbG9hZGVkQ29uZmlnKSB7XG4gICAgICAgIGNvbnN0IGNoaWxkQ29uZmlnID0gcm91dGUuX2xvYWRlZENvbmZpZztcbiAgICAgICAgcmVzLnB1c2godGhpcy5wcm9jZXNzUm91dGVzKGNoaWxkQ29uZmlnLm1vZHVsZSwgY2hpbGRDb25maWcucm91dGVzKSk7XG5cbiAgICAgICAgLy8gbm8gY29uZmlnIGxvYWRlZCwgZmV0Y2ggdGhlIGNvbmZpZ1xuICAgICAgfSBlbHNlIGlmIChyb3V0ZS5sb2FkQ2hpbGRyZW4gJiYgIXJvdXRlLmNhbkxvYWQpIHtcbiAgICAgICAgcmVzLnB1c2godGhpcy5wcmVsb2FkQ29uZmlnKG5nTW9kdWxlLCByb3V0ZSkpO1xuXG4gICAgICAgIC8vIHJlY3Vyc2UgaW50byBjaGlsZHJlblxuICAgICAgfSBlbHNlIGlmIChyb3V0ZS5jaGlsZHJlbikge1xuICAgICAgICByZXMucHVzaCh0aGlzLnByb2Nlc3NSb3V0ZXMobmdNb2R1bGUsIHJvdXRlLmNoaWxkcmVuKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmcm9tKHJlcykucGlwZShtZXJnZUFsbCgpLCBtYXAoKF8pID0+IHZvaWQgMCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBwcmVsb2FkQ29uZmlnKG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+LCByb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy5wcmVsb2FkaW5nU3RyYXRlZ3kucHJlbG9hZChyb3V0ZSwgKCkgPT4ge1xuICAgICAgY29uc3QgbG9hZGVkJCA9IHRoaXMubG9hZGVyLmxvYWQobmdNb2R1bGUuaW5qZWN0b3IsIHJvdXRlKTtcbiAgICAgIHJldHVybiBsb2FkZWQkLnBpcGUobWVyZ2VNYXAoKGNvbmZpZzogTG9hZGVkUm91dGVyQ29uZmlnKSA9PiB7XG4gICAgICAgIHJvdXRlLl9sb2FkZWRDb25maWcgPSBjb25maWc7XG4gICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NSb3V0ZXMoY29uZmlnLm1vZHVsZSwgY29uZmlnLnJvdXRlcyk7XG4gICAgICB9KSk7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==