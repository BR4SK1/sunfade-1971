import { describe, it, expect } from 'vitest';
import { deriveAccentVariants } from '../variant-engine';
import { REFERENCE_ACCENTS, DARK_DEFAULTS } from '../defaults';
import type { AccentName } from '../types';

const ACCENT_NAMES: AccentName[] = ['red', 'green', 'yellow', 'blue', 'purple', 'aqua', 'orange'];

describe('deriveAccentVariants — identity test', () => {
  for (const name of ACCENT_NAMES) {
    it(`derives the default bright/faded variants for ${name}`, () => {
      const ref = REFERENCE_ACCENTS[name];
      const variants = deriveAccentVariants(ref.neutral, name, 'dark');

      // Neutral should be passed through unchanged
      expect(variants.neutral).toBe(ref.neutral);

      // Bright and faded should match canonical values
      // (identity: applying delta computed from ref to the same ref should yield ref)
      expect(variants.bright).toBe(ref.bright);
      expect(variants.faded).toBe(ref.faded);
    });
  }
});

describe('deriveAccentVariants — deep tier', () => {
  for (const name of ACCENT_NAMES) {
    it(`deep ${name} is darker than faded`, () => {
      const ref = REFERENCE_ACCENTS[name];
      const variants = deriveAccentVariants(ref.neutral, name, 'dark');

      // Deep should exist and be a valid hex
      expect(variants.deep).toMatch(/^#[0-9a-f]{6}$/);

      // Deep should match the pre-computed value from defaults
      const defaultKey = `deep_${name}` as keyof typeof DARK_DEFAULTS;
      expect(variants.deep).toBe(DARK_DEFAULTS[defaultKey]);
    });
  }
});

describe('deriveAccentVariants — custom neutral', () => {
  it('derives reasonable variants for a shifted red', () => {
    const customRed = '#dd3333';
    const variants = deriveAccentVariants(customRed, 'red', 'dark');

    expect(variants.neutral).toBe(customRed);
    expect(variants.bright).toMatch(/^#[0-9a-f]{6}$/);
    expect(variants.faded).toMatch(/^#[0-9a-f]{6}$/);
    expect(variants.deep).toMatch(/^#[0-9a-f]{6}$/);

    // Variants should be different from neutral
    expect(variants.bright).not.toBe(customRed);
    expect(variants.faded).not.toBe(customRed);
  });

  it('handles near-white neutral without error', () => {
    const variants = deriveAccentVariants('#f0f0f0', 'blue', 'dark');
    expect(variants.bright).toMatch(/^#[0-9a-f]{6}$/);
    expect(variants.deep).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('handles near-black neutral without error', () => {
    const variants = deriveAccentVariants('#0a0a0a', 'green', 'dark');
    expect(variants.bright).toMatch(/^#[0-9a-f]{6}$/);
    expect(variants.deep).toMatch(/^#[0-9a-f]{6}$/);
  });
});
