/**
 * @fileoverview added by tsickle
 * Generated from: packages/router/src/config.ts
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
    const c = children ? Object.assign(Object.assign({}, r), { children }) : Object.assign({}, r);
    if (!c.component && (children || c.loadChildren) && (c.outlet && c.outlet !== PRIMARY_OUTLET)) {
        c.component = EmptyOutletComponent;
    }
    return c;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBV0EsT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFFL0QsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBc1h4QywyQkFxR0M7Ozs7Ozs7Ozs7SUE3RkMscUJBQWM7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBZ0JkLDBCQUFtQjs7Ozs7SUFJbkIsd0JBQXFCOzs7Ozs7SUFLckIsMEJBQXNCOzs7Ozs7O0lBTXRCLDJCQUFvQjs7Ozs7O0lBS3BCLHVCQUFnQjs7Ozs7OztJQU1oQiw0QkFBb0I7Ozs7Ozs7SUFNcEIsaUNBQXlCOzs7Ozs7OztJQU96Qiw4QkFBc0I7Ozs7Ozs7SUFNdEIsd0JBQWdCOzs7Ozs7SUFLaEIscUJBQVk7Ozs7O0lBSVosd0JBQXNCOzs7Ozs7SUFLdEIseUJBQWtCOzs7OztJQUlsQiw2QkFBNEI7Ozs7Ozs7OztJQVE1QixzQ0FBOEM7Ozs7OztJQUs5Qyw4QkFBbUM7O0FBR3JDLE1BQU0sT0FBTyxrQkFBa0I7Ozs7O0lBQzdCLFlBQW1CLE1BQWUsRUFBUyxNQUF3QjtRQUFoRCxXQUFNLEdBQU4sTUFBTSxDQUFTO1FBQVMsV0FBTSxHQUFOLE1BQU0sQ0FBa0I7SUFBRyxDQUFDO0NBQ3hFOzs7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VUFBVSxpQkFBaUIsQ0FBQyxDQUFROztVQUNsQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQzs7VUFDMUQsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLGlDQUFLLENBQUMsS0FBRSxRQUFRLElBQUUsQ0FBQyxtQkFBSyxDQUFDLENBQUM7SUFDOUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLGNBQWMsQ0FBQyxFQUFFO1FBQzdGLENBQUMsQ0FBQyxTQUFTLEdBQUcsb0JBQW9CLENBQUM7S0FDcEM7SUFDRCxPQUFPLENBQUMsQ0FBQztBQUNYLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TmdNb2R1bGVGYWN0b3J5LCBOZ01vZHVsZVJlZiwgVHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge09ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge0VtcHR5T3V0bGV0Q29tcG9uZW50fSBmcm9tICcuL2NvbXBvbmVudHMvZW1wdHlfb3V0bGV0JztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGVTbmFwc2hvdH0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQUklNQVJZX09VVExFVH0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtVcmxTZWdtZW50LCBVcmxTZWdtZW50R3JvdXB9IGZyb20gJy4vdXJsX3RyZWUnO1xuXG5cbi8qKlxuICogUmVwcmVzZW50cyBhIHJvdXRlIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBSb3V0ZXIgc2VydmljZS5cbiAqIEFuIGFycmF5IG9mIGBSb3V0ZWAgb2JqZWN0cywgdXNlZCBpbiBgUm91dGVyLmNvbmZpZ2AgYW5kIGZvciBuZXN0ZWQgcm91dGUgY29uZmlndXJhdGlvbnNcbiAqIGluIGBSb3V0ZS5jaGlsZHJlbmAuXG4gKlxuICogQHNlZSBgUm91dGVgXG4gKiBAc2VlIGBSb3V0ZXJgXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIFJvdXRlcyA9IFJvdXRlW107XG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgcmVzdWx0IG9mIG1hdGNoaW5nIFVSTHMgd2l0aCBhIGN1c3RvbSBtYXRjaGluZyBmdW5jdGlvbi5cbiAqXG4gKiAqIGBjb25zdW1lZGAgaXMgYW4gYXJyYXkgb2YgdGhlIGNvbnN1bWVkIFVSTCBzZWdtZW50cy5cbiAqICogYHBvc1BhcmFtc2AgaXMgYSBtYXAgb2YgcG9zaXRpb25hbCBwYXJhbWV0ZXJzLlxuICpcbiAqIEBzZWUgYFVybE1hdGNoZXIoKWBcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgVXJsTWF0Y2hSZXN1bHQgPSB7XG4gIGNvbnN1bWVkOiBVcmxTZWdtZW50W107XG4gIHBvc1BhcmFtcz86IHtbbmFtZTogc3RyaW5nXTogVXJsU2VnbWVudH07XG59O1xuXG4vKipcbiAqIEEgZnVuY3Rpb24gZm9yIG1hdGNoaW5nIGEgcm91dGUgYWdhaW5zdCBVUkxzLiBJbXBsZW1lbnQgYSBjdXN0b20gVVJMIG1hdGNoZXJcbiAqIGZvciBgUm91dGUubWF0Y2hlcmAgd2hlbiBhIGNvbWJpbmF0aW9uIG9mIGBwYXRoYCBhbmQgYHBhdGhNYXRjaGBcbiAqIGlzIG5vdCBleHByZXNzaXZlIGVub3VnaC4gQ2Fubm90IGJlIHVzZWQgdG9nZXRoZXIgd2l0aCBgcGF0aGAgYW5kIGBwYXRoTWF0Y2hgLlxuICpcbiAqIEBwYXJhbSBzZWdtZW50cyBBbiBhcnJheSBvZiBVUkwgc2VnbWVudHMuXG4gKiBAcGFyYW0gZ3JvdXAgQSBzZWdtZW50IGdyb3VwLlxuICogQHBhcmFtIHJvdXRlIFRoZSByb3V0ZSB0byBtYXRjaCBhZ2FpbnN0LlxuICogQHJldHVybnMgVGhlIG1hdGNoLXJlc3VsdC5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIFRoZSBmb2xsb3dpbmcgbWF0Y2hlciBtYXRjaGVzIEhUTUwgZmlsZXMuXG4gKlxuICogYGBgXG4gKiBleHBvcnQgZnVuY3Rpb24gaHRtbEZpbGVzKHVybDogVXJsU2VnbWVudFtdKSB7XG4gKiAgIHJldHVybiB1cmwubGVuZ3RoID09PSAxICYmIHVybFswXS5wYXRoLmVuZHNXaXRoKCcuaHRtbCcpID8gKHtjb25zdW1lZDogdXJsfSkgOiBudWxsO1xuICogfVxuICpcbiAqIGV4cG9ydCBjb25zdCByb3V0ZXMgPSBbeyBtYXRjaGVyOiBodG1sRmlsZXMsIGNvbXBvbmVudDogQW55Q29tcG9uZW50IH1dO1xuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBVcmxNYXRjaGVyID0gKHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIGdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlOiBSb3V0ZSkgPT5cbiAgICBVcmxNYXRjaFJlc3VsdHxudWxsO1xuXG4vKipcbiAqXG4gKiBSZXByZXNlbnRzIHN0YXRpYyBkYXRhIGFzc29jaWF0ZWQgd2l0aCBhIHBhcnRpY3VsYXIgcm91dGUuXG4gKlxuICogQHNlZSBgUm91dGUjZGF0YWBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIERhdGEgPSB7XG4gIFtuYW1lOiBzdHJpbmddOiBhbnlcbn07XG5cbi8qKlxuICpcbiAqIFJlcHJlc2VudHMgdGhlIHJlc29sdmVkIGRhdGEgYXNzb2NpYXRlZCB3aXRoIGEgcGFydGljdWxhciByb3V0ZS5cbiAqXG4gKiBAc2VlIGBSb3V0ZSNyZXNvbHZlYC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIFJlc29sdmVEYXRhID0ge1xuICBbbmFtZTogc3RyaW5nXTogYW55XG59O1xuXG4vKipcbiAqXG4gKiBBIGZ1bmN0aW9uIHRoYXQgaXMgY2FsbGVkIHRvIHJlc29sdmUgYSBjb2xsZWN0aW9uIG9mIGxhenktbG9hZGVkIHJvdXRlcy5cbiAqXG4gKiBPZnRlbiB0aGlzIGZ1bmN0aW9uIHdpbGwgYmUgaW1wbGVtZW50ZWQgdXNpbmcgYW4gRVMgZHluYW1pYyBgaW1wb3J0KClgIGV4cHJlc3Npb24uIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJ2xhenknLFxuICogICBsb2FkQ2hpbGRyZW46ICgpID0+IGltcG9ydCgnLi9sYXp5LXJvdXRlL2xhenkubW9kdWxlJykudGhlbihtb2QgPT4gbW9kLkxhenlNb2R1bGUpLFxuICogfV07XG4gKiBgYGBcbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIF9tdXN0XyBtYXRjaCB0aGUgZm9ybSBhYm92ZTogYW4gYXJyb3cgZnVuY3Rpb24gb2YgdGhlIGZvcm1cbiAqIGAoKSA9PiBpbXBvcnQoJy4uLicpLnRoZW4obW9kID0+IG1vZC5NT0RVTEUpYC5cbiAqXG4gKiBAc2VlIGBSb3V0ZSNsb2FkQ2hpbGRyZW5gLlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBMb2FkQ2hpbGRyZW5DYWxsYmFjayA9ICgpID0+IFR5cGU8YW55PnxOZ01vZHVsZUZhY3Rvcnk8YW55PnxPYnNlcnZhYmxlPFR5cGU8YW55Pj58XG4gICAgUHJvbWlzZTxOZ01vZHVsZUZhY3Rvcnk8YW55PnxUeXBlPGFueT58YW55PjtcblxuLyoqXG4gKlxuICogQSBzdHJpbmcgb2YgdGhlIGZvcm0gYHBhdGgvdG8vZmlsZSNleHBvcnROYW1lYCB0aGF0IGFjdHMgYXMgYSBVUkwgZm9yIGEgc2V0IG9mIHJvdXRlcyB0byBsb2FkLFxuICogb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgc3VjaCBhIHNldC5cbiAqXG4gKiBUaGUgc3RyaW5nIGZvcm0gb2YgYExvYWRDaGlsZHJlbmAgaXMgZGVwcmVjYXRlZCAoc2VlIGBEZXByZWNhdGVkTG9hZENoaWxkcmVuYCkuIFRoZSBmdW5jdGlvblxuICogZm9ybSAoYExvYWRDaGlsZHJlbkNhbGxiYWNrYCkgc2hvdWxkIGJlIHVzZWQgaW5zdGVhZC5cbiAqXG4gKiBAc2VlIGBSb3V0ZSNsb2FkQ2hpbGRyZW5gLlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBMb2FkQ2hpbGRyZW4gPSBMb2FkQ2hpbGRyZW5DYWxsYmFja3xEZXByZWNhdGVkTG9hZENoaWxkcmVuO1xuXG4vKipcbiAqIEEgc3RyaW5nIG9mIHRoZSBmb3JtIGBwYXRoL3RvL2ZpbGUjZXhwb3J0TmFtZWAgdGhhdCBhY3RzIGFzIGEgVVJMIGZvciBhIHNldCBvZiByb3V0ZXMgdG8gbG9hZC5cbiAqXG4gKiBAc2VlIGBSb3V0ZSNsb2FkQ2hpbGRyZW5gXG4gKiBAcHVibGljQXBpXG4gKiBAZGVwcmVjYXRlZCB0aGUgYHN0cmluZ2AgZm9ybSBvZiBgbG9hZENoaWxkcmVuYCBpcyBkZXByZWNhdGVkIGluIGZhdm9yIG9mIHRoZSBwcm9wb3NlZCBFUyBkeW5hbWljXG4gKiBgaW1wb3J0KClgIGV4cHJlc3Npb24sIHdoaWNoIG9mZmVycyBhIG1vcmUgbmF0dXJhbCBhbmQgc3RhbmRhcmRzLWJhc2VkIG1lY2hhbmlzbSB0byBkeW5hbWljYWxseVxuICogbG9hZCBhbiBFUyBtb2R1bGUgYXQgcnVudGltZS5cbiAqL1xuZXhwb3J0IHR5cGUgRGVwcmVjYXRlZExvYWRDaGlsZHJlbiA9IHN0cmluZztcblxuLyoqXG4gKlxuICogSG93IHRvIGhhbmRsZSBxdWVyeSBwYXJhbWV0ZXJzIGluIGEgcm91dGVyIGxpbmsuXG4gKiBPbmUgb2Y6XG4gKiAtIGBtZXJnZWAgOiBNZXJnZSBuZXcgd2l0aCBjdXJyZW50IHBhcmFtZXRlcnMuXG4gKiAtIGBwcmVzZXJ2ZWAgOiBQcmVzZXJ2ZSBjdXJyZW50IHBhcmFtZXRlcnMuXG4gKlxuICogQHNlZSBgTmF2aWdhdGlvbkV4dHJhcyNxdWVyeVBhcmFtc0hhbmRsaW5nYFxuICogQHNlZSBgUm91dGVyTGlua2BcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgUXVlcnlQYXJhbXNIYW5kbGluZyA9ICdtZXJnZSd8J3ByZXNlcnZlJ3wnJztcblxuLyoqXG4gKlxuICogQSBwb2xpY3kgZm9yIHdoZW4gdG8gcnVuIGd1YXJkcyBhbmQgcmVzb2x2ZXJzIG9uIGEgcm91dGUuXG4gKlxuICogQHNlZSBgUm91dGUjcnVuR3VhcmRzQW5kUmVzb2x2ZXJzYFxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBSdW5HdWFyZHNBbmRSZXNvbHZlcnMgPVxuICAgICdwYXRoUGFyYW1zQ2hhbmdlJ3wncGF0aFBhcmFtc09yUXVlcnlQYXJhbXNDaGFuZ2UnfCdwYXJhbXNDaGFuZ2UnfCdwYXJhbXNPclF1ZXJ5UGFyYW1zQ2hhbmdlJ3xcbiAgICAnYWx3YXlzJ3woKGZyb206IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIHRvOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSA9PiBib29sZWFuKTtcblxuLyoqXG4gKiBBIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHRoYXQgZGVmaW5lcyBhIHNpbmdsZSByb3V0ZS5cbiAqIEEgc2V0IG9mIHJvdXRlcyBhcmUgY29sbGVjdGVkIGluIGEgYFJvdXRlc2AgYXJyYXkgdG8gZGVmaW5lIGEgYFJvdXRlcmAgY29uZmlndXJhdGlvbi5cbiAqIFRoZSByb3V0ZXIgYXR0ZW1wdHMgdG8gbWF0Y2ggc2VnbWVudHMgb2YgYSBnaXZlbiBVUkwgYWdhaW5zdCBlYWNoIHJvdXRlLFxuICogdXNpbmcgdGhlIGNvbmZpZ3VyYXRpb24gb3B0aW9ucyBkZWZpbmVkIGluIHRoaXMgb2JqZWN0LlxuICpcbiAqIFN1cHBvcnRzIHN0YXRpYywgcGFyYW1ldGVyaXplZCwgcmVkaXJlY3QsIGFuZCB3aWxkY2FyZCByb3V0ZXMsIGFzIHdlbGwgYXNcbiAqIGN1c3RvbSByb3V0ZSBkYXRhIGFuZCByZXNvbHZlIG1ldGhvZHMuXG4gKlxuICogRm9yIGRldGFpbGVkIHVzYWdlIGluZm9ybWF0aW9uLCBzZWUgdGhlIFtSb3V0aW5nIEd1aWRlXShndWlkZS9yb3V0ZXIpLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogIyMjIFNpbXBsZSBDb25maWd1cmF0aW9uXG4gKlxuICogVGhlIGZvbGxvd2luZyByb3V0ZSBzcGVjaWZpZXMgdGhhdCB3aGVuIG5hdmlnYXRpbmcgdG8sIGZvciBleGFtcGxlLFxuICogYC90ZWFtLzExL3VzZXIvYm9iYCwgdGhlIHJvdXRlciBjcmVhdGVzIHRoZSAnVGVhbScgY29tcG9uZW50XG4gKiB3aXRoIHRoZSAnVXNlcicgY2hpbGQgY29tcG9uZW50IGluIGl0LlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAgKiAgY29tcG9uZW50OiBUZWFtLFxuICogICBjaGlsZHJlbjogW3tcbiAqICAgICBwYXRoOiAndXNlci86bmFtZScsXG4gKiAgICAgY29tcG9uZW50OiBVc2VyXG4gKiAgIH1dXG4gKiB9XVxuICogYGBgXG4gKlxuICogIyMjIE11bHRpcGxlIE91dGxldHNcbiAqXG4gKiBUaGUgZm9sbG93aW5nIHJvdXRlIGNyZWF0ZXMgc2libGluZyBjb21wb25lbnRzIHdpdGggbXVsdGlwbGUgb3V0bGV0cy5cbiAqIFdoZW4gbmF2aWdhdGluZyB0byBgL3RlYW0vMTEoYXV4OmNoYXQvamltKWAsIHRoZSByb3V0ZXIgY3JlYXRlcyB0aGUgJ1RlYW0nIGNvbXBvbmVudCBuZXh0IHRvXG4gKiB0aGUgJ0NoYXQnIGNvbXBvbmVudC4gVGhlICdDaGF0JyBjb21wb25lbnQgaXMgcGxhY2VkIGludG8gdGhlICdhdXgnIG91dGxldC5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgIGNvbXBvbmVudDogVGVhbVxuICogfSwge1xuICogICBwYXRoOiAnY2hhdC86dXNlcicsXG4gKiAgIGNvbXBvbmVudDogQ2hhdFxuICogICBvdXRsZXQ6ICdhdXgnXG4gKiB9XVxuICogYGBgXG4gKlxuICogIyMjIFdpbGQgQ2FyZHNcbiAqXG4gKiBUaGUgZm9sbG93aW5nIHJvdXRlIHVzZXMgd2lsZC1jYXJkIG5vdGF0aW9uIHRvIHNwZWNpZnkgYSBjb21wb25lbnRcbiAqIHRoYXQgaXMgYWx3YXlzIGluc3RhbnRpYXRlZCByZWdhcmRsZXNzIG9mIHdoZXJlIHlvdSBuYXZpZ2F0ZSB0by5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICcqKicsXG4gKiAgIGNvbXBvbmVudDogV2lsZGNhcmRDb21wb25lbnRcbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiAjIyMgUmVkaXJlY3RzXG4gKlxuICogVGhlIGZvbGxvd2luZyByb3V0ZSB1c2VzIHRoZSBgcmVkaXJlY3RUb2AgcHJvcGVydHkgdG8gaWdub3JlIGEgc2VnbWVudCBvZlxuICogYSBnaXZlbiBVUkwgd2hlbiBsb29raW5nIGZvciBhIGNoaWxkIHBhdGguXG4gKlxuICogV2hlbiBuYXZpZ2F0aW5nIHRvICcvdGVhbS8xMS9sZWdhY3kvdXNlci9qaW0nLCB0aGUgcm91dGVyIGNoYW5nZXMgdGhlIFVSTCBzZWdtZW50XG4gKiAnL3RlYW0vMTEvbGVnYWN5L3VzZXIvamltJyB0byAnL3RlYW0vMTEvdXNlci9qaW0nLCBhbmQgdGhlbiBpbnN0YW50aWF0ZXNcbiAqIHRoZSBUZWFtIGNvbXBvbmVudCB3aXRoIHRoZSBVc2VyIGNoaWxkIGNvbXBvbmVudCBpbiBpdC5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgIGNvbXBvbmVudDogVGVhbSxcbiAqICAgY2hpbGRyZW46IFt7XG4gKiAgICAgcGF0aDogJ2xlZ2FjeS91c2VyLzpuYW1lJyxcbiAqICAgICByZWRpcmVjdFRvOiAndXNlci86bmFtZSdcbiAqICAgfSwge1xuICogICAgIHBhdGg6ICd1c2VyLzpuYW1lJyxcbiAqICAgICBjb21wb25lbnQ6IFVzZXJcbiAqICAgfV1cbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiBUaGUgcmVkaXJlY3QgcGF0aCBjYW4gYmUgcmVsYXRpdmUsIGFzIHNob3duIGluIHRoaXMgZXhhbXBsZSwgb3IgYWJzb2x1dGUuXG4gKiBJZiB3ZSBjaGFuZ2UgdGhlIGByZWRpcmVjdFRvYCB2YWx1ZSBpbiB0aGUgZXhhbXBsZSB0byB0aGUgYWJzb2x1dGUgVVJMIHNlZ21lbnQgJy91c2VyLzpuYW1lJyxcbiAqIHRoZSByZXN1bHQgVVJMIGlzIGFsc28gYWJzb2x1dGUsICcvdXNlci9qaW0nLlxuXG4gKiAjIyMgRW1wdHkgUGF0aFxuICpcbiAqIEVtcHR5LXBhdGggcm91dGUgY29uZmlndXJhdGlvbnMgY2FuIGJlIHVzZWQgdG8gaW5zdGFudGlhdGUgY29tcG9uZW50cyB0aGF0IGRvIG5vdCAnY29uc3VtZSdcbiAqIGFueSBVUkwgc2VnbWVudHMuXG4gKlxuICogSW4gdGhlIGZvbGxvd2luZyBjb25maWd1cmF0aW9uLCB3aGVuIG5hdmlnYXRpbmcgdG9cbiAqIGAvdGVhbS8xMWAsIHRoZSByb3V0ZXIgaW5zdGFudGlhdGVzIHRoZSAnQWxsVXNlcnMnIGNvbXBvbmVudC5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgIGNvbXBvbmVudDogVGVhbSxcbiAqICAgY2hpbGRyZW46IFt7XG4gKiAgICAgcGF0aDogJycsXG4gKiAgICAgY29tcG9uZW50OiBBbGxVc2Vyc1xuICogICB9LCB7XG4gKiAgICAgcGF0aDogJ3VzZXIvOm5hbWUnLFxuICogICAgIGNvbXBvbmVudDogVXNlclxuICogICB9XVxuICogfV1cbiAqIGBgYFxuICpcbiAqIEVtcHR5LXBhdGggcm91dGVzIGNhbiBoYXZlIGNoaWxkcmVuLiBJbiB0aGUgZm9sbG93aW5nIGV4YW1wbGUsIHdoZW4gbmF2aWdhdGluZ1xuICogdG8gYC90ZWFtLzExL3VzZXIvamltYCwgdGhlIHJvdXRlciBpbnN0YW50aWF0ZXMgdGhlIHdyYXBwZXIgY29tcG9uZW50IHdpdGhcbiAqIHRoZSB1c2VyIGNvbXBvbmVudCBpbiBpdC5cbiAqXG4gKiBOb3RlIHRoYXQgYW4gZW1wdHkgcGF0aCByb3V0ZSBpbmhlcml0cyBpdHMgcGFyZW50J3MgcGFyYW1ldGVycyBhbmQgZGF0YS5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgIGNvbXBvbmVudDogVGVhbSxcbiAqICAgY2hpbGRyZW46IFt7XG4gKiAgICAgcGF0aDogJycsXG4gKiAgICAgY29tcG9uZW50OiBXcmFwcGVyQ21wLFxuICogICAgIGNoaWxkcmVuOiBbe1xuICogICAgICAgcGF0aDogJ3VzZXIvOm5hbWUnLFxuICogICAgICAgY29tcG9uZW50OiBVc2VyXG4gKiAgICAgfV1cbiAqICAgfV1cbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiAjIyMgTWF0Y2hpbmcgU3RyYXRlZ3lcbiAqXG4gKiBUaGUgZGVmYXVsdCBwYXRoLW1hdGNoIHN0cmF0ZWd5IGlzICdwcmVmaXgnLCB3aGljaCBtZWFucyB0aGF0IHRoZSByb3V0ZXJcbiAqIGNoZWNrcyBVUkwgZWxlbWVudHMgZnJvbSB0aGUgbGVmdCB0byBzZWUgaWYgdGhlIFVSTCBtYXRjaGVzIGEgc3BlY2lmaWVkIHBhdGguXG4gKiBGb3IgZXhhbXBsZSwgJy90ZWFtLzExL3VzZXInIG1hdGNoZXMgJ3RlYW0vOmlkJy5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICcnLFxuICogICBwYXRoTWF0Y2g6ICdwcmVmaXgnLCAvL2RlZmF1bHRcbiAqICAgcmVkaXJlY3RUbzogJ21haW4nXG4gKiB9LCB7XG4gKiAgIHBhdGg6ICdtYWluJyxcbiAqICAgY29tcG9uZW50OiBNYWluXG4gKiB9XVxuICogYGBgXG4gKlxuICogWW91IGNhbiBzcGVjaWZ5IHRoZSBwYXRoLW1hdGNoIHN0cmF0ZWd5ICdmdWxsJyB0byBtYWtlIHN1cmUgdGhhdCB0aGUgcGF0aFxuICogY292ZXJzIHRoZSB3aG9sZSB1bmNvbnN1bWVkIFVSTC4gSXQgaXMgaW1wb3J0YW50IHRvIGRvIHRoaXMgd2hlbiByZWRpcmVjdGluZ1xuICogZW1wdHktcGF0aCByb3V0ZXMuIE90aGVyd2lzZSwgYmVjYXVzZSBhbiBlbXB0eSBwYXRoIGlzIGEgcHJlZml4IG9mIGFueSBVUkwsXG4gKiB0aGUgcm91dGVyIHdvdWxkIGFwcGx5IHRoZSByZWRpcmVjdCBldmVuIHdoZW4gbmF2aWdhdGluZyB0byB0aGUgcmVkaXJlY3QgZGVzdGluYXRpb24sXG4gKiBjcmVhdGluZyBhbiBlbmRsZXNzIGxvb3AuXG4gKlxuICogSW4gdGhlIGZvbGxvd2luZyBleGFtcGxlLCBzdXBwbHlpbmcgdGhlICdmdWxsJyBgcGF0aE1hdGNoYCBzdHJhdGVneSBlbnN1cmVzXG4gKiB0aGF0IHRoZSByb3V0ZXIgYXBwbGllcyB0aGUgcmVkaXJlY3QgaWYgYW5kIG9ubHkgaWYgbmF2aWdhdGluZyB0byAnLycuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAnJyxcbiAqICAgcGF0aE1hdGNoOiAnZnVsbCcsXG4gKiAgIHJlZGlyZWN0VG86ICdtYWluJ1xuICogfSwge1xuICogICBwYXRoOiAnbWFpbicsXG4gKiAgIGNvbXBvbmVudDogTWFpblxuICogfV1cbiAqIGBgYFxuICpcbiAqICMjIyBDb21wb25lbnRsZXNzIFJvdXRlc1xuICpcbiAqIFlvdSBjYW4gc2hhcmUgcGFyYW1ldGVycyBiZXR3ZWVuIHNpYmxpbmcgY29tcG9uZW50cy5cbiAqIEZvciBleGFtcGxlLCBzdXBwb3NlIHRoYXQgdHdvIHNpYmxpbmcgY29tcG9uZW50cyBzaG91bGQgZ28gbmV4dCB0byBlYWNoIG90aGVyLFxuICogYW5kIGJvdGggb2YgdGhlbSByZXF1aXJlIGFuIElEIHBhcmFtZXRlci4gWW91IGNhbiBhY2NvbXBsaXNoIHRoaXMgdXNpbmcgYSByb3V0ZVxuICogdGhhdCBkb2VzIG5vdCBzcGVjaWZ5IGEgY29tcG9uZW50IGF0IHRoZSB0b3AgbGV2ZWwuXG4gKlxuICogSW4gdGhlIGZvbGxvd2luZyBleGFtcGxlLCAnTWFpbkNoaWxkJyBhbmQgJ0F1eENoaWxkJyBhcmUgc2libGluZ3MuXG4gKiBXaGVuIG5hdmlnYXRpbmcgdG8gJ3BhcmVudC8xMC8oYS8vYXV4OmIpJywgdGhlIHJvdXRlIGluc3RhbnRpYXRlc1xuICogdGhlIG1haW4gY2hpbGQgYW5kIGF1eCBjaGlsZCBjb21wb25lbnRzIG5leHQgdG8gZWFjaCBvdGhlci5cbiAqIEZvciB0aGlzIHRvIHdvcmssIHRoZSBhcHBsaWNhdGlvbiBjb21wb25lbnQgbXVzdCBoYXZlIHRoZSBwcmltYXJ5IGFuZCBhdXggb3V0bGV0cyBkZWZpbmVkLlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgIHBhdGg6ICdwYXJlbnQvOmlkJyxcbiAqICAgIGNoaWxkcmVuOiBbXG4gKiAgICAgIHsgcGF0aDogJ2EnLCBjb21wb25lbnQ6IE1haW5DaGlsZCB9LFxuICogICAgICB7IHBhdGg6ICdiJywgY29tcG9uZW50OiBBdXhDaGlsZCwgb3V0bGV0OiAnYXV4JyB9XG4gKiAgICBdXG4gKiB9XVxuICogYGBgXG4gKlxuICogVGhlIHJvdXRlciBtZXJnZXMgdGhlIHBhcmFtZXRlcnMsIGRhdGEsIGFuZCByZXNvbHZlIG9mIHRoZSBjb21wb25lbnRsZXNzXG4gKiBwYXJlbnQgaW50byB0aGUgcGFyYW1ldGVycywgZGF0YSwgYW5kIHJlc29sdmUgb2YgdGhlIGNoaWxkcmVuLlxuICpcbiAqIFRoaXMgaXMgZXNwZWNpYWxseSB1c2VmdWwgd2hlbiBjaGlsZCBjb21wb25lbnRzIGFyZSBkZWZpbmVkXG4gKiB3aXRoIGFuIGVtcHR5IHBhdGggc3RyaW5nLCBhcyBpbiB0aGUgZm9sbG93aW5nIGV4YW1wbGUuXG4gKiBXaXRoIHRoaXMgY29uZmlndXJhdGlvbiwgbmF2aWdhdGluZyB0byAnL3BhcmVudC8xMCcgY3JlYXRlc1xuICogdGhlIG1haW4gY2hpbGQgYW5kIGF1eCBjb21wb25lbnRzLlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgIHBhdGg6ICdwYXJlbnQvOmlkJyxcbiAqICAgIGNoaWxkcmVuOiBbXG4gKiAgICAgIHsgcGF0aDogJycsIGNvbXBvbmVudDogTWFpbkNoaWxkIH0sXG4gKiAgICAgIHsgcGF0aDogJycsIGNvbXBvbmVudDogQXV4Q2hpbGQsIG91dGxldDogJ2F1eCcgfVxuICogICAgXVxuICogfV1cbiAqIGBgYFxuICpcbiAqICMjIyBMYXp5IExvYWRpbmdcbiAqXG4gKiBMYXp5IGxvYWRpbmcgc3BlZWRzIHVwIGFwcGxpY2F0aW9uIGxvYWQgdGltZSBieSBzcGxpdHRpbmcgdGhlIGFwcGxpY2F0aW9uXG4gKiBpbnRvIG11bHRpcGxlIGJ1bmRsZXMgYW5kIGxvYWRpbmcgdGhlbSBvbiBkZW1hbmQuXG4gKiBUbyB1c2UgbGF6eSBsb2FkaW5nLCBwcm92aWRlIHRoZSBgbG9hZENoaWxkcmVuYCBwcm9wZXJ0eSAgaW5zdGVhZCBvZiB0aGUgYGNoaWxkcmVuYCBwcm9wZXJ0eS5cbiAqXG4gKiBHaXZlbiB0aGUgZm9sbG93aW5nIGV4YW1wbGUgcm91dGUsIHRoZSByb3V0ZXIgd2lsbCBsYXp5IGxvYWRcbiAqIHRoZSBhc3NvY2lhdGVkIG1vZHVsZSBvbiBkZW1hbmQgdXNpbmcgdGhlIGJyb3dzZXIgbmF0aXZlIGltcG9ydCBzeXN0ZW0uXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAnbGF6eScsXG4gKiAgIGxvYWRDaGlsZHJlbjogKCkgPT4gaW1wb3J0KCcuL2xhenktcm91dGUvbGF6eS5tb2R1bGUnKS50aGVuKG1vZCA9PiBtb2QuTGF6eU1vZHVsZSksXG4gKiB9XTtcbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSb3V0ZSB7XG4gIC8qKlxuICAgKiBUaGUgcGF0aCB0byBtYXRjaCBhZ2FpbnN0LiBDYW5ub3QgYmUgdXNlZCB0b2dldGhlciB3aXRoIGEgY3VzdG9tIGBtYXRjaGVyYCBmdW5jdGlvbi5cbiAgICogQSBVUkwgc3RyaW5nIHRoYXQgdXNlcyByb3V0ZXIgbWF0Y2hpbmcgbm90YXRpb24uXG4gICAqIENhbiBiZSBhIHdpbGQgY2FyZCAoYCoqYCkgdGhhdCBtYXRjaGVzIGFueSBVUkwgKHNlZSBVc2FnZSBOb3RlcyBiZWxvdykuXG4gICAqIERlZmF1bHQgaXMgXCIvXCIgKHRoZSByb290IHBhdGgpLlxuICAgKlxuICAgKi9cbiAgcGF0aD86IHN0cmluZztcbiAgLyoqXG4gICAqIFRoZSBwYXRoLW1hdGNoaW5nIHN0cmF0ZWd5LCBvbmUgb2YgJ3ByZWZpeCcgb3IgJ2Z1bGwnLlxuICAgKiBEZWZhdWx0IGlzICdwcmVmaXgnLlxuICAgKlxuICAgKiBCeSBkZWZhdWx0LCB0aGUgcm91dGVyIGNoZWNrcyBVUkwgZWxlbWVudHMgZnJvbSB0aGUgbGVmdCB0byBzZWUgaWYgdGhlIFVSTFxuICAgKiBtYXRjaGVzIGEgZ2l2ZW4gIHBhdGgsIGFuZCBzdG9wcyB3aGVuIHRoZXJlIGlzIGEgbWF0Y2guIEZvciBleGFtcGxlLFxuICAgKiAnL3RlYW0vMTEvdXNlcicgbWF0Y2hlcyAndGVhbS86aWQnLlxuICAgKlxuICAgKiBUaGUgcGF0aC1tYXRjaCBzdHJhdGVneSAnZnVsbCcgbWF0Y2hlcyBhZ2FpbnN0IHRoZSBlbnRpcmUgVVJMLlxuICAgKiBJdCBpcyBpbXBvcnRhbnQgdG8gZG8gdGhpcyB3aGVuIHJlZGlyZWN0aW5nIGVtcHR5LXBhdGggcm91dGVzLlxuICAgKiBPdGhlcndpc2UsIGJlY2F1c2UgYW4gZW1wdHkgcGF0aCBpcyBhIHByZWZpeCBvZiBhbnkgVVJMLFxuICAgKiB0aGUgcm91dGVyIHdvdWxkIGFwcGx5IHRoZSByZWRpcmVjdCBldmVuIHdoZW4gbmF2aWdhdGluZ1xuICAgKiB0byB0aGUgcmVkaXJlY3QgZGVzdGluYXRpb24sIGNyZWF0aW5nIGFuIGVuZGxlc3MgbG9vcC5cbiAgICpcbiAgICovXG4gIHBhdGhNYXRjaD86IHN0cmluZztcbiAgLyoqXG4gICAqIEEgY3VzdG9tIFVSTC1tYXRjaGluZyBmdW5jdGlvbi4gQ2Fubm90IGJlIHVzZWQgdG9nZXRoZXIgd2l0aCBgcGF0aGAuXG4gICAqL1xuICBtYXRjaGVyPzogVXJsTWF0Y2hlcjtcbiAgLyoqXG4gICAqIFRoZSBjb21wb25lbnQgdG8gaW5zdGFudGlhdGUgd2hlbiB0aGUgcGF0aCBtYXRjaGVzLlxuICAgKiBDYW4gYmUgZW1wdHkgaWYgY2hpbGQgcm91dGVzIHNwZWNpZnkgY29tcG9uZW50cy5cbiAgICovXG4gIGNvbXBvbmVudD86IFR5cGU8YW55PjtcbiAgLyoqXG4gICAqIEEgVVJMIHRvIHdoaWNoIHRvIHJlZGlyZWN0IHdoZW4gYSB0aGUgcGF0aCBtYXRjaGVzLlxuICAgKiBBYnNvbHV0ZSBpZiB0aGUgVVJMIGJlZ2lucyB3aXRoIGEgc2xhc2ggKC8pLCBvdGhlcndpc2UgcmVsYXRpdmUgdG8gdGhlIHBhdGggVVJMLlxuICAgKiBXaGVuIG5vdCBwcmVzZW50LCByb3V0ZXIgZG9lcyBub3QgcmVkaXJlY3QuXG4gICAqL1xuICByZWRpcmVjdFRvPzogc3RyaW5nO1xuICAvKipcbiAgICogTmFtZSBvZiBhIGBSb3V0ZXJPdXRsZXRgIG9iamVjdCB3aGVyZSB0aGUgY29tcG9uZW50IGNhbiBiZSBwbGFjZWRcbiAgICogd2hlbiB0aGUgcGF0aCBtYXRjaGVzLlxuICAgKi9cbiAgb3V0bGV0Pzogc3RyaW5nO1xuICAvKipcbiAgICogQW4gYXJyYXkgb2YgZGVwZW5kZW5jeS1pbmplY3Rpb24gdG9rZW5zIHVzZWQgdG8gbG9vayB1cCBgQ2FuQWN0aXZhdGUoKWBcbiAgICogaGFuZGxlcnMsIGluIG9yZGVyIHRvIGRldGVybWluZSBpZiB0aGUgY3VycmVudCB1c2VyIGlzIGFsbG93ZWQgdG9cbiAgICogYWN0aXZhdGUgdGhlIGNvbXBvbmVudC4gQnkgZGVmYXVsdCwgYW55IHVzZXIgY2FuIGFjdGl2YXRlLlxuICAgKi9cbiAgY2FuQWN0aXZhdGU/OiBhbnlbXTtcbiAgLyoqXG4gICAqIEFuIGFycmF5IG9mIERJIHRva2VucyB1c2VkIHRvIGxvb2sgdXAgYENhbkFjdGl2YXRlQ2hpbGQoKWAgaGFuZGxlcnMsXG4gICAqIGluIG9yZGVyIHRvIGRldGVybWluZSBpZiB0aGUgY3VycmVudCB1c2VyIGlzIGFsbG93ZWQgdG8gYWN0aXZhdGVcbiAgICogYSBjaGlsZCBvZiB0aGUgY29tcG9uZW50LiBCeSBkZWZhdWx0LCBhbnkgdXNlciBjYW4gYWN0aXZhdGUgYSBjaGlsZC5cbiAgICovXG4gIGNhbkFjdGl2YXRlQ2hpbGQ/OiBhbnlbXTtcbiAgLyoqXG4gICAqIEFuIGFycmF5IG9mIERJIHRva2VucyB1c2VkIHRvIGxvb2sgdXAgYENhbkRlYWN0aXZhdGUoKWBcbiAgICogaGFuZGxlcnMsIGluIG9yZGVyIHRvIGRldGVybWluZSBpZiB0aGUgY3VycmVudCB1c2VyIGlzIGFsbG93ZWQgdG9cbiAgICogZGVhY3RpdmF0ZSB0aGUgY29tcG9uZW50LiBCeSBkZWZhdWx0LCBhbnkgdXNlciBjYW4gZGVhY3RpdmF0ZS5cbiAgICpcbiAgICovXG4gIGNhbkRlYWN0aXZhdGU/OiBhbnlbXTtcbiAgLyoqXG4gICAqIEFuIGFycmF5IG9mIERJIHRva2VucyB1c2VkIHRvIGxvb2sgdXAgYENhbkxvYWQoKWBcbiAgICogaGFuZGxlcnMsIGluIG9yZGVyIHRvIGRldGVybWluZSBpZiB0aGUgY3VycmVudCB1c2VyIGlzIGFsbG93ZWQgdG9cbiAgICogbG9hZCB0aGUgY29tcG9uZW50LiBCeSBkZWZhdWx0LCBhbnkgdXNlciBjYW4gbG9hZC5cbiAgICovXG4gIGNhbkxvYWQ/OiBhbnlbXTtcbiAgLyoqXG4gICAqIEFkZGl0aW9uYWwgZGV2ZWxvcGVyLWRlZmluZWQgZGF0YSBwcm92aWRlZCB0byB0aGUgY29tcG9uZW50IHZpYVxuICAgKiBgQWN0aXZhdGVkUm91dGVgLiBCeSBkZWZhdWx0LCBubyBhZGRpdGlvbmFsIGRhdGEgaXMgcGFzc2VkLlxuICAgKi9cbiAgZGF0YT86IERhdGE7XG4gIC8qKlxuICAgKiBBIG1hcCBvZiBESSB0b2tlbnMgdXNlZCB0byBsb29rIHVwIGRhdGEgcmVzb2x2ZXJzLiBTZWUgYFJlc29sdmVgLlxuICAgKi9cbiAgcmVzb2x2ZT86IFJlc29sdmVEYXRhO1xuICAvKipcbiAgICogQW4gYXJyYXkgb2YgY2hpbGQgYFJvdXRlYCBvYmplY3RzIHRoYXQgc3BlY2lmaWVzIGEgbmVzdGVkIHJvdXRlXG4gICAqIGNvbmZpZ3VyYXRpb24uXG4gICAqL1xuICBjaGlsZHJlbj86IFJvdXRlcztcbiAgLyoqXG4gICAqIEEgYExvYWRDaGlsZHJlbmAgb2JqZWN0IHNwZWNpZnlpbmcgbGF6eS1sb2FkZWQgY2hpbGQgcm91dGVzLlxuICAgKi9cbiAgbG9hZENoaWxkcmVuPzogTG9hZENoaWxkcmVuO1xuICAvKipcbiAgICogRGVmaW5lcyB3aGVuIGd1YXJkcyBhbmQgcmVzb2x2ZXJzIHdpbGwgYmUgcnVuLiBPbmUgb2ZcbiAgICogLSBgcGFyYW1zT3JRdWVyeVBhcmFtc0NoYW5nZWAgOiBSdW4gd2hlbiBxdWVyeSBwYXJhbWV0ZXJzIGNoYW5nZS5cbiAgICogLSBgYWx3YXlzYCA6IFJ1biBvbiBldmVyeSBleGVjdXRpb24uXG4gICAqIEJ5IGRlZmF1bHQsIGd1YXJkcyBhbmQgcmVzb2x2ZXJzIHJ1biBvbmx5IHdoZW4gdGhlIG1hdHJpeFxuICAgKiBwYXJhbWV0ZXJzIG9mIHRoZSByb3V0ZSBjaGFuZ2UuXG4gICAqL1xuICBydW5HdWFyZHNBbmRSZXNvbHZlcnM/OiBSdW5HdWFyZHNBbmRSZXNvbHZlcnM7XG4gIC8qKlxuICAgKiBGaWxsZWQgZm9yIHJvdXRlcyB3aXRoIGBsb2FkQ2hpbGRyZW5gIG9uY2UgdGhlIG1vZHVsZSBoYXMgYmVlbiBsb2FkZWRcbiAgICogQGludGVybmFsXG4gICAqL1xuICBfbG9hZGVkQ29uZmlnPzogTG9hZGVkUm91dGVyQ29uZmlnO1xufVxuXG5leHBvcnQgY2xhc3MgTG9hZGVkUm91dGVyQ29uZmlnIHtcbiAgY29uc3RydWN0b3IocHVibGljIHJvdXRlczogUm91dGVbXSwgcHVibGljIG1vZHVsZTogTmdNb2R1bGVSZWY8YW55Pikge31cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQ29uZmlnKGNvbmZpZzogUm91dGVzLCBwYXJlbnRQYXRoOiBzdHJpbmcgPSAnJyk6IHZvaWQge1xuICAvLyBmb3JFYWNoIGRvZXNuJ3QgaXRlcmF0ZSB1bmRlZmluZWQgdmFsdWVzXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29uZmlnLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3Qgcm91dGU6IFJvdXRlID0gY29uZmlnW2ldO1xuICAgIGNvbnN0IGZ1bGxQYXRoOiBzdHJpbmcgPSBnZXRGdWxsUGF0aChwYXJlbnRQYXRoLCByb3V0ZSk7XG4gICAgdmFsaWRhdGVOb2RlKHJvdXRlLCBmdWxsUGF0aCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVOb2RlKHJvdXRlOiBSb3V0ZSwgZnVsbFBhdGg6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoIXJvdXRlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBcbiAgICAgIEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBFbmNvdW50ZXJlZCB1bmRlZmluZWQgcm91dGUuXG4gICAgICBUaGUgcmVhc29uIG1pZ2h0IGJlIGFuIGV4dHJhIGNvbW1hLlxuXG4gICAgICBFeGFtcGxlOlxuICAgICAgY29uc3Qgcm91dGVzOiBSb3V0ZXMgPSBbXG4gICAgICAgIHsgcGF0aDogJycsIHJlZGlyZWN0VG86ICcvZGFzaGJvYXJkJywgcGF0aE1hdGNoOiAnZnVsbCcgfSxcbiAgICAgICAgeyBwYXRoOiAnZGFzaGJvYXJkJywgIGNvbXBvbmVudDogRGFzaGJvYXJkQ29tcG9uZW50IH0sLCA8PCB0d28gY29tbWFzXG4gICAgICAgIHsgcGF0aDogJ2RldGFpbC86aWQnLCBjb21wb25lbnQ6IEhlcm9EZXRhaWxDb21wb25lbnQgfVxuICAgICAgXTtcbiAgICBgKTtcbiAgfVxuICBpZiAoQXJyYXkuaXNBcnJheShyb3V0ZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBBcnJheSBjYW5ub3QgYmUgc3BlY2lmaWVkYCk7XG4gIH1cbiAgaWYgKCFyb3V0ZS5jb21wb25lbnQgJiYgIXJvdXRlLmNoaWxkcmVuICYmICFyb3V0ZS5sb2FkQ2hpbGRyZW4gJiZcbiAgICAgIChyb3V0ZS5vdXRsZXQgJiYgcm91dGUub3V0bGV0ICE9PSBQUklNQVJZX09VVExFVCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgZnVsbFBhdGh9JzogYSBjb21wb25lbnRsZXNzIHJvdXRlIHdpdGhvdXQgY2hpbGRyZW4gb3IgbG9hZENoaWxkcmVuIGNhbm5vdCBoYXZlIGEgbmFtZWQgb3V0bGV0IHNldGApO1xuICB9XG4gIGlmIChyb3V0ZS5yZWRpcmVjdFRvICYmIHJvdXRlLmNoaWxkcmVuKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7XG4gICAgICAgIGZ1bGxQYXRofSc6IHJlZGlyZWN0VG8gYW5kIGNoaWxkcmVuIGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gIH1cbiAgaWYgKHJvdXRlLnJlZGlyZWN0VG8gJiYgcm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7XG4gICAgICAgIGZ1bGxQYXRofSc6IHJlZGlyZWN0VG8gYW5kIGxvYWRDaGlsZHJlbiBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmApO1xuICB9XG4gIGlmIChyb3V0ZS5jaGlsZHJlbiAmJiByb3V0ZS5sb2FkQ2hpbGRyZW4pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgZnVsbFBhdGh9JzogY2hpbGRyZW4gYW5kIGxvYWRDaGlsZHJlbiBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmApO1xuICB9XG4gIGlmIChyb3V0ZS5yZWRpcmVjdFRvICYmIHJvdXRlLmNvbXBvbmVudCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke1xuICAgICAgICBmdWxsUGF0aH0nOiByZWRpcmVjdFRvIGFuZCBjb21wb25lbnQgY2Fubm90IGJlIHVzZWQgdG9nZXRoZXJgKTtcbiAgfVxuICBpZiAocm91dGUucGF0aCAmJiByb3V0ZS5tYXRjaGVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IHBhdGggYW5kIG1hdGNoZXIgY2Fubm90IGJlIHVzZWQgdG9nZXRoZXJgKTtcbiAgfVxuICBpZiAocm91dGUucmVkaXJlY3RUbyA9PT0gdm9pZCAwICYmICFyb3V0ZS5jb21wb25lbnQgJiYgIXJvdXRlLmNoaWxkcmVuICYmICFyb3V0ZS5sb2FkQ2hpbGRyZW4pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgZnVsbFBhdGh9Jy4gT25lIG9mIHRoZSBmb2xsb3dpbmcgbXVzdCBiZSBwcm92aWRlZDogY29tcG9uZW50LCByZWRpcmVjdFRvLCBjaGlsZHJlbiBvciBsb2FkQ2hpbGRyZW5gKTtcbiAgfVxuICBpZiAocm91dGUucGF0aCA9PT0gdm9pZCAwICYmIHJvdXRlLm1hdGNoZXIgPT09IHZvaWQgMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke1xuICAgICAgICBmdWxsUGF0aH0nOiByb3V0ZXMgbXVzdCBoYXZlIGVpdGhlciBhIHBhdGggb3IgYSBtYXRjaGVyIHNwZWNpZmllZGApO1xuICB9XG4gIGlmICh0eXBlb2Ygcm91dGUucGF0aCA9PT0gJ3N0cmluZycgJiYgcm91dGUucGF0aC5jaGFyQXQoMCkgPT09ICcvJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IHBhdGggY2Fubm90IHN0YXJ0IHdpdGggYSBzbGFzaGApO1xuICB9XG4gIGlmIChyb3V0ZS5wYXRoID09PSAnJyAmJiByb3V0ZS5yZWRpcmVjdFRvICE9PSB2b2lkIDAgJiYgcm91dGUucGF0aE1hdGNoID09PSB2b2lkIDApIHtcbiAgICBjb25zdCBleHAgPVxuICAgICAgICBgVGhlIGRlZmF1bHQgdmFsdWUgb2YgJ3BhdGhNYXRjaCcgaXMgJ3ByZWZpeCcsIGJ1dCBvZnRlbiB0aGUgaW50ZW50IGlzIHRvIHVzZSAnZnVsbCcuYDtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAne3BhdGg6IFwiJHtmdWxsUGF0aH1cIiwgcmVkaXJlY3RUbzogXCIke1xuICAgICAgICByb3V0ZS5yZWRpcmVjdFRvfVwifSc6IHBsZWFzZSBwcm92aWRlICdwYXRoTWF0Y2gnLiAke2V4cH1gKTtcbiAgfVxuICBpZiAocm91dGUucGF0aE1hdGNoICE9PSB2b2lkIDAgJiYgcm91dGUucGF0aE1hdGNoICE9PSAnZnVsbCcgJiYgcm91dGUucGF0aE1hdGNoICE9PSAncHJlZml4Jykge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke1xuICAgICAgICBmdWxsUGF0aH0nOiBwYXRoTWF0Y2ggY2FuIG9ubHkgYmUgc2V0IHRvICdwcmVmaXgnIG9yICdmdWxsJ2ApO1xuICB9XG4gIGlmIChyb3V0ZS5jaGlsZHJlbikge1xuICAgIHZhbGlkYXRlQ29uZmlnKHJvdXRlLmNoaWxkcmVuLCBmdWxsUGF0aCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RnVsbFBhdGgocGFyZW50UGF0aDogc3RyaW5nLCBjdXJyZW50Um91dGU6IFJvdXRlKTogc3RyaW5nIHtcbiAgaWYgKCFjdXJyZW50Um91dGUpIHtcbiAgICByZXR1cm4gcGFyZW50UGF0aDtcbiAgfVxuICBpZiAoIXBhcmVudFBhdGggJiYgIWN1cnJlbnRSb3V0ZS5wYXRoKSB7XG4gICAgcmV0dXJuICcnO1xuICB9IGVsc2UgaWYgKHBhcmVudFBhdGggJiYgIWN1cnJlbnRSb3V0ZS5wYXRoKSB7XG4gICAgcmV0dXJuIGAke3BhcmVudFBhdGh9L2A7XG4gIH0gZWxzZSBpZiAoIXBhcmVudFBhdGggJiYgY3VycmVudFJvdXRlLnBhdGgpIHtcbiAgICByZXR1cm4gY3VycmVudFJvdXRlLnBhdGg7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGAke3BhcmVudFBhdGh9LyR7Y3VycmVudFJvdXRlLnBhdGh9YDtcbiAgfVxufVxuXG4vKipcbiAqIE1ha2VzIGEgY29weSBvZiB0aGUgY29uZmlnIGFuZCBhZGRzIGFueSBkZWZhdWx0IHJlcXVpcmVkIHByb3BlcnRpZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGFuZGFyZGl6ZUNvbmZpZyhyOiBSb3V0ZSk6IFJvdXRlIHtcbiAgY29uc3QgY2hpbGRyZW4gPSByLmNoaWxkcmVuICYmIHIuY2hpbGRyZW4ubWFwKHN0YW5kYXJkaXplQ29uZmlnKTtcbiAgY29uc3QgYyA9IGNoaWxkcmVuID8gey4uLnIsIGNoaWxkcmVufSA6IHsuLi5yfTtcbiAgaWYgKCFjLmNvbXBvbmVudCAmJiAoY2hpbGRyZW4gfHwgYy5sb2FkQ2hpbGRyZW4pICYmIChjLm91dGxldCAmJiBjLm91dGxldCAhPT0gUFJJTUFSWV9PVVRMRVQpKSB7XG4gICAgYy5jb21wb25lbnQgPSBFbXB0eU91dGxldENvbXBvbmVudDtcbiAgfVxuICByZXR1cm4gYztcbn1cbiJdfQ==