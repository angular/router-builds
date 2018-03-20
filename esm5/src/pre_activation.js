/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
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
function CanActivate_tsickle_Closure_declarations() {
    /** @type {?} */
    CanActivate.prototype.route;
    /** @type {?} */
    CanActivate.prototype.path;
}
var CanDeactivate = /** @class */ (function () {
    function CanDeactivate(component, route) {
        this.component = component;
        this.route = route;
    }
    return CanDeactivate;
}());
function CanDeactivate_tsickle_Closure_declarations() {
    /** @type {?} */
    CanDeactivate.prototype.component;
    /** @type {?} */
    CanDeactivate.prototype.route;
}
/**
 * This class bundles the actions involved in preactivation of a route.
 */
var /**
 * This class bundles the actions involved in preactivation of a route.
 */
PreActivation = /** @class */ (function () {
    function PreActivation(future, curr, moduleInjector, forwardEvent) {
        this.future = future;
        this.curr = curr;
        this.moduleInjector = moduleInjector;
        this.forwardEvent = forwardEvent;
        this.canActivateChecks = [];
        this.canDeactivateChecks = [];
    }
    /**
     * @param {?} parentContexts
     * @return {?}
     */
    PreActivation.prototype.initialize = /**
     * @param {?} parentContexts
     * @return {?}
     */
    function (parentContexts) {
        var /** @type {?} */ futureRoot = this.future._root;
        var /** @type {?} */ currRoot = this.curr ? this.curr._root : null;
        this.setupChildRouteGuards(futureRoot, currRoot, parentContexts, [futureRoot.value]);
    };
    /**
     * @return {?}
     */
    PreActivation.prototype.checkGuards = /**
     * @return {?}
     */
    function () {
        var _this = this;
        if (!this.isDeactivating() && !this.isActivating()) {
            return of(true);
        }
        var /** @type {?} */ canDeactivate$ = this.runCanDeactivateChecks();
        return canDeactivate$.pipe(mergeMap(function (canDeactivate) { return canDeactivate ? _this.runCanActivateChecks() : of(false); }));
    };
    /**
     * @param {?} paramsInheritanceStrategy
     * @return {?}
     */
    PreActivation.prototype.resolveData = /**
     * @param {?} paramsInheritanceStrategy
     * @return {?}
     */
    function (paramsInheritanceStrategy) {
        var _this = this;
        if (!this.isActivating())
            return of(null);
        return from(this.canActivateChecks)
            .pipe(concatMap(function (check) { return _this.runResolve(check.route, paramsInheritanceStrategy); }), reduce(function (_, __) { return _; }));
    };
    /**
     * @return {?}
     */
    PreActivation.prototype.isDeactivating = /**
     * @return {?}
     */
    function () { return this.canDeactivateChecks.length !== 0; };
    /**
     * @return {?}
     */
    PreActivation.prototype.isActivating = /**
     * @return {?}
     */
    function () { return this.canActivateChecks.length !== 0; };
    /**
     * Iterates over child routes and calls recursive `setupRouteGuards` to get `this` instance in
     * proper state to run `checkGuards()` method.
     * @param {?} futureNode
     * @param {?} currNode
     * @param {?} contexts
     * @param {?} futurePath
     * @return {?}
     */
    PreActivation.prototype.setupChildRouteGuards = /**
     * Iterates over child routes and calls recursive `setupRouteGuards` to get `this` instance in
     * proper state to run `checkGuards()` method.
     * @param {?} futureNode
     * @param {?} currNode
     * @param {?} contexts
     * @param {?} futurePath
     * @return {?}
     */
    function (futureNode, currNode, contexts, futurePath) {
        var _this = this;
        var /** @type {?} */ prevChildren = nodeChildrenAsMap(currNode);
        // Process the children of the future route
        futureNode.children.forEach(function (c) {
            _this.setupRouteGuards(c, prevChildren[c.value.outlet], contexts, futurePath.concat([c.value]));
            delete prevChildren[c.value.outlet];
        });
        // Process any children left from the current route (not active for the future route)
        forEach(prevChildren, function (v, k) {
            return _this.deactivateRouteAndItsChildren(v, /** @type {?} */ ((contexts)).getContext(k));
        });
    };
    /**
     * Iterates over child routes and calls recursive `setupRouteGuards` to get `this` instance in
     * proper state to run `checkGuards()` method.
     * @param {?} futureNode
     * @param {?} currNode
     * @param {?} parentContexts
     * @param {?} futurePath
     * @return {?}
     */
    PreActivation.prototype.setupRouteGuards = /**
     * Iterates over child routes and calls recursive `setupRouteGuards` to get `this` instance in
     * proper state to run `checkGuards()` method.
     * @param {?} futureNode
     * @param {?} currNode
     * @param {?} parentContexts
     * @param {?} futurePath
     * @return {?}
     */
    function (futureNode, currNode, parentContexts, futurePath) {
        var /** @type {?} */ future = futureNode.value;
        var /** @type {?} */ curr = currNode ? currNode.value : null;
        var /** @type {?} */ context = parentContexts ? parentContexts.getContext(futureNode.value.outlet) : null;
        // reusing the node
        if (curr && future.routeConfig === curr.routeConfig) {
            var /** @type {?} */ shouldRunGuardsAndResolvers = this.shouldRunGuardsAndResolvers(curr, future, /** @type {?} */ ((future.routeConfig)).runGuardsAndResolvers);
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
                var /** @type {?} */ outlet = /** @type {?} */ ((/** @type {?} */ ((context)).outlet));
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
    /**
     * @param {?} curr
     * @param {?} future
     * @param {?} mode
     * @return {?}
     */
    PreActivation.prototype.shouldRunGuardsAndResolvers = /**
     * @param {?} curr
     * @param {?} future
     * @param {?} mode
     * @return {?}
     */
    function (curr, future, mode) {
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
    /**
     * @param {?} route
     * @param {?} context
     * @return {?}
     */
    PreActivation.prototype.deactivateRouteAndItsChildren = /**
     * @param {?} route
     * @param {?} context
     * @return {?}
     */
    function (route, context) {
        var _this = this;
        var /** @type {?} */ children = nodeChildrenAsMap(route);
        var /** @type {?} */ r = route.value;
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
    /**
     * @return {?}
     */
    PreActivation.prototype.runCanDeactivateChecks = /**
     * @return {?}
     */
    function () {
        var _this = this;
        return from(this.canDeactivateChecks)
            .pipe(mergeMap(function (check) { return _this.runCanDeactivate(check.component, check.route); }), every(function (result) { return result === true; }));
    };
    /**
     * @return {?}
     */
    PreActivation.prototype.runCanActivateChecks = /**
     * @return {?}
     */
    function () {
        var _this = this;
        return from(this.canActivateChecks)
            .pipe(concatMap(function (check) {
            return andObservables(from([
                _this.fireChildActivationStart(check.route.parent),
                _this.fireActivationStart(check.route), _this.runCanActivateChild(check.path),
                _this.runCanActivate(check.route)
            ]));
        }), every(function (result) { return result === true; }));
        // this.fireChildActivationStart(check.path),
    };
    /**
     * This should fire off `ActivationStart` events for each route being activated at this
     * level.
     * In other words, if you're activating `a` and `b` below, `path` will contain the
     * `ActivatedRouteSnapshot`s for both and we will fire `ActivationStart` for both. Always
     * return
     * `true` so checks continue to run.
     * @param {?} snapshot
     * @return {?}
     */
    PreActivation.prototype.fireActivationStart = /**
     * This should fire off `ActivationStart` events for each route being activated at this
     * level.
     * In other words, if you're activating `a` and `b` below, `path` will contain the
     * `ActivatedRouteSnapshot`s for both and we will fire `ActivationStart` for both. Always
     * return
     * `true` so checks continue to run.
     * @param {?} snapshot
     * @return {?}
     */
    function (snapshot) {
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
     * @param {?} snapshot
     * @return {?}
     */
    PreActivation.prototype.fireChildActivationStart = /**
     * This should fire off `ChildActivationStart` events for each route being activated at this
     * level.
     * In other words, if you're activating `a` and `b` below, `path` will contain the
     * `ActivatedRouteSnapshot`s for both and we will fire `ChildActivationStart` for both. Always
     * return
     * `true` so checks continue to run.
     * @param {?} snapshot
     * @return {?}
     */
    function (snapshot) {
        if (snapshot !== null && this.forwardEvent) {
            this.forwardEvent(new ChildActivationStart(snapshot));
        }
        return of(true);
    };
    /**
     * @param {?} future
     * @return {?}
     */
    PreActivation.prototype.runCanActivate = /**
     * @param {?} future
     * @return {?}
     */
    function (future) {
        var _this = this;
        var /** @type {?} */ canActivate = future.routeConfig ? future.routeConfig.canActivate : null;
        if (!canActivate || canActivate.length === 0)
            return of(true);
        var /** @type {?} */ obs = from(canActivate).pipe(map(function (c) {
            var /** @type {?} */ guard = _this.getToken(c, future);
            var /** @type {?} */ observable;
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
    /**
     * @param {?} path
     * @return {?}
     */
    PreActivation.prototype.runCanActivateChild = /**
     * @param {?} path
     * @return {?}
     */
    function (path) {
        var _this = this;
        var /** @type {?} */ future = path[path.length - 1];
        var /** @type {?} */ canActivateChildGuards = path.slice(0, path.length - 1)
            .reverse()
            .map(function (p) { return _this.extractCanActivateChild(p); })
            .filter(function (_) { return _ !== null; });
        return andObservables(from(canActivateChildGuards).pipe(map(function (d) {
            var /** @type {?} */ obs = from(d.guards).pipe(map(function (c) {
                var /** @type {?} */ guard = _this.getToken(c, d.node);
                var /** @type {?} */ observable;
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
    /**
     * @param {?} p
     * @return {?}
     */
    PreActivation.prototype.extractCanActivateChild = /**
     * @param {?} p
     * @return {?}
     */
    function (p) {
        var /** @type {?} */ canActivateChild = p.routeConfig ? p.routeConfig.canActivateChild : null;
        if (!canActivateChild || canActivateChild.length === 0)
            return null;
        return { node: p, guards: canActivateChild };
    };
    /**
     * @param {?} component
     * @param {?} curr
     * @return {?}
     */
    PreActivation.prototype.runCanDeactivate = /**
     * @param {?} component
     * @param {?} curr
     * @return {?}
     */
    function (component, curr) {
        var _this = this;
        var /** @type {?} */ canDeactivate = curr && curr.routeConfig ? curr.routeConfig.canDeactivate : null;
        if (!canDeactivate || canDeactivate.length === 0)
            return of(true);
        var /** @type {?} */ canDeactivate$ = from(canDeactivate).pipe(mergeMap(function (c) {
            var /** @type {?} */ guard = _this.getToken(c, curr);
            var /** @type {?} */ observable;
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
    /**
     * @param {?} future
     * @param {?} paramsInheritanceStrategy
     * @return {?}
     */
    PreActivation.prototype.runResolve = /**
     * @param {?} future
     * @param {?} paramsInheritanceStrategy
     * @return {?}
     */
    function (future, paramsInheritanceStrategy) {
        var /** @type {?} */ resolve = future._resolve;
        return this.resolveNode(resolve, future).pipe(map(function (resolvedData) {
            future._resolvedData = resolvedData;
            future.data = tslib_1.__assign({}, future.data, inheritedParamsDataResolve(future, paramsInheritanceStrategy).resolve);
            return null;
        }));
    };
    /**
     * @param {?} resolve
     * @param {?} future
     * @return {?}
     */
    PreActivation.prototype.resolveNode = /**
     * @param {?} resolve
     * @param {?} future
     * @return {?}
     */
    function (resolve, future) {
        var _this = this;
        var /** @type {?} */ keys = Object.keys(resolve);
        if (keys.length === 0) {
            return of({});
        }
        if (keys.length === 1) {
            var /** @type {?} */ key_1 = keys[0];
            return this.getResolver(resolve[key_1], future).pipe(map(function (value) {
                return _a = {}, _a[key_1] = value, _a;
                var _a;
            }));
        }
        var /** @type {?} */ data = {};
        var /** @type {?} */ runningResolvers$ = from(keys).pipe(mergeMap(function (key) {
            return _this.getResolver(resolve[key], future).pipe(map(function (value) {
                data[key] = value;
                return value;
            }));
        }));
        return runningResolvers$.pipe(last(), map(function () { return data; }));
    };
    /**
     * @param {?} injectionToken
     * @param {?} future
     * @return {?}
     */
    PreActivation.prototype.getResolver = /**
     * @param {?} injectionToken
     * @param {?} future
     * @return {?}
     */
    function (injectionToken, future) {
        var /** @type {?} */ resolver = this.getToken(injectionToken, future);
        return resolver.resolve ? wrapIntoObservable(resolver.resolve(future, this.future)) :
            wrapIntoObservable(resolver(future, this.future));
    };
    /**
     * @param {?} token
     * @param {?} snapshot
     * @return {?}
     */
    PreActivation.prototype.getToken = /**
     * @param {?} token
     * @param {?} snapshot
     * @return {?}
     */
    function (token, snapshot) {
        var /** @type {?} */ config = closestLoadedConfig(snapshot);
        var /** @type {?} */ injector = config ? config.module.injector : this.moduleInjector;
        return injector.get(token);
    };
    return PreActivation;
}());
/**
 * This class bundles the actions involved in preactivation of a route.
 */
export { PreActivation };
function PreActivation_tsickle_Closure_declarations() {
    /** @type {?} */
    PreActivation.prototype.canActivateChecks;
    /** @type {?} */
    PreActivation.prototype.canDeactivateChecks;
    /** @type {?} */
    PreActivation.prototype.future;
    /** @type {?} */
    PreActivation.prototype.curr;
    /** @type {?} */
    PreActivation.prototype.moduleInjector;
    /** @type {?} */
    PreActivation.prototype.forwardEvent;
}
/**
 * @param {?} snapshot
 * @return {?}
 */
function closestLoadedConfig(snapshot) {
    if (!snapshot)
        return null;
    for (var /** @type {?} */ s = snapshot.parent; s; s = s.parent) {
        var /** @type {?} */ route = s.routeConfig;
        if (route && route._loadedConfig)
            return route._loadedConfig;
    }
    return null;
}
//# sourceMappingURL=pre_activation.js.map