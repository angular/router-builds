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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3N0YXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXJfc3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUFDLGVBQWUsRUFBYyxFQUFFLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDckQsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBR25DLE9BQU8sRUFBQyxpQkFBaUIsRUFBb0IsY0FBYyxFQUFFLGFBQWEsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM1RixPQUFPLEVBQUMsYUFBYSxFQUFFLFVBQVUsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUNyRCxPQUFPLEVBQUMsWUFBWSxFQUFFLGtCQUFrQixFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDcEUsT0FBTyxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFFNUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQThCRztBQUNILE1BQU0sT0FBTyxXQUFZLFNBQVEsSUFBb0I7SUFDbkQsZ0JBQWdCO0lBQ2hCLFlBQ0ksSUFBOEI7SUFDOUIsK0NBQStDO0lBQ3hDLFFBQTZCO1FBQ3RDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQURILGFBQVEsR0FBUixRQUFRLENBQXFCO1FBRXRDLGNBQWMsQ0FBYyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVRLFFBQVE7UUFDZixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDbEMsQ0FBQztDQUNGO0FBRUQsTUFBTSxVQUFVLGdCQUFnQixDQUFDLGFBQTZCO0lBQzVELE1BQU0sUUFBUSxHQUFHLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3pELE1BQU0sUUFBUSxHQUFHLElBQUksZUFBZSxDQUFDLENB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WUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3pDO1FBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMxRCxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDM0M7S0FDRjtTQUFNO1FBQ0wsS0FBSyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDO1FBRXZDLDRCQUE0QjtRQUM1QixLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3BEO0FBQ0gsQ0FBQztBQUdELE1BQU0sVUFBVSx5QkFBeUIsQ0FDckMsQ0FBeUIsRUFBRSxDQUF5QjtJQUN0RCxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZGLE1BQU0sZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFFaEQsT0FBTyxjQUFjLElBQUksQ0FBQyxlQUFlO1FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU8sQ0FBQyxDQUFDLENBQUM7QUFDcEUsQ0FBQztBQUVELE1BQU0sVUFBVSxjQUFjLENBQUMsTUFBYTtJQUMxQyxPQUFPLE9BQU8sTUFBTSxDQUFDLEtBQUssS0FBSyxRQUFRLElBQUksTUFBTSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUM7QUFDbkUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1R5cGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtCZWhhdmlvclN1YmplY3QsIE9ic2VydmFibGUsIG9mfSBmcm9tICdyeGpzJztcbmltcG9ydCB7bWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7RGF0YSwgUmVzb2x2ZURhdGEsIFJvdXRlfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge2NvbnZlcnRUb1BhcmFtTWFwLCBQYXJhbU1hcCwgUGFyYW1zLCBQUklNQVJZX09VVExFVCwgUm91dGVUaXRsZUtleX0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtlcXVhbFNlZ21lbnRzLCBVcmxTZWdtZW50fSBmcm9tICcuL3VybF90cmVlJztcbmltcG9ydCB7c2hhbGxvd0VxdWFsLCBzaGFsbG93RXF1YWxBcnJheXN9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge1RyZWUsIFRyZWVOb2RlfSBmcm9tICcuL3V0aWxzL3RyZWUnO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHN0YXRlIG9mIHRoZSByb3V0ZXIgYXMgYSB0cmVlIG9mIGFjdGl2YXRlZCByb3V0ZXMuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBFdmVyeSBub2RlIGluIHRoZSByb3V0ZSB0cmVlIGlzIGFuIGBBY3RpdmF0ZWRSb3V0ZWAgaW5zdGFuY2VcbiAqIHRoYXQga25vd3MgYWJvdXQgdGhlIFwiY29uc3VtZWRcIiBVUkwgc2VnbWVudHMsIHRoZSBleHRyYWN0ZWQgcGFyYW1ldGVycyxcbiAqIGFuZCB0aGUgcmVzb2x2ZWQgZGF0YS5cbiAqIFVzZSB0aGUgYEFjdGl2YXRlZFJvdXRlYCBwcm9wZXJ0aWVzIHRvIHRyYXZlcnNlIHRoZSB0cmVlIGZyb20gYW55IG5vZGUuXG4gKlxuICogVGhlIGZvbGxvd2luZyBmcmFnbWVudCBzaG93cyBob3cgYSBjb21wb25lbnQgZ2V0cyB0aGUgcm9vdCBub2RlXG4gKiBvZiB0aGUgY3VycmVudCBzdGF0ZSB0byBlc3RhYmxpc2ggaXRzIG93biByb3V0ZSB0cmVlOlxuICpcbiAqIGBgYFxuICogQENvbXBvbmVudCh7dGVtcGxhdGVVcmw6J3RlbXBsYXRlLmh0bWwnfSlcbiAqIGNsYXNzIE15Q29tcG9uZW50IHtcbiAqICAgY29uc3RydWN0b3Iocm91dGVyOiBSb3V0ZXIpIHtcbiAqICAgICBjb25zdCBzdGF0ZTogUm91dGVyU3RhdGUgPSByb3V0ZXIucm91dGVyU3RhdGU7XG4gKiAgICAgY29uc3Qgcm9vdDogQWN0aXZhdGVkUm91dGUgPSBzdGF0ZS5yb290O1xuICogICAgIGNvbnN0IGNoaWxkID0gcm9vdC5maXJzdENoaWxkO1xuICogICAgIGNvbnN0IGlkOiBPYnNlcnZhYmxlPHN0cmluZz4gPSBjaGlsZC5wYXJhbXMubWFwKHAgPT4gcC5pZCk7XG4gKiAgICAgLy8uLi5cbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICogQHNlZSB7QGxpbmsgQWN0aXZhdGVkUm91dGV9XG4gKiBAc2VlIFtHZXR0aW5nIHJvdXRlIGluZm9ybWF0aW9uXShndWlkZS9yb3V0ZXIjZ2V0dGluZy1yb3V0ZS1pbmZvcm1hdGlvbilcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZXJTdGF0ZSBleHRlbmRzIFRyZWU8QWN0aXZhdGVkUm91dGU+IHtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJvb3Q6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPixcbiAgICAgIC8qKiBUaGUgY3VycmVudCBzbmFwc2hvdCBvZiB0aGUgcm91dGVyIHN0YXRlICovXG4gICAgICBwdWJsaWMgc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QpIHtcbiAgICBzdXBlcihyb290KTtcbiAgICBzZXRSb3V0ZXJTdGF0ZSg8Um91dGVyU3RhdGU+dGhpcywgcm9vdCk7XG4gIH1cblxuICBvdmVycmlkZSB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnNuYXBzaG90LnRvU3RyaW5nKCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVtcHR5U3RhdGUocm9vdENvbXBvbmVudDogVHlwZTxhbnk+fG51bGwpOiBSb3V0ZXJTdGF0ZSB7XG4gIGNvbnN0IHNuYXBzaG90ID0gY3JlYXRlRW1wdHlTdGF0ZVNuYXBzaG90KHJvb3RDb21wb25lbnQpO1xuICBjb25zdCBlbXB0eVVybCA9IG5ldyBCZWhhdmlvclN1YmplY3QoW25ldyBVcmxTZWdtZW50KCcnLCB7fSldKTtcbiAgY29uc3QgZW1wdHlQYXJhbXMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0KHt9KTtcbiAgY29uc3QgZW1wdHlEYXRhID0gbmV3IEJlaGF2aW9yU3ViamVjdCh7fSk7XG4gIGNvbnN0IGVtcHR5UXVlcnlQYXJhbXMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0KHt9KTtcbiAgY29uc3QgZnJhZ21lbnQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PHN0cmluZ3xudWxsPignJyk7XG4gIGNvbnN0IGFjdGl2YXRlZCA9IG5ldyBBY3RpdmF0ZWRSb3V0ZShcbiAgICAgIGVtcHR5VXJsLCBlbXB0eVBhcmFtcywgZW1wdHlRdWVyeVBhcmFtcywgZnJhZ21lbnQsIGVtcHR5RGF0YSwgUFJJTUFSWV9PVVRMRVQsIHJvb3RDb21wb25lbnQsXG4gICAgICBzbmFwc2hvdC5yb290KTtcbiAgYWN0aXZhdGVkLnNuYXBzaG90ID0gc25hcHNob3Qucm9vdDtcbiAgcmV0dXJuIG5ldyBSb3V0ZXJTdGF0ZShuZXcgVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+KGFjdGl2YXRlZCwgW10pLCBzbmFwc2hvdCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbXB0eVN0YXRlU25hcHNob3Qocm9vdENvbXBvbmVudDogVHlwZTxhbnk+fG51bGwpOiBSb3V0ZXJTdGF0ZVNuYXBzaG90IHtcbiAgY29uc3QgZW1wdHlQYXJhbXMgPSB7fTtcbiAgY29uc3QgZW1wdHlEYXRhID0ge307XG4gIGNvbnN0IGVtcHR5UXVlcnlQYXJhbXMgPSB7fTtcbiAgY29uc3QgZnJhZ21lbnQgPSAnJztcbiAgY29uc3QgYWN0aXZhdGVkID0gbmV3IEFjdGl2YXRlZFJvdXRlU25hcHNob3QoXG4gICAgICBbXSwgZW1wdHlQYXJhbXMsIGVtcHR5UXVlcnlQYXJhbXMsIGZyYWdtZW50LCBlbXB0eURhdGEsIFBSSU1BUllfT1VUTEVULCByb290Q29tcG9uZW50LCBudWxsLFxuICAgICAge30pO1xuICByZXR1cm4gbmV3IFJvdXRlclN0YXRlU25hcHNob3QoJycsIG5ldyBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PihhY3RpdmF0ZWQsIFtdKSk7XG59XG5cbi8qKlxuICogUHJvdmlkZXMgYWNjZXNzIHRvIGluZm9ybWF0aW9uIGFib3V0IGEgcm91dGUgYXNzb2NpYXRlZCB3aXRoIGEgY29tcG9uZW50XG4gKiB0aGF0IGlzIGxvYWRlZCBpbiBhbiBvdXRsZXQuXG4gKiBVc2UgdG8gdHJhdmVyc2UgdGhlIGBSb3V0ZXJTdGF0ZWAgdHJlZSBhbmQgZXh0cmFjdCBpbmZvcm1hdGlvbiBmcm9tIG5vZGVzLlxuICpcbiAqIFRoZSBmb2xsb3dpbmcgZXhhbXBsZSBzaG93cyBob3cgdG8gY29uc3RydWN0IGEgY29tcG9uZW50IHVzaW5nIGluZm9ybWF0aW9uIGZyb20gYVxuICogY3VycmVudGx5IGFjdGl2YXRlZCByb3V0ZS5cbiAqXG4gKiBOb3RlOiB0aGUgb2JzZXJ2YWJsZXMgaW4gdGhpcyBjbGFzcyBvbmx5IGVtaXQgd2hlbiB0aGUgY3VycmVudCBhbmQgcHJldmlvdXMgdmFsdWVzIGRpZmZlciBiYXNlZFxuICogb24gc2hhbGxvdyBlcXVhbGl0eS4gRm9yIGV4YW1wbGUsIGNoYW5naW5nIGRlZXBseSBuZXN0ZWQgcHJvcGVydGllcyBpbiByZXNvbHZlZCBgZGF0YWAgd2lsbCBub3RcbiAqIGNhdXNlIHRoZSBgQWN0aXZhdGVkUm91dGUuZGF0YWAgYE9ic2VydmFibGVgIHRvIGVtaXQgYSBuZXcgdmFsdWUuXG4gKlxuICoge0BleGFtcGxlIHJvdXRlci9hY3RpdmF0ZWQtcm91dGUvbW9kdWxlLnRzIHJlZ2lvbj1cImFjdGl2YXRlZC1yb3V0ZVwiXG4gKiAgICAgaGVhZGVyPVwiYWN0aXZhdGVkLXJvdXRlLmNvbXBvbmVudC50c1wifVxuICpcbiAqIEBzZWUgW0dldHRpbmcgcm91dGUgaW5mb3JtYXRpb25dKGd1aWRlL3JvdXRlciNnZXR0aW5nLXJvdXRlLWluZm9ybWF0aW9uKVxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIEFjdGl2YXRlZFJvdXRlIHtcbiAgLyoqIFRoZSBjdXJyZW50IHNuYXBzaG90IG9mIHRoaXMgcm91dGUgKi9cbiAgc25hcHNob3QhOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90O1xuICAvKiogQGludGVybmFsICovXG4gIF9mdXR1cmVTbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfcm91dGVyU3RhdGUhOiBSb3V0ZXJTdGF0ZTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfcGFyYW1NYXA/OiBPYnNlcnZhYmxlPFBhcmFtTWFwPjtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfcXVlcnlQYXJhbU1hcD86IE9ic2VydmFibGU8UGFyYW1NYXA+O1xuXG4gIC8qKiBBbiBPYnNlcnZhYmxlIG9mIHRoZSByZXNvbHZlZCByb3V0ZSB0aXRsZSAqL1xuICByZWFkb25seSB0aXRsZTogT2JzZXJ2YWJsZTxzdHJpbmd8dW5kZWZpbmVkPjtcblxuICAvKiogQW4gb2JzZXJ2YWJsZSBvZiB0aGUgVVJMIHNlZ21lbnRzIG1hdGNoZWQgYnkgdGhpcyByb3V0ZS4gKi9cbiAgcHVibGljIHVybDogT2JzZXJ2YWJsZTxVcmxTZWdtZW50W10+O1xuICAvKiogQW4gb2JzZXJ2YWJsZSBvZiB0aGUgbWF0cml4IHBhcmFtZXRlcnMgc2NvcGVkIHRvIHRoaXMgcm91dGUuICovXG4gIHB1YmxpYyBwYXJhbXM6IE9ic2VydmFibGU8UGFyYW1zPjtcbiAgLyoqIEFuIG9ic2VydmFibGUgb2YgdGhlIHF1ZXJ5IHBhcmFtZXRlcnMgc2hhcmVkIGJ5IGFsbCB0aGUgcm91dGVzLiAqL1xuICBwdWJsaWMgcXVlcnlQYXJhbXM6IE9ic2VydmFibGU8UGFyYW1zPjtcbiAgLyoqIEFuIG9ic2VydmFibGUgb2YgdGhlIFVSTCBmcmFnbWVudCBzaGFyZWQgYnkgYWxsIHRoZSByb3V0ZXMuICovXG4gIHB1YmxpYyBmcmFnbWVudDogT2JzZXJ2YWJsZTxzdHJpbmd8bnVsbD47XG4gIC8qKiBBbiBvYnNlcnZhYmxlIG9mIHRoZSBzdGF0aWMgYW5kIHJlc29sdmVkIGRhdGEgb2YgdGhpcyByb3V0ZS4gKi9cbiAgcHVibGljIGRhdGE6IE9ic2VydmFibGU8RGF0YT47XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICAgIHB1YmxpYyB1cmxTdWJqZWN0OiBCZWhhdmlvclN1YmplY3Q8VXJsU2VnbWVudFtdPixcbiAgICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICAgIHB1YmxpYyBwYXJhbXNTdWJqZWN0OiBCZWhhdmlvclN1YmplY3Q8UGFyYW1zPixcbiAgICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICAgIHB1YmxpYyBxdWVyeVBhcmFtc1N1YmplY3Q6IEJlaGF2aW9yU3ViamVjdDxQYXJhbXM+LFxuICAgICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgICAgcHVibGljIGZyYWdtZW50U3ViamVjdDogQmVoYXZpb3JTdWJqZWN0PHN0cmluZ3xudWxsPixcbiAgICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICAgIHB1YmxpYyBkYXRhU3ViamVjdDogQmVoYXZpb3JTdWJqZWN0PERhdGE+LFxuICAgICAgLyoqIFRoZSBvdXRsZXQgbmFtZSBvZiB0aGUgcm91dGUsIGEgY29uc3RhbnQuICovXG4gICAgICBwdWJsaWMgb3V0bGV0OiBzdHJpbmcsXG4gICAgICAvKiogVGhlIGNvbXBvbmVudCBvZiB0aGUgcm91dGUsIGEgY29uc3RhbnQuICovXG4gICAgICBwdWJsaWMgY29tcG9uZW50OiBUeXBlPGFueT58bnVsbCwgZnV0dXJlU25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpIHtcbiAgICB0aGlzLl9mdXR1cmVTbmFwc2hvdCA9IGZ1dHVyZVNuYXBzaG90O1xuICAgIHRoaXMudGl0bGUgPSB0aGlzLmRhdGFTdWJqZWN0Py5waXBlKG1hcCgoZDogRGF0YSkgPT4gZFtSb3V0ZVRpdGxlS2V5XSkpID8/IG9mKHVuZGVmaW5lZCk7XG4gICAgLy8gVE9ETyhhdHNjb3R0KTogVmVyaWZ5IHRoYXQgdGhlc2UgY2FuIGJlIGNoYW5nZWQgdG8gYC5hc09ic2VydmFibGUoKWAgd2l0aCBUR1AuXG4gICAgdGhpcy51cmwgPSB1cmxTdWJqZWN0O1xuICAgIHRoaXMucGFyYW1zID0gcGFyYW1zU3ViamVjdDtcbiAgICB0aGlzLnF1ZXJ5UGFyYW1zID0gcXVlcnlQYXJhbXNTdWJqZWN0O1xuICAgIHRoaXMuZnJhZ21lbnQgPSBmcmFnbWVudFN1YmplY3Q7XG4gICAgdGhpcy5kYXRhID0gZGF0YVN1YmplY3Q7XG4gIH1cblxuICAvKiogVGhlIGNvbmZpZ3VyYXRpb24gdXNlZCB0byBtYXRjaCB0aGlzIHJvdXRlLiAqL1xuICBnZXQgcm91dGVDb25maWcoKTogUm91dGV8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuX2Z1dHVyZVNuYXBzaG90LnJvdXRlQ29uZmlnO1xuICB9XG5cbiAgLyoqIFRoZSByb290IG9mIHRoZSByb3V0ZXIgc3RhdGUuICovXG4gIGdldCByb290KCk6IEFjdGl2YXRlZFJvdXRlIHtcbiAgICByZXR1cm4gdGhpcy5fcm91dGVyU3RhdGUucm9vdDtcbiAgfVxuXG4gIC8qKiBUaGUgcGFyZW50IG9mIHRoaXMgcm91dGUgaW4gdGhlIHJvdXRlciBzdGF0ZSB0cmVlLiAqL1xuICBnZXQgcGFyZW50KCk6IEFjdGl2YXRlZFJvdXRlfG51bGwge1xuICAgIHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5wYXJlbnQodGhpcyk7XG4gIH1cblxuICAvKiogVGhlIGZpcnN0IGNoaWxkIG9mIHRoaXMgcm91dGUgaW4gdGhlIHJvdXRlciBzdGF0ZSB0cmVlLiAqL1xuICBnZXQgZmlyc3RDaGlsZCgpOiBBY3RpdmF0ZWRSb3V0ZXxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5fcm91dGVyU3RhdGUuZmlyc3RDaGlsZCh0aGlzKTtcbiAgfVxuXG4gIC8qKiBUaGUgY2hpbGRyZW4gb2YgdGhpcyByb3V0ZSBpbiB0aGUgcm91dGVyIHN0YXRlIHRyZWUuICovXG4gIGdldCBjaGlsZHJlbigpOiBBY3RpdmF0ZWRSb3V0ZVtdIHtcbiAgICByZXR1cm4gdGhpcy5fcm91dGVyU3RhdGUuY2hpbGRyZW4odGhpcyk7XG4gIH1cblxuICAvKiogVGhlIHBhdGggZnJvbSB0aGUgcm9vdCBvZiB0aGUgcm91dGVyIHN0YXRlIHRyZWUgdG8gdGhpcyByb3V0ZS4gKi9cbiAgZ2V0IHBhdGhGcm9tUm9vdCgpOiBBY3RpdmF0ZWRSb3V0ZVtdIHtcbiAgICByZXR1cm4gdGhpcy5fcm91dGVyU3RhdGUucGF0aEZyb21Sb290KHRoaXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFuIE9ic2VydmFibGUgdGhhdCBjb250YWlucyBhIG1hcCBvZiB0aGUgcmVxdWlyZWQgYW5kIG9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICogc3BlY2lmaWMgdG8gdGhlIHJvdXRlLlxuICAgKiBUaGUgbWFwIHN1cHBvcnRzIHJldHJpZXZpbmcgc2luZ2xlIGFuZCBtdWx0aXBsZSB2YWx1ZXMgZnJvbSB0aGUgc2FtZSBwYXJhbWV0ZXIuXG4gICAqL1xuICBnZXQgcGFyYW1NYXAoKTogT2JzZXJ2YWJsZTxQYXJhbU1hcD4ge1xuICAgIGlmICghdGhpcy5fcGFyYW1NYXApIHtcbiAgICAgIHRoaXMuX3BhcmFtTWFwID0gdGhpcy5wYXJhbXMucGlwZShtYXAoKHA6IFBhcmFtcyk6IFBhcmFtTWFwID0+IGNvbnZlcnRUb1BhcmFtTWFwKHApKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9wYXJhbU1hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbiBPYnNlcnZhYmxlIHRoYXQgY29udGFpbnMgYSBtYXAgb2YgdGhlIHF1ZXJ5IHBhcmFtZXRlcnMgYXZhaWxhYmxlIHRvIGFsbCByb3V0ZXMuXG4gICAqIFRoZSBtYXAgc3VwcG9ydHMgcmV0cmlldmluZyBzaW5nbGUgYW5kIG11bHRpcGxlIHZhbHVlcyBmcm9tIHRoZSBxdWVyeSBwYXJhbWV0ZXIuXG4gICAqL1xuICBnZXQgcXVlcnlQYXJhbU1hcCgpOiBPYnNlcnZhYmxlPFBhcmFtTWFwPiB7XG4gICAgaWYgKCF0aGlzLl9xdWVyeVBhcmFtTWFwKSB7XG4gICAgICB0aGlzLl9xdWVyeVBhcmFtTWFwID1cbiAgICAgICAgICB0aGlzLnF1ZXJ5UGFyYW1zLnBpcGUobWFwKChwOiBQYXJhbXMpOiBQYXJhbU1hcCA9PiBjb252ZXJ0VG9QYXJhbU1hcChwKSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcXVlcnlQYXJhbU1hcDtcbiAgfVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuc25hcHNob3QgPyB0aGlzLnNuYXBzaG90LnRvU3RyaW5nKCkgOiBgRnV0dXJlKCR7dGhpcy5fZnV0dXJlU25hcHNob3R9KWA7XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUgUGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSA9ICdlbXB0eU9ubHknfCdhbHdheXMnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBJbmhlcml0ZWQgPSB7XG4gIHBhcmFtczogUGFyYW1zLFxuICBkYXRhOiBEYXRhLFxuICByZXNvbHZlOiBEYXRhLFxufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBpbmhlcml0ZWQgcGFyYW1zLCBkYXRhLCBhbmQgcmVzb2x2ZSBmb3IgYSBnaXZlbiByb3V0ZS5cbiAqXG4gKiBCeSBkZWZhdWx0LCB3ZSBkbyBub3QgaW5oZXJpdCBwYXJlbnQgZGF0YSB1bmxlc3MgdGhlIGN1cnJlbnQgcm91dGUgaXMgcGF0aC1sZXNzIG9yIHRoZSBwYXJlbnRcbiAqIHJvdXRlIGlzIGNvbXBvbmVudC1sZXNzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0SW5oZXJpdGVkKFxuICAgIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBwYXJlbnQ6IEFjdGl2YXRlZFJvdXRlU25hcHNob3R8bnVsbCxcbiAgICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiBQYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5ID0gJ2VtcHR5T25seScpOiBJbmhlcml0ZWQge1xuICBsZXQgaW5oZXJpdGVkOiBJbmhlcml0ZWQ7XG4gIGNvbnN0IHtyb3V0ZUNvbmZpZ30gPSByb3V0ZTtcbiAgaWYgKHBhcmVudCAhPT0gbnVsbCAmJlxuICAgICAgKHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kgPT09ICdhbHdheXMnIHx8XG4gICAgICAgLy8gaW5oZXJpdCBwYXJlbnQgZGF0YSBpZiByb3V0ZSBpcyBlbXB0eSBwYXRoXG4gICAgICAgcm91dGVDb25maWc/LnBhdGggPT09ICcnIHx8XG4gICAgICAgLy8gaW5oZXJpdCBwYXJlbnQgZGF0YSBpZiBwYXJlbnQgd2FzIGNvbXBvbmVudGxlc3NcbiAgICAgICAoIXBhcmVudC5jb21wb25lbnQgJiYgIXBhcmVudC5yb3V0ZUNvbmZpZz8ubG9hZENvbXBvbmVudCkpKSB7XG4gICAgaW5oZXJpdGVkID0ge1xuICAgICAgcGFyYW1zOiB7Li4ucGFyZW50LnBhcmFtcywgLi4ucm91dGUucGFyYW1zfSxcbiAgICAgIGRhdGE6IHsuLi5wYXJlbnQuZGF0YSwgLi4ucm91dGUuZGF0YX0sXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIC8vIFNuYXBzaG90cyBhcmUgY3JlYXRlZCB3aXRoIGRhdGEgaW5oZXJpdGVkIGZyb20gcGFyZW50IGFuZCBndWFyZHMgKGkuZS4gY2FuQWN0aXZhdGUpIGNhblxuICAgICAgICAvLyBjaGFuZ2UgZGF0YSBiZWNhdXNlIGl0J3Mgbm90IGZyb3plbi4uLlxuICAgICAgICAvLyBUaGlzIGZpcnN0IGxpbmUgY291bGQgYmUgZGVsZXRlZCBjaG9zZSB0byBicmVhay9kaXNhbGxvdyBtdXRhdGluZyB0aGUgYGRhdGFgIG9iamVjdCBpblxuICAgICAgICAvLyBndWFyZHMuXG4gICAgICAgIC8vIE5vdGUgdGhhdCBkYXRhIGZyb20gcGFyZW50cyBzdGlsbCBvdmVycmlkZSB0aGlzIG11dGF0ZWQgZGF0YSBzbyBhbnlvbmUgcmVseWluZyBvbiB0aGlzXG4gICAgICAgIC8vIG1pZ2h0IGJlIHN1cnByaXNlZCB0aGF0IGl0IGRvZXNuJ3Qgd29yayBpZiBwYXJlbnQgZGF0YSBpcyBpbmhlcml0ZWQgYnV0IG90aGVyd2lzZSBkb2VzLlxuICAgICAgICAuLi5yb3V0ZS5kYXRhLFxuICAgICAgICAvLyBFbnN1cmUgaW5oZXJpdGVkIHJlc29sdmVkIGRhdGEgb3ZlcnJpZGVzIGluaGVyaXRlZCBzdGF0aWMgZGF0YVxuICAgICAgICAuLi5wYXJlbnQuZGF0YSxcbiAgICAgICAgLy8gc3RhdGljIGRhdGEgZnJvbSB0aGUgY3VycmVudCByb3V0ZSBvdmVycmlkZXMgYW55IGluaGVyaXRlZCBkYXRhXG4gICAgICAgIC4uLnJvdXRlQ29uZmlnPy5kYXRhLFxuICAgICAgICAvLyByZXNvbHZlZCBkYXRhIGZyb20gY3VycmVudCByb3V0ZSBvdmVycmlkZXMgZXZlcnl0aGluZ1xuICAgICAgICAuLi5yb3V0ZS5fcmVzb2x2ZWREYXRhLFxuICAgICAgfVxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgaW5oZXJpdGVkID0ge1xuICAgICAgcGFyYW1zOiB7Li4ucm91dGUucGFyYW1zfSxcbiAgICAgIGRhdGE6IHsuLi5yb3V0ZS5kYXRhfSxcbiAgICAgIHJlc29sdmU6IHsuLi5yb3V0ZS5kYXRhLCAuLi4ocm91dGUuX3Jlc29sdmVkRGF0YSA/PyB7fSl9XG4gICAgfTtcbiAgfVxuXG4gIGlmIChyb3V0ZUNvbmZpZyAmJiBoYXNTdGF0aWNUaXRsZShyb3V0ZUNvbmZpZykpIHtcbiAgICBpbmhlcml0ZWQucmVzb2x2ZVtSb3V0ZVRpdGxlS2V5XSA9IHJvdXRlQ29uZmlnLnRpdGxlO1xuICB9XG4gIHJldHVybiBpbmhlcml0ZWQ7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQ29udGFpbnMgdGhlIGluZm9ybWF0aW9uIGFib3V0IGEgcm91dGUgYXNzb2NpYXRlZCB3aXRoIGEgY29tcG9uZW50IGxvYWRlZCBpbiBhblxuICogb3V0bGV0IGF0IGEgcGFydGljdWxhciBtb21lbnQgaW4gdGltZS4gQWN0aXZhdGVkUm91dGVTbmFwc2hvdCBjYW4gYWxzbyBiZSB1c2VkIHRvXG4gKiB0cmF2ZXJzZSB0aGUgcm91dGVyIHN0YXRlIHRyZWUuXG4gKlxuICogVGhlIGZvbGxvd2luZyBleGFtcGxlIGluaXRpYWxpemVzIGEgY29tcG9uZW50IHdpdGggcm91dGUgaW5mb3JtYXRpb24gZXh0cmFjdGVkXG4gKiBmcm9tIHRoZSBzbmFwc2hvdCBvZiB0aGUgcm9vdCBub2RlIGF0IHRoZSB0aW1lIG9mIGNyZWF0aW9uLlxuICpcbiAqIGBgYFxuICogQENvbXBvbmVudCh7dGVtcGxhdGVVcmw6Jy4vbXktY29tcG9uZW50Lmh0bWwnfSlcbiAqIGNsYXNzIE15Q29tcG9uZW50IHtcbiAqICAgY29uc3RydWN0b3Iocm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7XG4gKiAgICAgY29uc3QgaWQ6IHN0cmluZyA9IHJvdXRlLnNuYXBzaG90LnBhcmFtcy5pZDtcbiAqICAgICBjb25zdCB1cmw6IHN0cmluZyA9IHJvdXRlLnNuYXBzaG90LnVybC5qb2luKCcnKTtcbiAqICAgICBjb25zdCB1c2VyID0gcm91dGUuc25hcHNob3QuZGF0YS51c2VyO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90IHtcbiAgLyoqIFRoZSBjb25maWd1cmF0aW9uIHVzZWQgdG8gbWF0Y2ggdGhpcyByb3V0ZSAqKi9cbiAgcHVibGljIHJlYWRvbmx5IHJvdXRlQ29uZmlnOiBSb3V0ZXxudWxsO1xuICAvKiogQGludGVybmFsICovXG4gIF9yZXNvbHZlOiBSZXNvbHZlRGF0YTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfcmVzb2x2ZWREYXRhPzogRGF0YTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfcm91dGVyU3RhdGUhOiBSb3V0ZXJTdGF0ZVNuYXBzaG90O1xuICAvKiogQGludGVybmFsICovXG4gIF9wYXJhbU1hcD86IFBhcmFtTWFwO1xuICAvKiogQGludGVybmFsICovXG4gIF9xdWVyeVBhcmFtTWFwPzogUGFyYW1NYXA7XG5cbiAgLyoqIFRoZSByZXNvbHZlZCByb3V0ZSB0aXRsZSAqL1xuICBnZXQgdGl0bGUoKTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgLy8gTm90ZTogVGhpcyBfbXVzdF8gYmUgYSBnZXR0ZXIgYmVjYXVzZSB0aGUgZGF0YSBpcyBtdXRhdGVkIGluIHRoZSByZXNvbHZlcnMuIFRpdGxlIHdpbGwgbm90IGJlXG4gICAgLy8gYXZhaWxhYmxlIGF0IHRoZSB0aW1lIG9mIGNsYXNzIGluc3RhbnRpYXRpb24uXG4gICAgcmV0dXJuIHRoaXMuZGF0YT8uW1JvdXRlVGl0bGVLZXldO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBUaGUgVVJMIHNlZ21lbnRzIG1hdGNoZWQgYnkgdGhpcyByb3V0ZSAqL1xuICAgICAgcHVibGljIHVybDogVXJsU2VnbWVudFtdLFxuICAgICAgLyoqXG4gICAgICAgKiAgVGhlIG1hdHJpeCBwYXJhbWV0ZXJzIHNjb3BlZCB0byB0aGlzIHJvdXRlLlxuICAgICAgICpcbiAgICAgICAqICBZb3UgY2FuIGNvbXB1dGUgYWxsIHBhcmFtcyAob3IgZGF0YSkgaW4gdGhlIHJvdXRlciBzdGF0ZSBvciB0byBnZXQgcGFyYW1zIG91dHNpZGVcbiAgICAgICAqICBvZiBhbiBhY3RpdmF0ZWQgY29tcG9uZW50IGJ5IHRyYXZlcnNpbmcgdGhlIGBSb3V0ZXJTdGF0ZWAgdHJlZSBhcyBpbiB0aGUgZm9sbG93aW5nXG4gICAgICAgKiAgZXhhbXBsZTpcbiAgICAgICAqICBgYGBcbiAgICAgICAqICBjb2xsZWN0Um91dGVQYXJhbXMocm91dGVyOiBSb3V0ZXIpIHtcbiAgICAgICAqICAgIGxldCBwYXJhbXMgPSB7fTtcbiAgICAgICAqICAgIGxldCBzdGFjazogQWN0aXZhdGVkUm91dGVTbmFwc2hvdFtdID0gW3JvdXRlci5yb3V0ZXJTdGF0ZS5zbmFwc2hvdC5yb290XTtcbiAgICAgICAqICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgKiAgICAgIGNvbnN0IHJvdXRlID0gc3RhY2sucG9wKCkhO1xuICAgICAgICogICAgICBwYXJhbXMgPSB7Li4ucGFyYW1zLCAuLi5yb3V0ZS5wYXJhbXN9O1xuICAgICAgICogICAgICBzdGFjay5wdXNoKC4uLnJvdXRlLmNoaWxkcmVuKTtcbiAgICAgICAqICAgIH1cbiAgICAgICAqICAgIHJldHVybiBwYXJhbXM7XG4gICAgICAgKiAgfVxuICAgICAgICogIGBgYFxuICAgICAgICovXG4gICAgICBwdWJsaWMgcGFyYW1zOiBQYXJhbXMsXG4gICAgICAvKiogVGhlIHF1ZXJ5IHBhcmFtZXRlcnMgc2hhcmVkIGJ5IGFsbCB0aGUgcm91dGVzICovXG4gICAgICBwdWJsaWMgcXVlcnlQYXJhbXM6IFBhcmFtcyxcbiAgICAgIC8qKiBUaGUgVVJMIGZyYWdtZW50IHNoYXJlZCBieSBhbGwgdGhlIHJvdXRlcyAqL1xuICAgICAgcHVibGljIGZyYWdtZW50OiBzdHJpbmd8bnVsbCxcbiAgICAgIC8qKiBUaGUgc3RhdGljIGFuZCByZXNvbHZlZCBkYXRhIG9mIHRoaXMgcm91dGUgKi9cbiAgICAgIHB1YmxpYyBkYXRhOiBEYXRhLFxuICAgICAgLyoqIFRoZSBvdXRsZXQgbmFtZSBvZiB0aGUgcm91dGUgKi9cbiAgICAgIHB1YmxpYyBvdXRsZXQ6IHN0cmluZyxcbiAgICAgIC8qKiBUaGUgY29tcG9uZW50IG9mIHRoZSByb3V0ZSAqL1xuICAgICAgcHVibGljIGNvbXBvbmVudDogVHlwZTxhbnk+fG51bGwsIHJvdXRlQ29uZmlnOiBSb3V0ZXxudWxsLCByZXNvbHZlOiBSZXNvbHZlRGF0YSkge1xuICAgIHRoaXMucm91dGVDb25maWcgPSByb3V0ZUNvbmZpZztcbiAgICB0aGlzLl9yZXNvbHZlID0gcmVzb2x2ZTtcbiAgfVxuXG4gIC8qKiBUaGUgcm9vdCBvZiB0aGUgcm91dGVyIHN0YXRlICovXG4gIGdldCByb290KCk6IEFjdGl2YXRlZFJvdXRlU25hcHNob3Qge1xuICAgIHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5yb290O1xuICB9XG5cbiAgLyoqIFRoZSBwYXJlbnQgb2YgdGhpcyByb3V0ZSBpbiB0aGUgcm91dGVyIHN0YXRlIHRyZWUgKi9cbiAgZ2V0IHBhcmVudCgpOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90fG51bGwge1xuICAgIHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5wYXJlbnQodGhpcyk7XG4gIH1cblxuICAvKiogVGhlIGZpcnN0IGNoaWxkIG9mIHRoaXMgcm91dGUgaW4gdGhlIHJvdXRlciBzdGF0ZSB0cmVlICovXG4gIGdldCBmaXJzdENoaWxkKCk6IEFjdGl2YXRlZFJvdXRlU25hcHNob3R8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLmZpcnN0Q2hpbGQodGhpcyk7XG4gIH1cblxuICAvKiogVGhlIGNoaWxkcmVuIG9mIHRoaXMgcm91dGUgaW4gdGhlIHJvdXRlciBzdGF0ZSB0cmVlICovXG4gIGdldCBjaGlsZHJlbigpOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90W10ge1xuICAgIHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5jaGlsZHJlbih0aGlzKTtcbiAgfVxuXG4gIC8qKiBUaGUgcGF0aCBmcm9tIHRoZSByb290IG9mIHRoZSByb3V0ZXIgc3RhdGUgdHJlZSB0byB0aGlzIHJvdXRlICovXG4gIGdldCBwYXRoRnJvbVJvb3QoKTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdFtdIHtcbiAgICByZXR1cm4gdGhpcy5fcm91dGVyU3RhdGUucGF0aEZyb21Sb290KHRoaXMpO1xuICB9XG5cbiAgZ2V0IHBhcmFtTWFwKCk6IFBhcmFtTWFwIHtcbiAgICBpZiAoIXRoaXMuX3BhcmFtTWFwKSB7XG4gICAgICB0aGlzLl9wYXJhbU1hcCA9IGNvbnZlcnRUb1BhcmFtTWFwKHRoaXMucGFyYW1zKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3BhcmFtTWFwO1xuICB9XG5cbiAgZ2V0IHF1ZXJ5UGFyYW1NYXAoKTogUGFyYW1NYXAge1xuICAgIGlmICghdGhpcy5fcXVlcnlQYXJhbU1hcCkge1xuICAgICAgdGhpcy5fcXVlcnlQYXJhbU1hcCA9IGNvbnZlcnRUb1BhcmFtTWFwKHRoaXMucXVlcnlQYXJhbXMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcXVlcnlQYXJhbU1hcDtcbiAgfVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgY29uc3QgdXJsID0gdGhpcy51cmwubWFwKHNlZ21lbnQgPT4gc2VnbWVudC50b1N0cmluZygpKS5qb2luKCcvJyk7XG4gICAgY29uc3QgbWF0Y2hlZCA9IHRoaXMucm91dGVDb25maWcgPyB0aGlzLnJvdXRlQ29uZmlnLnBhdGggOiAnJztcbiAgICByZXR1cm4gYFJvdXRlKHVybDonJHt1cmx9JywgcGF0aDonJHttYXRjaGVkfScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIHN0YXRlIG9mIHRoZSByb3V0ZXIgYXQgYSBtb21lbnQgaW4gdGltZS5cbiAqXG4gKiBUaGlzIGlzIGEgdHJlZSBvZiBhY3RpdmF0ZWQgcm91dGUgc25hcHNob3RzLiBFdmVyeSBub2RlIGluIHRoaXMgdHJlZSBrbm93cyBhYm91dFxuICogdGhlIFwiY29uc3VtZWRcIiBVUkwgc2VnbWVudHMsIHRoZSBleHRyYWN0ZWQgcGFyYW1ldGVycywgYW5kIHRoZSByZXNvbHZlZCBkYXRhLlxuICpcbiAqIFRoZSBmb2xsb3dpbmcgZXhhbXBsZSBzaG93cyBob3cgYSBjb21wb25lbnQgaXMgaW5pdGlhbGl6ZWQgd2l0aCBpbmZvcm1hdGlvblxuICogZnJvbSB0aGUgc25hcHNob3Qgb2YgdGhlIHJvb3Qgbm9kZSdzIHN0YXRlIGF0IHRoZSB0aW1lIG9mIGNyZWF0aW9uLlxuICpcbiAqIGBgYFxuICogQENvbXBvbmVudCh7dGVtcGxhdGVVcmw6J3RlbXBsYXRlLmh0bWwnfSlcbiAqIGNsYXNzIE15Q29tcG9uZW50IHtcbiAqICAgY29uc3RydWN0b3Iocm91dGVyOiBSb3V0ZXIpIHtcbiAqICAgICBjb25zdCBzdGF0ZTogUm91dGVyU3RhdGUgPSByb3V0ZXIucm91dGVyU3RhdGU7XG4gKiAgICAgY29uc3Qgc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QgPSBzdGF0ZS5zbmFwc2hvdDtcbiAqICAgICBjb25zdCByb290OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90ID0gc25hcHNob3Qucm9vdDtcbiAqICAgICBjb25zdCBjaGlsZCA9IHJvb3QuZmlyc3RDaGlsZDtcbiAqICAgICBjb25zdCBpZDogT2JzZXJ2YWJsZTxzdHJpbmc+ID0gY2hpbGQucGFyYW1zLm1hcChwID0+IHAuaWQpO1xuICogICAgIC8vLi4uXG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlclN0YXRlU25hcHNob3QgZXh0ZW5kcyBUcmVlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+IHtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBUaGUgdXJsIGZyb20gd2hpY2ggdGhpcyBzbmFwc2hvdCB3YXMgY3JlYXRlZCAqL1xuICAgICAgcHVibGljIHVybDogc3RyaW5nLCByb290OiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pikge1xuICAgIHN1cGVyKHJvb3QpO1xuICAgIHNldFJvdXRlclN0YXRlKDxSb3V0ZXJTdGF0ZVNuYXBzaG90PnRoaXMsIHJvb3QpO1xuICB9XG5cbiAgb3ZlcnJpZGUgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc2VyaWFsaXplTm9kZSh0aGlzLl9yb290KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRSb3V0ZXJTdGF0ZTxVLCBUIGV4dGVuZHMge19yb3V0ZXJTdGF0ZTogVX0+KHN0YXRlOiBVLCBub2RlOiBUcmVlTm9kZTxUPik6IHZvaWQge1xuICBub2RlLnZhbHVlLl9yb3V0ZXJTdGF0ZSA9IHN0YXRlO1xuICBub2RlLmNoaWxkcmVuLmZvckVhY2goYyA9PiBzZXRSb3V0ZXJTdGF0ZShzdGF0ZSwgYykpO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVOb2RlKG5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KTogc3RyaW5nIHtcbiAgY29uc3QgYyA9IG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCA/IGAgeyAke25vZGUuY2hpbGRyZW4ubWFwKHNlcmlhbGl6ZU5vZGUpLmpvaW4oJywgJyl9IH0gYCA6ICcnO1xuICByZXR1cm4gYCR7bm9kZS52YWx1ZX0ke2N9YDtcbn1cblxuLyoqXG4gKiBUaGUgZXhwZWN0YXRpb24gaXMgdGhhdCB0aGUgYWN0aXZhdGUgcm91dGUgaXMgY3JlYXRlZCB3aXRoIHRoZSByaWdodCBzZXQgb2YgcGFyYW1ldGVycy5cbiAqIFNvIHdlIHB1c2ggbmV3IHZhbHVlcyBpbnRvIHRoZSBvYnNlcnZhYmxlcyBvbmx5IHdoZW4gdGhleSBhcmUgbm90IHRoZSBpbml0aWFsIHZhbHVlcy5cbiAqIEFuZCB3ZSBkZXRlY3QgdGhhdCBieSBjaGVja2luZyBpZiB0aGUgc25hcHNob3QgZmllbGQgaXMgc2V0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWR2YW5jZUFjdGl2YXRlZFJvdXRlKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSk6IHZvaWQge1xuICBpZiAocm91dGUuc25hcHNob3QpIHtcbiAgICBjb25zdCBjdXJyZW50U25hcHNob3QgPSByb3V0ZS5zbmFwc2hvdDtcbiAgICBjb25zdCBuZXh0U25hcHNob3QgPSByb3V0ZS5fZnV0dXJlU25hcHNob3Q7XG4gICAgcm91dGUuc25hcHNob3QgPSBuZXh0U25hcHNob3Q7XG4gICAgaWYgKCFzaGFsbG93RXF1YWwoY3VycmVudFNuYXBzaG90LnF1ZXJ5UGFyYW1zLCBuZXh0U25hcHNob3QucXVlcnlQYXJhbXMpKSB7XG4gICAgICByb3V0ZS5xdWVyeVBhcmFtc1N1YmplY3QubmV4dChuZXh0U25hcHNob3QucXVlcnlQYXJhbXMpO1xuICAgIH1cbiAgICBpZiAoY3VycmVudFNuYXBzaG90LmZyYWdtZW50ICE9PSBuZXh0U25hcHNob3QuZnJhZ21lbnQpIHtcbiAgICAgIHJvdXRlLmZyYWdtZW50U3ViamVjdC5uZXh0KG5leHRTbmFwc2hvdC5mcmFnbWVudCk7XG4gICAgfVxuICAgIGlmICghc2hhbGxvd0VxdWFsKGN1cnJlbnRTbmFwc2hvdC5wYXJhbXMsIG5leHRTbmFwc2hvdC5wYXJhbXMpKSB7XG4gICAgICByb3V0ZS5wYXJhbXNTdWJqZWN0Lm5leHQobmV4dFNuYXBzaG90LnBhcmFtcyk7XG4gICAgfVxuICAgIGlmICghc2hhbGxvd0VxdWFsQXJyYXlzKGN1cnJlbnRTbmFwc2hvdC51cmwsIG5leHRTbmFwc2hvdC51cmwpKSB7XG4gICAgICByb3V0ZS51cmxTdWJqZWN0Lm5leHQobmV4dFNuYXBzaG90LnVybCk7XG4gICAgfVxuICAgIGlmICghc2hhbGxvd0VxdWFsKGN1cnJlbnRTbmFwc2hvdC5kYXRhLCBuZXh0U25hcHNob3QuZGF0YSkpIHtcbiAgICAgIHJvdXRlLmRhdGFTdWJqZWN0Lm5leHQobmV4dFNuYXBzaG90LmRhdGEpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByb3V0ZS5zbmFwc2hvdCA9IHJvdXRlLl9mdXR1cmVTbmFwc2hvdDtcblxuICAgIC8vIHRoaXMgaXMgZm9yIHJlc29sdmVkIGRhdGFcbiAgICByb3V0ZS5kYXRhU3ViamVjdC5uZXh0KHJvdXRlLl9mdXR1cmVTbmFwc2hvdC5kYXRhKTtcbiAgfVxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbFBhcmFtc0FuZFVybFNlZ21lbnRzKFxuICAgIGE6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGI6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBib29sZWFuIHtcbiAgY29uc3QgZXF1YWxVcmxQYXJhbXMgPSBzaGFsbG93RXF1YWwoYS5wYXJhbXMsIGIucGFyYW1zKSAmJiBlcXVhbFNlZ21lbnRzKGEudXJsLCBiLnVybCk7XG4gIGNvbnN0IHBhcmVudHNNaXNtYXRjaCA9ICFhLnBhcmVudCAhPT0gIWIucGFyZW50O1xuXG4gIHJldHVybiBlcXVhbFVybFBhcmFtcyAmJiAhcGFyZW50c01pc21hdGNoICYmXG4gICAgICAoIWEucGFyZW50IHx8IGVxdWFsUGFyYW1zQW5kVXJsU2VnbWVudHMoYS5wYXJlbnQsIGIucGFyZW50ISkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaGFzU3RhdGljVGl0bGUoY29uZmlnOiBSb3V0ZSkge1xuICByZXR1cm4gdHlwZW9mIGNvbmZpZy50aXRsZSA9PT0gJ3N0cmluZycgfHwgY29uZmlnLnRpdGxlID09PSBudWxsO1xufVxuIl19