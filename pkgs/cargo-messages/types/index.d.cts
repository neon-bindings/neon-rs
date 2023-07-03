export type CrateType =
  | 'dylib'
  | 'cdylib'
  | 'rlib';

export interface CargoArtifact {
  findFileByCrateType(crateType: CrateType): string | null;
}

export type CargoMessageOptions = {
  mount?: string,
  manifestPath?: string,
  file?: string,
  verbose?: boolean,
};

export class CargoMessages {
  constructor(options?: CargoMessageOptions);
  findArtifact(crateName: string): CargoArtifact | null;
}
