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
import { combineLatest } from 'rxjs';
import { filter, scan, startWith, switchMap, take } from 'rxjs/operators';
import { UrlTree } from '../url_tree';
/** @type {?} */
const INITIAL_VALUE = Symbol('INITIAL_VALUE');
/**
 * @return {?}
 */
export function prioritizedGuardValue() {
    return switchMap(obs => {
        return /** @type {?} */ (combineLatest(...obs.map(o => o.pipe(take(1), startWith(/** @type {?} */ (INITIAL_VALUE)))))
            .pipe(scan((acc, list) => {
            /** @type {?} */
            let isPending = false;
            return list.reduce((innerAcc, val, i) => {
                if (innerAcc !== INITIAL_VALUE)
                    return innerAcc;
                // Toggle pending flag if any values haven't been set yet
                if (val === INITIAL_VALUE)
                    isPending = true;
                // Any other return values are only valid if we haven't yet hit a pending call.
                // This guarantees that in the case of a guard at the bottom of the tree that
                // returns a redirect, we will wait for the higher priority guard at the top to
                // finish before performing the redirect.
                if (!isPending) {
                    // Early return when we hit a `false` value as that should always cancel
                    // navigation
                    if (val === false)
                        return val;
                    if (i === list.length - 1 || val instanceof UrlTree) {
                        return val;
                    }
                }
                return innerAcc;
            }, acc);
        }, INITIAL_VALUE), filter(item => item !== INITIAL_VALUE), take(1)));
    });
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpb3JpdGl6ZWRfZ3VhcmRfdmFsdWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL29wZXJhdG9ycy9wcmlvcml0aXplZF9ndWFyZF92YWx1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQVFBLE9BQU8sRUFBK0IsYUFBYSxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQ2pFLE9BQU8sRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFeEUsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGFBQWEsQ0FBQzs7QUFFcEMsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDOzs7O0FBRzlDLE1BQU0sVUFBVSxxQkFBcUI7SUFFbkMsT0FBTyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDckIseUJBQU8sYUFBYSxDQUNULEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsbUJBQUMsYUFBK0IsRUFBQyxDQUFDLENBQUMsQ0FBQzthQUNuRixJQUFJLENBQ0QsSUFBSSxDQUNBLENBQUMsR0FBbUIsRUFBRSxJQUFzQixFQUFFLEVBQUU7O1lBQzlDLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztZQUN0QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQVMsRUFBRSxFQUFFO2dCQUM5QyxJQUFJLFFBQVEsS0FBSyxhQUFhO29CQUFFLE9BQU8sUUFBUSxDQUFDOztnQkFHaEQsSUFBSSxHQUFHLEtBQUssYUFBYTtvQkFBRSxTQUFTLEdBQUcsSUFBSSxDQUFDOzs7OztnQkFNNUMsSUFBSSxDQUFDLFNBQVMsRUFBRTs7O29CQUdkLElBQUksR0FBRyxLQUFLLEtBQUs7d0JBQUUsT0FBTyxHQUFHLENBQUM7b0JBRTlCLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEdBQUcsWUFBWSxPQUFPLEVBQUU7d0JBQ25ELE9BQU8sR0FBRyxDQUFDO3FCQUNaO2lCQUNGO2dCQUVELE9BQU8sUUFBUSxDQUFDO2FBQ2pCLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDVCxFQUNELGFBQWEsQ0FBQyxFQUNsQixNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssYUFBYSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFnQyxFQUFDO0tBQ3pGLENBQUMsQ0FBQztDQUNKIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge09ic2VydmFibGUsIE9wZXJhdG9yRnVuY3Rpb24sIGNvbWJpbmVMYXRlc3R9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtmaWx0ZXIsIHNjYW4sIHN0YXJ0V2l0aCwgc3dpdGNoTWFwLCB0YWtlfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7VXJsVHJlZX0gZnJvbSAnLi4vdXJsX3RyZWUnO1xuXG5jb25zdCBJTklUSUFMX1ZBTFVFID0gU3ltYm9sKCdJTklUSUFMX1ZBTFVFJyk7XG5kZWNsYXJlIHR5cGUgSU5URVJJTV9WQUxVRVMgPSB0eXBlb2YgSU5JVElBTF9WQUxVRSB8IGJvb2xlYW4gfCBVcmxUcmVlO1xuXG5leHBvcnQgZnVuY3Rpb24gcHJpb3JpdGl6ZWRHdWFyZFZhbHVlKCk6XG4gICAgT3BlcmF0b3JGdW5jdGlvbjxPYnNlcnZhYmxlPGJvb2xlYW58VXJsVHJlZT5bXSwgYm9vbGVhbnxVcmxUcmVlPiB7XG4gIHJldHVybiBzd2l0Y2hNYXAob2JzID0+IHtcbiAgICByZXR1cm4gY29tYmluZUxhdGVzdChcbiAgICAgICAgICAgICAgIC4uLm9icy5tYXAobyA9PiBvLnBpcGUodGFrZSgxKSwgc3RhcnRXaXRoKElOSVRJQUxfVkFMVUUgYXMgSU5URVJJTV9WQUxVRVMpKSkpXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgICAgc2NhbihcbiAgICAgICAgICAgICAgICAoYWNjOiBJTlRFUklNX1ZBTFVFUywgbGlzdDogSU5URVJJTV9WQUxVRVNbXSkgPT4ge1xuICAgICAgICAgICAgICAgICAgbGV0IGlzUGVuZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpc3QucmVkdWNlKChpbm5lckFjYywgdmFsLCBpOiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlubmVyQWNjICE9PSBJTklUSUFMX1ZBTFVFKSByZXR1cm4gaW5uZXJBY2M7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVG9nZ2xlIHBlbmRpbmcgZmxhZyBpZiBhbnkgdmFsdWVzIGhhdmVuJ3QgYmVlbiBzZXQgeWV0XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWwgPT09IElOSVRJQUxfVkFMVUUpIGlzUGVuZGluZyA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQW55IG90aGVyIHJldHVybiB2YWx1ZXMgYXJlIG9ubHkgdmFsaWQgaWYgd2UgaGF2ZW4ndCB5ZXQgaGl0IGEgcGVuZGluZyBjYWxsLlxuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGd1YXJhbnRlZXMgdGhhdCBpbiB0aGUgY2FzZSBvZiBhIGd1YXJkIGF0IHRoZSBib3R0b20gb2YgdGhlIHRyZWUgdGhhdFxuICAgICAgICAgICAgICAgICAgICAvLyByZXR1cm5zIGEgcmVkaXJlY3QsIHdlIHdpbGwgd2FpdCBmb3IgdGhlIGhpZ2hlciBwcmlvcml0eSBndWFyZCBhdCB0aGUgdG9wIHRvXG4gICAgICAgICAgICAgICAgICAgIC8vIGZpbmlzaCBiZWZvcmUgcGVyZm9ybWluZyB0aGUgcmVkaXJlY3QuXG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNQZW5kaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gRWFybHkgcmV0dXJuIHdoZW4gd2UgaGl0IGEgYGZhbHNlYCB2YWx1ZSBhcyB0aGF0IHNob3VsZCBhbHdheXMgY2FuY2VsXG4gICAgICAgICAgICAgICAgICAgICAgLy8gbmF2aWdhdGlvblxuICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWwgPT09IGZhbHNlKSByZXR1cm4gdmFsO1xuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGkgPT09IGxpc3QubGVuZ3RoIC0gMSB8fCB2YWwgaW5zdGFuY2VvZiBVcmxUcmVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbm5lckFjYztcbiAgICAgICAgICAgICAgICAgIH0sIGFjYyk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBJTklUSUFMX1ZBTFVFKSxcbiAgICAgICAgICAgIGZpbHRlcihpdGVtID0+IGl0ZW0gIT09IElOSVRJQUxfVkFMVUUpLCB0YWtlKDEpKSBhcyBPYnNlcnZhYmxlPGJvb2xlYW58VXJsVHJlZT47XG4gIH0pO1xufVxuIl19