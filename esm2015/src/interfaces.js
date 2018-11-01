/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * \@description
 *
 * Interface that a class can implement to be a guard deciding if a route can be activated.
 * If all guards return `true`, navigation will continue. If any guard returns `false`,
 * navigation will be cancelled. If any guard returns a `UrlTree`, current navigation will
 * be cancelled and a new navigation will be kicked off to the `UrlTree` returned from the
 * guard.
 *
 * ```
 * class UserToken {}
 * class Permissions {
 *   canActivate(user: UserToken, id: string): boolean {
 *     return true;
 *   }
 * }
 *
 * \@Injectable()
 * class CanActivateTeam implements CanActivate {
 *   constructor(private permissions: Permissions, private currentUser: UserToken) {}
 *
 *   canActivate(
 *     route: ActivatedRouteSnapshot,
 *     state: RouterStateSnapshot
 *   ): Observable<boolean|UrlTree>|Promise<boolean|UrlTree>|boolean|UrlTree {
 *     return this.permissions.canActivate(this.currentUser, route.params.id);
 *   }
 * }
 *
 * \@NgModule({
 *   imports: [
 *     RouterModule.forRoot([
 *       {
 *         path: 'team/:id',
 *         component: TeamCmp,
 *         canActivate: [CanActivateTeam]
 *       }
 *     ])
 *   ],
 *   providers: [CanActivateTeam, UserToken, Permissions]
 * })
 * class AppModule {}
 * ```
 *
 * You can alternatively provide a function with the `canActivate` signature:
 *
 * ```
 * \@NgModule({
 *   imports: [
 *     RouterModule.forRoot([
 *       {
 *         path: 'team/:id',
 *         component: TeamCmp,
 *         canActivate: ['canActivateTeam']
 *       }
 *     ])
 *   ],
 *   providers: [
 *     {
 *       provide: 'canActivateTeam',
 *       useValue: (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => true
 *     }
 *   ]
 * })
 * class AppModule {}
 * ```
 *
 * \@publicApi
 * @record
 */
export function CanActivate() { }
/** @type {?} */
CanActivate.prototype.canActivate;
/** @typedef {?} */
var CanActivateFn;
export { CanActivateFn };
/**
 * \@description
 *
 * Interface that a class can implement to be a guard deciding if a child route can be activated.
 * If all guards return `true`, navigation will continue. If any guard returns `false`,
 * navigation will be cancelled. If any guard returns a `UrlTree`, current navigation will
 * be cancelled and a new navigation will be kicked off to the `UrlTree` returned from the
 * guard.
 *
 * ```
 * class UserToken {}
 * class Permissions {
 *   canActivate(user: UserToken, id: string): boolean {
 *     return true;
 *   }
 * }
 *
 * \@Injectable()
 * class CanActivateTeam implements CanActivateChild {
 *   constructor(private permissions: Permissions, private currentUser: UserToken) {}
 *
 *   canActivateChild(
 *     route: ActivatedRouteSnapshot,
 *     state: RouterStateSnapshot
 *   ): Observable<boolean|UrlTree>|Promise<boolean|UrlTree>|boolean|UrlTree {
 *     return this.permissions.canActivate(this.currentUser, route.params.id);
 *   }
 * }
 *
 * \@NgModule({
 *   imports: [
 *     RouterModule.forRoot([
 *       {
 *         path: 'root',
 *         canActivateChild: [CanActivateTeam],
 *         children: [
 *           {
 *              path: 'team/:id',
 *              component: Team
 *           }
 *         ]
 *       }
 *     ])
 *   ],
 *   providers: [CanActivateTeam, UserToken, Permissions]
 * })
 * class AppModule {}
 * ```
 *
 * You can alternatively provide a function with the `canActivateChild` signature:
 *
 * ```
 * \@NgModule({
 *   imports: [
 *     RouterModule.forRoot([
 *       {
 *         path: 'root',
 *         canActivateChild: ['canActivateTeam'],
 *         children: [
 *           {
 *             path: 'team/:id',
 *             component: Team
 *           }
 *         ]
 *       }
 *     ])
 *   ],
 *   providers: [
 *     {
 *       provide: 'canActivateTeam',
 *       useValue: (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => true
 *     }
 *   ]
 * })
 * class AppModule {}
 * ```
 *
 * \@publicApi
 * @record
 */
export function CanActivateChild() { }
/** @type {?} */
CanActivateChild.prototype.canActivateChild;
/** @typedef {?} */
var CanActivateChildFn;
export { CanActivateChildFn };
/**
 * \@description
 *
 * Interface that a class can implement to be a guard deciding if a route can be deactivated.
 * If all guards return `true`, navigation will continue. If any guard returns `false`,
 * navigation will be cancelled. If any guard returns a `UrlTree`, current navigation will
 * be cancelled and a new navigation will be kicked off to the `UrlTree` returned from the
 * guard.
 *
 * ```
 * class UserToken {}
 * class Permissions {
 *   canDeactivate(user: UserToken, id: string): boolean {
 *     return true;
 *   }
 * }
 *
 * \@Injectable()
 * class CanDeactivateTeam implements CanDeactivate<TeamComponent> {
 *   constructor(private permissions: Permissions, private currentUser: UserToken) {}
 *
 *   canDeactivate(
 *     component: TeamComponent,
 *     currentRoute: ActivatedRouteSnapshot,
 *     currentState: RouterStateSnapshot,
 *     nextState: RouterStateSnapshot
 *   ): Observable<boolean|UrlTree>|Promise<boolean|UrlTree>|boolean|UrlTree {
 *     return this.permissions.canDeactivate(this.currentUser, route.params.id);
 *   }
 * }
 *
 * \@NgModule({
 *   imports: [
 *     RouterModule.forRoot([
 *       {
 *         path: 'team/:id',
 *         component: TeamCmp,
 *         canDeactivate: [CanDeactivateTeam]
 *       }
 *     ])
 *   ],
 *   providers: [CanDeactivateTeam, UserToken, Permissions]
 * })
 * class AppModule {}
 * ```
 *
 * You can alternatively provide a function with the `canDeactivate` signature:
 *
 * ```
 * \@NgModule({
 *   imports: [
 *     RouterModule.forRoot([
 *       {
 *         path: 'team/:id',
 *         component: TeamCmp,
 *         canDeactivate: ['canDeactivateTeam']
 *       }
 *     ])
 *   ],
 *   providers: [
 *     {
 *       provide: 'canDeactivateTeam',
 *       useValue: (component: TeamComponent, currentRoute: ActivatedRouteSnapshot, currentState:
 * RouterStateSnapshot, nextState: RouterStateSnapshot) => true
 *     }
 *   ]
 * })
 * class AppModule {}
 * ```
 *
 * \@publicApi
 * @record
 * @template T
 */
export function CanDeactivate() { }
/** @type {?} */
CanDeactivate.prototype.canDeactivate;
/** @typedef {?} */
var CanDeactivateFn;
export { CanDeactivateFn };
/**
 * \@description
 *
 * Interface that class can implement to be a data provider.
 *
 * ```
 * class Backend {
 *   fetchTeam(id: string) {
 *     return 'someTeam';
 *   }
 * }
 *
 * \@Injectable()
 * class TeamResolver implements Resolve<Team> {
 *   constructor(private backend: Backend) {}
 *
 *   resolve(
 *     route: ActivatedRouteSnapshot,
 *     state: RouterStateSnapshot
 *   ): Observable<any>|Promise<any>|any {
 *     return this.backend.fetchTeam(route.params.id);
 *   }
 * }
 *
 * \@NgModule({
 *   imports: [
 *     RouterModule.forRoot([
 *       {
 *         path: 'team/:id',
 *         component: TeamCmp,
 *         resolve: {
 *           team: TeamResolver
 *         }
 *       }
 *     ])
 *   ],
 *   providers: [TeamResolver]
 * })
 * class AppModule {}
 * ```
 *
 * You can alternatively provide a function with the `resolve` signature:
 *
 * ```
 * \@NgModule({
 *   imports: [
 *     RouterModule.forRoot([
 *       {
 *         path: 'team/:id',
 *         component: TeamCmp,
 *         resolve: {
 *           team: 'teamResolver'
 *         }
 *       }
 *     ])
 *   ],
 *   providers: [
 *     {
 *       provide: 'teamResolver',
 *       useValue: (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => 'team'
 *     }
 *   ]
 * })
 * class AppModule {}
 * ```
 *
 * \@publicApi
 * @record
 * @template T
 */
export function Resolve() { }
/** @type {?} */
Resolve.prototype.resolve;
/**
 * \@description
 *
 * Interface that a class can implement to be a guard deciding if a children can be loaded.
 *
 * ```
 * class UserToken {}
 * class Permissions {
 *   canLoadChildren(user: UserToken, id: string, segments: UrlSegment[]): boolean {
 *     return true;
 *   }
 * }
 *
 * \@Injectable()
 * class CanLoadTeamSection implements CanLoad {
 *   constructor(private permissions: Permissions, private currentUser: UserToken) {}
 *
 *   canLoad(route: Route, segments: UrlSegment[]): Observable<boolean>|Promise<boolean>|boolean {
 *     return this.permissions.canLoadChildren(this.currentUser, route, segments);
 *   }
 * }
 *
 * \@NgModule({
 *   imports: [
 *     RouterModule.forRoot([
 *       {
 *         path: 'team/:id',
 *         component: TeamCmp,
 *         loadChildren: 'team.js',
 *         canLoad: [CanLoadTeamSection]
 *       }
 *     ])
 *   ],
 *   providers: [CanLoadTeamSection, UserToken, Permissions]
 * })
 * class AppModule {}
 * ```
 *
 * You can alternatively provide a function with the `canLoad` signature:
 *
 * ```
 * \@NgModule({
 *   imports: [
 *     RouterModule.forRoot([
 *       {
 *         path: 'team/:id',
 *         component: TeamCmp,
 *         loadChildren: 'team.js',
 *         canLoad: ['canLoadTeamSection']
 *       }
 *     ])
 *   ],
 *   providers: [
 *     {
 *       provide: 'canLoadTeamSection',
 *       useValue: (route: Route, segments: UrlSegment[]) => true
 *     }
 *   ]
 * })
 * class AppModule {}
 * ```
 *
 * \@publicApi
 * @record
 */
export function CanLoad() { }
/** @type {?} */
CanLoad.prototype.canLoad;
/** @typedef {?} */
var CanLoadFn;
export { CanLoadFn };

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJmYWNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvaW50ZXJmYWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge09ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge1JvdXRlfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3QsIFJvdXRlclN0YXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7VXJsU2VnbWVudCwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBJbnRlcmZhY2UgdGhhdCBhIGNsYXNzIGNhbiBpbXBsZW1lbnQgdG8gYmUgYSBndWFyZCBkZWNpZGluZyBpZiBhIHJvdXRlIGNhbiBiZSBhY3RpdmF0ZWQuXG4gKiBJZiBhbGwgZ3VhcmRzIHJldHVybiBgdHJ1ZWAsIG5hdmlnYXRpb24gd2lsbCBjb250aW51ZS4gSWYgYW55IGd1YXJkIHJldHVybnMgYGZhbHNlYCxcbiAqIG5hdmlnYXRpb24gd2lsbCBiZSBjYW5jZWxsZWQuIElmIGFueSBndWFyZCByZXR1cm5zIGEgYFVybFRyZWVgLCBjdXJyZW50IG5hdmlnYXRpb24gd2lsbFxuICogYmUgY2FuY2VsbGVkIGFuZCBhIG5ldyBuYXZpZ2F0aW9uIHdpbGwgYmUga2lja2VkIG9mZiB0byB0aGUgYFVybFRyZWVgIHJldHVybmVkIGZyb20gdGhlXG4gKiBndWFyZC5cbiAqXG4gKiBgYGBcbiAqIGNsYXNzIFVzZXJUb2tlbiB7fVxuICogY2xhc3MgUGVybWlzc2lvbnMge1xuICogICBjYW5BY3RpdmF0ZSh1c2VyOiBVc2VyVG9rZW4sIGlkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAqICAgICByZXR1cm4gdHJ1ZTtcbiAqICAgfVxuICogfVxuICpcbiAqIEBJbmplY3RhYmxlKClcbiAqIGNsYXNzIENhbkFjdGl2YXRlVGVhbSBpbXBsZW1lbnRzIENhbkFjdGl2YXRlIHtcbiAqICAgY29uc3RydWN0b3IocHJpdmF0ZSBwZXJtaXNzaW9uczogUGVybWlzc2lvbnMsIHByaXZhdGUgY3VycmVudFVzZXI6IFVzZXJUb2tlbikge31cbiAqXG4gKiAgIGNhbkFjdGl2YXRlKFxuICogICAgIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LFxuICogICAgIHN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90XG4gKiAgICk6IE9ic2VydmFibGU8Ym9vbGVhbnxVcmxUcmVlPnxQcm9taXNlPGJvb2xlYW58VXJsVHJlZT58Ym9vbGVhbnxVcmxUcmVlIHtcbiAqICAgICByZXR1cm4gdGhpcy5wZXJtaXNzaW9ucy5jYW5BY3RpdmF0ZSh0aGlzLmN1cnJlbnRVc2VyLCByb3V0ZS5wYXJhbXMuaWQpO1xuICogICB9XG4gKiB9XG4gKlxuICogQE5nTW9kdWxlKHtcbiAqICAgaW1wb3J0czogW1xuICogICAgIFJvdXRlck1vZHVsZS5mb3JSb290KFtcbiAqICAgICAgIHtcbiAqICAgICAgICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgICAgICAgY29tcG9uZW50OiBUZWFtQ21wLFxuICogICAgICAgICBjYW5BY3RpdmF0ZTogW0NhbkFjdGl2YXRlVGVhbV1cbiAqICAgICAgIH1cbiAqICAgICBdKVxuICogICBdLFxuICogICBwcm92aWRlcnM6IFtDYW5BY3RpdmF0ZVRlYW0sIFVzZXJUb2tlbiwgUGVybWlzc2lvbnNdXG4gKiB9KVxuICogY2xhc3MgQXBwTW9kdWxlIHt9XG4gKiBgYGBcbiAqXG4gKiBZb3UgY2FuIGFsdGVybmF0aXZlbHkgcHJvdmlkZSBhIGZ1bmN0aW9uIHdpdGggdGhlIGBjYW5BY3RpdmF0ZWAgc2lnbmF0dXJlOlxuICpcbiAqIGBgYFxuICogQE5nTW9kdWxlKHtcbiAqICAgaW1wb3J0czogW1xuICogICAgIFJvdXRlck1vZHVsZS5mb3JSb290KFtcbiAqICAgICAgIHtcbiAqICAgICAgICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgICAgICAgY29tcG9uZW50OiBUZWFtQ21wLFxuICogICAgICAgICBjYW5BY3RpdmF0ZTogWydjYW5BY3RpdmF0ZVRlYW0nXVxuICogICAgICAgfVxuICogICAgIF0pXG4gKiAgIF0sXG4gKiAgIHByb3ZpZGVyczogW1xuICogICAgIHtcbiAqICAgICAgIHByb3ZpZGU6ICdjYW5BY3RpdmF0ZVRlYW0nLFxuICogICAgICAgdXNlVmFsdWU6IChyb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgc3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QpID0+IHRydWVcbiAqICAgICB9XG4gKiAgIF1cbiAqIH0pXG4gKiBjbGFzcyBBcHBNb2R1bGUge31cbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5BY3RpdmF0ZSB7XG4gIGNhbkFjdGl2YXRlKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCk6XG4gICAgICBPYnNlcnZhYmxlPGJvb2xlYW58VXJsVHJlZT58UHJvbWlzZTxib29sZWFufFVybFRyZWU+fGJvb2xlYW58VXJsVHJlZTtcbn1cblxuZXhwb3J0IHR5cGUgQ2FuQWN0aXZhdGVGbiA9IChyb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgc3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QpID0+XG4gICAgT2JzZXJ2YWJsZTxib29sZWFufFVybFRyZWU+fCBQcm9taXNlPGJvb2xlYW58VXJsVHJlZT58IGJvb2xlYW4gfCBVcmxUcmVlO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEludGVyZmFjZSB0aGF0IGEgY2xhc3MgY2FuIGltcGxlbWVudCB0byBiZSBhIGd1YXJkIGRlY2lkaW5nIGlmIGEgY2hpbGQgcm91dGUgY2FuIGJlIGFjdGl2YXRlZC5cbiAqIElmIGFsbCBndWFyZHMgcmV0dXJuIGB0cnVlYCwgbmF2aWdhdGlvbiB3aWxsIGNvbnRpbnVlLiBJZiBhbnkgZ3VhcmQgcmV0dXJucyBgZmFsc2VgLFxuICogbmF2aWdhdGlvbiB3aWxsIGJlIGNhbmNlbGxlZC4gSWYgYW55IGd1YXJkIHJldHVybnMgYSBgVXJsVHJlZWAsIGN1cnJlbnQgbmF2aWdhdGlvbiB3aWxsXG4gKiBiZSBjYW5jZWxsZWQgYW5kIGEgbmV3IG5hdmlnYXRpb24gd2lsbCBiZSBraWNrZWQgb2ZmIHRvIHRoZSBgVXJsVHJlZWAgcmV0dXJuZWQgZnJvbSB0aGVcbiAqIGd1YXJkLlxuICogXG4gKiBgYGBcbiAqIGNsYXNzIFVzZXJUb2tlbiB7fVxuICogY2xhc3MgUGVybWlzc2lvbnMge1xuICogICBjYW5BY3RpdmF0ZSh1c2VyOiBVc2VyVG9rZW4sIGlkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAqICAgICByZXR1cm4gdHJ1ZTtcbiAqICAgfVxuICogfVxuICpcbiAqIEBJbmplY3RhYmxlKClcbiAqIGNsYXNzIENhbkFjdGl2YXRlVGVhbSBpbXBsZW1lbnRzIENhbkFjdGl2YXRlQ2hpbGQge1xuICogICBjb25zdHJ1Y3Rvcihwcml2YXRlIHBlcm1pc3Npb25zOiBQZXJtaXNzaW9ucywgcHJpdmF0ZSBjdXJyZW50VXNlcjogVXNlclRva2VuKSB7fVxuICpcbiAqICAgY2FuQWN0aXZhdGVDaGlsZChcbiAqICAgICByb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCxcbiAqICAgICBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdFxuICogICApOiBPYnNlcnZhYmxlPGJvb2xlYW58VXJsVHJlZT58UHJvbWlzZTxib29sZWFufFVybFRyZWU+fGJvb2xlYW58VXJsVHJlZSB7XG4gKiAgICAgcmV0dXJuIHRoaXMucGVybWlzc2lvbnMuY2FuQWN0aXZhdGUodGhpcy5jdXJyZW50VXNlciwgcm91dGUucGFyYW1zLmlkKTtcbiAqICAgfVxuICogfVxuICpcbiAqIEBOZ01vZHVsZSh7XG4gKiAgIGltcG9ydHM6IFtcbiAqICAgICBSb3V0ZXJNb2R1bGUuZm9yUm9vdChbXG4gKiAgICAgICB7XG4gKiAgICAgICAgIHBhdGg6ICdyb290JyxcbiAqICAgICAgICAgY2FuQWN0aXZhdGVDaGlsZDogW0NhbkFjdGl2YXRlVGVhbV0sXG4gKiAgICAgICAgIGNoaWxkcmVuOiBbXG4gKiAgICAgICAgICAge1xuICogICAgICAgICAgICAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgICAgICAgICAgICAgY29tcG9uZW50OiBUZWFtXG4gKiAgICAgICAgICAgfVxuICogICAgICAgICBdXG4gKiAgICAgICB9XG4gKiAgICAgXSlcbiAqICAgXSxcbiAqICAgcHJvdmlkZXJzOiBbQ2FuQWN0aXZhdGVUZWFtLCBVc2VyVG9rZW4sIFBlcm1pc3Npb25zXVxuICogfSlcbiAqIGNsYXNzIEFwcE1vZHVsZSB7fVxuICogYGBgXG4gKlxuICogWW91IGNhbiBhbHRlcm5hdGl2ZWx5IHByb3ZpZGUgYSBmdW5jdGlvbiB3aXRoIHRoZSBgY2FuQWN0aXZhdGVDaGlsZGAgc2lnbmF0dXJlOlxuICpcbiAqIGBgYFxuICogQE5nTW9kdWxlKHtcbiAqICAgaW1wb3J0czogW1xuICogICAgIFJvdXRlck1vZHVsZS5mb3JSb290KFtcbiAqICAgICAgIHtcbiAqICAgICAgICAgcGF0aDogJ3Jvb3QnLFxuICogICAgICAgICBjYW5BY3RpdmF0ZUNoaWxkOiBbJ2NhbkFjdGl2YXRlVGVhbSddLFxuICogICAgICAgICBjaGlsZHJlbjogW1xuICogICAgICAgICAgIHtcbiAqICAgICAgICAgICAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgICAgICAgICAgICBjb21wb25lbnQ6IFRlYW1cbiAqICAgICAgICAgICB9XG4gKiAgICAgICAgIF1cbiAqICAgICAgIH1cbiAqICAgICBdKVxuICogICBdLFxuICogICBwcm92aWRlcnM6IFtcbiAqICAgICB7XG4gKiAgICAgICBwcm92aWRlOiAnY2FuQWN0aXZhdGVUZWFtJyxcbiAqICAgICAgIHVzZVZhbHVlOiAocm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIHN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90KSA9PiB0cnVlXG4gKiAgICAgfVxuICogICBdXG4gKiB9KVxuICogY2xhc3MgQXBwTW9kdWxlIHt9XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuQWN0aXZhdGVDaGlsZCB7XG4gIGNhbkFjdGl2YXRlQ2hpbGQoY2hpbGRSb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgc3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QpOlxuICAgICAgT2JzZXJ2YWJsZTxib29sZWFufFVybFRyZWU+fFByb21pc2U8Ym9vbGVhbnxVcmxUcmVlPnxib29sZWFufFVybFRyZWU7XG59XG5cbmV4cG9ydCB0eXBlIENhbkFjdGl2YXRlQ2hpbGRGbiA9IChjaGlsZFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCkgPT5cbiAgICBPYnNlcnZhYmxlPGJvb2xlYW58VXJsVHJlZT58IFByb21pc2U8Ym9vbGVhbnxVcmxUcmVlPnwgYm9vbGVhbiB8IFVybFRyZWU7XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogSW50ZXJmYWNlIHRoYXQgYSBjbGFzcyBjYW4gaW1wbGVtZW50IHRvIGJlIGEgZ3VhcmQgZGVjaWRpbmcgaWYgYSByb3V0ZSBjYW4gYmUgZGVhY3RpdmF0ZWQuXG4gKiBJZiBhbGwgZ3VhcmRzIHJldHVybiBgdHJ1ZWAsIG5hdmlnYXRpb24gd2lsbCBjb250aW51ZS4gSWYgYW55IGd1YXJkIHJldHVybnMgYGZhbHNlYCxcbiAqIG5hdmlnYXRpb24gd2lsbCBiZSBjYW5jZWxsZWQuIElmIGFueSBndWFyZCByZXR1cm5zIGEgYFVybFRyZWVgLCBjdXJyZW50IG5hdmlnYXRpb24gd2lsbFxuICogYmUgY2FuY2VsbGVkIGFuZCBhIG5ldyBuYXZpZ2F0aW9uIHdpbGwgYmUga2lja2VkIG9mZiB0byB0aGUgYFVybFRyZWVgIHJldHVybmVkIGZyb20gdGhlXG4gKiBndWFyZC5cbiAqIFxuICogYGBgXG4gKiBjbGFzcyBVc2VyVG9rZW4ge31cbiAqIGNsYXNzIFBlcm1pc3Npb25zIHtcbiAqICAgY2FuRGVhY3RpdmF0ZSh1c2VyOiBVc2VyVG9rZW4sIGlkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAqICAgICByZXR1cm4gdHJ1ZTtcbiAqICAgfVxuICogfVxuICpcbiAqIEBJbmplY3RhYmxlKClcbiAqIGNsYXNzIENhbkRlYWN0aXZhdGVUZWFtIGltcGxlbWVudHMgQ2FuRGVhY3RpdmF0ZTxUZWFtQ29tcG9uZW50PiB7XG4gKiAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcGVybWlzc2lvbnM6IFBlcm1pc3Npb25zLCBwcml2YXRlIGN1cnJlbnRVc2VyOiBVc2VyVG9rZW4pIHt9XG4gKlxuICogICBjYW5EZWFjdGl2YXRlKFxuICogICAgIGNvbXBvbmVudDogVGVhbUNvbXBvbmVudCxcbiAqICAgICBjdXJyZW50Um91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsXG4gKiAgICAgY3VycmVudFN0YXRlOiBSb3V0ZXJTdGF0ZVNuYXBzaG90LFxuICogICAgIG5leHRTdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdFxuICogICApOiBPYnNlcnZhYmxlPGJvb2xlYW58VXJsVHJlZT58UHJvbWlzZTxib29sZWFufFVybFRyZWU+fGJvb2xlYW58VXJsVHJlZSB7XG4gKiAgICAgcmV0dXJuIHRoaXMucGVybWlzc2lvbnMuY2FuRGVhY3RpdmF0ZSh0aGlzLmN1cnJlbnRVc2VyLCByb3V0ZS5wYXJhbXMuaWQpO1xuICogICB9XG4gKiB9XG4gKlxuICogQE5nTW9kdWxlKHtcbiAqICAgaW1wb3J0czogW1xuICogICAgIFJvdXRlck1vZHVsZS5mb3JSb290KFtcbiAqICAgICAgIHtcbiAqICAgICAgICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgICAgICAgY29tcG9uZW50OiBUZWFtQ21wLFxuICogICAgICAgICBjYW5EZWFjdGl2YXRlOiBbQ2FuRGVhY3RpdmF0ZVRlYW1dXG4gKiAgICAgICB9XG4gKiAgICAgXSlcbiAqICAgXSxcbiAqICAgcHJvdmlkZXJzOiBbQ2FuRGVhY3RpdmF0ZVRlYW0sIFVzZXJUb2tlbiwgUGVybWlzc2lvbnNdXG4gKiB9KVxuICogY2xhc3MgQXBwTW9kdWxlIHt9XG4gKiBgYGBcbiAqXG4gKiBZb3UgY2FuIGFsdGVybmF0aXZlbHkgcHJvdmlkZSBhIGZ1bmN0aW9uIHdpdGggdGhlIGBjYW5EZWFjdGl2YXRlYCBzaWduYXR1cmU6XG4gKlxuICogYGBgXG4gKiBATmdNb2R1bGUoe1xuICogICBpbXBvcnRzOiBbXG4gKiAgICAgUm91dGVyTW9kdWxlLmZvclJvb3QoW1xuICogICAgICAge1xuICogICAgICAgICBwYXRoOiAndGVhbS86aWQnLFxuICogICAgICAgICBjb21wb25lbnQ6IFRlYW1DbXAsXG4gKiAgICAgICAgIGNhbkRlYWN0aXZhdGU6IFsnY2FuRGVhY3RpdmF0ZVRlYW0nXVxuICogICAgICAgfVxuICogICAgIF0pXG4gKiAgIF0sXG4gKiAgIHByb3ZpZGVyczogW1xuICogICAgIHtcbiAqICAgICAgIHByb3ZpZGU6ICdjYW5EZWFjdGl2YXRlVGVhbScsXG4gKiAgICAgICB1c2VWYWx1ZTogKGNvbXBvbmVudDogVGVhbUNvbXBvbmVudCwgY3VycmVudFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBjdXJyZW50U3RhdGU6XG4gKiBSb3V0ZXJTdGF0ZVNuYXBzaG90LCBuZXh0U3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QpID0+IHRydWVcbiAqICAgICB9XG4gKiAgIF1cbiAqIH0pXG4gKiBjbGFzcyBBcHBNb2R1bGUge31cbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDYW5EZWFjdGl2YXRlPFQ+IHtcbiAgY2FuRGVhY3RpdmF0ZShcbiAgICAgIGNvbXBvbmVudDogVCwgY3VycmVudFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBjdXJyZW50U3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QsXG4gICAgICBuZXh0U3RhdGU/OiBSb3V0ZXJTdGF0ZVNuYXBzaG90KTogT2JzZXJ2YWJsZTxib29sZWFufFVybFRyZWU+fFByb21pc2U8Ym9vbGVhbnxVcmxUcmVlPnxib29sZWFuXG4gICAgICB8VXJsVHJlZTtcbn1cblxuZXhwb3J0IHR5cGUgQ2FuRGVhY3RpdmF0ZUZuPFQ+ID1cbiAgICAoY29tcG9uZW50OiBULCBjdXJyZW50Um91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGN1cnJlbnRTdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCxcbiAgICAgbmV4dFN0YXRlPzogUm91dGVyU3RhdGVTbmFwc2hvdCkgPT5cbiAgICAgICAgT2JzZXJ2YWJsZTxib29sZWFufFVybFRyZWU+fCBQcm9taXNlPGJvb2xlYW58VXJsVHJlZT58IGJvb2xlYW4gfCBVcmxUcmVlO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEludGVyZmFjZSB0aGF0IGNsYXNzIGNhbiBpbXBsZW1lbnQgdG8gYmUgYSBkYXRhIHByb3ZpZGVyLlxuICpcbiAqIGBgYFxuICogY2xhc3MgQmFja2VuZCB7XG4gKiAgIGZldGNoVGVhbShpZDogc3RyaW5nKSB7XG4gKiAgICAgcmV0dXJuICdzb21lVGVhbSc7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBASW5qZWN0YWJsZSgpXG4gKiBjbGFzcyBUZWFtUmVzb2x2ZXIgaW1wbGVtZW50cyBSZXNvbHZlPFRlYW0+IHtcbiAqICAgY29uc3RydWN0b3IocHJpdmF0ZSBiYWNrZW5kOiBCYWNrZW5kKSB7fVxuICpcbiAqICAgcmVzb2x2ZShcbiAqICAgICByb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCxcbiAqICAgICBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdFxuICogICApOiBPYnNlcnZhYmxlPGFueT58UHJvbWlzZTxhbnk+fGFueSB7XG4gKiAgICAgcmV0dXJuIHRoaXMuYmFja2VuZC5mZXRjaFRlYW0ocm91dGUucGFyYW1zLmlkKTtcbiAqICAgfVxuICogfVxuICpcbiAqIEBOZ01vZHVsZSh7XG4gKiAgIGltcG9ydHM6IFtcbiAqICAgICBSb3V0ZXJNb2R1bGUuZm9yUm9vdChbXG4gKiAgICAgICB7XG4gKiAgICAgICAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgICAgICAgIGNvbXBvbmVudDogVGVhbUNtcCxcbiAqICAgICAgICAgcmVzb2x2ZToge1xuICogICAgICAgICAgIHRlYW06IFRlYW1SZXNvbHZlclxuICogICAgICAgICB9XG4gKiAgICAgICB9XG4gKiAgICAgXSlcbiAqICAgXSxcbiAqICAgcHJvdmlkZXJzOiBbVGVhbVJlc29sdmVyXVxuICogfSlcbiAqIGNsYXNzIEFwcE1vZHVsZSB7fVxuICogYGBgXG4gKlxuICogWW91IGNhbiBhbHRlcm5hdGl2ZWx5IHByb3ZpZGUgYSBmdW5jdGlvbiB3aXRoIHRoZSBgcmVzb2x2ZWAgc2lnbmF0dXJlOlxuICpcbiAqIGBgYFxuICogQE5nTW9kdWxlKHtcbiAqICAgaW1wb3J0czogW1xuICogICAgIFJvdXRlck1vZHVsZS5mb3JSb290KFtcbiAqICAgICAgIHtcbiAqICAgICAgICAgcGF0aDogJ3RlYW0vOmlkJyxcbiAqICAgICAgICAgY29tcG9uZW50OiBUZWFtQ21wLFxuICogICAgICAgICByZXNvbHZlOiB7XG4gKiAgICAgICAgICAgdGVhbTogJ3RlYW1SZXNvbHZlcidcbiAqICAgICAgICAgfVxuICogICAgICAgfVxuICogICAgIF0pXG4gKiAgIF0sXG4gKiAgIHByb3ZpZGVyczogW1xuICogICAgIHtcbiAqICAgICAgIHByb3ZpZGU6ICd0ZWFtUmVzb2x2ZXInLFxuICogICAgICAgdXNlVmFsdWU6IChyb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgc3RhdGU6IFJvdXRlclN0YXRlU25hcHNob3QpID0+ICd0ZWFtJ1xuICogICAgIH1cbiAqICAgXVxuICogfSlcbiAqIGNsYXNzIEFwcE1vZHVsZSB7fVxuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlc29sdmU8VD4ge1xuICByZXNvbHZlKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBzdGF0ZTogUm91dGVyU3RhdGVTbmFwc2hvdCk6IE9ic2VydmFibGU8VD58UHJvbWlzZTxUPnxUO1xufVxuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogSW50ZXJmYWNlIHRoYXQgYSBjbGFzcyBjYW4gaW1wbGVtZW50IHRvIGJlIGEgZ3VhcmQgZGVjaWRpbmcgaWYgYSBjaGlsZHJlbiBjYW4gYmUgbG9hZGVkLlxuICpcbiAqIGBgYFxuICogY2xhc3MgVXNlclRva2VuIHt9XG4gKiBjbGFzcyBQZXJtaXNzaW9ucyB7XG4gKiAgIGNhbkxvYWRDaGlsZHJlbih1c2VyOiBVc2VyVG9rZW4sIGlkOiBzdHJpbmcsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pOiBib29sZWFuIHtcbiAqICAgICByZXR1cm4gdHJ1ZTtcbiAqICAgfVxuICogfVxuICpcbiAqIEBJbmplY3RhYmxlKClcbiAqIGNsYXNzIENhbkxvYWRUZWFtU2VjdGlvbiBpbXBsZW1lbnRzIENhbkxvYWQge1xuICogICBjb25zdHJ1Y3Rvcihwcml2YXRlIHBlcm1pc3Npb25zOiBQZXJtaXNzaW9ucywgcHJpdmF0ZSBjdXJyZW50VXNlcjogVXNlclRva2VuKSB7fVxuICpcbiAqICAgY2FuTG9hZChyb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pOiBPYnNlcnZhYmxlPGJvb2xlYW4+fFByb21pc2U8Ym9vbGVhbj58Ym9vbGVhbiB7XG4gKiAgICAgcmV0dXJuIHRoaXMucGVybWlzc2lvbnMuY2FuTG9hZENoaWxkcmVuKHRoaXMuY3VycmVudFVzZXIsIHJvdXRlLCBzZWdtZW50cyk7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBATmdNb2R1bGUoe1xuICogICBpbXBvcnRzOiBbXG4gKiAgICAgUm91dGVyTW9kdWxlLmZvclJvb3QoW1xuICogICAgICAge1xuICogICAgICAgICBwYXRoOiAndGVhbS86aWQnLFxuICogICAgICAgICBjb21wb25lbnQ6IFRlYW1DbXAsXG4gKiAgICAgICAgIGxvYWRDaGlsZHJlbjogJ3RlYW0uanMnLFxuICogICAgICAgICBjYW5Mb2FkOiBbQ2FuTG9hZFRlYW1TZWN0aW9uXVxuICogICAgICAgfVxuICogICAgIF0pXG4gKiAgIF0sXG4gKiAgIHByb3ZpZGVyczogW0NhbkxvYWRUZWFtU2VjdGlvbiwgVXNlclRva2VuLCBQZXJtaXNzaW9uc11cbiAqIH0pXG4gKiBjbGFzcyBBcHBNb2R1bGUge31cbiAqIGBgYFxuICpcbiAqIFlvdSBjYW4gYWx0ZXJuYXRpdmVseSBwcm92aWRlIGEgZnVuY3Rpb24gd2l0aCB0aGUgYGNhbkxvYWRgIHNpZ25hdHVyZTpcbiAqXG4gKiBgYGBcbiAqIEBOZ01vZHVsZSh7XG4gKiAgIGltcG9ydHM6IFtcbiAqICAgICBSb3V0ZXJNb2R1bGUuZm9yUm9vdChbXG4gKiAgICAgICB7XG4gKiAgICAgICAgIHBhdGg6ICd0ZWFtLzppZCcsXG4gKiAgICAgICAgIGNvbXBvbmVudDogVGVhbUNtcCxcbiAqICAgICAgICAgbG9hZENoaWxkcmVuOiAndGVhbS5qcycsXG4gKiAgICAgICAgIGNhbkxvYWQ6IFsnY2FuTG9hZFRlYW1TZWN0aW9uJ11cbiAqICAgICAgIH1cbiAqICAgICBdKVxuICogICBdLFxuICogICBwcm92aWRlcnM6IFtcbiAqICAgICB7XG4gKiAgICAgICBwcm92aWRlOiAnY2FuTG9hZFRlYW1TZWN0aW9uJyxcbiAqICAgICAgIHVzZVZhbHVlOiAocm91dGU6IFJvdXRlLCBzZWdtZW50czogVXJsU2VnbWVudFtdKSA9PiB0cnVlXG4gKiAgICAgfVxuICogICBdXG4gKiB9KVxuICogY2xhc3MgQXBwTW9kdWxlIHt9XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuTG9hZCB7XG4gIGNhbkxvYWQocm91dGU6IFJvdXRlLCBzZWdtZW50czogVXJsU2VnbWVudFtdKTogT2JzZXJ2YWJsZTxib29sZWFuPnxQcm9taXNlPGJvb2xlYW4+fGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIENhbkxvYWRGbiA9IChyb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pID0+XG4gICAgT2JzZXJ2YWJsZTxib29sZWFuPnwgUHJvbWlzZTxib29sZWFuPnwgYm9vbGVhbjtcbiJdfQ==