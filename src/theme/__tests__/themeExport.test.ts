import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Theme, ThemeOptions } from '@mui/material/styles';

import { DEFAULT_DARK_BASE_COLORS, DEFAULT_LIGHT_BASE_COLORS } from '../../palette/defaults';
import { resolvePalette } from '../../palette/resolver';
import { serializeMuiTheme } from '../../palette/serializers/mui-serializer';
import type { Contrast, Mode, ModePalettes } from '../../palette/types';
import { buildMuiTheme } from '../buildMuiTheme';
import { createSunfadeThemeOptions } from '../sunfadeTheme';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..', '..', '..');
const genDir = path.join(here, '__generated__');
const genFile = path.join(genDir, 'sunfade-theme.gen.ts');

const VARIANTS: { mode: Mode; contrast: Contrast }[] = [
  { mode: 'dark', contrast: 'soft' },
  { mode: 'dark', contrast: 'medium' },
  { mode: 'dark', contrast: 'hard' },
  { mode: 'light', contrast: 'soft' },
  { mode: 'light', contrast: 'medium' },
  { mode: 'light', contrast: 'hard' },
];

/** Both modes edited: bases changed per mode plus overrides, so neither
 * mode's export can be produced from the other mode's data. */
const EDITED_MODE_PALETTES: ModePalettes = {
  dark: {
    baseColors: { ...DEFAULT_DARK_BASE_COLORS, bg: '#221d1a', blue: '#4f7f8f' },
    overrides: { bright_red: '#ff8f70', bg1: '#372f28' },
  },
  light: {
    baseColors: { ...DEFAULT_LIGHT_BASE_COLORS, bg: '#f5e4cb', red: '#b0402e' },
    overrides: { fg2: '#554032', neutral_blue: '#5f8290' },
  },
};

function resolveFor(palette: ModePalettes['dark'], mode: Mode, contrast: Contrast) {
  return resolvePalette({ baseColors: palette.baseColors, overrides: palette.overrides, mode, contrast });
}

/** MUI's createTheme attaches per-call closures (getContrastText, augmentColor)
 * to the palette — different references per createTheme call even with identical
 * options. Compare the data-carrying theme by stripping function properties. */
function plainData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(plainData);
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (typeof val !== 'function') result[key] = plainData(val);
    }
    return result;
  }
  return value;
}

interface GeneratedModule {
  SUNFADE_VARIANTS: readonly string[];
  DEFAULT_SUNFADE_VARIANT: string;
  sunfadePalettes: ModePalettes;
  sunfadeThemeOptions: Record<string, ThemeOptions>;
  sunfadeThemes: Record<string, Theme>;
  getSunfadeTheme(mode: Mode, contrast: Contrast): Theme;
  sunfadeTheme: Theme;
}

describe('standalone MUI theme export', () => {
  let mod: GeneratedModule;
  let source: string;

  beforeAll(() => {
    source = serializeMuiTheme(EDITED_MODE_PALETTES);
    mkdirSync(genDir, { recursive: true });
    writeFileSync(genFile, source);
  });

  afterAll(() => {
    rmSync(genDir, { recursive: true, force: true });
  });

  it('exposes all six variants through the documented API', async () => {
    mod = (await import(genFile)) as unknown as GeneratedModule;

    expect(mod.SUNFADE_VARIANTS).toEqual([
      'dark-soft', 'dark-medium', 'dark-hard', 'light-soft', 'light-medium', 'light-hard',
    ]);
    expect(mod.DEFAULT_SUNFADE_VARIANT).toBe('dark-medium');
    expect(Object.keys(mod.sunfadeThemes).sort()).toEqual([...mod.SUNFADE_VARIANTS].sort());
    expect(Object.keys(mod.sunfadeThemeOptions).sort()).toEqual([...mod.SUNFADE_VARIANTS].sort());
    expect(typeof mod.getSunfadeTheme).toBe('function');
  });

  it('defaults to the dark/medium variant', async () => {
    mod = (await import(genFile)) as unknown as GeneratedModule;

    expect(mod.sunfadeTheme).toBe(mod.getSunfadeTheme('dark', 'medium'));
    expect(mod.sunfadeTheme).toBe(mod.sunfadeThemes['dark-medium']);
  });

  it('matches the live theme for all six variants', async () => {
    mod = (await import(genFile)) as unknown as GeneratedModule;

    for (const { mode, contrast } of VARIANTS) {
      const resolved = resolveFor(EDITED_MODE_PALETTES[mode], mode, contrast);

      // Raw options parity — the generated options are byte-identical data to
      // the shared theme-options source that drives the live site.
      const liveOptions = createSunfadeThemeOptions(resolved, mode, contrast);
      expect(mod.sunfadeThemeOptions[`${mode}-${contrast}`]).toEqual(liveOptions);

      // Created theme parity for the surfaces consumers actually use.
      const liveTheme = buildMuiTheme(resolved, mode, contrast);
      const exportTheme = mod.getSunfadeTheme(mode, contrast);
      expect(plainData(exportTheme.palette)).toEqual(plainData(liveTheme.palette));
      expect(plainData(exportTheme.components)).toEqual(plainData(liveTheme.components));
      expect(plainData(exportTheme.shape)).toEqual(plainData(liveTheme.shape));
      expect(plainData(exportTheme.typography)).toEqual(plainData(liveTheme.typography));
    }
  });

  it('keeps edited dark and light palettes separate', async () => {
    mod = (await import(genFile)) as unknown as GeneratedModule;

    expect(mod.sunfadePalettes).toEqual(EDITED_MODE_PALETTES);

    const darkResolved = resolveFor(EDITED_MODE_PALETTES.dark, 'dark', 'medium');
    const lightResolved = resolveFor(EDITED_MODE_PALETTES.light, 'light', 'medium');

    const darkTheme = mod.getSunfadeTheme('dark', 'medium');
    const lightTheme = mod.getSunfadeTheme('light', 'medium');

    // Each mode's edits flow into that mode's themes only.
    expect(darkTheme.palette.background.default).toBe(darkResolved.bg0);
    expect(lightTheme.palette.background.default).toBe(lightResolved.bg0);
    expect(darkResolved.bg0).toBe('#221d1a');
    expect(lightResolved.bg0).toBe('#f5e4cb');

    // Overrides resolve through the same engine in the export.
    expect(mod.getSunfadeTheme('dark', 'soft').palette.background.paper).toBe('#372f28');
    expect(lightTheme.palette.text.secondary).toBe('#554032');

    // And neither mode leaks into the other.
    expect(darkTheme.palette.background.default).not.toBe(lightTheme.palette.background.default);
    expect(lightTheme.palette.background.default).not.toBe(darkResolved.bg0);
    expect(darkTheme.palette.background.default).not.toBe(lightResolved.bg0);
  });

  it('is deterministic and free of timestamps', () => {
    const secondRun = serializeMuiTheme(EDITED_MODE_PALETTES);
    expect(secondRun).toBe(source);
    expect(source).not.toMatch(/20\d\d-\d\d-\d\d/);
    expect(source).not.toMatch(/new Date|Date\.now|toISOString/);
  });

  it('depends only on @mui/material for portability', () => {
    const imports = source.match(/^import .*?;$/gm) ?? [];
    expect(imports).toEqual([
      "import { createTheme, type Theme, type ThemeOptions } from '@mui/material/styles';",
    ]);
    expect(source).not.toContain('@palette');
    expect(source).not.toContain('react');
  });

  it('typechecks with the project TypeScript compiler', () => {
    const tsc = path.join(projectRoot, 'node_modules', '.bin', 'tsc');
    expect(existsSync(tsc)).toBe(true);
    expect(existsSync(genFile)).toBe(true);

    const result = spawnSync(tsc, [
      '--noEmit',
      '--strict',
      '--target', 'es2020',
      '--module', 'esnext',
      '--moduleResolution', 'bundler',
      '--esModuleInterop',
      '--skipLibCheck',
      '--ignoreConfig',
      genFile,
    ], { cwd: projectRoot, encoding: 'utf8', timeout: 120_000 });

    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    expect(
      result.status === 0 ? [] : output.split('\n').filter(Boolean),
    ).toEqual([]);
  });

  it('documents consumer guidance in the module header', () => {
    expect(source).toContain('ThemeProvider');
    expect(source).toContain('CssBaseline');
    expect(source).toContain('default export is the dark-medium variant');
    expect(readFileSync(genFile, 'utf8')).toBe(source);
  });
});
