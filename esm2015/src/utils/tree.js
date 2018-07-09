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
export class Tree {
    /**
     * @param {?} root
     */
    constructor(root) { this._root = root; }
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
        const /** @type {?} */ p = findPath(t, this._root);
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
    pathFromRoot(t) { return findPath(t, this._root).map(s => s.value); }
}
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
    for (const /** @type {?} */ child of node.children) {
        const /** @type {?} */ node = findNode(value, child);
        if (node)
            return node;
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
    for (const /** @type {?} */ child of node.children) {
        const /** @type {?} */ path = findPath(value, child);
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
/**
 * @template T
 * @param {?} node
 * @return {?}
 */
export function nodeChildrenAsMap(node) {
    const /** @type {?} */ map = {};
    if (node) {
        node.children.forEach(child => map[child.value.outlet] = child);
    }
    return map;
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvdXRpbHMvdHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQVFBLE1BQU07Ozs7SUFJSixZQUFZLElBQWlCLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsRUFBRTs7OztJQUVyRCxJQUFJLElBQUksS0FBUSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7Ozs7OztJQUsxQyxNQUFNLENBQUMsQ0FBSTtRQUNULHVCQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE9BQU8sQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7S0FDOUM7Ozs7OztJQUtELFFBQVEsQ0FBQyxDQUFJO1FBQ1gsdUJBQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0tBQzlDOzs7Ozs7SUFLRCxVQUFVLENBQUMsQ0FBSTtRQUNiLHVCQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNsQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7S0FDaEU7Ozs7OztJQUtELFFBQVEsQ0FBQyxDQUFJO1FBQ1gsdUJBQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQUUsT0FBTyxFQUFFLENBQUM7UUFFNUIsdUJBQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckQsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0tBQ2pDOzs7Ozs7SUFLRCxZQUFZLENBQUMsQ0FBSSxJQUFTLE9BQU8sUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7Q0FDOUU7Ozs7Ozs7Ozs7Ozs7O0FBSUQsa0JBQXFCLEtBQVEsRUFBRSxJQUFpQjtJQUM5QyxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsS0FBSztRQUFFLE9BQU8sSUFBSSxDQUFDO0lBRXRDLEtBQUssdUJBQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7UUFDakMsdUJBQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEMsSUFBSSxJQUFJO1lBQUUsT0FBTyxJQUFJLENBQUM7S0FDdkI7SUFFRCxPQUFPLElBQUksQ0FBQztDQUNiOzs7Ozs7O0FBR0Qsa0JBQXFCLEtBQVEsRUFBRSxJQUFpQjtJQUM5QyxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsS0FBSztRQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUV4QyxLQUFLLHVCQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2pDLHVCQUFNLElBQUksR0FBRyxRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3BDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNmLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbkIsT0FBTyxJQUFJLENBQUM7U0FDYjtLQUNGO0lBRUQsT0FBTyxFQUFFLENBQUM7Q0FDWDs7OztBQUVELE1BQU07Ozs7O0lBQ0osWUFBbUIsS0FBUSxFQUFTLFFBQXVCO1FBQXhDLFVBQUssR0FBTCxLQUFLLENBQUc7UUFBUyxhQUFRLEdBQVIsUUFBUSxDQUFlO0tBQUk7Ozs7SUFFL0QsUUFBUSxLQUFhLE9BQU8sWUFBWSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRTtDQUN6RDs7Ozs7Ozs7Ozs7O0FBR0QsTUFBTSw0QkFBdUQsSUFBdUI7SUFDbEYsdUJBQU0sR0FBRyxHQUFvQyxFQUFFLENBQUM7SUFFaEQsSUFBSSxJQUFJLEVBQUU7UUFDUixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDO0tBQ2pFO0lBRUQsT0FBTyxHQUFHLENBQUM7Q0FDWiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuZXhwb3J0IGNsYXNzIFRyZWU8VD4ge1xuICAvKiogQGludGVybmFsICovXG4gIF9yb290OiBUcmVlTm9kZTxUPjtcblxuICBjb25zdHJ1Y3Rvcihyb290OiBUcmVlTm9kZTxUPikgeyB0aGlzLl9yb290ID0gcm9vdDsgfVxuXG4gIGdldCByb290KCk6IFQgeyByZXR1cm4gdGhpcy5fcm9vdC52YWx1ZTsgfVxuXG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHBhcmVudCh0OiBUKTogVHxudWxsIHtcbiAgICBjb25zdCBwID0gdGhpcy5wYXRoRnJvbVJvb3QodCk7XG4gICAgcmV0dXJuIHAubGVuZ3RoID4gMSA/IHBbcC5sZW5ndGggLSAyXSA6IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqL1xuICBjaGlsZHJlbih0OiBUKTogVFtdIHtcbiAgICBjb25zdCBuID0gZmluZE5vZGUodCwgdGhpcy5fcm9vdCk7XG4gICAgcmV0dXJuIG4gPyBuLmNoaWxkcmVuLm1hcCh0ID0+IHQudmFsdWUpIDogW107XG4gIH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqL1xuICBmaXJzdENoaWxkKHQ6IFQpOiBUfG51bGwge1xuICAgIGNvbnN0IG4gPSBmaW5kTm9kZSh0LCB0aGlzLl9yb290KTtcbiAgICByZXR1cm4gbiAmJiBuLmNoaWxkcmVuLmxlbmd0aCA+IDAgPyBuLmNoaWxkcmVuWzBdLnZhbHVlIDogbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHNpYmxpbmdzKHQ6IFQpOiBUW10ge1xuICAgIGNvbnN0IHAgPSBmaW5kUGF0aCh0LCB0aGlzLl9yb290KTtcbiAgICBpZiAocC5sZW5ndGggPCAyKSByZXR1cm4gW107XG5cbiAgICBjb25zdCBjID0gcFtwLmxlbmd0aCAtIDJdLmNoaWxkcmVuLm1hcChjID0+IGMudmFsdWUpO1xuICAgIHJldHVybiBjLmZpbHRlcihjYyA9PiBjYyAhPT0gdCk7XG4gIH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqL1xuICBwYXRoRnJvbVJvb3QodDogVCk6IFRbXSB7IHJldHVybiBmaW5kUGF0aCh0LCB0aGlzLl9yb290KS5tYXAocyA9PiBzLnZhbHVlKTsgfVxufVxuXG5cbi8vIERGUyBmb3IgdGhlIG5vZGUgbWF0Y2hpbmcgdGhlIHZhbHVlXG5mdW5jdGlvbiBmaW5kTm9kZTxUPih2YWx1ZTogVCwgbm9kZTogVHJlZU5vZGU8VD4pOiBUcmVlTm9kZTxUPnxudWxsIHtcbiAgaWYgKHZhbHVlID09PSBub2RlLnZhbHVlKSByZXR1cm4gbm9kZTtcblxuICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICBjb25zdCBub2RlID0gZmluZE5vZGUodmFsdWUsIGNoaWxkKTtcbiAgICBpZiAobm9kZSkgcmV0dXJuIG5vZGU7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuLy8gUmV0dXJuIHRoZSBwYXRoIHRvIHRoZSBub2RlIHdpdGggdGhlIGdpdmVuIHZhbHVlIHVzaW5nIERGU1xuZnVuY3Rpb24gZmluZFBhdGg8VD4odmFsdWU6IFQsIG5vZGU6IFRyZWVOb2RlPFQ+KTogVHJlZU5vZGU8VD5bXSB7XG4gIGlmICh2YWx1ZSA9PT0gbm9kZS52YWx1ZSkgcmV0dXJuIFtub2RlXTtcblxuICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICBjb25zdCBwYXRoID0gZmluZFBhdGgodmFsdWUsIGNoaWxkKTtcbiAgICBpZiAocGF0aC5sZW5ndGgpIHtcbiAgICAgIHBhdGgudW5zaGlmdChub2RlKTtcbiAgICAgIHJldHVybiBwYXRoO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBbXTtcbn1cblxuZXhwb3J0IGNsYXNzIFRyZWVOb2RlPFQ+IHtcbiAgY29uc3RydWN0b3IocHVibGljIHZhbHVlOiBULCBwdWJsaWMgY2hpbGRyZW46IFRyZWVOb2RlPFQ+W10pIHt9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHsgcmV0dXJuIGBUcmVlTm9kZSgke3RoaXMudmFsdWV9KWA7IH1cbn1cblxuLy8gUmV0dXJuIHRoZSBsaXN0IG9mIFQgaW5kZXhlZCBieSBvdXRsZXQgbmFtZVxuZXhwb3J0IGZ1bmN0aW9uIG5vZGVDaGlsZHJlbkFzTWFwPFQgZXh0ZW5kc3tvdXRsZXQ6IHN0cmluZ30+KG5vZGU6IFRyZWVOb2RlPFQ+fCBudWxsKSB7XG4gIGNvbnN0IG1hcDoge1tvdXRsZXQ6IHN0cmluZ106IFRyZWVOb2RlPFQ+fSA9IHt9O1xuXG4gIGlmIChub2RlKSB7XG4gICAgbm9kZS5jaGlsZHJlbi5mb3JFYWNoKGNoaWxkID0+IG1hcFtjaGlsZC52YWx1ZS5vdXRsZXRdID0gY2hpbGQpO1xuICB9XG5cbiAgcmV0dXJuIG1hcDtcbn0iXX0=