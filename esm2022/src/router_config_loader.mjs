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
 * The DI token for a router configuration.
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.1.0-next.0+sha-b80b462", ngImport: i0, type: RouterConfigLoader, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.1.0-next.0+sha-b80b462", ngImport: i0, type: RouterConfigLoader, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.1.0-next.0+sha-b80b462", ngImport: i0, type: RouterConfigLoader, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2NvbmZpZ19sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3JvdXRlcl9jb25maWdfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFDTCxRQUFRLEVBRVIsTUFBTSxFQUNOLFVBQVUsRUFDVixjQUFjLEVBRWQsZUFBZSxHQUVoQixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFjLEVBQUUsRUFBRSxPQUFPLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDMUUsT0FBTyxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUd0RSxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUN0RCxPQUFPLEVBQUMsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7O0FBRW5GOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sQ0FBQyxNQUFNLE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBWSxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFLL0UsTUFBTSxPQUFPLGtCQUFrQjtJQUQvQjtRQUVVLHFCQUFnQixHQUFHLElBQUksT0FBTyxFQUEwQixDQUFDO1FBQ3pELG9CQUFlLEdBQUcsSUFBSSxPQUFPLEVBQXlDLENBQUM7UUFHOUQsYUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztLQStEOUM7SUE3REMsYUFBYSxDQUFDLEtBQVk7UUFDeEIsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDckMsT0FBTyxJQUFJLENB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LGNBQWMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztZQUMzRCxpRkFBaUY7WUFDakYsK0VBQStFO1lBQy9FLGlGQUFpRjtZQUNqRixrQ0FBa0M7WUFDbEMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDNUUsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNoRCxDQUFDLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTLENBQUM7WUFDN0MsY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLDJCQUEyQixDQUFDLENBQUM7UUFDbEUsT0FBTyxFQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUMsQ0FBQztJQUM1QixDQUFDLENBQUMsQ0FDSCxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsc0JBQXNCLENBQUksS0FBMkI7SUFDNUQsa0dBQWtHO0lBQ2xHLGdHQUFnRztJQUNoRyx3Q0FBd0M7SUFDeEMsT0FBTyxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLFNBQVMsSUFBSSxLQUFLLENBQUM7QUFDbEUsQ0FBQztBQUVELFNBQVMsd0JBQXdCLENBQUksS0FBMkI7SUFDOUQsOEZBQThGO0lBQzlGLHdFQUF3RTtJQUN4RSxPQUFPLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNsRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIENvbXBpbGVyLFxuICBFbnZpcm9ubWVudEluamVjdG9yLFxuICBpbmplY3QsXG4gIEluamVjdGFibGUsXG4gIEluamVjdGlvblRva2VuLFxuICBJbmplY3RvcixcbiAgTmdNb2R1bGVGYWN0b3J5LFxuICBUeXBlLFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Q29ubmVjdGFibGVPYnNlcnZhYmxlLCBmcm9tLCBPYnNlcnZhYmxlLCBvZiwgU3ViamVjdH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2ZpbmFsaXplLCBtYXAsIG1lcmdlTWFwLCByZWZDb3VudCwgdGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7RGVmYXVsdEV4cG9ydCwgTG9hZGVkUm91dGVyQ29uZmlnLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge3dyYXBJbnRvT2JzZXJ2YWJsZX0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcbmltcG9ydCB7YXNzZXJ0U3RhbmRhbG9uZSwgc3RhbmRhcmRpemVDb25maWcsIHZhbGlkYXRlQ29uZmlnfSBmcm9tICcuL3V0aWxzL2NvbmZpZyc7XG5cbi8qKlxuICogVGhlIERJIHRva2VuIGZvciBhIHJvdXRlciBjb25maWd1cmF0aW9uLlxuICpcbiAqIGBST1VURVNgIGlzIGEgbG93IGxldmVsIEFQSSBmb3Igcm91dGVyIGNvbmZpZ3VyYXRpb24gdmlhIGRlcGVuZGVuY3kgaW5qZWN0aW9uLlxuICpcbiAqIFdlIHJlY29tbWVuZCB0aGF0IGluIGFsbW9zdCBhbGwgY2FzZXMgdG8gdXNlIGhpZ2hlciBsZXZlbCBBUElzIHN1Y2ggYXMgYFJvdXRlck1vZHVsZS5mb3JSb290KClgLFxuICogYHByb3ZpZGVSb3V0ZXJgLCBvciBgUm91dGVyLnJlc2V0Q29uZmlnKClgLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUyA9IG5ldyBJbmplY3Rpb25Ub2tlbjxSb3V0ZVtdW10+KG5nRGV2TW9kZSA/ICdST1VURVMnIDogJycpO1xuXG50eXBlIENvbXBvbmVudExvYWRlciA9IE9ic2VydmFibGU8VHlwZTx1bmtub3duPj47XG5cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCd9KVxuZXhwb3J0IGNsYXNzIFJvdXRlckNvbmZpZ0xvYWRlciB7XG4gIHByaXZhdGUgY29tcG9uZW50TG9hZGVycyA9IG5ldyBXZWFrTWFwPFJvdXRlLCBDb21wb25lbnRMb2FkZXI+KCk7XG4gIHByaXZhdGUgY2hpbGRyZW5Mb2FkZXJzID0gbmV3IFdlYWtNYXA8Um91dGUsIE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPj4oKTtcbiAgb25Mb2FkU3RhcnRMaXN0ZW5lcj86IChyOiBSb3V0ZSkgPT4gdm9pZDtcbiAgb25Mb2FkRW5kTGlzdGVuZXI/OiAocjogUm91dGUpID0+IHZvaWQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgY29tcGlsZXIgPSBpbmplY3QoQ29tcGlsZXIpO1xuXG4gIGxvYWRDb21wb25lbnQocm91dGU6IFJvdXRlKTogT2JzZXJ2YWJsZTxUeXBlPHVua25vd24+PiB7XG4gICAgaWYgKHRoaXMuY29tcG9uZW50TG9hZGVycy5nZXQocm91dGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb21wb25lbnRMb2FkZXJzLmdldChyb3V0ZSkhO1xuICAgIH0gZWxzZSBpZiAocm91dGUuX2xvYWRlZENvbXBvbmVudCkge1xuICAgICAgcmV0dXJuIG9mKHJvdXRlLl9sb2FkZWRDb21wb25lbnQpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9uTG9hZFN0YXJ0TGlzdGVuZXIpIHtcbiAgICAgIHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgfVxuICAgIGNvbnN0IGxvYWRSdW5uZXIgPSB3cmFwSW50b09ic2VydmFibGUocm91dGUubG9hZENvbXBvbmVudCEoKSkucGlwZShcbiAgICAgIG1hcChtYXliZVVud3JhcERlZmF1bHRFeHBvcnQpLFxuICAgICAgdGFwKChjb21wb25lbnQpID0+IHtcbiAgICAgICAgaWYgKHRoaXMub25Mb2FkRW5kTGlzdGVuZXIpIHtcbiAgICAgICAgICB0aGlzLm9uTG9hZEVuZExpc3RlbmVyKHJvdXRlKTtcbiAgICAgICAgfVxuICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICAgIGFzc2VydFN0YW5kYWxvbmUocm91dGUucGF0aCA/PyAnJywgY29tcG9uZW50KTtcbiAgICAgICAgcm91dGUuX2xvYWRlZENvbXBvbmVudCA9IGNvbXBvbmVudDtcbiAgICAgIH0pLFxuICAgICAgZmluYWxpemUoKCkgPT4ge1xuICAgICAgICB0aGlzLmNvbXBvbmVudExvYWRlcnMuZGVsZXRlKHJvdXRlKTtcbiAgICAgIH0pLFxuICAgICk7XG4gICAgLy8gVXNlIGN1c3RvbSBDb25uZWN0YWJsZU9ic2VydmFibGUgYXMgc2hhcmUgaW4gcnVubmVycyBwaXBlIGluY3JlYXNpbmcgdGhlIGJ1bmRsZSBzaXplIHRvbyBtdWNoXG4gICAgY29uc3QgbG9hZGVyID0gbmV3IENvbm5lY3RhYmxlT2JzZXJ2YWJsZShsb2FkUnVubmVyLCAoKSA9PiBuZXcgU3ViamVjdDxUeXBlPHVua25vd24+PigpKS5waXBlKFxuICAgICAgcmVmQ291bnQoKSxcbiAgICApO1xuICAgIHRoaXMuY29tcG9uZW50TG9hZGVycy5zZXQocm91dGUsIGxvYWRlcik7XG4gICAgcmV0dXJuIGxvYWRlcjtcbiAgfVxuXG4gIGxvYWRDaGlsZHJlbihwYXJlbnRJbmplY3RvcjogSW5qZWN0b3IsIHJvdXRlOiBSb3V0ZSk6IE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPiB7XG4gICAgaWYgKHRoaXMuY2hpbGRyZW5Mb2FkZXJzLmdldChyb3V0ZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNoaWxkcmVuTG9hZGVycy5nZXQocm91dGUpITtcbiAgICB9IGVsc2UgaWYgKHJvdXRlLl9sb2FkZWRSb3V0ZXMpIHtcbiAgICAgIHJldHVybiBvZih7cm91dGVzOiByb3V0ZS5fbG9hZGVkUm91dGVzLCBpbmplY3Rvcjogcm91dGUuX2xvYWRlZEluamVjdG9yfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcikge1xuICAgICAgdGhpcy5vbkxvYWRTdGFydExpc3RlbmVyKHJvdXRlKTtcbiAgICB9XG4gICAgY29uc3QgbW9kdWxlRmFjdG9yeU9yUm91dGVzJCA9IGxvYWRDaGlsZHJlbihcbiAgICAgIHJvdXRlLFxuICAgICAgdGhpcy5jb21waWxlcixcbiAgICAgIHBhcmVudEluamVjdG9yLFxuICAgICAgdGhpcy5vbkxvYWRFbmRMaXN0ZW5lcixcbiAgICApO1xuICAgIGNvbnN0IGxvYWRSdW5uZXIgPSBtb2R1bGVGYWN0b3J5T3JSb3V0ZXMkLnBpcGUoXG4gICAgICBmaW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgIHRoaXMuY2hpbGRyZW5Mb2FkZXJzLmRlbGV0ZShyb3V0ZSk7XG4gICAgICB9KSxcbiAgICApO1xuICAgIC8vIFVzZSBjdXN0b20gQ29ubmVjdGFibGVPYnNlcnZhYmxlIGFzIHNoYXJlIGluIHJ1bm5lcnMgcGlwZSBpbmNyZWFzaW5nIHRoZSBidW5kbGUgc2l6ZSB0b28gbXVjaFxuICAgIGNvbnN0IGxvYWRlciA9IG5ldyBDb25uZWN0YWJsZU9ic2VydmFibGUoXG4gICAgICBsb2FkUnVubmVyLFxuICAgICAgKCkgPT4gbmV3IFN1YmplY3Q8TG9hZGVkUm91dGVyQ29uZmlnPigpLFxuICAgICkucGlwZShyZWZDb3VudCgpKTtcbiAgICB0aGlzLmNoaWxkcmVuTG9hZGVycy5zZXQocm91dGUsIGxvYWRlcik7XG4gICAgcmV0dXJuIGxvYWRlcjtcbiAgfVxufVxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgYHJvdXRlLmxvYWRDaGlsZHJlbmAgY2FsbGJhY2sgYW5kIGNvbnZlcnRzIHRoZSByZXN1bHQgdG8gYW4gYXJyYXkgb2YgY2hpbGQgcm91dGVzIGFuZFxuICogYW4gaW5qZWN0b3IgaWYgdGhhdCBjYWxsYmFjayByZXR1cm5lZCBhIG1vZHVsZS5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgZm9yIHRoZSByb3V0ZSBkaXNjb3ZlcnkgZHVyaW5nIHByZXJlbmRlcmluZ1xuICogaW4gQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIuIElmIHRoZXJlIGFyZSBhbnkgdXBkYXRlcyB0byB0aGUgY29udHJhY3QgaGVyZSwgaXQgd2lsbCByZXF1aXJlXG4gKiBhbiB1cGRhdGUgdG8gdGhlIGV4dHJhY3Rvci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvYWRDaGlsZHJlbihcbiAgcm91dGU6IFJvdXRlLFxuICBjb21waWxlcjogQ29tcGlsZXIsXG4gIHBhcmVudEluamVjdG9yOiBJbmplY3RvcixcbiAgb25Mb2FkRW5kTGlzdGVuZXI/OiAocjogUm91dGUpID0+IHZvaWQsXG4pOiBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4ge1xuICByZXR1cm4gd3JhcEludG9PYnNlcnZhYmxlKHJvdXRlLmxvYWRDaGlsZHJlbiEoKSkucGlwZShcbiAgICBtYXAobWF5YmVVbndyYXBEZWZhdWx0RXhwb3J0KSxcbiAgICBtZXJnZU1hcCgodCkgPT4ge1xuICAgICAgaWYgKHQgaW5zdGFuY2VvZiBOZ01vZHVsZUZhY3RvcnkgfHwgQXJyYXkuaXNBcnJheSh0KSkge1xuICAgICAgICByZXR1cm4gb2YodCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZnJvbShjb21waWxlci5jb21waWxlTW9kdWxlQXN5bmModCkpO1xuICAgICAgfVxuICAgIH0pLFxuICAgIG1hcCgoZmFjdG9yeU9yUm91dGVzOiBOZ01vZHVsZUZhY3Rvcnk8YW55PiB8IFJvdXRlcykgPT4ge1xuICAgICAgaWYgKG9uTG9hZEVuZExpc3RlbmVyKSB7XG4gICAgICAgIG9uTG9hZEVuZExpc3RlbmVyKHJvdXRlKTtcbiAgICAgIH1cbiAgICAgIC8vIFRoaXMgaW5qZWN0b3IgY29tZXMgZnJvbSB0aGUgYE5nTW9kdWxlUmVmYCB3aGVuIGxhenkgbG9hZGluZyBhbiBgTmdNb2R1bGVgLiBUaGVyZSBpc1xuICAgICAgLy8gbm8gaW5qZWN0b3IgYXNzb2NpYXRlZCB3aXRoIGxhenkgbG9hZGluZyBhIGBSb3V0ZWAgYXJyYXkuXG4gICAgICBsZXQgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IgfCB1bmRlZmluZWQ7XG4gICAgICBsZXQgcmF3Um91dGVzOiBSb3V0ZVtdO1xuICAgICAgbGV0IHJlcXVpcmVTdGFuZGFsb25lQ29tcG9uZW50cyA9IGZhbHNlO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZmFjdG9yeU9yUm91dGVzKSkge1xuICAgICAgICByYXdSb3V0ZXMgPSBmYWN0b3J5T3JSb3V0ZXM7XG4gICAgICAgIHJlcXVpcmVTdGFuZGFsb25lQ29tcG9uZW50cyA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbmplY3RvciA9IGZhY3RvcnlPclJvdXRlcy5jcmVhdGUocGFyZW50SW5qZWN0b3IpLmluamVjdG9yO1xuICAgICAgICAvLyBXaGVuIGxvYWRpbmcgYSBtb2R1bGUgdGhhdCBkb2Vzbid0IHByb3ZpZGUgYFJvdXRlck1vZHVsZS5mb3JDaGlsZCgpYCBwcmVsb2FkZXJcbiAgICAgICAgLy8gd2lsbCBnZXQgc3R1Y2sgaW4gYW4gaW5maW5pdGUgbG9vcC4gVGhlIGNoaWxkIG1vZHVsZSdzIEluamVjdG9yIHdpbGwgbG9vayB0b1xuICAgICAgICAvLyBpdHMgcGFyZW50IGBJbmplY3RvcmAgd2hlbiBpdCBkb2Vzbid0IGZpbmQgYW55IFJPVVRFUyBzbyBpdCB3aWxsIHJldHVybiByb3V0ZXNcbiAgICAgICAgLy8gZm9yIGl0J3MgcGFyZW50IG1vZHVsZSBpbnN0ZWFkLlxuICAgICAgICByYXdSb3V0ZXMgPSBpbmplY3Rvci5nZXQoUk9VVEVTLCBbXSwge29wdGlvbmFsOiB0cnVlLCBzZWxmOiB0cnVlfSkuZmxhdCgpO1xuICAgICAgfVxuICAgICAgY29uc3Qgcm91dGVzID0gcmF3Um91dGVzLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICB2YWxpZGF0ZUNvbmZpZyhyb3V0ZXMsIHJvdXRlLnBhdGgsIHJlcXVpcmVTdGFuZGFsb25lQ29tcG9uZW50cyk7XG4gICAgICByZXR1cm4ge3JvdXRlcywgaW5qZWN0b3J9O1xuICAgIH0pLFxuICApO1xufVxuXG5mdW5jdGlvbiBpc1dyYXBwZWREZWZhdWx0RXhwb3J0PFQ+KHZhbHVlOiBUIHwgRGVmYXVsdEV4cG9ydDxUPik6IHZhbHVlIGlzIERlZmF1bHRFeHBvcnQ8VD4ge1xuICAvLyBXZSB1c2UgYGluYCBoZXJlIHdpdGggYSBzdHJpbmcga2V5IGAnZGVmYXVsdCdgLCBiZWNhdXNlIHdlIGV4cGVjdCBgRGVmYXVsdEV4cG9ydGAgb2JqZWN0cyB0byBiZVxuICAvLyBkeW5hbWljYWxseSBpbXBvcnRlZCBFUyBtb2R1bGVzIHdpdGggYSBzcGVjLW1hbmRhdGVkIGBkZWZhdWx0YCBrZXkuIFRodXMgd2UgZG9uJ3QgZXhwZWN0IHRoYXRcbiAgLy8gYGRlZmF1bHRgIHdpbGwgYmUgYSByZW5hbWVkIHByb3BlcnR5LlxuICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiAnZGVmYXVsdCcgaW4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIG1heWJlVW53cmFwRGVmYXVsdEV4cG9ydDxUPihpbnB1dDogVCB8IERlZmF1bHRFeHBvcnQ8VD4pOiBUIHtcbiAgLy8gQXMgcGVyIGBpc1dyYXBwZWREZWZhdWx0RXhwb3J0YCwgdGhlIGBkZWZhdWx0YCBrZXkgaGVyZSBpcyBnZW5lcmF0ZWQgYnkgdGhlIGJyb3dzZXIgYW5kIG5vdFxuICAvLyBzdWJqZWN0IHRvIHByb3BlcnR5IHJlbmFtaW5nLCBzbyB3ZSByZWZlcmVuY2UgaXQgd2l0aCBicmFja2V0IGFjY2Vzcy5cbiAgcmV0dXJuIGlzV3JhcHBlZERlZmF1bHRFeHBvcnQoaW5wdXQpID8gaW5wdXRbJ2RlZmF1bHQnXSA6IGlucHV0O1xufVxuIl19