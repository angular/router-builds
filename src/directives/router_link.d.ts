import { OnChanges } from '@angular/core';
import { UrlTree } from '../url_tree';
/**
 * The RouterLink directive lets you link to specific parts of your app.
 *
 * Consider the following route configuration:

 * ```
 * [{ path: '/user', component: UserCmp }]
 * ```
 *
 * When linking to this `User` route, you can write:
 *
 * ```
 * <a [routerLink]="['/user']">link to user component</a>
 * ```
 *
 * RouterLink expects the value to be an array of path segments, followed by the params
 * for that level of routing. For instance `['/team', {teamId: 1}, 'user', {userId: 2}]`
 * means that we want to generate a link to `/team;teamId=1/user;userId=2`.
 *
 * The first segment name can be prepended with `/`, `./`, or `../`.
 * If the segment begins with `/`, the router will look up the route from the root of the app.
 * If the segment begins with `./`, or doesn't begin with a slash, the router will
 * instead look in the current component's children for the route.
 * And if the segment begins with `../`, the router will go up one level.
 */
export declare class RouterLink implements OnChanges {
    private router;
    private route;
    private locationStrategy;
    target: string;
    private commands;
    queryParams: {
        [k: string]: any;
    };
    fragment: string;
    href: string;
    urlTree: UrlTree;
    routerLink: any[] | string;
    ngOnChanges(changes: {}): any;
    onClick(button: number, ctrlKey: boolean, metaKey: boolean): boolean;
    private updateTargetUrlAndHref();
}
