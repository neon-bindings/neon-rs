export function currentPlatform(): string {
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
          return 'win32-x64-msvc'
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

// DEPRECATE(0.1)
export function currentTarget(): string {
  return currentPlatform();
}

function isGlibc(): boolean {
  // Cast to unknown to work around a bug in the type definition:
  // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/40140
  const report: unknown = process.report?.getReport();

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

function* interleave<T>(a1: T[], a2: T[]): Generator<T> {
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

export function bin(scope: string[], ...rest: string[]): string {
  return [...interleave(scope, rest)].join("") + "/" + currentPlatform();
}

// DEPRECATE(0.1)
type __DEPRECATED_LazyOptions = {
  targets: Record<string, () => any>,
  exports: string[],
  debug?: () => any
};

export type LazyOptions = {
  platforms: Record<string, () => any>,
  exports: string[],
  debug?: () => any
};

// DEPRECATE(0.1)
function lazyV1(loaders: Record<string, () => any>, exports: string[]): any {
  return lazyV2({
    targets: loaders,
    exports
  });
}

// DEPRECATE(0.1)
function lazyV2(options: __DEPRECATED_LazyOptions): any {
  return lazyV3({
    platforms: options.targets,
    exports: options.exports,
    debug: options.debug
  });
}

function lazyV3(options: LazyOptions): any {
  const loaders = options.platforms;
  let loaded: any = null;

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
      } catch (_e) {
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

export function lazy(loaders: Record<string, () => any>, exports: string[]): any;
export function lazy(options: __DEPRECATED_LazyOptions): any;
export function lazy(options: LazyOptions): any;
export function lazy(optionsOrLoaders: LazyOptions | Record<string, () => any> | __DEPRECATED_LazyOptions, exports?: string[] | undefined): any {
  return (!exports && !('targets' in optionsOrLoaders))
    ? lazyV3(optionsOrLoaders as LazyOptions)
    : !exports
    ? lazyV2(optionsOrLoaders as __DEPRECATED_LazyOptions)
    : lazyV1(optionsOrLoaders as Record<string, () => any>, exports);
}

export function __UNSTABLE_loader(loaders: Record<string, () => Record<string, any>>): () => Record<string, any> {
  const platform = currentPlatform();
  if (!loaders.hasOwnProperty(platform)) {
    throw new Error(`no precompiled module found for ${platform}`);
  }
  const loader = loaders[platform];
  let loaded: Record<string, any> | null = null;
  return () => {
    if (loaded) {
      return loaded;
    }
    loaded = loader();
    return loaded;
  };
}

export type ModuleObject = Record<string, any>;
export type PlatformTable = Record<string, () => ModuleObject>;

// DEPRECATE(0.1)
export type __DEPRECATED_ProxyOptions = {
  targets: PlatformTable,
  debug?: () => ModuleObject
};

export type ProxyOptions = {
  platforms: PlatformTable,
  debug?: () => ModuleObject
};

// DEPRECATE(0.1)
function isDeprecatedProxyOptions(options: PlatformTable | ProxyOptions | __DEPRECATED_ProxyOptions): options is __DEPRECATED_ProxyOptions {
  return 'targets' in options;
}

function isProxyOptions(options: PlatformTable | ProxyOptions | __DEPRECATED_ProxyOptions): options is ProxyOptions {
  return 'platforms' in options;
}

export function proxy(options: PlatformTable | ProxyOptions | __DEPRECATED_ProxyOptions): any {
  const opts: ProxyOptions = isProxyOptions(options)
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
  let loaded: Record<string, any> | null = null;

  function load(): Record<string, any> {
    if (!loaded) {
      if (options.debug) {
        try {
          loaded = options.debug();
        } catch (_e) {
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
    has(_target: any, key: string) {
      return Reflect.has(load(), key);
    },
    get(_target: any, key: string) {
      return Reflect.get(load(), key);
    },
    ownKeys(_target: any) {
      return Reflect.ownKeys(load());
    },
    defineProperty(_target: any, _key: string, _descriptor: any) {
      throw new Error('attempt to modify read-only Neon module proxy');
    },
    deleteProperty(_target: any, _key: string) {
      throw new Error('attempt to modify read-only Neon module proxy');
    },
    set(_target: any, _key: string, _val: any) {
      throw new Error('attempt to modify read-only Neon module proxy');
    },
    setPrototypeOf(_target: any, _proto: any) {
      throw new Error('attempt to modify read-only Neon module proxy');
    },
    getPrototypeOf(_target: any) {
      return Object.getPrototypeOf(load());
    },
    isExtensible(_target: any) {
      return Reflect.isExtensible(load());
    },
    preventExtensions(_target: any) {
      return Reflect.preventExtensions(load());
    },
    getOwnPropertyDescriptor(_target: any, key: string) {
      return Reflect.getOwnPropertyDescriptor(load(), key);
    }
  };

  return new Proxy({}, handler);
}

// DEPRECATE(0.1)
export function __UNSTABLE_proxy(options: PlatformTable | ProxyOptions | __DEPRECATED_ProxyOptions): any {
  return proxy(options);
}
