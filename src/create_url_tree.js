/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
"use strict";
var shared_1 = require('./shared');
var url_tree_1 = require('./url_tree');
var collection_1 = require('./utils/collection');
function createUrlTree(route, urlTree, commands, queryParams, fragment) {
    if (commands.length === 0) {
        return tree(urlTree.root, urlTree.root, urlTree, queryParams, fragment);
    }
    var normalizedCommands = normalizeCommands(commands);
    validateCommands(normalizedCommands);
    if (navigateToRoot(normalizedCommands)) {
        return tree(urlTree.root, new url_tree_1.UrlSegment([], {}), urlTree, queryParams, fragment);
    }
    var startingPosition = findStartingPosition(normalizedCommands, urlTree, route);
    var segment = startingPosition.processChildren ?
        updateSegmentChildren(startingPosition.segment, startingPosition.index, normalizedCommands.commands) :
        updateSegment(startingPosition.segment, startingPosition.index, normalizedCommands.commands);
    return tree(startingPosition.segment, segment, urlTree, queryParams, fragment);
}
exports.createUrlTree = createUrlTree;
function validateCommands(n) {
    if (n.isAbsolute && n.commands.length > 0 && (typeof n.commands[0] === 'object')) {
        throw new Error('Root segment cannot have matrix parameters');
    }
}
function tree(oldSegment, newSegment, urlTree, queryParams, fragment) {
    if (urlTree.root === oldSegment) {
        return new url_tree_1.UrlTree(newSegment, stringify(queryParams), fragment);
    }
    else {
        return new url_tree_1.UrlTree(replaceSegment(urlTree.root, oldSegment, newSegment), stringify(queryParams), fragment);
    }
}
function replaceSegment(current, oldSegment, newSegment) {
    var children = {};
    collection_1.forEach(current.children, function (c, outletName) {
        if (c === oldSegment) {
            children[outletName] = newSegment;
        }
        else {
            children[outletName] = replaceSegment(c, oldSegment, newSegment);
        }
    });
    return new url_tree_1.UrlSegment(current.pathsWithParams, children);
}
function navigateToRoot(normalizedChange) {
    return normalizedChange.isAbsolute && normalizedChange.commands.length === 1 &&
        normalizedChange.commands[0] == '/';
}
var NormalizedNavigationCommands = (function () {
    function NormalizedNavigationCommands(isAbsolute, numberOfDoubleDots, commands) {
        this.isAbsolute = isAbsolute;
        this.numberOfDoubleDots = numberOfDoubleDots;
        this.commands = commands;
    }
    return NormalizedNavigationCommands;
}());
function normalizeCommands(commands) {
    if ((typeof commands[0] === 'string') && commands.length === 1 && commands[0] == '/') {
        return new NormalizedNavigationCommands(true, 0, commands);
    }
    var numberOfDoubleDots = 0;
    var isAbsolute = false;
    var res = [];
    var _loop_1 = function(i) {
        var c = commands[i];
        if (typeof c === 'object' && c.outlets !== undefined) {
            var r_1 = {};
            collection_1.forEach(c.outlets, function (commands, name) {
                if (typeof commands === 'string') {
                    r_1[name] = commands.split('/');
                }
                else {
                    r_1[name] = commands;
                }
            });
            res.push({ outlets: r_1 });
            return "continue";
        }
        if (!(typeof c === 'string')) {
            res.push(c);
            return "continue";
        }
        var parts = c.split('/');
        for (var j = 0; j < parts.length; ++j) {
            var cc = parts[j];
            // first exp is treated in a special way
            if (i == 0) {
                if (j == 0 && cc == '.') {
                }
                else if (j == 0 && cc == '') {
                    isAbsolute = true;
                }
                else if (cc == '..') {
                    numberOfDoubleDots++;
                }
                else if (cc != '') {
                    res.push(cc);
                }
            }
            else {
                if (cc != '') {
                    res.push(cc);
                }
            }
        }
    };
    for (var i = 0; i < commands.length; ++i) {
        _loop_1(i);
    }
    return new NormalizedNavigationCommands(isAbsolute, numberOfDoubleDots, res);
}
var Position = (function () {
    function Position(segment, processChildren, index) {
        this.segment = segment;
        this.processChildren = processChildren;
        this.index = index;
    }
    return Position;
}());
function findStartingPosition(normalizedChange, urlTree, route) {
    if (normalizedChange.isAbsolute) {
        return new Position(urlTree.root, true, 0);
    }
    else if (route.snapshot._lastPathIndex === -1) {
        return new Position(route.snapshot._urlSegment, true, 0);
    }
    else if (route.snapshot._lastPathIndex + 1 - normalizedChange.numberOfDoubleDots >= 0) {
        return new Position(route.snapshot._urlSegment, false, route.snapshot._lastPathIndex + 1 - normalizedChange.numberOfDoubleDots);
    }
    else {
        throw new Error('Invalid number of \'../\'');
    }
}
function getPath(command) {
    return "" + command;
}
function getOutlets(commands) {
    if (!(typeof commands[0] === 'object'))
        return (_a = {}, _a[shared_1.PRIMARY_OUTLET] = commands, _a);
    if (commands[0].outlets === undefined)
        return (_b = {}, _b[shared_1.PRIMARY_OUTLET] = commands, _b);
    return commands[0].outlets;
    var _a, _b;
}
function updateSegment(segment, startIndex, commands) {
    if (!segment) {
        segment = new url_tree_1.UrlSegment([], {});
    }
    if (segment.pathsWithParams.length === 0 && segment.hasChildren()) {
        return updateSegmentChildren(segment, startIndex, commands);
    }
    var m = prefixedWith(segment, startIndex, commands);
    var slicedCommands = commands.slice(m.lastIndex);
    if (m.match && slicedCommands.length === 0) {
        return new url_tree_1.UrlSegment(segment.pathsWithParams, {});
    }
    else if (m.match && !segment.hasChildren()) {
        return createNewSegment(segment, startIndex, commands);
    }
    else if (m.match) {
        return updateSegmentChildren(segment, 0, slicedCommands);
    }
    else {
        return createNewSegment(segment, startIndex, commands);
    }
}
function updateSegmentChildren(segment, startIndex, commands) {
    if (commands.length === 0) {
        return new url_tree_1.UrlSegment(segment.pathsWithParams, {});
    }
    else {
        var outlets_1 = getOutlets(commands);
        var children_1 = {};
        collection_1.forEach(outlets_1, function (commands, outlet) {
            if (commands !== null) {
                children_1[outlet] = updateSegment(segment.children[outlet], startIndex, commands);
            }
        });
        collection_1.forEach(segment.children, function (child, childOutlet) {
            if (outlets_1[childOutlet] === undefined) {
                children_1[childOutlet] = child;
            }
        });
        return new url_tree_1.UrlSegment(segment.pathsWithParams, children_1);
    }
}
function prefixedWith(segment, startIndex, commands) {
    var currentCommandIndex = 0;
    var currentPathIndex = startIndex;
    var noMatch = { match: false, lastIndex: 0 };
    while (currentPathIndex < segment.pathsWithParams.length) {
        if (currentCommandIndex >= commands.length)
            return noMatch;
        var path = segment.pathsWithParams[currentPathIndex];
        var curr = getPath(commands[currentCommandIndex]);
        var next = currentCommandIndex < commands.length - 1 ? commands[currentCommandIndex + 1] : null;
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
    return { match: true, lastIndex: currentCommandIndex };
}
function createNewSegment(segment, startIndex, commands) {
    var paths = segment.pathsWithParams.slice(0, startIndex);
    var i = 0;
    while (i < commands.length) {
        // if we start with an object literal, we need to reuse the path part from the segment
        if (i === 0 && (typeof commands[0] === 'object')) {
            var p = segment.pathsWithParams[startIndex];
            paths.push(new url_tree_1.UrlPathWithParams(p.path, commands[0]));
            i++;
            continue;
        }
        var curr = getPath(commands[i]);
        var next = (i < commands.length - 1) ? commands[i + 1] : null;
        if (curr && next && (typeof next === 'object')) {
            paths.push(new url_tree_1.UrlPathWithParams(curr, stringify(next)));
            i += 2;
        }
        else {
            paths.push(new url_tree_1.UrlPathWithParams(curr, {}));
            i++;
        }
    }
    return new url_tree_1.UrlSegment(paths, {});
}
function stringify(params) {
    var res = {};
    collection_1.forEach(params, function (v, k) { return res[k] = "" + v; });
    return res;
}
function compare(path, params, pathWithParams) {
    return path == pathWithParams.path && collection_1.shallowEqual(params, pathWithParams.parameters);
}
//# sourceMappingURL=create_url_tree.js.map