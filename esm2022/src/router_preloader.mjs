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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.2.0-next.1+sha-989d496", ngImport: i0, type: PreloadAllModules, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.2.0-next.1+sha-989d496", ngImport: i0, type: PreloadAllModules, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.2.0-next.1+sha-989d496", ngImport: i0, type: PreloadAllModules, decorators: [{
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.2.0-next.1+sha-989d496", ngImport: i0, type: NoPreloading, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.2.0-next.1+sha-989d496", ngImport: i0, type: NoPreloading, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.2.0-next.1+sha-989d496", ngImport: i0, type: NoPreloading, decorators: [{
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.2.0-next.1+sha-989d496", ngImport: i0, type: RouterPreloader, deps: [{ token: i1.Router }, { token: i0.Compiler }, { token: i0.EnvironmentInjector }, { token: PreloadingStrategy }, { token: i2.RouterConfigLoader }], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.2.0-next.1+sha-989d496", ngImport: i0, type: RouterPreloader, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.2.0-next.1+sha-989d496", ngImport: i0, type: RouterPreloader, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: () => [{ type: i1.Router }, { type: i0.Compiler }, { type: i0.EnvironmentInjector }, { type: PreloadingStrategy }, { type: i2.RouterConfigLoader }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3ByZWxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX3ByZWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsUUFBUSxFQUFFLHlCQUF5QixFQUFFLG1CQUFtQixFQUFFLFVBQVUsRUFBWSxNQUFNLGVBQWUsQ0FBQztBQUM5RyxPQUFPLEVBQUMsSUFBSSxFQUFjLEVBQUUsRUFBZSxNQUFNLE1BQU0sQ0FBQztBQUN4RCxPQUFPLEVBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRWpGLE9BQU8sRUFBUSxhQUFhLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFFOUMsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQzs7OztBQUcxRDs7Ozs7O0dBTUc7QUFDSCxNQUFNLE9BQWdCLGtCQUFrQjtDQUV2QztBQUVEOzs7Ozs7Ozs7O0dBVUc7QUFFSCxNQUFNLE9BQU8saUJBQWlCO0lBQzVCLE9BQU8sQ0FBQyxLQUFZLEVBQUUsRUFBeUI7UUFDN0MsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQzt5SEFIVSxpQkFBaUI7NkhBQWpCLGlCQUFpQixjQURMLE1BQU07O3NHQUNsQixpQkFBaUI7a0JBRDdCLFVBQVU7bUJBQUMsRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFDOztBQU9oQzs7Ozs7Ozs7R0FRRztBQUVILE1BQU0sT0FBTyxZQUFZO0lBQ3ZCLE9BQU8sQ0FBQyxLQUFZLEVBQUUsRUFBeUI7UUFD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QkFDeEQsT0FBTyxJQUFJLENBQUMsQ0FBQyxzQkFBc0IsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ3pFLENBQUM7aUJBQU0sQ0FBQztnQkFDTixPQUFPLHNCQUFzQixDQUFDO1lBQ2hDLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7eUhBbEZVLGVBQWU7NkhBQWYsZUFBZSxjQURILE1BQU07O3NHQUNsQixlQUFlO2tCQUQzQixVQUFVO21CQUFDLEVBQUMsVUFBVSxFQUFFLE1BQU0sRUFBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbXBpbGVyLCBjcmVhdGVFbnZpcm9ubWVudEluamVjdG9yLCBFbnZpcm9ubWVudEluamVjdG9yLCBJbmplY3RhYmxlLCBPbkRlc3Ryb3l9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtmcm9tLCBPYnNlcnZhYmxlLCBvZiwgU3Vic2NyaXB0aW9ufSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y2F0Y2hFcnJvciwgY29uY2F0TWFwLCBmaWx0ZXIsIG1lcmdlQWxsLCBtZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0V2ZW50LCBOYXZpZ2F0aW9uRW5kfSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge0xvYWRlZFJvdXRlckNvbmZpZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJy4vcm91dGVyJztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFByb3ZpZGVzIGEgcHJlbG9hZGluZyBzdHJhdGVneS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQcmVsb2FkaW5nU3RyYXRlZ3kge1xuICBhYnN0cmFjdCBwcmVsb2FkKHJvdXRlOiBSb3V0ZSwgZm46ICgpID0+IE9ic2VydmFibGU8YW55Pik6IE9ic2VydmFibGU8YW55Pjtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBQcm92aWRlcyBhIHByZWxvYWRpbmcgc3RyYXRlZ3kgdGhhdCBwcmVsb2FkcyBhbGwgbW9kdWxlcyBhcyBxdWlja2x5IGFzIHBvc3NpYmxlLlxuICpcbiAqIGBgYFxuICogUm91dGVyTW9kdWxlLmZvclJvb3QoUk9VVEVTLCB7cHJlbG9hZGluZ1N0cmF0ZWd5OiBQcmVsb2FkQWxsTW9kdWxlc30pXG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCd9KVxuZXhwb3J0IGNsYXNzIFByZWxvYWRBbGxNb2R1bGVzIGltcGxlbWVudHMgUHJlbG9hZGluZ1N0cmF0ZWd5IHtcbiAgcHJlbG9hZChyb3V0ZTogUm91dGUsIGZuOiAoKSA9PiBPYnNlcnZhYmxlPGFueT4pOiBPYnNlcnZhYmxlPGFueT4ge1xuICAgIHJldHVybiBmbigpLnBpcGUoY2F0Y2hFcnJvcigoKSA9PiBvZihudWxsKSkpO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUHJvdmlkZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5IHRoYXQgZG9lcyBub3QgcHJlbG9hZCBhbnkgbW9kdWxlcy5cbiAqXG4gKiBUaGlzIHN0cmF0ZWd5IGlzIGVuYWJsZWQgYnkgZGVmYXVsdC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCd9KVxuZXhwb3J0IGNsYXNzIE5vUHJlbG9hZGluZyBpbXBsZW1lbnRzIFByZWxvYWRpbmdTdHJhdGVneSB7XG4gIHByZWxvYWQocm91dGU6IFJvdXRlLCBmbjogKCkgPT4gT2JzZXJ2YWJsZTxhbnk+KTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgICByZXR1cm4gb2YobnVsbCk7XG4gIH1cbn1cblxuLyoqXG4gKiBUaGUgcHJlbG9hZGVyIG9wdGltaXN0aWNhbGx5IGxvYWRzIGFsbCByb3V0ZXIgY29uZmlndXJhdGlvbnMgdG9cbiAqIG1ha2UgbmF2aWdhdGlvbnMgaW50byBsYXppbHktbG9hZGVkIHNlY3Rpb25zIG9mIHRoZSBhcHBsaWNhdGlvbiBmYXN0ZXIuXG4gKlxuICogVGhlIHByZWxvYWRlciBydW5zIGluIHRoZSBiYWNrZ3JvdW5kLiBXaGVuIHRoZSByb3V0ZXIgYm9vdHN0cmFwcywgdGhlIHByZWxvYWRlclxuICogc3RhcnRzIGxpc3RlbmluZyB0byBhbGwgbmF2aWdhdGlvbiBldmVudHMuIEFmdGVyIGV2ZXJ5IHN1Y2ggZXZlbnQsIHRoZSBwcmVsb2FkZXJcbiAqIHdpbGwgY2hlY2sgaWYgYW55IGNvbmZpZ3VyYXRpb25zIGNhbiBiZSBsb2FkZWQgbGF6aWx5LlxuICpcbiAqIElmIGEgcm91dGUgaXMgcHJvdGVjdGVkIGJ5IGBjYW5Mb2FkYCBndWFyZHMsIHRoZSBwcmVsb2FkZWQgd2lsbCBub3QgbG9hZCBpdC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCd9KVxuZXhwb3J0IGNsYXNzIFJvdXRlclByZWxvYWRlciBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIHByaXZhdGUgc3Vic2NyaXB0aW9uPzogU3Vic2NyaXB0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb3V0ZXI6IFJvdXRlciwgY29tcGlsZXI6IENvbXBpbGVyLCBwcml2YXRlIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLFxuICAgICAgcHJpdmF0ZSBwcmVsb2FkaW5nU3RyYXRlZ3k6IFByZWxvYWRpbmdTdHJhdGVneSwgcHJpdmF0ZSBsb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlcikge31cblxuICBzZXRVcFByZWxvYWRpbmcoKTogdm9pZCB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb24gPVxuICAgICAgICB0aGlzLnJvdXRlci5ldmVudHNcbiAgICAgICAgICAgIC5waXBlKGZpbHRlcigoZTogRXZlbnQpID0+IGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRW5kKSwgY29uY2F0TWFwKCgpID0+IHRoaXMucHJlbG9hZCgpKSlcbiAgICAgICAgICAgIC5zdWJzY3JpYmUoKCkgPT4ge30pO1xuICB9XG5cbiAgcHJlbG9hZCgpOiBPYnNlcnZhYmxlPGFueT4ge1xuICAgIHJldHVybiB0aGlzLnByb2Nlc3NSb3V0ZXModGhpcy5pbmplY3RvciwgdGhpcy5yb3V0ZXIuY29uZmlnKTtcbiAgfVxuXG4gIC8qKiBAbm9kb2MgKi9cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuc3Vic2NyaXB0aW9uKSB7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc1JvdXRlcyhpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvciwgcm91dGVzOiBSb3V0ZXMpOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgICBjb25zdCByZXM6IE9ic2VydmFibGU8YW55PltdID0gW107XG4gICAgZm9yIChjb25zdCByb3V0ZSBvZiByb3V0ZXMpIHtcbiAgICAgIGlmIChyb3V0ZS5wcm92aWRlcnMgJiYgIXJvdXRlLl9pbmplY3Rvcikge1xuICAgICAgICByb3V0ZS5faW5qZWN0b3IgPVxuICAgICAgICAgICAgY3JlYXRlRW52aXJvbm1lbnRJbmplY3Rvcihyb3V0ZS5wcm92aWRlcnMsIGluamVjdG9yLCBgUm91dGU6ICR7cm91dGUucGF0aH1gKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaW5qZWN0b3JGb3JDdXJyZW50Um91dGUgPSByb3V0ZS5faW5qZWN0b3IgPz8gaW5qZWN0b3I7XG4gICAgICBjb25zdCBpbmplY3RvckZvckNoaWxkcmVuID0gcm91dGUuX2xvYWRlZEluamVjdG9yID8/IGluamVjdG9yRm9yQ3VycmVudFJvdXRlO1xuXG4gICAgICAvLyBOb3RlIHRoYXQgYGNhbkxvYWRgIGlzIG9ubHkgY2hlY2tlZCBhcyBhIGNvbmRpdGlvbiB0aGF0IHByZXZlbnRzIGBsb2FkQ2hpbGRyZW5gIGFuZCBub3RcbiAgICAgIC8vIGBsb2FkQ29tcG9uZW50YC4gYGNhbkxvYWRgIGd1YXJkcyBvbmx5IGJsb2NrIGxvYWRpbmcgb2YgY2hpbGQgcm91dGVzIGJ5IGRlc2lnbi4gVGhpc1xuICAgICAgLy8gaGFwcGVucyBhcyBhIGNvbnNlcXVlbmNlIG9mIG5lZWRpbmcgdG8gZGVzY2VuZCBpbnRvIGNoaWxkcmVuIGZvciByb3V0ZSBtYXRjaGluZyBpbW1lZGlhdGVseVxuICAgICAgLy8gd2hpbGUgY29tcG9uZW50IGxvYWRpbmcgaXMgZGVmZXJyZWQgdW50aWwgcm91dGUgYWN0aXZhdGlvbi4gQmVjYXVzZSBgY2FuTG9hZGAgZ3VhcmRzIGNhblxuICAgICAgLy8gaGF2ZSBzaWRlIGVmZmVjdHMsIHdlIGNhbm5vdCBleGVjdXRlIHRoZW0gaGVyZSBzbyB3ZSBpbnN0ZWFkIHNraXAgcHJlbG9hZGluZyBhbHRvZ2V0aGVyXG4gICAgICAvLyB3aGVuIHByZXNlbnQuIExhc3RseSwgaXQgcmVtYWlucyB0byBiZSBkZWNpZGVkIHdoZXRoZXIgYGNhbkxvYWRgIHNob3VsZCBiZWhhdmUgdGhpcyB3YXlcbiAgICAgIC8vIGF0IGFsbC4gQ29kZSBzcGxpdHRpbmcgYW5kIGxhenkgbG9hZGluZyBpcyBzZXBhcmF0ZSBmcm9tIGNsaWVudC1zaWRlIGF1dGhvcml6YXRpb24gY2hlY2tzXG4gICAgICAvLyBhbmQgc2hvdWxkIG5vdCBiZSB1c2VkIGFzIGEgc2VjdXJpdHkgbWVhc3VyZSB0byBwcmV2ZW50IGxvYWRpbmcgb2YgY29kZS5cbiAgICAgIGlmICgocm91dGUubG9hZENoaWxkcmVuICYmICFyb3V0ZS5fbG9hZGVkUm91dGVzICYmIHJvdXRlLmNhbkxvYWQgPT09IHVuZGVmaW5lZCkgfHxcbiAgICAgICAgICAocm91dGUubG9hZENvbXBvbmVudCAmJiAhcm91dGUuX2xvYWRlZENvbXBvbmVudCkpIHtcbiAgICAgICAgcmVzLnB1c2godGhpcy5wcmVsb2FkQ29uZmlnKGluamVjdG9yRm9yQ3VycmVudFJvdXRlLCByb3V0ZSkpO1xuICAgICAgfVxuICAgICAgaWYgKHJvdXRlLmNoaWxkcmVuIHx8IHJvdXRlLl9sb2FkZWRSb3V0ZXMpIHtcbiAgICAgICAgcmVzLnB1c2godGhpcy5wcm9jZXNzUm91dGVzKGluamVjdG9yRm9yQ2hpbGRyZW4sIChyb3V0ZS5jaGlsZHJlbiA/PyByb3V0ZS5fbG9hZGVkUm91dGVzKSEpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZyb20ocmVzKS5waXBlKG1lcmdlQWxsKCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBwcmVsb2FkQ29uZmlnKGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLCByb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy5wcmVsb2FkaW5nU3RyYXRlZ3kucHJlbG9hZChyb3V0ZSwgKCkgPT4ge1xuICAgICAgbGV0IGxvYWRlZENoaWxkcmVuJDogT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWd8bnVsbD47XG4gICAgICBpZiAocm91dGUubG9hZENoaWxkcmVuICYmIHJvdXRlLmNhbkxvYWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBsb2FkZWRDaGlsZHJlbiQgPSB0aGlzLmxvYWRlci5sb2FkQ2hpbGRyZW4oaW5qZWN0b3IsIHJvdXRlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvYWRlZENoaWxkcmVuJCA9IG9mKG51bGwpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZWN1cnNpdmVMb2FkQ2hpbGRyZW4kID1cbiAgICAgICAgICBsb2FkZWRDaGlsZHJlbiQucGlwZShtZXJnZU1hcCgoY29uZmlnOiBMb2FkZWRSb3V0ZXJDb25maWd8bnVsbCkgPT4ge1xuICAgICAgICAgICAgaWYgKGNvbmZpZyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICByZXR1cm4gb2Yodm9pZCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRSb3V0ZXMgPSBjb25maWcucm91dGVzO1xuICAgICAgICAgICAgcm91dGUuX2xvYWRlZEluamVjdG9yID0gY29uZmlnLmluamVjdG9yO1xuICAgICAgICAgICAgLy8gSWYgdGhlIGxvYWRlZCBjb25maWcgd2FzIGEgbW9kdWxlLCB1c2UgdGhhdCBhcyB0aGUgbW9kdWxlL21vZHVsZSBpbmplY3RvciBnb2luZ1xuICAgICAgICAgICAgLy8gZm9yd2FyZC4gT3RoZXJ3aXNlLCBjb250aW51ZSB1c2luZyB0aGUgY3VycmVudCBtb2R1bGUvbW9kdWxlIGluamVjdG9yLlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1JvdXRlcyhjb25maWcuaW5qZWN0b3IgPz8gaW5qZWN0b3IsIGNvbmZpZy5yb3V0ZXMpO1xuICAgICAgICAgIH0pKTtcbiAgICAgIGlmIChyb3V0ZS5sb2FkQ29tcG9uZW50ICYmICFyb3V0ZS5fbG9hZGVkQ29tcG9uZW50KSB7XG4gICAgICAgIGNvbnN0IGxvYWRDb21wb25lbnQkID0gdGhpcy5sb2FkZXIubG9hZENvbXBvbmVudChyb3V0ZSk7XG4gICAgICAgIHJldHVybiBmcm9tKFtyZWN1cnNpdmVMb2FkQ2hpbGRyZW4kLCBsb2FkQ29tcG9uZW50JF0pLnBpcGUobWVyZ2VBbGwoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcmVjdXJzaXZlTG9hZENoaWxkcmVuJDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuIl19