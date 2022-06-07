/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { PRIMARY_OUTLET } from './shared';
import { createRoot, squashSegmentGroup, UrlSegment, UrlSegmentGroup, UrlTree } from './url_tree';
import { forEach, last, shallowEqual } from './utils/collection';
/**
 * Creates a `UrlTree` relative to an `ActivatedRouteSnapshot`.
 *
 * @publicApi
 *
 *
 * @param relativeTo The `ActivatedRouteSnapshot` to apply the commands to
 * @param commands An array of URL fragments with which to construct the new URL tree.
 * If the path is static, can be the literal URL string. For a dynamic path, pass an array of path
 * segments, followed by the parameters for each segment.
 * The fragments are applied to the one provided in the `relativeTo` parameter.
 * @param queryParams The query parameters for the `UrlTree`. `null` if the `UrlTree` does not have
 *     any query parameters.
 * @param fragment The fragment for the `UrlTree`. `null` if the `UrlTree` does not have a fragment.
 *
 * @usageNotes
 *
 * ```
 * // create /team/33/user/11
 * createUrlTreeFromSnapshot(snapshot, ['/team', 33, 'user', 11]);
 *
 * // create /team/33;expand=true/user/11
 * createUrlTreeFromSnapshot(snapshot, ['/team', 33, {expand: true}, 'user', 11]);
 *
 * // you can collapse static segments like this (this works only with the first passed-in value):
 * createUrlTreeFromSnapshot(snapshot, ['/team/33/user', userId]);
 *
 * // If the first segment can contain slashes, and you do not want the router to split it,
 * // you can do the following:
 * createUrlTreeFromSnapshot(snapshot, [{segmentPath: '/one/two'}]);
 *
 * // create /team/33/(user/11//right:chat)
 * createUrlTreeFromSnapshot(snapshot, ['/team', 33, {outlets: {primary: 'user/11', right:
 * 'chat'}}], null, null);
 *
 * // remove the right secondary node
 * createUrlTreeFromSnapshot(snapshot, ['/team', 33, {outlets: {primary: 'user/11', right: null}}]);
 *
 * // For the examples below, assume the current URL is for the `/team/33/user/11` and the
 * `ActivatedRouteSnapshot` points to `user/11`:
 *
 * // navigate to /team/33/user/11/details
 * createUrlTreeFromSnapshot(snapshot, ['details']);
 *
 * // navigate to /team/33/user/22
 * createUrlTreeFromSnapshot(snapshot, ['../22']);
 *
 * // navigate to /team/44/user/22
 * createUrlTreeFromSnapshot(snapshot, ['../../team/44/user/22']);
 * ```
 */
export function createUrlTreeFromSnapshot(relativeTo, commands, queryParams = null, fragment = null) {
    const relativeToUrlSegmentGroup = createSegmentGroupFromRoute(relativeTo);
    return createUrlTreeFromSegmentGroup(relativeToUrlSegmentGroup, commands, queryParams, fragment);
}
function createSegmentGroupFromRoute(route) {
    let targetGroup;
    function createSegmentGroupFromRouteRecursive(currentRoute) {
        const childOutlets = {};
        for (const childSnapshot of currentRoute.children) {
            const root = createSegmentGroupFromRouteRecursive(childSnapshot);
            childOutlets[childSnapshot.outlet] = root;
        }
        const segmentGroup = new UrlSegmentGroup(currentRoute.url, childOutlets);
        if (currentRoute === route) {
            targetGroup = segmentGroup;
        }
        return segmentGroup;
    }
    const rootCandidate = createSegmentGroupFromRouteRecursive(route.root);
    const rootSegmentGroup = createRoot(rootCandidate);
    return targetGroup ?? rootSegmentGroup;
}
export function createUrlTreeFromSegmentGroup(relativeTo, commands, queryParams, fragment) {
    let root = relativeTo;
    while (root.parent) {
        root = root.parent;
    }
    // There are no commands so the `UrlTree` goes to the same path as the one created from the
    // `UrlSegmentGroup`. All we need to do is update the `queryParams` and `fragment` without
    // applying any other logic.
    if (commands.length === 0) {
        return tree(root, root, root, queryParams, fragment);
    }
    const nav = computeNavigation(commands);
    if (nav.toRoot()) {
        return tree(root, root, new UrlSegmentGroup([], {}), queryParams, fragment);
    }
    const position = findStartingPositionForTargetGroup(nav, root, relativeTo);
    const newSegmentGroup = position.processChildren ?
        updateSegmentGroupChildren(position.segmentGroup, position.index, nav.commands) :
        updateSegmentGroup(position.segmentGroup, position.index, nav.commands);
    return tree(root, position.segmentGroup, newSegmentGroup, queryParams, fragment);
}
export function createUrlTree(route, urlTree, commands, queryParams, fragment) {
    if (commands.length === 0) {
        return tree(urlTree.root, urlTree.root, urlTree.root, queryParams, fragment);
    }
    const nav = computeNavigation(commands);
    if (nav.toRoot()) {
        return tree(urlTree.root, urlTree.root, new UrlSegmentGroup([], {}), queryParams, fragment);
    }
    function createTreeUsingPathIndex(lastPathIndex) {
        const startingPosition = findStartingPosition(nav, urlTree, route.snapshot?._urlSegment, lastPathIndex);
        const segmentGroup = startingPosition.processChildren ?
            updateSegmentGroupChildren(startingPosition.segmentGroup, startingPosition.index, nav.commands) :
            updateSegmentGroup(startingPosition.segmentGroup, startingPosition.index, nav.commands);
        return tree(urlTree.root, startingPosition.segmentGroup, segmentGroup, queryParams, fragment);
    }
    // Note: The types should disallow `snapshot` from being `undefined` but due to test mocks, this
    // may be the case. Since we try to access it at an earlier point before the refactor to add the
    // warning for `relativeLinkResolution: 'legacy'`, this may cause failures in tests where it
    // didn't before.
    const result = createTreeUsingPathIndex(route.snapshot?._lastPathIndex);
    // Check if application is relying on `relativeLinkResolution: 'legacy'`
    if (typeof ngDevMode === 'undefined' || !!ngDevMode) {
        const correctedResult = createTreeUsingPathIndex(route.snapshot?._correctedLastPathIndex);
        if (correctedResult.toString() !== result.toString()) {
            console.warn(`relativeLinkResolution: 'legacy' is deprecated and will be removed in a future version of Angular. The link to ${result.toString()} will change to ${correctedResult.toString()} if the code is not updated before then.`);
        }
    }
    return result;
}
function isMatrixParams(command) {
    return typeof command === 'object' && command != null && !command.outlets && !command.segmentPath;
}
/**
 * Determines if a given command has an `outlets` map. When we encounter a command
 * with an outlets k/v map, we need to apply each outlet individually to the existing segment.
 */
function isCommandWithOutlets(command) {
    return typeof command === 'object' && command != null && command.outlets;
}
function tree(oldRoot, oldSegmentGroup, newSegmentGroup, queryParams, fragment) {
    let qp = {};
    if (queryParams) {
        forEach(queryParams, (value, name) => {
            qp[name] = Array.isArray(value) ? value.map((v) => `${v}`) : `${value}`;
        });
    }
    let rootCandidate;
    if (oldRoot === oldSegmentGroup) {
        rootCandidate = newSegmentGroup;
    }
    else {
        rootCandidate = replaceSegment(oldRoot, oldSegmentGroup, newSegmentGroup);
    }
    const newRoot = createRoot(squashSegmentGroup(rootCandidate));
    return new UrlTree(newRoot, qp, fragment);
}
/**
 * Replaces the `oldSegment` which is located in some child of the `current` with the `newSegment`.
 * This also has the effect of creating new `UrlSegmentGroup` copies to update references. This
 * shouldn't be necessary but the fallback logic for an invalid ActivatedRoute in the creation uses
 * the Router's current url tree. If we don't create new segment groups, we end up modifying that
 * value.
 */
function replaceSegment(current, oldSegment, newSegment) {
    const children = {};
    forEach(current.children, (c, outletName) => {
        if (c === oldSegment) {
            children[outletName] = newSegment;
        }
        else {
            children[outletName] = replaceSegment(c, oldSegment, newSegment);
        }
    });
    return new UrlSegmentGroup(current.segments, children);
}
class Navigation {
    constructor(isAbsolute, numberOfDoubleDots, commands) {
        this.isAbsolute = isAbsolute;
        this.numberOfDoubleDots = numberOfDoubleDots;
        this.commands = commands;
        if (isAbsolute && commands.length > 0 && isMatrixParams(commands[0])) {
            throw new Error('Root segment cannot have matrix parameters');
        }
        const cmdWithOutlet = commands.find(isCommandWithOutlets);
        if (cmdWithOutlet && cmdWithOutlet !== last(commands)) {
            throw new Error('{outlets:{}} has to be the last command');
        }
    }
    toRoot() {
        return this.isAbsolute && this.commands.length === 1 && this.commands[0] == '/';
    }
}
/** Transforms commands to a normalized `Navigation` */
function computeNavigation(commands) {
    if ((typeof commands[0] === 'string') && commands.length === 1 && commands[0] === '/') {
        return new Navigation(true, 0, commands);
    }
    let numberOfDoubleDots = 0;
    let isAbsolute = false;
    const res = commands.reduce((res, cmd, cmdIdx) => {
        if (typeof cmd === 'object' && cmd != null) {
            if (cmd.outlets) {
                const outlets = {};
                forEach(cmd.outlets, (commands, name) => {
                    outlets[name] = typeof commands === 'string' ? commands.split('/') : commands;
                });
                return [...res, { outlets }];
            }
            if (cmd.segmentPath) {
                return [...res, cmd.segmentPath];
            }
        }
        if (!(typeof cmd === 'string')) {
            return [...res, cmd];
        }
        if (cmdIdx === 0) {
            cmd.split('/').forEach((urlPart, partIndex) => {
                if (partIndex == 0 && urlPart === '.') {
                    // skip './a'
                }
                else if (partIndex == 0 && urlPart === '') { //  '/a'
                    isAbsolute = true;
                }
                else if (urlPart === '..') { //  '../a'
                    numberOfDoubleDots++;
                }
                else if (urlPart != '') {
                    res.push(urlPart);
                }
            });
            return res;
        }
        return [...res, cmd];
    }, []);
    return new Navigation(isAbsolute, numberOfDoubleDots, res);
}
class Position {
    constructor(segmentGroup, processChildren, index) {
        this.segmentGroup = segmentGroup;
        this.processChildren = processChildren;
        this.index = index;
    }
}
function findStartingPositionForTargetGroup(nav, root, target) {
    if (nav.isAbsolute) {
        return new Position(root, true, 0);
    }
    if (!target) {
        // `NaN` is used only to maintain backwards compatibility with incorrectly mocked
        // `ActivatedRouteSnapshot` in tests. In prior versions of this code, the position here was
        // determined based on an internal property that was rarely mocked, resulting in `NaN`. In
        // reality, this code path should _never_ be touched since `target` is not allowed to be falsey.
        return new Position(root, false, NaN);
    }
    if (target.parent === null) {
        return new Position(target, true, 0);
    }
    const modifier = isMatrixParams(nav.commands[0]) ? 0 : 1;
    const index = target.segments.length - 1 + modifier;
    return createPositionApplyingDoubleDots(target, index, nav.numberOfDoubleDots);
}
function findStartingPosition(nav, tree, segmentGroup, lastPathIndex) {
    if (nav.isAbsolute) {
        return new Position(tree.root, true, 0);
    }
    if (lastPathIndex === -1) {
        // Pathless ActivatedRoute has _lastPathIndex === -1 but should not process children
        // see issue #26224, #13011, #35687
        // However, if the ActivatedRoute is the root we should process children like above.
        const processChildren = segmentGroup === tree.root;
        return new Position(segmentGroup, processChildren, 0);
    }
    const modifier = isMatrixParams(nav.commands[0]) ? 0 : 1;
    const index = lastPathIndex + modifier;
    return createPositionApplyingDoubleDots(segmentGroup, index, nav.numberOfDoubleDots);
}
function createPositionApplyingDoubleDots(group, index, numberOfDoubleDots) {
    let g = group;
    let ci = index;
    let dd = numberOfDoubleDots;
    while (dd > ci) {
        dd -= ci;
        g = g.parent;
        if (!g) {
            throw new Error('Invalid number of \'../\'');
        }
        ci = g.segments.length;
    }
    return new Position(g, false, ci - dd);
}
function getOutlets(commands) {
    if (isCommandWithOutlets(commands[0])) {
        return commands[0].outlets;
    }
    return { [PRIMARY_OUTLET]: commands };
}
function updateSegmentGroup(segmentGroup, startIndex, commands) {
    if (!segmentGroup) {
        segmentGroup = new UrlSegmentGroup([], {});
    }
    if (segmentGroup.segments.length === 0 && segmentGroup.hasChildren()) {
        return updateSegmentGroupChildren(segmentGroup, startIndex, commands);
    }
    const m = prefixedWith(segmentGroup, startIndex, commands);
    const slicedCommands = commands.slice(m.commandIndex);
    if (m.match && m.pathIndex < segmentGroup.segments.length) {
        const g = new UrlSegmentGroup(segmentGroup.segments.slice(0, m.pathIndex), {});
        g.children[PRIMARY_OUTLET] =
            new UrlSegmentGroup(segmentGroup.segments.slice(m.pathIndex), segmentGroup.children);
        return updateSegmentGroupChildren(g, 0, slicedCommands);
    }
    else if (m.match && slicedCommands.length === 0) {
        return new UrlSegmentGroup(segmentGroup.segments, {});
    }
    else if (m.match && !segmentGroup.hasChildren()) {
        return createNewSegmentGroup(segmentGroup, startIndex, commands);
    }
    else if (m.match) {
        return updateSegmentGroupChildren(segmentGroup, 0, slicedCommands);
    }
    else {
        return createNewSegmentGroup(segmentGroup, startIndex, commands);
    }
}
function updateSegmentGroupChildren(segmentGroup, startIndex, commands) {
    if (commands.length === 0) {
        return new UrlSegmentGroup(segmentGroup.segments, {});
    }
    else {
        const outlets = getOutlets(commands);
        const children = {};
        forEach(outlets, (commands, outlet) => {
            if (typeof commands === 'string') {
                commands = [commands];
            }
            if (commands !== null) {
                children[outlet] = updateSegmentGroup(segmentGroup.children[outlet], startIndex, commands);
            }
        });
        forEach(segmentGroup.children, (child, childOutlet) => {
            if (outlets[childOutlet] === undefined) {
                children[childOutlet] = child;
            }
        });
        return new UrlSegmentGroup(segmentGroup.segments, children);
    }
}
function prefixedWith(segmentGroup, startIndex, commands) {
    let currentCommandIndex = 0;
    let currentPathIndex = startIndex;
    const noMatch = { match: false, pathIndex: 0, commandIndex: 0 };
    while (currentPathIndex < segmentGroup.segments.length) {
        if (currentCommandIndex >= commands.length)
            return noMatch;
        const path = segmentGroup.segments[currentPathIndex];
        const command = commands[currentCommandIndex];
        // Do not try to consume command as part of the prefixing if it has outlets because it can
        // contain outlets other than the one being processed. Consuming the outlets command would
        // result in other outlets being ignored.
        if (isCommandWithOutlets(command)) {
            break;
        }
        const curr = `${command}`;
        const next = currentCommandIndex < commands.length - 1 ? commands[currentCommandIndex + 1] : null;
        if (currentPathIndex > 0 && curr === undefined)
            break;
        if (curr && next && (typeof next === 'object') && next.outlets === undefined) {
            if (!compare(curr, next, path))
                return noMatch;
            currentCommandIndex += 2;
        }
        else {
            if (!compare(curr, {}, path))
                return noMatch;
            currentCommandIndex++;
        }
        currentPathIndex++;
    }
    return { match: true, pathIndex: currentPathIndex, commandIndex: currentCommandIndex };
}
function createNewSegmentGroup(segmentGroup, startIndex, commands) {
    const paths = segmentGroup.segments.slice(0, startIndex);
    let i = 0;
    while (i < commands.length) {
        const command = commands[i];
        if (isCommandWithOutlets(command)) {
            const children = createNewSegmentChildren(command.outlets);
            return new UrlSegmentGroup(paths, children);
        }
        // if we start with an object literal, we need to reuse the path part from the segment
        if (i === 0 && isMatrixParams(commands[0])) {
            const p = segmentGroup.segments[startIndex];
            paths.push(new UrlSegment(p.path, stringify(commands[0])));
            i++;
            continue;
        }
        const curr = isCommandWithOutlets(command) ? command.outlets[PRIMARY_OUTLET] : `${command}`;
        const next = (i < commands.length - 1) ? commands[i + 1] : null;
        if (curr && next && isMatrixParams(next)) {
            paths.push(new UrlSegment(curr, stringify(next)));
            i += 2;
        }
        else {
            paths.push(new UrlSegment(curr, {}));
            i++;
        }
    }
    return new UrlSegmentGroup(paths, {});
}
function createNewSegmentChildren(outlets) {
    const children = {};
    forEach(outlets, (commands, outlet) => {
        if (typeof commands === 'string') {
            commands = [commands];
        }
        if (commands !== null) {
            children[outlet] = createNewSegmentGroup(new UrlSegmentGroup([], {}), 0, commands);
        }
    });
    return children;
}
function stringify(params) {
    const res = {};
    forEach(params, (v, k) => res[k] = `${v}`);
    return res;
}
function compare(path, params, segment) {
    return path == segment.path && shallowEqual(params, segment.parameters);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlX3VybF90cmVlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jcmVhdGVfdXJsX3RyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBR0gsT0FBTyxFQUFTLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNoRCxPQUFPLEVBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ2hHLE9BQU8sRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBRS9EOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtERztBQUNILE1BQU0sVUFBVSx5QkFBeUIsQ0FDckMsVUFBa0MsRUFBRSxRQUFlLEVBQUUsY0FBMkIsSUFBSSxFQUNwRixXQUF3QixJQUFJO0lBQzlCLE1BQU0seUJBQXlCLEdBQUcsMkJBQTJCLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDMUUsT0FBTyw2QkFBNkIsQ0FBQyx5QkFBeUIsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ25HLENBQUM7QUFFRCxTQUFTLDJCQUEyQixDQUFDLEtBQTZCO0lBQ2hFLElBQUksV0FBc0MsQ0FBQztJQUUzQyxTQUFTLG9DQUFvQyxDQUFDLFlBQW9DO1FBQ2hGLE1BQU0sWUFBWSxHQUF3QyxFQUFFLENBQUM7UUFDN0QsS0FBSyxNQUFNLGFBQWEsSUFBSSxZQUFZLENBQUMsUUFBUSxFQUFFO1lBQ2pELE1BQU0sSUFBSSxHQUFHLG9DQUFvQyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ2pFLFlBQVksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDO1NBQzNDO1FBQ0QsTUFBTSxZQUFZLEdB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Q0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFDLE9BQTJDO0lBRTNFLE1BQU0sUUFBUSxHQUF3QyxFQUFFLENBQUM7SUFDekQsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNwQyxJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRTtZQUNoQyxRQUFRLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUN2QjtRQUNELElBQUksUUFBUSxLQUFLLElBQUksRUFBRTtZQUNyQixRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcscUJBQXFCLENBQUMsSUFBSSxlQUFlLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztTQUNwRjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLE1BQTRCO0lBQzdDLE1BQU0sR0FBRyxHQUE0QixFQUFFLENBQUM7SUFDeEMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFTLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDeEQsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBRUQsU0FBUyxPQUFPLENBQUMsSUFBWSxFQUFFLE1BQTRCLEVBQUUsT0FBbUI7SUFDOUUsT0FBTyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksSUFBSSxZQUFZLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUMxRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QWN0aXZhdGVkUm91dGUsIEFjdGl2YXRlZFJvdXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UGFyYW1zLCBQUklNQVJZX09VVExFVH0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtjcmVhdGVSb290LCBzcXVhc2hTZWdtZW50R3JvdXAsIFVybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cCwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge2ZvckVhY2gsIGxhc3QsIHNoYWxsb3dFcXVhbH0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcblxuLyoqXG4gKiBDcmVhdGVzIGEgYFVybFRyZWVgIHJlbGF0aXZlIHRvIGFuIGBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90YC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKlxuICpcbiAqIEBwYXJhbSByZWxhdGl2ZVRvIFRoZSBgQWN0aXZhdGVkUm91dGVTbmFwc2hvdGAgdG8gYXBwbHkgdGhlIGNvbW1hbmRzIHRvXG4gKiBAcGFyYW0gY29tbWFuZHMgQW4gYXJyYXkgb2YgVVJMIGZyYWdtZW50cyB3aXRoIHdoaWNoIHRvIGNvbnN0cnVjdCB0aGUgbmV3IFVSTCB0cmVlLlxuICogSWYgdGhlIHBhdGggaXMgc3RhdGljLCBjYW4gYmUgdGhlIGxpdGVyYWwgVVJMIHN0cmluZy4gRm9yIGEgZHluYW1pYyBwYXRoLCBwYXNzIGFuIGFycmF5IG9mIHBhdGhcbiAqIHNlZ21lbnRzLCBmb2xsb3dlZCBieSB0aGUgcGFyYW1ldGVycyBmb3IgZWFjaCBzZWdtZW50LlxuICogVGhlIGZyYWdtZW50cyBhcmUgYXBwbGllZCB0byB0aGUgb25lIHByb3ZpZGVkIGluIHRoZSBgcmVsYXRpdmVUb2AgcGFyYW1ldGVyLlxuICogQHBhcmFtIHF1ZXJ5UGFyYW1zIFRoZSBxdWVyeSBwYXJhbWV0ZXJzIGZvciB0aGUgYFVybFRyZWVgLiBgbnVsbGAgaWYgdGhlIGBVcmxUcmVlYCBkb2VzIG5vdCBoYXZlXG4gKiAgICAgYW55IHF1ZXJ5IHBhcmFtZXRlcnMuXG4gKiBAcGFyYW0gZnJhZ21lbnQgVGhlIGZyYWdtZW50IGZvciB0aGUgYFVybFRyZWVgLiBgbnVsbGAgaWYgdGhlIGBVcmxUcmVlYCBkb2VzIG5vdCBoYXZlIGEgZnJhZ21lbnQuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBgYGBcbiAqIC8vIGNyZWF0ZSAvdGVhbS8zMy91c2VyLzExXG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJy90ZWFtJywgMzMsICd1c2VyJywgMTFdKTtcbiAqXG4gKiAvLyBjcmVhdGUgL3RlYW0vMzM7ZXhwYW5kPXRydWUvdXNlci8xMVxuICogY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChzbmFwc2hvdCwgWycvdGVhbScsIDMzLCB7ZXhwYW5kOiB0cnVlfSwgJ3VzZXInLCAxMV0pO1xuICpcbiAqIC8vIHlvdSBjYW4gY29sbGFwc2Ugc3RhdGljIHNlZ21lbnRzIGxpa2UgdGhpcyAodGhpcyB3b3JrcyBvbmx5IHdpdGggdGhlIGZpcnN0IHBhc3NlZC1pbiB2YWx1ZSk6XG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJy90ZWFtLzMzL3VzZXInLCB1c2VySWRdKTtcbiAqXG4gKiAvLyBJZiB0aGUgZmlyc3Qgc2VnbWVudCBjYW4gY29udGFpbiBzbGFzaGVzLCBhbmQgeW91IGRvIG5vdCB3YW50IHRoZSByb3V0ZXIgdG8gc3BsaXQgaXQsXG4gKiAvLyB5b3UgY2FuIGRvIHRoZSBmb2xsb3dpbmc6XG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbe3NlZ21lbnRQYXRoOiAnL29uZS90d28nfV0pO1xuICpcbiAqIC8vIGNyZWF0ZSAvdGVhbS8zMy8odXNlci8xMS8vcmlnaHQ6Y2hhdClcbiAqIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qoc25hcHNob3QsIFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OlxuICogJ2NoYXQnfX1dLCBudWxsLCBudWxsKTtcbiAqXG4gKiAvLyByZW1vdmUgdGhlIHJpZ2h0IHNlY29uZGFyeSBub2RlXG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDogbnVsbH19XSk7XG4gKlxuICogLy8gRm9yIHRoZSBleGFtcGxlcyBiZWxvdywgYXNzdW1lIHRoZSBjdXJyZW50IFVSTCBpcyBmb3IgdGhlIGAvdGVhbS8zMy91c2VyLzExYCBhbmQgdGhlXG4gKiBgQWN0aXZhdGVkUm91dGVTbmFwc2hvdGAgcG9pbnRzIHRvIGB1c2VyLzExYDpcbiAqXG4gKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzExL2RldGFpbHNcbiAqIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qoc25hcHNob3QsIFsnZGV0YWlscyddKTtcbiAqXG4gKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzIyXG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJy4uLzIyJ10pO1xuICpcbiAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzQ0L3VzZXIvMjJcbiAqIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qoc25hcHNob3QsIFsnLi4vLi4vdGVhbS80NC91c2VyLzIyJ10pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KFxuICAgIHJlbGF0aXZlVG86IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGNvbW1hbmRzOiBhbnlbXSwgcXVlcnlQYXJhbXM6IFBhcmFtc3xudWxsID0gbnVsbCxcbiAgICBmcmFnbWVudDogc3RyaW5nfG51bGwgPSBudWxsKTogVXJsVHJlZSB7XG4gIGNvbnN0IHJlbGF0aXZlVG9VcmxTZWdtZW50R3JvdXAgPSBjcmVhdGVTZWdtZW50R3JvdXBGcm9tUm91dGUocmVsYXRpdmVUbyk7XG4gIHJldHVybiBjcmVhdGVVcmxUcmVlRnJvbVNlZ21lbnRHcm91cChyZWxhdGl2ZVRvVXJsU2VnbWVudEdyb3VwLCBjb21tYW5kcywgcXVlcnlQYXJhbXMsIGZyYWdtZW50KTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlU2VnbWVudEdyb3VwRnJvbVJvdXRlKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogVXJsU2VnbWVudEdyb3VwIHtcbiAgbGV0IHRhcmdldEdyb3VwOiBVcmxTZWdtZW50R3JvdXB8dW5kZWZpbmVkO1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZVNlZ21lbnRHcm91cEZyb21Sb3V0ZVJlY3Vyc2l2ZShjdXJyZW50Um91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpIHtcbiAgICBjb25zdCBjaGlsZE91dGxldHM6IHtbb3V0bGV0OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gICAgZm9yIChjb25zdCBjaGlsZFNuYXBzaG90IG9mIGN1cnJlbnRSb3V0ZS5jaGlsZHJlbikge1xuICAgICAgY29uc3Qgcm9vdCA9IGNyZWF0ZVNlZ21lbnRHcm91cEZyb21Sb3V0ZVJlY3Vyc2l2ZShjaGlsZFNuYXBzaG90KTtcbiAgICAgIGNoaWxkT3V0bGV0c1tjaGlsZFNuYXBzaG90Lm91dGxldF0gPSByb290O1xuICAgIH1cbiAgICBjb25zdCBzZWdtZW50R3JvdXAgPSBuZXcgVXJsU2VnbWVudEdyb3VwKGN1cnJlbnRSb3V0ZS51cmwsIGNoaWxkT3V0bGV0cyk7XG4gICAgaWYgKGN1cnJlbnRSb3V0ZSA9PT0gcm91dGUpIHtcbiAgICAgIHRhcmdldEdyb3VwID0gc2VnbWVudEdyb3VwO1xuICAgIH1cbiAgICByZXR1cm4gc2VnbWVudEdyb3VwO1xuICB9XG4gIGNvbnN0IHJvb3RDYW5kaWRhdGUgPSBjcmVhdGVTZWdtZW50R3JvdXBGcm9tUm91dGVSZWN1cnNpdmUocm91dGUucm9vdCk7XG4gIGNvbnN0IHJvb3RTZWdtZW50R3JvdXAgPSBjcmVhdGVSb290KHJvb3RDYW5kaWRhdGUpO1xuXG4gIHJldHVybiB0YXJnZXRHcm91cCA/PyByb290U2VnbWVudEdyb3VwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVXJsVHJlZUZyb21TZWdtZW50R3JvdXAoXG4gICAgcmVsYXRpdmVUbzogVXJsU2VnbWVudEdyb3VwLCBjb21tYW5kczogYW55W10sIHF1ZXJ5UGFyYW1zOiBQYXJhbXN8bnVsbCxcbiAgICBmcmFnbWVudDogc3RyaW5nfG51bGwpOiBVcmxUcmVlIHtcbiAgbGV0IHJvb3QgPSByZWxhdGl2ZVRvO1xuICB3aGlsZSAocm9vdC5wYXJlbnQpIHtcbiAgICByb290ID0gcm9vdC5wYXJlbnQ7XG4gIH1cbiAgLy8gVGhlcmUgYXJlIG5vIGNvbW1hbmRzIHNvIHRoZSBgVXJsVHJlZWAgZ29lcyB0byB0aGUgc2FtZSBwYXRoIGFzIHRoZSBvbmUgY3JlYXRlZCBmcm9tIHRoZVxuICAvLyBgVXJsU2VnbWVudEdyb3VwYC4gQWxsIHdlIG5lZWQgdG8gZG8gaXMgdXBkYXRlIHRoZSBgcXVlcnlQYXJhbXNgIGFuZCBgZnJhZ21lbnRgIHdpdGhvdXRcbiAgLy8gYXBwbHlpbmcgYW55IG90aGVyIGxvZ2ljLlxuICBpZiAoY29tbWFuZHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHRyZWUocm9vdCwgcm9vdCwgcm9vdCwgcXVlcnlQYXJhbXMsIGZyYWdtZW50KTtcbiAgfVxuXG4gIGNvbnN0IG5hdiA9IGNvbXB1dGVOYXZpZ2F0aW9uKGNvbW1hbmRzKTtcblxuICBpZiAobmF2LnRvUm9vdCgpKSB7XG4gICAgcmV0dXJuIHRyZWUocm9vdCwgcm9vdCwgbmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pLCBxdWVyeVBhcmFtcywgZnJhZ21lbnQpO1xuICB9XG5cbiAgY29uc3QgcG9zaXRpb24gPSBmaW5kU3RhcnRpbmdQb3NpdGlvbkZvclRhcmdldEdyb3VwKG5hdiwgcm9vdCwgcmVsYXRpdmVUbyk7XG4gIGNvbnN0IG5ld1NlZ21lbnRHcm91cCA9IHBvc2l0aW9uLnByb2Nlc3NDaGlsZHJlbiA/XG4gICAgICB1cGRhdGVTZWdtZW50R3JvdXBDaGlsZHJlbihwb3NpdGlvbi5zZWdtZW50R3JvdXAsIHBvc2l0aW9uLmluZGV4LCBuYXYuY29tbWFuZHMpIDpcbiAgICAgIHVwZGF0ZVNlZ21lbnRHcm91cChwb3NpdGlvbi5zZWdtZW50R3JvdXAsIHBvc2l0aW9uLmluZGV4LCBuYXYuY29tbWFuZHMpO1xuICByZXR1cm4gdHJlZShyb290LCBwb3NpdGlvbi5zZWdtZW50R3JvdXAsIG5ld1NlZ21lbnRHcm91cCwgcXVlcnlQYXJhbXMsIGZyYWdtZW50KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVVybFRyZWUoXG4gICAgcm91dGU6IEFjdGl2YXRlZFJvdXRlLCB1cmxUcmVlOiBVcmxUcmVlLCBjb21tYW5kczogYW55W10sIHF1ZXJ5UGFyYW1zOiBQYXJhbXN8bnVsbCxcbiAgICBmcmFnbWVudDogc3RyaW5nfG51bGwpOiBVcmxUcmVlIHtcbiAgaWYgKGNvbW1hbmRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB0cmVlKHVybFRyZWUucm9vdCwgdXJsVHJlZS5yb290LCB1cmxUcmVlLnJvb3QsIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCk7XG4gIH1cblxuICBjb25zdCBuYXYgPSBjb21wdXRlTmF2aWdhdGlvbihjb21tYW5kcyk7XG5cbiAgaWYgKG5hdi50b1Jvb3QoKSkge1xuICAgIHJldHVybiB0cmVlKHVybFRyZWUucm9vdCwgdXJsVHJlZS5yb290LCBuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCB7fSksIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVUcmVlVXNpbmdQYXRoSW5kZXgobGFzdFBhdGhJbmRleDogbnVtYmVyKSB7XG4gICAgY29uc3Qgc3RhcnRpbmdQb3NpdGlvbiA9XG4gICAgICAgIGZpbmRTdGFydGluZ1Bvc2l0aW9uKG5hdiwgdXJsVHJlZSwgcm91dGUuc25hcHNob3Q/Ll91cmxTZWdtZW50LCBsYXN0UGF0aEluZGV4KTtcblxuICAgIGNvbnN0IHNlZ21lbnRHcm91cCA9IHN0YXJ0aW5nUG9zaXRpb24ucHJvY2Vzc0NoaWxkcmVuID9cbiAgICAgICAgdXBkYXRlU2VnbWVudEdyb3VwQ2hpbGRyZW4oXG4gICAgICAgICAgICBzdGFydGluZ1Bvc2l0aW9uLnNlZ21lbnRHcm91cCwgc3RhcnRpbmdQb3NpdGlvbi5pbmRleCwgbmF2LmNvbW1hbmRzKSA6XG4gICAgICAgIHVwZGF0ZVNlZ21lbnRHcm91cChzdGFydGluZ1Bvc2l0aW9uLnNlZ21lbnRHcm91cCwgc3RhcnRpbmdQb3NpdGlvbi5pbmRleCwgbmF2LmNvbW1hbmRzKTtcbiAgICByZXR1cm4gdHJlZSh1cmxUcmVlLnJvb3QsIHN0YXJ0aW5nUG9zaXRpb24uc2VnbWVudEdyb3VwLCBzZWdtZW50R3JvdXAsIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCk7XG4gIH1cbiAgLy8gTm90ZTogVGhlIHR5cGVzIHNob3VsZCBkaXNhbGxvdyBgc25hcHNob3RgIGZyb20gYmVpbmcgYHVuZGVmaW5lZGAgYnV0IGR1ZSB0byB0ZXN0IG1vY2tzLCB0aGlzXG4gIC8vIG1heSBiZSB0aGUgY2FzZS4gU2luY2Ugd2UgdHJ5IHRvIGFjY2VzcyBpdCBhdCBhbiBlYXJsaWVyIHBvaW50IGJlZm9yZSB0aGUgcmVmYWN0b3IgdG8gYWRkIHRoZVxuICAvLyB3YXJuaW5nIGZvciBgcmVsYXRpdmVMaW5rUmVzb2x1dGlvbjogJ2xlZ2FjeSdgLCB0aGlzIG1heSBjYXVzZSBmYWlsdXJlcyBpbiB0ZXN0cyB3aGVyZSBpdFxuICAvLyBkaWRuJ3QgYmVmb3JlLlxuICBjb25zdCByZXN1bHQgPSBjcmVhdGVUcmVlVXNpbmdQYXRoSW5kZXgocm91dGUuc25hcHNob3Q/Ll9sYXN0UGF0aEluZGV4KTtcblxuICAvLyBDaGVjayBpZiBhcHBsaWNhdGlvbiBpcyByZWx5aW5nIG9uIGByZWxhdGl2ZUxpbmtSZXNvbHV0aW9uOiAnbGVnYWN5J2BcbiAgaWYgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8ICEhbmdEZXZNb2RlKSB7XG4gICAgY29uc3QgY29ycmVjdGVkUmVzdWx0ID0gY3JlYXRlVHJlZVVzaW5nUGF0aEluZGV4KHJvdXRlLnNuYXBzaG90Py5fY29ycmVjdGVkTGFzdFBhdGhJbmRleCk7XG4gICAgaWYgKGNvcnJlY3RlZFJlc3VsdC50b1N0cmluZygpICE9PSByZXN1bHQudG9TdHJpbmcoKSkge1xuICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgIGByZWxhdGl2ZUxpbmtSZXNvbHV0aW9uOiAnbGVnYWN5JyBpcyBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gYSBmdXR1cmUgdmVyc2lvbiBvZiBBbmd1bGFyLiBUaGUgbGluayB0byAke1xuICAgICAgICAgICAgICByZXN1bHQudG9TdHJpbmcoKX0gd2lsbCBjaGFuZ2UgdG8gJHtcbiAgICAgICAgICAgICAgY29ycmVjdGVkUmVzdWx0LnRvU3RyaW5nKCl9IGlmIHRoZSBjb2RlIGlzIG5vdCB1cGRhdGVkIGJlZm9yZSB0aGVuLmApO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGlzTWF0cml4UGFyYW1zKGNvbW1hbmQ6IGFueSk6IGJvb2xlYW4ge1xuICByZXR1cm4gdHlwZW9mIGNvbW1hbmQgPT09ICdvYmplY3QnICYmIGNvbW1hbmQgIT0gbnVsbCAmJiAhY29tbWFuZC5vdXRsZXRzICYmICFjb21tYW5kLnNlZ21lbnRQYXRoO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgYSBnaXZlbiBjb21tYW5kIGhhcyBhbiBgb3V0bGV0c2AgbWFwLiBXaGVuIHdlIGVuY291bnRlciBhIGNvbW1hbmRcbiAqIHdpdGggYW4gb3V0bGV0cyBrL3YgbWFwLCB3ZSBuZWVkIHRvIGFwcGx5IGVhY2ggb3V0bGV0IGluZGl2aWR1YWxseSB0byB0aGUgZXhpc3Rpbmcgc2VnbWVudC5cbiAqL1xuZnVuY3Rpb24gaXNDb21tYW5kV2l0aE91dGxldHMoY29tbWFuZDogYW55KTogY29tbWFuZCBpcyB7b3V0bGV0czoge1trZXk6IHN0cmluZ106IGFueX19IHtcbiAgcmV0dXJuIHR5cGVvZiBjb21tYW5kID09PSAnb2JqZWN0JyAmJiBjb21tYW5kICE9IG51bGwgJiYgY29tbWFuZC5vdXRsZXRzO1xufVxuXG5mdW5jdGlvbiB0cmVlKFxuICAgIG9sZFJvb3Q6IFVybFNlZ21lbnRHcm91cCwgb2xkU2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIG5ld1NlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLFxuICAgIHF1ZXJ5UGFyYW1zOiBQYXJhbXN8bnVsbCwgZnJhZ21lbnQ6IHN0cmluZ3xudWxsKTogVXJsVHJlZSB7XG4gIGxldCBxcDogYW55ID0ge307XG4gIGlmIChxdWVyeVBhcmFtcykge1xuICAgIGZvckVhY2gocXVlcnlQYXJhbXMsICh2YWx1ZTogYW55LCBuYW1lOiBhbnkpID0+IHtcbiAgICAgIHFwW25hbWVdID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZS5tYXAoKHY6IGFueSkgPT4gYCR7dn1gKSA6IGAke3ZhbHVlfWA7XG4gICAgfSk7XG4gIH1cblxuICBsZXQgcm9vdENhbmRpZGF0ZTogVXJsU2VnbWVudEdyb3VwO1xuICBpZiAob2xkUm9vdCA9PT0gb2xkU2VnbWVudEdyb3VwKSB7XG4gICAgcm9vdENhbmRpZGF0ZSA9IG5ld1NlZ21lbnRHcm91cDtcbiAgfSBlbHNlIHtcbiAgICByb290Q2FuZGlkYXRlID0gcmVwbGFjZVNlZ21lbnQob2xkUm9vdCwgb2xkU2VnbWVudEdyb3VwLCBuZXdTZWdtZW50R3JvdXApO1xuICB9XG5cbiAgY29uc3QgbmV3Um9vdCA9IGNyZWF0ZVJvb3Qoc3F1YXNoU2VnbWVudEdyb3VwKHJvb3RDYW5kaWRhdGUpKTtcbiAgcmV0dXJuIG5ldyBVcmxUcmVlKG5ld1Jvb3QsIHFwLCBmcmFnbWVudCk7XG59XG5cbi8qKlxuICogUmVwbGFjZXMgdGhlIGBvbGRTZWdtZW50YCB3aGljaCBpcyBsb2NhdGVkIGluIHNvbWUgY2hpbGQgb2YgdGhlIGBjdXJyZW50YCB3aXRoIHRoZSBgbmV3U2VnbWVudGAuXG4gKiBUaGlzIGFsc28gaGFzIHRoZSBlZmZlY3Qgb2YgY3JlYXRpbmcgbmV3IGBVcmxTZWdtZW50R3JvdXBgIGNvcGllcyB0byB1cGRhdGUgcmVmZXJlbmNlcy4gVGhpc1xuICogc2hvdWxkbid0IGJlIG5lY2Vzc2FyeSBidXQgdGhlIGZhbGxiYWNrIGxvZ2ljIGZvciBhbiBpbnZhbGlkIEFjdGl2YXRlZFJvdXRlIGluIHRoZSBjcmVhdGlvbiB1c2VzXG4gKiB0aGUgUm91dGVyJ3MgY3VycmVudCB1cmwgdHJlZS4gSWYgd2UgZG9uJ3QgY3JlYXRlIG5ldyBzZWdtZW50IGdyb3Vwcywgd2UgZW5kIHVwIG1vZGlmeWluZyB0aGF0XG4gKiB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gcmVwbGFjZVNlZ21lbnQoXG4gICAgY3VycmVudDogVXJsU2VnbWVudEdyb3VwLCBvbGRTZWdtZW50OiBVcmxTZWdtZW50R3JvdXAsXG4gICAgbmV3U2VnbWVudDogVXJsU2VnbWVudEdyb3VwKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgY29uc3QgY2hpbGRyZW46IHtba2V5OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gIGZvckVhY2goY3VycmVudC5jaGlsZHJlbiwgKGM6IFVybFNlZ21lbnRHcm91cCwgb3V0bGV0TmFtZTogc3RyaW5nKSA9PiB7XG4gICAgaWYgKGMgPT09IG9sZFNlZ21lbnQpIHtcbiAgICAgIGNoaWxkcmVuW291dGxldE5hbWVdID0gbmV3U2VnbWVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hpbGRyZW5bb3V0bGV0TmFtZV0gPSByZXBsYWNlU2VnbWVudChjLCBvbGRTZWdtZW50LCBuZXdTZWdtZW50KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChjdXJyZW50LnNlZ21lbnRzLCBjaGlsZHJlbik7XG59XG5cbmNsYXNzIE5hdmlnYXRpb24ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHB1YmxpYyBpc0Fic29sdXRlOiBib29sZWFuLCBwdWJsaWMgbnVtYmVyT2ZEb3VibGVEb3RzOiBudW1iZXIsIHB1YmxpYyBjb21tYW5kczogYW55W10pIHtcbiAgICBpZiAoaXNBYnNvbHV0ZSAmJiBjb21tYW5kcy5sZW5ndGggPiAwICYmIGlzTWF0cml4UGFyYW1zKGNvbW1hbmRzWzBdKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdSb290IHNlZ21lbnQgY2Fubm90IGhhdmUgbWF0cml4IHBhcmFtZXRlcnMnKTtcbiAgICB9XG5cbiAgICBjb25zdCBjbWRXaXRoT3V0bGV0ID0gY29tbWFuZHMuZmluZChpc0NvbW1hbmRXaXRoT3V0bGV0cyk7XG4gICAgaWYgKGNtZFdpdGhPdXRsZXQgJiYgY21kV2l0aE91dGxldCAhPT0gbGFzdChjb21tYW5kcykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigne291dGxldHM6e319IGhhcyB0byBiZSB0aGUgbGFzdCBjb21tYW5kJyk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIHRvUm9vdCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5pc0Fic29sdXRlICYmIHRoaXMuY29tbWFuZHMubGVuZ3RoID09PSAxICYmIHRoaXMuY29tbWFuZHNbMF0gPT0gJy8nO1xuICB9XG59XG5cbi8qKiBUcmFuc2Zvcm1zIGNvbW1hbmRzIHRvIGEgbm9ybWFsaXplZCBgTmF2aWdhdGlvbmAgKi9cbmZ1bmN0aW9uIGNvbXB1dGVOYXZpZ2F0aW9uKGNvbW1hbmRzOiBhbnlbXSk6IE5hdmlnYXRpb24ge1xuICBpZiAoKHR5cGVvZiBjb21tYW5kc1swXSA9PT0gJ3N0cmluZycpICYmIGNvbW1hbmRzLmxlbmd0aCA9PT0gMSAmJiBjb21tYW5kc1swXSA9PT0gJy8nKSB7XG4gICAgcmV0dXJuIG5ldyBOYXZpZ2F0aW9uKHRydWUsIDAsIGNvbW1hbmRzKTtcbiAgfVxuXG4gIGxldCBudW1iZXJPZkRvdWJsZURvdHMgPSAwO1xuICBsZXQgaXNBYnNvbHV0ZSA9IGZhbHNlO1xuXG4gIGNvbnN0IHJlczogYW55W10gPSBjb21tYW5kcy5yZWR1Y2UoKHJlcywgY21kLCBjbWRJZHgpID0+IHtcbiAgICBpZiAodHlwZW9mIGNtZCA9PT0gJ29iamVjdCcgJiYgY21kICE9IG51bGwpIHtcbiAgICAgIGlmIChjbWQub3V0bGV0cykge1xuICAgICAgICBjb25zdCBvdXRsZXRzOiB7W2s6IHN0cmluZ106IGFueX0gPSB7fTtcbiAgICAgICAgZm9yRWFjaChjbWQub3V0bGV0cywgKGNvbW1hbmRzOiBhbnksIG5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgICAgIG91dGxldHNbbmFtZV0gPSB0eXBlb2YgY29tbWFuZHMgPT09ICdzdHJpbmcnID8gY29tbWFuZHMuc3BsaXQoJy8nKSA6IGNvbW1hbmRzO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIFsuLi5yZXMsIHtvdXRsZXRzfV07XG4gICAgICB9XG5cbiAgICAgIGlmIChjbWQuc2VnbWVudFBhdGgpIHtcbiAgICAgICAgcmV0dXJuIFsuLi5yZXMsIGNtZC5zZWdtZW50UGF0aF07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCEodHlwZW9mIGNtZCA9PT0gJ3N0cmluZycpKSB7XG4gICAgICByZXR1cm4gWy4uLnJlcywgY21kXTtcbiAgICB9XG5cbiAgICBpZiAoY21kSWR4ID09PSAwKSB7XG4gICAgICBjbWQuc3BsaXQoJy8nKS5mb3JFYWNoKCh1cmxQYXJ0LCBwYXJ0SW5kZXgpID0+IHtcbiAgICAgICAgaWYgKHBhcnRJbmRleCA9PSAwICYmIHVybFBhcnQgPT09ICcuJykge1xuICAgICAgICAgIC8vIHNraXAgJy4vYSdcbiAgICAgICAgfSBlbHNlIGlmIChwYXJ0SW5kZXggPT0gMCAmJiB1cmxQYXJ0ID09PSAnJykgeyAgLy8gICcvYSdcbiAgICAgICAgICBpc0Fic29sdXRlID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICh1cmxQYXJ0ID09PSAnLi4nKSB7ICAvLyAgJy4uL2EnXG4gICAgICAgICAgbnVtYmVyT2ZEb3VibGVEb3RzKys7XG4gICAgICAgIH0gZWxzZSBpZiAodXJsUGFydCAhPSAnJykge1xuICAgICAgICAgIHJlcy5wdXNoKHVybFBhcnQpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICByZXR1cm4gWy4uLnJlcywgY21kXTtcbiAgfSwgW10pO1xuXG4gIHJldHVybiBuZXcgTmF2aWdhdGlvbihpc0Fic29sdXRlLCBudW1iZXJPZkRvdWJsZURvdHMsIHJlcyk7XG59XG5cbmNsYXNzIFBvc2l0aW9uIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwdWJsaWMgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHB1YmxpYyBwcm9jZXNzQ2hpbGRyZW46IGJvb2xlYW4sIHB1YmxpYyBpbmRleDogbnVtYmVyKSB7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZFN0YXJ0aW5nUG9zaXRpb25Gb3JUYXJnZXRHcm91cChcbiAgICBuYXY6IE5hdmlnYXRpb24sIHJvb3Q6IFVybFNlZ21lbnRHcm91cCwgdGFyZ2V0OiBVcmxTZWdtZW50R3JvdXApOiBQb3NpdGlvbiB7XG4gIGlmIChuYXYuaXNBYnNvbHV0ZSkge1xuICAgIHJldHVybiBuZXcgUG9zaXRpb24ocm9vdCwgdHJ1ZSwgMCk7XG4gIH1cblxuICBpZiAoIXRhcmdldCkge1xuICAgIC8vIGBOYU5gIGlzIHVzZWQgb25seSB0byBtYWludGFpbiBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSB3aXRoIGluY29ycmVjdGx5IG1vY2tlZFxuICAgIC8vIGBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90YCBpbiB0ZXN0cy4gSW4gcHJpb3IgdmVyc2lvbnMgb2YgdGhpcyBjb2RlLCB0aGUgcG9zaXRpb24gaGVyZSB3YXNcbiAgICAvLyBkZXRlcm1pbmVkIGJhc2VkIG9uIGFuIGludGVybmFsIHByb3BlcnR5IHRoYXQgd2FzIHJhcmVseSBtb2NrZWQsIHJlc3VsdGluZyBpbiBgTmFOYC4gSW5cbiAgICAvLyByZWFsaXR5LCB0aGlzIGNvZGUgcGF0aCBzaG91bGQgX25ldmVyXyBiZSB0b3VjaGVkIHNpbmNlIGB0YXJnZXRgIGlzIG5vdCBhbGxvd2VkIHRvIGJlIGZhbHNleS5cbiAgICByZXR1cm4gbmV3IFBvc2l0aW9uKHJvb3QsIGZhbHNlLCBOYU4pO1xuICB9XG4gIGlmICh0YXJnZXQucGFyZW50ID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG5ldyBQb3NpdGlvbih0YXJnZXQsIHRydWUsIDApO1xuICB9XG5cbiAgY29uc3QgbW9kaWZpZXIgPSBpc01hdHJpeFBhcmFtcyhuYXYuY29tbWFuZHNbMF0pID8gMCA6IDE7XG4gIGNvbnN0IGluZGV4ID0gdGFyZ2V0LnNlZ21lbnRzLmxlbmd0aCAtIDEgKyBtb2RpZmllcjtcbiAgcmV0dXJuIGNyZWF0ZVBvc2l0aW9uQXBwbHlpbmdEb3VibGVEb3RzKHRhcmdldCwgaW5kZXgsIG5hdi5udW1iZXJPZkRvdWJsZURvdHMpO1xufVxuXG5mdW5jdGlvbiBmaW5kU3RhcnRpbmdQb3NpdGlvbihcbiAgICBuYXY6IE5hdmlnYXRpb24sIHRyZWU6IFVybFRyZWUsIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLFxuICAgIGxhc3RQYXRoSW5kZXg6IG51bWJlcik6IFBvc2l0aW9uIHtcbiAgaWYgKG5hdi5pc0Fic29sdXRlKSB7XG4gICAgcmV0dXJuIG5ldyBQb3NpdGlvbih0cmVlLnJvb3QsIHRydWUsIDApO1xuICB9XG5cbiAgaWYgKGxhc3RQYXRoSW5kZXggPT09IC0xKSB7XG4gICAgLy8gUGF0aGxlc3MgQWN0aXZhdGVkUm91dGUgaGFzIF9sYXN0UGF0aEluZGV4ID09PSAtMSBidXQgc2hvdWxkIG5vdCBwcm9jZXNzIGNoaWxkcmVuXG4gICAgLy8gc2VlIGlzc3VlICMyNjIyNCwgIzEzMDExLCAjMzU2ODdcbiAgICAvLyBIb3dldmVyLCBpZiB0aGUgQWN0aXZhdGVkUm91dGUgaXMgdGhlIHJvb3Qgd2Ugc2hvdWxkIHByb2Nlc3MgY2hpbGRyZW4gbGlrZSBhYm92ZS5cbiAgICBjb25zdCBwcm9jZXNzQ2hpbGRyZW4gPSBzZWdtZW50R3JvdXAgPT09IHRyZWUucm9vdDtcbiAgICByZXR1cm4gbmV3IFBvc2l0aW9uKHNlZ21lbnRHcm91cCwgcHJvY2Vzc0NoaWxkcmVuLCAwKTtcbiAgfVxuXG4gIGNvbnN0IG1vZGlmaWVyID0gaXNNYXRyaXhQYXJhbXMobmF2LmNvbW1hbmRzWzBdKSA/IDAgOiAxO1xuICBjb25zdCBpbmRleCA9IGxhc3RQYXRoSW5kZXggKyBtb2RpZmllcjtcbiAgcmV0dXJuIGNyZWF0ZVBvc2l0aW9uQXBwbHlpbmdEb3VibGVEb3RzKHNlZ21lbnRHcm91cCwgaW5kZXgsIG5hdi5udW1iZXJPZkRvdWJsZURvdHMpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVQb3NpdGlvbkFwcGx5aW5nRG91YmxlRG90cyhcbiAgICBncm91cDogVXJsU2VnbWVudEdyb3VwLCBpbmRleDogbnVtYmVyLCBudW1iZXJPZkRvdWJsZURvdHM6IG51bWJlcik6IFBvc2l0aW9uIHtcbiAgbGV0IGcgPSBncm91cDtcbiAgbGV0IGNpID0gaW5kZXg7XG4gIGxldCBkZCA9IG51bWJlck9mRG91YmxlRG90cztcbiAgd2hpbGUgKGRkID4gY2kpIHtcbiAgICBkZCAtPSBjaTtcbiAgICBnID0gZy5wYXJlbnQhO1xuICAgIGlmICghZykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIG51bWJlciBvZiBcXCcuLi9cXCcnKTtcbiAgICB9XG4gICAgY2kgPSBnLnNlZ21lbnRzLmxlbmd0aDtcbiAgfVxuICByZXR1cm4gbmV3IFBvc2l0aW9uKGcsIGZhbHNlLCBjaSAtIGRkKTtcbn1cblxuZnVuY3Rpb24gZ2V0T3V0bGV0cyhjb21tYW5kczogdW5rbm93bltdKToge1trOiBzdHJpbmddOiB1bmtub3duW118c3RyaW5nfSB7XG4gIGlmIChpc0NvbW1hbmRXaXRoT3V0bGV0cyhjb21tYW5kc1swXSkpIHtcbiAgICByZXR1cm4gY29tbWFuZHNbMF0ub3V0bGV0cztcbiAgfVxuXG4gIHJldHVybiB7W1BSSU1BUllfT1VUTEVUXTogY29tbWFuZHN9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVTZWdtZW50R3JvdXAoXG4gICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHN0YXJ0SW5kZXg6IG51bWJlciwgY29tbWFuZHM6IGFueVtdKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgaWYgKCFzZWdtZW50R3JvdXApIHtcbiAgICBzZWdtZW50R3JvdXAgPSBuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCB7fSk7XG4gIH1cbiAgaWYgKHNlZ21lbnRHcm91cC5zZWdtZW50cy5sZW5ndGggPT09IDAgJiYgc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkpIHtcbiAgICByZXR1cm4gdXBkYXRlU2VnbWVudEdyb3VwQ2hpbGRyZW4oc2VnbWVudEdyb3VwLCBzdGFydEluZGV4LCBjb21tYW5kcyk7XG4gIH1cblxuICBjb25zdCBtID0gcHJlZml4ZWRXaXRoKHNlZ21lbnRHcm91cCwgc3RhcnRJbmRleCwgY29tbWFuZHMpO1xuICBjb25zdCBzbGljZWRDb21tYW5kcyA9IGNvbW1hbmRzLnNsaWNlKG0uY29tbWFuZEluZGV4KTtcbiAgaWYgKG0ubWF0Y2ggJiYgbS5wYXRoSW5kZXggPCBzZWdtZW50R3JvdXAuc2VnbWVudHMubGVuZ3RoKSB7XG4gICAgY29uc3QgZyA9IG5ldyBVcmxTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLnNsaWNlKDAsIG0ucGF0aEluZGV4KSwge30pO1xuICAgIGcuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdID1cbiAgICAgICAgbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuc2VnbWVudHMuc2xpY2UobS5wYXRoSW5kZXgpLCBzZWdtZW50R3JvdXAuY2hpbGRyZW4pO1xuICAgIHJldHVybiB1cGRhdGVTZWdtZW50R3JvdXBDaGlsZHJlbihnLCAwLCBzbGljZWRDb21tYW5kcyk7XG4gIH0gZWxzZSBpZiAobS5tYXRjaCAmJiBzbGljZWRDb21tYW5kcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuc2VnbWVudHMsIHt9KTtcbiAgfSBlbHNlIGlmIChtLm1hdGNoICYmICFzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgIHJldHVybiBjcmVhdGVOZXdTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLCBzdGFydEluZGV4LCBjb21tYW5kcyk7XG4gIH0gZWxzZSBpZiAobS5tYXRjaCkge1xuICAgIHJldHVybiB1cGRhdGVTZWdtZW50R3JvdXBDaGlsZHJlbihzZWdtZW50R3JvdXAsIDAsIHNsaWNlZENvbW1hbmRzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gY3JlYXRlTmV3U2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cCwgc3RhcnRJbmRleCwgY29tbWFuZHMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVNlZ21lbnRHcm91cENoaWxkcmVuKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBzdGFydEluZGV4OiBudW1iZXIsIGNvbW1hbmRzOiBhbnlbXSk6IFVybFNlZ21lbnRHcm91cCB7XG4gIGlmIChjb21tYW5kcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuc2VnbWVudHMsIHt9KTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBvdXRsZXRzID0gZ2V0T3V0bGV0cyhjb21tYW5kcyk7XG4gICAgY29uc3QgY2hpbGRyZW46IHtba2V5OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG5cbiAgICBmb3JFYWNoKG91dGxldHMsIChjb21tYW5kcywgb3V0bGV0KSA9PiB7XG4gICAgICBpZiAodHlwZW9mIGNvbW1hbmRzID09PSAnc3RyaW5nJykge1xuICAgICAgICBjb21tYW5kcyA9IFtjb21tYW5kc107XG4gICAgICB9XG4gICAgICBpZiAoY29tbWFuZHMgIT09IG51bGwpIHtcbiAgICAgICAgY2hpbGRyZW5bb3V0bGV0XSA9IHVwZGF0ZVNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuY2hpbGRyZW5bb3V0bGV0XSwgc3RhcnRJbmRleCwgY29tbWFuZHMpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgZm9yRWFjaChzZWdtZW50R3JvdXAuY2hpbGRyZW4sIChjaGlsZDogVXJsU2VnbWVudEdyb3VwLCBjaGlsZE91dGxldDogc3RyaW5nKSA9PiB7XG4gICAgICBpZiAob3V0bGV0c1tjaGlsZE91dGxldF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjaGlsZHJlbltjaGlsZE91dGxldF0gPSBjaGlsZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuc2VnbWVudHMsIGNoaWxkcmVuKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwcmVmaXhlZFdpdGgoc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHN0YXJ0SW5kZXg6IG51bWJlciwgY29tbWFuZHM6IGFueVtdKSB7XG4gIGxldCBjdXJyZW50Q29tbWFuZEluZGV4ID0gMDtcbiAgbGV0IGN1cnJlbnRQYXRoSW5kZXggPSBzdGFydEluZGV4O1xuXG4gIGNvbnN0IG5vTWF0Y2ggPSB7bWF0Y2g6IGZhbHNlLCBwYXRoSW5kZXg6IDAsIGNvbW1hbmRJbmRleDogMH07XG4gIHdoaWxlIChjdXJyZW50UGF0aEluZGV4IDwgc2VnbWVudEdyb3VwLnNlZ21lbnRzLmxlbmd0aCkge1xuICAgIGlmIChjdXJyZW50Q29tbWFuZEluZGV4ID49IGNvbW1hbmRzLmxlbmd0aCkgcmV0dXJuIG5vTWF0Y2g7XG4gICAgY29uc3QgcGF0aCA9IHNlZ21lbnRHcm91cC5zZWdtZW50c1tjdXJyZW50UGF0aEluZGV4XTtcbiAgICBjb25zdCBjb21tYW5kID0gY29tbWFuZHNbY3VycmVudENvbW1hbmRJbmRleF07XG4gICAgLy8gRG8gbm90IHRyeSB0byBjb25zdW1lIGNvbW1hbmQgYXMgcGFydCBvZiB0aGUgcHJlZml4aW5nIGlmIGl0IGhhcyBvdXRsZXRzIGJlY2F1c2UgaXQgY2FuXG4gICAgLy8gY29udGFpbiBvdXRsZXRzIG90aGVyIHRoYW4gdGhlIG9uZSBiZWluZyBwcm9jZXNzZWQuIENvbnN1bWluZyB0aGUgb3V0bGV0cyBjb21tYW5kIHdvdWxkXG4gICAgLy8gcmVzdWx0IGluIG90aGVyIG91dGxldHMgYmVpbmcgaWdub3JlZC5cbiAgICBpZiAoaXNDb21tYW5kV2l0aE91dGxldHMoY29tbWFuZCkpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjb25zdCBjdXJyID0gYCR7Y29tbWFuZH1gO1xuICAgIGNvbnN0IG5leHQgPVxuICAgICAgICBjdXJyZW50Q29tbWFuZEluZGV4IDwgY29tbWFuZHMubGVuZ3RoIC0gMSA/IGNvbW1hbmRzW2N1cnJlbnRDb21tYW5kSW5kZXggKyAxXSA6IG51bGw7XG5cbiAgICBpZiAoY3VycmVudFBhdGhJbmRleCA+IDAgJiYgY3VyciA9PT0gdW5kZWZpbmVkKSBicmVhaztcblxuICAgIGlmIChjdXJyICYmIG5leHQgJiYgKHR5cGVvZiBuZXh0ID09PSAnb2JqZWN0JykgJiYgbmV4dC5vdXRsZXRzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICghY29tcGFyZShjdXJyLCBuZXh0LCBwYXRoKSkgcmV0dXJuIG5vTWF0Y2g7XG4gICAgICBjdXJyZW50Q29tbWFuZEluZGV4ICs9IDI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghY29tcGFyZShjdXJyLCB7fSwgcGF0aCkpIHJldHVybiBub01hdGNoO1xuICAgICAgY3VycmVudENvbW1hbmRJbmRleCsrO1xuICAgIH1cbiAgICBjdXJyZW50UGF0aEluZGV4Kys7XG4gIH1cblxuICByZXR1cm4ge21hdGNoOiB0cnVlLCBwYXRoSW5kZXg6IGN1cnJlbnRQYXRoSW5kZXgsIGNvbW1hbmRJbmRleDogY3VycmVudENvbW1hbmRJbmRleH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU5ld1NlZ21lbnRHcm91cChcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc3RhcnRJbmRleDogbnVtYmVyLCBjb21tYW5kczogYW55W10pOiBVcmxTZWdtZW50R3JvdXAge1xuICBjb25zdCBwYXRocyA9IHNlZ21lbnRHcm91cC5zZWdtZW50cy5zbGljZSgwLCBzdGFydEluZGV4KTtcblxuICBsZXQgaSA9IDA7XG4gIHdoaWxlIChpIDwgY29tbWFuZHMubGVuZ3RoKSB7XG4gICAgY29uc3QgY29tbWFuZCA9IGNvbW1hbmRzW2ldO1xuICAgIGlmIChpc0NvbW1hbmRXaXRoT3V0bGV0cyhjb21tYW5kKSkge1xuICAgICAgY29uc3QgY2hpbGRyZW4gPSBjcmVhdGVOZXdTZWdtZW50Q2hpbGRyZW4oY29tbWFuZC5vdXRsZXRzKTtcbiAgICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHBhdGhzLCBjaGlsZHJlbik7XG4gICAgfVxuXG4gICAgLy8gaWYgd2Ugc3RhcnQgd2l0aCBhbiBvYmplY3QgbGl0ZXJhbCwgd2UgbmVlZCB0byByZXVzZSB0aGUgcGF0aCBwYXJ0IGZyb20gdGhlIHNlZ21lbnRcbiAgICBpZiAoaSA9PT0gMCAmJiBpc01hdHJpeFBhcmFtcyhjb21tYW5kc1swXSkpIHtcbiAgICAgIGNvbnN0IHAgPSBzZWdtZW50R3JvdXAuc2VnbWVudHNbc3RhcnRJbmRleF07XG4gICAgICBwYXRocy5wdXNoKG5ldyBVcmxTZWdtZW50KHAucGF0aCwgc3RyaW5naWZ5KGNvbW1hbmRzWzBdKSkpO1xuICAgICAgaSsrO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgY3VyciA9IGlzQ29tbWFuZFdpdGhPdXRsZXRzKGNvbW1hbmQpID8gY29tbWFuZC5vdXRsZXRzW1BSSU1BUllfT1VUTEVUXSA6IGAke2NvbW1hbmR9YDtcbiAgICBjb25zdCBuZXh0ID0gKGkgPCBjb21tYW5kcy5sZW5ndGggLSAxKSA/IGNvbW1hbmRzW2kgKyAxXSA6IG51bGw7XG4gICAgaWYgKGN1cnIgJiYgbmV4dCAmJiBpc01hdHJpeFBhcmFtcyhuZXh0KSkge1xuICAgICAgcGF0aHMucHVzaChuZXcgVXJsU2VnbWVudChjdXJyLCBzdHJpbmdpZnkobmV4dCkpKTtcbiAgICAgIGkgKz0gMjtcbiAgICB9IGVsc2Uge1xuICAgICAgcGF0aHMucHVzaChuZXcgVXJsU2VnbWVudChjdXJyLCB7fSkpO1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChwYXRocywge30pO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVOZXdTZWdtZW50Q2hpbGRyZW4ob3V0bGV0czoge1tuYW1lOiBzdHJpbmddOiB1bmtub3duW118c3RyaW5nfSk6XG4gICAge1tvdXRsZXQ6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0ge1xuICBjb25zdCBjaGlsZHJlbjoge1tvdXRsZXQ6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0gPSB7fTtcbiAgZm9yRWFjaChvdXRsZXRzLCAoY29tbWFuZHMsIG91dGxldCkgPT4ge1xuICAgIGlmICh0eXBlb2YgY29tbWFuZHMgPT09ICdzdHJpbmcnKSB7XG4gICAgICBjb21tYW5kcyA9IFtjb21tYW5kc107XG4gICAgfVxuICAgIGlmIChjb21tYW5kcyAhPT0gbnVsbCkge1xuICAgICAgY2hpbGRyZW5bb3V0bGV0XSA9IGNyZWF0ZU5ld1NlZ21lbnRHcm91cChuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCB7fSksIDAsIGNvbW1hbmRzKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gY2hpbGRyZW47XG59XG5cbmZ1bmN0aW9uIHN0cmluZ2lmeShwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBhbnl9KToge1trZXk6IHN0cmluZ106IHN0cmluZ30ge1xuICBjb25zdCByZXM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIGZvckVhY2gocGFyYW1zLCAodjogYW55LCBrOiBzdHJpbmcpID0+IHJlc1trXSA9IGAke3Z9YCk7XG4gIHJldHVybiByZXM7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmUocGF0aDogc3RyaW5nLCBwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBhbnl9LCBzZWdtZW50OiBVcmxTZWdtZW50KTogYm9vbGVhbiB7XG4gIHJldHVybiBwYXRoID09IHNlZ21lbnQucGF0aCAmJiBzaGFsbG93RXF1YWwocGFyYW1zLCBzZWdtZW50LnBhcmFtZXRlcnMpO1xufVxuIl19