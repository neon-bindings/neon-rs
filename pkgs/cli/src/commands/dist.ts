import { copyFile } from 'node:fs/promises';
import commandLineArgs from 'command-line-args';
import { CargoMessage, MessageStream, isCompilerArtifact } from '../cargo.js';
import { Command } from '../command.js';

// FIXME: add options to infer crate name from manifests
// --package <path/to/package.json>
// --crate <path/to/Cargo.toml>
const OPTIONS = [
  { name: 'name', alias: 'n', type: String, defaultValue: null },
  { name: 'log', alias: 'l', type: String, defaultValue: null },
  { name: 'file', alias: 'f', type: String, defaultValue: null },
  { name: 'out', alias: 'o', type: String, defaultValue: 'index.node' }
];

async function findArtifact(log: string | null, crateName: string): Promise<string | null> {
  const stream = new MessageStream(log);
  return await stream.findPath((msg: CargoMessage) => {
    if (!isCompilerArtifact(msg) || (msg.target.name !== crateName)) {
      return null;
    }
    const index = msg.target.crate_types.indexOf('cdylib');
    return (index < 0) ? null : msg.filenames[index];
  });
}

export default function parse(argv: string[]): Command {
  const options = commandLineArgs(OPTIONS, { argv });

  if (options.log && options.file) {
    throw new Error("Options --log and --file cannot both be enabled.");
  }

  const crateName = options.name || process.env['npm_package_name'];

  if (!crateName) {
    throw new Error("No crate name provided.");
  }

  return async () => {
    const file = options.file ?? await findArtifact(options.log, crateName);

    if (!file) {
      throw new Error(`No library found for crate ${crateName}`);
    }

    // FIXME: needs all the logic of cargo-cp-artifact (timestamp check, M1 workaround, async, errors)
    await copyFile(file, options.out);
  };
}
