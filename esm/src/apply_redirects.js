"use strict";
const Observable_1 = require('rxjs/Observable');
const of_1 = require('rxjs/observable/of');
const shared_1 = require('./shared');
const url_tree_1 = require('./url_tree');
class NoMatch {
    constructor(segment = null) {
        this.segment = segment;
    }
}
class GlobalRedirect {
    constructor(paths) {
        this.paths = paths;
    }
}
function applyRedirects(urlTree, config) {
    try {
        return createUrlTree(urlTree, expandSegment(config, urlTree.root, shared_1.PRIMARY_OUTLET));
    }
    catch (e) {
        if (e instanceof GlobalRedirect) {
            return createUrlTree(urlTree, new url_tree_1.UrlSegment([], { [shared_1.PRIMARY_OUTLET]: new url_tree_1.UrlSegment(e.paths, {}) }));
        }
        else if (e instanceof NoMatch) {
            return new Observable_1.Observable((obs) => obs.error(new Error(`Cannot match any routes: '${e.segment}'`)));
        }
        else {
            return new Observable_1.Observable((obs) => obs.error(e));
        }
    }
}
exports.applyRedirects = applyRedirects;
function createUrlTree(urlTree, root) {
    return of_1.of(new url_tree_1.UrlTree(root, urlTree.queryParams, urlTree.fragment));
}
function expandSegment(routes, segment, outlet) {
    if (segment.pathsWithParams.length === 0 && segment.hasChildren()) {
        return new url_tree_1.UrlSegment([], expandSegmentChildren(routes, segment));
    }
    else {
        return expandPathsWithParams(segment, routes, segment.pathsWithParams, outlet, true);
    }
}
function expandSegmentChildren(routes, segment) {
    return url_tree_1.mapChildren(segment, (child, childOutlet) => expandSegment(routes, child, childOutlet));
}
function expandPathsWithParams(segment, routes, paths, outlet, allowRedirects) {
    for (let r of routes) {
        try {
            return expandPathsWithParamsAgainstRoute(segment, routes, r, paths, outlet, allowRedirects);
        }
        catch (e) {
            if (!(e instanceof NoMatch))
                throw e;
        }
    }
    throw new NoMatch(segment);
}
function expandPathsWithParamsAgainstRoute(segment, routes, route, paths, outlet, allowRedirects) {
    if ((route.outlet ? route.outlet : shared_1.PRIMARY_OUTLET) !== outlet)
        throw new NoMatch();
    if (route.redirectTo && !allowRedirects)
        throw new NoMatch();
    if (route.redirectTo) {
        return expandPathsWithParamsAgainstRouteUsingRedirect(segment, routes, route, paths, outlet);
    }
    else {
        return matchPathsWithParamsAgainstRoute(segment, route, paths);
    }
}
function expandPathsWithParamsAgainstRouteUsingRedirect(segment, routes, route, paths, outlet) {
    if (route.path === '**') {
        return expandWildCardWithParamsAgainstRouteUsingRedirect(route);
    }
    else {
        return expandRegularPathWithParamsAgainstRouteUsingRedirect(segment, routes, route, paths, outlet);
    }
}
function expandWildCardWithParamsAgainstRouteUsingRedirect(route) {
    const newPaths = applyRedirectCommands([], route.redirectTo, {});
    if (route.redirectTo.startsWith('/')) {
        throw new GlobalRedirect(newPaths);
    }
    else {
        return new url_tree_1.UrlSegment(newPaths, {});
    }
}
function expandRegularPathWithParamsAgainstRouteUsingRedirect(segment, routes, route, paths, outlet) {
    const { consumedPaths, lastChild, positionalParamSegments } = match(segment, route, paths);
    const newPaths = applyRedirectCommands(consumedPaths, route.redirectTo, positionalParamSegments);
    if (route.redirectTo.startsWith('/')) {
        throw new GlobalRedirect(newPaths);
    }
    else {
        return expandPathsWithParams(segment, routes, newPaths.concat(paths.slice(lastChild)), outlet, false);
    }
}
function matchPathsWithParamsAgainstRoute(segment, route, paths) {
    if (route.path === '**') {
        return new url_tree_1.UrlSegment(paths, {});
    }
    else {
        const { consumedPaths, lastChild } = match(segment, route, paths);
        const childConfig = route.children ? route.children : [];
        const slicedPath = paths.slice(lastChild);
        if (childConfig.length === 0 && slicedPath.length === 0) {
            return new url_tree_1.UrlSegment(consumedPaths, {});
        }
        else if (slicedPath.length === 0 && segment.hasChildren()) {
            const children = expandSegmentChildren(childConfig, segment);
            return new url_tree_1.UrlSegment(consumedPaths, children);
        }
        else {
            const cs = expandPathsWithParams(segment, childConfig, slicedPath, shared_1.PRIMARY_OUTLET, true);
            return new url_tree_1.UrlSegment(consumedPaths.concat(cs.pathsWithParams), cs.children);
        }
    }
}
function match(segment, route, paths) {
    if (route.path === '') {
        if (route.terminal && (segment.hasChildren() || paths.length > 0)) {
            throw new NoMatch();
        }
        else {
            return { consumedPaths: [], lastChild: 0, positionalParamSegments: {} };
        }
    }
    const path = route.path;
    const parts = path.split('/');
    const positionalParamSegments = {};
    const consumedPaths = [];
    let currentIndex = 0;
    for (let i = 0; i < parts.length; ++i) {
        if (currentIndex >= paths.length)
            throw new NoMatch();
        const current = paths[currentIndex];
        const p = parts[i];
        const isPosParam = p.startsWith(':');
        if (!isPosParam && p !== current.path)
            throw new NoMatch();
        if (isPosParam) {
            positionalParamSegments[p.substring(1)] = current;
        }
        consumedPaths.push(current);
        currentIndex++;
    }
    if (route.terminal && (segment.hasChildren() || currentIndex < paths.length)) {
        throw new NoMatch();
    }
    return { consumedPaths, lastChild: currentIndex, positionalParamSegments };
}
function applyRedirectCommands(paths, redirectTo, posParams) {
    if (redirectTo.startsWith('/')) {
        const parts = redirectTo.substring(1).split('/');
        return createPaths(redirectTo, parts, paths, posParams);
    }
    else {
        const parts = redirectTo.split('/');
        return createPaths(redirectTo, parts, paths, posParams);
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
    const matchingIndex = paths.findIndex(s => s.path === part);
    if (matchingIndex > -1) {
        const r = paths[matchingIndex];
        paths.splice(matchingIndex);
        return r;
    }
    else {
        return new url_tree_1.UrlPathWithParams(part, {});
    }
}
//# sourceMappingURL=apply_redirects.js.map