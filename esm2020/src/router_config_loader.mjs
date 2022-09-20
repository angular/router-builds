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
 * `RouterModule.forChild()`, `provideRoutes`, or `Router.resetConfig()`.
 *
 * @publicApi
 */
export const ROUTES = new InjectionToken('ROUTES');
export class RouterConfigLoader {
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
            .pipe(tap(component => {
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
        return wrapIntoObservable(loadChildren()).pipe(mergeMap((t) => {
            if (t instanceof NgModuleFactory || Array.isArray(t)) {
                return of(t);
            }
            else {
                return from(this.compiler.compileModuleAsync(t));
            }
        }));
    }
}
RouterConfigLoader.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.0.0-next.2+sha-d11b1d9", ngImport: i0, type: RouterConfigLoader, deps: [{ token: i0.Injector }, { token: i0.Compiler }], target: i0.ɵɵFactoryTarget.Injectable });
RouterConfigLoader.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.0.0-next.2+sha-d11b1d9", ngImport: i0, type: RouterConfigLoader, providedIn: 'root' });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.0.0-next.2+sha-d11b1d9", ngImport: i0, type: RouterConfigLoader, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: function () { return [{ type: i0.Injector }, { type: i0.Compiler }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2NvbmZpZ19sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3JvdXRlcl9jb25maWdfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxRQUFRLEVBQXVCLFVBQVUsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQU8sTUFBTSxlQUFlLENBQUM7QUFDdEksT0FBTyxFQUFDLHFCQUFxQixFQUFFLElBQUksRUFBYyxFQUFFLEVBQUUsT0FBTyxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQzFFLE9BQU8sRUFBYSxRQUFRLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFHbEYsT0FBTyxFQUFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQy9ELE9BQU8sRUFBQyxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQzs7QUFHbkYsTUFBTSxXQUFXLEdBQUcsT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFFcEU7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFHLElBQUksY0FBYyxDQUFZLFFBQVEsQ0FBQyxDQUFDO0FBSzlELE1BQU0sT0FBTyxrQkFBa0I7SUFNN0IsWUFDWSxRQUFrQixFQUNsQixRQUFrQjtRQURsQixhQUFRLEdBQVIsUUFBUSxDQUFVO1FBQ2xCLGFBQVEsR0FBUixRQUFRLENBQVU7UUFQdEIscUJBQWdCLEdBQUcsSUFBSSxPQUFPLEVBQTBCLENBQUM7UUFDekQsb0JBQWUsR0FBRyxJQUFJLE9BQU8sRUFBeUMsQ0FBQztJQU81RSxDQUFDO0lBRUosYUFBYSxDQUFDLEtB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aUJBQU07Z0JBQ0wsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2xEO1FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNOLENBQUM7OzBIQWpHVSxrQkFBa0I7OEhBQWxCLGtCQUFrQixjQUROLE1BQU07c0dBQ2xCLGtCQUFrQjtrQkFEOUIsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb21waWxlciwgRW52aXJvbm1lbnRJbmplY3RvciwgSW5qZWN0YWJsZSwgSW5qZWN0RmxhZ3MsIEluamVjdGlvblRva2VuLCBJbmplY3RvciwgTmdNb2R1bGVGYWN0b3J5LCBUeXBlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Q29ubmVjdGFibGVPYnNlcnZhYmxlLCBmcm9tLCBPYnNlcnZhYmxlLCBvZiwgU3ViamVjdH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NhdGNoRXJyb3IsIGZpbmFsaXplLCBtYXAsIG1lcmdlTWFwLCByZWZDb3VudCwgdGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7TG9hZENoaWxkcmVuLCBMb2FkZWRSb3V0ZXJDb25maWcsIFJvdXRlLCBSb3V0ZXN9IGZyb20gJy4vbW9kZWxzJztcbmltcG9ydCB7ZmxhdHRlbiwgd3JhcEludG9PYnNlcnZhYmxlfSBmcm9tICcuL3V0aWxzL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHthc3NlcnRTdGFuZGFsb25lLCBzdGFuZGFyZGl6ZUNvbmZpZywgdmFsaWRhdGVDb25maWd9IGZyb20gJy4vdXRpbHMvY29uZmlnJztcblxuXG5jb25zdCBOR19ERVZfTU9ERSA9IHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8ICEhbmdEZXZNb2RlO1xuXG4vKipcbiAqIFRoZSBbREkgdG9rZW5dKGd1aWRlL2dsb3NzYXJ5LyNkaS10b2tlbikgZm9yIGEgcm91dGVyIGNvbmZpZ3VyYXRpb24uXG4gKlxuICogYFJPVVRFU2AgaXMgYSBsb3cgbGV2ZWwgQVBJIGZvciByb3V0ZXIgY29uZmlndXJhdGlvbiB2aWEgZGVwZW5kZW5jeSBpbmplY3Rpb24uXG4gKlxuICogV2UgcmVjb21tZW5kIHRoYXQgaW4gYWxtb3N0IGFsbCBjYXNlcyB0byB1c2UgaGlnaGVyIGxldmVsIEFQSXMgc3VjaCBhcyBgUm91dGVyTW9kdWxlLmZvclJvb3QoKWAsXG4gKiBgUm91dGVyTW9kdWxlLmZvckNoaWxkKClgLCBgcHJvdmlkZVJvdXRlc2AsIG9yIGBSb3V0ZXIucmVzZXRDb25maWcoKWAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY29uc3QgUk9VVEVTID0gbmV3IEluamVjdGlvblRva2VuPFJvdXRlW11bXT4oJ1JPVVRFUycpO1xuXG50eXBlIENvbXBvbmVudExvYWRlciA9IE9ic2VydmFibGU8VHlwZTx1bmtub3duPj47XG5cbkBJbmplY3RhYmxlKHtwcm92aWRlZEluOiAncm9vdCd9KVxuZXhwb3J0IGNsYXNzIFJvdXRlckNvbmZpZ0xvYWRlciB7XG4gIHByaXZhdGUgY29tcG9uZW50TG9hZGVycyA9IG5ldyBXZWFrTWFwPFJvdXRlLCBDb21wb25lbnRMb2FkZXI+KCk7XG4gIHByaXZhdGUgY2hpbGRyZW5Mb2FkZXJzID0gbmV3IFdlYWtNYXA8Um91dGUsIE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPj4oKTtcbiAgb25Mb2FkU3RhcnRMaXN0ZW5lcj86IChyOiBSb3V0ZSkgPT4gdm9pZDtcbiAgb25Mb2FkRW5kTGlzdGVuZXI/OiAocjogUm91dGUpID0+IHZvaWQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGluamVjdG9yOiBJbmplY3RvcixcbiAgICAgIHByaXZhdGUgY29tcGlsZXI6IENvbXBpbGVyLFxuICApIHt9XG5cbiAgbG9hZENvbXBvbmVudChyb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPFR5cGU8dW5rbm93bj4+IHtcbiAgICBpZiAodGhpcy5jb21wb25lbnRMb2FkZXJzLmdldChyb3V0ZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvbXBvbmVudExvYWRlcnMuZ2V0KHJvdXRlKSE7XG4gICAgfSBlbHNlIGlmIChyb3V0ZS5fbG9hZGVkQ29tcG9uZW50KSB7XG4gICAgICByZXR1cm4gb2Yocm91dGUuX2xvYWRlZENvbXBvbmVudCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcikge1xuICAgICAgdGhpcy5vbkxvYWRTdGFydExpc3RlbmVyKHJvdXRlKTtcbiAgICB9XG4gICAgY29uc3QgbG9hZFJ1bm5lciA9IHdyYXBJbnRvT2JzZXJ2YWJsZShyb3V0ZS5sb2FkQ29tcG9uZW50ISgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFwKGNvbXBvbmVudCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vbkxvYWRFbmRMaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uTG9hZEVuZExpc3RlbmVyKHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE5HX0RFVl9NT0RFICYmIGFzc2VydFN0YW5kYWxvbmUocm91dGUucGF0aCA/PyAnJywgY29tcG9uZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRDb21wb25lbnQgPSBjb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb21wb25lbnRMb2FkZXJzLmRlbGV0ZShyb3V0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgIC8vIFVzZSBjdXN0b20gQ29ubmVjdGFibGVPYnNlcnZhYmxlIGFzIHNoYXJlIGluIHJ1bm5lcnMgcGlwZSBpbmNyZWFzaW5nIHRoZSBidW5kbGUgc2l6ZSB0b28gbXVjaFxuICAgIGNvbnN0IGxvYWRlciA9XG4gICAgICAgIG5ldyBDb25uZWN0YWJsZU9ic2VydmFibGUobG9hZFJ1bm5lciwgKCkgPT4gbmV3IFN1YmplY3Q8VHlwZTx1bmtub3duPj4oKSkucGlwZShyZWZDb3VudCgpKTtcbiAgICB0aGlzLmNvbXBvbmVudExvYWRlcnMuc2V0KHJvdXRlLCBsb2FkZXIpO1xuICAgIHJldHVybiBsb2FkZXI7XG4gIH1cblxuICBsb2FkQ2hpbGRyZW4ocGFyZW50SW5qZWN0b3I6IEluamVjdG9yLCByb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4ge1xuICAgIGlmICh0aGlzLmNoaWxkcmVuTG9hZGVycy5nZXQocm91dGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jaGlsZHJlbkxvYWRlcnMuZ2V0KHJvdXRlKSE7XG4gICAgfSBlbHNlIGlmIChyb3V0ZS5fbG9hZGVkUm91dGVzKSB7XG4gICAgICByZXR1cm4gb2Yoe3JvdXRlczogcm91dGUuX2xvYWRlZFJvdXRlcywgaW5qZWN0b3I6IHJvdXRlLl9sb2FkZWRJbmplY3Rvcn0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9uTG9hZFN0YXJ0TGlzdGVuZXIpIHtcbiAgICAgIHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgfVxuICAgIGNvbnN0IG1vZHVsZUZhY3RvcnlPclJvdXRlcyQgPSB0aGlzLmxvYWRNb2R1bGVGYWN0b3J5T3JSb3V0ZXMocm91dGUubG9hZENoaWxkcmVuISk7XG4gICAgY29uc3QgbG9hZFJ1bm5lciA9IG1vZHVsZUZhY3RvcnlPclJvdXRlcyQucGlwZShcbiAgICAgICAgbWFwKChmYWN0b3J5T3JSb3V0ZXM6IE5nTW9kdWxlRmFjdG9yeTxhbnk+fFJvdXRlcykgPT4ge1xuICAgICAgICAgIGlmICh0aGlzLm9uTG9hZEVuZExpc3RlbmVyKSB7XG4gICAgICAgICAgICB0aGlzLm9uTG9hZEVuZExpc3RlbmVyKHJvdXRlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gVGhpcyBpbmplY3RvciBjb21lcyBmcm9tIHRoZSBgTmdNb2R1bGVSZWZgIHdoZW4gbGF6eSBsb2FkaW5nIGFuIGBOZ01vZHVsZWAuIFRoZXJlIGlzIG5vXG4gICAgICAgICAgLy8gaW5qZWN0b3IgYXNzb2NpYXRlZCB3aXRoIGxhenkgbG9hZGluZyBhIGBSb3V0ZWAgYXJyYXkuXG4gICAgICAgICAgbGV0IGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yfHVuZGVmaW5lZDtcbiAgICAgICAgICBsZXQgcmF3Um91dGVzOiBSb3V0ZVtdO1xuICAgICAgICAgIGxldCByZXF1aXJlU3RhbmRhbG9uZUNvbXBvbmVudHMgPSBmYWxzZTtcbiAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShmYWN0b3J5T3JSb3V0ZXMpKSB7XG4gICAgICAgICAgICByYXdSb3V0ZXMgPSBmYWN0b3J5T3JSb3V0ZXM7XG4gICAgICAgICAgICByZXF1aXJlU3RhbmRhbG9uZUNvbXBvbmVudHMgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbmplY3RvciA9IGZhY3RvcnlPclJvdXRlcy5jcmVhdGUocGFyZW50SW5qZWN0b3IpLmluamVjdG9yO1xuICAgICAgICAgICAgLy8gV2hlbiBsb2FkaW5nIGEgbW9kdWxlIHRoYXQgZG9lc24ndCBwcm92aWRlIGBSb3V0ZXJNb2R1bGUuZm9yQ2hpbGQoKWAgcHJlbG9hZGVyXG4gICAgICAgICAgICAvLyB3aWxsIGdldCBzdHVjayBpbiBhbiBpbmZpbml0ZSBsb29wLiBUaGUgY2hpbGQgbW9kdWxlJ3MgSW5qZWN0b3Igd2lsbCBsb29rIHRvXG4gICAgICAgICAgICAvLyBpdHMgcGFyZW50IGBJbmplY3RvcmAgd2hlbiBpdCBkb2Vzbid0IGZpbmQgYW55IFJPVVRFUyBzbyBpdCB3aWxsIHJldHVybiByb3V0ZXNcbiAgICAgICAgICAgIC8vIGZvciBpdCdzIHBhcmVudCBtb2R1bGUgaW5zdGVhZC5cbiAgICAgICAgICAgIHJhd1JvdXRlcyA9IGZsYXR0ZW4oaW5qZWN0b3IuZ2V0KFJPVVRFUywgW10sIEluamVjdEZsYWdzLlNlbGYgfCBJbmplY3RGbGFncy5PcHRpb25hbCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCByb3V0ZXMgPSByYXdSb3V0ZXMubWFwKHN0YW5kYXJkaXplQ29uZmlnKTtcbiAgICAgICAgICBOR19ERVZfTU9ERSAmJiB2YWxpZGF0ZUNvbmZpZyhyb3V0ZXMsIHJvdXRlLnBhdGgsIHJlcXVpcmVTdGFuZGFsb25lQ29tcG9uZW50cyk7XG4gICAgICAgICAgcmV0dXJuIHtyb3V0ZXMsIGluamVjdG9yfTtcbiAgICAgICAgfSksXG4gICAgICAgIGZpbmFsaXplKCgpID0+IHtcbiAgICAgICAgICB0aGlzLmNoaWxkcmVuTG9hZGVycy5kZWxldGUocm91dGUpO1xuICAgICAgICB9KSxcbiAgICApO1xuICAgIC8vIFVzZSBjdXN0b20gQ29ubmVjdGFibGVPYnNlcnZhYmxlIGFzIHNoYXJlIGluIHJ1bm5lcnMgcGlwZSBpbmNyZWFzaW5nIHRoZSBidW5kbGUgc2l6ZSB0b28gbXVjaFxuICAgIGNvbnN0IGxvYWRlciA9IG5ldyBDb25uZWN0YWJsZU9ic2VydmFibGUobG9hZFJ1bm5lciwgKCkgPT4gbmV3IFN1YmplY3Q8TG9hZGVkUm91dGVyQ29uZmlnPigpKVxuICAgICAgICAgICAgICAgICAgICAgICAucGlwZShyZWZDb3VudCgpKTtcbiAgICB0aGlzLmNoaWxkcmVuTG9hZGVycy5zZXQocm91dGUsIGxvYWRlcik7XG4gICAgcmV0dXJuIGxvYWRlcjtcbiAgfVxuXG4gIHByaXZhdGUgbG9hZE1vZHVsZUZhY3RvcnlPclJvdXRlcyhsb2FkQ2hpbGRyZW46IExvYWRDaGlsZHJlbik6XG4gICAgICBPYnNlcnZhYmxlPE5nTW9kdWxlRmFjdG9yeTxhbnk+fFJvdXRlcz4ge1xuICAgIHJldHVybiB3cmFwSW50b09ic2VydmFibGUobG9hZENoaWxkcmVuKCkpLnBpcGUobWVyZ2VNYXAoKHQpID0+IHtcbiAgICAgIGlmICh0IGluc3RhbmNlb2YgTmdNb2R1bGVGYWN0b3J5IHx8IEFycmF5LmlzQXJyYXkodCkpIHtcbiAgICAgICAgcmV0dXJuIG9mKHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZyb20odGhpcy5jb21waWxlci5jb21waWxlTW9kdWxlQXN5bmModCkpO1xuICAgICAgfVxuICAgIH0pKTtcbiAgfVxufVxuIl19