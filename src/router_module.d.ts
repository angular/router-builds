/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { HashLocationStrategy, Location, PathLocationStrategy, PlatformLocation, ViewportScroller } from '@angular/common';
import { Compiler, ComponentRef, InjectionToken, Injector, ModuleWithProviders, NgModuleFactoryLoader, NgProbeToken, OnDestroy, Provider } from '@angular/core';
import { Route, Routes } from './config';
import { RouteReuseStrategy } from './route_reuse_strategy';
import { ErrorHandler, Router } from './router';
import { ChildrenOutletContexts } from './router_outlet_context';
import { RouterScroller } from './router_scroller';
import { ActivatedRoute } from './router_state';
import { UrlHandlingStrategy } from './url_handling_strategy';
import { UrlSerializer, UrlTree } from './url_tree';
import * as i0 from "@angular/core";
import * as i1 from "./directives/router_outlet";
import * as i2 from "./directives/router_link";
import * as i3 from "./directives/router_link_active";
import * as i4 from "./components/empty_outlet";
/**
 * A [DI token](guide/glossary/#di-token) for the router service.
 *
 * @publicApi
 */
export declare const ROUTER_CONFIGURATION: InjectionToken<ExtraOptions>;
/**
 * @docsNotRequired
 */
export declare const ROUTER_FORROOT_GUARD: InjectionToken<void>;
export declare const ROUTER_PROVIDERS: Provider[];
export declare function routerNgProbeToken(): NgProbeToken;
/**
 * @description
 *
 * Adds directives and providers for in-app navigation among views defined in an application.
 * Use the Angular `Router` service to declaratively specify application states and manage state
 * transitions.
 *
 * You can import this NgModule multiple times, once for each lazy-loaded bundle.
 * However, only one `Router` service can be active.
 * To ensure this, there are two ways to register routes when importing this module:
 *
 * * The `forRoot()` method creates an `NgModule` that contains all the directives, the given
 * routes, and the `Router` service itself.
 * * The `forChild()` method creates an `NgModule` that contains all the directives and the given
 * routes, but does not include the `Router` service.
 *
 * @see [Routing and Navigation guide](guide/router) for an
 * overview of how the `Router` service should be used.
 *
 * @publicApi
 */
export declare class RouterModule {
    constructor(guard: any, router: Router);
    /**
     * Creates and configures a module with all the router providers and directives.
     * Optionally sets up an application listener to perform an initial navigation.
     *
     * When registering the NgModule at the root, import as follows:
     *
     * ```
     * @NgModule({
     *   imports: [RouterModule.forRoot(ROUTES)]
     * })
     * class MyNgModule {}
     * ```
     *
     * @param routes An array of `Route` objects that define the navigation paths for the application.
     * @param config An `ExtraOptions` configuration object that controls how navigation is performed.
     * @return The new `NgModule`.
     *
     */
    static forRoot(routes: Routes, config?: ExtraOptions): ModuleWithProviders<RouterModule>;
    /**
     * Creates a module with all the router directives and a provider registering routes,
     * without creating a new Router service.
     * When registering for submodules and lazy-loaded submodules, create the NgModule as follows:
     *
     * ```
     * @NgModule({
     *   imports: [RouterModule.forChild(ROUTES)]
     * })
     * class MyNgModule {}
     * ```
     *
     * @param routes An array of `Route` objects that define the navigation paths for the submodule.
     * @return The new NgModule.
     *
     */
    static forChild(routes: Routes): ModuleWithProviders<RouterModule>;
    static ɵfac: i0.ɵɵFactoryDeclaration<RouterModule, [{ optional: true; }, { optional: true; }]>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<RouterModule, [typeof i1.RouterOutlet, typeof i2.RouterLink, typeof i2.RouterLinkWithHref, typeof i3.RouterLinkActive, typeof i4.ɵEmptyOutletComponent], never, [typeof i1.RouterOutlet, typeof i2.RouterLink, typeof i2.RouterLinkWithHref, typeof i3.RouterLinkActive, typeof i4.ɵEmptyOutletComponent]>;
    static ɵinj: i0.ɵɵInjectorDeclaration<RouterModule>;
}
export declare function createRouterScroller(router: Router, viewportScroller: ViewportScroller, config: ExtraOptions): RouterScroller;
export declare function provideLocationStrategy(platformLocationStrategy: PlatformLocation, baseHref: string, options?: ExtraOptions): HashLocationStrategy | PathLocationStrategy;
export declare function provideForRootGuard(router: Router): any;
/**
 * Registers a [DI provider](guide/glossary#provider) for a set of routes.
 * @param routes The route configuration to provide.
 *
 * @usageNotes
 *
 * ```
 * @NgModule({
 *   imports: [RouterModule.forChild(ROUTES)],
 *   providers: [provideRoutes(EXTRA_ROUTES)]
 * })
 * class MyNgModule {}
 * ```
 *
 * @publicApi
 */
export declare function provideRoutes(routes: Routes): any;
/**
 * Allowed values in an `ExtraOptions` object that configure
 * when the router performs the initial navigation operation.
 *
 * * 'enabledNonBlocking' - (default) The initial navigation starts after the
 * root component has been created. The bootstrap is not blocked on the completion of the initial
 * navigation.
 * * 'enabledBlocking' - The initial navigation starts before the root component is created.
 * The bootstrap is blocked until the initial navigation is complete. This value is required
 * for [server-side rendering](guide/universal) to work.
 * * 'disabled' - The initial navigation is not performed. The location listener is set up before
 * the root component gets created. Use if there is a reason to have
 * more control over when the router starts its initial navigation due to some complex
 * initialization logic.
 *
 * The following values have been [deprecated](guide/releases#deprecation-practices) since v11,
 * and should not be used for new applications.
 *
 * * 'enabled' - This option is 1:1 replaceable with `enabledBlocking`.
 *
 * @see `forRoot()`
 *
 * @publicApi
 */
export declare type InitialNavigation = 'disabled' | 'enabled' | 'enabledBlocking' | 'enabledNonBlocking';
/**
 * A set of configuration options for a router module, provided in the
 * `forRoot()` method.
 *
 * @see `forRoot()`
 *
 *
 * @publicApi
 */
export interface ExtraOptions {
    /**
     * When true, log all internal navigation events to the console.
     * Use for debugging.
     */
    enableTracing?: boolean;
    /**
     * When true, enable the location strategy that uses the URL fragment
     * instead of the history API.
     */
    useHash?: boolean;
    /**
     * One of `enabled`, `enabledBlocking`, `enabledNonBlocking` or `disabled`.
     * When set to `enabled` or `enabledBlocking`, the initial navigation starts before the root
     * component is created. The bootstrap is blocked until the initial navigation is complete. This
     * value is required for [server-side rendering](guide/universal) to work. When set to
     * `enabledNonBlocking`, the initial navigation starts after the root component has been created.
     * The bootstrap is not blocked on the completion of the initial navigation. When set to
     * `disabled`, the initial navigation is not performed. The location listener is set up before the
     * root component gets created. Use if there is a reason to have more control over when the router
     * starts its initial navigation due to some complex initialization logic.
     */
    initialNavigation?: InitialNavigation;
    /**
     * A custom error handler for failed navigations.
     * If the handler returns a value, the navigation Promise is resolved with this value.
     * If the handler throws an exception, the navigation Promise is rejected with the exception.
     *
     */
    errorHandler?: ErrorHandler;
    /**
     * Configures a preloading strategy.
     * One of `PreloadAllModules` or `NoPreloading` (the default).
     */
    preloadingStrategy?: any;
    /**
     * Define what the router should do if it receives a navigation request to the current URL.
     * Default is `ignore`, which causes the router ignores the navigation.
     * This can disable features such as a "refresh" button.
     * Use this option to configure the behavior when navigating to the
     * current URL. Default is 'ignore'.
     */
    onSameUrlNavigation?: 'reload' | 'ignore';
    /**
     * Configures if the scroll position needs to be restored when navigating back.
     *
     * * 'disabled'- (Default) Does nothing. Scroll position is maintained on navigation.
     * * 'top'- Sets the scroll position to x = 0, y = 0 on all navigation.
     * * 'enabled'- Restores the previous scroll position on backward navigation, else sets the
     * position to the anchor if one is provided, or sets the scroll position to [0, 0] (forward
     * navigation). This option will be the default in the future.
     *
     * You can implement custom scroll restoration behavior by adapting the enabled behavior as
     * in the following example.
     *
     * ```typescript
     * class AppModule {
     *   constructor(router: Router, viewportScroller: ViewportScroller) {
     *     router.events.pipe(
     *       filter((e: Event): e is Scroll => e instanceof Scroll)
     *     ).subscribe(e => {
     *       if (e.position) {
     *         // backward navigation
     *         viewportScroller.scrollToPosition(e.position);
     *       } else if (e.anchor) {
     *         // anchor navigation
     *         viewportScroller.scrollToAnchor(e.anchor);
     *       } else {
     *         // forward navigation
     *         viewportScroller.scrollToPosition([0, 0]);
     *       }
     *     });
     *   }
     * }
     * ```
     */
    scrollPositionRestoration?: 'disabled' | 'enabled' | 'top';
    /**
     * When set to 'enabled', scrolls to the anchor element when the URL has a fragment.
     * Anchor scrolling is disabled by default.
     *
     * Anchor scrolling does not happen on 'popstate'. Instead, we restore the position
     * that we stored or scroll to the top.
     */
    anchorScrolling?: 'disabled' | 'enabled';
    /**
     * Configures the scroll offset the router will use when scrolling to an element.
     *
     * When given a tuple with x and y position value,
     * the router uses that offset each time it scrolls.
     * When given a function, the router invokes the function every time
     * it restores scroll position.
     */
    scrollOffset?: [number, number] | (() => [number, number]);
    /**
     * Defines how the router merges parameters, data, and resolved data from parent to child
     * routes. By default ('emptyOnly'), inherits parent parameters only for
     * path-less or component-less routes.
     *
     * Set to 'always' to enable unconditional inheritance of parent parameters.
     *
     * Note that when dealing with matrix parameters, "parent" refers to the parent `Route`
     * config which does not necessarily mean the "URL segment to the left". When the `Route` `path`
     * contains multiple segments, the matrix parameters must appear on the last segment. For example,
     * matrix parameters for `{path: 'a/b', component: MyComp}` should appear as `a/b;foo=bar` and not
     * `a;foo=bar/b`.
     *
     */
    paramsInheritanceStrategy?: 'emptyOnly' | 'always';
    /**
     * A custom handler for malformed URI errors. The handler is invoked when `encodedURI` contains
     * invalid character sequences.
     * The default implementation is to redirect to the root URL, dropping
     * any path or parameter information. The function takes three parameters:
     *
     * - `'URIError'` - Error thrown when parsing a bad URL.
     * - `'UrlSerializer'` - UrlSerializer that’s configured with the router.
     * - `'url'` -  The malformed URL that caused the URIError
     * */
    malformedUriErrorHandler?: (error: URIError, urlSerializer: UrlSerializer, url: string) => UrlTree;
    /**
     * Defines when the router updates the browser URL. By default ('deferred'),
     * update after successful navigation.
     * Set to 'eager' if prefer to update the URL at the beginning of navigation.
     * Updating the URL early allows you to handle a failure of navigation by
     * showing an error message with the URL that failed.
     */
    urlUpdateStrategy?: 'deferred' | 'eager';
    /**
     * Enables a bug fix that corrects relative link resolution in components with empty paths.
     * Example:
     *
     * ```
     * const routes = [
     *   {
     *     path: '',
     *     component: ContainerComponent,
     *     children: [
     *       { path: 'a', component: AComponent },
     *       { path: 'b', component: BComponent },
     *     ]
     *   }
     * ];
     * ```
     *
     * From the `ContainerComponent`, you should be able to navigate to `AComponent` using
     * the following `routerLink`, but it will not work if `relativeLinkResolution` is set
     * to `'legacy'`:
     *
     * `<a [routerLink]="['./a']">Link to A</a>`
     *
     * However, this will work:
     *
     * `<a [routerLink]="['../a']">Link to A</a>`
     *
     * In other words, you're required to use `../` rather than `./` when the relative link
     * resolution is set to `'legacy'`.
     *
     * The default in v11 is `corrected`.
     */
    relativeLinkResolution?: 'legacy' | 'corrected';
}
export declare function setupRouter(urlSerializer: UrlSerializer, contexts: ChildrenOutletContexts, location: Location, injector: Injector, loader: NgModuleFactoryLoader, compiler: Compiler, config: Route[][], opts?: ExtraOptions, urlHandlingStrategy?: UrlHandlingStrategy, routeReuseStrategy?: RouteReuseStrategy): Router;
export declare function assignExtraOptionsToRouter(opts: ExtraOptions, router: Router): void;
export declare function rootRoute(router: Router): ActivatedRoute;
/**
 * Router initialization requires two steps:
 *
 * First, we start the navigation in a `APP_INITIALIZER` to block the bootstrap if
 * a resolver or a guard executes asynchronously.
 *
 * Next, we actually run activation in a `BOOTSTRAP_LISTENER`, using the
 * `afterPreactivation` hook provided by the router.
 * The router navigation starts, reaches the point when preactivation is done, and then
 * pauses. It waits for the hook to be resolved. We then resolve it only in a bootstrap listener.
 */
export declare class RouterInitializer implements OnDestroy {
    private injector;
    private initNavigation;
    private destroyed;
    private resultOfPreactivationDone;
    constructor(injector: Injector);
    appInitializer(): Promise<any>;
    bootstrapListener(bootstrappedComponentRef: ComponentRef<any>): void;
    ngOnDestroy(): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<RouterInitializer, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<RouterInitializer>;
}
export declare function getAppInitializer(r: RouterInitializer): () => Promise<any>;
export declare function getBootstrapListener(r: RouterInitializer): (bootstrappedComponentRef: ComponentRef<any>) => void;
/**
 * A [DI token](guide/glossary/#di-token) for the router initializer that
 * is called after the app is bootstrapped.
 *
 * @publicApi
 */
export declare const ROUTER_INITIALIZER: InjectionToken<(compRef: ComponentRef<any>) => void>;
export declare function provideRouterInitializer(): ReadonlyArray<Provider>;
