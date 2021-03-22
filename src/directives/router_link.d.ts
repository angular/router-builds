/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { LocationStrategy } from '@angular/common';
import { ElementRef, OnChanges, OnDestroy, Renderer2, SimpleChanges } from '@angular/core';
import { QueryParamsHandling } from '../config';
import { Router } from '../router';
import { ActivatedRoute } from '../router_state';
import { Params } from '../shared';
import { UrlTree } from '../url_tree';
import * as i0 from "@angular/core";
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
 * Multiple static segments can be merged into one term and combined with dynamic segements.
 * For example, `['/team/11/user', userName, {details: true}]`
 *
 * The input that you provide to the link is treated as a delta to the current URL.
 * For instance, suppose the current URL is `/user/(box//aux:team)`.
 * The link `<a [routerLink]="['/user/jim']">Jim</a>` creates the URL
 * `/user/(jim//aux:team)`.
 * See {@link Router#createUrlTree createUrlTree} for more information.
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
 * ```
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
 * ```
 * <a [routerLink]="['/user/bob']" [queryParams]="{debug: true}" queryParamsHandling="merge">
 *   link to user component
 * </a>
 * ```
 *
 * See {@link UrlCreationOptions.queryParamsHandling UrlCreationOptions#queryParamsHandling}.
 *
 * ### Preserving navigation history
 *
 * You can provide a `state` value to be persisted to the browser's
 * [`History.state` property](https://developer.mozilla.org/en-US/docs/Web/API/History#Properties).
 * For example:
 *
 * ```
 * <a [routerLink]="['/user/bob']" [state]="{tracingId: 123}">
 *   link to user component
 * </a>
 * ```
 *
 * Use {@link Router.getCurrentNavigation() Router#getCurrentNavigation} to retrieve a saved
 * navigation-state value. For example, to capture the `tracingId` during the `NavigationStart`
 * event:
 *
 * ```
 * // Get NavigationStart events
 * router.events.pipe(filter(e => e instanceof NavigationStart)).subscribe(e => {
 *   const navigation = router.getCurrentNavigation();
 *   tracingService.trace({id: navigation.extras.state.tracingId});
 * });
 * ```
 *
 * @ngModule RouterModule
 *
 * @publicApi
 */
export declare class RouterLink implements OnChanges {
    private router;
    private route;
    /**
     * Passed to {@link Router#createUrlTree Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * @see {@link UrlCreationOptions#queryParams UrlCreationOptions#queryParams}
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    queryParams?: Params | null;
    /**
     * Passed to {@link Router#createUrlTree Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * @see {@link UrlCreationOptions#fragment UrlCreationOptions#fragment}
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    fragment?: string;
    /**
     * Passed to {@link Router#createUrlTree Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * @see {@link UrlCreationOptions#queryParamsHandling UrlCreationOptions#queryParamsHandling}
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    queryParamsHandling?: QueryParamsHandling | null;
    /**
     * Passed to {@link Router#createUrlTree Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * @see {@link UrlCreationOptions#preserveFragment UrlCreationOptions#preserveFragment}
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    preserveFragment: boolean;
    /**
     * Passed to {@link Router#navigateByUrl Router#navigateByUrl} as part of the
     * `NavigationBehaviorOptions`.
     * @see {@link NavigationBehaviorOptions#skipLocationChange NavigationBehaviorOptions#skipLocationChange}
     * @see {@link Router#navigateByUrl Router#navigateByUrl}
     */
    skipLocationChange: boolean;
    /**
     * Passed to {@link Router#navigateByUrl Router#navigateByUrl} as part of the
     * `NavigationBehaviorOptions`.
     * @see {@link NavigationBehaviorOptions#replaceUrl NavigationBehaviorOptions#replaceUrl}
     * @see {@link Router#navigateByUrl Router#navigateByUrl}
     */
    replaceUrl: boolean;
    /**
     * Passed to {@link Router#navigateByUrl Router#navigateByUrl} as part of the
     * `NavigationBehaviorOptions`.
     * @see {@link NavigationBehaviorOptions#state NavigationBehaviorOptions#state}
     * @see {@link Router#navigateByUrl Router#navigateByUrl}
     */
    state?: {
        [k: string]: any;
    };
    /**
     * Passed to {@link Router#createUrlTree Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * Specify a value here when you do not want to use the default value
     * for `routerLink`, which is the current activated route.
     * Note that a value of `undefined` here will use the `routerLink` default.
     * @see {@link UrlCreationOptions#relativeTo UrlCreationOptions#relativeTo}
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    relativeTo?: ActivatedRoute | null;
    private commands;
    private preserve;
    constructor(router: Router, route: ActivatedRoute, tabIndex: string, renderer: Renderer2, el: ElementRef);
    /** @nodoc */
    ngOnChanges(changes: SimpleChanges): void;
    /**
     * Commands to pass to {@link Router#createUrlTree Router#createUrlTree}.
     *   - **array**: commands to pass to {@link Router#createUrlTree Router#createUrlTree}.
     *   - **string**: shorthand for array of commands with just the string, i.e. `['/route']`
     *   - **null|undefined**: shorthand for an empty array of commands, i.e. `[]`
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    set routerLink(commands: any[] | string | null | undefined);
    /** @nodoc */
    onClick(): boolean;
    get urlTree(): UrlTree;
    static ɵfac: i0.ɵɵFactoryDeclaration<RouterLink, [null, null, { attribute: "tabindex"; }, null, null]>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<RouterLink, ":not(a):not(area)[routerLink]", never, { "queryParams": "queryParams"; "fragment": "fragment"; "queryParamsHandling": "queryParamsHandling"; "preserveFragment": "preserveFragment"; "skipLocationChange": "skipLocationChange"; "replaceUrl": "replaceUrl"; "state": "state"; "relativeTo": "relativeTo"; "routerLink": "routerLink"; }, {}, never>;
}
/**
 * @description
 *
 * Lets you link to specific routes in your app.
 *
 * See `RouterLink` for more information.
 *
 * @ngModule RouterModule
 *
 * @publicApi
 */
export declare class RouterLinkWithHref implements OnChanges, OnDestroy {
    private router;
    private route;
    private locationStrategy;
    target: string;
    /**
     * Passed to {@link Router#createUrlTree Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * @see {@link UrlCreationOptions#queryParams UrlCreationOptions#queryParams}
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    queryParams?: Params | null;
    /**
     * Passed to {@link Router#createUrlTree Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * @see {@link UrlCreationOptions#fragment UrlCreationOptions#fragment}
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    fragment?: string;
    /**
     * Passed to {@link Router#createUrlTree Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * @see {@link UrlCreationOptions#queryParamsHandling UrlCreationOptions#queryParamsHandling}
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    queryParamsHandling?: QueryParamsHandling | null;
    /**
     * Passed to {@link Router#createUrlTree Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * @see {@link UrlCreationOptions#preserveFragment UrlCreationOptions#preserveFragment}
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    preserveFragment: boolean;
    /**
     * Passed to {@link Router#navigateByUrl Router#navigateByUrl} as part of the
     * `NavigationBehaviorOptions`.
     * @see {@link NavigationBehaviorOptions#skipLocationChange NavigationBehaviorOptions#skipLocationChange}
     * @see {@link Router#navigateByUrl Router#navigateByUrl}
     */
    skipLocationChange: boolean;
    /**
     * Passed to {@link Router#navigateByUrl Router#navigateByUrl} as part of the
     * `NavigationBehaviorOptions`.
     * @see {@link NavigationBehaviorOptions#replaceUrl NavigationBehaviorOptions#replaceUrl}
     * @see {@link Router#navigateByUrl Router#navigateByUrl}
     */
    replaceUrl: boolean;
    /**
     * Passed to {@link Router#navigateByUrl Router#navigateByUrl} as part of the
     * `NavigationBehaviorOptions`.
     * @see {@link NavigationBehaviorOptions#state NavigationBehaviorOptions#state}
     * @see {@link Router#navigateByUrl Router#navigateByUrl}
     */
    state?: {
        [k: string]: any;
    };
    /**
     * Passed to {@link Router#createUrlTree Router#createUrlTree} as part of the
     * `UrlCreationOptions`.
     * Specify a value here when you do not want to use the default value
     * for `routerLink`, which is the current activated route.
     * Note that a value of `undefined` here will use the `routerLink` default.
     * @see {@link UrlCreationOptions#relativeTo UrlCreationOptions#relativeTo}
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    relativeTo?: ActivatedRoute | null;
    private commands;
    private subscription;
    private preserve;
    href: string;
    constructor(router: Router, route: ActivatedRoute, locationStrategy: LocationStrategy);
    /**
     * Commands to pass to {@link Router#createUrlTree Router#createUrlTree}.
     *   - **array**: commands to pass to {@link Router#createUrlTree Router#createUrlTree}.
     *   - **string**: shorthand for array of commands with just the string, i.e. `['/route']`
     *   - **null|undefined**: shorthand for an empty array of commands, i.e. `[]`
     * @see {@link Router#createUrlTree Router#createUrlTree}
     */
    set routerLink(commands: any[] | string | null | undefined);
    /** @nodoc */
    ngOnChanges(changes: SimpleChanges): any;
    /** @nodoc */
    ngOnDestroy(): any;
    /** @nodoc */
    onClick(button: number, ctrlKey: boolean, shiftKey: boolean, altKey: boolean, metaKey: boolean): boolean;
    private updateTargetUrlAndHref;
    get urlTree(): UrlTree;
    static ɵfac: i0.ɵɵFactoryDeclaration<RouterLinkWithHref, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<RouterLinkWithHref, "a[routerLink],area[routerLink]", never, { "target": "target"; "queryParams": "queryParams"; "fragment": "fragment"; "queryParamsHandling": "queryParamsHandling"; "preserveFragment": "preserveFragment"; "skipLocationChange": "skipLocationChange"; "replaceUrl": "replaceUrl"; "state": "state"; "relativeTo": "relativeTo"; "routerLink": "routerLink"; }, {}, never>;
}
