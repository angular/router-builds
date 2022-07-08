/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { combineLatest } from 'rxjs';
import { filter, map, startWith, switchMap, take } from 'rxjs/operators';
const INITIAL_VALUE = Symbol();
/**
 * Takes an array of observables and returns the result of the first to emit something other than
 * `true`.
 *
 * If all Observables emit `true`, then this operator emits true.
 * Also note that only the first value of each observable is used.
 */
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
                else {
                    // Result finished and was not true. Return the result.
                    return result;
                }
            }
            // Everything resolved to true. Return true.
            return true;
        }), filter((item) => item !== INITIAL_VALUE), take(1));
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpb3JpdGl6ZWRfZ3VhcmRfdmFsdWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL29wZXJhdG9ycy9wcmlvcml0aXplZF9ndWFyZF92YWx1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsYUFBYSxFQUErQixNQUFNLE1BQU0sQ0FBQztBQUNqRSxPQUFPLEVBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBSXZFLE1BQU0sYUFBYSxHQUFHLE1BQU0sRUFBRSxDQUFDO0FBRy9COzs7Ozs7R0FNRztBQUNILE1BQU0sVUFBVSxxQkFBcUI7SUFFbkMsT0FBTyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDckIsT0FBTyxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxhQUErQixDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzFGLElBQUksQ0FDRCxHQUFHLENBQUMsQ0FBQyxPQUF5QixFQUFFLEVBQUU7WUFDaEMsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUU7Z0JBQzVCLElBQUksTUFBTSxLQUFLLElBQUksRUFBRTtvQkFDbkIsd0NBQXdDO29CQUN4QyxTQUFTO2lCQUNWO3FCQUFNLElBQUksTUFBTSxLQUFLLGFBQWEsRUFBRTtvQkFDbkMseURBQXlEO29CQUN6RCxPQUFPLGFBQWEsQ0FBQztpQkFDdEI7cUJBQU07b0JBQ0wsdURBQXVEO29CQUN2RCxPQUFPLE1BQU0sQ0FBQztpQkFDZjthQUNGO1lBQ0QsNENBQTRDO1lBQzVDLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDLEVBQ0YsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUEyQixFQUFFLENBQUMsSUFBSSxLQUFLLGFBQWEsQ0FBQyxFQUNqRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQ1YsQ0FBQztJQUNSLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2NvbWJpbmVMYXRlc3QsIE9ic2VydmFibGUsIE9wZXJhdG9yRnVuY3Rpb259IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtmaWx0ZXIsIG1hcCwgc3RhcnRXaXRoLCBzd2l0Y2hNYXAsIHRha2V9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHtVcmxUcmVlfSBmcm9tICcuLi91cmxfdHJlZSc7XG5cbmNvbnN0IElOSVRJQUxfVkFMVUUgPSBTeW1ib2woKTtcbmRlY2xhcmUgdHlwZSBJTlRFUklNX1ZBTFVFUyA9IHR5cGVvZiBJTklUSUFMX1ZBTFVFIHwgYm9vbGVhbiB8IFVybFRyZWU7XG5cbi8qKlxuICogVGFrZXMgYW4gYXJyYXkgb2Ygb2JzZXJ2YWJsZXMgYW5kIHJldHVybnMgdGhlIHJlc3VsdCBvZiB0aGUgZmlyc3QgdG8gZW1pdCBzb21ldGhpbmcgb3RoZXIgdGhhblxuICogYHRydWVgLlxuICpcbiAqIElmIGFsbCBPYnNlcnZhYmxlcyBlbWl0IGB0cnVlYCwgdGhlbiB0aGlzIG9wZXJhdG9yIGVtaXRzIHRydWUuXG4gKiBBbHNvIG5vdGUgdGhhdCBvbmx5IHRoZSBmaXJzdCB2YWx1ZSBvZiBlYWNoIG9ic2VydmFibGUgaXMgdXNlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByaW9yaXRpemVkR3VhcmRWYWx1ZSgpOlxuICAgIE9wZXJhdG9yRnVuY3Rpb248T2JzZXJ2YWJsZTxib29sZWFufFVybFRyZWU+W10sIGJvb2xlYW58VXJsVHJlZT4ge1xuICByZXR1cm4gc3dpdGNoTWFwKG9icyA9PiB7XG4gICAgcmV0dXJuIGNvbWJpbmVMYXRlc3Qob2JzLm1hcChvID0+IG8ucGlwZSh0YWtlKDEpLCBzdGFydFdpdGgoSU5JVElBTF9WQUxVRSBhcyBJTlRFUklNX1ZBTFVFUykpKSlcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICBtYXAoKHJlc3VsdHM6IElOVEVSSU1fVkFMVUVTW10pID0+IHtcbiAgICAgICAgICAgICAgZm9yIChjb25zdCByZXN1bHQgb2YgcmVzdWx0cykge1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgIC8vIElmIHJlc3VsdCBpcyB0cnVlLCBjaGVjayB0aGUgbmV4dCBvbmVcbiAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09PSBJTklUSUFMX1ZBTFVFKSB7XG4gICAgICAgICAgICAgICAgICAvLyBJZiBndWFyZCBoYXMgbm90IGZpbmlzaGVkLCB3ZSBuZWVkIHRvIHN0b3AgcHJvY2Vzc2luZy5cbiAgICAgICAgICAgICAgICAgIHJldHVybiBJTklUSUFMX1ZBTFVFO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAvLyBSZXN1bHQgZmluaXNoZWQgYW5kIHdhcyBub3QgdHJ1ZS4gUmV0dXJuIHRoZSByZXN1bHQuXG4gICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBFdmVyeXRoaW5nIHJlc29sdmVkIHRvIHRydWUuIFJldHVybiB0cnVlLlxuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgZmlsdGVyKChpdGVtKTogaXRlbSBpcyBib29sZWFufFVybFRyZWUgPT4gaXRlbSAhPT0gSU5JVElBTF9WQUxVRSksXG4gICAgICAgICAgICB0YWtlKDEpLFxuICAgICAgICApO1xuICB9KTtcbn1cbiJdfQ==