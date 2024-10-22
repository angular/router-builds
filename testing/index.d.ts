/**
 * @license Angular v18.2.8+sha-7e933d8
 * (c) 2010-2024 Google LLC. https://angular.io/
 * License: MIT
 */


import { ComponentFixture } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { ExtraOptions } from '@angular/router';
import * as i0 from '@angular/core';
import * as i1 from '@angular/router';
import { ModuleWithProviders } from '@angular/core';
import { Routes } from '@angular/router';
import { Type } from '@angular/core';

/**
 * A testing harness for the `Router` to reduce the boilerplate needed to test routes and routed
 * components.
 *
 * @publicApi
 */
export declare class RouterTestingHarness {
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
    static create(initialUrl?: string): Promise<RouterTestingHarness>;
    /**
     * Fixture of the root component of the RouterTestingHarness
     */
    readonly fixture: ComponentFixture<unknown>;
    /** Instructs the root fixture to run change detection. */
    detectChanges(): void;
    /** The `DebugElement` of the `RouterOutlet` component. `null` if the outlet is not activated. */
    get routeDebugElement(): DebugElement | null;
    /** The native element of the `RouterOutlet` component. `null` if the outlet is not activated. */
    get routeNativeElement(): HTMLElement | null;
    /**
     * Triggers a `Router` navigation and waits for it to complete.
     *
     * The root component with a `RouterOutlet` created for the harness is used to render `Route`
     * components. The root component is reused within the same test in subsequent calls to
     * `navigateForTest`.
     *
     * When testing `Routes` with a guards that reject the navigation, the `RouterOutlet` might not be
     * activated and the `activatedComponent` may be `null`.
     *
     * {@example router/testing/test/router_testing_harness_examples.spec.ts region='Guard'}
     *
     * @param url The target of the navigation. Passed to `Router.navigateByUrl`.
     * @returns The activated component instance of the `RouterOutlet` after navigation completes
     *     (`null` if the outlet does not get activated).
     */
    navigateByUrl(url: string): Promise<null | {}>;
    /**
     * Triggers a router navigation and waits for it to complete.
     *
     * The root component with a `RouterOutlet` created for the harness is used to render `Route`
     * components.
     *
     * {@example router/testing/test/router_testing_harness_examples.spec.ts region='RoutedComponent'}
     *
     * The root component is reused within the same test in subsequent calls to `navigateByUrl`.
     *
     * This function also makes it easier to test components that depend on `ActivatedRoute` data.
     *
     * {@example router/testing/test/router_testing_harness_examples.spec.ts region='ActivatedRoute'}
     *
     * @param url The target of the navigation. Passed to `Router.navigateByUrl`.
     * @param requiredRoutedComponentType After navigation completes, the required type for the
     *     activated component of the `RouterOutlet`. If the outlet is not activated or a different
     *     component is activated, this function will throw an error.
     * @returns The activated component instance of the `RouterOutlet` after navigation completes.
     */
    navigateByUrl<T>(url: string, requiredRoutedComponentType: Type<T>): Promise<T>;
}

/**
 * @description
 *
 * Sets up the router to be used for testing.
 *
 * The modules sets up the router to be used for testing.
 * It provides spy implementations of `Location` and `LocationStrategy`.
 *
 * @usageNotes
 * ### Example
 *
 * ```
 * beforeEach(() => {
 *   TestBed.configureTestingModule({
 *     imports: [
 *       RouterModule.forRoot(
 *         [{path: '', component: BlankCmp}, {path: 'simple', component: SimpleCmp}]
 *       )
 *     ]
 *   });
 * });
 * ```
 *
 * @publicApi
 * @deprecated Use `provideRouter` or `RouterModule`/`RouterModule.forRoot` instead.
 * This module was previously used to provide a helpful collection of test fakes,
 * most notably those for `Location` and `LocationStrategy`.  These are generally not
 * required anymore, as `MockPlatformLocation` is provided in `TestBed` by default.
 * However, you can use them directly with `provideLocationMocks`.
 */
export declare class RouterTestingModule {
    static withRoutes(routes: Routes, config?: ExtraOptions): ModuleWithProviders<RouterTestingModule>;
    static ɵfac: i0.ɵɵFactoryDeclaration<RouterTestingModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<RouterTestingModule, never, never, [typeof i1.RouterModule]>;
    static ɵinj: i0.ɵɵInjectorDeclaration<RouterTestingModule>;
}

export { }
