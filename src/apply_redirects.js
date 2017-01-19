/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs/Observable';
import { from } from 'rxjs/observable/from';
import { of } from 'rxjs/observable/of';
import { _catch } from 'rxjs/operator/catch';
import { concatAll } from 'rxjs/operator/concatAll';
import { first } from 'rxjs/operator/first';
import { map } from 'rxjs/operator/map';
import { mergeMap } from 'rxjs/operator/mergeMap';
import { EmptyError } from 'rxjs/util/EmptyError';
import { LoadedRouterConfig } from './router_config_loader';
import { NavigationCancelingError, PRIMARY_OUTLET, defaultUrlMatcher } from './shared';
import { UrlSegmentGroup, UrlTree } from './url_tree';
import { andObservables, forEach, merge, waitForMap, wrapIntoObservable } from './utils/collection';
class NoMatch {
    /**
     * @param {?=} segmentGroup
     */
    constructor(segmentGroup = null) {
        this.segmentGroup = segmentGroup;
    }
}
function NoMatch_tsickle_Closure_declarations() {
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
function AbsoluteRedirect_tsickle_Closure_declarations() {
    /** @type {?} */
    AbsoluteRedirect.prototype.urlTree;
}
/**
 * @param {?} segmentGroup
 * @return {?}
 */
function noMatch(segmentGroup) {
    return new Observable((obs) => obs.error(new NoMatch(segmentGroup)));
}
/**
 * @param {?} newTree
 * @return {?}
 */
function absoluteRedirect(newTree) {
    return new Observable((obs) => obs.error(new AbsoluteRedirect(newTree)));
}
/**
 * @param {?} redirectTo
 * @return {?}
 */
function namedOutletsRedirect(redirectTo) {
    return new Observable((obs) => obs.error(new Error(`Only absolute redirects can have named outlets. redirectTo: '${redirectTo}'`)));
}
/**
 * @param {?} route
 * @return {?}
 */
function canLoadFails(route) {
    return new Observable((obs) => obs.error(new NavigationCancelingError(`Cannot load children because the guard of the route "path: '${route.path}'" returned false`)));
}
/**
 * @param {?} injector
 * @param {?} configLoader
 * @param {?} urlSerializer
 * @param {?} urlTree
 * @param {?} config
 * @return {?}
 */
export function applyRedirects(injector, configLoader, urlSerializer, urlTree, config) {
    return new ApplyRedirects(injector, configLoader, urlSerializer, urlTree, config).apply();
}
class ApplyRedirects {
    /**
     * @param {?} injector
     * @param {?} configLoader
     * @param {?} urlSerializer
     * @param {?} urlTree
     * @param {?} config
     */
    constructor(injector, configLoader, urlSerializer, urlTree, config) {
        this.injector = injector;
        this.configLoader = configLoader;
        this.urlSerializer = urlSerializer;
        this.urlTree = urlTree;
        this.config = config;
        this.allowRedirects = true;
    }
    /**
     * @return {?}
     */
    apply() {
        const /** @type {?} */ expanded$ = this.expandSegmentGroup(this.injector, this.config, this.urlTree.root, PRIMARY_OUTLET);
        const /** @type {?} */ urlTrees$ = map.call(expanded$, (rootSegmentGroup) => this.createUrlTree(rootSegmentGroup, this.urlTree.queryParams, this.urlTree.fragment));
        return _catch.call(urlTrees$, (e) => {
            if (e instanceof AbsoluteRedirect) {
                // after an absolute redirect we do not apply any more redirects!
                this.allowRedirects = false;
                // we need to run matching, so we can fetch all lazy-loaded modules
                return this.match(e.urlTree);
            }
            else if (e instanceof NoMatch) {
                throw this.noMatchError(e);
            }
            else {
                throw e;
            }
        });
    }
    /**
     * @param {?} tree
     * @return {?}
     */
    match(tree) {
        const /** @type {?} */ expanded$ = this.expandSegmentGroup(this.injector, this.config, tree.root, PRIMARY_OUTLET);
        const /** @type {?} */ mapped$ = map.call(expanded$, (rootSegmentGroup) => this.createUrlTree(rootSegmentGroup, tree.queryParams, tree.fragment));
        return _catch.call(mapped$, (e) => {
            if (e instanceof NoMatch) {
                throw this.noMatchError(e);
            }
            else {
                throw e;
            }
        });
    }
    /**
     * @param {?} e
     * @return {?}
     */
    noMatchError(e) {
        return new Error(`Cannot match any routes. URL Segment: '${e.segmentGroup}'`);
    }
    /**
     * @param {?} rootCandidate
     * @param {?} queryParams
     * @param {?} fragment
     * @return {?}
     */
    createUrlTree(rootCandidate, queryParams, fragment) {
        const /** @type {?} */ root = rootCandidate.segments.length > 0 ?
            new UrlSegmentGroup([], { [PRIMARY_OUTLET]: rootCandidate }) :
            rootCandidate;
        return new UrlTree(root, queryParams, fragment);
    }
    /**
     * @param {?} injector
     * @param {?} routes
     * @param {?} segmentGroup
     * @param {?} outlet
     * @return {?}
     */
    expandSegmentGroup(injector, routes, segmentGroup, outlet) {
        if (segmentGroup.segments.length === 0 && segmentGroup.hasChildren()) {
            return map.call(this.expandChildren(injector, routes, segmentGroup), (children) => new UrlSegmentGroup([], children));
        }
        else {
            return this.expandSegment(injector, segmentGroup, routes, segmentGroup.segments, outlet, true);
        }
    }
    /**
     * @param {?} injector
     * @param {?} routes
     * @param {?} segmentGroup
     * @return {?}
     */
    expandChildren(injector, routes, segmentGroup) {
        return waitForMap(segmentGroup.children, (childOutlet, child) => this.expandSegmentGroup(injector, routes, child, childOutlet));
    }
    /**
     * @param {?} injector
     * @param {?} segmentGroup
     * @param {?} routes
     * @param {?} segments
     * @param {?} outlet
     * @param {?} allowRedirects
     * @return {?}
     */
    expandSegment(injector, segmentGroup, routes, segments, outlet, allowRedirects) {
        const /** @type {?} */ routes$ = of(...routes);
        const /** @type {?} */ processedRoutes$ = map.call(routes$, (r) => {
            const /** @type {?} */ expanded$ = this.expandSegmentAgainstRoute(injector, segmentGroup, routes, r, segments, outlet, allowRedirects);
            return _catch.call(expanded$, (e) => {
                if (e instanceof NoMatch)
                    return of(null);
                else
                    throw e;
            });
        });
        const /** @type {?} */ concattedProcessedRoutes$ = concatAll.call(processedRoutes$);
        const /** @type {?} */ first$ = first.call(concattedProcessedRoutes$, (s) => !!s);
        return _catch.call(first$, (e, _) => {
            if (e instanceof EmptyError) {
                if (this.noLeftoversInUrl(segmentGroup, segments, outlet)) {
                    return of(new UrlSegmentGroup([], {}));
                }
                else {
                    throw new NoMatch(segmentGroup);
                }
            }
            else {
                throw e;
            }
        });
    }
    /**
     * @param {?} segmentGroup
     * @param {?} segments
     * @param {?} outlet
     * @return {?}
     */
    noLeftoversInUrl(segmentGroup, segments, outlet) {
        return segments.length === 0 && !segmentGroup.children[outlet];
    }
    /**
     * @param {?} injector
     * @param {?} segmentGroup
     * @param {?} routes
     * @param {?} route
     * @param {?} paths
     * @param {?} outlet
     * @param {?} allowRedirects
     * @return {?}
     */
    expandSegmentAgainstRoute(injector, segmentGroup, routes, route, paths, outlet, allowRedirects) {
        if (getOutlet(route) !== outlet)
            return noMatch(segmentGroup);
        if (route.redirectTo !== undefined && !(allowRedirects && this.allowRedirects))
            return noMatch(segmentGroup);
        if (route.redirectTo === undefined) {
            return this.matchSegmentAgainstRoute(injector, segmentGroup, route, paths);
        }
        else {
            return this.expandSegmentAgainstRouteUsingRedirect(injector, segmentGroup, routes, route, paths, outlet);
        }
    }
    /**
     * @param {?} injector
     * @param {?} segmentGroup
     * @param {?} routes
     * @param {?} route
     * @param {?} segments
     * @param {?} outlet
     * @return {?}
     */
    expandSegmentAgainstRouteUsingRedirect(injector, segmentGroup, routes, route, segments, outlet) {
        if (route.path === '**') {
            return this.expandWildCardWithParamsAgainstRouteUsingRedirect(injector, routes, route, outlet);
        }
        else {
            return this.expandRegularSegmentAgainstRouteUsingRedirect(injector, segmentGroup, routes, route, segments, outlet);
        }
    }
    /**
     * @param {?} injector
     * @param {?} routes
     * @param {?} route
     * @param {?} outlet
     * @return {?}
     */
    expandWildCardWithParamsAgainstRouteUsingRedirect(injector, routes, route, outlet) {
        const /** @type {?} */ newTree = this.applyRedirectCommands([], route.redirectTo, {});
        if (route.redirectTo.startsWith('/')) {
            return absoluteRedirect(newTree);
        }
        else {
            return mergeMap.call(this.lineralizeSegments(route, newTree), (newSegments) => {
                const /** @type {?} */ group = new UrlSegmentGroup(newSegments, {});
                return this.expandSegment(injector, group, routes, newSegments, outlet, false);
            });
        }
    }
    /**
     * @param {?} injector
     * @param {?} segmentGroup
     * @param {?} routes
     * @param {?} route
     * @param {?} segments
     * @param {?} outlet
     * @return {?}
     */
    expandRegularSegmentAgainstRouteUsingRedirect(injector, segmentGroup, routes, route, segments, outlet) {
        const { matched, consumedSegments, lastChild, positionalParamSegments } = match(segmentGroup, route, segments);
        if (!matched)
            return noMatch(segmentGroup);
        const /** @type {?} */ newTree = this.applyRedirectCommands(consumedSegments, route.redirectTo, /** @type {?} */ (positionalParamSegments));
        if (route.redirectTo.startsWith('/')) {
            return absoluteRedirect(newTree);
        }
        else {
            return mergeMap.call(this.lineralizeSegments(route, newTree), (newSegments) => {
                return this.expandSegment(injector, segmentGroup, routes, newSegments.concat(segments.slice(lastChild)), outlet, false);
            });
        }
    }
    /**
     * @param {?} injector
     * @param {?} rawSegmentGroup
     * @param {?} route
     * @param {?} segments
     * @return {?}
     */
    matchSegmentAgainstRoute(injector, rawSegmentGroup, route, segments) {
        if (route.path === '**') {
            if (route.loadChildren) {
                return map.call(this.configLoader.load(injector, route.loadChildren), (r) => {
                    ((route))._loadedConfig = r;
                    return new UrlSegmentGroup(segments, {});
                });
            }
            else {
                return of(new UrlSegmentGroup(segments, {}));
            }
        }
        else {
            const { matched, consumedSegments, lastChild } = match(rawSegmentGroup, route, segments);
            if (!matched)
                return noMatch(rawSegmentGroup);
            const /** @type {?} */ rawSlicedSegments = segments.slice(lastChild);
            const /** @type {?} */ childConfig$ = this.getChildConfig(injector, route);
            return mergeMap.call(childConfig$, (routerConfig) => {
                const /** @type {?} */ childInjector = routerConfig.injector;
                const /** @type {?} */ childConfig = routerConfig.routes;
                const { segmentGroup, slicedSegments } = split(rawSegmentGroup, consumedSegments, rawSlicedSegments, childConfig);
                if (slicedSegments.length === 0 && segmentGroup.hasChildren()) {
                    const /** @type {?} */ expanded$ = this.expandChildren(childInjector, childConfig, segmentGroup);
                    return map.call(expanded$, (children) => new UrlSegmentGroup(consumedSegments, children));
                }
                else if (childConfig.length === 0 && slicedSegments.length === 0) {
                    return of(new UrlSegmentGroup(consumedSegments, {}));
                }
                else {
                    const /** @type {?} */ expanded$ = this.expandSegment(childInjector, segmentGroup, childConfig, slicedSegments, PRIMARY_OUTLET, true);
                    return map.call(expanded$, (cs) => new UrlSegmentGroup(consumedSegments.concat(cs.segments), cs.children));
                }
            });
        }
    }
    /**
     * @param {?} injector
     * @param {?} route
     * @return {?}
     */
    getChildConfig(injector, route) {
        if (route.children) {
            return of(new LoadedRouterConfig(route.children, injector, null, null));
        }
        else if (route.loadChildren) {
            return mergeMap.call(runGuards(injector, route), (shouldLoad) => {
                if (shouldLoad) {
                    if (((route))._loadedConfig) {
                        return of(((route))._loadedConfig);
                    }
                    else {
                        return map.call(this.configLoader.load(injector, route.loadChildren), (r) => {
                            ((route))._loadedConfig = r;
                            return r;
                        });
                    }
                }
                else {
                    return canLoadFails(route);
                }
            });
        }
        else {
            return of(new LoadedRouterConfig([], injector, null, null));
        }
    }
    /**
     * @param {?} route
     * @param {?} urlTree
     * @return {?}
     */
    lineralizeSegments(route, urlTree) {
        let /** @type {?} */ res = [];
        let /** @type {?} */ c = urlTree.root;
        while (true) {
            res = res.concat(c.segments);
            if (c.numberOfChildren === 0) {
                return of(res);
            }
            else if (c.numberOfChildren > 1 || !c.children[PRIMARY_OUTLET]) {
                return namedOutletsRedirect(route.redirectTo);
            }
            else {
                c = c.children[PRIMARY_OUTLET];
            }
        }
    }
    /**
     * @param {?} segments
     * @param {?} redirectTo
     * @param {?} posParams
     * @return {?}
     */
    applyRedirectCommands(segments, redirectTo, posParams) {
        const /** @type {?} */ t = this.urlSerializer.parse(redirectTo);
        return this.applyRedirectCreatreUrlTree(redirectTo, this.urlSerializer.parse(redirectTo), segments, posParams);
    }
    /**
     * @param {?} redirectTo
     * @param {?} urlTree
     * @param {?} segments
     * @param {?} posParams
     * @return {?}
     */
    applyRedirectCreatreUrlTree(redirectTo, urlTree, segments, posParams) {
        const /** @type {?} */ newRoot = this.createSegmentGroup(redirectTo, urlTree.root, segments, posParams);
        return new UrlTree(newRoot, this.createQueryParams(urlTree.queryParams, this.urlTree.queryParams), urlTree.fragment);
    }
    /**
     * @param {?} redirectToParams
     * @param {?} actualParams
     * @return {?}
     */
    createQueryParams(redirectToParams, actualParams) {
        const /** @type {?} */ res = {};
        forEach(redirectToParams, (v, k) => {
            if (v.startsWith(':')) {
                res[k] = actualParams[v.substring(1)];
            }
            else {
                res[k] = v;
            }
        });
        return res;
    }
    /**
     * @param {?} redirectTo
     * @param {?} group
     * @param {?} segments
     * @param {?} posParams
     * @return {?}
     */
    createSegmentGroup(redirectTo, group, segments, posParams) {
        const /** @type {?} */ updatedSegments = this.createSegments(redirectTo, group.segments, segments, posParams);
        let /** @type {?} */ children = {};
        forEach(group.children, (child, name) => {
            children[name] = this.createSegmentGroup(redirectTo, child, segments, posParams);
        });
        return new UrlSegmentGroup(updatedSegments, children);
    }
    /**
     * @param {?} redirectTo
     * @param {?} redirectToSegments
     * @param {?} actualSegments
     * @param {?} posParams
     * @return {?}
     */
    createSegments(redirectTo, redirectToSegments, actualSegments, posParams) {
        return redirectToSegments.map(s => s.path.startsWith(':') ? this.findPosParam(redirectTo, s, posParams) :
            this.findOrReturn(s, actualSegments));
    }
    /**
     * @param {?} redirectTo
     * @param {?} redirectToUrlSegment
     * @param {?} posParams
     * @return {?}
     */
    findPosParam(redirectTo, redirectToUrlSegment, posParams) {
        const /** @type {?} */ pos = posParams[redirectToUrlSegment.path.substring(1)];
        if (!pos)
            throw new Error(`Cannot redirect to '${redirectTo}'. Cannot find '${redirectToUrlSegment.path}'.`);
        return pos;
    }
    /**
     * @param {?} redirectToUrlSegment
     * @param {?} actualSegments
     * @return {?}
     */
    findOrReturn(redirectToUrlSegment, actualSegments) {
        let /** @type {?} */ idx = 0;
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
function ApplyRedirects_tsickle_Closure_declarations() {
    /** @type {?} */
    ApplyRedirects.prototype.allowRedirects;
    /** @type {?} */
    ApplyRedirects.prototype.injector;
    /** @type {?} */
    ApplyRedirects.prototype.configLoader;
    /** @type {?} */
    ApplyRedirects.prototype.urlSerializer;
    /** @type {?} */
    ApplyRedirects.prototype.urlTree;
    /** @type {?} */
    ApplyRedirects.prototype.config;
}
/**
 * @param {?} injector
 * @param {?} route
 * @return {?}
 */
function runGuards(injector, route) {
    const /** @type {?} */ canLoad = route.canLoad;
    if (!canLoad || canLoad.length === 0)
        return of(true);
    const /** @type {?} */ obs = map.call(from(canLoad), (c) => {
        const /** @type {?} */ guard = injector.get(c);
        if (guard.canLoad) {
            return wrapIntoObservable(guard.canLoad(route));
        }
        else {
            return wrapIntoObservable(guard(route));
        }
    });
    return andObservables(obs);
}
/**
 * @param {?} segmentGroup
 * @param {?} route
 * @param {?} segments
 * @return {?}
 */
function match(segmentGroup, route, segments) {
    const /** @type {?} */ noMatch = { matched: false, consumedSegments: /** @type {?} */ ([]), lastChild: 0, positionalParamSegments: {} };
    if (route.path === '') {
        if ((route.pathMatch === 'full') && (segmentGroup.hasChildren() || segments.length > 0)) {
            return { matched: false, consumedSegments: [], lastChild: 0, positionalParamSegments: {} };
        }
        else {
            return { matched: true, consumedSegments: [], lastChild: 0, positionalParamSegments: {} };
        }
    }
    const /** @type {?} */ matcher = route.matcher || defaultUrlMatcher;
    const /** @type {?} */ res = matcher(segments, segmentGroup, route);
    if (!res)
        return noMatch;
    return {
        matched: true,
        consumedSegments: res.consumed,
        lastChild: res.consumed.length,
        positionalParamSegments: res.posParams
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
        const /** @type {?} */ s = new UrlSegmentGroup(consumedSegments, createChildrenForEmptySegments(config, new UrlSegmentGroup(slicedSegments, segmentGroup.children)));
        return { segmentGroup: mergeTrivialChildren(s), slicedSegments: [] };
    }
    else if (slicedSegments.length === 0 &&
        containsEmptyPathRedirects(segmentGroup, slicedSegments, config)) {
        const /** @type {?} */ s = new UrlSegmentGroup(segmentGroup.segments, addEmptySegmentsToChildrenIfNeeded(segmentGroup, slicedSegments, config, segmentGroup.children));
        return { segmentGroup: mergeTrivialChildren(s), slicedSegments };
    }
    else {
        return { segmentGroup, slicedSegments };
    }
}
/**
 * @param {?} s
 * @return {?}
 */
function mergeTrivialChildren(s) {
    if (s.numberOfChildren === 1 && s.children[PRIMARY_OUTLET]) {
        const /** @type {?} */ c = s.children[PRIMARY_OUTLET];
        return new UrlSegmentGroup(s.segments.concat(c.segments), c.children);
    }
    else {
        return s;
    }
}
/**
 * @param {?} segmentGroup
 * @param {?} slicedSegments
 * @param {?} routes
 * @param {?} children
 * @return {?}
 */
function addEmptySegmentsToChildrenIfNeeded(segmentGroup, slicedSegments, routes, children) {
    const /** @type {?} */ res = {};
    for (const r of routes) {
        if (emptyPathRedirect(segmentGroup, slicedSegments, r) && !children[getOutlet(r)]) {
            res[getOutlet(r)] = new UrlSegmentGroup([], {});
        }
    }
    return merge(children, res);
}
/**
 * @param {?} routes
 * @param {?} primarySegmentGroup
 * @return {?}
 */
function createChildrenForEmptySegments(routes, primarySegmentGroup) {
    const /** @type {?} */ res = {};
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
 * @param {?} slicedSegments
 * @param {?} routes
 * @return {?}
 */
function containsEmptyPathRedirectsWithNamedOutlets(segmentGroup, slicedSegments, routes) {
    return routes
        .filter(r => emptyPathRedirect(segmentGroup, slicedSegments, r) &&
        getOutlet(r) !== PRIMARY_OUTLET)
        .length > 0;
}
/**
 * @param {?} segmentGroup
 * @param {?} slicedSegments
 * @param {?} routes
 * @return {?}
 */
function containsEmptyPathRedirects(segmentGroup, slicedSegments, routes) {
    return routes.filter(r => emptyPathRedirect(segmentGroup, slicedSegments, r)).length > 0;
}
/**
 * @param {?} segmentGroup
 * @param {?} slicedSegments
 * @param {?} r
 * @return {?}
 */
function emptyPathRedirect(segmentGroup, slicedSegments, r) {
    if ((segmentGroup.hasChildren() || slicedSegments.length > 0) && r.pathMatch === 'full')
        return false;
    return r.path === '' && r.redirectTo !== undefined;
}
/**
 * @param {?} route
 * @return {?}
 */
function getOutlet(route) {
    return route.outlet ? route.outlet : PRIMARY_OUTLET;
}
//# sourceMappingURL=apply_redirects.js.map