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
export class RouterConfigLoader {
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.2.0-next.1+sha-16ce6e7", ngImport: i0, type: RouterConfigLoader, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.2.0-next.1+sha-16ce6e7", ngImport: i0, type: RouterConfigLoader, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.2.0-next.1+sha-16ce6e7", ngImport: i0, type: RouterConfigLoader, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2NvbmZpZ19sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3JvdXRlcl9jb25maWdfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxRQUFRLEVBQXVCLE1BQU0sRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBWSxlQUFlLEVBQU8sTUFBTSxlQUFlLENBQUM7QUFDOUksT0FBTyxFQUFDLHFCQUFxQixFQUFFLElBQUksRUFBYyxFQUFFLEVBQUUsT0FBTyxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQzFFLE9BQU8sRUFBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFHdEUsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDdEQsT0FBTyxFQUFDLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLGNBQWMsRUFBQyxNQUFNLGdCQUFnQixDQUFDOztBQUluRjs7Ozs7Ozs7O0dBU0c7QUFDSCxNQUFNLENBQUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxjQUFjLENBQVksUUFBUSxDQUFDLENBQUM7QUFLOUQsTUFBTSxPQUFPLGtCQUFrQjtJQUQvQjtRQUVVLHFCQUFnQixHQUFHLElBQUksT0FBTyxFQUEwQixDQUFDO1FBQ3pELG9CQUFlLEdBQUcsSUFBSSxPQUFPLEVBQXlDLENBQUM7UUFHOUQsYUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztLQWdHOUM7SUE5RkMsYUFBYSxDQUFDLEtBQVk7UUFDeEIsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3BDLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUUs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QyxDQUFDLENBQUM7YUFDZDtpQkFBTTtnQkFDTCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDbEQ7UUFDSCxDQUFDLENBQUMsQ0FDTCxDQUFDO0lBQ1IsQ0FBQzt5SEFwR1Usa0JBQWtCOzZIQUFsQixrQkFBa0IsY0FETixNQUFNOztzR0FDbEIsa0JBQWtCO2tCQUQ5QixVQUFVO21CQUFDLEVBQUMsVUFBVSxFQUFFLE1BQU0sRUFBQzs7QUF3R2hDLFNBQVMsc0JBQXNCLENBQUksS0FBeUI7SUFDMUQsa0dBQWtHO0lBQ2xHLGdHQUFnRztJQUNoRyx3Q0FBd0M7SUFDeEMsT0FBTyxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLFNBQVMsSUFBSSxLQUFLLENBQUM7QUFDbEUsQ0FBQztBQUVELFNBQVMsd0JBQXdCLENBQUksS0FBeUI7SUFDNUQsOEZBQThGO0lBQzlGLHdFQUF3RTtJQUN4RSxPQUFPLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNsRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29tcGlsZXIsIEVudmlyb25tZW50SW5qZWN0b3IsIGluamVjdCwgSW5qZWN0YWJsZSwgSW5qZWN0RmxhZ3MsIEluamVjdGlvblRva2VuLCBJbmplY3RvciwgTmdNb2R1bGVGYWN0b3J5LCBUeXBlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Q29ubmVjdGFibGVPYnNlcnZhYmxlLCBmcm9tLCBPYnNlcnZhYmxlLCBvZiwgU3ViamVjdH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2ZpbmFsaXplLCBtYXAsIG1lcmdlTWFwLCByZWZDb3VudCwgdGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7RGVmYXVsdEV4cG9ydCwgTG9hZENoaWxkcmVuLCBMb2FkQ2hpbGRyZW5DYWxsYmFjaywgTG9hZGVkUm91dGVyQ29uZmlnLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge3dyYXBJbnRvT2JzZXJ2YWJsZX0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcbmltcG9ydCB7YXNzZXJ0U3RhbmRhbG9uZSwgc3RhbmRhcmRpemVDb25maWcsIHZhbGlkYXRlQ29uZmlnfSBmcm9tICcuL3V0aWxzL2NvbmZpZyc7XG5cblxuXG4vKipcbiAqIFRoZSBbREkgdG9rZW5dKGd1aWRlL2dsb3NzYXJ5LyNkaS10b2tlbikgZm9yIGEgcm91dGVyIGNvbmZpZ3VyYXRpb24uXG4gKlxuICogYFJPVVRFU2AgaXMgYSBsb3cgbGV2ZWwgQVBJIGZvciByb3V0ZXIgY29uZmlndXJhdGlvbiB2aWEgZGVwZW5kZW5jeSBpbmplY3Rpb24uXG4gKlxuICogV2UgcmVjb21tZW5kIHRoYXQgaW4gYWxtb3N0IGFsbCBjYXNlcyB0byB1c2UgaGlnaGVyIGxldmVsIEFQSXMgc3VjaCBhcyBgUm91dGVyTW9kdWxlLmZvclJvb3QoKWAsXG4gKiBgcHJvdmlkZVJvdXRlcmAsIG9yIGBSb3V0ZXIucmVzZXRDb25maWcoKWAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY29uc3QgUk9VVEVTID0gbmV3IEluamVjdGlvblRva2VuPFJvdXRlW11bXT4oJ1JPVVRFUycpO1xuXG50eXBlIENvbXBvbmVudExvYWRlciA9IE9ic2VydmFibGU8VHlwZTx1bmtub3duPj47XG5cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCd9KVxuZXhwb3J0IGNsYXNzIFJvdXRlckNvbmZpZ0xvYWRlciB7XG4gIHByaXZhdGUgY29tcG9uZW50TG9hZGVycyA9IG5ldyBXZWFrTWFwPFJvdXRlLCBDb21wb25lbnRMb2FkZXI+KCk7XG4gIHByaXZhdGUgY2hpbGRyZW5Mb2FkZXJzID0gbmV3IFdlYWtNYXA8Um91dGUsIE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPj4oKTtcbiAgb25Mb2FkU3RhcnRMaXN0ZW5lcj86IChyOiBSb3V0ZSkgPT4gdm9pZDtcbiAgb25Mb2FkRW5kTGlzdGVuZXI/OiAocjogUm91dGUpID0+IHZvaWQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgY29tcGlsZXIgPSBpbmplY3QoQ29tcGlsZXIpO1xuXG4gIGxvYWRDb21wb25lbnQocm91dGU6IFJvdXRlKTogT2JzZXJ2YWJsZTxUeXBlPHVua25vd24+PiB7XG4gICAgaWYgKHRoaXMuY29tcG9uZW50TG9hZGVycy5nZXQocm91dGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb21wb25lbnRMb2FkZXJzLmdldChyb3V0ZSkhO1xuICAgIH0gZWxzZSBpZiAocm91dGUuX2xvYWRlZENvbXBvbmVudCkge1xuICAgICAgcmV0dXJuIG9mKHJvdXRlLl9sb2FkZWRDb21wb25lbnQpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9uTG9hZFN0YXJ0TGlzdGVuZXIpIHtcbiAgICAgIHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgfVxuICAgIGNvbnN0IGxvYWRSdW5uZXIgPSB3cmFwSW50b09ic2VydmFibGUocm91dGUubG9hZENvbXBvbmVudCEoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5waXBlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcChtYXliZVVud3JhcERlZmF1bHRFeHBvcnQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcChjb21wb25lbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub25Mb2FkRW5kTGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkxvYWRFbmRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydFN0YW5kYWxvbmUocm91dGUucGF0aCA/PyAnJywgY29tcG9uZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRDb21wb25lbnQgPSBjb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb21wb25lbnRMb2FkZXJzLmRlbGV0ZShyb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgIC8vIFVzZSBjdXN0b20gQ29ubmVjdGFibGVPYnNlcnZhYmxlIGFzIHNoYXJlIGluIHJ1bm5lcnMgcGlwZSBpbmNyZWFzaW5nIHRoZSBidW5kbGUgc2l6ZSB0b28gbXVjaFxuICAgIGNvbnN0IGxvYWRlciA9XG4gICAgICAgIG5ldyBDb25uZWN0YWJsZU9ic2VydmFibGUobG9hZFJ1bm5lciwgKCkgPT4gbmV3IFN1YmplY3Q8VHlwZTx1bmtub3duPj4oKSkucGlwZShyZWZDb3VudCgpKTtcbiAgICB0aGlzLmNvbXBvbmVudExvYWRlcnMuc2V0KHJvdXRlLCBsb2FkZXIpO1xuICAgIHJldHVybiBsb2FkZXI7XG4gIH1cblxuICBsb2FkQ2hpbGRyZW4ocGFyZW50SW5qZWN0b3I6IEluamVjdG9yLCByb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4ge1xuICAgIGlmICh0aGlzLmNoaWxkcmVuTG9hZGVycy5nZXQocm91dGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jaGlsZHJlbkxvYWRlcnMuZ2V0KHJvdXRlKSE7XG4gICAgfSBlbHNlIGlmIChyb3V0ZS5fbG9hZGVkUm91dGVzKSB7XG4gICAgICByZXR1cm4gb2Yoe3JvdXRlczogcm91dGUuX2xvYWRlZFJvdXRlcywgaW5qZWN0b3I6IHJvdXRlLl9sb2FkZWRJbmplY3Rvcn0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9uTG9hZFN0YXJ0TGlzdGVuZXIpIHtcbiAgICAgIHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgfVxuICAgIGNvbnN0IG1vZHVsZUZhY3RvcnlPclJvdXRlcyQgPSB0aGlzLmxvYWRNb2R1bGVGYWN0b3J5T3JSb3V0ZXMocm91dGUubG9hZENoaWxkcmVuISk7XG4gICAgY29uc3QgbG9hZFJ1bm5lciA9IG1vZHVsZUZhY3RvcnlPclJvdXRlcyQucGlwZShcbiAgICAgICAgbWFwKChmYWN0b3J5T3JSb3V0ZXM6IE5nTW9kdWxlRmFjdG9yeTxhbnk+fFJvdXRlcykgPT4ge1xuICAgICAgICAgIGlmICh0aGlzLm9uTG9hZEVuZExpc3RlbmVyKSB7XG4gICAgICAgICAgICB0aGlzLm9uTG9hZEVuZExpc3RlbmVyKHJvdXRlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gVGhpcyBpbmplY3RvciBjb21lcyBmcm9tIHRoZSBgTmdNb2R1bGVSZWZgIHdoZW4gbGF6eSBsb2FkaW5nIGFuIGBOZ01vZHVsZWAuIFRoZXJlIGlzIG5vXG4gICAgICAgICAgLy8gaW5qZWN0b3IgYXNzb2NpYXRlZCB3aXRoIGxhenkgbG9hZGluZyBhIGBSb3V0ZWAgYXJyYXkuXG4gICAgICAgICAgbGV0IGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yfHVuZGVmaW5lZDtcbiAgICAgICAgICBsZXQgcmF3Um91dGVzOiBSb3V0ZVtdO1xuICAgICAgICAgIGxldCByZXF1aXJlU3RhbmRhbG9uZUNvbXBvbmVudHMgPSBmYWxzZTtcbiAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShmYWN0b3J5T3JSb3V0ZXMpKSB7XG4gICAgICAgICAgICByYXdSb3V0ZXMgPSBmYWN0b3J5T3JSb3V0ZXM7XG4gICAgICAgICAgICByZXF1aXJlU3RhbmRhbG9uZUNvbXBvbmVudHMgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbmplY3RvciA9IGZhY3RvcnlPclJvdXRlcy5jcmVhdGUocGFyZW50SW5qZWN0b3IpLmluamVjdG9yO1xuICAgICAgICAgICAgLy8gV2hlbiBsb2FkaW5nIGEgbW9kdWxlIHRoYXQgZG9lc24ndCBwcm92aWRlIGBSb3V0ZXJNb2R1bGUuZm9yQ2hpbGQoKWAgcHJlbG9hZGVyXG4gICAgICAgICAgICAvLyB3aWxsIGdldCBzdHVjayBpbiBhbiBpbmZpbml0ZSBsb29wLiBUaGUgY2hpbGQgbW9kdWxlJ3MgSW5qZWN0b3Igd2lsbCBsb29rIHRvXG4gICAgICAgICAgICAvLyBpdHMgcGFyZW50IGBJbmplY3RvcmAgd2hlbiBpdCBkb2Vzbid0IGZpbmQgYW55IFJPVVRFUyBzbyBpdCB3aWxsIHJldHVybiByb3V0ZXNcbiAgICAgICAgICAgIC8vIGZvciBpdCdzIHBhcmVudCBtb2R1bGUgaW5zdGVhZC5cbiAgICAgICAgICAgIHJhd1JvdXRlcyA9IGluamVjdG9yLmdldChST1VURVMsIFtdLCBJbmplY3RGbGFncy5TZWxmIHwgSW5qZWN0RmxhZ3MuT3B0aW9uYWwpLmZsYXQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3Qgcm91dGVzID0gcmF3Um91dGVzLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gICAgICAgICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiZcbiAgICAgICAgICAgICAgdmFsaWRhdGVDb25maWcocm91dGVzLCByb3V0ZS5wYXRoLCByZXF1aXJlU3RhbmRhbG9uZUNvbXBvbmVudHMpO1xuICAgICAgICAgIHJldHVybiB7cm91dGVzLCBpbmplY3Rvcn07XG4gICAgICAgIH0pLFxuICAgICAgICBmaW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5jaGlsZHJlbkxvYWRlcnMuZGVsZXRlKHJvdXRlKTtcbiAgICAgICAgfSksXG4gICAgKTtcbiAgICAvLyBVc2UgY3VzdG9tIENvbm5lY3RhYmxlT2JzZXJ2YWJsZSBhcyBzaGFyZSBpbiBydW5uZXJzIHBpcGUgaW5jcmVhc2luZyB0aGUgYnVuZGxlIHNpemUgdG9vIG11Y2hcbiAgICBjb25zdCBsb2FkZXIgPSBuZXcgQ29ubmVjdGFibGVPYnNlcnZhYmxlKGxvYWRSdW5uZXIsICgpID0+IG5ldyBTdWJqZWN0PExvYWRlZFJvdXRlckNvbmZpZz4oKSlcbiAgICAgICAgICAgICAgICAgICAgICAgLnBpcGUocmVmQ291bnQoKSk7XG4gICAgdGhpcy5jaGlsZHJlbkxvYWRlcnMuc2V0KHJvdXRlLCBsb2FkZXIpO1xuICAgIHJldHVybiBsb2FkZXI7XG4gIH1cblxuICBwcml2YXRlIGxvYWRNb2R1bGVGYWN0b3J5T3JSb3V0ZXMobG9hZENoaWxkcmVuOiBMb2FkQ2hpbGRyZW4pOlxuICAgICAgT2JzZXJ2YWJsZTxOZ01vZHVsZUZhY3Rvcnk8YW55PnxSb3V0ZXM+IHtcbiAgICByZXR1cm4gd3JhcEludG9PYnNlcnZhYmxlKChsb2FkQ2hpbGRyZW4gYXMgTG9hZENoaWxkcmVuQ2FsbGJhY2spKCkpXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgICAgbWFwKG1heWJlVW53cmFwRGVmYXVsdEV4cG9ydCksXG4gICAgICAgICAgICBtZXJnZU1hcCgodCkgPT4ge1xuICAgICAgICAgICAgICBpZiAodCBpbnN0YW5jZW9mIE5nTW9kdWxlRmFjdG9yeSB8fCBBcnJheS5pc0FycmF5KHQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBmcm9tKHRoaXMuY29tcGlsZXIuY29tcGlsZU1vZHVsZUFzeW5jKHQpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSksXG4gICAgICAgICk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNXcmFwcGVkRGVmYXVsdEV4cG9ydDxUPih2YWx1ZTogVHxEZWZhdWx0RXhwb3J0PFQ+KTogdmFsdWUgaXMgRGVmYXVsdEV4cG9ydDxUPiB7XG4gIC8vIFdlIHVzZSBgaW5gIGhlcmUgd2l0aCBhIHN0cmluZyBrZXkgYCdkZWZhdWx0J2AsIGJlY2F1c2Ugd2UgZXhwZWN0IGBEZWZhdWx0RXhwb3J0YCBvYmplY3RzIHRvIGJlXG4gIC8vIGR5bmFtaWNhbGx5IGltcG9ydGVkIEVTIG1vZHVsZXMgd2l0aCBhIHNwZWMtbWFuZGF0ZWQgYGRlZmF1bHRgIGtleS4gVGh1cyB3ZSBkb24ndCBleHBlY3QgdGhhdFxuICAvLyBgZGVmYXVsdGAgd2lsbCBiZSBhIHJlbmFtZWQgcHJvcGVydHkuXG4gIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmICdkZWZhdWx0JyBpbiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gbWF5YmVVbndyYXBEZWZhdWx0RXhwb3J0PFQ+KGlucHV0OiBUfERlZmF1bHRFeHBvcnQ8VD4pOiBUIHtcbiAgLy8gQXMgcGVyIGBpc1dyYXBwZWREZWZhdWx0RXhwb3J0YCwgdGhlIGBkZWZhdWx0YCBrZXkgaGVyZSBpcyBnZW5lcmF0ZWQgYnkgdGhlIGJyb3dzZXIgYW5kIG5vdFxuICAvLyBzdWJqZWN0IHRvIHByb3BlcnR5IHJlbmFtaW5nLCBzbyB3ZSByZWZlcmVuY2UgaXQgd2l0aCBicmFja2V0IGFjY2Vzcy5cbiAgcmV0dXJuIGlzV3JhcHBlZERlZmF1bHRFeHBvcnQoaW5wdXQpID8gaW5wdXRbJ2RlZmF1bHQnXSA6IGlucHV0O1xufVxuIl19