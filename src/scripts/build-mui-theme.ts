// Build the standalone six-variant MUI theme artifact from saved project defaults.
//
// Reproducible build command:
//   pnpm build:mui
//
// The command compiles this entry with `vite build --ssr` into `.mui-build/`
// and runs it with Node. Because the entry is bundled before it runs, all
// project paths are resolved from the repository root (process.cwd()), never
// from the script's own location.
//
// Reads the tracked artifact src/palette/project-defaults.json (the palettes
// saved through the editor's save-companion), validates it with the same
// parser the app uses, and writes the generated standalone theme module to
// MUI/sunfade-1971-theme.ts — the same module the editor's MUI export button
// downloads. Output is deterministic (no timestamps), so repeated runs over
// unchanged defaults produce byte-identical files.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { parseProjectDefaults } from '../palette/project-defaults';
import { serializeMuiTheme } from '../palette/serializers/mui-serializer';

const root = process.cwd();
const artifactPath = path.resolve(root, 'src', 'palette', 'project-defaults.json');
const outDir = path.resolve(root, 'MUI');
const outFile = path.join(outDir, 'sunfade-1971-theme.ts');

const defaults = parseProjectDefaults(JSON.parse(readFileSync(artifactPath, 'utf8')));
const content = serializeMuiTheme(defaults.palettes);

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, content);

console.log(`Wrote ${path.relative(root, outFile)} from project defaults (revision ${defaults.revision}).`);
