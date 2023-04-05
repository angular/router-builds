/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export { createUrlTreeFromSnapshot } from './create_url_tree';
export { RouterLink, RouterLinkWithHref } from './directives/router_link';
export { RouterLinkActive } from './directives/router_link_active';
export { RouterOutlet } from './directives/router_outlet';
export { ActivationEnd, ActivationStart, ChildActivationEnd, ChildActivationStart, GuardsCheckEnd, GuardsCheckStart, NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, NavigationStart, ResolveEnd, ResolveStart, RouteConfigLoadEnd, RouteConfigLoadStart, RouterEvent, RoutesRecognized, Scroll } from './events';
export * from './models_deprecated';
export { DefaultTitleStrategy, TitleStrategy } from './page_title_strategy';
export { provideRouter, provideRoutes, withComponentInputBinding, withDebugTracing, withDisabledInitialNavigation, withEnabledBlockingInitialNavigation, withHashLocation, withInMemoryScrolling, withNavigationErrorHandler, withPreloading, withRouterConfig } from './provide_router';
export { BaseRouteReuseStrategy, RouteReuseStrategy } from './route_reuse_strategy';
export { Router } from './router';
export { ROUTER_CONFIGURATION } from './router_config';
export { ROUTES } from './router_config_loader';
export { ROUTER_INITIALIZER, RouterModule } from './router_module';
export { ChildrenOutletContexts, OutletContext } from './router_outlet_context';
export { NoPreloading, PreloadAllModules, PreloadingStrategy, RouterPreloader } from './router_preloader';
export { ActivatedRoute, ActivatedRouteSnapshot, RouterState, RouterStateSnapshot } from './router_state';
export { convertToParamMap, defaultUrlMatcher, PRIMARY_OUTLET } from './shared';
export { UrlHandlingStrategy } from './url_handling_strategy';
export { DefaultUrlSerializer, UrlSegment, UrlSegmentGroup, UrlSerializer, UrlTree } from './url_tree';
export { mapToCanActivate, mapToCanActivateChild, mapToCanDeactivate, mapToCanMatch, mapToResolve } from './utils/functional_guards';
export { VERSION } from './version';
export * from './private_export';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUdILE9BQU8sRUFBQyx5QkFBeUIsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQzVELE9BQU8sRUFBQyxVQUFVLEVBQUUsa0JBQWtCLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUN4RSxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqRSxPQUFPLEVBQUMsWUFBWSxFQUF1QixNQUFNLDRCQUE0QixDQUFDO0FBQzlFLE9BQU8sRUFBQyxhQUFhLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFvQixjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQTRELGFBQWEsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQXlCLGVBQWUsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFFeGEsY0FBYyxxQkFBcUIsQ0FBQztBQUVwQyxPQUFPLEVBQUMsb0JBQW9CLEVBQUUsYUFBYSxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDMUUsT0FBTyxFQUF1TSxhQUFhLEVBQUUsYUFBYSxFQUF3Rix5QkFBeUIsRUFBRSxnQkFBZ0IsRUFBRSw2QkFBNkIsRUFBRSxvQ0FBb0MsRUFBRSxnQkFBZ0IsRUFBRSxxQkFBcUIsRUFBRSwwQkFBMEIsRUFBRSxjQUFjLEVBQUUsZ0JBQWdCLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUNuakIsT0FBTyxFQUFDLHNCQUFzQixFQUF1QixrQkFBa0IsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBQ3ZHLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDaEMsT0FBTyxFQUE0RCxvQkFBb0IsRUFBc0IsTUFBTSxpQkFBaUIsQ0FBQztBQUNySSxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDOUMsT0FBTyxFQUFDLGtCQUFrQixFQUFFLFlBQVksRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ2pFLE9BQU8sRUFBQyxzQkFBc0IsRUFBRSxhQUFhLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RSxPQUFPLEVBQUMsWUFBWSxFQUFFLGlCQUFpQixFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3hHLE9BQU8sRUFBQyxjQUFjLEVBQUUsc0JBQXNCLEVBQUUsV0FBVyxFQUFFLG1CQUFtQixFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEcsT0FBTyxFQUFDLGlCQUFpQixFQUFFLGlCQUFpQixFQUFvQixjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDaEcsT0FBTyxFQUFDLG1CQUFtQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDNUQsT0FBTyxFQUFDLG9CQUFvQixFQUF3QixVQUFVLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDM0gsT0FBTyxFQUFDLGdCQUFnQixFQUFFLHFCQUFxQixFQUFFLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUNuSSxPQUFPLEVBQUMsT0FBTyxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBRWxDLGNBQWMsa0JBQWtCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuXG5leHBvcnQge2NyZWF0ZVVybFRyZWVGcm9tU25hcHNob3R9IGZyb20gJy4vY3JlYXRlX3VybF90cmVlJztcbmV4cG9ydCB7Um91dGVyTGluaywgUm91dGVyTGlua1dpdGhIcmVmfSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsnO1xuZXhwb3J0IHtSb3V0ZXJMaW5rQWN0aXZlfSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmtfYWN0aXZlJztcbmV4cG9ydCB7Um91dGVyT3V0bGV0LCBSb3V0ZXJPdXRsZXRDb250cmFjdH0gZnJvbSAnLi9kaXJlY3RpdmVzL3JvdXRlcl9vdXRsZXQnO1xuZXhwb3J0IHtBY3RpdmF0aW9uRW5kLCBBY3RpdmF0aW9uU3RhcnQsIENoaWxkQWN0aXZhdGlvbkVuZCwgQ2hpbGRBY3RpdmF0aW9uU3RhcnQsIEV2ZW50LCBFdmVudFR5cGUsIEd1YXJkc0NoZWNrRW5kLCBHdWFyZHNDaGVja1N0YXJ0LCBOYXZpZ2F0aW9uQ2FuY2VsLCBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZSBhcyBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZSwgTmF2aWdhdGlvbkVuZCwgTmF2aWdhdGlvbkVycm9yLCBOYXZpZ2F0aW9uU2tpcHBlZCwgTmF2aWdhdGlvblNraXBwZWRDb2RlLCBOYXZpZ2F0aW9uU3RhcnQsIFJlc29sdmVFbmQsIFJlc29sdmVTdGFydCwgUm91dGVDb25maWdMb2FkRW5kLCBSb3V0ZUNvbmZpZ0xvYWRTdGFydCwgUm91dGVyRXZlbnQsIFJvdXRlc1JlY29nbml6ZWQsIFNjcm9sbH0gZnJvbSAnLi9ldmVudHMnO1xuZXhwb3J0IHtDYW5BY3RpdmF0ZUNoaWxkRm4sIENhbkFjdGl2YXRlRm4sIENhbkRlYWN0aXZhdGVGbiwgQ2FuTG9hZEZuLCBDYW5NYXRjaEZuLCBEYXRhLCBEZWZhdWx0RXhwb3J0LCBMb2FkQ2hpbGRyZW4sIExvYWRDaGlsZHJlbkNhbGxiYWNrLCBOYXZpZ2F0aW9uQmVoYXZpb3JPcHRpb25zLCBPblNhbWVVcmxOYXZpZ2F0aW9uLCBRdWVyeVBhcmFtc0hhbmRsaW5nLCBSZXNvbHZlRGF0YSwgUmVzb2x2ZUZuLCBSb3V0ZSwgUm91dGVzLCBSdW5HdWFyZHNBbmRSZXNvbHZlcnMsIFVybE1hdGNoZXIsIFVybE1hdGNoUmVzdWx0fSBmcm9tICcuL21vZGVscyc7XG5leHBvcnQgKiBmcm9tICcuL21vZGVsc19kZXByZWNhdGVkJztcbmV4cG9ydCB7TmF2aWdhdGlvbiwgTmF2aWdhdGlvbkV4dHJhcywgVXJsQ3JlYXRpb25PcHRpb25zfSBmcm9tICcuL25hdmlnYXRpb25fdHJhbnNpdGlvbic7XG5leHBvcnQge0RlZmF1bHRUaXRsZVN0cmF0ZWd5LCBUaXRsZVN0cmF0ZWd5fSBmcm9tICcuL3BhZ2VfdGl0bGVfc3RyYXRlZ3knO1xuZXhwb3J0IHtEZWJ1Z1RyYWNpbmdGZWF0dXJlLCBEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZSwgRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb25GZWF0dXJlLCBJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUsIEluTWVtb3J5U2Nyb2xsaW5nRmVhdHVyZSwgTmF2aWdhdGlvbkVycm9ySGFuZGxlckZlYXR1cmUsIFByZWxvYWRpbmdGZWF0dXJlLCBwcm92aWRlUm91dGVyLCBwcm92aWRlUm91dGVzLCBSb3V0ZXJDb25maWd1cmF0aW9uRmVhdHVyZSwgUm91dGVyRmVhdHVyZSwgUm91dGVyRmVhdHVyZXMsIFJvdXRlckhhc2hMb2NhdGlvbkZlYXR1cmUsIHdpdGhDb21wb25lbnRJbnB1dEJpbmRpbmcsIHdpdGhEZWJ1Z1RyYWNpbmcsIHdpdGhEaXNhYmxlZEluaXRpYWxOYXZpZ2F0aW9uLCB3aXRoRW5hYmxlZEJsb2NraW5nSW5pdGlhbE5hdmlnYXRpb24sIHdpdGhIYXNoTG9jYXRpb24sIHdpdGhJbk1lbW9yeVNjcm9sbGluZywgd2l0aE5hdmlnYXRpb25FcnJvckhhbmRsZXIsIHdpdGhQcmVsb2FkaW5nLCB3aXRoUm91dGVyQ29uZmlnfSBmcm9tICcuL3Byb3ZpZGVfcm91dGVyJztcbmV4cG9ydCB7QmFzZVJvdXRlUmV1c2VTdHJhdGVneSwgRGV0YWNoZWRSb3V0ZUhhbmRsZSwgUm91dGVSZXVzZVN0cmF0ZWd5fSBmcm9tICcuL3JvdXRlX3JldXNlX3N0cmF0ZWd5JztcbmV4cG9ydCB7Um91dGVyfSBmcm9tICcuL3JvdXRlcic7XG5leHBvcnQge0V4dHJhT3B0aW9ucywgSW5pdGlhbE5hdmlnYXRpb24sIEluTWVtb3J5U2Nyb2xsaW5nT3B0aW9ucywgUk9VVEVSX0NPTkZJR1VSQVRJT04sIFJvdXRlckNvbmZpZ09wdGlvbnN9IGZyb20gJy4vcm91dGVyX2NvbmZpZyc7XG5leHBvcnQge1JPVVRFU30gZnJvbSAnLi9yb3V0ZXJfY29uZmlnX2xvYWRlcic7XG5leHBvcnQge1JPVVRFUl9JTklUSUFMSVpFUiwgUm91dGVyTW9kdWxlfSBmcm9tICcuL3JvdXRlcl9tb2R1bGUnO1xuZXhwb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzLCBPdXRsZXRDb250ZXh0fSBmcm9tICcuL3JvdXRlcl9vdXRsZXRfY29udGV4dCc7XG5leHBvcnQge05vUHJlbG9hZGluZywgUHJlbG9hZEFsbE1vZHVsZXMsIFByZWxvYWRpbmdTdHJhdGVneSwgUm91dGVyUHJlbG9hZGVyfSBmcm9tICcuL3JvdXRlcl9wcmVsb2FkZXInO1xuZXhwb3J0IHtBY3RpdmF0ZWRSb3V0ZSwgQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgUm91dGVyU3RhdGUsIFJvdXRlclN0YXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmV4cG9ydCB7Y29udmVydFRvUGFyYW1NYXAsIGRlZmF1bHRVcmxNYXRjaGVyLCBQYXJhbU1hcCwgUGFyYW1zLCBQUklNQVJZX09VVExFVH0gZnJvbSAnLi9zaGFyZWQnO1xuZXhwb3J0IHtVcmxIYW5kbGluZ1N0cmF0ZWd5fSBmcm9tICcuL3VybF9oYW5kbGluZ19zdHJhdGVneSc7XG5leHBvcnQge0RlZmF1bHRVcmxTZXJpYWxpemVyLCBJc0FjdGl2ZU1hdGNoT3B0aW9ucywgVXJsU2VnbWVudCwgVXJsU2VnbWVudEdyb3VwLCBVcmxTZXJpYWxpemVyLCBVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcbmV4cG9ydCB7bWFwVG9DYW5BY3RpdmF0ZSwgbWFwVG9DYW5BY3RpdmF0ZUNoaWxkLCBtYXBUb0NhbkRlYWN0aXZhdGUsIG1hcFRvQ2FuTWF0Y2gsIG1hcFRvUmVzb2x2ZX0gZnJvbSAnLi91dGlscy9mdW5jdGlvbmFsX2d1YXJkcyc7XG5leHBvcnQge1ZFUlNJT059IGZyb20gJy4vdmVyc2lvbic7XG5cbmV4cG9ydCAqIGZyb20gJy4vcHJpdmF0ZV9leHBvcnQnO1xuIl19