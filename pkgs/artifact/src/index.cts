import * as fs from "node:fs/promises";
import * as path from "node:path";

export async function isNewer(filename: string, outputFile: string): Promise<boolean> {
  try {
    const prevStats = await fs.stat(outputFile);
    const nextStats = await fs.stat(filename);

    return nextStats.mtime > prevStats.mtime;
  } catch (_err) {}

  return true;
}

export async function copyArtifact(src: string, dest: string): Promise<void> {
  if (!(await isNewer(src, dest))) {
    return;
  }

  const destDir = path.dirname(dest);

  await fs.mkdir(destDir, { recursive: true });

  // Apple Silicon (M1, etc.) requires shared libraries to be signed. However,
  // the macOS code signing cache isn't cleared when overwriting a file.
  // Deleting the file before copying works around the issue.
  //
  // Unfortunately, this workaround is incomplete because the file must be
  // deleted from the location it is loaded. If further steps in the user's
  // build process copy or move the file in place, the code signing cache
  // will not be cleared.
  //
  // https://github.com/neon-bindings/neon/issues/911
  if (path.extname(dest) === ".node") {
    try {
      await fs.unlink(dest);
    } catch (_e) {
      // Ignore errors; the file might not exist
    }
  }

  await fs.copyFile(src, dest);
}
