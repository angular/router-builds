"use strict";
const Observable_1 = require('rxjs/Observable');
const of_1 = require('rxjs/observable/of');
const router_state_1 = require('./router_state');
const shared_1 = require('./shared');
const url_tree_1 = require('./url_tree');
const collection_1 = require('./utils/collection');
const tree_1 = require('./utils/tree');
class NoMatch {
    constructor(segment = null) {
        this.segment = segment;
    }
}
function recognize(rootComponentType, config, urlTree, url) {
    try {
        const children = processSegment(config, urlTree.root, {}, shared_1.PRIMARY_OUTLET);
        const root = new router_state_1.ActivatedRouteSnapshot([], {}, shared_1.PRIMARY_OUTLET, rootComponentType, null, urlTree.root, -1);
        const rootNode = new tree_1.TreeNode(root, children);
        return of_1.of(new router_state_1.RouterStateSnapshot(url, rootNode, urlTree.queryParams, urlTree.fragment));
    }
    catch (e) {
        if (e instanceof NoMatch) {
            return new Observable_1.Observable((obs) => obs.error(new Error(`Cannot match any routes: '${e.segment}'`)));
        }
        else {
            return new Observable_1.Observable((obs) => obs.error(e));
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
    const children = url_tree_1.mapChildrenIntoArray(segment, (child, childOutlet) => processSegment(config, child, extraParams, childOutlet));
    checkOutletNameUniqueness(children);
    sortActivatedRouteSnapshots(children);
    return children;
}
function sortActivatedRouteSnapshots(nodes) {
    nodes.sort((a, b) => {
        if (a.value.outlet === shared_1.PRIMARY_OUTLET)
            return -1;
        if (b.value.outlet === shared_1.PRIMARY_OUTLET)
            return 1;
        return a.value.outlet.localeCompare(b.value.outlet);
    });
}
function processPathsWithParams(config, segment, pathIndex, paths, extraParams, outlet) {
    for (let r of config) {
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
        const params = paths.length > 0 ? collection_1.last(paths).parameters : {};
        const snapshot = new router_state_1.ActivatedRouteSnapshot(paths, collection_1.merge(parentExtraParams, params), outlet, route.component, route, segment, -1);
        return new tree_1.TreeNode(snapshot, []);
    }
    const { consumedPaths, parameters, extraParams, lastChild } = match(segment, route, paths, parentExtraParams);
    const snapshot = new router_state_1.ActivatedRouteSnapshot(consumedPaths, parameters, outlet, route.component, route, segment, pathIndex + lastChild - 1);
    const slicedPath = paths.slice(lastChild);
    const childConfig = route.children ? route.children : [];
    if (childConfig.length === 0 && slicedPath.length === 0) {
        return new tree_1.TreeNode(snapshot, []);
    }
    else if (slicedPath.length === 0 && segment.hasChildren()) {
        const children = processSegmentChildren(childConfig, segment, extraParams);
        return new tree_1.TreeNode(snapshot, children);
    }
    else {
        const child = processPathsWithParams(childConfig, segment, pathIndex + lastChild, slicedPath, extraParams, shared_1.PRIMARY_OUTLET);
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
    const path = route.path;
    const parts = path.split('/');
    const posParameters = {};
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
            posParameters[p.substring(1)] = current.path;
        }
        consumedPaths.push(current);
        currentIndex++;
    }
    if (route.terminal && (segment.hasChildren() || currentIndex < paths.length)) {
        throw new NoMatch();
    }
    const parameters = collection_1.merge(parentExtraParams, collection_1.merge(posParameters, consumedPaths[consumedPaths.length - 1].parameters));
    const extraParams = route.component ? {} : parameters;
    return { consumedPaths, lastChild: currentIndex, parameters, extraParams };
}
function checkOutletNameUniqueness(nodes) {
    const names = {};
    nodes.forEach(n => {
        let routeWithSameOutletName = names[n.value.outlet];
        if (routeWithSameOutletName) {
            const p = routeWithSameOutletName.url.map(s => s.toString()).join('/');
            const c = n.value.url.map(s => s.toString()).join('/');
            throw new Error(`Two segments cannot have the same outlet name: '${p}' and '${c}'.`);
        }
        names[n.value.outlet] = n.value;
    });
}
//# sourceMappingURL=recognize.js.map