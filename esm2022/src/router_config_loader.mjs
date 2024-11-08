/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { Compiler, inject, Injectable, InjectionToken, NgModuleFactory, } from '@angular/core';
import { ConnectableObservable, from, of, Subject } from 'rxjs';
import { finalize, map, mergeMap, refCount, tap } from 'rxjs/operators';
import { wrapIntoObservable } from './utils/collection';
import { assertStandalone, validateConfig } from './utils/config';
import { standardizeConfig } from './components/empty_outlet';
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.11+sha-f3567cc", ngImport: i0, type: RouterConfigLoader, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.2.11+sha-f3567cc", ngImport: i0, type: RouterConfigLoader, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.11+sha-f3567cc", ngImport: i0, type: RouterConfigLoader, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2NvbmZpZ19sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3JvdXRlcl9jb25maWdfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFDTCxRQUFRLEVBRVIsTUFBTSxFQUNOLFVBQVUsRUFDVixjQUFjLEVBRWQsZUFBZSxHQUVoQixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFjLEVBQUUsRUFBRSxPQUFPLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDMUUsT0FBTyxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUd0RSxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUN0RCxPQUFPLEVBQUMsZ0JBQWdCLEVBQUUsY0FBYyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDaEUsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0sMkJBQTJCLENBQUM7O0FBRTVEOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sQ0FBQyxNQUFNLE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBWSxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFLL0UsTUFBTSxPQUFPLGtCQUFrQjtJQUQvQjtRQUVVLHFCQUFnQixHQUFHLElBQUksT0FBTyxFQUEwQixDQUFDO1FBQ3pELG9CQUFlLEdBQUcsSUFBSSxPQUFPLEVBQXlDLENBQUM7UUFHOUQsYUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztLQStEOUM7SUE3REMsYUFBYSxDQUFDLEtBQVk7UUFDeEIsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUss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QUNOLFFBQVEsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztZQUMzRCxpRkFBaUY7WUFDakYsK0VBQStFO1lBQy9FLGlGQUFpRjtZQUNqRixrQ0FBa0M7WUFDbEMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDNUUsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNoRCxDQUFDLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTLENBQUM7WUFDN0MsY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLDJCQUEyQixDQUFDLENBQUM7UUFDbEUsT0FBTyxFQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUMsQ0FBQztJQUM1QixDQUFDLENBQUMsQ0FDSCxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsc0JBQXNCLENBQUksS0FBMkI7SUFDNUQsa0dBQWtHO0lBQ2xHLGdHQUFnRztJQUNoRyx3Q0FBd0M7SUFDeEMsT0FBTyxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLFNBQVMsSUFBSSxLQUFLLENBQUM7QUFDbEUsQ0FBQztBQUVELFNBQVMsd0JBQXdCLENBQUksS0FBMkI7SUFDOUQsOEZBQThGO0lBQzlGLHdFQUF3RTtJQUN4RSxPQUFPLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNsRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuZGV2L2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1xuICBDb21waWxlcixcbiAgRW52aXJvbm1lbnRJbmplY3RvcixcbiAgaW5qZWN0LFxuICBJbmplY3RhYmxlLFxuICBJbmplY3Rpb25Ub2tlbixcbiAgSW5qZWN0b3IsXG4gIE5nTW9kdWxlRmFjdG9yeSxcbiAgVHlwZSxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0Nvbm5lY3RhYmxlT2JzZXJ2YWJsZSwgZnJvbSwgT2JzZXJ2YWJsZSwgb2YsIFN1YmplY3R9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtmaW5hbGl6ZSwgbWFwLCBtZXJnZU1hcCwgcmVmQ291bnQsIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0RlZmF1bHRFeHBvcnQsIExvYWRlZFJvdXRlckNvbmZpZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHt3cmFwSW50b09ic2VydmFibGV9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge2Fzc2VydFN0YW5kYWxvbmUsIHZhbGlkYXRlQ29uZmlnfSBmcm9tICcuL3V0aWxzL2NvbmZpZyc7XG5pbXBvcnQge3N0YW5kYXJkaXplQ29uZmlnfSBmcm9tICcuL2NvbXBvbmVudHMvZW1wdHlfb3V0bGV0JztcblxuLyoqXG4gKiBUaGUgREkgdG9rZW4gZm9yIGEgcm91dGVyIGNvbmZpZ3VyYXRpb24uXG4gKlxuICogYFJPVVRFU2AgaXMgYSBsb3cgbGV2ZWwgQVBJIGZvciByb3V0ZXIgY29uZmlndXJhdGlvbiB2aWEgZGVwZW5kZW5jeSBpbmplY3Rpb24uXG4gKlxuICogV2UgcmVjb21tZW5kIHRoYXQgaW4gYWxtb3N0IGFsbCBjYXNlcyB0byB1c2UgaGlnaGVyIGxldmVsIEFQSXMgc3VjaCBhcyBgUm91dGVyTW9kdWxlLmZvclJvb3QoKWAsXG4gKiBgcHJvdmlkZVJvdXRlcmAsIG9yIGBSb3V0ZXIucmVzZXRDb25maWcoKWAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY29uc3QgUk9VVEVTID0gbmV3IEluamVjdGlvblRva2VuPFJvdXRlW11bXT4obmdEZXZNb2RlID8gJ1JPVVRFUycgOiAnJyk7XG5cbnR5cGUgQ29tcG9uZW50TG9hZGVyID0gT2JzZXJ2YWJsZTxUeXBlPHVua25vd24+PjtcblxuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgUm91dGVyQ29uZmlnTG9hZGVyIHtcbiAgcHJpdmF0ZSBjb21wb25lbnRMb2FkZXJzID0gbmV3IFdlYWtNYXA8Um91dGUsIENvbXBvbmVudExvYWRlcj4oKTtcbiAgcHJpdmF0ZSBjaGlsZHJlbkxvYWRlcnMgPSBuZXcgV2Vha01hcDxSb3V0ZSwgT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWc+PigpO1xuICBvbkxvYWRTdGFydExpc3RlbmVyPzogKHI6IFJvdXRlKSA9PiB2b2lkO1xuICBvbkxvYWRFbmRMaXN0ZW5lcj86IChyOiBSb3V0ZSkgPT4gdm9pZDtcbiAgcHJpdmF0ZSByZWFkb25seSBjb21waWxlciA9IGluamVjdChDb21waWxlcik7XG5cbiAgbG9hZENvbXBvbmVudChyb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPFR5cGU8dW5rbm93bj4+IHtcbiAgICBpZiAodGhpcy5jb21wb25lbnRMb2FkZXJzLmdldChyb3V0ZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvbXBvbmVudExvYWRlcnMuZ2V0KHJvdXRlKSE7XG4gICAgfSBlbHNlIGlmIChyb3V0ZS5fbG9hZGVkQ29tcG9uZW50KSB7XG4gICAgICByZXR1cm4gb2Yocm91dGUuX2xvYWRlZENvbXBvbmVudCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcikge1xuICAgICAgdGhpcy5vbkxvYWRTdGFydExpc3RlbmVyKHJvdXRlKTtcbiAgICB9XG4gICAgY29uc3QgbG9hZFJ1bm5lciA9IHdyYXBJbnRvT2JzZXJ2YWJsZShyb3V0ZS5sb2FkQ29tcG9uZW50ISgpKS5waXBlKFxuICAgICAgbWFwKG1heWJlVW53cmFwRGVmYXVsdEV4cG9ydCksXG4gICAgICB0YXAoKGNvbXBvbmVudCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5vbkxvYWRFbmRMaXN0ZW5lcikge1xuICAgICAgICAgIHRoaXMub25Mb2FkRW5kTGlzdGVuZXIocm91dGUpO1xuICAgICAgICB9XG4gICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmXG4gICAgICAgICAgYXNzZXJ0U3RhbmRhbG9uZShyb3V0ZS5wYXRoID8/ICcnLCBjb21wb25lbnQpO1xuICAgICAgICByb3V0ZS5fbG9hZGVkQ29tcG9uZW50ID0gY29tcG9uZW50O1xuICAgICAgfSksXG4gICAgICBmaW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgIHRoaXMuY29tcG9uZW50TG9hZGVycy5kZWxldGUocm91dGUpO1xuICAgICAgfSksXG4gICAgKTtcbiAgICAvLyBVc2UgY3VzdG9tIENvbm5lY3RhYmxlT2JzZXJ2YWJsZSBhcyBzaGFyZSBpbiBydW5uZXJzIHBpcGUgaW5jcmVhc2luZyB0aGUgYnVuZGxlIHNpemUgdG9vIG11Y2hcbiAgICBjb25zdCBsb2FkZXIgPSBuZXcgQ29ubmVjdGFibGVPYnNlcnZhYmxlKGxvYWRSdW5uZXIsICgpID0+IG5ldyBTdWJqZWN0PFR5cGU8dW5rbm93bj4+KCkpLnBpcGUoXG4gICAgICByZWZDb3VudCgpLFxuICAgICk7XG4gICAgdGhpcy5jb21wb25lbnRMb2FkZXJzLnNldChyb3V0ZSwgbG9hZGVyKTtcbiAgICByZXR1cm4gbG9hZGVyO1xuICB9XG5cbiAgbG9hZENoaWxkcmVuKHBhcmVudEluamVjdG9yOiBJbmplY3Rvciwgcm91dGU6IFJvdXRlKTogT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWc+IHtcbiAgICBpZiAodGhpcy5jaGlsZHJlbkxvYWRlcnMuZ2V0KHJvdXRlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2hpbGRyZW5Mb2FkZXJzLmdldChyb3V0ZSkhO1xuICAgIH0gZWxzZSBpZiAocm91dGUuX2xvYWRlZFJvdXRlcykge1xuICAgICAgcmV0dXJuIG9mKHtyb3V0ZXM6IHJvdXRlLl9sb2FkZWRSb3V0ZXMsIGluamVjdG9yOiByb3V0ZS5fbG9hZGVkSW5qZWN0b3J9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vbkxvYWRTdGFydExpc3RlbmVyKSB7XG4gICAgICB0aGlzLm9uTG9hZFN0YXJ0TGlzdGVuZXIocm91dGUpO1xuICAgIH1cbiAgICBjb25zdCBtb2R1bGVGYWN0b3J5T3JSb3V0ZXMkID0gbG9hZENoaWxkcmVuKFxuICAgICAgcm91dGUsXG4gICAgICB0aGlzLmNvbXBpbGVyLFxuICAgICAgcGFyZW50SW5qZWN0b3IsXG4gICAgICB0aGlzLm9uTG9hZEVuZExpc3RlbmVyLFxuICAgICk7XG4gICAgY29uc3QgbG9hZFJ1bm5lciA9IG1vZHVsZUZhY3RvcnlPclJvdXRlcyQucGlwZShcbiAgICAgIGZpbmFsaXplKCgpID0+IHtcbiAgICAgICAgdGhpcy5jaGlsZHJlbkxvYWRlcnMuZGVsZXRlKHJvdXRlKTtcbiAgICAgIH0pLFxuICAgICk7XG4gICAgLy8gVXNlIGN1c3RvbSBDb25uZWN0YWJsZU9ic2VydmFibGUgYXMgc2hhcmUgaW4gcnVubmVycyBwaXBlIGluY3JlYXNpbmcgdGhlIGJ1bmRsZSBzaXplIHRvbyBtdWNoXG4gICAgY29uc3QgbG9hZGVyID0gbmV3IENvbm5lY3RhYmxlT2JzZXJ2YWJsZShcbiAgICAgIGxvYWRSdW5uZXIsXG4gICAgICAoKSA9PiBuZXcgU3ViamVjdDxMb2FkZWRSb3V0ZXJDb25maWc+KCksXG4gICAgKS5waXBlKHJlZkNvdW50KCkpO1xuICAgIHRoaXMuY2hpbGRyZW5Mb2FkZXJzLnNldChyb3V0ZSwgbG9hZGVyKTtcbiAgICByZXR1cm4gbG9hZGVyO1xuICB9XG59XG5cbi8qKlxuICogRXhlY3V0ZXMgYSBgcm91dGUubG9hZENoaWxkcmVuYCBjYWxsYmFjayBhbmQgY29udmVydHMgdGhlIHJlc3VsdCB0byBhbiBhcnJheSBvZiBjaGlsZCByb3V0ZXMgYW5kXG4gKiBhbiBpbmplY3RvciBpZiB0aGF0IGNhbGxiYWNrIHJldHVybmVkIGEgbW9kdWxlLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCBmb3IgdGhlIHJvdXRlIGRpc2NvdmVyeSBkdXJpbmcgcHJlcmVuZGVyaW5nXG4gKiBpbiBAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci4gSWYgdGhlcmUgYXJlIGFueSB1cGRhdGVzIHRvIHRoZSBjb250cmFjdCBoZXJlLCBpdCB3aWxsIHJlcXVpcmVcbiAqIGFuIHVwZGF0ZSB0byB0aGUgZXh0cmFjdG9yLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9hZENoaWxkcmVuKFxuICByb3V0ZTogUm91dGUsXG4gIGNvbXBpbGVyOiBDb21waWxlcixcbiAgcGFyZW50SW5qZWN0b3I6IEluamVjdG9yLFxuICBvbkxvYWRFbmRMaXN0ZW5lcj86IChyOiBSb3V0ZSkgPT4gdm9pZCxcbik6IE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPiB7XG4gIHJldHVybiB3cmFwSW50b09ic2VydmFibGUocm91dGUubG9hZENoaWxkcmVuISgpKS5waXBlKFxuICAgIG1hcChtYXliZVVud3JhcERlZmF1bHRFeHBvcnQpLFxuICAgIG1lcmdlTWFwKCh0KSA9PiB7XG4gICAgICBpZiAodCBpbnN0YW5jZW9mIE5nTW9kdWxlRmFjdG9yeSB8fCBBcnJheS5pc0FycmF5KHQpKSB7XG4gICAgICAgIHJldHVybiBvZih0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmcm9tKGNvbXBpbGVyLmNvbXBpbGVNb2R1bGVBc3luYyh0KSk7XG4gICAgICB9XG4gICAgfSksXG4gICAgbWFwKChmYWN0b3J5T3JSb3V0ZXM6IE5nTW9kdWxlRmFjdG9yeTxhbnk+IHwgUm91dGVzKSA9PiB7XG4gICAgICBpZiAob25Mb2FkRW5kTGlzdGVuZXIpIHtcbiAgICAgICAgb25Mb2FkRW5kTGlzdGVuZXIocm91dGUpO1xuICAgICAgfVxuICAgICAgLy8gVGhpcyBpbmplY3RvciBjb21lcyBmcm9tIHRoZSBgTmdNb2R1bGVSZWZgIHdoZW4gbGF6eSBsb2FkaW5nIGFuIGBOZ01vZHVsZWAuIFRoZXJlIGlzXG4gICAgICAvLyBubyBpbmplY3RvciBhc3NvY2lhdGVkIHdpdGggbGF6eSBsb2FkaW5nIGEgYFJvdXRlYCBhcnJheS5cbiAgICAgIGxldCBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3RvciB8IHVuZGVmaW5lZDtcbiAgICAgIGxldCByYXdSb3V0ZXM6IFJvdXRlW107XG4gICAgICBsZXQgcmVxdWlyZVN0YW5kYWxvbmVDb21wb25lbnRzID0gZmFsc2U7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShmYWN0b3J5T3JSb3V0ZXMpKSB7XG4gICAgICAgIHJhd1JvdXRlcyA9IGZhY3RvcnlPclJvdXRlcztcbiAgICAgICAgcmVxdWlyZVN0YW5kYWxvbmVDb21wb25lbnRzID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGluamVjdG9yID0gZmFjdG9yeU9yUm91dGVzLmNyZWF0ZShwYXJlbnRJbmplY3RvcikuaW5qZWN0b3I7XG4gICAgICAgIC8vIFdoZW4gbG9hZGluZyBhIG1vZHVsZSB0aGF0IGRvZXNuJ3QgcHJvdmlkZSBgUm91dGVyTW9kdWxlLmZvckNoaWxkKClgIHByZWxvYWRlclxuICAgICAgICAvLyB3aWxsIGdldCBzdHVjayBpbiBhbiBpbmZpbml0ZSBsb29wLiBUaGUgY2hpbGQgbW9kdWxlJ3MgSW5qZWN0b3Igd2lsbCBsb29rIHRvXG4gICAgICAgIC8vIGl0cyBwYXJlbnQgYEluamVjdG9yYCB3aGVuIGl0IGRvZXNuJ3QgZmluZCBhbnkgUk9VVEVTIHNvIGl0IHdpbGwgcmV0dXJuIHJvdXRlc1xuICAgICAgICAvLyBmb3IgaXQncyBwYXJlbnQgbW9kdWxlIGluc3RlYWQuXG4gICAgICAgIHJhd1JvdXRlcyA9IGluamVjdG9yLmdldChST1VURVMsIFtdLCB7b3B0aW9uYWw6IHRydWUsIHNlbGY6IHRydWV9KS5mbGF0KCk7XG4gICAgICB9XG4gICAgICBjb25zdCByb3V0ZXMgPSByYXdSb3V0ZXMubWFwKHN0YW5kYXJkaXplQ29uZmlnKTtcbiAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmXG4gICAgICAgIHZhbGlkYXRlQ29uZmlnKHJvdXRlcywgcm91dGUucGF0aCwgcmVxdWlyZVN0YW5kYWxvbmVDb21wb25lbnRzKTtcbiAgICAgIHJldHVybiB7cm91dGVzLCBpbmplY3Rvcn07XG4gICAgfSksXG4gICk7XG59XG5cbmZ1bmN0aW9uIGlzV3JhcHBlZERlZmF1bHRFeHBvcnQ8VD4odmFsdWU6IFQgfCBEZWZhdWx0RXhwb3J0PFQ+KTogdmFsdWUgaXMgRGVmYXVsdEV4cG9ydDxUPiB7XG4gIC8vIFdlIHVzZSBgaW5gIGhlcmUgd2l0aCBhIHN0cmluZyBrZXkgYCdkZWZhdWx0J2AsIGJlY2F1c2Ugd2UgZXhwZWN0IGBEZWZhdWx0RXhwb3J0YCBvYmplY3RzIHRvIGJlXG4gIC8vIGR5bmFtaWNhbGx5IGltcG9ydGVkIEVTIG1vZHVsZXMgd2l0aCBhIHNwZWMtbWFuZGF0ZWQgYGRlZmF1bHRgIGtleS4gVGh1cyB3ZSBkb24ndCBleHBlY3QgdGhhdFxuICAvLyBgZGVmYXVsdGAgd2lsbCBiZSBhIHJlbmFtZWQgcHJvcGVydHkuXG4gIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmICdkZWZhdWx0JyBpbiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gbWF5YmVVbndyYXBEZWZhdWx0RXhwb3J0PFQ+KGlucHV0OiBUIHwgRGVmYXVsdEV4cG9ydDxUPik6IFQge1xuICAvLyBBcyBwZXIgYGlzV3JhcHBlZERlZmF1bHRFeHBvcnRgLCB0aGUgYGRlZmF1bHRgIGtleSBoZXJlIGlzIGdlbmVyYXRlZCBieSB0aGUgYnJvd3NlciBhbmQgbm90XG4gIC8vIHN1YmplY3QgdG8gcHJvcGVydHkgcmVuYW1pbmcsIHNvIHdlIHJlZmVyZW5jZSBpdCB3aXRoIGJyYWNrZXQgYWNjZXNzLlxuICByZXR1cm4gaXNXcmFwcGVkRGVmYXVsdEV4cG9ydChpbnB1dCkgPyBpbnB1dFsnZGVmYXVsdCddIDogaW5wdXQ7XG59XG4iXX0=