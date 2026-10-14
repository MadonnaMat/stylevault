// The package root has no "type" field, so .js files default to CommonJS.
// The ESM build needs its own package.json to be loaded as ES modules.
import { writeFileSync } from 'node:fs';

writeFileSync('dist/esm/package.json', JSON.stringify({ type: 'module' }) + '\n');
