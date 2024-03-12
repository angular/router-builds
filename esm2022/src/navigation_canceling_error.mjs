/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NavigationCancellationCode } from './events';
import { isUrlTree } from './url_tree';
export const NAVIGATION_CANCELING_ERROR = 'ngNavigationCancelingError';
export function redirectingNavigationError(urlSerializer, redirect) {
    const { redirectTo, navigationBehaviorOptions } = isUrlTree(redirect)
        ? { redirectTo: redirect, navigationBehaviorOptions: undefined }
        : redirect;
    const error = navigationCancelingError(ngDevMode && `Redirecting to "${urlSerializer.serialize(redirectTo)}"`, NavigationCancellationCode.Redirect);
    error.url = redirectTo;
    error.navigationBehaviorOptions = navigationBehaviorOptions;
    return error;
}
export function navigationCancelingError(message, code) {
    const error = new Error(`NavigationCancelingError: ${message || ''}`);
    error[NAVIGATION_CANCELING_ERROR] = true;
    error.cancellationCode = code;
    return error;
}
export function isRedirectingNavigationCancelingError(error) {
    return (isNavigationCancelingError(error) &&
        isUrlTree(error.url));
}
export function isNavigationCancelingError(error) {
    return !!error && error[NAVIGATION_CANCELING_ERROR];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF2aWdhdGlvbl9jYW5jZWxpbmdfZXJyb3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL25hdmlnYXRpb25fY2FuY2VsaW5nX2Vycm9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQywwQkFBMEIsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUVwRCxPQUFPLEVBQUMsU0FBUyxFQUF5QixNQUFNLFlBQVksQ0FBQztBQUU3RCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyw0QkFBNEIsQ0FBQztBQVl2RSxNQUFNLFVBQVUsMEJBQTBCLENBQ3hDLGFBQTRCLEVBQzVCLFFBQW1DO0lBRW5DLE1BQU0sRUFBQyxVQUFVLEVBQUUseUJBQXlCLEVBQUMsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDO1FBQ2pFLENBQUMsQ0FBQyxFQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUseUJBQXlCLEVBQUUsU0FBUyxFQUFDO1FBQzlELENBQUMsQ0FBQyxRQUFRLENBQUM7SUFDYixNQUFNLEtBQUssR0FBRyx3QkFBd0IsQ0FDcEMsU0FBUyxJQUFJLG1CQUFtQixhQUFhLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQ3RFLDBCQUEwQixDQUFDLFFBQVEsQ0FDRyxDQUFDO0lBQ3pDLEtBQUssQ0FBQyxHQUFHLEdBQUcsVUFBVSxDQUFDO0lBQ3ZCLEtBQUssQ0FBQyx5QkFBeUIsR0FBRyx5QkFBeUIsQ0FBQztJQUM1RCxPQUFPLEtBQUssQ0FBQztBQUNmLENBQUM7QUFFRCxNQUFNLFVBQVUsd0JBQXdCLENBQ3RDLE9BQThCLEVBQzlCLElBQWdDO0lBRWhDLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLDZCQUE2QixPQUFPLElBQUksRUFBRSxFQUFFLENBQTZCLENBQUM7SUFDbEcsS0FBSyxDQUFDLDBCQUEwQixDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3pDLEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7SUFDOUIsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDO0FBRUQsTUFBTSxVQUFVLHFDQUFxQyxDQUNuRCxLQUFvRDtJQUVwRCxPQUFPLENBQ0wsMEJBQTBCLENBQUMsS0FBSyxDQUFDO1FBQ2pDLFNBQVMsQ0FBRSxLQUE2QyxDQUFDLEdBQUcsQ0FBQyxDQUM5RCxDQUFDO0FBQ0osQ0FBQztBQUVELE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxLQUFjO0lBQ3ZELE9BQU8sQ0FBQyxDQUFDLEtBQUssSUFBSyxLQUFrQyxDQUFDLDBCQUEwQixDQUFDLENBQUM7QUFDcEYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge05hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlfSBmcm9tICcuL2V2ZW50cyc7XG5pbXBvcnQge05hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMsIFJlZGlyZWN0Q29tbWFuZH0gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHtpc1VybFRyZWUsIFVybFNlcmlhbGl6ZXIsIFVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuXG5leHBvcnQgY29uc3QgTkFWSUdBVElPTl9DQU5DRUxJTkdfRVJST1IgPSAnbmdOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3InO1xuXG5leHBvcnQgdHlwZSBOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IgPSBFcnJvciAmIHtcbiAgW05BVklHQVRJT05fQ0FOQ0VMSU5HX0VSUk9SXTogdHJ1ZTtcbiAgY2FuY2VsbGF0aW9uQ29kZTogTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGU7XG59O1xuZXhwb3J0IHR5cGUgUmVkaXJlY3RpbmdOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IgPSBOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IgJiB7XG4gIHVybDogVXJsVHJlZTtcbiAgbmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucz86IE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnM7XG4gIGNhbmNlbGxhdGlvbkNvZGU6IE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLlJlZGlyZWN0O1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlZGlyZWN0aW5nTmF2aWdhdGlvbkVycm9yKFxuICB1cmxTZXJpYWxpemVyOiBVcmxTZXJpYWxpemVyLFxuICByZWRpcmVjdDogVXJsVHJlZSB8IFJlZGlyZWN0Q29tbWFuZCxcbik6IFJlZGlyZWN0aW5nTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yIHtcbiAgY29uc3Qge3JlZGlyZWN0VG8sIG5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnN9ID0gaXNVcmxUcmVlKHJlZGlyZWN0KVxuICAgID8ge3JlZGlyZWN0VG86IHJlZGlyZWN0LCBuYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zOiB1bmRlZmluZWR9XG4gICAgOiByZWRpcmVjdDtcbiAgY29uc3QgZXJyb3IgPSBuYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoXG4gICAgbmdEZXZNb2RlICYmIGBSZWRpcmVjdGluZyB0byBcIiR7dXJsU2VyaWFsaXplci5zZXJpYWxpemUocmVkaXJlY3RUbyl9XCJgLFxuICAgIE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLlJlZGlyZWN0LFxuICApIGFzIFJlZGlyZWN0aW5nTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yO1xuICBlcnJvci51cmwgPSByZWRpcmVjdFRvO1xuICBlcnJvci5uYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zID0gbmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucztcbiAgcmV0dXJuIGVycm9yO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yKFxuICBtZXNzYWdlOiBzdHJpbmcgfCBudWxsIHwgZmFsc2UsXG4gIGNvZGU6IE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLFxuKSB7XG4gIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKGBOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3I6ICR7bWVzc2FnZSB8fCAnJ31gKSBhcyBOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3I7XG4gIGVycm9yW05BVklHQVRJT05fQ0FOQ0VMSU5HX0VSUk9SXSA9IHRydWU7XG4gIGVycm9yLmNhbmNlbGxhdGlvbkNvZGUgPSBjb2RlO1xuICByZXR1cm4gZXJyb3I7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1JlZGlyZWN0aW5nTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yKFxuICBlcnJvcjogdW5rbm93biB8IFJlZGlyZWN0aW5nTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yLFxuKTogZXJyb3IgaXMgUmVkaXJlY3RpbmdOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3Ige1xuICByZXR1cm4gKFxuICAgIGlzTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yKGVycm9yKSAmJlxuICAgIGlzVXJsVHJlZSgoZXJyb3IgYXMgUmVkaXJlY3RpbmdOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IpLnVybClcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yKGVycm9yOiB1bmtub3duKTogZXJyb3IgaXMgTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yIHtcbiAgcmV0dXJuICEhZXJyb3IgJiYgKGVycm9yIGFzIE5hdmlnYXRpb25DYW5jZWxpbmdFcnJvcilbTkFWSUdBVElPTl9DQU5DRUxJTkdfRVJST1JdO1xufVxuIl19