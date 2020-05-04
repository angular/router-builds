/**
 * @fileoverview added by tsickle
 * Generated from: packages/router/src/operators/resolve_data.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EMPTY, from, of } from 'rxjs';
import { concatMap, map, mergeMap, takeLast, tap } from 'rxjs/operators';
import { inheritedParamsDataResolve } from '../router_state';
import { wrapIntoObservable } from '../utils/collection';
import { getToken } from '../utils/preactivation';
/**
 * @param {?} paramsInheritanceStrategy
 * @param {?} moduleInjector
 * @return {?}
 */
export function resolveData(paramsInheritanceStrategy, moduleInjector) {
    return (/**
     * @param {?} source
     * @return {?}
     */
    function (source) {
        return source.pipe(mergeMap((/**
         * @param {?} t
         * @return {?}
         */
        t => {
            const { targetSnapshot, guards: { canActivateChecks } } = t;
            if (!canActivateChecks.length) {
                return of(t);
            }
            /** @type {?} */
            let canActivateChecksResolved = 0;
            return from(canActivateChecks)
                .pipe(concatMap((/**
             * @param {?} check
             * @return {?}
             */
            check => runResolve(check.route, (/** @type {?} */ (targetSnapshot)), paramsInheritanceStrategy, moduleInjector))), tap((/**
             * @return {?}
             */
            () => canActivateChecksResolved++)), takeLast(1), mergeMap((/**
             * @param {?} _
             * @return {?}
             */
            _ => canActivateChecksResolved === canActivateChecks.length ? of(t) : EMPTY)));
        })));
    });
}
/**
 * @param {?} futureARS
 * @param {?} futureRSS
 * @param {?} paramsInheritanceStrategy
 * @param {?} moduleInjector
 * @return {?}
 */
function runResolve(futureARS, futureRSS, paramsInheritanceStrategy, moduleInjector) {
    /** @type {?} */
    const resolve = futureARS._resolve;
    return resolveNode(resolve, futureARS, futureRSS, moduleInjector)
        .pipe(map((/**
     * @param {?} resolvedData
     * @return {?}
     */
    (resolvedData) => {
        futureARS._resolvedData = resolvedData;
        futureARS.data = Object.assign(Object.assign({}, futureARS.data), inheritedParamsDataResolve(futureARS, paramsInheritanceStrategy).resolve);
        return null;
    })));
}
/**
 * @param {?} resolve
 * @param {?} futureARS
 * @param {?} futureRSS
 * @param {?} moduleInjector
 * @return {?}
 */
function resolveNode(resolve, futureARS, futureRSS, moduleInjector) {
    /** @type {?} */
    const keys = Object.keys(resolve);
    if (keys.length === 0) {
        return of({});
    }
    /** @type {?} */
    const data = {};
    return from(keys).pipe(mergeMap((/**
     * @param {?} key
     * @return {?}
     */
    (key) => getResolver(resolve[key], futureARS, futureRSS, moduleInjector)
        .pipe(tap((/**
     * @param {?} value
     * @return {?}
     */
    (value) => {
        data[key] = value;
    }))))), takeLast(1), mergeMap((/**
     * @return {?}
     */
    () => {
        // Ensure all resolvers returned values, otherwise don't emit any "next" and just complete
        // the chain which will cancel navigation
        if (Object.keys(data).length === keys.length) {
            return of(data);
        }
        return EMPTY;
    })));
}
/**
 * @param {?} injectionToken
 * @param {?} futureARS
 * @param {?} futureRSS
 * @param {?} moduleInjector
 * @return {?}
 */
function getResolver(injectionToken, futureARS, futureRSS, moduleInjector) {
    /** @type {?} */
    const resolver = getToken(injectionToken, futureARS, moduleInjector);
    return resolver.resolve ? wrapIntoObservable(resolver.resolve(futureARS, futureRSS)) :
        wrapIntoObservable(resolver(futureARS, futureRSS));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZV9kYXRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9vcGVyYXRvcnMvcmVzb2x2ZV9kYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQVNBLE9BQU8sRUFBQyxLQUFLLEVBQUUsSUFBSSxFQUF3QyxFQUFFLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDM0UsT0FBTyxFQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUl2RSxPQUFPLEVBQXlCLDBCQUEwQixFQUFzQixNQUFNLGlCQUFpQixDQUFDO0FBQ3hHLE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQ3ZELE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQzs7Ozs7O0FBRWhELE1BQU0sVUFBVSxXQUFXLENBQ3ZCLHlCQUErQyxFQUMvQyxjQUF3QjtJQUMxQjs7OztJQUFPLFVBQVMsTUFBd0M7UUFDdEQsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVE7Ozs7UUFBQyxDQUFDLENBQUMsRUFBRTtrQkFDeEIsRUFBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLEVBQUMsaUJBQWlCLEVBQUMsRUFBQyxHQUFHLENBQUM7WUFFdkQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRTtnQkFDN0IsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDZDs7Z0JBQ0cseUJBQXlCLEdBQUcsQ0FBQztZQUNqQyxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztpQkFDekIsSUFBSSxDQUNELFNBQVM7Ozs7WUFDTCxLQUFLLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FDZixLQUFLLENBQUMsS0FBSyxFQUFFLG1CQUFBLGNBQWMsRUFBQyxFQUFFLHlCQUF5QixFQUFFLGNBQWMsQ0FBQyxFQUFDLEVBQ2pGLEdBQUc7OztZQUFDLEdBQUcsRUFBRSxDQUFDLHlCQUF5QixFQUFFLEVBQUMsRUFDdEMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUNYLFFBQVE7Ozs7WUFBQyxDQUFDLENBQUMsRUFBRSxDQUFDLHlCQUF5QixLQUFLLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FDeEYsQ0FBQztRQUNSLENBQUMsRUFBQyxDQUFDLENBQUM7SUFDTixDQUFDLEVBQUM7QUFDSixDQUFDOzs7Ozs7OztBQUVELFNBQVMsVUFBVSxDQUNmLFNBQWlDLEVBQUUsU0FBOEIsRUFDakUseUJBQStDLEVBQUUsY0FBd0I7O1VBQ3JFLE9BQU8sR0FBRyxTQUFTLENBQUMsUUFBUTtJQUNsQyxPQUFPLFdBQVcsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxjQUFjLENBQUM7U0FDNUQsSUFBSSxDQUFDLEdBQUc7Ozs7SUFBQyxDQUFDLFlBQWlCLEVBQUUsRUFBRTtRQUM5QixTQUFTLENBQUMsYUFBYSxHQUFHLFlBQVksQ0FBQztRQUN2QyxTQUFTLENBQUMsSUFBSSxtQ0FDVCxTQUFTLENBQUMsSUFBSSxHQUNkLDBCQUEwQixDQUFDLFNBQVMsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDLE9BQU8sQ0FDNUUsQ0FBQztRQUNGLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyxFQUFDLENBQUMsQ0FBQztBQUNWLENBQUM7Ozs7Ozs7O0FBRUQsU0FBUyxXQUFXLENBQ2hCLE9BQW9CLEVBQUUsU0FBaUMsRUFBRSxTQUE4QixFQUN2RixjQUF3Qjs7VUFDcEIsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ2pDLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDckIsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDZjs7VUFDSyxJQUFJLEdBQXVCLEVBQUU7SUFDbkMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUNsQixRQUFROzs7O0lBQ0osQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxjQUFjLENBQUM7U0FDMUQsSUFBSSxDQUFDLEdBQUc7Ozs7SUFBQyxDQUFDLEtBQVUsRUFBRSxFQUFFO1FBQ3ZCLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7SUFDcEIsQ0FBQyxFQUFDLENBQUMsRUFBQyxFQUM3QixRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQ1gsUUFBUTs7O0lBQUMsR0FBRyxFQUFFO1FBQ1osMEZBQTBGO1FBQzFGLHlDQUF5QztRQUN6QyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDNUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDakI7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUMsRUFBQyxDQUNMLENBQUM7QUFDSixDQUFDOzs7Ozs7OztBQUVELFNBQVMsV0FBVyxDQUNoQixjQUFtQixFQUFFLFNBQWlDLEVBQUUsU0FBOEIsRUFDdEYsY0FBd0I7O1VBQ3BCLFFBQVEsR0FBRyxRQUFRLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxjQUFjLENBQUM7SUFDcEUsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUQsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO0FBQy9FLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SW5qZWN0b3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtFTVBUWSwgZnJvbSwgTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uLCBPYnNlcnZhYmxlLCBvZn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NvbmNhdE1hcCwgbWFwLCBtZXJnZU1hcCwgdGFrZUxhc3QsIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge1Jlc29sdmVEYXRhfSBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHtOYXZpZ2F0aW9uVHJhbnNpdGlvbn0gZnJvbSAnLi4vcm91dGVyJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgaW5oZXJpdGVkUGFyYW1zRGF0YVJlc29sdmUsIFJvdXRlclN0YXRlU25hcHNob3R9IGZyb20gJy4uL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge3dyYXBJbnRvT2JzZXJ2YWJsZX0gZnJvbSAnLi4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge2dldFRva2VufSBmcm9tICcuLi91dGlscy9wcmVhY3RpdmF0aW9uJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVEYXRhKFxuICAgIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3k6ICdlbXB0eU9ubHknfCdhbHdheXMnLFxuICAgIG1vZHVsZUluamVjdG9yOiBJbmplY3Rvcik6IE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbjxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4ge1xuICByZXR1cm4gZnVuY3Rpb24oc291cmNlOiBPYnNlcnZhYmxlPE5hdmlnYXRpb25UcmFuc2l0aW9uPikge1xuICAgIHJldHVybiBzb3VyY2UucGlwZShtZXJnZU1hcCh0ID0+IHtcbiAgICAgIGNvbnN0IHt0YXJnZXRTbmFwc2hvdCwgZ3VhcmRzOiB7Y2FuQWN0aXZhdGVDaGVja3N9fSA9IHQ7XG5cbiAgICAgIGlmICghY2FuQWN0aXZhdGVDaGVja3MubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBvZih0KTtcbiAgICAgIH1cbiAgICAgIGxldCBjYW5BY3RpdmF0ZUNoZWNrc1Jlc29sdmVkID0gMDtcbiAgICAgIHJldHVybiBmcm9tKGNhbkFjdGl2YXRlQ2hlY2tzKVxuICAgICAgICAgIC5waXBlKFxuICAgICAgICAgICAgICBjb25jYXRNYXAoXG4gICAgICAgICAgICAgICAgICBjaGVjayA9PiBydW5SZXNvbHZlKFxuICAgICAgICAgICAgICAgICAgICAgIGNoZWNrLnJvdXRlLCB0YXJnZXRTbmFwc2hvdCEsIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3ksIG1vZHVsZUluamVjdG9yKSksXG4gICAgICAgICAgICAgIHRhcCgoKSA9PiBjYW5BY3RpdmF0ZUNoZWNrc1Jlc29sdmVkKyspLFxuICAgICAgICAgICAgICB0YWtlTGFzdCgxKSxcbiAgICAgICAgICAgICAgbWVyZ2VNYXAoXyA9PiBjYW5BY3RpdmF0ZUNoZWNrc1Jlc29sdmVkID09PSBjYW5BY3RpdmF0ZUNoZWNrcy5sZW5ndGggPyBvZih0KSA6IEVNUFRZKSxcbiAgICAgICAgICApO1xuICAgIH0pKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gcnVuUmVzb2x2ZShcbiAgICBmdXR1cmVBUlM6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGZ1dHVyZVJTUzogUm91dGVyU3RhdGVTbmFwc2hvdCxcbiAgICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiAnZW1wdHlPbmx5J3wnYWx3YXlzJywgbW9kdWxlSW5qZWN0b3I6IEluamVjdG9yKSB7XG4gIGNvbnN0IHJlc29sdmUgPSBmdXR1cmVBUlMuX3Jlc29sdmU7XG4gIHJldHVybiByZXNvbHZlTm9kZShyZXNvbHZlLCBmdXR1cmVBUlMsIGZ1dHVyZVJTUywgbW9kdWxlSW5qZWN0b3IpXG4gICAgICAucGlwZShtYXAoKHJlc29sdmVkRGF0YTogYW55KSA9PiB7XG4gICAgICAgIGZ1dHVyZUFSUy5fcmVzb2x2ZWREYXRhID0gcmVzb2x2ZWREYXRhO1xuICAgICAgICBmdXR1cmVBUlMuZGF0YSA9IHtcbiAgICAgICAgICAuLi5mdXR1cmVBUlMuZGF0YSxcbiAgICAgICAgICAuLi5pbmhlcml0ZWRQYXJhbXNEYXRhUmVzb2x2ZShmdXR1cmVBUlMsIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kpLnJlc29sdmVcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9KSk7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVOb2RlKFxuICAgIHJlc29sdmU6IFJlc29sdmVEYXRhLCBmdXR1cmVBUlM6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGZ1dHVyZVJTUzogUm91dGVyU3RhdGVTbmFwc2hvdCxcbiAgICBtb2R1bGVJbmplY3RvcjogSW5qZWN0b3IpOiBPYnNlcnZhYmxlPGFueT4ge1xuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocmVzb2x2ZSk7XG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBvZih7fSk7XG4gIH1cbiAgY29uc3QgZGF0YToge1trOiBzdHJpbmddOiBhbnl9ID0ge307XG4gIHJldHVybiBmcm9tKGtleXMpLnBpcGUoXG4gICAgICBtZXJnZU1hcChcbiAgICAgICAgICAoa2V5OiBzdHJpbmcpID0+IGdldFJlc29sdmVyKHJlc29sdmVba2V5XSwgZnV0dXJlQVJTLCBmdXR1cmVSU1MsIG1vZHVsZUluamVjdG9yKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5waXBlKHRhcCgodmFsdWU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpKSxcbiAgICAgIHRha2VMYXN0KDEpLFxuICAgICAgbWVyZ2VNYXAoKCkgPT4ge1xuICAgICAgICAvLyBFbnN1cmUgYWxsIHJlc29sdmVycyByZXR1cm5lZCB2YWx1ZXMsIG90aGVyd2lzZSBkb24ndCBlbWl0IGFueSBcIm5leHRcIiBhbmQganVzdCBjb21wbGV0ZVxuICAgICAgICAvLyB0aGUgY2hhaW4gd2hpY2ggd2lsbCBjYW5jZWwgbmF2aWdhdGlvblxuICAgICAgICBpZiAoT2JqZWN0LmtleXMoZGF0YSkubGVuZ3RoID09PSBrZXlzLmxlbmd0aCkge1xuICAgICAgICAgIHJldHVybiBvZihkYXRhKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICB9KSxcbiAgKTtcbn1cblxuZnVuY3Rpb24gZ2V0UmVzb2x2ZXIoXG4gICAgaW5qZWN0aW9uVG9rZW46IGFueSwgZnV0dXJlQVJTOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBmdXR1cmVSU1M6IFJvdXRlclN0YXRlU25hcHNob3QsXG4gICAgbW9kdWxlSW5qZWN0b3I6IEluamVjdG9yKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgY29uc3QgcmVzb2x2ZXIgPSBnZXRUb2tlbihpbmplY3Rpb25Ub2tlbiwgZnV0dXJlQVJTLCBtb2R1bGVJbmplY3Rvcik7XG4gIHJldHVybiByZXNvbHZlci5yZXNvbHZlID8gd3JhcEludG9PYnNlcnZhYmxlKHJlc29sdmVyLnJlc29sdmUoZnV0dXJlQVJTLCBmdXR1cmVSU1MpKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JhcEludG9PYnNlcnZhYmxlKHJlc29sdmVyKGZ1dHVyZUFSUywgZnV0dXJlUlNTKSk7XG59XG4iXX0=