/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { AfterContentInit, OnChanges, OnDestroy } from '@angular/core';
export declare class RouterLinkActive implements OnChanges, OnDestroy, AfterContentInit {
    private router;
    private element;
    private renderer;
    private links;
    private classes;
    private subscription;
    private routerLinkActiveOptions;
    ngAfterContentInit(): void;
    routerLinkActive: string[] | string;
    ngOnChanges(changes: {}): any;
    ngOnDestroy(): any;
    private update();
}
