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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBV0EsT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0sMkJBQTJCLENBQUM7QUFFL0QsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBc1h4QywyQkFxR0M7Ozs7Ozs7Ozs7SUE3RkMscUJBQWM7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBZ0JkLDBCQUFtQjs7Ozs7SUFJbkIsd0JBQXFCOzs7Ozs7SUFLckIsMEJBQXNCOzs7Ozs7O0lBTXRCLDJCQUFvQjs7Ozs7O0lBS3BCLHVCQUFnQjs7Ozs7OztJQU1oQiw0QkFBb0I7Ozs7Ozs7SUFNcEIsaUNBQXlCOzs7Ozs7OztJQU96Qiw4QkFBc0I7Ozs7Ozs7SUFNdEIsd0JBQWdCOzs7Ozs7SUFLaEIscUJBQVk7Ozs7O0lBSVosd0JBQXNCOzs7Ozs7SUFLdEIseUJBQWtCOzs7OztJQUlsQiw2QkFBNEI7Ozs7Ozs7OztJQVE1QixzQ0FBOEM7Ozs7OztJQUs5Qyw4QkFBbUM7O0FBR3JDLE1BQU0sT0FBTyxrQkFBa0I7Ozs7O0lBQzdCLFlBQW1CLE1BQWUsRUFBUyxNQUF3QjtRQUFoRCxXQUFNLEdBQU4sTUFBTSxDQUFTO1FBQVMsV0FBTSxHQUFOLE1BQU0sQ0FBa0I7SUFBRyxDQUFDO0NBQ3hFOzs7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VUFBVSxpQkFBaUIsQ0FBQyxDQUFROztVQUNsQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQzs7VUFDMUQsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLGlDQUFLLENBQUMsS0FBRSxRQUFRLElBQUUsQ0FBQyxtQkFBSyxDQUFDLENBQUM7SUFDOUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLGNBQWMsQ0FBQyxFQUFFO1FBQzdGLENBQUMsQ0FBQyxTQUFTLEdBQUcsb0JBQW9CLENBQUM7S0FDcEM7SUFDRCxPQUFPLENBQUMsQ0FBQztBQUNYLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TmdNb2R1bGVGYWN0b3J5LCBOZ01vZHVsZVJlZiwgVHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge09ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge0VtcHR5T3V0bGV0Q29tcG9uZW50fSBmcm9tICcuL2NvbXBvbmVudHMvZW1wdHlfb3V0bGV0JztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGVTbmFwc2hvdH0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQUklNQVJZX09VVExFVH0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtVcmxTZWdtZW50LCBVcmxTZWdtZW50R3JvdXB9IGZyb20gJy4vdXJsX3RyZWUnO1xuXG5cbi8qKlxuICogUmVwcmVzZW50cyBhIHJvdXRlIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBSb3V0ZXIgc2VydmljZS5cbiAqIEFuIGFycmF5IG9mIGBSb3V0ZWAgb2JqZWN0cywgdXNlZCBpbiBgUm91dGVyLmNvbmZpZ2AgYW5kIGZvciBuZXN0ZWQgcm91dGUgY29uZmlndXJhdGlvbnNcbiAqIGluIGBSb3V0ZS5jaGlsZHJlbmAuXG4gKlxuICogQHNlZSBgUm91dGVgXG4gKiBAc2VlIGBSb3V0ZXJgXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIFJvdXRlcyA9IFJvdXRlW107XG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgcmVzdWx0IG9mIG1hdGNoaW5nIFVSTHMgd2l0aCBhIGN1c3RvbSBtYXRjaGluZyBmdW5jdGlvbi5cbiAqXG4gKiAqIGBjb25zdW1lZGAgaXMgYW4gYXJyYXkgb2YgdGhlIGNvbnN1bWVkIFVSTCBzZWdtZW50cy5cbiAqICogYHBvc1BhcmFtc2AgaXMgYSBtYXAgb2YgcG9zaXRpb25hbCBwYXJhbWV0ZXJzLlxuICpcbiAqIEBzZWUgYFVybE1hdGNoZXIoKWBcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgVXJsTWF0Y2hSZXN1bHQgPSB7XG4gIGNvbnN1bWVkOiBVcmxTZWdtZW50W107XG4gIHBvc1BhcmFtcz86IHtbbmFtZTogc3RyaW5nXTogVXJsU2VnbWVudH07XG59O1xuXG4vKipcbiAqIEEgZnVuY3Rpb24gZm9yIG1hdGNoaW5nIGEgcm91dGUgYWdhaW5zdCBVUkxzLiBJbXBsZW1lbnQgYSBjdXN0b20gVVJMIG1hdGNoZXJcbiAqIGZvciBgUm91dGUubWF0Y2hlcmAgd2hlbiBhIGNvbWJpbmF0aW9uIG9mIGBwYXRoYCBhbmQgYHBhdGhNYXRjaGBcbiAqIGlzIG5vdCBleHByZXNzaXZlIGVub3VnaC4gQ2Fubm90IGJlIHVzZWQgdG9nZXRoZXIgd2l0aCBgcGF0aGAgYW5kIGBwYXRoTWF0Y2hgLlxuICpcbiAqIEBwYXJhbSBzZWdtZW50cyBBbiBhcnJheSBvZiBVUkwgc2VnbWVudHMuXG4gKiBAcGFyYW0gZ3JvdXAgQSBzZWdtZW50IGdyb3VwLlxuICogQHBhcmFtIHJvdXRlIFRoZSByb3V0ZSB0byBtYXRjaCBhZ2FpbnN0LlxuICogQHJldHVybnMgVGhlIG1hdGNoLXJlc3VsdC5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIFRoZSBmb2xsb3dpbmcgbWF0Y2hlciBtYXRjaGVzIEhUTUwgZmlsZXMuXG4gKlxuICogYGBgXG4gKiBleHBvcnQgZnVuY3Rpb24gaHRtbEZpbGVzKHVybDogVXJsU2VnbWVudFtdKSB7XG4gKiAgIHJldHVybiB1cmwubGVuZ3RoID09PSAxICYmIHVybFswXS5wYXRoLmVuZHNXaXRoKCcuaHRtbCcpID8gKHtjb25zdW1lZDogdXJsfSkgOiBudWxsO1xuICogfVxuICpcbiAqIGV4cG9ydCBjb25zdCByb3V0ZXMgPSBbeyBtYXRjaGVyOiBodG1sRmlsZXMsIGNvbXBvbmVudDogQW55Q29tcG9uZW50IH1dO1xuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBVcmxNYXRjaGVyID0gKHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIGdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlOiBSb3V0ZSkgPT5cbiAgICBVcmxNYXRjaFJlc3VsdDtcblxuLyoqXG4gKlxuICogUmVwcmVzZW50cyBzdGF0aWMgZGF0YSBhc3NvY2lhdGVkIHdpdGggYSBwYXJ0aWN1bGFyIHJvdXRlLlxuICpcbiAqIEBzZWUgYFJvdXRlI2RhdGFgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBEYXRhID0ge1xuICBbbmFtZTogc3RyaW5nXTogYW55XG59O1xuXG4vKipcbiAqXG4gKiBSZXByZXNlbnRzIHRoZSByZXNvbHZlZCBkYXRhIGFzc29jaWF0ZWQgd2l0aCBhIHBhcnRpY3VsYXIgcm91dGUuXG4gKlxuICogQHNlZSBgUm91dGUjcmVzb2x2ZWAuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgdHlwZSBSZXNvbHZlRGF0YSA9IHtcbiAgW25hbWU6IHN0cmluZ106IGFueVxufTtcblxuLyoqXG4gKlxuICogQSBmdW5jdGlvbiB0aGF0IGlzIGNhbGxlZCB0byByZXNvbHZlIGEgY29sbGVjdGlvbiBvZiBsYXp5LWxvYWRlZCByb3V0ZXMuXG4gKlxuICogT2Z0ZW4gdGhpcyBmdW5jdGlvbiB3aWxsIGJlIGltcGxlbWVudGVkIHVzaW5nIGFuIEVTIGR5bmFtaWMgYGltcG9ydCgpYCBleHByZXNzaW9uLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICdsYXp5JyxcbiAqICAgbG9hZENoaWxkcmVuOiAoKSA9PiBpbXBvcnQoJy4vbGF6eS1yb3V0ZS9sYXp5Lm1vZHVsZScpLnRoZW4obW9kID0+IG1vZC5MYXp5TW9kdWxlKSxcbiAqIH1dO1xuICogYGBgXG4gKlxuICogVGhpcyBmdW5jdGlvbiBfbXVzdF8gbWF0Y2ggdGhlIGZvcm0gYWJvdmU6IGFuIGFycm93IGZ1bmN0aW9uIG9mIHRoZSBmb3JtXG4gKiBgKCkgPT4gaW1wb3J0KCcuLi4nKS50aGVuKG1vZCA9PiBtb2QuTU9EVUxFKWAuXG4gKlxuICogQHNlZSBgUm91dGUjbG9hZENoaWxkcmVuYC5cbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgTG9hZENoaWxkcmVuQ2FsbGJhY2sgPSAoKSA9PiBUeXBlPGFueT58TmdNb2R1bGVGYWN0b3J5PGFueT58T2JzZXJ2YWJsZTxUeXBlPGFueT4+fFxuICAgIFByb21pc2U8TmdNb2R1bGVGYWN0b3J5PGFueT58VHlwZTxhbnk+fGFueT47XG5cbi8qKlxuICpcbiAqIEEgc3RyaW5nIG9mIHRoZSBmb3JtIGBwYXRoL3RvL2ZpbGUjZXhwb3J0TmFtZWAgdGhhdCBhY3RzIGFzIGEgVVJMIGZvciBhIHNldCBvZiByb3V0ZXMgdG8gbG9hZCxcbiAqIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHN1Y2ggYSBzZXQuXG4gKlxuICogVGhlIHN0cmluZyBmb3JtIG9mIGBMb2FkQ2hpbGRyZW5gIGlzIGRlcHJlY2F0ZWQgKHNlZSBgRGVwcmVjYXRlZExvYWRDaGlsZHJlbmApLiBUaGUgZnVuY3Rpb25cbiAqIGZvcm0gKGBMb2FkQ2hpbGRyZW5DYWxsYmFja2ApIHNob3VsZCBiZSB1c2VkIGluc3RlYWQuXG4gKlxuICogQHNlZSBgUm91dGUjbG9hZENoaWxkcmVuYC5cbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgTG9hZENoaWxkcmVuID0gTG9hZENoaWxkcmVuQ2FsbGJhY2t8RGVwcmVjYXRlZExvYWRDaGlsZHJlbjtcblxuLyoqXG4gKiBBIHN0cmluZyBvZiB0aGUgZm9ybSBgcGF0aC90by9maWxlI2V4cG9ydE5hbWVgIHRoYXQgYWN0cyBhcyBhIFVSTCBmb3IgYSBzZXQgb2Ygcm91dGVzIHRvIGxvYWQuXG4gKlxuICogQHNlZSBgUm91dGUjbG9hZENoaWxkcmVuYFxuICogQHB1YmxpY0FwaVxuICogQGRlcHJlY2F0ZWQgdGhlIGBzdHJpbmdgIGZvcm0gb2YgYGxvYWRDaGlsZHJlbmAgaXMgZGVwcmVjYXRlZCBpbiBmYXZvciBvZiB0aGUgcHJvcG9zZWQgRVMgZHluYW1pY1xuICogYGltcG9ydCgpYCBleHByZXNzaW9uLCB3aGljaCBvZmZlcnMgYSBtb3JlIG5hdHVyYWwgYW5kIHN0YW5kYXJkcy1iYXNlZCBtZWNoYW5pc20gdG8gZHluYW1pY2FsbHlcbiAqIGxvYWQgYW4gRVMgbW9kdWxlIGF0IHJ1bnRpbWUuXG4gKi9cbmV4cG9ydCB0eXBlIERlcHJlY2F0ZWRMb2FkQ2hpbGRyZW4gPSBzdHJpbmc7XG5cbi8qKlxuICpcbiAqIEhvdyB0byBoYW5kbGUgcXVlcnkgcGFyYW1ldGVycyBpbiBhIHJvdXRlciBsaW5rLlxuICogT25lIG9mOlxuICogLSBgbWVyZ2VgIDogTWVyZ2UgbmV3IHdpdGggY3VycmVudCBwYXJhbWV0ZXJzLlxuICogLSBgcHJlc2VydmVgIDogUHJlc2VydmUgY3VycmVudCBwYXJhbWV0ZXJzLlxuICpcbiAqIEBzZWUgYE5hdmlnYXRpb25FeHRyYXMjcXVlcnlQYXJhbXNIYW5kbGluZ2BcbiAqIEBzZWUgYFJvdXRlckxpbmtgXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIFF1ZXJ5UGFyYW1zSGFuZGxpbmcgPSAnbWVyZ2UnfCdwcmVzZXJ2ZSd8Jyc7XG5cbi8qKlxuICpcbiAqIEEgcG9saWN5IGZvciB3aGVuIHRvIHJ1biBndWFyZHMgYW5kIHJlc29sdmVycyBvbiBhIHJvdXRlLlxuICpcbiAqIEBzZWUgYFJvdXRlI3J1bkd1YXJkc0FuZFJlc29sdmVyc2BcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IHR5cGUgUnVuR3VhcmRzQW5kUmVzb2x2ZXJzID1cbiAgICAncGF0aFBhcmFtc0NoYW5nZSd8J3BhdGhQYXJhbXNPclF1ZXJ5UGFyYW1zQ2hhbmdlJ3wncGFyYW1zQ2hhbmdlJ3wncGFyYW1zT3JRdWVyeVBhcmFtc0NoYW5nZSd8XG4gICAgJ2Fsd2F5cyd8KChmcm9tOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCB0bzogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCkgPT4gYm9vbGVhbik7XG5cbi8qKlxuICogQSBjb25maWd1cmF0aW9uIG9iamVjdCB0aGF0IGRlZmluZXMgYSBzaW5nbGUgcm91dGUuXG4gKiBBIHNldCBvZiByb3V0ZXMgYXJlIGNvbGxlY3RlZCBpbiBhIGBSb3V0ZXNgIGFycmF5IHRvIGRlZmluZSBhIGBSb3V0ZXJgIGNvbmZpZ3VyYXRpb24uXG4gKiBUaGUgcm91dGVyIGF0dGVtcHRzIHRvIG1hdGNoIHNlZ21lbnRzIG9mIGEgZ2l2ZW4gVVJMIGFnYWluc3QgZWFjaCByb3V0ZSxcbiAqIHVzaW5nIHRoZSBjb25maWd1cmF0aW9uIG9wdGlvbnMgZGVmaW5lZCBpbiB0aGlzIG9iamVjdC5cbiAqXG4gKiBTdXBwb3J0cyBzdGF0aWMsIHBhcmFtZXRlcml6ZWQsIHJlZGlyZWN0LCBhbmQgd2lsZGNhcmQgcm91dGVzLCBhcyB3ZWxsIGFzXG4gKiBjdXN0b20gcm91dGUgZGF0YSBhbmQgcmVzb2x2ZSBtZXRob2RzLlxuICpcbiAqIEZvciBkZXRhaWxlZCB1c2FnZSBpbmZvcm1hdGlvbiwgc2VlIHRoZSBbUm91dGluZyBHdWlkZV0oZ3VpZGUvcm91dGVyKS5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqICMjIyBTaW1wbGUgQ29uZmlndXJhdGlvblxuICpcbiAqIFRoZSBmb2xsb3dpbmcgcm91dGUgc3BlY2lmaWVzIHRoYXQgd2hlbiBuYXZpZ2F0aW5nIHRvLCBmb3IgZXhhbXBsZSxcbiAqIGAvdGVhbS8xMS91c2VyL2JvYmAsIHRoZSByb3V0ZXIgY3JlYXRlcyB0aGUgJ1RlYW0nIGNvbXBvbmVudFxuICogd2l0aCB0aGUgJ1VzZXInIGNoaWxkIGNvbXBvbmVudCBpbiBpdC5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gICogIGNvbXBvbmVudDogVGVhbSxcbiAqICAgY2hpbGRyZW46IFt7XG4gKiAgICAgcGF0aDogJ3VzZXIvOm5hbWUnLFxuICogICAgIGNvbXBvbmVudDogVXNlclxuICogICB9XVxuICogfV1cbiAqIGBgYFxuICpcbiAqICMjIyBNdWx0aXBsZSBPdXRsZXRzXG4gKlxuICogVGhlIGZvbGxvd2luZyByb3V0ZSBjcmVhdGVzIHNpYmxpbmcgY29tcG9uZW50cyB3aXRoIG11bHRpcGxlIG91dGxldHMuXG4gKiBXaGVuIG5hdmlnYXRpbmcgdG8gYC90ZWFtLzExKGF1eDpjaGF0L2ppbSlgLCB0aGUgcm91dGVyIGNyZWF0ZXMgdGhlICdUZWFtJyBjb21wb25lbnQgbmV4dCB0b1xuICogdGhlICdDaGF0JyBjb21wb25lbnQuIFRoZSAnQ2hhdCcgY29tcG9uZW50IGlzIHBsYWNlZCBpbnRvIHRoZSAnYXV4JyBvdXRsZXQuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAndGVhbS86aWQnLFxuICogICBjb21wb25lbnQ6IFRlYW1cbiAqIH0sIHtcbiAqICAgcGF0aDogJ2NoYXQvOnVzZXInLFxuICogICBjb21wb25lbnQ6IENoYXRcbiAqICAgb3V0bGV0OiAnYXV4J1xuICogfV1cbiAqIGBgYFxuICpcbiAqICMjIyBXaWxkIENhcmRzXG4gKlxuICogVGhlIGZvbGxvd2luZyByb3V0ZSB1c2VzIHdpbGQtY2FyZCBub3RhdGlvbiB0byBzcGVjaWZ5IGEgY29tcG9uZW50XG4gKiB0aGF0IGlzIGFsd2F5cyBpbnN0YW50aWF0ZWQgcmVnYXJkbGVzcyBvZiB3aGVyZSB5b3UgbmF2aWdhdGUgdG8uXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAnKionLFxuICogICBjb21wb25lbnQ6IFdpbGRjYXJkQ29tcG9uZW50XG4gKiB9XVxuICogYGBgXG4gKlxuICogIyMjIFJlZGlyZWN0c1xuICpcbiAqIFRoZSBmb2xsb3dpbmcgcm91dGUgdXNlcyB0aGUgYHJlZGlyZWN0VG9gIHByb3BlcnR5IHRvIGlnbm9yZSBhIHNlZ21lbnQgb2ZcbiAqIGEgZ2l2ZW4gVVJMIHdoZW4gbG9va2luZyBmb3IgYSBjaGlsZCBwYXRoLlxuICpcbiAqIFdoZW4gbmF2aWdhdGluZyB0byAnL3RlYW0vMTEvbGVnYWN5L3VzZXIvamltJywgdGhlIHJvdXRlciBjaGFuZ2VzIHRoZSBVUkwgc2VnbWVudFxuICogJy90ZWFtLzExL2xlZ2FjeS91c2VyL2ppbScgdG8gJy90ZWFtLzExL3VzZXIvamltJywgYW5kIHRoZW4gaW5zdGFudGlhdGVzXG4gKiB0aGUgVGVhbSBjb21wb25lbnQgd2l0aCB0aGUgVXNlciBjaGlsZCBjb21wb25lbnQgaW4gaXQuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAndGVhbS86aWQnLFxuICogICBjb21wb25lbnQ6IFRlYW0sXG4gKiAgIGNoaWxkcmVuOiBbe1xuICogICAgIHBhdGg6ICdsZWdhY3kvdXNlci86bmFtZScsXG4gKiAgICAgcmVkaXJlY3RUbzogJ3VzZXIvOm5hbWUnXG4gKiAgIH0sIHtcbiAqICAgICBwYXRoOiAndXNlci86bmFtZScsXG4gKiAgICAgY29tcG9uZW50OiBVc2VyXG4gKiAgIH1dXG4gKiB9XVxuICogYGBgXG4gKlxuICogVGhlIHJlZGlyZWN0IHBhdGggY2FuIGJlIHJlbGF0aXZlLCBhcyBzaG93biBpbiB0aGlzIGV4YW1wbGUsIG9yIGFic29sdXRlLlxuICogSWYgd2UgY2hhbmdlIHRoZSBgcmVkaXJlY3RUb2AgdmFsdWUgaW4gdGhlIGV4YW1wbGUgdG8gdGhlIGFic29sdXRlIFVSTCBzZWdtZW50ICcvdXNlci86bmFtZScsXG4gKiB0aGUgcmVzdWx0IFVSTCBpcyBhbHNvIGFic29sdXRlLCAnL3VzZXIvamltJy5cblxuICogIyMjIEVtcHR5IFBhdGhcbiAqXG4gKiBFbXB0eS1wYXRoIHJvdXRlIGNvbmZpZ3VyYXRpb25zIGNhbiBiZSB1c2VkIHRvIGluc3RhbnRpYXRlIGNvbXBvbmVudHMgdGhhdCBkbyBub3QgJ2NvbnN1bWUnXG4gKiBhbnkgVVJMIHNlZ21lbnRzLlxuICpcbiAqIEluIHRoZSBmb2xsb3dpbmcgY29uZmlndXJhdGlvbiwgd2hlbiBuYXZpZ2F0aW5nIHRvXG4gKiBgL3RlYW0vMTFgLCB0aGUgcm91dGVyIGluc3RhbnRpYXRlcyB0aGUgJ0FsbFVzZXJzJyBjb21wb25lbnQuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAndGVhbS86aWQnLFxuICogICBjb21wb25lbnQ6IFRlYW0sXG4gKiAgIGNoaWxkcmVuOiBbe1xuICogICAgIHBhdGg6ICcnLFxuICogICAgIGNvbXBvbmVudDogQWxsVXNlcnNcbiAqICAgfSwge1xuICogICAgIHBhdGg6ICd1c2VyLzpuYW1lJyxcbiAqICAgICBjb21wb25lbnQ6IFVzZXJcbiAqICAgfV1cbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiBFbXB0eS1wYXRoIHJvdXRlcyBjYW4gaGF2ZSBjaGlsZHJlbi4gSW4gdGhlIGZvbGxvd2luZyBleGFtcGxlLCB3aGVuIG5hdmlnYXRpbmdcbiAqIHRvIGAvdGVhbS8xMS91c2VyL2ppbWAsIHRoZSByb3V0ZXIgaW5zdGFudGlhdGVzIHRoZSB3cmFwcGVyIGNvbXBvbmVudCB3aXRoXG4gKiB0aGUgdXNlciBjb21wb25lbnQgaW4gaXQuXG4gKlxuICogTm90ZSB0aGF0IGFuIGVtcHR5IHBhdGggcm91dGUgaW5oZXJpdHMgaXRzIHBhcmVudCdzIHBhcmFtZXRlcnMgYW5kIGRhdGEuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAndGVhbS86aWQnLFxuICogICBjb21wb25lbnQ6IFRlYW0sXG4gKiAgIGNoaWxkcmVuOiBbe1xuICogICAgIHBhdGg6ICcnLFxuICogICAgIGNvbXBvbmVudDogV3JhcHBlckNtcCxcbiAqICAgICBjaGlsZHJlbjogW3tcbiAqICAgICAgIHBhdGg6ICd1c2VyLzpuYW1lJyxcbiAqICAgICAgIGNvbXBvbmVudDogVXNlclxuICogICAgIH1dXG4gKiAgIH1dXG4gKiB9XVxuICogYGBgXG4gKlxuICogIyMjIE1hdGNoaW5nIFN0cmF0ZWd5XG4gKlxuICogVGhlIGRlZmF1bHQgcGF0aC1tYXRjaCBzdHJhdGVneSBpcyAncHJlZml4Jywgd2hpY2ggbWVhbnMgdGhhdCB0aGUgcm91dGVyXG4gKiBjaGVja3MgVVJMIGVsZW1lbnRzIGZyb20gdGhlIGxlZnQgdG8gc2VlIGlmIHRoZSBVUkwgbWF0Y2hlcyBhIHNwZWNpZmllZCBwYXRoLlxuICogRm9yIGV4YW1wbGUsICcvdGVhbS8xMS91c2VyJyBtYXRjaGVzICd0ZWFtLzppZCcuXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAnJyxcbiAqICAgcGF0aE1hdGNoOiAncHJlZml4JywgLy9kZWZhdWx0XG4gKiAgIHJlZGlyZWN0VG86ICdtYWluJ1xuICogfSwge1xuICogICBwYXRoOiAnbWFpbicsXG4gKiAgIGNvbXBvbmVudDogTWFpblxuICogfV1cbiAqIGBgYFxuICpcbiAqIFlvdSBjYW4gc3BlY2lmeSB0aGUgcGF0aC1tYXRjaCBzdHJhdGVneSAnZnVsbCcgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIHBhdGhcbiAqIGNvdmVycyB0aGUgd2hvbGUgdW5jb25zdW1lZCBVUkwuIEl0IGlzIGltcG9ydGFudCB0byBkbyB0aGlzIHdoZW4gcmVkaXJlY3RpbmdcbiAqIGVtcHR5LXBhdGggcm91dGVzLiBPdGhlcndpc2UsIGJlY2F1c2UgYW4gZW1wdHkgcGF0aCBpcyBhIHByZWZpeCBvZiBhbnkgVVJMLFxuICogdGhlIHJvdXRlciB3b3VsZCBhcHBseSB0aGUgcmVkaXJlY3QgZXZlbiB3aGVuIG5hdmlnYXRpbmcgdG8gdGhlIHJlZGlyZWN0IGRlc3RpbmF0aW9uLFxuICogY3JlYXRpbmcgYW4gZW5kbGVzcyBsb29wLlxuICpcbiAqIEluIHRoZSBmb2xsb3dpbmcgZXhhbXBsZSwgc3VwcGx5aW5nIHRoZSAnZnVsbCcgYHBhdGhNYXRjaGAgc3RyYXRlZ3kgZW5zdXJlc1xuICogdGhhdCB0aGUgcm91dGVyIGFwcGxpZXMgdGhlIHJlZGlyZWN0IGlmIGFuZCBvbmx5IGlmIG5hdmlnYXRpbmcgdG8gJy8nLlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJycsXG4gKiAgIHBhdGhNYXRjaDogJ2Z1bGwnLFxuICogICByZWRpcmVjdFRvOiAnbWFpbidcbiAqIH0sIHtcbiAqICAgcGF0aDogJ21haW4nLFxuICogICBjb21wb25lbnQ6IE1haW5cbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiAjIyMgQ29tcG9uZW50bGVzcyBSb3V0ZXNcbiAqXG4gKiBZb3UgY2FuIHNoYXJlIHBhcmFtZXRlcnMgYmV0d2VlbiBzaWJsaW5nIGNvbXBvbmVudHMuXG4gKiBGb3IgZXhhbXBsZSwgc3VwcG9zZSB0aGF0IHR3byBzaWJsaW5nIGNvbXBvbmVudHMgc2hvdWxkIGdvIG5leHQgdG8gZWFjaCBvdGhlcixcbiAqIGFuZCBib3RoIG9mIHRoZW0gcmVxdWlyZSBhbiBJRCBwYXJhbWV0ZXIuIFlvdSBjYW4gYWNjb21wbGlzaCB0aGlzIHVzaW5nIGEgcm91dGVcbiAqIHRoYXQgZG9lcyBub3Qgc3BlY2lmeSBhIGNvbXBvbmVudCBhdCB0aGUgdG9wIGxldmVsLlxuICpcbiAqIEluIHRoZSBmb2xsb3dpbmcgZXhhbXBsZSwgJ01haW5DaGlsZCcgYW5kICdBdXhDaGlsZCcgYXJlIHNpYmxpbmdzLlxuICogV2hlbiBuYXZpZ2F0aW5nIHRvICdwYXJlbnQvMTAvKGEvL2F1eDpiKScsIHRoZSByb3V0ZSBpbnN0YW50aWF0ZXNcbiAqIHRoZSBtYWluIGNoaWxkIGFuZCBhdXggY2hpbGQgY29tcG9uZW50cyBuZXh0IHRvIGVhY2ggb3RoZXIuXG4gKiBGb3IgdGhpcyB0byB3b3JrLCB0aGUgYXBwbGljYXRpb24gY29tcG9uZW50IG11c3QgaGF2ZSB0aGUgcHJpbWFyeSBhbmQgYXV4IG91dGxldHMgZGVmaW5lZC5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgICBwYXRoOiAncGFyZW50LzppZCcsXG4gKiAgICBjaGlsZHJlbjogW1xuICogICAgICB7IHBhdGg6ICdhJywgY29tcG9uZW50OiBNYWluQ2hpbGQgfSxcbiAqICAgICAgeyBwYXRoOiAnYicsIGNvbXBvbmVudDogQXV4Q2hpbGQsIG91dGxldDogJ2F1eCcgfVxuICogICAgXVxuICogfV1cbiAqIGBgYFxuICpcbiAqIFRoZSByb3V0ZXIgbWVyZ2VzIHRoZSBwYXJhbWV0ZXJzLCBkYXRhLCBhbmQgcmVzb2x2ZSBvZiB0aGUgY29tcG9uZW50bGVzc1xuICogcGFyZW50IGludG8gdGhlIHBhcmFtZXRlcnMsIGRhdGEsIGFuZCByZXNvbHZlIG9mIHRoZSBjaGlsZHJlbi5cbiAqXG4gKiBUaGlzIGlzIGVzcGVjaWFsbHkgdXNlZnVsIHdoZW4gY2hpbGQgY29tcG9uZW50cyBhcmUgZGVmaW5lZFxuICogd2l0aCBhbiBlbXB0eSBwYXRoIHN0cmluZywgYXMgaW4gdGhlIGZvbGxvd2luZyBleGFtcGxlLlxuICogV2l0aCB0aGlzIGNvbmZpZ3VyYXRpb24sIG5hdmlnYXRpbmcgdG8gJy9wYXJlbnQvMTAnIGNyZWF0ZXNcbiAqIHRoZSBtYWluIGNoaWxkIGFuZCBhdXggY29tcG9uZW50cy5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgICBwYXRoOiAncGFyZW50LzppZCcsXG4gKiAgICBjaGlsZHJlbjogW1xuICogICAgICB7IHBhdGg6ICcnLCBjb21wb25lbnQ6IE1haW5DaGlsZCB9LFxuICogICAgICB7IHBhdGg6ICcnLCBjb21wb25lbnQ6IEF1eENoaWxkLCBvdXRsZXQ6ICdhdXgnIH1cbiAqICAgIF1cbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiAjIyMgTGF6eSBMb2FkaW5nXG4gKlxuICogTGF6eSBsb2FkaW5nIHNwZWVkcyB1cCBhcHBsaWNhdGlvbiBsb2FkIHRpbWUgYnkgc3BsaXR0aW5nIHRoZSBhcHBsaWNhdGlvblxuICogaW50byBtdWx0aXBsZSBidW5kbGVzIGFuZCBsb2FkaW5nIHRoZW0gb24gZGVtYW5kLlxuICogVG8gdXNlIGxhenkgbG9hZGluZywgcHJvdmlkZSB0aGUgYGxvYWRDaGlsZHJlbmAgcHJvcGVydHkgIGluc3RlYWQgb2YgdGhlIGBjaGlsZHJlbmAgcHJvcGVydHkuXG4gKlxuICogR2l2ZW4gdGhlIGZvbGxvd2luZyBleGFtcGxlIHJvdXRlLCB0aGUgcm91dGVyIHdpbGwgbGF6eSBsb2FkXG4gKiB0aGUgYXNzb2NpYXRlZCBtb2R1bGUgb24gZGVtYW5kIHVzaW5nIHRoZSBicm93c2VyIG5hdGl2ZSBpbXBvcnQgc3lzdGVtLlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJ2xhenknLFxuICogICBsb2FkQ2hpbGRyZW46ICgpID0+IGltcG9ydCgnLi9sYXp5LXJvdXRlL2xhenkubW9kdWxlJykudGhlbihtb2QgPT4gbW9kLkxhenlNb2R1bGUpLFxuICogfV07XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm91dGUge1xuICAvKipcbiAgICogVGhlIHBhdGggdG8gbWF0Y2ggYWdhaW5zdC4gQ2Fubm90IGJlIHVzZWQgdG9nZXRoZXIgd2l0aCBhIGN1c3RvbSBgbWF0Y2hlcmAgZnVuY3Rpb24uXG4gICAqIEEgVVJMIHN0cmluZyB0aGF0IHVzZXMgcm91dGVyIG1hdGNoaW5nIG5vdGF0aW9uLlxuICAgKiBDYW4gYmUgYSB3aWxkIGNhcmQgKGAqKmApIHRoYXQgbWF0Y2hlcyBhbnkgVVJMIChzZWUgVXNhZ2UgTm90ZXMgYmVsb3cpLlxuICAgKiBEZWZhdWx0IGlzIFwiL1wiICh0aGUgcm9vdCBwYXRoKS5cbiAgICpcbiAgICovXG4gIHBhdGg/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBUaGUgcGF0aC1tYXRjaGluZyBzdHJhdGVneSwgb25lIG9mICdwcmVmaXgnIG9yICdmdWxsJy5cbiAgICogRGVmYXVsdCBpcyAncHJlZml4Jy5cbiAgICpcbiAgICogQnkgZGVmYXVsdCwgdGhlIHJvdXRlciBjaGVja3MgVVJMIGVsZW1lbnRzIGZyb20gdGhlIGxlZnQgdG8gc2VlIGlmIHRoZSBVUkxcbiAgICogbWF0Y2hlcyBhIGdpdmVuICBwYXRoLCBhbmQgc3RvcHMgd2hlbiB0aGVyZSBpcyBhIG1hdGNoLiBGb3IgZXhhbXBsZSxcbiAgICogJy90ZWFtLzExL3VzZXInIG1hdGNoZXMgJ3RlYW0vOmlkJy5cbiAgICpcbiAgICogVGhlIHBhdGgtbWF0Y2ggc3RyYXRlZ3kgJ2Z1bGwnIG1hdGNoZXMgYWdhaW5zdCB0aGUgZW50aXJlIFVSTC5cbiAgICogSXQgaXMgaW1wb3J0YW50IHRvIGRvIHRoaXMgd2hlbiByZWRpcmVjdGluZyBlbXB0eS1wYXRoIHJvdXRlcy5cbiAgICogT3RoZXJ3aXNlLCBiZWNhdXNlIGFuIGVtcHR5IHBhdGggaXMgYSBwcmVmaXggb2YgYW55IFVSTCxcbiAgICogdGhlIHJvdXRlciB3b3VsZCBhcHBseSB0aGUgcmVkaXJlY3QgZXZlbiB3aGVuIG5hdmlnYXRpbmdcbiAgICogdG8gdGhlIHJlZGlyZWN0IGRlc3RpbmF0aW9uLCBjcmVhdGluZyBhbiBlbmRsZXNzIGxvb3AuXG4gICAqXG4gICAqL1xuICBwYXRoTWF0Y2g/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBBIGN1c3RvbSBVUkwtbWF0Y2hpbmcgZnVuY3Rpb24uIENhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyIHdpdGggYHBhdGhgLlxuICAgKi9cbiAgbWF0Y2hlcj86IFVybE1hdGNoZXI7XG4gIC8qKlxuICAgKiBUaGUgY29tcG9uZW50IHRvIGluc3RhbnRpYXRlIHdoZW4gdGhlIHBhdGggbWF0Y2hlcy5cbiAgICogQ2FuIGJlIGVtcHR5IGlmIGNoaWxkIHJvdXRlcyBzcGVjaWZ5IGNvbXBvbmVudHMuXG4gICAqL1xuICBjb21wb25lbnQ/OiBUeXBlPGFueT47XG4gIC8qKlxuICAgKiBBIFVSTCB0byB3aGljaCB0byByZWRpcmVjdCB3aGVuIGEgdGhlIHBhdGggbWF0Y2hlcy5cbiAgICogQWJzb2x1dGUgaWYgdGhlIFVSTCBiZWdpbnMgd2l0aCBhIHNsYXNoICgvKSwgb3RoZXJ3aXNlIHJlbGF0aXZlIHRvIHRoZSBwYXRoIFVSTC5cbiAgICogV2hlbiBub3QgcHJlc2VudCwgcm91dGVyIGRvZXMgbm90IHJlZGlyZWN0LlxuICAgKi9cbiAgcmVkaXJlY3RUbz86IHN0cmluZztcbiAgLyoqXG4gICAqIE5hbWUgb2YgYSBgUm91dGVyT3V0bGV0YCBvYmplY3Qgd2hlcmUgdGhlIGNvbXBvbmVudCBjYW4gYmUgcGxhY2VkXG4gICAqIHdoZW4gdGhlIHBhdGggbWF0Y2hlcy5cbiAgICovXG4gIG91dGxldD86IHN0cmluZztcbiAgLyoqXG4gICAqIEFuIGFycmF5IG9mIGRlcGVuZGVuY3ktaW5qZWN0aW9uIHRva2VucyB1c2VkIHRvIGxvb2sgdXAgYENhbkFjdGl2YXRlKClgXG4gICAqIGhhbmRsZXJzLCBpbiBvcmRlciB0byBkZXRlcm1pbmUgaWYgdGhlIGN1cnJlbnQgdXNlciBpcyBhbGxvd2VkIHRvXG4gICAqIGFjdGl2YXRlIHRoZSBjb21wb25lbnQuIEJ5IGRlZmF1bHQsIGFueSB1c2VyIGNhbiBhY3RpdmF0ZS5cbiAgICovXG4gIGNhbkFjdGl2YXRlPzogYW55W107XG4gIC8qKlxuICAgKiBBbiBhcnJheSBvZiBESSB0b2tlbnMgdXNlZCB0byBsb29rIHVwIGBDYW5BY3RpdmF0ZUNoaWxkKClgIGhhbmRsZXJzLFxuICAgKiBpbiBvcmRlciB0byBkZXRlcm1pbmUgaWYgdGhlIGN1cnJlbnQgdXNlciBpcyBhbGxvd2VkIHRvIGFjdGl2YXRlXG4gICAqIGEgY2hpbGQgb2YgdGhlIGNvbXBvbmVudC4gQnkgZGVmYXVsdCwgYW55IHVzZXIgY2FuIGFjdGl2YXRlIGEgY2hpbGQuXG4gICAqL1xuICBjYW5BY3RpdmF0ZUNoaWxkPzogYW55W107XG4gIC8qKlxuICAgKiBBbiBhcnJheSBvZiBESSB0b2tlbnMgdXNlZCB0byBsb29rIHVwIGBDYW5EZWFjdGl2YXRlKClgXG4gICAqIGhhbmRsZXJzLCBpbiBvcmRlciB0byBkZXRlcm1pbmUgaWYgdGhlIGN1cnJlbnQgdXNlciBpcyBhbGxvd2VkIHRvXG4gICAqIGRlYWN0aXZhdGUgdGhlIGNvbXBvbmVudC4gQnkgZGVmYXVsdCwgYW55IHVzZXIgY2FuIGRlYWN0aXZhdGUuXG4gICAqXG4gICAqL1xuICBjYW5EZWFjdGl2YXRlPzogYW55W107XG4gIC8qKlxuICAgKiBBbiBhcnJheSBvZiBESSB0b2tlbnMgdXNlZCB0byBsb29rIHVwIGBDYW5Mb2FkKClgXG4gICAqIGhhbmRsZXJzLCBpbiBvcmRlciB0byBkZXRlcm1pbmUgaWYgdGhlIGN1cnJlbnQgdXNlciBpcyBhbGxvd2VkIHRvXG4gICAqIGxvYWQgdGhlIGNvbXBvbmVudC4gQnkgZGVmYXVsdCwgYW55IHVzZXIgY2FuIGxvYWQuXG4gICAqL1xuICBjYW5Mb2FkPzogYW55W107XG4gIC8qKlxuICAgKiBBZGRpdGlvbmFsIGRldmVsb3Blci1kZWZpbmVkIGRhdGEgcHJvdmlkZWQgdG8gdGhlIGNvbXBvbmVudCB2aWFcbiAgICogYEFjdGl2YXRlZFJvdXRlYC4gQnkgZGVmYXVsdCwgbm8gYWRkaXRpb25hbCBkYXRhIGlzIHBhc3NlZC5cbiAgICovXG4gIGRhdGE/OiBEYXRhO1xuICAvKipcbiAgICogQSBtYXAgb2YgREkgdG9rZW5zIHVzZWQgdG8gbG9vayB1cCBkYXRhIHJlc29sdmVycy4gU2VlIGBSZXNvbHZlYC5cbiAgICovXG4gIHJlc29sdmU/OiBSZXNvbHZlRGF0YTtcbiAgLyoqXG4gICAqIEFuIGFycmF5IG9mIGNoaWxkIGBSb3V0ZWAgb2JqZWN0cyB0aGF0IHNwZWNpZmllcyBhIG5lc3RlZCByb3V0ZVxuICAgKiBjb25maWd1cmF0aW9uLlxuICAgKi9cbiAgY2hpbGRyZW4/OiBSb3V0ZXM7XG4gIC8qKlxuICAgKiBBIGBMb2FkQ2hpbGRyZW5gIG9iamVjdCBzcGVjaWZ5aW5nIGxhenktbG9hZGVkIGNoaWxkIHJvdXRlcy5cbiAgICovXG4gIGxvYWRDaGlsZHJlbj86IExvYWRDaGlsZHJlbjtcbiAgLyoqXG4gICAqIERlZmluZXMgd2hlbiBndWFyZHMgYW5kIHJlc29sdmVycyB3aWxsIGJlIHJ1bi4gT25lIG9mXG4gICAqIC0gYHBhcmFtc09yUXVlcnlQYXJhbXNDaGFuZ2VgIDogUnVuIHdoZW4gcXVlcnkgcGFyYW1ldGVycyBjaGFuZ2UuXG4gICAqIC0gYGFsd2F5c2AgOiBSdW4gb24gZXZlcnkgZXhlY3V0aW9uLlxuICAgKiBCeSBkZWZhdWx0LCBndWFyZHMgYW5kIHJlc29sdmVycyBydW4gb25seSB3aGVuIHRoZSBtYXRyaXhcbiAgICogcGFyYW1ldGVycyBvZiB0aGUgcm91dGUgY2hhbmdlLlxuICAgKi9cbiAgcnVuR3VhcmRzQW5kUmVzb2x2ZXJzPzogUnVuR3VhcmRzQW5kUmVzb2x2ZXJzO1xuICAvKipcbiAgICogRmlsbGVkIGZvciByb3V0ZXMgd2l0aCBgbG9hZENoaWxkcmVuYCBvbmNlIHRoZSBtb2R1bGUgaGFzIGJlZW4gbG9hZGVkXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgX2xvYWRlZENvbmZpZz86IExvYWRlZFJvdXRlckNvbmZpZztcbn1cblxuZXhwb3J0IGNsYXNzIExvYWRlZFJvdXRlckNvbmZpZyB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByb3V0ZXM6IFJvdXRlW10sIHB1YmxpYyBtb2R1bGU6IE5nTW9kdWxlUmVmPGFueT4pIHt9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbmZpZyhjb25maWc6IFJvdXRlcywgcGFyZW50UGF0aDogc3RyaW5nID0gJycpOiB2b2lkIHtcbiAgLy8gZm9yRWFjaCBkb2Vzbid0IGl0ZXJhdGUgdW5kZWZpbmVkIHZhbHVlc1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbmZpZy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHJvdXRlOiBSb3V0ZSA9IGNvbmZpZ1tpXTtcbiAgICBjb25zdCBmdWxsUGF0aDogc3RyaW5nID0gZ2V0RnVsbFBhdGgocGFyZW50UGF0aCwgcm91dGUpO1xuICAgIHZhbGlkYXRlTm9kZShyb3V0ZSwgZnVsbFBhdGgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlTm9kZShyb3V0ZTogUm91dGUsIGZ1bGxQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKCFyb3V0ZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgXG4gICAgICBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogRW5jb3VudGVyZWQgdW5kZWZpbmVkIHJvdXRlLlxuICAgICAgVGhlIHJlYXNvbiBtaWdodCBiZSBhbiBleHRyYSBjb21tYS5cblxuICAgICAgRXhhbXBsZTpcbiAgICAgIGNvbnN0IHJvdXRlczogUm91dGVzID0gW1xuICAgICAgICB7IHBhdGg6ICcnLCByZWRpcmVjdFRvOiAnL2Rhc2hib2FyZCcsIHBhdGhNYXRjaDogJ2Z1bGwnIH0sXG4gICAgICAgIHsgcGF0aDogJ2Rhc2hib2FyZCcsICBjb21wb25lbnQ6IERhc2hib2FyZENvbXBvbmVudCB9LCwgPDwgdHdvIGNvbW1hc1xuICAgICAgICB7IHBhdGg6ICdkZXRhaWwvOmlkJywgY29tcG9uZW50OiBIZXJvRGV0YWlsQ29tcG9uZW50IH1cbiAgICAgIF07XG4gICAgYCk7XG4gIH1cbiAgaWYgKEFycmF5LmlzQXJyYXkocm91dGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogQXJyYXkgY2Fubm90IGJlIHNwZWNpZmllZGApO1xuICB9XG4gIGlmICghcm91dGUuY29tcG9uZW50ICYmICFyb3V0ZS5jaGlsZHJlbiAmJiAhcm91dGUubG9hZENoaWxkcmVuICYmXG4gICAgICAocm91dGUub3V0bGV0ICYmIHJvdXRlLm91dGxldCAhPT0gUFJJTUFSWV9PVVRMRVQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7XG4gICAgICAgIGZ1bGxQYXRofSc6IGEgY29tcG9uZW50bGVzcyByb3V0ZSB3aXRob3V0IGNoaWxkcmVuIG9yIGxvYWRDaGlsZHJlbiBjYW5ub3QgaGF2ZSBhIG5hbWVkIG91dGxldCBzZXRgKTtcbiAgfVxuICBpZiAocm91dGUucmVkaXJlY3RUbyAmJiByb3V0ZS5jaGlsZHJlbikge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke1xuICAgICAgICBmdWxsUGF0aH0nOiByZWRpcmVjdFRvIGFuZCBjaGlsZHJlbiBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmApO1xuICB9XG4gIGlmIChyb3V0ZS5yZWRpcmVjdFRvICYmIHJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke1xuICAgICAgICBmdWxsUGF0aH0nOiByZWRpcmVjdFRvIGFuZCBsb2FkQ2hpbGRyZW4gY2Fubm90IGJlIHVzZWQgdG9nZXRoZXJgKTtcbiAgfVxuICBpZiAocm91dGUuY2hpbGRyZW4gJiYgcm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7XG4gICAgICAgIGZ1bGxQYXRofSc6IGNoaWxkcmVuIGFuZCBsb2FkQ2hpbGRyZW4gY2Fubm90IGJlIHVzZWQgdG9nZXRoZXJgKTtcbiAgfVxuICBpZiAocm91dGUucmVkaXJlY3RUbyAmJiByb3V0ZS5jb21wb25lbnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgZnVsbFBhdGh9JzogcmVkaXJlY3RUbyBhbmQgY29tcG9uZW50IGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gIH1cbiAgaWYgKHJvdXRlLnBhdGggJiYgcm91dGUubWF0Y2hlcikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBwYXRoIGFuZCBtYXRjaGVyIGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gIH1cbiAgaWYgKHJvdXRlLnJlZGlyZWN0VG8gPT09IHZvaWQgMCAmJiAhcm91dGUuY29tcG9uZW50ICYmICFyb3V0ZS5jaGlsZHJlbiAmJiAhcm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7XG4gICAgICAgIGZ1bGxQYXRofScuIE9uZSBvZiB0aGUgZm9sbG93aW5nIG11c3QgYmUgcHJvdmlkZWQ6IGNvbXBvbmVudCwgcmVkaXJlY3RUbywgY2hpbGRyZW4gb3IgbG9hZENoaWxkcmVuYCk7XG4gIH1cbiAgaWYgKHJvdXRlLnBhdGggPT09IHZvaWQgMCAmJiByb3V0ZS5tYXRjaGVyID09PSB2b2lkIDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgZnVsbFBhdGh9Jzogcm91dGVzIG11c3QgaGF2ZSBlaXRoZXIgYSBwYXRoIG9yIGEgbWF0Y2hlciBzcGVjaWZpZWRgKTtcbiAgfVxuICBpZiAodHlwZW9mIHJvdXRlLnBhdGggPT09ICdzdHJpbmcnICYmIHJvdXRlLnBhdGguY2hhckF0KDApID09PSAnLycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBwYXRoIGNhbm5vdCBzdGFydCB3aXRoIGEgc2xhc2hgKTtcbiAgfVxuICBpZiAocm91dGUucGF0aCA9PT0gJycgJiYgcm91dGUucmVkaXJlY3RUbyAhPT0gdm9pZCAwICYmIHJvdXRlLnBhdGhNYXRjaCA9PT0gdm9pZCAwKSB7XG4gICAgY29uc3QgZXhwID1cbiAgICAgICAgYFRoZSBkZWZhdWx0IHZhbHVlIG9mICdwYXRoTWF0Y2gnIGlzICdwcmVmaXgnLCBidXQgb2Z0ZW4gdGhlIGludGVudCBpcyB0byB1c2UgJ2Z1bGwnLmA7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJ3twYXRoOiBcIiR7ZnVsbFBhdGh9XCIsIHJlZGlyZWN0VG86IFwiJHtcbiAgICAgICAgcm91dGUucmVkaXJlY3RUb31cIn0nOiBwbGVhc2UgcHJvdmlkZSAncGF0aE1hdGNoJy4gJHtleHB9YCk7XG4gIH1cbiAgaWYgKHJvdXRlLnBhdGhNYXRjaCAhPT0gdm9pZCAwICYmIHJvdXRlLnBhdGhNYXRjaCAhPT0gJ2Z1bGwnICYmIHJvdXRlLnBhdGhNYXRjaCAhPT0gJ3ByZWZpeCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgZnVsbFBhdGh9JzogcGF0aE1hdGNoIGNhbiBvbmx5IGJlIHNldCB0byAncHJlZml4JyBvciAnZnVsbCdgKTtcbiAgfVxuICBpZiAocm91dGUuY2hpbGRyZW4pIHtcbiAgICB2YWxpZGF0ZUNvbmZpZyhyb3V0ZS5jaGlsZHJlbiwgZnVsbFBhdGgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEZ1bGxQYXRoKHBhcmVudFBhdGg6IHN0cmluZywgY3VycmVudFJvdXRlOiBSb3V0ZSk6IHN0cmluZyB7XG4gIGlmICghY3VycmVudFJvdXRlKSB7XG4gICAgcmV0dXJuIHBhcmVudFBhdGg7XG4gIH1cbiAgaWYgKCFwYXJlbnRQYXRoICYmICFjdXJyZW50Um91dGUucGF0aCkge1xuICAgIHJldHVybiAnJztcbiAgfSBlbHNlIGlmIChwYXJlbnRQYXRoICYmICFjdXJyZW50Um91dGUucGF0aCkge1xuICAgIHJldHVybiBgJHtwYXJlbnRQYXRofS9gO1xuICB9IGVsc2UgaWYgKCFwYXJlbnRQYXRoICYmIGN1cnJlbnRSb3V0ZS5wYXRoKSB7XG4gICAgcmV0dXJuIGN1cnJlbnRSb3V0ZS5wYXRoO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBgJHtwYXJlbnRQYXRofS8ke2N1cnJlbnRSb3V0ZS5wYXRofWA7XG4gIH1cbn1cblxuLyoqXG4gKiBNYWtlcyBhIGNvcHkgb2YgdGhlIGNvbmZpZyBhbmQgYWRkcyBhbnkgZGVmYXVsdCByZXF1aXJlZCBwcm9wZXJ0aWVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RhbmRhcmRpemVDb25maWcocjogUm91dGUpOiBSb3V0ZSB7XG4gIGNvbnN0IGNoaWxkcmVuID0gci5jaGlsZHJlbiAmJiByLmNoaWxkcmVuLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gIGNvbnN0IGMgPSBjaGlsZHJlbiA/IHsuLi5yLCBjaGlsZHJlbn0gOiB7Li4ucn07XG4gIGlmICghYy5jb21wb25lbnQgJiYgKGNoaWxkcmVuIHx8IGMubG9hZENoaWxkcmVuKSAmJiAoYy5vdXRsZXQgJiYgYy5vdXRsZXQgIT09IFBSSU1BUllfT1VUTEVUKSkge1xuICAgIGMuY29tcG9uZW50ID0gRW1wdHlPdXRsZXRDb21wb25lbnQ7XG4gIH1cbiAgcmV0dXJuIGM7XG59XG4iXX0=