/**
 * @license Angular v16.0.0-next.4+sha-c024574
 * (c) 2010-2022 Google LLC. https://angular.io/
 * License: MIT
 */


import { AfterContentInit } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { Compiler } from '@angular/core';
import { ComponentRef } from '@angular/core';
import { ElementRef } from '@angular/core';
import { EnvironmentInjector } from '@angular/core';
import { EnvironmentProviders } from '@angular/core';
import { EventEmitter } from '@angular/core';
import * as i0 from '@angular/core';
import { InjectionToken } from '@angular/core';
import { Injector } from '@angular/core';
import { LocationStrategy } from '@angular/common';
import { ModuleWithProviders } from '@angular/core';
import { NgModuleFactory } from '@angular/core';
import { Observable } from 'rxjs';
import { OnChanges } from '@angular/core';
import { OnDestroy } from '@angular/core';
import { OnInit } from '@angular/core';
import { Provider } from '@angular/core';
import { ProviderToken } from '@angular/core';
import { QueryList } from '@angular/core';
import { Renderer2 } from '@angular/core';
import { SimpleChanges } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Type } from '@angular/core';
import { Version } from '@angular/core';

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
export declare class ActivatedRoute {
    /** An observable of the URL segments matched by this route. */
    url: Observable<UrlSegment[]>;
    /** An observable of the matrix parameters scoped to this route. */
    params: Observable<Params>;
    /** An observable of the query parameters shared by all the routes. */
    queryParams: Observable<Params>;
    /** An observable of the URL fragment shared by all the routes. */
    fragment: Observable<string | null>;
    /** An observable of the static and resolved data of this route. */
    data: Observable<Data>;
    /** The outlet name of the route, a constant. */
    outlet: string;
    /** The component of the route, a constant. */
    component: Type<any> | null;
    /** The current snapshot of this route */
    snapshot: ActivatedRouteSnapshot;
    /** An Observable of the resolved route title */
    readonly title: Observable<string | undefined>;
    /** The configuration used to match this route. */
    get routeConfig(): Route | null;
    /** The root of the router state. */
    get root(): ActivatedRoute;
    /** The parent of this route in the router state tree. */
    get parent(): ActivatedRoute | null;
    /** The first child of this route in the router state tree. */
    get firstChild(): ActivatedRoute | null;
    /** The children of this route in the router state tree. */
    get children(): ActivatedRoute[];
    /** The path from the root of the router state tree to this route. */
    get pathFromRoot(): ActivatedRoute[];
    /**
     * An Observable that contains a map of the required and optional parameters
     * specific to the route.
     * The map supports retrieving single and multiple values from the same parameter.
     */
    get paramMap(): Observable<ParamMap>;
    /**
     * An Observable that contains a map of the query parameters available to all routes.
     * The map supports retrieving single and multiple values from the query parameter.
     */
    get queryParamMap(): Observable<ParamMap>;
    toString(): string;
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
export declare class ActivatedRouteSnapshot {
    /** The URL segments matched by this route */
    url: UrlSegment[];
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
    params: Params;
    /** The query parameters shared by all the routes */
    queryParams: Params;
    /** The URL fragment shared by all the routes */
    fragment: string | null;
    /** The static and resolved data of this route */
    data: Data;
    /** The outlet name of the route */
    outlet: string;
    /** The component of the route */
    component: Type<any> | null;
    /** The configuration used to match this route **/
    readonly routeConfig: Route | null;
    /** The resolved route title */
    get title(): string | undefined;
    /** The root of the router state */
    get root(): ActivatedRouteSnapshot;
    /** The parent of this route in the router state tree */
    get parent(): ActivatedRouteSnapshot | null;
    /** The first child of this route in the router state tree */
    get firstChild(): ActivatedRouteSnapshot | null;
    /** The children of this route in the router state tree */
    get children(): ActivatedRouteSnapshot[];
    /** The path from the root of the router state tree to this route */
    get pathFromRoot(): ActivatedRouteSnapshot[];
    get paramMap(): ParamMap;
    get queryParamMap(): ParamMap;
    toString(): string;
}

/**
 * An event triggered at the end of the activation part
 * of the Resolve phase of routing.
 * @see `ActivationStart`
 * @see `ResolveStart`
 *
 * @publicApi
 */
export declare class ActivationEnd {
    /** @docsNotRequired */
    snapshot: ActivatedRouteSnapshot;
    readonly type = EventType.ActivationEnd;
    constructor(
    /** @docsNotRequired */
    snapshot: ActivatedRouteSnapshot);
    toString(): string;
}

/**
 * An event triggered at the start of the activation part
 * of the Resolve phase of routing.
 * @see `ActivationEnd`
 * @see `ResolveStart`
 *
 * @publicApi
 */
export declare class ActivationStart {
    /** @docsNotRequired */
    snapshot: ActivatedRouteSnapshot;
    readonly type = EventType.ActivationStart;
    constructor(
    /** @docsNotRequired */
    snapshot: ActivatedRouteSnapshot);
    toString(): string;
}

/**
 * @description
 *
 * This base route reuse strategy only reuses routes when the matched router configs are
 * identical. This prevents components from being destroyed and recreated
 * when just the route parameters, query parameters or fragment change
 * (that is, the existing component is _reused_).
 *
 * This strategy does not store any routes for later reuse.
 *
 * Angular uses this strategy by default.
 *
 *
 * It can be used as a base class for custom route reuse strategies, i.e. you can create your own
 * class that extends the `BaseRouteReuseStrategy` one.
 * @publicApi
 */
export declare abstract class BaseRouteReuseStrategy implements RouteReuseStrategy {
    /**
     * Whether the given route should detach for later reuse.
     * Always returns false for `BaseRouteReuseStrategy`.
     * */
    shouldDetach(route: ActivatedRouteSnapshot): boolean;
    /**
     * A no-op; the route is never stored since this strategy never detaches routes for later re-use.
     */
    store(route: ActivatedRouteSnapshot, detachedTree: DetachedRouteHandle): void;
    /** Returns `false`, meaning the route (and its subtree) is never reattached */
    shouldAttach(route: ActivatedRouteSnapshot): boolean;
    /** Returns `null` because this strategy does not store routes for later re-use. */
    retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null;
    /**
     * Determines if a route should be reused.
     * This strategy returns `true` when the future route config and current route config are
     * identical.
     */
    shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean;
}

/**
 * @description
 *
 * Interface that a class can implement to be a guard deciding if a route can be activated.
 * If all guards return `true`, navigation continues. If any guard returns `false`,
 * navigation is cancelled. If any guard returns a `UrlTree`, the current navigation
 * is cancelled and a new navigation begins to the `UrlTree` returned from the guard.
 *
 * The following example implements a `CanActivate` function that checks whether the
 * current user has permission to activate the requested route.
 *
 * ```
 * class UserToken {}
 * class Permissions {
 *   canActivate(): boolean {
 *     return true;
 *   }
 * }
 *
 * @Injectable()
 * class CanActivateTeam implements CanActivate {
 *   constructor(private permissions: Permissions, private currentUser: UserToken) {}
 *
 *   canActivate(
 *     route: ActivatedRouteSnapshot,
 *     state: RouterStateSnapshot
 *   ): Observable<boolean|UrlTree>|Promise<boolean|UrlTree>|boolean|UrlTree {
 *     return this.permissions.canActivate(this.currentUser, route.params.id);
 *   }
 * }
 * ```
 *
 * Here, the defined guard function is provided as part of the `Route` object
 * in the router configuration:
 *
 * ```
 * @NgModule({
 *   imports: [
 *     RouterModule.forRoot([
 *       {
 *         path: 'team/:id',
 *         component: TeamComponent,
 *         canActivate: [CanActivateTeam]
 *       }
 *     ])
 *   ],
 *   providers: [CanActivateTeam, UserToken, Permissions]
 * })
 * class AppModule {}
 * ```
 *
 * @publicApi
 * @deprecated Class-based `Route` guards are deprecated in favor of functional guards. An
 *     injectable class can be used as a functional guard using the `inject` function:
 *     `canActivate: [() => inject(myGuard).canActivate()]`.
 * @see `CanActivateFn`
 */
export declare interface CanActivate {
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree;
}

/**
 * @description
 *
 * Interface that a class can implement to be a guard deciding if a child route can be activated.
 * If all guards return `true`, navigation continues. If any guard returns `false`,
 * navigation is cancelled. If any guard returns a `UrlTree`, current navigation
 * is cancelled and a new navigation begins to the `UrlTree` returned from the guard.
 *
 * The following example implements a `CanActivateChild` function that checks whether the
 * current user has permission to activate the requested child route.
 *
 * ```
 * class UserToken {}
 * class Permissions {
 *   canActivate(user: UserToken, id: string): boolean {
 *     return true;
 *   }
 * }
 *
 * @Injectable()
 * class CanActivateTeam implements CanActivateChild {
 *   constructor(private permissions: Permissions, private currentUser: UserToken) {}
 *
 *   canActivateChild(
 *     route: ActivatedRouteSnapshot,
 *     state: RouterStateSnapshot
 *   ): Observable<boolean|UrlTree>|Promise<boolean|UrlTree>|boolean|UrlTree {
 *     return this.permissions.canActivate(this.currentUser, route.params.id);
 *   }
 * }
 * ```
 *
 * Here, the defined guard function is provided as part of the `Route` object
 * in the router configuration:
 *
 * ```
 * @NgModule({
 *   imports: [
 *     RouterModule.forRoot([
 *       {
 *         path: 'root',
 *         canActivateChild: [CanActivateTeam],
 *         children: [
 *           {
 *              path: 'team/:id',
 *              component: TeamComponent
 *           }
 *         ]
 *       }
 *     ])
 *   ],
 *   providers: [CanActivateTeam, UserToken, Permissions]
 * })
 * class AppModule {}
 * ```
 *
 * @publicApi
 * @deprecated Class-based `Route` guards are deprecated in favor of functional guards. An
 *     injectable class can be used as a functional guard using the `inject` function:
 *     `canActivateChild: [() => inject(myGuard).canActivateChild()]`.
 * @see `CanActivateChildFn`
 */
export declare interface CanActivateChild {
    canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree;
}

/**
 * The signature of a function used as a `canActivateChild` guard on a `Route`.
 *
 * If all guards return `true`, navigation continues. If any guard returns `false`,
 * navigation is cancelled. If any guard returns a `UrlTree`, the current navigation
 * is cancelled and a new navigation begins to the `UrlTree` returned from the guard.
 *
 * The following example implements a `canActivate` function that checks whether the
 * current user has permission to activate the requested route.
 *
 * {@example router/route_functional_guards.ts region="CanActivateChildFn"}
 *
 * @publicApi
 * @see `Route`
 */
export declare type CanActivateChildFn = (childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot) => Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree;

/**
 * The signature of a function used as a `canActivate` guard on a `Route`.
 *
 * If all guards return `true`, navigation continues. If any guard returns `false`,
 * navigation is cancelled. If any guard returns a `UrlTree`, the current navigation
 * is cancelled and a new navigation begins to the `UrlTree` returned from the guard.
 *
 * The following example implements and uses a `CanActivateChildFn` that checks whether the
 * current user has permission to activate the requested route.
 *
 * {@example router/route_functional_guards.ts region="CanActivateFn"}

 * Here, the defined guard function is provided as part of the `Route` object
 * in the router configuration:

 * {@example router/route_functional_guards.ts region="CanActivateFnInRoute"}
 *
 * @publicApi
 * @see `Route`
 */
export declare type CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree;

/**
 * @description
 *
 * Interface that a class can implement to be a guard deciding if a route can be deactivated.
 * If all guards return `true`, navigation continues. If any guard returns `false`,
 * navigation is cancelled. If any guard returns a `UrlTree`, current navigation
 * is cancelled and a new navigation begins to the `UrlTree` returned from the guard.
 *
 * The following example implements a `CanDeactivate` function that checks whether the
 * current user has permission to deactivate the requested route.
 *
 * ```
 * class UserToken {}
 * class Permissions {
 *   canDeactivate(user: UserToken, id: string): boolean {
 *     return true;
 *   }
 * }
 * ```
 *
 * Here, the defined guard function is provided as part of the `Route` object
 * in the router configuration:
 *
 * ```
 *
 * @Injectable()
 * class CanDeactivateTeam implements CanDeactivate<TeamComponent> {
 *   constructor(private permissions: Permissions, private currentUser: UserToken) {}
 *
 *   canDeactivate(
 *     component: TeamComponent,
 *     currentRoute: ActivatedRouteSnapshot,
 *     currentState: RouterStateSnapshot,
 *     nextState: RouterStateSnapshot
 *   ): Observable<boolean|UrlTree>|Promise<boolean|UrlTree>|boolean|UrlTree {
 *     return this.permissions.canDeactivate(this.currentUser, route.params.id);
 *   }
 * }
 *
 * @NgModule({
 *   imports: [
 *     RouterModule.forRoot([
 *       {
 *         path: 'team/:id',
 *         component: TeamComponent,
 *         canDeactivate: [CanDeactivateTeam]
 *       }
 *     ])
 *   ],
 *   providers: [CanDeactivateTeam, UserToken, Permissions]
 * })
 * class AppModule {}
 * ```
 *
 * @publicApi
 * @deprecated Class-based `Route` guards are deprecated in favor of functional guards. An
 *     injectable class can be used as a functional guard using the `inject` function:
 *     `canDeactivate: [() => inject(myGuard).canDeactivate()]`.
 * @see `CanDeactivateFn`
 */
export declare interface CanDeactivate<T> {
    canDeactivate(component: T, currentRoute: ActivatedRouteSnapshot, currentState: RouterStateSnapshot, nextState: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree;
}

/**
 * The signature of a function used as a `canDeactivate` guard on a `Route`.
 *
 * If all guards return `true`, navigation continues. If any guard returns `false`,
 * navigation is cancelled. If any guard returns a `UrlTree`, the current navigation
 * is cancelled and a new navigation begins to the `UrlTree` returned from the guard.
 *
 * The following example implements and uses a `CanDeactivateFn` that checks whether the
 * user component has unsaved changes before navigating away from the route.
 *
 * {@example router/route_functional_guards.ts region="CanDeactivateFn"}
 *
 * @publicApi
 * @see `Route`
 */
export declare type CanDeactivateFn<T> = (component: T, currentRoute: ActivatedRouteSnapshot, currentState: RouterStateSnapshot, nextState: RouterStateSnapshot) => Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree;

/**
 * @description
 *
 * Interface that a class can implement to be a guard deciding if children can be loaded.
 * If all guards return `true`, navigation continues. If any guard returns `false`,
 * navigation is cancelled. If any guard returns a `UrlTree`, current navigation
 * is cancelled and a new navigation starts to the `UrlTree` returned from the guard.
 *
 * The following example implements a `CanLoad` function that decides whether the
 * current user has permission to load requested child routes.
 *
 *
 * ```
 * class UserToken {}
 * class Permissions {
 *   canLoadChildren(user: UserToken, id: string, segments: UrlSegment[]): boolean {
 *     return true;
 *   }
 * }
 *
 * @Injectable()
 * class CanLoadTeamSection implements CanLoad {
 *   constructor(private permissions: Permissions, private currentUser: UserToken) {}
 *
 *   canLoad(route: Route, segments: UrlSegment[]): Observable<boolean>|Promise<boolean>|boolean {
 *     return this.permissions.canLoadChildren(this.currentUser, route, segments);
 *   }
 * }
 * ```
 *
 * Here, the defined guard function is provided as part of the `Route` object
 * in the router configuration:
 *
 * ```
 *
 * @NgModule({
 *   imports: [
 *     RouterModule.forRoot([
 *       {
 *         path: 'team/:id',
 *         component: TeamComponent,
 *         loadChildren: () => import('./team').then(mod => mod.TeamModule),
 *         canLoad: [CanLoadTeamSection]
 *       }
 *     ])
 *   ],
 *   providers: [CanLoadTeamSection, UserToken, Permissions]
 * })
 * class AppModule {}
 * ```
 *
 * @publicApi
 * @deprecated Use {@link CanMatchFn} instead
 */
export declare interface CanLoad {
    canLoad(route: Route, segments: UrlSegment[]): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree;
}

/**
 * The signature of a function used as a `canLoad` guard on a `Route`.
 *
 * @publicApi
 * @see `CanLoad`
 * @see `Route`
 * @see `CanMatchFn`
 * @deprecated Use `Route.canMatch` and `CanMatchFn` instead
 */
export declare type CanLoadFn = (route: Route, segments: UrlSegment[]) => Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree;

/**
 * @description
 *
 * Interface that a class can implement to be a guard deciding if a `Route` can be matched.
 * If all guards return `true`, navigation continues and the `Router` will use the `Route` during
 * activation. If any guard returns `false`, the `Route` is skipped for matching and other `Route`
 * configurations are processed instead.
 *
 * The following example implements a `CanMatch` function that decides whether the
 * current user has permission to access the users page.
 *
 *
 * ```
 * class UserToken {}
 * class Permissions {
 *   canAccess(user: UserToken, route: Route, segments: UrlSegment[]): boolean {
 *     return true;
 *   }
 * }
 *
 * @Injectable()
 * class CanMatchTeamSection implements CanMatch {
 *   constructor(private permissions: Permissions, private currentUser: UserToken) {}
 *
 *   canMatch(route: Route, segments: UrlSegment[]): Observable<boolean>|Promise<boolean>|boolean {
 *     return this.permissions.canAccess(this.currentUser, route, segments);
 *   }
 * }
 * ```
 *
 * Here, the defined guard function is provided as part of the `Route` object
 * in the router configuration:
 *
 * ```
 *
 * @NgModule({
 *   imports: [
 *     RouterModule.forRoot([
 *       {
 *         path: 'team/:id',
 *         component: TeamComponent,
 *         loadChildren: () => import('./team').then(mod => mod.TeamModule),
 *         canMatch: [CanMatchTeamSection]
 *       },
 *       {
 *         path: '**',
 *         component: NotFoundComponent
 *       }
 *     ])
 *   ],
 *   providers: [CanMatchTeamSection, UserToken, Permissions]
 * })
 * class AppModule {}
 * ```
 *
 * If the `CanMatchTeamSection` were to return `false`, the router would continue navigating to the
 * `team/:id` URL, but would load the `NotFoundComponent` because the `Route` for `'team/:id'`
 * could not be used for a URL match but the catch-all `**` `Route` did instead.
 *
 * @publicApi
 * @deprecated Class-based `Route` guards are deprecated in favor of functional guards. An
 *     injectable class can be used as a functional guard using the `inject` function:
 *     `canMatch: [() => inject(myGuard).canMatch()]`.
 * @see `CanMatchFn`
 */
export declare interface CanMatch {
    canMatch(route: Route, segments: UrlSegment[]): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree;
}

/**
 * The signature of a function used as a `canMatch` guard on a `Route`.
 *
 * If all guards return `true`, navigation continues and the `Router` will use the `Route` during
 * activation. If any guard returns `false`, the `Route` is skipped for matching and other `Route`
 * configurations are processed instead.
 *
 * The following example implements and uses a `CanMatchFn` that checks whether the
 * current user has permission to access the team page.
 *
 * {@example router/route_functional_guards.ts region="CanMatchFn"}
 *
 * @publicApi
 * @see `Route`
 */
export declare type CanMatchFn = (route: Route, segments: UrlSegment[]) => Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree;

/**
 * An event triggered at the end of the child-activation part
 * of the Resolve phase of routing.
 * @see `ChildActivationStart`
 * @see `ResolveStart`
 * @publicApi
 */
export declare class ChildActivationEnd {
    /** @docsNotRequired */
    snapshot: ActivatedRouteSnapshot;
    readonly type = EventType.ChildActivationEnd;
    constructor(
    /** @docsNotRequired */
    snapshot: ActivatedRouteSnapshot);
    toString(): string;
}

/**
 * An event triggered at the start of the child-activation
 * part of the Resolve phase of routing.
 * @see  `ChildActivationEnd`
 * @see `ResolveStart`
 *
 * @publicApi
 */
export declare class ChildActivationStart {
    /** @docsNotRequired */
    snapshot: ActivatedRouteSnapshot;
    readonly type = EventType.ChildActivationStart;
    constructor(
    /** @docsNotRequired */
    snapshot: ActivatedRouteSnapshot);
    toString(): string;
}

/**
 * Store contextual information about the children (= nested) `RouterOutlet`
 *
 * @publicApi
 */
export declare class ChildrenOutletContexts {
    private contexts;
    /** Called when a `RouterOutlet` directive is instantiated */
    onChildOutletCreated(childName: string, outlet: RouterOutletContract): void;
    /**
     * Called when a `RouterOutlet` directive is destroyed.
     * We need to keep the context as the outlet could be destroyed inside a NgIf and might be
     * re-created later.
     */
    onChildOutletDestroyed(childName: string): void;
    /**
     * Called when the corresponding route is deactivated during navigation.
     * Because the component get destroyed, all children outlet are destroyed.
     */
    onOutletDeactivated(): Map<string, OutletContext>;
    onOutletReAttached(contexts: Map<string, OutletContext>): void;
    getOrCreateContext(childName: string): OutletContext;
    getContext(childName: string): OutletContext | null;
    static ɵfac: i0.ɵɵFactoryDeclaration<ChildrenOutletContexts, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<ChildrenOutletContexts>;
}

/**
 * Converts a `Params` instance to a `ParamMap`.
 * @param params The instance to convert.
 * @returns The new map instance.
 *
 * @publicApi
 */
export declare function convertToParamMap(params: Params): ParamMap;

/**
 * Creates a `UrlTree` relative to an `ActivatedRouteSnapshot`.
 *
 * @publicApi
 *
 *
 * @param relativeTo The `ActivatedRouteSnapshot` to apply the commands to
 * @param commands An array of URL fragments with which to construct the new URL tree.
 * If the path is static, can be the literal URL string. For a dynamic path, pass an array of path
 * segments, followed by the parameters for each segment.
 * The fragments are applied to the one provided in the `relativeTo` parameter.
 * @param queryParams The query parameters for the `UrlTree`. `null` if the `UrlTree` does not have
 *     any query parameters.
 * @param fragment The fragment for the `UrlTree`. `null` if the `UrlTree` does not have a fragment.
 *
 * @usageNotes
 *
 * ```
 * // create /team/33/user/11
 * createUrlTreeFromSnapshot(snapshot, ['/team', 33, 'user', 11]);
 *
 * // create /team/33;expand=true/user/11
 * createUrlTreeFromSnapshot(snapshot, ['/team', 33, {expand: true}, 'user', 11]);
 *
 * // you can collapse static segments like this (this works only with the first passed-in value):
 * createUrlTreeFromSnapshot(snapshot, ['/team/33/user', userId]);
 *
 * // If the first segment can contain slashes, and you do not want the router to split it,
 * // you can do the following:
 * createUrlTreeFromSnapshot(snapshot, [{segmentPath: '/one/two'}]);
 *
 * // create /team/33/(user/11//right:chat)
 * createUrlTreeFromSnapshot(snapshot, ['/team', 33, {outlets: {primary: 'user/11', right:
 * 'chat'}}], null, null);
 *
 * // remove the right secondary node
 * createUrlTreeFromSnapshot(snapshot, ['/team', 33, {outlets: {primary: 'user/11', right: null}}]);
 *
 * // For the examples below, assume the current URL is for the `/team/33/user/11` and the
 * `ActivatedRouteSnapshot` points to `user/11`:
 *
 * // navigate to /team/33/user/11/details
 * createUrlTreeFromSnapshot(snapshot, ['details']);
 *
 * // navigate to /team/33/user/22
 * createUrlTreeFromSnapshot(snapshot, ['../22']);
 *
 * // navigate to /team/44/user/22
 * createUrlTreeFromSnapshot(snapshot, ['../../team/44/user/22']);
 * ```
 */
export declare function createUrlTreeFromSnapshot(relativeTo: ActivatedRouteSnapshot, commands: any[], queryParams?: Params | null, fragment?: string | null): UrlTree;

/**
 *
 * Represents static data associated with a particular route.
 *
 * @see `Route#data`
 *
 * @publicApi
 */
export declare type Data = {
    [key: string | symbol]: any;
};

/**
 * A type alias for providers returned by `withDebugTracing` for use with `provideRouter`.
 *
 * @see `withDebugTracing`
 * @see `provideRouter`
 *
 * @publicApi
 */
export declare type DebugTracingFeature = RouterFeature<RouterFeatureKind.DebugTracingFeature>;

/**
 * An ES Module object with a default export of the given type.
 *
 * @see `Route#loadComponent`
 * @see `LoadChildrenCallback`
 *
 * @publicApi
 */
export declare interface DefaultExport<T> {
    /**
     * Default exports are bound under the name `"default"`, per the ES Module spec:
     * https://tc39.es/ecma262/#table-export-forms-mapping-to-exportentry-records
     */
    default: T;
}

/**
 * The default `TitleStrategy` used by the router that updates the title using the `Title` service.
 */
export declare class DefaultTitleStrategy extends TitleStrategy {
    readonly title: Title;
    constructor(title: Title);
    /**
     * Sets the title of the browser to the given value.
     *
     * @param title The `pageTitle` from the deepest primary route.
     */
    updateTitle(snapshot: RouterStateSnapshot): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<DefaultTitleStrategy, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<DefaultTitleStrategy>;
}

/**
 * Matches the route configuration (`route`) against the actual URL (`segments`).
 *
 * When no matcher is defined on a `Route`, this is the matcher used by the Router by default.
 *
 * @param segments The remaining unmatched segments in the current navigation
 * @param segmentGroup The current segment group being matched
 * @param route The `Route` to match against.
 *
 * @see UrlMatchResult
 * @see Route
 *
 * @returns The resulting match information or `null` if the `route` should not match.
 * @publicApi
 */
export declare function defaultUrlMatcher(segments: UrlSegment[], segmentGroup: UrlSegmentGroup, route: Route): UrlMatchResult | null;

/**
 * @description
 *
 * A default implementation of the `UrlSerializer`.
 *
 * Example URLs:
 *
 * ```
 * /inbox/33(popup:compose)
 * /inbox/33;open=true/messages/44
 * ```
 *
 * DefaultUrlSerializer uses parentheses to serialize secondary segments (e.g., popup:compose), the
 * colon syntax to specify the outlet, and the ';parameter=value' syntax (e.g., open=true) to
 * specify route specific parameters.
 *
 * @publicApi
 */
export declare class DefaultUrlSerializer implements UrlSerializer {
    /** Parses a url into a `UrlTree` */
    parse(url: string): UrlTree;
    /** Converts a `UrlTree` into a url */
    serialize(tree: UrlTree): string;
}

/**
 * The `InjectionToken` and `@Injectable` classes for guards and resolvers are deprecated in favor
 * of plain JavaScript functions instead.. Dependency injection can still be achieved using the
 * `inject` function from `@angular/core` and an injectable class can be used as a functional guard
 * using `inject`: `canActivate: [() => inject(myGuard).canActivate()]`.
 *
 * @deprecated
 * @see `CanMatchFn`
 * @see `CanLoadFn`
 * @see `CanActivateFn`
 * @see `CanActivateChildFn`
 * @see `CanDeactivateFn`
 * @see `ResolveFn`
 * @see `inject`
 * @publicApi
 */
export declare type DeprecatedGuard = ProviderToken<any> | any;

/**
 * @description
 *
 * Represents the detached route tree.
 *
 * This is an opaque value the router will give to a custom route reuse strategy
 * to store and retrieve later on.
 *
 * @publicApi
 */
export declare type DetachedRouteHandle = {};

/**
 * A type alias for providers returned by `withDisabledInitialNavigation` for use with
 * `provideRouter`.
 *
 * @see `withDisabledInitialNavigation`
 * @see `provideRouter`
 *
 * @publicApi
 */
export declare type DisabledInitialNavigationFeature = RouterFeature<RouterFeatureKind.DisabledInitialNavigationFeature>;

/**
 * A type alias for providers returned by `withEnabledBlockingInitialNavigation` for use with
 * `provideRouter`.
 *
 * @see `withEnabledBlockingInitialNavigation`
 * @see `provideRouter`
 *
 * @publicApi
 */
export declare type EnabledBlockingInitialNavigationFeature = RouterFeature<RouterFeatureKind.EnabledBlockingInitialNavigationFeature>;

/**
 * Router events that allow you to track the lifecycle of the router.
 *
 * The events occur in the following sequence:
 *
 * * [NavigationStart](api/router/NavigationStart): Navigation starts.
 * * [RouteConfigLoadStart](api/router/RouteConfigLoadStart): Before
 * the router [lazy loads](/guide/router#lazy-loading) a route configuration.
 * * [RouteConfigLoadEnd](api/router/RouteConfigLoadEnd): After a route has been lazy loaded.
 * * [RoutesRecognized](api/router/RoutesRecognized): When the router parses the URL
 * and the routes are recognized.
 * * [GuardsCheckStart](api/router/GuardsCheckStart): When the router begins the *guards*
 * phase of routing.
 * * [ChildActivationStart](api/router/ChildActivationStart): When the router
 * begins activating a route's children.
 * * [ActivationStart](api/router/ActivationStart): When the router begins activating a route.
 * * [GuardsCheckEnd](api/router/GuardsCheckEnd): When the router finishes the *guards*
 * phase of routing successfully.
 * * [ResolveStart](api/router/ResolveStart): When the router begins the *resolve*
 * phase of routing.
 * * [ResolveEnd](api/router/ResolveEnd): When the router finishes the *resolve*
 * phase of routing successfully.
 * * [ChildActivationEnd](api/router/ChildActivationEnd): When the router finishes
 * activating a route's children.
 * * [ActivationEnd](api/router/ActivationEnd): When the router finishes activating a route.
 * * [NavigationEnd](api/router/NavigationEnd): When navigation ends successfully.
 * * [NavigationCancel](api/router/NavigationCancel): When navigation is canceled.
 * * [NavigationError](api/router/NavigationError): When navigation fails
 * due to an unexpected error.
 * * [Scroll](api/router/Scroll): When the user scrolls.
 *
 * @publicApi
 */
declare type Event_2 = NavigationStart | NavigationEnd | NavigationCancel | NavigationError | RoutesRecognized | GuardsCheckStart | GuardsCheckEnd | RouteConfigLoadStart | RouteConfigLoadEnd | ChildActivationStart | ChildActivationEnd | ActivationStart | ActivationEnd | Scroll | ResolveStart | ResolveEnd | NavigationSkipped;
export { Event_2 as Event }

/**
 * Identifies the type of a router event.
 *
 * @publicApi
 */
export declare const enum EventType {
    NavigationStart = 0,
    NavigationEnd = 1,
    NavigationCancel = 2,
    NavigationError = 3,
    RoutesRecognized = 4,
    ResolveStart = 5,
    ResolveEnd = 6,
    GuardsCheckStart = 7,
    GuardsCheckEnd = 8,
    RouteConfigLoadStart = 9,
    RouteConfigLoadEnd = 10,
    ChildActivationStart = 11,
    ChildActivationEnd = 12,
    ActivationStart = 13,
    ActivationEnd = 14,
    Scroll = 15,
    NavigationSkipped = 16
}

/**
 * A set of configuration options for a router module, provided in the
 * `forRoot()` method.
 *
 * @see `forRoot()`
 *
 *
 * @publicApi
 */
export declare interface ExtraOptions extends InMemoryScrollingOptions, RouterConfigOptions {
    /**
     * When true, log all internal navigation events to the console.
     * Use for debugging.
     */
    enableTracing?: boolean;
    /**
     * When true, enable the location strategy that uses the URL fragment
     * instead of the history API.
     */
    useHash?: boolean;
    /**
     * One of `enabled`, `enabledBlocking`, `enabledNonBlocking` or `disabled`.
     * When set to `enabled` or `enabledBlocking`, the initial navigation starts before the root
     * component is created. The bootstrap is blocked until the initial navigation is complete. This
     * value is required for [server-side rendering](guide/universal) to work. When set to
     * `enabledNonBlocking`, the initial navigation starts after the root component has been created.
     * The bootstrap is not blocked on the completion of the initial navigation. When set to
     * `disabled`, the initial navigation is not performed. The location listener is set up before the
     * root component gets created. Use if there is a reason to have more control over when the router
     * starts its initial navigation due to some complex initialization logic.
     */
    initialNavigation?: InitialNavigation;
    /**
     * A custom error handler for failed navigations.
     * If the handler returns a value, the navigation Promise is resolved with this value.
     * If the handler throws an exception, the navigation Promise is rejected with the exception.
     *
     * @deprecated Subscribe to the `Router` events and watch for `NavigationError` instead.
     */
    errorHandler?: (error: any) => any;
    /**
     * Configures a preloading strategy.
     * One of `PreloadAllModules` or `NoPreloading` (the default).
     */
    preloadingStrategy?: any;
    /**
     * Configures the scroll offset the router will use when scrolling to an element.
     *
     * When given a tuple with x and y position value,
     * the router uses that offset each time it scrolls.
     * When given a function, the router invokes the function every time
     * it restores scroll position.
     */
    scrollOffset?: [number, number] | (() => [number, number]);
    /**
     * A custom handler for malformed URI errors. The handler is invoked when `encodedURI` contains
     * invalid character sequences.
     * The default implementation is to redirect to the root URL, dropping
     * any path or parameter information. The function takes three parameters:
     *
     * - `'URIError'` - Error thrown when parsing a bad URL.
     * - `'UrlSerializer'` - UrlSerializer that’s configured with the router.
     * - `'url'` -  The malformed URL that caused the URIError
     *
     * @deprecated URI parsing errors should be handled in the `UrlSerializer` instead.
     * */
    malformedUriErrorHandler?: (error: URIError, urlSerializer: UrlSerializer, url: string) => UrlTree;
}

/**
 * An event triggered at the end of the Guard phase of routing.
 *
 * @see `GuardsCheckStart`
 *
 * @publicApi
 */
export declare class GuardsCheckEnd extends RouterEvent {
    /** @docsNotRequired */
    urlAfterRedirects: string;
    /** @docsNotRequired */
    state: RouterStateSnapshot;
    /** @docsNotRequired */
    shouldActivate: boolean;
    readonly type = EventType.GuardsCheckEnd;
    constructor(
    /** @docsNotRequired */
    id: number, 
    /** @docsNotRequired */
    url: string, 
    /** @docsNotRequired */
    urlAfterRedirects: string, 
    /** @docsNotRequired */
    state: RouterStateSnapshot, 
    /** @docsNotRequired */
    shouldActivate: boolean);
    toString(): string;
}

/**
 * An event triggered at the start of the Guard phase of routing.
 *
 * @see `GuardsCheckEnd`
 *
 * @publicApi
 */
export declare class GuardsCheckStart extends RouterEvent {
    /** @docsNotRequired */
    urlAfterRedirects: string;
    /** @docsNotRequired */
    state: RouterStateSnapshot;
    readonly type = EventType.GuardsCheckStart;
    constructor(
    /** @docsNotRequired */
    id: number, 
    /** @docsNotRequired */
    url: string, 
    /** @docsNotRequired */
    urlAfterRedirects: string, 
    /** @docsNotRequired */
    state: RouterStateSnapshot);
    toString(): string;
}

declare namespace i1 {
    export {
        RouterOutletContract,
        RouterOutlet
    }
}

declare namespace i2 {
    export {
        RouterLink,
        RouterLink as RouterLinkWithHref
    }
}

declare namespace i3 {
    export {
        RouterLinkActive
    }
}

declare namespace i4 {
    export {
        ɵEmptyOutletComponent,
        ɵEmptyOutletComponent as EmptyOutletComponent
    }
}

/**
 * Allowed values in an `ExtraOptions` object that configure
 * when the router performs the initial navigation operation.
 *
 * * 'enabledNonBlocking' - (default) The initial navigation starts after the
 * root component has been created. The bootstrap is not blocked on the completion of the initial
 * navigation.
 * * 'enabledBlocking' - The initial navigation starts before the root component is created.
 * The bootstrap is blocked until the initial navigation is complete. This value is required
 * for [server-side rendering](guide/universal) to work.
 * * 'disabled' - The initial navigation is not performed. The location listener is set up before
 * the root component gets created. Use if there is a reason to have
 * more control over when the router starts its initial navigation due to some complex
 * initialization logic.
 *
 * @see `forRoot()`
 *
 * @publicApi
 */
export declare type InitialNavigation = 'disabled' | 'enabledBlocking' | 'enabledNonBlocking';

/**
 * A type alias for providers returned by `withEnabledBlockingInitialNavigation` or
 * `withDisabledInitialNavigation` functions for use with `provideRouter`.
 *
 * @see `withEnabledBlockingInitialNavigation`
 * @see `withDisabledInitialNavigation`
 * @see `provideRouter`
 *
 * @publicApi
 */
export declare type InitialNavigationFeature = EnabledBlockingInitialNavigationFeature | DisabledInitialNavigationFeature;

/**
 * A type alias for providers returned by `withInMemoryScrolling` for use with `provideRouter`.
 *
 * @see `withInMemoryScrolling`
 * @see `provideRouter`
 *
 * @publicApi
 */
export declare type InMemoryScrollingFeature = RouterFeature<RouterFeatureKind.InMemoryScrollingFeature>;

/**
 * Configuration options for the scrolling feature which can be used with `withInMemoryScrolling`
 * function.
 *
 * @publicApi
 */
export declare interface InMemoryScrollingOptions {
    /**
     * When set to 'enabled', scrolls to the anchor element when the URL has a fragment.
     * Anchor scrolling is disabled by default.
     *
     * Anchor scrolling does not happen on 'popstate'. Instead, we restore the position
     * that we stored or scroll to the top.
     */
    anchorScrolling?: 'disabled' | 'enabled';
    /**
     * Configures if the scroll position needs to be restored when navigating back.
     *
     * * 'disabled'- (Default) Does nothing. Scroll position is maintained on navigation.
     * * 'top'- Sets the scroll position to x = 0, y = 0 on all navigation.
     * * 'enabled'- Restores the previous scroll position on backward navigation, else sets the
     * position to the anchor if one is provided, or sets the scroll position to [0, 0] (forward
     * navigation). This option will be the default in the future.
     *
     * You can implement custom scroll restoration behavior by adapting the enabled behavior as
     * in the following example.
     *
     * ```typescript
     * class AppComponent {
     *   movieData: any;
     *
     *   constructor(private router: Router, private viewportScroller: ViewportScroller,
     * changeDetectorRef: ChangeDetectorRef) {
     *   router.events.pipe(filter((event: Event): event is Scroll => event instanceof Scroll)
     *     ).subscribe(e => {
     *       fetch('http://example.com/movies.json').then(response => {
     *         this.movieData = response.json();
     *         // update the template with the data before restoring scroll
     *         changeDetectorRef.detectChanges();
     *
     *         if (e.position) {
     *           viewportScroller.scrollToPosition(e.position);
     *         }
     *       });
     *     });
     *   }
     * }
     * ```
     */
    scrollPositionRestoration?: 'disabled' | 'enabled' | 'top';
}

/**
 * A set of options which specify how to determine if a `UrlTree` is active, given the `UrlTree`
 * for the current router state.
 *
 * @publicApi
 * @see Router.isActive
 */
export declare interface IsActiveMatchOptions {
    /**
     * Defines the strategy for comparing the matrix parameters of two `UrlTree`s.
     *
     * The matrix parameter matching is dependent on the strategy for matching the
     * segments. That is, if the `paths` option is set to `'subset'`, only
     * the matrix parameters of the matching segments will be compared.
     *
     * - `'exact'`: Requires that matching segments also have exact matrix parameter
     * matches.
     * - `'subset'`: The matching segments in the router's active `UrlTree` may contain
     * extra matrix parameters, but those that exist in the `UrlTree` in question must match.
     * - `'ignored'`: When comparing `UrlTree`s, matrix params will be ignored.
     */
    matrixParams: 'exact' | 'subset' | 'ignored';
    /**
     * Defines the strategy for comparing the query parameters of two `UrlTree`s.
     *
     * - `'exact'`: the query parameters must match exactly.
     * - `'subset'`: the active `UrlTree` may contain extra parameters,
     * but must match the key and value of any that exist in the `UrlTree` in question.
     * - `'ignored'`: When comparing `UrlTree`s, query params will be ignored.
     */
    queryParams: 'exact' | 'subset' | 'ignored';
    /**
     * Defines the strategy for comparing the `UrlSegment`s of the `UrlTree`s.
     *
     * - `'exact'`: all segments in each `UrlTree` must match.
     * - `'subset'`: a `UrlTree` will be determined to be active if it
     * is a subtree of the active route. That is, the active route may contain extra
     * segments, but must at least have all the segments of the `UrlTree` in question.
     */
    paths: 'exact' | 'subset';
    /**
     * - `'exact'`: indicates that the `UrlTree` fragments must be equal.
     * - `'ignored'`: the fragments will not be compared when determining if a
     * `UrlTree` is active.
     */
    fragment: 'exact' | 'ignored';
}

/**
 *
 * A function that returns a set of routes to load.
 *
 * @see `LoadChildrenCallback`
 * @publicApi
 */
export declare type LoadChildren = LoadChildrenCallback;

/**
 *
 * A function that is called to resolve a collection of lazy-loaded routes.
 * Must be an arrow function of the following form:
 * `() => import('...').then(mod => mod.MODULE)`
 * or
 * `() => import('...').then(mod => mod.ROUTES)`
 *
 * For example:
 *
 * ```
 * [{
 *   path: 'lazy',
 *   loadChildren: () => import('./lazy-route/lazy.module').then(mod => mod.LazyModule),
 * }];
 * ```
 * or
 * ```
 * [{
 *   path: 'lazy',
 *   loadChildren: () => import('./lazy-route/lazy.routes').then(mod => mod.ROUTES),
 * }];
 * ```
 *
 * If the lazy-loaded routes are exported via a `default` export, the `.then` can be omitted:
 * ```
 * [{
 *   path: 'lazy',
 *   loadChildren: () => import('./lazy-route/lazy.routes'),
 * }];
 * ```
 *
 * @see [Route.loadChildren](api/router/Route#loadChildren)
 * @publicApi
 */
export declare type LoadChildrenCallback = () => Type<any> | NgModuleFactory<any> | Routes | Observable<Type<any> | Routes | DefaultExport<Type<any>> | DefaultExport<Routes>> | Promise<NgModuleFactory<any> | Type<any> | Routes | DefaultExport<Type<any>> | DefaultExport<Routes>>;

declare interface LoadedRouterConfig {
    routes: Route[];
    injector: EnvironmentInjector | undefined;
}

/**
 * Maps an array of injectable classes with canActivate functions to an array of equivalent
 * `CanActivateFn` for use in a `Route` definition.
 *
 * Usage {@example router/utils/functional_guards.ts region='CanActivate'}
 *
 * @publicApi
 * @see Route
 */
export declare function mapToCanActivate(providers: Array<Type<{
    canActivate: CanActivateFn;
}>>): CanActivateFn[];

/**
 * Maps an array of injectable classes with canActivateChild functions to an array of equivalent
 * `CanActivateChildFn` for use in a `Route` definition.
 *
 * Usage {@example router/utils/functional_guards.ts region='CanActivate'}
 *
 * @publicApi
 * @see Route
 */
export declare function mapToCanActivateChild(providers: Array<Type<{
    canActivateChild: CanActivateChildFn;
}>>): CanActivateChildFn[];

/**
 * Maps an array of injectable classes with canDeactivate functions to an array of equivalent
 * `CanDeactivateFn` for use in a `Route` definition.
 *
 * Usage {@example router/utils/functional_guards.ts region='CanActivate'}
 *
 * @publicApi
 * @see Route
 */
export declare function mapToCanDeactivate<T = unknown>(providers: Array<Type<{
    canDeactivate: CanDeactivateFn<T>;
}>>): CanDeactivateFn<T>[];

/**
 * Maps an array of injectable classes with canMatch functions to an array of equivalent
 * `CanMatchFn` for use in a `Route` definition.
 *
 * Usage {@example router/utils/functional_guards.ts region='CanActivate'}
 *
 * @publicApi
 * @see Route
 */
export declare function mapToCanMatch(providers: Array<Type<{
    canMatch: CanMatchFn;
}>>): CanMatchFn[];

/**
 * Maps an injectable class with a resolve function to an equivalent `ResolveFn`
 * for use in a `Route` definition.
 *
 * Usage {@example router/utils/functional_guards.ts region='Resolve'}
 *
 * @publicApi
 * @see Route
 */
export declare function mapToResolve<T>(provider: Type<{
    resolve: ResolveFn<T>;
}>): ResolveFn<T>;

/**
 * Information about a navigation operation.
 * Retrieve the most recent navigation object with the
 * [Router.getCurrentNavigation() method](api/router/Router#getcurrentnavigation) .
 *
 * * *id* : The unique identifier of the current navigation.
 * * *initialUrl* : The target URL passed into the `Router#navigateByUrl()` call before navigation.
 * This is the value before the router has parsed or applied redirects to it.
 * * *extractedUrl* : The initial target URL after being parsed with `UrlSerializer.extract()`.
 * * *finalUrl* : The extracted URL after redirects have been applied.
 * This URL may not be available immediately, therefore this property can be `undefined`.
 * It is guaranteed to be set after the `RoutesRecognized` event fires.
 * * *trigger* : Identifies how this navigation was triggered.
 * -- 'imperative'--Triggered by `router.navigateByUrl` or `router.navigate`.
 * -- 'popstate'--Triggered by a popstate event.
 * -- 'hashchange'--Triggered by a hashchange event.
 * * *extras* : A `NavigationExtras` options object that controlled the strategy used for this
 * navigation.
 * * *previousNavigation* : The previously successful `Navigation` object. Only one previous
 * navigation is available, therefore this previous `Navigation` object has a `null` value for its
 * own `previousNavigation`.
 *
 * @publicApi
 */
export declare interface Navigation {
    /**
     * The unique identifier of the current navigation.
     */
    id: number;
    /**
     * The target URL passed into the `Router#navigateByUrl()` call before navigation. This is
     * the value before the router has parsed or applied redirects to it.
     */
    initialUrl: UrlTree;
    /**
     * The initial target URL after being parsed with `UrlHandlingStrategy.extract()`.
     */
    extractedUrl: UrlTree;
    /**
     * The extracted URL after redirects have been applied.
     * This URL may not be available immediately, therefore this property can be `undefined`.
     * It is guaranteed to be set after the `RoutesRecognized` event fires.
     */
    finalUrl?: UrlTree;
    /**
     * Identifies how this navigation was triggered.
     *
     * * 'imperative'--Triggered by `router.navigateByUrl` or `router.navigate`.
     * * 'popstate'--Triggered by a popstate event.
     * * 'hashchange'--Triggered by a hashchange event.
     */
    trigger: 'imperative' | 'popstate' | 'hashchange';
    /**
     * Options that controlled the strategy used for this navigation.
     * See `NavigationExtras`.
     */
    extras: NavigationExtras;
    /**
     * The previously successful `Navigation` object. Only one previous navigation
     * is available, therefore this previous `Navigation` object has a `null` value
     * for its own `previousNavigation`.
     */
    previousNavigation: Navigation | null;
}

/**
 * @description
 *
 * Options that modify the `Router` navigation strategy.
 * Supply an object containing any of these properties to a `Router` navigation function to
 * control how the navigation should be handled.
 *
 * @see [Router.navigate() method](api/router/Router#navigate)
 * @see [Router.navigateByUrl() method](api/router/Router#navigatebyurl)
 * @see [Routing and Navigation guide](guide/router)
 *
 * @publicApi
 */
export declare interface NavigationBehaviorOptions {
    /**
     * How to handle a navigation request to the current URL.
     *
     * This value is a subset of the options available in `OnSameUrlNavigation` and
     * will take precedence over the default value set for the `Router`.
     *
     * @see `OnSameUrlNavigation`
     * @see `RouterConfigOptions`
     */
    onSameUrlNavigation?: Extract<OnSameUrlNavigation, 'reload'>;
    /**
     * When true, navigates without pushing a new state into history.
     *
     * ```
     * // Navigate silently to /view
     * this.router.navigate(['/view'], { skipLocationChange: true });
     * ```
     */
    skipLocationChange?: boolean;
    /**
     * When true, navigates while replacing the current state in history.
     *
     * ```
     * // Navigate to /view
     * this.router.navigate(['/view'], { replaceUrl: true });
     * ```
     */
    replaceUrl?: boolean;
    /**
     * Developer-defined state that can be passed to any navigation.
     * Access this value through the `Navigation.extras` object
     * returned from the [Router.getCurrentNavigation()
     * method](api/router/Router#getcurrentnavigation) while a navigation is executing.
     *
     * After a navigation completes, the router writes an object containing this
     * value together with a `navigationId` to `history.state`.
     * The value is written when `location.go()` or `location.replaceState()`
     * is called before activating this route.
     *
     * Note that `history.state` does not pass an object equality test because
     * the router adds the `navigationId` on each navigation.
     *
     */
    state?: {
        [k: string]: any;
    };
}

/**
 * An event triggered when a navigation is canceled, directly or indirectly.
 * This can happen for several reasons including when a route guard
 * returns `false` or initiates a redirect by returning a `UrlTree`.
 *
 * @see `NavigationStart`
 * @see `NavigationEnd`
 * @see `NavigationError`
 *
 * @publicApi
 */
export declare class NavigationCancel extends RouterEvent {
    /**
     * A description of why the navigation was cancelled. For debug purposes only. Use `code`
     * instead for a stable cancellation reason that can be used in production.
     */
    reason: string;
    /**
     * A code to indicate why the navigation was canceled. This cancellation code is stable for
     * the reason and can be relied on whereas the `reason` string could change and should not be
     * used in production.
     */
    readonly code?: NavigationCancellationCode | undefined;
    readonly type = EventType.NavigationCancel;
    constructor(
    /** @docsNotRequired */
    id: number, 
    /** @docsNotRequired */
    url: string, 
    /**
     * A description of why the navigation was cancelled. For debug purposes only. Use `code`
     * instead for a stable cancellation reason that can be used in production.
     */
    reason: string, 
    /**
     * A code to indicate why the navigation was canceled. This cancellation code is stable for
     * the reason and can be relied on whereas the `reason` string could change and should not be
     * used in production.
     */
    code?: NavigationCancellationCode | undefined);
    /** @docsNotRequired */
    toString(): string;
}

/**
 * A code for the `NavigationCancel` event of the `Router` to indicate the
 * reason a navigation failed.
 *
 * @publicApi
 */
export declare const enum NavigationCancellationCode {
    /**
     * A navigation failed because a guard returned a `UrlTree` to redirect.
     */
    Redirect = 0,
    /**
     * A navigation failed because a more recent navigation started.
     */
    SupersededByNewNavigation = 1,
    /**
     * A navigation failed because one of the resolvers completed without emiting a value.
     */
    NoDataFromResolver = 2,
    /**
     * A navigation failed because a guard returned `false`.
     */
    GuardRejected = 3
}

/**
 * An event triggered when a navigation ends successfully.
 *
 * @see `NavigationStart`
 * @see `NavigationCancel`
 * @see `NavigationError`
 *
 * @publicApi
 */
export declare class NavigationEnd extends RouterEvent {
    /** @docsNotRequired */
    urlAfterRedirects: string;
    readonly type = EventType.NavigationEnd;
    constructor(
    /** @docsNotRequired */
    id: number, 
    /** @docsNotRequired */
    url: string, 
    /** @docsNotRequired */
    urlAfterRedirects: string);
    /** @docsNotRequired */
    toString(): string;
}

/**
 * An event triggered when a navigation fails due to an unexpected error.
 *
 * @see `NavigationStart`
 * @see `NavigationEnd`
 * @see `NavigationCancel`
 *
 * @publicApi
 */
export declare class NavigationError extends RouterEvent {
    /** @docsNotRequired */
    error: any;
    /**
     * The target of the navigation when the error occurred.
     *
     * Note that this can be `undefined` because an error could have occurred before the
     * `RouterStateSnapshot` was created for the navigation.
     */
    readonly target?: RouterStateSnapshot | undefined;
    readonly type = EventType.NavigationError;
    constructor(
    /** @docsNotRequired */
    id: number, 
    /** @docsNotRequired */
    url: string, 
    /** @docsNotRequired */
    error: any, 
    /**
     * The target of the navigation when the error occurred.
     *
     * Note that this can be `undefined` because an error could have occurred before the
     * `RouterStateSnapshot` was created for the navigation.
     */
    target?: RouterStateSnapshot | undefined);
    /** @docsNotRequired */
    toString(): string;
}

/**
 * A type alias for providers returned by `withNavigationErrorHandler` for use with `provideRouter`.
 *
 * @see `withNavigationErrorHandler`
 * @see `provideRouter`
 *
 * @publicApi
 */
export declare type NavigationErrorHandlerFeature = RouterFeature<RouterFeatureKind.NavigationErrorHandlerFeature>;

/**
 * @description
 *
 * Options that modify the `Router` navigation strategy.
 * Supply an object containing any of these properties to a `Router` navigation function to
 * control how the target URL should be constructed or interpreted.
 *
 * @see [Router.navigate() method](api/router/Router#navigate)
 * @see [Router.navigateByUrl() method](api/router/Router#navigatebyurl)
 * @see [Router.createUrlTree() method](api/router/Router#createurltree)
 * @see [Routing and Navigation guide](guide/router)
 * @see UrlCreationOptions
 * @see NavigationBehaviorOptions
 *
 * @publicApi
 */
export declare interface NavigationExtras extends UrlCreationOptions, NavigationBehaviorOptions {
}

/**
 * An event triggered when a navigation is skipped.
 * This can happen for a couple reasons including onSameUrlHandling
 * is set to `ignore` and the navigation URL is not different than the
 * current state.
 *
 * @publicApi
 */
export declare class NavigationSkipped extends RouterEvent {
    /**
     * A description of why the navigation was skipped. For debug purposes only. Use `code`
     * instead for a stable skipped reason that can be used in production.
     */
    reason: string;
    /**
     * A code to indicate why the navigation was skipped. This code is stable for
     * the reason and can be relied on whereas the `reason` string could change and should not be
     * used in production.
     */
    readonly code?: NavigationSkippedCode | undefined;
    readonly type = EventType.NavigationSkipped;
    constructor(
    /** @docsNotRequired */
    id: number, 
    /** @docsNotRequired */
    url: string, 
    /**
     * A description of why the navigation was skipped. For debug purposes only. Use `code`
     * instead for a stable skipped reason that can be used in production.
     */
    reason: string, 
    /**
     * A code to indicate why the navigation was skipped. This code is stable for
     * the reason and can be relied on whereas the `reason` string could change and should not be
     * used in production.
     */
    code?: NavigationSkippedCode | undefined);
}

/**
 * A code for the `NavigationSkipped` event of the `Router` to indicate the
 * reason a navigation was skipped.
 *
 * @publicApi
 */
export declare const enum NavigationSkippedCode {
    /**
     * A navigation was skipped because the navigation URL was the same as the current Router URL.
     */
    IgnoredSameUrlNavigation = 0,
    /**
     * A navigation was skipped because the configured `UrlHandlingStrategy` return `false` for both
     * the current Router URL and the target of the navigation.
     *
     * @see UrlHandlingStrategy
     */
    IgnoredByUrlHandlingStrategy = 1
}

/**
 * An event triggered when a navigation starts.
 *
 * @publicApi
 */
export declare class NavigationStart extends RouterEvent {
    readonly type = EventType.NavigationStart;
    /**
     * Identifies the call or event that triggered the navigation.
     * An `imperative` trigger is a call to `router.navigateByUrl()` or `router.navigate()`.
     *
     * @see `NavigationEnd`
     * @see `NavigationCancel`
     * @see `NavigationError`
     */
    navigationTrigger?: NavigationTrigger;
    /**
     * The navigation state that was previously supplied to the `pushState` call,
     * when the navigation is triggered by a `popstate` event. Otherwise null.
     *
     * The state object is defined by `NavigationExtras`, and contains any
     * developer-defined state value, as well as a unique ID that
     * the router assigns to every router transition/navigation.
     *
     * From the perspective of the router, the router never "goes back".
     * When the user clicks on the back button in the browser,
     * a new navigation ID is created.
     *
     * Use the ID in this previous-state object to differentiate between a newly created
     * state and one returned to by a `popstate` event, so that you can restore some
     * remembered state, such as scroll position.
     *
     */
    restoredState?: {
        [k: string]: any;
        navigationId: number;
    } | null;
    constructor(
    /** @docsNotRequired */
    id: number, 
    /** @docsNotRequired */
    url: string, 
    /** @docsNotRequired */
    navigationTrigger?: NavigationTrigger, 
    /** @docsNotRequired */
    restoredState?: {
        [k: string]: any;
        navigationId: number;
    } | null);
    /** @docsNotRequired */
    toString(): string;
}

/**
 * Identifies the call or event that triggered a navigation.
 *
 * * 'imperative': Triggered by `router.navigateByUrl()` or `router.navigate()`.
 * * 'popstate' : Triggered by a `popstate` event.
 * * 'hashchange'-: Triggered by a `hashchange` event.
 *
 * @publicApi
 */
declare type NavigationTrigger = 'imperative' | 'popstate' | 'hashchange';

/**
 * @description
 *
 * Provides a preloading strategy that does not preload any modules.
 *
 * This strategy is enabled by default.
 *
 * @publicApi
 */
export declare class NoPreloading implements PreloadingStrategy {
    preload(route: Route, fn: () => Observable<any>): Observable<any>;
    static ɵfac: i0.ɵɵFactoryDeclaration<NoPreloading, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<NoPreloading>;
}

/**
 * How to handle a navigation request to the current URL. One of:
 *
 * - `'ignore'` :  The router ignores the request it is the same as the current state.
 * - `'reload'` : The router processes the URL even if it is not different from the current state.
 * One example of when you might want this option is if a `canMatch` guard depends on
 * application state and initially rejects navigation to a route. After fixing the state, you want
 * to re-navigate to the same URL so the route with the `canMatch` guard can activate.
 *
 * Note that this only configures whether the Route reprocesses the URL and triggers related
 * action and events like redirects, guards, and resolvers. By default, the router re-uses a
 * component instance when it re-navigates to the same component type without visiting a different
 * component first. This behavior is configured by the `RouteReuseStrategy`. In order to reload
 * routed components on same url navigation, you need to set `onSameUrlNavigation` to `'reload'`
 * _and_ provide a `RouteReuseStrategy` which returns `false` for `shouldReuseRoute`. Additionally,
 * resolvers and most guards for routes do not run unless the path or path params changed
 * (configured by `runGuardsAndResolvers`).
 *
 * @publicApi
 * @see `RouteReuseStrategy`
 * @see `RunGuardsAndResolvers`
 * @see `NavigationBehaviorOptions`
 * @see `RouterConfigOptions`
 */
export declare type OnSameUrlNavigation = 'reload' | 'ignore';

/**
 * Store contextual information about a `RouterOutlet`
 *
 * @publicApi
 */
export declare class OutletContext {
    outlet: RouterOutletContract | null;
    route: ActivatedRoute | null;
    injector: EnvironmentInjector | null;
    children: ChildrenOutletContexts;
    attachRef: ComponentRef<any> | null;
}

/**
 * A map that provides access to the required and optional parameters
 * specific to a route.
 * The map supports retrieving a single value with `get()`
 * or multiple values with `getAll()`.
 *
 * @see [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
 *
 * @publicApi
 */
export declare interface ParamMap {
    /**
     * Reports whether the map contains a given parameter.
     * @param name The parameter name.
     * @returns True if the map contains the given parameter, false otherwise.
     */
    has(name: string): boolean;
    /**
     * Retrieves a single value for a parameter.
     * @param name The parameter name.
     * @return The parameter's single value,
     * or the first value if the parameter has multiple values,
     * or `null` when there is no such parameter.
     */
    get(name: string): string | null;
    /**
     * Retrieves multiple values for a parameter.
     * @param name The parameter name.
     * @return An array containing one or more values,
     * or an empty array if there is no such parameter.
     *
     */
    getAll(name: string): string[];
    /** Names of the parameters in the map. */
    readonly keys: string[];
}

/**
 * A collection of matrix and query URL parameters.
 * @see `convertToParamMap()`
 * @see `ParamMap`
 *
 * @publicApi
 */
export declare type Params = {
    [key: string]: any;
};

/**
 * @description
 *
 * Provides a preloading strategy that preloads all modules as quickly as possible.
 *
 * ```
 * RouterModule.forRoot(ROUTES, {preloadingStrategy: PreloadAllModules})
 * ```
 *
 * @publicApi
 */
export declare class PreloadAllModules implements PreloadingStrategy {
    preload(route: Route, fn: () => Observable<any>): Observable<any>;
    static ɵfac: i0.ɵɵFactoryDeclaration<PreloadAllModules, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<PreloadAllModules>;
}

/**
 * A type alias that represents a feature which enables preloading in Router.
 * The type is used to describe the return value of the `withPreloading` function.
 *
 * @see `withPreloading`
 * @see `provideRouter`
 *
 * @publicApi
 */
export declare type PreloadingFeature = RouterFeature<RouterFeatureKind.PreloadingFeature>;

/**
 * @description
 *
 * Provides a preloading strategy.
 *
 * @publicApi
 */
export declare abstract class PreloadingStrategy {
    abstract preload(route: Route, fn: () => Observable<any>): Observable<any>;
}

/**
 * The primary routing outlet.
 *
 * @publicApi
 */
export declare const PRIMARY_OUTLET = "primary";

/**
 * Sets up providers necessary to enable `Router` functionality for the application.
 * Allows to configure a set of routes as well as extra features that should be enabled.
 *
 * @usageNotes
 *
 * Basic example of how you can add a Router to your application:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent, {
 *   providers: [provideRouter(appRoutes)]
 * });
 * ```
 *
 * You can also enable optional features in the Router by adding functions from the `RouterFeatures`
 * type:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes,
 *         withDebugTracing(),
 *         withRouterConfig({paramsInheritanceStrategy: 'always'}))
 *     ]
 *   }
 * );
 * ```
 *
 * @see `RouterFeatures`
 *
 * @publicApi
 * @param routes A set of `Route`s to use for the application routing table.
 * @param features Optional features to configure additional router behaviors.
 * @returns A set of providers to setup a Router.
 */
export declare function provideRouter(routes: Routes, ...features: RouterFeatures[]): EnvironmentProviders;

/**
 * Registers a [DI provider](guide/glossary#provider) for a set of routes.
 * @param routes The route configuration to provide.
 *
 * @usageNotes
 *
 * ```
 * @NgModule({
 *   providers: [provideRoutes(ROUTES)]
 * })
 * class LazyLoadedChildModule {}
 * ```
 *
 * @deprecated If necessary, provide routes using the `ROUTES` `InjectionToken`.
 * @see `ROUTES`
 * @publicApi
 */
export declare function provideRoutes(routes: Routes): Provider[];

/**
 *
 * How to handle query parameters in a router link.
 * One of:
 * - `"merge"` : Merge new parameters with current parameters.
 * - `"preserve"` : Preserve current parameters.
 * - `""` : Replace current parameters with new parameters. This is the default behavior.
 *
 * @see `UrlCreationOptions#queryParamsHandling`
 * @see `RouterLink`
 * @publicApi
 */
export declare type QueryParamsHandling = 'merge' | 'preserve' | '';

/**
 * @description
 *
 * Interface that classes can implement to be a data provider.
 * A data provider class can be used with the router to resolve data during navigation.
 * The interface defines a `resolve()` method that is invoked right after the `ResolveStart`
 * router event. The router waits for the data to be resolved before the route is finally activated.
 *
 * The following example implements a `resolve()` method that retrieves the data
 * needed to activate the requested route.
 *
 * ```
 * @Injectable({ providedIn: 'root' })
 * export class HeroResolver implements Resolve<Hero> {
 *   constructor(private service: HeroService) {}
 *
 *   resolve(
 *     route: ActivatedRouteSnapshot,
 *     state: RouterStateSnapshot
 *   ): Observable<Hero>|Promise<Hero>|Hero {
 *     return this.service.getHero(route.paramMap.get('id'));
 *   }
 * }
 * ```
 *
 * Here, the defined `resolve()` function is provided as part of the `Route` object
 * in the router configuration:
 *
 * ```

 * @NgModule({
 *   imports: [
 *     RouterModule.forRoot([
 *       {
 *         path: 'detail/:id',
 *         component: HeroDetailComponent,
 *         resolve: {
 *           hero: HeroResolver
 *         }
 *       }
 *     ])
 *   ],
 *   exports: [RouterModule]
 * })
 * export class AppRoutingModule {}
 * ```
 *
 * And you can access to your resolved data from `HeroComponent`:
 *
 * ```
 * @Component({
 *  selector: "app-hero",
 *  templateUrl: "hero.component.html",
 * })
 * export class HeroComponent {
 *
 *  constructor(private activatedRoute: ActivatedRoute) {}
 *
 *  ngOnInit() {
 *    this.activatedRoute.data.subscribe(({ hero }) => {
 *      // do something with your resolved data ...
 *    })
 *  }
 *
 * }
 * ```
 *
 * @usageNotes
 *
 * When both guard and resolvers are specified, the resolvers are not executed until
 * all guards have run and succeeded.
 * For example, consider the following route configuration:
 *
 * ```
 * {
 *  path: 'base'
 *  canActivate: [BaseGuard],
 *  resolve: {data: BaseDataResolver}
 *  children: [
 *   {
 *     path: 'child',
 *     guards: [ChildGuard],
 *     component: ChildComponent,
 *     resolve: {childData: ChildDataResolver}
 *    }
 *  ]
 * }
 * ```
 * The order of execution is: BaseGuard, ChildGuard, BaseDataResolver, ChildDataResolver.
 *
 * @publicApi
 * @deprecated Class-based `Route` resolvers are deprecated in favor of functional resolvers. An
 * injectable class can be used as a functional guard using the `inject` function: `resolve:
 * {'user': () => inject(UserResolver).resolve()}`.
 * @see `ResolveFn`
 */
export declare interface Resolve<T> {
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<T> | Promise<T> | T;
}

/**
 *
 * Represents the resolved data associated with a particular route.
 *
 * @see `Route#resolve`.
 *
 * @publicApi
 */
export declare type ResolveData = {
    [key: string | symbol]: ResolveFn<unknown> | DeprecatedGuard;
};

/**
 * An event triggered at the end of the Resolve phase of routing.
 * @see `ResolveStart`.
 *
 * @publicApi
 */
export declare class ResolveEnd extends RouterEvent {
    /** @docsNotRequired */
    urlAfterRedirects: string;
    /** @docsNotRequired */
    state: RouterStateSnapshot;
    readonly type = EventType.ResolveEnd;
    constructor(
    /** @docsNotRequired */
    id: number, 
    /** @docsNotRequired */
    url: string, 
    /** @docsNotRequired */
    urlAfterRedirects: string, 
    /** @docsNotRequired */
    state: RouterStateSnapshot);
    toString(): string;
}

/**
 * Function type definition for a data provider.

 * A data provider can be used with the router to resolve data during navigation.
 * The router waits for the data to be resolved before the route is finally activated.
 *
 * The following example implements a function that retrieves the data
 * needed to activate the requested route.
 *
 * {@example router/route_functional_guards.ts region="ResolveFn"}
 *
 * And you can access to your resolved data from `HeroComponent`:
 *
 * {@example router/route_functional_guards.ts region="ResolveDataUse"}
 *
 * @usageNotes
 *
 * When both guard and resolvers are specified, the resolvers are not executed until
 * all guards have run and succeeded.
 * For example, consider the following route configuration:
 *
 * ```
 * {
 *  path: 'base'
 *  canActivate: [baseGuard],
 *  resolve: {data: baseDataResolver}
 *  children: [
 *   {
 *     path: 'child',
 *     canActivate: [childGuard],
 *     component: ChildComponent,
 *     resolve: {childData: childDataResolver}
 *    }
 *  ]
 * }
 * ```
 * The order of execution is: baseGuard, childGuard, baseDataResolver, childDataResolver.
 *
 * @publicApi
 * @see `Route`
 */
export declare type ResolveFn<T> = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => Observable<T> | Promise<T> | T;

/**
 * An event triggered at the start of the Resolve phase of routing.
 *
 * Runs in the "resolve" phase whether or not there is anything to resolve.
 * In future, may change to only run when there are things to be resolved.
 *
 * @see `ResolveEnd`
 *
 * @publicApi
 */
export declare class ResolveStart extends RouterEvent {
    /** @docsNotRequired */
    urlAfterRedirects: string;
    /** @docsNotRequired */
    state: RouterStateSnapshot;
    readonly type = EventType.ResolveStart;
    constructor(
    /** @docsNotRequired */
    id: number, 
    /** @docsNotRequired */
    url: string, 
    /** @docsNotRequired */
    urlAfterRedirects: string, 
    /** @docsNotRequired */
    state: RouterStateSnapshot);
    toString(): string;
}

/**
 * A configuration object that defines a single route.
 * A set of routes are collected in a `Routes` array to define a `Router` configuration.
 * The router attempts to match segments of a given URL against each route,
 * using the configuration options defined in this object.
 *
 * Supports static, parameterized, redirect, and wildcard routes, as well as
 * custom route data and resolve methods.
 *
 * For detailed usage information, see the [Routing Guide](guide/router).
 *
 * @usageNotes
 *
 * ### Simple Configuration
 *
 * The following route specifies that when navigating to, for example,
 * `/team/11/user/bob`, the router creates the 'Team' component
 * with the 'User' child component in it.
 *
 * ```
 * [{
 *   path: 'team/:id',
 *  component: Team,
 *   children: [{
 *     path: 'user/:name',
 *     component: User
 *   }]
 * }]
 * ```
 *
 * ### Multiple Outlets
 *
 * The following route creates sibling components with multiple outlets.
 * When navigating to `/team/11(aux:chat/jim)`, the router creates the 'Team' component next to
 * the 'Chat' component. The 'Chat' component is placed into the 'aux' outlet.
 *
 * ```
 * [{
 *   path: 'team/:id',
 *   component: Team
 * }, {
 *   path: 'chat/:user',
 *   component: Chat
 *   outlet: 'aux'
 * }]
 * ```
 *
 * ### Wild Cards
 *
 * The following route uses wild-card notation to specify a component
 * that is always instantiated regardless of where you navigate to.
 *
 * ```
 * [{
 *   path: '**',
 *   component: WildcardComponent
 * }]
 * ```
 *
 * ### Redirects
 *
 * The following route uses the `redirectTo` property to ignore a segment of
 * a given URL when looking for a child path.
 *
 * When navigating to '/team/11/legacy/user/jim', the router changes the URL segment
 * '/team/11/legacy/user/jim' to '/team/11/user/jim', and then instantiates
 * the Team component with the User child component in it.
 *
 * ```
 * [{
 *   path: 'team/:id',
 *   component: Team,
 *   children: [{
 *     path: 'legacy/user/:name',
 *     redirectTo: 'user/:name'
 *   }, {
 *     path: 'user/:name',
 *     component: User
 *   }]
 * }]
 * ```
 *
 * The redirect path can be relative, as shown in this example, or absolute.
 * If we change the `redirectTo` value in the example to the absolute URL segment '/user/:name',
 * the result URL is also absolute, '/user/jim'.

 * ### Empty Path
 *
 * Empty-path route configurations can be used to instantiate components that do not 'consume'
 * any URL segments.
 *
 * In the following configuration, when navigating to
 * `/team/11`, the router instantiates the 'AllUsers' component.
 *
 * ```
 * [{
 *   path: 'team/:id',
 *   component: Team,
 *   children: [{
 *     path: '',
 *     component: AllUsers
 *   }, {
 *     path: 'user/:name',
 *     component: User
 *   }]
 * }]
 * ```
 *
 * Empty-path routes can have children. In the following example, when navigating
 * to `/team/11/user/jim`, the router instantiates the wrapper component with
 * the user component in it.
 *
 * Note that an empty path route inherits its parent's parameters and data.
 *
 * ```
 * [{
 *   path: 'team/:id',
 *   component: Team,
 *   children: [{
 *     path: '',
 *     component: WrapperCmp,
 *     children: [{
 *       path: 'user/:name',
 *       component: User
 *     }]
 *   }]
 * }]
 * ```
 *
 * ### Matching Strategy
 *
 * The default path-match strategy is 'prefix', which means that the router
 * checks URL elements from the left to see if the URL matches a specified path.
 * For example, '/team/11/user' matches 'team/:id'.
 *
 * ```
 * [{
 *   path: '',
 *   pathMatch: 'prefix', //default
 *   redirectTo: 'main'
 * }, {
 *   path: 'main',
 *   component: Main
 * }]
 * ```
 *
 * You can specify the path-match strategy 'full' to make sure that the path
 * covers the whole unconsumed URL. It is important to do this when redirecting
 * empty-path routes. Otherwise, because an empty path is a prefix of any URL,
 * the router would apply the redirect even when navigating to the redirect destination,
 * creating an endless loop.
 *
 * In the following example, supplying the 'full' `pathMatch` strategy ensures
 * that the router applies the redirect if and only if navigating to '/'.
 *
 * ```
 * [{
 *   path: '',
 *   pathMatch: 'full',
 *   redirectTo: 'main'
 * }, {
 *   path: 'main',
 *   component: Main
 * }]
 * ```
 *
 * ### Componentless Routes
 *
 * You can share parameters between sibling components.
 * For example, suppose that two sibling components should go next to each other,
 * and both of them require an ID parameter. You can accomplish this using a route
 * that does not specify a component at the top level.
 *
 * In the following example, 'MainChild' and 'AuxChild' are siblings.
 * When navigating to 'parent/10/(a//aux:b)', the route instantiates
 * the main child and aux child components next to each other.
 * For this to work, the application component must have the primary and aux outlets defined.
 *
 * ```
 * [{
 *    path: 'parent/:id',
 *    children: [
 *      { path: 'a', component: MainChild },
 *      { path: 'b', component: AuxChild, outlet: 'aux' }
 *    ]
 * }]
 * ```
 *
 * The router merges the parameters, data, and resolve of the componentless
 * parent into the parameters, data, and resolve of the children.
 *
 * This is especially useful when child components are defined
 * with an empty path string, as in the following example.
 * With this configuration, navigating to '/parent/10' creates
 * the main child and aux components.
 *
 * ```
 * [{
 *    path: 'parent/:id',
 *    children: [
 *      { path: '', component: MainChild },
 *      { path: '', component: AuxChild, outlet: 'aux' }
 *    ]
 * }]
 * ```
 *
 * ### Lazy Loading
 *
 * Lazy loading speeds up application load time by splitting the application
 * into multiple bundles and loading them on demand.
 * To use lazy loading, provide the `loadChildren` property in the `Route` object,
 * instead of the `children` property.
 *
 * Given the following example route, the router will lazy load
 * the associated module on demand using the browser native import system.
 *
 * ```
 * [{
 *   path: 'lazy',
 *   loadChildren: () => import('./lazy-route/lazy.module').then(mod => mod.LazyModule),
 * }];
 * ```
 *
 * @publicApi
 */
export declare interface Route {
    /**
     * Used to define a page title for the route. This can be a static string or an `Injectable` that
     * implements `Resolve`.
     *
     * @see `PageTitleStrategy`
     */
    title?: string | Type<Resolve<string>> | ResolveFn<string>;
    /**
     * The path to match against. Cannot be used together with a custom `matcher` function.
     * A URL string that uses router matching notation.
     * Can be a wild card (`**`) that matches any URL (see Usage Notes below).
     * Default is "/" (the root path).
     *
     */
    path?: string;
    /**
     * The path-matching strategy, one of 'prefix' or 'full'.
     * Default is 'prefix'.
     *
     * By default, the router checks URL elements from the left to see if the URL
     * matches a given path and stops when there is a config match. Importantly there must still be a
     * config match for each segment of the URL. For example, '/team/11/user' matches the prefix
     * 'team/:id' if one of the route's children matches the segment 'user'. That is, the URL
     * '/team/11/user' matches the config
     * `{path: 'team/:id', children: [{path: ':user', component: User}]}`
     * but does not match when there are no children as in `{path: 'team/:id', component: Team}`.
     *
     * The path-match strategy 'full' matches against the entire URL.
     * It is important to do this when redirecting empty-path routes.
     * Otherwise, because an empty path is a prefix of any URL,
     * the router would apply the redirect even when navigating
     * to the redirect destination, creating an endless loop.
     *
     */
    pathMatch?: 'prefix' | 'full';
    /**
     * A custom URL-matching function. Cannot be used together with `path`.
     */
    matcher?: UrlMatcher;
    /**
     * The component to instantiate when the path matches.
     * Can be empty if child routes specify components.
     */
    component?: Type<any>;
    /**
     * An object specifying a lazy-loaded component.
     */
    loadComponent?: () => Type<unknown> | Observable<Type<unknown> | DefaultExport<Type<unknown>>> | Promise<Type<unknown> | DefaultExport<Type<unknown>>>;
    /**
     * A URL to redirect to when the path matches.
     *
     * Absolute if the URL begins with a slash (/), otherwise relative to the path URL.
     * Note that no further redirects are evaluated after an absolute redirect.
     *
     * When not present, router does not redirect.
     */
    redirectTo?: string;
    /**
     * Name of a `RouterOutlet` object where the component can be placed
     * when the path matches.
     */
    outlet?: string;
    /**
     * An array of `CanActivateFn` or DI tokens used to look up `CanActivate()`
     * handlers, in order to determine if the current user is allowed to
     * activate the component. By default, any user can activate.
     *
     * When using a function rather than DI tokens, the function can call `inject` to get any required
     * dependencies. This `inject` call must be done in a synchronous context.
     */
    canActivate?: Array<CanActivateFn | DeprecatedGuard>;
    /**
     * An array of `CanMatchFn` or DI tokens used to look up `CanMatch()`
     * handlers, in order to determine if the current user is allowed to
     * match the `Route`. By default, any route can match.
     *
     * When using a function rather than DI tokens, the function can call `inject` to get any required
     * dependencies. This `inject` call must be done in a synchronous context.
     */
    canMatch?: Array<CanMatchFn | DeprecatedGuard>;
    /**
     * An array of `CanActivateChildFn` or DI tokens used to look up `CanActivateChild()` handlers,
     * in order to determine if the current user is allowed to activate
     * a child of the component. By default, any user can activate a child.
     *
     * When using a function rather than DI tokens, the function can call `inject` to get any required
     * dependencies. This `inject` call must be done in a synchronous context.
     */
    canActivateChild?: Array<CanActivateChildFn | DeprecatedGuard>;
    /**
     * An array of `CanDeactivateFn` or DI tokens used to look up `CanDeactivate()`
     * handlers, in order to determine if the current user is allowed to
     * deactivate the component. By default, any user can deactivate.
     *
     * When using a function rather than DI tokens, the function can call `inject` to get any required
     * dependencies. This `inject` call must be done in a synchronous context.
     */
    canDeactivate?: Array<CanDeactivateFn<any> | DeprecatedGuard>;
    /**
     * An array of `CanLoadFn` or DI tokens used to look up `CanLoad()`
     * handlers, in order to determine if the current user is allowed to
     * load the component. By default, any user can load.
     *
     * When using a function rather than DI tokens, the function can call `inject` to get any required
     * dependencies. This `inject` call must be done in a synchronous context.
     * @deprecated Use `canMatch` instead
     */
    canLoad?: Array<CanLoadFn | DeprecatedGuard>;
    /**
     * Additional developer-defined data provided to the component via
     * `ActivatedRoute`. By default, no additional data is passed.
     */
    data?: Data;
    /**
     * A map of DI tokens used to look up data resolvers. See `Resolve`.
     */
    resolve?: ResolveData;
    /**
     * An array of child `Route` objects that specifies a nested route
     * configuration.
     */
    children?: Routes;
    /**
     * An object specifying lazy-loaded child routes.
     */
    loadChildren?: LoadChildren;
    /**
     * A policy for when to run guards and resolvers on a route.
     *
     * Guards and/or resolvers will always run when a route is activated or deactivated. When a route
     * is unchanged, the default behavior is the same as `paramsChange`.
     *
     * `paramsChange` : Rerun the guards and resolvers when path or
     * path param changes. This does not include query parameters. This option is the default.
     * - `always` : Run on every execution.
     * - `pathParamsChange` : Rerun guards and resolvers when the path params
     * change. This does not compare matrix or query parameters.
     * - `paramsOrQueryParamsChange` : Run when path, matrix, or query parameters change.
     * - `pathParamsOrQueryParamsChange` : Rerun guards and resolvers when the path params
     * change or query params have changed. This does not include matrix parameters.
     *
     * @see `RunGuardsAndResolvers`
     */
    runGuardsAndResolvers?: RunGuardsAndResolvers;
    /**
     * A `Provider` array to use for this `Route` and its `children`.
     *
     * The `Router` will create a new `EnvironmentInjector` for this
     * `Route` and use it for this `Route` and its `children`. If this
     * route also has a `loadChildren` function which returns an `NgModuleRef`, this injector will be
     * used as the parent of the lazy loaded module.
     */
    providers?: Array<Provider | EnvironmentProviders>;
}

/**
 * An event triggered when a route has been lazy loaded.
 *
 * @see `RouteConfigLoadStart`
 *
 * @publicApi
 */
export declare class RouteConfigLoadEnd {
    /** @docsNotRequired */
    route: Route;
    readonly type = EventType.RouteConfigLoadEnd;
    constructor(
    /** @docsNotRequired */
    route: Route);
    toString(): string;
}

/**
 * An event triggered before lazy loading a route configuration.
 *
 * @see `RouteConfigLoadEnd`
 *
 * @publicApi
 */
export declare class RouteConfigLoadStart {
    /** @docsNotRequired */
    route: Route;
    readonly type = EventType.RouteConfigLoadStart;
    constructor(
    /** @docsNotRequired */
    route: Route);
    toString(): string;
}

/**
 * @description
 *
 * A service that provides navigation among views and URL manipulation capabilities.
 *
 * @see `Route`.
 * @see [Routing and Navigation Guide](guide/router).
 *
 * @ngModule RouterModule
 *
 * @publicApi
 */
export declare class Router {
    private disposed;
    private locationSubscription?;
    private get navigationId();
    /**
     * The id of the currently active page in the router.
     * Updated to the transition's target id on a successful navigation.
     *
     * This is used to track what page the router last activated. When an attempted navigation fails,
     * the router can then use this to compute how to restore the state back to the previously active
     * page.
     */
    private currentPageId;
    /**
     * The ɵrouterPageId of whatever page is currently active in the browser history. This is
     * important for computing the target page id for new navigations because we need to ensure each
     * page id in the browser history is 1 more than the previous entry.
     */
    private get browserPageId();
    private console;
    private isNgZoneEnabled;
    /**
     * An event stream for routing events.
     */
    get events(): Observable<Event_2>;
    /**
     * The current state of routing in this NgModule.
     */
    readonly routerState: RouterState;
    private options;
    private pendingTasks;
    /**
     * A handler for navigation errors in this NgModule.
     *
     * @deprecated Subscribe to the `Router` events and watch for `NavigationError` instead.
     *   `provideRouter` has the `withNavigationErrorHandler` feature to make this easier.
     * @see `withNavigationErrorHandler`
     */
    errorHandler: (error: any) => any;
    /**
     * A handler for errors thrown by `Router.parseUrl(url)`
     * when `url` contains an invalid character.
     * The most common case is a `%` sign
     * that's not encoded and is not part of a percent encoded sequence.
     *
     * @deprecated URI parsing errors should be handled in the `UrlSerializer`.
     *
     * @see `RouterModule`
     */
    malformedUriErrorHandler: (error: URIError, urlSerializer: UrlSerializer, url: string) => UrlTree;
    /**
     * True if at least one navigation event has occurred,
     * false otherwise.
     */
    navigated: boolean;
    private lastSuccessfulId;
    /**
     * A strategy for extracting and merging URLs.
     * Used for AngularJS to Angular migrations.
     *
     * @deprecated Configure using `providers` instead:
     *   `{provide: UrlHandlingStrategy, useClass: MyStrategy}`.
     */
    urlHandlingStrategy: UrlHandlingStrategy;
    /**
     * A strategy for re-using routes.
     *
     * @deprecated Configure using `providers` instead:
     *   `{provide: RouteReuseStrategy, useClass: MyStrategy}`.
     */
    routeReuseStrategy: RouteReuseStrategy;
    /**
     * A strategy for setting the title based on the `routerState`.
     *
     * @deprecated Configure using `providers` instead:
     *   `{provide: TitleStrategy, useClass: MyStrategy}`.
     */
    titleStrategy?: TitleStrategy;
    /**
     * How to handle a navigation request to the current URL.
     *
     *
     * @deprecated Configure this through `provideRouter` or `RouterModule.forRoot` instead.
     * @see `withRouterConfig`
     * @see `provideRouter`
     * @see `RouterModule`
     */
    onSameUrlNavigation: OnSameUrlNavigation;
    /**
     * How to merge parameters, data, resolved data, and title from parent to child
     * routes. One of:
     *
     * - `'emptyOnly'` : Inherit parent parameters, data, and resolved data
     * for path-less or component-less routes.
     * - `'always'` : Inherit parent parameters, data, and resolved data
     * for all child routes.
     *
     * @deprecated Configure this through `provideRouter` or `RouterModule.forRoot` instead.
     * @see `withRouterConfig`
     * @see `provideRouter`
     * @see `RouterModule`
     */
    paramsInheritanceStrategy: 'emptyOnly' | 'always';
    /**
     * Determines when the router updates the browser URL.
     * By default (`"deferred"`), updates the browser URL after navigation has finished.
     * Set to `'eager'` to update the browser URL at the beginning of navigation.
     * You can choose to update early so that, if navigation fails,
     * you can show an error message with the URL that failed.
     *
     * @deprecated Configure this through `provideRouter` or `RouterModule.forRoot` instead.
     * @see `withRouterConfig`
     * @see `provideRouter`
     * @see `RouterModule`
     */
    urlUpdateStrategy: 'deferred' | 'eager';
    /**
     * Configures how the Router attempts to restore state when a navigation is cancelled.
     *
     * 'replace' - Always uses `location.replaceState` to set the browser state to the state of the
     * router before the navigation started. This means that if the URL of the browser is updated
     * _before_ the navigation is canceled, the Router will simply replace the item in history rather
     * than trying to restore to the previous location in the session history. This happens most
     * frequently with `urlUpdateStrategy: 'eager'` and navigations with the browser back/forward
     * buttons.
     *
     * 'computed' - Will attempt to return to the same index in the session history that corresponds
     * to the Angular route when the navigation gets cancelled. For example, if the browser back
     * button is clicked and the navigation is cancelled, the Router will trigger a forward navigation
     * and vice versa.
     *
     * Note: the 'computed' option is incompatible with any `UrlHandlingStrategy` which only
     * handles a portion of the URL because the history restoration navigates to the previous place in
     * the browser history rather than simply resetting a portion of the URL.
     *
     * The default value is `replace`.
     *
     * @deprecated Configure this through `provideRouter` or `RouterModule.forRoot` instead.
     * @see `withRouterConfig`
     * @see `provideRouter`
     * @see `RouterModule`
     */
    canceledNavigationResolution: 'replace' | 'computed';
    config: Routes;
    private readonly navigationTransitions;
    private readonly urlSerializer;
    private readonly location;
    constructor();
    /**
     * Sets up the location change listener and performs the initial navigation.
     */
    initialNavigation(): void;
    /**
     * Sets up the location change listener. This listener detects navigations triggered from outside
     * the Router (the browser back/forward buttons, for example) and schedules a corresponding Router
     * navigation so that the correct events, guards, etc. are triggered.
     */
    setUpLocationChangeListener(): void;
    /**
     * Schedules a router navigation to synchronize Router state with the browser state.
     *
     * This is done as a response to a popstate event and the initial navigation. These
     * two scenarios represent times when the browser URL/state has been updated and
     * the Router needs to respond to ensure its internal state matches.
     */
    private navigateToSyncWithBrowser;
    /** The current URL. */
    get url(): string;
    /**
     * Returns the current `Navigation` object when the router is navigating,
     * and `null` when idle.
     */
    getCurrentNavigation(): Navigation | null;
    /**
     * The `Navigation` object of the most recent navigation to succeed and `null` if there
     *     has not been a successful navigation yet.
     */
    get lastSuccessfulNavigation(): Navigation | null;
    /**
     * Resets the route configuration used for navigation and generating links.
     *
     * @param config The route array for the new configuration.
     *
     * @usageNotes
     *
     * ```
     * router.resetConfig([
     *  { path: 'team/:id', component: TeamCmp, children: [
     *    { path: 'simple', component: SimpleCmp },
     *    { path: 'user/:name', component: UserCmp }
     *  ]}
     * ]);
     * ```
     */
    resetConfig(config: Routes): void;
    /** @nodoc */
    ngOnDestroy(): void;
    /** Disposes of the router. */
    dispose(): void;
    /**
     * Appends URL segments to the current URL tree to create a new URL tree.
     *
     * @param commands An array of URL fragments with which to construct the new URL tree.
     * If the path is static, can be the literal URL string. For a dynamic path, pass an array of path
     * segments, followed by the parameters for each segment.
     * The fragments are applied to the current URL tree or the one provided  in the `relativeTo`
     * property of the options object, if supplied.
     * @param navigationExtras Options that control the navigation strategy.
     * @returns The new URL tree.
     *
     * @usageNotes
     *
     * ```
     * // create /team/33/user/11
     * router.createUrlTree(['/team', 33, 'user', 11]);
     *
     * // create /team/33;expand=true/user/11
     * router.createUrlTree(['/team', 33, {expand: true}, 'user', 11]);
     *
     * // you can collapse static segments like this (this works only with the first passed-in value):
     * router.createUrlTree(['/team/33/user', userId]);
     *
     * // If the first segment can contain slashes, and you do not want the router to split it,
     * // you can do the following:
     * router.createUrlTree([{segmentPath: '/one/two'}]);
     *
     * // create /team/33/(user/11//right:chat)
     * router.createUrlTree(['/team', 33, {outlets: {primary: 'user/11', right: 'chat'}}]);
     *
     * // remove the right secondary node
     * router.createUrlTree(['/team', 33, {outlets: {primary: 'user/11', right: null}}]);
     *
     * // assuming the current url is `/team/33/user/11` and the route points to `user/11`
     *
     * // navigate to /team/33/user/11/details
     * router.createUrlTree(['details'], {relativeTo: route});
     *
     * // navigate to /team/33/user/22
     * router.createUrlTree(['../22'], {relativeTo: route});
     *
     * // navigate to /team/44/user/22
     * router.createUrlTree(['../../team/44/user/22'], {relativeTo: route});
     *
     * Note that a value of `null` or `undefined` for `relativeTo` indicates that the
     * tree should be created relative to the root.
     * ```
     */
    createUrlTree(commands: any[], navigationExtras?: UrlCreationOptions): UrlTree;
    /**
     * Navigates to a view using an absolute route path.
     *
     * @param url An absolute path for a defined route. The function does not apply any delta to the
     *     current URL.
     * @param extras An object containing properties that modify the navigation strategy.
     *
     * @returns A Promise that resolves to 'true' when navigation succeeds,
     * to 'false' when navigation fails, or is rejected on error.
     *
     * @usageNotes
     *
     * The following calls request navigation to an absolute path.
     *
     * ```
     * router.navigateByUrl("/team/33/user/11");
     *
     * // Navigate without updating the URL
     * router.navigateByUrl("/team/33/user/11", { skipLocationChange: true });
     * ```
     *
     * @see [Routing and Navigation guide](guide/router)
     *
     */
    navigateByUrl(url: string | UrlTree, extras?: NavigationBehaviorOptions): Promise<boolean>;
    /**
     * Navigate based on the provided array of commands and a starting point.
     * If no starting route is provided, the navigation is absolute.
     *
     * @param commands An array of URL fragments with which to construct the target URL.
     * If the path is static, can be the literal URL string. For a dynamic path, pass an array of path
     * segments, followed by the parameters for each segment.
     * The fragments are applied to the current URL or the one provided  in the `relativeTo` property
     * of the options object, if supplied.
     * @param extras An options object that determines how the URL should be constructed or
     *     interpreted.
     *
     * @returns A Promise that resolves to `true` when navigation succeeds, to `false` when navigation
     *     fails,
     * or is rejected on error.
     *
     * @usageNotes
     *
     * The following calls request navigation to a dynamic route path relative to the current URL.
     *
     * ```
     * router.navigate(['team', 33, 'user', 11], {relativeTo: route});
     *
     * // Navigate without updating the URL, overriding the default behavior
     * router.navigate(['team', 33, 'user', 11], {relativeTo: route, skipLocationChange: true});
     * ```
     *
     * @see [Routing and Navigation guide](guide/router)
     *
     */
    navigate(commands: any[], extras?: NavigationExtras): Promise<boolean>;
    /** Serializes a `UrlTree` into a string */
    serializeUrl(url: UrlTree): string;
    /** Parses a string into a `UrlTree` */
    parseUrl(url: string): UrlTree;
    /**
     * Returns whether the url is activated.
     *
     * @deprecated
     * Use `IsActiveMatchOptions` instead.
     *
     * - The equivalent `IsActiveMatchOptions` for `true` is
     * `{paths: 'exact', queryParams: 'exact', fragment: 'ignored', matrixParams: 'ignored'}`.
     * - The equivalent for `false` is
     * `{paths: 'subset', queryParams: 'subset', fragment: 'ignored', matrixParams: 'ignored'}`.
     */
    isActive(url: string | UrlTree, exact: boolean): boolean;
    /**
     * Returns whether the url is activated.
     */
    isActive(url: string | UrlTree, matchOptions: IsActiveMatchOptions): boolean;
    private removeEmptyProps;
    private resetState;
    private resetUrlToCurrentUrlTree;
    private generateNgRouterState;
    static ɵfac: i0.ɵɵFactoryDeclaration<Router, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<Router>;
}

/**
 * A [DI token](guide/glossary/#di-token) for the router service.
 *
 * @publicApi
 */
export declare const ROUTER_CONFIGURATION: InjectionToken<ExtraOptions>;

/**
 * A [DI token](guide/glossary/#di-token) for the router initializer that
 * is called after the app is bootstrapped.
 *
 * @publicApi
 */
export declare const ROUTER_INITIALIZER: InjectionToken<(compRef: ComponentRef<any>) => void>;

declare class RouterConfigLoader {
    private componentLoaders;
    private childrenLoaders;
    onLoadStartListener?: (r: Route) => void;
    onLoadEndListener?: (r: Route) => void;
    private readonly compiler;
    loadComponent(route: Route): Observable<Type<unknown>>;
    loadChildren(parentInjector: Injector, route: Route): Observable<LoadedRouterConfig>;
    private loadModuleFactoryOrRoutes;
    static ɵfac: i0.ɵɵFactoryDeclaration<RouterConfigLoader, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<RouterConfigLoader>;
}

/**
 * Extra configuration options that can be used with the `withRouterConfig` function.
 *
 * @publicApi
 */
export declare interface RouterConfigOptions {
    /**
     * Configures how the Router attempts to restore state when a navigation is cancelled.
     *
     * 'replace' - Always uses `location.replaceState` to set the browser state to the state of the
     * router before the navigation started. This means that if the URL of the browser is updated
     * _before_ the navigation is canceled, the Router will simply replace the item in history rather
     * than trying to restore to the previous location in the session history. This happens most
     * frequently with `urlUpdateStrategy: 'eager'` and navigations with the browser back/forward
     * buttons.
     *
     * 'computed' - Will attempt to return to the same index in the session history that corresponds
     * to the Angular route when the navigation gets cancelled. For example, if the browser back
     * button is clicked and the navigation is cancelled, the Router will trigger a forward navigation
     * and vice versa.
     *
     * Note: the 'computed' option is incompatible with any `UrlHandlingStrategy` which only
     * handles a portion of the URL because the history restoration navigates to the previous place in
     * the browser history rather than simply resetting a portion of the URL.
     *
     * The default value is `replace` when not set.
     */
    canceledNavigationResolution?: 'replace' | 'computed';
    /**
     * Configures the default for handling a navigation request to the current URL.
     *
     * If unset, the `Router` will use `'ignore'`.
     *
     * @see `OnSameUrlNavigation`
     */
    onSameUrlNavigation?: OnSameUrlNavigation;
    /**
     * Defines how the router merges parameters, data, and resolved data from parent to child
     * routes. By default ('emptyOnly'), inherits parent parameters only for
     * path-less or component-less routes.
     *
     * Set to 'always' to enable unconditional inheritance of parent parameters.
     *
     * Note that when dealing with matrix parameters, "parent" refers to the parent `Route`
     * config which does not necessarily mean the "URL segment to the left". When the `Route` `path`
     * contains multiple segments, the matrix parameters must appear on the last segment. For example,
     * matrix parameters for `{path: 'a/b', component: MyComp}` should appear as `a/b;foo=bar` and not
     * `a;foo=bar/b`.
     *
     */
    paramsInheritanceStrategy?: 'emptyOnly' | 'always';
    /**
     * Defines when the router updates the browser URL. By default ('deferred'),
     * update after successful navigation.
     * Set to 'eager' if prefer to update the URL at the beginning of navigation.
     * Updating the URL early allows you to handle a failure of navigation by
     * showing an error message with the URL that failed.
     */
    urlUpdateStrategy?: 'deferred' | 'eager';
}

/**
 * A type alias for providers returned by `withRouterConfig` for use with `provideRouter`.
 *
 * @see `withRouterConfig`
 * @see `provideRouter`
 *
 * @publicApi
 */
export declare type RouterConfigurationFeature = RouterFeature<RouterFeatureKind.RouterConfigurationFeature>;

/**
 * @description
 *
 * Provides a way to customize when activated routes get reused.
 *
 * @publicApi
 */
export declare abstract class RouteReuseStrategy {
    /** Determines if this route (and its subtree) should be detached to be reused later */
    abstract shouldDetach(route: ActivatedRouteSnapshot): boolean;
    /**
     * Stores the detached route.
     *
     * Storing a `null` value should erase the previously stored value.
     */
    abstract store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void;
    /** Determines if this route (and its subtree) should be reattached */
    abstract shouldAttach(route: ActivatedRouteSnapshot): boolean;
    /** Retrieves the previously stored route */
    abstract retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null;
    /** Determines if a route should be reused */
    abstract shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean;
    static ɵfac: i0.ɵɵFactoryDeclaration<RouteReuseStrategy, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<RouteReuseStrategy>;
}

/**
 * Base for events the router goes through, as opposed to events tied to a specific
 * route. Fired one time for any given navigation.
 *
 * The following code shows how a class subscribes to router events.
 *
 * ```ts
 * import {Event, RouterEvent, Router} from '@angular/router';
 *
 * class MyService {
 *   constructor(public router: Router) {
 *     router.events.pipe(
 *        filter((e: Event): e is RouterEvent => e instanceof RouterEvent)
 *     ).subscribe((e: RouterEvent) => {
 *       // Do something
 *     });
 *   }
 * }
 * ```
 *
 * @see `Event`
 * @see [Router events summary](guide/router-reference#router-events)
 * @publicApi
 */
export declare class RouterEvent {
    /** A unique ID that the router assigns to every router navigation. */
    id: number;
    /** The URL that is the destination for this navigation. */
    url: string;
    constructor(
    /** A unique ID that the router assigns to every router navigation. */
    id: number, 
    /** The URL that is the destination for this navigation. */
    url: string);
}

/**
 * Helper type to represent a Router feature.
 *
 * @publicApi
 */
export declare interface RouterFeature<FeatureKind extends RouterFeatureKind> {
    ɵkind: FeatureKind;
    ɵproviders: Provider[];
}

/**
 * The list of features as an enum to uniquely type each feature.
 */
declare const enum RouterFeatureKind {
    PreloadingFeature = 0,
    DebugTracingFeature = 1,
    EnabledBlockingInitialNavigationFeature = 2,
    DisabledInitialNavigationFeature = 3,
    InMemoryScrollingFeature = 4,
    RouterConfigurationFeature = 5,
    RouterHashLocationFeature = 6,
    NavigationErrorHandlerFeature = 7
}

/**
 * A type alias that represents all Router features available for use with `provideRouter`.
 * Features can be enabled by adding special functions to the `provideRouter` call.
 * See documentation for each symbol to find corresponding function name. See also `provideRouter`
 * documentation on how to use those functions.
 *
 * @see `provideRouter`
 *
 * @publicApi
 */
export declare type RouterFeatures = PreloadingFeature | DebugTracingFeature | InitialNavigationFeature | InMemoryScrollingFeature | RouterConfigurationFeature | NavigationErrorHandlerFeature;

/**
 * A type alias for providers returned by `withHashLocation` for use with `provideRouter`.
 *
 * @see `withHashLocation`
 * @see `provideRouter`
 *
 * @publicApi
 */
export declare type RouterHashLocationFeature = RouterFeature<RouterFeatureKind.RouterHashLocationFeature>;

/**
 * @description
 *
 * When applied to an element in a template, makes that element a link
 * that initiates navigation to a route. Navigation opens one or more routed components
 * in one or more `<router-outlet>` locations on the page.
 *
 * Given a route configuration `[{ path: 'user/:name', component: UserCmp }]`,
 * the following creates a static link to the route:
 * `<a routerLink="/user/bob">link to user component</a>`
 *
 * You can use dynamic values to generate the link.
 * For a dynamic link, pass an array of path segments,
 * followed by the params for each segment.
 * For example, `['/team', teamId, 'user', userName, {details: true}]`
 * generates a link to `/team/11/user/bob;details=true`.
 *
 * Multiple static segments can be merged into one term and combined with dynamic segments.
 * For example, `['/team/11/user', userName, {details: true}]`
 *
 * The input that you provide to the link is treated as a delta to the current URL.
 * For instance, suppose the current URL is `/user/(box//aux:team)`.
 * The link `<a [routerLink]="['/user/jim']">Jim</a>` creates the URL
 * `/user/(jim//aux:team)`.
 * See {@link Router#createUrlTree createUrlTree} for more information.
 *
 * @usageNotes
 *
 * You can use absolute or relative paths in a link, set query parameters,
 * control how parameters are handled, and keep a history of navigation states.
 *
 * ### Relative link paths
 *
 * The first segment name can be prepended with `/`, `./`, or `../`.
 * * If the first segment begins with `/`, the router looks up the route from the root of the
 *   app.
 * * If the first segment begins with `./`, or doesn't begin with a slash, the router
 *   looks in the children of the current activated route.
 * * If the first segment begins with `../`, the router goes up one level in the route tree.
 *
 * ### Setting and handling query params and fragments
 *
 * The following link adds a query parameter and a fragment to the generated URL:
 *
 * ```
 * <a [routerLink]="['/user/bob']" [queryParams]="{debug: true}" fragment="education">
 *   link to user component
 * </a>
 * ```
 * By default, the directive constructs the new URL using the given query parameters.
 * The example generates the link: `/user/bob?debug=true#education`.
 *
 * You can instruct the directive to handle query parameters differently
 * by specifying the `queryParamsHandling` option in the link.
 * Allowed values are:
 *
 *  - `'merge'`: Merge the given `queryParams` into the current query params.
 *  - `'preserve'`: Preserve the current query params.
 *
 * For example:
 *
 * ```
 * <a [routerLink]="['/user/bob']" [queryParams]="{debug: true}" queryParamsHandling="merge">
 *   link to user component
 * </a>
 * ```
 *
 * See {@link UrlCreationOptions.queryParamsHandling UrlCreationOptions#queryParamsHandling}.
 *
 * ### Preserving navigation history
 *
 * You can provide a `state` value to be persisted to the browser's
 * [`History.state` property](https://developer.mozilla.org/en-US/docs/Web/API/History#Properties).
 * For example:
 *
 * ```
 * <a [routerLink]="['/user/bob']" [state]="{tracingId: 123}">
 *   link to user component
 * </a>
 * ```
 *
 * Use {@link Router.getCurrentNavigation() Router#getCurrentNavigation} to retrieve a saved
 * navigation-state value. For example, to capture the `tracingId` during the `NavigationStart`
 * event:
 *
 * ```
 * // Get NavigationStart events
 * router.events.pipe(filter(e => e instanceof NavigationStart)).subscribe(e => {
 *   const navigation = router.getCurrentNavigation();
 *   tracingService.trace({id: navigation.extras.state.tracingId});
 * });
 * ```
 *
 * @ngModule RouterModule
 *
 * @publicApi
 */
declare class RouterLink implements OnChanges, OnDestroy {
    private router;
    private route;
    private readonly tabIndexAttribute;
    private readonly renderer;
    private readonly el;
    private locationStrategy?;
    private _preserveFragment;
    private _skipLocationChange;
    private _replaceUrl;
    /**
     * Represents an `href` attribute value applied to a host element,
     * when a host element is `<a>`. For other tags, the value is `null`.
     */
    href: string | null;
    /**
     * Represents the `target` attribute on a host element.
     * This is only used when the host element is an `<a>` tag.
     */
    target?: string;
    /**
     * Passed to {@link Router#createUrlTree Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * @see {@link UrlCreationOptions#queryParams UrlCreationOptions#queryParams}
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    queryParams?: Params | null;
    /**
     * Passed to {@link Router#createUrlTree Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * @see {@link UrlCreationOptions#fragment UrlCreationOptions#fragment}
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    fragment?: string;
    /**
     * Passed to {@link Router#createUrlTree Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * @see {@link UrlCreationOptions#queryParamsHandling UrlCreationOptions#queryParamsHandling}
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    queryParamsHandling?: QueryParamsHandling | null;
    /**
     * Passed to {@link Router#navigateByUrl Router#navigateByUrl} as part of the
     * `NavigationBehaviorOptions`.
     * @see {@link NavigationBehaviorOptions#state NavigationBehaviorOptions#state}
     * @see {@link Router#navigateByUrl Router#navigateByUrl}
     */
    state?: {
        [k: string]: any;
    };
    /**
     * Passed to {@link Router#createUrlTree Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * Specify a value here when you do not want to use the default value
     * for `routerLink`, which is the current activated route.
     * Note that a value of `undefined` here will use the `routerLink` default.
     * @see {@link UrlCreationOptions#relativeTo UrlCreationOptions#relativeTo}
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    relativeTo?: ActivatedRoute | null;
    private commands;
    /** Whether a host element is an `<a>` tag. */
    private isAnchorElement;
    private subscription?;
    constructor(router: Router, route: ActivatedRoute, tabIndexAttribute: string | null | undefined, renderer: Renderer2, el: ElementRef, locationStrategy?: LocationStrategy | undefined);
    /**
     * Passed to {@link Router#createUrlTree Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * @see {@link UrlCreationOptions#preserveFragment UrlCreationOptions#preserveFragment}
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    set preserveFragment(preserveFragment: boolean | string | null | undefined);
    get preserveFragment(): boolean;
    /**
     * Passed to {@link Router#navigateByUrl Router#navigateByUrl} as part of the
     * `NavigationBehaviorOptions`.
     * @see {@link NavigationBehaviorOptions#skipLocationChange NavigationBehaviorOptions#skipLocationChange}
     * @see {@link Router#navigateByUrl Router#navigateByUrl}
     */
    set skipLocationChange(skipLocationChange: boolean | string | null | undefined);
    get skipLocationChange(): boolean;
    /**
     * Passed to {@link Router#navigateByUrl Router#navigateByUrl} as part of the
     * `NavigationBehaviorOptions`.
     * @see {@link NavigationBehaviorOptions#replaceUrl NavigationBehaviorOptions#replaceUrl}
     * @see {@link Router#navigateByUrl Router#navigateByUrl}
     */
    set replaceUrl(replaceUrl: boolean | string | null | undefined);
    get replaceUrl(): boolean;
    /**
     * Modifies the tab index if there was not a tabindex attribute on the element during
     * instantiation.
     */
    private setTabIndexIfNotOnNativeEl;
    /** @nodoc */
    ngOnChanges(changes: SimpleChanges): void;
    /**
     * Commands to pass to {@link Router#createUrlTree Router#createUrlTree}.
     *   - **array**: commands to pass to {@link Router#createUrlTree Router#createUrlTree}.
     *   - **string**: shorthand for array of commands with just the string, i.e. `['/route']`
     *   - **null|undefined**: effectively disables the `routerLink`
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    set routerLink(commands: any[] | string | null | undefined);
    /** @nodoc */
    onClick(button: number, ctrlKey: boolean, shiftKey: boolean, altKey: boolean, metaKey: boolean): boolean;
    /** @nodoc */
    ngOnDestroy(): any;
    private updateHref;
    private applyAttributeValue;
    get urlTree(): UrlTree | null;
    static ɵfac: i0.ɵɵFactoryDeclaration<RouterLink, [null, null, { attribute: "tabindex"; }, null, null, null]>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<RouterLink, "[routerLink]", never, { "target": { "alias": "target"; "required": false; }; "queryParams": { "alias": "queryParams"; "required": false; }; "fragment": { "alias": "fragment"; "required": false; }; "queryParamsHandling": { "alias": "queryParamsHandling"; "required": false; }; "state": { "alias": "state"; "required": false; }; "relativeTo": { "alias": "relativeTo"; "required": false; }; "preserveFragment": { "alias": "preserveFragment"; "required": false; }; "skipLocationChange": { "alias": "skipLocationChange"; "required": false; }; "replaceUrl": { "alias": "replaceUrl"; "required": false; }; "routerLink": { "alias": "routerLink"; "required": false; }; }, {}, never, never, true, never>;
}
export { RouterLink }
export { RouterLink as RouterLinkWithHref }

/**
 *
 * @description
 *
 * Tracks whether the linked route of an element is currently active, and allows you
 * to specify one or more CSS classes to add to the element when the linked route
 * is active.
 *
 * Use this directive to create a visual distinction for elements associated with an active route.
 * For example, the following code highlights the word "Bob" when the router
 * activates the associated route:
 *
 * ```
 * <a routerLink="/user/bob" routerLinkActive="active-link">Bob</a>
 * ```
 *
 * Whenever the URL is either '/user' or '/user/bob', the "active-link" class is
 * added to the anchor tag. If the URL changes, the class is removed.
 *
 * You can set more than one class using a space-separated string or an array.
 * For example:
 *
 * ```
 * <a routerLink="/user/bob" routerLinkActive="class1 class2">Bob</a>
 * <a routerLink="/user/bob" [routerLinkActive]="['class1', 'class2']">Bob</a>
 * ```
 *
 * To add the classes only when the URL matches the link exactly, add the option `exact: true`:
 *
 * ```
 * <a routerLink="/user/bob" routerLinkActive="active-link" [routerLinkActiveOptions]="{exact:
 * true}">Bob</a>
 * ```
 *
 * To directly check the `isActive` status of the link, assign the `RouterLinkActive`
 * instance to a template variable.
 * For example, the following checks the status without assigning any CSS classes:
 *
 * ```
 * <a routerLink="/user/bob" routerLinkActive #rla="routerLinkActive">
 *   Bob {{ rla.isActive ? '(already open)' : ''}}
 * </a>
 * ```
 *
 * You can apply the `RouterLinkActive` directive to an ancestor of linked elements.
 * For example, the following sets the active-link class on the `<div>`  parent tag
 * when the URL is either '/user/jim' or '/user/bob'.
 *
 * ```
 * <div routerLinkActive="active-link" [routerLinkActiveOptions]="{exact: true}">
 *   <a routerLink="/user/jim">Jim</a>
 *   <a routerLink="/user/bob">Bob</a>
 * </div>
 * ```
 *
 * The `RouterLinkActive` directive can also be used to set the aria-current attribute
 * to provide an alternative distinction for active elements to visually impaired users.
 *
 * For example, the following code adds the 'active' class to the Home Page link when it is
 * indeed active and in such case also sets its aria-current attribute to 'page':
 *
 * ```
 * <a routerLink="/" routerLinkActive="active" ariaCurrentWhenActive="page">Home Page</a>
 * ```
 *
 * @ngModule RouterModule
 *
 * @publicApi
 */
export declare class RouterLinkActive implements OnChanges, OnDestroy, AfterContentInit {
    private router;
    private element;
    private renderer;
    private readonly cdr;
    private link?;
    links: QueryList<RouterLink>;
    private classes;
    private routerEventsSubscription;
    private linkInputChangesSubscription?;
    private _isActive;
    get isActive(): boolean;
    /**
     * Options to configure how to determine if the router link is active.
     *
     * These options are passed to the `Router.isActive()` function.
     *
     * @see Router.isActive
     */
    routerLinkActiveOptions: {
        exact: boolean;
    } | IsActiveMatchOptions;
    /**
     * Aria-current attribute to apply when the router link is active.
     *
     * Possible values: `'page'` | `'step'` | `'location'` | `'date'` | `'time'` | `true` | `false`.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current}
     */
    ariaCurrentWhenActive?: 'page' | 'step' | 'location' | 'date' | 'time' | true | false;
    /**
     *
     * You can use the output `isActiveChange` to get notified each time the link becomes
     * active or inactive.
     *
     * Emits:
     * true  -> Route is active
     * false -> Route is inactive
     *
     * ```
     * <a
     *  routerLink="/user/bob"
     *  routerLinkActive="active-link"
     *  (isActiveChange)="this.onRouterLinkActive($event)">Bob</a>
     * ```
     */
    readonly isActiveChange: EventEmitter<boolean>;
    constructor(router: Router, element: ElementRef, renderer: Renderer2, cdr: ChangeDetectorRef, link?: RouterLink | undefined);
    /** @nodoc */
    ngAfterContentInit(): void;
    private subscribeToEachLinkOnChanges;
    set routerLinkActive(data: string[] | string);
    /** @nodoc */
    ngOnChanges(changes: SimpleChanges): void;
    /** @nodoc */
    ngOnDestroy(): void;
    private update;
    private isLinkActive;
    private hasActiveLinks;
    static ɵfac: i0.ɵɵFactoryDeclaration<RouterLinkActive, [null, null, null, null, { optional: true; }]>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<RouterLinkActive, "[routerLinkActive]", ["routerLinkActive"], { "routerLinkActiveOptions": { "alias": "routerLinkActiveOptions"; "required": false; }; "ariaCurrentWhenActive": { "alias": "ariaCurrentWhenActive"; "required": false; }; "routerLinkActive": { "alias": "routerLinkActive"; "required": false; }; }, { "isActiveChange": "isActiveChange"; }, ["links"], never, true, never>;
}

/**
 * @description
 *
 * Adds directives and providers for in-app navigation among views defined in an application.
 * Use the Angular `Router` service to declaratively specify application states and manage state
 * transitions.
 *
 * You can import this NgModule multiple times, once for each lazy-loaded bundle.
 * However, only one `Router` service can be active.
 * To ensure this, there are two ways to register routes when importing this module:
 *
 * * The `forRoot()` method creates an `NgModule` that contains all the directives, the given
 * routes, and the `Router` service itself.
 * * The `forChild()` method creates an `NgModule` that contains all the directives and the given
 * routes, but does not include the `Router` service.
 *
 * @see [Routing and Navigation guide](guide/router) for an
 * overview of how the `Router` service should be used.
 *
 * @publicApi
 */
export declare class RouterModule {
    constructor(guard: any);
    /**
     * Creates and configures a module with all the router providers and directives.
     * Optionally sets up an application listener to perform an initial navigation.
     *
     * When registering the NgModule at the root, import as follows:
     *
     * ```
     * @NgModule({
     *   imports: [RouterModule.forRoot(ROUTES)]
     * })
     * class MyNgModule {}
     * ```
     *
     * @param routes An array of `Route` objects that define the navigation paths for the application.
     * @param config An `ExtraOptions` configuration object that controls how navigation is performed.
     * @return The new `NgModule`.
     *
     */
    static forRoot(routes: Routes, config?: ExtraOptions): ModuleWithProviders<RouterModule>;
    /**
     * Creates a module with all the router directives and a provider registering routes,
     * without creating a new Router service.
     * When registering for submodules and lazy-loaded submodules, create the NgModule as follows:
     *
     * ```
     * @NgModule({
     *   imports: [RouterModule.forChild(ROUTES)]
     * })
     * class MyNgModule {}
     * ```
     *
     * @param routes An array of `Route` objects that define the navigation paths for the submodule.
     * @return The new NgModule.
     *
     */
    static forChild(routes: Routes): ModuleWithProviders<RouterModule>;
    static ɵfac: i0.ɵɵFactoryDeclaration<RouterModule, [{ optional: true; }]>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<RouterModule, never, [typeof i1.RouterOutlet, typeof i2.RouterLink, typeof i3.RouterLinkActive, typeof i4.ɵEmptyOutletComponent], [typeof i1.RouterOutlet, typeof i2.RouterLink, typeof i3.RouterLinkActive, typeof i4.ɵEmptyOutletComponent]>;
    static ɵinj: i0.ɵɵInjectorDeclaration<RouterModule>;
}

/**
 * @description
 *
 * Acts as a placeholder that Angular dynamically fills based on the current router state.
 *
 * Each outlet can have a unique name, determined by the optional `name` attribute.
 * The name cannot be set or changed dynamically. If not set, default value is "primary".
 *
 * ```
 * <router-outlet></router-outlet>
 * <router-outlet name='left'></router-outlet>
 * <router-outlet name='right'></router-outlet>
 * ```
 *
 * Named outlets can be the targets of secondary routes.
 * The `Route` object for a secondary route has an `outlet` property to identify the target outlet:
 *
 * `{path: <base-path>, component: <component>, outlet: <target_outlet_name>}`
 *
 * Using named outlets and secondary routes, you can target multiple outlets in
 * the same `RouterLink` directive.
 *
 * The router keeps track of separate branches in a navigation tree for each named outlet and
 * generates a representation of that tree in the URL.
 * The URL for a secondary route uses the following syntax to specify both the primary and secondary
 * routes at the same time:
 *
 * `http://base-path/primary-route-path(outlet-name:route-path)`
 *
 * A router outlet emits an activate event when a new component is instantiated,
 * deactivate event when a component is destroyed.
 * An attached event emits when the `RouteReuseStrategy` instructs the outlet to reattach the
 * subtree, and the detached event emits when the `RouteReuseStrategy` instructs the outlet to
 * detach the subtree.
 *
 * ```
 * <router-outlet
 *   (activate)='onActivate($event)'
 *   (deactivate)='onDeactivate($event)'
 *   (attach)='onAttach($event)'
 *   (detach)='onDetach($event)'></router-outlet>
 * ```
 *
 * @see [Routing tutorial](guide/router-tutorial-toh#named-outlets "Example of a named
 * outlet and secondary route configuration").
 * @see `RouterLink`
 * @see `Route`
 * @ngModule RouterModule
 *
 * @publicApi
 */
export declare class RouterOutlet implements OnDestroy, OnInit, RouterOutletContract {
    private activated;
    private _activatedRoute;
    /**
     * The name of the outlet
     *
     * @see [named outlets](guide/router-tutorial-toh#displaying-multiple-routes-in-named-outlets)
     */
    name: string;
    activateEvents: EventEmitter<any>;
    deactivateEvents: EventEmitter<any>;
    /**
     * Emits an attached component instance when the `RouteReuseStrategy` instructs to re-attach a
     * previously detached subtree.
     **/
    attachEvents: EventEmitter<unknown>;
    /**
     * Emits a detached component instance when the `RouteReuseStrategy` instructs to detach the
     * subtree.
     */
    detachEvents: EventEmitter<unknown>;
    private parentContexts;
    private location;
    private changeDetector;
    private environmentInjector;
    /** @nodoc */
    ngOnChanges(changes: SimpleChanges): void;
    /** @nodoc */
    ngOnDestroy(): void;
    private isTrackedInParentContexts;
    /** @nodoc */
    ngOnInit(): void;
    private initializeOutletWithName;
    get isActivated(): boolean;
    /**
     * @returns The currently activated component instance.
     * @throws An error if the outlet is not activated.
     */
    get component(): Object;
    get activatedRoute(): ActivatedRoute;
    get activatedRouteData(): Data;
    /**
     * Called when the `RouteReuseStrategy` instructs to detach the subtree
     */
    detach(): ComponentRef<any>;
    /**
     * Called when the `RouteReuseStrategy` instructs to re-attach a previously detached subtree
     */
    attach(ref: ComponentRef<any>, activatedRoute: ActivatedRoute): void;
    deactivate(): void;
    activateWith(activatedRoute: ActivatedRoute, environmentInjector?: EnvironmentInjector | null): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<RouterOutlet, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<RouterOutlet, "router-outlet", ["outlet"], { "name": { "alias": "name"; "required": false; }; }, { "activateEvents": "activate"; "deactivateEvents": "deactivate"; "attachEvents": "attach"; "detachEvents": "detach"; }, never, never, true, never>;
}

/**
 * An interface that defines the contract for developing a component outlet for the `Router`.
 *
 * An outlet acts as a placeholder that Angular dynamically fills based on the current router state.
 *
 * A router outlet should register itself with the `Router` via
 * `ChildrenOutletContexts#onChildOutletCreated` and unregister with
 * `ChildrenOutletContexts#onChildOutletDestroyed`. When the `Router` identifies a matched `Route`,
 * it looks for a registered outlet in the `ChildrenOutletContexts` and activates it.
 *
 * @see `ChildrenOutletContexts`
 * @publicApi
 */
export declare interface RouterOutletContract {
    /**
     * Whether the given outlet is activated.
     *
     * An outlet is considered "activated" if it has an active component.
     */
    isActivated: boolean;
    /** The instance of the activated component or `null` if the outlet is not activated. */
    component: Object | null;
    /**
     * The `Data` of the `ActivatedRoute` snapshot.
     */
    activatedRouteData: Data;
    /**
     * The `ActivatedRoute` for the outlet or `null` if the outlet is not activated.
     */
    activatedRoute: ActivatedRoute | null;
    /**
     * Called by the `Router` when the outlet should activate (create a component).
     */
    activateWith(activatedRoute: ActivatedRoute, environmentInjector: EnvironmentInjector | null): void;
    /**
     * A request to destroy the currently activated component.
     *
     * When a `RouteReuseStrategy` indicates that an `ActivatedRoute` should be removed but stored for
     * later re-use rather than destroyed, the `Router` will call `detach` instead.
     */
    deactivate(): void;
    /**
     * Called when the `RouteReuseStrategy` instructs to detach the subtree.
     *
     * This is similar to `deactivate`, but the activated component should _not_ be destroyed.
     * Instead, it is returned so that it can be reattached later via the `attach` method.
     */
    detach(): ComponentRef<unknown>;
    /**
     * Called when the `RouteReuseStrategy` instructs to re-attach a previously detached subtree.
     */
    attach(ref: ComponentRef<unknown>, activatedRoute: ActivatedRoute): void;
    /**
     * Emits an activate event when a new component is instantiated
     **/
    activateEvents?: EventEmitter<unknown>;
    /**
     * Emits a deactivate event when a component is destroyed.
     */
    deactivateEvents?: EventEmitter<unknown>;
    /**
     * Emits an attached component instance when the `RouteReuseStrategy` instructs to re-attach a
     * previously detached subtree.
     **/
    attachEvents?: EventEmitter<unknown>;
    /**
     * Emits a detached component instance when the `RouteReuseStrategy` instructs to detach the
     * subtree.
     */
    detachEvents?: EventEmitter<unknown>;
}

/**
 * The preloader optimistically loads all router configurations to
 * make navigations into lazily-loaded sections of the application faster.
 *
 * The preloader runs in the background. When the router bootstraps, the preloader
 * starts listening to all navigation events. After every such event, the preloader
 * will check if any configurations can be loaded lazily.
 *
 * If a route is protected by `canLoad` guards, the preloaded will not load it.
 *
 * @publicApi
 */
export declare class RouterPreloader implements OnDestroy {
    private router;
    private injector;
    private preloadingStrategy;
    private loader;
    private subscription?;
    constructor(router: Router, compiler: Compiler, injector: EnvironmentInjector, preloadingStrategy: PreloadingStrategy, loader: RouterConfigLoader);
    setUpPreloading(): void;
    preload(): Observable<any>;
    /** @nodoc */
    ngOnDestroy(): void;
    private processRoutes;
    private preloadConfig;
    static ɵfac: i0.ɵɵFactoryDeclaration<RouterPreloader, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<RouterPreloader>;
}

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
export declare class RouterState extends Tree<ActivatedRoute> {
    /** The current snapshot of the router state */
    snapshot: RouterStateSnapshot;
    toString(): string;
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
export declare class RouterStateSnapshot extends Tree<ActivatedRouteSnapshot> {
    /** The url from which this snapshot was created */
    url: string;
    toString(): string;
}

/**
 * The [DI token](guide/glossary/#di-token) for a router configuration.
 *
 * `ROUTES` is a low level API for router configuration via dependency injection.
 *
 * We recommend that in almost all cases to use higher level APIs such as `RouterModule.forRoot()`,
 * `provideRouter`, or `Router.resetConfig()`.
 *
 * @publicApi
 */
export declare const ROUTES: InjectionToken<Route[][]>;

/**
 * Represents a route configuration for the Router service.
 * An array of `Route` objects, used in `Router.config` and for nested route configurations
 * in `Route.children`.
 *
 * @see `Route`
 * @see `Router`
 * @see [Router configuration guide](guide/router-reference#configuration)
 * @publicApi
 */
export declare type Routes = Route[];

/**
 * An event triggered when routes are recognized.
 *
 * @publicApi
 */
export declare class RoutesRecognized extends RouterEvent {
    /** @docsNotRequired */
    urlAfterRedirects: string;
    /** @docsNotRequired */
    state: RouterStateSnapshot;
    readonly type = EventType.RoutesRecognized;
    constructor(
    /** @docsNotRequired */
    id: number, 
    /** @docsNotRequired */
    url: string, 
    /** @docsNotRequired */
    urlAfterRedirects: string, 
    /** @docsNotRequired */
    state: RouterStateSnapshot);
    /** @docsNotRequired */
    toString(): string;
}

/**
 * A policy for when to run guards and resolvers on a route.
 *
 * Guards and/or resolvers will always run when a route is activated or deactivated. When a route is
 * unchanged, the default behavior is the same as `paramsChange`.
 *
 * `paramsChange` : Rerun the guards and resolvers when path or
 * path param changes. This does not include query parameters. This option is the default.
 * - `always` : Run on every execution.
 * - `pathParamsChange` : Rerun guards and resolvers when the path params
 * change. This does not compare matrix or query parameters.
 * - `paramsOrQueryParamsChange` : Run when path, matrix, or query parameters change.
 * - `pathParamsOrQueryParamsChange` : Rerun guards and resolvers when the path params
 * change or query params have changed. This does not include matrix parameters.
 *
 * @see [Route.runGuardsAndResolvers](api/router/Route#runGuardsAndResolvers)
 * @publicApi
 */
export declare type RunGuardsAndResolvers = 'pathParamsChange' | 'pathParamsOrQueryParamsChange' | 'paramsChange' | 'paramsOrQueryParamsChange' | 'always' | ((from: ActivatedRouteSnapshot, to: ActivatedRouteSnapshot) => boolean);

/**
 * An event triggered by scrolling.
 *
 * @publicApi
 */
export declare class Scroll {
    /** @docsNotRequired */
    readonly routerEvent: NavigationEnd | NavigationSkipped;
    /** @docsNotRequired */
    readonly position: [number, number] | null;
    /** @docsNotRequired */
    readonly anchor: string | null;
    readonly type = EventType.Scroll;
    constructor(
    /** @docsNotRequired */
    routerEvent: NavigationEnd | NavigationSkipped, 
    /** @docsNotRequired */
    position: [number, number] | null, 
    /** @docsNotRequired */
    anchor: string | null);
    toString(): string;
}

/**
 * Provides a strategy for setting the page title after a router navigation.
 *
 * The built-in implementation traverses the router state snapshot and finds the deepest primary
 * outlet with `title` property. Given the `Routes` below, navigating to
 * `/base/child(popup:aux)` would result in the document title being set to "child".
 * ```
 * [
 *   {path: 'base', title: 'base', children: [
 *     {path: 'child', title: 'child'},
 *   ],
 *   {path: 'aux', outlet: 'popup', title: 'popupTitle'}
 * ]
 * ```
 *
 * This class can be used as a base class for custom title strategies. That is, you can create your
 * own class that extends the `TitleStrategy`. Note that in the above example, the `title`
 * from the named outlet is never used. However, a custom strategy might be implemented to
 * incorporate titles in named outlets.
 *
 * @publicApi
 * @see [Page title guide](guide/router#setting-the-page-title)
 */
export declare abstract class TitleStrategy {
    /** Performs the application title update. */
    abstract updateTitle(snapshot: RouterStateSnapshot): void;
    /**
     * @returns The `title` of the deepest primary route.
     */
    buildTitle(snapshot: RouterStateSnapshot): string | undefined;
    /**
     * Given an `ActivatedRouteSnapshot`, returns the final value of the
     * `Route.title` property, which can either be a static string or a resolved value.
     */
    getResolvedTitleForRoute(snapshot: ActivatedRouteSnapshot): any;
    static ɵfac: i0.ɵɵFactoryDeclaration<TitleStrategy, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<TitleStrategy>;
}


declare class Tree<T> {
    constructor(root: TreeNode<T>);
    get root(): T;
}

declare class TreeNode<T> {
    value: T;
    children: TreeNode<T>[];
    constructor(value: T, children: TreeNode<T>[]);
    toString(): string;
}

/**
 * @description
 *
 * Options that modify the `Router` URL.
 * Supply an object containing any of these properties to a `Router` navigation function to
 * control how the target URL should be constructed.
 *
 * @see [Router.navigate() method](api/router/Router#navigate)
 * @see [Router.createUrlTree() method](api/router/Router#createurltree)
 * @see [Routing and Navigation guide](guide/router)
 *
 * @publicApi
 */
export declare interface UrlCreationOptions {
    /**
     * Specifies a root URI to use for relative navigation.
     *
     * For example, consider the following route configuration where the parent route
     * has two children.
     *
     * ```
     * [{
     *   path: 'parent',
     *   component: ParentComponent,
     *   children: [{
     *     path: 'list',
     *     component: ListComponent
     *   },{
     *     path: 'child',
     *     component: ChildComponent
     *   }]
     * }]
     * ```
     *
     * The following `go()` function navigates to the `list` route by
     * interpreting the destination URI as relative to the activated `child`  route
     *
     * ```
     *  @Component({...})
     *  class ChildComponent {
     *    constructor(private router: Router, private route: ActivatedRoute) {}
     *
     *    go() {
     *      router.navigate(['../list'], { relativeTo: this.route });
     *    }
     *  }
     * ```
     *
     * A value of `null` or `undefined` indicates that the navigation commands should be applied
     * relative to the root.
     */
    relativeTo?: ActivatedRoute | null;
    /**
     * Sets query parameters to the URL.
     *
     * ```
     * // Navigate to /results?page=1
     * router.navigate(['/results'], { queryParams: { page: 1 } });
     * ```
     */
    queryParams?: Params | null;
    /**
     * Sets the hash fragment for the URL.
     *
     * ```
     * // Navigate to /results#top
     * router.navigate(['/results'], { fragment: 'top' });
     * ```
     */
    fragment?: string;
    /**
     * How to handle query parameters in the router link for the next navigation.
     * One of:
     * * `preserve` : Preserve current parameters.
     * * `merge` : Merge new with current parameters.
     *
     * The "preserve" option discards any new query params:
     * ```
     * // from /view1?page=1 to/view2?page=1
     * router.navigate(['/view2'], { queryParams: { page: 2 },  queryParamsHandling: "preserve"
     * });
     * ```
     * The "merge" option appends new query params to the params from the current URL:
     * ```
     * // from /view1?page=1 to/view2?page=1&otherKey=2
     * router.navigate(['/view2'], { queryParams: { otherKey: 2 },  queryParamsHandling: "merge"
     * });
     * ```
     * In case of a key collision between current parameters and those in the `queryParams` object,
     * the new value is used.
     *
     */
    queryParamsHandling?: QueryParamsHandling | null;
    /**
     * When true, preserves the URL fragment for the next navigation
     *
     * ```
     * // Preserve fragment from /results#top to /view#top
     * router.navigate(['/view'], { preserveFragment: true });
     * ```
     */
    preserveFragment?: boolean;
}

/**
 * @description
 *
 * Provides a way to migrate AngularJS applications to Angular.
 *
 * @publicApi
 */
export declare abstract class UrlHandlingStrategy {
    /**
     * Tells the router if this URL should be processed.
     *
     * When it returns true, the router will execute the regular navigation.
     * When it returns false, the router will set the router state to an empty state.
     * As a result, all the active components will be destroyed.
     *
     */
    abstract shouldProcessUrl(url: UrlTree): boolean;
    /**
     * Extracts the part of the URL that should be handled by the router.
     * The rest of the URL will remain untouched.
     */
    abstract extract(url: UrlTree): UrlTree;
    /**
     * Merges the URL fragment with the rest of the URL.
     */
    abstract merge(newUrlPart: UrlTree, rawUrl: UrlTree): UrlTree;
    static ɵfac: i0.ɵɵFactoryDeclaration<UrlHandlingStrategy, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<UrlHandlingStrategy>;
}

/**
 * A function for matching a route against URLs. Implement a custom URL matcher
 * for `Route.matcher` when a combination of `path` and `pathMatch`
 * is not expressive enough. Cannot be used together with `path` and `pathMatch`.
 *
 * The function takes the following arguments and returns a `UrlMatchResult` object.
 * * *segments* : An array of URL segments.
 * * *group* : A segment group.
 * * *route* : The route to match against.
 *
 * The following example implementation matches HTML files.
 *
 * ```
 * export function htmlFiles(url: UrlSegment[]) {
 *   return url.length === 1 && url[0].path.endsWith('.html') ? ({consumed: url}) : null;
 * }
 *
 * export const routes = [{ matcher: htmlFiles, component: AnyComponent }];
 * ```
 *
 * @publicApi
 */
export declare type UrlMatcher = (segments: UrlSegment[], group: UrlSegmentGroup, route: Route) => UrlMatchResult | null;

/**
 * Represents the result of matching URLs with a custom matching function.
 *
 * * `consumed` is an array of the consumed URL segments.
 * * `posParams` is a map of positional parameters.
 *
 * @see `UrlMatcher()`
 * @publicApi
 */
export declare type UrlMatchResult = {
    consumed: UrlSegment[];
    posParams?: {
        [name: string]: UrlSegment;
    };
};

/**
 * @description
 *
 * Represents a single URL segment.
 *
 * A UrlSegment is a part of a URL between the two slashes. It contains a path and the matrix
 * parameters associated with the segment.
 *
 * @usageNotes
 * ### Example
 *
 * ```
 * @Component({templateUrl:'template.html'})
 * class MyComponent {
 *   constructor(router: Router) {
 *     const tree: UrlTree = router.parseUrl('/team;id=33');
 *     const g: UrlSegmentGroup = tree.root.children[PRIMARY_OUTLET];
 *     const s: UrlSegment[] = g.segments;
 *     s[0].path; // returns 'team'
 *     s[0].parameters; // returns {id: 33}
 *   }
 * }
 * ```
 *
 * @publicApi
 */
export declare class UrlSegment {
    /** The path part of a URL segment */
    path: string;
    /** The matrix parameters associated with a segment */
    parameters: {
        [name: string]: string;
    };
    constructor(
    /** The path part of a URL segment */
    path: string, 
    /** The matrix parameters associated with a segment */
    parameters: {
        [name: string]: string;
    });
    get parameterMap(): ParamMap;
    /** @docsNotRequired */
    toString(): string;
}

/**
 * @description
 *
 * Represents the parsed URL segment group.
 *
 * See `UrlTree` for more information.
 *
 * @publicApi
 */
export declare class UrlSegmentGroup {
    /** The URL segments of this group. See `UrlSegment` for more information */
    segments: UrlSegment[];
    /** The list of children of this group */
    children: {
        [key: string]: UrlSegmentGroup;
    };
    /** The parent node in the url tree */
    parent: UrlSegmentGroup | null;
    constructor(
    /** The URL segments of this group. See `UrlSegment` for more information */
    segments: UrlSegment[], 
    /** The list of children of this group */
    children: {
        [key: string]: UrlSegmentGroup;
    });
    /** Whether the segment has child segments */
    hasChildren(): boolean;
    /** Number of child segments */
    get numberOfChildren(): number;
    /** @docsNotRequired */
    toString(): string;
}

/**
 * @description
 *
 * Serializes and deserializes a URL string into a URL tree.
 *
 * The url serialization strategy is customizable. You can
 * make all URLs case insensitive by providing a custom UrlSerializer.
 *
 * See `DefaultUrlSerializer` for an example of a URL serializer.
 *
 * @publicApi
 */
export declare abstract class UrlSerializer {
    /** Parse a url into a `UrlTree` */
    abstract parse(url: string): UrlTree;
    /** Converts a `UrlTree` into a url */
    abstract serialize(tree: UrlTree): string;
    static ɵfac: i0.ɵɵFactoryDeclaration<UrlSerializer, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<UrlSerializer>;
}

/**
 * @description
 *
 * Represents the parsed URL.
 *
 * Since a router state is a tree, and the URL is nothing but a serialized state, the URL is a
 * serialized tree.
 * UrlTree is a data structure that provides a lot of affordances in dealing with URLs
 *
 * @usageNotes
 * ### Example
 *
 * ```
 * @Component({templateUrl:'template.html'})
 * class MyComponent {
 *   constructor(router: Router) {
 *     const tree: UrlTree =
 *       router.parseUrl('/team/33/(user/victor//support:help)?debug=true#fragment');
 *     const f = tree.fragment; // return 'fragment'
 *     const q = tree.queryParams; // returns {debug: 'true'}
 *     const g: UrlSegmentGroup = tree.root.children[PRIMARY_OUTLET];
 *     const s: UrlSegment[] = g.segments; // returns 2 segments 'team' and '33'
 *     g.children[PRIMARY_OUTLET].segments; // returns 2 segments 'user' and 'victor'
 *     g.children['support'].segments; // return 1 segment 'help'
 *   }
 * }
 * ```
 *
 * @publicApi
 */
export declare class UrlTree {
    /** The root segment group of the URL tree */
    root: UrlSegmentGroup;
    /** The query params of the URL */
    queryParams: Params;
    /** The fragment of the URL */
    fragment: string | null;
    constructor(
    /** The root segment group of the URL tree */
    root?: UrlSegmentGroup, 
    /** The query params of the URL */
    queryParams?: Params, 
    /** The fragment of the URL */
    fragment?: string | null);
    get queryParamMap(): ParamMap;
    /** @docsNotRequired */
    toString(): string;
}

/**
 * @publicApi
 */
export declare const VERSION: Version;

/**
 * Enables logging of all internal navigation events to the console.
 * Extra logging might be useful for debugging purposes to inspect Router event sequence.
 *
 * @usageNotes
 *
 * Basic example of how you can enable debug tracing:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withDebugTracing())
 *     ]
 *   }
 * );
 * ```
 *
 * @see `provideRouter`
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
export declare function withDebugTracing(): DebugTracingFeature;

/**
 * Disables initial navigation.
 *
 * Use if there is a reason to have more control over when the router starts its initial navigation
 * due to some complex initialization logic.
 *
 * @usageNotes
 *
 * Basic example of how you can disable initial navigation:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withDisabledInitialNavigation())
 *     ]
 *   }
 * );
 * ```
 *
 * @see `provideRouter`
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
export declare function withDisabledInitialNavigation(): DisabledInitialNavigationFeature;

/**
 * Configures initial navigation to start before the root component is created.
 *
 * The bootstrap is blocked until the initial navigation is complete. This value is required for
 * [server-side rendering](guide/universal) to work.
 *
 * @usageNotes
 *
 * Basic example of how you can enable this navigation behavior:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withEnabledBlockingInitialNavigation())
 *     ]
 *   }
 * );
 * ```
 *
 * @see `provideRouter`
 *
 * @publicApi
 * @returns A set of providers for use with `provideRouter`.
 */
export declare function withEnabledBlockingInitialNavigation(): EnabledBlockingInitialNavigationFeature;

/**
 * Provides the location strategy that uses the URL fragment instead of the history API.
 *
 * @usageNotes
 *
 * Basic example of how you can use the hash location option:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withHashLocation())
 *     ]
 *   }
 * );
 * ```
 *
 * @see `provideRouter`
 * @see `HashLocationStrategy`
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
export declare function withHashLocation(): RouterConfigurationFeature;

/**
 * Enables customizable scrolling behavior for router navigations.
 *
 * @usageNotes
 *
 * Basic example of how you can enable scrolling feature:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withInMemoryScrolling())
 *     ]
 *   }
 * );
 * ```
 *
 * @see `provideRouter`
 * @see `ViewportScroller`
 *
 * @publicApi
 * @param options Set of configuration parameters to customize scrolling behavior, see
 *     `InMemoryScrollingOptions` for additional information.
 * @returns A set of providers for use with `provideRouter`.
 */
export declare function withInMemoryScrolling(options?: InMemoryScrollingOptions): InMemoryScrollingFeature;

/**
 * Subscribes to the Router's navigation events and calls the given function when a
 * `NavigationError` happens.
 *
 * This function is run inside application's injection context so you can use the `inject` function.
 *
 * @usageNotes
 *
 * Basic example of how you can use the error handler option:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withNavigationErrorHandler((e: NavigationError) =>
 * inject(MyErrorTracker).trackError(e)))
 *     ]
 *   }
 * );
 * ```
 *
 * @see `NavigationError`
 * @see `inject`
 * @see `EnvironmentInjector#runInContext`
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
export declare function withNavigationErrorHandler(fn: (error: NavigationError) => void): NavigationErrorHandlerFeature;

/**
 * Allows to configure a preloading strategy to use. The strategy is configured by providing a
 * reference to a class that implements a `PreloadingStrategy`.
 *
 * @usageNotes
 *
 * Basic example of how you can configure preloading:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withPreloading(PreloadAllModules))
 *     ]
 *   }
 * );
 * ```
 *
 * @see `provideRouter`
 *
 * @param preloadingStrategy A reference to a class that implements a `PreloadingStrategy` that
 *     should be used.
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
declare function withPreloading(preloadingStrategy: Type<PreloadingStrategy>): PreloadingFeature;
export { withPreloading }
export { withPreloading as ɵwithPreloading }

/**
 * Allows to provide extra parameters to configure Router.
 *
 * @usageNotes
 *
 * Basic example of how you can provide extra configuration options:
 * ```
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withRouterConfig({
 *          onSameUrlNavigation: 'reload'
 *       }))
 *     ]
 *   }
 * );
 * ```
 *
 * @see `provideRouter`
 *
 * @param options A set of parameters to configure Router, see `RouterConfigOptions` for
 *     additional information.
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
export declare function withRouterConfig(options: RouterConfigOptions): RouterConfigurationFeature;

/**
 * Performs the given action once the router finishes its next/current navigation.
 *
 * The navigation is considered complete under the following conditions:
 * - `NavigationCancel` event emits and the code is not `NavigationCancellationCode.Redirect` or
 * `NavigationCancellationCode.SupersededByNewNavigation`. In these cases, the
 * redirecting/superseding navigation must finish.
 * - `NavigationError`, `NavigationEnd`, or `NavigationSkipped` event emits
 */
export declare function ɵafterNextNavigation(router: {
    events: Observable<Event_2>;
}, action: () => void): void;

/**
 * This component is used internally within the router to be a placeholder when an empty
 * router-outlet is needed. For example, with a config such as:
 *
 * `{path: 'parent', outlet: 'nav', children: [...]}`
 *
 * In order to render, there needs to be a component on this config, which will default
 * to this `EmptyOutletComponent`.
 */
export declare class ɵEmptyOutletComponent {
    static ɵfac: i0.ɵɵFactoryDeclaration<ɵEmptyOutletComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<ɵEmptyOutletComponent, "ng-component", never, {}, {}, never, never, true, never>;
}

export declare type ɵRestoredState = {
    [k: string]: any;
    navigationId: number;
    ɵrouterPageId?: number;
};

export declare const ɵROUTER_PROVIDERS: Provider[];

export { }
