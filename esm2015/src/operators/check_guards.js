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
import { map, mergeMap } from 'rxjs/operators';
/**
 * @return {?}
 */
export function checkGuards() {
    return function (source) {
        return source.pipe(mergeMap(t => {
            if (!t.preActivation) {
                throw new Error('PreActivation required to check guards');
            }
            return t.preActivation.checkGuards().pipe(map(guardsResult => (Object.assign({}, t, { guardsResult }))));
        }));
    };
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tfZ3VhcmRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9vcGVyYXRvcnMvY2hlY2tfZ3VhcmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBU0EsT0FBTyxFQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQzs7OztBQUk3QyxNQUFNLFVBQVUsV0FBVztJQUN6QixPQUFPLFVBQVMsTUFBd0M7UUFFdEQsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUM5QixJQUFJLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRTtnQkFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO2FBQzNEO1lBQ0QsT0FBTyxDQUFDLENBQUMsYUFBYSxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxtQkFBSyxDQUFDLElBQUUsWUFBWSxJQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3hGLENBQUMsQ0FBQyxDQUFDO0tBQ0wsQ0FBQztDQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge01vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbiwgT2JzZXJ2YWJsZSwgZnJvbSwgb2YgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7bWFwLCBtZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge05hdmlnYXRpb25UcmFuc2l0aW9ufSBmcm9tICcuLi9yb3V0ZXInO1xuXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tHdWFyZHMoKTogTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uPE5hdmlnYXRpb25UcmFuc2l0aW9uPiB7XG4gIHJldHVybiBmdW5jdGlvbihzb3VyY2U6IE9ic2VydmFibGU8TmF2aWdhdGlvblRyYW5zaXRpb24+KSB7XG5cbiAgICByZXR1cm4gc291cmNlLnBpcGUobWVyZ2VNYXAodCA9PiB7XG4gICAgICBpZiAoIXQucHJlQWN0aXZhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ByZUFjdGl2YXRpb24gcmVxdWlyZWQgdG8gY2hlY2sgZ3VhcmRzJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdC5wcmVBY3RpdmF0aW9uLmNoZWNrR3VhcmRzKCkucGlwZShtYXAoZ3VhcmRzUmVzdWx0ID0+ICh7Li4udCwgZ3VhcmRzUmVzdWx0fSkpKTtcbiAgICB9KSk7XG4gIH07XG59XG4iXX0=