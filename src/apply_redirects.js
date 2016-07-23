/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
"use strict";
require('rxjs/add/operator/first');
require('rxjs/add/operator/catch');
require('rxjs/add/operator/concatAll');
var Observable_1 = require('rxjs/Observable');
var of_1 = require('rxjs/observable/of');
var EmptyError_1 = require('rxjs/util/EmptyError');
var router_config_loader_1 = require('./router_config_loader');
var shared_1 = require('./shared');
var url_tree_1 = require('./url_tree');
var collection_1 = require('./utils/collection');
var NoMatch = (function () {
    function NoMatch(segment) {
        if (segment === void 0) { segment = null; }
        this.segment = segment;
    }
    return NoMatch;
}());
var AbsoluteRedirect = (function () {
    function AbsoluteRedirect(paths) {
        this.paths = paths;
    }
    return AbsoluteRedirect;
}());
function noMatch(segment) {
    return new Observable_1.Observable(function (obs) { return obs.error(new NoMatch(segment)); });
}
function absoluteRedirect(newPaths) {
    return new Observable_1.Observable(function (obs) { return obs.error(new AbsoluteRedirect(newPaths)); });
}
function applyRedirects(injector, configLoader, urlTree, config) {
    return expandSegment(injector, configLoader, config, urlTree.root, shared_1.PRIMARY_OUTLET)
        .map(function (rootSegment) { return createUrlTree(urlTree, rootSegment); })
        .catch(function (e) {
        if (e instanceof AbsoluteRedirect) {
            return of_1.of(createUrlTree(urlTree, new url_tree_1.UrlSegment([], (_a = {}, _a[shared_1.PRIMARY_OUTLET] = new url_tree_1.UrlSegment(e.paths, {}), _a))));
        }
        else if (e instanceof NoMatch) {
            throw new Error("Cannot match any routes: '" + e.segment + "'");
        }
        else {
            throw e;
        }
        var _a;
    });
}
exports.applyRedirects = applyRedirects;
function createUrlTree(urlTree, rootCandidate) {
    var root = rootCandidate.pathsWithParams.length > 0 ?
        new url_tree_1.UrlSegment([], (_a = {}, _a[shared_1.PRIMARY_OUTLET] = rootCandidate, _a)) :
        rootCandidate;
    return new url_tree_1.UrlTree(root, urlTree.queryParams, urlTree.fragment);
    var _a;
}
function expandSegment(injector, configLoader, routes, segment, outlet) {
    if (segment.pathsWithParams.length === 0 && segment.hasChildren()) {
        return expandSegmentChildren(injector, configLoader, routes, segment)
            .map(function (children) { return new url_tree_1.UrlSegment([], children); });
    }
    else {
        return expandPathsWithParams(injector, configLoader, segment, routes, segment.pathsWithParams, outlet, true);
    }
}
function expandSegmentChildren(injector, configLoader, routes, segment) {
    return collection_1.waitForMap(segment.children, function (childOutlet, child) { return expandSegment(injector, configLoader, routes, child, childOutlet); });
}
function expandPathsWithParams(injector, configLoader, segment, routes, paths, outlet, allowRedirects) {
    var processRoutes = of_1.of.apply(void 0, routes)
        .map(function (r) {
        return expandPathsWithParamsAgainstRoute(injector, configLoader, segment, routes, r, paths, outlet, allowRedirects)
            .catch(function (e) {
            if (e instanceof NoMatch)
                return of_1.of(null);
            else
                throw e;
        });
    })
        .concatAll();
    return processRoutes.first(function (s) { return !!s; }).catch(function (e, _) {
        if (e instanceof EmptyError_1.EmptyError) {
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
    var newPaths = applyRedirectCommands([], route.redirectTo, {});
    if (route.redirectTo.startsWith('/')) {
        return absoluteRedirect(newPaths);
    }
    else {
        return of_1.of(new url_tree_1.UrlSegment(newPaths, {}));
    }
}
function expandRegularPathWithParamsAgainstRouteUsingRedirect(injector, configLoader, segment, routes, route, paths, outlet) {
    var _a = match(segment, route, paths), matched = _a.matched, consumedPaths = _a.consumedPaths, lastChild = _a.lastChild, positionalParamSegments = _a.positionalParamSegments;
    if (!matched)
        return noMatch(segment);
    var newPaths = applyRedirectCommands(consumedPaths, route.redirectTo, positionalParamSegments);
    if (route.redirectTo.startsWith('/')) {
        return absoluteRedirect(newPaths);
    }
    else {
        return expandPathsWithParams(injector, configLoader, segment, routes, newPaths.concat(paths.slice(lastChild)), outlet, false);
    }
}
function matchPathsWithParamsAgainstRoute(injector, configLoader, rawSegment, route, paths) {
    if (route.path === '**') {
        return of_1.of(new url_tree_1.UrlSegment(paths, {}));
    }
    else {
        var _a = match(rawSegment, route, paths), matched = _a.matched, consumedPaths_1 = _a.consumedPaths, lastChild = _a.lastChild;
        if (!matched)
            return noMatch(rawSegment);
        var rawSlicedPath_1 = paths.slice(lastChild);
        return getChildConfig(injector, configLoader, route).mergeMap(function (routerConfig) {
            var childInjector = routerConfig.injector;
            var childConfig = routerConfig.routes;
            var _a = split(rawSegment, consumedPaths_1, rawSlicedPath_1, childConfig), segment = _a.segment, slicedPath = _a.slicedPath;
            if (slicedPath.length === 0 && segment.hasChildren()) {
                return expandSegmentChildren(childInjector, configLoader, childConfig, segment)
                    .map(function (children) { return new url_tree_1.UrlSegment(consumedPaths_1, children); });
            }
            else if (childConfig.length === 0 && slicedPath.length === 0) {
                return of_1.of(new url_tree_1.UrlSegment(consumedPaths_1, {}));
            }
            else {
                return expandPathsWithParams(childInjector, configLoader, segment, childConfig, slicedPath, shared_1.PRIMARY_OUTLET, true)
                    .map(function (cs) { return new url_tree_1.UrlSegment(consumedPaths_1.concat(cs.pathsWithParams), cs.children); });
            }
        });
    }
}
function getChildConfig(injector, configLoader, route) {
    if (route.children) {
        return of_1.of(new router_config_loader_1.LoadedRouterConfig(route.children, injector, null));
    }
    else if (route.loadChildren) {
        return configLoader.load(injector, route.loadChildren).map(function (r) {
            route._loadedConfig = r;
            return r;
        });
    }
    else {
        return of_1.of(new router_config_loader_1.LoadedRouterConfig([], injector, null));
    }
}
function match(segment, route, paths) {
    var noMatch = { matched: false, consumedPaths: [], lastChild: 0, positionalParamSegments: {} };
    if (route.path === '') {
        if ((route.terminal || route.pathMatch === 'full') &&
            (segment.hasChildren() || paths.length > 0)) {
            return { matched: false, consumedPaths: [], lastChild: 0, positionalParamSegments: {} };
        }
        else {
            return { matched: true, consumedPaths: [], lastChild: 0, positionalParamSegments: {} };
        }
    }
    var path = route.path;
    var parts = path.split('/');
    var positionalParamSegments = {};
    var consumedPaths = [];
    var currentIndex = 0;
    for (var i = 0; i < parts.length; ++i) {
        if (currentIndex >= paths.length)
            return noMatch;
        var current = paths[currentIndex];
        var p = parts[i];
        var isPosParam = p.startsWith(':');
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
    return { matched: true, consumedPaths: consumedPaths, lastChild: currentIndex, positionalParamSegments: positionalParamSegments };
}
function applyRedirectCommands(paths, redirectTo, posParams) {
    var r = redirectTo.startsWith('/') ? redirectTo.substring(1) : redirectTo;
    if (r === '') {
        return [];
    }
    else {
        return createPaths(redirectTo, r.split('/'), paths, posParams);
    }
}
function createPaths(redirectTo, parts, segments, posParams) {
    return parts.map(function (p) { return p.startsWith(':') ? findPosParam(p, posParams, redirectTo) :
        findOrCreatePath(p, segments); });
}
function findPosParam(part, posParams, redirectTo) {
    var paramName = part.substring(1);
    var pos = posParams[paramName];
    if (!pos)
        throw new Error("Cannot redirect to '" + redirectTo + "'. Cannot find '" + part + "'.");
    return pos;
}
function findOrCreatePath(part, paths) {
    var idx = 0;
    for (var _i = 0, paths_1 = paths; _i < paths_1.length; _i++) {
        var s = paths_1[_i];
        if (s.path === part) {
            paths.splice(idx);
            return s;
        }
        idx++;
    }
    return new url_tree_1.UrlPathWithParams(part, {});
}
function split(segment, consumedPaths, slicedPath, config) {
    if (slicedPath.length > 0 &&
        containsEmptyPathRedirectsWithNamedOutlets(segment, slicedPath, config)) {
        var s = new url_tree_1.UrlSegment(consumedPaths, createChildrenForEmptyPaths(config, new url_tree_1.UrlSegment(slicedPath, segment.children)));
        return { segment: mergeTrivialChildren(s), slicedPath: [] };
    }
    else if (slicedPath.length === 0 && containsEmptyPathRedirects(segment, slicedPath, config)) {
        var s = new url_tree_1.UrlSegment(segment.pathsWithParams, addEmptyPathsToChildrenIfNeeded(segment, slicedPath, config, segment.children));
        return { segment: mergeTrivialChildren(s), slicedPath: slicedPath };
    }
    else {
        return { segment: segment, slicedPath: slicedPath };
    }
}
function mergeTrivialChildren(s) {
    if (s.numberOfChildren === 1 && s.children[shared_1.PRIMARY_OUTLET]) {
        var c = s.children[shared_1.PRIMARY_OUTLET];
        return new url_tree_1.UrlSegment(s.pathsWithParams.concat(c.pathsWithParams), c.children);
    }
    else {
        return s;
    }
}
function addEmptyPathsToChildrenIfNeeded(segment, slicedPath, routes, children) {
    var res = {};
    for (var _i = 0, routes_1 = routes; _i < routes_1.length; _i++) {
        var r = routes_1[_i];
        if (emptyPathRedirect(segment, slicedPath, r) && !children[getOutlet(r)]) {
            res[getOutlet(r)] = new url_tree_1.UrlSegment([], {});
        }
    }
    return collection_1.merge(children, res);
}
function createChildrenForEmptyPaths(routes, primarySegment) {
    var res = {};
    res[shared_1.PRIMARY_OUTLET] = primarySegment;
    for (var _i = 0, routes_2 = routes; _i < routes_2.length; _i++) {
        var r = routes_2[_i];
        if (r.path === '' && getOutlet(r) !== shared_1.PRIMARY_OUTLET) {
            res[getOutlet(r)] = new url_tree_1.UrlSegment([], {});
        }
    }
    return res;
}
function containsEmptyPathRedirectsWithNamedOutlets(segment, slicedPath, routes) {
    return routes
        .filter(function (r) { return emptyPathRedirect(segment, slicedPath, r) && getOutlet(r) !== shared_1.PRIMARY_OUTLET; })
        .length > 0;
}
function containsEmptyPathRedirects(segment, slicedPath, routes) {
    return routes.filter(function (r) { return emptyPathRedirect(segment, slicedPath, r); }).length > 0;
}
function emptyPathRedirect(segment, slicedPath, r) {
    if ((segment.hasChildren() || slicedPath.length > 0) && (r.terminal || r.pathMatch === 'full'))
        return false;
    return r.path === '' && r.redirectTo !== undefined;
}
function getOutlet(route) {
    return route.outlet ? route.outlet : shared_1.PRIMARY_OUTLET;
}
//# sourceMappingURL=apply_redirects.js.map