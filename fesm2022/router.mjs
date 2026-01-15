/**
 * @license Angular v21.2.0-next.0+sha-a792315
 * (c) 2010-2026 Google LLC. https://angular.dev/
 * License: MIT
 */

export { ActivatedRoute, ActivatedRouteSnapshot, ActivationEnd, ActivationStart, BaseRouteReuseStrategy, ChildActivationEnd, ChildActivationStart, ChildrenOutletContexts, DefaultTitleStrategy, DefaultUrlSerializer, EventType, GuardsCheckEnd, GuardsCheckStart, NavigationCancel, NavigationCancellationCode, NavigationEnd, NavigationError, NavigationSkipped, NavigationSkippedCode, NavigationStart, OutletContext, PRIMARY_OUTLET, ROUTER_CONFIGURATION, ROUTER_OUTLET_DATA, ROUTES, RedirectCommand, ResolveEnd, ResolveStart, RouteConfigLoadEnd, RouteConfigLoadStart, RouteReuseStrategy, Router, RouterEvent, RouterOutlet, RouterState, RouterStateSnapshot, RoutesRecognized, Scroll, TitleStrategy, UrlHandlingStrategy, UrlSegment, UrlSegmentGroup, UrlSerializer, UrlTree, convertToParamMap, createUrlTreeFromSnapshot, defaultUrlMatcher, destroyDetachedRouteHandle, isActive, ɵEmptyOutletComponent, afterNextNavigation as ɵafterNextNavigation, loadChildren as ɵloadChildren } from './_router-chunk.mjs';
export { NoPreloading, PreloadAllModules, PreloadingStrategy, ROUTER_INITIALIZER, RouterLink, RouterLinkActive, RouterLink as RouterLinkWithHref, RouterModule, RouterPreloader, provideRouter, provideRoutes, withComponentInputBinding, withDebugTracing, withDisabledInitialNavigation, withEnabledBlockingInitialNavigation, withExperimentalAutoCleanupInjectors, withExperimentalPlatformNavigation, withHashLocation, withInMemoryScrolling, withNavigationErrorHandler, withPreloading, withRouterConfig, withViewTransitions, ROUTER_PROVIDERS as ɵROUTER_PROVIDERS } from './_router_module-chunk.mjs';
import { inject, Version } from '@angular/core';
import '@angular/common';
import 'rxjs';
import 'rxjs/operators';
import '@angular/platform-browser';

function mapToCanMatch(providers) {
  return providers.map(provider => (...params) => inject(provider).canMatch(...params));
}
function mapToCanActivate(providers) {
  return providers.map(provider => (...params) => inject(provider).canActivate(...params));
}
function mapToCanActivateChild(providers) {
  return providers.map(provider => (...params) => inject(provider).canActivateChild(...params));
}
function mapToCanDeactivate(providers) {
  return providers.map(provider => (...params) => inject(provider).canDeactivate(...params));
}
function mapToResolve(provider) {
  return (...params) => inject(provider).resolve(...params);
}

const VERSION = /* @__PURE__ */new Version('21.2.0-next.0+sha-a792315');

export { VERSION, mapToCanActivate, mapToCanActivateChild, mapToCanDeactivate, mapToCanMatch, mapToResolve };
//# sourceMappingURL=router.mjs.map
