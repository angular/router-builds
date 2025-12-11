/**
 * @license Angular v21.1.0-next.2+sha-4f6014a
 * (c) 2010-2025 Google LLC. https://angular.dev/
 * License: MIT
 */

import * as i0 from '@angular/core';
import { NgModule, Injectable, signal, Component, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ROUTES, ROUTER_CONFIGURATION, RouterOutlet, Router, afterNextNavigation } from './_router-chunk.mjs';
export { ɵEmptyOutletComponent as ɵɵEmptyOutletComponent } from './_router-chunk.mjs';
import { RouterModule, ROUTER_PROVIDERS, withPreloading, NoPreloading } from './_router_module-chunk.mjs';
export { RouterLink as ɵɵRouterLink, RouterLinkActive as ɵɵRouterLinkActive } from './_router_module-chunk.mjs';
import { provideLocationMocks } from '@angular/common/testing';
import '@angular/common';
import 'rxjs';
import 'rxjs/operators';
import '@angular/platform-browser';

class RouterTestingModule {
  static withRoutes(routes, config) {
    return {
      ngModule: RouterTestingModule,
      providers: [{
        provide: ROUTES,
        multi: true,
        useValue: routes
      }, {
        provide: ROUTER_CONFIGURATION,
        useValue: config ? config : {}
      }]
    };
  }
  static ɵfac = i0.ɵɵngDeclareFactory({
    minVersion: "12.0.0",
    version: "21.1.0-next.2+sha-4f6014a",
    ngImport: i0,
    type: RouterTestingModule,
    deps: [],
    target: i0.ɵɵFactoryTarget.NgModule
  });
  static ɵmod = i0.ɵɵngDeclareNgModule({
    minVersion: "14.0.0",
    version: "21.1.0-next.2+sha-4f6014a",
    ngImport: i0,
    type: RouterTestingModule,
    exports: [RouterModule]
  });
  static ɵinj = i0.ɵɵngDeclareInjector({
    minVersion: "12.0.0",
    version: "21.1.0-next.2+sha-4f6014a",
    ngImport: i0,
    type: RouterTestingModule,
    providers: [ROUTER_PROVIDERS, provideLocationMocks(), withPreloading(NoPreloading).ɵproviders, {
      provide: ROUTES,
      multi: true,
      useValue: []
    }],
    imports: [RouterModule]
  });
}
i0.ɵɵngDeclareClassMetadata({
  minVersion: "12.0.0",
  version: "21.1.0-next.2+sha-4f6014a",
  ngImport: i0,
  type: RouterTestingModule,
  decorators: [{
    type: NgModule,
    args: [{
      exports: [RouterModule],
      providers: [ROUTER_PROVIDERS, provideLocationMocks(), withPreloading(NoPreloading).ɵproviders, {
        provide: ROUTES,
        multi: true,
        useValue: []
      }]
    }]
  }]
});

class RootFixtureService {
  fixture;
  harness;
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
  static ɵfac = i0.ɵɵngDeclareFactory({
    minVersion: "12.0.0",
    version: "21.1.0-next.2+sha-4f6014a",
    ngImport: i0,
    type: RootFixtureService,
    deps: [],
    target: i0.ɵɵFactoryTarget.Injectable
  });
  static ɵprov = i0.ɵɵngDeclareInjectable({
    minVersion: "12.0.0",
    version: "21.1.0-next.2+sha-4f6014a",
    ngImport: i0,
    type: RootFixtureService,
    providedIn: 'root'
  });
}
i0.ɵɵngDeclareClassMetadata({
  minVersion: "12.0.0",
  version: "21.1.0-next.2+sha-4f6014a",
  ngImport: i0,
  type: RootFixtureService,
  decorators: [{
    type: Injectable,
    args: [{
      providedIn: 'root'
    }]
  }]
});
class RootCmp {
  outlet;
  routerOutletData = signal(undefined, ...(ngDevMode ? [{
    debugName: "routerOutletData"
  }] : []));
  static ɵfac = i0.ɵɵngDeclareFactory({
    minVersion: "12.0.0",
    version: "21.1.0-next.2+sha-4f6014a",
    ngImport: i0,
    type: RootCmp,
    deps: [],
    target: i0.ɵɵFactoryTarget.Component
  });
  static ɵcmp = i0.ɵɵngDeclareComponent({
    minVersion: "14.0.0",
    version: "21.1.0-next.2+sha-4f6014a",
    type: RootCmp,
    isStandalone: true,
    selector: "ng-component",
    viewQueries: [{
      propertyName: "outlet",
      first: true,
      predicate: RouterOutlet,
      descendants: true
    }],
    ngImport: i0,
    template: '<router-outlet [routerOutletData]="routerOutletData()"></router-outlet>',
    isInline: true,
    dependencies: [{
      kind: "directive",
      type: RouterOutlet,
      selector: "router-outlet",
      inputs: ["name", "routerOutletData"],
      outputs: ["activate", "deactivate", "attach", "detach"],
      exportAs: ["outlet"]
    }]
  });
}
i0.ɵɵngDeclareClassMetadata({
  minVersion: "12.0.0",
  version: "21.1.0-next.2+sha-4f6014a",
  ngImport: i0,
  type: RootCmp,
  decorators: [{
    type: Component,
    args: [{
      template: '<router-outlet [routerOutletData]="routerOutletData()"></router-outlet>',
      imports: [RouterOutlet]
    }]
  }],
  propDecorators: {
    outlet: [{
      type: ViewChild,
      args: [RouterOutlet]
    }]
  }
});
class RouterTestingHarness {
  static async create(initialUrl) {
    const harness = TestBed.inject(RootFixtureService).createHarness();
    if (initialUrl !== undefined) {
      await harness.navigateByUrl(initialUrl);
    }
    return harness;
  }
  fixture;
  constructor(fixture) {
    this.fixture = fixture;
  }
  detectChanges() {
    this.fixture.detectChanges();
  }
  get routeDebugElement() {
    const outlet = this.fixture.componentInstance.outlet;
    if (!outlet || !outlet.isActivated) {
      return null;
    }
    return this.fixture.debugElement.query(v => v.componentInstance === outlet.component);
  }
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
    if (outlet && outlet.isActivated && outlet.activatedRoute.component) {
      const activatedComponent = outlet.component;
      if (requiredRoutedComponentType !== undefined && !(activatedComponent instanceof requiredRoutedComponentType)) {
        throw new Error(`Unexpected routed component type. Expected ${requiredRoutedComponentType.name} but got ${activatedComponent.constructor.name}`);
      }
      return activatedComponent;
    } else {
      if (requiredRoutedComponentType !== undefined) {
        throw new Error(`Unexpected routed component type. Expected ${requiredRoutedComponentType.name} but the navigation did not activate any component.`);
      }
      return null;
    }
  }
}

export { RouterTestingHarness, RouterTestingModule, RouterOutlet as ɵɵRouterOutlet };
//# sourceMappingURL=testing.mjs.map
