"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__UNSTABLE_proxy = exports.proxy = exports.__UNSTABLE_loader = exports.lazy = exports.bin = exports.currentTarget = exports.currentPlatform = void 0;
function currentPlatform() {
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
exports.currentPlatform = currentPlatform;
// DEPRECATE(0.1)
function currentTarget() {
    return currentPlatform();
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
    return [...interleave(scope, rest)].join("") + "/" + currentPlatform();
}
exports.bin = bin;
// DEPRECATE(0.1)
function lazyV1(loaders, exports) {
    return lazyV2({
        targets: loaders,
        exports
    });
}
// DEPRECATE(0.1)
function lazyV2(options) {
    return lazyV3({
        platforms: options.targets,
        exports: options.exports,
        debug: options.debug
    });
}
function lazyV3(options) {
    const loaders = options.platforms;
    let loaded = null;
    function load() {
        if (loaded) {
            return loaded;
        }
        const platform = currentPlatform();
        if (!loaders.hasOwnProperty(platform)) {
            throw new Error(`no precompiled module found for ${platform}`);
        }
        if (options.debug) {
            try {
                loaded = options.debug();
            }
            catch (_e) {
                loaded = null;
            }
        }
        if (!loaded) {
            loaded = loaders[platform]();
        }
        return loaded;
    }
    let module = {};
    for (const key of options.exports) {
        Object.defineProperty(module, key, { get() { return load()[key]; } });
    }
    return module;
}
function lazy(optionsOrLoaders, exports) {
    return (!exports && !('targets' in optionsOrLoaders))
        ? lazyV3(optionsOrLoaders)
        : !exports
            ? lazyV2(optionsOrLoaders)
            : lazyV1(optionsOrLoaders, exports);
}
exports.lazy = lazy;
function __UNSTABLE_loader(loaders) {
    const platform = currentPlatform();
    if (!loaders.hasOwnProperty(platform)) {
        throw new Error(`no precompiled module found for ${platform}`);
    }
    const loader = loaders[platform];
    let loaded = null;
    return () => {
        if (loaded) {
            return loaded;
        }
        loaded = loader();
        return loaded;
    };
}
exports.__UNSTABLE_loader = __UNSTABLE_loader;
// DEPRECATE(0.1)
function isDeprecatedProxyOptions(options) {
    return 'targets' in options;
}
function isProxyOptions(options) {
    return 'platforms' in options;
}
function proxy(options) {
    const opts = isProxyOptions(options)
        ? options
        : !isDeprecatedProxyOptions(options)
            ? { platforms: options }
            : { platforms: options.targets, debug: options.debug };
    const platform = currentPlatform();
    const loaders = opts.platforms;
    if (!loaders.hasOwnProperty(platform)) {
        throw new Error(`no precompiled module found for ${platform}`);
    }
    const loader = loaders[platform];
    let loaded = null;
    function load() {
        if (!loaded) {
            if (options.debug) {
                try {
                    loaded = options.debug();
                }
                catch (_e) {
                    loaded = null;
                }
            }
            if (!loaded) {
                loaded = loader();
            }
        }
        return loaded;
    }
    const handler = {
        has(_target, key) {
            return Reflect.has(load(), key);
        },
        get(_target, key) {
            return Reflect.get(load(), key);
        },
        ownKeys(_target) {
            return Reflect.ownKeys(load());
        },
        defineProperty(_target, _key, _descriptor) {
            throw new Error('attempt to modify read-only Neon module proxy');
        },
        deleteProperty(_target, _key) {
            throw new Error('attempt to modify read-only Neon module proxy');
        },
        set(_target, _key, _val) {
            throw new Error('attempt to modify read-only Neon module proxy');
        },
        setPrototypeOf(_target, _proto) {
            throw new Error('attempt to modify read-only Neon module proxy');
        },
        getPrototypeOf(_target) {
            return Object.getPrototypeOf(load());
        },
        isExtensible(_target) {
            return Reflect.isExtensible(load());
        },
        preventExtensions(_target) {
            return Reflect.preventExtensions(load());
        },
        getOwnPropertyDescriptor(_target, key) {
            return Reflect.getOwnPropertyDescriptor(load(), key);
        }
    };
    return new Proxy({}, handler);
}
exports.proxy = proxy;
// DEPRECATE(0.1)
function __UNSTABLE_proxy(options) {
    return proxy(options);
}
exports.__UNSTABLE_proxy = __UNSTABLE_proxy;
