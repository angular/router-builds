/**
 * @fileoverview added by tsickle
 * Generated from: packages/router/src/router_module.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { APP_BASE_HREF, HashLocationStrategy, LOCATION_INITIALIZED, Location, LocationStrategy, PathLocationStrategy, PlatformLocation, ViewportScroller, ɵgetDOM as getDOM } from '@angular/common';
import { ANALYZE_FOR_ENTRY_COMPONENTS, APP_BOOTSTRAP_LISTENER, APP_INITIALIZER, ApplicationRef, Compiler, Inject, Injectable, InjectionToken, Injector, NgModule, NgModuleFactoryLoader, NgProbeToken, Optional, SkipSelf, SystemJsNgModuleLoader } from '@angular/core';
import { Subject, of } from 'rxjs';
import { EmptyOutletComponent } from './components/empty_outlet';
import { RouterLink, RouterLinkWithHref } from './directives/router_link';
import { RouterLinkActive } from './directives/router_link_active';
import { RouterOutlet } from './directives/router_outlet';
import { RouteReuseStrategy } from './route_reuse_strategy';
import { Router } from './router';
import { ROUTES } from './router_config_loader';
import { ChildrenOutletContexts } from './router_outlet_context';
import { NoPreloading, PreloadAllModules, PreloadingStrategy, RouterPreloader } from './router_preloader';
import { RouterScroller } from './router_scroller';
import { ActivatedRoute } from './router_state';
import { UrlHandlingStrategy } from './url_handling_strategy';
import { DefaultUrlSerializer, UrlSerializer } from './url_tree';
import { flatten } from './utils/collection';
import * as i0 from "@angular/core";
import * as i1 from "./router";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * The directives defined in the `RouterModule`.
 * @type {?}
 */
const ROUTER_DIRECTIVES = [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive, EmptyOutletComponent];
/**
 * A [DI token](guide/glossary/#di-token) for the router service.
 *
 * \@publicApi
 * @type {?}
 */
export const ROUTER_CONFIGURATION = new InjectionToken('ROUTER_CONFIGURATION');
/**
 * \@docsNotRequired
 * @type {?}
 */
export const ROUTER_FORROOT_GUARD = new InjectionToken('ROUTER_FORROOT_GUARD');
/** @type {?} */
export const ROUTER_PROVIDERS = [
    Location,
    { provide: UrlSerializer, useClass: DefaultUrlSerializer },
    {
        provide: Router,
        useFactory: setupRouter,
        deps: [
            ApplicationRef, UrlSerializer, ChildrenOutletContexts, Location, Injector,
            NgModuleFactoryLoader, Compiler, ROUTES, ROUTER_CONFIGURATION,
            [UrlHandlingStrategy, new Optional()], [RouteReuseStrategy, new Optional()]
        ]
    },
    ChildrenOutletContexts,
    { provide: ActivatedRoute, useFactory: rootRoute, deps: [Router] },
    { provide: NgModuleFactoryLoader, useClass: SystemJsNgModuleLoader },
    RouterPreloader,
    NoPreloading,
    PreloadAllModules,
    { provide: ROUTER_CONFIGURATION, useValue: { enableTracing: false } },
];
/**
 * @return {?}
 */
export function routerNgProbeToken() {
    return new NgProbeToken('Router', Router);
}
/**
 * \@usageNotes
 *
 * RouterModule can be imported multiple times: once per lazily-loaded bundle.
 * Since the router deals with a global shared resource--location, we cannot have
 * more than one router service active.
 *
 * That is why there are two ways to create the module: `RouterModule.forRoot` and
 * `RouterModule.forChild`.
 *
 * * `forRoot` creates a module that contains all the directives, the given routes, and the router
 *   service itself.
 * * `forChild` creates a module that contains all the directives and the given routes, but does not
 *   include the router service.
 *
 * When registered at the root, the module should be used as follows
 *
 * ```
 * \@NgModule({
 *   imports: [RouterModule.forRoot(ROUTES)]
 * })
 * class MyNgModule {}
 * ```
 *
 * For submodules and lazy loaded submodules the module should be used as follows:
 *
 * ```
 * \@NgModule({
 *   imports: [RouterModule.forChild(ROUTES)]
 * })
 * class MyNgModule {}
 * ```
 *
 * \@description
 *
 * Adds router directives and providers.
 *
 * Managing state transitions is one of the hardest parts of building applications. This is
 * especially true on the web, where you also need to ensure that the state is reflected in the URL.
 * In addition, we often want to split applications into multiple bundles and load them on demand.
 * Doing this transparently is not trivial.
 *
 * The Angular router service solves these problems. Using the router, you can declaratively specify
 * application states, manage state transitions while taking care of the URL, and load bundles on
 * demand.
 *
 * @see [Routing and Navigation](guide/router.html) for an
 * overview of how the router service should be used.
 *
 * \@publicApi
 */
export class RouterModule {
    // Note: We are injecting the Router so it gets created eagerly...
    /**
     * @param {?} guard
     * @param {?} router
     */
    constructor(guard, router) {
    }
    /**
     * Creates and configures a module with all the router providers and directives.
     * Optionally sets up an application listener to perform an initial navigation.
     *
     * @param {?} routes An array of `Route` objects that define the navigation paths for the application.
     * @param {?=} config An `ExtraOptions` configuration object that controls how navigation is performed.
     * @return {?} The new router module.
     */
    static forRoot(routes, config) {
        return {
            ngModule: RouterModule,
            providers: [
                ROUTER_PROVIDERS,
                provideRoutes(routes),
                {
                    provide: ROUTER_FORROOT_GUARD,
                    useFactory: provideForRootGuard,
                    deps: [[Router, new Optional(), new SkipSelf()]]
                },
                { provide: ROUTER_CONFIGURATION, useValue: config ? config : {} },
                {
                    provide: LocationStrategy,
                    useFactory: provideLocationStrategy,
                    deps: [
                        PlatformLocation, [new Inject(APP_BASE_HREF), new Optional()], ROUTER_CONFIGURATION
                    ]
                },
                {
                    provide: RouterScroller,
                    useFactory: createRouterScroller,
                    deps: [Router, ViewportScroller, ROUTER_CONFIGURATION]
                },
                {
                    provide: PreloadingStrategy,
                    useExisting: config && config.preloadingStrategy ? config.preloadingStrategy :
                        NoPreloading
                },
                { provide: NgProbeToken, multi: true, useFactory: routerNgProbeToken },
                provideRouterInitializer(),
            ],
        };
    }
    /**
     * Creates a module with all the router directives and a provider registering routes.
     * @param {?} routes
     * @return {?}
     */
    static forChild(routes) {
        return { ngModule: RouterModule, providers: [provideRoutes(routes)] };
    }
}
RouterModule.decorators = [
    { type: NgModule, args: [{
                declarations: ROUTER_DIRECTIVES,
                exports: ROUTER_DIRECTIVES,
                entryComponents: [EmptyOutletComponent]
            },] },
];
/** @nocollapse */
RouterModule.ctorParameters = () => [
    { type: undefined, decorators: [{ type: Optional }, { type: Inject, args: [ROUTER_FORROOT_GUARD,] }] },
    { type: Router, decorators: [{ type: Optional }] }
];
/** @nocollapse */ RouterModule.ɵmod = i0.ɵɵdefineNgModule({ type: RouterModule });
/** @nocollapse */ RouterModule.ɵinj = i0.ɵɵdefineInjector({ factory: function RouterModule_Factory(t) { return new (t || RouterModule)(i0.ɵɵinject(ROUTER_FORROOT_GUARD, 8), i0.ɵɵinject(i1.Router, 8)); } });
(function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵɵsetNgModuleScope(RouterModule, { declarations: [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive, EmptyOutletComponent], exports: [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive, EmptyOutletComponent] }); })();
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RouterModule, [{
        type: NgModule,
        args: [{
                declarations: ROUTER_DIRECTIVES,
                exports: ROUTER_DIRECTIVES,
                entryComponents: [EmptyOutletComponent]
            }]
    }], function () { return [{ type: undefined, decorators: [{
                type: Optional
            }, {
                type: Inject,
                args: [ROUTER_FORROOT_GUARD]
            }] }, { type: i1.Router, decorators: [{
                type: Optional
            }] }]; }, null); })();
i0.ɵɵsetComponentScope(EmptyOutletComponent, [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive, EmptyOutletComponent], []);
/**
 * @param {?} router
 * @param {?} viewportScroller
 * @param {?} config
 * @return {?}
 */
export function createRouterScroller(router, viewportScroller, config) {
    if (config.scrollOffset) {
        viewportScroller.setOffset(config.scrollOffset);
    }
    return new RouterScroller(router, viewportScroller, config);
}
/**
 * @param {?} platformLocationStrategy
 * @param {?} baseHref
 * @param {?=} options
 * @return {?}
 */
export function provideLocationStrategy(platformLocationStrategy, baseHref, options = {}) {
    return options.useHash ? new HashLocationStrategy(platformLocationStrategy, baseHref) :
        new PathLocationStrategy(platformLocationStrategy, baseHref);
}
/**
 * @param {?} router
 * @return {?}
 */
export function provideForRootGuard(router) {
    if (router) {
        throw new Error(`RouterModule.forRoot() called twice. Lazy loaded modules should use RouterModule.forChild() instead.`);
    }
    return 'guarded';
}
/**
 * Registers a [DI provider](guide/glossary#provider) for a set of routes.
 * \@usageNotes
 *
 * ```
 * \@NgModule({
 *   imports: [RouterModule.forChild(ROUTES)],
 *   providers: [provideRoutes(EXTRA_ROUTES)]
 * })
 * class MyNgModule {}
 * ```
 *
 * \@publicApi
 * @param {?} routes The route configuration to provide.
 *
 * @return {?}
 */
export function provideRoutes(routes) {
    return [
        { provide: ANALYZE_FOR_ENTRY_COMPONENTS, multi: true, useValue: routes },
        { provide: ROUTES, multi: true, useValue: routes },
    ];
}
/**
 * A set of configuration options for a router module, provided in the
 * `forRoot()` method.
 *
 * \@publicApi
 * @record
 */
export function ExtraOptions() { }
if (false) {
    /**
     * When true, log all internal navigation events to the console.
     * Use for debugging.
     * @type {?|undefined}
     */
    ExtraOptions.prototype.enableTracing;
    /**
     * When true, enable the location strategy that uses the URL fragment
     * instead of the history API.
     * @type {?|undefined}
     */
    ExtraOptions.prototype.useHash;
    /**
     * One of `enabled` or `disabled`.
     * When set to `enabled`, the initial navigation starts before the root component is created.
     * The bootstrap is blocked until the initial navigation is complete. This value is required for
     * [server-side rendering](guide/universal) to work.
     * When set to `disabled`, the initial navigation is not performed.
     * The location listener is set up before the root component gets created.
     * Use if there is a reason to have more control over when the router
     * starts its initial navigation due to some complex initialization logic.
     *
     * Legacy values are deprecated since v4 and should not be used for new applications:
     *
     * * `legacy_enabled` - Default for compatibility.
     * The initial navigation starts after the root component has been created,
     * but the bootstrap is not blocked until the initial navigation is complete.
     * * `legacy_disabled` - The initial navigation is not performed.
     * The location listener is set up after the root component gets created.
     * * `true` - same as `legacy_enabled`.
     * * `false` - same as `legacy_disabled`.
     * @type {?|undefined}
     */
    ExtraOptions.prototype.initialNavigation;
    /**
     * A custom error handler for failed navigations.
     * @type {?|undefined}
     */
    ExtraOptions.prototype.errorHandler;
    /**
     * Configures a preloading strategy.
     * One of `PreloadAllModules` or `NoPreloading` (the default).
     * @type {?|undefined}
     */
    ExtraOptions.prototype.preloadingStrategy;
    /**
     * Define what the router should do if it receives a navigation request to the current URL.
     * Default is `ignore`, which causes the router ignores the navigation.
     * This can disable features such as a "refresh" button.
     * Use this option to configure the behavior when navigating to the
     * current URL. Default is 'ignore'.
     * @type {?|undefined}
     */
    ExtraOptions.prototype.onSameUrlNavigation;
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
     * @type {?|undefined}
     */
    ExtraOptions.prototype.scrollPositionRestoration;
    /**
     * When set to 'enabled', scrolls to the anchor element when the URL has a fragment.
     * Anchor scrolling is disabled by default.
     *
     * Anchor scrolling does not happen on 'popstate'. Instead, we restore the position
     * that we stored or scroll to the top.
     * @type {?|undefined}
     */
    ExtraOptions.prototype.anchorScrolling;
    /**
     * Configures the scroll offset the router will use when scrolling to an element.
     *
     * When given a tuple with x and y position value,
     * the router uses that offset each time it scrolls.
     * When given a function, the router invokes the function every time
     * it restores scroll position.
     * @type {?|undefined}
     */
    ExtraOptions.prototype.scrollOffset;
    /**
     * Defines how the router merges parameters, data, and resolved data from parent to child
     * routes. By default ('emptyOnly'), inherits parent parameters only for
     * path-less or component-less routes.
     * Set to 'always' to enable unconditional inheritance of parent parameters.
     * @type {?|undefined}
     */
    ExtraOptions.prototype.paramsInheritanceStrategy;
    /**
     * A custom handler for malformed URI errors. The handler is invoked when `encodedURI` contains
     * invalid character sequences.
     * The default implementation is to redirect to the root URL, dropping
     * any path or parameter information. The function takes three parameters:
     *
     * - `'URIError'` - Error thrown when parsing a bad URL.
     * - `'UrlSerializer'` - UrlSerializer that’s configured with the router.
     * - `'url'` -  The malformed URL that caused the URIError
     *
     * @type {?|undefined}
     */
    ExtraOptions.prototype.malformedUriErrorHandler;
    /**
     * Defines when the router updates the browser URL. By default ('deferred'),
     * update after successful navigation.
     * Set to 'eager' if prefer to update the URL at the beginning of navigation.
     * Updating the URL early allows you to handle a failure of navigation by
     * showing an error message with the URL that failed.
     * @type {?|undefined}
     */
    ExtraOptions.prototype.urlUpdateStrategy;
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
     * From the `ContainerComponent`, this will not work:
     *
     * `<a [routerLink]="['./a']">Link to A</a>`
     *
     * However, this will work:
     *
     * `<a [routerLink]="['../a']">Link to A</a>`
     *
     * In other words, you're required to use `../` rather than `./`. This is currently the default
     * behavior. Setting this option to `corrected` enables the fix.
     * @type {?|undefined}
     */
    ExtraOptions.prototype.relativeLinkResolution;
}
/**
 * @param {?} ref
 * @param {?} urlSerializer
 * @param {?} contexts
 * @param {?} location
 * @param {?} injector
 * @param {?} loader
 * @param {?} compiler
 * @param {?} config
 * @param {?=} opts
 * @param {?=} urlHandlingStrategy
 * @param {?=} routeReuseStrategy
 * @return {?}
 */
export function setupRouter(ref, urlSerializer, contexts, location, injector, loader, compiler, config, opts = {}, urlHandlingStrategy, routeReuseStrategy) {
    /** @type {?} */
    const router = new Router(null, urlSerializer, contexts, location, injector, loader, compiler, flatten(config));
    if (urlHandlingStrategy) {
        router.urlHandlingStrategy = urlHandlingStrategy;
    }
    if (routeReuseStrategy) {
        router.routeReuseStrategy = routeReuseStrategy;
    }
    if (opts.errorHandler) {
        router.errorHandler = opts.errorHandler;
    }
    if (opts.malformedUriErrorHandler) {
        router.malformedUriErrorHandler = opts.malformedUriErrorHandler;
    }
    if (opts.enableTracing) {
        /** @type {?} */
        const dom = getDOM();
        router.events.subscribe((/**
         * @param {?} e
         * @return {?}
         */
        (e) => {
            dom.logGroup(`Router Event: ${((/** @type {?} */ (e.constructor))).name}`);
            dom.log(e.toString());
            dom.log(e);
            dom.logGroupEnd();
        }));
    }
    if (opts.onSameUrlNavigation) {
        router.onSameUrlNavigation = opts.onSameUrlNavigation;
    }
    if (opts.paramsInheritanceStrategy) {
        router.paramsInheritanceStrategy = opts.paramsInheritanceStrategy;
    }
    if (opts.urlUpdateStrategy) {
        router.urlUpdateStrategy = opts.urlUpdateStrategy;
    }
    if (opts.relativeLinkResolution) {
        router.relativeLinkResolution = opts.relativeLinkResolution;
    }
    return router;
}
/**
 * @param {?} router
 * @return {?}
 */
export function rootRoute(router) {
    return router.routerState.root;
}
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
export class RouterInitializer {
    /**
     * @param {?} injector
     */
    constructor(injector) {
        this.injector = injector;
        this.initNavigation = false;
        this.resultOfPreactivationDone = new Subject();
    }
    /**
     * @return {?}
     */
    appInitializer() {
        /** @type {?} */
        const p = this.injector.get(LOCATION_INITIALIZED, Promise.resolve(null));
        return p.then((/**
         * @return {?}
         */
        () => {
            /** @type {?} */
            let resolve = (/** @type {?} */ (null));
            /** @type {?} */
            const res = new Promise((/**
             * @param {?} r
             * @return {?}
             */
            r => resolve = r));
            /** @type {?} */
            const router = this.injector.get(Router);
            /** @type {?} */
            const opts = this.injector.get(ROUTER_CONFIGURATION);
            if (this.isLegacyDisabled(opts) || this.isLegacyEnabled(opts)) {
                resolve(true);
            }
            else if (opts.initialNavigation === 'disabled') {
                router.setUpLocationChangeListener();
                resolve(true);
            }
            else if (opts.initialNavigation === 'enabled') {
                router.hooks.afterPreactivation = (/**
                 * @return {?}
                 */
                () => {
                    // only the initial navigation should be delayed
                    if (!this.initNavigation) {
                        this.initNavigation = true;
                        resolve(true);
                        return this.resultOfPreactivationDone;
                        // subsequent navigations should not be delayed
                    }
                    else {
                        return (/** @type {?} */ (of(null)));
                    }
                });
                router.initialNavigation();
            }
            else {
                throw new Error(`Invalid initialNavigation options: '${opts.initialNavigation}'`);
            }
            return res;
        }));
    }
    /**
     * @param {?} bootstrappedComponentRef
     * @return {?}
     */
    bootstrapListener(bootstrappedComponentRef) {
        /** @type {?} */
        const opts = this.injector.get(ROUTER_CONFIGURATION);
        /** @type {?} */
        const preloader = this.injector.get(RouterPreloader);
        /** @type {?} */
        const routerScroller = this.injector.get(RouterScroller);
        /** @type {?} */
        const router = this.injector.get(Router);
        /** @type {?} */
        const ref = this.injector.get(ApplicationRef);
        if (bootstrappedComponentRef !== ref.components[0]) {
            return;
        }
        if (this.isLegacyEnabled(opts)) {
            router.initialNavigation();
        }
        else if (this.isLegacyDisabled(opts)) {
            router.setUpLocationChangeListener();
        }
        preloader.setUpPreloading();
        routerScroller.init();
        router.resetRootComponentType(ref.componentTypes[0]);
        this.resultOfPreactivationDone.next((/** @type {?} */ (null)));
        this.resultOfPreactivationDone.complete();
    }
    /**
     * @private
     * @param {?} opts
     * @return {?}
     */
    isLegacyEnabled(opts) {
        return opts.initialNavigation === 'legacy_enabled' || opts.initialNavigation === true ||
            opts.initialNavigation === undefined;
    }
    /**
     * @private
     * @param {?} opts
     * @return {?}
     */
    isLegacyDisabled(opts) {
        return opts.initialNavigation === 'legacy_disabled' || opts.initialNavigation === false;
    }
}
RouterInitializer.decorators = [
    { type: Injectable },
];
/** @nocollapse */
RouterInitializer.ctorParameters = () => [
    { type: Injector }
];
/** @nocollapse */ RouterInitializer.ɵfac = function RouterInitializer_Factory(t) { return new (t || RouterInitializer)(i0.ɵɵinject(i0.Injector)); };
/** @nocollapse */ RouterInitializer.ɵprov = i0.ɵɵdefineInjectable({ token: RouterInitializer, factory: function (t) { return RouterInitializer.ɵfac(t); }, providedIn: null });
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RouterInitializer, [{
        type: Injectable
    }], function () { return [{ type: i0.Injector }]; }, null); })();
if (false) {
    /**
     * @type {?}
     * @private
     */
    RouterInitializer.prototype.initNavigation;
    /**
     * @type {?}
     * @private
     */
    RouterInitializer.prototype.resultOfPreactivationDone;
    /**
     * @type {?}
     * @private
     */
    RouterInitializer.prototype.injector;
}
/**
 * @param {?} r
 * @return {?}
 */
export function getAppInitializer(r) {
    return r.appInitializer.bind(r);
}
/**
 * @param {?} r
 * @return {?}
 */
export function getBootstrapListener(r) {
    return r.bootstrapListener.bind(r);
}
/**
 * A [DI token](guide/glossary/#di-token) for the router initializer that
 * is called after the app is bootstrapped.
 *
 * \@publicApi
 * @type {?}
 */
export const ROUTER_INITIALIZER = new InjectionToken('Router Initializer');
/**
 * @return {?}
 */
export function provideRouterInitializer() {
    return [
        RouterInitializer,
        {
            provide: APP_INITIALIZER,
            multi: true,
            useFactory: getAppInitializer,
            deps: [RouterInitializer]
        },
        { provide: ROUTER_INITIALIZER, useFactory: getBootstrapListener, deps: [RouterInitializer] },
        { provide: APP_BOOTSTRAP_LISTENER, multi: true, useExisting: ROUTER_INITIALIZER },
    ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX21vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvcm91dGVyX21vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQVFBLE9BQU8sRUFBQyxhQUFhLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLE9BQU8sSUFBSSxNQUFNLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUNuTSxPQUFPLEVBQUMsNEJBQTRCLEVBQUUsc0JBQXNCLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQWdCLE1BQU0sRUFBRSxVQUFVLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBdUIsUUFBUSxFQUFFLHFCQUFxQixFQUFFLFlBQVksRUFBRSxRQUFRLEVBQVksUUFBUSxFQUFFLHNCQUFzQixFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3BULE9BQU8sRUFBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ2xDLE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLDJCQUEyQixDQUFDO0FBRS9ELE9BQU8sRUFBQyxVQUFVLEVBQUUsa0JBQWtCLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUN4RSxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqRSxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sNEJBQTRCLENBQUM7QUFFeEQsT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDMUQsT0FBTyxFQUFlLE1BQU0sRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM5QyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDOUMsT0FBTyxFQUFDLHNCQUFzQixFQUFDLE1BQU0seUJBQXlCLENBQUM7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QUMsQ0FBQyxDQUFDLENBQUM7QUFDbEMsQ0FBQzs7Ozs7QUFFRCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsQ0FBb0I7SUFDdkQsT0FBTyxDQUFDLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLENBQUM7Ozs7Ozs7O0FBUUQsTUFBTSxPQUFPLGtCQUFrQixHQUMzQixJQUFJLGNBQWMsQ0FBdUMsb0JBQW9CLENBQUM7Ozs7QUFFbEYsTUFBTSxVQUFVLHdCQUF3QjtJQUN0QyxPQUFPO1FBQ0wsaUJBQWlCO1FBQ2pCO1lBQ0UsT0FBTyxFQUFFLGVBQWU7WUFDeEIsS0FBSyxFQUFFLElBQUk7WUFDWCxVQUFVLEVBQUUsaUJBQWlCO1lBQzdCLElBQUksRUFBRSxDQUFDLGlCQUFpQixDQUFDO1NBQzFCO1FBQ0QsRUFBQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxFQUFFLG9CQUFvQixFQUFFLElBQUksRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUM7UUFDMUYsRUFBQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUM7S0FDaEYsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVBQX0JBU0VfSFJFRiwgSGFzaExvY2F0aW9uU3RyYXRlZ3ksIExPQ0FUSU9OX0lOSVRJQUxJWkVELCBMb2NhdGlvbiwgTG9jYXRpb25TdHJhdGVneSwgUGF0aExvY2F0aW9uU3RyYXRlZ3ksIFBsYXRmb3JtTG9jYXRpb24sIFZpZXdwb3J0U2Nyb2xsZXIsIMm1Z2V0RE9NIGFzIGdldERPTX0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7QU5BTFlaRV9GT1JfRU5UUllfQ09NUE9ORU5UUywgQVBQX0JPT1RTVFJBUF9MSVNURU5FUiwgQVBQX0lOSVRJQUxJWkVSLCBBcHBsaWNhdGlvblJlZiwgQ29tcGlsZXIsIENvbXBvbmVudFJlZiwgSW5qZWN0LCBJbmplY3RhYmxlLCBJbmplY3Rpb25Ub2tlbiwgSW5qZWN0b3IsIE1vZHVsZVdpdGhQcm92aWRlcnMsIE5nTW9kdWxlLCBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIE5nUHJvYmVUb2tlbiwgT3B0aW9uYWwsIFByb3ZpZGVyLCBTa2lwU2VsZiwgU3lzdGVtSnNOZ01vZHVsZUxvYWRlcn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge1N1YmplY3QsIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge0VtcHR5T3V0bGV0Q29tcG9uZW50fSBmcm9tICcuL2NvbXBvbmVudHMvZW1wdHlfb3V0bGV0JztcbmltcG9ydCB7Um91dGUsIFJvdXRlc30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtSb3V0ZXJMaW5rLCBSb3V0ZXJMaW5rV2l0aEhyZWZ9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfbGluayc7XG5pbXBvcnQge1JvdXRlckxpbmtBY3RpdmV9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfbGlua19hY3RpdmUnO1xuaW1wb3J0IHtSb3V0ZXJPdXRsZXR9IGZyb20gJy4vZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0JztcbmltcG9ydCB7RXZlbnR9IGZyb20gJy4vZXZlbnRzJztcbmltcG9ydCB7Um91dGVSZXVzZVN0cmF0ZWd5fSBmcm9tICcuL3JvdXRlX3JldXNlX3N0cmF0ZWd5JztcbmltcG9ydCB7RXJyb3JIYW5kbGVyLCBSb3V0ZXJ9IGZyb20gJy4vcm91dGVyJztcbmltcG9ydCB7Uk9VVEVTfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7Q2hpbGRyZW5PdXRsZXRDb250ZXh0c30gZnJvbSAnLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtOb1ByZWxvYWRpbmcsIFByZWxvYWRBbGxNb2R1bGVzLCBQcmVsb2FkaW5nU3RyYXRlZ3ksIFJvdXRlclByZWxvYWRlcn0gZnJvbSAnLi9yb3V0ZXJfcHJlbG9hZGVyJztcbmltcG9ydCB7Um91dGVyU2Nyb2xsZXJ9IGZyb20gJy4vcm91dGVyX3Njcm9sbGVyJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGV9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7VXJsSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi91cmxfaGFuZGxpbmdfc3RyYXRlZ3knO1xuaW1wb3J0IHtEZWZhdWx0VXJsU2VyaWFsaXplciwgVXJsU2VyaWFsaXplciwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge2ZsYXR0ZW59IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5cbi8qKlxuICogVGhlIGRpcmVjdGl2ZXMgZGVmaW5lZCBpbiB0aGUgYFJvdXRlck1vZHVsZWAuXG4gKi9cbmNvbnN0IFJPVVRFUl9ESVJFQ1RJVkVTID1cbiAgICBbUm91dGVyT3V0bGV0LCBSb3V0ZXJMaW5rLCBSb3V0ZXJMaW5rV2l0aEhyZWYsIFJvdXRlckxpbmtBY3RpdmUsIEVtcHR5T3V0bGV0Q29tcG9uZW50XTtcblxuLyoqXG4gKiBBIFtESSB0b2tlbl0oZ3VpZGUvZ2xvc3NhcnkvI2RpLXRva2VuKSBmb3IgdGhlIHJvdXRlciBzZXJ2aWNlLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9DT05GSUdVUkFUSU9OID0gbmV3IEluamVjdGlvblRva2VuPEV4dHJhT3B0aW9ucz4oJ1JPVVRFUl9DT05GSUdVUkFUSU9OJyk7XG5cbi8qKlxuICogQGRvY3NOb3RSZXF1aXJlZFxuICovXG5leHBvcnQgY29uc3QgUk9VVEVSX0ZPUlJPT1RfR1VBUkQgPSBuZXcgSW5qZWN0aW9uVG9rZW48dm9pZD4oJ1JPVVRFUl9GT1JST09UX0dVQVJEJyk7XG5cbmV4cG9ydCBjb25zdCBST1VURVJfUFJPVklERVJTOiBQcm92aWRlcltdID0gW1xuICBMb2NhdGlvbixcbiAge3Byb3ZpZGU6IFVybFNlcmlhbGl6ZXIsIHVzZUNsYXNzOiBEZWZhdWx0VXJsU2VyaWFsaXplcn0sXG4gIHtcbiAgICBwcm92aWRlOiBSb3V0ZXIsXG4gICAgdXNlRmFjdG9yeTogc2V0dXBSb3V0ZXIsXG4gICAgZGVwczogW1xuICAgICAgQXBwbGljYXRpb25SZWYsIFVybFNlcmlhbGl6ZXIsIENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIExvY2F0aW9uLCBJbmplY3RvcixcbiAgICAgIE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgQ29tcGlsZXIsIFJPVVRFUywgUk9VVEVSX0NPTkZJR1VSQVRJT04sXG4gICAgICBbVXJsSGFuZGxpbmdTdHJhdGVneSwgbmV3IE9wdGlvbmFsKCldLCBbUm91dGVSZXVzZVN0cmF0ZWd5LCBuZXcgT3B0aW9uYWwoKV1cbiAgICBdXG4gIH0sXG4gIENoaWxkcmVuT3V0bGV0Q29udGV4dHMsXG4gIHtwcm92aWRlOiBBY3RpdmF0ZWRSb3V0ZSwgdXNlRmFjdG9yeTogcm9vdFJvdXRlLCBkZXBzOiBbUm91dGVyXX0sXG4gIHtwcm92aWRlOiBOZ01vZHVsZUZhY3RvcnlMb2FkZXIsIHVzZUNsYXNzOiBTeXN0ZW1Kc05nTW9kdWxlTG9hZGVyfSxcbiAgUm91dGVyUHJlbG9hZGVyLFxuICBOb1ByZWxvYWRpbmcsXG4gIFByZWxvYWRBbGxNb2R1bGVzLFxuICB7cHJvdmlkZTogUk9VVEVSX0NPTkZJR1VSQVRJT04sIHVzZVZhbHVlOiB7ZW5hYmxlVHJhY2luZzogZmFsc2V9fSxcbl07XG5cbmV4cG9ydCBmdW5jdGlvbiByb3V0ZXJOZ1Byb2JlVG9rZW4oKSB7XG4gIHJldHVybiBuZXcgTmdQcm9iZVRva2VuKCdSb3V0ZXInLCBSb3V0ZXIpO1xufVxuXG4vKipcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogUm91dGVyTW9kdWxlIGNhbiBiZSBpbXBvcnRlZCBtdWx0aXBsZSB0aW1lczogb25jZSBwZXIgbGF6aWx5LWxvYWRlZCBidW5kbGUuXG4gKiBTaW5jZSB0aGUgcm91dGVyIGRlYWxzIHdpdGggYSBnbG9iYWwgc2hhcmVkIHJlc291cmNlLS1sb2NhdGlvbiwgd2UgY2Fubm90IGhhdmVcbiAqIG1vcmUgdGhhbiBvbmUgcm91dGVyIHNlcnZpY2UgYWN0aXZlLlxuICpcbiAqIFRoYXQgaXMgd2h5IHRoZXJlIGFyZSB0d28gd2F5cyB0byBjcmVhdGUgdGhlIG1vZHVsZTogYFJvdXRlck1vZHVsZS5mb3JSb290YCBhbmRcbiAqIGBSb3V0ZXJNb2R1bGUuZm9yQ2hpbGRgLlxuICpcbiAqICogYGZvclJvb3RgIGNyZWF0ZXMgYSBtb2R1bGUgdGhhdCBjb250YWlucyBhbGwgdGhlIGRpcmVjdGl2ZXMsIHRoZSBnaXZlbiByb3V0ZXMsIGFuZCB0aGUgcm91dGVyXG4gKiAgIHNlcnZpY2UgaXRzZWxmLlxuICogKiBgZm9yQ2hpbGRgIGNyZWF0ZXMgYSBtb2R1bGUgdGhhdCBjb250YWlucyBhbGwgdGhlIGRpcmVjdGl2ZXMgYW5kIHRoZSBnaXZlbiByb3V0ZXMsIGJ1dCBkb2VzIG5vdFxuICogICBpbmNsdWRlIHRoZSByb3V0ZXIgc2VydmljZS5cbiAqXG4gKiBXaGVuIHJlZ2lzdGVyZWQgYXQgdGhlIHJvb3QsIHRoZSBtb2R1bGUgc2hvdWxkIGJlIHVzZWQgYXMgZm9sbG93c1xuICpcbiAqIGBgYFxuICogQE5nTW9kdWxlKHtcbiAqICAgaW1wb3J0czogW1JvdXRlck1vZHVsZS5mb3JSb290KFJPVVRFUyldXG4gKiB9KVxuICogY2xhc3MgTXlOZ01vZHVsZSB7fVxuICogYGBgXG4gKlxuICogRm9yIHN1Ym1vZHVsZXMgYW5kIGxhenkgbG9hZGVkIHN1Ym1vZHVsZXMgdGhlIG1vZHVsZSBzaG91bGQgYmUgdXNlZCBhcyBmb2xsb3dzOlxuICpcbiAqIGBgYFxuICogQE5nTW9kdWxlKHtcbiAqICAgaW1wb3J0czogW1JvdXRlck1vZHVsZS5mb3JDaGlsZChST1VURVMpXVxuICogfSlcbiAqIGNsYXNzIE15TmdNb2R1bGUge31cbiAqIGBgYFxuICpcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEFkZHMgcm91dGVyIGRpcmVjdGl2ZXMgYW5kIHByb3ZpZGVycy5cbiAqXG4gKiBNYW5hZ2luZyBzdGF0ZSB0cmFuc2l0aW9ucyBpcyBvbmUgb2YgdGhlIGhhcmRlc3QgcGFydHMgb2YgYnVpbGRpbmcgYXBwbGljYXRpb25zLiBUaGlzIGlzXG4gKiBlc3BlY2lhbGx5IHRydWUgb24gdGhlIHdlYiwgd2hlcmUgeW91IGFsc28gbmVlZCB0byBlbnN1cmUgdGhhdCB0aGUgc3RhdGUgaXMgcmVmbGVjdGVkIGluIHRoZSBVUkwuXG4gKiBJbiBhZGRpdGlvbiwgd2Ugb2Z0ZW4gd2FudCB0byBzcGxpdCBhcHBsaWNhdGlvbnMgaW50byBtdWx0aXBsZSBidW5kbGVzIGFuZCBsb2FkIHRoZW0gb24gZGVtYW5kLlxuICogRG9pbmcgdGhpcyB0cmFuc3BhcmVudGx5IGlzIG5vdCB0cml2aWFsLlxuICpcbiAqIFRoZSBBbmd1bGFyIHJvdXRlciBzZXJ2aWNlIHNvbHZlcyB0aGVzZSBwcm9ibGVtcy4gVXNpbmcgdGhlIHJvdXRlciwgeW91IGNhbiBkZWNsYXJhdGl2ZWx5IHNwZWNpZnlcbiAqIGFwcGxpY2F0aW9uIHN0YXRlcywgbWFuYWdlIHN0YXRlIHRyYW5zaXRpb25zIHdoaWxlIHRha2luZyBjYXJlIG9mIHRoZSBVUkwsIGFuZCBsb2FkIGJ1bmRsZXMgb25cbiAqIGRlbWFuZC5cbiAqXG4gKiBAc2VlIFtSb3V0aW5nIGFuZCBOYXZpZ2F0aW9uXShndWlkZS9yb3V0ZXIuaHRtbCkgZm9yIGFuXG4gKiBvdmVydmlldyBvZiBob3cgdGhlIHJvdXRlciBzZXJ2aWNlIHNob3VsZCBiZSB1c2VkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQE5nTW9kdWxlKHtcbiAgZGVjbGFyYXRpb25zOiBST1VURVJfRElSRUNUSVZFUyxcbiAgZXhwb3J0czogUk9VVEVSX0RJUkVDVElWRVMsXG4gIGVudHJ5Q29tcG9uZW50czogW0VtcHR5T3V0bGV0Q29tcG9uZW50XVxufSlcbmV4cG9ydCBjbGFzcyBSb3V0ZXJNb2R1bGUge1xuICAvLyBOb3RlOiBXZSBhcmUgaW5qZWN0aW5nIHRoZSBSb3V0ZXIgc28gaXQgZ2V0cyBjcmVhdGVkIGVhZ2VybHkuLi5cbiAgY29uc3RydWN0b3IoQE9wdGlvbmFsKCkgQEluamVjdChST1VURVJfRk9SUk9PVF9HVUFSRCkgZ3VhcmQ6IGFueSwgQE9wdGlvbmFsKCkgcm91dGVyOiBSb3V0ZXIpIHt9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW5kIGNvbmZpZ3VyZXMgYSBtb2R1bGUgd2l0aCBhbGwgdGhlIHJvdXRlciBwcm92aWRlcnMgYW5kIGRpcmVjdGl2ZXMuXG4gICAqIE9wdGlvbmFsbHkgc2V0cyB1cCBhbiBhcHBsaWNhdGlvbiBsaXN0ZW5lciB0byBwZXJmb3JtIGFuIGluaXRpYWwgbmF2aWdhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHJvdXRlcyBBbiBhcnJheSBvZiBgUm91dGVgIG9iamVjdHMgdGhhdCBkZWZpbmUgdGhlIG5hdmlnYXRpb24gcGF0aHMgZm9yIHRoZSBhcHBsaWNhdGlvbi5cbiAgICogQHBhcmFtIGNvbmZpZyBBbiBgRXh0cmFPcHRpb25zYCBjb25maWd1cmF0aW9uIG9iamVjdCB0aGF0IGNvbnRyb2xzIGhvdyBuYXZpZ2F0aW9uIGlzIHBlcmZvcm1lZC5cbiAgICogQHJldHVybiBUaGUgbmV3IHJvdXRlciBtb2R1bGUuXG4gICovXG4gIHN0YXRpYyBmb3JSb290KHJvdXRlczogUm91dGVzLCBjb25maWc/OiBFeHRyYU9wdGlvbnMpOiBNb2R1bGVXaXRoUHJvdmlkZXJzPFJvdXRlck1vZHVsZT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuZ01vZHVsZTogUm91dGVyTW9kdWxlLFxuICAgICAgcHJvdmlkZXJzOiBbXG4gICAgICAgIFJPVVRFUl9QUk9WSURFUlMsXG4gICAgICAgIHByb3ZpZGVSb3V0ZXMocm91dGVzKSxcbiAgICAgICAge1xuICAgICAgICAgIHByb3ZpZGU6IFJPVVRFUl9GT1JST09UX0dVQVJELFxuICAgICAgICAgIHVzZUZhY3Rvcnk6IHByb3ZpZGVGb3JSb290R3VhcmQsXG4gICAgICAgICAgZGVwczogW1tSb3V0ZXIsIG5ldyBPcHRpb25hbCgpLCBuZXcgU2tpcFNlbGYoKV1dXG4gICAgICAgIH0sXG4gICAgICAgIHtwcm92aWRlOiBST1VURVJfQ09ORklHVVJBVElPTiwgdXNlVmFsdWU6IGNvbmZpZyA/IGNvbmZpZyA6IHt9fSxcbiAgICAgICAge1xuICAgICAgICAgIHByb3ZpZGU6IExvY2F0aW9uU3RyYXRlZ3ksXG4gICAgICAgICAgdXNlRmFjdG9yeTogcHJvdmlkZUxvY2F0aW9uU3RyYXRlZ3ksXG4gICAgICAgICAgZGVwczogW1xuICAgICAgICAgICAgUGxhdGZvcm1Mb2NhdGlvbiwgW25ldyBJbmplY3QoQVBQX0JBU0VfSFJFRiksIG5ldyBPcHRpb25hbCgpXSwgUk9VVEVSX0NPTkZJR1VSQVRJT05cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBwcm92aWRlOiBSb3V0ZXJTY3JvbGxlcixcbiAgICAgICAgICB1c2VGYWN0b3J5OiBjcmVhdGVSb3V0ZXJTY3JvbGxlcixcbiAgICAgICAgICBkZXBzOiBbUm91dGVyLCBWaWV3cG9ydFNjcm9sbGVyLCBST1VURVJfQ09ORklHVVJBVElPTl1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHByb3ZpZGU6IFByZWxvYWRpbmdTdHJhdGVneSxcbiAgICAgICAgICB1c2VFeGlzdGluZzogY29uZmlnICYmIGNvbmZpZy5wcmVsb2FkaW5nU3RyYXRlZ3kgPyBjb25maWcucHJlbG9hZGluZ1N0cmF0ZWd5IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBOb1ByZWxvYWRpbmdcbiAgICAgICAgfSxcbiAgICAgICAge3Byb3ZpZGU6IE5nUHJvYmVUb2tlbiwgbXVsdGk6IHRydWUsIHVzZUZhY3Rvcnk6IHJvdXRlck5nUHJvYmVUb2tlbn0sXG4gICAgICAgIHByb3ZpZGVSb3V0ZXJJbml0aWFsaXplcigpLFxuICAgICAgXSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBtb2R1bGUgd2l0aCBhbGwgdGhlIHJvdXRlciBkaXJlY3RpdmVzIGFuZCBhIHByb3ZpZGVyIHJlZ2lzdGVyaW5nIHJvdXRlcy5cbiAgICovXG4gIHN0YXRpYyBmb3JDaGlsZChyb3V0ZXM6IFJvdXRlcyk6IE1vZHVsZVdpdGhQcm92aWRlcnM8Um91dGVyTW9kdWxlPiB7XG4gICAgcmV0dXJuIHtuZ01vZHVsZTogUm91dGVyTW9kdWxlLCBwcm92aWRlcnM6IFtwcm92aWRlUm91dGVzKHJvdXRlcyldfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUm91dGVyU2Nyb2xsZXIoXG4gICAgcm91dGVyOiBSb3V0ZXIsIHZpZXdwb3J0U2Nyb2xsZXI6IFZpZXdwb3J0U2Nyb2xsZXIsIGNvbmZpZzogRXh0cmFPcHRpb25zKTogUm91dGVyU2Nyb2xsZXIge1xuICBpZiAoY29uZmlnLnNjcm9sbE9mZnNldCkge1xuICAgIHZpZXdwb3J0U2Nyb2xsZXIuc2V0T2Zmc2V0KGNvbmZpZy5zY3JvbGxPZmZzZXQpO1xuICB9XG4gIHJldHVybiBuZXcgUm91dGVyU2Nyb2xsZXIocm91dGVyLCB2aWV3cG9ydFNjcm9sbGVyLCBjb25maWcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZUxvY2F0aW9uU3RyYXRlZ3koXG4gICAgcGxhdGZvcm1Mb2NhdGlvblN0cmF0ZWd5OiBQbGF0Zm9ybUxvY2F0aW9uLCBiYXNlSHJlZjogc3RyaW5nLCBvcHRpb25zOiBFeHRyYU9wdGlvbnMgPSB7fSkge1xuICByZXR1cm4gb3B0aW9ucy51c2VIYXNoID8gbmV3IEhhc2hMb2NhdGlvblN0cmF0ZWd5KHBsYXRmb3JtTG9jYXRpb25TdHJhdGVneSwgYmFzZUhyZWYpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQYXRoTG9jYXRpb25TdHJhdGVneShwbGF0Zm9ybUxvY2F0aW9uU3RyYXRlZ3ksIGJhc2VIcmVmKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVGb3JSb290R3VhcmQocm91dGVyOiBSb3V0ZXIpOiBhbnkge1xuICBpZiAocm91dGVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgUm91dGVyTW9kdWxlLmZvclJvb3QoKSBjYWxsZWQgdHdpY2UuIExhenkgbG9hZGVkIG1vZHVsZXMgc2hvdWxkIHVzZSBSb3V0ZXJNb2R1bGUuZm9yQ2hpbGQoKSBpbnN0ZWFkLmApO1xuICB9XG4gIHJldHVybiAnZ3VhcmRlZCc7XG59XG5cbi8qKlxuICogUmVnaXN0ZXJzIGEgW0RJIHByb3ZpZGVyXShndWlkZS9nbG9zc2FyeSNwcm92aWRlcikgZm9yIGEgc2V0IG9mIHJvdXRlcy5cbiAqIEBwYXJhbSByb3V0ZXMgVGhlIHJvdXRlIGNvbmZpZ3VyYXRpb24gdG8gcHJvdmlkZS5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIGBgYFxuICogQE5nTW9kdWxlKHtcbiAqICAgaW1wb3J0czogW1JvdXRlck1vZHVsZS5mb3JDaGlsZChST1VURVMpXSxcbiAqICAgcHJvdmlkZXJzOiBbcHJvdmlkZVJvdXRlcyhFWFRSQV9ST1VURVMpXVxuICogfSlcbiAqIGNsYXNzIE15TmdNb2R1bGUge31cbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVSb3V0ZXMocm91dGVzOiBSb3V0ZXMpOiBhbnkge1xuICByZXR1cm4gW1xuICAgIHtwcm92aWRlOiBBTkFMWVpFX0ZPUl9FTlRSWV9DT01QT05FTlRTLCBtdWx0aTogdHJ1ZSwgdXNlVmFsdWU6IHJvdXRlc30sXG4gICAge3Byb3ZpZGU6IFJPVVRFUywgbXVsdGk6IHRydWUsIHVzZVZhbHVlOiByb3V0ZXN9LFxuICBdO1xufVxuXG4vKipcbiAqIEFsbG93ZWQgdmFsdWVzIGluIGFuIGBFeHRyYU9wdGlvbnNgIG9iamVjdCB0aGF0IGNvbmZpZ3VyZVxuICogd2hlbiB0aGUgcm91dGVyIHBlcmZvcm1zIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gb3BlcmF0aW9uLlxuICpcbiAqICogJ2VuYWJsZWQnIC0gVGhlIGluaXRpYWwgbmF2aWdhdGlvbiBzdGFydHMgYmVmb3JlIHRoZSByb290IGNvbXBvbmVudCBpcyBjcmVhdGVkLlxuICogVGhlIGJvb3RzdHJhcCBpcyBibG9ja2VkIHVudGlsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgY29tcGxldGUuIFRoaXMgdmFsdWUgaXMgcmVxdWlyZWRcbiAqIGZvciBbc2VydmVyLXNpZGUgcmVuZGVyaW5nXShndWlkZS91bml2ZXJzYWwpIHRvIHdvcmsuXG4gKiAqICdkaXNhYmxlZCcgLSBUaGUgaW5pdGlhbCBuYXZpZ2F0aW9uIGlzIG5vdCBwZXJmb3JtZWQuIFRoZSBsb2NhdGlvbiBsaXN0ZW5lciBpcyBzZXQgdXAgYmVmb3JlXG4gKiB0aGUgcm9vdCBjb21wb25lbnQgZ2V0cyBjcmVhdGVkLiBVc2UgaWYgdGhlcmUgaXMgYSByZWFzb24gdG8gaGF2ZVxuICogbW9yZSBjb250cm9sIG92ZXIgd2hlbiB0aGUgcm91dGVyIHN0YXJ0cyBpdHMgaW5pdGlhbCBuYXZpZ2F0aW9uIGR1ZSB0byBzb21lIGNvbXBsZXhcbiAqIGluaXRpYWxpemF0aW9uIGxvZ2ljLlxuICogKiAnbGVnYWN5X2VuYWJsZWQnLSAoRGVmYXVsdCwgZm9yIGNvbXBhdGliaWxpdHkuKSBUaGUgaW5pdGlhbCBuYXZpZ2F0aW9uIHN0YXJ0cyBhZnRlciB0aGUgcm9vdCBjb21wb25lbnQgaGFzIGJlZW4gY3JlYXRlZC5cbiAqIFRoZSBib290c3RyYXAgaXMgbm90IGJsb2NrZWQgdW50aWwgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBpcyBjb21wbGV0ZS4gQGRlcHJlY2F0ZWRcbiAqICogJ2xlZ2FjeV9kaXNhYmxlZCctIFRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgbm90IHBlcmZvcm1lZC4gVGhlIGxvY2F0aW9uIGxpc3RlbmVyIGlzIHNldCB1cFxuICogYWZ0ZXIgdGhlIHJvb3QgY29tcG9uZW50IGdldHMgY3JlYXRlZC4gQGRlcHJlY2F0ZWQgc2luY2UgdjRcbiAqICogYHRydWVgIC0gc2FtZSBhcyAnbGVnYWN5X2VuYWJsZWQnLiBAZGVwcmVjYXRlZCBzaW5jZSB2NFxuICogKiBgZmFsc2VgIC0gc2FtZSBhcyAnbGVnYWN5X2Rpc2FibGVkJy4gQGRlcHJlY2F0ZWQgc2luY2UgdjRcbiAqXG4gKiBUaGUgJ2xlZ2FjeV9lbmFibGVkJyBhbmQgJ2xlZ2FjeV9kaXNhYmxlZCcgc2hvdWxkIG5vdCBiZSB1c2VkIGZvciBuZXcgYXBwbGljYXRpb25zLlxuICpcbiAqIEBzZWUgYGZvclJvb3QoKWBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCB0eXBlIEluaXRpYWxOYXZpZ2F0aW9uID1cbiAgICB0cnVlIHwgZmFsc2UgfCAnZW5hYmxlZCcgfCAnZGlzYWJsZWQnIHwgJ2xlZ2FjeV9lbmFibGVkJyB8ICdsZWdhY3lfZGlzYWJsZWQnO1xuXG4vKipcbiAqIEEgc2V0IG9mIGNvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgYSByb3V0ZXIgbW9kdWxlLCBwcm92aWRlZCBpbiB0aGVcbiAqIGBmb3JSb290KClgIG1ldGhvZC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXh0cmFPcHRpb25zIHtcbiAgLyoqXG4gICAqIFdoZW4gdHJ1ZSwgbG9nIGFsbCBpbnRlcm5hbCBuYXZpZ2F0aW9uIGV2ZW50cyB0byB0aGUgY29uc29sZS5cbiAgICogVXNlIGZvciBkZWJ1Z2dpbmcuXG4gICAqL1xuICBlbmFibGVUcmFjaW5nPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hlbiB0cnVlLCBlbmFibGUgdGhlIGxvY2F0aW9uIHN0cmF0ZWd5IHRoYXQgdXNlcyB0aGUgVVJMIGZyYWdtZW50XG4gICAqIGluc3RlYWQgb2YgdGhlIGhpc3RvcnkgQVBJLlxuICAgKi9cbiAgdXNlSGFzaD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIE9uZSBvZiBgZW5hYmxlZGAgb3IgYGRpc2FibGVkYC5cbiAgICogV2hlbiBzZXQgdG8gYGVuYWJsZWRgLCB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIHN0YXJ0cyBiZWZvcmUgdGhlIHJvb3QgY29tcG9uZW50IGlzIGNyZWF0ZWQuXG4gICAqIFRoZSBib290c3RyYXAgaXMgYmxvY2tlZCB1bnRpbCB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uIGlzIGNvbXBsZXRlLiBUaGlzIHZhbHVlIGlzIHJlcXVpcmVkIGZvclxuICAgKiBbc2VydmVyLXNpZGUgcmVuZGVyaW5nXShndWlkZS91bml2ZXJzYWwpIHRvIHdvcmsuXG4gICAqIFdoZW4gc2V0IHRvIGBkaXNhYmxlZGAsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgbm90IHBlcmZvcm1lZC5cbiAgICogVGhlIGxvY2F0aW9uIGxpc3RlbmVyIGlzIHNldCB1cCBiZWZvcmUgdGhlIHJvb3QgY29tcG9uZW50IGdldHMgY3JlYXRlZC5cbiAgICogVXNlIGlmIHRoZXJlIGlzIGEgcmVhc29uIHRvIGhhdmUgbW9yZSBjb250cm9sIG92ZXIgd2hlbiB0aGUgcm91dGVyXG4gICAqIHN0YXJ0cyBpdHMgaW5pdGlhbCBuYXZpZ2F0aW9uIGR1ZSB0byBzb21lIGNvbXBsZXggaW5pdGlhbGl6YXRpb24gbG9naWMuXG4gICAqXG4gICAqIExlZ2FjeSB2YWx1ZXMgYXJlIGRlcHJlY2F0ZWQgc2luY2UgdjQgYW5kIHNob3VsZCBub3QgYmUgdXNlZCBmb3IgbmV3IGFwcGxpY2F0aW9uczpcbiAgICpcbiAgICogKiBgbGVnYWN5X2VuYWJsZWRgIC0gRGVmYXVsdCBmb3IgY29tcGF0aWJpbGl0eS5cbiAgICogVGhlIGluaXRpYWwgbmF2aWdhdGlvbiBzdGFydHMgYWZ0ZXIgdGhlIHJvb3QgY29tcG9uZW50IGhhcyBiZWVuIGNyZWF0ZWQsXG4gICAqIGJ1dCB0aGUgYm9vdHN0cmFwIGlzIG5vdCBibG9ja2VkIHVudGlsIHRoZSBpbml0aWFsIG5hdmlnYXRpb24gaXMgY29tcGxldGUuXG4gICAqICogYGxlZ2FjeV9kaXNhYmxlZGAgLSBUaGUgaW5pdGlhbCBuYXZpZ2F0aW9uIGlzIG5vdCBwZXJmb3JtZWQuXG4gICAqIFRoZSBsb2NhdGlvbiBsaXN0ZW5lciBpcyBzZXQgdXAgYWZ0ZXIgdGhlIHJvb3QgY29tcG9uZW50IGdldHMgY3JlYXRlZC5cbiAgICogKiBgdHJ1ZWAgLSBzYW1lIGFzIGBsZWdhY3lfZW5hYmxlZGAuXG4gICAqICogYGZhbHNlYCAtIHNhbWUgYXMgYGxlZ2FjeV9kaXNhYmxlZGAuXG4gICAqL1xuICBpbml0aWFsTmF2aWdhdGlvbj86IEluaXRpYWxOYXZpZ2F0aW9uO1xuXG4gIC8qKlxuICAgKiBBIGN1c3RvbSBlcnJvciBoYW5kbGVyIGZvciBmYWlsZWQgbmF2aWdhdGlvbnMuXG4gICAqL1xuICBlcnJvckhhbmRsZXI/OiBFcnJvckhhbmRsZXI7XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgYSBwcmVsb2FkaW5nIHN0cmF0ZWd5LlxuICAgKiBPbmUgb2YgYFByZWxvYWRBbGxNb2R1bGVzYCBvciBgTm9QcmVsb2FkaW5nYCAodGhlIGRlZmF1bHQpLlxuICAgKi9cbiAgcHJlbG9hZGluZ1N0cmF0ZWd5PzogYW55O1xuXG4gIC8qKlxuICAgKiBEZWZpbmUgd2hhdCB0aGUgcm91dGVyIHNob3VsZCBkbyBpZiBpdCByZWNlaXZlcyBhIG5hdmlnYXRpb24gcmVxdWVzdCB0byB0aGUgY3VycmVudCBVUkwuXG4gICAqIERlZmF1bHQgaXMgYGlnbm9yZWAsIHdoaWNoIGNhdXNlcyB0aGUgcm91dGVyIGlnbm9yZXMgdGhlIG5hdmlnYXRpb24uXG4gICAqIFRoaXMgY2FuIGRpc2FibGUgZmVhdHVyZXMgc3VjaCBhcyBhIFwicmVmcmVzaFwiIGJ1dHRvbi5cbiAgICogVXNlIHRoaXMgb3B0aW9uIHRvIGNvbmZpZ3VyZSB0aGUgYmVoYXZpb3Igd2hlbiBuYXZpZ2F0aW5nIHRvIHRoZVxuICAgKiBjdXJyZW50IFVSTC4gRGVmYXVsdCBpcyAnaWdub3JlJy5cbiAgICovXG4gIG9uU2FtZVVybE5hdmlnYXRpb24/OiAncmVsb2FkJ3wnaWdub3JlJztcblxuICAvKipcbiAgICogQ29uZmlndXJlcyBpZiB0aGUgc2Nyb2xsIHBvc2l0aW9uIG5lZWRzIHRvIGJlIHJlc3RvcmVkIHdoZW4gbmF2aWdhdGluZyBiYWNrLlxuICAgKlxuICAgKiAqICdkaXNhYmxlZCctIChEZWZhdWx0KSBEb2VzIG5vdGhpbmcuIFNjcm9sbCBwb3NpdGlvbiBpcyBtYWludGFpbmVkIG9uIG5hdmlnYXRpb24uXG4gICAqICogJ3RvcCctIFNldHMgdGhlIHNjcm9sbCBwb3NpdGlvbiB0byB4ID0gMCwgeSA9IDAgb24gYWxsIG5hdmlnYXRpb24uXG4gICAqICogJ2VuYWJsZWQnLSBSZXN0b3JlcyB0aGUgcHJldmlvdXMgc2Nyb2xsIHBvc2l0aW9uIG9uIGJhY2t3YXJkIG5hdmlnYXRpb24sIGVsc2Ugc2V0cyB0aGVcbiAgICogcG9zaXRpb24gdG8gdGhlIGFuY2hvciBpZiBvbmUgaXMgcHJvdmlkZWQsIG9yIHNldHMgdGhlIHNjcm9sbCBwb3NpdGlvbiB0byBbMCwgMF0gKGZvcndhcmRcbiAgICogbmF2aWdhdGlvbikuIFRoaXMgb3B0aW9uIHdpbGwgYmUgdGhlIGRlZmF1bHQgaW4gdGhlIGZ1dHVyZS5cbiAgICpcbiAgICogWW91IGNhbiBpbXBsZW1lbnQgY3VzdG9tIHNjcm9sbCByZXN0b3JhdGlvbiBiZWhhdmlvciBieSBhZGFwdGluZyB0aGUgZW5hYmxlZCBiZWhhdmlvciBhc1xuICAgKiBpbiB0aGUgZm9sbG93aW5nIGV4YW1wbGUuXG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY2xhc3MgQXBwTW9kdWxlIHtcbiAgICogICBjb25zdHJ1Y3Rvcihyb3V0ZXI6IFJvdXRlciwgdmlld3BvcnRTY3JvbGxlcjogVmlld3BvcnRTY3JvbGxlcikge1xuICAgKiAgICAgcm91dGVyLmV2ZW50cy5waXBlKFxuICAgKiAgICAgICBmaWx0ZXIoKGU6IEV2ZW50KTogZSBpcyBTY3JvbGwgPT4gZSBpbnN0YW5jZW9mIFNjcm9sbClcbiAgICogICAgICkuc3Vic2NyaWJlKGUgPT4ge1xuICAgKiAgICAgICBpZiAoZS5wb3NpdGlvbikge1xuICAgKiAgICAgICAgIC8vIGJhY2t3YXJkIG5hdmlnYXRpb25cbiAgICogICAgICAgICB2aWV3cG9ydFNjcm9sbGVyLnNjcm9sbFRvUG9zaXRpb24oZS5wb3NpdGlvbik7XG4gICAqICAgICAgIH0gZWxzZSBpZiAoZS5hbmNob3IpIHtcbiAgICogICAgICAgICAvLyBhbmNob3IgbmF2aWdhdGlvblxuICAgKiAgICAgICAgIHZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9BbmNob3IoZS5hbmNob3IpO1xuICAgKiAgICAgICB9IGVsc2Uge1xuICAgKiAgICAgICAgIC8vIGZvcndhcmQgbmF2aWdhdGlvblxuICAgKiAgICAgICAgIHZpZXdwb3J0U2Nyb2xsZXIuc2Nyb2xsVG9Qb3NpdGlvbihbMCwgMF0pO1xuICAgKiAgICAgICB9XG4gICAqICAgICB9KTtcbiAgICogICB9XG4gICAqIH1cbiAgICogYGBgXG4gICAqL1xuICBzY3JvbGxQb3NpdGlvblJlc3RvcmF0aW9uPzogJ2Rpc2FibGVkJ3wnZW5hYmxlZCd8J3RvcCc7XG5cbiAgLyoqXG4gICAqIFdoZW4gc2V0IHRvICdlbmFibGVkJywgc2Nyb2xscyB0byB0aGUgYW5jaG9yIGVsZW1lbnQgd2hlbiB0aGUgVVJMIGhhcyBhIGZyYWdtZW50LlxuICAgKiBBbmNob3Igc2Nyb2xsaW5nIGlzIGRpc2FibGVkIGJ5IGRlZmF1bHQuXG4gICAqXG4gICAqIEFuY2hvciBzY3JvbGxpbmcgZG9lcyBub3QgaGFwcGVuIG9uICdwb3BzdGF0ZScuIEluc3RlYWQsIHdlIHJlc3RvcmUgdGhlIHBvc2l0aW9uXG4gICAqIHRoYXQgd2Ugc3RvcmVkIG9yIHNjcm9sbCB0byB0aGUgdG9wLlxuICAgKi9cbiAgYW5jaG9yU2Nyb2xsaW5nPzogJ2Rpc2FibGVkJ3wnZW5hYmxlZCc7XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgdGhlIHNjcm9sbCBvZmZzZXQgdGhlIHJvdXRlciB3aWxsIHVzZSB3aGVuIHNjcm9sbGluZyB0byBhbiBlbGVtZW50LlxuICAgKlxuICAgKiBXaGVuIGdpdmVuIGEgdHVwbGUgd2l0aCB4IGFuZCB5IHBvc2l0aW9uIHZhbHVlLFxuICAgKiB0aGUgcm91dGVyIHVzZXMgdGhhdCBvZmZzZXQgZWFjaCB0aW1lIGl0IHNjcm9sbHMuXG4gICAqIFdoZW4gZ2l2ZW4gYSBmdW5jdGlvbiwgdGhlIHJvdXRlciBpbnZva2VzIHRoZSBmdW5jdGlvbiBldmVyeSB0aW1lXG4gICAqIGl0IHJlc3RvcmVzIHNjcm9sbCBwb3NpdGlvbi5cbiAgICovXG4gIHNjcm9sbE9mZnNldD86IFtudW1iZXIsIG51bWJlcl18KCgpID0+IFtudW1iZXIsIG51bWJlcl0pO1xuXG4gIC8qKlxuICAgKiBEZWZpbmVzIGhvdyB0aGUgcm91dGVyIG1lcmdlcyBwYXJhbWV0ZXJzLCBkYXRhLCBhbmQgcmVzb2x2ZWQgZGF0YSBmcm9tIHBhcmVudCB0byBjaGlsZFxuICAgKiByb3V0ZXMuIEJ5IGRlZmF1bHQgKCdlbXB0eU9ubHknKSwgaW5oZXJpdHMgcGFyZW50IHBhcmFtZXRlcnMgb25seSBmb3JcbiAgICogcGF0aC1sZXNzIG9yIGNvbXBvbmVudC1sZXNzIHJvdXRlcy5cbiAgICogU2V0IHRvICdhbHdheXMnIHRvIGVuYWJsZSB1bmNvbmRpdGlvbmFsIGluaGVyaXRhbmNlIG9mIHBhcmVudCBwYXJhbWV0ZXJzLlxuICAgKi9cbiAgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneT86ICdlbXB0eU9ubHknfCdhbHdheXMnO1xuXG4gIC8qKlxuICAgKiBBIGN1c3RvbSBoYW5kbGVyIGZvciBtYWxmb3JtZWQgVVJJIGVycm9ycy4gVGhlIGhhbmRsZXIgaXMgaW52b2tlZCB3aGVuIGBlbmNvZGVkVVJJYCBjb250YWluc1xuICAgKiBpbnZhbGlkIGNoYXJhY3RlciBzZXF1ZW5jZXMuXG4gICAqIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIGlzIHRvIHJlZGlyZWN0IHRvIHRoZSByb290IFVSTCwgZHJvcHBpbmdcbiAgICogYW55IHBhdGggb3IgcGFyYW1ldGVyIGluZm9ybWF0aW9uLiBUaGUgZnVuY3Rpb24gdGFrZXMgdGhyZWUgcGFyYW1ldGVyczpcbiAgICpcbiAgICogLSBgJ1VSSUVycm9yJ2AgLSBFcnJvciB0aHJvd24gd2hlbiBwYXJzaW5nIGEgYmFkIFVSTC5cbiAgICogLSBgJ1VybFNlcmlhbGl6ZXInYCAtIFVybFNlcmlhbGl6ZXIgdGhhdOKAmXMgY29uZmlndXJlZCB3aXRoIHRoZSByb3V0ZXIuXG4gICAqIC0gYCd1cmwnYCAtICBUaGUgbWFsZm9ybWVkIFVSTCB0aGF0IGNhdXNlZCB0aGUgVVJJRXJyb3JcbiAgICogKi9cbiAgbWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyPzpcbiAgICAgIChlcnJvcjogVVJJRXJyb3IsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIHVybDogc3RyaW5nKSA9PiBVcmxUcmVlO1xuXG4gIC8qKlxuICAgKiBEZWZpbmVzIHdoZW4gdGhlIHJvdXRlciB1cGRhdGVzIHRoZSBicm93c2VyIFVSTC4gQnkgZGVmYXVsdCAoJ2RlZmVycmVkJyksXG4gICAqIHVwZGF0ZSBhZnRlciBzdWNjZXNzZnVsIG5hdmlnYXRpb24uXG4gICAqIFNldCB0byAnZWFnZXInIGlmIHByZWZlciB0byB1cGRhdGUgdGhlIFVSTCBhdCB0aGUgYmVnaW5uaW5nIG9mIG5hdmlnYXRpb24uXG4gICAqIFVwZGF0aW5nIHRoZSBVUkwgZWFybHkgYWxsb3dzIHlvdSB0byBoYW5kbGUgYSBmYWlsdXJlIG9mIG5hdmlnYXRpb24gYnlcbiAgICogc2hvd2luZyBhbiBlcnJvciBtZXNzYWdlIHdpdGggdGhlIFVSTCB0aGF0IGZhaWxlZC5cbiAgICovXG4gIHVybFVwZGF0ZVN0cmF0ZWd5PzogJ2RlZmVycmVkJ3wnZWFnZXInO1xuXG4gIC8qKlxuICAgKiBFbmFibGVzIGEgYnVnIGZpeCB0aGF0IGNvcnJlY3RzIHJlbGF0aXZlIGxpbmsgcmVzb2x1dGlvbiBpbiBjb21wb25lbnRzIHdpdGggZW1wdHkgcGF0aHMuXG4gICAqIEV4YW1wbGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiBjb25zdCByb3V0ZXMgPSBbXG4gICAqICAge1xuICAgKiAgICAgcGF0aDogJycsXG4gICAqICAgICBjb21wb25lbnQ6IENvbnRhaW5lckNvbXBvbmVudCxcbiAgICogICAgIGNoaWxkcmVuOiBbXG4gICAqICAgICAgIHsgcGF0aDogJ2EnLCBjb21wb25lbnQ6IEFDb21wb25lbnQgfSxcbiAgICogICAgICAgeyBwYXRoOiAnYicsIGNvbXBvbmVudDogQkNvbXBvbmVudCB9LFxuICAgKiAgICAgXVxuICAgKiAgIH1cbiAgICogXTtcbiAgICogYGBgXG4gICAqXG4gICAqIEZyb20gdGhlIGBDb250YWluZXJDb21wb25lbnRgLCB0aGlzIHdpbGwgbm90IHdvcms6XG4gICAqXG4gICAqIGA8YSBbcm91dGVyTGlua109XCJbJy4vYSddXCI+TGluayB0byBBPC9hPmBcbiAgICpcbiAgICogSG93ZXZlciwgdGhpcyB3aWxsIHdvcms6XG4gICAqXG4gICAqIGA8YSBbcm91dGVyTGlua109XCJbJy4uL2EnXVwiPkxpbmsgdG8gQTwvYT5gXG4gICAqXG4gICAqIEluIG90aGVyIHdvcmRzLCB5b3UncmUgcmVxdWlyZWQgdG8gdXNlIGAuLi9gIHJhdGhlciB0aGFuIGAuL2AuIFRoaXMgaXMgY3VycmVudGx5IHRoZSBkZWZhdWx0XG4gICAqIGJlaGF2aW9yLiBTZXR0aW5nIHRoaXMgb3B0aW9uIHRvIGBjb3JyZWN0ZWRgIGVuYWJsZXMgdGhlIGZpeC5cbiAgICovXG4gIHJlbGF0aXZlTGlua1Jlc29sdXRpb24/OiAnbGVnYWN5J3wnY29ycmVjdGVkJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwUm91dGVyKFxuICAgIHJlZjogQXBwbGljYXRpb25SZWYsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIGNvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzLFxuICAgIGxvY2F0aW9uOiBMb2NhdGlvbiwgaW5qZWN0b3I6IEluamVjdG9yLCBsb2FkZXI6IE5nTW9kdWxlRmFjdG9yeUxvYWRlciwgY29tcGlsZXI6IENvbXBpbGVyLFxuICAgIGNvbmZpZzogUm91dGVbXVtdLCBvcHRzOiBFeHRyYU9wdGlvbnMgPSB7fSwgdXJsSGFuZGxpbmdTdHJhdGVneT86IFVybEhhbmRsaW5nU3RyYXRlZ3ksXG4gICAgcm91dGVSZXVzZVN0cmF0ZWd5PzogUm91dGVSZXVzZVN0cmF0ZWd5KSB7XG4gIGNvbnN0IHJvdXRlciA9IG5ldyBSb3V0ZXIoXG4gICAgICBudWxsLCB1cmxTZXJpYWxpemVyLCBjb250ZXh0cywgbG9jYXRpb24sIGluamVjdG9yLCBsb2FkZXIsIGNvbXBpbGVyLCBmbGF0dGVuKGNvbmZpZykpO1xuXG4gIGlmICh1cmxIYW5kbGluZ1N0cmF0ZWd5KSB7XG4gICAgcm91dGVyLnVybEhhbmRsaW5nU3RyYXRlZ3kgPSB1cmxIYW5kbGluZ1N0cmF0ZWd5O1xuICB9XG5cbiAgaWYgKHJvdXRlUmV1c2VTdHJhdGVneSkge1xuICAgIHJvdXRlci5yb3V0ZVJldXNlU3RyYXRlZ3kgPSByb3V0ZVJldXNlU3RyYXRlZ3k7XG4gIH1cblxuICBpZiAob3B0cy5lcnJvckhhbmRsZXIpIHtcbiAgICByb3V0ZXIuZXJyb3JIYW5kbGVyID0gb3B0cy5lcnJvckhhbmRsZXI7XG4gIH1cblxuICBpZiAob3B0cy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIpIHtcbiAgICByb3V0ZXIubWFsZm9ybWVkVXJpRXJyb3JIYW5kbGVyID0gb3B0cy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXI7XG4gIH1cblxuICBpZiAob3B0cy5lbmFibGVUcmFjaW5nKSB7XG4gICAgY29uc3QgZG9tID0gZ2V0RE9NKCk7XG4gICAgcm91dGVyLmV2ZW50cy5zdWJzY3JpYmUoKGU6IEV2ZW50KSA9PiB7XG4gICAgICBkb20ubG9nR3JvdXAoYFJvdXRlciBFdmVudDogJHsoPGFueT5lLmNvbnN0cnVjdG9yKS5uYW1lfWApO1xuICAgICAgZG9tLmxvZyhlLnRvU3RyaW5nKCkpO1xuICAgICAgZG9tLmxvZyhlKTtcbiAgICAgIGRvbS5sb2dHcm91cEVuZCgpO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKG9wdHMub25TYW1lVXJsTmF2aWdhdGlvbikge1xuICAgIHJvdXRlci5vblNhbWVVcmxOYXZpZ2F0aW9uID0gb3B0cy5vblNhbWVVcmxOYXZpZ2F0aW9uO1xuICB9XG5cbiAgaWYgKG9wdHMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSkge1xuICAgIHJvdXRlci5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5ID0gb3B0cy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5O1xuICB9XG5cbiAgaWYgKG9wdHMudXJsVXBkYXRlU3RyYXRlZ3kpIHtcbiAgICByb3V0ZXIudXJsVXBkYXRlU3RyYXRlZ3kgPSBvcHRzLnVybFVwZGF0ZVN0cmF0ZWd5O1xuICB9XG5cbiAgaWYgKG9wdHMucmVsYXRpdmVMaW5rUmVzb2x1dGlvbikge1xuICAgIHJvdXRlci5yZWxhdGl2ZUxpbmtSZXNvbHV0aW9uID0gb3B0cy5yZWxhdGl2ZUxpbmtSZXNvbHV0aW9uO1xuICB9XG5cbiAgcmV0dXJuIHJvdXRlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJvb3RSb3V0ZShyb3V0ZXI6IFJvdXRlcik6IEFjdGl2YXRlZFJvdXRlIHtcbiAgcmV0dXJuIHJvdXRlci5yb3V0ZXJTdGF0ZS5yb290O1xufVxuXG4vKipcbiAqIFJvdXRlciBpbml0aWFsaXphdGlvbiByZXF1aXJlcyB0d28gc3RlcHM6XG4gKlxuICogRmlyc3QsIHdlIHN0YXJ0IHRoZSBuYXZpZ2F0aW9uIGluIGEgYEFQUF9JTklUSUFMSVpFUmAgdG8gYmxvY2sgdGhlIGJvb3RzdHJhcCBpZlxuICogYSByZXNvbHZlciBvciBhIGd1YXJkIGV4ZWN1dGVzIGFzeW5jaHJvbm91c2x5LlxuICpcbiAqIE5leHQsIHdlIGFjdHVhbGx5IHJ1biBhY3RpdmF0aW9uIGluIGEgYEJPT1RTVFJBUF9MSVNURU5FUmAsIHVzaW5nIHRoZVxuICogYGFmdGVyUHJlYWN0aXZhdGlvbmAgaG9vayBwcm92aWRlZCBieSB0aGUgcm91dGVyLlxuICogVGhlIHJvdXRlciBuYXZpZ2F0aW9uIHN0YXJ0cywgcmVhY2hlcyB0aGUgcG9pbnQgd2hlbiBwcmVhY3RpdmF0aW9uIGlzIGRvbmUsIGFuZCB0aGVuXG4gKiBwYXVzZXMuIEl0IHdhaXRzIGZvciB0aGUgaG9vayB0byBiZSByZXNvbHZlZC4gV2UgdGhlbiByZXNvbHZlIGl0IG9ubHkgaW4gYSBib290c3RyYXAgbGlzdGVuZXIuXG4gKi9cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBSb3V0ZXJJbml0aWFsaXplciB7XG4gIHByaXZhdGUgaW5pdE5hdmlnYXRpb246IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSByZXN1bHRPZlByZWFjdGl2YXRpb25Eb25lID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGluamVjdG9yOiBJbmplY3Rvcikge31cblxuICBhcHBJbml0aWFsaXplcigpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IHA6IFByb21pc2U8YW55PiA9IHRoaXMuaW5qZWN0b3IuZ2V0KExPQ0FUSU9OX0lOSVRJQUxJWkVELCBQcm9taXNlLnJlc29sdmUobnVsbCkpO1xuICAgIHJldHVybiBwLnRoZW4oKCkgPT4ge1xuICAgICAgbGV0IHJlc29sdmU6IEZ1bmN0aW9uID0gbnVsbCAhO1xuICAgICAgY29uc3QgcmVzID0gbmV3IFByb21pc2UociA9PiByZXNvbHZlID0gcik7XG4gICAgICBjb25zdCByb3V0ZXIgPSB0aGlzLmluamVjdG9yLmdldChSb3V0ZXIpO1xuICAgICAgY29uc3Qgb3B0cyA9IHRoaXMuaW5qZWN0b3IuZ2V0KFJPVVRFUl9DT05GSUdVUkFUSU9OKTtcblxuICAgICAgaWYgKHRoaXMuaXNMZWdhY3lEaXNhYmxlZChvcHRzKSB8fCB0aGlzLmlzTGVnYWN5RW5hYmxlZChvcHRzKSkge1xuICAgICAgICByZXNvbHZlKHRydWUpO1xuXG4gICAgICB9IGVsc2UgaWYgKG9wdHMuaW5pdGlhbE5hdmlnYXRpb24gPT09ICdkaXNhYmxlZCcpIHtcbiAgICAgICAgcm91dGVyLnNldFVwTG9jYXRpb25DaGFuZ2VMaXN0ZW5lcigpO1xuICAgICAgICByZXNvbHZlKHRydWUpO1xuXG4gICAgICB9IGVsc2UgaWYgKG9wdHMuaW5pdGlhbE5hdmlnYXRpb24gPT09ICdlbmFibGVkJykge1xuICAgICAgICByb3V0ZXIuaG9va3MuYWZ0ZXJQcmVhY3RpdmF0aW9uID0gKCkgPT4ge1xuICAgICAgICAgIC8vIG9ubHkgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBzaG91bGQgYmUgZGVsYXllZFxuICAgICAgICAgIGlmICghdGhpcy5pbml0TmF2aWdhdGlvbikge1xuICAgICAgICAgICAgdGhpcy5pbml0TmF2aWdhdGlvbiA9IHRydWU7XG4gICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVzdWx0T2ZQcmVhY3RpdmF0aW9uRG9uZTtcblxuICAgICAgICAgICAgLy8gc3Vic2VxdWVudCBuYXZpZ2F0aW9ucyBzaG91bGQgbm90IGJlIGRlbGF5ZWRcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG9mIChudWxsKSBhcyBhbnk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByb3V0ZXIuaW5pdGlhbE5hdmlnYXRpb24oKTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGluaXRpYWxOYXZpZ2F0aW9uIG9wdGlvbnM6ICcke29wdHMuaW5pdGlhbE5hdmlnYXRpb259J2ApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzO1xuICAgIH0pO1xuICB9XG5cbiAgYm9vdHN0cmFwTGlzdGVuZXIoYm9vdHN0cmFwcGVkQ29tcG9uZW50UmVmOiBDb21wb25lbnRSZWY8YW55Pik6IHZvaWQge1xuICAgIGNvbnN0IG9wdHMgPSB0aGlzLmluamVjdG9yLmdldChST1VURVJfQ09ORklHVVJBVElPTik7XG4gICAgY29uc3QgcHJlbG9hZGVyID0gdGhpcy5pbmplY3Rvci5nZXQoUm91dGVyUHJlbG9hZGVyKTtcbiAgICBjb25zdCByb3V0ZXJTY3JvbGxlciA9IHRoaXMuaW5qZWN0b3IuZ2V0KFJvdXRlclNjcm9sbGVyKTtcbiAgICBjb25zdCByb3V0ZXIgPSB0aGlzLmluamVjdG9yLmdldChSb3V0ZXIpO1xuICAgIGNvbnN0IHJlZiA9IHRoaXMuaW5qZWN0b3IuZ2V0PEFwcGxpY2F0aW9uUmVmPihBcHBsaWNhdGlvblJlZik7XG5cbiAgICBpZiAoYm9vdHN0cmFwcGVkQ29tcG9uZW50UmVmICE9PSByZWYuY29tcG9uZW50c1swXSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzTGVnYWN5RW5hYmxlZChvcHRzKSkge1xuICAgICAgcm91dGVyLmluaXRpYWxOYXZpZ2F0aW9uKCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzTGVnYWN5RGlzYWJsZWQob3B0cykpIHtcbiAgICAgIHJvdXRlci5zZXRVcExvY2F0aW9uQ2hhbmdlTGlzdGVuZXIoKTtcbiAgICB9XG5cbiAgICBwcmVsb2FkZXIuc2V0VXBQcmVsb2FkaW5nKCk7XG4gICAgcm91dGVyU2Nyb2xsZXIuaW5pdCgpO1xuICAgIHJvdXRlci5yZXNldFJvb3RDb21wb25lbnRUeXBlKHJlZi5jb21wb25lbnRUeXBlc1swXSk7XG4gICAgdGhpcy5yZXN1bHRPZlByZWFjdGl2YXRpb25Eb25lLm5leHQobnVsbCAhKTtcbiAgICB0aGlzLnJlc3VsdE9mUHJlYWN0aXZhdGlvbkRvbmUuY29tcGxldGUoKTtcbiAgfVxuXG4gIHByaXZhdGUgaXNMZWdhY3lFbmFibGVkKG9wdHM6IEV4dHJhT3B0aW9ucyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBvcHRzLmluaXRpYWxOYXZpZ2F0aW9uID09PSAnbGVnYWN5X2VuYWJsZWQnIHx8IG9wdHMuaW5pdGlhbE5hdmlnYXRpb24gPT09IHRydWUgfHxcbiAgICAgICAgb3B0cy5pbml0aWFsTmF2aWdhdGlvbiA9PT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBpc0xlZ2FjeURpc2FibGVkKG9wdHM6IEV4dHJhT3B0aW9ucyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBvcHRzLmluaXRpYWxOYXZpZ2F0aW9uID09PSAnbGVnYWN5X2Rpc2FibGVkJyB8fCBvcHRzLmluaXRpYWxOYXZpZ2F0aW9uID09PSBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBwSW5pdGlhbGl6ZXIocjogUm91dGVySW5pdGlhbGl6ZXIpIHtcbiAgcmV0dXJuIHIuYXBwSW5pdGlhbGl6ZXIuYmluZChyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEJvb3RzdHJhcExpc3RlbmVyKHI6IFJvdXRlckluaXRpYWxpemVyKSB7XG4gIHJldHVybiByLmJvb3RzdHJhcExpc3RlbmVyLmJpbmQocik7XG59XG5cbi8qKlxuICogQSBbREkgdG9rZW5dKGd1aWRlL2dsb3NzYXJ5LyNkaS10b2tlbikgZm9yIHRoZSByb3V0ZXIgaW5pdGlhbGl6ZXIgdGhhdFxuICogaXMgY2FsbGVkIGFmdGVyIHRoZSBhcHAgaXMgYm9vdHN0cmFwcGVkLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNvbnN0IFJPVVRFUl9JTklUSUFMSVpFUiA9XG4gICAgbmV3IEluamVjdGlvblRva2VuPChjb21wUmVmOiBDb21wb25lbnRSZWY8YW55PikgPT4gdm9pZD4oJ1JvdXRlciBJbml0aWFsaXplcicpO1xuXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZVJvdXRlckluaXRpYWxpemVyKCkge1xuICByZXR1cm4gW1xuICAgIFJvdXRlckluaXRpYWxpemVyLFxuICAgIHtcbiAgICAgIHByb3ZpZGU6IEFQUF9JTklUSUFMSVpFUixcbiAgICAgIG11bHRpOiB0cnVlLFxuICAgICAgdXNlRmFjdG9yeTogZ2V0QXBwSW5pdGlhbGl6ZXIsXG4gICAgICBkZXBzOiBbUm91dGVySW5pdGlhbGl6ZXJdXG4gICAgfSxcbiAgICB7cHJvdmlkZTogUk9VVEVSX0lOSVRJQUxJWkVSLCB1c2VGYWN0b3J5OiBnZXRCb290c3RyYXBMaXN0ZW5lciwgZGVwczogW1JvdXRlckluaXRpYWxpemVyXX0sXG4gICAge3Byb3ZpZGU6IEFQUF9CT09UU1RSQVBfTElTVEVORVIsIG11bHRpOiB0cnVlLCB1c2VFeGlzdGluZzogUk9VVEVSX0lOSVRJQUxJWkVSfSxcbiAgXTtcbn1cbiJdfQ==