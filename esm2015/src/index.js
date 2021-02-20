/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export { RouterLink, RouterLinkWithHref } from './directives/router_link';
export { RouterLinkActive } from './directives/router_link_active';
export { RouterOutlet } from './directives/router_outlet';
export { ActivationEnd, ActivationStart, ChildActivationEnd, ChildActivationStart, GuardsCheckEnd, GuardsCheckStart, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, ResolveEnd, ResolveStart, RouteConfigLoadEnd, RouteConfigLoadStart, RouterEvent, RoutesRecognized, Scroll } from './events';
export { BaseRouteReuseStrategy, RouteReuseStrategy } from './route_reuse_strategy';
export { Router } from './router';
export { ROUTES } from './router_config_loader';
export { provideRoutes, ROUTER_CONFIGURATION, ROUTER_INITIALIZER, RouterModule } from './router_module';
export { ChildrenOutletContexts, OutletContext } from './router_outlet_context';
export { NoPreloading, PreloadAllModules, PreloadingStrategy, RouterPreloader } from './router_preloader';
export { ActivatedRoute, ActivatedRouteSnapshot, RouterState, RouterStateSnapshot } from './router_state';
export { convertToParamMap, PRIMARY_OUTLET } from './shared';
export { UrlHandlingStrategy } from './url_handling_strategy';
export { DefaultUrlSerializer, UrlSegment, UrlSegmentGroup, UrlSerializer, UrlTree } from './url_tree';
export { VERSION } from './version';
export * from './private_export';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUlILE9BQU8sRUFBQyxVQUFVLEVBQUUsa0JBQWtCLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUN4RSxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqRSxPQUFPLEVBQUMsWUFBWSxFQUF1QixNQUFNLDRCQUE0QixDQUFDO0FBQzlFLE9BQU8sRUFBQyxhQUFhLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFTLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFFelQsT0FBTyxFQUFDLHNCQUFzQixFQUF1QixrQkFBa0IsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBQ3ZHLE9BQU8sRUFBMEQsTUFBTSxFQUFxQixNQUFNLFVBQVUsQ0FBQztBQUM3RyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDOUMsT0FBTyxFQUFrQyxhQUFhLEVBQUUsb0JBQW9CLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFDdkksT0FBTyxFQUFDLHNCQUFzQixFQUFFLGFBQWEsRUFBQyxNQUFNLHlCQUF5QixDQUFDO0FBQzlFLE9BQU8sRUFBQyxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsZUFBZSxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDeEcsT0FBTyxFQUFDLGNBQWMsRUFBRSxzQkFBc0IsRUFBRSxXQUFXLEVBQUUsbUJBQW1CLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4RyxPQUFPLEVBQUMsaUJBQWlCLEVBQW9CLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3RSxPQUFPLEVBQUMsbUJBQW1CLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUM1RCxPQUFPLEVBQUMsb0JBQW9CLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ3JHLE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFFbEMsY0FBYyxrQkFBa0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5cbmV4cG9ydCB7RGF0YSwgRGVwcmVjYXRlZExvYWRDaGlsZHJlbiwgTG9hZENoaWxkcmVuLCBMb2FkQ2hpbGRyZW5DYWxsYmFjaywgUXVlcnlQYXJhbXNIYW5kbGluZywgUmVzb2x2ZURhdGEsIFJvdXRlLCBSb3V0ZXMsIFJ1bkd1YXJkc0FuZFJlc29sdmVycywgVXJsTWF0Y2hlciwgVXJsTWF0Y2hSZXN1bHR9IGZyb20gJy4vY29uZmlnJztcbmV4cG9ydCB7Um91dGVyTGluaywgUm91dGVyTGlua1dpdGhIcmVmfSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsnO1xuZXhwb3J0IHtSb3V0ZXJMaW5rQWN0aXZlfSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmtfYWN0aXZlJztcbmV4cG9ydCB7Um91dGVyT3V0bGV0LCBSb3V0ZXJPdXRsZXRDb250cmFjdH0gZnJvbSAnLi9kaXJlY3RpdmVzL3JvdXRlcl9vdXRsZXQnO1xuZXhwb3J0IHtBY3RpdmF0aW9uRW5kLCBBY3RpdmF0aW9uU3RhcnQsIENoaWxkQWN0aXZhdGlvbkVuZCwgQ2hpbGRBY3RpdmF0aW9uU3RhcnQsIEV2ZW50LCBHdWFyZHNDaGVja0VuZCwgR3VhcmRzQ2hlY2tTdGFydCwgTmF2aWdhdGlvbkNhbmNlbCwgTmF2aWdhdGlvbkVuZCwgTmF2aWdhdGlvbkVycm9yLCBOYXZpZ2F0aW9uU3RhcnQsIFJlc29sdmVFbmQsIFJlc29sdmVTdGFydCwgUm91dGVDb25maWdMb2FkRW5kLCBSb3V0ZUNvbmZpZ0xvYWRTdGFydCwgUm91dGVyRXZlbnQsIFJvdXRlc1JlY29nbml6ZWQsIFNjcm9sbH0gZnJvbSAnLi9ldmVudHMnO1xuZXhwb3J0IHtDYW5BY3RpdmF0ZSwgQ2FuQWN0aXZhdGVDaGlsZCwgQ2FuRGVhY3RpdmF0ZSwgQ2FuTG9hZCwgUmVzb2x2ZX0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmV4cG9ydCB7QmFzZVJvdXRlUmV1c2VTdHJhdGVneSwgRGV0YWNoZWRSb3V0ZUhhbmRsZSwgUm91dGVSZXVzZVN0cmF0ZWd5fSBmcm9tICcuL3JvdXRlX3JldXNlX3N0cmF0ZWd5JztcbmV4cG9ydCB7TmF2aWdhdGlvbiwgTmF2aWdhdGlvbkJlaGF2aW9yT3B0aW9ucywgTmF2aWdhdGlvbkV4dHJhcywgUm91dGVyLCBVcmxDcmVhdGlvbk9wdGlvbnN9IGZyb20gJy4vcm91dGVyJztcbmV4cG9ydCB7Uk9VVEVTfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmV4cG9ydCB7RXh0cmFPcHRpb25zLCBJbml0aWFsTmF2aWdhdGlvbiwgcHJvdmlkZVJvdXRlcywgUk9VVEVSX0NPTkZJR1VSQVRJT04sIFJPVVRFUl9JTklUSUFMSVpFUiwgUm91dGVyTW9kdWxlfSBmcm9tICcuL3JvdXRlcl9tb2R1bGUnO1xuZXhwb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzLCBPdXRsZXRDb250ZXh0fSBmcm9tICcuL3JvdXRlcl9vdXRsZXRfY29udGV4dCc7XG5leHBvcnQge05vUHJlbG9hZGluZywgUHJlbG9hZEFsbE1vZHVsZXMsIFByZWxvYWRpbmdTdHJhdGVneSwgUm91dGVyUHJlbG9hZGVyfSBmcm9tICcuL3JvdXRlcl9wcmVsb2FkZXInO1xuZXhwb3J0IHtBY3RpdmF0ZWRSb3V0ZSwgQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgUm91dGVyU3RhdGUsIFJvdXRlclN0YXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmV4cG9ydCB7Y29udmVydFRvUGFyYW1NYXAsIFBhcmFtTWFwLCBQYXJhbXMsIFBSSU1BUllfT1VUTEVUfSBmcm9tICcuL3NoYXJlZCc7XG5leHBvcnQge1VybEhhbmRsaW5nU3RyYXRlZ3l9IGZyb20gJy4vdXJsX2hhbmRsaW5nX3N0cmF0ZWd5JztcbmV4cG9ydCB7RGVmYXVsdFVybFNlcmlhbGl6ZXIsIFVybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cCwgVXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5leHBvcnQge1ZFUlNJT059IGZyb20gJy4vdmVyc2lvbic7XG5cbmV4cG9ydCAqIGZyb20gJy4vcHJpdmF0ZV9leHBvcnQnO1xuIl19