/**
 * @fileoverview added by tsickle
 * Generated from: packages/router/src/apply_redirects.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NgModuleRef } from '@angular/core';
import { EmptyError, from, Observable, of } from 'rxjs';
import { catchError, concatAll, every, first, map, mergeMap, tap } from 'rxjs/operators';
import { LoadedRouterConfig } from './config';
import { defaultUrlMatcher, navigationCancelingError, PRIMARY_OUTLET } from './shared';
import { UrlSegmentGroup, UrlTree } from './url_tree';
import { forEach, waitForMap, wrapIntoObservable } from './utils/collection';
import { isCanLoad, isFunction, isUrlTree } from './utils/type_guards';
class NoMatch {
    /**
     * @param {?=} segmentGroup
     */
    constructor(segmentGroup) {
        this.segmentGroup = segmentGroup || null;
    }
}
if (false) {
    /** @type {?} */
    NoMatch.prototype.segmentGroup;
}
class AbsoluteRedirect {
    /**
     * @param {?} urlTree
     */
    constructor(urlTree) {
        this.urlTree = urlTree;
    }
}
if (false) {
    /** @type {?} */
    AbsoluteRedirect.prototype.urlTree;
}
/**
 * @param {?} segmentGroup
 * @return {?}
 */
function noMatch(segmentGroup) {
    return new Observable((/**
     * @param {?} obs
     * @return {?}
     */
    (obs) => obs.error(new NoMatch(segmentGroup))));
}
/**
 * @param {?} newTree
 * @return {?}
 */
function absoluteRedirect(newTree) {
    return new Observable((/**
     * @param {?} obs
     * @return {?}
     */
    (obs) => obs.error(new AbsoluteRedirect(newTree))));
}
/**
 * @param {?} redirectTo
 * @return {?}
 */
function namedOutletsRedirect(redirectTo) {
    return new Observable((/**
     * @param {?} obs
     * @return {?}
     */
    (obs) => obs.error(new Error(`Only absolute redirects can have named outlets. redirectTo: '${redirectTo}'`))));
}
/**
 * @param {?} route
 * @return {?}
 */
function canLoadFails(route) {
    return new Observable((/**
     * @param {?} obs
     * @return {?}
     */
    (obs) => obs.error(navigationCancelingError(`Cannot load children because the guard of the route "path: '${route.path}'" returned false`))));
}
/**
 * Returns the `UrlTree` with the redirection applied.
 *
 * Lazy modules are loaded along the way.
 * @param {?} moduleInjector
 * @param {?} configLoader
 * @param {?} urlSerializer
 * @param {?} urlTree
 * @param {?} config
 * @return {?}
 */
export function applyRedirects(moduleInjector, configLoader, urlSerializer, urlTree, config) {
    return new ApplyRedirects(moduleInjector, configLoader, urlSerializer, urlTree, config).apply();
}
class ApplyRedirects {
    /**
     * @param {?} moduleInjector
     * @param {?} configLoader
     * @param {?} urlSerializer
     * @param {?} urlTree
     * @param {?} config
     */
    constructor(moduleInjector, configLoader, urlSerializer, urlTree, config) {
        this.configLoader = configLoader;
        this.urlSerializer = urlSerializer;
        this.urlTree = urlTree;
        this.config = config;
        this.allowRedirects = true;
        this.ngModule = moduleInjector.get(NgModuleRef);
    }
    /**
     * @return {?}
     */
    apply() {
        /** @type {?} */
        const expanded$ = this.expandSegmentGroup(this.ngModule, this.config, this.urlTree.root, PRIMARY_OUTLET);
        /** @type {?} */
        const urlTrees$ = expanded$.pipe(map((/**
         * @param {?} rootSegmentGroup
         * @return {?}
         */
        (rootSegmentGroup) => this.createUrlTree(rootSegmentGroup, this.urlTree.queryParams, (/** @type {?} */ (this.urlTree.fragment))))));
        return urlTrees$.pipe(catchError((/**
         * @param {?} e
         * @return {?}
         */
        (e) => {
            if (e instanceof AbsoluteRedirect) {
                // after an absolute redirect we do not apply any more redirects!
                this.allowRedirects = false;
                // we need to run matching, so we can fetch all lazy-loaded modules
                return this.match(e.urlTree);
            }
            if (e instanceof NoMatch) {
                throw this.noMatchError(e);
            }
            throw e;
        })));
    }
    /**
     * @private
     * @param {?} tree
     * @return {?}
     */
    match(tree) {
        /** @type {?} */
        const expanded$ = this.expandSegmentGroup(this.ngModule, this.config, tree.root, PRIMARY_OUTLET);
        /** @type {?} */
        const mapped$ = expanded$.pipe(map((/**
         * @param {?} rootSegmentGroup
         * @return {?}
         */
        (rootSegmentGroup) => this.createUrlTree(rootSegmentGroup, tree.queryParams, (/** @type {?} */ (tree.fragment))))));
        return mapped$.pipe(catchError((/**
         * @param {?} e
         * @return {?}
         */
        (e) => {
            if (e instanceof NoMatch) {
                throw this.noMatchError(e);
            }
            throw e;
        })));
    }
    /**
     * @private
     * @param {?} e
     * @return {?}
     */
    noMatchError(e) {
        return new Error(`Cannot match any routes. URL Segment: '${e.segmentGroup}'`);
    }
    /**
     * @private
     * @param {?} rootCandidate
     * @param {?} queryParams
     * @param {?} fragment
     * @return {?}
     */
    createUrlTree(rootCandidate, queryParams, fragment) {
        /** @type {?} */
        const root = rootCandidate.segments.length > 0 ?
            new UrlSegmentGroup([], { [PRIMARY_OUTLET]: rootCandidate }) :
            rootCandidate;
        return new UrlTree(root, queryParams, fragment);
    }
    /**
     * @private
     * @param {?} ngModule
     * @param {?} routes
     * @param {?} segmentGroup
     * @param {?} outlet
     * @return {?}
     */
    expandSegmentGroup(ngModule, routes, segmentGroup, outlet) {
        if (segmentGroup.segments.length === 0 && segmentGroup.hasChildren()) {
            return this.expandChildren(ngModule, routes, segmentGroup)
                .pipe(map((/**
             * @param {?} children
             * @return {?}
             */
            (children) => new UrlSegmentGroup([], children))));
        }
        return this.expandSegment(ngModule, segmentGroup, routes, segmentGroup.segments, outlet, true);
    }
    // Recursively expand segment groups for all the child outlets
    /**
     * @private
     * @param {?} ngModule
     * @param {?} routes
     * @param {?} segmentGroup
     * @return {?}
     */
    expandChildren(ngModule, routes, segmentGroup) {
        return waitForMap(segmentGroup.children, (/**
         * @param {?} childOutlet
         * @param {?} child
         * @return {?}
         */
        (childOutlet, child) => this.expandSegmentGroup(ngModule, routes, child, childOutlet)));
    }
    /**
     * @private
     * @param {?} ngModule
     * @param {?} segmentGroup
     * @param {?} routes
     * @param {?} segments
     * @param {?} outlet
     * @param {?} allowRedirects
     * @return {?}
     */
    expandSegment(ngModule, segmentGroup, routes, segments, outlet, allowRedirects) {
        return of(...routes).pipe(map((/**
         * @param {?} r
         * @return {?}
         */
        (r) => {
            /** @type {?} */
            const expanded$ = this.expandSegmentAgainstRoute(ngModule, segmentGroup, routes, r, segments, outlet, allowRedirects);
            return expanded$.pipe(catchError((/**
             * @param {?} e
             * @return {?}
             */
            (e) => {
                if (e instanceof NoMatch) {
                    // TODO(i): this return type doesn't match the declared Observable<UrlSegmentGroup> -
                    // talk to Jason
                    return (/** @type {?} */ (of(null)));
                }
                throw e;
            })));
        })), concatAll(), first((/**
         * @param {?} s
         * @return {?}
         */
        (s) => !!s)), catchError((/**
         * @param {?} e
         * @param {?} _
         * @return {?}
         */
        (e, _) => {
            if (e instanceof EmptyError || e.name === 'EmptyError') {
                if (this.noLeftoversInUrl(segmentGroup, segments, outlet)) {
                    return of(new UrlSegmentGroup([], {}));
                }
                throw new NoMatch(segmentGroup);
            }
            throw e;
        })));
    }
    /**
     * @private
     * @param {?} segmentGroup
     * @param {?} segments
     * @param {?} outlet
     * @return {?}
     */
    noLeftoversInUrl(segmentGroup, segments, outlet) {
        return segments.length === 0 && !segmentGroup.children[outlet];
    }
    /**
     * @private
     * @param {?} ngModule
     * @param {?} segmentGroup
     * @param {?} routes
     * @param {?} route
     * @param {?} paths
     * @param {?} outlet
     * @param {?} allowRedirects
     * @return {?}
     */
    expandSegmentAgainstRoute(ngModule, segmentGroup, routes, route, paths, outlet, allowRedirects) {
        if (getOutlet(route) !== outlet) {
            return noMatch(segmentGroup);
        }
        if (route.redirectTo === undefined) {
            return this.matchSegmentAgainstRoute(ngModule, segmentGroup, route, paths);
        }
        if (allowRedirects && this.allowRedirects) {
            return this.expandSegmentAgainstRouteUsingRedirect(ngModule, segmentGroup, routes, route, paths, outlet);
        }
        return noMatch(segmentGroup);
    }
    /**
     * @private
     * @param {?} ngModule
     * @param {?} segmentGroup
     * @param {?} routes
     * @param {?} route
     * @param {?} segments
     * @param {?} outlet
     * @return {?}
     */
    expandSegmentAgainstRouteUsingRedirect(ngModule, segmentGroup, routes, route, segments, outlet) {
        if (route.path === '**') {
            return this.expandWildCardWithParamsAgainstRouteUsingRedirect(ngModule, routes, route, outlet);
        }
        return this.expandRegularSegmentAgainstRouteUsingRedirect(ngModule, segmentGroup, routes, route, segments, outlet);
    }
    /**
     * @private
     * @param {?} ngModule
     * @param {?} routes
     * @param {?} route
     * @param {?} outlet
     * @return {?}
     */
    expandWildCardWithParamsAgainstRouteUsingRedirect(ngModule, routes, route, outlet) {
        /** @type {?} */
        const newTree = this.applyRedirectCommands([], (/** @type {?} */ (route.redirectTo)), {});
        if ((/** @type {?} */ (route.redirectTo)).startsWith('/')) {
            return absoluteRedirect(newTree);
        }
        return this.lineralizeSegments(route, newTree).pipe(mergeMap((/**
         * @param {?} newSegments
         * @return {?}
         */
        (newSegments) => {
            /** @type {?} */
            const group = new UrlSegmentGroup(newSegments, {});
            return this.expandSegment(ngModule, group, routes, newSegments, outlet, false);
        })));
    }
    /**
     * @private
     * @param {?} ngModule
     * @param {?} segmentGroup
     * @param {?} routes
     * @param {?} route
     * @param {?} segments
     * @param {?} outlet
     * @return {?}
     */
    expandRegularSegmentAgainstRouteUsingRedirect(ngModule, segmentGroup, routes, route, segments, outlet) {
        const { matched, consumedSegments, lastChild, positionalParamSegments } = match(segmentGroup, route, segments);
        if (!matched)
            return noMatch(segmentGroup);
        /** @type {?} */
        const newTree = this.applyRedirectCommands(consumedSegments, (/** @type {?} */ (route.redirectTo)), (/** @type {?} */ (positionalParamSegments)));
        if ((/** @type {?} */ (route.redirectTo)).startsWith('/')) {
            return absoluteRedirect(newTree);
        }
        return this.lineralizeSegments(route, newTree).pipe(mergeMap((/**
         * @param {?} newSegments
         * @return {?}
         */
        (newSegments) => {
            return this.expandSegment(ngModule, segmentGroup, routes, newSegments.concat(segments.slice(lastChild)), outlet, false);
        })));
    }
    /**
     * @private
     * @param {?} ngModule
     * @param {?} rawSegmentGroup
     * @param {?} route
     * @param {?} segments
     * @return {?}
     */
    matchSegmentAgainstRoute(ngModule, rawSegmentGroup, route, segments) {
        if (route.path === '**') {
            if (route.loadChildren) {
                return this.configLoader.load(ngModule.injector, route)
                    .pipe(map((/**
                 * @param {?} cfg
                 * @return {?}
                 */
                (cfg) => {
                    route._loadedConfig = cfg;
                    return new UrlSegmentGroup(segments, {});
                })));
            }
            return of(new UrlSegmentGroup(segments, {}));
        }
        const { matched, consumedSegments, lastChild } = match(rawSegmentGroup, route, segments);
        if (!matched)
            return noMatch(rawSegmentGroup);
        /** @type {?} */
        const rawSlicedSegments = segments.slice(lastChild);
        /** @type {?} */
        const childConfig$ = this.getChildConfig(ngModule, route, segments);
        return childConfig$.pipe(mergeMap((/**
         * @param {?} routerConfig
         * @return {?}
         */
        (routerConfig) => {
            /** @type {?} */
            const childModule = routerConfig.module;
            /** @type {?} */
            const childConfig = routerConfig.routes;
            const { segmentGroup, slicedSegments } = split(rawSegmentGroup, consumedSegments, rawSlicedSegments, childConfig);
            if (slicedSegments.length === 0 && segmentGroup.hasChildren()) {
                /** @type {?} */
                const expanded$ = this.expandChildren(childModule, childConfig, segmentGroup);
                return expanded$.pipe(map((/**
                 * @param {?} children
                 * @return {?}
                 */
                (children) => new UrlSegmentGroup(consumedSegments, children))));
            }
            if (childConfig.length === 0 && slicedSegments.length === 0) {
                return of(new UrlSegmentGroup(consumedSegments, {}));
            }
            /** @type {?} */
            const expanded$ = this.expandSegment(childModule, segmentGroup, childConfig, slicedSegments, PRIMARY_OUTLET, true);
            return expanded$.pipe(map((/**
             * @param {?} cs
             * @return {?}
             */
            (cs) => new UrlSegmentGroup(consumedSegments.concat(cs.segments), cs.children))));
        })));
    }
    /**
     * @private
     * @param {?} ngModule
     * @param {?} route
     * @param {?} segments
     * @return {?}
     */
    getChildConfig(ngModule, route, segments) {
        if (route.children) {
            // The children belong to the same module
            return of(new LoadedRouterConfig(route.children, ngModule));
        }
        if (route.loadChildren) {
            // lazy children belong to the loaded module
            if (route._loadedConfig !== undefined) {
                return of(route._loadedConfig);
            }
            return this.runCanLoadGuards(ngModule.injector, route, segments)
                .pipe(mergeMap((/**
             * @param {?} shouldLoadResult
             * @return {?}
             */
            (shouldLoadResult) => {
                if (shouldLoadResult) {
                    return this.configLoader.load(ngModule.injector, route)
                        .pipe(map((/**
                     * @param {?} cfg
                     * @return {?}
                     */
                    (cfg) => {
                        route._loadedConfig = cfg;
                        return cfg;
                    })));
                }
                return canLoadFails(route);
            })));
        }
        return of(new LoadedRouterConfig([], ngModule));
    }
    /**
     * @private
     * @param {?} moduleInjector
     * @param {?} route
     * @param {?} segments
     * @return {?}
     */
    runCanLoadGuards(moduleInjector, route, segments) {
        /** @type {?} */
        const canLoad = route.canLoad;
        if (!canLoad || canLoad.length === 0)
            return of(true);
        /** @type {?} */
        const obs = from(canLoad).pipe(map((/**
         * @param {?} injectionToken
         * @return {?}
         */
        (injectionToken) => {
            /** @type {?} */
            const guard = moduleInjector.get(injectionToken);
            /** @type {?} */
            let guardVal;
            if (isCanLoad(guard)) {
                guardVal = guard.canLoad(route, segments);
            }
            else if (isFunction(guard)) {
                guardVal = guard(route, segments);
            }
            else {
                throw new Error('Invalid CanLoad guard');
            }
            return wrapIntoObservable(guardVal);
        })));
        return obs.pipe(concatAll(), tap((/**
         * @param {?} result
         * @return {?}
         */
        (result) => {
            if (!isUrlTree(result))
                return;
            /** @type {?} */
            const error = navigationCancelingError(`Redirecting to "${this.urlSerializer.serialize(result)}"`);
            error.url = result;
            throw error;
        })), every((/**
         * @param {?} result
         * @return {?}
         */
        result => result === true)));
    }
    /**
     * @private
     * @param {?} route
     * @param {?} urlTree
     * @return {?}
     */
    lineralizeSegments(route, urlTree) {
        /** @type {?} */
        let res = [];
        /** @type {?} */
        let c = urlTree.root;
        while (true) {
            res = res.concat(c.segments);
            if (c.numberOfChildren === 0) {
                return of(res);
            }
            if (c.numberOfChildren > 1 || !c.children[PRIMARY_OUTLET]) {
                return namedOutletsRedirect((/** @type {?} */ (route.redirectTo)));
            }
            c = c.children[PRIMARY_OUTLET];
        }
    }
    /**
     * @private
     * @param {?} segments
     * @param {?} redirectTo
     * @param {?} posParams
     * @return {?}
     */
    applyRedirectCommands(segments, redirectTo, posParams) {
        return this.applyRedirectCreatreUrlTree(redirectTo, this.urlSerializer.parse(redirectTo), segments, posParams);
    }
    /**
     * @private
     * @param {?} redirectTo
     * @param {?} urlTree
     * @param {?} segments
     * @param {?} posParams
     * @return {?}
     */
    applyRedirectCreatreUrlTree(redirectTo, urlTree, segments, posParams) {
        /** @type {?} */
        const newRoot = this.createSegmentGroup(redirectTo, urlTree.root, segments, posParams);
        return new UrlTree(newRoot, this.createQueryParams(urlTree.queryParams, this.urlTree.queryParams), urlTree.fragment);
    }
    /**
     * @private
     * @param {?} redirectToParams
     * @param {?} actualParams
     * @return {?}
     */
    createQueryParams(redirectToParams, actualParams) {
        /** @type {?} */
        const res = {};
        forEach(redirectToParams, (/**
         * @param {?} v
         * @param {?} k
         * @return {?}
         */
        (v, k) => {
            /** @type {?} */
            const copySourceValue = typeof v === 'string' && v.startsWith(':');
            if (copySourceValue) {
                /** @type {?} */
                const sourceName = v.substring(1);
                res[k] = actualParams[sourceName];
            }
            else {
                res[k] = v;
            }
        }));
        return res;
    }
    /**
     * @private
     * @param {?} redirectTo
     * @param {?} group
     * @param {?} segments
     * @param {?} posParams
     * @return {?}
     */
    createSegmentGroup(redirectTo, group, segments, posParams) {
        /** @type {?} */
        const updatedSegments = this.createSegments(redirectTo, group.segments, segments, posParams);
        /** @type {?} */
        let children = {};
        forEach(group.children, (/**
         * @param {?} child
         * @param {?} name
         * @return {?}
         */
        (child, name) => {
            children[name] = this.createSegmentGroup(redirectTo, child, segments, posParams);
        }));
        return new UrlSegmentGroup(updatedSegments, children);
    }
    /**
     * @private
     * @param {?} redirectTo
     * @param {?} redirectToSegments
     * @param {?} actualSegments
     * @param {?} posParams
     * @return {?}
     */
    createSegments(redirectTo, redirectToSegments, actualSegments, posParams) {
        return redirectToSegments.map((/**
         * @param {?} s
         * @return {?}
         */
        s => s.path.startsWith(':') ? this.findPosParam(redirectTo, s, posParams) :
            this.findOrReturn(s, actualSegments)));
    }
    /**
     * @private
     * @param {?} redirectTo
     * @param {?} redirectToUrlSegment
     * @param {?} posParams
     * @return {?}
     */
    findPosParam(redirectTo, redirectToUrlSegment, posParams) {
        /** @type {?} */
        const pos = posParams[redirectToUrlSegment.path.substring(1)];
        if (!pos)
            throw new Error(`Cannot redirect to '${redirectTo}'. Cannot find '${redirectToUrlSegment.path}'.`);
        return pos;
    }
    /**
     * @private
     * @param {?} redirectToUrlSegment
     * @param {?} actualSegments
     * @return {?}
     */
    findOrReturn(redirectToUrlSegment, actualSegments) {
        /** @type {?} */
        let idx = 0;
        for (const s of actualSegments) {
            if (s.path === redirectToUrlSegment.path) {
                actualSegments.splice(idx);
                return s;
            }
            idx++;
        }
        return redirectToUrlSegment;
    }
}
if (false) {
    /**
     * @type {?}
     * @private
     */
    ApplyRedirects.prototype.allowRedirects;
    /**
     * @type {?}
     * @private
     */
    ApplyRedirects.prototype.ngModule;
    /**
     * @type {?}
     * @private
     */
    ApplyRedirects.prototype.configLoader;
    /**
     * @type {?}
     * @private
     */
    ApplyRedirects.prototype.urlSerializer;
    /**
     * @type {?}
     * @private
     */
    ApplyRedirects.prototype.urlTree;
    /**
     * @type {?}
     * @private
     */
    ApplyRedirects.prototype.config;
}
/**
 * @param {?} segmentGroup
 * @param {?} route
 * @param {?} segments
 * @return {?}
 */
function match(segmentGroup, route, segments) {
    if (route.path === '') {
        if ((route.pathMatch === 'full') && (segmentGroup.hasChildren() || segments.length > 0)) {
            return { matched: false, consumedSegments: [], lastChild: 0, positionalParamSegments: {} };
        }
        return { matched: true, consumedSegments: [], lastChild: 0, positionalParamSegments: {} };
    }
    /** @type {?} */
    const matcher = route.matcher || defaultUrlMatcher;
    /** @type {?} */
    const res = matcher(segments, segmentGroup, route);
    if (!res) {
        return {
            matched: false,
            consumedSegments: (/** @type {?} */ ([])),
            lastChild: 0,
            positionalParamSegments: {},
        };
    }
    return {
        matched: true,
        consumedSegments: (/** @type {?} */ (res.consumed)),
        lastChild: (/** @type {?} */ (res.consumed.length)),
        positionalParamSegments: (/** @type {?} */ (res.posParams)),
    };
}
/**
 * @param {?} segmentGroup
 * @param {?} consumedSegments
 * @param {?} slicedSegments
 * @param {?} config
 * @return {?}
 */
function split(segmentGroup, consumedSegments, slicedSegments, config) {
    if (slicedSegments.length > 0 &&
        containsEmptyPathRedirectsWithNamedOutlets(segmentGroup, slicedSegments, config)) {
        /** @type {?} */
        const s = new UrlSegmentGroup(consumedSegments, createChildrenForEmptySegments(config, new UrlSegmentGroup(slicedSegments, segmentGroup.children)));
        return { segmentGroup: mergeTrivialChildren(s), slicedSegments: [] };
    }
    if (slicedSegments.length === 0 &&
        containsEmptyPathRedirects(segmentGroup, slicedSegments, config)) {
        /** @type {?} */
        const s = new UrlSegmentGroup(segmentGroup.segments, addEmptySegmentsToChildrenIfNeeded(segmentGroup, slicedSegments, config, segmentGroup.children));
        return { segmentGroup: mergeTrivialChildren(s), slicedSegments };
    }
    return { segmentGroup, slicedSegments };
}
/**
 * @param {?} s
 * @return {?}
 */
function mergeTrivialChildren(s) {
    if (s.numberOfChildren === 1 && s.children[PRIMARY_OUTLET]) {
        /** @type {?} */
        const c = s.children[PRIMARY_OUTLET];
        return new UrlSegmentGroup(s.segments.concat(c.segments), c.children);
    }
    return s;
}
/**
 * @param {?} segmentGroup
 * @param {?} slicedSegments
 * @param {?} routes
 * @param {?} children
 * @return {?}
 */
function addEmptySegmentsToChildrenIfNeeded(segmentGroup, slicedSegments, routes, children) {
    /** @type {?} */
    const res = {};
    for (const r of routes) {
        if (isEmptyPathRedirect(segmentGroup, slicedSegments, r) && !children[getOutlet(r)]) {
            res[getOutlet(r)] = new UrlSegmentGroup([], {});
        }
    }
    return Object.assign(Object.assign({}, children), res);
}
/**
 * @param {?} routes
 * @param {?} primarySegmentGroup
 * @return {?}
 */
function createChildrenForEmptySegments(routes, primarySegmentGroup) {
    /** @type {?} */
    const res = {};
    res[PRIMARY_OUTLET] = primarySegmentGroup;
    for (const r of routes) {
        if (r.path === '' && getOutlet(r) !== PRIMARY_OUTLET) {
            res[getOutlet(r)] = new UrlSegmentGroup([], {});
        }
    }
    return res;
}
/**
 * @param {?} segmentGroup
 * @param {?} segments
 * @param {?} routes
 * @return {?}
 */
function containsEmptyPathRedirectsWithNamedOutlets(segmentGroup, segments, routes) {
    return routes.some((/**
     * @param {?} r
     * @return {?}
     */
    r => isEmptyPathRedirect(segmentGroup, segments, r) && getOutlet(r) !== PRIMARY_OUTLET));
}
/**
 * @param {?} segmentGroup
 * @param {?} segments
 * @param {?} routes
 * @return {?}
 */
function containsEmptyPathRedirects(segmentGroup, segments, routes) {
    return routes.some((/**
     * @param {?} r
     * @return {?}
     */
    r => isEmptyPathRedirect(segmentGroup, segments, r)));
}
/**
 * @param {?} segmentGroup
 * @param {?} segments
 * @param {?} r
 * @return {?}
 */
function isEmptyPathRedirect(segmentGroup, segments, r) {
    if ((segmentGroup.hasChildren() || segments.length > 0) && r.pathMatch === 'full') {
        return false;
    }
    return r.path === '' && r.redirectTo !== undefined;
}
/**
 * @param {?} route
 * @return {?}
 */
function getOutlet(route) {
    return route.outlet || PRIMARY_OUTLET;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHlfcmVkaXJlY3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9hcHBseV9yZWRpcmVjdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBUUEsT0FBTyxFQUFXLFdBQVcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNwRCxPQUFPLEVBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQVksRUFBRSxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQ2hFLE9BQU8sRUFBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUV2RixPQUFPLEVBQUMsa0JBQWtCLEVBQWdCLE1BQU0sVUFBVSxDQUFDO0FBRzNELE9BQU8sRUFBQyxpQkFBaUIsRUFBRSx3QkFBd0IsRUFBVSxjQUFjLEVBQUMsTUFBTSxVQUFVLENBQUM7QUFDN0YsT0FBTyxFQUFhLGVBQWUsRUFBaUIsT0FBTyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQy9FLE9BQU8sRUFBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLGtCQUFrQixFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDM0UsT0FBTyxFQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFDLE1BQU0scUJBQXFCLENBQUM7QUFFckUsTUFBTSxPQUFPOzs7O0lBR1gsWUFBWSxZQUE4QjtRQUN4QyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksSUFBSSxJQUFJLENBQUM7SUFDM0MsQ0FBQztDQUNGOzs7SUFMQywrQkFBMEM7O0FBTzVDLE1BQU0sZ0JBQWdCOzs7O0lBQ3BCLFlBQW1CLE9BQWdCO1FBQWhCLFlBQU8sR0FBUCxPQUFPLENBQVM7SUFBRyxDQUFDO0NBQ3hDOzs7SUFEYSxtQ0FBdUI7Ozs7OztBQUdyQyxTQUFTLE9BQU8sQ0FBQyxZ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QUFFLEVBQUUsQ0FBQyxDQUFDO1NBQ2pEO0tBQ0Y7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7Ozs7Ozs7QUFFRCxTQUFTLDBDQUEwQyxDQUMvQyxZQUE2QixFQUFFLFFBQXNCLEVBQUUsTUFBZTtJQUN4RSxPQUFPLE1BQU0sQ0FBQyxJQUFJOzs7O0lBQ2QsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxjQUFjLEVBQUMsQ0FBQztBQUM5RixDQUFDOzs7Ozs7O0FBRUQsU0FBUywwQkFBMEIsQ0FDL0IsWUFBNkIsRUFBRSxRQUFzQixFQUFFLE1BQWU7SUFDeEUsT0FBTyxNQUFNLENBQUMsSUFBSTs7OztJQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDO0FBQzFFLENBQUM7Ozs7Ozs7QUFFRCxTQUFTLG1CQUFtQixDQUN4QixZQUE2QixFQUFFLFFBQXNCLEVBQUUsQ0FBUTtJQUNqRSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsS0FBSyxNQUFNLEVBQUU7UUFDakYsT0FBTyxLQUFLLENBQUM7S0FDZDtJQUVELE9BQU8sQ0FBQyxDQUFDLElBQUksS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLFVBQVUsS0FBSyxTQUFTLENBQUM7QUFDckQsQ0FBQzs7Ozs7QUFFRCxTQUFTLFNBQVMsQ0FBQyxLQUFZO0lBQzdCLE9BQU8sS0FBSyxDQUFDLE1BQU0sSUFBSSxjQUFjLENBQUM7QUFDeEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtJbmplY3RvciwgTmdNb2R1bGVSZWZ9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtFbXB0eUVycm9yLCBmcm9tLCBPYnNlcnZhYmxlLCBPYnNlcnZlciwgb2Z9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjYXRjaEVycm9yLCBjb25jYXRBbGwsIGV2ZXJ5LCBmaXJzdCwgbWFwLCBtZXJnZU1hcCwgdGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmltcG9ydCB7TG9hZGVkUm91dGVyQ29uZmlnLCBSb3V0ZSwgUm91dGVzfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge0NhbkxvYWRGbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7Um91dGVyQ29uZmlnTG9hZGVyfSBmcm9tICcuL3JvdXRlcl9jb25maWdfbG9hZGVyJztcbmltcG9ydCB7ZGVmYXVsdFVybE1hdGNoZXIsIG5hdmlnYXRpb25DYW5jZWxpbmdFcnJvciwgUGFyYW1zLCBQUklNQVJZX09VVExFVH0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtVcmxTZWdtZW50LCBVcmxTZWdtZW50R3JvdXAsIFVybFNlcmlhbGl6ZXIsIFVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtmb3JFYWNoLCB3YWl0Rm9yTWFwLCB3cmFwSW50b09ic2VydmFibGV9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5pbXBvcnQge2lzQ2FuTG9hZCwgaXNGdW5jdGlvbiwgaXNVcmxUcmVlfSBmcm9tICcuL3V0aWxzL3R5cGVfZ3VhcmRzJztcblxuY2xhc3MgTm9NYXRjaCB7XG4gIHB1YmxpYyBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cHxudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHNlZ21lbnRHcm91cD86IFVybFNlZ21lbnRHcm91cCkge1xuICAgIHRoaXMuc2VnbWVudEdyb3VwID0gc2VnbWVudEdyb3VwIHx8IG51bGw7XG4gIH1cbn1cblxuY2xhc3MgQWJzb2x1dGVSZWRpcmVjdCB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyB1cmxUcmVlOiBVcmxUcmVlKSB7fVxufVxuXG5mdW5jdGlvbiBub01hdGNoKHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4oXG4gICAgICAob2JzOiBPYnNlcnZlcjxVcmxTZWdtZW50R3JvdXA+KSA9PiBvYnMuZXJyb3IobmV3IE5vTWF0Y2goc2VnbWVudEdyb3VwKSkpO1xufVxuXG5mdW5jdGlvbiBhYnNvbHV0ZVJlZGlyZWN0KG5ld1RyZWU6IFVybFRyZWUpOiBPYnNlcnZhYmxlPGFueT4ge1xuICByZXR1cm4gbmV3IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPihcbiAgICAgIChvYnM6IE9ic2VydmVyPFVybFNlZ21lbnRHcm91cD4pID0+IG9icy5lcnJvcihuZXcgQWJzb2x1dGVSZWRpcmVjdChuZXdUcmVlKSkpO1xufVxuXG5mdW5jdGlvbiBuYW1lZE91dGxldHNSZWRpcmVjdChyZWRpcmVjdFRvOiBzdHJpbmcpOiBPYnNlcnZhYmxlPGFueT4ge1xuICByZXR1cm4gbmV3IE9ic2VydmFibGU8VXJsU2VnbWVudEdyb3VwPihcbiAgICAgIChvYnM6IE9ic2VydmVyPFVybFNlZ21lbnRHcm91cD4pID0+IG9icy5lcnJvcihuZXcgRXJyb3IoXG4gICAgICAgICAgYE9ubHkgYWJzb2x1dGUgcmVkaXJlY3RzIGNhbiBoYXZlIG5hbWVkIG91dGxldHMuIHJlZGlyZWN0VG86ICcke3JlZGlyZWN0VG99J2ApKSk7XG59XG5cbmZ1bmN0aW9uIGNhbkxvYWRGYWlscyhyb3V0ZTogUm91dGUpOiBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4ge1xuICByZXR1cm4gbmV3IE9ic2VydmFibGU8TG9hZGVkUm91dGVyQ29uZmlnPihcbiAgICAgIChvYnM6IE9ic2VydmVyPExvYWRlZFJvdXRlckNvbmZpZz4pID0+IG9icy5lcnJvcihcbiAgICAgICAgICBuYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoYENhbm5vdCBsb2FkIGNoaWxkcmVuIGJlY2F1c2UgdGhlIGd1YXJkIG9mIHRoZSByb3V0ZSBcInBhdGg6ICcke1xuICAgICAgICAgICAgICByb3V0ZS5wYXRofSdcIiByZXR1cm5lZCBmYWxzZWApKSk7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgYFVybFRyZWVgIHdpdGggdGhlIHJlZGlyZWN0aW9uIGFwcGxpZWQuXG4gKlxuICogTGF6eSBtb2R1bGVzIGFyZSBsb2FkZWQgYWxvbmcgdGhlIHdheS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UmVkaXJlY3RzKFxuICAgIG1vZHVsZUluamVjdG9yOiBJbmplY3RvciwgY29uZmlnTG9hZGVyOiBSb3V0ZXJDb25maWdMb2FkZXIsIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsXG4gICAgdXJsVHJlZTogVXJsVHJlZSwgY29uZmlnOiBSb3V0ZXMpOiBPYnNlcnZhYmxlPFVybFRyZWU+IHtcbiAgcmV0dXJuIG5ldyBBcHBseVJlZGlyZWN0cyhtb2R1bGVJbmplY3RvciwgY29uZmlnTG9hZGVyLCB1cmxTZXJpYWxpemVyLCB1cmxUcmVlLCBjb25maWcpLmFwcGx5KCk7XG59XG5cbmNsYXNzIEFwcGx5UmVkaXJlY3RzIHtcbiAgcHJpdmF0ZSBhbGxvd1JlZGlyZWN0czogYm9vbGVhbiA9IHRydWU7XG4gIHByaXZhdGUgbmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBtb2R1bGVJbmplY3RvcjogSW5qZWN0b3IsIHByaXZhdGUgY29uZmlnTG9hZGVyOiBSb3V0ZXJDb25maWdMb2FkZXIsXG4gICAgICBwcml2YXRlIHVybFNlcmlhbGl6ZXI6IFVybFNlcmlhbGl6ZXIsIHByaXZhdGUgdXJsVHJlZTogVXJsVHJlZSwgcHJpdmF0ZSBjb25maWc6IFJvdXRlcykge1xuICAgIHRoaXMubmdNb2R1bGUgPSBtb2R1bGVJbmplY3Rvci5nZXQoTmdNb2R1bGVSZWYpO1xuICB9XG5cbiAgYXBwbHkoKTogT2JzZXJ2YWJsZTxVcmxUcmVlPiB7XG4gICAgY29uc3QgZXhwYW5kZWQkID1cbiAgICAgICAgdGhpcy5leHBhbmRTZWdtZW50R3JvdXAodGhpcy5uZ01vZHVsZSwgdGhpcy5jb25maWcsIHRoaXMudXJsVHJlZS5yb290LCBQUklNQVJZX09VVExFVCk7XG4gICAgY29uc3QgdXJsVHJlZXMkID0gZXhwYW5kZWQkLnBpcGUoXG4gICAgICAgIG1hcCgocm9vdFNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKSA9PiB0aGlzLmNyZWF0ZVVybFRyZWUoXG4gICAgICAgICAgICAgICAgcm9vdFNlZ21lbnRHcm91cCwgdGhpcy51cmxUcmVlLnF1ZXJ5UGFyYW1zLCB0aGlzLnVybFRyZWUuZnJhZ21lbnQhKSkpO1xuICAgIHJldHVybiB1cmxUcmVlcyQucGlwZShjYXRjaEVycm9yKChlOiBhbnkpID0+IHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgQWJzb2x1dGVSZWRpcmVjdCkge1xuICAgICAgICAvLyBhZnRlciBhbiBhYnNvbHV0ZSByZWRpcmVjdCB3ZSBkbyBub3QgYXBwbHkgYW55IG1vcmUgcmVkaXJlY3RzIVxuICAgICAgICB0aGlzLmFsbG93UmVkaXJlY3RzID0gZmFsc2U7XG4gICAgICAgIC8vIHdlIG5lZWQgdG8gcnVuIG1hdGNoaW5nLCBzbyB3ZSBjYW4gZmV0Y2ggYWxsIGxhenktbG9hZGVkIG1vZHVsZXNcbiAgICAgICAgcmV0dXJuIHRoaXMubWF0Y2goZS51cmxUcmVlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOb01hdGNoKSB7XG4gICAgICAgIHRocm93IHRoaXMubm9NYXRjaEVycm9yKGUpO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlO1xuICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgbWF0Y2godHJlZTogVXJsVHJlZSk6IE9ic2VydmFibGU8VXJsVHJlZT4ge1xuICAgIGNvbnN0IGV4cGFuZGVkJCA9XG4gICAgICAgIHRoaXMuZXhwYW5kU2VnbWVudEdyb3VwKHRoaXMubmdNb2R1bGUsIHRoaXMuY29uZmlnLCB0cmVlLnJvb3QsIFBSSU1BUllfT1VUTEVUKTtcbiAgICBjb25zdCBtYXBwZWQkID0gZXhwYW5kZWQkLnBpcGUoXG4gICAgICAgIG1hcCgocm9vdFNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKSA9PlxuICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlVXJsVHJlZShyb290U2VnbWVudEdyb3VwLCB0cmVlLnF1ZXJ5UGFyYW1zLCB0cmVlLmZyYWdtZW50ISkpKTtcbiAgICByZXR1cm4gbWFwcGVkJC5waXBlKGNhdGNoRXJyb3IoKGU6IGFueSk6IE9ic2VydmFibGU8VXJsVHJlZT4gPT4ge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOb01hdGNoKSB7XG4gICAgICAgIHRocm93IHRoaXMubm9NYXRjaEVycm9yKGUpO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlO1xuICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgbm9NYXRjaEVycm9yKGU6IE5vTWF0Y2gpOiBhbnkge1xuICAgIHJldHVybiBuZXcgRXJyb3IoYENhbm5vdCBtYXRjaCBhbnkgcm91dGVzLiBVUkwgU2VnbWVudDogJyR7ZS5zZWdtZW50R3JvdXB9J2ApO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVVcmxUcmVlKHJvb3RDYW5kaWRhdGU6IFVybFNlZ21lbnRHcm91cCwgcXVlcnlQYXJhbXM6IFBhcmFtcywgZnJhZ21lbnQ6IHN0cmluZyk6XG4gICAgICBVcmxUcmVlIHtcbiAgICBjb25zdCByb290ID0gcm9vdENhbmRpZGF0ZS5zZWdtZW50cy5sZW5ndGggPiAwID9cbiAgICAgICAgbmV3IFVybFNlZ21lbnRHcm91cChbXSwge1tQUklNQVJZX09VVExFVF06IHJvb3RDYW5kaWRhdGV9KSA6XG4gICAgICAgIHJvb3RDYW5kaWRhdGU7XG4gICAgcmV0dXJuIG5ldyBVcmxUcmVlKHJvb3QsIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFNlZ21lbnRHcm91cChcbiAgICAgIG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+LCByb3V0ZXM6IFJvdXRlW10sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLFxuICAgICAgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIGlmIChzZWdtZW50R3JvdXAuc2VnbWVudHMubGVuZ3RoID09PSAwICYmIHNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRDaGlsZHJlbihuZ01vZHVsZSwgcm91dGVzLCBzZWdtZW50R3JvdXApXG4gICAgICAgICAgLnBpcGUobWFwKChjaGlsZHJlbjogYW55KSA9PiBuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCBjaGlsZHJlbikpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5leHBhbmRTZWdtZW50KG5nTW9kdWxlLCBzZWdtZW50R3JvdXAsIHJvdXRlcywgc2VnbWVudEdyb3VwLnNlZ21lbnRzLCBvdXRsZXQsIHRydWUpO1xuICB9XG5cbiAgLy8gUmVjdXJzaXZlbHkgZXhwYW5kIHNlZ21lbnQgZ3JvdXBzIGZvciBhbGwgdGhlIGNoaWxkIG91dGxldHNcbiAgcHJpdmF0ZSBleHBhbmRDaGlsZHJlbihcbiAgICAgIG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+LCByb3V0ZXM6IFJvdXRlW10sXG4gICAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6IE9ic2VydmFibGU8e1tuYW1lOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9PiB7XG4gICAgcmV0dXJuIHdhaXRGb3JNYXAoXG4gICAgICAgIHNlZ21lbnRHcm91cC5jaGlsZHJlbixcbiAgICAgICAgKGNoaWxkT3V0bGV0LCBjaGlsZCkgPT4gdGhpcy5leHBhbmRTZWdtZW50R3JvdXAobmdNb2R1bGUsIHJvdXRlcywgY2hpbGQsIGNoaWxkT3V0bGV0KSk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFNlZ21lbnQoXG4gICAgICBuZ01vZHVsZTogTmdNb2R1bGVSZWY8YW55Piwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHJvdXRlczogUm91dGVbXSxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nLFxuICAgICAgYWxsb3dSZWRpcmVjdHM6IGJvb2xlYW4pOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIHJldHVybiBvZiguLi5yb3V0ZXMpLnBpcGUoXG4gICAgICAgIG1hcCgocjogYW55KSA9PiB7XG4gICAgICAgICAgY29uc3QgZXhwYW5kZWQkID0gdGhpcy5leHBhbmRTZWdtZW50QWdhaW5zdFJvdXRlKFxuICAgICAgICAgICAgICBuZ01vZHVsZSwgc2VnbWVudEdyb3VwLCByb3V0ZXMsIHIsIHNlZ21lbnRzLCBvdXRsZXQsIGFsbG93UmVkaXJlY3RzKTtcbiAgICAgICAgICByZXR1cm4gZXhwYW5kZWQkLnBpcGUoY2F0Y2hFcnJvcigoZTogYW55KSA9PiB7XG4gICAgICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIE5vTWF0Y2gpIHtcbiAgICAgICAgICAgICAgLy8gVE9ETyhpKTogdGhpcyByZXR1cm4gdHlwZSBkb2Vzbid0IG1hdGNoIHRoZSBkZWNsYXJlZCBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4gLVxuICAgICAgICAgICAgICAvLyB0YWxrIHRvIEphc29uXG4gICAgICAgICAgICAgIHJldHVybiBvZihudWxsKSBhcyBhbnk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgfSksXG4gICAgICAgIGNvbmNhdEFsbCgpLCBmaXJzdCgoczogYW55KSA9PiAhIXMpLCBjYXRjaEVycm9yKChlOiBhbnksIF86IGFueSkgPT4ge1xuICAgICAgICAgIGlmIChlIGluc3RhbmNlb2YgRW1wdHlFcnJvciB8fCBlLm5hbWUgPT09ICdFbXB0eUVycm9yJykge1xuICAgICAgICAgICAgaWYgKHRoaXMubm9MZWZ0b3ZlcnNJblVybChzZWdtZW50R3JvdXAsIHNlZ21lbnRzLCBvdXRsZXQpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvZihuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCB7fSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3cgbmV3IE5vTWF0Y2goc2VnbWVudEdyb3VwKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBub0xlZnRvdmVyc0luVXJsKHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBzZWdtZW50czogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZyk6XG4gICAgICBib29sZWFuIHtcbiAgICByZXR1cm4gc2VnbWVudHMubGVuZ3RoID09PSAwICYmICFzZWdtZW50R3JvdXAuY2hpbGRyZW5bb3V0bGV0XTtcbiAgfVxuXG4gIHByaXZhdGUgZXhwYW5kU2VnbWVudEFnYWluc3RSb3V0ZShcbiAgICAgIG5nTW9kdWxlOiBOZ01vZHVsZVJlZjxhbnk+LCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGVzOiBSb3V0ZVtdLCByb3V0ZTogUm91dGUsXG4gICAgICBwYXRoczogVXJsU2VnbWVudFtdLCBvdXRsZXQ6IHN0cmluZywgYWxsb3dSZWRpcmVjdHM6IGJvb2xlYW4pOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIGlmIChnZXRPdXRsZXQocm91dGUpICE9PSBvdXRsZXQpIHtcbiAgICAgIHJldHVybiBub01hdGNoKHNlZ21lbnRHcm91cCk7XG4gICAgfVxuXG4gICAgaWYgKHJvdXRlLnJlZGlyZWN0VG8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRoaXMubWF0Y2hTZWdtZW50QWdhaW5zdFJvdXRlKG5nTW9kdWxlLCBzZWdtZW50R3JvdXAsIHJvdXRlLCBwYXRocyk7XG4gICAgfVxuXG4gICAgaWYgKGFsbG93UmVkaXJlY3RzICYmIHRoaXMuYWxsb3dSZWRpcmVjdHMpIHtcbiAgICAgIHJldHVybiB0aGlzLmV4cGFuZFNlZ21lbnRBZ2FpbnN0Um91dGVVc2luZ1JlZGlyZWN0KFxuICAgICAgICAgIG5nTW9kdWxlLCBzZWdtZW50R3JvdXAsIHJvdXRlcywgcm91dGUsIHBhdGhzLCBvdXRsZXQpO1xuICAgIH1cblxuICAgIHJldHVybiBub01hdGNoKHNlZ21lbnRHcm91cCk7XG4gIH1cblxuICBwcml2YXRlIGV4cGFuZFNlZ21lbnRBZ2FpbnN0Um91dGVVc2luZ1JlZGlyZWN0KFxuICAgICAgbmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT4sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZXM6IFJvdXRlW10sIHJvdXRlOiBSb3V0ZSxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgICBpZiAocm91dGUucGF0aCA9PT0gJyoqJykge1xuICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kV2lsZENhcmRXaXRoUGFyYW1zQWdhaW5zdFJvdXRlVXNpbmdSZWRpcmVjdChcbiAgICAgICAgICBuZ01vZHVsZSwgcm91dGVzLCByb3V0ZSwgb3V0bGV0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5leHBhbmRSZWd1bGFyU2VnbWVudEFnYWluc3RSb3V0ZVVzaW5nUmVkaXJlY3QoXG4gICAgICAgIG5nTW9kdWxlLCBzZWdtZW50R3JvdXAsIHJvdXRlcywgcm91dGUsIHNlZ21lbnRzLCBvdXRsZXQpO1xuICB9XG5cbiAgcHJpdmF0ZSBleHBhbmRXaWxkQ2FyZFdpdGhQYXJhbXNBZ2FpbnN0Um91dGVVc2luZ1JlZGlyZWN0KFxuICAgICAgbmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT4sIHJvdXRlczogUm91dGVbXSwgcm91dGU6IFJvdXRlLFxuICAgICAgb3V0bGV0OiBzdHJpbmcpOiBPYnNlcnZhYmxlPFVybFNlZ21lbnRHcm91cD4ge1xuICAgIGNvbnN0IG5ld1RyZWUgPSB0aGlzLmFwcGx5UmVkaXJlY3RDb21tYW5kcyhbXSwgcm91dGUucmVkaXJlY3RUbyEsIHt9KTtcbiAgICBpZiAocm91dGUucmVkaXJlY3RUbyEuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICByZXR1cm4gYWJzb2x1dGVSZWRpcmVjdChuZXdUcmVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5saW5lcmFsaXplU2VnbWVudHMocm91dGUsIG5ld1RyZWUpLnBpcGUobWVyZ2VNYXAoKG5ld1NlZ21lbnRzOiBVcmxTZWdtZW50W10pID0+IHtcbiAgICAgIGNvbnN0IGdyb3VwID0gbmV3IFVybFNlZ21lbnRHcm91cChuZXdTZWdtZW50cywge30pO1xuICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kU2VnbWVudChuZ01vZHVsZSwgZ3JvdXAsIHJvdXRlcywgbmV3U2VnbWVudHMsIG91dGxldCwgZmFsc2UpO1xuICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgZXhwYW5kUmVndWxhclNlZ21lbnRBZ2FpbnN0Um91dGVVc2luZ1JlZGlyZWN0KFxuICAgICAgbmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT4sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZXM6IFJvdXRlW10sIHJvdXRlOiBSb3V0ZSxcbiAgICAgIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIG91dGxldDogc3RyaW5nKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgICBjb25zdCB7bWF0Y2hlZCwgY29uc3VtZWRTZWdtZW50cywgbGFzdENoaWxkLCBwb3NpdGlvbmFsUGFyYW1TZWdtZW50c30gPVxuICAgICAgICBtYXRjaChzZWdtZW50R3JvdXAsIHJvdXRlLCBzZWdtZW50cyk7XG4gICAgaWYgKCFtYXRjaGVkKSByZXR1cm4gbm9NYXRjaChzZWdtZW50R3JvdXApO1xuXG4gICAgY29uc3QgbmV3VHJlZSA9IHRoaXMuYXBwbHlSZWRpcmVjdENvbW1hbmRzKFxuICAgICAgICBjb25zdW1lZFNlZ21lbnRzLCByb3V0ZS5yZWRpcmVjdFRvISwgPGFueT5wb3NpdGlvbmFsUGFyYW1TZWdtZW50cyk7XG4gICAgaWYgKHJvdXRlLnJlZGlyZWN0VG8hLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgcmV0dXJuIGFic29sdXRlUmVkaXJlY3QobmV3VHJlZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubGluZXJhbGl6ZVNlZ21lbnRzKHJvdXRlLCBuZXdUcmVlKS5waXBlKG1lcmdlTWFwKChuZXdTZWdtZW50czogVXJsU2VnbWVudFtdKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5leHBhbmRTZWdtZW50KFxuICAgICAgICAgIG5nTW9kdWxlLCBzZWdtZW50R3JvdXAsIHJvdXRlcywgbmV3U2VnbWVudHMuY29uY2F0KHNlZ21lbnRzLnNsaWNlKGxhc3RDaGlsZCkpLCBvdXRsZXQsXG4gICAgICAgICAgZmFsc2UpO1xuICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgbWF0Y2hTZWdtZW50QWdhaW5zdFJvdXRlKFxuICAgICAgbmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT4sIHJhd1NlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCByb3V0ZTogUm91dGUsXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50R3JvdXA+IHtcbiAgICBpZiAocm91dGUucGF0aCA9PT0gJyoqJykge1xuICAgICAgaWYgKHJvdXRlLmxvYWRDaGlsZHJlbikge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25maWdMb2FkZXIubG9hZChuZ01vZHVsZS5pbmplY3Rvciwgcm91dGUpXG4gICAgICAgICAgICAucGlwZShtYXAoKGNmZzogTG9hZGVkUm91dGVyQ29uZmlnKSA9PiB7XG4gICAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRDb25maWcgPSBjZmc7XG4gICAgICAgICAgICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRzLCB7fSk7XG4gICAgICAgICAgICB9KSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvZihuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRzLCB7fSkpO1xuICAgIH1cblxuICAgIGNvbnN0IHttYXRjaGVkLCBjb25zdW1lZFNlZ21lbnRzLCBsYXN0Q2hpbGR9ID0gbWF0Y2gocmF3U2VnbWVudEdyb3VwLCByb3V0ZSwgc2VnbWVudHMpO1xuICAgIGlmICghbWF0Y2hlZCkgcmV0dXJuIG5vTWF0Y2gocmF3U2VnbWVudEdyb3VwKTtcblxuICAgIGNvbnN0IHJhd1NsaWNlZFNlZ21lbnRzID0gc2VnbWVudHMuc2xpY2UobGFzdENoaWxkKTtcbiAgICBjb25zdCBjaGlsZENvbmZpZyQgPSB0aGlzLmdldENoaWxkQ29uZmlnKG5nTW9kdWxlLCByb3V0ZSwgc2VnbWVudHMpO1xuXG4gICAgcmV0dXJuIGNoaWxkQ29uZmlnJC5waXBlKG1lcmdlTWFwKChyb3V0ZXJDb25maWc6IExvYWRlZFJvdXRlckNvbmZpZykgPT4ge1xuICAgICAgY29uc3QgY2hpbGRNb2R1bGUgPSByb3V0ZXJDb25maWcubW9kdWxlO1xuICAgICAgY29uc3QgY2hpbGRDb25maWcgPSByb3V0ZXJDb25maWcucm91dGVzO1xuXG4gICAgICBjb25zdCB7c2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50c30gPVxuICAgICAgICAgIHNwbGl0KHJhd1NlZ21lbnRHcm91cCwgY29uc3VtZWRTZWdtZW50cywgcmF3U2xpY2VkU2VnbWVudHMsIGNoaWxkQ29uZmlnKTtcblxuICAgICAgaWYgKHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiBzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgICBjb25zdCBleHBhbmRlZCQgPSB0aGlzLmV4cGFuZENoaWxkcmVuKGNoaWxkTW9kdWxlLCBjaGlsZENvbmZpZywgc2VnbWVudEdyb3VwKTtcbiAgICAgICAgcmV0dXJuIGV4cGFuZGVkJC5waXBlKFxuICAgICAgICAgICAgbWFwKChjaGlsZHJlbjogYW55KSA9PiBuZXcgVXJsU2VnbWVudEdyb3VwKGNvbnN1bWVkU2VnbWVudHMsIGNoaWxkcmVuKSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY2hpbGRDb25maWcubGVuZ3RoID09PSAwICYmIHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gb2YobmV3IFVybFNlZ21lbnRHcm91cChjb25zdW1lZFNlZ21lbnRzLCB7fSkpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBleHBhbmRlZCQgPSB0aGlzLmV4cGFuZFNlZ21lbnQoXG4gICAgICAgICAgY2hpbGRNb2R1bGUsIHNlZ21lbnRHcm91cCwgY2hpbGRDb25maWcsIHNsaWNlZFNlZ21lbnRzLCBQUklNQVJZX09VVExFVCwgdHJ1ZSk7XG4gICAgICByZXR1cm4gZXhwYW5kZWQkLnBpcGUoXG4gICAgICAgICAgbWFwKChjczogVXJsU2VnbWVudEdyb3VwKSA9PlxuICAgICAgICAgICAgICAgICAgbmV3IFVybFNlZ21lbnRHcm91cChjb25zdW1lZFNlZ21lbnRzLmNvbmNhdChjcy5zZWdtZW50cyksIGNzLmNoaWxkcmVuKSkpO1xuICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Q2hpbGRDb25maWcobmdNb2R1bGU6IE5nTW9kdWxlUmVmPGFueT4sIHJvdXRlOiBSb3V0ZSwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSk6XG4gICAgICBPYnNlcnZhYmxlPExvYWRlZFJvdXRlckNvbmZpZz4ge1xuICAgIGlmIChyb3V0ZS5jaGlsZHJlbikge1xuICAgICAgLy8gVGhlIGNoaWxkcmVuIGJlbG9uZyB0byB0aGUgc2FtZSBtb2R1bGVcbiAgICAgIHJldHVybiBvZihuZXcgTG9hZGVkUm91dGVyQ29uZmlnKHJvdXRlLmNoaWxkcmVuLCBuZ01vZHVsZSkpO1xuICAgIH1cblxuICAgIGlmIChyb3V0ZS5sb2FkQ2hpbGRyZW4pIHtcbiAgICAgIC8vIGxhenkgY2hpbGRyZW4gYmVsb25nIHRvIHRoZSBsb2FkZWQgbW9kdWxlXG4gICAgICBpZiAocm91dGUuX2xvYWRlZENvbmZpZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBvZihyb3V0ZS5fbG9hZGVkQ29uZmlnKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMucnVuQ2FuTG9hZEd1YXJkcyhuZ01vZHVsZS5pbmplY3Rvciwgcm91dGUsIHNlZ21lbnRzKVxuICAgICAgICAgIC5waXBlKG1lcmdlTWFwKChzaG91bGRMb2FkUmVzdWx0OiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgICBpZiAoc2hvdWxkTG9hZFJlc3VsdCkge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25maWdMb2FkZXIubG9hZChuZ01vZHVsZS5pbmplY3Rvciwgcm91dGUpXG4gICAgICAgICAgICAgICAgICAucGlwZShtYXAoKGNmZzogTG9hZGVkUm91dGVyQ29uZmlnKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLl9sb2FkZWRDb25maWcgPSBjZmc7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjZmc7XG4gICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY2FuTG9hZEZhaWxzKHJvdXRlKTtcbiAgICAgICAgICB9KSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9mKG5ldyBMb2FkZWRSb3V0ZXJDb25maWcoW10sIG5nTW9kdWxlKSk7XG4gIH1cblxuICBwcml2YXRlIHJ1bkNhbkxvYWRHdWFyZHMobW9kdWxlSW5qZWN0b3I6IEluamVjdG9yLCByb3V0ZTogUm91dGUsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10pOlxuICAgICAgT2JzZXJ2YWJsZTxib29sZWFuPiB7XG4gICAgY29uc3QgY2FuTG9hZCA9IHJvdXRlLmNhbkxvYWQ7XG4gICAgaWYgKCFjYW5Mb2FkIHx8IGNhbkxvYWQubGVuZ3RoID09PSAwKSByZXR1cm4gb2YodHJ1ZSk7XG5cbiAgICBjb25zdCBvYnMgPSBmcm9tKGNhbkxvYWQpLnBpcGUobWFwKChpbmplY3Rpb25Ub2tlbjogYW55KSA9PiB7XG4gICAgICBjb25zdCBndWFyZCA9IG1vZHVsZUluamVjdG9yLmdldChpbmplY3Rpb25Ub2tlbik7XG4gICAgICBsZXQgZ3VhcmRWYWw7XG4gICAgICBpZiAoaXNDYW5Mb2FkKGd1YXJkKSkge1xuICAgICAgICBndWFyZFZhbCA9IGd1YXJkLmNhbkxvYWQocm91dGUsIHNlZ21lbnRzKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbjxDYW5Mb2FkRm4+KGd1YXJkKSkge1xuICAgICAgICBndWFyZFZhbCA9IGd1YXJkKHJvdXRlLCBzZWdtZW50cyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgQ2FuTG9hZCBndWFyZCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHdyYXBJbnRvT2JzZXJ2YWJsZShndWFyZFZhbCk7XG4gICAgfSkpO1xuXG4gICAgcmV0dXJuIG9icy5waXBlKFxuICAgICAgICBjb25jYXRBbGwoKSxcbiAgICAgICAgdGFwKChyZXN1bHQ6IFVybFRyZWV8Ym9vbGVhbikgPT4ge1xuICAgICAgICAgIGlmICghaXNVcmxUcmVlKHJlc3VsdCkpIHJldHVybjtcblxuICAgICAgICAgIGNvbnN0IGVycm9yOiBFcnJvciZ7dXJsPzogVXJsVHJlZX0gPVxuICAgICAgICAgICAgICBuYXZpZ2F0aW9uQ2FuY2VsaW5nRXJyb3IoYFJlZGlyZWN0aW5nIHRvIFwiJHt0aGlzLnVybFNlcmlhbGl6ZXIuc2VyaWFsaXplKHJlc3VsdCl9XCJgKTtcbiAgICAgICAgICBlcnJvci51cmwgPSByZXN1bHQ7XG4gICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH0pLFxuICAgICAgICBldmVyeShyZXN1bHQgPT4gcmVzdWx0ID09PSB0cnVlKSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBsaW5lcmFsaXplU2VnbWVudHMocm91dGU6IFJvdXRlLCB1cmxUcmVlOiBVcmxUcmVlKTogT2JzZXJ2YWJsZTxVcmxTZWdtZW50W10+IHtcbiAgICBsZXQgcmVzOiBVcmxTZWdtZW50W10gPSBbXTtcbiAgICBsZXQgYyA9IHVybFRyZWUucm9vdDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgcmVzID0gcmVzLmNvbmNhdChjLnNlZ21lbnRzKTtcbiAgICAgIGlmIChjLm51bWJlck9mQ2hpbGRyZW4gPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9mKHJlcyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjLm51bWJlck9mQ2hpbGRyZW4gPiAxIHx8ICFjLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSkge1xuICAgICAgICByZXR1cm4gbmFtZWRPdXRsZXRzUmVkaXJlY3Qocm91dGUucmVkaXJlY3RUbyEpO1xuICAgICAgfVxuXG4gICAgICBjID0gYy5jaGlsZHJlbltQUklNQVJZX09VVExFVF07XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhcHBseVJlZGlyZWN0Q29tbWFuZHMoXG4gICAgICBzZWdtZW50czogVXJsU2VnbWVudFtdLCByZWRpcmVjdFRvOiBzdHJpbmcsIHBvc1BhcmFtczoge1trOiBzdHJpbmddOiBVcmxTZWdtZW50fSk6IFVybFRyZWUge1xuICAgIHJldHVybiB0aGlzLmFwcGx5UmVkaXJlY3RDcmVhdHJlVXJsVHJlZShcbiAgICAgICAgcmVkaXJlY3RUbywgdGhpcy51cmxTZXJpYWxpemVyLnBhcnNlKHJlZGlyZWN0VG8pLCBzZWdtZW50cywgcG9zUGFyYW1zKTtcbiAgfVxuXG4gIHByaXZhdGUgYXBwbHlSZWRpcmVjdENyZWF0cmVVcmxUcmVlKFxuICAgICAgcmVkaXJlY3RUbzogc3RyaW5nLCB1cmxUcmVlOiBVcmxUcmVlLCBzZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgICAgcG9zUGFyYW1zOiB7W2s6IHN0cmluZ106IFVybFNlZ21lbnR9KTogVXJsVHJlZSB7XG4gICAgY29uc3QgbmV3Um9vdCA9IHRoaXMuY3JlYXRlU2VnbWVudEdyb3VwKHJlZGlyZWN0VG8sIHVybFRyZWUucm9vdCwgc2VnbWVudHMsIHBvc1BhcmFtcyk7XG4gICAgcmV0dXJuIG5ldyBVcmxUcmVlKFxuICAgICAgICBuZXdSb290LCB0aGlzLmNyZWF0ZVF1ZXJ5UGFyYW1zKHVybFRyZWUucXVlcnlQYXJhbXMsIHRoaXMudXJsVHJlZS5xdWVyeVBhcmFtcyksXG4gICAgICAgIHVybFRyZWUuZnJhZ21lbnQpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVRdWVyeVBhcmFtcyhyZWRpcmVjdFRvUGFyYW1zOiBQYXJhbXMsIGFjdHVhbFBhcmFtczogUGFyYW1zKTogUGFyYW1zIHtcbiAgICBjb25zdCByZXM6IFBhcmFtcyA9IHt9O1xuICAgIGZvckVhY2gocmVkaXJlY3RUb1BhcmFtcywgKHY6IGFueSwgazogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCBjb3B5U291cmNlVmFsdWUgPSB0eXBlb2YgdiA9PT0gJ3N0cmluZycgJiYgdi5zdGFydHNXaXRoKCc6Jyk7XG4gICAgICBpZiAoY29weVNvdXJjZVZhbHVlKSB7XG4gICAgICAgIGNvbnN0IHNvdXJjZU5hbWUgPSB2LnN1YnN0cmluZygxKTtcbiAgICAgICAgcmVzW2tdID0gYWN0dWFsUGFyYW1zW3NvdXJjZU5hbWVdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzW2tdID0gdjtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVTZWdtZW50R3JvdXAoXG4gICAgICByZWRpcmVjdFRvOiBzdHJpbmcsIGdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgICBwb3NQYXJhbXM6IHtbazogc3RyaW5nXTogVXJsU2VnbWVudH0pOiBVcmxTZWdtZW50R3JvdXAge1xuICAgIGNvbnN0IHVwZGF0ZWRTZWdtZW50cyA9IHRoaXMuY3JlYXRlU2VnbWVudHMocmVkaXJlY3RUbywgZ3JvdXAuc2VnbWVudHMsIHNlZ21lbnRzLCBwb3NQYXJhbXMpO1xuXG4gICAgbGV0IGNoaWxkcmVuOiB7W246IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0gPSB7fTtcbiAgICBmb3JFYWNoKGdyb3VwLmNoaWxkcmVuLCAoY2hpbGQ6IFVybFNlZ21lbnRHcm91cCwgbmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICBjaGlsZHJlbltuYW1lXSA9IHRoaXMuY3JlYXRlU2VnbWVudEdyb3VwKHJlZGlyZWN0VG8sIGNoaWxkLCBzZWdtZW50cywgcG9zUGFyYW1zKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHVwZGF0ZWRTZWdtZW50cywgY2hpbGRyZW4pO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVTZWdtZW50cyhcbiAgICAgIHJlZGlyZWN0VG86IHN0cmluZywgcmVkaXJlY3RUb1NlZ21lbnRzOiBVcmxTZWdtZW50W10sIGFjdHVhbFNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgICBwb3NQYXJhbXM6IHtbazogc3RyaW5nXTogVXJsU2VnbWVudH0pOiBVcmxTZWdtZW50W10ge1xuICAgIHJldHVybiByZWRpcmVjdFRvU2VnbWVudHMubWFwKFxuICAgICAgICBzID0+IHMucGF0aC5zdGFydHNXaXRoKCc6JykgPyB0aGlzLmZpbmRQb3NQYXJhbShyZWRpcmVjdFRvLCBzLCBwb3NQYXJhbXMpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5maW5kT3JSZXR1cm4ocywgYWN0dWFsU2VnbWVudHMpKTtcbiAgfVxuXG4gIHByaXZhdGUgZmluZFBvc1BhcmFtKFxuICAgICAgcmVkaXJlY3RUbzogc3RyaW5nLCByZWRpcmVjdFRvVXJsU2VnbWVudDogVXJsU2VnbWVudCxcbiAgICAgIHBvc1BhcmFtczoge1trOiBzdHJpbmddOiBVcmxTZWdtZW50fSk6IFVybFNlZ21lbnQge1xuICAgIGNvbnN0IHBvcyA9IHBvc1BhcmFtc1tyZWRpcmVjdFRvVXJsU2VnbWVudC5wYXRoLnN1YnN0cmluZygxKV07XG4gICAgaWYgKCFwb3MpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYENhbm5vdCByZWRpcmVjdCB0byAnJHtyZWRpcmVjdFRvfScuIENhbm5vdCBmaW5kICcke3JlZGlyZWN0VG9VcmxTZWdtZW50LnBhdGh9Jy5gKTtcbiAgICByZXR1cm4gcG9zO1xuICB9XG5cbiAgcHJpdmF0ZSBmaW5kT3JSZXR1cm4ocmVkaXJlY3RUb1VybFNlZ21lbnQ6IFVybFNlZ21lbnQsIGFjdHVhbFNlZ21lbnRzOiBVcmxTZWdtZW50W10pOiBVcmxTZWdtZW50IHtcbiAgICBsZXQgaWR4ID0gMDtcbiAgICBmb3IgKGNvbnN0IHMgb2YgYWN0dWFsU2VnbWVudHMpIHtcbiAgICAgIGlmIChzLnBhdGggPT09IHJlZGlyZWN0VG9VcmxTZWdtZW50LnBhdGgpIHtcbiAgICAgICAgYWN0dWFsU2VnbWVudHMuc3BsaWNlKGlkeCk7XG4gICAgICAgIHJldHVybiBzO1xuICAgICAgfVxuICAgICAgaWR4Kys7XG4gICAgfVxuICAgIHJldHVybiByZWRpcmVjdFRvVXJsU2VnbWVudDtcbiAgfVxufVxuXG5mdW5jdGlvbiBtYXRjaChzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGU6IFJvdXRlLCBzZWdtZW50czogVXJsU2VnbWVudFtdKToge1xuICBtYXRjaGVkOiBib29sZWFuLFxuICBjb25zdW1lZFNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gIGxhc3RDaGlsZDogbnVtYmVyLFxuICBwb3NpdGlvbmFsUGFyYW1TZWdtZW50czoge1trOiBzdHJpbmddOiBVcmxTZWdtZW50fVxufSB7XG4gIGlmIChyb3V0ZS5wYXRoID09PSAnJykge1xuICAgIGlmICgocm91dGUucGF0aE1hdGNoID09PSAnZnVsbCcpICYmIChzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSB8fCBzZWdtZW50cy5sZW5ndGggPiAwKSkge1xuICAgICAgcmV0dXJuIHttYXRjaGVkOiBmYWxzZSwgY29uc3VtZWRTZWdtZW50czogW10sIGxhc3RDaGlsZDogMCwgcG9zaXRpb25hbFBhcmFtU2VnbWVudHM6IHt9fTtcbiAgICB9XG5cbiAgICByZXR1cm4ge21hdGNoZWQ6IHRydWUsIGNvbnN1bWVkU2VnbWVudHM6IFtdLCBsYXN0Q2hpbGQ6IDAsIHBvc2l0aW9uYWxQYXJhbVNlZ21lbnRzOiB7fX07XG4gIH1cblxuICBjb25zdCBtYXRjaGVyID0gcm91dGUubWF0Y2hlciB8fCBkZWZhdWx0VXJsTWF0Y2hlcjtcbiAgY29uc3QgcmVzID0gbWF0Y2hlcihzZWdtZW50cywgc2VnbWVudEdyb3VwLCByb3V0ZSk7XG5cbiAgaWYgKCFyZXMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbWF0Y2hlZDogZmFsc2UsXG4gICAgICBjb25zdW1lZFNlZ21lbnRzOiA8YW55W10+W10sXG4gICAgICBsYXN0Q2hpbGQ6IDAsXG4gICAgICBwb3NpdGlvbmFsUGFyYW1TZWdtZW50czoge30sXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbWF0Y2hlZDogdHJ1ZSxcbiAgICBjb25zdW1lZFNlZ21lbnRzOiByZXMuY29uc3VtZWQhLFxuICAgIGxhc3RDaGlsZDogcmVzLmNvbnN1bWVkLmxlbmd0aCEsXG4gICAgcG9zaXRpb25hbFBhcmFtU2VnbWVudHM6IHJlcy5wb3NQYXJhbXMhLFxuICB9O1xufVxuXG5mdW5jdGlvbiBzcGxpdChcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgY29uc3VtZWRTZWdtZW50czogVXJsU2VnbWVudFtdLCBzbGljZWRTZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgIGNvbmZpZzogUm91dGVbXSkge1xuICBpZiAoc2xpY2VkU2VnbWVudHMubGVuZ3RoID4gMCAmJlxuICAgICAgY29udGFpbnNFbXB0eVBhdGhSZWRpcmVjdHNXaXRoTmFtZWRPdXRsZXRzKHNlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHMsIGNvbmZpZykpIHtcbiAgICBjb25zdCBzID0gbmV3IFVybFNlZ21lbnRHcm91cChcbiAgICAgICAgY29uc3VtZWRTZWdtZW50cyxcbiAgICAgICAgY3JlYXRlQ2hpbGRyZW5Gb3JFbXB0eVNlZ21lbnRzKFxuICAgICAgICAgICAgY29uZmlnLCBuZXcgVXJsU2VnbWVudEdyb3VwKHNsaWNlZFNlZ21lbnRzLCBzZWdtZW50R3JvdXAuY2hpbGRyZW4pKSk7XG4gICAgcmV0dXJuIHtzZWdtZW50R3JvdXA6IG1lcmdlVHJpdmlhbENoaWxkcmVuKHMpLCBzbGljZWRTZWdtZW50czogW119O1xuICB9XG5cbiAgaWYgKHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgY29udGFpbnNFbXB0eVBhdGhSZWRpcmVjdHMoc2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50cywgY29uZmlnKSkge1xuICAgIGNvbnN0IHMgPSBuZXcgVXJsU2VnbWVudEdyb3VwKFxuICAgICAgICBzZWdtZW50R3JvdXAuc2VnbWVudHMsXG4gICAgICAgIGFkZEVtcHR5U2VnbWVudHNUb0NoaWxkcmVuSWZOZWVkZWQoXG4gICAgICAgICAgICBzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzLCBjb25maWcsIHNlZ21lbnRHcm91cC5jaGlsZHJlbikpO1xuICAgIHJldHVybiB7c2VnbWVudEdyb3VwOiBtZXJnZVRyaXZpYWxDaGlsZHJlbihzKSwgc2xpY2VkU2VnbWVudHN9O1xuICB9XG5cbiAgcmV0dXJuIHtzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzfTtcbn1cblxuZnVuY3Rpb24gbWVyZ2VUcml2aWFsQ2hpbGRyZW4oczogVXJsU2VnbWVudEdyb3VwKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgaWYgKHMubnVtYmVyT2ZDaGlsZHJlbiA9PT0gMSAmJiBzLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSkge1xuICAgIGNvbnN0IGMgPSBzLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXTtcbiAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChzLnNlZ21lbnRzLmNvbmNhdChjLnNlZ21lbnRzKSwgYy5jaGlsZHJlbik7XG4gIH1cblxuICByZXR1cm4gcztcbn1cblxuZnVuY3Rpb24gYWRkRW1wdHlTZWdtZW50c1RvQ2hpbGRyZW5JZk5lZWRlZChcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHM6IFVybFNlZ21lbnRbXSwgcm91dGVzOiBSb3V0ZVtdLFxuICAgIGNoaWxkcmVuOiB7W25hbWU6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0pOiB7W25hbWU6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0ge1xuICBjb25zdCByZXM6IHtbbmFtZTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICBmb3IgKGNvbnN0IHIgb2Ygcm91dGVzKSB7XG4gICAgaWYgKGlzRW1wdHlQYXRoUmVkaXJlY3Qoc2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50cywgcikgJiYgIWNoaWxkcmVuW2dldE91dGxldChyKV0pIHtcbiAgICAgIHJlc1tnZXRPdXRsZXQocildID0gbmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gey4uLmNoaWxkcmVuLCAuLi5yZXN9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVDaGlsZHJlbkZvckVtcHR5U2VnbWVudHMoXG4gICAgcm91dGVzOiBSb3V0ZVtdLCBwcmltYXJ5U2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXApOiB7W25hbWU6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0ge1xuICBjb25zdCByZXM6IHtbbmFtZTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICByZXNbUFJJTUFSWV9PVVRMRVRdID0gcHJpbWFyeVNlZ21lbnRHcm91cDtcbiAgZm9yIChjb25zdCByIG9mIHJvdXRlcykge1xuICAgIGlmIChyLnBhdGggPT09ICcnICYmIGdldE91dGxldChyKSAhPT0gUFJJTUFSWV9PVVRMRVQpIHtcbiAgICAgIHJlc1tnZXRPdXRsZXQocildID0gbmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG5mdW5jdGlvbiBjb250YWluc0VtcHR5UGF0aFJlZGlyZWN0c1dpdGhOYW1lZE91dGxldHMoXG4gICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIHJvdXRlczogUm91dGVbXSk6IGJvb2xlYW4ge1xuICByZXR1cm4gcm91dGVzLnNvbWUoXG4gICAgICByID0+IGlzRW1wdHlQYXRoUmVkaXJlY3Qoc2VnbWVudEdyb3VwLCBzZWdtZW50cywgcikgJiYgZ2V0T3V0bGV0KHIpICE9PSBQUklNQVJZX09VVExFVCk7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zRW1wdHlQYXRoUmVkaXJlY3RzKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBzZWdtZW50czogVXJsU2VnbWVudFtdLCByb3V0ZXM6IFJvdXRlW10pOiBib29sZWFuIHtcbiAgcmV0dXJuIHJvdXRlcy5zb21lKHIgPT4gaXNFbXB0eVBhdGhSZWRpcmVjdChzZWdtZW50R3JvdXAsIHNlZ21lbnRzLCByKSk7XG59XG5cbmZ1bmN0aW9uIGlzRW1wdHlQYXRoUmVkaXJlY3QoXG4gICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sIHI6IFJvdXRlKTogYm9vbGVhbiB7XG4gIGlmICgoc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkgfHwgc2VnbWVudHMubGVuZ3RoID4gMCkgJiYgci5wYXRoTWF0Y2ggPT09ICdmdWxsJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiByLnBhdGggPT09ICcnICYmIHIucmVkaXJlY3RUbyAhPT0gdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBnZXRPdXRsZXQocm91dGU6IFJvdXRlKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJvdXRlLm91dGxldCB8fCBQUklNQVJZX09VVExFVDtcbn1cbiJdfQ==