/**
 * @license Angular v21.0.0-rc.3+sha-28c1a2d
 * (c) 2010-2025 Google LLC. https://angular.dev/
 * License: MIT
 */

import { Location } from '@angular/common';
import { APP_BOOTSTRAP_LISTENER, inject } from '@angular/core';
import { UpgradeModule } from '@angular/upgrade/static';
import { Router } from './_router-chunk.mjs';
import 'rxjs';
import 'rxjs/operators';
import '@angular/platform-browser';

const RouterUpgradeInitializer = {
  provide: APP_BOOTSTRAP_LISTENER,
  multi: true,
  useFactory: locationSyncBootstrapListener
};
function locationSyncBootstrapListener() {
  const ngUpgrade = inject(UpgradeModule);
  return () => {
    setUpLocationSync(ngUpgrade);
  };
}
function setUpLocationSync(ngUpgrade, urlType = 'path') {
  if (!ngUpgrade.$injector) {
    throw new Error(`
        RouterUpgradeInitializer can be used only after UpgradeModule.bootstrap has been called.
        Remove RouterUpgradeInitializer and call setUpLocationSync after UpgradeModule.bootstrap.
      `);
  }
  const router = ngUpgrade.injector.get(Router);
  const location = ngUpgrade.injector.get(Location);
  ngUpgrade.$injector.get('$rootScope').$on('$locationChangeStart', (event, newUrl, oldUrl, newState, oldState) => {
    const currentNavigationId = router.getCurrentNavigation()?.id;
    const newStateNavigationId = newState?.navigationId;
    if (newStateNavigationId !== undefined && newStateNavigationId === currentNavigationId) {
      return;
    }
    let url;
    if (urlType === 'path') {
      url = resolveUrl(newUrl);
    } else if (urlType === 'hash') {
      const hashIdx = newUrl.indexOf('#');
      url = resolveUrl(newUrl.substring(0, hashIdx) + newUrl.substring(hashIdx + 1));
    } else {
      throw 'Invalid URLType passed to setUpLocationSync: ' + urlType;
    }
    const path = location.normalize(url.pathname);
    router.navigateByUrl(path + url.search + url.hash);
  });
}
let anchor;
function resolveUrl(url) {
  anchor ??= document.createElement('a');
  anchor.setAttribute('href', url);
  anchor.setAttribute('href', anchor.href);
  return {
    pathname: `/${anchor.pathname.replace(/^\//, '')}`,
    search: anchor.search,
    hash: anchor.hash
  };
}

export { RouterUpgradeInitializer, locationSyncBootstrapListener, setUpLocationSync };
//# sourceMappingURL=upgrade.mjs.map
