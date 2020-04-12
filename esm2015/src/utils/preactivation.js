/**
 * @fileoverview added by tsickle
 * Generated from: packages/router/src/utils/preactivation.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { equalParamsAndUrlSegments } from '../router_state';
import { equalPath } from '../url_tree';
import { forEach, shallowEqual } from '../utils/collection';
import { nodeChildrenAsMap } from '../utils/tree';
export class CanActivate {
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
export class CanDeactivate {
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
 * @param {?} future
 * @param {?} curr
 * @param {?} parentContexts
 * @return {?}
 */
export function getAllRouteGuards(future, curr, parentContexts) {
    /** @type {?} */
    const futureRoot = future._root;
    /** @type {?} */
    const currRoot = curr ? curr._root : null;
    return getChildRouteGuards(futureRoot, currRoot, parentContexts, [futureRoot.value]);
}
/**
 * @param {?} p
 * @return {?}
 */
export function getCanActivateChild(p) {
    /** @type {?} */
    const canActivateChild = p.routeConfig ? p.routeConfig.canActivateChild : null;
    if (!canActivateChild || canActivateChild.length === 0)
        return null;
    return { node: p, guards: canActivateChild };
}
/**
 * @param {?} token
 * @param {?} snapshot
 * @param {?} moduleInjector
 * @return {?}
 */
export function getToken(token, snapshot, moduleInjector) {
    /** @type {?} */
    const config = getClosestLoadedConfig(snapshot);
    /** @type {?} */
    const injector = config ? config.module.injector : moduleInjector;
    return injector.get(token);
}
/**
 * @param {?} snapshot
 * @return {?}
 */
function getClosestLoadedConfig(snapshot) {
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
/**
 * @param {?} futureNode
 * @param {?} currNode
 * @param {?} contexts
 * @param {?} futurePath
 * @param {?=} checks
 * @return {?}
 */
function getChildRouteGuards(futureNode, currNode, contexts, futurePath, checks = {
    canDeactivateChecks: [],
    canActivateChecks: []
}) {
    /** @type {?} */
    const prevChildren = nodeChildrenAsMap(currNode);
    // Process the children of the future route
    futureNode.children.forEach((/**
     * @param {?} c
     * @return {?}
     */
    c => {
        getRouteGuards(c, prevChildren[c.value.outlet], contexts, futurePath.concat([c.value]), checks);
        delete prevChildren[c.value.outlet];
    }));
    // Process any children left from the current route (not active for the future route)
    forEach(prevChildren, (/**
     * @param {?} v
     * @param {?} k
     * @return {?}
     */
    (v, k) => deactivateRouteAndItsChildren(v, (/** @type {?} */ (contexts)).getContext(k), contexts, checks)));
    return checks;
}
/**
 * @param {?} futureNode
 * @param {?} currNode
 * @param {?} parentContexts
 * @param {?} futurePath
 * @param {?=} checks
 * @return {?}
 */
function getRouteGuards(futureNode, currNode, parentContexts, futurePath, checks = {
    canDeactivateChecks: [],
    canActivateChecks: []
}) {
    /** @type {?} */
    const future = futureNode.value;
    /** @type {?} */
    const curr = currNode ? currNode.value : null;
    /** @type {?} */
    const context = parentContexts ? parentContexts.getContext(futureNode.value.outlet) : null;
    // reusing the node
    if (curr && future.routeConfig === curr.routeConfig) {
        /** @type {?} */
        const shouldRun = shouldRunGuardsAndResolvers(curr, future, (/** @type {?} */ (future.routeConfig)).runGuardsAndResolvers);
        if (shouldRun) {
            checks.canActivateChecks.push(new CanActivate(futurePath));
        }
        else {
            // we need to set the data
            future.data = curr.data;
            future._resolvedData = curr._resolvedData;
        }
        // If we have a component, we need to go through an outlet.
        if (future.component) {
            getChildRouteGuards(futureNode, currNode, context ? context.children : null, futurePath, checks);
            // if we have a componentless route, we recurse but keep the same outlet map.
        }
        else {
            getChildRouteGuards(futureNode, currNode, parentContexts, futurePath, checks);
        }
        if (shouldRun) {
            /** @type {?} */
            const component = context && context.outlet && context.outlet.component || null;
            checks.canDeactivateChecks.push(new CanDeactivate(component, curr));
        }
    }
    else {
        if (curr) {
            deactivateRouteAndItsChildren(currNode, context, parentContexts, checks);
        }
        checks.canActivateChecks.push(new CanActivate(futurePath));
        // If we have a component, we need to go through an outlet.
        if (future.component) {
            getChildRouteGuards(futureNode, null, context ? context.children : null, futurePath, checks);
            // if we have a componentless route, we recurse but keep the same outlet map.
        }
        else {
            getChildRouteGuards(futureNode, null, parentContexts, futurePath, checks);
        }
    }
    return checks;
}
/**
 * @param {?} curr
 * @param {?} future
 * @param {?} mode
 * @return {?}
 */
function shouldRunGuardsAndResolvers(curr, future, mode) {
    if (typeof mode === 'function') {
        return mode(curr, future);
    }
    switch (mode) {
        case 'pathParamsChange':
            return !equalPath(curr.url, future.url);
        case 'pathParamsOrQueryParamsChange':
            return !equalPath(curr.url, future.url) ||
                !shallowEqual(curr.queryParams, future.queryParams);
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
 * @param {?} parentContexts
 * @param {?} checks
 * @return {?}
 */
function deactivateRouteAndItsChildren(route, context, parentContexts, checks) {
    /** @type {?} */
    const children = nodeChildrenAsMap(route);
    /** @type {?} */
    const r = route.value;
    forEach(children, (/**
     * @param {?} node
     * @param {?} childName
     * @return {?}
     */
    (node, childName) => {
        if (!r.component) {
            deactivateRouteAndItsChildren(node, parentContexts ? parentContexts.getContext(childName) : context, parentContexts, checks);
        }
        else if (context) {
            deactivateRouteAndItsChildren(node, context.children.getContext(childName), parentContexts, checks);
        }
        else {
            deactivateRouteAndItsChildren(node, null, parentContexts, checks);
        }
    }));
    if (!r.component) {
        checks.canDeactivateChecks.push(new CanDeactivate(null, r));
    }
    else if (context && context.outlet && context.outlet.isActivated) {
        checks.canDeactivateChecks.push(new CanDeactivate(context.outlet.component, r));
    }
    else {
        checks.canDeactivateChecks.push(new CanDeactivate(null, r));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlYWN0aXZhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvdXRpbHMvcHJlYWN0aXZhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFZQSxPQUFPLEVBQThDLHlCQUF5QixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDdkcsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGFBQWEsQ0FBQztBQUN0QyxPQUFPLEVBQUMsT0FBTyxFQUFFLFlBQVksRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQzFELE9BQU8sRUFBVyxpQkFBaUIsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUUxRCxNQUFNLE9BQU8sV0FBVzs7OztJQUV0QixZQUFtQixJQUE4QjtRQUE5QixTQUFJLEdBQUosSUFBSSxDQUEwQjtRQUMvQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQztDQUNGOzs7SUFKQyw0QkFBdUM7O0lBQzNCLDJCQUFxQzs7QUFLbkQsTUFBTSxPQUFPLGFBQWE7Ozs7O0lBQ3hCLFlBQW1CLFNBQXNCLEVBQVMsS0FBNkI7UUFBNUQsY0FBUyxHQUFULFNBQVMsQ0FBYTtRQUFTLFVBQUssR0FBTCxLQUFLLENBQXdCO0lBQUcsQ0FBQztDQUNwRjs7O0lBRGEsa0NBQTZCOztJQUFFLDhCQUFvQzs7Ozs7Ozs7QUFRakYsTUFBTSxVQUFVLGlCQUFpQixDQUM3QixNQUEyQixFQUFFLElBQXlCLEVBQ3RELGNBQXNDOztVQUNsQyxVQUFVLEdBQUcsTUFBTSxDQUFDLEtBQUs7O1VBQ3pCLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUk7SUFFekMsT0FBTyxtQkFBbUIsQ0FBQyxVQUFV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U0FBUyxFQUFFO1FBQ2hCLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDN0Q7U0FBTSxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFO1FBQ2xFLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNqRjtTQUFNO1FBQ0wsTUFBTSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUM3RDtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SW5qZWN0b3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQge0xvYWRlZFJvdXRlckNvbmZpZywgUnVuR3VhcmRzQW5kUmVzb2x2ZXJzfSBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzLCBPdXRsZXRDb250ZXh0fSBmcm9tICcuLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBSb3V0ZXJTdGF0ZVNuYXBzaG90LCBlcXVhbFBhcmFtc0FuZFVybFNlZ21lbnRzfSBmcm9tICcuLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtlcXVhbFBhdGh9IGZyb20gJy4uL3VybF90cmVlJztcbmltcG9ydCB7Zm9yRWFjaCwgc2hhbGxvd0VxdWFsfSBmcm9tICcuLi91dGlscy9jb2xsZWN0aW9uJztcbmltcG9ydCB7VHJlZU5vZGUsIG5vZGVDaGlsZHJlbkFzTWFwfSBmcm9tICcuLi91dGlscy90cmVlJztcblxuZXhwb3J0IGNsYXNzIENhbkFjdGl2YXRlIHtcbiAgcmVhZG9ubHkgcm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3Q7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBwYXRoOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90W10pIHtcbiAgICB0aGlzLnJvdXRlID0gdGhpcy5wYXRoW3RoaXMucGF0aC5sZW5ndGggLSAxXTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ2FuRGVhY3RpdmF0ZSB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjb21wb25lbnQ6IE9iamVjdHxudWxsLCBwdWJsaWMgcm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpIHt9XG59XG5cbmV4cG9ydCBkZWNsYXJlIHR5cGUgQ2hlY2tzID0ge1xuICBjYW5EZWFjdGl2YXRlQ2hlY2tzOiBDYW5EZWFjdGl2YXRlW10sXG4gIGNhbkFjdGl2YXRlQ2hlY2tzOiBDYW5BY3RpdmF0ZVtdLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbFJvdXRlR3VhcmRzKFxuICAgIGZ1dHVyZTogUm91dGVyU3RhdGVTbmFwc2hvdCwgY3VycjogUm91dGVyU3RhdGVTbmFwc2hvdCxcbiAgICBwYXJlbnRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cykge1xuICBjb25zdCBmdXR1cmVSb290ID0gZnV0dXJlLl9yb290O1xuICBjb25zdCBjdXJyUm9vdCA9IGN1cnIgPyBjdXJyLl9yb290IDogbnVsbDtcblxuICByZXR1cm4gZ2V0Q2hpbGRSb3V0ZUd1YXJkcyhmdXR1cmVSb290LCBjdXJyUm9vdCwgcGFyZW50Q29udGV4dHMsIFtmdXR1cmVSb290LnZhbHVlXSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYW5BY3RpdmF0ZUNoaWxkKHA6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOlxuICAgIHtub2RlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBndWFyZHM6IGFueVtdfXxudWxsIHtcbiAgY29uc3QgY2FuQWN0aXZhdGVDaGlsZCA9IHAucm91dGVDb25maWcgPyBwLnJvdXRlQ29uZmlnLmNhbkFjdGl2YXRlQ2hpbGQgOiBudWxsO1xuICBpZiAoIWNhbkFjdGl2YXRlQ2hpbGQgfHwgY2FuQWN0aXZhdGVDaGlsZC5sZW5ndGggPT09IDApIHJldHVybiBudWxsO1xuICByZXR1cm4ge25vZGU6IHAsIGd1YXJkczogY2FuQWN0aXZhdGVDaGlsZH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUb2tlbihcbiAgICB0b2tlbjogYW55LCBzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgbW9kdWxlSW5qZWN0b3I6IEluamVjdG9yKTogYW55IHtcbiAgY29uc3QgY29uZmlnID0gZ2V0Q2xvc2VzdExvYWRlZENvbmZpZyhzbmFwc2hvdCk7XG4gIGNvbnN0IGluamVjdG9yID0gY29uZmlnID8gY29uZmlnLm1vZHVsZS5pbmplY3RvciA6IG1vZHVsZUluamVjdG9yO1xuICByZXR1cm4gaW5qZWN0b3IuZ2V0KHRva2VuKTtcbn1cblxuZnVuY3Rpb24gZ2V0Q2xvc2VzdExvYWRlZENvbmZpZyhzbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IExvYWRlZFJvdXRlckNvbmZpZ3xudWxsIHtcbiAgaWYgKCFzbmFwc2hvdCkgcmV0dXJuIG51bGw7XG5cbiAgZm9yIChsZXQgcyA9IHNuYXBzaG90LnBhcmVudDsgczsgcyA9IHMucGFyZW50KSB7XG4gICAgY29uc3Qgcm91dGUgPSBzLnJvdXRlQ29uZmlnO1xuICAgIGlmIChyb3V0ZSAmJiByb3V0ZS5fbG9hZGVkQ29uZmlnKSByZXR1cm4gcm91dGUuX2xvYWRlZENvbmZpZztcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBnZXRDaGlsZFJvdXRlR3VhcmRzKFxuICAgIGZ1dHVyZU5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+LCBjdXJyTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD58IG51bGwsXG4gICAgY29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMgfCBudWxsLCBmdXR1cmVQYXRoOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90W10sXG4gICAgY2hlY2tzOiBDaGVja3MgPSB7XG4gICAgICBjYW5EZWFjdGl2YXRlQ2hlY2tzOiBbXSxcbiAgICAgIGNhbkFjdGl2YXRlQ2hlY2tzOiBbXVxuICAgIH0pOiBDaGVja3Mge1xuICBjb25zdCBwcmV2Q2hpbGRyZW4gPSBub2RlQ2hpbGRyZW5Bc01hcChjdXJyTm9kZSk7XG5cbiAgLy8gUHJvY2VzcyB0aGUgY2hpbGRyZW4gb2YgdGhlIGZ1dHVyZSByb3V0ZVxuICBmdXR1cmVOb2RlLmNoaWxkcmVuLmZvckVhY2goYyA9PiB7XG4gICAgZ2V0Um91dGVHdWFyZHMoYywgcHJldkNoaWxkcmVuW2MudmFsdWUub3V0bGV0XSwgY29udGV4dHMsIGZ1dHVyZVBhdGguY29uY2F0KFtjLnZhbHVlXSksIGNoZWNrcyk7XG4gICAgZGVsZXRlIHByZXZDaGlsZHJlbltjLnZhbHVlLm91dGxldF07XG4gIH0pO1xuXG4gIC8vIFByb2Nlc3MgYW55IGNoaWxkcmVuIGxlZnQgZnJvbSB0aGUgY3VycmVudCByb3V0ZSAobm90IGFjdGl2ZSBmb3IgdGhlIGZ1dHVyZSByb3V0ZSlcbiAgZm9yRWFjaChcbiAgICAgIHByZXZDaGlsZHJlbixcbiAgICAgICh2OiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Piwgazogc3RyaW5nKSA9PlxuICAgICAgICAgIGRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKHYsIGNvbnRleHRzICEuZ2V0Q29udGV4dChrKSwgY29udGV4dHMsIGNoZWNrcykpO1xuXG4gIHJldHVybiBjaGVja3M7XG59XG5cbmZ1bmN0aW9uIGdldFJvdXRlR3VhcmRzKFxuICAgIGZ1dHVyZU5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+LCBjdXJyTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4sXG4gICAgcGFyZW50Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMgfCBudWxsLCBmdXR1cmVQYXRoOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90W10sXG4gICAgY2hlY2tzOiBDaGVja3MgPSB7XG4gICAgICBjYW5EZWFjdGl2YXRlQ2hlY2tzOiBbXSxcbiAgICAgIGNhbkFjdGl2YXRlQ2hlY2tzOiBbXVxuICAgIH0pOiBDaGVja3Mge1xuICBjb25zdCBmdXR1cmUgPSBmdXR1cmVOb2RlLnZhbHVlO1xuICBjb25zdCBjdXJyID0gY3Vyck5vZGUgPyBjdXJyTm9kZS52YWx1ZSA6IG51bGw7XG4gIGNvbnN0IGNvbnRleHQgPSBwYXJlbnRDb250ZXh0cyA/IHBhcmVudENvbnRleHRzLmdldENvbnRleHQoZnV0dXJlTm9kZS52YWx1ZS5vdXRsZXQpIDogbnVsbDtcblxuICAvLyByZXVzaW5nIHRoZSBub2RlXG4gIGlmIChjdXJyICYmIGZ1dHVyZS5yb3V0ZUNvbmZpZyA9PT0gY3Vyci5yb3V0ZUNvbmZpZykge1xuICAgIGNvbnN0IHNob3VsZFJ1biA9XG4gICAgICAgIHNob3VsZFJ1bkd1YXJkc0FuZFJlc29sdmVycyhjdXJyLCBmdXR1cmUsIGZ1dHVyZS5yb3V0ZUNvbmZpZyAhLnJ1bkd1YXJkc0FuZFJlc29sdmVycyk7XG4gICAgaWYgKHNob3VsZFJ1bikge1xuICAgICAgY2hlY2tzLmNhbkFjdGl2YXRlQ2hlY2tzLnB1c2gobmV3IENhbkFjdGl2YXRlKGZ1dHVyZVBhdGgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gd2UgbmVlZCB0byBzZXQgdGhlIGRhdGFcbiAgICAgIGZ1dHVyZS5kYXRhID0gY3Vyci5kYXRhO1xuICAgICAgZnV0dXJlLl9yZXNvbHZlZERhdGEgPSBjdXJyLl9yZXNvbHZlZERhdGE7XG4gICAgfVxuXG4gICAgLy8gSWYgd2UgaGF2ZSBhIGNvbXBvbmVudCwgd2UgbmVlZCB0byBnbyB0aHJvdWdoIGFuIG91dGxldC5cbiAgICBpZiAoZnV0dXJlLmNvbXBvbmVudCkge1xuICAgICAgZ2V0Q2hpbGRSb3V0ZUd1YXJkcyhcbiAgICAgICAgICBmdXR1cmVOb2RlLCBjdXJyTm9kZSwgY29udGV4dCA/IGNvbnRleHQuY2hpbGRyZW4gOiBudWxsLCBmdXR1cmVQYXRoLCBjaGVja3MpO1xuXG4gICAgICAvLyBpZiB3ZSBoYXZlIGEgY29tcG9uZW50bGVzcyByb3V0ZSwgd2UgcmVjdXJzZSBidXQga2VlcCB0aGUgc2FtZSBvdXRsZXQgbWFwLlxuICAgIH0gZWxzZSB7XG4gICAgICBnZXRDaGlsZFJvdXRlR3VhcmRzKGZ1dHVyZU5vZGUsIGN1cnJOb2RlLCBwYXJlbnRDb250ZXh0cywgZnV0dXJlUGF0aCwgY2hlY2tzKTtcbiAgICB9XG5cbiAgICBpZiAoc2hvdWxkUnVuKSB7XG4gICAgICBjb25zdCBjb21wb25lbnQgPSBjb250ZXh0ICYmIGNvbnRleHQub3V0bGV0ICYmIGNvbnRleHQub3V0bGV0LmNvbXBvbmVudCB8fCBudWxsO1xuICAgICAgY2hlY2tzLmNhbkRlYWN0aXZhdGVDaGVja3MucHVzaChuZXcgQ2FuRGVhY3RpdmF0ZShjb21wb25lbnQsIGN1cnIpKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGN1cnIpIHtcbiAgICAgIGRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKGN1cnJOb2RlLCBjb250ZXh0LCBwYXJlbnRDb250ZXh0cywgY2hlY2tzKTtcbiAgICB9XG5cbiAgICBjaGVja3MuY2FuQWN0aXZhdGVDaGVja3MucHVzaChuZXcgQ2FuQWN0aXZhdGUoZnV0dXJlUGF0aCkpO1xuICAgIC8vIElmIHdlIGhhdmUgYSBjb21wb25lbnQsIHdlIG5lZWQgdG8gZ28gdGhyb3VnaCBhbiBvdXRsZXQuXG4gICAgaWYgKGZ1dHVyZS5jb21wb25lbnQpIHtcbiAgICAgIGdldENoaWxkUm91dGVHdWFyZHMoZnV0dXJlTm9kZSwgbnVsbCwgY29udGV4dCA/IGNvbnRleHQuY2hpbGRyZW4gOiBudWxsLCBmdXR1cmVQYXRoLCBjaGVja3MpO1xuXG4gICAgICAvLyBpZiB3ZSBoYXZlIGEgY29tcG9uZW50bGVzcyByb3V0ZSwgd2UgcmVjdXJzZSBidXQga2VlcCB0aGUgc2FtZSBvdXRsZXQgbWFwLlxuICAgIH0gZWxzZSB7XG4gICAgICBnZXRDaGlsZFJvdXRlR3VhcmRzKGZ1dHVyZU5vZGUsIG51bGwsIHBhcmVudENvbnRleHRzLCBmdXR1cmVQYXRoLCBjaGVja3MpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjaGVja3M7XG59XG5cbmZ1bmN0aW9uIHNob3VsZFJ1bkd1YXJkc0FuZFJlc29sdmVycyhcbiAgICBjdXJyOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBmdXR1cmU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsXG4gICAgbW9kZTogUnVuR3VhcmRzQW5kUmVzb2x2ZXJzIHwgdW5kZWZpbmVkKTogYm9vbGVhbiB7XG4gIGlmICh0eXBlb2YgbW9kZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBtb2RlKGN1cnIsIGZ1dHVyZSk7XG4gIH1cbiAgc3dpdGNoIChtb2RlKSB7XG4gICAgY2FzZSAncGF0aFBhcmFtc0NoYW5nZSc6XG4gICAgICByZXR1cm4gIWVxdWFsUGF0aChjdXJyLnVybCwgZnV0dXJlLnVybCk7XG5cbiAgICBjYXNlICdwYXRoUGFyYW1zT3JRdWVyeVBhcmFtc0NoYW5nZSc6XG4gICAgICByZXR1cm4gIWVxdWFsUGF0aChjdXJyLnVybCwgZnV0dXJlLnVybCkgfHxcbiAgICAgICAgICAhc2hhbGxvd0VxdWFsKGN1cnIucXVlcnlQYXJhbXMsIGZ1dHVyZS5xdWVyeVBhcmFtcyk7XG5cbiAgICBjYXNlICdhbHdheXMnOlxuICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICBjYXNlICdwYXJhbXNPclF1ZXJ5UGFyYW1zQ2hhbmdlJzpcbiAgICAgIHJldHVybiAhZXF1YWxQYXJhbXNBbmRVcmxTZWdtZW50cyhjdXJyLCBmdXR1cmUpIHx8XG4gICAgICAgICAgIXNoYWxsb3dFcXVhbChjdXJyLnF1ZXJ5UGFyYW1zLCBmdXR1cmUucXVlcnlQYXJhbXMpO1xuXG4gICAgY2FzZSAncGFyYW1zQ2hhbmdlJzpcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuICFlcXVhbFBhcmFtc0FuZFVybFNlZ21lbnRzKGN1cnIsIGZ1dHVyZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZGVhY3RpdmF0ZVJvdXRlQW5kSXRzQ2hpbGRyZW4oXG4gICAgcm91dGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+LCBjb250ZXh0OiBPdXRsZXRDb250ZXh0IHwgbnVsbCxcbiAgICBwYXJlbnRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyB8IG51bGwsIGNoZWNrczogQ2hlY2tzKTogdm9pZCB7XG4gIGNvbnN0IGNoaWxkcmVuID0gbm9kZUNoaWxkcmVuQXNNYXAocm91dGUpO1xuICBjb25zdCByID0gcm91dGUudmFsdWU7XG5cbiAgZm9yRWFjaChjaGlsZHJlbiwgKG5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+LCBjaGlsZE5hbWU6IHN0cmluZykgPT4ge1xuICAgIGlmICghci5jb21wb25lbnQpIHtcbiAgICAgIGRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKFxuICAgICAgICAgIG5vZGUsIHBhcmVudENvbnRleHRzID8gcGFyZW50Q29udGV4dHMuZ2V0Q29udGV4dChjaGlsZE5hbWUpIDogY29udGV4dCwgcGFyZW50Q29udGV4dHMsXG4gICAgICAgICAgY2hlY2tzKTtcbiAgICB9IGVsc2UgaWYgKGNvbnRleHQpIHtcbiAgICAgIGRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKFxuICAgICAgICAgIG5vZGUsIGNvbnRleHQuY2hpbGRyZW4uZ2V0Q29udGV4dChjaGlsZE5hbWUpLCBwYXJlbnRDb250ZXh0cywgY2hlY2tzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVhY3RpdmF0ZVJvdXRlQW5kSXRzQ2hpbGRyZW4obm9kZSwgbnVsbCwgcGFyZW50Q29udGV4dHMsIGNoZWNrcyk7XG4gICAgfVxuICB9KTtcblxuICBpZiAoIXIuY29tcG9uZW50KSB7XG4gICAgY2hlY2tzLmNhbkRlYWN0aXZhdGVDaGVja3MucHVzaChuZXcgQ2FuRGVhY3RpdmF0ZShudWxsLCByKSk7XG4gIH0gZWxzZSBpZiAoY29udGV4dCAmJiBjb250ZXh0Lm91dGxldCAmJiBjb250ZXh0Lm91dGxldC5pc0FjdGl2YXRlZCkge1xuICAgIGNoZWNrcy5jYW5EZWFjdGl2YXRlQ2hlY2tzLnB1c2gobmV3IENhbkRlYWN0aXZhdGUoY29udGV4dC5vdXRsZXQuY29tcG9uZW50LCByKSk7XG4gIH0gZWxzZSB7XG4gICAgY2hlY2tzLmNhbkRlYWN0aXZhdGVDaGVja3MucHVzaChuZXcgQ2FuRGVhY3RpdmF0ZShudWxsLCByKSk7XG4gIH1cbn1cbiJdfQ==