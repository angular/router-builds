/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as tslib_1 from "tslib";
var Tree = /** @class */ (function () {
    function Tree(root) {
        this._root = root;
    }
    Object.defineProperty(Tree.prototype, "root", {
        get: function () { return this._root.value; },
        enumerable: true,
        configurable: true
    });
    /**
     * @internal
     */
    /**
       * @internal
       */
    Tree.prototype.parent = /**
       * @internal
       */
    function (t) {
        var p = this.pathFromRoot(t);
        return p.length > 1 ? p[p.length - 2] : null;
    };
    /**
     * @internal
     */
    /**
       * @internal
       */
    Tree.prototype.children = /**
       * @internal
       */
    function (t) {
        var n = findNode(t, this._root);
        return n ? n.children.map(function (t) { return t.value; }) : [];
    };
    /**
     * @internal
     */
    /**
       * @internal
       */
    Tree.prototype.firstChild = /**
       * @internal
       */
    function (t) {
        var n = findNode(t, this._root);
        return n && n.children.length > 0 ? n.children[0].value : null;
    };
    /**
     * @internal
     */
    /**
       * @internal
       */
    Tree.prototype.siblings = /**
       * @internal
       */
    function (t) {
        var p = findPath(t, this._root);
        if (p.length < 2)
            return [];
        var c = p[p.length - 2].children.map(function (c) { return c.value; });
        return c.filter(function (cc) { return cc !== t; });
    };
    /**
     * @internal
     */
    /**
       * @internal
       */
    Tree.prototype.pathFromRoot = /**
       * @internal
       */
    function (t) { return findPath(t, this._root).map(function (s) { return s.value; }); };
    return Tree;
}());
export { Tree };
// DFS for the node matching the value
function findNode(value, node) {
    if (value === node.value)
        return node;
    try {
        for (var _a = tslib_1.__values(node.children), _b = _a.next(); !_b.done; _b = _a.next()) {
            var child = _b.value;
            var node_1 = findNode(value, child);
            if (node_1)
                return node_1;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return null;
    var e_1, _c;
}
// Return the path to the node with the given value using DFS
function findPath(value, node) {
    if (value === node.value)
        return [node];
    try {
        for (var _a = tslib_1.__values(node.children), _b = _a.next(); !_b.done; _b = _a.next()) {
            var child = _b.value;
            var path = findPath(value, child);
            if (path.length) {
                path.unshift(node);
                return path;
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return [];
    var e_2, _c;
}
var TreeNode = /** @class */ (function () {
    function TreeNode(value, children) {
        this.value = value;
        this.children = children;
    }
    TreeNode.prototype.toString = function () { return "TreeNode(" + this.value + ")"; };
    return TreeNode;
}());
export { TreeNode };
// Return the list of T indexed by outlet name
export function nodeChildrenAsMap(node) {
    var map = {};
    if (node) {
        node.children.forEach(function (child) { return map[child.value.outlet] = child; });
    }
    return map;
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci9zcmMvdXRpbHMvdHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQVFBLElBQUE7SUFJRSxjQUFZLElBQWlCO1FBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7S0FBRTtJQUVyRCxzQkFBSSxzQkFBSTthQUFSLGNBQWdCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTs7O09BQUE7SUFFMUM7O09BRUc7Ozs7SUFDSCxxQkFBTTs7O0lBQU4sVUFBTyxDQUFJO1FBQ1QsSUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvQixPQUFPLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0tBQzlDO0lBRUQ7O09BRUc7Ozs7SUFDSCx1QkFBUTs7O0lBQVIsVUFBUyxDQUFJO1FBQ1gsSUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLEtBQUssRUFBUCxDQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0tBQzlDO0lBRUQ7O09BRUc7Ozs7SUFDSCx5QkFBVTs7O0lBQVYsVUFBVyxDQUFJO1FBQ2IsSUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEMsT0FBTyxDQUFDLElBQUksQ0FBQyxD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dGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmV4cG9ydCBjbGFzcyBUcmVlPFQ+IHtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfcm9vdDogVHJlZU5vZGU8VD47XG5cbiAgY29uc3RydWN0b3Iocm9vdDogVHJlZU5vZGU8VD4pIHsgdGhpcy5fcm9vdCA9IHJvb3Q7IH1cblxuICBnZXQgcm9vdCgpOiBUIHsgcmV0dXJuIHRoaXMuX3Jvb3QudmFsdWU7IH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqL1xuICBwYXJlbnQodDogVCk6IFR8bnVsbCB7XG4gICAgY29uc3QgcCA9IHRoaXMucGF0aEZyb21Sb290KHQpO1xuICAgIHJldHVybiBwLmxlbmd0aCA+IDEgPyBwW3AubGVuZ3RoIC0gMl0gOiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgY2hpbGRyZW4odDogVCk6IFRbXSB7XG4gICAgY29uc3QgbiA9IGZpbmROb2RlKHQsIHRoaXMuX3Jvb3QpO1xuICAgIHJldHVybiBuID8gbi5jaGlsZHJlbi5tYXAodCA9PiB0LnZhbHVlKSA6IFtdO1xuICB9XG5cbiAgLyoqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgZmlyc3RDaGlsZCh0OiBUKTogVHxudWxsIHtcbiAgICBjb25zdCBuID0gZmluZE5vZGUodCwgdGhpcy5fcm9vdCk7XG4gICAgcmV0dXJuIG4gJiYgbi5jaGlsZHJlbi5sZW5ndGggPiAwID8gbi5jaGlsZHJlblswXS52YWx1ZSA6IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqL1xuICBzaWJsaW5ncyh0OiBUKTogVFtdIHtcbiAgICBjb25zdCBwID0gZmluZFBhdGgodCwgdGhpcy5fcm9vdCk7XG4gICAgaWYgKHAubGVuZ3RoIDwgMikgcmV0dXJuIFtdO1xuXG4gICAgY29uc3QgYyA9IHBbcC5sZW5ndGggLSAyXS5jaGlsZHJlbi5tYXAoYyA9PiBjLnZhbHVlKTtcbiAgICByZXR1cm4gYy5maWx0ZXIoY2MgPT4gY2MgIT09IHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgcGF0aEZyb21Sb290KHQ6IFQpOiBUW10geyByZXR1cm4gZmluZFBhdGgodCwgdGhpcy5fcm9vdCkubWFwKHMgPT4gcy52YWx1ZSk7IH1cbn1cblxuXG4vLyBERlMgZm9yIHRoZSBub2RlIG1hdGNoaW5nIHRoZSB2YWx1ZVxuZnVuY3Rpb24gZmluZE5vZGU8VD4odmFsdWU6IFQsIG5vZGU6IFRyZWVOb2RlPFQ+KTogVHJlZU5vZGU8VD58bnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbm9kZS52YWx1ZSkgcmV0dXJuIG5vZGU7XG5cbiAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgY29uc3Qgbm9kZSA9IGZpbmROb2RlKHZhbHVlLCBjaGlsZCk7XG4gICAgaWYgKG5vZGUpIHJldHVybiBub2RlO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8vIFJldHVybiB0aGUgcGF0aCB0byB0aGUgbm9kZSB3aXRoIHRoZSBnaXZlbiB2YWx1ZSB1c2luZyBERlNcbmZ1bmN0aW9uIGZpbmRQYXRoPFQ+KHZhbHVlOiBULCBub2RlOiBUcmVlTm9kZTxUPik6IFRyZWVOb2RlPFQ+W10ge1xuICBpZiAodmFsdWUgPT09IG5vZGUudmFsdWUpIHJldHVybiBbbm9kZV07XG5cbiAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgY29uc3QgcGF0aCA9IGZpbmRQYXRoKHZhbHVlLCBjaGlsZCk7XG4gICAgaWYgKHBhdGgubGVuZ3RoKSB7XG4gICAgICBwYXRoLnVuc2hpZnQobm9kZSk7XG4gICAgICByZXR1cm4gcGF0aDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gW107XG59XG5cbmV4cG9ydCBjbGFzcyBUcmVlTm9kZTxUPiB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyB2YWx1ZTogVCwgcHVibGljIGNoaWxkcmVuOiBUcmVlTm9kZTxUPltdKSB7fVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7IHJldHVybiBgVHJlZU5vZGUoJHt0aGlzLnZhbHVlfSlgOyB9XG59XG5cbi8vIFJldHVybiB0aGUgbGlzdCBvZiBUIGluZGV4ZWQgYnkgb3V0bGV0IG5hbWVcbmV4cG9ydCBmdW5jdGlvbiBub2RlQ2hpbGRyZW5Bc01hcDxUIGV4dGVuZHN7b3V0bGV0OiBzdHJpbmd9Pihub2RlOiBUcmVlTm9kZTxUPnwgbnVsbCkge1xuICBjb25zdCBtYXA6IHtbb3V0bGV0OiBzdHJpbmddOiBUcmVlTm9kZTxUPn0gPSB7fTtcblxuICBpZiAobm9kZSkge1xuICAgIG5vZGUuY2hpbGRyZW4uZm9yRWFjaChjaGlsZCA9PiBtYXBbY2hpbGQudmFsdWUub3V0bGV0XSA9IGNoaWxkKTtcbiAgfVxuXG4gIHJldHVybiBtYXA7XG59Il19