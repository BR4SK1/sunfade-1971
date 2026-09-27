import { describe, it, expect } from 'vitest';
import { resolvePalette } from '../resolver.js';
import { DARK_DEFAULTS, LIGHT_DEFAULTS, DEFAULT_DARK_BASE_COLORS, DEFAULT_LIGHT_BASE_COLORS } from '../defaults.js';
import type { PaletteConfig, ResolvedPalette } from '../types.js';

describe('resolvePalette — dark mode identity', () => {
  it('produces the Sunfade dark palette from its default base colors', () => {
    const config: PaletteConfig = {
      baseColors: { ...DEFAULT_DARK_BASE_COLORS },
      overrides: {},
      mode: 'dark',
      contrast: 'medium',
    };

    const result = resolvePalette(config);

    // Check every bg shade
    expect(result.bg0_hard).toBe(DARK_DEFAULTS.bg0_hard);
    expect(result.bg0).toBe(DARK_DEFAULTS.bg0);
    expect(result.bg0_soft).toBe(DARK_DEFAULTS.bg0_soft);
    expect(result.bg1).toBe(DARK_DEFAULTS.bg1);
    expect(result.bg2).toBe(DARK_DEFAULTS.bg2);
    expect(result.bg3).toBe(DARK_DEFAULTS.bg3);
    expect(result.bg4).toBe(DARK_DEFAULTS.bg4);

    // Check every fg shade
    expect(result.fg0).toBe(DARK_DEFAULTS.fg0);
    expect(result.fg1).toBe(DARK_DEFAULTS.fg1);
    expect(result.fg2).toBe(DARK_DEFAULTS.fg2);
    expect(result.fg3).toBe(DARK_DEFAULTS.fg3);
    expect(result.fg4).toBe(DARK_DEFAULTS.fg4);

    // Gray
    expect(result.gray).toBe(DARK_DEFAULTS.gray);

    // Accent colors — bright
    expect(result.bright_red).toBe(DARK_DEFAULTS.bright_red);
    expect(result.bright_green).toBe(DARK_DEFAULTS.bright_green);
    expect(result.bright_yellow).toBe(DARK_DEFAULTS.bright_yellow);
    expect(result.bright_blue).toBe(DARK_DEFAULTS.bright_blue);
    expect(result.bright_purple).toBe(DARK_DEFAULTS.bright_purple);
    expect(result.bright_aqua).toBe(DARK_DEFAULTS.bright_aqua);
    expect(result.bright_orange).toBe(DARK_DEFAULTS.bright_orange);

    // Accent colors — neutral
    expect(result.neutral_red).toBe(DARK_DEFAULTS.neutral_red);
    expect(result.neutral_green).toBe(DARK_DEFAULTS.neutral_green);
    expect(result.neutral_yellow).toBe(DARK_DEFAULTS.neutral_yellow);
    expect(result.neutral_blue).toBe(DARK_DEFAULTS.neutral_blue);
    expect(result.neutral_purple).toBe(DARK_DEFAULTS.neutral_purple);
    expect(result.neutral_aqua).toBe(DARK_DEFAULTS.neutral_aqua);
    expect(result.neutral_orange).toBe(DARK_DEFAULTS.neutral_orange);

    // Accent colors — faded
    expect(result.faded_red).toBe(DARK_DEFAULTS.faded_red);
    expect(result.faded_green).toBe(DARK_DEFAULTS.faded_green);
    expect(result.faded_yellow).toBe(DARK_DEFAULTS.faded_yellow);
    expect(result.faded_blue).toBe(DARK_DEFAULTS.faded_blue);
    expect(result.faded_purple).toBe(DARK_DEFAULTS.faded_purple);
    expect(result.faded_aqua).toBe(DARK_DEFAULTS.faded_aqua);
    expect(result.faded_orange).toBe(DARK_DEFAULTS.faded_orange);

    // Accent colors — deep
    expect(result.deep_red).toBe(DARK_DEFAULTS.deep_red);
    expect(result.deep_green).toBe(DARK_DEFAULTS.deep_green);
    expect(result.deep_yellow).toBe(DARK_DEFAULTS.deep_yellow);
    expect(result.deep_blue).toBe(DARK_DEFAULTS.deep_blue);
    expect(result.deep_purple).toBe(DARK_DEFAULTS.deep_purple);
    expect(result.deep_aqua).toBe(DARK_DEFAULTS.deep_aqua);
    expect(result.deep_orange).toBe(DARK_DEFAULTS.deep_orange);
  });
});

describe('resolvePalette — light mode identity', () => {
  it('produces the Sunfade light palette from its default base colors', () => {
    const config: PaletteConfig = {
      baseColors: { ...DEFAULT_LIGHT_BASE_COLORS },
      overrides: {},
      mode: 'light',
      contrast: 'medium',
    };

    const result = resolvePalette(config);

    expect(result).toEqual(LIGHT_DEFAULTS);
  });
});

describe('resolvePalette — overrides', () => {
  it('applies a single override', () => {
    const config: PaletteConfig = {
      baseColors: { ...DEFAULT_DARK_BASE_COLORS },
      overrides: { bright_red: '#ff0000' },
      mode: 'dark',
      contrast: 'medium',
    };

    const result = resolvePalette(config);

    expect(result.bright_red).toBe('#ff0000');
    // Other bright colors should still be canonical
    expect(result.bright_green).toBe(DARK_DEFAULTS.bright_green);
    expect(result.bright_blue).toBe(DARK_DEFAULTS.bright_blue);
  });

  it('applies multiple overrides', () => {
    const config: PaletteConfig = {
      baseColors: { ...DEFAULT_DARK_BASE_COLORS },
      overrides: {
        bright_red: '#ff0000',
        bg3: '#555555',
        fg0: '#fefefe',
      },
      mode: 'dark',
      contrast: 'medium',
    };

    const result = resolvePalette(config);

    expect(result.bright_red).toBe('#ff0000');
    expect(result.bg3).toBe('#555555');
    expect(result.fg0).toBe('#fefefe');
    // Non-overridden values should remain canonical
    expect(result.bg0).toBe(DARK_DEFAULTS.bg0);
    expect(result.neutral_red).toBe(DARK_DEFAULTS.neutral_red);
  });

  it('ignores invalid override keys', () => {
    const config: PaletteConfig = {
      baseColors: { ...DEFAULT_DARK_BASE_COLORS },
      overrides: { nonexistent_color: '#ff0000' },
      mode: 'dark',
      contrast: 'medium',
    };

    const result = resolvePalette(config);
    // Should not have the invalid key
    expect((result as unknown as Record<string, string>)['nonexistent_color']).toBeUndefined();
  });
});

describe('resolvePalette — all keys present', () => {
  it('returns an object with exactly the expected keys', () => {
    const config: PaletteConfig = {
      baseColors: { ...DEFAULT_DARK_BASE_COLORS },
      overrides: {},
      mode: 'dark',
      contrast: 'medium',
    };

    const result = resolvePalette(config);
    const keys = Object.keys(result);

    // 7 bg + 5 fg + 1 gray + 7×4 accents = 41
    expect(keys).toHaveLength(41);

    // All values should be valid hex
    for (const val of Object.values(result)) {
      expect(val).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
