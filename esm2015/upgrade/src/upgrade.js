/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
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
 * \@experimental
 */
export const /** @type {?} */ RouterUpgradeInitializer = {
    provide: APP_BOOTSTRAP_LISTENER,
    multi: true,
    useFactory: /** @type {?} */ (locationSyncBootstrapListener),
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
 * \@experimental
 * @param {?} ngUpgrade
 * @return {?}
 */
export function setUpLocationSync(ngUpgrade) {
    if (!ngUpgrade.$injector) {
        throw new Error(`
        RouterUpgradeInitializer can be used only after UpgradeModule.bootstrap has been called.
        Remove RouterUpgradeInitializer and call setUpLocationSync after UpgradeModule.bootstrap.
      `);
    }
    const /** @type {?} */ router = ngUpgrade.injector.get(Router);
    const /** @type {?} */ url = document.createElement('a');
    ngUpgrade.$injector.get('$rootScope')
        .$on('$locationChangeStart', (_, next, __) => {
        url.href = next;
        router.navigateByUrl(url.pathname + url.search + url.hash);
    });
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBncmFkZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci91cGdyYWRlL3NyYy91cGdyYWRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBUUEsT0FBTyxFQUFDLHNCQUFzQixFQUErQixNQUFNLGVBQWUsQ0FBQztBQUNuRixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLHlCQUF5QixDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUEyQnRELE1BQU0sQ0FBQyx1QkFBTSx3QkFBd0IsR0FBRztJQUN0QyxPQUFPLEVBQUUsc0JBQXNCO0lBQy9CLEtBQUssRUFBRSxJQUFJO0lBQ1gsVUFBVSxvQkFBRSw2QkFBd0UsQ0FBQTtJQUNwRixJQUFJLEVBQUUsQ0FBQyxhQUFhLENBQUM7Q0FDdEIsQ0FBQzs7Ozs7O0FBS0YsTUFBTSx3Q0FBd0MsU0FBd0I7SUFDcEUsT0FBTyxHQUFHLEVBQUUsR0FBRyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUM7Q0FDaEQ7Ozs7Ozs7Ozs7Ozs7QUFZRCxNQUFNLDRCQUE0QixTQUF3QjtJQUN4RCxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRTtRQUN4QixNQUFNLElBQUksS0FBSyxDQUFDOzs7T0FHYixDQUFDLENBQUM7S0FDTjtJQUVELHVCQUFNLE1BQU0sR0FBVyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0RCx1QkFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUV4QyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUM7U0FDaEMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBTSxFQUFFLElBQVksRUFBRSxFQUFVLEVBQUUsRUFBRTtRQUNoRSxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNoQixNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDNUQsQ0FBQyxDQUFDO0NBQ1IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVBQX0JPT1RTVFJBUF9MSVNURU5FUiwgQ29tcG9uZW50UmVmLCBJbmplY3Rpb25Ub2tlbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge1JvdXRlcn0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcbmltcG9ydCB7VXBncmFkZU1vZHVsZX0gZnJvbSAnQGFuZ3VsYXIvdXBncmFkZS9zdGF0aWMnO1xuXG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBDcmVhdGVzIGFuIGluaXRpYWxpemVyIHRoYXQgaW4gYWRkaXRpb24gdG8gc2V0dGluZyB1cCB0aGUgQW5ndWxhclxuICogcm91dGVyIHNldHMgdXAgdGhlIG5nUm91dGUgaW50ZWdyYXRpb24uXG4gKlxuICogYGBgXG4gKiBATmdNb2R1bGUoe1xuICogIGltcG9ydHM6IFtcbiAqICAgUm91dGVyTW9kdWxlLmZvclJvb3QoU09NRV9ST1VURVMpLFxuICogICBVcGdyYWRlTW9kdWxlXG4gKiBdLFxuICogcHJvdmlkZXJzOiBbXG4gKiAgIFJvdXRlclVwZ3JhZGVJbml0aWFsaXplclxuICogXVxuICogfSlcbiAqIGV4cG9ydCBjbGFzcyBBcHBNb2R1bGUge1xuICogICBuZ0RvQm9vdHN0cmFwKCkge31cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBleHBlcmltZW50YWxcbiAqL1xuZXhwb3J0IGNvbnN0IFJvdXRlclVwZ3JhZGVJbml0aWFsaXplciA9IHtcbiAgcHJvdmlkZTogQVBQX0JPT1RTVFJBUF9MSVNURU5FUixcbiAgbXVsdGk6IHRydWUsXG4gIHVzZUZhY3Rvcnk6IGxvY2F0aW9uU3luY0Jvb3RzdHJhcExpc3RlbmVyIGFzKG5nVXBncmFkZTogVXBncmFkZU1vZHVsZSkgPT4gKCkgPT4gdm9pZCxcbiAgZGVwczogW1VwZ3JhZGVNb2R1bGVdXG59O1xuXG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9jYXRpb25TeW5jQm9vdHN0cmFwTGlzdGVuZXIobmdVcGdyYWRlOiBVcGdyYWRlTW9kdWxlKSB7XG4gIHJldHVybiAoKSA9PiB7IHNldFVwTG9jYXRpb25TeW5jKG5nVXBncmFkZSk7IH07XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogU2V0cyB1cCBhIGxvY2F0aW9uIHN5bmNocm9uaXphdGlvbi5cbiAqXG4gKiBIaXN0b3J5LnB1c2hTdGF0ZSBkb2VzIG5vdCBmaXJlIG9uUG9wU3RhdGUsIHNvIHRoZSBBbmd1bGFyIGxvY2F0aW9uXG4gKiBkb2Vzbid0IGRldGVjdCBpdC4gVGhlIHdvcmthcm91bmQgaXMgdG8gYXR0YWNoIGEgbG9jYXRpb24gY2hhbmdlIGxpc3RlbmVyXG4gKlxuICogQGV4cGVyaW1lbnRhbFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0VXBMb2NhdGlvblN5bmMobmdVcGdyYWRlOiBVcGdyYWRlTW9kdWxlKSB7XG4gIGlmICghbmdVcGdyYWRlLiRpbmplY3Rvcikge1xuICAgIHRocm93IG5ldyBFcnJvcihgXG4gICAgICAgIFJvdXRlclVwZ3JhZGVJbml0aWFsaXplciBjYW4gYmUgdXNlZCBvbmx5IGFmdGVyIFVwZ3JhZGVNb2R1bGUuYm9vdHN0cmFwIGhhcyBiZWVuIGNhbGxlZC5cbiAgICAgICAgUmVtb3ZlIFJvdXRlclVwZ3JhZGVJbml0aWFsaXplciBhbmQgY2FsbCBzZXRVcExvY2F0aW9uU3luYyBhZnRlciBVcGdyYWRlTW9kdWxlLmJvb3RzdHJhcC5cbiAgICAgIGApO1xuICB9XG5cbiAgY29uc3Qgcm91dGVyOiBSb3V0ZXIgPSBuZ1VwZ3JhZGUuaW5qZWN0b3IuZ2V0KFJvdXRlcik7XG4gIGNvbnN0IHVybCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblxuICBuZ1VwZ3JhZGUuJGluamVjdG9yLmdldCgnJHJvb3RTY29wZScpXG4gICAgICAuJG9uKCckbG9jYXRpb25DaGFuZ2VTdGFydCcsIChfOiBhbnksIG5leHQ6IHN0cmluZywgX186IHN0cmluZykgPT4ge1xuICAgICAgICB1cmwuaHJlZiA9IG5leHQ7XG4gICAgICAgIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKHVybC5wYXRobmFtZSArIHVybC5zZWFyY2ggKyB1cmwuaGFzaCk7XG4gICAgICB9KTtcbn1cbiJdfQ==