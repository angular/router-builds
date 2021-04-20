/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { map, switchMap } from 'rxjs/operators';
import { applyRedirects as applyRedirectsFn } from '../apply_redirects';
export function applyRedirects(moduleInjector, configLoader, urlSerializer, config) {
    return switchMap(t => applyRedirectsFn(moduleInjector, configLoader, urlSerializer, t.extractedUrl, config)
        .pipe(map(urlAfterRedirects => (Object.assign(Object.assign({}, t), { urlAfterRedirects })))));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHlfcmVkaXJlY3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9vcGVyYXRvcnMvYXBwbHlfcmVkaXJlY3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUlILE9BQU8sRUFBQyxHQUFHLEVBQUUsU0FBUyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFOUMsT0FBTyxFQUFDLGNBQWMsSUFBSSxnQkFBZ0IsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBTXRFLE1BQU0sVUFBVSxjQUFjLENBQzFCLGNBQXdCLEVBQUUsWUFBZ0MsRUFBRSxhQUE0QixFQUN4RixNQUFjO0lBQ2hCLE9BQU8sU0FBUyxDQUNaLENBQUMsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUM7U0FDaEYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsaUNBQUssQ0FBQyxLQUFFLGlCQUFpQixJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0UsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0luamVjdG9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7TW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9ufSBmcm9tICdyeGpzJztcbmltcG9ydCB7bWFwLCBzd2l0Y2hNYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuaW1wb3J0IHthcHBseVJlZGlyZWN0cyBhcyBhcHBseVJlZGlyZWN0c0ZufSBmcm9tICcuLi9hcHBseV9yZWRpcmVjdHMnO1xuaW1wb3J0IHtSb3V0ZXN9IGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQge05hdmlnYXRpb25UcmFuc2l0aW9ufSBmcm9tICcuLi9yb3V0ZXInO1xuaW1wb3J0IHtSb3V0ZXJDb25maWdMb2FkZXJ9IGZyb20gJy4uL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7VXJsU2VyaWFsaXplcn0gZnJvbSAnLi4vdXJsX3RyZWUnO1xuXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlSZWRpcmVjdHMoXG4gICAgbW9kdWxlSW5qZWN0b3I6IEluamVjdG9yLCBjb25maWdMb2FkZXI6IFJvdXRlckNvbmZpZ0xvYWRlciwgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcbiAgICBjb25maWc6IFJvdXRlcyk6IE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbjxOYXZpZ2F0aW9uVHJhbnNpdGlvbj4ge1xuICByZXR1cm4gc3dpdGNoTWFwKFxuICAgICAgdCA9PiBhcHBseVJlZGlyZWN0c0ZuKG1vZHVsZUluamVjdG9yLCBjb25maWdMb2FkZXIsIHVybFNlcmlhbGl6ZXIsIHQuZXh0cmFjdGVkVXJsLCBjb25maWcpXG4gICAgICAgICAgICAgICAucGlwZShtYXAodXJsQWZ0ZXJSZWRpcmVjdHMgPT4gKHsuLi50LCB1cmxBZnRlclJlZGlyZWN0c30pKSkpO1xufVxuIl19