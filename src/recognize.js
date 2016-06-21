"use strict";
var Observable_1 = require('rxjs/Observable');
var of_1 = require('rxjs/observable/of');
var router_state_1 = require('./router_state');
var shared_1 = require('./shared');
var url_tree_1 = require('./url_tree');
var collection_1 = require('./utils/collection');
var tree_1 = require('./utils/tree');
var NoMatch = (function () {
    function NoMatch(segment) {
        if (segment === void 0) { segment = null; }
        this.segment = segment;
    }
    return NoMatch;
}());
function recognize(rootComponentType, config, urlTree, url) {
    try {
        var children = processSegment(config, urlTree.root, {}, shared_1.PRIMARY_OUTLET);
        var root = new router_state_1.ActivatedRouteSnapshot([], {}, shared_1.PRIMARY_OUTLET, rootComponentType, null, urlTree.root, -1);
        var rootNode = new tree_1.TreeNode(root, children);
        return of_1.of(new router_state_1.RouterStateSnapshot(url, rootNode, urlTree.queryParams, urlTree.fragment));
    }
    catch (e) {
        if (e instanceof NoMatch) {
            return new Observable_1.Observable(function (obs) {
                return obs.error(new Error("Cannot match any routes: '" + e.segment + "'"));
            });
        }
        else {
            return new Observable_1.Observable(function (obs) { return obs.error(e); });
        }
    }
}
exports.recognize = recognize;
function processSegment(config, segment, extraParams, outlet) {
    if (segment.pathsWithParams.length === 0 && segment.hasChildren()) {
        return processSegmentChildren(config, segment, extraParams);
    }
    else {
        return [processPathsWithParams(config, segment, 0, segment.pathsWithParams, extraParams, outlet)];
    }
}
function processSegmentChildren(config, segment, extraParams) {
    var children = url_tree_1.mapChildrenIntoArray(segment, function (child, childOutlet) { return processSegment(config, child, extraParams, childOutlet); });
    checkOutletNameUniqueness(children);
    sortActivatedRouteSnapshots(children);
    return children;
}
function sortActivatedRouteSnapshots(nodes) {
    nodes.sort(function (a, b) {
        if (a.value.outlet === shared_1.PRIMARY_OUTLET)
            return -1;
        if (b.value.outlet === shared_1.PRIMARY_OUTLET)
            return 1;
        return a.value.outlet.localeCompare(b.value.outlet);
    });
}
function processPathsWithParams(config, segment, pathIndex, paths, extraParams, outlet) {
    for (var _i = 0, config_1 = config; _i < config_1.length; _i++) {
        var r = config_1[_i];
        try {
            return processPathsWithParamsAgainstRoute(r, segment, pathIndex, paths, extraParams, outlet);
        }
        catch (e) {
            if (!(e instanceof NoMatch))
                throw e;
        }
    }
    throw new NoMatch(segment);
}
function processPathsWithParamsAgainstRoute(route, segment, pathIndex, paths, parentExtraParams, outlet) {
    if (route.redirectTo)
        throw new NoMatch();
    if ((route.outlet ? route.outlet : shared_1.PRIMARY_OUTLET) !== outlet)
        throw new NoMatch();
    if (route.path === '**') {
        var params = paths.length > 0 ? collection_1.last(paths).parameters : {};
        var snapshot_1 = new router_state_1.ActivatedRouteSnapshot(paths, collection_1.merge(parentExtraParams, params), outlet, route.component, route, segment, -1);
        return new tree_1.TreeNode(snapshot_1, []);
    }
    var _a = match(segment, route, paths, parentExtraParams), consumedPaths = _a.consumedPaths, parameters = _a.parameters, extraParams = _a.extraParams, lastChild = _a.lastChild;
    var snapshot = new router_state_1.ActivatedRouteSnapshot(consumedPaths, parameters, outlet, route.component, route, segment, pathIndex + lastChild - 1);
    var slicedPath = paths.slice(lastChild);
    var childConfig = route.children ? route.children : [];
    if (childConfig.length === 0 && slicedPath.length === 0) {
        return new tree_1.TreeNode(snapshot, []);
    }
    else if (slicedPath.length === 0 && segment.hasChildren()) {
        var children = processSegmentChildren(childConfig, segment, extraParams);
        return new tree_1.TreeNode(snapshot, children);
    }
    else {
        var child = processPathsWithParams(childConfig, segment, pathIndex + lastChild, slicedPath, extraParams, shared_1.PRIMARY_OUTLET);
        return new tree_1.TreeNode(snapshot, [child]);
    }
}
function match(segment, route, paths, parentExtraParams) {
    if (route.path === '') {
        if (route.terminal && (segment.hasChildren() || paths.length > 0)) {
            throw new NoMatch();
        }
        else {
            return { consumedPaths: [], lastChild: 0, parameters: {}, extraParams: {} };
        }
    }
    var path = route.path;
    var parts = path.split('/');
    var posParameters = {};
    var consumedPaths = [];
    var currentIndex = 0;
    for (var i = 0; i < parts.length; ++i) {
        if (currentIndex >= paths.length)
            throw new NoMatch();
        var current = paths[currentIndex];
        var p = parts[i];
        var isPosParam = p.startsWith(':');
        if (!isPosParam && p !== current.path)
            throw new NoMatch();
        if (isPosParam) {
            posParameters[p.substring(1)] = current.path;
        }
        consumedPaths.push(current);
        currentIndex++;
    }
    if (route.terminal && (segment.hasChildren() || currentIndex < paths.length)) {
        throw new NoMatch();
    }
    var parameters = collection_1.merge(parentExtraParams, collection_1.merge(posParameters, consumedPaths[consumedPaths.length - 1].parameters));
    var extraParams = route.component ? {} : parameters;
    return { consumedPaths: consumedPaths, lastChild: currentIndex, parameters: parameters, extraParams: extraParams };
}
function checkOutletNameUniqueness(nodes) {
    var names = {};
    nodes.forEach(function (n) {
        var routeWithSameOutletName = names[n.value.outlet];
        if (routeWithSameOutletName) {
            var p = routeWithSameOutletName.url.map(function (s) { return s.toString(); }).join('/');
            var c = n.value.url.map(function (s) { return s.toString(); }).join('/');
            throw new Error("Two segments cannot have the same outlet name: '" + p + "' and '" + c + "'.");
        }
        names[n.value.outlet] = n.value;
    });
}
//# sourceMappingURL=recognize.js.map