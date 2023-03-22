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
const NG_DEV_MODE = typeof ngDevMode === 'undefined' || ngDevMode;
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
        if (NG_DEV_MODE) {
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
class UrlSerializer {
}
UrlSerializer.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.3+sha-8ea1fb7", ngImport: i0, type: UrlSerializer, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
UrlSerializer.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.0.0-next.3+sha-8ea1fb7", ngImport: i0, type: UrlSerializer, providedIn: 'root', useFactory: () => new DefaultUrlSerializer() });
export { UrlSerializer };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.3+sha-8ea1fb7", ngImport: i0, type: UrlSerializer, decorators: [{
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
const SEGMENT_RE = /^[^\/()?;=#]+/;
function matchSegments(str) {
    const match = str.match(SEGMENT_RE);
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
            throw new RuntimeError(4009 /* RuntimeErrorCode.EMPTY_PATH_WITH_PARAMS */, NG_DEV_MODE && `Empty path url segment cannot have parameters: '${this.remaining}'.`);
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
        const key = matchSegments(this.remaining);
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
                throw new RuntimeError(4010 /* RuntimeErrorCode.UNPARSABLE_URL */, NG_DEV_MODE && `Cannot parse url '${this.url}'`);
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
            throw new RuntimeError(4011 /* RuntimeErrorCode.UNEXPECTED_VALUE_IN_URL */, NG_DEV_MODE && `Expected "${str}".`);
        }
    }
}
export function createRoot(rootCandidate) {
    return rootCandidate.segments.length > 0 ?
        new UrlSegmentGroup([], { [PRIMARY_OUTLET]: rootCandidate }) :
        rootCandidate;
}
/**
 * Recursively merges primary segment children into their parents and also drops empty children
 * (those which have no segments and no children themselves). The latter prevents serializing a
 * group into something like `/a(aux:)`, where `aux` is an empty child segment.
 */
export function squashSegmentGroup(segmentGroup) {
    const newChildren = {};
    for (const childOutlet of Object.keys(segmentGroup.children)) {
        const child = segmentGroup.children[childOutlet];
        const childCandidate = squashSegmentGroup(child);
        // don't add empty children
        if (childCandidate.segments.length > 0 || childCandidate.hasChildren()) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsX3RyZWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3VybF90cmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxVQUFVLEVBQUUsYUFBYSxJQUFJLFlBQVksRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUd4RSxPQUFPLEVBQUMsaUJBQWlCLEVBQW9CLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3RSxPQUFPLEVBQUMsbUJBQW1CLEVBQUUsWUFBWSxFQUFDLE1BQU0sb0JBQW9CLENBQUM7O0FBRXJFLE1BQU0sV0FBVyxHQUFHLE9BQU8sU0FBUyxLQUFLLFdBQVcsSUFBSSxTQUFTLENBQUM7QUF5RGxFLE1BQU0sY0FBYyxHQUF5RDtJQUMzRSxPQUFPLEVBQUUsa0JBQWtCO0lBQzNCLFFBQVEsRUFBRSxvQkFBb0I7Q0FDL0IsQ0FBQztBQUNGLE1BQU0sZUFBZSxHQUE4QztJQUNqRSxPQUFPLEVBQUUsV0FBVztJQUNwQixRQUFRLEVBQUUsY0FBYztJQUN4QixTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSTtDQUN0QixDQUFDO0FBRUYsTUFBTSxVQUFVLFlBQVksQ0FDeEIsU0FBa0IsRUFBRSxTQUFrQixFQUFFLE9BQTZCO0lBQ3ZFLE9BQU8sY0FBYyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLFlBQVksQ0FBQztRQUN0RixlQUFlLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQztRQUNsRixDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLElBQUksU0FBUyxDQUFDLFFBQVEsS0FBSyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7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QyxDQUFDO0lBQ2xFLE9BQU8sb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakMsQ0FBQztBQUVEOzs7Ozs7O0dBT0c7QUFDSCxTQUFTLG9CQUFvQixDQUFDLENBQWtCO0lBQzlDLElBQUksQ0FBQyxDQUFDLGdCQUFnQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFO1FBQzFELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDckMsT0FBTyxJQUFJLGVBQWUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ3ZFO0lBRUQsT0FBTyxDQUFDLENBQUM7QUFDWCxDQUFDO0FBRUQsTUFBTSxVQUFVLFNBQVMsQ0FBQyxDQUFNO0lBQzlCLE9BQU8sQ0FBQyxZQUFZLE9BQU8sQ0FBQztBQUM5QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SW5qZWN0YWJsZSwgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHtSdW50aW1lRXJyb3JDb2RlfSBmcm9tICcuL2Vycm9ycyc7XG5pbXBvcnQge2NvbnZlcnRUb1BhcmFtTWFwLCBQYXJhbU1hcCwgUGFyYW1zLCBQUklNQVJZX09VVExFVH0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtlcXVhbEFycmF5c09yU3RyaW5nLCBzaGFsbG93RXF1YWx9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlO1xuXG4vKipcbiAqIEEgc2V0IG9mIG9wdGlvbnMgd2hpY2ggc3BlY2lmeSBob3cgdG8gZGV0ZXJtaW5lIGlmIGEgYFVybFRyZWVgIGlzIGFjdGl2ZSwgZ2l2ZW4gdGhlIGBVcmxUcmVlYFxuICogZm9yIHRoZSBjdXJyZW50IHJvdXRlciBzdGF0ZS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKiBAc2VlIFJvdXRlci5pc0FjdGl2ZVxuICovXG5leHBvcnQgaW50ZXJmYWNlIElzQWN0aXZlTWF0Y2hPcHRpb25zIHtcbiAgLyoqXG4gICAqIERlZmluZXMgdGhlIHN0cmF0ZWd5IGZvciBjb21wYXJpbmcgdGhlIG1hdHJpeCBwYXJhbWV0ZXJzIG9mIHR3byBgVXJsVHJlZWBzLlxuICAgKlxuICAgKiBUaGUgbWF0cml4IHBhcmFtZXRlciBtYXRjaGluZyBpcyBkZXBlbmRlbnQgb24gdGhlIHN0cmF0ZWd5IGZvciBtYXRjaGluZyB0aGVcbiAgICogc2VnbWVudHMuIFRoYXQgaXMsIGlmIHRoZSBgcGF0aHNgIG9wdGlvbiBpcyBzZXQgdG8gYCdzdWJzZXQnYCwgb25seVxuICAgKiB0aGUgbWF0cml4IHBhcmFtZXRlcnMgb2YgdGhlIG1hdGNoaW5nIHNlZ21lbnRzIHdpbGwgYmUgY29tcGFyZWQuXG4gICAqXG4gICAqIC0gYCdleGFjdCdgOiBSZXF1aXJlcyB0aGF0IG1hdGNoaW5nIHNlZ21lbnRzIGFsc28gaGF2ZSBleGFjdCBtYXRyaXggcGFyYW1ldGVyXG4gICAqIG1hdGNoZXMuXG4gICAqIC0gYCdzdWJzZXQnYDogVGhlIG1hdGNoaW5nIHNlZ21lbnRzIGluIHRoZSByb3V0ZXIncyBhY3RpdmUgYFVybFRyZWVgIG1heSBjb250YWluXG4gICAqIGV4dHJhIG1hdHJpeCBwYXJhbWV0ZXJzLCBidXQgdGhvc2UgdGhhdCBleGlzdCBpbiB0aGUgYFVybFRyZWVgIGluIHF1ZXN0aW9uIG11c3QgbWF0Y2guXG4gICAqIC0gYCdpZ25vcmVkJ2A6IFdoZW4gY29tcGFyaW5nIGBVcmxUcmVlYHMsIG1hdHJpeCBwYXJhbXMgd2lsbCBiZSBpZ25vcmVkLlxuICAgKi9cbiAgbWF0cml4UGFyYW1zOiAnZXhhY3QnfCdzdWJzZXQnfCdpZ25vcmVkJztcbiAgLyoqXG4gICAqIERlZmluZXMgdGhlIHN0cmF0ZWd5IGZvciBjb21wYXJpbmcgdGhlIHF1ZXJ5IHBhcmFtZXRlcnMgb2YgdHdvIGBVcmxUcmVlYHMuXG4gICAqXG4gICAqIC0gYCdleGFjdCdgOiB0aGUgcXVlcnkgcGFyYW1ldGVycyBtdXN0IG1hdGNoIGV4YWN0bHkuXG4gICAqIC0gYCdzdWJzZXQnYDogdGhlIGFjdGl2ZSBgVXJsVHJlZWAgbWF5IGNvbnRhaW4gZXh0cmEgcGFyYW1ldGVycyxcbiAgICogYnV0IG11c3QgbWF0Y2ggdGhlIGtleSBhbmQgdmFsdWUgb2YgYW55IHRoYXQgZXhpc3QgaW4gdGhlIGBVcmxUcmVlYCBpbiBxdWVzdGlvbi5cbiAgICogLSBgJ2lnbm9yZWQnYDogV2hlbiBjb21wYXJpbmcgYFVybFRyZWVgcywgcXVlcnkgcGFyYW1zIHdpbGwgYmUgaWdub3JlZC5cbiAgICovXG4gIHF1ZXJ5UGFyYW1zOiAnZXhhY3QnfCdzdWJzZXQnfCdpZ25vcmVkJztcbiAgLyoqXG4gICAqIERlZmluZXMgdGhlIHN0cmF0ZWd5IGZvciBjb21wYXJpbmcgdGhlIGBVcmxTZWdtZW50YHMgb2YgdGhlIGBVcmxUcmVlYHMuXG4gICAqXG4gICAqIC0gYCdleGFjdCdgOiBhbGwgc2VnbWVudHMgaW4gZWFjaCBgVXJsVHJlZWAgbXVzdCBtYXRjaC5cbiAgICogLSBgJ3N1YnNldCdgOiBhIGBVcmxUcmVlYCB3aWxsIGJlIGRldGVybWluZWQgdG8gYmUgYWN0aXZlIGlmIGl0XG4gICAqIGlzIGEgc3VidHJlZSBvZiB0aGUgYWN0aXZlIHJvdXRlLiBUaGF0IGlzLCB0aGUgYWN0aXZlIHJvdXRlIG1heSBjb250YWluIGV4dHJhXG4gICAqIHNlZ21lbnRzLCBidXQgbXVzdCBhdCBsZWFzdCBoYXZlIGFsbCB0aGUgc2VnbWVudHMgb2YgdGhlIGBVcmxUcmVlYCBpbiBxdWVzdGlvbi5cbiAgICovXG4gIHBhdGhzOiAnZXhhY3QnfCdzdWJzZXQnO1xuICAvKipcbiAgICogLSBgJ2V4YWN0J2A6IGluZGljYXRlcyB0aGF0IHRoZSBgVXJsVHJlZWAgZnJhZ21lbnRzIG11c3QgYmUgZXF1YWwuXG4gICAqIC0gYCdpZ25vcmVkJ2A6IHRoZSBmcmFnbWVudHMgd2lsbCBub3QgYmUgY29tcGFyZWQgd2hlbiBkZXRlcm1pbmluZyBpZiBhXG4gICAqIGBVcmxUcmVlYCBpcyBhY3RpdmUuXG4gICAqL1xuICBmcmFnbWVudDogJ2V4YWN0J3wnaWdub3JlZCc7XG59XG5cbnR5cGUgUGFyYW1NYXRjaE9wdGlvbnMgPSAnZXhhY3QnfCdzdWJzZXQnfCdpZ25vcmVkJztcblxudHlwZSBQYXRoQ29tcGFyZUZuID1cbiAgICAoY29udGFpbmVyOiBVcmxTZWdtZW50R3JvdXAsIGNvbnRhaW5lZTogVXJsU2VnbWVudEdyb3VwLCBtYXRyaXhQYXJhbXM6IFBhcmFtTWF0Y2hPcHRpb25zKSA9PlxuICAgICAgICBib29sZWFuO1xudHlwZSBQYXJhbUNvbXBhcmVGbiA9IChjb250YWluZXI6IFBhcmFtcywgY29udGFpbmVlOiBQYXJhbXMpID0+IGJvb2xlYW47XG5cbmNvbnN0IHBhdGhDb21wYXJlTWFwOiBSZWNvcmQ8SXNBY3RpdmVNYXRjaE9wdGlvbnNbJ3BhdGhzJ10sIFBhdGhDb21wYXJlRm4+ID0ge1xuICAnZXhhY3QnOiBlcXVhbFNlZ21lbnRHcm91cHMsXG4gICdzdWJzZXQnOiBjb250YWluc1NlZ21lbnRHcm91cCxcbn07XG5jb25zdCBwYXJhbUNvbXBhcmVNYXA6IFJlY29yZDxQYXJhbU1hdGNoT3B0aW9ucywgUGFyYW1Db21wYXJlRm4+ID0ge1xuICAnZXhhY3QnOiBlcXVhbFBhcmFtcyxcbiAgJ3N1YnNldCc6IGNvbnRhaW5zUGFyYW1zLFxuICAnaWdub3JlZCc6ICgpID0+IHRydWUsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gY29udGFpbnNUcmVlKFxuICAgIGNvbnRhaW5lcjogVXJsVHJlZSwgY29udGFpbmVlOiBVcmxUcmVlLCBvcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IGJvb2xlYW4ge1xuICByZXR1cm4gcGF0aENvbXBhcmVNYXBbb3B0aW9ucy5wYXRoc10oY29udGFpbmVyLnJvb3QsIGNvbnRhaW5lZS5yb290LCBvcHRpb25zLm1hdHJpeFBhcmFtcykgJiZcbiAgICAgIHBhcmFtQ29tcGFyZU1hcFtvcHRpb25zLnF1ZXJ5UGFyYW1zXShjb250YWluZXIucXVlcnlQYXJhbXMsIGNvbnRhaW5lZS5xdWVyeVBhcmFtcykgJiZcbiAgICAgICEob3B0aW9ucy5mcmFnbWVudCA9PT0gJ2V4YWN0JyAmJiBjb250YWluZXIuZnJhZ21lbnQgIT09IGNvbnRhaW5lZS5mcmFnbWVudCk7XG59XG5cbmZ1bmN0aW9uIGVxdWFsUGFyYW1zKGNvbnRhaW5lcjogUGFyYW1zLCBjb250YWluZWU6IFBhcmFtcyk6IGJvb2xlYW4ge1xuICAvLyBUT0RPOiBUaGlzIGRvZXMgbm90IGhhbmRsZSBhcnJheSBwYXJhbXMgY29ycmVjdGx5LlxuICByZXR1cm4gc2hhbGxvd0VxdWFsKGNvbnRhaW5lciwgY29udGFpbmVlKTtcbn1cblxuZnVuY3Rpb24gZXF1YWxTZWdtZW50R3JvdXBzKFxuICAgIGNvbnRhaW5lcjogVXJsU2VnbWVudEdyb3VwLCBjb250YWluZWU6IFVybFNlZ21lbnRHcm91cCxcbiAgICBtYXRyaXhQYXJhbXM6IFBhcmFtTWF0Y2hPcHRpb25zKTogYm9vbGVhbiB7XG4gIGlmICghZXF1YWxQYXRoKGNvbnRhaW5lci5zZWdtZW50cywgY29udGFpbmVlLnNlZ21lbnRzKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoIW1hdHJpeFBhcmFtc01hdGNoKGNvbnRhaW5lci5zZWdtZW50cywgY29udGFpbmVlLnNlZ21lbnRzLCBtYXRyaXhQYXJhbXMpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChjb250YWluZXIubnVtYmVyT2ZDaGlsZHJlbiAhPT0gY29udGFpbmVlLm51bWJlck9mQ2hpbGRyZW4pIHJldHVybiBmYWxzZTtcbiAgZm9yIChjb25zdCBjIGluIGNvbnRhaW5lZS5jaGlsZHJlbikge1xuICAgIGlmICghY29udGFpbmVyLmNoaWxkcmVuW2NdKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFlcXVhbFNlZ21lbnRHcm91cHMoY29udGFpbmVyLmNoaWxkcmVuW2NdLCBjb250YWluZWUuY2hpbGRyZW5bY10sIG1hdHJpeFBhcmFtcykpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zUGFyYW1zKGNvbnRhaW5lcjogUGFyYW1zLCBjb250YWluZWU6IFBhcmFtcyk6IGJvb2xlYW4ge1xuICByZXR1cm4gT2JqZWN0LmtleXMoY29udGFpbmVlKS5sZW5ndGggPD0gT2JqZWN0LmtleXMoY29udGFpbmVyKS5sZW5ndGggJiZcbiAgICAgIE9iamVjdC5rZXlzKGNvbnRhaW5lZSkuZXZlcnkoa2V5ID0+IGVxdWFsQXJyYXlzT3JTdHJpbmcoY29udGFpbmVyW2tleV0sIGNvbnRhaW5lZVtrZXldKSk7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zU2VnbWVudEdyb3VwKFxuICAgIGNvbnRhaW5lcjogVXJsU2VnbWVudEdyb3VwLCBjb250YWluZWU6IFVybFNlZ21lbnRHcm91cCxcbiAgICBtYXRyaXhQYXJhbXM6IFBhcmFtTWF0Y2hPcHRpb25zKTogYm9vbGVhbiB7XG4gIHJldHVybiBjb250YWluc1NlZ21lbnRHcm91cEhlbHBlcihjb250YWluZXIsIGNvbnRhaW5lZSwgY29udGFpbmVlLnNlZ21lbnRzLCBtYXRyaXhQYXJhbXMpO1xufVxuXG5mdW5jdGlvbiBjb250YWluc1NlZ21lbnRHcm91cEhlbHBlcihcbiAgICBjb250YWluZXI6IFVybFNlZ21lbnRHcm91cCwgY29udGFpbmVlOiBVcmxTZWdtZW50R3JvdXAsIGNvbnRhaW5lZVBhdGhzOiBVcmxTZWdtZW50W10sXG4gICAgbWF0cml4UGFyYW1zOiBQYXJhbU1hdGNoT3B0aW9ucyk6IGJvb2xlYW4ge1xuICBpZiAoY29udGFpbmVyLnNlZ21lbnRzLmxlbmd0aCA+IGNvbnRhaW5lZVBhdGhzLmxlbmd0aCkge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBjb250YWluZXIuc2VnbWVudHMuc2xpY2UoMCwgY29udGFpbmVlUGF0aHMubGVuZ3RoKTtcbiAgICBpZiAoIWVxdWFsUGF0aChjdXJyZW50LCBjb250YWluZWVQYXRocykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoY29udGFpbmVlLmhhc0NoaWxkcmVuKCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdHJpeFBhcmFtc01hdGNoKGN1cnJlbnQsIGNvbnRhaW5lZVBhdGhzLCBtYXRyaXhQYXJhbXMpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfSBlbHNlIGlmIChjb250YWluZXIuc2VnbWVudHMubGVuZ3RoID09PSBjb250YWluZWVQYXRocy5sZW5ndGgpIHtcbiAgICBpZiAoIWVxdWFsUGF0aChjb250YWluZXIuc2VnbWVudHMsIGNvbnRhaW5lZVBhdGhzKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0cml4UGFyYW1zTWF0Y2goY29udGFpbmVyLnNlZ21lbnRzLCBjb250YWluZWVQYXRocywgbWF0cml4UGFyYW1zKSkgcmV0dXJuIGZhbHNlO1xuICAgIGZvciAoY29uc3QgYyBpbiBjb250YWluZWUuY2hpbGRyZW4pIHtcbiAgICAgIGlmICghY29udGFpbmVyLmNoaWxkcmVuW2NdKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAoIWNvbnRhaW5zU2VnbWVudEdyb3VwKGNvbnRhaW5lci5jaGlsZHJlbltjXSwgY29udGFpbmVlLmNoaWxkcmVuW2NdLCBtYXRyaXhQYXJhbXMpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfSBlbHNlIHtcbiAgICBjb25zdCBjdXJyZW50ID0gY29udGFpbmVlUGF0aHMuc2xpY2UoMCwgY29udGFpbmVyLnNlZ21lbnRzLmxlbmd0aCk7XG4gICAgY29uc3QgbmV4dCA9IGNvbnRhaW5lZVBhdGhzLnNsaWNlKGNvbnRhaW5lci5zZWdtZW50cy5sZW5ndGgpO1xuICAgIGlmICghZXF1YWxQYXRoKGNvbnRhaW5lci5zZWdtZW50cywgY3VycmVudCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdHJpeFBhcmFtc01hdGNoKGNvbnRhaW5lci5zZWdtZW50cywgY3VycmVudCwgbWF0cml4UGFyYW1zKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghY29udGFpbmVyLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiBjb250YWluc1NlZ21lbnRHcm91cEhlbHBlcihcbiAgICAgICAgY29udGFpbmVyLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSwgY29udGFpbmVlLCBuZXh0LCBtYXRyaXhQYXJhbXMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1hdHJpeFBhcmFtc01hdGNoKFxuICAgIGNvbnRhaW5lclBhdGhzOiBVcmxTZWdtZW50W10sIGNvbnRhaW5lZVBhdGhzOiBVcmxTZWdtZW50W10sIG9wdGlvbnM6IFBhcmFtTWF0Y2hPcHRpb25zKSB7XG4gIHJldHVybiBjb250YWluZWVQYXRocy5ldmVyeSgoY29udGFpbmVlU2VnbWVudCwgaSkgPT4ge1xuICAgIHJldHVybiBwYXJhbUNvbXBhcmVNYXBbb3B0aW9uc10oY29udGFpbmVyUGF0aHNbaV0ucGFyYW1ldGVycywgY29udGFpbmVlU2VnbWVudC5wYXJhbWV0ZXJzKTtcbiAgfSk7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgcGFyc2VkIFVSTC5cbiAqXG4gKiBTaW5jZSBhIHJvdXRlciBzdGF0ZSBpcyBhIHRyZWUsIGFuZCB0aGUgVVJMIGlzIG5vdGhpbmcgYnV0IGEgc2VyaWFsaXplZCBzdGF0ZSwgdGhlIFVSTCBpcyBhXG4gKiBzZXJpYWxpemVkIHRyZWUuXG4gKiBVcmxUcmVlIGlzIGEgZGF0YSBzdHJ1Y3R1cmUgdGhhdCBwcm92aWRlcyBhIGxvdCBvZiBhZmZvcmRhbmNlcyBpbiBkZWFsaW5nIHdpdGggVVJMc1xuICpcbiAqIEB1c2FnZU5vdGVzXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYFxuICogQENvbXBvbmVudCh7dGVtcGxhdGVVcmw6J3RlbXBsYXRlLmh0bWwnfSlcbiAqIGNsYXNzIE15Q29tcG9uZW50IHtcbiAqICAgY29uc3RydWN0b3Iocm91dGVyOiBSb3V0ZXIpIHtcbiAqICAgICBjb25zdCB0cmVlOiBVcmxUcmVlID1cbiAqICAgICAgIHJvdXRlci5wYXJzZVVybCgnL3RlYW0vMzMvKHVzZXIvdmljdG9yLy9zdXBwb3J0OmhlbHApP2RlYnVnPXRydWUjZnJhZ21lbnQnKTtcbiAqICAgICBjb25zdCBmID0gdHJlZS5mcmFnbWVudDsgLy8gcmV0dXJuICdmcmFnbWVudCdcbiAqICAgICBjb25zdCBxID0gdHJlZS5xdWVyeVBhcmFtczsgLy8gcmV0dXJucyB7ZGVidWc6ICd0cnVlJ31cbiAqICAgICBjb25zdCBnOiBVcmxTZWdtZW50R3JvdXAgPSB0cmVlLnJvb3QuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdO1xuICogICAgIGNvbnN0IHM6IFVybFNlZ21lbnRbXSA9IGcuc2VnbWVudHM7IC8vIHJldHVybnMgMiBzZWdtZW50cyAndGVhbScgYW5kICczMydcbiAqICAgICBnLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXS5zZWdtZW50czsgLy8gcmV0dXJucyAyIHNlZ21lbnRzICd1c2VyJyBhbmQgJ3ZpY3RvcidcbiAqICAgICBnLmNoaWxkcmVuWydzdXBwb3J0J10uc2VnbWVudHM7IC8vIHJldHVybiAxIHNlZ21lbnQgJ2hlbHAnXG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFVybFRyZWUge1xuICAvKiogQGludGVybmFsICovXG4gIF9xdWVyeVBhcmFtTWFwPzogUGFyYW1NYXA7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX3dhcm5JZlVzZWRGb3JOYXZpZ2F0aW9uPzogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIFRoZSByb290IHNlZ21lbnQgZ3JvdXAgb2YgdGhlIFVSTCB0cmVlICovXG4gICAgICBwdWJsaWMgcm9vdDogVXJsU2VnbWVudEdyb3VwID0gbmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pLFxuICAgICAgLyoqIFRoZSBxdWVyeSBwYXJhbXMgb2YgdGhlIFVSTCAqL1xuICAgICAgcHVibGljIHF1ZXJ5UGFyYW1zOiBQYXJhbXMgPSB7fSxcbiAgICAgIC8qKiBUaGUgZnJhZ21lbnQgb2YgdGhlIFVSTCAqL1xuICAgICAgcHVibGljIGZyYWdtZW50OiBzdHJpbmd8bnVsbCA9IG51bGwpIHtcbiAgICBpZiAoTkdfREVWX01PREUpIHtcbiAgICAgIGlmIChyb290LnNlZ21lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuSU5WQUxJRF9ST09UX1VSTF9TRUdNRU5ULFxuICAgICAgICAgICAgJ1RoZSByb290IGBVcmxTZWdtZW50R3JvdXBgIHNob3VsZCBub3QgY29udGFpbiBgc2VnbWVudHNgLiAnICtcbiAgICAgICAgICAgICAgICAnSW5zdGVhZCwgdGhlc2Ugc2VnbWVudHMgYmVsb25nIGluIHRoZSBgY2hpbGRyZW5gIHNvIHRoZXkgY2FuIGJlIGFzc29jaWF0ZWQgd2l0aCBhIG5hbWVkIG91dGxldC4nKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXQgcXVlcnlQYXJhbU1hcCgpOiBQYXJhbU1hcCB7XG4gICAgaWYgKCF0aGlzLl9xdWVyeVBhcmFtTWFwKSB7XG4gICAgICB0aGlzLl9xdWVyeVBhcmFtTWFwID0gY29udmVydFRvUGFyYW1NYXAodGhpcy5xdWVyeVBhcmFtcyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9xdWVyeVBhcmFtTWFwO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gREVGQVVMVF9TRVJJQUxJWkVSLnNlcmlhbGl6ZSh0aGlzKTtcbiAgfVxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgdGhlIHBhcnNlZCBVUkwgc2VnbWVudCBncm91cC5cbiAqXG4gKiBTZWUgYFVybFRyZWVgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFVybFNlZ21lbnRHcm91cCB7XG4gIC8qKiBUaGUgcGFyZW50IG5vZGUgaW4gdGhlIHVybCB0cmVlICovXG4gIHBhcmVudDogVXJsU2VnbWVudEdyb3VwfG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIFRoZSBVUkwgc2VnbWVudHMgb2YgdGhpcyBncm91cC4gU2VlIGBVcmxTZWdtZW50YCBmb3IgbW9yZSBpbmZvcm1hdGlvbiAqL1xuICAgICAgcHVibGljIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgICAvKiogVGhlIGxpc3Qgb2YgY2hpbGRyZW4gb2YgdGhpcyBncm91cCAqL1xuICAgICAgcHVibGljIGNoaWxkcmVuOiB7W2tleTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSkge1xuICAgIE9iamVjdC52YWx1ZXMoY2hpbGRyZW4pLmZvckVhY2goKHYpID0+ICh2LnBhcmVudCA9IHRoaXMpKTtcbiAgfVxuXG4gIC8qKiBXaGV0aGVyIHRoZSBzZWdtZW50IGhhcyBjaGlsZCBzZWdtZW50cyAqL1xuICBoYXNDaGlsZHJlbigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5udW1iZXJPZkNoaWxkcmVuID4gMDtcbiAgfVxuXG4gIC8qKiBOdW1iZXIgb2YgY2hpbGQgc2VnbWVudHMgKi9cbiAgZ2V0IG51bWJlck9mQ2hpbGRyZW4oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5jaGlsZHJlbikubGVuZ3RoO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc2VyaWFsaXplUGF0aHModGhpcyk7XG4gIH1cbn1cblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgYSBzaW5nbGUgVVJMIHNlZ21lbnQuXG4gKlxuICogQSBVcmxTZWdtZW50IGlzIGEgcGFydCBvZiBhIFVSTCBiZXR3ZWVuIHRoZSB0d28gc2xhc2hlcy4gSXQgY29udGFpbnMgYSBwYXRoIGFuZCB0aGUgbWF0cml4XG4gKiBwYXJhbWV0ZXJzIGFzc29jaWF0ZWQgd2l0aCB0aGUgc2VnbWVudC5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICrCoCMjIyBFeGFtcGxlXG4gKlxuICogYGBgXG4gKiBAQ29tcG9uZW50KHt0ZW1wbGF0ZVVybDondGVtcGxhdGUuaHRtbCd9KVxuICogY2xhc3MgTXlDb21wb25lbnQge1xuICogICBjb25zdHJ1Y3Rvcihyb3V0ZXI6IFJvdXRlcikge1xuICogICAgIGNvbnN0IHRyZWU6IFVybFRyZWUgPSByb3V0ZXIucGFyc2VVcmwoJy90ZWFtO2lkPTMzJyk7XG4gKiAgICAgY29uc3QgZzogVXJsU2VnbWVudEdyb3VwID0gdHJlZS5yb290LmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXTtcbiAqICAgICBjb25zdCBzOiBVcmxTZWdtZW50W10gPSBnLnNlZ21lbnRzO1xuICogICAgIHNbMF0ucGF0aDsgLy8gcmV0dXJucyAndGVhbSdcbiAqICAgICBzWzBdLnBhcmFtZXRlcnM7IC8vIHJldHVybnMge2lkOiAzM31cbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgVXJsU2VnbWVudCB7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX3BhcmFtZXRlck1hcD86IFBhcmFtTWFwO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIFRoZSBwYXRoIHBhcnQgb2YgYSBVUkwgc2VnbWVudCAqL1xuICAgICAgcHVibGljIHBhdGg6IHN0cmluZyxcblxuICAgICAgLyoqIFRoZSBtYXRyaXggcGFyYW1ldGVycyBhc3NvY2lhdGVkIHdpdGggYSBzZWdtZW50ICovXG4gICAgICBwdWJsaWMgcGFyYW1ldGVyczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9KSB7fVxuXG4gIGdldCBwYXJhbWV0ZXJNYXAoKTogUGFyYW1NYXAge1xuICAgIGlmICghdGhpcy5fcGFyYW1ldGVyTWFwKSB7XG4gICAgICB0aGlzLl9wYXJhbWV0ZXJNYXAgPSBjb252ZXJ0VG9QYXJhbU1hcCh0aGlzLnBhcmFtZXRlcnMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcGFyYW1ldGVyTWFwO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc2VyaWFsaXplUGF0aCh0aGlzKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZXF1YWxTZWdtZW50cyhhczogVXJsU2VnbWVudFtdLCBiczogVXJsU2VnbWVudFtdKTogYm9vbGVhbiB7XG4gIHJldHVybiBlcXVhbFBhdGgoYXMsIGJzKSAmJiBhcy5ldmVyeSgoYSwgaSkgPT4gc2hhbGxvd0VxdWFsKGEucGFyYW1ldGVycywgYnNbaV0ucGFyYW1ldGVycykpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXF1YWxQYXRoKGFzOiBVcmxTZWdtZW50W10sIGJzOiBVcmxTZWdtZW50W10pOiBib29sZWFuIHtcbiAgaWYgKGFzLmxlbmd0aCAhPT0gYnMubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBhcy5ldmVyeSgoYSwgaSkgPT4gYS5wYXRoID09PSBic1tpXS5wYXRoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hcENoaWxkcmVuSW50b0FycmF5PFQ+KFxuICAgIHNlZ21lbnQ6IFVybFNlZ21lbnRHcm91cCwgZm46ICh2OiBVcmxTZWdtZW50R3JvdXAsIGs6IHN0cmluZykgPT4gVFtdKTogVFtdIHtcbiAgbGV0IHJlczogVFtdID0gW107XG4gIE9iamVjdC5lbnRyaWVzKHNlZ21lbnQuY2hpbGRyZW4pLmZvckVhY2goKFtjaGlsZE91dGxldCwgY2hpbGRdKSA9PiB7XG4gICAgaWYgKGNoaWxkT3V0bGV0ID09PSBQUklNQVJZX09VVExFVCkge1xuICAgICAgcmVzID0gcmVzLmNvbmNhdChmbihjaGlsZCwgY2hpbGRPdXRsZXQpKTtcbiAgICB9XG4gIH0pO1xuICBPYmplY3QuZW50cmllcyhzZWdtZW50LmNoaWxkcmVuKS5mb3JFYWNoKChbY2hpbGRPdXRsZXQsIGNoaWxkXSkgPT4ge1xuICAgIGlmIChjaGlsZE91dGxldCAhPT0gUFJJTUFSWV9PVVRMRVQpIHtcbiAgICAgIHJlcyA9IHJlcy5jb25jYXQoZm4oY2hpbGQsIGNoaWxkT3V0bGV0KSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHJlcztcbn1cblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFNlcmlhbGl6ZXMgYW5kIGRlc2VyaWFsaXplcyBhIFVSTCBzdHJpbmcgaW50byBhIFVSTCB0cmVlLlxuICpcbiAqIFRoZSB1cmwgc2VyaWFsaXphdGlvbiBzdHJhdGVneSBpcyBjdXN0b21pemFibGUuIFlvdSBjYW5cbiAqIG1ha2UgYWxsIFVSTHMgY2FzZSBpbnNlbnNpdGl2ZSBieSBwcm92aWRpbmcgYSBjdXN0b20gVXJsU2VyaWFsaXplci5cbiAqXG4gKiBTZWUgYERlZmF1bHRVcmxTZXJpYWxpemVyYCBmb3IgYW4gZXhhbXBsZSBvZiBhIFVSTCBzZXJpYWxpemVyLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290JywgdXNlRmFjdG9yeTogKCkgPT4gbmV3IERlZmF1bHRVcmxTZXJpYWxpemVyKCl9KVxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFVybFNlcmlhbGl6ZXIge1xuICAvKiogUGFyc2UgYSB1cmwgaW50byBhIGBVcmxUcmVlYCAqL1xuICBhYnN0cmFjdCBwYXJzZSh1cmw6IHN0cmluZyk6IFVybFRyZWU7XG5cbiAgLyoqIENvbnZlcnRzIGEgYFVybFRyZWVgIGludG8gYSB1cmwgKi9cbiAgYWJzdHJhY3Qgc2VyaWFsaXplKHRyZWU6IFVybFRyZWUpOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIG9mIHRoZSBgVXJsU2VyaWFsaXplcmAuXG4gKlxuICogRXhhbXBsZSBVUkxzOlxuICpcbiAqIGBgYFxuICogL2luYm94LzMzKHBvcHVwOmNvbXBvc2UpXG4gKiAvaW5ib3gvMzM7b3Blbj10cnVlL21lc3NhZ2VzLzQ0XG4gKiBgYGBcbiAqXG4gKiBEZWZhdWx0VXJsU2VyaWFsaXplciB1c2VzIHBhcmVudGhlc2VzIHRvIHNlcmlhbGl6ZSBzZWNvbmRhcnkgc2VnbWVudHMgKGUuZy4sIHBvcHVwOmNvbXBvc2UpLCB0aGVcbiAqIGNvbG9uIHN5bnRheCB0byBzcGVjaWZ5IHRoZSBvdXRsZXQsIGFuZCB0aGUgJztwYXJhbWV0ZXI9dmFsdWUnIHN5bnRheCAoZS5nLiwgb3Blbj10cnVlKSB0b1xuICogc3BlY2lmeSByb3V0ZSBzcGVjaWZpYyBwYXJhbWV0ZXJzLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIERlZmF1bHRVcmxTZXJpYWxpemVyIGltcGxlbWVudHMgVXJsU2VyaWFsaXplciB7XG4gIC8qKiBQYXJzZXMgYSB1cmwgaW50byBhIGBVcmxUcmVlYCAqL1xuICBwYXJzZSh1cmw6IHN0cmluZyk6IFVybFRyZWUge1xuICAgIGNvbnN0IHAgPSBuZXcgVXJsUGFyc2VyKHVybCk7XG4gICAgcmV0dXJuIG5ldyBVcmxUcmVlKHAucGFyc2VSb290U2VnbWVudCgpLCBwLnBhcnNlUXVlcnlQYXJhbXMoKSwgcC5wYXJzZUZyYWdtZW50KCkpO1xuICB9XG5cbiAgLyoqIENvbnZlcnRzIGEgYFVybFRyZWVgIGludG8gYSB1cmwgKi9cbiAgc2VyaWFsaXplKHRyZWU6IFVybFRyZWUpOiBzdHJpbmcge1xuICAgIGNvbnN0IHNlZ21lbnQgPSBgLyR7c2VyaWFsaXplU2VnbWVudCh0cmVlLnJvb3QsIHRydWUpfWA7XG4gICAgY29uc3QgcXVlcnkgPSBzZXJpYWxpemVRdWVyeVBhcmFtcyh0cmVlLnF1ZXJ5UGFyYW1zKTtcbiAgICBjb25zdCBmcmFnbWVudCA9XG4gICAgICAgIHR5cGVvZiB0cmVlLmZyYWdtZW50ID09PSBgc3RyaW5nYCA/IGAjJHtlbmNvZGVVcmlGcmFnbWVudCh0cmVlLmZyYWdtZW50KX1gIDogJyc7XG5cbiAgICByZXR1cm4gYCR7c2VnbWVudH0ke3F1ZXJ5fSR7ZnJhZ21lbnR9YDtcbiAgfVxufVxuXG5jb25zdCBERUZBVUxUX1NFUklBTElaRVIgPSBuZXcgRGVmYXVsdFVybFNlcmlhbGl6ZXIoKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZVBhdGhzKHNlZ21lbnQ6IFVybFNlZ21lbnRHcm91cCk6IHN0cmluZyB7XG4gIHJldHVybiBzZWdtZW50LnNlZ21lbnRzLm1hcChwID0+IHNlcmlhbGl6ZVBhdGgocCkpLmpvaW4oJy8nKTtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplU2VnbWVudChzZWdtZW50OiBVcmxTZWdtZW50R3JvdXAsIHJvb3Q6IGJvb2xlYW4pOiBzdHJpbmcge1xuICBpZiAoIXNlZ21lbnQuaGFzQ2hpbGRyZW4oKSkge1xuICAgIHJldHVybiBzZXJpYWxpemVQYXRocyhzZWdtZW50KTtcbiAgfVxuXG4gIGlmIChyb290KSB7XG4gICAgY29uc3QgcHJpbWFyeSA9IHNlZ21lbnQuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdID9cbiAgICAgICAgc2VyaWFsaXplU2VnbWVudChzZWdtZW50LmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSwgZmFsc2UpIDpcbiAgICAgICAgJyc7XG4gICAgY29uc3QgY2hpbGRyZW46IHN0cmluZ1tdID0gW107XG5cbiAgICBPYmplY3QuZW50cmllcyhzZWdtZW50LmNoaWxkcmVuKS5mb3JFYWNoKChbaywgdl0pID0+IHtcbiAgICAgIGlmIChrICE9PSBQUklNQVJZX09VVExFVCkge1xuICAgICAgICBjaGlsZHJlbi5wdXNoKGAke2t9OiR7c2VyaWFsaXplU2VnbWVudCh2LCBmYWxzZSl9YCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gY2hpbGRyZW4ubGVuZ3RoID4gMCA/IGAke3ByaW1hcnl9KCR7Y2hpbGRyZW4uam9pbignLy8nKX0pYCA6IHByaW1hcnk7XG5cbiAgfSBlbHNlIHtcbiAgICBjb25zdCBjaGlsZHJlbiA9IG1hcENoaWxkcmVuSW50b0FycmF5KHNlZ21lbnQsICh2OiBVcmxTZWdtZW50R3JvdXAsIGs6IHN0cmluZykgPT4ge1xuICAgICAgaWYgKGsgPT09IFBSSU1BUllfT1VUTEVUKSB7XG4gICAgICAgIHJldHVybiBbc2VyaWFsaXplU2VnbWVudChzZWdtZW50LmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSwgZmFsc2UpXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIFtgJHtrfToke3NlcmlhbGl6ZVNlZ21lbnQodiwgZmFsc2UpfWBdO1xuICAgIH0pO1xuXG4gICAgLy8gdXNlIG5vIHBhcmVudGhlc2lzIGlmIHRoZSBvbmx5IGNoaWxkIGlzIGEgcHJpbWFyeSBvdXRsZXQgcm91dGVcbiAgICBpZiAoT2JqZWN0LmtleXMoc2VnbWVudC5jaGlsZHJlbikubGVuZ3RoID09PSAxICYmIHNlZ21lbnQuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdICE9IG51bGwpIHtcbiAgICAgIHJldHVybiBgJHtzZXJpYWxpemVQYXRocyhzZWdtZW50KX0vJHtjaGlsZHJlblswXX1gO1xuICAgIH1cblxuICAgIHJldHVybiBgJHtzZXJpYWxpemVQYXRocyhzZWdtZW50KX0vKCR7Y2hpbGRyZW4uam9pbignLy8nKX0pYDtcbiAgfVxufVxuXG4vKipcbiAqIEVuY29kZXMgYSBVUkkgc3RyaW5nIHdpdGggdGhlIGRlZmF1bHQgZW5jb2RpbmcuIFRoaXMgZnVuY3Rpb24gd2lsbCBvbmx5IGV2ZXIgYmUgY2FsbGVkIGZyb21cbiAqIGBlbmNvZGVVcmlRdWVyeWAgb3IgYGVuY29kZVVyaVNlZ21lbnRgIGFzIGl0J3MgdGhlIGJhc2Ugc2V0IG9mIGVuY29kaW5ncyB0byBiZSB1c2VkLiBXZSBuZWVkXG4gKiBhIGN1c3RvbSBlbmNvZGluZyBiZWNhdXNlIGVuY29kZVVSSUNvbXBvbmVudCBpcyB0b28gYWdncmVzc2l2ZSBhbmQgZW5jb2RlcyBzdHVmZiB0aGF0IGRvZXNuJ3RcbiAqIGhhdmUgdG8gYmUgZW5jb2RlZCBwZXIgaHR0cHM6Ly91cmwuc3BlYy53aGF0d2cub3JnLlxuICovXG5mdW5jdGlvbiBlbmNvZGVVcmlTdHJpbmcoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChzKVxuICAgICAgLnJlcGxhY2UoLyU0MC9nLCAnQCcpXG4gICAgICAucmVwbGFjZSgvJTNBL2dpLCAnOicpXG4gICAgICAucmVwbGFjZSgvJTI0L2csICckJylcbiAgICAgIC5yZXBsYWNlKC8lMkMvZ2ksICcsJyk7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgdXNlZCB0byBlbmNvZGUgYm90aCBrZXlzIGFuZCB2YWx1ZXMgaW4gYSBxdWVyeSBzdHJpbmcga2V5L3ZhbHVlLiBJblxuICogdGhlIGZvbGxvd2luZyBVUkwsIHlvdSBuZWVkIHRvIGNhbGwgZW5jb2RlVXJpUXVlcnkgb24gXCJrXCIgYW5kIFwidlwiOlxuICpcbiAqIGh0dHA6Ly93d3cuc2l0ZS5vcmcvaHRtbDttaz1tdj9rPXYjZlxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5jb2RlVXJpUXVlcnkoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVuY29kZVVyaVN0cmluZyhzKS5yZXBsYWNlKC8lM0IvZ2ksICc7Jyk7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgdXNlZCB0byBlbmNvZGUgYSBVUkwgZnJhZ21lbnQuIEluIHRoZSBmb2xsb3dpbmcgVVJMLCB5b3UgbmVlZCB0byBjYWxsXG4gKiBlbmNvZGVVcmlGcmFnbWVudCBvbiBcImZcIjpcbiAqXG4gKiBodHRwOi8vd3d3LnNpdGUub3JnL2h0bWw7bWs9bXY/az12I2ZcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuY29kZVVyaUZyYWdtZW50KHM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBlbmNvZGVVUkkocyk7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgcnVuIG9uIGFueSBVUkkgc2VnbWVudCBhcyB3ZWxsIGFzIHRoZSBrZXkgYW5kIHZhbHVlIGluIGEga2V5L3ZhbHVlXG4gKiBwYWlyIGZvciBtYXRyaXggcGFyYW1zLiBJbiB0aGUgZm9sbG93aW5nIFVSTCwgeW91IG5lZWQgdG8gY2FsbCBlbmNvZGVVcmlTZWdtZW50IG9uIFwiaHRtbFwiLFxuICogXCJta1wiLCBhbmQgXCJtdlwiOlxuICpcbiAqIGh0dHA6Ly93d3cuc2l0ZS5vcmcvaHRtbDttaz1tdj9rPXYjZlxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5jb2RlVXJpU2VnbWVudChzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZW5jb2RlVXJpU3RyaW5nKHMpLnJlcGxhY2UoL1xcKC9nLCAnJTI4JykucmVwbGFjZSgvXFwpL2csICclMjknKS5yZXBsYWNlKC8lMjYvZ2ksICcmJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWNvZGUoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzKTtcbn1cblxuLy8gUXVlcnkga2V5cy92YWx1ZXMgc2hvdWxkIGhhdmUgdGhlIFwiK1wiIHJlcGxhY2VkIGZpcnN0LCBhcyBcIitcIiBpbiBhIHF1ZXJ5IHN0cmluZyBpcyBcIiBcIi5cbi8vIGRlY29kZVVSSUNvbXBvbmVudCBmdW5jdGlvbiB3aWxsIG5vdCBkZWNvZGUgXCIrXCIgYXMgYSBzcGFjZS5cbmV4cG9ydCBmdW5jdGlvbiBkZWNvZGVRdWVyeShzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZGVjb2RlKHMucmVwbGFjZSgvXFwrL2csICclMjAnKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVQYXRoKHBhdGg6IFVybFNlZ21lbnQpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7ZW5jb2RlVXJpU2VnbWVudChwYXRoLnBhdGgpfSR7c2VyaWFsaXplTWF0cml4UGFyYW1zKHBhdGgucGFyYW1ldGVycyl9YDtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplTWF0cml4UGFyYW1zKHBhcmFtczoge1trZXk6IHN0cmluZ106IHN0cmluZ30pOiBzdHJpbmcge1xuICByZXR1cm4gT2JqZWN0LmtleXMocGFyYW1zKVxuICAgICAgLm1hcChrZXkgPT4gYDske2VuY29kZVVyaVNlZ21lbnQoa2V5KX09JHtlbmNvZGVVcmlTZWdtZW50KHBhcmFtc1trZXldKX1gKVxuICAgICAgLmpvaW4oJycpO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVRdWVyeVBhcmFtcyhwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBhbnl9KTogc3RyaW5nIHtcbiAgY29uc3Qgc3RyUGFyYW1zOiBzdHJpbmdbXSA9XG4gICAgICBPYmplY3Qua2V5cyhwYXJhbXMpXG4gICAgICAgICAgLm1hcCgobmFtZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBwYXJhbXNbbmFtZV07XG4gICAgICAgICAgICByZXR1cm4gQXJyYXkuaXNBcnJheSh2YWx1ZSkgP1xuICAgICAgICAgICAgICAgIHZhbHVlLm1hcCh2ID0+IGAke2VuY29kZVVyaVF1ZXJ5KG5hbWUpfT0ke2VuY29kZVVyaVF1ZXJ5KHYpfWApLmpvaW4oJyYnKSA6XG4gICAgICAgICAgICAgICAgYCR7ZW5jb2RlVXJpUXVlcnkobmFtZSl9PSR7ZW5jb2RlVXJpUXVlcnkodmFsdWUpfWA7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZmlsdGVyKHMgPT4gISFzKTtcblxuICByZXR1cm4gc3RyUGFyYW1zLmxlbmd0aCA/IGA/JHtzdHJQYXJhbXMuam9pbignJicpfWAgOiAnJztcbn1cblxuY29uc3QgU0VHTUVOVF9SRSA9IC9eW15cXC8oKT87PSNdKy87XG5mdW5jdGlvbiBtYXRjaFNlZ21lbnRzKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbWF0Y2ggPSBzdHIubWF0Y2goU0VHTUVOVF9SRSk7XG4gIHJldHVybiBtYXRjaCA/IG1hdGNoWzBdIDogJyc7XG59XG5cbmNvbnN0IFFVRVJZX1BBUkFNX1JFID0gL15bXj0/JiNdKy87XG4vLyBSZXR1cm4gdGhlIG5hbWUgb2YgdGhlIHF1ZXJ5IHBhcmFtIGF0IHRoZSBzdGFydCBvZiB0aGUgc3RyaW5nIG9yIGFuIGVtcHR5IHN0cmluZ1xuZnVuY3Rpb24gbWF0Y2hRdWVyeVBhcmFtcyhzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IG1hdGNoID0gc3RyLm1hdGNoKFFVRVJZX1BBUkFNX1JFKTtcbiAgcmV0dXJuIG1hdGNoID8gbWF0Y2hbMF0gOiAnJztcbn1cblxuY29uc3QgUVVFUllfUEFSQU1fVkFMVUVfUkUgPSAvXlteJiNdKy87XG4vLyBSZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBxdWVyeSBwYXJhbSBhdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmluZyBvciBhbiBlbXB0eSBzdHJpbmdcbmZ1bmN0aW9uIG1hdGNoVXJsUXVlcnlQYXJhbVZhbHVlKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbWF0Y2ggPSBzdHIubWF0Y2goUVVFUllfUEFSQU1fVkFMVUVfUkUpO1xuICByZXR1cm4gbWF0Y2ggPyBtYXRjaFswXSA6ICcnO1xufVxuXG5jbGFzcyBVcmxQYXJzZXIge1xuICBwcml2YXRlIHJlbWFpbmluZzogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdXJsOiBzdHJpbmcpIHtcbiAgICB0aGlzLnJlbWFpbmluZyA9IHVybDtcbiAgfVxuXG4gIHBhcnNlUm9vdFNlZ21lbnQoKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgICB0aGlzLmNvbnN1bWVPcHRpb25hbCgnLycpO1xuXG4gICAgaWYgKHRoaXMucmVtYWluaW5nID09PSAnJyB8fCB0aGlzLnBlZWtTdGFydHNXaXRoKCc/JykgfHwgdGhpcy5wZWVrU3RhcnRzV2l0aCgnIycpKSB7XG4gICAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pO1xuICAgIH1cblxuICAgIC8vIFRoZSByb290IHNlZ21lbnQgZ3JvdXAgbmV2ZXIgaGFzIHNlZ21lbnRzXG4gICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHRoaXMucGFyc2VDaGlsZHJlbigpKTtcbiAgfVxuXG4gIHBhcnNlUXVlcnlQYXJhbXMoKTogUGFyYW1zIHtcbiAgICBjb25zdCBwYXJhbXM6IFBhcmFtcyA9IHt9O1xuICAgIGlmICh0aGlzLmNvbnN1bWVPcHRpb25hbCgnPycpKSB7XG4gICAgICBkbyB7XG4gICAgICAgIHRoaXMucGFyc2VRdWVyeVBhcmFtKHBhcmFtcyk7XG4gICAgICB9IHdoaWxlICh0aGlzLmNvbnN1bWVPcHRpb25hbCgnJicpKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcztcbiAgfVxuXG4gIHBhcnNlRnJhZ21lbnQoKTogc3RyaW5nfG51bGwge1xuICAgIHJldHVybiB0aGlzLmNvbnN1bWVPcHRpb25hbCgnIycpID8gZGVjb2RlVVJJQ29tcG9uZW50KHRoaXMucmVtYWluaW5nKSA6IG51bGw7XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQ2hpbGRyZW4oKToge1tvdXRsZXQ6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0ge1xuICAgIGlmICh0aGlzLnJlbWFpbmluZyA9PT0gJycpIHtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICB0aGlzLmNvbnN1bWVPcHRpb25hbCgnLycpO1xuXG4gICAgY29uc3Qgc2VnbWVudHM6IFVybFNlZ21lbnRbXSA9IFtdO1xuICAgIGlmICghdGhpcy5wZWVrU3RhcnRzV2l0aCgnKCcpKSB7XG4gICAgICBzZWdtZW50cy5wdXNoKHRoaXMucGFyc2VTZWdtZW50KCkpO1xuICAgIH1cblxuICAgIHdoaWxlICh0aGlzLnBlZWtTdGFydHNXaXRoKCcvJykgJiYgIXRoaXMucGVla1N0YXJ0c1dpdGgoJy8vJykgJiYgIXRoaXMucGVla1N0YXJ0c1dpdGgoJy8oJykpIHtcbiAgICAgIHRoaXMuY2FwdHVyZSgnLycpO1xuICAgICAgc2VnbWVudHMucHVzaCh0aGlzLnBhcnNlU2VnbWVudCgpKTtcbiAgICB9XG5cbiAgICBsZXQgY2hpbGRyZW46IHtbb3V0bGV0OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJy8oJykpIHtcbiAgICAgIHRoaXMuY2FwdHVyZSgnLycpO1xuICAgICAgY2hpbGRyZW4gPSB0aGlzLnBhcnNlUGFyZW5zKHRydWUpO1xuICAgIH1cblxuICAgIGxldCByZXM6IHtbb3V0bGV0OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJygnKSkge1xuICAgICAgcmVzID0gdGhpcy5wYXJzZVBhcmVucyhmYWxzZSk7XG4gICAgfVxuXG4gICAgaWYgKHNlZ21lbnRzLmxlbmd0aCA+IDAgfHwgT2JqZWN0LmtleXMoY2hpbGRyZW4pLmxlbmd0aCA+IDApIHtcbiAgICAgIHJlc1tQUklNQVJZX09VVExFVF0gPSBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRzLCBjaGlsZHJlbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIC8vIHBhcnNlIGEgc2VnbWVudCB3aXRoIGl0cyBtYXRyaXggcGFyYW1ldGVyc1xuICAvLyBpZSBgbmFtZTtrMT12MTtrMmBcbiAgcHJpdmF0ZSBwYXJzZVNlZ21lbnQoKTogVXJsU2VnbWVudCB7XG4gICAgY29uc3QgcGF0aCA9IG1hdGNoU2VnbWVudHModGhpcy5yZW1haW5pbmcpO1xuICAgIGlmIChwYXRoID09PSAnJyAmJiB0aGlzLnBlZWtTdGFydHNXaXRoKCc7JykpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5FTVBUWV9QQVRIX1dJVEhfUEFSQU1TLFxuICAgICAgICAgIE5HX0RFVl9NT0RFICYmIGBFbXB0eSBwYXRoIHVybCBzZWdtZW50IGNhbm5vdCBoYXZlIHBhcmFtZXRlcnM6ICcke3RoaXMucmVtYWluaW5nfScuYCk7XG4gICAgfVxuXG4gICAgdGhpcy5jYXB0dXJlKHBhdGgpO1xuICAgIHJldHVybiBuZXcgVXJsU2VnbWVudChkZWNvZGUocGF0aCksIHRoaXMucGFyc2VNYXRyaXhQYXJhbXMoKSk7XG4gIH1cblxuICBwcml2YXRlIHBhcnNlTWF0cml4UGFyYW1zKCk6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9IHtcbiAgICBjb25zdCBwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG4gICAgd2hpbGUgKHRoaXMuY29uc3VtZU9wdGlvbmFsKCc7JykpIHtcbiAgICAgIHRoaXMucGFyc2VQYXJhbShwYXJhbXMpO1xuICAgIH1cbiAgICByZXR1cm4gcGFyYW1zO1xuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZVBhcmFtKHBhcmFtczoge1trZXk6IHN0cmluZ106IHN0cmluZ30pOiB2b2lkIHtcbiAgICBjb25zdCBrZXkgPSBtYXRjaFNlZ21lbnRzKHRoaXMucmVtYWluaW5nKTtcbiAgICBpZiAoIWtleSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmNhcHR1cmUoa2V5KTtcbiAgICBsZXQgdmFsdWU6IGFueSA9ICcnO1xuICAgIGlmICh0aGlzLmNvbnN1bWVPcHRpb25hbCgnPScpKSB7XG4gICAgICBjb25zdCB2YWx1ZU1hdGNoID0gbWF0Y2hTZWdtZW50cyh0aGlzLnJlbWFpbmluZyk7XG4gICAgICBpZiAodmFsdWVNYXRjaCkge1xuICAgICAgICB2YWx1ZSA9IHZhbHVlTWF0Y2g7XG4gICAgICAgIHRoaXMuY2FwdHVyZSh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcGFyYW1zW2RlY29kZShrZXkpXSA9IGRlY29kZSh2YWx1ZSk7XG4gIH1cblxuICAvLyBQYXJzZSBhIHNpbmdsZSBxdWVyeSBwYXJhbWV0ZXIgYG5hbWVbPXZhbHVlXWBcbiAgcHJpdmF0ZSBwYXJzZVF1ZXJ5UGFyYW0ocGFyYW1zOiBQYXJhbXMpOiB2b2lkIHtcbiAgICBjb25zdCBrZXkgPSBtYXRjaFF1ZXJ5UGFyYW1zKHRoaXMucmVtYWluaW5nKTtcbiAgICBpZiAoIWtleSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmNhcHR1cmUoa2V5KTtcbiAgICBsZXQgdmFsdWU6IGFueSA9ICcnO1xuICAgIGlmICh0aGlzLmNvbnN1bWVPcHRpb25hbCgnPScpKSB7XG4gICAgICBjb25zdCB2YWx1ZU1hdGNoID0gbWF0Y2hVcmxRdWVyeVBhcmFtVmFsdWUodGhpcy5yZW1haW5pbmcpO1xuICAgICAgaWYgKHZhbHVlTWF0Y2gpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZU1hdGNoO1xuICAgICAgICB0aGlzLmNhcHR1cmUodmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGRlY29kZWRLZXkgPSBkZWNvZGVRdWVyeShrZXkpO1xuICAgIGNvbnN0IGRlY29kZWRWYWwgPSBkZWNvZGVRdWVyeSh2YWx1ZSk7XG5cbiAgICBpZiAocGFyYW1zLmhhc093blByb3BlcnR5KGRlY29kZWRLZXkpKSB7XG4gICAgICAvLyBBcHBlbmQgdG8gZXhpc3RpbmcgdmFsdWVzXG4gICAgICBsZXQgY3VycmVudFZhbCA9IHBhcmFtc1tkZWNvZGVkS2V5XTtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShjdXJyZW50VmFsKSkge1xuICAgICAgICBjdXJyZW50VmFsID0gW2N1cnJlbnRWYWxdO1xuICAgICAgICBwYXJhbXNbZGVjb2RlZEtleV0gPSBjdXJyZW50VmFsO1xuICAgICAgfVxuICAgICAgY3VycmVudFZhbC5wdXNoKGRlY29kZWRWYWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDcmVhdGUgYSBuZXcgdmFsdWVcbiAgICAgIHBhcmFtc1tkZWNvZGVkS2V5XSA9IGRlY29kZWRWYWw7XG4gICAgfVxuICB9XG5cbiAgLy8gcGFyc2UgYChhL2IvL291dGxldF9uYW1lOmMvZClgXG4gIHByaXZhdGUgcGFyc2VQYXJlbnMoYWxsb3dQcmltYXJ5OiBib29sZWFuKToge1tvdXRsZXQ6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0ge1xuICAgIGNvbnN0IHNlZ21lbnRzOiB7W2tleTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICAgIHRoaXMuY2FwdHVyZSgnKCcpO1xuXG4gICAgd2hpbGUgKCF0aGlzLmNvbnN1bWVPcHRpb25hbCgnKScpICYmIHRoaXMucmVtYWluaW5nLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHBhdGggPSBtYXRjaFNlZ21lbnRzKHRoaXMucmVtYWluaW5nKTtcblxuICAgICAgY29uc3QgbmV4dCA9IHRoaXMucmVtYWluaW5nW3BhdGgubGVuZ3RoXTtcblxuICAgICAgLy8gaWYgaXMgaXMgbm90IG9uZSBvZiB0aGVzZSBjaGFyYWN0ZXJzLCB0aGVuIHRoZSBzZWdtZW50IHdhcyB1bmVzY2FwZWRcbiAgICAgIC8vIG9yIHRoZSBncm91cCB3YXMgbm90IGNsb3NlZFxuICAgICAgaWYgKG5leHQgIT09ICcvJyAmJiBuZXh0ICE9PSAnKScgJiYgbmV4dCAhPT0gJzsnKSB7XG4gICAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLlVOUEFSU0FCTEVfVVJMLCBOR19ERVZfTU9ERSAmJiBgQ2Fubm90IHBhcnNlIHVybCAnJHt0aGlzLnVybH0nYCk7XG4gICAgICB9XG5cbiAgICAgIGxldCBvdXRsZXROYW1lOiBzdHJpbmcgPSB1bmRlZmluZWQhO1xuICAgICAgaWYgKHBhdGguaW5kZXhPZignOicpID4gLTEpIHtcbiAgICAgICAgb3V0bGV0TmFtZSA9IHBhdGguc2xpY2UoMCwgcGF0aC5pbmRleE9mKCc6JykpO1xuICAgICAgICB0aGlzLmNhcHR1cmUob3V0bGV0TmFtZSk7XG4gICAgICAgIHRoaXMuY2FwdHVyZSgnOicpO1xuICAgICAgfSBlbHNlIGlmIChhbGxvd1ByaW1hcnkpIHtcbiAgICAgICAgb3V0bGV0TmFtZSA9IFBSSU1BUllfT1VUTEVUO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjaGlsZHJlbiA9IHRoaXMucGFyc2VDaGlsZHJlbigpO1xuICAgICAgc2VnbWVudHNbb3V0bGV0TmFtZV0gPSBPYmplY3Qua2V5cyhjaGlsZHJlbikubGVuZ3RoID09PSAxID8gY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIGNoaWxkcmVuKTtcbiAgICAgIHRoaXMuY29uc3VtZU9wdGlvbmFsKCcvLycpO1xuICAgIH1cblxuICAgIHJldHVybiBzZWdtZW50cztcbiAgfVxuXG4gIHByaXZhdGUgcGVla1N0YXJ0c1dpdGgoc3RyOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5yZW1haW5pbmcuc3RhcnRzV2l0aChzdHIpO1xuICB9XG5cbiAgLy8gQ29uc3VtZXMgdGhlIHByZWZpeCB3aGVuIGl0IGlzIHByZXNlbnQgYW5kIHJldHVybnMgd2hldGhlciBpdCBoYXMgYmVlbiBjb25zdW1lZFxuICBwcml2YXRlIGNvbnN1bWVPcHRpb25hbChzdHI6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLnBlZWtTdGFydHNXaXRoKHN0cikpIHtcbiAgICAgIHRoaXMucmVtYWluaW5nID0gdGhpcy5yZW1haW5pbmcuc3Vic3RyaW5nKHN0ci5sZW5ndGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgY2FwdHVyZShzdHI6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICghdGhpcy5jb25zdW1lT3B0aW9uYWwoc3RyKSkge1xuICAgICAgdGhyb3cgbmV3IFJ1bnRpbWVFcnJvcihcbiAgICAgICAgICBSdW50aW1lRXJyb3JDb2RlLlVORVhQRUNURURfVkFMVUVfSU5fVVJMLCBOR19ERVZfTU9ERSAmJiBgRXhwZWN0ZWQgXCIke3N0cn1cIi5gKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJvb3Qocm9vdENhbmRpZGF0ZTogVXJsU2VnbWVudEdyb3VwKSB7XG4gIHJldHVybiByb290Q2FuZGlkYXRlLnNlZ21lbnRzLmxlbmd0aCA+IDAgP1xuICAgICAgbmV3IFVybFNlZ21lbnRHcm91cChbXSwge1tQUklNQVJZX09VVExFVF06IHJvb3RDYW5kaWRhdGV9KSA6XG4gICAgICByb290Q2FuZGlkYXRlO1xufVxuXG4vKipcbiAqIFJlY3Vyc2l2ZWx5IG1lcmdlcyBwcmltYXJ5IHNlZ21lbnQgY2hpbGRyZW4gaW50byB0aGVpciBwYXJlbnRzIGFuZCBhbHNvIGRyb3BzIGVtcHR5IGNoaWxkcmVuXG4gKiAodGhvc2Ugd2hpY2ggaGF2ZSBubyBzZWdtZW50cyBhbmQgbm8gY2hpbGRyZW4gdGhlbXNlbHZlcykuIFRoZSBsYXR0ZXIgcHJldmVudHMgc2VyaWFsaXppbmcgYVxuICogZ3JvdXAgaW50byBzb21ldGhpbmcgbGlrZSBgL2EoYXV4OilgLCB3aGVyZSBgYXV4YCBpcyBhbiBlbXB0eSBjaGlsZCBzZWdtZW50LlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3F1YXNoU2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cDogVXJsU2VnbWVudEdyb3VwKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgY29uc3QgbmV3Q2hpbGRyZW46IFJlY29yZDxzdHJpbmcsIFVybFNlZ21lbnRHcm91cD4gPSB7fTtcbiAgZm9yIChjb25zdCBjaGlsZE91dGxldCBvZiBPYmplY3Qua2V5cyhzZWdtZW50R3JvdXAuY2hpbGRyZW4pKSB7XG4gICAgY29uc3QgY2hpbGQgPSBzZWdtZW50R3JvdXAuY2hpbGRyZW5bY2hpbGRPdXRsZXRdO1xuICAgIGNvbnN0IGNoaWxkQ2FuZGlkYXRlID0gc3F1YXNoU2VnbWVudEdyb3VwKGNoaWxkKTtcbiAgICAvLyBkb24ndCBhZGQgZW1wdHkgY2hpbGRyZW5cbiAgICBpZiAoY2hpbGRDYW5kaWRhdGUuc2VnbWVudHMubGVuZ3RoID4gMCB8fCBjaGlsZENhbmRpZGF0ZS5oYXNDaGlsZHJlbigpKSB7XG4gICAgICBuZXdDaGlsZHJlbltjaGlsZE91dGxldF0gPSBjaGlsZENhbmRpZGF0ZTtcbiAgICB9XG4gIH1cbiAgY29uc3QgcyA9IG5ldyBVcmxTZWdtZW50R3JvdXAoc2VnbWVudEdyb3VwLnNlZ21lbnRzLCBuZXdDaGlsZHJlbik7XG4gIHJldHVybiBtZXJnZVRyaXZpYWxDaGlsZHJlbihzKTtcbn1cblxuLyoqXG4gKiBXaGVuIHBvc3NpYmxlLCBtZXJnZXMgdGhlIHByaW1hcnkgb3V0bGV0IGNoaWxkIGludG8gdGhlIHBhcmVudCBgVXJsU2VnbWVudEdyb3VwYC5cbiAqXG4gKiBXaGVuIGEgc2VnbWVudCBncm91cCBoYXMgb25seSBvbmUgY2hpbGQgd2hpY2ggaXMgYSBwcmltYXJ5IG91dGxldCwgbWVyZ2VzIHRoYXQgY2hpbGQgaW50byB0aGVcbiAqIHBhcmVudC4gVGhhdCBpcywgdGhlIGNoaWxkIHNlZ21lbnQgZ3JvdXAncyBzZWdtZW50cyBhcmUgbWVyZ2VkIGludG8gdGhlIGBzYCBhbmQgdGhlIGNoaWxkJ3NcbiAqIGNoaWxkcmVuIGJlY29tZSB0aGUgY2hpbGRyZW4gb2YgYHNgLiBUaGluayBvZiB0aGlzIGxpa2UgYSAnc3F1YXNoJywgbWVyZ2luZyB0aGUgY2hpbGQgc2VnbWVudFxuICogZ3JvdXAgaW50byB0aGUgcGFyZW50LlxuICovXG5mdW5jdGlvbiBtZXJnZVRyaXZpYWxDaGlsZHJlbihzOiBVcmxTZWdtZW50R3JvdXApOiBVcmxTZWdtZW50R3JvdXAge1xuICBpZiAocy5udW1iZXJPZkNoaWxkcmVuID09PSAxICYmIHMuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdKSB7XG4gICAgY29uc3QgYyA9IHMuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdO1xuICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKHMuc2VnbWVudHMuY29uY2F0KGMuc2VnbWVudHMpLCBjLmNoaWxkcmVuKTtcbiAgfVxuXG4gIHJldHVybiBzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNVcmxUcmVlKHY6IGFueSk6IHYgaXMgVXJsVHJlZSB7XG4gIHJldHVybiB2IGluc3RhbmNlb2YgVXJsVHJlZTtcbn1cbiJdfQ==