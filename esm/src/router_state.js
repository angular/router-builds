"use strict";
const BehaviorSubject_1 = require('rxjs/BehaviorSubject');
const shared_1 = require('./shared');
const url_tree_1 = require('./url_tree');
const collection_1 = require('./utils/collection');
const tree_1 = require('./utils/tree');
/**
 * The state of the router.
 *
 * ### Usage
 *
 * ```
 * class MyComponent {
 *   constructor(router: Router) {
 *     const state = router.routerState;
 *     const id: Observable<string> = state.firstChild(state.root).params.map(p => p.id);
 *     const isDebug: Observable<string> = state.queryParams.map(q => q.debug);
 *   }
 * }
 * ```
 */
class RouterState extends tree_1.Tree {
    /**
     * @internal
     */
    constructor(root, queryParams, fragment, snapshot) {
        super(root);
        this.queryParams = queryParams;
        this.fragment = fragment;
        this.snapshot = snapshot;
    }
    toString() { return this.snapshot.toString(); }
}
exports.RouterState = RouterState;
function createEmptyState(urlTree, rootComponent) {
    const snapshot = createEmptyStateSnapshot(urlTree, rootComponent);
    const emptyUrl = new BehaviorSubject_1.BehaviorSubject([new url_tree_1.UrlPathWithParams('', {})]);
    const emptyParams = new BehaviorSubject_1.BehaviorSubject({});
    const emptyQueryParams = new BehaviorSubject_1.BehaviorSubject({});
    const fragment = new BehaviorSubject_1.BehaviorSubject('');
    const activated = new ActivatedRoute(emptyUrl, emptyParams, shared_1.PRIMARY_OUTLET, rootComponent, snapshot.root);
    activated.snapshot = snapshot.root;
    return new RouterState(new tree_1.TreeNode(activated, []), emptyQueryParams, fragment, snapshot);
}
exports.createEmptyState = createEmptyState;
function createEmptyStateSnapshot(urlTree, rootComponent) {
    const emptyParams = {};
    const emptyQueryParams = {};
    const fragment = '';
    const activated = new ActivatedRouteSnapshot([], emptyParams, shared_1.PRIMARY_OUTLET, rootComponent, null, urlTree.root, -1);
    return new RouterStateSnapshot('', new tree_1.TreeNode(activated, []), emptyQueryParams, fragment);
}
/**
 * Contains the information about a component loaded in an outlet. The information is provided
 * through
 * the params and urlSegments observables.
 *
 * ### Usage
 *
 * ```
 * class MyComponent {
 *   constructor(route: ActivatedRoute) {
 *     const id: Observable<string> = route.params.map(p => p.id);
 *   }
 * }
 * ```
 */
class ActivatedRoute {
    /**
     * @internal
     */
    constructor(url, params, outlet, component, futureSnapshot) {
        this.url = url;
        this.params = params;
        this.outlet = outlet;
        this.component = component;
        this._futureSnapshot = futureSnapshot;
    }
    toString() {
        return this.snapshot ? this.snapshot.toString() : `Future(${this._futureSnapshot})`;
    }
}
exports.ActivatedRoute = ActivatedRoute;
/**
 * Contains the information about a component loaded in an outlet at a particular moment in time.
 *
 * ### Usage
 *
 * ```
 * class MyComponent {
 *   constructor(route: ActivatedRoute) {
 *     const id: string = route.snapshot.params.id;
 *   }
 * }
 * ```
 */
class ActivatedRouteSnapshot {
    /**
     * @internal
     */
    constructor(url, params, outlet, component, routeConfig, urlSegment, lastPathIndex) {
        this.url = url;
        this.params = params;
        this.outlet = outlet;
        this.component = component;
        this._routeConfig = routeConfig;
        this._urlSegment = urlSegment;
        this._lastPathIndex = lastPathIndex;
    }
    toString() {
        const url = this.url.map(s => s.toString()).join('/');
        const matched = this._routeConfig ? this._routeConfig.path : '';
        return `Route(url:'${url}', path:'${matched}')`;
    }
}
exports.ActivatedRouteSnapshot = ActivatedRouteSnapshot;
/**
 * The state of the router at a particular moment in time.
 *
 * ### Usage
 *
 * ```
 * class MyComponent {
 *   constructor(router: Router) {
 *     const snapshot = router.routerState.snapshot;
 *   }
 * }
 * ```
 */
class RouterStateSnapshot extends tree_1.Tree {
    /**
     * @internal
     */
    constructor(url, root, queryParams, fragment) {
        super(root);
        this.url = url;
        this.queryParams = queryParams;
        this.fragment = fragment;
    }
    toString() { return serializeNode(this._root); }
}
exports.RouterStateSnapshot = RouterStateSnapshot;
function serializeNode(node) {
    const c = node.children.length > 0 ? ` { ${node.children.map(serializeNode).join(", ")} } ` : '';
    return `${node.value}${c}`;
}
/**
 * The expectation is that the activate route is created with the right set of parameters.
 * So we push new values into the observables only when they are not the initial values.
 * And we detect that by checking if the snapshot field is set.
 */
function advanceActivatedRoute(route) {
    if (route.snapshot && !collection_1.shallowEqual(route.snapshot.params, route._futureSnapshot.params)) {
        route.snapshot = route._futureSnapshot;
        route.url.next(route.snapshot.url);
        route.params.next(route.snapshot.params);
    }
    else {
        route.snapshot = route._futureSnapshot;
    }
}
exports.advanceActivatedRoute = advanceActivatedRoute;
//# sourceMappingURL=router_state.js.map