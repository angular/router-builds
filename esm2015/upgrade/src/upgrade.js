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
 * @description
 *
 * Creates an initializer that in addition to setting up the Angular
 * router sets up the ngRoute integration.
 *
 * ```
 * @NgModule({
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
 * @publicApi
 */
export const RouterUpgradeInitializer = {
    provide: APP_BOOTSTRAP_LISTENER,
    multi: true,
    useFactory: locationSyncBootstrapListener,
    deps: [UpgradeModule]
};
/**
 * @internal
 */
export function locationSyncBootstrapListener(ngUpgrade) {
    return () => { setUpLocationSync(ngUpgrade); };
}
/**
 * @description
 *
 * Sets up a location synchronization.
 *
 * History.pushState does not fire onPopState, so the Angular location
 * doesn't detect it. The workaround is to attach a location change listener
 *
 * @publicApi
 */
export function setUpLocationSync(ngUpgrade) {
    if (!ngUpgrade.$injector) {
        throw new Error(`
        RouterUpgradeInitializer can be used only after UpgradeModule.bootstrap has been called.
        Remove RouterUpgradeInitializer and call setUpLocationSync after UpgradeModule.bootstrap.
      `);
    }
    const router = ngUpgrade.injector.get(Router);
    const location = ngUpgrade.injector.get(Location);
    ngUpgrade.$injector.get('$rootScope')
        .$on('$locationChangeStart', (_, next, __) => {
        const url = resolveUrl(next);
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
 */
let anchor;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBncmFkZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci91cGdyYWRlL3NyYy91cGdyYWRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUN6QyxPQUFPLEVBQUMsc0JBQXNCLEVBQStCLE1BQU0sZUFBZSxDQUFDO0FBQ25GLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUN2QyxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFFdEQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FzQkc7QUFDSCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRztJQUN0QyxPQUFPLEVBQUUsc0JBQXNCO0lBQy9CLEtBQUssRUFBRSxJQUFJO0lBQ1gsVUFBVSxFQUFFLDZCQUF3RTtJQUNwRixJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUM7Q0FDdEIsQ0FBQztBQUVGOztHQUVHO0FBQ0gsTUFBTSxVQUFVLDZCQUE2QixDQUFDLFNBQXdCO0lBQ3BFLE9BQU8sR0FBRyxFQUFFLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakQsQ0FBQztBQUVEOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxTQUF3QjtJQUN4RCxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRTtRQUN4QixNQUFNLElBQUksS0FBSyxDQUFDOzs7T0FHYixDQUFDLENBQUM7S0FDTjtJQUVELE1BQU0sTUFBTSxHQUFXLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RELE1BQU0sUUFBUSxHQUFhLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRTVELFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQztTQUNoQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFNLEVBQUUsSUFBWSxFQUFFLEVBQVUsRUFBRSxFQUFFO1FBQ2hFLE1BQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyRCxDQUFDLENBQUMsQ0FBQztBQUNULENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FpQkc7QUFDSCxJQUFJLE1BQW1DLENBQUM7QUFDeEMsU0FBUyxVQUFVLENBQUMsR0FBVztJQUM3QixJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ1gsTUFBTSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDdEM7SUFFRCxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqQyxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFekMsT0FBTztRQUNMLDZEQUE2RDtRQUM3RCxRQUFRLEVBQUUsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUU7UUFDbEQsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO1FBQ3JCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTtLQUNsQixDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7QVBQX0JPT1RTVFJBUF9MSVNURU5FUiwgQ29tcG9uZW50UmVmLCBJbmplY3Rpb25Ub2tlbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge1JvdXRlcn0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcbmltcG9ydCB7VXBncmFkZU1vZHVsZX0gZnJvbSAnQGFuZ3VsYXIvdXBncmFkZS9zdGF0aWMnO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIENyZWF0ZXMgYW4gaW5pdGlhbGl6ZXIgdGhhdCBpbiBhZGRpdGlvbiB0byBzZXR0aW5nIHVwIHRoZSBBbmd1bGFyXG4gKiByb3V0ZXIgc2V0cyB1cCB0aGUgbmdSb3V0ZSBpbnRlZ3JhdGlvbi5cbiAqXG4gKiBgYGBcbiAqIEBOZ01vZHVsZSh7XG4gKiAgaW1wb3J0czogW1xuICogICBSb3V0ZXJNb2R1bGUuZm9yUm9vdChTT01FX1JPVVRFUyksXG4gKiAgIFVwZ3JhZGVNb2R1bGVcbiAqIF0sXG4gKiBwcm92aWRlcnM6IFtcbiAqICAgUm91dGVyVXBncmFkZUluaXRpYWxpemVyXG4gKiBdXG4gKiB9KVxuICogZXhwb3J0IGNsYXNzIEFwcE1vZHVsZSB7XG4gKiAgIG5nRG9Cb290c3RyYXAoKSB7fVxuICogfVxuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY29uc3QgUm91dGVyVXBncmFkZUluaXRpYWxpemVyID0ge1xuICBwcm92aWRlOiBBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLFxuICBtdWx0aTogdHJ1ZSxcbiAgdXNlRmFjdG9yeTogbG9jYXRpb25TeW5jQm9vdHN0cmFwTGlzdGVuZXIgYXMobmdVcGdyYWRlOiBVcGdyYWRlTW9kdWxlKSA9PiAoKSA9PiB2b2lkLFxuICBkZXBzOiBbVXBncmFkZU1vZHVsZV1cbn07XG5cbi8qKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2NhdGlvblN5bmNCb290c3RyYXBMaXN0ZW5lcihuZ1VwZ3JhZGU6IFVwZ3JhZGVNb2R1bGUpIHtcbiAgcmV0dXJuICgpID0+IHsgc2V0VXBMb2NhdGlvblN5bmMobmdVcGdyYWRlKTsgfTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBTZXRzIHVwIGEgbG9jYXRpb24gc3luY2hyb25pemF0aW9uLlxuICpcbiAqIEhpc3RvcnkucHVzaFN0YXRlIGRvZXMgbm90IGZpcmUgb25Qb3BTdGF0ZSwgc28gdGhlIEFuZ3VsYXIgbG9jYXRpb25cbiAqIGRvZXNuJ3QgZGV0ZWN0IGl0LiBUaGUgd29ya2Fyb3VuZCBpcyB0byBhdHRhY2ggYSBsb2NhdGlvbiBjaGFuZ2UgbGlzdGVuZXJcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRVcExvY2F0aW9uU3luYyhuZ1VwZ3JhZGU6IFVwZ3JhZGVNb2R1bGUpIHtcbiAgaWYgKCFuZ1VwZ3JhZGUuJGluamVjdG9yKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBcbiAgICAgICAgUm91dGVyVXBncmFkZUluaXRpYWxpemVyIGNhbiBiZSB1c2VkIG9ubHkgYWZ0ZXIgVXBncmFkZU1vZHVsZS5ib290c3RyYXAgaGFzIGJlZW4gY2FsbGVkLlxuICAgICAgICBSZW1vdmUgUm91dGVyVXBncmFkZUluaXRpYWxpemVyIGFuZCBjYWxsIHNldFVwTG9jYXRpb25TeW5jIGFmdGVyIFVwZ3JhZGVNb2R1bGUuYm9vdHN0cmFwLlxuICAgICAgYCk7XG4gIH1cblxuICBjb25zdCByb3V0ZXI6IFJvdXRlciA9IG5nVXBncmFkZS5pbmplY3Rvci5nZXQoUm91dGVyKTtcbiAgY29uc3QgbG9jYXRpb246IExvY2F0aW9uID0gbmdVcGdyYWRlLmluamVjdG9yLmdldChMb2NhdGlvbik7XG5cbiAgbmdVcGdyYWRlLiRpbmplY3Rvci5nZXQoJyRyb290U2NvcGUnKVxuICAgICAgLiRvbignJGxvY2F0aW9uQ2hhbmdlU3RhcnQnLCAoXzogYW55LCBuZXh0OiBzdHJpbmcsIF9fOiBzdHJpbmcpID0+IHtcbiAgICAgICAgY29uc3QgdXJsID0gcmVzb2x2ZVVybChuZXh0KTtcbiAgICAgICAgY29uc3QgcGF0aCA9IGxvY2F0aW9uLm5vcm1hbGl6ZSh1cmwucGF0aG5hbWUpO1xuICAgICAgICByb3V0ZXIubmF2aWdhdGVCeVVybChwYXRoICsgdXJsLnNlYXJjaCArIHVybC5oYXNoKTtcbiAgICAgIH0pO1xufVxuXG4vKipcbiAqIE5vcm1hbGl6ZSBhbmQgcGFyc2UgYSBVUkwuXG4gKlxuICogLSBOb3JtYWxpemluZyBtZWFucyB0aGF0IGEgcmVsYXRpdmUgVVJMIHdpbGwgYmUgcmVzb2x2ZWQgaW50byBhbiBhYnNvbHV0ZSBVUkwgaW4gdGhlIGNvbnRleHQgb2ZcbiAqICAgdGhlIGFwcGxpY2F0aW9uIGRvY3VtZW50LlxuICogLSBQYXJzaW5nIG1lYW5zIHRoYXQgdGhlIGFuY2hvcidzIGBwcm90b2NvbGAsIGBob3N0bmFtZWAsIGBwb3J0YCwgYHBhdGhuYW1lYCBhbmQgcmVsYXRlZFxuICogICBwcm9wZXJ0aWVzIGFyZSBhbGwgcG9wdWxhdGVkIHRvIHJlZmxlY3QgdGhlIG5vcm1hbGl6ZWQgVVJMLlxuICpcbiAqIFdoaWxlIHRoaXMgYXBwcm9hY2ggaGFzIHdpZGUgY29tcGF0aWJpbGl0eSwgaXQgZG9lc24ndCB3b3JrIGFzIGV4cGVjdGVkIG9uIElFLiBPbiBJRSwgbm9ybWFsaXppbmdcbiAqIGhhcHBlbnMgc2ltaWxhciB0byBvdGhlciBicm93c2VycywgYnV0IHRoZSBwYXJzZWQgY29tcG9uZW50cyB3aWxsIG5vdCBiZSBzZXQuIChFLmcuIGlmIHlvdSBhc3NpZ25cbiAqIGBhLmhyZWYgPSAnZm9vJ2AsIHRoZW4gYGEucHJvdG9jb2xgLCBgYS5ob3N0YCwgZXRjLiB3aWxsIG5vdCBiZSBjb3JyZWN0bHkgdXBkYXRlZC4pXG4gKiBXZSB3b3JrIGFyb3VuZCB0aGF0IGJ5IHBlcmZvcm1pbmcgdGhlIHBhcnNpbmcgaW4gYSAybmQgc3RlcCBieSB0YWtpbmcgYSBwcmV2aW91c2x5IG5vcm1hbGl6ZWQgVVJMXG4gKiBhbmQgYXNzaWduaW5nIGl0IGFnYWluLiBUaGlzIGNvcnJlY3RseSBwb3B1bGF0ZXMgYWxsIHByb3BlcnRpZXMuXG4gKlxuICogU2VlXG4gKiBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyLmpzL2Jsb2IvMmM3NDAwZTdkMDdiMGY2Y2VjMTgxN2RhYjQwYjkyNTBjZThlYmNlNi9zcmMvbmcvdXJsVXRpbHMuanMjTDI2LUwzM1xuICogZm9yIG1vcmUgaW5mby5cbiAqL1xubGV0IGFuY2hvcjogSFRNTEFuY2hvckVsZW1lbnR8dW5kZWZpbmVkO1xuZnVuY3Rpb24gcmVzb2x2ZVVybCh1cmw6IHN0cmluZyk6IHtwYXRobmFtZTogc3RyaW5nLCBzZWFyY2g6IHN0cmluZywgaGFzaDogc3RyaW5nfSB7XG4gIGlmICghYW5jaG9yKSB7XG4gICAgYW5jaG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICB9XG5cbiAgYW5jaG9yLnNldEF0dHJpYnV0ZSgnaHJlZicsIHVybCk7XG4gIGFuY2hvci5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBhbmNob3IuaHJlZik7XG5cbiAgcmV0dXJuIHtcbiAgICAvLyBJRSBkb2VzIG5vdCBzdGFydCBgcGF0aG5hbWVgIHdpdGggYC9gIGxpa2Ugb3RoZXIgYnJvd3NlcnMuXG4gICAgcGF0aG5hbWU6IGAvJHthbmNob3IucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sICcnKX1gLFxuICAgIHNlYXJjaDogYW5jaG9yLnNlYXJjaCxcbiAgICBoYXNoOiBhbmNob3IuaGFzaFxuICB9O1xufVxuIl19