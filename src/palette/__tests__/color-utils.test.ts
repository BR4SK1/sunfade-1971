import { describe, it, expect } from 'vitest';
import { hexToHsl, hslToHex, clampHsl, computeDelta, applyDelta, relativeLuminance, rgbMidpoint } from '../color-utils';

describe('hexToHsl', () => {
  it('converts pure red', () => {
    const hsl = hexToHsl('#ff0000');
    expect(hsl.h).toBeCloseTo(0, 0);
    expect(hsl.s).toBeCloseTo(100, 0);
    expect(hsl.l).toBeCloseTo(50, 0);
  });

  it('converts pure green', () => {
    const hsl = hexToHsl('#00ff00');
    expect(hsl.h).toBeCloseTo(120, 0);
    expect(hsl.s).toBeCloseTo(100, 0);
    expect(hsl.l).toBeCloseTo(50, 0);
  });

  it('converts pure blue', () => {
    const hsl = hexToHsl('#0000ff');
    expect(hsl.h).toBeCloseTo(240, 0);
    expect(hsl.s).toBeCloseTo(100, 0);
    expect(hsl.l).toBeCloseTo(50, 0);
  });

  it('converts pure white', () => {
    const hsl = hexToHsl('#ffffff');
    expect(hsl.s).toBeCloseTo(0, 0);
    expect(hsl.l).toBeCloseTo(100, 0);
  });

  it('converts pure black', () => {
    const hsl = hexToHsl('#000000');
    expect(hsl.s).toBeCloseTo(0, 0);
    expect(hsl.l).toBeCloseTo(0, 0);
  });

  it('converts Sunfade dark bg0 (#28201b)', () => {
    const hsl = hexToHsl('#28201b');
    expect(hsl.h).toBeCloseTo(23.1, 0);
    expect(hsl.s).toBeCloseTo(19.4, 0);
    expect(hsl.l).toBeCloseTo(13.1, 0);
  });

  it('converts Sunfade neutral red (#c05a45)', () => {
    const hsl = hexToHsl('#c05a45');
    expect(hsl.h).toBeCloseTo(10.2, 0);
    expect(hsl.s).toBeCloseTo(49.4, 0);
    expect(hsl.l).toBeCloseTo(51.2, 0);
  });

  it('handles input without # prefix', () => {
    const hsl = hexToHsl('ff0000');
    expect(hsl.h).toBeCloseTo(0, 0);
    expect(hsl.s).toBeCloseTo(100, 0);
    expect(hsl.l).toBeCloseTo(50, 0);
  });
});

describe('hslToHex', () => {
  it('converts pure red HSL to hex', () => {
    expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe('#ff0000');
  });

  it('converts pure green HSL to hex', () => {
    expect(hslToHex({ h: 120, s: 100, l: 50 })).toBe('#00ff00');
  });

  it('converts pure white HSL to hex', () => {
    expect(hslToHex({ h: 0, s: 0, l: 100 })).toBe('#ffffff');
  });

  it('converts pure black HSL to hex', () => {
    expect(hslToHex({ h: 0, s: 0, l: 0 })).toBe('#000000');
  });

  it('converts 50% gray', () => {
    expect(hslToHex({ h: 0, s: 0, l: 50 })).toBe('#808080');
  });
});

describe('hexToHsl → hslToHex round-trip', () => {
  const testColors = [
    '#28201b', '#f8e9d2', '#c05a45', '#7f873f', '#c28a38',
    '#66828a', '#9a6f86', '#6e8b70', '#c46a35', '#937356',
    '#e4775f', '#a1a45b', '#dfa54c', '#89a3a4', '#b28aa0',
    '#91a586', '#e58349', '#914334', '#61682f', '#906222',
  ];

  for (const hex of testColors) {
    it(`round-trips ${hex}`, () => {
      const hsl = hexToHsl(hex);
      const result = hslToHex(hsl);
      expect(result).toBe(hex);
    });
  }
});

describe('clampHsl', () => {
  it('clamps saturation to [0, 100]', () => {
    expect(clampHsl({ h: 180, s: -10, l: 50 }).s).toBe(0);
    expect(clampHsl({ h: 180, s: 110, l: 50 }).s).toBe(100);
  });

  it('clamps lightness to [3, 97]', () => {
    expect(clampHsl({ h: 180, s: 50, l: 0 }).l).toBe(3);
    expect(clampHsl({ h: 180, s: 50, l: 100 }).l).toBe(97);
  });

  it('wraps hue to [0, 360)', () => {
    expect(clampHsl({ h: 370, s: 50, l: 50 }).h).toBeCloseTo(10, 5);
    expect(clampHsl({ h: -10, s: 50, l: 50 }).h).toBeCloseTo(350, 5);
  });
});

describe('computeDelta / applyDelta', () => {
  it('computes identity delta', () => {
    const hsl = { h: 120, s: 50, l: 50 };
    const delta = computeDelta(hsl, hsl);
    expect(delta.h).toBeCloseTo(0, 5);
    expect(delta.s).toBeCloseTo(0, 5);
    expect(delta.l).toBeCloseTo(0, 5);
  });

  it('applying identity delta returns same color', () => {
    const hsl = { h: 120, s: 50, l: 50 };
    const delta = computeDelta(hsl, hsl);
    const result = applyDelta(hsl, delta);
    expect(result.h).toBeCloseTo(hsl.h, 1);
    expect(result.s).toBeCloseTo(hsl.s, 1);
    expect(result.l).toBeCloseTo(hsl.l, 1);
  });

  it('round-trips: applyDelta(from, computeDelta(from, to)) ≈ to', () => {
    const from = hexToHsl('#cc241d');
    const to = hexToHsl('#fb4934');
    const delta = computeDelta(from, to);
    const result = applyDelta(from, delta);
    expect(hslToHex(result)).toBe('#fb4934');
  });

  it('handles shortest-path hue delta across 0°/360° boundary', () => {
    const delta = computeDelta({ h: 350, s: 50, l: 50 }, { h: 10, s: 50, l: 50 });
    expect(delta.h).toBeCloseTo(20, 5);
  });
});

describe('relativeLuminance', () => {
  it('returns ~0 for black', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 2);
  });

  it('returns ~1 for white', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 2);
  });

  it('returns intermediate value for Sunfade bg0', () => {
    const lum = relativeLuminance('#28201b');
    expect(lum).toBeGreaterThan(0);
    expect(lum).toBeLessThan(0.1);
  });

  it('returns intermediate value for Sunfade fg1', () => {
    const lum = relativeLuminance('#ead3b0');
    expect(lum).toBeGreaterThan(0.5);
    expect(lum).toBeLessThan(1);
  });
});

describe('rgbMidpoint', () => {
  it('midpoint of black and white is gray', () => {
    const mid = rgbMidpoint('#000000', '#ffffff');
    expect(mid).toBe('#808080');
  });

  it('midpoint of same color returns same color', () => {
    const mid = rgbMidpoint('#cc241d', '#cc241d');
    expect(mid).toBe('#cc241d');
  });

  it('midpoint of Sunfade bg4 and fg4 produces expected gray', () => {
    const mid = rgbMidpoint('#7f604a', '#a78762');
    expect(mid).toBe('#937456');
  });
});
