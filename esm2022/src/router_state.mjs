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
 * @see {@link ActivatedRoute}
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
export function createEmptyState(rootComponent) {
    const snapshot = createEmptyStateSnapshot(rootComponent);
    const emptyUrl = new BehaviorSubject([new UrlSegment('', {})]);
    const emptyParams = new BehaviorSubject({});
    const emptyData = new BehaviorSubject({});
    const emptyQueryParams = new BehaviorSubject({});
    const fragment = new BehaviorSubject('');
    const activated = new ActivatedRoute(emptyUrl, emptyParams, emptyQueryParams, fragment, emptyData, PRIMARY_OUTLET, rootComponent, snapshot.root);
    activated.snapshot = snapshot.root;
    return new RouterState(new TreeNode(activated, []), snapshot);
}
export function createEmptyStateSnapshot(rootComponent) {
    const emptyParams = {};
    const emptyData = {};
    const emptyQueryParams = {};
    const fragment = '';
    const activated = new ActivatedRouteSnapshot([], emptyParams, emptyQueryParams, fragment, emptyData, PRIMARY_OUTLET, rootComponent, null, {});
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
    /** @internal */
    urlSubject, 
    /** @internal */
    paramsSubject, 
    /** @internal */
    queryParamsSubject, 
    /** @internal */
    fragmentSubject, 
    /** @internal */
    dataSubject, 
    /** The outlet name of the route, a constant. */
    outlet, 
    /** The component of the route, a constant. */
    component, futureSnapshot) {
        this.urlSubject = urlSubject;
        this.paramsSubject = paramsSubject;
        this.queryParamsSubject = queryParamsSubject;
        this.fragmentSubject = fragmentSubject;
        this.dataSubject = dataSubject;
        this.outlet = outlet;
        this.component = component;
        this._futureSnapshot = futureSnapshot;
        this.title = this.dataSubject?.pipe(map((d) => d[RouteTitleKey])) ?? of(undefined);
        // TODO(atscott): Verify that these can be changed to `.asObservable()` with TGP.
        this.url = urlSubject;
        this.params = paramsSubject;
        this.queryParams = queryParamsSubject;
        this.fragment = fragmentSubject;
        this.data = dataSubject;
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
 *
 * By default, we do not inherit parent data unless the current route is path-less or the parent
 * route is component-less.
 */
export function getInherited(route, parent, paramsInheritanceStrategy = 'emptyOnly') {
    let inherited;
    const { routeConfig } = route;
    if (parent !== null &&
        (paramsInheritanceStrategy === 'always' ||
            // inherit parent data if route is empty path
            routeConfig?.path === '' ||
            // inherit parent data if parent was componentless
            (!parent.component && !parent.routeConfig?.loadComponent))) {
        inherited = {
            params: { ...parent.params, ...route.params },
            data: { ...parent.data, ...route.data },
            resolve: {
                // Snapshots are created with data inherited from parent and guards (i.e. canActivate) can
                // change data because it's not frozen...
                // This first line could be deleted chose to break/disallow mutating the `data` object in
                // guards.
                // Note that data from parents still override this mutated data so anyone relying on this
                // might be surprised that it doesn't work if parent data is inherited but otherwise does.
                ...route.data,
                // Ensure inherited resolved data overrides inherited static data
                ...parent.data,
                // static data from the current route overrides any inherited data
                ...routeConfig?.data,
                // resolved data from current route overrides everything
                ...route._resolvedData,
            }
        };
    }
    else {
        inherited = {
            params: { ...route.params },
            data: { ...route.data },
            resolve: { ...route.data, ...(route._resolvedData ?? {}) }
        };
    }
    if (routeConfig && hasStaticTitle(routeConfig)) {
        inherited.resolve[RouteTitleKey] = routeConfig.title;
    }
    return inherited;
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
    /** The resolved route title */
    get title() {
        // Note: This _must_ be a getter because the data is mutated in the resolvers. Title will not be
        // available at the time of class instantiation.
        return this.data?.[RouteTitleKey];
    }
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
    component, routeConfig, resolve) {
        this.url = url;
        this.params = params;
        this.queryParams = queryParams;
        this.fragment = fragment;
        this.data = data;
        this.outlet = outlet;
        this.component = component;
        this.routeConfig = routeConfig;
        this._resolve = resolve;
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
            route.queryParamsSubject.next(nextSnapshot.queryParams);
        }
        if (currentSnapshot.fragment !== nextSnapshot.fragment) {
            route.fragmentSubject.next(nextSnapshot.fragment);
        }
        if (!shallowEqual(currentSnapshot.params, nextSnapshot.params)) {
            route.paramsSubject.next(nextSnapshot.params);
        }
        if (!shallowEqualArrays(currentSnapshot.url, nextSnapshot.url)) {
            route.urlSubject.next(nextSnapshot.url);
        }
        if (!shallowEqual(currentSnapshot.data, nextSnapshot.data)) {
            route.dataSubject.next(nextSnapshot.data);
        }
    }
    else {
        route.snapshot = route._futureSnapshot;
        // this is for resolved data
        route.dataSubject.next(route._futureSnapshot.data);
    }
}
export function equalParamsAndUrlSegments(a, b) {
    const equalUrlParams = shallowEqual(a.params, b.params) && equalSegments(a.url, b.url);
    const parentsMismatch = !a.parent !== !b.parent;
    return equalUrlParams && !parentsMismatch &&
        (!a.parent || equalParamsAndUrlSegments(a.parent, b.parent));
}
export function hasStaticTitle(config) {
    return typeof config.title === 'string' || config.title === null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3N0YXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXJfc3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUFDLGVBQWUsRUFBYyxFQUFFLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDckQsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBR25DLE9BQU8sRUFBQyxpQkFBaUIsRUFBb0IsY0FBYyxFQUFFLGFBQWEsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM1RixPQUFPLEVBQUMsYUFBYSxFQUFFLFVBQVUsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUNyRCxPQUFPLEVBQUMsWUFBWSxFQUFFLGtCQUFrQixFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDcEUsT0FBTyxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFFNUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQThCRztBQUNILE1BQU0sT0FBTyxXQUFZLFNBQVEsSUFBb0I7SUFDbkQsZ0JBQWdCO0lBQ2hCLFlBQ0ksSUFBOEI7SUFDOUIsK0NBQStDO0lBQ3hDLFFBQTZCO1FBQ3RDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQURILGFBQVEsR0FBUixRQUFRLENBQXFCO1FBRXRDLGNBQWMsQ0FBYyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVRLFFBQVE7UUFDZixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDbEMsQ0FBQztDQUNGO0FBRUQsTUFBTSxVQUFVLGdCQUFnQixDQUFDLGFBQTZCO0lBQzVELE1BQU0sUUFBUSxHQUFHLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3pELE1BQU0sUUFBUSxHQUFHLElBQUksZUFBZSxDQUFDLENB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LENBQUMsS0FBSyxLQUFLLFFBQVEsSUFBSSxNQUFNLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQztBQUNuRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7VHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0JlaGF2aW9yU3ViamVjdCwgT2JzZXJ2YWJsZSwgb2Z9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtEYXRhLCBSZXNvbHZlRGF0YSwgUm91dGV9IGZyb20gJy4vbW9kZWxzJztcbmltcG9ydCB7Y29udmVydFRvUGFyYW1NYXAsIFBhcmFtTWFwLCBQYXJhbXMsIFBSSU1BUllfT1VUTEVULCBSb3V0ZVRpdGxlS2V5fSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge2VxdWFsU2VnbWVudHMsIFVybFNlZ21lbnR9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtzaGFsbG93RXF1YWwsIHNoYWxsb3dFcXVhbEFycmF5c30gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcbmltcG9ydCB7VHJlZSwgVHJlZU5vZGV9IGZyb20gJy4vdXRpbHMvdHJlZSc7XG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgc3RhdGUgb2YgdGhlIHJvdXRlciBhcyBhIHRyZWUgb2YgYWN0aXZhdGVkIHJvdXRlcy5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIEV2ZXJ5IG5vZGUgaW4gdGhlIHJvdXRlIHRyZWUgaXMgYW4gYEFjdGl2YXRlZFJvdXRlYCBpbnN0YW5jZVxuICogdGhhdCBrbm93cyBhYm91dCB0aGUgXCJjb25zdW1lZFwiIFVSTCBzZWdtZW50cywgdGhlIGV4dHJhY3RlZCBwYXJhbWV0ZXJzLFxuICogYW5kIHRoZSByZXNvbHZlZCBkYXRhLlxuICogVXNlIHRoZSBgQWN0aXZhdGVkUm91dGVgIHByb3BlcnRpZXMgdG8gdHJhdmVyc2UgdGhlIHRyZWUgZnJvbSBhbnkgbm9kZS5cbiAqXG4gKiBUaGUgZm9sbG93aW5nIGZyYWdtZW50IHNob3dzIGhvdyBhIGNvbXBvbmVudCBnZXRzIHRoZSByb290IG5vZGVcbiAqIG9mIHRoZSBjdXJyZW50IHN0YXRlIHRvIGVzdGFibGlzaCBpdHMgb3duIHJvdXRlIHRyZWU6XG4gKlxuICogYGBgXG4gKiBAQ29tcG9uZW50KHt0ZW1wbGF0ZVVybDondGVtcGxhdGUuaHRtbCd9KVxuICogY2xhc3MgTXlDb21wb25lbnQge1xuICogICBjb25zdHJ1Y3Rvcihyb3V0ZXI6IFJvdXRlcikge1xuICogICAgIGNvbnN0IHN0YXRlOiBSb3V0ZXJTdGF0ZSA9IHJvdXRlci5yb3V0ZXJTdGF0ZTtcbiAqICAgICBjb25zdCByb290OiBBY3RpdmF0ZWRSb3V0ZSA9IHN0YXRlLnJvb3Q7XG4gKiAgICAgY29uc3QgY2hpbGQgPSByb290LmZpcnN0Q2hpbGQ7XG4gKiAgICAgY29uc3QgaWQ6IE9ic2VydmFibGU8c3RyaW5nPiA9IGNoaWxkLnBhcmFtcy5tYXAocCA9PiBwLmlkKTtcbiAqICAgICAvLy4uLlxuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBAc2VlIHtAbGluayBBY3RpdmF0ZWRSb3V0ZX1cbiAqIEBzZWUgW0dldHRpbmcgcm91dGUgaW5mb3JtYXRpb25dKGd1aWRlL3JvdXRlciNnZXR0aW5nLXJvdXRlLWluZm9ybWF0aW9uKVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlclN0YXRlIGV4dGVuZHMgVHJlZTxBY3RpdmF0ZWRSb3V0ZT4ge1xuICAvKiogQGludGVybmFsICovXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcm9vdDogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LFxuICAgICAgLyoqIFRoZSBjdXJyZW50IHNuYXBzaG90IG9mIHRoZSByb3V0ZXIgc3RhdGUgKi9cbiAgICAgIHB1YmxpYyBzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCkge1xuICAgIHN1cGVyKHJvb3QpO1xuICAgIHNldFJvdXRlclN0YXRlKDxSb3V0ZXJTdGF0ZT50aGlzLCByb290KTtcbiAgfVxuXG4gIG92ZXJyaWRlIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuc25hcHNob3QudG9TdHJpbmcoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRW1wdHlTdGF0ZShyb290Q29tcG9uZW50OiBUeXBlPGFueT58bnVsbCk6IFJvdXRlclN0YXRlIHtcbiAgY29uc3Qgc25hcHNob3QgPSBjcmVhdGVFbXB0eVN0YXRlU25hcHNob3Qocm9vdENvbXBvbmVudCk7XG4gIGNvbnN0IGVtcHR5VXJsID0gbmV3IEJlaGF2aW9yU3ViamVjdChbbmV3IFVybFNlZ21lbnQoJycsIHt9KV0pO1xuICBjb25zdCBlbXB0eVBhcmFtcyA9IG5ldyBCZWhhdmlvclN1YmplY3Qoe30pO1xuICBjb25zdCBlbXB0eURhdGEgPSBuZXcgQmVoYXZpb3JTdWJqZWN0KHt9KTtcbiAgY29uc3QgZW1wdHlRdWVyeVBhcmFtcyA9IG5ldyBCZWhhdmlvclN1YmplY3Qoe30pO1xuICBjb25zdCBmcmFnbWVudCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8c3RyaW5nfG51bGw+KCcnKTtcbiAgY29uc3QgYWN0aXZhdGVkID0gbmV3IEFjdGl2YXRlZFJvdXRlKFxuICAgICAgZW1wdHlVcmwsIGVtcHR5UGFyYW1zLCBlbXB0eVF1ZXJ5UGFyYW1zLCBmcmFnbWVudCwgZW1wdHlEYXRhLCBQUklNQVJZX09VVExFVCwgcm9vdENvbXBvbmVudCxcbiAgICAgIHNuYXBzaG90LnJvb3QpO1xuICBhY3RpdmF0ZWQuc25hcHNob3QgPSBzbmFwc2hvdC5yb290O1xuICByZXR1cm4gbmV3IFJvdXRlclN0YXRlKG5ldyBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4oYWN0aXZhdGVkLCBbXSksIHNuYXBzaG90KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVtcHR5U3RhdGVTbmFwc2hvdChyb290Q29tcG9uZW50OiBUeXBlPGFueT58bnVsbCk6IFJvdXRlclN0YXRlU25hcHNob3Qge1xuICBjb25zdCBlbXB0eVBhcmFtcyA9IHt9O1xuICBjb25zdCBlbXB0eURhdGEgPSB7fTtcbiAgY29uc3QgZW1wdHlRdWVyeVBhcmFtcyA9IHt9O1xuICBjb25zdCBmcmFnbWVudCA9ICcnO1xuICBjb25zdCBhY3RpdmF0ZWQgPSBuZXcgQWN0aXZhdGVkUm91dGVTbmFwc2hvdChcbiAgICAgIFtdLCBlbXB0eVBhcmFtcywgZW1wdHlRdWVyeVBhcmFtcywgZnJhZ21lbnQsIGVtcHR5RGF0YSwgUFJJTUFSWV9PVVRMRVQsIHJvb3RDb21wb25lbnQsIG51bGwsXG4gICAgICB7fSk7XG4gIHJldHVybiBuZXcgUm91dGVyU3RhdGVTbmFwc2hvdCgnJywgbmV3IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KGFjdGl2YXRlZCwgW10pKTtcbn1cblxuLyoqXG4gKiBQcm92aWRlcyBhY2Nlc3MgdG8gaW5mb3JtYXRpb24gYWJvdXQgYSByb3V0ZSBhc3NvY2lhdGVkIHdpdGggYSBjb21wb25lbnRcbiAqIHRoYXQgaXMgbG9hZGVkIGluIGFuIG91dGxldC5cbiAqIFVzZSB0byB0cmF2ZXJzZSB0aGUgYFJvdXRlclN0YXRlYCB0cmVlIGFuZCBleHRyYWN0IGluZm9ybWF0aW9uIGZyb20gbm9kZXMuXG4gKlxuICogVGhlIGZvbGxvd2luZyBleGFtcGxlIHNob3dzIGhvdyB0byBjb25zdHJ1Y3QgYSBjb21wb25lbnQgdXNpbmcgaW5mb3JtYXRpb24gZnJvbSBhXG4gKiBjdXJyZW50bHkgYWN0aXZhdGVkIHJvdXRlLlxuICpcbiAqIE5vdGU6IHRoZSBvYnNlcnZhYmxlcyBpbiB0aGlzIGNsYXNzIG9ubHkgZW1pdCB3aGVuIHRoZSBjdXJyZW50IGFuZCBwcmV2aW91cyB2YWx1ZXMgZGlmZmVyIGJhc2VkXG4gKiBvbiBzaGFsbG93IGVxdWFsaXR5LiBGb3IgZXhhbXBsZSwgY2hhbmdpbmcgZGVlcGx5IG5lc3RlZCBwcm9wZXJ0aWVzIGluIHJlc29sdmVkIGBkYXRhYCB3aWxsIG5vdFxuICogY2F1c2UgdGhlIGBBY3RpdmF0ZWRSb3V0ZS5kYXRhYCBgT2JzZXJ2YWJsZWAgdG8gZW1pdCBhIG5ldyB2YWx1ZS5cbiAqXG4gKiB7QGV4YW1wbGUgcm91dGVyL2FjdGl2YXRlZC1yb3V0ZS9tb2R1bGUudHMgcmVnaW9uPVwiYWN0aXZhdGVkLXJvdXRlXCJcbiAqICAgICBoZWFkZXI9XCJhY3RpdmF0ZWQtcm91dGUuY29tcG9uZW50LnRzXCJ9XG4gKlxuICogQHNlZSBbR2V0dGluZyByb3V0ZSBpbmZvcm1hdGlvbl0oZ3VpZGUvcm91dGVyI2dldHRpbmctcm91dGUtaW5mb3JtYXRpb24pXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgQWN0aXZhdGVkUm91dGUge1xuICAvKiogVGhlIGN1cnJlbnQgc25hcHNob3Qgb2YgdGhpcyByb3V0ZSAqL1xuICBzbmFwc2hvdCE6IEFjdGl2YXRlZFJvdXRlU25hcHNob3Q7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX2Z1dHVyZVNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90O1xuICAvKiogQGludGVybmFsICovXG4gIF9yb3V0ZXJTdGF0ZSE6IFJvdXRlclN0YXRlO1xuICAvKiogQGludGVybmFsICovXG4gIF9wYXJhbU1hcD86IE9ic2VydmFibGU8UGFyYW1NYXA+O1xuICAvKiogQGludGVybmFsICovXG4gIF9xdWVyeVBhcmFtTWFwPzogT2JzZXJ2YWJsZTxQYXJhbU1hcD47XG5cbiAgLyoqIEFuIE9ic2VydmFibGUgb2YgdGhlIHJlc29sdmVkIHJvdXRlIHRpdGxlICovXG4gIHJlYWRvbmx5IHRpdGxlOiBPYnNlcnZhYmxlPHN0cmluZ3x1bmRlZmluZWQ+O1xuXG4gIC8qKiBBbiBvYnNlcnZhYmxlIG9mIHRoZSBVUkwgc2VnbWVudHMgbWF0Y2hlZCBieSB0aGlzIHJvdXRlLiAqL1xuICBwdWJsaWMgdXJsOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRbXT47XG4gIC8qKiBBbiBvYnNlcnZhYmxlIG9mIHRoZSBtYXRyaXggcGFyYW1ldGVycyBzY29wZWQgdG8gdGhpcyByb3V0ZS4gKi9cbiAgcHVibGljIHBhcmFtczogT2JzZXJ2YWJsZTxQYXJhbXM+O1xuICAvKiogQW4gb2JzZXJ2YWJsZSBvZiB0aGUgcXVlcnkgcGFyYW1ldGVycyBzaGFyZWQgYnkgYWxsIHRoZSByb3V0ZXMuICovXG4gIHB1YmxpYyBxdWVyeVBhcmFtczogT2JzZXJ2YWJsZTxQYXJhbXM+O1xuICAvKiogQW4gb2JzZXJ2YWJsZSBvZiB0aGUgVVJMIGZyYWdtZW50IHNoYXJlZCBieSBhbGwgdGhlIHJvdXRlcy4gKi9cbiAgcHVibGljIGZyYWdtZW50OiBPYnNlcnZhYmxlPHN0cmluZ3xudWxsPjtcbiAgLyoqIEFuIG9ic2VydmFibGUgb2YgdGhlIHN0YXRpYyBhbmQgcmVzb2x2ZWQgZGF0YSBvZiB0aGlzIHJvdXRlLiAqL1xuICBwdWJsaWMgZGF0YTogT2JzZXJ2YWJsZTxEYXRhPjtcblxuICAvKiogQGludGVybmFsICovXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgICAgcHVibGljIHVybFN1YmplY3Q6IEJlaGF2aW9yU3ViamVjdDxVcmxTZWdtZW50W10+LFxuICAgICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgICAgcHVibGljIHBhcmFtc1N1YmplY3Q6IEJlaGF2aW9yU3ViamVjdDxQYXJhbXM+LFxuICAgICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgICAgcHVibGljIHF1ZXJ5UGFyYW1zU3ViamVjdDogQmVoYXZpb3JTdWJqZWN0PFBhcmFtcz4sXG4gICAgICAvKiogQGludGVybmFsICovXG4gICAgICBwdWJsaWMgZnJhZ21lbnRTdWJqZWN0OiBCZWhhdmlvclN1YmplY3Q8c3RyaW5nfG51bGw+LFxuICAgICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgICAgcHVibGljIGRhdGFTdWJqZWN0OiBCZWhhdmlvclN1YmplY3Q8RGF0YT4sXG4gICAgICAvKiogVGhlIG91dGxldCBuYW1lIG9mIHRoZSByb3V0ZSwgYSBjb25zdGFudC4gKi9cbiAgICAgIHB1YmxpYyBvdXRsZXQ6IHN0cmluZyxcbiAgICAgIC8qKiBUaGUgY29tcG9uZW50IG9mIHRoZSByb3V0ZSwgYSBjb25zdGFudC4gKi9cbiAgICAgIHB1YmxpYyBjb21wb25lbnQ6IFR5cGU8YW55PnxudWxsLCBmdXR1cmVTbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCkge1xuICAgIHRoaXMuX2Z1dHVyZVNuYXBzaG90ID0gZnV0dXJlU25hcHNob3Q7XG4gICAgdGhpcy50aXRsZSA9IHRoaXMuZGF0YVN1YmplY3Q/LnBpcGUobWFwKChkOiBEYXRhKSA9PiBkW1JvdXRlVGl0bGVLZXldKSkgPz8gb2YodW5kZWZpbmVkKTtcbiAgICAvLyBUT0RPKGF0c2NvdHQpOiBWZXJpZnkgdGhhdCB0aGVzZSBjYW4gYmUgY2hhbmdlZCB0byBgLmFzT2JzZXJ2YWJsZSgpYCB3aXRoIFRHUC5cbiAgICB0aGlzLnVybCA9IHVybFN1YmplY3Q7XG4gICAgdGhpcy5wYXJhbXMgPSBwYXJhbXNTdWJqZWN0O1xuICAgIHRoaXMucXVlcnlQYXJhbXMgPSBxdWVyeVBhcmFtc1N1YmplY3Q7XG4gICAgdGhpcy5mcmFnbWVudCA9IGZyYWdtZW50U3ViamVjdDtcbiAgICB0aGlzLmRhdGEgPSBkYXRhU3ViamVjdDtcbiAgfVxuXG4gIC8qKiBUaGUgY29uZmlndXJhdGlvbiB1c2VkIHRvIG1hdGNoIHRoaXMgcm91dGUuICovXG4gIGdldCByb3V0ZUNvbmZpZygpOiBSb3V0ZXxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5fZnV0dXJlU25hcHNob3Qucm91dGVDb25maWc7XG4gIH1cblxuICAvKiogVGhlIHJvb3Qgb2YgdGhlIHJvdXRlciBzdGF0ZS4gKi9cbiAgZ2V0IHJvb3QoKTogQWN0aXZhdGVkUm91dGUge1xuICAgIHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5yb290O1xuICB9XG5cbiAgLyoqIFRoZSBwYXJlbnQgb2YgdGhpcyByb3V0ZSBpbiB0aGUgcm91dGVyIHN0YXRlIHRyZWUuICovXG4gIGdldCBwYXJlbnQoKTogQWN0aXZhdGVkUm91dGV8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLnBhcmVudCh0aGlzKTtcbiAgfVxuXG4gIC8qKiBUaGUgZmlyc3QgY2hpbGQgb2YgdGhpcyByb3V0ZSBpbiB0aGUgcm91dGVyIHN0YXRlIHRyZWUuICovXG4gIGdldCBmaXJzdENoaWxkKCk6IEFjdGl2YXRlZFJvdXRlfG51bGwge1xuICAgIHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5maXJzdENoaWxkKHRoaXMpO1xuICB9XG5cbiAgLyoqIFRoZSBjaGlsZHJlbiBvZiB0aGlzIHJvdXRlIGluIHRoZSByb3V0ZXIgc3RhdGUgdHJlZS4gKi9cbiAgZ2V0IGNoaWxkcmVuKCk6IEFjdGl2YXRlZFJvdXRlW10ge1xuICAgIHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5jaGlsZHJlbih0aGlzKTtcbiAgfVxuXG4gIC8qKiBUaGUgcGF0aCBmcm9tIHRoZSByb290IG9mIHRoZSByb3V0ZXIgc3RhdGUgdHJlZSB0byB0aGlzIHJvdXRlLiAqL1xuICBnZXQgcGF0aEZyb21Sb290KCk6IEFjdGl2YXRlZFJvdXRlW10ge1xuICAgIHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5wYXRoRnJvbVJvb3QodGhpcyk7XG4gIH1cblxuICAvKipcbiAgICogQW4gT2JzZXJ2YWJsZSB0aGF0IGNvbnRhaW5zIGEgbWFwIG9mIHRoZSByZXF1aXJlZCBhbmQgb3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgKiBzcGVjaWZpYyB0byB0aGUgcm91dGUuXG4gICAqIFRoZSBtYXAgc3VwcG9ydHMgcmV0cmlldmluZyBzaW5nbGUgYW5kIG11bHRpcGxlIHZhbHVlcyBmcm9tIHRoZSBzYW1lIHBhcmFtZXRlci5cbiAgICovXG4gIGdldCBwYXJhbU1hcCgpOiBPYnNlcnZhYmxlPFBhcmFtTWFwPiB7XG4gICAgaWYgKCF0aGlzLl9wYXJhbU1hcCkge1xuICAgICAgdGhpcy5fcGFyYW1NYXAgPSB0aGlzLnBhcmFtcy5waXBlKG1hcCgocDogUGFyYW1zKTogUGFyYW1NYXAgPT4gY29udmVydFRvUGFyYW1NYXAocCkpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3BhcmFtTWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIEFuIE9ic2VydmFibGUgdGhhdCBjb250YWlucyBhIG1hcCBvZiB0aGUgcXVlcnkgcGFyYW1ldGVycyBhdmFpbGFibGUgdG8gYWxsIHJvdXRlcy5cbiAgICogVGhlIG1hcCBzdXBwb3J0cyByZXRyaWV2aW5nIHNpbmdsZSBhbmQgbXVsdGlwbGUgdmFsdWVzIGZyb20gdGhlIHF1ZXJ5IHBhcmFtZXRlci5cbiAgICovXG4gIGdldCBxdWVyeVBhcmFtTWFwKCk6IE9ic2VydmFibGU8UGFyYW1NYXA+IHtcbiAgICBpZiAoIXRoaXMuX3F1ZXJ5UGFyYW1NYXApIHtcbiAgICAgIHRoaXMuX3F1ZXJ5UGFyYW1NYXAgPVxuICAgICAgICAgIHRoaXMucXVlcnlQYXJhbXMucGlwZShtYXAoKHA6IFBhcmFtcyk6IFBhcmFtTWFwID0+IGNvbnZlcnRUb1BhcmFtTWFwKHApKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9xdWVyeVBhcmFtTWFwO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5zbmFwc2hvdCA/IHRoaXMuc25hcHNob3QudG9TdHJpbmcoKSA6IGBGdXR1cmUoJHt0aGlzLl9mdXR1cmVTbmFwc2hvdH0pYDtcbiAgfVxufVxuXG5leHBvcnQgdHlwZSBQYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5ID0gJ2VtcHR5T25seSd8J2Fsd2F5cyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIEluaGVyaXRlZCA9IHtcbiAgcGFyYW1zOiBQYXJhbXMsXG4gIGRhdGE6IERhdGEsXG4gIHJlc29sdmU6IERhdGEsXG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGluaGVyaXRlZCBwYXJhbXMsIGRhdGEsIGFuZCByZXNvbHZlIGZvciBhIGdpdmVuIHJvdXRlLlxuICpcbiAqIEJ5IGRlZmF1bHQsIHdlIGRvIG5vdCBpbmhlcml0IHBhcmVudCBkYXRhIHVubGVzcyB0aGUgY3VycmVudCByb3V0ZSBpcyBwYXRoLWxlc3Mgb3IgdGhlIHBhcmVudFxuICogcm91dGUgaXMgY29tcG9uZW50LWxlc3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRJbmhlcml0ZWQoXG4gICAgcm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIHBhcmVudDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdHxudWxsLFxuICAgIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6IFBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kgPSAnZW1wdHlPbmx5Jyk6IEluaGVyaXRlZCB7XG4gIGxldCBpbmhlcml0ZWQ6IEluaGVyaXRlZDtcbiAgY29uc3Qge3JvdXRlQ29uZmlnfSA9IHJvdXRlO1xuICBpZiAocGFyZW50ICE9PSBudWxsICYmXG4gICAgICAocGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSA9PT0gJ2Fsd2F5cycgfHxcbiAgICAgICAvLyBpbmhlcml0IHBhcmVudCBkYXRhIGlmIHJvdXRlIGlzIGVtcHR5IHBhdGhcbiAgICAgICByb3V0ZUNvbmZpZz8ucGF0aCA9PT0gJycgfHxcbiAgICAgICAvLyBpbmhlcml0IHBhcmVudCBkYXRhIGlmIHBhcmVudCB3YXMgY29tcG9uZW50bGVzc1xuICAgICAgICghcGFyZW50LmNvbXBvbmVudCAmJiAhcGFyZW50LnJvdXRlQ29uZmlnPy5sb2FkQ29tcG9uZW50KSkpIHtcbiAgICBpbmhlcml0ZWQgPSB7XG4gICAgICBwYXJhbXM6IHsuLi5wYXJlbnQucGFyYW1zLCAuLi5yb3V0ZS5wYXJhbXN9LFxuICAgICAgZGF0YTogey4uLnBhcmVudC5kYXRhLCAuLi5yb3V0ZS5kYXRhfSxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgLy8gU25hcHNob3RzIGFyZSBjcmVhdGVkIHdpdGggZGF0YSBpbmhlcml0ZWQgZnJvbSBwYXJlbnQgYW5kIGd1YXJkcyAoaS5lLiBjYW5BY3RpdmF0ZSkgY2FuXG4gICAgICAgIC8vIGNoYW5nZSBkYXRhIGJlY2F1c2UgaXQncyBub3QgZnJvemVuLi4uXG4gICAgICAgIC8vIFRoaXMgZmlyc3QgbGluZSBjb3VsZCBiZSBkZWxldGVkIGNob3NlIHRvIGJyZWFrL2Rpc2FsbG93IG11dGF0aW5nIHRoZSBgZGF0YWAgb2JqZWN0IGluXG4gICAgICAgIC8vIGd1YXJkcy5cbiAgICAgICAgLy8gTm90ZSB0aGF0IGRhdGEgZnJvbSBwYXJlbnRzIHN0aWxsIG92ZXJyaWRlIHRoaXMgbXV0YXRlZCBkYXRhIHNvIGFueW9uZSByZWx5aW5nIG9uIHRoaXNcbiAgICAgICAgLy8gbWlnaHQgYmUgc3VycHJpc2VkIHRoYXQgaXQgZG9lc24ndCB3b3JrIGlmIHBhcmVudCBkYXRhIGlzIGluaGVyaXRlZCBidXQgb3RoZXJ3aXNlIGRvZXMuXG4gICAgICAgIC4uLnJvdXRlLmRhdGEsXG4gICAgICAgIC8vIEVuc3VyZSBpbmhlcml0ZWQgcmVzb2x2ZWQgZGF0YSBvdmVycmlkZXMgaW5oZXJpdGVkIHN0YXRpYyBkYXRhXG4gICAgICAgIC4uLnBhcmVudC5kYXRhLFxuICAgICAgICAvLyBzdGF0aWMgZGF0YSBmcm9tIHRoZSBjdXJyZW50IHJvdXRlIG92ZXJyaWRlcyBhbnkgaW5oZXJpdGVkIGRhdGFcbiAgICAgICAgLi4ucm91dGVDb25maWc/LmRhdGEsXG4gICAgICAgIC8vIHJlc29sdmVkIGRhdGEgZnJvbSBjdXJyZW50IHJvdXRlIG92ZXJyaWRlcyBldmVyeXRoaW5nXG4gICAgICAgIC4uLnJvdXRlLl9yZXNvbHZlZERhdGEsXG4gICAgICB9XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICBpbmhlcml0ZWQgPSB7XG4gICAgICBwYXJhbXM6IHsuLi5yb3V0ZS5wYXJhbXN9LFxuICAgICAgZGF0YTogey4uLnJvdXRlLmRhdGF9LFxuICAgICAgcmVzb2x2ZTogey4uLnJvdXRlLmRhdGEsIC4uLihyb3V0ZS5fcmVzb2x2ZWREYXRhID8/IHt9KX1cbiAgICB9O1xuICB9XG5cbiAgaWYgKHJvdXRlQ29uZmlnICYmIGhhc1N0YXRpY1RpdGxlKHJvdXRlQ29uZmlnKSkge1xuICAgIGluaGVyaXRlZC5yZXNvbHZlW1JvdXRlVGl0bGVLZXldID0gcm91dGVDb25maWcudGl0bGU7XG4gIH1cbiAgcmV0dXJuIGluaGVyaXRlZDtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBDb250YWlucyB0aGUgaW5mb3JtYXRpb24gYWJvdXQgYSByb3V0ZSBhc3NvY2lhdGVkIHdpdGggYSBjb21wb25lbnQgbG9hZGVkIGluIGFuXG4gKiBvdXRsZXQgYXQgYSBwYXJ0aWN1bGFyIG1vbWVudCBpbiB0aW1lLiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90IGNhbiBhbHNvIGJlIHVzZWQgdG9cbiAqIHRyYXZlcnNlIHRoZSByb3V0ZXIgc3RhdGUgdHJlZS5cbiAqXG4gKiBUaGUgZm9sbG93aW5nIGV4YW1wbGUgaW5pdGlhbGl6ZXMgYSBjb21wb25lbnQgd2l0aCByb3V0ZSBpbmZvcm1hdGlvbiBleHRyYWN0ZWRcbiAqIGZyb20gdGhlIHNuYXBzaG90IG9mIHRoZSByb290IG5vZGUgYXQgdGhlIHRpbWUgb2YgY3JlYXRpb24uXG4gKlxuICogYGBgXG4gKiBAQ29tcG9uZW50KHt0ZW1wbGF0ZVVybDonLi9teS1jb21wb25lbnQuaHRtbCd9KVxuICogY2xhc3MgTXlDb21wb25lbnQge1xuICogICBjb25zdHJ1Y3Rvcihyb3V0ZTogQWN0aXZhdGVkUm91dGUpIHtcbiAqICAgICBjb25zdCBpZDogc3RyaW5nID0gcm91dGUuc25hcHNob3QucGFyYW1zLmlkO1xuICogICAgIGNvbnN0IHVybDogc3RyaW5nID0gcm91dGUuc25hcHNob3QudXJsLmpvaW4oJycpO1xuICogICAgIGNvbnN0IHVzZXIgPSByb3V0ZS5zbmFwc2hvdC5kYXRhLnVzZXI7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIEFjdGl2YXRlZFJvdXRlU25hcHNob3Qge1xuICAvKiogVGhlIGNvbmZpZ3VyYXRpb24gdXNlZCB0byBtYXRjaCB0aGlzIHJvdXRlICoqL1xuICBwdWJsaWMgcmVhZG9ubHkgcm91dGVDb25maWc6IFJvdXRlfG51bGw7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX3Jlc29sdmU6IFJlc29sdmVEYXRhO1xuICAvKiogQGludGVybmFsICovXG4gIF9yZXNvbHZlZERhdGE/OiBEYXRhO1xuICAvKiogQGludGVybmFsICovXG4gIF9yb3V0ZXJTdGF0ZSE6IFJvdXRlclN0YXRlU25hcHNob3Q7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX3BhcmFtTWFwPzogUGFyYW1NYXA7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX3F1ZXJ5UGFyYW1NYXA/OiBQYXJhbU1hcDtcblxuICAvKiogVGhlIHJlc29sdmVkIHJvdXRlIHRpdGxlICovXG4gIGdldCB0aXRsZSgpOiBzdHJpbmd8dW5kZWZpbmVkIHtcbiAgICAvLyBOb3RlOiBUaGlzIF9tdXN0XyBiZSBhIGdldHRlciBiZWNhdXNlIHRoZSBkYXRhIGlzIG11dGF0ZWQgaW4gdGhlIHJlc29sdmVycy4gVGl0bGUgd2lsbCBub3QgYmVcbiAgICAvLyBhdmFpbGFibGUgYXQgdGhlIHRpbWUgb2YgY2xhc3MgaW5zdGFudGlhdGlvbi5cbiAgICByZXR1cm4gdGhpcy5kYXRhPy5bUm91dGVUaXRsZUtleV07XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIFRoZSBVUkwgc2VnbWVudHMgbWF0Y2hlZCBieSB0aGlzIHJvdXRlICovXG4gICAgICBwdWJsaWMgdXJsOiBVcmxTZWdtZW50W10sXG4gICAgICAvKipcbiAgICAgICAqICBUaGUgbWF0cml4IHBhcmFtZXRlcnMgc2NvcGVkIHRvIHRoaXMgcm91dGUuXG4gICAgICAgKlxuICAgICAgICogIFlvdSBjYW4gY29tcHV0ZSBhbGwgcGFyYW1zIChvciBkYXRhKSBpbiB0aGUgcm91dGVyIHN0YXRlIG9yIHRvIGdldCBwYXJhbXMgb3V0c2lkZVxuICAgICAgICogIG9mIGFuIGFjdGl2YXRlZCBjb21wb25lbnQgYnkgdHJhdmVyc2luZyB0aGUgYFJvdXRlclN0YXRlYCB0cmVlIGFzIGluIHRoZSBmb2xsb3dpbmdcbiAgICAgICAqICBleGFtcGxlOlxuICAgICAgICogIGBgYFxuICAgICAgICogIGNvbGxlY3RSb3V0ZVBhcmFtcyhyb3V0ZXI6IFJvdXRlcikge1xuICAgICAgICogICAgbGV0IHBhcmFtcyA9IHt9O1xuICAgICAgICogICAgbGV0IHN0YWNrOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90W10gPSBbcm91dGVyLnJvdXRlclN0YXRlLnNuYXBzaG90LnJvb3RdO1xuICAgICAgICogICAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDApIHtcbiAgICAgICAqICAgICAgY29uc3Qgcm91dGUgPSBzdGFjay5wb3AoKSE7XG4gICAgICAgKiAgICAgIHBhcmFtcyA9IHsuLi5wYXJhbXMsIC4uLnJvdXRlLnBhcmFtc307XG4gICAgICAgKiAgICAgIHN0YWNrLnB1c2goLi4ucm91dGUuY2hpbGRyZW4pO1xuICAgICAgICogICAgfVxuICAgICAgICogICAgcmV0dXJuIHBhcmFtcztcbiAgICAgICAqICB9XG4gICAgICAgKiAgYGBgXG4gICAgICAgKi9cbiAgICAgIHB1YmxpYyBwYXJhbXM6IFBhcmFtcyxcbiAgICAgIC8qKiBUaGUgcXVlcnkgcGFyYW1ldGVycyBzaGFyZWQgYnkgYWxsIHRoZSByb3V0ZXMgKi9cbiAgICAgIHB1YmxpYyBxdWVyeVBhcmFtczogUGFyYW1zLFxuICAgICAgLyoqIFRoZSBVUkwgZnJhZ21lbnQgc2hhcmVkIGJ5IGFsbCB0aGUgcm91dGVzICovXG4gICAgICBwdWJsaWMgZnJhZ21lbnQ6IHN0cmluZ3xudWxsLFxuICAgICAgLyoqIFRoZSBzdGF0aWMgYW5kIHJlc29sdmVkIGRhdGEgb2YgdGhpcyByb3V0ZSAqL1xuICAgICAgcHVibGljIGRhdGE6IERhdGEsXG4gICAgICAvKiogVGhlIG91dGxldCBuYW1lIG9mIHRoZSByb3V0ZSAqL1xuICAgICAgcHVibGljIG91dGxldDogc3RyaW5nLFxuICAgICAgLyoqIFRoZSBjb21wb25lbnQgb2YgdGhlIHJvdXRlICovXG4gICAgICBwdWJsaWMgY29tcG9uZW50OiBUeXBlPGFueT58bnVsbCwgcm91dGVDb25maWc6IFJvdXRlfG51bGwsIHJlc29sdmU6IFJlc29sdmVEYXRhKSB7XG4gICAgdGhpcy5yb3V0ZUNvbmZpZyA9IHJvdXRlQ29uZmlnO1xuICAgIHRoaXMuX3Jlc29sdmUgPSByZXNvbHZlO1xuICB9XG5cbiAgLyoqIFRoZSByb290IG9mIHRoZSByb3V0ZXIgc3RhdGUgKi9cbiAgZ2V0IHJvb3QoKTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCB7XG4gICAgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLnJvb3Q7XG4gIH1cblxuICAvKiogVGhlIHBhcmVudCBvZiB0aGlzIHJvdXRlIGluIHRoZSByb3V0ZXIgc3RhdGUgdHJlZSAqL1xuICBnZXQgcGFyZW50KCk6IEFjdGl2YXRlZFJvdXRlU25hcHNob3R8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLnBhcmVudCh0aGlzKTtcbiAgfVxuXG4gIC8qKiBUaGUgZmlyc3QgY2hpbGQgb2YgdGhpcyByb3V0ZSBpbiB0aGUgcm91dGVyIHN0YXRlIHRyZWUgKi9cbiAgZ2V0IGZpcnN0Q2hpbGQoKTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdHxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5fcm91dGVyU3RhdGUuZmlyc3RDaGlsZCh0aGlzKTtcbiAgfVxuXG4gIC8qKiBUaGUgY2hpbGRyZW4gb2YgdGhpcyByb3V0ZSBpbiB0aGUgcm91dGVyIHN0YXRlIHRyZWUgKi9cbiAgZ2V0IGNoaWxkcmVuKCk6IEFjdGl2YXRlZFJvdXRlU25hcHNob3RbXSB7XG4gICAgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLmNoaWxkcmVuKHRoaXMpO1xuICB9XG5cbiAgLyoqIFRoZSBwYXRoIGZyb20gdGhlIHJvb3Qgb2YgdGhlIHJvdXRlciBzdGF0ZSB0cmVlIHRvIHRoaXMgcm91dGUgKi9cbiAgZ2V0IHBhdGhGcm9tUm9vdCgpOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90W10ge1xuICAgIHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5wYXRoRnJvbVJvb3QodGhpcyk7XG4gIH1cblxuICBnZXQgcGFyYW1NYXAoKTogUGFyYW1NYXAge1xuICAgIGlmICghdGhpcy5fcGFyYW1NYXApIHtcbiAgICAgIHRoaXMuX3BhcmFtTWFwID0gY29udmVydFRvUGFyYW1NYXAodGhpcy5wYXJhbXMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcGFyYW1NYXA7XG4gIH1cblxuICBnZXQgcXVlcnlQYXJhbU1hcCgpOiBQYXJhbU1hcCB7XG4gICAgaWYgKCF0aGlzLl9xdWVyeVBhcmFtTWFwKSB7XG4gICAgICB0aGlzLl9xdWVyeVBhcmFtTWFwID0gY29udmVydFRvUGFyYW1NYXAodGhpcy5xdWVyeVBhcmFtcyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9xdWVyeVBhcmFtTWFwO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLnVybC5tYXAoc2VnbWVudCA9PiBzZWdtZW50LnRvU3RyaW5nKCkpLmpvaW4oJy8nKTtcbiAgICBjb25zdCBtYXRjaGVkID0gdGhpcy5yb3V0ZUNvbmZpZyA/IHRoaXMucm91dGVDb25maWcucGF0aCA6ICcnO1xuICAgIHJldHVybiBgUm91dGUodXJsOicke3VybH0nLCBwYXRoOicke21hdGNoZWR9JylgO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgc3RhdGUgb2YgdGhlIHJvdXRlciBhdCBhIG1vbWVudCBpbiB0aW1lLlxuICpcbiAqIFRoaXMgaXMgYSB0cmVlIG9mIGFjdGl2YXRlZCByb3V0ZSBzbmFwc2hvdHMuIEV2ZXJ5IG5vZGUgaW4gdGhpcyB0cmVlIGtub3dzIGFib3V0XG4gKiB0aGUgXCJjb25zdW1lZFwiIFVSTCBzZWdtZW50cywgdGhlIGV4dHJhY3RlZCBwYXJhbWV0ZXJzLCBhbmQgdGhlIHJlc29sdmVkIGRhdGEuXG4gKlxuICogVGhlIGZvbGxvd2luZyBleGFtcGxlIHNob3dzIGhvdyBhIGNvbXBvbmVudCBpcyBpbml0aWFsaXplZCB3aXRoIGluZm9ybWF0aW9uXG4gKiBmcm9tIHRoZSBzbmFwc2hvdCBvZiB0aGUgcm9vdCBub2RlJ3Mgc3RhdGUgYXQgdGhlIHRpbWUgb2YgY3JlYXRpb24uXG4gKlxuICogYGBgXG4gKiBAQ29tcG9uZW50KHt0ZW1wbGF0ZVVybDondGVtcGxhdGUuaHRtbCd9KVxuICogY2xhc3MgTXlDb21wb25lbnQge1xuICogICBjb25zdHJ1Y3Rvcihyb3V0ZXI6IFJvdXRlcikge1xuICogICAgIGNvbnN0IHN0YXRlOiBSb3V0ZXJTdGF0ZSA9IHJvdXRlci5yb3V0ZXJTdGF0ZTtcbiAqICAgICBjb25zdCBzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCA9IHN0YXRlLnNuYXBzaG90O1xuICogICAgIGNvbnN0IHJvb3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QgPSBzbmFwc2hvdC5yb290O1xuICogICAgIGNvbnN0IGNoaWxkID0gcm9vdC5maXJzdENoaWxkO1xuICogICAgIGNvbnN0IGlkOiBPYnNlcnZhYmxlPHN0cmluZz4gPSBjaGlsZC5wYXJhbXMubWFwKHAgPT4gcC5pZCk7XG4gKiAgICAgLy8uLi5cbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgUm91dGVyU3RhdGVTbmFwc2hvdCBleHRlbmRzIFRyZWU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4ge1xuICAvKiogQGludGVybmFsICovXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIFRoZSB1cmwgZnJvbSB3aGljaCB0aGlzIHNuYXBzaG90IHdhcyBjcmVhdGVkICovXG4gICAgICBwdWJsaWMgdXJsOiBzdHJpbmcsIHJvb3Q6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KSB7XG4gICAgc3VwZXIocm9vdCk7XG4gICAgc2V0Um91dGVyU3RhdGUoPFJvdXRlclN0YXRlU25hcHNob3Q+dGhpcywgcm9vdCk7XG4gIH1cblxuICBvdmVycmlkZSB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBzZXJpYWxpemVOb2RlKHRoaXMuX3Jvb3QpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNldFJvdXRlclN0YXRlPFUsIFQgZXh0ZW5kcyB7X3JvdXRlclN0YXRlOiBVfT4oc3RhdGU6IFUsIG5vZGU6IFRyZWVOb2RlPFQ+KTogdm9pZCB7XG4gIG5vZGUudmFsdWUuX3JvdXRlclN0YXRlID0gc3RhdGU7XG4gIG5vZGUuY2hpbGRyZW4uZm9yRWFjaChjID0+IHNldFJvdXRlclN0YXRlKHN0YXRlLCBjKSk7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZU5vZGUobm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4pOiBzdHJpbmcge1xuICBjb25zdCBjID0gbm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwID8gYCB7ICR7bm9kZS5jaGlsZHJlbi5tYXAoc2VyaWFsaXplTm9kZSkuam9pbignLCAnKX0gfSBgIDogJyc7XG4gIHJldHVybiBgJHtub2RlLnZhbHVlfSR7Y31gO1xufVxuXG4vKipcbiAqIFRoZSBleHBlY3RhdGlvbiBpcyB0aGF0IHRoZSBhY3RpdmF0ZSByb3V0ZSBpcyBjcmVhdGVkIHdpdGggdGhlIHJpZ2h0IHNldCBvZiBwYXJhbWV0ZXJzLlxuICogU28gd2UgcHVzaCBuZXcgdmFsdWVzIGludG8gdGhlIG9ic2VydmFibGVzIG9ubHkgd2hlbiB0aGV5IGFyZSBub3QgdGhlIGluaXRpYWwgdmFsdWVzLlxuICogQW5kIHdlIGRldGVjdCB0aGF0IGJ5IGNoZWNraW5nIGlmIHRoZSBzbmFwc2hvdCBmaWVsZCBpcyBzZXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZHZhbmNlQWN0aXZhdGVkUm91dGUocm91dGU6IEFjdGl2YXRlZFJvdXRlKTogdm9pZCB7XG4gIGlmIChyb3V0ZS5zbmFwc2hvdCkge1xuICAgIGNvbnN0IGN1cnJlbnRTbmFwc2hvdCA9IHJvdXRlLnNuYXBzaG90O1xuICAgIGNvbnN0IG5leHRTbmFwc2hvdCA9IHJvdXRlLl9mdXR1cmVTbmFwc2hvdDtcbiAgICByb3V0ZS5zbmFwc2hvdCA9IG5leHRTbmFwc2hvdDtcbiAgICBpZiAoIXNoYWxsb3dFcXVhbChjdXJyZW50U25hcHNob3QucXVlcnlQYXJhbXMsIG5leHRTbmFwc2hvdC5xdWVyeVBhcmFtcykpIHtcbiAgICAgIHJvdXRlLnF1ZXJ5UGFyYW1zU3ViamVjdC5uZXh0KG5leHRTbmFwc2hvdC5xdWVyeVBhcmFtcyk7XG4gICAgfVxuICAgIGlmIChjdXJyZW50U25hcHNob3QuZnJhZ21lbnQgIT09IG5leHRTbmFwc2hvdC5mcmFnbWVudCkge1xuICAgICAgcm91dGUuZnJhZ21lbnRTdWJqZWN0Lm5leHQobmV4dFNuYXBzaG90LmZyYWdtZW50KTtcbiAgICB9XG4gICAgaWYgKCFzaGFsbG93RXF1YWwoY3VycmVudFNuYXBzaG90LnBhcmFtcywgbmV4dFNuYXBzaG90LnBhcmFtcykpIHtcbiAgICAgIHJvdXRlLnBhcmFtc1N1YmplY3QubmV4dChuZXh0U25hcHNob3QucGFyYW1zKTtcbiAgICB9XG4gICAgaWYgKCFzaGFsbG93RXF1YWxBcnJheXMoY3VycmVudFNuYXBzaG90LnVybCwgbmV4dFNuYXBzaG90LnVybCkpIHtcbiAgICAgIHJvdXRlLnVybFN1YmplY3QubmV4dChuZXh0U25hcHNob3QudXJsKTtcbiAgICB9XG4gICAgaWYgKCFzaGFsbG93RXF1YWwoY3VycmVudFNuYXBzaG90LmRhdGEsIG5leHRTbmFwc2hvdC5kYXRhKSkge1xuICAgICAgcm91dGUuZGF0YVN1YmplY3QubmV4dChuZXh0U25hcHNob3QuZGF0YSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJvdXRlLnNuYXBzaG90ID0gcm91dGUuX2Z1dHVyZVNuYXBzaG90O1xuXG4gICAgLy8gdGhpcyBpcyBmb3IgcmVzb2x2ZWQgZGF0YVxuICAgIHJvdXRlLmRhdGFTdWJqZWN0Lm5leHQocm91dGUuX2Z1dHVyZVNuYXBzaG90LmRhdGEpO1xuICB9XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsUGFyYW1zQW5kVXJsU2VnbWVudHMoXG4gICAgYTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgYjogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IGJvb2xlYW4ge1xuICBjb25zdCBlcXVhbFVybFBhcmFtcyA9IHNoYWxsb3dFcXVhbChhLnBhcmFtcywgYi5wYXJhbXMpICYmIGVxdWFsU2VnbWVudHMoYS51cmwsIGIudXJsKTtcbiAgY29uc3QgcGFyZW50c01pc21hdGNoID0gIWEucGFyZW50ICE9PSAhYi5wYXJlbnQ7XG5cbiAgcmV0dXJuIGVxdWFsVXJsUGFyYW1zICYmICFwYXJlbnRzTWlzbWF0Y2ggJiZcbiAgICAgICghYS5wYXJlbnQgfHwgZXF1YWxQYXJhbXNBbmRVcmxTZWdtZW50cyhhLnBhcmVudCwgYi5wYXJlbnQhKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNTdGF0aWNUaXRsZShjb25maWc6IFJvdXRlKSB7XG4gIHJldHVybiB0eXBlb2YgY29uZmlnLnRpdGxlID09PSAnc3RyaW5nJyB8fCBjb25maWcudGl0bGUgPT09IG51bGw7XG59XG4iXX0=