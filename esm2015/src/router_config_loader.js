/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { InjectionToken, NgModuleFactory } from '@angular/core';
// TODO(i): switch to fromPromise once it's expored in rxjs
import { from, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { LoadedRouterConfig, standardizeConfig } from './config';
import { flatten, wrapIntoObservable } from './utils/collection';
/**
 * @docsNotRequired
 * @publicApi
 */
export const ROUTES = new InjectionToken('ROUTES');
export class RouterConfigLoader {
    constructor(loader, compiler, onLoadStartListener, onLoadEndListener) {
        this.loader = loader;
        this.compiler = compiler;
        this.onLoadStartListener = onLoadStartListener;
        this.onLoadEndListener = onLoadEndListener;
    }
    load(parentInjector, route) {
        if (this.onLoadStartListener) {
            this.onLoadStartListener(route);
        }
        const moduleFactory$ = this.loadModuleFactory(route.loadChildren);
        return moduleFactory$.pipe(map((factory) => {
            if (this.onLoadEndListener) {
                this.onLoadEndListener(route);
            }
            const module = factory.create(parentInjector);
            return new LoadedRouterConfig(flatten(module.injector.get(ROUTES)).map(standardizeConfig), module);
        }));
    }
    loadModuleFactory(loadChildren) {
        if (typeof loadChildren === 'string') {
            return from(this.loader.load(loadChildren));
        }
        else {
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
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2NvbmZpZ19sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3JvdXRlcl9jb25maWdfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBVyxjQUFjLEVBQVksZUFBZSxFQUF3QixNQUFNLGVBQWUsQ0FBQztBQUN6RywyREFBMkQ7QUFDM0QsT0FBTyxFQUFhLElBQUksRUFBRSxFQUFFLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDM0MsT0FBTyxFQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUM3QyxPQUFPLEVBQWUsa0JBQWtCLEVBQVMsaUJBQWlCLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDcEYsT0FBTyxFQUFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBRS9EOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxNQUFNLE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBWSxRQUFRLENBQUMsQ0FBQztBQUU5RCxNQUFNLE9BQU8sa0JBQWtCO0lBQzdCLFlBQ1ksTUFBNkIsRUFBVSxRQUFrQixFQUN6RCxtQkFBd0MsRUFDeEMsaUJBQXNDO1FBRnRDLFdBQU0sR0FBTixNQUFNLENBQXVCO1FBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBVTtRQUN6RCx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ3hDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBcUI7SUFBRyxDQUFDO0lBRXRELElBQUksQ0FBQyxjQUF3QixFQUFFLEtBQVk7UUFDekMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDNUIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ2pDO1FBRUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxZQUFjLENBQUMsQ0FBQztRQUVwRSxPQUFPLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBNkIsRUFBRSxFQUFFO1lBQy9ELElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFO2dCQUMxQixJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDL0I7WUFFRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBRTlDLE9BQU8sSUFBSSxrQkFBa0IsQ0FDekIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDM0UsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNOLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxZQUEwQjtRQUNsRCxJQUFJLE9BQU8sWUFBWSxLQUFLLFFBQVEsRUFBRTtZQUNwQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1NBQzdDO2FBQU07WUFDTCxPQUFPLGtCQUFrQixDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFO2dCQUNqRSxJQUFJLENBQUMsWUFBWSxlQUFlLEVBQUU7b0JBQ2hDLE9BQU8sRUFBRSxDQUFFLENBQUMsQ0FBQyxDQUFDO2lCQUNmO3FCQUFNO29CQUNMLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDbEQ7WUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ0w7SUFDSCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29tcGlsZXIsIEluamVjdGlvblRva2VuLCBJbmplY3RvciwgTmdNb2R1bGVGYWN0b3J5LCBOZ01vZHVsZUZhY3RvcnlMb2FkZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuLy8gVE9ETyhpKTogc3dpdGNoIHRvIGZyb21Qcm9taXNlIG9uY2UgaXQncyBleHBvcmVkIGluIHJ4anNcbmltcG9ydCB7T2JzZXJ2YWJsZSwgZnJvbSwgb2YgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7bWFwLCBtZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtMb2FkQ2hpbGRyZW4sIExvYWRlZFJvdXRlckNvbmZpZywgUm91dGUsIHN0YW5kYXJkaXplQ29uZmlnfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge2ZsYXR0ZW4sIHdyYXBJbnRvT2JzZXJ2YWJsZX0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcblxuLyoqXG4gKiBAZG9jc05vdFJlcXVpcmVkXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjb25zdCBST1VURVMgPSBuZXcgSW5qZWN0aW9uVG9rZW48Um91dGVbXVtdPignUk9VVEVTJyk7XG5cbmV4cG9ydCBjbGFzcyBSb3V0ZXJDb25maWdMb2FkZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgbG9hZGVyOiBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIHByaXZhdGUgY29tcGlsZXI6IENvbXBpbGVyLFxuICAgICAgcHJpdmF0ZSBvbkxvYWRTdGFydExpc3RlbmVyPzogKHI6IFJvdXRlKSA9PiB2b2lkLFxuICAgICAgcHJpdmF0ZSBvbkxvYWRFbmRMaXN0ZW5lcj86IChyOiBSb3V0ZSkgPT4gdm9pZCkge31cblxuICBsb2FkKHBhcmVudEluamVjdG9yOiBJbmplY3Rvciwgcm91dGU6IFJvdXRlKTogT2JzZXJ2YWJsZTxMb2FkZWRSb3V0ZXJDb25maWc+IHtcbiAgICBpZiAodGhpcy5vbkxvYWRTdGFydExpc3RlbmVyKSB7XG4gICAgICB0aGlzLm9uTG9hZFN0YXJ0TGlzdGVuZXIocm91dGUpO1xuICAgIH1cblxuICAgIGNvbnN0IG1vZHVsZUZhY3RvcnkkID0gdGhpcy5sb2FkTW9kdWxlRmFjdG9yeShyb3V0ZS5sb2FkQ2hpbGRyZW4gISk7XG5cbiAgICByZXR1cm4gbW9kdWxlRmFjdG9yeSQucGlwZShtYXAoKGZhY3Rvcnk6IE5nTW9kdWxlRmFjdG9yeTxhbnk+KSA9PiB7XG4gICAgICBpZiAodGhpcy5vbkxvYWRFbmRMaXN0ZW5lcikge1xuICAgICAgICB0aGlzLm9uTG9hZEVuZExpc3RlbmVyKHJvdXRlKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbW9kdWxlID0gZmFjdG9yeS5jcmVhdGUocGFyZW50SW5qZWN0b3IpO1xuXG4gICAgICByZXR1cm4gbmV3IExvYWRlZFJvdXRlckNvbmZpZyhcbiAgICAgICAgICBmbGF0dGVuKG1vZHVsZS5pbmplY3Rvci5nZXQoUk9VVEVTKSkubWFwKHN0YW5kYXJkaXplQ29uZmlnKSwgbW9kdWxlKTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIGxvYWRNb2R1bGVGYWN0b3J5KGxvYWRDaGlsZHJlbjogTG9hZENoaWxkcmVuKTogT2JzZXJ2YWJsZTxOZ01vZHVsZUZhY3Rvcnk8YW55Pj4ge1xuICAgIGlmICh0eXBlb2YgbG9hZENoaWxkcmVuID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGZyb20odGhpcy5sb2FkZXIubG9hZChsb2FkQ2hpbGRyZW4pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHdyYXBJbnRvT2JzZXJ2YWJsZShsb2FkQ2hpbGRyZW4oKSkucGlwZShtZXJnZU1hcCgodDogYW55KSA9PiB7XG4gICAgICAgIGlmICh0IGluc3RhbmNlb2YgTmdNb2R1bGVGYWN0b3J5KSB7XG4gICAgICAgICAgcmV0dXJuIG9mICh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZnJvbSh0aGlzLmNvbXBpbGVyLmNvbXBpbGVNb2R1bGVBc3luYyh0KSk7XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==