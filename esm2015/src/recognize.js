/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, of } from 'rxjs';
import { ActivatedRouteSnapshot, RouterStateSnapshot, inheritedParamsDataResolve } from './router_state';
import { PRIMARY_OUTLET, defaultUrlMatcher } from './shared';
import { UrlSegmentGroup, mapChildrenIntoArray } from './url_tree';
import { forEach, last } from './utils/collection';
import { TreeNode } from './utils/tree';
class NoMatch {
}
/**
 * @param {?} rootComponentType
 * @param {?} config
 * @param {?} urlTree
 * @param {?} url
 * @param {?=} paramsInheritanceStrategy
 * @param {?=} relativeLinkResolution
 * @return {?}
 */
export function recognize(rootComponentType, config, urlTree, url, paramsInheritanceStrategy = 'emptyOnly', relativeLinkResolution = 'legacy') {
    return new Recognizer(rootComponentType, config, urlTree, url, paramsInheritanceStrategy, relativeLinkResolution)
        .recognize();
}
class Recognizer {
    /**
     * @param {?} rootComponentType
     * @param {?} config
     * @param {?} urlTree
     * @param {?} url
     * @param {?} paramsInheritanceStrategy
     * @param {?} relativeLinkResolution
     */
    constructor(rootComponentType, config, urlTree, url, paramsInheritanceStrategy, relativeLinkResolution) {
        this.rootComponentType = rootComponentType;
        this.config = config;
        this.urlTree = urlTree;
        this.url = url;
        this.paramsInheritanceStrategy = paramsInheritanceStrategy;
        this.relativeLinkResolution = relativeLinkResolution;
    }
    /**
     * @return {?}
     */
    recognize() {
        try {
            /** @type {?} */
            const rootSegmentGroup = split(this.urlTree.root, [], [], this.config, this.relativeLinkResolution).segmentGroup;
            /** @type {?} */
            const children = this.processSegmentGroup(this.config, rootSegmentGroup, PRIMARY_OUTLET);
            /** @type {?} */
            const root = new ActivatedRouteSnapshot([], Object.freeze({}), Object.freeze(Object.assign({}, this.urlTree.queryParams)), /** @type {?} */ ((this.urlTree.fragment)), {}, PRIMARY_OUTLET, this.rootComponentType, null, this.urlTree.root, -1, {});
            /** @type {?} */
            const rootNode = new TreeNode(root, children);
            /** @type {?} */
            const routeState = new RouterStateSnapshot(this.url, rootNode);
            this.inheritParamsAndData(routeState._root);
            return of(routeState);
        }
        catch (e) {
            return new Observable((obs) => obs.error(e));
        }
    }
    /**
     * @param {?} routeNode
     * @return {?}
     */
    inheritParamsAndData(routeNode) {
        /** @type {?} */
        const route = routeNode.value;
        /** @type {?} */
        const i = inheritedParamsDataResolve(route, this.paramsInheritanceStrategy);
        route.params = Object.freeze(i.params);
        route.data = Object.freeze(i.data);
        routeNode.children.forEach(n => this.inheritParamsAndData(n));
    }
    /**
     * @param {?} config
     * @param {?} segmentGroup
     * @param {?} outlet
     * @return {?}
     */
    processSegmentGroup(config, segmentGroup, outlet) {
        if (segmentGroup.segments.length === 0 && segmentGroup.hasChildren()) {
            /** @type {?} */
            const empties = config.filter(r => emptyPathMatch(segmentGroup, segmentGroup.segments, r));
            if (empties.length !== 0) {
                try {
                    return this.processSegment(empties, segmentGroup, segmentGroup.segments, outlet);
                }
                catch (e) {
                    if (!(e instanceof NoMatch))
                        throw e;
                }
            }
            return this.processChildren(config, segmentGroup);
        }
        return this.processSegment(config, segmentGroup, segmentGroup.segments, outlet);
    }
    /**
     * @param {?} config
     * @param {?} segmentGroup
     * @return {?}
     */
    processChildren(config, segmentGroup) {
        /** @type {?} */
        const children = mapChildrenIntoArray(segmentGroup, (child, childOutlet) => this.processSegmentGroup(config, child, childOutlet));
        checkOutletNameUniqueness(children);
        sortActivatedRouteSnapshots(children);
        return children;
    }
    /**
     * @param {?} config
     * @param {?} segmentGroup
     * @param {?} segments
     * @param {?} outlet
     * @return {?}
     */
    processSegment(config, segmentGroup, segments, outlet) {
        for (const r of config) {
            try {
                return this.processSegmentAgainstRoute(r, segmentGroup, segments, outlet);
            }
            catch (e) {
                if (!(e instanceof NoMatch))
                    throw e;
            }
        }
        if (this.noLeftoversInUrl(segmentGroup, segments, outlet)) {
            return [];
        }
        throw new NoMatch();
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
     * @param {?} route
     * @param {?} rawSegment
     * @param {?} segments
     * @param {?} outlet
     * @return {?}
     */
    processSegmentAgainstRoute(route, rawSegment, segments, outlet) {
        if (route.redirectTo)
            throw new NoMatch();
        if ((route.outlet || PRIMARY_OUTLET) !== outlet)
            throw new NoMatch();
        /** @type {?} */
        let snapshot;
        /** @type {?} */
        let consumedSegments = [];
        /** @type {?} */
        let rawSlicedSegments = [];
        if (route.path === '**') {
            /** @type {?} */
            const params = segments.length > 0 ? /** @type {?} */ ((last(segments))).parameters : {};
            snapshot = new ActivatedRouteSnapshot(segments, params, Object.freeze(Object.assign({}, this.urlTree.queryParams)), /** @type {?} */ ((this.urlTree.fragment)), getData(route), outlet, /** @type {?} */ ((route.component)), route, getSourceSegmentGroup(rawSegment), getPathIndexShift(rawSegment) + segments.length, getResolve(route));
        }
        else {
            /** @type {?} */
            const result = match(rawSegment, route, segments);
            consumedSegments = result.consumedSegments;
            rawSlicedSegments = segments.slice(result.lastChild);
            snapshot = new ActivatedRouteSnapshot(consumedSegments, result.parameters, Object.freeze(Object.assign({}, this.urlTree.queryParams)), /** @type {?} */ ((this.urlTree.fragment)), getData(route), outlet, /** @type {?} */ ((route.component)), route, getSourceSegmentGroup(rawSegment), getPathIndexShift(rawSegment) + consumedSegments.length, getResolve(route));
        }
        /** @type {?} */
        const childConfig = getChildConfig(route);
        const { segmentGroup, slicedSegments } = split(rawSegment, consumedSegments, rawSlicedSegments, childConfig, this.relativeLinkResolution);
        if (slicedSegments.length === 0 && segmentGroup.hasChildren()) {
            /** @type {?} */
            const children = this.processChildren(childConfig, segmentGroup);
            return [new TreeNode(snapshot, children)];
        }
        if (childConfig.length === 0 && slicedSegments.length === 0) {
            return [new TreeNode(snapshot, [])];
        }
        /** @type {?} */
        const children = this.processSegment(childConfig, segmentGroup, slicedSegments, PRIMARY_OUTLET);
        return [new TreeNode(snapshot, children)];
    }
}
if (false) {
    /** @type {?} */
    Recognizer.prototype.rootComponentType;
    /** @type {?} */
    Recognizer.prototype.config;
    /** @type {?} */
    Recognizer.prototype.urlTree;
    /** @type {?} */
    Recognizer.prototype.url;
    /** @type {?} */
    Recognizer.prototype.paramsInheritanceStrategy;
    /** @type {?} */
    Recognizer.prototype.relativeLinkResolution;
}
/**
 * @param {?} nodes
 * @return {?}
 */
function sortActivatedRouteSnapshots(nodes) {
    nodes.sort((a, b) => {
        if (a.value.outlet === PRIMARY_OUTLET)
            return -1;
        if (b.value.outlet === PRIMARY_OUTLET)
            return 1;
        return a.value.outlet.localeCompare(b.value.outlet);
    });
}
/**
 * @param {?} route
 * @return {?}
 */
function getChildConfig(route) {
    if (route.children) {
        return route.children;
    }
    if (route.loadChildren) {
        return /** @type {?} */ ((route._loadedConfig)).routes;
    }
    return [];
}
/**
 * @record
 */
function MatchResult() { }
/** @type {?} */
MatchResult.prototype.consumedSegments;
/** @type {?} */
MatchResult.prototype.lastChild;
/** @type {?} */
MatchResult.prototype.parameters;
/**
 * @param {?} segmentGroup
 * @param {?} route
 * @param {?} segments
 * @return {?}
 */
function match(segmentGroup, route, segments) {
    if (route.path === '') {
        if (route.pathMatch === 'full' && (segmentGroup.hasChildren() || segments.length > 0)) {
            throw new NoMatch();
        }
        return { consumedSegments: [], lastChild: 0, parameters: {} };
    }
    /** @type {?} */
    const matcher = route.matcher || defaultUrlMatcher;
    /** @type {?} */
    const res = matcher(segments, segmentGroup, route);
    if (!res)
        throw new NoMatch();
    /** @type {?} */
    const posParams = {};
    forEach(/** @type {?} */ ((res.posParams)), (v, k) => { posParams[k] = v.path; });
    /** @type {?} */
    const parameters = res.consumed.length > 0 ? Object.assign({}, posParams, res.consumed[res.consumed.length - 1].parameters) :
        posParams;
    return { consumedSegments: res.consumed, lastChild: res.consumed.length, parameters };
}
/**
 * @param {?} nodes
 * @return {?}
 */
function checkOutletNameUniqueness(nodes) {
    /** @type {?} */
    const names = {};
    nodes.forEach(n => {
        /** @type {?} */
        const routeWithSameOutletName = names[n.value.outlet];
        if (routeWithSameOutletName) {
            /** @type {?} */
            const p = routeWithSameOutletName.url.map(s => s.toString()).join('/');
            /** @type {?} */
            const c = n.value.url.map(s => s.toString()).join('/');
            throw new Error(`Two segments cannot have the same outlet name: '${p}' and '${c}'.`);
        }
        names[n.value.outlet] = n.value;
    });
}
/**
 * @param {?} segmentGroup
 * @return {?}
 */
function getSourceSegmentGroup(segmentGroup) {
    /** @type {?} */
    let s = segmentGroup;
    while (s._sourceSegment) {
        s = s._sourceSegment;
    }
    return s;
}
/**
 * @param {?} segmentGroup
 * @return {?}
 */
function getPathIndexShift(segmentGroup) {
    /** @type {?} */
    let s = segmentGroup;
    /** @type {?} */
    let res = (s._segmentIndexShift ? s._segmentIndexShift : 0);
    while (s._sourceSegment) {
        s = s._sourceSegment;
        res += (s._segmentIndexShift ? s._segmentIndexShift : 0);
    }
    return res - 1;
}
/**
 * @param {?} segmentGroup
 * @param {?} consumedSegments
 * @param {?} slicedSegments
 * @param {?} config
 * @param {?} relativeLinkResolution
 * @return {?}
 */
function split(segmentGroup, consumedSegments, slicedSegments, config, relativeLinkResolution) {
    if (slicedSegments.length > 0 &&
        containsEmptyPathMatchesWithNamedOutlets(segmentGroup, slicedSegments, config)) {
        /** @type {?} */
        const s = new UrlSegmentGroup(consumedSegments, createChildrenForEmptyPaths(segmentGroup, consumedSegments, config, new UrlSegmentGroup(slicedSegments, segmentGroup.children)));
        s._sourceSegment = segmentGroup;
        s._segmentIndexShift = consumedSegments.length;
        return { segmentGroup: s, slicedSegments: [] };
    }
    if (slicedSegments.length === 0 &&
        containsEmptyPathMatches(segmentGroup, slicedSegments, config)) {
        /** @type {?} */
        const s = new UrlSegmentGroup(segmentGroup.segments, addEmptyPathsToChildrenIfNeeded(segmentGroup, consumedSegments, slicedSegments, config, segmentGroup.children, relativeLinkResolution));
        s._sourceSegment = segmentGroup;
        s._segmentIndexShift = consumedSegments.length;
        return { segmentGroup: s, slicedSegments };
    }
    /** @type {?} */
    const s = new UrlSegmentGroup(segmentGroup.segments, segmentGroup.children);
    s._sourceSegment = segmentGroup;
    s._segmentIndexShift = consumedSegments.length;
    return { segmentGroup: s, slicedSegments };
}
/**
 * @param {?} segmentGroup
 * @param {?} consumedSegments
 * @param {?} slicedSegments
 * @param {?} routes
 * @param {?} children
 * @param {?} relativeLinkResolution
 * @return {?}
 */
function addEmptyPathsToChildrenIfNeeded(segmentGroup, consumedSegments, slicedSegments, routes, children, relativeLinkResolution) {
    /** @type {?} */
    const res = {};
    for (const r of routes) {
        if (emptyPathMatch(segmentGroup, slicedSegments, r) && !children[getOutlet(r)]) {
            /** @type {?} */
            const s = new UrlSegmentGroup([], {});
            s._sourceSegment = segmentGroup;
            if (relativeLinkResolution === 'legacy') {
                s._segmentIndexShift = segmentGroup.segments.length;
            }
            else {
                s._segmentIndexShift = consumedSegments.length;
            }
            res[getOutlet(r)] = s;
        }
    }
    return Object.assign({}, children, res);
}
/**
 * @param {?} segmentGroup
 * @param {?} consumedSegments
 * @param {?} routes
 * @param {?} primarySegment
 * @return {?}
 */
function createChildrenForEmptyPaths(segmentGroup, consumedSegments, routes, primarySegment) {
    /** @type {?} */
    const res = {};
    res[PRIMARY_OUTLET] = primarySegment;
    primarySegment._sourceSegment = segmentGroup;
    primarySegment._segmentIndexShift = consumedSegments.length;
    for (const r of routes) {
        if (r.path === '' && getOutlet(r) !== PRIMARY_OUTLET) {
            /** @type {?} */
            const s = new UrlSegmentGroup([], {});
            s._sourceSegment = segmentGroup;
            s._segmentIndexShift = consumedSegments.length;
            res[getOutlet(r)] = s;
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
function containsEmptyPathMatchesWithNamedOutlets(segmentGroup, slicedSegments, routes) {
    return routes.some(r => emptyPathMatch(segmentGroup, slicedSegments, r) && getOutlet(r) !== PRIMARY_OUTLET);
}
/**
 * @param {?} segmentGroup
 * @param {?} slicedSegments
 * @param {?} routes
 * @return {?}
 */
function containsEmptyPathMatches(segmentGroup, slicedSegments, routes) {
    return routes.some(r => emptyPathMatch(segmentGroup, slicedSegments, r));
}
/**
 * @param {?} segmentGroup
 * @param {?} slicedSegments
 * @param {?} r
 * @return {?}
 */
function emptyPathMatch(segmentGroup, slicedSegments, r) {
    if ((segmentGroup.hasChildren() || slicedSegments.length > 0) && r.pathMatch === 'full') {
        return false;
    }
    return r.path === '' && r.redirectTo === undefined;
}
/**
 * @param {?} route
 * @return {?}
 */
function getOutlet(route) {
    return route.outlet || PRIMARY_OUTLET;
}
/**
 * @param {?} route
 * @return {?}
 */
function getData(route) {
    return route.data || {};
}
/**
 * @param {?} route
 * @return {?}
 */
function getResolve(route) {
    return route.resolve || {};
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb2duaXplLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9yZWNvZ25pemUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFTQSxPQUFPLEVBQUMsVUFBVSxFQUFZLEVBQUUsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUcvQyxPQUFPLEVBQUMsc0JBQXNCLEVBQTZCLG1CQUFtQixFQUFFLDBCQUEwQixFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDbEksT0FBTyxFQUFDLGNBQWMsRUFBRSxpQkFBaUIsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUMzRCxPQUFPLEVBQWEsZUFBZSxFQUFXLG9CQUFvQixFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ3RGLE9BQU8sRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFDakQsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUV0QyxNQUFNLE9BQU87Q0FBRzs7Ozs7Ozs7OztBQUVoQixNQUFNLFVBQVUsU0FBUyxDQUNyQixpQkFBa0MsRUFBRSxNQUFjLEVBQUUsT0FBZ0IsRUFBRSxHQUFXLEVBQ2pGLDRCQUF1RCxXQUFXLEVBQ2xFLHlCQUFpRCxRQUFRO0lBQzNELE9BQU8sSUFBSSxVQUFVLENBQ1YsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUseUJBQXlCLEVBQ2xFLHNCQUFzQixDQUFDO1NBQzdCLFNBQVMsRUFBRSxDQUFDO0NBQ2xCO0FBRUQsTUFBTSxVQUFVOzs7Ozs7Ozs7SUFDZCxZQUNZLG1CQUEyQyxNQUFjLEVBQVUsT0FBZ0IsRUFDbkYsS0FBcUIseUJBQW9ELEVBQ3pFO1FBRkEsc0JBQWlCLEdBQWpCLGlCQUFpQjtRQUEwQixXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQVUsWUFBTyxHQUFQLE9BQU8sQ0FBUztRQUNuRixRQUFHLEdBQUgsR0FBRztR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Y0FBYyxDQUFDLENBQUM7Q0FDOUY7Ozs7Ozs7QUFFRCxTQUFTLHdCQUF3QixDQUM3QixZQUE2QixFQUFFLGNBQTRCLEVBQUUsTUFBZTtJQUM5RSxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQzFFOzs7Ozs7O0FBRUQsU0FBUyxjQUFjLENBQ25CLFlBQTZCLEVBQUUsY0FBNEIsRUFBRSxDQUFRO0lBQ3ZFLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLElBQUksY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxLQUFLLE1BQU0sRUFBRTtRQUN2RixPQUFPLEtBQUssQ0FBQztLQUNkO0lBRUQsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsVUFBVSxLQUFLLFNBQVMsQ0FBQztDQUNwRDs7Ozs7QUFFRCxTQUFTLFNBQVMsQ0FBQyxLQUFZO0lBQzdCLE9BQU8sS0FBSyxDQUFDLE1BQU0sSUFBSSxjQUFjLENBQUM7Q0FDdkM7Ozs7O0FBRUQsU0FBUyxPQUFPLENBQUMsS0FBWTtJQUMzQixPQUFPLEtBQUssQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO0NBQ3pCOzs7OztBQUVELFNBQVMsVUFBVSxDQUFDLEtBQVk7SUFDOUIsT0FBTyxLQUFLLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQztDQUM1QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtUeXBlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgT2JzZXJ2ZXIsIG9mIH0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7RGF0YSwgUmVzb2x2ZURhdGEsIFJvdXRlLCBSb3V0ZXN9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgUGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSwgUm91dGVyU3RhdGVTbmFwc2hvdCwgaW5oZXJpdGVkUGFyYW1zRGF0YVJlc29sdmV9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UFJJTUFSWV9PVVRMRVQsIGRlZmF1bHRVcmxNYXRjaGVyfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge1VybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cCwgVXJsVHJlZSwgbWFwQ2hpbGRyZW5JbnRvQXJyYXl9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtmb3JFYWNoLCBsYXN0fSBmcm9tICcuL3V0aWxzL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtUcmVlTm9kZX0gZnJvbSAnLi91dGlscy90cmVlJztcblxuY2xhc3MgTm9NYXRjaCB7fVxuXG5leHBvcnQgZnVuY3Rpb24gcmVjb2duaXplKFxuICAgIHJvb3RDb21wb25lbnRUeXBlOiBUeXBlPGFueT58IG51bGwsIGNvbmZpZzogUm91dGVzLCB1cmxUcmVlOiBVcmxUcmVlLCB1cmw6IHN0cmluZyxcbiAgICBwYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5OiBQYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5ID0gJ2VtcHR5T25seScsXG4gICAgcmVsYXRpdmVMaW5rUmVzb2x1dGlvbjogJ2xlZ2FjeScgfCAnY29ycmVjdGVkJyA9ICdsZWdhY3knKTogT2JzZXJ2YWJsZTxSb3V0ZXJTdGF0ZVNuYXBzaG90PiB7XG4gIHJldHVybiBuZXcgUmVjb2duaXplcihcbiAgICAgICAgICAgICByb290Q29tcG9uZW50VHlwZSwgY29uZmlnLCB1cmxUcmVlLCB1cmwsIHBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3ksXG4gICAgICAgICAgICAgcmVsYXRpdmVMaW5rUmVzb2x1dGlvbilcbiAgICAgIC5yZWNvZ25pemUoKTtcbn1cblxuY2xhc3MgUmVjb2duaXplciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByb290Q29tcG9uZW50VHlwZTogVHlwZTxhbnk+fG51bGwsIHByaXZhdGUgY29uZmlnOiBSb3V0ZXMsIHByaXZhdGUgdXJsVHJlZTogVXJsVHJlZSxcbiAgICAgIHByaXZhdGUgdXJsOiBzdHJpbmcsIHByaXZhdGUgcGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTogUGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSxcbiAgICAgIHByaXZhdGUgcmVsYXRpdmVMaW5rUmVzb2x1dGlvbjogJ2xlZ2FjeSd8J2NvcnJlY3RlZCcpIHt9XG5cbiAgcmVjb2duaXplKCk6IE9ic2VydmFibGU8Um91dGVyU3RhdGVTbmFwc2hvdD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByb290U2VnbWVudEdyb3VwID1cbiAgICAgICAgICBzcGxpdCh0aGlzLnVybFRyZWUucm9vdCwgW10sIFtdLCB0aGlzLmNvbmZpZywgdGhpcy5yZWxhdGl2ZUxpbmtSZXNvbHV0aW9uKS5zZWdtZW50R3JvdXA7XG5cbiAgICAgIGNvbnN0IGNoaWxkcmVuID0gdGhpcy5wcm9jZXNzU2VnbWVudEdyb3VwKHRoaXMuY29uZmlnLCByb290U2VnbWVudEdyb3VwLCBQUklNQVJZX09VVExFVCk7XG5cbiAgICAgIGNvbnN0IHJvb3QgPSBuZXcgQWN0aXZhdGVkUm91dGVTbmFwc2hvdChcbiAgICAgICAgICBbXSwgT2JqZWN0LmZyZWV6ZSh7fSksIE9iamVjdC5mcmVlemUoey4uLnRoaXMudXJsVHJlZS5xdWVyeVBhcmFtc30pLFxuICAgICAgICAgIHRoaXMudXJsVHJlZS5mcmFnbWVudCAhLCB7fSwgUFJJTUFSWV9PVVRMRVQsIHRoaXMucm9vdENvbXBvbmVudFR5cGUsIG51bGwsXG4gICAgICAgICAgdGhpcy51cmxUcmVlLnJvb3QsIC0xLCB7fSk7XG5cbiAgICAgIGNvbnN0IHJvb3ROb2RlID0gbmV3IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+KHJvb3QsIGNoaWxkcmVuKTtcbiAgICAgIGNvbnN0IHJvdXRlU3RhdGUgPSBuZXcgUm91dGVyU3RhdGVTbmFwc2hvdCh0aGlzLnVybCwgcm9vdE5vZGUpO1xuICAgICAgdGhpcy5pbmhlcml0UGFyYW1zQW5kRGF0YShyb3V0ZVN0YXRlLl9yb290KTtcbiAgICAgIHJldHVybiBvZiAocm91dGVTdGF0ZSk7XG5cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8Um91dGVyU3RhdGVTbmFwc2hvdD4oXG4gICAgICAgICAgKG9iczogT2JzZXJ2ZXI8Um91dGVyU3RhdGVTbmFwc2hvdD4pID0+IG9icy5lcnJvcihlKSk7XG4gICAgfVxuICB9XG5cbiAgaW5oZXJpdFBhcmFtc0FuZERhdGEocm91dGVOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90Pik6IHZvaWQge1xuICAgIGNvbnN0IHJvdXRlID0gcm91dGVOb2RlLnZhbHVlO1xuXG4gICAgY29uc3QgaSA9IGluaGVyaXRlZFBhcmFtc0RhdGFSZXNvbHZlKHJvdXRlLCB0aGlzLnBhcmFtc0luaGVyaXRhbmNlU3RyYXRlZ3kpO1xuICAgIHJvdXRlLnBhcmFtcyA9IE9iamVjdC5mcmVlemUoaS5wYXJhbXMpO1xuICAgIHJvdXRlLmRhdGEgPSBPYmplY3QuZnJlZXplKGkuZGF0YSk7XG5cbiAgICByb3V0ZU5vZGUuY2hpbGRyZW4uZm9yRWFjaChuID0+IHRoaXMuaW5oZXJpdFBhcmFtc0FuZERhdGEobikpO1xuICB9XG5cbiAgcHJvY2Vzc1NlZ21lbnRHcm91cChjb25maWc6IFJvdXRlW10sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBvdXRsZXQ6IHN0cmluZyk6XG4gICAgICBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PltdIHtcbiAgICBpZiAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiBzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgY29uc3QgZW1wdGllcyA9IGNvbmZpZy5maWx0ZXIociA9PiBlbXB0eVBhdGhNYXRjaChzZWdtZW50R3JvdXAsIHNlZ21lbnRHcm91cC5zZWdtZW50cywgcikpO1xuICAgICAgaWYgKGVtcHRpZXMubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc1NlZ21lbnQoZW1wdGllcywgc2VnbWVudEdyb3VwLCBzZWdtZW50R3JvdXAuc2VnbWVudHMsIG91dGxldCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoIShlIGluc3RhbmNlb2YgTm9NYXRjaCkpIHRocm93IGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NDaGlsZHJlbihjb25maWcsIHNlZ21lbnRHcm91cCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucHJvY2Vzc1NlZ21lbnQoY29uZmlnLCBzZWdtZW50R3JvdXAsIHNlZ21lbnRHcm91cC5zZWdtZW50cywgb3V0bGV0KTtcbiAgfVxuXG4gIHByb2Nlc3NDaGlsZHJlbihjb25maWc6IFJvdXRlW10sIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKTpcbiAgICAgIFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10ge1xuICAgIGNvbnN0IGNoaWxkcmVuID0gbWFwQ2hpbGRyZW5JbnRvQXJyYXkoXG4gICAgICAgIHNlZ21lbnRHcm91cCwgKGNoaWxkLCBjaGlsZE91dGxldCkgPT4gdGhpcy5wcm9jZXNzU2VnbWVudEdyb3VwKGNvbmZpZywgY2hpbGQsIGNoaWxkT3V0bGV0KSk7XG4gICAgY2hlY2tPdXRsZXROYW1lVW5pcXVlbmVzcyhjaGlsZHJlbik7XG4gICAgc29ydEFjdGl2YXRlZFJvdXRlU25hcHNob3RzKGNoaWxkcmVuKTtcbiAgICByZXR1cm4gY2hpbGRyZW47XG4gIH1cblxuICBwcm9jZXNzU2VnbWVudChcbiAgICAgIGNvbmZpZzogUm91dGVbXSwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgICBvdXRsZXQ6IHN0cmluZyk6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10ge1xuICAgIGZvciAoY29uc3QgciBvZiBjb25maWcpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NTZWdtZW50QWdhaW5zdFJvdXRlKHIsIHNlZ21lbnRHcm91cCwgc2VnbWVudHMsIG91dGxldCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGlmICghKGUgaW5zdGFuY2VvZiBOb01hdGNoKSkgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMubm9MZWZ0b3ZlcnNJblVybChzZWdtZW50R3JvdXAsIHNlZ21lbnRzLCBvdXRsZXQpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IE5vTWF0Y2goKTtcbiAgfVxuXG4gIHByaXZhdGUgbm9MZWZ0b3ZlcnNJblVybChzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc2VnbWVudHM6IFVybFNlZ21lbnRbXSwgb3V0bGV0OiBzdHJpbmcpOlxuICAgICAgYm9vbGVhbiB7XG4gICAgcmV0dXJuIHNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiAhc2VnbWVudEdyb3VwLmNoaWxkcmVuW291dGxldF07XG4gIH1cblxuICBwcm9jZXNzU2VnbWVudEFnYWluc3RSb3V0ZShcbiAgICAgIHJvdXRlOiBSb3V0ZSwgcmF3U2VnbWVudDogVXJsU2VnbWVudEdyb3VwLCBzZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgICAgb3V0bGV0OiBzdHJpbmcpOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PltdIHtcbiAgICBpZiAocm91dGUucmVkaXJlY3RUbykgdGhyb3cgbmV3IE5vTWF0Y2goKTtcblxuICAgIGlmICgocm91dGUub3V0bGV0IHx8IFBSSU1BUllfT1VUTEVUKSAhPT0gb3V0bGV0KSB0aHJvdyBuZXcgTm9NYXRjaCgpO1xuXG4gICAgbGV0IHNuYXBzaG90OiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90O1xuICAgIGxldCBjb25zdW1lZFNlZ21lbnRzOiBVcmxTZWdtZW50W10gPSBbXTtcbiAgICBsZXQgcmF3U2xpY2VkU2VnbWVudHM6IFVybFNlZ21lbnRbXSA9IFtdO1xuXG4gICAgaWYgKHJvdXRlLnBhdGggPT09ICcqKicpIHtcbiAgICAgIGNvbnN0IHBhcmFtcyA9IHNlZ21lbnRzLmxlbmd0aCA+IDAgPyBsYXN0KHNlZ21lbnRzKSAhLnBhcmFtZXRlcnMgOiB7fTtcbiAgICAgIHNuYXBzaG90ID0gbmV3IEFjdGl2YXRlZFJvdXRlU25hcHNob3QoXG4gICAgICAgICAgc2VnbWVudHMsIHBhcmFtcywgT2JqZWN0LmZyZWV6ZSh7Li4udGhpcy51cmxUcmVlLnF1ZXJ5UGFyYW1zfSksIHRoaXMudXJsVHJlZS5mcmFnbWVudCAhLFxuICAgICAgICAgIGdldERhdGEocm91dGUpLCBvdXRsZXQsIHJvdXRlLmNvbXBvbmVudCAhLCByb3V0ZSwgZ2V0U291cmNlU2VnbWVudEdyb3VwKHJhd1NlZ21lbnQpLFxuICAgICAgICAgIGdldFBhdGhJbmRleFNoaWZ0KHJhd1NlZ21lbnQpICsgc2VnbWVudHMubGVuZ3RoLCBnZXRSZXNvbHZlKHJvdXRlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHJlc3VsdDogTWF0Y2hSZXN1bHQgPSBtYXRjaChyYXdTZWdtZW50LCByb3V0ZSwgc2VnbWVudHMpO1xuICAgICAgY29uc3VtZWRTZWdtZW50cyA9IHJlc3VsdC5jb25zdW1lZFNlZ21lbnRzO1xuICAgICAgcmF3U2xpY2VkU2VnbWVudHMgPSBzZWdtZW50cy5zbGljZShyZXN1bHQubGFzdENoaWxkKTtcblxuICAgICAgc25hcHNob3QgPSBuZXcgQWN0aXZhdGVkUm91dGVTbmFwc2hvdChcbiAgICAgICAgICBjb25zdW1lZFNlZ21lbnRzLCByZXN1bHQucGFyYW1ldGVycywgT2JqZWN0LmZyZWV6ZSh7Li4udGhpcy51cmxUcmVlLnF1ZXJ5UGFyYW1zfSksXG4gICAgICAgICAgdGhpcy51cmxUcmVlLmZyYWdtZW50ICEsIGdldERhdGEocm91dGUpLCBvdXRsZXQsIHJvdXRlLmNvbXBvbmVudCAhLCByb3V0ZSxcbiAgICAgICAgICBnZXRTb3VyY2VTZWdtZW50R3JvdXAocmF3U2VnbWVudCksXG4gICAgICAgICAgZ2V0UGF0aEluZGV4U2hpZnQocmF3U2VnbWVudCkgKyBjb25zdW1lZFNlZ21lbnRzLmxlbmd0aCwgZ2V0UmVzb2x2ZShyb3V0ZSkpO1xuICAgIH1cblxuICAgIGNvbnN0IGNoaWxkQ29uZmlnOiBSb3V0ZVtdID0gZ2V0Q2hpbGRDb25maWcocm91dGUpO1xuXG4gICAgY29uc3Qge3NlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHN9ID0gc3BsaXQoXG4gICAgICAgIHJhd1NlZ21lbnQsIGNvbnN1bWVkU2VnbWVudHMsIHJhd1NsaWNlZFNlZ21lbnRzLCBjaGlsZENvbmZpZywgdGhpcy5yZWxhdGl2ZUxpbmtSZXNvbHV0aW9uKTtcblxuICAgIGlmIChzbGljZWRTZWdtZW50cy5sZW5ndGggPT09IDAgJiYgc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkpIHtcbiAgICAgIGNvbnN0IGNoaWxkcmVuID0gdGhpcy5wcm9jZXNzQ2hpbGRyZW4oY2hpbGRDb25maWcsIHNlZ21lbnRHcm91cCk7XG4gICAgICByZXR1cm4gW25ldyBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PihzbmFwc2hvdCwgY2hpbGRyZW4pXTtcbiAgICB9XG5cbiAgICBpZiAoY2hpbGRDb25maWcubGVuZ3RoID09PSAwICYmIHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIFtuZXcgVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4oc25hcHNob3QsIFtdKV07XG4gICAgfVxuXG4gICAgY29uc3QgY2hpbGRyZW4gPSB0aGlzLnByb2Nlc3NTZWdtZW50KGNoaWxkQ29uZmlnLCBzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzLCBQUklNQVJZX09VVExFVCk7XG4gICAgcmV0dXJuIFtuZXcgVHJlZU5vZGU8QWN0aXZhdGVkUm91dGVTbmFwc2hvdD4oc25hcHNob3QsIGNoaWxkcmVuKV07XG4gIH1cbn1cblxuZnVuY3Rpb24gc29ydEFjdGl2YXRlZFJvdXRlU25hcHNob3RzKG5vZGVzOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90PltdKTogdm9pZCB7XG4gIG5vZGVzLnNvcnQoKGEsIGIpID0+IHtcbiAgICBpZiAoYS52YWx1ZS5vdXRsZXQgPT09IFBSSU1BUllfT1VUTEVUKSByZXR1cm4gLTE7XG4gICAgaWYgKGIudmFsdWUub3V0bGV0ID09PSBQUklNQVJZX09VVExFVCkgcmV0dXJuIDE7XG4gICAgcmV0dXJuIGEudmFsdWUub3V0bGV0LmxvY2FsZUNvbXBhcmUoYi52YWx1ZS5vdXRsZXQpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0Q2hpbGRDb25maWcocm91dGU6IFJvdXRlKTogUm91dGVbXSB7XG4gIGlmIChyb3V0ZS5jaGlsZHJlbikge1xuICAgIHJldHVybiByb3V0ZS5jaGlsZHJlbjtcbiAgfVxuXG4gIGlmIChyb3V0ZS5sb2FkQ2hpbGRyZW4pIHtcbiAgICByZXR1cm4gcm91dGUuX2xvYWRlZENvbmZpZyAhLnJvdXRlcztcbiAgfVxuXG4gIHJldHVybiBbXTtcbn1cblxuaW50ZXJmYWNlIE1hdGNoUmVzdWx0IHtcbiAgY29uc3VtZWRTZWdtZW50czogVXJsU2VnbWVudFtdO1xuICBsYXN0Q2hpbGQ6IG51bWJlcjtcbiAgcGFyYW1ldGVyczogYW55O1xufVxuXG5mdW5jdGlvbiBtYXRjaChzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcm91dGU6IFJvdXRlLCBzZWdtZW50czogVXJsU2VnbWVudFtdKTogTWF0Y2hSZXN1bHQge1xuICBpZiAocm91dGUucGF0aCA9PT0gJycpIHtcbiAgICBpZiAocm91dGUucGF0aE1hdGNoID09PSAnZnVsbCcgJiYgKHNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpIHx8IHNlZ21lbnRzLmxlbmd0aCA+IDApKSB7XG4gICAgICB0aHJvdyBuZXcgTm9NYXRjaCgpO1xuICAgIH1cblxuICAgIHJldHVybiB7Y29uc3VtZWRTZWdtZW50czogW10sIGxhc3RDaGlsZDogMCwgcGFyYW1ldGVyczoge319O1xuICB9XG5cbiAgY29uc3QgbWF0Y2hlciA9IHJvdXRlLm1hdGNoZXIgfHwgZGVmYXVsdFVybE1hdGNoZXI7XG4gIGNvbnN0IHJlcyA9IG1hdGNoZXIoc2VnbWVudHMsIHNlZ21lbnRHcm91cCwgcm91dGUpO1xuICBpZiAoIXJlcykgdGhyb3cgbmV3IE5vTWF0Y2goKTtcblxuICBjb25zdCBwb3NQYXJhbXM6IHtbbjogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICBmb3JFYWNoKHJlcy5wb3NQYXJhbXMgISwgKHY6IFVybFNlZ21lbnQsIGs6IHN0cmluZykgPT4geyBwb3NQYXJhbXNba10gPSB2LnBhdGg7IH0pO1xuICBjb25zdCBwYXJhbWV0ZXJzID0gcmVzLmNvbnN1bWVkLmxlbmd0aCA+IDAgP1xuICAgICAgey4uLnBvc1BhcmFtcywgLi4ucmVzLmNvbnN1bWVkW3Jlcy5jb25zdW1lZC5sZW5ndGggLSAxXS5wYXJhbWV0ZXJzfSA6XG4gICAgICBwb3NQYXJhbXM7XG5cbiAgcmV0dXJuIHtjb25zdW1lZFNlZ21lbnRzOiByZXMuY29uc3VtZWQsIGxhc3RDaGlsZDogcmVzLmNvbnN1bWVkLmxlbmd0aCwgcGFyYW1ldGVyc307XG59XG5cbmZ1bmN0aW9uIGNoZWNrT3V0bGV0TmFtZVVuaXF1ZW5lc3Mobm9kZXM6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlU25hcHNob3Q+W10pOiB2b2lkIHtcbiAgY29uc3QgbmFtZXM6IHtbazogc3RyaW5nXTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdH0gPSB7fTtcbiAgbm9kZXMuZm9yRWFjaChuID0+IHtcbiAgICBjb25zdCByb3V0ZVdpdGhTYW1lT3V0bGV0TmFtZSA9IG5hbWVzW24udmFsdWUub3V0bGV0XTtcbiAgICBpZiAocm91dGVXaXRoU2FtZU91dGxldE5hbWUpIHtcbiAgICAgIGNvbnN0IHAgPSByb3V0ZVdpdGhTYW1lT3V0bGV0TmFtZS51cmwubWFwKHMgPT4gcy50b1N0cmluZygpKS5qb2luKCcvJyk7XG4gICAgICBjb25zdCBjID0gbi52YWx1ZS51cmwubWFwKHMgPT4gcy50b1N0cmluZygpKS5qb2luKCcvJyk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFR3byBzZWdtZW50cyBjYW5ub3QgaGF2ZSB0aGUgc2FtZSBvdXRsZXQgbmFtZTogJyR7cH0nIGFuZCAnJHtjfScuYCk7XG4gICAgfVxuICAgIG5hbWVzW24udmFsdWUub3V0bGV0XSA9IG4udmFsdWU7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRTb3VyY2VTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXApOiBVcmxTZWdtZW50R3JvdXAge1xuICBsZXQgcyA9IHNlZ21lbnRHcm91cDtcbiAgd2hpbGUgKHMuX3NvdXJjZVNlZ21lbnQpIHtcbiAgICBzID0gcy5fc291cmNlU2VnbWVudDtcbiAgfVxuICByZXR1cm4gcztcbn1cblxuZnVuY3Rpb24gZ2V0UGF0aEluZGV4U2hpZnQoc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXApOiBudW1iZXIge1xuICBsZXQgcyA9IHNlZ21lbnRHcm91cDtcbiAgbGV0IHJlcyA9IChzLl9zZWdtZW50SW5kZXhTaGlmdCA/IHMuX3NlZ21lbnRJbmRleFNoaWZ0IDogMCk7XG4gIHdoaWxlIChzLl9zb3VyY2VTZWdtZW50KSB7XG4gICAgcyA9IHMuX3NvdXJjZVNlZ21lbnQ7XG4gICAgcmVzICs9IChzLl9zZWdtZW50SW5kZXhTaGlmdCA/IHMuX3NlZ21lbnRJbmRleFNoaWZ0IDogMCk7XG4gIH1cbiAgcmV0dXJuIHJlcyAtIDE7XG59XG5cbmZ1bmN0aW9uIHNwbGl0KFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBjb25zdW1lZFNlZ21lbnRzOiBVcmxTZWdtZW50W10sIHNsaWNlZFNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgY29uZmlnOiBSb3V0ZVtdLCByZWxhdGl2ZUxpbmtSZXNvbHV0aW9uOiAnbGVnYWN5JyB8ICdjb3JyZWN0ZWQnKSB7XG4gIGlmIChzbGljZWRTZWdtZW50cy5sZW5ndGggPiAwICYmXG4gICAgICBjb250YWluc0VtcHR5UGF0aE1hdGNoZXNXaXRoTmFtZWRPdXRsZXRzKHNlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHMsIGNvbmZpZykpIHtcbiAgICBjb25zdCBzID0gbmV3IFVybFNlZ21lbnRHcm91cChcbiAgICAgICAgY29uc3VtZWRTZWdtZW50cywgY3JlYXRlQ2hpbGRyZW5Gb3JFbXB0eVBhdGhzKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VnbWVudEdyb3VwLCBjb25zdW1lZFNlZ21lbnRzLCBjb25maWcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgVXJsU2VnbWVudEdyb3VwKHNsaWNlZFNlZ21lbnRzLCBzZWdtZW50R3JvdXAuY2hpbGRyZW4pKSk7XG4gICAgcy5fc291cmNlU2VnbWVudCA9IHNlZ21lbnRHcm91cDtcbiAgICBzLl9zZWdtZW50SW5kZXhTaGlmdCA9IGNvbnN1bWVkU2VnbWVudHMubGVuZ3RoO1xuICAgIHJldHVybiB7c2VnbWVudEdyb3VwOiBzLCBzbGljZWRTZWdtZW50czogW119O1xuICB9XG5cbiAgaWYgKHNsaWNlZFNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgY29udGFpbnNFbXB0eVBhdGhNYXRjaGVzKHNlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHMsIGNvbmZpZykpIHtcbiAgICBjb25zdCBzID0gbmV3IFVybFNlZ21lbnRHcm91cChcbiAgICAgICAgc2VnbWVudEdyb3VwLnNlZ21lbnRzLCBhZGRFbXB0eVBhdGhzVG9DaGlsZHJlbklmTmVlZGVkKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWdtZW50R3JvdXAsIGNvbnN1bWVkU2VnbWVudHMsIHNsaWNlZFNlZ21lbnRzLCBjb25maWcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlZ21lbnRHcm91cC5jaGlsZHJlbiwgcmVsYXRpdmVMaW5rUmVzb2x1dGlvbikpO1xuICAgIHMuX3NvdXJjZVNlZ21lbnQgPSBzZWdtZW50R3JvdXA7XG4gICAgcy5fc2VnbWVudEluZGV4U2hpZnQgPSBjb25zdW1lZFNlZ21lbnRzLmxlbmd0aDtcbiAgICByZXR1cm4ge3NlZ21lbnRHcm91cDogcywgc2xpY2VkU2VnbWVudHN9O1xuICB9XG5cbiAgY29uc3QgcyA9IG5ldyBVcmxTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLCBzZWdtZW50R3JvdXAuY2hpbGRyZW4pO1xuICBzLl9zb3VyY2VTZWdtZW50ID0gc2VnbWVudEdyb3VwO1xuICBzLl9zZWdtZW50SW5kZXhTaGlmdCA9IGNvbnN1bWVkU2VnbWVudHMubGVuZ3RoO1xuICByZXR1cm4ge3NlZ21lbnRHcm91cDogcywgc2xpY2VkU2VnbWVudHN9O1xufVxuXG5mdW5jdGlvbiBhZGRFbXB0eVBhdGhzVG9DaGlsZHJlbklmTmVlZGVkKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBjb25zdW1lZFNlZ21lbnRzOiBVcmxTZWdtZW50W10sIHNsaWNlZFNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgcm91dGVzOiBSb3V0ZVtdLCBjaGlsZHJlbjoge1tuYW1lOiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9LFxuICAgIHJlbGF0aXZlTGlua1Jlc29sdXRpb246ICdsZWdhY3knIHwgJ2NvcnJlY3RlZCcpOiB7W25hbWU6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0ge1xuICBjb25zdCByZXM6IHtbbmFtZTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICBmb3IgKGNvbnN0IHIgb2Ygcm91dGVzKSB7XG4gICAgaWYgKGVtcHR5UGF0aE1hdGNoKHNlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHMsIHIpICYmICFjaGlsZHJlbltnZXRPdXRsZXQocildKSB7XG4gICAgICBjb25zdCBzID0gbmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pO1xuICAgICAgcy5fc291cmNlU2VnbWVudCA9IHNlZ21lbnRHcm91cDtcbiAgICAgIGlmIChyZWxhdGl2ZUxpbmtSZXNvbHV0aW9uID09PSAnbGVnYWN5Jykge1xuICAgICAgICBzLl9zZWdtZW50SW5kZXhTaGlmdCA9IHNlZ21lbnRHcm91cC5zZWdtZW50cy5sZW5ndGg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzLl9zZWdtZW50SW5kZXhTaGlmdCA9IGNvbnN1bWVkU2VnbWVudHMubGVuZ3RoO1xuICAgICAgfVxuICAgICAgcmVzW2dldE91dGxldChyKV0gPSBzO1xuICAgIH1cbiAgfVxuICByZXR1cm4gey4uLmNoaWxkcmVuLCAuLi5yZXN9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVDaGlsZHJlbkZvckVtcHR5UGF0aHMoXG4gICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIGNvbnN1bWVkU2VnbWVudHM6IFVybFNlZ21lbnRbXSwgcm91dGVzOiBSb3V0ZVtdLFxuICAgIHByaW1hcnlTZWdtZW50OiBVcmxTZWdtZW50R3JvdXApOiB7W25hbWU6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0ge1xuICBjb25zdCByZXM6IHtbbmFtZTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICByZXNbUFJJTUFSWV9PVVRMRVRdID0gcHJpbWFyeVNlZ21lbnQ7XG4gIHByaW1hcnlTZWdtZW50Ll9zb3VyY2VTZWdtZW50ID0gc2VnbWVudEdyb3VwO1xuICBwcmltYXJ5U2VnbWVudC5fc2VnbWVudEluZGV4U2hpZnQgPSBjb25zdW1lZFNlZ21lbnRzLmxlbmd0aDtcblxuICBmb3IgKGNvbnN0IHIgb2Ygcm91dGVzKSB7XG4gICAgaWYgKHIucGF0aCA9PT0gJycgJiYgZ2V0T3V0bGV0KHIpICE9PSBQUklNQVJZX09VVExFVCkge1xuICAgICAgY29uc3QgcyA9IG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KTtcbiAgICAgIHMuX3NvdXJjZVNlZ21lbnQgPSBzZWdtZW50R3JvdXA7XG4gICAgICBzLl9zZWdtZW50SW5kZXhTaGlmdCA9IGNvbnN1bWVkU2VnbWVudHMubGVuZ3RoO1xuICAgICAgcmVzW2dldE91dGxldChyKV0gPSBzO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG5mdW5jdGlvbiBjb250YWluc0VtcHR5UGF0aE1hdGNoZXNXaXRoTmFtZWRPdXRsZXRzKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50czogVXJsU2VnbWVudFtdLCByb3V0ZXM6IFJvdXRlW10pOiBib29sZWFuIHtcbiAgcmV0dXJuIHJvdXRlcy5zb21lKFxuICAgICAgciA9PiBlbXB0eVBhdGhNYXRjaChzZWdtZW50R3JvdXAsIHNsaWNlZFNlZ21lbnRzLCByKSAmJiBnZXRPdXRsZXQocikgIT09IFBSSU1BUllfT1VUTEVUKTtcbn1cblxuZnVuY3Rpb24gY29udGFpbnNFbXB0eVBhdGhNYXRjaGVzKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50czogVXJsU2VnbWVudFtdLCByb3V0ZXM6IFJvdXRlW10pOiBib29sZWFuIHtcbiAgcmV0dXJuIHJvdXRlcy5zb21lKHIgPT4gZW1wdHlQYXRoTWF0Y2goc2VnbWVudEdyb3VwLCBzbGljZWRTZWdtZW50cywgcikpO1xufVxuXG5mdW5jdGlvbiBlbXB0eVBhdGhNYXRjaChcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc2xpY2VkU2VnbWVudHM6IFVybFNlZ21lbnRbXSwgcjogUm91dGUpOiBib29sZWFuIHtcbiAgaWYgKChzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSB8fCBzbGljZWRTZWdtZW50cy5sZW5ndGggPiAwKSAmJiByLnBhdGhNYXRjaCA9PT0gJ2Z1bGwnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHIucGF0aCA9PT0gJycgJiYgci5yZWRpcmVjdFRvID09PSB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGdldE91dGxldChyb3V0ZTogUm91dGUpOiBzdHJpbmcge1xuICByZXR1cm4gcm91dGUub3V0bGV0IHx8IFBSSU1BUllfT1VUTEVUO1xufVxuXG5mdW5jdGlvbiBnZXREYXRhKHJvdXRlOiBSb3V0ZSk6IERhdGEge1xuICByZXR1cm4gcm91dGUuZGF0YSB8fCB7fTtcbn1cblxuZnVuY3Rpb24gZ2V0UmVzb2x2ZShyb3V0ZTogUm91dGUpOiBSZXNvbHZlRGF0YSB7XG4gIHJldHVybiByb3V0ZS5yZXNvbHZlIHx8IHt9O1xufVxuIl19