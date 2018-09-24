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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3N0YXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yb3V0ZXJfc3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUFDLGVBQWUsRUFBYSxNQUFNLE1BQU0sQ0FBQztBQUNqRCxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFHbkMsT0FBTyxFQUFDLGNBQWMsRUFBb0IsaUJBQWlCLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDN0UsT0FBTyxFQUFDLFVBQVUsRUFBNEIsYUFBYSxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQy9FLE9BQU8sRUFBQyxZQUFZLEVBQUUsa0JBQWtCLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUNwRSxPQUFPLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUk1Qzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBMkJHO0FBQ0gsTUFBTSxrQkFBbUIsU0FBUSxJQUFvQjtJQUNuRCxnQkFBZ0I7SUFDaEIsWUFDSSxJQUE4QjtJQUM5QiwrQ0FBK0M7SUFDeEMsUUFBNkI7UUFDdEMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBREgsYUFBUSxHQUFSLFFBQVEsQ0FBcUI7UUFFdEMsY0FBYyxDQUFjLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsUUFBUSxLQUFhLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDeEQ7QUFFRCxNQUFNLDJCQUEyQixPQUFnQixFQUFFLGFBQThCO0lBQy9FLE1BQU0sUUFBUSxHQUFHLHdCQUF3QixDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztJQUNsRSxNQUFNLFFBQVEsR0FBRyxJQUFJLGVBQWUsQ0FBQyxDQUFDLElBQUksVUFBVSxD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Q0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdkYsTUFBTSxlQUFlLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUVoRCxPQUFPLGNBQWMsSUFBSSxDQUFDLGVBQWU7UUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUkseUJBQXlCLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBUSxDQUFDLENBQUMsQ0FBQztBQUNyRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1R5cGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtCZWhhdmlvclN1YmplY3QsIE9ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtEYXRhLCBSZXNvbHZlRGF0YSwgUm91dGV9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7UFJJTUFSWV9PVVRMRVQsIFBhcmFtTWFwLCBQYXJhbXMsIGNvbnZlcnRUb1BhcmFtTWFwfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge1VybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cCwgVXJsVHJlZSwgZXF1YWxTZWdtZW50c30gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge3NoYWxsb3dFcXVhbCwgc2hhbGxvd0VxdWFsQXJyYXlzfSBmcm9tICcuL3V0aWxzL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtUcmVlLCBUcmVlTm9kZX0gZnJvbSAnLi91dGlscy90cmVlJztcblxuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgc3RhdGUgb2YgdGhlIHJvdXRlci5cbiAqXG4gKiBSb3V0ZXJTdGF0ZSBpcyBhIHRyZWUgb2YgYWN0aXZhdGVkIHJvdXRlcy4gRXZlcnkgbm9kZSBpbiB0aGlzIHRyZWUga25vd3MgYWJvdXQgdGhlIFwiY29uc3VtZWRcIiBVUkxcbiAqIHNlZ21lbnRzLCB0aGUgZXh0cmFjdGVkIHBhcmFtZXRlcnMsIGFuZCB0aGUgcmVzb2x2ZWQgZGF0YS5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICogIyMjIEV4YW1wbGVcbiAqXG4gKiBgYGBcbiAqIEBDb21wb25lbnQoe3RlbXBsYXRlVXJsOid0ZW1wbGF0ZS5odG1sJ30pXG4gKiBjbGFzcyBNeUNvbXBvbmVudCB7XG4gKiAgIGNvbnN0cnVjdG9yKHJvdXRlcjogUm91dGVyKSB7XG4gKiAgICAgY29uc3Qgc3RhdGU6IFJvdXRlclN0YXRlID0gcm91dGVyLnJvdXRlclN0YXRlO1xuICogICAgIGNvbnN0IHJvb3Q6IEFjdGl2YXRlZFJvdXRlID0gc3RhdGUucm9vdDtcbiAqICAgICBjb25zdCBjaGlsZCA9IHJvb3QuZmlyc3RDaGlsZDtcbiAqICAgICBjb25zdCBpZDogT2JzZXJ2YWJsZTxzdHJpbmc+ID0gY2hpbGQucGFyYW1zLm1hcChwID0+IHAuaWQpO1xuICogICAgIC8vLi4uXG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIFNlZSBgQWN0aXZhdGVkUm91dGVgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICpcbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZXJTdGF0ZSBleHRlbmRzIFRyZWU8QWN0aXZhdGVkUm91dGU+IHtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJvb3Q6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPixcbiAgICAgIC8qKiBUaGUgY3VycmVudCBzbmFwc2hvdCBvZiB0aGUgcm91dGVyIHN0YXRlICovXG4gICAgICBwdWJsaWMgc25hcHNob3Q6IFJvdXRlclN0YXRlU25hcHNob3QpIHtcbiAgICBzdXBlcihyb290KTtcbiAgICBzZXRSb3V0ZXJTdGF0ZSg8Um91dGVyU3RhdGU+dGhpcywgcm9vdCk7XG4gIH1cblxuICB0b1N0cmluZygpOiBzdHJpbmcgeyByZXR1cm4gdGhpcy5zbmFwc2hvdC50b1N0cmluZygpOyB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbXB0eVN0YXRlKHVybFRyZWU6IFVybFRyZWUsIHJvb3RDb21wb25lbnQ6IFR5cGU8YW55PnwgbnVsbCk6IFJvdXRlclN0YXRlIHtcbiAgY29uc3Qgc25hcHNob3QgPSBjcmVhdGVFbXB0eVN0YXRlU25hcHNob3QodXJsVHJlZSwgcm9vdENvbXBvbmVudCk7XG4gIGNvbnN0IGVtcHR5VXJsID0gbmV3IEJlaGF2aW9yU3ViamVjdChbbmV3IFVybFNlZ21lbnQoJycsIHt9KV0pO1xuICBjb25zdCBlbXB0eVBhcmFtcyA9IG5ldyBCZWhhdmlvclN1YmplY3Qoe30pO1xuICBjb25zdCBlbXB0eURhdGEgPSBuZXcgQmVoYXZpb3JTdWJqZWN0KHt9KTtcbiAgY29uc3QgZW1wdHlRdWVyeVBhcmFtcyA9IG5ldyBCZWhhdmlvclN1YmplY3Qoe30pO1xuICBjb25zdCBmcmFnbWVudCA9IG5ldyBCZWhhdmlvclN1YmplY3QoJycpO1xuICBjb25zdCBhY3RpdmF0ZWQgPSBuZXcgQWN0aXZhdGVkUm91dGUoXG4gICAgICBlbXB0eVVybCwgZW1wdHlQYXJhbXMsIGVtcHR5UXVlcnlQYXJhbXMsIGZyYWdtZW50LCBlbXB0eURhdGEsIFBSSU1BUllfT1VUTEVULCByb290Q29tcG9uZW50LFxuICAgICAgc25hcHNob3Qucm9vdCk7XG4gIGFjdGl2YXRlZC5zbmFwc2hvdCA9IHNuYXBzaG90LnJvb3Q7XG4gIHJldHVybiBuZXcgUm91dGVyU3RhdGUobmV3IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPihhY3RpdmF0ZWQsIFtdKSwgc25hcHNob3QpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRW1wdHlTdGF0ZVNuYXBzaG90KFxuICAgIHVybFRyZWU6IFVybFRyZWUsIHJvb3RDb21wb25lbnQ6IFR5cGU8YW55PnwgbnVsbCk6IFJvdXRlclN0YXRlU25hcHNob3Qge1xuICBjb25zdCBlbXB0eVBhcmFtcyA9IHt9O1xuICBjb25zdCBlbXB0eURhdGEgPSB7fTtcbiAgY29uc3QgZW1wdHlRdWVyeVBhcmFtcyA9IHt9O1xuICBjb25zdCBmcmFnbWVudCA9ICcnO1xuICBjb25zdCBhY3RpdmF0ZWQgPSBuZXcgQWN0aXZhdGVkUm91dGVTbmFwc2hvdChcbiAgICAgIFtdLCBlbXB0eVBhcmFtcywgZW1wdHlRdWVyeVBhcmFtcywgZnJhZ21lbnQsIGVtcHR5RGF0YSwgUFJJTUFSWV9PVVRMRVQsIHJvb3RDb21wb25lbnQsIG51bGwsXG4gICAgICB1cmxUcmVlLnJvb3QsIC0xLCB7fSk7XG4gIHJldHVybiBuZXcgUm91dGVyU3RhdGVTbmFwc2hvdCgnJywgbmV3IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KGFjdGl2YXRlZCwgW10pKTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBDb250YWlucyB0aGUgaW5mb3JtYXRpb24gYWJvdXQgYSByb3V0ZSBhc3NvY2lhdGVkIHdpdGggYSBjb21wb25lbnQgbG9hZGVkIGluIGFuXG4gKiBvdXRsZXQuICBBbiBgQWN0aXZhdGVkUm91dGVgIGNhbiBhbHNvIGJlIHVzZWQgdG8gdHJhdmVyc2UgdGhlIHJvdXRlciBzdGF0ZSB0cmVlLlxuICpcbiAqIGBgYFxuICogQENvbXBvbmVudCh7Li4ufSlcbiAqIGNsYXNzIE15Q29tcG9uZW50IHtcbiAqICAgY29uc3RydWN0b3Iocm91dGU6IEFjdGl2YXRlZFJvdXRlKSB7XG4gKiAgICAgY29uc3QgaWQ6IE9ic2VydmFibGU8c3RyaW5nPiA9IHJvdXRlLnBhcmFtcy5tYXAocCA9PiBwLmlkKTtcbiAqICAgICBjb25zdCB1cmw6IE9ic2VydmFibGU8c3RyaW5nPiA9IHJvdXRlLnVybC5tYXAoc2VnbWVudHMgPT4gc2VnbWVudHMuam9pbignJykpO1xuICogICAgIC8vIHJvdXRlLmRhdGEgaW5jbHVkZXMgYm90aCBgZGF0YWAgYW5kIGByZXNvbHZlYFxuICogICAgIGNvbnN0IHVzZXIgPSByb3V0ZS5kYXRhLm1hcChkID0+IGQudXNlcik7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBBY3RpdmF0ZWRSb3V0ZSB7XG4gIC8qKiBUaGUgY3VycmVudCBzbmFwc2hvdCBvZiB0aGlzIHJvdXRlICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBzbmFwc2hvdCAhOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90O1xuICAvKiogQGludGVybmFsICovXG4gIF9mdXR1cmVTbmFwc2hvdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICAvLyBUT0RPKGlzc3VlLzI0NTcxKTogcmVtb3ZlICchJy5cbiAgX3JvdXRlclN0YXRlICE6IFJvdXRlclN0YXRlO1xuICAvKiogQGludGVybmFsICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBfcGFyYW1NYXAgITogT2JzZXJ2YWJsZTxQYXJhbU1hcD47XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIF9xdWVyeVBhcmFtTWFwICE6IE9ic2VydmFibGU8UGFyYW1NYXA+O1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogQW4gb2JzZXJ2YWJsZSBvZiB0aGUgVVJMIHNlZ21lbnRzIG1hdGNoZWQgYnkgdGhpcyByb3V0ZSAqL1xuICAgICAgcHVibGljIHVybDogT2JzZXJ2YWJsZTxVcmxTZWdtZW50W10+LFxuICAgICAgLyoqIEFuIG9ic2VydmFibGUgb2YgdGhlIG1hdHJpeCBwYXJhbWV0ZXJzIHNjb3BlZCB0byB0aGlzIHJvdXRlICovXG4gICAgICBwdWJsaWMgcGFyYW1zOiBPYnNlcnZhYmxlPFBhcmFtcz4sXG4gICAgICAvKiogQW4gb2JzZXJ2YWJsZSBvZiB0aGUgcXVlcnkgcGFyYW1ldGVycyBzaGFyZWQgYnkgYWxsIHRoZSByb3V0ZXMgKi9cbiAgICAgIHB1YmxpYyBxdWVyeVBhcmFtczogT2JzZXJ2YWJsZTxQYXJhbXM+LFxuICAgICAgLyoqIEFuIG9ic2VydmFibGUgb2YgdGhlIFVSTCBmcmFnbWVudCBzaGFyZWQgYnkgYWxsIHRoZSByb3V0ZXMgKi9cbiAgICAgIHB1YmxpYyBmcmFnbWVudDogT2JzZXJ2YWJsZTxzdHJpbmc+LFxuICAgICAgLyoqIEFuIG9ic2VydmFibGUgb2YgdGhlIHN0YXRpYyBhbmQgcmVzb2x2ZWQgZGF0YSBvZiB0aGlzIHJvdXRlLiAqL1xuICAgICAgcHVibGljIGRhdGE6IE9ic2VydmFibGU8RGF0YT4sXG4gICAgICAvKiogVGhlIG91dGxldCBuYW1lIG9mIHRoZSByb3V0ZS4gSXQncyBhIGNvbnN0YW50ICovXG4gICAgICBwdWJsaWMgb3V0bGV0OiBzdHJpbmcsXG4gICAgICAvKiogVGhlIGNvbXBvbmVudCBvZiB0aGUgcm91dGUuIEl0J3MgYSBjb25zdGFudCAqL1xuICAgICAgLy8gVE9ETyh2c2F2a2luKTogcmVtb3ZlIHxzdHJpbmdcbiAgICAgIHB1YmxpYyBjb21wb25lbnQ6IFR5cGU8YW55PnxzdHJpbmd8bnVsbCwgZnV0dXJlU25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpIHtcbiAgICB0aGlzLl9mdXR1cmVTbmFwc2hvdCA9IGZ1dHVyZVNuYXBzaG90O1xuICB9XG5cbiAgLyoqIFRoZSBjb25maWd1cmF0aW9uIHVzZWQgdG8gbWF0Y2ggdGhpcyByb3V0ZSAqL1xuICBnZXQgcm91dGVDb25maWcoKTogUm91dGV8bnVsbCB7IHJldHVybiB0aGlzLl9mdXR1cmVTbmFwc2hvdC5yb3V0ZUNvbmZpZzsgfVxuXG4gIC8qKiBUaGUgcm9vdCBvZiB0aGUgcm91dGVyIHN0YXRlICovXG4gIGdldCByb290KCk6IEFjdGl2YXRlZFJvdXRlIHsgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLnJvb3Q7IH1cblxuICAvKiogVGhlIHBhcmVudCBvZiB0aGlzIHJvdXRlIGluIHRoZSByb3V0ZXIgc3RhdGUgdHJlZSAqL1xuICBnZXQgcGFyZW50KCk6IEFjdGl2YXRlZFJvdXRlfG51bGwgeyByZXR1cm4gdGhpcy5fcm91dGVyU3RhdGUucGFyZW50KHRoaXMpOyB9XG5cbiAgLyoqIFRoZSBmaXJzdCBjaGlsZCBvZiB0aGlzIHJvdXRlIGluIHRoZSByb3V0ZXIgc3RhdGUgdHJlZSAqL1xuICBnZXQgZmlyc3RDaGlsZCgpOiBBY3RpdmF0ZWRSb3V0ZXxudWxsIHsgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLmZpcnN0Q2hpbGQodGhpcyk7IH1cblxuICAvKiogVGhlIGNoaWxkcmVuIG9mIHRoaXMgcm91dGUgaW4gdGhlIHJvdXRlciBzdGF0ZSB0cmVlICovXG4gIGdldCBjaGlsZHJlbigpOiBBY3RpdmF0ZWRSb3V0ZVtdIHsgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLmNoaWxkcmVuKHRoaXMpOyB9XG5cbiAgLyoqIFRoZSBwYXRoIGZyb20gdGhlIHJvb3Qgb2YgdGhlIHJvdXRlciBzdGF0ZSB0cmVlIHRvIHRoaXMgcm91dGUgKi9cbiAgZ2V0IHBhdGhGcm9tUm9vdCgpOiBBY3RpdmF0ZWRSb3V0ZVtdIHsgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLnBhdGhGcm9tUm9vdCh0aGlzKTsgfVxuXG4gIGdldCBwYXJhbU1hcCgpOiBPYnNlcnZhYmxlPFBhcmFtTWFwPiB7XG4gICAgaWYgKCF0aGlzLl9wYXJhbU1hcCkge1xuICAgICAgdGhpcy5fcGFyYW1NYXAgPSB0aGlzLnBhcmFtcy5waXBlKG1hcCgocDogUGFyYW1zKTogUGFyYW1NYXAgPT4gY29udmVydFRvUGFyYW1NYXAocCkpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3BhcmFtTWFwO1xuICB9XG5cbiAgZ2V0IHF1ZXJ5UGFyYW1NYXAoKTogT2JzZXJ2YWJsZTxQYXJhbU1hcD4ge1xuICAgIGlmICghdGhpcy5fcXVlcnlQYXJhbU1hcCkge1xuICAgICAgdGhpcy5fcXVlcnlQYXJhbU1hcCA9XG4gICAgICAgICAgdGhpcy5xdWVyeVBhcmFtcy5waXBlKG1hcCgocDogUGFyYW1zKTogUGFyYW1NYXAgPT4gY29udmVydFRvUGFyYW1NYXAocCkpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UGFyYW1NYXA7XG4gIH1cblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnNuYXBzaG90ID8gdGhpcy5zbmFwc2hvdC50b1N0cmluZygpIDogYEZ1dHVyZSgke3RoaXMuX2Z1dHVyZVNuYXBzaG90fSlgO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIFBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kgPSAnZW1wdHlPbmx5JyB8ICdhbHdheXMnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBJbmhlcml0ZWQgPSB7XG4gIHBhcmFtczogUGFyYW1zLFxuICBkYXRhOiBEYXRhLFxuICByZXNvbHZlOiBEYXRhLFxufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBpbmhlcml0ZWQgcGFyYW1zLCBkYXRhLCBhbmQgcmVzb2x2ZSBmb3IgYSBnaXZlbiByb3V0ZS5cbiAqIEJ5IGRlZmF1bHQsIHRoaXMgb25seSBpbmhlcml0cyB2YWx1ZXMgdXAgdG8gdGhlIG5lYXJlc3QgcGF0aC1sZXNzIG9yIGNvbXBvbmVudC1sZXNzIHJvdXRlLlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbmhlcml0ZWRQYXJhbXNEYXRhUmVzb2x2ZShcbiAgICByb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCxcbiAgICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiBQYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5ID0gJ2VtcHR5T25seScpOiBJbmhlcml0ZWQge1xuICBjb25zdCBwYXRoRnJvbVJvb3QgPSByb3V0ZS5wYXRoRnJvbVJvb3Q7XG5cbiAgbGV0IGluaGVyaXRpbmdTdGFydGluZ0Zyb20gPSAwO1xuICBpZiAocGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSAhPT0gJ2Fsd2F5cycpIHtcbiAgICBpbmhlcml0aW5nU3RhcnRpbmdGcm9tID0gcGF0aEZyb21Sb290Lmxlbmd0aCAtIDE7XG5cbiAgICB3aGlsZSAoaW5oZXJpdGluZ1N0YXJ0aW5nRnJvbSA+PSAxKSB7XG4gICAgICBjb25zdCBjdXJyZW50ID0gcGF0aEZyb21Sb290W2luaGVyaXRpbmdTdGFydGluZ0Zyb21dO1xuICAgICAgY29uc3QgcGFyZW50ID0gcGF0aEZyb21Sb290W2luaGVyaXRpbmdTdGFydGluZ0Zyb20gLSAxXTtcbiAgICAgIC8vIGN1cnJlbnQgcm91dGUgaXMgYW4gZW1wdHkgcGF0aCA9PiBpbmhlcml0cyBpdHMgcGFyZW50J3MgcGFyYW1zIGFuZCBkYXRhXG4gICAgICBpZiAoY3VycmVudC5yb3V0ZUNvbmZpZyAmJiBjdXJyZW50LnJvdXRlQ29uZmlnLnBhdGggPT09ICcnKSB7XG4gICAgICAgIGluaGVyaXRpbmdTdGFydGluZ0Zyb20tLTtcblxuICAgICAgICAvLyBwYXJlbnQgaXMgY29tcG9uZW50bGVzcyA9PiBjdXJyZW50IHJvdXRlIHNob3VsZCBpbmhlcml0IGl0cyBwYXJhbXMgYW5kIGRhdGFcbiAgICAgIH0gZWxzZSBpZiAoIXBhcmVudC5jb21wb25lbnQpIHtcbiAgICAgICAgaW5oZXJpdGluZ1N0YXJ0aW5nRnJvbS0tO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmxhdHRlbkluaGVyaXRlZChwYXRoRnJvbVJvb3Quc2xpY2UoaW5oZXJpdGluZ1N0YXJ0aW5nRnJvbSkpO1xufVxuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBmbGF0dGVuSW5oZXJpdGVkKHBhdGhGcm9tUm9vdDogQWN0aXZhdGVkUm91dGVTbmFwc2hvdFtdKTogSW5oZXJpdGVkIHtcbiAgcmV0dXJuIHBhdGhGcm9tUm9vdC5yZWR1Y2UoKHJlcywgY3VycikgPT4ge1xuICAgIGNvbnN0IHBhcmFtcyA9IHsuLi5yZXMucGFyYW1zLCAuLi5jdXJyLnBhcmFtc307XG4gICAgY29uc3QgZGF0YSA9IHsuLi5yZXMuZGF0YSwgLi4uY3Vyci5kYXRhfTtcbiAgICBjb25zdCByZXNvbHZlID0gey4uLnJlcy5yZXNvbHZlLCAuLi5jdXJyLl9yZXNvbHZlZERhdGF9O1xuICAgIHJldHVybiB7cGFyYW1zLCBkYXRhLCByZXNvbHZlfTtcbiAgfSwgPGFueT57cGFyYW1zOiB7fSwgZGF0YToge30sIHJlc29sdmU6IHt9fSk7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQ29udGFpbnMgdGhlIGluZm9ybWF0aW9uIGFib3V0IGEgcm91dGUgYXNzb2NpYXRlZCB3aXRoIGEgY29tcG9uZW50IGxvYWRlZCBpbiBhblxuICogb3V0bGV0IGF0IGEgcGFydGljdWxhciBtb21lbnQgaW4gdGltZS4gQWN0aXZhdGVkUm91dGVTbmFwc2hvdCBjYW4gYWxzbyBiZSB1c2VkIHRvXG4gKiB0cmF2ZXJzZSB0aGUgcm91dGVyIHN0YXRlIHRyZWUuXG4gKlxuICogYGBgXG4gKiBAQ29tcG9uZW50KHt0ZW1wbGF0ZVVybDonLi9teS1jb21wb25lbnQuaHRtbCd9KVxuICogY2xhc3MgTXlDb21wb25lbnQge1xuICogICBjb25zdHJ1Y3Rvcihyb3V0ZTogQWN0aXZhdGVkUm91dGUpIHtcbiAqICAgICBjb25zdCBpZDogc3RyaW5nID0gcm91dGUuc25hcHNob3QucGFyYW1zLmlkO1xuICogICAgIGNvbnN0IHVybDogc3RyaW5nID0gcm91dGUuc25hcHNob3QudXJsLmpvaW4oJycpO1xuICogICAgIGNvbnN0IHVzZXIgPSByb3V0ZS5zbmFwc2hvdC5kYXRhLnVzZXI7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90IHtcbiAgLyoqIFRoZSBjb25maWd1cmF0aW9uIHVzZWQgdG8gbWF0Y2ggdGhpcyByb3V0ZSAqKi9cbiAgcHVibGljIHJlYWRvbmx5IHJvdXRlQ29uZmlnOiBSb3V0ZXxudWxsO1xuICAvKiogQGludGVybmFsICoqL1xuICBfdXJsU2VnbWVudDogVXJsU2VnbWVudEdyb3VwO1xuICAvKiogQGludGVybmFsICovXG4gIF9sYXN0UGF0aEluZGV4OiBudW1iZXI7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX3Jlc29sdmU6IFJlc29sdmVEYXRhO1xuICAvKiogQGludGVybmFsICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBfcmVzb2x2ZWREYXRhICE6IERhdGE7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIF9yb3V0ZXJTdGF0ZSAhOiBSb3V0ZXJTdGF0ZVNuYXBzaG90O1xuICAvKiogQGludGVybmFsICovXG4gIC8vIFRPRE8oaXNzdWUvMjQ1NzEpOiByZW1vdmUgJyEnLlxuICBfcGFyYW1NYXAgITogUGFyYW1NYXA7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIF9xdWVyeVBhcmFtTWFwICE6IFBhcmFtTWFwO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogVGhlIFVSTCBzZWdtZW50cyBtYXRjaGVkIGJ5IHRoaXMgcm91dGUgKi9cbiAgICAgIHB1YmxpYyB1cmw6IFVybFNlZ21lbnRbXSxcbiAgICAgIC8qKiBUaGUgbWF0cml4IHBhcmFtZXRlcnMgc2NvcGVkIHRvIHRoaXMgcm91dGUgKi9cbiAgICAgIHB1YmxpYyBwYXJhbXM6IFBhcmFtcyxcbiAgICAgIC8qKiBUaGUgcXVlcnkgcGFyYW1ldGVycyBzaGFyZWQgYnkgYWxsIHRoZSByb3V0ZXMgKi9cbiAgICAgIHB1YmxpYyBxdWVyeVBhcmFtczogUGFyYW1zLFxuICAgICAgLyoqIFRoZSBVUkwgZnJhZ21lbnQgc2hhcmVkIGJ5IGFsbCB0aGUgcm91dGVzICovXG4gICAgICBwdWJsaWMgZnJhZ21lbnQ6IHN0cmluZyxcbiAgICAgIC8qKiBUaGUgc3RhdGljIGFuZCByZXNvbHZlZCBkYXRhIG9mIHRoaXMgcm91dGUgKi9cbiAgICAgIHB1YmxpYyBkYXRhOiBEYXRhLFxuICAgICAgLyoqIFRoZSBvdXRsZXQgbmFtZSBvZiB0aGUgcm91dGUgKi9cbiAgICAgIHB1YmxpYyBvdXRsZXQ6IHN0cmluZyxcbiAgICAgIC8qKiBUaGUgY29tcG9uZW50IG9mIHRoZSByb3V0ZSAqL1xuICAgICAgcHVibGljIGNvbXBvbmVudDogVHlwZTxhbnk+fHN0cmluZ3xudWxsLCByb3V0ZUNvbmZpZzogUm91dGV8bnVsbCwgdXJsU2VnbWVudDogVXJsU2VnbWVudEdyb3VwLFxuICAgICAgbGFzdFBhdGhJbmRleDogbnVtYmVyLCByZXNvbHZlOiBSZXNvbHZlRGF0YSkge1xuICAgIHRoaXMucm91dGVDb25maWcgPSByb3V0ZUNvbmZpZztcbiAgICB0aGlzLl91cmxTZWdtZW50ID0gdXJsU2VnbWVudDtcbiAgICB0aGlzLl9sYXN0UGF0aEluZGV4ID0gbGFzdFBhdGhJbmRleDtcbiAgICB0aGlzLl9yZXNvbHZlID0gcmVzb2x2ZTtcbiAgfVxuXG4gIC8qKiBUaGUgcm9vdCBvZiB0aGUgcm91dGVyIHN0YXRlICovXG4gIGdldCByb290KCk6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QgeyByZXR1cm4gdGhpcy5fcm91dGVyU3RhdGUucm9vdDsgfVxuXG4gIC8qKiBUaGUgcGFyZW50IG9mIHRoaXMgcm91dGUgaW4gdGhlIHJvdXRlciBzdGF0ZSB0cmVlICovXG4gIGdldCBwYXJlbnQoKTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdHxudWxsIHsgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLnBhcmVudCh0aGlzKTsgfVxuXG4gIC8qKiBUaGUgZmlyc3QgY2hpbGQgb2YgdGhpcyByb3V0ZSBpbiB0aGUgcm91dGVyIHN0YXRlIHRyZWUgKi9cbiAgZ2V0IGZpcnN0Q2hpbGQoKTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdHxudWxsIHsgcmV0dXJuIHRoaXMuX3JvdXRlclN0YXRlLmZpcnN0Q2hpbGQodGhpcyk7IH1cblxuICAvKiogVGhlIGNoaWxkcmVuIG9mIHRoaXMgcm91dGUgaW4gdGhlIHJvdXRlciBzdGF0ZSB0cmVlICovXG4gIGdldCBjaGlsZHJlbigpOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90W10geyByZXR1cm4gdGhpcy5fcm91dGVyU3RhdGUuY2hpbGRyZW4odGhpcyk7IH1cblxuICAvKiogVGhlIHBhdGggZnJvbSB0aGUgcm9vdCBvZiB0aGUgcm91dGVyIHN0YXRlIHRyZWUgdG8gdGhpcyByb3V0ZSAqL1xuICBnZXQgcGF0aEZyb21Sb290KCk6IEFjdGl2YXRlZFJvdXRlU25hcHNob3RbXSB7IHJldHVybiB0aGlzLl9yb3V0ZXJTdGF0ZS5wYXRoRnJvbVJvb3QodGhpcyk7IH1cblxuICBnZXQgcGFyYW1NYXAoKTogUGFyYW1NYXAge1xuICAgIGlmICghdGhpcy5fcGFyYW1NYXApIHtcbiAgICAgIHRoaXMuX3BhcmFtTWFwID0gY29udmVydFRvUGFyYW1NYXAodGhpcy5wYXJhbXMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcGFyYW1NYXA7XG4gIH1cblxuICBnZXQgcXVlcnlQYXJhbU1hcCgpOiBQYXJhbU1hcCB7XG4gICAgaWYgKCF0aGlzLl9xdWVyeVBhcmFtTWFwKSB7XG4gICAgICB0aGlzLl9xdWVyeVBhcmFtTWFwID0gY29udmVydFRvUGFyYW1NYXAodGhpcy5xdWVyeVBhcmFtcyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9xdWVyeVBhcmFtTWFwO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLnVybC5tYXAoc2VnbWVudCA9PiBzZWdtZW50LnRvU3RyaW5nKCkpLmpvaW4oJy8nKTtcbiAgICBjb25zdCBtYXRjaGVkID0gdGhpcy5yb3V0ZUNvbmZpZyA/IHRoaXMucm91dGVDb25maWcucGF0aCA6ICcnO1xuICAgIHJldHVybiBgUm91dGUodXJsOicke3VybH0nLCBwYXRoOicke21hdGNoZWR9JylgO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgc3RhdGUgb2YgdGhlIHJvdXRlciBhdCBhIG1vbWVudCBpbiB0aW1lLlxuICpcbiAqIFRoaXMgaXMgYSB0cmVlIG9mIGFjdGl2YXRlZCByb3V0ZSBzbmFwc2hvdHMuIEV2ZXJ5IG5vZGUgaW4gdGhpcyB0cmVlIGtub3dzIGFib3V0XG4gKiB0aGUgXCJjb25zdW1lZFwiIFVSTCBzZWdtZW50cywgdGhlIGV4dHJhY3RlZCBwYXJhbWV0ZXJzLCBhbmQgdGhlIHJlc29sdmVkIGRhdGEuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqICMjIyBFeGFtcGxlXG4gKlxuICogYGBgXG4gKiBAQ29tcG9uZW50KHt0ZW1wbGF0ZVVybDondGVtcGxhdGUuaHRtbCd9KVxuICogY2xhc3MgTXlDb21wb25lbnQge1xuICogICBjb25zdHJ1Y3Rvcihyb3V0ZXI6IFJvdXRlcikge1xuICogICAgIGNvbnN0IHN0YXRlOiBSb3V0ZXJTdGF0ZSA9IHJvdXRlci5yb3V0ZXJTdGF0ZTtcbiAqICAgICBjb25zdCBzbmFwc2hvdDogUm91dGVyU3RhdGVTbmFwc2hvdCA9IHN0YXRlLnNuYXBzaG90O1xuICogICAgIGNvbnN0IHJvb3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QgPSBzbmFwc2hvdC5yb290O1xuICogICAgIGNvbnN0IGNoaWxkID0gcm9vdC5maXJzdENoaWxkO1xuICogICAgIGNvbnN0IGlkOiBPYnNlcnZhYmxlPHN0cmluZz4gPSBjaGlsZC5wYXJhbXMubWFwKHAgPT4gcC5pZCk7XG4gKiAgICAgLy8uLi5cbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICpcbiAqL1xuZXhwb3J0IGNsYXNzIFJvdXRlclN0YXRlU25hcHNob3QgZXh0ZW5kcyBUcmVlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+IHtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBUaGUgdXJsIGZyb20gd2hpY2ggdGhpcyBzbmFwc2hvdCB3YXMgY3JlYXRlZCAqL1xuICAgICAgcHVibGljIHVybDogc3RyaW5nLCByb290OiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pikge1xuICAgIHN1cGVyKHJvb3QpO1xuICAgIHNldFJvdXRlclN0YXRlKDxSb3V0ZXJTdGF0ZVNuYXBzaG90PnRoaXMsIHJvb3QpO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHsgcmV0dXJuIHNlcmlhbGl6ZU5vZGUodGhpcy5fcm9vdCk7IH1cbn1cblxuZnVuY3Rpb24gc2V0Um91dGVyU3RhdGU8VSwgVCBleHRlbmRze19yb3V0ZXJTdGF0ZTogVX0+KHN0YXRlOiBVLCBub2RlOiBUcmVlTm9kZTxUPik6IHZvaWQge1xuICBub2RlLnZhbHVlLl9yb3V0ZXJTdGF0ZSA9IHN0YXRlO1xuICBub2RlLmNoaWxkcmVuLmZvckVhY2goYyA9PiBzZXRSb3V0ZXJTdGF0ZShzdGF0ZSwgYykpO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVOb2RlKG5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KTogc3RyaW5nIHtcbiAgY29uc3QgYyA9IG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCA/IGAgeyAke25vZGUuY2hpbGRyZW4ubWFwKHNlcmlhbGl6ZU5vZGUpLmpvaW4oJywgJyl9IH0gYCA6ICcnO1xuICByZXR1cm4gYCR7bm9kZS52YWx1ZX0ke2N9YDtcbn1cblxuLyoqXG4gKiBUaGUgZXhwZWN0YXRpb24gaXMgdGhhdCB0aGUgYWN0aXZhdGUgcm91dGUgaXMgY3JlYXRlZCB3aXRoIHRoZSByaWdodCBzZXQgb2YgcGFyYW1ldGVycy5cbiAqIFNvIHdlIHB1c2ggbmV3IHZhbHVlcyBpbnRvIHRoZSBvYnNlcnZhYmxlcyBvbmx5IHdoZW4gdGhleSBhcmUgbm90IHRoZSBpbml0aWFsIHZhbHVlcy5cbiAqIEFuZCB3ZSBkZXRlY3QgdGhhdCBieSBjaGVja2luZyBpZiB0aGUgc25hcHNob3QgZmllbGQgaXMgc2V0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWR2YW5jZUFjdGl2YXRlZFJvdXRlKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSk6IHZvaWQge1xuICBpZiAocm91dGUuc25hcHNob3QpIHtcbiAgICBjb25zdCBjdXJyZW50U25hcHNob3QgPSByb3V0ZS5zbmFwc2hvdDtcbiAgICBjb25zdCBuZXh0U25hcHNob3QgPSByb3V0ZS5fZnV0dXJlU25hcHNob3Q7XG4gICAgcm91dGUuc25hcHNob3QgPSBuZXh0U25hcHNob3Q7XG4gICAgaWYgKCFzaGFsbG93RXF1YWwoY3VycmVudFNuYXBzaG90LnF1ZXJ5UGFyYW1zLCBuZXh0U25hcHNob3QucXVlcnlQYXJhbXMpKSB7XG4gICAgICAoPGFueT5yb3V0ZS5xdWVyeVBhcmFtcykubmV4dChuZXh0U25hcHNob3QucXVlcnlQYXJhbXMpO1xuICAgIH1cbiAgICBpZiAoY3VycmVudFNuYXBzaG90LmZyYWdtZW50ICE9PSBuZXh0U25hcHNob3QuZnJhZ21lbnQpIHtcbiAgICAgICg8YW55PnJvdXRlLmZyYWdtZW50KS5uZXh0KG5leHRTbmFwc2hvdC5mcmFnbWVudCk7XG4gICAgfVxuICAgIGlmICghc2hhbGxvd0VxdWFsKGN1cnJlbnRTbmFwc2hvdC5wYXJhbXMsIG5leHRTbmFwc2hvdC5wYXJhbXMpKSB7XG4gICAgICAoPGFueT5yb3V0ZS5wYXJhbXMpLm5leHQobmV4dFNuYXBzaG90LnBhcmFtcyk7XG4gICAgfVxuICAgIGlmICghc2hhbGxvd0VxdWFsQXJyYXlzKGN1cnJlbnRTbmFwc2hvdC51cmwsIG5leHRTbmFwc2hvdC51cmwpKSB7XG4gICAgICAoPGFueT5yb3V0ZS51cmwpLm5leHQobmV4dFNuYXBzaG90LnVybCk7XG4gICAgfVxuICAgIGlmICghc2hhbGxvd0VxdWFsKGN1cnJlbnRTbmFwc2hvdC5kYXRhLCBuZXh0U25hcHNob3QuZGF0YSkpIHtcbiAgICAgICg8YW55PnJvdXRlLmRhdGEpLm5leHQobmV4dFNuYXBzaG90LmRhdGEpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByb3V0ZS5zbmFwc2hvdCA9IHJvdXRlLl9mdXR1cmVTbmFwc2hvdDtcblxuICAgIC8vIHRoaXMgaXMgZm9yIHJlc29sdmVkIGRhdGFcbiAgICAoPGFueT5yb3V0ZS5kYXRhKS5uZXh0KHJvdXRlLl9mdXR1cmVTbmFwc2hvdC5kYXRhKTtcbiAgfVxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbFBhcmFtc0FuZFVybFNlZ21lbnRzKFxuICAgIGE6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGI6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBib29sZWFuIHtcbiAgY29uc3QgZXF1YWxVcmxQYXJhbXMgPSBzaGFsbG93RXF1YWwoYS5wYXJhbXMsIGIucGFyYW1zKSAmJiBlcXVhbFNlZ21lbnRzKGEudXJsLCBiLnVybCk7XG4gIGNvbnN0IHBhcmVudHNNaXNtYXRjaCA9ICFhLnBhcmVudCAhPT0gIWIucGFyZW50O1xuXG4gIHJldHVybiBlcXVhbFVybFBhcmFtcyAmJiAhcGFyZW50c01pc21hdGNoICYmXG4gICAgICAoIWEucGFyZW50IHx8IGVxdWFsUGFyYW1zQW5kVXJsU2VnbWVudHMoYS5wYXJlbnQsIGIucGFyZW50ICEpKTtcbn1cbiJdfQ==