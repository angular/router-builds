"use strict";
const BehaviorSubject_1 = require('rxjs/BehaviorSubject');
const router_state_1 = require('./router_state');
const tree_1 = require('./utils/tree');
function createRouterState(curr, prevState) {
    const root = createNode(curr._root, prevState ? prevState._root : undefined);
    const queryParams = prevState ? prevState.queryParams : new BehaviorSubject_1.BehaviorSubject(curr.queryParams);
    const fragment = prevState ? prevState.fragment : new BehaviorSubject_1.BehaviorSubject(curr.fragment);
    return new router_state_1.RouterState(root, queryParams, fragment, curr);
}
exports.createRouterState = createRouterState;
function createNode(curr, prevState) {
    if (prevState && equalRouteSnapshots(prevState.value.snapshot, curr.value)) {
        const value = prevState.value;
        value._futureSnapshot = curr.value;
        const children = createOrReuseChildren(curr, prevState);
        return new tree_1.TreeNode(value, children);
    }
    else {
        const value = createActivatedRoute(curr.value);
        const children = curr.children.map(c => createNode(c));
        return new tree_1.TreeNode(value, children);
    }
}
function createOrReuseChildren(curr, prevState) {
    return curr.children.map(child => {
        const index = prevState.children.findIndex(p => equalRouteSnapshots(p.value.snapshot, child.value));
        if (index >= 0) {
            return createNode(child, prevState.children[index]);
        }
        else {
            return createNode(child);
        }
    });
}
function createActivatedRoute(c) {
    return new router_state_1.ActivatedRoute(new BehaviorSubject_1.BehaviorSubject(c.url), new BehaviorSubject_1.BehaviorSubject(c.params), c.outlet, c.component, c);
}
function equalRouteSnapshots(a, b) {
    return a._routeConfig === b._routeConfig;
}
//# sourceMappingURL=create_router_state.js.map