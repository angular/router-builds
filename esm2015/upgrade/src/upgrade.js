/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { APP_BOOTSTRAP_LISTENER } from '@angular/core';
import { Router } from '@angular/router';
import { UpgradeModule } from '@angular/upgrade/static';
/**
 * \@description
 *
 * Creates an initializer that in addition to setting up the Angular
 * router sets up the ngRoute integration.
 *
 * ```
 * \@NgModule({
 *  imports: [
 *   RouterModule.forRoot(SOME_ROUTES),
 *   UpgradeModule
 * ],
 * providers: [
 *   RouterUpgradeInitializer
 * ]
 * })
 * export class AppModule {
 *   ngDoBootstrap() {}
 * }
 * ```
 *
 * \@publicApi
 * @type {?}
 */
export const RouterUpgradeInitializer = {
    provide: APP_BOOTSTRAP_LISTENER,
    multi: true,
    useFactory: (/** @type {?} */ (locationSyncBootstrapListener)),
    deps: [UpgradeModule]
};
/**
 * \@internal
 * @param {?} ngUpgrade
 * @return {?}
 */
export function locationSyncBootstrapListener(ngUpgrade) {
    return () => { setUpLocationSync(ngUpgrade); };
}
/**
 * \@description
 *
 * Sets up a location synchronization.
 *
 * History.pushState does not fire onPopState, so the Angular location
 * doesn't detect it. The workaround is to attach a location change listener
 *
 * \@publicApi
 * @param {?} ngUpgrade
 * @param {?=} urlType
 * @return {?}
 */
export function setUpLocationSync(ngUpgrade, urlType = 'path') {
    if (!ngUpgrade.$injector) {
        throw new Error(`
        RouterUpgradeInitializer can be used only after UpgradeModule.bootstrap has been called.
        Remove RouterUpgradeInitializer and call setUpLocationSync after UpgradeModule.bootstrap.
      `);
    }
    /** @type {?} */
    const router = ngUpgrade.injector.get(Router);
    /** @type {?} */
    const location = ngUpgrade.injector.get(Location);
    ngUpgrade.$injector.get('$rootScope')
        .$on('$locationChangeStart', (_, next, __) => {
        /** @type {?} */
        let url;
        if (urlType === 'path') {
            url = resolveUrl(next);
        }
        else if (urlType === 'hash') {
            // Remove the first hash from the URL
            /** @type {?} */
            const hashIdx = next.indexOf('#');
            url = resolveUrl(next.substring(0, hashIdx) + next.substring(hashIdx + 1));
        }
        else {
            throw 'Invalid URLType passed to setUpLocationSync: ' + urlType;
        }
        /** @type {?} */
        const path = location.normalize(url.pathname);
        router.navigateByUrl(path + url.search + url.hash);
    });
}
/**
 * Normalize and parse a URL.
 *
 * - Normalizing means that a relative URL will be resolved into an absolute URL in the context of
 *   the application document.
 * - Parsing means that the anchor's `protocol`, `hostname`, `port`, `pathname` and related
 *   properties are all populated to reflect the normalized URL.
 *
 * While this approach has wide compatibility, it doesn't work as expected on IE. On IE, normalizing
 * happens similar to other browsers, but the parsed components will not be set. (E.g. if you assign
 * `a.href = 'foo'`, then `a.protocol`, `a.host`, etc. will not be correctly updated.)
 * We work around that by performing the parsing in a 2nd step by taking a previously normalized URL
 * and assigning it again. This correctly populates all properties.
 *
 * See
 * https://github.com/angular/angular.js/blob/2c7400e7d07b0f6cec1817dab40b9250ce8ebce6/src/ng/urlUtils.js#L26-L33
 * for more info.
 * @type {?}
 */
let anchor;
/**
 * @param {?} url
 * @return {?}
 */
function resolveUrl(url) {
    if (!anchor) {
        anchor = document.createElement('a');
    }
    anchor.setAttribute('href', url);
    anchor.setAttribute('href', anchor.href);
    return {
        // IE does not start `pathname` with `/` like other browsers.
        pathname: `/${anchor.pathname.replace(/^\//, '')}`,
        search: anchor.search,
        hash: anchor.hash
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBncmFkZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci91cGdyYWRlL3NyYy91cGdyYWRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBUUEsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxzQkFBc0IsRUFBK0IsTUFBTSxlQUFlLENBQUM7QUFDbkYsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBQyxhQUFhLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXlCdEQsTUFBTSxPQUFPLHdCQUF3QixHQUFHO0lBQ3RDLE9BQU8sRUFBRSxzQkFBc0I7SUFDL0IsS0FBSyxFQUFFLElBQUk7SUFDWCxVQUFVLEVBQUUsbUJBQUEsNkJBQTZCLEVBQTJDO0lBQ3BGLElBQUksRUFBRSxDQUFDLGFBQWEsQ0FBQztDQUN0Qjs7Ozs7O0FBS0QsTUFBTSxVQUFVLDZCQUE2QixDQUFDLFNBQXdCO0lBQ3BFLE9BQU8sR0FBRyxFQUFFLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakQsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7QUFZRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsU0FBd0IsRUFBRSxVQUEyQixNQUFNO0lBQzNGLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFO1FBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUM7OztPQUdiLENBQUMsQ0FBQztLQUNOOztVQUVLLE1BQU0sR0FBVyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7O1VBQy9DLFFBQVEsR0FBYSxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUM7SUFFM0QsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDO1NBQ2hDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQU0sRUFBRSxJQUFZLEVBQUUsRUFBVSxFQUFFLEVBQUU7O1lBQzVELEdBQUc7UUFDUCxJQUFJLE9BQU8sS0FBSyxNQUFNLEVBQUU7WUFDdEIsR0FBRyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN4QjthQUFNLElBQUksT0FBTyxLQUFLLE1BQU0sRUFBRTs7O2tCQUV2QixPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDakMsR0FBRyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzVFO2FBQU07WUFDTCxNQUFNLCtDQUErQyxHQUFHLE9BQU8sQ0FBQztTQUNqRTs7Y0FDSyxJQUFJLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JELENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFvQkcsTUFBbUM7Ozs7O0FBQ3ZDLFNBQVMsVUFBVSxDQUFDLEdBQVc7SUFDN0IsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNYLE1BQU0sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3RDO0lBRUQsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDakMsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRXpDLE9BQU87O1FBRUwsUUFBUSxFQUFFLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFO1FBQ2xELE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTTtRQUNyQixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7S0FDbEIsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0FQUF9CT09UU1RSQVBfTElTVEVORVIsIENvbXBvbmVudFJlZiwgSW5qZWN0aW9uVG9rZW59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJ0Bhbmd1bGFyL3JvdXRlcic7XG5pbXBvcnQge1VwZ3JhZGVNb2R1bGV9IGZyb20gJ0Bhbmd1bGFyL3VwZ3JhZGUvc3RhdGljJztcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBDcmVhdGVzIGFuIGluaXRpYWxpemVyIHRoYXQgaW4gYWRkaXRpb24gdG8gc2V0dGluZyB1cCB0aGUgQW5ndWxhclxuICogcm91dGVyIHNldHMgdXAgdGhlIG5nUm91dGUgaW50ZWdyYXRpb24uXG4gKlxuICogYGBgXG4gKiBATmdNb2R1bGUoe1xuICogIGltcG9ydHM6IFtcbiAqICAgUm91dGVyTW9kdWxlLmZvclJvb3QoU09NRV9ST1VURVMpLFxuICogICBVcGdyYWRlTW9kdWxlXG4gKiBdLFxuICogcHJvdmlkZXJzOiBbXG4gKiAgIFJvdXRlclVwZ3JhZGVJbml0aWFsaXplclxuICogXVxuICogfSlcbiAqIGV4cG9ydCBjbGFzcyBBcHBNb2R1bGUge1xuICogICBuZ0RvQm9vdHN0cmFwKCkge31cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNvbnN0IFJvdXRlclVwZ3JhZGVJbml0aWFsaXplciA9IHtcbiAgcHJvdmlkZTogQVBQX0JPT1RTVFJBUF9MSVNURU5FUixcbiAgbXVsdGk6IHRydWUsXG4gIHVzZUZhY3Rvcnk6IGxvY2F0aW9uU3luY0Jvb3RzdHJhcExpc3RlbmVyIGFzKG5nVXBncmFkZTogVXBncmFkZU1vZHVsZSkgPT4gKCkgPT4gdm9pZCxcbiAgZGVwczogW1VwZ3JhZGVNb2R1bGVdXG59O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9jYXRpb25TeW5jQm9vdHN0cmFwTGlzdGVuZXIobmdVcGdyYWRlOiBVcGdyYWRlTW9kdWxlKSB7XG4gIHJldHVybiAoKSA9PiB7IHNldFVwTG9jYXRpb25TeW5jKG5nVXBncmFkZSk7IH07XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogU2V0cyB1cCBhIGxvY2F0aW9uIHN5bmNocm9uaXphdGlvbi5cbiAqXG4gKiBIaXN0b3J5LnB1c2hTdGF0ZSBkb2VzIG5vdCBmaXJlIG9uUG9wU3RhdGUsIHNvIHRoZSBBbmd1bGFyIGxvY2F0aW9uXG4gKiBkb2Vzbid0IGRldGVjdCBpdC4gVGhlIHdvcmthcm91bmQgaXMgdG8gYXR0YWNoIGEgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0VXBMb2NhdGlvblN5bmMobmdVcGdyYWRlOiBVcGdyYWRlTW9kdWxlLCB1cmxUeXBlOiAncGF0aCcgfCAnaGFzaCcgPSAncGF0aCcpIHtcbiAgaWYgKCFuZ1VwZ3JhZGUuJGluamVjdG9yKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBcbiAgICAgICAgUm91dGVyVXBncmFkZUluaXRpYWxpemVyIGNhbiBiZSB1c2VkIG9ubHkgYWZ0ZXIgVXBncmFkZU1vZHVsZS5ib290c3RyYXAgaGFzIGJlZW4gY2FsbGVkLlxuICAgICAgICBSZW1vdmUgUm91dGVyVXBncmFkZUluaXRpYWxpemVyIGFuZCBjYWxsIHNldFVwTG9jYXRpb25TeW5jIGFmdGVyIFVwZ3JhZGVNb2R1bGUuYm9vdHN0cmFwLlxuICAgICAgYCk7XG4gIH1cblxuICBjb25zdCByb3V0ZXI6IFJvdXRlciA9IG5nVXBncmFkZS5pbmplY3Rvci5nZXQoUm91dGVyKTtcbiAgY29uc3QgbG9jYXRpb246IExvY2F0aW9uID0gbmdVcGdyYWRlLmluamVjdG9yLmdldChMb2NhdGlvbik7XG5cbiAgbmdVcGdyYWRlLiRpbmplY3Rvci5nZXQoJyRyb290U2NvcGUnKVxuICAgICAgLiRvbignJGxvY2F0aW9uQ2hhbmdlU3RhcnQnLCAoXzogYW55LCBuZXh0OiBzdHJpbmcsIF9fOiBzdHJpbmcpID0+IHtcbiAgICAgICAgbGV0IHVybDtcbiAgICAgICAgaWYgKHVybFR5cGUgPT09ICdwYXRoJykge1xuICAgICAgICAgIHVybCA9IHJlc29sdmVVcmwobmV4dCk7XG4gICAgICAgIH0gZWxzZSBpZiAodXJsVHlwZSA9PT0gJ2hhc2gnKSB7XG4gICAgICAgICAgLy8gUmVtb3ZlIHRoZSBmaXJzdCBoYXNoIGZyb20gdGhlIFVSTFxuICAgICAgICAgIGNvbnN0IGhhc2hJZHggPSBuZXh0LmluZGV4T2YoJyMnKTtcbiAgICAgICAgICB1cmwgPSByZXNvbHZlVXJsKG5leHQuc3Vic3RyaW5nKDAsIGhhc2hJZHgpICsgbmV4dC5zdWJzdHJpbmcoaGFzaElkeCArIDEpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyAnSW52YWxpZCBVUkxUeXBlIHBhc3NlZCB0byBzZXRVcExvY2F0aW9uU3luYzogJyArIHVybFR5cGU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGF0aCA9IGxvY2F0aW9uLm5vcm1hbGl6ZSh1cmwucGF0aG5hbWUpO1xuICAgICAgICByb3V0ZXIubmF2aWdhdGVCeVVybChwYXRoICsgdXJsLnNlYXJjaCArIHVybC5oYXNoKTtcbiAgICAgIH0pO1xufVxuXG4vKipcbiAqIE5vcm1hbGl6ZSBhbmQgcGFyc2UgYSBVUkwuXG4gKlxuICogLSBOb3JtYWxpemluZyBtZWFucyB0aGF0IGEgcmVsYXRpdmUgVVJMIHdpbGwgYmUgcmVzb2x2ZWQgaW50byBhbiBhYnNvbHV0ZSBVUkwgaW4gdGhlIGNvbnRleHQgb2ZcbiAqICAgdGhlIGFwcGxpY2F0aW9uIGRvY3VtZW50LlxuICogLSBQYXJzaW5nIG1lYW5zIHRoYXQgdGhlIGFuY2hvcidzIGBwcm90b2NvbGAsIGBob3N0bmFtZWAsIGBwb3J0YCwgYHBhdGhuYW1lYCBhbmQgcmVsYXRlZFxuICogICBwcm9wZXJ0aWVzIGFyZSBhbGwgcG9wdWxhdGVkIHRvIHJlZmxlY3QgdGhlIG5vcm1hbGl6ZWQgVVJMLlxuICpcbiAqIFdoaWxlIHRoaXMgYXBwcm9hY2ggaGFzIHdpZGUgY29tcGF0aWJpbGl0eSwgaXQgZG9lc24ndCB3b3JrIGFzIGV4cGVjdGVkIG9uIElFLiBPbiBJRSwgbm9ybWFsaXppbmdcbiAqIGhhcHBlbnMgc2ltaWxhciB0byBvdGhlciBicm93c2VycywgYnV0IHRoZSBwYXJzZWQgY29tcG9uZW50cyB3aWxsIG5vdCBiZSBzZXQuIChFLmcuIGlmIHlvdSBhc3NpZ25cbiAqIGBhLmhyZWYgPSAnZm9vJ2AsIHRoZW4gYGEucHJvdG9jb2xgLCBgYS5ob3N0YCwgZXRjLiB3aWxsIG5vdCBiZSBjb3JyZWN0bHkgdXBkYXRlZC4pXG4gKiBXZSB3b3JrIGFyb3VuZCB0aGF0IGJ5IHBlcmZvcm1pbmcgdGhlIHBhcnNpbmcgaW4gYSAybmQgc3RlcCBieSB0YWtpbmcgYSBwcmV2aW91c2x5IG5vcm1hbGl6ZWQgVVJMXG4gKiBhbmQgYXNzaWduaW5nIGl0IGFnYWluLiBUaGlzIGNvcnJlY3RseSBwb3B1bGF0ZXMgYWxsIHByb3BlcnRpZXMuXG4gKlxuICogU2VlXG4gKiBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyLmpzL2Jsb2IvMmM3NDAwZTdkMDdiMGY2Y2VjMTgxN2RhYjQwYjkyNTBjZThlYmNlNi9zcmMvbmcvdXJsVXRpbHMuanMjTDI2LUwzM1xuICogZm9yIG1vcmUgaW5mby5cbiAqL1xubGV0IGFuY2hvcjogSFRNTEFuY2hvckVsZW1lbnR8dW5kZWZpbmVkO1xuZnVuY3Rpb24gcmVzb2x2ZVVybCh1cmw6IHN0cmluZyk6IHtwYXRobmFtZTogc3RyaW5nLCBzZWFyY2g6IHN0cmluZywgaGFzaDogc3RyaW5nfSB7XG4gIGlmICghYW5jaG9yKSB7XG4gICAgYW5jaG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICB9XG5cbiAgYW5jaG9yLnNldEF0dHJpYnV0ZSgnaHJlZicsIHVybCk7XG4gIGFuY2hvci5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBhbmNob3IuaHJlZik7XG5cbiAgcmV0dXJuIHtcbiAgICAvLyBJRSBkb2VzIG5vdCBzdGFydCBgcGF0aG5hbWVgIHdpdGggYC9gIGxpa2Ugb3RoZXIgYnJvd3NlcnMuXG4gICAgcGF0aG5hbWU6IGAvJHthbmNob3IucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sICcnKX1gLFxuICAgIHNlYXJjaDogYW5jaG9yLnNlYXJjaCxcbiAgICBoYXNoOiBhbmNob3IuaGFzaFxuICB9O1xufVxuIl19