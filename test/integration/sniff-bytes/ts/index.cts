const addon = require('./load.js');

export type FileFormat = {
  name: string,
  shortName: string | null,
  mediaType: string,
  extension: string
};

export function sniffBytes(buffer: ArrayBuffer): FileFormat {
  return addon.sniffBytes(buffer);
}
