export declare function createEmptyUrlTree(): UrlTree;
export declare function containsTree(container: UrlTree, containee: UrlTree, exact: boolean): boolean;
/**
 * A URL in the tree form.
 */
export declare class UrlTree {
    root: UrlSegment;
    queryParams: {
        [key: string]: string;
    };
    fragment: string;
    toString(): string;
}
export declare class UrlSegment {
    pathsWithParams: UrlPathWithParams[];
    children: {
        [key: string]: UrlSegment;
    };
    parent: UrlSegment;
    constructor(pathsWithParams: UrlPathWithParams[], children: {
        [key: string]: UrlSegment;
    });
    hasChildren(): boolean;
    toString(): string;
}
export declare class UrlPathWithParams {
    path: string;
    parameters: {
        [key: string]: string;
    };
    constructor(path: string, parameters: {
        [key: string]: string;
    });
    toString(): string;
}
export declare function equalPathsWithParams(a: UrlPathWithParams[], b: UrlPathWithParams[]): boolean;
export declare function equalPath(a: UrlPathWithParams[], b: UrlPathWithParams[]): boolean;
export declare function mapChildren(segment: UrlSegment, fn: (v: UrlSegment, k: string) => UrlSegment): {
    [name: string]: UrlSegment;
};
export declare function mapChildrenIntoArray<T>(segment: UrlSegment, fn: (v: UrlSegment, k: string) => T[]): T[];
/**
 * Defines a way to serialize/deserialize a url tree.
 */
export declare abstract class UrlSerializer {
    /**
     * Parse a url into a {@Link UrlTree}
     */
    abstract parse(url: string): UrlTree;
    /**
     * Converts a {@Link UrlTree} into a url
     */
    abstract serialize(tree: UrlTree): string;
}
/**
 * A default implementation of the serialization.
 */
export declare class DefaultUrlSerializer implements UrlSerializer {
    parse(url: string): UrlTree;
    serialize(tree: UrlTree): string;
}
export declare function serializePaths(segment: UrlSegment): string;
export declare function serializePath(path: UrlPathWithParams): string;
