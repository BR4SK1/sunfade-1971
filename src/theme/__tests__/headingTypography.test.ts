// Theme-level contract tests for the Sunfade heading scale (Round 2).
//
// The behavior this guards: heading variants read as compact industrial
// instrument labels on Montserrat — no MUI display-default sizes, semibold
// display band (h1–h4) with medium small labels (h5–h6), tight leading and
// restrained tracking — while the base typography (body, terminal, data)
// stays on the Caskaydia stack and the UI-chrome variants keep Montserrat.
// These tests assert the theme options the artifact serializer also bakes in,
// for every mode (contrast does not affect typography).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import type { ThemeOptions } from '@mui/material/styles';

import { parseProjectDefaults } from '../../palette/project-defaults';
import { resolvePalette } from '../../palette/resolver';
import type { Mode } from '../../palette/types';
import { createSunfadeThemeOptions } from '../sunfadeTheme';

const MODES: readonly Mode[] = ['dark', 'light'];

const HEADING_SCALES: Record<
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
  { fontSize: string; lineHeight: number; fontWeight: number; letterSpacing: string }
> = {
  h1: { fontSize: '2.875rem', lineHeight: 1.08, fontWeight: 700, letterSpacing: '-0.01em' },
  h2: { fontSize: '2.125rem', lineHeight: 1.14, fontWeight: 600, letterSpacing: '-0.005em' },
  h3: { fontSize: '1.75rem', lineHeight: 1.18, fontWeight: 600, letterSpacing: '0' },
  h4: { fontSize: '1.5rem', lineHeight: 1.22, fontWeight: 600, letterSpacing: '0' },
  h5: { fontSize: '1.25rem', lineHeight: 1.26, fontWeight: 500, letterSpacing: '0' },
  h6: { fontSize: '1.0625rem', lineHeight: 1.28, fontWeight: 500, letterSpacing: '0.01em' },
};

const SUBTITLE_TOKENS: Record<'subtitle1' | 'subtitle2', { fontSize: string; lineHeight: number; fontWeight: number; letterSpacing: string }> = {
  subtitle1: { fontSize: '1rem', lineHeight: 1.4, fontWeight: 600, letterSpacing: '0.01em' },
  subtitle2: { fontSize: '0.875rem', lineHeight: 1.45, fontWeight: 600, letterSpacing: '0.01em' },
};

const OVERLINE_TOKENS: Record<'overline', { fontSize: string; lineHeight: number; fontWeight: number; letterSpacing: string }> = {
  overline: { fontSize: '0.75rem', lineHeight: 2, fontWeight: 600, letterSpacing: '0.08em' },
};

function themeOptionsFor(mode: Mode): ThemeOptions {
  const defaults = parseProjectDefaults(
    JSON.parse(readFileSync(path.resolve(__dirname, '../../palette/project-defaults.json'), 'utf8')),
  );
  const resolved = resolvePalette({
    baseColors: defaults.palettes[mode].baseColors,
    overrides: defaults.palettes[mode].overrides,
    mode,
    contrast: 'medium',
  });
  return createSunfadeThemeOptions(resolved, mode, 'medium');
}

/** The shared options source builds plain data (no functional variants), so
 * variant typography is a plain record; this narrows MUI's union for tests. */
const variantTypographyOf = (
  typography: ThemeOptions['typography'],
  variant: string,
): Record<string, string | number | undefined> | undefined => {
  expect(typography).toBeDefined();
  const plain = typography as Record<string, unknown>;
  const variantTypography = typeof plain === 'object' && plain !== null && variant in plain
    ? plain[variant]
    : undefined;
  return typeof variantTypography === 'object' && variantTypography !== null
    ? variantTypography as Record<string, string | number | undefined>
    : undefined;
};

describe('heading scale: compact industrial instrument labels (Montserrat stays the face)', () => {
  it.each(MODES)('%s: every heading variant carries the compact scale on the Montserrat stack', (mode) => {
    const typography = themeOptionsFor(mode).typography;
    for (const variant of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const) {
      const variantTypography = variantTypographyOf(typography, variant);
      expect(variantTypography, `${variant} is configured`).toBeDefined();
      expect(String(variantTypography?.fontFamily), `${variant} face is the Montserrat UI stack`).toContain('--font-sunfade-montserrat');
      expect(variantTypography?.fontSize, `${variant} fontSize`).toBe(HEADING_SCALES[variant].fontSize);
      expect(variantTypography?.lineHeight, `${variant} lineHeight is compact`).toBe(HEADING_SCALES[variant].lineHeight);
      expect(variantTypography?.fontWeight, `${variant} fontWeight`).toBe(HEADING_SCALES[variant].fontWeight);
      expect(variantTypography?.letterSpacing, `${variant} letterSpacing is restrained`).toBe(HEADING_SCALES[variant].letterSpacing);
    }
  });

  it.each(MODES)('%s: top display tier is bold, display band semibold, small instrument labels medium', (mode) => {
    const typography = themeOptionsFor(mode).typography;
    expect(variantTypographyOf(typography, 'h1')?.fontWeight, 'h1 bold').toBe(700);
    for (const variant of ['h2', 'h3', 'h4'] as const) {
      expect(variantTypographyOf(typography, variant)?.fontWeight, `${variant} semibold`).toBe(600);
    }
    for (const variant of ['h5', 'h6'] as const) {
      expect(variantTypographyOf(typography, variant)?.fontWeight, `${variant} medium`).toBe(500);
    }
  });

  it.each(MODES)('%s: subtitle and overline utility labels carry deliberate instrument tokens', (mode) => {
    const typography = themeOptionsFor(mode).typography;
    for (const variant of ['subtitle1', 'subtitle2'] as const) {
      const variantTypography = variantTypographyOf(typography, variant);
      expect(String(variantTypography?.fontFamily), `${variant} face is the Montserrat UI stack`).toContain('--font-sunfade-montserrat');
      expect(variantTypography?.fontSize, `${variant} fontSize`).toBe(SUBTITLE_TOKENS[variant].fontSize);
      expect(variantTypography?.lineHeight, `${variant} lineHeight`).toBe(SUBTITLE_TOKENS[variant].lineHeight);
      expect(variantTypography?.fontWeight, `${variant} fontWeight`).toBe(SUBTITLE_TOKENS[variant].fontWeight);
      expect(variantTypography?.letterSpacing, `${variant} letterSpacing`).toBe(SUBTITLE_TOKENS[variant].letterSpacing);
    }
    const overline = variantTypographyOf(typography, 'overline');
    expect(String(overline?.fontFamily), 'overline face is the Montserrat UI stack').toContain('--font-sunfade-montserrat');
    expect(overline?.fontSize, 'overline fontSize').toBe(OVERLINE_TOKENS.overline.fontSize);
    expect(overline?.lineHeight, 'overline lineHeight').toBe(OVERLINE_TOKENS.overline.lineHeight);
    expect(overline?.fontWeight, 'overline fontWeight').toBe(OVERLINE_TOKENS.overline.fontWeight);
    expect(overline?.letterSpacing, 'overline letterSpacing').toBe(OVERLINE_TOKENS.overline.letterSpacing);
  });

  it.each(MODES)('%s: body/terminal base stack is untouched and caption stays family-only', (mode) => {
    const typography = themeOptionsFor(mode).typography;
    const baseFamily = (typography as { fontFamily?: string } | undefined)?.fontFamily;
    expect(baseFamily).toContain('--font-sunfade-caskaydia');
    // Caption is locally specified by the app; the theme keeps it family-only.
    const caption = variantTypographyOf(typography, 'caption');
    expect(String(caption?.fontFamily), 'caption face is the Montserrat UI stack').toContain('--font-sunfade-montserrat');
    expect(Object.keys(caption ?? {}).sort(), 'caption stays family-only').toEqual(['fontFamily']);
    expect(variantTypographyOf(typography, 'button')?.fontFamily, 'button face is the Montserrat UI stack').toContain('--font-sunfade-montserrat');
  });
});
