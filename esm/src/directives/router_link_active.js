"use strict";
const core_1 = require('@angular/core');
const router_1 = require('../router');
const url_tree_1 = require('../url_tree');
const router_link_1 = require('./router_link');
class RouterLinkActive {
    /**
     * @internal
     */
    constructor(router, element, renderer) {
        this.router = router;
        this.element = element;
        this.renderer = renderer;
        this.classes = [];
        this.routerLinkActiveOptions = { exact: true };
        this.subscription = router.events.subscribe(s => {
            if (s instanceof router_1.NavigationEnd) {
                this.update();
            }
        });
    }
    ngAfterContentInit() {
        this.links.changes.subscribe(s => this.update());
        this.update();
    }
    set routerLinkActive(data) {
        if (Array.isArray(data)) {
            this.classes = data;
        }
        else {
            this.classes = data.split(' ');
        }
    }
    ngOnChanges(changes) { this.update(); }
    ngOnDestroy() { this.subscription.unsubscribe(); }
    update() {
        if (!this.links || this.links.length === 0)
            return;
        const currentUrlTree = this.router.parseUrl(this.router.url);
        const isActive = this.links.reduce((res, link) => res || url_tree_1.containsTree(currentUrlTree, link.urlTree, this.routerLinkActiveOptions.exact), false);
        this.classes.forEach(c => this.renderer.setElementClass(this.element.nativeElement, c, isActive));
    }
}
/** @nocollapse */
RouterLinkActive.decorators = [
    { type: core_1.Directive, args: [{ selector: '[routerLinkActive]' },] },
];
/** @nocollapse */
RouterLinkActive.ctorParameters = [
    { type: router_1.Router, },
    { type: core_1.ElementRef, },
    { type: core_1.Renderer, },
];
/** @nocollapse */
RouterLinkActive.propDecorators = {
    'links': [{ type: core_1.ContentChildren, args: [router_link_1.RouterLink,] },],
    'routerLinkActiveOptions': [{ type: core_1.Input },],
    'routerLinkActive': [{ type: core_1.Input },],
};
exports.RouterLinkActive = RouterLinkActive;
//# sourceMappingURL=router_link_active.js.map