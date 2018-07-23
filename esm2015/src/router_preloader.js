import * as i0 from "@angular/core";
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
/**
 * @description
 *
 * Provides a preloading strategy.
 *
 * @experimental
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
 * @experimental
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
 * @experimental
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
 *
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
}
RouterPreloader.ngInjectableDef = i0.defineInjectable({ token: RouterPreloader, factory: function RouterPreloader_Factory() { return new RouterPreloader(i0.inject(Router), i0.inject(NgModuleFactoryLoader), i0.inject(Compiler), i0.inject(i0.INJECTOR), i0.inject(PreloadingStrategy)); }, providedIn: null });

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3ByZWxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX3ByZWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztFQU1FO0FBRUYsT0FBTyxFQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLHFCQUFxQixFQUFFLFdBQVcsRUFBWSxNQUFNLGVBQWUsQ0FBQztBQUM1RyxPQUFPLEVBQTJCLElBQUksRUFBRSxFQUFFLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDekQsT0FBTyxFQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFHdEYsT0FBTyxFQUFRLGFBQWEsRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUN4RixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBRzFEOzs7Ozs7R0FNRztBQUNILE1BQU07Q0FFTDtBQUVEOzs7Ozs7Ozs7O0dBVUc7QUFDSCxNQUFNO0lBQ0osT0FBTyxDQUFDLEtBQVksRUFBRSxFQUF5QjtRQUM3QyxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNoRCxDQUFDO0NBQ0Y7QUFFRDs7Ozs7Ozs7R0FRRztBQUNILE1BQU07SUFDSixPQUFPLENBQUMsS0FBWSxFQUFFLEVBQXlCLElBQXFCLE9BQU8sRUFBRSxDQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUN4RjtBQUVEOzs7Ozs7Ozs7OztHQVdHO0FBRUgsTUFBTTtJQUtKLFlBQ1ks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QUU7WUFDakQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMzRCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBMEIsRUFBRSxFQUFFO2dCQUMxRCxLQUFLLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQztnQkFDN0IsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFELENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7OytEQTNEVSxlQUFlLDJEQUFmLGVBQWUsV0FNTixNQUFNLGFBQWdCLHFCQUFxQixhQUFZLFFBQVEscUNBQ3ZCLGtCQUFrQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuKkBsaWNlbnNlXG4qQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4qXG4qVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbipmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4qL1xuXG5pbXBvcnQge0NvbXBpbGVyLCBJbmplY3RhYmxlLCBJbmplY3RvciwgTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBOZ01vZHVsZVJlZiwgT25EZXN0cm95fSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgU3Vic2NyaXB0aW9uLCBmcm9tLCBvZiB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjYXRjaEVycm9yLCBjb25jYXRNYXAsIGZpbHRlciwgbWFwLCBtZXJnZUFsbCwgbWVyZ2VNYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtMb2FkZWRSb3V0ZXJDb25maWcsIFJvdXRlLCBSb3V0ZXN9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7RXZlbnQsIE5hdmlnYXRpb25FbmQsIFJvdXRlQ29uZmlnTG9hZEVuZCwgUm91dGVDb25maWdMb2FkU3RhcnR9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7Um91dGVyfSBmcm9tICcuL3JvdXRlcic7XG5pbXBvcnQge1JvdXRlckNvbmZpZ0xvYWRlcn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBQcm92aWRlcyBhIHByZWxvYWRpbmcgc3RyYXRlZ3kuXG4gKlxuICogQGV4cGVyaW1lbnRhbFxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUHJlbG9hZGluZ1N0cmF0ZWd5IHtcbiAgYWJzdHJhY3QgcHJlbG9hZChyb3V0ZTogUm91dGUsIGZuOiAoKSA9PiBPYnNlcnZhYmxlPGFueT4pOiBPYnNlcnZhYmxlPGFueT47XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUHJvdmlkZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5IHRoYXQgcHJlbG9hZHMgYWxsIG1vZHVsZXMgYXMgcXVpY2tseSBhcyBwb3NzaWJsZS5cbiAqXG4gKiBgYGBcbiAqIFJvdXRlTW9kdWxlLmZvclJvb3QoUk9VVEVTLCB7cHJlbG9hZGluZ1N0cmF0ZWd5OiBQcmVsb2FkQWxsTW9kdWxlc30pXG4gKiBgYGBcbiAqXG4gKiBAZXhwZXJpbWVudGFsXG4gKi9cbmV4cG9ydCBjbGFzcyBQcmVsb2FkQWxsTW9kdWxlcyBpbXBsZW1lbnRzIFByZWxvYWRpbmdTdHJhdGVneSB7XG4gIHByZWxvYWQocm91dGU6IFJvdXRlLCBmbjogKCkgPT4gT2JzZXJ2YWJsZTxhbnk+KTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgICByZXR1cm4gZm4oKS5waXBlKGNhdGNoRXJyb3IoKCkgPT4gb2YgKG51bGwpKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBQcm92aWRlcyBhIHByZWxvYWRpbmcgc3RyYXRlZ3kgdGhhdCBkb2VzIG5vdCBwcmVsb2FkIGFueSBtb2R1bGVzLlxuICpcbiAqIFRoaXMgc3RyYXRlZ3kgaXMgZW5hYmxlZCBieSBkZWZhdWx0LlxuICpcbiAqIEBleHBlcmltZW50YWxcbiAqL1xuZXhwb3J0IGNsYXNzIE5vUHJlbG9hZGluZyBpbXBsZW1lbnRzIFByZWxvYWRpbmdTdHJhdGVneSB7XG4gIHByZWxvYWQocm91dGU6IFJvdXRlLCBmbjogKCkgPT4gT2JzZXJ2YWJsZTxhbnk+KTogT2JzZXJ2YWJsZTxhbnk+IHsgcmV0dXJuIG9mIChudWxsKTsgfVxufVxuXG4vKipcbiAqIFRoZSBwcmVsb2FkZXIgb3B0aW1pc3RpY2FsbHkgbG9hZHMgYWxsIHJvdXRlciBjb25maWd1cmF0aW9ucyB0b1xuICogbWFrZSBuYXZpZ2F0aW9ucyBpbnRvIGxhemlseS1sb2FkZWQgc2VjdGlvbnMgb2YgdGhlIGFwcGxpY2F0aW9uIGZhc3Rlci5cbiAqXG4gKiBUaGUgcHJlbG9hZGVyIHJ1bnMgaW4gdGhlIGJhY2tncm91bmQuIFdoZW4gdGhlIHJvdXRlciBib290c3RyYXBzLCB0aGUgcHJlbG9hZGVyXG4gKiBzdGFydHMgbGlzdGVuaW5nIHRvIGFsbCBuYXZpZ2F0aW9uIGV2ZW50cy4gQWZ0ZXIgZXZlcnkgc3VjaCBldmVudCwgdGhlIHByZWxvYWRlclxuICogd2lsbCBjaGVjayBpZiBhbnkgY29uZmlndXJhdGlvbnMgY2FuIGJlIGxvYWRlZCBsYXppbHkuXG4gKlxuICogSWYgYSByb3V0ZSBpcyBwcm90ZWN0ZWQgYnkgYGNhbkxvYWRgIGd1YXJkcywgdGhlIHByZWxvYWRlZCB3aWxsIG5vdCBsb2FkIGl0LlxuICpcbiAqXG4gKi9cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBSb3V0ZXJQcmVsb2FkZXIgaW1wbGVtZW50cyBPbkRlc3Ryb3kge1xuICBwcml2YXRlIGxvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyO1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb24gITogU3Vic2NyaXB0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZXI6IFJvdXRlciwgbW9kdWxlTG9hZGVyOiBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIGNvbXBpbGVyOiBDb21waWxlcixcbiAgICAgIHByaXZhdGUgaW5qZWN0b3I6IEluamVjdG9yLCBwcml2YXRlIHByZWxvYWRpbmdTdHJhdGVneTogUHJlbG9hZGluZ1N0cmF0ZWd5KSB7XG4gICAgY29uc3Qgb25TdGFydExvYWQgPSAocjogUm91dGUpID0+IHJvdXRlci50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZFN0YXJ0KHIpKTtcbiAgICBjb25zdCBvbkVuZExvYWQgPSAocjogUm91dGUpID0+IHJvdXRlci50cmlnZ2VyRXZlbnQobmV3IFJvdXRlQ29uZmlnTG9hZEVuZChyKSk7XG5cbiAgICB0aGlzLmxvYWRlciA9IG5ldyBSb3V0ZXJDb25maWdMb2FkZXIobW9kdWxlTG9hZGVyLCBjb21waWxlciwgb25TdGFydExvYWQsIG9uRW5kTG9hZCk7XG4gIH1cblxuICBzZXRVcFByZWxvYWRpbmcoKTogdm9pZCB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb24gPVxuICAgICAgICB0aGlzLnJvdXRlci5ldmVudHNcbiAgICAgICAgICAgIC5waXBlKGZpbHRlcigoZTogRXZlbnQpID0+IGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSwgY29uY2F0TWFwKCgpID0+IHRoaXMucHJlbG9hZCgpKSlcbiAgICAgICAgICAgIC5zdWJzY3JpYmUoKCkgPT4ge30pO1xuICB9XG5cbiAgcHJlbG9hZCgpOiBPYnNlcnZhYmxlPGFueT4ge1xuICAgIGNvbnN0IG5nTW9kdWxlID0gdGhpcy5pbmplY3Rvci5nZXQoTmdNb2R1bGVSZWYpO1xuICAgIHJldHVybiB0aGlzLnByb2Nlc3NSb3V0ZXMobmdNb2R1bGUsIHRoaXMucm91dGVyLmNvbmZpZyk7XG4gIH1cblxuICAvLyBUT0RPKGphc29uYWRlbik6IFRoaXMgY2xhc3MgcmVsaWVzIG9uIGNvZGUgZXh0ZXJuYWwgdG8gdGhlIGNsYXNzIHRvIGNhbGwgc2V0VXBQcmVsb2FkaW5nLiBJZlxuICAvLyB0aGlzIGhhc24ndCBiZWVuIGRvbmUsIG5nT25EZXN0cm95IHdpbGwgZmFpbCBhcyB0aGlzLnN1YnNjcmlwdGlvbiB3aWxsIGJlIHVuZGVmaW5lZC4gVGhpc1xuICAvLyBzaG91bGQgYmUgcmVmYWN0b3JlZC5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7IHRoaXMuc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7IH1cblxuICBwcml2YXRlIHByb2Nlc3NSb3V0ZXMobmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT4sIHJvdXRlczogUm91dGVzKTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gICAgY29uc3QgcmVzOiBPYnNlcnZhYmxlPGFueT5bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgcm91dGUgb2Ygcm91dGVzKSB7XG4gICAgICAvLyB3ZSBhbHJlYWR5IGhhdmUgdGhlIGNvbmZpZyBsb2FkZWQsIGp1c3QgcmVjdXJzZVxuICAgICAgaWYgKHJvdXRlLmxvYWRDaGlsZHJlbiAmJiAhcm91dGUuY2FuTG9hZCAmJiByb3V0ZS5fbG9hZGVkQ29uZmlnKSB7XG4gICAgICAgIGNvbnN0IGNoaWxkQ29uZmlnID0gcm91dGUuX2xvYWRlZENvbmZpZztcbiAgICAgICAgcmVzLnB1c2godGhpcy5wcm9jZXNzUm91dGVzKGNoaWxkQ29uZmlnLm1vZHVsZSwgY2hpbGRDb25maWcucm91dGVzKSk7XG5cbiAgICAgICAgLy8gbm8gY29uZmlnIGxvYWRlZCwgZmV0Y2ggdGhlIGNvbmZpZ1xuICAgICAgfSBlbHNlIGlmIChyb3V0ZS5sb2FkQ2hpbGRyZW4gJiYgIXJvdXRlLmNhbkxvYWQpIHtcbiAgICAgICAgcmVzLnB1c2godGhpcy5wcmVsb2FkQ29uZmlnKG5nTW9kdWxlLCByb3V0ZSkpO1xuXG4gICAgICAgIC8vIHJlY3Vyc2UgaW50byBjaGlsZHJlblxuICAgICAgfSBlbHNlIGlmIChyb3V0ZS5jaGlsZHJlbikge1xuICAgICAgICByZXMucHVzaCh0aGlzLnByb2Nlc3NSb3V0ZXMobmdNb2R1bGUsIHJvdXRlLmNoaWxkcmVuKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmcm9tKHJlcykucGlwZShtZXJnZUFsbCgpLCBtYXAoKF8pID0+IHZvaWQgMCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBwcmVsb2FkQ29uZmlnKG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+LCByb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy5wcmVsb2FkaW5nU3RyYXRlZ3kucHJlbG9hZChyb3V0ZSwgKCkgPT4ge1xuICAgICAgY29uc3QgbG9hZGVkJCA9IHRoaXMubG9hZGVyLmxvYWQobmdNb2R1bGUuaW5qZWN0b3IsIHJvdXRlKTtcbiAgICAgIHJldHVybiBsb2FkZWQkLnBpcGUobWVyZ2VNYXAoKGNvbmZpZzogTG9hZGVkUm91dGVyQ29uZmlnKSA9PiB7XG4gICAgICAgIHJvdXRlLl9sb2FkZWRDb25maWcgPSBjb25maWc7XG4gICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NSb3V0ZXMoY29uZmlnLm1vZHVsZSwgY29uZmlnLnJvdXRlcyk7XG4gICAgICB9KSk7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==