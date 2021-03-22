/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ViewportScroller } from '@angular/common';
import { OnDestroy } from '@angular/core';
import { Router } from './router';
import * as i0 from "@angular/core";
export declare class RouterScroller implements OnDestroy {
    private router;
    /** @docsNotRequired */ readonly viewportScroller: ViewportScroller;
    private options;
    private routerEventsSubscription;
    private scrollEventsSubscription;
    private lastId;
    private lastSource;
    private restoredId;
    private store;
    constructor(router: Router, 
    /** @docsNotRequired */ viewportScroller: ViewportScroller, options?: {
        scrollPositionRestoration?: 'disabled' | 'enabled' | 'top';
        anchorScrolling?: 'disabled' | 'enabled';
    });
    init(): void;
    private createScrollEvents;
    private consumeScrollEvents;
    private scheduleScrollEvent;
    /** @nodoc */
    ngOnDestroy(): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<RouterScroller, never>;
    static ɵprov: i0.ɵɵInjectableDef<RouterScroller>;
}
