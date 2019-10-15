/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EmptyOutletComponent } from './components/empty_outlet';
import { PRIMARY_OUTLET } from './shared';
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
 * \@usageNotes
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
 * In the following example, supplying the 'full' `patchMatch` strategy ensures
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
 * To use lazy loading, provide the `loadChildren` property  instead of the `children` property.
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
 * \@publicApi
 * @record
 */
export function Route() { }
if (false) {
    /**
     * The path to match against. Cannot be used together with a custom `matcher` function.
     * A URL string that uses router matching notation.
     * Can be a wild card (`**`) that matches any URL (see Usage Notes below).
     * Default is "/" (the root path).
     *
     * @type {?|undefined}
     */
    Route.prototype.path;
    /**
     * The path-matching strategy, one of 'prefix' or 'full'.
     * Default is 'prefix'.
     *
     * By default, the router checks URL elements from the left to see if the URL
     * matches a given  path, and stops when there is a match. For example,
     * '/team/11/user' matches 'team/:id'.
     *
     * The path-match strategy 'full' matches against the entire URL.
     * It is important to do this when redirecting empty-path routes.
     * Otherwise, because an empty path is a prefix of any URL,
     * the router would apply the redirect even when navigating
     * to the redirect destination, creating an endless loop.
     *
     * @type {?|undefined}
     */
    Route.prototype.pathMatch;
    /**
     * A custom URL-matching function. Cannot be used together with `path`.
     * @type {?|undefined}
     */
    Route.prototype.matcher;
    /**
     * The component to instantiate when the path matches.
     * Can be empty if child routes specify components.
     * @type {?|undefined}
     */
    Route.prototype.component;
    /**
     * A URL to which to redirect when a the path matches.
     * Absolute if the URL begins with a slash (/), otherwise relative to the path URL.
     * When not present, router does not redirect.
     * @type {?|undefined}
     */
    Route.prototype.redirectTo;
    /**
     * Name of a `RouterOutlet` object where the component can be placed
     * when the path matches.
     * @type {?|undefined}
     */
    Route.prototype.outlet;
    /**
     * An array of dependency-injection tokens used to look up `CanActivate()`
     * handlers, in order to determine if the current user is allowed to
     * activate the component. By default, any user can activate.
     * @type {?|undefined}
     */
    Route.prototype.canActivate;
    /**
     * An array of DI tokens used to look up `CanActivateChild()` handlers,
     * in order to determine if the current user is allowed to activate
     * a child of the component. By default, any user can activate a child.
     * @type {?|undefined}
     */
    Route.prototype.canActivateChild;
    /**
     * An array of DI tokens used to look up `CanDeactivate()`
     * handlers, in order to determine if the current user is allowed to
     * deactivate the component. By default, any user can deactivate.
     *
     * @type {?|undefined}
     */
    Route.prototype.canDeactivate;
    /**
     * An array of DI tokens used to look up `CanLoad()`
     * handlers, in order to determine if the current user is allowed to
     * load the component. By default, any user can load.
     * @type {?|undefined}
     */
    Route.prototype.canLoad;
    /**
     * Additional developer-defined data provided to the component via
     * `ActivatedRoute`. By default, no additional data is passed.
     * @type {?|undefined}
     */
    Route.prototype.data;
    /**
     * A map of DI tokens used to look up data resolvers. See `Resolve`.
     * @type {?|undefined}
     */
    Route.prototype.resolve;
    /**
     * An array of child `Route` objects that specifies a nested route
     * configuration.
     * @type {?|undefined}
     */
    Route.prototype.children;
    /**
     * A `LoadChildren` object specifying lazy-loaded child routes.
     * @type {?|undefined}
     */
    Route.prototype.loadChildren;
    /**
     * Defines when guards and resolvers will be run. One of
     * - `paramsOrQueryParamsChange` : Run when query parameters change.
     * - `always` : Run on every execution.
     * By default, guards and resolvers run only when the matrix
     * parameters of the route change.
     * @type {?|undefined}
     */
    Route.prototype.runGuardsAndResolvers;
    /**
     * Filled for routes with `loadChildren` once the module has been loaded
     * \@internal
     * @type {?|undefined}
     */
    Route.prototype._loadedConfig;
}
export class LoadedRouterConfig {
    /**
     * @param {?} routes
     * @param {?} module
     */
    constructor(routes, module) {
        this.routes = routes;
        this.module = module;
    }
}
if (false) {
    /** @type {?} */
    LoadedRouterConfig.prototype.routes;
    /** @type {?} */
    LoadedRouterConfig.prototype.module;
}
/**
 * @param {?} config
 * @param {?=} parentPath
 * @return {?}
 */
export function validateConfig(config, parentPath = '') {
    // forEach doesn't iterate undefined values
    for (let i = 0; i < config.length; i++) {
        /** @type {?} */
        const route = config[i];
        /** @type {?} */
        const fullPath = getFullPath(parentPath, route);
        validateNode(route, fullPath);
    }
}
/**
 * @param {?} route
 * @param {?} fullPath
 * @return {?}
 */
function validateNode(route, fullPath) {
    if (!route) {
        throw new Error(`
      Invalid configuration of route '${fullPath}': Encountered undefined route.
      The reason might be an extra comma.

      Example:
      const routes: Routes = [
        { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
        { path: 'dashboard',  component: DashboardComponent },, << two commas
        { path: 'detail/:id', component: HeroDetailComponent }
      ];
    `);
    }
    if (Array.isArray(route)) {
        throw new Error(`Invalid configuration of route '${fullPath}': Array cannot be specified`);
    }
    if (!route.component && !route.children && !route.loadChildren &&
        (route.outlet && route.outlet !== PRIMARY_OUTLET)) {
        throw new Error(`Invalid configuration of route '${fullPath}': a componentless route without children or loadChildren cannot have a named outlet set`);
    }
    if (route.redirectTo && route.children) {
        throw new Error(`Invalid configuration of route '${fullPath}': redirectTo and children cannot be used together`);
    }
    if (route.redirectTo && route.loadChildren) {
        throw new Error(`Invalid configuration of route '${fullPath}': redirectTo and loadChildren cannot be used together`);
    }
    if (route.children && route.loadChildren) {
        throw new Error(`Invalid configuration of route '${fullPath}': children and loadChildren cannot be used together`);
    }
    if (route.redirectTo && route.component) {
        throw new Error(`Invalid configuration of route '${fullPath}': redirectTo and component cannot be used together`);
    }
    if (route.path && route.matcher) {
        throw new Error(`Invalid configuration of route '${fullPath}': path and matcher cannot be used together`);
    }
    if (route.redirectTo === void 0 && !route.component && !route.children && !route.loadChildren) {
        throw new Error(`Invalid configuration of route '${fullPath}'. One of the following must be provided: component, redirectTo, children or loadChildren`);
    }
    if (route.path === void 0 && route.matcher === void 0) {
        throw new Error(`Invalid configuration of route '${fullPath}': routes must have either a path or a matcher specified`);
    }
    if (typeof route.path === 'string' && route.path.charAt(0) === '/') {
        throw new Error(`Invalid configuration of route '${fullPath}': path cannot start with a slash`);
    }
    if (route.path === '' && route.redirectTo !== void 0 && route.pathMatch === void 0) {
        /** @type {?} */
        const exp = `The default value of 'pathMatch' is 'prefix', but often the intent is to use 'full'.`;
        throw new Error(`Invalid configuration of route '{path: "${fullPath}", redirectTo: "${route.redirectTo}"}': please provide 'pathMatch'. ${exp}`);
    }
    if (route.pathMatch !== void 0 && route.pathMatch !== 'full' && route.pathMatch !== 'prefix') {
        throw new Error(`Invalid configuration of route '${fullPath}': pathMatch can only be set to 'prefix' or 'full'`);
    }
    if (route.children) {
        validateConfig(route.children, fullPath);
    }
}
/**
 * @param {?} parentPath
 * @param {?} currentRoute
 * @return {?}
 */
function getFullPath(parentPath, currentRoute) {
    if (!currentRoute) {
        return parentPath;
    }
    if (!parentPath && !currentRoute.path) {
        return '';
    }
    else if (parentPath && !currentRoute.path) {
        return `${parentPath}/`;
    }
    else if (!parentPath && currentRoute.path) {
        return currentRoute.path;
    }
    else {
        return `${parentPath}/${currentRoute.path}`;
    }
}
/**
 * Makes a copy of the config and adds any default required properties.
 * @param {?} r
 * @return {?}
 */
export function standardizeConfig(r) {
    /** @type {?} */
    const children = r.children && r.children.map(standardizeConfig);
    /** @type {?} */
    const c = children ? Object.assign({}, r, { children }) : Object.assign({}, r);
    if (!c.component && (children || c.loadChildren) && (c.outlet && c.outlet !== PRIMARY_OUTLET)) {
        c.component = EmptyOutletComponent;
    }
    return c;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFXQSxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUUvRCxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sVUFBVSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFxWHhDLDJCQXFHQzs7Ozs7Ozs7OztJQTdGQyxxQkFBYzs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFnQmQsMEJBQW1COzs7OztJQUluQix3QkFBcUI7Ozs7OztJQUtyQiwwQkFBc0I7Ozs7Ozs7SUFNdEIsMkJBQW9COzs7Ozs7SUFLcEIsdUJBQWdCOzs7Ozs7O0lBTWhCLDRCQUFvQjs7Ozs7OztJQU1wQixpQ0FBeUI7Ozs7Ozs7O0lBT3pCLDhCQUFzQjs7Ozs7OztJQU10Qix3QkFBZ0I7Ozs7OztJQUtoQixxQkFBWTs7Ozs7SUFJWix3QkFBc0I7Ozs7OztJQUt0Qix5QkFBa0I7Ozs7O0lBSWxCLDZCQUE0Qjs7Ozs7Ozs7O0lBUTVCLHNDQUE4Qzs7Ozs7O0lBSzlDLDhCQUFtQzs7QUFHckMsTUFBTSxPQUFPLGtCQUFrQjs7Ozs7SUFDN0IsWUFBbUIsTUFBZSxFQUFTLE1BQXdCO1FBQWhELFdBQU0sR0FBTixNQUFNLENBQVM7UUFBUyxXQUFNLEdBQU4sTUFBTSxDQUFrQjtJQUFHLENBQUM7Q0FDeEU7OztJQURhLG9DQUFzQjs7SUFBRSxvQ0FBK0I7Ozs7Ozs7QUFHckUsTUFBTSxVQUFVLGNBQWMsQ0FBQyxNQUFjLEVBQUUsYUFBcUIsRUFBRTtJQUNwRSwyQ0FBMkM7SUFDM0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7O2NBQ2hDLEtBQUssR0FBVSxNQUFNLENBQUMsQ0FBQyxDQUFDOztjQUN4QixRQUFRLEdBQVcsV0FBVyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUM7UUFDdkQsWUFBWSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztLQUMvQjtBQUNILENBQUM7Ozs7OztBQUVELFNBQVMsWUFBWSxDQUFDLEtBQVksRUFBRSxRQUFnQjtJQUNsRCxJQUFJLENBQUMsS0FBSyxFQUFFO1FBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQzt3Q0FDb0IsUUFBUTs7Ozs7Ozs7O0tBUzNDLENBQUMsQ0FBQztLQUNKO0lBQ0QsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQW1DLFFBQVEsOEJBQThCLENBQUMsQ0FBQztLQUM1RjtJQUNELElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZO1FBQzFELENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLGNBQWMsQ0FBQyxFQUFFO1FBQ3JELE1BQU0sSUFBSSxLQUFLLENBQ1gsbUNBQW1DLFFBQVEsMEZBQTBGLENBQUMsQ0FBQztLQUM1STtJQUNELElBQUksS0FBSyxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFO1FBQ3RDLE1BQU0sSUFBSSxLQUFLLENBQ1gsbUNBQW1DLFFBQVEsb0RBQW9ELENBQUMsQ0FBQztLQUN0RztJQUNELElBQUksS0FBSyxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUMsWUFBWSxFQUFFO1FBQzFDLE1BQU0sSUFBSSxLQUFLLENBQ1gsbUNBQW1DLFFBQVEsd0RBQXdELENBQUMsQ0FBQztLQUMxRztJQUNELElBQUksS0FBSyxDQUFDLFFBQVEsSUFBSSxLQUFLLENBQUMsWUFBWSxFQUFFO1FBQ3hDLE1BQU0sSUFBSSxLQUFLLENBQ1gsbUNBQW1DLFFBQVEsc0RBQXNELENBQUMsQ0FBQztLQUN4RztJQUNELElBQUksS0FBSyxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUMsU0FBUyxFQUFFO1FBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQ1gsbUNBQW1DLFFBQVEscURBQXFELENBQUMsQ0FBQztLQUN2RztJQUNELElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFO1FBQy9CLE1BQU0sSUFBSSxLQUFLLENBQ1gsbUNBQW1DLFFBQVEsNkNBQTZDLENBQUMsQ0FBQztLQUMvRjtJQUNELElBQUksS0FBSyxDQUFDLFVBQVUsS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRTtRQUM3RixNQUFNLElBQUksS0FBSyxDQUNYLG1DQUFtQyxRQUFRLDJGQUEyRixDQUFDLENBQUM7S0FDN0k7SUFDRCxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sS0FBSyxLQUFLLENBQUMsRUFBRTtRQUNyRCxNQUFNLElBQUksS0FBSyxDQUNYLG1DQUFtQyxRQUFRLDBEQUEwRCxDQUFDLENBQUM7S0FDNUc7SUFDRCxJQUFJLE9BQU8sS0FBSyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO1FBQ2xFLE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQW1DLFFBQVEsbUNBQW1DLENBQUMsQ0FBQztLQUNqRztJQUNELElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLFVBQVUsS0FBSyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsU0FBUyxLQUFLLEtBQUssQ0FBQyxFQUFFOztjQUM1RSxHQUFHLEdBQ0wsc0ZBQXNGO1FBQzFGLE1BQU0sSUFBSSxLQUFLLENBQ1gsMkNBQTJDLFFBQVEsbUJBQW1CLEtBQUssQ0FBQyxVQUFVLG9DQUFvQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0tBQ3RJO0lBQ0QsSUFBSSxLQUFLLENBQUMsU0FBUyxLQUFLLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssTUFBTSxJQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssUUFBUSxFQUFFO1FBQzVGLE1BQU0sSUFBSSxLQUFLLENBQ1gsbUNBQW1DLFFBQVEsb0RBQW9ELENBQUMsQ0FBQztLQUN0RztJQUNELElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRTtRQUNsQixjQUFjLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztLQUMxQztBQUNILENBQUM7Ozs7OztBQUVELFNBQVMsV0FBVyxDQUFDLFVBQWtCLEVBQUUsWUFBbUI7SUFDMUQsSUFBSSxDQUFDLFlBQVksRUFBRTtRQUNqQixPQUFPLFVBQVUsQ0FBQztLQUNuQjtJQUNELElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFO1FBQ3JDLE9BQU8sRUFBRSxDQUFDO0tBQ1g7U0FBTSxJQUFJLFVBQVUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUU7UUFDM0MsT0FBTyxHQUFHLFVBQVUsR0FBRyxDQUFDO0tBQ3pCO1NBQU0sSUFBSSxDQUFDLFVBQVUsSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFO1FBQzNDLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQztLQUMxQjtTQUFNO1FBQ0wsT0FBTyxHQUFHLFVBQVUsSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7S0FDN0M7QUFDSCxDQUFDOzs7Ozs7QUFLRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsQ0FBUTs7VUFDbEMsUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUM7O1VBQzFELENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxtQkFBSyxDQUFDLElBQUUsUUFBUSxJQUFFLENBQUMsbUJBQUssQ0FBQyxDQUFDO0lBQzlDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxjQUFjLENBQUMsRUFBRTtRQUM3RixDQUFDLENBQUMsU0FBUyxHQUFHLG9CQUFvQixDQUFDO0tBQ3BDO0lBQ0QsT0FBTyxDQUFDLENBQUM7QUFDWCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge05nTW9kdWxlRmFjdG9yeSwgTmdNb2R1bGVSZWYsIFR5cGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtPYnNlcnZhYmxlfSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtFbXB0eU91dGxldENvbXBvbmVudH0gZnJvbSAnLi9jb21wb25lbnRzL2VtcHR5X291dGxldCc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UFJJTUFSWV9PVVRMRVR9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7VXJsU2VnbWVudCwgVXJsU2VnbWVudEdyb3VwfSBmcm9tICcuL3VybF90cmVlJztcblxuXG4vKipcbiAqIFJlcHJlc2VudHMgYSByb3V0ZSBjb25maWd1cmF0aW9uIGZvciB0aGUgUm91dGVyIHNlcnZpY2UuXG4gKiBBbiBhcnJheSBvZiBgUm91dGVgIG9iamVjdHMsIHVzZWQgaW4gYFJvdXRlci5jb25maWdgIGFuZCBmb3IgbmVzdGVkIHJvdXRlIGNvbmZpZ3VyYXRpb25zXG4gKiBpbiBgUm91dGUuY2hpbGRyZW5gLlxuICpcbiAqIEBzZWUgYFJvdXRlYFxuICogQHNlZSBgUm91dGVyYFxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBSb3V0ZXMgPSBSb3V0ZVtdO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHJlc3VsdCBvZiBtYXRjaGluZyBVUkxzIHdpdGggYSBjdXN0b20gbWF0Y2hpbmcgZnVuY3Rpb24uXG4gKlxuICogKiBgY29uc3VtZWRgIGlzIGFuIGFycmF5IG9mIHRoZSBjb25zdW1lZCBVUkwgc2VnbWVudHMuXG4gKiAqIGBwb3NQYXJhbXNgIGlzIGEgbWFwIG9mIHBvc2l0aW9uYWwgcGFyYW1ldGVycy5cbiAqXG4gKiBAc2VlIGBVcmxNYXRjaGVyKClgXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIFVybE1hdGNoUmVzdWx0ID0ge1xuICBjb25zdW1lZDogVXJsU2VnbWVudFtdOyBwb3NQYXJhbXM/OiB7W25hbWU6IHN0cmluZ106IFVybFNlZ21lbnR9O1xufTtcblxuLyoqXG4gKiBBIGZ1bmN0aW9uIGZvciBtYXRjaGluZyBhIHJvdXRlIGFnYWluc3QgVVJMcy4gSW1wbGVtZW50IGEgY3VzdG9tIFVSTCBtYXRjaGVyXG4gKiBmb3IgYFJvdXRlLm1hdGNoZXJgIHdoZW4gYSBjb21iaW5hdGlvbiBvZiBgcGF0aGAgYW5kIGBwYXRoTWF0Y2hgXG4gKiBpcyBub3QgZXhwcmVzc2l2ZSBlbm91Z2guIENhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyIHdpdGggYHBhdGhgIGFuZCBgcGF0aE1hdGNoYC5cbiAqXG4gKiBAcGFyYW0gc2VnbWVudHMgQW4gYXJyYXkgb2YgVVJMIHNlZ21lbnRzLlxuICogQHBhcmFtIGdyb3VwIEEgc2VnbWVudCBncm91cC5cbiAqIEBwYXJhbSByb3V0ZSBUaGUgcm91dGUgdG8gbWF0Y2ggYWdhaW5zdC5cbiAqIEByZXR1cm5zIFRoZSBtYXRjaC1yZXN1bHQuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBUaGUgZm9sbG93aW5nIG1hdGNoZXIgbWF0Y2hlcyBIVE1MIGZpbGVzLlxuICpcbiAqIGBgYFxuICogZXhwb3J0IGZ1bmN0aW9uIGh0bWxGaWxlcyh1cmw6IFVybFNlZ21lbnRbXSkge1xuICogICByZXR1cm4gdXJsLmxlbmd0aCA9PT0gMSAmJiB1cmxbMF0ucGF0aC5lbmRzV2l0aCgnLmh0bWwnKSA/ICh7Y29uc3VtZWQ6IHVybH0pIDogbnVsbDtcbiAqIH1cbiAqXG4gKiBleHBvcnQgY29uc3Qgcm91dGVzID0gW3sgbWF0Y2hlcjogaHRtbEZpbGVzLCBjb21wb25lbnQ6IEFueUNvbXBvbmVudCB9XTtcbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgVXJsTWF0Y2hlciA9IChzZWdtZW50czogVXJsU2VnbWVudFtdLCBncm91cDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZTogUm91dGUpID0+XG4gICAgVXJsTWF0Y2hSZXN1bHQ7XG5cbi8qKlxuICpcbiAqIFJlcHJlc2VudHMgc3RhdGljIGRhdGEgYXNzb2NpYXRlZCB3aXRoIGEgcGFydGljdWxhciByb3V0ZS5cbiAqXG4gKiBAc2VlIGBSb3V0ZSNkYXRhYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgRGF0YSA9IHtcbiAgW25hbWU6IHN0cmluZ106IGFueVxufTtcblxuLyoqXG4gKlxuICogUmVwcmVzZW50cyB0aGUgcmVzb2x2ZWQgZGF0YSBhc3NvY2lhdGVkIHdpdGggYSBwYXJ0aWN1bGFyIHJvdXRlLlxuICpcbiAqIEBzZWUgYFJvdXRlI3Jlc29sdmVgLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgUmVzb2x2ZURhdGEgPSB7XG4gIFtuYW1lOiBzdHJpbmddOiBhbnlcbn07XG5cbi8qKlxuICpcbiAqIEEgZnVuY3Rpb24gdGhhdCBpcyBjYWxsZWQgdG8gcmVzb2x2ZSBhIGNvbGxlY3Rpb24gb2YgbGF6eS1sb2FkZWQgcm91dGVzLlxuICpcbiAqIE9mdGVuIHRoaXMgZnVuY3Rpb24gd2lsbCBiZSBpbXBsZW1lbnRlZCB1c2luZyBhbiBFUyBkeW5hbWljIGBpbXBvcnQoKWAgZXhwcmVzc2lvbi4gRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAnbGF6eScsXG4gKiAgIGxvYWRDaGlsZHJlbjogKCkgPT4gaW1wb3J0KCcuL2xhenktcm91dGUvbGF6eS5tb2R1bGUnKS50aGVuKG1vZCA9PiBtb2QuTGF6eU1vZHVsZSksXG4gKiB9XTtcbiAqIGBgYFxuICpcbiAqIFRoaXMgZnVuY3Rpb24gX211c3RfIG1hdGNoIHRoZSBmb3JtIGFib3ZlOiBhbiBhcnJvdyBmdW5jdGlvbiBvZiB0aGUgZm9ybVxuICogYCgpID0+IGltcG9ydCgnLi4uJykudGhlbihtb2QgPT4gbW9kLk1PRFVMRSlgLlxuICpcbiAqIEBzZWUgYFJvdXRlI2xvYWRDaGlsZHJlbmAuXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIExvYWRDaGlsZHJlbkNhbGxiYWNrID0gKCkgPT4gVHlwZTxhbnk+fCBOZ01vZHVsZUZhY3Rvcnk8YW55PnwgT2JzZXJ2YWJsZTxUeXBlPGFueT4+fFxuICAgIFByb21pc2U8TmdNb2R1bGVGYWN0b3J5PGFueT58VHlwZTxhbnk+fGFueT47XG5cbi8qKlxuICpcbiAqIEEgc3RyaW5nIG9mIHRoZSBmb3JtIGBwYXRoL3RvL2ZpbGUjZXhwb3J0TmFtZWAgdGhhdCBhY3RzIGFzIGEgVVJMIGZvciBhIHNldCBvZiByb3V0ZXMgdG8gbG9hZCxcbiAqIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHN1Y2ggYSBzZXQuXG4gKlxuICogVGhlIHN0cmluZyBmb3JtIG9mIGBMb2FkQ2hpbGRyZW5gIGlzIGRlcHJlY2F0ZWQgKHNlZSBgRGVwcmVjYXRlZExvYWRDaGlsZHJlbmApLiBUaGUgZnVuY3Rpb25cbiAqIGZvcm0gKGBMb2FkQ2hpbGRyZW5DYWxsYmFja2ApIHNob3VsZCBiZSB1c2VkIGluc3RlYWQuXG4gKlxuICogQHNlZSBgUm91dGUjbG9hZENoaWxkcmVuYC5cbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgTG9hZENoaWxkcmVuID0gTG9hZENoaWxkcmVuQ2FsbGJhY2sgfCBEZXByZWNhdGVkTG9hZENoaWxkcmVuO1xuXG4vKipcbiAqIEEgc3RyaW5nIG9mIHRoZSBmb3JtIGBwYXRoL3RvL2ZpbGUjZXhwb3J0TmFtZWAgdGhhdCBhY3RzIGFzIGEgVVJMIGZvciBhIHNldCBvZiByb3V0ZXMgdG8gbG9hZC5cbiAqXG4gKiBAc2VlIGBSb3V0ZSNsb2FkQ2hpbGRyZW5gXG4gKiBAcHVibGljQXBpXG4gKiBAZGVwcmVjYXRlZCB0aGUgYHN0cmluZ2AgZm9ybSBvZiBgbG9hZENoaWxkcmVuYCBpcyBkZXByZWNhdGVkIGluIGZhdm9yIG9mIHRoZSBwcm9wb3NlZCBFUyBkeW5hbWljXG4gKiBgaW1wb3J0KClgIGV4cHJlc3Npb24sIHdoaWNoIG9mZmVycyBhIG1vcmUgbmF0dXJhbCBhbmQgc3RhbmRhcmRzLWJhc2VkIG1lY2hhbmlzbSB0byBkeW5hbWljYWxseVxuICogbG9hZCBhbiBFUyBtb2R1bGUgYXQgcnVudGltZS5cbiAqL1xuZXhwb3J0IHR5cGUgRGVwcmVjYXRlZExvYWRDaGlsZHJlbiA9IHN0cmluZztcblxuLyoqXG4gKlxuICogSG93IHRvIGhhbmRsZSBxdWVyeSBwYXJhbWV0ZXJzIGluIGEgcm91dGVyIGxpbmsuXG4gKiBPbmUgb2Y6XG4gKiAtIGBtZXJnZWAgOiBNZXJnZSBuZXcgd2l0aCBjdXJyZW50IHBhcmFtZXRlcnMuXG4gKiAtIGBwcmVzZXJ2ZWAgOiBQcmVzZXJ2ZSBjdXJyZW50IHBhcmFtZXRlcnMuXG4gKlxuICogQHNlZSBgTmF2aWdhdGlvbkV4dHJhcyNxdWVyeVBhcmFtc0hhbmRsaW5nYFxuICogQHNlZSBgUm91dGVyTGlua2BcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgUXVlcnlQYXJhbXNIYW5kbGluZyA9ICdtZXJnZScgfCAncHJlc2VydmUnIHwgJyc7XG5cbi8qKlxuICpcbiAqIEEgcG9saWN5IGZvciB3aGVuIHRvIHJ1biBndWFyZHMgYW5kIHJlc29sdmVycyBvbiBhIHJvdXRlLlxuICpcbiAqIEBzZWUgYFJvdXRlI3J1bkd1YXJkc0FuZFJlc29sdmVyc2BcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgUnVuR3VhcmRzQW5kUmVzb2x2ZXJzID0gJ3BhdGhQYXJhbXNDaGFuZ2UnIHwgJ3BhdGhQYXJhbXNPclF1ZXJ5UGFyYW1zQ2hhbmdlJyB8XG4gICAgJ3BhcmFtc0NoYW5nZScgfCAncGFyYW1zT3JRdWVyeVBhcmFtc0NoYW5nZScgfCAnYWx3YXlzJyB8XG4gICAgKChmcm9tOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCB0bzogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCkgPT4gYm9vbGVhbik7XG5cbi8qKlxuICogQSBjb25maWd1cmF0aW9uIG9iamVjdCB0aGF0IGRlZmluZXMgYSBzaW5nbGUgcm91dGUuXG4gKiBBIHNldCBvZiByb3V0ZXMgYXJlIGNvbGxlY3RlZCBpbiBhIGBSb3V0ZXNgIGFycmF5IHRvIGRlZmluZSBhIGBSb3V0ZXJgIGNvbmZpZ3VyYXRpb24uXG4gKiBUaGUgcm91dGVyIGF0dGVtcHRzIHRvIG1hdGNoIHNlZ21lbnRzIG9mIGEgZ2l2ZW4gVVJMIGFnYWluc3QgZWFjaCByb3V0ZSxcbiAqIHVzaW5nIHRoZSBjb25maWd1cmF0aW9uIG9wdGlvbnMgZGVmaW5lZCBpbiB0aGlzIG9iamVjdC5cbiAqXG4gKiBTdXBwb3J0cyBzdGF0aWMsIHBhcmFtZXRlcml6ZWQsIHJlZGlyZWN0LCBhbmQgd2lsZGNhcmQgcm91dGVzLCBhcyB3ZWxsIGFzXG4gKiBjdXN0b20gcm91dGUgZGF0YSBhbmQgcmVzb2x2ZSBtZXRob2RzLlxuICpcbiAqIEZvciBkZXRhaWxlZCB1c2FnZSBpbmZvcm1hdGlvbiwgc2VlIHRoZSBbUm91dGluZyBHdWlkZV0oZ3VpZGUvcm91dGVyKS5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqICMjIyBTaW1wbGUgQ29uZmlndXJhdGlvblxuICpcbiAqIFRoZSBmb2xsb3dpbmcgcm91dGUgc3BlY2lmaWVzIHRoYXQgd2hlbiBuYXZpZ2F0aW5nIHRvLCBmb3IgZXhhbXBsZSxcbiAqIGAvdGVhbS8xMS91c2VyL2JvYmAsIHRoZSByb3V0ZXIgY3JlYXRlcyB0aGUgJ1RlYW0nIGNvbXBvbmVudFxuICogd2l0aCB0aGUgJ1VzZXInIGNoaWxkIGNvbXBvbmVudCBpbiBpdC5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gICogIGNvbXBvbmVudDogVGVhbSxcbiAqICAgY2hpbGRyZW46IFt7XG4gKiAgICAgcGF0aDogJ3VzZXIvOm5hbWUnLFxuICogICAgIGNvbXBvbmVudDogVXNlclxuICogICB9XVxuICogfV1cbiAqIGBgYFxuICpcbiAqICMjIyBNdWx0aXBsZSBPdXRsZXRzXG4gKlxuICogVGhlIGZvbGxvd2luZyByb3V0ZSBjcmVhdGVzIHNpYmxpbmcgY29tcG9uZW50cyB3aXRoIG11bHRpcGxlIG91dGxldHMuXG4gKiBXaGVuIG5hdmlnYXRpbmcgdG8gYC90ZWFtLzExKGF1eDpjaGF0L2ppbSlgLCB0aGUgcm91dGVyIGNyZWF0ZXMgdGhlICdUZWFtJyBjb21wb25lbnQgbmV4dCB0b1xuICogdGhlICdDaGF0JyBjb21wb25lbnQuIFRoZSAnQ2hhdCcgY29tcG9uZW50IGlzIHBsYWNlZCBpbnRvIHRoZSAnYXV4JyBvdXRsZXQuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAndGVhbS86aWQnLFxuICogICBjb21wb25lbnQ6IFRlYW1cbiAqIH0sIHtcbiAqICAgcGF0aDogJ2NoYXQvOnVzZXInLFxuICogICBjb21wb25lbnQ6IENoYXRcbiAqICAgb3V0bGV0OiAnYXV4J1xuICogfV1cbiAqIGBgYFxuICpcbiAqICMjIyBXaWxkIENhcmRzXG4gKlxuICogVGhlIGZvbGxvd2luZyByb3V0ZSB1c2VzIHdpbGQtY2FyZCBub3RhdGlvbiB0byBzcGVjaWZ5IGEgY29tcG9uZW50XG4gKiB0aGF0IGlzIGFsd2F5cyBpbnN0YW50aWF0ZWQgcmVnYXJkbGVzcyBvZiB3aGVyZSB5b3UgbmF2aWdhdGUgdG8uXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAnKionLFxuICogICBjb21wb25lbnQ6IFdpbGRjYXJkQ29tcG9uZW50XG4gKiB9XVxuICogYGBgXG4gKlxuICogIyMjIFJlZGlyZWN0c1xuICpcbiAqIFRoZSBmb2xsb3dpbmcgcm91dGUgdXNlcyB0aGUgYHJlZGlyZWN0VG9gIHByb3BlcnR5IHRvIGlnbm9yZSBhIHNlZ21lbnQgb2ZcbiAqIGEgZ2l2ZW4gVVJMIHdoZW4gbG9va2luZyBmb3IgYSBjaGlsZCBwYXRoLlxuICpcbiAqIFdoZW4gbmF2aWdhdGluZyB0byAnL3RlYW0vMTEvbGVnYWN5L3VzZXIvamltJywgdGhlIHJvdXRlciBjaGFuZ2VzIHRoZSBVUkwgc2VnbWVudFxuICogJy90ZWFtLzExL2xlZ2FjeS91c2VyL2ppbScgdG8gJy90ZWFtLzExL3VzZXIvamltJywgYW5kIHRoZW4gaW5zdGFudGlhdGVzXG4gKiB0aGUgVGVhbSBjb21wb25lbnQgd2l0aCB0aGUgVXNlciBjaGlsZCBjb21wb25lbnQgaW4gaXQuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAndGVhbS86aWQnLFxuICogICBjb21wb25lbnQ6IFRlYW0sXG4gKiAgIGNoaWxkcmVuOiBbe1xuICogICAgIHBhdGg6ICdsZWdhY3kvdXNlci86bmFtZScsXG4gKiAgICAgcmVkaXJlY3RUbzogJ3VzZXIvOm5hbWUnXG4gKiAgIH0sIHtcbiAqICAgICBwYXRoOiAndXNlci86bmFtZScsXG4gKiAgICAgY29tcG9uZW50OiBVc2VyXG4gKiAgIH1dXG4gKiB9XVxuICogYGBgXG4gKlxuICogVGhlIHJlZGlyZWN0IHBhdGggY2FuIGJlIHJlbGF0aXZlLCBhcyBzaG93biBpbiB0aGlzIGV4YW1wbGUsIG9yIGFic29sdXRlLlxuICogSWYgd2UgY2hhbmdlIHRoZSBgcmVkaXJlY3RUb2AgdmFsdWUgaW4gdGhlIGV4YW1wbGUgdG8gdGhlIGFic29sdXRlIFVSTCBzZWdtZW50ICcvdXNlci86bmFtZScsXG4gKiB0aGUgcmVzdWx0IFVSTCBpcyBhbHNvIGFic29sdXRlLCAnL3VzZXIvamltJy5cblxuICogIyMjIEVtcHR5IFBhdGhcbiAqXG4gKiBFbXB0eS1wYXRoIHJvdXRlIGNvbmZpZ3VyYXRpb25zIGNhbiBiZSB1c2VkIHRvIGluc3RhbnRpYXRlIGNvbXBvbmVudHMgdGhhdCBkbyBub3QgJ2NvbnN1bWUnXG4gKiBhbnkgVVJMIHNlZ21lbnRzLlxuICpcbiAqIEluIHRoZSBmb2xsb3dpbmcgY29uZmlndXJhdGlvbiwgd2hlbiBuYXZpZ2F0aW5nIHRvXG4gKiBgL3RlYW0vMTFgLCB0aGUgcm91dGVyIGluc3RhbnRpYXRlcyB0aGUgJ0FsbFVzZXJzJyBjb21wb25lbnQuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAndGVhbS86aWQnLFxuICogICBjb21wb25lbnQ6IFRlYW0sXG4gKiAgIGNoaWxkcmVuOiBbe1xuICogICAgIHBhdGg6ICcnLFxuICogICAgIGNvbXBvbmVudDogQWxsVXNlcnNcbiAqICAgfSwge1xuICogICAgIHBhdGg6ICd1c2VyLzpuYW1lJyxcbiAqICAgICBjb21wb25lbnQ6IFVzZXJcbiAqICAgfV1cbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiBFbXB0eS1wYXRoIHJvdXRlcyBjYW4gaGF2ZSBjaGlsZHJlbi4gSW4gdGhlIGZvbGxvd2luZyBleGFtcGxlLCB3aGVuIG5hdmlnYXRpbmdcbiAqIHRvIGAvdGVhbS8xMS91c2VyL2ppbWAsIHRoZSByb3V0ZXIgaW5zdGFudGlhdGVzIHRoZSB3cmFwcGVyIGNvbXBvbmVudCB3aXRoXG4gKiB0aGUgdXNlciBjb21wb25lbnQgaW4gaXQuXG4gKlxuICogTm90ZSB0aGF0IGFuIGVtcHR5IHBhdGggcm91dGUgaW5oZXJpdHMgaXRzIHBhcmVudCdzIHBhcmFtZXRlcnMgYW5kIGRhdGEuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAndGVhbS86aWQnLFxuICogICBjb21wb25lbnQ6IFRlYW0sXG4gKiAgIGNoaWxkcmVuOiBbe1xuICogICAgIHBhdGg6ICcnLFxuICogICAgIGNvbXBvbmVudDogV3JhcHBlckNtcCxcbiAqICAgICBjaGlsZHJlbjogW3tcbiAqICAgICAgIHBhdGg6ICd1c2VyLzpuYW1lJyxcbiAqICAgICAgIGNvbXBvbmVudDogVXNlclxuICogICAgIH1dXG4gKiAgIH1dXG4gKiB9XVxuICogYGBgXG4gKlxuICogIyMjIE1hdGNoaW5nIFN0cmF0ZWd5XG4gKlxuICogVGhlIGRlZmF1bHQgcGF0aC1tYXRjaCBzdHJhdGVneSBpcyAncHJlZml4Jywgd2hpY2ggbWVhbnMgdGhhdCB0aGUgcm91dGVyXG4gKiBjaGVja3MgVVJMIGVsZW1lbnRzIGZyb20gdGhlIGxlZnQgdG8gc2VlIGlmIHRoZSBVUkwgbWF0Y2hlcyBhIHNwZWNpZmllZCBwYXRoLlxuICogRm9yIGV4YW1wbGUsICcvdGVhbS8xMS91c2VyJyBtYXRjaGVzICd0ZWFtLzppZCcuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAnJyxcbiAqICAgcGF0aE1hdGNoOiAncHJlZml4JywgLy9kZWZhdWx0XG4gKiAgIHJlZGlyZWN0VG86ICdtYWluJ1xuICogfSwge1xuICogICBwYXRoOiAnbWFpbicsXG4gKiAgIGNvbXBvbmVudDogTWFpblxuICogfV1cbiAqIGBgYFxuICpcbiAqIFlvdSBjYW4gc3BlY2lmeSB0aGUgcGF0aC1tYXRjaCBzdHJhdGVneSAnZnVsbCcgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIHBhdGhcbiAqIGNvdmVycyB0aGUgd2hvbGUgdW5jb25zdW1lZCBVUkwuIEl0IGlzIGltcG9ydGFudCB0byBkbyB0aGlzIHdoZW4gcmVkaXJlY3RpbmdcbiAqIGVtcHR5LXBhdGggcm91dGVzLiBPdGhlcndpc2UsIGJlY2F1c2UgYW4gZW1wdHkgcGF0aCBpcyBhIHByZWZpeCBvZiBhbnkgVVJMLFxuICogdGhlIHJvdXRlciB3b3VsZCBhcHBseSB0aGUgcmVkaXJlY3QgZXZlbiB3aGVuIG5hdmlnYXRpbmcgdG8gdGhlIHJlZGlyZWN0IGRlc3RpbmF0aW9uLFxuICogY3JlYXRpbmcgYW4gZW5kbGVzcyBsb29wLlxuICpcbiAqIEluIHRoZSBmb2xsb3dpbmcgZXhhbXBsZSwgc3VwcGx5aW5nIHRoZSAnZnVsbCcgYHBhdGNoTWF0Y2hgIHN0cmF0ZWd5IGVuc3VyZXNcbiAqIHRoYXQgdGhlIHJvdXRlciBhcHBsaWVzIHRoZSByZWRpcmVjdCBpZiBhbmQgb25seSBpZiBuYXZpZ2F0aW5nIHRvICcvJy5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICcnLFxuICogICBwYXRoTWF0Y2g6ICdmdWxsJyxcbiAqICAgcmVkaXJlY3RUbzogJ21haW4nXG4gKiB9LCB7XG4gKiAgIHBhdGg6ICdtYWluJyxcbiAqICAgY29tcG9uZW50OiBNYWluXG4gKiB9XVxuICogYGBgXG4gKlxuICogIyMjIENvbXBvbmVudGxlc3MgUm91dGVzXG4gKlxuICogWW91IGNhbiBzaGFyZSBwYXJhbWV0ZXJzIGJldHdlZW4gc2libGluZyBjb21wb25lbnRzLlxuICogRm9yIGV4YW1wbGUsIHN1cHBvc2UgdGhhdCB0d28gc2libGluZyBjb21wb25lbnRzIHNob3VsZCBnbyBuZXh0IHRvIGVhY2ggb3RoZXIsXG4gKiBhbmQgYm90aCBvZiB0aGVtIHJlcXVpcmUgYW4gSUQgcGFyYW1ldGVyLiBZb3UgY2FuIGFjY29tcGxpc2ggdGhpcyB1c2luZyBhIHJvdXRlXG4gKiB0aGF0IGRvZXMgbm90IHNwZWNpZnkgYSBjb21wb25lbnQgYXQgdGhlIHRvcCBsZXZlbC5cbiAqXG4gKiBJbiB0aGUgZm9sbG93aW5nIGV4YW1wbGUsICdNYWluQ2hpbGQnIGFuZCAnQXV4Q2hpbGQnIGFyZSBzaWJsaW5ncy5cbiAqIFdoZW4gbmF2aWdhdGluZyB0byAncGFyZW50LzEwLyhhLy9hdXg6YiknLCB0aGUgcm91dGUgaW5zdGFudGlhdGVzXG4gKiB0aGUgbWFpbiBjaGlsZCBhbmQgYXV4IGNoaWxkIGNvbXBvbmVudHMgbmV4dCB0byBlYWNoIG90aGVyLlxuICogRm9yIHRoaXMgdG8gd29yaywgdGhlIGFwcGxpY2F0aW9uIGNvbXBvbmVudCBtdXN0IGhhdmUgdGhlIHByaW1hcnkgYW5kIGF1eCBvdXRsZXRzIGRlZmluZWQuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICAgcGF0aDogJ3BhcmVudC86aWQnLFxuICogICAgY2hpbGRyZW46IFtcbiAqICAgICAgeyBwYXRoOiAnYScsIGNvbXBvbmVudDogTWFpbkNoaWxkIH0sXG4gKiAgICAgIHsgcGF0aDogJ2InLCBjb21wb25lbnQ6IEF1eENoaWxkLCBvdXRsZXQ6ICdhdXgnIH1cbiAqICAgIF1cbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiBUaGUgcm91dGVyIG1lcmdlcyB0aGUgcGFyYW1ldGVycywgZGF0YSwgYW5kIHJlc29sdmUgb2YgdGhlIGNvbXBvbmVudGxlc3NcbiAqIHBhcmVudCBpbnRvIHRoZSBwYXJhbWV0ZXJzLCBkYXRhLCBhbmQgcmVzb2x2ZSBvZiB0aGUgY2hpbGRyZW4uXG4gKlxuICogVGhpcyBpcyBlc3BlY2lhbGx5IHVzZWZ1bCB3aGVuIGNoaWxkIGNvbXBvbmVudHMgYXJlIGRlZmluZWRcbiAqIHdpdGggYW4gZW1wdHkgcGF0aCBzdHJpbmcsIGFzIGluIHRoZSBmb2xsb3dpbmcgZXhhbXBsZS5cbiAqIFdpdGggdGhpcyBjb25maWd1cmF0aW9uLCBuYXZpZ2F0aW5nIHRvICcvcGFyZW50LzEwJyBjcmVhdGVzXG4gKiB0aGUgbWFpbiBjaGlsZCBhbmQgYXV4IGNvbXBvbmVudHMuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICAgcGF0aDogJ3BhcmVudC86aWQnLFxuICogICAgY2hpbGRyZW46IFtcbiAqICAgICAgeyBwYXRoOiAnJywgY29tcG9uZW50OiBNYWluQ2hpbGQgfSxcbiAqICAgICAgeyBwYXRoOiAnJywgY29tcG9uZW50OiBBdXhDaGlsZCwgb3V0bGV0OiAnYXV4JyB9XG4gKiAgICBdXG4gKiB9XVxuICogYGBgXG4gKlxuICogIyMjIExhenkgTG9hZGluZ1xuICpcbiAqIExhenkgbG9hZGluZyBzcGVlZHMgdXAgYXBwbGljYXRpb24gbG9hZCB0aW1lIGJ5IHNwbGl0dGluZyB0aGUgYXBwbGljYXRpb25cbiAqIGludG8gbXVsdGlwbGUgYnVuZGxlcyBhbmQgbG9hZGluZyB0aGVtIG9uIGRlbWFuZC5cbiAqIFRvIHVzZSBsYXp5IGxvYWRpbmcsIHByb3ZpZGUgdGhlIGBsb2FkQ2hpbGRyZW5gIHByb3BlcnR5ICBpbnN0ZWFkIG9mIHRoZSBgY2hpbGRyZW5gIHByb3BlcnR5LlxuICpcbiAqIEdpdmVuIHRoZSBmb2xsb3dpbmcgZXhhbXBsZSByb3V0ZSwgdGhlIHJvdXRlciB3aWxsIGxhenkgbG9hZFxuICogdGhlIGFzc29jaWF0ZWQgbW9kdWxlIG9uIGRlbWFuZCB1c2luZyB0aGUgYnJvd3NlciBuYXRpdmUgaW1wb3J0IHN5c3RlbS5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICdsYXp5JyxcbiAqICAgbG9hZENoaWxkcmVuOiAoKSA9PiBpbXBvcnQoJy4vbGF6eS1yb3V0ZS9sYXp5Lm1vZHVsZScpLnRoZW4obW9kID0+IG1vZC5MYXp5TW9kdWxlKSxcbiAqIH1dO1xuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJvdXRlIHtcbiAgLyoqXG4gICAqIFRoZSBwYXRoIHRvIG1hdGNoIGFnYWluc3QuIENhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyIHdpdGggYSBjdXN0b20gYG1hdGNoZXJgIGZ1bmN0aW9uLlxuICAgKiBBIFVSTCBzdHJpbmcgdGhhdCB1c2VzIHJvdXRlciBtYXRjaGluZyBub3RhdGlvbi5cbiAgICogQ2FuIGJlIGEgd2lsZCBjYXJkIChgKipgKSB0aGF0IG1hdGNoZXMgYW55IFVSTCAoc2VlIFVzYWdlIE5vdGVzIGJlbG93KS5cbiAgICogRGVmYXVsdCBpcyBcIi9cIiAodGhlIHJvb3QgcGF0aCkuXG4gICAqXG4gICAqL1xuICBwYXRoPzogc3RyaW5nO1xuICAvKipcbiAgICogVGhlIHBhdGgtbWF0Y2hpbmcgc3RyYXRlZ3ksIG9uZSBvZiAncHJlZml4JyBvciAnZnVsbCcuXG4gICAqIERlZmF1bHQgaXMgJ3ByZWZpeCcuXG4gICAqXG4gICAqIEJ5IGRlZmF1bHQsIHRoZSByb3V0ZXIgY2hlY2tzIFVSTCBlbGVtZW50cyBmcm9tIHRoZSBsZWZ0IHRvIHNlZSBpZiB0aGUgVVJMXG4gICAqIG1hdGNoZXMgYSBnaXZlbiAgcGF0aCwgYW5kIHN0b3BzIHdoZW4gdGhlcmUgaXMgYSBtYXRjaC4gRm9yIGV4YW1wbGUsXG4gICAqICcvdGVhbS8xMS91c2VyJyBtYXRjaGVzICd0ZWFtLzppZCcuXG4gICAqXG4gICAqIFRoZSBwYXRoLW1hdGNoIHN0cmF0ZWd5ICdmdWxsJyBtYXRjaGVzIGFnYWluc3QgdGhlIGVudGlyZSBVUkwuXG4gICAqIEl0IGlzIGltcG9ydGFudCB0byBkbyB0aGlzIHdoZW4gcmVkaXJlY3RpbmcgZW1wdHktcGF0aCByb3V0ZXMuXG4gICAqIE90aGVyd2lzZSwgYmVjYXVzZSBhbiBlbXB0eSBwYXRoIGlzIGEgcHJlZml4IG9mIGFueSBVUkwsXG4gICAqIHRoZSByb3V0ZXIgd291bGQgYXBwbHkgdGhlIHJlZGlyZWN0IGV2ZW4gd2hlbiBuYXZpZ2F0aW5nXG4gICAqIHRvIHRoZSByZWRpcmVjdCBkZXN0aW5hdGlvbiwgY3JlYXRpbmcgYW4gZW5kbGVzcyBsb29wLlxuICAgKlxuICAgKi9cbiAgcGF0aE1hdGNoPzogc3RyaW5nO1xuICAvKipcbiAgICogQSBjdXN0b20gVVJMLW1hdGNoaW5nIGZ1bmN0aW9uLiBDYW5ub3QgYmUgdXNlZCB0b2dldGhlciB3aXRoIGBwYXRoYC5cbiAgICovXG4gIG1hdGNoZXI/OiBVcmxNYXRjaGVyO1xuICAvKipcbiAgICogVGhlIGNvbXBvbmVudCB0byBpbnN0YW50aWF0ZSB3aGVuIHRoZSBwYXRoIG1hdGNoZXMuXG4gICAqIENhbiBiZSBlbXB0eSBpZiBjaGlsZCByb3V0ZXMgc3BlY2lmeSBjb21wb25lbnRzLlxuICAgKi9cbiAgY29tcG9uZW50PzogVHlwZTxhbnk+O1xuICAvKipcbiAgICogQSBVUkwgdG8gd2hpY2ggdG8gcmVkaXJlY3Qgd2hlbiBhIHRoZSBwYXRoIG1hdGNoZXMuXG4gICAqIEFic29sdXRlIGlmIHRoZSBVUkwgYmVnaW5zIHdpdGggYSBzbGFzaCAoLyksIG90aGVyd2lzZSByZWxhdGl2ZSB0byB0aGUgcGF0aCBVUkwuXG4gICAqIFdoZW4gbm90IHByZXNlbnQsIHJvdXRlciBkb2VzIG5vdCByZWRpcmVjdC5cbiAgICovXG4gIHJlZGlyZWN0VG8/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBOYW1lIG9mIGEgYFJvdXRlck91dGxldGAgb2JqZWN0IHdoZXJlIHRoZSBjb21wb25lbnQgY2FuIGJlIHBsYWNlZFxuICAgKiB3aGVuIHRoZSBwYXRoIG1hdGNoZXMuXG4gICAqL1xuICBvdXRsZXQ/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBBbiBhcnJheSBvZiBkZXBlbmRlbmN5LWluamVjdGlvbiB0b2tlbnMgdXNlZCB0byBsb29rIHVwIGBDYW5BY3RpdmF0ZSgpYFxuICAgKiBoYW5kbGVycywgaW4gb3JkZXIgdG8gZGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IHVzZXIgaXMgYWxsb3dlZCB0b1xuICAgKiBhY3RpdmF0ZSB0aGUgY29tcG9uZW50LiBCeSBkZWZhdWx0LCBhbnkgdXNlciBjYW4gYWN0aXZhdGUuXG4gICAqL1xuICBjYW5BY3RpdmF0ZT86IGFueVtdO1xuICAvKipcbiAgICogQW4gYXJyYXkgb2YgREkgdG9rZW5zIHVzZWQgdG8gbG9vayB1cCBgQ2FuQWN0aXZhdGVDaGlsZCgpYCBoYW5kbGVycyxcbiAgICogaW4gb3JkZXIgdG8gZGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IHVzZXIgaXMgYWxsb3dlZCB0byBhY3RpdmF0ZVxuICAgKiBhIGNoaWxkIG9mIHRoZSBjb21wb25lbnQuIEJ5IGRlZmF1bHQsIGFueSB1c2VyIGNhbiBhY3RpdmF0ZSBhIGNoaWxkLlxuICAgKi9cbiAgY2FuQWN0aXZhdGVDaGlsZD86IGFueVtdO1xuICAvKipcbiAgICogQW4gYXJyYXkgb2YgREkgdG9rZW5zIHVzZWQgdG8gbG9vayB1cCBgQ2FuRGVhY3RpdmF0ZSgpYFxuICAgKiBoYW5kbGVycywgaW4gb3JkZXIgdG8gZGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IHVzZXIgaXMgYWxsb3dlZCB0b1xuICAgKiBkZWFjdGl2YXRlIHRoZSBjb21wb25lbnQuIEJ5IGRlZmF1bHQsIGFueSB1c2VyIGNhbiBkZWFjdGl2YXRlLlxuICAgKlxuICAgKi9cbiAgY2FuRGVhY3RpdmF0ZT86IGFueVtdO1xuICAvKipcbiAgICogQW4gYXJyYXkgb2YgREkgdG9rZW5zIHVzZWQgdG8gbG9vayB1cCBgQ2FuTG9hZCgpYFxuICAgKiBoYW5kbGVycywgaW4gb3JkZXIgdG8gZGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IHVzZXIgaXMgYWxsb3dlZCB0b1xuICAgKiBsb2FkIHRoZSBjb21wb25lbnQuIEJ5IGRlZmF1bHQsIGFueSB1c2VyIGNhbiBsb2FkLlxuICAgKi9cbiAgY2FuTG9hZD86IGFueVtdO1xuICAvKipcbiAgICogQWRkaXRpb25hbCBkZXZlbG9wZXItZGVmaW5lZCBkYXRhIHByb3ZpZGVkIHRvIHRoZSBjb21wb25lbnQgdmlhXG4gICAqIGBBY3RpdmF0ZWRSb3V0ZWAuIEJ5IGRlZmF1bHQsIG5vIGFkZGl0aW9uYWwgZGF0YSBpcyBwYXNzZWQuXG4gICAqL1xuICBkYXRhPzogRGF0YTtcbiAgLyoqXG4gICAqIEEgbWFwIG9mIERJIHRva2VucyB1c2VkIHRvIGxvb2sgdXAgZGF0YSByZXNvbHZlcnMuIFNlZSBgUmVzb2x2ZWAuXG4gICAqL1xuICByZXNvbHZlPzogUmVzb2x2ZURhdGE7XG4gIC8qKlxuICAgKiBBbiBhcnJheSBvZiBjaGlsZCBgUm91dGVgIG9iamVjdHMgdGhhdCBzcGVjaWZpZXMgYSBuZXN0ZWQgcm91dGVcbiAgICogY29uZmlndXJhdGlvbi5cbiAgICovXG4gIGNoaWxkcmVuPzogUm91dGVzO1xuICAvKipcbiAgICogQSBgTG9hZENoaWxkcmVuYCBvYmplY3Qgc3BlY2lmeWluZyBsYXp5LWxvYWRlZCBjaGlsZCByb3V0ZXMuXG4gICAqL1xuICBsb2FkQ2hpbGRyZW4/OiBMb2FkQ2hpbGRyZW47XG4gIC8qKlxuICAgKiBEZWZpbmVzIHdoZW4gZ3VhcmRzIGFuZCByZXNvbHZlcnMgd2lsbCBiZSBydW4uIE9uZSBvZlxuICAgKiAtIGBwYXJhbXNPclF1ZXJ5UGFyYW1zQ2hhbmdlYCA6IFJ1biB3aGVuIHF1ZXJ5IHBhcmFtZXRlcnMgY2hhbmdlLlxuICAgKiAtIGBhbHdheXNgIDogUnVuIG9uIGV2ZXJ5IGV4ZWN1dGlvbi5cbiAgICogQnkgZGVmYXVsdCwgZ3VhcmRzIGFuZCByZXNvbHZlcnMgcnVuIG9ubHkgd2hlbiB0aGUgbWF0cml4XG4gICAqIHBhcmFtZXRlcnMgb2YgdGhlIHJvdXRlIGNoYW5nZS5cbiAgICovXG4gIHJ1bkd1YXJkc0FuZFJlc29sdmVycz86IFJ1bkd1YXJkc0FuZFJlc29sdmVycztcbiAgLyoqXG4gICAqIEZpbGxlZCBmb3Igcm91dGVzIHdpdGggYGxvYWRDaGlsZHJlbmAgb25jZSB0aGUgbW9kdWxlIGhhcyBiZWVuIGxvYWRlZFxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIF9sb2FkZWRDb25maWc/OiBMb2FkZWRSb3V0ZXJDb25maWc7XG59XG5cbmV4cG9ydCBjbGFzcyBMb2FkZWRSb3V0ZXJDb25maWcge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcm91dGVzOiBSb3V0ZVtdLCBwdWJsaWMgbW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+KSB7fVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVDb25maWcoY29uZmlnOiBSb3V0ZXMsIHBhcmVudFBhdGg6IHN0cmluZyA9ICcnKTogdm9pZCB7XG4gIC8vIGZvckVhY2ggZG9lc24ndCBpdGVyYXRlIHVuZGVmaW5lZCB2YWx1ZXNcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb25maWcubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCByb3V0ZTogUm91dGUgPSBjb25maWdbaV07XG4gICAgY29uc3QgZnVsbFBhdGg6IHN0cmluZyA9IGdldEZ1bGxQYXRoKHBhcmVudFBhdGgsIHJvdXRlKTtcbiAgICB2YWxpZGF0ZU5vZGUocm91dGUsIGZ1bGxQYXRoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZU5vZGUocm91dGU6IFJvdXRlLCBmdWxsUGF0aDogc3RyaW5nKTogdm9pZCB7XG4gIGlmICghcm91dGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFxuICAgICAgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IEVuY291bnRlcmVkIHVuZGVmaW5lZCByb3V0ZS5cbiAgICAgIFRoZSByZWFzb24gbWlnaHQgYmUgYW4gZXh0cmEgY29tbWEuXG5cbiAgICAgIEV4YW1wbGU6XG4gICAgICBjb25zdCByb3V0ZXM6IFJvdXRlcyA9IFtcbiAgICAgICAgeyBwYXRoOiAnJywgcmVkaXJlY3RUbzogJy9kYXNoYm9hcmQnLCBwYXRoTWF0Y2g6ICdmdWxsJyB9LFxuICAgICAgICB7IHBhdGg6ICdkYXNoYm9hcmQnLCAgY29tcG9uZW50OiBEYXNoYm9hcmRDb21wb25lbnQgfSwsIDw8IHR3byBjb21tYXNcbiAgICAgICAgeyBwYXRoOiAnZGV0YWlsLzppZCcsIGNvbXBvbmVudDogSGVyb0RldGFpbENvbXBvbmVudCB9XG4gICAgICBdO1xuICAgIGApO1xuICB9XG4gIGlmIChBcnJheS5pc0FycmF5KHJvdXRlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IEFycmF5IGNhbm5vdCBiZSBzcGVjaWZpZWRgKTtcbiAgfVxuICBpZiAoIXJvdXRlLmNvbXBvbmVudCAmJiAhcm91dGUuY2hpbGRyZW4gJiYgIXJvdXRlLmxvYWRDaGlsZHJlbiAmJlxuICAgICAgKHJvdXRlLm91dGxldCAmJiByb3V0ZS5vdXRsZXQgIT09IFBSSU1BUllfT1VUTEVUKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBhIGNvbXBvbmVudGxlc3Mgcm91dGUgd2l0aG91dCBjaGlsZHJlbiBvciBsb2FkQ2hpbGRyZW4gY2Fubm90IGhhdmUgYSBuYW1lZCBvdXRsZXQgc2V0YCk7XG4gIH1cbiAgaWYgKHJvdXRlLnJlZGlyZWN0VG8gJiYgcm91dGUuY2hpbGRyZW4pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogcmVkaXJlY3RUbyBhbmQgY2hpbGRyZW4gY2Fubm90IGJlIHVzZWQgdG9nZXRoZXJgKTtcbiAgfVxuICBpZiAocm91dGUucmVkaXJlY3RUbyAmJiByb3V0ZS5sb2FkQ2hpbGRyZW4pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogcmVkaXJlY3RUbyBhbmQgbG9hZENoaWxkcmVuIGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gIH1cbiAgaWYgKHJvdXRlLmNoaWxkcmVuICYmIHJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBjaGlsZHJlbiBhbmQgbG9hZENoaWxkcmVuIGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gIH1cbiAgaWYgKHJvdXRlLnJlZGlyZWN0VG8gJiYgcm91dGUuY29tcG9uZW50KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IHJlZGlyZWN0VG8gYW5kIGNvbXBvbmVudCBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmApO1xuICB9XG4gIGlmIChyb3V0ZS5wYXRoICYmIHJvdXRlLm1hdGNoZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogcGF0aCBhbmQgbWF0Y2hlciBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmApO1xuICB9XG4gIGlmIChyb3V0ZS5yZWRpcmVjdFRvID09PSB2b2lkIDAgJiYgIXJvdXRlLmNvbXBvbmVudCAmJiAhcm91dGUuY2hpbGRyZW4gJiYgIXJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nLiBPbmUgb2YgdGhlIGZvbGxvd2luZyBtdXN0IGJlIHByb3ZpZGVkOiBjb21wb25lbnQsIHJlZGlyZWN0VG8sIGNoaWxkcmVuIG9yIGxvYWRDaGlsZHJlbmApO1xuICB9XG4gIGlmIChyb3V0ZS5wYXRoID09PSB2b2lkIDAgJiYgcm91dGUubWF0Y2hlciA9PT0gdm9pZCAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IHJvdXRlcyBtdXN0IGhhdmUgZWl0aGVyIGEgcGF0aCBvciBhIG1hdGNoZXIgc3BlY2lmaWVkYCk7XG4gIH1cbiAgaWYgKHR5cGVvZiByb3V0ZS5wYXRoID09PSAnc3RyaW5nJyAmJiByb3V0ZS5wYXRoLmNoYXJBdCgwKSA9PT0gJy8nKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogcGF0aCBjYW5ub3Qgc3RhcnQgd2l0aCBhIHNsYXNoYCk7XG4gIH1cbiAgaWYgKHJvdXRlLnBhdGggPT09ICcnICYmIHJvdXRlLnJlZGlyZWN0VG8gIT09IHZvaWQgMCAmJiByb3V0ZS5wYXRoTWF0Y2ggPT09IHZvaWQgMCkge1xuICAgIGNvbnN0IGV4cCA9XG4gICAgICAgIGBUaGUgZGVmYXVsdCB2YWx1ZSBvZiAncGF0aE1hdGNoJyBpcyAncHJlZml4JywgYnV0IG9mdGVuIHRoZSBpbnRlbnQgaXMgdG8gdXNlICdmdWxsJy5gO1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAne3BhdGg6IFwiJHtmdWxsUGF0aH1cIiwgcmVkaXJlY3RUbzogXCIke3JvdXRlLnJlZGlyZWN0VG99XCJ9JzogcGxlYXNlIHByb3ZpZGUgJ3BhdGhNYXRjaCcuICR7ZXhwfWApO1xuICB9XG4gIGlmIChyb3V0ZS5wYXRoTWF0Y2ggIT09IHZvaWQgMCAmJiByb3V0ZS5wYXRoTWF0Y2ggIT09ICdmdWxsJyAmJiByb3V0ZS5wYXRoTWF0Y2ggIT09ICdwcmVmaXgnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IHBhdGhNYXRjaCBjYW4gb25seSBiZSBzZXQgdG8gJ3ByZWZpeCcgb3IgJ2Z1bGwnYCk7XG4gIH1cbiAgaWYgKHJvdXRlLmNoaWxkcmVuKSB7XG4gICAgdmFsaWRhdGVDb25maWcocm91dGUuY2hpbGRyZW4sIGZ1bGxQYXRoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRGdWxsUGF0aChwYXJlbnRQYXRoOiBzdHJpbmcsIGN1cnJlbnRSb3V0ZTogUm91dGUpOiBzdHJpbmcge1xuICBpZiAoIWN1cnJlbnRSb3V0ZSkge1xuICAgIHJldHVybiBwYXJlbnRQYXRoO1xuICB9XG4gIGlmICghcGFyZW50UGF0aCAmJiAhY3VycmVudFJvdXRlLnBhdGgpIHtcbiAgICByZXR1cm4gJyc7XG4gIH0gZWxzZSBpZiAocGFyZW50UGF0aCAmJiAhY3VycmVudFJvdXRlLnBhdGgpIHtcbiAgICByZXR1cm4gYCR7cGFyZW50UGF0aH0vYDtcbiAgfSBlbHNlIGlmICghcGFyZW50UGF0aCAmJiBjdXJyZW50Um91dGUucGF0aCkge1xuICAgIHJldHVybiBjdXJyZW50Um91dGUucGF0aDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYCR7cGFyZW50UGF0aH0vJHtjdXJyZW50Um91dGUucGF0aH1gO1xuICB9XG59XG5cbi8qKlxuICogTWFrZXMgYSBjb3B5IG9mIHRoZSBjb25maWcgYW5kIGFkZHMgYW55IGRlZmF1bHQgcmVxdWlyZWQgcHJvcGVydGllcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0YW5kYXJkaXplQ29uZmlnKHI6IFJvdXRlKTogUm91dGUge1xuICBjb25zdCBjaGlsZHJlbiA9IHIuY2hpbGRyZW4gJiYgci5jaGlsZHJlbi5tYXAoc3RhbmRhcmRpemVDb25maWcpO1xuICBjb25zdCBjID0gY2hpbGRyZW4gPyB7Li4uciwgY2hpbGRyZW59IDogey4uLnJ9O1xuICBpZiAoIWMuY29tcG9uZW50ICYmIChjaGlsZHJlbiB8fCBjLmxvYWRDaGlsZHJlbikgJiYgKGMub3V0bGV0ICYmIGMub3V0bGV0ICE9PSBQUklNQVJZX09VVExFVCkpIHtcbiAgICBjLmNvbXBvbmVudCA9IEVtcHR5T3V0bGV0Q29tcG9uZW50O1xuICB9XG4gIHJldHVybiBjO1xufVxuIl19