/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Component, Injectable, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, ɵafterNextNavigation as afterNextNavigation } from '@angular/router';
import * as i0 from "@angular/core";
export class RootFixtureService {
    createHarness() {
        if (this.harness) {
            throw new Error('Only one harness should be created per test.');
        }
        this.harness = new RouterTestingHarness(this.getRootFixture());
        return this.harness;
    }
    getRootFixture() {
        if (this.fixture !== undefined) {
            return this.fixture;
        }
        this.fixture = TestBed.createComponent(RootCmp);
        this.fixture.detectChanges();
        return this.fixture;
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.0-next.2+sha-914e453", ngImport: i0, type: RootFixtureService, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.0.0-next.2+sha-914e453", ngImport: i0, type: RootFixtureService, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.0-next.2+sha-914e453", ngImport: i0, type: RootFixtureService, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
export class RootCmp {
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.0-next.2+sha-914e453", ngImport: i0, type: RootCmp, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.0.0-next.2+sha-914e453", type: RootCmp, isStandalone: true, selector: "ng-component", viewQueries: [{ propertyName: "outlet", first: true, predicate: RouterOutlet, descendants: true }], ngImport: i0, template: '<router-outlet></router-outlet>', isInline: true, dependencies: [{ kind: "directive", type: RouterOutlet, selector: "router-outlet", inputs: ["name"], outputs: ["activate", "deactivate", "attach", "detach"], exportAs: ["outlet"] }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.0-next.2+sha-914e453", ngImport: i0, type: RootCmp, decorators: [{
            type: Component,
            args: [{
                    standalone: true,
                    template: '<router-outlet></router-outlet>',
                    imports: [RouterOutlet],
                }]
        }], propDecorators: { outlet: [{
                type: ViewChild,
                args: [RouterOutlet]
            }] } });
/**
 * A testing harness for the `Router` to reduce the boilerplate needed to test routes and routed
 * components.
 *
 * @publicApi
 */
export class RouterTestingHarness {
    /**
     * Creates a `RouterTestingHarness` instance.
     *
     * The `RouterTestingHarness` also creates its own root component with a `RouterOutlet` for the
     * purposes of rendering route components.
     *
     * Throws an error if an instance has already been created.
     * Use of this harness also requires `destroyAfterEach: true` in the `ModuleTeardownOptions`
     *
     * @param initialUrl The target of navigation to trigger before returning the harness.
     */
    static async create(initialUrl) {
        const harness = TestBed.inject(RootFixtureService).createHarness();
        if (initialUrl !== undefined) {
            await harness.navigateByUrl(initialUrl);
        }
        return harness;
    }
    /** @internal */
    constructor(fixture) {
        this.fixture = fixture;
    }
    /** Instructs the root fixture to run change detection. */
    detectChanges() {
        this.fixture.detectChanges();
    }
    /** The `DebugElement` of the `RouterOutlet` component. `null` if the outlet is not activated. */
    get routeDebugElement() {
        const outlet = this.fixture.componentInstance.outlet;
        if (!outlet || !outlet.isActivated) {
            return null;
        }
        return this.fixture.debugElement.query((v) => v.componentInstance === outlet.component);
    }
    /** The native element of the `RouterOutlet` component. `null` if the outlet is not activated. */
    get routeNativeElement() {
        return this.routeDebugElement?.nativeElement ?? null;
    }
    async navigateByUrl(url, requiredRoutedComponentType) {
        const router = TestBed.inject(Router);
        let resolveFn;
        const redirectTrackingPromise = new Promise((resolve) => {
            resolveFn = resolve;
        });
        afterNextNavigation(TestBed.inject(Router), resolveFn);
        await router.navigateByUrl(url);
        await redirectTrackingPromise;
        this.fixture.detectChanges();
        const outlet = this.fixture.componentInstance.outlet;
        // The outlet might not be activated if the user is testing a navigation for a guard that
        // rejects
        if (outlet && outlet.isActivated && outlet.activatedRoute.component) {
            const activatedComponent = outlet.component;
            if (requiredRoutedComponentType !== undefined &&
                !(activatedComponent instanceof requiredRoutedComponentType)) {
                throw new Error(`Unexpected routed component type. Expected ${requiredRoutedComponentType.name} but got ${activatedComponent.constructor.name}`);
            }
            return activatedComponent;
        }
        else {
            if (requiredRoutedComponentType !== undefined) {
                throw new Error(`Unexpected routed component type. Expected ${requiredRoutedComponentType.name} but the navigation did not activate any component.`);
            }
            return null;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Rlc3RpbmdfaGFybmVzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci90ZXN0aW5nL3NyYy9yb3V0ZXJfdGVzdGluZ19oYXJuZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxTQUFTLEVBQWdCLFVBQVUsRUFBUSxTQUFTLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDbkYsT0FBTyxFQUFtQixPQUFPLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUNoRSxPQUFPLEVBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxvQkFBb0IsSUFBSSxtQkFBbUIsRUFBQyxNQUFNLGlCQUFpQixDQUFDOztBQUdsRyxNQUFNLE9BQU8sa0JBQWtCO0lBSTdCLGFBQWE7UUFDWCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUNELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUMvRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDdEIsQ0FBQztJQUVPLGNBQWM7UUFDcEIsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQy9CLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUN0QixDQUFDO1FBQ0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDN0IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3RCLENBQUM7eUhBbkJVLGtCQUFrQjs2SEFBbEIsa0JBQWtCLGNBRE4sTUFBTTs7c0dBQ2xCLGtC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MkIsQ0FBQyxFQUM1RCxDQUFDO2dCQUNELE1BQU0sSUFBSSxLQUFLLENBQ2IsOENBQThDLDJCQUEyQixDQUFDLElBQUksWUFBWSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQ2hJLENBQUM7WUFDSixDQUFDO1lBQ0QsT0FBTyxrQkFBdUIsQ0FBQztRQUNqQyxDQUFDO2FBQU0sQ0FBQztZQUNOLElBQUksMkJBQTJCLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzlDLE1BQU0sSUFBSSxLQUFLLENBQ2IsOENBQThDLDJCQUEyQixDQUFDLElBQUkscURBQXFELENBQ3BJLENBQUM7WUFDSixDQUFDO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO0lBQ0gsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29tcG9uZW50LCBEZWJ1Z0VsZW1lbnQsIEluamVjdGFibGUsIFR5cGUsIFZpZXdDaGlsZH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0NvbXBvbmVudEZpeHR1cmUsIFRlc3RCZWR9IGZyb20gJ0Bhbmd1bGFyL2NvcmUvdGVzdGluZyc7XG5pbXBvcnQge1JvdXRlciwgUm91dGVyT3V0bGV0LCDJtWFmdGVyTmV4dE5hdmlnYXRpb24gYXMgYWZ0ZXJOZXh0TmF2aWdhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcblxuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgUm9vdEZpeHR1cmVTZXJ2aWNlIHtcbiAgcHJpdmF0ZSBmaXh0dXJlPzogQ29tcG9uZW50Rml4dHVyZTxSb290Q21wPjtcbiAgcHJpdmF0ZSBoYXJuZXNzPzogUm91dGVyVGVzdGluZ0hhcm5lc3M7XG5cbiAgY3JlYXRlSGFybmVzcygpOiBSb3V0ZXJUZXN0aW5nSGFybmVzcyB7XG4gICAgaWYgKHRoaXMuaGFybmVzcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IG9uZSBoYXJuZXNzIHNob3VsZCBiZSBjcmVhdGVkIHBlciB0ZXN0LicpO1xuICAgIH1cbiAgICB0aGlzLmhhcm5lc3MgPSBuZXcgUm91dGVyVGVzdGluZ0hhcm5lc3ModGhpcy5nZXRSb290Rml4dHVyZSgpKTtcbiAgICByZXR1cm4gdGhpcy5oYXJuZXNzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSb290Rml4dHVyZSgpOiBDb21wb25lbnRGaXh0dXJlPFJvb3RDbXA+IHtcbiAgICBpZiAodGhpcy5maXh0dXJlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLmZpeHR1cmU7XG4gICAgfVxuICAgIHRoaXMuZml4dHVyZSA9IFRlc3RCZWQuY3JlYXRlQ29tcG9uZW50KFJvb3RDbXApO1xuICAgIHRoaXMuZml4dHVyZS5kZXRlY3RDaGFuZ2VzKCk7XG4gICAgcmV0dXJuIHRoaXMuZml4dHVyZTtcbiAgfVxufVxuXG5AQ29tcG9uZW50KHtcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbiAgdGVtcGxhdGU6ICc8cm91dGVyLW91dGxldD48L3JvdXRlci1vdXRsZXQ+JyxcbiAgaW1wb3J0czogW1JvdXRlck91dGxldF0sXG59KVxuZXhwb3J0IGNsYXNzIFJvb3RDbXAge1xuICBAVmlld0NoaWxkKFJvdXRlck91dGxldCkgb3V0bGV0PzogUm91dGVyT3V0bGV0O1xufVxuXG4vKipcbiAqIEEgdGVzdGluZyBoYXJuZXNzIGZvciB0aGUgYFJvdXRlcmAgdG8gcmVkdWNlIHRoZSBib2lsZXJwbGF0ZSBuZWVkZWQgdG8gdGVzdCByb3V0ZXMgYW5kIHJvdXRlZFxuICogY29tcG9uZW50cy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZXJUZXN0aW5nSGFybmVzcyB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgYFJvdXRlclRlc3RpbmdIYXJuZXNzYCBpbnN0YW5jZS5cbiAgICpcbiAgICogVGhlIGBSb3V0ZXJUZXN0aW5nSGFybmVzc2AgYWxzbyBjcmVhdGVzIGl0cyBvd24gcm9vdCBjb21wb25lbnQgd2l0aCBhIGBSb3V0ZXJPdXRsZXRgIGZvciB0aGVcbiAgICogcHVycG9zZXMgb2YgcmVuZGVyaW5nIHJvdXRlIGNvbXBvbmVudHMuXG4gICAqXG4gICAqIFRocm93cyBhbiBlcnJvciBpZiBhbiBpbnN0YW5jZSBoYXMgYWxyZWFkeSBiZWVuIGNyZWF0ZWQuXG4gICAqIFVzZSBvZiB0aGlzIGhhcm5lc3MgYWxzbyByZXF1aXJlcyBgZGVzdHJveUFmdGVyRWFjaDogdHJ1ZWAgaW4gdGhlIGBNb2R1bGVUZWFyZG93bk9wdGlvbnNgXG4gICAqXG4gICAqIEBwYXJhbSBpbml0aWFsVXJsIFRoZSB0YXJnZXQgb2YgbmF2aWdhdGlvbiB0byB0cmlnZ2VyIGJlZm9yZSByZXR1cm5pbmcgdGhlIGhhcm5lc3MuXG4gICAqL1xuICBzdGF0aWMgYXN5bmMgY3JlYXRlKGluaXRpYWxVcmw/OiBzdHJpbmcpOiBQcm9taXNlPFJvdXRlclRlc3RpbmdIYXJuZXNzPiB7XG4gICAgY29uc3QgaGFybmVzcyA9IFRlc3RCZWQuaW5qZWN0KFJvb3RGaXh0dXJlU2VydmljZSkuY3JlYXRlSGFybmVzcygpO1xuICAgIGlmIChpbml0aWFsVXJsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGF3YWl0IGhhcm5lc3MubmF2aWdhdGVCeVVybChpbml0aWFsVXJsKTtcbiAgICB9XG4gICAgcmV0dXJuIGhhcm5lc3M7XG4gIH1cblxuICAvKipcbiAgICogRml4dHVyZSBvZiB0aGUgcm9vdCBjb21wb25lbnQgb2YgdGhlIFJvdXRlclRlc3RpbmdIYXJuZXNzXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgZml4dHVyZTogQ29tcG9uZW50Rml4dHVyZTx1bmtub3duPjtcblxuICAvKiogQGludGVybmFsICovXG4gIGNvbnN0cnVjdG9yKGZpeHR1cmU6IENvbXBvbmVudEZpeHR1cmU8dW5rbm93bj4pIHtcbiAgICB0aGlzLmZpeHR1cmUgPSBmaXh0dXJlO1xuICB9XG5cbiAgLyoqIEluc3RydWN0cyB0aGUgcm9vdCBmaXh0dXJlIHRvIHJ1biBjaGFuZ2UgZGV0ZWN0aW9uLiAqL1xuICBkZXRlY3RDaGFuZ2VzKCk6IHZvaWQge1xuICAgIHRoaXMuZml4dHVyZS5kZXRlY3RDaGFuZ2VzKCk7XG4gIH1cbiAgLyoqIFRoZSBgRGVidWdFbGVtZW50YCBvZiB0aGUgYFJvdXRlck91dGxldGAgY29tcG9uZW50LiBgbnVsbGAgaWYgdGhlIG91dGxldCBpcyBub3QgYWN0aXZhdGVkLiAqL1xuICBnZXQgcm91dGVEZWJ1Z0VsZW1lbnQoKTogRGVidWdFbGVtZW50IHwgbnVsbCB7XG4gICAgY29uc3Qgb3V0bGV0ID0gKHRoaXMuZml4dHVyZS5jb21wb25lbnRJbnN0YW5jZSBhcyBSb290Q21wKS5vdXRsZXQ7XG4gICAgaWYgKCFvdXRsZXQgfHwgIW91dGxldC5pc0FjdGl2YXRlZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZpeHR1cmUuZGVidWdFbGVtZW50LnF1ZXJ5KCh2KSA9PiB2LmNvbXBvbmVudEluc3RhbmNlID09PSBvdXRsZXQuY29tcG9uZW50KTtcbiAgfVxuICAvKiogVGhlIG5hdGl2ZSBlbGVtZW50IG9mIHRoZSBgUm91dGVyT3V0bGV0YCBjb21wb25lbnQuIGBudWxsYCBpZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQuICovXG4gIGdldCByb3V0ZU5hdGl2ZUVsZW1lbnQoKTogSFRNTEVsZW1lbnQgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5yb3V0ZURlYnVnRWxlbWVudD8ubmF0aXZlRWxlbWVudCA/PyBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyaWdnZXJzIGEgYFJvdXRlcmAgbmF2aWdhdGlvbiBhbmQgd2FpdHMgZm9yIGl0IHRvIGNvbXBsZXRlLlxuICAgKlxuICAgKiBUaGUgcm9vdCBjb21wb25lbnQgd2l0aCBhIGBSb3V0ZXJPdXRsZXRgIGNyZWF0ZWQgZm9yIHRoZSBoYXJuZXNzIGlzIHVzZWQgdG8gcmVuZGVyIGBSb3V0ZWBcbiAgICogY29tcG9uZW50cy4gVGhlIHJvb3QgY29tcG9uZW50IGlzIHJldXNlZCB3aXRoaW4gdGhlIHNhbWUgdGVzdCBpbiBzdWJzZXF1ZW50IGNhbGxzIHRvXG4gICAqIGBuYXZpZ2F0ZUZvclRlc3RgLlxuICAgKlxuICAgKiBXaGVuIHRlc3RpbmcgYFJvdXRlc2Agd2l0aCBhIGd1YXJkcyB0aGF0IHJlamVjdCB0aGUgbmF2aWdhdGlvbiwgdGhlIGBSb3V0ZXJPdXRsZXRgIG1pZ2h0IG5vdCBiZVxuICAgKiBhY3RpdmF0ZWQgYW5kIHRoZSBgYWN0aXZhdGVkQ29tcG9uZW50YCBtYXkgYmUgYG51bGxgLlxuICAgKlxuICAgKiB7QGV4YW1wbGUgcm91dGVyL3Rlc3RpbmcvdGVzdC9yb3V0ZXJfdGVzdGluZ19oYXJuZXNzX2V4YW1wbGVzLnNwZWMudHMgcmVnaW9uPSdHdWFyZCd9XG4gICAqXG4gICAqIEBwYXJhbSB1cmwgVGhlIHRhcmdldCBvZiB0aGUgbmF2aWdhdGlvbi4gUGFzc2VkIHRvIGBSb3V0ZXIubmF2aWdhdGVCeVVybGAuXG4gICAqIEByZXR1cm5zIFRoZSBhY3RpdmF0ZWQgY29tcG9uZW50IGluc3RhbmNlIG9mIHRoZSBgUm91dGVyT3V0bGV0YCBhZnRlciBuYXZpZ2F0aW9uIGNvbXBsZXRlc1xuICAgKiAgICAgKGBudWxsYCBpZiB0aGUgb3V0bGV0IGRvZXMgbm90IGdldCBhY3RpdmF0ZWQpLlxuICAgKi9cbiAgYXN5bmMgbmF2aWdhdGVCeVVybCh1cmw6IHN0cmluZyk6IFByb21pc2U8bnVsbCB8IHt9PjtcbiAgLyoqXG4gICAqIFRyaWdnZXJzIGEgcm91dGVyIG5hdmlnYXRpb24gYW5kIHdhaXRzIGZvciBpdCB0byBjb21wbGV0ZS5cbiAgICpcbiAgICogVGhlIHJvb3QgY29tcG9uZW50IHdpdGggYSBgUm91dGVyT3V0bGV0YCBjcmVhdGVkIGZvciB0aGUgaGFybmVzcyBpcyB1c2VkIHRvIHJlbmRlciBgUm91dGVgXG4gICAqIGNvbXBvbmVudHMuXG4gICAqXG4gICAqIHtAZXhhbXBsZSByb3V0ZXIvdGVzdGluZy90ZXN0L3JvdXRlcl90ZXN0aW5nX2hhcm5lc3NfZXhhbXBsZXMuc3BlYy50cyByZWdpb249J1JvdXRlZENvbXBvbmVudCd9XG4gICAqXG4gICAqIFRoZSByb290IGNvbXBvbmVudCBpcyByZXVzZWQgd2l0aGluIHRoZSBzYW1lIHRlc3QgaW4gc3Vic2VxdWVudCBjYWxscyB0byBgbmF2aWdhdGVCeVVybGAuXG4gICAqXG4gICAqIFRoaXMgZnVuY3Rpb24gYWxzbyBtYWtlcyBpdCBlYXNpZXIgdG8gdGVzdCBjb21wb25lbnRzIHRoYXQgZGVwZW5kIG9uIGBBY3RpdmF0ZWRSb3V0ZWAgZGF0YS5cbiAgICpcbiAgICoge0BleGFtcGxlIHJvdXRlci90ZXN0aW5nL3Rlc3Qvcm91dGVyX3Rlc3RpbmdfaGFybmVzc19leGFtcGxlcy5zcGVjLnRzIHJlZ2lvbj0nQWN0aXZhdGVkUm91dGUnfVxuICAgKlxuICAgKiBAcGFyYW0gdXJsIFRoZSB0YXJnZXQgb2YgdGhlIG5hdmlnYXRpb24uIFBhc3NlZCB0byBgUm91dGVyLm5hdmlnYXRlQnlVcmxgLlxuICAgKiBAcGFyYW0gcmVxdWlyZWRSb3V0ZWRDb21wb25lbnRUeXBlIEFmdGVyIG5hdmlnYXRpb24gY29tcGxldGVzLCB0aGUgcmVxdWlyZWQgdHlwZSBmb3IgdGhlXG4gICAqICAgICBhY3RpdmF0ZWQgY29tcG9uZW50IG9mIHRoZSBgUm91dGVyT3V0bGV0YC4gSWYgdGhlIG91dGxldCBpcyBub3QgYWN0aXZhdGVkIG9yIGEgZGlmZmVyZW50XG4gICAqICAgICBjb21wb25lbnQgaXMgYWN0aXZhdGVkLCB0aGlzIGZ1bmN0aW9uIHdpbGwgdGhyb3cgYW4gZXJyb3IuXG4gICAqIEByZXR1cm5zIFRoZSBhY3RpdmF0ZWQgY29tcG9uZW50IGluc3RhbmNlIG9mIHRoZSBgUm91dGVyT3V0bGV0YCBhZnRlciBuYXZpZ2F0aW9uIGNvbXBsZXRlcy5cbiAgICovXG4gIGFzeW5jIG5hdmlnYXRlQnlVcmw8VD4odXJsOiBzdHJpbmcsIHJlcXVpcmVkUm91dGVkQ29tcG9uZW50VHlwZTogVHlwZTxUPik6IFByb21pc2U8VD47XG4gIGFzeW5jIG5hdmlnYXRlQnlVcmw8VD4odXJsOiBzdHJpbmcsIHJlcXVpcmVkUm91dGVkQ29tcG9uZW50VHlwZT86IFR5cGU8VD4pOiBQcm9taXNlPFQgfCBudWxsPiB7XG4gICAgY29uc3Qgcm91dGVyID0gVGVzdEJlZC5pbmplY3QoUm91dGVyKTtcbiAgICBsZXQgcmVzb2x2ZUZuITogKCkgPT4gdm9pZDtcbiAgICBjb25zdCByZWRpcmVjdFRyYWNraW5nUHJvbWlzZSA9IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlKSA9PiB7XG4gICAgICByZXNvbHZlRm4gPSByZXNvbHZlO1xuICAgIH0pO1xuICAgIGFmdGVyTmV4dE5hdmlnYXRpb24oVGVzdEJlZC5pbmplY3QoUm91dGVyKSwgcmVzb2x2ZUZuKTtcbiAgICBhd2FpdCByb3V0ZXIubmF2aWdhdGVCeVVybCh1cmwpO1xuICAgIGF3YWl0IHJlZGlyZWN0VHJhY2tpbmdQcm9taXNlO1xuICAgIHRoaXMuZml4dHVyZS5kZXRlY3RDaGFuZ2VzKCk7XG4gICAgY29uc3Qgb3V0bGV0ID0gKHRoaXMuZml4dHVyZS5jb21wb25lbnRJbnN0YW5jZSBhcyBSb290Q21wKS5vdXRsZXQ7XG4gICAgLy8gVGhlIG91dGxldCBtaWdodCBub3QgYmUgYWN0aXZhdGVkIGlmIHRoZSB1c2VyIGlzIHRlc3RpbmcgYSBuYXZpZ2F0aW9uIGZvciBhIGd1YXJkIHRoYXRcbiAgICAvLyByZWplY3RzXG4gICAgaWYgKG91dGxldCAmJiBvdXRsZXQuaXNBY3RpdmF0ZWQgJiYgb3V0bGV0LmFjdGl2YXRlZFJvdXRlLmNvbXBvbmVudCkge1xuICAgICAgY29uc3QgYWN0aXZhdGVkQ29tcG9uZW50ID0gb3V0bGV0LmNvbXBvbmVudDtcbiAgICAgIGlmIChcbiAgICAgICAgcmVxdWlyZWRSb3V0ZWRDb21wb25lbnRUeXBlICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgIShhY3RpdmF0ZWRDb21wb25lbnQgaW5zdGFuY2VvZiByZXF1aXJlZFJvdXRlZENvbXBvbmVudFR5cGUpXG4gICAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBVbmV4cGVjdGVkIHJvdXRlZCBjb21wb25lbnQgdHlwZS4gRXhwZWN0ZWQgJHtyZXF1aXJlZFJvdXRlZENvbXBvbmVudFR5cGUubmFtZX0gYnV0IGdvdCAke2FjdGl2YXRlZENvbXBvbmVudC5jb25zdHJ1Y3Rvci5uYW1lfWAsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYWN0aXZhdGVkQ29tcG9uZW50IGFzIFQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChyZXF1aXJlZFJvdXRlZENvbXBvbmVudFR5cGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFVuZXhwZWN0ZWQgcm91dGVkIGNvbXBvbmVudCB0eXBlLiBFeHBlY3RlZCAke3JlcXVpcmVkUm91dGVkQ29tcG9uZW50VHlwZS5uYW1lfSBidXQgdGhlIG5hdmlnYXRpb24gZGlkIG5vdCBhY3RpdmF0ZSBhbnkgY29tcG9uZW50LmAsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbn1cbiJdfQ==