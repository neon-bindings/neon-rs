import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const CargoMessages = require("../cjs/index.cjs").CargoMessages;
