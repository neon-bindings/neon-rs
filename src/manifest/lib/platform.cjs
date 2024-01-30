"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rust2Node = exports.node2Rust = exports.getTargetDescriptor = exports.expandPlatformFamily = exports.expandPlatformPreset = exports.assertIsPlatformPreset = exports.isPlatformPreset = exports.assertIsNodePlatform = exports.isNodePlatform = exports.assertIsRustTarget = exports.isRustTarget = void 0;
const rust_json_1 = __importDefault(require("../data/rust.json"));
const node_json_1 = __importDefault(require("../data/node.json"));
const preset_json_1 = __importDefault(require("../data/preset.json"));
function isRustTarget(x) {
    return (typeof x === 'string') && (x in rust_json_1.default);
}
exports.isRustTarget = isRustTarget;
function assertIsRustTarget(x) {
    if (!isRustTarget(x)) {
        throw new RangeError(`invalid Rust target: ${x}`);
    }
}
exports.assertIsRustTarget = assertIsRustTarget;
function isNodePlatform(x) {
    return (typeof x === 'string') && (x in node_json_1.default);
}
exports.isNodePlatform = isNodePlatform;
function assertIsNodePlatform(x) {
    if (!isNodePlatform(x)) {
        throw new RangeError(`invalid platform: ${x}`);
    }
}
exports.assertIsNodePlatform = assertIsNodePlatform;
function isPlatformPreset(x) {
    return (typeof x === 'string') && (x in preset_json_1.default);
}
exports.isPlatformPreset = isPlatformPreset;
function assertIsPlatformPreset(x) {
    if (!isPlatformPreset(x)) {
        throw new RangeError(`invalid platform family preset: ${x}`);
    }
}
exports.assertIsPlatformPreset = assertIsPlatformPreset;
function lookupPlatformPreset(key) {
    return preset_json_1.default[key];
}
function merge(maps) {
    const merged = Object.create(null);
    for (const map of maps) {
        Object.assign(merged, map);
    }
    return merged;
}
function expandPlatformPreset(preset) {
    return expandPlatformFamily(lookupPlatformPreset(preset));
}
exports.expandPlatformPreset = expandPlatformPreset;
function expandPlatformFamily(family) {
    return isPlatformPreset(family)
        ? expandPlatformPreset(family)
        : Array.isArray(family)
            ? merge(family.map(expandPlatformFamily))
            : family;
}
exports.expandPlatformFamily = expandPlatformFamily;
function getTargetDescriptor(target) {
    const node = rust_json_1.default[target];
    if (!isNodePlatform(node)) {
        throw new Error(`Rust target ${target} not supported`);
    }
    const nodeDescriptor = node_json_1.default[node];
    const badTarget = nodeDescriptor.llvm.find(t => !isRustTarget(t));
    if (badTarget) {
        throw new Error(`Rust target ${badTarget} not supported`);
    }
    return {
        node,
        os: nodeDescriptor.os,
        arch: nodeDescriptor.arch,
        abi: nodeDescriptor.abi,
        llvm: nodeDescriptor.llvm
    };
}
exports.getTargetDescriptor = getTargetDescriptor;
function node2Rust(target) {
    return node_json_1.default[target].llvm.map(rt => {
        assertIsRustTarget(rt);
        return rt;
    });
}
exports.node2Rust = node2Rust;
function rust2Node(target) {
    const nt = rust_json_1.default[target];
    assertIsNodePlatform(nt);
    return nt;
}
exports.rust2Node = rust2Node;
