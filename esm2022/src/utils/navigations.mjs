/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { filter, map, take } from 'rxjs/operators';
import { NavigationCancel, NavigationCancellationCode, NavigationEnd, NavigationError, NavigationSkipped, } from '../events';
var NavigationResult;
(function (NavigationResult) {
    NavigationResult[NavigationResult["COMPLETE"] = 0] = "COMPLETE";
    NavigationResult[NavigationResult["FAILED"] = 1] = "FAILED";
    NavigationResult[NavigationResult["REDIRECTING"] = 2] = "REDIRECTING";
})(NavigationResult || (NavigationResult = {}));
/**
 * Performs the given action once the router finishes its next/current navigation.
 *
 * The navigation is considered complete under the following conditions:
 * - `NavigationCancel` event emits and the code is not `NavigationCancellationCode.Redirect` or
 * `NavigationCancellationCode.SupersededByNewNavigation`. In these cases, the
 * redirecting/superseding navigation must finish.
 * - `NavigationError`, `NavigationEnd`, or `NavigationSkipped` event emits
 */
export function afterNextNavigation(router, action) {
    router.events
        .pipe(filter((e) => e instanceof NavigationEnd ||
        e instanceof NavigationCancel ||
        e instanceof NavigationError ||
        e instanceof NavigationSkipped), map((e) => {
        if (e instanceof NavigationEnd || e instanceof NavigationSkipped) {
            return NavigationResult.COMPLETE;
        }
        const redirecting = e instanceof NavigationCancel
            ? e.code === NavigationCancellationCode.Redirect ||
                e.code === NavigationCancellationCode.SupersededByNewNavigation
            : false;
        return redirecting ? NavigationResult.REDIRECTING : NavigationResult.FAILED;
    }), filter((result) => result !== NavigationResult.REDIRECTING), take(1))
        .subscribe(() => {
        action();
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF2aWdhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3V0aWxzL25hdmlnYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUdILE9BQU8sRUFBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRWpELE9BQU8sRUFFTCxnQkFBZ0IsRUFDaEIsMEJBQTBCLEVBQzFCLGFBQWEsRUFDYixlQUFlLEVBQ2YsaUJBQWlCLEdBQ2xCLE1BQU0sV0FBVyxDQUFDO0FBRW5CLElBQUssZ0JBSUo7QUFKRCxXQUFLLGdCQUFnQjtJQUNuQiwrREFBUSxDQUFBO0lBQ1IsMkRBQU0sQ0FBQTtJQUNOLHFFQUFXLENBQUE7QUFDYixDQUFDLEVBSkksZ0JBQWdCLEtBQWhCLGdCQUFnQixRQUlwQjtBQUVEOzs7Ozs7OztHQVFHO0FBQ0gsTUFBTSxVQUFVLG1CQUFtQixDQUFDLE1BQW1DLEVBQUUsTUFBa0I7SUFDekYsTUFBTSxDQUFDLE1BQU07U0FDVixJQUFJLENBQ0gsTUFBTSxDQUNKLENBQUMsQ0FBQyxFQUErRSxFQUFFLENBQ2pGLENBQUMsWUFBWSxhQUFhO1FBQzFCLENBQUMsWUFBWSxnQkFBZ0I7UUFDN0IsQ0FBQyxZQUFZLGVBQWU7UUFDNUIsQ0FBQyxZQUFZLGlCQUFpQixDQUNqQyxFQUNELEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQ1IsSUFBSSxDQUFDLFlBQVksYUFBYSxJQUFJLENBQUMsWUFBWSxpQkFBaUIsRUFBRSxDQUFDO1lBQ2pFLE9BQU8sZ0JBQWdCLENBQUMsUUFBUSxDQUFDO1FBQ25DLENBQUM7UUFDRCxNQUFNLFdBQVcsR0FDZixDQUFDLFlBQVksZ0JBQWdCO1lBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLDBCQUEwQixDQUFDLFFBQVE7Z0JBQzlDLENBQUMsQ0FBQyxJQUFJLEtBQUssMEJBQTBCLENBQUMseUJBQXlCO1lBQ2pFLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDWixPQUFPLFdBQVcsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7SUFDOUUsQ0FBQyxDQUFDLEVBQ0YsTUFBTSxDQUNKLENBQUMsTUFBTSxFQUFpRSxFQUFFLENBQ3hFLE1BQU0sS0FBSyxnQkFBZ0IsQ0FBQyxXQUFXLENBQzFDLEVBQ0QsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUNSO1NBQ0EsU0FBUyxDQUFDLEdBQUcsRUFBRTtRQUNkLE1BQU0sRUFBRSxDQUFDO0lBQ1gsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7T2JzZXJ2YWJsZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2ZpbHRlciwgbWFwLCB0YWtlfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7XG4gIEV2ZW50LFxuICBOYXZpZ2F0aW9uQ2FuY2VsLFxuICBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZSxcbiAgTmF2aWdhdGlvbkVuZCxcbiAgTmF2aWdhdGlvbkVycm9yLFxuICBOYXZpZ2F0aW9uU2tpcHBlZCxcbn0gZnJvbSAnLi4vZXZlbnRzJztcblxuZW51bSBOYXZpZ2F0aW9uUmVzdWx0IHtcbiAgQ09NUExFVEUsXG4gIEZBSUxFRCxcbiAgUkVESVJFQ1RJTkcsXG59XG5cbi8qKlxuICogUGVyZm9ybXMgdGhlIGdpdmVuIGFjdGlvbiBvbmNlIHRoZSByb3V0ZXIgZmluaXNoZXMgaXRzIG5leHQvY3VycmVudCBuYXZpZ2F0aW9uLlxuICpcbiAqIFRoZSBuYXZpZ2F0aW9uIGlzIGNvbnNpZGVyZWQgY29tcGxldGUgdW5kZXIgdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICogLSBgTmF2aWdhdGlvbkNhbmNlbGAgZXZlbnQgZW1pdHMgYW5kIHRoZSBjb2RlIGlzIG5vdCBgTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuUmVkaXJlY3RgIG9yXG4gKiBgTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuU3VwZXJzZWRlZEJ5TmV3TmF2aWdhdGlvbmAuIEluIHRoZXNlIGNhc2VzLCB0aGVcbiAqIHJlZGlyZWN0aW5nL3N1cGVyc2VkaW5nIG5hdmlnYXRpb24gbXVzdCBmaW5pc2guXG4gKiAtIGBOYXZpZ2F0aW9uRXJyb3JgLCBgTmF2aWdhdGlvbkVuZGAsIG9yIGBOYXZpZ2F0aW9uU2tpcHBlZGAgZXZlbnQgZW1pdHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFmdGVyTmV4dE5hdmlnYXRpb24ocm91dGVyOiB7ZXZlbnRzOiBPYnNlcnZhYmxlPEV2ZW50Pn0sIGFjdGlvbjogKCkgPT4gdm9pZCkge1xuICByb3V0ZXIuZXZlbnRzXG4gICAgLnBpcGUoXG4gICAgICBmaWx0ZXIoXG4gICAgICAgIChlKTogZSBpcyBOYXZpZ2F0aW9uRW5kIHwgTmF2aWdhdGlvbkNhbmNlbCB8IE5hdmlnYXRpb25FcnJvciB8IE5hdmlnYXRpb25Ta2lwcGVkID0+XG4gICAgICAgICAgZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25FbmQgfHxcbiAgICAgICAgICBlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkNhbmNlbCB8fFxuICAgICAgICAgIGUgaW5zdGFuY2VvZiBOYXZpZ2F0aW9uRXJyb3IgfHxcbiAgICAgICAgICBlIGluc3RhbmNlb2YgTmF2aWdhdGlvblNraXBwZWQsXG4gICAgICApLFxuICAgICAgbWFwKChlKSA9PiB7XG4gICAgICAgIGlmIChlIGluc3RhbmNlb2YgTmF2aWdhdGlvbkVuZCB8fCBlIGluc3RhbmNlb2YgTmF2aWdhdGlvblNraXBwZWQpIHtcbiAgICAgICAgICByZXR1cm4gTmF2aWdhdGlvblJlc3VsdC5DT01QTEVURTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZWRpcmVjdGluZyA9XG4gICAgICAgICAgZSBpbnN0YW5jZW9mIE5hdmlnYXRpb25DYW5jZWxcbiAgICAgICAgICAgID8gZS5jb2RlID09PSBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZS5SZWRpcmVjdCB8fFxuICAgICAgICAgICAgICBlLmNvZGUgPT09IE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLlN1cGVyc2VkZWRCeU5ld05hdmlnYXRpb25cbiAgICAgICAgICAgIDogZmFsc2U7XG4gICAgICAgIHJldHVybiByZWRpcmVjdGluZyA/IE5hdmlnYXRpb25SZXN1bHQuUkVESVJFQ1RJTkcgOiBOYXZpZ2F0aW9uUmVzdWx0LkZBSUxFRDtcbiAgICAgIH0pLFxuICAgICAgZmlsdGVyKFxuICAgICAgICAocmVzdWx0KTogcmVzdWx0IGlzIE5hdmlnYXRpb25SZXN1bHQuQ09NUExFVEUgfCBOYXZpZ2F0aW9uUmVzdWx0LkZBSUxFRCA9PlxuICAgICAgICAgIHJlc3VsdCAhPT0gTmF2aWdhdGlvblJlc3VsdC5SRURJUkVDVElORyxcbiAgICAgICksXG4gICAgICB0YWtlKDEpLFxuICAgIClcbiAgICAuc3Vic2NyaWJlKCgpID0+IHtcbiAgICAgIGFjdGlvbigpO1xuICAgIH0pO1xufVxuIl19