/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Compiler, inject, Injectable, InjectFlags, InjectionToken, NgModuleFactory } from '@angular/core';
import { ConnectableObservable, from, of, Subject } from 'rxjs';
import { finalize, map, mergeMap, refCount, tap } from 'rxjs/operators';
import { wrapIntoObservable } from './utils/collection';
import { assertStandalone, standardizeConfig, validateConfig } from './utils/config';
import * as i0 from "@angular/core";
/**
 * The [DI token](guide/glossary/#di-token) for a router configuration.
 *
 * `ROUTES` is a low level API for router configuration via dependency injection.
 *
 * We recommend that in almost all cases to use higher level APIs such as `RouterModule.forRoot()`,
 * `provideRouter`, or `Router.resetConfig()`.
 *
 * @publicApi
 */
export const ROUTES = new InjectionToken('ROUTES');
class RouterConfigLoader {
    constructor() {
        this.componentLoaders = new WeakMap();
        this.childrenLoaders = new WeakMap();
        this.compiler = inject(Compiler);
    }
    loadComponent(route) {
        if (this.componentLoaders.get(route)) {
            return this.componentLoaders.get(route);
        }
        else if (route._loadedComponent) {
            return of(route._loadedComponent);
        }
        if (this.onLoadStartListener) {
            this.onLoadStartListener(route);
        }
        const loadRunner = wrapIntoObservable(route.loadComponent())
            .pipe(map(maybeUnwrapDefaultExport), tap(component => {
            if (this.onLoadEndListener) {
                this.onLoadEndListener(route);
            }
            (typeof ngDevMode === 'undefined' || ngDevMode) &&
                assertStandalone(route.path ?? '', component);
            route._loadedComponent = component;
        }), finalize(() => {
            this.componentLoaders.delete(route);
        }));
        // Use custom ConnectableObservable as share in runners pipe increasing the bundle size too much
        const loader = new ConnectableObservable(loadRunner, () => new Subject()).pipe(refCount());
        this.componentLoaders.set(route, loader);
        return loader;
    }
    loadChildren(parentInjector, route) {
        if (this.childrenLoaders.get(route)) {
            return this.childrenLoaders.get(route);
        }
        else if (route._loadedRoutes) {
            return of({ routes: route._loadedRoutes, injector: route._loadedInjector });
        }
        if (this.onLoadStartListener) {
            this.onLoadStartListener(route);
        }
        const moduleFactoryOrRoutes$ = this.loadModuleFactoryOrRoutes(route.loadChildren);
        const loadRunner = moduleFactoryOrRoutes$.pipe(map((factoryOrRoutes) => {
            if (this.onLoadEndListener) {
                this.onLoadEndListener(route);
            }
            // This injector comes from the `NgModuleRef` when lazy loading an `NgModule`. There is no
            // injector associated with lazy loading a `Route` array.
            let injector;
            let rawRoutes;
            let requireStandaloneComponents = false;
            if (Array.isArray(factoryOrRoutes)) {
                rawRoutes = factoryOrRoutes;
                requireStandaloneComponents = true;
            }
            else {
                injector = factoryOrRoutes.create(parentInjector).injector;
                // When loading a module that doesn't provide `RouterModule.forChild()` preloader
                // will get stuck in an infinite loop. The child module's Injector will look to
                // its parent `Injector` when it doesn't find any ROUTES so it will return routes
                // for it's parent module instead.
                rawRoutes = injector.get(ROUTES, [], InjectFlags.Self | InjectFlags.Optional).flat();
            }
            const routes = rawRoutes.map(standardizeConfig);
            (typeof ngDevMode === 'undefined' || ngDevMode) &&
                validateConfig(routes, route.path, requireStandaloneComponents);
            return { routes, injector };
        }), finalize(() => {
            this.childrenLoaders.delete(route);
        }));
        // Use custom ConnectableObservable as share in runners pipe increasing the bundle size too much
        const loader = new ConnectableObservable(loadRunner, () => new Subject())
            .pipe(refCount());
        this.childrenLoaders.set(route, loader);
        return loader;
    }
    loadModuleFactoryOrRoutes(loadChildren) {
        return wrapIntoObservable(loadChildren())
            .pipe(map(maybeUnwrapDefaultExport), mergeMap((t) => {
            if (t instanceof NgModuleFactory || Array.isArray(t)) {
                return of(t);
            }
            else {
                return from(this.compiler.compileModuleAsync(t));
            }
        }));
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.1.0-next.0+sha-bb6a3e8", ngImport: i0, type: RouterConfigLoader, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.1.0-next.0+sha-bb6a3e8", ngImport: i0, type: RouterConfigLoader, providedIn: 'root' }); }
}
export { RouterConfigLoader };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.1.0-next.0+sha-bb6a3e8", ngImport: i0, type: RouterConfigLoader, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
function isWrappedDefaultExport(value) {
    // We use `in` here with a string key `'default'`, because we expect `DefaultExport` objects to be
    // dynamically imported ES modules with a spec-mandated `default` key. Thus we don't expect that
    // `default` will be a renamed property.
    return value && typeof value === 'object' && 'default' in value;
}
function maybeUnwrapDefaultExport(input) {
    // As per `isWrappedDefaultExport`, the `default` key here is generated by the browser and not
    // subject to property renaming, so we reference it with bracket access.
    return isWrappedDefaultExport(input) ? input['default'] : input;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2NvbmZpZ19sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3JvdXRlcl9jb25maWdfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxRQUFRLEVBQXVCLE1BQU0sRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBWSxlQUFlLEVBQU8sTUFBTSxlQUFlLENBQUM7QUFDOUksT0FBTyxFQUFDLHFCQUFxQixFQUFFLElBQUksRUFBYyxFQUFFLEVBQUUsT0FBTyxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQzFFLE9BQU8sRUFBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFHdEUsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDdEQsT0FBTyxFQUFDLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLGNBQWMsRUFBQyxNQUFNLGdCQUFnQixDQUFDOztBQUluRjs7Ozs7Ozs7O0dBU0c7QUFDSCxNQUFNLENBQUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxjQUFjLENBQVksUUFBUSxDQUFDLENBQUM7QUFJOUQsTUFDYSxrQkFBa0I7SUFEL0I7UUFFVSxxQkFBZ0IsR0FBRyxJQUFJLE9BQU8sRUFBMEIsQ0FBQztRQUN6RCxvQkFBZSxHQUFHLElBQUksT0FBTyxFQUF5QyxDQUFDO1FBRzlELGFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7S0FnRzlDO0lBOUZDLGFBQWEsQ0FBQyxLQUFZO1FBQ3hCLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNwQyxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFFLENBQUM7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QyxDQUFDO2FBQ2Q7aUJBQU07Z0JBQ0wsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2xEO1FBQ0gsQ0FBQyxDQUFDLENBQ0wsQ0FBQztJQUNSLENBQUM7eUhBcEdVLGtCQUFrQjs2SEFBbEIsa0JBQWtCLGNBRE4sTUFBTTs7U0FDbEIsa0JBQWtCO3NHQUFsQixrQkFBa0I7a0JBRDlCLFVBQVU7bUJBQUMsRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFDOztBQXdHaEMsU0FBUyxzQkFBc0IsQ0FBSSxLQUF5QjtJQUMxRCxrR0FBa0c7SUFDbEcsZ0dBQWdHO0lBQ2hHLHdDQUF3QztJQUN4QyxPQUFPLEtBQUssSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksU0FBUyxJQUFJLEtBQUssQ0FBQztBQUNsRSxDQUFDO0FBRUQsU0FBUyx3QkFBd0IsQ0FBSSxLQUF5QjtJQUM1RCw4RkFBOEY7SUFDOUYsd0VBQXdFO0lBQ3hFLE9BQU8sc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ2xFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb21waWxlciwgRW52aXJvbm1lbnRJbmplY3RvciwgaW5qZWN0LCBJbmplY3RhYmxlLCBJbmplY3RGbGFncywgSW5qZWN0aW9uVG9rZW4sIEluamVjdG9yLCBOZ01vZHVsZUZhY3RvcnksIFR5cGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtDb25uZWN0YWJsZU9ic2VydmFibGUsIGZyb20sIE9ic2VydmFibGUsIG9mLCBTdWJqZWN0fSBmcm9tICdyeGpzJztcbmltcG9ydCB7ZmluYWxpemUsIG1hcCwgbWVyZ2VNYXAsIHJlZkNvdW50LCB0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtEZWZhdWx0RXhwb3J0LCBMb2FkQ2hpbGRyZW4sIExvYWRDaGlsZHJlbkNhbGxiYWNrLCBMb2FkZWRSb3V0ZXJDb25maWcsIFJvdXRlLCBSb3V0ZXN9IGZyb20gJy4vbW9kZWxzJztcbmltcG9ydCB7d3JhcEludG9PYnNlcnZhYmxlfSBmcm9tICcuL3V0aWxzL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHthc3NlcnRTdGFuZGFsb25lLCBzdGFuZGFyZGl6ZUNvbmZpZywgdmFsaWRhdGVDb25maWd9IGZyb20gJy4vdXRpbHMvY29uZmlnJztcblxuXG5cbi8qKlxuICogVGhlIFtESSB0b2tlbl0oZ3VpZGUvZ2xvc3NhcnkvI2RpLXRva2VuKSBmb3IgYSByb3V0ZXIgY29uZmlndXJhdGlvbi5cbiAqXG4gKiBgUk9VVEVTYCBpcyBhIGxvdyBsZXZlbCBBUEkgZm9yIHJvdXRlciBjb25maWd1cmF0aW9uIHZpYSBkZXBlbmRlbmN5IGluamVjdGlvbi5cbiAqXG4gKiBXZSByZWNvbW1lbmQgdGhhdCBpbiBhbG1vc3QgYWxsIGNhc2VzIHRvIHVzZSBoaWdoZXIgbGV2ZWwgQVBJcyBzdWNoIGFzIGBSb3V0ZXJNb2R1bGUuZm9yUm9vdCgpYCxcbiAqIGBwcm92aWRlUm91dGVyYCwgb3IgYFJvdXRlci5yZXNldENvbmZpZygpYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjb25zdCBST1VURVMgPSBuZXcgSW5qZWN0aW9uVG9rZW48Um91dGVbXVtdPignUk9VVEVTJyk7XG5cbnR5cGUgQ29tcG9uZW50TG9hZGVyID0gT2JzZXJ2YWJsZTxUeXBlPHVua25vd24+PjtcblxuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgUm91dGVyQ29uZmlnTG9hZGVyIHtcbiAgcHJpdmF0ZSBjb21wb25lbnRMb2FkZXJzID0gbmV3IFdlYWtNYXA8Um91dGUsIENvbXBvbmVudExvYWRlcj4oKTtcbiAgcHJpdmF0ZSBjaGlsZHJlbkxvYWRlcnMgPSBuZXcgV2Vha01hcDxSb3V0ZSwgT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWc+PigpO1xuICBvbkxvYWRTdGFydExpc3RlbmVyPzogKHI6IFJvdXRlKSA9PiB2b2lkO1xuICBvbkxvYWRFbmRMaXN0ZW5lcj86IChyOiBSb3V0ZSkgPT4gdm9pZDtcbiAgcHJpdmF0ZSByZWFkb25seSBjb21waWxlciA9IGluamVjdChDb21waWxlcik7XG5cbiAgbG9hZENvbXBvbmVudChyb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPFR5cGU8dW5rbm93bj4+IHtcbiAgICBpZiAodGhpcy5jb21wb25lbnRMb2FkZXJzLmdldChyb3V0ZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvbXBvbmVudExvYWRlcnMuZ2V0KHJvdXRlKSE7XG4gICAgfSBlbHNlIGlmIChyb3V0ZS5fbG9hZGVkQ29tcG9uZW50KSB7XG4gICAgICByZXR1cm4gb2Yocm91dGUuX2xvYWRlZENvbXBvbmVudCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcikge1xuICAgICAgdGhpcy5vbkxvYWRTdGFydExpc3RlbmVyKHJvdXRlKTtcbiAgICB9XG4gICAgY29uc3QgbG9hZFJ1bm5lciA9IHdyYXBJbnRvT2JzZXJ2YWJsZShyb3V0ZS5sb2FkQ29tcG9uZW50ISgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFwKG1heWJlVW53cmFwRGVmYXVsdEV4cG9ydCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFwKGNvbXBvbmVudCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vbkxvYWRFbmRMaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uTG9hZEVuZExpc3RlbmVyKHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0U3RhbmRhbG9uZShyb3V0ZS5wYXRoID8/ICcnLCBjb21wb25lbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm91dGUuX2xvYWRlZENvbXBvbmVudCA9IGNvbXBvbmVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbXBvbmVudExvYWRlcnMuZGVsZXRlKHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgLy8gVXNlIGN1c3RvbSBDb25uZWN0YWJsZU9ic2VydmFibGUgYXMgc2hhcmUgaW4gcnVubmVycyBwaXBlIGluY3JlYXNpbmcgdGhlIGJ1bmRsZSBzaXplIHRvbyBtdWNoXG4gICAgY29uc3QgbG9hZGVyID1cbiAgICAgICAgbmV3IENvbm5lY3RhYmxlT2JzZXJ2YWJsZShsb2FkUnVubmVyLCAoKSA9PiBuZXcgU3ViamVjdDxUeXBlPHVua25vd24+PigpKS5waXBlKHJlZkNvdW50KCkpO1xuICAgIHRoaXMuY29tcG9uZW50TG9hZGVycy5zZXQocm91dGUsIGxvYWRlcik7XG4gICAgcmV0dXJuIGxvYWRlcjtcbiAgfVxuXG4gIGxvYWRDaGlsZHJlbihwYXJlbnRJbmplY3RvcjogSW5qZWN0b3IsIHJvdXRlOiBSb3V0ZSk6IE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPiB7XG4gICAgaWYgKHRoaXMuY2hpbGRyZW5Mb2FkZXJzLmdldChyb3V0ZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNoaWxkcmVuTG9hZGVycy5nZXQocm91dGUpITtcbiAgICB9IGVsc2UgaWYgKHJvdXRlLl9sb2FkZWRSb3V0ZXMpIHtcbiAgICAgIHJldHVybiBvZih7cm91dGVzOiByb3V0ZS5fbG9hZGVkUm91dGVzLCBpbmplY3Rvcjogcm91dGUuX2xvYWRlZEluamVjdG9yfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcikge1xuICAgICAgdGhpcy5vbkxvYWRTdGFydExpc3RlbmVyKHJvdXRlKTtcbiAgICB9XG4gICAgY29uc3QgbW9kdWxlRmFjdG9yeU9yUm91dGVzJCA9IHRoaXMubG9hZE1vZHVsZUZhY3RvcnlPclJvdXRlcyhyb3V0ZS5sb2FkQ2hpbGRyZW4hKTtcbiAgICBjb25zdCBsb2FkUnVubmVyID0gbW9kdWxlRmFjdG9yeU9yUm91dGVzJC5waXBlKFxuICAgICAgICBtYXAoKGZhY3RvcnlPclJvdXRlczogTmdNb2R1bGVGYWN0b3J5PGFueT58Um91dGVzKSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMub25Mb2FkRW5kTGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHRoaXMub25Mb2FkRW5kTGlzdGVuZXIocm91dGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBUaGlzIGluamVjdG9yIGNvbWVzIGZyb20gdGhlIGBOZ01vZHVsZVJlZmAgd2hlbiBsYXp5IGxvYWRpbmcgYW4gYE5nTW9kdWxlYC4gVGhlcmUgaXMgbm9cbiAgICAgICAgICAvLyBpbmplY3RvciBhc3NvY2lhdGVkIHdpdGggbGF6eSBsb2FkaW5nIGEgYFJvdXRlYCBhcnJheS5cbiAgICAgICAgICBsZXQgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3J8dW5kZWZpbmVkO1xuICAgICAgICAgIGxldCByYXdSb3V0ZXM6IFJvdXRlW107XG4gICAgICAgICAgbGV0IHJlcXVpcmVTdGFuZGFsb25lQ29tcG9uZW50cyA9IGZhbHNlO1xuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGZhY3RvcnlPclJvdXRlcykpIHtcbiAgICAgICAgICAgIHJhd1JvdXRlcyA9IGZhY3RvcnlPclJvdXRlcztcbiAgICAgICAgICAgIHJlcXVpcmVTdGFuZGFsb25lQ29tcG9uZW50cyA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluamVjdG9yID0gZmFjdG9yeU9yUm91dGVzLmNyZWF0ZShwYXJlbnRJbmplY3RvcikuaW5qZWN0b3I7XG4gICAgICAgICAgICAvLyBXaGVuIGxvYWRpbmcgYSBtb2R1bGUgdGhhdCBkb2Vzbid0IHByb3ZpZGUgYFJvdXRlck1vZHVsZS5mb3JDaGlsZCgpYCBwcmVsb2FkZXJcbiAgICAgICAgICAgIC8vIHdpbGwgZ2V0IHN0dWNrIGluIGFuIGluZmluaXRlIGxvb3AuIFRoZSBjaGlsZCBtb2R1bGUncyBJbmplY3RvciB3aWxsIGxvb2sgdG9cbiAgICAgICAgICAgIC8vIGl0cyBwYXJlbnQgYEluamVjdG9yYCB3aGVuIGl0IGRvZXNuJ3QgZmluZCBhbnkgUk9VVEVTIHNvIGl0IHdpbGwgcmV0dXJuIHJvdXRlc1xuICAgICAgICAgICAgLy8gZm9yIGl0J3MgcGFyZW50IG1vZHVsZSBpbnN0ZWFkLlxuICAgICAgICAgICAgcmF3Um91dGVzID0gaW5qZWN0b3IuZ2V0KFJPVVRFUywgW10sIEluamVjdEZsYWdzLlNlbGYgfCBJbmplY3RGbGFncy5PcHRpb25hbCkuZmxhdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCByb3V0ZXMgPSByYXdSb3V0ZXMubWFwKHN0YW5kYXJkaXplQ29uZmlnKTtcbiAgICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICAgICAgICB2YWxpZGF0ZUNvbmZpZyhyb3V0ZXMsIHJvdXRlLnBhdGgsIHJlcXVpcmVTdGFuZGFsb25lQ29tcG9uZW50cyk7XG4gICAgICAgICAgcmV0dXJuIHtyb3V0ZXMsIGluamVjdG9yfTtcbiAgICAgICAgfSksXG4gICAgICAgIGZpbmFsaXplKCgpID0+IHtcbiAgICAgICAgICB0aGlzLmNoaWxkcmVuTG9hZGVycy5kZWxldGUocm91dGUpO1xuICAgICAgICB9KSxcbiAgICApO1xuICAgIC8vIFVzZSBjdXN0b20gQ29ubmVjdGFibGVPYnNlcnZhYmxlIGFzIHNoYXJlIGluIHJ1bm5lcnMgcGlwZSBpbmNyZWFzaW5nIHRoZSBidW5kbGUgc2l6ZSB0b28gbXVjaFxuICAgIGNvbnN0IGxvYWRlciA9IG5ldyBDb25uZWN0YWJsZU9ic2VydmFibGUobG9hZFJ1bm5lciwgKCkgPT4gbmV3IFN1YmplY3Q8TG9hZGVkUm91dGVyQ29uZmlnPigpKVxuICAgICAgICAgICAgICAgICAgICAgICAucGlwZShyZWZDb3VudCgpKTtcbiAgICB0aGlzLmNoaWxkcmVuTG9hZGVycy5zZXQocm91dGUsIGxvYWRlcik7XG4gICAgcmV0dXJuIGxvYWRlcjtcbiAgfVxuXG4gIHByaXZhdGUgbG9hZE1vZHVsZUZhY3RvcnlPclJvdXRlcyhsb2FkQ2hpbGRyZW46IExvYWRDaGlsZHJlbik6XG4gICAgICBPYnNlcnZhYmxlPE5nTW9kdWxlRmFjdG9yeTxhbnk+fFJvdXRlcz4ge1xuICAgIHJldHVybiB3cmFwSW50b09ic2VydmFibGUoKGxvYWRDaGlsZHJlbiBhcyBMb2FkQ2hpbGRyZW5DYWxsYmFjaykoKSlcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICBtYXAobWF5YmVVbndyYXBEZWZhdWx0RXhwb3J0KSxcbiAgICAgICAgICAgIG1lcmdlTWFwKCh0KSA9PiB7XG4gICAgICAgICAgICAgIGlmICh0IGluc3RhbmNlb2YgTmdNb2R1bGVGYWN0b3J5IHx8IEFycmF5LmlzQXJyYXkodCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb2YodCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZyb20odGhpcy5jb21waWxlci5jb21waWxlTW9kdWxlQXN5bmModCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc1dyYXBwZWREZWZhdWx0RXhwb3J0PFQ+KHZhbHVlOiBUfERlZmF1bHRFeHBvcnQ8VD4pOiB2YWx1ZSBpcyBEZWZhdWx0RXhwb3J0PFQ+IHtcbiAgLy8gV2UgdXNlIGBpbmAgaGVyZSB3aXRoIGEgc3RyaW5nIGtleSBgJ2RlZmF1bHQnYCwgYmVjYXVzZSB3ZSBleHBlY3QgYERlZmF1bHRFeHBvcnRgIG9iamVjdHMgdG8gYmVcbiAgLy8gZHluYW1pY2FsbHkgaW1wb3J0ZWQgRVMgbW9kdWxlcyB3aXRoIGEgc3BlYy1tYW5kYXRlZCBgZGVmYXVsdGAga2V5LiBUaHVzIHdlIGRvbid0IGV4cGVjdCB0aGF0XG4gIC8vIGBkZWZhdWx0YCB3aWxsIGJlIGEgcmVuYW1lZCBwcm9wZXJ0eS5cbiAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgJ2RlZmF1bHQnIGluIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBtYXliZVVud3JhcERlZmF1bHRFeHBvcnQ8VD4oaW5wdXQ6IFR8RGVmYXVsdEV4cG9ydDxUPik6IFQge1xuICAvLyBBcyBwZXIgYGlzV3JhcHBlZERlZmF1bHRFeHBvcnRgLCB0aGUgYGRlZmF1bHRgIGtleSBoZXJlIGlzIGdlbmVyYXRlZCBieSB0aGUgYnJvd3NlciBhbmQgbm90XG4gIC8vIHN1YmplY3QgdG8gcHJvcGVydHkgcmVuYW1pbmcsIHNvIHdlIHJlZmVyZW5jZSBpdCB3aXRoIGJyYWNrZXQgYWNjZXNzLlxuICByZXR1cm4gaXNXcmFwcGVkRGVmYXVsdEV4cG9ydChpbnB1dCkgPyBpbnB1dFsnZGVmYXVsdCddIDogaW5wdXQ7XG59XG4iXX0=