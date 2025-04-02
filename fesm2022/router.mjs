/**
 * @license Angular v19.2.4+sha-006ac7f
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */

export { x as ActivatedRoute, y as ActivatedRouteSnapshot, A as ActivationEnd, b as ActivationStart, B as BaseRouteReuseStrategy, C as ChildActivationEnd, d as ChildActivationStart, w as ChildrenOutletContexts, D as DefaultTitleStrategy, J as DefaultUrlSerializer, E as EventType, G as GuardsCheckEnd, e as GuardsCheckStart, N as NavigationCancel, f as NavigationCancellationCode, g as NavigationEnd, h as NavigationError, i as NavigationSkipped, j as NavigationSkippedCode, k as NavigationStart, O as OutletContext, P as PRIMARY_OUTLET, u as ROUTER_CONFIGURATION, a as ROUTER_OUTLET_DATA, v as ROUTES, r as RedirectCommand, l as ResolveEnd, m as ResolveStart, n as RouteConfigLoadEnd, o as RouteConfigLoadStart, s as RouteReuseStrategy, t as Router, p as RouterEvent, R as RouterOutlet, z as RouterState, F as RouterStateSnapshot, q as RoutesRecognized, S as Scroll, T as TitleStrategy, U as UrlHandlingStrategy, K as UrlSegment, L as UrlSegmentGroup, M as UrlSerializer, Q as UrlTree, H as convertToParamMap, c as createUrlTreeFromSnapshot, I as defaultUrlMatcher, ɵ as ɵEmptyOutletComponent, W as ɵafterNextNavigation, V as ɵloadChildren } from './router-LSBBtrLI.mjs';
export { N as NoPreloading, P as PreloadAllModules, n as PreloadingStrategy, l as ROUTER_INITIALIZER, R as RouterLink, a as RouterLinkActive, R as RouterLinkWithHref, m as RouterModule, o as RouterPreloader, p as provideRouter, b as provideRoutes, c as withComponentInputBinding, d as withDebugTracing, e as withDisabledInitialNavigation, f as withEnabledBlockingInitialNavigation, g as withHashLocation, h as withInMemoryScrolling, i as withNavigationErrorHandler, j as withPreloading, k as withRouterConfig, w as withViewTransitions, q as ɵROUTER_PROVIDERS } from './router_module-C0FJ-J6L.mjs';
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
const VERSION = new Version('19.2.4+sha-006ac7f');

export { VERSION, mapToCanActivate, mapToCanActivateChild, mapToCanDeactivate, mapToCanMatch, mapToResolve };
//# sourceMappingURL=router.mjs.map
