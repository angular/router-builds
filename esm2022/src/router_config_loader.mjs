/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Compiler, inject, Injectable, InjectionToken, NgModuleFactory, } from '@angular/core';
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
export const ROUTES = new InjectionToken(ngDevMode ? 'ROUTES' : '');
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
        const loadRunner = wrapIntoObservable(route.loadComponent()).pipe(map(maybeUnwrapDefaultExport), tap((component) => {
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
        const loader = new ConnectableObservable(loadRunner, () => new Subject()).pipe(refCount());
        this.childrenLoaders.set(route, loader);
        return loader;
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.1+sha-4bb332e", ngImport: i0, type: RouterConfigLoader, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.3.1+sha-4bb332e", ngImport: i0, type: RouterConfigLoader, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.1+sha-4bb332e", ngImport: i0, type: RouterConfigLoader, decorators: [{
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
    return wrapIntoObservable(route.loadChildren()).pipe(map(maybeUnwrapDefaultExport), mergeMap((t) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2NvbmZpZ19sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3JvdXRlcl9jb25maWdfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFDTCxRQUFRLEVBRVIsTUFBTSxFQUNOLFVBQVUsRUFDVixjQUFjLEVBRWQsZUFBZSxHQUVoQixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFjLEVBQUUsRUFBRSxPQUFPLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDMUUsT0FBTyxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUd0RSxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUN0RCxPQUFPLEVBQUMsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7O0FBRW5GOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sQ0FBQyxNQUFNLE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBWSxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFLL0UsTUFBTSxPQUFPLGtCQUFrQjtJQUQvQjtRQUVVLHFCQUFnQixHQUFHLElBQUksT0FBTyxFQUEwQixDQUFDO1FBQ3pELG9CQUFlLEdBQUcsSUFBSSxPQUFPLEVBQXlDLENBQUM7UUFHOUQsYUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztLQStEOUM7SUE3REMsYUFBYSxDQUFDLEtBQVk7UUFDeEIsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDckMsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBRSxDQUFDO1FBQzNDLENBQUM7YUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ2xDLE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBQ0QsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFDLGFBQWMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUNoRSxHQUFHLENBQUMsd0JBQXdCLENBQUMsRUFDN0IsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDaEIsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hDLENBQUM7WUFDRCxDQUFDLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTLENBQUM7Z0JBQzdDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ2hELEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTLENBQUM7UUFDckMsQ0FBQyxDQUFDLEVBQ0YsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUNaLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFDLENBQ0gsQ0FBQztRQUNGLGdHQUFnRztRQUNoRyxNQUFNLE1BQU0sR0FBRyxJQUFJLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLE9BQU8sRUFBaUIsQ0FBQyxDQUFDLElBQUksQ0FDM0YsUUFBUSxFQUFFLENBQ1gsQ0FBQztRQUNGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFFRCxZQUFZLENBQUMsY0FBd0IsRUFBRSxLQUFZO1FBQ2pELElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBRSxDQUFDO1FBQzFDLENBQUM7YUFBTSxJQUFJLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUMvQixPQUFPLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsYUFBYSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsZUFBZSxFQUFDLENBQUMsQ0FBQztRQUM1RSxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUNELE1BQU0sc0JBQXNCLEdBQUcsWUFBWSxDQUN6QyxLQUFLLEVBQ0wsSUFBSSxDQUFDLFFBQVEsRUFDYixjQUFjLEVBQ2QsSUFBSSxDQUFDLGlCQUFpQixDQUN2QixDQUFDO1FBQ0YsTUFBTSxVQUFVLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUM1QyxRQUFRLENBQUMsR0FBRyxFQUFFO1lBQ1osSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFDLENBQ0gsQ0FBQztRQUNGLGdHQUFnRztRQUNoRyxNQUFNLE1BQU0sR0FBRyxJQUFJLHFCQUFxQixDQUN0QyxVQUFVLEVBQ1YsR0FBRyxFQUFFLENBQUMsSUFBSSxPQUFPLEVBQXNCLENBQ3hDLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDbkIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3hDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7eUhBbkVVLGtCQUFrQjs2SEFBbEIsa0JBQWtCLGNBRE4sTUFBTTs7c0dBQ2xCLGtCQUFrQjtrQkFEOUIsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUM7O0FBdUVoQzs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxVQUFVLFlBQVksQ0FDMUIsS0FBWSxFQUNaLFFBQWtCLEVBQ2xCLGNBQXdCLEVBQ3hCLGlCQUFzQztJQUV0QyxPQUFPLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxZQUFhLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FDbkQsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEVBQzdCLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQ2IsSUFBSSxDQUFDLFlBQVksZUFBZSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNyRCxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNmLENBQUM7YUFBTSxDQUFDO1lBQ04sT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUMsQ0FBQztJQUNILENBQUMsQ0FBQyxFQUNGLEdBQUcsQ0FBQyxDQUFDLGVBQThDLEVBQUUsRUFBRTtRQUNyRCxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdEIsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0IsQ0FBQztRQUNELHVGQUF1RjtRQUN2Riw0REFBNEQ7UUFDNUQsSUFBSSxRQUF5QyxDQUFDO1FBQzlDLElBQUksU0FBa0IsQ0FBQztRQUN2QixJQUFJLDJCQUEyQixHQUFHLEtBQUssQ0FBQztRQUN4QyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztZQUNuQyxTQUFTLEdBQUcsZUFBZSxDQUFDO1lBQzVCLDJCQUEyQixHQUFHLElBQUksQ0FBQztRQUNyQyxDQUFDO2FBQU0sQ0FBQztZQUNOLFFBQVEsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztZQUMzRCxpRkFBaUY7WUFDakYsK0VBQStFO1lBQy9FLGlGQUFpRjtZQUNqRixrQ0FBa0M7WUFDbEMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDNUUsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNoRCxDQUFDLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTLENBQUM7WUFDN0MsY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLDJCQUEyQixDQUFDLENBQUM7UUFDbEUsT0FBTyxFQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUMsQ0FBQztJQUM1QixDQUFDLENBQUMsQ0FDSCxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsc0JBQXNCLENBQUksS0FBMkI7SUFDNUQsa0dBQWtHO0lBQ2xHLGdHQUFnRztJQUNoRyx3Q0FBd0M7SUFDeEMsT0FBTyxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLFNBQVMsSUFBSSxLQUFLLENBQUM7QUFDbEUsQ0FBQztBQUVELFNBQVMsd0JBQXdCLENBQUksS0FBMkI7SUFDOUQsOEZBQThGO0lBQzlGLHdFQUF3RTtJQUN4RSxPQUFPLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNsRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIENvbXBpbGVyLFxuICBFbnZpcm9ubWVudEluamVjdG9yLFxuICBpbmplY3QsXG4gIEluamVjdGFibGUsXG4gIEluamVjdGlvblRva2VuLFxuICBJbmplY3RvcixcbiAgTmdNb2R1bGVGYWN0b3J5LFxuICBUeXBlLFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Q29ubmVjdGFibGVPYnNlcnZhYmxlLCBmcm9tLCBPYnNlcnZhYmxlLCBvZiwgU3ViamVjdH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2ZpbmFsaXplLCBtYXAsIG1lcmdlTWFwLCByZWZDb3VudCwgdGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7RGVmYXVsdEV4cG9ydCwgTG9hZGVkUm91dGVyQ29uZmlnLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge3dyYXBJbnRvT2JzZXJ2YWJsZX0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcbmltcG9ydCB7YXNzZXJ0U3RhbmRhbG9uZSwgc3RhbmRhcmRpemVDb25maWcsIHZhbGlkYXRlQ29uZmlnfSBmcm9tICcuL3V0aWxzL2NvbmZpZyc7XG5cbi8qKlxuICogVGhlIFtESSB0b2tlbl0oZ3VpZGUvZ2xvc3NhcnkvI2RpLXRva2VuKSBmb3IgYSByb3V0ZXIgY29uZmlndXJhdGlvbi5cbiAqXG4gKiBgUk9VVEVTYCBpcyBhIGxvdyBsZXZlbCBBUEkgZm9yIHJvdXRlciBjb25maWd1cmF0aW9uIHZpYSBkZXBlbmRlbmN5IGluamVjdGlvbi5cbiAqXG4gKiBXZSByZWNvbW1lbmQgdGhhdCBpbiBhbG1vc3QgYWxsIGNhc2VzIHRvIHVzZSBoaWdoZXIgbGV2ZWwgQVBJcyBzdWNoIGFzIGBSb3V0ZXJNb2R1bGUuZm9yUm9vdCgpYCxcbiAqIGBwcm92aWRlUm91dGVyYCwgb3IgYFJvdXRlci5yZXNldENvbmZpZygpYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjb25zdCBST1VURVMgPSBuZXcgSW5qZWN0aW9uVG9rZW48Um91dGVbXVtdPihuZ0Rldk1vZGUgPyAnUk9VVEVTJyA6ICcnKTtcblxudHlwZSBDb21wb25lbnRMb2FkZXIgPSBPYnNlcnZhYmxlPFR5cGU8dW5rbm93bj4+O1xuXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnfSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJDb25maWdMb2FkZXIge1xuICBwcml2YXRlIGNvbXBvbmVudExvYWRlcnMgPSBuZXcgV2Vha01hcDxSb3V0ZSwgQ29tcG9uZW50TG9hZGVyPigpO1xuICBwcml2YXRlIGNoaWxkcmVuTG9hZGVycyA9IG5ldyBXZWFrTWFwPFJvdXRlLCBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4+KCk7XG4gIG9uTG9hZFN0YXJ0TGlzdGVuZXI/OiAocjogUm91dGUpID0+IHZvaWQ7XG4gIG9uTG9hZEVuZExpc3RlbmVyPzogKHI6IFJvdXRlKSA9PiB2b2lkO1xuICBwcml2YXRlIHJlYWRvbmx5IGNvbXBpbGVyID0gaW5qZWN0KENvbXBpbGVyKTtcblxuICBsb2FkQ29tcG9uZW50KHJvdXRlOiBSb3V0ZSk6IE9ic2VydmFibGU8VHlwZTx1bmtub3duPj4ge1xuICAgIGlmICh0aGlzLmNvbXBvbmVudExvYWRlcnMuZ2V0KHJvdXRlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuY29tcG9uZW50TG9hZGVycy5nZXQocm91dGUpITtcbiAgICB9IGVsc2UgaWYgKHJvdXRlLl9sb2FkZWRDb21wb25lbnQpIHtcbiAgICAgIHJldHVybiBvZihyb3V0ZS5fbG9hZGVkQ29tcG9uZW50KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vbkxvYWRTdGFydExpc3RlbmVyKSB7XG4gICAgICB0aGlzLm9uTG9hZFN0YXJ0TGlzdGVuZXIocm91dGUpO1xuICAgIH1cbiAgICBjb25zdCBsb2FkUnVubmVyID0gd3JhcEludG9PYnNlcnZhYmxlKHJvdXRlLmxvYWRDb21wb25lbnQhKCkpLnBpcGUoXG4gICAgICBtYXAobWF5YmVVbndyYXBEZWZhdWx0RXhwb3J0KSxcbiAgICAgIHRhcCgoY29tcG9uZW50KSA9PiB7XG4gICAgICAgIGlmICh0aGlzLm9uTG9hZEVuZExpc3RlbmVyKSB7XG4gICAgICAgICAgdGhpcy5vbkxvYWRFbmRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiZcbiAgICAgICAgICBhc3NlcnRTdGFuZGFsb25lKHJvdXRlLnBhdGggPz8gJycsIGNvbXBvbmVudCk7XG4gICAgICAgIHJvdXRlLl9sb2FkZWRDb21wb25lbnQgPSBjb21wb25lbnQ7XG4gICAgICB9KSxcbiAgICAgIGZpbmFsaXplKCgpID0+IHtcbiAgICAgICAgdGhpcy5jb21wb25lbnRMb2FkZXJzLmRlbGV0ZShyb3V0ZSk7XG4gICAgICB9KSxcbiAgICApO1xuICAgIC8vIFVzZSBjdXN0b20gQ29ubmVjdGFibGVPYnNlcnZhYmxlIGFzIHNoYXJlIGluIHJ1bm5lcnMgcGlwZSBpbmNyZWFzaW5nIHRoZSBidW5kbGUgc2l6ZSB0b28gbXVjaFxuICAgIGNvbnN0IGxvYWRlciA9IG5ldyBDb25uZWN0YWJsZU9ic2VydmFibGUobG9hZFJ1bm5lciwgKCkgPT4gbmV3IFN1YmplY3Q8VHlwZTx1bmtub3duPj4oKSkucGlwZShcbiAgICAgIHJlZkNvdW50KCksXG4gICAgKTtcbiAgICB0aGlzLmNvbXBvbmVudExvYWRlcnMuc2V0KHJvdXRlLCBsb2FkZXIpO1xuICAgIHJldHVybiBsb2FkZXI7XG4gIH1cblxuICBsb2FkQ2hpbGRyZW4ocGFyZW50SW5qZWN0b3I6IEluamVjdG9yLCByb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4ge1xuICAgIGlmICh0aGlzLmNoaWxkcmVuTG9hZGVycy5nZXQocm91dGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jaGlsZHJlbkxvYWRlcnMuZ2V0KHJvdXRlKSE7XG4gICAgfSBlbHNlIGlmIChyb3V0ZS5fbG9hZGVkUm91dGVzKSB7XG4gICAgICByZXR1cm4gb2Yoe3JvdXRlczogcm91dGUuX2xvYWRlZFJvdXRlcywgaW5qZWN0b3I6IHJvdXRlLl9sb2FkZWRJbmplY3Rvcn0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9uTG9hZFN0YXJ0TGlzdGVuZXIpIHtcbiAgICAgIHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgfVxuICAgIGNvbnN0IG1vZHVsZUZhY3RvcnlPclJvdXRlcyQgPSBsb2FkQ2hpbGRyZW4oXG4gICAgICByb3V0ZSxcbiAgICAgIHRoaXMuY29tcGlsZXIsXG4gICAgICBwYXJlbnRJbmplY3RvcixcbiAgICAgIHRoaXMub25Mb2FkRW5kTGlzdGVuZXIsXG4gICAgKTtcbiAgICBjb25zdCBsb2FkUnVubmVyID0gbW9kdWxlRmFjdG9yeU9yUm91dGVzJC5waXBlKFxuICAgICAgZmluYWxpemUoKCkgPT4ge1xuICAgICAgICB0aGlzLmNoaWxkcmVuTG9hZGVycy5kZWxldGUocm91dGUpO1xuICAgICAgfSksXG4gICAgKTtcbiAgICAvLyBVc2UgY3VzdG9tIENvbm5lY3RhYmxlT2JzZXJ2YWJsZSBhcyBzaGFyZSBpbiBydW5uZXJzIHBpcGUgaW5jcmVhc2luZyB0aGUgYnVuZGxlIHNpemUgdG9vIG11Y2hcbiAgICBjb25zdCBsb2FkZXIgPSBuZXcgQ29ubmVjdGFibGVPYnNlcnZhYmxlKFxuICAgICAgbG9hZFJ1bm5lcixcbiAgICAgICgpID0+IG5ldyBTdWJqZWN0PExvYWRlZFJvdXRlckNvbmZpZz4oKSxcbiAgICApLnBpcGUocmVmQ291bnQoKSk7XG4gICAgdGhpcy5jaGlsZHJlbkxvYWRlcnMuc2V0KHJvdXRlLCBsb2FkZXIpO1xuICAgIHJldHVybiBsb2FkZXI7XG4gIH1cbn1cblxuLyoqXG4gKiBFeGVjdXRlcyBhIGByb3V0ZS5sb2FkQ2hpbGRyZW5gIGNhbGxiYWNrIGFuZCBjb252ZXJ0cyB0aGUgcmVzdWx0IHRvIGFuIGFycmF5IG9mIGNoaWxkIHJvdXRlcyBhbmRcbiAqIGFuIGluamVjdG9yIGlmIHRoYXQgY2FsbGJhY2sgcmV0dXJuZWQgYSBtb2R1bGUuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBpcyB1c2VkIGZvciB0aGUgcm91dGUgZGlzY292ZXJ5IGR1cmluZyBwcmVyZW5kZXJpbmdcbiAqIGluIEBhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyLiBJZiB0aGVyZSBhcmUgYW55IHVwZGF0ZXMgdG8gdGhlIGNvbnRyYWN0IGhlcmUsIGl0IHdpbGwgcmVxdWlyZVxuICogYW4gdXBkYXRlIHRvIHRoZSBleHRyYWN0b3IuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2FkQ2hpbGRyZW4oXG4gIHJvdXRlOiBSb3V0ZSxcbiAgY29tcGlsZXI6IENvbXBpbGVyLFxuICBwYXJlbnRJbmplY3RvcjogSW5qZWN0b3IsXG4gIG9uTG9hZEVuZExpc3RlbmVyPzogKHI6IFJvdXRlKSA9PiB2b2lkLFxuKTogT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWc+IHtcbiAgcmV0dXJuIHdyYXBJbnRvT2JzZXJ2YWJsZShyb3V0ZS5sb2FkQ2hpbGRyZW4hKCkpLnBpcGUoXG4gICAgbWFwKG1heWJlVW53cmFwRGVmYXVsdEV4cG9ydCksXG4gICAgbWVyZ2VNYXAoKHQpID0+IHtcbiAgICAgIGlmICh0IGluc3RhbmNlb2YgTmdNb2R1bGVGYWN0b3J5IHx8IEFycmF5LmlzQXJyYXkodCkpIHtcbiAgICAgICAgcmV0dXJuIG9mKHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZyb20oY29tcGlsZXIuY29tcGlsZU1vZHVsZUFzeW5jKHQpKTtcbiAgICAgIH1cbiAgICB9KSxcbiAgICBtYXAoKGZhY3RvcnlPclJvdXRlczogTmdNb2R1bGVGYWN0b3J5PGFueT4gfCBSb3V0ZXMpID0+IHtcbiAgICAgIGlmIChvbkxvYWRFbmRMaXN0ZW5lcikge1xuICAgICAgICBvbkxvYWRFbmRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgICB9XG4gICAgICAvLyBUaGlzIGluamVjdG9yIGNvbWVzIGZyb20gdGhlIGBOZ01vZHVsZVJlZmAgd2hlbiBsYXp5IGxvYWRpbmcgYW4gYE5nTW9kdWxlYC4gVGhlcmUgaXNcbiAgICAgIC8vIG5vIGluamVjdG9yIGFzc29jaWF0ZWQgd2l0aCBsYXp5IGxvYWRpbmcgYSBgUm91dGVgIGFycmF5LlxuICAgICAgbGV0IGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yIHwgdW5kZWZpbmVkO1xuICAgICAgbGV0IHJhd1JvdXRlczogUm91dGVbXTtcbiAgICAgIGxldCByZXF1aXJlU3RhbmRhbG9uZUNvbXBvbmVudHMgPSBmYWxzZTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGZhY3RvcnlPclJvdXRlcykpIHtcbiAgICAgICAgcmF3Um91dGVzID0gZmFjdG9yeU9yUm91dGVzO1xuICAgICAgICByZXF1aXJlU3RhbmRhbG9uZUNvbXBvbmVudHMgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5qZWN0b3IgPSBmYWN0b3J5T3JSb3V0ZXMuY3JlYXRlKHBhcmVudEluamVjdG9yKS5pbmplY3RvcjtcbiAgICAgICAgLy8gV2hlbiBsb2FkaW5nIGEgbW9kdWxlIHRoYXQgZG9lc24ndCBwcm92aWRlIGBSb3V0ZXJNb2R1bGUuZm9yQ2hpbGQoKWAgcHJlbG9hZGVyXG4gICAgICAgIC8vIHdpbGwgZ2V0IHN0dWNrIGluIGFuIGluZmluaXRlIGxvb3AuIFRoZSBjaGlsZCBtb2R1bGUncyBJbmplY3RvciB3aWxsIGxvb2sgdG9cbiAgICAgICAgLy8gaXRzIHBhcmVudCBgSW5qZWN0b3JgIHdoZW4gaXQgZG9lc24ndCBmaW5kIGFueSBST1VURVMgc28gaXQgd2lsbCByZXR1cm4gcm91dGVzXG4gICAgICAgIC8vIGZvciBpdCdzIHBhcmVudCBtb2R1bGUgaW5zdGVhZC5cbiAgICAgICAgcmF3Um91dGVzID0gaW5qZWN0b3IuZ2V0KFJPVVRFUywgW10sIHtvcHRpb25hbDogdHJ1ZSwgc2VsZjogdHJ1ZX0pLmZsYXQoKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJvdXRlcyA9IHJhd1JvdXRlcy5tYXAoc3RhbmRhcmRpemVDb25maWcpO1xuICAgICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiZcbiAgICAgICAgdmFsaWRhdGVDb25maWcocm91dGVzLCByb3V0ZS5wYXRoLCByZXF1aXJlU3RhbmRhbG9uZUNvbXBvbmVudHMpO1xuICAgICAgcmV0dXJuIHtyb3V0ZXMsIGluamVjdG9yfTtcbiAgICB9KSxcbiAgKTtcbn1cblxuZnVuY3Rpb24gaXNXcmFwcGVkRGVmYXVsdEV4cG9ydDxUPih2YWx1ZTogVCB8IERlZmF1bHRFeHBvcnQ8VD4pOiB2YWx1ZSBpcyBEZWZhdWx0RXhwb3J0PFQ+IHtcbiAgLy8gV2UgdXNlIGBpbmAgaGVyZSB3aXRoIGEgc3RyaW5nIGtleSBgJ2RlZmF1bHQnYCwgYmVjYXVzZSB3ZSBleHBlY3QgYERlZmF1bHRFeHBvcnRgIG9iamVjdHMgdG8gYmVcbiAgLy8gZHluYW1pY2FsbHkgaW1wb3J0ZWQgRVMgbW9kdWxlcyB3aXRoIGEgc3BlYy1tYW5kYXRlZCBgZGVmYXVsdGAga2V5LiBUaHVzIHdlIGRvbid0IGV4cGVjdCB0aGF0XG4gIC8vIGBkZWZhdWx0YCB3aWxsIGJlIGEgcmVuYW1lZCBwcm9wZXJ0eS5cbiAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgJ2RlZmF1bHQnIGluIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBtYXliZVVud3JhcERlZmF1bHRFeHBvcnQ8VD4oaW5wdXQ6IFQgfCBEZWZhdWx0RXhwb3J0PFQ+KTogVCB7XG4gIC8vIEFzIHBlciBgaXNXcmFwcGVkRGVmYXVsdEV4cG9ydGAsIHRoZSBgZGVmYXVsdGAga2V5IGhlcmUgaXMgZ2VuZXJhdGVkIGJ5IHRoZSBicm93c2VyIGFuZCBub3RcbiAgLy8gc3ViamVjdCB0byBwcm9wZXJ0eSByZW5hbWluZywgc28gd2UgcmVmZXJlbmNlIGl0IHdpdGggYnJhY2tldCBhY2Nlc3MuXG4gIHJldHVybiBpc1dyYXBwZWREZWZhdWx0RXhwb3J0KGlucHV0KSA/IGlucHV0WydkZWZhdWx0J10gOiBpbnB1dDtcbn1cbiJdfQ==