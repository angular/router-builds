import { Compiler, ModuleWithProviders, NgModuleFactory, NgModuleFactoryLoader } from '@angular/core';
import { Routes } from '../src/config';
/**
 * A spy for {@link NgModuleFactoryLoader} that allows tests to simulate the loading of ng module
 * factories.
 *
 * @stable
 */
export declare class SpyNgModuleFactoryLoader implements NgModuleFactoryLoader {
    private compiler;
    stubbedModules: {
        [path: string]: any;
    };
    constructor(compiler: Compiler);
    load(path: string): Promise<NgModuleFactory<any>>;
}
/**
 * A module setting up the router that should be used for testing.
 * It provides spy implementations of Location, LocationStrategy, and NgModuleFactoryLoader.
 *
 * # Example:
 *
 * ```
 * beforeEach(() => {
 *   TestBed.configureTestModule({
 *     modules: [
 *       RouterTestingModule.withRoutes(
 *         [{path: '', component: BlankCmp}, {path: 'simple', component: SimpleCmp}])]
 *       )
 *     ]
 *   });
 * });
 * ```
 *
 * @stable
 */
export declare class RouterTestingModule {
    static withRoutes(routes: Routes): ModuleWithProviders;
}
