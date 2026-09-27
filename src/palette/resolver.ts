// ──────────────────────────────────────────────
// Resolver — Combine engines + merge overrides → ResolvedPalette
// ──────────────────────────────────────────────

import { deriveAccentVariants } from './variant-engine';
import { deriveBgShades, deriveFgShades, deriveGray } from './shade-engine';
import { ACCENT_NAMES, type AccentName, type PaletteConfig, type ResolvedPalette } from './types';

/**
 * Resolve a full palette from a PaletteConfig.
 *
 * 1. Derive bg shades from baseColors.bg
 * 2. Derive fg shades from baseColors.fg
 * 3. Derive accent variants for all 7 hues
 * 4. Derive gray from bg4 + fg4
 * 5. Spread overrides on top (any override replaces the computed value)
 */
export function resolvePalette(config: PaletteConfig): ResolvedPalette {
  const { baseColors, overrides, mode } = config;

  // 1. Background shades
  const bgShades = deriveBgShades(baseColors.bg, mode);

  // 2. Foreground shades
  const fgShades = deriveFgShades(baseColors.fg, mode);

  // 3. Accent variants
  const accents: Record<string, string> = {};
  for (const name of ACCENT_NAMES) {
    const neutralValue = baseColors[name as keyof typeof baseColors];
    const variants = deriveAccentVariants(neutralValue, name as AccentName, mode);
    accents[`bright_${name}`] = variants.bright;
    accents[`neutral_${name}`] = variants.neutral;
    accents[`faded_${name}`] = variants.faded;
    accents[`deep_${name}`] = variants.deep;
  }

  // 4. Gray
  const gray = deriveGray(bgShades.bg4, fgShades.fg4);

  // 5. Assemble computed palette
  const computed: ResolvedPalette = {
    // bg
    bg0_hard: bgShades.bg0_hard,
    bg0: baseColors.bg,
    bg0_soft: bgShades.bg0_soft,
    bg1: bgShades.bg1,
    bg2: bgShades.bg2,
    bg3: bgShades.bg3,
    bg4: bgShades.bg4,

    // fg
    fg0: fgShades.fg0,
    fg1: baseColors.fg,
    fg2: fgShades.fg2,
    fg3: fgShades.fg3,
    fg4: fgShades.fg4,

    // gray
    gray,

    // accents
    bright_red: accents.bright_red,
    bright_green: accents.bright_green,
    bright_yellow: accents.bright_yellow,
    bright_blue: accents.bright_blue,
    bright_purple: accents.bright_purple,
    bright_aqua: accents.bright_aqua,
    bright_orange: accents.bright_orange,

    neutral_red: accents.neutral_red,
    neutral_green: accents.neutral_green,
    neutral_yellow: accents.neutral_yellow,
    neutral_blue: accents.neutral_blue,
    neutral_purple: accents.neutral_purple,
    neutral_aqua: accents.neutral_aqua,
    neutral_orange: accents.neutral_orange,

    faded_red: accents.faded_red,
    faded_green: accents.faded_green,
    faded_yellow: accents.faded_yellow,
    faded_blue: accents.faded_blue,
    faded_purple: accents.faded_purple,
    faded_aqua: accents.faded_aqua,
    faded_orange: accents.faded_orange,

    deep_red: accents.deep_red,
    deep_green: accents.deep_green,
    deep_yellow: accents.deep_yellow,
    deep_blue: accents.deep_blue,
    deep_purple: accents.deep_purple,
    deep_aqua: accents.deep_aqua,
    deep_orange: accents.deep_orange,
  };

  // 6. Merge overrides on top
  const result = { ...computed };
  for (const [key, value] of Object.entries(overrides)) {
    if (key in result) {
      (result as Record<string, string>)[key] = value;
    }
  }

  return result;
}
