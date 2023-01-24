/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Injectable, ɵRuntimeError as RuntimeError } from '@angular/core';
import { convertToParamMap, PRIMARY_OUTLET } from './shared';
import { equalArraysOrString, forEach, shallowEqual } from './utils/collection';
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
        forEach(children, (v, k) => v.parent = this);
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
}
UrlSerializer.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.2.0-next.1+sha-0ad0136", ngImport: i0, type: UrlSerializer, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
UrlSerializer.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "15.2.0-next.1+sha-0ad0136", ngImport: i0, type: UrlSerializer, providedIn: 'root', useFactory: () => new DefaultUrlSerializer() });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.2.0-next.1+sha-0ad0136", ngImport: i0, type: UrlSerializer, decorators: [{
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
        forEach(segment.children, (v, k) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsX3RyZWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3VybF90cmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxVQUFVLEVBQUUsYUFBYSxJQUFJLFlBQVksRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUd4RSxPQUFPLEVBQUMsaUJBQWlCLEVBQW9CLGNBQWMsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3RSxPQUFPLEVBQUMsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBQyxNQUFNLG9CQUFvQixDQUFDOztBQUU5RSxNQUFNLFdBQVcsR0FBRyxPQUFPLFNBQVMsS0FBSyxXQUFXLElBQUksU0FBUyxDQUFDO0FBeURsRSxNQUFNLGNBQWMsR0FBeUQ7SUFDM0UsT0FBTyxFQUFFLGtCQUFrQjtJQUMzQixRQUFRLEVBQUUsb0JBQW9CO0NBQy9CLENBQUM7QUFDRixNQUFNLGVBQWUsR0FBOEM7SUFDakUsT0FBTyxFQUFFLFdBQVc7SUFDcEIsUUFBUSxFQUFFLGNBQWM7SUFDeEIsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUk7Q0FDdEIsQ0FBQztBQUVGLE1BQU0sVUFBVSxZQUFZLENBQ3hCLFNBQWtCLEVBQUUsU0FBa0IsRUFBRSxPQUE2QjtJQUN2RSxPQUFPLGNBQWMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUM7UUFDdEYsZUFBZSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUM7UUFDbEYsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxJQUFJLFNBQVMsQ0FBQyxRQUFRLEtBQUssU0FBUyxDQUFDLFFBQVEs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LGdCQUFnQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFO1FBQzFELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDckMsT0FBTyxJQUFJLGVBQWUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ3ZFO0lBRUQsT0FBTyxDQUFDLENBQUM7QUFDWCxDQUFDO0FBRUQsTUFBTSxVQUFVLFNBQVMsQ0FBQyxDQUFNO0lBQzlCLE9BQU8sQ0FBQyxZQUFZLE9BQU8sQ0FBQztBQUM5QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7SW5qZWN0YWJsZSwgybVSdW50aW1lRXJyb3IgYXMgUnVudGltZUVycm9yfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHtSdW50aW1lRXJyb3JDb2RlfSBmcm9tICcuL2Vycm9ycyc7XG5pbXBvcnQge2NvbnZlcnRUb1BhcmFtTWFwLCBQYXJhbU1hcCwgUGFyYW1zLCBQUklNQVJZX09VVExFVH0gZnJvbSAnLi9zaGFyZWQnO1xuaW1wb3J0IHtlcXVhbEFycmF5c09yU3RyaW5nLCBmb3JFYWNoLCBzaGFsbG93RXF1YWx9IGZyb20gJy4vdXRpbHMvY29sbGVjdGlvbic7XG5cbmNvbnN0IE5HX0RFVl9NT0RFID0gdHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlO1xuXG4vKipcbiAqIEEgc2V0IG9mIG9wdGlvbnMgd2hpY2ggc3BlY2lmeSBob3cgdG8gZGV0ZXJtaW5lIGlmIGEgYFVybFRyZWVgIGlzIGFjdGl2ZSwgZ2l2ZW4gdGhlIGBVcmxUcmVlYFxuICogZm9yIHRoZSBjdXJyZW50IHJvdXRlciBzdGF0ZS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKiBAc2VlIFJvdXRlci5pc0FjdGl2ZVxuICovXG5leHBvcnQgaW50ZXJmYWNlIElzQWN0aXZlTWF0Y2hPcHRpb25zIHtcbiAgLyoqXG4gICAqIERlZmluZXMgdGhlIHN0cmF0ZWd5IGZvciBjb21wYXJpbmcgdGhlIG1hdHJpeCBwYXJhbWV0ZXJzIG9mIHR3byBgVXJsVHJlZWBzLlxuICAgKlxuICAgKiBUaGUgbWF0cml4IHBhcmFtZXRlciBtYXRjaGluZyBpcyBkZXBlbmRlbnQgb24gdGhlIHN0cmF0ZWd5IGZvciBtYXRjaGluZyB0aGVcbiAgICogc2VnbWVudHMuIFRoYXQgaXMsIGlmIHRoZSBgcGF0aHNgIG9wdGlvbiBpcyBzZXQgdG8gYCdzdWJzZXQnYCwgb25seVxuICAgKiB0aGUgbWF0cml4IHBhcmFtZXRlcnMgb2YgdGhlIG1hdGNoaW5nIHNlZ21lbnRzIHdpbGwgYmUgY29tcGFyZWQuXG4gICAqXG4gICAqIC0gYCdleGFjdCdgOiBSZXF1aXJlcyB0aGF0IG1hdGNoaW5nIHNlZ21lbnRzIGFsc28gaGF2ZSBleGFjdCBtYXRyaXggcGFyYW1ldGVyXG4gICAqIG1hdGNoZXMuXG4gICAqIC0gYCdzdWJzZXQnYDogVGhlIG1hdGNoaW5nIHNlZ21lbnRzIGluIHRoZSByb3V0ZXIncyBhY3RpdmUgYFVybFRyZWVgIG1heSBjb250YWluXG4gICAqIGV4dHJhIG1hdHJpeCBwYXJhbWV0ZXJzLCBidXQgdGhvc2UgdGhhdCBleGlzdCBpbiB0aGUgYFVybFRyZWVgIGluIHF1ZXN0aW9uIG11c3QgbWF0Y2guXG4gICAqIC0gYCdpZ25vcmVkJ2A6IFdoZW4gY29tcGFyaW5nIGBVcmxUcmVlYHMsIG1hdHJpeCBwYXJhbXMgd2lsbCBiZSBpZ25vcmVkLlxuICAgKi9cbiAgbWF0cml4UGFyYW1zOiAnZXhhY3QnfCdzdWJzZXQnfCdpZ25vcmVkJztcbiAgLyoqXG4gICAqIERlZmluZXMgdGhlIHN0cmF0ZWd5IGZvciBjb21wYXJpbmcgdGhlIHF1ZXJ5IHBhcmFtZXRlcnMgb2YgdHdvIGBVcmxUcmVlYHMuXG4gICAqXG4gICAqIC0gYCdleGFjdCdgOiB0aGUgcXVlcnkgcGFyYW1ldGVycyBtdXN0IG1hdGNoIGV4YWN0bHkuXG4gICAqIC0gYCdzdWJzZXQnYDogdGhlIGFjdGl2ZSBgVXJsVHJlZWAgbWF5IGNvbnRhaW4gZXh0cmEgcGFyYW1ldGVycyxcbiAgICogYnV0IG11c3QgbWF0Y2ggdGhlIGtleSBhbmQgdmFsdWUgb2YgYW55IHRoYXQgZXhpc3QgaW4gdGhlIGBVcmxUcmVlYCBpbiBxdWVzdGlvbi5cbiAgICogLSBgJ2lnbm9yZWQnYDogV2hlbiBjb21wYXJpbmcgYFVybFRyZWVgcywgcXVlcnkgcGFyYW1zIHdpbGwgYmUgaWdub3JlZC5cbiAgICovXG4gIHF1ZXJ5UGFyYW1zOiAnZXhhY3QnfCdzdWJzZXQnfCdpZ25vcmVkJztcbiAgLyoqXG4gICAqIERlZmluZXMgdGhlIHN0cmF0ZWd5IGZvciBjb21wYXJpbmcgdGhlIGBVcmxTZWdtZW50YHMgb2YgdGhlIGBVcmxUcmVlYHMuXG4gICAqXG4gICAqIC0gYCdleGFjdCdgOiBhbGwgc2VnbWVudHMgaW4gZWFjaCBgVXJsVHJlZWAgbXVzdCBtYXRjaC5cbiAgICogLSBgJ3N1YnNldCdgOiBhIGBVcmxUcmVlYCB3aWxsIGJlIGRldGVybWluZWQgdG8gYmUgYWN0aXZlIGlmIGl0XG4gICAqIGlzIGEgc3VidHJlZSBvZiB0aGUgYWN0aXZlIHJvdXRlLiBUaGF0IGlzLCB0aGUgYWN0aXZlIHJvdXRlIG1heSBjb250YWluIGV4dHJhXG4gICAqIHNlZ21lbnRzLCBidXQgbXVzdCBhdCBsZWFzdCBoYXZlIGFsbCB0aGUgc2VnbWVudHMgb2YgdGhlIGBVcmxUcmVlYCBpbiBxdWVzdGlvbi5cbiAgICovXG4gIHBhdGhzOiAnZXhhY3QnfCdzdWJzZXQnO1xuICAvKipcbiAgICogLSBgJ2V4YWN0J2A6IGluZGljYXRlcyB0aGF0IHRoZSBgVXJsVHJlZWAgZnJhZ21lbnRzIG11c3QgYmUgZXF1YWwuXG4gICAqIC0gYCdpZ25vcmVkJ2A6IHRoZSBmcmFnbWVudHMgd2lsbCBub3QgYmUgY29tcGFyZWQgd2hlbiBkZXRlcm1pbmluZyBpZiBhXG4gICAqIGBVcmxUcmVlYCBpcyBhY3RpdmUuXG4gICAqL1xuICBmcmFnbWVudDogJ2V4YWN0J3wnaWdub3JlZCc7XG59XG5cbnR5cGUgUGFyYW1NYXRjaE9wdGlvbnMgPSAnZXhhY3QnfCdzdWJzZXQnfCdpZ25vcmVkJztcblxudHlwZSBQYXRoQ29tcGFyZUZuID1cbiAgICAoY29udGFpbmVyOiBVcmxTZWdtZW50R3JvdXAsIGNvbnRhaW5lZTogVXJsU2VnbWVudEdyb3VwLCBtYXRyaXhQYXJhbXM6IFBhcmFtTWF0Y2hPcHRpb25zKSA9PlxuICAgICAgICBib29sZWFuO1xudHlwZSBQYXJhbUNvbXBhcmVGbiA9IChjb250YWluZXI6IFBhcmFtcywgY29udGFpbmVlOiBQYXJhbXMpID0+IGJvb2xlYW47XG5cbmNvbnN0IHBhdGhDb21wYXJlTWFwOiBSZWNvcmQ8SXNBY3RpdmVNYXRjaE9wdGlvbnNbJ3BhdGhzJ10sIFBhdGhDb21wYXJlRm4+ID0ge1xuICAnZXhhY3QnOiBlcXVhbFNlZ21lbnRHcm91cHMsXG4gICdzdWJzZXQnOiBjb250YWluc1NlZ21lbnRHcm91cCxcbn07XG5jb25zdCBwYXJhbUNvbXBhcmVNYXA6IFJlY29yZDxQYXJhbU1hdGNoT3B0aW9ucywgUGFyYW1Db21wYXJlRm4+ID0ge1xuICAnZXhhY3QnOiBlcXVhbFBhcmFtcyxcbiAgJ3N1YnNldCc6IGNvbnRhaW5zUGFyYW1zLFxuICAnaWdub3JlZCc6ICgpID0+IHRydWUsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gY29udGFpbnNUcmVlKFxuICAgIGNvbnRhaW5lcjogVXJsVHJlZSwgY29udGFpbmVlOiBVcmxUcmVlLCBvcHRpb25zOiBJc0FjdGl2ZU1hdGNoT3B0aW9ucyk6IGJvb2xlYW4ge1xuICByZXR1cm4gcGF0aENvbXBhcmVNYXBbb3B0aW9ucy5wYXRoc10oY29udGFpbmVyLnJvb3QsIGNvbnRhaW5lZS5yb290LCBvcHRpb25zLm1hdHJpeFBhcmFtcykgJiZcbiAgICAgIHBhcmFtQ29tcGFyZU1hcFtvcHRpb25zLnF1ZXJ5UGFyYW1zXShjb250YWluZXIucXVlcnlQYXJhbXMsIGNvbnRhaW5lZS5xdWVyeVBhcmFtcykgJiZcbiAgICAgICEob3B0aW9ucy5mcmFnbWVudCA9PT0gJ2V4YWN0JyAmJiBjb250YWluZXIuZnJhZ21lbnQgIT09IGNvbnRhaW5lZS5mcmFnbWVudCk7XG59XG5cbmZ1bmN0aW9uIGVxdWFsUGFyYW1zKGNvbnRhaW5lcjogUGFyYW1zLCBjb250YWluZWU6IFBhcmFtcyk6IGJvb2xlYW4ge1xuICAvLyBUT0RPOiBUaGlzIGRvZXMgbm90IGhhbmRsZSBhcnJheSBwYXJhbXMgY29ycmVjdGx5LlxuICByZXR1cm4gc2hhbGxvd0VxdWFsKGNvbnRhaW5lciwgY29udGFpbmVlKTtcbn1cblxuZnVuY3Rpb24gZXF1YWxTZWdtZW50R3JvdXBzKFxuICAgIGNvbnRhaW5lcjogVXJsU2VnbWVudEdyb3VwLCBjb250YWluZWU6IFVybFNlZ21lbnRHcm91cCxcbiAgICBtYXRyaXhQYXJhbXM6IFBhcmFtTWF0Y2hPcHRpb25zKTogYm9vbGVhbiB7XG4gIGlmICghZXF1YWxQYXRoKGNvbnRhaW5lci5zZWdtZW50cywgY29udGFpbmVlLnNlZ21lbnRzKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoIW1hdHJpeFBhcmFtc01hdGNoKGNvbnRhaW5lci5zZWdtZW50cywgY29udGFpbmVlLnNlZ21lbnRzLCBtYXRyaXhQYXJhbXMpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChjb250YWluZXIubnVtYmVyT2ZDaGlsZHJlbiAhPT0gY29udGFpbmVlLm51bWJlck9mQ2hpbGRyZW4pIHJldHVybiBmYWxzZTtcbiAgZm9yIChjb25zdCBjIGluIGNvbnRhaW5lZS5jaGlsZHJlbikge1xuICAgIGlmICghY29udGFpbmVyLmNoaWxkcmVuW2NdKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFlcXVhbFNlZ21lbnRHcm91cHMoY29udGFpbmVyLmNoaWxkcmVuW2NdLCBjb250YWluZWUuY2hpbGRyZW5bY10sIG1hdHJpeFBhcmFtcykpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zUGFyYW1zKGNvbnRhaW5lcjogUGFyYW1zLCBjb250YWluZWU6IFBhcmFtcyk6IGJvb2xlYW4ge1xuICByZXR1cm4gT2JqZWN0LmtleXMoY29udGFpbmVlKS5sZW5ndGggPD0gT2JqZWN0LmtleXMoY29udGFpbmVyKS5sZW5ndGggJiZcbiAgICAgIE9iamVjdC5rZXlzKGNvbnRhaW5lZSkuZXZlcnkoa2V5ID0+IGVxdWFsQXJyYXlzT3JTdHJpbmcoY29udGFpbmVyW2tleV0sIGNvbnRhaW5lZVtrZXldKSk7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zU2VnbWVudEdyb3VwKFxuICAgIGNvbnRhaW5lcjogVXJsU2VnbWVudEdyb3VwLCBjb250YWluZWU6IFVybFNlZ21lbnRHcm91cCxcbiAgICBtYXRyaXhQYXJhbXM6IFBhcmFtTWF0Y2hPcHRpb25zKTogYm9vbGVhbiB7XG4gIHJldHVybiBjb250YWluc1NlZ21lbnRHcm91cEhlbHBlcihjb250YWluZXIsIGNvbnRhaW5lZSwgY29udGFpbmVlLnNlZ21lbnRzLCBtYXRyaXhQYXJhbXMpO1xufVxuXG5mdW5jdGlvbiBjb250YWluc1NlZ21lbnRHcm91cEhlbHBlcihcbiAgICBjb250YWluZXI6IFVybFNlZ21lbnRHcm91cCwgY29udGFpbmVlOiBVcmxTZWdtZW50R3JvdXAsIGNvbnRhaW5lZVBhdGhzOiBVcmxTZWdtZW50W10sXG4gICAgbWF0cml4UGFyYW1zOiBQYXJhbU1hdGNoT3B0aW9ucyk6IGJvb2xlYW4ge1xuICBpZiAoY29udGFpbmVyLnNlZ21lbnRzLmxlbmd0aCA+IGNvbnRhaW5lZVBhdGhzLmxlbmd0aCkge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBjb250YWluZXIuc2VnbWVudHMuc2xpY2UoMCwgY29udGFpbmVlUGF0aHMubGVuZ3RoKTtcbiAgICBpZiAoIWVxdWFsUGF0aChjdXJyZW50LCBjb250YWluZWVQYXRocykpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoY29udGFpbmVlLmhhc0NoaWxkcmVuKCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdHJpeFBhcmFtc01hdGNoKGN1cnJlbnQsIGNvbnRhaW5lZVBhdGhzLCBtYXRyaXhQYXJhbXMpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfSBlbHNlIGlmIChjb250YWluZXIuc2VnbWVudHMubGVuZ3RoID09PSBjb250YWluZWVQYXRocy5sZW5ndGgpIHtcbiAgICBpZiAoIWVxdWFsUGF0aChjb250YWluZXIuc2VnbWVudHMsIGNvbnRhaW5lZVBhdGhzKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0cml4UGFyYW1zTWF0Y2goY29udGFpbmVyLnNlZ21lbnRzLCBjb250YWluZWVQYXRocywgbWF0cml4UGFyYW1zKSkgcmV0dXJuIGZhbHNlO1xuICAgIGZvciAoY29uc3QgYyBpbiBjb250YWluZWUuY2hpbGRyZW4pIHtcbiAgICAgIGlmICghY29udGFpbmVyLmNoaWxkcmVuW2NdKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAoIWNvbnRhaW5zU2VnbWVudEdyb3VwKGNvbnRhaW5lci5jaGlsZHJlbltjXSwgY29udGFpbmVlLmNoaWxkcmVuW2NdLCBtYXRyaXhQYXJhbXMpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfSBlbHNlIHtcbiAgICBjb25zdCBjdXJyZW50ID0gY29udGFpbmVlUGF0aHMuc2xpY2UoMCwgY29udGFpbmVyLnNlZ21lbnRzLmxlbmd0aCk7XG4gICAgY29uc3QgbmV4dCA9IGNvbnRhaW5lZVBhdGhzLnNsaWNlKGNvbnRhaW5lci5zZWdtZW50cy5sZW5ndGgpO1xuICAgIGlmICghZXF1YWxQYXRoKGNvbnRhaW5lci5zZWdtZW50cywgY3VycmVudCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdHJpeFBhcmFtc01hdGNoKGNvbnRhaW5lci5zZWdtZW50cywgY3VycmVudCwgbWF0cml4UGFyYW1zKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghY29udGFpbmVyLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiBjb250YWluc1NlZ21lbnRHcm91cEhlbHBlcihcbiAgICAgICAgY29udGFpbmVyLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSwgY29udGFpbmVlLCBuZXh0LCBtYXRyaXhQYXJhbXMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1hdHJpeFBhcmFtc01hdGNoKFxuICAgIGNvbnRhaW5lclBhdGhzOiBVcmxTZWdtZW50W10sIGNvbnRhaW5lZVBhdGhzOiBVcmxTZWdtZW50W10sIG9wdGlvbnM6IFBhcmFtTWF0Y2hPcHRpb25zKSB7XG4gIHJldHVybiBjb250YWluZWVQYXRocy5ldmVyeSgoY29udGFpbmVlU2VnbWVudCwgaSkgPT4ge1xuICAgIHJldHVybiBwYXJhbUNvbXBhcmVNYXBbb3B0aW9uc10oY29udGFpbmVyUGF0aHNbaV0ucGFyYW1ldGVycywgY29udGFpbmVlU2VnbWVudC5wYXJhbWV0ZXJzKTtcbiAgfSk7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgcGFyc2VkIFVSTC5cbiAqXG4gKiBTaW5jZSBhIHJvdXRlciBzdGF0ZSBpcyBhIHRyZWUsIGFuZCB0aGUgVVJMIGlzIG5vdGhpbmcgYnV0IGEgc2VyaWFsaXplZCBzdGF0ZSwgdGhlIFVSTCBpcyBhXG4gKiBzZXJpYWxpemVkIHRyZWUuXG4gKiBVcmxUcmVlIGlzIGEgZGF0YSBzdHJ1Y3R1cmUgdGhhdCBwcm92aWRlcyBhIGxvdCBvZiBhZmZvcmRhbmNlcyBpbiBkZWFsaW5nIHdpdGggVVJMc1xuICpcbiAqIEB1c2FnZU5vdGVzXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYFxuICogQENvbXBvbmVudCh7dGVtcGxhdGVVcmw6J3RlbXBsYXRlLmh0bWwnfSlcbiAqIGNsYXNzIE15Q29tcG9uZW50IHtcbiAqICAgY29uc3RydWN0b3Iocm91dGVyOiBSb3V0ZXIpIHtcbiAqICAgICBjb25zdCB0cmVlOiBVcmxUcmVlID1cbiAqICAgICAgIHJvdXRlci5wYXJzZVVybCgnL3RlYW0vMzMvKHVzZXIvdmljdG9yLy9zdXBwb3J0OmhlbHApP2RlYnVnPXRydWUjZnJhZ21lbnQnKTtcbiAqICAgICBjb25zdCBmID0gdHJlZS5mcmFnbWVudDsgLy8gcmV0dXJuICdmcmFnbWVudCdcbiAqICAgICBjb25zdCBxID0gdHJlZS5xdWVyeVBhcmFtczsgLy8gcmV0dXJucyB7ZGVidWc6ICd0cnVlJ31cbiAqICAgICBjb25zdCBnOiBVcmxTZWdtZW50R3JvdXAgPSB0cmVlLnJvb3QuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdO1xuICogICAgIGNvbnN0IHM6IFVybFNlZ21lbnRbXSA9IGcuc2VnbWVudHM7IC8vIHJldHVybnMgMiBzZWdtZW50cyAndGVhbScgYW5kICczMydcbiAqICAgICBnLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXS5zZWdtZW50czsgLy8gcmV0dXJucyAyIHNlZ21lbnRzICd1c2VyJyBhbmQgJ3ZpY3RvcidcbiAqICAgICBnLmNoaWxkcmVuWydzdXBwb3J0J10uc2VnbWVudHM7IC8vIHJldHVybiAxIHNlZ21lbnQgJ2hlbHAnXG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFVybFRyZWUge1xuICAvKiogQGludGVybmFsICovXG4gIF9xdWVyeVBhcmFtTWFwPzogUGFyYW1NYXA7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogVGhlIHJvb3Qgc2VnbWVudCBncm91cCBvZiB0aGUgVVJMIHRyZWUgKi9cbiAgICAgIHB1YmxpYyByb290OiBVcmxTZWdtZW50R3JvdXAgPSBuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCB7fSksXG4gICAgICAvKiogVGhlIHF1ZXJ5IHBhcmFtcyBvZiB0aGUgVVJMICovXG4gICAgICBwdWJsaWMgcXVlcnlQYXJhbXM6IFBhcmFtcyA9IHt9LFxuICAgICAgLyoqIFRoZSBmcmFnbWVudCBvZiB0aGUgVVJMICovXG4gICAgICBwdWJsaWMgZnJhZ21lbnQ6IHN0cmluZ3xudWxsID0gbnVsbCkge1xuICAgIGlmIChOR19ERVZfTU9ERSkge1xuICAgICAgaWYgKHJvb3Quc2VnbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgICAgUnVudGltZUVycm9yQ29kZS5JTlZBTElEX1JPT1RfVVJMX1NFR01FTlQsXG4gICAgICAgICAgICAnVGhlIHJvb3QgYFVybFNlZ21lbnRHcm91cGAgc2hvdWxkIG5vdCBjb250YWluIGBzZWdtZW50c2AuICcgK1xuICAgICAgICAgICAgICAgICdJbnN0ZWFkLCB0aGVzZSBzZWdtZW50cyBiZWxvbmcgaW4gdGhlIGBjaGlsZHJlbmAgc28gdGhleSBjYW4gYmUgYXNzb2NpYXRlZCB3aXRoIGEgbmFtZWQgb3V0bGV0LicpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldCBxdWVyeVBhcmFtTWFwKCk6IFBhcmFtTWFwIHtcbiAgICBpZiAoIXRoaXMuX3F1ZXJ5UGFyYW1NYXApIHtcbiAgICAgIHRoaXMuX3F1ZXJ5UGFyYW1NYXAgPSBjb252ZXJ0VG9QYXJhbU1hcCh0aGlzLnF1ZXJ5UGFyYW1zKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UGFyYW1NYXA7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBERUZBVUxUX1NFUklBTElaRVIuc2VyaWFsaXplKHRoaXMpO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgcGFyc2VkIFVSTCBzZWdtZW50IGdyb3VwLlxuICpcbiAqIFNlZSBgVXJsVHJlZWAgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgVXJsU2VnbWVudEdyb3VwIHtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfc291cmNlU2VnbWVudD86IFVybFNlZ21lbnRHcm91cDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfc2VnbWVudEluZGV4U2hpZnQ/OiBudW1iZXI7XG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICpcbiAgICogVXNlZCBvbmx5IGluIGRldiBtb2RlIHRvIGRldGVjdCBpZiBhcHBsaWNhdGlvbiByZWxpZXMgb24gYHJlbGF0aXZlTGlua1Jlc29sdXRpb246ICdsZWdhY3knYFxuICAgKiBTaG91bGQgYmUgcmVtb3ZlZCBpbiB3aGVuIGByZWxhdGl2ZUxpbmtSZXNvbHV0aW9uYCBpcyByZW1vdmVkLlxuICAgKi9cbiAgX3NlZ21lbnRJbmRleFNoaWZ0Q29ycmVjdGVkPzogbnVtYmVyO1xuICAvKiogVGhlIHBhcmVudCBub2RlIGluIHRoZSB1cmwgdHJlZSAqL1xuICBwYXJlbnQ6IFVybFNlZ21lbnRHcm91cHxudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBUaGUgVVJMIHNlZ21lbnRzIG9mIHRoaXMgZ3JvdXAuIFNlZSBgVXJsU2VnbWVudGAgZm9yIG1vcmUgaW5mb3JtYXRpb24gKi9cbiAgICAgIHB1YmxpYyBzZWdtZW50czogVXJsU2VnbWVudFtdLFxuICAgICAgLyoqIFRoZSBsaXN0IG9mIGNoaWxkcmVuIG9mIHRoaXMgZ3JvdXAgKi9cbiAgICAgIHB1YmxpYyBjaGlsZHJlbjoge1trZXk6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0pIHtcbiAgICBmb3JFYWNoKGNoaWxkcmVuLCAodjogYW55LCBrOiBhbnkpID0+IHYucGFyZW50ID0gdGhpcyk7XG4gIH1cblxuICAvKiogV2hldGhlciB0aGUgc2VnbWVudCBoYXMgY2hpbGQgc2VnbWVudHMgKi9cbiAgaGFzQ2hpbGRyZW4oKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMubnVtYmVyT2ZDaGlsZHJlbiA+IDA7XG4gIH1cblxuICAvKiogTnVtYmVyIG9mIGNoaWxkIHNlZ21lbnRzICovXG4gIGdldCBudW1iZXJPZkNoaWxkcmVuKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuY2hpbGRyZW4pLmxlbmd0aDtcbiAgfVxuXG4gIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHNlcmlhbGl6ZVBhdGhzKHRoaXMpO1xuICB9XG59XG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIGEgc2luZ2xlIFVSTCBzZWdtZW50LlxuICpcbiAqIEEgVXJsU2VnbWVudCBpcyBhIHBhcnQgb2YgYSBVUkwgYmV0d2VlbiB0aGUgdHdvIHNsYXNoZXMuIEl0IGNvbnRhaW5zIGEgcGF0aCBhbmQgdGhlIG1hdHJpeFxuICogcGFyYW1ldGVycyBhc3NvY2lhdGVkIHdpdGggdGhlIHNlZ21lbnQuXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqwqAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYFxuICogQENvbXBvbmVudCh7dGVtcGxhdGVVcmw6J3RlbXBsYXRlLmh0bWwnfSlcbiAqIGNsYXNzIE15Q29tcG9uZW50IHtcbiAqICAgY29uc3RydWN0b3Iocm91dGVyOiBSb3V0ZXIpIHtcbiAqICAgICBjb25zdCB0cmVlOiBVcmxUcmVlID0gcm91dGVyLnBhcnNlVXJsKCcvdGVhbTtpZD0zMycpO1xuICogICAgIGNvbnN0IGc6IFVybFNlZ21lbnRHcm91cCA9IHRyZWUucm9vdC5jaGlsZHJlbltQUklNQVJZX09VVExFVF07XG4gKiAgICAgY29uc3QgczogVXJsU2VnbWVudFtdID0gZy5zZWdtZW50cztcbiAqICAgICBzWzBdLnBhdGg7IC8vIHJldHVybnMgJ3RlYW0nXG4gKiAgICAgc1swXS5wYXJhbWV0ZXJzOyAvLyByZXR1cm5zIHtpZDogMzN9XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGNsYXNzIFVybFNlZ21lbnQge1xuICAvKiogQGludGVybmFsICovXG4gIF9wYXJhbWV0ZXJNYXA/OiBQYXJhbU1hcDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBUaGUgcGF0aCBwYXJ0IG9mIGEgVVJMIHNlZ21lbnQgKi9cbiAgICAgIHB1YmxpYyBwYXRoOiBzdHJpbmcsXG5cbiAgICAgIC8qKiBUaGUgbWF0cml4IHBhcmFtZXRlcnMgYXNzb2NpYXRlZCB3aXRoIGEgc2VnbWVudCAqL1xuICAgICAgcHVibGljIHBhcmFtZXRlcnM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSkge31cblxuICBnZXQgcGFyYW1ldGVyTWFwKCk6IFBhcmFtTWFwIHtcbiAgICBpZiAoIXRoaXMuX3BhcmFtZXRlck1hcCkge1xuICAgICAgdGhpcy5fcGFyYW1ldGVyTWFwID0gY29udmVydFRvUGFyYW1NYXAodGhpcy5wYXJhbWV0ZXJzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3BhcmFtZXRlck1hcDtcbiAgfVxuXG4gIC8qKiBAZG9jc05vdFJlcXVpcmVkICovXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHNlcmlhbGl6ZVBhdGgodGhpcyk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsU2VnbWVudHMoYXM6IFVybFNlZ21lbnRbXSwgYnM6IFVybFNlZ21lbnRbXSk6IGJvb2xlYW4ge1xuICByZXR1cm4gZXF1YWxQYXRoKGFzLCBicykgJiYgYXMuZXZlcnkoKGEsIGkpID0+IHNoYWxsb3dFcXVhbChhLnBhcmFtZXRlcnMsIGJzW2ldLnBhcmFtZXRlcnMpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsUGF0aChhczogVXJsU2VnbWVudFtdLCBiczogVXJsU2VnbWVudFtdKTogYm9vbGVhbiB7XG4gIGlmIChhcy5sZW5ndGggIT09IGJzLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gYXMuZXZlcnkoKGEsIGkpID0+IGEucGF0aCA9PT0gYnNbaV0ucGF0aCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXBDaGlsZHJlbkludG9BcnJheTxUPihcbiAgICBzZWdtZW50OiBVcmxTZWdtZW50R3JvdXAsIGZuOiAodjogVXJsU2VnbWVudEdyb3VwLCBrOiBzdHJpbmcpID0+IFRbXSk6IFRbXSB7XG4gIGxldCByZXM6IFRbXSA9IFtdO1xuICBmb3JFYWNoKHNlZ21lbnQuY2hpbGRyZW4sIChjaGlsZDogVXJsU2VnbWVudEdyb3VwLCBjaGlsZE91dGxldDogc3RyaW5nKSA9PiB7XG4gICAgaWYgKGNoaWxkT3V0bGV0ID09PSBQUklNQVJZX09VVExFVCkge1xuICAgICAgcmVzID0gcmVzLmNvbmNhdChmbihjaGlsZCwgY2hpbGRPdXRsZXQpKTtcbiAgICB9XG4gIH0pO1xuICBmb3JFYWNoKHNlZ21lbnQuY2hpbGRyZW4sIChjaGlsZDogVXJsU2VnbWVudEdyb3VwLCBjaGlsZE91dGxldDogc3RyaW5nKSA9PiB7XG4gICAgaWYgKGNoaWxkT3V0bGV0ICE9PSBQUklNQVJZX09VVExFVCkge1xuICAgICAgcmVzID0gcmVzLmNvbmNhdChmbihjaGlsZCwgY2hpbGRPdXRsZXQpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gcmVzO1xufVxuXG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogU2VyaWFsaXplcyBhbmQgZGVzZXJpYWxpemVzIGEgVVJMIHN0cmluZyBpbnRvIGEgVVJMIHRyZWUuXG4gKlxuICogVGhlIHVybCBzZXJpYWxpemF0aW9uIHN0cmF0ZWd5IGlzIGN1c3RvbWl6YWJsZS4gWW91IGNhblxuICogbWFrZSBhbGwgVVJMcyBjYXNlIGluc2Vuc2l0aXZlIGJ5IHByb3ZpZGluZyBhIGN1c3RvbSBVcmxTZXJpYWxpemVyLlxuICpcbiAqIFNlZSBgRGVmYXVsdFVybFNlcmlhbGl6ZXJgIGZvciBhbiBleGFtcGxlIG9mIGEgVVJMIHNlcmlhbGl6ZXIuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5ASW5qZWN0YWJsZSh7cHJvdmlkZWRJbjogJ3Jvb3QnLCB1c2VGYWN0b3J5OiAoKSA9PiBuZXcgRGVmYXVsdFVybFNlcmlhbGl6ZXIoKX0pXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgVXJsU2VyaWFsaXplciB7XG4gIC8qKiBQYXJzZSBhIHVybCBpbnRvIGEgYFVybFRyZWVgICovXG4gIGFic3RyYWN0IHBhcnNlKHVybDogc3RyaW5nKTogVXJsVHJlZTtcblxuICAvKiogQ29udmVydHMgYSBgVXJsVHJlZWAgaW50byBhIHVybCAqL1xuICBhYnN0cmFjdCBzZXJpYWxpemUodHJlZTogVXJsVHJlZSk6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBBIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gb2YgdGhlIGBVcmxTZXJpYWxpemVyYC5cbiAqXG4gKiBFeGFtcGxlIFVSTHM6XG4gKlxuICogYGBgXG4gKiAvaW5ib3gvMzMocG9wdXA6Y29tcG9zZSlcbiAqIC9pbmJveC8zMztvcGVuPXRydWUvbWVzc2FnZXMvNDRcbiAqIGBgYFxuICpcbiAqIERlZmF1bHRVcmxTZXJpYWxpemVyIHVzZXMgcGFyZW50aGVzZXMgdG8gc2VyaWFsaXplIHNlY29uZGFyeSBzZWdtZW50cyAoZS5nLiwgcG9wdXA6Y29tcG9zZSksIHRoZVxuICogY29sb24gc3ludGF4IHRvIHNwZWNpZnkgdGhlIG91dGxldCwgYW5kIHRoZSAnO3BhcmFtZXRlcj12YWx1ZScgc3ludGF4IChlLmcuLCBvcGVuPXRydWUpIHRvXG4gKiBzcGVjaWZ5IHJvdXRlIHNwZWNpZmljIHBhcmFtZXRlcnMuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgRGVmYXVsdFVybFNlcmlhbGl6ZXIgaW1wbGVtZW50cyBVcmxTZXJpYWxpemVyIHtcbiAgLyoqIFBhcnNlcyBhIHVybCBpbnRvIGEgYFVybFRyZWVgICovXG4gIHBhcnNlKHVybDogc3RyaW5nKTogVXJsVHJlZSB7XG4gICAgY29uc3QgcCA9IG5ldyBVcmxQYXJzZXIodXJsKTtcbiAgICByZXR1cm4gbmV3IFVybFRyZWUocC5wYXJzZVJvb3RTZWdtZW50KCksIHAucGFyc2VRdWVyeVBhcmFtcygpLCBwLnBhcnNlRnJhZ21lbnQoKSk7XG4gIH1cblxuICAvKiogQ29udmVydHMgYSBgVXJsVHJlZWAgaW50byBhIHVybCAqL1xuICBzZXJpYWxpemUodHJlZTogVXJsVHJlZSk6IHN0cmluZyB7XG4gICAgY29uc3Qgc2VnbWVudCA9IGAvJHtzZXJpYWxpemVTZWdtZW50KHRyZWUucm9vdCwgdHJ1ZSl9YDtcbiAgICBjb25zdCBxdWVyeSA9IHNlcmlhbGl6ZVF1ZXJ5UGFyYW1zKHRyZWUucXVlcnlQYXJhbXMpO1xuICAgIGNvbnN0IGZyYWdtZW50ID1cbiAgICAgICAgdHlwZW9mIHRyZWUuZnJhZ21lbnQgPT09IGBzdHJpbmdgID8gYCMke2VuY29kZVVyaUZyYWdtZW50KHRyZWUuZnJhZ21lbnQpfWAgOiAnJztcblxuICAgIHJldHVybiBgJHtzZWdtZW50fSR7cXVlcnl9JHtmcmFnbWVudH1gO1xuICB9XG59XG5cbmNvbnN0IERFRkFVTFRfU0VSSUFMSVpFUiA9IG5ldyBEZWZhdWx0VXJsU2VyaWFsaXplcigpO1xuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplUGF0aHMoc2VnbWVudDogVXJsU2VnbWVudEdyb3VwKTogc3RyaW5nIHtcbiAgcmV0dXJuIHNlZ21lbnQuc2VnbWVudHMubWFwKHAgPT4gc2VyaWFsaXplUGF0aChwKSkuam9pbignLycpO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVTZWdtZW50KHNlZ21lbnQ6IFVybFNlZ21lbnRHcm91cCwgcm9vdDogYm9vbGVhbik6IHN0cmluZyB7XG4gIGlmICghc2VnbWVudC5oYXNDaGlsZHJlbigpKSB7XG4gICAgcmV0dXJuIHNlcmlhbGl6ZVBhdGhzKHNlZ21lbnQpO1xuICB9XG5cbiAgaWYgKHJvb3QpIHtcbiAgICBjb25zdCBwcmltYXJ5ID0gc2VnbWVudC5jaGlsZHJlbltQUklNQVJZX09VVExFVF0gP1xuICAgICAgICBzZXJpYWxpemVTZWdtZW50KHNlZ21lbnQuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdLCBmYWxzZSkgOlxuICAgICAgICAnJztcbiAgICBjb25zdCBjaGlsZHJlbjogc3RyaW5nW10gPSBbXTtcblxuICAgIGZvckVhY2goc2VnbWVudC5jaGlsZHJlbiwgKHY6IFVybFNlZ21lbnRHcm91cCwgazogc3RyaW5nKSA9PiB7XG4gICAgICBpZiAoayAhPT0gUFJJTUFSWV9PVVRMRVQpIHtcbiAgICAgICAgY2hpbGRyZW4ucHVzaChgJHtrfToke3NlcmlhbGl6ZVNlZ21lbnQodiwgZmFsc2UpfWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNoaWxkcmVuLmxlbmd0aCA+IDAgPyBgJHtwcmltYXJ5fSgke2NoaWxkcmVuLmpvaW4oJy8vJyl9KWAgOiBwcmltYXJ5O1xuXG4gIH0gZWxzZSB7XG4gICAgY29uc3QgY2hpbGRyZW4gPSBtYXBDaGlsZHJlbkludG9BcnJheShzZWdtZW50LCAodjogVXJsU2VnbWVudEdyb3VwLCBrOiBzdHJpbmcpID0+IHtcbiAgICAgIGlmIChrID09PSBQUklNQVJZX09VVExFVCkge1xuICAgICAgICByZXR1cm4gW3NlcmlhbGl6ZVNlZ21lbnQoc2VnbWVudC5jaGlsZHJlbltQUklNQVJZX09VVExFVF0sIGZhbHNlKV07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBbYCR7a306JHtzZXJpYWxpemVTZWdtZW50KHYsIGZhbHNlKX1gXTtcbiAgICB9KTtcblxuICAgIC8vIHVzZSBubyBwYXJlbnRoZXNpcyBpZiB0aGUgb25seSBjaGlsZCBpcyBhIHByaW1hcnkgb3V0bGV0IHJvdXRlXG4gICAgaWYgKE9iamVjdC5rZXlzKHNlZ21lbnQuY2hpbGRyZW4pLmxlbmd0aCA9PT0gMSAmJiBzZWdtZW50LmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gYCR7c2VyaWFsaXplUGF0aHMoc2VnbWVudCl9LyR7Y2hpbGRyZW5bMF19YDtcbiAgICB9XG5cbiAgICByZXR1cm4gYCR7c2VyaWFsaXplUGF0aHMoc2VnbWVudCl9Lygke2NoaWxkcmVuLmpvaW4oJy8vJyl9KWA7XG4gIH1cbn1cblxuLyoqXG4gKiBFbmNvZGVzIGEgVVJJIHN0cmluZyB3aXRoIHRoZSBkZWZhdWx0IGVuY29kaW5nLiBUaGlzIGZ1bmN0aW9uIHdpbGwgb25seSBldmVyIGJlIGNhbGxlZCBmcm9tXG4gKiBgZW5jb2RlVXJpUXVlcnlgIG9yIGBlbmNvZGVVcmlTZWdtZW50YCBhcyBpdCdzIHRoZSBiYXNlIHNldCBvZiBlbmNvZGluZ3MgdG8gYmUgdXNlZC4gV2UgbmVlZFxuICogYSBjdXN0b20gZW5jb2RpbmcgYmVjYXVzZSBlbmNvZGVVUklDb21wb25lbnQgaXMgdG9vIGFnZ3Jlc3NpdmUgYW5kIGVuY29kZXMgc3R1ZmYgdGhhdCBkb2Vzbid0XG4gKiBoYXZlIHRvIGJlIGVuY29kZWQgcGVyIGh0dHBzOi8vdXJsLnNwZWMud2hhdHdnLm9yZy5cbiAqL1xuZnVuY3Rpb24gZW5jb2RlVXJpU3RyaW5nKHM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQocylcbiAgICAgIC5yZXBsYWNlKC8lNDAvZywgJ0AnKVxuICAgICAgLnJlcGxhY2UoLyUzQS9naSwgJzonKVxuICAgICAgLnJlcGxhY2UoLyUyNC9nLCAnJCcpXG4gICAgICAucmVwbGFjZSgvJTJDL2dpLCAnLCcpO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gc2hvdWxkIGJlIHVzZWQgdG8gZW5jb2RlIGJvdGgga2V5cyBhbmQgdmFsdWVzIGluIGEgcXVlcnkgc3RyaW5nIGtleS92YWx1ZS4gSW5cbiAqIHRoZSBmb2xsb3dpbmcgVVJMLCB5b3UgbmVlZCB0byBjYWxsIGVuY29kZVVyaVF1ZXJ5IG9uIFwia1wiIGFuZCBcInZcIjpcbiAqXG4gKiBodHRwOi8vd3d3LnNpdGUub3JnL2h0bWw7bWs9bXY/az12I2ZcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuY29kZVVyaVF1ZXJ5KHM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBlbmNvZGVVcmlTdHJpbmcocykucmVwbGFjZSgvJTNCL2dpLCAnOycpO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gc2hvdWxkIGJlIHVzZWQgdG8gZW5jb2RlIGEgVVJMIGZyYWdtZW50LiBJbiB0aGUgZm9sbG93aW5nIFVSTCwgeW91IG5lZWQgdG8gY2FsbFxuICogZW5jb2RlVXJpRnJhZ21lbnQgb24gXCJmXCI6XG4gKlxuICogaHR0cDovL3d3dy5zaXRlLm9yZy9odG1sO21rPW12P2s9diNmXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbmNvZGVVcmlGcmFnbWVudChzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZW5jb2RlVVJJKHMpO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gc2hvdWxkIGJlIHJ1biBvbiBhbnkgVVJJIHNlZ21lbnQgYXMgd2VsbCBhcyB0aGUga2V5IGFuZCB2YWx1ZSBpbiBhIGtleS92YWx1ZVxuICogcGFpciBmb3IgbWF0cml4IHBhcmFtcy4gSW4gdGhlIGZvbGxvd2luZyBVUkwsIHlvdSBuZWVkIHRvIGNhbGwgZW5jb2RlVXJpU2VnbWVudCBvbiBcImh0bWxcIixcbiAqIFwibWtcIiwgYW5kIFwibXZcIjpcbiAqXG4gKiBodHRwOi8vd3d3LnNpdGUub3JnL2h0bWw7bWs9bXY/az12I2ZcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuY29kZVVyaVNlZ21lbnQoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVuY29kZVVyaVN0cmluZyhzKS5yZXBsYWNlKC9cXCgvZywgJyUyOCcpLnJlcGxhY2UoL1xcKS9nLCAnJTI5JykucmVwbGFjZSgvJTI2L2dpLCAnJicpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVjb2RlKHM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQocyk7XG59XG5cbi8vIFF1ZXJ5IGtleXMvdmFsdWVzIHNob3VsZCBoYXZlIHRoZSBcIitcIiByZXBsYWNlZCBmaXJzdCwgYXMgXCIrXCIgaW4gYSBxdWVyeSBzdHJpbmcgaXMgXCIgXCIuXG4vLyBkZWNvZGVVUklDb21wb25lbnQgZnVuY3Rpb24gd2lsbCBub3QgZGVjb2RlIFwiK1wiIGFzIGEgc3BhY2UuXG5leHBvcnQgZnVuY3Rpb24gZGVjb2RlUXVlcnkoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGRlY29kZShzLnJlcGxhY2UoL1xcKy9nLCAnJTIwJykpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplUGF0aChwYXRoOiBVcmxTZWdtZW50KTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2VuY29kZVVyaVNlZ21lbnQocGF0aC5wYXRoKX0ke3NlcmlhbGl6ZU1hdHJpeFBhcmFtcyhwYXRoLnBhcmFtZXRlcnMpfWA7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZU1hdHJpeFBhcmFtcyhwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KTogc3RyaW5nIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKHBhcmFtcylcbiAgICAgIC5tYXAoa2V5ID0+IGA7JHtlbmNvZGVVcmlTZWdtZW50KGtleSl9PSR7ZW5jb2RlVXJpU2VnbWVudChwYXJhbXNba2V5XSl9YClcbiAgICAgIC5qb2luKCcnKTtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplUXVlcnlQYXJhbXMocGFyYW1zOiB7W2tleTogc3RyaW5nXTogYW55fSk6IHN0cmluZyB7XG4gIGNvbnN0IHN0clBhcmFtczogc3RyaW5nW10gPVxuICAgICAgT2JqZWN0LmtleXMocGFyYW1zKVxuICAgICAgICAgIC5tYXAoKG5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gcGFyYW1zW25hbWVdO1xuICAgICAgICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsdWUpID9cbiAgICAgICAgICAgICAgICB2YWx1ZS5tYXAodiA9PiBgJHtlbmNvZGVVcmlRdWVyeShuYW1lKX09JHtlbmNvZGVVcmlRdWVyeSh2KX1gKS5qb2luKCcmJykgOlxuICAgICAgICAgICAgICAgIGAke2VuY29kZVVyaVF1ZXJ5KG5hbWUpfT0ke2VuY29kZVVyaVF1ZXJ5KHZhbHVlKX1gO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmZpbHRlcihzID0+ICEhcyk7XG5cbiAgcmV0dXJuIHN0clBhcmFtcy5sZW5ndGggPyBgPyR7c3RyUGFyYW1zLmpvaW4oJyYnKX1gIDogJyc7XG59XG5cbmNvbnN0IFNFR01FTlRfUkUgPSAvXlteXFwvKCk/Oz0jXSsvO1xuZnVuY3Rpb24gbWF0Y2hTZWdtZW50cyhzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IG1hdGNoID0gc3RyLm1hdGNoKFNFR01FTlRfUkUpO1xuICByZXR1cm4gbWF0Y2ggPyBtYXRjaFswXSA6ICcnO1xufVxuXG5jb25zdCBRVUVSWV9QQVJBTV9SRSA9IC9eW149PyYjXSsvO1xuLy8gUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBxdWVyeSBwYXJhbSBhdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmluZyBvciBhbiBlbXB0eSBzdHJpbmdcbmZ1bmN0aW9uIG1hdGNoUXVlcnlQYXJhbXMoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBtYXRjaCA9IHN0ci5tYXRjaChRVUVSWV9QQVJBTV9SRSk7XG4gIHJldHVybiBtYXRjaCA/IG1hdGNoWzBdIDogJyc7XG59XG5cbmNvbnN0IFFVRVJZX1BBUkFNX1ZBTFVFX1JFID0gL15bXiYjXSsvO1xuLy8gUmV0dXJuIHRoZSB2YWx1ZSBvZiB0aGUgcXVlcnkgcGFyYW0gYXQgdGhlIHN0YXJ0IG9mIHRoZSBzdHJpbmcgb3IgYW4gZW1wdHkgc3RyaW5nXG5mdW5jdGlvbiBtYXRjaFVybFF1ZXJ5UGFyYW1WYWx1ZShzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IG1hdGNoID0gc3RyLm1hdGNoKFFVRVJZX1BBUkFNX1ZBTFVFX1JFKTtcbiAgcmV0dXJuIG1hdGNoID8gbWF0Y2hbMF0gOiAnJztcbn1cblxuY2xhc3MgVXJsUGFyc2VyIHtcbiAgcHJpdmF0ZSByZW1haW5pbmc6IHN0cmluZztcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHVybDogc3RyaW5nKSB7XG4gICAgdGhpcy5yZW1haW5pbmcgPSB1cmw7XG4gIH1cblxuICBwYXJzZVJvb3RTZWdtZW50KCk6IFVybFNlZ21lbnRHcm91cCB7XG4gICAgdGhpcy5jb25zdW1lT3B0aW9uYWwoJy8nKTtcblxuICAgIGlmICh0aGlzLnJlbWFpbmluZyA9PT0gJycgfHwgdGhpcy5wZWVrU3RhcnRzV2l0aCgnPycpIHx8IHRoaXMucGVla1N0YXJ0c1dpdGgoJyMnKSkge1xuICAgICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHt9KTtcbiAgICB9XG5cbiAgICAvLyBUaGUgcm9vdCBzZWdtZW50IGdyb3VwIG5ldmVyIGhhcyBzZWdtZW50c1xuICAgIHJldHVybiBuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCB0aGlzLnBhcnNlQ2hpbGRyZW4oKSk7XG4gIH1cblxuICBwYXJzZVF1ZXJ5UGFyYW1zKCk6IFBhcmFtcyB7XG4gICAgY29uc3QgcGFyYW1zOiBQYXJhbXMgPSB7fTtcbiAgICBpZiAodGhpcy5jb25zdW1lT3B0aW9uYWwoJz8nKSkge1xuICAgICAgZG8ge1xuICAgICAgICB0aGlzLnBhcnNlUXVlcnlQYXJhbShwYXJhbXMpO1xuICAgICAgfSB3aGlsZSAodGhpcy5jb25zdW1lT3B0aW9uYWwoJyYnKSk7XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXM7XG4gIH1cblxuICBwYXJzZUZyYWdtZW50KCk6IHN0cmluZ3xudWxsIHtcbiAgICByZXR1cm4gdGhpcy5jb25zdW1lT3B0aW9uYWwoJyMnKSA/IGRlY29kZVVSSUNvbXBvbmVudCh0aGlzLnJlbWFpbmluZykgOiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUNoaWxkcmVuKCk6IHtbb3V0bGV0OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9IHtcbiAgICBpZiAodGhpcy5yZW1haW5pbmcgPT09ICcnKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgdGhpcy5jb25zdW1lT3B0aW9uYWwoJy8nKTtcblxuICAgIGNvbnN0IHNlZ21lbnRzOiBVcmxTZWdtZW50W10gPSBbXTtcbiAgICBpZiAoIXRoaXMucGVla1N0YXJ0c1dpdGgoJygnKSkge1xuICAgICAgc2VnbWVudHMucHVzaCh0aGlzLnBhcnNlU2VnbWVudCgpKTtcbiAgICB9XG5cbiAgICB3aGlsZSAodGhpcy5wZWVrU3RhcnRzV2l0aCgnLycpICYmICF0aGlzLnBlZWtTdGFydHNXaXRoKCcvLycpICYmICF0aGlzLnBlZWtTdGFydHNXaXRoKCcvKCcpKSB7XG4gICAgICB0aGlzLmNhcHR1cmUoJy8nKTtcbiAgICAgIHNlZ21lbnRzLnB1c2godGhpcy5wYXJzZVNlZ21lbnQoKSk7XG4gICAgfVxuXG4gICAgbGV0IGNoaWxkcmVuOiB7W291dGxldDogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICAgIGlmICh0aGlzLnBlZWtTdGFydHNXaXRoKCcvKCcpKSB7XG4gICAgICB0aGlzLmNhcHR1cmUoJy8nKTtcbiAgICAgIGNoaWxkcmVuID0gdGhpcy5wYXJzZVBhcmVucyh0cnVlKTtcbiAgICB9XG5cbiAgICBsZXQgcmVzOiB7W291dGxldDogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSA9IHt9O1xuICAgIGlmICh0aGlzLnBlZWtTdGFydHNXaXRoKCcoJykpIHtcbiAgICAgIHJlcyA9IHRoaXMucGFyc2VQYXJlbnMoZmFsc2UpO1xuICAgIH1cblxuICAgIGlmIChzZWdtZW50cy5sZW5ndGggPiAwIHx8IE9iamVjdC5rZXlzKGNoaWxkcmVuKS5sZW5ndGggPiAwKSB7XG4gICAgICByZXNbUFJJTUFSWV9PVVRMRVRdID0gbmV3IFVybFNlZ21lbnRHcm91cChzZWdtZW50cywgY2hpbGRyZW4pO1xuICAgIH1cblxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICAvLyBwYXJzZSBhIHNlZ21lbnQgd2l0aCBpdHMgbWF0cml4IHBhcmFtZXRlcnNcbiAgLy8gaWUgYG5hbWU7azE9djE7azJgXG4gIHByaXZhdGUgcGFyc2VTZWdtZW50KCk6IFVybFNlZ21lbnQge1xuICAgIGNvbnN0IHBhdGggPSBtYXRjaFNlZ21lbnRzKHRoaXMucmVtYWluaW5nKTtcbiAgICBpZiAocGF0aCA9PT0gJycgJiYgdGhpcy5wZWVrU3RhcnRzV2l0aCgnOycpKSB7XG4gICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgIFJ1bnRpbWVFcnJvckNvZGUuRU1QVFlfUEFUSF9XSVRIX1BBUkFNUyxcbiAgICAgICAgICBOR19ERVZfTU9ERSAmJiBgRW1wdHkgcGF0aCB1cmwgc2VnbWVudCBjYW5ub3QgaGF2ZSBwYXJhbWV0ZXJzOiAnJHt0aGlzLnJlbWFpbmluZ30nLmApO1xuICAgIH1cblxuICAgIHRoaXMuY2FwdHVyZShwYXRoKTtcbiAgICByZXR1cm4gbmV3IFVybFNlZ21lbnQoZGVjb2RlKHBhdGgpLCB0aGlzLnBhcnNlTWF0cml4UGFyYW1zKCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZU1hdHJpeFBhcmFtcygpOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSB7XG4gICAgY29uc3QgcGFyYW1zOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICAgIHdoaWxlICh0aGlzLmNvbnN1bWVPcHRpb25hbCgnOycpKSB7XG4gICAgICB0aGlzLnBhcnNlUGFyYW0ocGFyYW1zKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcztcbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VQYXJhbShwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KTogdm9pZCB7XG4gICAgY29uc3Qga2V5ID0gbWF0Y2hTZWdtZW50cyh0aGlzLnJlbWFpbmluZyk7XG4gICAgaWYgKCFrZXkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5jYXB0dXJlKGtleSk7XG4gICAgbGV0IHZhbHVlOiBhbnkgPSAnJztcbiAgICBpZiAodGhpcy5jb25zdW1lT3B0aW9uYWwoJz0nKSkge1xuICAgICAgY29uc3QgdmFsdWVNYXRjaCA9IG1hdGNoU2VnbWVudHModGhpcy5yZW1haW5pbmcpO1xuICAgICAgaWYgKHZhbHVlTWF0Y2gpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZU1hdGNoO1xuICAgICAgICB0aGlzLmNhcHR1cmUodmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHBhcmFtc1tkZWNvZGUoa2V5KV0gPSBkZWNvZGUodmFsdWUpO1xuICB9XG5cbiAgLy8gUGFyc2UgYSBzaW5nbGUgcXVlcnkgcGFyYW1ldGVyIGBuYW1lWz12YWx1ZV1gXG4gIHByaXZhdGUgcGFyc2VRdWVyeVBhcmFtKHBhcmFtczogUGFyYW1zKTogdm9pZCB7XG4gICAgY29uc3Qga2V5ID0gbWF0Y2hRdWVyeVBhcmFtcyh0aGlzLnJlbWFpbmluZyk7XG4gICAgaWYgKCFrZXkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5jYXB0dXJlKGtleSk7XG4gICAgbGV0IHZhbHVlOiBhbnkgPSAnJztcbiAgICBpZiAodGhpcy5jb25zdW1lT3B0aW9uYWwoJz0nKSkge1xuICAgICAgY29uc3QgdmFsdWVNYXRjaCA9IG1hdGNoVXJsUXVlcnlQYXJhbVZhbHVlKHRoaXMucmVtYWluaW5nKTtcbiAgICAgIGlmICh2YWx1ZU1hdGNoKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWVNYXRjaDtcbiAgICAgICAgdGhpcy5jYXB0dXJlKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBkZWNvZGVkS2V5ID0gZGVjb2RlUXVlcnkoa2V5KTtcbiAgICBjb25zdCBkZWNvZGVkVmFsID0gZGVjb2RlUXVlcnkodmFsdWUpO1xuXG4gICAgaWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShkZWNvZGVkS2V5KSkge1xuICAgICAgLy8gQXBwZW5kIHRvIGV4aXN0aW5nIHZhbHVlc1xuICAgICAgbGV0IGN1cnJlbnRWYWwgPSBwYXJhbXNbZGVjb2RlZEtleV07XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkoY3VycmVudFZhbCkpIHtcbiAgICAgICAgY3VycmVudFZhbCA9IFtjdXJyZW50VmFsXTtcbiAgICAgICAgcGFyYW1zW2RlY29kZWRLZXldID0gY3VycmVudFZhbDtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnRWYWwucHVzaChkZWNvZGVkVmFsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQ3JlYXRlIGEgbmV3IHZhbHVlXG4gICAgICBwYXJhbXNbZGVjb2RlZEtleV0gPSBkZWNvZGVkVmFsO1xuICAgIH1cbiAgfVxuXG4gIC8vIHBhcnNlIGAoYS9iLy9vdXRsZXRfbmFtZTpjL2QpYFxuICBwcml2YXRlIHBhcnNlUGFyZW5zKGFsbG93UHJpbWFyeTogYm9vbGVhbik6IHtbb3V0bGV0OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9IHtcbiAgICBjb25zdCBzZWdtZW50czoge1trZXk6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0gPSB7fTtcbiAgICB0aGlzLmNhcHR1cmUoJygnKTtcblxuICAgIHdoaWxlICghdGhpcy5jb25zdW1lT3B0aW9uYWwoJyknKSAmJiB0aGlzLnJlbWFpbmluZy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBwYXRoID0gbWF0Y2hTZWdtZW50cyh0aGlzLnJlbWFpbmluZyk7XG5cbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnJlbWFpbmluZ1twYXRoLmxlbmd0aF07XG5cbiAgICAgIC8vIGlmIGlzIGlzIG5vdCBvbmUgb2YgdGhlc2UgY2hhcmFjdGVycywgdGhlbiB0aGUgc2VnbWVudCB3YXMgdW5lc2NhcGVkXG4gICAgICAvLyBvciB0aGUgZ3JvdXAgd2FzIG5vdCBjbG9zZWRcbiAgICAgIGlmIChuZXh0ICE9PSAnLycgJiYgbmV4dCAhPT0gJyknICYmIG5leHQgIT09ICc7Jykge1xuICAgICAgICB0aHJvdyBuZXcgUnVudGltZUVycm9yKFxuICAgICAgICAgICAgUnVudGltZUVycm9yQ29kZS5VTlBBUlNBQkxFX1VSTCwgTkdfREVWX01PREUgJiYgYENhbm5vdCBwYXJzZSB1cmwgJyR7dGhpcy51cmx9J2ApO1xuICAgICAgfVxuXG4gICAgICBsZXQgb3V0bGV0TmFtZTogc3RyaW5nID0gdW5kZWZpbmVkITtcbiAgICAgIGlmIChwYXRoLmluZGV4T2YoJzonKSA+IC0xKSB7XG4gICAgICAgIG91dGxldE5hbWUgPSBwYXRoLnNsaWNlKDAsIHBhdGguaW5kZXhPZignOicpKTtcbiAgICAgICAgdGhpcy5jYXB0dXJlKG91dGxldE5hbWUpO1xuICAgICAgICB0aGlzLmNhcHR1cmUoJzonKTtcbiAgICAgIH0gZWxzZSBpZiAoYWxsb3dQcmltYXJ5KSB7XG4gICAgICAgIG91dGxldE5hbWUgPSBQUklNQVJZX09VVExFVDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY2hpbGRyZW4gPSB0aGlzLnBhcnNlQ2hpbGRyZW4oKTtcbiAgICAgIHNlZ21lbnRzW291dGxldE5hbWVdID0gT2JqZWN0LmtleXMoY2hpbGRyZW4pLmxlbmd0aCA9PT0gMSA/IGNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgVXJsU2VnbWVudEdyb3VwKFtdLCBjaGlsZHJlbik7XG4gICAgICB0aGlzLmNvbnN1bWVPcHRpb25hbCgnLy8nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2VnbWVudHM7XG4gIH1cblxuICBwcml2YXRlIHBlZWtTdGFydHNXaXRoKHN0cjogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMucmVtYWluaW5nLnN0YXJ0c1dpdGgoc3RyKTtcbiAgfVxuXG4gIC8vIENvbnN1bWVzIHRoZSBwcmVmaXggd2hlbiBpdCBpcyBwcmVzZW50IGFuZCByZXR1cm5zIHdoZXRoZXIgaXQgaGFzIGJlZW4gY29uc3VtZWRcbiAgcHJpdmF0ZSBjb25zdW1lT3B0aW9uYWwoc3RyOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5wZWVrU3RhcnRzV2l0aChzdHIpKSB7XG4gICAgICB0aGlzLnJlbWFpbmluZyA9IHRoaXMucmVtYWluaW5nLnN1YnN0cmluZyhzdHIubGVuZ3RoKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIGNhcHR1cmUoc3RyOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY29uc3VtZU9wdGlvbmFsKHN0cikpIHtcbiAgICAgIHRocm93IG5ldyBSdW50aW1lRXJyb3IoXG4gICAgICAgICAgUnVudGltZUVycm9yQ29kZS5VTkVYUEVDVEVEX1ZBTFVFX0lOX1VSTCwgTkdfREVWX01PREUgJiYgYEV4cGVjdGVkIFwiJHtzdHJ9XCIuYCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSb290KHJvb3RDYW5kaWRhdGU6IFVybFNlZ21lbnRHcm91cCkge1xuICByZXR1cm4gcm9vdENhbmRpZGF0ZS5zZWdtZW50cy5sZW5ndGggPiAwID9cbiAgICAgIG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHtbUFJJTUFSWV9PVVRMRVRdOiByb290Q2FuZGlkYXRlfSkgOlxuICAgICAgcm9vdENhbmRpZGF0ZTtcbn1cblxuLyoqXG4gKiBSZWN1cnNpdmVseSBtZXJnZXMgcHJpbWFyeSBzZWdtZW50IGNoaWxkcmVuIGludG8gdGhlaXIgcGFyZW50cyBhbmQgYWxzbyBkcm9wcyBlbXB0eSBjaGlsZHJlblxuICogKHRob3NlIHdoaWNoIGhhdmUgbm8gc2VnbWVudHMgYW5kIG5vIGNoaWxkcmVuIHRoZW1zZWx2ZXMpLiBUaGUgbGF0dGVyIHByZXZlbnRzIHNlcmlhbGl6aW5nIGFcbiAqIGdyb3VwIGludG8gc29tZXRoaW5nIGxpa2UgYC9hKGF1eDopYCwgd2hlcmUgYGF1eGAgaXMgYW4gZW1wdHkgY2hpbGQgc2VnbWVudC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNxdWFzaFNlZ21lbnRHcm91cChzZWdtZW50R3JvdXA6IFVybFNlZ21lbnRHcm91cCk6IFVybFNlZ21lbnRHcm91cCB7XG4gIGNvbnN0IG5ld0NoaWxkcmVuOiBSZWNvcmQ8c3RyaW5nLCBVcmxTZWdtZW50R3JvdXA+ID0ge307XG4gIGZvciAoY29uc3QgY2hpbGRPdXRsZXQgb2YgT2JqZWN0LmtleXMoc2VnbWVudEdyb3VwLmNoaWxkcmVuKSkge1xuICAgIGNvbnN0IGNoaWxkID0gc2VnbWVudEdyb3VwLmNoaWxkcmVuW2NoaWxkT3V0bGV0XTtcbiAgICBjb25zdCBjaGlsZENhbmRpZGF0ZSA9IHNxdWFzaFNlZ21lbnRHcm91cChjaGlsZCk7XG4gICAgLy8gZG9uJ3QgYWRkIGVtcHR5IGNoaWxkcmVuXG4gICAgaWYgKGNoaWxkQ2FuZGlkYXRlLnNlZ21lbnRzLmxlbmd0aCA+IDAgfHwgY2hpbGRDYW5kaWRhdGUuaGFzQ2hpbGRyZW4oKSkge1xuICAgICAgbmV3Q2hpbGRyZW5bY2hpbGRPdXRsZXRdID0gY2hpbGRDYW5kaWRhdGU7XG4gICAgfVxuICB9XG4gIGNvbnN0IHMgPSBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRHcm91cC5zZWdtZW50cywgbmV3Q2hpbGRyZW4pO1xuICByZXR1cm4gbWVyZ2VUcml2aWFsQ2hpbGRyZW4ocyk7XG59XG5cbi8qKlxuICogV2hlbiBwb3NzaWJsZSwgbWVyZ2VzIHRoZSBwcmltYXJ5IG91dGxldCBjaGlsZCBpbnRvIHRoZSBwYXJlbnQgYFVybFNlZ21lbnRHcm91cGAuXG4gKlxuICogV2hlbiBhIHNlZ21lbnQgZ3JvdXAgaGFzIG9ubHkgb25lIGNoaWxkIHdoaWNoIGlzIGEgcHJpbWFyeSBvdXRsZXQsIG1lcmdlcyB0aGF0IGNoaWxkIGludG8gdGhlXG4gKiBwYXJlbnQuIFRoYXQgaXMsIHRoZSBjaGlsZCBzZWdtZW50IGdyb3VwJ3Mgc2VnbWVudHMgYXJlIG1lcmdlZCBpbnRvIHRoZSBgc2AgYW5kIHRoZSBjaGlsZCdzXG4gKiBjaGlsZHJlbiBiZWNvbWUgdGhlIGNoaWxkcmVuIG9mIGBzYC4gVGhpbmsgb2YgdGhpcyBsaWtlIGEgJ3NxdWFzaCcsIG1lcmdpbmcgdGhlIGNoaWxkIHNlZ21lbnRcbiAqIGdyb3VwIGludG8gdGhlIHBhcmVudC5cbiAqL1xuZnVuY3Rpb24gbWVyZ2VUcml2aWFsQ2hpbGRyZW4oczogVXJsU2VnbWVudEdyb3VwKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgaWYgKHMubnVtYmVyT2ZDaGlsZHJlbiA9PT0gMSAmJiBzLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSkge1xuICAgIGNvbnN0IGMgPSBzLmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXTtcbiAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChzLnNlZ21lbnRzLmNvbmNhdChjLnNlZ21lbnRzKSwgYy5jaGlsZHJlbik7XG4gIH1cblxuICByZXR1cm4gcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVXJsVHJlZSh2OiBhbnkpOiB2IGlzIFVybFRyZWUge1xuICByZXR1cm4gdiBpbnN0YW5jZW9mIFVybFRyZWU7XG59XG4iXX0=