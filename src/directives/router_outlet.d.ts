/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ChangeDetectorRef, ComponentFactoryResolver, ComponentRef, EventEmitter, OnDestroy, OnInit, ViewContainerRef } from '@angular/core';
import { Data } from '../config';
import { ChildrenOutletContexts } from '../router_outlet_context';
import { ActivatedRoute } from '../router_state';
import * as i0 from "@angular/core";
/**
 * An interface that defines the contract for developing a component outlet for the `Router`.
 *
 * An outlet acts as a placeholder that Angular dynamically fills based on the current router state.
 *
 * A router outlet should register itself with the `Router` via
 * `ChildrenOutletContexts#onChildOutletCreated` and unregister with
 * `ChildrenOutletContexts#onChildOutletDestroyed`. When the `Router` identifies a matched `Route`,
 * it looks for a registered outlet in the `ChildrenOutletContexts` and activates it.
 *
 * @see `ChildrenOutletContexts`
 * @publicApi
 */
export interface RouterOutletContract {
    /**
     * Whether the given outlet is activated.
     *
     * An outlet is considered "activated" if it has an active component.
     */
    isActivated: boolean;
    /** The instance of the activated component or `null` if the outlet is not activated. */
    component: Object | null;
    /**
     * The `Data` of the `ActivatedRoute` snapshot.
     */
    activatedRouteData: Data;
    /**
     * The `ActivatedRoute` for the outlet or `null` if the outlet is not activated.
     */
    activatedRoute: ActivatedRoute | null;
    /**
     * Called by the `Router` when the outlet should activate (create a component).
     */
    activateWith(activatedRoute: ActivatedRoute, resolver: ComponentFactoryResolver | null): void;
    /**
     * A request to destroy the currently activated component.
     *
     * When a `RouteReuseStrategy` indicates that an `ActivatedRoute` should be removed but stored for
     * later re-use rather than destroyed, the `Router` will call `detach` instead.
     */
    deactivate(): void;
    /**
     * Called when the `RouteReuseStrategy` instructs to detach the subtree.
     *
     * This is similar to `deactivate`, but the activated component should _not_ be destroyed.
     * Instead, it is returned so that it can be reattached later via the `attach` method.
     */
    detach(): ComponentRef<unknown>;
    /**
     * Called when the `RouteReuseStrategy` instructs to re-attach a previously detached subtree.
     */
    attach(ref: ComponentRef<unknown>, activatedRoute: ActivatedRoute): void;
}
/**
 * @description
 *
 * Acts as a placeholder that Angular dynamically fills based on the current router state.
 *
 * Each outlet can have a unique name, determined by the optional `name` attribute.
 * The name cannot be set or changed dynamically. If not set, default value is "primary".
 *
 * ```
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
 * and a deactivate event when a component is destroyed.
 *
 * ```
 * <router-outlet
 *   (activate)='onActivate($event)'
 *   (deactivate)='onDeactivate($event)'></router-outlet>
 * ```
 *
 * @see [Routing tutorial](guide/router-tutorial-toh#named-outlets "Example of a named
 * outlet and secondary route configuration").
 * @see `RouterLink`
 * @see `Route`
 * @ngModule RouterModule
 *
 * @publicApi
 */
export declare class RouterOutlet implements OnDestroy, OnInit, RouterOutletContract {
    private parentContexts;
    private location;
    private resolver;
    private changeDetector;
    private activated;
    private _activatedRoute;
    private name;
    activateEvents: EventEmitter<any>;
    deactivateEvents: EventEmitter<any>;
    constructor(parentContexts: ChildrenOutletContexts, location: ViewContainerRef, resolver: ComponentFactoryResolver, name: string, changeDetector: ChangeDetectorRef);
    /** @nodoc */
    ngOnDestroy(): void;
    /** @nodoc */
    ngOnInit(): void;
    get isActivated(): boolean;
    /**
     * @returns The currently activated component instance.
     * @throws An error if the outlet is not activated.
     */
    get component(): Object;
    get activatedRoute(): ActivatedRoute;
    get activatedRouteData(): Data;
    /**
     * Called when the `RouteReuseStrategy` instructs to detach the subtree
     */
    detach(): ComponentRef<any>;
    /**
     * Called when the `RouteReuseStrategy` instructs to re-attach a previously detached subtree
     */
    attach(ref: ComponentRef<any>, activatedRoute: ActivatedRoute): void;
    deactivate(): void;
    activateWith(activatedRoute: ActivatedRoute, resolver: ComponentFactoryResolver | null): void;
    static ɵfac: i0.ɵɵFactoryDef<RouterOutlet, [null, null, null, { attribute: "name"; }, null]>;
    static ɵdir: i0.ɵɵDirectiveDefWithMeta<RouterOutlet, "router-outlet", ["outlet"], {}, { "activateEvents": "activate"; "deactivateEvents": "deactivate"; }, never>;
}
