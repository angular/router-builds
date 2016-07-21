import { AppModuleFactory, AppModuleFactoryLoader, Compiler } from '@angular/core';
/**
 * A spy for {@link AppModuleFactoryLoader} that allows tests to simulate the loading of app module
 * factories.
 *
 * @experimental
 */
export declare class SpyAppModuleFactoryLoader implements AppModuleFactoryLoader {
    private compiler;
    stubbedModules: {
        [path: string]: any;
    };
    constructor(compiler: Compiler);
    load(path: string): Promise<AppModuleFactory<any>>;
}
/**
 * A module setting up the router that should be used for testing.
 * It provides spy implementations of Location, LocationStrategy, and AppModuleFactoryLoader.
 *
 * # Example:
 *
 * ```
 * beforeEach(() => {
 *   configureModule({
 *     modules: [RouterTestModule],
 *     providers: [provideRoutes(
 *         [{path: '', component: BlankCmp}, {path: 'simple', component: SimpleCmp}])]
 *   });
 * });
 * ```
 *
 * @experimental
 */
export declare class RouterTestingModule {
}
