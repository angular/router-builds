/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { switchTap } from './switch_tap';
/**
 * @param {?} paramsInheritanceStrategy
 * @return {?}
 */
export function resolveData(paramsInheritanceStrategy) {
    return function (source) {
        return source.pipe(switchTap(t => {
            if (!t.preActivation) {
                throw new Error('PreActivation required to resolve data');
            }
            return t.preActivation.resolveData(paramsInheritanceStrategy);
        }));
    };
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZV9kYXRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9vcGVyYXRvcnMvcmVzb2x2ZV9kYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBV0EsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGNBQWMsQ0FBQzs7Ozs7QUFFdkMsTUFBTSxVQUFVLFdBQVcsQ0FBQyx5QkFBaUQ7SUFFM0UsT0FBTyxVQUFTLE1BQXdDO1FBQ3RELE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDL0IsSUFBSSxDQUFDLENBQUMsQ0FBQyxhQUFhLEVBQUU7Z0JBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0NBQXdDLENBQUMsQ0FBQzthQUMzRDtZQUNELE9BQU8sQ0FBQyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsQ0FBQztTQUMvRCxDQUFDLENBQUMsQ0FBQztLQUNMLENBQUM7Q0FDSCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb24sIE9ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge05hdmlnYXRpb25UcmFuc2l0aW9ufSBmcm9tICcuLi9yb3V0ZXInO1xuaW1wb3J0IHtzd2l0Y2hUYXB9IGZyb20gJy4vc3dpdGNoX3RhcCc7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlRGF0YShwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiAnZW1wdHlPbmx5JyB8ICdhbHdheXMnKTpcbiAgICBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248TmF2aWdhdGlvblRyYW5zaXRpb24+IHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHNvdXJjZTogT2JzZXJ2YWJsZTxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4pIHtcbiAgICByZXR1cm4gc291cmNlLnBpcGUoc3dpdGNoVGFwKHQgPT4ge1xuICAgICAgaWYgKCF0LnByZUFjdGl2YXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcmVBY3RpdmF0aW9uIHJlcXVpcmVkIHRvIHJlc29sdmUgZGF0YScpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHQucHJlQWN0aXZhdGlvbi5yZXNvbHZlRGF0YShwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5KTtcbiAgICB9KSk7XG4gIH07XG59XG4iXX0=