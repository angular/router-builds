/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { convertToParamMap, PRIMARY_OUTLET, RouteTitleKey } from './shared';
import { equalSegments, UrlSegment } from './url_tree';
import { shallowEqual, shallowEqualArrays } from './utils/collection';
import { Tree, TreeNode } from './utils/tree';
/**
 * Represents the state of the router as a tree of activated routes.
 *
 * @usageNotes
 *
 * Every node in the route tree is an `ActivatedRoute` instance
 * that knows about the "consumed" URL segments, the extracted parameters,
 * and the resolved data.
 * Use the `ActivatedRoute` properties to traverse the tree from any node.
 *
 * The following fragment shows how a component gets the root node
 * of the current state to establish its own route tree:
 *
 * ```
 * @Component({templateUrl:'template.html'})
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
 * @see `ActivatedRoute`
 * @see [Getting route information](guide/router#getting-route-information)
 *
 * @publicApi
 */
export class RouterState extends Tree {
    /** @internal */
    constructor(root, 
    /** The current snapshot of the router state */
    snapshot) {
        super(root);
        this.snapshot = snapshot;
        setRouterState(this, root);
    }
    toString() {
        return this.snapshot.toString();
    }
}
export function createEmptyState(urlTree, rootComponent) {
    const snapshot = createEmptyStateSnapshot(urlTree, rootComponent);
    const emptyUrl = new BehaviorSubject([new UrlSegment('', {})]);
    const emptyParams = new BehaviorSubject({});
    const emptyData = new BehaviorSubject({});
    const emptyQueryParams = new BehaviorSubject({});
    const fragment = new BehaviorSubject('');
    const activated = new ActivatedRoute(emptyUrl, emptyParams, emptyQueryParams, fragment, emptyData, PRIMARY_OUTLET, rootComponent, snapshot.root);
    activated.snapshot = snapshot.root;
    return new RouterState(new TreeNode(activated, []), snapshot);
}
export function createEmptyStateSnapshot(urlTree, rootComponent) {
    const emptyParams = {};
    const emptyData = {};
    const emptyQueryParams = {};
    const fragment = '';
    const activated = new ActivatedRouteSnapshot([], emptyParams, emptyQueryParams, fragment, emptyData, PRIMARY_OUTLET, rootComponent, null, urlTree.root, -1, {});
    return new RouterStateSnapshot('', new TreeNode(activated, []));
}
/**
 * Provides access to information about a route associated with a component
 * that is loaded in an outlet.
 * Use to traverse the `RouterState` tree and extract information from nodes.
 *
 * The following example shows how to construct a component using information from a
 * currently activated route.
 *
 * Note: the observables in this class only emit when the current and previous values differ based
 * on shallow equality. For example, changing deeply nested properties in resolved `data` will not
 * cause the `ActivatedRoute.data` `Observable` to emit a new value.
 *
 * {@example router/activated-route/module.ts region="activated-route"
 *     header="activated-route.component.ts"}
 *
 * @see [Getting route information](guide/router#getting-route-information)
 *
 * @publicApi
 */
export class ActivatedRoute {
    /** @internal */
    constructor(
    /** An observable of the URL segments matched by this route. */
    url, 
    /** An observable of the matrix parameters scoped to this route. */
    params, 
    /** An observable of the query parameters shared by all the routes. */
    queryParams, 
    /** An observable of the URL fragment shared by all the routes. */
    fragment, 
    /** An observable of the static and resolved data of this route. */
    data, 
    /** The outlet name of the route, a constant. */
    outlet, 
    /** The component of the route, a constant. */
    component, futureSnapshot) {
        this.url = url;
        this.params = params;
        this.queryParams = queryParams;
        this.fragment = fragment;
        this.data = data;
        this.outlet = outlet;
        this.component = component;
        /** An Observable of the resolved route title */
        this.title = this.data?.pipe(map((d) => d[RouteTitleKey])) ?? of(undefined);
        this._futureSnapshot = futureSnapshot;
    }
    /** The configuration used to match this route. */
    get routeConfig() {
        return this._futureSnapshot.routeConfig;
    }
    /** The root of the router state. */
    get root() {
        return this._routerState.root;
    }
    /** The parent of this route in the router state tree. */
    get parent() {
        return this._routerState.parent(this);
    }
    /** The first child of this route in the router state tree. */
    get firstChild() {
        return this._routerState.firstChild(this);
    }
    /** The children of this route in the router state tree. */
    get children() {
        return this._routerState.children(this);
    }
    /** The path from the root of the router state tree to this route. */
    get pathFromRoot() {
        return this._routerState.pathFromRoot(this);
    }
    /**
     * An Observable that contains a map of the required and optional parameters
     * specific to the route.
     * The map supports retrieving single and multiple values from the same parameter.
     */
    get paramMap() {
        if (!this._paramMap) {
            this._paramMap = this.params.pipe(map((p) => convertToParamMap(p)));
        }
        return this._paramMap;
    }
    /**
     * An Observable that contains a map of the query parameters available to all routes.
     * The map supports retrieving single and multiple values from the query parameter.
     */
    get queryParamMap() {
        if (!this._queryParamMap) {
            this._queryParamMap =
                this.queryParams.pipe(map((p) => convertToParamMap(p)));
        }
        return this._queryParamMap;
    }
    toString() {
        return this.snapshot ? this.snapshot.toString() : `Future(${this._futureSnapshot})`;
    }
}
/**
 * Returns the inherited params, data, and resolve for a given route.
 * By default, this only inherits values up to the nearest path-less or component-less route.
 * @internal
 */
export function inheritedParamsDataResolve(route, paramsInheritanceStrategy = 'emptyOnly') {
    const pathFromRoot = route.pathFromRoot;
    let inheritingStartingFrom = 0;
    if (paramsInheritanceStrategy !== 'always') {
        inheritingStartingFrom = pathFromRoot.length - 1;
        while (inheritingStartingFrom >= 1) {
            const current = pathFromRoot[inheritingStartingFrom];
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
/** @internal */
function flattenInherited(pathFromRoot) {
    return pathFromRoot.reduce((res, curr) => {
        const params = { ...res.params, ...curr.params };
        const data = { ...res.data, ...curr.data };
        const resolve = { ...curr.data, ...res.resolve, ...curr.routeConfig?.data, ...curr._resolvedData };
        return { params, data, resolve };
    }, { params: {}, data: {}, resolve: {} });
}
/**
 * @description
 *
 * Contains the information about a route associated with a component loaded in an
 * outlet at a particular moment in time. ActivatedRouteSnapshot can also be used to
 * traverse the router state tree.
 *
 * The following example initializes a component with route information extracted
 * from the snapshot of the root node at the time of creation.
 *
 * ```
 * @Component({templateUrl:'./my-component.html'})
 * class MyComponent {
 *   constructor(route: ActivatedRoute) {
 *     const id: string = route.snapshot.params.id;
 *     const url: string = route.snapshot.url.join('');
 *     const user = route.snapshot.data.user;
 *   }
 * }
 * ```
 *
 * @publicApi
 */
export class ActivatedRouteSnapshot {
    /** @internal */
    constructor(
    /** The URL segments matched by this route */
    url, 
    /**
     *  The matrix parameters scoped to this route.
     *
     *  You can compute all params (or data) in the router state or to get params outside
     *  of an activated component by traversing the `RouterState` tree as in the following
     *  example:
     *  ```
     *  collectRouteParams(router: Router) {
     *    let params = {};
     *    let stack: ActivatedRouteSnapshot[] = [router.routerState.snapshot.root];
     *    while (stack.length > 0) {
     *      const route = stack.pop()!;
     *      params = {...params, ...route.params};
     *      stack.push(...route.children);
     *    }
     *    return params;
     *  }
     *  ```
     */
    params, 
    /** The query parameters shared by all the routes */
    queryParams, 
    /** The URL fragment shared by all the routes */
    fragment, 
    /** The static and resolved data of this route */
    data, 
    /** The outlet name of the route */
    outlet, 
    /** The component of the route */
    component, routeConfig, urlSegment, lastPathIndex, resolve) {
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
    /** The resolved route title */
    get title() {
        // Note: This _must_ be a getter because the data is mutated in the resolvers. Title will not be
        // available at the time of class instantiation.
        return this.data?.[RouteTitleKey];
    }
    /** The root of the router state */
    get root() {
        return this._routerState.root;
    }
    /** The parent of this route in the router state tree */
    get parent() {
        return this._routerState.parent(this);
    }
    /** The first child of this route in the router state tree */
    get firstChild() {
        return this._routerState.firstChild(this);
    }
    /** The children of this route in the router state tree */
    get children() {
        return this._routerState.children(this);
    }
    /** The path from the root of the router state tree to this route */
    get pathFromRoot() {
        return this._routerState.pathFromRoot(this);
    }
    get paramMap() {
        if (!this._paramMap) {
            this._paramMap = convertToParamMap(this.params);
        }
        return this._paramMap;
    }
    get queryParamMap() {
        if (!this._queryParamMap) {
            this._queryParamMap = convertToParamMap(this.queryParams);
        }
        return this._queryParamMap;
    }
    toString() {
        const url = this.url.map(segment => segment.toString()).join('/');
        const matched = this.routeConfig ? this.routeConfig.path : '';
        return `Route(url:'${url}', path:'${matched}')`;
    }
}
/**
 * @description
 *
 * Represents the state of the router at a moment in time.
 *
 * This is a tree of activated route snapshots. Every node in this tree knows about
 * the "consumed" URL segments, the extracted parameters, and the resolved data.
 *
 * The following example shows how a component is initialized with information
 * from the snapshot of the root node's state at the time of creation.
 *
 * ```
 * @Component({templateUrl:'template.html'})
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
 * @publicApi
 */
export class RouterStateSnapshot extends Tree {
    /** @internal */
    constructor(
    /** The url from which this snapshot was created */
    url, root) {
        super(root);
        this.url = url;
        setRouterState(this, root);
    }
    toString() {
        return serializeNode(this._root);
    }
}
function setRouterState(state, node) {
    node.value._routerState = state;
    node.children.forEach(c => setRouterState(state, c));
}
function serializeNode(node) {
    const c = node.children.length > 0 ? ` { ${node.children.map(serializeNode).join(', ')} } ` : '';
    return `${node.value}${c}`;
}
/**
 * The expectation is that the activate route is created with the right set of parameters.
 * So we push new values into the observables only when they are not the initial values.
 * And we detect that by checking if the snapshot field is set.
 */
export function advanceActivatedRoute(route) {
    if (route.snapshot) {
        const currentSnapshot = route.snapshot;
        const nextSnapshot = route._futureSnapshot;
        route.snapshot = nextSnapshot;
        if (!shallowEqual(currentSnapshot.queryParams, nextSnapshot.queryParams)) {
            route.queryParams.next(nextSnapshot.queryParams);
        }
        if (currentSnapshot.fragment !== nextSnapshot.fragment) {
            route.fragment.next(nextSnapshot.fragment);
        }
        if (!shallowEqual(currentSnapshot.params, nextSnapshot.params)) {
            route.params.next(nextSnapshot.params);
        }
        if (!shallowEqualArrays(currentSnapshot.url, nextSnapshot.url)) {
            route.url.next(nextSnapshot.url);
        }
        if (!shallowEqual(currentSnapshot.data, nextSnapshot.data)) {
            route.data.next(nextSnapshot.data);
        }
    }
    else {
        route.snapshot = route._futureSnapshot;
        // this is for resolved data
        route.data.next(route._futureSnapshot.data);
    }
}
export function equalParamsAndUrlSegments(a, b) {
    const equalUrlParams = shallowEqual(a.params, b.params) && equalSegments(a.url, b.url);
    const parentsMismatch = !a.parent !== !b.parent;
    return equalUrlParams && !parentsMismatch &&
        (!a.parent || equalParamsAndUrlSegments(a.parent, b.parent));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3N0YXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXJfc3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUFDLGVBQWUsRUFBYyxFQUFFLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDckQsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBR25DLE9BQU8sRUFBQyxpQkFBaUIsRUFBb0IsY0FBYyxFQUFFLGFBQWEsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM1RixPQUFPLEVBQUMsYUFBYSxFQUFFLFVBQVUsRUFBMkIsTUFBTSxZQUFZLENBQUM7QUFDL0UsT0FBTyxFQUFDLFlBQVksRUFBRSxrQkFBa0IsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3BFLE9BQU8sRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFDLE1BQU0sY0FBYyxDQUFDO0FBRTVDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0E4Qkc7QUFDSCxNQUFNLE9BQU8sV0FBWSxTQUFRLElBQW9CO0lBQ25ELGdCQUFnQjtJQUNoQixZQUNJLElBQThCO0lBQzlCLCtDQUErQztJQUN4QyxRQUE2QjtRQUN0QyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFESCxhQUFRLEdBQVIsUUFBUSxDQUFxQjtRQUV0QyxjQUFjLENBQWMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFUSxRQUFRO1FBQ2YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ2xDLENBQUM7Q0FDRjtBQUVELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxPQUFnQixFQUFFLGFBQTZCO0lBQzlFLE1BQU0sUUFBUSxHQUFHLHdCQUF3QixDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztJQUNsRSxNQUFNLFFBQVEs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QWUsQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3hELEtBQUssQ0FBQyxHQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN6QztRQUNELElBQUksQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDcEQsS0FBSyxDQUFDLElBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzNDO0tBQ0Y7U0FBTTtRQUNMLEtBQUssQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQztRQUV2Qyw0QkFBNEI7UUFDdEIsS0FBSyxDQUFDLElBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNwRDtBQUNILENBQUM7QUFHRCxNQUFNLFVBQVUseUJBQXlCLENBQ3JDLENBQXlCLEVBQUUsQ0FBeUI7SUFDdEQsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2RixNQUFNLGVBQWUsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBRWhELE9BQU8sY0FBYyxJQUFJLENBQUMsZUFBZTtRQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ3BFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtUeXBlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7QmVoYXZpb3JTdWJqZWN0LCBPYnNlcnZhYmxlLCBvZn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge21hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0RhdGEsIFJlc29sdmVEYXRhLCBSb3V0ZX0gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtjb252ZXJ0VG9QYXJhbU1hcCwgUGFyYW1NYXAsIFBhcmFtcywgUFJJTUFSWV9PVVRMRVQsIFJvdXRlVGl0bGVLZXl9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7ZXF1YWxTZWdtZW50cywgVXJsU2VnbWVudCwgVXJsU2VnbWVudEdyb3VwLCBVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcbmltcG9ydCB7c2hhbGxvd0VxdWFsLCBzaGFsbG93RXF1YWxBcnJheXN9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge1RyZWUsIFRyZWVOb2RlfSBmcm9tICcuL3V0aWxzL3RyZWUnO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHN0YXRlIG9mIHRoZSByb3V0ZXIgYXMgYSB0cmVlIG9mIGFjdGl2YXRlZCByb3V0ZXMuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBFdmVyeSBub2RlIGluIHRoZSByb3V0ZSB0cmVlIGlzIGFuIGBBY3RpdmF0ZWRSb3V0ZWAgaW5zdGFuY2VcbiAqIHRoYXQga25vd3MgYWJvdXQgdGhlIFwiY29uc3VtZWRcIiBVUkwgc2VnbWVudHMsIHRoZSBleHRyYWN0ZWQgcGFyYW1ldGVycyxcbiAqIGFuZCB0aGUgcmVzb2x2ZWQgZGF0YS5cbiAqIFVzZSB0aGUgYEFjdGl2YXRlZFJvdXRlYCBwcm9wZXJ0aWVzIHRvIHRyYXZlcnNlIHRoZSB0cmVlIGZyb20gYW55IG5vZGUuXG4gKlxuICogVGhlIGZvbGxvd2luZyBmcmFnbWVudCBzaG93cyBob3cgYSBjb21wb25lbnQgZ2V0cyB0aGUgcm9vdCBub2RlXG4gKiBvZiB0aGUgY3VycmVudCBzdGF0ZSB0byBlc3RhYmxpc2ggaXRzIG93biByb3V0ZSB0cmVlOlxuICpcbiAqIGBgYFxuICogQENvbXBvbmVudCh7dGVtcGxhdGVVcmw6J3RlbXBsYXRlLmh0bWwnfSlcbiAqIGNsYXNzIE15Q29tcG9uZW50IHtcbiAqICAgY29uc3RydWN0b3Iocm91dGVyOiBSb3V0ZXIpIHtcbiAqICAgICBjb25zdCBzdGF0ZTogUm91dGVyU3RhdGUgPSByb3V0ZXIucm91dGVyU3RhdGU7XG4gKiAgICAgY29uc3Qgcm9vdDogQWN0aXZhdGVkUm91dGUgPSBzdGF0ZS5yb290O1xuICogICAgIGNvbnN0IGNoaWxkID0gcm9vdC5maXJzdENoaWxkO1xuICogICAgIGNvbnN0IGlkOiBPYnNlcnZhYmxlPHN0cmluZz4gPSBjaGlsZC5wYXJhbXMubWFwKHAgPT4gcC5pZCk7XG4gKiAgICAgLy8uLi5cbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICogQHNlZSBgQWN0aXZhdGVkUm91dGVgXG4gKiBAc2VlIFtHZXR0aW5nIHJvdXRlIGluZm9ybWF0aW9uXShndWlkZS9yb3V0ZXIjZ2V0dGluZy1yb3V0ZS1pbmZvcm1hdGlvbilcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZXJTdGF0ZSBleHRlbmRzIFRyZWU8QWN0aXZhdGVkUm91dGU+IHtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJvb3Q6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPixcbiAgICAgIC8qKiBUaGUgY3VycmVudCBzbmFwc2hvdCBvZiB0aGUgcm91dGVyIHN0YXRlICovXG4gICAgICBwdWJsaWMgc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QpIHtcbiAgICBzdXBlcihyb290KTtcbiAgICBzZXRSb3V0ZXJTdGF0ZSg8Um91dGVyU3RhdGU+dGhpcywgcm9vdCk7XG4gIH1cblxuICBvdmVycmlkZSB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnNuYXBzaG90LnRvU3RyaW5nKCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVtcHR5U3RhdGUodXJsVHJlZTogVXJsVHJlZSwgcm9vdENvbXBvbmVudDogVHlwZTxhbnk+fG51bGwpOiBSb3V0ZXJTdGF0ZSB7XG4gIGNvbnN0IHNuYXBzaG90ID0gY3JlYXRlRW1wdHlTdGF0ZVNuYXBzaG90KHVybFRyZWUsIHJvb3RDb21wb25lbnQpO1xuICBjb25zdCBlbXB0eVVybCA9IG5ldyBCZWhhdmlvclN1YmplY3QoW25ldyBVcmxTZWdtZW50KCcnLCB7fSldKTtcbiAgY29uc3QgZW1wdHlQYXJhbXMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0KHt9KTtcbiAgY29uc3QgZW1wdHlEYXRhID0gbmV3IEJlaGF2aW9yU3ViamVjdCh7fSk7XG4gIGNvbnN0IGVtcHR5UXVlcnlQYXJhbXMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0KHt9KTtcbiAgY29uc3QgZnJhZ21lbnQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0KCcnKTtcbiAgY29uc3QgYWN0aXZhdGVkID0gbmV3IEFjdGl2YXRlZFJvdXRlKFxuICAgICAgZW1wdHlVcmwsIGVtcHR5UGFyYW1zLCBlbXB0eVF1ZXJ5UGFyYW1zLCBmcmFnbWVudCwgZW1wdHlEYXRhLCBQUklNQVJZX09VVExFVCwgcm9vdENvbXBvbmVudCxcbiAgICAgIHNuYXBzaG90LnJvb3QpO1xuICBhY3RpdmF0ZWQuc25hcHNob3QgPSBzbmFwc2hvdC5yb290O1xuICByZXR1cm4gbmV3IFJvdXRlclN0YXRlKG5ldyBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4oYWN0aXZhdGVkLCBbXSksIHNuYXBzaG90KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVtcHR5U3RhdGVTbmFwc2hvdChcbiAgICB1cmxUcmVlOiBVcmxUcmVlLCByb290Q29tcG9uZW50OiBUeXBlPGFueT58bnVsbCk6IFJvdXRlclN0YXRlU25hcHNob3Qge1xuICBjb25zdCBlbXB0eVBhcmFtcyA9IHt9O1xuICBjb25zdCBlbXB0eURhdGEgPSB7fTtcbiAgY29uc3QgZW1wdHlRdWVyeVBhcmFtcyA9IHt9O1xuICBjb25zdCBmcmFnbWVudCA9ICcnO1xuICBjb25zdCBhY3RpdmF0ZWQgPSBuZXcgQWN0aXZhdGVkUm91dGVTbmFwc2hvdChcbiAgICAgIFtdLCBlbXB0eVBhcmFtcywgZW1wdHlRdWVyeVBhcmFtcywgZnJhZ21lbnQsIGVtcHR5RGF0YSwgUFJJTUFSWV9PVVRMRVQsIHJvb3RDb21wb25lbnQsIG51bGwsXG4gICAgICB1cmxUcmVlLnJvb3QsIC0xLCB7fSk7XG4gIHJldHVybiBuZXcgUm91dGVyU3RhdGVTbmFwc2hvdCgnJywgbmV3IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KGFjdGl2YXRlZCwgW10pKTtcbn1cblxuLyoqXG4gKiBQcm92aWRlcyBhY2Nlc3MgdG8gaW5mb3JtYXRpb24gYWJvdXQgYSByb3V0ZSBhc3NvY2lhdGVkIHdpdGggYSBjb21wb25lbnRcbiAqIHRoYXQgaXMgbG9hZGVkIGluIGFuIG91dGxldC5cbiAqIFVzZSB0byB0cmF2ZXJzZSB0aGUgYFJvdXRlclN0YXRlYCB0cmVlIGFuZCBleHRyYWN0IGluZm9ybWF0aW9uIGZyb20gbm9kZXMuXG4gKlxuICogVGhlIGZvbGxvd2luZyBleGFtcGxlIHNob3dzIGhvdyB0byBjb25zdHJ1Y3QgYSBjb21wb25lbnQgdXNpbmcgaW5mb3JtYXRpb24gZnJvbSBhXG4gKiBjdXJyZW50bHkgYWN0aXZhdGVkIHJvdXRlLlxuICpcbiAqIE5vdGU6IHRoZSBvYnNlcnZhYmxlcyBpbiB0aGlzIGNsYXNzIG9ubHkgZW1pdCB3aGVuIHRoZSBjdXJyZW50IGFuZCBwcmV2aW91cyB2YWx1ZXMgZGlmZmVyIGJhc2VkXG4gKiBvbiBzaGFsbG93IGVxdWFsaXR5LiBGb3IgZXhhbXBsZSwgY2hhbmdpbmcgZGVlcGx5IG5lc3RlZCBwcm9wZXJ0aWVzIGluIHJlc29sdmVkIGBkYXRhYCB3aWxsIG5vdFxuICogY2F1c2UgdGhlIGBBY3RpdmF0ZWRSb3V0ZS5kYXRhYCBgT2JzZXJ2YWJsZWAgdG8gZW1pdCBhIG5ldyB2YWx1ZS5cbiAqXG4gKiB7QGV4YW1wbGUgcm91dGVyL2FjdGl2YXRlZC1yb3V0ZS9tb2R1bGUudHMgcmVnaW9uPVwiYWN0aXZhdGVkLXJvdXRlXCJcbiAqICAgICBoZWFkZXI9XCJhY3RpdmF0ZWQtcm91dGUuY29tcG9uZW50LnRzXCJ9XG4gKlxuICogQHNlZSBbR2V0dGluZyByb3V0ZSBpbmZvcm1hdGlvbl0oZ3VpZGUvcm91dGVyI2dldHRpbmctcm91dGUtaW5mb3JtYXRpb24pXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgQWN0aXZhdGVkUm91dGUge1xuICAvKiogVGhlIGN1cnJlbnQgc25hcHNob3Qgb2YgdGhpcyByb3V0ZSAqL1xuICBzbmFwc2hvdCE6IEFjdGl2YXRlZFJvdXRlU25hcHNob3Q7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX2Z1dHVyZVNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90O1xuICAvKiogQGludGVybmFsICovXG4gIF9yb3V0ZXJTdGF0ZSE6IFJvdXRlclN0YXRlO1xuICAvKiogQGludGVybmFsICovXG4gIF9wYXJhbU1hcCE6IE9ic2VydmFibGU8UGFyYW1NYXA+O1xuICAvKiogQGludGVybmFsICovXG4gIF9xdWVyeVBhcmFtTWFwITogT2JzZXJ2YWJsZTxQYXJhbU1hcD47XG5cbiAgLyoqIEFuIE9ic2VydmFibGUgb2YgdGhlIHJlc29sdmVkIHJvdXRlIHRpdGxlICovXG4gIHJlYWRvbmx5IHRpdGxlOiBPYnNlcnZhYmxlPHN0cmluZ3x1bmRlZmluZWQ+ID1cbiAgICAgIHRoaXMuZGF0YT8ucGlwZShtYXAoKGQ6IERhdGEpID0+IGRbUm91dGVUaXRsZUtleV0pKSA/PyBvZih1bmRlZmluZWQpO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQW4gb2JzZXJ2YWJsZSBvZiB0aGUgVVJMIHNlZ21lbnRzIG1hdGNoZWQgYnkgdGhpcyByb3V0ZS4gKi9cbiAgICAgIHB1YmxpYyB1cmw6IE9ic2VydmFibGU8VXJsU2VnbWVudFtdPixcbiAgICAgIC8qKiBBbiBvYnNlcnZhYmxlIG9mIHRoZSBtYXRyaXggcGFyYW1ldGVycyBzY29wZWQgdG8gdGhpcyByb3V0ZS4gKi9cbiAgICAgIHB1YmxpYyBwYXJhbXM6IE9ic2VydmFibGU8UGFyYW1zPixcbiAgICAgIC8qKiBBbiBvYnNlcnZhYmxlIG9mIHRoZSBxdWVyeSBwYXJhbWV0ZXJzIHNoYXJlZCBieSBhbGwgdGhlIHJvdXRlcy4gKi9cbiAgICAgIHB1YmxpYyBxdWVyeVBhcmFtczogT2JzZXJ2YWJsZTxQYXJhbXM+LFxuICAgICAgLyoqIEFuIG9ic2VydmFibGUgb2YgdGhlIFVSTCBmcmFnbWVudCBzaGFyZWQgYnkgYWxsIHRoZSByb3V0ZXMuICovXG4gICAgICBwdWJsaWMgZnJhZ21lbnQ6IE9ic2VydmFibGU8c3RyaW5nfG51bGw+LFxuICAgICAgLyoqIEFuIG9ic2VydmFibGUgb2YgdGhlIHN0YXRpYyBhbmQgcmVzb2x2ZWQgZGF0YSBvZiB0aGlzIHJvdXRlLiAqL1xuICAgICAgcHVibGljIGRhdGE6IE9ic2VydmFibGU8RGF0YT4sXG4gICAgICAvKiogVGhlIG91dGxldCBuYW1lIG9mIHRoZSByb3V0ZSwgYSBjb25zdGFudC4gKi9cbiAgICAgIHB1YmxpYyBvdXRsZXQ6IHN0cmluZyxcbiAgICAgIC8qKiBUaGUgY29tcG9uZW50IG9mIHRoZSByb3V0ZSwgYSBjb25zdGFudC4gKi9cbiAgICAgIHB1YmxpYyBjb21wb25lbnQ6IFR5cGU8YW55PnxudWxsLCBmdXR1cmVTbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCkge1xuICAgIHRoaXMuX2Z1dHVyZVNuYXBzaG90ID0gZnV0dXJlU25hcHNob3Q7XG4gIH1cblxuICAvKiogVGhlIGNvbmZpZ3VyYXRpb24gdXNlZCB0byBtYXRjaCB0aGlzIHJvdXRlLiAqL1xuICBnZXQgcm91dGVDb25maWcoKTogUm91dGV8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuX2Z1dHVyZVNuYXBzaG90LnJvdXRlQ29uZmlnO1xuICB9XG5cbiAgLyoqIFRoZSByb290IG9mIHRoZSByb3V0ZXIgc3RhdGUuICovXG4gIGdldCByb290KCk6IEFjdGl2YXRlZFJvdXRlIHtcbiAgICByZXR1cm4gdGhpcy5fcm91dGVyU3RhdGUucm9vdDtcbiAgfVxuXG4gIC8qKiBUaGUgcGFyZW50IG9mIHRoaXMgcm91dGUgaW4gdGhlIHJvdXRlciBzdGF0ZSB0cmVlLiAqL1xuICBnZXQgcGFyZW50KCk6IEFjdGl2YXRlZFJvdXRlfG51bGwge1xuICAgIHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5wYXJlbnQodGhpcyk7XG4gIH1cblxuICAvKiogVGhlIGZpcnN0IGNoaWxkIG9mIHRoaXMgcm91dGUgaW4gdGhlIHJvdXRlciBzdGF0ZSB0cmVlLiAqL1xuICBnZXQgZmlyc3RDaGlsZCgpOiBBY3RpdmF0ZWRSb3V0ZXxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5fcm91dGVyU3RhdGUuZmlyc3RDaGlsZCh0aGlzKTtcbiAgfVxuXG4gIC8qKiBUaGUgY2hpbGRyZW4gb2YgdGhpcyByb3V0ZSBpbiB0aGUgcm91dGVyIHN0YXRlIHRyZWUuICovXG4gIGdldCBjaGlsZHJlbigpOiBBY3RpdmF0ZWRSb3V0ZVtdIHtcbiAgICByZXR1cm4gdGhpcy5fcm91dGVyU3RhdGUuY2hpbGRyZW4odGhpcyk7XG4gIH1cblxuICAvKiogVGhlIHBhdGggZnJvbSB0aGUgcm9vdCBvZiB0aGUgcm91dGVyIHN0YXRlIHRyZWUgdG8gdGhpcyByb3V0ZS4gKi9cbiAgZ2V0IHBhdGhGcm9tUm9vdCgpOiBBY3RpdmF0ZWRSb3V0ZVtdIHtcbiAgICByZXR1cm4gdGhpcy5fcm91dGVyU3RhdGUucGF0aEZyb21Sb290KHRoaXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFuIE9ic2VydmFibGUgdGhhdCBjb250YWlucyBhIG1hcCBvZiB0aGUgcmVxdWlyZWQgYW5kIG9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICogc3BlY2lmaWMgdG8gdGhlIHJvdXRlLlxuICAgKiBUaGUgbWFwIHN1cHBvcnRzIHJldHJpZXZpbmcgc2luZ2xlIGFuZCBtdWx0aXBsZSB2YWx1ZXMgZnJvbSB0aGUgc2FtZSBwYXJhbWV0ZXIuXG4gICAqL1xuICBnZXQgcGFyYW1NYXAoKTogT2JzZXJ2YWJsZTxQYXJhbU1hcD4ge1xuICAgIGlmICghdGhpcy5fcGFyYW1NYXApIHtcbiAgICAgIHRoaXMuX3BhcmFtTWFwID0gdGhpcy5wYXJhbXMucGlwZShtYXAoKHA6IFBhcmFtcyk6IFBhcmFtTWFwID0+IGNvbnZlcnRUb1BhcmFtTWFwKHApKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9wYXJhbU1hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbiBPYnNlcnZhYmxlIHRoYXQgY29udGFpbnMgYSBtYXAgb2YgdGhlIHF1ZXJ5IHBhcmFtZXRlcnMgYXZhaWxhYmxlIHRvIGFsbCByb3V0ZXMuXG4gICAqIFRoZSBtYXAgc3VwcG9ydHMgcmV0cmlldmluZyBzaW5nbGUgYW5kIG11bHRpcGxlIHZhbHVlcyBmcm9tIHRoZSBxdWVyeSBwYXJhbWV0ZXIuXG4gICAqL1xuICBnZXQgcXVlcnlQYXJhbU1hcCgpOiBPYnNlcnZhYmxlPFBhcmFtTWFwPiB7XG4gICAgaWYgKCF0aGlzLl9xdWVyeVBhcmFtTWFwKSB7XG4gICAgICB0aGlzLl9xdWVyeVBhcmFtTWFwID1cbiAgICAgICAgICB0aGlzLnF1ZXJ5UGFyYW1zLnBpcGUobWFwKChwOiBQYXJhbXMpOiBQYXJhbU1hcCA9PiBjb252ZXJ0VG9QYXJhbU1hcChwKSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcXVlcnlQYXJhbU1hcDtcbiAgfVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuc25hcHNob3QgPyB0aGlzLnNuYXBzaG90LnRvU3RyaW5nKCkgOiBgRnV0dXJlKCR7dGhpcy5fZnV0dXJlU25hcHNob3R9KWA7XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUgUGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSA9ICdlbXB0eU9ubHknfCdhbHdheXMnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBJbmhlcml0ZWQgPSB7XG4gIHBhcmFtczogUGFyYW1zLFxuICBkYXRhOiBEYXRhLFxuICByZXNvbHZlOiBEYXRhLFxufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBpbmhlcml0ZWQgcGFyYW1zLCBkYXRhLCBhbmQgcmVzb2x2ZSBmb3IgYSBnaXZlbiByb3V0ZS5cbiAqIEJ5IGRlZmF1bHQsIHRoaXMgb25seSBpbmhlcml0cyB2YWx1ZXMgdXAgdG8gdGhlIG5lYXJlc3QgcGF0aC1sZXNzIG9yIGNvbXBvbmVudC1sZXNzIHJvdXRlLlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbmhlcml0ZWRQYXJhbXNEYXRhUmVzb2x2ZShcbiAgICByb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCxcbiAgICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiBQYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5ID0gJ2VtcHR5T25seScpOiBJbmhlcml0ZWQge1xuICBjb25zdCBwYXRoRnJvbVJvb3QgPSByb3V0ZS5wYXRoRnJvbVJvb3Q7XG5cbiAgbGV0IGluaGVyaXRpbmdTdGFydGluZ0Zyb20gPSAwO1xuICBpZiAocGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSAhPT0gJ2Fsd2F5cycpIHtcbiAgICBpbmhlcml0aW5nU3RhcnRpbmdGcm9tID0gcGF0aEZyb21Sb290Lmxlbmd0aCAtIDE7XG5cbiAgICB3aGlsZSAoaW5oZXJpdGluZ1N0YXJ0aW5nRnJvbSA+PSAxKSB7XG4gICAgICBjb25zdCBjdXJyZW50ID0gcGF0aEZyb21Sb290W2luaGVyaXRpbmdTdGFydGluZ0Zyb21dO1xuICAgICAgY29uc3QgcGFyZW50ID0gcGF0aEZyb21Sb290W2luaGVyaXRpbmdTdGFydGluZ0Zyb20gLSAxXTtcbiAgICAgIC8vIGN1cnJlbnQgcm91dGUgaXMgYW4gZW1wdHkgcGF0aCA9PiBpbmhlcml0cyBpdHMgcGFyZW50J3MgcGFyYW1zIGFuZCBkYXRhXG4gICAgICBpZiAoY3VycmVudC5yb3V0ZUNvbmZpZyAmJiBjdXJyZW50LnJvdXRlQ29uZmlnLnBhdGggPT09ICcnKSB7XG4gICAgICAgIGluaGVyaXRpbmdTdGFydGluZ0Zyb20tLTtcblxuICAgICAgICAvLyBwYXJlbnQgaXMgY29tcG9uZW50bGVzcyA9PiBjdXJyZW50IHJvdXRlIHNob3VsZCBpbmhlcml0IGl0cyBwYXJhbXMgYW5kIGRhdGFcbiAgICAgIH0gZWxzZSBpZiAoIXBhcmVudC5jb21wb25lbnQpIHtcbiAgICAgICAgaW5oZXJpdGluZ1N0YXJ0aW5nRnJvbS0tO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmxhdHRlbkluaGVyaXRlZChwYXRoRnJvbVJvb3Quc2xpY2UoaW5oZXJpdGluZ1N0YXJ0aW5nRnJvbSkpO1xufVxuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBmbGF0dGVuSW5oZXJpdGVkKHBhdGhGcm9tUm9vdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdFtdKTogSW5oZXJpdGVkIHtcbiAgcmV0dXJuIHBhdGhGcm9tUm9vdC5yZWR1Y2UoKHJlcywgY3VycikgPT4ge1xuICAgIGNvbnN0IHBhcmFtcyA9IHsuLi5yZXMucGFyYW1zLCAuLi5jdXJyLnBhcmFtc307XG4gICAgY29uc3QgZGF0YSA9IHsuLi5yZXMuZGF0YSwgLi4uY3Vyci5kYXRhfTtcbiAgICBjb25zdCByZXNvbHZlID1cbiAgICAgICAgey4uLmN1cnIuZGF0YSwgLi4ucmVzLnJlc29sdmUsIC4uLmN1cnIucm91dGVDb25maWc/LmRhdGEsIC4uLmN1cnIuX3Jlc29sdmVkRGF0YX07XG4gICAgcmV0dXJuIHtwYXJhbXMsIGRhdGEsIHJlc29sdmV9O1xuICB9LCB7cGFyYW1zOiB7fSwgZGF0YToge30sIHJlc29sdmU6IHt9fSk7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQ29udGFpbnMgdGhlIGluZm9ybWF0aW9uIGFib3V0IGEgcm91dGUgYXNzb2NpYXRlZCB3aXRoIGEgY29tcG9uZW50IGxvYWRlZCBpbiBhblxuICogb3V0bGV0IGF0IGEgcGFydGljdWxhciBtb21lbnQgaW4gdGltZS4gQWN0aXZhdGVkUm91dGVTbmFwc2hvdCBjYW4gYWxzbyBiZSB1c2VkIHRvXG4gKiB0cmF2ZXJzZSB0aGUgcm91dGVyIHN0YXRlIHRyZWUuXG4gKlxuICogVGhlIGZvbGxvd2luZyBleGFtcGxlIGluaXRpYWxpemVzIGEgY29tcG9uZW50IHdpdGggcm91dGUgaW5mb3JtYXRpb24gZXh0cmFjdGVkXG4gKiBmcm9tIHRoZSBzbmFwc2hvdCBvZiB0aGUgcm9vdCBub2RlIGF0IHRoZSB0aW1lIG9mIGNyZWF0aW9uLlxuICpcbiAqIGBgYFxuICogQENvbXBvbmVudCh7dGVtcGxhdGVVcmw6Jy4vbXktY29tcG9uZW50Lmh0bWwnfSlcbiAqIGNsYXNzIE15Q29tcG9uZW50IHtcbiAqICAgY29uc3RydWN0b3Iocm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7XG4gKiAgICAgY29uc3QgaWQ6IHN0cmluZyA9IHJvdXRlLnNuYXBzaG90LnBhcmFtcy5pZDtcbiAqICAgICBjb25zdCB1cmw6IHN0cmluZyA9IHJvdXRlLnNuYXBzaG90LnVybC5qb2luKCcnKTtcbiAqICAgICBjb25zdCB1c2VyID0gcm91dGUuc25hcHNob3QuZGF0YS51c2VyO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90IHtcbiAgLyoqIFRoZSBjb25maWd1cmF0aW9uIHVzZWQgdG8gbWF0Y2ggdGhpcyByb3V0ZSAqKi9cbiAgcHVibGljIHJlYWRvbmx5IHJvdXRlQ29uZmlnOiBSb3V0ZXxudWxsO1xuICAvKiogQGludGVybmFsICoqL1xuICBfdXJsU2VnbWVudDogVXJsU2VnbWVudEdyb3VwO1xuICAvKiogQGludGVybmFsICovXG4gIF9sYXN0UGF0aEluZGV4OiBudW1iZXI7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX3Jlc29sdmU6IFJlc29sdmVEYXRhO1xuICAvKiogQGludGVybmFsICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBfcmVzb2x2ZWREYXRhITogRGF0YTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgX3JvdXRlclN0YXRlITogUm91dGVyU3RhdGVTbmFwc2hvdDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgX3BhcmFtTWFwITogUGFyYW1NYXA7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIF9xdWVyeVBhcmFtTWFwITogUGFyYW1NYXA7XG5cbiAgLyoqIFRoZSByZXNvbHZlZCByb3V0ZSB0aXRsZSAqL1xuICBnZXQgdGl0bGUoKTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgLy8gTm90ZTogVGhpcyBfbXVzdF8gYmUgYSBnZXR0ZXIgYmVjYXVzZSB0aGUgZGF0YSBpcyBtdXRhdGVkIGluIHRoZSByZXNvbHZlcnMuIFRpdGxlIHdpbGwgbm90IGJlXG4gICAgLy8gYXZhaWxhYmxlIGF0IHRoZSB0aW1lIG9mIGNsYXNzIGluc3RhbnRpYXRpb24uXG4gICAgcmV0dXJuIHRoaXMuZGF0YT8uW1JvdXRlVGl0bGVLZXldO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBUaGUgVVJMIHNlZ21lbnRzIG1hdGNoZWQgYnkgdGhpcyByb3V0ZSAqL1xuICAgICAgcHVibGljIHVybDogVXJsU2VnbWVudFtdLFxuICAgICAgLyoqXG4gICAgICAgKiAgVGhlIG1hdHJpeCBwYXJhbWV0ZXJzIHNjb3BlZCB0byB0aGlzIHJvdXRlLlxuICAgICAgICpcbiAgICAgICAqICBZb3UgY2FuIGNvbXB1dGUgYWxsIHBhcmFtcyAob3IgZGF0YSkgaW4gdGhlIHJvdXRlciBzdGF0ZSBvciB0byBnZXQgcGFyYW1zIG91dHNpZGVcbiAgICAgICAqICBvZiBhbiBhY3RpdmF0ZWQgY29tcG9uZW50IGJ5IHRyYXZlcnNpbmcgdGhlIGBSb3V0ZXJTdGF0ZWAgdHJlZSBhcyBpbiB0aGUgZm9sbG93aW5nXG4gICAgICAgKiAgZXhhbXBsZTpcbiAgICAgICAqICBgYGBcbiAgICAgICAqICBjb2xsZWN0Um91dGVQYXJhbXMocm91dGVyOiBSb3V0ZXIpIHtcbiAgICAgICAqICAgIGxldCBwYXJhbXMgPSB7fTtcbiAgICAgICAqICAgIGxldCBzdGFjazogQWN0aXZhdGVkUm91dGVTbmFwc2hvdFtdID0gW3JvdXRlci5yb3V0ZXJTdGF0ZS5zbmFwc2hvdC5yb290XTtcbiAgICAgICAqICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgKiAgICAgIGNvbnN0IHJvdXRlID0gc3RhY2sucG9wKCkhO1xuICAgICAgICogICAgICBwYXJhbXMgPSB7Li4ucGFyYW1zLCAuLi5yb3V0ZS5wYXJhbXN9O1xuICAgICAgICogICAgICBzdGFjay5wdXNoKC4uLnJvdXRlLmNoaWxkcmVuKTtcbiAgICAgICAqICAgIH1cbiAgICAgICAqICAgIHJldHVybiBwYXJhbXM7XG4gICAgICAgKiAgfVxuICAgICAgICogIGBgYFxuICAgICAgICovXG4gICAgICBwdWJsaWMgcGFyYW1zOiBQYXJhbXMsXG4gICAgICAvKiogVGhlIHF1ZXJ5IHBhcmFtZXRlcnMgc2hhcmVkIGJ5IGFsbCB0aGUgcm91dGVzICovXG4gICAgICBwdWJsaWMgcXVlcnlQYXJhbXM6IFBhcmFtcyxcbiAgICAgIC8qKiBUaGUgVVJMIGZyYWdtZW50IHNoYXJlZCBieSBhbGwgdGhlIHJvdXRlcyAqL1xuICAgICAgcHVibGljIGZyYWdtZW50OiBzdHJpbmd8bnVsbCxcbiAgICAgIC8qKiBUaGUgc3RhdGljIGFuZCByZXNvbHZlZCBkYXRhIG9mIHRoaXMgcm91dGUgKi9cbiAgICAgIHB1YmxpYyBkYXRhOiBEYXRhLFxuICAgICAgLyoqIFRoZSBvdXRsZXQgbmFtZSBvZiB0aGUgcm91dGUgKi9cbiAgICAgIHB1YmxpYyBvdXRsZXQ6IHN0cmluZyxcbiAgICAgIC8qKiBUaGUgY29tcG9uZW50IG9mIHRoZSByb3V0ZSAqL1xuICAgICAgcHVibGljIGNvbXBvbmVudDogVHlwZTxhbnk+fG51bGwsIHJvdXRlQ29uZmlnOiBSb3V0ZXxudWxsLCB1cmxTZWdtZW50OiBVcmxTZWdtZW50R3JvdXAsXG4gICAgICBsYXN0UGF0aEluZGV4OiBudW1iZXIsIHJlc29sdmU6IFJlc29sdmVEYXRhKSB7XG4gICAgdGhpcy5yb3V0ZUNvbmZpZyA9IHJvdXRlQ29uZmlnO1xuICAgIHRoaXMuX3VybFNlZ21lbnQgPSB1cmxTZWdtZW50O1xuICAgIHRoaXMuX2xhc3RQYXRoSW5kZXggPSBsYXN0UGF0aEluZGV4O1xuICAgIHRoaXMuX3Jlc29sdmUgPSByZXNvbHZlO1xuICB9XG5cbiAgLyoqIFRoZSByb290IG9mIHRoZSByb3V0ZXIgc3RhdGUgKi9cbiAgZ2V0IHJvb3QoKTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCB7XG4gICAgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLnJvb3Q7XG4gIH1cblxuICAvKiogVGhlIHBhcmVudCBvZiB0aGlzIHJvdXRlIGluIHRoZSByb3V0ZXIgc3RhdGUgdHJlZSAqL1xuICBnZXQgcGFyZW50KCk6IEFjdGl2YXRlZFJvdXRlU25hcHNob3R8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLnBhcmVudCh0aGlzKTtcbiAgfVxuXG4gIC8qKiBUaGUgZmlyc3QgY2hpbGQgb2YgdGhpcyByb3V0ZSBpbiB0aGUgcm91dGVyIHN0YXRlIHRyZWUgKi9cbiAgZ2V0IGZpcnN0Q2hpbGQoKTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdHxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5fcm91dGVyU3RhdGUuZmlyc3RDaGlsZCh0aGlzKTtcbiAgfVxuXG4gIC8qKiBUaGUgY2hpbGRyZW4gb2YgdGhpcyByb3V0ZSBpbiB0aGUgcm91dGVyIHN0YXRlIHRyZWUgKi9cbiAgZ2V0IGNoaWxkcmVuKCk6IEFjdGl2YXRlZFJvdXRlU25hcHNob3RbXSB7XG4gICAgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLmNoaWxkcmVuKHRoaXMpO1xuICB9XG5cbiAgLyoqIFRoZSBwYXRoIGZyb20gdGhlIHJvb3Qgb2YgdGhlIHJvdXRlciBzdGF0ZSB0cmVlIHRvIHRoaXMgcm91dGUgKi9cbiAgZ2V0IHBhdGhGcm9tUm9vdCgpOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90W10ge1xuICAgIHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5wYXRoRnJvbVJvb3QodGhpcyk7XG4gIH1cblxuICBnZXQgcGFyYW1NYXAoKTogUGFyYW1NYXAge1xuICAgIGlmICghdGhpcy5fcGFyYW1NYXApIHtcbiAgICAgIHRoaXMuX3BhcmFtTWFwID0gY29udmVydFRvUGFyYW1NYXAodGhpcy5wYXJhbXMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcGFyYW1NYXA7XG4gIH1cblxuICBnZXQgcXVlcnlQYXJhbU1hcCgpOiBQYXJhbU1hcCB7XG4gICAgaWYgKCF0aGlzLl9xdWVyeVBhcmFtTWFwKSB7XG4gICAgICB0aGlzLl9xdWVyeVBhcmFtTWFwID0gY29udmVydFRvUGFyYW1NYXAodGhpcy5xdWVyeVBhcmFtcyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9xdWVyeVBhcmFtTWFwO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLnVybC5tYXAoc2VnbWVudCA9PiBzZWdtZW50LnRvU3RyaW5nKCkpLmpvaW4oJy8nKTtcbiAgICBjb25zdCBtYXRjaGVkID0gdGhpcy5yb3V0ZUNvbmZpZyA/IHRoaXMucm91dGVDb25maWcucGF0aCA6ICcnO1xuICAgIHJldHVybiBgUm91dGUodXJsOicke3VybH0nLCBwYXRoOicke21hdGNoZWR9JylgO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgc3RhdGUgb2YgdGhlIHJvdXRlciBhdCBhIG1vbWVudCBpbiB0aW1lLlxuICpcbiAqIFRoaXMgaXMgYSB0cmVlIG9mIGFjdGl2YXRlZCByb3V0ZSBzbmFwc2hvdHMuIEV2ZXJ5IG5vZGUgaW4gdGhpcyB0cmVlIGtub3dzIGFib3V0XG4gKiB0aGUgXCJjb25zdW1lZFwiIFVSTCBzZWdtZW50cywgdGhlIGV4dHJhY3RlZCBwYXJhbWV0ZXJzLCBhbmQgdGhlIHJlc29sdmVkIGRhdGEuXG4gKlxuICogVGhlIGZvbGxvd2luZyBleGFtcGxlIHNob3dzIGhvdyBhIGNvbXBvbmVudCBpcyBpbml0aWFsaXplZCB3aXRoIGluZm9ybWF0aW9uXG4gKiBmcm9tIHRoZSBzbmFwc2hvdCBvZiB0aGUgcm9vdCBub2RlJ3Mgc3RhdGUgYXQgdGhlIHRpbWUgb2YgY3JlYXRpb24uXG4gKlxuICogYGBgXG4gKiBAQ29tcG9uZW50KHt0ZW1wbGF0ZVVybDondGVtcGxhdGUuaHRtbCd9KVxuICogY2xhc3MgTXlDb21wb25lbnQge1xuICogICBjb25zdHJ1Y3Rvcihyb3V0ZXI6IFJvdXRlcikge1xuICogICAgIGNvbnN0IHN0YXRlOiBSb3V0ZXJTdGF0ZSA9IHJvdXRlci5yb3V0ZXJTdGF0ZTtcbiAqICAgICBjb25zdCBzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCA9IHN0YXRlLnNuYXBzaG90O1xuICogICAgIGNvbnN0IHJvb3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QgPSBzbmFwc2hvdC5yb290O1xuICogICAgIGNvbnN0IGNoaWxkID0gcm9vdC5maXJzdENoaWxkO1xuICogICAgIGNvbnN0IGlkOiBPYnNlcnZhYmxlPHN0cmluZz4gPSBjaGlsZC5wYXJhbXMubWFwKHAgPT4gcC5pZCk7XG4gKiAgICAgLy8uLi5cbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgUm91dGVyU3RhdGVTbmFwc2hvdCBleHRlbmRzIFRyZWU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4ge1xuICAvKiogQGludGVybmFsICovXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIFRoZSB1cmwgZnJvbSB3aGljaCB0aGlzIHNuYXBzaG90IHdhcyBjcmVhdGVkICovXG4gICAgICBwdWJsaWMgdXJsOiBzdHJpbmcsIHJvb3Q6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KSB7XG4gICAgc3VwZXIocm9vdCk7XG4gICAgc2V0Um91dGVyU3RhdGUoPFJvdXRlclN0YXRlU25hcHNob3Q+dGhpcywgcm9vdCk7XG4gIH1cblxuICBvdmVycmlkZSB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBzZXJpYWxpemVOb2RlKHRoaXMuX3Jvb3QpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNldFJvdXRlclN0YXRlPFUsIFQgZXh0ZW5kcyB7X3JvdXRlclN0YXRlOiBVfT4oc3RhdGU6IFUsIG5vZGU6IFRyZWVOb2RlPFQ+KTogdm9pZCB7XG4gIG5vZGUudmFsdWUuX3JvdXRlclN0YXRlID0gc3RhdGU7XG4gIG5vZGUuY2hpbGRyZW4uZm9yRWFjaChjID0+IHNldFJvdXRlclN0YXRlKHN0YXRlLCBjKSk7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZU5vZGUobm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4pOiBzdHJpbmcge1xuICBjb25zdCBjID0gbm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwID8gYCB7ICR7bm9kZS5jaGlsZHJlbi5tYXAoc2VyaWFsaXplTm9kZSkuam9pbignLCAnKX0gfSBgIDogJyc7XG4gIHJldHVybiBgJHtub2RlLnZhbHVlfSR7Y31gO1xufVxuXG4vKipcbiAqIFRoZSBleHBlY3RhdGlvbiBpcyB0aGF0IHRoZSBhY3RpdmF0ZSByb3V0ZSBpcyBjcmVhdGVkIHdpdGggdGhlIHJpZ2h0IHNldCBvZiBwYXJhbWV0ZXJzLlxuICogU28gd2UgcHVzaCBuZXcgdmFsdWVzIGludG8gdGhlIG9ic2VydmFibGVzIG9ubHkgd2hlbiB0aGV5IGFyZSBub3QgdGhlIGluaXRpYWwgdmFsdWVzLlxuICogQW5kIHdlIGRldGVjdCB0aGF0IGJ5IGNoZWNraW5nIGlmIHRoZSBzbmFwc2hvdCBmaWVsZCBpcyBzZXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZHZhbmNlQWN0aXZhdGVkUm91dGUocm91dGU6IEFjdGl2YXRlZFJvdXRlKTogdm9pZCB7XG4gIGlmIChyb3V0ZS5zbmFwc2hvdCkge1xuICAgIGNvbnN0IGN1cnJlbnRTbmFwc2hvdCA9IHJvdXRlLnNuYXBzaG90O1xuICAgIGNvbnN0IG5leHRTbmFwc2hvdCA9IHJvdXRlLl9mdXR1cmVTbmFwc2hvdDtcbiAgICByb3V0ZS5zbmFwc2hvdCA9IG5leHRTbmFwc2hvdDtcbiAgICBpZiAoIXNoYWxsb3dFcXVhbChjdXJyZW50U25hcHNob3QucXVlcnlQYXJhbXMsIG5leHRTbmFwc2hvdC5xdWVyeVBhcmFtcykpIHtcbiAgICAgICg8YW55PnJvdXRlLnF1ZXJ5UGFyYW1zKS5uZXh0KG5leHRTbmFwc2hvdC5xdWVyeVBhcmFtcyk7XG4gICAgfVxuICAgIGlmIChjdXJyZW50U25hcHNob3QuZnJhZ21lbnQgIT09IG5leHRTbmFwc2hvdC5mcmFnbWVudCkge1xuICAgICAgKDxhbnk+cm91dGUuZnJhZ21lbnQpLm5leHQobmV4dFNuYXBzaG90LmZyYWdtZW50KTtcbiAgICB9XG4gICAgaWYgKCFzaGFsbG93RXF1YWwoY3VycmVudFNuYXBzaG90LnBhcmFtcywgbmV4dFNuYXBzaG90LnBhcmFtcykpIHtcbiAgICAgICg8YW55PnJvdXRlLnBhcmFtcykubmV4dChuZXh0U25hcHNob3QucGFyYW1zKTtcbiAgICB9XG4gICAgaWYgKCFzaGFsbG93RXF1YWxBcnJheXMoY3VycmVudFNuYXBzaG90LnVybCwgbmV4dFNuYXBzaG90LnVybCkpIHtcbiAgICAgICg8YW55PnJvdXRlLnVybCkubmV4dChuZXh0U25hcHNob3QudXJsKTtcbiAgICB9XG4gICAgaWYgKCFzaGFsbG93RXF1YWwoY3VycmVudFNuYXBzaG90LmRhdGEsIG5leHRTbmFwc2hvdC5kYXRhKSkge1xuICAgICAgKDxhbnk+cm91dGUuZGF0YSkubmV4dChuZXh0U25hcHNob3QuZGF0YSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJvdXRlLnNuYXBzaG90ID0gcm91dGUuX2Z1dHVyZVNuYXBzaG90O1xuXG4gICAgLy8gdGhpcyBpcyBmb3IgcmVzb2x2ZWQgZGF0YVxuICAgICg8YW55PnJvdXRlLmRhdGEpLm5leHQocm91dGUuX2Z1dHVyZVNuYXBzaG90LmRhdGEpO1xuICB9XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsUGFyYW1zQW5kVXJsU2VnbWVudHMoXG4gICAgYTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgYjogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IGJvb2xlYW4ge1xuICBjb25zdCBlcXVhbFVybFBhcmFtcyA9IHNoYWxsb3dFcXVhbChhLnBhcmFtcywgYi5wYXJhbXMpICYmIGVxdWFsU2VnbWVudHMoYS51cmwsIGIudXJsKTtcbiAgY29uc3QgcGFyZW50c01pc21hdGNoID0gIWEucGFyZW50ICE9PSAhYi5wYXJlbnQ7XG5cbiAgcmV0dXJuIGVxdWFsVXJsUGFyYW1zICYmICFwYXJlbnRzTWlzbWF0Y2ggJiZcbiAgICAgICghYS5wYXJlbnQgfHwgZXF1YWxQYXJhbXNBbmRVcmxTZWdtZW50cyhhLnBhcmVudCwgYi5wYXJlbnQhKSk7XG59XG4iXX0=