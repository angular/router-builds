/**
 * @license Angular v21.0.0-next.8+sha-9b9ae42
 * (c) 2010-2025 Google LLC. https://angular.dev/
 * License: MIT
 */

import { ActivatedRouteSnapshot, Params, UrlTree, RouterOutletContract, ActivatedRoute, RouterStateSnapshot, Route, LoadedRouterConfig, Router, Routes, InMemoryScrollingOptions, RouterConfigOptions, NavigationError, RedirectCommand, CanMatch, CanMatchFn, CanActivate, CanActivateFn, CanActivateChild, CanActivateChildFn, CanDeactivate, CanDeactivateFn, Resolve, ResolveFn, Event } from './_router_module-chunk.js';
export { ActivationEnd, ActivationStart, BaseRouteReuseStrategy, CanLoad, CanLoadFn, ChildActivationEnd, ChildActivationStart, Data, DefaultExport, DefaultUrlSerializer, DeprecatedGuard, DeprecatedResolve, DetachedRouteHandle, EventType, ExtraOptions, GuardResult, GuardsCheckEnd, GuardsCheckStart, InitialNavigation, IsActiveMatchOptions, LoadChildren, LoadChildrenCallback, MaybeAsync, Navigation, NavigationBehaviorOptions, NavigationCancel, NavigationCancellationCode, NavigationEnd, NavigationExtras, NavigationSkipped, NavigationSkippedCode, NavigationStart, OnSameUrlNavigation, PRIMARY_OUTLET, ParamMap, QueryParamsHandling, ROUTER_CONFIGURATION, ROUTER_INITIALIZER, ROUTER_OUTLET_DATA, RedirectFunction, ResolveData, ResolveEnd, ResolveStart, RouteConfigLoadEnd, RouteConfigLoadStart, RouteReuseStrategy, RouterEvent, RouterLink, RouterLinkActive, RouterLink as RouterLinkWithHref, RouterModule, RouterOutlet, RouterState, RoutesRecognized, RunGuardsAndResolvers, Scroll, UrlCreationOptions, UrlMatchResult, UrlMatcher, UrlSegment, UrlSegmentGroup, UrlSerializer, convertToParamMap, defaultUrlMatcher, ɵEmptyOutletComponent, ROUTER_PROVIDERS as ɵROUTER_PROVIDERS, RestoredState as ɵRestoredState } from './_router_module-chunk.js';
import { Title } from '@angular/platform-browser';
import * as i0 from '@angular/core';
import { ComponentRef, EnvironmentInjector, InjectionToken, Compiler, Injector, Type, OnDestroy, EnvironmentProviders, Provider, Version } from '@angular/core';
import { Observable } from 'rxjs';
import '@angular/common';

/**
 * Creates a `UrlTree` relative to an `ActivatedRouteSnapshot`.
 *
 * @publicApi
 *
 *
 * @param relativeTo The `ActivatedRouteSnapshot` to apply the commands to
 * @param commands An array of URL fragments with which to construct the new URL tree.
 * If the path is static, can be the literal URL string. For a dynamic path, pass an array of path
 * segments, followed by the parameters for each segment.
 * The fragments are applied to the one provided in the `relativeTo` parameter.
 * @param queryParams The query parameters for the `UrlTree`. `null` if the `UrlTree` does not have
 *     any query parameters.
 * @param fragment The fragment for the `UrlTree`. `null` if the `UrlTree` does not have a fragment.
 *
 * @usageNotes
 *
 * ```ts
 * // create /team/33/user/11
 * createUrlTreeFromSnapshot(snapshot, ['/team', 33, 'user', 11]);
 *
 * // create /team/33;expand=true/user/11
 * createUrlTreeFromSnapshot(snapshot, ['/team', 33, {expand: true}, 'user', 11]);
 *
 * // you can collapse static segments like this (this works only with the first passed-in value):
 * createUrlTreeFromSnapshot(snapshot, ['/team/33/user', userId]);
 *
 * // If the first segment can contain slashes, and you do not want the router to split it,
 * // you can do the following:
 * createUrlTreeFromSnapshot(snapshot, [{segmentPath: '/one/two'}]);
 *
 * // create /team/33/(user/11//right:chat)
 * createUrlTreeFromSnapshot(snapshot, ['/team', 33, {outlets: {primary: 'user/11', right:
 * 'chat'}}], null, null);
 *
 * // remove the right secondary node
 * createUrlTreeFromSnapshot(snapshot, ['/team', 33, {outlets: {primary: 'user/11', right: null}}]);
 *
 * // For the examples below, assume the current URL is for the `/team/33/user/11` and the
 * `ActivatedRouteSnapshot` points to `user/11`:
 *
 * // navigate to /team/33/user/11/details
 * createUrlTreeFromSnapshot(snapshot, ['details']);
 *
 * // navigate to /team/33/user/22
 * createUrlTreeFromSnapshot(snapshot, ['../22']);
 *
 * // navigate to /team/44/user/22
 * createUrlTreeFromSnapshot(snapshot, ['../../team/44/user/22']);
 * ```
 */
declare function createUrlTreeFromSnapshot(relativeTo: ActivatedRouteSnapshot, commands: readonly any[], queryParams?: Params | null, fragment?: string | null): UrlTree;

/**
 * Store contextual information about a `RouterOutlet`
 *
 * @publicApi
 */
declare class OutletContext {
    private readonly rootInjector;
    outlet: RouterOutletContract | null;
    route: ActivatedRoute | null;
    children: ChildrenOutletContexts;
    attachRef: ComponentRef<any> | null;
    get injector(): EnvironmentInjector;
    constructor(rootInjector: EnvironmentInjector);
}
/**
 * Store contextual information about the children (= nested) `RouterOutlet`
 *
 * @publicApi
 */
declare class ChildrenOutletContexts {
    private rootInjector;
    private contexts;
    /** @docs-private */
    constructor(rootInjector: EnvironmentInjector);
    /** Called when a `RouterOutlet` directive is instantiated */
    onChildOutletCreated(childName: string, outlet: RouterOutletContract): void;
    /**
     * Called when a `RouterOutlet` directive is destroyed.
     * We need to keep the context as the outlet could be destroyed inside a NgIf and might be
     * re-created later.
     */
    onChildOutletDestroyed(childName: string): void;
    /**
     * Called when the corresponding route is deactivated during navigation.
     * Because the component get destroyed, all children outlet are destroyed.
     */
    onOutletDeactivated(): Map<string, OutletContext>;
    onOutletReAttached(contexts: Map<string, OutletContext>): void;
    getOrCreateContext(childName: string): OutletContext;
    getContext(childName: string): OutletContext | null;
    static ɵfac: i0.ɵɵFactoryDeclaration<ChildrenOutletContexts, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<ChildrenOutletContexts>;
}

/**
 * Options to configure the View Transitions integration in the Router.
 *
 * @developerPreview 20.0
 * @see withViewTransitions
 */
interface ViewTransitionsFeatureOptions {
    /**
     * Skips the very first call to `startViewTransition`. This can be useful for disabling the
     * animation during the application's initial loading phase.
     */
    skipInitialTransition?: boolean;
    /**
     * A function to run after the `ViewTransition` is created.
     *
     * This function is run in an injection context and can use `inject`.
     */
    onViewTransitionCreated?: (transitionInfo: ViewTransitionInfo) => void;
}
/**
 * The information passed to the `onViewTransitionCreated` function provided in the
 * `withViewTransitions` feature options.
 *
 * @developerPreview 20.0
 */
interface ViewTransitionInfo {
    /**
     * The `ViewTransition` returned by the call to `startViewTransition`.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/ViewTransition
     */
    transition: ViewTransition;
    /**
     * The `ActivatedRouteSnapshot` that the navigation is transitioning from.
     */
    from: ActivatedRouteSnapshot;
    /**
     * The `ActivatedRouteSnapshot` that the navigation is transitioning to.
     */
    to: ActivatedRouteSnapshot;
}

/**
 * Provides a strategy for setting the page title after a router navigation.
 *
 * The built-in implementation traverses the router state snapshot and finds the deepest primary
 * outlet with `title` property. Given the `Routes` below, navigating to
 * `/base/child(popup:aux)` would result in the document title being set to "child".
 * ```ts
 * [
 *   {path: 'base', title: 'base', children: [
 *     {path: 'child', title: 'child'},
 *   ],
 *   {path: 'aux', outlet: 'popup', title: 'popupTitle'}
 * ]
 * ```
 *
 * This class can be used as a base class for custom title strategies. That is, you can create your
 * own class that extends the `TitleStrategy`. Note that in the above example, the `title`
 * from the named outlet is never used. However, a custom strategy might be implemented to
 * incorporate titles in named outlets.
 *
 * @publicApi
 * @see [Page title guide](guide/routing/define-routes#using-titlestrategy-for-page-titles)
 */
declare abstract class TitleStrategy {
    /** Performs the application title update. */
    abstract updateTitle(snapshot: RouterStateSnapshot): void;
    /**
     * @returns The `title` of the deepest primary route.
     */
    buildTitle(snapshot: RouterStateSnapshot): string | undefined;
    /**
     * Given an `ActivatedRouteSnapshot`, returns the final value of the
     * `Route.title` property, which can either be a static string or a resolved value.
     */
    getResolvedTitleForRoute(snapshot: ActivatedRouteSnapshot): any;
    static ɵfac: i0.ɵɵFactoryDeclaration<TitleStrategy, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<TitleStrategy>;
}
/**
 * The default `TitleStrategy` used by the router that updates the title using the `Title` service.
 */
declare class DefaultTitleStrategy extends TitleStrategy {
    readonly title: Title;
    constructor(title: Title);
    /**
     * Sets the title of the browser to the given value.
     *
     * @param title The `pageTitle` from the deepest primary route.
     */
    updateTitle(snapshot: RouterStateSnapshot): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<DefaultTitleStrategy, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<DefaultTitleStrategy>;
}

/**
 * The DI token for a router configuration.
 *
 * `ROUTES` is a low level API for router configuration via dependency injection.
 *
 * We recommend that in almost all cases to use higher level APIs such as `RouterModule.forRoot()`,
 * `provideRouter`, or `Router.resetConfig()`.
 *
 * @publicApi
 */
declare const ROUTES: InjectionToken<Route[][]>;
declare class RouterConfigLoader {
    private componentLoaders;
    private childrenLoaders;
    onLoadStartListener?: (r: Route) => void;
    onLoadEndListener?: (r: Route) => void;
    private readonly compiler;
    loadComponent(injector: EnvironmentInjector, route: Route): Promise<Type<unknown>>;
    loadChildren(parentInjector: Injector, route: Route): Promise<LoadedRouterConfig>;
    static ɵfac: i0.ɵɵFactoryDeclaration<RouterConfigLoader, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<RouterConfigLoader>;
}
/**
 * Executes a `route.loadChildren` callback and converts the result to an array of child routes and
 * an injector if that callback returned a module.
 *
 * This function is used for the route discovery during prerendering
 * in @angular-devkit/build-angular. If there are any updates to the contract here, it will require
 * an update to the extractor.
 */
declare function loadChildren(route: Route, compiler: Compiler, parentInjector: Injector, onLoadEndListener?: (r: Route) => void): Promise<LoadedRouterConfig>;

/**
 * @description
 *
 * Provides a preloading strategy.
 *
 * @publicApi
 */
declare abstract class PreloadingStrategy {
    abstract preload(route: Route, fn: () => Observable<any>): Observable<any>;
}
/**
 * @description
 *
 * Provides a preloading strategy that preloads all modules as quickly as possible.
 *
 * ```ts
 * RouterModule.forRoot(ROUTES, {preloadingStrategy: PreloadAllModules})
 * ```
 *
 * @publicApi
 */
declare class PreloadAllModules implements PreloadingStrategy {
    preload(route: Route, fn: () => Observable<any>): Observable<any>;
    static ɵfac: i0.ɵɵFactoryDeclaration<PreloadAllModules, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<PreloadAllModules>;
}
/**
 * @description
 *
 * Provides a preloading strategy that does not preload any modules.
 *
 * This strategy is enabled by default.
 *
 * @publicApi
 */
declare class NoPreloading implements PreloadingStrategy {
    preload(route: Route, fn: () => Observable<any>): Observable<any>;
    static ɵfac: i0.ɵɵFactoryDeclaration<NoPreloading, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<NoPreloading>;
}
/**
 * The preloader optimistically loads all router configurations to
 * make navigations into lazily-loaded sections of the application faster.
 *
 * The preloader runs in the background. When the router bootstraps, the preloader
 * starts listening to all navigation events. After every such event, the preloader
 * will check if any configurations can be loaded lazily.
 *
 * If a route is protected by `canLoad` guards, the preloaded will not load it.
 *
 * @publicApi
 */
declare class RouterPreloader implements OnDestroy {
    private router;
    private injector;
    private preloadingStrategy;
    private loader;
    private subscription?;
    constructor(router: Router, injector: EnvironmentInjector, preloadingStrategy: PreloadingStrategy, loader: RouterConfigLoader);
    setUpPreloading(): void;
    preload(): Observable<any>;
    /** @docs-private */
    ngOnDestroy(): void;
    private processRoutes;
    private preloadConfig;
    static ɵfac: i0.ɵɵFactoryDeclaration<RouterPreloader, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<RouterPreloader>;
}

/**
 * Sets up providers necessary to enable `Router` functionality for the application.
 * Allows to configure a set of routes as well as extra features that should be enabled.
 *
 * @usageNotes
 *
 * Basic example of how you can add a Router to your application:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent, {
 *   providers: [provideRouter(appRoutes)]
 * });
 * ```
 *
 * You can also enable optional features in the Router by adding functions from the `RouterFeatures`
 * type:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes,
 *         withDebugTracing(),
 *         withRouterConfig({paramsInheritanceStrategy: 'always'}))
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link RouterFeatures}
 *
 * @publicApi
 * @param routes A set of `Route`s to use for the application routing table.
 * @param features Optional features to configure additional router behaviors.
 * @returns A set of providers to setup a Router.
 */
declare function provideRouter(routes: Routes, ...features: RouterFeatures[]): EnvironmentProviders;
/**
 * Helper type to represent a Router feature.
 *
 * @publicApi
 */
interface RouterFeature<FeatureKind extends RouterFeatureKind> {
    ɵkind: FeatureKind;
    ɵproviders: Array<Provider | EnvironmentProviders>;
}
/**
 * Registers a DI provider for a set of routes.
 * @param routes The route configuration to provide.
 *
 * @usageNotes
 *
 * ```ts
 * @NgModule({
 *   providers: [provideRoutes(ROUTES)]
 * })
 * class LazyLoadedChildModule {}
 * ```
 *
 * @deprecated If necessary, provide routes using the `ROUTES` `InjectionToken`.
 * @see {@link ROUTES}
 * @publicApi
 */
declare function provideRoutes(routes: Routes): Provider[];
/**
 * A type alias for providers returned by `withInMemoryScrolling` for use with `provideRouter`.
 *
 * @see {@link withInMemoryScrolling}
 * @see {@link provideRouter}
 *
 * @publicApi
 */
type InMemoryScrollingFeature = RouterFeature<RouterFeatureKind.InMemoryScrollingFeature>;
/**
 * Enables customizable scrolling behavior for router navigations.
 *
 * @usageNotes
 *
 * Basic example of how you can enable scrolling feature:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withInMemoryScrolling())
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 * @see {@link ViewportScroller}
 *
 * @publicApi
 * @param options Set of configuration parameters to customize scrolling behavior, see
 *     `InMemoryScrollingOptions` for additional information.
 * @returns A set of providers for use with `provideRouter`.
 */
declare function withInMemoryScrolling(options?: InMemoryScrollingOptions): InMemoryScrollingFeature;
/**
 * A type alias for providers returned by `withEnabledBlockingInitialNavigation` for use with
 * `provideRouter`.
 *
 * @see {@link withEnabledBlockingInitialNavigation}
 * @see {@link provideRouter}
 *
 * @publicApi
 */
type EnabledBlockingInitialNavigationFeature = RouterFeature<RouterFeatureKind.EnabledBlockingInitialNavigationFeature>;
/**
 * A type alias for providers returned by `withEnabledBlockingInitialNavigation` or
 * `withDisabledInitialNavigation` functions for use with `provideRouter`.
 *
 * @see {@link withEnabledBlockingInitialNavigation}
 * @see {@link withDisabledInitialNavigation}
 * @see {@link provideRouter}
 *
 * @publicApi
 */
type InitialNavigationFeature = EnabledBlockingInitialNavigationFeature | DisabledInitialNavigationFeature;
/**
 * Configures initial navigation to start before the root component is created.
 *
 * The bootstrap is blocked until the initial navigation is complete. This should be set in case
 * you use [server-side rendering](guide/ssr), but do not enable [hydration](guide/hydration) for
 * your application.
 *
 * @usageNotes
 *
 * Basic example of how you can enable this navigation behavior:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withEnabledBlockingInitialNavigation())
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 *
 * @publicApi
 * @returns A set of providers for use with `provideRouter`.
 */
declare function withEnabledBlockingInitialNavigation(): EnabledBlockingInitialNavigationFeature;
/**
 * A type alias for providers returned by `withDisabledInitialNavigation` for use with
 * `provideRouter`.
 *
 * @see {@link withDisabledInitialNavigation}
 * @see {@link provideRouter}
 *
 * @publicApi
 */
type DisabledInitialNavigationFeature = RouterFeature<RouterFeatureKind.DisabledInitialNavigationFeature>;
/**
 * Disables initial navigation.
 *
 * Use if there is a reason to have more control over when the router starts its initial navigation
 * due to some complex initialization logic.
 *
 * @usageNotes
 *
 * Basic example of how you can disable initial navigation:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withDisabledInitialNavigation())
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
declare function withDisabledInitialNavigation(): DisabledInitialNavigationFeature;
/**
 * A type alias for providers returned by `withDebugTracing` for use with `provideRouter`.
 *
 * @see {@link withDebugTracing}
 * @see {@link provideRouter}
 *
 * @publicApi
 */
type DebugTracingFeature = RouterFeature<RouterFeatureKind.DebugTracingFeature>;
/**
 * Enables logging of all internal navigation events to the console.
 * Extra logging might be useful for debugging purposes to inspect Router event sequence.
 *
 * @usageNotes
 *
 * Basic example of how you can enable debug tracing:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withDebugTracing())
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
declare function withDebugTracing(): DebugTracingFeature;
/**
 * A type alias that represents a feature which enables preloading in Router.
 * The type is used to describe the return value of the `withPreloading` function.
 *
 * @see {@link withPreloading}
 * @see {@link provideRouter}
 *
 * @publicApi
 */
type PreloadingFeature = RouterFeature<RouterFeatureKind.PreloadingFeature>;
/**
 * Allows to configure a preloading strategy to use. The strategy is configured by providing a
 * reference to a class that implements a `PreloadingStrategy`.
 *
 * @usageNotes
 *
 * Basic example of how you can configure preloading:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withPreloading(PreloadAllModules))
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 *
 * @param preloadingStrategy A reference to a class that implements a `PreloadingStrategy` that
 *     should be used.
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
declare function withPreloading(preloadingStrategy: Type<PreloadingStrategy>): PreloadingFeature;
/**
 * A type alias for providers returned by `withRouterConfig` for use with `provideRouter`.
 *
 * @see {@link withRouterConfig}
 * @see {@link provideRouter}
 *
 * @publicApi
 */
type RouterConfigurationFeature = RouterFeature<RouterFeatureKind.RouterConfigurationFeature>;
/**
 * Allows to provide extra parameters to configure Router.
 *
 * @usageNotes
 *
 * Basic example of how you can provide extra configuration options:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withRouterConfig({
 *          onSameUrlNavigation: 'reload'
 *       }))
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 *
 * @param options A set of parameters to configure Router, see `RouterConfigOptions` for
 *     additional information.
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
declare function withRouterConfig(options: RouterConfigOptions): RouterConfigurationFeature;
/**
 * A type alias for providers returned by `withHashLocation` for use with `provideRouter`.
 *
 * @see {@link withHashLocation}
 * @see {@link provideRouter}
 *
 * @publicApi
 */
type RouterHashLocationFeature = RouterFeature<RouterFeatureKind.RouterHashLocationFeature>;
/**
 * Provides the location strategy that uses the URL fragment instead of the history API.
 *
 * @usageNotes
 *
 * Basic example of how you can use the hash location option:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withHashLocation())
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 * @see {@link /api/common/HashLocationStrategy HashLocationStrategy}
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
declare function withHashLocation(): RouterHashLocationFeature;
/**
 * A type alias for providers returned by `withNavigationErrorHandler` for use with `provideRouter`.
 *
 * @see {@link withNavigationErrorHandler}
 * @see {@link provideRouter}
 *
 * @publicApi
 */
type NavigationErrorHandlerFeature = RouterFeature<RouterFeatureKind.NavigationErrorHandlerFeature>;
/**
 * Provides a function which is called when a navigation error occurs.
 *
 * This function is run inside application's [injection context](guide/di/dependency-injection-context)
 * so you can use the [`inject`](api/core/inject) function.
 *
 * This function can return a `RedirectCommand` to convert the error to a redirect, similar to returning
 * a `UrlTree` or `RedirectCommand` from a guard. This will also prevent the `Router` from emitting
 * `NavigationError`; it will instead emit `NavigationCancel` with code NavigationCancellationCode.Redirect.
 * Return values other than `RedirectCommand` are ignored and do not change any behavior with respect to
 * how the `Router` handles the error.
 *
 * @usageNotes
 *
 * Basic example of how you can use the error handler option:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withNavigationErrorHandler((e: NavigationError) =>
 * inject(MyErrorTracker).trackError(e)))
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link NavigationError}
 * @see {@link /api/core/inject inject}
 * @see {@link runInInjectionContext}
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
declare function withNavigationErrorHandler(handler: (error: NavigationError) => unknown | RedirectCommand): NavigationErrorHandlerFeature;
/**
 * A type alias for providers returned by `withComponentInputBinding` for use with `provideRouter`.
 *
 * @see {@link withComponentInputBinding}
 * @see {@link provideRouter}
 *
 * @publicApi
 */
type ComponentInputBindingFeature = RouterFeature<RouterFeatureKind.ComponentInputBindingFeature>;
/**
 * A type alias for providers returned by `withViewTransitions` for use with `provideRouter`.
 *
 * @see {@link withViewTransitions}
 * @see {@link provideRouter}
 *
 * @publicApi
 */
type ViewTransitionsFeature = RouterFeature<RouterFeatureKind.ViewTransitionsFeature>;
/**
 * Enables binding information from the `Router` state directly to the inputs of the component in
 * `Route` configurations.
 *
 * @usageNotes
 *
 * Basic example of how you can enable the feature:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withComponentInputBinding())
 *     ]
 *   }
 * );
 * ```
 *
 * The router bindings information from any of the following sources:
 *
 *  - query parameters
 *  - path and matrix parameters
 *  - static route data
 *  - data from resolvers
 *
 * Duplicate keys are resolved in the same order from above, from least to greatest,
 * meaning that resolvers have the highest precedence and override any of the other information
 * from the route.
 *
 * Importantly, when an input does not have an item in the route data with a matching key, this
 * input is set to `undefined`. This prevents previous information from being
 * retained if the data got removed from the route (i.e. if a query parameter is removed).
 * Default values can be provided with a resolver on the route to ensure the value is always present
 * or an input and use an input transform in the component.
 *
 * @see {@link /guide/components/inputs#input-transforms Input Transforms}
 * @returns A set of providers for use with `provideRouter`.
 */
declare function withComponentInputBinding(): ComponentInputBindingFeature;
/**
 * Enables view transitions in the Router by running the route activation and deactivation inside of
 * `document.startViewTransition`.
 *
 * Note: The View Transitions API is not available in all browsers. If the browser does not support
 * view transitions, the Router will not attempt to start a view transition and continue processing
 * the navigation as usual.
 *
 * @usageNotes
 *
 * Basic example of how you can enable the feature:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withViewTransitions())
 *     ]
 *   }
 * );
 * ```
 *
 * @returns A set of providers for use with `provideRouter`.
 * @see https://developer.chrome.com/docs/web-platform/view-transitions/
 * @see https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
 * @developerPreview 19.0
 */
declare function withViewTransitions(options?: ViewTransitionsFeatureOptions): ViewTransitionsFeature;
/**
 * A type alias that represents all Router features available for use with `provideRouter`.
 * Features can be enabled by adding special functions to the `provideRouter` call.
 * See documentation for each symbol to find corresponding function name. See also `provideRouter`
 * documentation on how to use those functions.
 *
 * @see {@link provideRouter}
 *
 * @publicApi
 */
type RouterFeatures = PreloadingFeature | DebugTracingFeature | InitialNavigationFeature | InMemoryScrollingFeature | RouterConfigurationFeature | NavigationErrorHandlerFeature | ComponentInputBindingFeature | ViewTransitionsFeature | RouterHashLocationFeature;
/**
 * The list of features as an enum to uniquely type each feature.
 */
declare const enum RouterFeatureKind {
    PreloadingFeature = 0,
    DebugTracingFeature = 1,
    EnabledBlockingInitialNavigationFeature = 2,
    DisabledInitialNavigationFeature = 3,
    InMemoryScrollingFeature = 4,
    RouterConfigurationFeature = 5,
    RouterHashLocationFeature = 6,
    NavigationErrorHandlerFeature = 7,
    ComponentInputBindingFeature = 8,
    ViewTransitionsFeature = 9
}

/**
 * @description
 *
 * Provides a way to migrate AngularJS applications to Angular.
 *
 * @publicApi
 */
declare abstract class UrlHandlingStrategy {
    /**
     * Tells the router if this URL should be processed.
     *
     * When it returns true, the router will execute the regular navigation.
     * When it returns false, the router will set the router state to an empty state.
     * As a result, all the active components will be destroyed.
     *
     */
    abstract shouldProcessUrl(url: UrlTree): boolean;
    /**
     * Extracts the part of the URL that should be handled by the router.
     * The rest of the URL will remain untouched.
     */
    abstract extract(url: UrlTree): UrlTree;
    /**
     * Merges the URL fragment with the rest of the URL.
     */
    abstract merge(newUrlPart: UrlTree, rawUrl: UrlTree): UrlTree;
    static ɵfac: i0.ɵɵFactoryDeclaration<UrlHandlingStrategy, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<UrlHandlingStrategy>;
}

/**
 * Maps an array of injectable classes with canMatch functions to an array of equivalent
 * `CanMatchFn` for use in a `Route` definition.
 *
 * Usage {@example router/utils/functional_guards.ts region='CanActivate'}
 *
 * @publicApi
 * @see {@link Route}
 */
declare function mapToCanMatch(providers: Array<Type<CanMatch>>): CanMatchFn[];
/**
 * Maps an array of injectable classes with canActivate functions to an array of equivalent
 * `CanActivateFn` for use in a `Route` definition.
 *
 * Usage {@example router/utils/functional_guards.ts region='CanActivate'}
 *
 * @publicApi
 * @see {@link Route}
 */
declare function mapToCanActivate(providers: Array<Type<CanActivate>>): CanActivateFn[];
/**
 * Maps an array of injectable classes with canActivateChild functions to an array of equivalent
 * `CanActivateChildFn` for use in a `Route` definition.
 *
 * Usage {@example router/utils/functional_guards.ts region='CanActivate'}
 *
 * @publicApi
 * @see {@link Route}
 */
declare function mapToCanActivateChild(providers: Array<Type<CanActivateChild>>): CanActivateChildFn[];
/**
 * Maps an array of injectable classes with canDeactivate functions to an array of equivalent
 * `CanDeactivateFn` for use in a `Route` definition.
 *
 * Usage {@example router/utils/functional_guards.ts region='CanActivate'}
 *
 * @publicApi
 * @see {@link Route}
 */
declare function mapToCanDeactivate<T = unknown>(providers: Array<Type<CanDeactivate<T>>>): CanDeactivateFn<T>[];
/**
 * Maps an injectable class with a resolve function to an equivalent `ResolveFn`
 * for use in a `Route` definition.
 *
 * Usage {@example router/utils/functional_guards.ts region='Resolve'}
 *
 * @publicApi
 * @see {@link Route}
 */
declare function mapToResolve<T>(provider: Type<Resolve<T>>): ResolveFn<T>;

/**
 * @module
 * @description
 * Entry point for all public APIs of the router package.
 */

/**
 * @publicApi
 */
declare const VERSION: Version;

/**
 * Performs the given action once the router finishes its next/current navigation.
 *
 * The navigation is considered complete under the following conditions:
 * - `NavigationCancel` event emits and the code is not `NavigationCancellationCode.Redirect` or
 * `NavigationCancellationCode.SupersededByNewNavigation`. In these cases, the
 * redirecting/superseding navigation must finish.
 * - `NavigationError`, `NavigationEnd`, or `NavigationSkipped` event emits
 */
declare function afterNextNavigation(router: {
    events: Observable<Event>;
}, action: () => void): void;

/**
 * Provides a way to use the synchronous version of the recognize function using rxjs.
 */
declare function provideSometimesSyncRecognize(): EnvironmentProviders;

export { ActivatedRoute, ActivatedRouteSnapshot, CanActivate, CanActivateChild, CanActivateChildFn, CanActivateFn, CanDeactivate, CanDeactivateFn, CanMatch, CanMatchFn, ChildrenOutletContexts, DefaultTitleStrategy, Event, InMemoryScrollingOptions, NavigationError, NoPreloading, OutletContext, Params, PreloadAllModules, PreloadingStrategy, ROUTES, RedirectCommand, Resolve, ResolveFn, Route, Router, RouterConfigOptions, RouterOutletContract, RouterPreloader, RouterStateSnapshot, Routes, TitleStrategy, UrlHandlingStrategy, UrlTree, VERSION, createUrlTreeFromSnapshot, mapToCanActivate, mapToCanActivateChild, mapToCanDeactivate, mapToCanMatch, mapToResolve, provideRouter, provideRoutes, withComponentInputBinding, withDebugTracing, withDisabledInitialNavigation, withEnabledBlockingInitialNavigation, withHashLocation, withInMemoryScrolling, withNavigationErrorHandler, withPreloading, withRouterConfig, withViewTransitions, afterNextNavigation as ɵafterNextNavigation, loadChildren as ɵloadChildren, provideSometimesSyncRecognize as ɵprovideSometimesSyncRecognize };
export type { ComponentInputBindingFeature, DebugTracingFeature, DisabledInitialNavigationFeature, EnabledBlockingInitialNavigationFeature, InMemoryScrollingFeature, InitialNavigationFeature, NavigationErrorHandlerFeature, PreloadingFeature, RouterConfigurationFeature, RouterFeature, RouterFeatures, RouterHashLocationFeature, ViewTransitionInfo, ViewTransitionsFeature, ViewTransitionsFeatureOptions };
