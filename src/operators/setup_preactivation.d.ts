/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Injector } from '@angular/core';
import { OperatorFunction } from 'rxjs';
import { Event } from '../events';
import { PreActivation } from '../pre_activation';
import { ChildrenOutletContexts } from '../router_outlet_context';
import { RouterStateSnapshot } from '../router_state';
export declare const setupPreactivation: (rootContexts: ChildrenOutletContexts, currentSnapshot: RouterStateSnapshot, moduleInjector: Injector, forwardEvent?: ((evt: Event) => void) | undefined) => OperatorFunction<RouterStateSnapshot, PreActivation>;
