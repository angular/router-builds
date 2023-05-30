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
class RootFixtureService {
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.1.0-next.2+sha-0c80349", ngImport: i0, type: RootFixtureService, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.1.0-next.2+sha-0c80349", ngImport: i0, type: RootFixtureService, providedIn: 'root' }); }
}
export { RootFixtureService };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.1.0-next.2+sha-0c80349", ngImport: i0, type: RootFixtureService, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });
class RootCmp {
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.1.0-next.2+sha-0c80349", ngImport: i0, type: RootCmp, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "16.1.0-next.2+sha-0c80349", type: RootCmp, isStandalone: true, selector: "ng-component", viewQueries: [{ propertyName: "outlet", first: true, predicate: RouterOutlet, descendants: true }], ngImport: i0, template: '<router-outlet></router-outlet>', isInline: true, dependencies: [{ kind: "directive", type: RouterOutlet, selector: "router-outlet", inputs: ["name"], outputs: ["activate", "deactivate", "attach", "detach"], exportAs: ["outlet"] }] }); }
}
export { RootCmp };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.1.0-next.2+sha-0c80349", ngImport: i0, type: RootCmp, decorators: [{
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
            return null;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyX3Rlc3RpbmdfaGFybmVzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3JvdXRlci90ZXN0aW5nL3NyYy9yb3V0ZXJfdGVzdGluZ19oYXJuZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxTQUFTLEVBQWdCLFVBQVUsRUFBUSxTQUFTLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDbkYsT0FBTyxFQUFtQixPQUFPLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUNoRSxPQUFPLEVBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxvQkFBb0IsSUFBSSxtQkFBbUIsRUFBQyxNQUFNLGlCQUFpQixDQUFDOztBQUVsRyxNQUNhLGtCQUFrQjtJQUk3QixhQUFhO1FBQ1gsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsOENBQThDLENBQUMsQ0FBQztTQUNqRTtRQUNELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUMvRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDdEIsQ0FBQztJQUVPLGNBQWM7UUFDcEIsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLFNBQVMsRUFBRTtZQUM5QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7U0FDckI7UUFDRCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDaEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUM3QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDdEIsQ0FBQzt5SEFuQlUsa0JBQWtCOzZIQUFsQixrQkFBa0IsY0FETixNQUFNOztTQUNsQixrQkFBa0I7c0dBQWxCLGtCQUFrQjtrQkFEOUIs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MkIsQ0FBQyxJQUFJLFlBQVksa0JBQWtCLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7YUFDeEY7WUFDRCxPQUFPLGtCQUF1QixDQUFDO1NBQ2hDO2FBQU07WUFDTCxPQUFPLElBQUksQ0FBQztTQUNiO0lBQ0gsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29tcG9uZW50LCBEZWJ1Z0VsZW1lbnQsIEluamVjdGFibGUsIFR5cGUsIFZpZXdDaGlsZH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0NvbXBvbmVudEZpeHR1cmUsIFRlc3RCZWR9IGZyb20gJ0Bhbmd1bGFyL2NvcmUvdGVzdGluZyc7XG5pbXBvcnQge1JvdXRlciwgUm91dGVyT3V0bGV0LCDJtWFmdGVyTmV4dE5hdmlnYXRpb24gYXMgYWZ0ZXJOZXh0TmF2aWdhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcblxuQEluamVjdGFibGUoe3Byb3ZpZGVkSW46ICdyb290J30pXG5leHBvcnQgY2xhc3MgUm9vdEZpeHR1cmVTZXJ2aWNlIHtcbiAgcHJpdmF0ZSBmaXh0dXJlPzogQ29tcG9uZW50Rml4dHVyZTxSb290Q21wPjtcbiAgcHJpdmF0ZSBoYXJuZXNzPzogUm91dGVyVGVzdGluZ0hhcm5lc3M7XG5cbiAgY3JlYXRlSGFybmVzcygpOiBSb3V0ZXJUZXN0aW5nSGFybmVzcyB7XG4gICAgaWYgKHRoaXMuaGFybmVzcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IG9uZSBoYXJuZXNzIHNob3VsZCBiZSBjcmVhdGVkIHBlciB0ZXN0LicpO1xuICAgIH1cbiAgICB0aGlzLmhhcm5lc3MgPSBuZXcgUm91dGVyVGVzdGluZ0hhcm5lc3ModGhpcy5nZXRSb290Rml4dHVyZSgpKTtcbiAgICByZXR1cm4gdGhpcy5oYXJuZXNzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRSb290Rml4dHVyZSgpOiBDb21wb25lbnRGaXh0dXJlPFJvb3RDbXA+IHtcbiAgICBpZiAodGhpcy5maXh0dXJlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLmZpeHR1cmU7XG4gICAgfVxuICAgIHRoaXMuZml4dHVyZSA9IFRlc3RCZWQuY3JlYXRlQ29tcG9uZW50KFJvb3RDbXApO1xuICAgIHRoaXMuZml4dHVyZS5kZXRlY3RDaGFuZ2VzKCk7XG4gICAgcmV0dXJuIHRoaXMuZml4dHVyZTtcbiAgfVxufVxuXG5AQ29tcG9uZW50KHtcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbiAgdGVtcGxhdGU6ICc8cm91dGVyLW91dGxldD48L3JvdXRlci1vdXRsZXQ+JyxcbiAgaW1wb3J0czogW1JvdXRlck91dGxldF0sXG59KVxuZXhwb3J0IGNsYXNzIFJvb3RDbXAge1xuICBAVmlld0NoaWxkKFJvdXRlck91dGxldCkgb3V0bGV0PzogUm91dGVyT3V0bGV0O1xufVxuXG4vKipcbiAqIEEgdGVzdGluZyBoYXJuZXNzIGZvciB0aGUgYFJvdXRlcmAgdG8gcmVkdWNlIHRoZSBib2lsZXJwbGF0ZSBuZWVkZWQgdG8gdGVzdCByb3V0ZXMgYW5kIHJvdXRlZFxuICogY29tcG9uZW50cy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBSb3V0ZXJUZXN0aW5nSGFybmVzcyB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgYFJvdXRlclRlc3RpbmdIYXJuZXNzYCBpbnN0YW5jZS5cbiAgICpcbiAgICogVGhlIGBSb3V0ZXJUZXN0aW5nSGFybmVzc2AgYWxzbyBjcmVhdGVzIGl0cyBvd24gcm9vdCBjb21wb25lbnQgd2l0aCBhIGBSb3V0ZXJPdXRsZXRgIGZvciB0aGVcbiAgICogcHVycG9zZXMgb2YgcmVuZGVyaW5nIHJvdXRlIGNvbXBvbmVudHMuXG4gICAqXG4gICAqIFRocm93cyBhbiBlcnJvciBpZiBhbiBpbnN0YW5jZSBoYXMgYWxyZWFkeSBiZWVuIGNyZWF0ZWQuXG4gICAqIFVzZSBvZiB0aGlzIGhhcm5lc3MgYWxzbyByZXF1aXJlcyBgZGVzdHJveUFmdGVyRWFjaDogdHJ1ZWAgaW4gdGhlIGBNb2R1bGVUZWFyZG93bk9wdGlvbnNgXG4gICAqXG4gICAqIEBwYXJhbSBpbml0aWFsVXJsIFRoZSB0YXJnZXQgb2YgbmF2aWdhdGlvbiB0byB0cmlnZ2VyIGJlZm9yZSByZXR1cm5pbmcgdGhlIGhhcm5lc3MuXG4gICAqL1xuICBzdGF0aWMgYXN5bmMgY3JlYXRlKGluaXRpYWxVcmw/OiBzdHJpbmcpOiBQcm9taXNlPFJvdXRlclRlc3RpbmdIYXJuZXNzPiB7XG4gICAgY29uc3QgaGFybmVzcyA9IFRlc3RCZWQuaW5qZWN0KFJvb3RGaXh0dXJlU2VydmljZSkuY3JlYXRlSGFybmVzcygpO1xuICAgIGlmIChpbml0aWFsVXJsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGF3YWl0IGhhcm5lc3MubmF2aWdhdGVCeVVybChpbml0aWFsVXJsKTtcbiAgICB9XG4gICAgcmV0dXJuIGhhcm5lc3M7XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgZml4dHVyZTogQ29tcG9uZW50Rml4dHVyZTxSb290Q21wPikge31cblxuICAvKiogSW5zdHJ1Y3RzIHRoZSByb290IGZpeHR1cmUgdG8gcnVuIGNoYW5nZSBkZXRlY3Rpb24uICovXG4gIGRldGVjdENoYW5nZXMoKTogdm9pZCB7XG4gICAgdGhpcy5maXh0dXJlLmRldGVjdENoYW5nZXMoKTtcbiAgfVxuICAvKiogVGhlIGBEZWJ1Z0VsZW1lbnRgIG9mIHRoZSBgUm91dGVyT3V0bGV0YCBjb21wb25lbnQuIGBudWxsYCBpZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQuICovXG4gIGdldCByb3V0ZURlYnVnRWxlbWVudCgpOiBEZWJ1Z0VsZW1lbnR8bnVsbCB7XG4gICAgY29uc3Qgb3V0bGV0ID0gdGhpcy5maXh0dXJlLmNvbXBvbmVudEluc3RhbmNlLm91dGxldDtcbiAgICBpZiAoIW91dGxldCB8fCAhb3V0bGV0LmlzQWN0aXZhdGVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZml4dHVyZS5kZWJ1Z0VsZW1lbnQucXVlcnkodiA9PiB2LmNvbXBvbmVudEluc3RhbmNlID09PSBvdXRsZXQuY29tcG9uZW50KTtcbiAgfVxuICAvKiogVGhlIG5hdGl2ZSBlbGVtZW50IG9mIHRoZSBgUm91dGVyT3V0bGV0YCBjb21wb25lbnQuIGBudWxsYCBpZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQuICovXG4gIGdldCByb3V0ZU5hdGl2ZUVsZW1lbnQoKTogSFRNTEVsZW1lbnR8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMucm91dGVEZWJ1Z0VsZW1lbnQ/Lm5hdGl2ZUVsZW1lbnQgPz8gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmlnZ2VycyBhIGBSb3V0ZXJgIG5hdmlnYXRpb24gYW5kIHdhaXRzIGZvciBpdCB0byBjb21wbGV0ZS5cbiAgICpcbiAgICogVGhlIHJvb3QgY29tcG9uZW50IHdpdGggYSBgUm91dGVyT3V0bGV0YCBjcmVhdGVkIGZvciB0aGUgaGFybmVzcyBpcyB1c2VkIHRvIHJlbmRlciBgUm91dGVgXG4gICAqIGNvbXBvbmVudHMuIFRoZSByb290IGNvbXBvbmVudCBpcyByZXVzZWQgd2l0aGluIHRoZSBzYW1lIHRlc3QgaW4gc3Vic2VxdWVudCBjYWxscyB0b1xuICAgKiBgbmF2aWdhdGVGb3JUZXN0YC5cbiAgICpcbiAgICogV2hlbiB0ZXN0aW5nIGBSb3V0ZXNgIHdpdGggYSBndWFyZHMgdGhhdCByZWplY3QgdGhlIG5hdmlnYXRpb24sIHRoZSBgUm91dGVyT3V0bGV0YCBtaWdodCBub3QgYmVcbiAgICogYWN0aXZhdGVkIGFuZCB0aGUgYGFjdGl2YXRlZENvbXBvbmVudGAgbWF5IGJlIGBudWxsYC5cbiAgICpcbiAgICoge0BleGFtcGxlIHJvdXRlci90ZXN0aW5nL3Rlc3Qvcm91dGVyX3Rlc3RpbmdfaGFybmVzc19leGFtcGxlcy5zcGVjLnRzIHJlZ2lvbj0nR3VhcmQnfVxuICAgKlxuICAgKiBAcGFyYW0gdXJsIFRoZSB0YXJnZXQgb2YgdGhlIG5hdmlnYXRpb24uIFBhc3NlZCB0byBgUm91dGVyLm5hdmlnYXRlQnlVcmxgLlxuICAgKiBAcmV0dXJucyBUaGUgYWN0aXZhdGVkIGNvbXBvbmVudCBpbnN0YW5jZSBvZiB0aGUgYFJvdXRlck91dGxldGAgYWZ0ZXIgbmF2aWdhdGlvbiBjb21wbGV0ZXNcbiAgICogICAgIChgbnVsbGAgaWYgdGhlIG91dGxldCBkb2VzIG5vdCBnZXQgYWN0aXZhdGVkKS5cbiAgICovXG4gIGFzeW5jIG5hdmlnYXRlQnlVcmwodXJsOiBzdHJpbmcpOiBQcm9taXNlPG51bGx8e30+O1xuICAvKipcbiAgICogVHJpZ2dlcnMgYSByb3V0ZXIgbmF2aWdhdGlvbiBhbmQgd2FpdHMgZm9yIGl0IHRvIGNvbXBsZXRlLlxuICAgKlxuICAgKiBUaGUgcm9vdCBjb21wb25lbnQgd2l0aCBhIGBSb3V0ZXJPdXRsZXRgIGNyZWF0ZWQgZm9yIHRoZSBoYXJuZXNzIGlzIHVzZWQgdG8gcmVuZGVyIGBSb3V0ZWBcbiAgICogY29tcG9uZW50cy5cbiAgICpcbiAgICoge0BleGFtcGxlIHJvdXRlci90ZXN0aW5nL3Rlc3Qvcm91dGVyX3Rlc3RpbmdfaGFybmVzc19leGFtcGxlcy5zcGVjLnRzIHJlZ2lvbj0nUm91dGVkQ29tcG9uZW50J31cbiAgICpcbiAgICogVGhlIHJvb3QgY29tcG9uZW50IGlzIHJldXNlZCB3aXRoaW4gdGhlIHNhbWUgdGVzdCBpbiBzdWJzZXF1ZW50IGNhbGxzIHRvIGBuYXZpZ2F0ZUJ5VXJsYC5cbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiBhbHNvIG1ha2VzIGl0IGVhc2llciB0byB0ZXN0IGNvbXBvbmVudHMgdGhhdCBkZXBlbmQgb24gYEFjdGl2YXRlZFJvdXRlYCBkYXRhLlxuICAgKlxuICAgKiB7QGV4YW1wbGUgcm91dGVyL3Rlc3RpbmcvdGVzdC9yb3V0ZXJfdGVzdGluZ19oYXJuZXNzX2V4YW1wbGVzLnNwZWMudHMgcmVnaW9uPSdBY3RpdmF0ZWRSb3V0ZSd9XG4gICAqXG4gICAqIEBwYXJhbSB1cmwgVGhlIHRhcmdldCBvZiB0aGUgbmF2aWdhdGlvbi4gUGFzc2VkIHRvIGBSb3V0ZXIubmF2aWdhdGVCeVVybGAuXG4gICAqIEBwYXJhbSByZXF1aXJlZFJvdXRlZENvbXBvbmVudFR5cGUgQWZ0ZXIgbmF2aWdhdGlvbiBjb21wbGV0ZXMsIHRoZSByZXF1aXJlZCB0eXBlIGZvciB0aGVcbiAgICogICAgIGFjdGl2YXRlZCBjb21wb25lbnQgb2YgdGhlIGBSb3V0ZXJPdXRsZXRgLiBJZiB0aGUgb3V0bGV0IGlzIG5vdCBhY3RpdmF0ZWQgb3IgYSBkaWZmZXJlbnRcbiAgICogICAgIGNvbXBvbmVudCBpcyBhY3RpdmF0ZWQsIHRoaXMgZnVuY3Rpb24gd2lsbCB0aHJvdyBhbiBlcnJvci5cbiAgICogQHJldHVybnMgVGhlIGFjdGl2YXRlZCBjb21wb25lbnQgaW5zdGFuY2Ugb2YgdGhlIGBSb3V0ZXJPdXRsZXRgIGFmdGVyIG5hdmlnYXRpb24gY29tcGxldGVzLlxuICAgKi9cbiAgYXN5bmMgbmF2aWdhdGVCeVVybDxUPih1cmw6IHN0cmluZywgcmVxdWlyZWRSb3V0ZWRDb21wb25lbnRUeXBlOiBUeXBlPFQ+KTogUHJvbWlzZTxUPjtcbiAgYXN5bmMgbmF2aWdhdGVCeVVybDxUPih1cmw6IHN0cmluZywgcmVxdWlyZWRSb3V0ZWRDb21wb25lbnRUeXBlPzogVHlwZTxUPik6IFByb21pc2U8VHxudWxsPiB7XG4gICAgY29uc3Qgcm91dGVyID0gVGVzdEJlZC5pbmplY3QoUm91dGVyKTtcbiAgICBsZXQgcmVzb2x2ZUZuITogKCkgPT4gdm9pZDtcbiAgICBjb25zdCByZWRpcmVjdFRyYWNraW5nUHJvbWlzZSA9IG5ldyBQcm9taXNlPHZvaWQ+KHJlc29sdmUgPT4ge1xuICAgICAgcmVzb2x2ZUZuID0gcmVzb2x2ZTtcbiAgICB9KTtcbiAgICBhZnRlck5leHROYXZpZ2F0aW9uKFRlc3RCZWQuaW5qZWN0KFJvdXRlciksIHJlc29sdmVGbik7XG4gICAgYXdhaXQgcm91dGVyLm5hdmlnYXRlQnlVcmwodXJsKTtcbiAgICBhd2FpdCByZWRpcmVjdFRyYWNraW5nUHJvbWlzZTtcbiAgICB0aGlzLmZpeHR1cmUuZGV0ZWN0Q2hhbmdlcygpO1xuICAgIGNvbnN0IG91dGxldCA9IHRoaXMuZml4dHVyZS5jb21wb25lbnRJbnN0YW5jZS5vdXRsZXQ7XG4gICAgLy8gVGhlIG91dGxldCBtaWdodCBub3QgYmUgYWN0aXZhdGVkIGlmIHRoZSB1c2VyIGlzIHRlc3RpbmcgYSBuYXZpZ2F0aW9uIGZvciBhIGd1YXJkIHRoYXRcbiAgICAvLyByZWplY3RzXG4gICAgaWYgKG91dGxldCAmJiBvdXRsZXQuaXNBY3RpdmF0ZWQgJiYgb3V0bGV0LmFjdGl2YXRlZFJvdXRlLmNvbXBvbmVudCkge1xuICAgICAgY29uc3QgYWN0aXZhdGVkQ29tcG9uZW50ID0gb3V0bGV0LmNvbXBvbmVudDtcbiAgICAgIGlmIChyZXF1aXJlZFJvdXRlZENvbXBvbmVudFR5cGUgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICEoYWN0aXZhdGVkQ29tcG9uZW50IGluc3RhbmNlb2YgcmVxdWlyZWRSb3V0ZWRDb21wb25lbnRUeXBlKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgcm91dGVkIGNvbXBvbmVudCB0eXBlLiBFeHBlY3RlZCAke1xuICAgICAgICAgICAgcmVxdWlyZWRSb3V0ZWRDb21wb25lbnRUeXBlLm5hbWV9IGJ1dCBnb3QgJHthY3RpdmF0ZWRDb21wb25lbnQuY29uc3RydWN0b3IubmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhY3RpdmF0ZWRDb21wb25lbnQgYXMgVDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG59XG4iXX0=