"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibraryManifest = exports.BinaryManifest = void 0;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const platform_cjs_1 = require("./platform.cjs");
const jscodeshift_1 = __importDefault(require("jscodeshift"));
function assertIsObject(json, path) {
    if (!json || typeof json !== 'object') {
        throw new TypeError(`expected "${path}" property to be an object, found ${json}`);
    }
}
// Idea thanks to https://www.lucaspaganini.com/academy/assertion-functions-typescript-narrowing-5
function assertHasProps(keys, json, path) {
    assertIsObject(json, path);
    for (const key of keys) {
        if (!(key in json)) {
            throw new TypeError(`property "${path}.${key}" not found`);
        }
    }
}
function assertIsBinaryCfg(json) {
    assertHasProps(['type', 'rust', 'node', 'os', 'arch', 'abi'], json, "neon");
    if (json.type !== 'binary') {
        throw new TypeError(`expected "neon.type" property to be "binary", found ${json.type}`);
    }
    if (typeof json.rust !== 'string' || !(0, platform_cjs_1.isRustTarget)(json.rust)) {
        throw new TypeError(`expected "neon.rust" to be a valid Rust target, found ${json.rust}`);
    }
    if (typeof json.node !== 'string' || !(0, platform_cjs_1.isNodePlatform)(json.node)) {
        throw new TypeError(`expected "neon.node" to be a valid Node target, found ${json.node}`);
    }
    if (typeof json.os !== 'string') {
        throw new TypeError(`expected "neon.os" to be a string, found ${json.os}`);
    }
    if (typeof json.arch !== 'string') {
        throw new TypeError(`expected "neon.arch" to be a string, found ${json.arch}`);
    }
    if (json.abi !== null && typeof json.abi !== 'string') {
        throw new TypeError(`expected "neon.abi" to be a string or null, found ${json.abi}`);
    }
}
function assertIsPlatformMap(json, path) {
    assertIsObject(json, path);
    for (const key in json) {
        const value = json[key];
        if (!(0, platform_cjs_1.isNodePlatform)(key)) {
            throw new TypeError(`platform table key ${key} is not a valid Node platform`);
        }
        if (typeof value !== 'string' || !(0, platform_cjs_1.isRustTarget)(value)) {
            throw new TypeError(`platform table value ${value} is not a valid Rust target`);
        }
    }
}
function assertIsPlatformFamily(json, path) {
    if (typeof json === 'string') {
        (0, platform_cjs_1.assertIsPlatformPreset)(json);
        return;
    }
    if (Array.isArray(json)) {
        for (const elt of json) {
            (0, platform_cjs_1.assertIsPlatformPreset)(elt);
        }
        return;
    }
    assertIsPlatformMap(json, path);
}
function assertIsBinaryV2(json) {
    if (!json || typeof json !== 'object') {
        throw new TypeError(`expected "neon" to be an object, found ${json}`);
    }
    assertHasProps(['rust', 'node', 'platform', 'arch', 'abi'], json, "neon");
    if (!(0, platform_cjs_1.isRustTarget)(json.rust)) {
        throw new TypeError(`expected "neon.rust" to be a valid Rust target, found ${json.rust}`);
    }
    if (!(0, platform_cjs_1.isNodePlatform)(json.node)) {
        throw new TypeError(`expected "neon.node" to be a valid Node platform, found ${json.node}`);
    }
    if (typeof json.platform !== 'string') {
        throw new TypeError(`expected "neon.platform" to be a string, found ${json.platform}`);
    }
    if (typeof json.arch !== 'string') {
        throw new TypeError(`expected "neon.arch" to be a string, found ${json.arch}`);
    }
    if (json.abi !== null && typeof json.abi !== 'string') {
        throw new TypeError(`expected "neon.abi" to be a string or null, found ${json.abi}`);
    }
}
function assertIsBinaryV1(json) {
    assertHasProps(['binary'], json, "neon");
    const binary = json.binary;
    if (!binary || typeof binary !== 'object') {
        throw new TypeError(`expected "neon.binary" to be an object, found ${binary}`);
    }
    assertHasProps(['rust', 'node', 'platform', 'arch', 'abi'], binary, "neon.binary");
    if (typeof binary.rust !== 'string' || !(0, platform_cjs_1.isRustTarget)(binary.rust)) {
        throw new TypeError(`expected "neon.binary.rust" to be a valid Rust target, found ${binary.rust}`);
    }
    if (!(0, platform_cjs_1.isNodePlatform)(binary.node)) {
        throw new TypeError(`expected "neon.binary.node" to be a valid Node platform, found ${binary.node}`);
    }
    if (typeof binary.platform !== 'string') {
        throw new TypeError(`expected "neon.binary.platform" to be a string, found ${binary.platform}`);
    }
    if (typeof binary.arch !== 'string') {
        throw new TypeError(`expected "neon.binary.arch" to be a string, found ${binary.arch}`);
    }
    if (binary.abi !== null && typeof binary.abi !== 'string') {
        throw new TypeError(`expected "neon.binary.abi" to be a string or null, found ${binary.abi}`);
    }
}
function assertIsLibraryV1(json) {
    assertIsObject(json, "neon");
    for (const key in json) {
        const value = json[key];
        if (!(0, platform_cjs_1.isRustTarget)(key)) {
            throw new TypeError(`target table key ${key} is not a valid Rust target`);
        }
        if (typeof value !== 'string') {
            throw new TypeError(`target table value ${value} is not a string`);
        }
    }
}
function assertIsLibraryCfg(json) {
    assertHasProps(['type', 'org', 'platforms'], json, "neon");
    if (json.type !== 'library') {
        throw new TypeError(`expected "neon.type" property to be "library", found ${json.type}`);
    }
    if (typeof json.org !== 'string') {
        throw new TypeError(`expected "neon.org" to be a string, found ${json.org}`);
    }
    assertIsPlatformFamily(json.platforms, "neon.platforms");
    if ('load' in json) {
        if (typeof json.load !== 'string' && typeof json.load !== 'undefined') {
            throw new TypeError(`expected "neon.load" to be a string, found ${json.load}`);
        }
    }
}
function assertIsPreamble(json) {
    if (!json || typeof json !== 'object') {
        throw new TypeError(`expected binary Neon package manifest, found ${json}`);
    }
    if (!('version' in json) || typeof json.version !== 'string') {
        throw new TypeError('valid "version" string not found in Neon package manifest');
    }
    if (!('name' in json) || typeof json.name !== 'string') {
        throw new TypeError('valid "name" string not found in Neon package manifest');
    }
}
class AbstractManifest {
    constructor(json) {
        assertIsPreamble(json);
        this._json = json;
        this._upgraded = false;
    }
    get name() { return this._json.name; }
    set name(value) { this._json.name = value; }
    get version() { return this._json.version; }
    set version(value) { this._json.version = value; }
    get description() { return this._json.description ?? ""; }
    get upgraded() { return this._upgraded; }
    async save(dir) {
        dir = dir ?? process.cwd();
        await fs.writeFile(path.join(dir, "package.json"), JSON.stringify(this._json, null, 2), { encoding: 'utf8' });
    }
    stringify() {
        return JSON.stringify(this._json);
    }
}
function assertHasCfg(json) {
    if (!('neon' in json)) {
        throw new TypeError('property "neon" not found');
    }
    assertIsObject(json.neon, "neon");
}
function assertHasBinaryCfg(json) {
    assertHasCfg(json);
    assertIsBinaryCfg(json.neon);
}
function assertHasLibraryCfg(json) {
    assertHasCfg(json);
    assertIsLibraryCfg(json.neon);
}
async function readManifest(dir) {
    dir = dir ?? process.cwd();
    return JSON.parse(await fs.readFile(path.join(dir, "package.json"), { encoding: 'utf8' }));
}
class BinaryManifest extends AbstractManifest {
    constructor(json) {
        super(json);
        this._upgraded = normalizeBinaryCfg(this._json);
        assertHasBinaryCfg(this._json);
        this._binaryJSON = this._json;
    }
    cfg() {
        return this._binaryJSON.neon;
    }
    static async load(dir) {
        return new BinaryManifest(await readManifest(dir));
    }
}
exports.BinaryManifest = BinaryManifest;
function normalizeBinaryCfg(json) {
    assertHasCfg(json);
    // V3 format: {
    //   neon: {
    //     type: 'binary',
    //     rust: RustTarget,
    //     node: NodeTarget,
    //     os: string,
    //     arch: string,
    //     abi: string | null
    //   }
    // }
    if ('type' in json.neon && 'os' in json.neon) {
        return false;
    }
    // V2 format: {
    //   neon: {
    //     type: 'binary',
    //     rust: RustTarget,
    //     node: NodeTarget,
    //     platform: string,
    //     arch: string,
    //     abi: string | null
    //   }
    // }
    if ('type' in json.neon) {
        json.neon = upgradeBinaryV2(json.neon);
        return true;
    }
    // V1 format: {
    //   neon: {
    //     binary: {
    //       rust: RustTarget,
    //       node: NodeTarget,
    //       platform: string,
    //       arch: string,
    //       abi: string | null
    //     }
    //   }
    // }
    json.neon = upgradeBinaryV1(json.neon);
    return true;
}
function normalizeLibraryCfg(json) {
    assertHasCfg(json);
    // V5 format: {
    //   type: 'library',
    //   org: string,
    //   platforms: PlatformFamily,
    //   load?: string | undefined
    // }
    if ('type' in json.neon && json.neon.type === 'library') {
        return false;
    }
    // V4 format: {
    //   neon: {
    //     type: 'source',
    //     org: string,
    //     platforms: PlatformFamily,
    //     load?: string | undefined
    //   }
    // }
    if ('type' in json.neon && 'platforms' in json.neon) {
        json.neon.type = 'library';
        return true;
    }
    // V3 format: {
    //   neon: {
    //     type: 'source',
    //     org: string,
    //     targets: PlatformFamily
    //   }
    // }
    if ('type' in json.neon) {
        const org = json.neon['org'];
        const targets = json.neon['targets'];
        assertIsPlatformFamily(targets, "neon.targets");
        json.neon = {
            type: 'library',
            org,
            platforms: targets
        };
        return true;
    }
    // V2 format: {
    //   neon: {
    //     org: string,
    //     targets: { Node => Rust }
    //   }
    // }
    if ('org' in json.neon) {
        const platforms = json.neon['targets'];
        assertIsPlatformMap(platforms, "neon.targets");
        json.neon = {
            type: 'library',
            org: json.neon.org,
            platforms
        };
        return true;
    }
    // V1 format: {
    //   neon: {
    //     targets: { Rust => fully-qualified package name }
    //   }
    // }
    const targets = json.neon['targets'];
    assertIsLibraryV1(targets);
    json.neon = upgradeLibraryV1(targets);
    return true;
}
// The source manifest is the source of truth for all Neon
// project metadata. This means you never need to go searching
// for any other files to query the Neon project's metadata.
// (Some data is replicated in the binary manifests, however,
// since they are independently published in npm.)
class LibraryManifest extends AbstractManifest {
    constructor(json) {
        super(json);
        this._upgraded = normalizeLibraryCfg(this._json);
        assertHasLibraryCfg(this._json);
        this._sourceJSON = this._json;
        this._expandedPlatforms = (0, platform_cjs_1.expandPlatformFamily)(this._sourceJSON.neon.platforms);
    }
    static async load(dir) {
        return new LibraryManifest(await readManifest(dir));
    }
    cfg() {
        return this._sourceJSON.neon;
    }
    packageNames() {
        const cfg = this.cfg();
        return Object.keys(this._expandedPlatforms).map(key => `${cfg.org}/${key}`);
    }
    packageFor(target) {
        const cfg = this.cfg();
        for (const key in this._expandedPlatforms) {
            const value = this._expandedPlatforms[key];
            if (value === target) {
                return `${cfg.org}/${key}`;
            }
        }
        return undefined;
    }
    allPlatforms() {
        return this._expandedPlatforms;
    }
    rustTargetFor(node) {
        return this._expandedPlatforms[node];
    }
    manifestFor(target) {
        const targetInfo = (0, platform_cjs_1.getTargetDescriptor)(target);
        const name = this.packageFor(target);
        if (!name) {
            throw new Error(`Rust target ${target} not found in "neon.platforms" table.`);
        }
        const json = {
            name,
            description: `Prebuilt binary package for \`${this.name}\` on \`${targetInfo.node}\`.`,
            version: this.version,
            os: [targetInfo.os],
            cpu: [targetInfo.arch],
            main: "index.node",
            files: ["index.node"],
            neon: {
                type: "binary",
                rust: target,
                node: targetInfo.node,
                os: targetInfo.os,
                arch: targetInfo.arch,
                abi: targetInfo.abi
            }
        };
        const OPTIONAL_KEYS = [
            'author', 'repository', 'keywords', 'bugs', 'homepage', 'license', 'engines'
        ];
        for (const key of OPTIONAL_KEYS) {
            if (key in this._json) {
                json[key] = this._json[key];
            }
        }
        return new BinaryManifest(json);
    }
    async updateLoader(platforms) {
        const cfg = this.cfg();
        if (!cfg.load) {
            return;
        }
        const loader = await fs.readFile(cfg.load, 'utf8');
        function isPlatformTable(p) {
            return p.value.properties.every(p => {
                return p.type === 'Property' &&
                    p.key.type === 'Literal' &&
                    (0, platform_cjs_1.isNodePlatform)(p.key.value);
            });
        }
        const result = (0, jscodeshift_1.default)(loader)
            .find(jscodeshift_1.default.ObjectExpression)
            .filter(isPlatformTable)
            .replaceWith((p) => {
            const newProps = platforms.map(platform => {
                return jscodeshift_1.default.property('init', jscodeshift_1.default.literal(platform), jscodeshift_1.default.arrowFunctionExpression([], jscodeshift_1.default.callExpression(jscodeshift_1.default.identifier('require'), [jscodeshift_1.default.literal(`${cfg.org}/${platform}`)])));
            });
            return jscodeshift_1.default.objectExpression([...p.value.properties, ...newProps]);
        })
            .toSource({ quote: 'single' });
        await fs.writeFile(cfg.load, result, 'utf8');
    }
    async addTargetPair(pair) {
        const { node, rust } = pair;
        if (this._expandedPlatforms[node] === rust) {
            return null;
        }
        this._expandedPlatforms[node] = rust;
        await this.save();
        await this.updateLoader([node]);
        return pair;
    }
    async addNodePlatform(platform) {
        const targets = (0, platform_cjs_1.node2Rust)(platform);
        if (targets.length > 1) {
            throw new Error(`multiple Rust targets found for Node platform ${platform}; please specify one of ${targets.join(', ')}`);
        }
        return await this.addTargetPair({ node: platform, rust: targets[0] });
    }
    async addRustTarget(target) {
        return await this.addTargetPair({ node: (0, platform_cjs_1.rust2Node)(target), rust: target });
    }
    filterNewTargets(family) {
        let newTargets = [];
        for (const [key, value] of Object.entries(family)) {
            const node = key;
            const rust = value;
            if (this._expandedPlatforms[node] === rust) {
                continue;
            }
            newTargets.push({ node, rust });
        }
        return newTargets;
    }
    async addPlatforms(family, opts = {}) {
        let newTargets = this.filterNewTargets(family);
        if (!newTargets.length) {
            return [];
        }
        for (const { node, rust } of newTargets) {
            if (opts.platformsSrc) {
                opts.platformsSrc[node] = rust;
            }
            this._expandedPlatforms[node] = rust;
        }
        await this.save();
        await this.updateLoader(newTargets.map(({ node }) => node));
        return newTargets;
    }
    async addPlatformPreset(preset) {
        const platformsSrc = this.cfg().platforms;
        if (typeof platformsSrc === 'string') {
            this.cfg().platforms = [platformsSrc, preset];
            return this.addPlatforms((0, platform_cjs_1.expandPlatformFamily)(preset));
        }
        if (Array.isArray(platformsSrc)) {
            platformsSrc.push(preset);
            return this.addPlatforms((0, platform_cjs_1.expandPlatformFamily)(preset));
        }
        // Edge case: an empty object can be treated like an empty array
        if (Object.keys(platformsSrc).length === 0) {
            this.cfg().platforms = [];
            return await this.addPlatformPreset(preset);
        }
        return this.addPlatforms((0, platform_cjs_1.expandPlatformFamily)(preset), { platformsSrc });
    }
    async updateTargets(log, bundle) {
        if (!this._json.optionalDependencies) {
            this._json.optionalDependencies = {};
        }
        const packages = this.packageNames();
        for (const pkg of packages) {
            if (!(pkg in this._json.optionalDependencies)) {
                this._json.optionalDependencies[pkg] = this.version;
            }
        }
        this.save();
        log(`package.json after: ${await fs.readFile(path.join(process.cwd(), "package.json"))}`);
        if (!bundle) {
            return;
        }
        const PREAMBLE = `// AUTOMATICALLY GENERATED FILE. DO NOT EDIT.
//
// This code is never executed but is detected by the static analysis of
// bundlers such as \`@vercel/ncc\`. The require() expression that selects
// the right binary module for the current platform is too dynamic to be
// analyzable by bundler analyses, so this module provides an exhaustive
// static list for those analyses.

if (0) {
`;
        const requires = packages.map(name => `  require('${name}');`).join('\n');
        log(`generating bundler compatibility module at ${bundle}`);
        await fs.writeFile(bundle, PREAMBLE + requires + '\n}\n');
    }
}
exports.LibraryManifest = LibraryManifest;
function upgradeLibraryV1(object) {
    function splitSwap([key, value]) {
        if (!/^@.*\//.test(value)) {
            throw new TypeError(`expected namespaced npm package name, found ${value}`);
        }
        const pkg = value.split('/')[1];
        (0, platform_cjs_1.assertIsNodePlatform)(pkg);
        (0, platform_cjs_1.assertIsRustTarget)(key);
        return [pkg, key];
    }
    const entries = Object.entries(object).map(splitSwap);
    const orgs = new Set(Object.values(object).map(v => v.split('/')[0]));
    if (orgs.size === 0) {
        throw new Error("empty target table");
    }
    else if (orgs.size > 1) {
        throw new Error(`multiple npm orgs found: ${orgs}`);
    }
    return {
        type: 'library',
        org: [...orgs][0],
        platforms: Object.fromEntries(entries)
    };
}
function upgradeBinaryV1(json) {
    assertIsBinaryV1(json);
    return {
        type: 'binary',
        rust: json.binary.rust,
        node: json.binary.node,
        os: json.binary.platform,
        arch: json.binary.arch,
        abi: json.binary.abi
    };
}
function upgradeBinaryV2(json) {
    assertIsBinaryV2(json);
    return {
        type: 'binary',
        rust: json.rust,
        node: json.node,
        os: json.platform,
        arch: json.arch,
        abi: json.abi
    };
}
