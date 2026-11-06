import { describe, expect, it } from 'vitest';
import {
  InvalidProjectDefaultsError,
  parseProjectDefaults,
  PROJECT_DEFAULTS,
} from '../project-defaults';
import { DEFAULT_DARK_BASE_COLORS, DEFAULT_LIGHT_BASE_COLORS } from '../defaults';

describe('parseProjectDefaults', () => {
  it('accepts a well-formed artifact document', () => {
    const parsed = parseProjectDefaults({
      revision: 3,
      palettes: {
        dark: {
          baseColors: { ...DEFAULT_DARK_BASE_COLORS },
          overrides: { bg0: '#111010' },
        },
        light: {
          baseColors: { ...DEFAULT_LIGHT_BASE_COLORS },
          overrides: {},
        },
      },
    });
    expect(parsed.revision).toBe(3);
    expect(parsed.palettes.dark.overrides).toEqual({ bg0: '#111010' });
    expect(parsed.palettes.light.overrides).toEqual({});
  });

  it('rejects invalid revisions', () => {
    expect(() => parseProjectDefaults({ revision: 0, palettes: {} })).toThrow(InvalidProjectDefaultsError);
    expect(() => parseProjectDefaults({ revision: 1.5, palettes: {} })).toThrow(InvalidProjectDefaultsError);
    expect(() => parseProjectDefaults({ palettes: {} })).toThrow(InvalidProjectDefaultsError);
  });

  it('rejects invalid base colors and unknown overrides', () => {
    const makeDoc = (mutate: (palettes: Record<string, unknown>) => void) => {
      const palettes = {
        dark: { baseColors: { ...DEFAULT_DARK_BASE_COLORS }, overrides: {} },
        light: { baseColors: { ...DEFAULT_LIGHT_BASE_COLORS }, overrides: {} },
      };
      mutate(palettes as unknown as Record<string, unknown>);
      return { revision: 1, palettes };
    };

    expect(() => parseProjectDefaults(makeDoc((p) => {
      (p.dark as { baseColors: Record<string, string> }).baseColors.bg = 'nothex';
    }))).toThrow(/invalid bg base color/);

    expect(() => parseProjectDefaults(makeDoc((p) => {
      (p.light as { overrides: Record<string, string> }).overrides.not_a_key = '#123456';
    }))).toThrow(/unknown color override/);

    expect(() => parseProjectDefaults(makeDoc((p) => {
      (p.dark as { overrides: Record<string, string> }).overrides.bg1 = '#12345'; // 5 digits
    }))).toThrow(/invalid bg1 override color/);
  });

  it('rejects missing modes or palette structure', () => {
    expect(() => parseProjectDefaults({ revision: 1 })).toThrow(InvalidProjectDefaultsError);
    expect(() => parseProjectDefaults({ revision: 1, palettes: { dark: { baseColors: 4, overrides: {} }, light: { baseColors: {}, overrides: {} } } })).toThrow(/dark palette/);
  });
});

describe('PROJECT_DEFAULTS', () => {
  it('loads the tracked artifact with a positive revision', () => {
    expect(PROJECT_DEFAULTS.revision).toBeGreaterThanOrEqual(1);
    expect(Object.keys(PROJECT_DEFAULTS.palettes).sort()).toEqual(['dark', 'light']);
    for (const palette of Object.values(PROJECT_DEFAULTS.palettes)) {
      expect(palette.baseColors).toBeDefined();
      expect(palette.overrides).toBeTypeOf('object');
    }
  });

  it('round-trips the tracked artifact through the parser unchanged', () => {
    // The seeded artifact is user-mutable saved state: overrides may exist in
    // it, so tests assert parser fidelity rather than specific override values.
    expect(PROJECT_DEFAULTS.palettes.dark.overrides).toBeTypeOf('object');
    expect(PROJECT_DEFAULTS.palettes.light.overrides).toBeTypeOf('object');
    expect(parseProjectDefaults(PROJECT_DEFAULTS)).toEqual(PROJECT_DEFAULTS);
  });
});
