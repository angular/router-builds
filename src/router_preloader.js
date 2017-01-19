/**
*@license
*Copyright Google Inc. All Rights Reserved.
*
*Use of this source code is governed by an MIT-style license that can be
*found in the LICENSE file at https://angular.io/license
*/
import { Compiler, Injectable, Injector, NgModuleFactoryLoader } from '@angular/core/index';
import { from } from 'rxjs/observable/from';
import { of } from 'rxjs/observable/of';
import { _catch } from 'rxjs/operator/catch';
import { concatMap } from 'rxjs/operator/concatMap';
import { filter } from 'rxjs/operator/filter';
import { mergeAll } from 'rxjs/operator/mergeAll';
import { mergeMap } from 'rxjs/operator/mergeMap';
import { NavigationEnd, Router } from './router';
import { RouterConfigLoader } from './router_config_loader';
/**
 * \@whatItDoes Provides a preloading strategy.
 *
 * \@experimental
 * @abstract
 */
export class PreloadingStrategy {
    /**
     * @abstract
     * @param {?} route
     * @param {?} fn
     * @return {?}
     */
    preload(route, fn) { }
}
/**
 * \@whatItDoes Provides a preloading strategy that preloads all modules as quicky as possible.
 *
 * \@howToUse
 *
 * ```
 * RouteModule.forRoot(ROUTES, {preloadingStrategy: PreloadAllModules})
 * ```
 *
 * \@experimental
 */
export class PreloadAllModules {
    /**
     * @param {?} route
     * @param {?} fn
     * @return {?}
     */
    preload(route, fn) {
        return _catch.call(fn(), () => of(null));
    }
}
/**
 * \@whatItDoes Provides a preloading strategy that does not preload any modules.
 *
 * \@description
 *
 * This strategy is enabled by default.
 *
 * \@experimental
 */
export class NoPreloading {
    /**
     * @param {?} route
     * @param {?} fn
     * @return {?}
     */
    preload(route, fn) { return of(null); }
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
 * \@stable
 */
export class RouterPreloader {
    /**
     * @param {?} router
     * @param {?} moduleLoader
     * @param {?} compiler
     * @param {?} injector
     * @param {?} preloadingStrategy
     */
    constructor(router, moduleLoader, compiler, injector, preloadingStrategy) {
        this.router = router;
        this.injector = injector;
        this.preloadingStrategy = preloadingStrategy;
        this.loader = new RouterConfigLoader(moduleLoader, compiler);
    }
    ;
    /**
     * @return {?}
     */
    setUpPreloading() {
        const /** @type {?} */ navigations = filter.call(this.router.events, (e) => e instanceof NavigationEnd);
        this.subscription = concatMap.call(navigations, () => this.preload()).subscribe((v) => { });
    }
    /**
     * @return {?}
     */
    preload() { return this.processRoutes(this.injector, this.router.config); }
    /**
     * @return {?}
     */
    ngOnDestroy() { this.subscription.unsubscribe(); }
    /**
     * @param {?} injector
     * @param {?} routes
     * @return {?}
     */
    processRoutes(injector, routes) {
        const /** @type {?} */ res = [];
        for (const c of routes) {
            // we already have the config loaded, just recurce
            if (c.loadChildren && !c.canLoad && ((c))._loadedConfig) {
                const /** @type {?} */ childConfig = ((c))._loadedConfig;
                res.push(this.processRoutes(childConfig.injector, childConfig.routes));
            }
            else if (c.loadChildren && !c.canLoad) {
                res.push(this.preloadConfig(injector, c));
            }
            else if (c.children) {
                res.push(this.processRoutes(injector, c.children));
            }
        }
        return mergeAll.call(from(res));
    }
    /**
     * @param {?} injector
     * @param {?} route
     * @return {?}
     */
    preloadConfig(injector, route) {
        return this.preloadingStrategy.preload(route, () => {
            const /** @type {?} */ loaded = this.loader.load(injector, route.loadChildren);
            return mergeMap.call(loaded, (config) => {
                const /** @type {?} */ c = route;
                c._loadedConfig = config;
                return this.processRoutes(config.injector, config.routes);
            });
        });
    }
}
RouterPreloader.decorators = [
    { type: Injectable },
];
/** @nocollapse */
RouterPreloader.ctorParameters = () => [
    { type: Router, },
    { type: NgModuleFactoryLoader, },
    { type: Compiler, },
    { type: Injector, },
    { type: PreloadingStrategy, },
];
function RouterPreloader_tsickle_Closure_declarations() {
    /** @type {?} */
    RouterPreloader.decorators;
    /**
     * @nocollapse
     * @type {?}
     */
    RouterPreloader.ctorParameters;
    /** @type {?} */
    RouterPreloader.prototype.loader;
    /** @type {?} */
    RouterPreloader.prototype.subscription;
    /** @type {?} */
    RouterPreloader.prototype.router;
    /** @type {?} */
    RouterPreloader.prototype.injector;
    /** @type {?} */
    RouterPreloader.prototype.preloadingStrategy;
}
//# sourceMappingURL=router_preloader.js.map