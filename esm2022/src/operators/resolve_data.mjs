/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { runInInjectionContext } from '@angular/core';
import { EMPTY, from, of, throwError } from 'rxjs';
import { catchError, concatMap, first, map, mapTo, mergeMap, takeLast, tap } from 'rxjs/operators';
import { RedirectCommand } from '../models';
import { getInherited, hasStaticTitle, } from '../router_state';
import { RouteTitleKey } from '../shared';
import { getDataKeys, wrapIntoObservable } from '../utils/collection';
import { getClosestRouteInjector } from '../utils/config';
import { getTokenOrFunctionIdentity } from '../utils/preactivation';
import { isEmptyError } from '../utils/type_guards';
import { redirectingNavigationError } from '../navigation_canceling_error';
import { DefaultUrlSerializer } from '../url_tree';
export function resolveData(paramsInheritanceStrategy, injector) {
    return mergeMap((t) => {
        const { targetSnapshot, guards: { canActivateChecks }, } = t;
        if (!canActivateChecks.length) {
            return of(t);
        }
        // Iterating a Set in javascript  happens in insertion order so it is safe to use a `Set` to
        // preserve the correct order that the resolvers should run in.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set#description
        const routesWithResolversToRun = new Set(canActivateChecks.map((check) => check.route));
        const routesNeedingDataUpdates = new Set();
        for (const route of routesWithResolversToRun) {
            if (routesNeedingDataUpdates.has(route)) {
                continue;
            }
            // All children under the route with a resolver to run need to recompute inherited data.
            for (const newRoute of flattenRouteTree(route)) {
                routesNeedingDataUpdates.add(newRoute);
            }
        }
        let routesProcessed = 0;
        return from(routesNeedingDataUpdates).pipe(concatMap((route) => {
            if (routesWithResolversToRun.has(route)) {
                return runResolve(route, targetSnapshot, paramsInheritanceStrategy, injector);
            }
            else {
                route.data = getInherited(route, route.parent, paramsInheritanceStrategy).resolve;
                return of(void 0);
            }
        }), tap(() => routesProcessed++), takeLast(1), mergeMap((_) => (routesProcessed === routesNeedingDataUpdates.size ? of(t) : EMPTY)));
    });
}
/**
 *  Returns the `ActivatedRouteSnapshot` tree as an array, using DFS to traverse the route tree.
 */
function flattenRouteTree(route) {
    const descendants = route.children.map((child) => flattenRouteTree(child)).flat();
    return [route, ...descendants];
}
function runResolve(futureARS, futureRSS, paramsInheritanceStrategy, injector) {
    const config = futureARS.routeConfig;
    const resolve = futureARS._resolve;
    if (config?.title !== undefined && !hasStaticTitle(config)) {
        resolve[RouteTitleKey] = config.title;
    }
    return resolveNode(resolve, futureARS, futureRSS, injector).pipe(map((resolvedData) => {
        futureARS._resolvedData = resolvedData;
        futureARS.data = getInherited(futureARS, futureARS.parent, paramsInheritanceStrategy).resolve;
        return null;
    }));
}
function resolveNode(resolve, futureARS, futureRSS, injector) {
    const keys = getDataKeys(resolve);
    if (keys.length === 0) {
        return of({});
    }
    const data = {};
    return from(keys).pipe(mergeMap((key) => getResolver(resolve[key], futureARS, futureRSS, injector).pipe(first(), tap((value) => {
        if (value instanceof RedirectCommand) {
            throw redirectingNavigationError(new DefaultUrlSerializer(), value);
        }
        data[key] = value;
    }))), takeLast(1), mapTo(data), catchError((e) => (isEmptyError(e) ? EMPTY : throwError(e))));
}
function getResolver(injectionToken, futureARS, futureRSS, injector) {
    const closestInjector = getClosestRouteInjector(futureARS) ?? injector;
    const resolver = getTokenOrFunctionIdentity(injectionToken, closestInjector);
    const resolverValue = resolver.resolve
        ? resolver.resolve(futureARS, futureRSS)
        : runInInjectionContext(closestInjector, () => resolver(futureARS, futureRSS));
    return wrapIntoObservable(resolverValue);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZV9kYXRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9vcGVyYXRvcnMvcmVzb2x2ZV9kYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBcUMscUJBQXFCLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDeEYsT0FBTyxFQUFDLEtBQUssRUFBRSxJQUFJLEVBQXdDLEVBQUUsRUFBRSxVQUFVLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDdkYsT0FBTyxFQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUVqRyxPQUFPLEVBQUMsZUFBZSxFQUFjLE1BQU0sV0FBVyxDQUFDO0FBRXZELE9BQU8sRUFFTCxZQUFZLEVBQ1osY0FBYyxHQUVmLE1BQU0saUJBQWlCLENBQUM7QUFDekIsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUN4QyxPQUFPLEVBQUMsV0FBVyxFQUFFLGtCQUFrQixFQUFDLE1BQU0scUJBQXFCLENBQUM7QUFDcEUsT0FBTyxFQUFDLHVCQUF1QixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDeEQsT0FBTyxFQUFDLDBCQUEwQixFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDbEUsT0FBTyxFQUFDLFlBQVksRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBQ2xELE9BQU8sRUFBQywwQkFBMEIsRUFBQyxNQUFNLCtCQUErQixDQUFDO0FBQ3pFLE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLGFBQWEsQ0FBQztBQUVqRCxNQUFNLFVBQVUsV0FBVyxDQUN6Qix5QkFBaUQsRUFDakQsUUFBNkI7SUFFN0IsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtR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QUMsQ0FBQyxFQUNYLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFDWCxVQUFVLENBQUMsQ0FBQyxDQUFVLEVBQUUsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQy9FLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxXQUFXLENBQ2xCLGNBQTZDLEVBQzdDLFNBQWlDLEVBQ2pDLFNBQThCLEVBQzlCLFFBQTZCO0lBRTdCLE1BQU0sZUFBZSxHQUFHLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxJQUFJLFFBQVEsQ0FBQztJQUN2RSxNQUFNLFFBQVEsR0FBRywwQkFBMEIsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDN0UsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLE9BQU87UUFDcEMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQztRQUN4QyxDQUFDLENBQUMscUJBQXFCLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUNqRixPQUFPLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQzNDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFbnZpcm9ubWVudEluamVjdG9yLCBQcm92aWRlclRva2VuLCBydW5JbkluamVjdGlvbkNvbnRleHR9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtFTVBUWSwgZnJvbSwgTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uLCBPYnNlcnZhYmxlLCBvZiwgdGhyb3dFcnJvcn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NhdGNoRXJyb3IsIGNvbmNhdE1hcCwgZmlyc3QsIG1hcCwgbWFwVG8sIG1lcmdlTWFwLCB0YWtlTGFzdCwgdGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7UmVkaXJlY3RDb21tYW5kLCBSZXNvbHZlRGF0YX0gZnJvbSAnLi4vbW9kZWxzJztcbmltcG9ydCB7TmF2aWdhdGlvblRyYW5zaXRpb259IGZyb20gJy4uL25hdmlnYXRpb25fdHJhbnNpdGlvbic7XG5pbXBvcnQge1xuICBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LFxuICBnZXRJbmhlcml0ZWQsXG4gIGhhc1N0YXRpY1RpdGxlLFxuICBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxufSBmcm9tICcuLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtSb3V0ZVRpdGxlS2V5fSBmcm9tICcuLi9zaGFyZWQnO1xuaW1wb3J0IHtnZXREYXRhS2V5cywgd3JhcEludG9PYnNlcnZhYmxlfSBmcm9tICcuLi91dGlscy9jb2xsZWN0aW9uJztcbmltcG9ydCB7Z2V0Q2xvc2VzdFJvdXRlSW5qZWN0b3J9IGZyb20gJy4uL3V0aWxzL2NvbmZpZyc7XG5pbXBvcnQge2dldFRva2VuT3JGdW5jdGlvbklkZW50aXR5fSBmcm9tICcuLi91dGlscy9wcmVhY3RpdmF0aW9uJztcbmltcG9ydCB7aXNFbXB0eUVycm9yfSBmcm9tICcuLi91dGlscy90eXBlX2d1YXJkcyc7XG5pbXBvcnQge3JlZGlyZWN0aW5nTmF2aWdhdGlvbkVycm9yfSBmcm9tICcuLi9uYXZpZ2F0aW9uX2NhbmNlbGluZ19lcnJvcic7XG5pbXBvcnQge0RlZmF1bHRVcmxTZXJpYWxpemVyfSBmcm9tICcuLi91cmxfdHJlZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlRGF0YShcbiAgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogJ2VtcHR5T25seScgfCAnYWx3YXlzJyxcbiAgaW5qZWN0b3I6IEVudmlyb25tZW50SW5qZWN0b3IsXG4pOiBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248TmF2aWdhdGlvblRyYW5zaXRpb24+IHtcbiAgcmV0dXJuIG1lcmdlTWFwKCh0KSA9PiB7XG4gICAgY29uc3Qge1xuICAgICAgdGFyZ2V0U25hcHNob3QsXG4gICAgICBndWFyZHM6IHtjYW5BY3RpdmF0ZUNoZWNrc30sXG4gICAgfSA9IHQ7XG5cbiAgICBpZiAoIWNhbkFjdGl2YXRlQ2hlY2tzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIG9mKHQpO1xuICAgIH1cbiAgICAvLyBJdGVyYXRpbmcgYSBTZXQgaW4gamF2YXNjcmlwdCAgaGFwcGVucyBpbiBpbnNlcnRpb24gb3JkZXIgc28gaXQgaXMgc2FmZSB0byB1c2UgYSBgU2V0YCB0b1xuICAgIC8vIHByZXNlcnZlIHRoZSBjb3JyZWN0IG9yZGVyIHRoYXQgdGhlIHJlc29sdmVycyBzaG91bGQgcnVuIGluLlxuICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL1NldCNkZXNjcmlwdGlvblxuICAgIGNvbnN0IHJvdXRlc1dpdGhSZXNvbHZlcnNUb1J1biA9IG5ldyBTZXQoY2FuQWN0aXZhdGVDaGVja3MubWFwKChjaGVjaykgPT4gY2hlY2sucm91dGUpKTtcbiAgICBjb25zdCByb3V0ZXNOZWVkaW5nRGF0YVVwZGF0ZXMgPSBuZXcgU2V0PEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KCk7XG4gICAgZm9yIChjb25zdCByb3V0ZSBvZiByb3V0ZXNXaXRoUmVzb2x2ZXJzVG9SdW4pIHtcbiAgICAgIGlmIChyb3V0ZXNOZWVkaW5nRGF0YVVwZGF0ZXMuaGFzKHJvdXRlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8vIEFsbCBjaGlsZHJlbiB1bmRlciB0aGUgcm91dGUgd2l0aCBhIHJlc29sdmVyIHRvIHJ1biBuZWVkIHRvIHJlY29tcHV0ZSBpbmhlcml0ZWQgZGF0YS5cbiAgICAgIGZvciAoY29uc3QgbmV3Um91dGUgb2YgZmxhdHRlblJvdXRlVHJlZShyb3V0ZSkpIHtcbiAgICAgICAgcm91dGVzTmVlZGluZ0RhdGFVcGRhdGVzLmFkZChuZXdSb3V0ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGxldCByb3V0ZXNQcm9jZXNzZWQgPSAwO1xuICAgIHJldHVybiBmcm9tKHJvdXRlc05lZWRpbmdEYXRhVXBkYXRlcykucGlwZShcbiAgICAgIGNvbmNhdE1hcCgocm91dGUpID0+IHtcbiAgICAgICAgaWYgKHJvdXRlc1dpdGhSZXNvbHZlcnNUb1J1bi5oYXMocm91dGUpKSB7XG4gICAgICAgICAgcmV0dXJuIHJ1blJlc29sdmUocm91dGUsIHRhcmdldFNuYXBzaG90ISwgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSwgaW5qZWN0b3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJvdXRlLmRhdGEgPSBnZXRJbmhlcml0ZWQocm91dGUsIHJvdXRlLnBhcmVudCwgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSkucmVzb2x2ZTtcbiAgICAgICAgICByZXR1cm4gb2Yodm9pZCAwKTtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICB0YXAoKCkgPT4gcm91dGVzUHJvY2Vzc2VkKyspLFxuICAgICAgdGFrZUxhc3QoMSksXG4gICAgICBtZXJnZU1hcCgoXykgPT4gKHJvdXRlc1Byb2Nlc3NlZCA9PT0gcm91dGVzTmVlZGluZ0RhdGFVcGRhdGVzLnNpemUgPyBvZih0KSA6IEVNUFRZKSksXG4gICAgKTtcbiAgfSk7XG59XG5cbi8qKlxuICogIFJldHVybnMgdGhlIGBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90YCB0cmVlIGFzIGFuIGFycmF5LCB1c2luZyBERlMgdG8gdHJhdmVyc2UgdGhlIHJvdXRlIHRyZWUuXG4gKi9cbmZ1bmN0aW9uIGZsYXR0ZW5Sb3V0ZVRyZWUocm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90W10ge1xuICBjb25zdCBkZXNjZW5kYW50cyA9IHJvdXRlLmNoaWxkcmVuLm1hcCgoY2hpbGQpID0+IGZsYXR0ZW5Sb3V0ZVRyZWUoY2hpbGQpKS5mbGF0KCk7XG4gIHJldHVybiBbcm91dGUsIC4uLmRlc2NlbmRhbnRzXTtcbn1cblxuZnVuY3Rpb24gcnVuUmVzb2x2ZShcbiAgZnV0dXJlQVJTOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LFxuICBmdXR1cmVSU1M6IFJvdXRlclN0YXRlU25hcHNob3QsXG4gIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6ICdlbXB0eU9ubHknIHwgJ2Fsd2F5cycsXG4gIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLFxuKSB7XG4gIGNvbnN0IGNvbmZpZyA9IGZ1dHVyZUFSUy5yb3V0ZUNvbmZpZztcbiAgY29uc3QgcmVzb2x2ZSA9IGZ1dHVyZUFSUy5fcmVzb2x2ZTtcbiAgaWYgKGNvbmZpZz8udGl0bGUgIT09IHVuZGVmaW5lZCAmJiAhaGFzU3RhdGljVGl0bGUoY29uZmlnKSkge1xuICAgIHJlc29sdmVbUm91dGVUaXRsZUtleV0gPSBjb25maWcudGl0bGU7XG4gIH1cbiAgcmV0dXJuIHJlc29sdmVOb2RlKHJlc29sdmUsIGZ1dHVyZUFSUywgZnV0dXJlUlNTLCBpbmplY3RvcikucGlwZShcbiAgICBtYXAoKHJlc29sdmVkRGF0YTogYW55KSA9PiB7XG4gICAgICBmdXR1cmVBUlMuX3Jlc29sdmVkRGF0YSA9IHJlc29sdmVkRGF0YTtcbiAgICAgIGZ1dHVyZUFSUy5kYXRhID0gZ2V0SW5oZXJpdGVkKGZ1dHVyZUFSUywgZnV0dXJlQVJTLnBhcmVudCwgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSkucmVzb2x2ZTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0pLFxuICApO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlTm9kZShcbiAgcmVzb2x2ZTogUmVzb2x2ZURhdGEsXG4gIGZ1dHVyZUFSUzogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCxcbiAgZnV0dXJlUlNTOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxuICBpbmplY3RvcjogRW52aXJvbm1lbnRJbmplY3Rvcixcbik6IE9ic2VydmFibGU8YW55PiB7XG4gIGNvbnN0IGtleXMgPSBnZXREYXRhS2V5cyhyZXNvbHZlKTtcbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG9mKHt9KTtcbiAgfVxuICBjb25zdCBkYXRhOiB7W2s6IHN0cmluZyB8IHN5bWJvbF06IGFueX0gPSB7fTtcbiAgcmV0dXJuIGZyb20oa2V5cykucGlwZShcbiAgICBtZXJnZU1hcCgoa2V5KSA9PlxuICAgICAgZ2V0UmVzb2x2ZXIocmVzb2x2ZVtrZXldLCBmdXR1cmVBUlMsIGZ1dHVyZVJTUywgaW5qZWN0b3IpLnBpcGUoXG4gICAgICAgIGZpcnN0KCksXG4gICAgICAgIHRhcCgodmFsdWU6IGFueSkgPT4ge1xuICAgICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFJlZGlyZWN0Q29tbWFuZCkge1xuICAgICAgICAgICAgdGhyb3cgcmVkaXJlY3RpbmdOYXZpZ2F0aW9uRXJyb3IobmV3IERlZmF1bHRVcmxTZXJpYWxpemVyKCksIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGF0YVtrZXldID0gdmFsdWU7XG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApLFxuICAgIHRha2VMYXN0KDEpLFxuICAgIG1hcFRvKGRhdGEpLFxuICAgIGNhdGNoRXJyb3IoKGU6IHVua25vd24pID0+IChpc0VtcHR5RXJyb3IoZSBhcyBFcnJvcikgPyBFTVBUWSA6IHRocm93RXJyb3IoZSkpKSxcbiAgKTtcbn1cblxuZnVuY3Rpb24gZ2V0UmVzb2x2ZXIoXG4gIGluamVjdGlvblRva2VuOiBQcm92aWRlclRva2VuPGFueT4gfCBGdW5jdGlvbixcbiAgZnV0dXJlQVJTOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LFxuICBmdXR1cmVSU1M6IFJvdXRlclN0YXRlU25hcHNob3QsXG4gIGluamVjdG9yOiBFbnZpcm9ubWVudEluamVjdG9yLFxuKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgY29uc3QgY2xvc2VzdEluamVjdG9yID0gZ2V0Q2xvc2VzdFJvdXRlSW5qZWN0b3IoZnV0dXJlQVJTKSA/PyBpbmplY3RvcjtcbiAgY29uc3QgcmVzb2x2ZXIgPSBnZXRUb2tlbk9yRnVuY3Rpb25JZGVudGl0eShpbmplY3Rpb25Ub2tlbiwgY2xvc2VzdEluamVjdG9yKTtcbiAgY29uc3QgcmVzb2x2ZXJWYWx1ZSA9IHJlc29sdmVyLnJlc29sdmVcbiAgICA/IHJlc29sdmVyLnJlc29sdmUoZnV0dXJlQVJTLCBmdXR1cmVSU1MpXG4gICAgOiBydW5JbkluamVjdGlvbkNvbnRleHQoY2xvc2VzdEluamVjdG9yLCAoKSA9PiByZXNvbHZlcihmdXR1cmVBUlMsIGZ1dHVyZVJTUykpO1xuICByZXR1cm4gd3JhcEludG9PYnNlcnZhYmxlKHJlc29sdmVyVmFsdWUpO1xufVxuIl19