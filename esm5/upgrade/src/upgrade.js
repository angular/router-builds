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
var ɵ0 = locationSyncBootstrapListener;
/**
 * Creates an initializer that sets up `ngRoute` integration
 * along with setting up the Angular router.
 *
 * @usageNotes
 *
 * <code-example language="typescript" linenums="false">
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
 * </code-example>
 *
 * @publicApi
 */
export var RouterUpgradeInitializer = {
    provide: APP_BOOTSTRAP_LISTENER,
    multi: true,
    useFactory: ɵ0,
    deps: [UpgradeModule]
};
/**
 * @internal
 */
export function locationSyncBootstrapListener(ngUpgrade) {
    return function () { setUpLocationSync(ngUpgrade); };
}
/**
 * Sets up a location change listener to trigger `history.pushState`.
 * Works around the problem that `onPopState` does not trigger `history.pushState`.
 * Must be called *after* calling `UpgradeModule.bootstrap`.
 *
 * @param ngUpgrade The upgrade NgModule.
 * @param urlType The location strategy.
 * @see `HashLocationStrategy`
 * @see `PathLocationStrategy`
 *
 * @publicApi
 */
export function setUpLocationSync(ngUpgrade, urlType) {
    if (urlType === void 0) { urlType = 'path'; }
    if (!ngUpgrade.$injector) {
        throw new Error("\n        RouterUpgradeInitializer can be used only after UpgradeModule.bootstrap has been called.\n        Remove RouterUpgradeInitializer and call setUpLocationSync after UpgradeModule.bootstrap.\n      ");
    }
    var router = ngUpgrade.injector.get(Router);
    var location = ngUpgrade.injector.get(Location);
    ngUpgrade.$injector.get('$rootScope')
        .$on('$locationChangeStart', function (_, next, __) {
        var url;
        if (urlType === 'path') {
            url = resolveUrl(next);
        }
        else if (urlType === 'hash') {
            // Remove the first hash from the URL
            var hashIdx = next.indexOf('#');
            url = resolveUrl(next.substring(0, hashIdx) + next.substring(hashIdx + 1));
        }
        else {
            throw 'Invalid URLType passed to setUpLocationSync: ' + urlType;
        }
        var path = location.normalize(url.pathname);
        router.navigateByUrl(path + url.search + url.hash);
    });
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
 */
var anchor;
function resolveUrl(url) {
    if (!anchor) {
        anchor = document.createElement('a');
    }
    anchor.setAttribute('href', url);
    anchor.setAttribute('href', anchor.href);
    return {
        // IE does not start `pathname` with `/` like other browsers.
        pathname: "/" + anchor.pathname.replace(/^\//, ''),
        search: anchor.search,
        hash: anchor.hash
    };
}
export { ɵ0 };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBncmFkZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci91cGdyYWRlL3NyYy91cGdyYWRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUN6QyxPQUFPLEVBQUMsc0JBQXNCLEVBQStCLE1BQU0sZUFBZSxDQUFDO0FBQ25GLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUN2QyxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0seUJBQXlCLENBQUM7U0E0QnhDLDZCQUF3RTtBQTFCdEY7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FzQkc7QUFDSCxNQUFNLENBQUMsSUFBTSx3QkFBd0IsR0FBRztJQUN0QyxPQUFPLEVBQUUsc0JBQXNCO0lBQy9CLEtBQUssRUFBRSxJQUFJO0lBQ1gsVUFBVSxJQUEwRTtJQUNwRixJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUM7Q0FDdEIsQ0FBQztBQUVGOztHQUVHO0FBQ0gsTUFBTSxVQUFVLDZCQUE2QixDQUFDLFNBQXdCO0lBQ3BFLE9BQU8sY0FBUSxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRCxDQUFDO0FBRUQ7Ozs7Ozs7Ozs7O0dBV0c7QUFDSCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsU0FBd0IsRUFBRSxPQUFpQztJQUFqQyx3QkFBQSxFQUFBLGdCQUFpQztJQUMzRixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRTtRQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLCtNQUdiLENBQUMsQ0FBQztLQUNOO0lBRUQsSUFBTSxNQUFNLEdBQVcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEQsSUFBTSxRQUFRLEdBQWEsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFNUQsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDO1NBQ2hDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxVQUFDLENBQU0sRUFBRSxJQUFZLEVBQUUsRUFBVTtRQUM1RCxJQUFJLEdBQUcsQ0FBQztRQUNSLElBQUksT0FBTyxLQUFLLE1BQU0sRUFBRTtZQUN0QixHQUFHLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3hCO2FBQU0sSUFBSSxPQUFPLEtBQUssTUFBTSxFQUFFO1lBQzdCLHFDQUFxQztZQUNyQyxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2xDLEdBQUcsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM1RTthQUFNO1lBQ0wsTUFBTSwrQ0FBK0MsR0FBRyxPQUFPLENBQUM7U0FDakU7UUFDRCxJQUFNLElBQUksR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyRCxDQUFDLENBQUMsQ0FBQztBQUNULENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FpQkc7QUFDSCxJQUFJLE1BQW1DLENBQUM7QUFDeEMsU0FBUyxVQUFVLENBQUMsR0FBVztJQUM3QixJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ1gsTUFBTSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDdEM7SUFFRCxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqQyxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFekMsT0FBTztRQUNMLDZEQUE2RDtRQUM3RCxRQUFRLEVBQUUsTUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFHO1FBQ2xELE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTTtRQUNyQixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7S0FDbEIsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TG9jYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge0FQUF9CT09UU1RSQVBfTElTVEVORVIsIENvbXBvbmVudFJlZiwgSW5qZWN0aW9uVG9rZW59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtSb3V0ZXJ9IGZyb20gJ0Bhbmd1bGFyL3JvdXRlcic7XG5pbXBvcnQge1VwZ3JhZGVNb2R1bGV9IGZyb20gJ0Bhbmd1bGFyL3VwZ3JhZGUvc3RhdGljJztcblxuLyoqXG4gKiBDcmVhdGVzIGFuIGluaXRpYWxpemVyIHRoYXQgc2V0cyB1cCBgbmdSb3V0ZWAgaW50ZWdyYXRpb25cbiAqIGFsb25nIHdpdGggc2V0dGluZyB1cCB0aGUgQW5ndWxhciByb3V0ZXIuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiA8Y29kZS1leGFtcGxlIGxhbmd1YWdlPVwidHlwZXNjcmlwdFwiIGxpbmVudW1zPVwiZmFsc2VcIj5cbiAqIEBOZ01vZHVsZSh7XG4gKiAgaW1wb3J0czogW1xuICogICBSb3V0ZXJNb2R1bGUuZm9yUm9vdChTT01FX1JPVVRFUyksXG4gKiAgIFVwZ3JhZGVNb2R1bGVcbiAqIF0sXG4gKiBwcm92aWRlcnM6IFtcbiAqICAgUm91dGVyVXBncmFkZUluaXRpYWxpemVyXG4gKiBdXG4gKiB9KVxuICogZXhwb3J0IGNsYXNzIEFwcE1vZHVsZSB7XG4gKiAgIG5nRG9Cb290c3RyYXAoKSB7fVxuICogfVxuICogPC9jb2RlLWV4YW1wbGU+XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY29uc3QgUm91dGVyVXBncmFkZUluaXRpYWxpemVyID0ge1xuICBwcm92aWRlOiBBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLFxuICBtdWx0aTogdHJ1ZSxcbiAgdXNlRmFjdG9yeTogbG9jYXRpb25TeW5jQm9vdHN0cmFwTGlzdGVuZXIgYXMobmdVcGdyYWRlOiBVcGdyYWRlTW9kdWxlKSA9PiAoKSA9PiB2b2lkLFxuICBkZXBzOiBbVXBncmFkZU1vZHVsZV1cbn07XG5cbi8qKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2NhdGlvblN5bmNCb290c3RyYXBMaXN0ZW5lcihuZ1VwZ3JhZGU6IFVwZ3JhZGVNb2R1bGUpIHtcbiAgcmV0dXJuICgpID0+IHsgc2V0VXBMb2NhdGlvblN5bmMobmdVcGdyYWRlKTsgfTtcbn1cblxuLyoqXG4gKiBTZXRzIHVwIGEgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyIHRvIHRyaWdnZXIgYGhpc3RvcnkucHVzaFN0YXRlYC5cbiAqIFdvcmtzIGFyb3VuZCB0aGUgcHJvYmxlbSB0aGF0IGBvblBvcFN0YXRlYCBkb2VzIG5vdCB0cmlnZ2VyIGBoaXN0b3J5LnB1c2hTdGF0ZWAuXG4gKiBNdXN0IGJlIGNhbGxlZCAqYWZ0ZXIqIGNhbGxpbmcgYFVwZ3JhZGVNb2R1bGUuYm9vdHN0cmFwYC5cbiAqXG4gKiBAcGFyYW0gbmdVcGdyYWRlIFRoZSB1cGdyYWRlIE5nTW9kdWxlLlxuICogQHBhcmFtIHVybFR5cGUgVGhlIGxvY2F0aW9uIHN0cmF0ZWd5LlxuICogQHNlZSBgSGFzaExvY2F0aW9uU3RyYXRlZ3lgXG4gKiBAc2VlIGBQYXRoTG9jYXRpb25TdHJhdGVneWBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRVcExvY2F0aW9uU3luYyhuZ1VwZ3JhZGU6IFVwZ3JhZGVNb2R1bGUsIHVybFR5cGU6ICdwYXRoJyB8ICdoYXNoJyA9ICdwYXRoJykge1xuICBpZiAoIW5nVXBncmFkZS4kaW5qZWN0b3IpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFxuICAgICAgICBSb3V0ZXJVcGdyYWRlSW5pdGlhbGl6ZXIgY2FuIGJlIHVzZWQgb25seSBhZnRlciBVcGdyYWRlTW9kdWxlLmJvb3RzdHJhcCBoYXMgYmVlbiBjYWxsZWQuXG4gICAgICAgIFJlbW92ZSBSb3V0ZXJVcGdyYWRlSW5pdGlhbGl6ZXIgYW5kIGNhbGwgc2V0VXBMb2NhdGlvblN5bmMgYWZ0ZXIgVXBncmFkZU1vZHVsZS5ib290c3RyYXAuXG4gICAgICBgKTtcbiAgfVxuXG4gIGNvbnN0IHJvdXRlcjogUm91dGVyID0gbmdVcGdyYWRlLmluamVjdG9yLmdldChSb3V0ZXIpO1xuICBjb25zdCBsb2NhdGlvbjogTG9jYXRpb24gPSBuZ1VwZ3JhZGUuaW5qZWN0b3IuZ2V0KExvY2F0aW9uKTtcblxuICBuZ1VwZ3JhZGUuJGluamVjdG9yLmdldCgnJHJvb3RTY29wZScpXG4gICAgICAuJG9uKCckbG9jYXRpb25DaGFuZ2VTdGFydCcsIChfOiBhbnksIG5leHQ6IHN0cmluZywgX186IHN0cmluZykgPT4ge1xuICAgICAgICBsZXQgdXJsO1xuICAgICAgICBpZiAodXJsVHlwZSA9PT0gJ3BhdGgnKSB7XG4gICAgICAgICAgdXJsID0gcmVzb2x2ZVVybChuZXh0KTtcbiAgICAgICAgfSBlbHNlIGlmICh1cmxUeXBlID09PSAnaGFzaCcpIHtcbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIGZpcnN0IGhhc2ggZnJvbSB0aGUgVVJMXG4gICAgICAgICAgY29uc3QgaGFzaElkeCA9IG5leHQuaW5kZXhPZignIycpO1xuICAgICAgICAgIHVybCA9IHJlc29sdmVVcmwobmV4dC5zdWJzdHJpbmcoMCwgaGFzaElkeCkgKyBuZXh0LnN1YnN0cmluZyhoYXNoSWR4ICsgMSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93ICdJbnZhbGlkIFVSTFR5cGUgcGFzc2VkIHRvIHNldFVwTG9jYXRpb25TeW5jOiAnICsgdXJsVHlwZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwYXRoID0gbG9jYXRpb24ubm9ybWFsaXplKHVybC5wYXRobmFtZSk7XG4gICAgICAgIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKHBhdGggKyB1cmwuc2VhcmNoICsgdXJsLmhhc2gpO1xuICAgICAgfSk7XG59XG5cbi8qKlxuICogTm9ybWFsaXplcyBhbmQgcGFyc2VzIGEgVVJMLlxuICpcbiAqIC0gTm9ybWFsaXppbmcgbWVhbnMgdGhhdCBhIHJlbGF0aXZlIFVSTCB3aWxsIGJlIHJlc29sdmVkIGludG8gYW4gYWJzb2x1dGUgVVJMIGluIHRoZSBjb250ZXh0IG9mXG4gKiAgIHRoZSBhcHBsaWNhdGlvbiBkb2N1bWVudC5cbiAqIC0gUGFyc2luZyBtZWFucyB0aGF0IHRoZSBhbmNob3IncyBgcHJvdG9jb2xgLCBgaG9zdG5hbWVgLCBgcG9ydGAsIGBwYXRobmFtZWAgYW5kIHJlbGF0ZWRcbiAqICAgcHJvcGVydGllcyBhcmUgYWxsIHBvcHVsYXRlZCB0byByZWZsZWN0IHRoZSBub3JtYWxpemVkIFVSTC5cbiAqXG4gKiBXaGlsZSB0aGlzIGFwcHJvYWNoIGhhcyB3aWRlIGNvbXBhdGliaWxpdHksIGl0IGRvZXNuJ3Qgd29yayBhcyBleHBlY3RlZCBvbiBJRS4gT24gSUUsIG5vcm1hbGl6aW5nXG4gKiBoYXBwZW5zIHNpbWlsYXIgdG8gb3RoZXIgYnJvd3NlcnMsIGJ1dCB0aGUgcGFyc2VkIGNvbXBvbmVudHMgd2lsbCBub3QgYmUgc2V0LiAoRS5nLiBpZiB5b3UgYXNzaWduXG4gKiBgYS5ocmVmID0gJ2ZvbydgLCB0aGVuIGBhLnByb3RvY29sYCwgYGEuaG9zdGAsIGV0Yy4gd2lsbCBub3QgYmUgY29ycmVjdGx5IHVwZGF0ZWQuKVxuICogV2Ugd29yayBhcm91bmQgdGhhdCBieSBwZXJmb3JtaW5nIHRoZSBwYXJzaW5nIGluIGEgMm5kIHN0ZXAgYnkgdGFraW5nIGEgcHJldmlvdXNseSBub3JtYWxpemVkIFVSTFxuICogYW5kIGFzc2lnbmluZyBpdCBhZ2Fpbi4gVGhpcyBjb3JyZWN0bHkgcG9wdWxhdGVzIGFsbCBwcm9wZXJ0aWVzLlxuICpcbiAqIFNlZVxuICogaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci5qcy9ibG9iLzJjNzQwMGU3ZDA3YjBmNmNlYzE4MTdkYWI0MGI5MjUwY2U4ZWJjZTYvc3JjL25nL3VybFV0aWxzLmpzI0wyNi1MMzNcbiAqIGZvciBtb3JlIGluZm8uXG4gKi9cbmxldCBhbmNob3I6IEhUTUxBbmNob3JFbGVtZW50fHVuZGVmaW5lZDtcbmZ1bmN0aW9uIHJlc29sdmVVcmwodXJsOiBzdHJpbmcpOiB7cGF0aG5hbWU6IHN0cmluZywgc2VhcmNoOiBzdHJpbmcsIGhhc2g6IHN0cmluZ30ge1xuICBpZiAoIWFuY2hvcikge1xuICAgIGFuY2hvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgfVxuXG4gIGFuY2hvci5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCB1cmwpO1xuICBhbmNob3Iuc2V0QXR0cmlidXRlKCdocmVmJywgYW5jaG9yLmhyZWYpO1xuXG4gIHJldHVybiB7XG4gICAgLy8gSUUgZG9lcyBub3Qgc3RhcnQgYHBhdGhuYW1lYCB3aXRoIGAvYCBsaWtlIG90aGVyIGJyb3dzZXJzLlxuICAgIHBhdGhuYW1lOiBgLyR7YW5jaG9yLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCAnJyl9YCxcbiAgICBzZWFyY2g6IGFuY2hvci5zZWFyY2gsXG4gICAgaGFzaDogYW5jaG9yLmhhc2hcbiAgfTtcbn1cbiJdfQ==