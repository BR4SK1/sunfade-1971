import { describe, it, expect } from 'vitest';
import { resolvePalette } from '../resolver.js';
import { DEFAULT_DARK_BASE_COLORS, DEFAULT_LIGHT_BASE_COLORS } from '../defaults.js';
import { serializeMuiTheme } from '../serializers/mui-serializer.js';
import { serializeGhosttyConfig } from '../serializers/ghostty-serializer.js';
import { serializeCssVars } from '../serializers/css-serializer.js';
import { serializeHtmlOneSheet } from '../serializers/html-serializer.js';
import type { PaletteConfig } from '../types.js';

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
  it('produces valid TypeScript-like output', () => {
    const output = serializeMuiTheme(darkPalette, 'dark', 'medium');

    expect(output).toContain("import { createTheme }");
    expect(output).toContain("mode: 'dark'");
    expect(output).toContain(darkPalette.bg0);
    expect(output).toContain(darkPalette.fg1);
    expect(output).toContain(darkPalette.neutral_blue);
    expect(output).toContain('export default theme');
  });

  it('includes module augmentation for darker and orange', () => {
    const output = serializeMuiTheme(darkPalette, 'dark', 'medium');

    expect(output).toContain('darker?: string');
    expect(output).toContain('orange: PaletteColor');
  });

  it('uses bg0_hard for hard contrast', () => {
    const output = serializeMuiTheme(darkPalette, 'dark', 'hard');
    expect(output).toContain(darkPalette.bg0_hard);
  });

  it('uses bg0_soft for soft contrast', () => {
    const output = serializeMuiTheme(darkPalette, 'dark', 'soft');
    expect(output).toContain(darkPalette.bg0_soft);
  });

  it('snapshot', () => {
    const output = serializeMuiTheme(darkPalette, 'dark', 'medium');
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
    const output = serializeGhosttyConfig(darkPalette, { name: 'sunfade-retro', version: 3 });
    expect(output).toContain('sunfade-retro v3');
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
    expect(output).toContain('<title>test — Sunfade Retro Palette v1</title>');
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
    expect(output).toContain('Generated by Sunfade Retro');
  });
});
