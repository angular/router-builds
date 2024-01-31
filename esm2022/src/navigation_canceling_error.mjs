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
    const { redirectTo, navigationBehaviorOptions } = isUrlTree(redirect) ? { redirectTo: redirect, navigationBehaviorOptions: undefined } : redirect;
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
    return isNavigationCancelingError(error) &&
        isUrlTree(error.url);
}
export function isNavigationCancelingError(error) {
    return !!error && error[NAVIGATION_CANCELING_ERROR];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF2aWdhdGlvbl9jYW5jZWxpbmdfZXJyb3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL25hdmlnYXRpb25fY2FuY2VsaW5nX2Vycm9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQywwQkFBMEIsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUVwRCxPQUFPLEVBQUMsU0FBUyxFQUF5QixNQUFNLFlBQVksQ0FBQztBQUU3RCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyw0QkFBNEIsQ0FBQztBQVV2RSxNQUFNLFVBQVUsMEJBQTBCLENBQ3RDLGFBQTRCLEVBQUUsUUFBaUI7SUFDakQsTUFBTSxFQUFDLFVBQVUsRUFBRSx5QkFBeUIsRUFBQyxHQUN6QyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSx5QkFBeUIsRUFBRSxTQUFTLEVBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0lBQ2xHLE1BQU0sS0FBSyxHQUFHLHdCQUF3QixDQUNwQixTQUFTLElBQUksbUJBQW1CLGFBQWEsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFDdEUsMEJBQTBCLENBQUMsUUFBUSxDQUF3QyxDQUFDO0lBQzlGLEtBQUssQ0FBQyxHQUFHLEdBQUcsVUFBVSxDQUFDO0lBQ3ZCLEtBQUssQ0FBQyx5QkFBeUIsR0FBRyx5QkFBeUIsQ0FBQztJQUM1RCxPQUFPLEtBQUssQ0FBQztBQUNmLENBQUM7QUFFRCxNQUFNLFVBQVUsd0JBQXdCLENBQ3BDLE9BQTBCLEVBQUUsSUFBZ0M7SUFDOUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsNkJBQTZCLE9BQU8sSUFBSSxFQUFFLEVBQUUsQ0FBNkIsQ0FBQztJQUNsRyxLQUFLLENBQUMsMEJBQTBCLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDekMsS0FBSyxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztJQUM5QixPQUFPLEtBQUssQ0FBQztBQUNmLENBQUM7QUFFRCxNQUFNLFVBQVUscUNBQXFDLENBQ2pELEtBQ21DO0lBQ3JDLE9BQU8sMEJBQTBCLENBQUMsS0FBSyxDQUFDO1FBQ3BDLFNBQVMsQ0FBRSxLQUE2QyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BFLENBQUM7QUFFRCxNQUFNLFVBQVUsMEJBQTBCLENBQUMsS0FBYztJQUN2RCxPQUFPLENBQUMsQ0FBQyxLQUFLLElBQUssS0FBa0MsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBQ3BGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZX0gZnJvbSAnLi9ldmVudHMnO1xuaW1wb3J0IHtOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zfSBmcm9tICcuL21vZGVscyc7XG5pbXBvcnQge2lzVXJsVHJlZSwgVXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5cbmV4cG9ydCBjb25zdCBOQVZJR0FUSU9OX0NBTkNFTElOR19FUlJPUiA9ICduZ05hdmlnYXRpb25DYW5jZWxpbmdFcnJvcic7XG5cbmV4cG9ydCB0eXBlIE5hdmlnYXRpb25DYW5jZWxpbmdFcnJvciA9XG4gICAgRXJyb3Ime1tOQVZJR0FUSU9OX0NBTkNFTElOR19FUlJPUl06IHRydWUsIGNhbmNlbGxhdGlvbkNvZGU6IE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlfTtcbmV4cG9ydCB0eXBlIFJlZGlyZWN0aW5nTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yID0gTmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yJntcbiAgdXJsOiBVcmxUcmVlO1xuICBuYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zPzogTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucztcbiAgY2FuY2VsbGF0aW9uQ29kZTogTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUuUmVkaXJlY3Q7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gcmVkaXJlY3RpbmdOYXZpZ2F0aW9uRXJyb3IoXG4gICAgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgcmVkaXJlY3Q6IFVybFRyZWUpOiBSZWRpcmVjdGluZ05hdmlnYXRpb25DYW5jZWxpbmdFcnJvciB7XG4gIGNvbnN0IHtyZWRpcmVjdFRvLCBuYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zfSA9XG4gICAgICBpc1VybFRyZWUocmVkaXJlY3QpID8ge3JlZGlyZWN0VG86IHJlZGlyZWN0LCBuYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zOiB1bmRlZmluZWR9IDogcmVkaXJlY3Q7XG4gIGNvbnN0IGVycm9yID0gbmF2aWdhdGlvbkNhbmNlbGluZ0Vycm9yKFxuICAgICAgICAgICAgICAgICAgICBuZ0Rldk1vZGUgJiYgYFJlZGlyZWN0aW5nIHRvIFwiJHt1cmxTZXJpYWxpemVyLnNlcmlhbGl6ZShyZWRpcmVjdFRvKX1cImAsXG4gICAgICAgICAgICAgICAgICAgIE5hdmlnYXRpb25DYW5jZWxsYXRpb25Db2RlLlJlZGlyZWN0KSBhcyBSZWRpcmVjdGluZ05hdmlnYXRpb25DYW5jZWxpbmdFcnJvcjtcbiAgZXJyb3IudXJsID0gcmVkaXJlY3RUbztcbiAgZXJyb3IubmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucyA9IG5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnM7XG4gIHJldHVybiBlcnJvcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5hdmlnYXRpb25DYW5jZWxpbmdFcnJvcihcbiAgICBtZXNzYWdlOiBzdHJpbmd8bnVsbHxmYWxzZSwgY29kZTogTmF2aWdhdGlvbkNhbmNlbGxhdGlvbkNvZGUpIHtcbiAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoYE5hdmlnYXRpb25DYW5jZWxpbmdFcnJvcjogJHttZXNzYWdlIHx8ICcnfWApIGFzIE5hdmlnYXRpb25DYW5jZWxpbmdFcnJvcjtcbiAgZXJyb3JbTkFWSUdBVElPTl9DQU5DRUxJTkdfRVJST1JdID0gdHJ1ZTtcbiAgZXJyb3IuY2FuY2VsbGF0aW9uQ29kZSA9IGNvZGU7XG4gIHJldHVybiBlcnJvcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUmVkaXJlY3RpbmdOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoXG4gICAgZXJyb3I6IHVua25vd258XG4gICAgUmVkaXJlY3RpbmdOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IpOiBlcnJvciBpcyBSZWRpcmVjdGluZ05hdmlnYXRpb25DYW5jZWxpbmdFcnJvciB7XG4gIHJldHVybiBpc05hdmlnYXRpb25DYW5jZWxpbmdFcnJvcihlcnJvcikgJiZcbiAgICAgIGlzVXJsVHJlZSgoZXJyb3IgYXMgUmVkaXJlY3RpbmdOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IpLnVybCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc05hdmlnYXRpb25DYW5jZWxpbmdFcnJvcihlcnJvcjogdW5rbm93bik6IGVycm9yIGlzIE5hdmlnYXRpb25DYW5jZWxpbmdFcnJvciB7XG4gIHJldHVybiAhIWVycm9yICYmIChlcnJvciBhcyBOYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IpW05BVklHQVRJT05fQ0FOQ0VMSU5HX0VSUk9SXTtcbn1cbiJdfQ==