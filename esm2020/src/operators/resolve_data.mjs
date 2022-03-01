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
    const data = { ...futureARS.data };
    if (config?.title !== undefined) {
        if (typeof config.title === 'string' || config.title === null) {
            data[RouteTitle] = config.title;
        }
        else {
            resolve[RouteTitle] = config.title;
        }
    }
    return resolveNode(resolve, futureARS, futureRSS, moduleInjector)
        .pipe(map((resolvedData) => {
        futureARS._resolvedData = resolvedData;
        futureARS.data = {
            ...data,
            ...inheritedParamsDataResolve(futureARS, paramsInheritanceStrategy).resolve
        };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZV9kYXRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9vcGVyYXRvcnMvcmVzb2x2ZV9kYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUdILE9BQU8sRUFBQyxLQUFLLEVBQUUsSUFBSSxFQUF3QyxFQUFFLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDM0UsT0FBTyxFQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFJN0UsT0FBTyxFQUF5QiwwQkFBMEIsRUFBc0IsTUFBTSxpQkFBaUIsQ0FBQztBQUN4RyxPQUFPLEVBQUMsa0JBQWtCLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUN2RCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFFaEQ7Ozs7R0FJRztBQUNILE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7QUFFL0MsTUFBTSxVQUFVLFdBQVcsQ0FDdkIseUJBQStDLEVBQy9DLGNBQXdCO0lBQzFCLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ2xCLE1BQU0sRUFBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLEVBQUMsaUJBQWlCLEVBQUMsRUFBQyxHQUFHLENBQUMsQ0FBQztRQUV4RCxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFO1lBQzdCLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2Q7UUFDRCxJQUFJLHlCQUF5QixHQUFHLENBQUMsQ0FBQztRQUNsQyxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQzthQUN6QixJQUFJLENBQ0QsU0FBUyxDQUNMLEtBQUssQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUNmLEtBQUssQ0FBQyxLQUFL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Q0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxNQUFNLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNyRSxDQUFDO0FBRUQsU0FBUyxXQUFXLENBQ2hCLGNBQW1CLEVBQUUsU0FBaUMsRUFBRSxTQUE4QixFQUN0RixjQUF3QjtJQUMxQixNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUNyRSxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RCxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDL0UsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0luamVjdG9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7RU1QVFksIGZyb20sIE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbiwgT2JzZXJ2YWJsZSwgb2Z9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjb25jYXRNYXAsIG1hcCwgbWVyZ2VNYXAsIHRha2UsIHRha2VMYXN0LCB0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtSZXNvbHZlRGF0YX0gZnJvbSAnLi4vbW9kZWxzJztcbmltcG9ydCB7TmF2aWdhdGlvblRyYW5zaXRpb259IGZyb20gJy4uL3JvdXRlcic7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIGluaGVyaXRlZFBhcmFtc0RhdGFSZXNvbHZlLCBSb3V0ZXJTdGF0ZVNuYXBzaG90fSBmcm9tICcuLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHt3cmFwSW50b09ic2VydmFibGV9IGZyb20gJy4uL3V0aWxzL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtnZXRUb2tlbn0gZnJvbSAnLi4vdXRpbHMvcHJlYWN0aXZhdGlvbic7XG5cbi8qKlxuICogQSBwcml2YXRlIHN5bWJvbCB1c2VkIHRvIHN0b3JlIHRoZSB2YWx1ZSBvZiBgUm91dGUudGl0bGVgIGluc2lkZSB0aGUgYFJvdXRlLmRhdGFgIGlmIGl0IGlzIGFcbiAqIHN0YXRpYyBzdHJpbmcgb3IgYFJvdXRlLnJlc29sdmVgIGlmIGFueXRoaW5nIGVsc2UuIFRoaXMgYWxsb3dzIHVzIHRvIHJldXNlIHRoZSBleGlzdGluZyByb3V0ZVxuICogZGF0YS9yZXNvbHZlcnMgdG8gc3VwcG9ydCB0aGUgdGl0bGUgZmVhdHVyZSB3aXRob3V0IG5ldyBpbnN0cnVtZW50YXRpb24gaW4gdGhlIGBSb3V0ZXJgIHBpcGVsaW5lLlxuICovXG5leHBvcnQgY29uc3QgUm91dGVUaXRsZSA9IFN5bWJvbCgnUm91dGVUaXRsZScpO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZURhdGEoXG4gICAgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogJ2VtcHR5T25seSd8J2Fsd2F5cycsXG4gICAgbW9kdWxlSW5qZWN0b3I6IEluamVjdG9yKTogTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uPE5hdmlnYXRpb25UcmFuc2l0aW9uPiB7XG4gIHJldHVybiBtZXJnZU1hcCh0ID0+IHtcbiAgICBjb25zdCB7dGFyZ2V0U25hcHNob3QsIGd1YXJkczoge2NhbkFjdGl2YXRlQ2hlY2tzfX0gPSB0O1xuXG4gICAgaWYgKCFjYW5BY3RpdmF0ZUNoZWNrcy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBvZih0KTtcbiAgICB9XG4gICAgbGV0IGNhbkFjdGl2YXRlQ2hlY2tzUmVzb2x2ZWQgPSAwO1xuICAgIHJldHVybiBmcm9tKGNhbkFjdGl2YXRlQ2hlY2tzKVxuICAgICAgICAucGlwZShcbiAgICAgICAgICAgIGNvbmNhdE1hcChcbiAgICAgICAgICAgICAgICBjaGVjayA9PiBydW5SZXNvbHZlKFxuICAgICAgICAgICAgICAgICAgICBjaGVjay5yb3V0ZSwgdGFyZ2V0U25hcHNob3QhLCBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5LCBtb2R1bGVJbmplY3RvcikpLFxuICAgICAgICAgICAgdGFwKCgpID0+IGNhbkFjdGl2YXRlQ2hlY2tzUmVzb2x2ZWQrKyksXG4gICAgICAgICAgICB0YWtlTGFzdCgxKSxcbiAgICAgICAgICAgIG1lcmdlTWFwKF8gPT4gY2FuQWN0aXZhdGVDaGVja3NSZXNvbHZlZCA9PT0gY2FuQWN0aXZhdGVDaGVja3MubGVuZ3RoID8gb2YodCkgOiBFTVBUWSksXG4gICAgICAgICk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBydW5SZXNvbHZlKFxuICAgIGZ1dHVyZUFSUzogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgZnV0dXJlUlNTOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxuICAgIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6ICdlbXB0eU9ubHknfCdhbHdheXMnLCBtb2R1bGVJbmplY3RvcjogSW5qZWN0b3IpIHtcbiAgY29uc3QgY29uZmlnID0gZnV0dXJlQVJTLnJvdXRlQ29uZmlnO1xuICBjb25zdCByZXNvbHZlID0gZnV0dXJlQVJTLl9yZXNvbHZlO1xuICBjb25zdCBkYXRhID0gey4uLmZ1dHVyZUFSUy5kYXRhfTtcbiAgaWYgKGNvbmZpZz8udGl0bGUgIT09IHVuZGVmaW5lZCkge1xuICAgIGlmICh0eXBlb2YgY29uZmlnLnRpdGxlID09PSAnc3RyaW5nJyB8fCBjb25maWcudGl0bGUgPT09IG51bGwpIHtcbiAgICAgIGRhdGFbUm91dGVUaXRsZV0gPSBjb25maWcudGl0bGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc29sdmVbUm91dGVUaXRsZV0gPSBjb25maWcudGl0bGU7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXNvbHZlTm9kZShyZXNvbHZlLCBmdXR1cmVBUlMsIGZ1dHVyZVJTUywgbW9kdWxlSW5qZWN0b3IpXG4gICAgICAucGlwZShtYXAoKHJlc29sdmVkRGF0YTogYW55KSA9PiB7XG4gICAgICAgIGZ1dHVyZUFSUy5fcmVzb2x2ZWREYXRhID0gcmVzb2x2ZWREYXRhO1xuICAgICAgICBmdXR1cmVBUlMuZGF0YSA9IHtcbiAgICAgICAgICAuLi5kYXRhLFxuICAgICAgICAgIC4uLmluaGVyaXRlZFBhcmFtc0RhdGFSZXNvbHZlKGZ1dHVyZUFSUywgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSkucmVzb2x2ZVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0pKTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZU5vZGUoXG4gICAgcmVzb2x2ZTogUmVzb2x2ZURhdGEsIGZ1dHVyZUFSUzogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgZnV0dXJlUlNTOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxuICAgIG1vZHVsZUluamVjdG9yOiBJbmplY3Rvcik6IE9ic2VydmFibGU8YW55PiB7XG4gIGNvbnN0IGtleXMgPSBnZXREYXRhS2V5cyhyZXNvbHZlKTtcbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG9mKHt9KTtcbiAgfVxuICBjb25zdCBkYXRhOiB7W2s6IHN0cmluZ3xzeW1ib2xdOiBhbnl9ID0ge307XG4gIHJldHVybiBmcm9tKGtleXMpLnBpcGUoXG4gICAgICBtZXJnZU1hcChcbiAgICAgICAgICBrZXkgPT4gZ2V0UmVzb2x2ZXIocmVzb2x2ZVtrZXldLCBmdXR1cmVBUlMsIGZ1dHVyZVJTUywgbW9kdWxlSW5qZWN0b3IpXG4gICAgICAgICAgICAgICAgICAgICAucGlwZSh0YWtlKDEpLCB0YXAoKHZhbHVlOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9KSkpLFxuICAgICAgdGFrZUxhc3QoMSksXG4gICAgICBtZXJnZU1hcCgoKSA9PiB7XG4gICAgICAgIC8vIEVuc3VyZSBhbGwgcmVzb2x2ZXJzIHJldHVybmVkIHZhbHVlcywgb3RoZXJ3aXNlIGRvbid0IGVtaXQgYW55IFwibmV4dFwiIGFuZCBqdXN0IGNvbXBsZXRlXG4gICAgICAgIC8vIHRoZSBjaGFpbiB3aGljaCB3aWxsIGNhbmNlbCBuYXZpZ2F0aW9uXG4gICAgICAgIGlmIChnZXREYXRhS2V5cyhkYXRhKS5sZW5ndGggPT09IGtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgcmV0dXJuIG9mKGRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgIH0pLFxuICApO1xufVxuXG5mdW5jdGlvbiBnZXREYXRhS2V5cyhvYmo6IE9iamVjdCk6IEFycmF5PHN0cmluZ3xzeW1ib2w+IHtcbiAgcmV0dXJuIFsuLi5PYmplY3Qua2V5cyhvYmopLCAuLi5PYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKG9iaildO1xufVxuXG5mdW5jdGlvbiBnZXRSZXNvbHZlcihcbiAgICBpbmplY3Rpb25Ub2tlbjogYW55LCBmdXR1cmVBUlM6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGZ1dHVyZVJTUzogUm91dGVyU3RhdGVTbmFwc2hvdCxcbiAgICBtb2R1bGVJbmplY3RvcjogSW5qZWN0b3IpOiBPYnNlcnZhYmxlPGFueT4ge1xuICBjb25zdCByZXNvbHZlciA9IGdldFRva2VuKGluamVjdGlvblRva2VuLCBmdXR1cmVBUlMsIG1vZHVsZUluamVjdG9yKTtcbiAgcmV0dXJuIHJlc29sdmVyLnJlc29sdmUgPyB3cmFwSW50b09ic2VydmFibGUocmVzb2x2ZXIucmVzb2x2ZShmdXR1cmVBUlMsIGZ1dHVyZVJTUykpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cmFwSW50b09ic2VydmFibGUocmVzb2x2ZXIoZnV0dXJlQVJTLCBmdXR1cmVSU1MpKTtcbn1cbiJdfQ==