import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export function assertIsObject(json: unknown, path: string): asserts json is object {
  if (!json || typeof json !== 'object') {
    throw new TypeError(`expected "${path}" property to be an object, found ${json}`);
  }
}

// Idea thanks to https://www.lucaspaganini.com/academy/assertion-functions-typescript-narrowing-5
export function assertHasProps<K extends string>(keys: ReadonlyArray<K>, json: unknown, path: string): asserts json is Record<K, unknown> {
  assertIsObject(json, path);
  for (const key of keys) {
    if (!(key in json)) {
      throw new TypeError(`property "${path}.${key}" not found`);
    }
  }
}

export async function readManifest(dir?: string | undefined): Promise<Preamble> {
  dir = dir ?? process.cwd();
  const json: unknown = JSON.parse(await fs.readFile(path.join(dir, "package.json"), { encoding: 'utf8' }));
  assertIsPreamble(json);
  return json;
}

export type Preamble = {
  name: string,
  version: string,
  optionalDependencies?: Record<string, string> | undefined,
  [key: string]: any
};

function assertIsPreamble(json: unknown): asserts json is Preamble {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new TypeError(`expected Neon package manifest, found ${json}`);
  }
  if (!('version' in json) || typeof json.version !== 'string') {
    throw new TypeError('valid "version" string not found in Neon package manifest');
  }
  if (!('name' in json) || typeof json.name !== 'string') {
    throw new TypeError('valid "name" string not found in Neon package manifest');
  }
}

const OPTIONAL_KEYS = [
  'author', 'repository', 'keywords', 'bugs', 'homepage', 'license', 'engines'
];

export abstract class AbstractManifest {
  protected _json: Preamble;
  abstract readonly dir: string;

  constructor(json: Preamble) {
    this._json = json;
  }

  get name(): string { return this._json.name; }
  set name(value: string) { this._json.name = value; }

  get version(): string { return this._json.version; }
  set version(value: string) { this._json.version = value; }

  get description(): string { return (this._json as any).description ?? ""; }

  async save(log: (msg: string) => void): Promise<void> {
    await fs.writeFile(path.join(this.dir, "package.json"), JSON.stringify(this._json, null, 2), { encoding: 'utf8' });
  }

  stringify(): string {
    return JSON.stringify(this._json);
  }

  toJSON(): unknown {
    return JSON.parse(JSON.stringify(this._json));
  }

  copyOptionalKeys(target: {[key: string]: unknown}) {
    for (const key of OPTIONAL_KEYS) {
      if (key in this._json) {
        target[key] = this._json[key as keyof typeof this._json];
      }
    }
  }
}
