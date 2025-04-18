/**
 * @license Angular v20.0.0-next.7+sha-037dede
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */

import { InjectionToken, ComponentRef } from '@angular/core';
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
declare const RouterUpgradeInitializer: {
    provide: InjectionToken<readonly ((compRef: ComponentRef<any>) => void)[]>;
    multi: boolean;
    useFactory: (ngUpgrade: UpgradeModule) => () => void;
    deps: (typeof UpgradeModule)[];
};
/**
 * Sets up a location change listener to trigger `history.pushState`.
 * Works around the problem that `onPopState` does not trigger `history.pushState`.
 * Must be called *after* calling `UpgradeModule.bootstrap`.
 *
 * @param ngUpgrade The upgrade NgModule.
 * @param urlType The location strategy.
 * @see {@link /api/common/HashLocationStrategy HashLocationStrategy}
 * @see {@link /api/common/PathLocationStrategy PathLocationStrategy}
 *
 * @publicApi
 */
declare function setUpLocationSync(ngUpgrade: UpgradeModule, urlType?: 'path' | 'hash'): void;

export { RouterUpgradeInitializer, setUpLocationSync };
