"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lazy = exports.bin = exports.currentTarget = void 0;
function currentTarget() {
    let os = null;
    switch (process.platform) {
        case 'android':
            switch (process.arch) {
                case 'arm':
                    return 'android-arm-eabi';
                case 'arm64':
                    return 'android-arm64';
            }
            os = 'Android';
            break;
        case 'win32':
            switch (process.arch) {
                case 'x64':
                    return 'win32-x64-msvc';
                case 'arm64':
                    return 'win32-arm64-msvc';
                case 'ia32':
                    return 'win32-ia32-msvc';
            }
            os = 'Windows';
            break;
        case 'darwin':
            switch (process.arch) {
                case 'x64':
                    return 'darwin-x64';
                case 'arm64':
                    return 'darwin-arm64';
            }
            os = 'macOS';
            break;
        case 'linux':
            switch (process.arch) {
                case 'x64':
                case 'arm64':
                    return isGlibc()
                        ? `linux-${process.arch}-gnu`
                        : `linux-${process.arch}-musl`;
                case 'arm':
                    return 'linux-arm-gnueabihf';
            }
            os = 'Linux';
            break;
        case 'freebsd':
            if (process.arch === 'x64') {
                return 'freebsd-x64';
            }
            os = 'FreeBSD';
            break;
    }
    if (os) {
        throw new Error(`Neon: unsupported ${os} architecture: ${process.arch}`);
    }
    throw new Error(`Neon: unsupported system: ${process.platform}`);
}
exports.currentTarget = currentTarget;
function isGlibc() {
    // Cast to unknown to work around a bug in the type definition:
    // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/40140
    const report = process.report?.getReport();
    if ((typeof report !== 'object') || !report || (!('header' in report))) {
        return false;
    }
    const header = report.header;
    return (typeof header === 'object') &&
        !!header &&
        ('glibcVersionRuntime' in header);
}
// export function debug(...components: string[]) {
//   if (components.length === 0 || !components[components.length - 1].endsWith(".node")) {
//     components.push("index.node");
//   }
//   const pathSpec = path.join(...components);
//   return fs.existsSync(pathSpec) ? require(pathSpec) : null;
// }
function* interleave(a1, a2) {
    const length = Math.max(a1.length, a2.length);
    for (let i = 0; i < length; i++) {
        if (i < a1.length) {
            yield a1[i];
        }
        if (i < a2.length) {
            yield a2[i];
        }
    }
}
function bin(scope, ...rest) {
    return [...interleave(scope, rest)].join("") + "/" + currentTarget();
}
exports.bin = bin;
function lazy(loaders, exports) {
    let loaded = null;
    function load() {
        if (loaded) {
            return loaded;
        }
        const target = currentTarget();
        if (!loaders.hasOwnProperty(target)) {
            throw new Error(`no precompiled module found for ${target}`);
        }
        loaded = loaders[target]();
        return loaded;
    }
    let module = {};
    for (const key of exports) {
        Object.defineProperty(module, key, { get() { return load()[key]; } });
    }
    return module;
}
exports.lazy = lazy;
