/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { combineLatest } from 'rxjs';
import { filter, map, startWith, switchMap, take } from 'rxjs/operators';
import { UrlTree } from '../url_tree';
const INITIAL_VALUE = Symbol('INITIAL_VALUE');
export function prioritizedGuardValue() {
    return switchMap(obs => {
        return combineLatest(obs.map(o => o.pipe(take(1), startWith(INITIAL_VALUE))))
            .pipe(map((results) => {
            for (const result of results) {
                if (result === true) {
                    // If result is true, check the next one
                    continue;
                }
                else if (result === INITIAL_VALUE) {
                    // If guard has not finished, we need to stop processing.
                    return INITIAL_VALUE;
                }
                else if (result === false || result instanceof UrlTree) {
                    // Result finished and was not true. Return the result.
                    // Note that we only allow false/UrlTree. Other values are considered invalid and
                    // ignored.
                    return result;
                }
            }
            // Everything resolved to true. Return true.
            return true;
        }), filter((item) => item !== INITIAL_VALUE), take(1));
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpb3JpdGl6ZWRfZ3VhcmRfdmFsdWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL29wZXJhdG9ycy9wcmlvcml0aXplZF9ndWFyZF92YWx1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsYUFBYSxFQUErQixNQUFNLE1BQU0sQ0FBQztBQUNqRSxPQUFPLEVBQUMsTUFBTSxFQUFFLEdBQUcsRUFBUSxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRTdFLE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxhQUFhLENBQUM7QUFHcEMsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBRzlDLE1BQU0sVUFBVSxxQkFBcUI7SUFFbkMsT0FBTyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDckIsT0FBTyxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxhQUErQixDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzFGLElBQUksQ0FDRCxHQUFHLENBQUMsQ0FBQyxPQUF5QixFQUFFLEVBQUU7WUFDaEMsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUU7Z0JBQzVCLElBQUksTUFBTSxLQUFLLElBQUksRUFBRTtvQkFDbkIsd0NBQXdDO29CQUN4QyxTQUFTO2lCQUNWO3FCQUFNLElBQUksTUFBTSxLQUFLLGFBQWEsRUFBRTtvQkFDbkMseURBQXlEO29CQUN6RCxPQUFPLGFBQWEsQ0FBQztpQkFDdEI7cUJBQU0sSUFBSSxNQUFNLEtBQUssS0FBSyxJQUFJLE1BQU0sWUFBWSxPQUFPLEVBQUU7b0JBQ3hELHVEQUF1RDtvQkFDdkQsaUZBQWlGO29CQUNqRixXQUFXO29CQUNYLE9BQU8sTUFBTSxDQUFDO2lCQUNmO2FBQ0Y7WUFDRCw0Q0FBNEM7WUFDNUMsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUMsRUFDRixNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQTJCLEVBQUUsQ0FBQyxJQUFJLEtBQUssYUFBYSxDQUFDLEVBQ2pFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDVixDQUFDO0lBQ1IsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Y29tYmluZUxhdGVzdCwgT2JzZXJ2YWJsZSwgT3BlcmF0b3JGdW5jdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2ZpbHRlciwgbWFwLCBzY2FuLCBzdGFydFdpdGgsIHN3aXRjaE1hcCwgdGFrZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge1VybFRyZWV9IGZyb20gJy4uL3VybF90cmVlJztcbmltcG9ydCB7aXNVcmxUcmVlfSBmcm9tICcuLi91dGlscy90eXBlX2d1YXJkcyc7XG5cbmNvbnN0IElOSVRJQUxfVkFMVUUgPSBTeW1ib2woJ0lOSVRJQUxfVkFMVUUnKTtcbmRlY2xhcmUgdHlwZSBJTlRFUklNX1ZBTFVFUyA9IHR5cGVvZiBJTklUSUFMX1ZBTFVFIHwgYm9vbGVhbiB8IFVybFRyZWU7XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmlvcml0aXplZEd1YXJkVmFsdWUoKTpcbiAgICBPcGVyYXRvckZ1bmN0aW9uPE9ic2VydmFibGU8Ym9vbGVhbnxVcmxUcmVlPltdLCBib29sZWFufFVybFRyZWU+IHtcbiAgcmV0dXJuIHN3aXRjaE1hcChvYnMgPT4ge1xuICAgIHJldHVybiBjb21iaW5lTGF0ZXN0KG9icy5tYXAobyA9PiBvLnBpcGUodGFrZSgxKSwgc3RhcnRXaXRoKElOSVRJQUxfVkFMVUUgYXMgSU5URVJJTV9WQUxVRVMpKSkpXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgICAgbWFwKChyZXN1bHRzOiBJTlRFUklNX1ZBTFVFU1tdKSA9PiB7XG4gICAgICAgICAgICAgIGZvciAoY29uc3QgcmVzdWx0IG9mIHJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAvLyBJZiByZXN1bHQgaXMgdHJ1ZSwgY2hlY2sgdGhlIG5leHQgb25lXG4gICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PT0gSU5JVElBTF9WQUxVRSkge1xuICAgICAgICAgICAgICAgICAgLy8gSWYgZ3VhcmQgaGFzIG5vdCBmaW5pc2hlZCwgd2UgbmVlZCB0byBzdG9wIHByb2Nlc3NpbmcuXG4gICAgICAgICAgICAgICAgICByZXR1cm4gSU5JVElBTF9WQUxVRTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PT0gZmFsc2UgfHwgcmVzdWx0IGluc3RhbmNlb2YgVXJsVHJlZSkge1xuICAgICAgICAgICAgICAgICAgLy8gUmVzdWx0IGZpbmlzaGVkIGFuZCB3YXMgbm90IHRydWUuIFJldHVybiB0aGUgcmVzdWx0LlxuICAgICAgICAgICAgICAgICAgLy8gTm90ZSB0aGF0IHdlIG9ubHkgYWxsb3cgZmFsc2UvVXJsVHJlZS4gT3RoZXIgdmFsdWVzIGFyZSBjb25zaWRlcmVkIGludmFsaWQgYW5kXG4gICAgICAgICAgICAgICAgICAvLyBpZ25vcmVkLlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gRXZlcnl0aGluZyByZXNvbHZlZCB0byB0cnVlLiBSZXR1cm4gdHJ1ZS5cbiAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIGZpbHRlcigoaXRlbSk6IGl0ZW0gaXMgYm9vbGVhbnxVcmxUcmVlID0+IGl0ZW0gIT09IElOSVRJQUxfVkFMVUUpLFxuICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgKTtcbiAgfSk7XG59XG4iXX0=