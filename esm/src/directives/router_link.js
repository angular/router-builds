"use strict";
const common_1 = require('@angular/common');
const core_1 = require('@angular/core');
const router_1 = require('../router');
const router_state_1 = require('../router_state');
class RouterLink {
    /**
     * @internal
     */
    constructor(router, route, locationStrategy) {
        this.router = router;
        this.route = route;
        this.locationStrategy = locationStrategy;
        this.commands = [];
    }
    set routerLink(data) {
        if (Array.isArray(data)) {
            this.commands = data;
        }
        else {
            this.commands = [data];
        }
    }
    ngOnChanges(changes) { this.updateTargetUrlAndHref(); }
    onClick(button, ctrlKey, metaKey) {
        if (button !== 0 || ctrlKey || metaKey) {
            return true;
        }
        if (typeof this.target === 'string' && this.target != '_self') {
            return true;
        }
        this.router.navigateByUrl(this.urlTree);
        return false;
    }
    updateTargetUrlAndHref() {
        this.urlTree = this.router.createUrlTree(this.commands, { relativeTo: this.route, queryParams: this.queryParams, fragment: this.fragment });
        if (this.urlTree) {
            this.href = this.locationStrategy.prepareExternalUrl(this.router.serializeUrl(this.urlTree));
        }
    }
}
/** @nocollapse */
RouterLink.decorators = [
    { type: core_1.Directive, args: [{ selector: '[routerLink]' },] },
];
/** @nocollapse */
RouterLink.ctorParameters = [
    { type: router_1.Router, },
    { type: router_state_1.ActivatedRoute, },
    { type: common_1.LocationStrategy, },
];
/** @nocollapse */
RouterLink.propDecorators = {
    'target': [{ type: core_1.Input },],
    'queryParams': [{ type: core_1.Input },],
    'fragment': [{ type: core_1.Input },],
    'href': [{ type: core_1.HostBinding },],
    'routerLink': [{ type: core_1.Input },],
    'onClick': [{ type: core_1.HostListener, args: ['click', ['$event.button', '$event.ctrlKey', '$event.metaKey'],] },],
};
exports.RouterLink = RouterLink;
//# sourceMappingURL=router_link.js.map