/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { Compiler, createEnvironmentInjector, EnvironmentInjector, Injectable, } from '@angular/core';
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.8+sha-2532ffa", ngImport: i0, type: PreloadAllModules, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.2.8+sha-2532ffa", ngImport: i0, type: PreloadAllModules, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.8+sha-2532ffa", ngImport: i0, type: PreloadAllModules, decorators: [{
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.8+sha-2532ffa", ngImport: i0, type: NoPreloading, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.2.8+sha-2532ffa", ngImport: i0, type: NoPreloading, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.8+sha-2532ffa", ngImport: i0, type: NoPreloading, decorators: [{
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
        this.subscription = this.router.events
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
                route._injector = createEnvironmentInjector(route.providers, injector, `Route: ${route.path}`);
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.8+sha-2532ffa", ngImport: i0, type: RouterPreloader, deps: [{ token: i1.Router }, { token: i0.Compiler }, { token: i0.EnvironmentInjector }, { token: PreloadingStrategy }, { token: i2.RouterConfigLoader }], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.2.8+sha-2532ffa", ngImport: i0, type: RouterPreloader, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.8+sha-2532ffa", ngImport: i0, type: RouterPreloader, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: () => [{ type: i1.Router }, { type: i0.Compiler }, { type: i0.EnvironmentInjector }, { type: PreloadingStrategy }, { type: i2.RouterConfigLoader }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3ByZWxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX3ByZWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQ0wsUUFBUSxFQUNSLHlCQUF5QixFQUN6QixtQkFBbUIsRUFDbkIsVUFBVSxHQUVYLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBQyxJQUFJLEVBQWMsRUFBRSxFQUFlLE1BQU0sTUFBTSxDQUFDO0FBQ3hELE9BQU8sRUFBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFakYsT0FBTyxFQUFRLGFBQWEsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU5QyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHdCQUF3QixDQUFDOzs7O0FBRTFEOzs7Ozs7R0FNRztBQUNILE1BQU0sT0FBZ0Isa0JBQWtCO0NBRXZDO0FBRUQ7Ozs7Ozs7Ozs7R0FVRztBQUVILE1BQU0sT0FBTyxpQkFBaUI7SUFDNUIsT0FBTyxDQUFDLEtBQVksRUFBRSxFQUF5QjtRQUM3QyxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQyxDQUFDO3lIQUhVLGlCQUFpQjs2SEFBakIsaUJBQWlCLGNBREwsTUFBTTs7c0dBQ2xCLGlCQUFpQjtrQkFEN0IsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUM7O0FBT2hDOzs7Ozs7OztHQVFHO0FBRUgsTUFBTSxPQUFPLFlBQVk7SUFDdkIsT0FBTyxDQUFDLEtBQVksRUFBRSxFQUF5QjtR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QUM7Z0JBQ3hELE9BQU8sSUFBSSxDQUFDLENBQUMsc0JBQXNCLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUN6RSxDQUFDO2lCQUFNLENBQUM7Z0JBQ04sT0FBTyxzQkFBc0IsQ0FBQztZQUNoQyxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO3lIQTlGVSxlQUFlOzZIQUFmLGVBQWUsY0FESCxNQUFNOztzR0FDbEIsZUFBZTtrQkFEM0IsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5kZXYvbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIENvbXBpbGVyLFxuICBjcmVhdGVFbnZpcm9ubWVudEluamVjdG9yLFxuICBFbnZpcm9ubWVudEluamVjdG9yLFxuICBJbmplY3RhYmxlLFxuICBPbkRlc3Ryb3ksXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtmcm9tLCBPYnNlcnZhYmxlLCBvZiwgU3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y2F0Y2hFcnJvciwgY29uY2F0TWFwLCBmaWx0ZXIsIG1lcmdlQWxsLCBtZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0V2ZW50LCBOYXZpZ2F0aW9uRW5kfSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge0xvYWRlZFJvdXRlckNvbmZpZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJy4vcm91dGVyJztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBQcm92aWRlcyBhIHByZWxvYWRpbmcgc3RyYXRlZ3kuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUHJlbG9hZGluZ1N0cmF0ZWd5IHtcbiAgYWJzdHJhY3QgcHJlbG9hZChyb3V0ZTogUm91dGUsIGZuOiAoKSA9PiBPYnNlcnZhYmxlPGFueT4pOiBPYnNlcnZhYmxlPGFueT47XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUHJvdmlkZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5IHRoYXQgcHJlbG9hZHMgYWxsIG1vZHVsZXMgYXMgcXVpY2tseSBhcyBwb3NzaWJsZS5cbiAqXG4gKiBgYGBcbiAqIFJvdXRlck1vZHVsZS5mb3JSb290KFJPVVRFUywge3ByZWxvYWRpbmdTdHJhdGVneTogUHJlbG9hZEFsbE1vZHVsZXN9KVxuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnfSlcbmV4cG9ydCBjbGFzcyBQcmVsb2FkQWxsTW9kdWxlcyBpbXBsZW1lbnRzIFByZWxvYWRpbmdTdHJhdGVneSB7XG4gIHByZWxvYWQocm91dGU6IFJvdXRlLCBmbjogKCkgPT4gT2JzZXJ2YWJsZTxhbnk+KTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgICByZXR1cm4gZm4oKS5waXBlKGNhdGNoRXJyb3IoKCkgPT4gb2YobnVsbCkpKTtcbiAgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIGEgcHJlbG9hZGluZyBzdHJhdGVneSB0aGF0IGRvZXMgbm90IHByZWxvYWQgYW55IG1vZHVsZXMuXG4gKlxuICogVGhpcyBzdHJhdGVneSBpcyBlbmFibGVkIGJ5IGRlZmF1bHQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnfSlcbmV4cG9ydCBjbGFzcyBOb1ByZWxvYWRpbmcgaW1wbGVtZW50cyBQcmVsb2FkaW5nU3RyYXRlZ3kge1xuICBwcmVsb2FkKHJvdXRlOiBSb3V0ZSwgZm46ICgpID0+IE9ic2VydmFibGU8YW55Pik6IE9ic2VydmFibGU8YW55PiB7XG4gICAgcmV0dXJuIG9mKG51bGwpO1xuICB9XG59XG5cbi8qKlxuICogVGhlIHByZWxvYWRlciBvcHRpbWlzdGljYWxseSBsb2FkcyBhbGwgcm91dGVyIGNvbmZpZ3VyYXRpb25zIHRvXG4gKiBtYWtlIG5hdmlnYXRpb25zIGludG8gbGF6aWx5LWxvYWRlZCBzZWN0aW9ucyBvZiB0aGUgYXBwbGljYXRpb24gZmFzdGVyLlxuICpcbiAqIFRoZSBwcmVsb2FkZXIgcnVucyBpbiB0aGUgYmFja2dyb3VuZC4gV2hlbiB0aGUgcm91dGVyIGJvb3RzdHJhcHMsIHRoZSBwcmVsb2FkZXJcbiAqIHN0YXJ0cyBsaXN0ZW5pbmcgdG8gYWxsIG5hdmlnYXRpb24gZXZlbnRzLiBBZnRlciBldmVyeSBzdWNoIGV2ZW50LCB0aGUgcHJlbG9hZGVyXG4gKiB3aWxsIGNoZWNrIGlmIGFueSBjb25maWd1cmF0aW9ucyBjYW4gYmUgbG9hZGVkIGxhemlseS5cbiAqXG4gKiBJZiBhIHJvdXRlIGlzIHByb3RlY3RlZCBieSBgY2FuTG9hZGAgZ3VhcmRzLCB0aGUgcHJlbG9hZGVkIHdpbGwgbm90IGxvYWQgaXQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnfSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJQcmVsb2FkZXIgaW1wbGVtZW50cyBPbkRlc3Ryb3kge1xuICBwcml2YXRlIHN1YnNjcmlwdGlvbj86IFN1YnNjcmlwdGlvbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJvdXRlcjogUm91dGVyLFxuICAgIGNvbXBpbGVyOiBDb21waWxlcixcbiAgICBwcml2YXRlIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLFxuICAgIHByaXZhdGUgcHJlbG9hZGluZ1N0cmF0ZWd5OiBQcmVsb2FkaW5nU3RyYXRlZ3ksXG4gICAgcHJpdmF0ZSBsb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcixcbiAgKSB7fVxuXG4gIHNldFVwUHJlbG9hZGluZygpOiB2b2lkIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbiA9IHRoaXMucm91dGVyLmV2ZW50c1xuICAgICAgLnBpcGUoXG4gICAgICAgIGZpbHRlcigoZTogRXZlbnQpID0+IGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSxcbiAgICAgICAgY29uY2F0TWFwKCgpID0+IHRoaXMucHJlbG9hZCgpKSxcbiAgICAgIClcbiAgICAgIC5zdWJzY3JpYmUoKCkgPT4ge30pO1xuICB9XG5cbiAgcHJlbG9hZCgpOiBPYnNlcnZhYmxlPGFueT4ge1xuICAgIHJldHVybiB0aGlzLnByb2Nlc3NSb3V0ZXModGhpcy5pbmplY3RvciwgdGhpcy5yb3V0ZXIuY29uZmlnKTtcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuc3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc1JvdXRlcyhpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvciwgcm91dGVzOiBSb3V0ZXMpOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgICBjb25zdCByZXM6IE9ic2VydmFibGU8YW55PltdID0gW107XG4gICAgZm9yIChjb25zdCByb3V0ZSBvZiByb3V0ZXMpIHtcbiAgICAgIGlmIChyb3V0ZS5wcm92aWRlcnMgJiYgIXJvdXRlLl9pbmplY3Rvcikge1xuICAgICAgICByb3V0ZS5faW5qZWN0b3IgPSBjcmVhdGVFbnZpcm9ubWVudEluamVjdG9yKFxuICAgICAgICAgIHJvdXRlLnByb3ZpZGVycyxcbiAgICAgICAgICBpbmplY3RvcixcbiAgICAgICAgICBgUm91dGU6ICR7cm91dGUucGF0aH1gLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpbmplY3RvckZvckN1cnJlbnRSb3V0ZSA9IHJvdXRlLl9pbmplY3RvciA/PyBpbmplY3RvcjtcbiAgICAgIGNvbnN0IGluamVjdG9yRm9yQ2hpbGRyZW4gPSByb3V0ZS5fbG9hZGVkSW5qZWN0b3IgPz8gaW5qZWN0b3JGb3JDdXJyZW50Um91dGU7XG5cbiAgICAgIC8vIE5vdGUgdGhhdCBgY2FuTG9hZGAgaXMgb25seSBjaGVja2VkIGFzIGEgY29uZGl0aW9uIHRoYXQgcHJldmVudHMgYGxvYWRDaGlsZHJlbmAgYW5kIG5vdFxuICAgICAgLy8gYGxvYWRDb21wb25lbnRgLiBgY2FuTG9hZGAgZ3VhcmRzIG9ubHkgYmxvY2sgbG9hZGluZyBvZiBjaGlsZCByb3V0ZXMgYnkgZGVzaWduLiBUaGlzXG4gICAgICAvLyBoYXBwZW5zIGFzIGEgY29uc2VxdWVuY2Ugb2YgbmVlZGluZyB0byBkZXNjZW5kIGludG8gY2hpbGRyZW4gZm9yIHJvdXRlIG1hdGNoaW5nIGltbWVkaWF0ZWx5XG4gICAgICAvLyB3aGlsZSBjb21wb25lbnQgbG9hZGluZyBpcyBkZWZlcnJlZCB1bnRpbCByb3V0ZSBhY3RpdmF0aW9uLiBCZWNhdXNlIGBjYW5Mb2FkYCBndWFyZHMgY2FuXG4gICAgICAvLyBoYXZlIHNpZGUgZWZmZWN0cywgd2UgY2Fubm90IGV4ZWN1dGUgdGhlbSBoZXJlIHNvIHdlIGluc3RlYWQgc2tpcCBwcmVsb2FkaW5nIGFsdG9nZXRoZXJcbiAgICAgIC8vIHdoZW4gcHJlc2VudC4gTGFzdGx5LCBpdCByZW1haW5zIHRvIGJlIGRlY2lkZWQgd2hldGhlciBgY2FuTG9hZGAgc2hvdWxkIGJlaGF2ZSB0aGlzIHdheVxuICAgICAgLy8gYXQgYWxsLiBDb2RlIHNwbGl0dGluZyBhbmQgbGF6eSBsb2FkaW5nIGlzIHNlcGFyYXRlIGZyb20gY2xpZW50LXNpZGUgYXV0aG9yaXphdGlvbiBjaGVja3NcbiAgICAgIC8vIGFuZCBzaG91bGQgbm90IGJlIHVzZWQgYXMgYSBzZWN1cml0eSBtZWFzdXJlIHRvIHByZXZlbnQgbG9hZGluZyBvZiBjb2RlLlxuICAgICAgaWYgKFxuICAgICAgICAocm91dGUubG9hZENoaWxkcmVuICYmICFyb3V0ZS5fbG9hZGVkUm91dGVzICYmIHJvdXRlLmNhbkxvYWQgPT09IHVuZGVmaW5lZCkgfHxcbiAgICAgICAgKHJvdXRlLmxvYWRDb21wb25lbnQgJiYgIXJvdXRlLl9sb2FkZWRDb21wb25lbnQpXG4gICAgICApIHtcbiAgICAgICAgcmVzLnB1c2godGhpcy5wcmVsb2FkQ29uZmlnKGluamVjdG9yRm9yQ3VycmVudFJvdXRlLCByb3V0ZSkpO1xuICAgICAgfVxuICAgICAgaWYgKHJvdXRlLmNoaWxkcmVuIHx8IHJvdXRlLl9sb2FkZWRSb3V0ZXMpIHtcbiAgICAgICAgcmVzLnB1c2godGhpcy5wcm9jZXNzUm91dGVzKGluamVjdG9yRm9yQ2hpbGRyZW4sIChyb3V0ZS5jaGlsZHJlbiA/PyByb3V0ZS5fbG9hZGVkUm91dGVzKSEpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZyb20ocmVzKS5waXBlKG1lcmdlQWxsKCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBwcmVsb2FkQ29uZmlnKGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy5wcmVsb2FkaW5nU3RyYXRlZ3kucHJlbG9hZChyb3V0ZSwgKCkgPT4ge1xuICAgICAgbGV0IGxvYWRlZENoaWxkcmVuJDogT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWcgfCBudWxsPjtcbiAgICAgIGlmIChyb3V0ZS5sb2FkQ2hpbGRyZW4gJiYgcm91dGUuY2FuTG9hZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGxvYWRlZENoaWxkcmVuJCA9IHRoaXMubG9hZGVyLmxvYWRDaGlsZHJlbihpbmplY3Rvciwgcm91dGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9hZGVkQ2hpbGRyZW4kID0gb2YobnVsbCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlY3Vyc2l2ZUxvYWRDaGlsZHJlbiQgPSBsb2FkZWRDaGlsZHJlbiQucGlwZShcbiAgICAgICAgbWVyZ2VNYXAoKGNvbmZpZzogTG9hZGVkUm91dGVyQ29uZmlnIHwgbnVsbCkgPT4ge1xuICAgICAgICAgIGlmIChjb25maWcgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBvZih2b2lkIDApO1xuICAgICAgICAgIH1cbiAgICAgICAgICByb3V0ZS5fbG9hZGVkUm91dGVzID0gY29uZmlnLnJvdXRlcztcbiAgICAgICAgICByb3V0ZS5fbG9hZGVkSW5qZWN0b3IgPSBjb25maWcuaW5qZWN0b3I7XG4gICAgICAgICAgLy8gSWYgdGhlIGxvYWRlZCBjb25maWcgd2FzIGEgbW9kdWxlLCB1c2UgdGhhdCBhcyB0aGUgbW9kdWxlL21vZHVsZSBpbmplY3RvciBnb2luZ1xuICAgICAgICAgIC8vIGZvcndhcmQuIE90aGVyd2lzZSwgY29udGludWUgdXNpbmcgdGhlIGN1cnJlbnQgbW9kdWxlL21vZHVsZSBpbmplY3Rvci5cbiAgICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzUm91dGVzKGNvbmZpZy5pbmplY3RvciA/PyBpbmplY3RvciwgY29uZmlnLnJvdXRlcyk7XG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICAgIGlmIChyb3V0ZS5sb2FkQ29tcG9uZW50ICYmICFyb3V0ZS5fbG9hZGVkQ29tcG9uZW50KSB7XG4gICAgICAgIGNvbnN0IGxvYWRDb21wb25lbnQkID0gdGhpcy5sb2FkZXIubG9hZENvbXBvbmVudChyb3V0ZSk7XG4gICAgICAgIHJldHVybiBmcm9tKFtyZWN1cnNpdmVMb2FkQ2hpbGRyZW4kLCBsb2FkQ29tcG9uZW50JF0pLnBpcGUobWVyZ2VBbGwoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcmVjdXJzaXZlTG9hZENoaWxkcmVuJDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuIl19