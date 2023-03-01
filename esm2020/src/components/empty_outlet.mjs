/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Component } from '@angular/core';
import { RouterOutlet } from '../directives/router_outlet';
import * as i0 from "@angular/core";
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
}
ɵEmptyOutletComponent.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0-next.1+sha-6d9e979", ngImport: i0, type: ɵEmptyOutletComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
ɵEmptyOutletComponent.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "16.0.0-next.1+sha-6d9e979", type: ɵEmptyOutletComponent, isStandalone: true, selector: "ng-component", ngImport: i0, template: `<router-outlet></router-outlet>`, isInline: true, dependencies: [{ kind: "directive", type: RouterOutlet, selector: "router-outlet", inputs: ["name"], outputs: ["activate", "deactivate", "attach", "detach"], exportAs: ["outlet"] }] });
export { ɵEmptyOutletComponent };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0-next.1+sha-6d9e979", ngImport: i0, type: ɵEmptyOutletComponent, decorators: [{
            type: Component,
            args: [{
                    template: `<router-outlet></router-outlet>`,
                    imports: [RouterOutlet],
                    standalone: true,
                }]
        }] });
export { ɵEmptyOutletComponent as EmptyOutletComponent };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1wdHlfb3V0bGV0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jb21wb25lbnRzL2VtcHR5X291dGxldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBRXhDLE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSw2QkFBNkIsQ0FBQzs7QUFFekQ7Ozs7Ozs7O0dBUUc7QUFDSCxNQUthLHFCQUFxQjs7NkhBQXJCLHFCQUFxQjtpSEFBckIscUJBQXFCLHdFQUp0QixpQ0FBaUMsNERBQ2pDLFlBQVk7U0FHWCxxQkFBcUI7c0dBQXJCLHFCQUFxQjtrQkFMakMsU0FBUzttQkFBQztvQkFDVCxRQUFRLEVBQUUsaUNBQWlDO29CQUMzQyxPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUM7b0JBQ3ZCLFVBQVUsRUFBRSxJQUFJO2lCQUNqQjs7QUFJRCxPQUFPLEVBQUMscUJBQXFCLElBQUksb0JBQW9CLEVBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbXBvbmVudH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7Um91dGVyT3V0bGV0fSBmcm9tICcuLi9kaXJlY3RpdmVzL3JvdXRlcl9vdXRsZXQnO1xuXG4vKipcbiAqIFRoaXMgY29tcG9uZW50IGlzIHVzZWQgaW50ZXJuYWxseSB3aXRoaW4gdGhlIHJvdXRlciB0byBiZSBhIHBsYWNlaG9sZGVyIHdoZW4gYW4gZW1wdHlcbiAqIHJvdXRlci1vdXRsZXQgaXMgbmVlZGVkLiBGb3IgZXhhbXBsZSwgd2l0aCBhIGNvbmZpZyBzdWNoIGFzOlxuICpcbiAqIGB7cGF0aDogJ3BhcmVudCcsIG91dGxldDogJ25hdicsIGNoaWxkcmVuOiBbLi4uXX1gXG4gKlxuICogSW4gb3JkZXIgdG8gcmVuZGVyLCB0aGVyZSBuZWVkcyB0byBiZSBhIGNvbXBvbmVudCBvbiB0aGlzIGNvbmZpZywgd2hpY2ggd2lsbCBkZWZhdWx0XG4gKiB0byB0aGlzIGBFbXB0eU91dGxldENvbXBvbmVudGAuXG4gKi9cbkBDb21wb25lbnQoe1xuICB0ZW1wbGF0ZTogYDxyb3V0ZXItb3V0bGV0Pjwvcm91dGVyLW91dGxldD5gLFxuICBpbXBvcnRzOiBbUm91dGVyT3V0bGV0XSxcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbn0pXG5leHBvcnQgY2xhc3MgybVFbXB0eU91dGxldENvbXBvbmVudCB7XG59XG5cbmV4cG9ydCB7ybVFbXB0eU91dGxldENvbXBvbmVudCBhcyBFbXB0eU91dGxldENvbXBvbmVudH07XG4iXX0=