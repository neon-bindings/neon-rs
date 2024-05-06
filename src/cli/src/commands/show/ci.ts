import commandLineArgs from 'command-line-args';
import { Command, CommandDetail, CommandSection } from '../../command.js';
import { LibraryManifest } from '@neon-rs/manifest';
import { asProviderName, providerFor, Provider } from '../../provider.js';

const OPTIONS = [
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false }
];

export default class CI implements Command {
  static summary(): string { return 'Display CI metadata for this project\'s platforms.'; }
  static syntax(): string { return 'neon show ci [-v] <provider>'; }
  static options(): CommandDetail[] {
    return [
      { name: '-v, --verbose', summary: 'Enable verbose logging. (Default: false)' },
      { name: '<provider>', summary: 'CI provider, which can be one of the supported providers listed below.'}
    ];
  }
  static seeAlso(): CommandDetail[] | void {
    return [
      { name: 'GitHub Actions', summary: '<https://docs.github.com/actions>' }
    ];
  }
  static extraSection(): CommandSection | void {
    return {
      title: 'CI Providers',
      details: [
        { name: 'github', summary: 'GitHub Actions.' }
      ]
    };
  }

  private _verbose: boolean;
  private _provider: Provider;

  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv, partial: true });

    this._verbose = !!options.verbose;
    if (!options._unknown || options._unknown.length === 0) {
      throw new Error("No arguments found, expected <provider>.");
    }
    const providerName = asProviderName(options._unknown[0]);
    const providerCtor = providerFor(providerName);
    this._provider = new providerCtor();
  }

  log(msg: string) {
    if (this._verbose) {
      console.error("[neon show ci] " + msg);
    }
  }

  async run() {
    this.log(`reading package.json`);
    const libManifest = await LibraryManifest.load();
    this.log(`manifest: ${libManifest.stringify()}`);
    const platforms = libManifest.allPlatforms();
    const metadata = this._provider.metadata(platforms);
    console.log(JSON.stringify(metadata, null, 2));
  }
}
