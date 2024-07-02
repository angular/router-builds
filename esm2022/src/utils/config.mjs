/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createEnvironmentInjector, isStandalone, ɵisNgModule as isNgModule, ɵRuntimeError as RuntimeError, } from '@angular/core';
import { PRIMARY_OUTLET } from '../shared';
/**
 * Creates an `EnvironmentInjector` if the `Route` has providers and one does not already exist
 * and returns the injector. Otherwise, if the `Route` does not have `providers`, returns the
 * `currentInjector`.
 *
 * @param route The route that might have providers
 * @param currentInjector The parent injector of the `Route`
 */
export function getOrCreateRouteInjectorIfNeeded(route, currentInjector) {
    if (route.providers && !route._injector) {
        route._injector = createEnvironmentInjector(route.providers, currentInjector, `Route: ${route.path}`);
    }
    return route._injector ?? currentInjector;
}
export function getLoadedRoutes(route) {
    return route._loadedRoutes;
}
export function getLoadedInjector(route) {
    return route._loadedInjector;
}
export function getLoadedComponent(route) {
    return route._loadedComponent;
}
export function getProvidersInjector(route) {
    return route._injector;
}
export function validateConfig(config, parentPath = '', requireStandaloneComponents = false) {
    // forEach doesn't iterate undefined values
    for (let i = 0; i < config.length; i++) {
        const route = config[i];
        const fullPath = getFullPath(parentPath, route);
        validateNode(route, fullPath, requireStandaloneComponents);
    }
}
export function assertStandalone(fullPath, component) {
    if (component && isNgModule(component)) {
        throw new RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}'. You are using 'loadComponent' with a module, ` +
            `but it must be used with standalone components. Use 'loadChildren' instead.`);
    }
    else if (component && !isStandalone(component)) {
        throw new RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}'. The component must be standalone.`);
    }
}
function validateNode(route, fullPath, requireStandaloneComponents) {
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
        if (!route) {
            throw new RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `
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
            throw new RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': Array cannot be specified`);
        }
        if (!route.redirectTo &&
            !route.component &&
            !route.loadComponent &&
            !route.children &&
            !route.loadChildren &&
            route.outlet &&
            route.outlet !== PRIMARY_OUTLET) {
            throw new RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': a componentless route without children or loadChildren cannot have a named outlet set`);
        }
        if (route.redirectTo && route.children) {
            throw new RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': redirectTo and children cannot be used together`);
        }
        if (route.redirectTo && route.loadChildren) {
            throw new RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': redirectTo and loadChildren cannot be used together`);
        }
        if (route.children && route.loadChildren) {
            throw new RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': children and loadChildren cannot be used together`);
        }
        if (route.redirectTo && (route.component || route.loadComponent)) {
            throw new RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': redirectTo and component/loadComponent cannot be used together`);
        }
        if (route.component && route.loadComponent) {
            throw new RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': component and loadComponent cannot be used together`);
        }
        if (route.redirectTo && route.canActivate) {
            throw new RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': redirectTo and canActivate cannot be used together. Redirects happen before activation ` +
                `so canActivate will never be executed.`);
        }
        if (route.path && route.matcher) {
            throw new RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': path and matcher cannot be used together`);
        }
        if (route.redirectTo === void 0 &&
            !route.component &&
            !route.loadComponent &&
            !route.children &&
            !route.loadChildren) {
            throw new RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}'. One of the following must be provided: component, loadComponent, redirectTo, children or loadChildren`);
        }
        if (route.path === void 0 && route.matcher === void 0) {
            throw new RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': routes must have either a path or a matcher specified`);
        }
        if (typeof route.path === 'string' && route.path.charAt(0) === '/') {
            throw new RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': path cannot start with a slash`);
        }
        if (route.path === '' && route.redirectTo !== void 0 && route.pathMatch === void 0) {
            const exp = `The default value of 'pathMatch' is 'prefix', but often the intent is to use 'full'.`;
            throw new RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '{path: "${fullPath}", redirectTo: "${route.redirectTo}"}': please provide 'pathMatch'. ${exp}`);
        }
        if (requireStandaloneComponents) {
            assertStandalone(fullPath, route.component);
        }
    }
    if (route.children) {
        validateConfig(route.children, fullPath, requireStandaloneComponents);
    }
}
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
/** Returns the `route.outlet` or PRIMARY_OUTLET if none exists. */
export function getOutlet(route) {
    return route.outlet || PRIMARY_OUTLET;
}
/**
 * Sorts the `routes` such that the ones with an outlet matching `outletName` come first.
 * The order of the configs is otherwise preserved.
 */
export function sortByMatchingOutlets(routes, outletName) {
    const sortedConfig = routes.filter((r) => getOutlet(r) === outletName);
    sortedConfig.push(...routes.filter((r) => getOutlet(r) !== outletName));
    return sortedConfig;
}
/**
 * Gets the first injector in the snapshot's parent tree.
 *
 * If the `Route` has a static list of providers, the returned injector will be the one created from
 * those. If it does not exist, the returned injector may come from the parents, which may be from a
 * loaded config or their static providers.
 *
 * Returns `null` if there is neither this nor any parents have a stored injector.
 *
 * Generally used for retrieving the injector to use for getting tokens for guards/resolvers and
 * also used for getting the correct injector to use for creating components.
 */
export function getClosestRouteInjector(snapshot) {
    if (!snapshot)
        return null;
    // If the current route has its own injector, which is created from the static providers on the
    // route itself, we should use that. Otherwise, we start at the parent since we do not want to
    // include the lazy loaded injector from this route.
    if (snapshot.routeConfig?._injector) {
        return snapshot.routeConfig._injector;
    }
    for (let s = snapshot.parent; s; s = s.parent) {
        const route = s.routeConfig;
        // Note that the order here is important. `_loadedInjector` stored on the route with
        // `loadChildren: () => NgModule` so it applies to child routes with priority. The `_injector`
        // is created from the static providers on that parent route, so it applies to the children as
        // well, but only if there is no lazy loaded NgModuleRef injector.
        if (route?._loadedInjector)
            return route._loadedInjector;
        if (route?._injector)
            return route._injector;
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy91dGlscy9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUNMLHlCQUF5QixFQUV6QixZQUFZLEVBRVosV0FBVyxJQUFJLFVBQVUsRUFDekIsYUFBYSxJQUFJLFlBQVksR0FDOUIsTUFBTSxlQUFlLENBQUM7QUFLdkIsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUV6Qzs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxVQUFVLGdDQUFnQyxDQUM5QyxLQUFZLEVBQ1osZUFBb0M7SUFFcEMsSUFBSSxLQUFLLENBQUMsU0FBUyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3hDLEtBQUssQ0FBQyxTQUFTLEdBQUcseUJBQXlCLENBQ3pDLEtBQUssQ0FBQyxTQUFTLEVBQ2YsZUFBZSxFQUNmLFVBQVUsS0FBSyxDQUFDLElBQUksRUFBRSxDQUN2QixDQUFDO0lBQ0osQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFDLFNBQVMsSUFBSSxlQUFlLENBQUM7QUFDNUMsQ0FBQztBQUVELE1BQU0sVUFBVSxlQUFlLENBQUMsS0FBWTtJQUMxQyxPQUFPLEtBQUssQ0FBQyxhQUFhLENBQUM7QUFDN0IsQ0FBQztBQUVELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxLQUFZO0lBQzVDLE9BQU8sS0FBSyxDQUFDLGVBQWUsQ0FBQztBQUMvQixDQUFDO0FBQ0QsTUFBTSxVQUFVLGtCQUFrQixDQUFDLEtBQVk7SUFDN0MsT0FBTyxLQUFLLENBQUMsZ0JBQWdCLENBQUM7QUFDaEMsQ0FBQztBQUVELE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxLQUFZO0lBQy9DLE9BQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQztBQUN6QixDQUFDO0FBRUQsTUFBTSxVQUFVLGNBQWMsQ0FD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LEtBQUssQ0FBQyxTQUFTLENBQUM7SUFDL0MsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1xuICBjcmVhdGVFbnZpcm9ubWVudEluamVjdG9yLFxuICBFbnZpcm9ubWVudEluamVjdG9yLFxuICBpc1N0YW5kYWxvbmUsXG4gIFR5cGUsXG4gIMm1aXNOZ01vZHVsZSBhcyBpc05nTW9kdWxlLFxuICDJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3IsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQge1J1bnRpbWVFcnJvckNvZGV9IGZyb20gJy4uL2Vycm9ycyc7XG5pbXBvcnQge1JvdXRlLCBSb3V0ZXN9IGZyb20gJy4uL21vZGVscyc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3R9IGZyb20gJy4uL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BSSU1BUllfT1VUTEVUfSBmcm9tICcuLi9zaGFyZWQnO1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gYEVudmlyb25tZW50SW5qZWN0b3JgIGlmIHRoZSBgUm91dGVgIGhhcyBwcm92aWRlcnMgYW5kIG9uZSBkb2VzIG5vdCBhbHJlYWR5IGV4aXN0XG4gKiBhbmQgcmV0dXJucyB0aGUgaW5qZWN0b3IuIE90aGVyd2lzZSwgaWYgdGhlIGBSb3V0ZWAgZG9lcyBub3QgaGF2ZSBgcHJvdmlkZXJzYCwgcmV0dXJucyB0aGVcbiAqIGBjdXJyZW50SW5qZWN0b3JgLlxuICpcbiAqIEBwYXJhbSByb3V0ZSBUaGUgcm91dGUgdGhhdCBtaWdodCBoYXZlIHByb3ZpZGVyc1xuICogQHBhcmFtIGN1cnJlbnRJbmplY3RvciBUaGUgcGFyZW50IGluamVjdG9yIG9mIHRoZSBgUm91dGVgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRPckNyZWF0ZVJvdXRlSW5qZWN0b3JJZk5lZWRlZChcbiAgcm91dGU6IFJvdXRlLFxuICBjdXJyZW50SW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsXG4pIHtcbiAgaWYgKHJvdXRlLnByb3ZpZGVycyAmJiAhcm91dGUuX2luamVjdG9yKSB7XG4gICAgcm91dGUuX2luamVjdG9yID0gY3JlYXRlRW52aXJvbm1lbnRJbmplY3RvcihcbiAgICAgIHJvdXRlLnByb3ZpZGVycyxcbiAgICAgIGN1cnJlbnRJbmplY3RvcixcbiAgICAgIGBSb3V0ZTogJHtyb3V0ZS5wYXRofWAsXG4gICAgKTtcbiAgfVxuICByZXR1cm4gcm91dGUuX2luamVjdG9yID8/IGN1cnJlbnRJbmplY3Rvcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldExvYWRlZFJvdXRlcyhyb3V0ZTogUm91dGUpOiBSb3V0ZVtdIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIHJvdXRlLl9sb2FkZWRSb3V0ZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2FkZWRJbmplY3Rvcihyb3V0ZTogUm91dGUpOiBFbnZpcm9ubWVudEluamVjdG9yIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIHJvdXRlLl9sb2FkZWRJbmplY3Rvcjtcbn1cbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2FkZWRDb21wb25lbnQocm91dGU6IFJvdXRlKTogVHlwZTx1bmtub3duPiB8IHVuZGVmaW5lZCB7XG4gIHJldHVybiByb3V0ZS5fbG9hZGVkQ29tcG9uZW50O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvdmlkZXJzSW5qZWN0b3Iocm91dGU6IFJvdXRlKTogRW52aXJvbm1lbnRJbmplY3RvciB8IHVuZGVmaW5lZCB7XG4gIHJldHVybiByb3V0ZS5faW5qZWN0b3I7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbmZpZyhcbiAgY29uZmlnOiBSb3V0ZXMsXG4gIHBhcmVudFBhdGg6IHN0cmluZyA9ICcnLFxuICByZXF1aXJlU3RhbmRhbG9uZUNvbXBvbmVudHMgPSBmYWxzZSxcbik6IHZvaWQge1xuICAvLyBmb3JFYWNoIGRvZXNuJ3QgaXRlcmF0ZSB1bmRlZmluZWQgdmFsdWVzXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29uZmlnLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3Qgcm91dGU6IFJvdXRlID0gY29uZmlnW2ldO1xuICAgIGNvbnN0IGZ1bGxQYXRoOiBzdHJpbmcgPSBnZXRGdWxsUGF0aChwYXJlbnRQYXRoLCByb3V0ZSk7XG4gICAgdmFsaWRhdGVOb2RlKHJvdXRlLCBmdWxsUGF0aCwgcmVxdWlyZVN0YW5kYWxvbmVDb21wb25lbnRzKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0U3RhbmRhbG9uZShmdWxsUGF0aDogc3RyaW5nLCBjb21wb25lbnQ6IFR5cGU8dW5rbm93bj4gfCB1bmRlZmluZWQpIHtcbiAgaWYgKGNvbXBvbmVudCAmJiBpc05nTW9kdWxlKGNvbXBvbmVudCkpIHtcbiAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgUnVudGltZUVycm9yQ29kZS5JTlZBTElEX1JPVVRFX0NPTkZJRyxcbiAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9Jy4gWW91IGFyZSB1c2luZyAnbG9hZENvbXBvbmVudCcgd2l0aCBhIG1vZHVsZSwgYCArXG4gICAgICAgIGBidXQgaXQgbXVzdCBiZSB1c2VkIHdpdGggc3RhbmRhbG9uZSBjb21wb25lbnRzLiBVc2UgJ2xvYWRDaGlsZHJlbicgaW5zdGVhZC5gLFxuICAgICk7XG4gIH0gZWxzZSBpZiAoY29tcG9uZW50ICYmICFpc1N0YW5kYWxvbmUoY29tcG9uZW50KSkge1xuICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICBSdW50aW1lRXJyb3JDb2RlLklOVkFMSURfUk9VVEVfQ09ORklHLFxuICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nLiBUaGUgY29tcG9uZW50IG11c3QgYmUgc3RhbmRhbG9uZS5gLFxuICAgICk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVOb2RlKHJvdXRlOiBSb3V0ZSwgZnVsbFBhdGg6IHN0cmluZywgcmVxdWlyZVN0YW5kYWxvbmVDb21wb25lbnRzOiBib29sZWFuKTogdm9pZCB7XG4gIGlmICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpIHtcbiAgICBpZiAoIXJvdXRlKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICBSdW50aW1lRXJyb3JDb2RlLklOVkFMSURfUk9VVEVfQ09ORklHLFxuICAgICAgICBgXG4gICAgICBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogRW5jb3VudGVyZWQgdW5kZWZpbmVkIHJvdXRlLlxuICAgICAgVGhlIHJlYXNvbiBtaWdodCBiZSBhbiBleHRyYSBjb21tYS5cblxuICAgICAgRXhhbXBsZTpcbiAgICAgIGNvbnN0IHJvdXRlczogUm91dGVzID0gW1xuICAgICAgICB7IHBhdGg6ICcnLCByZWRpcmVjdFRvOiAnL2Rhc2hib2FyZCcsIHBhdGhNYXRjaDogJ2Z1bGwnIH0sXG4gICAgICAgIHsgcGF0aDogJ2Rhc2hib2FyZCcsICBjb21wb25lbnQ6IERhc2hib2FyZENvbXBvbmVudCB9LCwgPDwgdHdvIGNvbW1hc1xuICAgICAgICB7IHBhdGg6ICdkZXRhaWwvOmlkJywgY29tcG9uZW50OiBIZXJvRGV0YWlsQ29tcG9uZW50IH1cbiAgICAgIF07XG4gICAgYCxcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KHJvdXRlKSkge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgUnVudGltZUVycm9yQ29kZS5JTlZBTElEX1JPVVRFX0NPTkZJRyxcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBBcnJheSBjYW5ub3QgYmUgc3BlY2lmaWVkYCxcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChcbiAgICAgICFyb3V0ZS5yZWRpcmVjdFRvICYmXG4gICAgICAhcm91dGUuY29tcG9uZW50ICYmXG4gICAgICAhcm91dGUubG9hZENvbXBvbmVudCAmJlxuICAgICAgIXJvdXRlLmNoaWxkcmVuICYmXG4gICAgICAhcm91dGUubG9hZENoaWxkcmVuICYmXG4gICAgICByb3V0ZS5vdXRsZXQgJiZcbiAgICAgIHJvdXRlLm91dGxldCAhPT0gUFJJTUFSWV9PVVRMRVRcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ST1VURV9DT05GSUcsXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogYSBjb21wb25lbnRsZXNzIHJvdXRlIHdpdGhvdXQgY2hpbGRyZW4gb3IgbG9hZENoaWxkcmVuIGNhbm5vdCBoYXZlIGEgbmFtZWQgb3V0bGV0IHNldGAsXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAocm91dGUucmVkaXJlY3RUbyAmJiByb3V0ZS5jaGlsZHJlbikge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgUnVudGltZUVycm9yQ29kZS5JTlZBTElEX1JPVVRFX0NPTkZJRyxcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiByZWRpcmVjdFRvIGFuZCBjaGlsZHJlbiBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmAsXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAocm91dGUucmVkaXJlY3RUbyAmJiByb3V0ZS5sb2FkQ2hpbGRyZW4pIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ST1VURV9DT05GSUcsXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogcmVkaXJlY3RUbyBhbmQgbG9hZENoaWxkcmVuIGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCxcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChyb3V0ZS5jaGlsZHJlbiAmJiByb3V0ZS5sb2FkQ2hpbGRyZW4pIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ST1VURV9DT05GSUcsXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogY2hpbGRyZW4gYW5kIGxvYWRDaGlsZHJlbiBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmAsXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAocm91dGUucmVkaXJlY3RUbyAmJiAocm91dGUuY29tcG9uZW50IHx8IHJvdXRlLmxvYWRDb21wb25lbnQpKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICBSdW50aW1lRXJyb3JDb2RlLklOVkFMSURfUk9VVEVfQ09ORklHLFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IHJlZGlyZWN0VG8gYW5kIGNvbXBvbmVudC9sb2FkQ29tcG9uZW50IGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCxcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChyb3V0ZS5jb21wb25lbnQgJiYgcm91dGUubG9hZENvbXBvbmVudCkge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgUnVudGltZUVycm9yQ29kZS5JTlZBTElEX1JPVVRFX0NPTkZJRyxcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBjb21wb25lbnQgYW5kIGxvYWRDb21wb25lbnQgY2Fubm90IGJlIHVzZWQgdG9nZXRoZXJgLFxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKHJvdXRlLnJlZGlyZWN0VG8gJiYgcm91dGUuY2FuQWN0aXZhdGUpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ST1VURV9DT05GSUcsXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogcmVkaXJlY3RUbyBhbmQgY2FuQWN0aXZhdGUgY2Fubm90IGJlIHVzZWQgdG9nZXRoZXIuIFJlZGlyZWN0cyBoYXBwZW4gYmVmb3JlIGFjdGl2YXRpb24gYCArXG4gICAgICAgICAgYHNvIGNhbkFjdGl2YXRlIHdpbGwgbmV2ZXIgYmUgZXhlY3V0ZWQuYCxcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChyb3V0ZS5wYXRoICYmIHJvdXRlLm1hdGNoZXIpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ST1VURV9DT05GSUcsXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogcGF0aCBhbmQgbWF0Y2hlciBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmAsXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoXG4gICAgICByb3V0ZS5yZWRpcmVjdFRvID09PSB2b2lkIDAgJiZcbiAgICAgICFyb3V0ZS5jb21wb25lbnQgJiZcbiAgICAgICFyb3V0ZS5sb2FkQ29tcG9uZW50ICYmXG4gICAgICAhcm91dGUuY2hpbGRyZW4gJiZcbiAgICAgICFyb3V0ZS5sb2FkQ2hpbGRyZW5cbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ST1VURV9DT05GSUcsXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9Jy4gT25lIG9mIHRoZSBmb2xsb3dpbmcgbXVzdCBiZSBwcm92aWRlZDogY29tcG9uZW50LCBsb2FkQ29tcG9uZW50LCByZWRpcmVjdFRvLCBjaGlsZHJlbiBvciBsb2FkQ2hpbGRyZW5gLFxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKHJvdXRlLnBhdGggPT09IHZvaWQgMCAmJiByb3V0ZS5tYXRjaGVyID09PSB2b2lkIDApIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ST1VURV9DT05GSUcsXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9Jzogcm91dGVzIG11c3QgaGF2ZSBlaXRoZXIgYSBwYXRoIG9yIGEgbWF0Y2hlciBzcGVjaWZpZWRgLFxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiByb3V0ZS5wYXRoID09PSAnc3RyaW5nJyAmJiByb3V0ZS5wYXRoLmNoYXJBdCgwKSA9PT0gJy8nKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICBSdW50aW1lRXJyb3JDb2RlLklOVkFMSURfUk9VVEVfQ09ORklHLFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IHBhdGggY2Fubm90IHN0YXJ0IHdpdGggYSBzbGFzaGAsXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAocm91dGUucGF0aCA9PT0gJycgJiYgcm91dGUucmVkaXJlY3RUbyAhPT0gdm9pZCAwICYmIHJvdXRlLnBhdGhNYXRjaCA9PT0gdm9pZCAwKSB7XG4gICAgICBjb25zdCBleHAgPSBgVGhlIGRlZmF1bHQgdmFsdWUgb2YgJ3BhdGhNYXRjaCcgaXMgJ3ByZWZpeCcsIGJ1dCBvZnRlbiB0aGUgaW50ZW50IGlzIHRvIHVzZSAnZnVsbCcuYDtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ST1VURV9DT05GSUcsXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJ3twYXRoOiBcIiR7ZnVsbFBhdGh9XCIsIHJlZGlyZWN0VG86IFwiJHtyb3V0ZS5yZWRpcmVjdFRvfVwifSc6IHBsZWFzZSBwcm92aWRlICdwYXRoTWF0Y2gnLiAke2V4cH1gLFxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKHJlcXVpcmVTdGFuZGFsb25lQ29tcG9uZW50cykge1xuICAgICAgYXNzZXJ0U3RhbmRhbG9uZShmdWxsUGF0aCwgcm91dGUuY29tcG9uZW50KTtcbiAgICB9XG4gIH1cbiAgaWYgKHJvdXRlLmNoaWxkcmVuKSB7XG4gICAgdmFsaWRhdGVDb25maWcocm91dGUuY2hpbGRyZW4sIGZ1bGxQYXRoLCByZXF1aXJlU3RhbmRhbG9uZUNvbXBvbmVudHMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEZ1bGxQYXRoKHBhcmVudFBhdGg6IHN0cmluZywgY3VycmVudFJvdXRlOiBSb3V0ZSk6IHN0cmluZyB7XG4gIGlmICghY3VycmVudFJvdXRlKSB7XG4gICAgcmV0dXJuIHBhcmVudFBhdGg7XG4gIH1cbiAgaWYgKCFwYXJlbnRQYXRoICYmICFjdXJyZW50Um91dGUucGF0aCkge1xuICAgIHJldHVybiAnJztcbiAgfSBlbHNlIGlmIChwYXJlbnRQYXRoICYmICFjdXJyZW50Um91dGUucGF0aCkge1xuICAgIHJldHVybiBgJHtwYXJlbnRQYXRofS9gO1xuICB9IGVsc2UgaWYgKCFwYXJlbnRQYXRoICYmIGN1cnJlbnRSb3V0ZS5wYXRoKSB7XG4gICAgcmV0dXJuIGN1cnJlbnRSb3V0ZS5wYXRoO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBgJHtwYXJlbnRQYXRofS8ke2N1cnJlbnRSb3V0ZS5wYXRofWA7XG4gIH1cbn1cblxuLyoqIFJldHVybnMgdGhlIGByb3V0ZS5vdXRsZXRgIG9yIFBSSU1BUllfT1VUTEVUIGlmIG5vbmUgZXhpc3RzLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE91dGxldChyb3V0ZTogUm91dGUpOiBzdHJpbmcge1xuICByZXR1cm4gcm91dGUub3V0bGV0IHx8IFBSSU1BUllfT1VUTEVUO1xufVxuXG4vKipcbiAqIFNvcnRzIHRoZSBgcm91dGVzYCBzdWNoIHRoYXQgdGhlIG9uZXMgd2l0aCBhbiBvdXRsZXQgbWF0Y2hpbmcgYG91dGxldE5hbWVgIGNvbWUgZmlyc3QuXG4gKiBUaGUgb3JkZXIgb2YgdGhlIGNvbmZpZ3MgaXMgb3RoZXJ3aXNlIHByZXNlcnZlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNvcnRCeU1hdGNoaW5nT3V0bGV0cyhyb3V0ZXM6IFJvdXRlcywgb3V0bGV0TmFtZTogc3RyaW5nKTogUm91dGVzIHtcbiAgY29uc3Qgc29ydGVkQ29uZmlnID0gcm91dGVzLmZpbHRlcigocikgPT4gZ2V0T3V0bGV0KHIpID09PSBvdXRsZXROYW1lKTtcbiAgc29ydGVkQ29uZmlnLnB1c2goLi4ucm91dGVzLmZpbHRlcigocikgPT4gZ2V0T3V0bGV0KHIpICE9PSBvdXRsZXROYW1lKSk7XG4gIHJldHVybiBzb3J0ZWRDb25maWc7XG59XG5cbi8qKlxuICogR2V0cyB0aGUgZmlyc3QgaW5qZWN0b3IgaW4gdGhlIHNuYXBzaG90J3MgcGFyZW50IHRyZWUuXG4gKlxuICogSWYgdGhlIGBSb3V0ZWAgaGFzIGEgc3RhdGljIGxpc3Qgb2YgcHJvdmlkZXJzLCB0aGUgcmV0dXJuZWQgaW5qZWN0b3Igd2lsbCBiZSB0aGUgb25lIGNyZWF0ZWQgZnJvbVxuICogdGhvc2UuIElmIGl0IGRvZXMgbm90IGV4aXN0LCB0aGUgcmV0dXJuZWQgaW5qZWN0b3IgbWF5IGNvbWUgZnJvbSB0aGUgcGFyZW50cywgd2hpY2ggbWF5IGJlIGZyb20gYVxuICogbG9hZGVkIGNvbmZpZyBvciB0aGVpciBzdGF0aWMgcHJvdmlkZXJzLlxuICpcbiAqIFJldHVybnMgYG51bGxgIGlmIHRoZXJlIGlzIG5laXRoZXIgdGhpcyBub3IgYW55IHBhcmVudHMgaGF2ZSBhIHN0b3JlZCBpbmplY3Rvci5cbiAqXG4gKiBHZW5lcmFsbHkgdXNlZCBmb3IgcmV0cmlldmluZyB0aGUgaW5qZWN0b3IgdG8gdXNlIGZvciBnZXR0aW5nIHRva2VucyBmb3IgZ3VhcmRzL3Jlc29sdmVycyBhbmRcbiAqIGFsc28gdXNlZCBmb3IgZ2V0dGluZyB0aGUgY29ycmVjdCBpbmplY3RvciB0byB1c2UgZm9yIGNyZWF0aW5nIGNvbXBvbmVudHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDbG9zZXN0Um91dGVJbmplY3RvcihcbiAgc25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QgfCB1bmRlZmluZWQsXG4pOiBFbnZpcm9ubWVudEluamVjdG9yIHwgbnVsbCB7XG4gIGlmICghc25hcHNob3QpIHJldHVybiBudWxsO1xuXG4gIC8vIElmIHRoZSBjdXJyZW50IHJvdXRlIGhhcyBpdHMgb3duIGluamVjdG9yLCB3aGljaCBpcyBjcmVhdGVkIGZyb20gdGhlIHN0YXRpYyBwcm92aWRlcnMgb24gdGhlXG4gIC8vIHJvdXRlIGl0c2VsZiwgd2Ugc2hvdWxkIHVzZSB0aGF0LiBPdGhlcndpc2UsIHdlIHN0YXJ0IGF0IHRoZSBwYXJlbnQgc2luY2Ugd2UgZG8gbm90IHdhbnQgdG9cbiAgLy8gaW5jbHVkZSB0aGUgbGF6eSBsb2FkZWQgaW5qZWN0b3IgZnJvbSB0aGlzIHJvdXRlLlxuICBpZiAoc25hcHNob3Qucm91dGVDb25maWc/Ll9pbmplY3Rvcikge1xuICAgIHJldHVybiBzbmFwc2hvdC5yb3V0ZUNvbmZpZy5faW5qZWN0b3I7XG4gIH1cblxuICBmb3IgKGxldCBzID0gc25hcHNob3QucGFyZW50OyBzOyBzID0gcy5wYXJlbnQpIHtcbiAgICBjb25zdCByb3V0ZSA9IHMucm91dGVDb25maWc7XG4gICAgLy8gTm90ZSB0aGF0IHRoZSBvcmRlciBoZXJlIGlzIGltcG9ydGFudC4gYF9sb2FkZWRJbmplY3RvcmAgc3RvcmVkIG9uIHRoZSByb3V0ZSB3aXRoXG4gICAgLy8gYGxvYWRDaGlsZHJlbjogKCkgPT4gTmdNb2R1bGVgIHNvIGl0IGFwcGxpZXMgdG8gY2hpbGQgcm91dGVzIHdpdGggcHJpb3JpdHkuIFRoZSBgX2luamVjdG9yYFxuICAgIC8vIGlzIGNyZWF0ZWQgZnJvbSB0aGUgc3RhdGljIHByb3ZpZGVycyBvbiB0aGF0IHBhcmVudCByb3V0ZSwgc28gaXQgYXBwbGllcyB0byB0aGUgY2hpbGRyZW4gYXNcbiAgICAvLyB3ZWxsLCBidXQgb25seSBpZiB0aGVyZSBpcyBubyBsYXp5IGxvYWRlZCBOZ01vZHVsZVJlZiBpbmplY3Rvci5cbiAgICBpZiAocm91dGU/Ll9sb2FkZWRJbmplY3RvcikgcmV0dXJuIHJvdXRlLl9sb2FkZWRJbmplY3RvcjtcbiAgICBpZiAocm91dGU/Ll9pbmplY3RvcikgcmV0dXJuIHJvdXRlLl9pbmplY3RvcjtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuIl19