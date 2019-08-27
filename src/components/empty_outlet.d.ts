import * as i0 from "@angular/core";
/**
 * This component is used internally within the router to be a placeholder when an empty
 * router-outlet is needed. For example, with a config such as:
 *
 * `{path: 'parent', outlet: 'nav', children: [...]}`
 *
 * In order to render, there needs to be a component on this config, which will default
 * to this `EmptyOutletComponent`.
 */
export declare class ɵEmptyOutletComponent {
    static ngFactoryDef: i0.ɵɵFactoryDef<ɵEmptyOutletComponent>;
    static ngComponentDef: i0.ɵɵComponentDefWithMeta<ɵEmptyOutletComponent, "ng-component", never, {}, {}, never>;
}
export { ɵEmptyOutletComponent as EmptyOutletComponent };
