/**
 * @license Angular v20.2.0-next.1+sha-4ac6171
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */

export { ActivatedRoute, ActivatedRouteSnapshot, ActivationEnd, ActivationStart, BaseRouteReuseStrategy, ChildActivationEnd, ChildActivationStart, ChildrenOutletContexts, DefaultTitleStrategy, DefaultUrlSerializer, EventType, GuardsCheckEnd, GuardsCheckStart, NavigationCancel, NavigationCancellationCode, NavigationEnd, NavigationError, NavigationSkipped, NavigationSkippedCode, NavigationStart, OutletContext, PRIMARY_OUTLET, ROUTER_CONFIGURATION, ROUTER_OUTLET_DATA, ROUTES, RedirectCommand, ResolveEnd, ResolveStart, RouteConfigLoadEnd, RouteConfigLoadStart, RouteReuseStrategy, Router, RouterEvent, RouterOutlet, RouterState, RouterStateSnapshot, RoutesRecognized, Scroll, TitleStrategy, UrlHandlingStrategy, UrlSegment, UrlSegmentGroup, UrlSerializer, UrlTree, convertToParamMap, createUrlTreeFromSnapshot, defaultUrlMatcher, ɵEmptyOutletComponent, afterNextNavigation as ɵafterNextNavigation, loadChildren as ɵloadChildren } from './router2.mjs';
export { NoPreloading, PreloadAllModules, PreloadingStrategy, ROUTER_INITIALIZER, RouterLink, RouterLinkActive, RouterLink as RouterLinkWithHref, RouterModule, RouterPreloader, provideRouter, provideRoutes, withComponentInputBinding, withDebugTracing, withDisabledInitialNavigation, withEnabledBlockingInitialNavigation, withHashLocation, withInMemoryScrolling, withNavigationErrorHandler, withPreloading, withRouterConfig, withViewTransitions, ROUTER_PROVIDERS as ɵROUTER_PROVIDERS } from './router_module.mjs';
import { inject, Version } from '@angular/core';
import '@angular/common';
import 'rxjs';
import 'rxjs/operators';
import '@angular/platform-browser';

/**
 * Maps an array of injectable classes with canMatch functions to an array of equivalent
 * `CanMatchFn` for use in a `Route` definition.
 *
 * Usage {@example router/utils/functional_guards.ts region='CanActivate'}
 *
 * @publicApi
 * @see {@link Route}
 */
function mapToCanMatch(providers) {
    return providers.map((provider) => (...params) => inject(provider).canMatch(...params));
}
/**
 * Maps an array of injectable classes with canActivate functions to an array of equivalent
 * `CanActivateFn` for use in a `Route` definition.
 *
 * Usage {@example router/utils/functional_guards.ts region='CanActivate'}
 *
 * @publicApi
 * @see {@link Route}
 */
function mapToCanActivate(providers) {
    return providers.map((provider) => (...params) => inject(provider).canActivate(...params));
}
/**
 * Maps an array of injectable classes with canActivateChild functions to an array of equivalent
 * `CanActivateChildFn` for use in a `Route` definition.
 *
 * Usage {@example router/utils/functional_guards.ts region='CanActivate'}
 *
 * @publicApi
 * @see {@link Route}
 */
function mapToCanActivateChild(providers) {
    return providers.map((provider) => (...params) => inject(provider).canActivateChild(...params));
}
/**
 * Maps an array of injectable classes with canDeactivate functions to an array of equivalent
 * `CanDeactivateFn` for use in a `Route` definition.
 *
 * Usage {@example router/utils/functional_guards.ts region='CanActivate'}
 *
 * @publicApi
 * @see {@link Route}
 */
function mapToCanDeactivate(providers) {
    return providers.map((provider) => (...params) => inject(provider).canDeactivate(...params));
}
/**
 * Maps an injectable class with a resolve function to an equivalent `ResolveFn`
 * for use in a `Route` definition.
 *
 * Usage {@example router/utils/functional_guards.ts region='Resolve'}
 *
 * @publicApi
 * @see {@link Route}
 */
function mapToResolve(provider) {
    return (...params) => inject(provider).resolve(...params);
}

/**
 * @module
 * @description
 * Entry point for all public APIs of the router package.
 */
/**
 * @publicApi
 */
const VERSION = new Version('20.2.0-next.1+sha-4ac6171');

export { VERSION, mapToCanActivate, mapToCanActivateChild, mapToCanDeactivate, mapToCanMatch, mapToResolve };
//# sourceMappingURL=router.mjs.map
