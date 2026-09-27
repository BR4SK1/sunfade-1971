// ──────────────────────────────────────────────
// Shade Engine — Derive bg0-bg4, fg0-fg4, and gray from base colors
// ──────────────────────────────────────────────

import { hexToHsl, hslToHex, clampHsl, rgbMidpoint } from './color-utils.js';
import {
  REFERENCE_DARK_BG,
  REFERENCE_DARK_FG,
  REFERENCE_LIGHT_BG,
  REFERENCE_LIGHT_FG,
} from './defaults.js';
import type { BgShades, FgShades, Mode } from './types.js';

/**
 * Derive bg shades from a user's bg0 value.
 *
 * Strategy: compute the HSL lightness (and saturation/hue) offsets between
 * each reference shade and the reference bg0, then apply those same offsets
 * to the user's bg0.
 */
export function deriveBgShades(bg0: string, mode: Mode): BgShades {
  const ref = mode === 'dark' ? REFERENCE_DARK_BG : REFERENCE_LIGHT_BG;
  const refBg0Hsl = hexToHsl(ref.bg0);
  const userBg0Hsl = hexToHsl(bg0);

  const deriveShade = (refHex: string): string => {
    const refHsl = hexToHsl(refHex);
    const offset = {
      h: refHsl.h - refBg0Hsl.h,
      s: refHsl.s - refBg0Hsl.s,
      l: refHsl.l - refBg0Hsl.l,
    };
    return hslToHex(clampHsl({
      h: userBg0Hsl.h + offset.h,
      s: userBg0Hsl.s + offset.s,
      l: userBg0Hsl.l + offset.l,
    }));
  };

  return {
    bg0_hard: deriveShade(ref.bg0_hard),
    bg0_soft: deriveShade(ref.bg0_soft),
    bg1: deriveShade(ref.bg1),
    bg2: deriveShade(ref.bg2),
    bg3: deriveShade(ref.bg3),
    bg4: deriveShade(ref.bg4),
  };
}

/**
 * Derive fg shades from a user's fg1 value.
 *
 * Same offset strategy as bg shades: compute offsets from reference fg1
 * to each other fg shade, then apply to the user's fg1.
 */
export function deriveFgShades(fg1: string, mode: Mode): FgShades {
  const ref = mode === 'dark' ? REFERENCE_DARK_FG : REFERENCE_LIGHT_FG;
  const refFg1Hsl = hexToHsl(ref.fg1);
  const userFg1Hsl = hexToHsl(fg1);

  const deriveShade = (refHex: string): string => {
    const refHsl = hexToHsl(refHex);
    const offset = {
      h: refHsl.h - refFg1Hsl.h,
      s: refHsl.s - refFg1Hsl.s,
      l: refHsl.l - refFg1Hsl.l,
    };
    return hslToHex(clampHsl({
      h: userFg1Hsl.h + offset.h,
      s: userFg1Hsl.s + offset.s,
      l: userFg1Hsl.l + offset.l,
    }));
  };

  return {
    fg0: deriveShade(ref.fg0),
    fg2: deriveShade(ref.fg2),
    fg3: deriveShade(ref.fg3),
    fg4: deriveShade(ref.fg4),
  };
}

/**
 * Derive gray as the HSL midpoint between bg4 and fg4.
 */
export function deriveGray(bg4: string, fg4: string): string {
  return rgbMidpoint(bg4, fg4);
}
