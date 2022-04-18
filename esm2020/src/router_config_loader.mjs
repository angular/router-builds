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
            const injector = factory.create(parentInjector).injector;
            const routes = 
            // When loading a module that doesn't provide `RouterModule.forChild()` preloader
            // will get stuck in an infinite loop. The child module's Injector will look to
            // its parent `Injector` when it doesn't find any ROUTES so it will return routes
            // for it's parent module instead.
            flatten(injector.get(ROUTES, [], InjectFlags.Self | InjectFlags.Optional))
                .map(standardizeConfig);
            NG_DEV_MODE && validateConfig(routes);
            return { routes, injector };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2NvbmZpZ19sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3JvdXRlcl9jb25maWdfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBVyxXQUFXLEVBQUUsY0FBYyxFQUFZLGVBQWUsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUMvRixPQUFPLEVBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFjLEVBQUUsRUFBRSxPQUFPLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDMUUsT0FBTyxFQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBTSxNQUFNLGdCQUFnQixDQUFDO0FBR3hFLE9BQU8sRUFBQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUMvRCxPQUFPLEVBQUMsaUJBQWlCLEVBQUUsY0FBYyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFHakUsTUFBTSxXQUFXLEdBQUcsT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFFcEU7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFHLElBQUksY0FBYyxDQUFZLFFBQVEsQ0FBQyxDQUFDO0FBRTlELE1BQU0sT0FBTyxrQkFBa0I7SUFDN0IsWUFDWSxRQUFrQixFQUFVLFFBQWtCLEVBQzlDLG1CQUF3QyxFQUN4QyxpQkFBc0M7UUFGdEMsYUFBUSxHQUFSLFFBQVEsQ0FBVTtRQUFVLGFBQVEsR0FBUixRQUFRLENBQVU7UUFDOUMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUN4QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQXFCO0lBQUcsQ0FBQztJQUV0RCxJQUFJLENBQUMsY0FBd0IsRUFBRSxLQUFZO1FBQ3pDLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRTtZQUNsQixPQUFPLEtBQUssQ0FBQyxRQUFRLENBQUM7U0FDdkI7UUFFRCxJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtZQUM1QixJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDakM7UUFDRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFlBQWEsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQ2xDLEdBQUcsQ0FBQyxDQUFDLE9BQTZCLEVBQUUsRUFBRTtZQUNwQyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtnQkFDMUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQy9CO1lBQ0QsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFDekQsTUFBTSxNQUFNO1lBQ1IsaUZBQWlGO1lBQ2pGLCtFQUErRTtZQUMvRSxpRkFBaUY7WUFDakYsa0NBQWtDO1lBQ2xDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsV0FBVyxDQUFDLElBQUksR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQ3JFLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ2hDLFdBQVcsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdEMsT0FBTyxFQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUMsQ0FBQztRQUM1QixDQUFDLENBQUMsRUFDRixVQUFVLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNqQixLQUFLLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQztZQUMzQixNQUFNLEdBQUcsQ0FBQztRQUNaLENBQUMsQ0FBQyxDQUNMLENBQUM7UUFDRixnR0FBZ0c7UUFDaEcsS0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLE9BQU8sRUFBc0IsQ0FBQzthQUN6RSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUN2QyxPQUFPLEtBQUssQ0FBQyxRQUFRLENBQUM7SUFDeEIsQ0FBQztJQUVPLGlCQUFpQixDQUFDLFlBQTBCO1FBQ2xELE9BQU8sa0JBQWtCLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUU7WUFDakUsSUFBSSxDQUFDLFlBQVksZUFBZSxFQUFFO2dCQUNoQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNkO2lCQUFNO2dCQUNMLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNsRDtRQUNILENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTixDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb21waWxlciwgSW5qZWN0RmxhZ3MsIEluamVjdGlvblRva2VuLCBJbmplY3RvciwgTmdNb2R1bGVGYWN0b3J5fSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Q29ubmVjdGFibGVPYnNlcnZhYmxlLCBmcm9tLCBPYnNlcnZhYmxlLCBvZiwgU3ViamVjdH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NhdGNoRXJyb3IsIG1hcCwgbWVyZ2VNYXAsIHJlZkNvdW50LCB0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtMb2FkQ2hpbGRyZW4sIExvYWRlZFJvdXRlckNvbmZpZywgUm91dGUsIFJvdXRlc30gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtmbGF0dGVuLCB3cmFwSW50b09ic2VydmFibGV9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge3N0YW5kYXJkaXplQ29uZmlnLCB2YWxpZGF0ZUNvbmZpZ30gZnJvbSAnLi91dGlscy9jb25maWcnO1xuXG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgISFuZ0Rldk1vZGU7XG5cbi8qKlxuICogVGhlIFtESSB0b2tlbl0oZ3VpZGUvZ2xvc3NhcnkvI2RpLXRva2VuKSBmb3IgYSByb3V0ZXIgY29uZmlndXJhdGlvbi5cbiAqXG4gKiBgUk9VVEVTYCBpcyBhIGxvdyBsZXZlbCBBUEkgZm9yIHJvdXRlciBjb25maWd1cmF0aW9uIHZpYSBkZXBlbmRlbmN5IGluamVjdGlvbi5cbiAqXG4gKiBXZSByZWNvbW1lbmQgdGhhdCBpbiBhbG1vc3QgYWxsIGNhc2VzIHRvIHVzZSBoaWdoZXIgbGV2ZWwgQVBJcyBzdWNoIGFzIGBSb3V0ZXJNb2R1bGUuZm9yUm9vdCgpYCxcbiAqIGBSb3V0ZXJNb2R1bGUuZm9yQ2hpbGQoKWAsIGBwcm92aWRlUm91dGVzYCwgb3IgYFJvdXRlci5yZXNldENvbmZpZygpYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjb25zdCBST1VURVMgPSBuZXcgSW5qZWN0aW9uVG9rZW48Um91dGVbXVtdPignUk9VVEVTJyk7XG5cbmV4cG9ydCBjbGFzcyBSb3V0ZXJDb25maWdMb2FkZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaW5qZWN0b3I6IEluamVjdG9yLCBwcml2YXRlIGNvbXBpbGVyOiBDb21waWxlcixcbiAgICAgIHByaXZhdGUgb25Mb2FkU3RhcnRMaXN0ZW5lcj86IChyOiBSb3V0ZSkgPT4gdm9pZCxcbiAgICAgIHByaXZhdGUgb25Mb2FkRW5kTGlzdGVuZXI/OiAocjogUm91dGUpID0+IHZvaWQpIHt9XG5cbiAgbG9hZChwYXJlbnRJbmplY3RvcjogSW5qZWN0b3IsIHJvdXRlOiBSb3V0ZSk6IE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPiB7XG4gICAgaWYgKHJvdXRlLl9sb2FkZXIkKSB7XG4gICAgICByZXR1cm4gcm91dGUuX2xvYWRlciQ7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcikge1xuICAgICAgdGhpcy5vbkxvYWRTdGFydExpc3RlbmVyKHJvdXRlKTtcbiAgICB9XG4gICAgY29uc3QgbW9kdWxlRmFjdG9yeSQgPSB0aGlzLmxvYWRNb2R1bGVGYWN0b3J5KHJvdXRlLmxvYWRDaGlsZHJlbiEpO1xuICAgIGNvbnN0IGxvYWRSdW5uZXIgPSBtb2R1bGVGYWN0b3J5JC5waXBlKFxuICAgICAgICBtYXAoKGZhY3Rvcnk6IE5nTW9kdWxlRmFjdG9yeTxhbnk+KSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMub25Mb2FkRW5kTGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHRoaXMub25Mb2FkRW5kTGlzdGVuZXIocm91dGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBpbmplY3RvciA9IGZhY3RvcnkuY3JlYXRlKHBhcmVudEluamVjdG9yKS5pbmplY3RvcjtcbiAgICAgICAgICBjb25zdCByb3V0ZXMgPVxuICAgICAgICAgICAgICAvLyBXaGVuIGxvYWRpbmcgYSBtb2R1bGUgdGhhdCBkb2Vzbid0IHByb3ZpZGUgYFJvdXRlck1vZHVsZS5mb3JDaGlsZCgpYCBwcmVsb2FkZXJcbiAgICAgICAgICAgICAgLy8gd2lsbCBnZXQgc3R1Y2sgaW4gYW4gaW5maW5pdGUgbG9vcC4gVGhlIGNoaWxkIG1vZHVsZSdzIEluamVjdG9yIHdpbGwgbG9vayB0b1xuICAgICAgICAgICAgICAvLyBpdHMgcGFyZW50IGBJbmplY3RvcmAgd2hlbiBpdCBkb2Vzbid0IGZpbmQgYW55IFJPVVRFUyBzbyBpdCB3aWxsIHJldHVybiByb3V0ZXNcbiAgICAgICAgICAgICAgLy8gZm9yIGl0J3MgcGFyZW50IG1vZHVsZSBpbnN0ZWFkLlxuICAgICAgICAgICAgICBmbGF0dGVuKGluamVjdG9yLmdldChST1VURVMsIFtdLCBJbmplY3RGbGFncy5TZWxmIHwgSW5qZWN0RmxhZ3MuT3B0aW9uYWwpKVxuICAgICAgICAgICAgICAgICAgLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gICAgICAgICAgTkdfREVWX01PREUgJiYgdmFsaWRhdGVDb25maWcocm91dGVzKTtcbiAgICAgICAgICByZXR1cm4ge3JvdXRlcywgaW5qZWN0b3J9O1xuICAgICAgICB9KSxcbiAgICAgICAgY2F0Y2hFcnJvcigoZXJyKSA9PiB7XG4gICAgICAgICAgcm91dGUuX2xvYWRlciQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9KSxcbiAgICApO1xuICAgIC8vIFVzZSBjdXN0b20gQ29ubmVjdGFibGVPYnNlcnZhYmxlIGFzIHNoYXJlIGluIHJ1bm5lcnMgcGlwZSBpbmNyZWFzaW5nIHRoZSBidW5kbGUgc2l6ZSB0b28gbXVjaFxuICAgIHJvdXRlLl9sb2FkZXIkID0gbmV3IENvbm5lY3RhYmxlT2JzZXJ2YWJsZShsb2FkUnVubmVyLCAoKSA9PiBuZXcgU3ViamVjdDxMb2FkZWRSb3V0ZXJDb25maWc+KCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgLnBpcGUocmVmQ291bnQoKSk7XG4gICAgcmV0dXJuIHJvdXRlLl9sb2FkZXIkO1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkTW9kdWxlRmFjdG9yeShsb2FkQ2hpbGRyZW46IExvYWRDaGlsZHJlbik6IE9ic2VydmFibGU8TmdNb2R1bGVGYWN0b3J5PGFueT4+IHtcbiAgICByZXR1cm4gd3JhcEludG9PYnNlcnZhYmxlKGxvYWRDaGlsZHJlbigpKS5waXBlKG1lcmdlTWFwKCh0OiBhbnkpID0+IHtcbiAgICAgIGlmICh0IGluc3RhbmNlb2YgTmdNb2R1bGVGYWN0b3J5KSB7XG4gICAgICAgIHJldHVybiBvZih0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmcm9tKHRoaXMuY29tcGlsZXIuY29tcGlsZU1vZHVsZUFzeW5jKHQpKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH1cbn1cbiJdfQ==