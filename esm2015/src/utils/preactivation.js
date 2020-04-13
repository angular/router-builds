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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlYWN0aXZhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvdXRpbHMvcHJlYWN0aXZhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFZQSxPQUFPLEVBQXlCLHlCQUF5QixFQUFzQixNQUFNLGlCQUFpQixDQUFDO0FBQ3ZHLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxhQUFhLENBQUM7QUFDdEMsT0FBTyxFQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUMxRCxPQUFPLEVBQUMsaUJBQWlCLEVBQVcsTUFBTSxlQUFlLENBQUM7QUFFMUQsTUFBTSxPQUFPLFdBQVc7Ozs7SUFFdEIsWUFBbUIsSUFBOEI7UUFBOUIsU0FBSSxHQUFKLElBQUksQ0FBMEI7UUFDL0MsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQy9DLENBQUM7Q0FDRjs7O0lBSkMsNEJBQXVDOztJQUMzQiwyQkFBcUM7O0FBS25ELE1BQU0sT0FBTyxhQUFhOzs7OztJQUN4QixZQUFtQixTQUFzQixFQUFTLEtBQTZCO1FBQTVELGNBQVMsR0FBVCxTQUFTLENBQWE7UUFBUyxVQUFLLEdBQUwsS0FBSyxDQUF3QjtJQUFHLENBQUM7Q0FDcEY7OztJQURhLGtDQUE2Qjs7SUFBRSw4QkFBb0M7Ozs7Ozs7O0FBUWpGLE1BQU0sVUFBVSxpQkFBaUIsQ0FDN0IsTUFBMkIsRUFBRSxJQUF5QixFQUN0RCxjQUFzQzs7VUFDbEMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxLQUFLOztVQUN6QixRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJO0lBRXpDLE9BQU8sbUJBQW1CLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUN2RixDQUFDOzs7OztBQUVELE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxDQUF5Qjs7VUFFckQsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSTtJQUM5RSxJQUFJLENBQUMsZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsTUFBTSxLQUFLLENBQUM7UUFBRSxPQUFPLElBQUksQ0FBQztJQUNwRSxPQUFPLEVBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLEVBQUMsQ0FBQztBQUM3QyxDQUFDOzs7Ozs7O0FBRUQsTUFBTSxVQUFVLFFBQVEsQ0FDcEIsS0FBVSxFQUFFLFFBQWdDLEVBQUUsY0FBd0I7O1VBQ2xFLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxRQUFRLENBQUM7O1VBQ3pDLFFBQVEsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxjQUFjO0lBQ2pFLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUM3QixDQUFDOzs7OztBQUVELFNBQVMsc0JBQXNCLENBQUMsUUFBZ0M7SUFDOUQsSUFBSSxDQUFDLFFBQVE7UUFBRSxPQUFPLElBQUksQ0FBQztJQUUzQixLQUFLLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFOztjQUN2QyxLQUFLLEdBQUcsQ0FBQyxDQUFDLFdBQVc7UUFDM0IsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLGFBQWE7WUFBRSxPQUFPLEtBQUssQ0FBQyxhQUFhLENBQUM7S0FDOUQ7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7Ozs7Ozs7OztBQUVELFNBQVMsbUJBQW1CLENBQ3hCLFVBQTRDLEVBQUUsUUFBK0MsRUFDN0YsUUFBcUMsRUFBRSxVQUFvQyxFQUFFLFNBQWlCO0lBQzVGLG1CQUFtQixFQUFFLEVBQUU7SUFDdkIsaUJBQWlCLEVBQUUsRUFBRTtDQUN0Qjs7VUFDRyxZQUFZLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxDQUFDO0lBRWhELDJDQUEyQztJQUMzQyxVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU87Ozs7SUFBQyxDQUFDLENBQUMsRUFBRTtRQUM5QixjQUFjLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDaEcsT0FBTyxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0QyxDQUFDLEVBQUMsQ0FBQztJQUVILHFGQUFxRjtJQUNyRixPQUFPLENBQ0gsWUFBWTs7Ozs7SUFDWixDQUFDLENBQW1DLEVBQUUsQ0FBUyxFQUFFLEVBQUUsQ0FDL0MsNkJBQTZCLENBQUMsQ0FBQyxFQUFFLG1CQUFBLFFBQVEsRUFBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLEVBQUMsQ0FBQztJQUVyRixPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDOzs7Ozs7Ozs7QUFFRCxTQUFTLGNBQWMsQ0FDbkIsVUFBNEMsRUFBRSxRQUEwQyxFQUN4RixjQUEyQyxFQUFFLFVBQW9DLEVBQ2pGLFNBQWlCO0lBQ2YsbUJBQW1CLEVBQUUsRUFBRTtJQUN2QixpQkFBaUIsRUFBRSxFQUFFO0NBQ3RCOztVQUNHLE1BQU0sR0FBRyxVQUFVLENBQUMsS0FBSzs7VUFDekIsSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSTs7VUFDdkMsT0FBTyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0lBRTFGLG1CQUFtQjtJQUNuQixJQUFJLElBQUksSUFBSSxNQUFNLENBQUMsV0FBVyxLQUFLLElBQUksQ0FBQyxXQUFXLEVBQUU7O2NBQzdDLFNBQVMsR0FDWCwyQkFBMkIsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLG1CQUFBLE1BQU0sQ0FBQyxXQUFXLEVBQUMsQ0FBQyxxQkFBcUIsQ0FBQztRQUN4RixJQUFJLFNBQVMsRUFBRTtZQUNiLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztTQUM1RDthQUFNO1lBQ0wsMEJBQTBCO1lBQzFCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztZQUN4QixNQUFNLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7U0FDM0M7UUFFRCwyREFBMkQ7UUFDM0QsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFO1lBQ3BCLG1CQUFtQixDQUNmLFVBQVUsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRWpGLDZFQUE2RTtTQUM5RTthQUFNO1lBQ0wsbUJBQW1CLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQy9FO1FBRUQsSUFBSSxTQUFTLEVBQUU7O2tCQUNQLFNBQVMsR0FBRyxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsSUFBSSxJQUFJO1lBQy9FLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxhQUFhLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDckU7S0FDRjtTQUFNO1FBQ0wsSUFBSSxJQUFJLEVBQUU7WUFDUiw2QkFBNkIsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztTQUMxRTtRQUVELE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUMzRCwyREFBMkQ7UUFDM0QsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFO1lBQ3BCLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRTdGLDZFQUE2RTtTQUM5RTthQUFNO1lBQ0wsbUJBQW1CLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQzNFO0tBQ0Y7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDOzs7Ozs7O0FBRUQsU0FBUywyQkFBMkIsQ0FDaEMsSUFBNEIsRUFBRSxNQUE4QixFQUM1RCxJQUFxQztJQUN2QyxJQUFJLE9BQU8sSUFBSSxLQUFLLFVBQVUsRUFBRTtRQUM5QixPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7S0FDM0I7SUFDRCxRQUFRLElBQUksRUFBRTtRQUNaLEtBQUssa0JBQWtCO1lBQ3JCLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFMUMsS0FBSywrQkFBK0I7WUFDbEMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUM7Z0JBQ25DLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRTFELEtBQUssUUFBUTtZQUNYLE9BQU8sSUFBSSxDQUFDO1FBRWQsS0FBSywyQkFBMkI7WUFDOUIsT0FBTyxDQUFDLHlCQUF5QixDQUFDLElBQUksRUFBRSxNQUFNLENBQUM7Z0JBQzNDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRTFELEtBQUssY0FBYyxDQUFDO1FBQ3BCO1lBQ0UsT0FBTyxDQUFDLHlCQUF5QixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztLQUNuRDtBQUNILENBQUM7Ozs7Ozs7O0FBRUQsU0FBUyw2QkFBNkIsQ0FDbEMsS0FBdUMsRUFBRSxPQUEyQixFQUNwRSxjQUEyQyxFQUFFLE1BQWM7O1VBQ3ZELFFBQVEsR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLENBQUM7O1VBQ25DLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSztJQUVyQixPQUFPLENBQUMsUUFBUTs7Ozs7SUFBRSxDQUFDLElBQXNDLEVBQUUsU0FBaUIsRUFBRSxFQUFFO1FBQzlFLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFO1lBQ2hCLDZCQUE2QixDQUN6QixJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUNyRixNQUFNLENBQUMsQ0FBQztTQUNiO2FBQU0sSUFBSSxPQUFPLEVBQUU7WUFDbEIsNkJBQTZCLENBQ3pCLElBQUksRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7U0FDM0U7YUFBTTtZQUNMLDZCQUE2QixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ25FO0lBQ0gsQ0FBQyxFQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRTtRQUNoQixNQUFNLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzdEO1NBQU0sSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRTtRQUNsRSxNQUFNLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDakY7U0FBTTtRQUNMLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDN0Q7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0luamVjdG9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHtMb2FkZWRSb3V0ZXJDb25maWcsIFJ1bkd1YXJkc0FuZFJlc29sdmVyc30gZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0cywgT3V0bGV0Q29udGV4dH0gZnJvbSAnLi4vcm91dGVyX291dGxldF9jb250ZXh0JztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgZXF1YWxQYXJhbXNBbmRVcmxTZWdtZW50cywgUm91dGVyU3RhdGVTbmFwc2hvdH0gZnJvbSAnLi4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7ZXF1YWxQYXRofSBmcm9tICcuLi91cmxfdHJlZSc7XG5pbXBvcnQge2ZvckVhY2gsIHNoYWxsb3dFcXVhbH0gZnJvbSAnLi4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge25vZGVDaGlsZHJlbkFzTWFwLCBUcmVlTm9kZX0gZnJvbSAnLi4vdXRpbHMvdHJlZSc7XG5cbmV4cG9ydCBjbGFzcyBDYW5BY3RpdmF0ZSB7XG4gIHJlYWRvbmx5IHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90O1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcGF0aDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdFtdKSB7XG4gICAgdGhpcy5yb3V0ZSA9IHRoaXMucGF0aFt0aGlzLnBhdGgubGVuZ3RoIC0gMV07XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIENhbkRlYWN0aXZhdGUge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgY29tcG9uZW50OiBPYmplY3R8bnVsbCwgcHVibGljIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSB7fVxufVxuXG5leHBvcnQgZGVjbGFyZSB0eXBlIENoZWNrcyA9IHtcbiAgY2FuRGVhY3RpdmF0ZUNoZWNrczogQ2FuRGVhY3RpdmF0ZVtdLFxuICBjYW5BY3RpdmF0ZUNoZWNrczogQ2FuQWN0aXZhdGVbXSxcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRBbGxSb3V0ZUd1YXJkcyhcbiAgICBmdXR1cmU6IFJvdXRlclN0YXRlU25hcHNob3QsIGN1cnI6IFJvdXRlclN0YXRlU25hcHNob3QsXG4gICAgcGFyZW50Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpIHtcbiAgY29uc3QgZnV0dXJlUm9vdCA9IGZ1dHVyZS5fcm9vdDtcbiAgY29uc3QgY3VyclJvb3QgPSBjdXJyID8gY3Vyci5fcm9vdCA6IG51bGw7XG5cbiAgcmV0dXJuIGdldENoaWxkUm91dGVHdWFyZHMoZnV0dXJlUm9vdCwgY3VyclJvb3QsIHBhcmVudENvbnRleHRzLCBbZnV0dXJlUm9vdC52YWx1ZV0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FuQWN0aXZhdGVDaGlsZChwOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTpcbiAgICB7bm9kZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgZ3VhcmRzOiBhbnlbXX18bnVsbCB7XG4gIGNvbnN0IGNhbkFjdGl2YXRlQ2hpbGQgPSBwLnJvdXRlQ29uZmlnID8gcC5yb3V0ZUNvbmZpZy5jYW5BY3RpdmF0ZUNoaWxkIDogbnVsbDtcbiAgaWYgKCFjYW5BY3RpdmF0ZUNoaWxkIHx8IGNhbkFjdGl2YXRlQ2hpbGQubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHtub2RlOiBwLCBndWFyZHM6IGNhbkFjdGl2YXRlQ2hpbGR9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VG9rZW4oXG4gICAgdG9rZW46IGFueSwgc25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIG1vZHVsZUluamVjdG9yOiBJbmplY3Rvcik6IGFueSB7XG4gIGNvbnN0IGNvbmZpZyA9IGdldENsb3Nlc3RMb2FkZWRDb25maWcoc25hcHNob3QpO1xuICBjb25zdCBpbmplY3RvciA9IGNvbmZpZyA/IGNvbmZpZy5tb2R1bGUuaW5qZWN0b3IgOiBtb2R1bGVJbmplY3RvcjtcbiAgcmV0dXJuIGluamVjdG9yLmdldCh0b2tlbik7XG59XG5cbmZ1bmN0aW9uIGdldENsb3Nlc3RMb2FkZWRDb25maWcoc25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBMb2FkZWRSb3V0ZXJDb25maWd8bnVsbCB7XG4gIGlmICghc25hcHNob3QpIHJldHVybiBudWxsO1xuXG4gIGZvciAobGV0IHMgPSBzbmFwc2hvdC5wYXJlbnQ7IHM7IHMgPSBzLnBhcmVudCkge1xuICAgIGNvbnN0IHJvdXRlID0gcy5yb3V0ZUNvbmZpZztcbiAgICBpZiAocm91dGUgJiYgcm91dGUuX2xvYWRlZENvbmZpZykgcmV0dXJuIHJvdXRlLl9sb2FkZWRDb25maWc7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gZ2V0Q2hpbGRSb3V0ZUd1YXJkcyhcbiAgICBmdXR1cmVOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PiwgY3Vyck5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+fG51bGwsXG4gICAgY29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHN8bnVsbCwgZnV0dXJlUGF0aDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdFtdLCBjaGVja3M6IENoZWNrcyA9IHtcbiAgICAgIGNhbkRlYWN0aXZhdGVDaGVja3M6IFtdLFxuICAgICAgY2FuQWN0aXZhdGVDaGVja3M6IFtdXG4gICAgfSk6IENoZWNrcyB7XG4gIGNvbnN0IHByZXZDaGlsZHJlbiA9IG5vZGVDaGlsZHJlbkFzTWFwKGN1cnJOb2RlKTtcblxuICAvLyBQcm9jZXNzIHRoZSBjaGlsZHJlbiBvZiB0aGUgZnV0dXJlIHJvdXRlXG4gIGZ1dHVyZU5vZGUuY2hpbGRyZW4uZm9yRWFjaChjID0+IHtcbiAgICBnZXRSb3V0ZUd1YXJkcyhjLCBwcmV2Q2hpbGRyZW5bYy52YWx1ZS5vdXRsZXRdLCBjb250ZXh0cywgZnV0dXJlUGF0aC5jb25jYXQoW2MudmFsdWVdKSwgY2hlY2tzKTtcbiAgICBkZWxldGUgcHJldkNoaWxkcmVuW2MudmFsdWUub3V0bGV0XTtcbiAgfSk7XG5cbiAgLy8gUHJvY2VzcyBhbnkgY2hpbGRyZW4gbGVmdCBmcm9tIHRoZSBjdXJyZW50IHJvdXRlIChub3QgYWN0aXZlIGZvciB0aGUgZnV0dXJlIHJvdXRlKVxuICBmb3JFYWNoKFxuICAgICAgcHJldkNoaWxkcmVuLFxuICAgICAgKHY6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+LCBrOiBzdHJpbmcpID0+XG4gICAgICAgICAgZGVhY3RpdmF0ZVJvdXRlQW5kSXRzQ2hpbGRyZW4odiwgY29udGV4dHMhLmdldENvbnRleHQoayksIGNvbnRleHRzLCBjaGVja3MpKTtcblxuICByZXR1cm4gY2hlY2tzO1xufVxuXG5mdW5jdGlvbiBnZXRSb3V0ZUd1YXJkcyhcbiAgICBmdXR1cmVOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PiwgY3Vyck5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+LFxuICAgIHBhcmVudENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzfG51bGwsIGZ1dHVyZVBhdGg6IEFjdGl2YXRlZFJvdXRlU25hcHNob3RbXSxcbiAgICBjaGVja3M6IENoZWNrcyA9IHtcbiAgICAgIGNhbkRlYWN0aXZhdGVDaGVja3M6IFtdLFxuICAgICAgY2FuQWN0aXZhdGVDaGVja3M6IFtdXG4gICAgfSk6IENoZWNrcyB7XG4gIGNvbnN0IGZ1dHVyZSA9IGZ1dHVyZU5vZGUudmFsdWU7XG4gIGNvbnN0IGN1cnIgPSBjdXJyTm9kZSA/IGN1cnJOb2RlLnZhbHVlIDogbnVsbDtcbiAgY29uc3QgY29udGV4dCA9IHBhcmVudENvbnRleHRzID8gcGFyZW50Q29udGV4dHMuZ2V0Q29udGV4dChmdXR1cmVOb2RlLnZhbHVlLm91dGxldCkgOiBudWxsO1xuXG4gIC8vIHJldXNpbmcgdGhlIG5vZGVcbiAgaWYgKGN1cnIgJiYgZnV0dXJlLnJvdXRlQ29uZmlnID09PSBjdXJyLnJvdXRlQ29uZmlnKSB7XG4gICAgY29uc3Qgc2hvdWxkUnVuID1cbiAgICAgICAgc2hvdWxkUnVuR3VhcmRzQW5kUmVzb2x2ZXJzKGN1cnIsIGZ1dHVyZSwgZnV0dXJlLnJvdXRlQ29uZmlnIS5ydW5HdWFyZHNBbmRSZXNvbHZlcnMpO1xuICAgIGlmIChzaG91bGRSdW4pIHtcbiAgICAgIGNoZWNrcy5jYW5BY3RpdmF0ZUNoZWNrcy5wdXNoKG5ldyBDYW5BY3RpdmF0ZShmdXR1cmVQYXRoKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHdlIG5lZWQgdG8gc2V0IHRoZSBkYXRhXG4gICAgICBmdXR1cmUuZGF0YSA9IGN1cnIuZGF0YTtcbiAgICAgIGZ1dHVyZS5fcmVzb2x2ZWREYXRhID0gY3Vyci5fcmVzb2x2ZWREYXRhO1xuICAgIH1cblxuICAgIC8vIElmIHdlIGhhdmUgYSBjb21wb25lbnQsIHdlIG5lZWQgdG8gZ28gdGhyb3VnaCBhbiBvdXRsZXQuXG4gICAgaWYgKGZ1dHVyZS5jb21wb25lbnQpIHtcbiAgICAgIGdldENoaWxkUm91dGVHdWFyZHMoXG4gICAgICAgICAgZnV0dXJlTm9kZSwgY3Vyck5vZGUsIGNvbnRleHQgPyBjb250ZXh0LmNoaWxkcmVuIDogbnVsbCwgZnV0dXJlUGF0aCwgY2hlY2tzKTtcblxuICAgICAgLy8gaWYgd2UgaGF2ZSBhIGNvbXBvbmVudGxlc3Mgcm91dGUsIHdlIHJlY3Vyc2UgYnV0IGtlZXAgdGhlIHNhbWUgb3V0bGV0IG1hcC5cbiAgICB9IGVsc2Uge1xuICAgICAgZ2V0Q2hpbGRSb3V0ZUd1YXJkcyhmdXR1cmVOb2RlLCBjdXJyTm9kZSwgcGFyZW50Q29udGV4dHMsIGZ1dHVyZVBhdGgsIGNoZWNrcyk7XG4gICAgfVxuXG4gICAgaWYgKHNob3VsZFJ1bikge1xuICAgICAgY29uc3QgY29tcG9uZW50ID0gY29udGV4dCAmJiBjb250ZXh0Lm91dGxldCAmJiBjb250ZXh0Lm91dGxldC5jb21wb25lbnQgfHwgbnVsbDtcbiAgICAgIGNoZWNrcy5jYW5EZWFjdGl2YXRlQ2hlY2tzLnB1c2gobmV3IENhbkRlYWN0aXZhdGUoY29tcG9uZW50LCBjdXJyKSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChjdXJyKSB7XG4gICAgICBkZWFjdGl2YXRlUm91dGVBbmRJdHNDaGlsZHJlbihjdXJyTm9kZSwgY29udGV4dCwgcGFyZW50Q29udGV4dHMsIGNoZWNrcyk7XG4gICAgfVxuXG4gICAgY2hlY2tzLmNhbkFjdGl2YXRlQ2hlY2tzLnB1c2gobmV3IENhbkFjdGl2YXRlKGZ1dHVyZVBhdGgpKTtcbiAgICAvLyBJZiB3ZSBoYXZlIGEgY29tcG9uZW50LCB3ZSBuZWVkIHRvIGdvIHRocm91Z2ggYW4gb3V0bGV0LlxuICAgIGlmIChmdXR1cmUuY29tcG9uZW50KSB7XG4gICAgICBnZXRDaGlsZFJvdXRlR3VhcmRzKGZ1dHVyZU5vZGUsIG51bGwsIGNvbnRleHQgPyBjb250ZXh0LmNoaWxkcmVuIDogbnVsbCwgZnV0dXJlUGF0aCwgY2hlY2tzKTtcblxuICAgICAgLy8gaWYgd2UgaGF2ZSBhIGNvbXBvbmVudGxlc3Mgcm91dGUsIHdlIHJlY3Vyc2UgYnV0IGtlZXAgdGhlIHNhbWUgb3V0bGV0IG1hcC5cbiAgICB9IGVsc2Uge1xuICAgICAgZ2V0Q2hpbGRSb3V0ZUd1YXJkcyhmdXR1cmVOb2RlLCBudWxsLCBwYXJlbnRDb250ZXh0cywgZnV0dXJlUGF0aCwgY2hlY2tzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gY2hlY2tzO1xufVxuXG5mdW5jdGlvbiBzaG91bGRSdW5HdWFyZHNBbmRSZXNvbHZlcnMoXG4gICAgY3VycjogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgZnV0dXJlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LFxuICAgIG1vZGU6IFJ1bkd1YXJkc0FuZFJlc29sdmVyc3x1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgaWYgKHR5cGVvZiBtb2RlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIG1vZGUoY3VyciwgZnV0dXJlKTtcbiAgfVxuICBzd2l0Y2ggKG1vZGUpIHtcbiAgICBjYXNlICdwYXRoUGFyYW1zQ2hhbmdlJzpcbiAgICAgIHJldHVybiAhZXF1YWxQYXRoKGN1cnIudXJsLCBmdXR1cmUudXJsKTtcblxuICAgIGNhc2UgJ3BhdGhQYXJhbXNPclF1ZXJ5UGFyYW1zQ2hhbmdlJzpcbiAgICAgIHJldHVybiAhZXF1YWxQYXRoKGN1cnIudXJsLCBmdXR1cmUudXJsKSB8fFxuICAgICAgICAgICFzaGFsbG93RXF1YWwoY3Vyci5xdWVyeVBhcmFtcywgZnV0dXJlLnF1ZXJ5UGFyYW1zKTtcblxuICAgIGNhc2UgJ2Fsd2F5cyc6XG4gICAgICByZXR1cm4gdHJ1ZTtcblxuICAgIGNhc2UgJ3BhcmFtc09yUXVlcnlQYXJhbXNDaGFuZ2UnOlxuICAgICAgcmV0dXJuICFlcXVhbFBhcmFtc0FuZFVybFNlZ21lbnRzKGN1cnIsIGZ1dHVyZSkgfHxcbiAgICAgICAgICAhc2hhbGxvd0VxdWFsKGN1cnIucXVlcnlQYXJhbXMsIGZ1dHVyZS5xdWVyeVBhcmFtcyk7XG5cbiAgICBjYXNlICdwYXJhbXNDaGFuZ2UnOlxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gIWVxdWFsUGFyYW1zQW5kVXJsU2VnbWVudHMoY3VyciwgZnV0dXJlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBkZWFjdGl2YXRlUm91dGVBbmRJdHNDaGlsZHJlbihcbiAgICByb3V0ZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4sIGNvbnRleHQ6IE91dGxldENvbnRleHR8bnVsbCxcbiAgICBwYXJlbnRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0c3xudWxsLCBjaGVja3M6IENoZWNrcyk6IHZvaWQge1xuICBjb25zdCBjaGlsZHJlbiA9IG5vZGVDaGlsZHJlbkFzTWFwKHJvdXRlKTtcbiAgY29uc3QgciA9IHJvdXRlLnZhbHVlO1xuXG4gIGZvckVhY2goY2hpbGRyZW4sIChub2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PiwgY2hpbGROYW1lOiBzdHJpbmcpID0+IHtcbiAgICBpZiAoIXIuY29tcG9uZW50KSB7XG4gICAgICBkZWFjdGl2YXRlUm91dGVBbmRJdHNDaGlsZHJlbihcbiAgICAgICAgICBub2RlLCBwYXJlbnRDb250ZXh0cyA/IHBhcmVudENvbnRleHRzLmdldENvbnRleHQoY2hpbGROYW1lKSA6IGNvbnRleHQsIHBhcmVudENvbnRleHRzLFxuICAgICAgICAgIGNoZWNrcyk7XG4gICAgfSBlbHNlIGlmIChjb250ZXh0KSB7XG4gICAgICBkZWFjdGl2YXRlUm91dGVBbmRJdHNDaGlsZHJlbihcbiAgICAgICAgICBub2RlLCBjb250ZXh0LmNoaWxkcmVuLmdldENvbnRleHQoY2hpbGROYW1lKSwgcGFyZW50Q29udGV4dHMsIGNoZWNrcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKG5vZGUsIG51bGwsIHBhcmVudENvbnRleHRzLCBjaGVja3MpO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKCFyLmNvbXBvbmVudCkge1xuICAgIGNoZWNrcy5jYW5EZWFjdGl2YXRlQ2hlY2tzLnB1c2gobmV3IENhbkRlYWN0aXZhdGUobnVsbCwgcikpO1xuICB9IGVsc2UgaWYgKGNvbnRleHQgJiYgY29udGV4dC5vdXRsZXQgJiYgY29udGV4dC5vdXRsZXQuaXNBY3RpdmF0ZWQpIHtcbiAgICBjaGVja3MuY2FuRGVhY3RpdmF0ZUNoZWNrcy5wdXNoKG5ldyBDYW5EZWFjdGl2YXRlKGNvbnRleHQub3V0bGV0LmNvbXBvbmVudCwgcikpO1xuICB9IGVsc2Uge1xuICAgIGNoZWNrcy5jYW5EZWFjdGl2YXRlQ2hlY2tzLnB1c2gobmV3IENhbkRlYWN0aXZhdGUobnVsbCwgcikpO1xuICB9XG59XG4iXX0=