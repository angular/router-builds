/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { convertToParamMap, PRIMARY_OUTLET } from './shared';
import { equalArraysOrString, forEach, shallowEqual } from './utils/collection';
export function createEmptyUrlTree() {
    return new UrlTree(new UrlSegmentGroup([], {}), {}, null);
}
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
    /** @internal */
    constructor(
    /** The root segment group of the URL tree */
    root, 
    /** The query params of the URL */
    queryParams, 
    /** The fragment of the URL */
    fragment) {
        this.root = root;
        this.queryParams = queryParams;
        this.fragment = fragment;
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
            throw new Error(`Empty path url segment cannot have parameters: '${this.remaining}'.`);
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
                throw new Error(`Cannot parse url '${this.url}'`);
            }
            let outletName = undefined;
            if (path.indexOf(':') > -1) {
                outletName = path.substr(0, path.indexOf(':'));
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
            throw new Error(`Expected "${str}".`);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsX3RyZWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9yb3V0ZXIvc3JjL3VybF90cmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxpQkFBaUIsRUFBb0IsY0FBYyxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQzdFLE9BQU8sRUFBQyxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFDLE1BQU0sb0JBQW9CLENBQUM7QUFFOUUsTUFBTSxVQUFVLGtCQUFrQjtJQUNoQyxPQUFPLElBQUksT0FBTyxDQUFDLElBQUksZUFBZSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDNUQsQ0FBQztBQXlERCxNQUFNLGNBQWMsR0FBeUQ7SUFDM0UsT0FBTyxFQUFFLGtCQUFrQjtJQUMzQixRQUFRLEVBQUUsb0JBQW9CO0NBQy9CLENBQUM7QUFDRixNQUFNLGVBQWUsR0FBOEM7SUFDakUsT0FBTyxFQUFFLFdBQVc7SUFDcEIsUUFBUSxFQUFFLGNBQWM7SUFDeEIsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUk7Q0FDdEIsQ0FBQztBQUVGLE1BQU0sVUFBVSxZQUFZLENBQ3hCLFNBQWtCLEVBQUUsU0FBa0IsRUFBRSxPQUE2QjtJQUN2RSxPQUFPLGNBQWMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUM7UUFDdEYsZUFBZSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUM7UUFDbEYsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxJQUFJLFNBQVMsQ0FBQyxRQUFRLEtBQUssU0FBUyxDQUFD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LElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztnQkFDMUIsSUFBSSxlQUFlLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzlGLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDNUI7UUFFRCxPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0lBRU8sY0FBYyxDQUFDLEdBQVc7UUFDaEMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsa0ZBQWtGO0lBQzFFLGVBQWUsQ0FBQyxHQUFXO1FBQ2pDLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUM1QixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0RCxPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRU8sT0FBTyxDQUFDLEdBQVc7UUFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLENBQUM7U0FDdkM7SUFDSCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtjb252ZXJ0VG9QYXJhbU1hcCwgUGFyYW1NYXAsIFBhcmFtcywgUFJJTUFSWV9PVVRMRVR9IGZyb20gJy4vc2hhcmVkJztcbmltcG9ydCB7ZXF1YWxBcnJheXNPclN0cmluZywgZm9yRWFjaCwgc2hhbGxvd0VxdWFsfSBmcm9tICcuL3V0aWxzL2NvbGxlY3Rpb24nO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRW1wdHlVcmxUcmVlKCkge1xuICByZXR1cm4gbmV3IFVybFRyZWUobmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pLCB7fSwgbnVsbCk7XG59XG5cbi8qKlxuICogQSBzZXQgb2Ygb3B0aW9ucyB3aGljaCBzcGVjaWZ5IGhvdyB0byBkZXRlcm1pbmUgaWYgYSBgVXJsVHJlZWAgaXMgYWN0aXZlLCBnaXZlbiB0aGUgYFVybFRyZWVgXG4gKiBmb3IgdGhlIGN1cnJlbnQgcm91dGVyIHN0YXRlLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqIEBzZWUgUm91dGVyLmlzQWN0aXZlXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSXNBY3RpdmVNYXRjaE9wdGlvbnMge1xuICAvKipcbiAgICogRGVmaW5lcyB0aGUgc3RyYXRlZ3kgZm9yIGNvbXBhcmluZyB0aGUgbWF0cml4IHBhcmFtZXRlcnMgb2YgdHdvIGBVcmxUcmVlYHMuXG4gICAqXG4gICAqIFRoZSBtYXRyaXggcGFyYW1ldGVyIG1hdGNoaW5nIGlzIGRlcGVuZGVudCBvbiB0aGUgc3RyYXRlZ3kgZm9yIG1hdGNoaW5nIHRoZVxuICAgKiBzZWdtZW50cy4gVGhhdCBpcywgaWYgdGhlIGBwYXRoc2Agb3B0aW9uIGlzIHNldCB0byBgJ3N1YnNldCdgLCBvbmx5XG4gICAqIHRoZSBtYXRyaXggcGFyYW1ldGVycyBvZiB0aGUgbWF0Y2hpbmcgc2VnbWVudHMgd2lsbCBiZSBjb21wYXJlZC5cbiAgICpcbiAgICogLSBgJ2V4YWN0J2A6IFJlcXVpcmVzIHRoYXQgbWF0Y2hpbmcgc2VnbWVudHMgYWxzbyBoYXZlIGV4YWN0IG1hdHJpeCBwYXJhbWV0ZXJcbiAgICogbWF0Y2hlcy5cbiAgICogLSBgJ3N1YnNldCdgOiBUaGUgbWF0Y2hpbmcgc2VnbWVudHMgaW4gdGhlIHJvdXRlcidzIGFjdGl2ZSBgVXJsVHJlZWAgbWF5IGNvbnRhaW5cbiAgICogZXh0cmEgbWF0cml4IHBhcmFtZXRlcnMsIGJ1dCB0aG9zZSB0aGF0IGV4aXN0IGluIHRoZSBgVXJsVHJlZWAgaW4gcXVlc3Rpb24gbXVzdCBtYXRjaC5cbiAgICogLSBgJ2lnbm9yZWQnYDogV2hlbiBjb21wYXJpbmcgYFVybFRyZWVgcywgbWF0cml4IHBhcmFtcyB3aWxsIGJlIGlnbm9yZWQuXG4gICAqL1xuICBtYXRyaXhQYXJhbXM6ICdleGFjdCd8J3N1YnNldCd8J2lnbm9yZWQnO1xuICAvKipcbiAgICogRGVmaW5lcyB0aGUgc3RyYXRlZ3kgZm9yIGNvbXBhcmluZyB0aGUgcXVlcnkgcGFyYW1ldGVycyBvZiB0d28gYFVybFRyZWVgcy5cbiAgICpcbiAgICogLSBgJ2V4YWN0J2A6IHRoZSBxdWVyeSBwYXJhbWV0ZXJzIG11c3QgbWF0Y2ggZXhhY3RseS5cbiAgICogLSBgJ3N1YnNldCdgOiB0aGUgYWN0aXZlIGBVcmxUcmVlYCBtYXkgY29udGFpbiBleHRyYSBwYXJhbWV0ZXJzLFxuICAgKiBidXQgbXVzdCBtYXRjaCB0aGUga2V5IGFuZCB2YWx1ZSBvZiBhbnkgdGhhdCBleGlzdCBpbiB0aGUgYFVybFRyZWVgIGluIHF1ZXN0aW9uLlxuICAgKiAtIGAnaWdub3JlZCdgOiBXaGVuIGNvbXBhcmluZyBgVXJsVHJlZWBzLCBxdWVyeSBwYXJhbXMgd2lsbCBiZSBpZ25vcmVkLlxuICAgKi9cbiAgcXVlcnlQYXJhbXM6ICdleGFjdCd8J3N1YnNldCd8J2lnbm9yZWQnO1xuICAvKipcbiAgICogRGVmaW5lcyB0aGUgc3RyYXRlZ3kgZm9yIGNvbXBhcmluZyB0aGUgYFVybFNlZ21lbnRgcyBvZiB0aGUgYFVybFRyZWVgcy5cbiAgICpcbiAgICogLSBgJ2V4YWN0J2A6IGFsbCBzZWdtZW50cyBpbiBlYWNoIGBVcmxUcmVlYCBtdXN0IG1hdGNoLlxuICAgKiAtIGAnc3Vic2V0J2A6IGEgYFVybFRyZWVgIHdpbGwgYmUgZGV0ZXJtaW5lZCB0byBiZSBhY3RpdmUgaWYgaXRcbiAgICogaXMgYSBzdWJ0cmVlIG9mIHRoZSBhY3RpdmUgcm91dGUuIFRoYXQgaXMsIHRoZSBhY3RpdmUgcm91dGUgbWF5IGNvbnRhaW4gZXh0cmFcbiAgICogc2VnbWVudHMsIGJ1dCBtdXN0IGF0IGxlYXN0IGhhdmUgYWxsIHRoZSBzZWdlbWVudHMgb2YgdGhlIGBVcmxUcmVlYCBpbiBxdWVzdGlvbi5cbiAgICovXG4gIHBhdGhzOiAnZXhhY3QnfCdzdWJzZXQnO1xuICAvKipcbiAgICogLSAnZXhhY3QnYDogaW5kaWNhdGVzIHRoYXQgdGhlIGBVcmxUcmVlYCBmcmFnbWVudHMgbXVzdCBiZSBlcXVhbC5cbiAgICogLSBgJ2lnbm9yZWQnYDogdGhlIGZyYWdtZW50cyB3aWxsIG5vdCBiZSBjb21wYXJlZCB3aGVuIGRldGVybWluaW5nIGlmIGFcbiAgICogYFVybFRyZWVgIGlzIGFjdGl2ZS5cbiAgICovXG4gIGZyYWdtZW50OiAnZXhhY3QnfCdpZ25vcmVkJztcbn1cblxudHlwZSBQYXJhbU1hdGNoT3B0aW9ucyA9ICdleGFjdCd8J3N1YnNldCd8J2lnbm9yZWQnO1xuXG50eXBlIFBhdGhDb21wYXJlRm4gPVxuICAgIChjb250YWluZXI6IFVybFNlZ21lbnRHcm91cCwgY29udGFpbmVlOiBVcmxTZWdtZW50R3JvdXAsIG1hdHJpeFBhcmFtczogUGFyYW1NYXRjaE9wdGlvbnMpID0+XG4gICAgICAgIGJvb2xlYW47XG50eXBlIFBhcmFtQ29tcGFyZUZuID0gKGNvbnRhaW5lcjogUGFyYW1zLCBjb250YWluZWU6IFBhcmFtcykgPT4gYm9vbGVhbjtcblxuY29uc3QgcGF0aENvbXBhcmVNYXA6IFJlY29yZDxJc0FjdGl2ZU1hdGNoT3B0aW9uc1sncGF0aHMnXSwgUGF0aENvbXBhcmVGbj4gPSB7XG4gICdleGFjdCc6IGVxdWFsU2VnbWVudEdyb3VwcyxcbiAgJ3N1YnNldCc6IGNvbnRhaW5zU2VnbWVudEdyb3VwLFxufTtcbmNvbnN0IHBhcmFtQ29tcGFyZU1hcDogUmVjb3JkPFBhcmFtTWF0Y2hPcHRpb25zLCBQYXJhbUNvbXBhcmVGbj4gPSB7XG4gICdleGFjdCc6IGVxdWFsUGFyYW1zLFxuICAnc3Vic2V0JzogY29udGFpbnNQYXJhbXMsXG4gICdpZ25vcmVkJzogKCkgPT4gdHJ1ZSxcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBjb250YWluc1RyZWUoXG4gICAgY29udGFpbmVyOiBVcmxUcmVlLCBjb250YWluZWU6IFVybFRyZWUsIG9wdGlvbnM6IElzQWN0aXZlTWF0Y2hPcHRpb25zKTogYm9vbGVhbiB7XG4gIHJldHVybiBwYXRoQ29tcGFyZU1hcFtvcHRpb25zLnBhdGhzXShjb250YWluZXIucm9vdCwgY29udGFpbmVlLnJvb3QsIG9wdGlvbnMubWF0cml4UGFyYW1zKSAmJlxuICAgICAgcGFyYW1Db21wYXJlTWFwW29wdGlvbnMucXVlcnlQYXJhbXNdKGNvbnRhaW5lci5xdWVyeVBhcmFtcywgY29udGFpbmVlLnF1ZXJ5UGFyYW1zKSAmJlxuICAgICAgIShvcHRpb25zLmZyYWdtZW50ID09PSAnZXhhY3QnICYmIGNvbnRhaW5lci5mcmFnbWVudCAhPT0gY29udGFpbmVlLmZyYWdtZW50KTtcbn1cblxuZnVuY3Rpb24gZXF1YWxQYXJhbXMoY29udGFpbmVyOiBQYXJhbXMsIGNvbnRhaW5lZTogUGFyYW1zKTogYm9vbGVhbiB7XG4gIC8vIFRPRE86IFRoaXMgZG9lcyBub3QgaGFuZGxlIGFycmF5IHBhcmFtcyBjb3JyZWN0bHkuXG4gIHJldHVybiBzaGFsbG93RXF1YWwoY29udGFpbmVyLCBjb250YWluZWUpO1xufVxuXG5mdW5jdGlvbiBlcXVhbFNlZ21lbnRHcm91cHMoXG4gICAgY29udGFpbmVyOiBVcmxTZWdtZW50R3JvdXAsIGNvbnRhaW5lZTogVXJsU2VnbWVudEdyb3VwLFxuICAgIG1hdHJpeFBhcmFtczogUGFyYW1NYXRjaE9wdGlvbnMpOiBib29sZWFuIHtcbiAgaWYgKCFlcXVhbFBhdGgoY29udGFpbmVyLnNlZ21lbnRzLCBjb250YWluZWUuc2VnbWVudHMpKSByZXR1cm4gZmFsc2U7XG4gIGlmICghbWF0cml4UGFyYW1zTWF0Y2goY29udGFpbmVyLnNlZ21lbnRzLCBjb250YWluZWUuc2VnbWVudHMsIG1hdHJpeFBhcmFtcykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKGNvbnRhaW5lci5udW1iZXJPZkNoaWxkcmVuICE9PSBjb250YWluZWUubnVtYmVyT2ZDaGlsZHJlbikgcmV0dXJuIGZhbHNlO1xuICBmb3IgKGNvbnN0IGMgaW4gY29udGFpbmVlLmNoaWxkcmVuKSB7XG4gICAgaWYgKCFjb250YWluZXIuY2hpbGRyZW5bY10pIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIWVxdWFsU2VnbWVudEdyb3Vwcyhjb250YWluZXIuY2hpbGRyZW5bY10sIGNvbnRhaW5lZS5jaGlsZHJlbltjXSwgbWF0cml4UGFyYW1zKSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29udGFpbnNQYXJhbXMoY29udGFpbmVyOiBQYXJhbXMsIGNvbnRhaW5lZTogUGFyYW1zKTogYm9vbGVhbiB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhjb250YWluZWUpLmxlbmd0aCA8PSBPYmplY3Qua2V5cyhjb250YWluZXIpLmxlbmd0aCAmJlxuICAgICAgT2JqZWN0LmtleXMoY29udGFpbmVlKS5ldmVyeShrZXkgPT4gZXF1YWxBcnJheXNPclN0cmluZyhjb250YWluZXJba2V5XSwgY29udGFpbmVlW2tleV0pKTtcbn1cblxuZnVuY3Rpb24gY29udGFpbnNTZWdtZW50R3JvdXAoXG4gICAgY29udGFpbmVyOiBVcmxTZWdtZW50R3JvdXAsIGNvbnRhaW5lZTogVXJsU2VnbWVudEdyb3VwLFxuICAgIG1hdHJpeFBhcmFtczogUGFyYW1NYXRjaE9wdGlvbnMpOiBib29sZWFuIHtcbiAgcmV0dXJuIGNvbnRhaW5zU2VnbWVudEdyb3VwSGVscGVyKGNvbnRhaW5lciwgY29udGFpbmVlLCBjb250YWluZWUuc2VnbWVudHMsIG1hdHJpeFBhcmFtcyk7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zU2VnbWVudEdyb3VwSGVscGVyKFxuICAgIGNvbnRhaW5lcjogVXJsU2VnbWVudEdyb3VwLCBjb250YWluZWU6IFVybFNlZ21lbnRHcm91cCwgY29udGFpbmVlUGF0aHM6IFVybFNlZ21lbnRbXSxcbiAgICBtYXRyaXhQYXJhbXM6IFBhcmFtTWF0Y2hPcHRpb25zKTogYm9vbGVhbiB7XG4gIGlmIChjb250YWluZXIuc2VnbWVudHMubGVuZ3RoID4gY29udGFpbmVlUGF0aHMubGVuZ3RoKSB7XG4gICAgY29uc3QgY3VycmVudCA9IGNvbnRhaW5lci5zZWdtZW50cy5zbGljZSgwLCBjb250YWluZWVQYXRocy5sZW5ndGgpO1xuICAgIGlmICghZXF1YWxQYXRoKGN1cnJlbnQsIGNvbnRhaW5lZVBhdGhzKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChjb250YWluZWUuaGFzQ2hpbGRyZW4oKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0cml4UGFyYW1zTWF0Y2goY3VycmVudCwgY29udGFpbmVlUGF0aHMsIG1hdHJpeFBhcmFtcykpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcblxuICB9IGVsc2UgaWYgKGNvbnRhaW5lci5zZWdtZW50cy5sZW5ndGggPT09IGNvbnRhaW5lZVBhdGhzLmxlbmd0aCkge1xuICAgIGlmICghZXF1YWxQYXRoKGNvbnRhaW5lci5zZWdtZW50cywgY29udGFpbmVlUGF0aHMpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFtYXRyaXhQYXJhbXNNYXRjaChjb250YWluZXIuc2VnbWVudHMsIGNvbnRhaW5lZVBhdGhzLCBtYXRyaXhQYXJhbXMpKSByZXR1cm4gZmFsc2U7XG4gICAgZm9yIChjb25zdCBjIGluIGNvbnRhaW5lZS5jaGlsZHJlbikge1xuICAgICAgaWYgKCFjb250YWluZXIuY2hpbGRyZW5bY10pIHJldHVybiBmYWxzZTtcbiAgICAgIGlmICghY29udGFpbnNTZWdtZW50R3JvdXAoY29udGFpbmVyLmNoaWxkcmVuW2NdLCBjb250YWluZWUuY2hpbGRyZW5bY10sIG1hdHJpeFBhcmFtcykpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcblxuICB9IGVsc2Uge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBjb250YWluZWVQYXRocy5zbGljZSgwLCBjb250YWluZXIuc2VnbWVudHMubGVuZ3RoKTtcbiAgICBjb25zdCBuZXh0ID0gY29udGFpbmVlUGF0aHMuc2xpY2UoY29udGFpbmVyLnNlZ21lbnRzLmxlbmd0aCk7XG4gICAgaWYgKCFlcXVhbFBhdGgoY29udGFpbmVyLnNlZ21lbnRzLCBjdXJyZW50KSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0cml4UGFyYW1zTWF0Y2goY29udGFpbmVyLnNlZ21lbnRzLCBjdXJyZW50LCBtYXRyaXhQYXJhbXMpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFjb250YWluZXIuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIGNvbnRhaW5zU2VnbWVudEdyb3VwSGVscGVyKFxuICAgICAgICBjb250YWluZXIuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdLCBjb250YWluZWUsIG5leHQsIG1hdHJpeFBhcmFtcyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWF0cml4UGFyYW1zTWF0Y2goXG4gICAgY29udGFpbmVyUGF0aHM6IFVybFNlZ21lbnRbXSwgY29udGFpbmVlUGF0aHM6IFVybFNlZ21lbnRbXSwgb3B0aW9uczogUGFyYW1NYXRjaE9wdGlvbnMpIHtcbiAgcmV0dXJuIGNvbnRhaW5lZVBhdGhzLmV2ZXJ5KChjb250YWluZWVTZWdtZW50LCBpKSA9PiB7XG4gICAgcmV0dXJuIHBhcmFtQ29tcGFyZU1hcFtvcHRpb25zXShjb250YWluZXJQYXRoc1tpXS5wYXJhbWV0ZXJzLCBjb250YWluZWVTZWdtZW50LnBhcmFtZXRlcnMpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBSZXByZXNlbnRzIHRoZSBwYXJzZWQgVVJMLlxuICpcbiAqIFNpbmNlIGEgcm91dGVyIHN0YXRlIGlzIGEgdHJlZSwgYW5kIHRoZSBVUkwgaXMgbm90aGluZyBidXQgYSBzZXJpYWxpemVkIHN0YXRlLCB0aGUgVVJMIGlzIGFcbiAqIHNlcmlhbGl6ZWQgdHJlZS5cbiAqIFVybFRyZWUgaXMgYSBkYXRhIHN0cnVjdHVyZSB0aGF0IHByb3ZpZGVzIGEgbG90IG9mIGFmZm9yZGFuY2VzIGluIGRlYWxpbmcgd2l0aCBVUkxzXG4gKlxuICogQHVzYWdlTm90ZXNcbiAqICMjIyBFeGFtcGxlXG4gKlxuICogYGBgXG4gKiBAQ29tcG9uZW50KHt0ZW1wbGF0ZVVybDondGVtcGxhdGUuaHRtbCd9KVxuICogY2xhc3MgTXlDb21wb25lbnQge1xuICogICBjb25zdHJ1Y3Rvcihyb3V0ZXI6IFJvdXRlcikge1xuICogICAgIGNvbnN0IHRyZWU6IFVybFRyZWUgPVxuICogICAgICAgcm91dGVyLnBhcnNlVXJsKCcvdGVhbS8zMy8odXNlci92aWN0b3IvL3N1cHBvcnQ6aGVscCk/ZGVidWc9dHJ1ZSNmcmFnbWVudCcpO1xuICogICAgIGNvbnN0IGYgPSB0cmVlLmZyYWdtZW50OyAvLyByZXR1cm4gJ2ZyYWdtZW50J1xuICogICAgIGNvbnN0IHEgPSB0cmVlLnF1ZXJ5UGFyYW1zOyAvLyByZXR1cm5zIHtkZWJ1ZzogJ3RydWUnfVxuICogICAgIGNvbnN0IGc6IFVybFNlZ21lbnRHcm91cCA9IHRyZWUucm9vdC5jaGlsZHJlbltQUklNQVJZX09VVExFVF07XG4gKiAgICAgY29uc3QgczogVXJsU2VnbWVudFtdID0gZy5zZWdtZW50czsgLy8gcmV0dXJucyAyIHNlZ21lbnRzICd0ZWFtJyBhbmQgJzMzJ1xuICogICAgIGcuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdLnNlZ21lbnRzOyAvLyByZXR1cm5zIDIgc2VnbWVudHMgJ3VzZXInIGFuZCAndmljdG9yJ1xuICogICAgIGcuY2hpbGRyZW5bJ3N1cHBvcnQnXS5zZWdtZW50czsgLy8gcmV0dXJuIDEgc2VnbWVudCAnaGVscCdcbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgVXJsVHJlZSB7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIF9xdWVyeVBhcmFtTWFwITogUGFyYW1NYXA7XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBUaGUgcm9vdCBzZWdtZW50IGdyb3VwIG9mIHRoZSBVUkwgdHJlZSAqL1xuICAgICAgcHVibGljIHJvb3Q6IFVybFNlZ21lbnRHcm91cCxcbiAgICAgIC8qKiBUaGUgcXVlcnkgcGFyYW1zIG9mIHRoZSBVUkwgKi9cbiAgICAgIHB1YmxpYyBxdWVyeVBhcmFtczogUGFyYW1zLFxuICAgICAgLyoqIFRoZSBmcmFnbWVudCBvZiB0aGUgVVJMICovXG4gICAgICBwdWJsaWMgZnJhZ21lbnQ6IHN0cmluZ3xudWxsKSB7fVxuXG4gIGdldCBxdWVyeVBhcmFtTWFwKCk6IFBhcmFtTWFwIHtcbiAgICBpZiAoIXRoaXMuX3F1ZXJ5UGFyYW1NYXApIHtcbiAgICAgIHRoaXMuX3F1ZXJ5UGFyYW1NYXAgPSBjb252ZXJ0VG9QYXJhbU1hcCh0aGlzLnF1ZXJ5UGFyYW1zKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXJ5UGFyYW1NYXA7XG4gIH1cblxuICAvKiogQGRvY3NOb3RSZXF1aXJlZCAqL1xuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBERUZBVUxUX1NFUklBTElaRVIuc2VyaWFsaXplKHRoaXMpO1xuICB9XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogUmVwcmVzZW50cyB0aGUgcGFyc2VkIFVSTCBzZWdtZW50IGdyb3VwLlxuICpcbiAqIFNlZSBgVXJsVHJlZWAgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgVXJsU2VnbWVudEdyb3VwIHtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfc291cmNlU2VnbWVudD86IFVybFNlZ21lbnRHcm91cDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfc2VnbWVudEluZGV4U2hpZnQ/OiBudW1iZXI7XG4gIC8qKiBUaGUgcGFyZW50IG5vZGUgaW4gdGhlIHVybCB0cmVlICovXG4gIHBhcmVudDogVXJsU2VnbWVudEdyb3VwfG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIFRoZSBVUkwgc2VnbWVudHMgb2YgdGhpcyBncm91cC4gU2VlIGBVcmxTZWdtZW50YCBmb3IgbW9yZSBpbmZvcm1hdGlvbiAqL1xuICAgICAgcHVibGljIHNlZ21lbnRzOiBVcmxTZWdtZW50W10sXG4gICAgICAvKiogVGhlIGxpc3Qgb2YgY2hpbGRyZW4gb2YgdGhpcyBncm91cCAqL1xuICAgICAgcHVibGljIGNoaWxkcmVuOiB7W2tleTogc3RyaW5nXTogVXJsU2VnbWVudEdyb3VwfSkge1xuICAgIGZvckVhY2goY2hpbGRyZW4sICh2OiBhbnksIGs6IGFueSkgPT4gdi5wYXJlbnQgPSB0aGlzKTtcbiAgfVxuXG4gIC8qKiBXaGV0aGVyIHRoZSBzZWdtZW50IGhhcyBjaGlsZCBzZWdtZW50cyAqL1xuICBoYXNDaGlsZHJlbigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5udW1iZXJPZkNoaWxkcmVuID4gMDtcbiAgfVxuXG4gIC8qKiBOdW1iZXIgb2YgY2hpbGQgc2VnbWVudHMgKi9cbiAgZ2V0IG51bWJlck9mQ2hpbGRyZW4oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5jaGlsZHJlbikubGVuZ3RoO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc2VyaWFsaXplUGF0aHModGhpcyk7XG4gIH1cbn1cblxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIFJlcHJlc2VudHMgYSBzaW5nbGUgVVJMIHNlZ21lbnQuXG4gKlxuICogQSBVcmxTZWdtZW50IGlzIGEgcGFydCBvZiBhIFVSTCBiZXR3ZWVuIHRoZSB0d28gc2xhc2hlcy4gSXQgY29udGFpbnMgYSBwYXRoIGFuZCB0aGUgbWF0cml4XG4gKiBwYXJhbWV0ZXJzIGFzc29jaWF0ZWQgd2l0aCB0aGUgc2VnbWVudC5cbiAqXG4gKiBAdXNhZ2VOb3Rlc1xuICrCoCMjIyBFeGFtcGxlXG4gKlxuICogYGBgXG4gKiBAQ29tcG9uZW50KHt0ZW1wbGF0ZVVybDondGVtcGxhdGUuaHRtbCd9KVxuICogY2xhc3MgTXlDb21wb25lbnQge1xuICogICBjb25zdHJ1Y3Rvcihyb3V0ZXI6IFJvdXRlcikge1xuICogICAgIGNvbnN0IHRyZWU6IFVybFRyZWUgPSByb3V0ZXIucGFyc2VVcmwoJy90ZWFtO2lkPTMzJyk7XG4gKiAgICAgY29uc3QgZzogVXJsU2VnbWVudEdyb3VwID0gdHJlZS5yb290LmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXTtcbiAqICAgICBjb25zdCBzOiBVcmxTZWdtZW50W10gPSBnLnNlZ21lbnRzO1xuICogICAgIHNbMF0ucGF0aDsgLy8gcmV0dXJucyAndGVhbSdcbiAqICAgICBzWzBdLnBhcmFtZXRlcnM7IC8vIHJldHVybnMge2lkOiAzM31cbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY2xhc3MgVXJsU2VnbWVudCB7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgLy8gVE9ETyhpc3N1ZS8yNDU3MSk6IHJlbW92ZSAnIScuXG4gIF9wYXJhbWV0ZXJNYXAhOiBQYXJhbU1hcDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBUaGUgcGF0aCBwYXJ0IG9mIGEgVVJMIHNlZ21lbnQgKi9cbiAgICAgIHB1YmxpYyBwYXRoOiBzdHJpbmcsXG5cbiAgICAgIC8qKiBUaGUgbWF0cml4IHBhcmFtZXRlcnMgYXNzb2NpYXRlZCB3aXRoIGEgc2VnbWVudCAqL1xuICAgICAgcHVibGljIHBhcmFtZXRlcnM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSkge31cblxuICBnZXQgcGFyYW1ldGVyTWFwKCkge1xuICAgIGlmICghdGhpcy5fcGFyYW1ldGVyTWFwKSB7XG4gICAgICB0aGlzLl9wYXJhbWV0ZXJNYXAgPSBjb252ZXJ0VG9QYXJhbU1hcCh0aGlzLnBhcmFtZXRlcnMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcGFyYW1ldGVyTWFwO1xuICB9XG5cbiAgLyoqIEBkb2NzTm90UmVxdWlyZWQgKi9cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc2VyaWFsaXplUGF0aCh0aGlzKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZXF1YWxTZWdtZW50cyhhczogVXJsU2VnbWVudFtdLCBiczogVXJsU2VnbWVudFtdKTogYm9vbGVhbiB7XG4gIHJldHVybiBlcXVhbFBhdGgoYXMsIGJzKSAmJiBhcy5ldmVyeSgoYSwgaSkgPT4gc2hhbGxvd0VxdWFsKGEucGFyYW1ldGVycywgYnNbaV0ucGFyYW1ldGVycykpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXF1YWxQYXRoKGFzOiBVcmxTZWdtZW50W10sIGJzOiBVcmxTZWdtZW50W10pOiBib29sZWFuIHtcbiAgaWYgKGFzLmxlbmd0aCAhPT0gYnMubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBhcy5ldmVyeSgoYSwgaSkgPT4gYS5wYXRoID09PSBic1tpXS5wYXRoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hcENoaWxkcmVuSW50b0FycmF5PFQ+KFxuICAgIHNlZ21lbnQ6IFVybFNlZ21lbnRHcm91cCwgZm46ICh2OiBVcmxTZWdtZW50R3JvdXAsIGs6IHN0cmluZykgPT4gVFtdKTogVFtdIHtcbiAgbGV0IHJlczogVFtdID0gW107XG4gIGZvckVhY2goc2VnbWVudC5jaGlsZHJlbiwgKGNoaWxkOiBVcmxTZWdtZW50R3JvdXAsIGNoaWxkT3V0bGV0OiBzdHJpbmcpID0+IHtcbiAgICBpZiAoY2hpbGRPdXRsZXQgPT09IFBSSU1BUllfT1VUTEVUKSB7XG4gICAgICByZXMgPSByZXMuY29uY2F0KGZuKGNoaWxkLCBjaGlsZE91dGxldCkpO1xuICAgIH1cbiAgfSk7XG4gIGZvckVhY2goc2VnbWVudC5jaGlsZHJlbiwgKGNoaWxkOiBVcmxTZWdtZW50R3JvdXAsIGNoaWxkT3V0bGV0OiBzdHJpbmcpID0+IHtcbiAgICBpZiAoY2hpbGRPdXRsZXQgIT09IFBSSU1BUllfT1VUTEVUKSB7XG4gICAgICByZXMgPSByZXMuY29uY2F0KGZuKGNoaWxkLCBjaGlsZE91dGxldCkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG5cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBTZXJpYWxpemVzIGFuZCBkZXNlcmlhbGl6ZXMgYSBVUkwgc3RyaW5nIGludG8gYSBVUkwgdHJlZS5cbiAqXG4gKiBUaGUgdXJsIHNlcmlhbGl6YXRpb24gc3RyYXRlZ3kgaXMgY3VzdG9taXphYmxlLiBZb3UgY2FuXG4gKiBtYWtlIGFsbCBVUkxzIGNhc2UgaW5zZW5zaXRpdmUgYnkgcHJvdmlkaW5nIGEgY3VzdG9tIFVybFNlcmlhbGl6ZXIuXG4gKlxuICogU2VlIGBEZWZhdWx0VXJsU2VyaWFsaXplcmAgZm9yIGFuIGV4YW1wbGUgb2YgYSBVUkwgc2VyaWFsaXplci5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBVcmxTZXJpYWxpemVyIHtcbiAgLyoqIFBhcnNlIGEgdXJsIGludG8gYSBgVXJsVHJlZWAgKi9cbiAgYWJzdHJhY3QgcGFyc2UodXJsOiBzdHJpbmcpOiBVcmxUcmVlO1xuXG4gIC8qKiBDb252ZXJ0cyBhIGBVcmxUcmVlYCBpbnRvIGEgdXJsICovXG4gIGFic3RyYWN0IHNlcmlhbGl6ZSh0cmVlOiBVcmxUcmVlKTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqIEEgZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgYFVybFNlcmlhbGl6ZXJgLlxuICpcbiAqIEV4YW1wbGUgVVJMczpcbiAqXG4gKiBgYGBcbiAqIC9pbmJveC8zMyhwb3B1cDpjb21wb3NlKVxuICogL2luYm94LzMzO29wZW49dHJ1ZS9tZXNzYWdlcy80NFxuICogYGBgXG4gKlxuICogRGVmYXVsdFVybFNlcmlhbGl6ZXIgdXNlcyBwYXJlbnRoZXNlcyB0byBzZXJpYWxpemUgc2Vjb25kYXJ5IHNlZ21lbnRzIChlLmcuLCBwb3B1cDpjb21wb3NlKSwgdGhlXG4gKiBjb2xvbiBzeW50YXggdG8gc3BlY2lmeSB0aGUgb3V0bGV0LCBhbmQgdGhlICc7cGFyYW1ldGVyPXZhbHVlJyBzeW50YXggKGUuZy4sIG9wZW49dHJ1ZSkgdG9cbiAqIHNwZWNpZnkgcm91dGUgc3BlY2lmaWMgcGFyYW1ldGVycy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWZhdWx0VXJsU2VyaWFsaXplciBpbXBsZW1lbnRzIFVybFNlcmlhbGl6ZXIge1xuICAvKiogUGFyc2VzIGEgdXJsIGludG8gYSBgVXJsVHJlZWAgKi9cbiAgcGFyc2UodXJsOiBzdHJpbmcpOiBVcmxUcmVlIHtcbiAgICBjb25zdCBwID0gbmV3IFVybFBhcnNlcih1cmwpO1xuICAgIHJldHVybiBuZXcgVXJsVHJlZShwLnBhcnNlUm9vdFNlZ21lbnQoKSwgcC5wYXJzZVF1ZXJ5UGFyYW1zKCksIHAucGFyc2VGcmFnbWVudCgpKTtcbiAgfVxuXG4gIC8qKiBDb252ZXJ0cyBhIGBVcmxUcmVlYCBpbnRvIGEgdXJsICovXG4gIHNlcmlhbGl6ZSh0cmVlOiBVcmxUcmVlKTogc3RyaW5nIHtcbiAgICBjb25zdCBzZWdtZW50ID0gYC8ke3NlcmlhbGl6ZVNlZ21lbnQodHJlZS5yb290LCB0cnVlKX1gO1xuICAgIGNvbnN0IHF1ZXJ5ID0gc2VyaWFsaXplUXVlcnlQYXJhbXModHJlZS5xdWVyeVBhcmFtcyk7XG4gICAgY29uc3QgZnJhZ21lbnQgPVxuICAgICAgICB0eXBlb2YgdHJlZS5mcmFnbWVudCA9PT0gYHN0cmluZ2AgPyBgIyR7ZW5jb2RlVXJpRnJhZ21lbnQodHJlZS5mcmFnbWVudCl9YCA6ICcnO1xuXG4gICAgcmV0dXJuIGAke3NlZ21lbnR9JHtxdWVyeX0ke2ZyYWdtZW50fWA7XG4gIH1cbn1cblxuY29uc3QgREVGQVVMVF9TRVJJQUxJWkVSID0gbmV3IERlZmF1bHRVcmxTZXJpYWxpemVyKCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVQYXRocyhzZWdtZW50OiBVcmxTZWdtZW50R3JvdXApOiBzdHJpbmcge1xuICByZXR1cm4gc2VnbWVudC5zZWdtZW50cy5tYXAocCA9PiBzZXJpYWxpemVQYXRoKHApKS5qb2luKCcvJyk7XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZVNlZ21lbnQoc2VnbWVudDogVXJsU2VnbWVudEdyb3VwLCByb290OiBib29sZWFuKTogc3RyaW5nIHtcbiAgaWYgKCFzZWdtZW50Lmhhc0NoaWxkcmVuKCkpIHtcbiAgICByZXR1cm4gc2VyaWFsaXplUGF0aHMoc2VnbWVudCk7XG4gIH1cblxuICBpZiAocm9vdCkge1xuICAgIGNvbnN0IHByaW1hcnkgPSBzZWdtZW50LmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSA/XG4gICAgICAgIHNlcmlhbGl6ZVNlZ21lbnQoc2VnbWVudC5jaGlsZHJlbltQUklNQVJZX09VVExFVF0sIGZhbHNlKSA6XG4gICAgICAgICcnO1xuICAgIGNvbnN0IGNoaWxkcmVuOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgZm9yRWFjaChzZWdtZW50LmNoaWxkcmVuLCAodjogVXJsU2VnbWVudEdyb3VwLCBrOiBzdHJpbmcpID0+IHtcbiAgICAgIGlmIChrICE9PSBQUklNQVJZX09VVExFVCkge1xuICAgICAgICBjaGlsZHJlbi5wdXNoKGAke2t9OiR7c2VyaWFsaXplU2VnbWVudCh2LCBmYWxzZSl9YCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gY2hpbGRyZW4ubGVuZ3RoID4gMCA/IGAke3ByaW1hcnl9KCR7Y2hpbGRyZW4uam9pbignLy8nKX0pYCA6IHByaW1hcnk7XG5cbiAgfSBlbHNlIHtcbiAgICBjb25zdCBjaGlsZHJlbiA9IG1hcENoaWxkcmVuSW50b0FycmF5KHNlZ21lbnQsICh2OiBVcmxTZWdtZW50R3JvdXAsIGs6IHN0cmluZykgPT4ge1xuICAgICAgaWYgKGsgPT09IFBSSU1BUllfT1VUTEVUKSB7XG4gICAgICAgIHJldHVybiBbc2VyaWFsaXplU2VnbWVudChzZWdtZW50LmNoaWxkcmVuW1BSSU1BUllfT1VUTEVUXSwgZmFsc2UpXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIFtgJHtrfToke3NlcmlhbGl6ZVNlZ21lbnQodiwgZmFsc2UpfWBdO1xuICAgIH0pO1xuXG4gICAgLy8gdXNlIG5vIHBhcmVudGhlc2lzIGlmIHRoZSBvbmx5IGNoaWxkIGlzIGEgcHJpbWFyeSBvdXRsZXQgcm91dGVcbiAgICBpZiAoT2JqZWN0LmtleXMoc2VnbWVudC5jaGlsZHJlbikubGVuZ3RoID09PSAxICYmIHNlZ21lbnQuY2hpbGRyZW5bUFJJTUFSWV9PVVRMRVRdICE9IG51bGwpIHtcbiAgICAgIHJldHVybiBgJHtzZXJpYWxpemVQYXRocyhzZWdtZW50KX0vJHtjaGlsZHJlblswXX1gO1xuICAgIH1cblxuICAgIHJldHVybiBgJHtzZXJpYWxpemVQYXRocyhzZWdtZW50KX0vKCR7Y2hpbGRyZW4uam9pbignLy8nKX0pYDtcbiAgfVxufVxuXG4vKipcbiAqIEVuY29kZXMgYSBVUkkgc3RyaW5nIHdpdGggdGhlIGRlZmF1bHQgZW5jb2RpbmcuIFRoaXMgZnVuY3Rpb24gd2lsbCBvbmx5IGV2ZXIgYmUgY2FsbGVkIGZyb21cbiAqIGBlbmNvZGVVcmlRdWVyeWAgb3IgYGVuY29kZVVyaVNlZ21lbnRgIGFzIGl0J3MgdGhlIGJhc2Ugc2V0IG9mIGVuY29kaW5ncyB0byBiZSB1c2VkLiBXZSBuZWVkXG4gKiBhIGN1c3RvbSBlbmNvZGluZyBiZWNhdXNlIGVuY29kZVVSSUNvbXBvbmVudCBpcyB0b28gYWdncmVzc2l2ZSBhbmQgZW5jb2RlcyBzdHVmZiB0aGF0IGRvZXNuJ3RcbiAqIGhhdmUgdG8gYmUgZW5jb2RlZCBwZXIgaHR0cHM6Ly91cmwuc3BlYy53aGF0d2cub3JnLlxuICovXG5mdW5jdGlvbiBlbmNvZGVVcmlTdHJpbmcoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChzKVxuICAgICAgLnJlcGxhY2UoLyU0MC9nLCAnQCcpXG4gICAgICAucmVwbGFjZSgvJTNBL2dpLCAnOicpXG4gICAgICAucmVwbGFjZSgvJTI0L2csICckJylcbiAgICAgIC5yZXBsYWNlKC8lMkMvZ2ksICcsJyk7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgdXNlZCB0byBlbmNvZGUgYm90aCBrZXlzIGFuZCB2YWx1ZXMgaW4gYSBxdWVyeSBzdHJpbmcga2V5L3ZhbHVlLiBJblxuICogdGhlIGZvbGxvd2luZyBVUkwsIHlvdSBuZWVkIHRvIGNhbGwgZW5jb2RlVXJpUXVlcnkgb24gXCJrXCIgYW5kIFwidlwiOlxuICpcbiAqIGh0dHA6Ly93d3cuc2l0ZS5vcmcvaHRtbDttaz1tdj9rPXYjZlxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5jb2RlVXJpUXVlcnkoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVuY29kZVVyaVN0cmluZyhzKS5yZXBsYWNlKC8lM0IvZ2ksICc7Jyk7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgdXNlZCB0byBlbmNvZGUgYSBVUkwgZnJhZ21lbnQuIEluIHRoZSBmb2xsb3dpbmcgVVJMLCB5b3UgbmVlZCB0byBjYWxsXG4gKiBlbmNvZGVVcmlGcmFnbWVudCBvbiBcImZcIjpcbiAqXG4gKiBodHRwOi8vd3d3LnNpdGUub3JnL2h0bWw7bWs9bXY/az12I2ZcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuY29kZVVyaUZyYWdtZW50KHM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBlbmNvZGVVUkkocyk7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgcnVuIG9uIGFueSBVUkkgc2VnbWVudCBhcyB3ZWxsIGFzIHRoZSBrZXkgYW5kIHZhbHVlIGluIGEga2V5L3ZhbHVlXG4gKiBwYWlyIGZvciBtYXRyaXggcGFyYW1zLiBJbiB0aGUgZm9sbG93aW5nIFVSTCwgeW91IG5lZWQgdG8gY2FsbCBlbmNvZGVVcmlTZWdtZW50IG9uIFwiaHRtbFwiLFxuICogXCJta1wiLCBhbmQgXCJtdlwiOlxuICpcbiAqIGh0dHA6Ly93d3cuc2l0ZS5vcmcvaHRtbDttaz1tdj9rPXYjZlxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5jb2RlVXJpU2VnbWVudChzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZW5jb2RlVXJpU3RyaW5nKHMpLnJlcGxhY2UoL1xcKC9nLCAnJTI4JykucmVwbGFjZSgvXFwpL2csICclMjknKS5yZXBsYWNlKC8lMjYvZ2ksICcmJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWNvZGUoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzKTtcbn1cblxuLy8gUXVlcnkga2V5cy92YWx1ZXMgc2hvdWxkIGhhdmUgdGhlIFwiK1wiIHJlcGxhY2VkIGZpcnN0LCBhcyBcIitcIiBpbiBhIHF1ZXJ5IHN0cmluZyBpcyBcIiBcIi5cbi8vIGRlY29kZVVSSUNvbXBvbmVudCBmdW5jdGlvbiB3aWxsIG5vdCBkZWNvZGUgXCIrXCIgYXMgYSBzcGFjZS5cbmV4cG9ydCBmdW5jdGlvbiBkZWNvZGVRdWVyeShzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZGVjb2RlKHMucmVwbGFjZSgvXFwrL2csICclMjAnKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVQYXRoKHBhdGg6IFVybFNlZ21lbnQpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7ZW5jb2RlVXJpU2VnbWVudChwYXRoLnBhdGgpfSR7c2VyaWFsaXplTWF0cml4UGFyYW1zKHBhdGgucGFyYW1ldGVycyl9YDtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplTWF0cml4UGFyYW1zKHBhcmFtczoge1trZXk6IHN0cmluZ106IHN0cmluZ30pOiBzdHJpbmcge1xuICByZXR1cm4gT2JqZWN0LmtleXMocGFyYW1zKVxuICAgICAgLm1hcChrZXkgPT4gYDske2VuY29kZVVyaVNlZ21lbnQoa2V5KX09JHtlbmNvZGVVcmlTZWdtZW50KHBhcmFtc1trZXldKX1gKVxuICAgICAgLmpvaW4oJycpO1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVRdWVyeVBhcmFtcyhwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBhbnl9KTogc3RyaW5nIHtcbiAgY29uc3Qgc3RyUGFyYW1zOiBzdHJpbmdbXSA9XG4gICAgICBPYmplY3Qua2V5cyhwYXJhbXMpXG4gICAgICAgICAgLm1hcCgobmFtZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBwYXJhbXNbbmFtZV07XG4gICAgICAgICAgICByZXR1cm4gQXJyYXkuaXNBcnJheSh2YWx1ZSkgP1xuICAgICAgICAgICAgICAgIHZhbHVlLm1hcCh2ID0+IGAke2VuY29kZVVyaVF1ZXJ5KG5hbWUpfT0ke2VuY29kZVVyaVF1ZXJ5KHYpfWApLmpvaW4oJyYnKSA6XG4gICAgICAgICAgICAgICAgYCR7ZW5jb2RlVXJpUXVlcnkobmFtZSl9PSR7ZW5jb2RlVXJpUXVlcnkodmFsdWUpfWA7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZmlsdGVyKHMgPT4gISFzKTtcblxuICByZXR1cm4gc3RyUGFyYW1zLmxlbmd0aCA/IGA/JHtzdHJQYXJhbXMuam9pbignJicpfWAgOiAnJztcbn1cblxuY29uc3QgU0VHTUVOVF9SRSA9IC9eW15cXC8oKT87PSNdKy87XG5mdW5jdGlvbiBtYXRjaFNlZ21lbnRzKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbWF0Y2ggPSBzdHIubWF0Y2goU0VHTUVOVF9SRSk7XG4gIHJldHVybiBtYXRjaCA/IG1hdGNoWzBdIDogJyc7XG59XG5cbmNvbnN0IFFVRVJZX1BBUkFNX1JFID0gL15bXj0/JiNdKy87XG4vLyBSZXR1cm4gdGhlIG5hbWUgb2YgdGhlIHF1ZXJ5IHBhcmFtIGF0IHRoZSBzdGFydCBvZiB0aGUgc3RyaW5nIG9yIGFuIGVtcHR5IHN0cmluZ1xuZnVuY3Rpb24gbWF0Y2hRdWVyeVBhcmFtcyhzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IG1hdGNoID0gc3RyLm1hdGNoKFFVRVJZX1BBUkFNX1JFKTtcbiAgcmV0dXJuIG1hdGNoID8gbWF0Y2hbMF0gOiAnJztcbn1cblxuY29uc3QgUVVFUllfUEFSQU1fVkFMVUVfUkUgPSAvXlteJiNdKy87XG4vLyBSZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBxdWVyeSBwYXJhbSBhdCB0aGUgc3RhcnQgb2YgdGhlIHN0cmluZyBvciBhbiBlbXB0eSBzdHJpbmdcbmZ1bmN0aW9uIG1hdGNoVXJsUXVlcnlQYXJhbVZhbHVlKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbWF0Y2ggPSBzdHIubWF0Y2goUVVFUllfUEFSQU1fVkFMVUVfUkUpO1xuICByZXR1cm4gbWF0Y2ggPyBtYXRjaFswXSA6ICcnO1xufVxuXG5jbGFzcyBVcmxQYXJzZXIge1xuICBwcml2YXRlIHJlbWFpbmluZzogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgdXJsOiBzdHJpbmcpIHtcbiAgICB0aGlzLnJlbWFpbmluZyA9IHVybDtcbiAgfVxuXG4gIHBhcnNlUm9vdFNlZ21lbnQoKTogVXJsU2VnbWVudEdyb3VwIHtcbiAgICB0aGlzLmNvbnN1bWVPcHRpb25hbCgnLycpO1xuXG4gICAgaWYgKHRoaXMucmVtYWluaW5nID09PSAnJyB8fCB0aGlzLnBlZWtTdGFydHNXaXRoKCc/JykgfHwgdGhpcy5wZWVrU3RhcnRzV2l0aCgnIycpKSB7XG4gICAgICByZXR1cm4gbmV3IFVybFNlZ21lbnRHcm91cChbXSwge30pO1xuICAgIH1cblxuICAgIC8vIFRoZSByb290IHNlZ21lbnQgZ3JvdXAgbmV2ZXIgaGFzIHNlZ21lbnRzXG4gICAgcmV0dXJuIG5ldyBVcmxTZWdtZW50R3JvdXAoW10sIHRoaXMucGFyc2VDaGlsZHJlbigpKTtcbiAgfVxuXG4gIHBhcnNlUXVlcnlQYXJhbXMoKTogUGFyYW1zIHtcbiAgICBjb25zdCBwYXJhbXM6IFBhcmFtcyA9IHt9O1xuICAgIGlmICh0aGlzLmNvbnN1bWVPcHRpb25hbCgnPycpKSB7XG4gICAgICBkbyB7XG4gICAgICAgIHRoaXMucGFyc2VRdWVyeVBhcmFtKHBhcmFtcyk7XG4gICAgICB9IHdoaWxlICh0aGlzLmNvbnN1bWVPcHRpb25hbCgnJicpKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcztcbiAgfVxuXG4gIHBhcnNlRnJhZ21lbnQoKTogc3RyaW5nfG51bGwge1xuICAgIHJldHVybiB0aGlzLmNvbnN1bWVPcHRpb25hbCgnIycpID8gZGVjb2RlVVJJQ29tcG9uZW50KHRoaXMucmVtYWluaW5nKSA6IG51bGw7XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQ2hpbGRyZW4oKToge1tvdXRsZXQ6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0ge1xuICAgIGlmICh0aGlzLnJlbWFpbmluZyA9PT0gJycpIHtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICB0aGlzLmNvbnN1bWVPcHRpb25hbCgnLycpO1xuXG4gICAgY29uc3Qgc2VnbWVudHM6IFVybFNlZ21lbnRbXSA9IFtdO1xuICAgIGlmICghdGhpcy5wZWVrU3RhcnRzV2l0aCgnKCcpKSB7XG4gICAgICBzZWdtZW50cy5wdXNoKHRoaXMucGFyc2VTZWdtZW50KCkpO1xuICAgIH1cblxuICAgIHdoaWxlICh0aGlzLnBlZWtTdGFydHNXaXRoKCcvJykgJiYgIXRoaXMucGVla1N0YXJ0c1dpdGgoJy8vJykgJiYgIXRoaXMucGVla1N0YXJ0c1dpdGgoJy8oJykpIHtcbiAgICAgIHRoaXMuY2FwdHVyZSgnLycpO1xuICAgICAgc2VnbWVudHMucHVzaCh0aGlzLnBhcnNlU2VnbWVudCgpKTtcbiAgICB9XG5cbiAgICBsZXQgY2hpbGRyZW46IHtbb3V0bGV0OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJy8oJykpIHtcbiAgICAgIHRoaXMuY2FwdHVyZSgnLycpO1xuICAgICAgY2hpbGRyZW4gPSB0aGlzLnBhcnNlUGFyZW5zKHRydWUpO1xuICAgIH1cblxuICAgIGxldCByZXM6IHtbb3V0bGV0OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9ID0ge307XG4gICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJygnKSkge1xuICAgICAgcmVzID0gdGhpcy5wYXJzZVBhcmVucyhmYWxzZSk7XG4gICAgfVxuXG4gICAgaWYgKHNlZ21lbnRzLmxlbmd0aCA+IDAgfHwgT2JqZWN0LmtleXMoY2hpbGRyZW4pLmxlbmd0aCA+IDApIHtcbiAgICAgIHJlc1tQUklNQVJZX09VVExFVF0gPSBuZXcgVXJsU2VnbWVudEdyb3VwKHNlZ21lbnRzLCBjaGlsZHJlbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIC8vIHBhcnNlIGEgc2VnbWVudCB3aXRoIGl0cyBtYXRyaXggcGFyYW1ldGVyc1xuICAvLyBpZSBgbmFtZTtrMT12MTtrMmBcbiAgcHJpdmF0ZSBwYXJzZVNlZ21lbnQoKTogVXJsU2VnbWVudCB7XG4gICAgY29uc3QgcGF0aCA9IG1hdGNoU2VnbWVudHModGhpcy5yZW1haW5pbmcpO1xuICAgIGlmIChwYXRoID09PSAnJyAmJiB0aGlzLnBlZWtTdGFydHNXaXRoKCc7JykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRW1wdHkgcGF0aCB1cmwgc2VnbWVudCBjYW5ub3QgaGF2ZSBwYXJhbWV0ZXJzOiAnJHt0aGlzLnJlbWFpbmluZ30nLmApO1xuICAgIH1cblxuICAgIHRoaXMuY2FwdHVyZShwYXRoKTtcbiAgICByZXR1cm4gbmV3IFVybFNlZ21lbnQoZGVjb2RlKHBhdGgpLCB0aGlzLnBhcnNlTWF0cml4UGFyYW1zKCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZU1hdHJpeFBhcmFtcygpOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSB7XG4gICAgY29uc3QgcGFyYW1zOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICAgIHdoaWxlICh0aGlzLmNvbnN1bWVPcHRpb25hbCgnOycpKSB7XG4gICAgICB0aGlzLnBhcnNlUGFyYW0ocGFyYW1zKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcztcbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VQYXJhbShwYXJhbXM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KTogdm9pZCB7XG4gICAgY29uc3Qga2V5ID0gbWF0Y2hTZWdtZW50cyh0aGlzLnJlbWFpbmluZyk7XG4gICAgaWYgKCFrZXkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5jYXB0dXJlKGtleSk7XG4gICAgbGV0IHZhbHVlOiBhbnkgPSAnJztcbiAgICBpZiAodGhpcy5jb25zdW1lT3B0aW9uYWwoJz0nKSkge1xuICAgICAgY29uc3QgdmFsdWVNYXRjaCA9IG1hdGNoU2VnbWVudHModGhpcy5yZW1haW5pbmcpO1xuICAgICAgaWYgKHZhbHVlTWF0Y2gpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZU1hdGNoO1xuICAgICAgICB0aGlzLmNhcHR1cmUodmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHBhcmFtc1tkZWNvZGUoa2V5KV0gPSBkZWNvZGUodmFsdWUpO1xuICB9XG5cbiAgLy8gUGFyc2UgYSBzaW5nbGUgcXVlcnkgcGFyYW1ldGVyIGBuYW1lWz12YWx1ZV1gXG4gIHByaXZhdGUgcGFyc2VRdWVyeVBhcmFtKHBhcmFtczogUGFyYW1zKTogdm9pZCB7XG4gICAgY29uc3Qga2V5ID0gbWF0Y2hRdWVyeVBhcmFtcyh0aGlzLnJlbWFpbmluZyk7XG4gICAgaWYgKCFrZXkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5jYXB0dXJlKGtleSk7XG4gICAgbGV0IHZhbHVlOiBhbnkgPSAnJztcbiAgICBpZiAodGhpcy5jb25zdW1lT3B0aW9uYWwoJz0nKSkge1xuICAgICAgY29uc3QgdmFsdWVNYXRjaCA9IG1hdGNoVXJsUXVlcnlQYXJhbVZhbHVlKHRoaXMucmVtYWluaW5nKTtcbiAgICAgIGlmICh2YWx1ZU1hdGNoKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWVNYXRjaDtcbiAgICAgICAgdGhpcy5jYXB0dXJlKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBkZWNvZGVkS2V5ID0gZGVjb2RlUXVlcnkoa2V5KTtcbiAgICBjb25zdCBkZWNvZGVkVmFsID0gZGVjb2RlUXVlcnkodmFsdWUpO1xuXG4gICAgaWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShkZWNvZGVkS2V5KSkge1xuICAgICAgLy8gQXBwZW5kIHRvIGV4aXN0aW5nIHZhbHVlc1xuICAgICAgbGV0IGN1cnJlbnRWYWwgPSBwYXJhbXNbZGVjb2RlZEtleV07XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkoY3VycmVudFZhbCkpIHtcbiAgICAgICAgY3VycmVudFZhbCA9IFtjdXJyZW50VmFsXTtcbiAgICAgICAgcGFyYW1zW2RlY29kZWRLZXldID0gY3VycmVudFZhbDtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnRWYWwucHVzaChkZWNvZGVkVmFsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQ3JlYXRlIGEgbmV3IHZhbHVlXG4gICAgICBwYXJhbXNbZGVjb2RlZEtleV0gPSBkZWNvZGVkVmFsO1xuICAgIH1cbiAgfVxuXG4gIC8vIHBhcnNlIGAoYS9iLy9vdXRsZXRfbmFtZTpjL2QpYFxuICBwcml2YXRlIHBhcnNlUGFyZW5zKGFsbG93UHJpbWFyeTogYm9vbGVhbik6IHtbb3V0bGV0OiBzdHJpbmddOiBVcmxTZWdtZW50R3JvdXB9IHtcbiAgICBjb25zdCBzZWdtZW50czoge1trZXk6IHN0cmluZ106IFVybFNlZ21lbnRHcm91cH0gPSB7fTtcbiAgICB0aGlzLmNhcHR1cmUoJygnKTtcblxuICAgIHdoaWxlICghdGhpcy5jb25zdW1lT3B0aW9uYWwoJyknKSAmJiB0aGlzLnJlbWFpbmluZy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBwYXRoID0gbWF0Y2hTZWdtZW50cyh0aGlzLnJlbWFpbmluZyk7XG5cbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnJlbWFpbmluZ1twYXRoLmxlbmd0aF07XG5cbiAgICAgIC8vIGlmIGlzIGlzIG5vdCBvbmUgb2YgdGhlc2UgY2hhcmFjdGVycywgdGhlbiB0aGUgc2VnbWVudCB3YXMgdW5lc2NhcGVkXG4gICAgICAvLyBvciB0aGUgZ3JvdXAgd2FzIG5vdCBjbG9zZWRcbiAgICAgIGlmIChuZXh0ICE9PSAnLycgJiYgbmV4dCAhPT0gJyknICYmIG5leHQgIT09ICc7Jykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBwYXJzZSB1cmwgJyR7dGhpcy51cmx9J2ApO1xuICAgICAgfVxuXG4gICAgICBsZXQgb3V0bGV0TmFtZTogc3RyaW5nID0gdW5kZWZpbmVkITtcbiAgICAgIGlmIChwYXRoLmluZGV4T2YoJzonKSA+IC0xKSB7XG4gICAgICAgIG91dGxldE5hbWUgPSBwYXRoLnN1YnN0cigwLCBwYXRoLmluZGV4T2YoJzonKSk7XG4gICAgICAgIHRoaXMuY2FwdHVyZShvdXRsZXROYW1lKTtcbiAgICAgICAgdGhpcy5jYXB0dXJlKCc6Jyk7XG4gICAgICB9IGVsc2UgaWYgKGFsbG93UHJpbWFyeSkge1xuICAgICAgICBvdXRsZXROYW1lID0gUFJJTUFSWV9PVVRMRVQ7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNoaWxkcmVuID0gdGhpcy5wYXJzZUNoaWxkcmVuKCk7XG4gICAgICBzZWdtZW50c1tvdXRsZXROYW1lXSA9IE9iamVjdC5rZXlzKGNoaWxkcmVuKS5sZW5ndGggPT09IDEgPyBjaGlsZHJlbltQUklNQVJZX09VVExFVF0gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFVybFNlZ21lbnRHcm91cChbXSwgY2hpbGRyZW4pO1xuICAgICAgdGhpcy5jb25zdW1lT3B0aW9uYWwoJy8vJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlZ21lbnRzO1xuICB9XG5cbiAgcHJpdmF0ZSBwZWVrU3RhcnRzV2l0aChzdHI6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnJlbWFpbmluZy5zdGFydHNXaXRoKHN0cik7XG4gIH1cblxuICAvLyBDb25zdW1lcyB0aGUgcHJlZml4IHdoZW4gaXQgaXMgcHJlc2VudCBhbmQgcmV0dXJucyB3aGV0aGVyIGl0IGhhcyBiZWVuIGNvbnN1bWVkXG4gIHByaXZhdGUgY29uc3VtZU9wdGlvbmFsKHN0cjogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoc3RyKSkge1xuICAgICAgdGhpcy5yZW1haW5pbmcgPSB0aGlzLnJlbWFpbmluZy5zdWJzdHJpbmcoc3RyLmxlbmd0aCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBjYXB0dXJlKHN0cjogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmNvbnN1bWVPcHRpb25hbChzdHIpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIFwiJHtzdHJ9XCIuYCk7XG4gICAgfVxuICB9XG59XG4iXX0=