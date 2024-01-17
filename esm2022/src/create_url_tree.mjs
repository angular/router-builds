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
import { shallowEqual } from './utils/collection';
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
        Object.entries(queryParams).forEach(([name, value]) => {
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
    Object.entries(current.children).forEach(([outletName, c]) => {
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
            throw new RuntimeError(4003 /* RuntimeErrorCode.ROOT_SEGMENT_MATRIX_PARAMS */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
                'Root segment cannot have matrix parameters');
        }
        const cmdWithOutlet = commands.find(isCommandWithOutlets);
        if (cmdWithOutlet && cmdWithOutlet !== commands.at(-1)) {
            throw new RuntimeError(4004 /* RuntimeErrorCode.MISPLACED_OUTLETS_COMMAND */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
                '{outlets:{}} has to be the last command');
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
                Object.entries(cmd.outlets).forEach(([name, commands]) => {
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
function createPositionApplyingDoubleDots(group, index, numberOfDoubleDots) {
    let g = group;
    let ci = index;
    let dd = numberOfDoubleDots;
    while (dd > ci) {
        dd -= ci;
        g = g.parent;
        if (!g) {
            throw new RuntimeError(4005 /* RuntimeErrorCode.INVALID_DOUBLE_DOTS */, (typeof ngDevMode === 'undefined' || ngDevMode) && 'Invalid number of \'../\'');
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
    segmentGroup ??= new UrlSegmentGroup([], {});
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
        // If the set of commands applies to anything other than the primary outlet and the child
        // segment is an empty path primary segment on its own, we want to apply the commands to the
        // empty child path rather than here. The outcome is that the empty primary child is effectively
        // removed from the final output UrlTree. Imagine the following config:
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
        if (Object.keys(outlets).some(o => o !== PRIMARY_OUTLET) &&
            segmentGroup.children[PRIMARY_OUTLET] && segmentGroup.numberOfChildren === 1 &&
            segmentGroup.children[PRIMARY_OUTLET].segments.length === 0) {
            const childrenOfEmptyChild = updateSegmentGroupChildren(segmentGroup.children[PRIMARY_OUTLET], startIndex, commands);
            return new UrlSegmentGroup(segmentGroup.segments, childrenOfEmptyChild.children);
        }
        Object.entries(outlets).forEach(([outlet, commands]) => {
            if (typeof commands === 'string') {
                commands = [commands];
            }
            if (commands !== null) {
                children[outlet] = updateSegmentGroup(segmentGroup.children[outlet], startIndex, commands);
            }
        });
        Object.entries(segmentGroup.children).forEach(([childOutlet, child]) => {
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
    Object.entries(outlets).forEach(([outlet, commands]) => {
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
    Object.entries(params).forEach(([k, v]) => res[k] = `${v}`);
    return res;
}
function compare(path, params, segment) {
    return path == segment.path && shallowEqual(params, segment.parameters);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlX3VybF90cmVlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jcmVhdGVfdXJsX3RyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGFBQWEsSUFBSSxZQUFZLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFJNUQsT0FBTyxFQUFTLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNoRCxPQUFPLEVBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ2hHLE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUdoRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrREc7QUFDSCxNQUFNLFVBQVUseUJBQXlCLENBQ3JDLFVBQWtDLEVBQUUsUUFBZSxFQUFFLGNBQTJCLElBQUksRUFDcEYsV0FBd0IsSUFBSTtJQUM5QixNQUFNLHlCQUF5QixHQUFHLDJCQUEyQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzFFLE9BQU8sNkJBQTZCLENBQUMseUJBQXlCLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUNuRyxDQUFDO0FBRUQsTUFBTSxVQUFVLDJCQUEyQixDQUFDLEtBQTZCO0lBQ3ZFLElBQUksV0FBc0MsQ0FBQztJQUUzQyxTQUFTLG9DQUFvQyxDQUFDLFlBQW9DO1FBRWhGLE1BQU0sWUFBWSxHQUF3QyxFQUFFLENBQUM7UUFDN0QsS0FBSyxNQUFNLGFBQWEsSUFBSSxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbEQsTUFBTSxJQUFJLEdBQUcsb0NBQW9DLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDakUsWUFBWSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENB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LENBQUM7QUFFRCxTQUFTLFNBQVMsQ0FBQyxNQUE0QjtJQUM3QyxNQUFNLEdBQUcsR0FBNEIsRUFBRSxDQUFDO0lBQ3hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDNUQsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBRUQsU0FBUyxPQUFPLENBQUMsSUFBWSxFQUFFLE1BQTRCLEVBQUUsT0FBbUI7SUFDOUUsT0FBTyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksSUFBSSxZQUFZLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUMxRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7ybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHtSdW50aW1lRXJyb3JDb2RlfSBmcm9tICcuL2Vycm9ycyc7XG5pbXBvcnQge0FjdGl2YXRlZFJvdXRlU25hcHNob3R9IGZyb20gJy4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7UGFyYW1zLCBQUklNQVJZX09VVExFVH0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtjcmVhdGVSb290LCBzcXVhc2hTZWdtZW50R3JvdXAsIFVybFNlZ21lbnQsIFVybFNlZ21lbnRHcm91cCwgVXJsVHJlZX0gZnJvbSAnLi91cmxfdHJlZSc7XG5pbXBvcnQge3NoYWxsb3dFcXVhbH0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcblxuXG4vKipcbiAqIENyZWF0ZXMgYSBgVXJsVHJlZWAgcmVsYXRpdmUgdG8gYW4gYEFjdGl2YXRlZFJvdXRlU25hcHNob3RgLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqXG4gKlxuICogQHBhcmFtIHJlbGF0aXZlVG8gVGhlIGBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90YCB0byBhcHBseSB0aGUgY29tbWFuZHMgdG9cbiAqIEBwYXJhbSBjb21tYW5kcyBBbiBhcnJheSBvZiBVUkwgZnJhZ21lbnRzIHdpdGggd2hpY2ggdG8gY29uc3RydWN0IHRoZSBuZXcgVVJMIHRyZWUuXG4gKiBJZiB0aGUgcGF0aCBpcyBzdGF0aWMsIGNhbiBiZSB0aGUgbGl0ZXJhbCBVUkwgc3RyaW5nLiBGb3IgYSBkeW5hbWljIHBhdGgsIHBhc3MgYW4gYXJyYXkgb2YgcGF0aFxuICogc2VnbWVudHMsIGZvbGxvd2VkIGJ5IHRoZSBwYXJhbWV0ZXJzIGZvciBlYWNoIHNlZ21lbnQuXG4gKiBUaGUgZnJhZ21lbnRzIGFyZSBhcHBsaWVkIHRvIHRoZSBvbmUgcHJvdmlkZWQgaW4gdGhlIGByZWxhdGl2ZVRvYCBwYXJhbWV0ZXIuXG4gKiBAcGFyYW0gcXVlcnlQYXJhbXMgVGhlIHF1ZXJ5IHBhcmFtZXRlcnMgZm9yIHRoZSBgVXJsVHJlZWAuIGBudWxsYCBpZiB0aGUgYFVybFRyZWVgIGRvZXMgbm90IGhhdmVcbiAqICAgICBhbnkgcXVlcnkgcGFyYW1ldGVycy5cbiAqIEBwYXJhbSBmcmFnbWVudCBUaGUgZnJhZ21lbnQgZm9yIHRoZSBgVXJsVHJlZWAuIGBudWxsYCBpZiB0aGUgYFVybFRyZWVgIGRvZXMgbm90IGhhdmUgYSBmcmFnbWVudC5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICpcbiAqIGBgYFxuICogLy8gY3JlYXRlIC90ZWFtLzMzL3VzZXIvMTFcbiAqIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qoc25hcHNob3QsIFsnL3RlYW0nLCAzMywgJ3VzZXInLCAxMV0pO1xuICpcbiAqIC8vIGNyZWF0ZSAvdGVhbS8zMztleHBhbmQ9dHJ1ZS91c2VyLzExXG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJy90ZWFtJywgMzMsIHtleHBhbmQ6IHRydWV9LCAndXNlcicsIDExXSk7XG4gKlxuICogLy8geW91IGNhbiBjb2xsYXBzZSBzdGF0aWMgc2VnbWVudHMgbGlrZSB0aGlzICh0aGlzIHdvcmtzIG9ubHkgd2l0aCB0aGUgZmlyc3QgcGFzc2VkLWluIHZhbHVlKTpcbiAqIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qoc25hcHNob3QsIFsnL3RlYW0vMzMvdXNlcicsIHVzZXJJZF0pO1xuICpcbiAqIC8vIElmIHRoZSBmaXJzdCBzZWdtZW50IGNhbiBjb250YWluIHNsYXNoZXMsIGFuZCB5b3UgZG8gbm90IHdhbnQgdGhlIHJvdXRlciB0byBzcGxpdCBpdCxcbiAqIC8vIHlvdSBjYW4gZG8gdGhlIGZvbGxvd2luZzpcbiAqIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qoc25hcHNob3QsIFt7c2VnbWVudFBhdGg6ICcvb25lL3R3byd9XSk7XG4gKlxuICogLy8gY3JlYXRlIC90ZWFtLzMzLyh1c2VyLzExLy9yaWdodDpjaGF0KVxuICogY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChzbmFwc2hvdCwgWycvdGVhbScsIDMzLCB7b3V0bGV0czoge3ByaW1hcnk6ICd1c2VyLzExJywgcmlnaHQ6XG4gKiAnY2hhdCd9fV0sIG51bGwsIG51bGwpO1xuICpcbiAqIC8vIHJlbW92ZSB0aGUgcmlnaHQgc2Vjb25kYXJ5IG5vZGVcbiAqIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qoc25hcHNob3QsIFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OiBudWxsfX1dKTtcbiAqXG4gKiAvLyBGb3IgdGhlIGV4YW1wbGVzIGJlbG93LCBhc3N1bWUgdGhlIGN1cnJlbnQgVVJMIGlzIGZvciB0aGUgYC90ZWFtLzMzL3VzZXIvMTFgIGFuZCB0aGVcbiAqIGBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90YCBwb2ludHMgdG8gYHVzZXIvMTFgOlxuICpcbiAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzMzL3VzZXIvMTEvZGV0YWlsc1xuICogY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChzbmFwc2hvdCwgWydkZXRhaWxzJ10pO1xuICpcbiAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzMzL3VzZXIvMjJcbiAqIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qoc25hcHNob3QsIFsnLi4vMjInXSk7XG4gKlxuICogLy8gbmF2aWdhdGUgdG8gL3RlYW0vNDQvdXNlci8yMlxuICogY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChzbmFwc2hvdCwgWycuLi8uLi90ZWFtLzQ0L3VzZXIvMjInXSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3QoXG4gICAgcmVsYXRpdmVUbzogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCwgY29tbWFuZHM6IGFueVtdLCBxdWVyeVBhcmFtczogUGFyYW1zfG51bGwgPSBudWxsLFxuICAgIGZyYWdtZW50OiBzdHJpbmd8bnVsbCA9IG51bGwpOiBVcmxUcmVlIHtcbiAgY29uc3QgcmVsYXRpdmVUb1VybFNlZ21lbnRHcm91cCA9IGNyZWF0ZVNlZ21lbnRHcm91cEZyb21Sb3V0ZShyZWxhdGl2ZVRvKTtcbiAgcmV0dXJuIGNyZWF0ZVVybFRyZWVGcm9tU2VnbWVudEdyb3VwKHJlbGF0aXZlVG9VcmxTZWdtZW50R3JvdXAsIGNvbW1hbmRzLCBxdWVyeVBhcmFtcywgZnJhZ21lbnQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2VnbWVudEdyb3VwRnJvbVJvdXRlKHJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTogVXJsU2VnbWVudEdyb3VwIHtcbiAgbGV0IHRhcmdldEdyb3VwOiBVcmxTZWdtZW50R3JvdXB8dW5kZWZpbmVkO1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZVNlZ21lbnRHcm91cEZyb21Sb3V0ZVJlY3Vyc2l2ZShjdXJyZW50Um91dGU6IEFjdGl2YXRlZFJvdXRlU25hcHNob3QpOlxuICAgICAgVXJsU2VnbWVudEdyb3VwIHtcbiAgICBjb25zdCBjaGlsZE91dGxldHM6IHtbb3V0bGV0OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gICAgZm9yIChjb25zdCBjaGlsZFNuYXBzaG90IG9mIGN1cnJlbnRSb3V0ZS5jaGlsZHJlbikge1xuICAgICAgY29uc3Qgcm9vdCA9IGNyZWF0ZVNlZ21lbnRHcm91cEZyb21Sb3V0ZVJlY3Vyc2l2ZShjaGlsZFNuYXBzaG90KTtcbiAgICAgIGNoaWxkT3V0bGV0c1tjaGlsZFNuYXBzaG90Lm91dGxldF0gPSByb290O1xuICAgIH1cbiAgICBjb25zdCBzZWdtZW50R3JvdXAgPSBuZXcgVXJsU2VnbWVudEdyb3VwKGN1cnJlbnRSb3V0ZS51cmwsIGNoaWxkT3V0bGV0cyk7XG4gICAgaWYgKGN1cnJlbnRSb3V0ZSA9PT0gcm91dGUpIHtcbiAgICAgIHRhcmdldEdyb3VwID0gc2VnbWVudEdyb3VwO1xuICAgIH1cbiAgICByZXR1cm4gc2VnbWVudEdyb3VwO1xuICB9XG4gIGNvbnN0IHJvb3RDYW5kaWRhdGUgPSBjcmVhdGVTZWdtZW50R3JvdXBGcm9tUm91dGVSZWN1cnNpdmUocm91dGUucm9vdCk7XG4gIGNvbnN0IHJvb3RTZWdtZW50R3JvdXAgPSBjcmVhdGVSb290KHJvb3RDYW5kaWRhdGUpO1xuXG4gIHJldHVybiB0YXJnZXRHcm91cCA/PyByb290U2VnbWVudEdyb3VwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVXJsVHJlZUZyb21TZWdtZW50R3JvdXAoXG4gICAgcmVsYXRpdmVUbzogVXJsU2VnbWVudEdyb3VwLCBjb21tYW5kczogYW55W10sIHF1ZXJ5UGFyYW1zOiBQYXJhbXN8bnVsbCxcbiAgICBmcmFnbWVudDogc3RyaW5nfG51bGwpOiBVcmxUcmVlIHtcbiAgbGV0IHJvb3QgPSByZWxhdGl2ZVRvO1xuICB3aGlsZSAocm9vdC5wYXJlbnQpIHtcbiAgICByb290ID0gcm9vdC5wYXJlbnQ7XG4gIH1cbiAgLy8gVGhlcmUgYXJlIG5vIGNvbW1hbmRzIHNvIHRoZSBgVXJsVHJlZWAgZ29lcyB0byB0aGUgc2FtZSBwYXRoIGFzIHRoZSBvbmUgY3JlYXRlZCBmcm9tIHRoZVxuICAvLyBgVXJsU2VnbWVudEdyb3VwYC4gQWxsIHdlIG5lZWQgdG8gZG8gaXMgdXBkYXRlIHRoZSBgcXVlcnlQYXJhbXNgIGFuZCBgZnJhZ21lbnRgIHdpdGhvdXRcbiAgLy8gYXBwbHlpbmcgYW55IG90aGVyIGxvZ2ljLlxuICBpZiAoY29tbWFuZHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHRyZWUocm9vdCwgcm9vdCwgcm9vdCwgcXVlcnlQYXJhbXMsIGZyYWdtZW50KTtcbiAgfVxuXG4gIGNvbnN0IG5hdiA9IGNvbXB1dGVOYXZpZ2F0aW9uKGNvbW1hbmRzKTtcblxuICBpZiAobmF2LnRvUm9vdCgpKSB7XG4gICAgcmV0dXJuIHRyZWUocm9vdCwgcm9vdCwgbmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pLCBxdWVyeVBhcmFtcywgZnJhZ21lbnQpO1xuICB9XG5cbiAgY29uc3QgcG9zaXRpb24gPSBmaW5kU3RhcnRpbmdQb3NpdGlvbkZvclRhcmdldEdyb3VwKG5hdiwgcm9vdCwgcmVsYXRpdmVUbyk7XG4gIGNvbnN0IG5ld1NlZ21lbnRHcm91cCA9IHBvc2l0aW9uLnByb2Nlc3NDaGlsZHJlbiA/XG4gICAgICB1cGRhdGVTZWdtZW50R3JvdXBDaGlsZHJlbihwb3NpdGlvbi5zZWdtZW50R3JvdXAsIHBvc2l0aW9uLmluZGV4LCBuYXYuY29tbWFuZHMpIDpcbiAgICAgIHVwZGF0ZVNlZ21lbnRHcm91cChwb3NpdGlvbi5zZWdtZW50R3JvdXAsIHBvc2l0aW9uLmluZGV4LCBuYXYuY29tbWFuZHMpO1xuICByZXR1cm4gdHJlZShyb290LCBwb3NpdGlvbi5zZWdtZW50R3JvdXAsIG5ld1NlZ21lbnRHcm91cCwgcXVlcnlQYXJhbXMsIGZyYWdtZW50KTtcbn1cblxuZnVuY3Rpb24gaXNNYXRyaXhQYXJhbXMoY29tbWFuZDogYW55KTogYm9vbGVhbiB7XG4gIHJldHVybiB0eXBlb2YgY29tbWFuZCA9PT0gJ29iamVjdCcgJiYgY29tbWFuZCAhPSBudWxsICYmICFjb21tYW5kLm91dGxldHMgJiYgIWNvbW1hbmQuc2VnbWVudFBhdGg7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiBhIGdpdmVuIGNvbW1hbmQgaGFzIGFuIGBvdXRsZXRzYCBtYXAuIFdoZW4gd2UgZW5jb3VudGVyIGEgY29tbWFuZFxuICogd2l0aCBhbiBvdXRsZXRzIGsvdiBtYXAsIHdlIG5lZWQgdG8gYXBwbHkgZWFjaCBvdXRsZXQgaW5kaXZpZHVhbGx5IHRvIHRoZSBleGlzdGluZyBzZWdtZW50LlxuICovXG5mdW5jdGlvbiBpc0NvbW1hbmRXaXRoT3V0bGV0cyhjb21tYW5kOiBhbnkpOiBjb21tYW5kIGlzIHtvdXRsZXRzOiB7W2tleTogc3RyaW5nXTogYW55fX0ge1xuICByZXR1cm4gdHlwZW9mIGNvbW1hbmQgPT09ICdvYmplY3QnICYmIGNvbW1hbmQgIT0gbnVsbCAmJiBjb21tYW5kLm91dGxldHM7XG59XG5cbmZ1bmN0aW9uIHRyZWUoXG4gICAgb2xkUm9vdDogVXJsU2VnbWVudEdyb3VwLCBvbGRTZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgbmV3U2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsXG4gICAgcXVlcnlQYXJhbXM6IFBhcmFtc3xudWxsLCBmcmFnbWVudDogc3RyaW5nfG51bGwpOiBVcmxUcmVlIHtcbiAgbGV0IHFwOiBhbnkgPSB7fTtcbiAgaWYgKHF1ZXJ5UGFyYW1zKSB7XG4gICAgT2JqZWN0LmVudHJpZXMocXVlcnlQYXJhbXMpLmZvckVhY2goKFtuYW1lLCB2YWx1ZV0pID0+IHtcbiAgICAgIHFwW25hbWVdID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZS5tYXAoKHY6IGFueSkgPT4gYCR7dn1gKSA6IGAke3ZhbHVlfWA7XG4gICAgfSk7XG4gIH1cblxuICBsZXQgcm9vdENhbmRpZGF0ZTogVXJsU2VnbWVudEdyb3VwO1xuICBpZiAob2xkUm9vdCA9PT0gb2xkU2VnbWVudEdyb3VwKSB7XG4gICAgcm9vdENhbmRpZGF0ZSA9IG5ld1NlZ21lbnRHcm91cDtcbiAgfSBlbHNlIHtcbiAgICByb290Q2FuZGlkYXRlID0gcmVwbGFjZVNlZ21lbnQob2xkUm9vdCwgb2xkU2VnbWVudEdyb3VwLCBuZXdTZWdtZW50R3JvdXApO1xuICB9XG5cbiAgY29uc3QgbmV3Um9vdCA9IGNyZWF0ZVJvb3Qoc3F1YXNoU2VnbWVudEdyb3VwKHJvb3RDYW5kaWRhdGUpKTtcbiAgcmV0dXJuIG5ldyBVcmxUcmVlKG5ld1Jvb3QsIHFwLCBmcmFnbWVudCk7XG59XG5cbi8qKlxuICogUmVwbGFjZXMgdGhlIGBvbGRTZWdtZW50YCB3aGljaCBpcyBsb2NhdGVkIGluIHNvbWUgY2hpbGQgb2YgdGhlIGBjdXJyZW50YCB3aXRoIHRoZSBgbmV3U2VnbWVudGAuXG4gKiBUaGlzIGFsc28gaGFzIHRoZSBlZmZlY3Qgb2YgY3JlYXRpbmcgbmV3IGBVcmxTZWdtZW50R3JvdXBgIGNvcGllcyB0byB1cGRhdGUgcmVmZXJlbmNlcy4gVGhpc1xuICogc2hvdWxkbid0IGJlIG5lY2Vzc2FyeSBidXQgdGhlIGZhbGxiYWNrIGxvZ2ljIGZvciBhbiBpbnZhbGlkIEFjdGl2YXRlZFJvdXRlIGluIHRoZSBjcmVhdGlvbiB1c2VzXG4gKiB0aGUgUm91dGVyJ3MgY3VycmVudCB1cmwgdHJlZS4gSWYgd2UgZG9uJ3QgY3JlYXRlIG5ldyBzZWdtZW50IGdyb3Vwcywgd2UgZW5kIHVwIG1vZGlmeWluZyB0aGF0XG4gKiB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gcmVwbGFjZVNlZ21lbnQoXG4gICAgY3VycmVudDogVXJsU2VnbWVudEdyb3VwLCBvbGRTZWdtZW50OiBVcmxTZWdtZW50R3JvdXAsXG4gICAgbmV3U2VnbWVudDogVXJsU2VnbWVudEdyb3VwKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgY29uc3QgY2hpbGRyZW46IHtba2V5OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gIE9iamVjdC5lbnRyaWVzKGN1cnJlbnQuY2hpbGRyZW4pLmZvckVhY2goKFtvdXRsZXROYW1lLCBjXSkgPT4ge1xuICAgIGlmIChjID09PSBvbGRTZWdtZW50KSB7XG4gICAgICBjaGlsZHJlbltvdXRsZXROYW1lXSA9IG5ld1NlZ21lbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNoaWxkcmVuW291dGxldE5hbWVdID0gcmVwbGFjZVNlZ21lbnQoYywgb2xkU2VnbWVudCwgbmV3U2VnbWVudCk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAoY3VycmVudC5zZWdtZW50cywgY2hpbGRyZW4pO1xufVxuXG5jbGFzcyBOYXZpZ2F0aW9uIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwdWJsaWMgaXNBYnNvbHV0ZTogYm9vbGVhbiwgcHVibGljIG51bWJlck9mRG91YmxlRG90czogbnVtYmVyLCBwdWJsaWMgY29tbWFuZHM6IGFueVtdKSB7XG4gICAgaWYgKGlzQWJzb2x1dGUgJiYgY29tbWFuZHMubGVuZ3RoID4gMCAmJiBpc01hdHJpeFBhcmFtcyhjb21tYW5kc1swXSkpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5ST09UX1NFR01FTlRfTUFUUklYX1BBUkFNUyxcbiAgICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICAgICAgICAnUm9vdCBzZWdtZW50IGNhbm5vdCBoYXZlIG1hdHJpeCBwYXJhbWV0ZXJzJyk7XG4gICAgfVxuXG4gICAgY29uc3QgY21kV2l0aE91dGxldCA9IGNvbW1hbmRzLmZpbmQoaXNDb21tYW5kV2l0aE91dGxldHMpO1xuICAgIGlmIChjbWRXaXRoT3V0bGV0ICYmIGNtZFdpdGhPdXRsZXQgIT09IGNvbW1hbmRzLmF0KC0xKSkge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLk1JU1BMQUNFRF9PVVRMRVRTX0NPTU1BTkQsXG4gICAgICAgICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiZcbiAgICAgICAgICAgICAgJ3tvdXRsZXRzOnt9fSBoYXMgdG8gYmUgdGhlIGxhc3QgY29tbWFuZCcpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyB0b1Jvb3QoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuaXNBYnNvbHV0ZSAmJiB0aGlzLmNvbW1hbmRzLmxlbmd0aCA9PT0gMSAmJiB0aGlzLmNvbW1hbmRzWzBdID09ICcvJztcbiAgfVxufVxuXG4vKiogVHJhbnNmb3JtcyBjb21tYW5kcyB0byBhIG5vcm1hbGl6ZWQgYE5hdmlnYXRpb25gICovXG5mdW5jdGlvbiBjb21wdXRlTmF2aWdhdGlvbihjb21tYW5kczogYW55W10pOiBOYXZpZ2F0aW9uIHtcbiAgaWYgKCh0eXBlb2YgY29tbWFuZHNbMF0gPT09ICdzdHJpbmcnKSAmJiBjb21tYW5kcy5sZW5ndGggPT09IDEgJiYgY29tbWFuZHNbMF0gPT09ICcvJykge1xuICAgIHJldHVybiBuZXcgTmF2aWdhdGlvbih0cnVlLCAwLCBjb21tYW5kcyk7XG4gIH1cblxuICBsZXQgbnVtYmVyT2ZEb3VibGVEb3RzID0gMDtcbiAgbGV0IGlzQWJzb2x1dGUgPSBmYWxzZTtcblxuICBjb25zdCByZXM6IGFueVtdID0gY29tbWFuZHMucmVkdWNlKChyZXMsIGNtZCwgY21kSWR4KSA9PiB7XG4gICAgaWYgKHR5cGVvZiBjbWQgPT09ICdvYmplY3QnICYmIGNtZCAhPSBudWxsKSB7XG4gICAgICBpZiAoY21kLm91dGxldHMpIHtcbiAgICAgICAgY29uc3Qgb3V0bGV0czoge1trOiBzdHJpbmddOiBhbnl9ID0ge307XG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGNtZC5vdXRsZXRzKS5mb3JFYWNoKChbbmFtZSwgY29tbWFuZHNdKSA9PiB7XG4gICAgICAgICAgb3V0bGV0c1tuYW1lXSA9IHR5cGVvZiBjb21tYW5kcyA9PT0gJ3N0cmluZycgPyBjb21tYW5kcy5zcGxpdCgnLycpIDogY29tbWFuZHM7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gWy4uLnJlcywge291dGxldHN9XTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNtZC5zZWdtZW50UGF0aCkge1xuICAgICAgICByZXR1cm4gWy4uLnJlcywgY21kLnNlZ21lbnRQYXRoXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoISh0eXBlb2YgY21kID09PSAnc3RyaW5nJykpIHtcbiAgICAgIHJldHVybiBbLi4ucmVzLCBjbWRdO1xuICAgIH1cblxuICAgIGlmIChjbWRJZHggPT09IDApIHtcbiAgICAgIGNtZC5zcGxpdCgnLycpLmZvckVhY2goKHVybFBhcnQsIHBhcnRJbmRleCkgPT4ge1xuICAgICAgICBpZiAocGFydEluZGV4ID09IDAgJiYgdXJsUGFydCA9PT0gJy4nKSB7XG4gICAgICAgICAgLy8gc2tpcCAnLi9hJ1xuICAgICAgICB9IGVsc2UgaWYgKHBhcnRJbmRleCA9PSAwICYmIHVybFBhcnQgPT09ICcnKSB7ICAvLyAgJy9hJ1xuICAgICAgICAgIGlzQWJzb2x1dGUgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHVybFBhcnQgPT09ICcuLicpIHsgIC8vICAnLi4vYSdcbiAgICAgICAgICBudW1iZXJPZkRvdWJsZURvdHMrKztcbiAgICAgICAgfSBlbHNlIGlmICh1cmxQYXJ0ICE9ICcnKSB7XG4gICAgICAgICAgcmVzLnB1c2godXJsUGFydCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIHJldHVybiBbLi4ucmVzLCBjbWRdO1xuICB9LCBbXSk7XG5cbiAgcmV0dXJuIG5ldyBOYXZpZ2F0aW9uKGlzQWJzb2x1dGUsIG51bWJlck9mRG91YmxlRG90cywgcmVzKTtcbn1cblxuY2xhc3MgUG9zaXRpb24ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHB1YmxpYyBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcHVibGljIHByb2Nlc3NDaGlsZHJlbjogYm9vbGVhbiwgcHVibGljIGluZGV4OiBudW1iZXIpIHtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kU3RhcnRpbmdQb3NpdGlvbkZvclRhcmdldEdyb3VwKFxuICAgIG5hdjogTmF2aWdhdGlvbiwgcm9vdDogVXJsU2VnbWVudEdyb3VwLCB0YXJnZXQ6IFVybFNlZ21lbnRHcm91cCk6IFBvc2l0aW9uIHtcbiAgaWYgKG5hdi5pc0Fic29sdXRlKSB7XG4gICAgcmV0dXJuIG5ldyBQb3NpdGlvbihyb290LCB0cnVlLCAwKTtcbiAgfVxuXG4gIGlmICghdGFyZ2V0KSB7XG4gICAgLy8gYE5hTmAgaXMgdXNlZCBvbmx5IHRvIG1haW50YWluIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IHdpdGggaW5jb3JyZWN0bHkgbW9ja2VkXG4gICAgLy8gYEFjdGl2YXRlZFJvdXRlU25hcHNob3RgIGluIHRlc3RzLiBJbiBwcmlvciB2ZXJzaW9ucyBvZiB0aGlzIGNvZGUsIHRoZSBwb3NpdGlvbiBoZXJlIHdhc1xuICAgIC8vIGRldGVybWluZWQgYmFzZWQgb24gYW4gaW50ZXJuYWwgcHJvcGVydHkgdGhhdCB3YXMgcmFyZWx5IG1vY2tlZCwgcmVzdWx0aW5nIGluIGBOYU5gLiBJblxuICAgIC8vIHJlYWxpdHksIHRoaXMgY29kZSBwYXRoIHNob3VsZCBfbmV2ZXJfIGJlIHRvdWNoZWQgc2luY2UgYHRhcmdldGAgaXMgbm90IGFsbG93ZWQgdG8gYmUgZmFsc2V5LlxuICAgIHJldHVybiBuZXcgUG9zaXRpb24ocm9vdCwgZmFsc2UsIE5hTik7XG4gIH1cbiAgaWYgKHRhcmdldC5wYXJlbnQgPT09IG51bGwpIHtcbiAgICByZXR1cm4gbmV3IFBvc2l0aW9uKHRhcmdldCwgdHJ1ZSwgMCk7XG4gIH1cblxuICBjb25zdCBtb2RpZmllciA9IGlzTWF0cml4UGFyYW1zKG5hdi5jb21tYW5kc1swXSkgPyAwIDogMTtcbiAgY29uc3QgaW5kZXggPSB0YXJnZXQuc2VnbWVudHMubGVuZ3RoIC0gMSArIG1vZGlmaWVyO1xuICByZXR1cm4gY3JlYXRlUG9zaXRpb25BcHBseWluZ0RvdWJsZURvdHModGFyZ2V0LCBpbmRleCwgbmF2Lm51bWJlck9mRG91YmxlRG90cyk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVBvc2l0aW9uQXBwbHlpbmdEb3VibGVEb3RzKFxuICAgIGdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIGluZGV4OiBudW1iZXIsIG51bWJlck9mRG91YmxlRG90czogbnVtYmVyKTogUG9zaXRpb24ge1xuICBsZXQgZyA9IGdyb3VwO1xuICBsZXQgY2kgPSBpbmRleDtcbiAgbGV0IGRkID0gbnVtYmVyT2ZEb3VibGVEb3RzO1xuICB3aGlsZSAoZGQgPiBjaSkge1xuICAgIGRkIC09IGNpO1xuICAgIGcgPSBnLnBhcmVudCE7XG4gICAgaWYgKCFnKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ET1VCTEVfRE9UUyxcbiAgICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJiAnSW52YWxpZCBudW1iZXIgb2YgXFwnLi4vXFwnJyk7XG4gICAgfVxuICAgIGNpID0gZy5zZWdtZW50cy5sZW5ndGg7XG4gIH1cbiAgcmV0dXJuIG5ldyBQb3NpdGlvbihnLCBmYWxzZSwgY2kgLSBkZCk7XG59XG5cbmZ1bmN0aW9uIGdldE91dGxldHMoY29tbWFuZHM6IHVua25vd25bXSk6IHtbazogc3RyaW5nXTogdW5rbm93bltdfHN0cmluZ30ge1xuICBpZiAoaXNDb21tYW5kV2l0aE91dGxldHMoY29tbWFuZHNbMF0pKSB7XG4gICAgcmV0dXJuIGNvbW1hbmRzWzBdLm91dGxldHM7XG4gIH1cblxuICByZXR1cm4ge1tQUklNQVJZX09VVExFVF06IGNvbW1hbmRzfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlU2VnbWVudEdyb3VwKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwfHVuZGVmaW5lZCwgc3RhcnRJbmRleDogbnVtYmVyLCBjb21tYW5kczogYW55W10pOiBVcmxTZWdtZW50R3JvdXAge1xuICBzZWdtZW50R3JvdXAgPz89IG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KTtcbiAgaWYgKHNlZ21lbnRHcm91cC5zZWdtZW50cy5sZW5ndGggPT09IDAgJiYgc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkpIHtcbiAgICByZXR1cm4gdXBkYXRlU2VnbWVudEdyb3VwQ2hpbGRyZW4oc2VnbWVudEdyb3VwLCBzdGFydEluZGV4LCBjb21tYW5kcyk7XG4gIH1cblxuICBjb25zdCBtID0gcHJlZml4ZWRXaXRoKHNlZ21lbnRHcm91cCwgc3RhcnRJbmRleCwgY29tbWFuZHMpO1xuICBjb25zdCBzbGljZWRDb21tYW5kcyA9IGNvbW1hbmRzLnNsaWNlKG0uY29tbWFuZEluZGV4KTtcbiAgaWYgKG0ubWF0Y2ggJiYgbS5wYXRoSW5kZXggPCBzZWdtZW50R3JvdXAuc2VnbWVudHMubGVuZ3RoKSB7XG4gICAgY29uc3QgZyA9IG5ldyBVcmxTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLnNsaWNlKDAsIG0ucGF0aEluZGV4KSwge30pO1xuICAgIGcuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdID1cbiAgICAgICAgbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuc2VnbWVudHMuc2xpY2UobS5wYXRoSW5kZXgpLCBzZWdtZW50R3JvdXAuY2hpbGRyZW4pO1xuICAgIHJldHVybiB1cGRhdGVTZWdtZW50R3JvdXBDaGlsZHJlbihnLCAwLCBzbGljZWRDb21tYW5kcyk7XG4gIH0gZWxzZSBpZiAobS5tYXRjaCAmJiBzbGljZWRDb21tYW5kcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuc2VnbWVudHMsIHt9KTtcbiAgfSBlbHNlIGlmIChtLm1hdGNoICYmICFzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgIHJldHVybiBjcmVhdGVOZXdTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLCBzdGFydEluZGV4LCBjb21tYW5kcyk7XG4gIH0gZWxzZSBpZiAobS5tYXRjaCkge1xuICAgIHJldHVybiB1cGRhdGVTZWdtZW50R3JvdXBDaGlsZHJlbihzZWdtZW50R3JvdXAsIDAsIHNsaWNlZENvbW1hbmRzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gY3JlYXRlTmV3U2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cCwgc3RhcnRJbmRleCwgY29tbWFuZHMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVNlZ21lbnRHcm91cENoaWxkcmVuKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBzdGFydEluZGV4OiBudW1iZXIsIGNvbW1hbmRzOiBhbnlbXSk6IFVybFNlZ21lbnRHcm91cCB7XG4gIGlmIChjb21tYW5kcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuc2VnbWVudHMsIHt9KTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBvdXRsZXRzID0gZ2V0T3V0bGV0cyhjb21tYW5kcyk7XG4gICAgY29uc3QgY2hpbGRyZW46IHtba2V5OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gICAgLy8gSWYgdGhlIHNldCBvZiBjb21tYW5kcyBhcHBsaWVzIHRvIGFueXRoaW5nIG90aGVyIHRoYW4gdGhlIHByaW1hcnkgb3V0bGV0IGFuZCB0aGUgY2hpbGRcbiAgICAvLyBzZWdtZW50IGlzIGFuIGVtcHR5IHBhdGggcHJpbWFyeSBzZWdtZW50IG9uIGl0cyBvd24sIHdlIHdhbnQgdG8gYXBwbHkgdGhlIGNvbW1hbmRzIHRvIHRoZVxuICAgIC8vIGVtcHR5IGNoaWxkIHBhdGggcmF0aGVyIHRoYW4gaGVyZS4gVGhlIG91dGNvbWUgaXMgdGhhdCB0aGUgZW1wdHkgcHJpbWFyeSBjaGlsZCBpcyBlZmZlY3RpdmVseVxuICAgIC8vIHJlbW92ZWQgZnJvbSB0aGUgZmluYWwgb3V0cHV0IFVybFRyZWUuIEltYWdpbmUgdGhlIGZvbGxvd2luZyBjb25maWc6XG4gICAgLy9cbiAgICAvLyB7cGF0aDogJycsIGNoaWxkcmVuOiBbe3BhdGg6ICcqKicsIG91dGxldDogJ3BvcHVwJ31dfS5cbiAgICAvL1xuICAgIC8vIE5hdmlnYXRpb24gdG8gLyhwb3B1cDphKSB3aWxsIGFjdGl2YXRlIHRoZSBjaGlsZCBvdXRsZXQgY29ycmVjdGx5IEdpdmVuIGEgZm9sbG93LXVwXG4gICAgLy8gbmF2aWdhdGlvbiB3aXRoIGNvbW1hbmRzXG4gICAgLy8gWycvJywge291dGxldHM6IHsncG9wdXAnOiAnYid9fV0sIHdlIF93b3VsZCBub3RfIHdhbnQgdG8gYXBwbHkgdGhlIG91dGxldCBjb21tYW5kcyB0byB0aGVcbiAgICAvLyByb290IHNlZ21lbnQgYmVjYXVzZSB0aGF0IHdvdWxkIHJlc3VsdCBpblxuICAgIC8vIC8vKHBvcHVwOmEpKHBvcHVwOmIpIHNpbmNlIHRoZSBvdXRsZXQgY29tbWFuZCBnb3QgYXBwbGllZCBvbmUgbGV2ZWwgYWJvdmUgd2hlcmUgaXQgYXBwZWFycyBpblxuICAgIC8vIHRoZSBgQWN0aXZhdGVkUm91dGVgIHJhdGhlciB0aGFuIHVwZGF0aW5nIHRoZSBleGlzdGluZyBvbmUuXG4gICAgLy9cbiAgICAvLyBCZWNhdXNlIGVtcHR5IHBhdGhzIGRvIG5vdCBhcHBlYXIgaW4gdGhlIFVSTCBzZWdtZW50cyBhbmQgdGhlIGZhY3QgdGhhdCB0aGUgc2VnbWVudHMgdXNlZCBpblxuICAgIC8vIHRoZSBvdXRwdXQgYFVybFRyZWVgIGFyZSBzcXVhc2hlZCB0byBlbGltaW5hdGUgdGhlc2UgZW1wdHkgcGF0aHMgd2hlcmUgcG9zc2libGVcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2Jsb2IvMTNmMTBkZTQwZTI1YzY5MDBjYTU1YmQ4M2IzNmJkNTMzZGFjZmE5ZS9wYWNrYWdlcy9yb3V0ZXIvc3JjL3VybF90cmVlLnRzI0w3NTVcbiAgICAvLyBpdCBjYW4gYmUgaGFyZCB0byBkZXRlcm1pbmUgd2hhdCBpcyB0aGUgcmlnaHQgdGhpbmcgdG8gZG8gd2hlbiBhcHBseWluZyBjb21tYW5kcyB0byBhXG4gICAgLy8gYFVybFNlZ21lbnRHcm91cGAgdGhhdCBpcyBjcmVhdGVkIGZyb20gYW4gXCJ1bnNxdWFzaGVkXCIvZXhwYW5kZWQgYEFjdGl2YXRlZFJvdXRlYCB0cmVlLlxuICAgIC8vIFRoaXMgY29kZSBlZmZlY3RpdmVseSBcInNxdWFzaGVzXCIgZW1wdHkgcGF0aCBwcmltYXJ5IHJvdXRlcyB3aGVuIHRoZXkgaGF2ZSBubyBzaWJsaW5ncyBvblxuICAgIC8vIHRoZSBzYW1lIGxldmVsIG9mIHRoZSB0cmVlLlxuICAgIGlmIChPYmplY3Qua2V5cyhvdXRsZXRzKS5zb21lKG8gPT4gbyAhPT0gUFJJTUFSWV9PVVRMRVQpICYmXG4gICAgICAgIHNlZ21lbnRHcm91cC5jaGlsZHJlbltQUklNQVJZX09VVExFVF0gJiYgc2VnbWVudEdyb3VwLm51bWJlck9mQ2hpbGRyZW4gPT09IDEgJiZcbiAgICAgICAgc2VnbWVudEdyb3VwLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXS5zZWdtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnN0IGNoaWxkcmVuT2ZFbXB0eUNoaWxkID1cbiAgICAgICAgICB1cGRhdGVTZWdtZW50R3JvdXBDaGlsZHJlbihzZWdtZW50R3JvdXAuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdLCBzdGFydEluZGV4LCBjb21tYW5kcyk7XG4gICAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuc2VnbWVudHMsIGNoaWxkcmVuT2ZFbXB0eUNoaWxkLmNoaWxkcmVuKTtcbiAgICB9XG5cbiAgICBPYmplY3QuZW50cmllcyhvdXRsZXRzKS5mb3JFYWNoKChbb3V0bGV0LCBjb21tYW5kc10pID0+IHtcbiAgICAgIGlmICh0eXBlb2YgY29tbWFuZHMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNvbW1hbmRzID0gW2NvbW1hbmRzXTtcbiAgICAgIH1cbiAgICAgIGlmIChjb21tYW5kcyAhPT0gbnVsbCkge1xuICAgICAgICBjaGlsZHJlbltvdXRsZXRdID0gdXBkYXRlU2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cC5jaGlsZHJlbltvdXRsZXRdLCBzdGFydEluZGV4LCBjb21tYW5kcyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBPYmplY3QuZW50cmllcyhzZWdtZW50R3JvdXAuY2hpbGRyZW4pLmZvckVhY2goKFtjaGlsZE91dGxldCwgY2hpbGRdKSA9PiB7XG4gICAgICBpZiAob3V0bGV0c1tjaGlsZE91dGxldF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjaGlsZHJlbltjaGlsZE91dGxldF0gPSBjaGlsZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuc2VnbWVudHMsIGNoaWxkcmVuKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwcmVmaXhlZFdpdGgoc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHN0YXJ0SW5kZXg6IG51bWJlciwgY29tbWFuZHM6IGFueVtdKSB7XG4gIGxldCBjdXJyZW50Q29tbWFuZEluZGV4ID0gMDtcbiAgbGV0IGN1cnJlbnRQYXRoSW5kZXggPSBzdGFydEluZGV4O1xuXG4gIGNvbnN0IG5vTWF0Y2ggPSB7bWF0Y2g6IGZhbHNlLCBwYXRoSW5kZXg6IDAsIGNvbW1hbmRJbmRleDogMH07XG4gIHdoaWxlIChjdXJyZW50UGF0aEluZGV4IDwgc2VnbWVudEdyb3VwLnNlZ21lbnRzLmxlbmd0aCkge1xuICAgIGlmIChjdXJyZW50Q29tbWFuZEluZGV4ID49IGNvbW1hbmRzLmxlbmd0aCkgcmV0dXJuIG5vTWF0Y2g7XG4gICAgY29uc3QgcGF0aCA9IHNlZ21lbnRHcm91cC5zZWdtZW50c1tjdXJyZW50UGF0aEluZGV4XTtcbiAgICBjb25zdCBjb21tYW5kID0gY29tbWFuZHNbY3VycmVudENvbW1hbmRJbmRleF07XG4gICAgLy8gRG8gbm90IHRyeSB0byBjb25zdW1lIGNvbW1hbmQgYXMgcGFydCBvZiB0aGUgcHJlZml4aW5nIGlmIGl0IGhhcyBvdXRsZXRzIGJlY2F1c2UgaXQgY2FuXG4gICAgLy8gY29udGFpbiBvdXRsZXRzIG90aGVyIHRoYW4gdGhlIG9uZSBiZWluZyBwcm9jZXNzZWQuIENvbnN1bWluZyB0aGUgb3V0bGV0cyBjb21tYW5kIHdvdWxkXG4gICAgLy8gcmVzdWx0IGluIG90aGVyIG91dGxldHMgYmVpbmcgaWdub3JlZC5cbiAgICBpZiAoaXNDb21tYW5kV2l0aE91dGxldHMoY29tbWFuZCkpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjb25zdCBjdXJyID0gYCR7Y29tbWFuZH1gO1xuICAgIGNvbnN0IG5leHQgPVxuICAgICAgICBjdXJyZW50Q29tbWFuZEluZGV4IDwgY29tbWFuZHMubGVuZ3RoIC0gMSA/IGNvbW1hbmRzW2N1cnJlbnRDb21tYW5kSW5kZXggKyAxXSA6IG51bGw7XG5cbiAgICBpZiAoY3VycmVudFBhdGhJbmRleCA+IDAgJiYgY3VyciA9PT0gdW5kZWZpbmVkKSBicmVhaztcblxuICAgIGlmIChjdXJyICYmIG5leHQgJiYgKHR5cGVvZiBuZXh0ID09PSAnb2JqZWN0JykgJiYgbmV4dC5vdXRsZXRzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICghY29tcGFyZShjdXJyLCBuZXh0LCBwYXRoKSkgcmV0dXJuIG5vTWF0Y2g7XG4gICAgICBjdXJyZW50Q29tbWFuZEluZGV4ICs9IDI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghY29tcGFyZShjdXJyLCB7fSwgcGF0aCkpIHJldHVybiBub01hdGNoO1xuICAgICAgY3VycmVudENvbW1hbmRJbmRleCsrO1xuICAgIH1cbiAgICBjdXJyZW50UGF0aEluZGV4Kys7XG4gIH1cblxuICByZXR1cm4ge21hdGNoOiB0cnVlLCBwYXRoSW5kZXg6IGN1cnJlbnRQYXRoSW5kZXgsIGNvbW1hbmRJbmRleDogY3VycmVudENvbW1hbmRJbmRleH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU5ld1NlZ21lbnRHcm91cChcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc3RhcnRJbmRleDogbnVtYmVyLCBjb21tYW5kczogYW55W10pOiBVcmxTZWdtZW50R3JvdXAge1xuICBjb25zdCBwYXRocyA9IHNlZ21lbnRHcm91cC5zZWdtZW50cy5zbGljZSgwLCBzdGFydEluZGV4KTtcblxuICBsZXQgaSA9IDA7XG4gIHdoaWxlIChpIDwgY29tbWFuZHMubGVuZ3RoKSB7XG4gICAgY29uc3QgY29tbWFuZCA9IGNvbW1hbmRzW2ldO1xuICAgIGlmIChpc0NvbW1hbmRXaXRoT3V0bGV0cyhjb21tYW5kKSkge1xuICAgICAgY29uc3QgY2hpbGRyZW4gPSBjcmVhdGVOZXdTZWdtZW50Q2hpbGRyZW4oY29tbWFuZC5vdXRsZXRzKTtcbiAgICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHBhdGhzLCBjaGlsZHJlbik7XG4gICAgfVxuXG4gICAgLy8gaWYgd2Ugc3RhcnQgd2l0aCBhbiBvYmplY3QgbGl0ZXJhbCwgd2UgbmVlZCB0byByZXVzZSB0aGUgcGF0aCBwYXJ0IGZyb20gdGhlIHNlZ21lbnRcbiAgICBpZiAoaSA9PT0gMCAmJiBpc01hdHJpeFBhcmFtcyhjb21tYW5kc1swXSkpIHtcbiAgICAgIGNvbnN0IHAgPSBzZWdtZW50R3JvdXAuc2VnbWVudHNbc3RhcnRJbmRleF07XG4gICAgICBwYXRocy5wdXNoKG5ldyBVcmxTZWdtZW50KHAucGF0aCwgc3RyaW5naWZ5KGNvbW1hbmRzWzBdKSkpO1xuICAgICAgaSsrO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgY3VyciA9IGlzQ29tbWFuZFdpdGhPdXRsZXRzKGNvbW1hbmQpID8gY29tbWFuZC5vdXRsZXRzW1BSSU1BUllfT1VUTEVUXSA6IGAke2NvbW1hbmR9YDtcbiAgICBjb25zdCBuZXh0ID0gKGkgPCBjb21tYW5kcy5sZW5ndGggLSAxKSA/IGNvbW1hbmRzW2kgKyAxXSA6IG51bGw7XG4gICAgaWYgKGN1cnIgJiYgbmV4dCAmJiBpc01hdHJpeFBhcmFtcyhuZXh0KSkge1xuICAgICAgcGF0aHMucHVzaChuZXcgVXJsU2VnbWVudChjdXJyLCBzdHJpbmdpZnkobmV4dCkpKTtcbiAgICAgIGkgKz0gMjtcbiAgICB9IGVsc2Uge1xuICAgICAgcGF0aHMucHVzaChuZXcgVXJsU2VnbWVudChjdXJyLCB7fSkpO1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChwYXRocywge30pO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVOZXdTZWdtZW50Q2hpbGRyZW4ob3V0bGV0czoge1tuYW1lOiBzdHJpbmddOiB1bmtub3duW118c3RyaW5nfSk6XG4gICAge1tvdXRsZXQ6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0ge1xuICBjb25zdCBjaGlsZHJlbjoge1tvdXRsZXQ6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0gPSB7fTtcbiAgT2JqZWN0LmVudHJpZXMob3V0bGV0cykuZm9yRWFjaCgoW291dGxldCwgY29tbWFuZHNdKSA9PiB7XG4gICAgaWYgKHR5cGVvZiBjb21tYW5kcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbW1hbmRzID0gW2NvbW1hbmRzXTtcbiAgICB9XG4gICAgaWYgKGNvbW1hbmRzICE9PSBudWxsKSB7XG4gICAgICBjaGlsZHJlbltvdXRsZXRdID0gY3JlYXRlTmV3U2VnbWVudEdyb3VwKG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KSwgMCwgY29tbWFuZHMpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBjaGlsZHJlbjtcbn1cblxuZnVuY3Rpb24gc3RyaW5naWZ5KHBhcmFtczoge1trZXk6IHN0cmluZ106IGFueX0pOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSB7XG4gIGNvbnN0IHJlczoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgT2JqZWN0LmVudHJpZXMocGFyYW1zKS5mb3JFYWNoKChbaywgdl0pID0+IHJlc1trXSA9IGAke3Z9YCk7XG4gIHJldHVybiByZXM7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmUocGF0aDogc3RyaW5nLCBwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBhbnl9LCBzZWdtZW50OiBVcmxTZWdtZW50KTogYm9vbGVhbiB7XG4gIHJldHVybiBwYXRoID09IHNlZ21lbnQucGF0aCAmJiBzaGFsbG93RXF1YWwocGFyYW1zLCBzZWdtZW50LnBhcmFtZXRlcnMpO1xufVxuIl19