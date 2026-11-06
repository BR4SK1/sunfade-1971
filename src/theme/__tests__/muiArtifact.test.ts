// Parity test for the standalone MUI theme artifact.
//
// The tracked build artifact MUI/sunfade-1971-theme.ts must stay byte-identical
// to what `pnpm build:mui` (and the editor's MUI export button) generate from
// the saved project defaults in src/palette/project-defaults.json. This test
// regenerates the module through the same code path the build uses and fails
// if the committed artifact has drifted — e.g. after saving new defaults
// without re-running `pnpm build:mui`.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { parseProjectDefaults } from '../../palette/project-defaults';
import { serializeMuiTheme } from '../../palette/serializers/mui-serializer';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..', '..', '..');
const artifactPath = path.join(projectRoot, 'MUI', 'sunfade-1971-theme.ts');
const defaultsPath = path.join(projectRoot, 'src', 'palette', 'project-defaults.json');

describe('MUI artifact parity (MUI/sunfade-1971-theme.ts)', () => {
  it('exists in the MUI target folder', () => {
    expect(existsSync(artifactPath)).toBe(true);
  });

  it('matches the standalone module regenerated from saved project defaults', () => {
    const defaults = parseProjectDefaults(JSON.parse(readFileSync(defaultsPath, 'utf8')));
    const generated = serializeMuiTheme(defaults.palettes);
    expect(readFileSync(artifactPath, 'utf8')).toBe(generated);
  });

  it('contains all six variants and the documented API', () => {
    const artifact = readFileSync(artifactPath, 'utf8');
    for (const variant of [
      'dark-soft', 'dark-medium', 'dark-hard',
      'light-soft', 'light-medium', 'light-hard',
    ]) {
      expect(artifact).toContain(`'${variant}'`);
    }
    expect(artifact).toContain("import { createTheme, type Theme, type ThemeOptions } from '@mui/material/styles'");
    expect(artifact).toContain('export function getSunfadeTheme');
    expect(artifact).not.toMatch(/[Tt]imestamp|[Gg]enerated [oa]n: \d{4}/);
  });
});
