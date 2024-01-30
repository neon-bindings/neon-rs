import { RustTarget, NodePlatform, PlatformFamily, PlatformMap, TargetPair, PlatformPreset } from './platform.cjs';
export interface BinaryCfg {
    type: "binary";
    rust: RustTarget;
    node: NodePlatform;
    os: string;
    arch: string;
    abi: string | null;
}
export interface LibraryCfg {
    type: "library";
    org: string;
    platforms: PlatformFamily;
    load?: string;
}
type Preamble = {
    name: string;
    version: string;
    optionalDependencies?: Record<string, string> | undefined;
};
declare class AbstractManifest implements Preamble {
    protected _json: Preamble;
    protected _upgraded: boolean;
    constructor(json: unknown);
    get name(): string;
    set name(value: string);
    get version(): string;
    set version(value: string);
    get description(): string;
    get upgraded(): boolean;
    save(dir?: string | undefined): Promise<undefined>;
    stringify(): string;
}
export declare class BinaryManifest extends AbstractManifest {
    private _binaryJSON;
    constructor(json: unknown);
    cfg(): BinaryCfg;
    static load(dir?: string | undefined): Promise<BinaryManifest>;
}
type AddPlatformsOptions = {
    platformsSrc?: PlatformMap;
};
export declare class LibraryManifest extends AbstractManifest {
    private _sourceJSON;
    private _expandedPlatforms;
    constructor(json: unknown);
    static load(dir?: string | undefined): Promise<LibraryManifest>;
    cfg(): LibraryCfg;
    packageNames(): string[];
    packageFor(target: RustTarget): string | undefined;
    allPlatforms(): PlatformMap;
    rustTargetFor(node: NodePlatform): RustTarget | undefined;
    manifestFor(target: RustTarget): BinaryManifest;
    updateLoader(platforms: NodePlatform[]): Promise<void>;
    addTargetPair(pair: TargetPair): Promise<TargetPair | null>;
    addNodePlatform(platform: NodePlatform): Promise<TargetPair | null>;
    addRustTarget(target: RustTarget): Promise<TargetPair | null>;
    filterNewTargets(family: PlatformMap): TargetPair[];
    addPlatforms(family: PlatformMap, opts?: AddPlatformsOptions): Promise<TargetPair[]>;
    addPlatformPreset(preset: PlatformPreset): Promise<TargetPair[]>;
    updateTargets(log: (msg: string) => void, bundle: string | null): Promise<void>;
}
export type Manifest = LibraryManifest | BinaryManifest;
export {};
