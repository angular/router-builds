import { Component } from '@angular/core';
import * as i0 from "@angular/core";
import * as i1 from "../directives/router_outlet";
/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * This component is used internally within the router to be a placeholder when an empty
 * router-outlet is needed. For example, with a config such as:
 *
 * `{path: 'parent', outlet: 'nav', children: [...]}`
 *
 * In order to render, there needs to be a component on this config, which will default
 * to this `EmptyOutletComponent`.
 */
export class EmptyOutletComponent {
}
EmptyOutletComponent.decorators = [
    { type: Component, args: [{ template: `<router-outlet></router-outlet>` },] },
];
EmptyOutletComponent.ngComponentDef = i0.ɵdefineComponent({ type: EmptyOutletComponent, selectors: [[""]], factory: function EmptyOutletComponent_Factory(t) { return new (t || EmptyOutletComponent)(); }, consts: 1, vars: 0, template: function EmptyOutletComponent_Template(rf, ctx) { if (rf & 1) {
        i0.ɵelement(0, "router-outlet");
    } }, directives: [i1.RouterOutlet] });
/*@__PURE__*/ i0.ɵsetClassMetadata(EmptyOutletComponent, [{
        type: Component,
        args: [{ template: `<router-outlet></router-outlet>` }]
    }], null, null);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1wdHlfb3V0bGV0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jb21wb25lbnRzL2VtcHR5X291dGxldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFRQSxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sZUFBZSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQVl4QyxNQUFNLE9BQU8sb0JBQW9COzs7WUFEaEMsU0FBUyxTQUFDLEVBQUMsUUFBUSxFQUFFLGlDQUFpQyxFQUFDOztrRUFDM0Msb0JBQW9CLDBGQUFwQixvQkFBb0I7OzttQ0FBcEIsb0JBQW9CO2NBRGhDLFNBQVM7ZUFBQyxFQUFDLFFBQVEsRUFBRSxpQ0FBaUMsRUFBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb21wb25lbnR9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG4vKipcbiAqIFRoaXMgY29tcG9uZW50IGlzIHVzZWQgaW50ZXJuYWxseSB3aXRoaW4gdGhlIHJvdXRlciB0byBiZSBhIHBsYWNlaG9sZGVyIHdoZW4gYW4gZW1wdHlcbiAqIHJvdXRlci1vdXRsZXQgaXMgbmVlZGVkLiBGb3IgZXhhbXBsZSwgd2l0aCBhIGNvbmZpZyBzdWNoIGFzOlxuICpcbiAqIGB7cGF0aDogJ3BhcmVudCcsIG91dGxldDogJ25hdicsIGNoaWxkcmVuOiBbLi4uXX1gXG4gKlxuICogSW4gb3JkZXIgdG8gcmVuZGVyLCB0aGVyZSBuZWVkcyB0byBiZSBhIGNvbXBvbmVudCBvbiB0aGlzIGNvbmZpZywgd2hpY2ggd2lsbCBkZWZhdWx0XG4gKiB0byB0aGlzIGBFbXB0eU91dGxldENvbXBvbmVudGAuXG4gKi9cbkBDb21wb25lbnQoe3RlbXBsYXRlOiBgPHJvdXRlci1vdXRsZXQ+PC9yb3V0ZXItb3V0bGV0PmB9KVxuZXhwb3J0IGNsYXNzIEVtcHR5T3V0bGV0Q29tcG9uZW50IHtcbn0iXX0=