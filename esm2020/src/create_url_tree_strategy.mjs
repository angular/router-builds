/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Injectable } from '@angular/core';
import { createSegmentGroupFromRoute, createUrlTree, createUrlTreeFromSegmentGroup } from './create_url_tree';
import * as i0 from "@angular/core";
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || ngDevMode;
export class LegacyCreateUrlTree {
    createUrlTree(relativeTo, currentState, currentUrlTree, commands, queryParams, fragment) {
        const a = relativeTo || currentState.root;
        return createUrlTree(a, currentUrlTree, commands, queryParams, fragment);
    }
}
LegacyCreateUrlTree.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.2.0-next.1+sha-0ad0136", ngImport: i0, type: LegacyCreateUrlTree, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
LegacyCreateUrlTree.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.2.0-next.1+sha-0ad0136", ngImport: i0, type: LegacyCreateUrlTree });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.2.0-next.1+sha-0ad0136", ngImport: i0, type: LegacyCreateUrlTree, decorators: [{
            type: Injectable
        }] });
export class CreateUrlTreeUsingSnapshot {
    createUrlTree(relativeTo, currentState, currentUrlTree, commands, queryParams, fragment) {
        let relativeToUrlSegmentGroup;
        try {
            const relativeToSnapshot = relativeTo ? relativeTo.snapshot : currentState.snapshot.root;
            relativeToUrlSegmentGroup = createSegmentGroupFromRoute(relativeToSnapshot);
        }
        catch (e) {
            // This is strictly for backwards compatibility with tests that create
            // invalid `ActivatedRoute` mocks.
            // Note: the difference between having this fallback for invalid `ActivatedRoute` setups and
            // just throwing is ~500 test failures. Fixing all of those tests by hand is not feasible at
            // the moment.
            if (NG_DEV_MODE) {
                console.warn(`The ActivatedRoute has an invalid structure. This is likely due to an incomplete mock in tests.`);
            }
            if (typeof commands[0] !== 'string' || !commands[0].startsWith('/')) {
                // Navigations that were absolute in the old way of creating UrlTrees
                // would still work because they wouldn't attempt to match the
                // segments in the `ActivatedRoute` to the `currentUrlTree` but
                // instead just replace the root segment with the navigation result.
                // Non-absolute navigations would fail to apply the commands because
                // the logic could not find the segment to replace (so they'd act like there were no
                // commands).
                commands = [];
            }
            relativeToUrlSegmentGroup = currentUrlTree.root;
        }
        return createUrlTreeFromSegmentGroup(relativeToUrlSegmentGroup, commands, queryParams, fragment);
    }
}
CreateUrlTreeUsingSnapshot.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.2.0-next.1+sha-0ad0136", ngImport: i0, type: CreateUrlTreeUsingSnapshot, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
CreateUrlTreeUsingSnapshot.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.2.0-next.1+sha-0ad0136", ngImport: i0, type: CreateUrlTreeUsingSnapshot });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.2.0-next.1+sha-0ad0136", ngImport: i0, type: CreateUrlTreeUsingSnapshot, decorators: [{
            type: Injectable
        }] });
export class CreateUrlTreeStrategy {
}
CreateUrlTreeStrategy.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.2.0-next.1+sha-0ad0136", ngImport: i0, type: CreateUrlTreeStrategy, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
CreateUrlTreeStrategy.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.2.0-next.1+sha-0ad0136", ngImport: i0, type: CreateUrlTreeStrategy, providedIn: 'root', useClass: LegacyCreateUrlTree });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.2.0-next.1+sha-0ad0136", ngImport: i0, type: CreateUrlTreeStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root', useClass: LegacyCreateUrlTree }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlX3VybF90cmVlX3N0cmF0ZWd5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jcmVhdGVfdXJsX3RyZWVfc3RyYXRlZ3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLFVBQVUsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUV6QyxPQUFPLEVBQUMsMkJBQTJCLEVBQUUsYUFBYSxFQUFFLDZCQUE2QixFQUFDLE1BQU0sbUJBQW1CLENBQUM7O0FBSzVHLE1BQU0sV0FBVyxHQUFHLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTLENBQUM7QUFHbEUsTUFBTSxPQUFPLG1CQUFtQjtJQUM5QixhQUFhLENBQ1QsVUFBeUMsRUFBRSxZQUF5QixFQUFFLGNBQXVCLEVBQzdGLFFBQWUsRUFBRSxXQUF3QixFQUFFLFFBQXFCO1FBQ2xFLE1BQU0sQ0FBQyxHQUFHLFVBQVUsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDO1FBQzFDLE9BQU8sYUFBYSxDQUFDLENBQUMsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUMzRSxDQUFDOzsySEFOVSxtQkFBbUI7K0hBQW5CLG1CQUFtQjtzR0FBbkIsbUJBQW1CO2tCQUQvQixVQUFVOztBQVdYLE1BQU0sT0FBTywwQkFBMEI7SUFDckMsYUFBYSxDQUNULFVBQXlDLEVBQUUsWUFBeUIsRUFBRSxjQUF1QixFQUM3RixRQUFlLEVBQUUsV0FBd0IsRUFBRSxRQUFxQjtRQUNsRSxJQUFJLHlCQUFvRCxDQUFDO1FBQ3pELElBQUk7WUFDRixNQUFNLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7WUFDekYseUJBQXlCLEdBQUcsMkJBQTJCLENBQUMsa0JBQWtCLENBQUMsQ0FBQztTQUM3RTtRQUFDLE9BQU8sQ0FBVSxFQUFFO1lBQ25CLHNFQUFzRTtZQUN0RSxrQ0FBa0M7WUFDbEMsNEZBQTRGO1lBQzVGLDRGQUE0RjtZQUM1RixjQUFjO1lBQ2QsSUFBSSxXQUFXLEVBQUU7Z0JBQ2YsT0FBTyxDQUFDLElBQUksQ0FDUixpR0FBaUcsQ0FBQyxDQUFDO2FBQ3hHO1lBQ0QsSUFBSSxPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUNuRSxxRUFBcUU7Z0JBQ3JFLDhEQUE4RDtnQkFDOUQsK0RBQStEO2dCQUMvRCxvRUFBb0U7Z0JBQ3BFLG9FQUFvRTtnQkFDcEUsb0ZBQW9GO2dCQUNwRixhQUFhO2dCQUNiLFFBQVEsR0FBRyxFQUFFLENBQUM7YUFDZjtZQUNELHlCQUF5QixHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUM7U0FDakQ7UUFDRCxPQUFPLDZCQUE2QixDQUNoQyx5QkFBeUIsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7O2tJQWhDVSwwQkFBMEI7c0lBQTFCLDBCQUEwQjtzR0FBMUIsMEJBQTBCO2tCQUR0QyxVQUFVOztBQXFDWCxNQUFNLE9BQWdCLHFCQUFxQjs7NkhBQXJCLHFCQUFxQjtpSUFBckIscUJBQXFCLGNBRGxCLE1BQU0sWUFBWSxtQkFBbUI7c0dBQ3hDLHFCQUFxQjtrQkFEMUMsVUFBVTttQkFBQyxFQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLG1CQUFtQixFQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SW5qZWN0YWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7Y3JlYXRlU2VnbWVudEdyb3VwRnJvbVJvdXRlLCBjcmVhdGVVcmxUcmVlLCBjcmVhdGVVcmxUcmVlRnJvbVNlZ21lbnRHcm91cH0gZnJvbSAnLi9jcmVhdGVfdXJsX3RyZWUnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZSwgUm91dGVyU3RhdGV9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UGFyYW1zfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge1VybFNlZ21lbnRHcm91cCwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlO1xuXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgTGVnYWN5Q3JlYXRlVXJsVHJlZSBpbXBsZW1lbnRzIENyZWF0ZVVybFRyZWVTdHJhdGVneSB7XG4gIGNyZWF0ZVVybFRyZWUoXG4gICAgICByZWxhdGl2ZVRvOiBBY3RpdmF0ZWRSb3V0ZXxudWxsfHVuZGVmaW5lZCwgY3VycmVudFN0YXRlOiBSb3V0ZXJTdGF0ZSwgY3VycmVudFVybFRyZWU6IFVybFRyZWUsXG4gICAgICBjb21tYW5kczogYW55W10sIHF1ZXJ5UGFyYW1zOiBQYXJhbXN8bnVsbCwgZnJhZ21lbnQ6IHN0cmluZ3xudWxsKTogVXJsVHJlZSB7XG4gICAgY29uc3QgYSA9IHJlbGF0aXZlVG8gfHwgY3VycmVudFN0YXRlLnJvb3Q7XG4gICAgcmV0dXJuIGNyZWF0ZVVybFRyZWUoYSwgY3VycmVudFVybFRyZWUsIGNvbW1hbmRzLCBxdWVyeVBhcmFtcywgZnJhZ21lbnQpO1xuICB9XG59XG5cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBDcmVhdGVVcmxUcmVlVXNpbmdTbmFwc2hvdCBpbXBsZW1lbnRzIENyZWF0ZVVybFRyZWVTdHJhdGVneSB7XG4gIGNyZWF0ZVVybFRyZWUoXG4gICAgICByZWxhdGl2ZVRvOiBBY3RpdmF0ZWRSb3V0ZXxudWxsfHVuZGVmaW5lZCwgY3VycmVudFN0YXRlOiBSb3V0ZXJTdGF0ZSwgY3VycmVudFVybFRyZWU6IFVybFRyZWUsXG4gICAgICBjb21tYW5kczogYW55W10sIHF1ZXJ5UGFyYW1zOiBQYXJhbXN8bnVsbCwgZnJhZ21lbnQ6IHN0cmluZ3xudWxsKTogVXJsVHJlZSB7XG4gICAgbGV0IHJlbGF0aXZlVG9VcmxTZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cHx1bmRlZmluZWQ7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlbGF0aXZlVG9TbmFwc2hvdCA9IHJlbGF0aXZlVG8gPyByZWxhdGl2ZVRvLnNuYXBzaG90IDogY3VycmVudFN0YXRlLnNuYXBzaG90LnJvb3Q7XG4gICAgICByZWxhdGl2ZVRvVXJsU2VnbWVudEdyb3VwID0gY3JlYXRlU2VnbWVudEdyb3VwRnJvbVJvdXRlKHJlbGF0aXZlVG9TbmFwc2hvdCk7XG4gICAgfSBjYXRjaCAoZTogdW5rbm93bikge1xuICAgICAgLy8gVGhpcyBpcyBzdHJpY3RseSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgd2l0aCB0ZXN0cyB0aGF0IGNyZWF0ZVxuICAgICAgLy8gaW52YWxpZCBgQWN0aXZhdGVkUm91dGVgIG1vY2tzLlxuICAgICAgLy8gTm90ZTogdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiBoYXZpbmcgdGhpcyBmYWxsYmFjayBmb3IgaW52YWxpZCBgQWN0aXZhdGVkUm91dGVgIHNldHVwcyBhbmRcbiAgICAgIC8vIGp1c3QgdGhyb3dpbmcgaXMgfjUwMCB0ZXN0IGZhaWx1cmVzLiBGaXhpbmcgYWxsIG9mIHRob3NlIHRlc3RzIGJ5IGhhbmQgaXMgbm90IGZlYXNpYmxlIGF0XG4gICAgICAvLyB0aGUgbW9tZW50LlxuICAgICAgaWYgKE5HX0RFVl9NT0RFKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAgIGBUaGUgQWN0aXZhdGVkUm91dGUgaGFzIGFuIGludmFsaWQgc3RydWN0dXJlLiBUaGlzIGlzIGxpa2VseSBkdWUgdG8gYW4gaW5jb21wbGV0ZSBtb2NrIGluIHRlc3RzLmApO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBjb21tYW5kc1swXSAhPT0gJ3N0cmluZycgfHwgIWNvbW1hbmRzWzBdLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgICAvLyBOYXZpZ2F0aW9ucyB0aGF0IHdlcmUgYWJzb2x1dGUgaW4gdGhlIG9sZCB3YXkgb2YgY3JlYXRpbmcgVXJsVHJlZXNcbiAgICAgICAgLy8gd291bGQgc3RpbGwgd29yayBiZWNhdXNlIHRoZXkgd291bGRuJ3QgYXR0ZW1wdCB0byBtYXRjaCB0aGVcbiAgICAgICAgLy8gc2VnbWVudHMgaW4gdGhlIGBBY3RpdmF0ZWRSb3V0ZWAgdG8gdGhlIGBjdXJyZW50VXJsVHJlZWAgYnV0XG4gICAgICAgIC8vIGluc3RlYWQganVzdCByZXBsYWNlIHRoZSByb290IHNlZ21lbnQgd2l0aCB0aGUgbmF2aWdhdGlvbiByZXN1bHQuXG4gICAgICAgIC8vIE5vbi1hYnNvbHV0ZSBuYXZpZ2F0aW9ucyB3b3VsZCBmYWlsIHRvIGFwcGx5IHRoZSBjb21tYW5kcyBiZWNhdXNlXG4gICAgICAgIC8vIHRoZSBsb2dpYyBjb3VsZCBub3QgZmluZCB0aGUgc2VnbWVudCB0byByZXBsYWNlIChzbyB0aGV5J2QgYWN0IGxpa2UgdGhlcmUgd2VyZSBub1xuICAgICAgICAvLyBjb21tYW5kcykuXG4gICAgICAgIGNvbW1hbmRzID0gW107XG4gICAgICB9XG4gICAgICByZWxhdGl2ZVRvVXJsU2VnbWVudEdyb3VwID0gY3VycmVudFVybFRyZWUucm9vdDtcbiAgICB9XG4gICAgcmV0dXJuIGNyZWF0ZVVybFRyZWVGcm9tU2VnbWVudEdyb3VwKFxuICAgICAgICByZWxhdGl2ZVRvVXJsU2VnbWVudEdyb3VwLCBjb21tYW5kcywgcXVlcnlQYXJhbXMsIGZyYWdtZW50KTtcbiAgfVxufVxuXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnLCB1c2VDbGFzczogTGVnYWN5Q3JlYXRlVXJsVHJlZX0pXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQ3JlYXRlVXJsVHJlZVN0cmF0ZWd5IHtcbiAgYWJzdHJhY3QgY3JlYXRlVXJsVHJlZShcbiAgICAgIHJlbGF0aXZlVG86IEFjdGl2YXRlZFJvdXRlfG51bGx8dW5kZWZpbmVkLCBjdXJyZW50U3RhdGU6IFJvdXRlclN0YXRlLCBjdXJyZW50VXJsVHJlZTogVXJsVHJlZSxcbiAgICAgIGNvbW1hbmRzOiBhbnlbXSwgcXVlcnlQYXJhbXM6IFBhcmFtc3xudWxsLCBmcmFnbWVudDogc3RyaW5nfG51bGwpOiBVcmxUcmVlO1xufVxuIl19