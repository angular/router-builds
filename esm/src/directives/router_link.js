import { Directive, HostListener, HostBinding, Input } from '@angular/core';
import { Router } from '../router';
import { RouteSegment } from '../segments';
import { isString, isArray, isPresent } from '../facade/lang';
import { ObservableWrapper } from '../facade/async';
import { LocationStrategy } from '@angular/common';
export class RouterLink {
    constructor(_routeSegment, _router, _locationStrategy) {
        this._routeSegment = _routeSegment;
        this._router = _router;
        this._locationStrategy = _locationStrategy;
        this._commands = [];
        this.isActive = false;
        // because auxiliary links take existing primary and auxiliary routes into account,
        // we need to update the link whenever params or other routes change.
        this._subscription =
            ObservableWrapper.subscribe(_router.changes, (_) => { this._updateTargetUrlAndHref(); });
    }
    ngOnDestroy() { ObservableWrapper.dispose(this._subscription); }
    set routerLink(data) {
        if (isArray(data)) {
            this._commands = data;
        }
        else {
            this._commands = [data];
        }
        this._updateTargetUrlAndHref();
    }
    onClick(button, ctrlKey, metaKey) {
        if (button != 0 || ctrlKey || metaKey) {
            return true;
        }
        if (isString(this.target) && this.target != '_self') {
            return true;
        }
        this._router.navigate(this._commands, this._routeSegment);
        return false;
    }
    _updateTargetUrlAndHref() {
        let tree = this._router.createUrlTree(this._commands, this._routeSegment);
        if (isPresent(tree)) {
            this.href = this._locationStrategy.prepareExternalUrl(this._router.serializeUrl(tree));
            this.isActive = this._router.urlTree.contains(tree);
        }
        else {
            this.isActive = false;
        }
    }
}
RouterLink.decorators = [
    { type: Directive, args: [{ selector: '[routerLink]' },] },
];
RouterLink.ctorParameters = [
    { type: RouteSegment, },
    { type: Router, },
    { type: LocationStrategy, },
];
RouterLink.propDecorators = {
    'target': [{ type: Input },],
    'href': [{ type: HostBinding },],
    'isActive': [{ type: HostBinding, args: ['class.router-link-active',] },],
    'routerLink': [{ type: Input },],
    'onClick': [{ type: HostListener, args: ["click", ["$event.button", "$event.ctrlKey", "$event.metaKey"],] },],
};
//# sourceMappingURL=router_link.js.map