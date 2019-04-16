/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
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
 * In the following example, 'ChildCmp' and 'AuxCmp' are siblings.
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
 * Given the following example route, the router uses the registered
 * `NgModuleFactoryLoader` to fetch an NgModule associated with 'team'.
 * It then extracts the set of routes defined in that NgModule,
 * and transparently adds those routes to the main configuration.
 *
 * ```
 * [{
 *   path: 'team/:id',
 *   component: Team,
 *   loadChildren: 'team'
 * }]
 * ```
 *
 * \@publicApi
 * @record
 */
export function Route() { }
if (false) {
    /**
     * The path to match against, a URL string that uses router matching notation.
     * Can be a wild card (`**`) that matches any URL (see Usage Notes below).
     * Default is "/" (the root path).
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
     * A URL-matching function to use as a custom strategy for path matching.
     * If present, supersedes `path` and `pathMatch`.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFXQSxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUUvRCxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sVUFBVSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUE2VnhDLDJCQW9HQzs7Ozs7Ozs7SUE5RkMscUJBQWM7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBZ0JkLDBCQUFtQjs7Ozs7O0lBS25CLHdCQUFxQjs7Ozs7O0lBS3JCLDBCQUFzQjs7Ozs7OztJQU10QiwyQkFBb0I7Ozs7OztJQUtwQix1QkFBZ0I7Ozs7Ozs7SUFNaEIsNEJBQW9COzs7Ozs7O0lBTXBCLGlDQUF5Qjs7Ozs7Ozs7SUFPekIsOEJBQXNCOzs7Ozs7O0lBTXRCLHdCQUFnQjs7Ozs7O0lBS2hCLHFCQUFZOzs7OztJQUlaLHdCQUFzQjs7Ozs7O0lBS3RCLHlCQUFrQjs7Ozs7SUFJbEIsNkJBQTRCOzs7Ozs7Ozs7SUFRNUIsc0NBQThDOzs7Ozs7SUFLOUMsOEJBQW1DOztBQUdyQyxNQUFNLE9BQU8sa0JBQWtCOzs7OztJQUM3QixZQUFtQixNQUFlLEVBQVMsTUFBd0I7UUFBaEQsV0FBTSxHQUFOLE1BQU0sQ0FBUztRQUFTLFdBQU0sR0FBTixNQUFNLENBQWtCO0lBQUcsQ0FBQztDQUN4RTs7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QUtELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxDQUFROztVQUNsQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQzs7VUFDMUQsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLG1CQUFLLENBQUMsSUFBRSxRQUFRLElBQUUsQ0FBQyxtQkFBSyxDQUFDLENBQUM7SUFDOUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLGNBQWMsQ0FBQyxFQUFFO1FBQzdGLENBQUMsQ0FBQyxTQUFTLEdBQUcsb0JBQW9CLENBQUM7S0FDcEM7SUFDRCxPQUFPLENBQUMsQ0FBQztBQUNYLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TmdNb2R1bGVGYWN0b3J5LCBOZ01vZHVsZVJlZiwgVHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge09ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge0VtcHR5T3V0bGV0Q29tcG9uZW50fSBmcm9tICcuL2NvbXBvbmVudHMvZW1wdHlfb3V0bGV0JztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGVTbmFwc2hvdH0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQUklNQVJZX09VVExFVH0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtVcmxTZWdtZW50LCBVcmxTZWdtZW50R3JvdXB9IGZyb20gJy4vdXJsX3RyZWUnO1xuXG5cbi8qKlxuICogUmVwcmVzZW50cyBhIHJvdXRlIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBSb3V0ZXIgc2VydmljZS5cbiAqIEFuIGFycmF5IG9mIGBSb3V0ZWAgb2JqZWN0cywgdXNlZCBpbiBgUm91dGVyLmNvbmZpZ2AgYW5kIGZvciBuZXN0ZWQgcm91dGUgY29uZmlndXJhdGlvbnNcbiAqIGluIGBSb3V0ZS5jaGlsZHJlbmAuXG4gKlxuICogQHNlZSBgUm91dGVgXG4gKiBAc2VlIGBSb3V0ZXJgXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIFJvdXRlcyA9IFJvdXRlW107XG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgcmVzdWx0IG9mIG1hdGNoaW5nIFVSTHMgd2l0aCBhIGN1c3RvbSBtYXRjaGluZyBmdW5jdGlvbi5cbiAqXG4gKiAqIGBjb25zdW1lZGAgaXMgYW4gYXJyYXkgb2YgdGhlIGNvbnN1bWVkIFVSTCBzZWdtZW50cy5cbiAqICogYHBvc1BhcmFtc2AgaXMgYSBtYXAgb2YgcG9zaXRpb25hbCBwYXJhbWV0ZXJzLlxuICpcbiAqIEBzZWUgYFVybE1hdGNoZXIoKWBcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgVXJsTWF0Y2hSZXN1bHQgPSB7XG4gIGNvbnN1bWVkOiBVcmxTZWdtZW50W107IHBvc1BhcmFtcz86IHtbbmFtZTogc3RyaW5nXTogVXJsU2VnbWVudH07XG59O1xuXG4vKipcbiAqIEEgZnVuY3Rpb24gZm9yIG1hdGNoaW5nIGEgcm91dGUgYWdhaW5zdCBVUkxzLiBJbXBsZW1lbnQgYSBjdXN0b20gVVJMIG1hdGNoZXJcbiAqIGZvciBgUm91dGUubWF0Y2hlcmAgd2hlbiBhIGNvbWJpbmF0aW9uIG9mIGBwYXRoYCBhbmQgYHBhdGhNYXRjaGBcbiAqIGlzIG5vdCBleHByZXNzaXZlIGVub3VnaC5cbiAqXG4gKiBAcGFyYW0gc2VnbWVudHMgQW4gYXJyYXkgb2YgVVJMIHNlZ21lbnRzLlxuICogQHBhcmFtIGdyb3VwIEEgc2VnbWVudCBncm91cC5cbiAqIEBwYXJhbSByb3V0ZSBUaGUgcm91dGUgdG8gbWF0Y2ggYWdhaW5zdC5cbiAqIEByZXR1cm5zIFRoZSBtYXRjaC1yZXN1bHQsXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBUaGUgZm9sbG93aW5nIG1hdGNoZXIgbWF0Y2hlcyBIVE1MIGZpbGVzLlxuICpcbiAqIGBgYFxuICogZXhwb3J0IGZ1bmN0aW9uIGh0bWxGaWxlcyh1cmw6IFVybFNlZ21lbnRbXSkge1xuICogICByZXR1cm4gdXJsLmxlbmd0aCA9PT0gMSAmJiB1cmxbMF0ucGF0aC5lbmRzV2l0aCgnLmh0bWwnKSA/ICh7Y29uc3VtZWQ6IHVybH0pIDogbnVsbDtcbiAqIH1cbiAqXG4gKiBleHBvcnQgY29uc3Qgcm91dGVzID0gW3sgbWF0Y2hlcjogaHRtbEZpbGVzLCBjb21wb25lbnQ6IEFueUNvbXBvbmVudCB9XTtcbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgVXJsTWF0Y2hlciA9IChzZWdtZW50czogVXJsU2VnbWVudFtdLCBncm91cDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZTogUm91dGUpID0+XG4gICAgVXJsTWF0Y2hSZXN1bHQ7XG5cbi8qKlxuICpcbiAqIFJlcHJlc2VudHMgc3RhdGljIGRhdGEgYXNzb2NpYXRlZCB3aXRoIGEgcGFydGljdWxhciByb3V0ZS5cbiAqXG4gKiBAc2VlIGBSb3V0ZSNkYXRhYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgRGF0YSA9IHtcbiAgW25hbWU6IHN0cmluZ106IGFueVxufTtcblxuLyoqXG4gKlxuICogUmVwcmVzZW50cyB0aGUgcmVzb2x2ZWQgZGF0YSBhc3NvY2lhdGVkIHdpdGggYSBwYXJ0aWN1bGFyIHJvdXRlLlxuICpcbiAqIEBzZWUgYFJvdXRlI3Jlc29sdmVgLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgUmVzb2x2ZURhdGEgPSB7XG4gIFtuYW1lOiBzdHJpbmddOiBhbnlcbn07XG5cbi8qKlxuICpcbiAqIEEgZnVuY3Rpb24gdGhhdCBpcyBjYWxsZWQgdG8gcmVzb2x2ZSBhIGNvbGxlY3Rpb24gb2YgbGF6eS1sb2FkZWQgcm91dGVzLlxuICpcbiAqIEBzZWUgYFJvdXRlI2xvYWRDaGlsZHJlbmAuXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIExvYWRDaGlsZHJlbkNhbGxiYWNrID0gKCkgPT4gVHlwZTxhbnk+fCBOZ01vZHVsZUZhY3Rvcnk8YW55PnwgT2JzZXJ2YWJsZTxUeXBlPGFueT4+fFxuICAgIFByb21pc2U8TmdNb2R1bGVGYWN0b3J5PGFueT58VHlwZTxhbnk+fGFueT47XG5cbi8qKlxuICpcbiAqIEEgc3RyaW5nIG9mIHRoZSBmb3JtIGBwYXRoL3RvL2ZpbGUjZXhwb3J0TmFtZWAgdGhhdCBhY3RzIGFzIGEgVVJMIGZvciBhIHNldCBvZiByb3V0ZXMgdG8gbG9hZCxcbiAqIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHN1Y2ggYSBzZXQuXG4gKlxuICogQHNlZSBgUm91dGUjbG9hZENoaWxkcmVuYC5cbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgTG9hZENoaWxkcmVuID0gc3RyaW5nIHwgTG9hZENoaWxkcmVuQ2FsbGJhY2s7XG5cbi8qKlxuICpcbiAqIEhvdyB0byBoYW5kbGUgcXVlcnkgcGFyYW1ldGVycyBpbiBhIHJvdXRlciBsaW5rLlxuICogT25lIG9mOlxuICogLSBgbWVyZ2VgIDogTWVyZ2UgbmV3IHdpdGggY3VycmVudCBwYXJhbWV0ZXJzLlxuICogLSBgcHJlc2VydmVgIDogUHJlc2VydmUgY3VycmVudCBwYXJhbWV0ZXJzLlxuICpcbiAqIEBzZWUgYFJvdXRlckxpbmsjcXVlcnlQYXJhbXNIYW5kbGluZ2AuXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIFF1ZXJ5UGFyYW1zSGFuZGxpbmcgPSAnbWVyZ2UnIHwgJ3ByZXNlcnZlJyB8ICcnO1xuXG4vKipcbiAqXG4gKiBBIHBvbGljeSBmb3Igd2hlbiB0byBydW4gZ3VhcmRzIGFuZCByZXNvbHZlcnMgb24gYSByb3V0ZS5cbiAqXG4gKiBAc2VlIGBSb3V0ZSNydW5HdWFyZHNBbmRSZXNvbHZlcnNgXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIFJ1bkd1YXJkc0FuZFJlc29sdmVycyA9ICdwYXRoUGFyYW1zQ2hhbmdlJyB8ICdwYXRoUGFyYW1zT3JRdWVyeVBhcmFtc0NoYW5nZScgfFxuICAgICdwYXJhbXNDaGFuZ2UnIHwgJ3BhcmFtc09yUXVlcnlQYXJhbXNDaGFuZ2UnIHwgJ2Fsd2F5cycgfFxuICAgICgoZnJvbTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgdG86IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpID0+IGJvb2xlYW4pO1xuXG4vKipcbiAqIEEgY29uZmlndXJhdGlvbiBvYmplY3QgdGhhdCBkZWZpbmVzIGEgc2luZ2xlIHJvdXRlLlxuICogQSBzZXQgb2Ygcm91dGVzIGFyZSBjb2xsZWN0ZWQgaW4gYSBgUm91dGVzYCBhcnJheSB0byBkZWZpbmUgYSBgUm91dGVyYCBjb25maWd1cmF0aW9uLlxuICogVGhlIHJvdXRlciBhdHRlbXB0cyB0byBtYXRjaCBzZWdtZW50cyBvZiBhIGdpdmVuIFVSTCBhZ2FpbnN0IGVhY2ggcm91dGUsXG4gKiB1c2luZyB0aGUgY29uZmlndXJhdGlvbiBvcHRpb25zIGRlZmluZWQgaW4gdGhpcyBvYmplY3QuXG4gKlxuICogU3VwcG9ydHMgc3RhdGljLCBwYXJhbWV0ZXJpemVkLCByZWRpcmVjdCwgYW5kIHdpbGRjYXJkIHJvdXRlcywgYXMgd2VsbCBhc1xuICogY3VzdG9tIHJvdXRlIGRhdGEgYW5kIHJlc29sdmUgbWV0aG9kcy5cbiAqXG4gKiBGb3IgZGV0YWlsZWQgdXNhZ2UgaW5mb3JtYXRpb24sIHNlZSB0aGUgW1JvdXRpbmcgR3VpZGVdKGd1aWRlL3JvdXRlcikuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiAjIyMgU2ltcGxlIENvbmZpZ3VyYXRpb25cbiAqXG4gKiBUaGUgZm9sbG93aW5nIHJvdXRlIHNwZWNpZmllcyB0aGF0IHdoZW4gbmF2aWdhdGluZyB0bywgZm9yIGV4YW1wbGUsXG4gKiBgL3RlYW0vMTEvdXNlci9ib2JgLCB0aGUgcm91dGVyIGNyZWF0ZXMgdGhlICdUZWFtJyBjb21wb25lbnRcbiAqIHdpdGggdGhlICdVc2VyJyBjaGlsZCBjb21wb25lbnQgaW4gaXQuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAndGVhbS86aWQnLFxuICAqICBjb21wb25lbnQ6IFRlYW0sXG4gKiAgIGNoaWxkcmVuOiBbe1xuICogICAgIHBhdGg6ICd1c2VyLzpuYW1lJyxcbiAqICAgICBjb21wb25lbnQ6IFVzZXJcbiAqICAgfV1cbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiAjIyMgTXVsdGlwbGUgT3V0bGV0c1xuICpcbiAqIFRoZSBmb2xsb3dpbmcgcm91dGUgY3JlYXRlcyBzaWJsaW5nIGNvbXBvbmVudHMgd2l0aCBtdWx0aXBsZSBvdXRsZXRzLlxuICogV2hlbiBuYXZpZ2F0aW5nIHRvIGAvdGVhbS8xMShhdXg6Y2hhdC9qaW0pYCwgdGhlIHJvdXRlciBjcmVhdGVzIHRoZSAnVGVhbScgY29tcG9uZW50IG5leHQgdG9cbiAqIHRoZSAnQ2hhdCcgY29tcG9uZW50LiBUaGUgJ0NoYXQnIGNvbXBvbmVudCBpcyBwbGFjZWQgaW50byB0aGUgJ2F1eCcgb3V0bGV0LlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgY29tcG9uZW50OiBUZWFtXG4gKiB9LCB7XG4gKiAgIHBhdGg6ICdjaGF0Lzp1c2VyJyxcbiAqICAgY29tcG9uZW50OiBDaGF0XG4gKiAgIG91dGxldDogJ2F1eCdcbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiAjIyMgV2lsZCBDYXJkc1xuICpcbiAqIFRoZSBmb2xsb3dpbmcgcm91dGUgdXNlcyB3aWxkLWNhcmQgbm90YXRpb24gdG8gc3BlY2lmeSBhIGNvbXBvbmVudFxuICogdGhhdCBpcyBhbHdheXMgaW5zdGFudGlhdGVkIHJlZ2FyZGxlc3Mgb2Ygd2hlcmUgeW91IG5hdmlnYXRlIHRvLlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJyoqJyxcbiAqICAgY29tcG9uZW50OiBXaWxkY2FyZENvbXBvbmVudFxuICogfV1cbiAqIGBgYFxuICpcbiAqICMjIyBSZWRpcmVjdHNcbiAqXG4gKiBUaGUgZm9sbG93aW5nIHJvdXRlIHVzZXMgdGhlIGByZWRpcmVjdFRvYCBwcm9wZXJ0eSB0byBpZ25vcmUgYSBzZWdtZW50IG9mXG4gKiBhIGdpdmVuIFVSTCB3aGVuIGxvb2tpbmcgZm9yIGEgY2hpbGQgcGF0aC5cbiAqXG4gKiBXaGVuIG5hdmlnYXRpbmcgdG8gJy90ZWFtLzExL2xlZ2FjeS91c2VyL2ppbScsIHRoZSByb3V0ZXIgY2hhbmdlcyB0aGUgVVJMIHNlZ21lbnRcbiAqICcvdGVhbS8xMS9sZWdhY3kvdXNlci9qaW0nIHRvICcvdGVhbS8xMS91c2VyL2ppbScsIGFuZCB0aGVuIGluc3RhbnRpYXRlc1xuICogdGhlIFRlYW0gY29tcG9uZW50IHdpdGggdGhlIFVzZXIgY2hpbGQgY29tcG9uZW50IGluIGl0LlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgY29tcG9uZW50OiBUZWFtLFxuICogICBjaGlsZHJlbjogW3tcbiAqICAgICBwYXRoOiAnbGVnYWN5L3VzZXIvOm5hbWUnLFxuICogICAgIHJlZGlyZWN0VG86ICd1c2VyLzpuYW1lJ1xuICogICB9LCB7XG4gKiAgICAgcGF0aDogJ3VzZXIvOm5hbWUnLFxuICogICAgIGNvbXBvbmVudDogVXNlclxuICogICB9XVxuICogfV1cbiAqIGBgYFxuICpcbiAqIFRoZSByZWRpcmVjdCBwYXRoIGNhbiBiZSByZWxhdGl2ZSwgYXMgc2hvd24gaW4gdGhpcyBleGFtcGxlLCBvciBhYnNvbHV0ZS5cbiAqIElmIHdlIGNoYW5nZSB0aGUgYHJlZGlyZWN0VG9gIHZhbHVlIGluIHRoZSBleGFtcGxlIHRvIHRoZSBhYnNvbHV0ZSBVUkwgc2VnbWVudCAnL3VzZXIvOm5hbWUnLFxuICogdGhlIHJlc3VsdCBVUkwgaXMgYWxzbyBhYnNvbHV0ZSwgJy91c2VyL2ppbScuXG5cbiAqICMjIyBFbXB0eSBQYXRoXG4gKlxuICogRW1wdHktcGF0aCByb3V0ZSBjb25maWd1cmF0aW9ucyBjYW4gYmUgdXNlZCB0byBpbnN0YW50aWF0ZSBjb21wb25lbnRzIHRoYXQgZG8gbm90ICdjb25zdW1lJ1xuICogYW55IFVSTCBzZWdtZW50cy5cbiAqXG4gKiBJbiB0aGUgZm9sbG93aW5nIGNvbmZpZ3VyYXRpb24sIHdoZW4gbmF2aWdhdGluZyB0b1xuICogYC90ZWFtLzExYCwgdGhlIHJvdXRlciBpbnN0YW50aWF0ZXMgdGhlICdBbGxVc2VycycgY29tcG9uZW50LlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgY29tcG9uZW50OiBUZWFtLFxuICogICBjaGlsZHJlbjogW3tcbiAqICAgICBwYXRoOiAnJyxcbiAqICAgICBjb21wb25lbnQ6IEFsbFVzZXJzXG4gKiAgIH0sIHtcbiAqICAgICBwYXRoOiAndXNlci86bmFtZScsXG4gKiAgICAgY29tcG9uZW50OiBVc2VyXG4gKiAgIH1dXG4gKiB9XVxuICogYGBgXG4gKlxuICogRW1wdHktcGF0aCByb3V0ZXMgY2FuIGhhdmUgY2hpbGRyZW4uIEluIHRoZSBmb2xsb3dpbmcgZXhhbXBsZSwgd2hlbiBuYXZpZ2F0aW5nXG4gKiB0byBgL3RlYW0vMTEvdXNlci9qaW1gLCB0aGUgcm91dGVyIGluc3RhbnRpYXRlcyB0aGUgd3JhcHBlciBjb21wb25lbnQgd2l0aFxuICogdGhlIHVzZXIgY29tcG9uZW50IGluIGl0LlxuICpcbiAqIE5vdGUgdGhhdCBhbiBlbXB0eSBwYXRoIHJvdXRlIGluaGVyaXRzIGl0cyBwYXJlbnQncyBwYXJhbWV0ZXJzIGFuZCBkYXRhLlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgY29tcG9uZW50OiBUZWFtLFxuICogICBjaGlsZHJlbjogW3tcbiAqICAgICBwYXRoOiAnJyxcbiAqICAgICBjb21wb25lbnQ6IFdyYXBwZXJDbXAsXG4gKiAgICAgY2hpbGRyZW46IFt7XG4gKiAgICAgICBwYXRoOiAndXNlci86bmFtZScsXG4gKiAgICAgICBjb21wb25lbnQ6IFVzZXJcbiAqICAgICB9XVxuICogICB9XVxuICogfV1cbiAqIGBgYFxuICpcbiAqICMjIyBNYXRjaGluZyBTdHJhdGVneVxuICpcbiAqIFRoZSBkZWZhdWx0IHBhdGgtbWF0Y2ggc3RyYXRlZ3kgaXMgJ3ByZWZpeCcsIHdoaWNoIG1lYW5zIHRoYXQgdGhlIHJvdXRlclxuICogY2hlY2tzIFVSTCBlbGVtZW50cyBmcm9tIHRoZSBsZWZ0IHRvIHNlZSBpZiB0aGUgVVJMIG1hdGNoZXMgYSBzcGVjaWZpZWQgcGF0aC5cbiAqIEZvciBleGFtcGxlLCAnL3RlYW0vMTEvdXNlcicgbWF0Y2hlcyAndGVhbS86aWQnLlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJycsXG4gKiAgIHBhdGhNYXRjaDogJ3ByZWZpeCcsIC8vZGVmYXVsdFxuICogICByZWRpcmVjdFRvOiAnbWFpbidcbiAqIH0sIHtcbiAqICAgcGF0aDogJ21haW4nLFxuICogICBjb21wb25lbnQ6IE1haW5cbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiBZb3UgY2FuIHNwZWNpZnkgdGhlIHBhdGgtbWF0Y2ggc3RyYXRlZ3kgJ2Z1bGwnIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSBwYXRoXG4gKiBjb3ZlcnMgdGhlIHdob2xlIHVuY29uc3VtZWQgVVJMLiBJdCBpcyBpbXBvcnRhbnQgdG8gZG8gdGhpcyB3aGVuIHJlZGlyZWN0aW5nXG4gKiBlbXB0eS1wYXRoIHJvdXRlcy4gT3RoZXJ3aXNlLCBiZWNhdXNlIGFuIGVtcHR5IHBhdGggaXMgYSBwcmVmaXggb2YgYW55IFVSTCxcbiAqIHRoZSByb3V0ZXIgd291bGQgYXBwbHkgdGhlIHJlZGlyZWN0IGV2ZW4gd2hlbiBuYXZpZ2F0aW5nIHRvIHRoZSByZWRpcmVjdCBkZXN0aW5hdGlvbixcbiAqIGNyZWF0aW5nIGFuIGVuZGxlc3MgbG9vcC5cbiAqXG4gKiBJbiB0aGUgZm9sbG93aW5nIGV4YW1wbGUsIHN1cHBseWluZyB0aGUgJ2Z1bGwnIGBwYXRjaE1hdGNoYCBzdHJhdGVneSBlbnN1cmVzXG4gKiB0aGF0IHRoZSByb3V0ZXIgYXBwbGllcyB0aGUgcmVkaXJlY3QgaWYgYW5kIG9ubHkgaWYgbmF2aWdhdGluZyB0byAnLycuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAnJyxcbiAqICAgcGF0aE1hdGNoOiAnZnVsbCcsXG4gKiAgIHJlZGlyZWN0VG86ICdtYWluJ1xuICogfSwge1xuICogICBwYXRoOiAnbWFpbicsXG4gKiAgIGNvbXBvbmVudDogTWFpblxuICogfV1cbiAqIGBgYFxuICpcbiAqICMjIyBDb21wb25lbnRsZXNzIFJvdXRlc1xuICpcbiAqIFlvdSBjYW4gc2hhcmUgcGFyYW1ldGVycyBiZXR3ZWVuIHNpYmxpbmcgY29tcG9uZW50cy5cbiAqIEZvciBleGFtcGxlLCBzdXBwb3NlIHRoYXQgdHdvIHNpYmxpbmcgY29tcG9uZW50cyBzaG91bGQgZ28gbmV4dCB0byBlYWNoIG90aGVyLFxuICogYW5kIGJvdGggb2YgdGhlbSByZXF1aXJlIGFuIElEIHBhcmFtZXRlci4gWW91IGNhbiBhY2NvbXBsaXNoIHRoaXMgdXNpbmcgYSByb3V0ZVxuICogdGhhdCBkb2VzIG5vdCBzcGVjaWZ5IGEgY29tcG9uZW50IGF0IHRoZSB0b3AgbGV2ZWwuXG4gKlxuICogSW4gdGhlIGZvbGxvd2luZyBleGFtcGxlLCAnQ2hpbGRDbXAnIGFuZCAnQXV4Q21wJyBhcmUgc2libGluZ3MuXG4gKiBXaGVuIG5hdmlnYXRpbmcgdG8gJ3BhcmVudC8xMC8oYS8vYXV4OmIpJywgdGhlIHJvdXRlIGluc3RhbnRpYXRlc1xuICogdGhlIG1haW4gY2hpbGQgYW5kIGF1eCBjaGlsZCBjb21wb25lbnRzIG5leHQgdG8gZWFjaCBvdGhlci5cbiAqIEZvciB0aGlzIHRvIHdvcmssIHRoZSBhcHBsaWNhdGlvbiBjb21wb25lbnQgbXVzdCBoYXZlIHRoZSBwcmltYXJ5IGFuZCBhdXggb3V0bGV0cyBkZWZpbmVkLlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgIHBhdGg6ICdwYXJlbnQvOmlkJyxcbiAqICAgIGNoaWxkcmVuOiBbXG4gKiAgICAgIHsgcGF0aDogJ2EnLCBjb21wb25lbnQ6IE1haW5DaGlsZCB9LFxuICogICAgICB7IHBhdGg6ICdiJywgY29tcG9uZW50OiBBdXhDaGlsZCwgb3V0bGV0OiAnYXV4JyB9XG4gKiAgICBdXG4gKiB9XVxuICogYGBgXG4gKlxuICogVGhlIHJvdXRlciBtZXJnZXMgdGhlIHBhcmFtZXRlcnMsIGRhdGEsIGFuZCByZXNvbHZlIG9mIHRoZSBjb21wb25lbnRsZXNzXG4gKiBwYXJlbnQgaW50byB0aGUgcGFyYW1ldGVycywgZGF0YSwgYW5kIHJlc29sdmUgb2YgdGhlIGNoaWxkcmVuLlxuICpcbiAqIFRoaXMgaXMgZXNwZWNpYWxseSB1c2VmdWwgd2hlbiBjaGlsZCBjb21wb25lbnRzIGFyZSBkZWZpbmVkXG4gKiB3aXRoIGFuIGVtcHR5IHBhdGggc3RyaW5nLCBhcyBpbiB0aGUgZm9sbG93aW5nIGV4YW1wbGUuXG4gKiBXaXRoIHRoaXMgY29uZmlndXJhdGlvbiwgbmF2aWdhdGluZyB0byAnL3BhcmVudC8xMCcgY3JlYXRlc1xuICogdGhlIG1haW4gY2hpbGQgYW5kIGF1eCBjb21wb25lbnRzLlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgIHBhdGg6ICdwYXJlbnQvOmlkJyxcbiAqICAgIGNoaWxkcmVuOiBbXG4gKiAgICAgIHsgcGF0aDogJycsIGNvbXBvbmVudDogTWFpbkNoaWxkIH0sXG4gKiAgICAgIHsgcGF0aDogJycsIGNvbXBvbmVudDogQXV4Q2hpbGQsIG91dGxldDogJ2F1eCcgfVxuICogICAgXVxuICogfV1cbiAqIGBgYFxuICpcbiAqICMjIyBMYXp5IExvYWRpbmdcbiAqXG4gKiBMYXp5IGxvYWRpbmcgc3BlZWRzIHVwIGFwcGxpY2F0aW9uIGxvYWQgdGltZSBieSBzcGxpdHRpbmcgdGhlIGFwcGxpY2F0aW9uXG4gKiBpbnRvIG11bHRpcGxlIGJ1bmRsZXMgYW5kIGxvYWRpbmcgdGhlbSBvbiBkZW1hbmQuXG4gKiBUbyB1c2UgbGF6eSBsb2FkaW5nLCBwcm92aWRlIHRoZSBgbG9hZENoaWxkcmVuYCBwcm9wZXJ0eSAgaW5zdGVhZCBvZiB0aGUgYGNoaWxkcmVuYCBwcm9wZXJ0eS5cbiAqXG4gKiBHaXZlbiB0aGUgZm9sbG93aW5nIGV4YW1wbGUgcm91dGUsIHRoZSByb3V0ZXIgdXNlcyB0aGUgcmVnaXN0ZXJlZFxuICogYE5nTW9kdWxlRmFjdG9yeUxvYWRlcmAgdG8gZmV0Y2ggYW4gTmdNb2R1bGUgYXNzb2NpYXRlZCB3aXRoICd0ZWFtJy5cbiAqIEl0IHRoZW4gZXh0cmFjdHMgdGhlIHNldCBvZiByb3V0ZXMgZGVmaW5lZCBpbiB0aGF0IE5nTW9kdWxlLFxuICogYW5kIHRyYW5zcGFyZW50bHkgYWRkcyB0aG9zZSByb3V0ZXMgdG8gdGhlIG1haW4gY29uZmlndXJhdGlvbi5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgIGNvbXBvbmVudDogVGVhbSxcbiAqICAgbG9hZENoaWxkcmVuOiAndGVhbSdcbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm91dGUge1xuICAvKipcbiAgICogVGhlIHBhdGggdG8gbWF0Y2ggYWdhaW5zdCwgYSBVUkwgc3RyaW5nIHRoYXQgdXNlcyByb3V0ZXIgbWF0Y2hpbmcgbm90YXRpb24uXG4gICAqIENhbiBiZSBhIHdpbGQgY2FyZCAoYCoqYCkgdGhhdCBtYXRjaGVzIGFueSBVUkwgKHNlZSBVc2FnZSBOb3RlcyBiZWxvdykuXG4gICAqIERlZmF1bHQgaXMgXCIvXCIgKHRoZSByb290IHBhdGgpLlxuICAgKi9cbiAgcGF0aD86IHN0cmluZztcbiAgLyoqXG4gICAqIFRoZSBwYXRoLW1hdGNoaW5nIHN0cmF0ZWd5LCBvbmUgb2YgJ3ByZWZpeCcgb3IgJ2Z1bGwnLlxuICAgKiBEZWZhdWx0IGlzICdwcmVmaXgnLlxuICAgKlxuICAgKiBCeSBkZWZhdWx0LCB0aGUgcm91dGVyIGNoZWNrcyBVUkwgZWxlbWVudHMgZnJvbSB0aGUgbGVmdCB0byBzZWUgaWYgdGhlIFVSTFxuICAgKiBtYXRjaGVzIGEgZ2l2ZW4gIHBhdGgsIGFuZCBzdG9wcyB3aGVuIHRoZXJlIGlzIGEgbWF0Y2guIEZvciBleGFtcGxlLFxuICAgKiAnL3RlYW0vMTEvdXNlcicgbWF0Y2hlcyAndGVhbS86aWQnLlxuICAgKlxuICAgKiBUaGUgcGF0aC1tYXRjaCBzdHJhdGVneSAnZnVsbCcgbWF0Y2hlcyBhZ2FpbnN0IHRoZSBlbnRpcmUgVVJMLlxuICAgKiBJdCBpcyBpbXBvcnRhbnQgdG8gZG8gdGhpcyB3aGVuIHJlZGlyZWN0aW5nIGVtcHR5LXBhdGggcm91dGVzLlxuICAgKiBPdGhlcndpc2UsIGJlY2F1c2UgYW4gZW1wdHkgcGF0aCBpcyBhIHByZWZpeCBvZiBhbnkgVVJMLFxuICAgKiB0aGUgcm91dGVyIHdvdWxkIGFwcGx5IHRoZSByZWRpcmVjdCBldmVuIHdoZW4gbmF2aWdhdGluZ1xuICAgKiB0byB0aGUgcmVkaXJlY3QgZGVzdGluYXRpb24sIGNyZWF0aW5nIGFuIGVuZGxlc3MgbG9vcC5cbiAgICpcbiAgICovXG4gIHBhdGhNYXRjaD86IHN0cmluZztcbiAgLyoqXG4gICAqIEEgVVJMLW1hdGNoaW5nIGZ1bmN0aW9uIHRvIHVzZSBhcyBhIGN1c3RvbSBzdHJhdGVneSBmb3IgcGF0aCBtYXRjaGluZy5cbiAgICogSWYgcHJlc2VudCwgc3VwZXJzZWRlcyBgcGF0aGAgYW5kIGBwYXRoTWF0Y2hgLlxuICAgKi9cbiAgbWF0Y2hlcj86IFVybE1hdGNoZXI7XG4gIC8qKlxuICAgKiBUaGUgY29tcG9uZW50IHRvIGluc3RhbnRpYXRlIHdoZW4gdGhlIHBhdGggbWF0Y2hlcy5cbiAgICogQ2FuIGJlIGVtcHR5IGlmIGNoaWxkIHJvdXRlcyBzcGVjaWZ5IGNvbXBvbmVudHMuXG4gICAqL1xuICBjb21wb25lbnQ/OiBUeXBlPGFueT47XG4gIC8qKlxuICAgKiBBIFVSTCB0byB3aGljaCB0byByZWRpcmVjdCB3aGVuIGEgdGhlIHBhdGggbWF0Y2hlcy5cbiAgICogQWJzb2x1dGUgaWYgdGhlIFVSTCBiZWdpbnMgd2l0aCBhIHNsYXNoICgvKSwgb3RoZXJ3aXNlIHJlbGF0aXZlIHRvIHRoZSBwYXRoIFVSTC5cbiAgICogV2hlbiBub3QgcHJlc2VudCwgcm91dGVyIGRvZXMgbm90IHJlZGlyZWN0LlxuICAgKi9cbiAgcmVkaXJlY3RUbz86IHN0cmluZztcbiAgLyoqXG4gICAqIE5hbWUgb2YgYSBgUm91dGVyT3V0bGV0YCBvYmplY3Qgd2hlcmUgdGhlIGNvbXBvbmVudCBjYW4gYmUgcGxhY2VkXG4gICAqIHdoZW4gdGhlIHBhdGggbWF0Y2hlcy5cbiAgICovXG4gIG91dGxldD86IHN0cmluZztcbiAgLyoqXG4gICAqIEFuIGFycmF5IG9mIGRlcGVuZGVuY3ktaW5qZWN0aW9uIHRva2VucyB1c2VkIHRvIGxvb2sgdXAgYENhbkFjdGl2YXRlKClgXG4gICAqIGhhbmRsZXJzLCBpbiBvcmRlciB0byBkZXRlcm1pbmUgaWYgdGhlIGN1cnJlbnQgdXNlciBpcyBhbGxvd2VkIHRvXG4gICAqIGFjdGl2YXRlIHRoZSBjb21wb25lbnQuIEJ5IGRlZmF1bHQsIGFueSB1c2VyIGNhbiBhY3RpdmF0ZS5cbiAgICovXG4gIGNhbkFjdGl2YXRlPzogYW55W107XG4gIC8qKlxuICAgKiBBbiBhcnJheSBvZiBESSB0b2tlbnMgdXNlZCB0byBsb29rIHVwIGBDYW5BY3RpdmF0ZUNoaWxkKClgIGhhbmRsZXJzLFxuICAgKiBpbiBvcmRlciB0byBkZXRlcm1pbmUgaWYgdGhlIGN1cnJlbnQgdXNlciBpcyBhbGxvd2VkIHRvIGFjdGl2YXRlXG4gICAqIGEgY2hpbGQgb2YgdGhlIGNvbXBvbmVudC4gQnkgZGVmYXVsdCwgYW55IHVzZXIgY2FuIGFjdGl2YXRlIGEgY2hpbGQuXG4gICAqL1xuICBjYW5BY3RpdmF0ZUNoaWxkPzogYW55W107XG4gIC8qKlxuICAgKiBBbiBhcnJheSBvZiBESSB0b2tlbnMgdXNlZCB0byBsb29rIHVwIGBDYW5EZWFjdGl2YXRlKClgXG4gICAqIGhhbmRsZXJzLCBpbiBvcmRlciB0byBkZXRlcm1pbmUgaWYgdGhlIGN1cnJlbnQgdXNlciBpcyBhbGxvd2VkIHRvXG4gICAqIGRlYWN0aXZhdGUgdGhlIGNvbXBvbmVudC4gQnkgZGVmYXVsdCwgYW55IHVzZXIgY2FuIGRlYWN0aXZhdGUuXG4gICAqXG4gICAqL1xuICBjYW5EZWFjdGl2YXRlPzogYW55W107XG4gIC8qKlxuICAgKiBBbiBhcnJheSBvZiBESSB0b2tlbnMgdXNlZCB0byBsb29rIHVwIGBDYW5Mb2FkKClgXG4gICAqIGhhbmRsZXJzLCBpbiBvcmRlciB0byBkZXRlcm1pbmUgaWYgdGhlIGN1cnJlbnQgdXNlciBpcyBhbGxvd2VkIHRvXG4gICAqIGxvYWQgdGhlIGNvbXBvbmVudC4gQnkgZGVmYXVsdCwgYW55IHVzZXIgY2FuIGxvYWQuXG4gICAqL1xuICBjYW5Mb2FkPzogYW55W107XG4gIC8qKlxuICAgKiBBZGRpdGlvbmFsIGRldmVsb3Blci1kZWZpbmVkIGRhdGEgcHJvdmlkZWQgdG8gdGhlIGNvbXBvbmVudCB2aWFcbiAgICogYEFjdGl2YXRlZFJvdXRlYC4gQnkgZGVmYXVsdCwgbm8gYWRkaXRpb25hbCBkYXRhIGlzIHBhc3NlZC5cbiAgICovXG4gIGRhdGE/OiBEYXRhO1xuICAvKipcbiAgICogQSBtYXAgb2YgREkgdG9rZW5zIHVzZWQgdG8gbG9vayB1cCBkYXRhIHJlc29sdmVycy4gU2VlIGBSZXNvbHZlYC5cbiAgICovXG4gIHJlc29sdmU/OiBSZXNvbHZlRGF0YTtcbiAgLyoqXG4gICAqIEFuIGFycmF5IG9mIGNoaWxkIGBSb3V0ZWAgb2JqZWN0cyB0aGF0IHNwZWNpZmllcyBhIG5lc3RlZCByb3V0ZVxuICAgKiBjb25maWd1cmF0aW9uLlxuICAgKi9cbiAgY2hpbGRyZW4/OiBSb3V0ZXM7XG4gIC8qKlxuICAgKiBBIGBMb2FkQ2hpbGRyZW5gIG9iamVjdCBzcGVjaWZ5aW5nIGxhenktbG9hZGVkIGNoaWxkIHJvdXRlcy5cbiAgICovXG4gIGxvYWRDaGlsZHJlbj86IExvYWRDaGlsZHJlbjtcbiAgLyoqXG4gICAqIERlZmluZXMgd2hlbiBndWFyZHMgYW5kIHJlc29sdmVycyB3aWxsIGJlIHJ1bi4gT25lIG9mXG4gICAqIC0gYHBhcmFtc09yUXVlcnlQYXJhbXNDaGFuZ2VgIDogUnVuIHdoZW4gcXVlcnkgcGFyYW1ldGVycyBjaGFuZ2UuXG4gICAqIC0gYGFsd2F5c2AgOiBSdW4gb24gZXZlcnkgZXhlY3V0aW9uLlxuICAgKiBCeSBkZWZhdWx0LCBndWFyZHMgYW5kIHJlc29sdmVycyBydW4gb25seSB3aGVuIHRoZSBtYXRyaXhcbiAgICogcGFyYW1ldGVycyBvZiB0aGUgcm91dGUgY2hhbmdlLlxuICAgKi9cbiAgcnVuR3VhcmRzQW5kUmVzb2x2ZXJzPzogUnVuR3VhcmRzQW5kUmVzb2x2ZXJzO1xuICAvKipcbiAgICogRmlsbGVkIGZvciByb3V0ZXMgd2l0aCBgbG9hZENoaWxkcmVuYCBvbmNlIHRoZSBtb2R1bGUgaGFzIGJlZW4gbG9hZGVkXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgX2xvYWRlZENvbmZpZz86IExvYWRlZFJvdXRlckNvbmZpZztcbn1cblxuZXhwb3J0IGNsYXNzIExvYWRlZFJvdXRlckNvbmZpZyB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByb3V0ZXM6IFJvdXRlW10sIHB1YmxpYyBtb2R1bGU6IE5nTW9kdWxlUmVmPGFueT4pIHt9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbmZpZyhjb25maWc6IFJvdXRlcywgcGFyZW50UGF0aDogc3RyaW5nID0gJycpOiB2b2lkIHtcbiAgLy8gZm9yRWFjaCBkb2Vzbid0IGl0ZXJhdGUgdW5kZWZpbmVkIHZhbHVlc1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbmZpZy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHJvdXRlOiBSb3V0ZSA9IGNvbmZpZ1tpXTtcbiAgICBjb25zdCBmdWxsUGF0aDogc3RyaW5nID0gZ2V0RnVsbFBhdGgocGFyZW50UGF0aCwgcm91dGUpO1xuICAgIHZhbGlkYXRlTm9kZShyb3V0ZSwgZnVsbFBhdGgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlTm9kZShyb3V0ZTogUm91dGUsIGZ1bGxQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKCFyb3V0ZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgXG4gICAgICBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogRW5jb3VudGVyZWQgdW5kZWZpbmVkIHJvdXRlLlxuICAgICAgVGhlIHJlYXNvbiBtaWdodCBiZSBhbiBleHRyYSBjb21tYS5cblxuICAgICAgRXhhbXBsZTpcbiAgICAgIGNvbnN0IHJvdXRlczogUm91dGVzID0gW1xuICAgICAgICB7IHBhdGg6ICcnLCByZWRpcmVjdFRvOiAnL2Rhc2hib2FyZCcsIHBhdGhNYXRjaDogJ2Z1bGwnIH0sXG4gICAgICAgIHsgcGF0aDogJ2Rhc2hib2FyZCcsICBjb21wb25lbnQ6IERhc2hib2FyZENvbXBvbmVudCB9LCwgPDwgdHdvIGNvbW1hc1xuICAgICAgICB7IHBhdGg6ICdkZXRhaWwvOmlkJywgY29tcG9uZW50OiBIZXJvRGV0YWlsQ29tcG9uZW50IH1cbiAgICAgIF07XG4gICAgYCk7XG4gIH1cbiAgaWYgKEFycmF5LmlzQXJyYXkocm91dGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogQXJyYXkgY2Fubm90IGJlIHNwZWNpZmllZGApO1xuICB9XG4gIGlmICghcm91dGUuY29tcG9uZW50ICYmICFyb3V0ZS5jaGlsZHJlbiAmJiAhcm91dGUubG9hZENoaWxkcmVuICYmXG4gICAgICAocm91dGUub3V0bGV0ICYmIHJvdXRlLm91dGxldCAhPT0gUFJJTUFSWV9PVVRMRVQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IGEgY29tcG9uZW50bGVzcyByb3V0ZSB3aXRob3V0IGNoaWxkcmVuIG9yIGxvYWRDaGlsZHJlbiBjYW5ub3QgaGF2ZSBhIG5hbWVkIG91dGxldCBzZXRgKTtcbiAgfVxuICBpZiAocm91dGUucmVkaXJlY3RUbyAmJiByb3V0ZS5jaGlsZHJlbikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiByZWRpcmVjdFRvIGFuZCBjaGlsZHJlbiBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmApO1xuICB9XG4gIGlmIChyb3V0ZS5yZWRpcmVjdFRvICYmIHJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiByZWRpcmVjdFRvIGFuZCBsb2FkQ2hpbGRyZW4gY2Fubm90IGJlIHVzZWQgdG9nZXRoZXJgKTtcbiAgfVxuICBpZiAocm91dGUuY2hpbGRyZW4gJiYgcm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IGNoaWxkcmVuIGFuZCBsb2FkQ2hpbGRyZW4gY2Fubm90IGJlIHVzZWQgdG9nZXRoZXJgKTtcbiAgfVxuICBpZiAocm91dGUucmVkaXJlY3RUbyAmJiByb3V0ZS5jb21wb25lbnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogcmVkaXJlY3RUbyBhbmQgY29tcG9uZW50IGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gIH1cbiAgaWYgKHJvdXRlLnBhdGggJiYgcm91dGUubWF0Y2hlcikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBwYXRoIGFuZCBtYXRjaGVyIGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gIH1cbiAgaWYgKHJvdXRlLnJlZGlyZWN0VG8gPT09IHZvaWQgMCAmJiAhcm91dGUuY29tcG9uZW50ICYmICFyb3V0ZS5jaGlsZHJlbiAmJiAhcm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofScuIE9uZSBvZiB0aGUgZm9sbG93aW5nIG11c3QgYmUgcHJvdmlkZWQ6IGNvbXBvbmVudCwgcmVkaXJlY3RUbywgY2hpbGRyZW4gb3IgbG9hZENoaWxkcmVuYCk7XG4gIH1cbiAgaWYgKHJvdXRlLnBhdGggPT09IHZvaWQgMCAmJiByb3V0ZS5tYXRjaGVyID09PSB2b2lkIDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9Jzogcm91dGVzIG11c3QgaGF2ZSBlaXRoZXIgYSBwYXRoIG9yIGEgbWF0Y2hlciBzcGVjaWZpZWRgKTtcbiAgfVxuICBpZiAodHlwZW9mIHJvdXRlLnBhdGggPT09ICdzdHJpbmcnICYmIHJvdXRlLnBhdGguY2hhckF0KDApID09PSAnLycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBwYXRoIGNhbm5vdCBzdGFydCB3aXRoIGEgc2xhc2hgKTtcbiAgfVxuICBpZiAocm91dGUucGF0aCA9PT0gJycgJiYgcm91dGUucmVkaXJlY3RUbyAhPT0gdm9pZCAwICYmIHJvdXRlLnBhdGhNYXRjaCA9PT0gdm9pZCAwKSB7XG4gICAgY29uc3QgZXhwID1cbiAgICAgICAgYFRoZSBkZWZhdWx0IHZhbHVlIG9mICdwYXRoTWF0Y2gnIGlzICdwcmVmaXgnLCBidXQgb2Z0ZW4gdGhlIGludGVudCBpcyB0byB1c2UgJ2Z1bGwnLmA7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICd7cGF0aDogXCIke2Z1bGxQYXRofVwiLCByZWRpcmVjdFRvOiBcIiR7cm91dGUucmVkaXJlY3RUb31cIn0nOiBwbGVhc2UgcHJvdmlkZSAncGF0aE1hdGNoJy4gJHtleHB9YCk7XG4gIH1cbiAgaWYgKHJvdXRlLnBhdGhNYXRjaCAhPT0gdm9pZCAwICYmIHJvdXRlLnBhdGhNYXRjaCAhPT0gJ2Z1bGwnICYmIHJvdXRlLnBhdGhNYXRjaCAhPT0gJ3ByZWZpeCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogcGF0aE1hdGNoIGNhbiBvbmx5IGJlIHNldCB0byAncHJlZml4JyBvciAnZnVsbCdgKTtcbiAgfVxuICBpZiAocm91dGUuY2hpbGRyZW4pIHtcbiAgICB2YWxpZGF0ZUNvbmZpZyhyb3V0ZS5jaGlsZHJlbiwgZnVsbFBhdGgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEZ1bGxQYXRoKHBhcmVudFBhdGg6IHN0cmluZywgY3VycmVudFJvdXRlOiBSb3V0ZSk6IHN0cmluZyB7XG4gIGlmICghY3VycmVudFJvdXRlKSB7XG4gICAgcmV0dXJuIHBhcmVudFBhdGg7XG4gIH1cbiAgaWYgKCFwYXJlbnRQYXRoICYmICFjdXJyZW50Um91dGUucGF0aCkge1xuICAgIHJldHVybiAnJztcbiAgfSBlbHNlIGlmIChwYXJlbnRQYXRoICYmICFjdXJyZW50Um91dGUucGF0aCkge1xuICAgIHJldHVybiBgJHtwYXJlbnRQYXRofS9gO1xuICB9IGVsc2UgaWYgKCFwYXJlbnRQYXRoICYmIGN1cnJlbnRSb3V0ZS5wYXRoKSB7XG4gICAgcmV0dXJuIGN1cnJlbnRSb3V0ZS5wYXRoO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBgJHtwYXJlbnRQYXRofS8ke2N1cnJlbnRSb3V0ZS5wYXRofWA7XG4gIH1cbn1cblxuLyoqXG4gKiBNYWtlcyBhIGNvcHkgb2YgdGhlIGNvbmZpZyBhbmQgYWRkcyBhbnkgZGVmYXVsdCByZXF1aXJlZCBwcm9wZXJ0aWVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RhbmRhcmRpemVDb25maWcocjogUm91dGUpOiBSb3V0ZSB7XG4gIGNvbnN0IGNoaWxkcmVuID0gci5jaGlsZHJlbiAmJiByLmNoaWxkcmVuLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gIGNvbnN0IGMgPSBjaGlsZHJlbiA/IHsuLi5yLCBjaGlsZHJlbn0gOiB7Li4ucn07XG4gIGlmICghYy5jb21wb25lbnQgJiYgKGNoaWxkcmVuIHx8IGMubG9hZENoaWxkcmVuKSAmJiAoYy5vdXRsZXQgJiYgYy5vdXRsZXQgIT09IFBSSU1BUllfT1VUTEVUKSkge1xuICAgIGMuY29tcG9uZW50ID0gRW1wdHlPdXRsZXRDb21wb25lbnQ7XG4gIH1cbiAgcmV0dXJuIGM7XG59XG4iXX0=