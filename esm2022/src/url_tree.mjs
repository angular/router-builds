/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Injectable, ɵRuntimeError as RuntimeError } from '@angular/core';
import { convertToParamMap, PRIMARY_OUTLET } from './shared';
import { equalArraysOrString, shallowEqual } from './utils/collection';
import * as i0 from "@angular/core";
const pathCompareMap = {
    'exact': equalSegmentGroups,
    'subset': containsSegmentGroup,
};
const paramCompareMap = {
    'exact': equalParams,
    'subset': containsParams,
    'ignored': () => true,
};
export function containsTree(container, containee, options) {
    return pathCompareMap[options.paths](container.root, containee.root, options.matrixParams) &&
        paramCompareMap[options.queryParams](container.queryParams, containee.queryParams) &&
        !(options.fragment === 'exact' && container.fragment !== containee.fragment);
}
function equalParams(container, containee) {
    // TODO: This does not handle array params correctly.
    return shallowEqual(container, containee);
}
function equalSegmentGroups(container, containee, matrixParams) {
    if (!equalPath(container.segments, containee.segments))
        return false;
    if (!matrixParamsMatch(container.segments, containee.segments, matrixParams)) {
        return false;
    }
    if (container.numberOfChildren !== containee.numberOfChildren)
        return false;
    for (const c in containee.children) {
        if (!container.children[c])
            return false;
        if (!equalSegmentGroups(container.children[c], containee.children[c], matrixParams))
            return false;
    }
    return true;
}
function containsParams(container, containee) {
    return Object.keys(containee).length <= Object.keys(container).length &&
        Object.keys(containee).every(key => equalArraysOrString(container[key], containee[key]));
}
function containsSegmentGroup(container, containee, matrixParams) {
    return containsSegmentGroupHelper(container, containee, containee.segments, matrixParams);
}
function containsSegmentGroupHelper(container, containee, containeePaths, matrixParams) {
    if (container.segments.length > containeePaths.length) {
        const current = container.segments.slice(0, containeePaths.length);
        if (!equalPath(current, containeePaths))
            return false;
        if (containee.hasChildren())
            return false;
        if (!matrixParamsMatch(current, containeePaths, matrixParams))
            return false;
        return true;
    }
    else if (container.segments.length === containeePaths.length) {
        if (!equalPath(container.segments, containeePaths))
            return false;
        if (!matrixParamsMatch(container.segments, containeePaths, matrixParams))
            return false;
        for (const c in containee.children) {
            if (!container.children[c])
                return false;
            if (!containsSegmentGroup(container.children[c], containee.children[c], matrixParams)) {
                return false;
            }
        }
        return true;
    }
    else {
        const current = containeePaths.slice(0, container.segments.length);
        const next = containeePaths.slice(container.segments.length);
        if (!equalPath(container.segments, current))
            return false;
        if (!matrixParamsMatch(container.segments, current, matrixParams))
            return false;
        if (!container.children[PRIMARY_OUTLET])
            return false;
        return containsSegmentGroupHelper(container.children[PRIMARY_OUTLET], containee, next, matrixParams);
    }
}
function matrixParamsMatch(containerPaths, containeePaths, options) {
    return containeePaths.every((containeeSegment, i) => {
        return paramCompareMap[options](containerPaths[i].parameters, containeeSegment.parameters);
    });
}
/**
 * @description
 *
 * Represents the parsed URL.
 *
 * Since a router state is a tree, and the URL is nothing but a serialized state, the URL is a
 * serialized tree.
 * UrlTree is a data structure that provides a lot of affordances in dealing with URLs
 *
 * @usageNotes
 * ### Example
 *
 * ```
 * @Component({templateUrl:'template.html'})
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
 * @publicApi
 */
export class UrlTree {
    constructor(
    /** The root segment group of the URL tree */
    root = new UrlSegmentGroup([], {}), 
    /** The query params of the URL */
    queryParams = {}, 
    /** The fragment of the URL */
    fragment = null) {
        this.root = root;
        this.queryParams = queryParams;
        this.fragment = fragment;
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
            if (root.segments.length > 0) {
                throw new RuntimeError(4015 /* RuntimeErrorCode.INVALID_ROOT_URL_SEGMENT */, 'The root `UrlSegmentGroup` should not contain `segments`. ' +
                    'Instead, these segments belong in the `children` so they can be associated with a named outlet.');
            }
        }
    }
    get queryParamMap() {
        if (!this._queryParamMap) {
            this._queryParamMap = convertToParamMap(this.queryParams);
        }
        return this._queryParamMap;
    }
    /** @docsNotRequired */
    toString() {
        return DEFAULT_SERIALIZER.serialize(this);
    }
}
/**
 * @description
 *
 * Represents the parsed URL segment group.
 *
 * See `UrlTree` for more information.
 *
 * @publicApi
 */
export class UrlSegmentGroup {
    constructor(
    /** The URL segments of this group. See `UrlSegment` for more information */
    segments, 
    /** The list of children of this group */
    children) {
        this.segments = segments;
        this.children = children;
        /** The parent node in the url tree */
        this.parent = null;
        Object.values(children).forEach((v) => (v.parent = this));
    }
    /** Whether the segment has child segments */
    hasChildren() {
        return this.numberOfChildren > 0;
    }
    /** Number of child segments */
    get numberOfChildren() {
        return Object.keys(this.children).length;
    }
    /** @docsNotRequired */
    toString() {
        return serializePaths(this);
    }
}
/**
 * @description
 *
 * Represents a single URL segment.
 *
 * A UrlSegment is a part of a URL between the two slashes. It contains a path and the matrix
 * parameters associated with the segment.
 *
 * @usageNotes
 * ### Example
 *
 * ```
 * @Component({templateUrl:'template.html'})
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
 * @publicApi
 */
export class UrlSegment {
    constructor(
    /** The path part of a URL segment */
    path, 
    /** The matrix parameters associated with a segment */
    parameters) {
        this.path = path;
        this.parameters = parameters;
    }
    get parameterMap() {
        if (!this._parameterMap) {
            this._parameterMap = convertToParamMap(this.parameters);
        }
        return this._parameterMap;
    }
    /** @docsNotRequired */
    toString() {
        return serializePath(this);
    }
}
export function equalSegments(as, bs) {
    return equalPath(as, bs) && as.every((a, i) => shallowEqual(a.parameters, bs[i].parameters));
}
export function equalPath(as, bs) {
    if (as.length !== bs.length)
        return false;
    return as.every((a, i) => a.path === bs[i].path);
}
export function mapChildrenIntoArray(segment, fn) {
    let res = [];
    Object.entries(segment.children).forEach(([childOutlet, child]) => {
        if (childOutlet === PRIMARY_OUTLET) {
            res = res.concat(fn(child, childOutlet));
        }
    });
    Object.entries(segment.children).forEach(([childOutlet, child]) => {
        if (childOutlet !== PRIMARY_OUTLET) {
            res = res.concat(fn(child, childOutlet));
        }
    });
    return res;
}
/**
 * @description
 *
 * Serializes and deserializes a URL string into a URL tree.
 *
 * The url serialization strategy is customizable. You can
 * make all URLs case insensitive by providing a custom UrlSerializer.
 *
 * See `DefaultUrlSerializer` for an example of a URL serializer.
 *
 * @publicApi
 */
export class UrlSerializer {
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.0.7+sha-ed936ba", ngImport: i0, type: UrlSerializer, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.0.7+sha-ed936ba", ngImport: i0, type: UrlSerializer, providedIn: 'root', useFactory: () => new DefaultUrlSerializer() }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.0.7+sha-ed936ba", ngImport: i0, type: UrlSerializer, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root', useFactory: () => new DefaultUrlSerializer() }]
        }] });
/**
 * @description
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
 * @publicApi
 */
export class DefaultUrlSerializer {
    /** Parses a url into a `UrlTree` */
    parse(url) {
        const p = new UrlParser(url);
        return new UrlTree(p.parseRootSegment(), p.parseQueryParams(), p.parseFragment());
    }
    /** Converts a `UrlTree` into a url */
    serialize(tree) {
        const segment = `/${serializeSegment(tree.root, true)}`;
        const query = serializeQueryParams(tree.queryParams);
        const fragment = typeof tree.fragment === `string` ? `#${encodeUriFragment(tree.fragment)}` : '';
        return `${segment}${query}${fragment}`;
    }
}
const DEFAULT_SERIALIZER = new DefaultUrlSerializer();
export function serializePaths(segment) {
    return segment.segments.map(p => serializePath(p)).join('/');
}
function serializeSegment(segment, root) {
    if (!segment.hasChildren()) {
        return serializePaths(segment);
    }
    if (root) {
        const primary = segment.children[PRIMARY_OUTLET] ?
            serializeSegment(segment.children[PRIMARY_OUTLET], false) :
            '';
        const children = [];
        Object.entries(segment.children).forEach(([k, v]) => {
            if (k !== PRIMARY_OUTLET) {
                children.push(`${k}:${serializeSegment(v, false)}`);
            }
        });
        return children.length > 0 ? `${primary}(${children.join('//')})` : primary;
    }
    else {
        const children = mapChildrenIntoArray(segment, (v, k) => {
            if (k === PRIMARY_OUTLET) {
                return [serializeSegment(segment.children[PRIMARY_OUTLET], false)];
            }
            return [`${k}:${serializeSegment(v, false)}`];
        });
        // use no parenthesis if the only child is a primary outlet route
        if (Object.keys(segment.children).length === 1 && segment.children[PRIMARY_OUTLET] != null) {
            return `${serializePaths(segment)}/${children[0]}`;
        }
        return `${serializePaths(segment)}/(${children.join('//')})`;
    }
}
/**
 * Encodes a URI string with the default encoding. This function will only ever be called from
 * `encodeUriQuery` or `encodeUriSegment` as it's the base set of encodings to be used. We need
 * a custom encoding because encodeURIComponent is too aggressive and encodes stuff that doesn't
 * have to be encoded per https://url.spec.whatwg.org.
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
 */
export function encodeUriQuery(s) {
    return encodeUriString(s).replace(/%3B/gi, ';');
}
/**
 * This function should be used to encode a URL fragment. In the following URL, you need to call
 * encodeUriFragment on "f":
 *
 * http://www.site.org/html;mk=mv?k=v#f
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
 */
export function encodeUriSegment(s) {
    return encodeUriString(s).replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/%26/gi, '&');
}
export function decode(s) {
    return decodeURIComponent(s);
}
// Query keys/values should have the "+" replaced first, as "+" in a query string is " ".
// decodeURIComponent function will not decode "+" as a space.
export function decodeQuery(s) {
    return decode(s.replace(/\+/g, '%20'));
}
export function serializePath(path) {
    return `${encodeUriSegment(path.path)}${serializeMatrixParams(path.parameters)}`;
}
function serializeMatrixParams(params) {
    return Object.keys(params)
        .map(key => `;${encodeUriSegment(key)}=${encodeUriSegment(params[key])}`)
        .join('');
}
function serializeQueryParams(params) {
    const strParams = Object.keys(params)
        .map((name) => {
        const value = params[name];
        return Array.isArray(value) ?
            value.map(v => `${encodeUriQuery(name)}=${encodeUriQuery(v)}`).join('&') :
            `${encodeUriQuery(name)}=${encodeUriQuery(value)}`;
    })
        .filter(s => !!s);
    return strParams.length ? `?${strParams.join('&')}` : '';
}
const SEGMENT_RE = /^[^\/()?;#]+/;
function matchSegments(str) {
    const match = str.match(SEGMENT_RE);
    return match ? match[0] : '';
}
const MATRIX_PARAM_SEGMENT_RE = /^[^\/()?;=#]+/;
function matchMatrixKeySegments(str) {
    const match = str.match(MATRIX_PARAM_SEGMENT_RE);
    return match ? match[0] : '';
}
const QUERY_PARAM_RE = /^[^=?&#]+/;
// Return the name of the query param at the start of the string or an empty string
function matchQueryParams(str) {
    const match = str.match(QUERY_PARAM_RE);
    return match ? match[0] : '';
}
const QUERY_PARAM_VALUE_RE = /^[^&#]+/;
// Return the value of the query param at the start of the string or an empty string
function matchUrlQueryParamValue(str) {
    const match = str.match(QUERY_PARAM_VALUE_RE);
    return match ? match[0] : '';
}
class UrlParser {
    constructor(url) {
        this.url = url;
        this.remaining = url;
    }
    parseRootSegment() {
        this.consumeOptional('/');
        if (this.remaining === '' || this.peekStartsWith('?') || this.peekStartsWith('#')) {
            return new UrlSegmentGroup([], {});
        }
        // The root segment group never has segments
        return new UrlSegmentGroup([], this.parseChildren());
    }
    parseQueryParams() {
        const params = {};
        if (this.consumeOptional('?')) {
            do {
                this.parseQueryParam(params);
            } while (this.consumeOptional('&'));
        }
        return params;
    }
    parseFragment() {
        return this.consumeOptional('#') ? decodeURIComponent(this.remaining) : null;
    }
    parseChildren() {
        if (this.remaining === '') {
            return {};
        }
        this.consumeOptional('/');
        const segments = [];
        if (!this.peekStartsWith('(')) {
            segments.push(this.parseSegment());
        }
        while (this.peekStartsWith('/') && !this.peekStartsWith('//') && !this.peekStartsWith('/(')) {
            this.capture('/');
            segments.push(this.parseSegment());
        }
        let children = {};
        if (this.peekStartsWith('/(')) {
            this.capture('/');
            children = this.parseParens(true);
        }
        let res = {};
        if (this.peekStartsWith('(')) {
            res = this.parseParens(false);
        }
        if (segments.length > 0 || Object.keys(children).length > 0) {
            res[PRIMARY_OUTLET] = new UrlSegmentGroup(segments, children);
        }
        return res;
    }
    // parse a segment with its matrix parameters
    // ie `name;k1=v1;k2`
    parseSegment() {
        const path = matchSegments(this.remaining);
        if (path === '' && this.peekStartsWith(';')) {
            throw new RuntimeError(4009 /* RuntimeErrorCode.EMPTY_PATH_WITH_PARAMS */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
                `Empty path url segment cannot have parameters: '${this.remaining}'.`);
        }
        this.capture(path);
        return new UrlSegment(decode(path), this.parseMatrixParams());
    }
    parseMatrixParams() {
        const params = {};
        while (this.consumeOptional(';')) {
            this.parseParam(params);
        }
        return params;
    }
    parseParam(params) {
        const key = matchMatrixKeySegments(this.remaining);
        if (!key) {
            return;
        }
        this.capture(key);
        let value = '';
        if (this.consumeOptional('=')) {
            const valueMatch = matchSegments(this.remaining);
            if (valueMatch) {
                value = valueMatch;
                this.capture(value);
            }
        }
        params[decode(key)] = decode(value);
    }
    // Parse a single query parameter `name[=value]`
    parseQueryParam(params) {
        const key = matchQueryParams(this.remaining);
        if (!key) {
            return;
        }
        this.capture(key);
        let value = '';
        if (this.consumeOptional('=')) {
            const valueMatch = matchUrlQueryParamValue(this.remaining);
            if (valueMatch) {
                value = valueMatch;
                this.capture(value);
            }
        }
        const decodedKey = decodeQuery(key);
        const decodedVal = decodeQuery(value);
        if (params.hasOwnProperty(decodedKey)) {
            // Append to existing values
            let currentVal = params[decodedKey];
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
    // parse `(a/b//outlet_name:c/d)`
    parseParens(allowPrimary) {
        const segments = {};
        this.capture('(');
        while (!this.consumeOptional(')') && this.remaining.length > 0) {
            const path = matchSegments(this.remaining);
            const next = this.remaining[path.length];
            // if is is not one of these characters, then the segment was unescaped
            // or the group was not closed
            if (next !== '/' && next !== ')' && next !== ';') {
                throw new RuntimeError(4010 /* RuntimeErrorCode.UNPARSABLE_URL */, (typeof ngDevMode === 'undefined' || ngDevMode) && `Cannot parse url '${this.url}'`);
            }
            let outletName = undefined;
            if (path.indexOf(':') > -1) {
                outletName = path.slice(0, path.indexOf(':'));
                this.capture(outletName);
                this.capture(':');
            }
            else if (allowPrimary) {
                outletName = PRIMARY_OUTLET;
            }
            const children = this.parseChildren();
            segments[outletName] = Object.keys(children).length === 1 ? children[PRIMARY_OUTLET] :
                new UrlSegmentGroup([], children);
            this.consumeOptional('//');
        }
        return segments;
    }
    peekStartsWith(str) {
        return this.remaining.startsWith(str);
    }
    // Consumes the prefix when it is present and returns whether it has been consumed
    consumeOptional(str) {
        if (this.peekStartsWith(str)) {
            this.remaining = this.remaining.substring(str.length);
            return true;
        }
        return false;
    }
    capture(str) {
        if (!this.consumeOptional(str)) {
            throw new RuntimeError(4011 /* RuntimeErrorCode.UNEXPECTED_VALUE_IN_URL */, (typeof ngDevMode === 'undefined' || ngDevMode) && `Expected "${str}".`);
        }
    }
}
export function createRoot(rootCandidate) {
    return rootCandidate.segments.length > 0 ?
        new UrlSegmentGroup([], { [PRIMARY_OUTLET]: rootCandidate }) :
        rootCandidate;
}
/**
 * Recursively
 * - merges primary segment children into their parents
 * - drops empty children (those which have no segments and no children themselves). This latter
 * prevents serializing a group into something like `/a(aux:)`, where `aux` is an empty child
 * segment.
 * - merges named outlets without a primary segment sibling into the children. This prevents
 * serializing a URL like `//(a:a)(b:b) instead of `/(a:a//b:b)` when the aux b route lives on the
 * root but the `a` route lives under an empty path primary route.
 */
export function squashSegmentGroup(segmentGroup) {
    const newChildren = {};
    for (const childOutlet of Object.keys(segmentGroup.children)) {
        const child = segmentGroup.children[childOutlet];
        const childCandidate = squashSegmentGroup(child);
        // moves named children in an empty path primary child into this group
        if (childOutlet === PRIMARY_OUTLET && childCandidate.segments.length === 0 &&
            childCandidate.hasChildren()) {
            for (const [grandChildOutlet, grandChild] of Object.entries(childCandidate.children)) {
                newChildren[grandChildOutlet] = grandChild;
            }
        } // don't add empty children
        else if (childCandidate.segments.length > 0 || childCandidate.hasChildren()) {
            newChildren[childOutlet] = childCandidate;
        }
    }
    const s = new UrlSegmentGroup(segmentGroup.segments, newChildren);
    return mergeTrivialChildren(s);
}
/**
 * When possible, merges the primary outlet child into the parent `UrlSegmentGroup`.
 *
 * When a segment group has only one child which is a primary outlet, merges that child into the
 * parent. That is, the child segment group's segments are merged into the `s` and the child's
 * children become the children of `s`. Think of this like a 'squash', merging the child segment
 * group into the parent.
 */
function mergeTrivialChildren(s) {
    if (s.numberOfChildren === 1 && s.children[PRIMARY_OUTLET]) {
        const c = s.children[PRIMARY_OUTLET];
        return new UrlSegmentGroup(s.segments.concat(c.segments), c.children);
    }
    return s;
}
export function isUrlTree(v) {
    return v instanceof UrlTree;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsX3RyZWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3VybF90cmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxVQUFVLEVBQUUsYUFBYSxJQUFJLFlBQVksRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUd4RSxPQUFPLEVBQUMsaUJBQWlCLEVBQW9CLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3RSxPQUFPLEVBQUMsbUJBQW1CLEVBQUUsWUFBWSxFQUFDLE1BQU0sb0JBQW9CLENBQUM7O0FBMERyRSxNQUFNLGNBQWMsR0FBeUQ7SUFDM0UsT0FBTyxFQUFFLGtCQUFrQjtJQUMzQixRQUFRLEVBQUUsb0JBQW9CO0NBQy9CLENBQUM7QUFDRixNQUFNLGVBQWUsR0FBOEM7SUFDakUsT0FBTyxFQUFFLFdBQVc7SUFDcEIsUUFBUSxFQUFFLGNBQWM7SUFDeEIsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUk7Q0FDdEIsQ0FBQztBQUVGLE1BQU0sVUFBVSxZQUFZLENBQ3hCLFNBQWtCLEVBQUUsU0FBa0IsRUFBRSxPQUE2QjtJQUN2RSxPQUFPLGNBQWMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUM7UUFDdEYsZUFBZSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUM7UUFDbEYsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxJQUFJLFNBQVMsQ0FBQyxRQUFRLEtBQUssU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ25GLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxTQUFpQixFQUFFLFNBQWlCO0lBQ3ZELHFE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QUMsQ0FBQztBQUNYLENBQUM7QUFFRCxNQUFNLFVBQVUsU0FBUyxDQUFDLENBQU07SUFDOUIsT0FBTyxDQUFDLFlBQVksT0FBTyxDQUFDO0FBQzlCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtJbmplY3RhYmxlLCDJtVJ1bnRpbWVFcnJvciBhcyBSdW50aW1lRXJyb3J9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQge1J1bnRpbWVFcnJvckNvZGV9IGZyb20gJy4vZXJyb3JzJztcbmltcG9ydCB7Y29udmVydFRvUGFyYW1NYXAsIFBhcmFtTWFwLCBQYXJhbXMsIFBSSU1BUllfT1VUTEVUfSBmcm9tICcuL3NoYXJlZCc7XG5pbXBvcnQge2VxdWFsQXJyYXlzT3JTdHJpbmcsIHNoYWxsb3dFcXVhbH0gZnJvbSAnLi91dGlscy9jb2xsZWN0aW9uJztcblxuXG4vKipcbiAqIEEgc2V0IG9mIG9wdGlvbnMgd2hpY2ggc3BlY2lmeSBob3cgdG8gZGV0ZXJtaW5lIGlmIGEgYFVybFRyZWVgIGlzIGFjdGl2ZSwgZ2l2ZW4gdGhlIGBVcmxUcmVlYFxuICogZm9yIHRoZSBjdXJyZW50IHJvdXRlciBzdGF0ZS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKiBAc2VlIHtAbGluayBSb3V0ZXIjaXNBY3RpdmV9XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSXNBY3RpdmVNYXRjaE9wdGlvbnMge1xuICAvKipcbiAgICogRGVmaW5lcyB0aGUgc3RyYXRlZ3kgZm9yIGNvbXBhcmluZyB0aGUgbWF0cml4IHBhcmFtZXRlcnMgb2YgdHdvIGBVcmxUcmVlYHMuXG4gICAqXG4gICAqIFRoZSBtYXRyaXggcGFyYW1ldGVyIG1hdGNoaW5nIGlzIGRlcGVuZGVudCBvbiB0aGUgc3RyYXRlZ3kgZm9yIG1hdGNoaW5nIHRoZVxuICAgKiBzZWdtZW50cy4gVGhhdCBpcywgaWYgdGhlIGBwYXRoc2Agb3B0aW9uIGlzIHNldCB0byBgJ3N1YnNldCdgLCBvbmx5XG4gICAqIHRoZSBtYXRyaXggcGFyYW1ldGVycyBvZiB0aGUgbWF0Y2hpbmcgc2VnbWVudHMgd2lsbCBiZSBjb21wYXJlZC5cbiAgICpcbiAgICogLSBgJ2V4YWN0J2A6IFJlcXVpcmVzIHRoYXQgbWF0Y2hpbmcgc2VnbWVudHMgYWxzbyBoYXZlIGV4YWN0IG1hdHJpeCBwYXJhbWV0ZXJcbiAgICogbWF0Y2hlcy5cbiAgICogLSBgJ3N1YnNldCdgOiBUaGUgbWF0Y2hpbmcgc2VnbWVudHMgaW4gdGhlIHJvdXRlcidzIGFjdGl2ZSBgVXJsVHJlZWAgbWF5IGNvbnRhaW5cbiAgICogZXh0cmEgbWF0cml4IHBhcmFtZXRlcnMsIGJ1dCB0aG9zZSB0aGF0IGV4aXN0IGluIHRoZSBgVXJsVHJlZWAgaW4gcXVlc3Rpb24gbXVzdCBtYXRjaC5cbiAgICogLSBgJ2lnbm9yZWQnYDogV2hlbiBjb21wYXJpbmcgYFVybFRyZWVgcywgbWF0cml4IHBhcmFtcyB3aWxsIGJlIGlnbm9yZWQuXG4gICAqL1xuICBtYXRyaXhQYXJhbXM6ICdleGFjdCd8J3N1YnNldCd8J2lnbm9yZWQnO1xuICAvKipcbiAgICogRGVmaW5lcyB0aGUgc3RyYXRlZ3kgZm9yIGNvbXBhcmluZyB0aGUgcXVlcnkgcGFyYW1ldGVycyBvZiB0d28gYFVybFRyZWVgcy5cbiAgICpcbiAgICogLSBgJ2V4YWN0J2A6IHRoZSBxdWVyeSBwYXJhbWV0ZXJzIG11c3QgbWF0Y2ggZXhhY3RseS5cbiAgICogLSBgJ3N1YnNldCdgOiB0aGUgYWN0aXZlIGBVcmxUcmVlYCBtYXkgY29udGFpbiBleHRyYSBwYXJhbWV0ZXJzLFxuICAgKiBidXQgbXVzdCBtYXRjaCB0aGUga2V5IGFuZCB2YWx1ZSBvZiBhbnkgdGhhdCBleGlzdCBpbiB0aGUgYFVybFRyZWVgIGluIHF1ZXN0aW9uLlxuICAgKiAtIGAnaWdub3JlZCdgOiBXaGVuIGNvbXBhcmluZyBgVXJsVHJlZWBzLCBxdWVyeSBwYXJhbXMgd2lsbCBiZSBpZ25vcmVkLlxuICAgKi9cbiAgcXVlcnlQYXJhbXM6ICdleGFjdCd8J3N1YnNldCd8J2lnbm9yZWQnO1xuICAvKipcbiAgICogRGVmaW5lcyB0aGUgc3RyYXRlZ3kgZm9yIGNvbXBhcmluZyB0aGUgYFVybFNlZ21lbnRgcyBvZiB0aGUgYFVybFRyZWVgcy5cbiAgICpcbiAgICogLSBgJ2V4YWN0J2A6IGFsbCBzZWdtZW50cyBpbiBlYWNoIGBVcmxUcmVlYCBtdXN0IG1hdGNoLlxuICAgKiAtIGAnc3Vic2V0J2A6IGEgYFVybFRyZWVgIHdpbGwgYmUgZGV0ZXJtaW5lZCB0byBiZSBhY3RpdmUgaWYgaXRcbiAgICogaXMgYSBzdWJ0cmVlIG9mIHRoZSBhY3RpdmUgcm91dGUuIFRoYXQgaXMsIHRoZSBhY3RpdmUgcm91dGUgbWF5IGNvbnRhaW4gZXh0cmFcbiAgICogc2VnbWVudHMsIGJ1dCBtdXN0IGF0IGxlYXN0IGhhdmUgYWxsIHRoZSBzZWdtZW50cyBvZiB0aGUgYFVybFRyZWVgIGluIHF1ZXN0aW9uLlxuICAgKi9cbiAgcGF0aHM6ICdleGFjdCd8J3N1YnNldCc7XG4gIC8qKlxuICAgKiAtIGAnZXhhY3QnYDogaW5kaWNhdGVzIHRoYXQgdGhlIGBVcmxUcmVlYCBmcmFnbWVudHMgbXVzdCBiZSBlcXVhbC5cbiAgICogLSBgJ2lnbm9yZWQnYDogdGhlIGZyYWdtZW50cyB3aWxsIG5vdCBiZSBjb21wYXJlZCB3aGVuIGRldGVybWluaW5nIGlmIGFcbiAgICogYFVybFRyZWVgIGlzIGFjdGl2ZS5cbiAgICovXG4gIGZyYWdtZW50OiAnZXhhY3QnfCdpZ25vcmVkJztcbn1cblxudHlwZSBQYXJhbU1hdGNoT3B0aW9ucyA9ICdleGFjdCd8J3N1YnNldCd8J2lnbm9yZWQnO1xuXG50eXBlIFBhdGhDb21wYXJlRm4gPVxuICAgIChjb250YWluZXI6IFVybFNlZ21lbnRHcm91cCwgY29udGFpbmVlOiBVcmxTZWdtZW50R3JvdXAsIG1hdHJpeFBhcmFtczogUGFyYW1NYXRjaE9wdGlvbnMpID0+XG4gICAgICAgIGJvb2xlYW47XG50eXBlIFBhcmFtQ29tcGFyZUZuID0gKGNvbnRhaW5lcjogUGFyYW1zLCBjb250YWluZWU6IFBhcmFtcykgPT4gYm9vbGVhbjtcblxuY29uc3QgcGF0aENvbXBhcmVNYXA6IFJlY29yZDxJc0FjdGl2ZU1hdGNoT3B0aW9uc1sncGF0aHMnXSwgUGF0aENvbXBhcmVGbj4gPSB7XG4gICdleGFjdCc6IGVxdWFsU2VnbWVudEdyb3VwcyxcbiAgJ3N1YnNldCc6IGNvbnRhaW5zU2VnbWVudEdyb3VwLFxufTtcbmNvbnN0IHBhcmFtQ29tcGFyZU1hcDogUmVjb3JkPFBhcmFtTWF0Y2hPcHRpb25zLCBQYXJhbUNvbXBhcmVGbj4gPSB7XG4gICdleGFjdCc6IGVxdWFsUGFyYW1zLFxuICAnc3Vic2V0JzogY29udGFpbnNQYXJhbXMsXG4gICdpZ25vcmVkJzogKCkgPT4gdHJ1ZSxcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBjb250YWluc1RyZWUoXG4gICAgY29udGFpbmVyOiBVcmxUcmVlLCBjb250YWluZWU6IFVybFRyZWUsIG9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zKTogYm9vbGVhbiB7XG4gIHJldHVybiBwYXRoQ29tcGFyZU1hcFtvcHRpb25zLnBhdGhzXShjb250YWluZXIucm9vdCwgY29udGFpbmVlLnJvb3QsIG9wdGlvbnMubWF0cml4UGFyYW1zKSAmJlxuICAgICAgcGFyYW1Db21wYXJlTWFwW29wdGlvbnMucXVlcnlQYXJhbXNdKGNvbnRhaW5lci5xdWVyeVBhcmFtcywgY29udGFpbmVlLnF1ZXJ5UGFyYW1zKSAmJlxuICAgICAgIShvcHRpb25zLmZyYWdtZW50ID09PSAnZXhhY3QnICYmIGNvbnRhaW5lci5mcmFnbWVudCAhPT0gY29udGFpbmVlLmZyYWdtZW50KTtcbn1cblxuZnVuY3Rpb24gZXF1YWxQYXJhbXMoY29udGFpbmVyOiBQYXJhbXMsIGNvbnRhaW5lZTogUGFyYW1zKTogYm9vbGVhbiB7XG4gIC8vIFRPRE86IFRoaXMgZG9lcyBub3QgaGFuZGxlIGFycmF5IHBhcmFtcyBjb3JyZWN0bHkuXG4gIHJldHVybiBzaGFsbG93RXF1YWwoY29udGFpbmVyLCBjb250YWluZWUpO1xufVxuXG5mdW5jdGlvbiBlcXVhbFNlZ21lbnRHcm91cHMoXG4gICAgY29udGFpbmVyOiBVcmxTZWdtZW50R3JvdXAsIGNvbnRhaW5lZTogVXJsU2VnbWVudEdyb3VwLFxuICAgIG1hdHJpeFBhcmFtczogUGFyYW1NYXRjaE9wdGlvbnMpOiBib29sZWFuIHtcbiAgaWYgKCFlcXVhbFBhdGgoY29udGFpbmVyLnNlZ21lbnRzLCBjb250YWluZWUuc2VnbWVudHMpKSByZXR1cm4gZmFsc2U7XG4gIGlmICghbWF0cml4UGFyYW1zTWF0Y2goY29udGFpbmVyLnNlZ21lbnRzLCBjb250YWluZWUuc2VnbWVudHMsIG1hdHJpeFBhcmFtcykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKGNvbnRhaW5lci5udW1iZXJPZkNoaWxkcmVuICE9PSBjb250YWluZWUubnVtYmVyT2ZDaGlsZHJlbikgcmV0dXJuIGZhbHNlO1xuICBmb3IgKGNvbnN0IGMgaW4gY29udGFpbmVlLmNoaWxkcmVuKSB7XG4gICAgaWYgKCFjb250YWluZXIuY2hpbGRyZW5bY10pIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIWVxdWFsU2VnbWVudEdyb3Vwcyhjb250YWluZXIuY2hpbGRyZW5bY10sIGNvbnRhaW5lZS5jaGlsZHJlbltjXSwgbWF0cml4UGFyYW1zKSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29udGFpbnNQYXJhbXMoY29udGFpbmVyOiBQYXJhbXMsIGNvbnRhaW5lZTogUGFyYW1zKTogYm9vbGVhbiB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhjb250YWluZWUpLmxlbmd0aCA8PSBPYmplY3Qua2V5cyhjb250YWluZXIpLmxlbmd0aCAmJlxuICAgICAgT2JqZWN0LmtleXMoY29udGFpbmVlKS5ldmVyeShrZXkgPT4gZXF1YWxBcnJheXNPclN0cmluZyhjb250YWluZXJba2V5XSwgY29udGFpbmVlW2tleV0pKTtcbn1cblxuZnVuY3Rpb24gY29udGFpbnNTZWdtZW50R3JvdXAoXG4gICAgY29udGFpbmVyOiBVcmxTZWdtZW50R3JvdXAsIGNvbnRhaW5lZTogVXJsU2VnbWVudEdyb3VwLFxuICAgIG1hdHJpeFBhcmFtczogUGFyYW1NYXRjaE9wdGlvbnMpOiBib29sZWFuIHtcbiAgcmV0dXJuIGNvbnRhaW5zU2VnbWVudEdyb3VwSGVscGVyKGNvbnRhaW5lciwgY29udGFpbmVlLCBjb250YWluZWUuc2VnbWVudHMsIG1hdHJpeFBhcmFtcyk7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zU2VnbWVudEdyb3VwSGVscGVyKFxuICAgIGNvbnRhaW5lcjogVXJsU2VnbWVudEdyb3VwLCBjb250YWluZWU6IFVybFNlZ21lbnRHcm91cCwgY29udGFpbmVlUGF0aHM6IFVybFNlZ21lbnRbXSxcbiAgICBtYXRyaXhQYXJhbXM6IFBhcmFtTWF0Y2hPcHRpb25zKTogYm9vbGVhbiB7XG4gIGlmIChjb250YWluZXIuc2VnbWVudHMubGVuZ3RoID4gY29udGFpbmVlUGF0aHMubGVuZ3RoKSB7XG4gICAgY29uc3QgY3VycmVudCA9IGNvbnRhaW5lci5zZWdtZW50cy5zbGljZSgwLCBjb250YWluZWVQYXRocy5sZW5ndGgpO1xuICAgIGlmICghZXF1YWxQYXRoKGN1cnJlbnQsIGNvbnRhaW5lZVBhdGhzKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChjb250YWluZWUuaGFzQ2hpbGRyZW4oKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0cml4UGFyYW1zTWF0Y2goY3VycmVudCwgY29udGFpbmVlUGF0aHMsIG1hdHJpeFBhcmFtcykpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcblxuICB9IGVsc2UgaWYgKGNvbnRhaW5lci5zZWdtZW50cy5sZW5ndGggPT09IGNvbnRhaW5lZVBhdGhzLmxlbmd0aCkge1xuICAgIGlmICghZXF1YWxQYXRoKGNvbnRhaW5lci5zZWdtZW50cywgY29udGFpbmVlUGF0aHMpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFtYXRyaXhQYXJhbXNNYXRjaChjb250YWluZXIuc2VnbWVudHMsIGNvbnRhaW5lZVBhdGhzLCBtYXRyaXhQYXJhbXMpKSByZXR1cm4gZmFsc2U7XG4gICAgZm9yIChjb25zdCBjIGluIGNvbnRhaW5lZS5jaGlsZHJlbikge1xuICAgICAgaWYgKCFjb250YWluZXIuY2hpbGRyZW5bY10pIHJldHVybiBmYWxzZTtcbiAgICAgIGlmICghY29udGFpbnNTZWdtZW50R3JvdXAoY29udGFpbmVyLmNoaWxkcmVuW2NdLCBjb250YWluZWUuY2hpbGRyZW5bY10sIG1hdHJpeFBhcmFtcykpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcblxuICB9IGVsc2Uge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBjb250YWluZWVQYXRocy5zbGljZSgwLCBjb250YWluZXIuc2VnbWVudHMubGVuZ3RoKTtcbiAgICBjb25zdCBuZXh0ID0gY29udGFpbmVlUGF0aHMuc2xpY2UoY29udGFpbmVyLnNlZ21lbnRzLmxlbmd0aCk7XG4gICAgaWYgKCFlcXVhbFBhdGgoY29udGFpbmVyLnNlZ21lbnRzLCBjdXJyZW50KSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0cml4UGFyYW1zTWF0Y2goY29udGFpbmVyLnNlZ21lbnRzLCBjdXJyZW50LCBtYXRyaXhQYXJhbXMpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFjb250YWluZXIuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIGNvbnRhaW5zU2VnbWVudEdyb3VwSGVscGVyKFxuICAgICAgICBjb250YWluZXIuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdLCBjb250YWluZWUsIG5leHQsIG1hdHJpeFBhcmFtcyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWF0cml4UGFyYW1zTWF0Y2goXG4gICAgY29udGFpbmVyUGF0aHM6IFVybFNlZ21lbnRbXSwgY29udGFpbmVlUGF0aHM6IFVybFNlZ21lbnRbXSwgb3B0aW9uczogUGFyYW1NYXRjaE9wdGlvbnMpIHtcbiAgcmV0dXJuIGNvbnRhaW5lZVBhdGhzLmV2ZXJ5KChjb250YWluZWVTZWdtZW50LCBpKSA9PiB7XG4gICAgcmV0dXJuIHBhcmFtQ29tcGFyZU1hcFtvcHRpb25zXShjb250YWluZXJQYXRoc1tpXS5wYXJhbWV0ZXJzLCBjb250YWluZWVTZWdtZW50LnBhcmFtZXRlcnMpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIHRoZSBwYXJzZWQgVVJMLlxuICpcbiAqIFNpbmNlIGEgcm91dGVyIHN0YXRlIGlzIGEgdHJlZSwgYW5kIHRoZSBVUkwgaXMgbm90aGluZyBidXQgYSBzZXJpYWxpemVkIHN0YXRlLCB0aGUgVVJMIGlzIGFcbiAqIHNlcmlhbGl6ZWQgdHJlZS5cbiAqIFVybFRyZWUgaXMgYSBkYXRhIHN0cnVjdHVyZSB0aGF0IHByb3ZpZGVzIGEgbG90IG9mIGFmZm9yZGFuY2VzIGluIGRlYWxpbmcgd2l0aCBVUkxzXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqICMjIyBFeGFtcGxlXG4gKlxuICogYGBgXG4gKiBAQ29tcG9uZW50KHt0ZW1wbGF0ZVVybDondGVtcGxhdGUuaHRtbCd9KVxuICogY2xhc3MgTXlDb21wb25lbnQge1xuICogICBjb25zdHJ1Y3Rvcihyb3V0ZXI6IFJvdXRlcikge1xuICogICAgIGNvbnN0IHRyZWU6IFVybFRyZWUgPVxuICogICAgICAgcm91dGVyLnBhcnNlVXJsKCcvdGVhbS8zMy8odXNlci92aWN0b3IvL3N1cHBvcnQ6aGVscCk/ZGVidWc9dHJ1ZSNmcmFnbWVudCcpO1xuICogICAgIGNvbnN0IGYgPSB0cmVlLmZyYWdtZW50OyAvLyByZXR1cm4gJ2ZyYWdtZW50J1xuICogICAgIGNvbnN0IHEgPSB0cmVlLnF1ZXJ5UGFyYW1zOyAvLyByZXR1cm5zIHtkZWJ1ZzogJ3RydWUnfVxuICogICAgIGNvbnN0IGc6IFVybFNlZ21lbnRHcm91cCA9IHRyZWUucm9vdC5jaGlsZHJlbltQUklNQVJZX09VVExFVF07XG4gKiAgICAgY29uc3QgczogVXJsU2VnbWVudFtdID0gZy5zZWdtZW50czsgLy8gcmV0dXJucyAyIHNlZ21lbnRzICd0ZWFtJyBhbmQgJzMzJ1xuICogICAgIGcuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdLnNlZ21lbnRzOyAvLyByZXR1cm5zIDIgc2VnbWVudHMgJ3VzZXInIGFuZCAndmljdG9yJ1xuICogICAgIGcuY2hpbGRyZW5bJ3N1cHBvcnQnXS5zZWdtZW50czsgLy8gcmV0dXJuIDEgc2VnbWVudCAnaGVscCdcbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgVXJsVHJlZSB7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX3F1ZXJ5UGFyYW1NYXA/OiBQYXJhbU1hcDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBUaGUgcm9vdCBzZWdtZW50IGdyb3VwIG9mIHRoZSBVUkwgdHJlZSAqL1xuICAgICAgcHVibGljIHJvb3Q6IFVybFNlZ21lbnRHcm91cCA9IG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KSxcbiAgICAgIC8qKiBUaGUgcXVlcnkgcGFyYW1zIG9mIHRoZSBVUkwgKi9cbiAgICAgIHB1YmxpYyBxdWVyeVBhcmFtczogUGFyYW1zID0ge30sXG4gICAgICAvKiogVGhlIGZyYWdtZW50IG9mIHRoZSBVUkwgKi9cbiAgICAgIHB1YmxpYyBmcmFnbWVudDogc3RyaW5nfG51bGwgPSBudWxsKSB7XG4gICAgaWYgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkge1xuICAgICAgaWYgKHJvb3Quc2VnbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgICAgUnVudGltZUVycm9yQ29kZS5JTlZBTElEX1JPT1RfVVJMX1NFR01FTlQsXG4gICAgICAgICAgICAnVGhlIHJvb3QgYFVybFNlZ21lbnRHcm91cGAgc2hvdWxkIG5vdCBjb250YWluIGBzZWdtZW50c2AuICcgK1xuICAgICAgICAgICAgICAgICdJbnN0ZWFkLCB0aGVzZSBzZWdtZW50cyBiZWxvbmcgaW4gdGhlIGBjaGlsZHJlbmAgc28gdGhleSBjYW4gYmUgYXNzb2NpYXRlZCB3aXRoIGEgbmFtZWQgb3V0bGV0LicpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldCBxdWVyeVBhcmFtTWFwKCk6IFBhcmFtTWFwIHtcbiAgICBpZiAoIXRoaXMuX3F1ZXJ5UGFyYW1NYXApIHtcbiAgICAgIHRoaXMuX3F1ZXJ5UGFyYW1NYXAgPSBjb252ZXJ0VG9QYXJhbU1hcCh0aGlzLnF1ZXJ5UGFyYW1zKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UGFyYW1NYXA7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBERUZBVUxUX1NFUklBTElaRVIuc2VyaWFsaXplKHRoaXMpO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgcGFyc2VkIFVSTCBzZWdtZW50IGdyb3VwLlxuICpcbiAqIFNlZSBgVXJsVHJlZWAgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgVXJsU2VnbWVudEdyb3VwIHtcbiAgLyoqIFRoZSBwYXJlbnQgbm9kZSBpbiB0aGUgdXJsIHRyZWUgKi9cbiAgcGFyZW50OiBVcmxTZWdtZW50R3JvdXB8bnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogVGhlIFVSTCBzZWdtZW50cyBvZiB0aGlzIGdyb3VwLiBTZWUgYFVybFNlZ21lbnRgIGZvciBtb3JlIGluZm9ybWF0aW9uICovXG4gICAgICBwdWJsaWMgc2VnbWVudHM6IFVybFNlZ21lbnRbXSxcbiAgICAgIC8qKiBUaGUgbGlzdCBvZiBjaGlsZHJlbiBvZiB0aGlzIGdyb3VwICovXG4gICAgICBwdWJsaWMgY2hpbGRyZW46IHtba2V5OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9KSB7XG4gICAgT2JqZWN0LnZhbHVlcyhjaGlsZHJlbikuZm9yRWFjaCgodikgPT4gKHYucGFyZW50ID0gdGhpcykpO1xuICB9XG5cbiAgLyoqIFdoZXRoZXIgdGhlIHNlZ21lbnQgaGFzIGNoaWxkIHNlZ21lbnRzICovXG4gIGhhc0NoaWxkcmVuKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLm51bWJlck9mQ2hpbGRyZW4gPiAwO1xuICB9XG5cbiAgLyoqIE51bWJlciBvZiBjaGlsZCBzZWdtZW50cyAqL1xuICBnZXQgbnVtYmVyT2ZDaGlsZHJlbigpOiBudW1iZXIge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLmNoaWxkcmVuKS5sZW5ndGg7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBzZXJpYWxpemVQYXRocyh0aGlzKTtcbiAgfVxufVxuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyBhIHNpbmdsZSBVUkwgc2VnbWVudC5cbiAqXG4gKiBBIFVybFNlZ21lbnQgaXMgYSBwYXJ0IG9mIGEgVVJMIGJldHdlZW4gdGhlIHR3byBzbGFzaGVzLiBJdCBjb250YWlucyBhIHBhdGggYW5kIHRoZSBtYXRyaXhcbiAqIHBhcmFtZXRlcnMgYXNzb2NpYXRlZCB3aXRoIHRoZSBzZWdtZW50LlxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKsKgIyMjIEV4YW1wbGVcbiAqXG4gKiBgYGBcbiAqIEBDb21wb25lbnQoe3RlbXBsYXRlVXJsOid0ZW1wbGF0ZS5odG1sJ30pXG4gKiBjbGFzcyBNeUNvbXBvbmVudCB7XG4gKiAgIGNvbnN0cnVjdG9yKHJvdXRlcjogUm91dGVyKSB7XG4gKiAgICAgY29uc3QgdHJlZTogVXJsVHJlZSA9IHJvdXRlci5wYXJzZVVybCgnL3RlYW07aWQ9MzMnKTtcbiAqICAgICBjb25zdCBnOiBVcmxTZWdtZW50R3JvdXAgPSB0cmVlLnJvb3QuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdO1xuICogICAgIGNvbnN0IHM6IFVybFNlZ21lbnRbXSA9IGcuc2VnbWVudHM7XG4gKiAgICAgc1swXS5wYXRoOyAvLyByZXR1cm5zICd0ZWFtJ1xuICogICAgIHNbMF0ucGFyYW1ldGVyczsgLy8gcmV0dXJucyB7aWQ6IDMzfVxuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBVcmxTZWdtZW50IHtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfcGFyYW1ldGVyTWFwPzogUGFyYW1NYXA7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogVGhlIHBhdGggcGFydCBvZiBhIFVSTCBzZWdtZW50ICovXG4gICAgICBwdWJsaWMgcGF0aDogc3RyaW5nLFxuXG4gICAgICAvKiogVGhlIG1hdHJpeCBwYXJhbWV0ZXJzIGFzc29jaWF0ZWQgd2l0aCBhIHNlZ21lbnQgKi9cbiAgICAgIHB1YmxpYyBwYXJhbWV0ZXJzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30pIHt9XG5cbiAgZ2V0IHBhcmFtZXRlck1hcCgpOiBQYXJhbU1hcCB7XG4gICAgaWYgKCF0aGlzLl9wYXJhbWV0ZXJNYXApIHtcbiAgICAgIHRoaXMuX3BhcmFtZXRlck1hcCA9IGNvbnZlcnRUb1BhcmFtTWFwKHRoaXMucGFyYW1ldGVycyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9wYXJhbWV0ZXJNYXA7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBzZXJpYWxpemVQYXRoKHRoaXMpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbFNlZ21lbnRzKGFzOiBVcmxTZWdtZW50W10sIGJzOiBVcmxTZWdtZW50W10pOiBib29sZWFuIHtcbiAgcmV0dXJuIGVxdWFsUGF0aChhcywgYnMpICYmIGFzLmV2ZXJ5KChhLCBpKSA9PiBzaGFsbG93RXF1YWwoYS5wYXJhbWV0ZXJzLCBic1tpXS5wYXJhbWV0ZXJzKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbFBhdGgoYXM6IFVybFNlZ21lbnRbXSwgYnM6IFVybFNlZ21lbnRbXSk6IGJvb2xlYW4ge1xuICBpZiAoYXMubGVuZ3RoICE9PSBicy5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIGFzLmV2ZXJ5KChhLCBpKSA9PiBhLnBhdGggPT09IGJzW2ldLnBhdGgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFwQ2hpbGRyZW5JbnRvQXJyYXk8VD4oXG4gICAgc2VnbWVudDogVXJsU2VnbWVudEdyb3VwLCBmbjogKHY6IFVybFNlZ21lbnRHcm91cCwgazogc3RyaW5nKSA9PiBUW10pOiBUW10ge1xuICBsZXQgcmVzOiBUW10gPSBbXTtcbiAgT2JqZWN0LmVudHJpZXMoc2VnbWVudC5jaGlsZHJlbikuZm9yRWFjaCgoW2NoaWxkT3V0bGV0LCBjaGlsZF0pID0+IHtcbiAgICBpZiAoY2hpbGRPdXRsZXQgPT09IFBSSU1BUllfT1VUTEVUKSB7XG4gICAgICByZXMgPSByZXMuY29uY2F0KGZuKGNoaWxkLCBjaGlsZE91dGxldCkpO1xuICAgIH1cbiAgfSk7XG4gIE9iamVjdC5lbnRyaWVzKHNlZ21lbnQuY2hpbGRyZW4pLmZvckVhY2goKFtjaGlsZE91dGxldCwgY2hpbGRdKSA9PiB7XG4gICAgaWYgKGNoaWxkT3V0bGV0ICE9PSBQUklNQVJZX09VVExFVCkge1xuICAgICAgcmVzID0gcmVzLmNvbmNhdChmbihjaGlsZCwgY2hpbGRPdXRsZXQpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gcmVzO1xufVxuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogU2VyaWFsaXplcyBhbmQgZGVzZXJpYWxpemVzIGEgVVJMIHN0cmluZyBpbnRvIGEgVVJMIHRyZWUuXG4gKlxuICogVGhlIHVybCBzZXJpYWxpemF0aW9uIHN0cmF0ZWd5IGlzIGN1c3RvbWl6YWJsZS4gWW91IGNhblxuICogbWFrZSBhbGwgVVJMcyBjYXNlIGluc2Vuc2l0aXZlIGJ5IHByb3ZpZGluZyBhIGN1c3RvbSBVcmxTZXJpYWxpemVyLlxuICpcbiAqIFNlZSBgRGVmYXVsdFVybFNlcmlhbGl6ZXJgIGZvciBhbiBleGFtcGxlIG9mIGEgVVJMIHNlcmlhbGl6ZXIuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnLCB1c2VGYWN0b3J5OiAoKSA9PiBuZXcgRGVmYXVsdFVybFNlcmlhbGl6ZXIoKX0pXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgVXJsU2VyaWFsaXplciB7XG4gIC8qKiBQYXJzZSBhIHVybCBpbnRvIGEgYFVybFRyZWVgICovXG4gIGFic3RyYWN0IHBhcnNlKHVybDogc3RyaW5nKTogVXJsVHJlZTtcblxuICAvKiogQ29udmVydHMgYSBgVXJsVHJlZWAgaW50byBhIHVybCAqL1xuICBhYnN0cmFjdCBzZXJpYWxpemUodHJlZTogVXJsVHJlZSk6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBBIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gb2YgdGhlIGBVcmxTZXJpYWxpemVyYC5cbiAqXG4gKiBFeGFtcGxlIFVSTHM6XG4gKlxuICogYGBgXG4gKiAvaW5ib3gvMzMocG9wdXA6Y29tcG9zZSlcbiAqIC9pbmJveC8zMztvcGVuPXRydWUvbWVzc2FnZXMvNDRcbiAqIGBgYFxuICpcbiAqIERlZmF1bHRVcmxTZXJpYWxpemVyIHVzZXMgcGFyZW50aGVzZXMgdG8gc2VyaWFsaXplIHNlY29uZGFyeSBzZWdtZW50cyAoZS5nLiwgcG9wdXA6Y29tcG9zZSksIHRoZVxuICogY29sb24gc3ludGF4IHRvIHNwZWNpZnkgdGhlIG91dGxldCwgYW5kIHRoZSAnO3BhcmFtZXRlcj12YWx1ZScgc3ludGF4IChlLmcuLCBvcGVuPXRydWUpIHRvXG4gKiBzcGVjaWZ5IHJvdXRlIHNwZWNpZmljIHBhcmFtZXRlcnMuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgRGVmYXVsdFVybFNlcmlhbGl6ZXIgaW1wbGVtZW50cyBVcmxTZXJpYWxpemVyIHtcbiAgLyoqIFBhcnNlcyBhIHVybCBpbnRvIGEgYFVybFRyZWVgICovXG4gIHBhcnNlKHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gICAgY29uc3QgcCA9IG5ldyBVcmxQYXJzZXIodXJsKTtcbiAgICByZXR1cm4gbmV3IFVybFRyZWUocC5wYXJzZVJvb3RTZWdtZW50KCksIHAucGFyc2VRdWVyeVBhcmFtcygpLCBwLnBhcnNlRnJhZ21lbnQoKSk7XG4gIH1cblxuICAvKiogQ29udmVydHMgYSBgVXJsVHJlZWAgaW50byBhIHVybCAqL1xuICBzZXJpYWxpemUodHJlZTogVXJsVHJlZSk6IHN0cmluZyB7XG4gICAgY29uc3Qgc2VnbWVudCA9IGAvJHtzZXJpYWxpemVTZWdtZW50KHRyZWUucm9vdCwgdHJ1ZSl9YDtcbiAgICBjb25zdCBxdWVyeSA9IHNlcmlhbGl6ZVF1ZXJ5UGFyYW1zKHRyZWUucXVlcnlQYXJhbXMpO1xuICAgIGNvbnN0IGZyYWdtZW50ID1cbiAgICAgICAgdHlwZW9mIHRyZWUuZnJhZ21lbnQgPT09IGBzdHJpbmdgID8gYCMke2VuY29kZVVyaUZyYWdtZW50KHRyZWUuZnJhZ21lbnQpfWAgOiAnJztcblxuICAgIHJldHVybiBgJHtzZWdtZW50fSR7cXVlcnl9JHtmcmFnbWVudH1gO1xuICB9XG59XG5cbmNvbnN0IERFRkFVTFRfU0VSSUFMSVpFUiA9IG5ldyBEZWZhdWx0VXJsU2VyaWFsaXplcigpO1xuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplUGF0aHMoc2VnbWVudDogVXJsU2VnbWVudEdyb3VwKTogc3RyaW5nIHtcbiAgcmV0dXJuIHNlZ21lbnQuc2VnbWVudHMubWFwKHAgPT4gc2VyaWFsaXplUGF0aChwKSkuam9pbignLycpO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVTZWdtZW50KHNlZ21lbnQ6IFVybFNlZ21lbnRHcm91cCwgcm9vdDogYm9vbGVhbik6IHN0cmluZyB7XG4gIGlmICghc2VnbWVudC5oYXNDaGlsZHJlbigpKSB7XG4gICAgcmV0dXJuIHNlcmlhbGl6ZVBhdGhzKHNlZ21lbnQpO1xuICB9XG5cbiAgaWYgKHJvb3QpIHtcbiAgICBjb25zdCBwcmltYXJ5ID0gc2VnbWVudC5jaGlsZHJlbltQUklNQVJZX09VVExFVF0gP1xuICAgICAgICBzZXJpYWxpemVTZWdtZW50KHNlZ21lbnQuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdLCBmYWxzZSkgOlxuICAgICAgICAnJztcbiAgICBjb25zdCBjaGlsZHJlbjogc3RyaW5nW10gPSBbXTtcblxuICAgIE9iamVjdC5lbnRyaWVzKHNlZ21lbnQuY2hpbGRyZW4pLmZvckVhY2goKFtrLCB2XSkgPT4ge1xuICAgICAgaWYgKGsgIT09IFBSSU1BUllfT1VUTEVUKSB7XG4gICAgICAgIGNoaWxkcmVuLnB1c2goYCR7a306JHtzZXJpYWxpemVTZWdtZW50KHYsIGZhbHNlKX1gKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBjaGlsZHJlbi5sZW5ndGggPiAwID8gYCR7cHJpbWFyeX0oJHtjaGlsZHJlbi5qb2luKCcvLycpfSlgIDogcHJpbWFyeTtcblxuICB9IGVsc2Uge1xuICAgIGNvbnN0IGNoaWxkcmVuID0gbWFwQ2hpbGRyZW5JbnRvQXJyYXkoc2VnbWVudCwgKHY6IFVybFNlZ21lbnRHcm91cCwgazogc3RyaW5nKSA9PiB7XG4gICAgICBpZiAoayA9PT0gUFJJTUFSWV9PVVRMRVQpIHtcbiAgICAgICAgcmV0dXJuIFtzZXJpYWxpemVTZWdtZW50KHNlZ21lbnQuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdLCBmYWxzZSldO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gW2Ake2t9OiR7c2VyaWFsaXplU2VnbWVudCh2LCBmYWxzZSl9YF07XG4gICAgfSk7XG5cbiAgICAvLyB1c2Ugbm8gcGFyZW50aGVzaXMgaWYgdGhlIG9ubHkgY2hpbGQgaXMgYSBwcmltYXJ5IG91dGxldCByb3V0ZVxuICAgIGlmIChPYmplY3Qua2V5cyhzZWdtZW50LmNoaWxkcmVuKS5sZW5ndGggPT09IDEgJiYgc2VnbWVudC5jaGlsZHJlbltQUklNQVJZX09VVExFVF0gIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGAke3NlcmlhbGl6ZVBhdGhzKHNlZ21lbnQpfS8ke2NoaWxkcmVuWzBdfWA7XG4gICAgfVxuXG4gICAgcmV0dXJuIGAke3NlcmlhbGl6ZVBhdGhzKHNlZ21lbnQpfS8oJHtjaGlsZHJlbi5qb2luKCcvLycpfSlgO1xuICB9XG59XG5cbi8qKlxuICogRW5jb2RlcyBhIFVSSSBzdHJpbmcgd2l0aCB0aGUgZGVmYXVsdCBlbmNvZGluZy4gVGhpcyBmdW5jdGlvbiB3aWxsIG9ubHkgZXZlciBiZSBjYWxsZWQgZnJvbVxuICogYGVuY29kZVVyaVF1ZXJ5YCBvciBgZW5jb2RlVXJpU2VnbWVudGAgYXMgaXQncyB0aGUgYmFzZSBzZXQgb2YgZW5jb2RpbmdzIHRvIGJlIHVzZWQuIFdlIG5lZWRcbiAqIGEgY3VzdG9tIGVuY29kaW5nIGJlY2F1c2UgZW5jb2RlVVJJQ29tcG9uZW50IGlzIHRvbyBhZ2dyZXNzaXZlIGFuZCBlbmNvZGVzIHN0dWZmIHRoYXQgZG9lc24ndFxuICogaGF2ZSB0byBiZSBlbmNvZGVkIHBlciBodHRwczovL3VybC5zcGVjLndoYXR3Zy5vcmcuXG4gKi9cbmZ1bmN0aW9uIGVuY29kZVVyaVN0cmluZyhzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHMpXG4gICAgICAucmVwbGFjZSgvJTQwL2csICdAJylcbiAgICAgIC5yZXBsYWNlKC8lM0EvZ2ksICc6JylcbiAgICAgIC5yZXBsYWNlKC8lMjQvZywgJyQnKVxuICAgICAgLnJlcGxhY2UoLyUyQy9naSwgJywnKTtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIHNob3VsZCBiZSB1c2VkIHRvIGVuY29kZSBib3RoIGtleXMgYW5kIHZhbHVlcyBpbiBhIHF1ZXJ5IHN0cmluZyBrZXkvdmFsdWUuIEluXG4gKiB0aGUgZm9sbG93aW5nIFVSTCwgeW91IG5lZWQgdG8gY2FsbCBlbmNvZGVVcmlRdWVyeSBvbiBcImtcIiBhbmQgXCJ2XCI6XG4gKlxuICogaHR0cDovL3d3dy5zaXRlLm9yZy9odG1sO21rPW12P2s9diNmXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbmNvZGVVcmlRdWVyeShzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZW5jb2RlVXJpU3RyaW5nKHMpLnJlcGxhY2UoLyUzQi9naSwgJzsnKTtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIHNob3VsZCBiZSB1c2VkIHRvIGVuY29kZSBhIFVSTCBmcmFnbWVudC4gSW4gdGhlIGZvbGxvd2luZyBVUkwsIHlvdSBuZWVkIHRvIGNhbGxcbiAqIGVuY29kZVVyaUZyYWdtZW50IG9uIFwiZlwiOlxuICpcbiAqIGh0dHA6Ly93d3cuc2l0ZS5vcmcvaHRtbDttaz1tdj9rPXYjZlxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5jb2RlVXJpRnJhZ21lbnQoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVuY29kZVVSSShzKTtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIHNob3VsZCBiZSBydW4gb24gYW55IFVSSSBzZWdtZW50IGFzIHdlbGwgYXMgdGhlIGtleSBhbmQgdmFsdWUgaW4gYSBrZXkvdmFsdWVcbiAqIHBhaXIgZm9yIG1hdHJpeCBwYXJhbXMuIEluIHRoZSBmb2xsb3dpbmcgVVJMLCB5b3UgbmVlZCB0byBjYWxsIGVuY29kZVVyaVNlZ21lbnQgb24gXCJodG1sXCIsXG4gKiBcIm1rXCIsIGFuZCBcIm12XCI6XG4gKlxuICogaHR0cDovL3d3dy5zaXRlLm9yZy9odG1sO21rPW12P2s9diNmXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbmNvZGVVcmlTZWdtZW50KHM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBlbmNvZGVVcmlTdHJpbmcocykucmVwbGFjZSgvXFwoL2csICclMjgnKS5yZXBsYWNlKC9cXCkvZywgJyUyOScpLnJlcGxhY2UoLyUyNi9naSwgJyYnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlY29kZShzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHMpO1xufVxuXG4vLyBRdWVyeSBrZXlzL3ZhbHVlcyBzaG91bGQgaGF2ZSB0aGUgXCIrXCIgcmVwbGFjZWQgZmlyc3QsIGFzIFwiK1wiIGluIGEgcXVlcnkgc3RyaW5nIGlzIFwiIFwiLlxuLy8gZGVjb2RlVVJJQ29tcG9uZW50IGZ1bmN0aW9uIHdpbGwgbm90IGRlY29kZSBcIitcIiBhcyBhIHNwYWNlLlxuZXhwb3J0IGZ1bmN0aW9uIGRlY29kZVF1ZXJ5KHM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBkZWNvZGUocy5yZXBsYWNlKC9cXCsvZywgJyUyMCcpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZVBhdGgocGF0aDogVXJsU2VnbWVudCk6IHN0cmluZyB7XG4gIHJldHVybiBgJHtlbmNvZGVVcmlTZWdtZW50KHBhdGgucGF0aCl9JHtzZXJpYWxpemVNYXRyaXhQYXJhbXMocGF0aC5wYXJhbWV0ZXJzKX1gO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVNYXRyaXhQYXJhbXMocGFyYW1zOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSk6IHN0cmluZyB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhwYXJhbXMpXG4gICAgICAubWFwKGtleSA9PiBgOyR7ZW5jb2RlVXJpU2VnbWVudChrZXkpfT0ke2VuY29kZVVyaVNlZ21lbnQocGFyYW1zW2tleV0pfWApXG4gICAgICAuam9pbignJyk7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZVF1ZXJ5UGFyYW1zKHBhcmFtczoge1trZXk6IHN0cmluZ106IGFueX0pOiBzdHJpbmcge1xuICBjb25zdCBzdHJQYXJhbXM6IHN0cmluZ1tdID1cbiAgICAgIE9iamVjdC5rZXlzKHBhcmFtcylcbiAgICAgICAgICAubWFwKChuYW1lKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IHBhcmFtc1tuYW1lXTtcbiAgICAgICAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KHZhbHVlKSA/XG4gICAgICAgICAgICAgICAgdmFsdWUubWFwKHYgPT4gYCR7ZW5jb2RlVXJpUXVlcnkobmFtZSl9PSR7ZW5jb2RlVXJpUXVlcnkodil9YCkuam9pbignJicpIDpcbiAgICAgICAgICAgICAgICBgJHtlbmNvZGVVcmlRdWVyeShuYW1lKX09JHtlbmNvZGVVcmlRdWVyeSh2YWx1ZSl9YDtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5maWx0ZXIocyA9PiAhIXMpO1xuXG4gIHJldHVybiBzdHJQYXJhbXMubGVuZ3RoID8gYD8ke3N0clBhcmFtcy5qb2luKCcmJyl9YCA6ICcnO1xufVxuXG5jb25zdCBTRUdNRU5UX1JFID0gL15bXlxcLygpPzsjXSsvO1xuZnVuY3Rpb24gbWF0Y2hTZWdtZW50cyhzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IG1hdGNoID0gc3RyLm1hdGNoKFNFR01FTlRfUkUpO1xuICByZXR1cm4gbWF0Y2ggPyBtYXRjaFswXSA6ICcnO1xufVxuXG5jb25zdCBNQVRSSVhfUEFSQU1fU0VHTUVOVF9SRSA9IC9eW15cXC8oKT87PSNdKy87XG5mdW5jdGlvbiBtYXRjaE1hdHJpeEtleVNlZ21lbnRzKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbWF0Y2ggPSBzdHIubWF0Y2goTUFUUklYX1BBUkFNX1NFR01FTlRfUkUpO1xuICByZXR1cm4gbWF0Y2ggPyBtYXRjaFswXSA6ICcnO1xufVxuXG5jb25zdCBRVUVSWV9QQVJBTV9SRSA9IC9eW149PyYjXSsvO1xuLy8gUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBxdWVyeSBwYXJhbSBhdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmluZyBvciBhbiBlbXB0eSBzdHJpbmdcbmZ1bmN0aW9uIG1hdGNoUXVlcnlQYXJhbXMoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBtYXRjaCA9IHN0ci5tYXRjaChRVUVSWV9QQVJBTV9SRSk7XG4gIHJldHVybiBtYXRjaCA/IG1hdGNoWzBdIDogJyc7XG59XG5cbmNvbnN0IFFVRVJZX1BBUkFNX1ZBTFVFX1JFID0gL15bXiYjXSsvO1xuLy8gUmV0dXJuIHRoZSB2YWx1ZSBvZiB0aGUgcXVlcnkgcGFyYW0gYXQgdGhlIHN0YXJ0IG9mIHRoZSBzdHJpbmcgb3IgYW4gZW1wdHkgc3RyaW5nXG5mdW5jdGlvbiBtYXRjaFVybFF1ZXJ5UGFyYW1WYWx1ZShzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IG1hdGNoID0gc3RyLm1hdGNoKFFVRVJZX1BBUkFNX1ZBTFVFX1JFKTtcbiAgcmV0dXJuIG1hdGNoID8gbWF0Y2hbMF0gOiAnJztcbn1cblxuY2xhc3MgVXJsUGFyc2VyIHtcbiAgcHJpdmF0ZSByZW1haW5pbmc6IHN0cmluZztcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHVybDogc3RyaW5nKSB7XG4gICAgdGhpcy5yZW1haW5pbmcgPSB1cmw7XG4gIH1cblxuICBwYXJzZVJvb3RTZWdtZW50KCk6IFVybFNlZ21lbnRHcm91cCB7XG4gICAgdGhpcy5jb25zdW1lT3B0aW9uYWwoJy8nKTtcblxuICAgIGlmICh0aGlzLnJlbWFpbmluZyA9PT0gJycgfHwgdGhpcy5wZWVrU3RhcnRzV2l0aCgnPycpIHx8IHRoaXMucGVla1N0YXJ0c1dpdGgoJyMnKSkge1xuICAgICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KTtcbiAgICB9XG5cbiAgICAvLyBUaGUgcm9vdCBzZWdtZW50IGdyb3VwIG5ldmVyIGhhcyBzZWdtZW50c1xuICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCB0aGlzLnBhcnNlQ2hpbGRyZW4oKSk7XG4gIH1cblxuICBwYXJzZVF1ZXJ5UGFyYW1zKCk6IFBhcmFtcyB7XG4gICAgY29uc3QgcGFyYW1zOiBQYXJhbXMgPSB7fTtcbiAgICBpZiAodGhpcy5jb25zdW1lT3B0aW9uYWwoJz8nKSkge1xuICAgICAgZG8ge1xuICAgICAgICB0aGlzLnBhcnNlUXVlcnlQYXJhbShwYXJhbXMpO1xuICAgICAgfSB3aGlsZSAodGhpcy5jb25zdW1lT3B0aW9uYWwoJyYnKSk7XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXM7XG4gIH1cblxuICBwYXJzZUZyYWdtZW50KCk6IHN0cmluZ3xudWxsIHtcbiAgICByZXR1cm4gdGhpcy5jb25zdW1lT3B0aW9uYWwoJyMnKSA/IGRlY29kZVVSSUNvbXBvbmVudCh0aGlzLnJlbWFpbmluZykgOiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUNoaWxkcmVuKCk6IHtbb3V0bGV0OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9IHtcbiAgICBpZiAodGhpcy5yZW1haW5pbmcgPT09ICcnKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgdGhpcy5jb25zdW1lT3B0aW9uYWwoJy8nKTtcblxuICAgIGNvbnN0IHNlZ21lbnRzOiBVcmxTZWdtZW50W10gPSBbXTtcbiAgICBpZiAoIXRoaXMucGVla1N0YXJ0c1dpdGgoJygnKSkge1xuICAgICAgc2VnbWVudHMucHVzaCh0aGlzLnBhcnNlU2VnbWVudCgpKTtcbiAgICB9XG5cbiAgICB3aGlsZSAodGhpcy5wZWVrU3RhcnRzV2l0aCgnLycpICYmICF0aGlzLnBlZWtTdGFydHNXaXRoKCcvLycpICYmICF0aGlzLnBlZWtTdGFydHNXaXRoKCcvKCcpKSB7XG4gICAgICB0aGlzLmNhcHR1cmUoJy8nKTtcbiAgICAgIHNlZ21lbnRzLnB1c2godGhpcy5wYXJzZVNlZ21lbnQoKSk7XG4gICAgfVxuXG4gICAgbGV0IGNoaWxkcmVuOiB7W291dGxldDogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICAgIGlmICh0aGlzLnBlZWtTdGFydHNXaXRoKCcvKCcpKSB7XG4gICAgICB0aGlzLmNhcHR1cmUoJy8nKTtcbiAgICAgIGNoaWxkcmVuID0gdGhpcy5wYXJzZVBhcmVucyh0cnVlKTtcbiAgICB9XG5cbiAgICBsZXQgcmVzOiB7W291dGxldDogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICAgIGlmICh0aGlzLnBlZWtTdGFydHNXaXRoKCcoJykpIHtcbiAgICAgIHJlcyA9IHRoaXMucGFyc2VQYXJlbnMoZmFsc2UpO1xuICAgIH1cblxuICAgIGlmIChzZWdtZW50cy5sZW5ndGggPiAwIHx8IE9iamVjdC5rZXlzKGNoaWxkcmVuKS5sZW5ndGggPiAwKSB7XG4gICAgICByZXNbUFJJTUFSWV9PVVRMRVRdID0gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50cywgY2hpbGRyZW4pO1xuICAgIH1cblxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICAvLyBwYXJzZSBhIHNlZ21lbnQgd2l0aCBpdHMgbWF0cml4IHBhcmFtZXRlcnNcbiAgLy8gaWUgYG5hbWU7azE9djE7azJgXG4gIHByaXZhdGUgcGFyc2VTZWdtZW50KCk6IFVybFNlZ21lbnQge1xuICAgIGNvbnN0IHBhdGggPSBtYXRjaFNlZ21lbnRzKHRoaXMucmVtYWluaW5nKTtcbiAgICBpZiAocGF0aCA9PT0gJycgJiYgdGhpcy5wZWVrU3RhcnRzV2l0aCgnOycpKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuRU1QVFlfUEFUSF9XSVRIX1BBUkFNUyxcbiAgICAgICAgICAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSAmJlxuICAgICAgICAgICAgICBgRW1wdHkgcGF0aCB1cmwgc2VnbWVudCBjYW5ub3QgaGF2ZSBwYXJhbWV0ZXJzOiAnJHt0aGlzLnJlbWFpbmluZ30nLmApO1xuICAgIH1cblxuICAgIHRoaXMuY2FwdHVyZShwYXRoKTtcbiAgICByZXR1cm4gbmV3IFVybFNlZ21lbnQoZGVjb2RlKHBhdGgpLCB0aGlzLnBhcnNlTWF0cml4UGFyYW1zKCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZU1hdHJpeFBhcmFtcygpOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSB7XG4gICAgY29uc3QgcGFyYW1zOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICAgIHdoaWxlICh0aGlzLmNvbnN1bWVPcHRpb25hbCgnOycpKSB7XG4gICAgICB0aGlzLnBhcnNlUGFyYW0ocGFyYW1zKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcztcbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VQYXJhbShwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KTogdm9pZCB7XG4gICAgY29uc3Qga2V5ID0gbWF0Y2hNYXRyaXhLZXlTZWdtZW50cyh0aGlzLnJlbWFpbmluZyk7XG4gICAgaWYgKCFrZXkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5jYXB0dXJlKGtleSk7XG4gICAgbGV0IHZhbHVlOiBhbnkgPSAnJztcbiAgICBpZiAodGhpcy5jb25zdW1lT3B0aW9uYWwoJz0nKSkge1xuICAgICAgY29uc3QgdmFsdWVNYXRjaCA9IG1hdGNoU2VnbWVudHModGhpcy5yZW1haW5pbmcpO1xuICAgICAgaWYgKHZhbHVlTWF0Y2gpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZU1hdGNoO1xuICAgICAgICB0aGlzLmNhcHR1cmUodmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHBhcmFtc1tkZWNvZGUoa2V5KV0gPSBkZWNvZGUodmFsdWUpO1xuICB9XG5cbiAgLy8gUGFyc2UgYSBzaW5nbGUgcXVlcnkgcGFyYW1ldGVyIGBuYW1lWz12YWx1ZV1gXG4gIHByaXZhdGUgcGFyc2VRdWVyeVBhcmFtKHBhcmFtczogUGFyYW1zKTogdm9pZCB7XG4gICAgY29uc3Qga2V5ID0gbWF0Y2hRdWVyeVBhcmFtcyh0aGlzLnJlbWFpbmluZyk7XG4gICAgaWYgKCFrZXkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5jYXB0dXJlKGtleSk7XG4gICAgbGV0IHZhbHVlOiBhbnkgPSAnJztcbiAgICBpZiAodGhpcy5jb25zdW1lT3B0aW9uYWwoJz0nKSkge1xuICAgICAgY29uc3QgdmFsdWVNYXRjaCA9IG1hdGNoVXJsUXVlcnlQYXJhbVZhbHVlKHRoaXMucmVtYWluaW5nKTtcbiAgICAgIGlmICh2YWx1ZU1hdGNoKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWVNYXRjaDtcbiAgICAgICAgdGhpcy5jYXB0dXJlKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBkZWNvZGVkS2V5ID0gZGVjb2RlUXVlcnkoa2V5KTtcbiAgICBjb25zdCBkZWNvZGVkVmFsID0gZGVjb2RlUXVlcnkodmFsdWUpO1xuXG4gICAgaWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShkZWNvZGVkS2V5KSkge1xuICAgICAgLy8gQXBwZW5kIHRvIGV4aXN0aW5nIHZhbHVlc1xuICAgICAgbGV0IGN1cnJlbnRWYWwgPSBwYXJhbXNbZGVjb2RlZEtleV07XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkoY3VycmVudFZhbCkpIHtcbiAgICAgICAgY3VycmVudFZhbCA9IFtjdXJyZW50VmFsXTtcbiAgICAgICAgcGFyYW1zW2RlY29kZWRLZXldID0gY3VycmVudFZhbDtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnRWYWwucHVzaChkZWNvZGVkVmFsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQ3JlYXRlIGEgbmV3IHZhbHVlXG4gICAgICBwYXJhbXNbZGVjb2RlZEtleV0gPSBkZWNvZGVkVmFsO1xuICAgIH1cbiAgfVxuXG4gIC8vIHBhcnNlIGAoYS9iLy9vdXRsZXRfbmFtZTpjL2QpYFxuICBwcml2YXRlIHBhcnNlUGFyZW5zKGFsbG93UHJpbWFyeTogYm9vbGVhbik6IHtbb3V0bGV0OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9IHtcbiAgICBjb25zdCBzZWdtZW50czoge1trZXk6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0gPSB7fTtcbiAgICB0aGlzLmNhcHR1cmUoJygnKTtcblxuICAgIHdoaWxlICghdGhpcy5jb25zdW1lT3B0aW9uYWwoJyknKSAmJiB0aGlzLnJlbWFpbmluZy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBwYXRoID0gbWF0Y2hTZWdtZW50cyh0aGlzLnJlbWFpbmluZyk7XG5cbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnJlbWFpbmluZ1twYXRoLmxlbmd0aF07XG5cbiAgICAgIC8vIGlmIGlzIGlzIG5vdCBvbmUgb2YgdGhlc2UgY2hhcmFjdGVycywgdGhlbiB0aGUgc2VnbWVudCB3YXMgdW5lc2NhcGVkXG4gICAgICAvLyBvciB0aGUgZ3JvdXAgd2FzIG5vdCBjbG9zZWRcbiAgICAgIGlmIChuZXh0ICE9PSAnLycgJiYgbmV4dCAhPT0gJyknICYmIG5leHQgIT09ICc7Jykge1xuICAgICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgICAgUnVudGltZUVycm9yQ29kZS5VTlBBUlNBQkxFX1VSTCxcbiAgICAgICAgICAgICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpICYmIGBDYW5ub3QgcGFyc2UgdXJsICcke3RoaXMudXJsfSdgKTtcbiAgICAgIH1cblxuICAgICAgbGV0IG91dGxldE5hbWU6IHN0cmluZyA9IHVuZGVmaW5lZCE7XG4gICAgICBpZiAocGF0aC5pbmRleE9mKCc6JykgPiAtMSkge1xuICAgICAgICBvdXRsZXROYW1lID0gcGF0aC5zbGljZSgwLCBwYXRoLmluZGV4T2YoJzonKSk7XG4gICAgICAgIHRoaXMuY2FwdHVyZShvdXRsZXROYW1lKTtcbiAgICAgICAgdGhpcy5jYXB0dXJlKCc6Jyk7XG4gICAgICB9IGVsc2UgaWYgKGFsbG93UHJpbWFyeSkge1xuICAgICAgICBvdXRsZXROYW1lID0gUFJJTUFSWV9PVVRMRVQ7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNoaWxkcmVuID0gdGhpcy5wYXJzZUNoaWxkcmVuKCk7XG4gICAgICBzZWdtZW50c1tvdXRsZXROYW1lXSA9IE9iamVjdC5rZXlzKGNoaWxkcmVuKS5sZW5ndGggPT09IDEgPyBjaGlsZHJlbltQUklNQVJZX09VVExFVF0gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFVybFNlZ21lbnRHcm91cChbXSwgY2hpbGRyZW4pO1xuICAgICAgdGhpcy5jb25zdW1lT3B0aW9uYWwoJy8vJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlZ21lbnRzO1xuICB9XG5cbiAgcHJpdmF0ZSBwZWVrU3RhcnRzV2l0aChzdHI6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnJlbWFpbmluZy5zdGFydHNXaXRoKHN0cik7XG4gIH1cblxuICAvLyBDb25zdW1lcyB0aGUgcHJlZml4IHdoZW4gaXQgaXMgcHJlc2VudCBhbmQgcmV0dXJucyB3aGV0aGVyIGl0IGhhcyBiZWVuIGNvbnN1bWVkXG4gIHByaXZhdGUgY29uc3VtZU9wdGlvbmFsKHN0cjogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoc3RyKSkge1xuICAgICAgdGhpcy5yZW1haW5pbmcgPSB0aGlzLnJlbWFpbmluZy5zdWJzdHJpbmcoc3RyLmxlbmd0aCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBjYXB0dXJlKHN0cjogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmNvbnN1bWVPcHRpb25hbChzdHIpKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuVU5FWFBFQ1RFRF9WQUxVRV9JTl9VUkwsXG4gICAgICAgICAgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkgJiYgYEV4cGVjdGVkIFwiJHtzdHJ9XCIuYCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSb290KHJvb3RDYW5kaWRhdGU6IFVybFNlZ21lbnRHcm91cCkge1xuICByZXR1cm4gcm9vdENhbmRpZGF0ZS5zZWdtZW50cy5sZW5ndGggPiAwID9cbiAgICAgIG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHtbUFJJTUFSWV9PVVRMRVRdOiByb290Q2FuZGlkYXRlfSkgOlxuICAgICAgcm9vdENhbmRpZGF0ZTtcbn1cblxuLyoqXG4gKiBSZWN1cnNpdmVseVxuICogLSBtZXJnZXMgcHJpbWFyeSBzZWdtZW50IGNoaWxkcmVuIGludG8gdGhlaXIgcGFyZW50c1xuICogLSBkcm9wcyBlbXB0eSBjaGlsZHJlbiAodGhvc2Ugd2hpY2ggaGF2ZSBubyBzZWdtZW50cyBhbmQgbm8gY2hpbGRyZW4gdGhlbXNlbHZlcykuIFRoaXMgbGF0dGVyXG4gKiBwcmV2ZW50cyBzZXJpYWxpemluZyBhIGdyb3VwIGludG8gc29tZXRoaW5nIGxpa2UgYC9hKGF1eDopYCwgd2hlcmUgYGF1eGAgaXMgYW4gZW1wdHkgY2hpbGRcbiAqIHNlZ21lbnQuXG4gKiAtIG1lcmdlcyBuYW1lZCBvdXRsZXRzIHdpdGhvdXQgYSBwcmltYXJ5IHNlZ21lbnQgc2libGluZyBpbnRvIHRoZSBjaGlsZHJlbi4gVGhpcyBwcmV2ZW50c1xuICogc2VyaWFsaXppbmcgYSBVUkwgbGlrZSBgLy8oYTphKShiOmIpIGluc3RlYWQgb2YgYC8oYTphLy9iOmIpYCB3aGVuIHRoZSBhdXggYiByb3V0ZSBsaXZlcyBvbiB0aGVcbiAqIHJvb3QgYnV0IHRoZSBgYWAgcm91dGUgbGl2ZXMgdW5kZXIgYW4gZW1wdHkgcGF0aCBwcmltYXJ5IHJvdXRlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3F1YXNoU2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgY29uc3QgbmV3Q2hpbGRyZW46IFJlY29yZDxzdHJpbmcsIFVybFNlZ21lbnRHcm91cD4gPSB7fTtcbiAgZm9yIChjb25zdCBjaGlsZE91dGxldCBvZiBPYmplY3Qua2V5cyhzZWdtZW50R3JvdXAuY2hpbGRyZW4pKSB7XG4gICAgY29uc3QgY2hpbGQgPSBzZWdtZW50R3JvdXAuY2hpbGRyZW5bY2hpbGRPdXRsZXRdO1xuICAgIGNvbnN0IGNoaWxkQ2FuZGlkYXRlID0gc3F1YXNoU2VnbWVudEdyb3VwKGNoaWxkKTtcbiAgICAvLyBtb3ZlcyBuYW1lZCBjaGlsZHJlbiBpbiBhbiBlbXB0eSBwYXRoIHByaW1hcnkgY2hpbGQgaW50byB0aGlzIGdyb3VwXG4gICAgaWYgKGNoaWxkT3V0bGV0ID09PSBQUklNQVJZX09VVExFVCAmJiBjaGlsZENhbmRpZGF0ZS5zZWdtZW50cy5sZW5ndGggPT09IDAgJiZcbiAgICAgICAgY2hpbGRDYW5kaWRhdGUuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgZm9yIChjb25zdCBbZ3JhbmRDaGlsZE91dGxldCwgZ3JhbmRDaGlsZF0gb2YgT2JqZWN0LmVudHJpZXMoY2hpbGRDYW5kaWRhdGUuY2hpbGRyZW4pKSB7XG4gICAgICAgIG5ld0NoaWxkcmVuW2dyYW5kQ2hpbGRPdXRsZXRdID0gZ3JhbmRDaGlsZDtcbiAgICAgIH1cbiAgICB9ICAvLyBkb24ndCBhZGQgZW1wdHkgY2hpbGRyZW5cbiAgICBlbHNlIGlmIChjaGlsZENhbmRpZGF0ZS5zZWdtZW50cy5sZW5ndGggPiAwIHx8IGNoaWxkQ2FuZGlkYXRlLmhhc0NoaWxkcmVuKCkpIHtcbiAgICAgIG5ld0NoaWxkcmVuW2NoaWxkT3V0bGV0XSA9IGNoaWxkQ2FuZGlkYXRlO1xuICAgIH1cbiAgfVxuICBjb25zdCBzID0gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50R3JvdXAuc2VnbWVudHMsIG5ld0NoaWxkcmVuKTtcbiAgcmV0dXJuIG1lcmdlVHJpdmlhbENoaWxkcmVuKHMpO1xufVxuXG4vKipcbiAqIFdoZW4gcG9zc2libGUsIG1lcmdlcyB0aGUgcHJpbWFyeSBvdXRsZXQgY2hpbGQgaW50byB0aGUgcGFyZW50IGBVcmxTZWdtZW50R3JvdXBgLlxuICpcbiAqIFdoZW4gYSBzZWdtZW50IGdyb3VwIGhhcyBvbmx5IG9uZSBjaGlsZCB3aGljaCBpcyBhIHByaW1hcnkgb3V0bGV0LCBtZXJnZXMgdGhhdCBjaGlsZCBpbnRvIHRoZVxuICogcGFyZW50LiBUaGF0IGlzLCB0aGUgY2hpbGQgc2VnbWVudCBncm91cCdzIHNlZ21lbnRzIGFyZSBtZXJnZWQgaW50byB0aGUgYHNgIGFuZCB0aGUgY2hpbGQnc1xuICogY2hpbGRyZW4gYmVjb21lIHRoZSBjaGlsZHJlbiBvZiBgc2AuIFRoaW5rIG9mIHRoaXMgbGlrZSBhICdzcXVhc2gnLCBtZXJnaW5nIHRoZSBjaGlsZCBzZWdtZW50XG4gKiBncm91cCBpbnRvIHRoZSBwYXJlbnQuXG4gKi9cbmZ1bmN0aW9uIG1lcmdlVHJpdmlhbENoaWxkcmVuKHM6IFVybFNlZ21lbnRHcm91cCk6IFVybFNlZ21lbnRHcm91cCB7XG4gIGlmIChzLm51bWJlck9mQ2hpbGRyZW4gPT09IDEgJiYgcy5jaGlsZHJlbltQUklNQVJZX09VVExFVF0pIHtcbiAgICBjb25zdCBjID0gcy5jaGlsZHJlbltQUklNQVJZX09VVExFVF07XG4gICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAocy5zZWdtZW50cy5jb25jYXQoYy5zZWdtZW50cyksIGMuY2hpbGRyZW4pO1xuICB9XG5cbiAgcmV0dXJuIHM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1VybFRyZWUodjogYW55KTogdiBpcyBVcmxUcmVlIHtcbiAgcmV0dXJuIHYgaW5zdGFuY2VvZiBVcmxUcmVlO1xufVxuIl19