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
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { PRIMARY_OUTLET, convertToParamMap } from './shared';
import { UrlSegment, equalSegments } from './url_tree';
import { shallowEqual, shallowEqualArrays } from './utils/collection';
import { Tree, TreeNode } from './utils/tree';
/**
 * \@description
 *
 * Represents the state of the router.
 *
 * RouterState is a tree of activated routes. Every node in this tree knows about the "consumed" URL
 * segments, the extracted parameters, and the resolved data.
 *
 * ### Example
 *
 * ```
 * \@Component({templateUrl:'template.html'})
 * class MyComponent {
 *   constructor(router: Router) {
 *     const state: RouterState = router.routerState;
 *     const root: ActivatedRoute = state.root;
 *     const child = root.firstChild;
 *     const id: Observable<string> = child.params.map(p => p.id);
 *     //...
 *   }
 * }
 * ```
 *
 * See `ActivatedRoute` for more information.
 *
 *
 */
export class RouterState extends Tree {
    /**
     * \@internal
     * @param {?} root
     * @param {?} snapshot
     */
    constructor(root, snapshot) {
        super(root);
        this.snapshot = snapshot;
        setRouterState(/** @type {?} */ (this), root);
    }
    /**
     * @return {?}
     */
    toString() { return this.snapshot.toString(); }
}
if (false) {
    /**
     * The current snapshot of the router state
     * @type {?}
     */
    RouterState.prototype.snapshot;
}
/**
 * @param {?} urlTree
 * @param {?} rootComponent
 * @return {?}
 */
export function createEmptyState(urlTree, rootComponent) {
    /** @type {?} */
    const snapshot = createEmptyStateSnapshot(urlTree, rootComponent);
    /** @type {?} */
    const emptyUrl = new BehaviorSubject([new UrlSegment('', {})]);
    /** @type {?} */
    const emptyParams = new BehaviorSubject({});
    /** @type {?} */
    const emptyData = new BehaviorSubject({});
    /** @type {?} */
    const emptyQueryParams = new BehaviorSubject({});
    /** @type {?} */
    const fragment = new BehaviorSubject('');
    /** @type {?} */
    const activated = new ActivatedRoute(emptyUrl, emptyParams, emptyQueryParams, fragment, emptyData, PRIMARY_OUTLET, rootComponent, snapshot.root);
    activated.snapshot = snapshot.root;
    return new RouterState(new TreeNode(activated, []), snapshot);
}
/**
 * @param {?} urlTree
 * @param {?} rootComponent
 * @return {?}
 */
export function createEmptyStateSnapshot(urlTree, rootComponent) {
    /** @type {?} */
    const emptyParams = {};
    /** @type {?} */
    const emptyData = {};
    /** @type {?} */
    const emptyQueryParams = {};
    /** @type {?} */
    const fragment = '';
    /** @type {?} */
    const activated = new ActivatedRouteSnapshot([], emptyParams, emptyQueryParams, fragment, emptyData, PRIMARY_OUTLET, rootComponent, null, urlTree.root, -1, {});
    return new RouterStateSnapshot('', new TreeNode(activated, []));
}
/**
 * \@description
 *
 * Contains the information about a route associated with a component loaded in an
 * outlet.  An `ActivatedRoute` can also be used to traverse the router state tree.
 *
 * ```
 * \@Component({...})
 * class MyComponent {
 *   constructor(route: ActivatedRoute) {
 *     const id: Observable<string> = route.params.map(p => p.id);
 *     const url: Observable<string> = route.url.map(segments => segments.join(''));
 *     // route.data includes both `data` and `resolve`
 *     const user = route.data.map(d => d.user);
 *   }
 * }
 * ```
 *
 *
 */
export class ActivatedRoute {
    /**
     * \@internal
     * @param {?} url
     * @param {?} params
     * @param {?} queryParams
     * @param {?} fragment
     * @param {?} data
     * @param {?} outlet
     * @param {?} component
     * @param {?} futureSnapshot
     */
    constructor(url, params, queryParams, fragment, data, outlet, component, futureSnapshot) {
        this.url = url;
        this.params = params;
        this.queryParams = queryParams;
        this.fragment = fragment;
        this.data = data;
        this.outlet = outlet;
        this.component = component;
        this._futureSnapshot = futureSnapshot;
    }
    /**
     * The configuration used to match this route
     * @return {?}
     */
    get routeConfig() { return this._futureSnapshot.routeConfig; }
    /**
     * The root of the router state
     * @return {?}
     */
    get root() { return this._routerState.root; }
    /**
     * The parent of this route in the router state tree
     * @return {?}
     */
    get parent() { return this._routerState.parent(this); }
    /**
     * The first child of this route in the router state tree
     * @return {?}
     */
    get firstChild() { return this._routerState.firstChild(this); }
    /**
     * The children of this route in the router state tree
     * @return {?}
     */
    get children() { return this._routerState.children(this); }
    /**
     * The path from the root of the router state tree to this route
     * @return {?}
     */
    get pathFromRoot() { return this._routerState.pathFromRoot(this); }
    /**
     * @return {?}
     */
    get paramMap() {
        if (!this._paramMap) {
            this._paramMap = this.params.pipe(map((p) => convertToParamMap(p)));
        }
        return this._paramMap;
    }
    /**
     * @return {?}
     */
    get queryParamMap() {
        if (!this._queryParamMap) {
            this._queryParamMap =
                this.queryParams.pipe(map((p) => convertToParamMap(p)));
        }
        return this._queryParamMap;
    }
    /**
     * @return {?}
     */
    toString() {
        return this.snapshot ? this.snapshot.toString() : `Future(${this._futureSnapshot})`;
    }
}
if (false) {
    /**
     * The current snapshot of this route
     * @type {?}
     */
    ActivatedRoute.prototype.snapshot;
    /**
     * \@internal
     * @type {?}
     */
    ActivatedRoute.prototype._futureSnapshot;
    /**
     * \@internal
     * @type {?}
     */
    ActivatedRoute.prototype._routerState;
    /**
     * \@internal
     * @type {?}
     */
    ActivatedRoute.prototype._paramMap;
    /**
     * \@internal
     * @type {?}
     */
    ActivatedRoute.prototype._queryParamMap;
    /**
     * An observable of the URL segments matched by this route
     * @type {?}
     */
    ActivatedRoute.prototype.url;
    /**
     * An observable of the matrix parameters scoped to this route
     * @type {?}
     */
    ActivatedRoute.prototype.params;
    /**
     * An observable of the query parameters shared by all the routes
     * @type {?}
     */
    ActivatedRoute.prototype.queryParams;
    /**
     * An observable of the URL fragment shared by all the routes
     * @type {?}
     */
    ActivatedRoute.prototype.fragment;
    /**
     * An observable of the static and resolved data of this route.
     * @type {?}
     */
    ActivatedRoute.prototype.data;
    /**
     * The outlet name of the route. It's a constant
     * @type {?}
     */
    ActivatedRoute.prototype.outlet;
    /**
     * The component of the route. It's a constant
     * @type {?}
     */
    ActivatedRoute.prototype.component;
}
/** @typedef {?} */
var ParamsInheritanceStrategy;
export { ParamsInheritanceStrategy };
/** @typedef {?} */
var Inherited;
export { Inherited };
/**
 * Returns the inherited params, data, and resolve for a given route.
 * By default, this only inherits values up to the nearest path-less or component-less route.
 * \@internal
 * @param {?} route
 * @param {?=} paramsInheritanceStrategy
 * @return {?}
 */
export function inheritedParamsDataResolve(route, paramsInheritanceStrategy = 'emptyOnly') {
    /** @type {?} */
    const pathFromRoot = route.pathFromRoot;
    /** @type {?} */
    let inheritingStartingFrom = 0;
    if (paramsInheritanceStrategy !== 'always') {
        inheritingStartingFrom = pathFromRoot.length - 1;
        while (inheritingStartingFrom >= 1) {
            /** @type {?} */
            const current = pathFromRoot[inheritingStartingFrom];
            /** @type {?} */
            const parent = pathFromRoot[inheritingStartingFrom - 1];
            // current route is an empty path => inherits its parent's params and data
            if (current.routeConfig && current.routeConfig.path === '') {
                inheritingStartingFrom--;
                // parent is componentless => current route should inherit its params and data
            }
            else if (!parent.component) {
                inheritingStartingFrom--;
            }
            else {
                break;
            }
        }
    }
    return flattenInherited(pathFromRoot.slice(inheritingStartingFrom));
}
/**
 * \@internal
 * @param {?} pathFromRoot
 * @return {?}
 */
function flattenInherited(pathFromRoot) {
    return pathFromRoot.reduce((res, curr) => {
        /** @type {?} */
        const params = Object.assign({}, res.params, curr.params);
        /** @type {?} */
        const data = Object.assign({}, res.data, curr.data);
        /** @type {?} */
        const resolve = Object.assign({}, res.resolve, curr._resolvedData);
        return { params, data, resolve };
    }, /** @type {?} */ ({ params: {}, data: {}, resolve: {} }));
}
/**
 * \@description
 *
 * Contains the information about a route associated with a component loaded in an
 * outlet at a particular moment in time. ActivatedRouteSnapshot can also be used to
 * traverse the router state tree.
 *
 * ```
 * \@Component({templateUrl:'./my-component.html'})
 * class MyComponent {
 *   constructor(route: ActivatedRoute) {
 *     const id: string = route.snapshot.params.id;
 *     const url: string = route.snapshot.url.join('');
 *     const user = route.snapshot.data.user;
 *   }
 * }
 * ```
 *
 *
 */
export class ActivatedRouteSnapshot {
    /**
     * \@internal
     * @param {?} url
     * @param {?} params
     * @param {?} queryParams
     * @param {?} fragment
     * @param {?} data
     * @param {?} outlet
     * @param {?} component
     * @param {?} routeConfig
     * @param {?} urlSegment
     * @param {?} lastPathIndex
     * @param {?} resolve
     */
    constructor(url, params, queryParams, fragment, data, outlet, component, routeConfig, urlSegment, lastPathIndex, resolve) {
        this.url = url;
        this.params = params;
        this.queryParams = queryParams;
        this.fragment = fragment;
        this.data = data;
        this.outlet = outlet;
        this.component = component;
        this.routeConfig = routeConfig;
        this._urlSegment = urlSegment;
        this._lastPathIndex = lastPathIndex;
        this._resolve = resolve;
    }
    /**
     * The root of the router state
     * @return {?}
     */
    get root() { return this._routerState.root; }
    /**
     * The parent of this route in the router state tree
     * @return {?}
     */
    get parent() { return this._routerState.parent(this); }
    /**
     * The first child of this route in the router state tree
     * @return {?}
     */
    get firstChild() { return this._routerState.firstChild(this); }
    /**
     * The children of this route in the router state tree
     * @return {?}
     */
    get children() { return this._routerState.children(this); }
    /**
     * The path from the root of the router state tree to this route
     * @return {?}
     */
    get pathFromRoot() { return this._routerState.pathFromRoot(this); }
    /**
     * @return {?}
     */
    get paramMap() {
        if (!this._paramMap) {
            this._paramMap = convertToParamMap(this.params);
        }
        return this._paramMap;
    }
    /**
     * @return {?}
     */
    get queryParamMap() {
        if (!this._queryParamMap) {
            this._queryParamMap = convertToParamMap(this.queryParams);
        }
        return this._queryParamMap;
    }
    /**
     * @return {?}
     */
    toString() {
        /** @type {?} */
        const url = this.url.map(segment => segment.toString()).join('/');
        /** @type {?} */
        const matched = this.routeConfig ? this.routeConfig.path : '';
        return `Route(url:'${url}', path:'${matched}')`;
    }
}
if (false) {
    /**
     * The configuration used to match this route *
     * @type {?}
     */
    ActivatedRouteSnapshot.prototype.routeConfig;
    /**
     * \@internal *
     * @type {?}
     */
    ActivatedRouteSnapshot.prototype._urlSegment;
    /**
     * \@internal
     * @type {?}
     */
    ActivatedRouteSnapshot.prototype._lastPathIndex;
    /**
     * \@internal
     * @type {?}
     */
    ActivatedRouteSnapshot.prototype._resolve;
    /**
     * \@internal
     * @type {?}
     */
    ActivatedRouteSnapshot.prototype._resolvedData;
    /**
     * \@internal
     * @type {?}
     */
    ActivatedRouteSnapshot.prototype._routerState;
    /**
     * \@internal
     * @type {?}
     */
    ActivatedRouteSnapshot.prototype._paramMap;
    /**
     * \@internal
     * @type {?}
     */
    ActivatedRouteSnapshot.prototype._queryParamMap;
    /**
     * The URL segments matched by this route
     * @type {?}
     */
    ActivatedRouteSnapshot.prototype.url;
    /**
     * The matrix parameters scoped to this route
     * @type {?}
     */
    ActivatedRouteSnapshot.prototype.params;
    /**
     * The query parameters shared by all the routes
     * @type {?}
     */
    ActivatedRouteSnapshot.prototype.queryParams;
    /**
     * The URL fragment shared by all the routes
     * @type {?}
     */
    ActivatedRouteSnapshot.prototype.fragment;
    /**
     * The static and resolved data of this route
     * @type {?}
     */
    ActivatedRouteSnapshot.prototype.data;
    /**
     * The outlet name of the route
     * @type {?}
     */
    ActivatedRouteSnapshot.prototype.outlet;
    /**
     * The component of the route
     * @type {?}
     */
    ActivatedRouteSnapshot.prototype.component;
}
/**
 * \@description
 *
 * Represents the state of the router at a moment in time.
 *
 * This is a tree of activated route snapshots. Every node in this tree knows about
 * the "consumed" URL segments, the extracted parameters, and the resolved data.
 *
 * ### Example
 *
 * ```
 * \@Component({templateUrl:'template.html'})
 * class MyComponent {
 *   constructor(router: Router) {
 *     const state: RouterState = router.routerState;
 *     const snapshot: RouterStateSnapshot = state.snapshot;
 *     const root: ActivatedRouteSnapshot = snapshot.root;
 *     const child = root.firstChild;
 *     const id: Observable<string> = child.params.map(p => p.id);
 *     //...
 *   }
 * }
 * ```
 *
 *
 */
export class RouterStateSnapshot extends Tree {
    /**
     * \@internal
     * @param {?} url
     * @param {?} root
     */
    constructor(url, root) {
        super(root);
        this.url = url;
        setRouterState(/** @type {?} */ (this), root);
    }
    /**
     * @return {?}
     */
    toString() { return serializeNode(this._root); }
}
if (false) {
    /**
     * The url from which this snapshot was created
     * @type {?}
     */
    RouterStateSnapshot.prototype.url;
}
/**
 * @template U, T
 * @param {?} state
 * @param {?} node
 * @return {?}
 */
function setRouterState(state, node) {
    node.value._routerState = state;
    node.children.forEach(c => setRouterState(state, c));
}
/**
 * @param {?} node
 * @return {?}
 */
function serializeNode(node) {
    /** @type {?} */
    const c = node.children.length > 0 ? ` { ${node.children.map(serializeNode).join(', ')} } ` : '';
    return `${node.value}${c}`;
}
/**
 * The expectation is that the activate route is created with the right set of parameters.
 * So we push new values into the observables only when they are not the initial values.
 * And we detect that by checking if the snapshot field is set.
 * @param {?} route
 * @return {?}
 */
export function advanceActivatedRoute(route) {
    if (route.snapshot) {
        /** @type {?} */
        const currentSnapshot = route.snapshot;
        /** @type {?} */
        const nextSnapshot = route._futureSnapshot;
        route.snapshot = nextSnapshot;
        if (!shallowEqual(currentSnapshot.queryParams, nextSnapshot.queryParams)) {
            (/** @type {?} */ (route.queryParams)).next(nextSnapshot.queryParams);
        }
        if (currentSnapshot.fragment !== nextSnapshot.fragment) {
            (/** @type {?} */ (route.fragment)).next(nextSnapshot.fragment);
        }
        if (!shallowEqual(currentSnapshot.params, nextSnapshot.params)) {
            (/** @type {?} */ (route.params)).next(nextSnapshot.params);
        }
        if (!shallowEqualArrays(currentSnapshot.url, nextSnapshot.url)) {
            (/** @type {?} */ (route.url)).next(nextSnapshot.url);
        }
        if (!shallowEqual(currentSnapshot.data, nextSnapshot.data)) {
            (/** @type {?} */ (route.data)).next(nextSnapshot.data);
        }
    }
    else {
        route.snapshot = route._futureSnapshot;
        // this is for resolved data
        (/** @type {?} */ (route.data)).next(route._futureSnapshot.data);
    }
}
/**
 * @param {?} a
 * @param {?} b
 * @return {?}
 */
export function equalParamsAndUrlSegments(a, b) {
    /** @type {?} */
    const equalUrlParams = shallowEqual(a.params, b.params) && equalSegments(a.url, b.url);
    /** @type {?} */
    const parentsMismatch = !a.parent !== !b.parent;
    return equalUrlParams && !parentsMismatch &&
        (!a.parent || equalParamsAndUrlSegments(a.parent, /** @type {?} */ ((b.parent))));
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3N0YXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXJfc3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFTQSxPQUFPLEVBQUMsZUFBZSxFQUFhLE1BQU0sTUFBTSxDQUFDO0FBQ2pELE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUduQyxPQUFPLEVBQUMsY0FBYyxFQUFvQixpQkFBaUIsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3RSxPQUFPLEVBQUMsVUFBVSxFQUE0QixhQUFhLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDL0UsT0FBTyxFQUFDLFlBQVksRUFBRSxrQkFBa0IsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3BFLE9BQU8sRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFDLE1BQU0sY0FBYyxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBK0I1QyxNQUFNLE9BQU8sV0FBWSxTQUFRLElBQW9COzs7Ozs7SUFFbkQsWUFDSSxJQUE4QixFQUV2QjtRQUNULEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQURILGFBQVEsR0FBUixRQUFRO1FBRWpCLGNBQWMsbUJBQWMsSUFBSSxHQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3pDOzs7O0lBRUQsUUFBUSxLQUFhLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFO0NBQ3hEOzs7Ozs7Ozs7Ozs7O0FBRUQsTUFBTSxVQUFVLGdCQUFnQixDQUFDLE9BQWdCLEVBQUUsYUFBOEI7O0lBQy9FLE1BQU0sUUFBUSxHQUFHLHdCQUF3QixDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQzs7SUFDbEUsTUFBTSxRQUFRLEdBQUcsSUFBSSxlQUFlLENBQUMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENB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LEVBQUU7WUFDOUQsbUJBQU0sS0FBSyxDQUFDLEdBQUcsRUFBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDekM7UUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzFELG1CQUFNLEtBQUssQ0FBQyxJQUFJLEVBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzNDO0tBQ0Y7U0FBTTtRQUNMLEtBQUssQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQzs7UUFHdkMsbUJBQU0sS0FBSyxDQUFDLElBQUksRUFBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3BEO0NBQ0Y7Ozs7OztBQUdELE1BQU0sVUFBVSx5QkFBeUIsQ0FDckMsQ0FBeUIsRUFBRSxDQUF5Qjs7SUFDdEQsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7SUFDdkYsTUFBTSxlQUFlLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUVoRCxPQUFPLGNBQWMsSUFBSSxDQUFDLGVBQWU7UUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUkseUJBQXlCLENBQUMsQ0FBQyxDQUFDLE1BQU0scUJBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7Q0FDcEUiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7VHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0JlaGF2aW9yU3ViamVjdCwgT2JzZXJ2YWJsZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQge21hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0RhdGEsIFJlc29sdmVEYXRhLCBSb3V0ZX0gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtQUklNQVJZX09VVExFVCwgUGFyYW1NYXAsIFBhcmFtcywgY29udmVydFRvUGFyYW1NYXB9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7VXJsU2VnbWVudCwgVXJsU2VnbWVudEdyb3VwLCBVcmxUcmVlLCBlcXVhbFNlZ21lbnRzfSBmcm9tICcuL3VybF90cmVlJztcbmltcG9ydCB7c2hhbGxvd0VxdWFsLCBzaGFsbG93RXF1YWxBcnJheXN9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge1RyZWUsIFRyZWVOb2RlfSBmcm9tICcuL3V0aWxzL3RyZWUnO1xuXG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIHRoZSBzdGF0ZSBvZiB0aGUgcm91dGVyLlxuICpcbiAqIFJvdXRlclN0YXRlIGlzIGEgdHJlZSBvZiBhY3RpdmF0ZWQgcm91dGVzLiBFdmVyeSBub2RlIGluIHRoaXMgdHJlZSBrbm93cyBhYm91dCB0aGUgXCJjb25zdW1lZFwiIFVSTFxuICogc2VnbWVudHMsIHRoZSBleHRyYWN0ZWQgcGFyYW1ldGVycywgYW5kIHRoZSByZXNvbHZlZCBkYXRhLlxuICpcbiAqICMjIyBFeGFtcGxlXG4gKlxuICogYGBgXG4gKiBAQ29tcG9uZW50KHt0ZW1wbGF0ZVVybDondGVtcGxhdGUuaHRtbCd9KVxuICogY2xhc3MgTXlDb21wb25lbnQge1xuICogICBjb25zdHJ1Y3Rvcihyb3V0ZXI6IFJvdXRlcikge1xuICogICAgIGNvbnN0IHN0YXRlOiBSb3V0ZXJTdGF0ZSA9IHJvdXRlci5yb3V0ZXJTdGF0ZTtcbiAqICAgICBjb25zdCByb290OiBBY3RpdmF0ZWRSb3V0ZSA9IHN0YXRlLnJvb3Q7XG4gKiAgICAgY29uc3QgY2hpbGQgPSByb290LmZpcnN0Q2hpbGQ7XG4gKiAgICAgY29uc3QgaWQ6IE9ic2VydmFibGU8c3RyaW5nPiA9IGNoaWxkLnBhcmFtcy5tYXAocCA9PiBwLmlkKTtcbiAqICAgICAvLy4uLlxuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBTZWUgYEFjdGl2YXRlZFJvdXRlYCBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqXG4gKlxuICovXG5leHBvcnQgY2xhc3MgUm91dGVyU3RhdGUgZXh0ZW5kcyBUcmVlPEFjdGl2YXRlZFJvdXRlPiB7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgICByb290OiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sXG4gICAgICAvKiogVGhlIGN1cnJlbnQgc25hcHNob3Qgb2YgdGhlIHJvdXRlciBzdGF0ZSAqL1xuICAgICAgcHVibGljIHNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90KSB7XG4gICAgc3VwZXIocm9vdCk7XG4gICAgc2V0Um91dGVyU3RhdGUoPFJvdXRlclN0YXRlPnRoaXMsIHJvb3QpO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuc25hcHNob3QudG9TdHJpbmcoKTsgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRW1wdHlTdGF0ZSh1cmxUcmVlOiBVcmxUcmVlLCByb290Q29tcG9uZW50OiBUeXBlPGFueT58IG51bGwpOiBSb3V0ZXJTdGF0ZSB7XG4gIGNvbnN0IHNuYXBzaG90ID0gY3JlYXRlRW1wdHlTdGF0ZVNuYXBzaG90KHVybFRyZWUsIHJvb3RDb21wb25lbnQpO1xuICBjb25zdCBlbXB0eVVybCA9IG5ldyBCZWhhdmlvclN1YmplY3QoW25ldyBVcmxTZWdtZW50KCcnLCB7fSldKTtcbiAgY29uc3QgZW1wdHlQYXJhbXMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0KHt9KTtcbiAgY29uc3QgZW1wdHlEYXRhID0gbmV3IEJlaGF2aW9yU3ViamVjdCh7fSk7XG4gIGNvbnN0IGVtcHR5UXVlcnlQYXJhbXMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0KHt9KTtcbiAgY29uc3QgZnJhZ21lbnQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0KCcnKTtcbiAgY29uc3QgYWN0aXZhdGVkID0gbmV3IEFjdGl2YXRlZFJvdXRlKFxuICAgICAgZW1wdHlVcmwsIGVtcHR5UGFyYW1zLCBlbXB0eVF1ZXJ5UGFyYW1zLCBmcmFnbWVudCwgZW1wdHlEYXRhLCBQUklNQVJZX09VVExFVCwgcm9vdENvbXBvbmVudCxcbiAgICAgIHNuYXBzaG90LnJvb3QpO1xuICBhY3RpdmF0ZWQuc25hcHNob3QgPSBzbmFwc2hvdC5yb290O1xuICByZXR1cm4gbmV3IFJvdXRlclN0YXRlKG5ldyBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4oYWN0aXZhdGVkLCBbXSksIHNuYXBzaG90KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVtcHR5U3RhdGVTbmFwc2hvdChcbiAgICB1cmxUcmVlOiBVcmxUcmVlLCByb290Q29tcG9uZW50OiBUeXBlPGFueT58IG51bGwpOiBSb3V0ZXJTdGF0ZVNuYXBzaG90IHtcbiAgY29uc3QgZW1wdHlQYXJhbXMgPSB7fTtcbiAgY29uc3QgZW1wdHlEYXRhID0ge307XG4gIGNvbnN0IGVtcHR5UXVlcnlQYXJhbXMgPSB7fTtcbiAgY29uc3QgZnJhZ21lbnQgPSAnJztcbiAgY29uc3QgYWN0aXZhdGVkID0gbmV3IEFjdGl2YXRlZFJvdXRlU25hcHNob3QoXG4gICAgICBbXSwgZW1wdHlQYXJhbXMsIGVtcHR5UXVlcnlQYXJhbXMsIGZyYWdtZW50LCBlbXB0eURhdGEsIFBSSU1BUllfT1VUTEVULCByb290Q29tcG9uZW50LCBudWxsLFxuICAgICAgdXJsVHJlZS5yb290LCAtMSwge30pO1xuICByZXR1cm4gbmV3IFJvdXRlclN0YXRlU25hcHNob3QoJycsIG5ldyBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PihhY3RpdmF0ZWQsIFtdKSk7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQ29udGFpbnMgdGhlIGluZm9ybWF0aW9uIGFib3V0IGEgcm91dGUgYXNzb2NpYXRlZCB3aXRoIGEgY29tcG9uZW50IGxvYWRlZCBpbiBhblxuICogb3V0bGV0LiAgQW4gYEFjdGl2YXRlZFJvdXRlYCBjYW4gYWxzbyBiZSB1c2VkIHRvIHRyYXZlcnNlIHRoZSByb3V0ZXIgc3RhdGUgdHJlZS5cbiAqXG4gKiBgYGBcbiAqIEBDb21wb25lbnQoey4uLn0pXG4gKiBjbGFzcyBNeUNvbXBvbmVudCB7XG4gKiAgIGNvbnN0cnVjdG9yKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSkge1xuICogICAgIGNvbnN0IGlkOiBPYnNlcnZhYmxlPHN0cmluZz4gPSByb3V0ZS5wYXJhbXMubWFwKHAgPT4gcC5pZCk7XG4gKiAgICAgY29uc3QgdXJsOiBPYnNlcnZhYmxlPHN0cmluZz4gPSByb3V0ZS51cmwubWFwKHNlZ21lbnRzID0+IHNlZ21lbnRzLmpvaW4oJycpKTtcbiAqICAgICAvLyByb3V0ZS5kYXRhIGluY2x1ZGVzIGJvdGggYGRhdGFgIGFuZCBgcmVzb2x2ZWBcbiAqICAgICBjb25zdCB1c2VyID0gcm91dGUuZGF0YS5tYXAoZCA9PiBkLnVzZXIpO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKlxuICovXG5leHBvcnQgY2xhc3MgQWN0aXZhdGVkUm91dGUge1xuICAvKiogVGhlIGN1cnJlbnQgc25hcHNob3Qgb2YgdGhpcyByb3V0ZSAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgc25hcHNob3QgITogQWN0aXZhdGVkUm91dGVTbmFwc2hvdDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfZnV0dXJlU25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3Q7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIF9yb3V0ZXJTdGF0ZSAhOiBSb3V0ZXJTdGF0ZTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgX3BhcmFtTWFwICE6IE9ic2VydmFibGU8UGFyYW1NYXA+O1xuICAvKiogQGludGVybmFsICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBfcXVlcnlQYXJhbU1hcCAhOiBPYnNlcnZhYmxlPFBhcmFtTWFwPjtcblxuICAvKiogQGludGVybmFsICovXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEFuIG9ic2VydmFibGUgb2YgdGhlIFVSTCBzZWdtZW50cyBtYXRjaGVkIGJ5IHRoaXMgcm91dGUgKi9cbiAgICAgIHB1YmxpYyB1cmw6IE9ic2VydmFibGU8VXJsU2VnbWVudFtdPixcbiAgICAgIC8qKiBBbiBvYnNlcnZhYmxlIG9mIHRoZSBtYXRyaXggcGFyYW1ldGVycyBzY29wZWQgdG8gdGhpcyByb3V0ZSAqL1xuICAgICAgcHVibGljIHBhcmFtczogT2JzZXJ2YWJsZTxQYXJhbXM+LFxuICAgICAgLyoqIEFuIG9ic2VydmFibGUgb2YgdGhlIHF1ZXJ5IHBhcmFtZXRlcnMgc2hhcmVkIGJ5IGFsbCB0aGUgcm91dGVzICovXG4gICAgICBwdWJsaWMgcXVlcnlQYXJhbXM6IE9ic2VydmFibGU8UGFyYW1zPixcbiAgICAgIC8qKiBBbiBvYnNlcnZhYmxlIG9mIHRoZSBVUkwgZnJhZ21lbnQgc2hhcmVkIGJ5IGFsbCB0aGUgcm91dGVzICovXG4gICAgICBwdWJsaWMgZnJhZ21lbnQ6IE9ic2VydmFibGU8c3RyaW5nPixcbiAgICAgIC8qKiBBbiBvYnNlcnZhYmxlIG9mIHRoZSBzdGF0aWMgYW5kIHJlc29sdmVkIGRhdGEgb2YgdGhpcyByb3V0ZS4gKi9cbiAgICAgIHB1YmxpYyBkYXRhOiBPYnNlcnZhYmxlPERhdGE+LFxuICAgICAgLyoqIFRoZSBvdXRsZXQgbmFtZSBvZiB0aGUgcm91dGUuIEl0J3MgYSBjb25zdGFudCAqL1xuICAgICAgcHVibGljIG91dGxldDogc3RyaW5nLFxuICAgICAgLyoqIFRoZSBjb21wb25lbnQgb2YgdGhlIHJvdXRlLiBJdCdzIGEgY29uc3RhbnQgKi9cbiAgICAgIC8vIFRPRE8odnNhdmtpbik6IHJlbW92ZSB8c3RyaW5nXG4gICAgICBwdWJsaWMgY29tcG9uZW50OiBUeXBlPGFueT58c3RyaW5nfG51bGwsIGZ1dHVyZVNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSB7XG4gICAgdGhpcy5fZnV0dXJlU25hcHNob3QgPSBmdXR1cmVTbmFwc2hvdDtcbiAgfVxuXG4gIC8qKiBUaGUgY29uZmlndXJhdGlvbiB1c2VkIHRvIG1hdGNoIHRoaXMgcm91dGUgKi9cbiAgZ2V0IHJvdXRlQ29uZmlnKCk6IFJvdXRlfG51bGwgeyByZXR1cm4gdGhpcy5fZnV0dXJlU25hcHNob3Qucm91dGVDb25maWc7IH1cblxuICAvKiogVGhlIHJvb3Qgb2YgdGhlIHJvdXRlciBzdGF0ZSAqL1xuICBnZXQgcm9vdCgpOiBBY3RpdmF0ZWRSb3V0ZSB7IHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5yb290OyB9XG5cbiAgLyoqIFRoZSBwYXJlbnQgb2YgdGhpcyByb3V0ZSBpbiB0aGUgcm91dGVyIHN0YXRlIHRyZWUgKi9cbiAgZ2V0IHBhcmVudCgpOiBBY3RpdmF0ZWRSb3V0ZXxudWxsIHsgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLnBhcmVudCh0aGlzKTsgfVxuXG4gIC8qKiBUaGUgZmlyc3QgY2hpbGQgb2YgdGhpcyByb3V0ZSBpbiB0aGUgcm91dGVyIHN0YXRlIHRyZWUgKi9cbiAgZ2V0IGZpcnN0Q2hpbGQoKTogQWN0aXZhdGVkUm91dGV8bnVsbCB7IHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5maXJzdENoaWxkKHRoaXMpOyB9XG5cbiAgLyoqIFRoZSBjaGlsZHJlbiBvZiB0aGlzIHJvdXRlIGluIHRoZSByb3V0ZXIgc3RhdGUgdHJlZSAqL1xuICBnZXQgY2hpbGRyZW4oKTogQWN0aXZhdGVkUm91dGVbXSB7IHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5jaGlsZHJlbih0aGlzKTsgfVxuXG4gIC8qKiBUaGUgcGF0aCBmcm9tIHRoZSByb290IG9mIHRoZSByb3V0ZXIgc3RhdGUgdHJlZSB0byB0aGlzIHJvdXRlICovXG4gIGdldCBwYXRoRnJvbVJvb3QoKTogQWN0aXZhdGVkUm91dGVbXSB7IHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5wYXRoRnJvbVJvb3QodGhpcyk7IH1cblxuICBnZXQgcGFyYW1NYXAoKTogT2JzZXJ2YWJsZTxQYXJhbU1hcD4ge1xuICAgIGlmICghdGhpcy5fcGFyYW1NYXApIHtcbiAgICAgIHRoaXMuX3BhcmFtTWFwID0gdGhpcy5wYXJhbXMucGlwZShtYXAoKHA6IFBhcmFtcyk6IFBhcmFtTWFwID0+IGNvbnZlcnRUb1BhcmFtTWFwKHApKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9wYXJhbU1hcDtcbiAgfVxuXG4gIGdldCBxdWVyeVBhcmFtTWFwKCk6IE9ic2VydmFibGU8UGFyYW1NYXA+IHtcbiAgICBpZiAoIXRoaXMuX3F1ZXJ5UGFyYW1NYXApIHtcbiAgICAgIHRoaXMuX3F1ZXJ5UGFyYW1NYXAgPVxuICAgICAgICAgIHRoaXMucXVlcnlQYXJhbXMucGlwZShtYXAoKHA6IFBhcmFtcyk6IFBhcmFtTWFwID0+IGNvbnZlcnRUb1BhcmFtTWFwKHApKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9xdWVyeVBhcmFtTWFwO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5zbmFwc2hvdCA/IHRoaXMuc25hcHNob3QudG9TdHJpbmcoKSA6IGBGdXR1cmUoJHt0aGlzLl9mdXR1cmVTbmFwc2hvdH0pYDtcbiAgfVxufVxuXG5leHBvcnQgdHlwZSBQYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5ID0gJ2VtcHR5T25seScgfCAnYWx3YXlzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgSW5oZXJpdGVkID0ge1xuICBwYXJhbXM6IFBhcmFtcyxcbiAgZGF0YTogRGF0YSxcbiAgcmVzb2x2ZTogRGF0YSxcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgaW5oZXJpdGVkIHBhcmFtcywgZGF0YSwgYW5kIHJlc29sdmUgZm9yIGEgZ2l2ZW4gcm91dGUuXG4gKiBCeSBkZWZhdWx0LCB0aGlzIG9ubHkgaW5oZXJpdHMgdmFsdWVzIHVwIHRvIHRoZSBuZWFyZXN0IHBhdGgtbGVzcyBvciBjb21wb25lbnQtbGVzcyByb3V0ZS5cbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5oZXJpdGVkUGFyYW1zRGF0YVJlc29sdmUoXG4gICAgcm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsXG4gICAgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogUGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSA9ICdlbXB0eU9ubHknKTogSW5oZXJpdGVkIHtcbiAgY29uc3QgcGF0aEZyb21Sb290ID0gcm91dGUucGF0aEZyb21Sb290O1xuXG4gIGxldCBpbmhlcml0aW5nU3RhcnRpbmdGcm9tID0gMDtcbiAgaWYgKHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kgIT09ICdhbHdheXMnKSB7XG4gICAgaW5oZXJpdGluZ1N0YXJ0aW5nRnJvbSA9IHBhdGhGcm9tUm9vdC5sZW5ndGggLSAxO1xuXG4gICAgd2hpbGUgKGluaGVyaXRpbmdTdGFydGluZ0Zyb20gPj0gMSkge1xuICAgICAgY29uc3QgY3VycmVudCA9IHBhdGhGcm9tUm9vdFtpbmhlcml0aW5nU3RhcnRpbmdGcm9tXTtcbiAgICAgIGNvbnN0IHBhcmVudCA9IHBhdGhGcm9tUm9vdFtpbmhlcml0aW5nU3RhcnRpbmdGcm9tIC0gMV07XG4gICAgICAvLyBjdXJyZW50IHJvdXRlIGlzIGFuIGVtcHR5IHBhdGggPT4gaW5oZXJpdHMgaXRzIHBhcmVudCdzIHBhcmFtcyBhbmQgZGF0YVxuICAgICAgaWYgKGN1cnJlbnQucm91dGVDb25maWcgJiYgY3VycmVudC5yb3V0ZUNvbmZpZy5wYXRoID09PSAnJykge1xuICAgICAgICBpbmhlcml0aW5nU3RhcnRpbmdGcm9tLS07XG5cbiAgICAgICAgLy8gcGFyZW50IGlzIGNvbXBvbmVudGxlc3MgPT4gY3VycmVudCByb3V0ZSBzaG91bGQgaW5oZXJpdCBpdHMgcGFyYW1zIGFuZCBkYXRhXG4gICAgICB9IGVsc2UgaWYgKCFwYXJlbnQuY29tcG9uZW50KSB7XG4gICAgICAgIGluaGVyaXRpbmdTdGFydGluZ0Zyb20tLTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZsYXR0ZW5Jbmhlcml0ZWQocGF0aEZyb21Sb290LnNsaWNlKGluaGVyaXRpbmdTdGFydGluZ0Zyb20pKTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gZmxhdHRlbkluaGVyaXRlZChwYXRoRnJvbVJvb3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3RbXSk6IEluaGVyaXRlZCB7XG4gIHJldHVybiBwYXRoRnJvbVJvb3QucmVkdWNlKChyZXMsIGN1cnIpID0+IHtcbiAgICBjb25zdCBwYXJhbXMgPSB7Li4ucmVzLnBhcmFtcywgLi4uY3Vyci5wYXJhbXN9O1xuICAgIGNvbnN0IGRhdGEgPSB7Li4ucmVzLmRhdGEsIC4uLmN1cnIuZGF0YX07XG4gICAgY29uc3QgcmVzb2x2ZSA9IHsuLi5yZXMucmVzb2x2ZSwgLi4uY3Vyci5fcmVzb2x2ZWREYXRhfTtcbiAgICByZXR1cm4ge3BhcmFtcywgZGF0YSwgcmVzb2x2ZX07XG4gIH0sIDxhbnk+e3BhcmFtczoge30sIGRhdGE6IHt9LCByZXNvbHZlOiB7fX0pO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIENvbnRhaW5zIHRoZSBpbmZvcm1hdGlvbiBhYm91dCBhIHJvdXRlIGFzc29jaWF0ZWQgd2l0aCBhIGNvbXBvbmVudCBsb2FkZWQgaW4gYW5cbiAqIG91dGxldCBhdCBhIHBhcnRpY3VsYXIgbW9tZW50IGluIHRpbWUuIEFjdGl2YXRlZFJvdXRlU25hcHNob3QgY2FuIGFsc28gYmUgdXNlZCB0b1xuICogdHJhdmVyc2UgdGhlIHJvdXRlciBzdGF0ZSB0cmVlLlxuICpcbiAqIGBgYFxuICogQENvbXBvbmVudCh7dGVtcGxhdGVVcmw6Jy4vbXktY29tcG9uZW50Lmh0bWwnfSlcbiAqIGNsYXNzIE15Q29tcG9uZW50IHtcbiAqICAgY29uc3RydWN0b3Iocm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7XG4gKiAgICAgY29uc3QgaWQ6IHN0cmluZyA9IHJvdXRlLnNuYXBzaG90LnBhcmFtcy5pZDtcbiAqICAgICBjb25zdCB1cmw6IHN0cmluZyA9IHJvdXRlLnNuYXBzaG90LnVybC5qb2luKCcnKTtcbiAqICAgICBjb25zdCB1c2VyID0gcm91dGUuc25hcHNob3QuZGF0YS51c2VyO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKlxuICovXG5leHBvcnQgY2xhc3MgQWN0aXZhdGVkUm91dGVTbmFwc2hvdCB7XG4gIC8qKiBUaGUgY29uZmlndXJhdGlvbiB1c2VkIHRvIG1hdGNoIHRoaXMgcm91dGUgKiovXG4gIHB1YmxpYyByZWFkb25seSByb3V0ZUNvbmZpZzogUm91dGV8bnVsbDtcbiAgLyoqIEBpbnRlcm5hbCAqKi9cbiAgX3VybFNlZ21lbnQ6IFVybFNlZ21lbnRHcm91cDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfbGFzdFBhdGhJbmRleDogbnVtYmVyO1xuICAvKiogQGludGVybmFsICovXG4gIF9yZXNvbHZlOiBSZXNvbHZlRGF0YTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgX3Jlc29sdmVkRGF0YSAhOiBEYXRhO1xuICAvKiogQGludGVybmFsICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBfcm91dGVyU3RhdGUgITogUm91dGVyU3RhdGVTbmFwc2hvdDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgX3BhcmFtTWFwICE6IFBhcmFtTWFwO1xuICAvKiogQGludGVybmFsICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBfcXVlcnlQYXJhbU1hcCAhOiBQYXJhbU1hcDtcblxuICAvKiogQGludGVybmFsICovXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIFRoZSBVUkwgc2VnbWVudHMgbWF0Y2hlZCBieSB0aGlzIHJvdXRlICovXG4gICAgICBwdWJsaWMgdXJsOiBVcmxTZWdtZW50W10sXG4gICAgICAvKiogVGhlIG1hdHJpeCBwYXJhbWV0ZXJzIHNjb3BlZCB0byB0aGlzIHJvdXRlICovXG4gICAgICBwdWJsaWMgcGFyYW1zOiBQYXJhbXMsXG4gICAgICAvKiogVGhlIHF1ZXJ5IHBhcmFtZXRlcnMgc2hhcmVkIGJ5IGFsbCB0aGUgcm91dGVzICovXG4gICAgICBwdWJsaWMgcXVlcnlQYXJhbXM6IFBhcmFtcyxcbiAgICAgIC8qKiBUaGUgVVJMIGZyYWdtZW50IHNoYXJlZCBieSBhbGwgdGhlIHJvdXRlcyAqL1xuICAgICAgcHVibGljIGZyYWdtZW50OiBzdHJpbmcsXG4gICAgICAvKiogVGhlIHN0YXRpYyBhbmQgcmVzb2x2ZWQgZGF0YSBvZiB0aGlzIHJvdXRlICovXG4gICAgICBwdWJsaWMgZGF0YTogRGF0YSxcbiAgICAgIC8qKiBUaGUgb3V0bGV0IG5hbWUgb2YgdGhlIHJvdXRlICovXG4gICAgICBwdWJsaWMgb3V0bGV0OiBzdHJpbmcsXG4gICAgICAvKiogVGhlIGNvbXBvbmVudCBvZiB0aGUgcm91dGUgKi9cbiAgICAgIHB1YmxpYyBjb21wb25lbnQ6IFR5cGU8YW55PnxzdHJpbmd8bnVsbCwgcm91dGVDb25maWc6IFJvdXRlfG51bGwsIHVybFNlZ21lbnQ6IFVybFNlZ21lbnRHcm91cCxcbiAgICAgIGxhc3RQYXRoSW5kZXg6IG51bWJlciwgcmVzb2x2ZTogUmVzb2x2ZURhdGEpIHtcbiAgICB0aGlzLnJvdXRlQ29uZmlnID0gcm91dGVDb25maWc7XG4gICAgdGhpcy5fdXJsU2VnbWVudCA9IHVybFNlZ21lbnQ7XG4gICAgdGhpcy5fbGFzdFBhdGhJbmRleCA9IGxhc3RQYXRoSW5kZXg7XG4gICAgdGhpcy5fcmVzb2x2ZSA9IHJlc29sdmU7XG4gIH1cblxuICAvKiogVGhlIHJvb3Qgb2YgdGhlIHJvdXRlciBzdGF0ZSAqL1xuICBnZXQgcm9vdCgpOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90IHsgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLnJvb3Q7IH1cblxuICAvKiogVGhlIHBhcmVudCBvZiB0aGlzIHJvdXRlIGluIHRoZSByb3V0ZXIgc3RhdGUgdHJlZSAqL1xuICBnZXQgcGFyZW50KCk6IEFjdGl2YXRlZFJvdXRlU25hcHNob3R8bnVsbCB7IHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5wYXJlbnQodGhpcyk7IH1cblxuICAvKiogVGhlIGZpcnN0IGNoaWxkIG9mIHRoaXMgcm91dGUgaW4gdGhlIHJvdXRlciBzdGF0ZSB0cmVlICovXG4gIGdldCBmaXJzdENoaWxkKCk6IEFjdGl2YXRlZFJvdXRlU25hcHNob3R8bnVsbCB7IHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5maXJzdENoaWxkKHRoaXMpOyB9XG5cbiAgLyoqIFRoZSBjaGlsZHJlbiBvZiB0aGlzIHJvdXRlIGluIHRoZSByb3V0ZXIgc3RhdGUgdHJlZSAqL1xuICBnZXQgY2hpbGRyZW4oKTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdFtdIHsgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLmNoaWxkcmVuKHRoaXMpOyB9XG5cbiAgLyoqIFRoZSBwYXRoIGZyb20gdGhlIHJvb3Qgb2YgdGhlIHJvdXRlciBzdGF0ZSB0cmVlIHRvIHRoaXMgcm91dGUgKi9cbiAgZ2V0IHBhdGhGcm9tUm9vdCgpOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90W10geyByZXR1cm4gdGhpcy5fcm91dGVyU3RhdGUucGF0aEZyb21Sb290KHRoaXMpOyB9XG5cbiAgZ2V0IHBhcmFtTWFwKCk6IFBhcmFtTWFwIHtcbiAgICBpZiAoIXRoaXMuX3BhcmFtTWFwKSB7XG4gICAgICB0aGlzLl9wYXJhbU1hcCA9IGNvbnZlcnRUb1BhcmFtTWFwKHRoaXMucGFyYW1zKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3BhcmFtTWFwO1xuICB9XG5cbiAgZ2V0IHF1ZXJ5UGFyYW1NYXAoKTogUGFyYW1NYXAge1xuICAgIGlmICghdGhpcy5fcXVlcnlQYXJhbU1hcCkge1xuICAgICAgdGhpcy5fcXVlcnlQYXJhbU1hcCA9IGNvbnZlcnRUb1BhcmFtTWFwKHRoaXMucXVlcnlQYXJhbXMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcXVlcnlQYXJhbU1hcDtcbiAgfVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgY29uc3QgdXJsID0gdGhpcy51cmwubWFwKHNlZ21lbnQgPT4gc2VnbWVudC50b1N0cmluZygpKS5qb2luKCcvJyk7XG4gICAgY29uc3QgbWF0Y2hlZCA9IHRoaXMucm91dGVDb25maWcgPyB0aGlzLnJvdXRlQ29uZmlnLnBhdGggOiAnJztcbiAgICByZXR1cm4gYFJvdXRlKHVybDonJHt1cmx9JywgcGF0aDonJHttYXRjaGVkfScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIHN0YXRlIG9mIHRoZSByb3V0ZXIgYXQgYSBtb21lbnQgaW4gdGltZS5cbiAqXG4gKiBUaGlzIGlzIGEgdHJlZSBvZiBhY3RpdmF0ZWQgcm91dGUgc25hcHNob3RzLiBFdmVyeSBub2RlIGluIHRoaXMgdHJlZSBrbm93cyBhYm91dFxuICogdGhlIFwiY29uc3VtZWRcIiBVUkwgc2VnbWVudHMsIHRoZSBleHRyYWN0ZWQgcGFyYW1ldGVycywgYW5kIHRoZSByZXNvbHZlZCBkYXRhLlxuICpcbiAqICMjIyBFeGFtcGxlXG4gKlxuICogYGBgXG4gKiBAQ29tcG9uZW50KHt0ZW1wbGF0ZVVybDondGVtcGxhdGUuaHRtbCd9KVxuICogY2xhc3MgTXlDb21wb25lbnQge1xuICogICBjb25zdHJ1Y3Rvcihyb3V0ZXI6IFJvdXRlcikge1xuICogICAgIGNvbnN0IHN0YXRlOiBSb3V0ZXJTdGF0ZSA9IHJvdXRlci5yb3V0ZXJTdGF0ZTtcbiAqICAgICBjb25zdCBzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCA9IHN0YXRlLnNuYXBzaG90O1xuICogICAgIGNvbnN0IHJvb3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QgPSBzbmFwc2hvdC5yb290O1xuICogICAgIGNvbnN0IGNoaWxkID0gcm9vdC5maXJzdENoaWxkO1xuICogICAgIGNvbnN0IGlkOiBPYnNlcnZhYmxlPHN0cmluZz4gPSBjaGlsZC5wYXJhbXMubWFwKHAgPT4gcC5pZCk7XG4gKiAgICAgLy8uLi5cbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICpcbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlclN0YXRlU25hcHNob3QgZXh0ZW5kcyBUcmVlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+IHtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBUaGUgdXJsIGZyb20gd2hpY2ggdGhpcyBzbmFwc2hvdCB3YXMgY3JlYXRlZCAqL1xuICAgICAgcHVibGljIHVybDogc3RyaW5nLCByb290OiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pikge1xuICAgIHN1cGVyKHJvb3QpO1xuICAgIHNldFJvdXRlclN0YXRlKDxSb3V0ZXJTdGF0ZVNuYXBzaG90PnRoaXMsIHJvb3QpO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHsgcmV0dXJuIHNlcmlhbGl6ZU5vZGUodGhpcy5fcm9vdCk7IH1cbn1cblxuZnVuY3Rpb24gc2V0Um91dGVyU3RhdGU8VSwgVCBleHRlbmRze19yb3V0ZXJTdGF0ZTogVX0+KHN0YXRlOiBVLCBub2RlOiBUcmVlTm9kZTxUPik6IHZvaWQge1xuICBub2RlLnZhbHVlLl9yb3V0ZXJTdGF0ZSA9IHN0YXRlO1xuICBub2RlLmNoaWxkcmVuLmZvckVhY2goYyA9PiBzZXRSb3V0ZXJTdGF0ZShzdGF0ZSwgYykpO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVOb2RlKG5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KTogc3RyaW5nIHtcbiAgY29uc3QgYyA9IG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCA/IGAgeyAke25vZGUuY2hpbGRyZW4ubWFwKHNlcmlhbGl6ZU5vZGUpLmpvaW4oJywgJyl9IH0gYCA6ICcnO1xuICByZXR1cm4gYCR7bm9kZS52YWx1ZX0ke2N9YDtcbn1cblxuLyoqXG4gKiBUaGUgZXhwZWN0YXRpb24gaXMgdGhhdCB0aGUgYWN0aXZhdGUgcm91dGUgaXMgY3JlYXRlZCB3aXRoIHRoZSByaWdodCBzZXQgb2YgcGFyYW1ldGVycy5cbiAqIFNvIHdlIHB1c2ggbmV3IHZhbHVlcyBpbnRvIHRoZSBvYnNlcnZhYmxlcyBvbmx5IHdoZW4gdGhleSBhcmUgbm90IHRoZSBpbml0aWFsIHZhbHVlcy5cbiAqIEFuZCB3ZSBkZXRlY3QgdGhhdCBieSBjaGVja2luZyBpZiB0aGUgc25hcHNob3QgZmllbGQgaXMgc2V0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWR2YW5jZUFjdGl2YXRlZFJvdXRlKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSk6IHZvaWQge1xuICBpZiAocm91dGUuc25hcHNob3QpIHtcbiAgICBjb25zdCBjdXJyZW50U25hcHNob3QgPSByb3V0ZS5zbmFwc2hvdDtcbiAgICBjb25zdCBuZXh0U25hcHNob3QgPSByb3V0ZS5fZnV0dXJlU25hcHNob3Q7XG4gICAgcm91dGUuc25hcHNob3QgPSBuZXh0U25hcHNob3Q7XG4gICAgaWYgKCFzaGFsbG93RXF1YWwoY3VycmVudFNuYXBzaG90LnF1ZXJ5UGFyYW1zLCBuZXh0U25hcHNob3QucXVlcnlQYXJhbXMpKSB7XG4gICAgICAoPGFueT5yb3V0ZS5xdWVyeVBhcmFtcykubmV4dChuZXh0U25hcHNob3QucXVlcnlQYXJhbXMpO1xuICAgIH1cbiAgICBpZiAoY3VycmVudFNuYXBzaG90LmZyYWdtZW50ICE9PSBuZXh0U25hcHNob3QuZnJhZ21lbnQpIHtcbiAgICAgICg8YW55PnJvdXRlLmZyYWdtZW50KS5uZXh0KG5leHRTbmFwc2hvdC5mcmFnbWVudCk7XG4gICAgfVxuICAgIGlmICghc2hhbGxvd0VxdWFsKGN1cnJlbnRTbmFwc2hvdC5wYXJhbXMsIG5leHRTbmFwc2hvdC5wYXJhbXMpKSB7XG4gICAgICAoPGFueT5yb3V0ZS5wYXJhbXMpLm5leHQobmV4dFNuYXBzaG90LnBhcmFtcyk7XG4gICAgfVxuICAgIGlmICghc2hhbGxvd0VxdWFsQXJyYXlzKGN1cnJlbnRTbmFwc2hvdC51cmwsIG5leHRTbmFwc2hvdC51cmwpKSB7XG4gICAgICAoPGFueT5yb3V0ZS51cmwpLm5leHQobmV4dFNuYXBzaG90LnVybCk7XG4gICAgfVxuICAgIGlmICghc2hhbGxvd0VxdWFsKGN1cnJlbnRTbmFwc2hvdC5kYXRhLCBuZXh0U25hcHNob3QuZGF0YSkpIHtcbiAgICAgICg8YW55PnJvdXRlLmRhdGEpLm5leHQobmV4dFNuYXBzaG90LmRhdGEpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByb3V0ZS5zbmFwc2hvdCA9IHJvdXRlLl9mdXR1cmVTbmFwc2hvdDtcblxuICAgIC8vIHRoaXMgaXMgZm9yIHJlc29sdmVkIGRhdGFcbiAgICAoPGFueT5yb3V0ZS5kYXRhKS5uZXh0KHJvdXRlLl9mdXR1cmVTbmFwc2hvdC5kYXRhKTtcbiAgfVxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbFBhcmFtc0FuZFVybFNlZ21lbnRzKFxuICAgIGE6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGI6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBib29sZWFuIHtcbiAgY29uc3QgZXF1YWxVcmxQYXJhbXMgPSBzaGFsbG93RXF1YWwoYS5wYXJhbXMsIGIucGFyYW1zKSAmJiBlcXVhbFNlZ21lbnRzKGEudXJsLCBiLnVybCk7XG4gIGNvbnN0IHBhcmVudHNNaXNtYXRjaCA9ICFhLnBhcmVudCAhPT0gIWIucGFyZW50O1xuXG4gIHJldHVybiBlcXVhbFVybFBhcmFtcyAmJiAhcGFyZW50c01pc21hdGNoICYmXG4gICAgICAoIWEucGFyZW50IHx8IGVxdWFsUGFyYW1zQW5kVXJsU2VnbWVudHMoYS5wYXJlbnQsIGIucGFyZW50ICEpKTtcbn1cbiJdfQ==