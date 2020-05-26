/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Component } from '@angular/core';
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
let ɵEmptyOutletComponent = /** @class */ (() => {
    class ɵEmptyOutletComponent {
    }
    ɵEmptyOutletComponent.ɵfac = function ɵEmptyOutletComponent_Factory(t) { return new (t || ɵEmptyOutletComponent)(); };
    ɵEmptyOutletComponent.ɵcmp = i0.ɵɵdefineComponent({ type: ɵEmptyOutletComponent, selectors: [["ng-component"]], decls: 1, vars: 0, template: function ɵEmptyOutletComponent_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵelement(0, "router-outlet");
        } }, encapsulation: 2 });
    return ɵEmptyOutletComponent;
})();
export { ɵEmptyOutletComponent };
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(ɵEmptyOutletComponent, [{
        type: Component,
        args: [{ template: `<router-outlet></router-outlet>` }]
    }], null, null); })();
export { ɵEmptyOutletComponent as EmptyOutletComponent };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1wdHlfb3V0bGV0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9jb21wb25lbnRzL2VtcHR5X291dGxldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sZUFBZSxDQUFDOztBQUV4Qzs7Ozs7Ozs7R0FRRztBQUNIO0lBQUEsTUFDYSxxQkFBcUI7OzhGQUFyQixxQkFBcUI7OERBQXJCLHFCQUFxQjtZQURYLGdDQUErQjs7Z0NBbkJ0RDtLQXFCQztTQURZLHFCQUFxQjtrREFBckIscUJBQXFCO2NBRGpDLFNBQVM7ZUFBQyxFQUFDLFFBQVEsRUFBRSxpQ0FBaUMsRUFBQzs7QUFJeEQsT0FBTyxFQUFDLHFCQUFxQixJQUFJLG9CQUFvQixFQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29tcG9uZW50fSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuLyoqXG4gKiBUaGlzIGNvbXBvbmVudCBpcyB1c2VkIGludGVybmFsbHkgd2l0aGluIHRoZSByb3V0ZXIgdG8gYmUgYSBwbGFjZWhvbGRlciB3aGVuIGFuIGVtcHR5XG4gKiByb3V0ZXItb3V0bGV0IGlzIG5lZWRlZC4gRm9yIGV4YW1wbGUsIHdpdGggYSBjb25maWcgc3VjaCBhczpcbiAqXG4gKiBge3BhdGg6ICdwYXJlbnQnLCBvdXRsZXQ6ICduYXYnLCBjaGlsZHJlbjogWy4uLl19YFxuICpcbiAqIEluIG9yZGVyIHRvIHJlbmRlciwgdGhlcmUgbmVlZHMgdG8gYmUgYSBjb21wb25lbnQgb24gdGhpcyBjb25maWcsIHdoaWNoIHdpbGwgZGVmYXVsdFxuICogdG8gdGhpcyBgRW1wdHlPdXRsZXRDb21wb25lbnRgLlxuICovXG5AQ29tcG9uZW50KHt0ZW1wbGF0ZTogYDxyb3V0ZXItb3V0bGV0Pjwvcm91dGVyLW91dGxldD5gfSlcbmV4cG9ydCBjbGFzcyDJtUVtcHR5T3V0bGV0Q29tcG9uZW50IHtcbn1cblxuZXhwb3J0IHvJtUVtcHR5T3V0bGV0Q29tcG9uZW50IGFzIEVtcHR5T3V0bGV0Q29tcG9uZW50fTtcbiJdfQ==