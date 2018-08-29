/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { from, of } from 'rxjs';
import { concatMap, every, first, last, map, mergeMap, reduce } from 'rxjs/operators';
import { ActivationStart, ChildActivationStart } from './events';
import { equalParamsAndUrlSegments, inheritedParamsDataResolve } from './router_state';
import { andObservables, forEach, shallowEqual, wrapIntoObservable } from './utils/collection';
import { nodeChildrenAsMap } from './utils/tree';
class CanActivate {
    /**
     * @param {?} path
     */
    constructor(path) {
        this.path = path;
        this.route = this.path[this.path.length - 1];
    }
}
if (false) {
    /** @type {?} */
    CanActivate.prototype.route;
    /** @type {?} */
    CanActivate.prototype.path;
}
class CanDeactivate {
    /**
     * @param {?} component
     * @param {?} route
     */
    constructor(component, route) {
        this.component = component;
        this.route = route;
    }
}
if (false) {
    /** @type {?} */
    CanDeactivate.prototype.component;
    /** @type {?} */
    CanDeactivate.prototype.route;
}
/**
 * This class bundles the actions involved in preactivation of a route.
 */
export class PreActivation {
    /**
     * @param {?} future
     * @param {?} curr
     * @param {?} moduleInjector
     * @param {?=} forwardEvent
     */
    constructor(future, curr, moduleInjector, forwardEvent) {
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
    initialize(parentContexts) {
        /** @type {?} */
        const futureRoot = this.future._root;
        /** @type {?} */
        const currRoot = this.curr ? this.curr._root : null;
        this.setupChildRouteGuards(futureRoot, currRoot, parentContexts, [futureRoot.value]);
    }
    /**
     * @return {?}
     */
    checkGuards() {
        if (!this.isDeactivating() && !this.isActivating()) {
            return of(true);
        }
        /** @type {?} */
        const canDeactivate$ = this.runCanDeactivateChecks();
        return canDeactivate$.pipe(mergeMap((canDeactivate) => canDeactivate ? this.runCanActivateChecks() : of(false)));
    }
    /**
     * @param {?} paramsInheritanceStrategy
     * @return {?}
     */
    resolveData(paramsInheritanceStrategy) {
        if (!this.isActivating())
            return of(null);
        return from(this.canActivateChecks)
            .pipe(concatMap((check) => this.runResolve(check.route, paramsInheritanceStrategy)), reduce((_, __) => _));
    }
    /**
     * @return {?}
     */
    isDeactivating() { return this.canDeactivateChecks.length !== 0; }
    /**
     * @return {?}
     */
    isActivating() { return this.canActivateChecks.length !== 0; }
    /**
     * Iterates over child routes and calls recursive `setupRouteGuards` to get `this` instance in
     * proper state to run `checkGuards()` method.
     * @param {?} futureNode
     * @param {?} currNode
     * @param {?} contexts
     * @param {?} futurePath
     * @return {?}
     */
    setupChildRouteGuards(futureNode, currNode, contexts, futurePath) {
        /** @type {?} */
        const prevChildren = nodeChildrenAsMap(currNode);
        // Process the children of the future route
        futureNode.children.forEach(c => {
            this.setupRouteGuards(c, prevChildren[c.value.outlet], contexts, futurePath.concat([c.value]));
            delete prevChildren[c.value.outlet];
        });
        // Process any children left from the current route (not active for the future route)
        forEach(prevChildren, (v, k) => this.deactivateRouteAndItsChildren(v, /** @type {?} */ ((contexts)).getContext(k)));
    }
    /**
     * Iterates over child routes and calls recursive `setupRouteGuards` to get `this` instance in
     * proper state to run `checkGuards()` method.
     * @param {?} futureNode
     * @param {?} currNode
     * @param {?} parentContexts
     * @param {?} futurePath
     * @return {?}
     */
    setupRouteGuards(futureNode, currNode, parentContexts, futurePath) {
        /** @type {?} */
        const future = futureNode.value;
        /** @type {?} */
        const curr = currNode ? currNode.value : null;
        /** @type {?} */
        const context = parentContexts ? parentContexts.getContext(futureNode.value.outlet) : null;
        // reusing the node
        if (curr && future.routeConfig === curr.routeConfig) {
            /** @type {?} */
            const shouldRunGuardsAndResolvers = this.shouldRunGuardsAndResolvers(curr, future, /** @type {?} */ ((future.routeConfig)).runGuardsAndResolvers);
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
                /** @type {?} */
                const outlet = /** @type {?} */ ((/** @type {?} */ ((context)).outlet));
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
    }
    /**
     * @param {?} curr
     * @param {?} future
     * @param {?} mode
     * @return {?}
     */
    shouldRunGuardsAndResolvers(curr, future, mode) {
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
    }
    /**
     * @param {?} route
     * @param {?} context
     * @return {?}
     */
    deactivateRouteAndItsChildren(route, context) {
        /** @type {?} */
        const children = nodeChildrenAsMap(route);
        /** @type {?} */
        const r = route.value;
        forEach(children, (node, childName) => {
            if (!r.component) {
                this.deactivateRouteAndItsChildren(node, context);
            }
            else if (context) {
                this.deactivateRouteAndItsChildren(node, context.children.getContext(childName));
            }
            else {
                this.deactivateRouteAndItsChildren(node, null);
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
    }
    /**
     * @return {?}
     */
    runCanDeactivateChecks() {
        return from(this.canDeactivateChecks)
            .pipe(mergeMap((check) => this.runCanDeactivate(check.component, check.route)), every((result) => result === true));
    }
    /**
     * @return {?}
     */
    runCanActivateChecks() {
        return from(this.canActivateChecks)
            .pipe(concatMap((check) => andObservables(from([
            this.fireChildActivationStart(check.route.parent),
            this.fireActivationStart(check.route), this.runCanActivateChild(check.path),
            this.runCanActivate(check.route)
        ]))), every((result) => result === true));
        // this.fireChildActivationStart(check.path),
    }
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
    fireActivationStart(snapshot) {
        if (snapshot !== null && this.forwardEvent) {
            this.forwardEvent(new ActivationStart(snapshot));
        }
        return of(true);
    }
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
    fireChildActivationStart(snapshot) {
        if (snapshot !== null && this.forwardEvent) {
            this.forwardEvent(new ChildActivationStart(snapshot));
        }
        return of(true);
    }
    /**
     * @param {?} future
     * @return {?}
     */
    runCanActivate(future) {
        /** @type {?} */
        const canActivate = future.routeConfig ? future.routeConfig.canActivate : null;
        if (!canActivate || canActivate.length === 0)
            return of(true);
        /** @type {?} */
        const obs = from(canActivate).pipe(map((c) => {
            /** @type {?} */
            const guard = this.getToken(c, future);
            /** @type {?} */
            let observable;
            if (guard.canActivate) {
                observable = wrapIntoObservable(guard.canActivate(future, this.future));
            }
            else {
                observable = wrapIntoObservable(guard(future, this.future));
            }
            return observable.pipe(first());
        }));
        return andObservables(obs);
    }
    /**
     * @param {?} path
     * @return {?}
     */
    runCanActivateChild(path) {
        /** @type {?} */
        const future = path[path.length - 1];
        /** @type {?} */
        const canActivateChildGuards = path.slice(0, path.length - 1)
            .reverse()
            .map(p => this.extractCanActivateChild(p))
            .filter(_ => _ !== null);
        return andObservables(from(canActivateChildGuards).pipe(map((d) => {
            /** @type {?} */
            const obs = from(d.guards).pipe(map((c) => {
                /** @type {?} */
                const guard = this.getToken(c, d.node);
                /** @type {?} */
                let observable;
                if (guard.canActivateChild) {
                    observable = wrapIntoObservable(guard.canActivateChild(future, this.future));
                }
                else {
                    observable = wrapIntoObservable(guard(future, this.future));
                }
                return observable.pipe(first());
            }));
            return andObservables(obs);
        })));
    }
    /**
     * @param {?} p
     * @return {?}
     */
    extractCanActivateChild(p) {
        /** @type {?} */
        const canActivateChild = p.routeConfig ? p.routeConfig.canActivateChild : null;
        if (!canActivateChild || canActivateChild.length === 0)
            return null;
        return { node: p, guards: canActivateChild };
    }
    /**
     * @param {?} component
     * @param {?} curr
     * @return {?}
     */
    runCanDeactivate(component, curr) {
        /** @type {?} */
        const canDeactivate = curr && curr.routeConfig ? curr.routeConfig.canDeactivate : null;
        if (!canDeactivate || canDeactivate.length === 0)
            return of(true);
        /** @type {?} */
        const canDeactivate$ = from(canDeactivate).pipe(mergeMap((c) => {
            /** @type {?} */
            const guard = this.getToken(c, curr);
            /** @type {?} */
            let observable;
            if (guard.canDeactivate) {
                observable =
                    wrapIntoObservable(guard.canDeactivate(component, curr, this.curr, this.future));
            }
            else {
                observable = wrapIntoObservable(guard(component, curr, this.curr, this.future));
            }
            return observable.pipe(first());
        }));
        return canDeactivate$.pipe(every((result) => result === true));
    }
    /**
     * @param {?} future
     * @param {?} paramsInheritanceStrategy
     * @return {?}
     */
    runResolve(future, paramsInheritanceStrategy) {
        /** @type {?} */
        const resolve = future._resolve;
        return this.resolveNode(resolve, future).pipe(map((resolvedData) => {
            future._resolvedData = resolvedData;
            future.data = Object.assign({}, future.data, inheritedParamsDataResolve(future, paramsInheritanceStrategy).resolve);
            return null;
        }));
    }
    /**
     * @param {?} resolve
     * @param {?} future
     * @return {?}
     */
    resolveNode(resolve, future) {
        /** @type {?} */
        const keys = Object.keys(resolve);
        if (keys.length === 0) {
            return of({});
        }
        if (keys.length === 1) {
            /** @type {?} */
            const key = keys[0];
            return this.getResolver(resolve[key], future).pipe(map((value) => {
                return { [key]: value };
            }));
        }
        /** @type {?} */
        const data = {};
        /** @type {?} */
        const runningResolvers$ = from(keys).pipe(mergeMap((key) => {
            return this.getResolver(resolve[key], future).pipe(map((value) => {
                data[key] = value;
                return value;
            }));
        }));
        return runningResolvers$.pipe(last(), map(() => data));
    }
    /**
     * @param {?} injectionToken
     * @param {?} future
     * @return {?}
     */
    getResolver(injectionToken, future) {
        /** @type {?} */
        const resolver = this.getToken(injectionToken, future);
        return resolver.resolve ? wrapIntoObservable(resolver.resolve(future, this.future)) :
            wrapIntoObservable(resolver(future, this.future));
    }
    /**
     * @param {?} token
     * @param {?} snapshot
     * @return {?}
     */
    getToken(token, snapshot) {
        /** @type {?} */
        const config = closestLoadedConfig(snapshot);
        /** @type {?} */
        const injector = config ? config.module.injector : this.moduleInjector;
        return injector.get(token);
    }
}
if (false) {
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
    for (let s = snapshot.parent; s; s = s.parent) {
        /** @type {?} */
        const route = s.routeConfig;
        if (route && route._loadedConfig)
            return route._loadedConfig;
    }
    return null;
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlX2FjdGl2YXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3ByZV9hY3RpdmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBU0EsT0FBTyxFQUFhLElBQUksRUFBRSxFQUFFLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDM0MsT0FBTyxFQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBR3BGLE9BQU8sRUFBQyxlQUFlLEVBQUUsb0JBQW9CLEVBQVEsTUFBTSxVQUFVLENBQUM7QUFFdEUsT0FBTyxFQUE4Qyx5QkFBeUIsRUFBRSwwQkFBMEIsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ2xJLE9BQU8sRUFBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxrQkFBa0IsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQzdGLE9BQU8sRUFBVyxpQkFBaUIsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUV6RCxNQUFNLFdBQVc7Ozs7SUFFZixZQUFtQixJQUE4QjtRQUE5QixTQUFJLEdBQUosSUFBSSxDQUEwQjtRQUMvQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDOUM7Q0FDRjs7Ozs7OztBQUVELE1BQU0sYUFBYTs7Ozs7SUFDakIsWUFBbUIsU0FBc0IsRUFBUyxLQUE2QjtRQUE1RCxjQUFTLEdBQVQsU0FBUyxDQUFhO1FBQVMsVUFBSyxHQUFMLEtBQUssQ0FBd0I7S0FBSTtDQUNwRjs7Ozs7Ozs7OztBQUtELE1BQU0sT0FBTyxhQUFhOzs7Ozs7O0lBSXhCLFlBQ1ksUUFBcUMsSUFBeUIsRUFDOUQsZ0JBQWtDLFlBQW1DO1FBRHJFLFdBQU0sR0FBTixNQUFNO1FBQStCLFNBQUksR0FBSixJQUFJLENBQXFCO1FBQzlELG1CQUFjLEdBQWQsY0FBYztRQUFvQixpQkFBWSxHQUFaLFlBQVksQ0FBdUI7aUNBTHRDLEVBQUU7bUNBQ0UsRUFBRTtLQUlvQzs7Ozs7SUFFckYsVUFBVSxDQUFDLGNBQXNDOztRQUMvQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQzs7UUFDckMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNwRCxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztLQUN0Rjs7OztJQUVELFdBQVc7UUFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFO1lBQ2xELE9BQU8sRUFBRSxDQUFFLElBQUksQ0FBQyxDQUFDO1NBQ2xCOztRQUNELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQ3JELE9BQU8sY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQy9CLENBQUMsYUFBc0IsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUM1Rjs7Ozs7SUFFRCxXQUFXLENBQUMseUJBQStDO1FBQ3pELElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQUUsT0FBTyxFQUFFLENBQUUsSUFBSSxDQUFDLENBQUM7UUFDM0MsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDO2FBQzlCLElBQUksQ0FDRCxTQUFTLENBQ0wsQ0FBQyxLQUFrQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUseUJBQXlCLENBQUMsQ0FBQyxFQUNwRixNQUFNLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3pDOzs7O0lBRUQsY0FBYyxLQUFjLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRTs7OztJQUUzRSxZQUFZLEtBQWMsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxFQUFFOzs7Ozs7Ozs7O0lBTy9ELHFCQUFxQixDQUN6QixVQUE0QyxFQUFFLFFBQStDLEVBQzdGLFFBQXFDLEVBQUUsVUFBb0M7O1FBQzdFLE1BQU0sWUFBWSxHQUFHLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDOztRQUdqRCxVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUM5QixJQUFJLENBQUMsZ0JBQWdCLENBQ2pCLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0UsT0FBTyxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNyQyxDQUFDLENBQUM7O1FBR0gsT0FBTyxDQUNILFlBQVksRUFBRSxDQUFDLENBQW1DLEVBQUUsQ0FBUyxFQUFFLEVBQUUsQ0FDL0MsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUMscUJBQUUsUUFBUSxHQUFHLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDOzs7Ozs7Ozs7OztJQU9qRixnQkFBZ0IsQ0FDcEIsVUFBNEMsRUFBRSxRQUEwQyxFQUN4RixjQUEyQyxFQUFFLFVBQW9DOztRQUNuRixNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDOztRQUNoQyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQzs7UUFDOUMsTUFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQzs7UUFHM0YsSUFBSSxJQUFJLElBQUksTUFBTSxDQUFDLFdBQVcsS0FBSyxJQUFJLENBQUMsV0FBVyxFQUFFOztZQUNuRCxNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FDaEUsSUFBSSxFQUFFLE1BQU0scUJBQUUsTUFBTSxDQUFDLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQyxDQUFDO1lBQzlELElBQUksMkJBQTJCLEVBQUU7Z0JBQy9CLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQzthQUMxRDtpQkFBTTs7Z0JBRUwsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUN4QixNQUFNLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7YUFDM0M7O1lBR0QsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFO2dCQUNwQixJQUFJLENBQUMscUJBQXFCLENBQ3RCLFVBQVUsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7O2FBRzFFO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQzthQUM5RTtZQUVELElBQUksMkJBQTJCLEVBQUU7O2dCQUMvQixNQUFNLE1BQU0seUNBQUcsT0FBTyxHQUFHLE1BQU0sR0FBRztnQkFDbEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDMUU7U0FDRjthQUFNO1lBQ0wsSUFBSSxJQUFJLEVBQUU7Z0JBQ1IsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQzthQUN2RDtZQUVELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQzs7WUFFekQsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFO2dCQUNwQixJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQzs7YUFHN0Y7aUJBQU07Z0JBQ0wsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2FBQzFFO1NBQ0Y7Ozs7Ozs7O0lBR0ssMkJBQTJCLENBQy9CLElBQTRCLEVBQUUsTUFBOEIsRUFDNUQsSUFBcUM7UUFDdkMsUUFBUSxJQUFJLEVBQUU7WUFDWixLQUFLLFFBQVE7Z0JBQ1gsT0FBTyxJQUFJLENBQUM7WUFFZCxLQUFLLDJCQUEyQjtnQkFDOUIsT0FBTyxDQUFDLHlCQUF5QixDQUFDLElBQUksRUFBRSxNQUFNLENBQUM7b0JBQzNDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBRTFELEtBQUssY0FBYyxDQUFDO1lBQ3BCO2dCQUNFLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7U0FDbkQ7Ozs7Ozs7SUFHSyw2QkFBNkIsQ0FDakMsS0FBdUMsRUFBRSxPQUEyQjs7UUFDdEUsTUFBTSxRQUFRLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7O1FBQzFDLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFFdEIsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQXNDLEVBQUUsU0FBaUIsRUFBRSxFQUFFO1lBQzlFLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFO2dCQUNoQixJQUFJLENBQUMsNkJBQTZCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2FBQ25EO2lCQUFNLElBQUksT0FBTyxFQUFFO2dCQUNsQixJQUFJLENBQUMsNkJBQTZCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7YUFDbEY7aUJBQU07Z0JBQ0wsSUFBSSxDQUFDLDZCQUE2QixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQzthQUNoRDtTQUNGLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFO1lBQ2hCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDM0Q7YUFBTSxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFO1lBQ2xFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMvRTthQUFNO1lBQ0wsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMzRDs7Ozs7SUFHSyxzQkFBc0I7UUFDNUIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDO2FBQ2hDLElBQUksQ0FDRCxRQUFRLENBQUMsQ0FBQyxLQUFvQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFDdkYsS0FBSyxDQUFDLENBQUMsTUFBZSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQzs7Ozs7SUFHL0Msb0JBQW9CO1FBQzFCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQzthQUM5QixJQUFJLENBQ0QsU0FBUyxDQUFDLENBQUMsS0FBa0IsRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQztZQUMxQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDakQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztZQUMzRSxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7U0FDakMsQ0FBQyxDQUFDLENBQUMsRUFDZCxLQUFLLENBQUMsQ0FBQyxNQUFlLEVBQUUsRUFBRSxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDOzs7Ozs7Ozs7Ozs7O0lBWS9DLG1CQUFtQixDQUFDLFFBQXFDO1FBQy9ELElBQUksUUFBUSxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQzFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztTQUNsRDtRQUNELE9BQU8sRUFBRSxDQUFFLElBQUksQ0FBQyxDQUFDOzs7Ozs7Ozs7Ozs7SUFXWCx3QkFBd0IsQ0FBQyxRQUFxQztRQUNwRSxJQUFJLFFBQVEsS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRTtZQUMxQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztTQUN2RDtRQUNELE9BQU8sRUFBRSxDQUFFLElBQUksQ0FBQyxDQUFDOzs7Ozs7SUFHWCxjQUFjLENBQUMsTUFBOEI7O1FBQ25ELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDL0UsSUFBSSxDQUFDLFdBQVcsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUM7WUFBRSxPQUFPLEVBQUUsQ0FBRSxJQUFJLENBQUMsQ0FBQzs7UUFDL0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRTs7WUFDaEQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7O1lBQ3ZDLElBQUksVUFBVSxDQUFzQjtZQUNwQyxJQUFJLEtBQUssQ0FBQyxXQUFXLEVBQUU7Z0JBQ3JCLFVBQVUsR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzthQUN6RTtpQkFBTTtnQkFDTCxVQUFVLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzthQUM3RDtZQUNELE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1NBQ2pDLENBQUMsQ0FBQyxDQUFDO1FBQ0osT0FBTyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUM7Ozs7OztJQUdyQixtQkFBbUIsQ0FBQyxJQUE4Qjs7UUFDeEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7O1FBRXJDLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7YUFDekIsT0FBTyxFQUFFO2FBQ1QsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3pDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQztRQUU1RCxPQUFPLGNBQWMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUU7O1lBQ3JFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFOztnQkFDN0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDOztnQkFDdkMsSUFBSSxVQUFVLENBQXNCO2dCQUNwQyxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRTtvQkFDMUIsVUFBVSxHQUFHLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7aUJBQzlFO3FCQUFNO29CQUNMLFVBQVUsR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2lCQUM3RDtnQkFDRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQzthQUNqQyxDQUFDLENBQUMsQ0FBQztZQUNKLE9BQU8sY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUM7Ozs7OztJQUdDLHVCQUF1QixDQUFDLENBQXlCOztRQUV2RCxNQUFNLGdCQUFnQixHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUMvRSxJQUFJLENBQUMsZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsTUFBTSxLQUFLLENBQUM7WUFBRSxPQUFPLElBQUksQ0FBQztRQUNwRSxPQUFPLEVBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLEVBQUMsQ0FBQzs7Ozs7OztJQUdyQyxnQkFBZ0IsQ0FBQyxTQUFzQixFQUFFLElBQTRCOztRQUUzRSxNQUFNLGFBQWEsR0FBRyxJQUFJLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUN2RixJQUFJLENBQUMsYUFBYSxJQUFJLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUFFLE9BQU8sRUFBRSxDQUFFLElBQUksQ0FBQyxDQUFDOztRQUNuRSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFOztZQUNsRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQzs7WUFDckMsSUFBSSxVQUFVLENBQXNCO1lBQ3BDLElBQUksS0FBSyxDQUFDLGFBQWEsRUFBRTtnQkFDdkIsVUFBVTtvQkFDTixrQkFBa0IsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzthQUN0RjtpQkFBTTtnQkFDTCxVQUFVLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzthQUNqRjtZQUNELE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1NBQ2pDLENBQUMsQ0FBQyxDQUFDO1FBQ0osT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQVcsRUFBRSxFQUFFLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7Ozs7Ozs7SUFHOUQsVUFBVSxDQUNkLE1BQThCLEVBQzlCLHlCQUErQzs7UUFDakQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNoQyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxZQUFpQixFQUFPLEVBQUU7WUFDM0UsTUFBTSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUM7WUFDcEMsTUFBTSxDQUFDLElBQUkscUJBQU8sTUFBTSxDQUFDLElBQUksRUFDWCwwQkFBMEIsQ0FBQyxNQUFNLEVBQUUseUJBQXlCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN6RixPQUFPLElBQUksQ0FBQztTQUNiLENBQUMsQ0FBQyxDQUFDOzs7Ozs7O0lBR0UsV0FBVyxDQUFDLE9BQW9CLEVBQUUsTUFBOEI7O1FBQ3RFLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEMsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNyQixPQUFPLEVBQUUsQ0FBRSxFQUFFLENBQUMsQ0FBQztTQUNoQjtRQUNELElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7O1lBQ3JCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFVLEVBQUUsRUFBRTtnQkFDcEUsT0FBTyxFQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFDLENBQUM7YUFDdkIsQ0FBQyxDQUFDLENBQUM7U0FDTDs7UUFDRCxNQUFNLElBQUksR0FBdUIsRUFBRSxDQUFDOztRQUNwQyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBVyxFQUFFLEVBQUU7WUFDakUsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBVSxFQUFFLEVBQUU7Z0JBQ3BFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7Z0JBQ2xCLE9BQU8sS0FBSyxDQUFDO2FBQ2QsQ0FBQyxDQUFDLENBQUM7U0FDTCxDQUFDLENBQUMsQ0FBQztRQUNKLE9BQU8saUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzs7Ozs7O0lBR2pELFdBQVcsQ0FBQyxjQUFtQixFQUFFLE1BQThCOztRQUNyRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN2RCxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0Qsa0JBQWtCLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzs7Ozs7OztJQUd0RSxRQUFRLENBQUMsS0FBVSxFQUFFLFFBQWdDOztRQUMzRCxNQUFNLE1BQU0sR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQzs7UUFDN0MsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUN2RSxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7O0NBRTlCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0QsU0FBUyxtQkFBbUIsQ0FBQyxRQUFnQztJQUMzRCxJQUFJLENBQUMsUUFBUTtRQUFFLE9BQU8sSUFBSSxDQUFDO0lBRTNCLEtBQUssSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUU7O1FBQzdDLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUM7UUFDNUIsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLGFBQWE7WUFBRSxPQUFPLEtBQUssQ0FBQyxhQUFhLENBQUM7S0FDOUQ7SUFFRCxPQUFPLElBQUksQ0FBQztDQUNiIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0luamVjdG9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgZnJvbSwgb2YgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y29uY2F0TWFwLCBldmVyeSwgZmlyc3QsIGxhc3QsIG1hcCwgbWVyZ2VNYXAsIHJlZHVjZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0xvYWRlZFJvdXRlckNvbmZpZywgUmVzb2x2ZURhdGEsIFJ1bkd1YXJkc0FuZFJlc29sdmVyc30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtBY3RpdmF0aW9uU3RhcnQsIENoaWxkQWN0aXZhdGlvblN0YXJ0LCBFdmVudH0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzLCBPdXRsZXRDb250ZXh0fSBmcm9tICcuL3JvdXRlcl9vdXRsZXRfY29udGV4dCc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIFJvdXRlclN0YXRlU25hcHNob3QsIGVxdWFsUGFyYW1zQW5kVXJsU2VnbWVudHMsIGluaGVyaXRlZFBhcmFtc0RhdGFSZXNvbHZlfSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge2FuZE9ic2VydmFibGVzLCBmb3JFYWNoLCBzaGFsbG93RXF1YWwsIHdyYXBJbnRvT2JzZXJ2YWJsZX0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcbmltcG9ydCB7VHJlZU5vZGUsIG5vZGVDaGlsZHJlbkFzTWFwfSBmcm9tICcuL3V0aWxzL3RyZWUnO1xuXG5jbGFzcyBDYW5BY3RpdmF0ZSB7XG4gIHJlYWRvbmx5IHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90O1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcGF0aDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdFtdKSB7XG4gICAgdGhpcy5yb3V0ZSA9IHRoaXMucGF0aFt0aGlzLnBhdGgubGVuZ3RoIC0gMV07XG4gIH1cbn1cblxuY2xhc3MgQ2FuRGVhY3RpdmF0ZSB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjb21wb25lbnQ6IE9iamVjdHxudWxsLCBwdWJsaWMgcm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpIHt9XG59XG5cbi8qKlxuICogVGhpcyBjbGFzcyBidW5kbGVzIHRoZSBhY3Rpb25zIGludm9sdmVkIGluIHByZWFjdGl2YXRpb24gb2YgYSByb3V0ZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFByZUFjdGl2YXRpb24ge1xuICBwcml2YXRlIGNhbkFjdGl2YXRlQ2hlY2tzOiBDYW5BY3RpdmF0ZVtdID0gW107XG4gIHByaXZhdGUgY2FuRGVhY3RpdmF0ZUNoZWNrczogQ2FuRGVhY3RpdmF0ZVtdID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGZ1dHVyZTogUm91dGVyU3RhdGVTbmFwc2hvdCwgcHJpdmF0ZSBjdXJyOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxuICAgICAgcHJpdmF0ZSBtb2R1bGVJbmplY3RvcjogSW5qZWN0b3IsIHByaXZhdGUgZm9yd2FyZEV2ZW50PzogKGV2dDogRXZlbnQpID0+IHZvaWQpIHt9XG5cbiAgaW5pdGlhbGl6ZShwYXJlbnRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk6IHZvaWQge1xuICAgIGNvbnN0IGZ1dHVyZVJvb3QgPSB0aGlzLmZ1dHVyZS5fcm9vdDtcbiAgICBjb25zdCBjdXJyUm9vdCA9IHRoaXMuY3VyciA/IHRoaXMuY3Vyci5fcm9vdCA6IG51bGw7XG4gICAgdGhpcy5zZXR1cENoaWxkUm91dGVHdWFyZHMoZnV0dXJlUm9vdCwgY3VyclJvb3QsIHBhcmVudENvbnRleHRzLCBbZnV0dXJlUm9vdC52YWx1ZV0pO1xuICB9XG5cbiAgY2hlY2tHdWFyZHMoKTogT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gICAgaWYgKCF0aGlzLmlzRGVhY3RpdmF0aW5nKCkgJiYgIXRoaXMuaXNBY3RpdmF0aW5nKCkpIHtcbiAgICAgIHJldHVybiBvZiAodHJ1ZSk7XG4gICAgfVxuICAgIGNvbnN0IGNhbkRlYWN0aXZhdGUkID0gdGhpcy5ydW5DYW5EZWFjdGl2YXRlQ2hlY2tzKCk7XG4gICAgcmV0dXJuIGNhbkRlYWN0aXZhdGUkLnBpcGUobWVyZ2VNYXAoXG4gICAgICAgIChjYW5EZWFjdGl2YXRlOiBib29sZWFuKSA9PiBjYW5EZWFjdGl2YXRlID8gdGhpcy5ydW5DYW5BY3RpdmF0ZUNoZWNrcygpIDogb2YgKGZhbHNlKSkpO1xuICB9XG5cbiAgcmVzb2x2ZURhdGEocGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogJ2VtcHR5T25seSd8J2Fsd2F5cycpOiBPYnNlcnZhYmxlPGFueT4ge1xuICAgIGlmICghdGhpcy5pc0FjdGl2YXRpbmcoKSkgcmV0dXJuIG9mIChudWxsKTtcbiAgICByZXR1cm4gZnJvbSh0aGlzLmNhbkFjdGl2YXRlQ2hlY2tzKVxuICAgICAgICAucGlwZShcbiAgICAgICAgICAgIGNvbmNhdE1hcChcbiAgICAgICAgICAgICAgICAoY2hlY2s6IENhbkFjdGl2YXRlKSA9PiB0aGlzLnJ1blJlc29sdmUoY2hlY2sucm91dGUsIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kpKSxcbiAgICAgICAgICAgIHJlZHVjZSgoXzogYW55LCBfXzogYW55KSA9PiBfKSk7XG4gIH1cblxuICBpc0RlYWN0aXZhdGluZygpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMuY2FuRGVhY3RpdmF0ZUNoZWNrcy5sZW5ndGggIT09IDA7IH1cblxuICBpc0FjdGl2YXRpbmcoKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLmNhbkFjdGl2YXRlQ2hlY2tzLmxlbmd0aCAhPT0gMDsgfVxuXG5cbiAgLyoqXG4gICAqIEl0ZXJhdGVzIG92ZXIgY2hpbGQgcm91dGVzIGFuZCBjYWxscyByZWN1cnNpdmUgYHNldHVwUm91dGVHdWFyZHNgIHRvIGdldCBgdGhpc2AgaW5zdGFuY2UgaW5cbiAgICogcHJvcGVyIHN0YXRlIHRvIHJ1biBgY2hlY2tHdWFyZHMoKWAgbWV0aG9kLlxuICAgKi9cbiAgcHJpdmF0ZSBzZXR1cENoaWxkUm91dGVHdWFyZHMoXG4gICAgICBmdXR1cmVOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PiwgY3Vyck5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+fG51bGwsXG4gICAgICBjb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0c3xudWxsLCBmdXR1cmVQYXRoOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90W10pOiB2b2lkIHtcbiAgICBjb25zdCBwcmV2Q2hpbGRyZW4gPSBub2RlQ2hpbGRyZW5Bc01hcChjdXJyTm9kZSk7XG5cbiAgICAvLyBQcm9jZXNzIHRoZSBjaGlsZHJlbiBvZiB0aGUgZnV0dXJlIHJvdXRlXG4gICAgZnV0dXJlTm9kZS5jaGlsZHJlbi5mb3JFYWNoKGMgPT4ge1xuICAgICAgdGhpcy5zZXR1cFJvdXRlR3VhcmRzKFxuICAgICAgICAgIGMsIHByZXZDaGlsZHJlbltjLnZhbHVlLm91dGxldF0sIGNvbnRleHRzLCBmdXR1cmVQYXRoLmNvbmNhdChbYy52YWx1ZV0pKTtcbiAgICAgIGRlbGV0ZSBwcmV2Q2hpbGRyZW5bYy52YWx1ZS5vdXRsZXRdO1xuICAgIH0pO1xuXG4gICAgLy8gUHJvY2VzcyBhbnkgY2hpbGRyZW4gbGVmdCBmcm9tIHRoZSBjdXJyZW50IHJvdXRlIChub3QgYWN0aXZlIGZvciB0aGUgZnV0dXJlIHJvdXRlKVxuICAgIGZvckVhY2goXG4gICAgICAgIHByZXZDaGlsZHJlbiwgKHY6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+LCBrOiBzdHJpbmcpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVhY3RpdmF0ZVJvdXRlQW5kSXRzQ2hpbGRyZW4odiwgY29udGV4dHMgIS5nZXRDb250ZXh0KGspKSk7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZXMgb3ZlciBjaGlsZCByb3V0ZXMgYW5kIGNhbGxzIHJlY3Vyc2l2ZSBgc2V0dXBSb3V0ZUd1YXJkc2AgdG8gZ2V0IGB0aGlzYCBpbnN0YW5jZSBpblxuICAgKiBwcm9wZXIgc3RhdGUgdG8gcnVuIGBjaGVja0d1YXJkcygpYCBtZXRob2QuXG4gICAqL1xuICBwcml2YXRlIHNldHVwUm91dGVHdWFyZHMoXG4gICAgICBmdXR1cmVOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PiwgY3Vyck5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+LFxuICAgICAgcGFyZW50Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHN8bnVsbCwgZnV0dXJlUGF0aDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdFtdKTogdm9pZCB7XG4gICAgY29uc3QgZnV0dXJlID0gZnV0dXJlTm9kZS52YWx1ZTtcbiAgICBjb25zdCBjdXJyID0gY3Vyck5vZGUgPyBjdXJyTm9kZS52YWx1ZSA6IG51bGw7XG4gICAgY29uc3QgY29udGV4dCA9IHBhcmVudENvbnRleHRzID8gcGFyZW50Q29udGV4dHMuZ2V0Q29udGV4dChmdXR1cmVOb2RlLnZhbHVlLm91dGxldCkgOiBudWxsO1xuXG4gICAgLy8gcmV1c2luZyB0aGUgbm9kZVxuICAgIGlmIChjdXJyICYmIGZ1dHVyZS5yb3V0ZUNvbmZpZyA9PT0gY3Vyci5yb3V0ZUNvbmZpZykge1xuICAgICAgY29uc3Qgc2hvdWxkUnVuR3VhcmRzQW5kUmVzb2x2ZXJzID0gdGhpcy5zaG91bGRSdW5HdWFyZHNBbmRSZXNvbHZlcnMoXG4gICAgICAgICAgY3VyciwgZnV0dXJlLCBmdXR1cmUucm91dGVDb25maWcgIS5ydW5HdWFyZHNBbmRSZXNvbHZlcnMpO1xuICAgICAgaWYgKHNob3VsZFJ1bkd1YXJkc0FuZFJlc29sdmVycykge1xuICAgICAgICB0aGlzLmNhbkFjdGl2YXRlQ2hlY2tzLnB1c2gobmV3IENhbkFjdGl2YXRlKGZ1dHVyZVBhdGgpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHdlIG5lZWQgdG8gc2V0IHRoZSBkYXRhXG4gICAgICAgIGZ1dHVyZS5kYXRhID0gY3Vyci5kYXRhO1xuICAgICAgICBmdXR1cmUuX3Jlc29sdmVkRGF0YSA9IGN1cnIuX3Jlc29sdmVkRGF0YTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgd2UgaGF2ZSBhIGNvbXBvbmVudCwgd2UgbmVlZCB0byBnbyB0aHJvdWdoIGFuIG91dGxldC5cbiAgICAgIGlmIChmdXR1cmUuY29tcG9uZW50KSB7XG4gICAgICAgIHRoaXMuc2V0dXBDaGlsZFJvdXRlR3VhcmRzKFxuICAgICAgICAgICAgZnV0dXJlTm9kZSwgY3Vyck5vZGUsIGNvbnRleHQgPyBjb250ZXh0LmNoaWxkcmVuIDogbnVsbCwgZnV0dXJlUGF0aCk7XG5cbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIGNvbXBvbmVudGxlc3Mgcm91dGUsIHdlIHJlY3Vyc2UgYnV0IGtlZXAgdGhlIHNhbWUgb3V0bGV0IG1hcC5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2V0dXBDaGlsZFJvdXRlR3VhcmRzKGZ1dHVyZU5vZGUsIGN1cnJOb2RlLCBwYXJlbnRDb250ZXh0cywgZnV0dXJlUGF0aCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzaG91bGRSdW5HdWFyZHNBbmRSZXNvbHZlcnMpIHtcbiAgICAgICAgY29uc3Qgb3V0bGV0ID0gY29udGV4dCAhLm91dGxldCAhO1xuICAgICAgICB0aGlzLmNhbkRlYWN0aXZhdGVDaGVja3MucHVzaChuZXcgQ2FuRGVhY3RpdmF0ZShvdXRsZXQuY29tcG9uZW50LCBjdXJyKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChjdXJyKSB7XG4gICAgICAgIHRoaXMuZGVhY3RpdmF0ZVJvdXRlQW5kSXRzQ2hpbGRyZW4oY3Vyck5vZGUsIGNvbnRleHQpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmNhbkFjdGl2YXRlQ2hlY2tzLnB1c2gobmV3IENhbkFjdGl2YXRlKGZ1dHVyZVBhdGgpKTtcbiAgICAgIC8vIElmIHdlIGhhdmUgYSBjb21wb25lbnQsIHdlIG5lZWQgdG8gZ28gdGhyb3VnaCBhbiBvdXRsZXQuXG4gICAgICBpZiAoZnV0dXJlLmNvbXBvbmVudCkge1xuICAgICAgICB0aGlzLnNldHVwQ2hpbGRSb3V0ZUd1YXJkcyhmdXR1cmVOb2RlLCBudWxsLCBjb250ZXh0ID8gY29udGV4dC5jaGlsZHJlbiA6IG51bGwsIGZ1dHVyZVBhdGgpO1xuXG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSBjb21wb25lbnRsZXNzIHJvdXRlLCB3ZSByZWN1cnNlIGJ1dCBrZWVwIHRoZSBzYW1lIG91dGxldCBtYXAuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnNldHVwQ2hpbGRSb3V0ZUd1YXJkcyhmdXR1cmVOb2RlLCBudWxsLCBwYXJlbnRDb250ZXh0cywgZnV0dXJlUGF0aCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzaG91bGRSdW5HdWFyZHNBbmRSZXNvbHZlcnMoXG4gICAgICBjdXJyOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBmdXR1cmU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsXG4gICAgICBtb2RlOiBSdW5HdWFyZHNBbmRSZXNvbHZlcnN8dW5kZWZpbmVkKTogYm9vbGVhbiB7XG4gICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICBjYXNlICdhbHdheXMnOlxuICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgICAgY2FzZSAncGFyYW1zT3JRdWVyeVBhcmFtc0NoYW5nZSc6XG4gICAgICAgIHJldHVybiAhZXF1YWxQYXJhbXNBbmRVcmxTZWdtZW50cyhjdXJyLCBmdXR1cmUpIHx8XG4gICAgICAgICAgICAhc2hhbGxvd0VxdWFsKGN1cnIucXVlcnlQYXJhbXMsIGZ1dHVyZS5xdWVyeVBhcmFtcyk7XG5cbiAgICAgIGNhc2UgJ3BhcmFtc0NoYW5nZSc6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gIWVxdWFsUGFyYW1zQW5kVXJsU2VnbWVudHMoY3VyciwgZnV0dXJlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKFxuICAgICAgcm91dGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+LCBjb250ZXh0OiBPdXRsZXRDb250ZXh0fG51bGwpOiB2b2lkIHtcbiAgICBjb25zdCBjaGlsZHJlbiA9IG5vZGVDaGlsZHJlbkFzTWFwKHJvdXRlKTtcbiAgICBjb25zdCByID0gcm91dGUudmFsdWU7XG5cbiAgICBmb3JFYWNoKGNoaWxkcmVuLCAobm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4sIGNoaWxkTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICBpZiAoIXIuY29tcG9uZW50KSB7XG4gICAgICAgIHRoaXMuZGVhY3RpdmF0ZVJvdXRlQW5kSXRzQ2hpbGRyZW4obm9kZSwgY29udGV4dCk7XG4gICAgICB9IGVsc2UgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5kZWFjdGl2YXRlUm91dGVBbmRJdHNDaGlsZHJlbihub2RlLCBjb250ZXh0LmNoaWxkcmVuLmdldENvbnRleHQoY2hpbGROYW1lKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKG5vZGUsIG51bGwpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKCFyLmNvbXBvbmVudCkge1xuICAgICAgdGhpcy5jYW5EZWFjdGl2YXRlQ2hlY2tzLnB1c2gobmV3IENhbkRlYWN0aXZhdGUobnVsbCwgcikpO1xuICAgIH0gZWxzZSBpZiAoY29udGV4dCAmJiBjb250ZXh0Lm91dGxldCAmJiBjb250ZXh0Lm91dGxldC5pc0FjdGl2YXRlZCkge1xuICAgICAgdGhpcy5jYW5EZWFjdGl2YXRlQ2hlY2tzLnB1c2gobmV3IENhbkRlYWN0aXZhdGUoY29udGV4dC5vdXRsZXQuY29tcG9uZW50LCByKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY2FuRGVhY3RpdmF0ZUNoZWNrcy5wdXNoKG5ldyBDYW5EZWFjdGl2YXRlKG51bGwsIHIpKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJ1bkNhbkRlYWN0aXZhdGVDaGVja3MoKTogT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIGZyb20odGhpcy5jYW5EZWFjdGl2YXRlQ2hlY2tzKVxuICAgICAgICAucGlwZShcbiAgICAgICAgICAgIG1lcmdlTWFwKChjaGVjazogQ2FuRGVhY3RpdmF0ZSkgPT4gdGhpcy5ydW5DYW5EZWFjdGl2YXRlKGNoZWNrLmNvbXBvbmVudCwgY2hlY2sucm91dGUpKSxcbiAgICAgICAgICAgIGV2ZXJ5KChyZXN1bHQ6IGJvb2xlYW4pID0+IHJlc3VsdCA9PT0gdHJ1ZSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBydW5DYW5BY3RpdmF0ZUNoZWNrcygpOiBPYnNlcnZhYmxlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gZnJvbSh0aGlzLmNhbkFjdGl2YXRlQ2hlY2tzKVxuICAgICAgICAucGlwZShcbiAgICAgICAgICAgIGNvbmNhdE1hcCgoY2hlY2s6IENhbkFjdGl2YXRlKSA9PiBhbmRPYnNlcnZhYmxlcyhmcm9tKFtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmlyZUNoaWxkQWN0aXZhdGlvblN0YXJ0KGNoZWNrLnJvdXRlLnBhcmVudCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZpcmVBY3RpdmF0aW9uU3RhcnQoY2hlY2sucm91dGUpLCB0aGlzLnJ1bkNhbkFjdGl2YXRlQ2hpbGQoY2hlY2sucGF0aCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJ1bkNhbkFjdGl2YXRlKGNoZWNrLnJvdXRlKVxuICAgICAgICAgICAgICAgICAgICAgIF0pKSksXG4gICAgICAgICAgICBldmVyeSgocmVzdWx0OiBib29sZWFuKSA9PiByZXN1bHQgPT09IHRydWUpKTtcbiAgICAvLyB0aGlzLmZpcmVDaGlsZEFjdGl2YXRpb25TdGFydChjaGVjay5wYXRoKSxcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIHNob3VsZCBmaXJlIG9mZiBgQWN0aXZhdGlvblN0YXJ0YCBldmVudHMgZm9yIGVhY2ggcm91dGUgYmVpbmcgYWN0aXZhdGVkIGF0IHRoaXNcbiAgICogbGV2ZWwuXG4gICAqIEluIG90aGVyIHdvcmRzLCBpZiB5b3UncmUgYWN0aXZhdGluZyBgYWAgYW5kIGBiYCBiZWxvdywgYHBhdGhgIHdpbGwgY29udGFpbiB0aGVcbiAgICogYEFjdGl2YXRlZFJvdXRlU25hcHNob3RgcyBmb3IgYm90aCBhbmQgd2Ugd2lsbCBmaXJlIGBBY3RpdmF0aW9uU3RhcnRgIGZvciBib3RoLiBBbHdheXNcbiAgICogcmV0dXJuXG4gICAqIGB0cnVlYCBzbyBjaGVja3MgY29udGludWUgdG8gcnVuLlxuICAgKi9cbiAgcHJpdmF0ZSBmaXJlQWN0aXZhdGlvblN0YXJ0KHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90fG51bGwpOiBPYnNlcnZhYmxlPGJvb2xlYW4+IHtcbiAgICBpZiAoc25hcHNob3QgIT09IG51bGwgJiYgdGhpcy5mb3J3YXJkRXZlbnQpIHtcbiAgICAgIHRoaXMuZm9yd2FyZEV2ZW50KG5ldyBBY3RpdmF0aW9uU3RhcnQoc25hcHNob3QpKTtcbiAgICB9XG4gICAgcmV0dXJuIG9mICh0cnVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIHNob3VsZCBmaXJlIG9mZiBgQ2hpbGRBY3RpdmF0aW9uU3RhcnRgIGV2ZW50cyBmb3IgZWFjaCByb3V0ZSBiZWluZyBhY3RpdmF0ZWQgYXQgdGhpc1xuICAgKiBsZXZlbC5cbiAgICogSW4gb3RoZXIgd29yZHMsIGlmIHlvdSdyZSBhY3RpdmF0aW5nIGBhYCBhbmQgYGJgIGJlbG93LCBgcGF0aGAgd2lsbCBjb250YWluIHRoZVxuICAgKiBgQWN0aXZhdGVkUm91dGVTbmFwc2hvdGBzIGZvciBib3RoIGFuZCB3ZSB3aWxsIGZpcmUgYENoaWxkQWN0aXZhdGlvblN0YXJ0YCBmb3IgYm90aC4gQWx3YXlzXG4gICAqIHJldHVyblxuICAgKiBgdHJ1ZWAgc28gY2hlY2tzIGNvbnRpbnVlIHRvIHJ1bi5cbiAgICovXG4gIHByaXZhdGUgZmlyZUNoaWxkQWN0aXZhdGlvblN0YXJ0KHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90fG51bGwpOiBPYnNlcnZhYmxlPGJvb2xlYW4+IHtcbiAgICBpZiAoc25hcHNob3QgIT09IG51bGwgJiYgdGhpcy5mb3J3YXJkRXZlbnQpIHtcbiAgICAgIHRoaXMuZm9yd2FyZEV2ZW50KG5ldyBDaGlsZEFjdGl2YXRpb25TdGFydChzbmFwc2hvdCkpO1xuICAgIH1cbiAgICByZXR1cm4gb2YgKHRydWUpO1xuICB9XG5cbiAgcHJpdmF0ZSBydW5DYW5BY3RpdmF0ZShmdXR1cmU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBPYnNlcnZhYmxlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBjYW5BY3RpdmF0ZSA9IGZ1dHVyZS5yb3V0ZUNvbmZpZyA/IGZ1dHVyZS5yb3V0ZUNvbmZpZy5jYW5BY3RpdmF0ZSA6IG51bGw7XG4gICAgaWYgKCFjYW5BY3RpdmF0ZSB8fCBjYW5BY3RpdmF0ZS5sZW5ndGggPT09IDApIHJldHVybiBvZiAodHJ1ZSk7XG4gICAgY29uc3Qgb2JzID0gZnJvbShjYW5BY3RpdmF0ZSkucGlwZShtYXAoKGM6IGFueSkgPT4ge1xuICAgICAgY29uc3QgZ3VhcmQgPSB0aGlzLmdldFRva2VuKGMsIGZ1dHVyZSk7XG4gICAgICBsZXQgb2JzZXJ2YWJsZTogT2JzZXJ2YWJsZTxib29sZWFuPjtcbiAgICAgIGlmIChndWFyZC5jYW5BY3RpdmF0ZSkge1xuICAgICAgICBvYnNlcnZhYmxlID0gd3JhcEludG9PYnNlcnZhYmxlKGd1YXJkLmNhbkFjdGl2YXRlKGZ1dHVyZSwgdGhpcy5mdXR1cmUpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9ic2VydmFibGUgPSB3cmFwSW50b09ic2VydmFibGUoZ3VhcmQoZnV0dXJlLCB0aGlzLmZ1dHVyZSkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9ic2VydmFibGUucGlwZShmaXJzdCgpKTtcbiAgICB9KSk7XG4gICAgcmV0dXJuIGFuZE9ic2VydmFibGVzKG9icyk7XG4gIH1cblxuICBwcml2YXRlIHJ1bkNhbkFjdGl2YXRlQ2hpbGQocGF0aDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdFtdKTogT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gICAgY29uc3QgZnV0dXJlID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdO1xuXG4gICAgY29uc3QgY2FuQWN0aXZhdGVDaGlsZEd1YXJkcyA9IHBhdGguc2xpY2UoMCwgcGF0aC5sZW5ndGggLSAxKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJldmVyc2UoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChwID0+IHRoaXMuZXh0cmFjdENhbkFjdGl2YXRlQ2hpbGQocCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKF8gPT4gXyAhPT0gbnVsbCk7XG5cbiAgICByZXR1cm4gYW5kT2JzZXJ2YWJsZXMoZnJvbShjYW5BY3RpdmF0ZUNoaWxkR3VhcmRzKS5waXBlKG1hcCgoZDogYW55KSA9PiB7XG4gICAgICBjb25zdCBvYnMgPSBmcm9tKGQuZ3VhcmRzKS5waXBlKG1hcCgoYzogYW55KSA9PiB7XG4gICAgICAgIGNvbnN0IGd1YXJkID0gdGhpcy5nZXRUb2tlbihjLCBkLm5vZGUpO1xuICAgICAgICBsZXQgb2JzZXJ2YWJsZTogT2JzZXJ2YWJsZTxib29sZWFuPjtcbiAgICAgICAgaWYgKGd1YXJkLmNhbkFjdGl2YXRlQ2hpbGQpIHtcbiAgICAgICAgICBvYnNlcnZhYmxlID0gd3JhcEludG9PYnNlcnZhYmxlKGd1YXJkLmNhbkFjdGl2YXRlQ2hpbGQoZnV0dXJlLCB0aGlzLmZ1dHVyZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9ic2VydmFibGUgPSB3cmFwSW50b09ic2VydmFibGUoZ3VhcmQoZnV0dXJlLCB0aGlzLmZ1dHVyZSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvYnNlcnZhYmxlLnBpcGUoZmlyc3QoKSk7XG4gICAgICB9KSk7XG4gICAgICByZXR1cm4gYW5kT2JzZXJ2YWJsZXMob2JzKTtcbiAgICB9KSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0Q2FuQWN0aXZhdGVDaGlsZChwOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTpcbiAgICAgIHtub2RlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBndWFyZHM6IGFueVtdfXxudWxsIHtcbiAgICBjb25zdCBjYW5BY3RpdmF0ZUNoaWxkID0gcC5yb3V0ZUNvbmZpZyA/IHAucm91dGVDb25maWcuY2FuQWN0aXZhdGVDaGlsZCA6IG51bGw7XG4gICAgaWYgKCFjYW5BY3RpdmF0ZUNoaWxkIHx8IGNhbkFjdGl2YXRlQ2hpbGQubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4ge25vZGU6IHAsIGd1YXJkczogY2FuQWN0aXZhdGVDaGlsZH07XG4gIH1cblxuICBwcml2YXRlIHJ1bkNhbkRlYWN0aXZhdGUoY29tcG9uZW50OiBPYmplY3R8bnVsbCwgY3VycjogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6XG4gICAgICBPYnNlcnZhYmxlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBjYW5EZWFjdGl2YXRlID0gY3VyciAmJiBjdXJyLnJvdXRlQ29uZmlnID8gY3Vyci5yb3V0ZUNvbmZpZy5jYW5EZWFjdGl2YXRlIDogbnVsbDtcbiAgICBpZiAoIWNhbkRlYWN0aXZhdGUgfHwgY2FuRGVhY3RpdmF0ZS5sZW5ndGggPT09IDApIHJldHVybiBvZiAodHJ1ZSk7XG4gICAgY29uc3QgY2FuRGVhY3RpdmF0ZSQgPSBmcm9tKGNhbkRlYWN0aXZhdGUpLnBpcGUobWVyZ2VNYXAoKGM6IGFueSkgPT4ge1xuICAgICAgY29uc3QgZ3VhcmQgPSB0aGlzLmdldFRva2VuKGMsIGN1cnIpO1xuICAgICAgbGV0IG9ic2VydmFibGU6IE9ic2VydmFibGU8Ym9vbGVhbj47XG4gICAgICBpZiAoZ3VhcmQuY2FuRGVhY3RpdmF0ZSkge1xuICAgICAgICBvYnNlcnZhYmxlID1cbiAgICAgICAgICAgIHdyYXBJbnRvT2JzZXJ2YWJsZShndWFyZC5jYW5EZWFjdGl2YXRlKGNvbXBvbmVudCwgY3VyciwgdGhpcy5jdXJyLCB0aGlzLmZ1dHVyZSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb2JzZXJ2YWJsZSA9IHdyYXBJbnRvT2JzZXJ2YWJsZShndWFyZChjb21wb25lbnQsIGN1cnIsIHRoaXMuY3VyciwgdGhpcy5mdXR1cmUpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYnNlcnZhYmxlLnBpcGUoZmlyc3QoKSk7XG4gICAgfSkpO1xuICAgIHJldHVybiBjYW5EZWFjdGl2YXRlJC5waXBlKGV2ZXJ5KChyZXN1bHQ6IGFueSkgPT4gcmVzdWx0ID09PSB0cnVlKSk7XG4gIH1cblxuICBwcml2YXRlIHJ1blJlc29sdmUoXG4gICAgICBmdXR1cmU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsXG4gICAgICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiAnZW1wdHlPbmx5J3wnYWx3YXlzJyk6IE9ic2VydmFibGU8YW55PiB7XG4gICAgY29uc3QgcmVzb2x2ZSA9IGZ1dHVyZS5fcmVzb2x2ZTtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlTm9kZShyZXNvbHZlLCBmdXR1cmUpLnBpcGUobWFwKChyZXNvbHZlZERhdGE6IGFueSk6IGFueSA9PiB7XG4gICAgICBmdXR1cmUuX3Jlc29sdmVkRGF0YSA9IHJlc29sdmVkRGF0YTtcbiAgICAgIGZ1dHVyZS5kYXRhID0gey4uLmZ1dHVyZS5kYXRhLFxuICAgICAgICAgICAgICAgICAgICAgLi4uaW5oZXJpdGVkUGFyYW1zRGF0YVJlc29sdmUoZnV0dXJlLCBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5KS5yZXNvbHZlfTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZU5vZGUocmVzb2x2ZTogUmVzb2x2ZURhdGEsIGZ1dHVyZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IE9ic2VydmFibGU8YW55PiB7XG4gICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHJlc29sdmUpO1xuICAgIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG9mICh7fSk7XG4gICAgfVxuICAgIGlmIChrZXlzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgY29uc3Qga2V5ID0ga2V5c1swXTtcbiAgICAgIHJldHVybiB0aGlzLmdldFJlc29sdmVyKHJlc29sdmVba2V5XSwgZnV0dXJlKS5waXBlKG1hcCgodmFsdWU6IGFueSkgPT4ge1xuICAgICAgICByZXR1cm4ge1trZXldOiB2YWx1ZX07XG4gICAgICB9KSk7XG4gICAgfVxuICAgIGNvbnN0IGRhdGE6IHtbazogc3RyaW5nXTogYW55fSA9IHt9O1xuICAgIGNvbnN0IHJ1bm5pbmdSZXNvbHZlcnMkID0gZnJvbShrZXlzKS5waXBlKG1lcmdlTWFwKChrZXk6IHN0cmluZykgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVzb2x2ZXIocmVzb2x2ZVtrZXldLCBmdXR1cmUpLnBpcGUobWFwKCh2YWx1ZTogYW55KSA9PiB7XG4gICAgICAgIGRhdGFba2V5XSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9KSk7XG4gICAgfSkpO1xuICAgIHJldHVybiBydW5uaW5nUmVzb2x2ZXJzJC5waXBlKGxhc3QoKSwgbWFwKCgpID0+IGRhdGEpKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVzb2x2ZXIoaW5qZWN0aW9uVG9rZW46IGFueSwgZnV0dXJlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgICBjb25zdCByZXNvbHZlciA9IHRoaXMuZ2V0VG9rZW4oaW5qZWN0aW9uVG9rZW4sIGZ1dHVyZSk7XG4gICAgcmV0dXJuIHJlc29sdmVyLnJlc29sdmUgPyB3cmFwSW50b09ic2VydmFibGUocmVzb2x2ZXIucmVzb2x2ZShmdXR1cmUsIHRoaXMuZnV0dXJlKSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JhcEludG9PYnNlcnZhYmxlKHJlc29sdmVyKGZ1dHVyZSwgdGhpcy5mdXR1cmUpKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VG9rZW4odG9rZW46IGFueSwgc25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBhbnkge1xuICAgIGNvbnN0IGNvbmZpZyA9IGNsb3Nlc3RMb2FkZWRDb25maWcoc25hcHNob3QpO1xuICAgIGNvbnN0IGluamVjdG9yID0gY29uZmlnID8gY29uZmlnLm1vZHVsZS5pbmplY3RvciA6IHRoaXMubW9kdWxlSW5qZWN0b3I7XG4gICAgcmV0dXJuIGluamVjdG9yLmdldCh0b2tlbik7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBjbG9zZXN0TG9hZGVkQ29uZmlnKHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogTG9hZGVkUm91dGVyQ29uZmlnfG51bGwge1xuICBpZiAoIXNuYXBzaG90KSByZXR1cm4gbnVsbDtcblxuICBmb3IgKGxldCBzID0gc25hcHNob3QucGFyZW50OyBzOyBzID0gcy5wYXJlbnQpIHtcbiAgICBjb25zdCByb3V0ZSA9IHMucm91dGVDb25maWc7XG4gICAgaWYgKHJvdXRlICYmIHJvdXRlLl9sb2FkZWRDb25maWcpIHJldHVybiByb3V0ZS5fbG9hZGVkQ29uZmlnO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG4iXX0=