/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EMPTY, from, of } from 'rxjs';
import { concatMap, map, mergeMap, take, takeLast, tap } from 'rxjs/operators';
import { inheritedParamsDataResolve } from '../router_state';
import { wrapIntoObservable } from '../utils/collection';
import { getToken } from '../utils/preactivation';
/**
 * A private symbol used to store the value of `Route.title` inside the `Route.data` if it is a
 * static string or `Route.resolve` if anything else. This allows us to reuse the existing route
 * data/resolvers to support the title feature without new instrumentation in the `Router` pipeline.
 */
export const RouteTitle = Symbol('RouteTitle');
export function resolveData(paramsInheritanceStrategy, moduleInjector) {
    return mergeMap(t => {
        const { targetSnapshot, guards: { canActivateChecks } } = t;
        if (!canActivateChecks.length) {
            return of(t);
        }
        let canActivateChecksResolved = 0;
        return from(canActivateChecks)
            .pipe(concatMap(check => runResolve(check.route, targetSnapshot, paramsInheritanceStrategy, moduleInjector)), tap(() => canActivateChecksResolved++), takeLast(1), mergeMap(_ => canActivateChecksResolved === canActivateChecks.length ? of(t) : EMPTY));
    });
}
function runResolve(futureARS, futureRSS, paramsInheritanceStrategy, moduleInjector) {
    const config = futureARS.routeConfig;
    const resolve = futureARS._resolve;
    if (config?.title !== undefined && !hasStaticTitle(config)) {
        resolve[RouteTitle] = config.title;
    }
    return resolveNode(resolve, futureARS, futureRSS, moduleInjector)
        .pipe(map((resolvedData) => {
        futureARS._resolvedData = resolvedData;
        futureARS.data = inheritedParamsDataResolve(futureARS, paramsInheritanceStrategy).resolve;
        if (config && hasStaticTitle(config)) {
            futureARS.data[RouteTitle] = config.title;
        }
        return null;
    }));
}
function resolveNode(resolve, futureARS, futureRSS, moduleInjector) {
    const keys = getDataKeys(resolve);
    if (keys.length === 0) {
        return of({});
    }
    const data = {};
    return from(keys).pipe(mergeMap(key => getResolver(resolve[key], futureARS, futureRSS, moduleInjector)
        .pipe(take(1), tap((value) => {
        data[key] = value;
    }))), takeLast(1), mergeMap(() => {
        // Ensure all resolvers returned values, otherwise don't emit any "next" and just complete
        // the chain which will cancel navigation
        if (getDataKeys(data).length === keys.length) {
            return of(data);
        }
        return EMPTY;
    }));
}
function getDataKeys(obj) {
    return [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)];
}
function getResolver(injectionToken, futureARS, futureRSS, moduleInjector) {
    const resolver = getToken(injectionToken, futureARS, moduleInjector);
    return resolver.resolve ? wrapIntoObservable(resolver.resolve(futureARS, futureRSS)) :
        wrapIntoObservable(resolver(futureARS, futureRSS));
}
function hasStaticTitle(config) {
    return typeof config.title === 'string' || config.title === null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZV9kYXRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9vcGVyYXRvcnMvcmVzb2x2ZV9kYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUdILE9BQU8sRUFBQyxLQUFLLEVBQUUsSUFBSSxFQUF3QyxFQUFFLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDM0UsT0FBTyxFQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFJN0UsT0FBTyxFQUF5QiwwQkFBMEIsRUFBc0IsTUFBTSxpQkFBaUIsQ0FBQztBQUN4RyxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUN2RCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFFaEQ7Ozs7R0FJRztBQUNILE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7QUFFL0MsTUFBTSxVQUFVLFdBQVcsQ0FDdkIseUJBQStDLEVBQy9DLGNBQXdCO0lBQzFCLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ2xCLE1BQU0sRUFBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLEVBQUMsaUJBQWlCLEVBQUMsRUFBQyxHQUFHLENBQUMsQ0FBQztRQUV4RCxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFO1lBQzdCLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2Q7UUFDRCxJQUFJLHlCQUF5QixHQUFHLENBQUMsQ0FBQztRQUNsQyxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQzthQUN6QixJQUFJLENBQ0QsU0FBUyxDQUNMLEtBQUssQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUNmLEtBQUssQ0FBQyxLQUFL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LENBQUM7QUFDckUsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUNoQixjQUFtQixFQUFFLFNBQWlDLEVBQUUsU0FBOEIsRUFDdEYsY0FBd0I7SUFDMUIsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDckUsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUQsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO0FBQy9FLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxNQUFhO0lBQ25DLE9BQU8sT0FBTyxNQUFNLENBQUMsS0FBSyxLQUFLLFFBQVEsSUFBSSxNQUFNLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQztBQUNuRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SW5qZWN0b3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtFTVBUWSwgZnJvbSwgTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uLCBPYnNlcnZhYmxlLCBvZn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NvbmNhdE1hcCwgbWFwLCBtZXJnZU1hcCwgdGFrZSwgdGFrZUxhc3QsIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge1Jlc29sdmVEYXRhLCBSb3V0ZX0gZnJvbSAnLi4vbW9kZWxzJztcbmltcG9ydCB7TmF2aWdhdGlvblRyYW5zaXRpb259IGZyb20gJy4uL3JvdXRlcic7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIGluaGVyaXRlZFBhcmFtc0RhdGFSZXNvbHZlLCBSb3V0ZXJTdGF0ZVNuYXBzaG90fSBmcm9tICcuLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHt3cmFwSW50b09ic2VydmFibGV9IGZyb20gJy4uL3V0aWxzL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtnZXRUb2tlbn0gZnJvbSAnLi4vdXRpbHMvcHJlYWN0aXZhdGlvbic7XG5cbi8qKlxuICogQSBwcml2YXRlIHN5bWJvbCB1c2VkIHRvIHN0b3JlIHRoZSB2YWx1ZSBvZiBgUm91dGUudGl0bGVgIGluc2lkZSB0aGUgYFJvdXRlLmRhdGFgIGlmIGl0IGlzIGFcbiAqIHN0YXRpYyBzdHJpbmcgb3IgYFJvdXRlLnJlc29sdmVgIGlmIGFueXRoaW5nIGVsc2UuIFRoaXMgYWxsb3dzIHVzIHRvIHJldXNlIHRoZSBleGlzdGluZyByb3V0ZVxuICogZGF0YS9yZXNvbHZlcnMgdG8gc3VwcG9ydCB0aGUgdGl0bGUgZmVhdHVyZSB3aXRob3V0IG5ldyBpbnN0cnVtZW50YXRpb24gaW4gdGhlIGBSb3V0ZXJgIHBpcGVsaW5lLlxuICovXG5leHBvcnQgY29uc3QgUm91dGVUaXRsZSA9IFN5bWJvbCgnUm91dGVUaXRsZScpO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZURhdGEoXG4gICAgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogJ2VtcHR5T25seSd8J2Fsd2F5cycsXG4gICAgbW9kdWxlSW5qZWN0b3I6IEluamVjdG9yKTogTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uPE5hdmlnYXRpb25UcmFuc2l0aW9uPiB7XG4gIHJldHVybiBtZXJnZU1hcCh0ID0+IHtcbiAgICBjb25zdCB7dGFyZ2V0U25hcHNob3QsIGd1YXJkczoge2NhbkFjdGl2YXRlQ2hlY2tzfX0gPSB0O1xuXG4gICAgaWYgKCFjYW5BY3RpdmF0ZUNoZWNrcy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBvZih0KTtcbiAgICB9XG4gICAgbGV0IGNhbkFjdGl2YXRlQ2hlY2tzUmVzb2x2ZWQgPSAwO1xuICAgIHJldHVybiBmcm9tKGNhbkFjdGl2YXRlQ2hlY2tzKVxuICAgICAgICAucGlwZShcbiAgICAgICAgICAgIGNvbmNhdE1hcChcbiAgICAgICAgICAgICAgICBjaGVjayA9PiBydW5SZXNvbHZlKFxuICAgICAgICAgICAgICAgICAgICBjaGVjay5yb3V0ZSwgdGFyZ2V0U25hcHNob3QhLCBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LCBtb2R1bGVJbmplY3RvcikpLFxuICAgICAgICAgICAgdGFwKCgpID0+IGNhbkFjdGl2YXRlQ2hlY2tzUmVzb2x2ZWQrKyksXG4gICAgICAgICAgICB0YWtlTGFzdCgxKSxcbiAgICAgICAgICAgIG1lcmdlTWFwKF8gPT4gY2FuQWN0aXZhdGVDaGVja3NSZXNvbHZlZCA9PT0gY2FuQWN0aXZhdGVDaGVja3MubGVuZ3RoID8gb2YodCkgOiBFTVBUWSksXG4gICAgICAgICk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBydW5SZXNvbHZlKFxuICAgIGZ1dHVyZUFSUzogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgZnV0dXJlUlNTOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxuICAgIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6ICdlbXB0eU9ubHknfCdhbHdheXMnLCBtb2R1bGVJbmplY3RvcjogSW5qZWN0b3IpIHtcbiAgY29uc3QgY29uZmlnID0gZnV0dXJlQVJTLnJvdXRlQ29uZmlnO1xuICBjb25zdCByZXNvbHZlID0gZnV0dXJlQVJTLl9yZXNvbHZlO1xuICBpZiAoY29uZmlnPy50aXRsZSAhPT0gdW5kZWZpbmVkICYmICFoYXNTdGF0aWNUaXRsZShjb25maWcpKSB7XG4gICAgcmVzb2x2ZVtSb3V0ZVRpdGxlXSA9IGNvbmZpZy50aXRsZTtcbiAgfVxuICByZXR1cm4gcmVzb2x2ZU5vZGUocmVzb2x2ZSwgZnV0dXJlQVJTLCBmdXR1cmVSU1MsIG1vZHVsZUluamVjdG9yKVxuICAgICAgLnBpcGUobWFwKChyZXNvbHZlZERhdGE6IGFueSkgPT4ge1xuICAgICAgICBmdXR1cmVBUlMuX3Jlc29sdmVkRGF0YSA9IHJlc29sdmVkRGF0YTtcbiAgICAgICAgZnV0dXJlQVJTLmRhdGEgPSBpbmhlcml0ZWRQYXJhbXNEYXRhUmVzb2x2ZShmdXR1cmVBUlMsIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kpLnJlc29sdmU7XG4gICAgICAgIGlmIChjb25maWcgJiYgaGFzU3RhdGljVGl0bGUoY29uZmlnKSkge1xuICAgICAgICAgIGZ1dHVyZUFSUy5kYXRhW1JvdXRlVGl0bGVdID0gY29uZmlnLnRpdGxlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSkpO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlTm9kZShcbiAgICByZXNvbHZlOiBSZXNvbHZlRGF0YSwgZnV0dXJlQVJTOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBmdXR1cmVSU1M6IFJvdXRlclN0YXRlU25hcHNob3QsXG4gICAgbW9kdWxlSW5qZWN0b3I6IEluamVjdG9yKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgY29uc3Qga2V5cyA9IGdldERhdGFLZXlzKHJlc29sdmUpO1xuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gb2Yoe30pO1xuICB9XG4gIGNvbnN0IGRhdGE6IHtbazogc3RyaW5nfHN5bWJvbF06IGFueX0gPSB7fTtcbiAgcmV0dXJuIGZyb20oa2V5cykucGlwZShcbiAgICAgIG1lcmdlTWFwKFxuICAgICAgICAgIGtleSA9PiBnZXRSZXNvbHZlcihyZXNvbHZlW2tleV0sIGZ1dHVyZUFSUywgZnV0dXJlUlNTLCBtb2R1bGVJbmplY3RvcilcbiAgICAgICAgICAgICAgICAgICAgIC5waXBlKHRha2UoMSksIHRhcCgodmFsdWU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKSksXG4gICAgICB0YWtlTGFzdCgxKSxcbiAgICAgIG1lcmdlTWFwKCgpID0+IHtcbiAgICAgICAgLy8gRW5zdXJlIGFsbCByZXNvbHZlcnMgcmV0dXJuZWQgdmFsdWVzLCBvdGhlcndpc2UgZG9uJ3QgZW1pdCBhbnkgXCJuZXh0XCIgYW5kIGp1c3QgY29tcGxldGVcbiAgICAgICAgLy8gdGhlIGNoYWluIHdoaWNoIHdpbGwgY2FuY2VsIG5hdmlnYXRpb25cbiAgICAgICAgaWYgKGdldERhdGFLZXlzKGRhdGEpLmxlbmd0aCA9PT0ga2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICByZXR1cm4gb2YoZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgfSksXG4gICk7XG59XG5cbmZ1bmN0aW9uIGdldERhdGFLZXlzKG9iajogT2JqZWN0KTogQXJyYXk8c3RyaW5nfHN5bWJvbD4ge1xuICByZXR1cm4gWy4uLk9iamVjdC5rZXlzKG9iaiksIC4uLk9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMob2JqKV07XG59XG5cbmZ1bmN0aW9uIGdldFJlc29sdmVyKFxuICAgIGluamVjdGlvblRva2VuOiBhbnksIGZ1dHVyZUFSUzogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgZnV0dXJlUlNTOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxuICAgIG1vZHVsZUluamVjdG9yOiBJbmplY3Rvcik6IE9ic2VydmFibGU8YW55PiB7XG4gIGNvbnN0IHJlc29sdmVyID0gZ2V0VG9rZW4oaW5qZWN0aW9uVG9rZW4sIGZ1dHVyZUFSUywgbW9kdWxlSW5qZWN0b3IpO1xuICByZXR1cm4gcmVzb2x2ZXIucmVzb2x2ZSA/IHdyYXBJbnRvT2JzZXJ2YWJsZShyZXNvbHZlci5yZXNvbHZlKGZ1dHVyZUFSUywgZnV0dXJlUlNTKSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyYXBJbnRvT2JzZXJ2YWJsZShyZXNvbHZlcihmdXR1cmVBUlMsIGZ1dHVyZVJTUykpO1xufVxuXG5mdW5jdGlvbiBoYXNTdGF0aWNUaXRsZShjb25maWc6IFJvdXRlKSB7XG4gIHJldHVybiB0eXBlb2YgY29uZmlnLnRpdGxlID09PSAnc3RyaW5nJyB8fCBjb25maWcudGl0bGUgPT09IG51bGw7XG59XG4iXX0=