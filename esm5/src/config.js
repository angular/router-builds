/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
import { PRIMARY_OUTLET } from './shared';
var LoadedRouterConfig = /** @class */ (function () {
    function LoadedRouterConfig(routes, module) {
        this.routes = routes;
        this.module = module;
    }
    return LoadedRouterConfig;
}());
export { LoadedRouterConfig };
export function validateConfig(config, parentPath) {
    if (parentPath === void 0) { parentPath = ''; }
    // forEach doesn't iterate undefined values
    for (var i = 0; i < config.length; i++) {
        var route = config[i];
        var fullPath = getFullPath(parentPath, route);
        validateNode(route, fullPath);
    }
}
function validateNode(route, fullPath) {
    if (!route) {
        throw new Error("\n      Invalid configuration of route '" + fullPath + "': Encountered undefined route.\n      The reason might be an extra comma.\n\n      Example:\n      const routes: Routes = [\n        { path: '', redirectTo: '/dashboard', pathMatch: 'full' },\n        { path: 'dashboard',  component: DashboardComponent },, << two commas\n        { path: 'detail/:id', component: HeroDetailComponent }\n      ];\n    ");
    }
    if (Array.isArray(route)) {
        throw new Error("Invalid configuration of route '" + fullPath + "': Array cannot be specified");
    }
    if (!route.component && (route.outlet && route.outlet !== PRIMARY_OUTLET)) {
        throw new Error("Invalid configuration of route '" + fullPath + "': a componentless route cannot have a named outlet set");
    }
    if (route.redirectTo && route.children) {
        throw new Error("Invalid configuration of route '" + fullPath + "': redirectTo and children cannot be used together");
    }
    if (route.redirectTo && route.loadChildren) {
        throw new Error("Invalid configuration of route '" + fullPath + "': redirectTo and loadChildren cannot be used together");
    }
    if (route.children && route.loadChildren) {
        throw new Error("Invalid configuration of route '" + fullPath + "': children and loadChildren cannot be used together");
    }
    if (route.redirectTo && route.component) {
        throw new Error("Invalid configuration of route '" + fullPath + "': redirectTo and component cannot be used together");
    }
    if (route.path && route.matcher) {
        throw new Error("Invalid configuration of route '" + fullPath + "': path and matcher cannot be used together");
    }
    if (route.redirectTo === void 0 && !route.component && !route.children && !route.loadChildren) {
        throw new Error("Invalid configuration of route '" + fullPath + "'. One of the following must be provided: component, redirectTo, children or loadChildren");
    }
    if (route.path === void 0 && route.matcher === void 0) {
        throw new Error("Invalid configuration of route '" + fullPath + "': routes must have either a path or a matcher specified");
    }
    if (typeof route.path === 'string' && route.path.charAt(0) === '/') {
        throw new Error("Invalid configuration of route '" + fullPath + "': path cannot start with a slash");
    }
    if (route.path === '' && route.redirectTo !== void 0 && route.pathMatch === void 0) {
        var exp = "The default value of 'pathMatch' is 'prefix', but often the intent is to use 'full'.";
        throw new Error("Invalid configuration of route '{path: \"" + fullPath + "\", redirectTo: \"" + route.redirectTo + "\"}': please provide 'pathMatch'. " + exp);
    }
    if (route.pathMatch !== void 0 && route.pathMatch !== 'full' && route.pathMatch !== 'prefix') {
        throw new Error("Invalid configuration of route '" + fullPath + "': pathMatch can only be set to 'prefix' or 'full'");
    }
    if (route.children) {
        validateConfig(route.children, fullPath);
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
        return parentPath + "/";
    }
    else if (!parentPath && currentRoute.path) {
        return currentRoute.path;
    }
    else {
        return parentPath + "/" + currentRoute.path;
    }
}
export function copyConfig(r) {
    var children = r.children && r.children.map(copyConfig);
    return children ? tslib_1.__assign({}, r, { children: children }) : tslib_1.__assign({}, r);
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOztBQUlILE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFzWHhDO0lBQ0UsNEJBQW1CLE1BQWUsRUFBUyxNQUF3QjtRQUFoRCxXQUFNLEdBQU4sTUFBTSxDQUFTO1FBQVMsV0FBTSxHQUFOLE1BQU0sQ0FBa0I7SUFBRyxDQUFDO0lBQ3pFLHlCQUFDO0FBQUQsQ0FBQyxBQUZELElBRUM7O0FBRUQsTUFBTSx5QkFBeUIsTUFBYyxFQUFFLFVBQXVCO0lBQXZCLDJCQUFBLEVBQUEsZUFBdUI7SUFDcEUsMkNBQTJDO0lBQzNDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ3RDLElBQU0sS0FBSyxHQUFVLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvQixJQUFNLFFBQVEsR0FBVyxXQUFXLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3hELFlBQVksQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7S0FDL0I7QUFDSCxDQUFDO0FBRUQsc0JBQXNCLEtBQVksRUFBRSxRQUFnQjtJQUNsRCxJQUFJLENBQUMsS0FBSyxFQUFFO1FBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQyw2Q0FDb0IsUUFBUSxvV0FTM0MsQ0FBQyxDQUFDO0tBQ0o7SUFDRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQ0FBbUMsUUFBUSxpQ0FBOEIsQ0FBQyxDQUFDO0tBQzVGO0lBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssY0FBYyxDQUFDLEVBQUU7UUFDekUsTUFBTSxJQUFJLEtBQUssQ0FDWCxxQ0FBbUMsUUFBUSw0REFBeUQsQ0FBQyxDQUFDO0tBQzNHO0lBQ0QsSUFBSSxLQUFLLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUU7UUFDdEMsTUFBTSxJQUFJLEtBQUssQ0FDWCxxQ0FBbUMsUUFBUSx1REFBb0QsQ0FBQyxDQUFDO0tBQ3RHO0lBQ0QsSUFBSSxLQUFLLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxZQUFZLEVBQUU7UUFDMUMsTUFBTSxJQUFJLEtBQUssQ0FDWCxxQ0FBbUMsUUFBUSwyREFBd0QsQ0FBQyxDQUFDO0tBQzFHO0lBQ0QsSUFBSSxLQUFLLENBQUMsUUFBUSxJQUFJLEtBQUssQ0FBQyxZQUFZLEVBQUU7UUFDeEMsTUFBTSxJQUFJLEtBQUssQ0FDWCxxQ0FBbUMsUUFBUSx5REFBc0QsQ0FBQyxDQUFDO0tBQ3hHO0lBQ0QsSUFBSSxLQUFLLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxTQUFTLEVBQUU7UUFDdkMsTUFBTSxJQUFJLEtBQUssQ0FDWCxxQ0FBbUMsUUFBUSx3REFBcUQsQ0FBQyxDQUFDO0tBQ3ZHO0lBQ0QsSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUU7UUFDL0IsTUFBTSxJQUFJLEtBQUssQ0FDWCxxQ0FBbUMsUUFBUSxnREFBNkMsQ0FBQyxDQUFDO0tBQy9GO0lBQ0QsSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFO1FBQzdGLE1BQU0sSUFBSSxLQUFLLENBQ1gscUNBQW1DLFFBQVEsOEZBQTJGLENBQUMsQ0FBQztLQUM3STtJQUNELElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxLQUFLLEtBQUssQ0FBQyxFQUFFO1FBQ3JELE1BQU0sSUFBSSxLQUFLLENBQ1gscUNBQW1DLFFBQVEsNkRBQTBELENBQUMsQ0FBQztLQUM1RztJQUNELElBQUksT0FBTyxLQUFLLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7UUFDbEUsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQ0FBbUMsUUFBUSxzQ0FBbUMsQ0FBQyxDQUFDO0tBQ2pHO0lBQ0QsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssS0FBSyxDQUFDLEVBQUU7UUFDbEYsSUFBTSxHQUFHLEdBQ0wsc0ZBQXNGLENBQUM7UUFDM0YsTUFBTSxJQUFJLEtBQUssQ0FDWCw4Q0FBMkMsUUFBUSwwQkFBbUIsS0FBSyxDQUFDLFVBQVUsMENBQW9DLEdBQUssQ0FBQyxDQUFDO0tBQ3RJO0lBQ0QsSUFBSSxLQUFLLENBQUMsU0FBUyxLQUFLLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssTUFBTSxJQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssUUFBUSxFQUFFO1FBQzVGLE1BQU0sSUFBSSxLQUFLLENBQ1gscUNBQW1DLFFBQVEsdURBQW9ELENBQUMsQ0FBQztLQUN0RztJQUNELElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRTtRQUNsQixjQUFjLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztLQUMxQztBQUNILENBQUM7QUFFRCxxQkFBcUIsVUFBa0IsRUFBRSxZQUFtQjtJQUMxRCxJQUFJLENBQUMsWUFBWSxFQUFFO1FBQ2pCLE9BQU8sVUFBVSxDQUFDO0tBQ25CO0lBQ0QsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUU7UUFDckMsT0FBTyxFQUFFLENBQUM7S0FDWDtTQUFNLElBQUksVUFBVSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRTtRQUMzQyxPQUFVLFVBQVUsTUFBRyxDQUFDO0tBQ3pCO1NBQU0sSUFBSSxDQUFDLFVBQVUsSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFO1FBQzNDLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQztLQUMxQjtTQUFNO1FBQ0wsT0FBVSxVQUFVLFNBQUksWUFBWSxDQUFDLElBQU0sQ0FBQztLQUM3QztBQUNILENBQUM7QUFHRCxNQUFNLHFCQUFxQixDQUFRO0lBQ2pDLElBQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDMUQsT0FBTyxRQUFRLENBQUMsQ0FBQyxzQkFBSyxDQUFDLElBQUUsUUFBUSxVQUFBLElBQUUsQ0FBQyxzQkFBSyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge05nTW9kdWxlRmFjdG9yeSwgTmdNb2R1bGVSZWYsIFR5cGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtPYnNlcnZhYmxlfSBmcm9tICdyeGpzJztcbmltcG9ydCB7UFJJTUFSWV9PVVRMRVR9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7VXJsU2VnbWVudCwgVXJsU2VnbWVudEdyb3VwfSBmcm9tICcuL3VybF90cmVlJztcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIHJvdXRlciBjb25maWd1cmF0aW9uLlxuICpcbiAqIGBSb3V0ZXNgIGlzIGFuIGFycmF5IG9mIHJvdXRlIGNvbmZpZ3VyYXRpb25zLiBFYWNoIG9uZSBoYXMgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICpcbiAqIC0gYHBhdGhgIGlzIGEgc3RyaW5nIHRoYXQgdXNlcyB0aGUgcm91dGUgbWF0Y2hlciBEU0wuXG4gKiAtIGBwYXRoTWF0Y2hgIGlzIGEgc3RyaW5nIHRoYXQgc3BlY2lmaWVzIHRoZSBtYXRjaGluZyBzdHJhdGVneS5cbiAqIC0gYG1hdGNoZXJgIGRlZmluZXMgYSBjdXN0b20gc3RyYXRlZ3kgZm9yIHBhdGggbWF0Y2hpbmcgYW5kIHN1cGVyc2VkZXMgYHBhdGhgIGFuZCBgcGF0aE1hdGNoYC5cbiAqIC0gYGNvbXBvbmVudGAgaXMgYSBjb21wb25lbnQgdHlwZS5cbiAqIC0gYHJlZGlyZWN0VG9gIGlzIHRoZSB1cmwgZnJhZ21lbnQgd2hpY2ggd2lsbCByZXBsYWNlIHRoZSBjdXJyZW50IG1hdGNoZWQgc2VnbWVudC5cbiAqIC0gYG91dGxldGAgaXMgdGhlIG5hbWUgb2YgdGhlIG91dGxldCB0aGUgY29tcG9uZW50IHNob3VsZCBiZSBwbGFjZWQgaW50by5cbiAqIC0gYGNhbkFjdGl2YXRlYCBpcyBhbiBhcnJheSBvZiBESSB0b2tlbnMgdXNlZCB0byBsb29rIHVwIENhbkFjdGl2YXRlIGhhbmRsZXJzLiBTZWVcbiAqICAgYENhbkFjdGl2YXRlYCBmb3IgbW9yZSBpbmZvLlxuICogLSBgY2FuQWN0aXZhdGVDaGlsZGAgaXMgYW4gYXJyYXkgb2YgREkgdG9rZW5zIHVzZWQgdG8gbG9vayB1cCBDYW5BY3RpdmF0ZUNoaWxkIGhhbmRsZXJzLiBTZWVcbiAqICAgYENhbkFjdGl2YXRlQ2hpbGRgIGZvciBtb3JlIGluZm8uXG4gKiAtIGBjYW5EZWFjdGl2YXRlYCBpcyBhbiBhcnJheSBvZiBESSB0b2tlbnMgdXNlZCB0byBsb29rIHVwIENhbkRlYWN0aXZhdGUgaGFuZGxlcnMuIFNlZVxuICogICBgQ2FuRGVhY3RpdmF0ZWAgZm9yIG1vcmUgaW5mby5cbiAqIC0gYGNhbkxvYWRgIGlzIGFuIGFycmF5IG9mIERJIHRva2VucyB1c2VkIHRvIGxvb2sgdXAgQ2FuTG9hZCBoYW5kbGVycy4gU2VlXG4gKiAgIGBDYW5Mb2FkYCBmb3IgbW9yZSBpbmZvLlxuICogLSBgZGF0YWAgaXMgYWRkaXRpb25hbCBkYXRhIHByb3ZpZGVkIHRvIHRoZSBjb21wb25lbnQgdmlhIGBBY3RpdmF0ZWRSb3V0ZWAuXG4gKiAtIGByZXNvbHZlYCBpcyBhIG1hcCBvZiBESSB0b2tlbnMgdXNlZCB0byBsb29rIHVwIGRhdGEgcmVzb2x2ZXJzLiBTZWUgYFJlc29sdmVgIGZvciBtb3JlXG4gKiAgIGluZm8uXG4gKiAtIGBydW5HdWFyZHNBbmRSZXNvbHZlcnNgIGRlZmluZXMgd2hlbiBndWFyZHMgYW5kIHJlc29sdmVycyB3aWxsIGJlIHJ1bi4gQnkgZGVmYXVsdCB0aGV5IHJ1biBvbmx5XG4gKiAgICB3aGVuIHRoZSBtYXRyaXggcGFyYW1ldGVycyBvZiB0aGUgcm91dGUgY2hhbmdlLiBXaGVuIHNldCB0byBgcGFyYW1zT3JRdWVyeVBhcmFtc0NoYW5nZWAgdGhleVxuICogICAgd2lsbCBhbHNvIHJ1biB3aGVuIHF1ZXJ5IHBhcmFtcyBjaGFuZ2UuIEFuZCB3aGVuIHNldCB0byBgYWx3YXlzYCwgdGhleSB3aWxsIHJ1biBldmVyeSB0aW1lLlxuICogLSBgY2hpbGRyZW5gIGlzIGFuIGFycmF5IG9mIGNoaWxkIHJvdXRlIGRlZmluaXRpb25zLlxuICogLSBgbG9hZENoaWxkcmVuYCBpcyBhIHJlZmVyZW5jZSB0byBsYXp5IGxvYWRlZCBjaGlsZCByb3V0ZXMuIFNlZSBgTG9hZENoaWxkcmVuYCBmb3IgbW9yZVxuICogICBpbmZvLlxuICpcbiAqICMjIyBTaW1wbGUgQ29uZmlndXJhdGlvblxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAgKiAgY29tcG9uZW50OiBUZWFtLFxuICogICBjaGlsZHJlbjogW3tcbiAqICAgICBwYXRoOiAndXNlci86bmFtZScsXG4gKiAgICAgY29tcG9uZW50OiBVc2VyXG4gKiAgIH1dXG4gKiB9XVxuICogYGBgXG4gKlxuICogV2hlbiBuYXZpZ2F0aW5nIHRvIGAvdGVhbS8xMS91c2VyL2JvYmAsIHRoZSByb3V0ZXIgd2lsbCBjcmVhdGUgdGhlIHRlYW0gY29tcG9uZW50IHdpdGggdGhlIHVzZXJcbiAqIGNvbXBvbmVudCBpbiBpdC5cbiAqXG4gKiAjIyMgTXVsdGlwbGUgT3V0bGV0c1xuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgY29tcG9uZW50OiBUZWFtXG4gKiB9LCB7XG4gKiAgIHBhdGg6ICdjaGF0Lzp1c2VyJyxcbiAqICAgY29tcG9uZW50OiBDaGF0XG4gKiAgIG91dGxldDogJ2F1eCdcbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiBXaGVuIG5hdmlnYXRpbmcgdG8gYC90ZWFtLzExKGF1eDpjaGF0L2ppbSlgLCB0aGUgcm91dGVyIHdpbGwgY3JlYXRlIHRoZSB0ZWFtIGNvbXBvbmVudCBuZXh0IHRvXG4gKiB0aGUgY2hhdCBjb21wb25lbnQuIFRoZSBjaGF0IGNvbXBvbmVudCB3aWxsIGJlIHBsYWNlZCBpbnRvIHRoZSBhdXggb3V0bGV0LlxuICpcbiAqICMjIyBXaWxkIENhcmRzXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAnKionLFxuICogICBjb21wb25lbnQ6IFNpbmtcbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiBSZWdhcmRsZXNzIG9mIHdoZXJlIHlvdSBuYXZpZ2F0ZSB0bywgdGhlIHJvdXRlciB3aWxsIGluc3RhbnRpYXRlIHRoZSBzaW5rIGNvbXBvbmVudC5cbiAqXG4gKiAjIyMgUmVkaXJlY3RzXG4gKlxuICogYGBgXG4gKiBbe1xuICogICBwYXRoOiAndGVhbS86aWQnLFxuICogICBjb21wb25lbnQ6IFRlYW0sXG4gKiAgIGNoaWxkcmVuOiBbe1xuICogICAgIHBhdGg6ICdsZWdhY3kvdXNlci86bmFtZScsXG4gKiAgICAgcmVkaXJlY3RUbzogJ3VzZXIvOm5hbWUnXG4gKiAgIH0sIHtcbiAqICAgICBwYXRoOiAndXNlci86bmFtZScsXG4gKiAgICAgY29tcG9uZW50OiBVc2VyXG4gKiAgIH1dXG4gKiB9XVxuICogYGBgXG4gKlxuICogV2hlbiBuYXZpZ2F0aW5nIHRvICcvdGVhbS8xMS9sZWdhY3kvdXNlci9qaW0nLCB0aGUgcm91dGVyIHdpbGwgY2hhbmdlIHRoZSB1cmwgdG9cbiAqICcvdGVhbS8xMS91c2VyL2ppbScsIGFuZCB0aGVuIHdpbGwgaW5zdGFudGlhdGUgdGhlIHRlYW0gY29tcG9uZW50IHdpdGggdGhlIHVzZXIgY29tcG9uZW50XG4gKiBpbiBpdC5cbiAqXG4gKiBJZiB0aGUgYHJlZGlyZWN0VG9gIHZhbHVlIHN0YXJ0cyB3aXRoIGEgJy8nLCB0aGVuIGl0IGlzIGFuIGFic29sdXRlIHJlZGlyZWN0LiBFLmcuLCBpZiBpbiB0aGVcbiAqIGV4YW1wbGUgYWJvdmUgd2UgY2hhbmdlIHRoZSBgcmVkaXJlY3RUb2AgdG8gYC91c2VyLzpuYW1lYCwgdGhlIHJlc3VsdCB1cmwgd2lsbCBiZSAnL3VzZXIvamltJy5cbiAqXG4gKiAjIyMgRW1wdHkgUGF0aFxuICpcbiAqIEVtcHR5LXBhdGggcm91dGUgY29uZmlndXJhdGlvbnMgY2FuIGJlIHVzZWQgdG8gaW5zdGFudGlhdGUgY29tcG9uZW50cyB0aGF0IGRvIG5vdCAnY29uc3VtZSdcbiAqIGFueSB1cmwgc2VnbWVudHMuIExldCdzIGxvb2sgYXQgdGhlIGZvbGxvd2luZyBjb25maWd1cmF0aW9uOlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgY29tcG9uZW50OiBUZWFtLFxuICogICBjaGlsZHJlbjogW3tcbiAqICAgICBwYXRoOiAnJyxcbiAqICAgICBjb21wb25lbnQ6IEFsbFVzZXJzXG4gKiAgIH0sIHtcbiAqICAgICBwYXRoOiAndXNlci86bmFtZScsXG4gKiAgICAgY29tcG9uZW50OiBVc2VyXG4gKiAgIH1dXG4gKiB9XVxuICogYGBgXG4gKlxuICogV2hlbiBuYXZpZ2F0aW5nIHRvIGAvdGVhbS8xMWAsIHRoZSByb3V0ZXIgd2lsbCBpbnN0YW50aWF0ZSB0aGUgQWxsVXNlcnMgY29tcG9uZW50LlxuICpcbiAqIEVtcHR5LXBhdGggcm91dGVzIGNhbiBoYXZlIGNoaWxkcmVuLlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgY29tcG9uZW50OiBUZWFtLFxuICogICBjaGlsZHJlbjogW3tcbiAqICAgICBwYXRoOiAnJyxcbiAqICAgICBjb21wb25lbnQ6IFdyYXBwZXJDbXAsXG4gKiAgICAgY2hpbGRyZW46IFt7XG4gKiAgICAgICBwYXRoOiAndXNlci86bmFtZScsXG4gKiAgICAgICBjb21wb25lbnQ6IFVzZXJcbiAqICAgICB9XVxuICogICB9XVxuICogfV1cbiAqIGBgYFxuICpcbiAqIFdoZW4gbmF2aWdhdGluZyB0byBgL3RlYW0vMTEvdXNlci9qaW1gLCB0aGUgcm91dGVyIHdpbGwgaW5zdGFudGlhdGUgdGhlIHdyYXBwZXIgY29tcG9uZW50IHdpdGhcbiAqIHRoZSB1c2VyIGNvbXBvbmVudCBpbiBpdC5cbiAqXG4gKiBBbiBlbXB0eSBwYXRoIHJvdXRlIGluaGVyaXRzIGl0cyBwYXJlbnQncyBwYXJhbXMgYW5kIGRhdGEuIFRoaXMgaXMgYmVjYXVzZSBpdCBjYW5ub3QgaGF2ZSBpdHNcbiAqIG93biBwYXJhbXMsIGFuZCwgYXMgYSByZXN1bHQsIGl0IG9mdGVuIHVzZXMgaXRzIHBhcmVudCdzIHBhcmFtcyBhbmQgZGF0YSBhcyBpdHMgb3duLlxuICpcbiAqICMjIyBNYXRjaGluZyBTdHJhdGVneVxuICpcbiAqIEJ5IGRlZmF1bHQgdGhlIHJvdXRlciB3aWxsIGxvb2sgYXQgd2hhdCBpcyBsZWZ0IGluIHRoZSB1cmwsIGFuZCBjaGVjayBpZiBpdCBzdGFydHMgd2l0aFxuICogdGhlIHNwZWNpZmllZCBwYXRoIChlLmcuLCBgL3RlYW0vMTEvdXNlcmAgc3RhcnRzIHdpdGggYHRlYW0vOmlkYCkuXG4gKlxuICogV2UgY2FuIGNoYW5nZSB0aGUgbWF0Y2hpbmcgc3RyYXRlZ3kgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIHBhdGggY292ZXJzIHRoZSB3aG9sZSB1bmNvbnN1bWVkIHVybCxcbiAqIHdoaWNoIGlzIGFraW4gdG8gYHVuY29uc3VtZWRVcmwgPT09IHBhdGhgIG9yIGAkYCByZWd1bGFyIGV4cHJlc3Npb25zLlxuICpcbiAqIFRoaXMgaXMgcGFydGljdWxhcmx5IGltcG9ydGFudCB3aGVuIHJlZGlyZWN0aW5nIGVtcHR5LXBhdGggcm91dGVzLlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgcGF0aDogJycsXG4gKiAgIHBhdGhNYXRjaDogJ3ByZWZpeCcsIC8vZGVmYXVsdFxuICogICByZWRpcmVjdFRvOiAnbWFpbidcbiAqIH0sIHtcbiAqICAgcGF0aDogJ21haW4nLFxuICogICBjb21wb25lbnQ6IE1haW5cbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiBTaW5jZSBhbiBlbXB0eSBwYXRoIGlzIGEgcHJlZml4IG9mIGFueSB1cmwsIGV2ZW4gd2hlbiBuYXZpZ2F0aW5nIHRvICcvbWFpbicsIHRoZSByb3V0ZXIgd2lsbFxuICogc3RpbGwgYXBwbHkgdGhlIHJlZGlyZWN0LlxuICpcbiAqIElmIGBwYXRoTWF0Y2g6IGZ1bGxgIGlzIHByb3ZpZGVkLCB0aGUgcm91dGVyIHdpbGwgYXBwbHkgdGhlIHJlZGlyZWN0IGlmIGFuZCBvbmx5IGlmIG5hdmlnYXRpbmcgdG9cbiAqICcvJy5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICcnLFxuICogICBwYXRoTWF0Y2g6ICdmdWxsJyxcbiAqICAgcmVkaXJlY3RUbzogJ21haW4nXG4gKiB9LCB7XG4gKiAgIHBhdGg6ICdtYWluJyxcbiAqICAgY29tcG9uZW50OiBNYWluXG4gKiB9XVxuICogYGBgXG4gKlxuICogIyMjIENvbXBvbmVudGxlc3MgUm91dGVzXG4gKlxuICogSXQgaXMgdXNlZnVsIGF0IHRpbWVzIHRvIGhhdmUgdGhlIGFiaWxpdHkgdG8gc2hhcmUgcGFyYW1ldGVycyBiZXR3ZWVuIHNpYmxpbmcgY29tcG9uZW50cy5cbiAqXG4gKiBTYXkgd2UgaGF2ZSB0d28gY29tcG9uZW50cy0tQ2hpbGRDbXAgYW5kIEF1eENtcC0tdGhhdCB3ZSB3YW50IHRvIHB1dCBuZXh0IHRvIGVhY2ggb3RoZXIgYW5kIGJvdGhcbiAqIG9mIHRoZW0gcmVxdWlyZSBzb21lIGlkIHBhcmFtZXRlci5cbiAqXG4gKiBPbmUgd2F5IHRvIGRvIHRoYXQgd291bGQgYmUgdG8gaGF2ZSBhIGJvZ3VzIHBhcmVudCBjb21wb25lbnQsIHNvIGJvdGggdGhlIHNpYmxpbmdzIGNhbiBnZXQgdGhlIGlkXG4gKiBwYXJhbWV0ZXIgZnJvbSBpdC4gVGhpcyBpcyBub3QgaWRlYWwuIEluc3RlYWQsIHlvdSBjYW4gdXNlIGEgY29tcG9uZW50bGVzcyByb3V0ZS5cbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgICBwYXRoOiAncGFyZW50LzppZCcsXG4gKiAgICBjaGlsZHJlbjogW1xuICogICAgICB7IHBhdGg6ICdhJywgY29tcG9uZW50OiBNYWluQ2hpbGQgfSxcbiAqICAgICAgeyBwYXRoOiAnYicsIGNvbXBvbmVudDogQXV4Q2hpbGQsIG91dGxldDogJ2F1eCcgfVxuICogICAgXVxuICogfV1cbiAqIGBgYFxuICpcbiAqIFNvIHdoZW4gbmF2aWdhdGluZyB0byBgcGFyZW50LzEwLyhhLy9hdXg6YilgLCB0aGUgcm91dGUgd2lsbCBpbnN0YW50aWF0ZSB0aGUgbWFpbiBjaGlsZCBhbmQgYXV4XG4gKiBjaGlsZCBjb21wb25lbnRzIG5leHQgdG8gZWFjaCBvdGhlci4gSW4gdGhpcyBleGFtcGxlLCB0aGUgYXBwbGljYXRpb24gY29tcG9uZW50XG4gKiBoYXMgdG8gaGF2ZSB0aGUgcHJpbWFyeSBhbmQgYXV4IG91dGxldHMgZGVmaW5lZC5cbiAqXG4gKiBUaGUgcm91dGVyIHdpbGwgYWxzbyBtZXJnZSB0aGUgYHBhcmFtc2AsIGBkYXRhYCwgYW5kIGByZXNvbHZlYCBvZiB0aGUgY29tcG9uZW50bGVzcyBwYXJlbnQgaW50b1xuICogdGhlIGBwYXJhbXNgLCBgZGF0YWAsIGFuZCBgcmVzb2x2ZWAgb2YgdGhlIGNoaWxkcmVuLiBUaGlzIGlzIGRvbmUgYmVjYXVzZSB0aGVyZSBpcyBubyBjb21wb25lbnRcbiAqIHRoYXQgY2FuIGluamVjdCB0aGUgYWN0aXZhdGVkIHJvdXRlIG9mIHRoZSBjb21wb25lbnRsZXNzIHBhcmVudC5cbiAqXG4gKiBUaGlzIGlzIGVzcGVjaWFsbHkgdXNlZnVsIHdoZW4gY2hpbGQgY29tcG9uZW50cyBhcmUgZGVmaW5lZCBhcyBmb2xsb3dzOlxuICpcbiAqIGBgYFxuICogW3tcbiAqICAgIHBhdGg6ICdwYXJlbnQvOmlkJyxcbiAqICAgIGNoaWxkcmVuOiBbXG4gKiAgICAgIHsgcGF0aDogJycsIGNvbXBvbmVudDogTWFpbkNoaWxkIH0sXG4gKiAgICAgIHsgcGF0aDogJycsIGNvbXBvbmVudDogQXV4Q2hpbGQsIG91dGxldDogJ2F1eCcgfVxuICogICAgXVxuICogfV1cbiAqIGBgYFxuICpcbiAqIFdpdGggdGhpcyBjb25maWd1cmF0aW9uIGluIHBsYWNlLCBuYXZpZ2F0aW5nIHRvICcvcGFyZW50LzEwJyB3aWxsIGNyZWF0ZSB0aGUgbWFpbiBjaGlsZCBhbmQgYXV4XG4gKiBjb21wb25lbnRzLlxuICpcbiAqICMjIyBMYXp5IExvYWRpbmdcbiAqXG4gKiBMYXp5IGxvYWRpbmcgc3BlZWRzIHVwIG91ciBhcHBsaWNhdGlvbiBsb2FkIHRpbWUgYnkgc3BsaXR0aW5nIGl0IGludG8gbXVsdGlwbGUgYnVuZGxlcywgYW5kXG4gKiBsb2FkaW5nIHRoZW0gb24gZGVtYW5kLiBUaGUgcm91dGVyIGlzIGRlc2lnbmVkIHRvIG1ha2UgbGF6eSBsb2FkaW5nIHNpbXBsZSBhbmQgZWFzeS4gSW5zdGVhZCBvZlxuICogcHJvdmlkaW5nIHRoZSBjaGlsZHJlbiBwcm9wZXJ0eSwgeW91IGNhbiBwcm92aWRlIHRoZSBgbG9hZENoaWxkcmVuYCBwcm9wZXJ0eSwgYXMgZm9sbG93czpcbiAqXG4gKiBgYGBcbiAqIFt7XG4gKiAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgIGNvbXBvbmVudDogVGVhbSxcbiAqICAgbG9hZENoaWxkcmVuOiAndGVhbSdcbiAqIH1dXG4gKiBgYGBcbiAqXG4gKiBUaGUgcm91dGVyIHdpbGwgdXNlIHJlZ2lzdGVyZWQgTmdNb2R1bGVGYWN0b3J5TG9hZGVyIHRvIGZldGNoIGFuIE5nTW9kdWxlIGFzc29jaWF0ZWQgd2l0aCAndGVhbScuXG4gKiBUaGVuIGl0IHdpbGwgZXh0cmFjdCB0aGUgc2V0IG9mIHJvdXRlcyBkZWZpbmVkIGluIHRoYXQgTmdNb2R1bGUsIGFuZCB3aWxsIHRyYW5zcGFyZW50bHkgYWRkXG4gKiB0aG9zZSByb3V0ZXMgdG8gdGhlIG1haW4gY29uZmlndXJhdGlvbi5cbiAqXG4gKiAgdXNlIFJvdXRlc1xuICovXG5leHBvcnQgdHlwZSBSb3V0ZXMgPSBSb3V0ZVtdO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvbiBSZXByZXNlbnRzIHRoZSByZXN1bHRzIG9mIHRoZSBVUkwgbWF0Y2hpbmcuXG4gKlxuICogKiBgY29uc3VtZWRgIGlzIGFuIGFycmF5IG9mIHRoZSBjb25zdW1lZCBVUkwgc2VnbWVudHMuXG4gKiAqIGBwb3NQYXJhbXNgIGlzIGEgbWFwIG9mIHBvc2l0aW9uYWwgcGFyYW1ldGVycy5cbiAqXG4gKiBAZXhwZXJpbWVudGFsXG4gKi9cbmV4cG9ydCB0eXBlIFVybE1hdGNoUmVzdWx0ID0ge1xuICBjb25zdW1lZDogVXJsU2VnbWVudFtdOyBwb3NQYXJhbXM/OiB7W25hbWU6IHN0cmluZ106IFVybFNlZ21lbnR9O1xufTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBBIGZ1bmN0aW9uIG1hdGNoaW5nIFVSTHNcbiAqXG4gKiBBIGN1c3RvbSBVUkwgbWF0Y2hlciBjYW4gYmUgcHJvdmlkZWQgd2hlbiBhIGNvbWJpbmF0aW9uIG9mIGBwYXRoYCBhbmQgYHBhdGhNYXRjaGAgaXNuJ3RcbiAqIGV4cHJlc3NpdmUgZW5vdWdoLlxuICpcbiAqIEZvciBpbnN0YW5jZSwgdGhlIGZvbGxvd2luZyBtYXRjaGVyIG1hdGNoZXMgaHRtbCBmaWxlcy5cbiAqXG4gKiBgYGBcbiAqIGV4cG9ydCBmdW5jdGlvbiBodG1sRmlsZXModXJsOiBVcmxTZWdtZW50W10pIHtcbiAqICAgcmV0dXJuIHVybC5sZW5ndGggPT09IDEgJiYgdXJsWzBdLnBhdGguZW5kc1dpdGgoJy5odG1sJykgPyAoe2NvbnN1bWVkOiB1cmx9KSA6IG51bGw7XG4gKiB9XG4gKlxuICogZXhwb3J0IGNvbnN0IHJvdXRlcyA9IFt7IG1hdGNoZXI6IGh0bWxGaWxlcywgY29tcG9uZW50OiBBbnlDb21wb25lbnQgfV07XG4gKiBgYGBcbiAqXG4gKiBAZXhwZXJpbWVudGFsXG4gKi9cbmV4cG9ydCB0eXBlIFVybE1hdGNoZXIgPSAoc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgZ3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGU6IFJvdXRlKSA9PlxuICAgIFVybE1hdGNoUmVzdWx0O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIHN0YXRpYyBkYXRhIGFzc29jaWF0ZWQgd2l0aCBhIHBhcnRpY3VsYXIgcm91dGUuXG4gKlxuICogU2VlIGBSb3V0ZXNgIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICovXG5leHBvcnQgdHlwZSBEYXRhID0ge1xuICBbbmFtZTogc3RyaW5nXTogYW55XG59O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIHJlc29sdmVkIGRhdGEgYXNzb2NpYXRlZCB3aXRoIGEgcGFydGljdWxhciByb3V0ZS5cbiAqXG4gKiBTZWUgYFJvdXRlc2AgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKi9cbmV4cG9ydCB0eXBlIFJlc29sdmVEYXRhID0ge1xuICBbbmFtZTogc3RyaW5nXTogYW55XG59O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFRoZSB0eXBlIG9mIGBsb2FkQ2hpbGRyZW5gLlxuICpcbiAqIFNlZSBgUm91dGVzYCBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqL1xuZXhwb3J0IHR5cGUgTG9hZENoaWxkcmVuQ2FsbGJhY2sgPSAoKSA9PlxuICAgIFR5cGU8YW55PnwgTmdNb2R1bGVGYWN0b3J5PGFueT58IFByb21pc2U8VHlwZTxhbnk+PnwgT2JzZXJ2YWJsZTxUeXBlPGFueT4+O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFRoZSB0eXBlIG9mIGBsb2FkQ2hpbGRyZW5gLlxuICpcbiAqIFNlZSBgUm91dGVzYCBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqL1xuZXhwb3J0IHR5cGUgTG9hZENoaWxkcmVuID0gc3RyaW5nIHwgTG9hZENoaWxkcmVuQ2FsbGJhY2s7XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogVGhlIHR5cGUgb2YgYHF1ZXJ5UGFyYW1zSGFuZGxpbmdgLlxuICpcbiAqIFNlZSBgUm91dGVyTGlua2AgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKi9cbmV4cG9ydCB0eXBlIFF1ZXJ5UGFyYW1zSGFuZGxpbmcgPSAnbWVyZ2UnIHwgJ3ByZXNlcnZlJyB8ICcnO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFRoZSB0eXBlIG9mIGBydW5HdWFyZHNBbmRSZXNvbHZlcnNgLlxuICpcbiAqIFNlZSBgUm91dGVzYCBmb3IgbW9yZSBkZXRhaWxzLlxuICogQGV4cGVyaW1lbnRhbFxuICovXG5leHBvcnQgdHlwZSBSdW5HdWFyZHNBbmRSZXNvbHZlcnMgPSAncGFyYW1zQ2hhbmdlJyB8ICdwYXJhbXNPclF1ZXJ5UGFyYW1zQ2hhbmdlJyB8ICdhbHdheXMnO1xuXG4vKipcbiAqIFNlZSBgUm91dGVzYCBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSb3V0ZSB7XG4gIHBhdGg/OiBzdHJpbmc7XG4gIHBhdGhNYXRjaD86IHN0cmluZztcbiAgbWF0Y2hlcj86IFVybE1hdGNoZXI7XG4gIGNvbXBvbmVudD86IFR5cGU8YW55PjtcbiAgcmVkaXJlY3RUbz86IHN0cmluZztcbiAgb3V0bGV0Pzogc3RyaW5nO1xuICBjYW5BY3RpdmF0ZT86IGFueVtdO1xuICBjYW5BY3RpdmF0ZUNoaWxkPzogYW55W107XG4gIGNhbkRlYWN0aXZhdGU/OiBhbnlbXTtcbiAgY2FuTG9hZD86IGFueVtdO1xuICBkYXRhPzogRGF0YTtcbiAgcmVzb2x2ZT86IFJlc29sdmVEYXRhO1xuICBjaGlsZHJlbj86IFJvdXRlcztcbiAgbG9hZENoaWxkcmVuPzogTG9hZENoaWxkcmVuO1xuICBydW5HdWFyZHNBbmRSZXNvbHZlcnM/OiBSdW5HdWFyZHNBbmRSZXNvbHZlcnM7XG4gIC8qKlxuICAgKiBGaWxsZWQgZm9yIHJvdXRlcyB3aXRoIGBsb2FkQ2hpbGRyZW5gIG9uY2UgdGhlIG1vZHVsZSBoYXMgYmVlbiBsb2FkZWRcbiAgICogQGludGVybmFsXG4gICAqL1xuICBfbG9hZGVkQ29uZmlnPzogTG9hZGVkUm91dGVyQ29uZmlnO1xufVxuXG5leHBvcnQgY2xhc3MgTG9hZGVkUm91dGVyQ29uZmlnIHtcbiAgY29uc3RydWN0b3IocHVibGljIHJvdXRlczogUm91dGVbXSwgcHVibGljIG1vZHVsZTogTmdNb2R1bGVSZWY8YW55Pikge31cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQ29uZmlnKGNvbmZpZzogUm91dGVzLCBwYXJlbnRQYXRoOiBzdHJpbmcgPSAnJyk6IHZvaWQge1xuICAvLyBmb3JFYWNoIGRvZXNuJ3QgaXRlcmF0ZSB1bmRlZmluZWQgdmFsdWVzXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29uZmlnLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3Qgcm91dGU6IFJvdXRlID0gY29uZmlnW2ldO1xuICAgIGNvbnN0IGZ1bGxQYXRoOiBzdHJpbmcgPSBnZXRGdWxsUGF0aChwYXJlbnRQYXRoLCByb3V0ZSk7XG4gICAgdmFsaWRhdGVOb2RlKHJvdXRlLCBmdWxsUGF0aCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVOb2RlKHJvdXRlOiBSb3V0ZSwgZnVsbFBhdGg6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoIXJvdXRlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBcbiAgICAgIEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBFbmNvdW50ZXJlZCB1bmRlZmluZWQgcm91dGUuXG4gICAgICBUaGUgcmVhc29uIG1pZ2h0IGJlIGFuIGV4dHJhIGNvbW1hLlxuXG4gICAgICBFeGFtcGxlOlxuICAgICAgY29uc3Qgcm91dGVzOiBSb3V0ZXMgPSBbXG4gICAgICAgIHsgcGF0aDogJycsIHJlZGlyZWN0VG86ICcvZGFzaGJvYXJkJywgcGF0aE1hdGNoOiAnZnVsbCcgfSxcbiAgICAgICAgeyBwYXRoOiAnZGFzaGJvYXJkJywgIGNvbXBvbmVudDogRGFzaGJvYXJkQ29tcG9uZW50IH0sLCA8PCB0d28gY29tbWFzXG4gICAgICAgIHsgcGF0aDogJ2RldGFpbC86aWQnLCBjb21wb25lbnQ6IEhlcm9EZXRhaWxDb21wb25lbnQgfVxuICAgICAgXTtcbiAgICBgKTtcbiAgfVxuICBpZiAoQXJyYXkuaXNBcnJheShyb3V0ZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBBcnJheSBjYW5ub3QgYmUgc3BlY2lmaWVkYCk7XG4gIH1cbiAgaWYgKCFyb3V0ZS5jb21wb25lbnQgJiYgKHJvdXRlLm91dGxldCAmJiByb3V0ZS5vdXRsZXQgIT09IFBSSU1BUllfT1VUTEVUKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBhIGNvbXBvbmVudGxlc3Mgcm91dGUgY2Fubm90IGhhdmUgYSBuYW1lZCBvdXRsZXQgc2V0YCk7XG4gIH1cbiAgaWYgKHJvdXRlLnJlZGlyZWN0VG8gJiYgcm91dGUuY2hpbGRyZW4pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogcmVkaXJlY3RUbyBhbmQgY2hpbGRyZW4gY2Fubm90IGJlIHVzZWQgdG9nZXRoZXJgKTtcbiAgfVxuICBpZiAocm91dGUucmVkaXJlY3RUbyAmJiByb3V0ZS5sb2FkQ2hpbGRyZW4pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogcmVkaXJlY3RUbyBhbmQgbG9hZENoaWxkcmVuIGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gIH1cbiAgaWYgKHJvdXRlLmNoaWxkcmVuICYmIHJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nOiBjaGlsZHJlbiBhbmQgbG9hZENoaWxkcmVuIGNhbm5vdCBiZSB1c2VkIHRvZ2V0aGVyYCk7XG4gIH1cbiAgaWYgKHJvdXRlLnJlZGlyZWN0VG8gJiYgcm91dGUuY29tcG9uZW50KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IHJlZGlyZWN0VG8gYW5kIGNvbXBvbmVudCBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmApO1xuICB9XG4gIGlmIChyb3V0ZS5wYXRoICYmIHJvdXRlLm1hdGNoZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogcGF0aCBhbmQgbWF0Y2hlciBjYW5ub3QgYmUgdXNlZCB0b2dldGhlcmApO1xuICB9XG4gIGlmIChyb3V0ZS5yZWRpcmVjdFRvID09PSB2b2lkIDAgJiYgIXJvdXRlLmNvbXBvbmVudCAmJiAhcm91dGUuY2hpbGRyZW4gJiYgIXJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAnJHtmdWxsUGF0aH0nLiBPbmUgb2YgdGhlIGZvbGxvd2luZyBtdXN0IGJlIHByb3ZpZGVkOiBjb21wb25lbnQsIHJlZGlyZWN0VG8sIGNoaWxkcmVuIG9yIGxvYWRDaGlsZHJlbmApO1xuICB9XG4gIGlmIChyb3V0ZS5wYXRoID09PSB2b2lkIDAgJiYgcm91dGUubWF0Y2hlciA9PT0gdm9pZCAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IHJvdXRlcyBtdXN0IGhhdmUgZWl0aGVyIGEgcGF0aCBvciBhIG1hdGNoZXIgc3BlY2lmaWVkYCk7XG4gIH1cbiAgaWYgKHR5cGVvZiByb3V0ZS5wYXRoID09PSAnc3RyaW5nJyAmJiByb3V0ZS5wYXRoLmNoYXJBdCgwKSA9PT0gJy8nKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2Ygcm91dGUgJyR7ZnVsbFBhdGh9JzogcGF0aCBjYW5ub3Qgc3RhcnQgd2l0aCBhIHNsYXNoYCk7XG4gIH1cbiAgaWYgKHJvdXRlLnBhdGggPT09ICcnICYmIHJvdXRlLnJlZGlyZWN0VG8gIT09IHZvaWQgMCAmJiByb3V0ZS5wYXRoTWF0Y2ggPT09IHZvaWQgMCkge1xuICAgIGNvbnN0IGV4cCA9XG4gICAgICAgIGBUaGUgZGVmYXVsdCB2YWx1ZSBvZiAncGF0aE1hdGNoJyBpcyAncHJlZml4JywgYnV0IG9mdGVuIHRoZSBpbnRlbnQgaXMgdG8gdXNlICdmdWxsJy5gO1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludmFsaWQgY29uZmlndXJhdGlvbiBvZiByb3V0ZSAne3BhdGg6IFwiJHtmdWxsUGF0aH1cIiwgcmVkaXJlY3RUbzogXCIke3JvdXRlLnJlZGlyZWN0VG99XCJ9JzogcGxlYXNlIHByb3ZpZGUgJ3BhdGhNYXRjaCcuICR7ZXhwfWApO1xuICB9XG4gIGlmIChyb3V0ZS5wYXRoTWF0Y2ggIT09IHZvaWQgMCAmJiByb3V0ZS5wYXRoTWF0Y2ggIT09ICdmdWxsJyAmJiByb3V0ZS5wYXRoTWF0Y2ggIT09ICdwcmVmaXgnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgSW52YWxpZCBjb25maWd1cmF0aW9uIG9mIHJvdXRlICcke2Z1bGxQYXRofSc6IHBhdGhNYXRjaCBjYW4gb25seSBiZSBzZXQgdG8gJ3ByZWZpeCcgb3IgJ2Z1bGwnYCk7XG4gIH1cbiAgaWYgKHJvdXRlLmNoaWxkcmVuKSB7XG4gICAgdmFsaWRhdGVDb25maWcocm91dGUuY2hpbGRyZW4sIGZ1bGxQYXRoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRGdWxsUGF0aChwYXJlbnRQYXRoOiBzdHJpbmcsIGN1cnJlbnRSb3V0ZTogUm91dGUpOiBzdHJpbmcge1xuICBpZiAoIWN1cnJlbnRSb3V0ZSkge1xuICAgIHJldHVybiBwYXJlbnRQYXRoO1xuICB9XG4gIGlmICghcGFyZW50UGF0aCAmJiAhY3VycmVudFJvdXRlLnBhdGgpIHtcbiAgICByZXR1cm4gJyc7XG4gIH0gZWxzZSBpZiAocGFyZW50UGF0aCAmJiAhY3VycmVudFJvdXRlLnBhdGgpIHtcbiAgICByZXR1cm4gYCR7cGFyZW50UGF0aH0vYDtcbiAgfSBlbHNlIGlmICghcGFyZW50UGF0aCAmJiBjdXJyZW50Um91dGUucGF0aCkge1xuICAgIHJldHVybiBjdXJyZW50Um91dGUucGF0aDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYCR7cGFyZW50UGF0aH0vJHtjdXJyZW50Um91dGUucGF0aH1gO1xuICB9XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNvcHlDb25maWcocjogUm91dGUpOiBSb3V0ZSB7XG4gIGNvbnN0IGNoaWxkcmVuID0gci5jaGlsZHJlbiAmJiByLmNoaWxkcmVuLm1hcChjb3B5Q29uZmlnKTtcbiAgcmV0dXJuIGNoaWxkcmVuID8gey4uLnIsIGNoaWxkcmVufSA6IHsuLi5yfTtcbn1cbiJdfQ==