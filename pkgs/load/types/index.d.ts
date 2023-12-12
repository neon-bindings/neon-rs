export declare function currentPlatform(): string;
export declare function currentTarget(): string;
export declare function bin(scope: string[], ...rest: string[]): string;
type __DEPRECATED_LazyOptions = {
    targets: Record<string, () => any>;
    exports: string[];
    debug?: () => any;
};
export type LazyOptions = {
    platforms: Record<string, () => any>;
    exports: string[];
    debug?: () => any;
};
export declare function lazy(loaders: Record<string, () => any>, exports: string[]): any;
export declare function lazy(options: __DEPRECATED_LazyOptions): any;
export declare function lazy(options: LazyOptions): any;
export declare function __UNSTABLE_loader(loaders: Record<string, () => Record<string, any>>): () => Record<string, any>;
export type ModuleObject = Record<string, any>;
export type PlatformTable = Record<string, () => ModuleObject>;
export type __DEPRECATED_ProxyOptions = {
    targets: PlatformTable;
    debug?: () => ModuleObject;
};
export type ProxyOptions = {
    platforms: PlatformTable;
    debug?: () => ModuleObject;
};
export declare function proxy(options: PlatformTable | ProxyOptions | __DEPRECATED_ProxyOptions): any;
export declare function __UNSTABLE_proxy(options: PlatformTable | ProxyOptions | __DEPRECATED_ProxyOptions): any;
export {};
