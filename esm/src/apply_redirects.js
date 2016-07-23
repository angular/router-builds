/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/concatAll';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { EmptyError } from 'rxjs/util/EmptyError';
import { LoadedRouterConfig } from './router_config_loader';
import { PRIMARY_OUTLET } from './shared';
import { UrlPathWithParams, UrlSegment, UrlTree } from './url_tree';
import { merge, waitForMap } from './utils/collection';
class NoMatch {
    constructor(segment = null) {
        this.segment = segment;
    }
}
class AbsoluteRedirect {
    constructor(paths) {
        this.paths = paths;
    }
}
function noMatch(segment) {
    return new Observable((obs) => obs.error(new NoMatch(segment)));
}
function absoluteRedirect(newPaths) {
    return new Observable((obs) => obs.error(new AbsoluteRedirect(newPaths)));
}
export function applyRedirects(injector, configLoader, urlTree, config) {
    return expandSegment(injector, configLoader, config, urlTree.root, PRIMARY_OUTLET)
        .map(rootSegment => createUrlTree(urlTree, rootSegment))
        .catch(e => {
        if (e instanceof AbsoluteRedirect) {
            return of(createUrlTree(urlTree, new UrlSegment([], { [PRIMARY_OUTLET]: new UrlSegment(e.paths, {}) })));
        }
        else if (e instanceof NoMatch) {
            throw new Error(`Cannot match any routes: '${e.segment}'`);
        }
        else {
            throw e;
        }
    });
}
function createUrlTree(urlTree, rootCandidate) {
    const root = rootCandidate.pathsWithParams.length > 0 ?
        new UrlSegment([], { [PRIMARY_OUTLET]: rootCandidate }) :
        rootCandidate;
    return new UrlTree(root, urlTree.queryParams, urlTree.fragment);
}
function expandSegment(injector, configLoader, routes, segment, outlet) {
    if (segment.pathsWithParams.length === 0 && segment.hasChildren()) {
        return expandSegmentChildren(injector, configLoader, routes, segment)
            .map(children => new UrlSegment([], children));
    }
    else {
        return expandPathsWithParams(injector, configLoader, segment, routes, segment.pathsWithParams, outlet, true);
    }
}
function expandSegmentChildren(injector, configLoader, routes, segment) {
    return waitForMap(segment.children, (childOutlet, child) => expandSegment(injector, configLoader, routes, child, childOutlet));
}
function expandPathsWithParams(injector, configLoader, segment, routes, paths, outlet, allowRedirects) {
    const processRoutes = of(...routes)
        .map(r => {
        return expandPathsWithParamsAgainstRoute(injector, configLoader, segment, routes, r, paths, outlet, allowRedirects)
            .catch((e) => {
            if (e instanceof NoMatch)
                return of(null);
            else
                throw e;
        });
    })
        .concatAll();
    return processRoutes.first(s => !!s).catch((e, _) => {
        if (e instanceof EmptyError) {
            throw new NoMatch(segment);
        }
        else {
            throw e;
        }
    });
}
function expandPathsWithParamsAgainstRoute(injector, configLoader, segment, routes, route, paths, outlet, allowRedirects) {
    if (getOutlet(route) !== outlet)
        return noMatch(segment);
    if (route.redirectTo !== undefined && !allowRedirects)
        return noMatch(segment);
    if (route.redirectTo !== undefined) {
        return expandPathsWithParamsAgainstRouteUsingRedirect(injector, configLoader, segment, routes, route, paths, outlet);
    }
    else {
        return matchPathsWithParamsAgainstRoute(injector, configLoader, segment, route, paths);
    }
}
function expandPathsWithParamsAgainstRouteUsingRedirect(injector, configLoader, segment, routes, route, paths, outlet) {
    if (route.path === '**') {
        return expandWildCardWithParamsAgainstRouteUsingRedirect(route);
    }
    else {
        return expandRegularPathWithParamsAgainstRouteUsingRedirect(injector, configLoader, segment, routes, route, paths, outlet);
    }
}
function expandWildCardWithParamsAgainstRouteUsingRedirect(route) {
    const newPaths = applyRedirectCommands([], route.redirectTo, {});
    if (route.redirectTo.startsWith('/')) {
        return absoluteRedirect(newPaths);
    }
    else {
        return of(new UrlSegment(newPaths, {}));
    }
}
function expandRegularPathWithParamsAgainstRouteUsingRedirect(injector, configLoader, segment, routes, route, paths, outlet) {
    const { matched, consumedPaths, lastChild, positionalParamSegments } = match(segment, route, paths);
    if (!matched)
        return noMatch(segment);
    const newPaths = applyRedirectCommands(consumedPaths, route.redirectTo, positionalParamSegments);
    if (route.redirectTo.startsWith('/')) {
        return absoluteRedirect(newPaths);
    }
    else {
        return expandPathsWithParams(injector, configLoader, segment, routes, newPaths.concat(paths.slice(lastChild)), outlet, false);
    }
}
function matchPathsWithParamsAgainstRoute(injector, configLoader, rawSegment, route, paths) {
    if (route.path === '**') {
        return of(new UrlSegment(paths, {}));
    }
    else {
        const { matched, consumedPaths, lastChild } = match(rawSegment, route, paths);
        if (!matched)
            return noMatch(rawSegment);
        const rawSlicedPath = paths.slice(lastChild);
        return getChildConfig(injector, configLoader, route).mergeMap(routerConfig => {
            const childInjector = routerConfig.injector;
            const childConfig = routerConfig.routes;
            const { segment, slicedPath } = split(rawSegment, consumedPaths, rawSlicedPath, childConfig);
            if (slicedPath.length === 0 && segment.hasChildren()) {
                return expandSegmentChildren(childInjector, configLoader, childConfig, segment)
                    .map(children => new UrlSegment(consumedPaths, children));
            }
            else if (childConfig.length === 0 && slicedPath.length === 0) {
                return of(new UrlSegment(consumedPaths, {}));
            }
            else {
                return expandPathsWithParams(childInjector, configLoader, segment, childConfig, slicedPath, PRIMARY_OUTLET, true)
                    .map(cs => new UrlSegment(consumedPaths.concat(cs.pathsWithParams), cs.children));
            }
        });
    }
}
function getChildConfig(injector, configLoader, route) {
    if (route.children) {
        return of(new LoadedRouterConfig(route.children, injector, null));
    }
    else if (route.loadChildren) {
        return configLoader.load(injector, route.loadChildren).map(r => {
            route._loadedConfig = r;
            return r;
        });
    }
    else {
        return of(new LoadedRouterConfig([], injector, null));
    }
}
function match(segment, route, paths) {
    const noMatch = { matched: false, consumedPaths: [], lastChild: 0, positionalParamSegments: {} };
    if (route.path === '') {
        if ((route.terminal || route.pathMatch === 'full') &&
            (segment.hasChildren() || paths.length > 0)) {
            return { matched: false, consumedPaths: [], lastChild: 0, positionalParamSegments: {} };
        }
        else {
            return { matched: true, consumedPaths: [], lastChild: 0, positionalParamSegments: {} };
        }
    }
    const path = route.path;
    const parts = path.split('/');
    const positionalParamSegments = {};
    const consumedPaths = [];
    let currentIndex = 0;
    for (let i = 0; i < parts.length; ++i) {
        if (currentIndex >= paths.length)
            return noMatch;
        const current = paths[currentIndex];
        const p = parts[i];
        const isPosParam = p.startsWith(':');
        if (!isPosParam && p !== current.path)
            return noMatch;
        if (isPosParam) {
            positionalParamSegments[p.substring(1)] = current;
        }
        consumedPaths.push(current);
        currentIndex++;
    }
    if (route.terminal && (segment.hasChildren() || currentIndex < paths.length)) {
        return { matched: false, consumedPaths: [], lastChild: 0, positionalParamSegments: {} };
    }
    return { matched: true, consumedPaths, lastChild: currentIndex, positionalParamSegments };
}
function applyRedirectCommands(paths, redirectTo, posParams) {
    const r = redirectTo.startsWith('/') ? redirectTo.substring(1) : redirectTo;
    if (r === '') {
        return [];
    }
    else {
        return createPaths(redirectTo, r.split('/'), paths, posParams);
    }
}
function createPaths(redirectTo, parts, segments, posParams) {
    return parts.map(p => p.startsWith(':') ? findPosParam(p, posParams, redirectTo) :
        findOrCreatePath(p, segments));
}
function findPosParam(part, posParams, redirectTo) {
    const paramName = part.substring(1);
    const pos = posParams[paramName];
    if (!pos)
        throw new Error(`Cannot redirect to '${redirectTo}'. Cannot find '${part}'.`);
    return pos;
}
function findOrCreatePath(part, paths) {
    let idx = 0;
    for (const s of paths) {
        if (s.path === part) {
            paths.splice(idx);
            return s;
        }
        idx++;
    }
    return new UrlPathWithParams(part, {});
}
function split(segment, consumedPaths, slicedPath, config) {
    if (slicedPath.length > 0 &&
        containsEmptyPathRedirectsWithNamedOutlets(segment, slicedPath, config)) {
        const s = new UrlSegment(consumedPaths, createChildrenForEmptyPaths(config, new UrlSegment(slicedPath, segment.children)));
        return { segment: mergeTrivialChildren(s), slicedPath: [] };
    }
    else if (slicedPath.length === 0 && containsEmptyPathRedirects(segment, slicedPath, config)) {
        const s = new UrlSegment(segment.pathsWithParams, addEmptyPathsToChildrenIfNeeded(segment, slicedPath, config, segment.children));
        return { segment: mergeTrivialChildren(s), slicedPath };
    }
    else {
        return { segment, slicedPath };
    }
}
function mergeTrivialChildren(s) {
    if (s.numberOfChildren === 1 && s.children[PRIMARY_OUTLET]) {
        const c = s.children[PRIMARY_OUTLET];
        return new UrlSegment(s.pathsWithParams.concat(c.pathsWithParams), c.children);
    }
    else {
        return s;
    }
}
function addEmptyPathsToChildrenIfNeeded(segment, slicedPath, routes, children) {
    const res = {};
    for (let r of routes) {
        if (emptyPathRedirect(segment, slicedPath, r) && !children[getOutlet(r)]) {
            res[getOutlet(r)] = new UrlSegment([], {});
        }
    }
    return merge(children, res);
}
function createChildrenForEmptyPaths(routes, primarySegment) {
    const res = {};
    res[PRIMARY_OUTLET] = primarySegment;
    for (let r of routes) {
        if (r.path === '' && getOutlet(r) !== PRIMARY_OUTLET) {
            res[getOutlet(r)] = new UrlSegment([], {});
        }
    }
    return res;
}
function containsEmptyPathRedirectsWithNamedOutlets(segment, slicedPath, routes) {
    return routes
        .filter(r => emptyPathRedirect(segment, slicedPath, r) && getOutlet(r) !== PRIMARY_OUTLET)
        .length > 0;
}
function containsEmptyPathRedirects(segment, slicedPath, routes) {
    return routes.filter(r => emptyPathRedirect(segment, slicedPath, r)).length > 0;
}
function emptyPathRedirect(segment, slicedPath, r) {
    if ((segment.hasChildren() || slicedPath.length > 0) && (r.terminal || r.pathMatch === 'full'))
        return false;
    return r.path === '' && r.redirectTo !== undefined;
}
function getOutlet(route) {
    return route.outlet ? route.outlet : PRIMARY_OUTLET;
}
//# sourceMappingURL=apply_redirects.js.map