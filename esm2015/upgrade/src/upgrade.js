/**
 * @fileoverview added by tsickle
 * Generated from: packages/router/upgrade/src/upgrade.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
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
const ɵ0 = (locationSyncBootstrapListener);
/**
 * Creates an initializer that sets up `ngRoute` integration
 * along with setting up the Angular router.
 *
 * \@usageNotes
 *
 * <code-example language="typescript">
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
 * </code-example>
 *
 * \@publicApi
 * @type {?}
 */
export const RouterUpgradeInitializer = {
    provide: APP_BOOTSTRAP_LISTENER,
    multi: true,
    useFactory: (/** @type {?} */ (ɵ0)),
    deps: [UpgradeModule]
};
/**
 * \@internal
 * @param {?} ngUpgrade
 * @return {?}
 */
export function locationSyncBootstrapListener(ngUpgrade) {
    return (/**
     * @return {?}
     */
    () => { setUpLocationSync(ngUpgrade); });
}
/**
 * Sets up a location change listener to trigger `history.pushState`.
 * Works around the problem that `onPopState` does not trigger `history.pushState`.
 * Must be called *after* calling `UpgradeModule.bootstrap`.
 *
 * @see `HashLocationStrategy` / `PathLocationStrategy`
 *
 * \@publicApi
 * @param {?} ngUpgrade The upgrade NgModule.
 * @param {?=} urlType The location strategy.
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
        .$on('$locationChangeStart', (/**
     * @param {?} _
     * @param {?} next
     * @param {?} __
     * @return {?}
     */
    (_, next, __) => {
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
    }));
}
/**
 * Normalizes and parses a URL.
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
export { ɵ0 };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBncmFkZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci91cGdyYWRlL3NyYy91cGdyYWRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQVFBLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUN6QyxPQUFPLEVBQUMsc0JBQXNCLEVBQStCLE1BQU0sZUFBZSxDQUFDO0FBQ25GLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUN2QyxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0seUJBQXlCLENBQUM7V0E0QnhDLENBQUEsNkJBQTZCLENBQTJDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBSHRGLE1BQU0sT0FBTyx3QkFBd0IsR0FBRztJQUN0QyxPQUFPLEVBQUUsc0JBQXNCO0lBQy9CLEtBQUssRUFBRSxJQUFJO0lBQ1gsVUFBVSxFQUFFLHVCQUF3RTtJQUNwRixJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUM7Q0FDdEI7Ozs7OztBQUtELE1BQU0sVUFBVSw2QkFBNkIsQ0FBQyxTQUF3QjtJQUNwRTs7O0lBQU8sR0FBRyxFQUFFLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFDakQsQ0FBQzs7Ozs7Ozs7Ozs7OztBQWNELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxTQUF3QixFQUFFLFVBQTJCLE1BQU07SUFDM0YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUU7UUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQzs7O09BR2IsQ0FBQyxDQUFDO0tBQ047O1VBRUssTUFBTSxHQUFXLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQzs7VUFDL0MsUUFBUSxHQUFhLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQztJQUUzRCxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUM7U0FDaEMsR0FBRyxDQUFDLHNCQUFzQjs7Ozs7O0lBQUUsQ0FBQyxDQUFNLEVBQUUsSUFBWSxFQUFFLEVBQVUsRUFBRSxFQUFFOztZQUM1RCxHQUFHO1FBQ1AsSUFBSSxPQUFPLEtBQUssTUFBTSxFQUFFO1lBQ3RCLEdBQUcsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDeEI7YUFBTSxJQUFJLE9BQU8sS0FBSyxNQUFNLEVBQUU7OztrQkFFdkIsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ2pDLEdBQUcsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM1RTthQUFNO1lBQ0wsTUFBTSwrQ0FBK0MsR0FBRyxPQUFPLENBQUM7U0FDakU7O2NBQ0ssSUFBSSxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQztRQUM3QyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyRCxDQUFDLEVBQUMsQ0FBQztBQUNULENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBb0JHLE1BQW1DOzs7OztBQUN2QyxTQUFTLFVBQVUsQ0FBQyxHQUFXO0lBQzdCLElBQUksQ0FBQyxNQUFNLEVBQUU7UUFDWCxNQUFNLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUN0QztJQUVELE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2pDLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUV6QyxPQUFPOztRQUVMLFFBQVEsRUFBRSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRTtRQUNsRCxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07UUFDckIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJO0tBQ2xCLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLCBDb21wb25lbnRSZWYsIEluamVjdGlvblRva2VufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Um91dGVyfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xuaW1wb3J0IHtVcGdyYWRlTW9kdWxlfSBmcm9tICdAYW5ndWxhci91cGdyYWRlL3N0YXRpYyc7XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBpbml0aWFsaXplciB0aGF0IHNldHMgdXAgYG5nUm91dGVgIGludGVncmF0aW9uXG4gKiBhbG9uZyB3aXRoIHNldHRpbmcgdXAgdGhlIEFuZ3VsYXIgcm91dGVyLlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogPGNvZGUtZXhhbXBsZSBsYW5ndWFnZT1cInR5cGVzY3JpcHRcIj5cbiAqIEBOZ01vZHVsZSh7XG4gKiAgaW1wb3J0czogW1xuICogICBSb3V0ZXJNb2R1bGUuZm9yUm9vdChTT01FX1JPVVRFUyksXG4gKiAgIFVwZ3JhZGVNb2R1bGVcbiAqIF0sXG4gKiBwcm92aWRlcnM6IFtcbiAqICAgUm91dGVyVXBncmFkZUluaXRpYWxpemVyXG4gKiBdXG4gKiB9KVxuICogZXhwb3J0IGNsYXNzIEFwcE1vZHVsZSB7XG4gKiAgIG5nRG9Cb290c3RyYXAoKSB7fVxuICogfVxuICogPC9jb2RlLWV4YW1wbGU+XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY29uc3QgUm91dGVyVXBncmFkZUluaXRpYWxpemVyID0ge1xuICBwcm92aWRlOiBBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLFxuICBtdWx0aTogdHJ1ZSxcbiAgdXNlRmFjdG9yeTogbG9jYXRpb25TeW5jQm9vdHN0cmFwTGlzdGVuZXIgYXMobmdVcGdyYWRlOiBVcGdyYWRlTW9kdWxlKSA9PiAoKSA9PiB2b2lkLFxuICBkZXBzOiBbVXBncmFkZU1vZHVsZV1cbn07XG5cbi8qKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2NhdGlvblN5bmNCb290c3RyYXBMaXN0ZW5lcihuZ1VwZ3JhZGU6IFVwZ3JhZGVNb2R1bGUpIHtcbiAgcmV0dXJuICgpID0+IHsgc2V0VXBMb2NhdGlvblN5bmMobmdVcGdyYWRlKTsgfTtcbn1cblxuLyoqXG4gKiBTZXRzIHVwIGEgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyIHRvIHRyaWdnZXIgYGhpc3RvcnkucHVzaFN0YXRlYC5cbiAqIFdvcmtzIGFyb3VuZCB0aGUgcHJvYmxlbSB0aGF0IGBvblBvcFN0YXRlYCBkb2VzIG5vdCB0cmlnZ2VyIGBoaXN0b3J5LnB1c2hTdGF0ZWAuXG4gKiBNdXN0IGJlIGNhbGxlZCAqYWZ0ZXIqIGNhbGxpbmcgYFVwZ3JhZGVNb2R1bGUuYm9vdHN0cmFwYC5cbiAqXG4gKiBAcGFyYW0gbmdVcGdyYWRlIFRoZSB1cGdyYWRlIE5nTW9kdWxlLlxuICogQHBhcmFtIHVybFR5cGUgVGhlIGxvY2F0aW9uIHN0cmF0ZWd5LlxuICogQHNlZSBgSGFzaExvY2F0aW9uU3RyYXRlZ3lgXG4gKiBAc2VlIGBQYXRoTG9jYXRpb25TdHJhdGVneWBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRVcExvY2F0aW9uU3luYyhuZ1VwZ3JhZGU6IFVwZ3JhZGVNb2R1bGUsIHVybFR5cGU6ICdwYXRoJyB8ICdoYXNoJyA9ICdwYXRoJykge1xuICBpZiAoIW5nVXBncmFkZS4kaW5qZWN0b3IpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFxuICAgICAgICBSb3V0ZXJVcGdyYWRlSW5pdGlhbGl6ZXIgY2FuIGJlIHVzZWQgb25seSBhZnRlciBVcGdyYWRlTW9kdWxlLmJvb3RzdHJhcCBoYXMgYmVlbiBjYWxsZWQuXG4gICAgICAgIFJlbW92ZSBSb3V0ZXJVcGdyYWRlSW5pdGlhbGl6ZXIgYW5kIGNhbGwgc2V0VXBMb2NhdGlvblN5bmMgYWZ0ZXIgVXBncmFkZU1vZHVsZS5ib290c3RyYXAuXG4gICAgICBgKTtcbiAgfVxuXG4gIGNvbnN0IHJvdXRlcjogUm91dGVyID0gbmdVcGdyYWRlLmluamVjdG9yLmdldChSb3V0ZXIpO1xuICBjb25zdCBsb2NhdGlvbjogTG9jYXRpb24gPSBuZ1VwZ3JhZGUuaW5qZWN0b3IuZ2V0KExvY2F0aW9uKTtcblxuICBuZ1VwZ3JhZGUuJGluamVjdG9yLmdldCgnJHJvb3RTY29wZScpXG4gICAgICAuJG9uKCckbG9jYXRpb25DaGFuZ2VTdGFydCcsIChfOiBhbnksIG5leHQ6IHN0cmluZywgX186IHN0cmluZykgPT4ge1xuICAgICAgICBsZXQgdXJsO1xuICAgICAgICBpZiAodXJsVHlwZSA9PT0gJ3BhdGgnKSB7XG4gICAgICAgICAgdXJsID0gcmVzb2x2ZVVybChuZXh0KTtcbiAgICAgICAgfSBlbHNlIGlmICh1cmxUeXBlID09PSAnaGFzaCcpIHtcbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIGZpcnN0IGhhc2ggZnJvbSB0aGUgVVJMXG4gICAgICAgICAgY29uc3QgaGFzaElkeCA9IG5leHQuaW5kZXhPZignIycpO1xuICAgICAgICAgIHVybCA9IHJlc29sdmVVcmwobmV4dC5zdWJzdHJpbmcoMCwgaGFzaElkeCkgKyBuZXh0LnN1YnN0cmluZyhoYXNoSWR4ICsgMSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93ICdJbnZhbGlkIFVSTFR5cGUgcGFzc2VkIHRvIHNldFVwTG9jYXRpb25TeW5jOiAnICsgdXJsVHlwZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwYXRoID0gbG9jYXRpb24ubm9ybWFsaXplKHVybC5wYXRobmFtZSk7XG4gICAgICAgIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKHBhdGggKyB1cmwuc2VhcmNoICsgdXJsLmhhc2gpO1xuICAgICAgfSk7XG59XG5cbi8qKlxuICogTm9ybWFsaXplcyBhbmQgcGFyc2VzIGEgVVJMLlxuICpcbiAqIC0gTm9ybWFsaXppbmcgbWVhbnMgdGhhdCBhIHJlbGF0aXZlIFVSTCB3aWxsIGJlIHJlc29sdmVkIGludG8gYW4gYWJzb2x1dGUgVVJMIGluIHRoZSBjb250ZXh0IG9mXG4gKiAgIHRoZSBhcHBsaWNhdGlvbiBkb2N1bWVudC5cbiAqIC0gUGFyc2luZyBtZWFucyB0aGF0IHRoZSBhbmNob3IncyBgcHJvdG9jb2xgLCBgaG9zdG5hbWVgLCBgcG9ydGAsIGBwYXRobmFtZWAgYW5kIHJlbGF0ZWRcbiAqICAgcHJvcGVydGllcyBhcmUgYWxsIHBvcHVsYXRlZCB0byByZWZsZWN0IHRoZSBub3JtYWxpemVkIFVSTC5cbiAqXG4gKiBXaGlsZSB0aGlzIGFwcHJvYWNoIGhhcyB3aWRlIGNvbXBhdGliaWxpdHksIGl0IGRvZXNuJ3Qgd29yayBhcyBleHBlY3RlZCBvbiBJRS4gT24gSUUsIG5vcm1hbGl6aW5nXG4gKiBoYXBwZW5zIHNpbWlsYXIgdG8gb3RoZXIgYnJvd3NlcnMsIGJ1dCB0aGUgcGFyc2VkIGNvbXBvbmVudHMgd2lsbCBub3QgYmUgc2V0LiAoRS5nLiBpZiB5b3UgYXNzaWduXG4gKiBgYS5ocmVmID0gJ2ZvbydgLCB0aGVuIGBhLnByb3RvY29sYCwgYGEuaG9zdGAsIGV0Yy4gd2lsbCBub3QgYmUgY29ycmVjdGx5IHVwZGF0ZWQuKVxuICogV2Ugd29yayBhcm91bmQgdGhhdCBieSBwZXJmb3JtaW5nIHRoZSBwYXJzaW5nIGluIGEgMm5kIHN0ZXAgYnkgdGFraW5nIGEgcHJldmlvdXNseSBub3JtYWxpemVkIFVSTFxuICogYW5kIGFzc2lnbmluZyBpdCBhZ2Fpbi4gVGhpcyBjb3JyZWN0bHkgcG9wdWxhdGVzIGFsbCBwcm9wZXJ0aWVzLlxuICpcbiAqIFNlZVxuICogaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci5qcy9ibG9iLzJjNzQwMGU3ZDA3YjBmNmNlYzE4MTdkYWI0MGI5MjUwY2U4ZWJjZTYvc3JjL25nL3VybFV0aWxzLmpzI0wyNi1MMzNcbiAqIGZvciBtb3JlIGluZm8uXG4gKi9cbmxldCBhbmNob3I6IEhUTUxBbmNob3JFbGVtZW50fHVuZGVmaW5lZDtcbmZ1bmN0aW9uIHJlc29sdmVVcmwodXJsOiBzdHJpbmcpOiB7cGF0aG5hbWU6IHN0cmluZywgc2VhcmNoOiBzdHJpbmcsIGhhc2g6IHN0cmluZ30ge1xuICBpZiAoIWFuY2hvcikge1xuICAgIGFuY2hvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgfVxuXG4gIGFuY2hvci5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCB1cmwpO1xuICBhbmNob3Iuc2V0QXR0cmlidXRlKCdocmVmJywgYW5jaG9yLmhyZWYpO1xuXG4gIHJldHVybiB7XG4gICAgLy8gSUUgZG9lcyBub3Qgc3RhcnQgYHBhdGhuYW1lYCB3aXRoIGAvYCBsaWtlIG90aGVyIGJyb3dzZXJzLlxuICAgIHBhdGhuYW1lOiBgLyR7YW5jaG9yLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCAnJyl9YCxcbiAgICBzZWFyY2g6IGFuY2hvci5zZWFyY2gsXG4gICAgaGFzaDogYW5jaG9yLmhhc2hcbiAgfTtcbn1cbiJdfQ==