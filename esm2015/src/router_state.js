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
 * @description
 *
 * Represents the state of the router.
 *
 * RouterState is a tree of activated routes. Every node in this tree knows about the "consumed" URL
 * segments, the extracted parameters, and the resolved data.
 *
 * @usageNotes
 * ### Example
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
 * See `ActivatedRoute` for more information.
 *
 *
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
    toString() { return this.snapshot.toString(); }
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
 * @description
 *
 * Contains the information about a route associated with a component loaded in an
 * outlet.  An `ActivatedRoute` can also be used to traverse the router state tree.
 *
 * ```
 * @Component({...})
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
    /** @internal */
    constructor(
    /** An observable of the URL segments matched by this route */
    url, 
    /** An observable of the matrix parameters scoped to this route */
    params, 
    /** An observable of the query parameters shared by all the routes */
    queryParams, 
    /** An observable of the URL fragment shared by all the routes */
    fragment, 
    /** An observable of the static and resolved data of this route. */
    data, 
    /** The outlet name of the route. It's a constant */
    outlet, 
    /** The component of the route. It's a constant */
    // TODO(vsavkin): remove |string
    component, futureSnapshot) {
        this.url = url;
        this.params = params;
        this.queryParams = queryParams;
        this.fragment = fragment;
        this.data = data;
        this.outlet = outlet;
        this.component = component;
        this._futureSnapshot = futureSnapshot;
    }
    /** The configuration used to match this route */
    get routeConfig() { return this._futureSnapshot.routeConfig; }
    /** The root of the router state */
    get root() { return this._routerState.root; }
    /** The parent of this route in the router state tree */
    get parent() { return this._routerState.parent(this); }
    /** The first child of this route in the router state tree */
    get firstChild() { return this._routerState.firstChild(this); }
    /** The children of this route in the router state tree */
    get children() { return this._routerState.children(this); }
    /** The path from the root of the router state tree to this route */
    get pathFromRoot() { return this._routerState.pathFromRoot(this); }
    get paramMap() {
        if (!this._paramMap) {
            this._paramMap = this.params.pipe(map((p) => convertToParamMap(p)));
        }
        return this._paramMap;
    }
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
        const params = Object.assign({}, res.params, curr.params);
        const data = Object.assign({}, res.data, curr.data);
        const resolve = Object.assign({}, res.resolve, curr._resolvedData);
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
 *
 */
export class ActivatedRouteSnapshot {
    /** @internal */
    constructor(
    /** The URL segments matched by this route */
    url, 
    /** The matrix parameters scoped to this route */
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
    /** The root of the router state */
    get root() { return this._routerState.root; }
    /** The parent of this route in the router state tree */
    get parent() { return this._routerState.parent(this); }
    /** The first child of this route in the router state tree */
    get firstChild() { return this._routerState.firstChild(this); }
    /** The children of this route in the router state tree */
    get children() { return this._routerState.children(this); }
    /** The path from the root of the router state tree to this route */
    get pathFromRoot() { return this._routerState.pathFromRoot(this); }
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
 * @usageNotes
 * ### Example
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
 *
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
    toString() { return serializeNode(this._root); }
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3N0YXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXJfc3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUFDLGVBQWUsRUFBYSxNQUFNLE1BQU0sQ0FBQztBQUNqRCxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFHbkMsT0FBTyxFQUFDLGNBQWMsRUFBb0IsaUJBQWlCLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDN0UsT0FBTyxFQUFDLFVBQVUsRUFBNEIsYUFBYSxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQy9FLE9BQU8sRUFBQyxZQUFZLEVBQUUsa0JBQWtCLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUNwRSxPQUFPLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUk1Qzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBMkJHO0FBQ0gsTUFBTSxPQUFPLFdBQVksU0FBUSxJQUFvQjtJQUNuRCxnQkFBZ0I7SUFDaEIsWUFDSSxJQUE4QjtJQUM5QiwrQ0FBK0M7SUFDeEMsUUFBNkI7UUFDdEMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBREgsYUFBUSxHQUFSLFFBQVEsQ0FBcUI7UUFFdEMsY0FBYyxDQUFjLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsUUFBUSxLQUFhLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDeEQ7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsT0FBZ0IsRUFBRSxhQUE4QjtJQUMvRSxNQUFNLFFBQVEsR0FBRyx3QkFBd0IsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDbEUsTUFBTSxRQUFRLEdBQUcsSUFBSSxlQUFlLENBQUMsQ0FB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QkFBeUIsQ0FDckMsQ0FBeUIsRUFBRSxDQUF5QjtJQUN0RCxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZGLE1BQU0sZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFFaEQsT0FBTyxjQUFjLElBQUksQ0FBQyxlQUFlO1FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQVEsQ0FBQyxDQUFDLENBQUM7QUFDckUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtUeXBlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7QmVoYXZpb3JTdWJqZWN0LCBPYnNlcnZhYmxlfSBmcm9tICdyeGpzJztcbmltcG9ydCB7bWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7RGF0YSwgUmVzb2x2ZURhdGEsIFJvdXRlfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge1BSSU1BUllfT1VUTEVULCBQYXJhbU1hcCwgUGFyYW1zLCBjb252ZXJ0VG9QYXJhbU1hcH0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtVcmxTZWdtZW50LCBVcmxTZWdtZW50R3JvdXAsIFVybFRyZWUsIGVxdWFsU2VnbWVudHN9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtzaGFsbG93RXF1YWwsIHNoYWxsb3dFcXVhbEFycmF5c30gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcbmltcG9ydCB7VHJlZSwgVHJlZU5vZGV9IGZyb20gJy4vdXRpbHMvdHJlZSc7XG5cblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIHN0YXRlIG9mIHRoZSByb3V0ZXIuXG4gKlxuICogUm91dGVyU3RhdGUgaXMgYSB0cmVlIG9mIGFjdGl2YXRlZCByb3V0ZXMuIEV2ZXJ5IG5vZGUgaW4gdGhpcyB0cmVlIGtub3dzIGFib3V0IHRoZSBcImNvbnN1bWVkXCIgVVJMXG4gKiBzZWdtZW50cywgdGhlIGV4dHJhY3RlZCBwYXJhbWV0ZXJzLCBhbmQgdGhlIHJlc29sdmVkIGRhdGEuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqICMjIyBFeGFtcGxlXG4gKlxuICogYGBgXG4gKiBAQ29tcG9uZW50KHt0ZW1wbGF0ZVVybDondGVtcGxhdGUuaHRtbCd9KVxuICogY2xhc3MgTXlDb21wb25lbnQge1xuICogICBjb25zdHJ1Y3Rvcihyb3V0ZXI6IFJvdXRlcikge1xuICogICAgIGNvbnN0IHN0YXRlOiBSb3V0ZXJTdGF0ZSA9IHJvdXRlci5yb3V0ZXJTdGF0ZTtcbiAqICAgICBjb25zdCByb290OiBBY3RpdmF0ZWRSb3V0ZSA9IHN0YXRlLnJvb3Q7XG4gKiAgICAgY29uc3QgY2hpbGQgPSByb290LmZpcnN0Q2hpbGQ7XG4gKiAgICAgY29uc3QgaWQ6IE9ic2VydmFibGU8c3RyaW5nPiA9IGNoaWxkLnBhcmFtcy5tYXAocCA9PiBwLmlkKTtcbiAqICAgICAvLy4uLlxuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBTZWUgYEFjdGl2YXRlZFJvdXRlYCBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqXG4gKlxuICovXG5leHBvcnQgY2xhc3MgUm91dGVyU3RhdGUgZXh0ZW5kcyBUcmVlPEFjdGl2YXRlZFJvdXRlPiB7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgICByb290OiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sXG4gICAgICAvKiogVGhlIGN1cnJlbnQgc25hcHNob3Qgb2YgdGhlIHJvdXRlciBzdGF0ZSAqL1xuICAgICAgcHVibGljIHNuYXBzaG90OiBSb3V0ZXJTdGF0ZVNuYXBzaG90KSB7XG4gICAgc3VwZXIocm9vdCk7XG4gICAgc2V0Um91dGVyU3RhdGUoPFJvdXRlclN0YXRlPnRoaXMsIHJvb3QpO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHsgcmV0dXJuIHRoaXMuc25hcHNob3QudG9TdHJpbmcoKTsgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRW1wdHlTdGF0ZSh1cmxUcmVlOiBVcmxUcmVlLCByb290Q29tcG9uZW50OiBUeXBlPGFueT58IG51bGwpOiBSb3V0ZXJTdGF0ZSB7XG4gIGNvbnN0IHNuYXBzaG90ID0gY3JlYXRlRW1wdHlTdGF0ZVNuYXBzaG90KHVybFRyZWUsIHJvb3RDb21wb25lbnQpO1xuICBjb25zdCBlbXB0eVVybCA9IG5ldyBCZWhhdmlvclN1YmplY3QoW25ldyBVcmxTZWdtZW50KCcnLCB7fSldKTtcbiAgY29uc3QgZW1wdHlQYXJhbXMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0KHt9KTtcbiAgY29uc3QgZW1wdHlEYXRhID0gbmV3IEJlaGF2aW9yU3ViamVjdCh7fSk7XG4gIGNvbnN0IGVtcHR5UXVlcnlQYXJhbXMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0KHt9KTtcbiAgY29uc3QgZnJhZ21lbnQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0KCcnKTtcbiAgY29uc3QgYWN0aXZhdGVkID0gbmV3IEFjdGl2YXRlZFJvdXRlKFxuICAgICAgZW1wdHlVcmwsIGVtcHR5UGFyYW1zLCBlbXB0eVF1ZXJ5UGFyYW1zLCBmcmFnbWVudCwgZW1wdHlEYXRhLCBQUklNQVJZX09VVExFVCwgcm9vdENvbXBvbmVudCxcbiAgICAgIHNuYXBzaG90LnJvb3QpO1xuICBhY3RpdmF0ZWQuc25hcHNob3QgPSBzbmFwc2hvdC5yb290O1xuICByZXR1cm4gbmV3IFJvdXRlclN0YXRlKG5ldyBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4oYWN0aXZhdGVkLCBbXSksIHNuYXBzaG90KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVtcHR5U3RhdGVTbmFwc2hvdChcbiAgICB1cmxUcmVlOiBVcmxUcmVlLCByb290Q29tcG9uZW50OiBUeXBlPGFueT58IG51bGwpOiBSb3V0ZXJTdGF0ZVNuYXBzaG90IHtcbiAgY29uc3QgZW1wdHlQYXJhbXMgPSB7fTtcbiAgY29uc3QgZW1wdHlEYXRhID0ge307XG4gIGNvbnN0IGVtcHR5UXVlcnlQYXJhbXMgPSB7fTtcbiAgY29uc3QgZnJhZ21lbnQgPSAnJztcbiAgY29uc3QgYWN0aXZhdGVkID0gbmV3IEFjdGl2YXRlZFJvdXRlU25hcHNob3QoXG4gICAgICBbXSwgZW1wdHlQYXJhbXMsIGVtcHR5UXVlcnlQYXJhbXMsIGZyYWdtZW50LCBlbXB0eURhdGEsIFBSSU1BUllfT1VUTEVULCByb290Q29tcG9uZW50LCBudWxsLFxuICAgICAgdXJsVHJlZS5yb290LCAtMSwge30pO1xuICByZXR1cm4gbmV3IFJvdXRlclN0YXRlU25hcHNob3QoJycsIG5ldyBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PihhY3RpdmF0ZWQsIFtdKSk7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQ29udGFpbnMgdGhlIGluZm9ybWF0aW9uIGFib3V0IGEgcm91dGUgYXNzb2NpYXRlZCB3aXRoIGEgY29tcG9uZW50IGxvYWRlZCBpbiBhblxuICogb3V0bGV0LiAgQW4gYEFjdGl2YXRlZFJvdXRlYCBjYW4gYWxzbyBiZSB1c2VkIHRvIHRyYXZlcnNlIHRoZSByb3V0ZXIgc3RhdGUgdHJlZS5cbiAqXG4gKiBgYGBcbiAqIEBDb21wb25lbnQoey4uLn0pXG4gKiBjbGFzcyBNeUNvbXBvbmVudCB7XG4gKiAgIGNvbnN0cnVjdG9yKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSkge1xuICogICAgIGNvbnN0IGlkOiBPYnNlcnZhYmxlPHN0cmluZz4gPSByb3V0ZS5wYXJhbXMubWFwKHAgPT4gcC5pZCk7XG4gKiAgICAgY29uc3QgdXJsOiBPYnNlcnZhYmxlPHN0cmluZz4gPSByb3V0ZS51cmwubWFwKHNlZ21lbnRzID0+IHNlZ21lbnRzLmpvaW4oJycpKTtcbiAqICAgICAvLyByb3V0ZS5kYXRhIGluY2x1ZGVzIGJvdGggYGRhdGFgIGFuZCBgcmVzb2x2ZWBcbiAqICAgICBjb25zdCB1c2VyID0gcm91dGUuZGF0YS5tYXAoZCA9PiBkLnVzZXIpO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKlxuICovXG5leHBvcnQgY2xhc3MgQWN0aXZhdGVkUm91dGUge1xuICAvKiogVGhlIGN1cnJlbnQgc25hcHNob3Qgb2YgdGhpcyByb3V0ZSAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgc25hcHNob3QgITogQWN0aXZhdGVkUm91dGVTbmFwc2hvdDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfZnV0dXJlU25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3Q7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIF9yb3V0ZXJTdGF0ZSAhOiBSb3V0ZXJTdGF0ZTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgX3BhcmFtTWFwICE6IE9ic2VydmFibGU8UGFyYW1NYXA+O1xuICAvKiogQGludGVybmFsICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBfcXVlcnlQYXJhbU1hcCAhOiBPYnNlcnZhYmxlPFBhcmFtTWFwPjtcblxuICAvKiogQGludGVybmFsICovXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIEFuIG9ic2VydmFibGUgb2YgdGhlIFVSTCBzZWdtZW50cyBtYXRjaGVkIGJ5IHRoaXMgcm91dGUgKi9cbiAgICAgIHB1YmxpYyB1cmw6IE9ic2VydmFibGU8VXJsU2VnbWVudFtdPixcbiAgICAgIC8qKiBBbiBvYnNlcnZhYmxlIG9mIHRoZSBtYXRyaXggcGFyYW1ldGVycyBzY29wZWQgdG8gdGhpcyByb3V0ZSAqL1xuICAgICAgcHVibGljIHBhcmFtczogT2JzZXJ2YWJsZTxQYXJhbXM+LFxuICAgICAgLyoqIEFuIG9ic2VydmFibGUgb2YgdGhlIHF1ZXJ5IHBhcmFtZXRlcnMgc2hhcmVkIGJ5IGFsbCB0aGUgcm91dGVzICovXG4gICAgICBwdWJsaWMgcXVlcnlQYXJhbXM6IE9ic2VydmFibGU8UGFyYW1zPixcbiAgICAgIC8qKiBBbiBvYnNlcnZhYmxlIG9mIHRoZSBVUkwgZnJhZ21lbnQgc2hhcmVkIGJ5IGFsbCB0aGUgcm91dGVzICovXG4gICAgICBwdWJsaWMgZnJhZ21lbnQ6IE9ic2VydmFibGU8c3RyaW5nPixcbiAgICAgIC8qKiBBbiBvYnNlcnZhYmxlIG9mIHRoZSBzdGF0aWMgYW5kIHJlc29sdmVkIGRhdGEgb2YgdGhpcyByb3V0ZS4gKi9cbiAgICAgIHB1YmxpYyBkYXRhOiBPYnNlcnZhYmxlPERhdGE+LFxuICAgICAgLyoqIFRoZSBvdXRsZXQgbmFtZSBvZiB0aGUgcm91dGUuIEl0J3MgYSBjb25zdGFudCAqL1xuICAgICAgcHVibGljIG91dGxldDogc3RyaW5nLFxuICAgICAgLyoqIFRoZSBjb21wb25lbnQgb2YgdGhlIHJvdXRlLiBJdCdzIGEgY29uc3RhbnQgKi9cbiAgICAgIC8vIFRPRE8odnNhdmtpbik6IHJlbW92ZSB8c3RyaW5nXG4gICAgICBwdWJsaWMgY29tcG9uZW50OiBUeXBlPGFueT58c3RyaW5nfG51bGwsIGZ1dHVyZVNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSB7XG4gICAgdGhpcy5fZnV0dXJlU25hcHNob3QgPSBmdXR1cmVTbmFwc2hvdDtcbiAgfVxuXG4gIC8qKiBUaGUgY29uZmlndXJhdGlvbiB1c2VkIHRvIG1hdGNoIHRoaXMgcm91dGUgKi9cbiAgZ2V0IHJvdXRlQ29uZmlnKCk6IFJvdXRlfG51bGwgeyByZXR1cm4gdGhpcy5fZnV0dXJlU25hcHNob3Qucm91dGVDb25maWc7IH1cblxuICAvKiogVGhlIHJvb3Qgb2YgdGhlIHJvdXRlciBzdGF0ZSAqL1xuICBnZXQgcm9vdCgpOiBBY3RpdmF0ZWRSb3V0ZSB7IHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5yb290OyB9XG5cbiAgLyoqIFRoZSBwYXJlbnQgb2YgdGhpcyByb3V0ZSBpbiB0aGUgcm91dGVyIHN0YXRlIHRyZWUgKi9cbiAgZ2V0IHBhcmVudCgpOiBBY3RpdmF0ZWRSb3V0ZXxudWxsIHsgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLnBhcmVudCh0aGlzKTsgfVxuXG4gIC8qKiBUaGUgZmlyc3QgY2hpbGQgb2YgdGhpcyByb3V0ZSBpbiB0aGUgcm91dGVyIHN0YXRlIHRyZWUgKi9cbiAgZ2V0IGZpcnN0Q2hpbGQoKTogQWN0aXZhdGVkUm91dGV8bnVsbCB7IHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5maXJzdENoaWxkKHRoaXMpOyB9XG5cbiAgLyoqIFRoZSBjaGlsZHJlbiBvZiB0aGlzIHJvdXRlIGluIHRoZSByb3V0ZXIgc3RhdGUgdHJlZSAqL1xuICBnZXQgY2hpbGRyZW4oKTogQWN0aXZhdGVkUm91dGVbXSB7IHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5jaGlsZHJlbih0aGlzKTsgfVxuXG4gIC8qKiBUaGUgcGF0aCBmcm9tIHRoZSByb290IG9mIHRoZSByb3V0ZXIgc3RhdGUgdHJlZSB0byB0aGlzIHJvdXRlICovXG4gIGdldCBwYXRoRnJvbVJvb3QoKTogQWN0aXZhdGVkUm91dGVbXSB7IHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5wYXRoRnJvbVJvb3QodGhpcyk7IH1cblxuICBnZXQgcGFyYW1NYXAoKTogT2JzZXJ2YWJsZTxQYXJhbU1hcD4ge1xuICAgIGlmICghdGhpcy5fcGFyYW1NYXApIHtcbiAgICAgIHRoaXMuX3BhcmFtTWFwID0gdGhpcy5wYXJhbXMucGlwZShtYXAoKHA6IFBhcmFtcyk6IFBhcmFtTWFwID0+IGNvbnZlcnRUb1BhcmFtTWFwKHApKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9wYXJhbU1hcDtcbiAgfVxuXG4gIGdldCBxdWVyeVBhcmFtTWFwKCk6IE9ic2VydmFibGU8UGFyYW1NYXA+IHtcbiAgICBpZiAoIXRoaXMuX3F1ZXJ5UGFyYW1NYXApIHtcbiAgICAgIHRoaXMuX3F1ZXJ5UGFyYW1NYXAgPVxuICAgICAgICAgIHRoaXMucXVlcnlQYXJhbXMucGlwZShtYXAoKHA6IFBhcmFtcyk6IFBhcmFtTWFwID0+IGNvbnZlcnRUb1BhcmFtTWFwKHApKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9xdWVyeVBhcmFtTWFwO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5zbmFwc2hvdCA/IHRoaXMuc25hcHNob3QudG9TdHJpbmcoKSA6IGBGdXR1cmUoJHt0aGlzLl9mdXR1cmVTbmFwc2hvdH0pYDtcbiAgfVxufVxuXG5leHBvcnQgdHlwZSBQYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5ID0gJ2VtcHR5T25seScgfCAnYWx3YXlzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgSW5oZXJpdGVkID0ge1xuICBwYXJhbXM6IFBhcmFtcyxcbiAgZGF0YTogRGF0YSxcbiAgcmVzb2x2ZTogRGF0YSxcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgaW5oZXJpdGVkIHBhcmFtcywgZGF0YSwgYW5kIHJlc29sdmUgZm9yIGEgZ2l2ZW4gcm91dGUuXG4gKiBCeSBkZWZhdWx0LCB0aGlzIG9ubHkgaW5oZXJpdHMgdmFsdWVzIHVwIHRvIHRoZSBuZWFyZXN0IHBhdGgtbGVzcyBvciBjb21wb25lbnQtbGVzcyByb3V0ZS5cbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5oZXJpdGVkUGFyYW1zRGF0YVJlc29sdmUoXG4gICAgcm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsXG4gICAgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogUGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSA9ICdlbXB0eU9ubHknKTogSW5oZXJpdGVkIHtcbiAgY29uc3QgcGF0aEZyb21Sb290ID0gcm91dGUucGF0aEZyb21Sb290O1xuXG4gIGxldCBpbmhlcml0aW5nU3RhcnRpbmdGcm9tID0gMDtcbiAgaWYgKHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kgIT09ICdhbHdheXMnKSB7XG4gICAgaW5oZXJpdGluZ1N0YXJ0aW5nRnJvbSA9IHBhdGhGcm9tUm9vdC5sZW5ndGggLSAxO1xuXG4gICAgd2hpbGUgKGluaGVyaXRpbmdTdGFydGluZ0Zyb20gPj0gMSkge1xuICAgICAgY29uc3QgY3VycmVudCA9IHBhdGhGcm9tUm9vdFtpbmhlcml0aW5nU3RhcnRpbmdGcm9tXTtcbiAgICAgIGNvbnN0IHBhcmVudCA9IHBhdGhGcm9tUm9vdFtpbmhlcml0aW5nU3RhcnRpbmdGcm9tIC0gMV07XG4gICAgICAvLyBjdXJyZW50IHJvdXRlIGlzIGFuIGVtcHR5IHBhdGggPT4gaW5oZXJpdHMgaXRzIHBhcmVudCdzIHBhcmFtcyBhbmQgZGF0YVxuICAgICAgaWYgKGN1cnJlbnQucm91dGVDb25maWcgJiYgY3VycmVudC5yb3V0ZUNvbmZpZy5wYXRoID09PSAnJykge1xuICAgICAgICBpbmhlcml0aW5nU3RhcnRpbmdGcm9tLS07XG5cbiAgICAgICAgLy8gcGFyZW50IGlzIGNvbXBvbmVudGxlc3MgPT4gY3VycmVudCByb3V0ZSBzaG91bGQgaW5oZXJpdCBpdHMgcGFyYW1zIGFuZCBkYXRhXG4gICAgICB9IGVsc2UgaWYgKCFwYXJlbnQuY29tcG9uZW50KSB7XG4gICAgICAgIGluaGVyaXRpbmdTdGFydGluZ0Zyb20tLTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZsYXR0ZW5Jbmhlcml0ZWQocGF0aEZyb21Sb290LnNsaWNlKGluaGVyaXRpbmdTdGFydGluZ0Zyb20pKTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gZmxhdHRlbkluaGVyaXRlZChwYXRoRnJvbVJvb3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3RbXSk6IEluaGVyaXRlZCB7XG4gIHJldHVybiBwYXRoRnJvbVJvb3QucmVkdWNlKChyZXMsIGN1cnIpID0+IHtcbiAgICBjb25zdCBwYXJhbXMgPSB7Li4ucmVzLnBhcmFtcywgLi4uY3Vyci5wYXJhbXN9O1xuICAgIGNvbnN0IGRhdGEgPSB7Li4ucmVzLmRhdGEsIC4uLmN1cnIuZGF0YX07XG4gICAgY29uc3QgcmVzb2x2ZSA9IHsuLi5yZXMucmVzb2x2ZSwgLi4uY3Vyci5fcmVzb2x2ZWREYXRhfTtcbiAgICByZXR1cm4ge3BhcmFtcywgZGF0YSwgcmVzb2x2ZX07XG4gIH0sIDxhbnk+e3BhcmFtczoge30sIGRhdGE6IHt9LCByZXNvbHZlOiB7fX0pO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIENvbnRhaW5zIHRoZSBpbmZvcm1hdGlvbiBhYm91dCBhIHJvdXRlIGFzc29jaWF0ZWQgd2l0aCBhIGNvbXBvbmVudCBsb2FkZWQgaW4gYW5cbiAqIG91dGxldCBhdCBhIHBhcnRpY3VsYXIgbW9tZW50IGluIHRpbWUuIEFjdGl2YXRlZFJvdXRlU25hcHNob3QgY2FuIGFsc28gYmUgdXNlZCB0b1xuICogdHJhdmVyc2UgdGhlIHJvdXRlciBzdGF0ZSB0cmVlLlxuICpcbiAqIGBgYFxuICogQENvbXBvbmVudCh7dGVtcGxhdGVVcmw6Jy4vbXktY29tcG9uZW50Lmh0bWwnfSlcbiAqIGNsYXNzIE15Q29tcG9uZW50IHtcbiAqICAgY29uc3RydWN0b3Iocm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7XG4gKiAgICAgY29uc3QgaWQ6IHN0cmluZyA9IHJvdXRlLnNuYXBzaG90LnBhcmFtcy5pZDtcbiAqICAgICBjb25zdCB1cmw6IHN0cmluZyA9IHJvdXRlLnNuYXBzaG90LnVybC5qb2luKCcnKTtcbiAqICAgICBjb25zdCB1c2VyID0gcm91dGUuc25hcHNob3QuZGF0YS51c2VyO1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKlxuICovXG5leHBvcnQgY2xhc3MgQWN0aXZhdGVkUm91dGVTbmFwc2hvdCB7XG4gIC8qKiBUaGUgY29uZmlndXJhdGlvbiB1c2VkIHRvIG1hdGNoIHRoaXMgcm91dGUgKiovXG4gIHB1YmxpYyByZWFkb25seSByb3V0ZUNvbmZpZzogUm91dGV8bnVsbDtcbiAgLyoqIEBpbnRlcm5hbCAqKi9cbiAgX3VybFNlZ21lbnQ6IFVybFNlZ21lbnRHcm91cDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfbGFzdFBhdGhJbmRleDogbnVtYmVyO1xuICAvKiogQGludGVybmFsICovXG4gIF9yZXNvbHZlOiBSZXNvbHZlRGF0YTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgX3Jlc29sdmVkRGF0YSAhOiBEYXRhO1xuICAvKiogQGludGVybmFsICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBfcm91dGVyU3RhdGUgITogUm91dGVyU3RhdGVTbmFwc2hvdDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgX3BhcmFtTWFwICE6IFBhcmFtTWFwO1xuICAvKiogQGludGVybmFsICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBfcXVlcnlQYXJhbU1hcCAhOiBQYXJhbU1hcDtcblxuICAvKiogQGludGVybmFsICovXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIFRoZSBVUkwgc2VnbWVudHMgbWF0Y2hlZCBieSB0aGlzIHJvdXRlICovXG4gICAgICBwdWJsaWMgdXJsOiBVcmxTZWdtZW50W10sXG4gICAgICAvKiogVGhlIG1hdHJpeCBwYXJhbWV0ZXJzIHNjb3BlZCB0byB0aGlzIHJvdXRlICovXG4gICAgICBwdWJsaWMgcGFyYW1zOiBQYXJhbXMsXG4gICAgICAvKiogVGhlIHF1ZXJ5IHBhcmFtZXRlcnMgc2hhcmVkIGJ5IGFsbCB0aGUgcm91dGVzICovXG4gICAgICBwdWJsaWMgcXVlcnlQYXJhbXM6IFBhcmFtcyxcbiAgICAgIC8qKiBUaGUgVVJMIGZyYWdtZW50IHNoYXJlZCBieSBhbGwgdGhlIHJvdXRlcyAqL1xuICAgICAgcHVibGljIGZyYWdtZW50OiBzdHJpbmcsXG4gICAgICAvKiogVGhlIHN0YXRpYyBhbmQgcmVzb2x2ZWQgZGF0YSBvZiB0aGlzIHJvdXRlICovXG4gICAgICBwdWJsaWMgZGF0YTogRGF0YSxcbiAgICAgIC8qKiBUaGUgb3V0bGV0IG5hbWUgb2YgdGhlIHJvdXRlICovXG4gICAgICBwdWJsaWMgb3V0bGV0OiBzdHJpbmcsXG4gICAgICAvKiogVGhlIGNvbXBvbmVudCBvZiB0aGUgcm91dGUgKi9cbiAgICAgIHB1YmxpYyBjb21wb25lbnQ6IFR5cGU8YW55PnxzdHJpbmd8bnVsbCwgcm91dGVDb25maWc6IFJvdXRlfG51bGwsIHVybFNlZ21lbnQ6IFVybFNlZ21lbnRHcm91cCxcbiAgICAgIGxhc3RQYXRoSW5kZXg6IG51bWJlciwgcmVzb2x2ZTogUmVzb2x2ZURhdGEpIHtcbiAgICB0aGlzLnJvdXRlQ29uZmlnID0gcm91dGVDb25maWc7XG4gICAgdGhpcy5fdXJsU2VnbWVudCA9IHVybFNlZ21lbnQ7XG4gICAgdGhpcy5fbGFzdFBhdGhJbmRleCA9IGxhc3RQYXRoSW5kZXg7XG4gICAgdGhpcy5fcmVzb2x2ZSA9IHJlc29sdmU7XG4gIH1cblxuICAvKiogVGhlIHJvb3Qgb2YgdGhlIHJvdXRlciBzdGF0ZSAqL1xuICBnZXQgcm9vdCgpOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90IHsgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLnJvb3Q7IH1cblxuICAvKiogVGhlIHBhcmVudCBvZiB0aGlzIHJvdXRlIGluIHRoZSByb3V0ZXIgc3RhdGUgdHJlZSAqL1xuICBnZXQgcGFyZW50KCk6IEFjdGl2YXRlZFJvdXRlU25hcHNob3R8bnVsbCB7IHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5wYXJlbnQodGhpcyk7IH1cblxuICAvKiogVGhlIGZpcnN0IGNoaWxkIG9mIHRoaXMgcm91dGUgaW4gdGhlIHJvdXRlciBzdGF0ZSB0cmVlICovXG4gIGdldCBmaXJzdENoaWxkKCk6IEFjdGl2YXRlZFJvdXRlU25hcHNob3R8bnVsbCB7IHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5maXJzdENoaWxkKHRoaXMpOyB9XG5cbiAgLyoqIFRoZSBjaGlsZHJlbiBvZiB0aGlzIHJvdXRlIGluIHRoZSByb3V0ZXIgc3RhdGUgdHJlZSAqL1xuICBnZXQgY2hpbGRyZW4oKTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdFtdIHsgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLmNoaWxkcmVuKHRoaXMpOyB9XG5cbiAgLyoqIFRoZSBwYXRoIGZyb20gdGhlIHJvb3Qgb2YgdGhlIHJvdXRlciBzdGF0ZSB0cmVlIHRvIHRoaXMgcm91dGUgKi9cbiAgZ2V0IHBhdGhGcm9tUm9vdCgpOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90W10geyByZXR1cm4gdGhpcy5fcm91dGVyU3RhdGUucGF0aEZyb21Sb290KHRoaXMpOyB9XG5cbiAgZ2V0IHBhcmFtTWFwKCk6IFBhcmFtTWFwIHtcbiAgICBpZiAoIXRoaXMuX3BhcmFtTWFwKSB7XG4gICAgICB0aGlzLl9wYXJhbU1hcCA9IGNvbnZlcnRUb1BhcmFtTWFwKHRoaXMucGFyYW1zKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3BhcmFtTWFwO1xuICB9XG5cbiAgZ2V0IHF1ZXJ5UGFyYW1NYXAoKTogUGFyYW1NYXAge1xuICAgIGlmICghdGhpcy5fcXVlcnlQYXJhbU1hcCkge1xuICAgICAgdGhpcy5fcXVlcnlQYXJhbU1hcCA9IGNvbnZlcnRUb1BhcmFtTWFwKHRoaXMucXVlcnlQYXJhbXMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcXVlcnlQYXJhbU1hcDtcbiAgfVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgY29uc3QgdXJsID0gdGhpcy51cmwubWFwKHNlZ21lbnQgPT4gc2VnbWVudC50b1N0cmluZygpKS5qb2luKCcvJyk7XG4gICAgY29uc3QgbWF0Y2hlZCA9IHRoaXMucm91dGVDb25maWcgPyB0aGlzLnJvdXRlQ29uZmlnLnBhdGggOiAnJztcbiAgICByZXR1cm4gYFJvdXRlKHVybDonJHt1cmx9JywgcGF0aDonJHttYXRjaGVkfScpYDtcbiAgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIHN0YXRlIG9mIHRoZSByb3V0ZXIgYXQgYSBtb21lbnQgaW4gdGltZS5cbiAqXG4gKiBUaGlzIGlzIGEgdHJlZSBvZiBhY3RpdmF0ZWQgcm91dGUgc25hcHNob3RzLiBFdmVyeSBub2RlIGluIHRoaXMgdHJlZSBrbm93cyBhYm91dFxuICogdGhlIFwiY29uc3VtZWRcIiBVUkwgc2VnbWVudHMsIHRoZSBleHRyYWN0ZWQgcGFyYW1ldGVycywgYW5kIHRoZSByZXNvbHZlZCBkYXRhLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYFxuICogQENvbXBvbmVudCh7dGVtcGxhdGVVcmw6J3RlbXBsYXRlLmh0bWwnfSlcbiAqIGNsYXNzIE15Q29tcG9uZW50IHtcbiAqICAgY29uc3RydWN0b3Iocm91dGVyOiBSb3V0ZXIpIHtcbiAqICAgICBjb25zdCBzdGF0ZTogUm91dGVyU3RhdGUgPSByb3V0ZXIucm91dGVyU3RhdGU7XG4gKiAgICAgY29uc3Qgc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QgPSBzdGF0ZS5zbmFwc2hvdDtcbiAqICAgICBjb25zdCByb290OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90ID0gc25hcHNob3Qucm9vdDtcbiAqICAgICBjb25zdCBjaGlsZCA9IHJvb3QuZmlyc3RDaGlsZDtcbiAqICAgICBjb25zdCBpZDogT2JzZXJ2YWJsZTxzdHJpbmc+ID0gY2hpbGQucGFyYW1zLm1hcChwID0+IHAuaWQpO1xuICogICAgIC8vLi4uXG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZXJTdGF0ZVNuYXBzaG90IGV4dGVuZHMgVHJlZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PiB7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogVGhlIHVybCBmcm9tIHdoaWNoIHRoaXMgc25hcHNob3Qgd2FzIGNyZWF0ZWQgKi9cbiAgICAgIHB1YmxpYyB1cmw6IHN0cmluZywgcm9vdDogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4pIHtcbiAgICBzdXBlcihyb290KTtcbiAgICBzZXRSb3V0ZXJTdGF0ZSg8Um91dGVyU3RhdGVTbmFwc2hvdD50aGlzLCByb290KTtcbiAgfVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7IHJldHVybiBzZXJpYWxpemVOb2RlKHRoaXMuX3Jvb3QpOyB9XG59XG5cbmZ1bmN0aW9uIHNldFJvdXRlclN0YXRlPFUsIFQgZXh0ZW5kc3tfcm91dGVyU3RhdGU6IFV9PihzdGF0ZTogVSwgbm9kZTogVHJlZU5vZGU8VD4pOiB2b2lkIHtcbiAgbm9kZS52YWx1ZS5fcm91dGVyU3RhdGUgPSBzdGF0ZTtcbiAgbm9kZS5jaGlsZHJlbi5mb3JFYWNoKGMgPT4gc2V0Um91dGVyU3RhdGUoc3RhdGUsIGMpKTtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplTm9kZShub2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pik6IHN0cmluZyB7XG4gIGNvbnN0IGMgPSBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDAgPyBgIHsgJHtub2RlLmNoaWxkcmVuLm1hcChzZXJpYWxpemVOb2RlKS5qb2luKCcsICcpfSB9IGAgOiAnJztcbiAgcmV0dXJuIGAke25vZGUudmFsdWV9JHtjfWA7XG59XG5cbi8qKlxuICogVGhlIGV4cGVjdGF0aW9uIGlzIHRoYXQgdGhlIGFjdGl2YXRlIHJvdXRlIGlzIGNyZWF0ZWQgd2l0aCB0aGUgcmlnaHQgc2V0IG9mIHBhcmFtZXRlcnMuXG4gKiBTbyB3ZSBwdXNoIG5ldyB2YWx1ZXMgaW50byB0aGUgb2JzZXJ2YWJsZXMgb25seSB3aGVuIHRoZXkgYXJlIG5vdCB0aGUgaW5pdGlhbCB2YWx1ZXMuXG4gKiBBbmQgd2UgZGV0ZWN0IHRoYXQgYnkgY2hlY2tpbmcgaWYgdGhlIHNuYXBzaG90IGZpZWxkIGlzIHNldC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkdmFuY2VBY3RpdmF0ZWRSb3V0ZShyb3V0ZTogQWN0aXZhdGVkUm91dGUpOiB2b2lkIHtcbiAgaWYgKHJvdXRlLnNuYXBzaG90KSB7XG4gICAgY29uc3QgY3VycmVudFNuYXBzaG90ID0gcm91dGUuc25hcHNob3Q7XG4gICAgY29uc3QgbmV4dFNuYXBzaG90ID0gcm91dGUuX2Z1dHVyZVNuYXBzaG90O1xuICAgIHJvdXRlLnNuYXBzaG90ID0gbmV4dFNuYXBzaG90O1xuICAgIGlmICghc2hhbGxvd0VxdWFsKGN1cnJlbnRTbmFwc2hvdC5xdWVyeVBhcmFtcywgbmV4dFNuYXBzaG90LnF1ZXJ5UGFyYW1zKSkge1xuICAgICAgKDxhbnk+cm91dGUucXVlcnlQYXJhbXMpLm5leHQobmV4dFNuYXBzaG90LnF1ZXJ5UGFyYW1zKTtcbiAgICB9XG4gICAgaWYgKGN1cnJlbnRTbmFwc2hvdC5mcmFnbWVudCAhPT0gbmV4dFNuYXBzaG90LmZyYWdtZW50KSB7XG4gICAgICAoPGFueT5yb3V0ZS5mcmFnbWVudCkubmV4dChuZXh0U25hcHNob3QuZnJhZ21lbnQpO1xuICAgIH1cbiAgICBpZiAoIXNoYWxsb3dFcXVhbChjdXJyZW50U25hcHNob3QucGFyYW1zLCBuZXh0U25hcHNob3QucGFyYW1zKSkge1xuICAgICAgKDxhbnk+cm91dGUucGFyYW1zKS5uZXh0KG5leHRTbmFwc2hvdC5wYXJhbXMpO1xuICAgIH1cbiAgICBpZiAoIXNoYWxsb3dFcXVhbEFycmF5cyhjdXJyZW50U25hcHNob3QudXJsLCBuZXh0U25hcHNob3QudXJsKSkge1xuICAgICAgKDxhbnk+cm91dGUudXJsKS5uZXh0KG5leHRTbmFwc2hvdC51cmwpO1xuICAgIH1cbiAgICBpZiAoIXNoYWxsb3dFcXVhbChjdXJyZW50U25hcHNob3QuZGF0YSwgbmV4dFNuYXBzaG90LmRhdGEpKSB7XG4gICAgICAoPGFueT5yb3V0ZS5kYXRhKS5uZXh0KG5leHRTbmFwc2hvdC5kYXRhKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcm91dGUuc25hcHNob3QgPSByb3V0ZS5fZnV0dXJlU25hcHNob3Q7XG5cbiAgICAvLyB0aGlzIGlzIGZvciByZXNvbHZlZCBkYXRhXG4gICAgKDxhbnk+cm91dGUuZGF0YSkubmV4dChyb3V0ZS5fZnV0dXJlU25hcHNob3QuZGF0YSk7XG4gIH1cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZXF1YWxQYXJhbXNBbmRVcmxTZWdtZW50cyhcbiAgICBhOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBiOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogYm9vbGVhbiB7XG4gIGNvbnN0IGVxdWFsVXJsUGFyYW1zID0gc2hhbGxvd0VxdWFsKGEucGFyYW1zLCBiLnBhcmFtcykgJiYgZXF1YWxTZWdtZW50cyhhLnVybCwgYi51cmwpO1xuICBjb25zdCBwYXJlbnRzTWlzbWF0Y2ggPSAhYS5wYXJlbnQgIT09ICFiLnBhcmVudDtcblxuICByZXR1cm4gZXF1YWxVcmxQYXJhbXMgJiYgIXBhcmVudHNNaXNtYXRjaCAmJlxuICAgICAgKCFhLnBhcmVudCB8fCBlcXVhbFBhcmFtc0FuZFVybFNlZ21lbnRzKGEucGFyZW50LCBiLnBhcmVudCAhKSk7XG59XG4iXX0=