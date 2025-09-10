/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.13+sha-08f01ac", ngImport: i0, type: ɵEmptyOutletComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.2.13+sha-08f01ac", type: ɵEmptyOutletComponent, isStandalone: true, selector: "ng-component", ngImport: i0, template: `<router-outlet></router-outlet>`, isInline: true, dependencies: [{ kind: "directive", type: RouterOutlet, selector: "router-outlet", inputs: ["name"], outputs: ["activate", "deactivate", "attach", "detach"], exportAs: ["outlet"] }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.13+sha-08f01ac", ngImport: i0, type: ɵEmptyOutletComponent, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1wdHlfb3V0bGV0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jb21wb25lbnRzL2VtcHR5X291dGxldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBRXhDLE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSw2QkFBNkIsQ0FBQztBQUN6RCxPQUFPLEVBQUMsY0FBYyxFQUFDLE1BQU0sV0FBVyxDQUFDOztBQUV6QyxPQUFPLEVBQUMscUJBQXFCLElBQUksb0JBQW9CLEVBQUMsQ0FBQztBQUV2RDs7Ozs7Ozs7R0FRRztBQU1ILE1BQU0sT0FBTyxxQkFBcUI7eUhBQXJCLHFCQUFxQjs2R0FBckIscUJBQXFCLHdFQUp0QixpQ0FBaUMsNERBQ2pDLFlBQVk7O3NHQUdYLHFCQUFxQjtrQkFMakMsU0FBUzttQkFBQztvQkFDVCxRQUFRLEVBQUUsaUNBQWlDO29CQUMzQyxPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUM7b0JBQ3ZCLFVBQVUsRUFBRSxJQUFJO2lCQUNqQjs7QUFHRDs7R0FFRztBQUNILE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxDQUFRO0lBQ3hDLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNqRSxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUMsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsR0FBRyxDQUFDLEVBQUMsQ0FBQztJQUMvQyxJQUNFLENBQUMsQ0FBQyxDQUFDLFNBQVM7UUFDWixDQUFDLENBQUMsQ0FBQyxhQUFhO1FBQ2hCLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUM7UUFDNUIsQ0FBQyxDQUFDLE1BQU07UUFDUixDQUFDLENBQUMsTUFBTSxLQUFLLGNBQWMsRUFDM0IsQ0FBQztRQUNELENBQUMsQ0FBQyxTQUFTLEdBQUcscUJBQXFCLENBQUM7SUFDdEMsQ0FBQztJQUNELE9BQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmRldi9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb21wb25lbnR9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQge1JvdXRlck91dGxldH0gZnJvbSAnLi4vZGlyZWN0aXZlcy9yb3V0ZXJfb3V0bGV0JztcbmltcG9ydCB7UFJJTUFSWV9PVVRMRVR9IGZyb20gJy4uL3NoYXJlZCc7XG5pbXBvcnQge1JvdXRlfSBmcm9tICcuLi9tb2RlbHMnO1xuZXhwb3J0IHvJtUVtcHR5T3V0bGV0Q29tcG9uZW50IGFzIEVtcHR5T3V0bGV0Q29tcG9uZW50fTtcblxuLyoqXG4gKiBUaGlzIGNvbXBvbmVudCBpcyB1c2VkIGludGVybmFsbHkgd2l0aGluIHRoZSByb3V0ZXIgdG8gYmUgYSBwbGFjZWhvbGRlciB3aGVuIGFuIGVtcHR5XG4gKiByb3V0ZXItb3V0bGV0IGlzIG5lZWRlZC4gRm9yIGV4YW1wbGUsIHdpdGggYSBjb25maWcgc3VjaCBhczpcbiAqXG4gKiBge3BhdGg6ICdwYXJlbnQnLCBvdXRsZXQ6ICduYXYnLCBjaGlsZHJlbjogWy4uLl19YFxuICpcbiAqIEluIG9yZGVyIHRvIHJlbmRlciwgdGhlcmUgbmVlZHMgdG8gYmUgYSBjb21wb25lbnQgb24gdGhpcyBjb25maWcsIHdoaWNoIHdpbGwgZGVmYXVsdFxuICogdG8gdGhpcyBgRW1wdHlPdXRsZXRDb21wb25lbnRgLlxuICovXG5AQ29tcG9uZW50KHtcbiAgdGVtcGxhdGU6IGA8cm91dGVyLW91dGxldD48L3JvdXRlci1vdXRsZXQ+YCxcbiAgaW1wb3J0czogW1JvdXRlck91dGxldF0sXG4gIHN0YW5kYWxvbmU6IHRydWUsXG59KVxuZXhwb3J0IGNsYXNzIMm1RW1wdHlPdXRsZXRDb21wb25lbnQge31cblxuLyoqXG4gKiBNYWtlcyBhIGNvcHkgb2YgdGhlIGNvbmZpZyBhbmQgYWRkcyBhbnkgZGVmYXVsdCByZXF1aXJlZCBwcm9wZXJ0aWVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RhbmRhcmRpemVDb25maWcocjogUm91dGUpOiBSb3V0ZSB7XG4gIGNvbnN0IGNoaWxkcmVuID0gci5jaGlsZHJlbiAmJiByLmNoaWxkcmVuLm1hcChzdGFuZGFyZGl6ZUNvbmZpZyk7XG4gIGNvbnN0IGMgPSBjaGlsZHJlbiA/IHsuLi5yLCBjaGlsZHJlbn0gOiB7Li4ucn07XG4gIGlmIChcbiAgICAhYy5jb21wb25lbnQgJiZcbiAgICAhYy5sb2FkQ29tcG9uZW50ICYmXG4gICAgKGNoaWxkcmVuIHx8IGMubG9hZENoaWxkcmVuKSAmJlxuICAgIGMub3V0bGV0ICYmXG4gICAgYy5vdXRsZXQgIT09IFBSSU1BUllfT1VUTEVUXG4gICkge1xuICAgIGMuY29tcG9uZW50ID0gybVFbXB0eU91dGxldENvbXBvbmVudDtcbiAgfVxuICByZXR1cm4gYztcbn1cbiJdfQ==