import { ApplicationRef, ComponentResolver } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterOutletMap } from './router';
import { RouteSegment } from './segments';
import { RouterUrlSerializer } from './router_url_serializer';
/**
 * The Platform agnostic ROUTER PROVIDERS
 */
export declare const ROUTER_PROVIDERS_COMMON: any[];
export declare function routerFactory(app: ApplicationRef, componentResolver: ComponentResolver, urlSerializer: RouterUrlSerializer, routerOutletMap: RouterOutletMap, location: Location): Router;
export declare function routeSegmentFactory(router: Router): RouteSegment;
