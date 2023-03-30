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
class PreloadAllModules {
    preload(route, fn) {
        return fn().pipe(catchError(() => of(null)));
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.5+sha-81c9dd7", ngImport: i0, type: PreloadAllModules, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.0.0-next.5+sha-81c9dd7", ngImport: i0, type: PreloadAllModules, providedIn: 'root' }); }
}
export { PreloadAllModules };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.5+sha-81c9dd7", ngImport: i0, type: PreloadAllModules, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
/**
 * @description
 *
 * Provides a preloading strategy that does not preload any modules.
 *
 * This strategy is enabled by default.
 *
 * @publicApi
 */
class NoPreloading {
    preload(route, fn) {
        return of(null);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.5+sha-81c9dd7", ngImport: i0, type: NoPreloading, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.0.0-next.5+sha-81c9dd7", ngImport: i0, type: NoPreloading, providedIn: 'root' }); }
}
export { NoPreloading };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.5+sha-81c9dd7", ngImport: i0, type: NoPreloading, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
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
class RouterPreloader {
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
            // Note that `canLoad` is only checked as a condition that prevents `loadChildren` and not
            // `loadComponent`. `canLoad` guards only block loading of child routes by design. This
            // happens as a consequence of needing to descend into children for route matching immediately
            // while component loading is deferred until route activation. Because `canLoad` guards can
            // have side effects, we cannot execute them here so we instead skip preloading altogether
            // when present. Lastly, it remains to be decided whether `canLoad` should behave this way
            // at all. Code splitting and lazy loading is separate from client-side authorization checks
            // and should not be used as a security measure to prevent loading of code.
            if ((route.loadChildren && !route._loadedRoutes && route.canLoad === undefined) ||
                (route.loadComponent && !route._loadedComponent)) {
                res.push(this.preloadConfig(injectorForCurrentRoute, route));
            }
            if (route.children || route._loadedRoutes) {
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.5+sha-81c9dd7", ngImport: i0, type: RouterPreloader, deps: [{ token: i1.Router }, { token: i0.Compiler }, { token: i0.EnvironmentInjector }, { token: PreloadingStrategy }, { token: i2.RouterConfigLoader }], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.0.0-next.5+sha-81c9dd7", ngImport: i0, type: RouterPreloader, providedIn: 'root' }); }
}
export { RouterPreloader };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.5+sha-81c9dd7", ngImport: i0, type: RouterPreloader, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: function () { return [{ type: i1.Router }, { type: i0.Compiler }, { type: i0.EnvironmentInjector }, { type: PreloadingStrategy }, { type: i2.RouterConfigLoader }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3ByZWxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX3ByZWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsUUFBUSxFQUFFLHlCQUF5QixFQUFFLG1CQUFtQixFQUFFLFVBQVUsRUFBWSxNQUFNLGVBQWUsQ0FBQztBQUM5RyxPQUFPLEVBQUMsSUFBSSxFQUFjLEVBQUUsRUFBZSxNQUFNLE1BQU0sQ0FBQztBQUN4RCxPQUFPLEVBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRWpGLE9BQU8sRUFBUSxhQUFhLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFFOUMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQzs7OztBQUcxRDs7Ozs7O0dBTUc7QUFDSCxNQUFNLE9BQWdCLGtCQUFrQjtDQUV2QztBQUVEOzs7Ozs7Ozs7O0dBVUc7QUFDSCxNQUNhLGlCQUFpQjtJQUM1QixPQUFPLENBQUMsS0FBWSxFQUFFLEVBQXlCO1FBQzdDLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9DLENBQUM7eUhBSFUsaUJBQWlCOzZIQUFqQixpQkFBaUIsY0FETCxNQUFNOztTQUNsQixpQkFBaUI7c0dBQWpCLGlCQUFpQjtrQkFEN0IsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUM7O0FBT2hDOzs7Ozs7OztHQVFHO0FBQ0gsTUFDYSxZQUFZO0lBQ3ZCLE9BQU8sQ0FBQyxLQUFZLEVBQUUsRUFBeUI7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LENBQUMsQ0FBQzthQUN4RTtpQkFBTTtnQkFDTCxPQUFPLHNCQUFzQixDQUFDO2FBQy9CO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO3lIQWxGVSxlQUFlOzZIQUFmLGVBQWUsY0FESCxNQUFNOztTQUNsQixlQUFlO3NHQUFmLGVBQWU7a0JBRDNCLFVBQVU7bUJBQUMsRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29tcGlsZXIsIGNyZWF0ZUVudmlyb25tZW50SW5qZWN0b3IsIEVudmlyb25tZW50SW5qZWN0b3IsIEluamVjdGFibGUsIE9uRGVzdHJveX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge2Zyb20sIE9ic2VydmFibGUsIG9mLCBTdWJzY3JpcHRpb259IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjYXRjaEVycm9yLCBjb25jYXRNYXAsIGZpbHRlciwgbWVyZ2VBbGwsIG1lcmdlTWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7RXZlbnQsIE5hdmlnYXRpb25FbmR9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7TG9hZGVkUm91dGVyQ29uZmlnLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge1JvdXRlcn0gZnJvbSAnLi9yb3V0ZXInO1xuaW1wb3J0IHtSb3V0ZXJDb25maWdMb2FkZXJ9IGZyb20gJy4vcm91dGVyX2NvbmZpZ19sb2FkZXInO1xuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUHJvdmlkZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5LlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFByZWxvYWRpbmdTdHJhdGVneSB7XG4gIGFic3RyYWN0IHByZWxvYWQocm91dGU6IFJvdXRlLCBmbjogKCkgPT4gT2JzZXJ2YWJsZTxhbnk+KTogT2JzZXJ2YWJsZTxhbnk+O1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIGEgcHJlbG9hZGluZyBzdHJhdGVneSB0aGF0IHByZWxvYWRzIGFsbCBtb2R1bGVzIGFzIHF1aWNrbHkgYXMgcG9zc2libGUuXG4gKlxuICogYGBgXG4gKiBSb3V0ZXJNb2R1bGUuZm9yUm9vdChST1VURVMsIHtwcmVsb2FkaW5nU3RyYXRlZ3k6IFByZWxvYWRBbGxNb2R1bGVzfSlcbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgUHJlbG9hZEFsbE1vZHVsZXMgaW1wbGVtZW50cyBQcmVsb2FkaW5nU3RyYXRlZ3kge1xuICBwcmVsb2FkKHJvdXRlOiBSb3V0ZSwgZm46ICgpID0+IE9ic2VydmFibGU8YW55Pik6IE9ic2VydmFibGU8YW55PiB7XG4gICAgcmV0dXJuIGZuKCkucGlwZShjYXRjaEVycm9yKCgpID0+IG9mKG51bGwpKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBQcm92aWRlcyBhIHByZWxvYWRpbmcgc3RyYXRlZ3kgdGhhdCBkb2VzIG5vdCBwcmVsb2FkIGFueSBtb2R1bGVzLlxuICpcbiAqIFRoaXMgc3RyYXRlZ3kgaXMgZW5hYmxlZCBieSBkZWZhdWx0LlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgTm9QcmVsb2FkaW5nIGltcGxlbWVudHMgUHJlbG9hZGluZ1N0cmF0ZWd5IHtcbiAgcHJlbG9hZChyb3V0ZTogUm91dGUsIGZuOiAoKSA9PiBPYnNlcnZhYmxlPGFueT4pOiBPYnNlcnZhYmxlPGFueT4ge1xuICAgIHJldHVybiBvZihudWxsKTtcbiAgfVxufVxuXG4vKipcbiAqIFRoZSBwcmVsb2FkZXIgb3B0aW1pc3RpY2FsbHkgbG9hZHMgYWxsIHJvdXRlciBjb25maWd1cmF0aW9ucyB0b1xuICogbWFrZSBuYXZpZ2F0aW9ucyBpbnRvIGxhemlseS1sb2FkZWQgc2VjdGlvbnMgb2YgdGhlIGFwcGxpY2F0aW9uIGZhc3Rlci5cbiAqXG4gKiBUaGUgcHJlbG9hZGVyIHJ1bnMgaW4gdGhlIGJhY2tncm91bmQuIFdoZW4gdGhlIHJvdXRlciBib290c3RyYXBzLCB0aGUgcHJlbG9hZGVyXG4gKiBzdGFydHMgbGlzdGVuaW5nIHRvIGFsbCBuYXZpZ2F0aW9uIGV2ZW50cy4gQWZ0ZXIgZXZlcnkgc3VjaCBldmVudCwgdGhlIHByZWxvYWRlclxuICogd2lsbCBjaGVjayBpZiBhbnkgY29uZmlndXJhdGlvbnMgY2FuIGJlIGxvYWRlZCBsYXppbHkuXG4gKlxuICogSWYgYSByb3V0ZSBpcyBwcm90ZWN0ZWQgYnkgYGNhbkxvYWRgIGd1YXJkcywgdGhlIHByZWxvYWRlZCB3aWxsIG5vdCBsb2FkIGl0LlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgUm91dGVyUHJlbG9hZGVyIGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb24/OiBTdWJzY3JpcHRpb247XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLCBjb21waWxlcjogQ29tcGlsZXIsIHByaXZhdGUgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsXG4gICAgICBwcml2YXRlIHByZWxvYWRpbmdTdHJhdGVneTogUHJlbG9hZGluZ1N0cmF0ZWd5LCBwcml2YXRlIGxvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyKSB7fVxuXG4gIHNldFVwUHJlbG9hZGluZygpOiB2b2lkIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbiA9XG4gICAgICAgIHRoaXMucm91dGVyLmV2ZW50c1xuICAgICAgICAgICAgLnBpcGUoZmlsdGVyKChlOiBFdmVudCkgPT4gZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpLCBjb25jYXRNYXAoKCkgPT4gdGhpcy5wcmVsb2FkKCkpKVxuICAgICAgICAgICAgLnN1YnNjcmliZSgoKSA9PiB7fSk7XG4gIH1cblxuICBwcmVsb2FkKCk6IE9ic2VydmFibGU8YW55PiB7XG4gICAgcmV0dXJuIHRoaXMucHJvY2Vzc1JvdXRlcyh0aGlzLmluamVjdG9yLCB0aGlzLnJvdXRlci5jb25maWcpO1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzUm91dGVzKGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZXM6IFJvdXRlcyk6IE9ic2VydmFibGU8dm9pZD4ge1xuICAgIGNvbnN0IHJlczogT2JzZXJ2YWJsZTxhbnk+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHJvdXRlcykge1xuICAgICAgaWYgKHJvdXRlLnByb3ZpZGVycyAmJiAhcm91dGUuX2luamVjdG9yKSB7XG4gICAgICAgIHJvdXRlLl9pbmplY3RvciA9XG4gICAgICAgICAgICBjcmVhdGVFbnZpcm9ubWVudEluamVjdG9yKHJvdXRlLnByb3ZpZGVycywgaW5qZWN0b3IsIGBSb3V0ZTogJHtyb3V0ZS5wYXRofWApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpbmplY3RvckZvckN1cnJlbnRSb3V0ZSA9IHJvdXRlLl9pbmplY3RvciA/PyBpbmplY3RvcjtcbiAgICAgIGNvbnN0IGluamVjdG9yRm9yQ2hpbGRyZW4gPSByb3V0ZS5fbG9hZGVkSW5qZWN0b3IgPz8gaW5qZWN0b3JGb3JDdXJyZW50Um91dGU7XG5cbiAgICAgIC8vIE5vdGUgdGhhdCBgY2FuTG9hZGAgaXMgb25seSBjaGVja2VkIGFzIGEgY29uZGl0aW9uIHRoYXQgcHJldmVudHMgYGxvYWRDaGlsZHJlbmAgYW5kIG5vdFxuICAgICAgLy8gYGxvYWRDb21wb25lbnRgLiBgY2FuTG9hZGAgZ3VhcmRzIG9ubHkgYmxvY2sgbG9hZGluZyBvZiBjaGlsZCByb3V0ZXMgYnkgZGVzaWduLiBUaGlzXG4gICAgICAvLyBoYXBwZW5zIGFzIGEgY29uc2VxdWVuY2Ugb2YgbmVlZGluZyB0byBkZXNjZW5kIGludG8gY2hpbGRyZW4gZm9yIHJvdXRlIG1hdGNoaW5nIGltbWVkaWF0ZWx5XG4gICAgICAvLyB3aGlsZSBjb21wb25lbnQgbG9hZGluZyBpcyBkZWZlcnJlZCB1bnRpbCByb3V0ZSBhY3RpdmF0aW9uLiBCZWNhdXNlIGBjYW5Mb2FkYCBndWFyZHMgY2FuXG4gICAgICAvLyBoYXZlIHNpZGUgZWZmZWN0cywgd2UgY2Fubm90IGV4ZWN1dGUgdGhlbSBoZXJlIHNvIHdlIGluc3RlYWQgc2tpcCBwcmVsb2FkaW5nIGFsdG9nZXRoZXJcbiAgICAgIC8vIHdoZW4gcHJlc2VudC4gTGFzdGx5LCBpdCByZW1haW5zIHRvIGJlIGRlY2lkZWQgd2hldGhlciBgY2FuTG9hZGAgc2hvdWxkIGJlaGF2ZSB0aGlzIHdheVxuICAgICAgLy8gYXQgYWxsLiBDb2RlIHNwbGl0dGluZyBhbmQgbGF6eSBsb2FkaW5nIGlzIHNlcGFyYXRlIGZyb20gY2xpZW50LXNpZGUgYXV0aG9yaXphdGlvbiBjaGVja3NcbiAgICAgIC8vIGFuZCBzaG91bGQgbm90IGJlIHVzZWQgYXMgYSBzZWN1cml0eSBtZWFzdXJlIHRvIHByZXZlbnQgbG9hZGluZyBvZiBjb2RlLlxuICAgICAgaWYgKChyb3V0ZS5sb2FkQ2hpbGRyZW4gJiYgIXJvdXRlLl9sb2FkZWRSb3V0ZXMgJiYgcm91dGUuY2FuTG9hZCA9PT0gdW5kZWZpbmVkKSB8fFxuICAgICAgICAgIChyb3V0ZS5sb2FkQ29tcG9uZW50ICYmICFyb3V0ZS5fbG9hZGVkQ29tcG9uZW50KSkge1xuICAgICAgICByZXMucHVzaCh0aGlzLnByZWxvYWRDb25maWcoaW5qZWN0b3JGb3JDdXJyZW50Um91dGUsIHJvdXRlKSk7XG4gICAgICB9XG4gICAgICBpZiAocm91dGUuY2hpbGRyZW4gfHwgcm91dGUuX2xvYWRlZFJvdXRlcykge1xuICAgICAgICByZXMucHVzaCh0aGlzLnByb2Nlc3NSb3V0ZXMoaW5qZWN0b3JGb3JDaGlsZHJlbiwgKHJvdXRlLmNoaWxkcmVuID8/IHJvdXRlLl9sb2FkZWRSb3V0ZXMpISkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZnJvbShyZXMpLnBpcGUobWVyZ2VBbGwoKSk7XG4gIH1cblxuICBwcml2YXRlIHByZWxvYWRDb25maWcoaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsIHJvdXRlOiBSb3V0ZSk6IE9ic2VydmFibGU8dm9pZD4ge1xuICAgIHJldHVybiB0aGlzLnByZWxvYWRpbmdTdHJhdGVneS5wcmVsb2FkKHJvdXRlLCAoKSA9PiB7XG4gICAgICBsZXQgbG9hZGVkQ2hpbGRyZW4kOiBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZ3xudWxsPjtcbiAgICAgIGlmIChyb3V0ZS5sb2FkQ2hpbGRyZW4gJiYgcm91dGUuY2FuTG9hZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGxvYWRlZENoaWxkcmVuJCA9IHRoaXMubG9hZGVyLmxvYWRDaGlsZHJlbihpbmplY3Rvciwgcm91dGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9hZGVkQ2hpbGRyZW4kID0gb2YobnVsbCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlY3Vyc2l2ZUxvYWRDaGlsZHJlbiQgPVxuICAgICAgICAgIGxvYWRlZENoaWxkcmVuJC5waXBlKG1lcmdlTWFwKChjb25maWc6IExvYWRlZFJvdXRlckNvbmZpZ3xudWxsKSA9PiB7XG4gICAgICAgICAgICBpZiAoY29uZmlnID09PSBudWxsKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvZih2b2lkIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcm91dGUuX2xvYWRlZFJvdXRlcyA9IGNvbmZpZy5yb3V0ZXM7XG4gICAgICAgICAgICByb3V0ZS5fbG9hZGVkSW5qZWN0b3IgPSBjb25maWcuaW5qZWN0b3I7XG4gICAgICAgICAgICAvLyBJZiB0aGUgbG9hZGVkIGNvbmZpZyB3YXMgYSBtb2R1bGUsIHVzZSB0aGF0IGFzIHRoZSBtb2R1bGUvbW9kdWxlIGluamVjdG9yIGdvaW5nXG4gICAgICAgICAgICAvLyBmb3J3YXJkLiBPdGhlcndpc2UsIGNvbnRpbnVlIHVzaW5nIHRoZSBjdXJyZW50IG1vZHVsZS9tb2R1bGUgaW5qZWN0b3IuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzUm91dGVzKGNvbmZpZy5pbmplY3RvciA/PyBpbmplY3RvciwgY29uZmlnLnJvdXRlcyk7XG4gICAgICAgICAgfSkpO1xuICAgICAgaWYgKHJvdXRlLmxvYWRDb21wb25lbnQgJiYgIXJvdXRlLl9sb2FkZWRDb21wb25lbnQpIHtcbiAgICAgICAgY29uc3QgbG9hZENvbXBvbmVudCQgPSB0aGlzLmxvYWRlci5sb2FkQ29tcG9uZW50KHJvdXRlKTtcbiAgICAgICAgcmV0dXJuIGZyb20oW3JlY3Vyc2l2ZUxvYWRDaGlsZHJlbiQsIGxvYWRDb21wb25lbnQkXSkucGlwZShtZXJnZUFsbCgpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiByZWN1cnNpdmVMb2FkQ2hpbGRyZW4kO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG4iXX0=