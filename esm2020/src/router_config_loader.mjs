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
import { wrapIntoObservable } from './utils/collection';
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
                rawRoutes = injector.get(ROUTES, [], InjectFlags.Self | InjectFlags.Optional).flat();
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
RouterConfigLoader.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.3+sha-7885f35", ngImport: i0, type: RouterConfigLoader, deps: [{ token: i0.Injector }, { token: i0.Compiler }], target: i0.ɵɵFactoryTarget.Injectable });
RouterConfigLoader.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.0.0-next.3+sha-7885f35", ngImport: i0, type: RouterConfigLoader, providedIn: 'root' });
export { RouterConfigLoader };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.3+sha-7885f35", ngImport: i0, type: RouterConfigLoader, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2NvbmZpZ19sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3JvdXRlcl9jb25maWdfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxRQUFRLEVBQXVCLFVBQVUsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQU8sTUFBTSxlQUFlLENBQUM7QUFDdEksT0FBTyxFQUFDLHFCQUFxQixFQUFFLElBQUksRUFBYyxFQUFFLEVBQUUsT0FBTyxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQzFFLE9BQU8sRUFBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFdEUsT0FBTyxFQUFDLDRCQUE0QixFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFFeEUsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDdEQsT0FBTyxFQUFDLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLGNBQWMsRUFBQyxNQUFNLGdCQUFnQixDQUFDOztBQUduRixNQUFNLFdBQVcsR0FBRyxPQUFPLFNBQVMsS0FBSyxXQUFXLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUVwRTs7Ozs7Ozs7O0dBU0c7QUFDSCxNQUFNLENBQUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxjQUFjLENBQVksUUFBUSxDQUFDLENBQUM7QUFJOUQsTUFDYSxrQkFBa0I7SUFNN0IsWUFDWSxRQUFrQixFQUNsQixRQUFrQjtRQURsQixhQUFRLEdBQVIsUUFBUSxDQUFVO1FBQ2xCLGFBQVEsR0FBUixRQUFRLENBQVU7UUFQdEIscUJBQWdCLEdBQUcsSUFBSSxPQUFPLEVBQTBCLENBQUM7UUFDekQsb0JBQWUsR0FBRyxJQUFJLE9BQU8sRUFBeUMsQ0FB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QkFBa0IsQ0FBRSxZQUFxQyxFQUFFLENBQUM7YUFDOUQsSUFBSSxDQUNELEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxFQUM3QixRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNiLElBQUksQ0FBQyxZQUFZLGVBQWUsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNwRCxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNkO2lCQUFNO2dCQUNMLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNsRDtRQUNILENBQUMsQ0FBQyxDQUNMLENBQUM7SUFDUixDQUFDOzswSEExR1Usa0JBQWtCOzhIQUFsQixrQkFBa0IsY0FETixNQUFNO1NBQ2xCLGtCQUFrQjtzR0FBbEIsa0JBQWtCO2tCQUQ5QixVQUFVO21CQUFDLEVBQUMsVUFBVSxFQUFFLE1BQU0sRUFBQzs7QUE4R2hDLFNBQVMsc0JBQXNCLENBQUksS0FBeUI7SUFDMUQsa0dBQWtHO0lBQ2xHLGdHQUFnRztJQUNoRyx3Q0FBd0M7SUFDeEMsT0FBTyxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLFNBQVMsSUFBSSxLQUFLLENBQUM7QUFDbEUsQ0FBQztBQUVELFNBQVMsd0JBQXdCLENBQUksS0FBeUI7SUFDNUQsOEZBQThGO0lBQzlGLHdFQUF3RTtJQUN4RSxPQUFPLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNsRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29tcGlsZXIsIEVudmlyb25tZW50SW5qZWN0b3IsIEluamVjdGFibGUsIEluamVjdEZsYWdzLCBJbmplY3Rpb25Ub2tlbiwgSW5qZWN0b3IsIE5nTW9kdWxlRmFjdG9yeSwgVHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0Nvbm5lY3RhYmxlT2JzZXJ2YWJsZSwgZnJvbSwgT2JzZXJ2YWJsZSwgb2YsIFN1YmplY3R9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtmaW5hbGl6ZSwgbWFwLCBtZXJnZU1hcCwgcmVmQ291bnQsIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge2RlcHJlY2F0ZWRMb2FkQ2hpbGRyZW5TdHJpbmd9IGZyb20gJy4vZGVwcmVjYXRlZF9sb2FkX2NoaWxkcmVuJztcbmltcG9ydCB7RGVmYXVsdEV4cG9ydCwgTG9hZENoaWxkcmVuLCBMb2FkQ2hpbGRyZW5DYWxsYmFjaywgTG9hZGVkUm91dGVyQ29uZmlnLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge3dyYXBJbnRvT2JzZXJ2YWJsZX0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcbmltcG9ydCB7YXNzZXJ0U3RhbmRhbG9uZSwgc3RhbmRhcmRpemVDb25maWcsIHZhbGlkYXRlQ29uZmlnfSBmcm9tICcuL3V0aWxzL2NvbmZpZyc7XG5cblxuY29uc3QgTkdfREVWX01PREUgPSB0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCAhIW5nRGV2TW9kZTtcblxuLyoqXG4gKiBUaGUgW0RJIHRva2VuXShndWlkZS9nbG9zc2FyeS8jZGktdG9rZW4pIGZvciBhIHJvdXRlciBjb25maWd1cmF0aW9uLlxuICpcbiAqIGBST1VURVNgIGlzIGEgbG93IGxldmVsIEFQSSBmb3Igcm91dGVyIGNvbmZpZ3VyYXRpb24gdmlhIGRlcGVuZGVuY3kgaW5qZWN0aW9uLlxuICpcbiAqIFdlIHJlY29tbWVuZCB0aGF0IGluIGFsbW9zdCBhbGwgY2FzZXMgdG8gdXNlIGhpZ2hlciBsZXZlbCBBUElzIHN1Y2ggYXMgYFJvdXRlck1vZHVsZS5mb3JSb290KClgLFxuICogYHByb3ZpZGVSb3V0ZXJgLCBvciBgUm91dGVyLnJlc2V0Q29uZmlnKClgLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUyA9IG5ldyBJbmplY3Rpb25Ub2tlbjxSb3V0ZVtdW10+KCdST1VURVMnKTtcblxudHlwZSBDb21wb25lbnRMb2FkZXIgPSBPYnNlcnZhYmxlPFR5cGU8dW5rbm93bj4+O1xuXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnfSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJDb25maWdMb2FkZXIge1xuICBwcml2YXRlIGNvbXBvbmVudExvYWRlcnMgPSBuZXcgV2Vha01hcDxSb3V0ZSwgQ29tcG9uZW50TG9hZGVyPigpO1xuICBwcml2YXRlIGNoaWxkcmVuTG9hZGVycyA9IG5ldyBXZWFrTWFwPFJvdXRlLCBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4+KCk7XG4gIG9uTG9hZFN0YXJ0TGlzdGVuZXI/OiAocjogUm91dGUpID0+IHZvaWQ7XG4gIG9uTG9hZEVuZExpc3RlbmVyPzogKHI6IFJvdXRlKSA9PiB2b2lkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBpbmplY3RvcjogSW5qZWN0b3IsXG4gICAgICBwcml2YXRlIGNvbXBpbGVyOiBDb21waWxlcixcbiAgKSB7fVxuXG4gIGxvYWRDb21wb25lbnQocm91dGU6IFJvdXRlKTogT2JzZXJ2YWJsZTxUeXBlPHVua25vd24+PiB7XG4gICAgaWYgKHRoaXMuY29tcG9uZW50TG9hZGVycy5nZXQocm91dGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb21wb25lbnRMb2FkZXJzLmdldChyb3V0ZSkhO1xuICAgIH0gZWxzZSBpZiAocm91dGUuX2xvYWRlZENvbXBvbmVudCkge1xuICAgICAgcmV0dXJuIG9mKHJvdXRlLl9sb2FkZWRDb21wb25lbnQpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9uTG9hZFN0YXJ0TGlzdGVuZXIpIHtcbiAgICAgIHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgfVxuICAgIGNvbnN0IGxvYWRSdW5uZXIgPSB3cmFwSW50b09ic2VydmFibGUocm91dGUubG9hZENvbXBvbmVudCEoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5waXBlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcChtYXliZVVud3JhcERlZmF1bHRFeHBvcnQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcChjb21wb25lbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub25Mb2FkRW5kTGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkxvYWRFbmRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBOR19ERVZfTU9ERSAmJiBhc3NlcnRTdGFuZGFsb25lKHJvdXRlLnBhdGggPz8gJycsIGNvbXBvbmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3V0ZS5fbG9hZGVkQ29tcG9uZW50ID0gY29tcG9uZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsaXplKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29tcG9uZW50TG9hZGVycy5kZWxldGUocm91dGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAvLyBVc2UgY3VzdG9tIENvbm5lY3RhYmxlT2JzZXJ2YWJsZSBhcyBzaGFyZSBpbiBydW5uZXJzIHBpcGUgaW5jcmVhc2luZyB0aGUgYnVuZGxlIHNpemUgdG9vIG11Y2hcbiAgICBjb25zdCBsb2FkZXIgPVxuICAgICAgICBuZXcgQ29ubmVjdGFibGVPYnNlcnZhYmxlKGxvYWRSdW5uZXIsICgpID0+IG5ldyBTdWJqZWN0PFR5cGU8dW5rbm93bj4+KCkpLnBpcGUocmVmQ291bnQoKSk7XG4gICAgdGhpcy5jb21wb25lbnRMb2FkZXJzLnNldChyb3V0ZSwgbG9hZGVyKTtcbiAgICByZXR1cm4gbG9hZGVyO1xuICB9XG5cbiAgbG9hZENoaWxkcmVuKHBhcmVudEluamVjdG9yOiBJbmplY3Rvciwgcm91dGU6IFJvdXRlKTogT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWc+IHtcbiAgICBpZiAodGhpcy5jaGlsZHJlbkxvYWRlcnMuZ2V0KHJvdXRlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2hpbGRyZW5Mb2FkZXJzLmdldChyb3V0ZSkhO1xuICAgIH0gZWxzZSBpZiAocm91dGUuX2xvYWRlZFJvdXRlcykge1xuICAgICAgcmV0dXJuIG9mKHtyb3V0ZXM6IHJvdXRlLl9sb2FkZWRSb3V0ZXMsIGluamVjdG9yOiByb3V0ZS5fbG9hZGVkSW5qZWN0b3J9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vbkxvYWRTdGFydExpc3RlbmVyKSB7XG4gICAgICB0aGlzLm9uTG9hZFN0YXJ0TGlzdGVuZXIocm91dGUpO1xuICAgIH1cbiAgICBjb25zdCBtb2R1bGVGYWN0b3J5T3JSb3V0ZXMkID0gdGhpcy5sb2FkTW9kdWxlRmFjdG9yeU9yUm91dGVzKHJvdXRlLmxvYWRDaGlsZHJlbiEpO1xuICAgIGNvbnN0IGxvYWRSdW5uZXIgPSBtb2R1bGVGYWN0b3J5T3JSb3V0ZXMkLnBpcGUoXG4gICAgICAgIG1hcCgoZmFjdG9yeU9yUm91dGVzOiBOZ01vZHVsZUZhY3Rvcnk8YW55PnxSb3V0ZXMpID0+IHtcbiAgICAgICAgICBpZiAodGhpcy5vbkxvYWRFbmRMaXN0ZW5lcikge1xuICAgICAgICAgICAgdGhpcy5vbkxvYWRFbmRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFRoaXMgaW5qZWN0b3IgY29tZXMgZnJvbSB0aGUgYE5nTW9kdWxlUmVmYCB3aGVuIGxhenkgbG9hZGluZyBhbiBgTmdNb2R1bGVgLiBUaGVyZSBpcyBub1xuICAgICAgICAgIC8vIGluamVjdG9yIGFzc29jaWF0ZWQgd2l0aCBsYXp5IGxvYWRpbmcgYSBgUm91dGVgIGFycmF5LlxuICAgICAgICAgIGxldCBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvcnx1bmRlZmluZWQ7XG4gICAgICAgICAgbGV0IHJhd1JvdXRlczogUm91dGVbXTtcbiAgICAgICAgICBsZXQgcmVxdWlyZVN0YW5kYWxvbmVDb21wb25lbnRzID0gZmFsc2U7XG4gICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZmFjdG9yeU9yUm91dGVzKSkge1xuICAgICAgICAgICAgcmF3Um91dGVzID0gZmFjdG9yeU9yUm91dGVzO1xuICAgICAgICAgICAgcmVxdWlyZVN0YW5kYWxvbmVDb21wb25lbnRzID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5qZWN0b3IgPSBmYWN0b3J5T3JSb3V0ZXMuY3JlYXRlKHBhcmVudEluamVjdG9yKS5pbmplY3RvcjtcbiAgICAgICAgICAgIC8vIFdoZW4gbG9hZGluZyBhIG1vZHVsZSB0aGF0IGRvZXNuJ3QgcHJvdmlkZSBgUm91dGVyTW9kdWxlLmZvckNoaWxkKClgIHByZWxvYWRlclxuICAgICAgICAgICAgLy8gd2lsbCBnZXQgc3R1Y2sgaW4gYW4gaW5maW5pdGUgbG9vcC4gVGhlIGNoaWxkIG1vZHVsZSdzIEluamVjdG9yIHdpbGwgbG9vayB0b1xuICAgICAgICAgICAgLy8gaXRzIHBhcmVudCBgSW5qZWN0b3JgIHdoZW4gaXQgZG9lc24ndCBmaW5kIGFueSBST1VURVMgc28gaXQgd2lsbCByZXR1cm4gcm91dGVzXG4gICAgICAgICAgICAvLyBmb3IgaXQncyBwYXJlbnQgbW9kdWxlIGluc3RlYWQuXG4gICAgICAgICAgICByYXdSb3V0ZXMgPSBpbmplY3Rvci5nZXQoUk9VVEVTLCBbXSwgSW5qZWN0RmxhZ3MuU2VsZiB8IEluamVjdEZsYWdzLk9wdGlvbmFsKS5mbGF0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHJvdXRlcyA9IHJhd1JvdXRlcy5tYXAoc3RhbmRhcmRpemVDb25maWcpO1xuICAgICAgICAgIE5HX0RFVl9NT0RFICYmIHZhbGlkYXRlQ29uZmlnKHJvdXRlcywgcm91dGUucGF0aCwgcmVxdWlyZVN0YW5kYWxvbmVDb21wb25lbnRzKTtcbiAgICAgICAgICByZXR1cm4ge3JvdXRlcywgaW5qZWN0b3J9O1xuICAgICAgICB9KSxcbiAgICAgICAgZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgIHRoaXMuY2hpbGRyZW5Mb2FkZXJzLmRlbGV0ZShyb3V0ZSk7XG4gICAgICAgIH0pLFxuICAgICk7XG4gICAgLy8gVXNlIGN1c3RvbSBDb25uZWN0YWJsZU9ic2VydmFibGUgYXMgc2hhcmUgaW4gcnVubmVycyBwaXBlIGluY3JlYXNpbmcgdGhlIGJ1bmRsZSBzaXplIHRvbyBtdWNoXG4gICAgY29uc3QgbG9hZGVyID0gbmV3IENvbm5lY3RhYmxlT2JzZXJ2YWJsZShsb2FkUnVubmVyLCAoKSA9PiBuZXcgU3ViamVjdDxMb2FkZWRSb3V0ZXJDb25maWc+KCkpXG4gICAgICAgICAgICAgICAgICAgICAgIC5waXBlKHJlZkNvdW50KCkpO1xuICAgIHRoaXMuY2hpbGRyZW5Mb2FkZXJzLnNldChyb3V0ZSwgbG9hZGVyKTtcbiAgICByZXR1cm4gbG9hZGVyO1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkTW9kdWxlRmFjdG9yeU9yUm91dGVzKGxvYWRDaGlsZHJlbjogTG9hZENoaWxkcmVuKTpcbiAgICAgIE9ic2VydmFibGU8TmdNb2R1bGVGYWN0b3J5PGFueT58Um91dGVzPiB7XG4gICAgY29uc3QgZGVwcmVjYXRlZFJlc3VsdCA9IGRlcHJlY2F0ZWRMb2FkQ2hpbGRyZW5TdHJpbmcodGhpcy5pbmplY3RvciwgbG9hZENoaWxkcmVuKTtcbiAgICBpZiAoZGVwcmVjYXRlZFJlc3VsdCkge1xuICAgICAgcmV0dXJuIGRlcHJlY2F0ZWRSZXN1bHQ7XG4gICAgfVxuICAgIHJldHVybiB3cmFwSW50b09ic2VydmFibGUoKGxvYWRDaGlsZHJlbiBhcyBMb2FkQ2hpbGRyZW5DYWxsYmFjaykoKSlcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICBtYXAobWF5YmVVbndyYXBEZWZhdWx0RXhwb3J0KSxcbiAgICAgICAgICAgIG1lcmdlTWFwKCh0KSA9PiB7XG4gICAgICAgICAgICAgIGlmICh0IGluc3RhbmNlb2YgTmdNb2R1bGVGYWN0b3J5IHx8IEFycmF5LmlzQXJyYXkodCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb2YodCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZyb20odGhpcy5jb21waWxlci5jb21waWxlTW9kdWxlQXN5bmModCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc1dyYXBwZWREZWZhdWx0RXhwb3J0PFQ+KHZhbHVlOiBUfERlZmF1bHRFeHBvcnQ8VD4pOiB2YWx1ZSBpcyBEZWZhdWx0RXhwb3J0PFQ+IHtcbiAgLy8gV2UgdXNlIGBpbmAgaGVyZSB3aXRoIGEgc3RyaW5nIGtleSBgJ2RlZmF1bHQnYCwgYmVjYXVzZSB3ZSBleHBlY3QgYERlZmF1bHRFeHBvcnRgIG9iamVjdHMgdG8gYmVcbiAgLy8gZHluYW1pY2FsbHkgaW1wb3J0ZWQgRVMgbW9kdWxlcyB3aXRoIGEgc3BlYy1tYW5kYXRlZCBgZGVmYXVsdGAga2V5LiBUaHVzIHdlIGRvbid0IGV4cGVjdCB0aGF0XG4gIC8vIGBkZWZhdWx0YCB3aWxsIGJlIGEgcmVuYW1lZCBwcm9wZXJ0eS5cbiAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgJ2RlZmF1bHQnIGluIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBtYXliZVVud3JhcERlZmF1bHRFeHBvcnQ8VD4oaW5wdXQ6IFR8RGVmYXVsdEV4cG9ydDxUPik6IFQge1xuICAvLyBBcyBwZXIgYGlzV3JhcHBlZERlZmF1bHRFeHBvcnRgLCB0aGUgYGRlZmF1bHRgIGtleSBoZXJlIGlzIGdlbmVyYXRlZCBieSB0aGUgYnJvd3NlciBhbmQgbm90XG4gIC8vIHN1YmplY3QgdG8gcHJvcGVydHkgcmVuYW1pbmcsIHNvIHdlIHJlZmVyZW5jZSBpdCB3aXRoIGJyYWNrZXQgYWNjZXNzLlxuICByZXR1cm4gaXNXcmFwcGVkRGVmYXVsdEV4cG9ydChpbnB1dCkgPyBpbnB1dFsnZGVmYXVsdCddIDogaW5wdXQ7XG59XG4iXX0=