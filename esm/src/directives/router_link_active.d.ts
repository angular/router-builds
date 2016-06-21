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
