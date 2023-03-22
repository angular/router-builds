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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlX3VybF90cmVlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jcmVhdGVfdXJsX3RyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLGFBQWEsSUFBSSxZQUFZLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFJNUQsT0FBTyxFQUFTLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNoRCxPQUFPLEVBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ2hHLE9BQU8sRUFBQyxJQUFJLEVBQUUsWUFBWSxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFFdEQsTUFBTSxXQUFXLEdBQUcsT0FBTyxTQUFTLEtBQUssV0FBVyxJQUFJLFNBQVMsQ0FBQztBQUVsRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrREc7QUFDSCxNQUFNLFVBQVUseUJBQXlCLENBQ3JDLFVBQWtDLEVBQUUsUUFBZSxFQUFFLGNBQTJCLElBQUksRUFDcEYsV0FBd0IsSUFBSTtJQUM5QixNQUFNLHlCQUF5QixHQUFHLDJCQUEyQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzFFLE9BQU8sNkJBQTZCLENBQUMseUJBQXlCLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUNuRyxDQUFDO0FBRUQsTUFBTSxVQUFVLDJCQUEyQixDQUFDLEtBQTZCO0lBQ3ZFLElBQUksV0FBc0MsQ0FBQztJQUUzQyxTQUFTLG9DQUFvQyxDQUFDLFlBQW9DO1FBRWhGLE1BQU0sWUFBWSxHQUF3QyxFQUFFLENBQUM7UUFDN0QsS0FBSyxNQUFNLGFBQWEsSUFBSSxZQUFZLENBQUMsUUFBUSxFQUFFO1lBQ2pELE1BQU0sSUFBSSxHQUFH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QUMsQ0FBQztTQUN2QjtRQUNELElBQUksUUFBUSxLQUFLLElBQUksRUFBRTtZQUNyQixRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcscUJBQXFCLENBQUMsSUFBSSxlQUFlLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztTQUNwRjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLE1BQTRCO0lBQzdDLE1BQU0sR0FBRyxHQUE0QixFQUFFLENBQUM7SUFDeEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM1RCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FBQyxJQUFZLEVBQUUsTUFBNEIsRUFBRSxPQUFtQjtJQUM5RSxPQUFPLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHvJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQge1J1bnRpbWVFcnJvckNvZGV9IGZyb20gJy4vZXJyb3JzJztcbmltcG9ydCB7QWN0aXZhdGVkUm91dGVTbmFwc2hvdH0gZnJvbSAnLi9yb3V0ZXJfc3RhdGUnO1xuaW1wb3J0IHtQYXJhbXMsIFBSSU1BUllfT1VUTEVUfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge2NyZWF0ZVJvb3QsIHNxdWFzaFNlZ21lbnRHcm91cCwgVXJsU2VnbWVudCwgVXJsU2VnbWVudEdyb3VwLCBVcmxUcmVlfSBmcm9tICcuL3VybF90cmVlJztcbmltcG9ydCB7bGFzdCwgc2hhbGxvd0VxdWFsfSBmcm9tICcuL3V0aWxzL2NvbGxlY3Rpb24nO1xuXG5jb25zdCBOR19ERVZfTU9ERSA9IHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgYFVybFRyZWVgIHJlbGF0aXZlIHRvIGFuIGBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90YC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKlxuICpcbiAqIEBwYXJhbSByZWxhdGl2ZVRvIFRoZSBgQWN0aXZhdGVkUm91dGVTbmFwc2hvdGAgdG8gYXBwbHkgdGhlIGNvbW1hbmRzIHRvXG4gKiBAcGFyYW0gY29tbWFuZHMgQW4gYXJyYXkgb2YgVVJMIGZyYWdtZW50cyB3aXRoIHdoaWNoIHRvIGNvbnN0cnVjdCB0aGUgbmV3IFVSTCB0cmVlLlxuICogSWYgdGhlIHBhdGggaXMgc3RhdGljLCBjYW4gYmUgdGhlIGxpdGVyYWwgVVJMIHN0cmluZy4gRm9yIGEgZHluYW1pYyBwYXRoLCBwYXNzIGFuIGFycmF5IG9mIHBhdGhcbiAqIHNlZ21lbnRzLCBmb2xsb3dlZCBieSB0aGUgcGFyYW1ldGVycyBmb3IgZWFjaCBzZWdtZW50LlxuICogVGhlIGZyYWdtZW50cyBhcmUgYXBwbGllZCB0byB0aGUgb25lIHByb3ZpZGVkIGluIHRoZSBgcmVsYXRpdmVUb2AgcGFyYW1ldGVyLlxuICogQHBhcmFtIHF1ZXJ5UGFyYW1zIFRoZSBxdWVyeSBwYXJhbWV0ZXJzIGZvciB0aGUgYFVybFRyZWVgLiBgbnVsbGAgaWYgdGhlIGBVcmxUcmVlYCBkb2VzIG5vdCBoYXZlXG4gKiAgICAgYW55IHF1ZXJ5IHBhcmFtZXRlcnMuXG4gKiBAcGFyYW0gZnJhZ21lbnQgVGhlIGZyYWdtZW50IGZvciB0aGUgYFVybFRyZWVgLiBgbnVsbGAgaWYgdGhlIGBVcmxUcmVlYCBkb2VzIG5vdCBoYXZlIGEgZnJhZ21lbnQuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqXG4gKiBgYGBcbiAqIC8vIGNyZWF0ZSAvdGVhbS8zMy91c2VyLzExXG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJy90ZWFtJywgMzMsICd1c2VyJywgMTFdKTtcbiAqXG4gKiAvLyBjcmVhdGUgL3RlYW0vMzM7ZXhwYW5kPXRydWUvdXNlci8xMVxuICogY3JlYXRlVXJsVHJlZUZyb21TbmFwc2hvdChzbmFwc2hvdCwgWycvdGVhbScsIDMzLCB7ZXhwYW5kOiB0cnVlfSwgJ3VzZXInLCAxMV0pO1xuICpcbiAqIC8vIHlvdSBjYW4gY29sbGFwc2Ugc3RhdGljIHNlZ21lbnRzIGxpa2UgdGhpcyAodGhpcyB3b3JrcyBvbmx5IHdpdGggdGhlIGZpcnN0IHBhc3NlZC1pbiB2YWx1ZSk6XG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJy90ZWFtLzMzL3VzZXInLCB1c2VySWRdKTtcbiAqXG4gKiAvLyBJZiB0aGUgZmlyc3Qgc2VnbWVudCBjYW4gY29udGFpbiBzbGFzaGVzLCBhbmQgeW91IGRvIG5vdCB3YW50IHRoZSByb3V0ZXIgdG8gc3BsaXQgaXQsXG4gKiAvLyB5b3UgY2FuIGRvIHRoZSBmb2xsb3dpbmc6XG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbe3NlZ21lbnRQYXRoOiAnL29uZS90d28nfV0pO1xuICpcbiAqIC8vIGNyZWF0ZSAvdGVhbS8zMy8odXNlci8xMS8vcmlnaHQ6Y2hhdClcbiAqIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qoc25hcHNob3QsIFsnL3RlYW0nLCAzMywge291dGxldHM6IHtwcmltYXJ5OiAndXNlci8xMScsIHJpZ2h0OlxuICogJ2NoYXQnfX1dLCBudWxsLCBudWxsKTtcbiAqXG4gKiAvLyByZW1vdmUgdGhlIHJpZ2h0IHNlY29uZGFyeSBub2RlXG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJy90ZWFtJywgMzMsIHtvdXRsZXRzOiB7cHJpbWFyeTogJ3VzZXIvMTEnLCByaWdodDogbnVsbH19XSk7XG4gKlxuICogLy8gRm9yIHRoZSBleGFtcGxlcyBiZWxvdywgYXNzdW1lIHRoZSBjdXJyZW50IFVSTCBpcyBmb3IgdGhlIGAvdGVhbS8zMy91c2VyLzExYCBhbmQgdGhlXG4gKiBgQWN0aXZhdGVkUm91dGVTbmFwc2hvdGAgcG9pbnRzIHRvIGB1c2VyLzExYDpcbiAqXG4gKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzExL2RldGFpbHNcbiAqIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qoc25hcHNob3QsIFsnZGV0YWlscyddKTtcbiAqXG4gKiAvLyBuYXZpZ2F0ZSB0byAvdGVhbS8zMy91c2VyLzIyXG4gKiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KHNuYXBzaG90LCBbJy4uLzIyJ10pO1xuICpcbiAqIC8vIG5hdmlnYXRlIHRvIC90ZWFtLzQ0L3VzZXIvMjJcbiAqIGNyZWF0ZVVybFRyZWVGcm9tU25hcHNob3Qoc25hcHNob3QsIFsnLi4vLi4vdGVhbS80NC91c2VyLzIyJ10pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVVcmxUcmVlRnJvbVNuYXBzaG90KFxuICAgIHJlbGF0aXZlVG86IEFjdGl2YXRlZFJvdXRlU25hcHNob3QsIGNvbW1hbmRzOiBhbnlbXSwgcXVlcnlQYXJhbXM6IFBhcmFtc3xudWxsID0gbnVsbCxcbiAgICBmcmFnbWVudDogc3RyaW5nfG51bGwgPSBudWxsKTogVXJsVHJlZSB7XG4gIGNvbnN0IHJlbGF0aXZlVG9VcmxTZWdtZW50R3JvdXAgPSBjcmVhdGVTZWdtZW50R3JvdXBGcm9tUm91dGUocmVsYXRpdmVUbyk7XG4gIHJldHVybiBjcmVhdGVVcmxUcmVlRnJvbVNlZ21lbnRHcm91cChyZWxhdGl2ZVRvVXJsU2VnbWVudEdyb3VwLCBjb21tYW5kcywgcXVlcnlQYXJhbXMsIGZyYWdtZW50KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNlZ21lbnRHcm91cEZyb21Sb3V0ZShyb3V0ZTogQWN0aXZhdGVkUm91dGVTbmFwc2hvdCk6IFVybFNlZ21lbnRHcm91cCB7XG4gIGxldCB0YXJnZXRHcm91cDogVXJsU2VnbWVudEdyb3VwfHVuZGVmaW5lZDtcblxuICBmdW5jdGlvbiBjcmVhdGVTZWdtZW50R3JvdXBGcm9tUm91dGVSZWN1cnNpdmUoY3VycmVudFJvdXRlOiBBY3RpdmF0ZWRSb3V0ZVNuYXBzaG90KTpcbiAgICAgIFVybFNlZ21lbnRHcm91cCB7XG4gICAgY29uc3QgY2hpbGRPdXRsZXRzOiB7W291dGxldDogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICAgIGZvciAoY29uc3QgY2hpbGRTbmFwc2hvdCBvZiBjdXJyZW50Um91dGUuY2hpbGRyZW4pIHtcbiAgICAgIGNvbnN0IHJvb3QgPSBjcmVhdGVTZWdtZW50R3JvdXBGcm9tUm91dGVSZWN1cnNpdmUoY2hpbGRTbmFwc2hvdCk7XG4gICAgICBjaGlsZE91dGxldHNbY2hpbGRTbmFwc2hvdC5vdXRsZXRdID0gcm9vdDtcbiAgICB9XG4gICAgY29uc3Qgc2VnbWVudEdyb3VwID0gbmV3IFVybFNlZ21lbnRHcm91cChjdXJyZW50Um91dGUudXJsLCBjaGlsZE91dGxldHMpO1xuICAgIGlmIChjdXJyZW50Um91dGUgPT09IHJvdXRlKSB7XG4gICAgICB0YXJnZXRHcm91cCA9IHNlZ21lbnRHcm91cDtcbiAgICB9XG4gICAgcmV0dXJuIHNlZ21lbnRHcm91cDtcbiAgfVxuICBjb25zdCByb290Q2FuZGlkYXRlID0gY3JlYXRlU2VnbWVudEdyb3VwRnJvbVJvdXRlUmVjdXJzaXZlKHJvdXRlLnJvb3QpO1xuICBjb25zdCByb290U2VnbWVudEdyb3VwID0gY3JlYXRlUm9vdChyb290Q2FuZGlkYXRlKTtcblxuICByZXR1cm4gdGFyZ2V0R3JvdXAgPz8gcm9vdFNlZ21lbnRHcm91cDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVVybFRyZWVGcm9tU2VnbWVudEdyb3VwKFxuICAgIHJlbGF0aXZlVG86IFVybFNlZ21lbnRHcm91cCwgY29tbWFuZHM6IGFueVtdLCBxdWVyeVBhcmFtczogUGFyYW1zfG51bGwsXG4gICAgZnJhZ21lbnQ6IHN0cmluZ3xudWxsKTogVXJsVHJlZSB7XG4gIGxldCByb290ID0gcmVsYXRpdmVUbztcbiAgd2hpbGUgKHJvb3QucGFyZW50KSB7XG4gICAgcm9vdCA9IHJvb3QucGFyZW50O1xuICB9XG4gIC8vIFRoZXJlIGFyZSBubyBjb21tYW5kcyBzbyB0aGUgYFVybFRyZWVgIGdvZXMgdG8gdGhlIHNhbWUgcGF0aCBhcyB0aGUgb25lIGNyZWF0ZWQgZnJvbSB0aGVcbiAgLy8gYFVybFNlZ21lbnRHcm91cGAuIEFsbCB3ZSBuZWVkIHRvIGRvIGlzIHVwZGF0ZSB0aGUgYHF1ZXJ5UGFyYW1zYCBhbmQgYGZyYWdtZW50YCB3aXRob3V0XG4gIC8vIGFwcGx5aW5nIGFueSBvdGhlciBsb2dpYy5cbiAgaWYgKGNvbW1hbmRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB0cmVlKHJvb3QsIHJvb3QsIHJvb3QsIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCk7XG4gIH1cblxuICBjb25zdCBuYXYgPSBjb21wdXRlTmF2aWdhdGlvbihjb21tYW5kcyk7XG5cbiAgaWYgKG5hdi50b1Jvb3QoKSkge1xuICAgIHJldHVybiB0cmVlKHJvb3QsIHJvb3QsIG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KSwgcXVlcnlQYXJhbXMsIGZyYWdtZW50KTtcbiAgfVxuXG4gIGNvbnN0IHBvc2l0aW9uID0gZmluZFN0YXJ0aW5nUG9zaXRpb25Gb3JUYXJnZXRHcm91cChuYXYsIHJvb3QsIHJlbGF0aXZlVG8pO1xuICBjb25zdCBuZXdTZWdtZW50R3JvdXAgPSBwb3NpdGlvbi5wcm9jZXNzQ2hpbGRyZW4gP1xuICAgICAgdXBkYXRlU2VnbWVudEdyb3VwQ2hpbGRyZW4ocG9zaXRpb24uc2VnbWVudEdyb3VwLCBwb3NpdGlvbi5pbmRleCwgbmF2LmNvbW1hbmRzKSA6XG4gICAgICB1cGRhdGVTZWdtZW50R3JvdXAocG9zaXRpb24uc2VnbWVudEdyb3VwLCBwb3NpdGlvbi5pbmRleCwgbmF2LmNvbW1hbmRzKTtcbiAgcmV0dXJuIHRyZWUocm9vdCwgcG9zaXRpb24uc2VnbWVudEdyb3VwLCBuZXdTZWdtZW50R3JvdXAsIHF1ZXJ5UGFyYW1zLCBmcmFnbWVudCk7XG59XG5cbmZ1bmN0aW9uIGlzTWF0cml4UGFyYW1zKGNvbW1hbmQ6IGFueSk6IGJvb2xlYW4ge1xuICByZXR1cm4gdHlwZW9mIGNvbW1hbmQgPT09ICdvYmplY3QnICYmIGNvbW1hbmQgIT0gbnVsbCAmJiAhY29tbWFuZC5vdXRsZXRzICYmICFjb21tYW5kLnNlZ21lbnRQYXRoO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgYSBnaXZlbiBjb21tYW5kIGhhcyBhbiBgb3V0bGV0c2AgbWFwLiBXaGVuIHdlIGVuY291bnRlciBhIGNvbW1hbmRcbiAqIHdpdGggYW4gb3V0bGV0cyBrL3YgbWFwLCB3ZSBuZWVkIHRvIGFwcGx5IGVhY2ggb3V0bGV0IGluZGl2aWR1YWxseSB0byB0aGUgZXhpc3Rpbmcgc2VnbWVudC5cbiAqL1xuZnVuY3Rpb24gaXNDb21tYW5kV2l0aE91dGxldHMoY29tbWFuZDogYW55KTogY29tbWFuZCBpcyB7b3V0bGV0czoge1trZXk6IHN0cmluZ106IGFueX19IHtcbiAgcmV0dXJuIHR5cGVvZiBjb21tYW5kID09PSAnb2JqZWN0JyAmJiBjb21tYW5kICE9IG51bGwgJiYgY29tbWFuZC5vdXRsZXRzO1xufVxuXG5mdW5jdGlvbiB0cmVlKFxuICAgIG9sZFJvb3Q6IFVybFNlZ21lbnRHcm91cCwgb2xkU2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIG5ld1NlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLFxuICAgIHF1ZXJ5UGFyYW1zOiBQYXJhbXN8bnVsbCwgZnJhZ21lbnQ6IHN0cmluZ3xudWxsKTogVXJsVHJlZSB7XG4gIGxldCBxcDogYW55ID0ge307XG4gIGlmIChxdWVyeVBhcmFtcykge1xuICAgIE9iamVjdC5lbnRyaWVzKHF1ZXJ5UGFyYW1zKS5mb3JFYWNoKChbbmFtZSwgdmFsdWVdKSA9PiB7XG4gICAgICBxcFtuYW1lXSA9IEFycmF5LmlzQXJyYXkodmFsdWUpID8gdmFsdWUubWFwKCh2OiBhbnkpID0+IGAke3Z9YCkgOiBgJHt2YWx1ZX1gO1xuICAgIH0pO1xuICB9XG5cbiAgbGV0IHJvb3RDYW5kaWRhdGU6IFVybFNlZ21lbnRHcm91cDtcbiAgaWYgKG9sZFJvb3QgPT09IG9sZFNlZ21lbnRHcm91cCkge1xuICAgIHJvb3RDYW5kaWRhdGUgPSBuZXdTZWdtZW50R3JvdXA7XG4gIH0gZWxzZSB7XG4gICAgcm9vdENhbmRpZGF0ZSA9IHJlcGxhY2VTZWdtZW50KG9sZFJvb3QsIG9sZFNlZ21lbnRHcm91cCwgbmV3U2VnbWVudEdyb3VwKTtcbiAgfVxuXG4gIGNvbnN0IG5ld1Jvb3QgPSBjcmVhdGVSb290KHNxdWFzaFNlZ21lbnRHcm91cChyb290Q2FuZGlkYXRlKSk7XG4gIHJldHVybiBuZXcgVXJsVHJlZShuZXdSb290LCBxcCwgZnJhZ21lbnQpO1xufVxuXG4vKipcbiAqIFJlcGxhY2VzIHRoZSBgb2xkU2VnbWVudGAgd2hpY2ggaXMgbG9jYXRlZCBpbiBzb21lIGNoaWxkIG9mIHRoZSBgY3VycmVudGAgd2l0aCB0aGUgYG5ld1NlZ21lbnRgLlxuICogVGhpcyBhbHNvIGhhcyB0aGUgZWZmZWN0IG9mIGNyZWF0aW5nIG5ldyBgVXJsU2VnbWVudEdyb3VwYCBjb3BpZXMgdG8gdXBkYXRlIHJlZmVyZW5jZXMuIFRoaXNcbiAqIHNob3VsZG4ndCBiZSBuZWNlc3NhcnkgYnV0IHRoZSBmYWxsYmFjayBsb2dpYyBmb3IgYW4gaW52YWxpZCBBY3RpdmF0ZWRSb3V0ZSBpbiB0aGUgY3JlYXRpb24gdXNlc1xuICogdGhlIFJvdXRlcidzIGN1cnJlbnQgdXJsIHRyZWUuIElmIHdlIGRvbid0IGNyZWF0ZSBuZXcgc2VnbWVudCBncm91cHMsIHdlIGVuZCB1cCBtb2RpZnlpbmcgdGhhdFxuICogdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIHJlcGxhY2VTZWdtZW50KFxuICAgIGN1cnJlbnQ6IFVybFNlZ21lbnRHcm91cCwgb2xkU2VnbWVudDogVXJsU2VnbWVudEdyb3VwLFxuICAgIG5ld1NlZ21lbnQ6IFVybFNlZ21lbnRHcm91cCk6IFVybFNlZ21lbnRHcm91cCB7XG4gIGNvbnN0IGNoaWxkcmVuOiB7W2tleTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICBPYmplY3QuZW50cmllcyhjdXJyZW50LmNoaWxkcmVuKS5mb3JFYWNoKChbb3V0bGV0TmFtZSwgY10pID0+IHtcbiAgICBpZiAoYyA9PT0gb2xkU2VnbWVudCkge1xuICAgICAgY2hpbGRyZW5bb3V0bGV0TmFtZV0gPSBuZXdTZWdtZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICBjaGlsZHJlbltvdXRsZXROYW1lXSA9IHJlcGxhY2VTZWdtZW50KGMsIG9sZFNlZ21lbnQsIG5ld1NlZ21lbnQpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKGN1cnJlbnQuc2VnbWVudHMsIGNoaWxkcmVuKTtcbn1cblxuY2xhc3MgTmF2aWdhdGlvbiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHVibGljIGlzQWJzb2x1dGU6IGJvb2xlYW4sIHB1YmxpYyBudW1iZXJPZkRvdWJsZURvdHM6IG51bWJlciwgcHVibGljIGNvbW1hbmRzOiBhbnlbXSkge1xuICAgIGlmIChpc0Fic29sdXRlICYmIGNvbW1hbmRzLmxlbmd0aCA+IDAgJiYgaXNNYXRyaXhQYXJhbXMoY29tbWFuZHNbMF0pKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuUk9PVF9TRUdNRU5UX01BVFJJWF9QQVJBTVMsXG4gICAgICAgICAgTkdfREVWX01PREUgJiYgJ1Jvb3Qgc2VnbWVudCBjYW5ub3QgaGF2ZSBtYXRyaXggcGFyYW1ldGVycycpO1xuICAgIH1cblxuICAgIGNvbnN0IGNtZFdpdGhPdXRsZXQgPSBjb21tYW5kcy5maW5kKGlzQ29tbWFuZFdpdGhPdXRsZXRzKTtcbiAgICBpZiAoY21kV2l0aE91dGxldCAmJiBjbWRXaXRoT3V0bGV0ICE9PSBsYXN0KGNvbW1hbmRzKSkge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLk1JU1BMQUNFRF9PVVRMRVRTX0NPTU1BTkQsXG4gICAgICAgICAgTkdfREVWX01PREUgJiYgJ3tvdXRsZXRzOnt9fSBoYXMgdG8gYmUgdGhlIGxhc3QgY29tbWFuZCcpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyB0b1Jvb3QoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuaXNBYnNvbHV0ZSAmJiB0aGlzLmNvbW1hbmRzLmxlbmd0aCA9PT0gMSAmJiB0aGlzLmNvbW1hbmRzWzBdID09ICcvJztcbiAgfVxufVxuXG4vKiogVHJhbnNmb3JtcyBjb21tYW5kcyB0byBhIG5vcm1hbGl6ZWQgYE5hdmlnYXRpb25gICovXG5mdW5jdGlvbiBjb21wdXRlTmF2aWdhdGlvbihjb21tYW5kczogYW55W10pOiBOYXZpZ2F0aW9uIHtcbiAgaWYgKCh0eXBlb2YgY29tbWFuZHNbMF0gPT09ICdzdHJpbmcnKSAmJiBjb21tYW5kcy5sZW5ndGggPT09IDEgJiYgY29tbWFuZHNbMF0gPT09ICcvJykge1xuICAgIHJldHVybiBuZXcgTmF2aWdhdGlvbih0cnVlLCAwLCBjb21tYW5kcyk7XG4gIH1cblxuICBsZXQgbnVtYmVyT2ZEb3VibGVEb3RzID0gMDtcbiAgbGV0IGlzQWJzb2x1dGUgPSBmYWxzZTtcblxuICBjb25zdCByZXM6IGFueVtdID0gY29tbWFuZHMucmVkdWNlKChyZXMsIGNtZCwgY21kSWR4KSA9PiB7XG4gICAgaWYgKHR5cGVvZiBjbWQgPT09ICdvYmplY3QnICYmIGNtZCAhPSBudWxsKSB7XG4gICAgICBpZiAoY21kLm91dGxldHMpIHtcbiAgICAgICAgY29uc3Qgb3V0bGV0czoge1trOiBzdHJpbmddOiBhbnl9ID0ge307XG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGNtZC5vdXRsZXRzKS5mb3JFYWNoKChbbmFtZSwgY29tbWFuZHNdKSA9PiB7XG4gICAgICAgICAgb3V0bGV0c1tuYW1lXSA9IHR5cGVvZiBjb21tYW5kcyA9PT0gJ3N0cmluZycgPyBjb21tYW5kcy5zcGxpdCgnLycpIDogY29tbWFuZHM7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gWy4uLnJlcywge291dGxldHN9XTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNtZC5zZWdtZW50UGF0aCkge1xuICAgICAgICByZXR1cm4gWy4uLnJlcywgY21kLnNlZ21lbnRQYXRoXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoISh0eXBlb2YgY21kID09PSAnc3RyaW5nJykpIHtcbiAgICAgIHJldHVybiBbLi4ucmVzLCBjbWRdO1xuICAgIH1cblxuICAgIGlmIChjbWRJZHggPT09IDApIHtcbiAgICAgIGNtZC5zcGxpdCgnLycpLmZvckVhY2goKHVybFBhcnQsIHBhcnRJbmRleCkgPT4ge1xuICAgICAgICBpZiAocGFydEluZGV4ID09IDAgJiYgdXJsUGFydCA9PT0gJy4nKSB7XG4gICAgICAgICAgLy8gc2tpcCAnLi9hJ1xuICAgICAgICB9IGVsc2UgaWYgKHBhcnRJbmRleCA9PSAwICYmIHVybFBhcnQgPT09ICcnKSB7ICAvLyAgJy9hJ1xuICAgICAgICAgIGlzQWJzb2x1dGUgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHVybFBhcnQgPT09ICcuLicpIHsgIC8vICAnLi4vYSdcbiAgICAgICAgICBudW1iZXJPZkRvdWJsZURvdHMrKztcbiAgICAgICAgfSBlbHNlIGlmICh1cmxQYXJ0ICE9ICcnKSB7XG4gICAgICAgICAgcmVzLnB1c2godXJsUGFydCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIHJldHVybiBbLi4ucmVzLCBjbWRdO1xuICB9LCBbXSk7XG5cbiAgcmV0dXJuIG5ldyBOYXZpZ2F0aW9uKGlzQWJzb2x1dGUsIG51bWJlck9mRG91YmxlRG90cywgcmVzKTtcbn1cblxuY2xhc3MgUG9zaXRpb24ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHB1YmxpYyBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgcHVibGljIHByb2Nlc3NDaGlsZHJlbjogYm9vbGVhbiwgcHVibGljIGluZGV4OiBudW1iZXIpIHtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kU3RhcnRpbmdQb3NpdGlvbkZvclRhcmdldEdyb3VwKFxuICAgIG5hdjogTmF2aWdhdGlvbiwgcm9vdDogVXJsU2VnbWVudEdyb3VwLCB0YXJnZXQ6IFVybFNlZ21lbnRHcm91cCk6IFBvc2l0aW9uIHtcbiAgaWYgKG5hdi5pc0Fic29sdXRlKSB7XG4gICAgcmV0dXJuIG5ldyBQb3NpdGlvbihyb290LCB0cnVlLCAwKTtcbiAgfVxuXG4gIGlmICghdGFyZ2V0KSB7XG4gICAgLy8gYE5hTmAgaXMgdXNlZCBvbmx5IHRvIG1haW50YWluIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IHdpdGggaW5jb3JyZWN0bHkgbW9ja2VkXG4gICAgLy8gYEFjdGl2YXRlZFJvdXRlU25hcHNob3RgIGluIHRlc3RzLiBJbiBwcmlvciB2ZXJzaW9ucyBvZiB0aGlzIGNvZGUsIHRoZSBwb3NpdGlvbiBoZXJlIHdhc1xuICAgIC8vIGRldGVybWluZWQgYmFzZWQgb24gYW4gaW50ZXJuYWwgcHJvcGVydHkgdGhhdCB3YXMgcmFyZWx5IG1vY2tlZCwgcmVzdWx0aW5nIGluIGBOYU5gLiBJblxuICAgIC8vIHJlYWxpdHksIHRoaXMgY29kZSBwYXRoIHNob3VsZCBfbmV2ZXJfIGJlIHRvdWNoZWQgc2luY2UgYHRhcmdldGAgaXMgbm90IGFsbG93ZWQgdG8gYmUgZmFsc2V5LlxuICAgIHJldHVybiBuZXcgUG9zaXRpb24ocm9vdCwgZmFsc2UsIE5hTik7XG4gIH1cbiAgaWYgKHRhcmdldC5wYXJlbnQgPT09IG51bGwpIHtcbiAgICByZXR1cm4gbmV3IFBvc2l0aW9uKHRhcmdldCwgdHJ1ZSwgMCk7XG4gIH1cblxuICBjb25zdCBtb2RpZmllciA9IGlzTWF0cml4UGFyYW1zKG5hdi5jb21tYW5kc1swXSkgPyAwIDogMTtcbiAgY29uc3QgaW5kZXggPSB0YXJnZXQuc2VnbWVudHMubGVuZ3RoIC0gMSArIG1vZGlmaWVyO1xuICByZXR1cm4gY3JlYXRlUG9zaXRpb25BcHBseWluZ0RvdWJsZURvdHModGFyZ2V0LCBpbmRleCwgbmF2Lm51bWJlck9mRG91YmxlRG90cyk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVBvc2l0aW9uQXBwbHlpbmdEb3VibGVEb3RzKFxuICAgIGdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIGluZGV4OiBudW1iZXIsIG51bWJlck9mRG91YmxlRG90czogbnVtYmVyKTogUG9zaXRpb24ge1xuICBsZXQgZyA9IGdyb3VwO1xuICBsZXQgY2kgPSBpbmRleDtcbiAgbGV0IGRkID0gbnVtYmVyT2ZEb3VibGVEb3RzO1xuICB3aGlsZSAoZGQgPiBjaSkge1xuICAgIGRkIC09IGNpO1xuICAgIGcgPSBnLnBhcmVudCE7XG4gICAgaWYgKCFnKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ET1VCTEVfRE9UUywgTkdfREVWX01PREUgJiYgJ0ludmFsaWQgbnVtYmVyIG9mIFxcJy4uL1xcJycpO1xuICAgIH1cbiAgICBjaSA9IGcuc2VnbWVudHMubGVuZ3RoO1xuICB9XG4gIHJldHVybiBuZXcgUG9zaXRpb24oZywgZmFsc2UsIGNpIC0gZGQpO1xufVxuXG5mdW5jdGlvbiBnZXRPdXRsZXRzKGNvbW1hbmRzOiB1bmtub3duW10pOiB7W2s6IHN0cmluZ106IHVua25vd25bXXxzdHJpbmd9IHtcbiAgaWYgKGlzQ29tbWFuZFdpdGhPdXRsZXRzKGNvbW1hbmRzWzBdKSkge1xuICAgIHJldHVybiBjb21tYW5kc1swXS5vdXRsZXRzO1xuICB9XG5cbiAgcmV0dXJuIHtbUFJJTUFSWV9PVVRMRVRdOiBjb21tYW5kc307XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVNlZ21lbnRHcm91cChcbiAgICBzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc3RhcnRJbmRleDogbnVtYmVyLCBjb21tYW5kczogYW55W10pOiBVcmxTZWdtZW50R3JvdXAge1xuICBpZiAoIXNlZ21lbnRHcm91cCkge1xuICAgIHNlZ21lbnRHcm91cCA9IG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KTtcbiAgfVxuICBpZiAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLmxlbmd0aCA9PT0gMCAmJiBzZWdtZW50R3JvdXAuaGFzQ2hpbGRyZW4oKSkge1xuICAgIHJldHVybiB1cGRhdGVTZWdtZW50R3JvdXBDaGlsZHJlbihzZWdtZW50R3JvdXAsIHN0YXJ0SW5kZXgsIGNvbW1hbmRzKTtcbiAgfVxuXG4gIGNvbnN0IG0gPSBwcmVmaXhlZFdpdGgoc2VnbWVudEdyb3VwLCBzdGFydEluZGV4LCBjb21tYW5kcyk7XG4gIGNvbnN0IHNsaWNlZENvbW1hbmRzID0gY29tbWFuZHMuc2xpY2UobS5jb21tYW5kSW5kZXgpO1xuICBpZiAobS5tYXRjaCAmJiBtLnBhdGhJbmRleCA8IHNlZ21lbnRHcm91cC5zZWdtZW50cy5sZW5ndGgpIHtcbiAgICBjb25zdCBnID0gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuc2VnbWVudHMuc2xpY2UoMCwgbS5wYXRoSW5kZXgpLCB7fSk7XG4gICAgZy5jaGlsZHJlbltQUklNQVJZX09VVExFVF0gPVxuICAgICAgICBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cC5zZWdtZW50cy5zbGljZShtLnBhdGhJbmRleCksIHNlZ21lbnRHcm91cC5jaGlsZHJlbik7XG4gICAgcmV0dXJuIHVwZGF0ZVNlZ21lbnRHcm91cENoaWxkcmVuKGcsIDAsIHNsaWNlZENvbW1hbmRzKTtcbiAgfSBlbHNlIGlmIChtLm1hdGNoICYmIHNsaWNlZENvbW1hbmRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cC5zZWdtZW50cywge30pO1xuICB9IGVsc2UgaWYgKG0ubWF0Y2ggJiYgIXNlZ21lbnRHcm91cC5oYXNDaGlsZHJlbigpKSB7XG4gICAgcmV0dXJuIGNyZWF0ZU5ld1NlZ21lbnRHcm91cChzZWdtZW50R3JvdXAsIHN0YXJ0SW5kZXgsIGNvbW1hbmRzKTtcbiAgfSBlbHNlIGlmIChtLm1hdGNoKSB7XG4gICAgcmV0dXJuIHVwZGF0ZVNlZ21lbnRHcm91cENoaWxkcmVuKHNlZ21lbnRHcm91cCwgMCwgc2xpY2VkQ29tbWFuZHMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBjcmVhdGVOZXdTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLCBzdGFydEluZGV4LCBjb21tYW5kcyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlU2VnbWVudEdyb3VwQ2hpbGRyZW4oXG4gICAgc2VnbWVudEdyb3VwOiBVcmxTZWdtZW50R3JvdXAsIHN0YXJ0SW5kZXg6IG51bWJlciwgY29tbWFuZHM6IGFueVtdKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgaWYgKGNvbW1hbmRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cC5zZWdtZW50cywge30pO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IG91dGxldHMgPSBnZXRPdXRsZXRzKGNvbW1hbmRzKTtcbiAgICBjb25zdCBjaGlsZHJlbjoge1trZXk6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0gPSB7fTtcbiAgICAvLyBJZiB0aGUgc2V0IG9mIGNvbW1hbmRzIGRvZXMgbm90IGFwcGx5IGFueXRoaW5nIHRvIHRoZSBwcmltYXJ5IG91dGxldCBhbmQgdGhlIGNoaWxkIHNlZ21lbnQgaXNcbiAgICAvLyBhbiBlbXB0eSBwYXRoIHByaW1hcnkgc2VnbWVudCBvbiBpdHMgb3duLCB3ZSB3YW50IHRvIHNraXAgYXBwbHlpbmcgdGhlIGNvbW1hbmRzIGF0IHRoaXNcbiAgICAvLyBsZXZlbC4gSW1hZ2luZSB0aGUgZm9sbG93aW5nIGNvbmZpZzpcbiAgICAvL1xuICAgIC8vIHtwYXRoOiAnJywgY2hpbGRyZW46IFt7cGF0aDogJyoqJywgb3V0bGV0OiAncG9wdXAnfV19LlxuICAgIC8vXG4gICAgLy8gTmF2aWdhdGlvbiB0byAvKHBvcHVwOmEpIHdpbGwgYWN0aXZhdGUgdGhlIGNoaWxkIG91dGxldCBjb3JyZWN0bHkgR2l2ZW4gYSBmb2xsb3ctdXBcbiAgICAvLyBuYXZpZ2F0aW9uIHdpdGggY29tbWFuZHNcbiAgICAvLyBbJy8nLCB7b3V0bGV0czogeydwb3B1cCc6ICdiJ319XSwgd2UgX3dvdWxkIG5vdF8gd2FudCB0byBhcHBseSB0aGUgb3V0bGV0IGNvbW1hbmRzIHRvIHRoZVxuICAgIC8vIHJvb3Qgc2VnbWVudCBiZWNhdXNlIHRoYXQgd291bGQgcmVzdWx0IGluXG4gICAgLy8gLy8ocG9wdXA6YSkocG9wdXA6Yikgc2luY2UgdGhlIG91dGxldCBjb21tYW5kIGdvdCBhcHBsaWVkIG9uZSBsZXZlbCBhYm92ZSB3aGVyZSBpdCBhcHBlYXJzIGluXG4gICAgLy8gdGhlIGBBY3RpdmF0ZWRSb3V0ZWAgcmF0aGVyIHRoYW4gdXBkYXRpbmcgdGhlIGV4aXN0aW5nIG9uZS5cbiAgICAvL1xuICAgIC8vIEJlY2F1c2UgZW1wdHkgcGF0aHMgZG8gbm90IGFwcGVhciBpbiB0aGUgVVJMIHNlZ21lbnRzIGFuZCB0aGUgZmFjdCB0aGF0IHRoZSBzZWdtZW50cyB1c2VkIGluXG4gICAgLy8gdGhlIG91dHB1dCBgVXJsVHJlZWAgYXJlIHNxdWFzaGVkIHRvIGVsaW1pbmF0ZSB0aGVzZSBlbXB0eSBwYXRocyB3aGVyZSBwb3NzaWJsZVxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvYmxvYi8xM2YxMGRlNDBlMjVjNjkwMGNhNTViZDgzYjM2YmQ1MzNkYWNmYTllL3BhY2thZ2VzL3JvdXRlci9zcmMvdXJsX3RyZWUudHMjTDc1NVxuICAgIC8vIGl0IGNhbiBiZSBoYXJkIHRvIGRldGVybWluZSB3aGF0IGlzIHRoZSByaWdodCB0aGluZyB0byBkbyB3aGVuIGFwcGx5aW5nIGNvbW1hbmRzIHRvIGFcbiAgICAvLyBgVXJsU2VnbWVudEdyb3VwYCB0aGF0IGlzIGNyZWF0ZWQgZnJvbSBhbiBcInVuc3F1YXNoZWRcIi9leHBhbmRlZCBgQWN0aXZhdGVkUm91dGVgIHRyZWUuXG4gICAgLy8gVGhpcyBjb2RlIGVmZmVjdGl2ZWx5IFwic3F1YXNoZXNcIiBlbXB0eSBwYXRoIHByaW1hcnkgcm91dGVzIHdoZW4gdGhleSBoYXZlIG5vIHNpYmxpbmdzIG9uXG4gICAgLy8gdGhlIHNhbWUgbGV2ZWwgb2YgdGhlIHRyZWUuXG4gICAgaWYgKCFvdXRsZXRzW1BSSU1BUllfT1VUTEVUXSAmJiBzZWdtZW50R3JvdXAuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdICYmXG4gICAgICAgIHNlZ21lbnRHcm91cC5udW1iZXJPZkNoaWxkcmVuID09PSAxICYmXG4gICAgICAgIHNlZ21lbnRHcm91cC5jaGlsZHJlbltQUklNQVJZX09VVExFVF0uc2VnbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdXBkYXRlU2VnbWVudEdyb3VwQ2hpbGRyZW4oXG4gICAgICAgICAgc2VnbWVudEdyb3VwLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSwgc3RhcnRJbmRleCwgY29tbWFuZHMpO1xuICAgIH1cblxuICAgIE9iamVjdC5lbnRyaWVzKG91dGxldHMpLmZvckVhY2goKFtvdXRsZXQsIGNvbW1hbmRzXSkgPT4ge1xuICAgICAgaWYgKHR5cGVvZiBjb21tYW5kcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29tbWFuZHMgPSBbY29tbWFuZHNdO1xuICAgICAgfVxuICAgICAgaWYgKGNvbW1hbmRzICE9PSBudWxsKSB7XG4gICAgICAgIGNoaWxkcmVuW291dGxldF0gPSB1cGRhdGVTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLmNoaWxkcmVuW291dGxldF0sIHN0YXJ0SW5kZXgsIGNvbW1hbmRzKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIE9iamVjdC5lbnRyaWVzKHNlZ21lbnRHcm91cC5jaGlsZHJlbikuZm9yRWFjaCgoW2NoaWxkT3V0bGV0LCBjaGlsZF0pID0+IHtcbiAgICAgIGlmIChvdXRsZXRzW2NoaWxkT3V0bGV0XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNoaWxkcmVuW2NoaWxkT3V0bGV0XSA9IGNoaWxkO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cC5zZWdtZW50cywgY2hpbGRyZW4pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHByZWZpeGVkV2l0aChzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCwgc3RhcnRJbmRleDogbnVtYmVyLCBjb21tYW5kczogYW55W10pIHtcbiAgbGV0IGN1cnJlbnRDb21tYW5kSW5kZXggPSAwO1xuICBsZXQgY3VycmVudFBhdGhJbmRleCA9IHN0YXJ0SW5kZXg7XG5cbiAgY29uc3Qgbm9NYXRjaCA9IHttYXRjaDogZmFsc2UsIHBhdGhJbmRleDogMCwgY29tbWFuZEluZGV4OiAwfTtcbiAgd2hpbGUgKGN1cnJlbnRQYXRoSW5kZXggPCBzZWdtZW50R3JvdXAuc2VnbWVudHMubGVuZ3RoKSB7XG4gICAgaWYgKGN1cnJlbnRDb21tYW5kSW5kZXggPj0gY29tbWFuZHMubGVuZ3RoKSByZXR1cm4gbm9NYXRjaDtcbiAgICBjb25zdCBwYXRoID0gc2VnbWVudEdyb3VwLnNlZ21lbnRzW2N1cnJlbnRQYXRoSW5kZXhdO1xuICAgIGNvbnN0IGNvbW1hbmQgPSBjb21tYW5kc1tjdXJyZW50Q29tbWFuZEluZGV4XTtcbiAgICAvLyBEbyBub3QgdHJ5IHRvIGNvbnN1bWUgY29tbWFuZCBhcyBwYXJ0IG9mIHRoZSBwcmVmaXhpbmcgaWYgaXQgaGFzIG91dGxldHMgYmVjYXVzZSBpdCBjYW5cbiAgICAvLyBjb250YWluIG91dGxldHMgb3RoZXIgdGhhbiB0aGUgb25lIGJlaW5nIHByb2Nlc3NlZC4gQ29uc3VtaW5nIHRoZSBvdXRsZXRzIGNvbW1hbmQgd291bGRcbiAgICAvLyByZXN1bHQgaW4gb3RoZXIgb3V0bGV0cyBiZWluZyBpZ25vcmVkLlxuICAgIGlmIChpc0NvbW1hbmRXaXRoT3V0bGV0cyhjb21tYW5kKSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNvbnN0IGN1cnIgPSBgJHtjb21tYW5kfWA7XG4gICAgY29uc3QgbmV4dCA9XG4gICAgICAgIGN1cnJlbnRDb21tYW5kSW5kZXggPCBjb21tYW5kcy5sZW5ndGggLSAxID8gY29tbWFuZHNbY3VycmVudENvbW1hbmRJbmRleCArIDFdIDogbnVsbDtcblxuICAgIGlmIChjdXJyZW50UGF0aEluZGV4ID4gMCAmJiBjdXJyID09PSB1bmRlZmluZWQpIGJyZWFrO1xuXG4gICAgaWYgKGN1cnIgJiYgbmV4dCAmJiAodHlwZW9mIG5leHQgPT09ICdvYmplY3QnKSAmJiBuZXh0Lm91dGxldHMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKCFjb21wYXJlKGN1cnIsIG5leHQsIHBhdGgpKSByZXR1cm4gbm9NYXRjaDtcbiAgICAgIGN1cnJlbnRDb21tYW5kSW5kZXggKz0gMjtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFjb21wYXJlKGN1cnIsIHt9LCBwYXRoKSkgcmV0dXJuIG5vTWF0Y2g7XG4gICAgICBjdXJyZW50Q29tbWFuZEluZGV4Kys7XG4gICAgfVxuICAgIGN1cnJlbnRQYXRoSW5kZXgrKztcbiAgfVxuXG4gIHJldHVybiB7bWF0Y2g6IHRydWUsIHBhdGhJbmRleDogY3VycmVudFBhdGhJbmRleCwgY29tbWFuZEluZGV4OiBjdXJyZW50Q29tbWFuZEluZGV4fTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTmV3U2VnbWVudEdyb3VwKFxuICAgIHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwLCBzdGFydEluZGV4OiBudW1iZXIsIGNvbW1hbmRzOiBhbnlbXSk6IFVybFNlZ21lbnRHcm91cCB7XG4gIGNvbnN0IHBhdGhzID0gc2VnbWVudEdyb3VwLnNlZ21lbnRzLnNsaWNlKDAsIHN0YXJ0SW5kZXgpO1xuXG4gIGxldCBpID0gMDtcbiAgd2hpbGUgKGkgPCBjb21tYW5kcy5sZW5ndGgpIHtcbiAgICBjb25zdCBjb21tYW5kID0gY29tbWFuZHNbaV07XG4gICAgaWYgKGlzQ29tbWFuZFdpdGhPdXRsZXRzKGNvbW1hbmQpKSB7XG4gICAgICBjb25zdCBjaGlsZHJlbiA9IGNyZWF0ZU5ld1NlZ21lbnRDaGlsZHJlbihjb21tYW5kLm91dGxldHMpO1xuICAgICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAocGF0aHMsIGNoaWxkcmVuKTtcbiAgICB9XG5cbiAgICAvLyBpZiB3ZSBzdGFydCB3aXRoIGFuIG9iamVjdCBsaXRlcmFsLCB3ZSBuZWVkIHRvIHJldXNlIHRoZSBwYXRoIHBhcnQgZnJvbSB0aGUgc2VnbWVudFxuICAgIGlmIChpID09PSAwICYmIGlzTWF0cml4UGFyYW1zKGNvbW1hbmRzWzBdKSkge1xuICAgICAgY29uc3QgcCA9IHNlZ21lbnRHcm91cC5zZWdtZW50c1tzdGFydEluZGV4XTtcbiAgICAgIHBhdGhzLnB1c2gobmV3IFVybFNlZ21lbnQocC5wYXRoLCBzdHJpbmdpZnkoY29tbWFuZHNbMF0pKSk7XG4gICAgICBpKys7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBjdXJyID0gaXNDb21tYW5kV2l0aE91dGxldHMoY29tbWFuZCkgPyBjb21tYW5kLm91dGxldHNbUFJJTUFSWV9PVVRMRVRdIDogYCR7Y29tbWFuZH1gO1xuICAgIGNvbnN0IG5leHQgPSAoaSA8IGNvbW1hbmRzLmxlbmd0aCAtIDEpID8gY29tbWFuZHNbaSArIDFdIDogbnVsbDtcbiAgICBpZiAoY3VyciAmJiBuZXh0ICYmIGlzTWF0cml4UGFyYW1zKG5leHQpKSB7XG4gICAgICBwYXRocy5wdXNoKG5ldyBVcmxTZWdtZW50KGN1cnIsIHN0cmluZ2lmeShuZXh0KSkpO1xuICAgICAgaSArPSAyO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXRocy5wdXNoKG5ldyBVcmxTZWdtZW50KGN1cnIsIHt9KSk7XG4gICAgICBpKys7XG4gICAgfVxuICB9XG4gIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHBhdGhzLCB7fSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU5ld1NlZ21lbnRDaGlsZHJlbihvdXRsZXRzOiB7W25hbWU6IHN0cmluZ106IHVua25vd25bXXxzdHJpbmd9KTpcbiAgICB7W291dGxldDogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSB7XG4gIGNvbnN0IGNoaWxkcmVuOiB7W291dGxldDogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICBPYmplY3QuZW50cmllcyhvdXRsZXRzKS5mb3JFYWNoKChbb3V0bGV0LCBjb21tYW5kc10pID0+IHtcbiAgICBpZiAodHlwZW9mIGNvbW1hbmRzID09PSAnc3RyaW5nJykge1xuICAgICAgY29tbWFuZHMgPSBbY29tbWFuZHNdO1xuICAgIH1cbiAgICBpZiAoY29tbWFuZHMgIT09IG51bGwpIHtcbiAgICAgIGNoaWxkcmVuW291dGxldF0gPSBjcmVhdGVOZXdTZWdtZW50R3JvdXAobmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pLCAwLCBjb21tYW5kcyk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGNoaWxkcmVuO1xufVxuXG5mdW5jdGlvbiBzdHJpbmdpZnkocGFyYW1zOiB7W2tleTogc3RyaW5nXTogYW55fSk6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9IHtcbiAgY29uc3QgcmVzOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICBPYmplY3QuZW50cmllcyhwYXJhbXMpLmZvckVhY2goKFtrLCB2XSkgPT4gcmVzW2tdID0gYCR7dn1gKTtcbiAgcmV0dXJuIHJlcztcbn1cblxuZnVuY3Rpb24gY29tcGFyZShwYXRoOiBzdHJpbmcsIHBhcmFtczoge1trZXk6IHN0cmluZ106IGFueX0sIHNlZ21lbnQ6IFVybFNlZ21lbnQpOiBib29sZWFuIHtcbiAgcmV0dXJuIHBhdGggPT0gc2VnbWVudC5wYXRoICYmIHNoYWxsb3dFcXVhbChwYXJhbXMsIHNlZ21lbnQucGFyYW1ldGVycyk7XG59XG4iXX0=