// ──────────────────────────────────────────────
// Sunfade 1971 palette engine — type definitions
// ──────────────────────────────────────────────

export type Mode = 'dark' | 'light';
export type Contrast = 'soft' | 'medium' | 'hard';

export type AccentName = 'red' | 'green' | 'yellow' | 'blue' | 'purple' | 'aqua' | 'orange';
export type AccentTier = 'bright' | 'neutral' | 'faded' | 'deep';

export const ACCENT_NAMES: readonly AccentName[] = [
  'red', 'green', 'yellow', 'blue', 'purple', 'aqua', 'orange',
] as const;

export const ACCENT_TIERS: readonly AccentTier[] = [
  'bright', 'neutral', 'faded', 'deep',
] as const;

/** The 9 user-editable base colors that drive all derivations. */
export interface BaseColors {
  red: string;
  green: string;
  yellow: string;
  blue: string;
  purple: string;
  aqua: string;
  orange: string;
  fg: string; // fg1 base
  bg: string; // bg0 base
}

/** Optional overrides keyed by canonical color name (e.g. "bright_red", "bg3"). */
export type PaletteOverrides = Record<string, string>;

export interface PaletteConfig {
  baseColors: BaseColors;
  overrides: PaletteOverrides;
  mode: Mode;
  contrast: Contrast;
}

/** Editable colors for one appearance mode. */
export interface ModePalette {
  baseColors: BaseColors;
  overrides: PaletteOverrides;
}

/** Light and dark palette configurations saved together as one scheme. */
export type ModePalettes = Record<Mode, ModePalette>;

/** HSL color representation. h ∈ [0,360), s ∈ [0,100], l ∈ [0,100]. */
export interface HSL {
  h: number;
  s: number;
  l: number;
}

/** The full resolved palette — all ~45 hex values as a flat object. */
export interface ResolvedPalette {
  // Background shades
  bg0_hard: string;
  bg0: string;
  bg0_soft: string;
  bg1: string;
  bg2: string;
  bg3: string;
  bg4: string;

  // Foreground shades
  fg0: string;
  fg1: string;
  fg2: string;
  fg3: string;
  fg4: string;

  // Gray
  gray: string;

  // Accent colors: bright
  bright_red: string;
  bright_green: string;
  bright_yellow: string;
  bright_blue: string;
  bright_purple: string;
  bright_aqua: string;
  bright_orange: string;

  // Accent colors: neutral
  neutral_red: string;
  neutral_green: string;
  neutral_yellow: string;
  neutral_blue: string;
  neutral_purple: string;
  neutral_aqua: string;
  neutral_orange: string;

  // Accent colors: faded
  faded_red: string;
  faded_green: string;
  faded_yellow: string;
  faded_blue: string;
  faded_purple: string;
  faded_aqua: string;
  faded_orange: string;

  // Accent colors: deep
  deep_red: string;
  deep_green: string;
  deep_yellow: string;
  deep_blue: string;
  deep_purple: string;
  deep_aqua: string;
  deep_orange: string;
}

/** Union of all keys in ResolvedPalette — valid override targets. */
export type DerivedColorKey = keyof ResolvedPalette;

/** Accent variant set returned by the variant engine. */
export interface AccentVariants {
  bright: string;
  neutral: string;
  faded: string;
  deep: string;
}

/** Background shade set returned by the shade engine. */
export interface BgShades {
  bg0_hard: string;
  bg0_soft: string;
  bg1: string;
  bg2: string;
  bg3: string;
  bg4: string;
}

/** Foreground shade set returned by the shade engine. */
export interface FgShades {
  fg0: string;
  fg2: string;
  fg3: string;
  fg4: string;
}
