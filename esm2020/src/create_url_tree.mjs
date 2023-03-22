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
import { last, shallowEqual } from './utils/collection';
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
        if (cmdWithOutlet && cmdWithOutlet !== last(commands)) {
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
        // an empty path primary segment on its own, we want to skip applying the commands at this
        // level. Imagine the following config:
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
            return updateSegmentGroupChildren(segmentGroup.children[PRIMARY_OUTLET], startIndex, commands);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlX3VybF90cmVlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jcmVhdGVfdXJsX3RyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGFBQWEsSUFBSSxZQUFZLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFJNUQsT0FBTyxFQUFTLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNoRCxPQUFPLEVBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ2hHLE9BQU8sRUFBQyxJQUFJLEVBQUUsWUFBWSxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFHdEQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0RHO0FBQ0gsTUFBTSxVQUFVLHlCQUF5QixDQUNyQyxVQUFrQyxFQUFFLFFBQWUsRUFBRSxjQUEyQixJQUFJLEVBQ3BGLFdBQXdCLElBQUk7SUFDOUIsTUFBTSx5QkFBeUIsR0FBRywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMxRSxPQUFPLDZCQUE2QixDQUFDLHlCQUF5QixFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDbkcsQ0FBQztBQUVELE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxLQUE2QjtJQUN2RSxJQUFJLFdBQXNDLENBQUM7SUFFM0MsU0FBUyxvQ0FBb0MsQ0FBQyxZQUFvQztRQUVoRixNQUFNLFlBQVksR0FBd0MsRUFBRSxDQUFDO1FBQzdELEtBQUssTUFBTSxhQUFhLElBQUksWUFBWSxDQUFDLFFBQVEsRUFBRTtZQUNqRCxNQUFNLElBQUksR0FBRyxvQ0FBb0MsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNqRSxZQUFZLENBQUMsYUFBYSxDQUFDLE1B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T0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFO1lBQ2hDLFFBQVEsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3ZCO1FBQ0QsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFO1lBQ3JCLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLGVBQWUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ3BGO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDO0FBRUQsU0FBUyxTQUFTLENBQUMsTUFBNEI7SUFDN0MsTUFBTSxHQUFHLEdBQTRCLEVBQUUsQ0FBQztJQUN4QyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzVELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQUVELFNBQVMsT0FBTyxDQUFDLElBQVksRUFBRSxNQUE0QixFQUFFLE9BQW1CO0lBQzlFLE9BQU8sSUFBSSxJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksWUFBWSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDMUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge8m1UnVudGltZUVycm9yIGFzIFJ1bnRpbWVFcnJvcn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7UnVudGltZUVycm9yQ29kZX0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90fSBmcm9tICcuL3JvdXRlcl9zdGF0ZSc7XG5pbXBvcnQge1BhcmFtcywgUFJJTUFSWV9PVVRMRVR9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7Y3JlYXRlUm9vdCwgc3F1YXNoU2VnbWVudEdyb3VwLCBVcmxTZWdtZW50LCBVcmxTZWdtZW50R3JvdXAsIFVybFRyZWV9IGZyb20gJy4vdXJsX3RyZWUnO1xuaW1wb3J0IHtsYXN0LCBzaGFsbG93RXF1YWx9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5cblxuLyoqXG4gKiBDcmVhdGVzIGEgYFVybFRyZWVgIHJlbGF0aXZlIHRvIGFuIGBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90YC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKlxuICpcbiAqIEBwYXJhbSByZWxhdGl2ZVRvIFRoZSBgQWN0aXZhdGVkUm91dGVTbmFwc2hvdGAgdG8gYXBwbHkgdGhlIGNvbW1hbmRzIHRvXG4gKiBAcGFyYW0gY29tbWFuZHMgQW4gYXJyYXkgb2YgVVJMIGZyYWdtZW50cyB3aXRoIHdoaWNoIHRvIGNvbnN0cnVjdCB0aGUgbmV3IFVSTCB0cmVlLlxuICogSWYgdGhlIHBhdGggaXMgc3RhdGljLCBjYW4gYmUgdGhlIGxpdGVyYWwgVVJMIHN0cmluZy4gRm9yIGEgZHluYW1pYyBwYXRoLCBwYXNzIGFuIGFycmF5IG9mIHBhdGhcbiAqIHNlZ21lbnRzLCBmb2xsb3dlZCBieSB0aGUgcGFyYW1ldGVycyBmb3IgZWFjaCBzZWdtZW50LlxuICogVGhlIGZyYWdtZW50cyBhcmUgYXBwbGllZCB0byB0aGUgb25lIHByb3ZpZGVkIGluIHRoZSBgcmVsYXRpdmVUb2AgcGFyYW1ldGVyLlxuICogQHBhcmFtIHF1ZXJ5UGFyYW1zIFRoZSBxdWVyeSBwYXJhbWV0ZXJzIGZvciB0aGUgYFVybFRyZWVgLiBgbnVsbGAgaWYgdGhlIGBVcmxUcmVlYCBkb2VzIG5vdCBoYXZlXG4gKiAgICAgYW55IHF1ZXJ5IHBhcmFtZXRlcnMuXG4gKiBAcGFyYW0gZnJhZ21lbnQgVGhlIGZyYWdtZW50IGZvciB0aGUgYFVybFRyZWVgLiBgbnVsbGAgaWYgdGhlIGBVcmxUcmVlYCBkb2VzIG5vdCBoYXZlIGEgZnJhZ21lbnQuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBgYGBcbiAqIC8vIGNyZWF0ZSAvdGVhbS8zMy91c2VyLzExXG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJy90ZWFtJywgMzMsICd1c2VyJywgMTFdKTtcbiAqXG4gKiAvLyBjcmVhdGUgL3RlYW0vMzM7ZXhwYW5kPXRydWUvdXNlci8xMVxuICogY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChzbmFwc2hvdCwgWycvdGVhbScsIDMzLCB7ZXhwYW5kOiB0cnVlfSwgJ3VzZXInLCAxMV0pO1xuICpcbiAqIC8vIHlvdSBjYW4gY29sbGFwc2Ugc3RhdGljIHNlZ21lbnRzIGxpa2UgdGhpcyAodGhpcyB3b3JrcyBvbmx5IHdpdGggdGhlIGZpcnN0IHBhc3NlZC1pbiB2YWx1ZSk6XG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJy90ZWFtLzMzL3VzZXInLCB1c2VySWRdKTtcbiAqXG4gKiAvLyBJZiB0aGUgZmlyc3Qgc2VnbWVudCBjYW4gY29udGFpbiBzbGFzaGVzLCBhbmQgeW91IGRvIG5vdCB3YW50IHRoZSByb3V0ZXIgdG8gc3BsaXQgaXQsXG4gKiAvLyB5b3UgY2FuIGRvIHRoZSBmb2xsb3dpbmc6XG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbe3NlZ21lbnRQYXRoOiAnL29uZS90d28nfV0pO1xuICpcbiAqIC8vIGNyZWF0ZSAvdGVhbS8zMy8odXNlci8xMS8vcmlnaHQ6Y2hhdClcbiAqIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qoc25hcHNob3QsIFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OlxuICogJ2NoYXQnfX1dLCBudWxsLCBudWxsKTtcbiAqXG4gKiAvLyByZW1vdmUgdGhlIHJpZ2h0IHNlY29uZGFyeSBub2RlXG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDogbnVsbH19XSk7XG4gKlxuICogLy8gRm9yIHRoZSBleGFtcGxlcyBiZWxvdywgYXNzdW1lIHRoZSBjdXJyZW50IFVSTCBpcyBmb3IgdGhlIGAvdGVhbS8zMy91c2VyLzExYCBhbmQgdGhlXG4gKiBgQWN0aXZhdGVkUm91dGVTbmFwc2hvdGAgcG9pbnRzIHRvIGB1c2VyLzExYDpcbiAqXG4gKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzExL2RldGFpbHNcbiAqIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qoc25hcHNob3QsIFsnZGV0YWlscyddKTtcbiAqXG4gKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzIyXG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJy4uLzIyJ10pO1xuICpcbiAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzQ0L3VzZXIvMjJcbiAqIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qoc25hcHNob3QsIFsnLi4vLi4vdGVhbS80NC91c2VyLzIyJ10pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KFxuICAgIHJlbGF0aXZlVG86IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGNvbW1hbmRzOiBhbnlbXSwgcXVlcnlQYXJhbXM6IFBhcmFtc3xudWxsID0gbnVsbCxcbiAgICBmcmFnbWVudDogc3RyaW5nfG51bGwgPSBudWxsKTogVXJsVHJlZSB7XG4gIGNvbnN0IHJlbGF0aXZlVG9VcmxTZWdtZW50R3JvdXAgPSBjcmVhdGVTZWdtZW50R3JvdXBGcm9tUm91dGUocmVsYXRpdmVUbyk7XG4gIHJldHVybiBjcmVhdGVVcmxUcmVlRnJvbVNlZ21lbnRHcm91cChyZWxhdGl2ZVRvVXJsU2VnbWVudEdyb3VwLCBjb21tYW5kcywgcXVlcnlQYXJhbXMsIGZyYWdtZW50KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNlZ21lbnRHcm91cEZyb21Sb3V0ZShyb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IFVybFNlZ21lbnRHcm91cCB7XG4gIGxldCB0YXJnZXRHcm91cDogVXJsU2VnbWVudEdyb3VwfHVuZGVmaW5lZDtcblxuICBmdW5jdGlvbiBjcmVhdGVTZWdtZW50R3JvdXBGcm9tUm91dGVSZWN1cnNpdmUoY3VycmVudFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTpcbiAgICAgIFVybFNlZ21lbnRHcm91cCB7XG4gICAgY29uc3QgY2hpbGRPdXRsZXRzOiB7W291dGxldDogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICAgIGZvciAoY29uc3QgY2hpbGRTbmFwc2hvdCBvZiBjdXJyZW50Um91dGUuY2hpbGRyZW4pIHtcbiAgICAgIGNvbnN0IHJvb3QgPSBjcmVhdGVTZWdtZW50R3JvdXBGcm9tUm91dGVSZWN1cnNpdmUoY2hpbGRTbmFwc2hvdCk7XG4gICAgICBjaGlsZE91dGxldHNbY2hpbGRTbmFwc2hvdC5vdXRsZXRdID0gcm9vdDtcbiAgICB9XG4gICAgY29uc3Qgc2VnbWVudEdyb3VwID0gbmV3IFVybFNlZ21lbnRHcm91cChjdXJyZW50Um91dGUudXJsLCBjaGlsZE91dGxldHMpO1xuICAgIGlmIChjdXJyZW50Um91dGUgPT09IHJvdXRlKSB7XG4gICAgICB0YXJnZXRHcm91cCA9IHNlZ21lbnRHcm91cDtcbiAgICB9XG4gICAgcmV0dXJuIHNlZ21lbnRHcm91cDtcbiAgfVxuICBjb25zdCByb290Q2FuZGlkYXRlID0gY3JlYXRlU2VnbWVudEdyb3VwRnJvbVJvdXRlUmVjdXJzaXZlKHJvdXRlLnJvb3QpO1xuICBjb25zdCByb290U2VnbWVudEdyb3VwID0gY3JlYXRlUm9vdChyb290Q2FuZGlkYXRlKTtcblxuICByZXR1cm4gdGFyZ2V0R3JvdXAgPz8gcm9vdFNlZ21lbnRHcm91cDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVVybFRyZWVGcm9tU2VnbWVudEdyb3VwKFxuICAgIHJlbGF0aXZlVG86IFVybFNlZ21lbnRHcm91cCwgY29tbWFuZHM6IGFueVtdLCBxdWVyeVBhcmFtczogUGFyYW1zfG51bGwsXG4gICAgZnJhZ21lbnQ6IHN0cmluZ3xudWxsKTogVXJsVHJlZSB7XG4gIGxldCByb290ID0gcmVsYXRpdmVUbztcbiAgd2hpbGUgKHJvb3QucGFyZW50KSB7XG4gICAgcm9vdCA9IHJvb3QucGFyZW50O1xuICB9XG4gIC8vIFRoZXJlIGFyZSBubyBjb21tYW5kcyBzbyB0aGUgYFVybFRyZWVgIGdvZXMgdG8gdGhlIHNhbWUgcGF0aCBhcyB0aGUgb25lIGNyZWF0ZWQgZnJvbSB0aGVcbiAgLy8gYFVybFNlZ21lbnRHcm91cGAuIEFsbCB3ZSBuZWVkIHRvIGRvIGlzIHVwZGF0ZSB0aGUgYHF1ZXJ5UGFyYW1zYCBhbmQgYGZyYWdtZW50YCB3aXRob3V0XG4gIC8vIGFwcGx5aW5nIGFueSBvdGhlciBsb2dpYy5cbiAgaWYgKGNvbW1hbmRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB0cmVlKHJvb3QsIHJvb3QsIHJvb3QsIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCk7XG4gIH1cblxuICBjb25zdCBuYXYgPSBjb21wdXRlTmF2aWdhdGlvbihjb21tYW5kcyk7XG5cbiAgaWYgKG5hdi50b1Jvb3QoKSkge1xuICAgIHJldHVybiB0cmVlKHJvb3QsIHJvb3QsIG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KSwgcXVlcnlQYXJhbXMsIGZyYWdtZW50KTtcbiAgfVxuXG4gIGNvbnN0IHBvc2l0aW9uID0gZmluZFN0YXJ0aW5nUG9zaXRpb25Gb3JUYXJnZXRHcm91cChuYXYsIHJvb3QsIHJlbGF0aXZlVG8pO1xuICBjb25zdCBuZXdTZWdtZW50R3JvdXAgPSBwb3NpdGlvbi5wcm9jZXNzQ2hpbGRyZW4gP1xuICAgICAgdXBkYXRlU2VnbWVudEdyb3VwQ2hpbGRyZW4ocG9zaXRpb24uc2VnbWVudEdyb3VwLCBwb3NpdGlvbi5pbmRleCwgbmF2LmNvbW1hbmRzKSA6XG4gICAgICB1cGRhdGVTZWdtZW50R3JvdXAocG9zaXRpb24uc2VnbWVudEdyb3VwLCBwb3NpdGlvbi5pbmRleCwgbmF2LmNvbW1hbmRzKTtcbiAgcmV0dXJuIHRyZWUocm9vdCwgcG9zaXRpb24uc2VnbWVudEdyb3VwLCBuZXdTZWdtZW50R3JvdXAsIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCk7XG59XG5cbmZ1bmN0aW9uIGlzTWF0cml4UGFyYW1zKGNvbW1hbmQ6IGFueSk6IGJvb2xlYW4ge1xuICByZXR1cm4gdHlwZW9mIGNvbW1hbmQgPT09ICdvYmplY3QnICYmIGNvbW1hbmQgIT0gbnVsbCAmJiAhY29tbWFuZC5vdXRsZXRzICYmICFjb21tYW5kLnNlZ21lbnRQYXRoO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgYSBnaXZlbiBjb21tYW5kIGhhcyBhbiBgb3V0bGV0c2AgbWFwLiBXaGVuIHdlIGVuY291bnRlciBhIGNvbW1hbmRcbiAqIHdpdGggYW4gb3V0bGV0cyBrL3YgbWFwLCB3ZSBuZWVkIHRvIGFwcGx5IGVhY2ggb3V0bGV0IGluZGl2aWR1YWxseSB0byB0aGUgZXhpc3Rpbmcgc2VnbWVudC5cbiAqL1xuZnVuY3Rpb24gaXNDb21tYW5kV2l0aE91dGxldHMoY29tbWFuZDogYW55KTogY29tbWFuZCBpcyB7b3V0bGV0czoge1trZXk6IHN0cmluZ106IGFueX19IHtcbiAgcmV0dXJuIHR5cGVvZiBjb21tYW5kID09PSAnb2JqZWN0JyAmJiBjb21tYW5kICE9IG51bGwgJiYgY29tbWFuZC5vdXRsZXRzO1xufVxuXG5mdW5jdGlvbiB0cmVlKFxuICAgIG9sZFJvb3Q6IFVybFNlZ21lbnRHcm91cCwgb2xkU2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIG5ld1NlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLFxuICAgIHF1ZXJ5UGFyYW1zOiBQYXJhbXN8bnVsbCwgZnJhZ21lbnQ6IHN0cmluZ3xudWxsKTogVXJsVHJlZSB7XG4gIGxldCBxcDogYW55ID0ge307XG4gIGlmIChxdWVyeVBhcmFtcykge1xuICAgIE9iamVjdC5lbnRyaWVzKHF1ZXJ5UGFyYW1zKS5mb3JFYWNoKChbbmFtZSwgdmFsdWVdKSA9PiB7XG4gICAgICBxcFtuYW1lXSA9IEFycmF5LmlzQXJyYXkodmFsdWUpID8gdmFsdWUubWFwKCh2OiBhbnkpID0+IGAke3Z9YCkgOiBgJHt2YWx1ZX1gO1xuICAgIH0pO1xuICB9XG5cbiAgbGV0IHJvb3RDYW5kaWRhdGU6IFVybFNlZ21lbnRHcm91cDtcbiAgaWYgKG9sZFJvb3QgPT09IG9sZFNlZ21lbnRHcm91cCkge1xuICAgIHJvb3RDYW5kaWRhdGUgPSBuZXdTZWdtZW50R3JvdXA7XG4gIH0gZWxzZSB7XG4gICAgcm9vdENhbmRpZGF0ZSA9IHJlcGxhY2VTZWdtZW50KG9sZFJvb3QsIG9sZFNlZ21lbnRHcm91cCwgbmV3U2VnbWVudEdyb3VwKTtcbiAgfVxuXG4gIGNvbnN0IG5ld1Jvb3QgPSBjcmVhdGVSb290KHNxdWFzaFNlZ21lbnRHcm91cChyb290Q2FuZGlkYXRlKSk7XG4gIHJldHVybiBuZXcgVXJsVHJlZShuZXdSb290LCBxcCwgZnJhZ21lbnQpO1xufVxuXG4vKipcbiAqIFJlcGxhY2VzIHRoZSBgb2xkU2VnbWVudGAgd2hpY2ggaXMgbG9jYXRlZCBpbiBzb21lIGNoaWxkIG9mIHRoZSBgY3VycmVudGAgd2l0aCB0aGUgYG5ld1NlZ21lbnRgLlxuICogVGhpcyBhbHNvIGhhcyB0aGUgZWZmZWN0IG9mIGNyZWF0aW5nIG5ldyBgVXJsU2VnbWVudEdyb3VwYCBjb3BpZXMgdG8gdXBkYXRlIHJlZmVyZW5jZXMuIFRoaXNcbiAqIHNob3VsZG4ndCBiZSBuZWNlc3NhcnkgYnV0IHRoZSBmYWxsYmFjayBsb2dpYyBmb3IgYW4gaW52YWxpZCBBY3RpdmF0ZWRSb3V0ZSBpbiB0aGUgY3JlYXRpb24gdXNlc1xuICogdGhlIFJvdXRlcidzIGN1cnJlbnQgdXJsIHRyZWUuIElmIHdlIGRvbid0IGNyZWF0ZSBuZXcgc2VnbWVudCBncm91cHMsIHdlIGVuZCB1cCBtb2RpZnlpbmcgdGhhdFxuICogdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIHJlcGxhY2VTZWdtZW50KFxuICAgIGN1cnJlbnQ6IFVybFNlZ21lbnRHcm91cCwgb2xkU2VnbWVudDogVXJsU2VnbWVudEdyb3VwLFxuICAgIG5ld1NlZ21lbnQ6IFVybFNlZ21lbnRHcm91cCk6IFVybFNlZ21lbnRHcm91cCB7XG4gIGNvbnN0IGNoaWxkcmVuOiB7W2tleTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICBPYmplY3QuZW50cmllcyhjdXJyZW50LmNoaWxkcmVuKS5mb3JFYWNoKChbb3V0bGV0TmFtZSwgY10pID0+IHtcbiAgICBpZiAoYyA9PT0gb2xkU2VnbWVudCkge1xuICAgICAgY2hpbGRyZW5bb3V0bGV0TmFtZV0gPSBuZXdTZWdtZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICBjaGlsZHJlbltvdXRsZXROYW1lXSA9IHJlcGxhY2VTZWdtZW50KGMsIG9sZFNlZ21lbnQsIG5ld1NlZ21lbnQpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKGN1cnJlbnQuc2VnbWVudHMsIGNoaWxkcmVuKTtcbn1cblxuY2xhc3MgTmF2aWdhdGlvbiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHVibGljIGlzQWJzb2x1dGU6IGJvb2xlYW4sIHB1YmxpYyBudW1iZXJPZkRvdWJsZURvdHM6IG51bWJlciwgcHVibGljIGNvbW1hbmRzOiBhbnlbXSkge1xuICAgIGlmIChpc0Fic29sdXRlICYmIGNvbW1hbmRzLmxlbmd0aCA+IDAgJiYgaXNNYXRyaXhQYXJhbXMoY29tbWFuZHNbMF0pKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuUk9PVF9TRUdNRU5UX01BVFJJWF9QQVJBTVMsXG4gICAgICAgICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiZcbiAgICAgICAgICAgICAgJ1Jvb3Qgc2VnbWVudCBjYW5ub3QgaGF2ZSBtYXRyaXggcGFyYW1ldGVycycpO1xuICAgIH1cblxuICAgIGNvbnN0IGNtZFdpdGhPdXRsZXQgPSBjb21tYW5kcy5maW5kKGlzQ29tbWFuZFdpdGhPdXRsZXRzKTtcbiAgICBpZiAoY21kV2l0aE91dGxldCAmJiBjbWRXaXRoT3V0bGV0ICE9PSBsYXN0KGNvbW1hbmRzKSkge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLk1JU1BMQUNFRF9PVVRMRVRTX0NPTU1BTkQsXG4gICAgICAgICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiZcbiAgICAgICAgICAgICAgJ3tvdXRsZXRzOnt9fSBoYXMgdG8gYmUgdGhlIGxhc3QgY29tbWFuZCcpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyB0b1Jvb3QoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuaXNBYnNvbHV0ZSAmJiB0aGlzLmNvbW1hbmRzLmxlbmd0aCA9PT0gMSAmJiB0aGlzLmNvbW1hbmRzWzBdID09ICcvJztcbiAgfVxufVxuXG4vKiogVHJhbnNmb3JtcyBjb21tYW5kcyB0byBhIG5vcm1hbGl6ZWQgYE5hdmlnYXRpb25gICovXG5mdW5jdGlvbiBjb21wdXRlTmF2aWdhdGlvbihjb21tYW5kczogYW55W10pOiBOYXZpZ2F0aW9uIHtcbiAgaWYgKCh0eXBlb2YgY29tbWFuZHNbMF0gPT09ICdzdHJpbmcnKSAmJiBjb21tYW5kcy5sZW5ndGggPT09IDEgJiYgY29tbWFuZHNbMF0gPT09ICcvJykge1xuICAgIHJldHVybiBuZXcgTmF2aWdhdGlvbih0cnVlLCAwLCBjb21tYW5kcyk7XG4gIH1cblxuICBsZXQgbnVtYmVyT2ZEb3VibGVEb3RzID0gMDtcbiAgbGV0IGlzQWJzb2x1dGUgPSBmYWxzZTtcblxuICBjb25zdCByZXM6IGFueVtdID0gY29tbWFuZHMucmVkdWNlKChyZXMsIGNtZCwgY21kSWR4KSA9PiB7XG4gICAgaWYgKHR5cGVvZiBjbWQgPT09ICdvYmplY3QnICYmIGNtZCAhPSBudWxsKSB7XG4gICAgICBpZiAoY21kLm91dGxldHMpIHtcbiAgICAgICAgY29uc3Qgb3V0bGV0czoge1trOiBzdHJpbmddOiBhbnl9ID0ge307XG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGNtZC5vdXRsZXRzKS5mb3JFYWNoKChbbmFtZSwgY29tbWFuZHNdKSA9PiB7XG4gICAgICAgICAgb3V0bGV0c1tuYW1lXSA9IHR5cGVvZiBjb21tYW5kcyA9PT0gJ3N0cmluZycgPyBjb21tYW5kcy5zcGxpdCgnLycpIDogY29tbWFuZHM7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gWy4uLnJlcywge291dGxldHN9XTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNtZC5zZWdtZW50UGF0aCkge1xuICAgICAgICByZXR1cm4gWy4uLnJlcywgY21kLnNlZ21lbnRQYXRoXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoISh0eXBlb2YgY21kID09PSAnc3RyaW5nJykpIHtcbiAgICAgIHJldHVybiBbLi4ucmVzLCBjbWRdO1xuICAgIH1cblxuICAgIGlmIChjbWRJZHggPT09IDApIHtcbiAgICAgIGNtZC5zcGxpdCgnLycpLmZvckVhY2goKHVybFBhcnQsIHBhcnRJbmRleCkgPT4ge1xuICAgICAgICBpZiAocGFydEluZGV4ID09IDAgJiYgdXJsUGFydCA9PT0gJy4nKSB7XG4gICAgICAgICAgLy8gc2tpcCAnLi9hJ1xuICAgICAgICB9IGVsc2UgaWYgKHBhcnRJbmRleCA9PSAwICYmIHVybFBhcnQgPT09ICcnKSB7ICAvLyAgJy9hJ1xuICAgICAgICAgIGlzQWJzb2x1dGUgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHVybFBhcnQgPT09ICcuLicpIHsgIC8vICAnLi4vYSdcbiAgICAgICAgICBudW1iZXJPZkRvdWJsZURvdHMrKztcbiAgICAgICAgfSBlbHNlIGlmICh1cmxQYXJ0ICE9ICcnKSB7XG4gICAgICAgICAgcmVzLnB1c2godXJsUGFydCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIHJldHVybiBbLi4ucmVzLCBjbWRdO1xuICB9LCBbXSk7XG5cbiAgcmV0dXJuIG5ldyBOYXZpZ2F0aW9uKGlzQWJzb2x1dGUsIG51bWJlck9mRG91YmxlRG90cywgcmVzKTtcbn1cblxuY2xhc3MgUG9zaXRpb24ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHB1YmxpYyBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcHVibGljIHByb2Nlc3NDaGlsZHJlbjogYm9vbGVhbiwgcHVibGljIGluZGV4OiBudW1iZXIpIHtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kU3RhcnRpbmdQb3NpdGlvbkZvclRhcmdldEdyb3VwKFxuICAgIG5hdjogTmF2aWdhdGlvbiwgcm9vdDogVXJsU2VnbWVudEdyb3VwLCB0YXJnZXQ6IFVybFNlZ21lbnRHcm91cCk6IFBvc2l0aW9uIHtcbiAgaWYgKG5hdi5pc0Fic29sdXRlKSB7XG4gICAgcmV0dXJuIG5ldyBQb3NpdGlvbihyb290LCB0cnVlLCAwKTtcbiAgfVxuXG4gIGlmICghdGFyZ2V0KSB7XG4gICAgLy8gYE5hTmAgaXMgdXNlZCBvbmx5IHRvIG1haW50YWluIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IHdpdGggaW5jb3JyZWN0bHkgbW9ja2VkXG4gICAgLy8gYEFjdGl2YXRlZFJvdXRlU25hcHNob3RgIGluIHRlc3RzLiBJbiBwcmlvciB2ZXJzaW9ucyBvZiB0aGlzIGNvZGUsIHRoZSBwb3NpdGlvbiBoZXJlIHdhc1xuICAgIC8vIGRldGVybWluZWQgYmFzZWQgb24gYW4gaW50ZXJuYWwgcHJvcGVydHkgdGhhdCB3YXMgcmFyZWx5IG1vY2tlZCwgcmVzdWx0aW5nIGluIGBOYU5gLiBJblxuICAgIC8vIHJlYWxpdHksIHRoaXMgY29kZSBwYXRoIHNob3VsZCBfbmV2ZXJfIGJlIHRvdWNoZWQgc2luY2UgYHRhcmdldGAgaXMgbm90IGFsbG93ZWQgdG8gYmUgZmFsc2V5LlxuICAgIHJldHVybiBuZXcgUG9zaXRpb24ocm9vdCwgZmFsc2UsIE5hTik7XG4gIH1cbiAgaWYgKHRhcmdldC5wYXJlbnQgPT09IG51bGwpIHtcbiAgICByZXR1cm4gbmV3IFBvc2l0aW9uKHRhcmdldCwgdHJ1ZSwgMCk7XG4gIH1cblxuICBjb25zdCBtb2RpZmllciA9IGlzTWF0cml4UGFyYW1zKG5hdi5jb21tYW5kc1swXSkgPyAwIDogMTtcbiAgY29uc3QgaW5kZXggPSB0YXJnZXQuc2VnbWVudHMubGVuZ3RoIC0gMSArIG1vZGlmaWVyO1xuICByZXR1cm4gY3JlYXRlUG9zaXRpb25BcHBseWluZ0RvdWJsZURvdHModGFyZ2V0LCBpbmRleCwgbmF2Lm51bWJlck9mRG91YmxlRG90cyk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVBvc2l0aW9uQXBwbHlpbmdEb3VibGVEb3RzKFxuICAgIGdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIGluZGV4OiBudW1iZXIsIG51bWJlck9mRG91YmxlRG90czogbnVtYmVyKTogUG9zaXRpb24ge1xuICBsZXQgZyA9IGdyb3VwO1xuICBsZXQgY2kgPSBpbmRleDtcbiAgbGV0IGRkID0gbnVtYmVyT2ZEb3VibGVEb3RzO1xuICB3aGlsZSAoZGQgPiBjaSkge1xuICAgIGRkIC09IGNpO1xuICAgIGcgPSBnLnBhcmVudCE7XG4gICAgaWYgKCFnKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ET1VCTEVfRE9UUyxcbiAgICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJiAnSW52YWxpZCBudW1iZXIgb2YgXFwnLi4vXFwnJyk7XG4gICAgfVxuICAgIGNpID0gZy5zZWdtZW50cy5sZW5ndGg7XG4gIH1cbiAgcmV0dXJuIG5ldyBQb3NpdGlvbihnLCBmYWxzZSwgY2kgLSBkZCk7XG59XG5cbmZ1bmN0aW9uIGdldE91dGxldHMoY29tbWFuZHM6IHVua25vd25bXSk6IHtbazogc3RyaW5nXTogdW5rbm93bltdfHN0cmluZ30ge1xuICBpZiAoaXNDb21tYW5kV2l0aE91dGxldHMoY29tbWFuZHNbMF0pKSB7XG4gICAgcmV0dXJuIGNvbW1hbmRzWzBdLm91dGxldHM7XG4gIH1cblxuICByZXR1cm4ge1tQUklNQVJZX09VVExFVF06IGNvbW1hbmRzfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlU2VnbWVudEdyb3VwKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBzdGFydEluZGV4OiBudW1iZXIsIGNvbW1hbmRzOiBhbnlbXSk6IFVybFNlZ21lbnRHcm91cCB7XG4gIGlmICghc2VnbWVudEdyb3VwKSB7XG4gICAgc2VnbWVudEdyb3VwID0gbmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pO1xuICB9XG4gIGlmIChzZWdtZW50R3JvdXAuc2VnbWVudHMubGVuZ3RoID09PSAwICYmIHNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpKSB7XG4gICAgcmV0dXJuIHVwZGF0ZVNlZ21lbnRHcm91cENoaWxkcmVuKHNlZ21lbnRHcm91cCwgc3RhcnRJbmRleCwgY29tbWFuZHMpO1xuICB9XG5cbiAgY29uc3QgbSA9IHByZWZpeGVkV2l0aChzZWdtZW50R3JvdXAsIHN0YXJ0SW5kZXgsIGNvbW1hbmRzKTtcbiAgY29uc3Qgc2xpY2VkQ29tbWFuZHMgPSBjb21tYW5kcy5zbGljZShtLmNvbW1hbmRJbmRleCk7XG4gIGlmIChtLm1hdGNoICYmIG0ucGF0aEluZGV4IDwgc2VnbWVudEdyb3VwLnNlZ21lbnRzLmxlbmd0aCkge1xuICAgIGNvbnN0IGcgPSBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cC5zZWdtZW50cy5zbGljZSgwLCBtLnBhdGhJbmRleCksIHt9KTtcbiAgICBnLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSA9XG4gICAgICAgIG5ldyBVcmxTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLnNsaWNlKG0ucGF0aEluZGV4KSwgc2VnbWVudEdyb3VwLmNoaWxkcmVuKTtcbiAgICByZXR1cm4gdXBkYXRlU2VnbWVudEdyb3VwQ2hpbGRyZW4oZywgMCwgc2xpY2VkQ29tbWFuZHMpO1xuICB9IGVsc2UgaWYgKG0ubWF0Y2ggJiYgc2xpY2VkQ29tbWFuZHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLCB7fSk7XG4gIH0gZWxzZSBpZiAobS5tYXRjaCAmJiAhc2VnbWVudEdyb3VwLmhhc0NoaWxkcmVuKCkpIHtcbiAgICByZXR1cm4gY3JlYXRlTmV3U2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cCwgc3RhcnRJbmRleCwgY29tbWFuZHMpO1xuICB9IGVsc2UgaWYgKG0ubWF0Y2gpIHtcbiAgICByZXR1cm4gdXBkYXRlU2VnbWVudEdyb3VwQ2hpbGRyZW4oc2VnbWVudEdyb3VwLCAwLCBzbGljZWRDb21tYW5kcyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGNyZWF0ZU5ld1NlZ21lbnRHcm91cChzZWdtZW50R3JvdXAsIHN0YXJ0SW5kZXgsIGNvbW1hbmRzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVTZWdtZW50R3JvdXBDaGlsZHJlbihcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc3RhcnRJbmRleDogbnVtYmVyLCBjb21tYW5kczogYW55W10pOiBVcmxTZWdtZW50R3JvdXAge1xuICBpZiAoY29tbWFuZHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLCB7fSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3Qgb3V0bGV0cyA9IGdldE91dGxldHMoY29tbWFuZHMpO1xuICAgIGNvbnN0IGNoaWxkcmVuOiB7W2tleTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICAgIC8vIElmIHRoZSBzZXQgb2YgY29tbWFuZHMgZG9lcyBub3QgYXBwbHkgYW55dGhpbmcgdG8gdGhlIHByaW1hcnkgb3V0bGV0IGFuZCB0aGUgY2hpbGQgc2VnbWVudCBpc1xuICAgIC8vIGFuIGVtcHR5IHBhdGggcHJpbWFyeSBzZWdtZW50IG9uIGl0cyBvd24sIHdlIHdhbnQgdG8gc2tpcCBhcHBseWluZyB0aGUgY29tbWFuZHMgYXQgdGhpc1xuICAgIC8vIGxldmVsLiBJbWFnaW5lIHRoZSBmb2xsb3dpbmcgY29uZmlnOlxuICAgIC8vXG4gICAgLy8ge3BhdGg6ICcnLCBjaGlsZHJlbjogW3twYXRoOiAnKionLCBvdXRsZXQ6ICdwb3B1cCd9XX0uXG4gICAgLy9cbiAgICAvLyBOYXZpZ2F0aW9uIHRvIC8ocG9wdXA6YSkgd2lsbCBhY3RpdmF0ZSB0aGUgY2hpbGQgb3V0bGV0IGNvcnJlY3RseSBHaXZlbiBhIGZvbGxvdy11cFxuICAgIC8vIG5hdmlnYXRpb24gd2l0aCBjb21tYW5kc1xuICAgIC8vIFsnLycsIHtvdXRsZXRzOiB7J3BvcHVwJzogJ2InfX1dLCB3ZSBfd291bGQgbm90XyB3YW50IHRvIGFwcGx5IHRoZSBvdXRsZXQgY29tbWFuZHMgdG8gdGhlXG4gICAgLy8gcm9vdCBzZWdtZW50IGJlY2F1c2UgdGhhdCB3b3VsZCByZXN1bHQgaW5cbiAgICAvLyAvLyhwb3B1cDphKShwb3B1cDpiKSBzaW5jZSB0aGUgb3V0bGV0IGNvbW1hbmQgZ290IGFwcGxpZWQgb25lIGxldmVsIGFib3ZlIHdoZXJlIGl0IGFwcGVhcnMgaW5cbiAgICAvLyB0aGUgYEFjdGl2YXRlZFJvdXRlYCByYXRoZXIgdGhhbiB1cGRhdGluZyB0aGUgZXhpc3Rpbmcgb25lLlxuICAgIC8vXG4gICAgLy8gQmVjYXVzZSBlbXB0eSBwYXRocyBkbyBub3QgYXBwZWFyIGluIHRoZSBVUkwgc2VnbWVudHMgYW5kIHRoZSBmYWN0IHRoYXQgdGhlIHNlZ21lbnRzIHVzZWQgaW5cbiAgICAvLyB0aGUgb3V0cHV0IGBVcmxUcmVlYCBhcmUgc3F1YXNoZWQgdG8gZWxpbWluYXRlIHRoZXNlIGVtcHR5IHBhdGhzIHdoZXJlIHBvc3NpYmxlXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9ibG9iLzEzZjEwZGU0MGUyNWM2OTAwY2E1NWJkODNiMzZiZDUzM2RhY2ZhOWUvcGFja2FnZXMvcm91dGVyL3NyYy91cmxfdHJlZS50cyNMNzU1XG4gICAgLy8gaXQgY2FuIGJlIGhhcmQgdG8gZGV0ZXJtaW5lIHdoYXQgaXMgdGhlIHJpZ2h0IHRoaW5nIHRvIGRvIHdoZW4gYXBwbHlpbmcgY29tbWFuZHMgdG8gYVxuICAgIC8vIGBVcmxTZWdtZW50R3JvdXBgIHRoYXQgaXMgY3JlYXRlZCBmcm9tIGFuIFwidW5zcXVhc2hlZFwiL2V4cGFuZGVkIGBBY3RpdmF0ZWRSb3V0ZWAgdHJlZS5cbiAgICAvLyBUaGlzIGNvZGUgZWZmZWN0aXZlbHkgXCJzcXVhc2hlc1wiIGVtcHR5IHBhdGggcHJpbWFyeSByb3V0ZXMgd2hlbiB0aGV5IGhhdmUgbm8gc2libGluZ3Mgb25cbiAgICAvLyB0aGUgc2FtZSBsZXZlbCBvZiB0aGUgdHJlZS5cbiAgICBpZiAoIW91dGxldHNbUFJJTUFSWV9PVVRMRVRdICYmIHNlZ21lbnRHcm91cC5jaGlsZHJlbltQUklNQVJZX09VVExFVF0gJiZcbiAgICAgICAgc2VnbWVudEdyb3VwLm51bWJlck9mQ2hpbGRyZW4gPT09IDEgJiZcbiAgICAgICAgc2VnbWVudEdyb3VwLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXS5zZWdtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB1cGRhdGVTZWdtZW50R3JvdXBDaGlsZHJlbihcbiAgICAgICAgICBzZWdtZW50R3JvdXAuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdLCBzdGFydEluZGV4LCBjb21tYW5kcyk7XG4gICAgfVxuXG4gICAgT2JqZWN0LmVudHJpZXMob3V0bGV0cykuZm9yRWFjaCgoW291dGxldCwgY29tbWFuZHNdKSA9PiB7XG4gICAgICBpZiAodHlwZW9mIGNvbW1hbmRzID09PSAnc3RyaW5nJykge1xuICAgICAgICBjb21tYW5kcyA9IFtjb21tYW5kc107XG4gICAgICB9XG4gICAgICBpZiAoY29tbWFuZHMgIT09IG51bGwpIHtcbiAgICAgICAgY2hpbGRyZW5bb3V0bGV0XSA9IHVwZGF0ZVNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuY2hpbGRyZW5bb3V0bGV0XSwgc3RhcnRJbmRleCwgY29tbWFuZHMpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmVudHJpZXMoc2VnbWVudEdyb3VwLmNoaWxkcmVuKS5mb3JFYWNoKChbY2hpbGRPdXRsZXQsIGNoaWxkXSkgPT4ge1xuICAgICAgaWYgKG91dGxldHNbY2hpbGRPdXRsZXRdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY2hpbGRyZW5bY2hpbGRPdXRsZXRdID0gY2hpbGQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLCBjaGlsZHJlbik7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJlZml4ZWRXaXRoKHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBzdGFydEluZGV4OiBudW1iZXIsIGNvbW1hbmRzOiBhbnlbXSkge1xuICBsZXQgY3VycmVudENvbW1hbmRJbmRleCA9IDA7XG4gIGxldCBjdXJyZW50UGF0aEluZGV4ID0gc3RhcnRJbmRleDtcblxuICBjb25zdCBub01hdGNoID0ge21hdGNoOiBmYWxzZSwgcGF0aEluZGV4OiAwLCBjb21tYW5kSW5kZXg6IDB9O1xuICB3aGlsZSAoY3VycmVudFBhdGhJbmRleCA8IHNlZ21lbnRHcm91cC5zZWdtZW50cy5sZW5ndGgpIHtcbiAgICBpZiAoY3VycmVudENvbW1hbmRJbmRleCA+PSBjb21tYW5kcy5sZW5ndGgpIHJldHVybiBub01hdGNoO1xuICAgIGNvbnN0IHBhdGggPSBzZWdtZW50R3JvdXAuc2VnbWVudHNbY3VycmVudFBhdGhJbmRleF07XG4gICAgY29uc3QgY29tbWFuZCA9IGNvbW1hbmRzW2N1cnJlbnRDb21tYW5kSW5kZXhdO1xuICAgIC8vIERvIG5vdCB0cnkgdG8gY29uc3VtZSBjb21tYW5kIGFzIHBhcnQgb2YgdGhlIHByZWZpeGluZyBpZiBpdCBoYXMgb3V0bGV0cyBiZWNhdXNlIGl0IGNhblxuICAgIC8vIGNvbnRhaW4gb3V0bGV0cyBvdGhlciB0aGFuIHRoZSBvbmUgYmVpbmcgcHJvY2Vzc2VkLiBDb25zdW1pbmcgdGhlIG91dGxldHMgY29tbWFuZCB3b3VsZFxuICAgIC8vIHJlc3VsdCBpbiBvdGhlciBvdXRsZXRzIGJlaW5nIGlnbm9yZWQuXG4gICAgaWYgKGlzQ29tbWFuZFdpdGhPdXRsZXRzKGNvbW1hbmQpKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY29uc3QgY3VyciA9IGAke2NvbW1hbmR9YDtcbiAgICBjb25zdCBuZXh0ID1cbiAgICAgICAgY3VycmVudENvbW1hbmRJbmRleCA8IGNvbW1hbmRzLmxlbmd0aCAtIDEgPyBjb21tYW5kc1tjdXJyZW50Q29tbWFuZEluZGV4ICsgMV0gOiBudWxsO1xuXG4gICAgaWYgKGN1cnJlbnRQYXRoSW5kZXggPiAwICYmIGN1cnIgPT09IHVuZGVmaW5lZCkgYnJlYWs7XG5cbiAgICBpZiAoY3VyciAmJiBuZXh0ICYmICh0eXBlb2YgbmV4dCA9PT0gJ29iamVjdCcpICYmIG5leHQub3V0bGV0cyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoIWNvbXBhcmUoY3VyciwgbmV4dCwgcGF0aCkpIHJldHVybiBub01hdGNoO1xuICAgICAgY3VycmVudENvbW1hbmRJbmRleCArPSAyO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWNvbXBhcmUoY3Vyciwge30sIHBhdGgpKSByZXR1cm4gbm9NYXRjaDtcbiAgICAgIGN1cnJlbnRDb21tYW5kSW5kZXgrKztcbiAgICB9XG4gICAgY3VycmVudFBhdGhJbmRleCsrO1xuICB9XG5cbiAgcmV0dXJuIHttYXRjaDogdHJ1ZSwgcGF0aEluZGV4OiBjdXJyZW50UGF0aEluZGV4LCBjb21tYW5kSW5kZXg6IGN1cnJlbnRDb21tYW5kSW5kZXh9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVOZXdTZWdtZW50R3JvdXAoXG4gICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHN0YXJ0SW5kZXg6IG51bWJlciwgY29tbWFuZHM6IGFueVtdKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgY29uc3QgcGF0aHMgPSBzZWdtZW50R3JvdXAuc2VnbWVudHMuc2xpY2UoMCwgc3RhcnRJbmRleCk7XG5cbiAgbGV0IGkgPSAwO1xuICB3aGlsZSAoaSA8IGNvbW1hbmRzLmxlbmd0aCkge1xuICAgIGNvbnN0IGNvbW1hbmQgPSBjb21tYW5kc1tpXTtcbiAgICBpZiAoaXNDb21tYW5kV2l0aE91dGxldHMoY29tbWFuZCkpIHtcbiAgICAgIGNvbnN0IGNoaWxkcmVuID0gY3JlYXRlTmV3U2VnbWVudENoaWxkcmVuKGNvbW1hbmQub3V0bGV0cyk7XG4gICAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChwYXRocywgY2hpbGRyZW4pO1xuICAgIH1cblxuICAgIC8vIGlmIHdlIHN0YXJ0IHdpdGggYW4gb2JqZWN0IGxpdGVyYWwsIHdlIG5lZWQgdG8gcmV1c2UgdGhlIHBhdGggcGFydCBmcm9tIHRoZSBzZWdtZW50XG4gICAgaWYgKGkgPT09IDAgJiYgaXNNYXRyaXhQYXJhbXMoY29tbWFuZHNbMF0pKSB7XG4gICAgICBjb25zdCBwID0gc2VnbWVudEdyb3VwLnNlZ21lbnRzW3N0YXJ0SW5kZXhdO1xuICAgICAgcGF0aHMucHVzaChuZXcgVXJsU2VnbWVudChwLnBhdGgsIHN0cmluZ2lmeShjb21tYW5kc1swXSkpKTtcbiAgICAgIGkrKztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IGN1cnIgPSBpc0NvbW1hbmRXaXRoT3V0bGV0cyhjb21tYW5kKSA/IGNvbW1hbmQub3V0bGV0c1tQUklNQVJZX09VVExFVF0gOiBgJHtjb21tYW5kfWA7XG4gICAgY29uc3QgbmV4dCA9IChpIDwgY29tbWFuZHMubGVuZ3RoIC0gMSkgPyBjb21tYW5kc1tpICsgMV0gOiBudWxsO1xuICAgIGlmIChjdXJyICYmIG5leHQgJiYgaXNNYXRyaXhQYXJhbXMobmV4dCkpIHtcbiAgICAgIHBhdGhzLnB1c2gobmV3IFVybFNlZ21lbnQoY3Vyciwgc3RyaW5naWZ5KG5leHQpKSk7XG4gICAgICBpICs9IDI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhdGhzLnB1c2gobmV3IFVybFNlZ21lbnQoY3Vyciwge30pKTtcbiAgICAgIGkrKztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAocGF0aHMsIHt9KTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTmV3U2VnbWVudENoaWxkcmVuKG91dGxldHM6IHtbbmFtZTogc3RyaW5nXTogdW5rbm93bltdfHN0cmluZ30pOlxuICAgIHtbb3V0bGV0OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9IHtcbiAgY29uc3QgY2hpbGRyZW46IHtbb3V0bGV0OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gIE9iamVjdC5lbnRyaWVzKG91dGxldHMpLmZvckVhY2goKFtvdXRsZXQsIGNvbW1hbmRzXSkgPT4ge1xuICAgIGlmICh0eXBlb2YgY29tbWFuZHMgPT09ICdzdHJpbmcnKSB7XG4gICAgICBjb21tYW5kcyA9IFtjb21tYW5kc107XG4gICAgfVxuICAgIGlmIChjb21tYW5kcyAhPT0gbnVsbCkge1xuICAgICAgY2hpbGRyZW5bb3V0bGV0XSA9IGNyZWF0ZU5ld1NlZ21lbnRHcm91cChuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCB7fSksIDAsIGNvbW1hbmRzKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gY2hpbGRyZW47XG59XG5cbmZ1bmN0aW9uIHN0cmluZ2lmeShwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBhbnl9KToge1trZXk6IHN0cmluZ106IHN0cmluZ30ge1xuICBjb25zdCByZXM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gIE9iamVjdC5lbnRyaWVzKHBhcmFtcykuZm9yRWFjaCgoW2ssIHZdKSA9PiByZXNba10gPSBgJHt2fWApO1xuICByZXR1cm4gcmVzO1xufVxuXG5mdW5jdGlvbiBjb21wYXJlKHBhdGg6IHN0cmluZywgcGFyYW1zOiB7W2tleTogc3RyaW5nXTogYW55fSwgc2VnbWVudDogVXJsU2VnbWVudCk6IGJvb2xlYW4ge1xuICByZXR1cm4gcGF0aCA9PSBzZWdtZW50LnBhdGggJiYgc2hhbGxvd0VxdWFsKHBhcmFtcywgc2VnbWVudC5wYXJhbWV0ZXJzKTtcbn1cbiJdfQ==