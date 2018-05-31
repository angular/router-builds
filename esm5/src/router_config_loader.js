/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { InjectionToken, NgModuleFactory } from '@angular/core';
import { from, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { LoadedRouterConfig, copyConfig } from './config';
import { flatten, wrapIntoObservable } from './utils/collection';
/**
 * @docsNotRequired
 * @experimental
 */
export var ROUTES = new InjectionToken('ROUTES');
var RouterConfigLoader = /** @class */ (function () {
    function RouterConfigLoader(loader, compiler, onLoadStartListener, onLoadEndListener) {
        this.loader = loader;
        this.compiler = compiler;
        this.onLoadStartListener = onLoadStartListener;
        this.onLoadEndListener = onLoadEndListener;
    }
    RouterConfigLoader.prototype.load = function (parentInjector, route) {
        var _this = this;
        if (this.onLoadStartListener) {
            this.onLoadStartListener(route);
        }
        var moduleFactory$ = this.loadModuleFactory((route.loadChildren));
        return moduleFactory$.pipe(map(function (factory) {
            if (_this.onLoadEndListener) {
                _this.onLoadEndListener(route);
            }
            var module = factory.create(parentInjector);
            return new LoadedRouterConfig(flatten(module.injector.get(ROUTES)).map(copyConfig), module);
        }));
    };
    RouterConfigLoader.prototype.loadModuleFactory = function (loadChildren) {
        var _this = this;
        if (typeof loadChildren === 'string') {
            return from(this.loader.load(loadChildren));
        }
        else {
            return wrapIntoObservable(loadChildren()).pipe(mergeMap(function (t) {
                if (t instanceof NgModuleFactory) {
                    return of(t);
                }
                else {
                    return from(_this.compiler.compileModuleAsync(t));
                }
            }));
        }
    };
    return RouterConfigLoader;
}());
export { RouterConfigLoader };

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX2NvbmZpZ19sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3JvdXRlcl9jb25maWdfbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFRQSxPQUFPLEVBQVcsY0FBYyxFQUFZLGVBQWUsRUFBd0IsTUFBTSxlQUFlLENBQUM7QUFFekcsT0FBTyxFQUFhLElBQUksRUFBRSxFQUFFLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDM0MsT0FBTyxFQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUM3QyxPQUFPLEVBQWUsa0JBQWtCLEVBQVMsVUFBVSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzdFLE9BQU8sRUFBQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQzs7Ozs7QUFNL0QsTUFBTSxDQUFDLElBQU0sTUFBTSxHQUFHLElBQUksY0FBYyxDQUFZLFFBQVEsQ0FBQyxDQUFDO0FBRTlELElBQUE7SUFDRSw0QkFDWSxNQUE2QixFQUFVLFFBQWtCLEVBQ3pELG1CQUF3QyxFQUN4QyxpQkFBc0M7UUFGdEMsV0FBTSxHQUFOLE1BQU0sQ0FBdUI7UUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFVO1FBQ3pELHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDeEMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFxQjtLQUFJO0lBRXRELGlDQUFJLEdBQUosVUFBSyxjQUF3QixFQUFFLEtBQVk7UUFBM0MsaUJBZ0JDO1FBZkMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDNUIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ2pDO1FBRUQsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUEsS0FBSyxDQUFDLFlBQWMsQ0FBQSxDQUFDLENBQUM7UUFFcEUsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFDLE9BQTZCO1lBQzNELElBQUksS0FBSSxDQUFDLGlCQUFpQixFQUFFO2dCQUMxQixLQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDL0I7WUFFRCxJQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBRTlDLE9BQU8sSUFBSSxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7U0FDN0YsQ0FBQyxDQUFDLENBQUM7S0FDTDtJQUVPLDhDQUFpQixHQUF6QixVQUEwQixZQUEwQjtRQUFwRCxpQkFZQztRQVhDLElBQUksT0FBTyxZQUFZLEtBQUssUUFBUSxFQUFFO1lBQ3BDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7U0FDN0M7YUFBTTtZQUNMLE9BQU8sa0JBQWtCLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQUMsQ0FBTTtnQkFDN0QsSUFBSSxDQUFDLFlBQVksZUFBZSxFQUFFO29CQUNoQyxPQUFPLEVBQUUsQ0FBRSxDQUFDLENBQUMsQ0FBQztpQkFDZjtxQkFBTTtvQkFDTCxPQUFPLElBQUksQ0FBQyxLQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ2xEO2FBQ0YsQ0FBQyxDQUFDLENBQUM7U0FDTDtLQUNGOzZCQXpESDtJQTBEQyxDQUFBO0FBckNELDhCQXFDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb21waWxlciwgSW5qZWN0aW9uVG9rZW4sIEluamVjdG9yLCBOZ01vZHVsZUZhY3RvcnksIE5nTW9kdWxlRmFjdG9yeUxvYWRlcn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG4vLyBUT0RPKGkpOiBzd2l0Y2ggdG8gZnJvbVByb21pc2Ugb25jZSBpdCdzIGV4cG9yZWQgaW4gcnhqc1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBmcm9tLCBvZiB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttYXAsIG1lcmdlTWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge0xvYWRDaGlsZHJlbiwgTG9hZGVkUm91dGVyQ29uZmlnLCBSb3V0ZSwgY29weUNvbmZpZ30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtmbGF0dGVuLCB3cmFwSW50b09ic2VydmFibGV9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5cbi8qKlxuICogQGRvY3NOb3RSZXF1aXJlZFxuICogQGV4cGVyaW1lbnRhbFxuICovXG5leHBvcnQgY29uc3QgUk9VVEVTID0gbmV3IEluamVjdGlvblRva2VuPFJvdXRlW11bXT4oJ1JPVVRFUycpO1xuXG5leHBvcnQgY2xhc3MgUm91dGVyQ29uZmlnTG9hZGVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGxvYWRlcjogTmdNb2R1bGVGYWN0b3J5TG9hZGVyLCBwcml2YXRlIGNvbXBpbGVyOiBDb21waWxlcixcbiAgICAgIHByaXZhdGUgb25Mb2FkU3RhcnRMaXN0ZW5lcj86IChyOiBSb3V0ZSkgPT4gdm9pZCxcbiAgICAgIHByaXZhdGUgb25Mb2FkRW5kTGlzdGVuZXI/OiAocjogUm91dGUpID0+IHZvaWQpIHt9XG5cbiAgbG9hZChwYXJlbnRJbmplY3RvcjogSW5qZWN0b3IsIHJvdXRlOiBSb3V0ZSk6IE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPiB7XG4gICAgaWYgKHRoaXMub25Mb2FkU3RhcnRMaXN0ZW5lcikge1xuICAgICAgdGhpcy5vbkxvYWRTdGFydExpc3RlbmVyKHJvdXRlKTtcbiAgICB9XG5cbiAgICBjb25zdCBtb2R1bGVGYWN0b3J5JCA9IHRoaXMubG9hZE1vZHVsZUZhY3Rvcnkocm91dGUubG9hZENoaWxkcmVuICEpO1xuXG4gICAgcmV0dXJuIG1vZHVsZUZhY3RvcnkkLnBpcGUobWFwKChmYWN0b3J5OiBOZ01vZHVsZUZhY3Rvcnk8YW55PikgPT4ge1xuICAgICAgaWYgKHRoaXMub25Mb2FkRW5kTGlzdGVuZXIpIHtcbiAgICAgICAgdGhpcy5vbkxvYWRFbmRMaXN0ZW5lcihyb3V0ZSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG1vZHVsZSA9IGZhY3RvcnkuY3JlYXRlKHBhcmVudEluamVjdG9yKTtcblxuICAgICAgcmV0dXJuIG5ldyBMb2FkZWRSb3V0ZXJDb25maWcoZmxhdHRlbihtb2R1bGUuaW5qZWN0b3IuZ2V0KFJPVVRFUykpLm1hcChjb3B5Q29uZmlnKSwgbW9kdWxlKTtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIGxvYWRNb2R1bGVGYWN0b3J5KGxvYWRDaGlsZHJlbjogTG9hZENoaWxkcmVuKTogT2JzZXJ2YWJsZTxOZ01vZHVsZUZhY3Rvcnk8YW55Pj4ge1xuICAgIGlmICh0eXBlb2YgbG9hZENoaWxkcmVuID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGZyb20odGhpcy5sb2FkZXIubG9hZChsb2FkQ2hpbGRyZW4pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHdyYXBJbnRvT2JzZXJ2YWJsZShsb2FkQ2hpbGRyZW4oKSkucGlwZShtZXJnZU1hcCgodDogYW55KSA9PiB7XG4gICAgICAgIGlmICh0IGluc3RhbmNlb2YgTmdNb2R1bGVGYWN0b3J5KSB7XG4gICAgICAgICAgcmV0dXJuIG9mICh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZnJvbSh0aGlzLmNvbXBpbGVyLmNvbXBpbGVNb2R1bGVBc3luYyh0KSk7XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==