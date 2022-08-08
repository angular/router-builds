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
PreloadAllModules.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.0-next.0+sha-621c388", ngImport: i0, type: PreloadAllModules, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
PreloadAllModules.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.2.0-next.0+sha-621c388", ngImport: i0, type: PreloadAllModules, providedIn: 'root' });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.0-next.0+sha-621c388", ngImport: i0, type: PreloadAllModules, decorators: [{
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
export class NoPreloading {
    preload(route, fn) {
        return of(null);
    }
}
NoPreloading.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.0-next.0+sha-621c388", ngImport: i0, type: NoPreloading, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
NoPreloading.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.2.0-next.0+sha-621c388", ngImport: i0, type: NoPreloading, providedIn: 'root' });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.0-next.0+sha-621c388", ngImport: i0, type: NoPreloading, decorators: [{
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
RouterPreloader.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.0-next.0+sha-621c388", ngImport: i0, type: RouterPreloader, deps: [{ token: i1.Router }, { token: i0.Compiler }, { token: i0.EnvironmentInjector }, { token: PreloadingStrategy }, { token: i2.RouterConfigLoader }], target: i0.ɵɵFactoryTarget.Injectable });
RouterPreloader.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.2.0-next.0+sha-621c388", ngImport: i0, type: RouterPreloader });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.0-next.0+sha-621c388", ngImport: i0, type: RouterPreloader, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i1.Router }, { type: i0.Compiler }, { type: i0.EnvironmentInjector }, { type: PreloadingStrategy }, { type: i2.RouterConfigLoader }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3ByZWxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX3ByZWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsUUFBUSxFQUFFLHlCQUF5QixFQUFFLG1CQUFtQixFQUFFLFVBQVUsRUFBWSxNQUFNLGVBQWUsQ0FBQztBQUM5RyxPQUFPLEVBQUMsSUFBSSxFQUFjLEVBQUUsRUFBZSxNQUFNLE1BQU0sQ0FBQztBQUN4RCxPQUFPLEVBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRWpGLE9BQU8sRUFBUSxhQUFhLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFFOUMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQzs7OztBQUcxRDs7Ozs7O0dBTUc7QUFDSCxNQUFNLE9BQWdCLGtCQUFrQjtDQUV2QztBQUVEOzs7Ozs7Ozs7O0dBVUc7QUFFSCxNQUFNLE9BQU8saUJBQWlCO0lBQzVCLE9BQU8sQ0FBQyxLQUFZLEVBQUUsRUFBeUI7UUFDN0MsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQzs7eUhBSFUsaUJBQWlCOzZIQUFqQixpQkFBaUIsY0FETCxNQUFNO3NHQUNsQixpQkFBaUI7a0JBRDdCLFVBQVU7bUJBQUMsRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFDOztBQU9oQzs7Ozs7Ozs7R0FRRztBQUVILE1BQU0sT0FBTyxZQUFZO0lBQ3ZCLE9BQU8sQ0FBQyxLQUFZLEVBQUUsRUFBeUI7UUFD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QUFDO2FBQ3hFO2lCQUFNO2dCQUNMLE9BQU8sc0JBQXNCLENBQUM7YUFDL0I7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7O3VIQWpGVSxlQUFlLG1HQUtNLGtCQUFrQjsySEFMdkMsZUFBZTtzR0FBZixlQUFlO2tCQUQzQixVQUFVO3dJQU11QixrQkFBa0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb21waWxlciwgY3JlYXRlRW52aXJvbm1lbnRJbmplY3RvciwgRW52aXJvbm1lbnRJbmplY3RvciwgSW5qZWN0YWJsZSwgT25EZXN0cm95fSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7ZnJvbSwgT2JzZXJ2YWJsZSwgb2YsIFN1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NhdGNoRXJyb3IsIGNvbmNhdE1hcCwgZmlsdGVyLCBtZXJnZUFsbCwgbWVyZ2VNYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtFdmVudCwgTmF2aWdhdGlvbkVuZH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtMb2FkZWRSb3V0ZXJDb25maWcsIFJvdXRlLCBSb3V0ZXN9IGZyb20gJy4vbW9kZWxzJztcbmltcG9ydCB7Um91dGVyfSBmcm9tICcuL3JvdXRlcic7XG5pbXBvcnQge1JvdXRlckNvbmZpZ0xvYWRlcn0gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBQcm92aWRlcyBhIHByZWxvYWRpbmcgc3RyYXRlZ3kuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUHJlbG9hZGluZ1N0cmF0ZWd5IHtcbiAgYWJzdHJhY3QgcHJlbG9hZChyb3V0ZTogUm91dGUsIGZuOiAoKSA9PiBPYnNlcnZhYmxlPGFueT4pOiBPYnNlcnZhYmxlPGFueT47XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUHJvdmlkZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5IHRoYXQgcHJlbG9hZHMgYWxsIG1vZHVsZXMgYXMgcXVpY2tseSBhcyBwb3NzaWJsZS5cbiAqXG4gKiBgYGBcbiAqIFJvdXRlck1vZHVsZS5mb3JSb290KFJPVVRFUywge3ByZWxvYWRpbmdTdHJhdGVneTogUHJlbG9hZEFsbE1vZHVsZXN9KVxuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnfSlcbmV4cG9ydCBjbGFzcyBQcmVsb2FkQWxsTW9kdWxlcyBpbXBsZW1lbnRzIFByZWxvYWRpbmdTdHJhdGVneSB7XG4gIHByZWxvYWQocm91dGU6IFJvdXRlLCBmbjogKCkgPT4gT2JzZXJ2YWJsZTxhbnk+KTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgICByZXR1cm4gZm4oKS5waXBlKGNhdGNoRXJyb3IoKCkgPT4gb2YobnVsbCkpKTtcbiAgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIGEgcHJlbG9hZGluZyBzdHJhdGVneSB0aGF0IGRvZXMgbm90IHByZWxvYWQgYW55IG1vZHVsZXMuXG4gKlxuICogVGhpcyBzdHJhdGVneSBpcyBlbmFibGVkIGJ5IGRlZmF1bHQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnfSlcbmV4cG9ydCBjbGFzcyBOb1ByZWxvYWRpbmcgaW1wbGVtZW50cyBQcmVsb2FkaW5nU3RyYXRlZ3kge1xuICBwcmVsb2FkKHJvdXRlOiBSb3V0ZSwgZm46ICgpID0+IE9ic2VydmFibGU8YW55Pik6IE9ic2VydmFibGU8YW55PiB7XG4gICAgcmV0dXJuIG9mKG51bGwpO1xuICB9XG59XG5cbi8qKlxuICogVGhlIHByZWxvYWRlciBvcHRpbWlzdGljYWxseSBsb2FkcyBhbGwgcm91dGVyIGNvbmZpZ3VyYXRpb25zIHRvXG4gKiBtYWtlIG5hdmlnYXRpb25zIGludG8gbGF6aWx5LWxvYWRlZCBzZWN0aW9ucyBvZiB0aGUgYXBwbGljYXRpb24gZmFzdGVyLlxuICpcbiAqIFRoZSBwcmVsb2FkZXIgcnVucyBpbiB0aGUgYmFja2dyb3VuZC4gV2hlbiB0aGUgcm91dGVyIGJvb3RzdHJhcHMsIHRoZSBwcmVsb2FkZXJcbiAqIHN0YXJ0cyBsaXN0ZW5pbmcgdG8gYWxsIG5hdmlnYXRpb24gZXZlbnRzLiBBZnRlciBldmVyeSBzdWNoIGV2ZW50LCB0aGUgcHJlbG9hZGVyXG4gKiB3aWxsIGNoZWNrIGlmIGFueSBjb25maWd1cmF0aW9ucyBjYW4gYmUgbG9hZGVkIGxhemlseS5cbiAqXG4gKiBJZiBhIHJvdXRlIGlzIHByb3RlY3RlZCBieSBgY2FuTG9hZGAgZ3VhcmRzLCB0aGUgcHJlbG9hZGVkIHdpbGwgbm90IGxvYWQgaXQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgUm91dGVyUHJlbG9hZGVyIGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgcHJpdmF0ZSBzdWJzY3JpcHRpb24/OiBTdWJzY3JpcHRpb247XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLCBjb21waWxlcjogQ29tcGlsZXIsIHByaXZhdGUgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsXG4gICAgICBwcml2YXRlIHByZWxvYWRpbmdTdHJhdGVneTogUHJlbG9hZGluZ1N0cmF0ZWd5LCBwcml2YXRlIGxvYWRlcjogUm91dGVyQ29uZmlnTG9hZGVyKSB7fVxuXG4gIHNldFVwUHJlbG9hZGluZygpOiB2b2lkIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbiA9XG4gICAgICAgIHRoaXMucm91dGVyLmV2ZW50c1xuICAgICAgICAgICAgLnBpcGUoZmlsdGVyKChlOiBFdmVudCkgPT4gZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQpLCBjb25jYXRNYXAoKCkgPT4gdGhpcy5wcmVsb2FkKCkpKVxuICAgICAgICAgICAgLnN1YnNjcmliZSgoKSA9PiB7fSk7XG4gIH1cblxuICBwcmVsb2FkKCk6IE9ic2VydmFibGU8YW55PiB7XG4gICAgcmV0dXJuIHRoaXMucHJvY2Vzc1JvdXRlcyh0aGlzLmluamVjdG9yLCB0aGlzLnJvdXRlci5jb25maWcpO1xuICB9XG5cbiAgLyoqIEBub2RvYyAqL1xuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zdWJzY3JpcHRpb24pIHtcbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzUm91dGVzKGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZXM6IFJvdXRlcyk6IE9ic2VydmFibGU8dm9pZD4ge1xuICAgIGNvbnN0IHJlczogT2JzZXJ2YWJsZTxhbnk+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHJvdXRlcykge1xuICAgICAgaWYgKHJvdXRlLnByb3ZpZGVycyAmJiAhcm91dGUuX2luamVjdG9yKSB7XG4gICAgICAgIHJvdXRlLl9pbmplY3RvciA9XG4gICAgICAgICAgICBjcmVhdGVFbnZpcm9ubWVudEluamVjdG9yKHJvdXRlLnByb3ZpZGVycywgaW5qZWN0b3IsIGBSb3V0ZTogJHtyb3V0ZS5wYXRofWApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpbmplY3RvckZvckN1cnJlbnRSb3V0ZSA9IHJvdXRlLl9pbmplY3RvciA/PyBpbmplY3RvcjtcbiAgICAgIGNvbnN0IGluamVjdG9yRm9yQ2hpbGRyZW4gPSByb3V0ZS5fbG9hZGVkSW5qZWN0b3IgPz8gaW5qZWN0b3JGb3JDdXJyZW50Um91dGU7XG5cbiAgICAgIC8vIE5vdGUgdGhhdCBgY2FuTG9hZGAgaXMgb25seSBjaGVja2VkIGFzIGEgY29uZGl0aW9uIHRoYXQgcHJldmVudHMgYGxvYWRDaGlsZHJlbmAgYW5kIG5vdFxuICAgICAgLy8gYGxvYWRDb21wb25lbnRgLiBgY2FuTG9hZGAgZ3VhcmRzIG9ubHkgYmxvY2sgbG9hZGluZyBvZiBjaGlsZCByb3V0ZXMgYnkgZGVzaWduLiBUaGlzXG4gICAgICAvLyBoYXBwZW5zIGFzIGEgY29uc2VxdWVuY2Ugb2YgbmVlZGluZyB0byBkZXNjZW5kIGludG8gY2hpbGRyZW4gZm9yIHJvdXRlIG1hdGNoaW5nIGltbWVkaWF0ZWx5XG4gICAgICAvLyB3aGlsZSBjb21wb25lbnQgbG9hZGluZyBpcyBkZWZlcnJlZCB1bnRpbCByb3V0ZSBhY3RpdmF0aW9uLiBCZWNhdXNlIGBjYW5Mb2FkYCBndWFyZHMgY2FuXG4gICAgICAvLyBoYXZlIHNpZGUgZWZmZWN0cywgd2UgY2Fubm90IGV4ZWN1dGUgdGhlbSBoZXJlIHNvIHdlIGluc3RlYWQgc2tpcCBwcmVsb2FkaW5nIGFsdG9nZXRoZXJcbiAgICAgIC8vIHdoZW4gcHJlc2VudC4gTGFzdGx5LCBpdCByZW1haW5zIHRvIGJlIGRlY2lkZWQgd2hldGhlciBgY2FuTG9hZGAgc2hvdWxkIGJlaGF2ZSB0aGlzIHdheVxuICAgICAgLy8gYXQgYWxsLiBDb2RlIHNwbGl0dGluZyBhbmQgbGF6eSBsb2FkaW5nIGlzIHNlcGFyYXRlIGZyb20gY2xpZW50LXNpZGUgYXV0aG9yaXphdGlvbiBjaGVja3NcbiAgICAgIC8vIGFuZCBzaG91bGQgbm90IGJlIHVzZWQgYXMgYSBzZWN1cml0eSBtZWFzdXJlIHRvIHByZXZlbnQgbG9hZGluZyBvZiBjb2RlLlxuICAgICAgaWYgKChyb3V0ZS5sb2FkQ2hpbGRyZW4gJiYgIXJvdXRlLl9sb2FkZWRSb3V0ZXMgJiYgcm91dGUuY2FuTG9hZCA9PT0gdW5kZWZpbmVkKSB8fFxuICAgICAgICAgIChyb3V0ZS5sb2FkQ29tcG9uZW50ICYmICFyb3V0ZS5fbG9hZGVkQ29tcG9uZW50KSkge1xuICAgICAgICByZXMucHVzaCh0aGlzLnByZWxvYWRDb25maWcoaW5qZWN0b3JGb3JDdXJyZW50Um91dGUsIHJvdXRlKSk7XG4gICAgICB9IGVsc2UgaWYgKHJvdXRlLmNoaWxkcmVuIHx8IHJvdXRlLl9sb2FkZWRSb3V0ZXMpIHtcbiAgICAgICAgcmVzLnB1c2godGhpcy5wcm9jZXNzUm91dGVzKGluamVjdG9yRm9yQ2hpbGRyZW4sIChyb3V0ZS5jaGlsZHJlbiA/PyByb3V0ZS5fbG9hZGVkUm91dGVzKSEpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZyb20ocmVzKS5waXBlKG1lcmdlQWxsKCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBwcmVsb2FkQ29uZmlnKGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy5wcmVsb2FkaW5nU3RyYXRlZ3kucHJlbG9hZChyb3V0ZSwgKCkgPT4ge1xuICAgICAgbGV0IGxvYWRlZENoaWxkcmVuJDogT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWd8bnVsbD47XG4gICAgICBpZiAocm91dGUubG9hZENoaWxkcmVuICYmIHJvdXRlLmNhbkxvYWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBsb2FkZWRDaGlsZHJlbiQgPSB0aGlzLmxvYWRlci5sb2FkQ2hpbGRyZW4oaW5qZWN0b3IsIHJvdXRlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvYWRlZENoaWxkcmVuJCA9IG9mKG51bGwpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZWN1cnNpdmVMb2FkQ2hpbGRyZW4kID1cbiAgICAgICAgICBsb2FkZWRDaGlsZHJlbiQucGlwZShtZXJnZU1hcCgoY29uZmlnOiBMb2FkZWRSb3V0ZXJDb25maWd8bnVsbCkgPT4ge1xuICAgICAgICAgICAgaWYgKGNvbmZpZyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXR1cm4gb2Yodm9pZCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRSb3V0ZXMgPSBjb25maWcucm91dGVzO1xuICAgICAgICAgICAgcm91dGUuX2xvYWRlZEluamVjdG9yID0gY29uZmlnLmluamVjdG9yO1xuICAgICAgICAgICAgLy8gSWYgdGhlIGxvYWRlZCBjb25maWcgd2FzIGEgbW9kdWxlLCB1c2UgdGhhdCBhcyB0aGUgbW9kdWxlL21vZHVsZSBpbmplY3RvciBnb2luZ1xuICAgICAgICAgICAgLy8gZm9yd2FyZC4gT3RoZXJ3aXNlLCBjb250aW51ZSB1c2luZyB0aGUgY3VycmVudCBtb2R1bGUvbW9kdWxlIGluamVjdG9yLlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1JvdXRlcyhjb25maWcuaW5qZWN0b3IgPz8gaW5qZWN0b3IsIGNvbmZpZy5yb3V0ZXMpO1xuICAgICAgICAgIH0pKTtcbiAgICAgIGlmIChyb3V0ZS5sb2FkQ29tcG9uZW50ICYmICFyb3V0ZS5fbG9hZGVkQ29tcG9uZW50KSB7XG4gICAgICAgIGNvbnN0IGxvYWRDb21wb25lbnQkID0gdGhpcy5sb2FkZXIubG9hZENvbXBvbmVudChyb3V0ZSk7XG4gICAgICAgIHJldHVybiBmcm9tKFtyZWN1cnNpdmVMb2FkQ2hpbGRyZW4kLCBsb2FkQ29tcG9uZW50JF0pLnBpcGUobWVyZ2VBbGwoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcmVjdXJzaXZlTG9hZENoaWxkcmVuJDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuIl19