/**
 * @license Angular v4.0.0-rc.3-d4205bb
 * (c) 2010-2017 Google, Inc. https://angular.io/
 * License: MIT
 */import { APP_BOOTSTRAP_LISTENER } from '@angular/core';
import { Router } from '@angular/router';
import { UpgradeModule } from '@angular/upgrade/static';

/**
 * @whatItDoes Creates an initializer that in addition to setting up the Angular
 * router sets up the ngRoute integration.
 *
 * @howToUse
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
const RouterUpgradeInitializer = {
    provide: APP_BOOTSTRAP_LISTENER,
    multi: true,
    useFactory: locationSyncBootstrapListener,
    deps: [UpgradeModule]
};
/**
 * @internal
 */
function locationSyncBootstrapListener(ngUpgrade) {
    return () => { setUpLocationSync(ngUpgrade); };
}
/**
 * @whatItDoes Sets up a location synchronization.
 *
 * History.pushState does not fire onPopState, so the angular2 location
 * doesn't detect it. The workaround is to attach a location change listener
 *
 * @experimental
 */
function setUpLocationSync(ngUpgrade) {
    if (!ngUpgrade.$injector) {
        throw new Error(`
        RouterUpgradeInitializer can be used only after UpgradeModule.bootstrap has been called.
        Remove RouterUpgradeInitializer and call setUpLocationSync after UpgradeModule.bootstrap.
      `);
    }
    const router = ngUpgrade.injector.get(Router);
    const url = document.createElement('a');
    ngUpgrade.$injector.get('$rootScope')
        .$on('$locationChangeStart', (_, next, __) => {
        url.href = next;
        router.navigateByUrl(url.pathname);
    });
}

export { RouterUpgradeInitializer, locationSyncBootstrapListener, setUpLocationSync };