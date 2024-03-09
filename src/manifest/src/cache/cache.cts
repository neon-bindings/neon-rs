import { NodePlatform, RustTarget } from '../platform.cjs';
import { LibraryManifest } from '../index.cjs';

export interface CacheCfg {
  readonly type: string;

  hasUnsavedChanges(): boolean;
  setPlatformTarget(platform: NodePlatform, target: RustTarget): Promise<void>;
  getPlatformOutputPath(platform: NodePlatform): string | undefined;
  updatePlatforms(lib: LibraryManifest): boolean;
  saveChanges(log: (msg: string) => void): Promise<void>;
}
