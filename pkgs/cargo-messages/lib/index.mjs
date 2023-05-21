import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const { CargoMessages } = require('./index.cjs');

export { CargoMessages };
