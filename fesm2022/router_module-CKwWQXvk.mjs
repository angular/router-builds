/**
 * @license Angular v20.0.0-next.7+sha-e53a374
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */

import * as i3 from '@angular/common';
import { LOCATION_INITIALIZED, HashLocationStrategy, LocationStrategy, ViewportScroller, Location, PathLocationStrategy } from '@angular/common';
import * as i0 from '@angular/core';
import { inject, ɵINTERNAL_APPLICATION_ERROR_HANDLER as _INTERNAL_APPLICATION_ERROR_HANDLER, ɵRuntimeError as _RuntimeError, ɵɵsanitizeUrlOrResourceUrl as __sanitizeUrlOrResourceUrl, booleanAttribute, HostListener, Input, HostBinding, Attribute, Directive, EventEmitter, Output, ContentChildren, Optional, createEnvironmentInjector, Injectable, InjectionToken, ɵperformanceMarkFeature as _performanceMarkFeature, makeEnvironmentProviders, APP_BOOTSTRAP_LISTENER, ENVIRONMENT_INITIALIZER, provideAppInitializer, Injector, ApplicationRef, NgZone, SkipSelf, NgModule } from '@angular/core';
import { NavigationEnd, isUrlTree, Router, ActivatedRoute, RouterConfigLoader, IMPERATIVE_NAVIGATION, NavigationStart, NavigationSkipped, NavigationSkippedCode, Scroll, UrlSerializer, NavigationTransitions, ROUTES, afterNextNavigation, ROUTER_CONFIGURATION, NAVIGATION_ERROR_HANDLER, RoutedComponentInputBinder, INPUT_BINDER, createViewTransition, CREATE_VIEW_TRANSITION, VIEW_TRANSITION_OPTIONS, stringifyEvent, DefaultUrlSerializer, ChildrenOutletContexts, RouterOutlet, ɵEmptyOutletComponent as _EmptyOutletComponent } from './router-Db1vz7B5.mjs';
import { Subject, of, from } from 'rxjs';
import { mergeAll, catchError, filter, concatMap, mergeMap } from 'rxjs/operators';

/**
 * @description
 *
 * When applied to an element in a template, makes that element a link
 * that initiates navigation to a route. Navigation opens one or more routed components
 * in one or more `<router-outlet>` locations on the page.
 *
 * Given a route configuration `[{ path: 'user/:name', component: UserCmp }]`,
 * the following creates a static link to the route:
 * `<a routerLink="/user/bob">link to user component</a>`
 *
 * You can use dynamic values to generate the link.
 * For a dynamic link, pass an array of path segments,
 * followed by the params for each segment.
 * For example, `['/team', teamId, 'user', userName, {details: true}]`
 * generates a link to `/team/11/user/bob;details=true`.
 *
 * Multiple static segments can be merged into one term and combined with dynamic segments.
 * For example, `['/team/11/user', userName, {details: true}]`
 *
 * The input that you provide to the link is treated as a delta to the current URL.
 * For instance, suppose the current URL is `/user/(box//aux:team)`.
 * The link `<a [routerLink]="['/user/jim']">Jim</a>` creates the URL
 * `/user/(jim//aux:team)`.
 * See {@link Router#createUrlTree} for more information.
 *
 * @usageNotes
 *
 * You can use absolute or relative paths in a link, set query parameters,
 * control how parameters are handled, and keep a history of navigation states.
 *
 * ### Relative link paths
 *
 * The first segment name can be prepended with `/`, `./`, or `../`.
 * * If the first segment begins with `/`, the router looks up the route from the root of the
 *   app.
 * * If the first segment begins with `./`, or doesn't begin with a slash, the router
 *   looks in the children of the current activated route.
 * * If the first segment begins with `../`, the router goes up one level in the route tree.
 *
 * ### Setting and handling query params and fragments
 *
 * The following link adds a query parameter and a fragment to the generated URL:
 *
 * ```html
 * <a [routerLink]="['/user/bob']" [queryParams]="{debug: true}" fragment="education">
 *   link to user component
 * </a>
 * ```
 * By default, the directive constructs the new URL using the given query parameters.
 * The example generates the link: `/user/bob?debug=true#education`.
 *
 * You can instruct the directive to handle query parameters differently
 * by specifying the `queryParamsHandling` option in the link.
 * Allowed values are:
 *
 *  - `'merge'`: Merge the given `queryParams` into the current query params.
 *  - `'preserve'`: Preserve the current query params.
 *
 * For example:
 *
 * ```html
 * <a [routerLink]="['/user/bob']" [queryParams]="{debug: true}" queryParamsHandling="merge">
 *   link to user component
 * </a>
 * ```
 *
 * `queryParams`, `fragment`, `queryParamsHandling`, `preserveFragment`, and `relativeTo`
 * cannot be used when the `routerLink` input is a `UrlTree`.
 *
 * See {@link UrlCreationOptions#queryParamsHandling}.
 *
 * ### Preserving navigation history
 *
 * You can provide a `state` value to be persisted to the browser's
 * [`History.state` property](https://developer.mozilla.org/en-US/docs/Web/API/History#Properties).
 * For example:
 *
 * ```html
 * <a [routerLink]="['/user/bob']" [state]="{tracingId: 123}">
 *   link to user component
 * </a>
 * ```
 *
 * Use {@link Router#getCurrentNavigation} to retrieve a saved
 * navigation-state value. For example, to capture the `tracingId` during the `NavigationStart`
 * event:
 *
 * ```ts
 * // Get NavigationStart events
 * router.events.pipe(filter(e => e instanceof NavigationStart)).subscribe(e => {
 *   const navigation = router.getCurrentNavigation();
 *   tracingService.trace({id: navigation.extras.state.tracingId});
 * });
 * ```
 *
 * ### RouterLink compatible custom elements
 *
 * In order to make a custom element work with routerLink, the corresponding custom
 * element must implement the `href` attribute and must list `href` in the array of
 * the static property/getter `observedAttributes`.
 *
 * @ngModule RouterModule
 *
 * @publicApi
 */
class RouterLink {
    router;
    route;
    tabIndexAttribute;
    renderer;
    el;
    locationStrategy;
    /**
     * Represents an `href` attribute value applied to a host element,
     * when a host element is an `<a>`/`<area>` tag or a compatible custom element.
     * For other tags, the value is `null`.
     */
    href = null;
    /**
     * Represents the `target` attribute on a host element.
     * This is only used when the host element is
     * an `<a>`/`<area>` tag or a compatible custom element.
     */
    target;
    /**
     * Passed to {@link Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * @see {@link UrlCreationOptions#queryParams}
     * @see {@link Router#createUrlTree}
     */
    queryParams;
    /**
     * Passed to {@link Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * @see {@link UrlCreationOptions#fragment}
     * @see {@link Router#createUrlTree}
     */
    fragment;
    /**
     * Passed to {@link Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * @see {@link UrlCreationOptions#queryParamsHandling}
     * @see {@link Router#createUrlTree}
     */
    queryParamsHandling;
    /**
     * Passed to {@link Router#navigateByUrl} as part of the
     * `NavigationBehaviorOptions`.
     * @see {@link NavigationBehaviorOptions#state}
     * @see {@link Router#navigateByUrl}
     */
    state;
    /**
     * Passed to {@link Router#navigateByUrl} as part of the
     * `NavigationBehaviorOptions`.
     * @see {@link NavigationBehaviorOptions#info}
     * @see {@link Router#navigateByUrl}
     */
    info;
    /**
     * Passed to {@link Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * Specify a value here when you do not want to use the default value
     * for `routerLink`, which is the current activated route.
     * Note that a value of `undefined` here will use the `routerLink` default.
     * @see {@link UrlCreationOptions#relativeTo}
     * @see {@link Router#createUrlTree}
     */
    relativeTo;
    /** Whether a host element is an `<a>`/`<area>` tag or a compatible custom element. */
    isAnchorElement;
    subscription;
    /** @internal */
    onChanges = new Subject();
    applicationErrorHandler = inject(_INTERNAL_APPLICATION_ERROR_HANDLER);
    constructor(router, route, tabIndexAttribute, renderer, el, locationStrategy) {
        this.router = router;
        this.route = route;
        this.tabIndexAttribute = tabIndexAttribute;
        this.renderer = renderer;
        this.el = el;
        this.locationStrategy = locationStrategy;
        const tagName = el.nativeElement.tagName?.toLowerCase();
        this.isAnchorElement =
            tagName === 'a' ||
                tagName === 'area' ||
                !!(
                // Avoid breaking in an SSR context where customElements might not be defined.
                (typeof customElements === 'object' &&
                    // observedAttributes is an optional static property/getter on a custom element.
                    // The spec states that this must be an array of strings.
                    customElements.get(tagName)?.observedAttributes?.includes?.('href')));
        if (this.isAnchorElement) {
            this.subscription = router.events.subscribe((s) => {
                if (s instanceof NavigationEnd) {
                    this.updateHref();
                }
            });
        }
        else {
            this.setTabIndexIfNotOnNativeEl('0');
        }
    }
    /**
     * Passed to {@link Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * @see {@link UrlCreationOptions#preserveFragment}
     * @see {@link Router#createUrlTree}
     */
    preserveFragment = false;
    /**
     * Passed to {@link Router#navigateByUrl} as part of the
     * `NavigationBehaviorOptions`.
     * @see {@link NavigationBehaviorOptions#skipLocationChange}
     * @see {@link Router#navigateByUrl}
     */
    skipLocationChange = false;
    /**
     * Passed to {@link Router#navigateByUrl} as part of the
     * `NavigationBehaviorOptions`.
     * @see {@link NavigationBehaviorOptions#replaceUrl}
     * @see {@link Router#navigateByUrl}
     */
    replaceUrl = false;
    /**
     * Modifies the tab index if there was not a tabindex attribute on the element during
     * instantiation.
     */
    setTabIndexIfNotOnNativeEl(newTabIndex) {
        if (this.tabIndexAttribute != null /* both `null` and `undefined` */ || this.isAnchorElement) {
            return;
        }
        this.applyAttributeValue('tabindex', newTabIndex);
    }
    /** @nodoc */
    // TODO(atscott): Remove changes parameter in major version as a breaking change.
    ngOnChanges(changes) {
        if (ngDevMode &&
            isUrlTree(this.routerLinkInput) &&
            (this.fragment !== undefined ||
                this.queryParams ||
                this.queryParamsHandling ||
                this.preserveFragment ||
                this.relativeTo)) {
            throw new _RuntimeError(4016 /* RuntimeErrorCode.INVALID_ROUTER_LINK_INPUTS */, 'Cannot configure queryParams or fragment when using a UrlTree as the routerLink input value.');
        }
        if (this.isAnchorElement) {
            this.updateHref();
        }
        // This is subscribed to by `RouterLinkActive` so that it knows to update when there are changes
        // to the RouterLinks it's tracking.
        this.onChanges.next(this);
    }
    routerLinkInput = null;
    /**
     * Commands to pass to {@link Router#createUrlTree} or a `UrlTree`.
     *   - **array**: commands to pass to {@link Router#createUrlTree}.
     *   - **string**: shorthand for array of commands with just the string, i.e. `['/route']`
     *   - **UrlTree**: a `UrlTree` for this link rather than creating one from the commands
     *     and other inputs that correspond to properties of `UrlCreationOptions`.
     *   - **null|undefined**: effectively disables the `routerLink`
     * @see {@link Router#createUrlTree}
     */
    set routerLink(commandsOrUrlTree) {
        if (commandsOrUrlTree == null) {
            this.routerLinkInput = null;
            this.setTabIndexIfNotOnNativeEl(null);
        }
        else {
            if (isUrlTree(commandsOrUrlTree)) {
                this.routerLinkInput = commandsOrUrlTree;
            }
            else {
                this.routerLinkInput = Array.isArray(commandsOrUrlTree)
                    ? commandsOrUrlTree
                    : [commandsOrUrlTree];
            }
            this.setTabIndexIfNotOnNativeEl('0');
        }
    }
    /** @nodoc */
    onClick(button, ctrlKey, shiftKey, altKey, metaKey) {
        const urlTree = this.urlTree;
        if (urlTree === null) {
            return true;
        }
        if (this.isAnchorElement) {
            if (button !== 0 || ctrlKey || shiftKey || altKey || metaKey) {
                return true;
            }
            if (typeof this.target === 'string' && this.target != '_self') {
                return true;
            }
        }
        const extras = {
            skipLocationChange: this.skipLocationChange,
            replaceUrl: this.replaceUrl,
            state: this.state,
            info: this.info,
        };
        // navigateByUrl is mocked frequently in tests... Reduce breakages when adding `catch`
        this.router.navigateByUrl(urlTree, extras)?.catch((e) => {
            this.applicationErrorHandler(e);
        });
        // Return `false` for `<a>` elements to prevent default action
        // and cancel the native behavior, since the navigation is handled
        // by the Router.
        return !this.isAnchorElement;
    }
    /** @nodoc */
    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }
    updateHref() {
        const urlTree = this.urlTree;
        this.href =
            urlTree !== null && this.locationStrategy
                ? this.locationStrategy?.prepareExternalUrl(this.router.serializeUrl(urlTree))
                : null;
        const sanitizedValue = this.href === null
            ? null
            : // This class represents a directive that can be added to both `<a>` elements,
                // as well as other elements. As a result, we can't define security context at
                // compile time. So the security context is deferred to runtime.
                // The `ɵɵsanitizeUrlOrResourceUrl` selects the necessary sanitizer function
                // based on the tag and property names. The logic mimics the one from
                // `packages/compiler/src/schema/dom_security_schema.ts`, which is used at compile time.
                //
                // Note: we should investigate whether we can switch to using `@HostBinding('attr.href')`
                // instead of applying a value via a renderer, after a final merge of the
                // `RouterLinkWithHref` directive.
                __sanitizeUrlOrResourceUrl(this.href, this.el.nativeElement.tagName.toLowerCase(), 'href');
        this.applyAttributeValue('href', sanitizedValue);
    }
    applyAttributeValue(attrName, attrValue) {
        const renderer = this.renderer;
        const nativeElement = this.el.nativeElement;
        if (attrValue !== null) {
            renderer.setAttribute(nativeElement, attrName, attrValue);
        }
        else {
            renderer.removeAttribute(nativeElement, attrName);
        }
    }
    get urlTree() {
        if (this.routerLinkInput === null) {
            return null;
        }
        else if (isUrlTree(this.routerLinkInput)) {
            return this.routerLinkInput;
        }
        return this.router.createUrlTree(this.routerLinkInput, {
            // If the `relativeTo` input is not defined, we want to use `this.route` by default.
            // Otherwise, we should use the value provided by the user in the input.
            relativeTo: this.relativeTo !== undefined ? this.relativeTo : this.route,
            queryParams: this.queryParams,
            fragment: this.fragment,
            queryParamsHandling: this.queryParamsHandling,
            preserveFragment: this.preserveFragment,
        });
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: RouterLink, deps: [{ token: Router }, { token: ActivatedRoute }, { token: 'tabindex', attribute: true }, { token: i0.Renderer2 }, { token: i0.ElementRef }, { token: i3.LocationStrategy }], target: i0.ɵɵFactoryTarget.Directive });
    static ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "16.1.0", version: "20.0.0-next.7+sha-e53a374", type: RouterLink, isStandalone: true, selector: "[routerLink]", inputs: { target: "target", queryParams: "queryParams", fragment: "fragment", queryParamsHandling: "queryParamsHandling", state: "state", info: "info", relativeTo: "relativeTo", preserveFragment: ["preserveFragment", "preserveFragment", booleanAttribute], skipLocationChange: ["skipLocationChange", "skipLocationChange", booleanAttribute], replaceUrl: ["replaceUrl", "replaceUrl", booleanAttribute], routerLink: "routerLink" }, host: { listeners: { "click": "onClick($event.button,$event.ctrlKey,$event.shiftKey,$event.altKey,$event.metaKey)" }, properties: { "attr.target": "this.target" } }, usesOnChanges: true, ngImport: i0 });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: RouterLink, decorators: [{
            type: Directive,
            args: [{
                    selector: '[routerLink]',
                }]
        }], ctorParameters: () => [{ type: Router }, { type: ActivatedRoute }, { type: undefined, decorators: [{
                    type: Attribute,
                    args: ['tabindex']
                }] }, { type: i0.Renderer2 }, { type: i0.ElementRef }, { type: i3.LocationStrategy }], propDecorators: { target: [{
                type: HostBinding,
                args: ['attr.target']
            }, {
                type: Input
            }], queryParams: [{
                type: Input
            }], fragment: [{
                type: Input
            }], queryParamsHandling: [{
                type: Input
            }], state: [{
                type: Input
            }], info: [{
                type: Input
            }], relativeTo: [{
                type: Input
            }], preserveFragment: [{
                type: Input,
                args: [{ transform: booleanAttribute }]
            }], skipLocationChange: [{
                type: Input,
                args: [{ transform: booleanAttribute }]
            }], replaceUrl: [{
                type: Input,
                args: [{ transform: booleanAttribute }]
            }], routerLink: [{
                type: Input
            }], onClick: [{
                type: HostListener,
                args: ['click', [
                        '$event.button',
                        '$event.ctrlKey',
                        '$event.shiftKey',
                        '$event.altKey',
                        '$event.metaKey',
                    ]]
            }] } });

/**
 *
 * @description
 *
 * Tracks whether the linked route of an element is currently active, and allows you
 * to specify one or more CSS classes to add to the element when the linked route
 * is active.
 *
 * Use this directive to create a visual distinction for elements associated with an active route.
 * For example, the following code highlights the word "Bob" when the router
 * activates the associated route:
 *
 * ```html
 * <a routerLink="/user/bob" routerLinkActive="active-link">Bob</a>
 * ```
 *
 * Whenever the URL is either '/user' or '/user/bob', the "active-link" class is
 * added to the anchor tag. If the URL changes, the class is removed.
 *
 * You can set more than one class using a space-separated string or an array.
 * For example:
 *
 * ```html
 * <a routerLink="/user/bob" routerLinkActive="class1 class2">Bob</a>
 * <a routerLink="/user/bob" [routerLinkActive]="['class1', 'class2']">Bob</a>
 * ```
 *
 * To add the classes only when the URL matches the link exactly, add the option `exact: true`:
 *
 * ```html
 * <a routerLink="/user/bob" routerLinkActive="active-link" [routerLinkActiveOptions]="{exact:
 * true}">Bob</a>
 * ```
 *
 * To directly check the `isActive` status of the link, assign the `RouterLinkActive`
 * instance to a template variable.
 * For example, the following checks the status without assigning any CSS classes:
 *
 * ```html
 * <a routerLink="/user/bob" routerLinkActive #rla="routerLinkActive">
 *   Bob {{ rla.isActive ? '(already open)' : ''}}
 * </a>
 * ```
 *
 * You can apply the `RouterLinkActive` directive to an ancestor of linked elements.
 * For example, the following sets the active-link class on the `<div>`  parent tag
 * when the URL is either '/user/jim' or '/user/bob'.
 *
 * ```html
 * <div routerLinkActive="active-link" [routerLinkActiveOptions]="{exact: true}">
 *   <a routerLink="/user/jim">Jim</a>
 *   <a routerLink="/user/bob">Bob</a>
 * </div>
 * ```
 *
 * The `RouterLinkActive` directive can also be used to set the aria-current attribute
 * to provide an alternative distinction for active elements to visually impaired users.
 *
 * For example, the following code adds the 'active' class to the Home Page link when it is
 * indeed active and in such case also sets its aria-current attribute to 'page':
 *
 * ```html
 * <a routerLink="/" routerLinkActive="active" ariaCurrentWhenActive="page">Home Page</a>
 * ```
 *
 * @ngModule RouterModule
 *
 * @publicApi
 */
class RouterLinkActive {
    router;
    element;
    renderer;
    cdr;
    link;
    links;
    classes = [];
    routerEventsSubscription;
    linkInputChangesSubscription;
    _isActive = false;
    get isActive() {
        return this._isActive;
    }
    /**
     * Options to configure how to determine if the router link is active.
     *
     * These options are passed to the `Router.isActive()` function.
     *
     * @see {@link Router#isActive}
     */
    routerLinkActiveOptions = { exact: false };
    /**
     * Aria-current attribute to apply when the router link is active.
     *
     * Possible values: `'page'` | `'step'` | `'location'` | `'date'` | `'time'` | `true` | `false`.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current}
     */
    ariaCurrentWhenActive;
    /**
     *
     * You can use the output `isActiveChange` to get notified each time the link becomes
     * active or inactive.
     *
     * Emits:
     * true  -> Route is active
     * false -> Route is inactive
     *
     * ```html
     * <a
     *  routerLink="/user/bob"
     *  routerLinkActive="active-link"
     *  (isActiveChange)="this.onRouterLinkActive($event)">Bob</a>
     * ```
     */
    isActiveChange = new EventEmitter();
    constructor(router, element, renderer, cdr, link) {
        this.router = router;
        this.element = element;
        this.renderer = renderer;
        this.cdr = cdr;
        this.link = link;
        this.routerEventsSubscription = router.events.subscribe((s) => {
            if (s instanceof NavigationEnd) {
                this.update();
            }
        });
    }
    /** @nodoc */
    ngAfterContentInit() {
        // `of(null)` is used to force subscribe body to execute once immediately (like `startWith`).
        of(this.links.changes, of(null))
            .pipe(mergeAll())
            .subscribe((_) => {
            this.update();
            this.subscribeToEachLinkOnChanges();
        });
    }
    subscribeToEachLinkOnChanges() {
        this.linkInputChangesSubscription?.unsubscribe();
        const allLinkChanges = [...this.links.toArray(), this.link]
            .filter((link) => !!link)
            .map((link) => link.onChanges);
        this.linkInputChangesSubscription = from(allLinkChanges)
            .pipe(mergeAll())
            .subscribe((link) => {
            if (this._isActive !== this.isLinkActive(this.router)(link)) {
                this.update();
            }
        });
    }
    set routerLinkActive(data) {
        const classes = Array.isArray(data) ? data : data.split(' ');
        this.classes = classes.filter((c) => !!c);
    }
    /** @nodoc */
    ngOnChanges(changes) {
        this.update();
    }
    /** @nodoc */
    ngOnDestroy() {
        this.routerEventsSubscription.unsubscribe();
        this.linkInputChangesSubscription?.unsubscribe();
    }
    update() {
        if (!this.links || !this.router.navigated)
            return;
        queueMicrotask(() => {
            const hasActiveLinks = this.hasActiveLinks();
            this.classes.forEach((c) => {
                if (hasActiveLinks) {
                    this.renderer.addClass(this.element.nativeElement, c);
                }
                else {
                    this.renderer.removeClass(this.element.nativeElement, c);
                }
            });
            if (hasActiveLinks && this.ariaCurrentWhenActive !== undefined) {
                this.renderer.setAttribute(this.element.nativeElement, 'aria-current', this.ariaCurrentWhenActive.toString());
            }
            else {
                this.renderer.removeAttribute(this.element.nativeElement, 'aria-current');
            }
            // Only emit change if the active state changed.
            if (this._isActive !== hasActiveLinks) {
                this._isActive = hasActiveLinks;
                this.cdr.markForCheck();
                // Emit on isActiveChange after classes are updated
                this.isActiveChange.emit(hasActiveLinks);
            }
        });
    }
    isLinkActive(router) {
        const options = isActiveMatchOptions(this.routerLinkActiveOptions)
            ? this.routerLinkActiveOptions
            : // While the types should disallow `undefined` here, it's possible without strict inputs
                this.routerLinkActiveOptions.exact || false;
        return (link) => {
            const urlTree = link.urlTree;
            return urlTree ? router.isActive(urlTree, options) : false;
        };
    }
    hasActiveLinks() {
        const isActiveCheckFn = this.isLinkActive(this.router);
        return (this.link && isActiveCheckFn(this.link)) || this.links.some(isActiveCheckFn);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: RouterLinkActive, deps: [{ token: Router }, { token: i0.ElementRef }, { token: i0.Renderer2 }, { token: i0.ChangeDetectorRef }, { token: RouterLink, optional: true }], target: i0.ɵɵFactoryTarget.Directive });
    static ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "20.0.0-next.7+sha-e53a374", type: RouterLinkActive, isStandalone: true, selector: "[routerLinkActive]", inputs: { routerLinkActiveOptions: "routerLinkActiveOptions", ariaCurrentWhenActive: "ariaCurrentWhenActive", routerLinkActive: "routerLinkActive" }, outputs: { isActiveChange: "isActiveChange" }, queries: [{ propertyName: "links", predicate: RouterLink, descendants: true }], exportAs: ["routerLinkActive"], usesOnChanges: true, ngImport: i0 });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: RouterLinkActive, decorators: [{
            type: Directive,
            args: [{
                    selector: '[routerLinkActive]',
                    exportAs: 'routerLinkActive',
                }]
        }], ctorParameters: () => [{ type: Router }, { type: i0.ElementRef }, { type: i0.Renderer2 }, { type: i0.ChangeDetectorRef }, { type: RouterLink, decorators: [{
                    type: Optional
                }] }], propDecorators: { links: [{
                type: ContentChildren,
                args: [RouterLink, { descendants: true }]
            }], routerLinkActiveOptions: [{
                type: Input
            }], ariaCurrentWhenActive: [{
                type: Input
            }], isActiveChange: [{
                type: Output
            }], routerLinkActive: [{
                type: Input
            }] } });
/**
 * Use instead of `'paths' in options` to be compatible with property renaming
 */
function isActiveMatchOptions(options) {
    return !!options.paths;
}

/**
 * @description
 *
 * Provides a preloading strategy.
 *
 * @publicApi
 */
class PreloadingStrategy {
}
/**
 * @description
 *
 * Provides a preloading strategy that preloads all modules as quickly as possible.
 *
 * ```ts
 * RouterModule.forRoot(ROUTES, {preloadingStrategy: PreloadAllModules})
 * ```
 *
 * @publicApi
 */
class PreloadAllModules {
    preload(route, fn) {
        return fn().pipe(catchError(() => of(null)));
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: PreloadAllModules, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: PreloadAllModules, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: PreloadAllModules, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
/**
 * @description
 *
 * Provides a preloading strategy that does not preload any modules.
 *
 * This strategy is enabled by default.
 *
 * @publicApi
 */
class NoPreloading {
    preload(route, fn) {
        return of(null);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: NoPreloading, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: NoPreloading, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: NoPreloading, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
/**
 * The preloader optimistically loads all router configurations to
 * make navigations into lazily-loaded sections of the application faster.
 *
 * The preloader runs in the background. When the router bootstraps, the preloader
 * starts listening to all navigation events. After every such event, the preloader
 * will check if any configurations can be loaded lazily.
 *
 * If a route is protected by `canLoad` guards, the preloaded will not load it.
 *
 * @publicApi
 */
class RouterPreloader {
    router;
    injector;
    preloadingStrategy;
    loader;
    subscription;
    constructor(router, compiler, injector, preloadingStrategy, loader) {
        this.router = router;
        this.injector = injector;
        this.preloadingStrategy = preloadingStrategy;
        this.loader = loader;
    }
    setUpPreloading() {
        this.subscription = this.router.events
            .pipe(filter((e) => e instanceof NavigationEnd), concatMap(() => this.preload()))
            .subscribe(() => { });
    }
    preload() {
        return this.processRoutes(this.injector, this.router.config);
    }
    /** @nodoc */
    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
    processRoutes(injector, routes) {
        const res = [];
        for (const route of routes) {
            if (route.providers && !route._injector) {
                route._injector = createEnvironmentInjector(route.providers, injector, `Route: ${route.path}`);
            }
            const injectorForCurrentRoute = route._injector ?? injector;
            const injectorForChildren = route._loadedInjector ?? injectorForCurrentRoute;
            // Note that `canLoad` is only checked as a condition that prevents `loadChildren` and not
            // `loadComponent`. `canLoad` guards only block loading of child routes by design. This
            // happens as a consequence of needing to descend into children for route matching immediately
            // while component loading is deferred until route activation. Because `canLoad` guards can
            // have side effects, we cannot execute them here so we instead skip preloading altogether
            // when present. Lastly, it remains to be decided whether `canLoad` should behave this way
            // at all. Code splitting and lazy loading is separate from client-side authorization checks
            // and should not be used as a security measure to prevent loading of code.
            if ((route.loadChildren && !route._loadedRoutes && route.canLoad === undefined) ||
                (route.loadComponent && !route._loadedComponent)) {
                res.push(this.preloadConfig(injectorForCurrentRoute, route));
            }
            if (route.children || route._loadedRoutes) {
                res.push(this.processRoutes(injectorForChildren, (route.children ?? route._loadedRoutes)));
            }
        }
        return from(res).pipe(mergeAll());
    }
    preloadConfig(injector, route) {
        return this.preloadingStrategy.preload(route, () => {
            let loadedChildren$;
            if (route.loadChildren && route.canLoad === undefined) {
                loadedChildren$ = this.loader.loadChildren(injector, route);
            }
            else {
                loadedChildren$ = of(null);
            }
            const recursiveLoadChildren$ = loadedChildren$.pipe(mergeMap((config) => {
                if (config === null) {
                    return of(void 0);
                }
                route._loadedRoutes = config.routes;
                route._loadedInjector = config.injector;
                // If the loaded config was a module, use that as the module/module injector going
                // forward. Otherwise, continue using the current module/module injector.
                return this.processRoutes(config.injector ?? injector, config.routes);
            }));
            if (route.loadComponent && !route._loadedComponent) {
                const loadComponent$ = this.loader.loadComponent(route);
                return from([recursiveLoadChildren$, loadComponent$]).pipe(mergeAll());
            }
            else {
                return recursiveLoadChildren$;
            }
        });
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: RouterPreloader, deps: [{ token: Router }, { token: i0.Compiler }, { token: i0.EnvironmentInjector }, { token: PreloadingStrategy }, { token: RouterConfigLoader }], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: RouterPreloader, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: RouterPreloader, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }], ctorParameters: () => [{ type: Router }, { type: i0.Compiler }, { type: i0.EnvironmentInjector }, { type: PreloadingStrategy }, { type: RouterConfigLoader }] });

const ROUTER_SCROLLER = new InjectionToken('');
class RouterScroller {
    urlSerializer;
    transitions;
    viewportScroller;
    zone;
    options;
    routerEventsSubscription;
    scrollEventsSubscription;
    lastId = 0;
    lastSource = IMPERATIVE_NAVIGATION;
    restoredId = 0;
    store = {};
    /** @nodoc */
    constructor(urlSerializer, transitions, viewportScroller, zone, options = {}) {
        this.urlSerializer = urlSerializer;
        this.transitions = transitions;
        this.viewportScroller = viewportScroller;
        this.zone = zone;
        this.options = options;
        // Default both options to 'disabled'
        options.scrollPositionRestoration ||= 'disabled';
        options.anchorScrolling ||= 'disabled';
    }
    init() {
        // we want to disable the automatic scrolling because having two places
        // responsible for scrolling results race conditions, especially given
        // that browser don't implement this behavior consistently
        if (this.options.scrollPositionRestoration !== 'disabled') {
            this.viewportScroller.setHistoryScrollRestoration('manual');
        }
        this.routerEventsSubscription = this.createScrollEvents();
        this.scrollEventsSubscription = this.consumeScrollEvents();
    }
    createScrollEvents() {
        return this.transitions.events.subscribe((e) => {
            if (e instanceof NavigationStart) {
                // store the scroll position of the current stable navigations.
                this.store[this.lastId] = this.viewportScroller.getScrollPosition();
                this.lastSource = e.navigationTrigger;
                this.restoredId = e.restoredState ? e.restoredState.navigationId : 0;
            }
            else if (e instanceof NavigationEnd) {
                this.lastId = e.id;
                this.scheduleScrollEvent(e, this.urlSerializer.parse(e.urlAfterRedirects).fragment);
            }
            else if (e instanceof NavigationSkipped &&
                e.code === NavigationSkippedCode.IgnoredSameUrlNavigation) {
                this.lastSource = undefined;
                this.restoredId = 0;
                this.scheduleScrollEvent(e, this.urlSerializer.parse(e.url).fragment);
            }
        });
    }
    consumeScrollEvents() {
        return this.transitions.events.subscribe((e) => {
            if (!(e instanceof Scroll))
                return;
            // a popstate event. The pop state event will always ignore anchor scrolling.
            if (e.position) {
                if (this.options.scrollPositionRestoration === 'top') {
                    this.viewportScroller.scrollToPosition([0, 0]);
                }
                else if (this.options.scrollPositionRestoration === 'enabled') {
                    this.viewportScroller.scrollToPosition(e.position);
                }
                // imperative navigation "forward"
            }
            else {
                if (e.anchor && this.options.anchorScrolling === 'enabled') {
                    this.viewportScroller.scrollToAnchor(e.anchor);
                }
                else if (this.options.scrollPositionRestoration !== 'disabled') {
                    this.viewportScroller.scrollToPosition([0, 0]);
                }
            }
        });
    }
    scheduleScrollEvent(routerEvent, anchor) {
        this.zone.runOutsideAngular(async () => {
            // The scroll event needs to be delayed until after change detection. Otherwise, we may
            // attempt to restore the scroll position before the router outlet has fully rendered the
            // component by executing its update block of the template function.
            //
            // #57109 (we need to wait at least a macrotask before scrolling. AfterNextRender resolves in microtask event loop with Zones)
            // We could consider _also_ waiting for a render promise though one should have already happened or been scheduled by this point
            // and should definitely happen before rAF/setTimeout.
            // #53985 (cannot rely solely on setTimeout because a frame may paint before the timeout)
            await new Promise((resolve) => {
                setTimeout(resolve);
                if (typeof requestAnimationFrame !== 'undefined') {
                    requestAnimationFrame(resolve);
                }
            });
            this.zone.run(() => {
                this.transitions.events.next(new Scroll(routerEvent, this.lastSource === 'popstate' ? this.store[this.restoredId] : null, anchor));
            });
        });
    }
    /** @nodoc */
    ngOnDestroy() {
        this.routerEventsSubscription?.unsubscribe();
        this.scrollEventsSubscription?.unsubscribe();
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: RouterScroller, deps: "invalid", target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: RouterScroller });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: RouterScroller, decorators: [{
            type: Injectable
        }], ctorParameters: () => [{ type: UrlSerializer }, { type: NavigationTransitions }, { type: i3.ViewportScroller }, { type: i0.NgZone }, { type: undefined }] });

/**
 * Sets up providers necessary to enable `Router` functionality for the application.
 * Allows to configure a set of routes as well as extra features that should be enabled.
 *
 * @usageNotes
 *
 * Basic example of how you can add a Router to your application:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent, {
 *   providers: [provideRouter(appRoutes)]
 * });
 * ```
 *
 * You can also enable optional features in the Router by adding functions from the `RouterFeatures`
 * type:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes,
 *         withDebugTracing(),
 *         withRouterConfig({paramsInheritanceStrategy: 'always'}))
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link RouterFeatures}
 *
 * @publicApi
 * @param routes A set of `Route`s to use for the application routing table.
 * @param features Optional features to configure additional router behaviors.
 * @returns A set of providers to setup a Router.
 */
function provideRouter(routes, ...features) {
    return makeEnvironmentProviders([
        { provide: ROUTES, multi: true, useValue: routes },
        typeof ngDevMode === 'undefined' || ngDevMode
            ? { provide: ROUTER_IS_PROVIDED, useValue: true }
            : [],
        { provide: ActivatedRoute, useFactory: rootRoute, deps: [Router] },
        { provide: APP_BOOTSTRAP_LISTENER, multi: true, useFactory: getBootstrapListener },
        features.map((feature) => feature.ɵproviders),
    ]);
}
function rootRoute(router) {
    return router.routerState.root;
}
/**
 * Helper function to create an object that represents a Router feature.
 */
function routerFeature(kind, providers) {
    return { ɵkind: kind, ɵproviders: providers };
}
/**
 * An Injection token used to indicate whether `provideRouter` or `RouterModule.forRoot` was ever
 * called.
 */
const ROUTER_IS_PROVIDED = new InjectionToken('', {
    providedIn: 'root',
    factory: () => false,
});
const routerIsProvidedDevModeCheck = {
    provide: ENVIRONMENT_INITIALIZER,
    multi: true,
    useFactory() {
        return () => {
            if (!inject(ROUTER_IS_PROVIDED)) {
                console.warn('`provideRoutes` was called without `provideRouter` or `RouterModule.forRoot`. ' +
                    'This is likely a mistake.');
            }
        };
    },
};
/**
 * Registers a DI provider for a set of routes.
 * @param routes The route configuration to provide.
 *
 * @usageNotes
 *
 * ```ts
 * @NgModule({
 *   providers: [provideRoutes(ROUTES)]
 * })
 * class LazyLoadedChildModule {}
 * ```
 *
 * @deprecated If necessary, provide routes using the `ROUTES` `InjectionToken`.
 * @see {@link ROUTES}
 * @publicApi
 */
function provideRoutes(routes) {
    return [
        { provide: ROUTES, multi: true, useValue: routes },
        typeof ngDevMode === 'undefined' || ngDevMode ? routerIsProvidedDevModeCheck : [],
    ];
}
/**
 * Enables customizable scrolling behavior for router navigations.
 *
 * @usageNotes
 *
 * Basic example of how you can enable scrolling feature:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withInMemoryScrolling())
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 * @see {@link ViewportScroller}
 *
 * @publicApi
 * @param options Set of configuration parameters to customize scrolling behavior, see
 *     `InMemoryScrollingOptions` for additional information.
 * @returns A set of providers for use with `provideRouter`.
 */
function withInMemoryScrolling(options = {}) {
    const providers = [
        {
            provide: ROUTER_SCROLLER,
            useFactory: () => {
                const viewportScroller = inject(ViewportScroller);
                const zone = inject(NgZone);
                const transitions = inject(NavigationTransitions);
                const urlSerializer = inject(UrlSerializer);
                return new RouterScroller(urlSerializer, transitions, viewportScroller, zone, options);
            },
        },
    ];
    return routerFeature(4 /* RouterFeatureKind.InMemoryScrollingFeature */, providers);
}
function getBootstrapListener() {
    const injector = inject(Injector);
    return (bootstrappedComponentRef) => {
        const ref = injector.get(ApplicationRef);
        if (bootstrappedComponentRef !== ref.components[0]) {
            return;
        }
        const router = injector.get(Router);
        const bootstrapDone = injector.get(BOOTSTRAP_DONE);
        if (injector.get(INITIAL_NAVIGATION) === 1 /* InitialNavigation.EnabledNonBlocking */) {
            router.initialNavigation();
        }
        injector.get(ROUTER_PRELOADER, null, { optional: true })?.setUpPreloading();
        injector.get(ROUTER_SCROLLER, null, { optional: true })?.init();
        router.resetRootComponentType(ref.componentTypes[0]);
        if (!bootstrapDone.closed) {
            bootstrapDone.next();
            bootstrapDone.complete();
            bootstrapDone.unsubscribe();
        }
    };
}
/**
 * A subject used to indicate that the bootstrapping phase is done. When initial navigation is
 * `enabledBlocking`, the first navigation waits until bootstrapping is finished before continuing
 * to the activation phase.
 */
const BOOTSTRAP_DONE = new InjectionToken(typeof ngDevMode === 'undefined' || ngDevMode ? 'bootstrap done indicator' : '', {
    factory: () => {
        return new Subject();
    },
});
const INITIAL_NAVIGATION = new InjectionToken(typeof ngDevMode === 'undefined' || ngDevMode ? 'initial navigation' : '', { providedIn: 'root', factory: () => 1 /* InitialNavigation.EnabledNonBlocking */ });
/**
 * Configures initial navigation to start before the root component is created.
 *
 * The bootstrap is blocked until the initial navigation is complete. This should be set in case
 * you use [server-side rendering](guide/ssr), but do not enable [hydration](guide/hydration) for
 * your application.
 *
 * @usageNotes
 *
 * Basic example of how you can enable this navigation behavior:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withEnabledBlockingInitialNavigation())
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 *
 * @publicApi
 * @returns A set of providers for use with `provideRouter`.
 */
function withEnabledBlockingInitialNavigation() {
    const providers = [
        { provide: INITIAL_NAVIGATION, useValue: 0 /* InitialNavigation.EnabledBlocking */ },
        provideAppInitializer(() => {
            const injector = inject(Injector);
            const locationInitialized = injector.get(LOCATION_INITIALIZED, Promise.resolve());
            return locationInitialized.then(() => {
                return new Promise((resolve) => {
                    const router = injector.get(Router);
                    const bootstrapDone = injector.get(BOOTSTRAP_DONE);
                    afterNextNavigation(router, () => {
                        // Unblock APP_INITIALIZER in case the initial navigation was canceled or errored
                        // without a redirect.
                        resolve(true);
                    });
                    injector.get(NavigationTransitions).afterPreactivation = () => {
                        // Unblock APP_INITIALIZER once we get to `afterPreactivation`. At this point, we
                        // assume activation will complete successfully (even though this is not
                        // guaranteed).
                        resolve(true);
                        return bootstrapDone.closed ? of(void 0) : bootstrapDone;
                    };
                    router.initialNavigation();
                });
            });
        }),
    ];
    return routerFeature(2 /* RouterFeatureKind.EnabledBlockingInitialNavigationFeature */, providers);
}
/**
 * Disables initial navigation.
 *
 * Use if there is a reason to have more control over when the router starts its initial navigation
 * due to some complex initialization logic.
 *
 * @usageNotes
 *
 * Basic example of how you can disable initial navigation:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withDisabledInitialNavigation())
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
function withDisabledInitialNavigation() {
    const providers = [
        provideAppInitializer(() => {
            inject(Router).setUpLocationChangeListener();
        }),
        { provide: INITIAL_NAVIGATION, useValue: 2 /* InitialNavigation.Disabled */ },
    ];
    return routerFeature(3 /* RouterFeatureKind.DisabledInitialNavigationFeature */, providers);
}
/**
 * Enables logging of all internal navigation events to the console.
 * Extra logging might be useful for debugging purposes to inspect Router event sequence.
 *
 * @usageNotes
 *
 * Basic example of how you can enable debug tracing:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withDebugTracing())
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
function withDebugTracing() {
    let providers = [];
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
        providers = [
            {
                provide: ENVIRONMENT_INITIALIZER,
                multi: true,
                useFactory: () => {
                    const router = inject(Router);
                    return () => router.events.subscribe((e) => {
                        // tslint:disable:no-console
                        console.group?.(`Router Event: ${e.constructor.name}`);
                        console.log(stringifyEvent(e));
                        console.log(e);
                        console.groupEnd?.();
                        // tslint:enable:no-console
                    });
                },
            },
        ];
    }
    else {
        providers = [];
    }
    return routerFeature(1 /* RouterFeatureKind.DebugTracingFeature */, providers);
}
const ROUTER_PRELOADER = new InjectionToken(typeof ngDevMode === 'undefined' || ngDevMode ? 'router preloader' : '');
/**
 * Allows to configure a preloading strategy to use. The strategy is configured by providing a
 * reference to a class that implements a `PreloadingStrategy`.
 *
 * @usageNotes
 *
 * Basic example of how you can configure preloading:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withPreloading(PreloadAllModules))
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 *
 * @param preloadingStrategy A reference to a class that implements a `PreloadingStrategy` that
 *     should be used.
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
function withPreloading(preloadingStrategy) {
    const providers = [
        { provide: ROUTER_PRELOADER, useExisting: RouterPreloader },
        { provide: PreloadingStrategy, useExisting: preloadingStrategy },
    ];
    return routerFeature(0 /* RouterFeatureKind.PreloadingFeature */, providers);
}
/**
 * Allows to provide extra parameters to configure Router.
 *
 * @usageNotes
 *
 * Basic example of how you can provide extra configuration options:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withRouterConfig({
 *          onSameUrlNavigation: 'reload'
 *       }))
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 *
 * @param options A set of parameters to configure Router, see `RouterConfigOptions` for
 *     additional information.
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
function withRouterConfig(options) {
    const providers = [{ provide: ROUTER_CONFIGURATION, useValue: options }];
    return routerFeature(5 /* RouterFeatureKind.RouterConfigurationFeature */, providers);
}
/**
 * Provides the location strategy that uses the URL fragment instead of the history API.
 *
 * @usageNotes
 *
 * Basic example of how you can use the hash location option:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withHashLocation())
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link provideRouter}
 * @see {@link /api/common/HashLocationStrategy HashLocationStrategy}
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
function withHashLocation() {
    const providers = [{ provide: LocationStrategy, useClass: HashLocationStrategy }];
    return routerFeature(6 /* RouterFeatureKind.RouterHashLocationFeature */, providers);
}
/**
 * Provides a function which is called when a navigation error occurs.
 *
 * This function is run inside application's [injection context](guide/di/dependency-injection-context)
 * so you can use the [`inject`](api/core/inject) function.
 *
 * This function can return a `RedirectCommand` to convert the error to a redirect, similar to returning
 * a `UrlTree` or `RedirectCommand` from a guard. This will also prevent the `Router` from emitting
 * `NavigationError`; it will instead emit `NavigationCancel` with code NavigationCancellationCode.Redirect.
 * Return values other than `RedirectCommand` are ignored and do not change any behavior with respect to
 * how the `Router` handles the error.
 *
 * @usageNotes
 *
 * Basic example of how you can use the error handler option:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withNavigationErrorHandler((e: NavigationError) =>
 * inject(MyErrorTracker).trackError(e)))
 *     ]
 *   }
 * );
 * ```
 *
 * @see {@link NavigationError}
 * @see {@link /api/core/inject inject}
 * @see {@link runInInjectionContext}
 *
 * @returns A set of providers for use with `provideRouter`.
 *
 * @publicApi
 */
function withNavigationErrorHandler(handler) {
    const providers = [
        {
            provide: NAVIGATION_ERROR_HANDLER,
            useValue: handler,
        },
    ];
    return routerFeature(7 /* RouterFeatureKind.NavigationErrorHandlerFeature */, providers);
}
/**
 * Enables binding information from the `Router` state directly to the inputs of the component in
 * `Route` configurations.
 *
 * @usageNotes
 *
 * Basic example of how you can enable the feature:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withComponentInputBinding())
 *     ]
 *   }
 * );
 * ```
 *
 * The router bindings information from any of the following sources:
 *
 *  - query parameters
 *  - path and matrix parameters
 *  - static route data
 *  - data from resolvers
 *
 * Duplicate keys are resolved in the same order from above, from least to greatest,
 * meaning that resolvers have the highest precedence and override any of the other information
 * from the route.
 *
 * Importantly, when an input does not have an item in the route data with a matching key, this
 * input is set to `undefined`. This prevents previous information from being
 * retained if the data got removed from the route (i.e. if a query parameter is removed).
 * Default values can be provided with a resolver on the route to ensure the value is always present
 * or an input and use an input transform in the component.
 *
 * @see {@link /guide/components/inputs#input-transforms Input Transforms}
 * @returns A set of providers for use with `provideRouter`.
 */
function withComponentInputBinding() {
    const providers = [
        RoutedComponentInputBinder,
        { provide: INPUT_BINDER, useExisting: RoutedComponentInputBinder },
    ];
    return routerFeature(8 /* RouterFeatureKind.ComponentInputBindingFeature */, providers);
}
/**
 * Enables view transitions in the Router by running the route activation and deactivation inside of
 * `document.startViewTransition`.
 *
 * Note: The View Transitions API is not available in all browsers. If the browser does not support
 * view transitions, the Router will not attempt to start a view transition and continue processing
 * the navigation as usual.
 *
 * @usageNotes
 *
 * Basic example of how you can enable the feature:
 * ```ts
 * const appRoutes: Routes = [];
 * bootstrapApplication(AppComponent,
 *   {
 *     providers: [
 *       provideRouter(appRoutes, withViewTransitions())
 *     ]
 *   }
 * );
 * ```
 *
 * @returns A set of providers for use with `provideRouter`.
 * @see https://developer.chrome.com/docs/web-platform/view-transitions/
 * @see https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
 * @developerPreview
 */
function withViewTransitions(options) {
    _performanceMarkFeature('NgRouterViewTransitions');
    const providers = [
        { provide: CREATE_VIEW_TRANSITION, useValue: createViewTransition },
        {
            provide: VIEW_TRANSITION_OPTIONS,
            useValue: { skipNextTransition: !!options?.skipInitialTransition, ...options },
        },
    ];
    return routerFeature(9 /* RouterFeatureKind.ViewTransitionsFeature */, providers);
}

/**
 * The directives defined in the `RouterModule`.
 */
const ROUTER_DIRECTIVES = [RouterOutlet, RouterLink, RouterLinkActive, _EmptyOutletComponent];
/**
 * @docsNotRequired
 */
const ROUTER_FORROOT_GUARD = new InjectionToken(typeof ngDevMode === 'undefined' || ngDevMode ? 'router duplicate forRoot guard' : '');
// TODO(atscott): All of these except `ActivatedRoute` are `providedIn: 'root'`. They are only kept
// here to avoid a breaking change whereby the provider order matters based on where the
// `RouterModule`/`RouterTestingModule` is imported. These can/should be removed as a "breaking"
// change in a major version.
const ROUTER_PROVIDERS = [
    Location,
    { provide: UrlSerializer, useClass: DefaultUrlSerializer },
    Router,
    ChildrenOutletContexts,
    { provide: ActivatedRoute, useFactory: rootRoute, deps: [Router] },
    RouterConfigLoader,
    // Only used to warn when `provideRoutes` is used without `RouterModule` or `provideRouter`. Can
    // be removed when `provideRoutes` is removed.
    typeof ngDevMode === 'undefined' || ngDevMode
        ? { provide: ROUTER_IS_PROVIDED, useValue: true }
        : [],
];
/**
 * @description
 *
 * Adds directives and providers for in-app navigation among views defined in an application.
 * Use the Angular `Router` service to declaratively specify application states and manage state
 * transitions.
 *
 * You can import this NgModule multiple times, once for each lazy-loaded bundle.
 * However, only one `Router` service can be active.
 * To ensure this, there are two ways to register routes when importing this module:
 *
 * * The `forRoot()` method creates an `NgModule` that contains all the directives, the given
 * routes, and the `Router` service itself.
 * * The `forChild()` method creates an `NgModule` that contains all the directives and the given
 * routes, but does not include the `Router` service.
 *
 * @see [Routing and Navigation guide](guide/routing/common-router-tasks) for an
 * overview of how the `Router` service should be used.
 *
 * @publicApi
 */
class RouterModule {
    constructor() {
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
            inject(ROUTER_FORROOT_GUARD, { optional: true });
        }
    }
    /**
     * Creates and configures a module with all the router providers and directives.
     * Optionally sets up an application listener to perform an initial navigation.
     *
     * When registering the NgModule at the root, import as follows:
     *
     * ```ts
     * @NgModule({
     *   imports: [RouterModule.forRoot(ROUTES)]
     * })
     * class MyNgModule {}
     * ```
     *
     * @param routes An array of `Route` objects that define the navigation paths for the application.
     * @param config An `ExtraOptions` configuration object that controls how navigation is performed.
     * @return The new `NgModule`.
     *
     */
    static forRoot(routes, config) {
        return {
            ngModule: RouterModule,
            providers: [
                ROUTER_PROVIDERS,
                typeof ngDevMode === 'undefined' || ngDevMode
                    ? config?.enableTracing
                        ? withDebugTracing().ɵproviders
                        : []
                    : [],
                { provide: ROUTES, multi: true, useValue: routes },
                typeof ngDevMode === 'undefined' || ngDevMode
                    ? {
                        provide: ROUTER_FORROOT_GUARD,
                        useFactory: provideForRootGuard,
                        deps: [[Router, new Optional(), new SkipSelf()]],
                    }
                    : [],
                config?.errorHandler
                    ? {
                        provide: NAVIGATION_ERROR_HANDLER,
                        useValue: config.errorHandler,
                    }
                    : [],
                { provide: ROUTER_CONFIGURATION, useValue: config ? config : {} },
                config?.useHash ? provideHashLocationStrategy() : providePathLocationStrategy(),
                provideRouterScroller(),
                config?.preloadingStrategy ? withPreloading(config.preloadingStrategy).ɵproviders : [],
                config?.initialNavigation ? provideInitialNavigation(config) : [],
                config?.bindToComponentInputs ? withComponentInputBinding().ɵproviders : [],
                config?.enableViewTransitions ? withViewTransitions().ɵproviders : [],
                provideRouterInitializer(),
            ],
        };
    }
    /**
     * Creates a module with all the router directives and a provider registering routes,
     * without creating a new Router service.
     * When registering for submodules and lazy-loaded submodules, create the NgModule as follows:
     *
     * ```ts
     * @NgModule({
     *   imports: [RouterModule.forChild(ROUTES)]
     * })
     * class MyNgModule {}
     * ```
     *
     * @param routes An array of `Route` objects that define the navigation paths for the submodule.
     * @return The new NgModule.
     *
     */
    static forChild(routes) {
        return {
            ngModule: RouterModule,
            providers: [{ provide: ROUTES, multi: true, useValue: routes }],
        };
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: RouterModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
    static ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: RouterModule, imports: [RouterOutlet, RouterLink, RouterLinkActive, _EmptyOutletComponent], exports: [RouterOutlet, RouterLink, RouterLinkActive, _EmptyOutletComponent] });
    static ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: RouterModule });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.0.0-next.7+sha-e53a374", ngImport: i0, type: RouterModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: ROUTER_DIRECTIVES,
                    exports: ROUTER_DIRECTIVES,
                }]
        }], ctorParameters: () => [] });
/**
 * For internal use by `RouterModule` only. Note that this differs from `withInMemoryRouterScroller`
 * because it reads from the `ExtraOptions` which should not be used in the standalone world.
 */
function provideRouterScroller() {
    return {
        provide: ROUTER_SCROLLER,
        useFactory: () => {
            const viewportScroller = inject(ViewportScroller);
            const zone = inject(NgZone);
            const config = inject(ROUTER_CONFIGURATION);
            const transitions = inject(NavigationTransitions);
            const urlSerializer = inject(UrlSerializer);
            if (config.scrollOffset) {
                viewportScroller.setOffset(config.scrollOffset);
            }
            return new RouterScroller(urlSerializer, transitions, viewportScroller, zone, config);
        },
    };
}
// Note: For internal use only with `RouterModule`. Standalone setup via `provideRouter` should
// provide hash location directly via `{provide: LocationStrategy, useClass: HashLocationStrategy}`.
function provideHashLocationStrategy() {
    return { provide: LocationStrategy, useClass: HashLocationStrategy };
}
// Note: For internal use only with `RouterModule`. Standalone setup via `provideRouter` does not
// need this at all because `PathLocationStrategy` is the default factory for `LocationStrategy`.
function providePathLocationStrategy() {
    return { provide: LocationStrategy, useClass: PathLocationStrategy };
}
function provideForRootGuard(router) {
    if (router) {
        throw new _RuntimeError(4007 /* RuntimeErrorCode.FOR_ROOT_CALLED_TWICE */, `The Router was provided more than once. This can happen if 'forRoot' is used outside of the root injector.` +
            ` Lazy loaded modules should use RouterModule.forChild() instead.`);
    }
    return 'guarded';
}
// Note: For internal use only with `RouterModule`. Standalone router setup with `provideRouter`
// users call `withXInitialNavigation` directly.
function provideInitialNavigation(config) {
    return [
        config.initialNavigation === 'disabled' ? withDisabledInitialNavigation().ɵproviders : [],
        config.initialNavigation === 'enabledBlocking'
            ? withEnabledBlockingInitialNavigation().ɵproviders
            : [],
    ];
}
// TODO(atscott): This should not be in the public API
/**
 * A DI token for the router initializer that
 * is called after the app is bootstrapped.
 *
 * @publicApi
 */
const ROUTER_INITIALIZER = new InjectionToken(typeof ngDevMode === 'undefined' || ngDevMode ? 'Router Initializer' : '');
function provideRouterInitializer() {
    return [
        // ROUTER_INITIALIZER token should be removed. It's public API but shouldn't be. We can just
        // have `getBootstrapListener` directly attached to APP_BOOTSTRAP_LISTENER.
        { provide: ROUTER_INITIALIZER, useFactory: getBootstrapListener },
        { provide: APP_BOOTSTRAP_LISTENER, multi: true, useExisting: ROUTER_INITIALIZER },
    ];
}

export { NoPreloading, PreloadAllModules, PreloadingStrategy, ROUTER_INITIALIZER, ROUTER_PROVIDERS, RouterLink, RouterLinkActive, RouterModule, RouterPreloader, provideRouter, provideRoutes, withComponentInputBinding, withDebugTracing, withDisabledInitialNavigation, withEnabledBlockingInitialNavigation, withHashLocation, withInMemoryScrolling, withNavigationErrorHandler, withPreloading, withRouterConfig, withViewTransitions };
//# sourceMappingURL=router_module-CKwWQXvk.mjs.map
