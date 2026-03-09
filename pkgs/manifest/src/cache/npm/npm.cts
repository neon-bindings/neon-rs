import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { CacheCfg } from '../cache.cjs';
import { LibraryManifest } from '../../library/library.cjs';
import js, { ASTPath, ObjectExpression } from 'jscodeshift';
import { RustTarget, NodePlatform, isNodePlatform } from '../../platform.cjs';
import { BinaryPackage } from './package.cjs';

const PLATFORMS_DIR: string = 'platforms';

type PackageMap = { [key in NodePlatform]: BinaryPackage };

export class NPMCacheCfg implements CacheCfg {
  readonly type: string = 'npm';
  readonly dir: string;
  readonly manifest: LibraryManifest;
  private _packages: PackageMap;

  constructor(manifest: LibraryManifest, outDir: string = PLATFORMS_DIR) {
    this.manifest = manifest;
    this.dir = path.join(manifest.dir, outDir);
    const packages: PackageMap = Object.create(null);
    const platforms = manifest.allPlatforms();
    for (const key in platforms) {
      const node = key as NodePlatform;
      const rust = platforms[node] as RustTarget;
      packages[node] = BinaryPackage.defer(this, node, rust);
    }
    this._packages = packages;
  }

  getPlatformOutputPath(platform: NodePlatform): string | undefined {
    return this._packages[platform]
      ? path.join(this.dir, platform, 'index.node')
      : undefined;
  }

  async setPlatformTarget(platform: NodePlatform, target: RustTarget): Promise<void> {
    const pkg = this._packages[platform];

    if (!pkg) {
      this._packages[platform] = BinaryPackage.create(this, platform, target);
    } else {
      await pkg.setTarget(target);
    }
  }

  hasUnsavedChanges(): boolean {
    for (const key in this._packages) {
      const pkg = this._packages[key as NodePlatform];
      if (pkg.hasUnsavedChanges()) {
        return true;
      }
    }
    return false;
  }

  private newPlatforms(): NodePlatform[] {
    const result: NodePlatform[] = [];
    for (const node in this._packages) {
      if (this._packages[node as NodePlatform].isNew()) {
        result.push(node as NodePlatform);
      }
    }
    return result;
  }

  async saveChanges(log: (msg: string) => void): Promise<void> {
    const newPlatforms = this.newPlatforms();

    for (const node in this._packages) {
      const pkg = this._packages[node as NodePlatform];
      if (pkg.hasUnsavedChanges()) {
        await pkg.saveChanges(log);
      }
    }

    if (newPlatforms.length > 0) {
      await this.updateLoader(newPlatforms);
    }
  }

  async updateLoader(platforms: NodePlatform[]) {
    const cfg = this.manifest.cfg();
    if (!cfg.load) {
      return;
    }

    const loaderPath = path.join(this.manifest.dir, cfg.load);

    const loader = await fs.readFile(loaderPath, 'utf8');

    function isPlatformTable(p: ASTPath<ObjectExpression>) {
      return p.value.properties.every(p => {
        return p.type === 'Property' &&
          p.key.type === 'Literal' &&
          isNodePlatform(p.key.value);
      });
    }

    const result = js(loader)
      .find(js.ObjectExpression)
      .filter(isPlatformTable)
      .replaceWith((p: ASTPath<ObjectExpression>) => {
        const newProps = platforms.map(platform => {
          return js.property(
            'init',
            js.literal(platform),
            js.arrowFunctionExpression(
              [],
              js.callExpression(
                js.identifier('require'),
                [js.literal(`${cfg.org}/${cfg.prefix ?? ''}${platform}`)]
              )
            )
          );
        });
        return js.objectExpression([...p.value.properties, ...newProps]);
      })
      .toSource({ quote: 'single' });
    await fs.writeFile(loaderPath, result, 'utf8');  }

  packageNames(): string[] {
    const cfg = this.manifest.cfg();
    return Object.keys(this.manifest.allPlatforms()).map(key => `${cfg.org}/${cfg.prefix ?? ''}${key}`);
  }

  updatePlatforms(lib: LibraryManifest): boolean {
    let changed = false;

    const preamble = lib.preamble;

    if (!preamble.optionalDependencies) {
      preamble.optionalDependencies = {};
      changed = true;
    }

    const packages = this.packageNames();

    for (const pkg of packages) {
      if (preamble.optionalDependencies[pkg] !== lib.version) {
        preamble.optionalDependencies[pkg] = lib.version;
        changed = true;
      }
    }

    return changed;
  }
}

