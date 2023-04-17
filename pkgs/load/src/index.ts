import * as path from 'path';
import * as fs from 'fs';

export function currentTarget() {
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

export function load(dirname: string) {
  const m = path.join(dirname, "index.node");
  return fs.existsSync(m) ? require(m) : null;
}
