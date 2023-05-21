import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const { CargoMessages } = require('../cjs/index.cjs');

export { CargoMessages };
