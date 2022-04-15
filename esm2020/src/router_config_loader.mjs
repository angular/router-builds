/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { InjectFlags, InjectionToken, NgModuleFactory } from '@angular/core';
import { ConnectableObservable, from, of, Subject } from 'rxjs';
import { catchError, map, mergeMap, refCount } from 'rxjs/operators';
import { LoadedRouterConfig } from './models';
import { flatten, wrapIntoObservable } from './utils/collection';
import { standardizeConfig, validateConfig } from './utils/config';
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
    constructor(injector, compiler, onLoadStartListener, onLoadEndListener) {
        this.injector = injector;
        this.compiler = compiler;
        this.onLoadStartListener = onLoadStartListener;
        this.onLoadEndListener = onLoadEndListener;
    }
    load(parentInjector, route) {
        if (route._loader$) {
            return route._loader$;
        }
        if (this.onLoadStartListener) {
            this.onLoadStartListener(route);
        }
        const moduleFactory$ = this.loadModuleFactory(route.loadChildren);
        const loadRunner = moduleFactory$.pipe(map((factory) => {
            if (this.onLoadEndListener) {
                this.onLoadEndListener(route);
            }
            const module = factory.create(parentInjector);
            const routes = 
            // When loading a module that doesn't provide `RouterModule.forChild()` preloader
            // will get stuck in an infinite loop. The child module's Injector will look to
            // its parent `Injector` when it doesn't find any ROUTES so it will return routes
            // for it's parent module instead.
            flatten(module.injector.get(ROUTES, [], InjectFlags.Self | InjectFlags.Optional))
                .map(standardizeConfig);
            NG_DEV_MODE && validateConfig(routes);
            return new LoadedRouterConfig(routes, module);
        }), catchError((err) => {
            route._loader$ = undefined;
            throw err;
        }));
        // Use custom ConnectableObservable as share in runners pipe increasing the bundle size too much
        route._loader$ = new ConnectableObservable(loadRunner, () => new Subject())
            .pipe(refCount());
        return route._loader$;
    }
    loadModuleFactory(loadChildren) {
        return wrapIntoObservable(loadChildren()).pipe(mergeMap((t) => {
            if (t instanceof NgModuleFactory) {
                return of(t);
            }
            else {
                return from(this.compiler.compileModuleAsync(t));
            }
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2NvbmZpZ19sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3JvdXRlcl9jb25maWdfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBVyxXQUFXLEVBQUUsY0FBYyxFQUFZLGVBQWUsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUMvRixPQUFPLEVBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFjLEVBQUUsRUFBRSxPQUFPLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDMUUsT0FBTyxFQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBTSxNQUFNLGdCQUFnQixDQUFDO0FBRXhFLE9BQU8sRUFBZSxrQkFBa0IsRUFBZ0IsTUFBTSxVQUFVLENBQUM7QUFDekUsT0FBTyxFQUFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQy9ELE9BQU8sRUFBQyxpQkFBaUIsRUFBRSxjQUFjLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUdqRSxNQUFNLFdBQVcsR0FBRyxPQUFPLFNBQVMsS0FBSyxXQUFXLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUVwRTs7Ozs7Ozs7O0dBU0c7QUFDSCxNQUFNLENBQUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxjQUFjLENBQVksUUFBUSxDQUFDLENBQUM7QUFFOUQsTUFBTSxPQUFPLGtCQUFrQjtJQUM3QixZQUNZLFFBQWtCLEVBQVUsUUFBa0IsRUFDOUMsbUJBQXdDLEVBQ3hDLGlCQUFzQztRQUZ0QyxhQUFRLEdBQVIsUUFBUSxDQUFVO1FBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBVTtRQUM5Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ3hDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBcUI7SUFBRyxDQUFDO0lBRXRELElBQUksQ0FBQyxjQUF3QixFQUFFLEtBQVk7UUFDekMsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFO1lBQ2xCLE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQztTQUN2QjtRQUVELElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFO1lBQzVCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNqQztRQUNELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsWUFBYSxDQUFDLENBQUM7UUFDbkUsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FDbEMsR0FBRyxDQUFDLENBQUMsT0FBNkIsRUFBRSxFQUFFO1lBQ3BDLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFO2dCQUMxQixJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDL0I7WUFDRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sTUFBTTtZQUNSLGlGQUFpRjtZQUNqRiwrRUFBK0U7WUFDL0UsaUZBQWlGO1lBQ2pGLGtDQUFrQztZQUNsQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxXQUFXLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDNUUsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDaEMsV0FBVyxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0QyxPQUFPLElBQUksa0JBQWtCLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2hELENBQUMsQ0FBQyxFQUNGLFVBQVUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ2pCLEtBQUssQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO1lBQzNCLE1BQU0sR0FBRyxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQ0wsQ0FBQztRQUNGLGdHQUFnRztRQUNoRyxLQUFLLENBQUMsUUFBUSxHQUFHLElBQUkscUJBQXFCLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksT0FBTyxFQUFzQixDQUFDO2FBQ3pFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZDLE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQztJQUN4QixDQUFDO0lBRU8saUJBQWlCLENBQUMsWUFBMEI7UUFDbEQsT0FBTyxrQkFBa0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRTtZQUNqRSxJQUFJLENBQUMsWUFBWSxlQUFlLEVBQUU7Z0JBQ2hDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2Q7aUJBQU07Z0JBQ0wsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2xEO1FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNOLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbXBpbGVyLCBJbmplY3RGbGFncywgSW5qZWN0aW9uVG9rZW4sIEluamVjdG9yLCBOZ01vZHVsZUZhY3Rvcnl9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtDb25uZWN0YWJsZU9ic2VydmFibGUsIGZyb20sIE9ic2VydmFibGUsIG9mLCBTdWJqZWN0fSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y2F0Y2hFcnJvciwgbWFwLCBtZXJnZU1hcCwgcmVmQ291bnQsIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0xvYWRDaGlsZHJlbiwgTG9hZGVkUm91dGVyQ29uZmlnLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge2ZsYXR0ZW4sIHdyYXBJbnRvT2JzZXJ2YWJsZX0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcbmltcG9ydCB7c3RhbmRhcmRpemVDb25maWcsIHZhbGlkYXRlQ29uZmlnfSBmcm9tICcuL3V0aWxzL2NvbmZpZyc7XG5cblxuY29uc3QgTkdfREVWX01PREUgPSB0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCAhIW5nRGV2TW9kZTtcblxuLyoqXG4gKiBUaGUgW0RJIHRva2VuXShndWlkZS9nbG9zc2FyeS8jZGktdG9rZW4pIGZvciBhIHJvdXRlciBjb25maWd1cmF0aW9uLlxuICpcbiAqIGBST1VURVNgIGlzIGEgbG93IGxldmVsIEFQSSBmb3Igcm91dGVyIGNvbmZpZ3VyYXRpb24gdmlhIGRlcGVuZGVuY3kgaW5qZWN0aW9uLlxuICpcbiAqIFdlIHJlY29tbWVuZCB0aGF0IGluIGFsbW9zdCBhbGwgY2FzZXMgdG8gdXNlIGhpZ2hlciBsZXZlbCBBUElzIHN1Y2ggYXMgYFJvdXRlck1vZHVsZS5mb3JSb290KClgLFxuICogYFJvdXRlck1vZHVsZS5mb3JDaGlsZCgpYCwgYHByb3ZpZGVSb3V0ZXNgLCBvciBgUm91dGVyLnJlc2V0Q29uZmlnKClgLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUyA9IG5ldyBJbmplY3Rpb25Ub2tlbjxSb3V0ZVtdW10+KCdST1VURVMnKTtcblxuZXhwb3J0IGNsYXNzIFJvdXRlckNvbmZpZ0xvYWRlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBpbmplY3RvcjogSW5qZWN0b3IsIHByaXZhdGUgY29tcGlsZXI6IENvbXBpbGVyLFxuICAgICAgcHJpdmF0ZSBvbkxvYWRTdGFydExpc3RlbmVyPzogKHI6IFJvdXRlKSA9PiB2b2lkLFxuICAgICAgcHJpdmF0ZSBvbkxvYWRFbmRMaXN0ZW5lcj86IChyOiBSb3V0ZSkgPT4gdm9pZCkge31cblxuICBsb2FkKHBhcmVudEluamVjdG9yOiBJbmplY3Rvciwgcm91dGU6IFJvdXRlKTogT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWc+IHtcbiAgICBpZiAocm91dGUuX2xvYWRlciQpIHtcbiAgICAgIHJldHVybiByb3V0ZS5fbG9hZGVyJDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vbkxvYWRTdGFydExpc3RlbmVyKSB7XG4gICAgICB0aGlzLm9uTG9hZFN0YXJ0TGlzdGVuZXIocm91dGUpO1xuICAgIH1cbiAgICBjb25zdCBtb2R1bGVGYWN0b3J5JCA9IHRoaXMubG9hZE1vZHVsZUZhY3Rvcnkocm91dGUubG9hZENoaWxkcmVuISk7XG4gICAgY29uc3QgbG9hZFJ1bm5lciA9IG1vZHVsZUZhY3RvcnkkLnBpcGUoXG4gICAgICAgIG1hcCgoZmFjdG9yeTogTmdNb2R1bGVGYWN0b3J5PGFueT4pID0+IHtcbiAgICAgICAgICBpZiAodGhpcy5vbkxvYWRFbmRMaXN0ZW5lcikge1xuICAgICAgICAgICAgdGhpcy5vbkxvYWRFbmRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG1vZHVsZSA9IGZhY3RvcnkuY3JlYXRlKHBhcmVudEluamVjdG9yKTtcbiAgICAgICAgICBjb25zdCByb3V0ZXMgPVxuICAgICAgICAgICAgICAvLyBXaGVuIGxvYWRpbmcgYSBtb2R1bGUgdGhhdCBkb2Vzbid0IHByb3ZpZGUgYFJvdXRlck1vZHVsZS5mb3JDaGlsZCgpYCBwcmVsb2FkZXJcbiAgICAgICAgICAgICAgLy8gd2lsbCBnZXQgc3R1Y2sgaW4gYW4gaW5maW5pdGUgbG9vcC4gVGhlIGNoaWxkIG1vZHVsZSdzIEluamVjdG9yIHdpbGwgbG9vayB0b1xuICAgICAgICAgICAgICAvLyBpdHMgcGFyZW50IGBJbmplY3RvcmAgd2hlbiBpdCBkb2Vzbid0IGZpbmQgYW55IFJPVVRFUyBzbyBpdCB3aWxsIHJldHVybiByb3V0ZXNcbiAgICAgICAgICAgICAgLy8gZm9yIGl0J3MgcGFyZW50IG1vZHVsZSBpbnN0ZWFkLlxuICAgICAgICAgICAgICBmbGF0dGVuKG1vZHVsZS5pbmplY3Rvci5nZXQoUk9VVEVTLCBbXSwgSW5qZWN0RmxhZ3MuU2VsZiB8IEluamVjdEZsYWdzLk9wdGlvbmFsKSlcbiAgICAgICAgICAgICAgICAgIC5tYXAoc3RhbmRhcmRpemVDb25maWcpO1xuICAgICAgICAgIE5HX0RFVl9NT0RFICYmIHZhbGlkYXRlQ29uZmlnKHJvdXRlcyk7XG4gICAgICAgICAgcmV0dXJuIG5ldyBMb2FkZWRSb3V0ZXJDb25maWcocm91dGVzLCBtb2R1bGUpO1xuICAgICAgICB9KSxcbiAgICAgICAgY2F0Y2hFcnJvcigoZXJyKSA9PiB7XG4gICAgICAgICAgcm91dGUuX2xvYWRlciQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9KSxcbiAgICApO1xuICAgIC8vIFVzZSBjdXN0b20gQ29ubmVjdGFibGVPYnNlcnZhYmxlIGFzIHNoYXJlIGluIHJ1bm5lcnMgcGlwZSBpbmNyZWFzaW5nIHRoZSBidW5kbGUgc2l6ZSB0b28gbXVjaFxuICAgIHJvdXRlLl9sb2FkZXIkID0gbmV3IENvbm5lY3RhYmxlT2JzZXJ2YWJsZShsb2FkUnVubmVyLCAoKSA9PiBuZXcgU3ViamVjdDxMb2FkZWRSb3V0ZXJDb25maWc+KCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgLnBpcGUocmVmQ291bnQoKSk7XG4gICAgcmV0dXJuIHJvdXRlLl9sb2FkZXIkO1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkTW9kdWxlRmFjdG9yeShsb2FkQ2hpbGRyZW46IExvYWRDaGlsZHJlbik6IE9ic2VydmFibGU8TmdNb2R1bGVGYWN0b3J5PGFueT4+IHtcbiAgICByZXR1cm4gd3JhcEludG9PYnNlcnZhYmxlKGxvYWRDaGlsZHJlbigpKS5waXBlKG1lcmdlTWFwKCh0OiBhbnkpID0+IHtcbiAgICAgIGlmICh0IGluc3RhbmNlb2YgTmdNb2R1bGVGYWN0b3J5KSB7XG4gICAgICAgIHJldHVybiBvZih0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmcm9tKHRoaXMuY29tcGlsZXIuY29tcGlsZU1vZHVsZUFzeW5jKHQpKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH1cbn1cbiJdfQ==