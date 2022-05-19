/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Compiler, createEnvironmentInjector, EnvironmentInjector, Injectable } from '@angular/core';
import { from, of } from 'rxjs';
import { catchError, concatMap, filter, mergeAll, mergeMap } from 'rxjs/operators';
import { NavigationEnd } from './events';
import { Router } from './router';
import { RouterConfigLoader } from './router_config_loader';
import * as i0 from "@angular/core";
import * as i1 from "./router";
import * as i2 from "./router_config_loader";
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
 * RouterModule.forRoot(ROUTES, {preloadingStrategy: PreloadAllModules})
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
    constructor(router, compiler, injector, preloadingStrategy, loader) {
        this.router = router;
        this.injector = injector;
        this.preloadingStrategy = preloadingStrategy;
        this.loader = loader;
    }
    setUpPreloading() {
        this.subscription =
            this.router.events
                .pipe(filter((e) => e instanceof NavigationEnd), concatMap(() => this.preload()))
                .subscribe(() => { });
    }
    preload() {
        return this.processRoutes(this.injector, this.router.config);
    }
    /** @nodoc */
    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
    processRoutes(injector, routes) {
        const res = [];
        for (const route of routes) {
            if (route.providers && !route._injector) {
                route._injector =
                    createEnvironmentInjector(route.providers, injector, `Route: ${route.path}`);
            }
            const injectorForCurrentRoute = route._injector ?? injector;
            const injectorForChildren = route._loadedInjector ?? injectorForCurrentRoute;
            if ((route.loadChildren && !route._loadedRoutes) ||
                (route.loadComponent && !route._loadedComponent)) {
                res.push(this.preloadConfig(injectorForCurrentRoute, route));
            }
            else if (route.children || route._loadedRoutes) {
                res.push(this.processRoutes(injectorForChildren, (route.children ?? route._loadedRoutes)));
            }
        }
        return from(res).pipe(mergeAll());
    }
    preloadConfig(injector, route) {
        return this.preloadingStrategy.preload(route, () => {
            let loadedChildren$;
            if (route.loadChildren && route.canLoad === undefined) {
                loadedChildren$ = this.loader.loadChildren(injector, route);
            }
            else {
                loadedChildren$ = of(null);
            }
            const recursiveLoadChildren$ = loadedChildren$.pipe(mergeMap((config) => {
                if (config === null) {
                    return of(void 0);
                }
                route._loadedRoutes = config.routes;
                route._loadedInjector = config.injector;
                // If the loaded config was a module, use that as the module/module injector going
                // forward. Otherwise, continue using the current module/module injector.
                return this.processRoutes(config.injector ?? injector, config.routes);
            }));
            if (route.loadComponent && !route._loadedComponent) {
                const loadComponent$ = this.loader.loadComponent(route);
                return from([recursiveLoadChildren$, loadComponent$]).pipe(mergeAll());
            }
            else {
                return recursiveLoadChildren$;
            }
        });
    }
}
RouterPreloader.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.0.0-rc.1+sha-2e96ced", ngImport: i0, type: RouterPreloader, deps: [{ token: i1.Router }, { token: i0.Compiler }, { token: i0.EnvironmentInjector }, { token: PreloadingStrategy }, { token: i2.RouterConfigLoader }], target: i0.ɵɵFactoryTarget.Injectable });
RouterPreloader.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.0.0-rc.1+sha-2e96ced", ngImport: i0, type: RouterPreloader });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.0.0-rc.1+sha-2e96ced", ngImport: i0, type: RouterPreloader, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i1.Router }, { type: i0.Compiler }, { type: i0.EnvironmentInjector }, { type: PreloadingStrategy }, { type: i2.RouterConfigLoader }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3ByZWxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX3ByZWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsUUFBUSxFQUFFLHlCQUF5QixFQUFFLG1CQUFtQixFQUFFLFVBQVUsRUFBWSxNQUFNLGVBQWUsQ0FBQztBQUM5RyxPQUFPLEVBQUMsSUFBSSxFQUFjLEVBQUUsRUFBZSxNQUFNLE1BQU0sQ0FBQztBQUN4RCxPQUFPLEVBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQWMsUUFBUSxFQUFFLFFBQVEsRUFBTSxNQUFNLGdCQUFnQixDQUFDO0FBRWxHLE9BQU8sRUFBUSxhQUFhLEVBQTJDLE1BQU0sVUFBVSxDQUFDO0FBRXhGLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDaEMsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sd0JBQXdCLENBQUM7Ozs7QUFHMUQ7Ozs7OztHQU1HO0FBQ0gsTUFBTSxPQUFnQixrQkFBa0I7Q0FFdkM7QUFFRDs7Ozs7Ozs7OztHQVVHO0FBQ0gsTUFBTSxPQUFPLGlCQUFpQjtJQUM1QixPQUFPLENBQUMsS0FBWSxFQUFFLEVBQXlCO1FBQzdDLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9DLENBQUM7Q0FDRjtBQUVEOzs7Ozs7OztHQVFHO0FBQ0gsTUFBTSxPQUFPLFlBQVk7SUFDdkIsT0FBTyxDQUFDLEtBQVksRUFBRSxFQUF5QjtRQUM3QyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixDQUFDO0NBQ0Y7QUFFRDs7Ozs7Ozs7Ozs7R0FXRztBQUVILE1BQU0sT0FBTyxlQUFlO0lB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TSxzQkFBc0IsR0FDeEIsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUErQixFQUFFLEVBQUU7Z0JBQ2hFLElBQUksTUFBTSxLQUFLLElBQUksRUFBRTtvQkFDbkIsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztpQkFDbkI7Z0JBQ0QsS0FBSyxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO2dCQUNwQyxLQUFLLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7Z0JBQ3hDLGtGQUFrRjtnQkFDbEYseUVBQXlFO2dCQUN6RSxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxRQUFRLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDUixJQUFJLEtBQUssQ0FBQyxhQUFhLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUU7Z0JBQ2xELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN4RCxPQUFPLElBQUksQ0FBQyxDQUFDLHNCQUFzQixFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7YUFDeEU7aUJBQU07Z0JBQ0wsT0FBTyxzQkFBc0IsQ0FBQzthQUMvQjtRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQzs7dUhBekVVLGVBQWUsbUdBS00sa0JBQWtCOzJIQUx2QyxlQUFlO3NHQUFmLGVBQWU7a0JBRDNCLFVBQVU7d0lBTXVCLGtCQUFrQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbXBpbGVyLCBjcmVhdGVFbnZpcm9ubWVudEluamVjdG9yLCBFbnZpcm9ubWVudEluamVjdG9yLCBJbmplY3RhYmxlLCBPbkRlc3Ryb3l9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtmcm9tLCBPYnNlcnZhYmxlLCBvZiwgU3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y2F0Y2hFcnJvciwgY29uY2F0TWFwLCBmaWx0ZXIsIG1hcCwgbWFwVG8sIG1lcmdlQWxsLCBtZXJnZU1hcCwgdGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7RXZlbnQsIE5hdmlnYXRpb25FbmQsIFJvdXRlQ29uZmlnTG9hZEVuZCwgUm91dGVDb25maWdMb2FkU3RhcnR9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7TG9hZGVkUm91dGVyQ29uZmlnLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge1JvdXRlcn0gZnJvbSAnLi9yb3V0ZXInO1xuaW1wb3J0IHtSb3V0ZXJDb25maWdMb2FkZXJ9IGZyb20gJy4vcm91dGVyX2NvbmZpZ19sb2FkZXInO1xuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUHJvdmlkZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5LlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFByZWxvYWRpbmdTdHJhdGVneSB7XG4gIGFic3RyYWN0IHByZWxvYWQocm91dGU6IFJvdXRlLCBmbjogKCkgPT4gT2JzZXJ2YWJsZTxhbnk+KTogT2JzZXJ2YWJsZTxhbnk+O1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIGEgcHJlbG9hZGluZyBzdHJhdGVneSB0aGF0IHByZWxvYWRzIGFsbCBtb2R1bGVzIGFzIHF1aWNrbHkgYXMgcG9zc2libGUuXG4gKlxuICogYGBgXG4gKiBSb3V0ZXJNb2R1bGUuZm9yUm9vdChST1VURVMsIHtwcmVsb2FkaW5nU3RyYXRlZ3k6IFByZWxvYWRBbGxNb2R1bGVzfSlcbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFByZWxvYWRBbGxNb2R1bGVzIGltcGxlbWVudHMgUHJlbG9hZGluZ1N0cmF0ZWd5IHtcbiAgcHJlbG9hZChyb3V0ZTogUm91dGUsIGZuOiAoKSA9PiBPYnNlcnZhYmxlPGFueT4pOiBPYnNlcnZhYmxlPGFueT4ge1xuICAgIHJldHVybiBmbigpLnBpcGUoY2F0Y2hFcnJvcigoKSA9PiBvZihudWxsKSkpO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUHJvdmlkZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5IHRoYXQgZG9lcyBub3QgcHJlbG9hZCBhbnkgbW9kdWxlcy5cbiAqXG4gKiBUaGlzIHN0cmF0ZWd5IGlzIGVuYWJsZWQgYnkgZGVmYXVsdC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBOb1ByZWxvYWRpbmcgaW1wbGVtZW50cyBQcmVsb2FkaW5nU3RyYXRlZ3kge1xuICBwcmVsb2FkKHJvdXRlOiBSb3V0ZSwgZm46ICgpID0+IE9ic2VydmFibGU8YW55Pik6IE9ic2VydmFibGU8YW55PiB7XG4gICAgcmV0dXJuIG9mKG51bGwpO1xuICB9XG59XG5cbi8qKlxuICogVGhlIHByZWxvYWRlciBvcHRpbWlzdGljYWxseSBsb2FkcyBhbGwgcm91dGVyIGNvbmZpZ3VyYXRpb25zIHRvXG4gKiBtYWtlIG5hdmlnYXRpb25zIGludG8gbGF6aWx5LWxvYWRlZCBzZWN0aW9ucyBvZiB0aGUgYXBwbGljYXRpb24gZmFzdGVyLlxuICpcbiAqIFRoZSBwcmVsb2FkZXIgcnVucyBpbiB0aGUgYmFja2dyb3VuZC4gV2hlbiB0aGUgcm91dGVyIGJvb3RzdHJhcHMsIHRoZSBwcmVsb2FkZXJcbiAqIHN0YXJ0cyBsaXN0ZW5pbmcgdG8gYWxsIG5hdmlnYXRpb24gZXZlbnRzLiBBZnRlciBldmVyeSBzdWNoIGV2ZW50LCB0aGUgcHJlbG9hZGVyXG4gKiB3aWxsIGNoZWNrIGlmIGFueSBjb25maWd1cmF0aW9ucyBjYW4gYmUgbG9hZGVkIGxhemlseS5cbiAqXG4gKiBJZiBhIHJvdXRlIGlzIHByb3RlY3RlZCBieSBgY2FuTG9hZGAgZ3VhcmRzLCB0aGUgcHJlbG9hZGVkIHdpbGwgbm90IGxvYWQgaXQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgUm91dGVyUHJlbG9hZGVyIGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb24/OiBTdWJzY3JpcHRpb247XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLCBjb21waWxlcjogQ29tcGlsZXIsIHByaXZhdGUgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsXG4gICAgICBwcml2YXRlIHByZWxvYWRpbmdTdHJhdGVneTogUHJlbG9hZGluZ1N0cmF0ZWd5LCBwcml2YXRlIGxvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyKSB7fVxuXG4gIHNldFVwUHJlbG9hZGluZygpOiB2b2lkIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbiA9XG4gICAgICAgIHRoaXMucm91dGVyLmV2ZW50c1xuICAgICAgICAgICAgLnBpcGUoZmlsdGVyKChlOiBFdmVudCkgPT4gZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpLCBjb25jYXRNYXAoKCkgPT4gdGhpcy5wcmVsb2FkKCkpKVxuICAgICAgICAgICAgLnN1YnNjcmliZSgoKSA9PiB7fSk7XG4gIH1cblxuICBwcmVsb2FkKCk6IE9ic2VydmFibGU8YW55PiB7XG4gICAgcmV0dXJuIHRoaXMucHJvY2Vzc1JvdXRlcyh0aGlzLmluamVjdG9yLCB0aGlzLnJvdXRlci5jb25maWcpO1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzUm91dGVzKGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZXM6IFJvdXRlcyk6IE9ic2VydmFibGU8dm9pZD4ge1xuICAgIGNvbnN0IHJlczogT2JzZXJ2YWJsZTxhbnk+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHJvdXRlcykge1xuICAgICAgaWYgKHJvdXRlLnByb3ZpZGVycyAmJiAhcm91dGUuX2luamVjdG9yKSB7XG4gICAgICAgIHJvdXRlLl9pbmplY3RvciA9XG4gICAgICAgICAgICBjcmVhdGVFbnZpcm9ubWVudEluamVjdG9yKHJvdXRlLnByb3ZpZGVycywgaW5qZWN0b3IsIGBSb3V0ZTogJHtyb3V0ZS5wYXRofWApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpbmplY3RvckZvckN1cnJlbnRSb3V0ZSA9IHJvdXRlLl9pbmplY3RvciA/PyBpbmplY3RvcjtcbiAgICAgIGNvbnN0IGluamVjdG9yRm9yQ2hpbGRyZW4gPSByb3V0ZS5fbG9hZGVkSW5qZWN0b3IgPz8gaW5qZWN0b3JGb3JDdXJyZW50Um91dGU7XG5cbiAgICAgIGlmICgocm91dGUubG9hZENoaWxkcmVuICYmICFyb3V0ZS5fbG9hZGVkUm91dGVzKSB8fFxuICAgICAgICAgIChyb3V0ZS5sb2FkQ29tcG9uZW50ICYmICFyb3V0ZS5fbG9hZGVkQ29tcG9uZW50KSkge1xuICAgICAgICByZXMucHVzaCh0aGlzLnByZWxvYWRDb25maWcoaW5qZWN0b3JGb3JDdXJyZW50Um91dGUsIHJvdXRlKSk7XG4gICAgICB9IGVsc2UgaWYgKHJvdXRlLmNoaWxkcmVuIHx8IHJvdXRlLl9sb2FkZWRSb3V0ZXMpIHtcbiAgICAgICAgcmVzLnB1c2godGhpcy5wcm9jZXNzUm91dGVzKGluamVjdG9yRm9yQ2hpbGRyZW4sIChyb3V0ZS5jaGlsZHJlbiA/PyByb3V0ZS5fbG9hZGVkUm91dGVzKSEpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZyb20ocmVzKS5waXBlKG1lcmdlQWxsKCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBwcmVsb2FkQ29uZmlnKGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy5wcmVsb2FkaW5nU3RyYXRlZ3kucHJlbG9hZChyb3V0ZSwgKCkgPT4ge1xuICAgICAgbGV0IGxvYWRlZENoaWxkcmVuJDogT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWd8bnVsbD47XG4gICAgICBpZiAocm91dGUubG9hZENoaWxkcmVuICYmIHJvdXRlLmNhbkxvYWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBsb2FkZWRDaGlsZHJlbiQgPSB0aGlzLmxvYWRlci5sb2FkQ2hpbGRyZW4oaW5qZWN0b3IsIHJvdXRlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvYWRlZENoaWxkcmVuJCA9IG9mKG51bGwpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZWN1cnNpdmVMb2FkQ2hpbGRyZW4kID1cbiAgICAgICAgICBsb2FkZWRDaGlsZHJlbiQucGlwZShtZXJnZU1hcCgoY29uZmlnOiBMb2FkZWRSb3V0ZXJDb25maWd8bnVsbCkgPT4ge1xuICAgICAgICAgICAgaWYgKGNvbmZpZyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXR1cm4gb2Yodm9pZCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRSb3V0ZXMgPSBjb25maWcucm91dGVzO1xuICAgICAgICAgICAgcm91dGUuX2xvYWRlZEluamVjdG9yID0gY29uZmlnLmluamVjdG9yO1xuICAgICAgICAgICAgLy8gSWYgdGhlIGxvYWRlZCBjb25maWcgd2FzIGEgbW9kdWxlLCB1c2UgdGhhdCBhcyB0aGUgbW9kdWxlL21vZHVsZSBpbmplY3RvciBnb2luZ1xuICAgICAgICAgICAgLy8gZm9yd2FyZC4gT3RoZXJ3aXNlLCBjb250aW51ZSB1c2luZyB0aGUgY3VycmVudCBtb2R1bGUvbW9kdWxlIGluamVjdG9yLlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1JvdXRlcyhjb25maWcuaW5qZWN0b3IgPz8gaW5qZWN0b3IsIGNvbmZpZy5yb3V0ZXMpO1xuICAgICAgICAgIH0pKTtcbiAgICAgIGlmIChyb3V0ZS5sb2FkQ29tcG9uZW50ICYmICFyb3V0ZS5fbG9hZGVkQ29tcG9uZW50KSB7XG4gICAgICAgIGNvbnN0IGxvYWRDb21wb25lbnQkID0gdGhpcy5sb2FkZXIubG9hZENvbXBvbmVudChyb3V0ZSk7XG4gICAgICAgIHJldHVybiBmcm9tKFtyZWN1cnNpdmVMb2FkQ2hpbGRyZW4kLCBsb2FkQ29tcG9uZW50JF0pLnBpcGUobWVyZ2VBbGwoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcmVjdXJzaXZlTG9hZENoaWxkcmVuJDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuIl19