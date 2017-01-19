/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export class Tree {
    /**
     * @param {?} root
     */
    constructor(root) {
        this._root = root;
    }
    /**
     * @return {?}
     */
    get root() { return this._root.value; }
    /**
     * \@internal
     * @param {?} t
     * @return {?}
     */
    parent(t) {
        const /** @type {?} */ p = this.pathFromRoot(t);
        return p.length > 1 ? p[p.length - 2] : null;
    }
    /**
     * \@internal
     * @param {?} t
     * @return {?}
     */
    children(t) {
        const /** @type {?} */ n = findNode(t, this._root);
        return n ? n.children.map(t => t.value) : [];
    }
    /**
     * \@internal
     * @param {?} t
     * @return {?}
     */
    firstChild(t) {
        const /** @type {?} */ n = findNode(t, this._root);
        return n && n.children.length > 0 ? n.children[0].value : null;
    }
    /**
     * \@internal
     * @param {?} t
     * @return {?}
     */
    siblings(t) {
        const /** @type {?} */ p = findPath(t, this._root, []);
        if (p.length < 2)
            return [];
        const /** @type {?} */ c = p[p.length - 2].children.map(c => c.value);
        return c.filter(cc => cc !== t);
    }
    /**
     * \@internal
     * @param {?} t
     * @return {?}
     */
    pathFromRoot(t) { return findPath(t, this._root, []).map(s => s.value); }
}
function Tree_tsickle_Closure_declarations() {
    /**
     * \@internal
     * @type {?}
     */
    Tree.prototype._root;
}
/**
 * @param {?} expected
 * @param {?} c
 * @return {?}
 */
function findNode(expected, c) {
    if (expected === c.value)
        return c;
    for (const cc of c.children) {
        const /** @type {?} */ r = findNode(expected, cc);
        if (r)
            return r;
    }
    return null;
}
/**
 * @param {?} expected
 * @param {?} c
 * @param {?} collected
 * @return {?}
 */
function findPath(expected, c, collected) {
    collected.push(c);
    if (expected === c.value)
        return collected;
    for (const cc of c.children) {
        const /** @type {?} */ cloned = collected.slice(0);
        const /** @type {?} */ r = findPath(expected, cc, cloned);
        if (r.length > 0)
            return r;
    }
    return [];
}
export class TreeNode {
    /**
     * @param {?} value
     * @param {?} children
     */
    constructor(value, children) {
        this.value = value;
        this.children = children;
    }
    /**
     * @return {?}
     */
    toString() { return `TreeNode(${this.value})`; }
}
function TreeNode_tsickle_Closure_declarations() {
    /** @type {?} */
    TreeNode.prototype.value;
    /** @type {?} */
    TreeNode.prototype.children;
}
//# sourceMappingURL=tree.js.map