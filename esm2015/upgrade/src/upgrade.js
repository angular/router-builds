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
 * @experimental
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
 * @experimental
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBncmFkZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci91cGdyYWRlL3NyYy91cGdyYWRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUN6QyxPQUFPLEVBQUMsc0JBQXNCLEVBQStCLE1BQU0sZUFBZSxDQUFDO0FBQ25GLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUN2QyxPQUFPLEVBQUMsYUFBYSxFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFFdEQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FzQkc7QUFDSCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRztJQUN0QyxPQUFPLEVBQUUsc0JBQXNCO0lBQy9CLEtBQUssRUFBRSxJQUFJO0lBQ1gsVUFBVSxFQUFFLDZCQUF3RTtJQUNwRixJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUM7Q0FDdEIsQ0FBQztBQUVGOztHQUVHO0FBQ0gsTUFBTSx3Q0FBd0MsU0FBd0I7SUFDcEUsT0FBTyxHQUFHLEVBQUUsR0FBRyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRCxDQUFDO0FBRUQ7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSw0QkFBNEIsU0FBd0I7SUFDeEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUU7UUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQzs7O09BR2IsQ0FBQyxDQUFDO0tBQ047SUFFRCxNQUFNLE1BQU0sR0FBVyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0RCxNQUFNLFFBQVEsR0FBYSxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUU1RCxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUM7U0FDaEMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBTSxFQUFFLElBQVksRUFBRSxFQUFVLEVBQUUsRUFBRTtRQUNoRSxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDOUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckQsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBaUJHO0FBQ0gsSUFBSSxNQUFtQyxDQUFDO0FBQ3hDLG9CQUFvQixHQUFXO0lBQzdCLElBQUksQ0FBQyxNQUFNLEVBQUU7UUFDWCxNQUFNLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUN0QztJQUVELE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2pDLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUV6QyxPQUFPO1FBQ0wsNkRBQTZEO1FBQzdELFFBQVEsRUFBRSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRTtRQUNsRCxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07UUFDckIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJO0tBQ2xCLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtBUFBfQk9PVFNUUkFQX0xJU1RFTkVSLCBDb21wb25lbnRSZWYsIEluamVjdGlvblRva2VufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7Um91dGVyfSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xuaW1wb3J0IHtVcGdyYWRlTW9kdWxlfSBmcm9tICdAYW5ndWxhci91cGdyYWRlL3N0YXRpYyc7XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQ3JlYXRlcyBhbiBpbml0aWFsaXplciB0aGF0IGluIGFkZGl0aW9uIHRvIHNldHRpbmcgdXAgdGhlIEFuZ3VsYXJcbiAqIHJvdXRlciBzZXRzIHVwIHRoZSBuZ1JvdXRlIGludGVncmF0aW9uLlxuICpcbiAqIGBgYFxuICogQE5nTW9kdWxlKHtcbiAqICBpbXBvcnRzOiBbXG4gKiAgIFJvdXRlck1vZHVsZS5mb3JSb290KFNPTUVfUk9VVEVTKSxcbiAqICAgVXBncmFkZU1vZHVsZVxuICogXSxcbiAqIHByb3ZpZGVyczogW1xuICogICBSb3V0ZXJVcGdyYWRlSW5pdGlhbGl6ZXJcbiAqIF1cbiAqIH0pXG4gKiBleHBvcnQgY2xhc3MgQXBwTW9kdWxlIHtcbiAqICAgbmdEb0Jvb3RzdHJhcCgpIHt9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBAZXhwZXJpbWVudGFsXG4gKi9cbmV4cG9ydCBjb25zdCBSb3V0ZXJVcGdyYWRlSW5pdGlhbGl6ZXIgPSB7XG4gIHByb3ZpZGU6IEFQUF9CT09UU1RSQVBfTElTVEVORVIsXG4gIG11bHRpOiB0cnVlLFxuICB1c2VGYWN0b3J5OiBsb2NhdGlvblN5bmNCb290c3RyYXBMaXN0ZW5lciBhcyhuZ1VwZ3JhZGU6IFVwZ3JhZGVNb2R1bGUpID0+ICgpID0+IHZvaWQsXG4gIGRlcHM6IFtVcGdyYWRlTW9kdWxlXVxufTtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvY2F0aW9uU3luY0Jvb3RzdHJhcExpc3RlbmVyKG5nVXBncmFkZTogVXBncmFkZU1vZHVsZSkge1xuICByZXR1cm4gKCkgPT4geyBzZXRVcExvY2F0aW9uU3luYyhuZ1VwZ3JhZGUpOyB9O1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFNldHMgdXAgYSBsb2NhdGlvbiBzeW5jaHJvbml6YXRpb24uXG4gKlxuICogSGlzdG9yeS5wdXNoU3RhdGUgZG9lcyBub3QgZmlyZSBvblBvcFN0YXRlLCBzbyB0aGUgQW5ndWxhciBsb2NhdGlvblxuICogZG9lc24ndCBkZXRlY3QgaXQuIFRoZSB3b3JrYXJvdW5kIGlzIHRvIGF0dGFjaCBhIGxvY2F0aW9uIGNoYW5nZSBsaXN0ZW5lclxuICpcbiAqIEBleHBlcmltZW50YWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldFVwTG9jYXRpb25TeW5jKG5nVXBncmFkZTogVXBncmFkZU1vZHVsZSkge1xuICBpZiAoIW5nVXBncmFkZS4kaW5qZWN0b3IpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFxuICAgICAgICBSb3V0ZXJVcGdyYWRlSW5pdGlhbGl6ZXIgY2FuIGJlIHVzZWQgb25seSBhZnRlciBVcGdyYWRlTW9kdWxlLmJvb3RzdHJhcCBoYXMgYmVlbiBjYWxsZWQuXG4gICAgICAgIFJlbW92ZSBSb3V0ZXJVcGdyYWRlSW5pdGlhbGl6ZXIgYW5kIGNhbGwgc2V0VXBMb2NhdGlvblN5bmMgYWZ0ZXIgVXBncmFkZU1vZHVsZS5ib290c3RyYXAuXG4gICAgICBgKTtcbiAgfVxuXG4gIGNvbnN0IHJvdXRlcjogUm91dGVyID0gbmdVcGdyYWRlLmluamVjdG9yLmdldChSb3V0ZXIpO1xuICBjb25zdCBsb2NhdGlvbjogTG9jYXRpb24gPSBuZ1VwZ3JhZGUuaW5qZWN0b3IuZ2V0KExvY2F0aW9uKTtcblxuICBuZ1VwZ3JhZGUuJGluamVjdG9yLmdldCgnJHJvb3RTY29wZScpXG4gICAgICAuJG9uKCckbG9jYXRpb25DaGFuZ2VTdGFydCcsIChfOiBhbnksIG5leHQ6IHN0cmluZywgX186IHN0cmluZykgPT4ge1xuICAgICAgICBjb25zdCB1cmwgPSByZXNvbHZlVXJsKG5leHQpO1xuICAgICAgICBjb25zdCBwYXRoID0gbG9jYXRpb24ubm9ybWFsaXplKHVybC5wYXRobmFtZSk7XG4gICAgICAgIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKHBhdGggKyB1cmwuc2VhcmNoICsgdXJsLmhhc2gpO1xuICAgICAgfSk7XG59XG5cbi8qKlxuICogTm9ybWFsaXplIGFuZCBwYXJzZSBhIFVSTC5cbiAqXG4gKiAtIE5vcm1hbGl6aW5nIG1lYW5zIHRoYXQgYSByZWxhdGl2ZSBVUkwgd2lsbCBiZSByZXNvbHZlZCBpbnRvIGFuIGFic29sdXRlIFVSTCBpbiB0aGUgY29udGV4dCBvZlxuICogICB0aGUgYXBwbGljYXRpb24gZG9jdW1lbnQuXG4gKiAtIFBhcnNpbmcgbWVhbnMgdGhhdCB0aGUgYW5jaG9yJ3MgYHByb3RvY29sYCwgYGhvc3RuYW1lYCwgYHBvcnRgLCBgcGF0aG5hbWVgIGFuZCByZWxhdGVkXG4gKiAgIHByb3BlcnRpZXMgYXJlIGFsbCBwb3B1bGF0ZWQgdG8gcmVmbGVjdCB0aGUgbm9ybWFsaXplZCBVUkwuXG4gKlxuICogV2hpbGUgdGhpcyBhcHByb2FjaCBoYXMgd2lkZSBjb21wYXRpYmlsaXR5LCBpdCBkb2Vzbid0IHdvcmsgYXMgZXhwZWN0ZWQgb24gSUUuIE9uIElFLCBub3JtYWxpemluZ1xuICogaGFwcGVucyBzaW1pbGFyIHRvIG90aGVyIGJyb3dzZXJzLCBidXQgdGhlIHBhcnNlZCBjb21wb25lbnRzIHdpbGwgbm90IGJlIHNldC4gKEUuZy4gaWYgeW91IGFzc2lnblxuICogYGEuaHJlZiA9ICdmb28nYCwgdGhlbiBgYS5wcm90b2NvbGAsIGBhLmhvc3RgLCBldGMuIHdpbGwgbm90IGJlIGNvcnJlY3RseSB1cGRhdGVkLilcbiAqIFdlIHdvcmsgYXJvdW5kIHRoYXQgYnkgcGVyZm9ybWluZyB0aGUgcGFyc2luZyBpbiBhIDJuZCBzdGVwIGJ5IHRha2luZyBhIHByZXZpb3VzbHkgbm9ybWFsaXplZCBVUkxcbiAqIGFuZCBhc3NpZ25pbmcgaXQgYWdhaW4uIFRoaXMgY29ycmVjdGx5IHBvcHVsYXRlcyBhbGwgcHJvcGVydGllcy5cbiAqXG4gKiBTZWVcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIuanMvYmxvYi8yYzc0MDBlN2QwN2IwZjZjZWMxODE3ZGFiNDBiOTI1MGNlOGViY2U2L3NyYy9uZy91cmxVdGlscy5qcyNMMjYtTDMzXG4gKiBmb3IgbW9yZSBpbmZvLlxuICovXG5sZXQgYW5jaG9yOiBIVE1MQW5jaG9yRWxlbWVudHx1bmRlZmluZWQ7XG5mdW5jdGlvbiByZXNvbHZlVXJsKHVybDogc3RyaW5nKToge3BhdGhuYW1lOiBzdHJpbmcsIHNlYXJjaDogc3RyaW5nLCBoYXNoOiBzdHJpbmd9IHtcbiAgaWYgKCFhbmNob3IpIHtcbiAgICBhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gIH1cblxuICBhbmNob3Iuc2V0QXR0cmlidXRlKCdocmVmJywgdXJsKTtcbiAgYW5jaG9yLnNldEF0dHJpYnV0ZSgnaHJlZicsIGFuY2hvci5ocmVmKTtcblxuICByZXR1cm4ge1xuICAgIC8vIElFIGRvZXMgbm90IHN0YXJ0IGBwYXRobmFtZWAgd2l0aCBgL2AgbGlrZSBvdGhlciBicm93c2Vycy5cbiAgICBwYXRobmFtZTogYC8ke2FuY2hvci5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywgJycpfWAsXG4gICAgc2VhcmNoOiBhbmNob3Iuc2VhcmNoLFxuICAgIGhhc2g6IGFuY2hvci5oYXNoXG4gIH07XG59XG4iXX0=