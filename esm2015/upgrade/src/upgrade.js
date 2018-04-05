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
//# sourceMappingURL=upgrade.js.map