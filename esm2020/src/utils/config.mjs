/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createEnvironmentInjector, ɵisStandalone as isStandalone, ɵRuntimeError as RuntimeError } from '@angular/core';
import { EmptyOutletComponent } from '../components/empty_outlet';
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
        route._injector =
            createEnvironmentInjector(route.providers, currentInjector, `Route: ${route.path}`);
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
    if (component && !isStandalone(component)) {
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
        if (!route.redirectTo && !route.component && !route.loadComponent && !route.children &&
            !route.loadChildren && (route.outlet && route.outlet !== PRIMARY_OUTLET)) {
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
        if (route.redirectTo === void 0 && !route.component && !route.loadComponent &&
            !route.children && !route.loadChildren) {
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
/**
 * Makes a copy of the config and adds any default required properties.
 */
export function standardizeConfig(r) {
    const children = r.children && r.children.map(standardizeConfig);
    const c = children ? { ...r, children } : { ...r };
    if ((!c.component && !c.loadComponent) && (children || c.loadChildren) &&
        (c.outlet && c.outlet !== PRIMARY_OUTLET)) {
        c.component = EmptyOutletComponent;
    }
    return c;
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
    const sortedConfig = routes.filter(r => getOutlet(r) === outletName);
    sortedConfig.push(...routes.filter(r => getOutlet(r) !== outletName));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy91dGlscy9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLHlCQUF5QixFQUE2QixhQUFhLElBQUksWUFBWSxFQUFFLGFBQWEsSUFBSSxZQUFZLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFFakosT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFJaEUsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUV6Qzs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxVQUFVLGdDQUFnQyxDQUM1QyxLQUFZLEVBQUUsZUFBb0M7SUFDcEQsSUFBSSxLQUFLLENBQUMsU0FBUyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRTtRQUN2QyxLQUFLLENBQUMsU0FBUztZQUNYLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsZUFBZSxFQUFFLFVBQVUsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7S0FDekY7SUFDRCxPQUFPLEtBQUssQ0FBQyxTQUFTLElBQUksZUFBZSxDQUFDO0FBQzVDLENBQUM7QUFFRCxNQUFNLFVBQVUsZUFBZSxDQUFDLEtBQVk7SUFDMUMsT0FBTyxLQUFLLENBQUMsYUFBYSxDQUFDO0FBQzdCLENBQUM7QUFFRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsS0FBWTtJQUM1QyxPQUFPLEtBQUssQ0FBQyxlQUFlLENBQUM7QUFDL0IsQ0FBQztBQUNELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxLQUFZO0lBQzdDLE9BQU8sS0FBSyxDQUFDLGdCQUFnQixDQUFDO0FBQ2hDLENBQUM7QUFFRCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsS0FBWTtJQUMvQyxPQUFPLEtBQUssQ0FBQyxTQUFTLENBQUM7QUFDekIsQ0FBQztB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QThGO1FBQzlGLGtFQUFrRTtRQUNsRSxJQUFJLEtBQUssRUFBRSxlQUFlO1lBQUUsT0FBTyxLQUFLLENBQUMsZUFBZSxDQUFDO1FBQ3pELElBQUksS0FBSyxFQUFFLFNBQVM7WUFBRSxPQUFPLEtBQUssQ0FBQyxTQUFTLENBQUM7S0FDOUM7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtjcmVhdGVFbnZpcm9ubWVudEluamVjdG9yLCBFbnZpcm9ubWVudEluamVjdG9yLCBUeXBlLCDJtWlzU3RhbmRhbG9uZSBhcyBpc1N0YW5kYWxvbmUsIMm1UnVudGltZUVycm9yIGFzIFJ1bnRpbWVFcnJvcn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7RW1wdHlPdXRsZXRDb21wb25lbnR9IGZyb20gJy4uL2NvbXBvbmVudHMvZW1wdHlfb3V0bGV0JztcbmltcG9ydCB7UnVudGltZUVycm9yQ29kZX0gZnJvbSAnLi4vZXJyb3JzJztcbmltcG9ydCB7Um91dGUsIFJvdXRlc30gZnJvbSAnLi4vbW9kZWxzJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGVTbmFwc2hvdH0gZnJvbSAnLi4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UFJJTUFSWV9PVVRMRVR9IGZyb20gJy4uL3NoYXJlZCc7XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBgRW52aXJvbm1lbnRJbmplY3RvcmAgaWYgdGhlIGBSb3V0ZWAgaGFzIHByb3ZpZGVycyBhbmQgb25lIGRvZXMgbm90IGFscmVhZHkgZXhpc3RcbiAqIGFuZCByZXR1cm5zIHRoZSBpbmplY3Rvci4gT3RoZXJ3aXNlLCBpZiB0aGUgYFJvdXRlYCBkb2VzIG5vdCBoYXZlIGBwcm92aWRlcnNgLCByZXR1cm5zIHRoZVxuICogYGN1cnJlbnRJbmplY3RvcmAuXG4gKlxuICogQHBhcmFtIHJvdXRlIFRoZSByb3V0ZSB0aGF0IG1pZ2h0IGhhdmUgcHJvdmlkZXJzXG4gKiBAcGFyYW0gY3VycmVudEluamVjdG9yIFRoZSBwYXJlbnQgaW5qZWN0b3Igb2YgdGhlIGBSb3V0ZWBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE9yQ3JlYXRlUm91dGVJbmplY3RvcklmTmVlZGVkKFxuICAgIHJvdXRlOiBSb3V0ZSwgY3VycmVudEluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yKSB7XG4gIGlmIChyb3V0ZS5wcm92aWRlcnMgJiYgIXJvdXRlLl9pbmplY3Rvcikge1xuICAgIHJvdXRlLl9pbmplY3RvciA9XG4gICAgICAgIGNyZWF0ZUVudmlyb25tZW50SW5qZWN0b3Iocm91dGUucHJvdmlkZXJzLCBjdXJyZW50SW5qZWN0b3IsIGBSb3V0ZTogJHtyb3V0ZS5wYXRofWApO1xuICB9XG4gIHJldHVybiByb3V0ZS5faW5qZWN0b3IgPz8gY3VycmVudEluamVjdG9yO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TG9hZGVkUm91dGVzKHJvdXRlOiBSb3V0ZSk6IFJvdXRlW118dW5kZWZpbmVkIHtcbiAgcmV0dXJuIHJvdXRlLl9sb2FkZWRSb3V0ZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2FkZWRJbmplY3Rvcihyb3V0ZTogUm91dGUpOiBFbnZpcm9ubWVudEluamVjdG9yfHVuZGVmaW5lZCB7XG4gIHJldHVybiByb3V0ZS5fbG9hZGVkSW5qZWN0b3I7XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0TG9hZGVkQ29tcG9uZW50KHJvdXRlOiBSb3V0ZSk6IFR5cGU8dW5rbm93bj58dW5kZWZpbmVkIHtcbiAgcmV0dXJuIHJvdXRlLl9sb2FkZWRDb21wb25lbnQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm92aWRlcnNJbmplY3Rvcihyb3V0ZTogUm91dGUpOiBFbnZpcm9ubWVudEluamVjdG9yfHVuZGVmaW5lZCB7XG4gIHJldHVybiByb3V0ZS5faW5qZWN0b3I7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbmZpZyhcbiAgICBjb25maWc6IFJvdXRlcywgcGFyZW50UGF0aDogc3RyaW5nID0gJycsIHJlcXVpcmVTdGFuZGFsb25lQ29tcG9uZW50cyA9IGZhbHNlKTogdm9pZCB7XG4gIC8vIGZvckVhY2ggZG9lc24ndCBpdGVyYXRlIHVuZGVmaW5lZCB2YWx1ZXNcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb25maWcubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCByb3V0ZTogUm91dGUgPSBjb25maWdbaV07XG4gICAgY29uc3QgZnVsbFBhdGg6IHN0cmluZyA9IGdldEZ1bGxQYXRoKHBhcmVudFBhdGgsIHJvdXRlKTtcbiAgICB2YWxpZGF0ZU5vZGUocm91dGUsIGZ1bGxQYXRoLCByZXF1aXJlU3RhbmRhbG9uZUNvbXBvbmVudHMpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRTdGFuZGFsb25lKGZ1bGxQYXRoOiBzdHJpbmcsIGNvbXBvbmVudDogVHlwZTx1bmtub3duPnx1bmRlZmluZWQpIHtcbiAgaWYgKGNvbXBvbmVudCAmJiAhaXNTdGFuZGFsb25lKGNvbXBvbmVudCkpIHtcbiAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICBSdW50aW1lRXJyb3JDb2RlLklOVkFMSURfUk9VVEVfQ09ORklHLFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofScuIFRoZSBjb21wb25lbnQgbXVzdCBiZSBzdGFuZGFsb25lLmApO1xuICB9XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlTm9kZShyb3V0ZTogUm91dGUsIGZ1bGxQYXRoOiBzdHJpbmcsIHJlcXVpcmVTdGFuZGFsb25lQ29tcG9uZW50czogYm9vbGVhbik6IHZvaWQge1xuICBpZiAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSB7XG4gICAgaWYgKCFyb3V0ZSkge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihSdW50aW1lRXJyb3JDb2RlLklOVkFMSURfUk9VVEVfQ09ORklHLCBgXG4gICAgICBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogRW5jb3VudGVyZWQgdW5kZWZpbmVkIHJvdXRlLlxuICAgICAgVGhlIHJlYXNvbiBtaWdodCBiZSBhbiBleHRyYSBjb21tYS5cblxuICAgICAgRXhhbXBsZTpcbiAgICAgIGNvbnN0IHJvdXRlczogUm91dGVzID0gW1xuICAgICAgICB7IHBhdGg6ICcnLCByZWRpcmVjdFRvOiAnL2Rhc2hib2FyZCcsIHBhdGhNYXRjaDogJ2Z1bGwnIH0sXG4gICAgICAgIHsgcGF0aDogJ2Rhc2hib2FyZCcsICBjb21wb25lbnQ6IERhc2hib2FyZENvbXBvbmVudCB9LCwgPDwgdHdvIGNvbW1hc1xuICAgICAgICB7IHBhdGg6ICdkZXRhaWwvOmlkJywgY29tcG9uZW50OiBIZXJvRGV0YWlsQ29tcG9uZW50IH1cbiAgICAgIF07XG4gICAgYCk7XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KHJvdXRlKSkge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLklOVkFMSURfUk9VVEVfQ09ORklHLFxuICAgICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogQXJyYXkgY2Fubm90IGJlIHNwZWNpZmllZGApO1xuICAgIH1cbiAgICBpZiAoIXJvdXRlLnJlZGlyZWN0VG8gJiYgIXJvdXRlLmNvbXBvbmVudCAmJiAhcm91dGUubG9hZENvbXBvbmVudCAmJiAhcm91dGUuY2hpbGRyZW4gJiZcbiAgICAgICAgIXJvdXRlLmxvYWRDaGlsZHJlbiAmJiAocm91dGUub3V0bGV0ICYmIHJvdXRlLm91dGxldCAhPT0gUFJJTUFSWV9PVVRMRVQpKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ST1VURV9DT05GSUcsXG4gICAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgICAgICAgZnVsbFBhdGh9JzogYSBjb21wb25lbnRsZXNzIHJvdXRlIHdpdGhvdXQgY2hpbGRyZW4gb3IgbG9hZENoaWxkcmVuIGNhbm5vdCBoYXZlIGEgbmFtZWQgb3V0bGV0IHNldGApO1xuICAgIH1cbiAgICBpZiAocm91dGUucmVkaXJlY3RUbyAmJiByb3V0ZS5jaGlsZHJlbikge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLklOVkFMSURfUk9VVEVfQ09ORklHLFxuICAgICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7XG4gICAgICAgICAgICAgIGZ1bGxQYXRofSc6IHJlZGlyZWN0VG8gYW5kIGNoaWxkcmVuIGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gICAgfVxuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvICYmIHJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLklOVkFMSURfUk9VVEVfQ09ORklHLFxuICAgICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7XG4gICAgICAgICAgICAgIGZ1bGxQYXRofSc6IHJlZGlyZWN0VG8gYW5kIGxvYWRDaGlsZHJlbiBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmApO1xuICAgIH1cbiAgICBpZiAocm91dGUuY2hpbGRyZW4gJiYgcm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ST1VURV9DT05GSUcsXG4gICAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgICAgICAgZnVsbFBhdGh9JzogY2hpbGRyZW4gYW5kIGxvYWRDaGlsZHJlbiBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmApO1xuICAgIH1cbiAgICBpZiAocm91dGUucmVkaXJlY3RUbyAmJiAocm91dGUuY29tcG9uZW50IHx8IHJvdXRlLmxvYWRDb21wb25lbnQpKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ST1VURV9DT05GSUcsXG4gICAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgICAgICAgZnVsbFBhdGh9JzogcmVkaXJlY3RUbyBhbmQgY29tcG9uZW50L2xvYWRDb21wb25lbnQgY2Fubm90IGJlIHVzZWQgdG9nZXRoZXJgKTtcbiAgICB9XG4gICAgaWYgKHJvdXRlLmNvbXBvbmVudCAmJiByb3V0ZS5sb2FkQ29tcG9uZW50KSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ST1VURV9DT05GSUcsXG4gICAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgICAgICAgZnVsbFBhdGh9JzogY29tcG9uZW50IGFuZCBsb2FkQ29tcG9uZW50IGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gICAgfVxuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvICYmIHJvdXRlLmNhbkFjdGl2YXRlKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ST1VURV9DT05GSUcsXG4gICAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgICAgICAgZnVsbFBhdGh9JzogcmVkaXJlY3RUbyBhbmQgY2FuQWN0aXZhdGUgY2Fubm90IGJlIHVzZWQgdG9nZXRoZXIuIFJlZGlyZWN0cyBoYXBwZW4gYmVmb3JlIGFjdGl2YXRpb24gYCArXG4gICAgICAgICAgICAgIGBzbyBjYW5BY3RpdmF0ZSB3aWxsIG5ldmVyIGJlIGV4ZWN1dGVkLmApO1xuICAgIH1cbiAgICBpZiAocm91dGUucGF0aCAmJiByb3V0ZS5tYXRjaGVyKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ST1VURV9DT05GSUcsXG4gICAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBwYXRoIGFuZCBtYXRjaGVyIGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gICAgfVxuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvID09PSB2b2lkIDAgJiYgIXJvdXRlLmNvbXBvbmVudCAmJiAhcm91dGUubG9hZENvbXBvbmVudCAmJlxuICAgICAgICAhcm91dGUuY2hpbGRyZW4gJiYgIXJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLklOVkFMSURfUk9VVEVfQ09ORklHLFxuICAgICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7XG4gICAgICAgICAgICAgIGZ1bGxQYXRofScuIE9uZSBvZiB0aGUgZm9sbG93aW5nIG11c3QgYmUgcHJvdmlkZWQ6IGNvbXBvbmVudCwgbG9hZENvbXBvbmVudCwgcmVkaXJlY3RUbywgY2hpbGRyZW4gb3IgbG9hZENoaWxkcmVuYCk7XG4gICAgfVxuICAgIGlmIChyb3V0ZS5wYXRoID09PSB2b2lkIDAgJiYgcm91dGUubWF0Y2hlciA9PT0gdm9pZCAwKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ST1VURV9DT05GSUcsXG4gICAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgICAgICAgZnVsbFBhdGh9Jzogcm91dGVzIG11c3QgaGF2ZSBlaXRoZXIgYSBwYXRoIG9yIGEgbWF0Y2hlciBzcGVjaWZpZWRgKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiByb3V0ZS5wYXRoID09PSAnc3RyaW5nJyAmJiByb3V0ZS5wYXRoLmNoYXJBdCgwKSA9PT0gJy8nKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ST1VURV9DT05GSUcsXG4gICAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBwYXRoIGNhbm5vdCBzdGFydCB3aXRoIGEgc2xhc2hgKTtcbiAgICB9XG4gICAgaWYgKHJvdXRlLnBhdGggPT09ICcnICYmIHJvdXRlLnJlZGlyZWN0VG8gIT09IHZvaWQgMCAmJiByb3V0ZS5wYXRoTWF0Y2ggPT09IHZvaWQgMCkge1xuICAgICAgY29uc3QgZXhwID1cbiAgICAgICAgICBgVGhlIGRlZmF1bHQgdmFsdWUgb2YgJ3BhdGhNYXRjaCcgaXMgJ3ByZWZpeCcsIGJ1dCBvZnRlbiB0aGUgaW50ZW50IGlzIHRvIHVzZSAnZnVsbCcuYDtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5JTlZBTElEX1JPVVRFX0NPTkZJRyxcbiAgICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICd7cGF0aDogXCIke2Z1bGxQYXRofVwiLCByZWRpcmVjdFRvOiBcIiR7XG4gICAgICAgICAgICAgIHJvdXRlLnJlZGlyZWN0VG99XCJ9JzogcGxlYXNlIHByb3ZpZGUgJ3BhdGhNYXRjaCcuICR7ZXhwfWApO1xuICAgIH1cbiAgICBpZiAocmVxdWlyZVN0YW5kYWxvbmVDb21wb25lbnRzKSB7XG4gICAgICBhc3NlcnRTdGFuZGFsb25lKGZ1bGxQYXRoLCByb3V0ZS5jb21wb25lbnQpO1xuICAgIH1cbiAgfVxuICBpZiAocm91dGUuY2hpbGRyZW4pIHtcbiAgICB2YWxpZGF0ZUNvbmZpZyhyb3V0ZS5jaGlsZHJlbiwgZnVsbFBhdGgsIHJlcXVpcmVTdGFuZGFsb25lQ29tcG9uZW50cyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RnVsbFBhdGgocGFyZW50UGF0aDogc3RyaW5nLCBjdXJyZW50Um91dGU6IFJvdXRlKTogc3RyaW5nIHtcbiAgaWYgKCFjdXJyZW50Um91dGUpIHtcbiAgICByZXR1cm4gcGFyZW50UGF0aDtcbiAgfVxuICBpZiAoIXBhcmVudFBhdGggJiYgIWN1cnJlbnRSb3V0ZS5wYXRoKSB7XG4gICAgcmV0dXJuICcnO1xuICB9IGVsc2UgaWYgKHBhcmVudFBhdGggJiYgIWN1cnJlbnRSb3V0ZS5wYXRoKSB7XG4gICAgcmV0dXJuIGAke3BhcmVudFBhdGh9L2A7XG4gIH0gZWxzZSBpZiAoIXBhcmVudFBhdGggJiYgY3VycmVudFJvdXRlLnBhdGgpIHtcbiAgICByZXR1cm4gY3VycmVudFJvdXRlLnBhdGg7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGAke3BhcmVudFBhdGh9LyR7Y3VycmVudFJvdXRlLnBhdGh9YDtcbiAgfVxufVxuXG4vKipcbiAqIE1ha2VzIGEgY29weSBvZiB0aGUgY29uZmlnIGFuZCBhZGRzIGFueSBkZWZhdWx0IHJlcXVpcmVkIHByb3BlcnRpZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGFuZGFyZGl6ZUNvbmZpZyhyOiBSb3V0ZSk6IFJvdXRlIHtcbiAgY29uc3QgY2hpbGRyZW4gPSByLmNoaWxkcmVuICYmIHIuY2hpbGRyZW4ubWFwKHN0YW5kYXJkaXplQ29uZmlnKTtcbiAgY29uc3QgYyA9IGNoaWxkcmVuID8gey4uLnIsIGNoaWxkcmVufSA6IHsuLi5yfTtcbiAgaWYgKCghYy5jb21wb25lbnQgJiYgIWMubG9hZENvbXBvbmVudCkgJiYgKGNoaWxkcmVuIHx8IGMubG9hZENoaWxkcmVuKSAmJlxuICAgICAgKGMub3V0bGV0ICYmIGMub3V0bGV0ICE9PSBQUklNQVJZX09VVExFVCkpIHtcbiAgICBjLmNvbXBvbmVudCA9IEVtcHR5T3V0bGV0Q29tcG9uZW50O1xuICB9XG4gIHJldHVybiBjO1xufVxuXG4vKiogUmV0dXJucyB0aGUgYHJvdXRlLm91dGxldGAgb3IgUFJJTUFSWV9PVVRMRVQgaWYgbm9uZSBleGlzdHMuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0T3V0bGV0KHJvdXRlOiBSb3V0ZSk6IHN0cmluZyB7XG4gIHJldHVybiByb3V0ZS5vdXRsZXQgfHwgUFJJTUFSWV9PVVRMRVQ7XG59XG5cbi8qKlxuICogU29ydHMgdGhlIGByb3V0ZXNgIHN1Y2ggdGhhdCB0aGUgb25lcyB3aXRoIGFuIG91dGxldCBtYXRjaGluZyBgb3V0bGV0TmFtZWAgY29tZSBmaXJzdC5cbiAqIFRoZSBvcmRlciBvZiB0aGUgY29uZmlncyBpcyBvdGhlcndpc2UgcHJlc2VydmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc29ydEJ5TWF0Y2hpbmdPdXRsZXRzKHJvdXRlczogUm91dGVzLCBvdXRsZXROYW1lOiBzdHJpbmcpOiBSb3V0ZXMge1xuICBjb25zdCBzb3J0ZWRDb25maWcgPSByb3V0ZXMuZmlsdGVyKHIgPT4gZ2V0T3V0bGV0KHIpID09PSBvdXRsZXROYW1lKTtcbiAgc29ydGVkQ29uZmlnLnB1c2goLi4ucm91dGVzLmZpbHRlcihyID0+IGdldE91dGxldChyKSAhPT0gb3V0bGV0TmFtZSkpO1xuICByZXR1cm4gc29ydGVkQ29uZmlnO1xufVxuXG4vKipcbiAqIEdldHMgdGhlIGZpcnN0IGluamVjdG9yIGluIHRoZSBzbmFwc2hvdCdzIHBhcmVudCB0cmVlLlxuICpcbiAqIElmIHRoZSBgUm91dGVgIGhhcyBhIHN0YXRpYyBsaXN0IG9mIHByb3ZpZGVycywgdGhlIHJldHVybmVkIGluamVjdG9yIHdpbGwgYmUgdGhlIG9uZSBjcmVhdGVkIGZyb21cbiAqIHRob3NlLiBJZiBpdCBkb2VzIG5vdCBleGlzdCwgdGhlIHJldHVybmVkIGluamVjdG9yIG1heSBjb21lIGZyb20gdGhlIHBhcmVudHMsIHdoaWNoIG1heSBiZSBmcm9tIGFcbiAqIGxvYWRlZCBjb25maWcgb3IgdGhlaXIgc3RhdGljIHByb3ZpZGVycy5cbiAqXG4gKiBSZXR1cm5zIGBudWxsYCBpZiB0aGVyZSBpcyBuZWl0aGVyIHRoaXMgbm9yIGFueSBwYXJlbnRzIGhhdmUgYSBzdG9yZWQgaW5qZWN0b3IuXG4gKlxuICogR2VuZXJhbGx5IHVzZWQgZm9yIHJldHJpZXZpbmcgdGhlIGluamVjdG9yIHRvIHVzZSBmb3IgZ2V0dGluZyB0b2tlbnMgZm9yIGd1YXJkcy9yZXNvbHZlcnMgYW5kXG4gKiBhbHNvIHVzZWQgZm9yIGdldHRpbmcgdGhlIGNvcnJlY3QgaW5qZWN0b3IgdG8gdXNlIGZvciBjcmVhdGluZyBjb21wb25lbnRzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2xvc2VzdFJvdXRlSW5qZWN0b3Ioc25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBFbnZpcm9ubWVudEluamVjdG9yfFxuICAgIG51bGwge1xuICBpZiAoIXNuYXBzaG90KSByZXR1cm4gbnVsbDtcblxuICAvLyBJZiB0aGUgY3VycmVudCByb3V0ZSBoYXMgaXRzIG93biBpbmplY3Rvciwgd2hpY2ggaXMgY3JlYXRlZCBmcm9tIHRoZSBzdGF0aWMgcHJvdmlkZXJzIG9uIHRoZVxuICAvLyByb3V0ZSBpdHNlbGYsIHdlIHNob3VsZCB1c2UgdGhhdC4gT3RoZXJ3aXNlLCB3ZSBzdGFydCBhdCB0aGUgcGFyZW50IHNpbmNlIHdlIGRvIG5vdCB3YW50IHRvXG4gIC8vIGluY2x1ZGUgdGhlIGxhenkgbG9hZGVkIGluamVjdG9yIGZyb20gdGhpcyByb3V0ZS5cbiAgaWYgKHNuYXBzaG90LnJvdXRlQ29uZmlnPy5faW5qZWN0b3IpIHtcbiAgICByZXR1cm4gc25hcHNob3Qucm91dGVDb25maWcuX2luamVjdG9yO1xuICB9XG5cbiAgZm9yIChsZXQgcyA9IHNuYXBzaG90LnBhcmVudDsgczsgcyA9IHMucGFyZW50KSB7XG4gICAgY29uc3Qgcm91dGUgPSBzLnJvdXRlQ29uZmlnO1xuICAgIC8vIE5vdGUgdGhhdCB0aGUgb3JkZXIgaGVyZSBpcyBpbXBvcnRhbnQuIGBfbG9hZGVkSW5qZWN0b3JgIHN0b3JlZCBvbiB0aGUgcm91dGUgd2l0aFxuICAgIC8vIGBsb2FkQ2hpbGRyZW46ICgpID0+IE5nTW9kdWxlYCBzbyBpdCBhcHBsaWVzIHRvIGNoaWxkIHJvdXRlcyB3aXRoIHByaW9yaXR5LiBUaGUgYF9pbmplY3RvcmBcbiAgICAvLyBpcyBjcmVhdGVkIGZyb20gdGhlIHN0YXRpYyBwcm92aWRlcnMgb24gdGhhdCBwYXJlbnQgcm91dGUsIHNvIGl0IGFwcGxpZXMgdG8gdGhlIGNoaWxkcmVuIGFzXG4gICAgLy8gd2VsbCwgYnV0IG9ubHkgaWYgdGhlcmUgaXMgbm8gbGF6eSBsb2FkZWQgTmdNb2R1bGVSZWYgaW5qZWN0b3IuXG4gICAgaWYgKHJvdXRlPy5fbG9hZGVkSW5qZWN0b3IpIHJldHVybiByb3V0ZS5fbG9hZGVkSW5qZWN0b3I7XG4gICAgaWYgKHJvdXRlPy5faW5qZWN0b3IpIHJldHVybiByb3V0ZS5faW5qZWN0b3I7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cbiJdfQ==