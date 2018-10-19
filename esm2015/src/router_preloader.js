import { Compiler, Injectable, Injector, NgModuleFactoryLoader, NgModuleRef } from '@angular/core';
import { from, of } from 'rxjs';
import { catchError, concatMap, filter, map, mergeAll, mergeMap } from 'rxjs/operators';
import { NavigationEnd, RouteConfigLoadEnd, RouteConfigLoadStart } from './events';
import { Router } from './router';
import { RouterConfigLoader } from './router_config_loader';
import * as i0 from "@angular/core";
/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
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
        return fn().pipe(catchError(() => of(null)));
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
        const onStartLoad = (r) => router.triggerEvent(new RouteConfigLoadStart(r));
        /** @type {?} */
        const onEndLoad = (r) => router.triggerEvent(new RouteConfigLoadEnd(r));
        this.loader = new RouterConfigLoader(moduleLoader, compiler, onStartLoad, onEndLoad);
    }
    /**
     * @return {?}
     */
    setUpPreloading() {
        this.subscription =
            this.router.events
                .pipe(filter((e) => e instanceof NavigationEnd), concatMap(() => this.preload()))
                .subscribe(() => { });
    }
    /**
     * @return {?}
     */
    preload() {
        /** @type {?} */
        const ngModule = this.injector.get(NgModuleRef);
        return this.processRoutes(ngModule, this.router.config);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() { this.subscription.unsubscribe(); }
    /**
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
        return from(res).pipe(mergeAll(), map((_) => void 0));
    }
    /**
     * @param {?} ngModule
     * @param {?} route
     * @return {?}
     */
    preloadConfig(ngModule, route) {
        return this.preloadingStrategy.preload(route, () => {
            /** @type {?} */
            const loaded$ = this.loader.load(ngModule.injector, route);
            return loaded$.pipe(mergeMap((config) => {
                route._loadedConfig = config;
                return this.processRoutes(config.module, config.routes);
            }));
        });
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
RouterPreloader.ngInjectableDef = i0.defineInjectable({ token: RouterPreloader, factory: function RouterPreloader_Factory(t) { return new (t || RouterPreloader)(i0.inject(Router), i0.inject(NgModuleFactoryLoader), i0.inject(Compiler), i0.inject(i0.INJECTOR), i0.inject(PreloadingStrategy)); }, providedIn: null });
if (false) {
    /** @type {?} */
    RouterPreloader.prototype.loader;
    /** @type {?} */
    RouterPreloader.prototype.subscription;
    /** @type {?} */
    RouterPreloader.prototype.router;
    /** @type {?} */
    RouterPreloader.prototype.injector;
    /** @type {?} */
    RouterPreloader.prototype.preloadingStrategy;
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3ByZWxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX3ByZWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFRQSxPQUFPLEVBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUscUJBQXFCLEVBQUUsV0FBVyxFQUFZLE1BQU0sZUFBZSxDQUFDO0FBQzVHLE9BQU8sRUFBMkIsSUFBSSxFQUFFLEVBQUUsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUN6RCxPQUFPLEVBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUd0RixPQUFPLEVBQVEsYUFBYSxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ3hGLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDaEMsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sd0JBQXdCLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQVUxRCxNQUFNLE9BQWdCLGtCQUFrQjtDQUV2Qzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBYUQsTUFBTSxPQUFPLGlCQUFpQjs7Ozs7O0lBQzVCLE9BQU8sQ0FBQyxLQUFZLEVBQUUsRUFBeUI7UUFDN0MsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDL0M7Q0FDRjs7Ozs7Ozs7OztBQVdELE1BQU0sT0FBTyxZQUFZOzs7Ozs7SUFDdkIsT0FBTyxDQUFDLEtBQVksRUFBRSxFQUF5QixJQUFxQixPQUFPLEVBQUUsQ0FBRSxJQUFJLENBQUMsQ0FBQyxFQUFFO0NBQ3hGOzs7Ozs7Ozs7Ozs7O0FBZUQsTUFB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S0FBSyxDQUFDLENBQUM7WUFDM0QsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQTBCLEVBQUUsRUFBRTtnQkFDMUQsS0FBSyxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUM7Z0JBQzdCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUN6RCxDQUFDLENBQUMsQ0FBQztTQUNMLENBQUMsQ0FBQzs7OztZQTNETixVQUFVOzs7O1lBekRILE1BQU07WUFOMEIscUJBQXFCO1lBQXJELFFBQVE7WUFBYyxRQUFRO1lBdUV3QixrQkFBa0I7OytEQVBuRSxlQUFlLGtFQUFmLGVBQWUsWUFNTixNQUFNLGFBQWdCLHFCQUFxQixhQUFZLFFBQVEscUNBQ3ZCLGtCQUFrQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuKkBsaWNlbnNlXG4qQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4qXG4qVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbipmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4qL1xuXG5pbXBvcnQge0NvbXBpbGVyLCBJbmplY3RhYmxlLCBJbmplY3RvciwgTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBOZ01vZHVsZVJlZiwgT25EZXN0cm95fSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgU3Vic2NyaXB0aW9uLCBmcm9tLCBvZiB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjYXRjaEVycm9yLCBjb25jYXRNYXAsIGZpbHRlciwgbWFwLCBtZXJnZUFsbCwgbWVyZ2VNYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtMb2FkZWRSb3V0ZXJDb25maWcsIFJvdXRlLCBSb3V0ZXN9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7RXZlbnQsIE5hdmlnYXRpb25FbmQsIFJvdXRlQ29uZmlnTG9hZEVuZCwgUm91dGVDb25maWdMb2FkU3RhcnR9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7Um91dGVyfSBmcm9tICcuL3JvdXRlcic7XG5pbXBvcnQge1JvdXRlckNvbmZpZ0xvYWRlcn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBQcm92aWRlcyBhIHByZWxvYWRpbmcgc3RyYXRlZ3kuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUHJlbG9hZGluZ1N0cmF0ZWd5IHtcbiAgYWJzdHJhY3QgcHJlbG9hZChyb3V0ZTogUm91dGUsIGZuOiAoKSA9PiBPYnNlcnZhYmxlPGFueT4pOiBPYnNlcnZhYmxlPGFueT47XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUHJvdmlkZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5IHRoYXQgcHJlbG9hZHMgYWxsIG1vZHVsZXMgYXMgcXVpY2tseSBhcyBwb3NzaWJsZS5cbiAqXG4gKiBgYGBcbiAqIFJvdXRlTW9kdWxlLmZvclJvb3QoUk9VVEVTLCB7cHJlbG9hZGluZ1N0cmF0ZWd5OiBQcmVsb2FkQWxsTW9kdWxlc30pXG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBQcmVsb2FkQWxsTW9kdWxlcyBpbXBsZW1lbnRzIFByZWxvYWRpbmdTdHJhdGVneSB7XG4gIHByZWxvYWQocm91dGU6IFJvdXRlLCBmbjogKCkgPT4gT2JzZXJ2YWJsZTxhbnk+KTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgICByZXR1cm4gZm4oKS5waXBlKGNhdGNoRXJyb3IoKCkgPT4gb2YgKG51bGwpKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBQcm92aWRlcyBhIHByZWxvYWRpbmcgc3RyYXRlZ3kgdGhhdCBkb2VzIG5vdCBwcmVsb2FkIGFueSBtb2R1bGVzLlxuICpcbiAqIFRoaXMgc3RyYXRlZ3kgaXMgZW5hYmxlZCBieSBkZWZhdWx0LlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIE5vUHJlbG9hZGluZyBpbXBsZW1lbnRzIFByZWxvYWRpbmdTdHJhdGVneSB7XG4gIHByZWxvYWQocm91dGU6IFJvdXRlLCBmbjogKCkgPT4gT2JzZXJ2YWJsZTxhbnk+KTogT2JzZXJ2YWJsZTxhbnk+IHsgcmV0dXJuIG9mIChudWxsKTsgfVxufVxuXG4vKipcbiAqIFRoZSBwcmVsb2FkZXIgb3B0aW1pc3RpY2FsbHkgbG9hZHMgYWxsIHJvdXRlciBjb25maWd1cmF0aW9ucyB0b1xuICogbWFrZSBuYXZpZ2F0aW9ucyBpbnRvIGxhemlseS1sb2FkZWQgc2VjdGlvbnMgb2YgdGhlIGFwcGxpY2F0aW9uIGZhc3Rlci5cbiAqXG4gKiBUaGUgcHJlbG9hZGVyIHJ1bnMgaW4gdGhlIGJhY2tncm91bmQuIFdoZW4gdGhlIHJvdXRlciBib290c3RyYXBzLCB0aGUgcHJlbG9hZGVyXG4gKiBzdGFydHMgbGlzdGVuaW5nIHRvIGFsbCBuYXZpZ2F0aW9uIGV2ZW50cy4gQWZ0ZXIgZXZlcnkgc3VjaCBldmVudCwgdGhlIHByZWxvYWRlclxuICogd2lsbCBjaGVjayBpZiBhbnkgY29uZmlndXJhdGlvbnMgY2FuIGJlIGxvYWRlZCBsYXppbHkuXG4gKlxuICogSWYgYSByb3V0ZSBpcyBwcm90ZWN0ZWQgYnkgYGNhbkxvYWRgIGd1YXJkcywgdGhlIHByZWxvYWRlZCB3aWxsIG5vdCBsb2FkIGl0LlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIFJvdXRlclByZWxvYWRlciBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIHByaXZhdGUgbG9hZGVyOiBSb3V0ZXJDb25maWdMb2FkZXI7XG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBwcml2YXRlIHN1YnNjcmlwdGlvbiAhOiBTdWJzY3JpcHRpb247XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLCBtb2R1bGVMb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLFxuICAgICAgcHJpdmF0ZSBpbmplY3RvcjogSW5qZWN0b3IsIHByaXZhdGUgcHJlbG9hZGluZ1N0cmF0ZWd5OiBQcmVsb2FkaW5nU3RyYXRlZ3kpIHtcbiAgICBjb25zdCBvblN0YXJ0TG9hZCA9IChyOiBSb3V0ZSkgPT4gcm91dGVyLnRyaWdnZXJFdmVudChuZXcgUm91dGVDb25maWdMb2FkU3RhcnQocikpO1xuICAgIGNvbnN0IG9uRW5kTG9hZCA9IChyOiBSb3V0ZSkgPT4gcm91dGVyLnRyaWdnZXJFdmVudChuZXcgUm91dGVDb25maWdMb2FkRW5kKHIpKTtcblxuICAgIHRoaXMubG9hZGVyID0gbmV3IFJvdXRlckNvbmZpZ0xvYWRlcihtb2R1bGVMb2FkZXIsIGNvbXBpbGVyLCBvblN0YXJ0TG9hZCwgb25FbmRMb2FkKTtcbiAgfVxuXG4gIHNldFVwUHJlbG9hZGluZygpOiB2b2lkIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbiA9XG4gICAgICAgIHRoaXMucm91dGVyLmV2ZW50c1xuICAgICAgICAgICAgLnBpcGUoZmlsdGVyKChlOiBFdmVudCkgPT4gZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpLCBjb25jYXRNYXAoKCkgPT4gdGhpcy5wcmVsb2FkKCkpKVxuICAgICAgICAgICAgLnN1YnNjcmliZSgoKSA9PiB7fSk7XG4gIH1cblxuICBwcmVsb2FkKCk6IE9ic2VydmFibGU8YW55PiB7XG4gICAgY29uc3QgbmdNb2R1bGUgPSB0aGlzLmluamVjdG9yLmdldChOZ01vZHVsZVJlZik7XG4gICAgcmV0dXJuIHRoaXMucHJvY2Vzc1JvdXRlcyhuZ01vZHVsZSwgdGhpcy5yb3V0ZXIuY29uZmlnKTtcbiAgfVxuXG4gIC8vIFRPRE8oamFzb25hZGVuKTogVGhpcyBjbGFzcyByZWxpZXMgb24gY29kZSBleHRlcm5hbCB0byB0aGUgY2xhc3MgdG8gY2FsbCBzZXRVcFByZWxvYWRpbmcuIElmXG4gIC8vIHRoaXMgaGFzbid0IGJlZW4gZG9uZSwgbmdPbkRlc3Ryb3kgd2lsbCBmYWlsIGFzIHRoaXMuc3Vic2NyaXB0aW9uIHdpbGwgYmUgdW5kZWZpbmVkLiBUaGlzXG4gIC8vIHNob3VsZCBiZSByZWZhY3RvcmVkLlxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHsgdGhpcy5zdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTsgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc1JvdXRlcyhuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55Piwgcm91dGVzOiBSb3V0ZXMpOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgICBjb25zdCByZXM6IE9ic2VydmFibGU8YW55PltdID0gW107XG4gICAgZm9yIChjb25zdCByb3V0ZSBvZiByb3V0ZXMpIHtcbiAgICAgIC8vIHdlIGFscmVhZHkgaGF2ZSB0aGUgY29uZmlnIGxvYWRlZCwganVzdCByZWN1cnNlXG4gICAgICBpZiAocm91dGUubG9hZENoaWxkcmVuICYmICFyb3V0ZS5jYW5Mb2FkICYmIHJvdXRlLl9sb2FkZWRDb25maWcpIHtcbiAgICAgICAgY29uc3QgY2hpbGRDb25maWcgPSByb3V0ZS5fbG9hZGVkQ29uZmlnO1xuICAgICAgICByZXMucHVzaCh0aGlzLnByb2Nlc3NSb3V0ZXMoY2hpbGRDb25maWcubW9kdWxlLCBjaGlsZENvbmZpZy5yb3V0ZXMpKTtcblxuICAgICAgICAvLyBubyBjb25maWcgbG9hZGVkLCBmZXRjaCB0aGUgY29uZmlnXG4gICAgICB9IGVsc2UgaWYgKHJvdXRlLmxvYWRDaGlsZHJlbiAmJiAhcm91dGUuY2FuTG9hZCkge1xuICAgICAgICByZXMucHVzaCh0aGlzLnByZWxvYWRDb25maWcobmdNb2R1bGUsIHJvdXRlKSk7XG5cbiAgICAgICAgLy8gcmVjdXJzZSBpbnRvIGNoaWxkcmVuXG4gICAgICB9IGVsc2UgaWYgKHJvdXRlLmNoaWxkcmVuKSB7XG4gICAgICAgIHJlcy5wdXNoKHRoaXMucHJvY2Vzc1JvdXRlcyhuZ01vZHVsZSwgcm91dGUuY2hpbGRyZW4pKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZyb20ocmVzKS5waXBlKG1lcmdlQWxsKCksIG1hcCgoXykgPT4gdm9pZCAwKSk7XG4gIH1cblxuICBwcml2YXRlIHByZWxvYWRDb25maWcobmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT4sIHJvdXRlOiBSb3V0ZSk6IE9ic2VydmFibGU8dm9pZD4ge1xuICAgIHJldHVybiB0aGlzLnByZWxvYWRpbmdTdHJhdGVneS5wcmVsb2FkKHJvdXRlLCAoKSA9PiB7XG4gICAgICBjb25zdCBsb2FkZWQkID0gdGhpcy5sb2FkZXIubG9hZChuZ01vZHVsZS5pbmplY3Rvciwgcm91dGUpO1xuICAgICAgcmV0dXJuIGxvYWRlZCQucGlwZShtZXJnZU1hcCgoY29uZmlnOiBMb2FkZWRSb3V0ZXJDb25maWcpID0+IHtcbiAgICAgICAgcm91dGUuX2xvYWRlZENvbmZpZyA9IGNvbmZpZztcbiAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1JvdXRlcyhjb25maWcubW9kdWxlLCBjb25maWcucm91dGVzKTtcbiAgICAgIH0pKTtcbiAgICB9KTtcbiAgfVxufVxuIl19