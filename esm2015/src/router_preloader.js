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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3ByZWxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX3ByZWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0VBTUU7O0FBRUYsT0FBTyxFQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLHFCQUFxQixFQUFFLFdBQVcsRUFBWSxNQUFNLGVBQWUsQ0FBQztBQUM1RyxPQUFPLEVBQTJCLElBQUksRUFBRSxFQUFFLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDekQsT0FBTyxFQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFHdEYsT0FBTyxFQUFRLGFBQWEsRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUN4RixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBRzFEOzs7Ozs7R0FNRztBQUNILE1BQU07Q0FFTDtBQUVEOzs7Ozs7Ozs7O0dBVUc7QUFDSCxNQUFNO0lBQ0osT0FBTyxDQUFDLEtBQVksRUFBRSxFQUF5QjtRQUM3QyxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNoRCxDQUFDO0NBQ0Y7QUFFRDs7Ozs7Ozs7R0FRRztBQUNILE1BQU07SUFDSixPQUFPLENBQUMsS0FBWSxFQUFFLEVBQXlCLElBQXFCLE9BQU8sRUFBRSxDQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUN4RjtBQUVEOzs7Ozs7Ozs7OztHQVdHO0FBRUgsSUFBYSxlQUFlLEdBQTVC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QUFFLEdBQUcsRUFBRTtZQUNqRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUEwQixFQUFFLEVBQUU7Z0JBQzFELEtBQUssQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDO2dCQUM3QixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDMUQsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNOLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGLENBQUE7QUEzRFksZUFBZTtJQUQzQixVQUFVLEVBQUU7NkNBTVMsTUFBTSxFQUFnQixxQkFBcUIsRUFBWSxRQUFRO1FBQzdELFFBQVEsRUFBOEIsa0JBQWtCO0dBTm5FLGVBQWUsQ0EyRDNCO1NBM0RZLGVBQWUiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbipAbGljZW5zZVxuKkNvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuKlxuKlVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4qZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuKi9cblxuaW1wb3J0IHtDb21waWxlciwgSW5qZWN0YWJsZSwgSW5qZWN0b3IsIE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgTmdNb2R1bGVSZWYsIE9uRGVzdHJveX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge09ic2VydmFibGUsIFN1YnNjcmlwdGlvbiwgZnJvbSwgb2YgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y2F0Y2hFcnJvciwgY29uY2F0TWFwLCBmaWx0ZXIsIG1hcCwgbWVyZ2VBbGwsIG1lcmdlTWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7TG9hZGVkUm91dGVyQ29uZmlnLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge0V2ZW50LCBOYXZpZ2F0aW9uRW5kLCBSb3V0ZUNvbmZpZ0xvYWRFbmQsIFJvdXRlQ29uZmlnTG9hZFN0YXJ0fSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge1JvdXRlcn0gZnJvbSAnLi9yb3V0ZXInO1xuaW1wb3J0IHtSb3V0ZXJDb25maWdMb2FkZXJ9IGZyb20gJy4vcm91dGVyX2NvbmZpZ19sb2FkZXInO1xuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUHJvdmlkZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5LlxuICpcbiAqIEBleHBlcmltZW50YWxcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFByZWxvYWRpbmdTdHJhdGVneSB7XG4gIGFic3RyYWN0IHByZWxvYWQocm91dGU6IFJvdXRlLCBmbjogKCkgPT4gT2JzZXJ2YWJsZTxhbnk+KTogT2JzZXJ2YWJsZTxhbnk+O1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIGEgcHJlbG9hZGluZyBzdHJhdGVneSB0aGF0IHByZWxvYWRzIGFsbCBtb2R1bGVzIGFzIHF1aWNrbHkgYXMgcG9zc2libGUuXG4gKlxuICogYGBgXG4gKiBSb3V0ZU1vZHVsZS5mb3JSb290KFJPVVRFUywge3ByZWxvYWRpbmdTdHJhdGVneTogUHJlbG9hZEFsbE1vZHVsZXN9KVxuICogYGBgXG4gKlxuICogQGV4cGVyaW1lbnRhbFxuICovXG5leHBvcnQgY2xhc3MgUHJlbG9hZEFsbE1vZHVsZXMgaW1wbGVtZW50cyBQcmVsb2FkaW5nU3RyYXRlZ3kge1xuICBwcmVsb2FkKHJvdXRlOiBSb3V0ZSwgZm46ICgpID0+IE9ic2VydmFibGU8YW55Pik6IE9ic2VydmFibGU8YW55PiB7XG4gICAgcmV0dXJuIGZuKCkucGlwZShjYXRjaEVycm9yKCgpID0+IG9mIChudWxsKSkpO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUHJvdmlkZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5IHRoYXQgZG9lcyBub3QgcHJlbG9hZCBhbnkgbW9kdWxlcy5cbiAqXG4gKiBUaGlzIHN0cmF0ZWd5IGlzIGVuYWJsZWQgYnkgZGVmYXVsdC5cbiAqXG4gKiBAZXhwZXJpbWVudGFsXG4gKi9cbmV4cG9ydCBjbGFzcyBOb1ByZWxvYWRpbmcgaW1wbGVtZW50cyBQcmVsb2FkaW5nU3RyYXRlZ3kge1xuICBwcmVsb2FkKHJvdXRlOiBSb3V0ZSwgZm46ICgpID0+IE9ic2VydmFibGU8YW55Pik6IE9ic2VydmFibGU8YW55PiB7IHJldHVybiBvZiAobnVsbCk7IH1cbn1cblxuLyoqXG4gKiBUaGUgcHJlbG9hZGVyIG9wdGltaXN0aWNhbGx5IGxvYWRzIGFsbCByb3V0ZXIgY29uZmlndXJhdGlvbnMgdG9cbiAqIG1ha2UgbmF2aWdhdGlvbnMgaW50byBsYXppbHktbG9hZGVkIHNlY3Rpb25zIG9mIHRoZSBhcHBsaWNhdGlvbiBmYXN0ZXIuXG4gKlxuICogVGhlIHByZWxvYWRlciBydW5zIGluIHRoZSBiYWNrZ3JvdW5kLiBXaGVuIHRoZSByb3V0ZXIgYm9vdHN0cmFwcywgdGhlIHByZWxvYWRlclxuICogc3RhcnRzIGxpc3RlbmluZyB0byBhbGwgbmF2aWdhdGlvbiBldmVudHMuIEFmdGVyIGV2ZXJ5IHN1Y2ggZXZlbnQsIHRoZSBwcmVsb2FkZXJcbiAqIHdpbGwgY2hlY2sgaWYgYW55IGNvbmZpZ3VyYXRpb25zIGNhbiBiZSBsb2FkZWQgbGF6aWx5LlxuICpcbiAqIElmIGEgcm91dGUgaXMgcHJvdGVjdGVkIGJ5IGBjYW5Mb2FkYCBndWFyZHMsIHRoZSBwcmVsb2FkZWQgd2lsbCBub3QgbG9hZCBpdC5cbiAqXG4gKlxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgUm91dGVyUHJlbG9hZGVyIGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgcHJpdmF0ZSBsb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcjtcbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcm91dGVyOiBSb3V0ZXIsIG1vZHVsZUxvYWRlcjogTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBjb21waWxlcjogQ29tcGlsZXIsXG4gICAgICBwcml2YXRlIGluamVjdG9yOiBJbmplY3RvciwgcHJpdmF0ZSBwcmVsb2FkaW5nU3RyYXRlZ3k6IFByZWxvYWRpbmdTdHJhdGVneSkge1xuICAgIGNvbnN0IG9uU3RhcnRMb2FkID0gKHI6IFJvdXRlKSA9PiByb3V0ZXIudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRTdGFydChyKSk7XG4gICAgY29uc3Qgb25FbmRMb2FkID0gKHI6IFJvdXRlKSA9PiByb3V0ZXIudHJpZ2dlckV2ZW50KG5ldyBSb3V0ZUNvbmZpZ0xvYWRFbmQocikpO1xuXG4gICAgdGhpcy5sb2FkZXIgPSBuZXcgUm91dGVyQ29uZmlnTG9hZGVyKG1vZHVsZUxvYWRlciwgY29tcGlsZXIsIG9uU3RhcnRMb2FkLCBvbkVuZExvYWQpO1xuICB9XG5cbiAgc2V0VXBQcmVsb2FkaW5nKCk6IHZvaWQge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9uID1cbiAgICAgICAgdGhpcy5yb3V0ZXIuZXZlbnRzXG4gICAgICAgICAgICAucGlwZShmaWx0ZXIoKGU6IEV2ZW50KSA9PiBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCksIGNvbmNhdE1hcCgoKSA9PiB0aGlzLnByZWxvYWQoKSkpXG4gICAgICAgICAgICAuc3Vic2NyaWJlKCgpID0+IHt9KTtcbiAgfVxuXG4gIHByZWxvYWQoKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMuaW5qZWN0b3IuZ2V0KE5nTW9kdWxlUmVmKTtcbiAgICByZXR1cm4gdGhpcy5wcm9jZXNzUm91dGVzKG5nTW9kdWxlLCB0aGlzLnJvdXRlci5jb25maWcpO1xuICB9XG5cbiAgLy8gVE9ETyhqYXNvbmFkZW4pOiBUaGlzIGNsYXNzIHJlbGllcyBvbiBjb2RlIGV4dGVybmFsIHRvIHRoZSBjbGFzcyB0byBjYWxsIHNldFVwUHJlbG9hZGluZy4gSWZcbiAgLy8gdGhpcyBoYXNuJ3QgYmVlbiBkb25lLCBuZ09uRGVzdHJveSB3aWxsIGZhaWwgYXMgdGhpcy5zdWJzY3JpcHRpb24gd2lsbCBiZSB1bmRlZmluZWQuIFRoaXNcbiAgLy8gc2hvdWxkIGJlIHJlZmFjdG9yZWQuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQgeyB0aGlzLnN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpOyB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzUm91dGVzKG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+LCByb3V0ZXM6IFJvdXRlcyk6IE9ic2VydmFibGU8dm9pZD4ge1xuICAgIGNvbnN0IHJlczogT2JzZXJ2YWJsZTxhbnk+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHJvdXRlcykge1xuICAgICAgLy8gd2UgYWxyZWFkeSBoYXZlIHRoZSBjb25maWcgbG9hZGVkLCBqdXN0IHJlY3Vyc2VcbiAgICAgIGlmIChyb3V0ZS5sb2FkQ2hpbGRyZW4gJiYgIXJvdXRlLmNhbkxvYWQgJiYgcm91dGUuX2xvYWRlZENvbmZpZykge1xuICAgICAgICBjb25zdCBjaGlsZENvbmZpZyA9IHJvdXRlLl9sb2FkZWRDb25maWc7XG4gICAgICAgIHJlcy5wdXNoKHRoaXMucHJvY2Vzc1JvdXRlcyhjaGlsZENvbmZpZy5tb2R1bGUsIGNoaWxkQ29uZmlnLnJvdXRlcykpO1xuXG4gICAgICAgIC8vIG5vIGNvbmZpZyBsb2FkZWQsIGZldGNoIHRoZSBjb25maWdcbiAgICAgIH0gZWxzZSBpZiAocm91dGUubG9hZENoaWxkcmVuICYmICFyb3V0ZS5jYW5Mb2FkKSB7XG4gICAgICAgIHJlcy5wdXNoKHRoaXMucHJlbG9hZENvbmZpZyhuZ01vZHVsZSwgcm91dGUpKTtcblxuICAgICAgICAvLyByZWN1cnNlIGludG8gY2hpbGRyZW5cbiAgICAgIH0gZWxzZSBpZiAocm91dGUuY2hpbGRyZW4pIHtcbiAgICAgICAgcmVzLnB1c2godGhpcy5wcm9jZXNzUm91dGVzKG5nTW9kdWxlLCByb3V0ZS5jaGlsZHJlbikpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZnJvbShyZXMpLnBpcGUobWVyZ2VBbGwoKSwgbWFwKChfKSA9PiB2b2lkIDApKTtcbiAgfVxuXG4gIHByaXZhdGUgcHJlbG9hZENvbmZpZyhuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55Piwgcm91dGU6IFJvdXRlKTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMucHJlbG9hZGluZ1N0cmF0ZWd5LnByZWxvYWQocm91dGUsICgpID0+IHtcbiAgICAgIGNvbnN0IGxvYWRlZCQgPSB0aGlzLmxvYWRlci5sb2FkKG5nTW9kdWxlLmluamVjdG9yLCByb3V0ZSk7XG4gICAgICByZXR1cm4gbG9hZGVkJC5waXBlKG1lcmdlTWFwKChjb25maWc6IExvYWRlZFJvdXRlckNvbmZpZykgPT4ge1xuICAgICAgICByb3V0ZS5fbG9hZGVkQ29uZmlnID0gY29uZmlnO1xuICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzUm91dGVzKGNvbmZpZy5tb2R1bGUsIGNvbmZpZy5yb3V0ZXMpO1xuICAgICAgfSkpO1xuICAgIH0pO1xuICB9XG59XG4iXX0=