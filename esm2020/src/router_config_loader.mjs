/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Compiler, Injectable, InjectFlags, InjectionToken, Injector, NgModuleFactory } from '@angular/core';
import { ConnectableObservable, from, of, Subject } from 'rxjs';
import { finalize, map, mergeMap, refCount, tap } from 'rxjs/operators';
import { deprecatedLoadChildrenString } from './deprecated_load_children';
import { flatten, wrapIntoObservable } from './utils/collection';
import { assertStandalone, standardizeConfig, validateConfig } from './utils/config';
import * as i0 from "@angular/core";
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || !!ngDevMode;
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
    constructor(injector, compiler) {
        this.injector = injector;
        this.compiler = compiler;
        this.componentLoaders = new WeakMap();
        this.childrenLoaders = new WeakMap();
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
            NG_DEV_MODE && assertStandalone(route.path ?? '', component);
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
                rawRoutes = flatten(injector.get(ROUTES, [], InjectFlags.Self | InjectFlags.Optional));
            }
            const routes = rawRoutes.map(standardizeConfig);
            NG_DEV_MODE && validateConfig(routes, route.path, requireStandaloneComponents);
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
        const deprecatedResult = deprecatedLoadChildrenString(this.injector, loadChildren);
        if (deprecatedResult) {
            return deprecatedResult;
        }
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
}
RouterConfigLoader.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.0+sha-dba747f", ngImport: i0, type: RouterConfigLoader, deps: [{ token: i0.Injector }, { token: i0.Compiler }], target: i0.ɵɵFactoryTarget.Injectable });
RouterConfigLoader.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.0.0-next.0+sha-dba747f", ngImport: i0, type: RouterConfigLoader, providedIn: 'root' });
export { RouterConfigLoader };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.0+sha-dba747f", ngImport: i0, type: RouterConfigLoader, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: function () { return [{ type: i0.Injector }, { type: i0.Compiler }]; } });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2NvbmZpZ19sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3JvdXRlcl9jb25maWdfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxRQUFRLEVBQXVCLFVBQVUsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQU8sTUFBTSxlQUFlLENBQUM7QUFDdEksT0FBTyxFQUFDLHFCQUFxQixFQUFFLElBQUksRUFBYyxFQUFFLEVBQUUsT0FBTyxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQzFFLE9BQU8sRUFBYSxRQUFRLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFbEYsT0FBTyxFQUFDLDRCQUE0QixFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFFeEUsT0FBTyxFQUFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQy9ELE9BQU8sRUFBQyxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQzs7QUFHbkYsTUFBTSxXQUFXLEdBQUcsT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFFcEU7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFHLElBQUksY0FBYyxDQUFZLFFBQVEsQ0FBQyxDQUFDO0FBSTlELE1BQ2Esa0JBQWtCO0lBTTdCLFlBQ1ksUUFBa0IsRUFDbEIsUUFBa0I7UUFEbEIsYUFBUSxHQUFSLFFBQVEsQ0FBVTtRQUNsQixhQUFRLEdBQVIsUUFBUSxDQUFVO1FBUHRCLHFCQUFnQixHQUFHLElBQUksT0FBTyxFQUEwQixDQUFDO1FBQ3pELG9CQUFlLEdBQUcsSUFBSSxPQUFP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QUNELE9BQU8sa0JBQWtCLENBQUUsWUFBcUMsRUFBRSxDQUFDO2FBQzlELElBQUksQ0FDRCxHQUFHLENBQUMsd0JBQXdCLENBQUMsRUFDN0IsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDYixJQUFJLENBQUMsWUFBWSxlQUFlLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDcEQsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDZDtpQkFBTTtnQkFDTCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDbEQ7UUFDSCxDQUFDLENBQUMsQ0FDTCxDQUFDO0lBQ1IsQ0FBQzs7MEhBMUdVLGtCQUFrQjs4SEFBbEIsa0JBQWtCLGNBRE4sTUFBTTtTQUNsQixrQkFBa0I7c0dBQWxCLGtCQUFrQjtrQkFEOUIsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUM7O0FBOEdoQyxTQUFTLHNCQUFzQixDQUFJLEtBQXlCO0lBQzFELGtHQUFrRztJQUNsRyxnR0FBZ0c7SUFDaEcsd0NBQXdDO0lBQ3hDLE9BQU8sS0FBSyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxTQUFTLElBQUksS0FBSyxDQUFDO0FBQ2xFLENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFJLEtBQXlCO0lBQzVELDhGQUE4RjtJQUM5Rix3RUFBd0U7SUFDeEUsT0FBTyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDbEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbXBpbGVyLCBFbnZpcm9ubWVudEluamVjdG9yLCBJbmplY3RhYmxlLCBJbmplY3RGbGFncywgSW5qZWN0aW9uVG9rZW4sIEluamVjdG9yLCBOZ01vZHVsZUZhY3RvcnksIFR5cGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtDb25uZWN0YWJsZU9ic2VydmFibGUsIGZyb20sIE9ic2VydmFibGUsIG9mLCBTdWJqZWN0fSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y2F0Y2hFcnJvciwgZmluYWxpemUsIG1hcCwgbWVyZ2VNYXAsIHJlZkNvdW50LCB0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtkZXByZWNhdGVkTG9hZENoaWxkcmVuU3RyaW5nfSBmcm9tICcuL2RlcHJlY2F0ZWRfbG9hZF9jaGlsZHJlbic7XG5pbXBvcnQge0RlZmF1bHRFeHBvcnQsIExvYWRDaGlsZHJlbiwgTG9hZENoaWxkcmVuQ2FsbGJhY2ssIExvYWRlZFJvdXRlckNvbmZpZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtmbGF0dGVuLCB3cmFwSW50b09ic2VydmFibGV9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge2Fzc2VydFN0YW5kYWxvbmUsIHN0YW5kYXJkaXplQ29uZmlnLCB2YWxpZGF0ZUNvbmZpZ30gZnJvbSAnLi91dGlscy9jb25maWcnO1xuXG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgISFuZ0Rldk1vZGU7XG5cbi8qKlxuICogVGhlIFtESSB0b2tlbl0oZ3VpZGUvZ2xvc3NhcnkvI2RpLXRva2VuKSBmb3IgYSByb3V0ZXIgY29uZmlndXJhdGlvbi5cbiAqXG4gKiBgUk9VVEVTYCBpcyBhIGxvdyBsZXZlbCBBUEkgZm9yIHJvdXRlciBjb25maWd1cmF0aW9uIHZpYSBkZXBlbmRlbmN5IGluamVjdGlvbi5cbiAqXG4gKiBXZSByZWNvbW1lbmQgdGhhdCBpbiBhbG1vc3QgYWxsIGNhc2VzIHRvIHVzZSBoaWdoZXIgbGV2ZWwgQVBJcyBzdWNoIGFzIGBSb3V0ZXJNb2R1bGUuZm9yUm9vdCgpYCxcbiAqIGBwcm92aWRlUm91dGVyYCwgb3IgYFJvdXRlci5yZXNldENvbmZpZygpYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjb25zdCBST1VURVMgPSBuZXcgSW5qZWN0aW9uVG9rZW48Um91dGVbXVtdPignUk9VVEVTJyk7XG5cbnR5cGUgQ29tcG9uZW50TG9hZGVyID0gT2JzZXJ2YWJsZTxUeXBlPHVua25vd24+PjtcblxuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgUm91dGVyQ29uZmlnTG9hZGVyIHtcbiAgcHJpdmF0ZSBjb21wb25lbnRMb2FkZXJzID0gbmV3IFdlYWtNYXA8Um91dGUsIENvbXBvbmVudExvYWRlcj4oKTtcbiAgcHJpdmF0ZSBjaGlsZHJlbkxvYWRlcnMgPSBuZXcgV2Vha01hcDxSb3V0ZSwgT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWc+PigpO1xuICBvbkxvYWRTdGFydExpc3RlbmVyPzogKHI6IFJvdXRlKSA9PiB2b2lkO1xuICBvbkxvYWRFbmRMaXN0ZW5lcj86IChyOiBSb3V0ZSkgPT4gdm9pZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaW5qZWN0b3I6IEluamVjdG9yLFxuICAgICAgcHJpdmF0ZSBjb21waWxlcjogQ29tcGlsZXIsXG4gICkge31cblxuICBsb2FkQ29tcG9uZW50KHJvdXRlOiBSb3V0ZSk6IE9ic2VydmFibGU8VHlwZTx1bmtub3duPj4ge1xuICAgIGlmICh0aGlzLmNvbXBvbmVudExvYWRlcnMuZ2V0KHJvdXRlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuY29tcG9uZW50TG9hZGVycy5nZXQocm91dGUpITtcbiAgICB9IGVsc2UgaWYgKHJvdXRlLl9sb2FkZWRDb21wb25lbnQpIHtcbiAgICAgIHJldHVybiBvZihyb3V0ZS5fbG9hZGVkQ29tcG9uZW50KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vbkxvYWRTdGFydExpc3RlbmVyKSB7XG4gICAgICB0aGlzLm9uTG9hZFN0YXJ0TGlzdGVuZXIocm91dGUpO1xuICAgIH1cbiAgICBjb25zdCBsb2FkUnVubmVyID0gd3JhcEludG9PYnNlcnZhYmxlKHJvdXRlLmxvYWRDb21wb25lbnQhKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAucGlwZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXAobWF5YmVVbndyYXBEZWZhdWx0RXhwb3J0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXAoY29tcG9uZW50ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm9uTG9hZEVuZExpc3RlbmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub25Mb2FkRW5kTGlzdGVuZXIocm91dGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTkdfREVWX01PREUgJiYgYXNzZXJ0U3RhbmRhbG9uZShyb3V0ZS5wYXRoID8/ICcnLCBjb21wb25lbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm91dGUuX2xvYWRlZENvbXBvbmVudCA9IGNvbXBvbmVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbXBvbmVudExvYWRlcnMuZGVsZXRlKHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgLy8gVXNlIGN1c3RvbSBDb25uZWN0YWJsZU9ic2VydmFibGUgYXMgc2hhcmUgaW4gcnVubmVycyBwaXBlIGluY3JlYXNpbmcgdGhlIGJ1bmRsZSBzaXplIHRvbyBtdWNoXG4gICAgY29uc3QgbG9hZGVyID1cbiAgICAgICAgbmV3IENvbm5lY3RhYmxlT2JzZXJ2YWJsZShsb2FkUnVubmVyLCAoKSA9PiBuZXcgU3ViamVjdDxUeXBlPHVua25vd24+PigpKS5waXBlKHJlZkNvdW50KCkpO1xuICAgIHRoaXMuY29tcG9uZW50TG9hZGVycy5zZXQocm91dGUsIGxvYWRlcik7XG4gICAgcmV0dXJuIGxvYWRlcjtcbiAgfVxuXG4gIGxvYWRDaGlsZHJlbihwYXJlbnRJbmplY3RvcjogSW5qZWN0b3IsIHJvdXRlOiBSb3V0ZSk6IE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPiB7XG4gICAgaWYgKHRoaXMuY2hpbGRyZW5Mb2FkZXJzLmdldChyb3V0ZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNoaWxkcmVuTG9hZGVycy5nZXQocm91dGUpITtcbiAgICB9IGVsc2UgaWYgKHJvdXRlLl9sb2FkZWRSb3V0ZXMpIHtcbiAgICAgIHJldHVybiBvZih7cm91dGVzOiByb3V0ZS5fbG9hZGVkUm91dGVzLCBpbmplY3Rvcjogcm91dGUuX2xvYWRlZEluamVjdG9yfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcikge1xuICAgICAgdGhpcy5vbkxvYWRTdGFydExpc3RlbmVyKHJvdXRlKTtcbiAgICB9XG4gICAgY29uc3QgbW9kdWxlRmFjdG9yeU9yUm91dGVzJCA9IHRoaXMubG9hZE1vZHVsZUZhY3RvcnlPclJvdXRlcyhyb3V0ZS5sb2FkQ2hpbGRyZW4hKTtcbiAgICBjb25zdCBsb2FkUnVubmVyID0gbW9kdWxlRmFjdG9yeU9yUm91dGVzJC5waXBlKFxuICAgICAgICBtYXAoKGZhY3RvcnlPclJvdXRlczogTmdNb2R1bGVGYWN0b3J5PGFueT58Um91dGVzKSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMub25Mb2FkRW5kTGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHRoaXMub25Mb2FkRW5kTGlzdGVuZXIocm91dGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBUaGlzIGluamVjdG9yIGNvbWVzIGZyb20gdGhlIGBOZ01vZHVsZVJlZmAgd2hlbiBsYXp5IGxvYWRpbmcgYW4gYE5nTW9kdWxlYC4gVGhlcmUgaXMgbm9cbiAgICAgICAgICAvLyBpbmplY3RvciBhc3NvY2lhdGVkIHdpdGggbGF6eSBsb2FkaW5nIGEgYFJvdXRlYCBhcnJheS5cbiAgICAgICAgICBsZXQgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3J8dW5kZWZpbmVkO1xuICAgICAgICAgIGxldCByYXdSb3V0ZXM6IFJvdXRlW107XG4gICAgICAgICAgbGV0IHJlcXVpcmVTdGFuZGFsb25lQ29tcG9uZW50cyA9IGZhbHNlO1xuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGZhY3RvcnlPclJvdXRlcykpIHtcbiAgICAgICAgICAgIHJhd1JvdXRlcyA9IGZhY3RvcnlPclJvdXRlcztcbiAgICAgICAgICAgIHJlcXVpcmVTdGFuZGFsb25lQ29tcG9uZW50cyA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluamVjdG9yID0gZmFjdG9yeU9yUm91dGVzLmNyZWF0ZShwYXJlbnRJbmplY3RvcikuaW5qZWN0b3I7XG4gICAgICAgICAgICAvLyBXaGVuIGxvYWRpbmcgYSBtb2R1bGUgdGhhdCBkb2Vzbid0IHByb3ZpZGUgYFJvdXRlck1vZHVsZS5mb3JDaGlsZCgpYCBwcmVsb2FkZXJcbiAgICAgICAgICAgIC8vIHdpbGwgZ2V0IHN0dWNrIGluIGFuIGluZmluaXRlIGxvb3AuIFRoZSBjaGlsZCBtb2R1bGUncyBJbmplY3RvciB3aWxsIGxvb2sgdG9cbiAgICAgICAgICAgIC8vIGl0cyBwYXJlbnQgYEluamVjdG9yYCB3aGVuIGl0IGRvZXNuJ3QgZmluZCBhbnkgUk9VVEVTIHNvIGl0IHdpbGwgcmV0dXJuIHJvdXRlc1xuICAgICAgICAgICAgLy8gZm9yIGl0J3MgcGFyZW50IG1vZHVsZSBpbnN0ZWFkLlxuICAgICAgICAgICAgcmF3Um91dGVzID0gZmxhdHRlbihpbmplY3Rvci5nZXQoUk9VVEVTLCBbXSwgSW5qZWN0RmxhZ3MuU2VsZiB8IEluamVjdEZsYWdzLk9wdGlvbmFsKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHJvdXRlcyA9IHJhd1JvdXRlcy5tYXAoc3RhbmRhcmRpemVDb25maWcpO1xuICAgICAgICAgIE5HX0RFVl9NT0RFICYmIHZhbGlkYXRlQ29uZmlnKHJvdXRlcywgcm91dGUucGF0aCwgcmVxdWlyZVN0YW5kYWxvbmVDb21wb25lbnRzKTtcbiAgICAgICAgICByZXR1cm4ge3JvdXRlcywgaW5qZWN0b3J9O1xuICAgICAgICB9KSxcbiAgICAgICAgZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgIHRoaXMuY2hpbGRyZW5Mb2FkZXJzLmRlbGV0ZShyb3V0ZSk7XG4gICAgICAgIH0pLFxuICAgICk7XG4gICAgLy8gVXNlIGN1c3RvbSBDb25uZWN0YWJsZU9ic2VydmFibGUgYXMgc2hhcmUgaW4gcnVubmVycyBwaXBlIGluY3JlYXNpbmcgdGhlIGJ1bmRsZSBzaXplIHRvbyBtdWNoXG4gICAgY29uc3QgbG9hZGVyID0gbmV3IENvbm5lY3RhYmxlT2JzZXJ2YWJsZShsb2FkUnVubmVyLCAoKSA9PiBuZXcgU3ViamVjdDxMb2FkZWRSb3V0ZXJDb25maWc+KCkpXG4gICAgICAgICAgICAgICAgICAgICAgIC5waXBlKHJlZkNvdW50KCkpO1xuICAgIHRoaXMuY2hpbGRyZW5Mb2FkZXJzLnNldChyb3V0ZSwgbG9hZGVyKTtcbiAgICByZXR1cm4gbG9hZGVyO1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkTW9kdWxlRmFjdG9yeU9yUm91dGVzKGxvYWRDaGlsZHJlbjogTG9hZENoaWxkcmVuKTpcbiAgICAgIE9ic2VydmFibGU8TmdNb2R1bGVGYWN0b3J5PGFueT58Um91dGVzPiB7XG4gICAgY29uc3QgZGVwcmVjYXRlZFJlc3VsdCA9IGRlcHJlY2F0ZWRMb2FkQ2hpbGRyZW5TdHJpbmcodGhpcy5pbmplY3RvciwgbG9hZENoaWxkcmVuKTtcbiAgICBpZiAoZGVwcmVjYXRlZFJlc3VsdCkge1xuICAgICAgcmV0dXJuIGRlcHJlY2F0ZWRSZXN1bHQ7XG4gICAgfVxuICAgIHJldHVybiB3cmFwSW50b09ic2VydmFibGUoKGxvYWRDaGlsZHJlbiBhcyBMb2FkQ2hpbGRyZW5DYWxsYmFjaykoKSlcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICBtYXAobWF5YmVVbndyYXBEZWZhdWx0RXhwb3J0KSxcbiAgICAgICAgICAgIG1lcmdlTWFwKCh0KSA9PiB7XG4gICAgICAgICAgICAgIGlmICh0IGluc3RhbmNlb2YgTmdNb2R1bGVGYWN0b3J5IHx8IEFycmF5LmlzQXJyYXkodCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb2YodCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZyb20odGhpcy5jb21waWxlci5jb21waWxlTW9kdWxlQXN5bmModCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc1dyYXBwZWREZWZhdWx0RXhwb3J0PFQ+KHZhbHVlOiBUfERlZmF1bHRFeHBvcnQ8VD4pOiB2YWx1ZSBpcyBEZWZhdWx0RXhwb3J0PFQ+IHtcbiAgLy8gV2UgdXNlIGBpbmAgaGVyZSB3aXRoIGEgc3RyaW5nIGtleSBgJ2RlZmF1bHQnYCwgYmVjYXVzZSB3ZSBleHBlY3QgYERlZmF1bHRFeHBvcnRgIG9iamVjdHMgdG8gYmVcbiAgLy8gZHluYW1pY2FsbHkgaW1wb3J0ZWQgRVMgbW9kdWxlcyB3aXRoIGEgc3BlYy1tYW5kYXRlZCBgZGVmYXVsdGAga2V5LiBUaHVzIHdlIGRvbid0IGV4cGVjdCB0aGF0XG4gIC8vIGBkZWZhdWx0YCB3aWxsIGJlIGEgcmVuYW1lZCBwcm9wZXJ0eS5cbiAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgJ2RlZmF1bHQnIGluIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBtYXliZVVud3JhcERlZmF1bHRFeHBvcnQ8VD4oaW5wdXQ6IFR8RGVmYXVsdEV4cG9ydDxUPik6IFQge1xuICAvLyBBcyBwZXIgYGlzV3JhcHBlZERlZmF1bHRFeHBvcnRgLCB0aGUgYGRlZmF1bHRgIGtleSBoZXJlIGlzIGdlbmVyYXRlZCBieSB0aGUgYnJvd3NlciBhbmQgbm90XG4gIC8vIHN1YmplY3QgdG8gcHJvcGVydHkgcmVuYW1pbmcsIHNvIHdlIHJlZmVyZW5jZSBpdCB3aXRoIGJyYWNrZXQgYWNjZXNzLlxuICByZXR1cm4gaXNXcmFwcGVkRGVmYXVsdEV4cG9ydChpbnB1dCkgPyBpbnB1dFsnZGVmYXVsdCddIDogaW5wdXQ7XG59XG4iXX0=