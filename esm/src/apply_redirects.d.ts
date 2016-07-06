/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/concatAll';
import { Observable } from 'rxjs/Observable';
import { RouterConfig } from './config';
import { RouterConfigLoader } from './router_config_loader';
import { UrlTree } from './url_tree';
export declare function applyRedirects(configLoader: RouterConfigLoader, urlTree: UrlTree, config: RouterConfig): Observable<UrlTree>;
