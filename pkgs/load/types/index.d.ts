export declare function currentTarget(): string;
export declare function bin(scope: string[], ...rest: string[]): string;
export type LazyOptions = {
    targets: Record<string, () => any>;
    exports: string[];
    debug?: () => any;
};
export declare function lazy(loaders: Record<string, () => any>, exports: string[]): any;
export declare function lazy(options: LazyOptions): any;
export declare function __UNSTABLE_loader(loaders: Record<string, () => Record<string, any>>): () => Record<string, any>;
export declare function __UNSTABLE_proxy(loaders: Record<string, () => Record<string, any>>): any;
