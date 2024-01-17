/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Location } from '@angular/common';
import { APP_BOOTSTRAP_LISTENER } from '@angular/core';
import { Router } from '@angular/router';
import { UpgradeModule } from '@angular/upgrade/static';
/**
 * Creates an initializer that sets up `ngRoute` integration
 * along with setting up the Angular router.
 *
 * @usageNotes
 *
 * <code-example language="typescript">
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
    return () => {
        setUpLocationSync(ngUpgrade);
    };
}
/**
 * Sets up a location change listener to trigger `history.pushState`.
 * Works around the problem that `onPopState` does not trigger `history.pushState`.
 * Must be called *after* calling `UpgradeModule.bootstrap`.
 *
 * @param ngUpgrade The upgrade NgModule.
 * @param urlType The location strategy.
 * @see {@link HashLocationStrategy}
 * @see {@link PathLocationStrategy}
 *
 * @publicApi
 */
export function setUpLocationSync(ngUpgrade, urlType = 'path') {
    if (!ngUpgrade.$injector) {
        throw new Error(`
        RouterUpgradeInitializer can be used only after UpgradeModule.bootstrap has been called.
        Remove RouterUpgradeInitializer and call setUpLocationSync after UpgradeModule.bootstrap.
      `);
    }
    const router = ngUpgrade.injector.get(Router);
    const location = ngUpgrade.injector.get(Location);
    ngUpgrade.$injector.get('$rootScope')
        .$on('$locationChangeStart', (event, newUrl, oldUrl, newState, oldState) => {
        // Navigations coming from Angular router have a navigationId state
        // property. Don't trigger Angular router navigation again if it is
        // caused by a URL change from the current Angular router
        // navigation.
        const currentNavigationId = router.getCurrentNavigation()?.id;
        const newStateNavigationId = newState?.navigationId;
        if (newStateNavigationId !== undefined &&
            newStateNavigationId === currentNavigationId) {
            return;
        }
        let url;
        if (urlType === 'path') {
            url = resolveUrl(newUrl);
        }
        else if (urlType === 'hash') {
            // Remove the first hash from the URL
            const hashIdx = newUrl.indexOf('#');
            url = resolveUrl(newUrl.substring(0, hashIdx) + newUrl.substring(hashIdx + 1));
        }
        else {
            throw 'Invalid URLType passed to setUpLocationSync: ' + urlType;
        }
        const path = location.normalize(url.pathname);
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
let anchor;
function resolveUrl(url) {
    anchor ??= document.createElement('a');
    anchor.setAttribute('href', url);
    anchor.setAttribute('href', anchor.href);
    return {
        // IE does not start `pathname` with `/` like other browsers.
        pathname: `/${anchor.pathname.replace(/^\//, '')}`,
        search: anchor.search,
        hash: anchor.hash
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBncmFkZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci91cGdyYWRlL3NyYy91cGdyYWRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUN6QyxPQUFPLEVBQUMsc0JBQXNCLEVBQStCLE1BQU0sZUFBZSxDQUFDO0FBQ25GLE9BQU8sRUFBQyxNQUFNLEVBQWtDLE1BQU0saUJBQWlCLENBQUM7QUFDeEUsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBRXREOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBc0JHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUc7SUFDdEMsT0FBTyxFQUFFLHNCQUFzQjtJQUMvQixLQUFLLEVBQUUsSUFBSTtJQUNYLFVBQVUsRUFBRSw2QkFBeUU7SUFDckYsSUFBSSxFQUFFLENBQUMsYUFBYSxDQUFDO0NBQ3RCLENBQUM7QUFFRjs7R0FFRztBQUNILE1BQU0sVUFBVSw2QkFBNkIsQ0FBQyxTQUF3QjtJQUNwRSxPQUFPLEdBQUcsRUFBRTtRQUNWLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQy9CLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7R0FXRztBQUNILE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxTQUF3QixFQUFFLFVBQXlCLE1BQU07SUFDekYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUN6QixNQUFNLElBQUksS0FBSyxDQUFDOzs7T0FHYixDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQVcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEQsTUFBTSxRQUFRLEdBQWEsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFNUQsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDO1NBQ2hDLEdBQUcsQ0FDQSxzQkFBc0IsRUFDdEIsQ0FBQyxLQUFVLEVBQUUsTUFBYyxFQUFFLE1BQWMsRUFDMUMsUUFBK0MsRUFDL0MsUUFBK0MsRUFBRSxFQUFFO1FBQ2xELG1FQUFtRTtRQUNuRSxtRUFBbUU7UUFDbkUseURBQXlEO1FBQ3pELGNBQWM7UUFDZCxNQUFNLG1CQUFtQixHQUFHLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsQ0FBQztRQUM5RCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsRUFBRSxZQUFZLENBQUM7UUFDcEQsSUFBSSxvQkFBb0IsS0FBSyxTQUFTO1lBQ2xDLG9CQUFvQixLQUFLLG1CQUFtQixFQUFFLENBQUM7WUFDakQsT0FBTztRQUNULENBQUM7UUFFRCxJQUFJLEdBQUcsQ0FBQztRQUNSLElBQUksT0FBTyxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ3ZCLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0IsQ0FBQzthQUFNLElBQUksT0FBTyxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQzlCLHFDQUFxQztZQUNyQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3BDLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRixDQUFDO2FBQU0sQ0FBQztZQUNOLE1BQU0sK0NBQStDLEdBQUcsT0FBTyxDQUFDO1FBQ2xFLENBQUM7UUFDRCxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyRCxDQUFDLENBQUMsQ0FBQztBQUNiLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FpQkc7QUFDSCxJQUFJLE1BQW1DLENBQUM7QUFDeEMsU0FBUyxVQUFVLENBQUMsR0FBVztJQUM3QixNQUFNLEtBQUssUUFBUSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUV2QyxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqQyxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFekMsT0FBTztRQUNMLDZEQUE2RDtRQUM3RCxRQUFRLEVBQUUsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUU7UUFDbEQsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO1FBQ3JCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTtLQUNsQixDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLCBDb21wb25lbnRSZWYsIEluamVjdGlvblRva2VufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Um91dGVyLCDJtVJlc3RvcmVkU3RhdGUgYXMgUmVzdG9yZWRTdGF0ZX0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcbmltcG9ydCB7VXBncmFkZU1vZHVsZX0gZnJvbSAnQGFuZ3VsYXIvdXBncmFkZS9zdGF0aWMnO1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gaW5pdGlhbGl6ZXIgdGhhdCBzZXRzIHVwIGBuZ1JvdXRlYCBpbnRlZ3JhdGlvblxuICogYWxvbmcgd2l0aCBzZXR0aW5nIHVwIHRoZSBBbmd1bGFyIHJvdXRlci5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIDxjb2RlLWV4YW1wbGUgbGFuZ3VhZ2U9XCJ0eXBlc2NyaXB0XCI+XG4gKiBATmdNb2R1bGUoe1xuICogIGltcG9ydHM6IFtcbiAqICAgUm91dGVyTW9kdWxlLmZvclJvb3QoU09NRV9ST1VURVMpLFxuICogICBVcGdyYWRlTW9kdWxlXG4gKiBdLFxuICogcHJvdmlkZXJzOiBbXG4gKiAgIFJvdXRlclVwZ3JhZGVJbml0aWFsaXplclxuICogXVxuICogfSlcbiAqIGV4cG9ydCBjbGFzcyBBcHBNb2R1bGUge1xuICogICBuZ0RvQm9vdHN0cmFwKCkge31cbiAqIH1cbiAqIDwvY29kZS1leGFtcGxlPlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNvbnN0IFJvdXRlclVwZ3JhZGVJbml0aWFsaXplciA9IHtcbiAgcHJvdmlkZTogQVBQX0JPT1RTVFJBUF9MSVNURU5FUixcbiAgbXVsdGk6IHRydWUsXG4gIHVzZUZhY3Rvcnk6IGxvY2F0aW9uU3luY0Jvb3RzdHJhcExpc3RlbmVyIGFzIChuZ1VwZ3JhZGU6IFVwZ3JhZGVNb2R1bGUpID0+ICgpID0+IHZvaWQsXG4gIGRlcHM6IFtVcGdyYWRlTW9kdWxlXVxufTtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvY2F0aW9uU3luY0Jvb3RzdHJhcExpc3RlbmVyKG5nVXBncmFkZTogVXBncmFkZU1vZHVsZSkge1xuICByZXR1cm4gKCkgPT4ge1xuICAgIHNldFVwTG9jYXRpb25TeW5jKG5nVXBncmFkZSk7XG4gIH07XG59XG5cbi8qKlxuICogU2V0cyB1cCBhIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lciB0byB0cmlnZ2VyIGBoaXN0b3J5LnB1c2hTdGF0ZWAuXG4gKiBXb3JrcyBhcm91bmQgdGhlIHByb2JsZW0gdGhhdCBgb25Qb3BTdGF0ZWAgZG9lcyBub3QgdHJpZ2dlciBgaGlzdG9yeS5wdXNoU3RhdGVgLlxuICogTXVzdCBiZSBjYWxsZWQgKmFmdGVyKiBjYWxsaW5nIGBVcGdyYWRlTW9kdWxlLmJvb3RzdHJhcGAuXG4gKlxuICogQHBhcmFtIG5nVXBncmFkZSBUaGUgdXBncmFkZSBOZ01vZHVsZS5cbiAqIEBwYXJhbSB1cmxUeXBlIFRoZSBsb2NhdGlvbiBzdHJhdGVneS5cbiAqIEBzZWUge0BsaW5rIEhhc2hMb2NhdGlvblN0cmF0ZWd5fVxuICogQHNlZSB7QGxpbmsgUGF0aExvY2F0aW9uU3RyYXRlZ3l9XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0VXBMb2NhdGlvblN5bmMobmdVcGdyYWRlOiBVcGdyYWRlTW9kdWxlLCB1cmxUeXBlOiAncGF0aCd8J2hhc2gnID0gJ3BhdGgnKSB7XG4gIGlmICghbmdVcGdyYWRlLiRpbmplY3Rvcikge1xuICAgIHRocm93IG5ldyBFcnJvcihgXG4gICAgICAgIFJvdXRlclVwZ3JhZGVJbml0aWFsaXplciBjYW4gYmUgdXNlZCBvbmx5IGFmdGVyIFVwZ3JhZGVNb2R1bGUuYm9vdHN0cmFwIGhhcyBiZWVuIGNhbGxlZC5cbiAgICAgICAgUmVtb3ZlIFJvdXRlclVwZ3JhZGVJbml0aWFsaXplciBhbmQgY2FsbCBzZXRVcExvY2F0aW9uU3luYyBhZnRlciBVcGdyYWRlTW9kdWxlLmJvb3RzdHJhcC5cbiAgICAgIGApO1xuICB9XG5cbiAgY29uc3Qgcm91dGVyOiBSb3V0ZXIgPSBuZ1VwZ3JhZGUuaW5qZWN0b3IuZ2V0KFJvdXRlcik7XG4gIGNvbnN0IGxvY2F0aW9uOiBMb2NhdGlvbiA9IG5nVXBncmFkZS5pbmplY3Rvci5nZXQoTG9jYXRpb24pO1xuXG4gIG5nVXBncmFkZS4kaW5qZWN0b3IuZ2V0KCckcm9vdFNjb3BlJylcbiAgICAgIC4kb24oXG4gICAgICAgICAgJyRsb2NhdGlvbkNoYW5nZVN0YXJ0JyxcbiAgICAgICAgICAoZXZlbnQ6IGFueSwgbmV3VXJsOiBzdHJpbmcsIG9sZFVybDogc3RyaW5nLFxuICAgICAgICAgICBuZXdTdGF0ZT86IHtbazogc3RyaW5nXTogdW5rbm93bn18UmVzdG9yZWRTdGF0ZSxcbiAgICAgICAgICAgb2xkU3RhdGU/OiB7W2s6IHN0cmluZ106IHVua25vd259fFJlc3RvcmVkU3RhdGUpID0+IHtcbiAgICAgICAgICAgIC8vIE5hdmlnYXRpb25zIGNvbWluZyBmcm9tIEFuZ3VsYXIgcm91dGVyIGhhdmUgYSBuYXZpZ2F0aW9uSWQgc3RhdGVcbiAgICAgICAgICAgIC8vIHByb3BlcnR5LiBEb24ndCB0cmlnZ2VyIEFuZ3VsYXIgcm91dGVyIG5hdmlnYXRpb24gYWdhaW4gaWYgaXQgaXNcbiAgICAgICAgICAgIC8vIGNhdXNlZCBieSBhIFVSTCBjaGFuZ2UgZnJvbSB0aGUgY3VycmVudCBBbmd1bGFyIHJvdXRlclxuICAgICAgICAgICAgLy8gbmF2aWdhdGlvbi5cbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnROYXZpZ2F0aW9uSWQgPSByb3V0ZXIuZ2V0Q3VycmVudE5hdmlnYXRpb24oKT8uaWQ7XG4gICAgICAgICAgICBjb25zdCBuZXdTdGF0ZU5hdmlnYXRpb25JZCA9IG5ld1N0YXRlPy5uYXZpZ2F0aW9uSWQ7XG4gICAgICAgICAgICBpZiAobmV3U3RhdGVOYXZpZ2F0aW9uSWQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgICAgIG5ld1N0YXRlTmF2aWdhdGlvbklkID09PSBjdXJyZW50TmF2aWdhdGlvbklkKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHVybDtcbiAgICAgICAgICAgIGlmICh1cmxUeXBlID09PSAncGF0aCcpIHtcbiAgICAgICAgICAgICAgdXJsID0gcmVzb2x2ZVVybChuZXdVcmwpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh1cmxUeXBlID09PSAnaGFzaCcpIHtcbiAgICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBmaXJzdCBoYXNoIGZyb20gdGhlIFVSTFxuICAgICAgICAgICAgICBjb25zdCBoYXNoSWR4ID0gbmV3VXJsLmluZGV4T2YoJyMnKTtcbiAgICAgICAgICAgICAgdXJsID0gcmVzb2x2ZVVybChuZXdVcmwuc3Vic3RyaW5nKDAsIGhhc2hJZHgpICsgbmV3VXJsLnN1YnN0cmluZyhoYXNoSWR4ICsgMSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgJ0ludmFsaWQgVVJMVHlwZSBwYXNzZWQgdG8gc2V0VXBMb2NhdGlvblN5bmM6ICcgKyB1cmxUeXBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgcGF0aCA9IGxvY2F0aW9uLm5vcm1hbGl6ZSh1cmwucGF0aG5hbWUpO1xuICAgICAgICAgICAgcm91dGVyLm5hdmlnYXRlQnlVcmwocGF0aCArIHVybC5zZWFyY2ggKyB1cmwuaGFzaCk7XG4gICAgICAgICAgfSk7XG59XG5cbi8qKlxuICogTm9ybWFsaXplcyBhbmQgcGFyc2VzIGEgVVJMLlxuICpcbiAqIC0gTm9ybWFsaXppbmcgbWVhbnMgdGhhdCBhIHJlbGF0aXZlIFVSTCB3aWxsIGJlIHJlc29sdmVkIGludG8gYW4gYWJzb2x1dGUgVVJMIGluIHRoZSBjb250ZXh0IG9mXG4gKiAgIHRoZSBhcHBsaWNhdGlvbiBkb2N1bWVudC5cbiAqIC0gUGFyc2luZyBtZWFucyB0aGF0IHRoZSBhbmNob3IncyBgcHJvdG9jb2xgLCBgaG9zdG5hbWVgLCBgcG9ydGAsIGBwYXRobmFtZWAgYW5kIHJlbGF0ZWRcbiAqICAgcHJvcGVydGllcyBhcmUgYWxsIHBvcHVsYXRlZCB0byByZWZsZWN0IHRoZSBub3JtYWxpemVkIFVSTC5cbiAqXG4gKiBXaGlsZSB0aGlzIGFwcHJvYWNoIGhhcyB3aWRlIGNvbXBhdGliaWxpdHksIGl0IGRvZXNuJ3Qgd29yayBhcyBleHBlY3RlZCBvbiBJRS4gT24gSUUsIG5vcm1hbGl6aW5nXG4gKiBoYXBwZW5zIHNpbWlsYXIgdG8gb3RoZXIgYnJvd3NlcnMsIGJ1dCB0aGUgcGFyc2VkIGNvbXBvbmVudHMgd2lsbCBub3QgYmUgc2V0LiAoRS5nLiBpZiB5b3UgYXNzaWduXG4gKiBgYS5ocmVmID0gJ2ZvbydgLCB0aGVuIGBhLnByb3RvY29sYCwgYGEuaG9zdGAsIGV0Yy4gd2lsbCBub3QgYmUgY29ycmVjdGx5IHVwZGF0ZWQuKVxuICogV2Ugd29yayBhcm91bmQgdGhhdCBieSBwZXJmb3JtaW5nIHRoZSBwYXJzaW5nIGluIGEgMm5kIHN0ZXAgYnkgdGFraW5nIGEgcHJldmlvdXNseSBub3JtYWxpemVkIFVSTFxuICogYW5kIGFzc2lnbmluZyBpdCBhZ2Fpbi4gVGhpcyBjb3JyZWN0bHkgcG9wdWxhdGVzIGFsbCBwcm9wZXJ0aWVzLlxuICpcbiAqIFNlZVxuICogaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci5qcy9ibG9iLzJjNzQwMGU3ZDA3YjBmNmNlYzE4MTdkYWI0MGI5MjUwY2U4ZWJjZTYvc3JjL25nL3VybFV0aWxzLmpzI0wyNi1MMzNcbiAqIGZvciBtb3JlIGluZm8uXG4gKi9cbmxldCBhbmNob3I6IEhUTUxBbmNob3JFbGVtZW50fHVuZGVmaW5lZDtcbmZ1bmN0aW9uIHJlc29sdmVVcmwodXJsOiBzdHJpbmcpOiB7cGF0aG5hbWU6IHN0cmluZywgc2VhcmNoOiBzdHJpbmcsIGhhc2g6IHN0cmluZ30ge1xuICBhbmNob3IgPz89IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblxuICBhbmNob3Iuc2V0QXR0cmlidXRlKCdocmVmJywgdXJsKTtcbiAgYW5jaG9yLnNldEF0dHJpYnV0ZSgnaHJlZicsIGFuY2hvci5ocmVmKTtcblxuICByZXR1cm4ge1xuICAgIC8vIElFIGRvZXMgbm90IHN0YXJ0IGBwYXRobmFtZWAgd2l0aCBgL2AgbGlrZSBvdGhlciBicm93c2Vycy5cbiAgICBwYXRobmFtZTogYC8ke2FuY2hvci5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywgJycpfWAsXG4gICAgc2VhcmNoOiBhbmNob3Iuc2VhcmNoLFxuICAgIGhhc2g6IGFuY2hvci5oYXNoXG4gIH07XG59XG4iXX0=