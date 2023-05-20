import { createRequire } from 'node:module';

export function currentTarget(): string {
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

const requireAbsolute = createRequire(process.cwd());

export function scope(scope: string) {
  return requireAbsolute(scope + "/" + currentTarget());
}

export function custom(toRequireSpec: (target: string) => string) {
  return requireAbsolute(toRequireSpec(currentTarget()));
}

export function bin(scope: string) {
  return scope + "/" + currentTarget();
}
