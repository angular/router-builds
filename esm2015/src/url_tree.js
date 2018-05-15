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
import { PRIMARY_OUTLET, convertToParamMap } from './shared';
import { forEach, shallowEqual } from './utils/collection';
/**
 * @return {?}
 */
export function createEmptyUrlTree() {
    return new UrlTree(new UrlSegmentGroup([], {}), {}, null);
}
/**
 * @param {?} container
 * @param {?} containee
 * @param {?} exact
 * @return {?}
 */
export function containsTree(container, containee, exact) {
    if (exact) {
        return equalQueryParams(container.queryParams, containee.queryParams) &&
            equalSegmentGroups(container.root, containee.root);
    }
    return containsQueryParams(container.queryParams, containee.queryParams) &&
        containsSegmentGroup(container.root, containee.root);
}
/**
 * @param {?} container
 * @param {?} containee
 * @return {?}
 */
function equalQueryParams(container, containee) {
    return shallowEqual(container, containee);
}
/**
 * @param {?} container
 * @param {?} containee
 * @return {?}
 */
function equalSegmentGroups(container, containee) {
    if (!equalPath(container.segments, containee.segments))
        return false;
    if (container.numberOfChildren !== containee.numberOfChildren)
        return false;
    for (const /** @type {?} */ c in containee.children) {
        if (!container.children[c])
            return false;
        if (!equalSegmentGroups(container.children[c], containee.children[c]))
            return false;
    }
    return true;
}
/**
 * @param {?} container
 * @param {?} containee
 * @return {?}
 */
function containsQueryParams(container, containee) {
    return Object.keys(containee).length <= Object.keys(container).length &&
        Object.keys(containee).every(key => containee[key] === container[key]);
}
/**
 * @param {?} container
 * @param {?} containee
 * @return {?}
 */
function containsSegmentGroup(container, containee) {
    return containsSegmentGroupHelper(container, containee, containee.segments);
}
/**
 * @param {?} container
 * @param {?} containee
 * @param {?} containeePaths
 * @return {?}
 */
function containsSegmentGroupHelper(container, containee, containeePaths) {
    if (container.segments.length > containeePaths.length) {
        const /** @type {?} */ current = container.segments.slice(0, containeePaths.length);
        if (!equalPath(current, containeePaths))
            return false;
        if (containee.hasChildren())
            return false;
        return true;
    }
    else if (container.segments.length === containeePaths.length) {
        if (!equalPath(container.segments, containeePaths))
            return false;
        for (const /** @type {?} */ c in containee.children) {
            if (!container.children[c])
                return false;
            if (!containsSegmentGroup(container.children[c], containee.children[c]))
                return false;
        }
        return true;
    }
    else {
        const /** @type {?} */ current = containeePaths.slice(0, container.segments.length);
        const /** @type {?} */ next = containeePaths.slice(container.segments.length);
        if (!equalPath(container.segments, current))
            return false;
        if (!container.children[PRIMARY_OUTLET])
            return false;
        return containsSegmentGroupHelper(container.children[PRIMARY_OUTLET], containee, next);
    }
}
/**
 * \@description
 *
 * Represents the parsed URL.
 *
 * Since a router state is a tree, and the URL is nothing but a serialized state, the URL is a
 * serialized tree.
 * UrlTree is a data structure that provides a lot of affordances in dealing with URLs
 *
 * ### Example
 *
 * ```
 * \@Component({templateUrl:'template.html'})
 * class MyComponent {
 *   constructor(router: Router) {
 *     const tree: UrlTree =
 *       router.parseUrl('/team/33/(user/victor//support:help)?debug=true#fragment');
 *     const f = tree.fragment; // return 'fragment'
 *     const q = tree.queryParams; // returns {debug: 'true'}
 *     const g: UrlSegmentGroup = tree.root.children[PRIMARY_OUTLET];
 *     const s: UrlSegment[] = g.segments; // returns 2 segments 'team' and '33'
 *     g.children[PRIMARY_OUTLET].segments; // returns 2 segments 'user' and 'victor'
 *     g.children['support'].segments; // return 1 segment 'help'
 *   }
 * }
 * ```
 *
 *
 */
export class UrlTree {
    /**
     * \@internal
     * @param {?} root
     * @param {?} queryParams
     * @param {?} fragment
     */
    constructor(root, queryParams, fragment) {
        this.root = root;
        this.queryParams = queryParams;
        this.fragment = fragment;
    }
    /**
     * @return {?}
     */
    get queryParamMap() {
        if (!this._queryParamMap) {
            this._queryParamMap = convertToParamMap(this.queryParams);
        }
        return this._queryParamMap;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    toString() { return DEFAULT_SERIALIZER.serialize(this); }
}
function UrlTree_tsickle_Closure_declarations() {
    /**
     * \@internal
     * @type {?}
     */
    UrlTree.prototype._queryParamMap;
    /**
     * The root segment group of the URL tree
     * @type {?}
     */
    UrlTree.prototype.root;
    /**
     * The query params of the URL
     * @type {?}
     */
    UrlTree.prototype.queryParams;
    /**
     * The fragment of the URL
     * @type {?}
     */
    UrlTree.prototype.fragment;
}
/**
 * \@description
 *
 * Represents the parsed URL segment group.
 *
 * See `UrlTree` for more information.
 *
 *
 */
export class UrlSegmentGroup {
    /**
     * @param {?} segments
     * @param {?} children
     */
    constructor(segments, children) {
        this.segments = segments;
        this.children = children;
        /**
         * The parent node in the url tree
         */
        this.parent = null;
        forEach(children, (v, k) => v.parent = this);
    }
    /**
     * Whether the segment has child segments
     * @return {?}
     */
    hasChildren() { return this.numberOfChildren > 0; }
    /**
     * Number of child segments
     * @return {?}
     */
    get numberOfChildren() { return Object.keys(this.children).length; }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    toString() { return serializePaths(this); }
}
function UrlSegmentGroup_tsickle_Closure_declarations() {
    /**
     * \@internal
     * @type {?}
     */
    UrlSegmentGroup.prototype._sourceSegment;
    /**
     * \@internal
     * @type {?}
     */
    UrlSegmentGroup.prototype._segmentIndexShift;
    /**
     * The parent node in the url tree
     * @type {?}
     */
    UrlSegmentGroup.prototype.parent;
    /**
     * The URL segments of this group. See `UrlSegment` for more information
     * @type {?}
     */
    UrlSegmentGroup.prototype.segments;
    /**
     * The list of children of this group
     * @type {?}
     */
    UrlSegmentGroup.prototype.children;
}
/**
 * \@description
 *
 * Represents a single URL segment.
 *
 * A UrlSegment is a part of a URL between the two slashes. It contains a path and the matrix
 * parameters associated with the segment.
 *
 *  ## Example
 *
 * ```
 * \@Component({templateUrl:'template.html'})
 * class MyComponent {
 *   constructor(router: Router) {
 *     const tree: UrlTree = router.parseUrl('/team;id=33');
 *     const g: UrlSegmentGroup = tree.root.children[PRIMARY_OUTLET];
 *     const s: UrlSegment[] = g.segments;
 *     s[0].path; // returns 'team'
 *     s[0].parameters; // returns {id: 33}
 *   }
 * }
 * ```
 *
 *
 */
export class UrlSegment {
    /**
     * @param {?} path
     * @param {?} parameters
     */
    constructor(path, parameters) {
        this.path = path;
        this.parameters = parameters;
    }
    /**
     * @return {?}
     */
    get parameterMap() {
        if (!this._parameterMap) {
            this._parameterMap = convertToParamMap(this.parameters);
        }
        return this._parameterMap;
    }
    /**
     * \@docsNotRequired
     * @return {?}
     */
    toString() { return serializePath(this); }
}
function UrlSegment_tsickle_Closure_declarations() {
    /**
     * \@internal
     * @type {?}
     */
    UrlSegment.prototype._parameterMap;
    /**
     * The path part of a URL segment
     * @type {?}
     */
    UrlSegment.prototype.path;
    /**
     * The matrix parameters associated with a segment
     * @type {?}
     */
    UrlSegment.prototype.parameters;
}
/**
 * @param {?} as
 * @param {?} bs
 * @return {?}
 */
export function equalSegments(as, bs) {
    return equalPath(as, bs) && as.every((a, i) => shallowEqual(a.parameters, bs[i].parameters));
}
/**
 * @param {?} as
 * @param {?} bs
 * @return {?}
 */
export function equalPath(as, bs) {
    if (as.length !== bs.length)
        return false;
    return as.every((a, i) => a.path === bs[i].path);
}
/**
 * @template T
 * @param {?} segment
 * @param {?} fn
 * @return {?}
 */
export function mapChildrenIntoArray(segment, fn) {
    let /** @type {?} */ res = [];
    forEach(segment.children, (child, childOutlet) => {
        if (childOutlet === PRIMARY_OUTLET) {
            res = res.concat(fn(child, childOutlet));
        }
    });
    forEach(segment.children, (child, childOutlet) => {
        if (childOutlet !== PRIMARY_OUTLET) {
            res = res.concat(fn(child, childOutlet));
        }
    });
    return res;
}
/**
 * \@description
 *
 * Serializes and deserializes a URL string into a URL tree.
 *
 * The url serialization strategy is customizable. You can
 * make all URLs case insensitive by providing a custom UrlSerializer.
 *
 * See `DefaultUrlSerializer` for an example of a URL serializer.
 *
 *
 * @abstract
 */
export class UrlSerializer {
}
function UrlSerializer_tsickle_Closure_declarations() {
    /**
     * Parse a url into a `UrlTree`
     * @abstract
     * @param {?} url
     * @return {?}
     */
    UrlSerializer.prototype.parse = function (url) { };
    /**
     * Converts a `UrlTree` into a url
     * @abstract
     * @param {?} tree
     * @return {?}
     */
    UrlSerializer.prototype.serialize = function (tree) { };
}
/**
 * \@description
 *
 * A default implementation of the `UrlSerializer`.
 *
 * Example URLs:
 *
 * ```
 * /inbox/33(popup:compose)
 * /inbox/33;open=true/messages/44
 * ```
 *
 * DefaultUrlSerializer uses parentheses to serialize secondary segments (e.g., popup:compose), the
 * colon syntax to specify the outlet, and the ';parameter=value' syntax (e.g., open=true) to
 * specify route specific parameters.
 *
 *
 */
export class DefaultUrlSerializer {
    /**
     * Parses a url into a `UrlTree`
     * @param {?} url
     * @return {?}
     */
    parse(url) {
        const /** @type {?} */ p = new UrlParser(url);
        return new UrlTree(p.parseRootSegment(), p.parseQueryParams(), p.parseFragment());
    }
    /**
     * Converts a `UrlTree` into a url
     * @param {?} tree
     * @return {?}
     */
    serialize(tree) {
        const /** @type {?} */ segment = `/${serializeSegment(tree.root, true)}`;
        const /** @type {?} */ query = serializeQueryParams(tree.queryParams);
        const /** @type {?} */ fragment = typeof tree.fragment === `string` ? `#${encodeUriFragment((/** @type {?} */ ((tree.fragment))))}` : '';
        return `${segment}${query}${fragment}`;
    }
}
const /** @type {?} */ DEFAULT_SERIALIZER = new DefaultUrlSerializer();
/**
 * @param {?} segment
 * @return {?}
 */
export function serializePaths(segment) {
    return segment.segments.map(p => serializePath(p)).join('/');
}
/**
 * @param {?} segment
 * @param {?} root
 * @return {?}
 */
function serializeSegment(segment, root) {
    if (!segment.hasChildren()) {
        return serializePaths(segment);
    }
    if (root) {
        const /** @type {?} */ primary = segment.children[PRIMARY_OUTLET] ?
            serializeSegment(segment.children[PRIMARY_OUTLET], false) :
            '';
        const /** @type {?} */ children = [];
        forEach(segment.children, (v, k) => {
            if (k !== PRIMARY_OUTLET) {
                children.push(`${k}:${serializeSegment(v, false)}`);
            }
        });
        return children.length > 0 ? `${primary}(${children.join('//')})` : primary;
    }
    else {
        const /** @type {?} */ children = mapChildrenIntoArray(segment, (v, k) => {
            if (k === PRIMARY_OUTLET) {
                return [serializeSegment(segment.children[PRIMARY_OUTLET], false)];
            }
            return [`${k}:${serializeSegment(v, false)}`];
        });
        return `${serializePaths(segment)}/(${children.join('//')})`;
    }
}
/**
 * Encodes a URI string with the default encoding. This function will only ever be called from
 * `encodeUriQuery` or `encodeUriSegment` as it's the base set of encodings to be used. We need
 * a custom encoding because encodeURIComponent is too aggressive and encodes stuff that doesn't
 * have to be encoded per https://url.spec.whatwg.org.
 * @param {?} s
 * @return {?}
 */
function encodeUriString(s) {
    return encodeURIComponent(s)
        .replace(/%40/g, '@')
        .replace(/%3A/gi, ':')
        .replace(/%24/g, '$')
        .replace(/%2C/gi, ',');
}
/**
 * This function should be used to encode both keys and values in a query string key/value. In
 * the following URL, you need to call encodeUriQuery on "k" and "v":
 *
 * http://www.site.org/html;mk=mv?k=v#f
 * @param {?} s
 * @return {?}
 */
export function encodeUriQuery(s) {
    return encodeUriString(s).replace(/%3B/gi, ';');
}
/**
 * This function should be used to encode a URL fragment. In the following URL, you need to call
 * encodeUriFragment on "f":
 *
 * http://www.site.org/html;mk=mv?k=v#f
 * @param {?} s
 * @return {?}
 */
export function encodeUriFragment(s) {
    return encodeURI(s);
}
/**
 * This function should be run on any URI segment as well as the key and value in a key/value
 * pair for matrix params. In the following URL, you need to call encodeUriSegment on "html",
 * "mk", and "mv":
 *
 * http://www.site.org/html;mk=mv?k=v#f
 * @param {?} s
 * @return {?}
 */
export function encodeUriSegment(s) {
    return encodeUriString(s).replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/%26/gi, '&');
}
/**
 * @param {?} s
 * @return {?}
 */
export function decode(s) {
    return decodeURIComponent(s);
}
/**
 * @param {?} s
 * @return {?}
 */
export function decodeQuery(s) {
    return decode(s.replace(/\+/g, '%20'));
}
/**
 * @param {?} path
 * @return {?}
 */
export function serializePath(path) {
    return `${encodeUriSegment(path.path)}${serializeMatrixParams(path.parameters)}`;
}
/**
 * @param {?} params
 * @return {?}
 */
function serializeMatrixParams(params) {
    return Object.keys(params)
        .map(key => `;${encodeUriSegment(key)}=${encodeUriSegment(params[key])}`)
        .join('');
}
/**
 * @param {?} params
 * @return {?}
 */
function serializeQueryParams(params) {
    const /** @type {?} */ strParams = Object.keys(params).map((name) => {
        const /** @type {?} */ value = params[name];
        return Array.isArray(value) ?
            value.map(v => `${encodeUriQuery(name)}=${encodeUriQuery(v)}`).join('&') :
            `${encodeUriQuery(name)}=${encodeUriQuery(value)}`;
    });
    return strParams.length ? `?${strParams.join("&")}` : '';
}
const /** @type {?} */ SEGMENT_RE = /^[^\/()?;=#]+/;
/**
 * @param {?} str
 * @return {?}
 */
function matchSegments(str) {
    const /** @type {?} */ match = str.match(SEGMENT_RE);
    return match ? match[0] : '';
}
const /** @type {?} */ QUERY_PARAM_RE = /^[^=?&#]+/;
/**
 * @param {?} str
 * @return {?}
 */
function matchQueryParams(str) {
    const /** @type {?} */ match = str.match(QUERY_PARAM_RE);
    return match ? match[0] : '';
}
const /** @type {?} */ QUERY_PARAM_VALUE_RE = /^[^?&#]+/;
/**
 * @param {?} str
 * @return {?}
 */
function matchUrlQueryParamValue(str) {
    const /** @type {?} */ match = str.match(QUERY_PARAM_VALUE_RE);
    return match ? match[0] : '';
}
class UrlParser {
    /**
     * @param {?} url
     */
    constructor(url) {
        this.url = url;
        this.remaining = url;
    }
    /**
     * @return {?}
     */
    parseRootSegment() {
        this.consumeOptional('/');
        if (this.remaining === '' || this.peekStartsWith('?') || this.peekStartsWith('#')) {
            return new UrlSegmentGroup([], {});
        }
        // The root segment group never has segments
        return new UrlSegmentGroup([], this.parseChildren());
    }
    /**
     * @return {?}
     */
    parseQueryParams() {
        const /** @type {?} */ params = {};
        if (this.consumeOptional('?')) {
            do {
                this.parseQueryParam(params);
            } while (this.consumeOptional('&'));
        }
        return params;
    }
    /**
     * @return {?}
     */
    parseFragment() {
        return this.consumeOptional('#') ? decodeURIComponent(this.remaining) : null;
    }
    /**
     * @return {?}
     */
    parseChildren() {
        if (this.remaining === '') {
            return {};
        }
        this.consumeOptional('/');
        const /** @type {?} */ segments = [];
        if (!this.peekStartsWith('(')) {
            segments.push(this.parseSegment());
        }
        while (this.peekStartsWith('/') && !this.peekStartsWith('//') && !this.peekStartsWith('/(')) {
            this.capture('/');
            segments.push(this.parseSegment());
        }
        let /** @type {?} */ children = {};
        if (this.peekStartsWith('/(')) {
            this.capture('/');
            children = this.parseParens(true);
        }
        let /** @type {?} */ res = {};
        if (this.peekStartsWith('(')) {
            res = this.parseParens(false);
        }
        if (segments.length > 0 || Object.keys(children).length > 0) {
            res[PRIMARY_OUTLET] = new UrlSegmentGroup(segments, children);
        }
        return res;
    }
    /**
     * @return {?}
     */
    parseSegment() {
        const /** @type {?} */ path = matchSegments(this.remaining);
        if (path === '' && this.peekStartsWith(';')) {
            throw new Error(`Empty path url segment cannot have parameters: '${this.remaining}'.`);
        }
        this.capture(path);
        return new UrlSegment(decode(path), this.parseMatrixParams());
    }
    /**
     * @return {?}
     */
    parseMatrixParams() {
        const /** @type {?} */ params = {};
        while (this.consumeOptional(';')) {
            this.parseParam(params);
        }
        return params;
    }
    /**
     * @param {?} params
     * @return {?}
     */
    parseParam(params) {
        const /** @type {?} */ key = matchSegments(this.remaining);
        if (!key) {
            return;
        }
        this.capture(key);
        let /** @type {?} */ value = '';
        if (this.consumeOptional('=')) {
            const /** @type {?} */ valueMatch = matchSegments(this.remaining);
            if (valueMatch) {
                value = valueMatch;
                this.capture(value);
            }
        }
        params[decode(key)] = decode(value);
    }
    /**
     * @param {?} params
     * @return {?}
     */
    parseQueryParam(params) {
        const /** @type {?} */ key = matchQueryParams(this.remaining);
        if (!key) {
            return;
        }
        this.capture(key);
        let /** @type {?} */ value = '';
        if (this.consumeOptional('=')) {
            const /** @type {?} */ valueMatch = matchUrlQueryParamValue(this.remaining);
            if (valueMatch) {
                value = valueMatch;
                this.capture(value);
            }
        }
        const /** @type {?} */ decodedKey = decodeQuery(key);
        const /** @type {?} */ decodedVal = decodeQuery(value);
        if (params.hasOwnProperty(decodedKey)) {
            // Append to existing values
            let /** @type {?} */ currentVal = params[decodedKey];
            if (!Array.isArray(currentVal)) {
                currentVal = [currentVal];
                params[decodedKey] = currentVal;
            }
            currentVal.push(decodedVal);
        }
        else {
            // Create a new value
            params[decodedKey] = decodedVal;
        }
    }
    /**
     * @param {?} allowPrimary
     * @return {?}
     */
    parseParens(allowPrimary) {
        const /** @type {?} */ segments = {};
        this.capture('(');
        while (!this.consumeOptional(')') && this.remaining.length > 0) {
            const /** @type {?} */ path = matchSegments(this.remaining);
            const /** @type {?} */ next = this.remaining[path.length];
            // if is is not one of these characters, then the segment was unescaped
            // or the group was not closed
            if (next !== '/' && next !== ')' && next !== ';') {
                throw new Error(`Cannot parse url '${this.url}'`);
            }
            let /** @type {?} */ outletName = /** @type {?} */ ((undefined));
            if (path.indexOf(':') > -1) {
                outletName = path.substr(0, path.indexOf(':'));
                this.capture(outletName);
                this.capture(':');
            }
            else if (allowPrimary) {
                outletName = PRIMARY_OUTLET;
            }
            const /** @type {?} */ children = this.parseChildren();
            segments[outletName] = Object.keys(children).length === 1 ? children[PRIMARY_OUTLET] :
                new UrlSegmentGroup([], children);
            this.consumeOptional('//');
        }
        return segments;
    }
    /**
     * @param {?} str
     * @return {?}
     */
    peekStartsWith(str) { return this.remaining.startsWith(str); }
    /**
     * @param {?} str
     * @return {?}
     */
    consumeOptional(str) {
        if (this.peekStartsWith(str)) {
            this.remaining = this.remaining.substring(str.length);
            return true;
        }
        return false;
    }
    /**
     * @param {?} str
     * @return {?}
     */
    capture(str) {
        if (!this.consumeOptional(str)) {
            throw new Error(`Expected "${str}".`);
        }
    }
}
function UrlParser_tsickle_Closure_declarations() {
    /** @type {?} */
    UrlParser.prototype.remaining;
    /** @type {?} */
    UrlParser.prototype.url;
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsX3RyZWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3VybF90cmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBUUEsT0FBTyxFQUFDLGNBQWMsRUFBWSxpQkFBaUIsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUNyRSxPQUFPLEVBQUMsT0FBTyxFQUFFLFlBQVksRUFBQyxNQUFNLG9CQUFvQixDQUFDOzs7O0FBRXpELE1BQU07SUFDSixPQUFPLElBQUksT0FBTyxDQUFDLElBQUksZUFBZSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7Q0FDM0Q7Ozs7Ozs7QUFFRCxNQUFNLHVCQUF1QixTQUFrQixFQUFFLFNBQWtCLEVBQUUsS0FBYztJQUNqRixJQUFJLEtBQUssRUFBRTtRQUNULE9BQU8sZ0JBQWdCLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDO1lBQ2pFLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3hEO0lBRUQsT0FBTyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUM7UUFDcEUsb0JBQW9CLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDMUQ7Ozs7OztBQUVELDBCQUNJLFNBQWdDLEVBQUUsU0FBZ0M7SUFDcEUsT0FBTyxZQUFZLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0NBQzNDOzs7Ozs7QUFFRCw0QkFBNEIsU0FBMEIsRUFBRSxTQUEwQjtJQUNoRixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQztRQUFFLE9BQU8sS0FBSyxDQUFD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Q0FBQzs7Ozs7O0lBR1YsY0FBYyxDQUFDLEdBQVcsSUFBYSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDOzs7OztJQUc3RSxlQUFlLENBQUMsR0FBVztRQUNqQyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDNUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdEQsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELE9BQU8sS0FBSyxDQUFDOzs7Ozs7SUFHUCxPQUFPLENBQUMsR0FBVztRQUN6QixJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUM5QixNQUFNLElBQUksS0FBSyxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsQ0FBQztTQUN2Qzs7Q0FFSiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtQUklNQVJZX09VVExFVCwgUGFyYW1NYXAsIGNvbnZlcnRUb1BhcmFtTWFwfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge2ZvckVhY2gsIHNoYWxsb3dFcXVhbH0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVtcHR5VXJsVHJlZSgpIHtcbiAgcmV0dXJuIG5ldyBVcmxUcmVlKG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KSwge30sIG51bGwpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29udGFpbnNUcmVlKGNvbnRhaW5lcjogVXJsVHJlZSwgY29udGFpbmVlOiBVcmxUcmVlLCBleGFjdDogYm9vbGVhbik6IGJvb2xlYW4ge1xuICBpZiAoZXhhY3QpIHtcbiAgICByZXR1cm4gZXF1YWxRdWVyeVBhcmFtcyhjb250YWluZXIucXVlcnlQYXJhbXMsIGNvbnRhaW5lZS5xdWVyeVBhcmFtcykgJiZcbiAgICAgICAgZXF1YWxTZWdtZW50R3JvdXBzKGNvbnRhaW5lci5yb290LCBjb250YWluZWUucm9vdCk7XG4gIH1cblxuICByZXR1cm4gY29udGFpbnNRdWVyeVBhcmFtcyhjb250YWluZXIucXVlcnlQYXJhbXMsIGNvbnRhaW5lZS5xdWVyeVBhcmFtcykgJiZcbiAgICAgIGNvbnRhaW5zU2VnbWVudEdyb3VwKGNvbnRhaW5lci5yb290LCBjb250YWluZWUucm9vdCk7XG59XG5cbmZ1bmN0aW9uIGVxdWFsUXVlcnlQYXJhbXMoXG4gICAgY29udGFpbmVyOiB7W2s6IHN0cmluZ106IHN0cmluZ30sIGNvbnRhaW5lZToge1trOiBzdHJpbmddOiBzdHJpbmd9KTogYm9vbGVhbiB7XG4gIHJldHVybiBzaGFsbG93RXF1YWwoY29udGFpbmVyLCBjb250YWluZWUpO1xufVxuXG5mdW5jdGlvbiBlcXVhbFNlZ21lbnRHcm91cHMoY29udGFpbmVyOiBVcmxTZWdtZW50R3JvdXAsIGNvbnRhaW5lZTogVXJsU2VnbWVudEdyb3VwKTogYm9vbGVhbiB7XG4gIGlmICghZXF1YWxQYXRoKGNvbnRhaW5lci5zZWdtZW50cywgY29udGFpbmVlLnNlZ21lbnRzKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoY29udGFpbmVyLm51bWJlck9mQ2hpbGRyZW4gIT09IGNvbnRhaW5lZS5udW1iZXJPZkNoaWxkcmVuKSByZXR1cm4gZmFsc2U7XG4gIGZvciAoY29uc3QgYyBpbiBjb250YWluZWUuY2hpbGRyZW4pIHtcbiAgICBpZiAoIWNvbnRhaW5lci5jaGlsZHJlbltjXSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghZXF1YWxTZWdtZW50R3JvdXBzKGNvbnRhaW5lci5jaGlsZHJlbltjXSwgY29udGFpbmVlLmNoaWxkcmVuW2NdKSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBjb250YWluc1F1ZXJ5UGFyYW1zKFxuICAgIGNvbnRhaW5lcjoge1trOiBzdHJpbmddOiBzdHJpbmd9LCBjb250YWluZWU6IHtbazogc3RyaW5nXTogc3RyaW5nfSk6IGJvb2xlYW4ge1xuICByZXR1cm4gT2JqZWN0LmtleXMoY29udGFpbmVlKS5sZW5ndGggPD0gT2JqZWN0LmtleXMoY29udGFpbmVyKS5sZW5ndGggJiZcbiAgICAgIE9iamVjdC5rZXlzKGNvbnRhaW5lZSkuZXZlcnkoa2V5ID0+IGNvbnRhaW5lZVtrZXldID09PSBjb250YWluZXJba2V5XSk7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zU2VnbWVudEdyb3VwKGNvbnRhaW5lcjogVXJsU2VnbWVudEdyb3VwLCBjb250YWluZWU6IFVybFNlZ21lbnRHcm91cCk6IGJvb2xlYW4ge1xuICByZXR1cm4gY29udGFpbnNTZWdtZW50R3JvdXBIZWxwZXIoY29udGFpbmVyLCBjb250YWluZWUsIGNvbnRhaW5lZS5zZWdtZW50cyk7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zU2VnbWVudEdyb3VwSGVscGVyKFxuICAgIGNvbnRhaW5lcjogVXJsU2VnbWVudEdyb3VwLCBjb250YWluZWU6IFVybFNlZ21lbnRHcm91cCwgY29udGFpbmVlUGF0aHM6IFVybFNlZ21lbnRbXSk6IGJvb2xlYW4ge1xuICBpZiAoY29udGFpbmVyLnNlZ21lbnRzLmxlbmd0aCA+IGNvbnRhaW5lZVBhdGhzLmxlbmd0aCkge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBjb250YWluZXIuc2VnbWVudHMuc2xpY2UoMCwgY29udGFpbmVlUGF0aHMubGVuZ3RoKTtcbiAgICBpZiAoIWVxdWFsUGF0aChjdXJyZW50LCBjb250YWluZWVQYXRocykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoY29udGFpbmVlLmhhc0NoaWxkcmVuKCkpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcblxuICB9IGVsc2UgaWYgKGNvbnRhaW5lci5zZWdtZW50cy5sZW5ndGggPT09IGNvbnRhaW5lZVBhdGhzLmxlbmd0aCkge1xuICAgIGlmICghZXF1YWxQYXRoKGNvbnRhaW5lci5zZWdtZW50cywgY29udGFpbmVlUGF0aHMpKSByZXR1cm4gZmFsc2U7XG4gICAgZm9yIChjb25zdCBjIGluIGNvbnRhaW5lZS5jaGlsZHJlbikge1xuICAgICAgaWYgKCFjb250YWluZXIuY2hpbGRyZW5bY10pIHJldHVybiBmYWxzZTtcbiAgICAgIGlmICghY29udGFpbnNTZWdtZW50R3JvdXAoY29udGFpbmVyLmNoaWxkcmVuW2NdLCBjb250YWluZWUuY2hpbGRyZW5bY10pKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuXG4gIH0gZWxzZSB7XG4gICAgY29uc3QgY3VycmVudCA9IGNvbnRhaW5lZVBhdGhzLnNsaWNlKDAsIGNvbnRhaW5lci5zZWdtZW50cy5sZW5ndGgpO1xuICAgIGNvbnN0IG5leHQgPSBjb250YWluZWVQYXRocy5zbGljZShjb250YWluZXIuc2VnbWVudHMubGVuZ3RoKTtcbiAgICBpZiAoIWVxdWFsUGF0aChjb250YWluZXIuc2VnbWVudHMsIGN1cnJlbnQpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFjb250YWluZXIuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIGNvbnRhaW5zU2VnbWVudEdyb3VwSGVscGVyKGNvbnRhaW5lci5jaGlsZHJlbltQUklNQVJZX09VVExFVF0sIGNvbnRhaW5lZSwgbmV4dCk7XG4gIH1cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIHRoZSBwYXJzZWQgVVJMLlxuICpcbiAqIFNpbmNlIGEgcm91dGVyIHN0YXRlIGlzIGEgdHJlZSwgYW5kIHRoZSBVUkwgaXMgbm90aGluZyBidXQgYSBzZXJpYWxpemVkIHN0YXRlLCB0aGUgVVJMIGlzIGFcbiAqIHNlcmlhbGl6ZWQgdHJlZS5cbiAqIFVybFRyZWUgaXMgYSBkYXRhIHN0cnVjdHVyZSB0aGF0IHByb3ZpZGVzIGEgbG90IG9mIGFmZm9yZGFuY2VzIGluIGRlYWxpbmcgd2l0aCBVUkxzXG4gKlxuICogIyMjIEV4YW1wbGVcbiAqXG4gKiBgYGBcbiAqIEBDb21wb25lbnQoe3RlbXBsYXRlVXJsOid0ZW1wbGF0ZS5odG1sJ30pXG4gKiBjbGFzcyBNeUNvbXBvbmVudCB7XG4gKiAgIGNvbnN0cnVjdG9yKHJvdXRlcjogUm91dGVyKSB7XG4gKiAgICAgY29uc3QgdHJlZTogVXJsVHJlZSA9XG4gKiAgICAgICByb3V0ZXIucGFyc2VVcmwoJy90ZWFtLzMzLyh1c2VyL3ZpY3Rvci8vc3VwcG9ydDpoZWxwKT9kZWJ1Zz10cnVlI2ZyYWdtZW50Jyk7XG4gKiAgICAgY29uc3QgZiA9IHRyZWUuZnJhZ21lbnQ7IC8vIHJldHVybiAnZnJhZ21lbnQnXG4gKiAgICAgY29uc3QgcSA9IHRyZWUucXVlcnlQYXJhbXM7IC8vIHJldHVybnMge2RlYnVnOiAndHJ1ZSd9XG4gKiAgICAgY29uc3QgZzogVXJsU2VnbWVudEdyb3VwID0gdHJlZS5yb290LmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXTtcbiAqICAgICBjb25zdCBzOiBVcmxTZWdtZW50W10gPSBnLnNlZ21lbnRzOyAvLyByZXR1cm5zIDIgc2VnbWVudHMgJ3RlYW0nIGFuZCAnMzMnXG4gKiAgICAgZy5jaGlsZHJlbltQUklNQVJZX09VVExFVF0uc2VnbWVudHM7IC8vIHJldHVybnMgMiBzZWdtZW50cyAndXNlcicgYW5kICd2aWN0b3InXG4gKiAgICAgZy5jaGlsZHJlblsnc3VwcG9ydCddLnNlZ21lbnRzOyAvLyByZXR1cm4gMSBzZWdtZW50ICdoZWxwJ1xuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKlxuICovXG5leHBvcnQgY2xhc3MgVXJsVHJlZSB7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX3F1ZXJ5UGFyYW1NYXA6IFBhcmFtTWFwO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogVGhlIHJvb3Qgc2VnbWVudCBncm91cCBvZiB0aGUgVVJMIHRyZWUgKi9cbiAgICAgIHB1YmxpYyByb290OiBVcmxTZWdtZW50R3JvdXAsXG4gICAgICAvKiogVGhlIHF1ZXJ5IHBhcmFtcyBvZiB0aGUgVVJMICovXG4gICAgICBwdWJsaWMgcXVlcnlQYXJhbXM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9LFxuICAgICAgLyoqIFRoZSBmcmFnbWVudCBvZiB0aGUgVVJMICovXG4gICAgICBwdWJsaWMgZnJhZ21lbnQ6IHN0cmluZ3xudWxsKSB7fVxuXG4gIGdldCBxdWVyeVBhcmFtTWFwKCk6IFBhcmFtTWFwIHtcbiAgICBpZiAoIXRoaXMuX3F1ZXJ5UGFyYW1NYXApIHtcbiAgICAgIHRoaXMuX3F1ZXJ5UGFyYW1NYXAgPSBjb252ZXJ0VG9QYXJhbU1hcCh0aGlzLnF1ZXJ5UGFyYW1zKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UGFyYW1NYXA7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICB0b1N0cmluZygpOiBzdHJpbmcgeyByZXR1cm4gREVGQVVMVF9TRVJJQUxJWkVSLnNlcmlhbGl6ZSh0aGlzKTsgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIHBhcnNlZCBVUkwgc2VnbWVudCBncm91cC5cbiAqXG4gKiBTZWUgYFVybFRyZWVgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICpcbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBVcmxTZWdtZW50R3JvdXAge1xuICAvKiogQGludGVybmFsICovXG4gIF9zb3VyY2VTZWdtZW50OiBVcmxTZWdtZW50R3JvdXA7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX3NlZ21lbnRJbmRleFNoaWZ0OiBudW1iZXI7XG4gIC8qKiBUaGUgcGFyZW50IG5vZGUgaW4gdGhlIHVybCB0cmVlICovXG4gIHBhcmVudDogVXJsU2VnbWVudEdyb3VwfG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIFRoZSBVUkwgc2VnbWVudHMgb2YgdGhpcyBncm91cC4gU2VlIGBVcmxTZWdtZW50YCBmb3IgbW9yZSBpbmZvcm1hdGlvbiAqL1xuICAgICAgcHVibGljIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgICAvKiogVGhlIGxpc3Qgb2YgY2hpbGRyZW4gb2YgdGhpcyBncm91cCAqL1xuICAgICAgcHVibGljIGNoaWxkcmVuOiB7W2tleTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSkge1xuICAgIGZvckVhY2goY2hpbGRyZW4sICh2OiBhbnksIGs6IGFueSkgPT4gdi5wYXJlbnQgPSB0aGlzKTtcbiAgfVxuXG4gIC8qKiBXaGV0aGVyIHRoZSBzZWdtZW50IGhhcyBjaGlsZCBzZWdtZW50cyAqL1xuICBoYXNDaGlsZHJlbigpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMubnVtYmVyT2ZDaGlsZHJlbiA+IDA7IH1cblxuICAvKiogTnVtYmVyIG9mIGNoaWxkIHNlZ21lbnRzICovXG4gIGdldCBudW1iZXJPZkNoaWxkcmVuKCk6IG51bWJlciB7IHJldHVybiBPYmplY3Qua2V5cyh0aGlzLmNoaWxkcmVuKS5sZW5ndGg7IH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICB0b1N0cmluZygpOiBzdHJpbmcgeyByZXR1cm4gc2VyaWFsaXplUGF0aHModGhpcyk7IH1cbn1cblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgYSBzaW5nbGUgVVJMIHNlZ21lbnQuXG4gKlxuICogQSBVcmxTZWdtZW50IGlzIGEgcGFydCBvZiBhIFVSTCBiZXR3ZWVuIHRoZSB0d28gc2xhc2hlcy4gSXQgY29udGFpbnMgYSBwYXRoIGFuZCB0aGUgbWF0cml4XG4gKiBwYXJhbWV0ZXJzIGFzc29jaWF0ZWQgd2l0aCB0aGUgc2VnbWVudC5cbiAqXG4gKsKgIyMgRXhhbXBsZVxuICpcbiAqIGBgYFxuICogQENvbXBvbmVudCh7dGVtcGxhdGVVcmw6J3RlbXBsYXRlLmh0bWwnfSlcbiAqIGNsYXNzIE15Q29tcG9uZW50IHtcbiAqICAgY29uc3RydWN0b3Iocm91dGVyOiBSb3V0ZXIpIHtcbiAqICAgICBjb25zdCB0cmVlOiBVcmxUcmVlID0gcm91dGVyLnBhcnNlVXJsKCcvdGVhbTtpZD0zMycpO1xuICogICAgIGNvbnN0IGc6IFVybFNlZ21lbnRHcm91cCA9IHRyZWUucm9vdC5jaGlsZHJlbltQUklNQVJZX09VVExFVF07XG4gKiAgICAgY29uc3QgczogVXJsU2VnbWVudFtdID0gZy5zZWdtZW50cztcbiAqICAgICBzWzBdLnBhdGg7IC8vIHJldHVybnMgJ3RlYW0nXG4gKiAgICAgc1swXS5wYXJhbWV0ZXJzOyAvLyByZXR1cm5zIHtpZDogMzN9XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBVcmxTZWdtZW50IHtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfcGFyYW1ldGVyTWFwOiBQYXJhbU1hcDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBUaGUgcGF0aCBwYXJ0IG9mIGEgVVJMIHNlZ21lbnQgKi9cbiAgICAgIHB1YmxpYyBwYXRoOiBzdHJpbmcsXG5cbiAgICAgIC8qKiBUaGUgbWF0cml4IHBhcmFtZXRlcnMgYXNzb2NpYXRlZCB3aXRoIGEgc2VnbWVudCAqL1xuICAgICAgcHVibGljIHBhcmFtZXRlcnM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSkge31cblxuICBnZXQgcGFyYW1ldGVyTWFwKCkge1xuICAgIGlmICghdGhpcy5fcGFyYW1ldGVyTWFwKSB7XG4gICAgICB0aGlzLl9wYXJhbWV0ZXJNYXAgPSBjb252ZXJ0VG9QYXJhbU1hcCh0aGlzLnBhcmFtZXRlcnMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcGFyYW1ldGVyTWFwO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHsgcmV0dXJuIHNlcmlhbGl6ZVBhdGgodGhpcyk7IH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsU2VnbWVudHMoYXM6IFVybFNlZ21lbnRbXSwgYnM6IFVybFNlZ21lbnRbXSk6IGJvb2xlYW4ge1xuICByZXR1cm4gZXF1YWxQYXRoKGFzLCBicykgJiYgYXMuZXZlcnkoKGEsIGkpID0+IHNoYWxsb3dFcXVhbChhLnBhcmFtZXRlcnMsIGJzW2ldLnBhcmFtZXRlcnMpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsUGF0aChhczogVXJsU2VnbWVudFtdLCBiczogVXJsU2VnbWVudFtdKTogYm9vbGVhbiB7XG4gIGlmIChhcy5sZW5ndGggIT09IGJzLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gYXMuZXZlcnkoKGEsIGkpID0+IGEucGF0aCA9PT0gYnNbaV0ucGF0aCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXBDaGlsZHJlbkludG9BcnJheTxUPihcbiAgICBzZWdtZW50OiBVcmxTZWdtZW50R3JvdXAsIGZuOiAodjogVXJsU2VnbWVudEdyb3VwLCBrOiBzdHJpbmcpID0+IFRbXSk6IFRbXSB7XG4gIGxldCByZXM6IFRbXSA9IFtdO1xuICBmb3JFYWNoKHNlZ21lbnQuY2hpbGRyZW4sIChjaGlsZDogVXJsU2VnbWVudEdyb3VwLCBjaGlsZE91dGxldDogc3RyaW5nKSA9PiB7XG4gICAgaWYgKGNoaWxkT3V0bGV0ID09PSBQUklNQVJZX09VVExFVCkge1xuICAgICAgcmVzID0gcmVzLmNvbmNhdChmbihjaGlsZCwgY2hpbGRPdXRsZXQpKTtcbiAgICB9XG4gIH0pO1xuICBmb3JFYWNoKHNlZ21lbnQuY2hpbGRyZW4sIChjaGlsZDogVXJsU2VnbWVudEdyb3VwLCBjaGlsZE91dGxldDogc3RyaW5nKSA9PiB7XG4gICAgaWYgKGNoaWxkT3V0bGV0ICE9PSBQUklNQVJZX09VVExFVCkge1xuICAgICAgcmVzID0gcmVzLmNvbmNhdChmbihjaGlsZCwgY2hpbGRPdXRsZXQpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gcmVzO1xufVxuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogU2VyaWFsaXplcyBhbmQgZGVzZXJpYWxpemVzIGEgVVJMIHN0cmluZyBpbnRvIGEgVVJMIHRyZWUuXG4gKlxuICogVGhlIHVybCBzZXJpYWxpemF0aW9uIHN0cmF0ZWd5IGlzIGN1c3RvbWl6YWJsZS4gWW91IGNhblxuICogbWFrZSBhbGwgVVJMcyBjYXNlIGluc2Vuc2l0aXZlIGJ5IHByb3ZpZGluZyBhIGN1c3RvbSBVcmxTZXJpYWxpemVyLlxuICpcbiAqIFNlZSBgRGVmYXVsdFVybFNlcmlhbGl6ZXJgIGZvciBhbiBleGFtcGxlIG9mIGEgVVJMIHNlcmlhbGl6ZXIuXG4gKlxuICpcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFVybFNlcmlhbGl6ZXIge1xuICAvKiogUGFyc2UgYSB1cmwgaW50byBhIGBVcmxUcmVlYCAqL1xuICBhYnN0cmFjdCBwYXJzZSh1cmw6IHN0cmluZyk6IFVybFRyZWU7XG5cbiAgLyoqIENvbnZlcnRzIGEgYFVybFRyZWVgIGludG8gYSB1cmwgKi9cbiAgYWJzdHJhY3Qgc2VyaWFsaXplKHRyZWU6IFVybFRyZWUpOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIG9mIHRoZSBgVXJsU2VyaWFsaXplcmAuXG4gKlxuICogRXhhbXBsZSBVUkxzOlxuICpcbiAqIGBgYFxuICogL2luYm94LzMzKHBvcHVwOmNvbXBvc2UpXG4gKiAvaW5ib3gvMzM7b3Blbj10cnVlL21lc3NhZ2VzLzQ0XG4gKiBgYGBcbiAqXG4gKiBEZWZhdWx0VXJsU2VyaWFsaXplciB1c2VzIHBhcmVudGhlc2VzIHRvIHNlcmlhbGl6ZSBzZWNvbmRhcnkgc2VnbWVudHMgKGUuZy4sIHBvcHVwOmNvbXBvc2UpLCB0aGVcbiAqIGNvbG9uIHN5bnRheCB0byBzcGVjaWZ5IHRoZSBvdXRsZXQsIGFuZCB0aGUgJztwYXJhbWV0ZXI9dmFsdWUnIHN5bnRheCAoZS5nLiwgb3Blbj10cnVlKSB0b1xuICogc3BlY2lmeSByb3V0ZSBzcGVjaWZpYyBwYXJhbWV0ZXJzLlxuICpcbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWZhdWx0VXJsU2VyaWFsaXplciBpbXBsZW1lbnRzIFVybFNlcmlhbGl6ZXIge1xuICAvKiogUGFyc2VzIGEgdXJsIGludG8gYSBgVXJsVHJlZWAgKi9cbiAgcGFyc2UodXJsOiBzdHJpbmcpOiBVcmxUcmVlIHtcbiAgICBjb25zdCBwID0gbmV3IFVybFBhcnNlcih1cmwpO1xuICAgIHJldHVybiBuZXcgVXJsVHJlZShwLnBhcnNlUm9vdFNlZ21lbnQoKSwgcC5wYXJzZVF1ZXJ5UGFyYW1zKCksIHAucGFyc2VGcmFnbWVudCgpKTtcbiAgfVxuXG4gIC8qKiBDb252ZXJ0cyBhIGBVcmxUcmVlYCBpbnRvIGEgdXJsICovXG4gIHNlcmlhbGl6ZSh0cmVlOiBVcmxUcmVlKTogc3RyaW5nIHtcbiAgICBjb25zdCBzZWdtZW50ID0gYC8ke3NlcmlhbGl6ZVNlZ21lbnQodHJlZS5yb290LCB0cnVlKX1gO1xuICAgIGNvbnN0IHF1ZXJ5ID0gc2VyaWFsaXplUXVlcnlQYXJhbXModHJlZS5xdWVyeVBhcmFtcyk7XG4gICAgY29uc3QgZnJhZ21lbnQgPVxuICAgICAgICB0eXBlb2YgdHJlZS5mcmFnbWVudCA9PT0gYHN0cmluZ2AgPyBgIyR7ZW5jb2RlVXJpRnJhZ21lbnQodHJlZS5mcmFnbWVudCAhKX1gIDogJyc7XG5cbiAgICByZXR1cm4gYCR7c2VnbWVudH0ke3F1ZXJ5fSR7ZnJhZ21lbnR9YDtcbiAgfVxufVxuXG5jb25zdCBERUZBVUxUX1NFUklBTElaRVIgPSBuZXcgRGVmYXVsdFVybFNlcmlhbGl6ZXIoKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZVBhdGhzKHNlZ21lbnQ6IFVybFNlZ21lbnRHcm91cCk6IHN0cmluZyB7XG4gIHJldHVybiBzZWdtZW50LnNlZ21lbnRzLm1hcChwID0+IHNlcmlhbGl6ZVBhdGgocCkpLmpvaW4oJy8nKTtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplU2VnbWVudChzZWdtZW50OiBVcmxTZWdtZW50R3JvdXAsIHJvb3Q6IGJvb2xlYW4pOiBzdHJpbmcge1xuICBpZiAoIXNlZ21lbnQuaGFzQ2hpbGRyZW4oKSkge1xuICAgIHJldHVybiBzZXJpYWxpemVQYXRocyhzZWdtZW50KTtcbiAgfVxuXG4gIGlmIChyb290KSB7XG4gICAgY29uc3QgcHJpbWFyeSA9IHNlZ21lbnQuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdID9cbiAgICAgICAgc2VyaWFsaXplU2VnbWVudChzZWdtZW50LmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSwgZmFsc2UpIDpcbiAgICAgICAgJyc7XG4gICAgY29uc3QgY2hpbGRyZW46IHN0cmluZ1tdID0gW107XG5cbiAgICBmb3JFYWNoKHNlZ21lbnQuY2hpbGRyZW4sICh2OiBVcmxTZWdtZW50R3JvdXAsIGs6IHN0cmluZykgPT4ge1xuICAgICAgaWYgKGsgIT09IFBSSU1BUllfT1VUTEVUKSB7XG4gICAgICAgIGNoaWxkcmVuLnB1c2goYCR7a306JHtzZXJpYWxpemVTZWdtZW50KHYsIGZhbHNlKX1gKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBjaGlsZHJlbi5sZW5ndGggPiAwID8gYCR7cHJpbWFyeX0oJHtjaGlsZHJlbi5qb2luKCcvLycpfSlgIDogcHJpbWFyeTtcblxuICB9IGVsc2Uge1xuICAgIGNvbnN0IGNoaWxkcmVuID0gbWFwQ2hpbGRyZW5JbnRvQXJyYXkoc2VnbWVudCwgKHY6IFVybFNlZ21lbnRHcm91cCwgazogc3RyaW5nKSA9PiB7XG4gICAgICBpZiAoayA9PT0gUFJJTUFSWV9PVVRMRVQpIHtcbiAgICAgICAgcmV0dXJuIFtzZXJpYWxpemVTZWdtZW50KHNlZ21lbnQuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdLCBmYWxzZSldO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gW2Ake2t9OiR7c2VyaWFsaXplU2VnbWVudCh2LCBmYWxzZSl9YF07XG5cbiAgICB9KTtcblxuICAgIHJldHVybiBgJHtzZXJpYWxpemVQYXRocyhzZWdtZW50KX0vKCR7Y2hpbGRyZW4uam9pbignLy8nKX0pYDtcbiAgfVxufVxuXG4vKipcbiAqIEVuY29kZXMgYSBVUkkgc3RyaW5nIHdpdGggdGhlIGRlZmF1bHQgZW5jb2RpbmcuIFRoaXMgZnVuY3Rpb24gd2lsbCBvbmx5IGV2ZXIgYmUgY2FsbGVkIGZyb21cbiAqIGBlbmNvZGVVcmlRdWVyeWAgb3IgYGVuY29kZVVyaVNlZ21lbnRgIGFzIGl0J3MgdGhlIGJhc2Ugc2V0IG9mIGVuY29kaW5ncyB0byBiZSB1c2VkLiBXZSBuZWVkXG4gKiBhIGN1c3RvbSBlbmNvZGluZyBiZWNhdXNlIGVuY29kZVVSSUNvbXBvbmVudCBpcyB0b28gYWdncmVzc2l2ZSBhbmQgZW5jb2RlcyBzdHVmZiB0aGF0IGRvZXNuJ3RcbiAqIGhhdmUgdG8gYmUgZW5jb2RlZCBwZXIgaHR0cHM6Ly91cmwuc3BlYy53aGF0d2cub3JnLlxuICovXG5mdW5jdGlvbiBlbmNvZGVVcmlTdHJpbmcoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChzKVxuICAgICAgLnJlcGxhY2UoLyU0MC9nLCAnQCcpXG4gICAgICAucmVwbGFjZSgvJTNBL2dpLCAnOicpXG4gICAgICAucmVwbGFjZSgvJTI0L2csICckJylcbiAgICAgIC5yZXBsYWNlKC8lMkMvZ2ksICcsJyk7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgdXNlZCB0byBlbmNvZGUgYm90aCBrZXlzIGFuZCB2YWx1ZXMgaW4gYSBxdWVyeSBzdHJpbmcga2V5L3ZhbHVlLiBJblxuICogdGhlIGZvbGxvd2luZyBVUkwsIHlvdSBuZWVkIHRvIGNhbGwgZW5jb2RlVXJpUXVlcnkgb24gXCJrXCIgYW5kIFwidlwiOlxuICpcbiAqIGh0dHA6Ly93d3cuc2l0ZS5vcmcvaHRtbDttaz1tdj9rPXYjZlxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5jb2RlVXJpUXVlcnkoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVuY29kZVVyaVN0cmluZyhzKS5yZXBsYWNlKC8lM0IvZ2ksICc7Jyk7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgdXNlZCB0byBlbmNvZGUgYSBVUkwgZnJhZ21lbnQuIEluIHRoZSBmb2xsb3dpbmcgVVJMLCB5b3UgbmVlZCB0byBjYWxsXG4gKiBlbmNvZGVVcmlGcmFnbWVudCBvbiBcImZcIjpcbiAqXG4gKiBodHRwOi8vd3d3LnNpdGUub3JnL2h0bWw7bWs9bXY/az12I2ZcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuY29kZVVyaUZyYWdtZW50KHM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBlbmNvZGVVUkkocyk7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgcnVuIG9uIGFueSBVUkkgc2VnbWVudCBhcyB3ZWxsIGFzIHRoZSBrZXkgYW5kIHZhbHVlIGluIGEga2V5L3ZhbHVlXG4gKiBwYWlyIGZvciBtYXRyaXggcGFyYW1zLiBJbiB0aGUgZm9sbG93aW5nIFVSTCwgeW91IG5lZWQgdG8gY2FsbCBlbmNvZGVVcmlTZWdtZW50IG9uIFwiaHRtbFwiLFxuICogXCJta1wiLCBhbmQgXCJtdlwiOlxuICpcbiAqIGh0dHA6Ly93d3cuc2l0ZS5vcmcvaHRtbDttaz1tdj9rPXYjZlxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5jb2RlVXJpU2VnbWVudChzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZW5jb2RlVXJpU3RyaW5nKHMpLnJlcGxhY2UoL1xcKC9nLCAnJTI4JykucmVwbGFjZSgvXFwpL2csICclMjknKS5yZXBsYWNlKC8lMjYvZ2ksICcmJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWNvZGUoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzKTtcbn1cblxuLy8gUXVlcnkga2V5cy92YWx1ZXMgc2hvdWxkIGhhdmUgdGhlIFwiK1wiIHJlcGxhY2VkIGZpcnN0LCBhcyBcIitcIiBpbiBhIHF1ZXJ5IHN0cmluZyBpcyBcIiBcIi5cbi8vIGRlY29kZVVSSUNvbXBvbmVudCBmdW5jdGlvbiB3aWxsIG5vdCBkZWNvZGUgXCIrXCIgYXMgYSBzcGFjZS5cbmV4cG9ydCBmdW5jdGlvbiBkZWNvZGVRdWVyeShzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZGVjb2RlKHMucmVwbGFjZSgvXFwrL2csICclMjAnKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVQYXRoKHBhdGg6IFVybFNlZ21lbnQpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7ZW5jb2RlVXJpU2VnbWVudChwYXRoLnBhdGgpfSR7c2VyaWFsaXplTWF0cml4UGFyYW1zKHBhdGgucGFyYW1ldGVycyl9YDtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplTWF0cml4UGFyYW1zKHBhcmFtczoge1trZXk6IHN0cmluZ106IHN0cmluZ30pOiBzdHJpbmcge1xuICByZXR1cm4gT2JqZWN0LmtleXMocGFyYW1zKVxuICAgICAgLm1hcChrZXkgPT4gYDske2VuY29kZVVyaVNlZ21lbnQoa2V5KX09JHtlbmNvZGVVcmlTZWdtZW50KHBhcmFtc1trZXldKX1gKVxuICAgICAgLmpvaW4oJycpO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVRdWVyeVBhcmFtcyhwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBhbnl9KTogc3RyaW5nIHtcbiAgY29uc3Qgc3RyUGFyYW1zOiBzdHJpbmdbXSA9IE9iamVjdC5rZXlzKHBhcmFtcykubWFwKChuYW1lKSA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBwYXJhbXNbbmFtZV07XG4gICAgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsdWUpID9cbiAgICAgICAgdmFsdWUubWFwKHYgPT4gYCR7ZW5jb2RlVXJpUXVlcnkobmFtZSl9PSR7ZW5jb2RlVXJpUXVlcnkodil9YCkuam9pbignJicpIDpcbiAgICAgICAgYCR7ZW5jb2RlVXJpUXVlcnkobmFtZSl9PSR7ZW5jb2RlVXJpUXVlcnkodmFsdWUpfWA7XG4gIH0pO1xuXG4gIHJldHVybiBzdHJQYXJhbXMubGVuZ3RoID8gYD8ke3N0clBhcmFtcy5qb2luKFwiJlwiKX1gIDogJyc7XG59XG5cbmNvbnN0IFNFR01FTlRfUkUgPSAvXlteXFwvKCk/Oz0jXSsvO1xuZnVuY3Rpb24gbWF0Y2hTZWdtZW50cyhzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IG1hdGNoID0gc3RyLm1hdGNoKFNFR01FTlRfUkUpO1xuICByZXR1cm4gbWF0Y2ggPyBtYXRjaFswXSA6ICcnO1xufVxuXG5jb25zdCBRVUVSWV9QQVJBTV9SRSA9IC9eW149PyYjXSsvO1xuLy8gUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBxdWVyeSBwYXJhbSBhdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmluZyBvciBhbiBlbXB0eSBzdHJpbmdcbmZ1bmN0aW9uIG1hdGNoUXVlcnlQYXJhbXMoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBtYXRjaCA9IHN0ci5tYXRjaChRVUVSWV9QQVJBTV9SRSk7XG4gIHJldHVybiBtYXRjaCA/IG1hdGNoWzBdIDogJyc7XG59XG5cbmNvbnN0IFFVRVJZX1BBUkFNX1ZBTFVFX1JFID0gL15bXj8mI10rLztcbi8vIFJldHVybiB0aGUgdmFsdWUgb2YgdGhlIHF1ZXJ5IHBhcmFtIGF0IHRoZSBzdGFydCBvZiB0aGUgc3RyaW5nIG9yIGFuIGVtcHR5IHN0cmluZ1xuZnVuY3Rpb24gbWF0Y2hVcmxRdWVyeVBhcmFtVmFsdWUoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBtYXRjaCA9IHN0ci5tYXRjaChRVUVSWV9QQVJBTV9WQUxVRV9SRSk7XG4gIHJldHVybiBtYXRjaCA/IG1hdGNoWzBdIDogJyc7XG59XG5cbmNsYXNzIFVybFBhcnNlciB7XG4gIHByaXZhdGUgcmVtYWluaW5nOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSB1cmw6IHN0cmluZykgeyB0aGlzLnJlbWFpbmluZyA9IHVybDsgfVxuXG4gIHBhcnNlUm9vdFNlZ21lbnQoKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgICB0aGlzLmNvbnN1bWVPcHRpb25hbCgnLycpO1xuXG4gICAgaWYgKHRoaXMucmVtYWluaW5nID09PSAnJyB8fCB0aGlzLnBlZWtTdGFydHNXaXRoKCc/JykgfHwgdGhpcy5wZWVrU3RhcnRzV2l0aCgnIycpKSB7XG4gICAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pO1xuICAgIH1cblxuICAgIC8vIFRoZSByb290IHNlZ21lbnQgZ3JvdXAgbmV2ZXIgaGFzIHNlZ21lbnRzXG4gICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHRoaXMucGFyc2VDaGlsZHJlbigpKTtcbiAgfVxuXG4gIHBhcnNlUXVlcnlQYXJhbXMoKToge1trZXk6IHN0cmluZ106IGFueX0ge1xuICAgIGNvbnN0IHBhcmFtczoge1trZXk6IHN0cmluZ106IGFueX0gPSB7fTtcbiAgICBpZiAodGhpcy5jb25zdW1lT3B0aW9uYWwoJz8nKSkge1xuICAgICAgZG8ge1xuICAgICAgICB0aGlzLnBhcnNlUXVlcnlQYXJhbShwYXJhbXMpO1xuICAgICAgfSB3aGlsZSAodGhpcy5jb25zdW1lT3B0aW9uYWwoJyYnKSk7XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXM7XG4gIH1cblxuICBwYXJzZUZyYWdtZW50KCk6IHN0cmluZ3xudWxsIHtcbiAgICByZXR1cm4gdGhpcy5jb25zdW1lT3B0aW9uYWwoJyMnKSA/IGRlY29kZVVSSUNvbXBvbmVudCh0aGlzLnJlbWFpbmluZykgOiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUNoaWxkcmVuKCk6IHtbb3V0bGV0OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9IHtcbiAgICBpZiAodGhpcy5yZW1haW5pbmcgPT09ICcnKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgdGhpcy5jb25zdW1lT3B0aW9uYWwoJy8nKTtcblxuICAgIGNvbnN0IHNlZ21lbnRzOiBVcmxTZWdtZW50W10gPSBbXTtcbiAgICBpZiAoIXRoaXMucGVla1N0YXJ0c1dpdGgoJygnKSkge1xuICAgICAgc2VnbWVudHMucHVzaCh0aGlzLnBhcnNlU2VnbWVudCgpKTtcbiAgICB9XG5cbiAgICB3aGlsZSAodGhpcy5wZWVrU3RhcnRzV2l0aCgnLycpICYmICF0aGlzLnBlZWtTdGFydHNXaXRoKCcvLycpICYmICF0aGlzLnBlZWtTdGFydHNXaXRoKCcvKCcpKSB7XG4gICAgICB0aGlzLmNhcHR1cmUoJy8nKTtcbiAgICAgIHNlZ21lbnRzLnB1c2godGhpcy5wYXJzZVNlZ21lbnQoKSk7XG4gICAgfVxuXG4gICAgbGV0IGNoaWxkcmVuOiB7W291dGxldDogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICAgIGlmICh0aGlzLnBlZWtTdGFydHNXaXRoKCcvKCcpKSB7XG4gICAgICB0aGlzLmNhcHR1cmUoJy8nKTtcbiAgICAgIGNoaWxkcmVuID0gdGhpcy5wYXJzZVBhcmVucyh0cnVlKTtcbiAgICB9XG5cbiAgICBsZXQgcmVzOiB7W291dGxldDogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICAgIGlmICh0aGlzLnBlZWtTdGFydHNXaXRoKCcoJykpIHtcbiAgICAgIHJlcyA9IHRoaXMucGFyc2VQYXJlbnMoZmFsc2UpO1xuICAgIH1cblxuICAgIGlmIChzZWdtZW50cy5sZW5ndGggPiAwIHx8IE9iamVjdC5rZXlzKGNoaWxkcmVuKS5sZW5ndGggPiAwKSB7XG4gICAgICByZXNbUFJJTUFSWV9PVVRMRVRdID0gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50cywgY2hpbGRyZW4pO1xuICAgIH1cblxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICAvLyBwYXJzZSBhIHNlZ21lbnQgd2l0aCBpdHMgbWF0cml4IHBhcmFtZXRlcnNcbiAgLy8gaWUgYG5hbWU7azE9djE7azJgXG4gIHByaXZhdGUgcGFyc2VTZWdtZW50KCk6IFVybFNlZ21lbnQge1xuICAgIGNvbnN0IHBhdGggPSBtYXRjaFNlZ21lbnRzKHRoaXMucmVtYWluaW5nKTtcbiAgICBpZiAocGF0aCA9PT0gJycgJiYgdGhpcy5wZWVrU3RhcnRzV2l0aCgnOycpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEVtcHR5IHBhdGggdXJsIHNlZ21lbnQgY2Fubm90IGhhdmUgcGFyYW1ldGVyczogJyR7dGhpcy5yZW1haW5pbmd9Jy5gKTtcbiAgICB9XG5cbiAgICB0aGlzLmNhcHR1cmUocGF0aCk7XG4gICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50KGRlY29kZShwYXRoKSwgdGhpcy5wYXJzZU1hdHJpeFBhcmFtcygpKTtcbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VNYXRyaXhQYXJhbXMoKToge1trZXk6IHN0cmluZ106IGFueX0ge1xuICAgIGNvbnN0IHBhcmFtczoge1trZXk6IHN0cmluZ106IGFueX0gPSB7fTtcbiAgICB3aGlsZSAodGhpcy5jb25zdW1lT3B0aW9uYWwoJzsnKSkge1xuICAgICAgdGhpcy5wYXJzZVBhcmFtKHBhcmFtcyk7XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXM7XG4gIH1cblxuICBwcml2YXRlIHBhcnNlUGFyYW0ocGFyYW1zOiB7W2tleTogc3RyaW5nXTogYW55fSk6IHZvaWQge1xuICAgIGNvbnN0IGtleSA9IG1hdGNoU2VnbWVudHModGhpcy5yZW1haW5pbmcpO1xuICAgIGlmICgha2V5KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuY2FwdHVyZShrZXkpO1xuICAgIGxldCB2YWx1ZTogYW55ID0gJyc7XG4gICAgaWYgKHRoaXMuY29uc3VtZU9wdGlvbmFsKCc9JykpIHtcbiAgICAgIGNvbnN0IHZhbHVlTWF0Y2ggPSBtYXRjaFNlZ21lbnRzKHRoaXMucmVtYWluaW5nKTtcbiAgICAgIGlmICh2YWx1ZU1hdGNoKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWVNYXRjaDtcbiAgICAgICAgdGhpcy5jYXB0dXJlKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBwYXJhbXNbZGVjb2RlKGtleSldID0gZGVjb2RlKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFBhcnNlIGEgc2luZ2xlIHF1ZXJ5IHBhcmFtZXRlciBgbmFtZVs9dmFsdWVdYFxuICBwcml2YXRlIHBhcnNlUXVlcnlQYXJhbShwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBhbnl9KTogdm9pZCB7XG4gICAgY29uc3Qga2V5ID0gbWF0Y2hRdWVyeVBhcmFtcyh0aGlzLnJlbWFpbmluZyk7XG4gICAgaWYgKCFrZXkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5jYXB0dXJlKGtleSk7XG4gICAgbGV0IHZhbHVlOiBhbnkgPSAnJztcbiAgICBpZiAodGhpcy5jb25zdW1lT3B0aW9uYWwoJz0nKSkge1xuICAgICAgY29uc3QgdmFsdWVNYXRjaCA9IG1hdGNoVXJsUXVlcnlQYXJhbVZhbHVlKHRoaXMucmVtYWluaW5nKTtcbiAgICAgIGlmICh2YWx1ZU1hdGNoKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWVNYXRjaDtcbiAgICAgICAgdGhpcy5jYXB0dXJlKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBkZWNvZGVkS2V5ID0gZGVjb2RlUXVlcnkoa2V5KTtcbiAgICBjb25zdCBkZWNvZGVkVmFsID0gZGVjb2RlUXVlcnkodmFsdWUpO1xuXG4gICAgaWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShkZWNvZGVkS2V5KSkge1xuICAgICAgLy8gQXBwZW5kIHRvIGV4aXN0aW5nIHZhbHVlc1xuICAgICAgbGV0IGN1cnJlbnRWYWwgPSBwYXJhbXNbZGVjb2RlZEtleV07XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkoY3VycmVudFZhbCkpIHtcbiAgICAgICAgY3VycmVudFZhbCA9IFtjdXJyZW50VmFsXTtcbiAgICAgICAgcGFyYW1zW2RlY29kZWRLZXldID0gY3VycmVudFZhbDtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnRWYWwucHVzaChkZWNvZGVkVmFsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQ3JlYXRlIGEgbmV3IHZhbHVlXG4gICAgICBwYXJhbXNbZGVjb2RlZEtleV0gPSBkZWNvZGVkVmFsO1xuICAgIH1cbiAgfVxuXG4gIC8vIHBhcnNlIGAoYS9iLy9vdXRsZXRfbmFtZTpjL2QpYFxuICBwcml2YXRlIHBhcnNlUGFyZW5zKGFsbG93UHJpbWFyeTogYm9vbGVhbik6IHtbb3V0bGV0OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9IHtcbiAgICBjb25zdCBzZWdtZW50czoge1trZXk6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0gPSB7fTtcbiAgICB0aGlzLmNhcHR1cmUoJygnKTtcblxuICAgIHdoaWxlICghdGhpcy5jb25zdW1lT3B0aW9uYWwoJyknKSAmJiB0aGlzLnJlbWFpbmluZy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBwYXRoID0gbWF0Y2hTZWdtZW50cyh0aGlzLnJlbWFpbmluZyk7XG5cbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnJlbWFpbmluZ1twYXRoLmxlbmd0aF07XG5cbiAgICAgIC8vIGlmIGlzIGlzIG5vdCBvbmUgb2YgdGhlc2UgY2hhcmFjdGVycywgdGhlbiB0aGUgc2VnbWVudCB3YXMgdW5lc2NhcGVkXG4gICAgICAvLyBvciB0aGUgZ3JvdXAgd2FzIG5vdCBjbG9zZWRcbiAgICAgIGlmIChuZXh0ICE9PSAnLycgJiYgbmV4dCAhPT0gJyknICYmIG5leHQgIT09ICc7Jykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBwYXJzZSB1cmwgJyR7dGhpcy51cmx9J2ApO1xuICAgICAgfVxuXG4gICAgICBsZXQgb3V0bGV0TmFtZTogc3RyaW5nID0gdW5kZWZpbmVkICE7XG4gICAgICBpZiAocGF0aC5pbmRleE9mKCc6JykgPiAtMSkge1xuICAgICAgICBvdXRsZXROYW1lID0gcGF0aC5zdWJzdHIoMCwgcGF0aC5pbmRleE9mKCc6JykpO1xuICAgICAgICB0aGlzLmNhcHR1cmUob3V0bGV0TmFtZSk7XG4gICAgICAgIHRoaXMuY2FwdHVyZSgnOicpO1xuICAgICAgfSBlbHNlIGlmIChhbGxvd1ByaW1hcnkpIHtcbiAgICAgICAgb3V0bGV0TmFtZSA9IFBSSU1BUllfT1VUTEVUO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjaGlsZHJlbiA9IHRoaXMucGFyc2VDaGlsZHJlbigpO1xuICAgICAgc2VnbWVudHNbb3V0bGV0TmFtZV0gPSBPYmplY3Qua2V5cyhjaGlsZHJlbikubGVuZ3RoID09PSAxID8gY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIGNoaWxkcmVuKTtcbiAgICAgIHRoaXMuY29uc3VtZU9wdGlvbmFsKCcvLycpO1xuICAgIH1cblxuICAgIHJldHVybiBzZWdtZW50cztcbiAgfVxuXG4gIHByaXZhdGUgcGVla1N0YXJ0c1dpdGgoc3RyOiBzdHJpbmcpOiBib29sZWFuIHsgcmV0dXJuIHRoaXMucmVtYWluaW5nLnN0YXJ0c1dpdGgoc3RyKTsgfVxuXG4gIC8vIENvbnN1bWVzIHRoZSBwcmVmaXggd2hlbiBpdCBpcyBwcmVzZW50IGFuZCByZXR1cm5zIHdoZXRoZXIgaXQgaGFzIGJlZW4gY29uc3VtZWRcbiAgcHJpdmF0ZSBjb25zdW1lT3B0aW9uYWwoc3RyOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5wZWVrU3RhcnRzV2l0aChzdHIpKSB7XG4gICAgICB0aGlzLnJlbWFpbmluZyA9IHRoaXMucmVtYWluaW5nLnN1YnN0cmluZyhzdHIubGVuZ3RoKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIGNhcHR1cmUoc3RyOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY29uc3VtZU9wdGlvbmFsKHN0cikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgXCIke3N0cn1cIi5gKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==