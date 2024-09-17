/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Component } from '@angular/core';
import { RouterOutlet } from '../directives/router_outlet';
import { PRIMARY_OUTLET } from '../shared';
import * as i0 from "@angular/core";
export { ɵEmptyOutletComponent as EmptyOutletComponent };
/**
 * This component is used internally within the router to be a placeholder when an empty
 * router-outlet is needed. For example, with a config such as:
 *
 * `{path: 'parent', outlet: 'nav', children: [...]}`
 *
 * In order to render, there needs to be a component on this config, which will default
 * to this `EmptyOutletComponent`.
 */
export class ɵEmptyOutletComponent {
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.4+sha-c0b4986", ngImport: i0, type: ɵEmptyOutletComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.2.4+sha-c0b4986", type: ɵEmptyOutletComponent, isStandalone: true, selector: "ng-component", ngImport: i0, template: `<router-outlet></router-outlet>`, isInline: true, dependencies: [{ kind: "directive", type: RouterOutlet, selector: "router-outlet", inputs: ["name"], outputs: ["activate", "deactivate", "attach", "detach"], exportAs: ["outlet"] }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.4+sha-c0b4986", ngImport: i0, type: ɵEmptyOutletComponent, decorators: [{
            type: Component,
            args: [{
                    template: `<router-outlet></router-outlet>`,
                    imports: [RouterOutlet],
                    standalone: true,
                }]
        }] });
/**
 * Makes a copy of the config and adds any default required properties.
 */
export function standardizeConfig(r) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1wdHlfb3V0bGV0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jb21wb25lbnRzL2VtcHR5X291dGxldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBRXhDLE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSw2QkFBNkIsQ0FBQztBQUN6RCxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sV0FBVyxDQUFDOztBQUV6QyxPQUFPLEVBQUMscUJBQXFCLElBQUksb0JBQW9CLEVBQUMsQ0FBQztBQUV2RDs7Ozs7Ozs7R0FRRztBQU1ILE1BQU0sT0FBTyxxQkFBcUI7eUhBQXJCLHFCQUFxQjs2R0FBckIscUJBQXFCLHdFQUp0QixpQ0FBaUMsNERBQ2pDLFlBQVk7O3NHQUdYLHFCQUFxQjtrQkFMakMsU0FBUzttQkFBQztvQkFDVCxRQUFRLEVBQUUsaUNBQWlDO29CQUMzQyxPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUM7b0JBQ3ZCLFVBQVUsRUFBRSxJQUFJO2lCQUNqQjs7QUFHRDs7R0FFRztBQUNILE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxDQUFRO0lBQ3hDLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNqRSxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUMsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsR0FBRyxDQUFDLEVBQUMsQ0FBQztJQUMvQyxJQUNFLENBQUMsQ0FBQyxDQUFDLFNBQVM7UUFDWixDQUFDLENBQUMsQ0FBQyxhQUFhO1FBQ2hCLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUM7UUFDNUIsQ0FBQyxDQUFDLE1BQU07UUFDUixDQUFDLENBQUMsTUFBTSxLQUFLLGNBQWMsRUFDM0IsQ0FBQztRQUNELENBQUMsQ0FBQyxTQUFTLEdBQUcscUJBQXFCLENBQUM7SUFDdEMsQ0FBQztJQUNELE9BQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbXBvbmVudH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7Um91dGVyT3V0bGV0fSBmcm9tICcuLi9kaXJlY3RpdmVzL3JvdXRlcl9vdXRsZXQnO1xuaW1wb3J0IHtQUklNQVJZX09VVExFVH0gZnJvbSAnLi4vc2hhcmVkJztcbmltcG9ydCB7Um91dGV9IGZyb20gJy4uL21vZGVscyc7XG5leHBvcnQge8m1RW1wdHlPdXRsZXRDb21wb25lbnQgYXMgRW1wdHlPdXRsZXRDb21wb25lbnR9O1xuXG4vKipcbiAqIFRoaXMgY29tcG9uZW50IGlzIHVzZWQgaW50ZXJuYWxseSB3aXRoaW4gdGhlIHJvdXRlciB0byBiZSBhIHBsYWNlaG9sZGVyIHdoZW4gYW4gZW1wdHlcbiAqIHJvdXRlci1vdXRsZXQgaXMgbmVlZGVkLiBGb3IgZXhhbXBsZSwgd2l0aCBhIGNvbmZpZyBzdWNoIGFzOlxuICpcbiAqIGB7cGF0aDogJ3BhcmVudCcsIG91dGxldDogJ25hdicsIGNoaWxkcmVuOiBbLi4uXX1gXG4gKlxuICogSW4gb3JkZXIgdG8gcmVuZGVyLCB0aGVyZSBuZWVkcyB0byBiZSBhIGNvbXBvbmVudCBvbiB0aGlzIGNvbmZpZywgd2hpY2ggd2lsbCBkZWZhdWx0XG4gKiB0byB0aGlzIGBFbXB0eU91dGxldENvbXBvbmVudGAuXG4gKi9cbkBDb21wb25lbnQoe1xuICB0ZW1wbGF0ZTogYDxyb3V0ZXItb3V0bGV0Pjwvcm91dGVyLW91dGxldD5gLFxuICBpbXBvcnRzOiBbUm91dGVyT3V0bGV0XSxcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbn0pXG5leHBvcnQgY2xhc3MgybVFbXB0eU91dGxldENvbXBvbmVudCB7fVxuXG4vKipcbiAqIE1ha2VzIGEgY29weSBvZiB0aGUgY29uZmlnIGFuZCBhZGRzIGFueSBkZWZhdWx0IHJlcXVpcmVkIHByb3BlcnRpZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGFuZGFyZGl6ZUNvbmZpZyhyOiBSb3V0ZSk6IFJvdXRlIHtcbiAgY29uc3QgY2hpbGRyZW4gPSByLmNoaWxkcmVuICYmIHIuY2hpbGRyZW4ubWFwKHN0YW5kYXJkaXplQ29uZmlnKTtcbiAgY29uc3QgYyA9IGNoaWxkcmVuID8gey4uLnIsIGNoaWxkcmVufSA6IHsuLi5yfTtcbiAgaWYgKFxuICAgICFjLmNvbXBvbmVudCAmJlxuICAgICFjLmxvYWRDb21wb25lbnQgJiZcbiAgICAoY2hpbGRyZW4gfHwgYy5sb2FkQ2hpbGRyZW4pICYmXG4gICAgYy5vdXRsZXQgJiZcbiAgICBjLm91dGxldCAhPT0gUFJJTUFSWV9PVVRMRVRcbiAgKSB7XG4gICAgYy5jb21wb25lbnQgPSDJtUVtcHR5T3V0bGV0Q29tcG9uZW50O1xuICB9XG4gIHJldHVybiBjO1xufVxuIl19