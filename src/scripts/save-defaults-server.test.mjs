import { describe, expect, it } from 'vitest';
import { validateArtifactDocument, validateSavePayload } from './save-defaults-server.mjs';

const VALID_DARK = {
  baseColors: {
    red: '#c05a45', green: '#7f873f', yellow: '#c28a38', blue: '#66828a',
    purple: '#9a6f86', aqua: '#6e8b70', orange: '#c46a35', fg: '#ead3b0', bg: '#1b1816',
  },
  overrides: {},
};
const VALID_LIGHT = {
  baseColors: {
    red: '#c05a45', green: '#7f873f', yellow: '#c28a38', blue: '#66828a',
    purple: '#9a6f86', aqua: '#6e8b70', orange: '#c46a35', fg: '#392b24', bg: '#f8e9d2',
  },
  overrides: { bg0: '#111010', bright_red: '#ff8866' },
};

describe('validateSavePayload', () => {
  it('accepts a valid payload with both modes and overrides', () => {
    const result = validateSavePayload({ baseRevision: 2, palettes: { dark: VALID_DARK, light: VALID_LIGHT } });
    expect(result.ok).toBe(true);
    expect(result.palettes.dark).toEqual(VALID_DARK);
    expect(result.palettes.light).toEqual(VALID_LIGHT);
  });

  it('rejects non-integer or negative baseRevision', () => {
    expect(validateSavePayload({ baseRevision: '1', palettes: {} }).ok).toBe(false);
    expect(validateSavePayload({ baseRevision: -1, palettes: {} }).ok).toBe(false);
    expect(validateSavePayload({ baseRevision: 1.5, palettes: {} }).ok).toBe(false);
  });

  it('rejects invalid hex colors in base colors and overrides', () => {
    const badBase = { ...VALID_DARK, baseColors: { ...VALID_DARK.baseColors, bg: '#12345' } };
    expect(validateSavePayload({ baseRevision: 1, palettes: { dark: badBase, light: VALID_LIGHT } }).ok).toBe(false);

    const badOverride = { ...VALID_LIGHT, overrides: { ...VALID_LIGHT.overrides, bg1: 'zzz111' } };
    expect(validateSavePayload({ baseRevision: 1, palettes: { dark: VALID_DARK, light: badOverride } }).ok).toBe(false);
  });

  it('rejects unknown override keys', () => {
    const unknownKey = { ...VALID_LIGHT, overrides: { ...VALID_LIGHT.overrides, bg9: '#111111' } };
    expect(validateSavePayload({ baseRevision: 1, palettes: { dark: VALID_DARK, light: unknownKey } }).ok).toBe(false);
  });

  it('rejects missing modes or malformed palette structure', () => {
    expect(validateSavePayload({ baseRevision: 1, palettes: { dark: VALID_DARK } }).ok).toBe(false);
    expect(validateSavePayload({ baseRevision: 1, palettes: { dark: null, light: VALID_LIGHT } }).ok).toBe(false);
    expect(validateSavePayload(null).ok).toBe(false);
    expect(validateSavePayload('x').ok).toBe(false);
  });
});

describe('validateArtifactDocument', () => {
  it('accepts a valid artifact and reports its revision', () => {
    const result = validateArtifactDocument({ revision: 7, palettes: { dark: VALID_DARK, light: VALID_LIGHT } });
    expect(result.ok).toBe(true);
    expect(result.revision).toBe(7);
  });

  it('rejects invalid revisions', () => {
    expect(validateArtifactDocument({ revision: 0, palettes: { dark: VALID_DARK, light: VALID_LIGHT } }).ok).toBe(false);
    expect(validateArtifactDocument({ palettes: { dark: VALID_DARK, light: VALID_LIGHT } }).ok).toBe(false);
  });
});
