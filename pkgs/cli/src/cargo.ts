import { createReadStream, ReadStream } from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { execa } from 'execa';

export type MessageReason =
  | 'compiler-artifact'
  | 'compiler-message'
  | 'build-script-executed'
  | 'build-finished';

export type CompilerMessage = {
  reason: 'compiler-message'
};

export type BuildScriptExecuted = {
  reason: 'build-script-executed'
};

export type CompilerTarget = {
  kind: string[],
  crate_types: string[],
  name: string
};

export type CompilerArtifact = {
  reason: 'compiler-artifact',
  package_id: string,
  manifest_path: string,
  target: CompilerTarget,
  filenames: string[]
};

export type BuildFinished = {
  reason: 'build-finished',
  success: boolean
};

export type CargoMessage =
  | CompilerMessage
  | BuildScriptExecuted
  | CompilerArtifact
  | BuildFinished;

export function messageReason(message: CargoMessage): MessageReason {
  return message.reason;
}

export function isCompilerMessage(json: unknown): json is CompilerMessage {
  if (!(json instanceof Object)) {
    return false;
  }
  if (!('reason' in json) || (json.reason !== 'compiler-message')) {
    return false;
  }
  return true;
}

export function isBuildScriptExecuted(json: unknown): json is BuildScriptExecuted {
  if (!(json instanceof Object)) {
    return false;
  }
  if (!('reason' in json) || (json.reason !== 'build-script-executed')) {
    return false;
  }
  return true;
}

export function isCompilerTarget(json: unknown): json is CompilerTarget {
  if (!(json instanceof Object)) {
    return false;
  }
  if (!('kind' in json) || !isStringArray(json.kind)) {
    return false;
  }
  if (!('crate_types' in json) || !isStringArray(json.crate_types)) {
    return false;
  }
  if (!('name' in json) || (typeof json.name !== 'string')) {
    return false;
  }
  return true;
}

export function isCompilerArtifact(json: unknown): json is CompilerArtifact {
  if (!(json instanceof Object)) {
    return false;
  }
  if (!('reason' in json) || (json.reason !== 'compiler-artifact')) {
    return false;
  }
  if (!('package_id' in json) || (typeof json.package_id !== 'string')) {
    return false;
  }
  if (!('manifest_path' in json) || (typeof json.manifest_path !== 'string')) {
    return false;
  }
  if (!('target' in json) || !isCompilerTarget(json.target)) {
    return false;
  }
  if (!('filenames' in json) || !isStringArray(json.filenames)) {
    return false;
  }
  return true;
}

function isStringArray(json: unknown): json is string[] {
  if (!Array.isArray(json)) {
    return false;
  }
  for (const val of json) {
    if (typeof val !== 'string') {
      return false;
    }
  }
  return true;
}

export function isBuildFinished(json: unknown): json is BuildFinished {
  if (!(json instanceof Object)) {
    return false;
  }
  if (!('reason' in json) || (json.reason !== 'build-finished')) {
    return false;
  }
  return ('success' in json) && (typeof json.success === 'boolean');
}

export function parseMessage(line: string): CargoMessage | null {
  try {
    const json: unknown = JSON.parse(line);
    if (isCompilerMessage(json) ||
        isBuildScriptExecuted(json) ||
        isCompilerArtifact(json) ||
        isBuildFinished(json)) {
      return json;
    }
  } catch (nope) { }
  return null;
}

export type MessageFilter<T> = (msg: CargoMessage) => T | null;

export class MessageStream {
  private _stream: readline.Interface;

  constructor(file?: string | null) {
    const input = file ? createReadStream(file) : process.stdin;
    this._stream = readline.createInterface({
      input,
      terminal: false
    });
  }

  async findPath(pred: MessageFilter<string>): Promise<string | null> {
    try {
      for await (const line of this._stream) {
        const msg = parseMessage(line);
        if (!msg) {
          continue;
        }
        const result = pred(msg);
        if (result !== null) {
          return result;
        }
      }
      return null;
    } finally {
      this._stream.close();
    }
  }
}

export class CrossMessageStream extends MessageStream {
  private _dir: string;

  constructor(dir: string, file?: string | null) {
    super(file);
    this._dir = dir;
  }

  async findPath(pred: MessageFilter<string>): Promise<string | null> {
    // The base class's version reports paths as absolute paths from within
    // the cross-rs Docker image's virtual filesystem.
    const dockerPath = await super.findPath(pred);
    if (!dockerPath) {
      return null;
    }

    // Convert the absolute path into a relative path from within the
    // workspace's target directory.
    const cross = await execa('cross', ['metadata', '--format-version=1', '--no-deps'], {
      cwd: this._dir,
      shell: true
    });
    if (cross.exitCode !== 0) {
      throw new Error(`Invoking \`cross metadata\` failed: ${cross.stderr}`);
    }
    const crossMetadata = JSON.parse(cross.stdout);

    // The path relative to the workspace's target directory.
    const relPath = path.relative(crossMetadata.target_directory, dockerPath);

    // Now find the true absolute path of the target directory on the host system.
    const cargo = await execa('cargo', ['metadata', '--format-version=1', '--no-deps'], {
      cwd: this._dir,
      shell: true
    });
    if (cargo.exitCode !== 0) {
      throw new Error(`Invoking \`cargo metadata\` failed: ${cargo.stderr}`);
    }
    const cargoMetadata = JSON.parse(cargo.stdout);

    // Finally, re-parent the relative path into an absolute path on the host system.
    const absPath = path.join(cargoMetadata.target_directory, relPath);
    return absPath;
  }
}
