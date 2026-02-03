/**
 * @license Angular v21.1.2+sha-2cf4da0
 * (c) 2010-2026 Google LLC. https://angular.dev/
 * License: MIT
 */

import * as i0 from '@angular/core';
import { ComponentRef } from '@angular/core';
import { UpgradeModule } from '@angular/upgrade/static';

/**
 * Creates an initializer that sets up `ngRoute` integration
 * along with setting up the Angular router.
 *
 * @usageNotes
 *
 * For standalone applications:
 * ```ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [RouterUpgradeInitializer],
 * };
 * ```
 *
 * For NgModule based applications:
 * ```ts
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
declare const RouterUpgradeInitializer: {
    provide: i0.InjectionToken<readonly ((compRef: ComponentRef<any>) => void)[]>;
    multi: boolean;
    useFactory: () => () => void;
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
