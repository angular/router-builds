/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ɵRuntimeError as RuntimeError } from '@angular/core';
import { PRIMARY_OUTLET } from './shared';
import { createRoot, squashSegmentGroup, UrlSegment, UrlSegmentGroup, UrlTree } from './url_tree';
import { forEach, last, shallowEqual } from './utils/collection';
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || ngDevMode;
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
            throw new RuntimeError(4003 /* RuntimeErrorCode.ROOT_SEGMENT_MATRIX_PARAMS */, NG_DEV_MODE && 'Root segment cannot have matrix parameters');
        }
        const cmdWithOutlet = commands.find(isCommandWithOutlets);
        if (cmdWithOutlet && cmdWithOutlet !== last(commands)) {
            throw new RuntimeError(4004 /* RuntimeErrorCode.MISPLACED_OUTLETS_COMMAND */, NG_DEV_MODE && '{outlets:{}} has to be the last command');
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
            throw new RuntimeError(4005 /* RuntimeErrorCode.INVALID_DOUBLE_DOTS */, NG_DEV_MODE && 'Invalid number of \'../\'');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlX3VybF90cmVlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jcmVhdGVfdXJsX3RyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGFBQWEsSUFBSSxZQUFZLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFJNUQsT0FBTyxFQUFTLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNoRCxPQUFPLEVBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ2hHLE9BQU8sRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBRS9ELE1BQU0sV0FBVyxHQUFHLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTLENBQUM7QUFFbEU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0RHO0FBQ0gsTUFBTSxVQUFVLHlCQUF5QixDQUNyQyxVQUFrQyxFQUFFLFFBQWUsRUFBRSxjQUEyQixJQUFJLEVBQ3BGLFdBQXdCLElBQUk7SUFDOUIsTUFBTSx5QkFBeUIsR0FBRywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMxRSxPQUFPLDZCQUE2QixDQUFDLHlCQUF5QixFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDbkcsQ0FBQztBQUVELFNBQVMsMkJBQTJCLENBQUMsS0FBNkI7SUFDaEUsSUFBSSxXQUFzQyxDQUFDO0lBRTNDLFNBQVMsb0NBQW9DLENBQUMsWUFBb0M7UUFDaEYsTUFBTSxZQUFZLEdBQXdDLEVBQUUsQ0FBQztRQUM3RCxLQUFLLE1BQU0sYUFBYSxJQUFJLFlBQVksQ0FBQyxRQUFRLEVBQUU7WUFDakQsTUFBTSxJQUFJ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UUFBUSxFQUFFO1lBQ2hDLFFBQVEsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3ZCO1FBQ0QsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFO1lBQ3JCLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLGVBQWUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ3BGO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDO0FBRUQsU0FBUyxTQUFTLENBQUMsTUFBNEI7SUFDN0MsTUFBTSxHQUFHLEdBQTRCLEVBQUUsQ0FBQztJQUN4QyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQVMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN4RCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FBQyxJQUFZLEVBQUUsTUFBNEIsRUFBRSxPQUFtQjtJQUM5RSxPQUFPLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHvJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQge1J1bnRpbWVFcnJvckNvZGV9IGZyb20gJy4vZXJyb3JzJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGUsIEFjdGl2YXRlZFJvdXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UGFyYW1zLCBQUklNQVJZX09VVExFVH0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtjcmVhdGVSb290LCBzcXVhc2hTZWdtZW50R3JvdXAsIFVybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cCwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge2ZvckVhY2gsIGxhc3QsIHNoYWxsb3dFcXVhbH0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcblxuY29uc3QgTkdfREVWX01PREUgPSB0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGU7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGBVcmxUcmVlYCByZWxhdGl2ZSB0byBhbiBgQWN0aXZhdGVkUm91dGVTbmFwc2hvdGAuXG4gKlxuICogQHB1YmxpY0FwaVxuICpcbiAqXG4gKiBAcGFyYW0gcmVsYXRpdmVUbyBUaGUgYEFjdGl2YXRlZFJvdXRlU25hcHNob3RgIHRvIGFwcGx5IHRoZSBjb21tYW5kcyB0b1xuICogQHBhcmFtIGNvbW1hbmRzIEFuIGFycmF5IG9mIFVSTCBmcmFnbWVudHMgd2l0aCB3aGljaCB0byBjb25zdHJ1Y3QgdGhlIG5ldyBVUkwgdHJlZS5cbiAqIElmIHRoZSBwYXRoIGlzIHN0YXRpYywgY2FuIGJlIHRoZSBsaXRlcmFsIFVSTCBzdHJpbmcuIEZvciBhIGR5bmFtaWMgcGF0aCwgcGFzcyBhbiBhcnJheSBvZiBwYXRoXG4gKiBzZWdtZW50cywgZm9sbG93ZWQgYnkgdGhlIHBhcmFtZXRlcnMgZm9yIGVhY2ggc2VnbWVudC5cbiAqIFRoZSBmcmFnbWVudHMgYXJlIGFwcGxpZWQgdG8gdGhlIG9uZSBwcm92aWRlZCBpbiB0aGUgYHJlbGF0aXZlVG9gIHBhcmFtZXRlci5cbiAqIEBwYXJhbSBxdWVyeVBhcmFtcyBUaGUgcXVlcnkgcGFyYW1ldGVycyBmb3IgdGhlIGBVcmxUcmVlYC4gYG51bGxgIGlmIHRoZSBgVXJsVHJlZWAgZG9lcyBub3QgaGF2ZVxuICogICAgIGFueSBxdWVyeSBwYXJhbWV0ZXJzLlxuICogQHBhcmFtIGZyYWdtZW50IFRoZSBmcmFnbWVudCBmb3IgdGhlIGBVcmxUcmVlYC4gYG51bGxgIGlmIHRoZSBgVXJsVHJlZWAgZG9lcyBub3QgaGF2ZSBhIGZyYWdtZW50LlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogYGBgXG4gKiAvLyBjcmVhdGUgL3RlYW0vMzMvdXNlci8xMVxuICogY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChzbmFwc2hvdCwgWycvdGVhbScsIDMzLCAndXNlcicsIDExXSk7XG4gKlxuICogLy8gY3JlYXRlIC90ZWFtLzMzO2V4cGFuZD10cnVlL3VzZXIvMTFcbiAqIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qoc25hcHNob3QsIFsnL3RlYW0nLCAzMywge2V4cGFuZDogdHJ1ZX0sICd1c2VyJywgMTFdKTtcbiAqXG4gKiAvLyB5b3UgY2FuIGNvbGxhcHNlIHN0YXRpYyBzZWdtZW50cyBsaWtlIHRoaXMgKHRoaXMgd29ya3Mgb25seSB3aXRoIHRoZSBmaXJzdCBwYXNzZWQtaW4gdmFsdWUpOlxuICogY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChzbmFwc2hvdCwgWycvdGVhbS8zMy91c2VyJywgdXNlcklkXSk7XG4gKlxuICogLy8gSWYgdGhlIGZpcnN0IHNlZ21lbnQgY2FuIGNvbnRhaW4gc2xhc2hlcywgYW5kIHlvdSBkbyBub3Qgd2FudCB0aGUgcm91dGVyIHRvIHNwbGl0IGl0LFxuICogLy8geW91IGNhbiBkbyB0aGUgZm9sbG93aW5nOlxuICogY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChzbmFwc2hvdCwgW3tzZWdtZW50UGF0aDogJy9vbmUvdHdvJ31dKTtcbiAqXG4gKiAvLyBjcmVhdGUgL3RlYW0vMzMvKHVzZXIvMTEvL3JpZ2h0OmNoYXQpXG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDpcbiAqICdjaGF0J319XSwgbnVsbCwgbnVsbCk7XG4gKlxuICogLy8gcmVtb3ZlIHRoZSByaWdodCBzZWNvbmRhcnkgbm9kZVxuICogY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChzbmFwc2hvdCwgWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6IG51bGx9fV0pO1xuICpcbiAqIC8vIEZvciB0aGUgZXhhbXBsZXMgYmVsb3csIGFzc3VtZSB0aGUgY3VycmVudCBVUkwgaXMgZm9yIHRoZSBgL3RlYW0vMzMvdXNlci8xMWAgYW5kIHRoZVxuICogYEFjdGl2YXRlZFJvdXRlU25hcHNob3RgIHBvaW50cyB0byBgdXNlci8xMWA6XG4gKlxuICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8xMS9kZXRhaWxzXG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJ2RldGFpbHMnXSk7XG4gKlxuICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8yMlxuICogY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChzbmFwc2hvdCwgWycuLi8yMiddKTtcbiAqXG4gKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS80NC91c2VyLzIyXG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJy4uLy4uL3RlYW0vNDQvdXNlci8yMiddKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChcbiAgICByZWxhdGl2ZVRvOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBjb21tYW5kczogYW55W10sIHF1ZXJ5UGFyYW1zOiBQYXJhbXN8bnVsbCA9IG51bGwsXG4gICAgZnJhZ21lbnQ6IHN0cmluZ3xudWxsID0gbnVsbCk6IFVybFRyZWUge1xuICBjb25zdCByZWxhdGl2ZVRvVXJsU2VnbWVudEdyb3VwID0gY3JlYXRlU2VnbWVudEdyb3VwRnJvbVJvdXRlKHJlbGF0aXZlVG8pO1xuICByZXR1cm4gY3JlYXRlVXJsVHJlZUZyb21TZWdtZW50R3JvdXAocmVsYXRpdmVUb1VybFNlZ21lbnRHcm91cCwgY29tbWFuZHMsIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVNlZ21lbnRHcm91cEZyb21Sb3V0ZShyb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IFVybFNlZ21lbnRHcm91cCB7XG4gIGxldCB0YXJnZXRHcm91cDogVXJsU2VnbWVudEdyb3VwfHVuZGVmaW5lZDtcblxuICBmdW5jdGlvbiBjcmVhdGVTZWdtZW50R3JvdXBGcm9tUm91dGVSZWN1cnNpdmUoY3VycmVudFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KSB7XG4gICAgY29uc3QgY2hpbGRPdXRsZXRzOiB7W291dGxldDogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICAgIGZvciAoY29uc3QgY2hpbGRTbmFwc2hvdCBvZiBjdXJyZW50Um91dGUuY2hpbGRyZW4pIHtcbiAgICAgIGNvbnN0IHJvb3QgPSBjcmVhdGVTZWdtZW50R3JvdXBGcm9tUm91dGVSZWN1cnNpdmUoY2hpbGRTbmFwc2hvdCk7XG4gICAgICBjaGlsZE91dGxldHNbY2hpbGRTbmFwc2hvdC5vdXRsZXRdID0gcm9vdDtcbiAgICB9XG4gICAgY29uc3Qgc2VnbWVudEdyb3VwID0gbmV3IFVybFNlZ21lbnRHcm91cChjdXJyZW50Um91dGUudXJsLCBjaGlsZE91dGxldHMpO1xuICAgIGlmIChjdXJyZW50Um91dGUgPT09IHJvdXRlKSB7XG4gICAgICB0YXJnZXRHcm91cCA9IHNlZ21lbnRHcm91cDtcbiAgICB9XG4gICAgcmV0dXJuIHNlZ21lbnRHcm91cDtcbiAgfVxuICBjb25zdCByb290Q2FuZGlkYXRlID0gY3JlYXRlU2VnbWVudEdyb3VwRnJvbVJvdXRlUmVjdXJzaXZlKHJvdXRlLnJvb3QpO1xuICBjb25zdCByb290U2VnbWVudEdyb3VwID0gY3JlYXRlUm9vdChyb290Q2FuZGlkYXRlKTtcblxuICByZXR1cm4gdGFyZ2V0R3JvdXAgPz8gcm9vdFNlZ21lbnRHcm91cDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVVybFRyZWVGcm9tU2VnbWVudEdyb3VwKFxuICAgIHJlbGF0aXZlVG86IFVybFNlZ21lbnRHcm91cCwgY29tbWFuZHM6IGFueVtdLCBxdWVyeVBhcmFtczogUGFyYW1zfG51bGwsXG4gICAgZnJhZ21lbnQ6IHN0cmluZ3xudWxsKTogVXJsVHJlZSB7XG4gIGxldCByb290ID0gcmVsYXRpdmVUbztcbiAgd2hpbGUgKHJvb3QucGFyZW50KSB7XG4gICAgcm9vdCA9IHJvb3QucGFyZW50O1xuICB9XG4gIC8vIFRoZXJlIGFyZSBubyBjb21tYW5kcyBzbyB0aGUgYFVybFRyZWVgIGdvZXMgdG8gdGhlIHNhbWUgcGF0aCBhcyB0aGUgb25lIGNyZWF0ZWQgZnJvbSB0aGVcbiAgLy8gYFVybFNlZ21lbnRHcm91cGAuIEFsbCB3ZSBuZWVkIHRvIGRvIGlzIHVwZGF0ZSB0aGUgYHF1ZXJ5UGFyYW1zYCBhbmQgYGZyYWdtZW50YCB3aXRob3V0XG4gIC8vIGFwcGx5aW5nIGFueSBvdGhlciBsb2dpYy5cbiAgaWYgKGNvbW1hbmRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB0cmVlKHJvb3QsIHJvb3QsIHJvb3QsIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCk7XG4gIH1cblxuICBjb25zdCBuYXYgPSBjb21wdXRlTmF2aWdhdGlvbihjb21tYW5kcyk7XG5cbiAgaWYgKG5hdi50b1Jvb3QoKSkge1xuICAgIHJldHVybiB0cmVlKHJvb3QsIHJvb3QsIG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KSwgcXVlcnlQYXJhbXMsIGZyYWdtZW50KTtcbiAgfVxuXG4gIGNvbnN0IHBvc2l0aW9uID0gZmluZFN0YXJ0aW5nUG9zaXRpb25Gb3JUYXJnZXRHcm91cChuYXYsIHJvb3QsIHJlbGF0aXZlVG8pO1xuICBjb25zdCBuZXdTZWdtZW50R3JvdXAgPSBwb3NpdGlvbi5wcm9jZXNzQ2hpbGRyZW4gP1xuICAgICAgdXBkYXRlU2VnbWVudEdyb3VwQ2hpbGRyZW4ocG9zaXRpb24uc2VnbWVudEdyb3VwLCBwb3NpdGlvbi5pbmRleCwgbmF2LmNvbW1hbmRzKSA6XG4gICAgICB1cGRhdGVTZWdtZW50R3JvdXAocG9zaXRpb24uc2VnbWVudEdyb3VwLCBwb3NpdGlvbi5pbmRleCwgbmF2LmNvbW1hbmRzKTtcbiAgcmV0dXJuIHRyZWUocm9vdCwgcG9zaXRpb24uc2VnbWVudEdyb3VwLCBuZXdTZWdtZW50R3JvdXAsIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVVcmxUcmVlKFxuICAgIHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZSwgdXJsVHJlZTogVXJsVHJlZSwgY29tbWFuZHM6IGFueVtdLCBxdWVyeVBhcmFtczogUGFyYW1zfG51bGwsXG4gICAgZnJhZ21lbnQ6IHN0cmluZ3xudWxsKTogVXJsVHJlZSB7XG4gIGlmIChjb21tYW5kcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJlZSh1cmxUcmVlLnJvb3QsIHVybFRyZWUucm9vdCwgdXJsVHJlZS5yb290LCBxdWVyeVBhcmFtcywgZnJhZ21lbnQpO1xuICB9XG5cbiAgY29uc3QgbmF2ID0gY29tcHV0ZU5hdmlnYXRpb24oY29tbWFuZHMpO1xuXG4gIGlmIChuYXYudG9Sb290KCkpIHtcbiAgICByZXR1cm4gdHJlZSh1cmxUcmVlLnJvb3QsIHVybFRyZWUucm9vdCwgbmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pLCBxdWVyeVBhcmFtcywgZnJhZ21lbnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlVHJlZVVzaW5nUGF0aEluZGV4KGxhc3RQYXRoSW5kZXg6IG51bWJlcikge1xuICAgIGNvbnN0IHN0YXJ0aW5nUG9zaXRpb24gPVxuICAgICAgICBmaW5kU3RhcnRpbmdQb3NpdGlvbihuYXYsIHVybFRyZWUsIHJvdXRlLnNuYXBzaG90Py5fdXJsU2VnbWVudCwgbGFzdFBhdGhJbmRleCk7XG5cbiAgICBjb25zdCBzZWdtZW50R3JvdXAgPSBzdGFydGluZ1Bvc2l0aW9uLnByb2Nlc3NDaGlsZHJlbiA/XG4gICAgICAgIHVwZGF0ZVNlZ21lbnRHcm91cENoaWxkcmVuKFxuICAgICAgICAgICAgc3RhcnRpbmdQb3NpdGlvbi5zZWdtZW50R3JvdXAsIHN0YXJ0aW5nUG9zaXRpb24uaW5kZXgsIG5hdi5jb21tYW5kcykgOlxuICAgICAgICB1cGRhdGVTZWdtZW50R3JvdXAoc3RhcnRpbmdQb3NpdGlvbi5zZWdtZW50R3JvdXAsIHN0YXJ0aW5nUG9zaXRpb24uaW5kZXgsIG5hdi5jb21tYW5kcyk7XG4gICAgcmV0dXJuIHRyZWUodXJsVHJlZS5yb290LCBzdGFydGluZ1Bvc2l0aW9uLnNlZ21lbnRHcm91cCwgc2VnbWVudEdyb3VwLCBxdWVyeVBhcmFtcywgZnJhZ21lbnQpO1xuICB9XG4gIC8vIE5vdGU6IFRoZSB0eXBlcyBzaG91bGQgZGlzYWxsb3cgYHNuYXBzaG90YCBmcm9tIGJlaW5nIGB1bmRlZmluZWRgIGJ1dCBkdWUgdG8gdGVzdCBtb2NrcywgdGhpc1xuICAvLyBtYXkgYmUgdGhlIGNhc2UuIFNpbmNlIHdlIHRyeSB0byBhY2Nlc3MgaXQgYXQgYW4gZWFybGllciBwb2ludCBiZWZvcmUgdGhlIHJlZmFjdG9yIHRvIGFkZCB0aGVcbiAgLy8gd2FybmluZyBmb3IgYHJlbGF0aXZlTGlua1Jlc29sdXRpb246ICdsZWdhY3knYCwgdGhpcyBtYXkgY2F1c2UgZmFpbHVyZXMgaW4gdGVzdHMgd2hlcmUgaXRcbiAgLy8gZGlkbid0IGJlZm9yZS5cbiAgY29uc3QgcmVzdWx0ID0gY3JlYXRlVHJlZVVzaW5nUGF0aEluZGV4KHJvdXRlLnNuYXBzaG90Py5fbGFzdFBhdGhJbmRleCk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaXNNYXRyaXhQYXJhbXMoY29tbWFuZDogYW55KTogYm9vbGVhbiB7XG4gIHJldHVybiB0eXBlb2YgY29tbWFuZCA9PT0gJ29iamVjdCcgJiYgY29tbWFuZCAhPSBudWxsICYmICFjb21tYW5kLm91dGxldHMgJiYgIWNvbW1hbmQuc2VnbWVudFBhdGg7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiBhIGdpdmVuIGNvbW1hbmQgaGFzIGFuIGBvdXRsZXRzYCBtYXAuIFdoZW4gd2UgZW5jb3VudGVyIGEgY29tbWFuZFxuICogd2l0aCBhbiBvdXRsZXRzIGsvdiBtYXAsIHdlIG5lZWQgdG8gYXBwbHkgZWFjaCBvdXRsZXQgaW5kaXZpZHVhbGx5IHRvIHRoZSBleGlzdGluZyBzZWdtZW50LlxuICovXG5mdW5jdGlvbiBpc0NvbW1hbmRXaXRoT3V0bGV0cyhjb21tYW5kOiBhbnkpOiBjb21tYW5kIGlzIHtvdXRsZXRzOiB7W2tleTogc3RyaW5nXTogYW55fX0ge1xuICByZXR1cm4gdHlwZW9mIGNvbW1hbmQgPT09ICdvYmplY3QnICYmIGNvbW1hbmQgIT0gbnVsbCAmJiBjb21tYW5kLm91dGxldHM7XG59XG5cbmZ1bmN0aW9uIHRyZWUoXG4gICAgb2xkUm9vdDogVXJsU2VnbWVudEdyb3VwLCBvbGRTZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgbmV3U2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsXG4gICAgcXVlcnlQYXJhbXM6IFBhcmFtc3xudWxsLCBmcmFnbWVudDogc3RyaW5nfG51bGwpOiBVcmxUcmVlIHtcbiAgbGV0IHFwOiBhbnkgPSB7fTtcbiAgaWYgKHF1ZXJ5UGFyYW1zKSB7XG4gICAgZm9yRWFjaChxdWVyeVBhcmFtcywgKHZhbHVlOiBhbnksIG5hbWU6IGFueSkgPT4ge1xuICAgICAgcXBbbmFtZV0gPSBBcnJheS5pc0FycmF5KHZhbHVlKSA/IHZhbHVlLm1hcCgodjogYW55KSA9PiBgJHt2fWApIDogYCR7dmFsdWV9YDtcbiAgICB9KTtcbiAgfVxuXG4gIGxldCByb290Q2FuZGlkYXRlOiBVcmxTZWdtZW50R3JvdXA7XG4gIGlmIChvbGRSb290ID09PSBvbGRTZWdtZW50R3JvdXApIHtcbiAgICByb290Q2FuZGlkYXRlID0gbmV3U2VnbWVudEdyb3VwO1xuICB9IGVsc2Uge1xuICAgIHJvb3RDYW5kaWRhdGUgPSByZXBsYWNlU2VnbWVudChvbGRSb290LCBvbGRTZWdtZW50R3JvdXAsIG5ld1NlZ21lbnRHcm91cCk7XG4gIH1cblxuICBjb25zdCBuZXdSb290ID0gY3JlYXRlUm9vdChzcXVhc2hTZWdtZW50R3JvdXAocm9vdENhbmRpZGF0ZSkpO1xuICByZXR1cm4gbmV3IFVybFRyZWUobmV3Um9vdCwgcXAsIGZyYWdtZW50KTtcbn1cblxuLyoqXG4gKiBSZXBsYWNlcyB0aGUgYG9sZFNlZ21lbnRgIHdoaWNoIGlzIGxvY2F0ZWQgaW4gc29tZSBjaGlsZCBvZiB0aGUgYGN1cnJlbnRgIHdpdGggdGhlIGBuZXdTZWdtZW50YC5cbiAqIFRoaXMgYWxzbyBoYXMgdGhlIGVmZmVjdCBvZiBjcmVhdGluZyBuZXcgYFVybFNlZ21lbnRHcm91cGAgY29waWVzIHRvIHVwZGF0ZSByZWZlcmVuY2VzLiBUaGlzXG4gKiBzaG91bGRuJ3QgYmUgbmVjZXNzYXJ5IGJ1dCB0aGUgZmFsbGJhY2sgbG9naWMgZm9yIGFuIGludmFsaWQgQWN0aXZhdGVkUm91dGUgaW4gdGhlIGNyZWF0aW9uIHVzZXNcbiAqIHRoZSBSb3V0ZXIncyBjdXJyZW50IHVybCB0cmVlLiBJZiB3ZSBkb24ndCBjcmVhdGUgbmV3IHNlZ21lbnQgZ3JvdXBzLCB3ZSBlbmQgdXAgbW9kaWZ5aW5nIHRoYXRcbiAqIHZhbHVlLlxuICovXG5mdW5jdGlvbiByZXBsYWNlU2VnbWVudChcbiAgICBjdXJyZW50OiBVcmxTZWdtZW50R3JvdXAsIG9sZFNlZ21lbnQ6IFVybFNlZ21lbnRHcm91cCxcbiAgICBuZXdTZWdtZW50OiBVcmxTZWdtZW50R3JvdXApOiBVcmxTZWdtZW50R3JvdXAge1xuICBjb25zdCBjaGlsZHJlbjoge1trZXk6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0gPSB7fTtcbiAgZm9yRWFjaChjdXJyZW50LmNoaWxkcmVuLCAoYzogVXJsU2VnbWVudEdyb3VwLCBvdXRsZXROYW1lOiBzdHJpbmcpID0+IHtcbiAgICBpZiAoYyA9PT0gb2xkU2VnbWVudCkge1xuICAgICAgY2hpbGRyZW5bb3V0bGV0TmFtZV0gPSBuZXdTZWdtZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICBjaGlsZHJlbltvdXRsZXROYW1lXSA9IHJlcGxhY2VTZWdtZW50KGMsIG9sZFNlZ21lbnQsIG5ld1NlZ21lbnQpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKGN1cnJlbnQuc2VnbWVudHMsIGNoaWxkcmVuKTtcbn1cblxuY2xhc3MgTmF2aWdhdGlvbiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHVibGljIGlzQWJzb2x1dGU6IGJvb2xlYW4sIHB1YmxpYyBudW1iZXJPZkRvdWJsZURvdHM6IG51bWJlciwgcHVibGljIGNvbW1hbmRzOiBhbnlbXSkge1xuICAgIGlmIChpc0Fic29sdXRlICYmIGNvbW1hbmRzLmxlbmd0aCA+IDAgJiYgaXNNYXRyaXhQYXJhbXMoY29tbWFuZHNbMF0pKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuUk9PVF9TRUdNRU5UX01BVFJJWF9QQVJBTVMsXG4gICAgICAgICAgTkdfREVWX01PREUgJiYgJ1Jvb3Qgc2VnbWVudCBjYW5ub3QgaGF2ZSBtYXRyaXggcGFyYW1ldGVycycpO1xuICAgIH1cblxuICAgIGNvbnN0IGNtZFdpdGhPdXRsZXQgPSBjb21tYW5kcy5maW5kKGlzQ29tbWFuZFdpdGhPdXRsZXRzKTtcbiAgICBpZiAoY21kV2l0aE91dGxldCAmJiBjbWRXaXRoT3V0bGV0ICE9PSBsYXN0KGNvbW1hbmRzKSkge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLk1JU1BMQUNFRF9PVVRMRVRTX0NPTU1BTkQsXG4gICAgICAgICAgTkdfREVWX01PREUgJiYgJ3tvdXRsZXRzOnt9fSBoYXMgdG8gYmUgdGhlIGxhc3QgY29tbWFuZCcpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyB0b1Jvb3QoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuaXNBYnNvbHV0ZSAmJiB0aGlzLmNvbW1hbmRzLmxlbmd0aCA9PT0gMSAmJiB0aGlzLmNvbW1hbmRzWzBdID09ICcvJztcbiAgfVxufVxuXG4vKiogVHJhbnNmb3JtcyBjb21tYW5kcyB0byBhIG5vcm1hbGl6ZWQgYE5hdmlnYXRpb25gICovXG5mdW5jdGlvbiBjb21wdXRlTmF2aWdhdGlvbihjb21tYW5kczogYW55W10pOiBOYXZpZ2F0aW9uIHtcbiAgaWYgKCh0eXBlb2YgY29tbWFuZHNbMF0gPT09ICdzdHJpbmcnKSAmJiBjb21tYW5kcy5sZW5ndGggPT09IDEgJiYgY29tbWFuZHNbMF0gPT09ICcvJykge1xuICAgIHJldHVybiBuZXcgTmF2aWdhdGlvbih0cnVlLCAwLCBjb21tYW5kcyk7XG4gIH1cblxuICBsZXQgbnVtYmVyT2ZEb3VibGVEb3RzID0gMDtcbiAgbGV0IGlzQWJzb2x1dGUgPSBmYWxzZTtcblxuICBjb25zdCByZXM6IGFueVtdID0gY29tbWFuZHMucmVkdWNlKChyZXMsIGNtZCwgY21kSWR4KSA9PiB7XG4gICAgaWYgKHR5cGVvZiBjbWQgPT09ICdvYmplY3QnICYmIGNtZCAhPSBudWxsKSB7XG4gICAgICBpZiAoY21kLm91dGxldHMpIHtcbiAgICAgICAgY29uc3Qgb3V0bGV0czoge1trOiBzdHJpbmddOiBhbnl9ID0ge307XG4gICAgICAgIGZvckVhY2goY21kLm91dGxldHMsIChjb21tYW5kczogYW55LCBuYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICBvdXRsZXRzW25hbWVdID0gdHlwZW9mIGNvbW1hbmRzID09PSAnc3RyaW5nJyA/IGNvbW1hbmRzLnNwbGl0KCcvJykgOiBjb21tYW5kcztcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBbLi4ucmVzLCB7b3V0bGV0c31dO1xuICAgICAgfVxuXG4gICAgICBpZiAoY21kLnNlZ21lbnRQYXRoKSB7XG4gICAgICAgIHJldHVybiBbLi4ucmVzLCBjbWQuc2VnbWVudFBhdGhdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghKHR5cGVvZiBjbWQgPT09ICdzdHJpbmcnKSkge1xuICAgICAgcmV0dXJuIFsuLi5yZXMsIGNtZF07XG4gICAgfVxuXG4gICAgaWYgKGNtZElkeCA9PT0gMCkge1xuICAgICAgY21kLnNwbGl0KCcvJykuZm9yRWFjaCgodXJsUGFydCwgcGFydEluZGV4KSA9PiB7XG4gICAgICAgIGlmIChwYXJ0SW5kZXggPT0gMCAmJiB1cmxQYXJ0ID09PSAnLicpIHtcbiAgICAgICAgICAvLyBza2lwICcuL2EnXG4gICAgICAgIH0gZWxzZSBpZiAocGFydEluZGV4ID09IDAgJiYgdXJsUGFydCA9PT0gJycpIHsgIC8vICAnL2EnXG4gICAgICAgICAgaXNBYnNvbHV0ZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAodXJsUGFydCA9PT0gJy4uJykgeyAgLy8gICcuLi9hJ1xuICAgICAgICAgIG51bWJlck9mRG91YmxlRG90cysrO1xuICAgICAgICB9IGVsc2UgaWYgKHVybFBhcnQgIT0gJycpIHtcbiAgICAgICAgICByZXMucHVzaCh1cmxQYXJ0KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgcmV0dXJuIFsuLi5yZXMsIGNtZF07XG4gIH0sIFtdKTtcblxuICByZXR1cm4gbmV3IE5hdmlnYXRpb24oaXNBYnNvbHV0ZSwgbnVtYmVyT2ZEb3VibGVEb3RzLCByZXMpO1xufVxuXG5jbGFzcyBQb3NpdGlvbiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHVibGljIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBwdWJsaWMgcHJvY2Vzc0NoaWxkcmVuOiBib29sZWFuLCBwdWJsaWMgaW5kZXg6IG51bWJlcikge1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRTdGFydGluZ1Bvc2l0aW9uRm9yVGFyZ2V0R3JvdXAoXG4gICAgbmF2OiBOYXZpZ2F0aW9uLCByb290OiBVcmxTZWdtZW50R3JvdXAsIHRhcmdldDogVXJsU2VnbWVudEdyb3VwKTogUG9zaXRpb24ge1xuICBpZiAobmF2LmlzQWJzb2x1dGUpIHtcbiAgICByZXR1cm4gbmV3IFBvc2l0aW9uKHJvb3QsIHRydWUsIDApO1xuICB9XG5cbiAgaWYgKCF0YXJnZXQpIHtcbiAgICAvLyBgTmFOYCBpcyB1c2VkIG9ubHkgdG8gbWFpbnRhaW4gYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgd2l0aCBpbmNvcnJlY3RseSBtb2NrZWRcbiAgICAvLyBgQWN0aXZhdGVkUm91dGVTbmFwc2hvdGAgaW4gdGVzdHMuIEluIHByaW9yIHZlcnNpb25zIG9mIHRoaXMgY29kZSwgdGhlIHBvc2l0aW9uIGhlcmUgd2FzXG4gICAgLy8gZGV0ZXJtaW5lZCBiYXNlZCBvbiBhbiBpbnRlcm5hbCBwcm9wZXJ0eSB0aGF0IHdhcyByYXJlbHkgbW9ja2VkLCByZXN1bHRpbmcgaW4gYE5hTmAuIEluXG4gICAgLy8gcmVhbGl0eSwgdGhpcyBjb2RlIHBhdGggc2hvdWxkIF9uZXZlcl8gYmUgdG91Y2hlZCBzaW5jZSBgdGFyZ2V0YCBpcyBub3QgYWxsb3dlZCB0byBiZSBmYWxzZXkuXG4gICAgcmV0dXJuIG5ldyBQb3NpdGlvbihyb290LCBmYWxzZSwgTmFOKTtcbiAgfVxuICBpZiAodGFyZ2V0LnBhcmVudCA9PT0gbnVsbCkge1xuICAgIHJldHVybiBuZXcgUG9zaXRpb24odGFyZ2V0LCB0cnVlLCAwKTtcbiAgfVxuXG4gIGNvbnN0IG1vZGlmaWVyID0gaXNNYXRyaXhQYXJhbXMobmF2LmNvbW1hbmRzWzBdKSA/IDAgOiAxO1xuICBjb25zdCBpbmRleCA9IHRhcmdldC5zZWdtZW50cy5sZW5ndGggLSAxICsgbW9kaWZpZXI7XG4gIHJldHVybiBjcmVhdGVQb3NpdGlvbkFwcGx5aW5nRG91YmxlRG90cyh0YXJnZXQsIGluZGV4LCBuYXYubnVtYmVyT2ZEb3VibGVEb3RzKTtcbn1cblxuZnVuY3Rpb24gZmluZFN0YXJ0aW5nUG9zaXRpb24oXG4gICAgbmF2OiBOYXZpZ2F0aW9uLCB0cmVlOiBVcmxUcmVlLCBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCxcbiAgICBsYXN0UGF0aEluZGV4OiBudW1iZXIpOiBQb3NpdGlvbiB7XG4gIGlmIChuYXYuaXNBYnNvbHV0ZSkge1xuICAgIHJldHVybiBuZXcgUG9zaXRpb24odHJlZS5yb290LCB0cnVlLCAwKTtcbiAgfVxuXG4gIGlmIChsYXN0UGF0aEluZGV4ID09PSAtMSkge1xuICAgIC8vIFBhdGhsZXNzIEFjdGl2YXRlZFJvdXRlIGhhcyBfbGFzdFBhdGhJbmRleCA9PT0gLTEgYnV0IHNob3VsZCBub3QgcHJvY2VzcyBjaGlsZHJlblxuICAgIC8vIHNlZSBpc3N1ZSAjMjYyMjQsICMxMzAxMSwgIzM1Njg3XG4gICAgLy8gSG93ZXZlciwgaWYgdGhlIEFjdGl2YXRlZFJvdXRlIGlzIHRoZSByb290IHdlIHNob3VsZCBwcm9jZXNzIGNoaWxkcmVuIGxpa2UgYWJvdmUuXG4gICAgY29uc3QgcHJvY2Vzc0NoaWxkcmVuID0gc2VnbWVudEdyb3VwID09PSB0cmVlLnJvb3Q7XG4gICAgcmV0dXJuIG5ldyBQb3NpdGlvbihzZWdtZW50R3JvdXAsIHByb2Nlc3NDaGlsZHJlbiwgMCk7XG4gIH1cblxuICBjb25zdCBtb2RpZmllciA9IGlzTWF0cml4UGFyYW1zKG5hdi5jb21tYW5kc1swXSkgPyAwIDogMTtcbiAgY29uc3QgaW5kZXggPSBsYXN0UGF0aEluZGV4ICsgbW9kaWZpZXI7XG4gIHJldHVybiBjcmVhdGVQb3NpdGlvbkFwcGx5aW5nRG91YmxlRG90cyhzZWdtZW50R3JvdXAsIGluZGV4LCBuYXYubnVtYmVyT2ZEb3VibGVEb3RzKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUG9zaXRpb25BcHBseWluZ0RvdWJsZURvdHMoXG4gICAgZ3JvdXA6IFVybFNlZ21lbnRHcm91cCwgaW5kZXg6IG51bWJlciwgbnVtYmVyT2ZEb3VibGVEb3RzOiBudW1iZXIpOiBQb3NpdGlvbiB7XG4gIGxldCBnID0gZ3JvdXA7XG4gIGxldCBjaSA9IGluZGV4O1xuICBsZXQgZGQgPSBudW1iZXJPZkRvdWJsZURvdHM7XG4gIHdoaWxlIChkZCA+IGNpKSB7XG4gICAgZGQgLT0gY2k7XG4gICAgZyA9IGcucGFyZW50ITtcbiAgICBpZiAoIWcpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5JTlZBTElEX0RPVUJMRV9ET1RTLCBOR19ERVZfTU9ERSAmJiAnSW52YWxpZCBudW1iZXIgb2YgXFwnLi4vXFwnJyk7XG4gICAgfVxuICAgIGNpID0gZy5zZWdtZW50cy5sZW5ndGg7XG4gIH1cbiAgcmV0dXJuIG5ldyBQb3NpdGlvbihnLCBmYWxzZSwgY2kgLSBkZCk7XG59XG5cbmZ1bmN0aW9uIGdldE91dGxldHMoY29tbWFuZHM6IHVua25vd25bXSk6IHtbazogc3RyaW5nXTogdW5rbm93bltdfHN0cmluZ30ge1xuICBpZiAoaXNDb21tYW5kV2l0aE91dGxldHMoY29tbWFuZHNbMF0pKSB7XG4gICAgcmV0dXJuIGNvbW1hbmRzWzBdLm91dGxldHM7XG4gIH1cblxuICByZXR1cm4ge1tQUklNQVJZX09VVExFVF06IGNvbW1hbmRzfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlU2VnbWVudEdyb3VwKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBzdGFydEluZGV4OiBudW1iZXIsIGNvbW1hbmRzOiBhbnlbXSk6IFVybFNlZ21lbnRHcm91cCB7XG4gIGlmICghc2VnbWVudEdyb3VwKSB7XG4gICAgc2VnbWVudEdyb3VwID0gbmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pO1xuICB9XG4gIGlmIChzZWdtZW50R3JvdXAuc2VnbWVudHMubGVuZ3RoID09PSAwICYmIHNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpKSB7XG4gICAgcmV0dXJuIHVwZGF0ZVNlZ21lbnRHcm91cENoaWxkcmVuKHNlZ21lbnRHcm91cCwgc3RhcnRJbmRleCwgY29tbWFuZHMpO1xuICB9XG5cbiAgY29uc3QgbSA9IHByZWZpeGVkV2l0aChzZWdtZW50R3JvdXAsIHN0YXJ0SW5kZXgsIGNvbW1hbmRzKTtcbiAgY29uc3Qgc2xpY2VkQ29tbWFuZHMgPSBjb21tYW5kcy5zbGljZShtLmNvbW1hbmRJbmRleCk7XG4gIGlmIChtLm1hdGNoICYmIG0ucGF0aEluZGV4IDwgc2VnbWVudEdyb3VwLnNlZ21lbnRzLmxlbmd0aCkge1xuICAgIGNvbnN0IGcgPSBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cC5zZWdtZW50cy5zbGljZSgwLCBtLnBhdGhJbmRleCksIHt9KTtcbiAgICBnLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSA9XG4gICAgICAgIG5ldyBVcmxTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLnNsaWNlKG0ucGF0aEluZGV4KSwgc2VnbWVudEdyb3VwLmNoaWxkcmVuKTtcbiAgICByZXR1cm4gdXBkYXRlU2VnbWVudEdyb3VwQ2hpbGRyZW4oZywgMCwgc2xpY2VkQ29tbWFuZHMpO1xuICB9IGVsc2UgaWYgKG0ubWF0Y2ggJiYgc2xpY2VkQ29tbWFuZHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLCB7fSk7XG4gIH0gZWxzZSBpZiAobS5tYXRjaCAmJiAhc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkpIHtcbiAgICByZXR1cm4gY3JlYXRlTmV3U2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cCwgc3RhcnRJbmRleCwgY29tbWFuZHMpO1xuICB9IGVsc2UgaWYgKG0ubWF0Y2gpIHtcbiAgICByZXR1cm4gdXBkYXRlU2VnbWVudEdyb3VwQ2hpbGRyZW4oc2VnbWVudEdyb3VwLCAwLCBzbGljZWRDb21tYW5kcyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGNyZWF0ZU5ld1NlZ21lbnRHcm91cChzZWdtZW50R3JvdXAsIHN0YXJ0SW5kZXgsIGNvbW1hbmRzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVTZWdtZW50R3JvdXBDaGlsZHJlbihcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc3RhcnRJbmRleDogbnVtYmVyLCBjb21tYW5kczogYW55W10pOiBVcmxTZWdtZW50R3JvdXAge1xuICBpZiAoY29tbWFuZHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLCB7fSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3Qgb3V0bGV0cyA9IGdldE91dGxldHMoY29tbWFuZHMpO1xuICAgIGNvbnN0IGNoaWxkcmVuOiB7W2tleTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuXG4gICAgZm9yRWFjaChvdXRsZXRzLCAoY29tbWFuZHMsIG91dGxldCkgPT4ge1xuICAgICAgaWYgKHR5cGVvZiBjb21tYW5kcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29tbWFuZHMgPSBbY29tbWFuZHNdO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1hbmRzICE9PSBudWxsKSB7XG4gICAgICAgIGNoaWxkcmVuW291dGxldF0gPSB1cGRhdGVTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLmNoaWxkcmVuW291dGxldF0sIHN0YXJ0SW5kZXgsIGNvbW1hbmRzKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGZvckVhY2goc2VnbWVudEdyb3VwLmNoaWxkcmVuLCAoY2hpbGQ6IFVybFNlZ21lbnRHcm91cCwgY2hpbGRPdXRsZXQ6IHN0cmluZykgPT4ge1xuICAgICAgaWYgKG91dGxldHNbY2hpbGRPdXRsZXRdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY2hpbGRyZW5bY2hpbGRPdXRsZXRdID0gY2hpbGQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLCBjaGlsZHJlbik7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJlZml4ZWRXaXRoKHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBzdGFydEluZGV4OiBudW1iZXIsIGNvbW1hbmRzOiBhbnlbXSkge1xuICBsZXQgY3VycmVudENvbW1hbmRJbmRleCA9IDA7XG4gIGxldCBjdXJyZW50UGF0aEluZGV4ID0gc3RhcnRJbmRleDtcblxuICBjb25zdCBub01hdGNoID0ge21hdGNoOiBmYWxzZSwgcGF0aEluZGV4OiAwLCBjb21tYW5kSW5kZXg6IDB9O1xuICB3aGlsZSAoY3VycmVudFBhdGhJbmRleCA8IHNlZ21lbnRHcm91cC5zZWdtZW50cy5sZW5ndGgpIHtcbiAgICBpZiAoY3VycmVudENvbW1hbmRJbmRleCA+PSBjb21tYW5kcy5sZW5ndGgpIHJldHVybiBub01hdGNoO1xuICAgIGNvbnN0IHBhdGggPSBzZWdtZW50R3JvdXAuc2VnbWVudHNbY3VycmVudFBhdGhJbmRleF07XG4gICAgY29uc3QgY29tbWFuZCA9IGNvbW1hbmRzW2N1cnJlbnRDb21tYW5kSW5kZXhdO1xuICAgIC8vIERvIG5vdCB0cnkgdG8gY29uc3VtZSBjb21tYW5kIGFzIHBhcnQgb2YgdGhlIHByZWZpeGluZyBpZiBpdCBoYXMgb3V0bGV0cyBiZWNhdXNlIGl0IGNhblxuICAgIC8vIGNvbnRhaW4gb3V0bGV0cyBvdGhlciB0aGFuIHRoZSBvbmUgYmVpbmcgcHJvY2Vzc2VkLiBDb25zdW1pbmcgdGhlIG91dGxldHMgY29tbWFuZCB3b3VsZFxuICAgIC8vIHJlc3VsdCBpbiBvdGhlciBvdXRsZXRzIGJlaW5nIGlnbm9yZWQuXG4gICAgaWYgKGlzQ29tbWFuZFdpdGhPdXRsZXRzKGNvbW1hbmQpKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY29uc3QgY3VyciA9IGAke2NvbW1hbmR9YDtcbiAgICBjb25zdCBuZXh0ID1cbiAgICAgICAgY3VycmVudENvbW1hbmRJbmRleCA8IGNvbW1hbmRzLmxlbmd0aCAtIDEgPyBjb21tYW5kc1tjdXJyZW50Q29tbWFuZEluZGV4ICsgMV0gOiBudWxsO1xuXG4gICAgaWYgKGN1cnJlbnRQYXRoSW5kZXggPiAwICYmIGN1cnIgPT09IHVuZGVmaW5lZCkgYnJlYWs7XG5cbiAgICBpZiAoY3VyciAmJiBuZXh0ICYmICh0eXBlb2YgbmV4dCA9PT0gJ29iamVjdCcpICYmIG5leHQub3V0bGV0cyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoIWNvbXBhcmUoY3VyciwgbmV4dCwgcGF0aCkpIHJldHVybiBub01hdGNoO1xuICAgICAgY3VycmVudENvbW1hbmRJbmRleCArPSAyO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWNvbXBhcmUoY3Vyciwge30sIHBhdGgpKSByZXR1cm4gbm9NYXRjaDtcbiAgICAgIGN1cnJlbnRDb21tYW5kSW5kZXgrKztcbiAgICB9XG4gICAgY3VycmVudFBhdGhJbmRleCsrO1xuICB9XG5cbiAgcmV0dXJuIHttYXRjaDogdHJ1ZSwgcGF0aEluZGV4OiBjdXJyZW50UGF0aEluZGV4LCBjb21tYW5kSW5kZXg6IGN1cnJlbnRDb21tYW5kSW5kZXh9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVOZXdTZWdtZW50R3JvdXAoXG4gICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHN0YXJ0SW5kZXg6IG51bWJlciwgY29tbWFuZHM6IGFueVtdKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgY29uc3QgcGF0aHMgPSBzZWdtZW50R3JvdXAuc2VnbWVudHMuc2xpY2UoMCwgc3RhcnRJbmRleCk7XG5cbiAgbGV0IGkgPSAwO1xuICB3aGlsZSAoaSA8IGNvbW1hbmRzLmxlbmd0aCkge1xuICAgIGNvbnN0IGNvbW1hbmQgPSBjb21tYW5kc1tpXTtcbiAgICBpZiAoaXNDb21tYW5kV2l0aE91dGxldHMoY29tbWFuZCkpIHtcbiAgICAgIGNvbnN0IGNoaWxkcmVuID0gY3JlYXRlTmV3U2VnbWVudENoaWxkcmVuKGNvbW1hbmQub3V0bGV0cyk7XG4gICAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChwYXRocywgY2hpbGRyZW4pO1xuICAgIH1cblxuICAgIC8vIGlmIHdlIHN0YXJ0IHdpdGggYW4gb2JqZWN0IGxpdGVyYWwsIHdlIG5lZWQgdG8gcmV1c2UgdGhlIHBhdGggcGFydCBmcm9tIHRoZSBzZWdtZW50XG4gICAgaWYgKGkgPT09IDAgJiYgaXNNYXRyaXhQYXJhbXMoY29tbWFuZHNbMF0pKSB7XG4gICAgICBjb25zdCBwID0gc2VnbWVudEdyb3VwLnNlZ21lbnRzW3N0YXJ0SW5kZXhdO1xuICAgICAgcGF0aHMucHVzaChuZXcgVXJsU2VnbWVudChwLnBhdGgsIHN0cmluZ2lmeShjb21tYW5kc1swXSkpKTtcbiAgICAgIGkrKztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGN1cnIgPSBpc0NvbW1hbmRXaXRoT3V0bGV0cyhjb21tYW5kKSA/IGNvbW1hbmQub3V0bGV0c1tQUklNQVJZX09VVExFVF0gOiBgJHtjb21tYW5kfWA7XG4gICAgY29uc3QgbmV4dCA9IChpIDwgY29tbWFuZHMubGVuZ3RoIC0gMSkgPyBjb21tYW5kc1tpICsgMV0gOiBudWxsO1xuICAgIGlmIChjdXJyICYmIG5leHQgJiYgaXNNYXRyaXhQYXJhbXMobmV4dCkpIHtcbiAgICAgIHBhdGhzLnB1c2gobmV3IFVybFNlZ21lbnQoY3Vyciwgc3RyaW5naWZ5KG5leHQpKSk7XG4gICAgICBpICs9IDI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhdGhzLnB1c2gobmV3IFVybFNlZ21lbnQoY3Vyciwge30pKTtcbiAgICAgIGkrKztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAocGF0aHMsIHt9KTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTmV3U2VnbWVudENoaWxkcmVuKG91dGxldHM6IHtbbmFtZTogc3RyaW5nXTogdW5rbm93bltdfHN0cmluZ30pOlxuICAgIHtbb3V0bGV0OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9IHtcbiAgY29uc3QgY2hpbGRyZW46IHtbb3V0bGV0OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gIGZvckVhY2gob3V0bGV0cywgKGNvbW1hbmRzLCBvdXRsZXQpID0+IHtcbiAgICBpZiAodHlwZW9mIGNvbW1hbmRzID09PSAnc3RyaW5nJykge1xuICAgICAgY29tbWFuZHMgPSBbY29tbWFuZHNdO1xuICAgIH1cbiAgICBpZiAoY29tbWFuZHMgIT09IG51bGwpIHtcbiAgICAgIGNoaWxkcmVuW291dGxldF0gPSBjcmVhdGVOZXdTZWdtZW50R3JvdXAobmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pLCAwLCBjb21tYW5kcyk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGNoaWxkcmVuO1xufVxuXG5mdW5jdGlvbiBzdHJpbmdpZnkocGFyYW1zOiB7W2tleTogc3RyaW5nXTogYW55fSk6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9IHtcbiAgY29uc3QgcmVzOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICBmb3JFYWNoKHBhcmFtcywgKHY6IGFueSwgazogc3RyaW5nKSA9PiByZXNba10gPSBgJHt2fWApO1xuICByZXR1cm4gcmVzO1xufVxuXG5mdW5jdGlvbiBjb21wYXJlKHBhdGg6IHN0cmluZywgcGFyYW1zOiB7W2tleTogc3RyaW5nXTogYW55fSwgc2VnbWVudDogVXJsU2VnbWVudCk6IGJvb2xlYW4ge1xuICByZXR1cm4gcGF0aCA9PSBzZWdtZW50LnBhdGggJiYgc2hhbGxvd0VxdWFsKHBhcmFtcywgc2VnbWVudC5wYXJhbWV0ZXJzKTtcbn1cbiJdfQ==