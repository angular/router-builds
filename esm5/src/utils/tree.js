/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * @template T
 */
var /**
 * @template T
 */
Tree = /** @class */ (function () {
    function Tree(root) {
        this._root = root;
    }
    Object.defineProperty(Tree.prototype, "root", {
        get: /**
         * @return {?}
         */
        function () { return this._root.value; },
        enumerable: true,
        configurable: true
    });
    /**
     * @internal
     */
    /**
     * \@internal
     * @param {?} t
     * @return {?}
     */
    Tree.prototype.parent = /**
     * \@internal
     * @param {?} t
     * @return {?}
     */
    function (t) {
        var /** @type {?} */ p = this.pathFromRoot(t);
        return p.length > 1 ? p[p.length - 2] : null;
    };
    /**
     * @internal
     */
    /**
     * \@internal
     * @param {?} t
     * @return {?}
     */
    Tree.prototype.children = /**
     * \@internal
     * @param {?} t
     * @return {?}
     */
    function (t) {
        var /** @type {?} */ n = findNode(t, this._root);
        return n ? n.children.map(function (t) { return t.value; }) : [];
    };
    /**
     * @internal
     */
    /**
     * \@internal
     * @param {?} t
     * @return {?}
     */
    Tree.prototype.firstChild = /**
     * \@internal
     * @param {?} t
     * @return {?}
     */
    function (t) {
        var /** @type {?} */ n = findNode(t, this._root);
        return n && n.children.length > 0 ? n.children[0].value : null;
    };
    /**
     * @internal
     */
    /**
     * \@internal
     * @param {?} t
     * @return {?}
     */
    Tree.prototype.siblings = /**
     * \@internal
     * @param {?} t
     * @return {?}
     */
    function (t) {
        var /** @type {?} */ p = findPath(t, this._root);
        if (p.length < 2)
            return [];
        var /** @type {?} */ c = p[p.length - 2].children.map(function (c) { return c.value; });
        return c.filter(function (cc) { return cc !== t; });
    };
    /**
     * @internal
     */
    /**
     * \@internal
     * @param {?} t
     * @return {?}
     */
    Tree.prototype.pathFromRoot = /**
     * \@internal
     * @param {?} t
     * @return {?}
     */
    function (t) { return findPath(t, this._root).map(function (s) { return s.value; }); };
    return Tree;
}());
/**
 * @template T
 */
export { Tree };
function Tree_tsickle_Closure_declarations() {
    /**
     * \@internal
     * @type {?}
     */
    Tree.prototype._root;
}
/**
 * @template T
 * @param {?} value
 * @param {?} node
 * @return {?}
 */
function findNode(value, node) {
    if (value === node.value)
        return node;
    for (var _i = 0, _a = node.children; _i < _a.length; _i++) {
        var child = _a[_i];
        var /** @type {?} */ node_1 = findNode(value, child);
        if (node_1)
            return node_1;
    }
    return null;
}
/**
 * @template T
 * @param {?} value
 * @param {?} node
 * @return {?}
 */
function findPath(value, node) {
    if (value === node.value)
        return [node];
    for (var _i = 0, _a = node.children; _i < _a.length; _i++) {
        var child = _a[_i];
        var /** @type {?} */ path = findPath(value, child);
        if (path.length) {
            path.unshift(node);
            return path;
        }
    }
    return [];
}
/**
 * @template T
 */
var /**
 * @template T
 */
TreeNode = /** @class */ (function () {
    function TreeNode(value, children) {
        this.value = value;
        this.children = children;
    }
    /**
     * @return {?}
     */
    TreeNode.prototype.toString = /**
     * @return {?}
     */
    function () { return "TreeNode(" + this.value + ")"; };
    return TreeNode;
}());
/**
 * @template T
 */
export { TreeNode };
function TreeNode_tsickle_Closure_declarations() {
    /** @type {?} */
    TreeNode.prototype.value;
    /** @type {?} */
    TreeNode.prototype.children;
}
/**
 * @template T
 * @param {?} node
 * @return {?}
 */
export function nodeChildrenAsMap(node) {
    var /** @type {?} */ map = {};
    if (node) {
        node.children.forEach(function (child) { return map[child.value.outlet] = child; });
    }
    return map;
}
//# sourceMappingURL=tree.js.map