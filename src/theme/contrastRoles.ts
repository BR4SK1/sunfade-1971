import { getContrastRatio } from '@mui/material/styles';
import { hexToHsl, hslToHex } from '../palette/color-utils';
import type { AccentName, Contrast, Mode, ResolvedPalette } from '../palette/types';

interface AccentRoles {
  /** Bright tier — reserved for hover/highlight fills, never the resting main. */
  light: string;
  /** Label ink that stays ≥ 4.5:1 on the bright tier (recomputed, not main's label). */
  lightContrastText: string;
  /**
   * The display accent for TEXT roles (links, icons, outlined/text button ink).
   * May be readability-adjusted toward ink on the page background; never use
   * it as a fill. The resting fill role is `neutralFill` (the exact swatch).
   */
  main: string;
  dark: string;
  darker: string;
  contrastText: string;
  /**
   * FILL role: the exact user swatch, unadjusted. Contained buttons rest on
   * this and must never render the readability-adjusted `main` instead.
   */
  neutralFill: string;
  /** Label ink ≥ 4.5:1 on the raw `neutralFill`, computed for that actual fill. */
  neutralFillLabel: string;
}

/** Colors used to display a palette at a given contrast, without changing its swatches. */
export interface ContrastRoles {
  background: string;
  paper: string;
  text: string;
  secondaryText: string;
  disabledText: string;
  /**
   * Divider-line color: the same prominent border tone as `frame` (the fg2
   * swatch) in every mode and contrast. MUI draws ToggleButton borders,
   * Divider components, table rules and the sx `borderColor: 'divider'`
   * shorthand from this one role, so a quieter background tier here is what
   * made those lines read as inconsistent grey.
   */
  divider: string;
  /** Prominent element-frame color: always the fg2 swatch. */
  frame: string;
  input: string;
  inputHover: string;
  headerBackground: string;
  headerText: string;
  accents: Record<AccentName, AccentRoles>;
  /**
   * The MUI `secondary` color: structural chrome, not an accent. Built from
   * the mode-appropriate fg family with fg2 as the base — the same swatch
   * that paints frames and header bands — so secondary controls read as part
   * of the cream/charcoal structure and orange (primary) stays the single
   * accent. The raw-fill vs readable-role separation is identical to the
   * accents: `neutralFill` is the exact fg2 swatch, `main` is the
   * readability-adjusted text/border role.
   */
  secondary: AccentRoles;
}

function blend(from: string, to: string, amount: number): string {
  const rgb = (hex: string) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const start = rgb(from);
  const end = rgb(to);
  return `#${start.map((channel, index) => Math.round(channel + (end[index] - channel) * amount)
    .toString(16).padStart(2, '0')).join('')}`;
}

/** Keep accent text readable on both the page and its panels without changing swatches. */
function readableAccent(color: string, palette: ResolvedPalette, background: string, paper: string): string {
  const ratio = (hex: string) => Math.min(getContrastRatio(hex, background), getContrastRatio(hex, paper));
  if (ratio(color) >= 4.5) return color;

  const inks = [palette.fg0, palette.bg0_hard, palette.fg1, palette.bg0];
  const ink = inks
    .map((candidate) => ({ candidate, ratio: ratio(candidate) }))
    .filter((candidate) => candidate.ratio >= 4.5)
    .sort((a, b) => getContrastRatio(b.candidate, color) - getContrastRatio(a.candidate, color))[0]?.candidate;
  if (!ink) return color;

  let low = 0;
  let high = 1;
  for (let i = 0; i < 12; i++) {
    const mid = (low + high) / 2;
    if (ratio(blend(color, ink, mid)) >= 4.5) high = mid;
    else low = mid;
  }
  return blend(color, ink, high);
}

function readableLabel(color: string, palette: ResolvedPalette): string {
  const candidates = [palette.fg0, palette.bg0_hard, palette.fg1, palette.bg0];
  const best = candidates.reduce((current, candidate) =>
    getContrastRatio(candidate, color) > getContrastRatio(current, color) ? candidate : current);
  if (getContrastRatio(best, color) >= 4.5) return best;

  // The closest existing ink might be on the wrong side of the accent: on a
  // midtone, a lighter shade can top out below 4.5 while a darker one can pass.
  const ink = candidates.map((candidate) => {
    const hsl = hexToHsl(candidate);
    const endpoint = hsl.l < 50 ? 1 : 99;
    const limit = hslToHex({ ...hsl, l: endpoint });
    return { candidate, hsl, endpoint, maxRatio: getContrastRatio(limit, color) };
  }).filter((option) => option.maxRatio >= 4.5)
    .sort((a, b) => getContrastRatio(b.candidate, color) - getContrastRatio(a.candidate, color))[0];
  if (!ink) return best;

  const { hsl, endpoint } = ink;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 12; i++) {
    const mid = (low + high) / 2;
    const candidate = hslToHex({ ...hsl, l: hsl.l + (endpoint - hsl.l) * mid });
    if (getContrastRatio(candidate, color) >= 4.5) high = mid;
    else low = mid;
  }
  return hslToHex({ ...hsl, l: hsl.l + (endpoint - hsl.l) * high });
}

function accentRoles(
  palette: ResolvedPalette,
  name: AccentName,
  mode: Mode,
  contrast: Contrast,
  background: string,
  paper: string,
): AccentRoles {
  const light = palette[`bright_${name}`];
  const neutral = palette[`neutral_${name}`];
  const dark = palette[`faded_${name}`];
  const darker = palette[`deep_${name}`];

  let main = neutral;
  if (contrast === 'soft') {
    const hsl = hexToHsl(neutral);
    const muted = hslToHex({ ...hsl, s: hsl.s * 0.65 });
    main = readableAccent(muted, palette, background, paper);
  } else if (contrast === 'medium') {
    main = readableAccent(neutral, palette, background, paper);
  } else if (contrast === 'hard') {
    // The default accent tone stays on the neutral tier in every mode so the
    // bright/faded variants are reserved for highlights and interactive states.
    main = readableAccent(neutral, palette, background, paper);
  }

  return {
    light,
    lightContrastText: readableLabel(light, palette),
    main, dark, darker, contrastText: readableLabel(main, palette),
    // Fill roles stay on the exact swatches: the resting contained fill is the
    // user's neutral swatch itself, with a label ink computed for that fill —
    // independent of the readability-adjusted `main` text role above.
    neutralFill: neutral,
    neutralFillLabel: readableLabel(neutral, palette),
  };
}

/**
 * The secondary MUI color, built from the mode-appropriate fg family with
 * fg2 as the base (the frame/header swatch). The fg family flips with the
 * mode — light creams in dark mode, dark browns in light mode — but its
 * prominence order is mode-independent: fg0 is the strongest ink in both,
 * fg4 the dullest. Tiers therefore follow that order uniformly: fg1 (one
 * step stronger than fg2) is the highlight tier the hover lifts to, fg3/fg4
 * the darker tiers. fg0 stays reserved for body-text ink (it is a label
 * candidate in readableLabel, never a fill). fg2 already clears ≥ 4.5:1
 * against background and paper in every variant, so `main` survives
 * readableAccent unchanged with the default palettes; the adjustment only
 * engages when an edited fg2 loses readability.
 */
function fgSecondaryRoles(palette: ResolvedPalette, background: string, paper: string): AccentRoles {
  return {
    light: palette.fg1,
    lightContrastText: readableLabel(palette.fg1, palette),
    main: readableAccent(palette.fg2, palette, background, paper),
    dark: palette.fg3,
    darker: palette.fg4,
    contrastText: readableLabel(palette.fg2, palette),
    neutralFill: palette.fg2,
    neutralFillLabel: readableLabel(palette.fg2, palette),
  };
}

export function getContrastRoles(palette: ResolvedPalette, mode: Mode, contrast: Contrast): ContrastRoles {
  // Filled title bars use fg2 so the frame and the header share one accent tone.
  // readableLabel picks the strongest ink on that fill; fg0 stays reserved for body text.
  const headerBackground = palette.fg2;
  const headerText = readableLabel(headerBackground, palette);
  const surfaces = {
    soft: {
      background: palette.bg0_soft,
      paper: palette.bg1,
      text: palette.fg2,
      secondaryText: palette.fg3,
      input: palette.bg0_soft,
      inputHover: palette.bg1,
    },
    medium: {
      background: palette.bg0,
      paper: palette.bg1,
      text: palette.fg1,
      secondaryText: palette.fg2,
      input: palette.bg0_soft,
      inputHover: palette.bg1,
    },
    hard: {
      background: palette.bg0_hard,
      paper: palette.bg2,
      text: palette.fg0,
      secondaryText: palette.fg1,
      input: palette.bg1,
      inputHover: palette.bg2,
    },
  }[contrast];

  const accents = Object.fromEntries(
    (['red', 'green', 'yellow', 'blue', 'purple', 'aqua', 'orange'] as const)
      .map((name) => [name, accentRoles(palette, name, mode, contrast, surfaces.background, surfaces.paper)]),
  ) as Record<AccentName, AccentRoles>;

  return {
    ...surfaces,
    // Divider lines share the themed border tone in every mode and contrast —
    // always the fg2 swatch, like `frame`, never a per-contrast background
    // tier: MUI draws ToggleButton borders, Divider components, table rules
    // and the sx `borderColor: 'divider'` shorthand from this single role.
    divider: palette.fg2,
    disabledText: palette.fg4,
    frame: palette.fg2,
    headerBackground,
    headerText,
    accents,
    secondary: fgSecondaryRoles(palette, surfaces.background, surfaces.paper),
  };
}
