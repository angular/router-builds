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
export { RouterOutlet, ROUTER_OUTLET_DATA } from './directives/router_outlet';
export { ActivationEnd, ActivationStart, ChildActivationEnd, ChildActivationStart, EventType, GuardsCheckEnd, GuardsCheckStart, NavigationCancel, NavigationCancellationCode as NavigationCancellationCode, NavigationEnd, NavigationError, NavigationSkipped, NavigationSkippedCode, NavigationStart, ResolveEnd, ResolveStart, RouteConfigLoadEnd, RouteConfigLoadStart, RouterEvent, RoutesRecognized, Scroll, } from './events';
export { RedirectCommand, } from './models';
export * from './models_deprecated';
export { DefaultTitleStrategy, TitleStrategy } from './page_title_strategy';
export { withViewTransitions, provideRouter, provideRoutes, withComponentInputBinding, withDebugTracing, withDisabledInitialNavigation, withEnabledBlockingInitialNavigation, withHashLocation, withInMemoryScrolling, withNavigationErrorHandler, withPreloading, withRouterConfig, } from './provide_router';
export { BaseRouteReuseStrategy, RouteReuseStrategy, } from './route_reuse_strategy';
export { Router } from './router';
export { ROUTER_CONFIGURATION, } from './router_config';
export { ROUTES } from './router_config_loader';
export { ROUTER_INITIALIZER, RouterModule } from './router_module';
export { ChildrenOutletContexts, OutletContext } from './router_outlet_context';
export { NoPreloading, PreloadAllModules, PreloadingStrategy, RouterPreloader, } from './router_preloader';
export { ActivatedRoute, ActivatedRouteSnapshot, RouterState, RouterStateSnapshot, } from './router_state';
export { convertToParamMap, defaultUrlMatcher, PRIMARY_OUTLET } from './shared';
export { UrlHandlingStrategy } from './url_handling_strategy';
export { DefaultUrlSerializer, UrlSegment, UrlSegmentGroup, UrlSerializer, UrlTree, } from './url_tree';
export { mapToCanActivate, mapToCanActivateChild, mapToCanDeactivate, mapToCanMatch, mapToResolve, } from './utils/functional_guards';
export { VERSION } from './version';
export * from './private_export';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyx5QkFBeUIsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQzVELE9BQU8sRUFBQyxVQUFVLEVBQUUsa0JBQWtCLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUN4RSxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqRSxPQUFPLEVBQUMsWUFBWSxFQUFFLGtCQUFrQixFQUF1QixNQUFNLDRCQUE0QixDQUFDO0FBQ2xHLE9BQU8sRUFDTCxhQUFhLEVBQ2IsZUFBZSxFQUNmLGtCQUFrQixFQUNsQixvQkFBb0IsRUFFcEIsU0FBUyxFQUNULGNBQWMsRUFDZCxnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBQ2hCLDBCQUEwQixJQUFJLDBCQUEwQixFQUN4RCxhQUFhLEVBQ2IsZUFBZSxFQUNmLGlCQUFpQixFQUNqQixxQkFBcUIsRUFDckIsZUFBZSxFQUNmLFVBQVUsRUFDVixZQUFZLEVBQ1osa0JBQWtCLEVBQ2xCLG9CQUFvQixFQUNwQixXQUFXLEVBQ1gsZ0JBQWdCLEVBQ2hCLE1BQU0sR0FDUCxNQUFNLFVBQVUsQ0FBQztBQUNsQixPQUFPLEVBdUJMLGVBQWUsR0FPaEIsTUFBTSxVQUFVLENBQUM7QUFHbEIsY0FBYyxxQkFBcUIsQ0FBQztBQUVwQyxPQUFPLEVBQUMsb0JBQW9CLEVBQUUsYUFBYSxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDMUUsT0FBTyxFQUdMLG1CQUFtQixFQU9uQixhQUFhLEVBQ2IsYUFBYSxFQUtiLHlCQUF5QixFQUN6QixnQkFBZ0IsRUFDaEIsNkJBQTZCLEVBQzdCLG9DQUFvQyxFQUNwQyxnQkFBZ0IsRUFDaEIscUJBQXFCLEVBQ3JCLDBCQUEwQixFQUMxQixjQUFjLEVBQ2QsZ0JBQWdCLEdBQ2pCLE1BQU0sa0JBQWtCLENBQUM7QUFDMUIsT0FBTyxFQUNMLHNCQUFzQixFQUV0QixrQkFBa0IsR0FDbkIsTUFBTSx3QkFBd0IsQ0FBQztBQUNoQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sRUFJTCxvQkFBb0IsR0FFckIsTUFBTSxpQkFBaUIsQ0FBQztBQUN6QixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDOUMsT0FBTyxFQUFDLGtCQUFrQixFQUFFLFlBQVksRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ2pFLE9BQU8sRUFBQyxzQkFBc0IsRUFBRSxhQUFhLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RSxPQUFPLEVBQ0wsWUFBWSxFQUNaLGlCQUFpQixFQUNqQixrQkFBa0IsRUFDbEIsZUFBZSxHQUNoQixNQUFNLG9CQUFvQixDQUFDO0FBQzVCLE9BQU8sRUFDTCxjQUFjLEVBQ2Qsc0JBQXNCLEVBQ3RCLFdBQVcsRUFDWCxtQkFBbUIsR0FDcEIsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QixPQUFPLEVBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQW9CLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNoRyxPQUFPLEVBQUMsbUJBQW1CLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUM1RCxPQUFPLEVBQ0wsb0JBQW9CLEVBRXBCLFVBQVUsRUFDVixlQUFlLEVBQ2YsYUFBYSxFQUNiLE9BQU8sR0FDUixNQUFNLFlBQVksQ0FBQztBQUNwQixPQUFPLEVBQ0wsZ0JBQWdCLEVBQ2hCLHFCQUFxQixFQUNyQixrQkFBa0IsRUFDbEIsYUFBYSxFQUNiLFlBQVksR0FDYixNQUFNLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFFbEMsY0FBYyxrQkFBa0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5leHBvcnQge2NyZWF0ZVVybFRyZWVGcm9tU25hcHNob3R9IGZyb20gJy4vY3JlYXRlX3VybF90cmVlJztcbmV4cG9ydCB7Um91dGVyTGluaywgUm91dGVyTGlua1dpdGhIcmVmfSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmsnO1xuZXhwb3J0IHtSb3V0ZXJMaW5rQWN0aXZlfSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX2xpbmtfYWN0aXZlJztcbmV4cG9ydCB7Um91dGVyT3V0bGV0LCBST1VURVJfT1VUTEVUX0RBVEEsIFJvdXRlck91dGxldENvbnRyYWN0fSBmcm9tICcuL2RpcmVjdGl2ZXMvcm91dGVyX291dGxldCc7XG5leHBvcnQge1xuICBBY3RpdmF0aW9uRW5kLFxuICBBY3RpdmF0aW9uU3RhcnQsXG4gIENoaWxkQWN0aXZhdGlvbkVuZCxcbiAgQ2hpbGRBY3RpdmF0aW9uU3RhcnQsXG4gIEV2ZW50LFxuICBFdmVudFR5cGUsXG4gIEd1YXJkc0NoZWNrRW5kLFxuICBHdWFyZHNDaGVja1N0YXJ0LFxuICBOYXZpZ2F0aW9uQ2FuY2VsLFxuICBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZSBhcyBOYXZpZ2F0aW9uQ2FuY2VsbGF0aW9uQ29kZSxcbiAgTmF2aWdhdGlvbkVuZCxcbiAgTmF2aWdhdGlvbkVycm9yLFxuICBOYXZpZ2F0aW9uU2tpcHBlZCxcbiAgTmF2aWdhdGlvblNraXBwZWRDb2RlLFxuICBOYXZpZ2F0aW9uU3RhcnQsXG4gIFJlc29sdmVFbmQsXG4gIFJlc29sdmVTdGFydCxcbiAgUm91dGVDb25maWdMb2FkRW5kLFxuICBSb3V0ZUNvbmZpZ0xvYWRTdGFydCxcbiAgUm91dGVyRXZlbnQsXG4gIFJvdXRlc1JlY29nbml6ZWQsXG4gIFNjcm9sbCxcbn0gZnJvbSAnLi9ldmVudHMnO1xuZXhwb3J0IHtcbiAgQ2FuQWN0aXZhdGVDaGlsZEZuLFxuICBNYXliZUFzeW5jLFxuICBHdWFyZFJlc3VsdCxcbiAgQ2FuQWN0aXZhdGVGbixcbiAgQ2FuRGVhY3RpdmF0ZUZuLFxuICBDYW5Mb2FkRm4sXG4gIENhbk1hdGNoRm4sXG4gIERhdGEsXG4gIERlZmF1bHRFeHBvcnQsXG4gIExvYWRDaGlsZHJlbixcbiAgTG9hZENoaWxkcmVuQ2FsbGJhY2ssXG4gIE5hdmlnYXRpb25CZWhhdmlvck9wdGlvbnMsXG4gIE9uU2FtZVVybE5hdmlnYXRpb24sXG4gIFF1ZXJ5UGFyYW1zSGFuZGxpbmcsXG4gIFJlZGlyZWN0RnVuY3Rpb24sXG4gIFJlc29sdmVEYXRhLFxuICBSZXNvbHZlRm4sXG4gIFJvdXRlLFxuICBSb3V0ZXMsXG4gIFJ1bkd1YXJkc0FuZFJlc29sdmVycyxcbiAgVXJsTWF0Y2hlcixcbiAgVXJsTWF0Y2hSZXN1bHQsXG4gIFJlZGlyZWN0Q29tbWFuZCxcbiAgQ2FuQWN0aXZhdGUsXG4gIENhbkFjdGl2YXRlQ2hpbGQsXG4gIENhbkRlYWN0aXZhdGUsXG4gIENhbkxvYWQsXG4gIENhbk1hdGNoLFxuICBSZXNvbHZlLFxufSBmcm9tICcuL21vZGVscyc7XG5leHBvcnQge1ZpZXdUcmFuc2l0aW9uSW5mbywgVmlld1RyYW5zaXRpb25zRmVhdHVyZU9wdGlvbnN9IGZyb20gJy4vdXRpbHMvdmlld190cmFuc2l0aW9uJztcblxuZXhwb3J0ICogZnJvbSAnLi9tb2RlbHNfZGVwcmVjYXRlZCc7XG5leHBvcnQge05hdmlnYXRpb24sIE5hdmlnYXRpb25FeHRyYXMsIFVybENyZWF0aW9uT3B0aW9uc30gZnJvbSAnLi9uYXZpZ2F0aW9uX3RyYW5zaXRpb24nO1xuZXhwb3J0IHtEZWZhdWx0VGl0bGVTdHJhdGVneSwgVGl0bGVTdHJhdGVneX0gZnJvbSAnLi9wYWdlX3RpdGxlX3N0cmF0ZWd5JztcbmV4cG9ydCB7XG4gIERlYnVnVHJhY2luZ0ZlYXR1cmUsXG4gIERpc2FibGVkSW5pdGlhbE5hdmlnYXRpb25GZWF0dXJlLFxuICB3aXRoVmlld1RyYW5zaXRpb25zLFxuICBWaWV3VHJhbnNpdGlvbnNGZWF0dXJlLFxuICBFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbkZlYXR1cmUsXG4gIEluaXRpYWxOYXZpZ2F0aW9uRmVhdHVyZSxcbiAgSW5NZW1vcnlTY3JvbGxpbmdGZWF0dXJlLFxuICBOYXZpZ2F0aW9uRXJyb3JIYW5kbGVyRmVhdHVyZSxcbiAgUHJlbG9hZGluZ0ZlYXR1cmUsXG4gIHByb3ZpZGVSb3V0ZXIsXG4gIHByb3ZpZGVSb3V0ZXMsXG4gIFJvdXRlckNvbmZpZ3VyYXRpb25GZWF0dXJlLFxuICBSb3V0ZXJGZWF0dXJlLFxuICBSb3V0ZXJGZWF0dXJlcyxcbiAgUm91dGVySGFzaExvY2F0aW9uRmVhdHVyZSxcbiAgd2l0aENvbXBvbmVudElucHV0QmluZGluZyxcbiAgd2l0aERlYnVnVHJhY2luZyxcbiAgd2l0aERpc2FibGVkSW5pdGlhbE5hdmlnYXRpb24sXG4gIHdpdGhFbmFibGVkQmxvY2tpbmdJbml0aWFsTmF2aWdhdGlvbixcbiAgd2l0aEhhc2hMb2NhdGlvbixcbiAgd2l0aEluTWVtb3J5U2Nyb2xsaW5nLFxuICB3aXRoTmF2aWdhdGlvbkVycm9ySGFuZGxlcixcbiAgd2l0aFByZWxvYWRpbmcsXG4gIHdpdGhSb3V0ZXJDb25maWcsXG59IGZyb20gJy4vcHJvdmlkZV9yb3V0ZXInO1xuZXhwb3J0IHtcbiAgQmFzZVJvdXRlUmV1c2VTdHJhdGVneSxcbiAgRGV0YWNoZWRSb3V0ZUhhbmRsZSxcbiAgUm91dGVSZXVzZVN0cmF0ZWd5LFxufSBmcm9tICcuL3JvdXRlX3JldXNlX3N0cmF0ZWd5JztcbmV4cG9ydCB7Um91dGVyfSBmcm9tICcuL3JvdXRlcic7XG5leHBvcnQge1xuICBFeHRyYU9wdGlvbnMsXG4gIEluaXRpYWxOYXZpZ2F0aW9uLFxuICBJbk1lbW9yeVNjcm9sbGluZ09wdGlvbnMsXG4gIFJPVVRFUl9DT05GSUdVUkFUSU9OLFxuICBSb3V0ZXJDb25maWdPcHRpb25zLFxufSBmcm9tICcuL3JvdXRlcl9jb25maWcnO1xuZXhwb3J0IHtST1VURVN9IGZyb20gJy4vcm91dGVyX2NvbmZpZ19sb2FkZXInO1xuZXhwb3J0IHtST1VURVJfSU5JVElBTElaRVIsIFJvdXRlck1vZHVsZX0gZnJvbSAnLi9yb3V0ZXJfbW9kdWxlJztcbmV4cG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0cywgT3V0bGV0Q29udGV4dH0gZnJvbSAnLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuZXhwb3J0IHtcbiAgTm9QcmVsb2FkaW5nLFxuICBQcmVsb2FkQWxsTW9kdWxlcyxcbiAgUHJlbG9hZGluZ1N0cmF0ZWd5LFxuICBSb3V0ZXJQcmVsb2FkZXIsXG59IGZyb20gJy4vcm91dGVyX3ByZWxvYWRlcic7XG5leHBvcnQge1xuICBBY3RpdmF0ZWRSb3V0ZSxcbiAgQWN0aXZhdGVkUm91dGVTbmFwc2hvdCxcbiAgUm91dGVyU3RhdGUsXG4gIFJvdXRlclN0YXRlU25hcHNob3QsXG59IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmV4cG9ydCB7Y29udmVydFRvUGFyYW1NYXAsIGRlZmF1bHRVcmxNYXRjaGVyLCBQYXJhbU1hcCwgUGFyYW1zLCBQUklNQVJZX09VVExFVH0gZnJvbSAnLi9zaGFyZWQnO1xuZXhwb3J0IHtVcmxIYW5kbGluZ1N0cmF0ZWd5fSBmcm9tICcuL3VybF9oYW5kbGluZ19zdHJhdGVneSc7XG5leHBvcnQge1xuICBEZWZhdWx0VXJsU2VyaWFsaXplcixcbiAgSXNBY3RpdmVNYXRjaE9wdGlvbnMsXG4gIFVybFNlZ21lbnQsXG4gIFVybFNlZ21lbnRHcm91cCxcbiAgVXJsU2VyaWFsaXplcixcbiAgVXJsVHJlZSxcbn0gZnJvbSAnLi91cmxfdHJlZSc7XG5leHBvcnQge1xuICBtYXBUb0NhbkFjdGl2YXRlLFxuICBtYXBUb0NhbkFjdGl2YXRlQ2hpbGQsXG4gIG1hcFRvQ2FuRGVhY3RpdmF0ZSxcbiAgbWFwVG9DYW5NYXRjaCxcbiAgbWFwVG9SZXNvbHZlLFxufSBmcm9tICcuL3V0aWxzL2Z1bmN0aW9uYWxfZ3VhcmRzJztcbmV4cG9ydCB7VkVSU0lPTn0gZnJvbSAnLi92ZXJzaW9uJztcblxuZXhwb3J0ICogZnJvbSAnLi9wcml2YXRlX2V4cG9ydCc7XG4iXX0=