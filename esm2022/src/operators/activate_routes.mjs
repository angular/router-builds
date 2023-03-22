/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { map } from 'rxjs/operators';
import { ActivationEnd, ChildActivationEnd } from '../events';
import { advanceActivatedRoute } from '../router_state';
import { getClosestRouteInjector } from '../utils/config';
import { nodeChildrenAsMap } from '../utils/tree';
export const activateRoutes = (rootContexts, routeReuseStrategy, forwardEvent) => map(t => {
    new ActivateRoutes(routeReuseStrategy, t.targetRouterState, t.currentRouterState, forwardEvent)
        .activate(rootContexts);
    return t;
});
export class ActivateRoutes {
    constructor(routeReuseStrategy, futureState, currState, forwardEvent) {
        this.routeReuseStrategy = routeReuseStrategy;
        this.futureState = futureState;
        this.currState = currState;
        this.forwardEvent = forwardEvent;
    }
    activate(parentContexts) {
        const futureRoot = this.futureState._root;
        const currRoot = this.currState ? this.currState._root : null;
        this.deactivateChildRoutes(futureRoot, currRoot, parentContexts);
        advanceActivatedRoute(this.futureState.root);
        this.activateChildRoutes(futureRoot, currRoot, parentContexts);
    }
    // De-activate the child route that are not re-used for the future state
    deactivateChildRoutes(futureNode, currNode, contexts) {
        const children = nodeChildrenAsMap(currNode);
        // Recurse on the routes active in the future state to de-activate deeper children
        futureNode.children.forEach(futureChild => {
            const childOutletName = futureChild.value.outlet;
            this.deactivateRoutes(futureChild, children[childOutletName], contexts);
            delete children[childOutletName];
        });
        // De-activate the routes that will not be re-used
        Object.values(children).forEach((v) => {
            this.deactivateRouteAndItsChildren(v, contexts);
        });
    }
    deactivateRoutes(futureNode, currNode, parentContext) {
        const future = futureNode.value;
        const curr = currNode ? currNode.value : null;
        if (future === curr) {
            // Reusing the node, check to see if the children need to be de-activated
            if (future.component) {
                // If we have a normal route, we need to go through an outlet.
                const context = parentContext.getContext(future.outlet);
                if (context) {
                    this.deactivateChildRoutes(futureNode, currNode, context.children);
                }
            }
            else {
                // if we have a componentless route, we recurse but keep the same outlet map.
                this.deactivateChildRoutes(futureNode, currNode, parentContext);
            }
        }
        else {
            if (curr) {
                // Deactivate the current route which will not be re-used
                this.deactivateRouteAndItsChildren(currNode, parentContext);
            }
        }
    }
    deactivateRouteAndItsChildren(route, parentContexts) {
        // If there is no component, the Route is never attached to an outlet (because there is no
        // component to attach).
        if (route.value.component && this.routeReuseStrategy.shouldDetach(route.value.snapshot)) {
            this.detachAndStoreRouteSubtree(route, parentContexts);
        }
        else {
            this.deactivateRouteAndOutlet(route, parentContexts);
        }
    }
    detachAndStoreRouteSubtree(route, parentContexts) {
        const context = parentContexts.getContext(route.value.outlet);
        const contexts = context && route.value.component ? context.children : parentContexts;
        const children = nodeChildrenAsMap(route);
        for (const childOutlet of Object.keys(children)) {
            this.deactivateRouteAndItsChildren(children[childOutlet], contexts);
        }
        if (context && context.outlet) {
            const componentRef = context.outlet.detach();
            const contexts = context.children.onOutletDeactivated();
            this.routeReuseStrategy.store(route.value.snapshot, { componentRef, route, contexts });
        }
    }
    deactivateRouteAndOutlet(route, parentContexts) {
        const context = parentContexts.getContext(route.value.outlet);
        // The context could be `null` if we are on a componentless route but there may still be
        // children that need deactivating.
        const contexts = context && route.value.component ? context.children : parentContexts;
        const children = nodeChildrenAsMap(route);
        for (const childOutlet of Object.keys(children)) {
            this.deactivateRouteAndItsChildren(children[childOutlet], contexts);
        }
        if (context && context.outlet) {
            // Destroy the component
            context.outlet.deactivate();
            // Destroy the contexts for all the outlets that were in the component
            context.children.onOutletDeactivated();
            // Clear the information about the attached component on the context but keep the reference to
            // the outlet.
            context.attachRef = null;
            context.route = null;
        }
    }
    activateChildRoutes(futureNode, currNode, contexts) {
        const children = nodeChildrenAsMap(currNode);
        futureNode.children.forEach(c => {
            this.activateRoutes(c, children[c.value.outlet], contexts);
            this.forwardEvent(new ActivationEnd(c.value.snapshot));
        });
        if (futureNode.children.length) {
            this.forwardEvent(new ChildActivationEnd(futureNode.value.snapshot));
        }
    }
    activateRoutes(futureNode, currNode, parentContexts) {
        const future = futureNode.value;
        const curr = currNode ? currNode.value : null;
        advanceActivatedRoute(future);
        // reusing the node
        if (future === curr) {
            if (future.component) {
                // If we have a normal route, we need to go through an outlet.
                const context = parentContexts.getOrCreateContext(future.outlet);
                this.activateChildRoutes(futureNode, currNode, context.children);
            }
            else {
                // if we have a componentless route, we recurse but keep the same outlet map.
                this.activateChildRoutes(futureNode, currNode, parentContexts);
            }
        }
        else {
            if (future.component) {
                // if we have a normal route, we need to place the component into the outlet and recurse.
                const context = parentContexts.getOrCreateContext(future.outlet);
                if (this.routeReuseStrategy.shouldAttach(future.snapshot)) {
                    const stored = this.routeReuseStrategy.retrieve(future.snapshot);
                    this.routeReuseStrategy.store(future.snapshot, null);
                    context.children.onOutletReAttached(stored.contexts);
                    context.attachRef = stored.componentRef;
                    context.route = stored.route.value;
                    if (context.outlet) {
                        // Attach right away when the outlet has already been instantiated
                        // Otherwise attach from `RouterOutlet.ngOnInit` when it is instantiated
                        context.outlet.attach(stored.componentRef, stored.route.value);
                    }
                    advanceActivatedRoute(stored.route.value);
                    this.activateChildRoutes(futureNode, null, context.children);
                }
                else {
                    const injector = getClosestRouteInjector(future.snapshot);
                    context.attachRef = null;
                    context.route = future;
                    context.injector = injector;
                    if (context.outlet) {
                        // Activate the outlet when it has already been instantiated
                        // Otherwise it will get activated from its `ngOnInit` when instantiated
                        context.outlet.activateWith(future, context.injector);
                    }
                    this.activateChildRoutes(futureNode, null, context.children);
                }
            }
            else {
                // if we have a componentless route, we recurse but keep the same outlet map.
                this.activateChildRoutes(futureNode, null, parentContexts);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZhdGVfcm91dGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcm91dGVyL3NyYy9vcGVyYXRvcnMvYWN0aXZhdGVfcm91dGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUdILE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUVuQyxPQUFPLEVBQUMsYUFBYSxFQUFFLGtCQUFrQixFQUFRLE1BQU0sV0FBVyxDQUFDO0FBSW5FLE9BQU8sRUFBaUIscUJBQXFCLEVBQWMsTUFBTSxpQkFBaUIsQ0FBQztBQUNuRixPQUFPLEVBQUMsdUJBQXVCLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUN4RCxPQUFPLEVBQUMsaUJBQWlCLEVBQVcsTUFBTSxlQUFlLENBQUM7QUFFMUQsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUN2QixDQUFDLFlBQW9DLEVBQUUsa0JBQXNDLEVBQzVFLFlBQWtDLEVBQWtELEVBQUUsQ0FDbkYsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO0lBQ04sSUFBSSxjQUFjLENBQ2Qsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLGlCQUFrQixFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxZQUFZLENBQUM7U0FDNUUsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzVCLE9BQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQyxDQUFDLENBQUM7QUFFWCxNQUFNLE9BQU8sY0FBYztJQUN6QixZQUNZLGtCQUFzQyxFQUFVLFdBQXdCLEVBQ3hFLFNBQXNCLEVBQVUsWUFBa0M7UUFEbEUsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUFVLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ3hFLGNBQVMsR0FBVCxTQUFTLENBQWE7UUFBVSxpQkFBWSxHQUFaLFlBQVksQ0FBc0I7SUFBRyxDQUFDO0lBRWxGLFFBQVEsQ0FBQyxjQUFzQztRQUM3QyxNQUFN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QUFNO2dCQUNMLDZFQUE2RTtnQkFDN0UsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7YUFDNUQ7U0FDRjtJQUNILENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge01vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge21hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge0FjdGl2YXRpb25FbmQsIENoaWxkQWN0aXZhdGlvbkVuZCwgRXZlbnR9IGZyb20gJy4uL2V2ZW50cyc7XG5pbXBvcnQge05hdmlnYXRpb25UcmFuc2l0aW9ufSBmcm9tICcuLi9uYXZpZ2F0aW9uX3RyYW5zaXRpb24nO1xuaW1wb3J0IHtEZXRhY2hlZFJvdXRlSGFuZGxlSW50ZXJuYWwsIFJvdXRlUmV1c2VTdHJhdGVneX0gZnJvbSAnLi4vcm91dGVfcmV1c2Vfc3RyYXRlZ3knO1xuaW1wb3J0IHtDaGlsZHJlbk91dGxldENvbnRleHRzfSBmcm9tICcuLi9yb3V0ZXJfb3V0bGV0X2NvbnRleHQnO1xuaW1wb3J0IHtBY3RpdmF0ZWRSb3V0ZSwgYWR2YW5jZUFjdGl2YXRlZFJvdXRlLCBSb3V0ZXJTdGF0ZX0gZnJvbSAnLi4vcm91dGVyX3N0YXRlJztcbmltcG9ydCB7Z2V0Q2xvc2VzdFJvdXRlSW5qZWN0b3J9IGZyb20gJy4uL3V0aWxzL2NvbmZpZyc7XG5pbXBvcnQge25vZGVDaGlsZHJlbkFzTWFwLCBUcmVlTm9kZX0gZnJvbSAnLi4vdXRpbHMvdHJlZSc7XG5cbmV4cG9ydCBjb25zdCBhY3RpdmF0ZVJvdXRlcyA9XG4gICAgKHJvb3RDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cywgcm91dGVSZXVzZVN0cmF0ZWd5OiBSb3V0ZVJldXNlU3RyYXRlZ3ksXG4gICAgIGZvcndhcmRFdmVudDogKGV2dDogRXZlbnQpID0+IHZvaWQpOiBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248TmF2aWdhdGlvblRyYW5zaXRpb24+ID0+XG4gICAgICAgIG1hcCh0ID0+IHtcbiAgICAgICAgICBuZXcgQWN0aXZhdGVSb3V0ZXMoXG4gICAgICAgICAgICAgIHJvdXRlUmV1c2VTdHJhdGVneSwgdC50YXJnZXRSb3V0ZXJTdGF0ZSEsIHQuY3VycmVudFJvdXRlclN0YXRlLCBmb3J3YXJkRXZlbnQpXG4gICAgICAgICAgICAgIC5hY3RpdmF0ZShyb290Q29udGV4dHMpO1xuICAgICAgICAgIHJldHVybiB0O1xuICAgICAgICB9KTtcblxuZXhwb3J0IGNsYXNzIEFjdGl2YXRlUm91dGVzIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJvdXRlUmV1c2VTdHJhdGVneTogUm91dGVSZXVzZVN0cmF0ZWd5LCBwcml2YXRlIGZ1dHVyZVN0YXRlOiBSb3V0ZXJTdGF0ZSxcbiAgICAgIHByaXZhdGUgY3VyclN0YXRlOiBSb3V0ZXJTdGF0ZSwgcHJpdmF0ZSBmb3J3YXJkRXZlbnQ6IChldnQ6IEV2ZW50KSA9PiB2b2lkKSB7fVxuXG4gIGFjdGl2YXRlKHBhcmVudENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzKTogdm9pZCB7XG4gICAgY29uc3QgZnV0dXJlUm9vdCA9IHRoaXMuZnV0dXJlU3RhdGUuX3Jvb3Q7XG4gICAgY29uc3QgY3VyclJvb3QgPSB0aGlzLmN1cnJTdGF0ZSA/IHRoaXMuY3VyclN0YXRlLl9yb290IDogbnVsbDtcblxuICAgIHRoaXMuZGVhY3RpdmF0ZUNoaWxkUm91dGVzKGZ1dHVyZVJvb3QsIGN1cnJSb290LCBwYXJlbnRDb250ZXh0cyk7XG4gICAgYWR2YW5jZUFjdGl2YXRlZFJvdXRlKHRoaXMuZnV0dXJlU3RhdGUucm9vdCk7XG4gICAgdGhpcy5hY3RpdmF0ZUNoaWxkUm91dGVzKGZ1dHVyZVJvb3QsIGN1cnJSb290LCBwYXJlbnRDb250ZXh0cyk7XG4gIH1cblxuICAvLyBEZS1hY3RpdmF0ZSB0aGUgY2hpbGQgcm91dGUgdGhhdCBhcmUgbm90IHJlLXVzZWQgZm9yIHRoZSBmdXR1cmUgc3RhdGVcbiAgcHJpdmF0ZSBkZWFjdGl2YXRlQ2hpbGRSb3V0ZXMoXG4gICAgICBmdXR1cmVOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT4sIGN1cnJOb2RlOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT58bnVsbCxcbiAgICAgIGNvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzKTogdm9pZCB7XG4gICAgY29uc3QgY2hpbGRyZW46IHtbb3V0bGV0TmFtZTogc3RyaW5nXTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+fSA9IG5vZGVDaGlsZHJlbkFzTWFwKGN1cnJOb2RlKTtcblxuICAgIC8vIFJlY3Vyc2Ugb24gdGhlIHJvdXRlcyBhY3RpdmUgaW4gdGhlIGZ1dHVyZSBzdGF0ZSB0byBkZS1hY3RpdmF0ZSBkZWVwZXIgY2hpbGRyZW5cbiAgICBmdXR1cmVOb2RlLmNoaWxkcmVuLmZvckVhY2goZnV0dXJlQ2hpbGQgPT4ge1xuICAgICAgY29uc3QgY2hpbGRPdXRsZXROYW1lID0gZnV0dXJlQ2hpbGQudmFsdWUub3V0bGV0O1xuICAgICAgdGhpcy5kZWFjdGl2YXRlUm91dGVzKGZ1dHVyZUNoaWxkLCBjaGlsZHJlbltjaGlsZE91dGxldE5hbWVdLCBjb250ZXh0cyk7XG4gICAgICBkZWxldGUgY2hpbGRyZW5bY2hpbGRPdXRsZXROYW1lXTtcbiAgICB9KTtcblxuICAgIC8vIERlLWFjdGl2YXRlIHRoZSByb3V0ZXMgdGhhdCB3aWxsIG5vdCBiZSByZS11c2VkXG4gICAgT2JqZWN0LnZhbHVlcyhjaGlsZHJlbikuZm9yRWFjaCgodjogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+KSA9PiB7XG4gICAgICB0aGlzLmRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKHYsIGNvbnRleHRzKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZGVhY3RpdmF0ZVJvdXRlcyhcbiAgICAgIGZ1dHVyZU5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPiwgY3Vyck5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPixcbiAgICAgIHBhcmVudENvbnRleHQ6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICBjb25zdCBmdXR1cmUgPSBmdXR1cmVOb2RlLnZhbHVlO1xuICAgIGNvbnN0IGN1cnIgPSBjdXJyTm9kZSA/IGN1cnJOb2RlLnZhbHVlIDogbnVsbDtcblxuICAgIGlmIChmdXR1cmUgPT09IGN1cnIpIHtcbiAgICAgIC8vIFJldXNpbmcgdGhlIG5vZGUsIGNoZWNrIHRvIHNlZSBpZiB0aGUgY2hpbGRyZW4gbmVlZCB0byBiZSBkZS1hY3RpdmF0ZWRcbiAgICAgIGlmIChmdXR1cmUuY29tcG9uZW50KSB7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgYSBub3JtYWwgcm91dGUsIHdlIG5lZWQgdG8gZ28gdGhyb3VnaCBhbiBvdXRsZXQuXG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBwYXJlbnRDb250ZXh0LmdldENvbnRleHQoZnV0dXJlLm91dGxldCk7XG4gICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgdGhpcy5kZWFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlTm9kZSwgY3Vyck5vZGUsIGNvbnRleHQuY2hpbGRyZW4pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZiB3ZSBoYXZlIGEgY29tcG9uZW50bGVzcyByb3V0ZSwgd2UgcmVjdXJzZSBidXQga2VlcCB0aGUgc2FtZSBvdXRsZXQgbWFwLlxuICAgICAgICB0aGlzLmRlYWN0aXZhdGVDaGlsZFJvdXRlcyhmdXR1cmVOb2RlLCBjdXJyTm9kZSwgcGFyZW50Q29udGV4dCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChjdXJyKSB7XG4gICAgICAgIC8vIERlYWN0aXZhdGUgdGhlIGN1cnJlbnQgcm91dGUgd2hpY2ggd2lsbCBub3QgYmUgcmUtdXNlZFxuICAgICAgICB0aGlzLmRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKGN1cnJOb2RlLCBwYXJlbnRDb250ZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKFxuICAgICAgcm91dGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPiwgcGFyZW50Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBubyBjb21wb25lbnQsIHRoZSBSb3V0ZSBpcyBuZXZlciBhdHRhY2hlZCB0byBhbiBvdXRsZXQgKGJlY2F1c2UgdGhlcmUgaXMgbm9cbiAgICAvLyBjb21wb25lbnQgdG8gYXR0YWNoKS5cbiAgICBpZiAocm91dGUudmFsdWUuY29tcG9uZW50ICYmIHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LnNob3VsZERldGFjaChyb3V0ZS52YWx1ZS5zbmFwc2hvdCkpIHtcbiAgICAgIHRoaXMuZGV0YWNoQW5kU3RvcmVSb3V0ZVN1YnRyZWUocm91dGUsIHBhcmVudENvbnRleHRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kZWFjdGl2YXRlUm91dGVBbmRPdXRsZXQocm91dGUsIHBhcmVudENvbnRleHRzKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGRldGFjaEFuZFN0b3JlUm91dGVTdWJ0cmVlKFxuICAgICAgcm91dGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPiwgcGFyZW50Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMpOiB2b2lkIHtcbiAgICBjb25zdCBjb250ZXh0ID0gcGFyZW50Q29udGV4dHMuZ2V0Q29udGV4dChyb3V0ZS52YWx1ZS5vdXRsZXQpO1xuICAgIGNvbnN0IGNvbnRleHRzID0gY29udGV4dCAmJiByb3V0ZS52YWx1ZS5jb21wb25lbnQgPyBjb250ZXh0LmNoaWxkcmVuIDogcGFyZW50Q29udGV4dHM7XG4gICAgY29uc3QgY2hpbGRyZW46IHtbb3V0bGV0TmFtZTogc3RyaW5nXTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+fSA9IG5vZGVDaGlsZHJlbkFzTWFwKHJvdXRlKTtcblxuICAgIGZvciAoY29uc3QgY2hpbGRPdXRsZXQgb2YgT2JqZWN0LmtleXMoY2hpbGRyZW4pKSB7XG4gICAgICB0aGlzLmRlYWN0aXZhdGVSb3V0ZUFuZEl0c0NoaWxkcmVuKGNoaWxkcmVuW2NoaWxkT3V0bGV0XSwgY29udGV4dHMpO1xuICAgIH1cblxuICAgIGlmIChjb250ZXh0ICYmIGNvbnRleHQub3V0bGV0KSB7XG4gICAgICBjb25zdCBjb21wb25lbnRSZWYgPSBjb250ZXh0Lm91dGxldC5kZXRhY2goKTtcbiAgICAgIGNvbnN0IGNvbnRleHRzID0gY29udGV4dC5jaGlsZHJlbi5vbk91dGxldERlYWN0aXZhdGVkKCk7XG4gICAgICB0aGlzLnJvdXRlUmV1c2VTdHJhdGVneS5zdG9yZShyb3V0ZS52YWx1ZS5zbmFwc2hvdCwge2NvbXBvbmVudFJlZiwgcm91dGUsIGNvbnRleHRzfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBkZWFjdGl2YXRlUm91dGVBbmRPdXRsZXQoXG4gICAgICByb3V0ZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LCBwYXJlbnRDb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk6IHZvaWQge1xuICAgIGNvbnN0IGNvbnRleHQgPSBwYXJlbnRDb250ZXh0cy5nZXRDb250ZXh0KHJvdXRlLnZhbHVlLm91dGxldCk7XG4gICAgLy8gVGhlIGNvbnRleHQgY291bGQgYmUgYG51bGxgIGlmIHdlIGFyZSBvbiBhIGNvbXBvbmVudGxlc3Mgcm91dGUgYnV0IHRoZXJlIG1heSBzdGlsbCBiZVxuICAgIC8vIGNoaWxkcmVuIHRoYXQgbmVlZCBkZWFjdGl2YXRpbmcuXG4gICAgY29uc3QgY29udGV4dHMgPSBjb250ZXh0ICYmIHJvdXRlLnZhbHVlLmNvbXBvbmVudCA/IGNvbnRleHQuY2hpbGRyZW4gOiBwYXJlbnRDb250ZXh0cztcbiAgICBjb25zdCBjaGlsZHJlbjoge1tvdXRsZXROYW1lOiBzdHJpbmddOiBUcmVlTm9kZTxBY3RpdmF0ZWRSb3V0ZT59ID0gbm9kZUNoaWxkcmVuQXNNYXAocm91dGUpO1xuXG4gICAgZm9yIChjb25zdCBjaGlsZE91dGxldCBvZiBPYmplY3Qua2V5cyhjaGlsZHJlbikpIHtcbiAgICAgIHRoaXMuZGVhY3RpdmF0ZVJvdXRlQW5kSXRzQ2hpbGRyZW4oY2hpbGRyZW5bY2hpbGRPdXRsZXRdLCBjb250ZXh0cyk7XG4gICAgfVxuXG4gICAgaWYgKGNvbnRleHQgJiYgY29udGV4dC5vdXRsZXQpIHtcbiAgICAgIC8vIERlc3Ryb3kgdGhlIGNvbXBvbmVudFxuICAgICAgY29udGV4dC5vdXRsZXQuZGVhY3RpdmF0ZSgpO1xuICAgICAgLy8gRGVzdHJveSB0aGUgY29udGV4dHMgZm9yIGFsbCB0aGUgb3V0bGV0cyB0aGF0IHdlcmUgaW4gdGhlIGNvbXBvbmVudFxuICAgICAgY29udGV4dC5jaGlsZHJlbi5vbk91dGxldERlYWN0aXZhdGVkKCk7XG4gICAgICAvLyBDbGVhciB0aGUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGF0dGFjaGVkIGNvbXBvbmVudCBvbiB0aGUgY29udGV4dCBidXQga2VlcCB0aGUgcmVmZXJlbmNlIHRvXG4gICAgICAvLyB0aGUgb3V0bGV0LlxuICAgICAgY29udGV4dC5hdHRhY2hSZWYgPSBudWxsO1xuICAgICAgY29udGV4dC5yb3V0ZSA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhY3RpdmF0ZUNoaWxkUm91dGVzKFxuICAgICAgZnV0dXJlTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+LCBjdXJyTm9kZTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+fG51bGwsXG4gICAgICBjb250ZXh0czogQ2hpbGRyZW5PdXRsZXRDb250ZXh0cyk6IHZvaWQge1xuICAgIGNvbnN0IGNoaWxkcmVuOiB7W291dGxldDogc3RyaW5nXTogVHJlZU5vZGU8QWN0aXZhdGVkUm91dGU+fSA9IG5vZGVDaGlsZHJlbkFzTWFwKGN1cnJOb2RlKTtcbiAgICBmdXR1cmVOb2RlLmNoaWxkcmVuLmZvckVhY2goYyA9PiB7XG4gICAgICB0aGlzLmFjdGl2YXRlUm91dGVzKGMsIGNoaWxkcmVuW2MudmFsdWUub3V0bGV0XSwgY29udGV4dHMpO1xuICAgICAgdGhpcy5mb3J3YXJkRXZlbnQobmV3IEFjdGl2YXRpb25FbmQoYy52YWx1ZS5zbmFwc2hvdCkpO1xuICAgIH0pO1xuICAgIGlmIChmdXR1cmVOb2RlLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgdGhpcy5mb3J3YXJkRXZlbnQobmV3IENoaWxkQWN0aXZhdGlvbkVuZChmdXR1cmVOb2RlLnZhbHVlLnNuYXBzaG90KSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhY3RpdmF0ZVJvdXRlcyhcbiAgICAgIGZ1dHVyZU5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPiwgY3Vyck5vZGU6IFRyZWVOb2RlPEFjdGl2YXRlZFJvdXRlPixcbiAgICAgIHBhcmVudENvbnRleHRzOiBDaGlsZHJlbk91dGxldENvbnRleHRzKTogdm9pZCB7XG4gICAgY29uc3QgZnV0dXJlID0gZnV0dXJlTm9kZS52YWx1ZTtcbiAgICBjb25zdCBjdXJyID0gY3Vyck5vZGUgPyBjdXJyTm9kZS52YWx1ZSA6IG51bGw7XG5cbiAgICBhZHZhbmNlQWN0aXZhdGVkUm91dGUoZnV0dXJlKTtcblxuICAgIC8vIHJldXNpbmcgdGhlIG5vZGVcbiAgICBpZiAoZnV0dXJlID09PSBjdXJyKSB7XG4gICAgICBpZiAoZnV0dXJlLmNvbXBvbmVudCkge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbm9ybWFsIHJvdXRlLCB3ZSBuZWVkIHRvIGdvIHRocm91Z2ggYW4gb3V0bGV0LlxuICAgICAgICBjb25zdCBjb250ZXh0ID0gcGFyZW50Q29udGV4dHMuZ2V0T3JDcmVhdGVDb250ZXh0KGZ1dHVyZS5vdXRsZXQpO1xuICAgICAgICB0aGlzLmFjdGl2YXRlQ2hpbGRSb3V0ZXMoZnV0dXJlTm9kZSwgY3Vyck5vZGUsIGNvbnRleHQuY2hpbGRyZW4pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIGNvbXBvbmVudGxlc3Mgcm91dGUsIHdlIHJlY3Vyc2UgYnV0IGtlZXAgdGhlIHNhbWUgb3V0bGV0IG1hcC5cbiAgICAgICAgdGhpcy5hY3RpdmF0ZUNoaWxkUm91dGVzKGZ1dHVyZU5vZGUsIGN1cnJOb2RlLCBwYXJlbnRDb250ZXh0cyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChmdXR1cmUuY29tcG9uZW50KSB7XG4gICAgICAgIC8vIGlmIHdlIGhhdmUgYSBub3JtYWwgcm91dGUsIHdlIG5lZWQgdG8gcGxhY2UgdGhlIGNvbXBvbmVudCBpbnRvIHRoZSBvdXRsZXQgYW5kIHJlY3Vyc2UuXG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBwYXJlbnRDb250ZXh0cy5nZXRPckNyZWF0ZUNvbnRleHQoZnV0dXJlLm91dGxldCk7XG5cbiAgICAgICAgaWYgKHRoaXMucm91dGVSZXVzZVN0cmF0ZWd5LnNob3VsZEF0dGFjaChmdXR1cmUuc25hcHNob3QpKSB7XG4gICAgICAgICAgY29uc3Qgc3RvcmVkID1cbiAgICAgICAgICAgICAgKDxEZXRhY2hlZFJvdXRlSGFuZGxlSW50ZXJuYWw+dGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3kucmV0cmlldmUoZnV0dXJlLnNuYXBzaG90KSk7XG4gICAgICAgICAgdGhpcy5yb3V0ZVJldXNlU3RyYXRlZ3kuc3RvcmUoZnV0dXJlLnNuYXBzaG90LCBudWxsKTtcbiAgICAgICAgICBjb250ZXh0LmNoaWxkcmVuLm9uT3V0bGV0UmVBdHRhY2hlZChzdG9yZWQuY29udGV4dHMpO1xuICAgICAgICAgIGNvbnRleHQuYXR0YWNoUmVmID0gc3RvcmVkLmNvbXBvbmVudFJlZjtcbiAgICAgICAgICBjb250ZXh0LnJvdXRlID0gc3RvcmVkLnJvdXRlLnZhbHVlO1xuICAgICAgICAgIGlmIChjb250ZXh0Lm91dGxldCkge1xuICAgICAgICAgICAgLy8gQXR0YWNoIHJpZ2h0IGF3YXkgd2hlbiB0aGUgb3V0bGV0IGhhcyBhbHJlYWR5IGJlZW4gaW5zdGFudGlhdGVkXG4gICAgICAgICAgICAvLyBPdGhlcndpc2UgYXR0YWNoIGZyb20gYFJvdXRlck91dGxldC5uZ09uSW5pdGAgd2hlbiBpdCBpcyBpbnN0YW50aWF0ZWRcbiAgICAgICAgICAgIGNvbnRleHQub3V0bGV0LmF0dGFjaChzdG9yZWQuY29tcG9uZW50UmVmLCBzdG9yZWQucm91dGUudmFsdWUpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGFkdmFuY2VBY3RpdmF0ZWRSb3V0ZShzdG9yZWQucm91dGUudmFsdWUpO1xuICAgICAgICAgIHRoaXMuYWN0aXZhdGVDaGlsZFJvdXRlcyhmdXR1cmVOb2RlLCBudWxsLCBjb250ZXh0LmNoaWxkcmVuKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBpbmplY3RvciA9IGdldENsb3Nlc3RSb3V0ZUluamVjdG9yKGZ1dHVyZS5zbmFwc2hvdCk7XG4gICAgICAgICAgY29udGV4dC5hdHRhY2hSZWYgPSBudWxsO1xuICAgICAgICAgIGNvbnRleHQucm91dGUgPSBmdXR1cmU7XG4gICAgICAgICAgY29udGV4dC5pbmplY3RvciA9IGluamVjdG9yO1xuICAgICAgICAgIGlmIChjb250ZXh0Lm91dGxldCkge1xuICAgICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIG91dGxldCB3aGVuIGl0IGhhcyBhbHJlYWR5IGJlZW4gaW5zdGFudGlhdGVkXG4gICAgICAgICAgICAvLyBPdGhlcndpc2UgaXQgd2lsbCBnZXQgYWN0aXZhdGVkIGZyb20gaXRzIGBuZ09uSW5pdGAgd2hlbiBpbnN0YW50aWF0ZWRcbiAgICAgICAgICAgIGNvbnRleHQub3V0bGV0LmFjdGl2YXRlV2l0aChmdXR1cmUsIGNvbnRleHQuaW5qZWN0b3IpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuYWN0aXZhdGVDaGlsZFJvdXRlcyhmdXR1cmVOb2RlLCBudWxsLCBjb250ZXh0LmNoaWxkcmVuKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhIGNvbXBvbmVudGxlc3Mgcm91dGUsIHdlIHJlY3Vyc2UgYnV0IGtlZXAgdGhlIHNhbWUgb3V0bGV0IG1hcC5cbiAgICAgICAgdGhpcy5hY3RpdmF0ZUNoaWxkUm91dGVzKGZ1dHVyZU5vZGUsIG51bGwsIHBhcmVudENvbnRleHRzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==