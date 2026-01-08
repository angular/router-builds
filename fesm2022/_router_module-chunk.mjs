/**
 * @license Angular v21.0.7+sha-2b83091
 * (c) 2010-2025 Google LLC. https://angular.dev/
 * License: MIT
 */

import * as i3 from '@angular/common';
import { PlatformNavigation, Location, ɵNavigationAdapterForLocation as _NavigationAdapterForLocation, LOCATION_INITIALIZED, ViewportScroller, LocationStrategy, HashLocationStrategy, PathLocationStrategy } from '@angular/common';
import * as i0 from '@angular/core';
import { signal, untracked, inject, ɵINTERNAL_APPLICATION_ERROR_HANDLER as _INTERNAL_APPLICATION_ERROR_HANDLER, HostAttributeToken, ɵRuntimeError as _RuntimeError, booleanAttribute, Directive, Attribute, HostBinding, Input, HostListener, EventEmitter, ContentChildren, Output, Injectable, createEnvironmentInjector, InjectionToken, ɵpublishExternalGlobalUtil as _publishExternalGlobalUtil, makeEnvironmentProviders, APP_BOOTSTRAP_LISTENER, provideEnvironmentInitializer, Injector, ApplicationRef, ɵIS_ENABLED_BLOCKING_INITIAL_NAVIGATION as _IS_ENABLED_BLOCKING_INITIAL_NAVIGATION, provideAppInitializer, ɵperformanceMarkFeature as _performanceMarkFeature, ENVIRONMENT_INITIALIZER, NgZone, NgModule } from '@angular/core';
import { ROUTER_CONFIGURATION, NavigationEnd, isUrlTree, Router, ActivatedRoute, RouterConfigLoader, IMPERATIVE_NAVIGATION, NavigationStart, NavigationSkipped, NavigationSkippedCode, Scroll, UrlSerializer, NavigationTransitions, HistoryStateManager, ROUTES, afterNextNavigation, StateManager, stringifyEvent, NAVIGATION_ERROR_HANDLER, RoutedComponentInputBinder, INPUT_BINDER, CREATE_VIEW_TRANSITION, createViewTransition, VIEW_TRANSITION_OPTIONS, DefaultUrlSerializer, ChildrenOutletContexts, RouterOutlet, ɵEmptyOutletComponent as _EmptyOutletComponent } from './_router-chunk.mjs';
import { Subject, of, from } from 'rxjs';
import { mergeAll, catchError, filter, concatMap, mergeMap } from 'rxjs/operators';

class RouterLink {
  router;
  route;
  tabIndexAttribute;
  renderer;
  el;
  locationStrategy;
  reactiveHref = signal(null, ...(ngDevMode ? [{
    debugName: "reactiveHref"
  }] : []));
  get href() {
    return untracked(this.reactiveHref);
  }
  set href(value) {
    this.reactiveHref.set(value);
  }
  target;
  queryParams;
  fragment;
  queryParamsHandling;
  state;
  info;
  relativeTo;
  isAnchorElement;
  subscription;
  onChanges = new Subject();
  applicationErrorHandler = inject(_INTERNAL_APPLICATION_ERROR_HANDLER);
  options = inject(ROUTER_CONFIGURATION, {
    optional: true
  });
  constructor(router, route, tabIndexAttribute, renderer, el, locationStrategy) {
    this.router = router;
    this.route = route;
    this.tabIndexAttribute = tabIndexAttribute;
    this.renderer = renderer;
    this.el = el;
    this.locationStrategy = locationStrategy;
    this.reactiveHref.set(inject(new HostAttributeToken('href'), {
      optional: true
    }));
    const tagName = el.nativeElement.tagName?.toLowerCase();
    this.isAnchorElement = tagName === 'a' || tagName === 'area' || !!(typeof customElements === 'object' && customElements.get(tagName)?.observedAttributes?.includes?.('href'));
    if (this.isAnchorElement) {
      this.setTabIndexIfNotOnNativeEl('0');
      this.subscribeToNavigationEventsIfNecessary();
    }
  }
  subscribeToNavigationEventsIfNecessary() {
    if (this.subscription !== undefined) {
      return;
    }
    this.subscription = this.router.events.subscribe(s => {
      if (s instanceof NavigationEnd) {
        this.updateHref();
      }
    });
  }
  preserveFragment = false;
  skipLocationChange = false;
  replaceUrl = false;
  setTabIndexIfNotOnNativeEl(newTabIndex) {
    if (this.tabIndexAttribute != null || this.isAnchorElement) {
      return;
    }
    this.applyAttributeValue('tabindex', newTabIndex);
  }
  ngOnChanges(changes) {
    if (ngDevMode && isUrlTree(this.routerLinkInput) && (this.fragment !== undefined || this.queryParams || this.queryParamsHandling || this.preserveFragment || this.relativeTo)) {
      throw new _RuntimeError(4017, 'Cannot configure queryParams or fragment when using a UrlTree as the routerLink input value.');
    }
    if (this.isAnchorElement) {
      this.updateHref();
    }
    this.onChanges.next(this);
  }
  routerLinkInput = null;
  set routerLink(commandsOrUrlTree) {
    if (commandsOrUrlTree == null) {
      this.routerLinkInput = null;
      this.setTabIndexIfNotOnNativeEl(null);
    } else {
      if (isUrlTree(commandsOrUrlTree)) {
        this.routerLinkInput = commandsOrUrlTree;
      } else {
        this.routerLinkInput = Array.isArray(commandsOrUrlTree) ? commandsOrUrlTree : [commandsOrUrlTree];
      }
      this.setTabIndexIfNotOnNativeEl('0');
    }
  }
  onClick(button, ctrlKey, shiftKey, altKey, metaKey) {
    const urlTree = this.urlTree;
    if (urlTree === null) {
      return true;
    }
    if (this.isAnchorElement) {
      if (button !== 0 || ctrlKey || shiftKey || altKey || metaKey) {
        return true;
      }
      if (typeof this.target === 'string' && this.target != '_self') {
        return true;
      }
    }
    const extras = {
      skipLocationChange: this.skipLocationChange,
      replaceUrl: this.replaceUrl,
      state: this.state,
      info: this.info
    };
    this.router.navigateByUrl(urlTree, extras)?.catch(e => {
      this.applicationErrorHandler(e);
    });
    return !this.isAnchorElement;
  }
  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
  updateHref() {
    const urlTree = this.urlTree;
    this.reactiveHref.set(urlTree !== null && this.locationStrategy ? this.locationStrategy?.prepareExternalUrl(this.router.serializeUrl(urlTree)) ?? '' : null);
  }
  applyAttributeValue(attrName, attrValue) {
    const renderer = this.renderer;
    const nativeElement = this.el.nativeElement;
    if (attrValue !== null) {
      renderer.setAttribute(nativeElement, attrName, attrValue);
    } else {
      renderer.removeAttribute(nativeElement, attrName);
    }
  }
  get urlTree() {
    if (this.routerLinkInput === null) {
      return null;
    } else if (isUrlTree(this.routerLinkInput)) {
      return this.routerLinkInput;
    }
    return this.router.createUrlTree(this.routerLinkInput, {
      relativeTo: this.relativeTo !== undefined ? this.relativeTo : this.route,
      queryParams: this.queryParams,
      fragment: this.fragment,
      queryParamsHandling: this.queryParamsHandling,
      preserveFragment: this.preserveFragment
    });
  }
  static ɵfac = i0.ɵɵngDeclareFactory({
    minVersion: "12.0.0",
    version: "21.0.7+sha-2b83091",
    ngImport: i0,
    type: RouterLink,
    deps: [{
      token: Router
    }, {
      token: ActivatedRoute
    }, {
      token: 'tabindex',
      attribute: true
    }, {
      token: i0.Renderer2
    }, {
      token: i0.ElementRef
    }, {
      token: i3.LocationStrategy
    }],
    target: i0.ɵɵFactoryTarget.Directive
  });
  static ɵdir = i0.ɵɵngDeclareDirective({
    minVersion: "16.1.0",
    version: "21.0.7+sha-2b83091",
    type: RouterLink,
    isStandalone: true,
    selector: "[routerLink]",
    inputs: {
      target: "target",
      queryParams: "queryParams",
      fragment: "fragment",
      queryParamsHandling: "queryParamsHandling",
      state: "state",
      info: "info",
      relativeTo: "relativeTo",
      preserveFragment: ["preserveFragment", "preserveFragment", booleanAttribute],
      skipLocationChange: ["skipLocationChange", "skipLocationChange", booleanAttribute],
      replaceUrl: ["replaceUrl", "replaceUrl", booleanAttribute],
      routerLink: "routerLink"
    },
    host: {
      listeners: {
        "click": "onClick($event.button,$event.ctrlKey,$event.shiftKey,$event.altKey,$event.metaKey)"
      },
      properties: {
        "attr.href": "reactiveHref()",
        "attr.target": "this.target"
      }
    },
    usesOnChanges: true,
    ngImport: i0
  });
}
i0.ɵɵngDeclareClassMetadata({
  minVersion: "12.0.0",
  version: "21.0.7+sha-2b83091",
  ngImport: i0,
  type: RouterLink,
  decorators: [{
    type: Directive,
    args: [{
      selector: '[routerLink]',
      host: {
        '[attr.href]': 'reactiveHref()'
      }
    }]
  }],
  ctorParameters: () => [{
    type: Router
  }, {
    type: ActivatedRoute
  }, {
    type: undefined,
    decorators: [{
      type: Attribute,
      args: ['tabindex']
    }]
  }, {
    type: i0.Renderer2
  }, {
    type: i0.ElementRef
  }, {
    type: i3.LocationStrategy
  }],
  propDecorators: {
    target: [{
      type: HostBinding,
      args: ['attr.target']
    }, {
      type: Input
    }],
    queryParams: [{
      type: Input
    }],
    fragment: [{
      type: Input
    }],
    queryParamsHandling: [{
      type: Input
    }],
    state: [{
      type: Input
    }],
    info: [{
      type: Input
    }],
    relativeTo: [{
      type: Input
    }],
    preserveFragment: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    skipLocationChange: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    replaceUrl: [{
      type: Input,
      args: [{
        transform: booleanAttribute
      }]
    }],
    routerLink: [{
      type: Input
    }],
    onClick: [{
      type: HostListener,
      args: ['click', ['$event.button', '$event.ctrlKey', '$event.shiftKey', '$event.altKey', '$event.metaKey']]
    }]
  }
});

class RouterLinkActive {
  router;
  element;
  renderer;
  cdr;
  links;
  classes = [];
  routerEventsSubscription;
  linkInputChangesSubscription;
  _isActive = false;
  get isActive() {
    return this._isActive;
  }
  routerLinkActiveOptions = {
    exact: false
  };
  ariaCurrentWhenActive;
  isActiveChange = new EventEmitter();
  link = inject(RouterLink, {
    optional: true
  });
  constructor(router, element, renderer, cdr) {
    this.router = router;
    this.element = element;
    this.renderer = renderer;
    this.cdr = cdr;
    this.routerEventsSubscription = router.events.subscribe(s => {
      if (s instanceof NavigationEnd) {
        this.update();
      }
    });
  }
  ngAfterContentInit() {
    of(this.links.changes, of(null)).pipe(mergeAll()).subscribe(_ => {
      this.update();
      this.subscribeToEachLinkOnChanges();
    });
  }
  subscribeToEachLinkOnChanges() {
    this.linkInputChangesSubscription?.unsubscribe();
    const allLinkChanges = [...this.links.toArray(), this.link].filter(link => !!link).map(link => link.onChanges);
    this.linkInputChangesSubscription = from(allLinkChanges).pipe(mergeAll()).subscribe(link => {
      if (this._isActive !== this.isLinkActive(this.router)(link)) {
        this.update();
      }
    });
  }
  set routerLinkActive(data) {
    const classes = Array.isArray(data) ? data : data.split(' ');
    this.classes = classes.filter(c => !!c);
  }
  ngOnChanges(changes) {
    this.update();
  }
  ngOnDestroy() {
    this.routerEventsSubscription.unsubscribe();
    this.linkInputChangesSubscription?.unsubscribe();
  }
  update() {
    if (!this.links || !this.router.navigated) return;
    queueMicrotask(() => {
      const hasActiveLinks = this.hasActiveLinks();
      this.classes.forEach(c => {
        if (hasActiveLinks) {
          this.renderer.addClass(this.element.nativeElement, c);
        } else {
          this.renderer.removeClass(this.element.nativeElement, c);
        }
      });
      if (hasActiveLinks && this.ariaCurrentWhenActive !== undefined) {
        this.renderer.setAttribute(this.element.nativeElement, 'aria-current', this.ariaCurrentWhenActive.toString());
      } else {
        this.renderer.removeAttribute(this.element.nativeElement, 'aria-current');
      }
      if (this._isActive !== hasActiveLinks) {
        this._isActive = hasActiveLinks;
        this.cdr.markForCheck();
        this.isActiveChange.emit(hasActiveLinks);
      }
    });
  }
  isLinkActive(router) {
    const options = isActiveMatchOptions(this.routerLinkActiveOptions) ? this.routerLinkActiveOptions : this.routerLinkActiveOptions.exact || false;
    return link => {
      const urlTree = link.urlTree;
      return urlTree ? router.isActive(urlTree, options) : false;
    };
  }
  hasActiveLinks() {
    const isActiveCheckFn = this.isLinkActive(this.router);
    return this.link && isActiveCheckFn(this.link) || this.links.some(isActiveCheckFn);
  }
  static ɵfac = i0.ɵɵngDeclareFactory({
    minVersion: "12.0.0",
    version: "21.0.7+sha-2b83091",
    ngImport: i0,
    type: RouterLinkActive,
    deps: [{
      token: Router
    }, {
      token: i0.ElementRef
    }, {
      token: i0.Renderer2
    }, {
      token: i0.ChangeDetectorRef
    }],
    target: i0.ɵɵFactoryTarget.Directive
  });
  static ɵdir = i0.ɵɵngDeclareDirective({
    minVersion: "14.0.0",
    version: "21.0.7+sha-2b83091",
    type: RouterLinkActive,
    isStandalone: true,
    selector: "[routerLinkActive]",
    inputs: {
      routerLinkActiveOptions: "routerLinkActiveOptions",
      ariaCurrentWhenActive: "ariaCurrentWhenActive",
      routerLinkActive: "routerLinkActive"
    },
    outputs: {
      isActiveChange: "isActiveChange"
    },
    queries: [{
      propertyName: "links",
      predicate: RouterLink,
      descendants: true
    }],
    exportAs: ["routerLinkActive"],
    usesOnChanges: true,
    ngImport: i0
  });
}
i0.ɵɵngDeclareClassMetadata({
  minVersion: "12.0.0",
  version: "21.0.7+sha-2b83091",
  ngImport: i0,
  type: RouterLinkActive,
  decorators: [{
    type: Directive,
    args: [{
      selector: '[routerLinkActive]',
      exportAs: 'routerLinkActive'
    }]
  }],
  ctorParameters: () => [{
    type: Router
  }, {
    type: i0.ElementRef
  }, {
    type: i0.Renderer2
  }, {
    type: i0.ChangeDetectorRef
  }],
  propDecorators: {
    links: [{
      type: ContentChildren,
      args: [RouterLink, {
        descendants: true
      }]
    }],
    routerLinkActiveOptions: [{
      type: Input
    }],
    ariaCurrentWhenActive: [{
      type: Input
    }],
    isActiveChange: [{
      type: Output
    }],
    routerLinkActive: [{
      type: Input
    }]
  }
});
function isActiveMatchOptions(options) {
  return !!options.paths;
}

class PreloadingStrategy {}
class PreloadAllModules {
  preload(route, fn) {
    return fn().pipe(catchError(() => of(null)));
  }
  static ɵfac = i0.ɵɵngDeclareFactory({
    minVersion: "12.0.0",
    version: "21.0.7+sha-2b83091",
    ngImport: i0,
    type: PreloadAllModules,
    deps: [],
    target: i0.ɵɵFactoryTarget.Injectable
  });
  static ɵprov = i0.ɵɵngDeclareInjectable({
    minVersion: "12.0.0",
    version: "21.0.7+sha-2b83091",
    ngImport: i0,
    type: PreloadAllModules,
    providedIn: 'root'
  });
}
i0.ɵɵngDeclareClassMetadata({
  minVersion: "12.0.0",
  version: "21.0.7+sha-2b83091",
  ngImport: i0,
  type: PreloadAllModules,
  decorators: [{
    type: Injectable,
    args: [{
      providedIn: 'root'
    }]
  }]
});
class NoPreloading {
  preload(route, fn) {
    return of(null);
  }
  static ɵfac = i0.ɵɵngDeclareFactory({
    minVersion: "12.0.0",
    version: "21.0.7+sha-2b83091",
    ngImport: i0,
    type: NoPreloading,
    deps: [],
    target: i0.ɵɵFactoryTarget.Injectable
  });
  static ɵprov = i0.ɵɵngDeclareInjectable({
    minVersion: "12.0.0",
    version: "21.0.7+sha-2b83091",
    ngImport: i0,
    type: NoPreloading,
    providedIn: 'root'
  });
}
i0.ɵɵngDeclareClassMetadata({
  minVersion: "12.0.0",
  version: "21.0.7+sha-2b83091",
  ngImport: i0,
  type: NoPreloading,
  decorators: [{
    type: Injectable,
    args: [{
      providedIn: 'root'
    }]
  }]
});
class RouterPreloader {
  router;
  injector;
  preloadingStrategy;
  loader;
  subscription;
  constructor(router, injector, preloadingStrategy, loader) {
    this.router = router;
    this.injector = injector;
    this.preloadingStrategy = preloadingStrategy;
    this.loader = loader;
  }
  setUpPreloading() {
    this.subscription = this.router.events.pipe(filter(e => e instanceof NavigationEnd), concatMap(() => this.preload())).subscribe(() => {});
  }
  preload() {
    return this.processRoutes(this.injector, this.router.config);
  }
  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
  processRoutes(injector, routes) {
    const res = [];
    for (const route of routes) {
      if (route.providers && !route._injector) {
        route._injector = createEnvironmentInjector(route.providers, injector, typeof ngDevMode === 'undefined' || ngDevMode ? `Route: ${route.path}` : '');
      }
      const injectorForCurrentRoute = route._injector ?? injector;
      const injectorForChildren = route._loadedInjector ?? injectorForCurrentRoute;
      if (route.loadChildren && !route._loadedRoutes && route.canLoad === undefined || route.loadComponent && !route._loadedComponent) {
        res.push(this.preloadConfig(injectorForCurrentRoute, route));
      }
      if (route.children || route._loadedRoutes) {
        res.push(this.processRoutes(injectorForChildren, route.children ?? route._loadedRoutes));
      }
    }
    return from(res).pipe(mergeAll());
  }
  preloadConfig(injector, route) {
    return this.preloadingStrategy.preload(route, () => {
      let loadedChildren$;
      if (route.loadChildren && route.canLoad === undefined) {
        loadedChildren$ = from(this.loader.loadChildren(injector, route));
      } else {
        loadedChildren$ = of(null);
      }
      const recursiveLoadChildren$ = loadedChildren$.pipe(mergeMap(config => {
        if (config === null) {
          return of(void 0);
        }
        route._loadedRoutes = config.routes;
        route._loadedInjector = config.injector;
        return this.processRoutes(config.injector ?? injector, config.routes);
      }));
      if (route.loadComponent && !route._loadedComponent) {
        const loadComponent$ = this.loader.loadComponent(injector, route);
        return from([recursiveLoadChildren$, loadComponent$]).pipe(mergeAll());
      } else {
        return recursiveLoadChildren$;
      }
    });
  }
  static ɵfac = i0.ɵɵngDeclareFactory({
    minVersion: "12.0.0",
    version: "21.0.7+sha-2b83091",
    ngImport: i0,
    type: RouterPreloader,
    deps: [{
      token: Router
    }, {
      token: i0.EnvironmentInjector
    }, {
      token: PreloadingStrategy
    }, {
      token: RouterConfigLoader
    }],
    target: i0.ɵɵFactoryTarget.Injectable
  });
  static ɵprov = i0.ɵɵngDeclareInjectable({
    minVersion: "12.0.0",
    version: "21.0.7+sha-2b83091",
    ngImport: i0,
    type: RouterPreloader,
    providedIn: 'root'
  });
}
i0.ɵɵngDeclareClassMetadata({
  minVersion: "12.0.0",
  version: "21.0.7+sha-2b83091",
  ngImport: i0,
  type: RouterPreloader,
  decorators: [{
    type: Injectable,
    args: [{
      providedIn: 'root'
    }]
  }],
  ctorParameters: () => [{
    type: Router
  }, {
    type: i0.EnvironmentInjector
  }, {
    type: PreloadingStrategy
  }, {
    type: RouterConfigLoader
  }]
});

const ROUTER_SCROLLER = new InjectionToken(typeof ngDevMode !== 'undefined' && ngDevMode ? 'Router Scroller' : '');
class RouterScroller {
  urlSerializer;
  transitions;
  viewportScroller;
  zone;
  options;
  routerEventsSubscription;
  scrollEventsSubscription;
  lastId = 0;
  lastSource = IMPERATIVE_NAVIGATION;
  restoredId = 0;
  store = {};
  constructor(urlSerializer, transitions, viewportScroller, zone, options = {}) {
    this.urlSerializer = urlSerializer;
    this.transitions = transitions;
    this.viewportScroller = viewportScroller;
    this.zone = zone;
    this.options = options;
    options.scrollPositionRestoration ||= 'disabled';
    options.anchorScrolling ||= 'disabled';
  }
  init() {
    if (this.options.scrollPositionRestoration !== 'disabled') {
      this.viewportScroller.setHistoryScrollRestoration('manual');
    }
    this.routerEventsSubscription = this.createScrollEvents();
    this.scrollEventsSubscription = this.consumeScrollEvents();
  }
  createScrollEvents() {
    return this.transitions.events.subscribe(e => {
      if (e instanceof NavigationStart) {
        this.store[this.lastId] = this.viewportScroller.getScrollPosition();
        this.lastSource = e.navigationTrigger;
        this.restoredId = e.restoredState ? e.restoredState.navigationId : 0;
      } else if (e instanceof NavigationEnd) {
        this.lastId = e.id;
        this.scheduleScrollEvent(e, this.urlSerializer.parse(e.urlAfterRedirects).fragment);
      } else if (e instanceof NavigationSkipped && e.code === NavigationSkippedCode.IgnoredSameUrlNavigation) {
        this.lastSource = undefined;
        this.restoredId = 0;
        this.scheduleScrollEvent(e, this.urlSerializer.parse(e.url).fragment);
      }
    });
  }
  consumeScrollEvents() {
    return this.transitions.events.subscribe(e => {
      if (!(e instanceof Scroll)) return;
      const instantScroll = {
        behavior: 'instant'
      };
      if (e.position) {
        if (this.options.scrollPositionRestoration === 'top') {
          this.viewportScroller.scrollToPosition([0, 0], instantScroll);
        } else if (this.options.scrollPositionRestoration === 'enabled') {
          this.viewportScroller.scrollToPosition(e.position, instantScroll);
        }
      } else {
        if (e.anchor && this.options.anchorScrolling === 'enabled') {
          this.viewportScroller.scrollToAnchor(e.anchor);
        } else if (this.options.scrollPositionRestoration !== 'disabled') {
          this.viewportScroller.scrollToPosition([0, 0]);
        }
      }
    });
  }
  scheduleScrollEvent(routerEvent, anchor) {
    this.zone.runOutsideAngular(async () => {
      await new Promise(resolve => {
        setTimeout(resolve);
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(resolve);
        }
      });
      this.zone.run(() => {
        this.transitions.events.next(new Scroll(routerEvent, this.lastSource === 'popstate' ? this.store[this.restoredId] : null, anchor));
      });
    });
  }
  ngOnDestroy() {
    this.routerEventsSubscription?.unsubscribe();
    this.scrollEventsSubscription?.unsubscribe();
  }
  static ɵfac = i0.ɵɵngDeclareFactory({
    minVersion: "12.0.0",
    version: "21.0.7+sha-2b83091",
    ngImport: i0,
    type: RouterScroller,
    deps: "invalid",
    target: i0.ɵɵFactoryTarget.Injectable
  });
  static ɵprov = i0.ɵɵngDeclareInjectable({
    minVersion: "12.0.0",
    version: "21.0.7+sha-2b83091",
    ngImport: i0,
    type: RouterScroller
  });
}
i0.ɵɵngDeclareClassMetadata({
  minVersion: "12.0.0",
  version: "21.0.7+sha-2b83091",
  ngImport: i0,
  type: RouterScroller,
  decorators: [{
    type: Injectable
  }],
  ctorParameters: () => [{
    type: UrlSerializer
  }, {
    type: NavigationTransitions
  }, {
    type: i3.ViewportScroller
  }, {
    type: i0.NgZone
  }, {
    type: undefined
  }]
});

function getLoadedRoutes(route) {
  return route._loadedRoutes;
}
function getRouterInstance(injector) {
  return injector.get(Router, null, {
    optional: true
  });
}
function navigateByUrl(router, url) {
  if (!(router instanceof Router)) {
    throw new Error('The provided router is not an Angular Router.');
  }
  return router.navigateByUrl(url);
}

class NavigationStateManager extends HistoryStateManager {
  navigation = inject(PlatformNavigation);
  registerNonRouterCurrentEntryChangeListener(listener) {
    return this.location.subscribe(event => {
      if (event['type'] === 'popstate') {
        const state = this.navigation.currentEntry?.getState();
        listener(event['url'], state, 'popstate');
      }
    });
  }
  static ɵfac = i0.ɵɵngDeclareFactory({
    minVersion: "12.0.0",
    version: "21.0.7+sha-2b83091",
    ngImport: i0,
    type: NavigationStateManager,
    deps: null,
    target: i0.ɵɵFactoryTarget.Injectable
  });
  static ɵprov = i0.ɵɵngDeclareInjectable({
    minVersion: "12.0.0",
    version: "21.0.7+sha-2b83091",
    ngImport: i0,
    type: NavigationStateManager,
    providedIn: 'root'
  });
}
i0.ɵɵngDeclareClassMetadata({
  minVersion: "12.0.0",
  version: "21.0.7+sha-2b83091",
  ngImport: i0,
  type: NavigationStateManager,
  decorators: [{
    type: Injectable,
    args: [{
      providedIn: 'root'
    }]
  }]
});

function provideRouter(routes, ...features) {
  if (typeof ngDevMode === 'undefined' || ngDevMode) {
    _publishExternalGlobalUtil('ɵgetLoadedRoutes', getLoadedRoutes);
    _publishExternalGlobalUtil('ɵgetRouterInstance', getRouterInstance);
    _publishExternalGlobalUtil('ɵnavigateByUrl', navigateByUrl);
  }
  return makeEnvironmentProviders([{
    provide: ROUTES,
    multi: true,
    useValue: routes
  }, typeof ngDevMode === 'undefined' || ngDevMode ? {
    provide: ROUTER_IS_PROVIDED,
    useValue: true
  } : [], {
    provide: ActivatedRoute,
    useFactory: rootRoute
  }, {
    provide: APP_BOOTSTRAP_LISTENER,
    multi: true,
    useFactory: getBootstrapListener
  }, features.map(feature => feature.ɵproviders)]);
}
function rootRoute() {
  return inject(Router).routerState.root;
}
function routerFeature(kind, providers) {
  return {
    ɵkind: kind,
    ɵproviders: providers
  };
}
const ROUTER_IS_PROVIDED = new InjectionToken(typeof ngDevMode !== 'undefined' && ngDevMode ? 'Router is provided' : '', {
  factory: () => false
});
const routerIsProvidedDevModeCheck = {
  provide: ENVIRONMENT_INITIALIZER,
  multi: true,
  useFactory() {
    return () => {
      if (!inject(ROUTER_IS_PROVIDED)) {
        console.warn('`provideRoutes` was called without `provideRouter` or `RouterModule.forRoot`. ' + 'This is likely a mistake.');
      }
    };
  }
};
function provideRoutes(routes) {
  return [{
    provide: ROUTES,
    multi: true,
    useValue: routes
  }, typeof ngDevMode === 'undefined' || ngDevMode ? routerIsProvidedDevModeCheck : []];
}
function withInMemoryScrolling(options = {}) {
  const providers = [{
    provide: ROUTER_SCROLLER,
    useFactory: () => {
      const viewportScroller = inject(ViewportScroller);
      const zone = inject(NgZone);
      const transitions = inject(NavigationTransitions);
      const urlSerializer = inject(UrlSerializer);
      return new RouterScroller(urlSerializer, transitions, viewportScroller, zone, options);
    }
  }];
  return routerFeature(4, providers);
}
function withPlatformNavigation() {
  const devModeLocationCheck = typeof ngDevMode === 'undefined' || ngDevMode ? [provideEnvironmentInitializer(() => {
    const locationInstance = inject(Location);
    if (!(locationInstance instanceof _NavigationAdapterForLocation)) {
      const locationConstructorName = locationInstance.constructor.name;
      let message = `'withPlatformNavigation' provides a 'Location' implementation that ensures navigation APIs are consistently used.` + ` An instance of ${locationConstructorName} was found instead.`;
      if (locationConstructorName === 'SpyLocation') {
        message += ` One of 'RouterTestingModule' or 'provideLocationMocks' was likely used. 'withPlatformNavigation' does not work with these because they override the Location implementation.`;
      }
      throw new Error(message);
    }
  })] : [];
  const providers = [{
    provide: StateManager,
    useExisting: NavigationStateManager
  }, {
    provide: Location,
    useClass: _NavigationAdapterForLocation
  }, devModeLocationCheck];
  return routerFeature(4, providers);
}
function getBootstrapListener() {
  const injector = inject(Injector);
  return bootstrappedComponentRef => {
    const ref = injector.get(ApplicationRef);
    if (bootstrappedComponentRef !== ref.components[0]) {
      return;
    }
    const router = injector.get(Router);
    const bootstrapDone = injector.get(BOOTSTRAP_DONE);
    if (injector.get(INITIAL_NAVIGATION) === 1) {
      router.initialNavigation();
    }
    injector.get(ROUTER_PRELOADER, null, {
      optional: true
    })?.setUpPreloading();
    injector.get(ROUTER_SCROLLER, null, {
      optional: true
    })?.init();
    router.resetRootComponentType(ref.componentTypes[0]);
    if (!bootstrapDone.closed) {
      bootstrapDone.next();
      bootstrapDone.complete();
      bootstrapDone.unsubscribe();
    }
  };
}
const BOOTSTRAP_DONE = new InjectionToken(typeof ngDevMode === 'undefined' || ngDevMode ? 'bootstrap done indicator' : '', {
  factory: () => {
    return new Subject();
  }
});
const INITIAL_NAVIGATION = new InjectionToken(typeof ngDevMode === 'undefined' || ngDevMode ? 'initial navigation' : '', {
  factory: () => 1
});
function withEnabledBlockingInitialNavigation() {
  const providers = [{
    provide: _IS_ENABLED_BLOCKING_INITIAL_NAVIGATION,
    useValue: true
  }, {
    provide: INITIAL_NAVIGATION,
    useValue: 0
  }, provideAppInitializer(() => {
    const injector = inject(Injector);
    const locationInitialized = injector.get(LOCATION_INITIALIZED, Promise.resolve());
    return locationInitialized.then(() => {
      return new Promise(resolve => {
        const router = injector.get(Router);
        const bootstrapDone = injector.get(BOOTSTRAP_DONE);
        afterNextNavigation(router, () => {
          resolve(true);
        });
        injector.get(NavigationTransitions).afterPreactivation = () => {
          resolve(true);
          return bootstrapDone.closed ? of(void 0) : bootstrapDone;
        };
        router.initialNavigation();
      });
    });
  })];
  return routerFeature(2, providers);
}
function withDisabledInitialNavigation() {
  const providers = [provideAppInitializer(() => {
    inject(Router).setUpLocationChangeListener();
  }), {
    provide: INITIAL_NAVIGATION,
    useValue: 2
  }];
  return routerFeature(3, providers);
}
function withDebugTracing() {
  let providers = [];
  if (typeof ngDevMode === 'undefined' || ngDevMode) {
    providers = [{
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useFactory: () => {
        const router = inject(Router);
        return () => router.events.subscribe(e => {
          console.group?.(`Router Event: ${e.constructor.name}`);
          console.log(stringifyEvent(e));
          console.log(e);
          console.groupEnd?.();
        });
      }
    }];
  } else {
    providers = [];
  }
  return routerFeature(1, providers);
}
const ROUTER_PRELOADER = new InjectionToken(typeof ngDevMode === 'undefined' || ngDevMode ? 'router preloader' : '');
function withPreloading(preloadingStrategy) {
  const providers = [{
    provide: ROUTER_PRELOADER,
    useExisting: RouterPreloader
  }, {
    provide: PreloadingStrategy,
    useExisting: preloadingStrategy
  }];
  return routerFeature(0, providers);
}
function withRouterConfig(options) {
  const providers = [{
    provide: ROUTER_CONFIGURATION,
    useValue: options
  }];
  return routerFeature(5, providers);
}
function withHashLocation() {
  const providers = [{
    provide: LocationStrategy,
    useClass: HashLocationStrategy
  }];
  return routerFeature(6, providers);
}
function withNavigationErrorHandler(handler) {
  const providers = [{
    provide: NAVIGATION_ERROR_HANDLER,
    useValue: handler
  }];
  return routerFeature(7, providers);
}
function withComponentInputBinding() {
  const providers = [RoutedComponentInputBinder, {
    provide: INPUT_BINDER,
    useExisting: RoutedComponentInputBinder
  }];
  return routerFeature(8, providers);
}
function withViewTransitions(options) {
  _performanceMarkFeature('NgRouterViewTransitions');
  const providers = [{
    provide: CREATE_VIEW_TRANSITION,
    useValue: createViewTransition
  }, {
    provide: VIEW_TRANSITION_OPTIONS,
    useValue: {
      skipNextTransition: !!options?.skipInitialTransition,
      ...options
    }
  }];
  return routerFeature(9, providers);
}

const ROUTER_DIRECTIVES = [RouterOutlet, RouterLink, RouterLinkActive, _EmptyOutletComponent];
const ROUTER_FORROOT_GUARD = new InjectionToken(typeof ngDevMode === 'undefined' || ngDevMode ? 'router duplicate forRoot guard' : '');
const ROUTER_PROVIDERS = [Location, {
  provide: UrlSerializer,
  useClass: DefaultUrlSerializer
}, Router, ChildrenOutletContexts, {
  provide: ActivatedRoute,
  useFactory: rootRoute
}, RouterConfigLoader, typeof ngDevMode === 'undefined' || ngDevMode ? {
  provide: ROUTER_IS_PROVIDED,
  useValue: true
} : []];
class RouterModule {
  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      inject(ROUTER_FORROOT_GUARD, {
        optional: true
      });
    }
  }
  static forRoot(routes, config) {
    return {
      ngModule: RouterModule,
      providers: [ROUTER_PROVIDERS, typeof ngDevMode === 'undefined' || ngDevMode ? config?.enableTracing ? withDebugTracing().ɵproviders : [] : [], {
        provide: ROUTES,
        multi: true,
        useValue: routes
      }, typeof ngDevMode === 'undefined' || ngDevMode ? {
        provide: ROUTER_FORROOT_GUARD,
        useFactory: provideForRootGuard
      } : [], config?.errorHandler ? {
        provide: NAVIGATION_ERROR_HANDLER,
        useValue: config.errorHandler
      } : [], {
        provide: ROUTER_CONFIGURATION,
        useValue: config ? config : {}
      }, config?.useHash ? provideHashLocationStrategy() : providePathLocationStrategy(), provideRouterScroller(), config?.preloadingStrategy ? withPreloading(config.preloadingStrategy).ɵproviders : [], config?.initialNavigation ? provideInitialNavigation(config) : [], config?.bindToComponentInputs ? withComponentInputBinding().ɵproviders : [], config?.enableViewTransitions ? withViewTransitions().ɵproviders : [], provideRouterInitializer()]
    };
  }
  static forChild(routes) {
    return {
      ngModule: RouterModule,
      providers: [{
        provide: ROUTES,
        multi: true,
        useValue: routes
      }]
    };
  }
  static ɵfac = i0.ɵɵngDeclareFactory({
    minVersion: "12.0.0",
    version: "21.0.7+sha-2b83091",
    ngImport: i0,
    type: RouterModule,
    deps: [],
    target: i0.ɵɵFactoryTarget.NgModule
  });
  static ɵmod = i0.ɵɵngDeclareNgModule({
    minVersion: "14.0.0",
    version: "21.0.7+sha-2b83091",
    ngImport: i0,
    type: RouterModule,
    imports: [RouterOutlet, RouterLink, RouterLinkActive, _EmptyOutletComponent],
    exports: [RouterOutlet, RouterLink, RouterLinkActive, _EmptyOutletComponent]
  });
  static ɵinj = i0.ɵɵngDeclareInjector({
    minVersion: "12.0.0",
    version: "21.0.7+sha-2b83091",
    ngImport: i0,
    type: RouterModule
  });
}
i0.ɵɵngDeclareClassMetadata({
  minVersion: "12.0.0",
  version: "21.0.7+sha-2b83091",
  ngImport: i0,
  type: RouterModule,
  decorators: [{
    type: NgModule,
    args: [{
      imports: ROUTER_DIRECTIVES,
      exports: ROUTER_DIRECTIVES
    }]
  }],
  ctorParameters: () => []
});
function provideRouterScroller() {
  return {
    provide: ROUTER_SCROLLER,
    useFactory: () => {
      const viewportScroller = inject(ViewportScroller);
      const zone = inject(NgZone);
      const config = inject(ROUTER_CONFIGURATION);
      const transitions = inject(NavigationTransitions);
      const urlSerializer = inject(UrlSerializer);
      if (config.scrollOffset) {
        viewportScroller.setOffset(config.scrollOffset);
      }
      return new RouterScroller(urlSerializer, transitions, viewportScroller, zone, config);
    }
  };
}
function provideHashLocationStrategy() {
  return {
    provide: LocationStrategy,
    useClass: HashLocationStrategy
  };
}
function providePathLocationStrategy() {
  return {
    provide: LocationStrategy,
    useClass: PathLocationStrategy
  };
}
function provideForRootGuard() {
  const router = inject(Router, {
    optional: true,
    skipSelf: true
  });
  if (router) {
    throw new _RuntimeError(4007, `The Router was provided more than once. This can happen if 'forRoot' is used outside of the root injector.` + ` Lazy loaded modules should use RouterModule.forChild() instead.`);
  }
  return 'guarded';
}
function provideInitialNavigation(config) {
  return [config.initialNavigation === 'disabled' ? withDisabledInitialNavigation().ɵproviders : [], config.initialNavigation === 'enabledBlocking' ? withEnabledBlockingInitialNavigation().ɵproviders : []];
}
const ROUTER_INITIALIZER = new InjectionToken(typeof ngDevMode === 'undefined' || ngDevMode ? 'Router Initializer' : '');
function provideRouterInitializer() {
  return [{
    provide: ROUTER_INITIALIZER,
    useFactory: getBootstrapListener
  }, {
    provide: APP_BOOTSTRAP_LISTENER,
    multi: true,
    useExisting: ROUTER_INITIALIZER
  }];
}

export { NoPreloading, PreloadAllModules, PreloadingStrategy, ROUTER_INITIALIZER, ROUTER_PROVIDERS, RouterLink, RouterLinkActive, RouterModule, RouterPreloader, provideRouter, provideRoutes, withComponentInputBinding, withDebugTracing, withDisabledInitialNavigation, withEnabledBlockingInitialNavigation, withHashLocation, withInMemoryScrolling, withNavigationErrorHandler, withPlatformNavigation, withPreloading, withRouterConfig, withViewTransitions };
//# sourceMappingURL=_router_module-chunk.mjs.map
