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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.2.0-next.1+sha-908baec", ngImport: i0, type: RouterConfigLoader, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.2.0-next.1+sha-908baec", ngImport: i0, type: RouterConfigLoader, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.2.0-next.1+sha-908baec", ngImport: i0, type: RouterConfigLoader, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2NvbmZpZ19sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3JvdXRlcl9jb25maWdfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxRQUFRLEVBQXVCLE1BQU0sRUFBRSxVQUFVLEVBQUUsY0FBYyxFQUFZLGVBQWUsRUFBTyxNQUFNLGVBQWUsQ0FBQztBQUNqSSxPQUFPLEVBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFjLEVBQUUsRUFBRSxPQUFPLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDMUUsT0FBTyxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUd0RSxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUN0RCxPQUFPLEVBQUMsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7O0FBSW5GOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sQ0FBQyxNQUFNLE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBWSxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFLL0UsTUFBTSxPQUFPLGtCQUFrQjtJQUQvQjtRQUVVLHFCQUFnQixHQUFHLElBQUksT0FBTyxFQUEwQixDQUFDO1FBQ3pELG9CQUFlLEdBQUcsSUFBSSxPQUFPLEVBQXlDLENBQUM7UUFHOUQsYUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztLQXlEOUM7SUF2REMsYUFBYSxDQUFDLEtBQVk7UUFDeEIsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDckMsT0FBTyxJQUFJLENB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QUFDLENBQUMsUUFBUSxDQUFDO1lBQzNELGlGQUFpRjtZQUNqRiwrRUFBK0U7WUFDL0UsaUZBQWlGO1lBQ2pGLGtDQUFrQztZQUNsQyxTQUFTLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM1RSxDQUFDO1FBQ0QsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2hELENBQUMsT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLFNBQVMsQ0FBQztZQUMzQyxjQUFjLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztRQUNwRSxPQUFPLEVBQUMsTUFBTSxFQUFFLFFBQVEsRUFBQyxDQUFDO0lBQzVCLENBQUMsQ0FBQyxDQUNMLENBQUM7QUFDUixDQUFDO0FBRUQsU0FBUyxzQkFBc0IsQ0FBSSxLQUF5QjtJQUMxRCxrR0FBa0c7SUFDbEcsZ0dBQWdHO0lBQ2hHLHdDQUF3QztJQUN4QyxPQUFPLEtBQUssSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksU0FBUyxJQUFJLEtBQUssQ0FBQztBQUNsRSxDQUFDO0FBRUQsU0FBUyx3QkFBd0IsQ0FBSSxLQUF5QjtJQUM1RCw4RkFBOEY7SUFDOUYsd0VBQXdFO0lBQ3hFLE9BQU8sc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ2xFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb21waWxlciwgRW52aXJvbm1lbnRJbmplY3RvciwgaW5qZWN0LCBJbmplY3RhYmxlLCBJbmplY3Rpb25Ub2tlbiwgSW5qZWN0b3IsIE5nTW9kdWxlRmFjdG9yeSwgVHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0Nvbm5lY3RhYmxlT2JzZXJ2YWJsZSwgZnJvbSwgT2JzZXJ2YWJsZSwgb2YsIFN1YmplY3R9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtmaW5hbGl6ZSwgbWFwLCBtZXJnZU1hcCwgcmVmQ291bnQsIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0RlZmF1bHRFeHBvcnQsIExvYWRlZFJvdXRlckNvbmZpZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHt3cmFwSW50b09ic2VydmFibGV9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge2Fzc2VydFN0YW5kYWxvbmUsIHN0YW5kYXJkaXplQ29uZmlnLCB2YWxpZGF0ZUNvbmZpZ30gZnJvbSAnLi91dGlscy9jb25maWcnO1xuXG5cblxuLyoqXG4gKiBUaGUgW0RJIHRva2VuXShndWlkZS9nbG9zc2FyeS8jZGktdG9rZW4pIGZvciBhIHJvdXRlciBjb25maWd1cmF0aW9uLlxuICpcbiAqIGBST1VURVNgIGlzIGEgbG93IGxldmVsIEFQSSBmb3Igcm91dGVyIGNvbmZpZ3VyYXRpb24gdmlhIGRlcGVuZGVuY3kgaW5qZWN0aW9uLlxuICpcbiAqIFdlIHJlY29tbWVuZCB0aGF0IGluIGFsbW9zdCBhbGwgY2FzZXMgdG8gdXNlIGhpZ2hlciBsZXZlbCBBUElzIHN1Y2ggYXMgYFJvdXRlck1vZHVsZS5mb3JSb290KClgLFxuICogYHByb3ZpZGVSb3V0ZXJgLCBvciBgUm91dGVyLnJlc2V0Q29uZmlnKClgLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUyA9IG5ldyBJbmplY3Rpb25Ub2tlbjxSb3V0ZVtdW10+KG5nRGV2TW9kZSA/ICdST1VURVMnIDogJycpO1xuXG50eXBlIENvbXBvbmVudExvYWRlciA9IE9ic2VydmFibGU8VHlwZTx1bmtub3duPj47XG5cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCd9KVxuZXhwb3J0IGNsYXNzIFJvdXRlckNvbmZpZ0xvYWRlciB7XG4gIHByaXZhdGUgY29tcG9uZW50TG9hZGVycyA9IG5ldyBXZWFrTWFwPFJvdXRlLCBDb21wb25lbnRMb2FkZXI+KCk7XG4gIHByaXZhdGUgY2hpbGRyZW5Mb2FkZXJzID0gbmV3IFdlYWtNYXA8Um91dGUsIE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPj4oKTtcbiAgb25Mb2FkU3RhcnRMaXN0ZW5lcj86IChyOiBSb3V0ZSkgPT4gdm9pZDtcbiAgb25Mb2FkRW5kTGlzdGVuZXI/OiAocjogUm91dGUpID0+IHZvaWQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgY29tcGlsZXIgPSBpbmplY3QoQ29tcGlsZXIpO1xuXG4gIGxvYWRDb21wb25lbnQocm91dGU6IFJvdXRlKTogT2JzZXJ2YWJsZTxUeXBlPHVua25vd24+PiB7XG4gICAgaWYgKHRoaXMuY29tcG9uZW50TG9hZGVycy5nZXQocm91dGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb21wb25lbnRMb2FkZXJzLmdldChyb3V0ZSkhO1xuICAgIH0gZWxzZSBpZiAocm91dGUuX2xvYWRlZENvbXBvbmVudCkge1xuICAgICAgcmV0dXJuIG9mKHJvdXRlLl9sb2FkZWRDb21wb25lbnQpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9uTG9hZFN0YXJ0TGlzdGVuZXIpIHtcbiAgICAgIHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgfVxuICAgIGNvbnN0IGxvYWRSdW5uZXIgPSB3cmFwSW50b09ic2VydmFibGUocm91dGUubG9hZENvbXBvbmVudCEoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5waXBlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcChtYXliZVVud3JhcERlZmF1bHRFeHBvcnQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcChjb21wb25lbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub25Mb2FkRW5kTGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkxvYWRFbmRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydFN0YW5kYWxvbmUocm91dGUucGF0aCA/PyAnJywgY29tcG9uZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRDb21wb25lbnQgPSBjb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb21wb25lbnRMb2FkZXJzLmRlbGV0ZShyb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgIC8vIFVzZSBjdXN0b20gQ29ubmVjdGFibGVPYnNlcnZhYmxlIGFzIHNoYXJlIGluIHJ1bm5lcnMgcGlwZSBpbmNyZWFzaW5nIHRoZSBidW5kbGUgc2l6ZSB0b28gbXVjaFxuICAgIGNvbnN0IGxvYWRlciA9XG4gICAgICAgIG5ldyBDb25uZWN0YWJsZU9ic2VydmFibGUobG9hZFJ1bm5lciwgKCkgPT4gbmV3IFN1YmplY3Q8VHlwZTx1bmtub3duPj4oKSkucGlwZShyZWZDb3VudCgpKTtcbiAgICB0aGlzLmNvbXBvbmVudExvYWRlcnMuc2V0KHJvdXRlLCBsb2FkZXIpO1xuICAgIHJldHVybiBsb2FkZXI7XG4gIH1cblxuICBsb2FkQ2hpbGRyZW4ocGFyZW50SW5qZWN0b3I6IEluamVjdG9yLCByb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4ge1xuICAgIGlmICh0aGlzLmNoaWxkcmVuTG9hZGVycy5nZXQocm91dGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jaGlsZHJlbkxvYWRlcnMuZ2V0KHJvdXRlKSE7XG4gICAgfSBlbHNlIGlmIChyb3V0ZS5fbG9hZGVkUm91dGVzKSB7XG4gICAgICByZXR1cm4gb2Yoe3JvdXRlczogcm91dGUuX2xvYWRlZFJvdXRlcywgaW5qZWN0b3I6IHJvdXRlLl9sb2FkZWRJbmplY3Rvcn0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9uTG9hZFN0YXJ0TGlzdGVuZXIpIHtcbiAgICAgIHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgfVxuICAgIGNvbnN0IG1vZHVsZUZhY3RvcnlPclJvdXRlcyQgPVxuICAgICAgICBsb2FkQ2hpbGRyZW4ocm91dGUsIHRoaXMuY29tcGlsZXIsIHBhcmVudEluamVjdG9yLCB0aGlzLm9uTG9hZEVuZExpc3RlbmVyKTtcbiAgICBjb25zdCBsb2FkUnVubmVyID0gbW9kdWxlRmFjdG9yeU9yUm91dGVzJC5waXBlKFxuICAgICAgICBmaW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5jaGlsZHJlbkxvYWRlcnMuZGVsZXRlKHJvdXRlKTtcbiAgICAgICAgfSksXG4gICAgKTtcbiAgICAvLyBVc2UgY3VzdG9tIENvbm5lY3RhYmxlT2JzZXJ2YWJsZSBhcyBzaGFyZSBpbiBydW5uZXJzIHBpcGUgaW5jcmVhc2luZyB0aGUgYnVuZGxlIHNpemUgdG9vIG11Y2hcbiAgICBjb25zdCBsb2FkZXIgPSBuZXcgQ29ubmVjdGFibGVPYnNlcnZhYmxlKGxvYWRSdW5uZXIsICgpID0+IG5ldyBTdWJqZWN0PExvYWRlZFJvdXRlckNvbmZpZz4oKSlcbiAgICAgICAgICAgICAgICAgICAgICAgLnBpcGUocmVmQ291bnQoKSk7XG4gICAgdGhpcy5jaGlsZHJlbkxvYWRlcnMuc2V0KHJvdXRlLCBsb2FkZXIpO1xuICAgIHJldHVybiBsb2FkZXI7XG4gIH1cbn1cblxuLyoqXG4gKiBFeGVjdXRlcyBhIGByb3V0ZS5sb2FkQ2hpbGRyZW5gIGNhbGxiYWNrIGFuZCBjb252ZXJ0cyB0aGUgcmVzdWx0IHRvIGFuIGFycmF5IG9mIGNoaWxkIHJvdXRlcyBhbmRcbiAqIGFuIGluamVjdG9yIGlmIHRoYXQgY2FsbGJhY2sgcmV0dXJuZWQgYSBtb2R1bGUuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBpcyB1c2VkIGZvciB0aGUgcm91dGUgZGlzY292ZXJ5IGR1cmluZyBwcmVyZW5kZXJpbmdcbiAqIGluIEBhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyLiBJZiB0aGVyZSBhcmUgYW55IHVwZGF0ZXMgdG8gdGhlIGNvbnRyYWN0IGhlcmUsIGl0IHdpbGwgcmVxdWlyZVxuICogYW4gdXBkYXRlIHRvIHRoZSBleHRyYWN0b3IuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2FkQ2hpbGRyZW4oXG4gICAgcm91dGU6IFJvdXRlLCBjb21waWxlcjogQ29tcGlsZXIsIHBhcmVudEluamVjdG9yOiBJbmplY3RvcixcbiAgICBvbkxvYWRFbmRMaXN0ZW5lcj86IChyOiBSb3V0ZSkgPT4gdm9pZCk6IE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPiB7XG4gIHJldHVybiB3cmFwSW50b09ic2VydmFibGUocm91dGUubG9hZENoaWxkcmVuISgpKVxuICAgICAgLnBpcGUoXG4gICAgICAgICAgbWFwKG1heWJlVW53cmFwRGVmYXVsdEV4cG9ydCksXG4gICAgICAgICAgbWVyZ2VNYXAoKHQpID0+IHtcbiAgICAgICAgICAgIGlmICh0IGluc3RhbmNlb2YgTmdNb2R1bGVGYWN0b3J5IHx8IEFycmF5LmlzQXJyYXkodCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9mKHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZyb20oY29tcGlsZXIuY29tcGlsZU1vZHVsZUFzeW5jKHQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtYXAoKGZhY3RvcnlPclJvdXRlczogTmdNb2R1bGVGYWN0b3J5PGFueT58Um91dGVzKSA9PiB7XG4gICAgICAgICAgICBpZiAob25Mb2FkRW5kTGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgb25Mb2FkRW5kTGlzdGVuZXIocm91dGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVGhpcyBpbmplY3RvciBjb21lcyBmcm9tIHRoZSBgTmdNb2R1bGVSZWZgIHdoZW4gbGF6eSBsb2FkaW5nIGFuIGBOZ01vZHVsZWAuIFRoZXJlIGlzXG4gICAgICAgICAgICAvLyBubyBpbmplY3RvciBhc3NvY2lhdGVkIHdpdGggbGF6eSBsb2FkaW5nIGEgYFJvdXRlYCBhcnJheS5cbiAgICAgICAgICAgIGxldCBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvcnx1bmRlZmluZWQ7XG4gICAgICAgICAgICBsZXQgcmF3Um91dGVzOiBSb3V0ZVtdO1xuICAgICAgICAgICAgbGV0IHJlcXVpcmVTdGFuZGFsb25lQ29tcG9uZW50cyA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZmFjdG9yeU9yUm91dGVzKSkge1xuICAgICAgICAgICAgICByYXdSb3V0ZXMgPSBmYWN0b3J5T3JSb3V0ZXM7XG4gICAgICAgICAgICAgIHJlcXVpcmVTdGFuZGFsb25lQ29tcG9uZW50cyA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpbmplY3RvciA9IGZhY3RvcnlPclJvdXRlcy5jcmVhdGUocGFyZW50SW5qZWN0b3IpLmluamVjdG9yO1xuICAgICAgICAgICAgICAvLyBXaGVuIGxvYWRpbmcgYSBtb2R1bGUgdGhhdCBkb2Vzbid0IHByb3ZpZGUgYFJvdXRlck1vZHVsZS5mb3JDaGlsZCgpYCBwcmVsb2FkZXJcbiAgICAgICAgICAgICAgLy8gd2lsbCBnZXQgc3R1Y2sgaW4gYW4gaW5maW5pdGUgbG9vcC4gVGhlIGNoaWxkIG1vZHVsZSdzIEluamVjdG9yIHdpbGwgbG9vayB0b1xuICAgICAgICAgICAgICAvLyBpdHMgcGFyZW50IGBJbmplY3RvcmAgd2hlbiBpdCBkb2Vzbid0IGZpbmQgYW55IFJPVVRFUyBzbyBpdCB3aWxsIHJldHVybiByb3V0ZXNcbiAgICAgICAgICAgICAgLy8gZm9yIGl0J3MgcGFyZW50IG1vZHVsZSBpbnN0ZWFkLlxuICAgICAgICAgICAgICByYXdSb3V0ZXMgPSBpbmplY3Rvci5nZXQoUk9VVEVTLCBbXSwge29wdGlvbmFsOiB0cnVlLCBzZWxmOiB0cnVlfSkuZmxhdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgcm91dGVzID0gcmF3Um91dGVzLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gICAgICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICAgICAgICAgIHZhbGlkYXRlQ29uZmlnKHJvdXRlcywgcm91dGUucGF0aCwgcmVxdWlyZVN0YW5kYWxvbmVDb21wb25lbnRzKTtcbiAgICAgICAgICAgIHJldHVybiB7cm91dGVzLCBpbmplY3Rvcn07XG4gICAgICAgICAgfSksXG4gICAgICApO1xufVxuXG5mdW5jdGlvbiBpc1dyYXBwZWREZWZhdWx0RXhwb3J0PFQ+KHZhbHVlOiBUfERlZmF1bHRFeHBvcnQ8VD4pOiB2YWx1ZSBpcyBEZWZhdWx0RXhwb3J0PFQ+IHtcbiAgLy8gV2UgdXNlIGBpbmAgaGVyZSB3aXRoIGEgc3RyaW5nIGtleSBgJ2RlZmF1bHQnYCwgYmVjYXVzZSB3ZSBleHBlY3QgYERlZmF1bHRFeHBvcnRgIG9iamVjdHMgdG8gYmVcbiAgLy8gZHluYW1pY2FsbHkgaW1wb3J0ZWQgRVMgbW9kdWxlcyB3aXRoIGEgc3BlYy1tYW5kYXRlZCBgZGVmYXVsdGAga2V5LiBUaHVzIHdlIGRvbid0IGV4cGVjdCB0aGF0XG4gIC8vIGBkZWZhdWx0YCB3aWxsIGJlIGEgcmVuYW1lZCBwcm9wZXJ0eS5cbiAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgJ2RlZmF1bHQnIGluIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBtYXliZVVud3JhcERlZmF1bHRFeHBvcnQ8VD4oaW5wdXQ6IFR8RGVmYXVsdEV4cG9ydDxUPik6IFQge1xuICAvLyBBcyBwZXIgYGlzV3JhcHBlZERlZmF1bHRFeHBvcnRgLCB0aGUgYGRlZmF1bHRgIGtleSBoZXJlIGlzIGdlbmVyYXRlZCBieSB0aGUgYnJvd3NlciBhbmQgbm90XG4gIC8vIHN1YmplY3QgdG8gcHJvcGVydHkgcmVuYW1pbmcsIHNvIHdlIHJlZmVyZW5jZSBpdCB3aXRoIGJyYWNrZXQgYWNjZXNzLlxuICByZXR1cm4gaXNXcmFwcGVkRGVmYXVsdEV4cG9ydChpbnB1dCkgPyBpbnB1dFsnZGVmYXVsdCddIDogaW5wdXQ7XG59XG4iXX0=