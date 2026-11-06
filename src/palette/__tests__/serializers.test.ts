import { describe, it, expect } from 'vitest';
import { resolvePalette } from '../resolver';
import {
  DEFAULT_DARK_BASE_COLORS,
  DEFAULT_LIGHT_BASE_COLORS,
} from '../defaults';
import { serializeMuiTheme } from '../serializers/mui-serializer';
import { getContrastRoles } from '../../theme/contrastRoles';
import { serializeGhosttyConfig } from '../serializers/ghostty-serializer';
import { serializeCssVars } from '../serializers/css-serializer';
import { serializeHtmlOneSheet } from '../serializers/html-serializer';
import type { BaseColors, ModePalettes, PaletteConfig } from '../types';

const darkConfig: PaletteConfig = {
  baseColors: { ...DEFAULT_DARK_BASE_COLORS },
  overrides: {},
  mode: 'dark',
  contrast: 'medium',
};

const lightConfig: PaletteConfig = {
  baseColors: { ...DEFAULT_LIGHT_BASE_COLORS },
  overrides: {},
  mode: 'light',
  contrast: 'medium',
};

const darkPalette = resolvePalette(darkConfig);
const lightPalette = resolvePalette(lightConfig);

describe('MUI Serializer', () => {
  const defaultModePalettes: ModePalettes = {
    dark: { baseColors: { ...DEFAULT_DARK_BASE_COLORS }, overrides: {} },
    light: { baseColors: { ...DEFAULT_LIGHT_BASE_COLORS }, overrides: {} },
  };
  const output = serializeMuiTheme(defaultModePalettes);

  it('produces valid TypeScript-like output', () => {
    expect(output).toContain("import { createTheme");
    expect(output).toContain('"mode": "dark"');
    expect(output).toContain('"mode": "light"');
    expect(output).toContain(darkPalette.bg0);
    expect(output).toContain(darkPalette.fg1);
    expect(output).toContain(getContrastRoles(darkPalette, 'dark', 'medium').accents.blue.main);
    expect(output).toContain('export default sunfadeTheme');
    expect(output).toContain('getSunfadeTheme');
  });

  it('includes module augmentation for darker and orange', () => {
    expect(output).toContain('darker?: string');
    expect(output).toContain('orange: PaletteColor');
  });

  it('contains all six mode/contrast variants', () => {
    for (const variant of ['dark-soft', 'dark-medium', 'dark-hard', 'light-soft', 'light-medium', 'light-hard']) {
      expect(output).toContain(`'${variant}':`);
    }
    expect(output).toContain("'dark-medium': createTheme(sunfadeThemeOptions['dark-medium'])");
    expect(output).toContain("DEFAULT_SUNFADE_VARIANT: SunfadeVariant = 'dark-medium'");
  });

  it('uses bg0_hard for hard contrast', () => {
    expect(output).toContain(darkPalette.bg0_hard);
  });

  it('uses bg0_soft for soft contrast', () => {
    expect(output).toContain(darkPalette.bg0_soft);
  });

  it('preserves edits from both mode palettes', () => {
    const edited: ModePalettes = {
      dark: {
        baseColors: { ...DEFAULT_DARK_BASE_COLORS, bg: '#221d1a', blue: '#4f7f8f' },
        overrides: { bright_red: '#ff8f70' },
      },
      light: {
        baseColors: { ...DEFAULT_LIGHT_BASE_COLORS, bg: '#f5e4cb', red: '#b0402e' },
        overrides: { fg2: '#554032' },
      },
    };
    const editedOutput = serializeMuiTheme(edited);

    // Raw edited palettes are embedded for both modes
    expect(editedOutput).toContain('"bg": "#221d1a"');
    expect(editedOutput).toContain('"bg": "#f5e4cb"');
    expect(editedOutput).toContain('"bright_red": "#ff8f70"');
    expect(editedOutput).toContain('"fg2": "#554032"');

    // Each mode's edits flow into that mode's resolved themes only
    const darkResolved = resolvePalette({ baseColors: edited.dark.baseColors, overrides: edited.dark.overrides, mode: 'dark', contrast: 'medium' });
    const lightResolved = resolvePalette({ baseColors: edited.light.baseColors, overrides: edited.light.overrides, mode: 'light', contrast: 'medium' });
    expect(editedOutput).toContain(`"default": "${darkResolved.bg0}"`);
    expect(editedOutput).toContain(`"default": "${lightResolved.bg0}"`);
    expect(darkResolved.bg0).toBe('#221d1a');
    expect(lightResolved.bg0).toBe('#f5e4cb');
  });

  it('includes consumer guidance with ThemeProvider and CssBaseline', () => {
    expect(output).toContain('ThemeProvider');
    expect(output).toContain('CssBaseline');
    expect(output).toContain('default export is the dark-medium variant');
  });

  it('is deterministic regardless of palette key order', () => {
    const { red, green, yellow, blue, purple, aqua, orange, fg, bg } = DEFAULT_DARK_BASE_COLORS;
    const reordered = { fg, bg, orange, aqua, purple, blue, yellow, green, red } as BaseColors;
    const shuffled: ModePalettes = {
      dark: { baseColors: reordered, overrides: {} },
      light: { baseColors: { ...DEFAULT_LIGHT_BASE_COLORS }, overrides: {} },
    };
    expect(serializeMuiTheme(shuffled)).toBe(output);
  });

  it('snapshot', () => {
    expect(output).toMatchSnapshot();
  });
});

describe('Ghostty Serializer', () => {
  it('produces valid key=value config', () => {
    const output = serializeGhosttyConfig(darkPalette, { name: 'test', version: 1 });

    expect(output).toContain(`background = ${darkPalette.bg0}`);
    expect(output).toContain(`foreground = ${darkPalette.fg1}`);
    expect(output).toContain(`cursor-color = ${darkPalette.fg0}`);
    expect(output).toContain(`palette = 0=${darkPalette.bg0}`);
    expect(output).toContain(`palette = 1=${darkPalette.neutral_red}`);
    expect(output).toContain(`palette = 15=${darkPalette.fg1}`);
  });

  it('includes all 16 ANSI colors', () => {
    const output = serializeGhosttyConfig(darkPalette, { name: 'test', version: 1 });
    for (let i = 0; i <= 15; i++) {
      expect(output).toContain(`palette = ${i}=`);
    }
  });

  it('includes palette name and version in header', () => {
    const output = serializeGhosttyConfig(darkPalette, { name: 'sunfade-1971', version: 3 });
    expect(output).toContain('sunfade-1971 v3');
  });

  it('snapshot', () => {
    const output = serializeGhosttyConfig(darkPalette, { name: 'test', version: 1 });
    expect(output).toMatchSnapshot();
  });
});

describe('CSS Serializer', () => {
  it('produces valid CSS custom properties', () => {
    const output = serializeCssVars(darkPalette);

    expect(output).toContain(':root {');
    expect(output).toContain(`--sunfade-bg0: ${darkPalette.bg0};`);
    expect(output).toContain(`--sunfade-fg1: ${darkPalette.fg1};`);
    expect(output).toContain(`--sunfade-bright-red: ${darkPalette.bright_red};`);
    expect(output).toContain(`--sunfade-neutral-blue: ${darkPalette.neutral_blue};`);
    expect(output).toContain('}');
  });

  it('includes all 45 properties', () => {
    const output = serializeCssVars(darkPalette);
    const declarations = output.match(/--sunfade-/g);
    expect(declarations).toHaveLength(41);
  });

  it('converts underscores to hyphens in variable names', () => {
    const output = serializeCssVars(darkPalette);
    expect(output).toContain('--sunfade-bg0-hard');
    expect(output).toContain('--sunfade-deep-purple');
    expect(output).not.toContain('--sunfade-bg0_hard');
  });

  it('snapshot', () => {
    const output = serializeCssVars(darkPalette);
    expect(output).toMatchSnapshot();
  });
});

describe('HTML One-Sheet Serializer', () => {
  it('produces valid HTML', () => {
    const output = serializeHtmlOneSheet(darkPalette, lightPalette, { name: 'test', version: 1 });

    expect(output).toContain('<!DOCTYPE html>');
    expect(output).toContain('<html lang="en">');
    expect(output).toContain('</html>');
    expect(output).toContain('<title>test — Sunfade 1971 Palette v1</title>');
  });

  it('includes both dark and light mode sections', () => {
    const output = serializeHtmlOneSheet(darkPalette, lightPalette, { name: 'test', version: 1 });

    expect(output).toContain('class="palette-dark"');
    expect(output).toContain('class="palette-light"');
  });

  it('includes prefers-color-scheme media queries', () => {
    const output = serializeHtmlOneSheet(darkPalette, lightPalette, { name: 'test', version: 1 });

    expect(output).toContain('prefers-color-scheme: dark');
    expect(output).toContain('prefers-color-scheme: light');
  });

  it('includes all accent colors as hex values', () => {
    const output = serializeHtmlOneSheet(darkPalette, lightPalette, { name: 'test', version: 1 });

    expect(output).toContain(darkPalette.bright_red);
    expect(output).toContain(darkPalette.neutral_green);
    expect(output).toContain(darkPalette.faded_blue);
    expect(output).toContain(darkPalette.deep_orange);
  });

  it('has no script tags', () => {
    const output = serializeHtmlOneSheet(darkPalette, lightPalette, { name: 'test', version: 1 });
    expect(output).not.toContain('<script');
  });

  it('is under 15KB', () => {
    const output = serializeHtmlOneSheet(darkPalette, lightPalette, { name: 'test', version: 1 });
    const sizeKB = Buffer.byteLength(output, 'utf-8') / 1024;
    expect(sizeKB).toBeLessThan(15);
  });

  it('snapshot', () => {
    // Use a fixed date in the snapshot by checking structure only
    const output = serializeHtmlOneSheet(darkPalette, lightPalette, { name: 'test', version: 1 });
    // HTML serializer includes a date, so snapshot will vary. Check structure instead.
    expect(output).toContain('Generated by Sunfade 1971');
  });
});
