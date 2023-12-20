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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.1.0-next.4+sha-cc74ebf", ngImport: i0, type: RootFixtureService, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.1.0-next.4+sha-cc74ebf", ngImport: i0, type: RootFixtureService, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.1.0-next.4+sha-cc74ebf", ngImport: i0, type: RootFixtureService, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
export class RootCmp {
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.1.0-next.4+sha-cc74ebf", ngImport: i0, type: RootCmp, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "17.1.0-next.4+sha-cc74ebf", type: RootCmp, isStandalone: true, selector: "ng-component", viewQueries: [{ propertyName: "outlet", first: true, predicate: RouterOutlet, descendants: true }], ngImport: i0, template: '<router-outlet></router-outlet>', isInline: true, dependencies: [{ kind: "directive", type: RouterOutlet, selector: "router-outlet", inputs: ["name"], outputs: ["activate", "deactivate", "attach", "detach"], exportAs: ["outlet"] }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.1.0-next.4+sha-cc74ebf", ngImport: i0, type: RootCmp, decorators: [{
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
        return this.fixture.debugElement.query(v => v.componentInstance === outlet.component);
    }
    /** The native element of the `RouterOutlet` component. `null` if the outlet is not activated. */
    get routeNativeElement() {
        return this.routeDebugElement?.nativeElement ?? null;
    }
    async navigateByUrl(url, requiredRoutedComponentType) {
        const router = TestBed.inject(Router);
        let resolveFn;
        const redirectTrackingPromise = new Promise(resolve => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Rlc3RpbmdfaGFybmVzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci90ZXN0aW5nL3NyYy9yb3V0ZXJfdGVzdGluZ19oYXJuZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxTQUFTLEVBQWdCLFVBQVUsRUFBUSxTQUFTLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDbkYsT0FBTyxFQUFtQixPQUFPLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUNoRSxPQUFPLEVBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxvQkFBb0IsSUFBSSxtQkFBbUIsRUFBQyxNQUFNLGlCQUFpQixDQUFDOztBQUdsRyxNQUFNLE9BQU8sa0JBQWtCO0lBSTdCLGFBQWE7UUFDWCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUNELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUMvRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDdEIsQ0FBQztJQUVPLGNBQWM7UUFDcEIsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQy9CLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUN0QixDQUFDO1FBQ0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDN0IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3RCLENBQUM7eUhBbkJVLGtCQUFrQjs2SEFBbEIsa0JBQWtCLGNBRE4sTUFBTTs7c0dBQ2xCLGtC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QUUsQ0FBQztnQkFDakUsTUFBTSxJQUFJLEtBQUssQ0FBQyw4Q0FDWiwyQkFBMkIsQ0FBQyxJQUFJLFlBQVksa0JBQWtCLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7WUFDekYsQ0FBQztZQUNELE9BQU8sa0JBQXVCLENBQUM7UUFDakMsQ0FBQzthQUFNLENBQUM7WUFDTixJQUFJLDJCQUEyQixLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUM5QyxNQUFNLElBQUksS0FBSyxDQUFDLDhDQUNaLDJCQUEyQixDQUFDLElBQUkscURBQXFELENBQUMsQ0FBQztZQUM3RixDQUFDO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO0lBQ0gsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29tcG9uZW50LCBEZWJ1Z0VsZW1lbnQsIEluamVjdGFibGUsIFR5cGUsIFZpZXdDaGlsZH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0NvbXBvbmVudEZpeHR1cmUsIFRlc3RCZWR9IGZyb20gJ0Bhbmd1bGFyL2NvcmUvdGVzdGluZyc7XG5pbXBvcnQge1JvdXRlciwgUm91dGVyT3V0bGV0LCDJtWFmdGVyTmV4dE5hdmlnYXRpb24gYXMgYWZ0ZXJOZXh0TmF2aWdhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcblxuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgUm9vdEZpeHR1cmVTZXJ2aWNlIHtcbiAgcHJpdmF0ZSBmaXh0dXJlPzogQ29tcG9uZW50Rml4dHVyZTxSb290Q21wPjtcbiAgcHJpdmF0ZSBoYXJuZXNzPzogUm91dGVyVGVzdGluZ0hhcm5lc3M7XG5cbiAgY3JlYXRlSGFybmVzcygpOiBSb3V0ZXJUZXN0aW5nSGFybmVzcyB7XG4gICAgaWYgKHRoaXMuaGFybmVzcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IG9uZSBoYXJuZXNzIHNob3VsZCBiZSBjcmVhdGVkIHBlciB0ZXN0LicpO1xuICAgIH1cbiAgICB0aGlzLmhhcm5lc3MgPSBuZXcgUm91dGVyVGVzdGluZ0hhcm5lc3ModGhpcy5nZXRSb290Rml4dHVyZSgpKTtcbiAgICByZXR1cm4gdGhpcy5oYXJuZXNzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSb290Rml4dHVyZSgpOiBDb21wb25lbnRGaXh0dXJlPFJvb3RDbXA+IHtcbiAgICBpZiAodGhpcy5maXh0dXJlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLmZpeHR1cmU7XG4gICAgfVxuICAgIHRoaXMuZml4dHVyZSA9IFRlc3RCZWQuY3JlYXRlQ29tcG9uZW50KFJvb3RDbXApO1xuICAgIHRoaXMuZml4dHVyZS5kZXRlY3RDaGFuZ2VzKCk7XG4gICAgcmV0dXJuIHRoaXMuZml4dHVyZTtcbiAgfVxufVxuXG5AQ29tcG9uZW50KHtcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbiAgdGVtcGxhdGU6ICc8cm91dGVyLW91dGxldD48L3JvdXRlci1vdXRsZXQ+JyxcbiAgaW1wb3J0czogW1JvdXRlck91dGxldF0sXG59KVxuZXhwb3J0IGNsYXNzIFJvb3RDbXAge1xuICBAVmlld0NoaWxkKFJvdXRlck91dGxldCkgb3V0bGV0PzogUm91dGVyT3V0bGV0O1xufVxuXG4vKipcbiAqIEEgdGVzdGluZyBoYXJuZXNzIGZvciB0aGUgYFJvdXRlcmAgdG8gcmVkdWNlIHRoZSBib2lsZXJwbGF0ZSBuZWVkZWQgdG8gdGVzdCByb3V0ZXMgYW5kIHJvdXRlZFxuICogY29tcG9uZW50cy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZXJUZXN0aW5nSGFybmVzcyB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgYFJvdXRlclRlc3RpbmdIYXJuZXNzYCBpbnN0YW5jZS5cbiAgICpcbiAgICogVGhlIGBSb3V0ZXJUZXN0aW5nSGFybmVzc2AgYWxzbyBjcmVhdGVzIGl0cyBvd24gcm9vdCBjb21wb25lbnQgd2l0aCBhIGBSb3V0ZXJPdXRsZXRgIGZvciB0aGVcbiAgICogcHVycG9zZXMgb2YgcmVuZGVyaW5nIHJvdXRlIGNvbXBvbmVudHMuXG4gICAqXG4gICAqIFRocm93cyBhbiBlcnJvciBpZiBhbiBpbnN0YW5jZSBoYXMgYWxyZWFkeSBiZWVuIGNyZWF0ZWQuXG4gICAqIFVzZSBvZiB0aGlzIGhhcm5lc3MgYWxzbyByZXF1aXJlcyBgZGVzdHJveUFmdGVyRWFjaDogdHJ1ZWAgaW4gdGhlIGBNb2R1bGVUZWFyZG93bk9wdGlvbnNgXG4gICAqXG4gICAqIEBwYXJhbSBpbml0aWFsVXJsIFRoZSB0YXJnZXQgb2YgbmF2aWdhdGlvbiB0byB0cmlnZ2VyIGJlZm9yZSByZXR1cm5pbmcgdGhlIGhhcm5lc3MuXG4gICAqL1xuICBzdGF0aWMgYXN5bmMgY3JlYXRlKGluaXRpYWxVcmw/OiBzdHJpbmcpOiBQcm9taXNlPFJvdXRlclRlc3RpbmdIYXJuZXNzPiB7XG4gICAgY29uc3QgaGFybmVzcyA9IFRlc3RCZWQuaW5qZWN0KFJvb3RGaXh0dXJlU2VydmljZSkuY3JlYXRlSGFybmVzcygpO1xuICAgIGlmIChpbml0aWFsVXJsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGF3YWl0IGhhcm5lc3MubmF2aWdhdGVCeVVybChpbml0aWFsVXJsKTtcbiAgICB9XG4gICAgcmV0dXJuIGhhcm5lc3M7XG4gIH1cblxuICAvKipcbiAgICogRml4dHVyZSBvZiB0aGUgcm9vdCBjb21wb25lbnQgb2YgdGhlIFJvdXRlclRlc3RpbmdIYXJuZXNzXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgZml4dHVyZTogQ29tcG9uZW50Rml4dHVyZTx1bmtub3duPjtcblxuICAvKiogQGludGVybmFsICovXG4gIGNvbnN0cnVjdG9yKGZpeHR1cmU6IENvbXBvbmVudEZpeHR1cmU8dW5rbm93bj4pIHtcbiAgICB0aGlzLmZpeHR1cmUgPSBmaXh0dXJlO1xuICB9XG5cbiAgLyoqIEluc3RydWN0cyB0aGUgcm9vdCBmaXh0dXJlIHRvIHJ1biBjaGFuZ2UgZGV0ZWN0aW9uLiAqL1xuICBkZXRlY3RDaGFuZ2VzKCk6IHZvaWQge1xuICAgIHRoaXMuZml4dHVyZS5kZXRlY3RDaGFuZ2VzKCk7XG4gIH1cbiAgLyoqIFRoZSBgRGVidWdFbGVtZW50YCBvZiB0aGUgYFJvdXRlck91dGxldGAgY29tcG9uZW50LiBgbnVsbGAgaWYgdGhlIG91dGxldCBpcyBub3QgYWN0aXZhdGVkLiAqL1xuICBnZXQgcm91dGVEZWJ1Z0VsZW1lbnQoKTogRGVidWdFbGVtZW50fG51bGwge1xuICAgIGNvbnN0IG91dGxldCA9ICh0aGlzLmZpeHR1cmUuY29tcG9uZW50SW5zdGFuY2UgYXMgUm9vdENtcCkub3V0bGV0O1xuICAgIGlmICghb3V0bGV0IHx8ICFvdXRsZXQuaXNBY3RpdmF0ZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5maXh0dXJlLmRlYnVnRWxlbWVudC5xdWVyeSh2ID0+IHYuY29tcG9uZW50SW5zdGFuY2UgPT09IG91dGxldC5jb21wb25lbnQpO1xuICB9XG4gIC8qKiBUaGUgbmF0aXZlIGVsZW1lbnQgb2YgdGhlIGBSb3V0ZXJPdXRsZXRgIGNvbXBvbmVudC4gYG51bGxgIGlmIHRoZSBvdXRsZXQgaXMgbm90IGFjdGl2YXRlZC4gKi9cbiAgZ2V0IHJvdXRlTmF0aXZlRWxlbWVudCgpOiBIVE1MRWxlbWVudHxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5yb3V0ZURlYnVnRWxlbWVudD8ubmF0aXZlRWxlbWVudCA/PyBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyaWdnZXJzIGEgYFJvdXRlcmAgbmF2aWdhdGlvbiBhbmQgd2FpdHMgZm9yIGl0IHRvIGNvbXBsZXRlLlxuICAgKlxuICAgKiBUaGUgcm9vdCBjb21wb25lbnQgd2l0aCBhIGBSb3V0ZXJPdXRsZXRgIGNyZWF0ZWQgZm9yIHRoZSBoYXJuZXNzIGlzIHVzZWQgdG8gcmVuZGVyIGBSb3V0ZWBcbiAgICogY29tcG9uZW50cy4gVGhlIHJvb3QgY29tcG9uZW50IGlzIHJldXNlZCB3aXRoaW4gdGhlIHNhbWUgdGVzdCBpbiBzdWJzZXF1ZW50IGNhbGxzIHRvXG4gICAqIGBuYXZpZ2F0ZUZvclRlc3RgLlxuICAgKlxuICAgKiBXaGVuIHRlc3RpbmcgYFJvdXRlc2Agd2l0aCBhIGd1YXJkcyB0aGF0IHJlamVjdCB0aGUgbmF2aWdhdGlvbiwgdGhlIGBSb3V0ZXJPdXRsZXRgIG1pZ2h0IG5vdCBiZVxuICAgKiBhY3RpdmF0ZWQgYW5kIHRoZSBgYWN0aXZhdGVkQ29tcG9uZW50YCBtYXkgYmUgYG51bGxgLlxuICAgKlxuICAgKiB7QGV4YW1wbGUgcm91dGVyL3Rlc3RpbmcvdGVzdC9yb3V0ZXJfdGVzdGluZ19oYXJuZXNzX2V4YW1wbGVzLnNwZWMudHMgcmVnaW9uPSdHdWFyZCd9XG4gICAqXG4gICAqIEBwYXJhbSB1cmwgVGhlIHRhcmdldCBvZiB0aGUgbmF2aWdhdGlvbi4gUGFzc2VkIHRvIGBSb3V0ZXIubmF2aWdhdGVCeVVybGAuXG4gICAqIEByZXR1cm5zIFRoZSBhY3RpdmF0ZWQgY29tcG9uZW50IGluc3RhbmNlIG9mIHRoZSBgUm91dGVyT3V0bGV0YCBhZnRlciBuYXZpZ2F0aW9uIGNvbXBsZXRlc1xuICAgKiAgICAgKGBudWxsYCBpZiB0aGUgb3V0bGV0IGRvZXMgbm90IGdldCBhY3RpdmF0ZWQpLlxuICAgKi9cbiAgYXN5bmMgbmF2aWdhdGVCeVVybCh1cmw6IHN0cmluZyk6IFByb21pc2U8bnVsbHx7fT47XG4gIC8qKlxuICAgKiBUcmlnZ2VycyBhIHJvdXRlciBuYXZpZ2F0aW9uIGFuZCB3YWl0cyBmb3IgaXQgdG8gY29tcGxldGUuXG4gICAqXG4gICAqIFRoZSByb290IGNvbXBvbmVudCB3aXRoIGEgYFJvdXRlck91dGxldGAgY3JlYXRlZCBmb3IgdGhlIGhhcm5lc3MgaXMgdXNlZCB0byByZW5kZXIgYFJvdXRlYFxuICAgKiBjb21wb25lbnRzLlxuICAgKlxuICAgKiB7QGV4YW1wbGUgcm91dGVyL3Rlc3RpbmcvdGVzdC9yb3V0ZXJfdGVzdGluZ19oYXJuZXNzX2V4YW1wbGVzLnNwZWMudHMgcmVnaW9uPSdSb3V0ZWRDb21wb25lbnQnfVxuICAgKlxuICAgKiBUaGUgcm9vdCBjb21wb25lbnQgaXMgcmV1c2VkIHdpdGhpbiB0aGUgc2FtZSB0ZXN0IGluIHN1YnNlcXVlbnQgY2FsbHMgdG8gYG5hdmlnYXRlQnlVcmxgLlxuICAgKlxuICAgKiBUaGlzIGZ1bmN0aW9uIGFsc28gbWFrZXMgaXQgZWFzaWVyIHRvIHRlc3QgY29tcG9uZW50cyB0aGF0IGRlcGVuZCBvbiBgQWN0aXZhdGVkUm91dGVgIGRhdGEuXG4gICAqXG4gICAqIHtAZXhhbXBsZSByb3V0ZXIvdGVzdGluZy90ZXN0L3JvdXRlcl90ZXN0aW5nX2hhcm5lc3NfZXhhbXBsZXMuc3BlYy50cyByZWdpb249J0FjdGl2YXRlZFJvdXRlJ31cbiAgICpcbiAgICogQHBhcmFtIHVybCBUaGUgdGFyZ2V0IG9mIHRoZSBuYXZpZ2F0aW9uLiBQYXNzZWQgdG8gYFJvdXRlci5uYXZpZ2F0ZUJ5VXJsYC5cbiAgICogQHBhcmFtIHJlcXVpcmVkUm91dGVkQ29tcG9uZW50VHlwZSBBZnRlciBuYXZpZ2F0aW9uIGNvbXBsZXRlcywgdGhlIHJlcXVpcmVkIHR5cGUgZm9yIHRoZVxuICAgKiAgICAgYWN0aXZhdGVkIGNvbXBvbmVudCBvZiB0aGUgYFJvdXRlck91dGxldGAuIElmIHRoZSBvdXRsZXQgaXMgbm90IGFjdGl2YXRlZCBvciBhIGRpZmZlcmVudFxuICAgKiAgICAgY29tcG9uZW50IGlzIGFjdGl2YXRlZCwgdGhpcyBmdW5jdGlvbiB3aWxsIHRocm93IGFuIGVycm9yLlxuICAgKiBAcmV0dXJucyBUaGUgYWN0aXZhdGVkIGNvbXBvbmVudCBpbnN0YW5jZSBvZiB0aGUgYFJvdXRlck91dGxldGAgYWZ0ZXIgbmF2aWdhdGlvbiBjb21wbGV0ZXMuXG4gICAqL1xuICBhc3luYyBuYXZpZ2F0ZUJ5VXJsPFQ+KHVybDogc3RyaW5nLCByZXF1aXJlZFJvdXRlZENvbXBvbmVudFR5cGU6IFR5cGU8VD4pOiBQcm9taXNlPFQ+O1xuICBhc3luYyBuYXZpZ2F0ZUJ5VXJsPFQ+KHVybDogc3RyaW5nLCByZXF1aXJlZFJvdXRlZENvbXBvbmVudFR5cGU/OiBUeXBlPFQ+KTogUHJvbWlzZTxUfG51bGw+IHtcbiAgICBjb25zdCByb3V0ZXIgPSBUZXN0QmVkLmluamVjdChSb3V0ZXIpO1xuICAgIGxldCByZXNvbHZlRm4hOiAoKSA9PiB2b2lkO1xuICAgIGNvbnN0IHJlZGlyZWN0VHJhY2tpbmdQcm9taXNlID0gbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiB7XG4gICAgICByZXNvbHZlRm4gPSByZXNvbHZlO1xuICAgIH0pO1xuICAgIGFmdGVyTmV4dE5hdmlnYXRpb24oVGVzdEJlZC5pbmplY3QoUm91dGVyKSwgcmVzb2x2ZUZuKTtcbiAgICBhd2FpdCByb3V0ZXIubmF2aWdhdGVCeVVybCh1cmwpO1xuICAgIGF3YWl0IHJlZGlyZWN0VHJhY2tpbmdQcm9taXNlO1xuICAgIHRoaXMuZml4dHVyZS5kZXRlY3RDaGFuZ2VzKCk7XG4gICAgY29uc3Qgb3V0bGV0ID0gKHRoaXMuZml4dHVyZS5jb21wb25lbnRJbnN0YW5jZSBhcyBSb290Q21wKS5vdXRsZXQ7XG4gICAgLy8gVGhlIG91dGxldCBtaWdodCBub3QgYmUgYWN0aXZhdGVkIGlmIHRoZSB1c2VyIGlzIHRlc3RpbmcgYSBuYXZpZ2F0aW9uIGZvciBhIGd1YXJkIHRoYXRcbiAgICAvLyByZWplY3RzXG4gICAgaWYgKG91dGxldCAmJiBvdXRsZXQuaXNBY3RpdmF0ZWQgJiYgb3V0bGV0LmFjdGl2YXRlZFJvdXRlLmNvbXBvbmVudCkge1xuICAgICAgY29uc3QgYWN0aXZhdGVkQ29tcG9uZW50ID0gb3V0bGV0LmNvbXBvbmVudDtcbiAgICAgIGlmIChyZXF1aXJlZFJvdXRlZENvbXBvbmVudFR5cGUgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICEoYWN0aXZhdGVkQ29tcG9uZW50IGluc3RhbmNlb2YgcmVxdWlyZWRSb3V0ZWRDb21wb25lbnRUeXBlKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgcm91dGVkIGNvbXBvbmVudCB0eXBlLiBFeHBlY3RlZCAke1xuICAgICAgICAgICAgcmVxdWlyZWRSb3V0ZWRDb21wb25lbnRUeXBlLm5hbWV9IGJ1dCBnb3QgJHthY3RpdmF0ZWRDb21wb25lbnQuY29uc3RydWN0b3IubmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhY3RpdmF0ZWRDb21wb25lbnQgYXMgVDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHJlcXVpcmVkUm91dGVkQ29tcG9uZW50VHlwZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCByb3V0ZWQgY29tcG9uZW50IHR5cGUuIEV4cGVjdGVkICR7XG4gICAgICAgICAgICByZXF1aXJlZFJvdXRlZENvbXBvbmVudFR5cGUubmFtZX0gYnV0IHRoZSBuYXZpZ2F0aW9uIGRpZCBub3QgYWN0aXZhdGUgYW55IGNvbXBvbmVudC5gKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxufVxuIl19