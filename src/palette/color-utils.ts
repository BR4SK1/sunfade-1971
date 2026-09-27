// ──────────────────────────────────────────────
// Color Math Utilities — Pure functions for HSL conversion and manipulation
// ──────────────────────────────────────────────

import type { HSL } from './types.js';

/**
 * Parse a hex color string to RGB components [0–255].
 * Accepts "#RRGGBB" or "RRGGBB".
 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  const n = parseInt(h, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/**
 * Convert RGB [0–255] to a "#rrggbb" hex string.
 */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)]
    .map(v => v.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert a hex color to HSL.
 * h ∈ [0, 360), s ∈ [0, 100], l ∈ [0, 100].
 */
export function hexToHsl(hex: string): HSL {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    default: h = ((r - g) / d + 4) / 6; break;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to a "#rrggbb" hex string.
 * h ∈ [0, 360), s ∈ [0, 100], l ∈ [0, 100].
 */
export function hslToHex(hsl: HSL): string {
  const { h, s, l } = hsl;
  const sNorm = s / 100;
  const lNorm = l / 100;

  if (sNorm === 0) {
    const v = Math.round(lNorm * 255);
    return rgbToHex(v, v, v);
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = lNorm < 0.5
    ? lNorm * (1 + sNorm)
    : lNorm + sNorm - lNorm * sNorm;
  const p = 2 * lNorm - q;
  const hNorm = h / 360;

  const r = hue2rgb(p, q, hNorm + 1 / 3);
  const g = hue2rgb(p, q, hNorm);
  const b = hue2rgb(p, q, hNorm - 1 / 3);

  return rgbToHex(r * 255, g * 255, b * 255);
}

/**
 * Clamp HSL values to valid ranges.
 * h wraps to [0, 360), s clamps to [0, 100], l clamps to [3, 97].
 * The lightness floor of 3% prevents pure black; ceiling of 97% prevents pure white.
 */
export function clampHsl(hsl: HSL): HSL {
  let h = hsl.h % 360;
  if (h < 0) h += 360;
  return {
    h,
    s: Math.max(0, Math.min(100, hsl.s)),
    l: Math.max(3, Math.min(97, hsl.l)),
  };
}

/**
 * Compute the HSL delta between two colors: to - from.
 */
export function computeDelta(from: HSL, to: HSL): HSL {
  let dh = to.h - from.h;
  // Shortest-path hue delta
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return {
    h: dh,
    s: to.s - from.s,
    l: to.l - from.l,
  };
}

/**
 * Apply an HSL delta to a base color, then clamp.
 */
export function applyDelta(base: HSL, delta: HSL): HSL {
  return clampHsl({
    h: base.h + delta.h,
    s: base.s + delta.s,
    l: base.l + delta.l,
  });
}

/**
 * Compute relative luminance of a hex color using the WCAG formula.
 * Returns a value in [0, 1] where 0 is black and 1 is white.
 * Uses simplified gamma: (v/255)^2.2
 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(v => Math.pow(v / 255, 2.2));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Compute the RGB midpoint between two hex colors.
 * Uses simple RGB component averaging for deterministic results.
 */
export function rgbMidpoint(hex1: string, hex2: string): string {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return rgbToHex(
    Math.round((r1 + r2) / 2),
    Math.round((g1 + g2) / 2),
    Math.round((b1 + b2) / 2),
  );
}
