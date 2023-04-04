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
export function createSegmentGroupFromRoute(route) {
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
        // If the set of commands does not apply anything to the primary outlet and the child segment is
        // an empty path primary segment on its own, we want to apply the commands to the empty child
        // path rather than here. The outcome is that the empty primary child is effectively removed
        // from the final output UrlTree. Imagine the following config:
        //
        // {path: '', children: [{path: '**', outlet: 'popup'}]}.
        //
        // Navigation to /(popup:a) will activate the child outlet correctly Given a follow-up
        // navigation with commands
        // ['/', {outlets: {'popup': 'b'}}], we _would not_ want to apply the outlet commands to the
        // root segment because that would result in
        // //(popup:a)(popup:b) since the outlet command got applied one level above where it appears in
        // the `ActivatedRoute` rather than updating the existing one.
        //
        // Because empty paths do not appear in the URL segments and the fact that the segments used in
        // the output `UrlTree` are squashed to eliminate these empty paths where possible
        // https://github.com/angular/angular/blob/13f10de40e25c6900ca55bd83b36bd533dacfa9e/packages/router/src/url_tree.ts#L755
        // it can be hard to determine what is the right thing to do when applying commands to a
        // `UrlSegmentGroup` that is created from an "unsquashed"/expanded `ActivatedRoute` tree.
        // This code effectively "squashes" empty path primary routes when they have no siblings on
        // the same level of the tree.
        if (!outlets[PRIMARY_OUTLET] && segmentGroup.children[PRIMARY_OUTLET] &&
            segmentGroup.numberOfChildren === 1 &&
            segmentGroup.children[PRIMARY_OUTLET].segments.length === 0) {
            const childrenOfEmptyChild = updateSegmentGroupChildren(segmentGroup.children[PRIMARY_OUTLET], startIndex, commands);
            return new UrlSegmentGroup(segmentGroup.segments, childrenOfEmptyChild.children);
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlX3VybF90cmVlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jcmVhdGVfdXJsX3RyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGFBQWEsSUFBSSxZQUFZLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFJNUQsT0FBTyxFQUFTLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNoRCxPQUFPLEVBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ2hHLE9BQU8sRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBRS9ELE1BQU0sV0FBVyxHQUFHLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTLENBQUM7QUFFbEU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0RHO0FBQ0gsTUFBTSxVQUFVLHlCQUF5QixDQUNyQyxVQUFrQyxFQUFFLFFBQWUsRUFBRSxjQUEyQixJQUFJLEVBQ3BGLFdBQXdCLElBQUk7SUFDOUIsTUFBTSx5QkFBeUIsR0FBRywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMxRSxPQUFPLDZCQUE2QixDQUFDLHlCQUF5QixFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDbkcsQ0FBQztBQUVELE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxLQUE2QjtJQUN2RSxJQUFJLFdBQXNDLENBQUM7SUFFM0MsU0FBUyxvQ0FBb0MsQ0FBQyxZQUFvQztRQUVoRixNQUFNLFlBQVksR0FBd0MsRUFBRSxDQUFDO1FBQzdELEtBQUssTUFBTSxhQUFhLElBQUksWUFBWSxDQUFDLFFBQVEsRUFBRTtZQUNqRCxNQUFN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TSxHQUFHLEdBQTRCLEVBQUUsQ0FBQztJQUN4QyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQVMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN4RCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FBQyxJQUFZLEVBQUUsTUFBNEIsRUFBRSxPQUFtQjtJQUM5RSxPQUFPLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHvJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQge1J1bnRpbWVFcnJvckNvZGV9IGZyb20gJy4vZXJyb3JzJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGUsIEFjdGl2YXRlZFJvdXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UGFyYW1zLCBQUklNQVJZX09VVExFVH0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtjcmVhdGVSb290LCBzcXVhc2hTZWdtZW50R3JvdXAsIFVybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cCwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge2ZvckVhY2gsIGxhc3QsIHNoYWxsb3dFcXVhbH0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcblxuY29uc3QgTkdfREVWX01PREUgPSB0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGU7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGBVcmxUcmVlYCByZWxhdGl2ZSB0byBhbiBgQWN0aXZhdGVkUm91dGVTbmFwc2hvdGAuXG4gKlxuICogQHB1YmxpY0FwaVxuICpcbiAqXG4gKiBAcGFyYW0gcmVsYXRpdmVUbyBUaGUgYEFjdGl2YXRlZFJvdXRlU25hcHNob3RgIHRvIGFwcGx5IHRoZSBjb21tYW5kcyB0b1xuICogQHBhcmFtIGNvbW1hbmRzIEFuIGFycmF5IG9mIFVSTCBmcmFnbWVudHMgd2l0aCB3aGljaCB0byBjb25zdHJ1Y3QgdGhlIG5ldyBVUkwgdHJlZS5cbiAqIElmIHRoZSBwYXRoIGlzIHN0YXRpYywgY2FuIGJlIHRoZSBsaXRlcmFsIFVSTCBzdHJpbmcuIEZvciBhIGR5bmFtaWMgcGF0aCwgcGFzcyBhbiBhcnJheSBvZiBwYXRoXG4gKiBzZWdtZW50cywgZm9sbG93ZWQgYnkgdGhlIHBhcmFtZXRlcnMgZm9yIGVhY2ggc2VnbWVudC5cbiAqIFRoZSBmcmFnbWVudHMgYXJlIGFwcGxpZWQgdG8gdGhlIG9uZSBwcm92aWRlZCBpbiB0aGUgYHJlbGF0aXZlVG9gIHBhcmFtZXRlci5cbiAqIEBwYXJhbSBxdWVyeVBhcmFtcyBUaGUgcXVlcnkgcGFyYW1ldGVycyBmb3IgdGhlIGBVcmxUcmVlYC4gYG51bGxgIGlmIHRoZSBgVXJsVHJlZWAgZG9lcyBub3QgaGF2ZVxuICogICAgIGFueSBxdWVyeSBwYXJhbWV0ZXJzLlxuICogQHBhcmFtIGZyYWdtZW50IFRoZSBmcmFnbWVudCBmb3IgdGhlIGBVcmxUcmVlYC4gYG51bGxgIGlmIHRoZSBgVXJsVHJlZWAgZG9lcyBub3QgaGF2ZSBhIGZyYWdtZW50LlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogYGBgXG4gKiAvLyBjcmVhdGUgL3RlYW0vMzMvdXNlci8xMVxuICogY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChzbmFwc2hvdCwgWycvdGVhbScsIDMzLCAndXNlcicsIDExXSk7XG4gKlxuICogLy8gY3JlYXRlIC90ZWFtLzMzO2V4cGFuZD10cnVlL3VzZXIvMTFcbiAqIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qoc25hcHNob3QsIFsnL3RlYW0nLCAzMywge2V4cGFuZDogdHJ1ZX0sICd1c2VyJywgMTFdKTtcbiAqXG4gKiAvLyB5b3UgY2FuIGNvbGxhcHNlIHN0YXRpYyBzZWdtZW50cyBsaWtlIHRoaXMgKHRoaXMgd29ya3Mgb25seSB3aXRoIHRoZSBmaXJzdCBwYXNzZWQtaW4gdmFsdWUpOlxuICogY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChzbmFwc2hvdCwgWycvdGVhbS8zMy91c2VyJywgdXNlcklkXSk7XG4gKlxuICogLy8gSWYgdGhlIGZpcnN0IHNlZ21lbnQgY2FuIGNvbnRhaW4gc2xhc2hlcywgYW5kIHlvdSBkbyBub3Qgd2FudCB0aGUgcm91dGVyIHRvIHNwbGl0IGl0LFxuICogLy8geW91IGNhbiBkbyB0aGUgZm9sbG93aW5nOlxuICogY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChzbmFwc2hvdCwgW3tzZWdtZW50UGF0aDogJy9vbmUvdHdvJ31dKTtcbiAqXG4gKiAvLyBjcmVhdGUgL3RlYW0vMzMvKHVzZXIvMTEvL3JpZ2h0OmNoYXQpXG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDpcbiAqICdjaGF0J319XSwgbnVsbCwgbnVsbCk7XG4gKlxuICogLy8gcmVtb3ZlIHRoZSByaWdodCBzZWNvbmRhcnkgbm9kZVxuICogY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChzbmFwc2hvdCwgWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6IG51bGx9fV0pO1xuICpcbiAqIC8vIEZvciB0aGUgZXhhbXBsZXMgYmVsb3csIGFzc3VtZSB0aGUgY3VycmVudCBVUkwgaXMgZm9yIHRoZSBgL3RlYW0vMzMvdXNlci8xMWAgYW5kIHRoZVxuICogYEFjdGl2YXRlZFJvdXRlU25hcHNob3RgIHBvaW50cyB0byBgdXNlci8xMWA6XG4gKlxuICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8xMS9kZXRhaWxzXG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJ2RldGFpbHMnXSk7XG4gKlxuICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vMzMvdXNlci8yMlxuICogY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChzbmFwc2hvdCwgWycuLi8yMiddKTtcbiAqXG4gKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS80NC91c2VyLzIyXG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJy4uLy4uL3RlYW0vNDQvdXNlci8yMiddKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChcbiAgICByZWxhdGl2ZVRvOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90LCBjb21tYW5kczogYW55W10sIHF1ZXJ5UGFyYW1zOiBQYXJhbXN8bnVsbCA9IG51bGwsXG4gICAgZnJhZ21lbnQ6IHN0cmluZ3xudWxsID0gbnVsbCk6IFVybFRyZWUge1xuICBjb25zdCByZWxhdGl2ZVRvVXJsU2VnbWVudEdyb3VwID0gY3JlYXRlU2VnbWVudEdyb3VwRnJvbVJvdXRlKHJlbGF0aXZlVG8pO1xuICByZXR1cm4gY3JlYXRlVXJsVHJlZUZyb21TZWdtZW50R3JvdXAocmVsYXRpdmVUb1VybFNlZ21lbnRHcm91cCwgY29tbWFuZHMsIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTZWdtZW50R3JvdXBGcm9tUm91dGUocm91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOiBVcmxTZWdtZW50R3JvdXAge1xuICBsZXQgdGFyZ2V0R3JvdXA6IFVybFNlZ21lbnRHcm91cHx1bmRlZmluZWQ7XG5cbiAgZnVuY3Rpb24gY3JlYXRlU2VnbWVudEdyb3VwRnJvbVJvdXRlUmVjdXJzaXZlKGN1cnJlbnRSb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6XG4gICAgICBVcmxTZWdtZW50R3JvdXAge1xuICAgIGNvbnN0IGNoaWxkT3V0bGV0czoge1tvdXRsZXQ6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0gPSB7fTtcbiAgICBmb3IgKGNvbnN0IGNoaWxkU25hcHNob3Qgb2YgY3VycmVudFJvdXRlLmNoaWxkcmVuKSB7XG4gICAgICBjb25zdCByb290ID0gY3JlYXRlU2VnbWVudEdyb3VwRnJvbVJvdXRlUmVjdXJzaXZlKGNoaWxkU25hcHNob3QpO1xuICAgICAgY2hpbGRPdXRsZXRzW2NoaWxkU25hcHNob3Qub3V0bGV0XSA9IHJvb3Q7XG4gICAgfVxuICAgIGNvbnN0IHNlZ21lbnRHcm91cCA9IG5ldyBVcmxTZWdtZW50R3JvdXAoY3VycmVudFJvdXRlLnVybCwgY2hpbGRPdXRsZXRzKTtcbiAgICBpZiAoY3VycmVudFJvdXRlID09PSByb3V0ZSkge1xuICAgICAgdGFyZ2V0R3JvdXAgPSBzZWdtZW50R3JvdXA7XG4gICAgfVxuICAgIHJldHVybiBzZWdtZW50R3JvdXA7XG4gIH1cbiAgY29uc3Qgcm9vdENhbmRpZGF0ZSA9IGNyZWF0ZVNlZ21lbnRHcm91cEZyb21Sb3V0ZVJlY3Vyc2l2ZShyb3V0ZS5yb290KTtcbiAgY29uc3Qgcm9vdFNlZ21lbnRHcm91cCA9IGNyZWF0ZVJvb3Qocm9vdENhbmRpZGF0ZSk7XG5cbiAgcmV0dXJuIHRhcmdldEdyb3VwID8/IHJvb3RTZWdtZW50R3JvdXA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVVcmxUcmVlRnJvbVNlZ21lbnRHcm91cChcbiAgICByZWxhdGl2ZVRvOiBVcmxTZWdtZW50R3JvdXAsIGNvbW1hbmRzOiBhbnlbXSwgcXVlcnlQYXJhbXM6IFBhcmFtc3xudWxsLFxuICAgIGZyYWdtZW50OiBzdHJpbmd8bnVsbCk6IFVybFRyZWUge1xuICBsZXQgcm9vdCA9IHJlbGF0aXZlVG87XG4gIHdoaWxlIChyb290LnBhcmVudCkge1xuICAgIHJvb3QgPSByb290LnBhcmVudDtcbiAgfVxuICAvLyBUaGVyZSBhcmUgbm8gY29tbWFuZHMgc28gdGhlIGBVcmxUcmVlYCBnb2VzIHRvIHRoZSBzYW1lIHBhdGggYXMgdGhlIG9uZSBjcmVhdGVkIGZyb20gdGhlXG4gIC8vIGBVcmxTZWdtZW50R3JvdXBgLiBBbGwgd2UgbmVlZCB0byBkbyBpcyB1cGRhdGUgdGhlIGBxdWVyeVBhcmFtc2AgYW5kIGBmcmFnbWVudGAgd2l0aG91dFxuICAvLyBhcHBseWluZyBhbnkgb3RoZXIgbG9naWMuXG4gIGlmIChjb21tYW5kcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJlZShyb290LCByb290LCByb290LCBxdWVyeVBhcmFtcywgZnJhZ21lbnQpO1xuICB9XG5cbiAgY29uc3QgbmF2ID0gY29tcHV0ZU5hdmlnYXRpb24oY29tbWFuZHMpO1xuXG4gIGlmIChuYXYudG9Sb290KCkpIHtcbiAgICByZXR1cm4gdHJlZShyb290LCByb290LCBuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCB7fSksIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCk7XG4gIH1cblxuICBjb25zdCBwb3NpdGlvbiA9IGZpbmRTdGFydGluZ1Bvc2l0aW9uRm9yVGFyZ2V0R3JvdXAobmF2LCByb290LCByZWxhdGl2ZVRvKTtcbiAgY29uc3QgbmV3U2VnbWVudEdyb3VwID0gcG9zaXRpb24ucHJvY2Vzc0NoaWxkcmVuID9cbiAgICAgIHVwZGF0ZVNlZ21lbnRHcm91cENoaWxkcmVuKHBvc2l0aW9uLnNlZ21lbnRHcm91cCwgcG9zaXRpb24uaW5kZXgsIG5hdi5jb21tYW5kcykgOlxuICAgICAgdXBkYXRlU2VnbWVudEdyb3VwKHBvc2l0aW9uLnNlZ21lbnRHcm91cCwgcG9zaXRpb24uaW5kZXgsIG5hdi5jb21tYW5kcyk7XG4gIHJldHVybiB0cmVlKHJvb3QsIHBvc2l0aW9uLnNlZ21lbnRHcm91cCwgbmV3U2VnbWVudEdyb3VwLCBxdWVyeVBhcmFtcywgZnJhZ21lbnQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVXJsVHJlZShcbiAgICByb3V0ZTogQWN0aXZhdGVkUm91dGUsIHVybFRyZWU6IFVybFRyZWUsIGNvbW1hbmRzOiBhbnlbXSwgcXVlcnlQYXJhbXM6IFBhcmFtc3xudWxsLFxuICAgIGZyYWdtZW50OiBzdHJpbmd8bnVsbCk6IFVybFRyZWUge1xuICBpZiAoY29tbWFuZHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHRyZWUodXJsVHJlZS5yb290LCB1cmxUcmVlLnJvb3QsIHVybFRyZWUucm9vdCwgcXVlcnlQYXJhbXMsIGZyYWdtZW50KTtcbiAgfVxuXG4gIGNvbnN0IG5hdiA9IGNvbXB1dGVOYXZpZ2F0aW9uKGNvbW1hbmRzKTtcblxuICBpZiAobmF2LnRvUm9vdCgpKSB7XG4gICAgcmV0dXJuIHRyZWUodXJsVHJlZS5yb290LCB1cmxUcmVlLnJvb3QsIG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KSwgcXVlcnlQYXJhbXMsIGZyYWdtZW50KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVRyZWVVc2luZ1BhdGhJbmRleChsYXN0UGF0aEluZGV4OiBudW1iZXIpIHtcbiAgICBjb25zdCBzdGFydGluZ1Bvc2l0aW9uID1cbiAgICAgICAgZmluZFN0YXJ0aW5nUG9zaXRpb24obmF2LCB1cmxUcmVlLCByb3V0ZS5zbmFwc2hvdD8uX3VybFNlZ21lbnQsIGxhc3RQYXRoSW5kZXgpO1xuXG4gICAgY29uc3Qgc2VnbWVudEdyb3VwID0gc3RhcnRpbmdQb3NpdGlvbi5wcm9jZXNzQ2hpbGRyZW4gP1xuICAgICAgICB1cGRhdGVTZWdtZW50R3JvdXBDaGlsZHJlbihcbiAgICAgICAgICAgIHN0YXJ0aW5nUG9zaXRpb24uc2VnbWVudEdyb3VwLCBzdGFydGluZ1Bvc2l0aW9uLmluZGV4LCBuYXYuY29tbWFuZHMpIDpcbiAgICAgICAgdXBkYXRlU2VnbWVudEdyb3VwKHN0YXJ0aW5nUG9zaXRpb24uc2VnbWVudEdyb3VwLCBzdGFydGluZ1Bvc2l0aW9uLmluZGV4LCBuYXYuY29tbWFuZHMpO1xuICAgIHJldHVybiB0cmVlKHVybFRyZWUucm9vdCwgc3RhcnRpbmdQb3NpdGlvbi5zZWdtZW50R3JvdXAsIHNlZ21lbnRHcm91cCwgcXVlcnlQYXJhbXMsIGZyYWdtZW50KTtcbiAgfVxuICAvLyBOb3RlOiBUaGUgdHlwZXMgc2hvdWxkIGRpc2FsbG93IGBzbmFwc2hvdGAgZnJvbSBiZWluZyBgdW5kZWZpbmVkYCBidXQgZHVlIHRvIHRlc3QgbW9ja3MsIHRoaXNcbiAgLy8gbWF5IGJlIHRoZSBjYXNlLiBTaW5jZSB3ZSB0cnkgdG8gYWNjZXNzIGl0IGF0IGFuIGVhcmxpZXIgcG9pbnQgYmVmb3JlIHRoZSByZWZhY3RvciB0byBhZGQgdGhlXG4gIC8vIHdhcm5pbmcgZm9yIGByZWxhdGl2ZUxpbmtSZXNvbHV0aW9uOiAnbGVnYWN5J2AsIHRoaXMgbWF5IGNhdXNlIGZhaWx1cmVzIGluIHRlc3RzIHdoZXJlIGl0XG4gIC8vIGRpZG4ndCBiZWZvcmUuXG4gIGNvbnN0IHJlc3VsdCA9IGNyZWF0ZVRyZWVVc2luZ1BhdGhJbmRleChyb3V0ZS5zbmFwc2hvdD8uX2xhc3RQYXRoSW5kZXgpO1xuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGlzTWF0cml4UGFyYW1zKGNvbW1hbmQ6IGFueSk6IGJvb2xlYW4ge1xuICByZXR1cm4gdHlwZW9mIGNvbW1hbmQgPT09ICdvYmplY3QnICYmIGNvbW1hbmQgIT0gbnVsbCAmJiAhY29tbWFuZC5vdXRsZXRzICYmICFjb21tYW5kLnNlZ21lbnRQYXRoO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgYSBnaXZlbiBjb21tYW5kIGhhcyBhbiBgb3V0bGV0c2AgbWFwLiBXaGVuIHdlIGVuY291bnRlciBhIGNvbW1hbmRcbiAqIHdpdGggYW4gb3V0bGV0cyBrL3YgbWFwLCB3ZSBuZWVkIHRvIGFwcGx5IGVhY2ggb3V0bGV0IGluZGl2aWR1YWxseSB0byB0aGUgZXhpc3Rpbmcgc2VnbWVudC5cbiAqL1xuZnVuY3Rpb24gaXNDb21tYW5kV2l0aE91dGxldHMoY29tbWFuZDogYW55KTogY29tbWFuZCBpcyB7b3V0bGV0czoge1trZXk6IHN0cmluZ106IGFueX19IHtcbiAgcmV0dXJuIHR5cGVvZiBjb21tYW5kID09PSAnb2JqZWN0JyAmJiBjb21tYW5kICE9IG51bGwgJiYgY29tbWFuZC5vdXRsZXRzO1xufVxuXG5mdW5jdGlvbiB0cmVlKFxuICAgIG9sZFJvb3Q6IFVybFNlZ21lbnRHcm91cCwgb2xkU2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIG5ld1NlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLFxuICAgIHF1ZXJ5UGFyYW1zOiBQYXJhbXN8bnVsbCwgZnJhZ21lbnQ6IHN0cmluZ3xudWxsKTogVXJsVHJlZSB7XG4gIGxldCBxcDogYW55ID0ge307XG4gIGlmIChxdWVyeVBhcmFtcykge1xuICAgIGZvckVhY2gocXVlcnlQYXJhbXMsICh2YWx1ZTogYW55LCBuYW1lOiBhbnkpID0+IHtcbiAgICAgIHFwW25hbWVdID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZS5tYXAoKHY6IGFueSkgPT4gYCR7dn1gKSA6IGAke3ZhbHVlfWA7XG4gICAgfSk7XG4gIH1cblxuICBsZXQgcm9vdENhbmRpZGF0ZTogVXJsU2VnbWVudEdyb3VwO1xuICBpZiAob2xkUm9vdCA9PT0gb2xkU2VnbWVudEdyb3VwKSB7XG4gICAgcm9vdENhbmRpZGF0ZSA9IG5ld1NlZ21lbnRHcm91cDtcbiAgfSBlbHNlIHtcbiAgICByb290Q2FuZGlkYXRlID0gcmVwbGFjZVNlZ21lbnQob2xkUm9vdCwgb2xkU2VnbWVudEdyb3VwLCBuZXdTZWdtZW50R3JvdXApO1xuICB9XG5cbiAgY29uc3QgbmV3Um9vdCA9IGNyZWF0ZVJvb3Qoc3F1YXNoU2VnbWVudEdyb3VwKHJvb3RDYW5kaWRhdGUpKTtcbiAgcmV0dXJuIG5ldyBVcmxUcmVlKG5ld1Jvb3QsIHFwLCBmcmFnbWVudCk7XG59XG5cbi8qKlxuICogUmVwbGFjZXMgdGhlIGBvbGRTZWdtZW50YCB3aGljaCBpcyBsb2NhdGVkIGluIHNvbWUgY2hpbGQgb2YgdGhlIGBjdXJyZW50YCB3aXRoIHRoZSBgbmV3U2VnbWVudGAuXG4gKiBUaGlzIGFsc28gaGFzIHRoZSBlZmZlY3Qgb2YgY3JlYXRpbmcgbmV3IGBVcmxTZWdtZW50R3JvdXBgIGNvcGllcyB0byB1cGRhdGUgcmVmZXJlbmNlcy4gVGhpc1xuICogc2hvdWxkbid0IGJlIG5lY2Vzc2FyeSBidXQgdGhlIGZhbGxiYWNrIGxvZ2ljIGZvciBhbiBpbnZhbGlkIEFjdGl2YXRlZFJvdXRlIGluIHRoZSBjcmVhdGlvbiB1c2VzXG4gKiB0aGUgUm91dGVyJ3MgY3VycmVudCB1cmwgdHJlZS4gSWYgd2UgZG9uJ3QgY3JlYXRlIG5ldyBzZWdtZW50IGdyb3Vwcywgd2UgZW5kIHVwIG1vZGlmeWluZyB0aGF0XG4gKiB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gcmVwbGFjZVNlZ21lbnQoXG4gICAgY3VycmVudDogVXJsU2VnbWVudEdyb3VwLCBvbGRTZWdtZW50OiBVcmxTZWdtZW50R3JvdXAsXG4gICAgbmV3U2VnbWVudDogVXJsU2VnbWVudEdyb3VwKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgY29uc3QgY2hpbGRyZW46IHtba2V5OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gIGZvckVhY2goY3VycmVudC5jaGlsZHJlbiwgKGM6IFVybFNlZ21lbnRHcm91cCwgb3V0bGV0TmFtZTogc3RyaW5nKSA9PiB7XG4gICAgaWYgKGMgPT09IG9sZFNlZ21lbnQpIHtcbiAgICAgIGNoaWxkcmVuW291dGxldE5hbWVdID0gbmV3U2VnbWVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hpbGRyZW5bb3V0bGV0TmFtZV0gPSByZXBsYWNlU2VnbWVudChjLCBvbGRTZWdtZW50LCBuZXdTZWdtZW50KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChjdXJyZW50LnNlZ21lbnRzLCBjaGlsZHJlbik7XG59XG5cbmNsYXNzIE5hdmlnYXRpb24ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHB1YmxpYyBpc0Fic29sdXRlOiBib29sZWFuLCBwdWJsaWMgbnVtYmVyT2ZEb3VibGVEb3RzOiBudW1iZXIsIHB1YmxpYyBjb21tYW5kczogYW55W10pIHtcbiAgICBpZiAoaXNBYnNvbHV0ZSAmJiBjb21tYW5kcy5sZW5ndGggPiAwICYmIGlzTWF0cml4UGFyYW1zKGNvbW1hbmRzWzBdKSkge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLlJPT1RfU0VHTUVOVF9NQVRSSVhfUEFSQU1TLFxuICAgICAgICAgIE5HX0RFVl9NT0RFICYmICdSb290IHNlZ21lbnQgY2Fubm90IGhhdmUgbWF0cml4IHBhcmFtZXRlcnMnKTtcbiAgICB9XG5cbiAgICBjb25zdCBjbWRXaXRoT3V0bGV0ID0gY29tbWFuZHMuZmluZChpc0NvbW1hbmRXaXRoT3V0bGV0cyk7XG4gICAgaWYgKGNtZFdpdGhPdXRsZXQgJiYgY21kV2l0aE91dGxldCAhPT0gbGFzdChjb21tYW5kcykpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5NSVNQTEFDRURfT1VUTEVUU19DT01NQU5ELFxuICAgICAgICAgIE5HX0RFVl9NT0RFICYmICd7b3V0bGV0czp7fX0gaGFzIHRvIGJlIHRoZSBsYXN0IGNvbW1hbmQnKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgdG9Sb290KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlzQWJzb2x1dGUgJiYgdGhpcy5jb21tYW5kcy5sZW5ndGggPT09IDEgJiYgdGhpcy5jb21tYW5kc1swXSA9PSAnLyc7XG4gIH1cbn1cblxuLyoqIFRyYW5zZm9ybXMgY29tbWFuZHMgdG8gYSBub3JtYWxpemVkIGBOYXZpZ2F0aW9uYCAqL1xuZnVuY3Rpb24gY29tcHV0ZU5hdmlnYXRpb24oY29tbWFuZHM6IGFueVtdKTogTmF2aWdhdGlvbiB7XG4gIGlmICgodHlwZW9mIGNvbW1hbmRzWzBdID09PSAnc3RyaW5nJykgJiYgY29tbWFuZHMubGVuZ3RoID09PSAxICYmIGNvbW1hbmRzWzBdID09PSAnLycpIHtcbiAgICByZXR1cm4gbmV3IE5hdmlnYXRpb24odHJ1ZSwgMCwgY29tbWFuZHMpO1xuICB9XG5cbiAgbGV0IG51bWJlck9mRG91YmxlRG90cyA9IDA7XG4gIGxldCBpc0Fic29sdXRlID0gZmFsc2U7XG5cbiAgY29uc3QgcmVzOiBhbnlbXSA9IGNvbW1hbmRzLnJlZHVjZSgocmVzLCBjbWQsIGNtZElkeCkgPT4ge1xuICAgIGlmICh0eXBlb2YgY21kID09PSAnb2JqZWN0JyAmJiBjbWQgIT0gbnVsbCkge1xuICAgICAgaWYgKGNtZC5vdXRsZXRzKSB7XG4gICAgICAgIGNvbnN0IG91dGxldHM6IHtbazogc3RyaW5nXTogYW55fSA9IHt9O1xuICAgICAgICBmb3JFYWNoKGNtZC5vdXRsZXRzLCAoY29tbWFuZHM6IGFueSwgbmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgb3V0bGV0c1tuYW1lXSA9IHR5cGVvZiBjb21tYW5kcyA9PT0gJ3N0cmluZycgPyBjb21tYW5kcy5zcGxpdCgnLycpIDogY29tbWFuZHM7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gWy4uLnJlcywge291dGxldHN9XTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNtZC5zZWdtZW50UGF0aCkge1xuICAgICAgICByZXR1cm4gWy4uLnJlcywgY21kLnNlZ21lbnRQYXRoXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoISh0eXBlb2YgY21kID09PSAnc3RyaW5nJykpIHtcbiAgICAgIHJldHVybiBbLi4ucmVzLCBjbWRdO1xuICAgIH1cblxuICAgIGlmIChjbWRJZHggPT09IDApIHtcbiAgICAgIGNtZC5zcGxpdCgnLycpLmZvckVhY2goKHVybFBhcnQsIHBhcnRJbmRleCkgPT4ge1xuICAgICAgICBpZiAocGFydEluZGV4ID09IDAgJiYgdXJsUGFydCA9PT0gJy4nKSB7XG4gICAgICAgICAgLy8gc2tpcCAnLi9hJ1xuICAgICAgICB9IGVsc2UgaWYgKHBhcnRJbmRleCA9PSAwICYmIHVybFBhcnQgPT09ICcnKSB7ICAvLyAgJy9hJ1xuICAgICAgICAgIGlzQWJzb2x1dGUgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHVybFBhcnQgPT09ICcuLicpIHsgIC8vICAnLi4vYSdcbiAgICAgICAgICBudW1iZXJPZkRvdWJsZURvdHMrKztcbiAgICAgICAgfSBlbHNlIGlmICh1cmxQYXJ0ICE9ICcnKSB7XG4gICAgICAgICAgcmVzLnB1c2godXJsUGFydCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIHJldHVybiBbLi4ucmVzLCBjbWRdO1xuICB9LCBbXSk7XG5cbiAgcmV0dXJuIG5ldyBOYXZpZ2F0aW9uKGlzQWJzb2x1dGUsIG51bWJlck9mRG91YmxlRG90cywgcmVzKTtcbn1cblxuY2xhc3MgUG9zaXRpb24ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHB1YmxpYyBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcHVibGljIHByb2Nlc3NDaGlsZHJlbjogYm9vbGVhbiwgcHVibGljIGluZGV4OiBudW1iZXIpIHtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kU3RhcnRpbmdQb3NpdGlvbkZvclRhcmdldEdyb3VwKFxuICAgIG5hdjogTmF2aWdhdGlvbiwgcm9vdDogVXJsU2VnbWVudEdyb3VwLCB0YXJnZXQ6IFVybFNlZ21lbnRHcm91cCk6IFBvc2l0aW9uIHtcbiAgaWYgKG5hdi5pc0Fic29sdXRlKSB7XG4gICAgcmV0dXJuIG5ldyBQb3NpdGlvbihyb290LCB0cnVlLCAwKTtcbiAgfVxuXG4gIGlmICghdGFyZ2V0KSB7XG4gICAgLy8gYE5hTmAgaXMgdXNlZCBvbmx5IHRvIG1haW50YWluIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IHdpdGggaW5jb3JyZWN0bHkgbW9ja2VkXG4gICAgLy8gYEFjdGl2YXRlZFJvdXRlU25hcHNob3RgIGluIHRlc3RzLiBJbiBwcmlvciB2ZXJzaW9ucyBvZiB0aGlzIGNvZGUsIHRoZSBwb3NpdGlvbiBoZXJlIHdhc1xuICAgIC8vIGRldGVybWluZWQgYmFzZWQgb24gYW4gaW50ZXJuYWwgcHJvcGVydHkgdGhhdCB3YXMgcmFyZWx5IG1vY2tlZCwgcmVzdWx0aW5nIGluIGBOYU5gLiBJblxuICAgIC8vIHJlYWxpdHksIHRoaXMgY29kZSBwYXRoIHNob3VsZCBfbmV2ZXJfIGJlIHRvdWNoZWQgc2luY2UgYHRhcmdldGAgaXMgbm90IGFsbG93ZWQgdG8gYmUgZmFsc2V5LlxuICAgIHJldHVybiBuZXcgUG9zaXRpb24ocm9vdCwgZmFsc2UsIE5hTik7XG4gIH1cbiAgaWYgKHRhcmdldC5wYXJlbnQgPT09IG51bGwpIHtcbiAgICByZXR1cm4gbmV3IFBvc2l0aW9uKHRhcmdldCwgdHJ1ZSwgMCk7XG4gIH1cblxuICBjb25zdCBtb2RpZmllciA9IGlzTWF0cml4UGFyYW1zKG5hdi5jb21tYW5kc1swXSkgPyAwIDogMTtcbiAgY29uc3QgaW5kZXggPSB0YXJnZXQuc2VnbWVudHMubGVuZ3RoIC0gMSArIG1vZGlmaWVyO1xuICByZXR1cm4gY3JlYXRlUG9zaXRpb25BcHBseWluZ0RvdWJsZURvdHModGFyZ2V0LCBpbmRleCwgbmF2Lm51bWJlck9mRG91YmxlRG90cyk7XG59XG5cbmZ1bmN0aW9uIGZpbmRTdGFydGluZ1Bvc2l0aW9uKFxuICAgIG5hdjogTmF2aWdhdGlvbiwgdHJlZTogVXJsVHJlZSwgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsXG4gICAgbGFzdFBhdGhJbmRleDogbnVtYmVyKTogUG9zaXRpb24ge1xuICBpZiAobmF2LmlzQWJzb2x1dGUpIHtcbiAgICByZXR1cm4gbmV3IFBvc2l0aW9uKHRyZWUucm9vdCwgdHJ1ZSwgMCk7XG4gIH1cblxuICBpZiAobGFzdFBhdGhJbmRleCA9PT0gLTEpIHtcbiAgICAvLyBQYXRobGVzcyBBY3RpdmF0ZWRSb3V0ZSBoYXMgX2xhc3RQYXRoSW5kZXggPT09IC0xIGJ1dCBzaG91bGQgbm90IHByb2Nlc3MgY2hpbGRyZW5cbiAgICAvLyBzZWUgaXNzdWUgIzI2MjI0LCAjMTMwMTEsICMzNTY4N1xuICAgIC8vIEhvd2V2ZXIsIGlmIHRoZSBBY3RpdmF0ZWRSb3V0ZSBpcyB0aGUgcm9vdCB3ZSBzaG91bGQgcHJvY2VzcyBjaGlsZHJlbiBsaWtlIGFib3ZlLlxuICAgIGNvbnN0IHByb2Nlc3NDaGlsZHJlbiA9IHNlZ21lbnRHcm91cCA9PT0gdHJlZS5yb290O1xuICAgIHJldHVybiBuZXcgUG9zaXRpb24oc2VnbWVudEdyb3VwLCBwcm9jZXNzQ2hpbGRyZW4sIDApO1xuICB9XG5cbiAgY29uc3QgbW9kaWZpZXIgPSBpc01hdHJpeFBhcmFtcyhuYXYuY29tbWFuZHNbMF0pID8gMCA6IDE7XG4gIGNvbnN0IGluZGV4ID0gbGFzdFBhdGhJbmRleCArIG1vZGlmaWVyO1xuICByZXR1cm4gY3JlYXRlUG9zaXRpb25BcHBseWluZ0RvdWJsZURvdHMoc2VnbWVudEdyb3VwLCBpbmRleCwgbmF2Lm51bWJlck9mRG91YmxlRG90cyk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVBvc2l0aW9uQXBwbHlpbmdEb3VibGVEb3RzKFxuICAgIGdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIGluZGV4OiBudW1iZXIsIG51bWJlck9mRG91YmxlRG90czogbnVtYmVyKTogUG9zaXRpb24ge1xuICBsZXQgZyA9IGdyb3VwO1xuICBsZXQgY2kgPSBpbmRleDtcbiAgbGV0IGRkID0gbnVtYmVyT2ZEb3VibGVEb3RzO1xuICB3aGlsZSAoZGQgPiBjaSkge1xuICAgIGRkIC09IGNpO1xuICAgIGcgPSBnLnBhcmVudCE7XG4gICAgaWYgKCFnKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ET1VCTEVfRE9UUywgTkdfREVWX01PREUgJiYgJ0ludmFsaWQgbnVtYmVyIG9mIFxcJy4uL1xcJycpO1xuICAgIH1cbiAgICBjaSA9IGcuc2VnbWVudHMubGVuZ3RoO1xuICB9XG4gIHJldHVybiBuZXcgUG9zaXRpb24oZywgZmFsc2UsIGNpIC0gZGQpO1xufVxuXG5mdW5jdGlvbiBnZXRPdXRsZXRzKGNvbW1hbmRzOiB1bmtub3duW10pOiB7W2s6IHN0cmluZ106IHVua25vd25bXXxzdHJpbmd9IHtcbiAgaWYgKGlzQ29tbWFuZFdpdGhPdXRsZXRzKGNvbW1hbmRzWzBdKSkge1xuICAgIHJldHVybiBjb21tYW5kc1swXS5vdXRsZXRzO1xuICB9XG5cbiAgcmV0dXJuIHtbUFJJTUFSWV9PVVRMRVRdOiBjb21tYW5kc307XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVNlZ21lbnRHcm91cChcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc3RhcnRJbmRleDogbnVtYmVyLCBjb21tYW5kczogYW55W10pOiBVcmxTZWdtZW50R3JvdXAge1xuICBpZiAoIXNlZ21lbnRHcm91cCkge1xuICAgIHNlZ21lbnRHcm91cCA9IG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KTtcbiAgfVxuICBpZiAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiBzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgIHJldHVybiB1cGRhdGVTZWdtZW50R3JvdXBDaGlsZHJlbihzZWdtZW50R3JvdXAsIHN0YXJ0SW5kZXgsIGNvbW1hbmRzKTtcbiAgfVxuXG4gIGNvbnN0IG0gPSBwcmVmaXhlZFdpdGgoc2VnbWVudEdyb3VwLCBzdGFydEluZGV4LCBjb21tYW5kcyk7XG4gIGNvbnN0IHNsaWNlZENvbW1hbmRzID0gY29tbWFuZHMuc2xpY2UobS5jb21tYW5kSW5kZXgpO1xuICBpZiAobS5tYXRjaCAmJiBtLnBhdGhJbmRleCA8IHNlZ21lbnRHcm91cC5zZWdtZW50cy5sZW5ndGgpIHtcbiAgICBjb25zdCBnID0gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuc2VnbWVudHMuc2xpY2UoMCwgbS5wYXRoSW5kZXgpLCB7fSk7XG4gICAgZy5jaGlsZHJlbltQUklNQVJZX09VVExFVF0gPVxuICAgICAgICBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cC5zZWdtZW50cy5zbGljZShtLnBhdGhJbmRleCksIHNlZ21lbnRHcm91cC5jaGlsZHJlbik7XG4gICAgcmV0dXJuIHVwZGF0ZVNlZ21lbnRHcm91cENoaWxkcmVuKGcsIDAsIHNsaWNlZENvbW1hbmRzKTtcbiAgfSBlbHNlIGlmIChtLm1hdGNoICYmIHNsaWNlZENvbW1hbmRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cC5zZWdtZW50cywge30pO1xuICB9IGVsc2UgaWYgKG0ubWF0Y2ggJiYgIXNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpKSB7XG4gICAgcmV0dXJuIGNyZWF0ZU5ld1NlZ21lbnRHcm91cChzZWdtZW50R3JvdXAsIHN0YXJ0SW5kZXgsIGNvbW1hbmRzKTtcbiAgfSBlbHNlIGlmIChtLm1hdGNoKSB7XG4gICAgcmV0dXJuIHVwZGF0ZVNlZ21lbnRHcm91cENoaWxkcmVuKHNlZ21lbnRHcm91cCwgMCwgc2xpY2VkQ29tbWFuZHMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBjcmVhdGVOZXdTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLCBzdGFydEluZGV4LCBjb21tYW5kcyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlU2VnbWVudEdyb3VwQ2hpbGRyZW4oXG4gICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHN0YXJ0SW5kZXg6IG51bWJlciwgY29tbWFuZHM6IGFueVtdKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgaWYgKGNvbW1hbmRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cC5zZWdtZW50cywge30pO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IG91dGxldHMgPSBnZXRPdXRsZXRzKGNvbW1hbmRzKTtcbiAgICBjb25zdCBjaGlsZHJlbjoge1trZXk6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0gPSB7fTtcbiAgICAvLyBJZiB0aGUgc2V0IG9mIGNvbW1hbmRzIGRvZXMgbm90IGFwcGx5IGFueXRoaW5nIHRvIHRoZSBwcmltYXJ5IG91dGxldCBhbmQgdGhlIGNoaWxkIHNlZ21lbnQgaXNcbiAgICAvLyBhbiBlbXB0eSBwYXRoIHByaW1hcnkgc2VnbWVudCBvbiBpdHMgb3duLCB3ZSB3YW50IHRvIGFwcGx5IHRoZSBjb21tYW5kcyB0byB0aGUgZW1wdHkgY2hpbGRcbiAgICAvLyBwYXRoIHJhdGhlciB0aGFuIGhlcmUuIFRoZSBvdXRjb21lIGlzIHRoYXQgdGhlIGVtcHR5IHByaW1hcnkgY2hpbGQgaXMgZWZmZWN0aXZlbHkgcmVtb3ZlZFxuICAgIC8vIGZyb20gdGhlIGZpbmFsIG91dHB1dCBVcmxUcmVlLiBJbWFnaW5lIHRoZSBmb2xsb3dpbmcgY29uZmlnOlxuICAgIC8vXG4gICAgLy8ge3BhdGg6ICcnLCBjaGlsZHJlbjogW3twYXRoOiAnKionLCBvdXRsZXQ6ICdwb3B1cCd9XX0uXG4gICAgLy9cbiAgICAvLyBOYXZpZ2F0aW9uIHRvIC8ocG9wdXA6YSkgd2lsbCBhY3RpdmF0ZSB0aGUgY2hpbGQgb3V0bGV0IGNvcnJlY3RseSBHaXZlbiBhIGZvbGxvdy11cFxuICAgIC8vIG5hdmlnYXRpb24gd2l0aCBjb21tYW5kc1xuICAgIC8vIFsnLycsIHtvdXRsZXRzOiB7J3BvcHVwJzogJ2InfX1dLCB3ZSBfd291bGQgbm90XyB3YW50IHRvIGFwcGx5IHRoZSBvdXRsZXQgY29tbWFuZHMgdG8gdGhlXG4gICAgLy8gcm9vdCBzZWdtZW50IGJlY2F1c2UgdGhhdCB3b3VsZCByZXN1bHQgaW5cbiAgICAvLyAvLyhwb3B1cDphKShwb3B1cDpiKSBzaW5jZSB0aGUgb3V0bGV0IGNvbW1hbmQgZ290IGFwcGxpZWQgb25lIGxldmVsIGFib3ZlIHdoZXJlIGl0IGFwcGVhcnMgaW5cbiAgICAvLyB0aGUgYEFjdGl2YXRlZFJvdXRlYCByYXRoZXIgdGhhbiB1cGRhdGluZyB0aGUgZXhpc3Rpbmcgb25lLlxuICAgIC8vXG4gICAgLy8gQmVjYXVzZSBlbXB0eSBwYXRocyBkbyBub3QgYXBwZWFyIGluIHRoZSBVUkwgc2VnbWVudHMgYW5kIHRoZSBmYWN0IHRoYXQgdGhlIHNlZ21lbnRzIHVzZWQgaW5cbiAgICAvLyB0aGUgb3V0cHV0IGBVcmxUcmVlYCBhcmUgc3F1YXNoZWQgdG8gZWxpbWluYXRlIHRoZXNlIGVtcHR5IHBhdGhzIHdoZXJlIHBvc3NpYmxlXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9ibG9iLzEzZjEwZGU0MGUyNWM2OTAwY2E1NWJkODNiMzZiZDUzM2RhY2ZhOWUvcGFja2FnZXMvcm91dGVyL3NyYy91cmxfdHJlZS50cyNMNzU1XG4gICAgLy8gaXQgY2FuIGJlIGhhcmQgdG8gZGV0ZXJtaW5lIHdoYXQgaXMgdGhlIHJpZ2h0IHRoaW5nIHRvIGRvIHdoZW4gYXBwbHlpbmcgY29tbWFuZHMgdG8gYVxuICAgIC8vIGBVcmxTZWdtZW50R3JvdXBgIHRoYXQgaXMgY3JlYXRlZCBmcm9tIGFuIFwidW5zcXVhc2hlZFwiL2V4cGFuZGVkIGBBY3RpdmF0ZWRSb3V0ZWAgdHJlZS5cbiAgICAvLyBUaGlzIGNvZGUgZWZmZWN0aXZlbHkgXCJzcXVhc2hlc1wiIGVtcHR5IHBhdGggcHJpbWFyeSByb3V0ZXMgd2hlbiB0aGV5IGhhdmUgbm8gc2libGluZ3Mgb25cbiAgICAvLyB0aGUgc2FtZSBsZXZlbCBvZiB0aGUgdHJlZS5cbiAgICBpZiAoIW91dGxldHNbUFJJTUFSWV9PVVRMRVRdICYmIHNlZ21lbnRHcm91cC5jaGlsZHJlbltQUklNQVJZX09VVExFVF0gJiZcbiAgICAgICAgc2VnbWVudEdyb3VwLm51bWJlck9mQ2hpbGRyZW4gPT09IDEgJiZcbiAgICAgICAgc2VnbWVudEdyb3VwLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXS5zZWdtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnN0IGNoaWxkcmVuT2ZFbXB0eUNoaWxkID1cbiAgICAgICAgICB1cGRhdGVTZWdtZW50R3JvdXBDaGlsZHJlbihzZWdtZW50R3JvdXAuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdLCBzdGFydEluZGV4LCBjb21tYW5kcyk7XG4gICAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuc2VnbWVudHMsIGNoaWxkcmVuT2ZFbXB0eUNoaWxkLmNoaWxkcmVuKTtcbiAgICB9XG5cbiAgICBmb3JFYWNoKG91dGxldHMsIChjb21tYW5kcywgb3V0bGV0KSA9PiB7XG4gICAgICBpZiAodHlwZW9mIGNvbW1hbmRzID09PSAnc3RyaW5nJykge1xuICAgICAgICBjb21tYW5kcyA9IFtjb21tYW5kc107XG4gICAgICB9XG4gICAgICBpZiAoY29tbWFuZHMgIT09IG51bGwpIHtcbiAgICAgICAgY2hpbGRyZW5bb3V0bGV0XSA9IHVwZGF0ZVNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuY2hpbGRyZW5bb3V0bGV0XSwgc3RhcnRJbmRleCwgY29tbWFuZHMpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgZm9yRWFjaChzZWdtZW50R3JvdXAuY2hpbGRyZW4sIChjaGlsZDogVXJsU2VnbWVudEdyb3VwLCBjaGlsZE91dGxldDogc3RyaW5nKSA9PiB7XG4gICAgICBpZiAob3V0bGV0c1tjaGlsZE91dGxldF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjaGlsZHJlbltjaGlsZE91dGxldF0gPSBjaGlsZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuc2VnbWVudHMsIGNoaWxkcmVuKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwcmVmaXhlZFdpdGgoc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHN0YXJ0SW5kZXg6IG51bWJlciwgY29tbWFuZHM6IGFueVtdKSB7XG4gIGxldCBjdXJyZW50Q29tbWFuZEluZGV4ID0gMDtcbiAgbGV0IGN1cnJlbnRQYXRoSW5kZXggPSBzdGFydEluZGV4O1xuXG4gIGNvbnN0IG5vTWF0Y2ggPSB7bWF0Y2g6IGZhbHNlLCBwYXRoSW5kZXg6IDAsIGNvbW1hbmRJbmRleDogMH07XG4gIHdoaWxlIChjdXJyZW50UGF0aEluZGV4IDwgc2VnbWVudEdyb3VwLnNlZ21lbnRzLmxlbmd0aCkge1xuICAgIGlmIChjdXJyZW50Q29tbWFuZEluZGV4ID49IGNvbW1hbmRzLmxlbmd0aCkgcmV0dXJuIG5vTWF0Y2g7XG4gICAgY29uc3QgcGF0aCA9IHNlZ21lbnRHcm91cC5zZWdtZW50c1tjdXJyZW50UGF0aEluZGV4XTtcbiAgICBjb25zdCBjb21tYW5kID0gY29tbWFuZHNbY3VycmVudENvbW1hbmRJbmRleF07XG4gICAgLy8gRG8gbm90IHRyeSB0byBjb25zdW1lIGNvbW1hbmQgYXMgcGFydCBvZiB0aGUgcHJlZml4aW5nIGlmIGl0IGhhcyBvdXRsZXRzIGJlY2F1c2UgaXQgY2FuXG4gICAgLy8gY29udGFpbiBvdXRsZXRzIG90aGVyIHRoYW4gdGhlIG9uZSBiZWluZyBwcm9jZXNzZWQuIENvbnN1bWluZyB0aGUgb3V0bGV0cyBjb21tYW5kIHdvdWxkXG4gICAgLy8gcmVzdWx0IGluIG90aGVyIG91dGxldHMgYmVpbmcgaWdub3JlZC5cbiAgICBpZiAoaXNDb21tYW5kV2l0aE91dGxldHMoY29tbWFuZCkpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjb25zdCBjdXJyID0gYCR7Y29tbWFuZH1gO1xuICAgIGNvbnN0IG5leHQgPVxuICAgICAgICBjdXJyZW50Q29tbWFuZEluZGV4IDwgY29tbWFuZHMubGVuZ3RoIC0gMSA/IGNvbW1hbmRzW2N1cnJlbnRDb21tYW5kSW5kZXggKyAxXSA6IG51bGw7XG5cbiAgICBpZiAoY3VycmVudFBhdGhJbmRleCA+IDAgJiYgY3VyciA9PT0gdW5kZWZpbmVkKSBicmVhaztcblxuICAgIGlmIChjdXJyICYmIG5leHQgJiYgKHR5cGVvZiBuZXh0ID09PSAnb2JqZWN0JykgJiYgbmV4dC5vdXRsZXRzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICghY29tcGFyZShjdXJyLCBuZXh0LCBwYXRoKSkgcmV0dXJuIG5vTWF0Y2g7XG4gICAgICBjdXJyZW50Q29tbWFuZEluZGV4ICs9IDI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghY29tcGFyZShjdXJyLCB7fSwgcGF0aCkpIHJldHVybiBub01hdGNoO1xuICAgICAgY3VycmVudENvbW1hbmRJbmRleCsrO1xuICAgIH1cbiAgICBjdXJyZW50UGF0aEluZGV4Kys7XG4gIH1cblxuICByZXR1cm4ge21hdGNoOiB0cnVlLCBwYXRoSW5kZXg6IGN1cnJlbnRQYXRoSW5kZXgsIGNvbW1hbmRJbmRleDogY3VycmVudENvbW1hbmRJbmRleH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU5ld1NlZ21lbnRHcm91cChcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc3RhcnRJbmRleDogbnVtYmVyLCBjb21tYW5kczogYW55W10pOiBVcmxTZWdtZW50R3JvdXAge1xuICBjb25zdCBwYXRocyA9IHNlZ21lbnRHcm91cC5zZWdtZW50cy5zbGljZSgwLCBzdGFydEluZGV4KTtcblxuICBsZXQgaSA9IDA7XG4gIHdoaWxlIChpIDwgY29tbWFuZHMubGVuZ3RoKSB7XG4gICAgY29uc3QgY29tbWFuZCA9IGNvbW1hbmRzW2ldO1xuICAgIGlmIChpc0NvbW1hbmRXaXRoT3V0bGV0cyhjb21tYW5kKSkge1xuICAgICAgY29uc3QgY2hpbGRyZW4gPSBjcmVhdGVOZXdTZWdtZW50Q2hpbGRyZW4oY29tbWFuZC5vdXRsZXRzKTtcbiAgICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHBhdGhzLCBjaGlsZHJlbik7XG4gICAgfVxuXG4gICAgLy8gaWYgd2Ugc3RhcnQgd2l0aCBhbiBvYmplY3QgbGl0ZXJhbCwgd2UgbmVlZCB0byByZXVzZSB0aGUgcGF0aCBwYXJ0IGZyb20gdGhlIHNlZ21lbnRcbiAgICBpZiAoaSA9PT0gMCAmJiBpc01hdHJpeFBhcmFtcyhjb21tYW5kc1swXSkpIHtcbiAgICAgIGNvbnN0IHAgPSBzZWdtZW50R3JvdXAuc2VnbWVudHNbc3RhcnRJbmRleF07XG4gICAgICBwYXRocy5wdXNoKG5ldyBVcmxTZWdtZW50KHAucGF0aCwgc3RyaW5naWZ5KGNvbW1hbmRzWzBdKSkpO1xuICAgICAgaSsrO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgY3VyciA9IGlzQ29tbWFuZFdpdGhPdXRsZXRzKGNvbW1hbmQpID8gY29tbWFuZC5vdXRsZXRzW1BSSU1BUllfT1VUTEVUXSA6IGAke2NvbW1hbmR9YDtcbiAgICBjb25zdCBuZXh0ID0gKGkgPCBjb21tYW5kcy5sZW5ndGggLSAxKSA/IGNvbW1hbmRzW2kgKyAxXSA6IG51bGw7XG4gICAgaWYgKGN1cnIgJiYgbmV4dCAmJiBpc01hdHJpeFBhcmFtcyhuZXh0KSkge1xuICAgICAgcGF0aHMucHVzaChuZXcgVXJsU2VnbWVudChjdXJyLCBzdHJpbmdpZnkobmV4dCkpKTtcbiAgICAgIGkgKz0gMjtcbiAgICB9IGVsc2Uge1xuICAgICAgcGF0aHMucHVzaChuZXcgVXJsU2VnbWVudChjdXJyLCB7fSkpO1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChwYXRocywge30pO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVOZXdTZWdtZW50Q2hpbGRyZW4ob3V0bGV0czoge1tuYW1lOiBzdHJpbmddOiB1bmtub3duW118c3RyaW5nfSk6XG4gICAge1tvdXRsZXQ6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0ge1xuICBjb25zdCBjaGlsZHJlbjoge1tvdXRsZXQ6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0gPSB7fTtcbiAgZm9yRWFjaChvdXRsZXRzLCAoY29tbWFuZHMsIG91dGxldCkgPT4ge1xuICAgIGlmICh0eXBlb2YgY29tbWFuZHMgPT09ICdzdHJpbmcnKSB7XG4gICAgICBjb21tYW5kcyA9IFtjb21tYW5kc107XG4gICAgfVxuICAgIGlmIChjb21tYW5kcyAhPT0gbnVsbCkge1xuICAgICAgY2hpbGRyZW5bb3V0bGV0XSA9IGNyZWF0ZU5ld1NlZ21lbnRHcm91cChuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCB7fSksIDAsIGNvbW1hbmRzKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gY2hpbGRyZW47XG59XG5cbmZ1bmN0aW9uIHN0cmluZ2lmeShwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBhbnl9KToge1trZXk6IHN0cmluZ106IHN0cmluZ30ge1xuICBjb25zdCByZXM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIGZvckVhY2gocGFyYW1zLCAodjogYW55LCBrOiBzdHJpbmcpID0+IHJlc1trXSA9IGAke3Z9YCk7XG4gIHJldHVybiByZXM7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmUocGF0aDogc3RyaW5nLCBwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBhbnl9LCBzZWdtZW50OiBVcmxTZWdtZW50KTogYm9vbGVhbiB7XG4gIHJldHVybiBwYXRoID09IHNlZ21lbnQucGF0aCAmJiBzaGFsbG93RXF1YWwocGFyYW1zLCBzZWdtZW50LnBhcmFtZXRlcnMpO1xufVxuIl19