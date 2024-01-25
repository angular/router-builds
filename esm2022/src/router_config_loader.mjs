/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Compiler, inject, Injectable, InjectionToken, NgModuleFactory } from '@angular/core';
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
        const moduleFactoryOrRoutes$ = loadChildren(route, this.compiler, parentInjector, this.onLoadEndListener);
        const loadRunner = moduleFactoryOrRoutes$.pipe(finalize(() => {
            this.childrenLoaders.delete(route);
        }));
        // Use custom ConnectableObservable as share in runners pipe increasing the bundle size too much
        const loader = new ConnectableObservable(loadRunner, () => new Subject())
            .pipe(refCount());
        this.childrenLoaders.set(route, loader);
        return loader;
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.1.1+sha-ecd0daf", ngImport: i0, type: RouterConfigLoader, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.1.1+sha-ecd0daf", ngImport: i0, type: RouterConfigLoader, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.1.1+sha-ecd0daf", ngImport: i0, type: RouterConfigLoader, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
/**
 * Executes a `route.loadChildren` callback and converts the result to an array of child routes and
 * an injector if that callback returned a module.
 *
 * This function is used for the route discovery during prerendering
 * in @angular-devkit/build-angular. If there are any updates to the contract here, it will require
 * an update to the extractor.
 */
export function loadChildren(route, compiler, parentInjector, onLoadEndListener) {
    return wrapIntoObservable(route.loadChildren())
        .pipe(map(maybeUnwrapDefaultExport), mergeMap((t) => {
        if (t instanceof NgModuleFactory || Array.isArray(t)) {
            return of(t);
        }
        else {
            return from(compiler.compileModuleAsync(t));
        }
    }), map((factoryOrRoutes) => {
        if (onLoadEndListener) {
            onLoadEndListener(route);
        }
        // This injector comes from the `NgModuleRef` when lazy loading an `NgModule`. There is
        // no injector associated with lazy loading a `Route` array.
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
            rawRoutes = injector.get(ROUTES, [], { optional: true, self: true }).flat();
        }
        const routes = rawRoutes.map(standardizeConfig);
        (typeof ngDevMode === 'undefined' || ngDevMode) &&
            validateConfig(routes, route.path, requireStandaloneComponents);
        return { routes, injector };
    }));
}
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2NvbmZpZ19sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3JvdXRlcl9jb25maWdfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxRQUFRLEVBQXVCLE1BQU0sRUFBRSxVQUFVLEVBQUUsY0FBYyxFQUFZLGVBQWUsRUFBTyxNQUFNLGVBQWUsQ0FBQztBQUNqSSxPQUFPLEVBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFjLEVBQUUsRUFBRSxPQUFPLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDMUUsT0FBTyxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUd0RSxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUN0RCxPQUFPLEVBQUMsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7O0FBSW5GOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sQ0FBQyxNQUFNLE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBWSxRQUFRLENBQUMsQ0FBQztBQUs5RCxNQUFNLE9BQU8sa0JBQWtCO0lBRC9CO1FBRVUscUJBQWdCLEdBQUcsSUFBSSxPQUFPLEVBQTBCLENBQUM7UUFDekQsb0JBQWUsR0FBRyxJQUFJLE9BQU8sRUFBeUMsQ0FBQztRQUc5RCxhQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBeUQ5QztJQXZEQyxhQUFhLENBQUMsS0FBWTtRQUN4QixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNyQyxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFFLENBQUM7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QUErRTtZQUMvRSxpRkFBaUY7WUFDakYsa0NBQWtDO1lBQ2xDLFNBQVMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzVFLENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDaEQsQ0FBQyxPQUFPLFNBQVMsS0FBSyxXQUFXLElBQUksU0FBUyxDQUFDO1lBQzNDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1FBQ3BFLE9BQU8sRUFBQyxNQUFNLEVBQUUsUUFBUSxFQUFDLENBQUM7SUFDNUIsQ0FBQyxDQUFDLENBQ0wsQ0FBQztBQUNSLENBQUM7QUFFRCxTQUFTLHNCQUFzQixDQUFJLEtBQXlCO0lBQzFELGtHQUFrRztJQUNsRyxnR0FBZ0c7SUFDaEcsd0NBQXdDO0lBQ3hDLE9BQU8sS0FBSyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxTQUFTLElBQUksS0FBSyxDQUFDO0FBQ2xFLENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFJLEtBQXlCO0lBQzVELDhGQUE4RjtJQUM5Rix3RUFBd0U7SUFDeEUsT0FBTyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDbEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbXBpbGVyLCBFbnZpcm9ubWVudEluamVjdG9yLCBpbmplY3QsIEluamVjdGFibGUsIEluamVjdGlvblRva2VuLCBJbmplY3RvciwgTmdNb2R1bGVGYWN0b3J5LCBUeXBlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Q29ubmVjdGFibGVPYnNlcnZhYmxlLCBmcm9tLCBPYnNlcnZhYmxlLCBvZiwgU3ViamVjdH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2ZpbmFsaXplLCBtYXAsIG1lcmdlTWFwLCByZWZDb3VudCwgdGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7RGVmYXVsdEV4cG9ydCwgTG9hZGVkUm91dGVyQ29uZmlnLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge3dyYXBJbnRvT2JzZXJ2YWJsZX0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcbmltcG9ydCB7YXNzZXJ0U3RhbmRhbG9uZSwgc3RhbmRhcmRpemVDb25maWcsIHZhbGlkYXRlQ29uZmlnfSBmcm9tICcuL3V0aWxzL2NvbmZpZyc7XG5cblxuXG4vKipcbiAqIFRoZSBbREkgdG9rZW5dKGd1aWRlL2dsb3NzYXJ5LyNkaS10b2tlbikgZm9yIGEgcm91dGVyIGNvbmZpZ3VyYXRpb24uXG4gKlxuICogYFJPVVRFU2AgaXMgYSBsb3cgbGV2ZWwgQVBJIGZvciByb3V0ZXIgY29uZmlndXJhdGlvbiB2aWEgZGVwZW5kZW5jeSBpbmplY3Rpb24uXG4gKlxuICogV2UgcmVjb21tZW5kIHRoYXQgaW4gYWxtb3N0IGFsbCBjYXNlcyB0byB1c2UgaGlnaGVyIGxldmVsIEFQSXMgc3VjaCBhcyBgUm91dGVyTW9kdWxlLmZvclJvb3QoKWAsXG4gKiBgcHJvdmlkZVJvdXRlcmAsIG9yIGBSb3V0ZXIucmVzZXRDb25maWcoKWAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY29uc3QgUk9VVEVTID0gbmV3IEluamVjdGlvblRva2VuPFJvdXRlW11bXT4oJ1JPVVRFUycpO1xuXG50eXBlIENvbXBvbmVudExvYWRlciA9IE9ic2VydmFibGU8VHlwZTx1bmtub3duPj47XG5cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCd9KVxuZXhwb3J0IGNsYXNzIFJvdXRlckNvbmZpZ0xvYWRlciB7XG4gIHByaXZhdGUgY29tcG9uZW50TG9hZGVycyA9IG5ldyBXZWFrTWFwPFJvdXRlLCBDb21wb25lbnRMb2FkZXI+KCk7XG4gIHByaXZhdGUgY2hpbGRyZW5Mb2FkZXJzID0gbmV3IFdlYWtNYXA8Um91dGUsIE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPj4oKTtcbiAgb25Mb2FkU3RhcnRMaXN0ZW5lcj86IChyOiBSb3V0ZSkgPT4gdm9pZDtcbiAgb25Mb2FkRW5kTGlzdGVuZXI/OiAocjogUm91dGUpID0+IHZvaWQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgY29tcGlsZXIgPSBpbmplY3QoQ29tcGlsZXIpO1xuXG4gIGxvYWRDb21wb25lbnQocm91dGU6IFJvdXRlKTogT2JzZXJ2YWJsZTxUeXBlPHVua25vd24+PiB7XG4gICAgaWYgKHRoaXMuY29tcG9uZW50TG9hZGVycy5nZXQocm91dGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb21wb25lbnRMb2FkZXJzLmdldChyb3V0ZSkhO1xuICAgIH0gZWxzZSBpZiAocm91dGUuX2xvYWRlZENvbXBvbmVudCkge1xuICAgICAgcmV0dXJuIG9mKHJvdXRlLl9sb2FkZWRDb21wb25lbnQpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9uTG9hZFN0YXJ0TGlzdGVuZXIpIHtcbiAgICAgIHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgfVxuICAgIGNvbnN0IGxvYWRSdW5uZXIgPSB3cmFwSW50b09ic2VydmFibGUocm91dGUubG9hZENvbXBvbmVudCEoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5waXBlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcChtYXliZVVud3JhcERlZmF1bHRFeHBvcnQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcChjb21wb25lbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub25Mb2FkRW5kTGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkxvYWRFbmRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydFN0YW5kYWxvbmUocm91dGUucGF0aCA/PyAnJywgY29tcG9uZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRDb21wb25lbnQgPSBjb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb21wb25lbnRMb2FkZXJzLmRlbGV0ZShyb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgIC8vIFVzZSBjdXN0b20gQ29ubmVjdGFibGVPYnNlcnZhYmxlIGFzIHNoYXJlIGluIHJ1bm5lcnMgcGlwZSBpbmNyZWFzaW5nIHRoZSBidW5kbGUgc2l6ZSB0b28gbXVjaFxuICAgIGNvbnN0IGxvYWRlciA9XG4gICAgICAgIG5ldyBDb25uZWN0YWJsZU9ic2VydmFibGUobG9hZFJ1bm5lciwgKCkgPT4gbmV3IFN1YmplY3Q8VHlwZTx1bmtub3duPj4oKSkucGlwZShyZWZDb3VudCgpKTtcbiAgICB0aGlzLmNvbXBvbmVudExvYWRlcnMuc2V0KHJvdXRlLCBsb2FkZXIpO1xuICAgIHJldHVybiBsb2FkZXI7XG4gIH1cblxuICBsb2FkQ2hpbGRyZW4ocGFyZW50SW5qZWN0b3I6IEluamVjdG9yLCByb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4ge1xuICAgIGlmICh0aGlzLmNoaWxkcmVuTG9hZGVycy5nZXQocm91dGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jaGlsZHJlbkxvYWRlcnMuZ2V0KHJvdXRlKSE7XG4gICAgfSBlbHNlIGlmIChyb3V0ZS5fbG9hZGVkUm91dGVzKSB7XG4gICAgICByZXR1cm4gb2Yoe3JvdXRlczogcm91dGUuX2xvYWRlZFJvdXRlcywgaW5qZWN0b3I6IHJvdXRlLl9sb2FkZWRJbmplY3Rvcn0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9uTG9hZFN0YXJ0TGlzdGVuZXIpIHtcbiAgICAgIHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgfVxuICAgIGNvbnN0IG1vZHVsZUZhY3RvcnlPclJvdXRlcyQgPVxuICAgICAgICBsb2FkQ2hpbGRyZW4ocm91dGUsIHRoaXMuY29tcGlsZXIsIHBhcmVudEluamVjdG9yLCB0aGlzLm9uTG9hZEVuZExpc3RlbmVyKTtcbiAgICBjb25zdCBsb2FkUnVubmVyID0gbW9kdWxlRmFjdG9yeU9yUm91dGVzJC5waXBlKFxuICAgICAgICBmaW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5jaGlsZHJlbkxvYWRlcnMuZGVsZXRlKHJvdXRlKTtcbiAgICAgICAgfSksXG4gICAgKTtcbiAgICAvLyBVc2UgY3VzdG9tIENvbm5lY3RhYmxlT2JzZXJ2YWJsZSBhcyBzaGFyZSBpbiBydW5uZXJzIHBpcGUgaW5jcmVhc2luZyB0aGUgYnVuZGxlIHNpemUgdG9vIG11Y2hcbiAgICBjb25zdCBsb2FkZXIgPSBuZXcgQ29ubmVjdGFibGVPYnNlcnZhYmxlKGxvYWRSdW5uZXIsICgpID0+IG5ldyBTdWJqZWN0PExvYWRlZFJvdXRlckNvbmZpZz4oKSlcbiAgICAgICAgICAgICAgICAgICAgICAgLnBpcGUocmVmQ291bnQoKSk7XG4gICAgdGhpcy5jaGlsZHJlbkxvYWRlcnMuc2V0KHJvdXRlLCBsb2FkZXIpO1xuICAgIHJldHVybiBsb2FkZXI7XG4gIH1cbn1cblxuLyoqXG4gKiBFeGVjdXRlcyBhIGByb3V0ZS5sb2FkQ2hpbGRyZW5gIGNhbGxiYWNrIGFuZCBjb252ZXJ0cyB0aGUgcmVzdWx0IHRvIGFuIGFycmF5IG9mIGNoaWxkIHJvdXRlcyBhbmRcbiAqIGFuIGluamVjdG9yIGlmIHRoYXQgY2FsbGJhY2sgcmV0dXJuZWQgYSBtb2R1bGUuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBpcyB1c2VkIGZvciB0aGUgcm91dGUgZGlzY292ZXJ5IGR1cmluZyBwcmVyZW5kZXJpbmdcbiAqIGluIEBhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyLiBJZiB0aGVyZSBhcmUgYW55IHVwZGF0ZXMgdG8gdGhlIGNvbnRyYWN0IGhlcmUsIGl0IHdpbGwgcmVxdWlyZVxuICogYW4gdXBkYXRlIHRvIHRoZSBleHRyYWN0b3IuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2FkQ2hpbGRyZW4oXG4gICAgcm91dGU6IFJvdXRlLCBjb21waWxlcjogQ29tcGlsZXIsIHBhcmVudEluamVjdG9yOiBJbmplY3RvcixcbiAgICBvbkxvYWRFbmRMaXN0ZW5lcj86IChyOiBSb3V0ZSkgPT4gdm9pZCk6IE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPiB7XG4gIHJldHVybiB3cmFwSW50b09ic2VydmFibGUocm91dGUubG9hZENoaWxkcmVuISgpKVxuICAgICAgLnBpcGUoXG4gICAgICAgICAgbWFwKG1heWJlVW53cmFwRGVmYXVsdEV4cG9ydCksXG4gICAgICAgICAgbWVyZ2VNYXAoKHQpID0+IHtcbiAgICAgICAgICAgIGlmICh0IGluc3RhbmNlb2YgTmdNb2R1bGVGYWN0b3J5IHx8IEFycmF5LmlzQXJyYXkodCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZyb20oY29tcGlsZXIuY29tcGlsZU1vZHVsZUFzeW5jKHQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtYXAoKGZhY3RvcnlPclJvdXRlczogTmdNb2R1bGVGYWN0b3J5PGFueT58Um91dGVzKSA9PiB7XG4gICAgICAgICAgICBpZiAob25Mb2FkRW5kTGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgb25Mb2FkRW5kTGlzdGVuZXIocm91dGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVGhpcyBpbmplY3RvciBjb21lcyBmcm9tIHRoZSBgTmdNb2R1bGVSZWZgIHdoZW4gbGF6eSBsb2FkaW5nIGFuIGBOZ01vZHVsZWAuIFRoZXJlIGlzXG4gICAgICAgICAgICAvLyBubyBpbmplY3RvciBhc3NvY2lhdGVkIHdpdGggbGF6eSBsb2FkaW5nIGEgYFJvdXRlYCBhcnJheS5cbiAgICAgICAgICAgIGxldCBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvcnx1bmRlZmluZWQ7XG4gICAgICAgICAgICBsZXQgcmF3Um91dGVzOiBSb3V0ZVtdO1xuICAgICAgICAgICAgbGV0IHJlcXVpcmVTdGFuZGFsb25lQ29tcG9uZW50cyA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZmFjdG9yeU9yUm91dGVzKSkge1xuICAgICAgICAgICAgICByYXdSb3V0ZXMgPSBmYWN0b3J5T3JSb3V0ZXM7XG4gICAgICAgICAgICAgIHJlcXVpcmVTdGFuZGFsb25lQ29tcG9uZW50cyA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpbmplY3RvciA9IGZhY3RvcnlPclJvdXRlcy5jcmVhdGUocGFyZW50SW5qZWN0b3IpLmluamVjdG9yO1xuICAgICAgICAgICAgICAvLyBXaGVuIGxvYWRpbmcgYSBtb2R1bGUgdGhhdCBkb2Vzbid0IHByb3ZpZGUgYFJvdXRlck1vZHVsZS5mb3JDaGlsZCgpYCBwcmVsb2FkZXJcbiAgICAgICAgICAgICAgLy8gd2lsbCBnZXQgc3R1Y2sgaW4gYW4gaW5maW5pdGUgbG9vcC4gVGhlIGNoaWxkIG1vZHVsZSdzIEluamVjdG9yIHdpbGwgbG9vayB0b1xuICAgICAgICAgICAgICAvLyBpdHMgcGFyZW50IGBJbmplY3RvcmAgd2hlbiBpdCBkb2Vzbid0IGZpbmQgYW55IFJPVVRFUyBzbyBpdCB3aWxsIHJldHVybiByb3V0ZXNcbiAgICAgICAgICAgICAgLy8gZm9yIGl0J3MgcGFyZW50IG1vZHVsZSBpbnN0ZWFkLlxuICAgICAgICAgICAgICByYXdSb3V0ZXMgPSBpbmplY3Rvci5nZXQoUk9VVEVTLCBbXSwge29wdGlvbmFsOiB0cnVlLCBzZWxmOiB0cnVlfSkuZmxhdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgcm91dGVzID0gcmF3Um91dGVzLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gICAgICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICAgICAgICAgIHZhbGlkYXRlQ29uZmlnKHJvdXRlcywgcm91dGUucGF0aCwgcmVxdWlyZVN0YW5kYWxvbmVDb21wb25lbnRzKTtcbiAgICAgICAgICAgIHJldHVybiB7cm91dGVzLCBpbmplY3Rvcn07XG4gICAgICAgICAgfSksXG4gICAgICApO1xufVxuXG5mdW5jdGlvbiBpc1dyYXBwZWREZWZhdWx0RXhwb3J0PFQ+KHZhbHVlOiBUfERlZmF1bHRFeHBvcnQ8VD4pOiB2YWx1ZSBpcyBEZWZhdWx0RXhwb3J0PFQ+IHtcbiAgLy8gV2UgdXNlIGBpbmAgaGVyZSB3aXRoIGEgc3RyaW5nIGtleSBgJ2RlZmF1bHQnYCwgYmVjYXVzZSB3ZSBleHBlY3QgYERlZmF1bHRFeHBvcnRgIG9iamVjdHMgdG8gYmVcbiAgLy8gZHluYW1pY2FsbHkgaW1wb3J0ZWQgRVMgbW9kdWxlcyB3aXRoIGEgc3BlYy1tYW5kYXRlZCBgZGVmYXVsdGAga2V5LiBUaHVzIHdlIGRvbid0IGV4cGVjdCB0aGF0XG4gIC8vIGBkZWZhdWx0YCB3aWxsIGJlIGEgcmVuYW1lZCBwcm9wZXJ0eS5cbiAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgJ2RlZmF1bHQnIGluIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBtYXliZVVud3JhcERlZmF1bHRFeHBvcnQ8VD4oaW5wdXQ6IFR8RGVmYXVsdEV4cG9ydDxUPik6IFQge1xuICAvLyBBcyBwZXIgYGlzV3JhcHBlZERlZmF1bHRFeHBvcnRgLCB0aGUgYGRlZmF1bHRgIGtleSBoZXJlIGlzIGdlbmVyYXRlZCBieSB0aGUgYnJvd3NlciBhbmQgbm90XG4gIC8vIHN1YmplY3QgdG8gcHJvcGVydHkgcmVuYW1pbmcsIHNvIHdlIHJlZmVyZW5jZSBpdCB3aXRoIGJyYWNrZXQgYWNjZXNzLlxuICByZXR1cm4gaXNXcmFwcGVkRGVmYXVsdEV4cG9ydChpbnB1dCkgPyBpbnB1dFsnZGVmYXVsdCddIDogaW5wdXQ7XG59XG4iXX0=