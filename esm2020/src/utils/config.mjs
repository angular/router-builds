/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ɵisStandalone as isStandalone } from '@angular/core';
import { EmptyOutletComponent } from '../components/empty_outlet';
import { PRIMARY_OUTLET } from '../shared';
export function getLoadedRoutes(route) {
    return route._loadedRoutes;
}
export function getLoadedInjector(route) {
    return route._loadedInjector;
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
function validateNode(route, fullPath, requireStandaloneComponents) {
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
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
        if (route.redirectTo && route.canActivate) {
            throw new Error(`Invalid configuration of route '${fullPath}': redirectTo and canActivate cannot be used together. Redirects happen before activation ` +
                `so canActivate will never be executed.`);
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
            const exp = `The default value of 'pathMatch' is 'prefix', but often the intent is to use 'full'.`;
            throw new Error(`Invalid configuration of route '{path: "${fullPath}", redirectTo: "${route.redirectTo}"}': please provide 'pathMatch'. ${exp}`);
        }
        if (requireStandaloneComponents && route.component && !isStandalone(route.component)) {
            throw new Error(`Invalid configuration of route '${fullPath}'. The component must be standalone.`);
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
    if (!c.component && (children || c.loadChildren) && (c.outlet && c.outlet !== PRIMARY_OUTLET)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy91dGlscy9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFzQixhQUFhLElBQUksWUFBWSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBRWpGLE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLDRCQUE0QixDQUFDO0FBR2hFLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFFekMsTUFBTSxVQUFVLGVBQWUsQ0FBQyxLQUFZO0lBQzFDLE9BQU8sS0FBSyxDQUFDLGFBQWEsQ0FBQztBQUM3QixDQUFDO0FBRUQsTUFBTSxVQUFVLGlCQUFpQixDQUFDLEtBQVk7SUFDNUMsT0FBTyxLQUFLLENBQUMsZUFBZSxDQUFDO0FBQy9CLENBQUM7QUFFRCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsS0FBWTtJQUMvQyxPQUFPLEtBQUssQ0FBQyxTQUFTLENBQUM7QUFDekIsQ0FBQztBQUVELE1BQU0sVUFBVSxjQUFjLENBQzFCLE1BQWMsRUFBRSxhQUFxQixFQUFFLEVBQUUsMkJBQTJCLEdBQUcsS0FBSztJQUM5RSwyQ0FBMkM7SUFDM0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDdEMsTUFBTSxLQUFLLEdBQVUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE1BQU0sUUFBUSxHQUFXLFdBQVcsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEQsWUFBWSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztLQUM1RDtBQUNILENBQUM7QUFFRCxTQUFTLFlBQVksQ0FBQyxLQUFZLEVBQUUsUUFBZ0IsRUFBRSwyQkFBb0M7SUFD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QUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUU7UUFDN0MsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQztRQUM1QixvRkFBb0Y7UUFDcEYsOEZBQThGO1FBQzlGLDhGQUE4RjtRQUM5RixrRUFBa0U7UUFDbEUsSUFBSSxLQUFLLEVBQUUsZUFBZTtZQUFFLE9BQU8sS0FBSyxDQUFDLGVBQWUsQ0FBQztRQUN6RCxJQUFJLEtBQUssRUFBRSxTQUFTO1lBQUUsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFDO0tBQzlDO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RW52aXJvbm1lbnRJbmplY3RvciwgybVpc1N0YW5kYWxvbmUgYXMgaXNTdGFuZGFsb25lfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHtFbXB0eU91dGxldENvbXBvbmVudH0gZnJvbSAnLi4vY29tcG9uZW50cy9lbXB0eV9vdXRsZXQnO1xuaW1wb3J0IHtSb3V0ZSwgUm91dGVzfSBmcm9tICcuLi9tb2RlbHMnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90fSBmcm9tICcuLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQUklNQVJZX09VVExFVH0gZnJvbSAnLi4vc2hhcmVkJztcblxuZXhwb3J0IGZ1bmN0aW9uIGdldExvYWRlZFJvdXRlcyhyb3V0ZTogUm91dGUpOiBSb3V0ZVtdfHVuZGVmaW5lZCB7XG4gIHJldHVybiByb3V0ZS5fbG9hZGVkUm91dGVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TG9hZGVkSW5qZWN0b3Iocm91dGU6IFJvdXRlKTogRW52aXJvbm1lbnRJbmplY3Rvcnx1bmRlZmluZWQge1xuICByZXR1cm4gcm91dGUuX2xvYWRlZEluamVjdG9yO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvdmlkZXJzSW5qZWN0b3Iocm91dGU6IFJvdXRlKTogRW52aXJvbm1lbnRJbmplY3Rvcnx1bmRlZmluZWQge1xuICByZXR1cm4gcm91dGUuX2luamVjdG9yO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVDb25maWcoXG4gICAgY29uZmlnOiBSb3V0ZXMsIHBhcmVudFBhdGg6IHN0cmluZyA9ICcnLCByZXF1aXJlU3RhbmRhbG9uZUNvbXBvbmVudHMgPSBmYWxzZSk6IHZvaWQge1xuICAvLyBmb3JFYWNoIGRvZXNuJ3QgaXRlcmF0ZSB1bmRlZmluZWQgdmFsdWVzXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29uZmlnLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3Qgcm91dGU6IFJvdXRlID0gY29uZmlnW2ldO1xuICAgIGNvbnN0IGZ1bGxQYXRoOiBzdHJpbmcgPSBnZXRGdWxsUGF0aChwYXJlbnRQYXRoLCByb3V0ZSk7XG4gICAgdmFsaWRhdGVOb2RlKHJvdXRlLCBmdWxsUGF0aCwgcmVxdWlyZVN0YW5kYWxvbmVDb21wb25lbnRzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZU5vZGUocm91dGU6IFJvdXRlLCBmdWxsUGF0aDogc3RyaW5nLCByZXF1aXJlU3RhbmRhbG9uZUNvbXBvbmVudHM6IGJvb2xlYW4pOiB2b2lkIHtcbiAgaWYgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkge1xuICAgIGlmICghcm91dGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgXG4gICAgICBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogRW5jb3VudGVyZWQgdW5kZWZpbmVkIHJvdXRlLlxuICAgICAgVGhlIHJlYXNvbiBtaWdodCBiZSBhbiBleHRyYSBjb21tYS5cblxuICAgICAgRXhhbXBsZTpcbiAgICAgIGNvbnN0IHJvdXRlczogUm91dGVzID0gW1xuICAgICAgICB7IHBhdGg6ICcnLCByZWRpcmVjdFRvOiAnL2Rhc2hib2FyZCcsIHBhdGhNYXRjaDogJ2Z1bGwnIH0sXG4gICAgICAgIHsgcGF0aDogJ2Rhc2hib2FyZCcsICBjb21wb25lbnQ6IERhc2hib2FyZENvbXBvbmVudCB9LCwgPDwgdHdvIGNvbW1hc1xuICAgICAgICB7IHBhdGg6ICdkZXRhaWwvOmlkJywgY29tcG9uZW50OiBIZXJvRGV0YWlsQ29tcG9uZW50IH1cbiAgICAgIF07XG4gICAgYCk7XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KHJvdXRlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogQXJyYXkgY2Fubm90IGJlIHNwZWNpZmllZGApO1xuICAgIH1cbiAgICBpZiAoIXJvdXRlLmNvbXBvbmVudCAmJiAhcm91dGUuY2hpbGRyZW4gJiYgIXJvdXRlLmxvYWRDaGlsZHJlbiAmJlxuICAgICAgICAocm91dGUub3V0bGV0ICYmIHJvdXRlLm91dGxldCAhPT0gUFJJTUFSWV9PVVRMRVQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgICBmdWxsUGF0aH0nOiBhIGNvbXBvbmVudGxlc3Mgcm91dGUgd2l0aG91dCBjaGlsZHJlbiBvciBsb2FkQ2hpbGRyZW4gY2Fubm90IGhhdmUgYSBuYW1lZCBvdXRsZXQgc2V0YCk7XG4gICAgfVxuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvICYmIHJvdXRlLmNoaWxkcmVuKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgICBmdWxsUGF0aH0nOiByZWRpcmVjdFRvIGFuZCBjaGlsZHJlbiBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmApO1xuICAgIH1cbiAgICBpZiAocm91dGUucmVkaXJlY3RUbyAmJiByb3V0ZS5sb2FkQ2hpbGRyZW4pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke1xuICAgICAgICAgIGZ1bGxQYXRofSc6IHJlZGlyZWN0VG8gYW5kIGxvYWRDaGlsZHJlbiBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmApO1xuICAgIH1cbiAgICBpZiAocm91dGUuY2hpbGRyZW4gJiYgcm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgICBmdWxsUGF0aH0nOiBjaGlsZHJlbiBhbmQgbG9hZENoaWxkcmVuIGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gICAgfVxuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvICYmIHJvdXRlLmNvbXBvbmVudCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7XG4gICAgICAgICAgZnVsbFBhdGh9JzogcmVkaXJlY3RUbyBhbmQgY29tcG9uZW50IGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gICAgfVxuICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvICYmIHJvdXRlLmNhbkFjdGl2YXRlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgICAgICAgZnVsbFBhdGh9JzogcmVkaXJlY3RUbyBhbmQgY2FuQWN0aXZhdGUgY2Fubm90IGJlIHVzZWQgdG9nZXRoZXIuIFJlZGlyZWN0cyBoYXBwZW4gYmVmb3JlIGFjdGl2YXRpb24gYCArXG4gICAgICAgICAgYHNvIGNhbkFjdGl2YXRlIHdpbGwgbmV2ZXIgYmUgZXhlY3V0ZWQuYCk7XG4gICAgfVxuICAgIGlmIChyb3V0ZS5wYXRoICYmIHJvdXRlLm1hdGNoZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IHBhdGggYW5kIG1hdGNoZXIgY2Fubm90IGJlIHVzZWQgdG9nZXRoZXJgKTtcbiAgICB9XG4gICAgaWYgKHJvdXRlLnJlZGlyZWN0VG8gPT09IHZvaWQgMCAmJiAhcm91dGUuY29tcG9uZW50ICYmICFyb3V0ZS5jaGlsZHJlbiAmJiAhcm91dGUubG9hZENoaWxkcmVuKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtcbiAgICAgICAgICBmdWxsUGF0aH0nLiBPbmUgb2YgdGhlIGZvbGxvd2luZyBtdXN0IGJlIHByb3ZpZGVkOiBjb21wb25lbnQsIHJlZGlyZWN0VG8sIGNoaWxkcmVuIG9yIGxvYWRDaGlsZHJlbmApO1xuICAgIH1cbiAgICBpZiAocm91dGUucGF0aCA9PT0gdm9pZCAwICYmIHJvdXRlLm1hdGNoZXIgPT09IHZvaWQgMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7XG4gICAgICAgICAgZnVsbFBhdGh9Jzogcm91dGVzIG11c3QgaGF2ZSBlaXRoZXIgYSBwYXRoIG9yIGEgbWF0Y2hlciBzcGVjaWZpZWRgKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiByb3V0ZS5wYXRoID09PSAnc3RyaW5nJyAmJiByb3V0ZS5wYXRoLmNoYXJBdCgwKSA9PT0gJy8nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBwYXRoIGNhbm5vdCBzdGFydCB3aXRoIGEgc2xhc2hgKTtcbiAgICB9XG4gICAgaWYgKHJvdXRlLnBhdGggPT09ICcnICYmIHJvdXRlLnJlZGlyZWN0VG8gIT09IHZvaWQgMCAmJiByb3V0ZS5wYXRoTWF0Y2ggPT09IHZvaWQgMCkge1xuICAgICAgY29uc3QgZXhwID1cbiAgICAgICAgICBgVGhlIGRlZmF1bHQgdmFsdWUgb2YgJ3BhdGhNYXRjaCcgaXMgJ3ByZWZpeCcsIGJ1dCBvZnRlbiB0aGUgaW50ZW50IGlzIHRvIHVzZSAnZnVsbCcuYDtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICd7cGF0aDogXCIke2Z1bGxQYXRofVwiLCByZWRpcmVjdFRvOiBcIiR7XG4gICAgICAgICAgcm91dGUucmVkaXJlY3RUb31cIn0nOiBwbGVhc2UgcHJvdmlkZSAncGF0aE1hdGNoJy4gJHtleHB9YCk7XG4gICAgfVxuICAgIGlmIChyZXF1aXJlU3RhbmRhbG9uZUNvbXBvbmVudHMgJiYgcm91dGUuY29tcG9uZW50ICYmICFpc1N0YW5kYWxvbmUocm91dGUuY29tcG9uZW50KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9Jy4gVGhlIGNvbXBvbmVudCBtdXN0IGJlIHN0YW5kYWxvbmUuYCk7XG4gICAgfVxuICB9XG4gIGlmIChyb3V0ZS5jaGlsZHJlbikge1xuICAgIHZhbGlkYXRlQ29uZmlnKHJvdXRlLmNoaWxkcmVuLCBmdWxsUGF0aCwgcmVxdWlyZVN0YW5kYWxvbmVDb21wb25lbnRzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRGdWxsUGF0aChwYXJlbnRQYXRoOiBzdHJpbmcsIGN1cnJlbnRSb3V0ZTogUm91dGUpOiBzdHJpbmcge1xuICBpZiAoIWN1cnJlbnRSb3V0ZSkge1xuICAgIHJldHVybiBwYXJlbnRQYXRoO1xuICB9XG4gIGlmICghcGFyZW50UGF0aCAmJiAhY3VycmVudFJvdXRlLnBhdGgpIHtcbiAgICByZXR1cm4gJyc7XG4gIH0gZWxzZSBpZiAocGFyZW50UGF0aCAmJiAhY3VycmVudFJvdXRlLnBhdGgpIHtcbiAgICByZXR1cm4gYCR7cGFyZW50UGF0aH0vYDtcbiAgfSBlbHNlIGlmICghcGFyZW50UGF0aCAmJiBjdXJyZW50Um91dGUucGF0aCkge1xuICAgIHJldHVybiBjdXJyZW50Um91dGUucGF0aDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYCR7cGFyZW50UGF0aH0vJHtjdXJyZW50Um91dGUucGF0aH1gO1xuICB9XG59XG5cbi8qKlxuICogTWFrZXMgYSBjb3B5IG9mIHRoZSBjb25maWcgYW5kIGFkZHMgYW55IGRlZmF1bHQgcmVxdWlyZWQgcHJvcGVydGllcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0YW5kYXJkaXplQ29uZmlnKHI6IFJvdXRlKTogUm91dGUge1xuICBjb25zdCBjaGlsZHJlbiA9IHIuY2hpbGRyZW4gJiYgci5jaGlsZHJlbi5tYXAoc3RhbmRhcmRpemVDb25maWcpO1xuICBjb25zdCBjID0gY2hpbGRyZW4gPyB7Li4uciwgY2hpbGRyZW59IDogey4uLnJ9O1xuICBpZiAoIWMuY29tcG9uZW50ICYmIChjaGlsZHJlbiB8fCBjLmxvYWRDaGlsZHJlbikgJiYgKGMub3V0bGV0ICYmIGMub3V0bGV0ICE9PSBQUklNQVJZX09VVExFVCkpIHtcbiAgICBjLmNvbXBvbmVudCA9IEVtcHR5T3V0bGV0Q29tcG9uZW50O1xuICB9XG4gIHJldHVybiBjO1xufVxuXG4vKiogUmV0dXJucyB0aGUgYHJvdXRlLm91dGxldGAgb3IgUFJJTUFSWV9PVVRMRVQgaWYgbm9uZSBleGlzdHMuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0T3V0bGV0KHJvdXRlOiBSb3V0ZSk6IHN0cmluZyB7XG4gIHJldHVybiByb3V0ZS5vdXRsZXQgfHwgUFJJTUFSWV9PVVRMRVQ7XG59XG5cbi8qKlxuICogU29ydHMgdGhlIGByb3V0ZXNgIHN1Y2ggdGhhdCB0aGUgb25lcyB3aXRoIGFuIG91dGxldCBtYXRjaGluZyBgb3V0bGV0TmFtZWAgY29tZSBmaXJzdC5cbiAqIFRoZSBvcmRlciBvZiB0aGUgY29uZmlncyBpcyBvdGhlcndpc2UgcHJlc2VydmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc29ydEJ5TWF0Y2hpbmdPdXRsZXRzKHJvdXRlczogUm91dGVzLCBvdXRsZXROYW1lOiBzdHJpbmcpOiBSb3V0ZXMge1xuICBjb25zdCBzb3J0ZWRDb25maWcgPSByb3V0ZXMuZmlsdGVyKHIgPT4gZ2V0T3V0bGV0KHIpID09PSBvdXRsZXROYW1lKTtcbiAgc29ydGVkQ29uZmlnLnB1c2goLi4ucm91dGVzLmZpbHRlcihyID0+IGdldE91dGxldChyKSAhPT0gb3V0bGV0TmFtZSkpO1xuICByZXR1cm4gc29ydGVkQ29uZmlnO1xufVxuXG4vKipcbiAqIEdldHMgdGhlIGZpcnN0IGluamVjdG9yIGluIHRoZSBzbmFwc2hvdCdzIHBhcmVudCB0cmVlLlxuICpcbiAqIElmIHRoZSBgUm91dGVgIGhhcyBhIHN0YXRpYyBsaXN0IG9mIHByb3ZpZGVycywgdGhlIHJldHVybmVkIGluamVjdG9yIHdpbGwgYmUgdGhlIG9uZSBjcmVhdGVkIGZyb21cbiAqIHRob3NlLiBJZiBpdCBkb2VzIG5vdCBleGlzdCwgdGhlIHJldHVybmVkIGluamVjdG9yIG1heSBjb21lIGZyb20gdGhlIHBhcmVudHMsIHdoaWNoIG1heSBiZSBmcm9tIGFcbiAqIGxvYWRlZCBjb25maWcgb3IgdGhlaXIgc3RhdGljIHByb3ZpZGVycy5cbiAqXG4gKiBSZXR1cm5zIGBudWxsYCBpZiB0aGVyZSBpcyBuZWl0aGVyIHRoaXMgbm9yIGFueSBwYXJlbnRzIGhhdmUgYSBzdG9yZWQgaW5qZWN0b3IuXG4gKlxuICogR2VuZXJhbGx5IHVzZWQgZm9yIHJldHJpZXZpbmcgdGhlIGluamVjdG9yIHRvIHVzZSBmb3IgZ2V0dGluZyB0b2tlbnMgZm9yIGd1YXJkcy9yZXNvbHZlcnMgYW5kXG4gKiBhbHNvIHVzZWQgZm9yIGdldHRpbmcgdGhlIGNvcnJlY3QgaW5qZWN0b3IgdG8gdXNlIGZvciBjcmVhdGluZyBjb21wb25lbnRzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2xvc2VzdFJvdXRlSW5qZWN0b3Ioc25hcHNob3Q6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBFbnZpcm9ubWVudEluamVjdG9yfFxuICAgIG51bGwge1xuICBpZiAoIXNuYXBzaG90KSByZXR1cm4gbnVsbDtcblxuICAvLyBJZiB0aGUgY3VycmVudCByb3V0ZSBoYXMgaXRzIG93biBpbmplY3Rvciwgd2hpY2ggaXMgY3JlYXRlZCBmcm9tIHRoZSBzdGF0aWMgcHJvdmlkZXJzIG9uIHRoZVxuICAvLyByb3V0ZSBpdHNlbGYsIHdlIHNob3VsZCB1c2UgdGhhdC4gT3RoZXJ3aXNlLCB3ZSBzdGFydCBhdCB0aGUgcGFyZW50IHNpbmNlIHdlIGRvIG5vdCB3YW50IHRvXG4gIC8vIGluY2x1ZGUgdGhlIGxhenkgbG9hZGVkIGluamVjdG9yIGZyb20gdGhpcyByb3V0ZS5cbiAgaWYgKHNuYXBzaG90LnJvdXRlQ29uZmlnPy5faW5qZWN0b3IpIHtcbiAgICByZXR1cm4gc25hcHNob3Qucm91dGVDb25maWcuX2luamVjdG9yO1xuICB9XG5cbiAgZm9yIChsZXQgcyA9IHNuYXBzaG90LnBhcmVudDsgczsgcyA9IHMucGFyZW50KSB7XG4gICAgY29uc3Qgcm91dGUgPSBzLnJvdXRlQ29uZmlnO1xuICAgIC8vIE5vdGUgdGhhdCB0aGUgb3JkZXIgaGVyZSBpcyBpbXBvcnRhbnQuIGBfbG9hZGVkSW5qZWN0b3JgIHN0b3JlZCBvbiB0aGUgcm91dGUgd2l0aFxuICAgIC8vIGBsb2FkQ2hpbGRyZW46ICgpID0+IE5nTW9kdWxlYCBzbyBpdCBhcHBsaWVzIHRvIGNoaWxkIHJvdXRlcyB3aXRoIHByaW9yaXR5LiBUaGUgYF9pbmplY3RvcmBcbiAgICAvLyBpcyBjcmVhdGVkIGZyb20gdGhlIHN0YXRpYyBwcm92aWRlcnMgb24gdGhhdCBwYXJlbnQgcm91dGUsIHNvIGl0IGFwcGxpZXMgdG8gdGhlIGNoaWxkcmVuIGFzXG4gICAgLy8gd2VsbCwgYnV0IG9ubHkgaWYgdGhlcmUgaXMgbm8gbGF6eSBsb2FkZWQgTmdNb2R1bGVSZWYgaW5qZWN0b3IuXG4gICAgaWYgKHJvdXRlPy5fbG9hZGVkSW5qZWN0b3IpIHJldHVybiByb3V0ZS5fbG9hZGVkSW5qZWN0b3I7XG4gICAgaWYgKHJvdXRlPy5faW5qZWN0b3IpIHJldHVybiByb3V0ZS5faW5qZWN0b3I7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cbiJdfQ==