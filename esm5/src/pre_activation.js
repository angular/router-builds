/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
import { from, of } from 'rxjs';
import { concatMap, every, first, last, map, mergeMap, reduce } from 'rxjs/operators';
import { ActivationStart, ChildActivationStart } from './events';
import { equalParamsAndUrlSegments, inheritedParamsDataResolve } from './router_state';
import { andObservables, forEach, shallowEqual, wrapIntoObservable } from './utils/collection';
import { nodeChildrenAsMap } from './utils/tree';
var CanActivate = /** @class */ (function () {
    function CanActivate(path) {
        this.path = path;
        this.route = this.path[this.path.length - 1];
    }
    return CanActivate;
}());
var CanDeactivate = /** @class */ (function () {
    function CanDeactivate(component, route) {
        this.component = component;
        this.route = route;
    }
    return CanDeactivate;
}());
/**
 * This class bundles the actions involved in preactivation of a route.
 */
var PreActivation = /** @class */ (function () {
    function PreActivation(future, curr, moduleInjector, forwardEvent) {
        this.future = future;
        this.curr = curr;
        this.moduleInjector = moduleInjector;
        this.forwardEvent = forwardEvent;
        this.canActivateChecks = [];
        this.canDeactivateChecks = [];
    }
    PreActivation.prototype.initialize = function (parentContexts) {
        var futureRoot = this.future._root;
        var currRoot = this.curr ? this.curr._root : null;
        this.setupChildRouteGuards(futureRoot, currRoot, parentContexts, [futureRoot.value]);
    };
    PreActivation.prototype.checkGuards = function () {
        var _this = this;
        if (!this.isDeactivating() && !this.isActivating()) {
            return of(true);
        }
        var canDeactivate$ = this.runCanDeactivateChecks();
        return canDeactivate$.pipe(mergeMap(function (canDeactivate) { return canDeactivate ? _this.runCanActivateChecks() : of(false); }));
    };
    PreActivation.prototype.resolveData = function (paramsInheritanceStrategy) {
        var _this = this;
        if (!this.isActivating())
            return of(null);
        return from(this.canActivateChecks)
            .pipe(concatMap(function (check) { return _this.runResolve(check.route, paramsInheritanceStrategy); }), reduce(function (_, __) { return _; }));
    };
    PreActivation.prototype.isDeactivating = function () { return this.canDeactivateChecks.length !== 0; };
    PreActivation.prototype.isActivating = function () { return this.canActivateChecks.length !== 0; };
    /**
     * Iterates over child routes and calls recursive `setupRouteGuards` to get `this` instance in
     * proper state to run `checkGuards()` method.
     */
    PreActivation.prototype.setupChildRouteGuards = function (futureNode, currNode, contexts, futurePath) {
        var _this = this;
        var prevChildren = nodeChildrenAsMap(currNode);
        // Process the children of the future route
        futureNode.children.forEach(function (c) {
            _this.setupRouteGuards(c, prevChildren[c.value.outlet], contexts, futurePath.concat([c.value]));
            delete prevChildren[c.value.outlet];
        });
        // Process any children left from the current route (not active for the future route)
        forEach(prevChildren, function (v, k) {
            return _this.deactivateRouteAndItsChildren(v, contexts.getContext(k));
        });
    };
    /**
     * Iterates over child routes and calls recursive `setupRouteGuards` to get `this` instance in
     * proper state to run `checkGuards()` method.
     */
    PreActivation.prototype.setupRouteGuards = function (futureNode, currNode, parentContexts, futurePath) {
        var future = futureNode.value;
        var curr = currNode ? currNode.value : null;
        var context = parentContexts ? parentContexts.getContext(futureNode.value.outlet) : null;
        // reusing the node
        if (curr && future.routeConfig === curr.routeConfig) {
            var shouldRunGuardsAndResolvers = this.shouldRunGuardsAndResolvers(curr, future, future.routeConfig.runGuardsAndResolvers);
            if (shouldRunGuardsAndResolvers) {
                this.canActivateChecks.push(new CanActivate(futurePath));
            }
            else {
                // we need to set the data
                future.data = curr.data;
                future._resolvedData = curr._resolvedData;
            }
            // If we have a component, we need to go through an outlet.
            if (future.component) {
                this.setupChildRouteGuards(futureNode, currNode, context ? context.children : null, futurePath);
                // if we have a componentless route, we recurse but keep the same outlet map.
            }
            else {
                this.setupChildRouteGuards(futureNode, currNode, parentContexts, futurePath);
            }
            if (shouldRunGuardsAndResolvers) {
                var outlet = context.outlet;
                this.canDeactivateChecks.push(new CanDeactivate(outlet.component, curr));
            }
        }
        else {
            if (curr) {
                this.deactivateRouteAndItsChildren(currNode, context);
            }
            this.canActivateChecks.push(new CanActivate(futurePath));
            // If we have a component, we need to go through an outlet.
            if (future.component) {
                this.setupChildRouteGuards(futureNode, null, context ? context.children : null, futurePath);
                // if we have a componentless route, we recurse but keep the same outlet map.
            }
            else {
                this.setupChildRouteGuards(futureNode, null, parentContexts, futurePath);
            }
        }
    };
    PreActivation.prototype.shouldRunGuardsAndResolvers = function (curr, future, mode) {
        switch (mode) {
            case 'always':
                return true;
            case 'paramsOrQueryParamsChange':
                return !equalParamsAndUrlSegments(curr, future) ||
                    !shallowEqual(curr.queryParams, future.queryParams);
            case 'paramsChange':
            default:
                return !equalParamsAndUrlSegments(curr, future);
        }
    };
    PreActivation.prototype.deactivateRouteAndItsChildren = function (route, context) {
        var _this = this;
        var children = nodeChildrenAsMap(route);
        var r = route.value;
        forEach(children, function (node, childName) {
            if (!r.component) {
                _this.deactivateRouteAndItsChildren(node, context);
            }
            else if (context) {
                _this.deactivateRouteAndItsChildren(node, context.children.getContext(childName));
            }
            else {
                _this.deactivateRouteAndItsChildren(node, null);
            }
        });
        if (!r.component) {
            this.canDeactivateChecks.push(new CanDeactivate(null, r));
        }
        else if (context && context.outlet && context.outlet.isActivated) {
            this.canDeactivateChecks.push(new CanDeactivate(context.outlet.component, r));
        }
        else {
            this.canDeactivateChecks.push(new CanDeactivate(null, r));
        }
    };
    PreActivation.prototype.runCanDeactivateChecks = function () {
        var _this = this;
        return from(this.canDeactivateChecks)
            .pipe(mergeMap(function (check) { return _this.runCanDeactivate(check.component, check.route); }), every(function (result) { return result === true; }));
    };
    PreActivation.prototype.runCanActivateChecks = function () {
        var _this = this;
        return from(this.canActivateChecks)
            .pipe(concatMap(function (check) { return andObservables(from([
            _this.fireChildActivationStart(check.route.parent),
            _this.fireActivationStart(check.route), _this.runCanActivateChild(check.path),
            _this.runCanActivate(check.route)
        ])); }), every(function (result) { return result === true; }));
        // this.fireChildActivationStart(check.path),
    };
    /**
     * This should fire off `ActivationStart` events for each route being activated at this
     * level.
     * In other words, if you're activating `a` and `b` below, `path` will contain the
     * `ActivatedRouteSnapshot`s for both and we will fire `ActivationStart` for both. Always
     * return
     * `true` so checks continue to run.
     */
    PreActivation.prototype.fireActivationStart = function (snapshot) {
        if (snapshot !== null && this.forwardEvent) {
            this.forwardEvent(new ActivationStart(snapshot));
        }
        return of(true);
    };
    /**
     * This should fire off `ChildActivationStart` events for each route being activated at this
     * level.
     * In other words, if you're activating `a` and `b` below, `path` will contain the
     * `ActivatedRouteSnapshot`s for both and we will fire `ChildActivationStart` for both. Always
     * return
     * `true` so checks continue to run.
     */
    PreActivation.prototype.fireChildActivationStart = function (snapshot) {
        if (snapshot !== null && this.forwardEvent) {
            this.forwardEvent(new ChildActivationStart(snapshot));
        }
        return of(true);
    };
    PreActivation.prototype.runCanActivate = function (future) {
        var _this = this;
        var canActivate = future.routeConfig ? future.routeConfig.canActivate : null;
        if (!canActivate || canActivate.length === 0)
            return of(true);
        var obs = from(canActivate).pipe(map(function (c) {
            var guard = _this.getToken(c, future);
            var observable;
            if (guard.canActivate) {
                observable = wrapIntoObservable(guard.canActivate(future, _this.future));
            }
            else {
                observable = wrapIntoObservable(guard(future, _this.future));
            }
            return observable.pipe(first());
        }));
        return andObservables(obs);
    };
    PreActivation.prototype.runCanActivateChild = function (path) {
        var _this = this;
        var future = path[path.length - 1];
        var canActivateChildGuards = path.slice(0, path.length - 1)
            .reverse()
            .map(function (p) { return _this.extractCanActivateChild(p); })
            .filter(function (_) { return _ !== null; });
        return andObservables(from(canActivateChildGuards).pipe(map(function (d) {
            var obs = from(d.guards).pipe(map(function (c) {
                var guard = _this.getToken(c, d.node);
                var observable;
                if (guard.canActivateChild) {
                    observable = wrapIntoObservable(guard.canActivateChild(future, _this.future));
                }
                else {
                    observable = wrapIntoObservable(guard(future, _this.future));
                }
                return observable.pipe(first());
            }));
            return andObservables(obs);
        })));
    };
    PreActivation.prototype.extractCanActivateChild = function (p) {
        var canActivateChild = p.routeConfig ? p.routeConfig.canActivateChild : null;
        if (!canActivateChild || canActivateChild.length === 0)
            return null;
        return { node: p, guards: canActivateChild };
    };
    PreActivation.prototype.runCanDeactivate = function (component, curr) {
        var _this = this;
        var canDeactivate = curr && curr.routeConfig ? curr.routeConfig.canDeactivate : null;
        if (!canDeactivate || canDeactivate.length === 0)
            return of(true);
        var canDeactivate$ = from(canDeactivate).pipe(mergeMap(function (c) {
            var guard = _this.getToken(c, curr);
            var observable;
            if (guard.canDeactivate) {
                observable =
                    wrapIntoObservable(guard.canDeactivate(component, curr, _this.curr, _this.future));
            }
            else {
                observable = wrapIntoObservable(guard(component, curr, _this.curr, _this.future));
            }
            return observable.pipe(first());
        }));
        return canDeactivate$.pipe(every(function (result) { return result === true; }));
    };
    PreActivation.prototype.runResolve = function (future, paramsInheritanceStrategy) {
        var resolve = future._resolve;
        return this.resolveNode(resolve, future).pipe(map(function (resolvedData) {
            future._resolvedData = resolvedData;
            future.data = tslib_1.__assign({}, future.data, inheritedParamsDataResolve(future, paramsInheritanceStrategy).resolve);
            return null;
        }));
    };
    PreActivation.prototype.resolveNode = function (resolve, future) {
        var _this = this;
        var keys = Object.keys(resolve);
        if (keys.length === 0) {
            return of({});
        }
        if (keys.length === 1) {
            var key_1 = keys[0];
            return this.getResolver(resolve[key_1], future).pipe(map(function (value) {
                var _a;
                return _a = {}, _a[key_1] = value, _a;
            }));
        }
        var data = {};
        var runningResolvers$ = from(keys).pipe(mergeMap(function (key) {
            return _this.getResolver(resolve[key], future).pipe(map(function (value) {
                data[key] = value;
                return value;
            }));
        }));
        return runningResolvers$.pipe(last(), map(function () { return data; }));
    };
    PreActivation.prototype.getResolver = function (injectionToken, future) {
        var resolver = this.getToken(injectionToken, future);
        return resolver.resolve ? wrapIntoObservable(resolver.resolve(future, this.future)) :
            wrapIntoObservable(resolver(future, this.future));
    };
    PreActivation.prototype.getToken = function (token, snapshot) {
        var config = closestLoadedConfig(snapshot);
        var injector = config ? config.module.injector : this.moduleInjector;
        return injector.get(token);
    };
    return PreActivation;
}());
export { PreActivation };
function closestLoadedConfig(snapshot) {
    if (!snapshot)
        return null;
    for (var s = snapshot.parent; s; s = s.parent) {
        var route = s.routeConfig;
        if (route && route._loadedConfig)
            return route._loadedConfig;
    }
    return null;
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlX2FjdGl2YXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3ByZV9hY3RpdmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7QUFHSCxPQUFPLEVBQWEsSUFBSSxFQUFFLEVBQUUsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUMzQyxPQUFPLEVBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFHcEYsT0FBTyxFQUFDLGVBQWUsRUFBRSxvQkFBb0IsRUFBUSxNQUFNLFVBQVUsQ0FBQztBQUV0RSxPQUFPLEVBQThDLHlCQUF5QixFQUFFLDBCQUEwQixFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDbEksT0FBTyxFQUFDLGNBQWMsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDN0YsT0FBTyxFQUFXLGlCQUFpQixFQUFDLE1BQU0sY0FBYyxDQUFDO0FBRXpEO0lBRUUscUJBQW1CLElBQThCO1FBQTlCLFNBQUksR0FBSixJQUFJLENBQTBCO1FBQy9DLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBQ0gsa0JBQUM7QUFBRCxDQUFDLEFBTEQsSUFLQztBQUVEO0lBQ0UsdUJBQW1CLFNBQXNCLEVBQVMsS0FBNkI7UUFBNUQsY0FBUyxHQUFULFNBQVMsQ0FBYTtRQUFTLFVBQUssR0FBTCxLQUFLLENBQXdCO0lBQUcsQ0FBQztJQUNyRixvQkFBQztBQUFELENBQUMsQUFGRCxJQUVDO0FBRUQ7O0dBRUc7QUFDSDtJQUlFLHVCQUNZLE1BQTJC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QU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUU7UUFDN0MsSUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQztRQUM1QixJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsYUFBYTtZQUFFLE9BQU8sS0FBSyxDQUFDLGFBQWEsQ0FBQztLQUM5RDtJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtJbmplY3Rvcn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge09ic2VydmFibGUsIGZyb20sIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NvbmNhdE1hcCwgZXZlcnksIGZpcnN0LCBsYXN0LCBtYXAsIG1lcmdlTWFwLCByZWR1Y2V9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtMb2FkZWRSb3V0ZXJDb25maWcsIFJlc29sdmVEYXRhLCBSdW5HdWFyZHNBbmRSZXNvbHZlcnN9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7QWN0aXZhdGlvblN0YXJ0LCBDaGlsZEFjdGl2YXRpb25TdGFydCwgRXZlbnR9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0cywgT3V0bGV0Q29udGV4dH0gZnJvbSAnLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBSb3V0ZXJTdGF0ZVNuYXBzaG90LCBlcXVhbFBhcmFtc0FuZFVybFNlZ21lbnRzLCBpbmhlcml0ZWRQYXJhbXNEYXRhUmVzb2x2ZX0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHthbmRPYnNlcnZhYmxlcywgZm9yRWFjaCwgc2hhbGxvd0VxdWFsLCB3cmFwSW50b09ic2VydmFibGV9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge1RyZWVOb2RlLCBub2RlQ2hpbGRyZW5Bc01hcH0gZnJvbSAnLi91dGlscy90cmVlJztcblxuY2xhc3MgQ2FuQWN0aXZhdGUge1xuICByZWFkb25seSByb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdDtcbiAgY29uc3RydWN0b3IocHVibGljIHBhdGg6IEFjdGl2YXRlZFJvdXRlU25hcHNob3RbXSkge1xuICAgIHRoaXMucm91dGUgPSB0aGlzLnBhdGhbdGhpcy5wYXRoLmxlbmd0aCAtIDFdO1xuICB9XG59XG5cbmNsYXNzIENhbkRlYWN0aXZhdGUge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgY29tcG9uZW50OiBPYmplY3R8bnVsbCwgcHVibGljIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSB7fVxufVxuXG4vKipcbiAqIFRoaXMgY2xhc3MgYnVuZGxlcyB0aGUgYWN0aW9ucyBpbnZvbHZlZCBpbiBwcmVhY3RpdmF0aW9uIG9mIGEgcm91dGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBQcmVBY3RpdmF0aW9uIHtcbiAgcHJpdmF0ZSBjYW5BY3RpdmF0ZUNoZWNrczogQ2FuQWN0aXZhdGVbXSA9IFtdO1xuICBwcml2YXRlIGNhbkRlYWN0aXZhdGVDaGVja3M6IENhbkRlYWN0aXZhdGVbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBmdXR1cmU6IFJvdXRlclN0YXRlU25hcHNob3QsIHByaXZhdGUgY3VycjogUm91dGVyU3RhdGVTbmFwc2hvdCxcbiAgICAgIHByaXZhdGUgbW9kdWxlSW5qZWN0b3I6IEluamVjdG9yLCBwcml2YXRlIGZvcndhcmRFdmVudD86IChldnQ6IEV2ZW50KSA9PiB2b2lkKSB7fVxuXG4gIGluaXRpYWxpemUocGFyZW50Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICBjb25zdCBmdXR1cmVSb290ID0gdGhpcy5mdXR1cmUuX3Jvb3Q7XG4gICAgY29uc3QgY3VyclJvb3QgPSB0aGlzLmN1cnIgPyB0aGlzLmN1cnIuX3Jvb3QgOiBudWxsO1xuICAgIHRoaXMuc2V0dXBDaGlsZFJvdXRlR3VhcmRzKGZ1dHVyZVJvb3QsIGN1cnJSb290LCBwYXJlbnRDb250ZXh0cywgW2Z1dHVyZVJvb3QudmFsdWVdKTtcbiAgfVxuXG4gIGNoZWNrR3VhcmRzKCk6IE9ic2VydmFibGU8Ym9vbGVhbj4ge1xuICAgIGlmICghdGhpcy5pc0RlYWN0aXZhdGluZygpICYmICF0aGlzLmlzQWN0aXZhdGluZygpKSB7XG4gICAgICByZXR1cm4gb2YgKHRydWUpO1xuICAgIH1cbiAgICBjb25zdCBjYW5EZWFjdGl2YXRlJCA9IHRoaXMucnVuQ2FuRGVhY3RpdmF0ZUNoZWNrcygpO1xuICAgIHJldHVybiBjYW5EZWFjdGl2YXRlJC5waXBlKG1lcmdlTWFwKFxuICAgICAgICAoY2FuRGVhY3RpdmF0ZTogYm9vbGVhbikgPT4gY2FuRGVhY3RpdmF0ZSA/IHRoaXMucnVuQ2FuQWN0aXZhdGVDaGVja3MoKSA6IG9mIChmYWxzZSkpKTtcbiAgfVxuXG4gIHJlc29sdmVEYXRhKHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6ICdlbXB0eU9ubHknfCdhbHdheXMnKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgICBpZiAoIXRoaXMuaXNBY3RpdmF0aW5nKCkpIHJldHVybiBvZiAobnVsbCk7XG4gICAgcmV0dXJuIGZyb20odGhpcy5jYW5BY3RpdmF0ZUNoZWNrcylcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICBjb25jYXRNYXAoXG4gICAgICAgICAgICAgICAgKGNoZWNrOiBDYW5BY3RpdmF0ZSkgPT4gdGhpcy5ydW5SZXNvbHZlKGNoZWNrLnJvdXRlLCBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5KSksXG4gICAgICAgICAgICByZWR1Y2UoKF86IGFueSwgX186IGFueSkgPT4gXykpO1xuICB9XG5cbiAgaXNEZWFjdGl2YXRpbmcoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLmNhbkRlYWN0aXZhdGVDaGVja3MubGVuZ3RoICE9PSAwOyB9XG5cbiAgaXNBY3RpdmF0aW5nKCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5jYW5BY3RpdmF0ZUNoZWNrcy5sZW5ndGggIT09IDA7IH1cblxuXG4gIC8qKlxuICAgKiBJdGVyYXRlcyBvdmVyIGNoaWxkIHJvdXRlcyBhbmQgY2FsbHMgcmVjdXJzaXZlIGBzZXR1cFJvdXRlR3VhcmRzYCB0byBnZXQgYHRoaXNgIGluc3RhbmNlIGluXG4gICAqIHByb3BlciBzdGF0ZSB0byBydW4gYGNoZWNrR3VhcmRzKClgIG1ldGhvZC5cbiAgICovXG4gIHByaXZhdGUgc2V0dXBDaGlsZFJvdXRlR3VhcmRzKFxuICAgICAgZnV0dXJlTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4sIGN1cnJOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PnxudWxsLFxuICAgICAgY29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHN8bnVsbCwgZnV0dXJlUGF0aDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdFtdKTogdm9pZCB7XG4gICAgY29uc3QgcHJldkNoaWxkcmVuID0gbm9kZUNoaWxkcmVuQXNNYXAoY3Vyck5vZGUpO1xuXG4gICAgLy8gUHJvY2VzcyB0aGUgY2hpbGRyZW4gb2YgdGhlIGZ1dHVyZSByb3V0ZVxuICAgIGZ1dHVyZU5vZGUuY2hpbGRyZW4uZm9yRWFjaChjID0+IHtcbiAgICAgIHRoaXMuc2V0dXBSb3V0ZUd1YXJkcyhcbiAgICAgICAgICBjLCBwcmV2Q2hpbGRyZW5bYy52YWx1ZS5vdXRsZXRdLCBjb250ZXh0cywgZnV0dXJlUGF0aC5jb25jYXQoW2MudmFsdWVdKSk7XG4gICAgICBkZWxldGUgcHJldkNoaWxkcmVuW2MudmFsdWUub3V0bGV0XTtcbiAgICB9KTtcblxuICAgIC8vIFByb2Nlc3MgYW55IGNoaWxkcmVuIGxlZnQgZnJvbSB0aGUgY3VycmVudCByb3V0ZSAobm90IGFjdGl2ZSBmb3IgdGhlIGZ1dHVyZSByb3V0ZSlcbiAgICBmb3JFYWNoKFxuICAgICAgICBwcmV2Q2hpbGRyZW4sICh2OiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Piwgazogc3RyaW5nKSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKHYsIGNvbnRleHRzICEuZ2V0Q29udGV4dChrKSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGVzIG92ZXIgY2hpbGQgcm91dGVzIGFuZCBjYWxscyByZWN1cnNpdmUgYHNldHVwUm91dGVHdWFyZHNgIHRvIGdldCBgdGhpc2AgaW5zdGFuY2UgaW5cbiAgICogcHJvcGVyIHN0YXRlIHRvIHJ1biBgY2hlY2tHdWFyZHMoKWAgbWV0aG9kLlxuICAgKi9cbiAgcHJpdmF0ZSBzZXR1cFJvdXRlR3VhcmRzKFxuICAgICAgZnV0dXJlTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4sIGN1cnJOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PixcbiAgICAgIHBhcmVudENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzfG51bGwsIGZ1dHVyZVBhdGg6IEFjdGl2YXRlZFJvdXRlU25hcHNob3RbXSk6IHZvaWQge1xuICAgIGNvbnN0IGZ1dHVyZSA9IGZ1dHVyZU5vZGUudmFsdWU7XG4gICAgY29uc3QgY3VyciA9IGN1cnJOb2RlID8gY3Vyck5vZGUudmFsdWUgOiBudWxsO1xuICAgIGNvbnN0IGNvbnRleHQgPSBwYXJlbnRDb250ZXh0cyA/IHBhcmVudENvbnRleHRzLmdldENvbnRleHQoZnV0dXJlTm9kZS52YWx1ZS5vdXRsZXQpIDogbnVsbDtcblxuICAgIC8vIHJldXNpbmcgdGhlIG5vZGVcbiAgICBpZiAoY3VyciAmJiBmdXR1cmUucm91dGVDb25maWcgPT09IGN1cnIucm91dGVDb25maWcpIHtcbiAgICAgIGNvbnN0IHNob3VsZFJ1bkd1YXJkc0FuZFJlc29sdmVycyA9IHRoaXMuc2hvdWxkUnVuR3VhcmRzQW5kUmVzb2x2ZXJzKFxuICAgICAgICAgIGN1cnIsIGZ1dHVyZSwgZnV0dXJlLnJvdXRlQ29uZmlnICEucnVuR3VhcmRzQW5kUmVzb2x2ZXJzKTtcbiAgICAgIGlmIChzaG91bGRSdW5HdWFyZHNBbmRSZXNvbHZlcnMpIHtcbiAgICAgICAgdGhpcy5jYW5BY3RpdmF0ZUNoZWNrcy5wdXNoKG5ldyBDYW5BY3RpdmF0ZShmdXR1cmVQYXRoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB3ZSBuZWVkIHRvIHNldCB0aGUgZGF0YVxuICAgICAgICBmdXR1cmUuZGF0YSA9IGN1cnIuZGF0YTtcbiAgICAgICAgZnV0dXJlLl9yZXNvbHZlZERhdGEgPSBjdXJyLl9yZXNvbHZlZERhdGE7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHdlIGhhdmUgYSBjb21wb25lbnQsIHdlIG5lZWQgdG8gZ28gdGhyb3VnaCBhbiBvdXRsZXQuXG4gICAgICBpZiAoZnV0dXJlLmNvbXBvbmVudCkge1xuICAgICAgICB0aGlzLnNldHVwQ2hpbGRSb3V0ZUd1YXJkcyhcbiAgICAgICAgICAgIGZ1dHVyZU5vZGUsIGN1cnJOb2RlLCBjb250ZXh0ID8gY29udGV4dC5jaGlsZHJlbiA6IG51bGwsIGZ1dHVyZVBhdGgpO1xuXG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSBjb21wb25lbnRsZXNzIHJvdXRlLCB3ZSByZWN1cnNlIGJ1dCBrZWVwIHRoZSBzYW1lIG91dGxldCBtYXAuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnNldHVwQ2hpbGRSb3V0ZUd1YXJkcyhmdXR1cmVOb2RlLCBjdXJyTm9kZSwgcGFyZW50Q29udGV4dHMsIGZ1dHVyZVBhdGgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2hvdWxkUnVuR3VhcmRzQW5kUmVzb2x2ZXJzKSB7XG4gICAgICAgIGNvbnN0IG91dGxldCA9IGNvbnRleHQgIS5vdXRsZXQgITtcbiAgICAgICAgdGhpcy5jYW5EZWFjdGl2YXRlQ2hlY2tzLnB1c2gobmV3IENhbkRlYWN0aXZhdGUob3V0bGV0LmNvbXBvbmVudCwgY3VycikpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoY3Vycikge1xuICAgICAgICB0aGlzLmRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKGN1cnJOb2RlLCBjb250ZXh0KTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5jYW5BY3RpdmF0ZUNoZWNrcy5wdXNoKG5ldyBDYW5BY3RpdmF0ZShmdXR1cmVQYXRoKSk7XG4gICAgICAvLyBJZiB3ZSBoYXZlIGEgY29tcG9uZW50LCB3ZSBuZWVkIHRvIGdvIHRocm91Z2ggYW4gb3V0bGV0LlxuICAgICAgaWYgKGZ1dHVyZS5jb21wb25lbnQpIHtcbiAgICAgICAgdGhpcy5zZXR1cENoaWxkUm91dGVHdWFyZHMoZnV0dXJlTm9kZSwgbnVsbCwgY29udGV4dCA/IGNvbnRleHQuY2hpbGRyZW4gOiBudWxsLCBmdXR1cmVQYXRoKTtcblxuICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgY29tcG9uZW50bGVzcyByb3V0ZSwgd2UgcmVjdXJzZSBidXQga2VlcCB0aGUgc2FtZSBvdXRsZXQgbWFwLlxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zZXR1cENoaWxkUm91dGVHdWFyZHMoZnV0dXJlTm9kZSwgbnVsbCwgcGFyZW50Q29udGV4dHMsIGZ1dHVyZVBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc2hvdWxkUnVuR3VhcmRzQW5kUmVzb2x2ZXJzKFxuICAgICAgY3VycjogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgZnV0dXJlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LFxuICAgICAgbW9kZTogUnVuR3VhcmRzQW5kUmVzb2x2ZXJzfHVuZGVmaW5lZCk6IGJvb2xlYW4ge1xuICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgY2FzZSAnYWx3YXlzJzpcbiAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICAgIGNhc2UgJ3BhcmFtc09yUXVlcnlQYXJhbXNDaGFuZ2UnOlxuICAgICAgICByZXR1cm4gIWVxdWFsUGFyYW1zQW5kVXJsU2VnbWVudHMoY3VyciwgZnV0dXJlKSB8fFxuICAgICAgICAgICAgIXNoYWxsb3dFcXVhbChjdXJyLnF1ZXJ5UGFyYW1zLCBmdXR1cmUucXVlcnlQYXJhbXMpO1xuXG4gICAgICBjYXNlICdwYXJhbXNDaGFuZ2UnOlxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuICFlcXVhbFBhcmFtc0FuZFVybFNlZ21lbnRzKGN1cnIsIGZ1dHVyZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBkZWFjdGl2YXRlUm91dGVBbmRJdHNDaGlsZHJlbihcbiAgICAgIHJvdXRlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PiwgY29udGV4dDogT3V0bGV0Q29udGV4dHxudWxsKTogdm9pZCB7XG4gICAgY29uc3QgY2hpbGRyZW4gPSBub2RlQ2hpbGRyZW5Bc01hcChyb3V0ZSk7XG4gICAgY29uc3QgciA9IHJvdXRlLnZhbHVlO1xuXG4gICAgZm9yRWFjaChjaGlsZHJlbiwgKG5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+LCBjaGlsZE5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgaWYgKCFyLmNvbXBvbmVudCkge1xuICAgICAgICB0aGlzLmRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKG5vZGUsIGNvbnRleHQpO1xuICAgICAgfSBlbHNlIGlmIChjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZGVhY3RpdmF0ZVJvdXRlQW5kSXRzQ2hpbGRyZW4obm9kZSwgY29udGV4dC5jaGlsZHJlbi5nZXRDb250ZXh0KGNoaWxkTmFtZSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5kZWFjdGl2YXRlUm91dGVBbmRJdHNDaGlsZHJlbihub2RlLCBudWxsKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICghci5jb21wb25lbnQpIHtcbiAgICAgIHRoaXMuY2FuRGVhY3RpdmF0ZUNoZWNrcy5wdXNoKG5ldyBDYW5EZWFjdGl2YXRlKG51bGwsIHIpKTtcbiAgICB9IGVsc2UgaWYgKGNvbnRleHQgJiYgY29udGV4dC5vdXRsZXQgJiYgY29udGV4dC5vdXRsZXQuaXNBY3RpdmF0ZWQpIHtcbiAgICAgIHRoaXMuY2FuRGVhY3RpdmF0ZUNoZWNrcy5wdXNoKG5ldyBDYW5EZWFjdGl2YXRlKGNvbnRleHQub3V0bGV0LmNvbXBvbmVudCwgcikpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNhbkRlYWN0aXZhdGVDaGVja3MucHVzaChuZXcgQ2FuRGVhY3RpdmF0ZShudWxsLCByKSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBydW5DYW5EZWFjdGl2YXRlQ2hlY2tzKCk6IE9ic2VydmFibGU8Ym9vbGVhbj4ge1xuICAgIHJldHVybiBmcm9tKHRoaXMuY2FuRGVhY3RpdmF0ZUNoZWNrcylcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICBtZXJnZU1hcCgoY2hlY2s6IENhbkRlYWN0aXZhdGUpID0+IHRoaXMucnVuQ2FuRGVhY3RpdmF0ZShjaGVjay5jb21wb25lbnQsIGNoZWNrLnJvdXRlKSksXG4gICAgICAgICAgICBldmVyeSgocmVzdWx0OiBib29sZWFuKSA9PiByZXN1bHQgPT09IHRydWUpKTtcbiAgfVxuXG4gIHByaXZhdGUgcnVuQ2FuQWN0aXZhdGVDaGVja3MoKTogT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIGZyb20odGhpcy5jYW5BY3RpdmF0ZUNoZWNrcylcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICBjb25jYXRNYXAoKGNoZWNrOiBDYW5BY3RpdmF0ZSkgPT4gYW5kT2JzZXJ2YWJsZXMoZnJvbShbXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZpcmVDaGlsZEFjdGl2YXRpb25TdGFydChjaGVjay5yb3V0ZS5wYXJlbnQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5maXJlQWN0aXZhdGlvblN0YXJ0KGNoZWNrLnJvdXRlKSwgdGhpcy5ydW5DYW5BY3RpdmF0ZUNoaWxkKGNoZWNrLnBhdGgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ydW5DYW5BY3RpdmF0ZShjaGVjay5yb3V0ZSlcbiAgICAgICAgICAgICAgICAgICAgICBdKSkpLFxuICAgICAgICAgICAgZXZlcnkoKHJlc3VsdDogYm9vbGVhbikgPT4gcmVzdWx0ID09PSB0cnVlKSk7XG4gICAgLy8gdGhpcy5maXJlQ2hpbGRBY3RpdmF0aW9uU3RhcnQoY2hlY2sucGF0aCksXG4gIH1cblxuICAvKipcbiAgICogVGhpcyBzaG91bGQgZmlyZSBvZmYgYEFjdGl2YXRpb25TdGFydGAgZXZlbnRzIGZvciBlYWNoIHJvdXRlIGJlaW5nIGFjdGl2YXRlZCBhdCB0aGlzXG4gICAqIGxldmVsLlxuICAgKiBJbiBvdGhlciB3b3JkcywgaWYgeW91J3JlIGFjdGl2YXRpbmcgYGFgIGFuZCBgYmAgYmVsb3csIGBwYXRoYCB3aWxsIGNvbnRhaW4gdGhlXG4gICAqIGBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90YHMgZm9yIGJvdGggYW5kIHdlIHdpbGwgZmlyZSBgQWN0aXZhdGlvblN0YXJ0YCBmb3IgYm90aC4gQWx3YXlzXG4gICAqIHJldHVyblxuICAgKiBgdHJ1ZWAgc28gY2hlY2tzIGNvbnRpbnVlIHRvIHJ1bi5cbiAgICovXG4gIHByaXZhdGUgZmlyZUFjdGl2YXRpb25TdGFydChzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdHxudWxsKTogT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gICAgaWYgKHNuYXBzaG90ICE9PSBudWxsICYmIHRoaXMuZm9yd2FyZEV2ZW50KSB7XG4gICAgICB0aGlzLmZvcndhcmRFdmVudChuZXcgQWN0aXZhdGlvblN0YXJ0KHNuYXBzaG90KSk7XG4gICAgfVxuICAgIHJldHVybiBvZiAodHJ1ZSk7XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBzaG91bGQgZmlyZSBvZmYgYENoaWxkQWN0aXZhdGlvblN0YXJ0YCBldmVudHMgZm9yIGVhY2ggcm91dGUgYmVpbmcgYWN0aXZhdGVkIGF0IHRoaXNcbiAgICogbGV2ZWwuXG4gICAqIEluIG90aGVyIHdvcmRzLCBpZiB5b3UncmUgYWN0aXZhdGluZyBgYWAgYW5kIGBiYCBiZWxvdywgYHBhdGhgIHdpbGwgY29udGFpbiB0aGVcbiAgICogYEFjdGl2YXRlZFJvdXRlU25hcHNob3RgcyBmb3IgYm90aCBhbmQgd2Ugd2lsbCBmaXJlIGBDaGlsZEFjdGl2YXRpb25TdGFydGAgZm9yIGJvdGguIEFsd2F5c1xuICAgKiByZXR1cm5cbiAgICogYHRydWVgIHNvIGNoZWNrcyBjb250aW51ZSB0byBydW4uXG4gICAqL1xuICBwcml2YXRlIGZpcmVDaGlsZEFjdGl2YXRpb25TdGFydChzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdHxudWxsKTogT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gICAgaWYgKHNuYXBzaG90ICE9PSBudWxsICYmIHRoaXMuZm9yd2FyZEV2ZW50KSB7XG4gICAgICB0aGlzLmZvcndhcmRFdmVudChuZXcgQ2hpbGRBY3RpdmF0aW9uU3RhcnQoc25hcHNob3QpKTtcbiAgICB9XG4gICAgcmV0dXJuIG9mICh0cnVlKTtcbiAgfVxuXG4gIHByaXZhdGUgcnVuQ2FuQWN0aXZhdGUoZnV0dXJlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gICAgY29uc3QgY2FuQWN0aXZhdGUgPSBmdXR1cmUucm91dGVDb25maWcgPyBmdXR1cmUucm91dGVDb25maWcuY2FuQWN0aXZhdGUgOiBudWxsO1xuICAgIGlmICghY2FuQWN0aXZhdGUgfHwgY2FuQWN0aXZhdGUubGVuZ3RoID09PSAwKSByZXR1cm4gb2YgKHRydWUpO1xuICAgIGNvbnN0IG9icyA9IGZyb20oY2FuQWN0aXZhdGUpLnBpcGUobWFwKChjOiBhbnkpID0+IHtcbiAgICAgIGNvbnN0IGd1YXJkID0gdGhpcy5nZXRUb2tlbihjLCBmdXR1cmUpO1xuICAgICAgbGV0IG9ic2VydmFibGU6IE9ic2VydmFibGU8Ym9vbGVhbj47XG4gICAgICBpZiAoZ3VhcmQuY2FuQWN0aXZhdGUpIHtcbiAgICAgICAgb2JzZXJ2YWJsZSA9IHdyYXBJbnRvT2JzZXJ2YWJsZShndWFyZC5jYW5BY3RpdmF0ZShmdXR1cmUsIHRoaXMuZnV0dXJlKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvYnNlcnZhYmxlID0gd3JhcEludG9PYnNlcnZhYmxlKGd1YXJkKGZ1dHVyZSwgdGhpcy5mdXR1cmUpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYnNlcnZhYmxlLnBpcGUoZmlyc3QoKSk7XG4gICAgfSkpO1xuICAgIHJldHVybiBhbmRPYnNlcnZhYmxlcyhvYnMpO1xuICB9XG5cbiAgcHJpdmF0ZSBydW5DYW5BY3RpdmF0ZUNoaWxkKHBhdGg6IEFjdGl2YXRlZFJvdXRlU25hcHNob3RbXSk6IE9ic2VydmFibGU8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IGZ1dHVyZSA9IHBhdGhbcGF0aC5sZW5ndGggLSAxXTtcblxuICAgIGNvbnN0IGNhbkFjdGl2YXRlQ2hpbGRHdWFyZHMgPSBwYXRoLnNsaWNlKDAsIHBhdGgubGVuZ3RoIC0gMSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXZlcnNlKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAocCA9PiB0aGlzLmV4dHJhY3RDYW5BY3RpdmF0ZUNoaWxkKHApKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihfID0+IF8gIT09IG51bGwpO1xuXG4gICAgcmV0dXJuIGFuZE9ic2VydmFibGVzKGZyb20oY2FuQWN0aXZhdGVDaGlsZEd1YXJkcykucGlwZShtYXAoKGQ6IGFueSkgPT4ge1xuICAgICAgY29uc3Qgb2JzID0gZnJvbShkLmd1YXJkcykucGlwZShtYXAoKGM6IGFueSkgPT4ge1xuICAgICAgICBjb25zdCBndWFyZCA9IHRoaXMuZ2V0VG9rZW4oYywgZC5ub2RlKTtcbiAgICAgICAgbGV0IG9ic2VydmFibGU6IE9ic2VydmFibGU8Ym9vbGVhbj47XG4gICAgICAgIGlmIChndWFyZC5jYW5BY3RpdmF0ZUNoaWxkKSB7XG4gICAgICAgICAgb2JzZXJ2YWJsZSA9IHdyYXBJbnRvT2JzZXJ2YWJsZShndWFyZC5jYW5BY3RpdmF0ZUNoaWxkKGZ1dHVyZSwgdGhpcy5mdXR1cmUpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYnNlcnZhYmxlID0gd3JhcEludG9PYnNlcnZhYmxlKGd1YXJkKGZ1dHVyZSwgdGhpcy5mdXR1cmUpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JzZXJ2YWJsZS5waXBlKGZpcnN0KCkpO1xuICAgICAgfSkpO1xuICAgICAgcmV0dXJuIGFuZE9ic2VydmFibGVzKG9icyk7XG4gICAgfSkpKTtcbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdENhbkFjdGl2YXRlQ2hpbGQocDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6XG4gICAgICB7bm9kZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgZ3VhcmRzOiBhbnlbXX18bnVsbCB7XG4gICAgY29uc3QgY2FuQWN0aXZhdGVDaGlsZCA9IHAucm91dGVDb25maWcgPyBwLnJvdXRlQ29uZmlnLmNhbkFjdGl2YXRlQ2hpbGQgOiBudWxsO1xuICAgIGlmICghY2FuQWN0aXZhdGVDaGlsZCB8fCBjYW5BY3RpdmF0ZUNoaWxkLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHtub2RlOiBwLCBndWFyZHM6IGNhbkFjdGl2YXRlQ2hpbGR9O1xuICB9XG5cbiAgcHJpdmF0ZSBydW5DYW5EZWFjdGl2YXRlKGNvbXBvbmVudDogT2JqZWN0fG51bGwsIGN1cnI6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOlxuICAgICAgT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gICAgY29uc3QgY2FuRGVhY3RpdmF0ZSA9IGN1cnIgJiYgY3Vyci5yb3V0ZUNvbmZpZyA/IGN1cnIucm91dGVDb25maWcuY2FuRGVhY3RpdmF0ZSA6IG51bGw7XG4gICAgaWYgKCFjYW5EZWFjdGl2YXRlIHx8IGNhbkRlYWN0aXZhdGUubGVuZ3RoID09PSAwKSByZXR1cm4gb2YgKHRydWUpO1xuICAgIGNvbnN0IGNhbkRlYWN0aXZhdGUkID0gZnJvbShjYW5EZWFjdGl2YXRlKS5waXBlKG1lcmdlTWFwKChjOiBhbnkpID0+IHtcbiAgICAgIGNvbnN0IGd1YXJkID0gdGhpcy5nZXRUb2tlbihjLCBjdXJyKTtcbiAgICAgIGxldCBvYnNlcnZhYmxlOiBPYnNlcnZhYmxlPGJvb2xlYW4+O1xuICAgICAgaWYgKGd1YXJkLmNhbkRlYWN0aXZhdGUpIHtcbiAgICAgICAgb2JzZXJ2YWJsZSA9XG4gICAgICAgICAgICB3cmFwSW50b09ic2VydmFibGUoZ3VhcmQuY2FuRGVhY3RpdmF0ZShjb21wb25lbnQsIGN1cnIsIHRoaXMuY3VyciwgdGhpcy5mdXR1cmUpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9ic2VydmFibGUgPSB3cmFwSW50b09ic2VydmFibGUoZ3VhcmQoY29tcG9uZW50LCBjdXJyLCB0aGlzLmN1cnIsIHRoaXMuZnV0dXJlKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZS5waXBlKGZpcnN0KCkpO1xuICAgIH0pKTtcbiAgICByZXR1cm4gY2FuRGVhY3RpdmF0ZSQucGlwZShldmVyeSgocmVzdWx0OiBhbnkpID0+IHJlc3VsdCA9PT0gdHJ1ZSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBydW5SZXNvbHZlKFxuICAgICAgZnV0dXJlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LFxuICAgICAgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogJ2VtcHR5T25seSd8J2Fsd2F5cycpOiBPYnNlcnZhYmxlPGFueT4ge1xuICAgIGNvbnN0IHJlc29sdmUgPSBmdXR1cmUuX3Jlc29sdmU7XG4gICAgcmV0dXJuIHRoaXMucmVzb2x2ZU5vZGUocmVzb2x2ZSwgZnV0dXJlKS5waXBlKG1hcCgocmVzb2x2ZWREYXRhOiBhbnkpOiBhbnkgPT4ge1xuICAgICAgZnV0dXJlLl9yZXNvbHZlZERhdGEgPSByZXNvbHZlZERhdGE7XG4gICAgICBmdXR1cmUuZGF0YSA9IHsuLi5mdXR1cmUuZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgIC4uLmluaGVyaXRlZFBhcmFtc0RhdGFSZXNvbHZlKGZ1dHVyZSwgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSkucmVzb2x2ZX07XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVOb2RlKHJlc29sdmU6IFJlc29sdmVEYXRhLCBmdXR1cmU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBPYnNlcnZhYmxlPGFueT4ge1xuICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhyZXNvbHZlKTtcbiAgICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBvZiAoe30pO1xuICAgIH1cbiAgICBpZiAoa2V5cy5sZW5ndGggPT09IDEpIHtcbiAgICAgIGNvbnN0IGtleSA9IGtleXNbMF07XG4gICAgICByZXR1cm4gdGhpcy5nZXRSZXNvbHZlcihyZXNvbHZlW2tleV0sIGZ1dHVyZSkucGlwZShtYXAoKHZhbHVlOiBhbnkpID0+IHtcbiAgICAgICAgcmV0dXJuIHtba2V5XTogdmFsdWV9O1xuICAgICAgfSkpO1xuICAgIH1cbiAgICBjb25zdCBkYXRhOiB7W2s6IHN0cmluZ106IGFueX0gPSB7fTtcbiAgICBjb25zdCBydW5uaW5nUmVzb2x2ZXJzJCA9IGZyb20oa2V5cykucGlwZShtZXJnZU1hcCgoa2V5OiBzdHJpbmcpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmdldFJlc29sdmVyKHJlc29sdmVba2V5XSwgZnV0dXJlKS5waXBlKG1hcCgodmFsdWU6IGFueSkgPT4ge1xuICAgICAgICBkYXRhW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfSkpO1xuICAgIH0pKTtcbiAgICByZXR1cm4gcnVubmluZ1Jlc29sdmVycyQucGlwZShsYXN0KCksIG1hcCgoKSA9PiBkYXRhKSk7XG4gIH1cblxuICBwcml2YXRlIGdldFJlc29sdmVyKGluamVjdGlvblRva2VuOiBhbnksIGZ1dHVyZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IE9ic2VydmFibGU8YW55PiB7XG4gICAgY29uc3QgcmVzb2x2ZXIgPSB0aGlzLmdldFRva2VuKGluamVjdGlvblRva2VuLCBmdXR1cmUpO1xuICAgIHJldHVybiByZXNvbHZlci5yZXNvbHZlID8gd3JhcEludG9PYnNlcnZhYmxlKHJlc29sdmVyLnJlc29sdmUoZnV0dXJlLCB0aGlzLmZ1dHVyZSkpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyYXBJbnRvT2JzZXJ2YWJsZShyZXNvbHZlcihmdXR1cmUsIHRoaXMuZnV0dXJlKSk7XG4gIH1cblxuICBwcml2YXRlIGdldFRva2VuKHRva2VuOiBhbnksIHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogYW55IHtcbiAgICBjb25zdCBjb25maWcgPSBjbG9zZXN0TG9hZGVkQ29uZmlnKHNuYXBzaG90KTtcbiAgICBjb25zdCBpbmplY3RvciA9IGNvbmZpZyA/IGNvbmZpZy5tb2R1bGUuaW5qZWN0b3IgOiB0aGlzLm1vZHVsZUluamVjdG9yO1xuICAgIHJldHVybiBpbmplY3Rvci5nZXQodG9rZW4pO1xuICB9XG59XG5cblxuZnVuY3Rpb24gY2xvc2VzdExvYWRlZENvbmZpZyhzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IExvYWRlZFJvdXRlckNvbmZpZ3xudWxsIHtcbiAgaWYgKCFzbmFwc2hvdCkgcmV0dXJuIG51bGw7XG5cbiAgZm9yIChsZXQgcyA9IHNuYXBzaG90LnBhcmVudDsgczsgcyA9IHMucGFyZW50KSB7XG4gICAgY29uc3Qgcm91dGUgPSBzLnJvdXRlQ29uZmlnO1xuICAgIGlmIChyb3V0ZSAmJiByb3V0ZS5fbG9hZGVkQ29uZmlnKSByZXR1cm4gcm91dGUuX2xvYWRlZENvbmZpZztcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuIl19