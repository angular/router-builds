/**
 * @license Angular v20.2.0-next.3+sha-3e6e1c1
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */

import { DOCUMENT, Location } from '@angular/common';
import * as i0 from '@angular/core';
import { ɵisPromise as _isPromise, ɵRuntimeError as _RuntimeError, Injectable, ɵisNgModule as _isNgModule, isStandalone, createEnvironmentInjector, InjectionToken, EventEmitter, input, inject, ViewContainerRef, ChangeDetectorRef, Directive, Input, Output, reflectComponentType, Component, ɵisInjectable as _isInjectable, runInInjectionContext, Compiler, NgModuleFactory, afterNextRender, EnvironmentInjector, DestroyRef, ɵConsole as _Console, ɵPendingTasksInternal as _PendingTasksInternal, ɵINTERNAL_APPLICATION_ERROR_HANDLER as _INTERNAL_APPLICATION_ERROR_HANDLER } from '@angular/core';
import { isObservable, from, of, BehaviorSubject, combineLatest, EmptyError, concat, defer, pipe, throwError, EMPTY, ConnectableObservable, Subject, Observable, Subscription } from 'rxjs';
import { map, switchMap, take, startWith, filter, mergeMap, first, concatMap, tap, catchError, scan, defaultIfEmpty, last as last$1, takeLast, finalize, refCount, takeUntil } from 'rxjs/operators';
import * as i1 from '@angular/platform-browser';

/**
 * The primary routing outlet.
 *
 * @publicApi
 */
const PRIMARY_OUTLET = 'primary';
/**
 * A private symbol used to store the value of `Route.title` inside the `Route.data` if it is a
 * static string or `Route.resolve` if anything else. This allows us to reuse the existing route
 * data/resolvers to support the title feature without new instrumentation in the `Router` pipeline.
 */
const RouteTitleKey = /* @__PURE__ */ Symbol('RouteTitle');
class ParamsAsMap {
    params;
    constructor(params) {
        this.params = params || {};
    }
    has(name) {
        return Object.prototype.hasOwnProperty.call(this.params, name);
    }
    get(name) {
        if (this.has(name)) {
            const v = this.params[name];
            return Array.isArray(v) ? v[0] : v;
        }
        return null;
    }
    getAll(name) {
        if (this.has(name)) {
            const v = this.params[name];
            return Array.isArray(v) ? v : [v];
        }
        return [];
    }
    get keys() {
        return Object.keys(this.params);
    }
}
/**
 * Converts a `Params` instance to a `ParamMap`.
 * @param params The instance to convert.
 * @returns The new map instance.
 *
 * @publicApi
 */
function convertToParamMap(params) {
    return new ParamsAsMap(params);
}
/**
 * Matches the route configuration (`route`) against the actual URL (`segments`).
 *
 * When no matcher is defined on a `Route`, this is the matcher used by the Router by default.
 *
 * @param segments The remaining unmatched segments in the current navigation
 * @param segmentGroup The current segment group being matched
 * @param route The `Route` to match against.
 *
 * @see {@link UrlMatchResult}
 * @see {@link Route}
 *
 * @returns The resulting match information or `null` if the `route` should not match.
 * @publicApi
 */
function defaultUrlMatcher(segments, segmentGroup, route) {
    const parts = route.path.split('/');
    if (parts.length > segments.length) {
        // The actual URL is shorter than the config, no match
        return null;
    }
    if (route.pathMatch === 'full' &&
        (segmentGroup.hasChildren() || parts.length < segments.length)) {
        // The config is longer than the actual URL but we are looking for a full match, return null
        return null;
    }
    const posParams = {};
    // Check each config part against the actual URL
    for (let index = 0; index < parts.length; index++) {
        const part = parts[index];
        const segment = segments[index];
        const isParameter = part[0] === ':';
        if (isParameter) {
            posParams[part.substring(1)] = segment;
        }
        else if (part !== segment.path) {
            // The actual URL part does not match the config, no match
            return null;
        }
    }
    return { consumed: segments.slice(0, parts.length), posParams };
}

function shallowEqualArrays(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; ++i) {
        if (!shallowEqual(a[i], b[i]))
            return false;
    }
    return true;
}
function shallowEqual(a, b) {
    // While `undefined` should never be possible, it would sometimes be the case in IE 11
    // and pre-chromium Edge. The check below accounts for this edge case.
    const k1 = a ? getDataKeys(a) : undefined;
    const k2 = b ? getDataKeys(b) : undefined;
    if (!k1 || !k2 || k1.length != k2.length) {
        return false;
    }
    let key;
    for (let i = 0; i < k1.length; i++) {
        key = k1[i];
        if (!equalArraysOrString(a[key], b[key])) {
            return false;
        }
    }
    return true;
}
/**
 * Gets the keys of an object, including `symbol` keys.
 */
function getDataKeys(obj) {
    return [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)];
}
/**
 * Test equality for arrays of strings or a string.
 */
function equalArraysOrString(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length)
            return false;
        const aSorted = [...a].sort();
        const bSorted = [...b].sort();
        return aSorted.every((val, index) => bSorted[index] === val);
    }
    else {
        return a === b;
    }
}
/**
 * Return the last element of an array.
 */
function last(a) {
    return a.length > 0 ? a[a.length - 1] : null;
}
function wrapIntoObservable(value) {
    if (isObservable(value)) {
        return value;
    }
    if (_isPromise(value)) {
        // Use `Promise.resolve()` to wrap promise-like instances.
        // Required ie when a Resolver returns a AngularJS `$q` promise to correctly trigger the
        // change detection.
        return from(Promise.resolve(value));
    }
    return of(value);
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
function containsTree(container, containee, options) {
    return (pathCompareMap[options.paths](container.root, containee.root, options.matrixParams) &&
        paramCompareMap[options.queryParams](container.queryParams, containee.queryParams) &&
        !(options.fragment === 'exact' && container.fragment !== containee.fragment));
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
    return (Object.keys(containee).length <= Object.keys(container).length &&
        Object.keys(containee).every((key) => equalArraysOrString(container[key], containee[key])));
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
 * ```ts
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
class UrlTree {
    root;
    queryParams;
    fragment;
    /** @internal */
    _queryParamMap;
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
                throw new _RuntimeError(4015 /* RuntimeErrorCode.INVALID_ROOT_URL_SEGMENT */, 'The root `UrlSegmentGroup` should not contain `segments`. ' +
                    'Instead, these segments belong in the `children` so they can be associated with a named outlet.');
            }
        }
    }
    get queryParamMap() {
        this._queryParamMap ??= convertToParamMap(this.queryParams);
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
class UrlSegmentGroup {
    segments;
    children;
    /** The parent node in the url tree */
    parent = null;
    constructor(
    /** The URL segments of this group. See `UrlSegment` for more information */
    segments, 
    /** The list of children of this group */
    children) {
        this.segments = segments;
        this.children = children;
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
 * ```ts
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
class UrlSegment {
    path;
    parameters;
    /** @internal */
    _parameterMap;
    constructor(
    /** The path part of a URL segment */
    path, 
    /** The matrix parameters associated with a segment */
    parameters) {
        this.path = path;
        this.parameters = parameters;
    }
    get parameterMap() {
        this._parameterMap ??= convertToParamMap(this.parameters);
        return this._parameterMap;
    }
    /** @docsNotRequired */
    toString() {
        return serializePath(this);
    }
}
function equalSegments(as, bs) {
    return equalPath(as, bs) && as.every((a, i) => shallowEqual(a.parameters, bs[i].parameters));
}
function equalPath(as, bs) {
    if (as.length !== bs.length)
        return false;
    return as.every((a, i) => a.path === bs[i].path);
}
function mapChildrenIntoArray(segment, fn) {
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
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: UrlSerializer, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: UrlSerializer, providedIn: 'root', useFactory: () => new DefaultUrlSerializer() });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: UrlSerializer, decorators: [{
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
class DefaultUrlSerializer {
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
function serializePaths(segment) {
    return segment.segments.map((p) => serializePath(p)).join('/');
}
function serializeSegment(segment, root) {
    if (!segment.hasChildren()) {
        return serializePaths(segment);
    }
    if (root) {
        const primary = segment.children[PRIMARY_OUTLET]
            ? serializeSegment(segment.children[PRIMARY_OUTLET], false)
            : '';
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
function encodeUriQuery(s) {
    return encodeUriString(s).replace(/%3B/gi, ';');
}
/**
 * This function should be used to encode a URL fragment. In the following URL, you need to call
 * encodeUriFragment on "f":
 *
 * http://www.site.org/html;mk=mv?k=v#f
 */
function encodeUriFragment(s) {
    return encodeURI(s);
}
/**
 * This function should be run on any URI segment as well as the key and value in a key/value
 * pair for matrix params. In the following URL, you need to call encodeUriSegment on "html",
 * "mk", and "mv":
 *
 * http://www.site.org/html;mk=mv?k=v#f
 */
function encodeUriSegment(s) {
    return encodeUriString(s).replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/%26/gi, '&');
}
function decode(s) {
    return decodeURIComponent(s);
}
// Query keys/values should have the "+" replaced first, as "+" in a query string is " ".
// decodeURIComponent function will not decode "+" as a space.
function decodeQuery(s) {
    return decode(s.replace(/\+/g, '%20'));
}
function serializePath(path) {
    return `${encodeUriSegment(path.path)}${serializeMatrixParams(path.parameters)}`;
}
function serializeMatrixParams(params) {
    return Object.entries(params)
        .map(([key, value]) => `;${encodeUriSegment(key)}=${encodeUriSegment(value)}`)
        .join('');
}
function serializeQueryParams(params) {
    const strParams = Object.entries(params)
        .map(([name, value]) => {
        return Array.isArray(value)
            ? value.map((v) => `${encodeUriQuery(name)}=${encodeUriQuery(v)}`).join('&')
            : `${encodeUriQuery(name)}=${encodeUriQuery(value)}`;
    })
        .filter((s) => s);
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
    url;
    remaining;
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
            throw new _RuntimeError(4009 /* RuntimeErrorCode.EMPTY_PATH_WITH_PARAMS */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
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
                throw new _RuntimeError(4010 /* RuntimeErrorCode.UNPARSABLE_URL */, (typeof ngDevMode === 'undefined' || ngDevMode) && `Cannot parse url '${this.url}'`);
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
            segments[outletName] =
                Object.keys(children).length === 1
                    ? children[PRIMARY_OUTLET]
                    : new UrlSegmentGroup([], children);
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
            throw new _RuntimeError(4011 /* RuntimeErrorCode.UNEXPECTED_VALUE_IN_URL */, (typeof ngDevMode === 'undefined' || ngDevMode) && `Expected "${str}".`);
        }
    }
}
function createRoot(rootCandidate) {
    return rootCandidate.segments.length > 0
        ? new UrlSegmentGroup([], { [PRIMARY_OUTLET]: rootCandidate })
        : rootCandidate;
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
function squashSegmentGroup(segmentGroup) {
    const newChildren = {};
    for (const [childOutlet, child] of Object.entries(segmentGroup.children)) {
        const childCandidate = squashSegmentGroup(child);
        // moves named children in an empty path primary child into this group
        if (childOutlet === PRIMARY_OUTLET &&
            childCandidate.segments.length === 0 &&
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
function isUrlTree(v) {
    return v instanceof UrlTree;
}

/**
 * Creates a `UrlTree` relative to an `ActivatedRouteSnapshot`.
 *
 * @publicApi
 *
 *
 * @param relativeTo The `ActivatedRouteSnapshot` to apply the commands to
 * @param commands An array of URL fragments with which to construct the new URL tree.
 * If the path is static, can be the literal URL string. For a dynamic path, pass an array of path
 * segments, followed by the parameters for each segment.
 * The fragments are applied to the one provided in the `relativeTo` parameter.
 * @param queryParams The query parameters for the `UrlTree`. `null` if the `UrlTree` does not have
 *     any query parameters.
 * @param fragment The fragment for the `UrlTree`. `null` if the `UrlTree` does not have a fragment.
 *
 * @usageNotes
 *
 * ```ts
 * // create /team/33/user/11
 * createUrlTreeFromSnapshot(snapshot, ['/team', 33, 'user', 11]);
 *
 * // create /team/33;expand=true/user/11
 * createUrlTreeFromSnapshot(snapshot, ['/team', 33, {expand: true}, 'user', 11]);
 *
 * // you can collapse static segments like this (this works only with the first passed-in value):
 * createUrlTreeFromSnapshot(snapshot, ['/team/33/user', userId]);
 *
 * // If the first segment can contain slashes, and you do not want the router to split it,
 * // you can do the following:
 * createUrlTreeFromSnapshot(snapshot, [{segmentPath: '/one/two'}]);
 *
 * // create /team/33/(user/11//right:chat)
 * createUrlTreeFromSnapshot(snapshot, ['/team', 33, {outlets: {primary: 'user/11', right:
 * 'chat'}}], null, null);
 *
 * // remove the right secondary node
 * createUrlTreeFromSnapshot(snapshot, ['/team', 33, {outlets: {primary: 'user/11', right: null}}]);
 *
 * // For the examples below, assume the current URL is for the `/team/33/user/11` and the
 * `ActivatedRouteSnapshot` points to `user/11`:
 *
 * // navigate to /team/33/user/11/details
 * createUrlTreeFromSnapshot(snapshot, ['details']);
 *
 * // navigate to /team/33/user/22
 * createUrlTreeFromSnapshot(snapshot, ['../22']);
 *
 * // navigate to /team/44/user/22
 * createUrlTreeFromSnapshot(snapshot, ['../../team/44/user/22']);
 * ```
 */
function createUrlTreeFromSnapshot(relativeTo, commands, queryParams = null, fragment = null) {
    const relativeToUrlSegmentGroup = createSegmentGroupFromRoute(relativeTo);
    return createUrlTreeFromSegmentGroup(relativeToUrlSegmentGroup, commands, queryParams, fragment);
}
function createSegmentGroupFromRoute(route) {
    let targetGroup;
    function createSegmentGroupFromRouteRecursive(currentRoute) {
        const childOutlets = {};
        for (const childSnapshot of currentRoute.children) {
            const root = createSegmentGroupFromRouteRecursive(childSnapshot);
            childOutlets[childSnapshot.outlet] = root;
        }
        const segmentGroup = new UrlSegmentGroup(currentRoute.url, childOutlets);
        if (currentRoute === route) {
            targetGroup = segmentGroup;
        }
        return segmentGroup;
    }
    const rootCandidate = createSegmentGroupFromRouteRecursive(route.root);
    const rootSegmentGroup = createRoot(rootCandidate);
    return targetGroup ?? rootSegmentGroup;
}
function createUrlTreeFromSegmentGroup(relativeTo, commands, queryParams, fragment) {
    let root = relativeTo;
    while (root.parent) {
        root = root.parent;
    }
    // There are no commands so the `UrlTree` goes to the same path as the one created from the
    // `UrlSegmentGroup`. All we need to do is update the `queryParams` and `fragment` without
    // applying any other logic.
    if (commands.length === 0) {
        return tree(root, root, root, queryParams, fragment);
    }
    const nav = computeNavigation(commands);
    if (nav.toRoot()) {
        return tree(root, root, new UrlSegmentGroup([], {}), queryParams, fragment);
    }
    const position = findStartingPositionForTargetGroup(nav, root, relativeTo);
    const newSegmentGroup = position.processChildren
        ? updateSegmentGroupChildren(position.segmentGroup, position.index, nav.commands)
        : updateSegmentGroup(position.segmentGroup, position.index, nav.commands);
    return tree(root, position.segmentGroup, newSegmentGroup, queryParams, fragment);
}
function isMatrixParams(command) {
    return typeof command === 'object' && command != null && !command.outlets && !command.segmentPath;
}
/**
 * Determines if a given command has an `outlets` map. When we encounter a command
 * with an outlets k/v map, we need to apply each outlet individually to the existing segment.
 */
function isCommandWithOutlets(command) {
    return typeof command === 'object' && command != null && command.outlets;
}
function tree(oldRoot, oldSegmentGroup, newSegmentGroup, queryParams, fragment) {
    let qp = {};
    if (queryParams) {
        Object.entries(queryParams).forEach(([name, value]) => {
            qp[name] = Array.isArray(value) ? value.map((v) => `${v}`) : `${value}`;
        });
    }
    let rootCandidate;
    if (oldRoot === oldSegmentGroup) {
        rootCandidate = newSegmentGroup;
    }
    else {
        rootCandidate = replaceSegment(oldRoot, oldSegmentGroup, newSegmentGroup);
    }
    const newRoot = createRoot(squashSegmentGroup(rootCandidate));
    return new UrlTree(newRoot, qp, fragment);
}
/**
 * Replaces the `oldSegment` which is located in some child of the `current` with the `newSegment`.
 * This also has the effect of creating new `UrlSegmentGroup` copies to update references. This
 * shouldn't be necessary but the fallback logic for an invalid ActivatedRoute in the creation uses
 * the Router's current url tree. If we don't create new segment groups, we end up modifying that
 * value.
 */
function replaceSegment(current, oldSegment, newSegment) {
    const children = {};
    Object.entries(current.children).forEach(([outletName, c]) => {
        if (c === oldSegment) {
            children[outletName] = newSegment;
        }
        else {
            children[outletName] = replaceSegment(c, oldSegment, newSegment);
        }
    });
    return new UrlSegmentGroup(current.segments, children);
}
class Navigation {
    isAbsolute;
    numberOfDoubleDots;
    commands;
    constructor(isAbsolute, numberOfDoubleDots, commands) {
        this.isAbsolute = isAbsolute;
        this.numberOfDoubleDots = numberOfDoubleDots;
        this.commands = commands;
        if (isAbsolute && commands.length > 0 && isMatrixParams(commands[0])) {
            throw new _RuntimeError(4003 /* RuntimeErrorCode.ROOT_SEGMENT_MATRIX_PARAMS */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
                'Root segment cannot have matrix parameters');
        }
        const cmdWithOutlet = commands.find(isCommandWithOutlets);
        if (cmdWithOutlet && cmdWithOutlet !== last(commands)) {
            throw new _RuntimeError(4004 /* RuntimeErrorCode.MISPLACED_OUTLETS_COMMAND */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
                '{outlets:{}} has to be the last command');
        }
    }
    toRoot() {
        return this.isAbsolute && this.commands.length === 1 && this.commands[0] == '/';
    }
}
/** Transforms commands to a normalized `Navigation` */
function computeNavigation(commands) {
    if (typeof commands[0] === 'string' && commands.length === 1 && commands[0] === '/') {
        return new Navigation(true, 0, commands);
    }
    let numberOfDoubleDots = 0;
    let isAbsolute = false;
    const res = commands.reduce((res, cmd, cmdIdx) => {
        if (typeof cmd === 'object' && cmd != null) {
            if (cmd.outlets) {
                const outlets = {};
                Object.entries(cmd.outlets).forEach(([name, commands]) => {
                    outlets[name] = typeof commands === 'string' ? commands.split('/') : commands;
                });
                return [...res, { outlets }];
            }
            if (cmd.segmentPath) {
                return [...res, cmd.segmentPath];
            }
        }
        if (!(typeof cmd === 'string')) {
            return [...res, cmd];
        }
        if (cmdIdx === 0) {
            cmd.split('/').forEach((urlPart, partIndex) => {
                if (partIndex == 0 && urlPart === '.') ;
                else if (partIndex == 0 && urlPart === '') {
                    //  '/a'
                    isAbsolute = true;
                }
                else if (urlPart === '..') {
                    //  '../a'
                    numberOfDoubleDots++;
                }
                else if (urlPart != '') {
                    res.push(urlPart);
                }
            });
            return res;
        }
        return [...res, cmd];
    }, []);
    return new Navigation(isAbsolute, numberOfDoubleDots, res);
}
class Position {
    segmentGroup;
    processChildren;
    index;
    constructor(segmentGroup, processChildren, index) {
        this.segmentGroup = segmentGroup;
        this.processChildren = processChildren;
        this.index = index;
    }
}
function findStartingPositionForTargetGroup(nav, root, target) {
    if (nav.isAbsolute) {
        return new Position(root, true, 0);
    }
    if (!target) {
        // `NaN` is used only to maintain backwards compatibility with incorrectly mocked
        // `ActivatedRouteSnapshot` in tests. In prior versions of this code, the position here was
        // determined based on an internal property that was rarely mocked, resulting in `NaN`. In
        // reality, this code path should _never_ be touched since `target` is not allowed to be falsey.
        return new Position(root, false, NaN);
    }
    if (target.parent === null) {
        return new Position(target, true, 0);
    }
    const modifier = isMatrixParams(nav.commands[0]) ? 0 : 1;
    const index = target.segments.length - 1 + modifier;
    return createPositionApplyingDoubleDots(target, index, nav.numberOfDoubleDots);
}
function createPositionApplyingDoubleDots(group, index, numberOfDoubleDots) {
    let g = group;
    let ci = index;
    let dd = numberOfDoubleDots;
    while (dd > ci) {
        dd -= ci;
        g = g.parent;
        if (!g) {
            throw new _RuntimeError(4005 /* RuntimeErrorCode.INVALID_DOUBLE_DOTS */, (typeof ngDevMode === 'undefined' || ngDevMode) && "Invalid number of '../'");
        }
        ci = g.segments.length;
    }
    return new Position(g, false, ci - dd);
}
function getOutlets(commands) {
    if (isCommandWithOutlets(commands[0])) {
        return commands[0].outlets;
    }
    return { [PRIMARY_OUTLET]: commands };
}
function updateSegmentGroup(segmentGroup, startIndex, commands) {
    segmentGroup ??= new UrlSegmentGroup([], {});
    if (segmentGroup.segments.length === 0 && segmentGroup.hasChildren()) {
        return updateSegmentGroupChildren(segmentGroup, startIndex, commands);
    }
    const m = prefixedWith(segmentGroup, startIndex, commands);
    const slicedCommands = commands.slice(m.commandIndex);
    if (m.match && m.pathIndex < segmentGroup.segments.length) {
        const g = new UrlSegmentGroup(segmentGroup.segments.slice(0, m.pathIndex), {});
        g.children[PRIMARY_OUTLET] = new UrlSegmentGroup(segmentGroup.segments.slice(m.pathIndex), segmentGroup.children);
        return updateSegmentGroupChildren(g, 0, slicedCommands);
    }
    else if (m.match && slicedCommands.length === 0) {
        return new UrlSegmentGroup(segmentGroup.segments, {});
    }
    else if (m.match && !segmentGroup.hasChildren()) {
        return createNewSegmentGroup(segmentGroup, startIndex, commands);
    }
    else if (m.match) {
        return updateSegmentGroupChildren(segmentGroup, 0, slicedCommands);
    }
    else {
        return createNewSegmentGroup(segmentGroup, startIndex, commands);
    }
}
function updateSegmentGroupChildren(segmentGroup, startIndex, commands) {
    if (commands.length === 0) {
        return new UrlSegmentGroup(segmentGroup.segments, {});
    }
    else {
        const outlets = getOutlets(commands);
        const children = {};
        // If the set of commands applies to anything other than the primary outlet and the child
        // segment is an empty path primary segment on its own, we want to apply the commands to the
        // empty child path rather than here. The outcome is that the empty primary child is effectively
        // removed from the final output UrlTree. Imagine the following config:
        //
        // {path: '', children: [{path: '**', outlet: 'popup'}]}.
        //
        // Navigation to /(popup:a) will activate the child outlet correctly Given a follow-up
        // navigation with commands
        // ['/', {outlets: {'popup': 'b'}}], we _would not_ want to apply the outlet commands to the
        // root segment because that would result in
        // //(popup:a)(popup:b) since the outlet command got applied one level above where it appears in
        // the `ActivatedRoute` rather than updating the existing one.
        //
        // Because empty paths do not appear in the URL segments and the fact that the segments used in
        // the output `UrlTree` are squashed to eliminate these empty paths where possible
        // https://github.com/angular/angular/blob/13f10de40e25c6900ca55bd83b36bd533dacfa9e/packages/router/src/url_tree.ts#L755
        // it can be hard to determine what is the right thing to do when applying commands to a
        // `UrlSegmentGroup` that is created from an "unsquashed"/expanded `ActivatedRoute` tree.
        // This code effectively "squashes" empty path primary routes when they have no siblings on
        // the same level of the tree.
        if (Object.keys(outlets).some((o) => o !== PRIMARY_OUTLET) &&
            segmentGroup.children[PRIMARY_OUTLET] &&
            segmentGroup.numberOfChildren === 1 &&
            segmentGroup.children[PRIMARY_OUTLET].segments.length === 0) {
            const childrenOfEmptyChild = updateSegmentGroupChildren(segmentGroup.children[PRIMARY_OUTLET], startIndex, commands);
            return new UrlSegmentGroup(segmentGroup.segments, childrenOfEmptyChild.children);
        }
        Object.entries(outlets).forEach(([outlet, commands]) => {
            if (typeof commands === 'string') {
                commands = [commands];
            }
            if (commands !== null) {
                children[outlet] = updateSegmentGroup(segmentGroup.children[outlet], startIndex, commands);
            }
        });
        Object.entries(segmentGroup.children).forEach(([childOutlet, child]) => {
            if (outlets[childOutlet] === undefined) {
                children[childOutlet] = child;
            }
        });
        return new UrlSegmentGroup(segmentGroup.segments, children);
    }
}
function prefixedWith(segmentGroup, startIndex, commands) {
    let currentCommandIndex = 0;
    let currentPathIndex = startIndex;
    const noMatch = { match: false, pathIndex: 0, commandIndex: 0 };
    while (currentPathIndex < segmentGroup.segments.length) {
        if (currentCommandIndex >= commands.length)
            return noMatch;
        const path = segmentGroup.segments[currentPathIndex];
        const command = commands[currentCommandIndex];
        // Do not try to consume command as part of the prefixing if it has outlets because it can
        // contain outlets other than the one being processed. Consuming the outlets command would
        // result in other outlets being ignored.
        if (isCommandWithOutlets(command)) {
            break;
        }
        const curr = `${command}`;
        const next = currentCommandIndex < commands.length - 1 ? commands[currentCommandIndex + 1] : null;
        if (currentPathIndex > 0 && curr === undefined)
            break;
        if (curr && next && typeof next === 'object' && next.outlets === undefined) {
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
    return { match: true, pathIndex: currentPathIndex, commandIndex: currentCommandIndex };
}
function createNewSegmentGroup(segmentGroup, startIndex, commands) {
    const paths = segmentGroup.segments.slice(0, startIndex);
    let i = 0;
    while (i < commands.length) {
        const command = commands[i];
        if (isCommandWithOutlets(command)) {
            const children = createNewSegmentChildren(command.outlets);
            return new UrlSegmentGroup(paths, children);
        }
        // if we start with an object literal, we need to reuse the path part from the segment
        if (i === 0 && isMatrixParams(commands[0])) {
            const p = segmentGroup.segments[startIndex];
            paths.push(new UrlSegment(p.path, stringify(commands[0])));
            i++;
            continue;
        }
        const curr = isCommandWithOutlets(command) ? command.outlets[PRIMARY_OUTLET] : `${command}`;
        const next = i < commands.length - 1 ? commands[i + 1] : null;
        if (curr && next && isMatrixParams(next)) {
            paths.push(new UrlSegment(curr, stringify(next)));
            i += 2;
        }
        else {
            paths.push(new UrlSegment(curr, {}));
            i++;
        }
    }
    return new UrlSegmentGroup(paths, {});
}
function createNewSegmentChildren(outlets) {
    const children = {};
    Object.entries(outlets).forEach(([outlet, commands]) => {
        if (typeof commands === 'string') {
            commands = [commands];
        }
        if (commands !== null) {
            children[outlet] = createNewSegmentGroup(new UrlSegmentGroup([], {}), 0, commands);
        }
    });
    return children;
}
function stringify(params) {
    const res = {};
    Object.entries(params).forEach(([k, v]) => (res[k] = `${v}`));
    return res;
}
function compare(path, params, segment) {
    return path == segment.path && shallowEqual(params, segment.parameters);
}

const IMPERATIVE_NAVIGATION = 'imperative';
/**
 * Identifies the type of a router event.
 *
 * @publicApi
 */
var EventType;
(function (EventType) {
    EventType[EventType["NavigationStart"] = 0] = "NavigationStart";
    EventType[EventType["NavigationEnd"] = 1] = "NavigationEnd";
    EventType[EventType["NavigationCancel"] = 2] = "NavigationCancel";
    EventType[EventType["NavigationError"] = 3] = "NavigationError";
    EventType[EventType["RoutesRecognized"] = 4] = "RoutesRecognized";
    EventType[EventType["ResolveStart"] = 5] = "ResolveStart";
    EventType[EventType["ResolveEnd"] = 6] = "ResolveEnd";
    EventType[EventType["GuardsCheckStart"] = 7] = "GuardsCheckStart";
    EventType[EventType["GuardsCheckEnd"] = 8] = "GuardsCheckEnd";
    EventType[EventType["RouteConfigLoadStart"] = 9] = "RouteConfigLoadStart";
    EventType[EventType["RouteConfigLoadEnd"] = 10] = "RouteConfigLoadEnd";
    EventType[EventType["ChildActivationStart"] = 11] = "ChildActivationStart";
    EventType[EventType["ChildActivationEnd"] = 12] = "ChildActivationEnd";
    EventType[EventType["ActivationStart"] = 13] = "ActivationStart";
    EventType[EventType["ActivationEnd"] = 14] = "ActivationEnd";
    EventType[EventType["Scroll"] = 15] = "Scroll";
    EventType[EventType["NavigationSkipped"] = 16] = "NavigationSkipped";
})(EventType || (EventType = {}));
/**
 * Base for events the router goes through, as opposed to events tied to a specific
 * route. Fired one time for any given navigation.
 *
 * The following code shows how a class subscribes to router events.
 *
 * ```ts
 * import {Event, RouterEvent, Router} from '@angular/router';
 *
 * class MyService {
 *   constructor(public router: Router) {
 *     router.events.pipe(
 *        filter((e: Event | RouterEvent): e is RouterEvent => e instanceof RouterEvent)
 *     ).subscribe((e: RouterEvent) => {
 *       // Do something
 *     });
 *   }
 * }
 * ```
 *
 * @see {@link Event}
 * @see [Router events summary](guide/routing/router-reference#router-events)
 * @publicApi
 */
class RouterEvent {
    id;
    url;
    constructor(
    /** A unique ID that the router assigns to every router navigation. */
    id, 
    /** The URL that is the destination for this navigation. */
    url) {
        this.id = id;
        this.url = url;
    }
}
/**
 * An event triggered when a navigation starts.
 *
 * @publicApi
 */
class NavigationStart extends RouterEvent {
    type = EventType.NavigationStart;
    /**
     * Identifies the call or event that triggered the navigation.
     * An `imperative` trigger is a call to `router.navigateByUrl()` or `router.navigate()`.
     *
     * @see {@link NavigationEnd}
     * @see {@link NavigationCancel}
     * @see {@link NavigationError}
     */
    navigationTrigger;
    /**
     * The navigation state that was previously supplied to the `pushState` call,
     * when the navigation is triggered by a `popstate` event. Otherwise null.
     *
     * The state object is defined by `NavigationExtras`, and contains any
     * developer-defined state value, as well as a unique ID that
     * the router assigns to every router transition/navigation.
     *
     * From the perspective of the router, the router never "goes back".
     * When the user clicks on the back button in the browser,
     * a new navigation ID is created.
     *
     * Use the ID in this previous-state object to differentiate between a newly created
     * state and one returned to by a `popstate` event, so that you can restore some
     * remembered state, such as scroll position.
     *
     */
    restoredState;
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /** @docsNotRequired */
    navigationTrigger = 'imperative', 
    /** @docsNotRequired */
    restoredState = null) {
        super(id, url);
        this.navigationTrigger = navigationTrigger;
        this.restoredState = restoredState;
    }
    /** @docsNotRequired */
    toString() {
        return `NavigationStart(id: ${this.id}, url: '${this.url}')`;
    }
}
/**
 * An event triggered when a navigation ends successfully.
 *
 * @see {@link NavigationStart}
 * @see {@link NavigationCancel}
 * @see {@link NavigationError}
 *
 * @publicApi
 */
class NavigationEnd extends RouterEvent {
    urlAfterRedirects;
    type = EventType.NavigationEnd;
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /** @docsNotRequired */
    urlAfterRedirects) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
    }
    /** @docsNotRequired */
    toString() {
        return `NavigationEnd(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}')`;
    }
}
/**
 * A code for the `NavigationCancel` event of the `Router` to indicate the
 * reason a navigation failed.
 *
 * @publicApi
 */
var NavigationCancellationCode;
(function (NavigationCancellationCode) {
    /**
     * A navigation failed because a guard returned a `UrlTree` to redirect.
     */
    NavigationCancellationCode[NavigationCancellationCode["Redirect"] = 0] = "Redirect";
    /**
     * A navigation failed because a more recent navigation started.
     */
    NavigationCancellationCode[NavigationCancellationCode["SupersededByNewNavigation"] = 1] = "SupersededByNewNavigation";
    /**
     * A navigation failed because one of the resolvers completed without emitting a value.
     */
    NavigationCancellationCode[NavigationCancellationCode["NoDataFromResolver"] = 2] = "NoDataFromResolver";
    /**
     * A navigation failed because a guard returned `false`.
     */
    NavigationCancellationCode[NavigationCancellationCode["GuardRejected"] = 3] = "GuardRejected";
    /**
     * A navigation was aborted by the `Navigation.abort` function.
     *
     * @see {@link Navigation}
     */
    NavigationCancellationCode[NavigationCancellationCode["Aborted"] = 4] = "Aborted";
})(NavigationCancellationCode || (NavigationCancellationCode = {}));
/**
 * A code for the `NavigationSkipped` event of the `Router` to indicate the
 * reason a navigation was skipped.
 *
 * @publicApi
 */
var NavigationSkippedCode;
(function (NavigationSkippedCode) {
    /**
     * A navigation was skipped because the navigation URL was the same as the current Router URL.
     */
    NavigationSkippedCode[NavigationSkippedCode["IgnoredSameUrlNavigation"] = 0] = "IgnoredSameUrlNavigation";
    /**
     * A navigation was skipped because the configured `UrlHandlingStrategy` return `false` for both
     * the current Router URL and the target of the navigation.
     *
     * @see {@link UrlHandlingStrategy}
     */
    NavigationSkippedCode[NavigationSkippedCode["IgnoredByUrlHandlingStrategy"] = 1] = "IgnoredByUrlHandlingStrategy";
})(NavigationSkippedCode || (NavigationSkippedCode = {}));
/**
 * An event triggered when a navigation is canceled, directly or indirectly.
 * This can happen for several reasons including when a route guard
 * returns `false` or initiates a redirect by returning a `UrlTree`.
 *
 * @see {@link NavigationStart}
 * @see {@link NavigationEnd}
 * @see {@link NavigationError}
 *
 * @publicApi
 */
class NavigationCancel extends RouterEvent {
    reason;
    code;
    type = EventType.NavigationCancel;
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /**
     * A description of why the navigation was cancelled. For debug purposes only. Use `code`
     * instead for a stable cancellation reason that can be used in production.
     */
    reason, 
    /**
     * A code to indicate why the navigation was canceled. This cancellation code is stable for
     * the reason and can be relied on whereas the `reason` string could change and should not be
     * used in production.
     */
    code) {
        super(id, url);
        this.reason = reason;
        this.code = code;
    }
    /** @docsNotRequired */
    toString() {
        return `NavigationCancel(id: ${this.id}, url: '${this.url}')`;
    }
}
/**
 * An event triggered when a navigation is skipped.
 * This can happen for a couple reasons including onSameUrlHandling
 * is set to `ignore` and the navigation URL is not different than the
 * current state.
 *
 * @publicApi
 */
class NavigationSkipped extends RouterEvent {
    reason;
    code;
    type = EventType.NavigationSkipped;
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /**
     * A description of why the navigation was skipped. For debug purposes only. Use `code`
     * instead for a stable skipped reason that can be used in production.
     */
    reason, 
    /**
     * A code to indicate why the navigation was skipped. This code is stable for
     * the reason and can be relied on whereas the `reason` string could change and should not be
     * used in production.
     */
    code) {
        super(id, url);
        this.reason = reason;
        this.code = code;
    }
}
/**
 * An event triggered when a navigation fails due to an unexpected error.
 *
 * @see {@link NavigationStart}
 * @see {@link NavigationEnd}
 * @see {@link NavigationCancel}
 *
 * @publicApi
 */
class NavigationError extends RouterEvent {
    error;
    target;
    type = EventType.NavigationError;
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /** @docsNotRequired */
    error, 
    /**
     * The target of the navigation when the error occurred.
     *
     * Note that this can be `undefined` because an error could have occurred before the
     * `RouterStateSnapshot` was created for the navigation.
     */
    target) {
        super(id, url);
        this.error = error;
        this.target = target;
    }
    /** @docsNotRequired */
    toString() {
        return `NavigationError(id: ${this.id}, url: '${this.url}', error: ${this.error})`;
    }
}
/**
 * An event triggered when routes are recognized.
 *
 * @publicApi
 */
class RoutesRecognized extends RouterEvent {
    urlAfterRedirects;
    state;
    type = EventType.RoutesRecognized;
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /** @docsNotRequired */
    urlAfterRedirects, 
    /** @docsNotRequired */
    state) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
        this.state = state;
    }
    /** @docsNotRequired */
    toString() {
        return `RoutesRecognized(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`;
    }
}
/**
 * An event triggered at the start of the Guard phase of routing.
 *
 * @see {@link GuardsCheckEnd}
 *
 * @publicApi
 */
class GuardsCheckStart extends RouterEvent {
    urlAfterRedirects;
    state;
    type = EventType.GuardsCheckStart;
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /** @docsNotRequired */
    urlAfterRedirects, 
    /** @docsNotRequired */
    state) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
        this.state = state;
    }
    toString() {
        return `GuardsCheckStart(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`;
    }
}
/**
 * An event triggered at the end of the Guard phase of routing.
 *
 * @see {@link GuardsCheckStart}
 *
 * @publicApi
 */
class GuardsCheckEnd extends RouterEvent {
    urlAfterRedirects;
    state;
    shouldActivate;
    type = EventType.GuardsCheckEnd;
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /** @docsNotRequired */
    urlAfterRedirects, 
    /** @docsNotRequired */
    state, 
    /** @docsNotRequired */
    shouldActivate) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
        this.state = state;
        this.shouldActivate = shouldActivate;
    }
    toString() {
        return `GuardsCheckEnd(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state}, shouldActivate: ${this.shouldActivate})`;
    }
}
/**
 * An event triggered at the start of the Resolve phase of routing.
 *
 * Runs in the "resolve" phase whether or not there is anything to resolve.
 * In future, may change to only run when there are things to be resolved.
 *
 * @see {@link ResolveEnd}
 *
 * @publicApi
 */
class ResolveStart extends RouterEvent {
    urlAfterRedirects;
    state;
    type = EventType.ResolveStart;
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /** @docsNotRequired */
    urlAfterRedirects, 
    /** @docsNotRequired */
    state) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
        this.state = state;
    }
    toString() {
        return `ResolveStart(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`;
    }
}
/**
 * An event triggered at the end of the Resolve phase of routing.
 * @see {@link ResolveStart}
 *
 * @publicApi
 */
class ResolveEnd extends RouterEvent {
    urlAfterRedirects;
    state;
    type = EventType.ResolveEnd;
    constructor(
    /** @docsNotRequired */
    id, 
    /** @docsNotRequired */
    url, 
    /** @docsNotRequired */
    urlAfterRedirects, 
    /** @docsNotRequired */
    state) {
        super(id, url);
        this.urlAfterRedirects = urlAfterRedirects;
        this.state = state;
    }
    toString() {
        return `ResolveEnd(id: ${this.id}, url: '${this.url}', urlAfterRedirects: '${this.urlAfterRedirects}', state: ${this.state})`;
    }
}
/**
 * An event triggered before lazy loading a route configuration.
 *
 * @see {@link RouteConfigLoadEnd}
 *
 * @publicApi
 */
class RouteConfigLoadStart {
    route;
    type = EventType.RouteConfigLoadStart;
    constructor(
    /** @docsNotRequired */
    route) {
        this.route = route;
    }
    toString() {
        return `RouteConfigLoadStart(path: ${this.route.path})`;
    }
}
/**
 * An event triggered when a route has been lazy loaded.
 *
 * @see {@link RouteConfigLoadStart}
 *
 * @publicApi
 */
class RouteConfigLoadEnd {
    route;
    type = EventType.RouteConfigLoadEnd;
    constructor(
    /** @docsNotRequired */
    route) {
        this.route = route;
    }
    toString() {
        return `RouteConfigLoadEnd(path: ${this.route.path})`;
    }
}
/**
 * An event triggered at the start of the child-activation
 * part of the Resolve phase of routing.
 * @see {@link ChildActivationEnd}
 * @see {@link ResolveStart}
 *
 * @publicApi
 */
class ChildActivationStart {
    snapshot;
    type = EventType.ChildActivationStart;
    constructor(
    /** @docsNotRequired */
    snapshot) {
        this.snapshot = snapshot;
    }
    toString() {
        const path = (this.snapshot.routeConfig && this.snapshot.routeConfig.path) || '';
        return `ChildActivationStart(path: '${path}')`;
    }
}
/**
 * An event triggered at the end of the child-activation part
 * of the Resolve phase of routing.
 * @see {@link ChildActivationStart}
 * @see {@link ResolveStart}
 * @publicApi
 */
class ChildActivationEnd {
    snapshot;
    type = EventType.ChildActivationEnd;
    constructor(
    /** @docsNotRequired */
    snapshot) {
        this.snapshot = snapshot;
    }
    toString() {
        const path = (this.snapshot.routeConfig && this.snapshot.routeConfig.path) || '';
        return `ChildActivationEnd(path: '${path}')`;
    }
}
/**
 * An event triggered at the start of the activation part
 * of the Resolve phase of routing.
 * @see {@link ActivationEnd}
 * @see {@link ResolveStart}
 *
 * @publicApi
 */
class ActivationStart {
    snapshot;
    type = EventType.ActivationStart;
    constructor(
    /** @docsNotRequired */
    snapshot) {
        this.snapshot = snapshot;
    }
    toString() {
        const path = (this.snapshot.routeConfig && this.snapshot.routeConfig.path) || '';
        return `ActivationStart(path: '${path}')`;
    }
}
/**
 * An event triggered at the end of the activation part
 * of the Resolve phase of routing.
 * @see {@link ActivationStart}
 * @see {@link ResolveStart}
 *
 * @publicApi
 */
class ActivationEnd {
    snapshot;
    type = EventType.ActivationEnd;
    constructor(
    /** @docsNotRequired */
    snapshot) {
        this.snapshot = snapshot;
    }
    toString() {
        const path = (this.snapshot.routeConfig && this.snapshot.routeConfig.path) || '';
        return `ActivationEnd(path: '${path}')`;
    }
}
/**
 * An event triggered by scrolling.
 *
 * @publicApi
 */
class Scroll {
    routerEvent;
    position;
    anchor;
    type = EventType.Scroll;
    constructor(
    /** @docsNotRequired */
    routerEvent, 
    /** @docsNotRequired */
    position, 
    /** @docsNotRequired */
    anchor) {
        this.routerEvent = routerEvent;
        this.position = position;
        this.anchor = anchor;
    }
    toString() {
        const pos = this.position ? `${this.position[0]}, ${this.position[1]}` : null;
        return `Scroll(anchor: '${this.anchor}', position: '${pos}')`;
    }
}
class BeforeActivateRoutes {
}
class RedirectRequest {
    url;
    navigationBehaviorOptions;
    constructor(url, navigationBehaviorOptions) {
        this.url = url;
        this.navigationBehaviorOptions = navigationBehaviorOptions;
    }
}
function isPublicRouterEvent(e) {
    return !(e instanceof BeforeActivateRoutes) && !(e instanceof RedirectRequest);
}
function stringifyEvent(routerEvent) {
    switch (routerEvent.type) {
        case EventType.ActivationEnd:
            return `ActivationEnd(path: '${routerEvent.snapshot.routeConfig?.path || ''}')`;
        case EventType.ActivationStart:
            return `ActivationStart(path: '${routerEvent.snapshot.routeConfig?.path || ''}')`;
        case EventType.ChildActivationEnd:
            return `ChildActivationEnd(path: '${routerEvent.snapshot.routeConfig?.path || ''}')`;
        case EventType.ChildActivationStart:
            return `ChildActivationStart(path: '${routerEvent.snapshot.routeConfig?.path || ''}')`;
        case EventType.GuardsCheckEnd:
            return `GuardsCheckEnd(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state}, shouldActivate: ${routerEvent.shouldActivate})`;
        case EventType.GuardsCheckStart:
            return `GuardsCheckStart(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state})`;
        case EventType.NavigationCancel:
            return `NavigationCancel(id: ${routerEvent.id}, url: '${routerEvent.url}')`;
        case EventType.NavigationSkipped:
            return `NavigationSkipped(id: ${routerEvent.id}, url: '${routerEvent.url}')`;
        case EventType.NavigationEnd:
            return `NavigationEnd(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}')`;
        case EventType.NavigationError:
            return `NavigationError(id: ${routerEvent.id}, url: '${routerEvent.url}', error: ${routerEvent.error})`;
        case EventType.NavigationStart:
            return `NavigationStart(id: ${routerEvent.id}, url: '${routerEvent.url}')`;
        case EventType.ResolveEnd:
            return `ResolveEnd(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state})`;
        case EventType.ResolveStart:
            return `ResolveStart(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state})`;
        case EventType.RouteConfigLoadEnd:
            return `RouteConfigLoadEnd(path: ${routerEvent.route.path})`;
        case EventType.RouteConfigLoadStart:
            return `RouteConfigLoadStart(path: ${routerEvent.route.path})`;
        case EventType.RoutesRecognized:
            return `RoutesRecognized(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state})`;
        case EventType.Scroll:
            const pos = routerEvent.position
                ? `${routerEvent.position[0]}, ${routerEvent.position[1]}`
                : null;
            return `Scroll(anchor: '${routerEvent.anchor}', position: '${pos}')`;
    }
}

/**
 * Creates an `EnvironmentInjector` if the `Route` has providers and one does not already exist
 * and returns the injector. Otherwise, if the `Route` does not have `providers`, returns the
 * `currentInjector`.
 *
 * @param route The route that might have providers
 * @param currentInjector The parent injector of the `Route`
 */
function getOrCreateRouteInjectorIfNeeded(route, currentInjector) {
    if (route.providers && !route._injector) {
        route._injector = createEnvironmentInjector(route.providers, currentInjector, `Route: ${route.path}`);
    }
    return route._injector ?? currentInjector;
}
function validateConfig(config, parentPath = '', requireStandaloneComponents = false) {
    // forEach doesn't iterate undefined values
    for (let i = 0; i < config.length; i++) {
        const route = config[i];
        const fullPath = getFullPath(parentPath, route);
        validateNode(route, fullPath, requireStandaloneComponents);
    }
}
function assertStandalone(fullPath, component) {
    if (component && _isNgModule(component)) {
        throw new _RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}'. You are using 'loadComponent' with a module, ` +
            `but it must be used with standalone components. Use 'loadChildren' instead.`);
    }
    else if (component && !isStandalone(component)) {
        throw new _RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}'. The component must be standalone.`);
    }
}
function validateNode(route, fullPath, requireStandaloneComponents) {
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
        if (!route) {
            throw new _RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `
      Invalid configuration of route '${fullPath}': Encountered undefined route.
      The reason might be an extra comma.

      Example:
      const routes: Routes = [
        { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
        { path: 'dashboard',  component: DashboardComponent },, << two commas
        { path: 'detail/:id', component: HeroDetailComponent }
      ];
    `);
        }
        if (Array.isArray(route)) {
            throw new _RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': Array cannot be specified`);
        }
        if (!route.redirectTo &&
            !route.component &&
            !route.loadComponent &&
            !route.children &&
            !route.loadChildren &&
            route.outlet &&
            route.outlet !== PRIMARY_OUTLET) {
            throw new _RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': a componentless route without children or loadChildren cannot have a named outlet set`);
        }
        if (route.redirectTo && route.children) {
            throw new _RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': redirectTo and children cannot be used together`);
        }
        if (route.redirectTo && route.loadChildren) {
            throw new _RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': redirectTo and loadChildren cannot be used together`);
        }
        if (route.children && route.loadChildren) {
            throw new _RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': children and loadChildren cannot be used together`);
        }
        if (route.component && route.loadComponent) {
            throw new _RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': component and loadComponent cannot be used together`);
        }
        if (route.redirectTo) {
            if (route.component || route.loadComponent) {
                throw new _RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': redirectTo and component/loadComponent cannot be used together`);
            }
            if (route.canMatch || route.canActivate) {
                throw new _RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': redirectTo and ${route.canMatch ? 'canMatch' : 'canActivate'} cannot be used together.` +
                    `Redirects happen before guards are executed.`);
            }
        }
        if (route.path && route.matcher) {
            throw new _RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': path and matcher cannot be used together`);
        }
        if (route.redirectTo === void 0 &&
            !route.component &&
            !route.loadComponent &&
            !route.children &&
            !route.loadChildren) {
            throw new _RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}'. One of the following must be provided: component, loadComponent, redirectTo, children or loadChildren`);
        }
        if (route.path === void 0 && route.matcher === void 0) {
            throw new _RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': routes must have either a path or a matcher specified`);
        }
        if (typeof route.path === 'string' && route.path.charAt(0) === '/') {
            throw new _RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '${fullPath}': path cannot start with a slash`);
        }
        if (route.path === '' && route.redirectTo !== void 0 && route.pathMatch === void 0) {
            const exp = `The default value of 'pathMatch' is 'prefix', but often the intent is to use 'full'.`;
            throw new _RuntimeError(4014 /* RuntimeErrorCode.INVALID_ROUTE_CONFIG */, `Invalid configuration of route '{path: "${fullPath}", redirectTo: "${route.redirectTo}"}': please provide 'pathMatch'. ${exp}`);
        }
        if (requireStandaloneComponents) {
            assertStandalone(fullPath, route.component);
        }
    }
    if (route.children) {
        validateConfig(route.children, fullPath, requireStandaloneComponents);
    }
}
function getFullPath(parentPath, currentRoute) {
    if (!currentRoute) {
        return parentPath;
    }
    if (!parentPath && !currentRoute.path) {
        return '';
    }
    else if (parentPath && !currentRoute.path) {
        return `${parentPath}/`;
    }
    else if (!parentPath && currentRoute.path) {
        return currentRoute.path;
    }
    else {
        return `${parentPath}/${currentRoute.path}`;
    }
}
/** Returns the `route.outlet` or PRIMARY_OUTLET if none exists. */
function getOutlet(route) {
    return route.outlet || PRIMARY_OUTLET;
}
/**
 * Sorts the `routes` such that the ones with an outlet matching `outletName` come first.
 * The order of the configs is otherwise preserved.
 */
function sortByMatchingOutlets(routes, outletName) {
    const sortedConfig = routes.filter((r) => getOutlet(r) === outletName);
    sortedConfig.push(...routes.filter((r) => getOutlet(r) !== outletName));
    return sortedConfig;
}
/**
 * Gets the first injector in the snapshot's parent tree.
 *
 * If the `Route` has a static list of providers, the returned injector will be the one created from
 * those. If it does not exist, the returned injector may come from the parents, which may be from a
 * loaded config or their static providers.
 *
 * Returns `null` if there is neither this nor any parents have a stored injector.
 *
 * Generally used for retrieving the injector to use for getting tokens for guards/resolvers and
 * also used for getting the correct injector to use for creating components.
 */
function getClosestRouteInjector(snapshot) {
    if (!snapshot)
        return null;
    // If the current route has its own injector, which is created from the static providers on the
    // route itself, we should use that. Otherwise, we start at the parent since we do not want to
    // include the lazy loaded injector from this route.
    if (snapshot.routeConfig?._injector) {
        return snapshot.routeConfig._injector;
    }
    for (let s = snapshot.parent; s; s = s.parent) {
        const route = s.routeConfig;
        // Note that the order here is important. `_loadedInjector` stored on the route with
        // `loadChildren: () => NgModule` so it applies to child routes with priority. The `_injector`
        // is created from the static providers on that parent route, so it applies to the children as
        // well, but only if there is no lazy loaded NgModuleRef injector.
        if (route?._loadedInjector)
            return route._loadedInjector;
        if (route?._injector)
            return route._injector;
    }
    return null;
}

/**
 * Store contextual information about a `RouterOutlet`
 *
 * @publicApi
 */
class OutletContext {
    rootInjector;
    outlet = null;
    route = null;
    children;
    attachRef = null;
    get injector() {
        return getClosestRouteInjector(this.route?.snapshot) ?? this.rootInjector;
    }
    constructor(rootInjector) {
        this.rootInjector = rootInjector;
        this.children = new ChildrenOutletContexts(this.rootInjector);
    }
}
/**
 * Store contextual information about the children (= nested) `RouterOutlet`
 *
 * @publicApi
 */
class ChildrenOutletContexts {
    rootInjector;
    // contexts for child outlets, by name.
    contexts = new Map();
    /** @docs-private */
    constructor(rootInjector) {
        this.rootInjector = rootInjector;
    }
    /** Called when a `RouterOutlet` directive is instantiated */
    onChildOutletCreated(childName, outlet) {
        const context = this.getOrCreateContext(childName);
        context.outlet = outlet;
        this.contexts.set(childName, context);
    }
    /**
     * Called when a `RouterOutlet` directive is destroyed.
     * We need to keep the context as the outlet could be destroyed inside a NgIf and might be
     * re-created later.
     */
    onChildOutletDestroyed(childName) {
        const context = this.getContext(childName);
        if (context) {
            context.outlet = null;
            context.attachRef = null;
        }
    }
    /**
     * Called when the corresponding route is deactivated during navigation.
     * Because the component get destroyed, all children outlet are destroyed.
     */
    onOutletDeactivated() {
        const contexts = this.contexts;
        this.contexts = new Map();
        return contexts;
    }
    onOutletReAttached(contexts) {
        this.contexts = contexts;
    }
    getOrCreateContext(childName) {
        let context = this.getContext(childName);
        if (!context) {
            context = new OutletContext(this.rootInjector);
            this.contexts.set(childName, context);
        }
        return context;
    }
    getContext(childName) {
        return this.contexts.get(childName) || null;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: ChildrenOutletContexts, deps: [{ token: i0.EnvironmentInjector }], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: ChildrenOutletContexts, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: ChildrenOutletContexts, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: () => [{ type: i0.EnvironmentInjector }] });

class Tree {
    /** @internal */
    _root;
    constructor(root) {
        this._root = root;
    }
    get root() {
        return this._root.value;
    }
    /**
     * @internal
     */
    parent(t) {
        const p = this.pathFromRoot(t);
        return p.length > 1 ? p[p.length - 2] : null;
    }
    /**
     * @internal
     */
    children(t) {
        const n = findNode(t, this._root);
        return n ? n.children.map((t) => t.value) : [];
    }
    /**
     * @internal
     */
    firstChild(t) {
        const n = findNode(t, this._root);
        return n && n.children.length > 0 ? n.children[0].value : null;
    }
    /**
     * @internal
     */
    siblings(t) {
        const p = findPath(t, this._root);
        if (p.length < 2)
            return [];
        const c = p[p.length - 2].children.map((c) => c.value);
        return c.filter((cc) => cc !== t);
    }
    /**
     * @internal
     */
    pathFromRoot(t) {
        return findPath(t, this._root).map((s) => s.value);
    }
}
// DFS for the node matching the value
function findNode(value, node) {
    if (value === node.value)
        return node;
    for (const child of node.children) {
        const node = findNode(value, child);
        if (node)
            return node;
    }
    return null;
}
// Return the path to the node with the given value using DFS
function findPath(value, node) {
    if (value === node.value)
        return [node];
    for (const child of node.children) {
        const path = findPath(value, child);
        if (path.length) {
            path.unshift(node);
            return path;
        }
    }
    return [];
}
class TreeNode {
    value;
    children;
    constructor(value, children) {
        this.value = value;
        this.children = children;
    }
    toString() {
        return `TreeNode(${this.value})`;
    }
}
// Return the list of T indexed by outlet name
function nodeChildrenAsMap(node) {
    const map = {};
    if (node) {
        node.children.forEach((child) => (map[child.value.outlet] = child));
    }
    return map;
}

/**
 * Represents the state of the router as a tree of activated routes.
 *
 * @usageNotes
 *
 * Every node in the route tree is an `ActivatedRoute` instance
 * that knows about the "consumed" URL segments, the extracted parameters,
 * and the resolved data.
 * Use the `ActivatedRoute` properties to traverse the tree from any node.
 *
 * The following fragment shows how a component gets the root node
 * of the current state to establish its own route tree:
 *
 * ```ts
 * @Component({templateUrl:'template.html'})
 * class MyComponent {
 *   constructor(router: Router) {
 *     const state: RouterState = router.routerState;
 *     const root: ActivatedRoute = state.root;
 *     const child = root.firstChild;
 *     const id: Observable<string> = child.params.map(p => p.id);
 *     //...
 *   }
 * }
 * ```
 *
 * @see {@link ActivatedRoute}
 * @see [Getting route information](guide/routing/common-router-tasks#getting-route-information)
 *
 * @publicApi
 */
class RouterState extends Tree {
    snapshot;
    /** @internal */
    constructor(root, 
    /** The current snapshot of the router state */
    snapshot) {
        super(root);
        this.snapshot = snapshot;
        setRouterState(this, root);
    }
    toString() {
        return this.snapshot.toString();
    }
}
function createEmptyState(rootComponent) {
    const snapshot = createEmptyStateSnapshot(rootComponent);
    const emptyUrl = new BehaviorSubject([new UrlSegment('', {})]);
    const emptyParams = new BehaviorSubject({});
    const emptyData = new BehaviorSubject({});
    const emptyQueryParams = new BehaviorSubject({});
    const fragment = new BehaviorSubject('');
    const activated = new ActivatedRoute(emptyUrl, emptyParams, emptyQueryParams, fragment, emptyData, PRIMARY_OUTLET, rootComponent, snapshot.root);
    activated.snapshot = snapshot.root;
    return new RouterState(new TreeNode(activated, []), snapshot);
}
function createEmptyStateSnapshot(rootComponent) {
    const emptyParams = {};
    const emptyData = {};
    const emptyQueryParams = {};
    const fragment = '';
    const activated = new ActivatedRouteSnapshot([], emptyParams, emptyQueryParams, fragment, emptyData, PRIMARY_OUTLET, rootComponent, null, {});
    return new RouterStateSnapshot('', new TreeNode(activated, []));
}
/**
 * Provides access to information about a route associated with a component
 * that is loaded in an outlet.
 * Use to traverse the `RouterState` tree and extract information from nodes.
 *
 * The following example shows how to construct a component using information from a
 * currently activated route.
 *
 * Note: the observables in this class only emit when the current and previous values differ based
 * on shallow equality. For example, changing deeply nested properties in resolved `data` will not
 * cause the `ActivatedRoute.data` `Observable` to emit a new value.
 *
 * {@example router/activated-route/module.ts region="activated-route"}
 *
 * @see [Getting route information](guide/routing/common-router-tasks#getting-route-information)
 *
 * @publicApi
 */
class ActivatedRoute {
    urlSubject;
    paramsSubject;
    queryParamsSubject;
    fragmentSubject;
    dataSubject;
    outlet;
    component;
    /** The current snapshot of this route */
    snapshot;
    /** @internal */
    _futureSnapshot;
    /** @internal */
    _routerState;
    /** @internal */
    _paramMap;
    /** @internal */
    _queryParamMap;
    /** An Observable of the resolved route title */
    title;
    /** An observable of the URL segments matched by this route. */
    url;
    /** An observable of the matrix parameters scoped to this route. */
    params;
    /** An observable of the query parameters shared by all the routes. */
    queryParams;
    /** An observable of the URL fragment shared by all the routes. */
    fragment;
    /** An observable of the static and resolved data of this route. */
    data;
    /** @internal */
    constructor(
    /** @internal */
    urlSubject, 
    /** @internal */
    paramsSubject, 
    /** @internal */
    queryParamsSubject, 
    /** @internal */
    fragmentSubject, 
    /** @internal */
    dataSubject, 
    /** The outlet name of the route, a constant. */
    outlet, 
    /** The component of the route, a constant. */
    component, futureSnapshot) {
        this.urlSubject = urlSubject;
        this.paramsSubject = paramsSubject;
        this.queryParamsSubject = queryParamsSubject;
        this.fragmentSubject = fragmentSubject;
        this.dataSubject = dataSubject;
        this.outlet = outlet;
        this.component = component;
        this._futureSnapshot = futureSnapshot;
        this.title = this.dataSubject?.pipe(map((d) => d[RouteTitleKey])) ?? of(undefined);
        // TODO(atscott): Verify that these can be changed to `.asObservable()` with TGP.
        this.url = urlSubject;
        this.params = paramsSubject;
        this.queryParams = queryParamsSubject;
        this.fragment = fragmentSubject;
        this.data = dataSubject;
    }
    /** The configuration used to match this route. */
    get routeConfig() {
        return this._futureSnapshot.routeConfig;
    }
    /** The root of the router state. */
    get root() {
        return this._routerState.root;
    }
    /** The parent of this route in the router state tree. */
    get parent() {
        return this._routerState.parent(this);
    }
    /** The first child of this route in the router state tree. */
    get firstChild() {
        return this._routerState.firstChild(this);
    }
    /** The children of this route in the router state tree. */
    get children() {
        return this._routerState.children(this);
    }
    /** The path from the root of the router state tree to this route. */
    get pathFromRoot() {
        return this._routerState.pathFromRoot(this);
    }
    /**
     * An Observable that contains a map of the required and optional parameters
     * specific to the route.
     * The map supports retrieving single and multiple values from the same parameter.
     */
    get paramMap() {
        this._paramMap ??= this.params.pipe(map((p) => convertToParamMap(p)));
        return this._paramMap;
    }
    /**
     * An Observable that contains a map of the query parameters available to all routes.
     * The map supports retrieving single and multiple values from the query parameter.
     */
    get queryParamMap() {
        this._queryParamMap ??= this.queryParams.pipe(map((p) => convertToParamMap(p)));
        return this._queryParamMap;
    }
    toString() {
        return this.snapshot ? this.snapshot.toString() : `Future(${this._futureSnapshot})`;
    }
}
/**
 * Returns the inherited params, data, and resolve for a given route.
 *
 * By default, we do not inherit parent data unless the current route is path-less or the parent
 * route is component-less.
 */
function getInherited(route, parent, paramsInheritanceStrategy = 'emptyOnly') {
    let inherited;
    const { routeConfig } = route;
    if (parent !== null &&
        (paramsInheritanceStrategy === 'always' ||
            // inherit parent data if route is empty path
            routeConfig?.path === '' ||
            // inherit parent data if parent was componentless
            (!parent.component && !parent.routeConfig?.loadComponent))) {
        inherited = {
            params: { ...parent.params, ...route.params },
            data: { ...parent.data, ...route.data },
            resolve: {
                // Snapshots are created with data inherited from parent and guards (i.e. canActivate) can
                // change data because it's not frozen...
                // This first line could be deleted chose to break/disallow mutating the `data` object in
                // guards.
                // Note that data from parents still override this mutated data so anyone relying on this
                // might be surprised that it doesn't work if parent data is inherited but otherwise does.
                ...route.data,
                // Ensure inherited resolved data overrides inherited static data
                ...parent.data,
                // static data from the current route overrides any inherited data
                ...routeConfig?.data,
                // resolved data from current route overrides everything
                ...route._resolvedData,
            },
        };
    }
    else {
        inherited = {
            params: { ...route.params },
            data: { ...route.data },
            resolve: { ...route.data, ...(route._resolvedData ?? {}) },
        };
    }
    if (routeConfig && hasStaticTitle(routeConfig)) {
        inherited.resolve[RouteTitleKey] = routeConfig.title;
    }
    return inherited;
}
/**
 * @description
 *
 * Contains the information about a route associated with a component loaded in an
 * outlet at a particular moment in time. ActivatedRouteSnapshot can also be used to
 * traverse the router state tree.
 *
 * The following example initializes a component with route information extracted
 * from the snapshot of the root node at the time of creation.
 *
 * ```ts
 * @Component({templateUrl:'./my-component.html'})
 * class MyComponent {
 *   constructor(route: ActivatedRoute) {
 *     const id: string = route.snapshot.params.id;
 *     const url: string = route.snapshot.url.join('');
 *     const user = route.snapshot.data.user;
 *   }
 * }
 * ```
 *
 * @publicApi
 */
class ActivatedRouteSnapshot {
    url;
    params;
    queryParams;
    fragment;
    data;
    outlet;
    component;
    /** The configuration used to match this route **/
    routeConfig;
    /** @internal */
    _resolve;
    /** @internal */
    _resolvedData;
    /** @internal */
    _routerState;
    /** @internal */
    _paramMap;
    /** @internal */
    _queryParamMap;
    /** The resolved route title */
    get title() {
        // Note: This _must_ be a getter because the data is mutated in the resolvers. Title will not be
        // available at the time of class instantiation.
        return this.data?.[RouteTitleKey];
    }
    /** @internal */
    constructor(
    /** The URL segments matched by this route */
    url, 
    /**
     *  The matrix parameters scoped to this route.
     *
     *  You can compute all params (or data) in the router state or to get params outside
     *  of an activated component by traversing the `RouterState` tree as in the following
     *  example:
     *  ```ts
     *  collectRouteParams(router: Router) {
     *    let params = {};
     *    let stack: ActivatedRouteSnapshot[] = [router.routerState.snapshot.root];
     *    while (stack.length > 0) {
     *      const route = stack.pop()!;
     *      params = {...params, ...route.params};
     *      stack.push(...route.children);
     *    }
     *    return params;
     *  }
     *  ```
     */
    params, 
    /** The query parameters shared by all the routes */
    queryParams, 
    /** The URL fragment shared by all the routes */
    fragment, 
    /** The static and resolved data of this route */
    data, 
    /** The outlet name of the route */
    outlet, 
    /** The component of the route */
    component, routeConfig, resolve) {
        this.url = url;
        this.params = params;
        this.queryParams = queryParams;
        this.fragment = fragment;
        this.data = data;
        this.outlet = outlet;
        this.component = component;
        this.routeConfig = routeConfig;
        this._resolve = resolve;
    }
    /** The root of the router state */
    get root() {
        return this._routerState.root;
    }
    /** The parent of this route in the router state tree */
    get parent() {
        return this._routerState.parent(this);
    }
    /** The first child of this route in the router state tree */
    get firstChild() {
        return this._routerState.firstChild(this);
    }
    /** The children of this route in the router state tree */
    get children() {
        return this._routerState.children(this);
    }
    /** The path from the root of the router state tree to this route */
    get pathFromRoot() {
        return this._routerState.pathFromRoot(this);
    }
    get paramMap() {
        this._paramMap ??= convertToParamMap(this.params);
        return this._paramMap;
    }
    get queryParamMap() {
        this._queryParamMap ??= convertToParamMap(this.queryParams);
        return this._queryParamMap;
    }
    toString() {
        const url = this.url.map((segment) => segment.toString()).join('/');
        const matched = this.routeConfig ? this.routeConfig.path : '';
        return `Route(url:'${url}', path:'${matched}')`;
    }
}
/**
 * @description
 *
 * Represents the state of the router at a moment in time.
 *
 * This is a tree of activated route snapshots. Every node in this tree knows about
 * the "consumed" URL segments, the extracted parameters, and the resolved data.
 *
 * The following example shows how a component is initialized with information
 * from the snapshot of the root node's state at the time of creation.
 *
 * ```ts
 * @Component({templateUrl:'template.html'})
 * class MyComponent {
 *   constructor(router: Router) {
 *     const state: RouterState = router.routerState;
 *     const snapshot: RouterStateSnapshot = state.snapshot;
 *     const root: ActivatedRouteSnapshot = snapshot.root;
 *     const child = root.firstChild;
 *     const id: Observable<string> = child.params.map(p => p.id);
 *     //...
 *   }
 * }
 * ```
 *
 * @publicApi
 */
class RouterStateSnapshot extends Tree {
    url;
    /** @internal */
    constructor(
    /** The url from which this snapshot was created */
    url, root) {
        super(root);
        this.url = url;
        setRouterState(this, root);
    }
    toString() {
        return serializeNode(this._root);
    }
}
function setRouterState(state, node) {
    node.value._routerState = state;
    node.children.forEach((c) => setRouterState(state, c));
}
function serializeNode(node) {
    const c = node.children.length > 0 ? ` { ${node.children.map(serializeNode).join(', ')} } ` : '';
    return `${node.value}${c}`;
}
/**
 * The expectation is that the activate route is created with the right set of parameters.
 * So we push new values into the observables only when they are not the initial values.
 * And we detect that by checking if the snapshot field is set.
 */
function advanceActivatedRoute(route) {
    if (route.snapshot) {
        const currentSnapshot = route.snapshot;
        const nextSnapshot = route._futureSnapshot;
        route.snapshot = nextSnapshot;
        if (!shallowEqual(currentSnapshot.queryParams, nextSnapshot.queryParams)) {
            route.queryParamsSubject.next(nextSnapshot.queryParams);
        }
        if (currentSnapshot.fragment !== nextSnapshot.fragment) {
            route.fragmentSubject.next(nextSnapshot.fragment);
        }
        if (!shallowEqual(currentSnapshot.params, nextSnapshot.params)) {
            route.paramsSubject.next(nextSnapshot.params);
        }
        if (!shallowEqualArrays(currentSnapshot.url, nextSnapshot.url)) {
            route.urlSubject.next(nextSnapshot.url);
        }
        if (!shallowEqual(currentSnapshot.data, nextSnapshot.data)) {
            route.dataSubject.next(nextSnapshot.data);
        }
    }
    else {
        route.snapshot = route._futureSnapshot;
        // this is for resolved data
        route.dataSubject.next(route._futureSnapshot.data);
    }
}
function equalParamsAndUrlSegments(a, b) {
    const equalUrlParams = shallowEqual(a.params, b.params) && equalSegments(a.url, b.url);
    const parentsMismatch = !a.parent !== !b.parent;
    return (equalUrlParams &&
        !parentsMismatch &&
        (!a.parent || equalParamsAndUrlSegments(a.parent, b.parent)));
}
function hasStaticTitle(config) {
    return typeof config.title === 'string' || config.title === null;
}

/**
 * An `InjectionToken` provided by the `RouterOutlet` and can be set using the `routerOutletData`
 * input.
 *
 * When unset, this value is `null` by default.
 *
 * @usageNotes
 *
 * To set the data from the template of the component with `router-outlet`:
 * ```html
 * <router-outlet [routerOutletData]="{name: 'Angular'}" />
 * ```
 *
 * To read the data in the routed component:
 * ```ts
 * data = inject(ROUTER_OUTLET_DATA) as Signal<{name: string}>;
 * ```
 *
 * @publicApi
 */
const ROUTER_OUTLET_DATA = new InjectionToken(ngDevMode ? 'RouterOutlet data' : '');
/**
 * @description
 *
 * Acts as a placeholder that Angular dynamically fills based on the current router state.
 *
 * Each outlet can have a unique name, determined by the optional `name` attribute.
 * The name cannot be set or changed dynamically. If not set, default value is "primary".
 *
 * ```html
 * <router-outlet></router-outlet>
 * <router-outlet name='left'></router-outlet>
 * <router-outlet name='right'></router-outlet>
 * ```
 *
 * Named outlets can be the targets of secondary routes.
 * The `Route` object for a secondary route has an `outlet` property to identify the target outlet:
 *
 * `{path: <base-path>, component: <component>, outlet: <target_outlet_name>}`
 *
 * Using named outlets and secondary routes, you can target multiple outlets in
 * the same `RouterLink` directive.
 *
 * The router keeps track of separate branches in a navigation tree for each named outlet and
 * generates a representation of that tree in the URL.
 * The URL for a secondary route uses the following syntax to specify both the primary and secondary
 * routes at the same time:
 *
 * `http://base-path/primary-route-path(outlet-name:route-path)`
 *
 * A router outlet emits an activate event when a new component is instantiated,
 * deactivate event when a component is destroyed.
 * An attached event emits when the `RouteReuseStrategy` instructs the outlet to reattach the
 * subtree, and the detached event emits when the `RouteReuseStrategy` instructs the outlet to
 * detach the subtree.
 *
 * ```html
 * <router-outlet
 *   (activate)='onActivate($event)'
 *   (deactivate)='onDeactivate($event)'
 *   (attach)='onAttach($event)'
 *   (detach)='onDetach($event)'></router-outlet>
 * ```
 *
 * @see {@link RouterLink}
 * @see {@link Route}
 * @ngModule RouterModule
 *
 * @publicApi
 */
class RouterOutlet {
    activated = null;
    /** @internal */
    get activatedComponentRef() {
        return this.activated;
    }
    _activatedRoute = null;
    /**
     * The name of the outlet
     *
     */
    name = PRIMARY_OUTLET;
    activateEvents = new EventEmitter();
    deactivateEvents = new EventEmitter();
    /**
     * Emits an attached component instance when the `RouteReuseStrategy` instructs to re-attach a
     * previously detached subtree.
     **/
    attachEvents = new EventEmitter();
    /**
     * Emits a detached component instance when the `RouteReuseStrategy` instructs to detach the
     * subtree.
     */
    detachEvents = new EventEmitter();
    /**
     * Data that will be provided to the child injector through the `ROUTER_OUTLET_DATA` token.
     *
     * When unset, the value of the token is `undefined` by default.
     */
    routerOutletData = input(undefined, ...(ngDevMode ? [{ debugName: "routerOutletData" }] : []));
    parentContexts = inject(ChildrenOutletContexts);
    location = inject(ViewContainerRef);
    changeDetector = inject(ChangeDetectorRef);
    inputBinder = inject(INPUT_BINDER, { optional: true });
    /** @docs-private */
    supportsBindingToComponentInputs = true;
    /** @docs-private */
    ngOnChanges(changes) {
        if (changes['name']) {
            const { firstChange, previousValue } = changes['name'];
            if (firstChange) {
                // The first change is handled by ngOnInit. Because ngOnChanges doesn't get called when no
                // input is set at all, we need to centrally handle the first change there.
                return;
            }
            // unregister with the old name
            if (this.isTrackedInParentContexts(previousValue)) {
                this.deactivate();
                this.parentContexts.onChildOutletDestroyed(previousValue);
            }
            // register the new name
            this.initializeOutletWithName();
        }
    }
    /** @docs-private */
    ngOnDestroy() {
        // Ensure that the registered outlet is this one before removing it on the context.
        if (this.isTrackedInParentContexts(this.name)) {
            this.parentContexts.onChildOutletDestroyed(this.name);
        }
        this.inputBinder?.unsubscribeFromRouteData(this);
    }
    isTrackedInParentContexts(outletName) {
        return this.parentContexts.getContext(outletName)?.outlet === this;
    }
    /** @docs-private */
    ngOnInit() {
        this.initializeOutletWithName();
    }
    initializeOutletWithName() {
        this.parentContexts.onChildOutletCreated(this.name, this);
        if (this.activated) {
            return;
        }
        // If the outlet was not instantiated at the time the route got activated we need to populate
        // the outlet when it is initialized (ie inside a NgIf)
        const context = this.parentContexts.getContext(this.name);
        if (context?.route) {
            if (context.attachRef) {
                // `attachRef` is populated when there is an existing component to mount
                this.attach(context.attachRef, context.route);
            }
            else {
                // otherwise the component defined in the configuration is created
                this.activateWith(context.route, context.injector);
            }
        }
    }
    get isActivated() {
        return !!this.activated;
    }
    /**
     * @returns The currently activated component instance.
     * @throws An error if the outlet is not activated.
     */
    get component() {
        if (!this.activated)
            throw new _RuntimeError(4012 /* RuntimeErrorCode.OUTLET_NOT_ACTIVATED */, (typeof ngDevMode === 'undefined' || ngDevMode) && 'Outlet is not activated');
        return this.activated.instance;
    }
    get activatedRoute() {
        if (!this.activated)
            throw new _RuntimeError(4012 /* RuntimeErrorCode.OUTLET_NOT_ACTIVATED */, (typeof ngDevMode === 'undefined' || ngDevMode) && 'Outlet is not activated');
        return this._activatedRoute;
    }
    get activatedRouteData() {
        if (this._activatedRoute) {
            return this._activatedRoute.snapshot.data;
        }
        return {};
    }
    /**
     * Called when the `RouteReuseStrategy` instructs to detach the subtree
     */
    detach() {
        if (!this.activated)
            throw new _RuntimeError(4012 /* RuntimeErrorCode.OUTLET_NOT_ACTIVATED */, (typeof ngDevMode === 'undefined' || ngDevMode) && 'Outlet is not activated');
        this.location.detach();
        const cmp = this.activated;
        this.activated = null;
        this._activatedRoute = null;
        this.detachEvents.emit(cmp.instance);
        return cmp;
    }
    /**
     * Called when the `RouteReuseStrategy` instructs to re-attach a previously detached subtree
     */
    attach(ref, activatedRoute) {
        this.activated = ref;
        this._activatedRoute = activatedRoute;
        this.location.insert(ref.hostView);
        this.inputBinder?.bindActivatedRouteToOutletComponent(this);
        this.attachEvents.emit(ref.instance);
    }
    deactivate() {
        if (this.activated) {
            const c = this.component;
            this.activated.destroy();
            this.activated = null;
            this._activatedRoute = null;
            this.deactivateEvents.emit(c);
        }
    }
    activateWith(activatedRoute, environmentInjector) {
        if (this.isActivated) {
            throw new _RuntimeError(4013 /* RuntimeErrorCode.OUTLET_ALREADY_ACTIVATED */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
                'Cannot activate an already activated outlet');
        }
        this._activatedRoute = activatedRoute;
        const location = this.location;
        const snapshot = activatedRoute.snapshot;
        const component = snapshot.component;
        const childContexts = this.parentContexts.getOrCreateContext(this.name).children;
        const injector = new OutletInjector(activatedRoute, childContexts, location.injector, this.routerOutletData);
        this.activated = location.createComponent(component, {
            index: location.length,
            injector,
            environmentInjector: environmentInjector,
        });
        // Calling `markForCheck` to make sure we will run the change detection when the
        // `RouterOutlet` is inside a `ChangeDetectionStrategy.OnPush` component.
        this.changeDetector.markForCheck();
        this.inputBinder?.bindActivatedRouteToOutletComponent(this);
        this.activateEvents.emit(this.activated.instance);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: RouterOutlet, deps: [], target: i0.ɵɵFactoryTarget.Directive });
    static ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "17.1.0", version: "20.2.0-next.3+sha-3e6e1c1", type: RouterOutlet, isStandalone: true, selector: "router-outlet", inputs: { name: { classPropertyName: "name", publicName: "name", isSignal: false, isRequired: false, transformFunction: null }, routerOutletData: { classPropertyName: "routerOutletData", publicName: "routerOutletData", isSignal: true, isRequired: false, transformFunction: null } }, outputs: { activateEvents: "activate", deactivateEvents: "deactivate", attachEvents: "attach", detachEvents: "detach" }, exportAs: ["outlet"], usesOnChanges: true, ngImport: i0 });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: RouterOutlet, decorators: [{
            type: Directive,
            args: [{
                    selector: 'router-outlet',
                    exportAs: 'outlet',
                }]
        }], propDecorators: { name: [{
                type: Input
            }], activateEvents: [{
                type: Output,
                args: ['activate']
            }], deactivateEvents: [{
                type: Output,
                args: ['deactivate']
            }], attachEvents: [{
                type: Output,
                args: ['attach']
            }], detachEvents: [{
                type: Output,
                args: ['detach']
            }] } });
class OutletInjector {
    route;
    childContexts;
    parent;
    outletData;
    constructor(route, childContexts, parent, outletData) {
        this.route = route;
        this.childContexts = childContexts;
        this.parent = parent;
        this.outletData = outletData;
    }
    get(token, notFoundValue) {
        if (token === ActivatedRoute) {
            return this.route;
        }
        if (token === ChildrenOutletContexts) {
            return this.childContexts;
        }
        if (token === ROUTER_OUTLET_DATA) {
            return this.outletData;
        }
        return this.parent.get(token, notFoundValue);
    }
}
const INPUT_BINDER = new InjectionToken('');
/**
 * Injectable used as a tree-shakable provider for opting in to binding router data to component
 * inputs.
 *
 * The RouterOutlet registers itself with this service when an `ActivatedRoute` is attached or
 * activated. When this happens, the service subscribes to the `ActivatedRoute` observables (params,
 * queryParams, data) and sets the inputs of the component using `ComponentRef.setInput`.
 * Importantly, when an input does not have an item in the route data with a matching key, this
 * input is set to `undefined`. If it were not done this way, the previous information would be
 * retained if the data got removed from the route (i.e. if a query parameter is removed).
 *
 * The `RouterOutlet` should unregister itself when destroyed via `unsubscribeFromRouteData` so that
 * the subscriptions are cleaned up.
 */
class RoutedComponentInputBinder {
    outletDataSubscriptions = new Map();
    bindActivatedRouteToOutletComponent(outlet) {
        this.unsubscribeFromRouteData(outlet);
        this.subscribeToRouteData(outlet);
    }
    unsubscribeFromRouteData(outlet) {
        this.outletDataSubscriptions.get(outlet)?.unsubscribe();
        this.outletDataSubscriptions.delete(outlet);
    }
    subscribeToRouteData(outlet) {
        const { activatedRoute } = outlet;
        const dataSubscription = combineLatest([
            activatedRoute.queryParams,
            activatedRoute.params,
            activatedRoute.data,
        ])
            .pipe(switchMap(([queryParams, params, data], index) => {
            data = { ...queryParams, ...params, ...data };
            // Get the first result from the data subscription synchronously so it's available to
            // the component as soon as possible (and doesn't require a second change detection).
            if (index === 0) {
                return of(data);
            }
            // Promise.resolve is used to avoid synchronously writing the wrong data when
            // two of the Observables in the `combineLatest` stream emit one after
            // another.
            return Promise.resolve(data);
        }))
            .subscribe((data) => {
            // Outlet may have been deactivated or changed names to be associated with a different
            // route
            if (!outlet.isActivated ||
                !outlet.activatedComponentRef ||
                outlet.activatedRoute !== activatedRoute ||
                activatedRoute.component === null) {
                this.unsubscribeFromRouteData(outlet);
                return;
            }
            const mirror = reflectComponentType(activatedRoute.component);
            if (!mirror) {
                this.unsubscribeFromRouteData(outlet);
                return;
            }
            for (const { templateName } of mirror.inputs) {
                outlet.activatedComponentRef.setInput(templateName, data[templateName]);
            }
        });
        this.outletDataSubscriptions.set(outlet, dataSubscription);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: RoutedComponentInputBinder, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: RoutedComponentInputBinder });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: RoutedComponentInputBinder, decorators: [{
            type: Injectable
        }] });

/**
 * This component is used internally within the router to be a placeholder when an empty
 * router-outlet is needed. For example, with a config such as:
 *
 * `{path: 'parent', outlet: 'nav', children: [...]}`
 *
 * In order to render, there needs to be a component on this config, which will default
 * to this `EmptyOutletComponent`.
 */
class ɵEmptyOutletComponent {
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: ɵEmptyOutletComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "20.2.0-next.3+sha-3e6e1c1", type: ɵEmptyOutletComponent, isStandalone: true, selector: "ng-component", exportAs: ["emptyRouterOutlet"], ngImport: i0, template: `<router-outlet/>`, isInline: true, dependencies: [{ kind: "directive", type: RouterOutlet, selector: "router-outlet", inputs: ["name", "routerOutletData"], outputs: ["activate", "deactivate", "attach", "detach"], exportAs: ["outlet"] }] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: ɵEmptyOutletComponent, decorators: [{
            type: Component,
            args: [{
                    template: `<router-outlet/>`,
                    imports: [RouterOutlet],
                    // Used to avoid component ID collisions with user code.
                    exportAs: 'emptyRouterOutlet',
                }]
        }] });
/**
 * Makes a copy of the config and adds any default required properties.
 */
function standardizeConfig(r) {
    const children = r.children && r.children.map(standardizeConfig);
    const c = children ? { ...r, children } : { ...r };
    if (!c.component &&
        !c.loadComponent &&
        (children || c.loadChildren) &&
        c.outlet &&
        c.outlet !== PRIMARY_OUTLET) {
        c.component = ɵEmptyOutletComponent;
    }
    return c;
}

function createRouterState(routeReuseStrategy, curr, prevState) {
    const root = createNode(routeReuseStrategy, curr._root, prevState ? prevState._root : undefined);
    return new RouterState(root, curr);
}
function createNode(routeReuseStrategy, curr, prevState) {
    // reuse an activated route that is currently displayed on the screen
    if (prevState && routeReuseStrategy.shouldReuseRoute(curr.value, prevState.value.snapshot)) {
        const value = prevState.value;
        value._futureSnapshot = curr.value;
        const children = createOrReuseChildren(routeReuseStrategy, curr, prevState);
        return new TreeNode(value, children);
    }
    else {
        if (routeReuseStrategy.shouldAttach(curr.value)) {
            // retrieve an activated route that is used to be displayed, but is not currently displayed
            const detachedRouteHandle = routeReuseStrategy.retrieve(curr.value);
            if (detachedRouteHandle !== null) {
                const tree = detachedRouteHandle.route;
                tree.value._futureSnapshot = curr.value;
                tree.children = curr.children.map((c) => createNode(routeReuseStrategy, c));
                return tree;
            }
        }
        const value = createActivatedRoute(curr.value);
        const children = curr.children.map((c) => createNode(routeReuseStrategy, c));
        return new TreeNode(value, children);
    }
}
function createOrReuseChildren(routeReuseStrategy, curr, prevState) {
    return curr.children.map((child) => {
        for (const p of prevState.children) {
            if (routeReuseStrategy.shouldReuseRoute(child.value, p.value.snapshot)) {
                return createNode(routeReuseStrategy, child, p);
            }
        }
        return createNode(routeReuseStrategy, child);
    });
}
function createActivatedRoute(c) {
    return new ActivatedRoute(new BehaviorSubject(c.url), new BehaviorSubject(c.params), new BehaviorSubject(c.queryParams), new BehaviorSubject(c.fragment), new BehaviorSubject(c.data), c.outlet, c.component, c);
}

/**
 * Can be returned by a `Router` guard to instruct the `Router` to redirect rather than continue
 * processing the path of the in-flight navigation. The `redirectTo` indicates _where_ the new
 * navigation should go to and the optional `navigationBehaviorOptions` can provide more information
 * about _how_ to perform the navigation.
 *
 * ```ts
 * const route: Route = {
 *   path: "user/:userId",
 *   component: User,
 *   canActivate: [
 *     () => {
 *       const router = inject(Router);
 *       const authService = inject(AuthenticationService);
 *
 *       if (!authService.isLoggedIn()) {
 *         const loginPath = router.parseUrl("/login");
 *         return new RedirectCommand(loginPath, {
 *           skipLocationChange: true,
 *         });
 *       }
 *
 *       return true;
 *     },
 *   ],
 * };
 * ```
 * @see [Routing guide](guide/routing/common-router-tasks#preventing-unauthorized-access)
 *
 * @publicApi
 */
class RedirectCommand {
    redirectTo;
    navigationBehaviorOptions;
    constructor(redirectTo, navigationBehaviorOptions) {
        this.redirectTo = redirectTo;
        this.navigationBehaviorOptions = navigationBehaviorOptions;
    }
}

const NAVIGATION_CANCELING_ERROR = 'ngNavigationCancelingError';
function redirectingNavigationError(urlSerializer, redirect) {
    const { redirectTo, navigationBehaviorOptions } = isUrlTree(redirect)
        ? { redirectTo: redirect, navigationBehaviorOptions: undefined }
        : redirect;
    const error = navigationCancelingError(ngDevMode && `Redirecting to "${urlSerializer.serialize(redirectTo)}"`, NavigationCancellationCode.Redirect);
    error.url = redirectTo;
    error.navigationBehaviorOptions = navigationBehaviorOptions;
    return error;
}
function navigationCancelingError(message, code) {
    const error = new Error(`NavigationCancelingError: ${message || ''}`);
    error[NAVIGATION_CANCELING_ERROR] = true;
    error.cancellationCode = code;
    return error;
}
function isRedirectingNavigationCancelingError(error) {
    return (isNavigationCancelingError(error) &&
        isUrlTree(error.url));
}
function isNavigationCancelingError(error) {
    return !!error && error[NAVIGATION_CANCELING_ERROR];
}

let warnedAboutUnsupportedInputBinding = false;
const activateRoutes = (rootContexts, routeReuseStrategy, forwardEvent, inputBindingEnabled) => map((t) => {
    new ActivateRoutes(routeReuseStrategy, t.targetRouterState, t.currentRouterState, forwardEvent, inputBindingEnabled).activate(rootContexts);
    return t;
});
class ActivateRoutes {
    routeReuseStrategy;
    futureState;
    currState;
    forwardEvent;
    inputBindingEnabled;
    constructor(routeReuseStrategy, futureState, currState, forwardEvent, inputBindingEnabled) {
        this.routeReuseStrategy = routeReuseStrategy;
        this.futureState = futureState;
        this.currState = currState;
        this.forwardEvent = forwardEvent;
        this.inputBindingEnabled = inputBindingEnabled;
    }
    activate(parentContexts) {
        const futureRoot = this.futureState._root;
        const currRoot = this.currState ? this.currState._root : null;
        this.deactivateChildRoutes(futureRoot, currRoot, parentContexts);
        advanceActivatedRoute(this.futureState.root);
        this.activateChildRoutes(futureRoot, currRoot, parentContexts);
    }
    // De-activate the child route that are not re-used for the future state
    deactivateChildRoutes(futureNode, currNode, contexts) {
        const children = nodeChildrenAsMap(currNode);
        // Recurse on the routes active in the future state to de-activate deeper children
        futureNode.children.forEach((futureChild) => {
            const childOutletName = futureChild.value.outlet;
            this.deactivateRoutes(futureChild, children[childOutletName], contexts);
            delete children[childOutletName];
        });
        // De-activate the routes that will not be re-used
        Object.values(children).forEach((v) => {
            this.deactivateRouteAndItsChildren(v, contexts);
        });
    }
    deactivateRoutes(futureNode, currNode, parentContext) {
        const future = futureNode.value;
        const curr = currNode ? currNode.value : null;
        if (future === curr) {
            // Reusing the node, check to see if the children need to be de-activated
            if (future.component) {
                // If we have a normal route, we need to go through an outlet.
                const context = parentContext.getContext(future.outlet);
                if (context) {
                    this.deactivateChildRoutes(futureNode, currNode, context.children);
                }
            }
            else {
                // if we have a componentless route, we recurse but keep the same outlet map.
                this.deactivateChildRoutes(futureNode, currNode, parentContext);
            }
        }
        else {
            if (curr) {
                // Deactivate the current route which will not be re-used
                this.deactivateRouteAndItsChildren(currNode, parentContext);
            }
        }
    }
    deactivateRouteAndItsChildren(route, parentContexts) {
        // If there is no component, the Route is never attached to an outlet (because there is no
        // component to attach).
        if (route.value.component && this.routeReuseStrategy.shouldDetach(route.value.snapshot)) {
            this.detachAndStoreRouteSubtree(route, parentContexts);
        }
        else {
            this.deactivateRouteAndOutlet(route, parentContexts);
        }
    }
    detachAndStoreRouteSubtree(route, parentContexts) {
        const context = parentContexts.getContext(route.value.outlet);
        const contexts = context && route.value.component ? context.children : parentContexts;
        const children = nodeChildrenAsMap(route);
        for (const treeNode of Object.values(children)) {
            this.deactivateRouteAndItsChildren(treeNode, contexts);
        }
        if (context && context.outlet) {
            const componentRef = context.outlet.detach();
            const contexts = context.children.onOutletDeactivated();
            this.routeReuseStrategy.store(route.value.snapshot, { componentRef, route, contexts });
        }
    }
    deactivateRouteAndOutlet(route, parentContexts) {
        const context = parentContexts.getContext(route.value.outlet);
        // The context could be `null` if we are on a componentless route but there may still be
        // children that need deactivating.
        const contexts = context && route.value.component ? context.children : parentContexts;
        const children = nodeChildrenAsMap(route);
        for (const treeNode of Object.values(children)) {
            this.deactivateRouteAndItsChildren(treeNode, contexts);
        }
        if (context) {
            if (context.outlet) {
                // Destroy the component
                context.outlet.deactivate();
                // Destroy the contexts for all the outlets that were in the component
                context.children.onOutletDeactivated();
            }
            // Clear the information about the attached component on the context but keep the reference to
            // the outlet. Clear even if outlet was not yet activated to avoid activating later with old
            // info
            context.attachRef = null;
            context.route = null;
        }
    }
    activateChildRoutes(futureNode, currNode, contexts) {
        const children = nodeChildrenAsMap(currNode);
        futureNode.children.forEach((c) => {
            this.activateRoutes(c, children[c.value.outlet], contexts);
            this.forwardEvent(new ActivationEnd(c.value.snapshot));
        });
        if (futureNode.children.length) {
            this.forwardEvent(new ChildActivationEnd(futureNode.value.snapshot));
        }
    }
    activateRoutes(futureNode, currNode, parentContexts) {
        const future = futureNode.value;
        const curr = currNode ? currNode.value : null;
        advanceActivatedRoute(future);
        // reusing the node
        if (future === curr) {
            if (future.component) {
                // If we have a normal route, we need to go through an outlet.
                const context = parentContexts.getOrCreateContext(future.outlet);
                this.activateChildRoutes(futureNode, currNode, context.children);
            }
            else {
                // if we have a componentless route, we recurse but keep the same outlet map.
                this.activateChildRoutes(futureNode, currNode, parentContexts);
            }
        }
        else {
            if (future.component) {
                // if we have a normal route, we need to place the component into the outlet and recurse.
                const context = parentContexts.getOrCreateContext(future.outlet);
                if (this.routeReuseStrategy.shouldAttach(future.snapshot)) {
                    const stored = (this.routeReuseStrategy.retrieve(future.snapshot));
                    this.routeReuseStrategy.store(future.snapshot, null);
                    context.children.onOutletReAttached(stored.contexts);
                    context.attachRef = stored.componentRef;
                    context.route = stored.route.value;
                    if (context.outlet) {
                        // Attach right away when the outlet has already been instantiated
                        // Otherwise attach from `RouterOutlet.ngOnInit` when it is instantiated
                        context.outlet.attach(stored.componentRef, stored.route.value);
                    }
                    advanceActivatedRoute(stored.route.value);
                    this.activateChildRoutes(futureNode, null, context.children);
                }
                else {
                    context.attachRef = null;
                    context.route = future;
                    if (context.outlet) {
                        // Activate the outlet when it has already been instantiated
                        // Otherwise it will get activated from its `ngOnInit` when instantiated
                        context.outlet.activateWith(future, context.injector);
                    }
                    this.activateChildRoutes(futureNode, null, context.children);
                }
            }
            else {
                // if we have a componentless route, we recurse but keep the same outlet map.
                this.activateChildRoutes(futureNode, null, parentContexts);
            }
        }
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
            const context = parentContexts.getOrCreateContext(future.outlet);
            const outlet = context.outlet;
            if (outlet &&
                this.inputBindingEnabled &&
                !outlet.supportsBindingToComponentInputs &&
                !warnedAboutUnsupportedInputBinding) {
                console.warn(`'withComponentInputBinding' feature is enabled but ` +
                    `this application is using an outlet that may not support binding to component inputs.`);
                warnedAboutUnsupportedInputBinding = true;
            }
        }
    }
}

class CanActivate {
    path;
    route;
    constructor(path) {
        this.path = path;
        this.route = this.path[this.path.length - 1];
    }
}
class CanDeactivate {
    component;
    route;
    constructor(component, route) {
        this.component = component;
        this.route = route;
    }
}
function getAllRouteGuards(future, curr, parentContexts) {
    const futureRoot = future._root;
    const currRoot = curr ? curr._root : null;
    return getChildRouteGuards(futureRoot, currRoot, parentContexts, [futureRoot.value]);
}
function getCanActivateChild(p) {
    const canActivateChild = p.routeConfig ? p.routeConfig.canActivateChild : null;
    if (!canActivateChild || canActivateChild.length === 0)
        return null;
    return { node: p, guards: canActivateChild };
}
function getTokenOrFunctionIdentity(tokenOrFunction, injector) {
    const NOT_FOUND = Symbol();
    const result = injector.get(tokenOrFunction, NOT_FOUND);
    if (result === NOT_FOUND) {
        if (typeof tokenOrFunction === 'function' && !_isInjectable(tokenOrFunction)) {
            // We think the token is just a function so return it as-is
            return tokenOrFunction;
        }
        else {
            // This will throw the not found error
            return injector.get(tokenOrFunction);
        }
    }
    return result;
}
function getChildRouteGuards(futureNode, currNode, contexts, futurePath, checks = {
    canDeactivateChecks: [],
    canActivateChecks: [],
}) {
    const prevChildren = nodeChildrenAsMap(currNode);
    // Process the children of the future route
    futureNode.children.forEach((c) => {
        getRouteGuards(c, prevChildren[c.value.outlet], contexts, futurePath.concat([c.value]), checks);
        delete prevChildren[c.value.outlet];
    });
    // Process any children left from the current route (not active for the future route)
    Object.entries(prevChildren).forEach(([k, v]) => deactivateRouteAndItsChildren(v, contexts.getContext(k), checks));
    return checks;
}
function getRouteGuards(futureNode, currNode, parentContexts, futurePath, checks = {
    canDeactivateChecks: [],
    canActivateChecks: [],
}) {
    const future = futureNode.value;
    const curr = currNode ? currNode.value : null;
    const context = parentContexts ? parentContexts.getContext(futureNode.value.outlet) : null;
    // reusing the node
    if (curr && future.routeConfig === curr.routeConfig) {
        const shouldRun = shouldRunGuardsAndResolvers(curr, future, future.routeConfig.runGuardsAndResolvers);
        if (shouldRun) {
            checks.canActivateChecks.push(new CanActivate(futurePath));
        }
        else {
            // we need to set the data
            future.data = curr.data;
            future._resolvedData = curr._resolvedData;
        }
        // If we have a component, we need to go through an outlet.
        if (future.component) {
            getChildRouteGuards(futureNode, currNode, context ? context.children : null, futurePath, checks);
            // if we have a componentless route, we recurse but keep the same outlet map.
        }
        else {
            getChildRouteGuards(futureNode, currNode, parentContexts, futurePath, checks);
        }
        if (shouldRun && context && context.outlet && context.outlet.isActivated) {
            checks.canDeactivateChecks.push(new CanDeactivate(context.outlet.component, curr));
        }
    }
    else {
        if (curr) {
            deactivateRouteAndItsChildren(currNode, context, checks);
        }
        checks.canActivateChecks.push(new CanActivate(futurePath));
        // If we have a component, we need to go through an outlet.
        if (future.component) {
            getChildRouteGuards(futureNode, null, context ? context.children : null, futurePath, checks);
            // if we have a componentless route, we recurse but keep the same outlet map.
        }
        else {
            getChildRouteGuards(futureNode, null, parentContexts, futurePath, checks);
        }
    }
    return checks;
}
function shouldRunGuardsAndResolvers(curr, future, mode) {
    if (typeof mode === 'function') {
        return mode(curr, future);
    }
    switch (mode) {
        case 'pathParamsChange':
            return !equalPath(curr.url, future.url);
        case 'pathParamsOrQueryParamsChange':
            return (!equalPath(curr.url, future.url) || !shallowEqual(curr.queryParams, future.queryParams));
        case 'always':
            return true;
        case 'paramsOrQueryParamsChange':
            return (!equalParamsAndUrlSegments(curr, future) ||
                !shallowEqual(curr.queryParams, future.queryParams));
        case 'paramsChange':
        default:
            return !equalParamsAndUrlSegments(curr, future);
    }
}
function deactivateRouteAndItsChildren(route, context, checks) {
    const children = nodeChildrenAsMap(route);
    const r = route.value;
    Object.entries(children).forEach(([childName, node]) => {
        if (!r.component) {
            deactivateRouteAndItsChildren(node, context, checks);
        }
        else if (context) {
            deactivateRouteAndItsChildren(node, context.children.getContext(childName), checks);
        }
        else {
            deactivateRouteAndItsChildren(node, null, checks);
        }
    });
    if (!r.component) {
        checks.canDeactivateChecks.push(new CanDeactivate(null, r));
    }
    else if (context && context.outlet && context.outlet.isActivated) {
        checks.canDeactivateChecks.push(new CanDeactivate(context.outlet.component, r));
    }
    else {
        checks.canDeactivateChecks.push(new CanDeactivate(null, r));
    }
}

/**
 * Simple function check, but generic so type inference will flow. Example:
 *
 * function product(a: number, b: number) {
 *   return a * b;
 * }
 *
 * if (isFunction<product>(fn)) {
 *   return fn(1, 2);
 * } else {
 *   throw "Must provide the `product` function";
 * }
 */
function isFunction(v) {
    return typeof v === 'function';
}
function isBoolean(v) {
    return typeof v === 'boolean';
}
function isCanLoad(guard) {
    return guard && isFunction(guard.canLoad);
}
function isCanActivate(guard) {
    return guard && isFunction(guard.canActivate);
}
function isCanActivateChild(guard) {
    return guard && isFunction(guard.canActivateChild);
}
function isCanDeactivate(guard) {
    return guard && isFunction(guard.canDeactivate);
}
function isCanMatch(guard) {
    return guard && isFunction(guard.canMatch);
}
function isEmptyError(e) {
    return e instanceof EmptyError || e?.name === 'EmptyError';
}

const INITIAL_VALUE = /* @__PURE__ */ Symbol('INITIAL_VALUE');
function prioritizedGuardValue() {
    return switchMap((obs) => {
        return combineLatest(obs.map((o) => o.pipe(take(1), startWith(INITIAL_VALUE)))).pipe(map((results) => {
            for (const result of results) {
                if (result === true) {
                    // If result is true, check the next one
                    continue;
                }
                else if (result === INITIAL_VALUE) {
                    // If guard has not finished, we need to stop processing.
                    return INITIAL_VALUE;
                }
                else if (result === false || isRedirect(result)) {
                    // Result finished and was not true. Return the result.
                    // Note that we only allow false/UrlTree/RedirectCommand. Other values are considered invalid and
                    // ignored.
                    return result;
                }
            }
            // Everything resolved to true. Return true.
            return true;
        }), filter((item) => item !== INITIAL_VALUE), take(1));
    });
}
function isRedirect(val) {
    return isUrlTree(val) || val instanceof RedirectCommand;
}

function checkGuards(injector, forwardEvent) {
    return mergeMap((t) => {
        const { targetSnapshot, currentSnapshot, guards: { canActivateChecks, canDeactivateChecks }, } = t;
        if (canDeactivateChecks.length === 0 && canActivateChecks.length === 0) {
            return of({ ...t, guardsResult: true });
        }
        return runCanDeactivateChecks(canDeactivateChecks, targetSnapshot, currentSnapshot, injector).pipe(mergeMap((canDeactivate) => {
            return canDeactivate && isBoolean(canDeactivate)
                ? runCanActivateChecks(targetSnapshot, canActivateChecks, injector, forwardEvent)
                : of(canDeactivate);
        }), map((guardsResult) => ({ ...t, guardsResult })));
    });
}
function runCanDeactivateChecks(checks, futureRSS, currRSS, injector) {
    return from(checks).pipe(mergeMap((check) => runCanDeactivate(check.component, check.route, currRSS, futureRSS, injector)), first((result) => {
        return result !== true;
    }, true));
}
function runCanActivateChecks(futureSnapshot, checks, injector, forwardEvent) {
    return from(checks).pipe(concatMap((check) => {
        return concat(fireChildActivationStart(check.route.parent, forwardEvent), fireActivationStart(check.route, forwardEvent), runCanActivateChild(futureSnapshot, check.path, injector), runCanActivate(futureSnapshot, check.route, injector));
    }), first((result) => {
        return result !== true;
    }, true));
}
/**
 * This should fire off `ActivationStart` events for each route being activated at this
 * level.
 * In other words, if you're activating `a` and `b` below, `path` will contain the
 * `ActivatedRouteSnapshot`s for both and we will fire `ActivationStart` for both. Always
 * return
 * `true` so checks continue to run.
 */
function fireActivationStart(snapshot, forwardEvent) {
    if (snapshot !== null && forwardEvent) {
        forwardEvent(new ActivationStart(snapshot));
    }
    return of(true);
}
/**
 * This should fire off `ChildActivationStart` events for each route being activated at this
 * level.
 * In other words, if you're activating `a` and `b` below, `path` will contain the
 * `ActivatedRouteSnapshot`s for both and we will fire `ChildActivationStart` for both. Always
 * return
 * `true` so checks continue to run.
 */
function fireChildActivationStart(snapshot, forwardEvent) {
    if (snapshot !== null && forwardEvent) {
        forwardEvent(new ChildActivationStart(snapshot));
    }
    return of(true);
}
function runCanActivate(futureRSS, futureARS, injector) {
    const canActivate = futureARS.routeConfig ? futureARS.routeConfig.canActivate : null;
    if (!canActivate || canActivate.length === 0)
        return of(true);
    const canActivateObservables = canActivate.map((canActivate) => {
        return defer(() => {
            const closestInjector = getClosestRouteInjector(futureARS) ?? injector;
            const guard = getTokenOrFunctionIdentity(canActivate, closestInjector);
            const guardVal = isCanActivate(guard)
                ? guard.canActivate(futureARS, futureRSS)
                : runInInjectionContext(closestInjector, () => guard(futureARS, futureRSS));
            return wrapIntoObservable(guardVal).pipe(first());
        });
    });
    return of(canActivateObservables).pipe(prioritizedGuardValue());
}
function runCanActivateChild(futureRSS, path, injector) {
    const futureARS = path[path.length - 1];
    const canActivateChildGuards = path
        .slice(0, path.length - 1)
        .reverse()
        .map((p) => getCanActivateChild(p))
        .filter((_) => _ !== null);
    const canActivateChildGuardsMapped = canActivateChildGuards.map((d) => {
        return defer(() => {
            const guardsMapped = d.guards.map((canActivateChild) => {
                const closestInjector = getClosestRouteInjector(d.node) ?? injector;
                const guard = getTokenOrFunctionIdentity(canActivateChild, closestInjector);
                const guardVal = isCanActivateChild(guard)
                    ? guard.canActivateChild(futureARS, futureRSS)
                    : runInInjectionContext(closestInjector, () => guard(futureARS, futureRSS));
                return wrapIntoObservable(guardVal).pipe(first());
            });
            return of(guardsMapped).pipe(prioritizedGuardValue());
        });
    });
    return of(canActivateChildGuardsMapped).pipe(prioritizedGuardValue());
}
function runCanDeactivate(component, currARS, currRSS, futureRSS, injector) {
    const canDeactivate = currARS && currARS.routeConfig ? currARS.routeConfig.canDeactivate : null;
    if (!canDeactivate || canDeactivate.length === 0)
        return of(true);
    const canDeactivateObservables = canDeactivate.map((c) => {
        const closestInjector = getClosestRouteInjector(currARS) ?? injector;
        const guard = getTokenOrFunctionIdentity(c, closestInjector);
        const guardVal = isCanDeactivate(guard)
            ? guard.canDeactivate(component, currARS, currRSS, futureRSS)
            : runInInjectionContext(closestInjector, () => guard(component, currARS, currRSS, futureRSS));
        return wrapIntoObservable(guardVal).pipe(first());
    });
    return of(canDeactivateObservables).pipe(prioritizedGuardValue());
}
function runCanLoadGuards(injector, route, segments, urlSerializer) {
    const canLoad = route.canLoad;
    if (canLoad === undefined || canLoad.length === 0) {
        return of(true);
    }
    const canLoadObservables = canLoad.map((injectionToken) => {
        const guard = getTokenOrFunctionIdentity(injectionToken, injector);
        const guardVal = isCanLoad(guard)
            ? guard.canLoad(route, segments)
            : runInInjectionContext(injector, () => guard(route, segments));
        return wrapIntoObservable(guardVal);
    });
    return of(canLoadObservables).pipe(prioritizedGuardValue(), redirectIfUrlTree(urlSerializer));
}
function redirectIfUrlTree(urlSerializer) {
    return pipe(tap((result) => {
        if (typeof result === 'boolean')
            return;
        throw redirectingNavigationError(urlSerializer, result);
    }), map((result) => result === true));
}
function runCanMatchGuards(injector, route, segments, urlSerializer) {
    const canMatch = route.canMatch;
    if (!canMatch || canMatch.length === 0)
        return of(true);
    const canMatchObservables = canMatch.map((injectionToken) => {
        const guard = getTokenOrFunctionIdentity(injectionToken, injector);
        const guardVal = isCanMatch(guard)
            ? guard.canMatch(route, segments)
            : runInInjectionContext(injector, () => guard(route, segments));
        return wrapIntoObservable(guardVal);
    });
    return of(canMatchObservables).pipe(prioritizedGuardValue(), redirectIfUrlTree(urlSerializer));
}

class NoMatch {
    segmentGroup;
    constructor(segmentGroup) {
        this.segmentGroup = segmentGroup || null;
    }
}
class AbsoluteRedirect extends Error {
    urlTree;
    constructor(urlTree) {
        super();
        this.urlTree = urlTree;
    }
}
function noMatch$1(segmentGroup) {
    return throwError(new NoMatch(segmentGroup));
}
function namedOutletsRedirect(redirectTo) {
    return throwError(new _RuntimeError(4000 /* RuntimeErrorCode.NAMED_OUTLET_REDIRECT */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
        `Only absolute redirects can have named outlets. redirectTo: '${redirectTo}'`));
}
function canLoadFails(route) {
    return throwError(navigationCancelingError((typeof ngDevMode === 'undefined' || ngDevMode) &&
        `Cannot load children because the guard of the route "path: '${route.path}'" returned false`, NavigationCancellationCode.GuardRejected));
}
class ApplyRedirects {
    urlSerializer;
    urlTree;
    constructor(urlSerializer, urlTree) {
        this.urlSerializer = urlSerializer;
        this.urlTree = urlTree;
    }
    lineralizeSegments(route, urlTree) {
        let res = [];
        let c = urlTree.root;
        while (true) {
            res = res.concat(c.segments);
            if (c.numberOfChildren === 0) {
                return of(res);
            }
            if (c.numberOfChildren > 1 || !c.children[PRIMARY_OUTLET]) {
                return namedOutletsRedirect(`${route.redirectTo}`);
            }
            c = c.children[PRIMARY_OUTLET];
        }
    }
    applyRedirectCommands(segments, redirectTo, posParams, currentSnapshot, injector) {
        return getRedirectResult(redirectTo, currentSnapshot, injector).pipe(map((redirect) => {
            if (redirect instanceof UrlTree) {
                throw new AbsoluteRedirect(redirect);
            }
            const newTree = this.applyRedirectCreateUrlTree(redirect, this.urlSerializer.parse(redirect), segments, posParams);
            if (redirect[0] === '/') {
                throw new AbsoluteRedirect(newTree);
            }
            return newTree;
        }));
    }
    applyRedirectCreateUrlTree(redirectTo, urlTree, segments, posParams) {
        const newRoot = this.createSegmentGroup(redirectTo, urlTree.root, segments, posParams);
        return new UrlTree(newRoot, this.createQueryParams(urlTree.queryParams, this.urlTree.queryParams), urlTree.fragment);
    }
    createQueryParams(redirectToParams, actualParams) {
        const res = {};
        Object.entries(redirectToParams).forEach(([k, v]) => {
            const copySourceValue = typeof v === 'string' && v[0] === ':';
            if (copySourceValue) {
                const sourceName = v.substring(1);
                res[k] = actualParams[sourceName];
            }
            else {
                res[k] = v;
            }
        });
        return res;
    }
    createSegmentGroup(redirectTo, group, segments, posParams) {
        const updatedSegments = this.createSegments(redirectTo, group.segments, segments, posParams);
        let children = {};
        Object.entries(group.children).forEach(([name, child]) => {
            children[name] = this.createSegmentGroup(redirectTo, child, segments, posParams);
        });
        return new UrlSegmentGroup(updatedSegments, children);
    }
    createSegments(redirectTo, redirectToSegments, actualSegments, posParams) {
        return redirectToSegments.map((s) => s.path[0] === ':'
            ? this.findPosParam(redirectTo, s, posParams)
            : this.findOrReturn(s, actualSegments));
    }
    findPosParam(redirectTo, redirectToUrlSegment, posParams) {
        const pos = posParams[redirectToUrlSegment.path.substring(1)];
        if (!pos)
            throw new _RuntimeError(4001 /* RuntimeErrorCode.MISSING_REDIRECT */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
                `Cannot redirect to '${redirectTo}'. Cannot find '${redirectToUrlSegment.path}'.`);
        return pos;
    }
    findOrReturn(redirectToUrlSegment, actualSegments) {
        let idx = 0;
        for (const s of actualSegments) {
            if (s.path === redirectToUrlSegment.path) {
                actualSegments.splice(idx);
                return s;
            }
            idx++;
        }
        return redirectToUrlSegment;
    }
}
function getRedirectResult(redirectTo, currentSnapshot, injector) {
    if (typeof redirectTo === 'string') {
        return of(redirectTo);
    }
    const redirectToFn = redirectTo;
    const { queryParams, fragment, routeConfig, url, outlet, params, data, title } = currentSnapshot;
    return wrapIntoObservable(runInInjectionContext(injector, () => redirectToFn({ params, data, queryParams, fragment, routeConfig, url, outlet, title })));
}

const noMatch = {
    matched: false,
    consumedSegments: [],
    remainingSegments: [],
    parameters: {},
    positionalParamSegments: {},
};
function matchWithChecks(segmentGroup, route, segments, injector, urlSerializer) {
    const result = match(segmentGroup, route, segments);
    if (!result.matched) {
        return of(result);
    }
    // Only create the Route's `EnvironmentInjector` if it matches the attempted
    // navigation
    injector = getOrCreateRouteInjectorIfNeeded(route, injector);
    return runCanMatchGuards(injector, route, segments, urlSerializer).pipe(map((v) => (v === true ? result : { ...noMatch })));
}
function match(segmentGroup, route, segments) {
    if (route.path === '**') {
        return createWildcardMatchResult(segments);
    }
    if (route.path === '') {
        if (route.pathMatch === 'full' && (segmentGroup.hasChildren() || segments.length > 0)) {
            return { ...noMatch };
        }
        return {
            matched: true,
            consumedSegments: [],
            remainingSegments: segments,
            parameters: {},
            positionalParamSegments: {},
        };
    }
    const matcher = route.matcher || defaultUrlMatcher;
    const res = matcher(segments, segmentGroup, route);
    if (!res)
        return { ...noMatch };
    const posParams = {};
    Object.entries(res.posParams ?? {}).forEach(([k, v]) => {
        posParams[k] = v.path;
    });
    const parameters = res.consumed.length > 0
        ? { ...posParams, ...res.consumed[res.consumed.length - 1].parameters }
        : posParams;
    return {
        matched: true,
        consumedSegments: res.consumed,
        remainingSegments: segments.slice(res.consumed.length),
        // TODO(atscott): investigate combining parameters and positionalParamSegments
        parameters,
        positionalParamSegments: res.posParams ?? {},
    };
}
function createWildcardMatchResult(segments) {
    return {
        matched: true,
        parameters: segments.length > 0 ? last(segments).parameters : {},
        consumedSegments: segments,
        remainingSegments: [],
        positionalParamSegments: {},
    };
}
function split(segmentGroup, consumedSegments, slicedSegments, config) {
    if (slicedSegments.length > 0 &&
        containsEmptyPathMatchesWithNamedOutlets(segmentGroup, slicedSegments, config)) {
        const s = new UrlSegmentGroup(consumedSegments, createChildrenForEmptyPaths(config, new UrlSegmentGroup(slicedSegments, segmentGroup.children)));
        return { segmentGroup: s, slicedSegments: [] };
    }
    if (slicedSegments.length === 0 &&
        containsEmptyPathMatches(segmentGroup, slicedSegments, config)) {
        const s = new UrlSegmentGroup(segmentGroup.segments, addEmptyPathsToChildrenIfNeeded(segmentGroup, slicedSegments, config, segmentGroup.children));
        return { segmentGroup: s, slicedSegments };
    }
    const s = new UrlSegmentGroup(segmentGroup.segments, segmentGroup.children);
    return { segmentGroup: s, slicedSegments };
}
function addEmptyPathsToChildrenIfNeeded(segmentGroup, slicedSegments, routes, children) {
    const res = {};
    for (const r of routes) {
        if (emptyPathMatch(segmentGroup, slicedSegments, r) && !children[getOutlet(r)]) {
            const s = new UrlSegmentGroup([], {});
            res[getOutlet(r)] = s;
        }
    }
    return { ...children, ...res };
}
function createChildrenForEmptyPaths(routes, primarySegment) {
    const res = {};
    res[PRIMARY_OUTLET] = primarySegment;
    for (const r of routes) {
        if (r.path === '' && getOutlet(r) !== PRIMARY_OUTLET) {
            const s = new UrlSegmentGroup([], {});
            res[getOutlet(r)] = s;
        }
    }
    return res;
}
function containsEmptyPathMatchesWithNamedOutlets(segmentGroup, slicedSegments, routes) {
    return routes.some((r) => emptyPathMatch(segmentGroup, slicedSegments, r) && getOutlet(r) !== PRIMARY_OUTLET);
}
function containsEmptyPathMatches(segmentGroup, slicedSegments, routes) {
    return routes.some((r) => emptyPathMatch(segmentGroup, slicedSegments, r));
}
function emptyPathMatch(segmentGroup, slicedSegments, r) {
    if ((segmentGroup.hasChildren() || slicedSegments.length > 0) && r.pathMatch === 'full') {
        return false;
    }
    return r.path === '';
}
function noLeftoversInUrl(segmentGroup, segments, outlet) {
    return segments.length === 0 && !segmentGroup.children[outlet];
}

/**
 * Class used to indicate there were no additional route config matches but that all segments of
 * the URL were consumed during matching so the route was URL matched. When this happens, we still
 * try to match child configs in case there are empty path children.
 */
class NoLeftoversInUrl {
}
function recognize$1(injector, configLoader, rootComponentType, config, urlTree, urlSerializer, paramsInheritanceStrategy = 'emptyOnly') {
    return new Recognizer(injector, configLoader, rootComponentType, config, urlTree, paramsInheritanceStrategy, urlSerializer).recognize();
}
const MAX_ALLOWED_REDIRECTS = 31;
class Recognizer {
    injector;
    configLoader;
    rootComponentType;
    config;
    urlTree;
    paramsInheritanceStrategy;
    urlSerializer;
    applyRedirects;
    absoluteRedirectCount = 0;
    allowRedirects = true;
    constructor(injector, configLoader, rootComponentType, config, urlTree, paramsInheritanceStrategy, urlSerializer) {
        this.injector = injector;
        this.configLoader = configLoader;
        this.rootComponentType = rootComponentType;
        this.config = config;
        this.urlTree = urlTree;
        this.paramsInheritanceStrategy = paramsInheritanceStrategy;
        this.urlSerializer = urlSerializer;
        this.applyRedirects = new ApplyRedirects(this.urlSerializer, this.urlTree);
    }
    noMatchError(e) {
        return new _RuntimeError(4002 /* RuntimeErrorCode.NO_MATCH */, typeof ngDevMode === 'undefined' || ngDevMode
            ? `Cannot match any routes. URL Segment: '${e.segmentGroup}'`
            : `'${e.segmentGroup}'`);
    }
    recognize() {
        const rootSegmentGroup = split(this.urlTree.root, [], [], this.config).segmentGroup;
        return this.match(rootSegmentGroup).pipe(map(({ children, rootSnapshot }) => {
            const rootNode = new TreeNode(rootSnapshot, children);
            const routeState = new RouterStateSnapshot('', rootNode);
            const tree = createUrlTreeFromSnapshot(rootSnapshot, [], this.urlTree.queryParams, this.urlTree.fragment);
            // https://github.com/angular/angular/issues/47307
            // Creating the tree stringifies the query params
            // We don't want to do this here so reassign them to the original.
            tree.queryParams = this.urlTree.queryParams;
            routeState.url = this.urlSerializer.serialize(tree);
            return { state: routeState, tree };
        }));
    }
    match(rootSegmentGroup) {
        // Use Object.freeze to prevent readers of the Router state from modifying it outside
        // of a navigation, resulting in the router being out of sync with the browser.
        const rootSnapshot = new ActivatedRouteSnapshot([], Object.freeze({}), Object.freeze({ ...this.urlTree.queryParams }), this.urlTree.fragment, Object.freeze({}), PRIMARY_OUTLET, this.rootComponentType, null, {});
        return this.processSegmentGroup(this.injector, this.config, rootSegmentGroup, PRIMARY_OUTLET, rootSnapshot).pipe(map((children) => {
            return { children, rootSnapshot };
        }), catchError((e) => {
            if (e instanceof AbsoluteRedirect) {
                this.urlTree = e.urlTree;
                return this.match(e.urlTree.root);
            }
            if (e instanceof NoMatch) {
                throw this.noMatchError(e);
            }
            throw e;
        }));
    }
    processSegmentGroup(injector, config, segmentGroup, outlet, parentRoute) {
        if (segmentGroup.segments.length === 0 && segmentGroup.hasChildren()) {
            return this.processChildren(injector, config, segmentGroup, parentRoute);
        }
        return this.processSegment(injector, config, segmentGroup, segmentGroup.segments, outlet, true, parentRoute).pipe(map((child) => (child instanceof TreeNode ? [child] : [])));
    }
    /**
     * Matches every child outlet in the `segmentGroup` to a `Route` in the config. Returns `null` if
     * we cannot find a match for _any_ of the children.
     *
     * @param config - The `Routes` to match against
     * @param segmentGroup - The `UrlSegmentGroup` whose children need to be matched against the
     *     config.
     */
    processChildren(injector, config, segmentGroup, parentRoute) {
        // Expand outlets one at a time, starting with the primary outlet. We need to do it this way
        // because an absolute redirect from the primary outlet takes precedence.
        const childOutlets = [];
        for (const child of Object.keys(segmentGroup.children)) {
            if (child === 'primary') {
                childOutlets.unshift(child);
            }
            else {
                childOutlets.push(child);
            }
        }
        return from(childOutlets).pipe(concatMap((childOutlet) => {
            const child = segmentGroup.children[childOutlet];
            // Sort the config so that routes with outlets that match the one being activated
            // appear first, followed by routes for other outlets, which might match if they have
            // an empty path.
            const sortedConfig = sortByMatchingOutlets(config, childOutlet);
            return this.processSegmentGroup(injector, sortedConfig, child, childOutlet, parentRoute);
        }), scan((children, outletChildren) => {
            children.push(...outletChildren);
            return children;
        }), defaultIfEmpty(null), last$1(), mergeMap((children) => {
            if (children === null)
                return noMatch$1(segmentGroup);
            // Because we may have matched two outlets to the same empty path segment, we can have
            // multiple activated results for the same outlet. We should merge the children of
            // these results so the final return value is only one `TreeNode` per outlet.
            const mergedChildren = mergeEmptyPathMatches(children);
            if (typeof ngDevMode === 'undefined' || ngDevMode) {
                // This should really never happen - we are only taking the first match for each
                // outlet and merge the empty path matches.
                checkOutletNameUniqueness(mergedChildren);
            }
            sortActivatedRouteSnapshots(mergedChildren);
            return of(mergedChildren);
        }));
    }
    processSegment(injector, routes, segmentGroup, segments, outlet, allowRedirects, parentRoute) {
        return from(routes).pipe(concatMap((r) => {
            return this.processSegmentAgainstRoute(r._injector ?? injector, routes, r, segmentGroup, segments, outlet, allowRedirects, parentRoute).pipe(catchError((e) => {
                if (e instanceof NoMatch) {
                    return of(null);
                }
                throw e;
            }));
        }), first((x) => !!x), catchError((e) => {
            if (isEmptyError(e)) {
                if (noLeftoversInUrl(segmentGroup, segments, outlet)) {
                    return of(new NoLeftoversInUrl());
                }
                return noMatch$1(segmentGroup);
            }
            throw e;
        }));
    }
    processSegmentAgainstRoute(injector, routes, route, rawSegment, segments, outlet, allowRedirects, parentRoute) {
        // We allow matches to empty paths when the outlets differ so we can match a url like `/(b:b)` to
        // a config like
        // * `{path: '', children: [{path: 'b', outlet: 'b'}]}`
        // or even
        // * `{path: '', outlet: 'a', children: [{path: 'b', outlet: 'b'}]`
        //
        // The exception here is when the segment outlet is for the primary outlet. This would
        // result in a match inside the named outlet because all children there are written as primary
        // outlets. So we need to prevent child named outlet matches in a url like `/b` in a config like
        // * `{path: '', outlet: 'x' children: [{path: 'b'}]}`
        // This should only match if the url is `/(x:b)`.
        if (getOutlet(route) !== outlet &&
            (outlet === PRIMARY_OUTLET || !emptyPathMatch(rawSegment, segments, route))) {
            return noMatch$1(rawSegment);
        }
        if (route.redirectTo === undefined) {
            return this.matchSegmentAgainstRoute(injector, rawSegment, route, segments, outlet, parentRoute);
        }
        if (this.allowRedirects && allowRedirects) {
            return this.expandSegmentAgainstRouteUsingRedirect(injector, rawSegment, routes, route, segments, outlet, parentRoute);
        }
        return noMatch$1(rawSegment);
    }
    expandSegmentAgainstRouteUsingRedirect(injector, segmentGroup, routes, route, segments, outlet, parentRoute) {
        const { matched, parameters, consumedSegments, positionalParamSegments, remainingSegments } = match(segmentGroup, route, segments);
        if (!matched)
            return noMatch$1(segmentGroup);
        // TODO(atscott): Move all of this under an if(ngDevMode) as a breaking change and allow stack
        // size exceeded in production
        if (typeof route.redirectTo === 'string' && route.redirectTo[0] === '/') {
            this.absoluteRedirectCount++;
            if (this.absoluteRedirectCount > MAX_ALLOWED_REDIRECTS) {
                if (ngDevMode) {
                    throw new _RuntimeError(4016 /* RuntimeErrorCode.INFINITE_REDIRECT */, `Detected possible infinite redirect when redirecting from '${this.urlTree}' to '${route.redirectTo}'.\n` +
                        `This is currently a dev mode only error but will become a` +
                        ` call stack size exceeded error in production in a future major version.`);
                }
                this.allowRedirects = false;
            }
        }
        const currentSnapshot = new ActivatedRouteSnapshot(segments, parameters, Object.freeze({ ...this.urlTree.queryParams }), this.urlTree.fragment, getData(route), getOutlet(route), route.component ?? route._loadedComponent ?? null, route, getResolve(route));
        const inherited = getInherited(currentSnapshot, parentRoute, this.paramsInheritanceStrategy);
        currentSnapshot.params = Object.freeze(inherited.params);
        currentSnapshot.data = Object.freeze(inherited.data);
        const newTree$ = this.applyRedirects.applyRedirectCommands(consumedSegments, route.redirectTo, positionalParamSegments, currentSnapshot, injector);
        return newTree$.pipe(switchMap((newTree) => this.applyRedirects.lineralizeSegments(route, newTree)), mergeMap((newSegments) => {
            return this.processSegment(injector, routes, segmentGroup, newSegments.concat(remainingSegments), outlet, false, parentRoute);
        }));
    }
    matchSegmentAgainstRoute(injector, rawSegment, route, segments, outlet, parentRoute) {
        const matchResult = matchWithChecks(rawSegment, route, segments, injector, this.urlSerializer);
        if (route.path === '**') {
            // Prior versions of the route matching algorithm would stop matching at the wildcard route.
            // We should investigate a better strategy for any existing children. Otherwise, these
            // child segments are silently dropped from the navigation.
            // https://github.com/angular/angular/issues/40089
            rawSegment.children = {};
        }
        return matchResult.pipe(switchMap((result) => {
            if (!result.matched) {
                return noMatch$1(rawSegment);
            }
            // If the route has an injector created from providers, we should start using that.
            injector = route._injector ?? injector;
            return this.getChildConfig(injector, route, segments).pipe(switchMap(({ routes: childConfig }) => {
                const childInjector = route._loadedInjector ?? injector;
                const { parameters, consumedSegments, remainingSegments } = result;
                const snapshot = new ActivatedRouteSnapshot(consumedSegments, parameters, Object.freeze({ ...this.urlTree.queryParams }), this.urlTree.fragment, getData(route), getOutlet(route), route.component ?? route._loadedComponent ?? null, route, getResolve(route));
                const inherited = getInherited(snapshot, parentRoute, this.paramsInheritanceStrategy);
                snapshot.params = Object.freeze(inherited.params);
                snapshot.data = Object.freeze(inherited.data);
                const { segmentGroup, slicedSegments } = split(rawSegment, consumedSegments, remainingSegments, childConfig);
                if (slicedSegments.length === 0 && segmentGroup.hasChildren()) {
                    return this.processChildren(childInjector, childConfig, segmentGroup, snapshot).pipe(map((children) => {
                        return new TreeNode(snapshot, children);
                    }));
                }
                if (childConfig.length === 0 && slicedSegments.length === 0) {
                    return of(new TreeNode(snapshot, []));
                }
                const matchedOnOutlet = getOutlet(route) === outlet;
                // If we matched a config due to empty path match on a different outlet, we need to
                // continue passing the current outlet for the segment rather than switch to PRIMARY.
                // Note that we switch to primary when we have a match because outlet configs look like
                // this: {path: 'a', outlet: 'a', children: [
                //  {path: 'b', component: B},
                //  {path: 'c', component: C},
                // ]}
                // Notice that the children of the named outlet are configured with the primary outlet
                return this.processSegment(childInjector, childConfig, segmentGroup, slicedSegments, matchedOnOutlet ? PRIMARY_OUTLET : outlet, true, snapshot).pipe(map((child) => {
                    return new TreeNode(snapshot, child instanceof TreeNode ? [child] : []);
                }));
            }));
        }));
    }
    getChildConfig(injector, route, segments) {
        if (route.children) {
            // The children belong to the same module
            return of({ routes: route.children, injector });
        }
        if (route.loadChildren) {
            // lazy children belong to the loaded module
            if (route._loadedRoutes !== undefined) {
                return of({ routes: route._loadedRoutes, injector: route._loadedInjector });
            }
            return runCanLoadGuards(injector, route, segments, this.urlSerializer).pipe(mergeMap((shouldLoadResult) => {
                if (shouldLoadResult) {
                    return this.configLoader.loadChildren(injector, route).pipe(tap((cfg) => {
                        route._loadedRoutes = cfg.routes;
                        route._loadedInjector = cfg.injector;
                    }));
                }
                return canLoadFails(route);
            }));
        }
        return of({ routes: [], injector });
    }
}
function sortActivatedRouteSnapshots(nodes) {
    nodes.sort((a, b) => {
        if (a.value.outlet === PRIMARY_OUTLET)
            return -1;
        if (b.value.outlet === PRIMARY_OUTLET)
            return 1;
        return a.value.outlet.localeCompare(b.value.outlet);
    });
}
function hasEmptyPathConfig(node) {
    const config = node.value.routeConfig;
    return config && config.path === '';
}
/**
 * Finds `TreeNode`s with matching empty path route configs and merges them into `TreeNode` with
 * the children from each duplicate. This is necessary because different outlets can match a
 * single empty path route config and the results need to then be merged.
 */
function mergeEmptyPathMatches(nodes) {
    const result = [];
    // The set of nodes which contain children that were merged from two duplicate empty path nodes.
    const mergedNodes = new Set();
    for (const node of nodes) {
        if (!hasEmptyPathConfig(node)) {
            result.push(node);
            continue;
        }
        const duplicateEmptyPathNode = result.find((resultNode) => node.value.routeConfig === resultNode.value.routeConfig);
        if (duplicateEmptyPathNode !== undefined) {
            duplicateEmptyPathNode.children.push(...node.children);
            mergedNodes.add(duplicateEmptyPathNode);
        }
        else {
            result.push(node);
        }
    }
    // For each node which has children from multiple sources, we need to recompute a new `TreeNode`
    // by also merging those children. This is necessary when there are multiple empty path configs
    // in a row. Put another way: whenever we combine children of two nodes, we need to also check
    // if any of those children can be combined into a single node as well.
    for (const mergedNode of mergedNodes) {
        const mergedChildren = mergeEmptyPathMatches(mergedNode.children);
        result.push(new TreeNode(mergedNode.value, mergedChildren));
    }
    return result.filter((n) => !mergedNodes.has(n));
}
function checkOutletNameUniqueness(nodes) {
    const names = {};
    nodes.forEach((n) => {
        const routeWithSameOutletName = names[n.value.outlet];
        if (routeWithSameOutletName) {
            const p = routeWithSameOutletName.url.map((s) => s.toString()).join('/');
            const c = n.value.url.map((s) => s.toString()).join('/');
            throw new _RuntimeError(4006 /* RuntimeErrorCode.TWO_SEGMENTS_WITH_SAME_OUTLET */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
                `Two segments cannot have the same outlet name: '${p}' and '${c}'.`);
        }
        names[n.value.outlet] = n.value;
    });
}
function getData(route) {
    return route.data || {};
}
function getResolve(route) {
    return route.resolve || {};
}

function recognize(injector, configLoader, rootComponentType, config, serializer, paramsInheritanceStrategy) {
    return mergeMap((t) => recognize$1(injector, configLoader, rootComponentType, config, t.extractedUrl, serializer, paramsInheritanceStrategy).pipe(map(({ state: targetSnapshot, tree: urlAfterRedirects }) => {
        return { ...t, targetSnapshot, urlAfterRedirects };
    })));
}

function resolveData(paramsInheritanceStrategy, injector) {
    return mergeMap((t) => {
        const { targetSnapshot, guards: { canActivateChecks }, } = t;
        if (!canActivateChecks.length) {
            return of(t);
        }
        // Iterating a Set in javascript  happens in insertion order so it is safe to use a `Set` to
        // preserve the correct order that the resolvers should run in.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set#description
        const routesWithResolversToRun = new Set(canActivateChecks.map((check) => check.route));
        const routesNeedingDataUpdates = new Set();
        for (const route of routesWithResolversToRun) {
            if (routesNeedingDataUpdates.has(route)) {
                continue;
            }
            // All children under the route with a resolver to run need to recompute inherited data.
            for (const newRoute of flattenRouteTree(route)) {
                routesNeedingDataUpdates.add(newRoute);
            }
        }
        let routesProcessed = 0;
        return from(routesNeedingDataUpdates).pipe(concatMap((route) => {
            if (routesWithResolversToRun.has(route)) {
                return runResolve(route, targetSnapshot, paramsInheritanceStrategy, injector);
            }
            else {
                route.data = getInherited(route, route.parent, paramsInheritanceStrategy).resolve;
                return of(void 0);
            }
        }), tap(() => routesProcessed++), takeLast(1), mergeMap((_) => (routesProcessed === routesNeedingDataUpdates.size ? of(t) : EMPTY)));
    });
}
/**
 *  Returns the `ActivatedRouteSnapshot` tree as an array, using DFS to traverse the route tree.
 */
function flattenRouteTree(route) {
    const descendants = route.children.map((child) => flattenRouteTree(child)).flat();
    return [route, ...descendants];
}
function runResolve(futureARS, futureRSS, paramsInheritanceStrategy, injector) {
    const config = futureARS.routeConfig;
    const resolve = futureARS._resolve;
    if (config?.title !== undefined && !hasStaticTitle(config)) {
        resolve[RouteTitleKey] = config.title;
    }
    return defer(() => {
        futureARS.data = getInherited(futureARS, futureARS.parent, paramsInheritanceStrategy).resolve;
        return resolveNode(resolve, futureARS, futureRSS, injector).pipe(map((resolvedData) => {
            futureARS._resolvedData = resolvedData;
            futureARS.data = { ...futureARS.data, ...resolvedData };
            return null;
        }));
    });
}
function resolveNode(resolve, futureARS, futureRSS, injector) {
    const keys = getDataKeys(resolve);
    if (keys.length === 0) {
        return of({});
    }
    const data = {};
    return from(keys).pipe(mergeMap((key) => getResolver(resolve[key], futureARS, futureRSS, injector).pipe(first(), tap((value) => {
        if (value instanceof RedirectCommand) {
            throw redirectingNavigationError(new DefaultUrlSerializer(), value);
        }
        data[key] = value;
    }))), takeLast(1), map(() => data), catchError((e) => (isEmptyError(e) ? EMPTY : throwError(e))));
}
function getResolver(injectionToken, futureARS, futureRSS, injector) {
    const closestInjector = getClosestRouteInjector(futureARS) ?? injector;
    const resolver = getTokenOrFunctionIdentity(injectionToken, closestInjector);
    const resolverValue = resolver.resolve
        ? resolver.resolve(futureARS, futureRSS)
        : runInInjectionContext(closestInjector, () => resolver(futureARS, futureRSS));
    return wrapIntoObservable(resolverValue);
}

/**
 * Perform a side effect through a switchMap for every emission on the source Observable,
 * but return an Observable that is identical to the source. It's essentially the same as
 * the `tap` operator, but if the side effectful `next` function returns an ObservableInput,
 * it will wait before continuing with the original value.
 */
function switchTap(next) {
    return switchMap((v) => {
        const nextResult = next(v);
        if (nextResult) {
            return from(nextResult).pipe(map(() => v));
        }
        return of(v);
    });
}

/**
 * Provides a strategy for setting the page title after a router navigation.
 *
 * The built-in implementation traverses the router state snapshot and finds the deepest primary
 * outlet with `title` property. Given the `Routes` below, navigating to
 * `/base/child(popup:aux)` would result in the document title being set to "child".
 * ```ts
 * [
 *   {path: 'base', title: 'base', children: [
 *     {path: 'child', title: 'child'},
 *   ],
 *   {path: 'aux', outlet: 'popup', title: 'popupTitle'}
 * ]
 * ```
 *
 * This class can be used as a base class for custom title strategies. That is, you can create your
 * own class that extends the `TitleStrategy`. Note that in the above example, the `title`
 * from the named outlet is never used. However, a custom strategy might be implemented to
 * incorporate titles in named outlets.
 *
 * @publicApi
 * @see [Page title guide](guide/routing/common-router-tasks#setting-the-page-title)
 */
class TitleStrategy {
    /**
     * @returns The `title` of the deepest primary route.
     */
    buildTitle(snapshot) {
        let pageTitle;
        let route = snapshot.root;
        while (route !== undefined) {
            pageTitle = this.getResolvedTitleForRoute(route) ?? pageTitle;
            route = route.children.find((child) => child.outlet === PRIMARY_OUTLET);
        }
        return pageTitle;
    }
    /**
     * Given an `ActivatedRouteSnapshot`, returns the final value of the
     * `Route.title` property, which can either be a static string or a resolved value.
     */
    getResolvedTitleForRoute(snapshot) {
        return snapshot.data[RouteTitleKey];
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: TitleStrategy, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: TitleStrategy, providedIn: 'root', useFactory: () => inject(DefaultTitleStrategy) });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: TitleStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root', useFactory: () => inject(DefaultTitleStrategy) }]
        }] });
/**
 * The default `TitleStrategy` used by the router that updates the title using the `Title` service.
 */
class DefaultTitleStrategy extends TitleStrategy {
    title;
    constructor(title) {
        super();
        this.title = title;
    }
    /**
     * Sets the title of the browser to the given value.
     *
     * @param title The `pageTitle` from the deepest primary route.
     */
    updateTitle(snapshot) {
        const title = this.buildTitle(snapshot);
        if (title !== undefined) {
            this.title.setTitle(title);
        }
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: DefaultTitleStrategy, deps: [{ token: i1.Title }], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: DefaultTitleStrategy, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: DefaultTitleStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: () => [{ type: i1.Title }] });

/**
 * A DI token for the router service.
 *
 * @publicApi
 */
const ROUTER_CONFIGURATION = new InjectionToken(typeof ngDevMode === 'undefined' || ngDevMode ? 'router config' : '', {
    providedIn: 'root',
    factory: () => ({}),
});

/**
 * The DI token for a router configuration.
 *
 * `ROUTES` is a low level API for router configuration via dependency injection.
 *
 * We recommend that in almost all cases to use higher level APIs such as `RouterModule.forRoot()`,
 * `provideRouter`, or `Router.resetConfig()`.
 *
 * @publicApi
 */
const ROUTES = new InjectionToken(ngDevMode ? 'ROUTES' : '');
class RouterConfigLoader {
    componentLoaders = new WeakMap();
    childrenLoaders = new WeakMap();
    onLoadStartListener;
    onLoadEndListener;
    compiler = inject(Compiler);
    loadComponent(injector, route) {
        if (this.componentLoaders.get(route)) {
            return this.componentLoaders.get(route);
        }
        else if (route._loadedComponent) {
            return of(route._loadedComponent);
        }
        if (this.onLoadStartListener) {
            this.onLoadStartListener(route);
        }
        const loadRunner = wrapIntoObservable(runInInjectionContext(injector, () => route.loadComponent())).pipe(map(maybeUnwrapDefaultExport), tap((component) => {
            if (this.onLoadEndListener) {
                this.onLoadEndListener(route);
            }
            (typeof ngDevMode === 'undefined' || ngDevMode) &&
                assertStandalone(route.path ?? '', component);
            route._loadedComponent = component;
        }), finalize(() => {
            this.componentLoaders.delete(route);
        }));
        // Use custom ConnectableObservable as share in runners pipe increasing the bundle size too much
        const loader = new ConnectableObservable(loadRunner, () => new Subject()).pipe(refCount());
        this.componentLoaders.set(route, loader);
        return loader;
    }
    loadChildren(parentInjector, route) {
        if (this.childrenLoaders.get(route)) {
            return this.childrenLoaders.get(route);
        }
        else if (route._loadedRoutes) {
            return of({ routes: route._loadedRoutes, injector: route._loadedInjector });
        }
        if (this.onLoadStartListener) {
            this.onLoadStartListener(route);
        }
        const moduleFactoryOrRoutes$ = loadChildren(route, this.compiler, parentInjector, this.onLoadEndListener);
        const loadRunner = moduleFactoryOrRoutes$.pipe(finalize(() => {
            this.childrenLoaders.delete(route);
        }));
        // Use custom ConnectableObservable as share in runners pipe increasing the bundle size too much
        const loader = new ConnectableObservable(loadRunner, () => new Subject()).pipe(refCount());
        this.childrenLoaders.set(route, loader);
        return loader;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: RouterConfigLoader, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: RouterConfigLoader, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: RouterConfigLoader, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
/**
 * Executes a `route.loadChildren` callback and converts the result to an array of child routes and
 * an injector if that callback returned a module.
 *
 * This function is used for the route discovery during prerendering
 * in @angular-devkit/build-angular. If there are any updates to the contract here, it will require
 * an update to the extractor.
 */
function loadChildren(route, compiler, parentInjector, onLoadEndListener) {
    return wrapIntoObservable(runInInjectionContext(parentInjector, () => route.loadChildren())).pipe(map(maybeUnwrapDefaultExport), mergeMap((t) => {
        if (t instanceof NgModuleFactory || Array.isArray(t)) {
            return of(t);
        }
        else {
            return from(compiler.compileModuleAsync(t));
        }
    }), map((factoryOrRoutes) => {
        if (onLoadEndListener) {
            onLoadEndListener(route);
        }
        // This injector comes from the `NgModuleRef` when lazy loading an `NgModule`. There is
        // no injector associated with lazy loading a `Route` array.
        let injector;
        let rawRoutes;
        let requireStandaloneComponents = false;
        if (Array.isArray(factoryOrRoutes)) {
            rawRoutes = factoryOrRoutes;
            requireStandaloneComponents = true;
        }
        else {
            injector = factoryOrRoutes.create(parentInjector).injector;
            // When loading a module that doesn't provide `RouterModule.forChild()` preloader
            // will get stuck in an infinite loop. The child module's Injector will look to
            // its parent `Injector` when it doesn't find any ROUTES so it will return routes
            // for it's parent module instead.
            rawRoutes = injector.get(ROUTES, [], { optional: true, self: true }).flat();
        }
        const routes = rawRoutes.map(standardizeConfig);
        (typeof ngDevMode === 'undefined' || ngDevMode) &&
            validateConfig(routes, route.path, requireStandaloneComponents);
        return { routes, injector };
    }));
}
function isWrappedDefaultExport(value) {
    // We use `in` here with a string key `'default'`, because we expect `DefaultExport` objects to be
    // dynamically imported ES modules with a spec-mandated `default` key. Thus we don't expect that
    // `default` will be a renamed property.
    return value && typeof value === 'object' && 'default' in value;
}
function maybeUnwrapDefaultExport(input) {
    // As per `isWrappedDefaultExport`, the `default` key here is generated by the browser and not
    // subject to property renaming, so we reference it with bracket access.
    return isWrappedDefaultExport(input) ? input['default'] : input;
}

/**
 * @description
 *
 * Provides a way to migrate AngularJS applications to Angular.
 *
 * @publicApi
 */
class UrlHandlingStrategy {
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: UrlHandlingStrategy, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: UrlHandlingStrategy, providedIn: 'root', useFactory: () => inject(DefaultUrlHandlingStrategy) });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: UrlHandlingStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root', useFactory: () => inject(DefaultUrlHandlingStrategy) }]
        }] });
/**
 * @publicApi
 */
class DefaultUrlHandlingStrategy {
    shouldProcessUrl(url) {
        return true;
    }
    extract(url) {
        return url;
    }
    merge(newUrlPart, wholeUrl) {
        return newUrlPart;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: DefaultUrlHandlingStrategy, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: DefaultUrlHandlingStrategy, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: DefaultUrlHandlingStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

const CREATE_VIEW_TRANSITION = new InjectionToken(ngDevMode ? 'view transition helper' : '');
const VIEW_TRANSITION_OPTIONS = new InjectionToken(ngDevMode ? 'view transition options' : '');
/**
 * A helper function for using browser view transitions. This function skips the call to
 * `startViewTransition` if the browser does not support it.
 *
 * @returns A Promise that resolves when the view transition callback begins.
 */
function createViewTransition(injector, from, to) {
    const transitionOptions = injector.get(VIEW_TRANSITION_OPTIONS);
    const document = injector.get(DOCUMENT);
    if (!document.startViewTransition || transitionOptions.skipNextTransition) {
        transitionOptions.skipNextTransition = false;
        // The timing of `startViewTransition` is closer to a macrotask. It won't be called
        // until the current event loop exits so we use a promise resolved in a timeout instead
        // of Promise.resolve().
        return new Promise((resolve) => setTimeout(resolve));
    }
    let resolveViewTransitionStarted;
    const viewTransitionStarted = new Promise((resolve) => {
        resolveViewTransitionStarted = resolve;
    });
    const transition = document.startViewTransition(() => {
        resolveViewTransitionStarted();
        // We don't actually update dom within the transition callback. The resolving of the above
        // promise unblocks the Router navigation, which synchronously activates and deactivates
        // routes (the DOM update). This view transition waits for the next change detection to
        // complete (below), which includes the update phase of the routed components.
        return createRenderPromise(injector);
    });
    transition.ready.catch((error) => {
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
            console.error(error);
        }
    });
    const { onViewTransitionCreated } = transitionOptions;
    if (onViewTransitionCreated) {
        runInInjectionContext(injector, () => onViewTransitionCreated({ transition, from, to }));
    }
    return viewTransitionStarted;
}
/**
 * Creates a promise that resolves after next render.
 */
function createRenderPromise(injector) {
    return new Promise((resolve) => {
        // Wait for the microtask queue to empty after the next render happens (by waiting a macrotask).
        // This ensures any follow-up renders in the microtask queue are completed before the
        // view transition starts animating.
        afterNextRender({ read: () => setTimeout(resolve) }, { injector });
    });
}

const NAVIGATION_ERROR_HANDLER = new InjectionToken(typeof ngDevMode === 'undefined' || ngDevMode ? 'navigation error handler' : '');
class NavigationTransitions {
    currentNavigation = null;
    currentTransition = null;
    lastSuccessfulNavigation = null;
    /**
     * These events are used to communicate back to the Router about the state of the transition. The
     * Router wants to respond to these events in various ways. Because the `NavigationTransition`
     * class is not public, this event subject is not publicly exposed.
     */
    events = new Subject();
    /**
     * Used to abort the current transition with an error.
     */
    transitionAbortWithErrorSubject = new Subject();
    configLoader = inject(RouterConfigLoader);
    environmentInjector = inject(EnvironmentInjector);
    destroyRef = inject(DestroyRef);
    urlSerializer = inject(UrlSerializer);
    rootContexts = inject(ChildrenOutletContexts);
    location = inject(Location);
    inputBindingEnabled = inject(INPUT_BINDER, { optional: true }) !== null;
    titleStrategy = inject(TitleStrategy);
    options = inject(ROUTER_CONFIGURATION, { optional: true }) || {};
    paramsInheritanceStrategy = this.options.paramsInheritanceStrategy || 'emptyOnly';
    urlHandlingStrategy = inject(UrlHandlingStrategy);
    createViewTransition = inject(CREATE_VIEW_TRANSITION, { optional: true });
    navigationErrorHandler = inject(NAVIGATION_ERROR_HANDLER, { optional: true });
    navigationId = 0;
    get hasRequestedNavigation() {
        return this.navigationId !== 0;
    }
    transitions;
    /**
     * Hook that enables you to pause navigation after the preactivation phase.
     * Used by `RouterModule`.
     *
     * @internal
     */
    afterPreactivation = () => of(void 0);
    /** @internal */
    rootComponentType = null;
    destroyed = false;
    constructor() {
        const onLoadStart = (r) => this.events.next(new RouteConfigLoadStart(r));
        const onLoadEnd = (r) => this.events.next(new RouteConfigLoadEnd(r));
        this.configLoader.onLoadEndListener = onLoadEnd;
        this.configLoader.onLoadStartListener = onLoadStart;
        this.destroyRef.onDestroy(() => {
            this.destroyed = true;
        });
    }
    complete() {
        this.transitions?.complete();
    }
    handleNavigationRequest(request) {
        const id = ++this.navigationId;
        this.transitions?.next({
            ...request,
            extractedUrl: this.urlHandlingStrategy.extract(request.rawUrl),
            targetSnapshot: null,
            targetRouterState: null,
            guards: { canActivateChecks: [], canDeactivateChecks: [] },
            guardsResult: null,
            abortController: new AbortController(),
            id,
        });
    }
    setupNavigations(router) {
        this.transitions = new BehaviorSubject(null);
        return this.transitions.pipe(filter((t) => t !== null), 
        // Using switchMap so we cancel executing navigations when a new one comes in
        switchMap((overallTransitionState) => {
            let completedOrAborted = false;
            return of(overallTransitionState).pipe(switchMap((t) => {
                // It is possible that `switchMap` fails to cancel previous navigations if a new one happens synchronously while the operator
                // is processing the `next` notification of that previous navigation. This can happen when a new navigation (say 2) cancels a
                // previous one (1) and yet another navigation (3) happens synchronously in response to the `NavigationCancel` event for (1).
                // https://github.com/ReactiveX/rxjs/issues/7455
                if (this.navigationId > overallTransitionState.id) {
                    const cancellationReason = typeof ngDevMode === 'undefined' || ngDevMode
                        ? `Navigation ID ${overallTransitionState.id} is not equal to the current navigation id ${this.navigationId}`
                        : '';
                    this.cancelNavigationTransition(overallTransitionState, cancellationReason, NavigationCancellationCode.SupersededByNewNavigation);
                    return EMPTY;
                }
                this.currentTransition = overallTransitionState;
                // Store the Navigation object
                this.currentNavigation = {
                    id: t.id,
                    initialUrl: t.rawUrl,
                    extractedUrl: t.extractedUrl,
                    targetBrowserUrl: typeof t.extras.browserUrl === 'string'
                        ? this.urlSerializer.parse(t.extras.browserUrl)
                        : t.extras.browserUrl,
                    trigger: t.source,
                    extras: t.extras,
                    previousNavigation: !this.lastSuccessfulNavigation
                        ? null
                        : {
                            ...this.lastSuccessfulNavigation,
                            previousNavigation: null,
                        },
                    abort: () => t.abortController.abort(),
                };
                const urlTransition = !router.navigated || this.isUpdatingInternalState() || this.isUpdatedBrowserUrl();
                const onSameUrlNavigation = t.extras.onSameUrlNavigation ?? router.onSameUrlNavigation;
                if (!urlTransition && onSameUrlNavigation !== 'reload') {
                    const reason = typeof ngDevMode === 'undefined' || ngDevMode
                        ? `Navigation to ${t.rawUrl} was ignored because it is the same as the current Router URL.`
                        : '';
                    this.events.next(new NavigationSkipped(t.id, this.urlSerializer.serialize(t.rawUrl), reason, NavigationSkippedCode.IgnoredSameUrlNavigation));
                    t.resolve(false);
                    return EMPTY;
                }
                if (this.urlHandlingStrategy.shouldProcessUrl(t.rawUrl)) {
                    return of(t).pipe(
                    // Fire NavigationStart event
                    switchMap((t) => {
                        this.events.next(new NavigationStart(t.id, this.urlSerializer.serialize(t.extractedUrl), t.source, t.restoredState));
                        if (t.id !== this.navigationId) {
                            return EMPTY;
                        }
                        // This delay is required to match old behavior that forced
                        // navigation to always be async
                        return Promise.resolve(t);
                    }), 
                    // Recognize
                    recognize(this.environmentInjector, this.configLoader, this.rootComponentType, router.config, this.urlSerializer, this.paramsInheritanceStrategy), 
                    // Update URL if in `eager` update mode
                    tap((t) => {
                        overallTransitionState.targetSnapshot = t.targetSnapshot;
                        overallTransitionState.urlAfterRedirects = t.urlAfterRedirects;
                        this.currentNavigation = {
                            ...this.currentNavigation,
                            finalUrl: t.urlAfterRedirects,
                        };
                        // Fire RoutesRecognized
                        const routesRecognized = new RoutesRecognized(t.id, this.urlSerializer.serialize(t.extractedUrl), this.urlSerializer.serialize(t.urlAfterRedirects), t.targetSnapshot);
                        this.events.next(routesRecognized);
                    }));
                }
                else if (urlTransition &&
                    this.urlHandlingStrategy.shouldProcessUrl(t.currentRawUrl)) {
                    /* When the current URL shouldn't be processed, but the previous one
                     * was, we handle this "error condition" by navigating to the
                     * previously successful URL, but leaving the URL intact.*/
                    const { id, extractedUrl, source, restoredState, extras } = t;
                    const navStart = new NavigationStart(id, this.urlSerializer.serialize(extractedUrl), source, restoredState);
                    this.events.next(navStart);
                    const targetSnapshot = createEmptyState(this.rootComponentType).snapshot;
                    this.currentTransition = overallTransitionState = {
                        ...t,
                        targetSnapshot,
                        urlAfterRedirects: extractedUrl,
                        extras: { ...extras, skipLocationChange: false, replaceUrl: false },
                    };
                    this.currentNavigation.finalUrl = extractedUrl;
                    return of(overallTransitionState);
                }
                else {
                    /* When neither the current or previous URL can be processed, do
                     * nothing other than update router's internal reference to the
                     * current "settled" URL. This way the next navigation will be coming
                     * from the current URL in the browser.
                     */
                    const reason = typeof ngDevMode === 'undefined' || ngDevMode
                        ? `Navigation was ignored because the UrlHandlingStrategy` +
                            ` indicated neither the current URL ${t.currentRawUrl} nor target URL ${t.rawUrl} should be processed.`
                        : '';
                    this.events.next(new NavigationSkipped(t.id, this.urlSerializer.serialize(t.extractedUrl), reason, NavigationSkippedCode.IgnoredByUrlHandlingStrategy));
                    t.resolve(false);
                    return EMPTY;
                }
            }), 
            // --- GUARDS ---
            tap((t) => {
                const guardsStart = new GuardsCheckStart(t.id, this.urlSerializer.serialize(t.extractedUrl), this.urlSerializer.serialize(t.urlAfterRedirects), t.targetSnapshot);
                this.events.next(guardsStart);
            }), map((t) => {
                this.currentTransition = overallTransitionState = {
                    ...t,
                    guards: getAllRouteGuards(t.targetSnapshot, t.currentSnapshot, this.rootContexts),
                };
                return overallTransitionState;
            }), checkGuards(this.environmentInjector, (evt) => this.events.next(evt)), tap((t) => {
                overallTransitionState.guardsResult = t.guardsResult;
                if (t.guardsResult && typeof t.guardsResult !== 'boolean') {
                    throw redirectingNavigationError(this.urlSerializer, t.guardsResult);
                }
                const guardsEnd = new GuardsCheckEnd(t.id, this.urlSerializer.serialize(t.extractedUrl), this.urlSerializer.serialize(t.urlAfterRedirects), t.targetSnapshot, !!t.guardsResult);
                this.events.next(guardsEnd);
            }), filter((t) => {
                if (!t.guardsResult) {
                    this.cancelNavigationTransition(t, '', NavigationCancellationCode.GuardRejected);
                    return false;
                }
                return true;
            }), 
            // --- RESOLVE ---
            switchTap((t) => {
                if (t.guards.canActivateChecks.length === 0) {
                    return undefined;
                }
                return of(t).pipe(tap((t) => {
                    const resolveStart = new ResolveStart(t.id, this.urlSerializer.serialize(t.extractedUrl), this.urlSerializer.serialize(t.urlAfterRedirects), t.targetSnapshot);
                    this.events.next(resolveStart);
                }), switchMap((t) => {
                    let dataResolved = false;
                    return of(t).pipe(resolveData(this.paramsInheritanceStrategy, this.environmentInjector), tap({
                        next: () => (dataResolved = true),
                        complete: () => {
                            if (!dataResolved) {
                                this.cancelNavigationTransition(t, typeof ngDevMode === 'undefined' || ngDevMode
                                    ? `At least one route resolver didn't emit any value.`
                                    : '', NavigationCancellationCode.NoDataFromResolver);
                            }
                        },
                    }));
                }), tap((t) => {
                    const resolveEnd = new ResolveEnd(t.id, this.urlSerializer.serialize(t.extractedUrl), this.urlSerializer.serialize(t.urlAfterRedirects), t.targetSnapshot);
                    this.events.next(resolveEnd);
                }));
            }), 
            // --- LOAD COMPONENTS ---
            switchTap((t) => {
                const loadComponents = (route) => {
                    const loaders = [];
                    if (route.routeConfig?.loadComponent) {
                        const injector = getClosestRouteInjector(route) ?? this.environmentInjector;
                        loaders.push(this.configLoader.loadComponent(injector, route.routeConfig).pipe(tap((loadedComponent) => {
                            route.component = loadedComponent;
                        }), map(() => void 0)));
                    }
                    for (const child of route.children) {
                        loaders.push(...loadComponents(child));
                    }
                    return loaders;
                };
                return combineLatest(loadComponents(t.targetSnapshot.root)).pipe(defaultIfEmpty(null), take(1));
            }), switchTap(() => this.afterPreactivation()), switchMap(() => {
                const { currentSnapshot, targetSnapshot } = overallTransitionState;
                const viewTransitionStarted = this.createViewTransition?.(this.environmentInjector, currentSnapshot.root, targetSnapshot.root);
                // If view transitions are enabled, block the navigation until the view
                // transition callback starts. Otherwise, continue immediately.
                return viewTransitionStarted
                    ? from(viewTransitionStarted).pipe(map(() => overallTransitionState))
                    : of(overallTransitionState);
            }), map((t) => {
                const targetRouterState = createRouterState(router.routeReuseStrategy, t.targetSnapshot, t.currentRouterState);
                this.currentTransition = overallTransitionState = { ...t, targetRouterState };
                this.currentNavigation.targetRouterState = targetRouterState;
                return overallTransitionState;
            }), tap(() => {
                this.events.next(new BeforeActivateRoutes());
            }), activateRoutes(this.rootContexts, router.routeReuseStrategy, (evt) => this.events.next(evt), this.inputBindingEnabled), 
            // Ensure that if some observable used to drive the transition doesn't
            // complete, the navigation still finalizes This should never happen, but
            // this is done as a safety measure to avoid surfacing this error (#49567).
            take(1), takeUntil(new Observable((subscriber) => {
                const abortSignal = overallTransitionState.abortController.signal;
                const handler = () => subscriber.next();
                abortSignal.addEventListener('abort', handler);
                return () => abortSignal.removeEventListener('abort', handler);
            }).pipe(
            // Ignore aborts if we are already completed, canceled, or are in the activation stage (we have targetRouterState)
            filter(() => !completedOrAborted && !overallTransitionState.targetRouterState), tap(() => {
                this.cancelNavigationTransition(overallTransitionState, overallTransitionState.abortController.signal.reason + '', NavigationCancellationCode.Aborted);
            }))), tap({
                next: (t) => {
                    completedOrAborted = true;
                    this.lastSuccessfulNavigation = this.currentNavigation;
                    this.events.next(new NavigationEnd(t.id, this.urlSerializer.serialize(t.extractedUrl), this.urlSerializer.serialize(t.urlAfterRedirects)));
                    this.titleStrategy?.updateTitle(t.targetRouterState.snapshot);
                    t.resolve(true);
                },
                complete: () => {
                    completedOrAborted = true;
                },
            }), 
            // There used to be a lot more logic happening directly within the
            // transition Observable. Some of this logic has been refactored out to
            // other places but there may still be errors that happen there. This gives
            // us a way to cancel the transition from the outside. This may also be
            // required in the future to support something like the abort signal of the
            // Navigation API where the navigation gets aborted from outside the
            // transition.
            takeUntil(this.transitionAbortWithErrorSubject.pipe(tap((err) => {
                throw err;
            }))), finalize(() => {
                /* When the navigation stream finishes either through error or success,
                 * we set the `completed` or `errored` flag. However, there are some
                 * situations where we could get here without either of those being set.
                 * For instance, a redirect during NavigationStart. Therefore, this is a
                 * catch-all to make sure the NavigationCancel event is fired when a
                 * navigation gets cancelled but not caught by other means. */
                if (!completedOrAborted) {
                    const cancelationReason = typeof ngDevMode === 'undefined' || ngDevMode
                        ? `Navigation ID ${overallTransitionState.id} is not equal to the current navigation id ${this.navigationId}`
                        : '';
                    this.cancelNavigationTransition(overallTransitionState, cancelationReason, NavigationCancellationCode.SupersededByNewNavigation);
                }
                // Only clear current navigation if it is still set to the one that
                // finalized.
                if (this.currentTransition?.id === overallTransitionState.id) {
                    this.currentNavigation = null;
                    this.currentTransition = null;
                }
            }), catchError((e) => {
                // If the application is already destroyed, the catch block should not
                // execute anything in practice because other resources have already
                // been released and destroyed.
                if (this.destroyed) {
                    overallTransitionState.resolve(false);
                    return EMPTY;
                }
                completedOrAborted = true;
                /* This error type is issued during Redirect, and is handled as a
                 * cancellation rather than an error. */
                if (isNavigationCancelingError(e)) {
                    this.events.next(new NavigationCancel(overallTransitionState.id, this.urlSerializer.serialize(overallTransitionState.extractedUrl), e.message, e.cancellationCode));
                    // When redirecting, we need to delay resolving the navigation
                    // promise and push it to the redirect navigation
                    if (!isRedirectingNavigationCancelingError(e)) {
                        overallTransitionState.resolve(false);
                    }
                    else {
                        this.events.next(new RedirectRequest(e.url, e.navigationBehaviorOptions));
                    }
                    /* All other errors should reset to the router's internal URL reference
                     * to the pre-error state. */
                }
                else {
                    const navigationError = new NavigationError(overallTransitionState.id, this.urlSerializer.serialize(overallTransitionState.extractedUrl), e, overallTransitionState.targetSnapshot ?? undefined);
                    try {
                        const navigationErrorHandlerResult = runInInjectionContext(this.environmentInjector, () => this.navigationErrorHandler?.(navigationError));
                        if (navigationErrorHandlerResult instanceof RedirectCommand) {
                            const { message, cancellationCode } = redirectingNavigationError(this.urlSerializer, navigationErrorHandlerResult);
                            this.events.next(new NavigationCancel(overallTransitionState.id, this.urlSerializer.serialize(overallTransitionState.extractedUrl), message, cancellationCode));
                            this.events.next(new RedirectRequest(navigationErrorHandlerResult.redirectTo, navigationErrorHandlerResult.navigationBehaviorOptions));
                        }
                        else {
                            this.events.next(navigationError);
                            throw e;
                        }
                    }
                    catch (ee) {
                        // TODO(atscott): consider flipping the default behavior of
                        // resolveNavigationPromiseOnError to be `resolve(false)` when
                        // undefined. This is the most sane thing to do given that
                        // applications very rarely handle the promise rejection and, as a
                        // result, would get "unhandled promise rejection" console logs.
                        // The vast majority of applications would not be affected by this
                        // change so omitting a migration seems reasonable. Instead,
                        // applications that rely on rejection can specifically opt-in to the
                        // old behavior.
                        if (this.options.resolveNavigationPromiseOnError) {
                            overallTransitionState.resolve(false);
                        }
                        else {
                            overallTransitionState.reject(ee);
                        }
                    }
                }
                return EMPTY;
            }));
            // casting because `pipe` returns observable({}) when called with 8+ arguments
        }));
    }
    cancelNavigationTransition(t, reason, code) {
        const navCancel = new NavigationCancel(t.id, this.urlSerializer.serialize(t.extractedUrl), reason, code);
        this.events.next(navCancel);
        t.resolve(false);
    }
    /**
     * @returns Whether we're navigating to somewhere that is not what the Router is
     * currently set to.
     */
    isUpdatingInternalState() {
        // TODO(atscott): The serializer should likely be used instead of
        // `UrlTree.toString()`. Custom serializers are often written to handle
        // things better than the default one (objects, for example will be
        // [Object object] with the custom serializer and be "the same" when they
        // aren't).
        // (Same for isUpdatedBrowserUrl)
        return (this.currentTransition?.extractedUrl.toString() !==
            this.currentTransition?.currentUrlTree.toString());
    }
    /**
     * @returns Whether we're updating the browser URL to something new (navigation is going
     * to somewhere not displayed in the URL bar and we will update the URL
     * bar if navigation succeeds).
     */
    isUpdatedBrowserUrl() {
        // The extracted URL is the part of the URL that this application cares about. `extract` may
        // return only part of the browser URL and that part may have not changed even if some other
        // portion of the URL did.
        const currentBrowserUrl = this.urlHandlingStrategy.extract(this.urlSerializer.parse(this.location.path(true)));
        const targetBrowserUrl = this.currentNavigation?.targetBrowserUrl ?? this.currentNavigation?.extractedUrl;
        return (currentBrowserUrl.toString() !== targetBrowserUrl?.toString() &&
            !this.currentNavigation?.extras.skipLocationChange);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: NavigationTransitions, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: NavigationTransitions, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: NavigationTransitions, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: () => [] });
function isBrowserTriggeredNavigation(source) {
    return source !== IMPERATIVE_NAVIGATION;
}

/**
 * @description
 *
 * Provides a way to customize when activated routes get reused.
 *
 * @publicApi
 */
class RouteReuseStrategy {
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: RouteReuseStrategy, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: RouteReuseStrategy, providedIn: 'root', useFactory: () => inject(DefaultRouteReuseStrategy) });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: RouteReuseStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root', useFactory: () => inject(DefaultRouteReuseStrategy) }]
        }] });
/**
 * @description
 *
 * This base route reuse strategy only reuses routes when the matched router configs are
 * identical. This prevents components from being destroyed and recreated
 * when just the route parameters, query parameters or fragment change
 * (that is, the existing component is _reused_).
 *
 * This strategy does not store any routes for later reuse.
 *
 * Angular uses this strategy by default.
 *
 *
 * It can be used as a base class for custom route reuse strategies, i.e. you can create your own
 * class that extends the `BaseRouteReuseStrategy` one.
 * @publicApi
 */
class BaseRouteReuseStrategy {
    /**
     * Whether the given route should detach for later reuse.
     * Always returns false for `BaseRouteReuseStrategy`.
     * */
    shouldDetach(route) {
        return false;
    }
    /**
     * A no-op; the route is never stored since this strategy never detaches routes for later re-use.
     */
    store(route, detachedTree) { }
    /** Returns `false`, meaning the route (and its subtree) is never reattached */
    shouldAttach(route) {
        return false;
    }
    /** Returns `null` because this strategy does not store routes for later re-use. */
    retrieve(route) {
        return null;
    }
    /**
     * Determines if a route should be reused.
     * This strategy returns `true` when the future route config and current route config are
     * identical.
     */
    shouldReuseRoute(future, curr) {
        return future.routeConfig === curr.routeConfig;
    }
}
class DefaultRouteReuseStrategy extends BaseRouteReuseStrategy {
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: DefaultRouteReuseStrategy, deps: null, target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: DefaultRouteReuseStrategy, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: DefaultRouteReuseStrategy, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

class StateManager {
    urlSerializer = inject(UrlSerializer);
    options = inject(ROUTER_CONFIGURATION, { optional: true }) || {};
    canceledNavigationResolution = this.options.canceledNavigationResolution || 'replace';
    location = inject(Location);
    urlHandlingStrategy = inject(UrlHandlingStrategy);
    urlUpdateStrategy = this.options.urlUpdateStrategy || 'deferred';
    currentUrlTree = new UrlTree();
    /**
     * Returns the currently activated `UrlTree`.
     *
     * This `UrlTree` shows only URLs that the `Router` is configured to handle (through
     * `UrlHandlingStrategy`).
     *
     * The value is set after finding the route config tree to activate but before activating the
     * route.
     */
    getCurrentUrlTree() {
        return this.currentUrlTree;
    }
    rawUrlTree = this.currentUrlTree;
    /**
     * Returns a `UrlTree` that is represents what the browser is actually showing.
     *
     * In the life of a navigation transition:
     * 1. When a navigation begins, the raw `UrlTree` is updated to the full URL that's being
     * navigated to.
     * 2. During a navigation, redirects are applied, which might only apply to _part_ of the URL (due
     * to `UrlHandlingStrategy`).
     * 3. Just before activation, the raw `UrlTree` is updated to include the redirects on top of the
     * original raw URL.
     *
     * Note that this is _only_ here to support `UrlHandlingStrategy.extract` and
     * `UrlHandlingStrategy.shouldProcessUrl`. Without those APIs, the current `UrlTree` would not
     * deviated from the raw `UrlTree`.
     *
     * For `extract`, a raw `UrlTree` is needed because `extract` may only return part
     * of the navigation URL. Thus, the current `UrlTree` may only represent _part_ of the browser
     * URL. When a navigation gets cancelled and the router needs to reset the URL or a new navigation
     * occurs, it needs to know the _whole_ browser URL, not just the part handled by
     * `UrlHandlingStrategy`.
     * For `shouldProcessUrl`, when the return is `false`, the router ignores the navigation but
     * still updates the raw `UrlTree` with the assumption that the navigation was caused by the
     * location change listener due to a URL update by the AngularJS router. In this case, the router
     * still need to know what the browser's URL is for future navigations.
     */
    getRawUrlTree() {
        return this.rawUrlTree;
    }
    createBrowserPath({ finalUrl, initialUrl, targetBrowserUrl }) {
        const rawUrl = finalUrl !== undefined ? this.urlHandlingStrategy.merge(finalUrl, initialUrl) : initialUrl;
        const url = targetBrowserUrl ?? rawUrl;
        const path = url instanceof UrlTree ? this.urlSerializer.serialize(url) : url;
        return path;
    }
    commitTransition({ targetRouterState, finalUrl, initialUrl }) {
        // If we are committing the transition after having a final URL and target state, we're updating
        // all pieces of the state. Otherwise, we likely skipped the transition (due to URL handling strategy)
        // and only want to update the rawUrlTree, which represents the browser URL (and doesn't necessarily match router state).
        if (finalUrl && targetRouterState) {
            this.currentUrlTree = finalUrl;
            this.rawUrlTree = this.urlHandlingStrategy.merge(finalUrl, initialUrl);
            this.routerState = targetRouterState;
        }
        else {
            this.rawUrlTree = initialUrl;
        }
    }
    routerState = createEmptyState(null);
    /** Returns the current RouterState. */
    getRouterState() {
        return this.routerState;
    }
    stateMemento = this.createStateMemento();
    updateStateMemento() {
        this.stateMemento = this.createStateMemento();
    }
    createStateMemento() {
        return {
            rawUrlTree: this.rawUrlTree,
            currentUrlTree: this.currentUrlTree,
            routerState: this.routerState,
        };
    }
    resetInternalState({ finalUrl }) {
        this.routerState = this.stateMemento.routerState;
        this.currentUrlTree = this.stateMemento.currentUrlTree;
        // Note here that we use the urlHandlingStrategy to get the reset `rawUrlTree` because it may be
        // configured to handle only part of the navigation URL. This means we would only want to reset
        // the part of the navigation handled by the Angular router rather than the whole URL. In
        // addition, the URLHandlingStrategy may be configured to specifically preserve parts of the URL
        // when merging, such as the query params so they are not lost on a refresh.
        this.rawUrlTree = this.urlHandlingStrategy.merge(this.currentUrlTree, finalUrl ?? this.rawUrlTree);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: StateManager, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: StateManager, providedIn: 'root', useFactory: () => inject(HistoryStateManager) });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: StateManager, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root', useFactory: () => inject(HistoryStateManager) }]
        }] });
class HistoryStateManager extends StateManager {
    /**
     * The id of the currently active page in the router.
     * Updated to the transition's target id on a successful navigation.
     *
     * This is used to track what page the router last activated. When an attempted navigation fails,
     * the router can then use this to compute how to restore the state back to the previously active
     * page.
     */
    currentPageId = 0;
    lastSuccessfulId = -1;
    restoredState() {
        return this.location.getState();
    }
    /**
     * The ɵrouterPageId of whatever page is currently active in the browser history. This is
     * important for computing the target page id for new navigations because we need to ensure each
     * page id in the browser history is 1 more than the previous entry.
     */
    get browserPageId() {
        if (this.canceledNavigationResolution !== 'computed') {
            return this.currentPageId;
        }
        return this.restoredState()?.ɵrouterPageId ?? this.currentPageId;
    }
    registerNonRouterCurrentEntryChangeListener(listener) {
        return this.location.subscribe((event) => {
            if (event['type'] === 'popstate') {
                // The `setTimeout` was added in #12160 and is likely to support Angular/AngularJS
                // hybrid apps.
                setTimeout(() => {
                    listener(event['url'], event.state, 'popstate');
                });
            }
        });
    }
    handleRouterEvent(e, currentTransition) {
        if (e instanceof NavigationStart) {
            this.updateStateMemento();
        }
        else if (e instanceof NavigationSkipped) {
            this.commitTransition(currentTransition);
        }
        else if (e instanceof RoutesRecognized) {
            if (this.urlUpdateStrategy === 'eager') {
                if (!currentTransition.extras.skipLocationChange) {
                    this.setBrowserUrl(this.createBrowserPath(currentTransition), currentTransition);
                }
            }
        }
        else if (e instanceof BeforeActivateRoutes) {
            this.commitTransition(currentTransition);
            if (this.urlUpdateStrategy === 'deferred' && !currentTransition.extras.skipLocationChange) {
                this.setBrowserUrl(this.createBrowserPath(currentTransition), currentTransition);
            }
        }
        else if (e instanceof NavigationCancel &&
            e.code !== NavigationCancellationCode.SupersededByNewNavigation &&
            e.code !== NavigationCancellationCode.Redirect) {
            this.restoreHistory(currentTransition);
        }
        else if (e instanceof NavigationError) {
            this.restoreHistory(currentTransition, true);
        }
        else if (e instanceof NavigationEnd) {
            this.lastSuccessfulId = e.id;
            this.currentPageId = this.browserPageId;
        }
    }
    setBrowserUrl(path, { extras, id }) {
        const { replaceUrl, state } = extras;
        if (this.location.isCurrentPathEqualTo(path) || !!replaceUrl) {
            // replacements do not update the target page
            const currentBrowserPageId = this.browserPageId;
            const newState = {
                ...state,
                ...this.generateNgRouterState(id, currentBrowserPageId),
            };
            this.location.replaceState(path, '', newState);
        }
        else {
            const newState = {
                ...state,
                ...this.generateNgRouterState(id, this.browserPageId + 1),
            };
            this.location.go(path, '', newState);
        }
    }
    /**
     * Performs the necessary rollback action to restore the browser URL to the
     * state before the transition.
     */
    restoreHistory(navigation, restoringFromCaughtError = false) {
        if (this.canceledNavigationResolution === 'computed') {
            const currentBrowserPageId = this.browserPageId;
            const targetPagePosition = this.currentPageId - currentBrowserPageId;
            if (targetPagePosition !== 0) {
                this.location.historyGo(targetPagePosition);
            }
            else if (this.getCurrentUrlTree() === navigation.finalUrl && targetPagePosition === 0) {
                // We got to the activation stage (where currentUrlTree is set to the navigation's
                // finalUrl), but we weren't moving anywhere in history (skipLocationChange or replaceUrl).
                // We still need to reset the router state back to what it was when the navigation started.
                this.resetInternalState(navigation);
                this.resetUrlToCurrentUrlTree();
            }
            else ;
        }
        else if (this.canceledNavigationResolution === 'replace') {
            // TODO(atscott): It seems like we should _always_ reset the state here. It would be a no-op
            // for `deferred` navigations that haven't change the internal state yet because guards
            // reject. For 'eager' navigations, it seems like we also really should reset the state
            // because the navigation was cancelled. Investigate if this can be done by running TGP.
            if (restoringFromCaughtError) {
                this.resetInternalState(navigation);
            }
            this.resetUrlToCurrentUrlTree();
        }
    }
    resetUrlToCurrentUrlTree() {
        this.location.replaceState(this.urlSerializer.serialize(this.getRawUrlTree()), '', this.generateNgRouterState(this.lastSuccessfulId, this.currentPageId));
    }
    generateNgRouterState(navigationId, routerPageId) {
        if (this.canceledNavigationResolution === 'computed') {
            return { navigationId, ɵrouterPageId: routerPageId };
        }
        return { navigationId };
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: HistoryStateManager, deps: null, target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: HistoryStateManager, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: HistoryStateManager, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

/**
 * Performs the given action once the router finishes its next/current navigation.
 *
 * The navigation is considered complete under the following conditions:
 * - `NavigationCancel` event emits and the code is not `NavigationCancellationCode.Redirect` or
 * `NavigationCancellationCode.SupersededByNewNavigation`. In these cases, the
 * redirecting/superseding navigation must finish.
 * - `NavigationError`, `NavigationEnd`, or `NavigationSkipped` event emits
 */
function afterNextNavigation(router, action) {
    router.events
        .pipe(filter((e) => e instanceof NavigationEnd ||
        e instanceof NavigationCancel ||
        e instanceof NavigationError ||
        e instanceof NavigationSkipped), map((e) => {
        if (e instanceof NavigationEnd || e instanceof NavigationSkipped) {
            return 0 /* NavigationResult.COMPLETE */;
        }
        const redirecting = e instanceof NavigationCancel
            ? e.code === NavigationCancellationCode.Redirect ||
                e.code === NavigationCancellationCode.SupersededByNewNavigation
            : false;
        return redirecting ? 2 /* NavigationResult.REDIRECTING */ : 1 /* NavigationResult.FAILED */;
    }), filter((result) => result !== 2 /* NavigationResult.REDIRECTING */), take(1))
        .subscribe(() => {
        action();
    });
}

/**
 * The equivalent `IsActiveMatchOptions` options for `Router.isActive` is called with `true`
 * (exact = true).
 */
const exactMatchOptions = {
    paths: 'exact',
    fragment: 'ignored',
    matrixParams: 'ignored',
    queryParams: 'exact',
};
/**
 * The equivalent `IsActiveMatchOptions` options for `Router.isActive` is called with `false`
 * (exact = false).
 */
const subsetMatchOptions = {
    paths: 'subset',
    fragment: 'ignored',
    matrixParams: 'ignored',
    queryParams: 'subset',
};
/**
 * @description
 *
 * A service that facilitates navigation among views and URL manipulation capabilities.
 * This service is provided in the root scope and configured with [provideRouter](api/router/provideRouter).
 *
 * @see {@link Route}
 * @see {@link provideRouter}
 * @see [Routing and Navigation Guide](guide/routing/common-router-tasks).
 *
 * @ngModule RouterModule
 *
 * @publicApi
 */
class Router {
    get currentUrlTree() {
        return this.stateManager.getCurrentUrlTree();
    }
    get rawUrlTree() {
        return this.stateManager.getRawUrlTree();
    }
    disposed = false;
    nonRouterCurrentEntryChangeSubscription;
    console = inject(_Console);
    stateManager = inject(StateManager);
    options = inject(ROUTER_CONFIGURATION, { optional: true }) || {};
    pendingTasks = inject(_PendingTasksInternal);
    urlUpdateStrategy = this.options.urlUpdateStrategy || 'deferred';
    navigationTransitions = inject(NavigationTransitions);
    urlSerializer = inject(UrlSerializer);
    location = inject(Location);
    urlHandlingStrategy = inject(UrlHandlingStrategy);
    injector = inject(EnvironmentInjector);
    /**
     * The private `Subject` type for the public events exposed in the getter. This is used internally
     * to push events to. The separate field allows us to expose separate types in the public API
     * (i.e., an Observable rather than the Subject).
     */
    _events = new Subject();
    /**
     * An event stream for routing events.
     */
    get events() {
        // TODO(atscott): This _should_ be events.asObservable(). However, this change requires internal
        // cleanup: tests are doing `(route.events as Subject<Event>).next(...)`. This isn't
        // allowed/supported but we still have to fix these or file bugs against the teams before making
        // the change.
        return this._events;
    }
    /**
     * The current state of routing in this NgModule.
     */
    get routerState() {
        return this.stateManager.getRouterState();
    }
    /**
     * True if at least one navigation event has occurred,
     * false otherwise.
     */
    navigated = false;
    /**
     * A strategy for re-using routes.
     *
     * @deprecated Configure using `providers` instead:
     *   `{provide: RouteReuseStrategy, useClass: MyStrategy}`.
     */
    routeReuseStrategy = inject(RouteReuseStrategy);
    /**
     * How to handle a navigation request to the current URL.
     *
     *
     * @deprecated Configure this through `provideRouter` or `RouterModule.forRoot` instead.
     * @see {@link withRouterConfig}
     * @see {@link provideRouter}
     * @see {@link RouterModule}
     */
    onSameUrlNavigation = this.options.onSameUrlNavigation || 'ignore';
    config = inject(ROUTES, { optional: true })?.flat() ?? [];
    /**
     * Indicates whether the application has opted in to binding Router data to component inputs.
     *
     * This option is enabled by the `withComponentInputBinding` feature of `provideRouter` or
     * `bindToComponentInputs` in the `ExtraOptions` of `RouterModule.forRoot`.
     */
    componentInputBindingEnabled = !!inject(INPUT_BINDER, { optional: true });
    constructor() {
        this.resetConfig(this.config);
        this.navigationTransitions.setupNavigations(this).subscribe({
            error: (e) => {
                this.console.warn(ngDevMode ? `Unhandled Navigation Error: ${e}` : e);
            },
        });
        this.subscribeToNavigationEvents();
    }
    eventsSubscription = new Subscription();
    subscribeToNavigationEvents() {
        const subscription = this.navigationTransitions.events.subscribe((e) => {
            try {
                const currentTransition = this.navigationTransitions.currentTransition;
                const currentNavigation = this.navigationTransitions.currentNavigation;
                if (currentTransition !== null && currentNavigation !== null) {
                    this.stateManager.handleRouterEvent(e, currentNavigation);
                    if (e instanceof NavigationCancel &&
                        e.code !== NavigationCancellationCode.Redirect &&
                        e.code !== NavigationCancellationCode.SupersededByNewNavigation) {
                        // It seems weird that `navigated` is set to `true` when the navigation is rejected,
                        // however it's how things were written initially. Investigation would need to be done
                        // to determine if this can be removed.
                        this.navigated = true;
                    }
                    else if (e instanceof NavigationEnd) {
                        this.navigated = true;
                    }
                    else if (e instanceof RedirectRequest) {
                        const opts = e.navigationBehaviorOptions;
                        const mergedTree = this.urlHandlingStrategy.merge(e.url, currentTransition.currentRawUrl);
                        const extras = {
                            browserUrl: currentTransition.extras.browserUrl,
                            info: currentTransition.extras.info,
                            skipLocationChange: currentTransition.extras.skipLocationChange,
                            // The URL is already updated at this point if we have 'eager' URL
                            // updates or if the navigation was triggered by the browser (back
                            // button, URL bar, etc). We want to replace that item in history
                            // if the navigation is rejected.
                            replaceUrl: currentTransition.extras.replaceUrl ||
                                this.urlUpdateStrategy === 'eager' ||
                                isBrowserTriggeredNavigation(currentTransition.source),
                            // allow developer to override default options with RedirectCommand
                            ...opts,
                        };
                        this.scheduleNavigation(mergedTree, IMPERATIVE_NAVIGATION, null, extras, {
                            resolve: currentTransition.resolve,
                            reject: currentTransition.reject,
                            promise: currentTransition.promise,
                        });
                    }
                }
                // Note that it's important to have the Router process the events _before_ the event is
                // pushed through the public observable. This ensures the correct router state is in place
                // before applications observe the events.
                if (isPublicRouterEvent(e)) {
                    this._events.next(e);
                }
            }
            catch (e) {
                this.navigationTransitions.transitionAbortWithErrorSubject.next(e);
            }
        });
        this.eventsSubscription.add(subscription);
    }
    /** @internal */
    resetRootComponentType(rootComponentType) {
        // TODO: vsavkin router 4.0 should make the root component set to null
        // this will simplify the lifecycle of the router.
        this.routerState.root.component = rootComponentType;
        this.navigationTransitions.rootComponentType = rootComponentType;
    }
    /**
     * Sets up the location change listener and performs the initial navigation.
     */
    initialNavigation() {
        this.setUpLocationChangeListener();
        if (!this.navigationTransitions.hasRequestedNavigation) {
            this.navigateToSyncWithBrowser(this.location.path(true), IMPERATIVE_NAVIGATION, this.stateManager.restoredState());
        }
    }
    /**
     * Sets up the location change listener. This listener detects navigations triggered from outside
     * the Router (the browser back/forward buttons, for example) and schedules a corresponding Router
     * navigation so that the correct events, guards, etc. are triggered.
     */
    setUpLocationChangeListener() {
        // Don't need to use Zone.wrap any more, because zone.js
        // already patch onPopState, so location change callback will
        // run into ngZone
        this.nonRouterCurrentEntryChangeSubscription ??=
            this.stateManager.registerNonRouterCurrentEntryChangeListener((url, state, source) => {
                this.navigateToSyncWithBrowser(url, source, state);
            });
    }
    /**
     * Schedules a router navigation to synchronize Router state with the browser state.
     *
     * This is done as a response to a popstate event and the initial navigation. These
     * two scenarios represent times when the browser URL/state has been updated and
     * the Router needs to respond to ensure its internal state matches.
     */
    navigateToSyncWithBrowser(url, source, state) {
        const extras = { replaceUrl: true };
        // TODO: restoredState should always include the entire state, regardless
        // of navigationId. This requires a breaking change to update the type on
        // NavigationStart’s restoredState, which currently requires navigationId
        // to always be present. The Router used to only restore history state if
        // a navigationId was present.
        // The stored navigationId is used by the RouterScroller to retrieve the scroll
        // position for the page.
        const restoredState = state?.navigationId ? state : null;
        // Separate to NavigationStart.restoredState, we must also restore the state to
        // history.state and generate a new navigationId, since it will be overwritten
        if (state) {
            const stateCopy = { ...state };
            delete stateCopy.navigationId;
            delete stateCopy.ɵrouterPageId;
            if (Object.keys(stateCopy).length !== 0) {
                extras.state = stateCopy;
            }
        }
        const urlTree = this.parseUrl(url);
        this.scheduleNavigation(urlTree, source, restoredState, extras).catch((e) => {
            if (this.disposed) {
                return;
            }
            this.injector.get(_INTERNAL_APPLICATION_ERROR_HANDLER)(e);
        });
    }
    /** The current URL. */
    get url() {
        return this.serializeUrl(this.currentUrlTree);
    }
    /**
     * Returns the current `Navigation` object when the router is navigating,
     * and `null` when idle.
     */
    getCurrentNavigation() {
        return this.navigationTransitions.currentNavigation;
    }
    /**
     * The `Navigation` object of the most recent navigation to succeed and `null` if there
     *     has not been a successful navigation yet.
     */
    get lastSuccessfulNavigation() {
        return this.navigationTransitions.lastSuccessfulNavigation;
    }
    /**
     * Resets the route configuration used for navigation and generating links.
     *
     * @param config The route array for the new configuration.
     *
     * @usageNotes
     *
     * ```ts
     * router.resetConfig([
     *  { path: 'team/:id', component: TeamCmp, children: [
     *    { path: 'simple', component: SimpleCmp },
     *    { path: 'user/:name', component: UserCmp }
     *  ]}
     * ]);
     * ```
     */
    resetConfig(config) {
        (typeof ngDevMode === 'undefined' || ngDevMode) && validateConfig(config);
        this.config = config.map(standardizeConfig);
        this.navigated = false;
    }
    /** @docs-private */
    ngOnDestroy() {
        this.dispose();
    }
    /** Disposes of the router. */
    dispose() {
        // We call `unsubscribe()` to release observers, as users may forget to
        // unsubscribe manually when subscribing to `router.events`. We do not call
        // `complete()` because it is unsafe; if someone subscribes using the `first`
        // operator and the observable completes before emitting a value,
        // RxJS will throw an error.
        this._events.unsubscribe();
        this.navigationTransitions.complete();
        if (this.nonRouterCurrentEntryChangeSubscription) {
            this.nonRouterCurrentEntryChangeSubscription.unsubscribe();
            this.nonRouterCurrentEntryChangeSubscription = undefined;
        }
        this.disposed = true;
        this.eventsSubscription.unsubscribe();
    }
    /**
     * Appends URL segments to the current URL tree to create a new URL tree.
     *
     * @param commands An array of URL fragments with which to construct the new URL tree.
     * If the path is static, can be the literal URL string. For a dynamic path, pass an array of path
     * segments, followed by the parameters for each segment.
     * The fragments are applied to the current URL tree or the one provided  in the `relativeTo`
     * property of the options object, if supplied.
     * @param navigationExtras Options that control the navigation strategy.
     * @returns The new URL tree.
     *
     * @usageNotes
     *
     * ```
     * // create /team/33/user/11
     * router.createUrlTree(['/team', 33, 'user', 11]);
     *
     * // create /team/33;expand=true/user/11
     * router.createUrlTree(['/team', 33, {expand: true}, 'user', 11]);
     *
     * // you can collapse static segments like this (this works only with the first passed-in value):
     * router.createUrlTree(['/team/33/user', userId]);
     *
     * // If the first segment can contain slashes, and you do not want the router to split it,
     * // you can do the following:
     * router.createUrlTree([{segmentPath: '/one/two'}]);
     *
     * // create /team/33/(user/11//right:chat)
     * router.createUrlTree(['/team', 33, {outlets: {primary: 'user/11', right: 'chat'}}]);
     *
     * // remove the right secondary node
     * router.createUrlTree(['/team', 33, {outlets: {primary: 'user/11', right: null}}]);
     *
     * // assuming the current url is `/team/33/user/11` and the route points to `user/11`
     *
     * // navigate to /team/33/user/11/details
     * router.createUrlTree(['details'], {relativeTo: route});
     *
     * // navigate to /team/33/user/22
     * router.createUrlTree(['../22'], {relativeTo: route});
     *
     * // navigate to /team/44/user/22
     * router.createUrlTree(['../../team/44/user/22'], {relativeTo: route});
     *
     * Note that a value of `null` or `undefined` for `relativeTo` indicates that the
     * tree should be created relative to the root.
     * ```
     */
    createUrlTree(commands, navigationExtras = {}) {
        const { relativeTo, queryParams, fragment, queryParamsHandling, preserveFragment } = navigationExtras;
        const f = preserveFragment ? this.currentUrlTree.fragment : fragment;
        let q = null;
        switch (queryParamsHandling ?? this.options.defaultQueryParamsHandling) {
            case 'merge':
                q = { ...this.currentUrlTree.queryParams, ...queryParams };
                break;
            case 'preserve':
                q = this.currentUrlTree.queryParams;
                break;
            default:
                q = queryParams || null;
        }
        if (q !== null) {
            q = this.removeEmptyProps(q);
        }
        let relativeToUrlSegmentGroup;
        try {
            const relativeToSnapshot = relativeTo ? relativeTo.snapshot : this.routerState.snapshot.root;
            relativeToUrlSegmentGroup = createSegmentGroupFromRoute(relativeToSnapshot);
        }
        catch (e) {
            // This is strictly for backwards compatibility with tests that create
            // invalid `ActivatedRoute` mocks.
            // Note: the difference between having this fallback for invalid `ActivatedRoute` setups and
            // just throwing is ~500 test failures. Fixing all of those tests by hand is not feasible at
            // the moment.
            if (typeof commands[0] !== 'string' || commands[0][0] !== '/') {
                // Navigations that were absolute in the old way of creating UrlTrees
                // would still work because they wouldn't attempt to match the
                // segments in the `ActivatedRoute` to the `currentUrlTree` but
                // instead just replace the root segment with the navigation result.
                // Non-absolute navigations would fail to apply the commands because
                // the logic could not find the segment to replace (so they'd act like there were no
                // commands).
                commands = [];
            }
            relativeToUrlSegmentGroup = this.currentUrlTree.root;
        }
        return createUrlTreeFromSegmentGroup(relativeToUrlSegmentGroup, commands, q, f ?? null);
    }
    /**
     * Navigates to a view using an absolute route path.
     *
     * @param url An absolute path for a defined route. The function does not apply any delta to the
     *     current URL.
     * @param extras An object containing properties that modify the navigation strategy.
     *
     * @returns A Promise that resolves to 'true' when navigation succeeds,
     * to 'false' when navigation fails, or is rejected on error.
     *
     * @usageNotes
     *
     * The following calls request navigation to an absolute path.
     *
     * ```ts
     * router.navigateByUrl("/team/33/user/11");
     *
     * // Navigate without updating the URL
     * router.navigateByUrl("/team/33/user/11", { skipLocationChange: true });
     * ```
     *
     * @see [Routing and Navigation guide](guide/routing/common-router-tasks)
     *
     */
    navigateByUrl(url, extras = {
        skipLocationChange: false,
    }) {
        const urlTree = isUrlTree(url) ? url : this.parseUrl(url);
        const mergedTree = this.urlHandlingStrategy.merge(urlTree, this.rawUrlTree);
        return this.scheduleNavigation(mergedTree, IMPERATIVE_NAVIGATION, null, extras);
    }
    /**
     * Navigate based on the provided array of commands and a starting point.
     * If no starting route is provided, the navigation is absolute.
     *
     * @param commands An array of URL fragments with which to construct the target URL.
     * If the path is static, can be the literal URL string. For a dynamic path, pass an array of path
     * segments, followed by the parameters for each segment.
     * The fragments are applied to the current URL or the one provided  in the `relativeTo` property
     * of the options object, if supplied.
     * @param extras An options object that determines how the URL should be constructed or
     *     interpreted.
     *
     * @returns A Promise that resolves to `true` when navigation succeeds, or `false` when navigation
     *     fails. The Promise is rejected when an error occurs if `resolveNavigationPromiseOnError` is
     * not `true`.
     *
     * @usageNotes
     *
     * The following calls request navigation to a dynamic route path relative to the current URL.
     *
     * ```ts
     * router.navigate(['team', 33, 'user', 11], {relativeTo: route});
     *
     * // Navigate without updating the URL, overriding the default behavior
     * router.navigate(['team', 33, 'user', 11], {relativeTo: route, skipLocationChange: true});
     * ```
     *
     * @see [Routing and Navigation guide](guide/routing/common-router-tasks)
     *
     */
    navigate(commands, extras = { skipLocationChange: false }) {
        validateCommands(commands);
        return this.navigateByUrl(this.createUrlTree(commands, extras), extras);
    }
    /** Serializes a `UrlTree` into a string */
    serializeUrl(url) {
        return this.urlSerializer.serialize(url);
    }
    /** Parses a string into a `UrlTree` */
    parseUrl(url) {
        try {
            return this.urlSerializer.parse(url);
        }
        catch {
            return this.urlSerializer.parse('/');
        }
    }
    isActive(url, matchOptions) {
        let options;
        if (matchOptions === true) {
            options = { ...exactMatchOptions };
        }
        else if (matchOptions === false) {
            options = { ...subsetMatchOptions };
        }
        else {
            options = matchOptions;
        }
        if (isUrlTree(url)) {
            return containsTree(this.currentUrlTree, url, options);
        }
        const urlTree = this.parseUrl(url);
        return containsTree(this.currentUrlTree, urlTree, options);
    }
    removeEmptyProps(params) {
        return Object.entries(params).reduce((result, [key, value]) => {
            if (value !== null && value !== undefined) {
                result[key] = value;
            }
            return result;
        }, {});
    }
    scheduleNavigation(rawUrl, source, restoredState, extras, priorPromise) {
        if (this.disposed) {
            return Promise.resolve(false);
        }
        let resolve;
        let reject;
        let promise;
        if (priorPromise) {
            resolve = priorPromise.resolve;
            reject = priorPromise.reject;
            promise = priorPromise.promise;
        }
        else {
            promise = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });
        }
        // Indicate that the navigation is happening.
        const taskId = this.pendingTasks.add();
        afterNextNavigation(this, () => {
            // Remove pending task in a microtask to allow for cancelled
            // initial navigations and redirects within the same task.
            queueMicrotask(() => this.pendingTasks.remove(taskId));
        });
        this.navigationTransitions.handleNavigationRequest({
            source,
            restoredState,
            currentUrlTree: this.currentUrlTree,
            currentRawUrl: this.currentUrlTree,
            rawUrl,
            extras,
            resolve: resolve,
            reject: reject,
            promise,
            currentSnapshot: this.routerState.snapshot,
            currentRouterState: this.routerState,
        });
        // Make sure that the error is propagated even though `processNavigations` catch
        // handler does not rethrow
        return promise.catch((e) => {
            return Promise.reject(e);
        });
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: Router, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: Router, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.3+sha-3e6e1c1", ngImport: i0, type: Router, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: () => [] });
function validateCommands(commands) {
    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        if (cmd == null) {
            throw new _RuntimeError(4008 /* RuntimeErrorCode.NULLISH_COMMAND */, (typeof ngDevMode === 'undefined' || ngDevMode) &&
                `The requested path contains ${cmd} segment at index ${i}`);
        }
    }
}

export { ActivatedRoute, ActivatedRouteSnapshot, ActivationEnd, ActivationStart, BaseRouteReuseStrategy, CREATE_VIEW_TRANSITION, ChildActivationEnd, ChildActivationStart, ChildrenOutletContexts, DefaultTitleStrategy, DefaultUrlSerializer, EventType, GuardsCheckEnd, GuardsCheckStart, IMPERATIVE_NAVIGATION, INPUT_BINDER, NAVIGATION_ERROR_HANDLER, NavigationCancel, NavigationCancellationCode, NavigationEnd, NavigationError, NavigationSkipped, NavigationSkippedCode, NavigationStart, NavigationTransitions, OutletContext, PRIMARY_OUTLET, ROUTER_CONFIGURATION, ROUTER_OUTLET_DATA, ROUTES, RedirectCommand, ResolveEnd, ResolveStart, RouteConfigLoadEnd, RouteConfigLoadStart, RouteReuseStrategy, RoutedComponentInputBinder, Router, RouterConfigLoader, RouterEvent, RouterOutlet, RouterState, RouterStateSnapshot, RoutesRecognized, Scroll, TitleStrategy, UrlHandlingStrategy, UrlSegment, UrlSegmentGroup, UrlSerializer, UrlTree, VIEW_TRANSITION_OPTIONS, afterNextNavigation, convertToParamMap, createUrlTreeFromSnapshot, createViewTransition, defaultUrlMatcher, isUrlTree, loadChildren, stringifyEvent, ɵEmptyOutletComponent };
//# sourceMappingURL=router2.mjs.map
